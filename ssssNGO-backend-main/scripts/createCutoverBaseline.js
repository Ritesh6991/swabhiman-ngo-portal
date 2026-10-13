"use strict";

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const { EJSON } = require("bson");

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const stripFields = {
  membershiprequests: ["photoDocument", "aadhaarDocument", "panDocument", "idCardDocument", "certificateDocument"],
  users: ["idCardDocument", "certificateDocument"],
  deliverylogs: ["idCardDocument", "certificateDocument"],
  paymenttransactions: ["proofDocument", "receiptDocument"],
};

const normalized = (name, documents) => documents.map((document) => {
  const copy = EJSON.parse(EJSON.stringify(document, { relaxed: false }));
  for (const field of stripFields[name] || []) delete copy[field];
  return copy;
});

const digest = (documents) => {
  const hash = crypto.createHash("sha256");
  for (const document of documents) {
    hash.update(EJSON.stringify(document, { relaxed: false }));
    hash.update("\n");
  }
  return hash.digest("hex");
};

const normalizedIndexes = async (collection) => (await collection.listIndexes().toArray()).map((index) => ({
  name: index.name,
  key: index.key,
  unique: Boolean(index.unique),
  sparse: Boolean(index.sparse),
  expireAfterSeconds: index.expireAfterSeconds ?? null,
  partialFilterExpression: index.partialFilterExpression ?? null,
  collation: index.collation ?? null,
  weights: index.weights ?? null,
  defaultLanguage: index.default_language ?? null,
  languageOverride: index.language_override ?? null,
})).sort((left, right) => left.name.localeCompare(right.name));

const orphanCount = async (db, collectionName, field, targetCollection) => {
  const rows = await db.collection(collectionName)
    .find({ [field]: { $exists: true, $nin: [null, ""] } }, { projection: { [field]: 1 } }).toArray();
  let missing = 0;
  for (const row of rows) {
    const value = row[field];
    const candidates = [value];
    try { candidates.push(new ObjectId(String(value))); } catch {}
    if (!await db.collection(targetCollection).findOne({ _id: { $in: candidates } }, { projection: { _id: 1 } })) missing += 1;
  }
  return missing;
};

const main = async () => {
  const sourceClient = new MongoClient(required("SOURCE_MONGO_URI"), {
    appName: "swabhiman-baseline-source",
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 30_000,
  });
  const targetClient = new MongoClient(required("TARGET_MONGO_URI"), {
    appName: "swabhiman-baseline-target",
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 30_000,
  });
  await Promise.all([sourceClient.connect(), targetClient.connect()]);

  try {
    const source = sourceClient.db();
    const target = targetClient.db();
    if (source.databaseName !== "test" || target.databaseName !== "swabhiman_prod") throw new Error("Unexpected source/target databases");
    const names = (await source.listCollections({}, { nameOnly: true }).toArray())
      .map(({ name }) => name).filter((name) => !name.startsWith("system.")).sort();
    if (names.length !== 17) throw new Error(`Expected 17 collections, found ${names.length}`);

    const collections = {};
    let collectionsOk = true;
    for (const name of names) {
      const [sourceDocs, targetDocs, sourceIndexes, targetIndexes] = await Promise.all([
        source.collection(name).find({}).sort({ _id: 1 }).toArray(),
        target.collection(name).find({}).sort({ _id: 1 }).toArray(),
        normalizedIndexes(source.collection(name)),
        normalizedIndexes(target.collection(name)),
      ]);
      const item = {
        sourceCount: sourceDocs.length,
        targetCount: targetDocs.length,
        normalizedHashMatch: digest(normalized(name, sourceDocs)) === digest(normalized(name, targetDocs)),
        targetFullHash: digest(targetDocs),
        indexesMatch: EJSON.stringify(sourceIndexes, { relaxed: false }) === EJSON.stringify(targetIndexes, { relaxed: false }),
      };
      collections[name] = item;
      collectionsOk = collectionsOk && item.sourceCount === item.targetCount && item.normalizedHashMatch && item.indexesMatch;
    }

    const relationships = {
      membershipUserOrphans: await orphanCount(target, "membershiprequests", "userId", "users"),
      paymentUserOrphans: await orphanCount(target, "paymenttransactions", "userId", "users"),
      paymentMembershipOrphans: await orphanCount(target, "paymenttransactions", "membershipRequestId", "membershiprequests"),
      deliveryUserOrphans: await orphanCount(target, "deliverylogs", "userId", "users"),
      deliveryMembershipOrphans: await orphanCount(target, "deliverylogs", "membershipRequestId", "membershiprequests"),
    };
    const noOrphans = Object.values(relationships).every((count) => count === 0);
    const payments = await source.collection("paymenttransactions").find({ purpose: "donation", totalAmount: 100 }).toArray();
    const qaDonationCount = payments.filter((item) => EJSON.stringify(item, { relaxed: true }).toLowerCase().includes("qa")).length;

    const status = await targetClient.db("admin").command({ connectionStatus: 1, showPrivileges: true });
    const privilegeDatabases = [...new Set((status.authInfo?.authenticatedUserPrivileges || [])
      .map(({ resource }) => resource?.db).filter(Boolean))];
    const leastPrivilege = privilegeDatabases.length > 0 && privilegeDatabases.every((name) => name === target.databaseName);
    const criticalCounts = {
      users: collections.users.targetCount,
      membershiprequests: collections.membershiprequests.targetCount,
      paymenttransactions: collections.paymenttransactions.targetCount,
      legacydocumentaudits: collections.legacydocumentaudits.targetCount,
    };
    const criticalOk = criticalCounts.users === 36
      && criticalCounts.membershiprequests === 42
      && criticalCounts.paymenttransactions === 6
      && criticalCounts.legacydocumentaudits === 108
      && qaDonationCount === 1;
    const success = collectionsOk && noOrphans && leastPrivilege && criticalOk;
    const report = {
      createdAt: new Date().toISOString(),
      source: source.databaseName,
      target: target.databaseName,
      collections,
      relationships,
      criticalCounts,
      qaDonation100Unchanged: qaDonationCount === 1,
      privilegeDatabases,
      leastPrivilege,
      success,
    };
    const reportPath = path.join(path.resolve(required("BASELINE_DIR")), "cutover-baseline.json");
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`${JSON.stringify({ reportPath, ...report }, null, 2)}\n`);
    if (!success) process.exitCode = 2;
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
};

main().catch((error) => {
  process.stderr.write(`Baseline verification failed: ${error.message}\n`);
  process.exitCode = 1;
});

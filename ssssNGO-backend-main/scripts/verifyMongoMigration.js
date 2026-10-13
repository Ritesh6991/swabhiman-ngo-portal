"use strict";

const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const digest = (documents) => {
  const hash = crypto.createHash("sha256");
  for (const document of documents) {
    hash.update(EJSON.stringify(document, { relaxed: false }));
    hash.update("\n");
  }
  return hash.digest("hex");
};

const normalizedIndexes = async (collection) => (
  (await collection.listIndexes().toArray()).map((index) => ({
    name: index.name,
    key: index.key,
    unique: Boolean(index.unique),
    sparse: Boolean(index.sparse),
    expireAfterSeconds: index.expireAfterSeconds ?? null,
    partialFilterExpression: index.partialFilterExpression ?? null,
    collation: index.collation ?? null,
    weights: index.weights ?? null,
  })).sort((left, right) => left.name.localeCompare(right.name))
);

const orphanCount = async (db, collectionName, field, targetCollection) => {
  const rows = await db.collection(collectionName).find({ [field]: { $exists: true, $nin: [null, ""] } }, { projection: { [field]: 1 } }).toArray();
  let missing = 0;
  for (const row of rows) {
    const value = row[field];
    const candidates = [value];
    try { candidates.push(new (require("mongodb").ObjectId)(String(value))); } catch {}
    if (!await db.collection(targetCollection).findOne({ _id: { $in: candidates } }, { projection: { _id: 1 } })) missing += 1;
  }
  return missing;
};

const main = async () => {
  const sourceClient = new MongoClient(required("SOURCE_MONGO_URI"), {
    appName: "swabhiman-migration-verification-source",
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 30_000,
  });
  const targetClient = new MongoClient(required("TARGET_MONGO_URI"), {
    appName: "swabhiman-migration-verification-target",
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 30_000,
  });
  await Promise.all([sourceClient.connect(), targetClient.connect()]);
  try {
    const source = sourceClient.db();
    const target = targetClient.db();
    const names = (await source.listCollections({}, { nameOnly: true }).toArray())
      .map(({ name }) => name).filter((name) => !name.startsWith("system.")).sort();
    const collections = {};
    for (const name of names) {
      const [sourceDocs, targetDocs, sourceIndexes, targetIndexes] = await Promise.all([
        source.collection(name).find({}).sort({ _id: 1 }).toArray(),
        target.collection(name).find({}).sort({ _id: 1 }).toArray(),
        normalizedIndexes(source.collection(name)),
        normalizedIndexes(target.collection(name)),
      ]);
      collections[name] = {
        before: sourceDocs.length,
        after: targetDocs.length,
        documentsMatch: digest(sourceDocs) === digest(targetDocs),
        indexCountBefore: sourceIndexes.length,
        indexCountAfter: targetIndexes.length,
        indexesMatch: EJSON.stringify(sourceIndexes, { relaxed: false }) === EJSON.stringify(targetIndexes, { relaxed: false }),
      };
    }

    const relationships = {
      membershipUserOrphans: await orphanCount(target, "membershiprequests", "userId", "users"),
      paymentUserOrphans: await orphanCount(target, "paymenttransactions", "userId", "users"),
      paymentMembershipOrphans: await orphanCount(target, "paymenttransactions", "membershipRequestId", "membershiprequests"),
      deliveryUserOrphans: await orphanCount(target, "deliverylogs", "userId", "users"),
      deliveryMembershipOrphans: await orphanCount(target, "deliverylogs", "membershipRequestId", "membershiprequests"),
    };

    const status = await targetClient.db("admin").command({ connectionStatus: 1, showPrivileges: true });
    const roles = status.authInfo?.authenticatedUserRoles || [];
    const privileges = status.authInfo?.authenticatedUserPrivileges || [];
    const privilegeDatabases = [...new Set(privileges.map(({ resource }) => resource?.db).filter(Boolean))];
    const leastPrivilege = privilegeDatabases.length > 0 && privilegeDatabases.every((name) => name === target.databaseName);
    const success = Object.values(collections).every((item) => item.documentsMatch && item.indexesMatch && item.before === item.after)
      && Object.values(relationships).every((count) => count === 0)
      && leastPrivilege;
    process.stdout.write(`${JSON.stringify({ source: source.databaseName, target: target.databaseName, collections, relationships, roles, privilegeDatabases, leastPrivilege, success }, null, 2)}\n`);
    if (!success) process.exitCode = 2;
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
};

main().catch((error) => {
  process.stderr.write(`Migration verification failed: ${error.message}\n`);
  process.exitCode = 1;
});

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

const normalizeIndex = (index) => ({
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
});

const normalizedIndexes = async (collection) => (
  (await collection.listIndexes().toArray()).map(normalizeIndex)
    .sort((left, right) => left.name.localeCompare(right.name))
);

const createOptions = (index) => {
  const options = { name: index.name };
  for (const key of ["unique", "sparse", "expireAfterSeconds", "partialFilterExpression", "collation", "weights"]) {
    if (index[key] !== undefined) options[key] = index[key];
  }
  if (index.default_language !== undefined) options.default_language = index.default_language;
  if (index.language_override !== undefined) options.language_override = index.language_override;
  return options;
};

const main = async () => {
  const sourceClient = new MongoClient(required("SOURCE_MONGO_URI"), {
    appName: "swabhiman-exact-restore-source",
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 30_000,
  });
  const targetClient = new MongoClient(required("TARGET_MONGO_URI"), {
    appName: "swabhiman-exact-restore-target",
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 30_000,
  });
  await Promise.all([sourceClient.connect(), targetClient.connect()]);

  try {
    const source = sourceClient.db();
    const target = targetClient.db();
    if (source.databaseName !== "test") throw new Error(`Refusing unexpected source database: ${source.databaseName}`);
    if (target.databaseName !== "swabhiman_prod") throw new Error(`Refusing unexpected target database: ${target.databaseName}`);
    if (required("SOURCE_MONGO_URI") === required("TARGET_MONGO_URI")) throw new Error("Source and target URIs must differ");

    const status = await targetClient.db("admin").command({ connectionStatus: 1, showPrivileges: true });
    const privilegeDatabases = [...new Set((status.authInfo?.authenticatedUserPrivileges || [])
      .map(({ resource }) => resource?.db).filter(Boolean))];
    if (!privilegeDatabases.length || privilegeDatabases.some((name) => name !== target.databaseName)) {
      throw new Error(`Target credential is not least-privilege for ${target.databaseName}`);
    }

    const names = (await source.listCollections({}, { nameOnly: true }).toArray())
      .map(({ name }) => name).filter((name) => !name.startsWith("system.")).sort();
    if (names.length !== 17) throw new Error(`Expected 17 source collections, found ${names.length}`);

    const existingTargetCollections = await target.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of existingTargetCollections) {
      if (!name.startsWith("system.")) await target.collection(name).drop();
    }
    for (const name of names) {
      const sourceCollection = source.collection(name);
      const documents = await sourceCollection.find({}).sort({ _id: 1 }).toArray();
      const indexes = await sourceCollection.listIndexes().toArray();
      await target.createCollection(name);
      const targetCollection = target.collection(name);
      if (documents.length) await targetCollection.insertMany(documents, { ordered: true });
      for (const index of indexes.filter(({ name: indexName }) => indexName !== "_id_")) {
        await targetCollection.createIndex(index.key, createOptions(index));
      }
    }

    const collections = {};
    let success = true;
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
        documentsMatch: digest(sourceDocs) === digest(targetDocs),
        indexesMatch: EJSON.stringify(sourceIndexes, { relaxed: false }) === EJSON.stringify(targetIndexes, { relaxed: false }),
      };
      collections[name] = item;
      success = success && item.sourceCount === item.targetCount && item.documentsMatch && item.indexesMatch;
    }

    process.stdout.write(`${JSON.stringify({
      source: source.databaseName,
      target: target.databaseName,
      privilegeDatabases,
      collectionCount: names.length,
      collections,
      success,
    }, null, 2)}\n`);
    if (!success) process.exitCode = 2;
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
};

main().catch((error) => {
  process.stderr.write(`Exact restore failed: ${error.message}\n`);
  process.exitCode = 1;
});

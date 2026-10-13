"use strict";

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const digestDocuments = (documents) => {
  const hash = crypto.createHash("sha256");
  for (const document of documents) {
    hash.update(EJSON.stringify(document, { relaxed: false }));
    hash.update("\n");
  }
  return hash.digest("hex");
};

const main = async () => {
  const uri = required("SOURCE_MONGO_URI");
  const backupRoot = path.resolve(required("BACKUP_DIR"));
  const client = new MongoClient(uri, {
    appName: "swabhiman-verified-backup",
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 30_000,
  });
  await fs.mkdir(backupRoot, { recursive: false });
  await client.connect();

  try {
    const db = client.db();
    const collectionNames = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map(({ name }) => name)
      .filter((name) => !name.startsWith("system."))
      .sort();
    const report = {
      createdAt: new Date().toISOString(),
      database: db.databaseName,
      collections: {},
    };

    for (const name of collectionNames) {
      const collection = db.collection(name);
      const documents = await collection.find({}).sort({ _id: 1 }).toArray();
      const indexes = await collection.listIndexes().toArray();
      const payload = EJSON.stringify(documents, { relaxed: false, indent: 2 });
      const dataPath = path.join(backupRoot, `${name}.ejson`);
      const indexPath = path.join(backupRoot, `${name}.indexes.ejson`);
      await fs.writeFile(dataPath, payload, { encoding: "utf8", flag: "wx" });
      await fs.writeFile(indexPath, EJSON.stringify(indexes, { relaxed: false, indent: 2 }), { encoding: "utf8", flag: "wx" });

      const restored = EJSON.parse(await fs.readFile(dataPath, "utf8"));
      const sourceDigest = digestDocuments(documents);
      const restoredDigest = digestDocuments(restored);
      if (documents.length !== restored.length || sourceDigest !== restoredDigest) {
        throw new Error(`Backup verification failed for ${name}`);
      }
      report.collections[name] = {
        count: documents.length,
        indexCount: indexes.length,
        digest: sourceDigest,
        verified: true,
      };
    }

    report.collectionCount = collectionNames.length;
    report.verified = Object.values(report.collections).every(({ verified }) => verified);
    const reportPath = path.join(backupRoot, "backup-report.json");
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`${JSON.stringify({ backupRoot, ...report }, null, 2)}\n`);
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  process.stderr.write(`Backup failed: ${error.message}\n`);
  process.exitCode = 1;
});

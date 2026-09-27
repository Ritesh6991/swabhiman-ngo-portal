const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { hasAdminAccess, hasOwnerAccess } = require("../src/utils/roles");
const { resolveInside } = require("../src/utils/privateFiles");
const { receiptNumberFor } = require("../src/services/donationReceiptService");

test("admin and owner roles can use admin surfaces", () => {
  assert.equal(hasAdminAccess("admin"), true);
  assert.equal(hasAdminAccess("owner"), true);
  assert.equal(hasAdminAccess("user"), false);
});

test("private accounts allow only the owner role", () => {
  assert.equal(hasOwnerAccess("owner"), true);
  assert.equal(hasOwnerAccess("admin"), false);
  assert.equal(hasOwnerAccess("user"), false);
  assert.equal(hasOwnerAccess(undefined), false);
});

test("private file resolver rejects traversal and missing files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ngo-private-"));
  fs.writeFileSync(path.join(root, "proof.png"), "safe");
  assert.equal(resolveInside(root, "proof.png"), path.join(root, "proof.png"));
  assert.equal(resolveInside(root, "../secret.txt"), null);
  assert.equal(resolveInside(root, "missing.png"), null);
  fs.rmSync(root, { recursive: true, force: true });
});

test("donation receipt identity is deterministic for retries", () => {
  const transaction = { _id: { toString: () => "65aabbccddeeff0011223344" }, verifiedAt: new Date("2026-09-27T00:00:00Z") };
  assert.equal(receiptNumberFor(transaction), "DON-2026-11223344");
  assert.equal(receiptNumberFor(transaction), receiptNumberFor(transaction));
});

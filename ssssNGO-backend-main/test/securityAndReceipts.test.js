const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { hasAdminAccess, hasOwnerAccess } = require("../src/utils/roles");
const { resolveInside } = require("../src/utils/privateFiles");
const { receiptNumberFor } = require("../src/services/donationReceiptService");
const PaymentTransaction = require("../src/models/PaymentTransaction");
const { verificationUrlFor } = require("../src/utils/membershipVerification");
const { normaliseManualApproval } = require("../src/services/manualMembershipPaymentService");

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

test("receipt numbers are unique only after a real receipt is issued", () => {
  const receiptIndex = PaymentTransaction.schema.indexes().find(([fields]) => fields.receiptNumber === 1);
  assert.ok(receiptIndex);
  assert.equal(receiptIndex[1].unique, true);
  assert.deepEqual(receiptIndex[1].partialFilterExpression, { receiptNumber: { $type: "string" } });
});

test("document QR codes target the public verification page", () => {
  assert.equal(
    verificationUrlFor("SVB-TEST 01", "https://portal.example/"),
    "https://portal.example/?verify=SVB-TEST%2001"
  );
});

test("manual membership approval requires explicit payment confirmation", () => {
  assert.throws(
    () => normaliseManualApproval({ paymentMethod: "upi", transactionReference: "UTR-1" }),
    /Confirm that the membership payment was received/
  );
  assert.throws(
    () => normaliseManualApproval({ confirmPayment: true, paymentMethod: "upi", transactionReference: "" }),
    /payment reference/
  );
  assert.deepEqual(
    normaliseManualApproval({ confirmPayment: true, paymentMethod: "cash", transactionReference: "", note: " Received at office " }),
    { paymentMethod: "cash", transactionReference: "", note: "Received at office" }
  );
});

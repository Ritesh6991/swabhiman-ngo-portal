const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const { detectPaymentProofMime, isPaymentProofImage } = require("../src/middleware/paymentProofUpload");
const AppSetting = require("../src/models/AppSetting");
const PaymentSettingAudit = require("../src/models/PaymentSettingAudit");
const PaymentTransaction = require("../src/models/PaymentTransaction");
const {
  buildUpiUri,
  membershipAmountForType,
  stateFor,
  submitUpiProof,
  validateDonationAmount,
} = require("../src/services/manualUpiPaymentService");
const { getPaymentSettings, updatePaymentSettings, validatePaymentSettings } = require("../src/services/paymentSettingsService");

const validSettings = () => ({
  version: 1,
  upi: {
    enabled: true,
    upiId: "ssssnyas@bank",
    payeeName: "SSSS NYAS",
    membershipEnabled: true,
    donationEnabled: true,
  },
  membership: { gatewayEnabled: false, provider: "disabled" },
  donation: { gatewayEnabled: false, provider: "disabled" },
});

test("UPI URI uses trusted exact donation amounts", () => {
  for (const amount of [501, 1001]) {
    const uri = new URL(buildUpiUri({ upiId: "ssssnyas@bank", payeeName: "SSSS NYAS", amount, reference: `DON-${amount}`, note: "Donation" }));
    assert.equal(uri.protocol, "upi:");
    assert.equal(uri.searchParams.get("pa"), "ssssnyas@bank");
    assert.equal(uri.searchParams.get("pn"), "SSSS NYAS");
    assert.equal(uri.searchParams.get("am"), `${amount}.00`);
    assert.equal(uri.searchParams.get("cu"), "INR");
  }
});

test("donation amount validation accepts valid values without fees", () => {
  assert.equal(validateDonationAmount(501, 1), 501);
  assert.equal(validateDonationAmount("1001", 1), 1001);
});

test("donation amount validation rejects zero, negative and invalid values", () => {
  for (const amount of [0, -1, "not-an-amount", Infinity]) {
    assert.throws(() => validateDonationAmount(amount, 1), /Donation amount/);
  }
});

test("membership pricing is server authoritative", () => {
  const config = { yearlyAmount: 1100, permanentAmount: 5100 };
  assert.equal(membershipAmountForType("yearly", config), 1100);
  assert.equal(membershipAmountForType("permanent", config), 5100);
  assert.throws(() => membershipAmountForType("client-price-1", config), /Invalid membership plan/);
});

test("payment settings require a valid UPI ID and payee name when active", () => {
  assert.equal(validatePaymentSettings(validSettings()).upi.upiId, "ssssnyas@bank");
  const invalidId = validSettings();
  invalidId.upi.upiId = "not a upi id";
  assert.throws(() => validatePaymentSettings(invalidId), /valid organisation UPI ID/);
  const emptyPayee = validSettings();
  emptyPayee.upi.payeeName = "";
  assert.throws(() => validatePaymentSettings(emptyPayee), /payee name/);
});

test("payment gateway cannot be enabled without real credentials", () => {
  const settings = validSettings();
  settings.membership = { gatewayEnabled: true, provider: "disabled" };
  assert.throws(() => validatePaymentSettings(settings), /credentials are not configured/);
});

test("manual payment states expose pending, verified, fulfilled and rejected safely", () => {
  assert.equal(stateFor({ status: "created" }), "AWAITING_PAYMENT");
  assert.equal(stateFor({ status: "pending" }), "PENDING_VERIFICATION");
  assert.equal(stateFor({ status: "verified", purpose: "membership", fulfillmentStatus: "pending" }), "VERIFIED");
  assert.equal(stateFor({ status: "verified", purpose: "donation", fulfillmentStatus: "not_applicable" }), "VERIFIED");
  assert.equal(stateFor({ status: "verified", purpose: "donation", fulfillmentStatus: "not_applicable", receiptNumber: "DON-2026-0001" }), "FULFILLED");
  assert.equal(stateFor({ status: "rejected" }), "REJECTED");
});

test("payment proof validation checks image file signatures", () => {
  assert.equal(isPaymentProofImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), true);
  assert.equal(isPaymentProofImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), true);
  assert.equal(isPaymentProofImage(Buffer.from("RIFF0000WEBP")), true);
  assert.equal(isPaymentProofImage(Buffer.from("MZ executable content")), false);
  assert.equal(detectPaymentProofMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(detectPaymentProofMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
});

test("payment setting changes persist and create a traceable audit record", async () => {
  const originalFindOne = AppSetting.findOne;
  const originalFindOneAndUpdate = AppSetting.findOneAndUpdate;
  const originalAuditCreate = PaymentSettingAudit.create;
  let stored = validSettings();
  let audit;
  AppSetting.findOne = () => ({ lean: async () => ({ value: stored }) });
  AppSetting.findOneAndUpdate = (_query, update) => {
    if (update.$set?.value) stored = update.$set.value;
    return { lean: async () => ({ value: stored }) };
  };
  PaymentSettingAudit.create = async (value) => { audit = value; return value; };
  try {
    const updated = await updatePaymentSettings({
      input: { upi: { upiId: "newname@bank", donationEnabled: false } },
      changedBy: "507f1f77bcf86cd799439011",
    });
    assert.equal(updated.version, 2);
    assert.equal((await getPaymentSettings()).upi.upiId, "newname@bank");
    assert.equal(updated.upi.membershipEnabled, true);
    assert.equal(updated.upi.donationEnabled, false);
    assert.equal(audit.changes.some((change) => change.setting === "upi.upiId" && change.oldValue === "ssssnyas@bank" && change.newValue === "newname@bank"), true);
    assert.equal(audit.changes.some((change) => change.setting === "upi.donationEnabled"), true);
  } finally {
    AppSetting.findOne = originalFindOne;
    AppSetting.findOneAndUpdate = originalFindOneAndUpdate;
    PaymentSettingAudit.create = originalAuditCreate;
  }
});

test("payment settings modification is not publicly accessible", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/payment-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validSettings()),
    });
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("payment proof is not publicly accessible", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/payment-transactions/507f1f77bcf86cd799439011/proof`);
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("a member cannot submit proof for another member's payment", async () => {
  const originalFindOne = PaymentTransaction.findOne;
  PaymentTransaction.findOne = async () => ({
    _id: "507f1f77bcf86cd799439011",
    purpose: "membership",
    provider: "manual_upi",
    userId: "507f1f77bcf86cd799439012",
    status: "created",
  });
  try {
    await assert.rejects(
      submitUpiProof({ transactionId: "507f1f77bcf86cd799439011", purpose: "membership", userId: "507f1f77bcf86cd799439013" }),
      (error) => error.status === 404
    );
  } finally {
    PaymentTransaction.findOne = originalFindOne;
  }
});

test("a donation proof requires the private payment-attempt token", async () => {
  const originalFindOne = PaymentTransaction.findOne;
  PaymentTransaction.findOne = async () => ({
    _id: "507f1f77bcf86cd799439011",
    purpose: "donation",
    provider: "manual_upi",
    paymentAccessTokenHash: "not-the-provided-token",
    status: "created",
  });
  try {
    await assert.rejects(
      submitUpiProof({ transactionId: "507f1f77bcf86cd799439011", purpose: "donation", accessToken: "wrong-token" }),
      (error) => error.status === 403
    );
  } finally {
    PaymentTransaction.findOne = originalFindOne;
  }
});

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const RazorpayProvider = require("../src/payments/providers/RazorpayProvider");

const provider = new RazorpayProvider({ publicKey: "key", secretKey: "secret", webhookSecret: "webhook" });

test("accepts a valid checkout signature", () => {
  const signature = crypto.createHmac("sha256", "secret").update("order_1|pay_1").digest("hex");
  assert.equal(provider.verifyClientPayment({ orderId: "order_1", paymentId: "pay_1", signature }), true);
});

test("rejects a manipulated checkout signature", () => {
  assert.equal(provider.verifyClientPayment({ orderId: "order_1", paymentId: "pay_1", signature: "invalid" }), false);
});

test("accepts a valid webhook signature", () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = crypto.createHmac("sha256", "webhook").update(body).digest("hex");
  assert.equal(provider.verifyWebhook(body, signature), true);
});

test("maps captured and failed payment events", () => {
  const captured = provider.parseWebhook({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } } }, "evt_1");
  const failed = provider.parseWebhook({ event: "payment.failed", payload: { payment: { entity: { id: "pay_2", order_id: "order_2", error_description: "declined" } } } }, "evt_2");
  assert.equal(captured.status, "verified");
  assert.equal(failed.status, "failed");
  assert.equal(failed.failureReason, "declined");
});

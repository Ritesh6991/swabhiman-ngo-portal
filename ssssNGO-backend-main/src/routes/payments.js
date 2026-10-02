const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const PaymentTransaction = require("../models/PaymentTransaction");
const { paymentProofUpload } = require("../middleware/paymentProofUpload");
const { getPaymentConfig } = require("../config/paymentConfig");
const { getPaymentSettings, gatewayCredentialsConfigured } = require("../services/paymentSettingsService");
const { createMembershipUpiIntent, submitUpiProof } = require("../services/manualUpiPaymentService");
const {
  createMembershipPayment,
  createDonationPayment,
  verifyClientPayment,
  processWebhook,
  publicTransaction,
} = require("../services/paymentService");

const router = express.Router();
const donationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });
const validPurpose = (value) => ["membership", "donation"].includes(value);

router.get("/public-config", async (_req, res) => {
  const settings = await getPaymentSettings();
  const pricing = getPaymentConfig();
  res.json({
    version: settings.version,
    upi: {
      enabled: settings.upi.enabled,
      payeeName: settings.upi.payeeName,
      membershipEnabled: settings.upi.enabled && settings.upi.membershipEnabled,
      donationEnabled: settings.upi.enabled && settings.upi.donationEnabled,
    },
    membership: {
      yearlyAmount: pricing.membership.yearlyAmount,
      permanentAmount: pricing.membership.permanentAmount,
      gatewayEnabled: settings.membership.gatewayEnabled && gatewayCredentialsConfigured("membership", settings.membership.provider),
      provider: settings.membership.provider,
    },
    donation: {
      minimumAmount: pricing.donation.minimumAmount,
      gatewayEnabled: settings.donation.gatewayEnabled && gatewayCredentialsConfigured("donation", settings.donation.provider),
      provider: settings.donation.provider,
    },
  });
});

router.post("/membership/upi-intent", auth, async (req, res) => {
  try {
    res.status(201).json(await createMembershipUpiIntent({
      userId: req.user.id,
      membershipRequestId: req.body.membershipRequestId,
    }));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : "Membership payment could not be prepared." });
  }
});

router.post("/membership/:id/proof", auth, paymentProofUpload, async (req, res) => {
  try {
    const result = await submitUpiProof({
      transactionId: req.params.id,
      purpose: "membership",
      userId: req.user.id,
      file: req.file,
      transactionReference: req.body.transactionReference,
      paymentDate: req.body.paymentDate,
    });
    res.status(result.duplicate ? 200 : 201).json({ success: true, duplicate: result.duplicate, status: result.transaction.status, state: "PENDING_VERIFICATION" });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : "Membership proof could not be submitted.", code: error.code });
  }
});

router.post("/membership/create", auth, async (req, res) => {
  try {
    const result = await createMembershipPayment({
      userId: req.user.id,
      membershipRequestId: req.body.membershipRequestId,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 503).json({ message: error.message, code: error.code });
  }
});

router.post("/donation/create", donationLimiter, async (req, res) => {
  try {
    const result = await createDonationPayment({
      name: String(req.body.name || "").trim(),
      email: String(req.body.email || "").trim().toLowerCase(),
      phone: String(req.body.phone || "").trim(),
      amount: req.body.amount,
      idempotencyKey: req.get("Idempotency-Key"),
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 503).json({ message: error.message, code: error.code });
  }
});

router.post("/:purpose/verify", async (req, res) => {
  if (!validPurpose(req.params.purpose)) return res.status(404).json({ message: "Unknown payment purpose" });
  try {
    const result = await verifyClientPayment({ purpose: req.params.purpose, ...req.body });
    res.json({ success: true, duplicate: result.duplicate, transaction: publicTransaction(result.transaction) });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.post("/:purpose/webhook", async (req, res) => {
  if (!validPurpose(req.params.purpose)) return res.status(404).end();
  try {
    const result = await processWebhook({
      purpose: req.params.purpose,
      rawBody: req.rawBody || Buffer.from(JSON.stringify(req.body)),
      signature: req.get("x-razorpay-signature"),
      eventId: req.get("x-razorpay-event-id"),
    });
    res.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.post("/:id/cancel", auth, async (req, res) => {
  const transaction = await PaymentTransaction.findOne({
    _id: req.params.id, userId: req.user.id, status: { $in: ["created", "pending"] },
  });
  if (!transaction) return res.status(404).json({ message: "Pending payment not found" });
  transaction.status = "cancelled";
  await transaction.save();
  res.json(publicTransaction(transaction));
});

module.exports = router;

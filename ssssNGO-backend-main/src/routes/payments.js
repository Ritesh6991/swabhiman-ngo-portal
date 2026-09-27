const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const PaymentTransaction = require("../models/PaymentTransaction");
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

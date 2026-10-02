const express = require("express");
const rateLimit = require("express-rate-limit");
const { paymentProofUpload } = require("../middleware/paymentProofUpload");
const { getPaymentConfig } = require("../config/paymentConfig");
const { getPurposePaymentSettings } = require("../services/paymentSettingsService");
const { createDonationUpiIntent, submitUpiProof } = require("../services/manualUpiPaymentService");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

router.get("/manual-config", async (_req, res) => {
  const settings = await getPurposePaymentSettings("donation");
  res.json({
    enabled: settings.upiEnabled,
    payeeName: settings.payeeName,
    minimumAmount: getPaymentConfig().donation.minimumAmount,
  });
});

router.post("/upi-intent", limiter, async (req, res) => {
  try {
    res.status(201).json(await createDonationUpiIntent(req.body));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : "Donation payment could not be prepared." });
  }
});

router.post("/:id/proof", limiter, paymentProofUpload, async (req, res) => {
  try {
    const result = await submitUpiProof({
      transactionId: req.params.id,
      purpose: "donation",
      accessToken: req.get("X-Payment-Token"),
      file: req.file,
      transactionReference: req.body.transactionReference,
      paymentDate: req.body.paymentDate,
    });
    res.status(result.duplicate ? 200 : 201).json({ success: true, duplicate: result.duplicate, status: result.transaction.status, state: "PENDING_VERIFICATION" });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : "Donation proof could not be submitted.", code: error.code });
  }
});

module.exports = router;

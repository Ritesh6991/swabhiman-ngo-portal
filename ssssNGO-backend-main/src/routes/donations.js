const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const QRCode = require("qrcode");
const fs = require("fs");
const PaymentTransaction = require("../models/PaymentTransaction");
const { donationProofUpload } = require("../middleware/privateUpload");
const { getPaymentConfig } = require("../config/paymentConfig");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

router.get("/manual-config", async (_req, res) => {
  const upiId = String(process.env.DONATION_UPI_ID || "").trim();
  const payeeName = String(process.env.DONATION_PAYEE_NAME || "Swabhiman Shiksha Sanskriti Samajotthan Nyas").trim();
  const payload = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&cu=INR` : "";
  res.json({
    enabled: Boolean(upiId),
    upiId,
    payeeName,
    minimumAmount: getPaymentConfig().donation.minimumAmount,
    qrDataUrl: payload ? await QRCode.toDataURL(payload, { margin: 1, width: 360 }) : "",
  });
});

router.post("/manual", limiter, donationProofUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Payment screenshot is required" });
    if (!String(process.env.DONATION_UPI_ID || "").trim()) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(503).json({ message: "Manual QR donations are not configured yet" });
    }
    const name = String(req.body.name || "").trim().slice(0, 160);
    const email = String(req.body.email || "").trim().toLowerCase().slice(0, 254);
    const phone = String(req.body.phone || "").trim().slice(0, 30);
    const amount = Number(req.body.amount);
    const paymentDate = new Date(req.body.paymentDate);
    const config = getPaymentConfig().donation;
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !Number.isFinite(amount) || amount < config.minimumAmount) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(400).json({ message: "Valid donor name, email and amount are required" });
    }
    if (Number.isNaN(paymentDate.getTime()) || paymentDate > new Date()) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(400).json({ message: "Please provide a valid payment date" });
    }
    const suppliedKey = String(req.get("Idempotency-Key") || "").trim();
    const idempotencyKey = suppliedKey ? `manual-donation:${suppliedKey.slice(0, 160)}` : `manual-donation:${crypto.randomUUID()}`;
    const existing = await PaymentTransaction.findOne({ idempotencyKey });
    if (existing) { fs.rmSync(req.file.path, { force: true }); return res.status(200).json({ success: true, duplicate: true, id: existing._id, status: existing.status }); }
    const transaction = await PaymentTransaction.create({
      purpose: "donation",
      donor: { name, email, phone },
      provider: "manual_qr",
      verificationType: "manual",
      currency: "INR",
      baseAmount: amount,
      taxAmount: 0,
      totalAmount: amount,
      status: "pending",
      fulfillmentStatus: "not_applicable",
      idempotencyKey,
      proofFile: req.file.filename,
      paymentDate,
      paymentMethod: String(req.body.paymentMethod || "UPI / QR").trim().slice(0, 60),
      transactionReference: String(req.body.transactionReference || "").trim().slice(0, 120),
      donorNote: String(req.body.note || "").trim().slice(0, 1000),
    });
    res.status(201).json({ success: true, id: transaction._id, status: transaction.status });
  } catch (error) {
    if (req.file?.path) fs.rmSync(req.file.path, { force: true });
    res.status(500).json({ message: "Donation proof could not be submitted" });
  }
});

module.exports = router;

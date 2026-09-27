const express = require("express");
const path = require("path");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const PaymentTransaction = require("../models/PaymentTransaction");
const { issueDonationReceipt, deliverDonationReceipt } = require("../services/donationReceiptService");
const { sendPrivateFile } = require("../utils/privateFiles");

const router = express.Router();
router.use(auth, admin);

router.get("/", async (req, res) => {
  const query = { purpose: "donation" };
  if (req.query.status) query.status = req.query.status;
  const donations = await PaymentTransaction.find(query)
    .sort({ createdAt: -1 }).limit(300)
    .select("donor provider verificationType currency baseAmount totalAmount status proofFile paymentDate paymentMethod transactionReference donorNote reviewedBy reviewedAt rejectionReason receiptNumber receiptPath receiptIssuedAt receiptDeliveryStatus receiptDeliveryAttempts receiptDeliveryError createdAt verifiedAt");
  res.json(donations);
});

router.get("/:id/proof", async (req, res) => {
  const donation = await PaymentTransaction.findOne({ _id: req.params.id, purpose: "donation", verificationType: "manual" });
  if (!donation) return res.status(404).json({ message: "Donation not found" });
  return sendPrivateFile(res, path.resolve("uploads", "private", "donations"), donation.proofFile);
});

router.post("/:id/approve", async (req, res) => {
  try {
    let donation = await PaymentTransaction.findOneAndUpdate(
      { _id: req.params.id, purpose: "donation", verificationType: "manual", status: "pending" },
      { $set: { status: "verified", verifiedAt: new Date(), reviewedAt: new Date(), reviewedBy: req.user.id, rejectionReason: "" } },
      { new: true }
    );
    if (!donation) donation = await PaymentTransaction.findOne({ _id: req.params.id, purpose: "donation" });
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    if (donation.status !== "verified") return res.status(409).json({ message: "Only pending donations can be approved" });
    donation = await issueDonationReceipt(donation);
    res.json({ success: true, donation });
  } catch (error) {
    console.error("Donation receipt generation failed", { donationId: req.params.id, message: error.message });
    res.status(500).json({ message: "Receipt generation failed" });
  }
});

router.post("/:id/reject", async (req, res) => {
  const reason = String(req.body.reason || "").trim().slice(0, 500);
  const donation = await PaymentTransaction.findOneAndUpdate(
    { _id: req.params.id, purpose: "donation", verificationType: "manual", status: "pending" },
    { $set: { status: "rejected", rejectionReason: reason, reviewedAt: new Date(), reviewedBy: req.user.id } },
    { new: true }
  );
  if (!donation) return res.status(409).json({ message: "Pending donation not found" });
  res.json({ success: true, donation });
});

router.get("/:id/receipt", async (req, res) => {
  const donation = await PaymentTransaction.findOne({ _id: req.params.id, purpose: "donation", status: "verified" });
  if (!donation?.receiptPath) return res.status(404).json({ message: "Receipt not found" });
  return res.download(donation.receiptPath, `${donation.receiptNumber}.pdf`);
});

router.post("/:id/resend", async (req, res) => {
  const donation = await PaymentTransaction.findOne({ _id: req.params.id, purpose: "donation", status: "verified" });
  if (!donation?.receiptNumber) return res.status(404).json({ message: "Issued receipt not found" });
  const updated = await deliverDonationReceipt(donation, { force: true });
  res.json({ success: updated.receiptDeliveryStatus === "sent", donation: updated });
});

module.exports = router;

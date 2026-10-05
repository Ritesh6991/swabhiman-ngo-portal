const express = require("express");
const path = require("path");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const PaymentTransaction = require("../models/PaymentTransaction");
const { issueDonationReceipt, deliverDonationReceipt, ensureDonationReceiptFile } = require("../services/donationReceiptService");
const { sendPrivateFile } = require("../utils/privateFiles");
const { sendPaymentProof } = require("../services/paymentProofStorage");
const { send: sendStoredDocument } = require("../services/privateDocumentStorage");

const router = express.Router();
router.use(auth, admin);

router.get("/", async (req, res) => {
  const query = { purpose: "donation" };
  if (req.query.status) query.status = req.query.status;
  const donations = await PaymentTransaction.find(query)
    .sort({ createdAt: -1 }).limit(300)
    .select("donor provider verificationType currency baseAmount totalAmount status proofFile proofDocument paymentReference paymentDate paymentMethod transactionReference donorNote reviewedBy reviewedAt rejectionReason receiptNumber receiptPath receiptDocument receiptIssuedAt receiptDeliveryStatus receiptDeliveryAttempts receiptDeliveryError createdAt verifiedAt");
  res.json(donations);
});

router.get("/:id/proof", async (req, res) => {
  const donation = await PaymentTransaction.findOne({ _id: req.params.id, purpose: "donation", verificationType: "manual" });
  if (!donation) return res.status(404).json({ message: "Donation not found" });
  if (donation.proofDocument?.publicId) return sendPaymentProof(res, donation.proofDocument);
  return sendPrivateFile(res, path.resolve("uploads", "private", "donations"), donation.proofFile);
});

router.post("/:id/approve", async (req, res) => {
  try {
    let donation = await PaymentTransaction.findOneAndUpdate(
      { _id: req.params.id, purpose: "donation", verificationType: "manual", status: "pending", $or: [{ "proofDocument.publicId": { $type: "string", $ne: "" } }, { proofFile: { $type: "string", $ne: "" } }] },
      { $set: { status: "verified", verifiedAt: new Date(), reviewedAt: new Date(), reviewedBy: req.user.id, rejectionReason: "" } },
      { returnDocument: "after" }
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
  if (reason.length < 3) return res.status(400).json({ message: "Enter a rejection reason." });
  const donation = await PaymentTransaction.findOneAndUpdate(
    { _id: req.params.id, purpose: "donation", verificationType: "manual", status: "pending" },
    { $set: { status: "rejected", rejectionReason: reason, reviewedAt: new Date(), reviewedBy: req.user.id } },
    { returnDocument: "after" }
  );
  if (!donation) return res.status(409).json({ message: "Pending donation not found" });
  res.json({ success: true, donation });
});

router.get("/:id/receipt", async (req, res) => {
  try {
    let donation = await PaymentTransaction.findOne({ _id: req.params.id, purpose: "donation", status: "verified" });
    if (!donation?.receiptNumber) return res.status(404).json({ message: "Receipt not found" });
    donation = await ensureDonationReceiptFile(donation);
    if (donation.receiptDocument?.publicId) {
      return sendStoredDocument(res, donation.receiptDocument, {
        disposition: "attachment",
        filename: `${donation.receiptNumber}.pdf`,
      });
    }
    return res.status(404).json({ message: "Receipt document is unavailable" });
  } catch (error) {
    console.error("Donation receipt download failed", { donationId: req.params.id, message: error.message });
    return res.status(500).json({ message: "Receipt could not be prepared" });
  }
});

router.post("/:id/resend", async (req, res) => {
  const donation = await PaymentTransaction.findOne({ _id: req.params.id, purpose: "donation", status: "verified" });
  if (!donation?.receiptNumber) return res.status(404).json({ message: "Issued receipt not found" });
  const updated = await deliverDonationReceipt(donation, { force: true });
  res.json({ success: updated.receiptDeliveryStatus === "sent", donation: updated });
});

module.exports = router;

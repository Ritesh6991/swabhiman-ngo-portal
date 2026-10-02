const express = require("express");
const path = require("path");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const PaymentTransaction = require("../models/PaymentTransaction");
const MembershipRequest = require("../models/MembershipRequest");
const { activateMembership } = require("../services/membershipActivationService");
const { issueDonationReceipt } = require("../services/donationReceiptService");
const { membershipAmountForType } = require("../services/manualUpiPaymentService");
const { sendPaymentProof } = require("../services/paymentProofStorage");
const { sendPrivateFile } = require("../utils/privateFiles");

const router = express.Router();
router.use(auth, admin);

router.get("/", async (req, res) => {
  const query = { verificationType: "manual" };
  if (["membership", "donation"].includes(req.query.purpose)) query.purpose = req.query.purpose;
  if (["created", "pending", "verified", "rejected", "failed", "cancelled"].includes(req.query.status)) query.status = req.query.status;
  const transactions = await PaymentTransaction.find(query).sort({ createdAt: -1 }).limit(300)
    .populate("userId", "name email memberId")
    .populate("membershipRequestId", "name email phone membershipType amount status paymentStatus")
    .select("purpose userId membershipRequestId donor provider verificationType currency baseAmount totalAmount status fulfillmentStatus paymentReference proofFile proofDocument paymentDate paymentMethod transactionReference reviewedBy reviewedAt rejectionReason receiptNumber receiptDeliveryStatus configurationVersion upiSnapshot createdAt verifiedAt");
  res.json(transactions);
});

router.get("/:id/proof", async (req, res) => {
  try {
    const transaction = await PaymentTransaction.findOne({ _id: req.params.id, verificationType: "manual" });
    if (!transaction) return res.status(404).json({ message: "Payment not found." });
    if (transaction.proofDocument?.publicId) return sendPaymentProof(res, transaction.proofDocument);
    if (transaction.purpose === "donation" && transaction.proofFile) {
      return sendPrivateFile(res, path.resolve("uploads", "private", "donations"), transaction.proofFile);
    }
    return res.status(404).json({ message: "Payment proof not found." });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Payment proof could not be opened." });
  }
});

router.post("/:id/approve", async (req, res) => {
  try {
    let transaction = await PaymentTransaction.findOne({ _id: req.params.id, verificationType: "manual" });
    if (!transaction) return res.status(404).json({ message: "Payment not found." });
    if (!transaction.proofDocument?.publicId && !transaction.proofFile) {
      return res.status(409).json({ message: "Payment proof is required before approval." });
    }
    if (!["pending", "verified"].includes(transaction.status)) {
      return res.status(409).json({ message: "Only pending payments can be approved." });
    }
    if (transaction.purpose === "membership") {
      const request = await MembershipRequest.findById(transaction.membershipRequestId);
      if (!request) return res.status(404).json({ message: "Membership application not found." });
      const expected = membershipAmountForType(request.membershipType);
      if (Number(transaction.baseAmount) !== Number(expected) || Number(transaction.totalAmount) !== Number(expected) || Number(request.amount) !== Number(expected)) {
        return res.status(409).json({ message: "Payment amount does not match the authoritative membership fee." });
      }
    }
    if (transaction.status === "pending") {
      transaction = await PaymentTransaction.findOneAndUpdate(
        { _id: transaction._id, status: "pending" },
        { $set: { status: "verified", verifiedAt: new Date(), reviewedAt: new Date(), reviewedBy: req.user.id, rejectionReason: "" } },
        { new: true }
      ) || await PaymentTransaction.findById(transaction._id);
    }
    if (transaction.purpose === "membership" && transaction.fulfillmentStatus !== "complete") {
      transaction = await activateMembership(transaction);
    } else if (transaction.purpose === "donation") {
      transaction = await issueDonationReceipt(transaction);
    }
    res.json({ success: true, transaction });
  } catch (error) {
    console.error("Manual UPI approval failed", { paymentId: req.params.id, message: error.message });
    res.status(error.status || 500).json({ message: error.status ? error.message : "Payment approval failed." });
  }
});

router.post("/:id/reject", async (req, res) => {
  const reason = String(req.body.reason || "").trim().slice(0, 500);
  if (reason.length < 3) return res.status(400).json({ message: "Enter a rejection reason." });
  const transaction = await PaymentTransaction.findOneAndUpdate(
    { _id: req.params.id, verificationType: "manual", status: "pending" },
    { $set: { status: "rejected", rejectionReason: reason, reviewedAt: new Date(), reviewedBy: req.user.id } },
    { new: true }
  );
  if (!transaction) return res.status(409).json({ message: "Pending payment not found." });
  if (transaction.purpose === "membership") {
    await MembershipRequest.findByIdAndUpdate(transaction.membershipRequestId, { paymentStatus: "failed" });
  }
  res.json({ success: true, transaction });
});

module.exports = router;

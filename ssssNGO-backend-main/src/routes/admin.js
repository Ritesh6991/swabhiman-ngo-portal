const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const MembershipRequest = require("../models/MembershipRequest");
const User = require("../models/User");
const Post = require("../models/Post");
const PaymentTransaction = require("../models/PaymentTransaction");
const DeliveryLog = require("../models/DeliveryLog");
const { getPaymentConfig } = require("../config/paymentConfig");
const { getPaymentSettings, gatewayCredentialsConfigured } = require("../services/paymentSettingsService");
const { activateMembership, deliverMembershipDocuments, getMemberPhotoBuffer } = require("../services/membershipActivationService");
const { confirmManualMembershipPayment } = require("../services/manualMembershipPaymentService");
const path = require("path");
const { sendPrivateFile } = require("../utils/privateFiles");
const mongoose = require("mongoose");
const LegacyDocumentSubmission = require("../models/LegacyDocumentSubmission");
const LegacyDocumentAudit = require("../models/LegacyDocumentAudit");
const { documentState, documentFields } = require("../services/legacyDocumentRecovery");
const { destroyLegacyDocuments, sendLegacyDocument } = require("../services/legacyDocumentStorage");

// ================= STATS =================
router.get("/stats", auth, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const members = await User.countDocuments({ joined: true });
    const pending = await MembershipRequest.countDocuments({ status: "pending" });
    const totalPosts = await Post.countDocuments();

    res.json({
      totalUsers,
      members,
      pendingRequests: pending,
      totalPosts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Stats error" });
  }
});

// ================= GET REQUESTS =================
router.get("/requests", auth, admin, async (req, res) => {
  try {
    const requests = await MembershipRequest.find().sort({ createdAt: -1 });
    const pending = await LegacyDocumentSubmission.find({
      membershipRequestId: { $in: requests.map((request) => request._id) }, status: "pending",
    }).select("membershipRequestId submittedKinds status createdAt");
    const pendingByRequest = new Map(pending.map((item) => [String(item.membershipRequestId), item]));
    res.json(requests.map((request) => {
      const item = request.toObject();
      const submission = pendingByRequest.get(String(item._id)) || null;
      const state = documentState(item, submission);
      item.documentAvailability = Object.fromEntries(Object.entries(state).map(([kind, value]) => [kind, value.available]));
      item.documentRecovery = { documents: state, pendingSubmission: submission };
      return item;
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load requests" });
  }
});

router.get("/requests/:id/document/:kind", auth, admin, async (req, res) => {
  const fields = { photo: "photoFile", aadhaar: "aadhaarFile", pan: "panFile" };
  const field = fields[req.params.kind];
  if (!field) return res.status(404).json({ message: "Unknown document type" });
  const request = await MembershipRequest.findById(req.params.id).select(field);
  if (!request) return res.status(404).json({ message: "Application not found" });
  console.info("Admin membership document access", { adminId: req.user.id, requestId: req.params.id, kind: req.params.kind });
  const fullRequest = await MembershipRequest.findById(req.params.id).select(`${field} ${documentFields[req.params.kind]}`);
  const durable = fullRequest?.[documentFields[req.params.kind]];
  await LegacyDocumentAudit.create({ membershipRequestId: req.params.id, actorId: req.user.id, actorRole: req.user.role, action: "viewed", documentKinds: [req.params.kind] });
  if (durable?.publicId) return sendLegacyDocument(res, durable);
  return sendPrivateFile(res, path.resolve("uploads", "docs"), fullRequest[field]);
});

router.get("/document-reuploads/:submissionId/document/:kind", auth, admin, async (req, res, next) => {
  try {
    if (!["photo", "aadhaar", "pan"].includes(req.params.kind)) return res.status(404).json({ message: "Document not found" });
    const submission = await LegacyDocumentSubmission.findById(req.params.submissionId);
    const document = submission?.documents?.[req.params.kind];
    if (!document?.publicId) return res.status(404).json({ message: "Document not found" });
    await LegacyDocumentAudit.create({ membershipRequestId: submission.membershipRequestId, submissionId: submission._id, actorId: req.user.id, actorRole: req.user.role, action: "viewed", documentKinds: [req.params.kind] });
    return sendLegacyDocument(res, document);
  } catch (error) { next(error); }
});

router.post("/document-reuploads/:submissionId/verify", auth, admin, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let verified;
    await session.withTransaction(async () => {
      const submission = await LegacyDocumentSubmission.findOne({ _id: req.params.submissionId, status: "pending" }).session(session);
      if (!submission) throw Object.assign(new Error("Pending document submission not found"), { status: 404 });
      const updates = {};
      for (const kind of submission.submittedKinds) {
        if (submission.documents?.[kind]?.publicId) updates[documentFields[kind]] = submission.documents[kind].toObject();
      }
      const request = await MembershipRequest.findByIdAndUpdate(submission.membershipRequestId, { $set: updates }, { new: true, session });
      if (!request) throw Object.assign(new Error("Membership application not found"), { status: 404 });
      submission.status = "verified";
      submission.reviewedBy = req.user.id;
      submission.reviewedAt = new Date();
      submission.reviewNote = String(req.body?.note || "").trim().slice(0, 500);
      await submission.save({ session });
      await LegacyDocumentAudit.create([{
        membershipRequestId: request._id, submissionId: submission._id, actorId: req.user.id,
        actorRole: req.user.role, action: "verified", documentKinds: submission.submittedKinds,
        note: submission.reviewNote,
      }], { session });
      verified = { requestId: request._id, membershipStatus: request.status, memberId: request.memberId, kinds: submission.submittedKinds };
    });
    res.json({ success: true, verified });
  } catch (error) { next(error); } finally { await session.endSession(); }
});

router.post("/document-reuploads/:submissionId/reject", auth, admin, async (req, res, next) => {
  try {
    const submission = await LegacyDocumentSubmission.findOne({ _id: req.params.submissionId, status: "pending" });
    if (!submission) return res.status(404).json({ message: "Pending document submission not found" });
    const note = String(req.body?.note || "").trim().slice(0, 500);
    if (note.length < 3) return res.status(400).json({ message: "Provide a short rejection reason for the member" });
    await destroyLegacyDocuments(submission.submittedKinds.map((kind) => submission.documents?.[kind]).filter(Boolean));
    submission.status = "rejected";
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();
    submission.reviewNote = note;
    submission.deletedAt = new Date();
    submission.documents = { photo: null, aadhaar: null, pan: null };
    await submission.save();
    await LegacyDocumentAudit.create({ membershipRequestId: submission.membershipRequestId, submissionId: submission._id, actorId: req.user.id, actorRole: req.user.role, action: "rejected", documentKinds: submission.submittedKinds, note });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// Approval accepts a verified gateway payment or an explicit, auditable admin confirmation.
router.post("/approve/:id", auth, admin, async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status === "rejected") {
      return res.status(409).json({ message: "Rejected applications cannot be approved. Ask the applicant to submit a new request." });
    }

    try {
      await getMemberPhotoBuffer(request);
    } catch (photoError) {
      return res.status(409).json({
        message: "The applicant photo is missing from durable storage. Ask the member to use secure document re-upload; their existing application and payment history will remain unchanged.",
      });
    }

    let transaction = await PaymentTransaction.findOne({
      membershipRequestId: request._id,
      purpose: "membership",
      status: "verified",
    });
    if (!transaction) {
      const upiAttempt = await PaymentTransaction.findOne({
        membershipRequestId: request._id,
        purpose: "membership",
        provider: "manual_upi",
        status: { $in: ["created", "pending"] },
      }).sort({ createdAt: -1 });
      if (upiAttempt) {
        return res.status(409).json({
          message: upiAttempt.status === "created"
            ? "The applicant has not submitted payment proof yet."
            : "Review and approve the submitted UPI proof in Payments & Delivery.",
        });
      }
      transaction = await confirmManualMembershipPayment({
        request,
        adminId: req.user.id,
        approval: req.body,
      });
    }
    if (transaction.fulfillmentStatus !== "complete") await activateMembership(transaction);
    res.json({
      success: true,
      message: "Payment verified and membership activated.",
      paymentVerification: transaction.verificationType,
    });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(err.status || 500).json({ message: err.status ? err.message : "Approval failed", error: err.message });
  }
});

router.get("/payments", auth, admin, async (_req, res) => {
  const payments = await PaymentTransaction.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .select("purpose provider currency baseAmount taxAmount totalAmount status fulfillmentStatus createdAt verifiedAt");
  res.json(payments);
});

router.get("/payment-config", auth, admin, async (_req, res) => {
  const config = getPaymentConfig();
  const settings = await getPaymentSettings();
  res.json({
    membership: {
      provider: settings.membership.provider,
      gatewayEnabled: settings.membership.gatewayEnabled,
      upiEnabled: settings.upi.enabled && settings.upi.membershipEnabled,
      currency: config.membership.currency,
      tax: config.membership.tax,
      yearlyAmount: config.membership.yearlyAmount,
      permanentAmount: config.membership.permanentAmount,
      credentialsConfigured: gatewayCredentialsConfigured("membership", settings.membership.provider),
    },
    donation: {
      provider: settings.donation.provider,
      gatewayEnabled: settings.donation.gatewayEnabled,
      upiEnabled: settings.upi.enabled && settings.upi.donationEnabled,
      currency: config.donation.currency,
      tax: config.donation.tax,
      minimumAmount: config.donation.minimumAmount,
      credentialsConfigured: gatewayCredentialsConfigured("donation", settings.donation.provider),
    },
    upi: settings.upi,
  });
});

router.get("/deliveries", auth, admin, async (_req, res) => {
  const deliveries = await DeliveryLog.find().sort({ updatedAt: -1 }).limit(200);
  res.json(deliveries);
});

router.post("/deliveries/:requestId/resend", auth, admin, async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.requestId);
    const user = request && await User.findById(request.userId);
    if (!request || !user || !user.joined) return res.status(404).json({ message: "Active membership not found" });
    const delivery = await deliverMembershipDocuments({ user, request, force: true });
    res.json({ success: delivery.status === "sent", delivery });
  } catch (error) {
    res.status(500).json({ message: "Resend failed", error: error.message });
  }
});

// ================= REJECT =================
router.post("/reject/:id", auth, admin, async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.paymentStatus === "verified") {
      return res.status(409).json({ message: "A paid membership cannot be rejected through this action." });
    }

    request.status = "rejected";
    await request.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reject failed" });
  }
});
router.get("/members", auth, admin, async (req, res) => {
  try {
    const users = await User.find({ joined: true }).select(
      "_id name email memberId createdAt"
    );

    const members = await Promise.all(
      users.map(async (u) => {
        const reqData = await MembershipRequest.findOne({
          userId: u._id.toString(),
        });

        const city =
          reqData?.city ||
          reqData?.currentAddress?.split(",")[0] ||
          "N/A";

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          memberId: u.memberId,
          city,
          phone: reqData?.phone || "N/A",
          createdAt: u.createdAt,
        };
      })
    );

    res.json(members);
  } catch (err) {
    console.error("GET MEMBERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch members" });
  }
});
module.exports = router;

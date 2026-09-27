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
const { activateMembership, deliverMembershipDocuments } = require("../services/membershipActivationService");
const { confirmManualMembershipPayment } = require("../services/manualMembershipPaymentService");
const path = require("path");
const fs = require("fs");
const { sendPrivateFile } = require("../utils/privateFiles");

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
    const documentRoot = path.resolve("uploads", "docs");
    res.json(requests.map((request) => {
      const item = request.toObject();
      item.documentAvailability = {
        photo: Boolean(item.photoFile && fs.existsSync(path.join(documentRoot, path.basename(item.photoFile)))),
        aadhaar: Boolean(item.aadhaarFile && fs.existsSync(path.join(documentRoot, path.basename(item.aadhaarFile)))),
        pan: Boolean(item.panFile && fs.existsSync(path.join(documentRoot, path.basename(item.panFile)))),
      };
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
  return sendPrivateFile(res, path.resolve("uploads", "docs"), request[field]);
});

// Approval accepts a verified gateway payment or an explicit, auditable admin confirmation.
router.post("/approve/:id", auth, admin, async (req, res) => {
  try {
    const request = await MembershipRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status === "rejected") {
      return res.status(409).json({ message: "Rejected applications cannot be approved. Ask the applicant to submit a new request." });
    }

    let transaction = await PaymentTransaction.findOne({
      membershipRequestId: request._id,
      purpose: "membership",
      status: "verified",
    });
    if (!transaction) {
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

router.get("/payment-config", auth, admin, (_req, res) => {
  const config = getPaymentConfig();
  res.json({
    membership: {
      provider: config.membership.provider,
      currency: config.membership.currency,
      tax: config.membership.tax,
      yearlyAmount: config.membership.yearlyAmount,
      permanentAmount: config.membership.permanentAmount,
      credentialsConfigured: Boolean(config.membership.publicKey && config.membership.secretKey),
    },
    donation: {
      provider: config.donation.provider,
      currency: config.donation.currency,
      tax: config.donation.tax,
      minimumAmount: config.donation.minimumAmount,
      credentialsConfigured: Boolean(config.donation.publicKey && config.donation.secretKey),
    },
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

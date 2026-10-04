const router = require("express").Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadDocs");

const MembershipRequest = require("../models/MembershipRequest");
const User = require("../models/User");
const sendMail = require("../utils/sendMail");
const fs = require("fs");
const { membershipAmountForType } = require("../services/manualUpiPaymentService");
const { normalizeOptionalMembershipFields } = require("../utils/normalizeMembershipInput");
const LegacyDocumentSubmission = require("../models/LegacyDocumentSubmission");
const LegacyDocumentAudit = require("../models/LegacyDocumentAudit");
const { legacyDocumentUpload, validateLegacyDocuments } = require("../middleware/legacyDocumentUpload");
const { uploadLegacyDocuments, destroyLegacyDocuments, sendLegacyDocument } = require("../services/legacyDocumentStorage");
const { documentState } = require("../services/legacyDocumentRecovery");

const removeUploadedFiles = (files) => Object.values(files || {}).flat().forEach((file) => fs.rmSync(file.path, { force: true }));

// ================= TEST ROUTE =================
router.get("/", (req, res) => {
  res.send("Membership API working ✅");
});

const membershipForUser = async (userId) => (
  await MembershipRequest.findOne({ userId, status: "approved" }).sort({ approvedAt: -1, createdAt: -1 })
  || await MembershipRequest.findOne({ userId }).sort({ createdAt: -1 })
);

// Members can repair missing legacy files without changing their membership,
// payment or approval history. Every replacement remains pending until review.
router.get("/documents/status", auth, async (req, res, next) => {
  try {
    const request = await membershipForUser(req.user.id);
    if (!request) return res.status(404).json({ message: "No membership application was found for this account" });
    const pending = await LegacyDocumentSubmission.findOne({ membershipRequestId: request._id, status: "pending" }).sort({ createdAt: -1 });
    const history = await LegacyDocumentSubmission.find({ membershipRequestId: request._id })
      .sort({ createdAt: -1 }).limit(10).select("submittedKinds status submittedAt createdAt reviewedAt reviewNote");
    res.json({
      membershipRequestId: request._id,
      membershipStatus: request.status,
      memberId: request.memberId || req.user.memberId || "",
      documents: documentState(request, pending),
      pendingSubmissionId: pending?._id || null,
      history,
    });
  } catch (error) { next(error); }
});

router.post("/documents/reupload", auth, legacyDocumentUpload, validateLegacyDocuments, async (req, res, next) => {
  let uploaded;
  try {
    const request = await membershipForUser(req.user.id);
    if (!request) return res.status(404).json({ message: "No membership application was found for this account" });
    const pending = await LegacyDocumentSubmission.findOne({ membershipRequestId: request._id, status: "pending" });
    if (pending) return res.status(409).json({ message: "A document submission is already awaiting Admin review" });

    const current = documentState(request);
    const disallowed = req.legacyDocumentKinds.filter((kind) => !current[kind].canSubmit);
    if (disallowed.length) return res.status(409).json({ message: `Replacement is not required for: ${disallowed.join(", ")}` });

    uploaded = await uploadLegacyDocuments(req.files, req.legacyDocumentKinds);
    const submission = await LegacyDocumentSubmission.create({
      membershipRequestId: request._id,
      userId: req.user.id,
      documents: uploaded,
      submittedKinds: req.legacyDocumentKinds,
      membershipStatusSnapshot: request.status,
      memberIdSnapshot: request.memberId || req.user.memberId || "",
    });
    await LegacyDocumentAudit.create({
      membershipRequestId: request._id,
      submissionId: submission._id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "submitted",
      documentKinds: req.legacyDocumentKinds,
    });
    res.status(201).json({ success: true, submissionId: submission._id, status: submission.status });
  } catch (error) {
    if (uploaded) await destroyLegacyDocuments(Object.values(uploaded));
    if (error?.code === 11000) return res.status(409).json({ message: "A document submission is already awaiting Admin review" });
    next(error);
  }
});

router.get("/documents/reuploads/:submissionId/:kind", auth, async (req, res, next) => {
  try {
    if (!["photo", "aadhaar", "pan"].includes(req.params.kind)) return res.status(404).json({ message: "Document not found" });
    const submission = await LegacyDocumentSubmission.findOne({ _id: req.params.submissionId, userId: req.user.id });
    if (!submission?.documents?.[req.params.kind]?.publicId) return res.status(404).json({ message: "Document not found" });
    await LegacyDocumentAudit.create({
      membershipRequestId: submission.membershipRequestId,
      submissionId: submission._id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "viewed",
      documentKinds: [req.params.kind],
    });
    return sendLegacyDocument(res, submission.documents[req.params.kind]);
  } catch (error) { next(error); }
});

// ================= CREATE REQUEST =================
router.post(
  "/request",
  auth,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  upload.validateMembershipFiles,
  async (req, res) => {
    try {
      const body = normalizeOptionalMembershipFields(req.body);
      const membershipType = body.membershipType;
      if (!["yearly", "permanent"].includes(membershipType)) {
        return res.status(400).json({ message: "Please select a valid membership type" });
      }
      const amount = membershipAmountForType(membershipType);

      const existingRequest = await MembershipRequest.findOne({ userId: req.user.id, status: { $ne: "rejected" } });
      if (existingRequest) {
        removeUploadedFiles(req.files);
        return res.status(409).json({ message: "A membership application already exists for this account" });
      }

      const request = await MembershipRequest.create({
        ...body,
        userId: req.user.id,
        email: req.user.email,
        membershipType,
        amount,

        // ✅ SAFE FILE ACCESS
        photoFile: req.files?.photo?.[0]?.filename || "",
        aadhaarFile: req.files?.aadhaar?.[0]?.filename || "",
        panFile: req.files?.pan?.[0]?.filename || "",
      });

      // ✅ FIXED TEMPLATE STRING
      try {
        await sendMail({
          to: process.env.MEMBERSHIP_NOTIFICATION_EMAIL || process.env.MAIL_FROM_ADDRESS,
          subject: "New Membership Request",
          text: `New request from ${body.name}`,
        });
      } catch (mailError) {
        console.error("Membership notification failed:", mailError.message);
      }

      res.status(201).json({ success: true, request, next: "payment" });
    } catch (err) {
      console.error("REQUEST ERROR:", err);
      res.status(500).json({
        message: "Failed",
        error: err.message,
      });
    }
  }
);

// ================= SEARCH MEMBERS =================
router.get("/search", auth, async (req, res) => {
  try {
    const { city } = req.query;

    const isAdmin = ["admin", "owner"].includes(req.user.role);
    const isMember = req.user.joined;

    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find({ joined: true }).select(
      "_id name email memberId"
    );

    const members = await Promise.all(
      users.map(async (u) => {
        const query = {
          userId: u._id.toString(),
        };

        if (city) {
          query.city = { $regex: city, $options: "i" };
        }

        const reqData = await MembershipRequest.findOne(query);

        if (!reqData) return null;

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          memberId: u.memberId,
          phone: reqData.phone || "",
          city: reqData.city || "",
          state: reqData.state || "",
          photoFile: reqData.photoFile || "",
        };
      })
    );

    res.json(members.filter(Boolean));
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ message: "Search failed" });
  }
});

// ================= GET ALL CITIES =================
router.get("/cities", auth, async (req, res) => {
  try {
    const isAdmin = ["admin", "owner"].includes(req.user.role);
    const isMember = req.user.joined;

    if (!isAdmin && !isMember) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const cities = await MembershipRequest.distinct("city");

    res.json(cities);
  } catch (err) {
    console.error("CITIES ERROR:", err);
    res.status(500).json({
      message: "Failed to fetch cities",
    });
  }
});

module.exports = router;

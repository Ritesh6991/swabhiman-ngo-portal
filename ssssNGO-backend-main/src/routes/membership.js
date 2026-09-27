const router = require("express").Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadDocs");

const MembershipRequest = require("../models/MembershipRequest");
const User = require("../models/User");
const sendMail = require("../utils/sendMail");
const fs = require("fs");

const removeUploadedFiles = (files) => Object.values(files || {}).flat().forEach((file) => fs.rmSync(file.path, { force: true }));

// ================= TEST ROUTE =================
router.get("/", (req, res) => {
  res.send("Membership API working ✅");
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
      const body = req.body;
      const membershipType = body.membershipType;
      if (!["yearly", "permanent"].includes(membershipType)) {
        return res.status(400).json({ message: "Please select a valid membership type" });
      }
      const amount = membershipType === "permanent"
        ? Number(process.env.MEMBERSHIP_PERMANENT_AMOUNT || 5100)
        : Number(process.env.MEMBERSHIP_YEARLY_AMOUNT || 1100);

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

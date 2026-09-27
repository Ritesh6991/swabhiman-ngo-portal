const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const MembershipRequest = require("../models/MembershipRequest");

router.get("/verify/:memberId", async (req, res) => {
  const memberId = String(req.params.memberId || "").trim().toUpperCase();
  const user = await User.findOne({ memberId, joined: true }).select("name memberId membershipActivatedAt");
  if (!user) return res.status(404).json({ verified: false, message: "Active membership not found" });

  const request = await MembershipRequest.findOne({ userId: String(user._id), status: "approved" })
    .sort({ approvedAt: -1 })
    .select("membershipType approvedAt validTill");
  const expired = Boolean(request?.validTill && request.validTill < new Date());
  res.json({
    verified: !expired,
    status: expired ? "expired" : "active",
    member: {
      name: user.name,
      memberId: user.memberId,
      membershipType: request?.membershipType || "",
      approvedAt: request?.approvedAt || user.membershipActivatedAt,
      validTill: request?.validTill || null,
    },
  });
});

router.post("/join", auth, async (req, res) => {
  res.status(410).json({
    message: "Direct membership activation has been retired. Submit a membership request and complete verified payment.",
    next: "/api/membership/request",
  });
});

module.exports = router;

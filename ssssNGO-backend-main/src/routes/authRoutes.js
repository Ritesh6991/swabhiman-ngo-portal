const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const sendMail = require("../utils/sendMail");
const escapeHtml = require("../utils/escapeHtml");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
const genericRecoveryMessage = "If a matching account exists, recovery instructions have been sent.";
const makeLimiter = (windowMs, limit) => rateLimit({
  windowMs, limit, standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});
const authLimiter = makeLimiter(15 * 60 * 1000, 20);
const recoveryLimiter = makeLimiter(30 * 60 * 1000, 5);

const safeUser = (user) => ({
  id: user._id, name: user.name, email: user.email, phone: user.phone,
  role: user.role, joined: user.joined, memberId: user.memberId,
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").replace(/\s/g, "");
    const password = String(req.body.password || "");
    if (name.length < 2) return res.status(400).json({ message: "Please enter your full name." });
    if (!emailPattern.test(email)) return res.status(400).json({ message: "Please enter a valid email address." });
    if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) return res.status(400).json({ message: "Please enter a valid phone number." });
    if (!strongPassword.test(password)) {
      return res.status(400).json({ message: "Password must be 8-72 characters with uppercase, lowercase, and a number." });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 12) });
    res.status(201).json({ message: "Account created successfully.", user: safeUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    res.status(500).json({ message: "Registration could not be completed." });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "The email or password is incorrect." });
    }
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: safeUser(user) });
  } catch (_error) {
    res.status(500).json({ message: "Login is temporarily unavailable." });
  }
});

router.post("/forgot-password", recoveryLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  try {
    const user = emailPattern.test(email) ? await User.findOne({ email }) : null;
    if (user) {
      await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await PasswordResetToken.create({
        userId: user._id, tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), requestedIp: req.ip,
      });
      const resetUrl = `${process.env.FRONTEND_URL || "http://127.0.0.1:5173"}/reset-password?token=${token}`;
      await sendMail({
        to: user.email, subject: "Reset your Swabhiman Shiksha Sanskriti Samajotthan Nyas password",
        html: `<p>Dear ${escapeHtml(user.name)},</p><p>Use the secure link below within 30 minutes to set a new password.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>If you did not request this, no action is needed.</p>`,
      });
    }
  } catch (error) {
    console.error("Password recovery delivery failed:", error.message);
  }
  res.json({ message: genericRecoveryMessage });
});

router.post("/reset-password", recoveryLimiter, async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    if (!strongPassword.test(password)) {
      return res.status(400).json({ message: "Password must be 8-72 characters with uppercase, lowercase, and a number." });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const reset = await PasswordResetToken.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } });
    if (!reset) return res.status(400).json({ message: "This reset link is invalid or has expired." });
    const user = await User.findById(reset.userId);
    if (!user) return res.status(400).json({ message: "This reset link is invalid or has expired." });
    user.password = await bcrypt.hash(password, 12);
    reset.usedAt = new Date();
    await Promise.all([user.save(), reset.save()]);
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
    res.json({ message: "Password updated. You can now log in." });
  } catch (_error) {
    res.status(500).json({ message: "Password could not be updated." });
  }
});

router.post("/forgot-login-id", recoveryLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  try {
    const user = emailPattern.test(email) ? await User.findOne({ email }) : null;
    if (user) {
      const memberLine = user.memberId
        ? `<p>Your member ID is <strong>${escapeHtml(user.memberId)}</strong>.</p>`
        : "<p>A member ID will be assigned after verified membership payment.</p>";
      await sendMail({
        to: user.email, subject: "Your Swabhiman Shiksha Sanskriti Samajotthan Nyas login details",
        html: `<p>Dear ${escapeHtml(user.name)},</p><p>Your registered email/login ID is <strong>${escapeHtml(user.email)}</strong>.</p>${memberLine}`,
      });
    }
  } catch (error) {
    console.error("Login ID recovery delivery failed:", error.message);
  }
  res.json({ message: genericRecoveryMessage });
});

module.exports = router;

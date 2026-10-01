const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const Announcement = require("../models/Announcement");
const ExamCycle = require("../models/ExamCycle");
const { publicExamState } = require("../services/examState");

const router = express.Router();
const clean = (value, max) => String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
const allowedPlacement = new Set(["sitewide", "homepage", "both"]);
const allowedType = new Set(["general", "examination", "admit_card", "result", "scholarship", "event"]);

const payload = (body) => {
  const displayStart = new Date(body.displayStart);
  const displayEnd = new Date(body.displayEnd);
  if (!clean(body.title, 180) || !clean(body.message, 500) || [displayStart, displayEnd].some((date) => Number.isNaN(date.getTime()))) {
    throw Object.assign(new Error("Title, message and valid display dates are required"), { status: 400 });
  }
  return {
    title: clean(body.title, 180), message: clean(body.message, 500),
    type: allowedType.has(body.type) ? body.type : "general", ctaLabel: clean(body.ctaLabel, 40), ctaLink: clean(body.ctaLink, 500),
    displayStart, displayEnd, priority: Math.max(0, Math.min(100, Number(body.priority || 10))),
    placement: allowedPlacement.has(body.placement) ? body.placement : "sitewide", active: body.active !== false && body.active !== "false",
    linkedExamCycle: body.linkedExamCycle || null,
  };
};

router.get("/active", async (_req, res, next) => {
  try {
    const now = new Date();
    const [manual, exams] = await Promise.all([
      Announcement.find({ active: true, displayStart: { $lte: now }, displayEnd: { $gte: now } }).sort({ priority: -1, createdAt: -1 }).lean(),
      ExamCycle.find({ announcementEnabled: true, status: { $in: ["scheduled", "active"] } }).sort({ year: -1 }).lean(),
    ]);
    const automatic = exams.map((exam) => {
      const state = publicExamState(exam, now);
      if (!["upcoming", "open", "closed"].includes(state)) return null;
      if (state === "closed" && now > new Date(exam.examDate)) return null;
      return {
        _id: `exam-${exam._id}`, title: exam.title,
        message: state === "open" ? `Registrations open until ${new Date(exam.registrationEnd).toLocaleDateString("en-IN")}. Exam: ${new Date(exam.examDate).toLocaleDateString("en-IN")}.`
          : state === "upcoming" ? `Registration opens ${new Date(exam.registrationStart).toLocaleDateString("en-IN")}.`
            : "Registrations closed.",
        type: "examination", placement: exam.homepageHighlight ? "both" : "sitewide", priority: 90,
        ctaLabel: state === "open" ? "Register Now" : "View Details", ctaLink: `/exam-registration/${exam.slug}`,
        registrationState: state, linkedExamCycle: exam._id,
      };
    }).filter(Boolean);
    res.json([...automatic, ...manual].sort((a, b) => b.priority - a.priority));
  } catch (error) { next(error); }
});

router.get("/admin", auth, admin, async (_req, res, next) => {
  try { res.json(await Announcement.find().populate("linkedExamCycle", "title year slug").sort({ createdAt: -1 })); } catch (error) { next(error); }
});
router.post("/admin", auth, admin, async (req, res, next) => {
  try { res.status(201).json(await Announcement.create({ ...payload(req.body), createdBy: req.user.id, updatedBy: req.user.id })); } catch (error) { next(error); }
});
router.put("/admin/:id", auth, admin, async (req, res, next) => {
  try {
    const item = await Announcement.findByIdAndUpdate(req.params.id, { ...payload(req.body), updatedBy: req.user.id }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Announcement not found" });
    res.json(item);
  } catch (error) { next(error); }
});
router.patch("/admin/:id/status", auth, admin, async (req, res, next) => {
  try {
    const item = await Announcement.findByIdAndUpdate(req.params.id, { active: Boolean(req.body.active), updatedBy: req.user.id }, { new: true });
    if (!item) return res.status(404).json({ message: "Announcement not found" });
    res.json(item);
  } catch (error) { next(error); }
});

module.exports = router;

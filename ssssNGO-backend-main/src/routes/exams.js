const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const ExamCycle = require("../models/ExamCycle");
const ExamRegistration = require("../models/ExamRegistration");
const { examUpload } = require("../middleware/examUpload");
const { uploadExamDocuments, removeExamDocuments, sendPrivateDocument } = require("../services/examDocumentStorage");
const { publicExamState, publicCycle } = require("../services/examState");

const router = express.Router();
const registrationLimiter = rateLimit({ windowMs: 30 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const text = (value, max) => String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^\+?[0-9][0-9\s-]{8,14}$/;
const slugFor = (value) => text(value, 120).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cycleInput = (body) => {
  const year = Number(body.year);
  const title = text(body.title, 180);
  const status = text(body.status || "draft", 20);
  const registrationStart = new Date(body.registrationStart);
  const registrationEnd = new Date(body.registrationEnd);
  const examDate = new Date(body.examDate);
  if (!title || !Number.isInteger(year) || year < 2000 || year > 2200) throw Object.assign(new Error("A valid title and year are required"), { status: 400 });
  if ([registrationStart, registrationEnd, examDate].some((date) => Number.isNaN(date.getTime()))) throw Object.assign(new Error("Valid registration and examination dates are required"), { status: 400 });
  if (!["draft", "scheduled", "active", "completed", "archived"].includes(status)) throw Object.assign(new Error("Invalid examination status"), { status: 400 });
  const instructions = Array.isArray(body.instructions) ? body.instructions : String(body.instructions || "").split("\n");
  return {
    title, year, slug: slugFor(body.slug || `${year}`), registrationStart, registrationEnd, examDate,
    reportingTime: text(body.reportingTime, 40), examStartTime: text(body.examStartTime, 40),
    examinationCentre: text(body.examinationCentre, 500), instructions: instructions.map((item) => text(item, 500)).filter(Boolean).slice(0, 20),
    status, admitCardReleaseAt: body.admitCardReleaseAt ? new Date(body.admitCardReleaseAt) : null,
    announcementEnabled: body.announcementEnabled !== false && body.announcementEnabled !== "false",
    homepageHighlight: body.homepageHighlight !== false && body.homepageHighlight !== "false",
  };
};

const registrationInput = (body) => {
  const values = {
    studentName: text(body.studentName, 150), fatherName: text(body.fatherName, 150),
    dateOfBirth: new Date(body.dateOfBirth), className: text(body.className, 80), fullAddress: text(body.fullAddress, 800),
    mobile: text(body.mobile, 20), email: text(body.email, 180).toLowerCase(),
  };
  if (!values.studentName || !values.fatherName || !values.className || !values.fullAddress) throw Object.assign(new Error("Please complete every required student field"), { status: 400 });
  if (Number.isNaN(values.dateOfBirth.getTime()) || values.dateOfBirth > new Date()) throw Object.assign(new Error("Please enter a valid date of birth"), { status: 400 });
  if (!mobilePattern.test(values.mobile)) throw Object.assign(new Error("Please enter a valid WhatsApp mobile number"), { status: 400 });
  if (!emailPattern.test(values.email)) throw Object.assign(new Error("Please enter a valid email address"), { status: 400 });
  return values;
};

router.get("/admin/dashboard", auth, admin, async (_req, res, next) => {
  try {
    const cycles = await ExamCycle.find().sort({ year: -1 }).lean();
    const current = cycles.find((cycle) => ["open", "upcoming"].includes(publicExamState(cycle))) || cycles[0] || null;
    const match = current ? { examCycle: current._id } : {};
    const [totals, recent] = await Promise.all([
      ExamRegistration.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      ExamRegistration.find(match).sort({ createdAt: -1 }).limit(6).select("applicationNumber studentName status createdAt examCycle").lean(),
    ]);
    const counts = { total: 0, pending: 0, approved: 0, rejected: 0, admitCardsGenerated: 0 };
    totals.forEach((item) => { counts[item._id] = item.count; counts.total += item.count; });
    counts.admitCardsGenerated = await ExamRegistration.countDocuments({ ...match, admitCardStatus: "generated" });
    res.json({ counts, current: current ? publicCycle(current) : null, recent, cycles: cycles.map((cycle) => publicCycle(cycle)) });
  } catch (error) { next(error); }
});

router.get("/admin/cycles", auth, admin, async (_req, res, next) => {
  try { res.json(await ExamCycle.find().sort({ year: -1 })); } catch (error) { next(error); }
});

router.post("/admin/cycles", auth, admin, async (req, res, next) => {
  try {
    const values = cycleInput(req.body);
    const cycle = await ExamCycle.create({ ...values, createdBy: req.user.id, updatedBy: req.user.id });
    res.status(201).json(cycle);
  } catch (error) { if (error.code === 11000) error = Object.assign(new Error("That examination year or public link already exists"), { status: 409 }); next(error); }
});

router.put("/admin/cycles/:id", auth, admin, async (req, res, next) => {
  try {
    const cycle = await ExamCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ message: "Examination cycle not found" });
    Object.assign(cycle, cycleInput(req.body), { updatedBy: req.user.id });
    await cycle.save();
    res.json(cycle);
  } catch (error) { next(error); }
});

router.get("/admin/registrations", auth, admin, async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status && ["pending", "approved", "rejected"].includes(req.query.status)) query.status = req.query.status;
    if (req.query.year) {
      const cycle = await ExamCycle.findOne({ year: Number(req.query.year) }).select("_id");
      query.examCycle = cycle?._id || new mongoose.Types.ObjectId();
    }
    if (req.query.search) {
      const regex = new RegExp(escapeRegex(text(req.query.search, 100)), "i");
      query.$or = [{ studentName: regex }, { applicationNumber: regex }, { email: regex }, { mobile: regex }];
    }
    const registrations = await ExamRegistration.find(query).populate("examCycle", "title year slug").sort({ createdAt: -1 }).limit(500)
      .select("applicationNumber studentName fatherName dateOfBirth className mobile email status adminRemarks admitCardStatus rollNumber createdAt examCycle");
    res.json(registrations);
  } catch (error) { next(error); }
});

router.get("/admin/registrations/:id", auth, admin, async (req, res, next) => {
  try {
    const registration = await ExamRegistration.findById(req.params.id).populate("examCycle").select("-normalizedStudentName");
    if (!registration) return res.status(404).json({ message: "Examination registration not found" });
    res.json(registration);
  } catch (error) { next(error); }
});

router.get("/admin/registrations/:id/documents/:kind", auth, admin, async (req, res, next) => {
  try {
    const field = req.params.kind === "photo" ? "photoFile" : req.params.kind === "aadhaar" ? "aadhaarFile" : null;
    if (!field) return res.status(404).json({ message: "Document not found" });
    const registration = await ExamRegistration.findById(req.params.id).select(field);
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    return sendPrivateDocument(res, registration[field], { download: req.query.download === "1" });
  } catch (error) { next(error); }
});

router.post("/admin/registrations/:id/approve", auth, admin, async (req, res, next) => {
  try {
    let registration = await ExamRegistration.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: "approved" } },
      { $set: { status: "approved", adminRemarks: text(req.body.remarks, 1000), reviewedBy: req.user.id, reviewedAt: new Date(), admitCardStatus: "pending_design" } },
      { new: true }
    );
    registration ||= await ExamRegistration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    res.json({ registration, message: "Application approved. Admit Card generation is pending the approved design integration." });
  } catch (error) { next(error); }
});

router.post("/admin/registrations/:id/reject", auth, admin, async (req, res, next) => {
  try {
    const remarks = text(req.body.remarks, 1000);
    if (!remarks) return res.status(400).json({ message: "Please provide a rejection reason" });
    const registration = await ExamRegistration.findByIdAndUpdate(req.params.id, { status: "rejected", adminRemarks: remarks, reviewedBy: req.user.id, reviewedAt: new Date(), admitCardStatus: "not_ready" }, { new: true });
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    res.json(registration);
  } catch (error) { next(error); }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const cycle = await ExamCycle.findOne({ slug: String(req.params.slug).toLowerCase(), status: { $ne: "draft" } });
    if (!cycle) return res.status(404).json({ message: "Examination registration is not available" });
    res.json(publicCycle(cycle));
  } catch (error) { next(error); }
});

const requireOpenCycle = async (req, res, next) => {
  try {
    const cycle = await ExamCycle.findOne({ slug: String(req.params.slug).toLowerCase() });
    const state = cycle ? publicExamState(cycle) : "closed";
    if (!cycle || state !== "open") return res.status(403).json({ message: state === "upcoming" ? `Registration opens on ${cycle.registrationStart.toISOString()}` : "Registration is closed" });
    req.examCycle = cycle;
    next();
  } catch (error) { next(error); }
};

router.post("/:slug/registrations", registrationLimiter, requireOpenCycle, examUpload, async (req, res, next) => {
  let storedDocuments;
  try {
    const cycle = req.examCycle;
    const values = registrationInput(req.body);
    storedDocuments = await uploadExamDocuments(req.files);
    const suffix = require("crypto").randomBytes(4).toString("hex").toUpperCase();
    const registration = await ExamRegistration.create({
      ...values, normalizedStudentName: values.studentName.toLowerCase().replace(/\s+/g, " "), examCycle: cycle._id,
      applicationNumber: `ACE-${cycle.year}-${suffix}`,
      photoFile: storedDocuments.photo, aadhaarFile: storedDocuments.aadhaar,
    });
    res.status(201).json({
      message: "Registration submitted successfully.", studentName: registration.studentName,
      applicationNumber: registration.applicationNumber, examination: cycle.title, status: "PENDING REVIEW",
    });
  } catch (error) {
    if (storedDocuments) await removeExamDocuments([storedDocuments.photo, storedDocuments.aadhaar]);
    if (error.code === 11000) error = Object.assign(new Error("A registration for this student already exists for this examination"), { status: 409 });
    next(error);
  }
});

module.exports = router;

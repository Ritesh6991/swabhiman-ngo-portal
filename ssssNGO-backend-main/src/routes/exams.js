const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const ExamCycle = require("../models/ExamCycle");
const ExamRegistration = require("../models/ExamRegistration");
const { examUpload } = require("../middleware/examUpload");
const { paymentProofUpload } = require("../middleware/paymentProofUpload");
const { uploadExamDocuments, removeExamDocuments, sendPrivateDocument } = require("../services/examDocumentStorage");
const { generateAndStoreAdmitCard, deliverAdmitCard } = require("../services/admitCardService");
const { publicExamState, publicCycle } = require("../services/examState");
const { createExamUpiIntent, submitUpiProof } = require("../services/manualUpiPaymentService");

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
  const examDate = body.examDate ? new Date(body.examDate) : null;
  if (!title || !Number.isInteger(year) || year < 2000 || year > 2200) throw Object.assign(new Error("A valid title and year are required"), { status: 400 });
  if ([registrationStart, registrationEnd].some((date) => Number.isNaN(date.getTime())) || (examDate && Number.isNaN(examDate.getTime()))) throw Object.assign(new Error("Valid registration dates are required"), { status: 400 });
  if (!["draft", "scheduled", "active", "completed", "archived"].includes(status)) throw Object.assign(new Error("Invalid examination status"), { status: 400 });
  const instructions = Array.isArray(body.instructions) ? body.instructions : String(body.instructions || "").split("\n");
  const examDuration = text(body.examDuration, 40);
  const examinationCentre = text(body.examinationCentre, 500);
  const examAddress = text(body.examAddress, 500);
  if (!examDuration) throw Object.assign(new Error("Event duration is required"), { status: 400 });
  const registrationFee = Number(body.registrationFee || 0);
  if (!Number.isFinite(registrationFee) || registrationFee < 0 || registrationFee > 100000) throw Object.assign(new Error("Enter a valid registration fee"), { status: 400 });
  const list = (value, max) => (Array.isArray(value) ? value : String(value || "").split("\n")).map((item) => text(item, max)).filter(Boolean);
  return {
    title, year, slug: slugFor(body.slug || `${year}`), registrationStart, registrationEnd, examDate,
    reportingTime: text(body.reportingTime, 40), examStartTime: text(body.examStartTime, 40),
    examDuration, examinationCentre, examAddress, registrationFee,
    eligibleRegions: list(body.eligibleRegions, 80).slice(0, 30),
    eligibleClassGroups: list(body.eligibleClassGroups, 40).slice(0, 30),
    instructions: instructions.map((item) => text(item, 500)).filter(Boolean).slice(0, 20),
    status, admitCardReleaseAt: body.admitCardReleaseAt ? new Date(body.admitCardReleaseAt) : null,
    announcementEnabled: body.announcementEnabled !== false && body.announcementEnabled !== "false",
    homepageHighlight: body.homepageHighlight !== false && body.homepageHighlight !== "false",
  };
};

const registrationInput = (body) => {
  const values = {
    studentName: text(body.studentName, 150), fatherName: text(body.fatherName, 150),
    dateOfBirth: new Date(body.dateOfBirth), className: text(body.className, 80), region: text(body.region, 80), fullAddress: text(body.fullAddress, 800),
    mobile: text(body.mobile, 20), email: text(body.email, 180).toLowerCase(),
  };
  if (!values.studentName || !values.fatherName || !values.className || !values.region || !values.fullAddress) throw Object.assign(new Error("Please complete every required student field"), { status: 400 });
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
    counts.admitCardsGenerated = await ExamRegistration.countDocuments({ ...match, admitCardStatus: { $in: ["generated", "sent"] } });
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
  } catch (error) { if (error.code === 11000) error = Object.assign(new Error("That public link already exists"), { status: 409 }); next(error); }
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
      .select("applicationNumber studentName fatherName dateOfBirth className region mobile email registrationFee paymentStatus paymentTransactionId status adminRemarks admitCardStatus admitCardDeliveryStatus admitCardDeliveryAttempts admitCardGeneratedAt admitCardSentAt rollNumber createdAt examCycle");
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
    const fields = { photo: "photoFile", aadhaar: "aadhaarFile", signature: "signatureFile" };
    const field = fields[req.params.kind] || null;
    if (!field) return res.status(404).json({ message: "Document not found" });
    const registration = await ExamRegistration.findById(req.params.id).select(field);
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    return sendPrivateDocument(res, registration[field], { download: req.query.download === "1" });
  } catch (error) { next(error); }
});

router.get("/admin/admit-cards", auth, admin, async (req, res, next) => {
  try {
    const query = { status: "approved" };
    if (req.query.year) {
      const cycle = await ExamCycle.findOne({ year: Number(req.query.year) }).select("_id");
      query.examCycle = cycle?._id || new mongoose.Types.ObjectId();
    }
    if (req.query.search) {
      const regex = new RegExp(escapeRegex(text(req.query.search, 100)), "i");
      query.$or = [{ studentName: regex }, { applicationNumber: regex }, { email: regex }];
    }
    const registrations = await ExamRegistration.find(query).populate("examCycle", "title year")
      .sort({ reviewedAt: -1 }).limit(500)
      .select("applicationNumber studentName className email admitCardStatus admitCardDeliveryStatus admitCardDeliveryAttempts admitCardGeneratedAt admitCardSentAt admitCardDeliveryError examCycle reviewedAt");
    res.json(registrations);
  } catch (error) { next(error); }
});

router.get("/admin/registrations/:id/admit-card", auth, admin, async (req, res, next) => {
  try {
    const registration = await ExamRegistration.findById(req.params.id).select("admitCardFile");
    if (!registration?.admitCardFile?.publicId) return res.status(404).json({ message: "Admit Card has not been generated" });
    return sendPrivateDocument(res, registration.admitCardFile, { download: req.query.download === "1" });
  } catch (error) { next(error); }
});

router.post("/admin/registrations/:id/admit-card/generate", auth, admin, async (req, res, next) => {
  try {
    const registration = await ExamRegistration.findById(req.params.id).populate("examCycle");
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    const result = await generateAndStoreAdmitCard(registration);
    res.json({ registration: result.registration, message: "Admit Card generated and stored securely." });
  } catch (error) { next(error); }
});

router.post("/admin/registrations/:id/admit-card/resend", auth, admin, async (req, res, next) => {
  try {
    const registration = await ExamRegistration.findById(req.params.id).populate("examCycle");
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    const delivered = await deliverAdmitCard(registration, { force: true });
    const sent = delivered.admitCardDeliveryStatus === "sent";
    res.status(sent ? 200 : 502).json({
      registration: delivered,
      message: sent ? "Admit Card email sent." : `Admit Card email failed: ${delivered.admitCardDeliveryError}`,
    });
  } catch (error) { next(error); }
});

router.post("/admin/registrations/:id/approve", auth, admin, async (req, res, next) => {
  try {
    const candidate = await ExamRegistration.findById(req.params.id).populate("examCycle");
    if (!candidate) return res.status(404).json({ message: "Registration not found" });
    if (Number(candidate.registrationFee || 0) > 0 && candidate.paymentStatus !== "verified") return res.status(409).json({ message: "Verify the registration fee in Admin Payments before approving this application." });
    if (!candidate.examCycle?.examDate || !candidate.examCycle?.reportingTime || !candidate.examCycle?.examStartTime || !candidate.examCycle?.examinationCentre || !candidate.examCycle?.examAddress) return res.status(409).json({ message: "Set the event date, time and venue in Exam Settings before approval so the Admit Card is accurate." });
    let registration = await ExamRegistration.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: "approved" } },
      { $set: { status: "approved", adminRemarks: text(req.body.remarks, 1000), reviewedBy: req.user.id, reviewedAt: new Date(), admitCardStatus: "not_ready" } },
      { new: true }
    ).populate("examCycle");
    registration ||= await ExamRegistration.findById(req.params.id).populate("examCycle");
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    const delivered = await deliverAdmitCard(registration);
    const sent = delivered.admitCardDeliveryStatus === "sent";
    res.status(sent ? 200 : 502).json({
      registration: delivered,
      message: sent ? "Application approved. Admit Card generated, stored securely and emailed." : `Application approved and Admit Card generated, but email failed: ${delivered.admitCardDeliveryError}`,
    });
  } catch (error) { next(error); }
});

router.post("/admin/registrations/:id/reject", auth, admin, async (req, res, next) => {
  try {
    const remarks = text(req.body.remarks, 1000);
    if (!remarks) return res.status(400).json({ message: "Please provide a rejection reason" });
    const existing = await ExamRegistration.findById(req.params.id).select("admitCardFile");
    const registration = await ExamRegistration.findByIdAndUpdate(req.params.id, {
      status: "rejected", adminRemarks: remarks, reviewedBy: req.user.id, reviewedAt: new Date(),
      admitCardStatus: "not_ready", admitCardFile: null, admitCardPath: "", admitCardDeliveryStatus: "not_started",
    }, { new: true });
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    if (existing?.admitCardFile?.publicId) await removeExamDocuments([existing.admitCardFile]);
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
  let registration;
  try {
    const cycle = req.examCycle;
    const values = registrationInput(req.body);
    if (cycle.eligibleRegions?.length && !cycle.eligibleRegions.includes(values.region)) throw Object.assign(new Error("Registration is not available for the selected city/region."), { status: 400 });
    if (cycle.eligibleClassGroups?.length && !cycle.eligibleClassGroups.includes(values.className)) throw Object.assign(new Error("Registration is not available for the selected class group."), { status: 400 });
    storedDocuments = await uploadExamDocuments(req.files);
    const suffix = require("crypto").randomBytes(4).toString("hex").toUpperCase();
    registration = await ExamRegistration.create({
      ...values, normalizedStudentName: values.studentName.toLowerCase().replace(/\s+/g, " "), examCycle: cycle._id,
      applicationNumber: `ACE-${cycle.year}-${suffix}`,
      registrationFee: Number(cycle.registrationFee || 0), paymentStatus: Number(cycle.registrationFee || 0) > 0 ? "pending" : "not_required",
      photoFile: storedDocuments.photo, aadhaarFile: storedDocuments.aadhaar, signatureFile: storedDocuments.signature,
    });
    const paymentIntent = Number(cycle.registrationFee || 0) > 0 ? await createExamUpiIntent({ registration }) : null;
    res.status(201).json({
      message: "Registration submitted successfully.", studentName: registration.studentName,
      applicationNumber: registration.applicationNumber, examination: cycle.title, status: paymentIntent ? "PAYMENT REQUIRED" : "PENDING REVIEW", paymentIntent,
    });
  } catch (error) {
    if (registration) await ExamRegistration.deleteOne({ _id: registration._id });
    if (storedDocuments) await removeExamDocuments([storedDocuments.photo, storedDocuments.aadhaar, storedDocuments.signature]);
    if (error.code === 11000) error = Object.assign(new Error("A registration for this student already exists for this examination"), { status: 409 });
    next(error);
  }
});

router.post("/payments/:id/proof", registrationLimiter, paymentProofUpload, async (req, res) => {
  try {
    const result = await submitUpiProof({
      transactionId: req.params.id, purpose: "exam", accessToken: req.body.accessToken, file: req.file,
      transactionReference: req.body.transactionReference, paymentDate: req.body.paymentDate,
    });
    res.status(result.duplicate ? 200 : 201).json({ success: true, duplicate: result.duplicate, status: result.transaction.status, state: "PENDING_VERIFICATION" });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : "Registration payment proof could not be submitted.", code: error.code });
  }
});

module.exports = router;

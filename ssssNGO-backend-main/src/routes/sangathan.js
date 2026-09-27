const express = require("express");
const cloudinary = require("cloudinary").v2;
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const SangathanMember = require("../models/SangathanMember");
const { ensureSangathanSeeded } = require("../services/sangathanService");

const router = express.Router();
const sections = new Set(["leadership", "workers"]);

const uploadPhoto = (file) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: "sangathan", resource_type: "image", transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }] },
    (error, result) => error ? reject(error) : resolve(result.secure_url)
  );
  stream.end(file.buffer);
});

const cloudinaryPublicId = (url) => {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  try {
    const parsed = new URL(url);
    const uploadIndex = parsed.pathname.indexOf("/upload/");
    if (uploadIndex === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(uploadIndex + 8).replace(/^v\d+\//, "").replace(/\.[^.]+$/, ""));
  } catch (_error) {
    return null;
  }
};

const cleanMemberInput = (body) => {
  const name = String(body.name || "").trim();
  const role = String(body.role || "").trim();
  const phone = String(body.phone || "").trim();
  const section = String(body.section || "").trim();
  const sortOrder = Number(body.sortOrder || 0);

  if (!name || !role) {
    const error = new Error("Name and designation are required.");
    error.status = 400;
    throw error;
  }
  if (!sections.has(section)) {
    const error = new Error("Please select a valid Sangathan section.");
    error.status = 400;
    throw error;
  }
  if (!Number.isFinite(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
    const error = new Error("Display order must be between 0 and 10000.");
    error.status = 400;
    throw error;
  }

  return { name, role, phone, section, sortOrder };
};

router.get("/", async (_req, res, next) => {
  try {
    await ensureSangathanSeeded();
    const members = await SangathanMember.find().sort({ section: 1, sortOrder: 1, createdAt: 1 });
    res.json(members);
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, admin, upload.single("photo"), async (req, res, next) => {
  try {
    await ensureSangathanSeeded();
    const values = cleanMemberInput(req.body);
    if (req.file) values.imageUrl = await uploadPhoto(req.file);
    values.createdBy = req.user.id;
    values.updatedBy = req.user.id;
    const member = await SangathanMember.create(values);
    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", auth, admin, upload.single("photo"), async (req, res, next) => {
  try {
    await ensureSangathanSeeded();
    const member = await SangathanMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: "Sangathan member not found." });

    const values = cleanMemberInput(req.body);
    if (req.file) {
      values.imageUrl = await uploadPhoto(req.file);
      const previousPublicId = cloudinaryPublicId(member.imageUrl);
      if (previousPublicId) await cloudinary.uploader.destroy(previousPublicId);
    }
    Object.assign(member, values, { updatedBy: req.user.id });
    await member.save();
    res.json(member);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, admin, async (req, res, next) => {
  try {
    await ensureSangathanSeeded();
    const member = await SangathanMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: "Sangathan member not found." });
    const publicId = cloudinaryPublicId(member.imageUrl);
    if (publicId) await cloudinary.uploader.destroy(publicId);
    await member.deleteOne();
    res.json({ success: true, message: "Member removed from the Sangathan page." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

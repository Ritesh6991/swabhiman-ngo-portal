const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.resolve("uploads", "docs");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safeName}`);
  },
});

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
    if (!allowedTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      const error = new Error("Unsupported file type"); error.status = 400; return cb(error);
    }
    cb(null, true);
  },
});

const hasValidSignature = (file) => {
  const header = fs.readFileSync(file.path).subarray(0, 12);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP";
  const isPdf = header.subarray(0, 5).toString() === "%PDF-";
  return { image: isJpeg || isPng || isWebp, document: isJpeg || isPng || isWebp || isPdf };
};

upload.validateMembershipFiles = (req, res, next) => {
  try {
    const photo = req.files?.photo?.[0];
    const aadhaar = req.files?.aadhaar?.[0];
    const pan = req.files?.pan?.[0];
    if (!photo || !aadhaar || !pan) throw new Error("Photo, Aadhaar and PAN documents are required");
    if (!hasValidSignature(photo).image) throw new Error("Member photo must be a valid JPG, PNG or WebP image");
    if (!hasValidSignature(aadhaar).document || !hasValidSignature(pan).document) {
      throw new Error("Identity documents must be valid images or PDF files");
    }
    next();
  } catch (error) {
    Object.values(req.files || {}).flat().forEach((file) => fs.rmSync(file.path, { force: true }));
    res.status(400).json({ message: error.message });
  }
};

module.exports = upload;

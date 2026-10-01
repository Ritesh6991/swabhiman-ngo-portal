const multer = require("multer");
const path = require("path");

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 20 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    const allowed = allowedExtensions.has(extension) && allowedMime.has(file.mimetype) && (file.fieldname !== "photo" || extension !== ".pdf");
    callback(allowed ? null : new Error("Unsupported examination document type"), allowed);
  },
}).fields([{ name: "photo", maxCount: 1 }, { name: "aadhaar", maxCount: 1 }]);

const signature = (buffer) => {
  const header = buffer.subarray(0, 12);
  const image = (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
    || header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP");
  return { image, document: image || header.subarray(0, 5).toString() === "%PDF-" };
};

const examUpload = (req, res, next) => upload(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.message });
  const photo = req.files?.photo?.[0];
  const aadhaar = req.files?.aadhaar?.[0];
  if (!photo || !aadhaar) {
    return res.status(400).json({ message: "Student photograph and Aadhaar Card are required" });
  }
  if (!signature(photo.buffer).image || !signature(aadhaar.buffer).document) {
    return res.status(400).json({ message: "Uploaded document content does not match the allowed file type" });
  }
  next();
});

module.exports = { examUpload, detectExamDocumentContent: signature };

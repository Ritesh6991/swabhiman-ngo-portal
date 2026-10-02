const multer = require("multer");
const path = require("path");

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const detectImageMime = (buffer) => {
  const header = buffer.subarray(0, 12);
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image/jpeg";
  if (header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return "";
};

const isImageContent = (buffer) => Boolean(detectImageMime(buffer));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 20 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype);
    callback(allowed ? null : new Error("Payment proof must be a JPG, PNG or WebP image."), allowed);
  },
}).single("proof");

const paymentProofUpload = (req, res, next) => upload(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.message });
  if (!req.file) return res.status(400).json({ message: "Payment screenshot is required." });
  if (detectImageMime(req.file.buffer) !== req.file.mimetype) {
    return res.status(400).json({ message: "Payment proof content does not match an allowed image type." });
  }
  next();
});

module.exports = { paymentProofUpload, isPaymentProofImage: isImageContent, detectPaymentProofMime: detectImageMime };

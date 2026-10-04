const multer = require("multer");

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const detectLegacyDocumentContent = (buffer) => {
  const header = Buffer.from(buffer || []).subarray(0, 12);
  const image = (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
    || header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP");
  return { image, document: image || header.subarray(0, 5).toString() === "%PDF-" };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, callback) => callback(
    allowedTypes.has(file.mimetype) ? null : Object.assign(new Error("Unsupported file type"), { status: 400 }),
    allowedTypes.has(file.mimetype)
  ),
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "aadhaar", maxCount: 1 },
  { name: "pan", maxCount: 1 },
]);

const validateLegacyDocuments = (req, res, next) => {
  const files = req.files || {};
  const kinds = ["photo", "aadhaar", "pan"].filter((kind) => files[kind]?.[0]);
  if (!kinds.length) return res.status(400).json({ message: "Select at least one missing document" });
  for (const kind of kinds) {
    const valid = detectLegacyDocumentContent(files[kind][0].buffer);
    if ((kind === "photo" && !valid.image) || (kind !== "photo" && !valid.document)) {
      return res.status(400).json({ message: kind === "photo" ? "Photo must be a valid JPG, PNG or WebP image" : `${kind.toUpperCase()} must be a valid image or PDF` });
    }
  }
  req.legacyDocumentKinds = kinds;
  next();
};

module.exports = { legacyDocumentUpload: upload, validateLegacyDocuments, detectLegacyDocumentContent };

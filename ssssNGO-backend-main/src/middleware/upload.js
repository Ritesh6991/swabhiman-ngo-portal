const multer = require("multer");

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 8 * 1024 * 1024, fields: 10 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) return callback(new Error("Only JPEG, PNG, and WebP images are allowed"));
    callback(null, true);
  },
});

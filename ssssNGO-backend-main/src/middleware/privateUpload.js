const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const roots = {
  donation: path.resolve("uploads", "private", "donations"),
  expense: path.resolve("uploads", "private", "expenses"),
};
Object.values(roots).forEach((directory) => fs.mkdirSync(directory, { recursive: true }));

const signatures = (filePath) => {
  const header = fs.readFileSync(filePath).subarray(0, 12);
  const image = (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
    || header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP");
  return { image, document: image || header.subarray(0, 5).toString() === "%PDF-" };
};

const makeUpload = (kind, { imagesOnly = false } = {}) => {
  const storage = multer.diskStorage({
    destination: roots[kind],
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extension}`);
    },
  });
  const middleware = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const allowed = imagesOnly
        ? [".jpg", ".jpeg", ".png", ".webp"]
        : [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
      callback(allowed.includes(extension) ? null : new Error("Unsupported file type"), allowed.includes(extension));
    },
  }).single(kind === "donation" ? "proof" : "voucher");
  return (req, res, next) => middleware(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.message });
    if (!req.file) return next();
    const valid = signatures(req.file.path);
    if ((imagesOnly && !valid.image) || (!imagesOnly && !valid.document)) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(400).json({ message: "Uploaded file content is invalid" });
    }
    next();
  });
};

module.exports = {
  donationProofUpload: makeUpload("donation", { imagesOnly: true }),
  expenseVoucherUpload: makeUpload("expense"),
  privateRoots: roots,
};

const crypto = require("crypto");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const cloudinary = require("../config/cloudinary");

const deliveryType = "authenticated";
const folder = process.env.EXAM_DOCUMENT_FOLDER || "swabhiman/private/exams";

const ensureConfigured = () => {
  const missing = ["CLOUDINARY_NAME", "CLOUDINARY_KEY", "CLOUDINARY_SECRET"].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing private document storage configuration: ${missing.join(", ")}`);
};

const uploadBuffer = (file) => new Promise((resolve, reject) => {
  ensureConfigured();
  const stream = cloudinary.uploader.upload_stream({
    folder,
    public_id: crypto.randomUUID(),
    resource_type: "auto",
    type: deliveryType,
    overwrite: false,
    use_filename: false,
  }, (error, result) => {
    if (error) return reject(error);
    resolve({
      assetId: result.asset_id,
      publicId: result.public_id,
      format: result.format || "",
      resourceType: result.resource_type || "image",
      deliveryType,
      mimeType: file.mimetype,
      originalName: String(file.originalname || "document").slice(0, 180),
      bytes: result.bytes || file.size || file.buffer.length,
    });
  });
  stream.end(file.buffer);
});

const destroyDocument = async (document) => {
  if (!document?.publicId) return;
  await cloudinary.uploader.destroy(document.publicId, {
    resource_type: document.resourceType || "image",
    type: document.deliveryType || deliveryType,
    invalidate: true,
  });
};

const uploadExamDocuments = async (files) => {
  const uploaded = [];
  try {
    const photo = await uploadBuffer(files.photo[0]);
    uploaded.push(photo);
    const aadhaar = await uploadBuffer(files.aadhaar[0]);
    uploaded.push(aadhaar);
    return { photo, aadhaar };
  } catch (error) {
    await Promise.allSettled(uploaded.map(destroyDocument));
    throw error;
  }
};

const removeExamDocuments = async (documents) => {
  await Promise.allSettled((documents || []).filter(Boolean).map(destroyDocument));
};

const privateDownloadUrl = (document, { download = false } = {}) => {
  ensureConfigured();
  if (!document?.publicId || !document?.format) throw Object.assign(new Error("Stored examination document is unavailable"), { status: 404 });
  return cloudinary.utils.private_download_url(document.publicId, document.format, {
    resource_type: document.resourceType || "image",
    type: document.deliveryType || deliveryType,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: download,
  });
};

const sendPrivateDocument = async (res, document, { download = false } = {}) => {
  const response = await fetch(privateDownloadUrl(document, { download }));
  if (!response.ok || !response.body) {
    throw Object.assign(new Error("Stored examination document could not be retrieved"), { status: 502 });
  }
  const filename = String(document.originalName || `document.${document.format}`)
    .replace(/[\r\n"\\/]/g, "_").slice(0, 180);
  res.set({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": document.mimeType || response.headers.get("content-type") || "application/octet-stream",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    "X-Content-Type-Options": "nosniff",
  });
  if (response.headers.get("content-length")) res.set("Content-Length", response.headers.get("content-length"));
  await pipeline(Readable.fromWeb(response.body), res);
};

module.exports = { uploadExamDocuments, removeExamDocuments, privateDownloadUrl, sendPrivateDocument };

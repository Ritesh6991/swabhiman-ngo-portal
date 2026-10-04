const crypto = require("crypto");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const cloudinary = require("../config/cloudinary");

const deliveryType = "authenticated";
const folder = process.env.MEMBERSHIP_LEGACY_DOCUMENT_FOLDER || "swabhiman/private/membership/reuploads";

const ensureConfigured = () => {
  const missing = ["CLOUDINARY_NAME", "CLOUDINARY_KEY", "CLOUDINARY_SECRET"].filter((key) => !process.env[key]);
  if (missing.length) throw Object.assign(new Error("Private document storage is not configured"), { status: 503 });
};

const uploadOne = (file, kind) => new Promise((resolve, reject) => {
  ensureConfigured();
  const stream = cloudinary.uploader.upload_stream({
    folder: `${folder}/${kind}`,
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
      format: result.format || String(file.originalname || "").split(".").pop().toLowerCase(),
      resourceType: result.resource_type || "image",
      deliveryType,
      mimeType: file.mimetype,
      originalName: String(file.originalname || `${kind}-document`).replace(/[\r\n"\\/]/g, "_").slice(0, 180),
      bytes: result.bytes || file.size || file.buffer.length,
    });
  });
  stream.end(file.buffer);
});

const destroyOne = async (document) => {
  if (!document?.publicId) return;
  await cloudinary.uploader.destroy(document.publicId, {
    resource_type: document.resourceType || "image",
    type: document.deliveryType || deliveryType,
    invalidate: true,
  });
};

const uploadLegacyDocuments = async (files, kinds) => {
  const documents = {};
  try {
    for (const kind of kinds) documents[kind] = await uploadOne(files[kind][0], kind);
    return documents;
  } catch (error) {
    await Promise.allSettled(Object.values(documents).map(destroyOne));
    throw error;
  }
};

const privateUrl = (document) => {
  ensureConfigured();
  if (!document?.publicId || !document?.format) throw Object.assign(new Error("Stored document is unavailable"), { status: 404 });
  return cloudinary.utils.private_download_url(document.publicId, document.format, {
    resource_type: document.resourceType || "image",
    type: document.deliveryType || deliveryType,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
  });
};

const sendLegacyDocument = async (res, document) => {
  const response = await fetch(privateUrl(document));
  if (!response.ok || !response.body) throw Object.assign(new Error("Stored document could not be retrieved"), { status: 502 });
  const filename = String(document.originalName || `document.${document.format}`).replace(/[\r\n"\\/]/g, "_").slice(0, 180);
  res.set({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": document.mimeType || response.headers.get("content-type") || "application/octet-stream",
    "Content-Disposition": `inline; filename="${filename}"`,
    "X-Content-Type-Options": "nosniff",
  });
  await pipeline(Readable.fromWeb(response.body), res);
};

module.exports = { uploadLegacyDocuments, destroyLegacyDocuments: (documents) => Promise.allSettled((documents || []).filter(Boolean).map(destroyOne)), sendLegacyDocument };

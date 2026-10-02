const crypto = require("crypto");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const cloudinary = require("../config/cloudinary");

const deliveryType = "authenticated";
const folders = {
  membership: process.env.MEMBERSHIP_PAYMENT_PROOF_FOLDER || "swabhiman/private/payments/membership",
  donation: process.env.DONATION_PAYMENT_PROOF_FOLDER || "swabhiman/private/payments/donation",
};

const ensureConfigured = () => {
  const missing = ["CLOUDINARY_NAME", "CLOUDINARY_KEY", "CLOUDINARY_SECRET"].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing private payment-proof storage configuration: ${missing.join(", ")}`);
};

const uploadPaymentProof = (file, purpose) => new Promise((resolve, reject) => {
  ensureConfigured();
  const stream = cloudinary.uploader.upload_stream({
    folder: folders[purpose],
    public_id: crypto.randomUUID(),
    resource_type: "image",
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
      originalName: String(file.originalname || "payment-proof").slice(0, 180),
      bytes: result.bytes || file.size || file.buffer.length,
    });
  });
  stream.end(file.buffer);
});

const destroyPaymentProof = async (document) => {
  if (!document?.publicId) return;
  await cloudinary.uploader.destroy(document.publicId, {
    resource_type: document.resourceType || "image",
    type: document.deliveryType || deliveryType,
    invalidate: true,
  });
};

const privateDownloadUrl = (document) => {
  ensureConfigured();
  if (!document?.publicId || !document?.format) throw Object.assign(new Error("Stored payment proof is unavailable."), { status: 404 });
  return cloudinary.utils.private_download_url(document.publicId, document.format, {
    resource_type: document.resourceType || "image",
    type: document.deliveryType || deliveryType,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
  });
};

const sendPaymentProof = async (res, document) => {
  const response = await fetch(privateDownloadUrl(document));
  if (!response.ok || !response.body) throw Object.assign(new Error("Stored payment proof could not be retrieved."), { status: 502 });
  const filename = String(document.originalName || `payment-proof.${document.format}`).replace(/[\r\n"\\/]/g, "_").slice(0, 180);
  res.set({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": document.mimeType || response.headers.get("content-type") || "application/octet-stream",
    "Content-Disposition": `inline; filename="${filename}"`,
    "X-Content-Type-Options": "nosniff",
  });
  await pipeline(Readable.fromWeb(response.body), res);
};

module.exports = { uploadPaymentProof, destroyPaymentProof, sendPaymentProof };

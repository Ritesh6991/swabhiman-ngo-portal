const crypto = require("crypto");
const fs = require("fs");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const cloudinary = require("../config/cloudinary");

const deliveryType = "authenticated";

const ensureConfigured = () => {
  const missing = ["CLOUDINARY_NAME", "CLOUDINARY_KEY", "CLOUDINARY_SECRET"].filter((key) => !process.env[key]);
  if (missing.length) throw Object.assign(new Error("Private document storage is not configured"), { status: 503 });
};

const safeName = (value, fallback = "document") => String(value || fallback)
  .replace(/[\r\n"\\/]/g, "_")
  .slice(0, 180);

const createPrivateDocumentStorage = (client = cloudinary, fetchImpl = fetch) => {
  const uploadBuffer = (buffer, {
    folder,
    originalName,
    mimeType = "application/octet-stream",
    publicId = crypto.randomUUID(),
  }) => new Promise((resolve, reject) => {
    ensureConfigured();
    const stream = client.uploader.upload_stream({
      folder,
      public_id: publicId,
      resource_type: "auto",
      type: deliveryType,
      overwrite: false,
      use_filename: false,
    }, (error, result) => {
      if (error) return reject(error);
      resolve({
        assetId: result.asset_id || "",
        publicId: result.public_id,
        format: result.format || String(originalName || "").split(".").pop().toLowerCase(),
        resourceType: result.resource_type || "raw",
        deliveryType,
        mimeType,
        originalName: safeName(originalName),
        bytes: result.bytes || buffer.length,
      });
    });
    stream.end(buffer);
  });

  const uploadFile = async (filePath, options) => {
    const buffer = await fs.promises.readFile(filePath);
    return uploadBuffer(buffer, options);
  };

  const destroy = async (document) => {
    if (!document?.publicId) return;
    await client.uploader.destroy(document.publicId, {
      resource_type: document.resourceType || "image",
      type: document.deliveryType || deliveryType,
      invalidate: true,
    });
  };

  const privateUrl = (document, ttlSeconds = 5 * 60) => {
    ensureConfigured();
    if (!document?.publicId || !document?.format) {
      throw Object.assign(new Error("Stored document is unavailable"), { status: 404 });
    }
    return client.utils.private_download_url(document.publicId, document.format, {
      resource_type: document.resourceType || "image",
      type: document.deliveryType || deliveryType,
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    });
  };

  const download = async (document) => {
    const response = await fetchImpl(privateUrl(document));
    if (!response.ok) throw Object.assign(new Error("Stored document could not be retrieved"), { status: 502 });
    return Buffer.from(await response.arrayBuffer());
  };

  const send = async (res, document, { disposition = "inline", filename } = {}) => {
    const response = await fetchImpl(privateUrl(document));
    if (!response.ok || !response.body) {
      throw Object.assign(new Error("Stored document could not be retrieved"), { status: 502 });
    }
    const outputName = safeName(filename || document.originalName || `document.${document.format}`);
    res.set({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": document.mimeType || response.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${outputName}"`,
      "X-Content-Type-Options": "nosniff",
    });
    await pipeline(Readable.fromWeb(response.body), res);
  };

  return { uploadBuffer, uploadFile, destroy, privateUrl, download, send };
};

module.exports = { ...createPrivateDocumentStorage(), createPrivateDocumentStorage, deliveryType };

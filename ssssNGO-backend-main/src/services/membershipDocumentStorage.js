const storage = require("./privateDocumentStorage");

const sourceFolder = process.env.MEMBERSHIP_DOCUMENT_FOLDER || "swabhiman/private/membership/applications";
const generatedFolder = process.env.MEMBERSHIP_GENERATED_DOCUMENT_FOLDER || "swabhiman/private/membership/generated";

const uploadApplicationDocuments = async (files) => {
  const uploaded = {};
  try {
    for (const kind of ["photo", "aadhaar", "pan"]) {
      const file = files?.[kind]?.[0];
      if (!file) continue;
      uploaded[kind] = await storage.uploadBuffer(file.buffer, {
        folder: `${sourceFolder}/${kind}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
      });
    }
    return uploaded;
  } catch (error) {
    await Promise.allSettled(Object.values(uploaded).map(storage.destroy));
    throw error;
  }
};

const uploadGeneratedPdf = (filePath, kind, filename) => storage.uploadFile(filePath, {
  folder: `${generatedFolder}/${kind}`,
  originalName: filename,
  mimeType: "application/pdf",
});

module.exports = {
  uploadApplicationDocuments,
  uploadGeneratedPdf,
  destroyDocuments: (documents) => Promise.allSettled((documents || []).filter(Boolean).map(storage.destroy)),
  downloadDocument: storage.download,
  sendDocument: storage.send,
};

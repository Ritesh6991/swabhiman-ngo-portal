const path = require("path");
const fs = require("fs");

const kinds = ["photo", "aadhaar", "pan"];
const fileFields = { photo: "photoFile", aadhaar: "aadhaarFile", pan: "panFile" };
const documentFields = { photo: "photoDocument", aadhaar: "aadhaarDocument", pan: "panDocument" };

const legacyFileExists = (request, kind, root = path.resolve("uploads", "docs")) => {
  const filename = request?.[fileFields[kind]];
  return Boolean(filename && path.basename(filename) === filename && fs.existsSync(path.join(root, filename)));
};

const documentState = (request, pendingSubmission = null, root) => Object.fromEntries(kinds.map((kind) => {
  const durable = Boolean(request?.[documentFields[kind]]?.publicId);
  const legacy = legacyFileExists(request, kind, root);
  const pending = Boolean(
    pendingSubmission?.documents?.[kind]?.publicId
    || pendingSubmission?.submittedKinds?.map(String).includes(kind)
  );
  return [kind, {
    available: durable || legacy,
    source: durable ? "private_storage" : legacy ? "legacy_file" : "missing",
    pending,
    canSubmit: !durable && !legacy && !pending,
  }];
}));

module.exports = { kinds, fileFields, documentFields, legacyFileExists, documentState };

const mongoose = require("mongoose");

const legacyDocumentAuditSchema = new mongoose.Schema({
  membershipRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "MembershipRequest", required: true, index: true },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "LegacyDocumentSubmission", default: null, index: true },
  actorId: { type: String, required: true },
  actorRole: { type: String, enum: ["user", "admin", "owner", "system"], required: true },
  action: { type: String, enum: ["submitted", "viewed", "verified", "rejected"], required: true, index: true },
  documentKinds: [{ type: String, enum: ["photo", "aadhaar", "pan"] }],
  note: { type: String, default: "", maxlength: 500 },
}, { timestamps: true });

module.exports = mongoose.model("LegacyDocumentAudit", legacyDocumentAuditSchema);

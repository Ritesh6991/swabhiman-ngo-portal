const mongoose = require("mongoose");

const storedDocumentSchema = new mongoose.Schema({
  assetId: { type: String, default: "" },
  publicId: { type: String, required: true },
  format: { type: String, required: true },
  resourceType: { type: String, default: "image" },
  deliveryType: { type: String, default: "authenticated" },
  mimeType: { type: String, required: true },
  originalName: { type: String, default: "document" },
  bytes: { type: Number, default: 0 },
}, { _id: false });

const legacyDocumentSubmissionSchema = new mongoose.Schema({
  membershipRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "MembershipRequest", required: true, index: true },
  userId: { type: String, required: true, index: true },
  documents: {
    photo: { type: storedDocumentSchema, default: null },
    aadhaar: { type: storedDocumentSchema, default: null },
    pan: { type: storedDocumentSchema, default: null },
  },
  submittedKinds: [{ type: String, enum: ["photo", "aadhaar", "pan"] }],
  status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending", index: true },
  membershipStatusSnapshot: { type: String, enum: ["pending", "approved", "rejected"], required: true },
  memberIdSnapshot: { type: String, default: "" },
  reviewedBy: { type: String, default: "" },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: "", maxlength: 500 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

legacyDocumentSubmissionSchema.index(
  { membershipRequestId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

module.exports = mongoose.model("LegacyDocumentSubmission", legacyDocumentSubmissionSchema);

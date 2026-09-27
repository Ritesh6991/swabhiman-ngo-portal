const mongoose = require("mongoose");

const sangathanMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 50, default: "" },
    imageUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    section: {
      type: String,
      enum: ["leadership", "workers"],
      required: true,
      index: true,
    },
    sortOrder: { type: Number, default: 0, min: 0, max: 10000 },
    legacyKey: { type: String, trim: true, sparse: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

sangathanMemberSchema.index({ section: 1, sortOrder: 1, createdAt: 1 });

module.exports = mongoose.model("SangathanMember", sangathanMemberSchema);

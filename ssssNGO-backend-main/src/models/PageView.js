const mongoose = require("mongoose");

const pageViewSchema = new mongoose.Schema({
  day: { type: String, required: true, index: true },
  path: { type: String, required: true, maxlength: 160 },
  visitorHash: { type: String, required: true, maxlength: 64 },
  device: { type: String, enum: ["mobile", "desktop"], required: true },
}, { timestamps: true });

pageViewSchema.index({ day: 1, visitorHash: 1 });
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

module.exports = mongoose.model("PageView", pageViewSchema);

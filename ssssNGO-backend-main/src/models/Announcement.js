const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  type: { type: String, enum: ["general", "examination", "admit_card", "result", "scholarship", "event"], default: "general" },
  ctaLabel: { type: String, trim: true, maxlength: 40, default: "" },
  ctaLink: { type: String, trim: true, maxlength: 500, default: "" },
  displayStart: { type: Date, required: true },
  displayEnd: { type: Date, required: true },
  priority: { type: Number, min: 0, max: 100, default: 10 },
  placement: { type: String, enum: ["sitewide", "homepage", "both"], default: "sitewide" },
  active: { type: Boolean, default: true, index: true },
  linkedExamCycle: { type: mongoose.Schema.Types.ObjectId, ref: "ExamCycle", default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

announcementSchema.pre("validate", function validateDates() {
  if (this.displayStart && this.displayEnd && this.displayEnd <= this.displayStart) {
    throw new Error("Announcement end must be after its start");
  }
});

module.exports = mongoose.model("Announcement", announcementSchema);

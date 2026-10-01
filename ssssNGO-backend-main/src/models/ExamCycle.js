const mongoose = require("mongoose");

const examCycleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  year: { type: Number, required: true, min: 2000, max: 2200, unique: true, index: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  registrationStart: { type: Date, required: true },
  registrationEnd: { type: Date, required: true },
  examDate: { type: Date, required: true },
  reportingTime: { type: String, required: true, trim: true, maxlength: 40 },
  examStartTime: { type: String, required: true, trim: true, maxlength: 40 },
  examinationCentre: { type: String, required: true, trim: true, maxlength: 500 },
  instructions: [{ type: String, trim: true, maxlength: 500 }],
  status: { type: String, enum: ["draft", "scheduled", "active", "completed", "archived"], default: "draft", index: true },
  admitCardReleaseAt: { type: Date, default: null },
  announcementEnabled: { type: Boolean, default: true },
  homepageHighlight: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

examCycleSchema.pre("validate", function validateDates() {
  if (this.registrationStart && this.registrationEnd && this.registrationEnd <= this.registrationStart) {
    throw new Error("Registration closing date must be after the opening date");
  }
  if (this.registrationEnd && this.examDate && this.examDate < this.registrationEnd) {
    throw new Error("Exam date cannot be before registration closes");
  }
});

module.exports = mongoose.model("ExamCycle", examCycleSchema);

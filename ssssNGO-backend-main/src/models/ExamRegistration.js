const mongoose = require("mongoose");

const examRegistrationSchema = new mongoose.Schema({
  examCycle: { type: mongoose.Schema.Types.ObjectId, ref: "ExamCycle", required: true, index: true },
  applicationNumber: { type: String, required: true, unique: true, index: true },
  studentName: { type: String, required: true, trim: true, maxlength: 150 },
  normalizedStudentName: { type: String, required: true, select: false },
  fatherName: { type: String, required: true, trim: true, maxlength: 150 },
  dateOfBirth: { type: Date, required: true },
  className: { type: String, required: true, trim: true, maxlength: 80 },
  fullAddress: { type: String, required: true, trim: true, maxlength: 800 },
  mobile: { type: String, required: true, trim: true, maxlength: 20 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
  photoFile: { type: String, required: true },
  aadhaarFile: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  adminRemarks: { type: String, trim: true, maxlength: 1000, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  rollNumber: { type: String, default: "" },
  admitCardStatus: { type: String, enum: ["not_ready", "pending_design", "generated", "sent", "failed"], default: "not_ready" },
  admitCardPath: { type: String, default: "" },
  admitCardGeneratedAt: { type: Date, default: null },
  admitCardDeliveryStatus: { type: String, enum: ["not_started", "pending", "sent", "failed"], default: "not_started" },
}, { timestamps: true });

examRegistrationSchema.index(
  { examCycle: 1, normalizedStudentName: 1, dateOfBirth: 1 },
  { unique: true, name: "one_student_per_exam_cycle" }
);

module.exports = mongoose.model("ExamRegistration", examRegistrationSchema);

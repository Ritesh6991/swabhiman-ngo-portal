const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  changedAt: { type: Date, default: Date.now },
  previous: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  expenseDate: { type: Date, required: true, index: true },
  category: { type: String, required: true, trim: true, maxlength: 80, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  paidTo: { type: String, required: true, trim: true, maxlength: 160 },
  paymentMethod: { type: String, required: true, trim: true, maxlength: 60 },
  transactionReference: { type: String, trim: true, maxlength: 120, default: "" },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  notes: { type: String, trim: true, maxlength: 2000, default: "" },
  voucherFile: { type: String, default: "" },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updateHistory: { type: [historySchema], default: [] },
  archivedAt: { type: Date, default: null },
}, { timestamps: true });

expenseSchema.index({ category: "text", paidTo: "text", description: "text", notes: "text" });

module.exports = mongoose.model("Expense", expenseSchema);

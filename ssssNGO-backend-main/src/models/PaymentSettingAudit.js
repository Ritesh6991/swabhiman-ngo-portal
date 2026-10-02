const mongoose = require("mongoose");

const paymentSettingAuditSchema = new mongoose.Schema({
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  changes: [{
    setting: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  }],
}, { timestamps: true });

module.exports = mongoose.model("PaymentSettingAudit", paymentSettingAuditSchema);

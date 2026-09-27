const mongoose = require("mongoose");

const deliveryLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    membershipRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipRequest",
      required: true,
      unique: true,
    },
    recipient: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "generated", "sent", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    providerMessageId: { type: String, default: "" },
    lastError: { type: String, default: "" },
    idCardPath: { type: String, default: "" },
    certificatePath: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryLog", deliveryLogSchema);

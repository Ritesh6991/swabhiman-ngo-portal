const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    purpose: { type: String, enum: ["membership", "donation"], required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    membershipRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipRequest",
      default: null,
    },
    donor: {
      name: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      phone: { type: String, trim: true, default: "" },
    },
    provider: { type: String, required: true },
    verificationType: { type: String, enum: ["gateway", "manual"], default: "gateway", index: true },
    currency: { type: String, default: "INR" },
    baseAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 1 },
    taxLabel: { type: String, default: "" },
    taxRate: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["created", "pending", "verified", "failed", "cancelled", "rejected"],
      default: "created",
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ["not_applicable", "pending", "processing", "complete", "failed"],
      default: "not_applicable",
    },
    idempotencyKey: { type: String, required: true, unique: true },
    providerOrderId: { type: String, default: null, index: true },
    providerPaymentId: { type: String, default: null, index: true },
    processedEventIds: { type: [String], default: [] },
    failureReason: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
    proofFile: { type: String, default: "" },
    proofDocument: { type: mongoose.Schema.Types.Mixed, default: null },
    paymentReference: { type: String, default: null },
    paymentAccessTokenHash: { type: String, default: "" },
    configurationVersion: { type: Number, default: null },
    upiSnapshot: {
      upiId: { type: String, default: "" },
      payeeName: { type: String, default: "" },
    },
    paymentDate: { type: Date, default: null },
    paymentMethod: { type: String, trim: true, default: "" },
    transactionReference: { type: String, trim: true, default: "" },
    donorNote: { type: String, trim: true, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: "" },
    receiptNumber: { type: String, default: null },
    receiptPath: { type: String, default: "" },
    receiptDocument: { type: mongoose.Schema.Types.Mixed, default: null },
    receiptIssuedAt: { type: Date, default: null },
    receiptDeliveryStatus: {
      type: String,
      enum: ["not_started", "generated", "sent", "failed"],
      default: "not_started",
    },
    receiptDeliveryAttempts: { type: Number, default: 0 },
    receiptDeliveryError: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

paymentTransactionSchema.index(
  { provider: 1, providerOrderId: 1 },
  { unique: true, partialFilterExpression: { providerOrderId: { $type: "string" } } }
);

paymentTransactionSchema.index(
  { receiptNumber: 1 },
  { unique: true, partialFilterExpression: { receiptNumber: { $type: "string" } } }
);

paymentTransactionSchema.index(
  { paymentReference: 1 },
  { unique: true, partialFilterExpression: { paymentReference: { $type: "string" } } }
);

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);

const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    // ================= BASIC =================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      trim: true,
    },

    motherName: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // ================= IDENTITY =================
    aadhaarNumber: {
      type: String,
      trim: true,
    },

    panNumber: {
      type: String,
      trim: true,
    },

    // ================= LOCATION =================
    country: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    pincode: {
      type: String,
      trim: true,
    },

    // ================= INCOME =================
    annualIncome: {
      type: String,
      trim: true,
    },

    incomeSource: {
      type: String,
      trim: true,
    },

    fatherOccupation: {
      type: String,
      trim: true,
    },

    motherOccupation: {
      type: String,
      trim: true,
    },

    // ================= ADDRESS =================
    aadhaarAddress: {
      type: String,
      trim: true,
    },

    currentAddress: {
      type: String,
      trim: true,
    },

    // ================= FAMILY =================
    siblings: {
      type: String,
      trim: true,
    },

    maritalStatus: {
      type: String,
      enum: ["single", "married"],
    },

    wifeName: {
      type: String,
      trim: true,
    },

    children: {
      type: String,
      enum: ["yes", "no"],
    },

    childrenNames: {
      type: String,
      trim: true,
    },

    // ================= MEMBERSHIP =================
    membershipType: {
      type: String,
      enum: ["yearly", "permanent"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["not_started", "pending", "verified", "failed", "cancelled"],
      default: "not_started",
      index: true,
    },

    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
    },

    validTill: {
      type: Date,
      default: null,
    },

    // ================= DOCUMENTS =================
    photoFile: {
      type: String,
      default: "",
    },

    aadhaarFile: {
      type: String,
      default: "",
    },

    panFile: {
      type: String,
      default: "",
    },

    // ================= ID CARD =================
    memberId: {
      type: String,
      default: "",
    },

    qrCode: {
      type: String,
      default: "",
    },

    idCardPath: {
      type: String,
      default: "",
    },

    certificatePath: { type: String, default: "" },

    emailDeliveryStatus: {
      type: String,
      enum: ["pending", "generated", "sent", "failed"],
      default: "pending",
    },

    // ================= APPROVAL =================
    approvedBy: {
      type: String,
      default: "",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // ================= STATUS =================
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MembershipRequest", membershipSchema);

const PaymentTransaction = require("../models/PaymentTransaction");

const allowedMethods = new Set(["upi", "bank_transfer", "cash", "cheque", "other"]);

const normaliseManualApproval = ({ confirmPayment, paymentMethod, transactionReference, note } = {}) => {
  if (confirmPayment !== true) {
    const error = new Error("Confirm that the membership payment was received before approval.");
    error.status = 400;
    throw error;
  }

  const method = String(paymentMethod || "").trim().toLowerCase();
  if (!allowedMethods.has(method)) {
    const error = new Error("Select a valid payment method.");
    error.status = 400;
    throw error;
  }

  const reference = String(transactionReference || "").trim().slice(0, 160);
  if (method !== "cash" && reference.length < 3) {
    const error = new Error("Enter the UTR, cheque number, or payment reference.");
    error.status = 400;
    throw error;
  }

  return {
    paymentMethod: method,
    transactionReference: reference,
    note: String(note || "").trim().slice(0, 500),
  };
};

const confirmManualMembershipPayment = async ({ request, adminId, approval }) => {
  const details = normaliseManualApproval(approval);
  const amount = Number(request.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error("The membership amount is invalid.");
    error.status = 409;
    throw error;
  }

  const now = new Date();
  const idempotencyKey = `manual-membership:${request._id}`;
  const transaction = await PaymentTransaction.findOneAndUpdate(
    { idempotencyKey },
    {
      $setOnInsert: {
        purpose: "membership",
        userId: request.userId,
        membershipRequestId: request._id,
        provider: "manual_admin",
        verificationType: "manual",
        currency: "INR",
        baseAmount: amount,
        taxAmount: 0,
        totalAmount: amount,
        taxLabel: "",
        taxRate: 0,
        idempotencyKey,
      },
      $set: {
        status: "verified",
        fulfillmentStatus: "pending",
        verifiedAt: now,
        paymentDate: now,
        paymentMethod: details.paymentMethod,
        transactionReference: details.transactionReference,
        donorNote: details.note,
        reviewedBy: adminId,
        reviewedAt: now,
        failureReason: "",
        metadata: {
          source: "admin-membership-approval",
          adminConfirmedPayment: true,
        },
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  request.paymentStatus = "verified";
  request.paymentTransactionId = transaction._id;
  await request.save();
  return transaction;
};

module.exports = { normaliseManualApproval, confirmManualMembershipPayment };

const crypto = require("crypto");
const QRCode = require("qrcode");
const PaymentTransaction = require("../models/PaymentTransaction");
const MembershipRequest = require("../models/MembershipRequest");
const User = require("../models/User");
const { getPaymentConfig } = require("../config/paymentConfig");
const { getPurposePaymentSettings } = require("./paymentSettingsService");
const { uploadPaymentProof, destroyPaymentProof } = require("./paymentProofStorage");

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const stateFor = (transaction) => ({
  created: "AWAITING_PAYMENT",
  pending: "PENDING_VERIFICATION",
  verified: transaction.fulfillmentStatus === "complete" || Boolean(transaction.receiptNumber) ? "FULFILLED" : "VERIFIED",
  rejected: "REJECTED",
  failed: "REJECTED",
  cancelled: "REJECTED",
}[transaction.status] || "AWAITING_PAYMENT");

const validateDonationAmount = (value, minimumAmount) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount < minimumAmount || amount > 10000000) {
    throw Object.assign(new Error(`Donation amount must be between INR ${minimumAmount} and INR 1,00,00,000.`), { status: 400 });
  }
  return Math.round(amount * 100) / 100;
};

const membershipAmountForType = (membershipType, config = getPaymentConfig().membership) => {
  if (membershipType === "yearly") return config.yearlyAmount;
  if (membershipType === "permanent") return config.permanentAmount;
  throw Object.assign(new Error("Invalid membership plan."), { status: 400 });
};

const buildUpiUri = ({ upiId, payeeName, amount, reference, note }) => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tr: reference,
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
};

const publicIntent = async (transaction, accessToken = "") => {
  const uri = buildUpiUri({
    upiId: transaction.upiSnapshot.upiId,
    payeeName: transaction.upiSnapshot.payeeName,
    amount: transaction.totalAmount,
    reference: transaction.paymentReference,
    note: transaction.purpose === "membership" ? "Membership payment" : "Donation",
  });
  return {
    id: transaction._id,
    purpose: transaction.purpose,
    reference: transaction.paymentReference,
    state: stateFor(transaction),
    status: transaction.status,
    currency: transaction.currency,
    amount: transaction.baseAmount,
    totalPayable: transaction.totalAmount,
    payeeName: transaction.upiSnapshot.payeeName,
    upiId: transaction.upiSnapshot.upiId,
    qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 420, errorCorrectionLevel: "M" }),
    accessToken,
  };
};

const requireUpi = async (purpose) => {
  const settings = await getPurposePaymentSettings(purpose);
  if (!settings.upiEnabled || !settings.upiId) {
    throw Object.assign(new Error("Online payment is currently unavailable. Please contact the organisation."), { status: 503 });
  }
  return settings;
};

const createDonationUpiIntent = async ({ name, email, phone, amount }) => {
  const donor = {
    name: String(name || "").trim().slice(0, 160),
    email: String(email || "").trim().toLowerCase().slice(0, 254),
    phone: String(phone || "").trim().slice(0, 30),
  };
  if (donor.name.length < 2 || !/^\S+@\S+\.\S+$/.test(donor.email)) {
    throw Object.assign(new Error("Enter a valid donor name and email address."), { status: 400 });
  }
  const config = getPaymentConfig().donation;
  const validatedAmount = validateDonationAmount(amount, config.minimumAmount);
  const settings = await requireUpi("donation");
  const reference = `DON-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const accessToken = crypto.randomBytes(32).toString("hex");
  const transaction = await PaymentTransaction.create({
    purpose: "donation",
    donor,
    provider: "manual_upi",
    verificationType: "manual",
    currency: "INR",
    baseAmount: validatedAmount,
    taxAmount: 0,
    totalAmount: validatedAmount,
    status: "created",
    fulfillmentStatus: "not_applicable",
    idempotencyKey: `manual-upi-donation:${reference}`,
    paymentReference: reference,
    paymentAccessTokenHash: sha256(accessToken),
    configurationVersion: settings.version,
    upiSnapshot: { upiId: settings.upiId, payeeName: settings.payeeName },
    paymentMethod: "upi",
  });
  return publicIntent(transaction, accessToken);
};

const createMembershipUpiIntent = async ({ userId, membershipRequestId }) => {
  const [user, request, settings] = await Promise.all([
    User.findById(userId).select("joined"),
    MembershipRequest.findOne({ _id: membershipRequestId, userId: String(userId) }),
    requireUpi("membership"),
  ]);
  if (!user || !request) throw Object.assign(new Error("Membership application not found."), { status: 404 });
  if (user.joined || request.status === "approved") throw Object.assign(new Error("This membership is already active."), { status: 409 });
  if (request.status === "rejected") throw Object.assign(new Error("Rejected membership applications cannot be paid."), { status: 409 });
  const amount = membershipAmountForType(request.membershipType);
  if (Number(request.amount) !== Number(amount)) {
    request.amount = amount;
    await request.save();
  }
  const existing = await PaymentTransaction.findOne({
    purpose: "membership", membershipRequestId: request._id, provider: "manual_upi",
    status: "created", configurationVersion: settings.version,
  }).sort({ createdAt: -1 });
  if (existing) return publicIntent(existing);

  const reference = `MEM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const transaction = await PaymentTransaction.create({
    purpose: "membership",
    userId,
    membershipRequestId: request._id,
    provider: "manual_upi",
    verificationType: "manual",
    currency: "INR",
    baseAmount: amount,
    taxAmount: 0,
    totalAmount: amount,
    status: "created",
    fulfillmentStatus: "pending",
    idempotencyKey: `manual-upi-membership:${request._id}:${reference}`,
    paymentReference: reference,
    configurationVersion: settings.version,
    upiSnapshot: { upiId: settings.upiId, payeeName: settings.payeeName },
    paymentMethod: "upi",
  });
  request.paymentStatus = "pending";
  request.paymentTransactionId = transaction._id;
  await request.save();
  return publicIntent(transaction);
};

const submitUpiProof = async ({ transactionId, purpose, userId, accessToken, file, transactionReference, paymentDate }) => {
  const transaction = await PaymentTransaction.findOne({ _id: transactionId, purpose, provider: "manual_upi" });
  if (!transaction) throw Object.assign(new Error("Payment attempt not found."), { status: 404 });
  if (purpose === "membership" && String(transaction.userId) !== String(userId)) {
    throw Object.assign(new Error("Payment attempt not found."), { status: 404 });
  }
  if (purpose === "donation" && (!accessToken || sha256(accessToken) !== transaction.paymentAccessTokenHash)) {
    throw Object.assign(new Error("Payment attempt access is invalid."), { status: 403 });
  }
  if (transaction.status !== "created") {
    if (transaction.status === "pending") return { duplicate: true, transaction };
    throw Object.assign(new Error("This payment attempt can no longer accept proof."), { status: 409 });
  }
  const settings = await requireUpi(purpose);
  if (transaction.configurationVersion !== settings.version
    || transaction.upiSnapshot.upiId !== settings.upiId
    || transaction.upiSnapshot.payeeName !== settings.payeeName) {
    throw Object.assign(new Error("Payment settings changed before proof was submitted. Start a new payment attempt and use the new QR."), { status: 409, code: "STALE_PAYMENT_INTENT" });
  }
  const reference = String(transactionReference || "").trim().slice(0, 120);
  if (reference.length < 3) throw Object.assign(new Error("Enter the UTR or transaction reference."), { status: 400 });
  const paidAt = new Date(paymentDate);
  if (Number.isNaN(paidAt.getTime()) || paidAt > new Date()) throw Object.assign(new Error("Enter a valid payment date."), { status: 400 });

  const proofDocument = await uploadPaymentProof(file, purpose);
  try {
    const updated = await PaymentTransaction.findOneAndUpdate(
      { _id: transaction._id, status: "created" },
      { $set: {
        status: "pending",
        proofDocument,
        paymentDate: paidAt,
        transactionReference: reference,
      } },
      { new: true }
    );
    if (!updated) {
      await destroyPaymentProof(proofDocument);
      const latest = await PaymentTransaction.findById(transaction._id);
      return { duplicate: true, transaction: latest };
    }
    return { duplicate: false, transaction: updated };
  } catch (error) {
    await destroyPaymentProof(proofDocument);
    throw error;
  }
};

module.exports = {
  buildUpiUri,
  createDonationUpiIntent,
  createMembershipUpiIntent,
  membershipAmountForType,
  publicIntent,
  stateFor,
  submitUpiProof,
  validateDonationAmount,
};

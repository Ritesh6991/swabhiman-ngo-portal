const crypto = require("crypto");
const PaymentTransaction = require("../models/PaymentTransaction");
const MembershipRequest = require("../models/MembershipRequest");
const User = require("../models/User");
const { getPaymentConfig, calculateTax } = require("../config/paymentConfig");
const { createProvider } = require("../payments/providerFactory");
const { activateMembership } = require("./membershipActivationService");
const { issueDonationReceipt } = require("./donationReceiptService");
const { getPurposePaymentSettings } = require("./paymentSettingsService");

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

const publicTransaction = (transaction, checkout = null) => ({
  id: transaction._id,
  purpose: transaction.purpose,
  provider: transaction.provider,
  currency: transaction.currency,
  baseAmount: transaction.baseAmount,
  taxAmount: transaction.taxAmount,
  totalAmount: transaction.totalAmount,
  taxLabel: transaction.taxLabel,
  taxRate: transaction.taxRate,
  status: transaction.status,
  checkout,
});

async function createProviderOrder(transaction, config) {
  const provider = createProvider(config);
  const result = await provider.createPayment({
    amountPaise: toPaise(transaction.totalAmount),
    currency: transaction.currency,
    receipt: transaction._id.toString(),
    notes: { purpose: transaction.purpose, transactionId: transaction._id.toString() },
  });
  transaction.providerOrderId = result.providerOrderId;
  transaction.status = "pending";
  await transaction.save();
  return publicTransaction(transaction, result.checkout);
}

async function createTransactionOnce(fields) {
  try {
    return { transaction: await PaymentTransaction.create(fields), created: true };
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await PaymentTransaction.findOne({ idempotencyKey: fields.idempotencyKey });
    if (!existing) throw error;
    return { transaction: existing, created: false };
  }
}

async function createMembershipPayment({ userId, membershipRequestId }) {
  const user = await User.findById(userId).select("joined");
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (user.joined) {
    const error = new Error("This account already has an active membership");
    error.status = 409;
    throw error;
  }
  const request = await MembershipRequest.findOne({ _id: membershipRequestId, userId: String(userId) });
  if (!request) {
    const error = new Error("Membership request not found");
    error.status = 404;
    throw error;
  }
  if (request.status === "rejected") {
    const error = new Error("Rejected membership requests cannot be paid");
    error.status = 400;
    throw error;
  }

  const runtime = await getPurposePaymentSettings("membership");
  if (!runtime.gatewayEnabled || !runtime.credentialsConfigured) {
    throw Object.assign(new Error("Payment gateway is currently unavailable. Use an enabled payment method."), { status: 503 });
  }
  const config = { ...getPaymentConfig().membership, provider: runtime.provider };
  const baseAmount = request.membershipType === "permanent"
    ? config.permanentAmount
    : config.yearlyAmount;
  const taxAmount = calculateTax(baseAmount, config.tax);
  const idempotencyKey = `membership:${request._id}`;

  let transaction = await PaymentTransaction.findOne({ idempotencyKey });
  if (transaction) return publicTransaction(transaction);

  const createdResult = await createTransactionOnce({
    purpose: "membership",
    userId,
    membershipRequestId: request._id,
    provider: config.provider,
    currency: config.currency,
    baseAmount,
    taxAmount,
    totalAmount: baseAmount + taxAmount,
    taxLabel: config.tax.enabled ? config.tax.label : "",
    taxRate: config.tax.enabled ? config.tax.rate : 0,
    status: "created",
    fulfillmentStatus: "pending",
    idempotencyKey,
  });
  transaction = createdResult.transaction;
  if (!createdResult.created) return publicTransaction(transaction);
  if (transaction.providerOrderId) return publicTransaction(transaction);

  request.amount = baseAmount;
  request.paymentStatus = "pending";
  request.paymentTransactionId = transaction._id;
  await request.save();
  return createProviderOrder(transaction, config);
}

async function createDonationPayment({ name, email, phone, amount, idempotencyKey }) {
  const runtime = await getPurposePaymentSettings("donation");
  if (!runtime.gatewayEnabled || !runtime.credentialsConfigured) {
    throw Object.assign(new Error("Payment gateway is currently unavailable. Use an enabled payment method."), { status: 503 });
  }
  const config = { ...getPaymentConfig().donation, provider: runtime.provider };
  const baseAmount = Number(amount);
  if (!Number.isFinite(baseAmount) || baseAmount < config.minimumAmount) {
    const error = new Error(`Minimum donation amount is INR ${config.minimumAmount}`);
    error.status = 400;
    throw error;
  }
  const safeKey = idempotencyKey || `donation:${crypto.randomUUID()}`;
  const existing = await PaymentTransaction.findOne({ idempotencyKey: safeKey });
  if (existing) return publicTransaction(existing);
  const taxAmount = calculateTax(baseAmount, config.tax);
  const createdResult = await createTransactionOnce({
    purpose: "donation",
    donor: { name, email, phone },
    provider: config.provider,
    currency: config.currency,
    baseAmount,
    taxAmount,
    totalAmount: baseAmount + taxAmount,
    taxLabel: config.tax.enabled ? config.tax.label : "",
    taxRate: config.tax.enabled ? config.tax.rate : 0,
    status: "created",
    fulfillmentStatus: "not_applicable",
    idempotencyKey: safeKey,
  });
  const transaction = createdResult.transaction;
  if (!createdResult.created) return publicTransaction(transaction);
  if (transaction.providerOrderId) return publicTransaction(transaction);
  return createProviderOrder(transaction, config);
}

async function markVerified(transaction, providerPaymentId, eventId) {
  if (eventId && transaction.processedEventIds.includes(eventId)) {
    return { duplicate: true, transaction };
  }
  if (eventId) transaction.processedEventIds.push(eventId);
  transaction.providerPaymentId = providerPaymentId || transaction.providerPaymentId;
  transaction.status = "verified";
  transaction.verifiedAt = transaction.verifiedAt || new Date();
  await transaction.save();
  if (transaction.purpose === "membership" && transaction.fulfillmentStatus !== "complete") {
    await activateMembership(transaction);
  }
  if (transaction.purpose === "donation") await issueDonationReceipt(transaction);
  return { duplicate: false, transaction };
}

async function verifyClientPayment({ purpose, transactionId, orderId, paymentId, signature }) {
  const transaction = await PaymentTransaction.findOne({ _id: transactionId, purpose });
  if (!transaction || transaction.providerOrderId !== orderId) {
    const error = new Error("Payment transaction not found");
    error.status = 404;
    throw error;
  }
  const config = { ...getPaymentConfig()[purpose], provider: transaction.provider };
  const provider = createProvider(config);
  if (!provider.verifyClientPayment({ orderId, paymentId, signature })) {
    const error = new Error("Invalid payment signature");
    error.status = 400;
    throw error;
  }
  return markVerified(transaction, paymentId, `client:${paymentId}`);
}

async function processWebhook({ purpose, rawBody, signature, eventId }) {
  const config = getPaymentConfig()[purpose];
  const provider = createProvider(config);
  if (!provider.verifyWebhook(rawBody, signature)) {
    const error = new Error("Invalid webhook signature");
    error.status = 401;
    throw error;
  }
  const payload = JSON.parse(rawBody.toString("utf8"));
  const event = provider.parseWebhook(payload, eventId);
  const transaction = await PaymentTransaction.findOne({
    purpose,
    provider: config.provider,
    providerOrderId: event.providerOrderId,
  });
  if (!transaction) {
    const error = new Error("Payment transaction not found");
    error.status = 404;
    throw error;
  }
  if (
    event.status === "verified" &&
    (Number(event.amountPaise) !== toPaise(transaction.totalAmount) || event.currency !== transaction.currency)
  ) {
    transaction.status = "failed";
    transaction.failureReason = "Provider amount or currency did not match the server transaction";
    transaction.processedEventIds.push(event.eventId);
    await transaction.save();
    const error = new Error("Payment amount validation failed");
    error.status = 400;
    throw error;
  }
  if (transaction.processedEventIds.includes(event.eventId)) {
    return { duplicate: true, transaction };
  }
  if (event.status === "verified") return markVerified(transaction, event.providerPaymentId, event.eventId);
  transaction.processedEventIds.push(event.eventId);
  transaction.status = event.status;
  transaction.failureReason = event.failureReason;
  await transaction.save();
  if (purpose === "membership") {
    await MembershipRequest.findByIdAndUpdate(transaction.membershipRequestId, {
      paymentStatus: event.status,
    });
  }
  return { duplicate: false, transaction };
}

module.exports = {
  createMembershipPayment,
  createDonationPayment,
  verifyClientPayment,
  processWebhook,
  publicTransaction,
};

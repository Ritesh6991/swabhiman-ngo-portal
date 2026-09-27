const fs = require("fs");
const PaymentTransaction = require("../models/PaymentTransaction");
const generateDonationReceipt = require("../utils/generateDonationReceipt");
const sendMail = require("../utils/sendMail");
const escapeHtml = require("../utils/escapeHtml");

const receiptNumberFor = (transaction) => {
  const year = new Date(transaction.verifiedAt || Date.now()).getFullYear();
  return `DON-${year}-${transaction._id.toString().slice(-8).toUpperCase()}`;
};

async function deliverDonationReceipt(transaction, { force = false } = {}) {
  transaction = await ensureDonationReceiptFile(transaction);
  if (!transaction.donor?.email || (transaction.receiptDeliveryStatus === "sent" && !force)) return transaction;
  transaction.receiptDeliveryAttempts += 1;
  try {
    await sendMail({
      to: transaction.donor.email,
      subject: `Donation receipt ${transaction.receiptNumber}`,
      html: `<p>Dear ${escapeHtml(transaction.donor.name || "Donor")},</p><p>Thank you for your contribution. Your verified donation receipt is attached.</p>`,
      attachments: [{ filename: `${transaction.receiptNumber}.pdf`, path: transaction.receiptPath }],
    });
    transaction.receiptDeliveryStatus = "sent";
    transaction.receiptDeliveryError = "";
  } catch (error) {
    transaction.receiptDeliveryStatus = "failed";
    transaction.receiptDeliveryError = String(error.message || error).slice(0, 500);
  }
  await transaction.save();
  return transaction;
}

async function ensureDonationReceiptFile(transaction) {
  if (!transaction.receiptPath || !fs.existsSync(transaction.receiptPath)) {
    transaction.receiptPath = await generateDonationReceipt(transaction);
    if (transaction.receiptDeliveryStatus !== "sent") transaction.receiptDeliveryStatus = "generated";
    await transaction.save();
  }
  return transaction;
}

async function issueDonationReceipt(transaction, options = {}) {
  const claimed = await PaymentTransaction.findOneAndUpdate(
    { _id: transaction._id, purpose: "donation", status: "verified", receiptNumber: null },
    { $set: { receiptNumber: receiptNumberFor(transaction), receiptIssuedAt: new Date() } },
    { new: true }
  );
  transaction = claimed || await PaymentTransaction.findById(transaction._id);
  if (!transaction.receiptNumber) throw new Error("Verified donation receipt could not be claimed");
  return deliverDonationReceipt(transaction, options);
}

module.exports = { receiptNumberFor, issueDonationReceipt, deliverDonationReceipt, ensureDonationReceiptFile };

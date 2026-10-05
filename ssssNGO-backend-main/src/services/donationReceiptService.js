const fs = require("fs");
const PaymentTransaction = require("../models/PaymentTransaction");
const generateDonationReceipt = require("../utils/generateDonationReceipt");
const sendMail = require("../utils/sendMail");
const escapeHtml = require("../utils/escapeHtml");
const storage = require("./privateDocumentStorage");

const receiptFolder = process.env.DONATION_RECEIPT_FOLDER || "swabhiman/private/donations/receipts";

const receiptNumberFor = (transaction) => {
  const year = new Date(transaction.verifiedAt || Date.now()).getFullYear();
  return `DON-${year}-${transaction._id.toString().slice(-8).toUpperCase()}`;
};

async function deliverDonationReceipt(transaction, { force = false } = {}) {
  transaction = await ensureDonationReceiptFile(transaction);
  if (!transaction.donor?.email || (transaction.receiptDeliveryStatus === "sent" && !force)) return transaction;
  transaction.receiptDeliveryAttempts += 1;
  try {
    const receiptContent = await storage.download(transaction.receiptDocument);
    await sendMail({
      to: transaction.donor.email,
      subject: `Donation receipt ${transaction.receiptNumber}`,
      html: `<p>Dear ${escapeHtml(transaction.donor.name || "Donor")},</p><p>Thank you for your contribution. Your verified donation receipt is attached.</p>`,
      attachments: [{ filename: `${transaction.receiptNumber}.pdf`, content: receiptContent }],
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
  if (transaction.receiptDocument?.publicId) return transaction;
  let filePath = transaction.receiptPath;
  let generated = false;
  if (!filePath || !fs.existsSync(filePath)) {
    filePath = await generateDonationReceipt(transaction);
    generated = true;
  }
  try {
    transaction.receiptDocument = await storage.uploadFile(filePath, {
      folder: receiptFolder,
      originalName: `${transaction.receiptNumber}.pdf`,
      mimeType: "application/pdf",
    });
    if (transaction.receiptDeliveryStatus !== "sent") transaction.receiptDeliveryStatus = "generated";
    await transaction.save();
  } finally {
    if (generated) await fs.promises.rm(filePath, { force: true });
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

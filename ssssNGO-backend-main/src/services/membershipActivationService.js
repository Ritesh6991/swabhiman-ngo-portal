const fs = require("fs");
const MembershipRequest = require("../models/MembershipRequest");
const User = require("../models/User");
const DeliveryLog = require("../models/DeliveryLog");
const PaymentTransaction = require("../models/PaymentTransaction");
const generateIdCard = require("../utils/generateIdCard");
const generateCertificate = require("../utils/generateCertificate");
const sendMail = require("../utils/sendMail");
const escapeHtml = require("../utils/escapeHtml");
const path = require("path");

const buildMemberId = (request) => `SVB-${request._id.toString().slice(-8).toUpperCase()}`;

async function deliverMembershipDocuments({ user, request, force = false }) {
  const delivery = await DeliveryLog.findOneAndUpdate(
    { membershipRequestId: request._id },
    {
      $setOnInsert: { userId: user._id, recipient: user.email, status: "pending" },
    },
    { upsert: true, new: true }
  );
  if (delivery.status === "sent" && !force) return delivery;

  const pdfUser = {
    name: request.name,
    fatherName: request.fatherName,
    email: user.email,
    phone: request.phone,
    memberId: user.memberId,
    membershipType: request.membershipType,
    photoFile: request.photoFile,
    approvedAt: request.approvedAt || new Date(),
    validTill: request.validTill,
  };

  let idCardPath = request.idCardPath || user.idCardPath;
  let certificatePath = request.certificatePath || user.certificatePath;
  if (!idCardPath || !fs.existsSync(idCardPath)) idCardPath = await generateIdCard(pdfUser);
  if (!certificatePath || !fs.existsSync(certificatePath)) certificatePath = await generateCertificate(pdfUser);

  delivery.status = "generated";
  delivery.idCardPath = idCardPath;
  delivery.certificatePath = certificatePath;
  delivery.attempts += 1;
  delivery.lastAttemptAt = new Date();
  await delivery.save();

  request.idCardPath = idCardPath;
  request.certificatePath = certificatePath;
  request.emailDeliveryStatus = "generated";
  user.idCardPath = idCardPath;
  user.certificatePath = certificatePath;
  await Promise.all([request.save(), user.save()]);

  try {
    const result = await sendMail({
      to: user.email,
      subject: "Your Swabhiman Shiksha Sanskriti Samajotthan Nyas membership documents",
      html: `<p>Dear ${escapeHtml(request.name)},</p><p>Your membership is now active. Your member ID is <strong>${escapeHtml(user.memberId)}</strong>.</p><p>Your ID card and membership certificate are attached.</p><p>For support, contact ${escapeHtml(process.env.SUPPORT_EMAIL || "swabhimansanskritisamajothan@gmail.com")}.</p>`,
      attachments: [
        { filename: `${user.memberId}-ID-Card.pdf`, path: idCardPath },
        { filename: `${user.memberId}-Certificate.pdf`, path: certificatePath },
      ],
    });
    delivery.status = "sent";
    delivery.sentAt = new Date();
    delivery.providerMessageId = result?.id || "";
    delivery.lastError = "";
    request.emailDeliveryStatus = "sent";
  } catch (error) {
    delivery.status = "failed";
    delivery.lastError = String(error.message || error).slice(0, 500);
    request.emailDeliveryStatus = "failed";
  }
  await Promise.all([delivery.save(), request.save()]);
  return delivery;
}

async function activateMembership(transaction) {
  const claimed = await PaymentTransaction.findOneAndUpdate(
    {
      _id: transaction._id,
      status: "verified",
      fulfillmentStatus: { $in: ["pending", "failed"] },
    },
    { $set: { fulfillmentStatus: "processing", failureReason: "" } },
    { new: true }
  );
  if (!claimed) return PaymentTransaction.findById(transaction._id);
  transaction = claimed;
  try {
    const request = await MembershipRequest.findById(transaction.membershipRequestId);
    const user = request && await User.findById(request.userId);
    if (!request || !user) throw new Error("Membership request or user not found");
    if (transaction.status !== "verified") throw new Error("Payment must be verified before activation");
    const memberPhotoPath = path.resolve("uploads", "docs", request.photoFile || "");
    if (!request.photoFile || !fs.existsSync(memberPhotoPath)) {
      throw new Error("Membership activation requires the applicant's submitted photograph");
    }

    const now = new Date();
    user.joined = true;
    user.memberId = user.memberId || buildMemberId(request);
    user.membershipActivatedAt = user.membershipActivatedAt || now;
    request.memberId = user.memberId;
    request.status = "approved";
    request.paymentStatus = "verified";
    request.approvedAt = request.approvedAt || now;
    request.validTill = request.membershipType === "yearly"
      ? request.validTill || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : null;
    await Promise.all([user.save(), request.save()]);
    await deliverMembershipDocuments({ user, request });
    transaction.fulfillmentStatus = "complete";
    transaction.failureReason = "";
  } catch (error) {
    transaction.fulfillmentStatus = "failed";
    transaction.failureReason = String(error.message || error).slice(0, 500);
    throw error;
  } finally {
    await transaction.save();
  }
  return transaction;
}

module.exports = { activateMembership, deliverMembershipDocuments };

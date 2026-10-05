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
const {
  uploadGeneratedPdf,
  destroyDocuments,
  downloadDocument,
} = require("./membershipDocumentStorage");

const buildMemberId = (request) => `SVB-${request._id.toString().slice(-8).toUpperCase()}`;

async function getMemberPhotoBuffer(request) {
  if (request.photoDocument?.publicId) return downloadDocument(request.photoDocument);
  const memberPhotoPath = path.resolve("uploads", "docs", request.photoFile || "");
  if (request.photoFile && fs.existsSync(memberPhotoPath)) return fs.promises.readFile(memberPhotoPath);
  throw Object.assign(new Error("Membership activation requires the applicant's submitted photograph"), { status: 409 });
}

async function generateAndStorePdf(generator, payload, kind, filename) {
  const temporaryPath = await generator(payload);
  try {
    return await uploadGeneratedPdf(temporaryPath, kind, filename);
  } finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }
}

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

  const photoBuffer = await getMemberPhotoBuffer(request);
  let idCardDocument = request.idCardDocument || user.idCardDocument;
  let certificateDocument = request.certificateDocument || user.certificateDocument;
  const newlyStored = [];
  try {
    // A forced resend rebuilds both PDFs so issued documents use the current
    // approved branding while the previous authenticated assets remain
    // available for rollback until a separate cleanup is authorised.
    if (force || !idCardDocument?.publicId) {
      idCardDocument = await generateAndStorePdf(
        generateIdCard,
        { ...pdfUser, photoBuffer },
        "id-cards",
        `${user.memberId}-ID-Card.pdf`
      );
      newlyStored.push(idCardDocument);
    }
    if (force || !certificateDocument?.publicId) {
      certificateDocument = await generateAndStorePdf(
        generateCertificate,
        pdfUser,
        "certificates",
        `${user.memberId}-Certificate.pdf`
      );
      newlyStored.push(certificateDocument);
    }
  } catch (error) {
    await destroyDocuments(newlyStored);
    throw error;
  }

  delivery.status = "generated";
  delivery.idCardDocument = idCardDocument;
  delivery.certificateDocument = certificateDocument;
  delivery.attempts += 1;
  delivery.lastAttemptAt = new Date();
  await delivery.save();

  request.idCardDocument = idCardDocument;
  request.certificateDocument = certificateDocument;
  request.emailDeliveryStatus = "generated";
  user.idCardDocument = idCardDocument;
  user.certificateDocument = certificateDocument;
  await Promise.all([request.save(), user.save()]);

  try {
    const [idCardContent, certificateContent] = await Promise.all([
      downloadDocument(idCardDocument),
      downloadDocument(certificateDocument),
    ]);
    const result = await sendMail({
      to: user.email,
      subject: "Your Swabhiman Shiksha Sanskriti Samajotthan Nyas membership documents",
      html: `<p>Dear ${escapeHtml(request.name)},</p><p>Your membership is now active. Your member ID is <strong>${escapeHtml(user.memberId)}</strong>.</p><p>Your ID card and membership certificate are attached.</p><p>For support, contact ${escapeHtml(process.env.SUPPORT_EMAIL || "swabhimansanskritisamajothan@gmail.com")}.</p>`,
      attachments: [
        { filename: `${user.memberId}-ID-Card.pdf`, content: idCardContent },
        { filename: `${user.memberId}-Certificate.pdf`, content: certificateContent },
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
    await getMemberPhotoBuffer(request);

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

module.exports = { activateMembership, deliverMembershipDocuments, getMemberPhotoBuffer };

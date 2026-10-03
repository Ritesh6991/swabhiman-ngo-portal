const ExamRegistration = require("../models/ExamRegistration");
const generateAdmitCard = require("../utils/generateAdmitCard");
const sendMail = require("../utils/sendMail");
const escapeHtml = require("../utils/escapeHtml");
const {
  uploadAdmitCard,
  downloadPrivateDocument,
  removeExamDocuments,
} = require("./examDocumentStorage");

const populatedRegistration = (id) => ExamRegistration.findById(id).populate("examCycle");

const generateAndStoreAdmitCard = async (registration) => {
  registration = registration.examCycle?.year ? registration : await populatedRegistration(registration._id);
  if (!registration || registration.status !== "approved") {
    throw Object.assign(new Error("Only approved registrations can receive an Admit Card"), { status: 409 });
  }

  const previous = registration.admitCardFile?.publicId ? registration.admitCardFile.toObject?.() || registration.admitCardFile : null;
  registration.admitCardStatus = "generating";
  registration.admitCardDeliveryError = "";
  await registration.save();

  try {
    const [photoBuffer, signatureBuffer] = await Promise.all([
      downloadPrivateDocument(registration.photoFile),
      registration.signatureFile?.publicId ? downloadPrivateDocument(registration.signatureFile) : null,
    ]);
    const pdf = await generateAdmitCard({ registration, photoBuffer, signatureBuffer });
    const stored = await uploadAdmitCard(pdf, registration.applicationNumber);
    registration.admitCardFile = stored;
    registration.admitCardPath = "";
    registration.admitCardStatus = "generated";
    registration.admitCardGeneratedAt = new Date();
    registration.admitCardDeliveryStatus = "pending";
    await registration.save();
    if (previous) await removeExamDocuments([previous]);
    return { registration, pdf };
  } catch (error) {
    registration.admitCardStatus = "failed";
    registration.admitCardDeliveryStatus = "failed";
    registration.admitCardDeliveryError = String(error.message || error).slice(0, 1000);
    await registration.save();
    throw error;
  }
};

const deliverAdmitCard = async (registration, { force = false, regenerate = false } = {}) => {
  registration = registration.examCycle?.year ? registration : await populatedRegistration(registration._id);
  if (!registration) throw Object.assign(new Error("Registration not found"), { status: 404 });
  if (registration.admitCardDeliveryStatus === "sent" && !force && !regenerate) return registration;

  let pdf;
  if (regenerate || !registration.admitCardFile?.publicId) {
    ({ registration, pdf } = await generateAndStoreAdmitCard(registration));
  } else {
    pdf = await downloadPrivateDocument(registration.admitCardFile);
  }

  registration.admitCardDeliveryAttempts += 1;
  registration.admitCardLastAttemptAt = new Date();
  registration.admitCardDeliveryStatus = "pending";
  await registration.save();

  try {
    const result = await sendMail({
      to: registration.email,
      subject: `${registration.examCycle.title} Admit Card - ${registration.applicationNumber}`,
      html: `<p>Dear ${escapeHtml(registration.studentName)},</p><p>Your application has been approved. Your Admit Card for <strong>${escapeHtml(registration.examCycle.title)}</strong> is attached.</p><p>Registration number: <strong>${escapeHtml(registration.applicationNumber)}</strong></p><p>Please carry a printed copy to the examination centre.</p>`,
      attachments: [{ filename: `${registration.applicationNumber}-Admit-Card.pdf`, content: pdf }],
    });
    registration.admitCardStatus = "sent";
    registration.admitCardDeliveryStatus = "sent";
    registration.admitCardSentAt = new Date();
    registration.admitCardProviderMessageId = result?.id || "";
    registration.admitCardDeliveryError = "";
  } catch (error) {
    registration.admitCardStatus = "failed";
    registration.admitCardDeliveryStatus = "failed";
    registration.admitCardDeliveryError = String(error.message || error).slice(0, 1000);
  }
  await registration.save();
  return registration;
};

module.exports = { generateAndStoreAdmitCard, deliverAdmitCard };

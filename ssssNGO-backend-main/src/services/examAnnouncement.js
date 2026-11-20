const dateLabel = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN") : "To be announced";
};

const listLabel = (values) => (Array.isArray(values) && values.length ? values.join(", ") : "To be announced");

const buildExamAnnouncementMessage = (exam, state) => {
  if (state === "upcoming") return `Registration opens ${dateLabel(exam.registrationStart)}.`;
  if (state === "closed") return "Registrations closed.";

  const fee = Number(exam.registrationFee || 0);
  const details = [
    `Registrations open until ${dateLabel(exam.registrationEnd)}.`,
    fee > 0 ? `Fee: ₹${fee.toLocaleString("en-IN")}.` : "",
    `Classes: ${listLabel(exam.eligibleClassGroups)}.`,
    `Regions: ${listLabel(exam.eligibleRegions)}.`,
    `Duration: ${String(exam.examDuration || "To be announced").trim()}.`,
    `Event schedule: ${exam.examDate ? dateLabel(exam.examDate) : "To be announced"}.`,
  ];
  return details.filter(Boolean).join(" ");
};

module.exports = { buildExamAnnouncementMessage };

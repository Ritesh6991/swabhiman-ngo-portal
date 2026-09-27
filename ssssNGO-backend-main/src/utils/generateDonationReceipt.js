const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const logoPath = [
  path.resolve(rootDir, "src", "assets", "logo.png"),
  path.resolve(rootDir, "uploads", "logo.png"),
].find(fs.existsSync);

const formatDate = (value) => new Date(value || Date.now()).toLocaleDateString("en-IN", {
  day: "2-digit", month: "long", year: "numeric",
});

module.exports = async (transaction) => {
  const outputDir = path.resolve(rootDir, "uploads", "receipts", "donations");
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${transaction.receiptNumber}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `${transaction.receiptNumber} Donation Receipt` } });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FFFDF8");
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).lineWidth(2).strokeColor("#B98A2D").stroke();
  doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(0.6).strokeColor("#071F3E").stroke();
  doc.rect(31, 31, doc.page.width - 62, 116).fill("#071F3E");
  if (logoPath) doc.image(logoPath, 55, 48, { fit: [78, 78], align: "center", valign: "center" });
  doc.fillColor("#FFFFFF").font("Times-Bold").fontSize(23).text("SWABHIMAN", 150, 55, { characterSpacing: 1.6 });
  doc.fillColor("#E1C06C").font("Helvetica-Bold").fontSize(10)
    .text("SHIKSHA SANSKRITI SAMAJOTTHAN NYAS", 150, 89, { characterSpacing: 0.35 });
  doc.fillColor("#FFFFFF").font("Helvetica").fontSize(8.5)
    .text(process.env.ORGANISATION_REGISTERED_ADDRESS || "Delhi, India", 150, 109);

  doc.fillColor("#071F3E").font("Times-Bold").fontSize(29).text("DONATION RECEIPT", 48, 182, {
    width: doc.page.width - 96, align: "center", characterSpacing: 1.2,
  });
  doc.moveTo(165, 226).lineTo(doc.page.width - 165, 226).lineWidth(1).strokeColor("#B98A2D").stroke();

  const rows = [
    ["Receipt number", transaction.receiptNumber],
    ["Donor name", transaction.donor?.name || "Anonymous donor"],
    ["Donation amount", `${transaction.currency || "INR"} ${Number(transaction.baseAmount).toFixed(2)}`],
    ["Payment date", formatDate(transaction.paymentDate || transaction.verifiedAt)],
    ["Receipt date", formatDate(transaction.receiptIssuedAt)],
    ["Payment mode", transaction.paymentMethod || (transaction.verificationType === "manual" ? "QR / UPI" : transaction.provider)],
    ["UTR / Reference", transaction.transactionReference || transaction.providerPaymentId || "Not provided"],
  ];
  let y = 268;
  rows.forEach(([label, value], index) => {
    doc.roundedRect(70, y - 8, doc.page.width - 140, 42, 5).fill(index % 2 ? "#F8F1DF" : "#FFFFFF");
    doc.fillColor("#5C6470").font("Helvetica-Bold").fontSize(9).text(label.toUpperCase(), 84, y + 5, { width: 132 });
    doc.fillColor("#172033").font("Helvetica-Bold").fontSize(11).text(String(value), 220, y + 3, { width: doc.page.width - 315 });
    y += 48;
  });

  const acknowledgement = process.env.DONATION_RECEIPT_ACKNOWLEDGEMENT
    || "We gratefully acknowledge the donation received for the charitable activities of the organisation.";
  doc.fillColor("#172033").font("Helvetica").fontSize(11).text(acknowledgement, 78, 625, {
    width: doc.page.width - 156, align: "center", lineGap: 4,
  });
  doc.moveTo(doc.page.width - 225, 715).lineTo(doc.page.width - 70, 715).strokeColor("#071F3E").stroke();
  doc.fillColor("#071F3E").font("Helvetica-Bold").fontSize(10)
    .text("Authorised Signatory", doc.page.width - 225, 723, { width: 155, align: "center" });
  doc.fillColor("#5C6470").font("Helvetica").fontSize(7.5)
    .text("System-generated acknowledgement. Tax treatment is subject to the organisation's approved legal configuration.", 65, 775, {
      width: doc.page.width - 130, align: "center",
    });

  doc.end();
  await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });
  return filePath;
};

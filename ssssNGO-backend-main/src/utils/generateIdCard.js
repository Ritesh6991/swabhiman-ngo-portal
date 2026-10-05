const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { verificationUrlFor } = require("./membershipVerification");

const ORG_NAME = "Swabhiman Shiksha Sanskriti Samajotthan Nyas";
const BRAND = {
  navy: "#071F3E",
  blue: "#133B63",
  sky: "#F4F0E7",
  gold: "#B98A2D",
  cream: "#FFFDF8",
  ink: "#162238",
  muted: "#667085",
};
const rootDir = path.resolve(__dirname, "..", "..");
const CARD_WIDTH = 153.07;
const CARD_HEIGHT = 283.46;

const findAsset = (candidates) => candidates.map((item) => path.resolve(rootDir, item)).find(fs.existsSync);
const resolvePhoto = (filename) => filename && findAsset([
  path.join("uploads", "docs", path.basename(filename)),
  path.join("src", "uploads", path.basename(filename)),
]);
const logoPath = () => findAsset([path.join("src", "assets", "logo.png"), path.join("uploads", "logo.png")]);
const authorisedSignaturePath = () => findAsset([
  path.join("src", "assets", "id-card-authorised-signature.png"),
  path.join("uploads", "id-card-authorised-signature.png"),
]);

const fitText = (doc, text, maxWidth, preferred, minimum = 6) => {
  let size = preferred;
  while (size > minimum && doc.fontSize(size).widthOfString(String(text)) > maxWidth) size -= 0.25;
  return size;
};

const formatDate = (value, fallback = "Not applicable") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const drawSlot = (doc) => {
  doc.roundedRect(CARD_WIDTH / 2 - 18, 7, 36, 6, 3).fill("#E7E7E7");
  doc.roundedRect(CARD_WIDTH / 2 - 17, 8, 34, 4, 2).fill("#B8BEC5");
};

const drawFront = (doc, member, logo) => {
  doc.rect(0, 0, CARD_WIDTH, CARD_HEIGHT).fill(BRAND.cream);
  doc.roundedRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8, 8).lineWidth(1.2).strokeColor(BRAND.gold).stroke();
  doc.roundedRect(7, 7, CARD_WIDTH - 14, CARD_HEIGHT - 14, 6).lineWidth(0.4).strokeColor("#E4CD8B").stroke();
  doc.roundedRect(8, 8, CARD_WIDTH - 16, 68, 5).fill(BRAND.navy);
  doc.rect(8, 72, CARD_WIDTH - 16, 4).fill(BRAND.gold);
  doc.polygon([CARD_WIDTH - 48, 0], [CARD_WIDTH, 0], [CARD_WIDTH, 76], [CARD_WIDTH - 78, 76]).fillOpacity(0.12).fill("#FFFFFF").fillOpacity(1);
  drawSlot(doc);

  if (logo) doc.image(logo, 12, 24, { fit: [28, 28], align: "center", valign: "center" });
  doc.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(3.7)
    .text("OFFICIAL MEMBER IDENTITY", 44, 20, { width: 96, characterSpacing: 0.55 });
  doc.fillColor("#FFFFFF").font("Times-Bold").fontSize(9.2)
    .text("SWABHIMAN", 50, 36, { width: 90, align: "left", characterSpacing: 0.9 });
  const organisationSubtitle = "SHIKSHA SANSKRITI SAMAJOTTHAN NYAS";
  const organisationSubtitleSize = fitText(doc, organisationSubtitle, 96, 4.1, 3);
  doc.fillColor("#F4E7C2").font("Helvetica-Bold").fontSize(organisationSubtitleSize)
    .text(organisationSubtitle, 44, 49, { width: 96, lineBreak: false, characterSpacing: 0.01 });
  doc.fillColor(BRAND.navy).font("Times-Bold").fontSize(10.5)
    .text("MEMBER ID CARD", 15, 84, { width: CARD_WIDTH - 30, align: "center", characterSpacing: 0.8 });
  doc.moveTo(48, 98).lineTo(CARD_WIDTH - 48, 98).lineWidth(1).strokeColor(BRAND.gold).stroke();

  const photoX = 43;
  const photoY = 104;
  const photoW = 67;
  const photoH = 64;
  doc.roundedRect(photoX - 2, photoY - 2, photoW + 4, photoH + 4, 3).fill(BRAND.navy);
  const photo = Buffer.isBuffer(member.photoBuffer) ? member.photoBuffer : resolvePhoto(member.photoFile);
  if (photo) {
    doc.save().roundedRect(photoX, photoY, photoW, photoH, 1.5).clip();
    doc.image(photo, photoX, photoY, { cover: [photoW, photoH], align: "center", valign: "center" });
    doc.restore();
  } else {
    doc.roundedRect(photoX, photoY, photoW, photoH, 1.5).fill("#E9EEF2");
    doc.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(26)
      .text(String(member.name || "M").charAt(0).toUpperCase(), photoX, photoY + 18, { width: photoW, align: "center" });
    doc.fillColor(BRAND.muted).font("Helvetica").fontSize(5.3)
      .text("PHOTO NOT PROVIDED", photoX, photoY + 52, { width: photoW, align: "center" });
  }

  const name = member.name || "Member";
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(5.5).text("NAME", 18, 174, { characterSpacing: 0.8 });
  doc.font("Helvetica-Bold");
  const nameSize = fitText(doc, name.toUpperCase(), 117, 12, 6);
  doc.fillColor(BRAND.navy).fontSize(nameSize)
    .text(name.toUpperCase(), 18, 182, { width: 117, lineBreak: false });

  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(5.5).text("MEMBER ID", 18, 198, { characterSpacing: 0.8 });
  doc.font("Helvetica-Bold");
  const memberIdSize = fitText(doc, member.memberId || "Pending", 117, 9.5, 6);
  doc.fillColor(BRAND.ink).fontSize(memberIdSize)
    .text(member.memberId || "Pending", 18, 206, { width: 117, lineBreak: false });

  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(5.5).text("EMAIL", 18, 222, { characterSpacing: 0.8 });
  doc.font("Helvetica-Bold");
  const emailSize = fitText(doc, member.email || "Not provided", 117, 7.5, 4.8);
  doc.fillColor(BRAND.ink).fontSize(emailSize)
    .text(member.email || "Not provided", 18, 230, { width: 117, lineBreak: false });

  const membership = member.membershipType === "permanent" ? "Permanent" : "Annual";
  const issueDate = formatDate(member.approvedAt || Date.now());
  doc.moveTo(CARD_WIDTH / 2, 247).lineTo(CARD_WIDTH / 2, 266).strokeColor("#D8C391").lineWidth(0.5).stroke();
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(4.8).text("MEMBERSHIP", 10, 248, { width: 61, align: "center", characterSpacing: 0.5 });
  doc.fillColor(BRAND.ink).font("Helvetica-Bold").fontSize(6).text(membership, 10, 257, { width: 61, align: "center" });
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(4.8).text("ISSUE DATE", 82, 248, { width: 61, align: "center", characterSpacing: 0.5 });
  doc.fillColor(BRAND.ink).font("Helvetica-Bold").fontSize(fitText(doc, issueDate, 59, 6, 4.8)).text(issueDate, 82, 257, { width: 61, align: "center", lineBreak: false });

  doc.path(`M 4 267 L 94 267 L 86 279 L 4 279 Z`).fill(BRAND.navy);
  doc.rect(4, 279, CARD_WIDTH - 8, 0.5).fill(BRAND.gold);
  doc.fillColor("#FFFFFF").font("Helvetica").fontSize(5.8)
    .text("swabhimanshikshasanskriti.in", 9, 271, { width: 78, align: "center", characterSpacing: 0.05 });
};

const drawBack = (doc, member, logo, qr, authorisedSignature) => {
  doc.rect(0, 0, CARD_WIDTH, CARD_HEIGHT).fill(BRAND.sky);
  doc.roundedRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8, 8).lineWidth(1.2).strokeColor(BRAND.gold).stroke();
  doc.roundedRect(7, 7, CARD_WIDTH - 14, CARD_HEIGHT - 14, 6).lineWidth(0.4).strokeColor("#E4CD8B").stroke();
  doc.roundedRect(8, 8, CARD_WIDTH - 16, 68, 5).fill(BRAND.navy);
  doc.rect(8, 72, CARD_WIDTH - 16, 4).fill(BRAND.gold);
  doc.polygon([CARD_WIDTH - 48, 0], [CARD_WIDTH, 0], [CARD_WIDTH, 76], [CARD_WIDTH - 78, 76]).fillOpacity(0.12).fill("#FFFFFF").fillOpacity(1);
  drawSlot(doc);

  if (logo) doc.image(logo, 12, 24, { fit: [28, 28], align: "center", valign: "center" });
  doc.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(3.7)
    .text("OFFICIAL MEMBER IDENTITY", 44, 20, { width: 96, characterSpacing: 0.55 });
  doc.fillColor("#FFFFFF").font("Times-Bold").fontSize(9.2)
    .text("SWABHIMAN", 50, 36, { width: 90, align: "left", characterSpacing: 0.9 });
  const organisationSubtitle = "SHIKSHA SANSKRITI SAMAJOTTHAN NYAS";
  const organisationSubtitleSize = fitText(doc, organisationSubtitle, 96, 4.1, 3);
  doc.fillColor("#F4E7C2").font("Helvetica-Bold").fontSize(organisationSubtitleSize)
    .text(organisationSubtitle, 44, 49, { width: 96, lineBreak: false, characterSpacing: 0.01 });

  doc.fillColor(BRAND.ink).font("Helvetica").fontSize(5.6)
    .text("This identity card remains the property of the organisation. If found, please return it to the address below.", 15, 83, { width: CARD_WIDTH - 30, align: "center", lineGap: 0.7 });
  doc.moveTo(61, 106).lineTo(CARD_WIDTH - 61, 106).strokeColor(BRAND.gold).lineWidth(0.6).stroke();
  doc.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(4.8)
    .text("REGISTERED OFFICE", 15, 111, { width: CARD_WIDTH - 30, align: "center", characterSpacing: 0.45 });
  doc.fillColor(BRAND.ink).font("Helvetica").fontSize(4.7)
    .text("T-135, G.F, Rajpura Gurmandi, Rana Pratap Bagh, North Delhi - 07", 14, 120, { width: CARD_WIDTH - 28, align: "center", lineGap: 0.45 });

  doc.roundedRect(47, 138, 59, 59, 4).fill("#FFFFFF").strokeColor(BRAND.gold).lineWidth(0.8).stroke();
  doc.image(qr, 52, 143, { width: 49, height: 49 });
  doc.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(5.3)
    .text("SCAN TO VERIFY MEMBERSHIP", 20, 200, { width: CARD_WIDTH - 40, align: "center", characterSpacing: 0.55 });

  const membership = member.membershipType === "permanent" ? "Permanent Member" : "Annual Member";
  const validUntil = member.membershipType === "permanent" ? "Lifetime" : formatDate(member.validTill);
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(5).text("MEMBERSHIP", 17, 211, { width: 41 });
  doc.fillColor(BRAND.ink).font("Helvetica-Bold").fontSize(6).text(membership, 58, 210.5, { width: 78 });
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(5).text("VALID UNTIL", 17, 222, { width: 41 });
  doc.fillColor(BRAND.ink).font("Helvetica-Bold").fontSize(6).text(validUntil, 58, 221.5, { width: 78 });

  if (authorisedSignature) {
    doc.image(authorisedSignature, 39, 229, { fit: [75, 18], align: "center", valign: "center" });
  }
  doc.moveTo(25, 249).lineTo(CARD_WIDTH - 25, 249).strokeColor(BRAND.gold).lineWidth(0.6).stroke();
  doc.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(5.7)
    .text("AUTHORISED SIGNATORY", 20, 253, { width: CARD_WIDTH - 40, align: "center", characterSpacing: 0.6 });

  doc.rect(4, 269, CARD_WIDTH - 8, 10).fill(BRAND.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(5.2)
    .text("AUTHORISED MEMBERSHIP ID", 8, 274, { width: CARD_WIDTH - 16, align: "center", characterSpacing: 0.7 });
};

module.exports = async (member) => {
  const outputDir = path.resolve(rootDir, "uploads", "id-cards");
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${member.memberId}.pdf`);
  const doc = new PDFDocument({
    size: [CARD_WIDTH, CARD_HEIGHT],
    margin: 0,
    autoFirstPage: false,
    info: { Title: `${member.memberId} Membership ID Card` },
  });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const verifyUrl = verificationUrlFor(member.memberId);
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 0, errorCorrectionLevel: "M", color: { dark: BRAND.navy } });
  const logo = logoPath();
  const authorisedSignature = authorisedSignaturePath();

  doc.addPage({ size: [CARD_WIDTH, CARD_HEIGHT], margin: 0 });
  drawFront(doc, member, logo);
  doc.addPage({ size: [CARD_WIDTH, CARD_HEIGHT], margin: 0 });
  drawBack(doc, member, logo, qr, authorisedSignature);
  doc.end();

  await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });
  return filePath;
};

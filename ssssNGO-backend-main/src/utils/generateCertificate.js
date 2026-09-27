const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { verificationUrlFor } = require("./membershipVerification");

const ORG_NAME = "Swabhiman Shiksha Sanskriti Samajotthan Nyas";
const BRAND = {
  navy: "#071F3E",
  deepNavy: "#04152A",
  gold: "#B98A2D",
  lightGold: "#E1C06C",
  cream: "#FFFDF8",
  ink: "#172033",
  muted: "#5C6470",
};
const rootDir = path.resolve(__dirname, "..", "..");
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const findLogo = () => [
  path.resolve(rootDir, "src", "assets", "logo.png"),
  path.resolve(rootDir, "uploads", "logo.png"),
].find(fs.existsSync);

const findCertificateSeal = () => [
  path.resolve(rootDir, "src", "assets", "certificate-seal.png"),
  path.resolve(rootDir, "uploads", "certificate-seal.png"),
].find(fs.existsSync);

const findPresidentSignature = () => [
  path.resolve(rootDir, "src", "assets", "president-signature.png"),
  path.resolve(rootDir, "uploads", "president-signature.png"),
].find(fs.existsSync);

const formatDate = (value, fallback = "Not applicable") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

const fitText = (doc, text, maxWidth, preferred, minimum = 14) => {
  let size = preferred;
  while (size > minimum && doc.fontSize(size).widthOfString(String(text)) > maxWidth) size -= 0.5;
  return size;
};

const drawCorner = (doc, x, y, xDirection, yDirection) => {
  const sx = xDirection;
  const sy = yDirection;
  doc.lineWidth(1.4).strokeColor(BRAND.gold)
    .moveTo(x, y + sy * 28).lineTo(x, y).lineTo(x + sx * 28, y).stroke();
  doc.lineWidth(0.65).strokeColor(BRAND.lightGold)
    .moveTo(x + sx * 6, y + sy * 23).lineTo(x + sx * 6, y + sy * 6).lineTo(x + sx * 23, y + sy * 6).stroke();
  doc.circle(x + sx * 7, y + sy * 7, 2.2).fill(BRAND.gold);
};

const drawOrnament = (doc, centerX, y, width = 150) => {
  doc.moveTo(centerX - width / 2, y).lineTo(centerX - 12, y).strokeColor(BRAND.gold).lineWidth(0.7).stroke();
  doc.moveTo(centerX + 12, y).lineTo(centerX + width / 2, y).stroke();
  doc.save().translate(centerX, y).rotate(45).rect(-4, -4, 8, 8).fill(BRAND.gold).restore();
  doc.circle(centerX, y, 2).fill(BRAND.cream);
};

module.exports = async (member) => {
  const outputDir = path.resolve(rootDir, "uploads", "certificates");
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${member.memberId}-certificate.pdf`);
  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margin: 0,
    info: { Title: `${member.memberId} Membership Certificate` },
  });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(BRAND.cream);

  // Premium navy fields inspired by the supplied reference, kept fully vector for sharp printing.
  doc.path(`M 0 0 L 238 0 C 172 28 112 68 66 126 C 34 167 13 211 0 264 Z`).fill(BRAND.deepNavy);
  doc.path(`M ${PAGE_WIDTH} ${PAGE_HEIGHT} L ${PAGE_WIDTH - 220} ${PAGE_HEIGHT} C ${PAGE_WIDTH - 143} ${PAGE_HEIGHT - 34} ${PAGE_WIDTH - 83} ${PAGE_HEIGHT - 91} ${PAGE_WIDTH - 42} ${PAGE_HEIGHT - 166} C ${PAGE_WIDTH - 23} ${PAGE_HEIGHT - 201} ${PAGE_WIDTH - 9} ${PAGE_HEIGHT - 241} ${PAGE_WIDTH} ${PAGE_HEIGHT - 286} Z`).fill(BRAND.navy);
  doc.path(`M 0 274 C 19 196 53 131 110 83 C 156 44 202 20 261 0 L 226 0 C 171 23 123 51 80 91 C 34 134 9 186 0 232 Z`).fill(BRAND.gold);
  doc.path(`M ${PAGE_WIDTH} ${PAGE_HEIGHT - 303} C ${PAGE_WIDTH - 15} ${PAGE_HEIGHT - 220} ${PAGE_WIDTH - 48} ${PAGE_HEIGHT - 150} ${PAGE_WIDTH - 104} ${PAGE_HEIGHT - 91} C ${PAGE_WIDTH - 144} ${PAGE_HEIGHT - 49} ${PAGE_WIDTH - 187} ${PAGE_HEIGHT - 21} ${PAGE_WIDTH - 242} ${PAGE_HEIGHT} L ${PAGE_WIDTH - 208} ${PAGE_HEIGHT} C ${PAGE_WIDTH - 154} ${PAGE_HEIGHT - 26} ${PAGE_WIDTH - 108} ${PAGE_HEIGHT - 57} ${PAGE_WIDTH - 70} ${PAGE_HEIGHT - 101} C ${PAGE_WIDTH - 28} ${PAGE_HEIGHT - 151} ${PAGE_WIDTH - 8} ${PAGE_HEIGHT - 207} ${PAGE_WIDTH} ${PAGE_HEIGHT - 259} Z`).fill(BRAND.gold);

  doc.lineWidth(1.25).strokeColor(BRAND.gold).rect(17, 17, PAGE_WIDTH - 34, PAGE_HEIGHT - 34).stroke();
  doc.lineWidth(0.5).strokeColor(BRAND.lightGold).rect(23, 23, PAGE_WIDTH - 46, PAGE_HEIGHT - 46).stroke();
  drawCorner(doc, 17, 17, 1, 1);
  drawCorner(doc, PAGE_WIDTH - 17, 17, -1, 1);
  drawCorner(doc, 17, PAGE_HEIGHT - 17, 1, -1);
  drawCorner(doc, PAGE_WIDTH - 17, PAGE_HEIGHT - 17, -1, -1);

  const logo = findLogo();
  const certificateSeal = findCertificateSeal() || logo;
  const presidentSignature = findPresidentSignature();
  if (logo) {
    doc.circle(PAGE_WIDTH / 2, 95, 47).fill("#FFFFFF");
    doc.image(logo, PAGE_WIDTH / 2 - 42, 53, { fit: [84, 84], align: "center", valign: "center" });
  }

  doc.fillColor(BRAND.navy).font("Times-Bold").fontSize(27)
    .text("SWABHIMAN", 55, 148, { width: PAGE_WIDTH - 110, align: "center", characterSpacing: 2.1 });
  doc.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(12.5)
    .text("SHIKSHA SANSKRITI SAMAJOTTHAN NYAS", 65, 184, { width: PAGE_WIDTH - 130, align: "center", characterSpacing: 0.75 });
  doc.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(8)
    .text("EDUCATION  |  CULTURE  |  SOCIAL UPLIFTMENT", 70, 207, { width: PAGE_WIDTH - 140, align: "center", characterSpacing: 1.4 });

  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(7.5)
    .text("CERTIFICATE NO.", PAGE_WIDTH - 164, 63, { width: 120, align: "center", characterSpacing: 0.7 });
  doc.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(fitText(doc, member.memberId || "Pending", 120, 10, 7))
    .text(member.memberId || "Pending", PAGE_WIDTH - 164, 76, { width: 120, align: "center", lineBreak: false });
  drawOrnament(doc, PAGE_WIDTH - 104, 96, 90);

  drawOrnament(doc, PAGE_WIDTH / 2, 232, 210);
  doc.fillColor(BRAND.navy).font("Times-Roman").fontSize(38)
    .text("CERTIFICATE", 60, 253, { width: PAGE_WIDTH - 120, align: "center", characterSpacing: 2.2 });
  doc.fillColor(BRAND.gold).font("Times-Bold").fontSize(14)
    .text("OF MEMBERSHIP", 60, 302, { width: PAGE_WIDTH - 120, align: "center", characterSpacing: 3.4 });

  doc.fillColor(BRAND.ink).font("Helvetica").fontSize(11)
    .text("This is to certify that", 70, 348, { width: PAGE_WIDTH - 140, align: "center" });
  const displayName = member.name || "Member";
  doc.fillColor(BRAND.navy).font("Times-BoldItalic").fontSize(fitText(doc, displayName, 450, 36, 22))
    .text(displayName, 72, 375, { width: PAGE_WIDTH - 144, align: "center", lineBreak: false });
  drawOrnament(doc, PAGE_WIDTH / 2, 426, 235);

  const membershipLabel = member.membershipType === "permanent" ? "Permanent Member" : "Annual Member";
  doc.fillColor(BRAND.ink).font("Helvetica").fontSize(10.5)
    .text("has been officially enrolled as a member of", 70, 447, { width: PAGE_WIDTH - 140, align: "center" });
  doc.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(13)
    .text(ORG_NAME, 62, 468, { width: PAGE_WIDTH - 124, align: "center" });

  doc.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(7).text("MEMBER ID", 80, 508, { width: PAGE_WIDTH - 160, align: "center", characterSpacing: 1.1 });
  doc.roundedRect(153, 521, PAGE_WIDTH - 306, 31, 8).fill(BRAND.navy);
  doc.lineWidth(1).strokeColor(BRAND.gold).roundedRect(157, 525, PAGE_WIDTH - 314, 23, 6).stroke();
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(fitText(doc, member.memberId || "Pending", PAGE_WIDTH - 330, 14, 9))
    .text(member.memberId || "Pending", 165, 531, { width: PAGE_WIDTH - 330, align: "center", lineBreak: false });

  const issueDate = formatDate(member.approvedAt || Date.now());
  const validUntil = member.membershipType === "permanent" ? "Lifetime" : formatDate(member.validTill);
  const details = [
    ["ISSUE DATE", issueDate],
    ["VALID UNTIL", validUntil],
    ["MEMBERSHIP TYPE", membershipLabel],
  ];
  details.forEach(([label, value], index) => {
    const x = 55 + index * 170;
    if (index > 0) doc.moveTo(x - 8, 578).lineTo(x - 8, 624).strokeColor(BRAND.gold).lineWidth(0.6).stroke();
    doc.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(7).text(label, x, 581, { width: 145, align: "center", characterSpacing: 0.7 });
    doc.fillColor(BRAND.ink).font("Helvetica-Bold").fontSize(fitText(doc, value, 140, 9.5, 7))
      .text(value, x, 599, { width: 145, align: "center", lineBreak: false });
  });

  const verifyUrl = verificationUrlFor(member.memberId);
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 0, errorCorrectionLevel: "M", color: { dark: BRAND.navy } });
  doc.roundedRect(61, 662, 82, 82, 3).fill("#FFFFFF").strokeColor(BRAND.gold).lineWidth(0.8).stroke();
  doc.image(qr, 68, 669, { width: 68, height: 68 });
  doc.fillColor(BRAND.ink).font("Helvetica-Bold").fontSize(6).text("SCAN TO VERIFY", 53, 751, { width: 98, align: "center", characterSpacing: 0.6 });

  if (certificateSeal) {
    doc.circle(PAGE_WIDTH / 2, 704, 45).fill(BRAND.gold);
    doc.circle(PAGE_WIDTH / 2, 704, 38).fill(BRAND.navy);
    doc.circle(PAGE_WIDTH / 2, 704, 31).fill("#FFFFFF");
    doc.save();
    doc.circle(PAGE_WIDTH / 2, 704, 30).clip();
    doc.image(certificateSeal, PAGE_WIDTH / 2 - 30, 674, { cover: [60, 60], align: "center", valign: "center" });
    doc.restore();
  }

  if (presidentSignature) {
    doc.image(presidentSignature, PAGE_WIDTH - 186, 676, { fit: [126, 34], align: "center", valign: "center" });
  }
  doc.moveTo(PAGE_WIDTH - 190, 714).lineTo(PAGE_WIDTH - 55, 714).strokeColor(BRAND.navy).lineWidth(0.8).stroke();
  doc.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(9)
    .text("President", PAGE_WIDTH - 198, 721, { width: 150, align: "center" });
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(7)
    .text("Swabhiman Shiksha Sanskriti Samajotthan Nyas", PAGE_WIDTH - 198, 736, { width: 150, align: "center" });

  doc.path(`M 0 ${PAGE_HEIGHT - 72} L 330 ${PAGE_HEIGHT - 72} L 306 ${PAGE_HEIGHT - 27} L 0 ${PAGE_HEIGHT - 27} Z`).fill(BRAND.navy);
  doc.fillColor(BRAND.lightGold).font("Helvetica-Bold").fontSize(8)
    .text("EDUCATION  |  CULTURE  |  EMPOWERMENT", 43, PAGE_HEIGHT - 59, { width: 255, characterSpacing: 0.8 });
  doc.fillColor("#FFFFFF").font("Helvetica").fontSize(6.8)
    .text("Building a better society together", 43, PAGE_HEIGHT - 43, { width: 250, characterSpacing: 0.4 });

  doc.end();
  await new Promise((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); });
  return filePath;
};

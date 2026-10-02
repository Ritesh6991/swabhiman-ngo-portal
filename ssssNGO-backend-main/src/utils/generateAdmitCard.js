const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CARD_WIDTH = 263.62;
const CARD_HEIGHT = 374.17;
const LEFT_MARGIN = 28.35;
const TOP_MARGIN = 22.7;
const HORIZONTAL_GAP = 11.35;
const VERTICAL_GAP = 14.15;
const NAVY = "#101B2D";
const rootDir = path.resolve(__dirname, "..", "..");
const templatePath = path.resolve(rootDir, "src", "assets", "admit-card-template.jpg");
const devanagariFontPath = path.resolve(rootDir, "src", "assets", "NotoSansDevanagari-Regular.ttf");

const formatDate = (value) => new Date(value).toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fitText = (doc, value, width, preferred, minimum = 4.5) => {
  let size = preferred;
  while (size > minimum && doc.fontSize(size).widthOfString(String(value || "")) > width) size -= 0.25;
  return size;
};

const normalizePhoto = async (photoBuffer) => sharp(photoBuffer)
  .rotate()
  .resize(420, 570, { fit: "cover", position: "attention" })
  .jpeg({ quality: 92 })
  .toBuffer();

const point = (x, y) => ({ x: x * CARD_WIDTH / 1055, y: y * CARD_HEIGHT / 1493 });
const size = (width, height) => ({ width: width * CARD_WIDTH / 1055, height: height * CARD_HEIGHT / 1493 });

const drawValue = (doc, originX, originY, value, x, y, width, preferred = 8) => {
  const position = point(x, y);
  const box = size(width, 0);
  doc.fillColor(NAVY).font("Times-Bold").fontSize(fitText(doc, value, box.width, preferred))
    .text(String(value || ""), originX + position.x, originY + position.y, {
      width: box.width,
      lineBreak: false,
    });
};

const drawCard = (doc, { x, y, registration, photo }) => {
  const cycle = registration.examCycle;
  doc.image(templatePath, x, y, { width: CARD_WIDTH, height: CARD_HEIGHT });

  const photoPosition = point(840, 69);
  const photoSize = size(139, 198);
  doc.save();
  doc.roundedRect(x + photoPosition.x, y + photoPosition.y, photoSize.width, photoSize.height, 2.2).clip();
  doc.image(photo, x + photoPosition.x, y + photoPosition.y, {
    cover: [photoSize.width, photoSize.height], align: "center", valign: "center",
  });
  doc.restore();

  const titlePosition = point(286, 128);
  const titleSize = size(500, 66);
  doc.rect(x + titlePosition.x, y + titlePosition.y, titleSize.width, titleSize.height).fill("#FFFFFF");
  doc.fillColor(NAVY).font("NotoDevanagari").fontSize(9)
    .text(`वैकल्पिक प्रतियोगी परीक्षा ${cycle.year}`, x + titlePosition.x, y + titlePosition.y + 4, {
      width: titleSize.width, align: "center", lineBreak: false,
    });

  drawValue(doc, x, y, registration.applicationNumber, 326, 335, 659, 7.2);
  drawValue(doc, x, y, registration.studentName, 347, 438, 638, 7.2);
  drawValue(doc, x, y, registration.fatherName, 234, 528, 751, 7);
  drawValue(doc, x, y, formatDate(registration.dateOfBirth), 160, 623, 336, 6.7);
  drawValue(doc, x, y, registration.className, 635, 623, 350, 6.7);
  drawValue(doc, x, y, formatDate(cycle.examDate), 258, 716, 238, 6.5);
  drawValue(doc, x, y, cycle.examStartTime, 756, 716, 229, 6.5);
  drawValue(doc, x, y, cycle.reportingTime, 343, 810, 153, 6.1);
  drawValue(doc, x, y, cycle.examDuration, 756, 810, 229, 6.3);
  drawValue(doc, x, y, cycle.examinationCentre, 395, 910, 590, 6.3);
  drawValue(doc, x, y, cycle.examAddress, 266, 1008, 719, 5.9);
};

module.exports = async ({ registration, photoBuffer }) => {
  const cycle = registration.examCycle;
  const requiredCycleFields = ["examDuration", "examinationCentre", "examAddress"];
  const missing = requiredCycleFields.filter((field) => !String(cycle?.[field] || "").trim());
  if (missing.length) {
    throw Object.assign(new Error(`Complete Admit Card settings before generation: ${missing.join(", ")}`), { status: 422 });
  }
  if (!photoBuffer) throw Object.assign(new Error("Candidate photograph is unavailable"), { status: 422 });
  if (!fs.existsSync(templatePath) || !fs.existsSync(devanagariFontPath)) throw new Error("Admit Card design assets are unavailable");

  const photo = await normalizePhoto(photoBuffer);
  const chunks = [];
  const doc = new PDFDocument({
    size: "A4", layout: "portrait", margin: 0,
    info: { Title: `${registration.applicationNumber} Admit Card - A4 Four Up` },
  });
  doc.on("data", (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont("NotoDevanagari", devanagariFontPath);
  const positions = [
    [LEFT_MARGIN, TOP_MARGIN],
    [LEFT_MARGIN + CARD_WIDTH + HORIZONTAL_GAP, TOP_MARGIN],
    [LEFT_MARGIN, TOP_MARGIN + CARD_HEIGHT + VERTICAL_GAP],
    [LEFT_MARGIN + CARD_WIDTH + HORIZONTAL_GAP, TOP_MARGIN + CARD_HEIGHT + VERTICAL_GAP],
  ];
  positions.forEach(([x, y]) => drawCard(doc, { x, y, registration, photo }));
  doc.end();
  return completed;
};

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const generateAdmitCard = require("../src/utils/generateAdmitCard");

async function main() {
  const photo = await sharp({
    create: { width: 420, height: 520, channels: 3, background: "#eef3f7" },
  }).composite([{ input: Buffer.from('<svg width="420" height="520"><circle cx="210" cy="170" r="82" fill="#8fa6b8"/><path d="M65 505c10-142 91-210 145-210s135 68 145 210" fill="#8fa6b8"/></svg>') }]).png().toBuffer();
  const registration = {
    applicationNumber: "ACE-2026-DEMO001",
    studentName: "Ritesh Pal",
    fatherName: "Demo Parent",
    dateOfBirth: new Date("1996-01-15T00:00:00.000Z"),
    className: "Class 10",
    examCycle: {
      title: "Alternative Competitive Examination 2026",
      year: 2026,
      examDate: new Date("2026-12-20T00:00:00.000Z"),
      examStartTime: "10:00 AM",
      reportingTime: "09:00 AM",
      examDuration: "2 Hours",
      examinationCentre: "Swabhiman Examination Hall",
      examAddress: "T-135, G.F, Rajpura Gurmandi, Rana Pratap Bagh, North Delhi - 07",
    },
  };
  const pdf = await generateAdmitCard({ registration, photoBuffer: photo });
  const outputDir = path.resolve(__dirname, "..", "..", "output", "pdf");
  fs.mkdirSync(outputDir, { recursive: true });
  const output = path.join(outputDir, "admit-card-design-verification.pdf");
  fs.writeFileSync(output, pdf);
  process.stdout.write(output);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

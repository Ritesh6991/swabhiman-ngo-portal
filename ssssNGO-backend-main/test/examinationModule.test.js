const test = require("node:test");
const assert = require("node:assert/strict");
const { publicExamState, publicCycle } = require("../src/services/examState");
const { detectExamDocumentContent } = require("../src/middleware/examUpload");
const generateAdmitCard = require("../src/utils/generateAdmitCard");
const fs = require("fs");
const path = require("path");

const cycle = (overrides = {}) => ({
  _id: "exam-1", title: "Alternative Competitive Examination 2026", year: 2026, slug: "2026",
  registrationStart: new Date("2026-11-01T00:00:00.000Z"), registrationEnd: new Date("2026-11-30T23:59:59.000Z"),
  examDate: new Date("2026-12-20T04:30:00.000Z"), reportingTime: "09:00 AM", examStartTime: "10:00 AM",
  examinationCentre: "Delhi", instructions: [], status: "scheduled", ...overrides,
});

test("annual examination derives upcoming, open and closed states from server dates", () => {
  assert.equal(publicExamState(cycle(), new Date("2026-10-01T00:00:00.000Z")), "upcoming");
  assert.equal(publicExamState(cycle(), new Date("2026-11-15T00:00:00.000Z")), "open");
  assert.equal(publicExamState(cycle(), new Date("2026-12-01T00:00:00.000Z")), "closed");
});

test("draft and archived examinations never accept public registrations", () => {
  assert.equal(publicExamState(cycle({ status: "draft" }), new Date("2026-11-15T00:00:00.000Z")), "draft");
  assert.equal(publicExamState(cycle({ status: "archived" }), new Date("2026-11-15T00:00:00.000Z")), "closed");
});

test("public examination response does not expose admin or private fields", () => {
  const result = publicCycle(cycle({ createdBy: "secret", updatedBy: "secret" }), new Date("2026-11-15T00:00:00.000Z"));
  assert.equal(result.registrationState, "open");
  assert.equal(result.createdBy, undefined);
  assert.equal(result.updatedBy, undefined);
});

test("examination document validation checks file signatures, not only MIME names", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  const pdf = Buffer.from("%PDF-1.7\n");
  const disguised = Buffer.from("not-an-image");
  assert.equal(detectExamDocumentContent(png).image, true);
  assert.equal(detectExamDocumentContent(pdf).document, true);
  assert.equal(detectExamDocumentContent(pdf).image, false);
  assert.deepEqual(detectExamDocumentContent(disguised), { image: false, document: false });
});

test("approved Admit Card design renders as one correctly sized single-card page", async () => {
  const registration = {
    applicationNumber: "ACE-2026-TEST0001",
    studentName: "Ritesh Pal",
    fatherName: "Test Parent",
    dateOfBirth: new Date("1996-01-15T00:00:00.000Z"),
    className: "Class 10",
    examCycle: cycle({
      examDuration: "2 Hours",
      examinationCentre: "Swabhiman Examination Hall",
      examAddress: "T-135, G.F, Rajpura Gurmandi, Rana Pratap Bagh, North Delhi - 07",
    }),
  };
  const photoBuffer = fs.readFileSync(path.resolve(__dirname, "..", "src", "assets", "logo.png"));
  const signatureBuffer = fs.readFileSync(path.resolve(__dirname, "..", "src", "assets", "logo.png"));
  const withoutSignature = await generateAdmitCard({ registration, photoBuffer });
  const pdf = await generateAdmitCard({ registration, photoBuffer, signatureBuffer });
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 20_000);
  assert.match(pdf.toString("latin1"), /\/Count 1\b/);
  assert.match(pdf.toString("latin1"), /\/MediaBox \[0 0 263\.62 374\.17\]/);
  assert.ok(pdf.length > withoutSignature.length, "student signature should be embedded in the Admit Card");
});

const assert = require("node:assert/strict");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const sharp = require("sharp");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const testDatabaseName = `ngo_admit_card_audit_${Date.now()}`;
const withDatabase = (uri, database) => {
  const parsed = new URL(uri);
  parsed.pathname = `/${database}`;
  return parsed.toString();
};

process.env.MONGO_URI = withDatabase(process.env.MONGO_URI, testDatabaseName);
process.env.JWT_SECRET ||= "isolated-admit-card-audit-secret";
process.env.MAIL_PROVIDER = "resend";
process.env.MAIL_FROM_ADDRESS ||= "admin@swabhimanshikshasanskriti.in";
process.env.MAIL_FROM_NAME ||= "Swabhiman Shiksha Sanskriti Samajotthan Nyas";
process.env.EXAM_DOCUMENT_FOLDER = "swabhiman/private/exams/documents";
process.env.EXAM_ADMIT_CARD_FOLDER = "swabhiman/private/exams/admit-cards";

const app = require("../src/app");
const User = require("../src/models/User");
const ExamRegistration = require("../src/models/ExamRegistration");
const { removeExamDocuments } = require("../src/services/examDocumentStorage");

const request = async (base, route, options = {}) => {
  const response = await fetch(`${base}${route}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
};

async function main() {
  let server;
  let registration;
  const report = {};
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const ownerEmail = `owner-${Date.now()}@example.test`;
    const ownerPassword = "AuditPass2026";
    await User.create({ name: "Admit Card Audit Owner", email: ownerEmail, password: await bcrypt.hash(ownerPassword, 12), role: "owner" });
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;

    const login = await request(base, "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
    });
    assert.equal(login.response.status, 200);
    const authorization = `Bearer ${login.body.token}`;

    const now = Date.now();
    const cycle = await request(base, "/api/exams/admin/cycles", {
      method: "POST", headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "[TEST] Alternative Competitive Examination 2026", year: 2198, slug: `secure-audit-${now}`,
        registrationStart: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        registrationEnd: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        examDate: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
        reportingTime: "09:00 AM", examStartTime: "10:00 AM", examDuration: "2 Hours",
        examinationCentre: "Swabhiman Examination Hall",
        examAddress: "T-135, G.F, Rajpura Gurmandi, Rana Pratap Bagh, North Delhi - 07",
        instructions: ["Bring a printed Admit Card."], status: "active",
      }),
    });
    assert.equal(cycle.response.status, 201);

    const photo = await sharp({ create: { width: 480, height: 600, channels: 3, background: "#e8eef3" } })
      .composite([{ input: Buffer.from('<svg width="480" height="600"><circle cx="240" cy="190" r="95" fill="#7890a4"/><path d="M55 590c12-166 108-245 185-245s173 79 185 245" fill="#7890a4"/><text x="240" y="560" text-anchor="middle" font-family="Arial" font-size="22" fill="#102A43">TEST PHOTO</text></svg>') }]).png().toBuffer();
    const aadhaar = await sharp({ create: { width: 900, height: 560, channels: 3, background: "#ffffff" } })
      .composite([{ input: Buffer.from('<svg width="900" height="560"><rect x="12" y="12" width="876" height="536" rx="24" fill="none" stroke="#102A43" stroke-width="8"/><text x="450" y="250" text-anchor="middle" font-family="Arial" font-size="48" fill="#102A43">SECURE STORAGE TEST</text><text x="450" y="320" text-anchor="middle" font-family="Arial" font-size="30" fill="#526B82">NO REAL AADHAAR DATA</text></svg>') }]).png().toBuffer();
    const form = new FormData();
    form.append("studentName", "Ritesh Pal"); form.append("fatherName", "Demo Parent");
    form.append("dateOfBirth", "1996-01-15"); form.append("className", "Class 10");
    form.append("fullAddress", "North Delhi"); form.append("mobile", "9717420311");
    form.append("email", "riteshpal1996@gmail.com");
    form.append("photo", new Blob([photo], { type: "image/png" }), "test-photo.png");
    form.append("aadhaar", new Blob([aadhaar], { type: "image/png" }), "test-aadhaar.png");
    const submitted = await request(base, `/api/exams/${cycle.body.slug}/registrations`, { method: "POST", body: form });
    assert.equal(submitted.response.status, 201);
    report.registration = { status: submitted.response.status, applicationNumber: submitted.body.applicationNumber };

    registration = await ExamRegistration.findOne({ applicationNumber: submitted.body.applicationNumber });
    assert.ok(registration.photoFile.publicId.startsWith("swabhiman/private/exams/documents/"));
    assert.equal(registration.photoFile.deliveryType, "authenticated");
    assert.ok(registration.aadhaarFile.publicId.startsWith("swabhiman/private/exams/documents/"));
    report.privateUploads = "authenticated Cloudinary documents folder";

    const publicBeforeApproval = await request(base, `/api/exams/admin/registrations/${registration._id}/admit-card`);
    assert.equal(publicBeforeApproval.response.status, 401);

    const approved = await request(base, `/api/exams/admin/registrations/${registration._id}/approve`, {
      method: "POST", headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ remarks: "Automated isolated pre-deployment verification" }),
    });
    assert.equal(approved.response.status, 200, approved.body.message);
    assert.equal(approved.body.registration.status, "approved");
    assert.equal(approved.body.registration.admitCardDeliveryStatus, "sent");
    report.approval = approved.body.message;

    registration = await ExamRegistration.findById(registration._id).populate("examCycle");
    assert.ok(registration.admitCardFile.publicId.startsWith("swabhiman/private/exams/admit-cards/"));
    assert.equal(registration.admitCardFile.deliveryType, "authenticated");
    assert.equal(registration.admitCardDeliveryAttempts, 1);
    assert.ok(registration.admitCardProviderMessageId);
    report.firstEmail = { status: registration.admitCardDeliveryStatus, providerMessageIdPresent: true };

    const securedView = await request(base, `/api/exams/admin/registrations/${registration._id}/admit-card`, { headers: { Authorization: authorization } });
    assert.equal(securedView.response.status, 200);
    assert.equal(securedView.body.subarray(0, 5).toString(), "%PDF-");
    assert.match(securedView.body.toString("latin1"), /\/Count 1\b/);
    assert.match(securedView.response.headers.get("cache-control"), /no-store/);
    const publicView = await request(base, `/api/exams/admin/registrations/${registration._id}/admit-card`);
    assert.equal(publicView.response.status, 401);
    report.secureView = { authorized: 200, unauthenticated: 401, pdfBytes: securedView.body.length };

    const list = await request(base, "/api/exams/admin/admit-cards", { headers: { Authorization: authorization } });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].applicationNumber, registration.applicationNumber);
    report.adminInventory = "approved registration listed";

    const resent = await request(base, `/api/exams/admin/registrations/${registration._id}/admit-card/resend`, { method: "POST", headers: { Authorization: authorization } });
    assert.equal(resent.response.status, 200, resent.body.message);
    registration = await ExamRegistration.findById(registration._id);
    assert.equal(registration.admitCardDeliveryStatus, "sent");
    assert.equal(registration.admitCardDeliveryAttempts, 2);
    assert.ok(registration.admitCardProviderMessageId);
    report.resend = { status: "sent", attempts: 2, providerMessageIdPresent: true };

    process.stdout.write(`${JSON.stringify({ ok: true, report }, null, 2)}\n`);
  } finally {
    if (registration) {
      await removeExamDocuments([registration.photoFile, registration.aadhaarFile, registration.admitCardFile]);
    }
    if (mongoose.connection.readyState) await mongoose.connection.dropDatabase();
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message, stack: error.stack }));
  process.exitCode = 1;
});

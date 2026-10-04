const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { detectLegacyDocumentContent } = require("../src/middleware/legacyDocumentUpload");
const { documentState } = require("../src/services/legacyDocumentRecovery");
const MembershipRequest = require("../src/models/MembershipRequest");
const LegacyDocumentSubmission = require("../src/models/LegacyDocumentSubmission");

test("legacy re-upload validation checks signatures and keeps PDFs out of photo slots", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0]);
  const pdf = Buffer.from("%PDF-1.7\n");
  assert.equal(detectLegacyDocumentContent(jpeg).image, true);
  assert.equal(detectLegacyDocumentContent(pdf).document, true);
  assert.equal(detectLegacyDocumentContent(pdf).image, false);
});

test("document status distinguishes existing, durable, pending and missing files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ngo-recovery-"));
  fs.writeFileSync(path.join(root, "photo.jpg"), "legacy");
  const request = { photoFile: "photo.jpg", aadhaarFile: "missing.pdf", panFile: "", panDocument: { publicId: "private/pan" } };
  const pending = { documents: { aadhaar: { publicId: "pending/aadhaar" } } };
  const state = documentState(request, pending, root);
  assert.deepEqual(state.photo, { available: true, source: "legacy_file", pending: false, canSubmit: false });
  assert.deepEqual(state.aadhaar, { available: false, source: "missing", pending: true, canSubmit: false });
  assert.deepEqual(state.pan, { available: true, source: "private_storage", pending: false, canSubmit: false });
  fs.rmSync(root, { recursive: true, force: true });
});

test("membership schema preserves original filenames alongside verified private replacements", () => {
  assert.ok(MembershipRequest.schema.path("photoFile"));
  assert.ok(MembershipRequest.schema.path("photoDocument"));
  assert.ok(MembershipRequest.schema.path("aadhaarDocument"));
  assert.ok(MembershipRequest.schema.path("panDocument"));
});

test("only one pending recovery submission is allowed per membership application", () => {
  const index = LegacyDocumentSubmission.schema.indexes().find(([fields]) => fields.membershipRequestId === 1 && fields.status === 1);
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { status: "pending" });
});

import test from "node:test";
import assert from "node:assert/strict";
import { recoverySummary, selectableMissingDocuments } from "../src/utils/documentRecovery.js";

test("member upload UI selects only missing documents that are not pending", () => {
  const documents = {
    photo: { available: true, canSubmit: false },
    aadhaar: { available: false, pending: true, canSubmit: false },
    pan: { available: false, pending: false, canSubmit: true },
  };
  assert.deepEqual(selectableMissingDocuments(documents), ["pan"]);
  assert.equal(recoverySummary(documents), "pending");
});

test("complete recovery summary requires every document to be available", () => {
  assert.equal(recoverySummary({ photo: { available: true }, aadhaar: { available: true }, pan: { available: true } }), "complete");
  assert.equal(recoverySummary({ photo: { available: true }, aadhaar: { available: false }, pan: { available: true } }), "missing");
});

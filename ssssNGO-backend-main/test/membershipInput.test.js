const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeOptionalMembershipFields } = require("../src/utils/normalizeMembershipInput");

test("blank optional marital status is omitted before persistence", () => {
  for (const maritalStatus of ["", "   ", null, undefined]) {
    const normalized = normalizeOptionalMembershipFields({ name: "Test Member", maritalStatus });
    assert.equal(Object.hasOwn(normalized, "maritalStatus"), false);
    assert.equal(normalized.name, "Test Member");
  }
});

test("valid marital status values remain unchanged", () => {
  for (const maritalStatus of ["single", "married"]) {
    const normalized = normalizeOptionalMembershipFields({ maritalStatus });
    assert.equal(normalized.maritalStatus, maritalStatus);
  }
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateTax, getPaymentConfig } = require("../src/config/paymentConfig");

test("tax calculation is zero when disabled", () => {
  assert.equal(calculateTax(1100, { enabled: false, rate: 18 }), 0);
});

test("tax calculation uses configured percentage", () => {
  assert.equal(calculateTax(1100, { enabled: true, rate: 18 }), 198);
});

test("donation GST is disabled by default and independent from membership", () => {
  const beforeDonation = process.env.DONATION_TAX_ENABLED;
  const beforeMembership = process.env.MEMBERSHIP_TAX_ENABLED;
  delete process.env.DONATION_TAX_ENABLED;
  process.env.MEMBERSHIP_TAX_ENABLED = "true";
  const config = getPaymentConfig();
  assert.equal(config.membership.tax.enabled, true);
  assert.equal(config.donation.tax.enabled, false);
  if (beforeDonation === undefined) delete process.env.DONATION_TAX_ENABLED;
  else process.env.DONATION_TAX_ENABLED = beforeDonation;
  if (beforeMembership === undefined) delete process.env.MEMBERSHIP_TAX_ENABLED;
  else process.env.MEMBERSHIP_TAX_ENABLED = beforeMembership;
});

test("membership prices come from server configuration", () => {
  const before = process.env.MEMBERSHIP_YEARLY_AMOUNT;
  process.env.MEMBERSHIP_YEARLY_AMOUNT = "1250";
  assert.equal(getPaymentConfig().membership.yearlyAmount, 1250);
  if (before === undefined) delete process.env.MEMBERSHIP_YEARLY_AMOUNT;
  else process.env.MEMBERSHIP_YEARLY_AMOUNT = before;
});

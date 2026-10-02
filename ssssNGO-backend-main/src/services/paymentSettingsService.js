const AppSetting = require("../models/AppSetting");
const PaymentSettingAudit = require("../models/PaymentSettingAudit");
const { getPaymentConfig } = require("../config/paymentConfig");

const settingKey = "payment_configuration";
const providers = new Set(["disabled", "razorpay"]);
const upiPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z0-9][a-zA-Z0-9.-]{1,63}$/;

const defaults = () => {
  const config = getPaymentConfig();
  const upiId = String(process.env.DONATION_UPI_ID || "").trim();
  return {
    version: 1,
    upi: {
      enabled: Boolean(upiId),
      upiId,
      payeeName: String(process.env.DONATION_PAYEE_NAME || "Swabhiman Shiksha Sanskriti Samajotthan Nyas").trim(),
      membershipEnabled: Boolean(upiId),
      donationEnabled: Boolean(upiId),
    },
    membership: { gatewayEnabled: false, provider: config.membership.provider },
    donation: { gatewayEnabled: false, provider: config.donation.provider },
  };
};

const publicSettings = (value) => ({
  version: Number(value.version || 1),
  upi: {
    enabled: Boolean(value.upi?.enabled),
    upiId: String(value.upi?.upiId || ""),
    payeeName: String(value.upi?.payeeName || ""),
    membershipEnabled: Boolean(value.upi?.membershipEnabled),
    donationEnabled: Boolean(value.upi?.donationEnabled),
  },
  membership: {
    gatewayEnabled: Boolean(value.membership?.gatewayEnabled),
    provider: providers.has(value.membership?.provider) ? value.membership.provider : "disabled",
  },
  donation: {
    gatewayEnabled: Boolean(value.donation?.gatewayEnabled),
    provider: providers.has(value.donation?.provider) ? value.donation.provider : "disabled",
  },
});

const getPaymentSettings = async () => {
  const existing = await AppSetting.findOne({ key: settingKey }).lean();
  if (existing) return publicSettings(existing.value);
  const created = await AppSetting.findOneAndUpdate(
    { key: settingKey },
    { $setOnInsert: { value: defaults() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return publicSettings(created.value);
};

const gatewayCredentialsConfigured = (purpose, provider) => {
  if (provider !== "razorpay") return false;
  const config = getPaymentConfig()[purpose];
  return Boolean(config.publicKey && config.secretKey && config.webhookSecret);
};

const validatePaymentSettings = (input) => {
  const next = publicSettings(input);
  next.upi.upiId = next.upi.upiId.trim();
  next.upi.payeeName = next.upi.payeeName.trim().slice(0, 120);
  const anyUpiEnabled = next.upi.enabled && (next.upi.membershipEnabled || next.upi.donationEnabled);
  if (anyUpiEnabled && !upiPattern.test(next.upi.upiId)) {
    throw Object.assign(new Error("Enter a valid organisation UPI ID before enabling UPI payments."), { status: 400 });
  }
  if (anyUpiEnabled && next.upi.payeeName.length < 2) {
    throw Object.assign(new Error("Enter the organisation payee name before enabling UPI payments."), { status: 400 });
  }
  for (const purpose of ["membership", "donation"]) {
    if (!providers.has(next[purpose].provider)) {
      throw Object.assign(new Error(`Unsupported ${purpose} payment provider.`), { status: 400 });
    }
    if (next[purpose].gatewayEnabled && !gatewayCredentialsConfigured(purpose, next[purpose].provider)) {
      throw Object.assign(new Error(`${purpose[0].toUpperCase() + purpose.slice(1)} gateway credentials are not configured.`), { status: 409 });
    }
  }
  return next;
};

const comparableFields = [
  "upi.enabled", "upi.upiId", "upi.payeeName", "upi.membershipEnabled", "upi.donationEnabled",
  "membership.gatewayEnabled", "membership.provider", "donation.gatewayEnabled", "donation.provider",
];
const at = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);

const updatePaymentSettings = async ({ input, changedBy }) => {
  const current = await getPaymentSettings();
  const next = validatePaymentSettings({
    ...current,
    ...input,
    upi: { ...current.upi, ...input?.upi },
    membership: { ...current.membership, ...input?.membership },
    donation: { ...current.donation, ...input?.donation },
  });
  const changes = comparableFields
    .filter((setting) => at(current, setting) !== at(next, setting))
    .map((setting) => ({ setting, oldValue: at(current, setting), newValue: at(next, setting) }));
  if (!changes.length) return current;
  next.version = current.version + 1;
  await AppSetting.findOneAndUpdate({ key: settingKey }, { $set: { value: next } }, { upsert: true, new: true });
  await PaymentSettingAudit.create({ changedBy, changes });
  return next;
};

const getPurposePaymentSettings = async (purpose) => {
  const settings = await getPaymentSettings();
  return {
    version: settings.version,
    upiEnabled: settings.upi.enabled && settings.upi[`${purpose}Enabled`],
    upiId: settings.upi.upiId,
    payeeName: settings.upi.payeeName,
    gatewayEnabled: settings[purpose].gatewayEnabled,
    provider: settings[purpose].provider,
    credentialsConfigured: gatewayCredentialsConfigured(purpose, settings[purpose].provider),
  };
};

module.exports = {
  getPaymentSettings,
  getPurposePaymentSettings,
  updatePaymentSettings,
  validatePaymentSettings,
  gatewayCredentialsConfigured,
  upiPattern,
};

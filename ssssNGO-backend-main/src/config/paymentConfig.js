const asBoolean = (value, fallback = false) => {
  if (value == null) return fallback;
  return String(value).toLowerCase() === "true";
};

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildPurposeConfig = (purpose) => {
  const prefix = purpose === "membership" ? "MEMBERSHIP" : "DONATION";
  const defaultTaxEnabled = purpose === "membership" ? false : false;

  return {
    provider: (process.env[`${prefix}_PAYMENT_PROVIDER`] || "disabled").toLowerCase(),
    currency: process.env[`${prefix}_PAYMENT_CURRENCY`] || "INR",
    publicKey: process.env[`${prefix}_PAYMENT_PUBLIC_KEY`] || "",
    secretKey: process.env[`${prefix}_PAYMENT_SECRET_KEY`] || "",
    webhookSecret: process.env[`${prefix}_PAYMENT_WEBHOOK_SECRET`] || "",
    tax: {
      enabled: asBoolean(process.env[`${prefix}_TAX_ENABLED`], defaultTaxEnabled),
      rate: asNumber(process.env[`${prefix}_TAX_PERCENT`], 0),
      label: process.env[`${prefix}_TAX_LABEL`] || "GST",
    },
  };
};

const getPaymentConfig = () => ({
  membership: {
    ...buildPurposeConfig("membership"),
    yearlyAmount: asNumber(process.env.MEMBERSHIP_YEARLY_AMOUNT, 1100),
    permanentAmount: asNumber(process.env.MEMBERSHIP_PERMANENT_AMOUNT, 5100),
  },
  donation: {
    ...buildPurposeConfig("donation"),
    minimumAmount: asNumber(process.env.DONATION_MINIMUM_AMOUNT, 100),
  },
});

const calculateTax = (amount, taxConfig) => {
  if (!taxConfig.enabled || taxConfig.rate <= 0) return 0;
  return Math.round(amount * taxConfig.rate) / 100;
};

module.exports = { getPaymentConfig, calculateTax };

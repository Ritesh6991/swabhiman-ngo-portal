const express = require("express");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const PaymentSettingAudit = require("../models/PaymentSettingAudit");
const { getPaymentConfig } = require("../config/paymentConfig");
const {
  gatewayCredentialsConfigured,
  getPaymentSettings,
  updatePaymentSettings,
} = require("../services/paymentSettingsService");

const router = express.Router();
router.use(auth, admin);

const responseFor = (settings) => ({
  ...settings,
  membership: {
    ...settings.membership,
    credentialsConfigured: gatewayCredentialsConfigured("membership", settings.membership.provider),
  },
  donation: {
    ...settings.donation,
    credentialsConfigured: gatewayCredentialsConfigured("donation", settings.donation.provider),
  },
  pricing: {
    membership: {
      yearly: getPaymentConfig().membership.yearlyAmount,
      permanent: getPaymentConfig().membership.permanentAmount,
    },
    donationMinimum: getPaymentConfig().donation.minimumAmount,
  },
});

router.get("/", async (_req, res) => res.json(responseFor(await getPaymentSettings())));

router.put("/", async (req, res) => {
  try {
    const settings = await updatePaymentSettings({ input: req.body, changedBy: req.user.id });
    res.json(responseFor(settings));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : "Payment settings could not be saved." });
  }
});

router.get("/audit", async (_req, res) => {
  const history = await PaymentSettingAudit.find().sort({ createdAt: -1 }).limit(100)
    .populate("changedBy", "name email role").lean();
  res.json(history);
});

module.exports = router;

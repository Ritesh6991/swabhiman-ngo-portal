const DisabledPaymentProvider = require("./providers/DisabledPaymentProvider");
const RazorpayProvider = require("./providers/RazorpayProvider");

const providers = {
  disabled: DisabledPaymentProvider,
  razorpay: RazorpayProvider,
};

const createProvider = (config) => {
  const Provider = providers[config.provider];
  if (!Provider) {
    const error = new Error(`Unsupported payment provider: ${config.provider}`);
    error.code = "UNSUPPORTED_PAYMENT_PROVIDER";
    throw error;
  }
  return new Provider(config);
};

module.exports = { createProvider };

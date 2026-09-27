const BasePaymentProvider = require("./BasePaymentProvider");

class DisabledPaymentProvider extends BasePaymentProvider {
  async createPayment() {
    const error = new Error("Payment provider is not configured");
    error.code = "PAYMENT_PROVIDER_NOT_CONFIGURED";
    throw error;
  }
}

module.exports = DisabledPaymentProvider;

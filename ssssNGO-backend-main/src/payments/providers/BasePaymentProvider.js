class BasePaymentProvider {
  constructor(config) {
    this.config = config;
  }

  async createPayment() {
    throw new Error("createPayment must be implemented by the payment provider");
  }

  verifyWebhook() {
    throw new Error("verifyWebhook must be implemented by the payment provider");
  }

  verifyClientPayment() {
    throw new Error("verifyClientPayment must be implemented by the payment provider");
  }
}

module.exports = BasePaymentProvider;

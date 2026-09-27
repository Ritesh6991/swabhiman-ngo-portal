const crypto = require("crypto");
const BasePaymentProvider = require("./BasePaymentProvider");

class RazorpayProvider extends BasePaymentProvider {
  ensureConfigured() {
    if (!this.config.publicKey || !this.config.secretKey) {
      const error = new Error("Razorpay credentials are not configured");
      error.code = "PAYMENT_CREDENTIALS_MISSING";
      throw error;
    }
  }

  async createPayment({ amountPaise, currency, receipt, notes }) {
    this.ensureConfigured();
    const auth = Buffer.from(`${this.config.publicKey}:${this.config.secretKey}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency, receipt, notes }),
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body?.error?.description || "Razorpay order creation failed");
      error.code = "PAYMENT_PROVIDER_ERROR";
      throw error;
    }
    return {
      providerOrderId: body.id,
      checkout: {
        provider: "razorpay",
        key: this.config.publicKey,
        orderId: body.id,
        amount: body.amount,
        currency: body.currency,
      },
    };
  }

  verifyClientPayment({ orderId, paymentId, signature }) {
    this.ensureConfigured();
    const expected = crypto
      .createHmac("sha256", this.config.secretKey)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const supplied = Buffer.from(String(signature || ""));
    const calculated = Buffer.from(expected);
    return supplied.length === calculated.length && crypto.timingSafeEqual(supplied, calculated);
  }

  verifyWebhook(rawBody, signature) {
    if (!this.config.webhookSecret) {
      const error = new Error("Webhook secret is not configured");
      error.code = "WEBHOOK_SECRET_MISSING";
      throw error;
    }
    const expected = crypto.createHmac("sha256", this.config.webhookSecret).update(rawBody).digest("hex");
    const supplied = Buffer.from(String(signature || ""));
    const calculated = Buffer.from(expected);
    return supplied.length === calculated.length && crypto.timingSafeEqual(supplied, calculated);
  }

  parseWebhook(payload, eventId) {
    const payment = payload?.payload?.payment?.entity;
    const status = payload.event === "payment.captured"
      ? "verified"
      : payload.event === "payment.failed"
        ? "failed"
        : "pending";
    return {
      eventId: eventId || payload.event + ":" + (payment?.id || "unknown"),
      providerOrderId: payment?.order_id,
      providerPaymentId: payment?.id,
      amountPaise: payment?.amount,
      currency: payment?.currency,
      status,
      failureReason: payment?.error_description || "",
    };
  }
}

module.exports = RazorpayProvider;

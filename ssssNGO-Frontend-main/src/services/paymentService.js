import API from "./api";

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = resolve;
  script.onerror = () => reject(new Error("Payment checkout could not be loaded."));
  document.head.appendChild(script);
});

export const createMembershipPayment = (membershipRequestId) => API.post("/payments/membership/create", { membershipRequestId });
export const createDonationPayment = (data, idempotencyKey) => API.post("/payments/donation/create", data, { headers: { "Idempotency-Key": idempotencyKey } });
export const getPublicPaymentConfig = () => API.get("/payments/public-config");
export const createDonationUpiIntent = (data) => API.post("/donations/upi-intent", data);
export const submitDonationUpiProof = (intent, data) => { const form = new FormData(); Object.entries(data).forEach(([key, value]) => form.append(key, value)); return API.post(`/donations/${intent.id}/proof`, form, { headers: { "X-Payment-Token": intent.accessToken } }); };
export const createMembershipUpiIntent = (membershipRequestId) => API.post("/payments/membership/upi-intent", { membershipRequestId });
export const submitMembershipUpiProof = (intent, data) => { const form = new FormData(); Object.entries(data).forEach(([key, value]) => form.append(key, value)); return API.post(`/payments/membership/${intent.id}/proof`, form); };

export const openPaymentCheckout = async ({ transaction, payer, onSuccess, onDismiss }) => {
  if (transaction.provider !== "razorpay" || !transaction.checkout) throw new Error("Online payment is not configured yet.");
  await loadRazorpay();
  const checkout = new window.Razorpay({
    key: transaction.checkout.key,
    order_id: transaction.checkout.orderId,
    amount: transaction.checkout.amount,
    currency: transaction.checkout.currency,
    name: "Swabhiman Shiksha Sanskriti Samajotthan Nyas",
    description: transaction.purpose === "membership" ? "Membership payment" : "Donation",
    prefill: payer,
    modal: { ondismiss: onDismiss },
    handler: async (response) => {
      const result = await API.post(`/payments/${transaction.purpose}/verify`, {
        transactionId: transaction.id,
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      });
      onSuccess(result.data);
    },
  });
  checkout.open();
};

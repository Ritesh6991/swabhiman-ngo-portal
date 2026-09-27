import { useEffect, useRef, useState } from "react";
import { CreditCard, HeartHandshake, LoaderCircle, QrCode, ShieldCheck, Upload } from "lucide-react";
import API from "../services/api";
import { createDonationPayment, openPaymentCheckout } from "../services/paymentService";

const fields = [["name", "Full name", "text"], ["email", "Email address", "email"], ["phone", "Phone number", "tel"], ["amount", "Donation amount (INR)", "number"]];

const Donate = () => {
  const [mode, setMode] = useState("manual");
  const [form, setForm] = useState({ name: "", email: "", phone: "", amount: "", paymentDate: "", transactionReference: "", note: "" });
  const [proof, setProof] = useState(null);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const key = useRef(crypto.randomUUID());

  useEffect(() => { API.get("/donations/manual-config").then((response) => setConfig(response.data)).catch(() => setConfig({ enabled: false })); }, []);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submitGateway = async () => {
    const response = await createDonationPayment(form, key.current);
    await openPaymentCheckout({ transaction: response.data, payer: { name: form.name, email: form.email, contact: form.phone }, onSuccess: () => setStatus({ type: "success", text: "Thank you. Your donation was verified and the receipt is being prepared." }), onDismiss: () => setStatus({ type: "error", text: "Payment was cancelled. No donation was recorded as successful." }) });
  };
  const submitManual = async () => {
    if (!proof) throw new Error("Please upload the payment screenshot.");
    const data = new FormData(); Object.entries(form).forEach(([name, value]) => data.append(name, value)); data.append("paymentMethod", "UPI / QR"); data.append("proof", proof);
    await API.post("/donations/manual", data, { headers: { "Idempotency-Key": key.current } });
    setStatus({ type: "success", text: "Proof submitted. Your donation is pending Admin verification; no official receipt is issued until approval." });
  };
  const submit = async (event) => { event.preventDefault(); setLoading(true); setStatus({ type: "", text: "" }); try { if (Number(form.amount) < (config?.minimumAmount || 100)) throw new Error(`Minimum donation is INR ${config?.minimumAmount || 100}.`); await (mode === "manual" ? submitManual() : submitGateway()); } catch (error) { setStatus({ type: "error", text: error.response?.data?.message || error.message || "Donation could not be submitted." }); } finally { setLoading(false); } };

  return <main className="mx-auto max-w-6xl px-5 py-12"><div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.85fr_1.15fr]">
    <section className="bg-[#0B2948] p-8 text-white sm:p-10"><HeartHandshake className="text-[#E6CB83]" size={42} /><h1 className="mt-6 text-3xl font-bold">Support meaningful change</h1><p className="mt-4 leading-7 text-slate-300">Donations remain separate from membership and never create a member ID card.</p><div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">{config?.enabled ? <><img src={config.qrDataUrl} alt="Organisation donation QR code" className="mx-auto w-52 rounded-xl bg-white p-2" /><p className="mt-3 text-sm font-semibold">{config.payeeName}</p><p className="mt-1 text-xs text-slate-300">UPI: {config.upiId}</p></> : <><QrCode className="mx-auto text-[#E6CB83]" size={54} /><p className="mt-3 text-sm text-slate-300">Organisation UPI details are awaiting configuration.</p></>}</div><p className="mt-6 flex gap-2 text-sm text-slate-300"><ShieldCheck className="shrink-0 text-[#E6CB83]" size={19} /> Manual proof stays pending until an Admin verifies the actual payment.</p></section>
    <section className="p-6 sm:p-10"><div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setMode("manual")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "manual" ? "bg-white text-[#0B2948] shadow" : "text-slate-500"}`}><QrCode className="mr-2 inline" size={17} />QR / UPI</button><button type="button" onClick={() => setMode("gateway")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "gateway" ? "bg-white text-[#0B2948] shadow" : "text-slate-500"}`}><CreditCard className="mr-2 inline" size={17} />Online gateway</button></div>
      <form onSubmit={submit} className="mt-6 space-y-4">{status.text && <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{status.text}</div>}{fields.map(([name, label, type]) => <div key={name}><label className="form-label" htmlFor={`donation-${name}`}>{label}</label><input id={`donation-${name}`} name={name} type={type} min={name === "amount" ? config?.minimumAmount || 100 : undefined} required className="form-input" value={form[name]} onChange={update} /></div>)}
        {mode === "manual" && <><div><label className="form-label" htmlFor="paymentDate">Payment date</label><input id="paymentDate" name="paymentDate" type="date" max={new Date().toISOString().slice(0, 10)} required className="form-input" value={form.paymentDate} onChange={update} /></div><div><label className="form-label" htmlFor="transactionReference">UTR / transaction reference (optional)</label><input id="transactionReference" name="transactionReference" className="form-input" value={form.transactionReference} onChange={update} /></div><div><label className="form-label" htmlFor="proof">Payment screenshot</label><label className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600"><Upload size={20} />{proof?.name || "Choose JPG, PNG or WebP (max 5 MB)"}<input id="proof" type="file" accept=".jpg,.jpeg,.png,.webp" required className="sr-only" onChange={(event) => setProof(event.target.files?.[0] || null)} /></label></div><div><label className="form-label" htmlFor="note">Message (optional)</label><textarea id="note" name="note" rows="3" className="form-input" value={form.note} onChange={update} /></div></>}
        <p className="text-xs leading-5 text-slate-500">No tax-free, GST-exempt or 80G eligibility claim is made by this form. Approved wording remains configuration-controlled.</p><button disabled={loading || (mode === "manual" && !config?.enabled)} className="primary-button">{loading ? <><LoaderCircle className="mr-2 animate-spin" size={19} />Submitting...</> : mode === "manual" ? "Submit proof for verification" : "Continue to secure payment"}</button></form>
    </section></div></main>;
};
export default Donate;

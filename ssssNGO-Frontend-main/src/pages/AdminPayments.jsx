import { useEffect, useMemo, useState } from "react";
import { CreditCard, Eye, RefreshCw, Save, Send, ShieldCheck } from "lucide-react";
import API from "../services/api";
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge, ToolbarButton } from "../components/admin/AdminUI";

const filters = ["all", "membership", "donation", "pending", "verified", "rejected"];
const toggleClasses = "h-5 w-5 rounded border-slate-300 text-[#287080] focus:ring-[#287080]";

const AdminPayments = () => {
  const [data, setData] = useState({ settings: null, audit: [], payments: [], deliveries: [] });
  const [draft, setDraft] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [settings, audit, payments, deliveries] = await Promise.all([
        API.get("/admin/payment-settings"),
        API.get("/admin/payment-settings/audit"),
        API.get("/admin/payment-transactions"),
        API.get("/admin/deliveries"),
      ]);
      setData({ settings: settings.data, audit: audit.data, payments: payments.data, deliveries: deliveries.data });
      setDraft(settings.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Payment administration data could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateUpi = (key, value) => setDraft((current) => ({ ...current, upi: { ...current.upi, [key]: value } }));
  const updatePurpose = (purpose, key, value) => setDraft((current) => ({ ...current, [purpose]: { ...current[purpose], [key]: value } }));

  const saveSettings = async () => {
    if (!window.confirm("Save these payment settings? New payment QR codes will use the updated configuration.")) return;
    try {
      setBusy("settings"); setError(""); setNotice("");
      const { data: settings } = await API.put("/admin/payment-settings", draft);
      setDraft(settings);
      setNotice("Payment settings saved. Future QR codes will use this configuration.");
      const { data: audit } = await API.get("/admin/payment-settings/audit");
      setData((current) => ({ ...current, settings, audit }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Payment settings could not be saved.");
    } finally { setBusy(""); }
  };

  const openProof = async (id) => {
    try {
      setBusy(`proof-${id}`);
      const response = await API.get(`/admin/payment-transactions/${id}/proof`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Payment proof could not be opened.");
    } finally { setBusy(""); }
  };

  const approve = async (item) => {
    if (!window.confirm(`Approve ${item.purpose} payment of INR ${Number(item.totalAmount).toLocaleString("en-IN")}? This will start the existing fulfilment workflow.`)) return;
    try {
      setBusy(`approve-${item._id}`); setError("");
      await API.post(`/admin/payment-transactions/${item._id}/approve`);
      setNotice("Payment approved and fulfilment processed safely.");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Payment approval failed.");
    } finally { setBusy(""); }
  };

  const reject = async (item) => {
    const reason = window.prompt("Enter the rejection reason. It will be stored with the payment review.");
    if (reason === null) return;
    if (reason.trim().length < 3) return setError("Enter a clear rejection reason.");
    if (!window.confirm("Reject this payment proof?")) return;
    try {
      setBusy(`reject-${item._id}`); setError("");
      await API.post(`/admin/payment-transactions/${item._id}/reject`, { reason: reason.trim() });
      setNotice("Payment proof rejected.");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Payment rejection failed.");
    } finally { setBusy(""); }
  };

  const resend = async (requestId) => {
    if (!window.confirm("Regenerate the ID card and certificate with the latest design, then resend them to the registered recipient?")) return;
    try { setBusy(`resend-${requestId}`); await API.post(`/admin/deliveries/${requestId}/resend`); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Regeneration and resend failed."); }
    finally { setBusy(""); }
  };

  const visiblePayments = useMemo(() => data.payments.filter((item) => {
    if (filter === "all") return true;
    if (["membership", "donation"].includes(filter)) return item.purpose === filter;
    return item.status === filter;
  }), [data.payments, filter]);

  return <main className="space-y-6">
    <PageHeader eyebrow="Payment operations" title="Payment Settings & Delivery" description="Manage the active UPI destination, verify manual payment proofs and monitor fulfilment." actions={<ToolbarButton onClick={load}><RefreshCw size={17} />Refresh</ToolbarButton>} />
    {error && <ErrorState message={error} onRetry={load} />}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {loading ? <SectionCard><LoadingState /></SectionCard> : <>
      {draft && <SectionCard title="Payment settings" description="Changes are stored securely in the database and apply to newly generated payment QR codes without a redeployment.">
        <div className="grid gap-6 p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="font-bold text-[#102A43]">General UPI</p><p className="mt-1 text-xs text-slate-500">Shared organisation payment destination</p></div><StatusBadge status={draft.upi.enabled ? "active" : "disabled"} /></div>
              <label className="mt-5 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" className={toggleClasses} checked={draft.upi.enabled} onChange={(e) => updateUpi("enabled", e.target.checked)} />UPI enabled</label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Organisation UPI ID<input className="form-input mt-1" value={draft.upi.upiId} onChange={(e) => updateUpi("upiId", e.target.value)} placeholder="organisation@bank" /></label><label className="text-sm font-semibold text-slate-700">Payee / Organisation Name<input className="form-input mt-1" value={draft.upi.payeeName} onChange={(e) => updateUpi("payeeName", e.target.value)} /></label></div>
              <div className="mt-4 flex flex-wrap gap-5"><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" className={toggleClasses} checked={draft.upi.membershipEnabled} onChange={(e) => updateUpi("membershipEnabled", e.target.checked)} />Membership UPI</label><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" className={toggleClasses} checked={draft.upi.donationEnabled} onChange={(e) => updateUpi("donationEnabled", e.target.checked)} />Donation UPI</label></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">{["membership", "donation"].map((purpose) => <article key={purpose} className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#287080]/10 text-[#287080]"><CreditCard size={19} /></span><StatusBadge status={draft[purpose].gatewayEnabled ? "active" : "disabled"} /></div><h3 className="mt-4 font-bold capitalize text-[#102A43]">{purpose} gateway</h3><label className="mt-4 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" className={toggleClasses} checked={draft[purpose].gatewayEnabled} onChange={(e) => updatePurpose(purpose, "gatewayEnabled", e.target.checked)} />Gateway enabled</label><label className="mt-4 block text-sm font-semibold text-slate-700">Selected provider<select className="form-input mt-1" value={draft[purpose].provider} onChange={(e) => updatePurpose(purpose, "provider", e.target.value)}><option value="disabled">None</option><option value="razorpay">Razorpay</option></select></label><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} />Credentials: {draft[purpose].credentialsConfigured ? "Configured" : "Not configured"}</p></article>)}</div>
            <div className="flex justify-end"><ToolbarButton disabled={busy === "settings"} onClick={saveSettings}><Save size={17} />{busy === "settings" ? "Saving..." : "Save settings"}</ToolbarButton></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-bold text-[#102A43]">Settings audit history</h3><p className="mt-1 text-xs text-slate-500">Latest sensitive configuration changes</p>{data.audit.length ? <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto">{data.audit.map((entry) => <article key={entry._id} className="rounded-xl border bg-white p-4 text-sm"><p className="font-semibold text-slate-800">{entry.changedBy?.name || entry.changedBy?.email || "Authorised administrator"}</p><p className="mt-1 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p><ul className="mt-3 space-y-1 text-xs text-slate-600">{entry.changes.map((change, index) => <li key={`${change.setting}-${index}`}><span className="font-semibold">{change.setting}</span>: {String(change.oldValue)} → {String(change.newValue)}</li>)}</ul></article>)}</div> : <p className="mt-5 text-sm text-slate-500">No settings changes recorded yet.</p>}</div>
        </div>
      </SectionCard>}

      <SectionCard title="Manual UPI verification" description="Proof submission never verifies a payment automatically. Approvals are idempotent and use the expected stored amount.">
        <div className="flex flex-wrap gap-2 border-b p-4">{filters.map((value) => <button key={value} onClick={() => setFilter(value)} className={`min-h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wide ${filter === value ? "bg-[#0B2948] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{value}</button>)}</div>
        {!visiblePayments.length ? <EmptyState title="No matching payments" description="Payment attempts will appear here when customers create or submit them." /> : <div className="divide-y divide-slate-100">{visiblePayments.map((item) => {
          const person = item.purpose === "membership" ? (item.membershipRequestId?.name || item.userId?.name || "Member") : (item.donor?.name || "Donor");
          const hasProof = Boolean(item.proofDocument?.publicId || item.proofFile);
          return <article key={item._id} className="p-5"><div className="grid gap-4 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[#102A43]">{person}</p><StatusBadge status={item.status} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">{item.purpose}</span></div><div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4"><p><span className="text-xs text-slate-400">Amount</span><br /><strong>INR {Number(item.totalAmount).toLocaleString("en-IN")}</strong></p><p><span className="text-xs text-slate-400">Method</span><br /><strong>UPI</strong></p><p><span className="text-xs text-slate-400">UTR</span><br /><strong className="break-all">{item.transactionReference || "Not submitted"}</strong></p><p><span className="text-xs text-slate-400">Created</span><br /><strong>{new Date(item.createdAt).toLocaleString()}</strong></p></div>{item.rejectionReason && <p className="mt-3 text-sm text-red-700">Reason: {item.rejectionReason}</p>}</div><div className="flex flex-wrap items-center gap-2 lg:justify-end">{hasProof && <ToolbarButton disabled={busy === `proof-${item._id}`} onClick={() => openProof(item._id)}><Eye size={16} />View proof</ToolbarButton>}{item.status === "pending" && <><ToolbarButton disabled={Boolean(busy)} onClick={() => approve(item)}>Approve</ToolbarButton><button disabled={Boolean(busy)} onClick={() => reject(item)} className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 disabled:opacity-50">Reject</button></>}</div></div></article>;
        })}</div>}
      </SectionCard>

      <SectionCard title="Membership document delivery" description="Delivery status for generated ID cards and certificates. Regenerate & resend applies the latest approved document design.">{!data.deliveries.length ? <EmptyState title="No delivery records yet" description="Delivery attempts will appear after approved memberships generate documents." /> : <div className="divide-y divide-slate-100">{data.deliveries.map((item) => <article key={item._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[#102A43]">{item.recipient}</p><p className="mt-1 text-xs text-slate-500">Attempts: {item.attempts}{item.lastError ? ` • ${item.lastError}` : ""}</p></div><div className="flex flex-wrap items-center gap-3"><StatusBadge status={item.status} /><ToolbarButton disabled={busy === `resend-${item.membershipRequestId}`} onClick={() => resend(item.membershipRequestId)}><Send size={16} />Regenerate & resend</ToolbarButton></div></article>)}</div>}</SectionCard>
    </>}
  </main>;
};

export default AdminPayments;

import { useEffect, useState } from "react";
import API from "../services/api";
import { motion } from "framer-motion";
import Loader from "../components/Loader";
import { Search } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge } from "../components/admin/AdminUI";

const SecureFileButton = ({ requestId, submissionId, available, kind, label, onPreview }) => {
  const [error, setError] = useState("");
  if (!available) return <span className="text-xs text-slate-400">No {label}</span>;
  const open = async () => {
    try {
      setError("");
      const url = submissionId ? `/admin/document-reuploads/${submissionId}/document/${kind}` : `/admin/requests/${requestId}/document/${kind}`;
      const response = await API.get(url, { responseType: "blob" });
      onPreview({ label, url: URL.createObjectURL(response.data), type: response.headers["content-type"] || response.data.type });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || `Unable to open ${label}.`);
    }
  };
  return <div><button type="button" onClick={open} className="rounded-lg border border-[#296374]/30 px-3 py-2 text-sm font-semibold text-[#0C2C55] hover:bg-[#296374]/10">View {label}</button>{error && <p className="mt-1 max-w-40 text-xs text-red-700">{error}</p>}</div>;
};

const PlanBadge = ({ type }) => {
  const isPermanent = type === "permanent";
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
        isPermanent
          ? "bg-[#E1B12C]/20 text-[#8a6d00]"
          : "bg-[#296374]/10 text-[#296374]"
      }`}
    >
      {isPermanent ? "Permanent" : "Annual"}
    </span>
  );
};

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rejectConfirmationOpen, setRejectConfirmationOpen] = useState(false);
  const [manualPayment, setManualPayment] = useState({ paymentMethod: "upi", transactionReference: "", note: "", confirmPayment: false });
  const [recoveryNote, setRecoveryNote] = useState("");

  useEffect(() => {
    setActionError("");
    setRejectConfirmationOpen(false);
    setManualPayment({ paymentMethod: "upi", transactionReference: "", note: "", confirmPayment: false });
    setRecoveryNote("");
  }, [selected?._id]);

  // FETCH REQUESTS
  const fetchRequests = async () => {
    try {
      setPageLoading(true);
      const res = await API.get("/admin/requests");
      setRequests(res.data);
    } catch (err) {
      console.log("Failed to load requests");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // APPROVE
  const approve = async (id) => {
    const needsManualConfirmation = selected?.paymentStatus !== "verified";
    if (needsManualConfirmation && !manualPayment.confirmPayment) {
      setActionError("Confirm that the payment was received before approving this membership.");
      return;
    }
    if (needsManualConfirmation && manualPayment.paymentMethod !== "cash" && manualPayment.transactionReference.trim().length < 3) {
      setActionError("Enter the UTR, cheque number, or payment reference.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError("");
      await API.post(`/admin/approve/${id}`, needsManualConfirmation ? manualPayment : {});
      await fetchRequests();
      setSelected(null);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Membership approval failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // REJECT
  const reject = async (id) => {
    try {
      setActionLoading(true);
      setActionError("");
      await API.post(`/admin/reject/${id}`);
      await fetchRequests();
      setSelected(null);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Membership rejection failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const reviewRecovery = async (decision) => {
    const submissionId = selected?.documentRecovery?.pendingSubmission?._id;
    if (!submissionId) return;
    if (decision === "reject" && recoveryNote.trim().length < 3) {
      setActionError("Add a short reason before rejecting replacement documents.");
      return;
    }
    try {
      setActionLoading(true); setActionError("");
      await API.post(`/admin/document-reuploads/${submissionId}/${decision}`, { note: recoveryNote });
      await fetchRequests(); setSelected(null);
    } catch (error) {
      setActionError(error.response?.data?.message || "Document review could not be completed.");
    } finally { setActionLoading(false); }
  };

  const filtered = requests.filter((item) => (status === "all" || item.status === status) && `${item.name || ""} ${item.email || ""}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-6">
      {/* GLOBAL LOADER */}
      {(pageLoading || actionLoading) && <Loader />}

      <PageHeader eyebrow="Membership operations" title="Membership Applications" description="Review applicant information, payment state and protected identity documents." />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><label className="relative block flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search applications</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicant or email" className="form-input py-2.5 pl-10" /></label><div className="flex gap-2 overflow-x-auto">{["all", "pending", "approved", "rejected"].map((value) => <button key={value} onClick={() => setStatus(value)} className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider ${status === value ? "bg-[#102A43] text-white" : "bg-slate-100 text-slate-600"}`}>{value}</button>)}</div></div>

      {/* EMPTY STATE */}
      {!pageLoading && filtered.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState title="No matching applications" description="New applications or records matching this filter will appear here." /></div>}

      {/* LIST VIEW */}
      <div className="grid gap-3">
        {filtered.map((r) => (
          <motion.div
            key={r._id}
            whileHover={{ scale: 1.01 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#287080]/30 hover:shadow-md"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#296374]/10 border flex items-center justify-center text-[#296374] text-xs font-bold">{r.name?.charAt(0)?.toUpperCase() || "M"}</div>

                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {r.name}
                    <PlanBadge type={r.membershipType} />
                  </p>
                  <p className="text-sm">{r.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={r.status} /><span className="text-xs text-slate-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Date unavailable"}</span></div>
                </div>
              </div>

              <button
                onClick={() => setSelected(r)}
                className="min-h-10 rounded-xl bg-[#102A43] px-4 py-2 text-sm font-semibold text-white hover:bg-[#287080]"
              >
                View
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-40">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            role="dialog" aria-modal="true" aria-labelledby="application-details-title" className="w-full max-w-3xl max-h-[92vh] overflow-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-lg bg-[#296374]/10 border flex items-center justify-center text-[#296374] text-2xl font-bold">{selected.name?.charAt(0)?.toUpperCase() || "M"}</div>

              <div>
                <h2 id="application-details-title" className="text-xl font-bold text-[#102A43]">Application Details</h2>
                <p className="text-xs text-gray-500 mt-1">
                  This photo will appear on the member's ID card.
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2"><section className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm"><h3 className="mb-3 font-bold text-[#102A43]">Applicant information</h3>
              <p><b>Name:</b> {selected.name}</p>
              <p><b>Father:</b> {selected.fatherName}</p>
              <p><b>Mother:</b> {selected.motherName}</p>

              <p><b>Phone:</b> {selected.phone}</p>
              <p><b>Email:</b> {selected.email}</p>

              <p>
                <b>Membership Plan:</b>{" "}
                <PlanBadge type={selected.membershipType} />{" "}
                {selected.membershipType === "permanent"
                  ? "(Lifetime validity)"
                  : "(Valid 1 year from approval)"}
              </p>
              <p><b>Amount:</b> ₹{selected.amount ?? 0}</p>

              <p><b>Aadhaar No:</b> {selected.aadhaarNumber}</p>
              <p><b>PAN No:</b> {selected.panNumber}</p>

              <p><b>Income:</b> {selected.annualIncome}</p>
              <p><b>Source:</b> {selected.incomeSource}</p>

              <p><b>Father Occupation:</b> {selected.fatherOccupation}</p>
              <p><b>Mother Occupation:</b> {selected.motherOccupation}</p></section><section className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm"><h3 className="mb-3 font-bold text-[#102A43]">Membership & address</h3>

              <p><b>Aadhaar Address:</b> {selected.aadhaarAddress}</p>
              <p><b>Current Address:</b> {selected.currentAddress}</p>

              </section></div><section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-[#102A43]">Protected documents</h3><StatusBadge status={selected.status} /></div><div className="flex flex-wrap gap-3">
                <SecureFileButton key={`${selected._id}-photo`} requestId={selected._id} available={selected.documentAvailability?.photo ?? selected.photoFile} kind="photo" label="Photo" onPreview={setPreview} />
                <SecureFileButton key={`${selected._id}-aadhaar`} requestId={selected._id} available={selected.documentAvailability?.aadhaar ?? selected.aadhaarFile} kind="aadhaar" label="Aadhaar" onPreview={setPreview} />
                <SecureFileButton key={`${selected._id}-pan`} requestId={selected._id} available={selected.documentAvailability?.pan ?? selected.panFile} kind="pan" label="PAN" onPreview={setPreview} />
              </div></section>

            {selected.documentRecovery?.pendingSubmission && <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-[#102A43]">Replacement documents awaiting verification</h3><p className="mt-1 text-xs text-slate-600">Verifying these files will not alter membership, payment or approval history.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">Pending review</span></div><div className="mt-4 flex flex-wrap gap-3">{selected.documentRecovery.pendingSubmission.submittedKinds.map((kind) => <SecureFileButton key={`recovery-${kind}`} submissionId={selected.documentRecovery.pendingSubmission._id} available kind={kind} label={`Replacement ${kind}`} onPreview={setPreview} />)}</div><label className="mt-4 block text-sm font-semibold text-slate-700">Review note<textarea value={recoveryNote} onChange={(event) => setRecoveryNote(event.target.value)} rows="2" className="form-input mt-1" placeholder="Required when rejecting; optional when verifying" /></label><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={actionLoading} onClick={() => reviewRecovery("verify")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Verify replacement documents</button><button type="button" disabled={actionLoading} onClick={() => reviewRecovery("reject")} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Reject replacement documents</button></div></section>}

            {selected.status !== "approved" && selected.paymentStatus !== "verified" && (
              <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-bold text-[#102A43]">Payment verification</h3>
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-800">Admin confirmation required</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">Confirm the payment received outside the online gateway. This creates an auditable transaction before the member ID is generated.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">Payment method
                    <select className="form-input mt-1" value={manualPayment.paymentMethod} onChange={(event) => setManualPayment((current) => ({ ...current, paymentMethod: event.target.value }))}>
                      <option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="other">Other</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">UTR / receipt / reference {manualPayment.paymentMethod === "cash" ? "(optional)" : ""}
                    <input className="form-input mt-1" value={manualPayment.transactionReference} onChange={(event) => setManualPayment((current) => ({ ...current, transactionReference: event.target.value }))} placeholder={manualPayment.paymentMethod === "cash" ? "Cash receipt number" : "Enter payment reference"} />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Internal note (optional)
                  <textarea rows="2" className="form-input mt-1" value={manualPayment.note} onChange={(event) => setManualPayment((current) => ({ ...current, note: event.target.value }))} placeholder="Who verified the payment or any useful context" />
                </label>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-700">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={manualPayment.confirmPayment} onChange={(event) => setManualPayment((current) => ({ ...current, confirmPayment: event.target.checked }))} />
                  <span>I confirm that the organisation received this membership payment and the applicant documents were reviewed.</span>
                </label>
              </section>
            )}

            {actionError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</p>}

            {/* ACTIONS */}
            {rejectConfirmationOpen && (
              <div role="alertdialog" aria-labelledby="reject-confirmation-title" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 id="reject-confirmation-title" className="font-bold text-red-800">Reject this application?</h3>
                <p className="mt-1 text-sm text-red-700">This will mark the application as rejected. The applicant will need to submit a new application.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={actionLoading} onClick={() => reject(selected._id)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">Confirm Rejection</button>
                  <button type="button" disabled={actionLoading} onClick={() => setRejectConfirmationOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {selected.status !== "approved" && (
                <button
                  disabled={actionLoading}
                  onClick={() => approve(selected._id)}
                  className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  {actionLoading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  )}
                  {selected.paymentStatus === "verified" ? "Approve & Generate ID" : "Verify Payment & Approve"}
                </button>
              )}

              {selected.status !== "rejected" && !rejectConfirmationOpen && (
                <button
                  disabled={actionLoading}
                  onClick={() => { setActionError(""); setRejectConfirmationOpen(true); }}
                  className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  {actionLoading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  )}
                  Reject
                </button>
              )}

              <button
                onClick={() => setSelected(null)}
                className="border px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-[#0C2C55]">{preview.label} preview</h2><button className="rounded-lg border px-4 py-2 font-semibold" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}>Close preview</button></div>
            {preview.type?.startsWith("image/") ? <img src={preview.url} alt={`${preview.label} document`} className="min-h-0 flex-1 object-contain" /> : <iframe title={`${preview.label} document`} src={preview.url} className="min-h-0 flex-1 rounded-lg border" />}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequests;

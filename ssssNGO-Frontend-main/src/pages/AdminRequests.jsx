import { useEffect, useState } from "react";
import API from "../services/api";
import { motion } from "framer-motion";
import Loader from "../components/Loader";
import { Search } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge } from "../components/admin/AdminUI";

const SecureFileButton = ({ requestId, available, kind, label, onPreview }) => {
  const [error, setError] = useState("");
  if (!available) return <span className="text-xs text-slate-400">No {label}</span>;
  const open = async () => {
    try {
      setError("");
      const response = await API.get(`/admin/requests/${requestId}/document/${kind}`, { responseType: "blob" });
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
    if (!window.confirm("Approve this membership after confirming its payment and documents?")) return;
    try {
      setActionLoading(true);
      await API.post(`/admin/approve/${id}`);
      await fetchRequests();
      setSelected(null);
    } finally {
      setActionLoading(false);
    }
  };

  // REJECT
  const reject = async (id) => {
    if (!window.confirm("Reject this membership application?")) return;
    try {
      setActionLoading(true);
      await API.post(`/admin/reject/${id}`);
      await fetchRequests();
      setSelected(null);
    } finally {
      setActionLoading(false);
    }
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

            {/* ACTIONS */}
            <div className="flex gap-3 mt-6">
              {selected.status !== "approved" && (
                <button
                  disabled={actionLoading}
                  onClick={() => approve(selected._id)}
                  className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  {actionLoading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  )}
                  Approve & Generate ID
                </button>
              )}

              {selected.status !== "rejected" && (
                <button
                  disabled={actionLoading}
                  onClick={() => reject(selected._id)}
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

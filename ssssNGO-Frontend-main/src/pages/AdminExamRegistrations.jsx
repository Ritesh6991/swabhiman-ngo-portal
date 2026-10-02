import { useEffect, useState } from "react";
import { Check, Eye, RefreshCw, Search, X } from "lucide-react";
import API from "../services/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusBadge,
  ToolbarButton,
} from "../components/admin/AdminUI";

const AdminExamRegistrations = () => {
  const [items, setItems] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "", year: "" });
  const [remarks, setRemarks] = useState("");
  const load = async () => {
    try {
      setError("");
      const [registrations, years] = await Promise.all([
        API.get("/exams/admin/registrations", { params: filters }),
        API.get("/exams/admin/cycles"),
      ]);
      setItems(registrations.data);
      setCycles(years.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registrations could not be loaded.",
      );
    }
  };
  // Initial load intentionally uses the empty filter state; later searches are submitted explicitly.
  useEffect(() => {
    load();
    // Initial load intentionally uses the empty filter state; later searches are submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const open = async (id) => {
    try {
      const { data } = await API.get(`/exams/admin/registrations/${id}`);
      setSelected(data);
      setRemarks(data.adminRemarks || "");
    } catch (err) {
      setError(
        err.response?.data?.message || "Candidate details could not be loaded.",
      );
    }
  };
  const openDocument = async (kind) => {
    const response = await API.get(
      `/exams/admin/registrations/${selected._id}/documents/${kind}`,
      { responseType: "blob" },
    );
    if (document) URL.revokeObjectURL(document.url);
    setDocument({
      title: kind === "photo" ? "Student Photograph" : "Aadhaar Card",
      url: URL.createObjectURL(response.data),
      type: response.data.type,
    });
  };
  const act = async (action) => {
    try {
      setError("");
      setMessage("");
      const { data } = await API.post(`/exams/admin/registrations/${selected._id}/${action}`, {
        remarks,
      });
      setMessage(data.message || `Application ${action}d.`);
      await load();
      await open(selected._id);
    } catch (err) {
      setError(err.response?.data?.message || "Admin action failed.");
      await load();
      await open(selected._id);
    }
  };
  if (error && !items) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Examination"
        title="Registrations"
        description="Review student details and sensitive documents before approval."
        actions={
          <ToolbarButton onClick={load}>
            <RefreshCw size={16} />
            Refresh
          </ToolbarButton>
        }
      />
      {error && <ErrorState message={error} onRetry={() => setError("")} />}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      )}
      <SectionCard title="Search and filter">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            load();
          }}
          className="grid gap-3 p-5 md:grid-cols-[1fr_180px_140px_auto]"
        >
          <label className="relative">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              aria-label="Search applications"
              value={filters.search}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value })
              }
              placeholder="Name, application, email or mobile"
              className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3"
            />
          </label>
          <select
            aria-label="Status filter"
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value })
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            aria-label="Year filter"
            value={filters.year}
            onChange={(event) =>
              setFilters({ ...filters, year: event.target.value })
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3"
          >
            <option value="">All years</option>
            {cycles.map((cycle) => (
              <option key={cycle._id} value={cycle.year}>
                {cycle.year}
              </option>
            ))}
          </select>
          <ToolbarButton primary type="submit">
            Apply
          </ToolbarButton>
        </form>
      </SectionCard>
      <SectionCard title={`${items.length} registrations`}>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#102A43]">
                        {item.studentName}
                      </p>
                      <p className="text-xs text-slate-500">{item.email}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {item.applicationNumber}
                    </td>
                    <td className="px-4 py-4">{item.examCycle?.year}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4">
                      <ToolbarButton onClick={() => open(item._id)}>
                        <Eye size={16} />
                        Review
                      </ToolbarButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching registrations"
            description="Change filters or wait for a public submission."
          />
        )}
      </SectionCard>
      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4">
          <div className="mx-auto my-5 max-w-4xl rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#287080]">
                  {selected.applicationNumber}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#102A43]">
                  {selected.studentName}
                </h2>
              </div>
              <button
                aria-label="Close candidate"
                onClick={() => setSelected(null)}
                className="rounded-xl border p-2"
              >
                <X />
              </button>
            </header>
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
              <CandidateSection
                title="Student information"
                rows={[
                  ["Father's Name", selected.fatherName],
                  [
                    "Date of Birth",
                    new Date(selected.dateOfBirth).toLocaleDateString("en-IN"),
                  ],
                  ["Class", selected.className],
                  ["Mobile", selected.mobile],
                  ["Email", selected.email],
                  ["Address", selected.fullAddress],
                ]}
              />
              <div className="space-y-6">
                <CandidateSection
                  title="Examination"
                  rows={[
                    ["Examination", selected.examCycle?.title],
                    ["Year", selected.examCycle?.year],
                    ["Status", selected.status],
                    ["Admit Card", selected.admitCardStatus],
                  ]}
                />
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Documents
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ToolbarButton onClick={() => openDocument("photo")}>
                      <Eye size={16} />
                      View Photograph
                    </ToolbarButton>
                    <ToolbarButton onClick={() => openDocument("aadhaar")}>
                      <Eye size={16} />
                      View Aadhaar
                    </ToolbarButton>
                  </div>
                </section>
              </div>
              <section className="lg:col-span-2">
                <label className="text-sm font-bold text-slate-700">
                  Admin remarks
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    rows="3"
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                    placeholder="Required for rejection"
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ToolbarButton primary onClick={() => act("approve")}>
                    <Check size={16} />
                    Approve
                  </ToolbarButton>
                  <ToolbarButton danger onClick={() => act("reject")}>
                    <X size={16} />
                    Reject
                  </ToolbarButton>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Approval is idempotent. A successful approval generates,
                  securely stores and emails the Admit Card automatically.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
      {document && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/75 p-4">
          <div className="h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white">
            <header className="flex items-center justify-between border-b p-4">
              <h3 className="font-bold">{document.title}</h3>
              <button
                onClick={() => {
                  URL.revokeObjectURL(document.url);
                  setDocument(null);
                }}
                className="rounded-lg border p-2"
              >
                <X />
              </button>
            </header>
            {document.type.includes("pdf") ? (
              <iframe
                title={document.title}
                src={document.url}
                className="h-[calc(88vh-65px)] w-full"
              />
            ) : (
              <div className="grid h-[calc(88vh-65px)] place-items-center overflow-auto bg-slate-100 p-4">
                <img
                  src={document.url}
                  alt={document.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
const CandidateSection = ({ title, rows }) => (
  <section>
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
      {title}
    </h3>
    <dl className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800">
            {value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  </section>
);
export default AdminExamRegistrations;

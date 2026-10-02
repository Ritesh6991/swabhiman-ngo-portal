import { useEffect, useState } from "react";
import {
  Download,
  Eye,
  FileBadge2,
  Mail,
  RefreshCw,
  Search,
  WandSparkles,
  X,
} from "lucide-react";
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

const AdminAdmitCards = () => {
  const [items, setItems] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [filters, setFilters] = useState({ search: "", year: "" });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setError("");
      const [cards, years] = await Promise.all([
        API.get("/exams/admin/admit-cards", { params: filters }),
        API.get("/exams/admin/cycles"),
      ]);
      setItems(cards.data);
      setCycles(years.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Admit Cards could not be loaded.",
      );
    }
  };
  // Initial load intentionally uses empty filters; later searches are submitted explicitly.
  useEffect(() => {
    load();
    // Initial load intentionally uses empty filters; later searches are submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCard = async (item, download = false) => {
    try {
      setBusy(`${item._id}-${download ? "download" : "view"}`);
      const response = await API.get(
        `/exams/admin/registrations/${item._id}/admit-card`,
        { params: download ? { download: 1 } : {}, responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      if (download) {
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${item.applicationNumber}-Admit-Card.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        if (preview) URL.revokeObjectURL(preview.url);
        setPreview({ title: `${item.studentName} - Admit Card`, url });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Admit Card could not be opened.",
      );
    } finally {
      setBusy("");
    }
  };

  const action = async (item, kind) => {
    try {
      setBusy(`${item._id}-${kind}`);
      setError("");
      setMessage("");
      const { data } = await API.post(
        `/exams/admin/registrations/${item._id}/admit-card/${kind}`,
      );
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || `Admit Card ${kind} failed.`);
      await load();
    } finally {
      setBusy("");
    }
  };

  if (error && !items) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Examination"
        title="Admit Cards"
        description="Generate, securely view, download and resend Admit Cards for approved registrations."
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
          className="grid gap-3 p-5 md:grid-cols-[1fr_180px_auto]"
        >
          <label className="relative">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              aria-label="Search Admit Cards"
              value={filters.search}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value })
              }
              placeholder="Name, application or email"
              className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3"
            />
          </label>
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
      <SectionCard title={`${items.length} approved registrations`}>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Card</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#102A43]">
                        {item.studentName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Class {item.className} • {item.examCycle?.year}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {item.applicationNumber}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.admitCardStatus} />
                      <p className="mt-1 text-xs text-slate-500">
                        {item.admitCardGeneratedAt
                          ? new Date(item.admitCardGeneratedAt).toLocaleString(
                              "en-IN",
                            )
                          : "Not generated"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.admitCardDeliveryStatus} />
                      <p className="mt-1 text-xs text-slate-500">
                        {item.admitCardDeliveryAttempts || 0} attempt(s)
                      </p>
                      {item.admitCardDeliveryError && (
                        <p className="mt-1 max-w-56 text-xs text-red-600">
                          {item.admitCardDeliveryError}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <ToolbarButton
                          disabled={busy || !item.admitCardGeneratedAt}
                          onClick={() => openCard(item)}
                        >
                          <Eye size={16} />
                          View
                        </ToolbarButton>
                        <ToolbarButton
                          disabled={busy || !item.admitCardGeneratedAt}
                          onClick={() => openCard(item, true)}
                        >
                          <Download size={16} />
                          Download
                        </ToolbarButton>
                        <ToolbarButton
                          disabled={busy}
                          onClick={() => action(item, "generate")}
                        >
                          <WandSparkles size={16} />
                          {item.admitCardGeneratedAt
                            ? "Regenerate"
                            : "Generate"}
                        </ToolbarButton>
                        <ToolbarButton
                          primary
                          disabled={busy}
                          onClick={() => action(item, "resend")}
                        >
                          <Mail size={16} />
                          {item.admitCardDeliveryStatus === "sent"
                            ? "Resend"
                            : "Send Email"}
                        </ToolbarButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={FileBadge2}
            title="No approved registrations"
            description="Approved candidates will appear here automatically."
          />
        )}
      </SectionCard>
      {preview && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/75 p-4">
          <div className="h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white">
            <header className="flex items-center justify-between border-b p-4">
              <h3 className="font-bold">{preview.title}</h3>
              <button
                aria-label="Close Admit Card"
                onClick={() => {
                  URL.revokeObjectURL(preview.url);
                  setPreview(null);
                }}
                className="rounded-lg border p-2"
              >
                <X />
              </button>
            </header>
            <iframe
              title={preview.title}
              src={preview.url}
              className="h-[calc(92vh-65px)] w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAdmitCards;

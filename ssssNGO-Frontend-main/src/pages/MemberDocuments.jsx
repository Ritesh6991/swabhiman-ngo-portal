import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileLock2, ShieldCheck, UploadCloud } from "lucide-react";
import API from "../services/api";
import { documentLabels, recoverySummary, selectableMissingDocuments } from "../utils/documentRecovery";

export default function MemberDocuments() {
  const [state, setState] = useState({ loading: true, data: null, error: "", notice: "" });
  const [files, setFiles] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const { data } = await API.get("/membership/documents/status");
      setState((current) => ({ ...current, loading: false, data }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.response?.data?.message || "Document status could not be loaded." }));
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    const selected = Object.entries(files).filter(([, file]) => file);
    if (!selected.length) return setState((current) => ({ ...current, error: "Select at least one missing document." }));
    const form = new FormData();
    selected.forEach(([kind, file]) => form.append(kind, file));
    try {
      setSubmitting(true);
      setState((current) => ({ ...current, error: "", notice: "" }));
      await API.post("/membership/documents/reupload", form);
      setFiles({});
      await load();
      setState((current) => ({ ...current, notice: "Documents submitted securely. Your membership remains unchanged while Admin reviews them." }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.response?.data?.message || "Documents could not be submitted." }));
    } finally { setSubmitting(false); }
  };

  const summary = recoverySummary(state.data?.documents);
  const selectable = selectableMissingDocuments(state.data?.documents);

  return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <header className="bg-[#0C2C55] p-6 text-white sm:p-8">
        <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><FileLock2 /></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E6CB83]">Private member documents</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Complete missing legacy documents</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Only missing files can be submitted. Every upload stays private and requires Admin verification. Your existing membership status, member ID and payment history are not changed.</p></div></div>
      </header>
      <div className="space-y-6 p-5 sm:p-8">
        {state.loading && <p className="text-sm text-slate-500">Checking your records…</p>}
        {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.error}</p>}
        {state.notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{state.notice}</p>}
        {state.data && <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Membership record</p><p className="mt-1 font-bold text-[#102A43]">{state.data.memberId || "Member ID not assigned"}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${summary === "complete" ? "bg-emerald-100 text-emerald-800" : summary === "pending" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{summary}</span></div>
          <div className="grid gap-4 sm:grid-cols-3">{Object.entries(state.data.documents).map(([kind, item]) => <article key={kind} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-[#102A43]">{documentLabels[kind]}</h2>{item.available ? <CheckCircle2 className="text-emerald-600" size={20} /> : item.pending ? <Clock3 className="text-amber-600" size={20} /> : <UploadCloud className="text-rose-600" size={20} />}</div><p className="mt-2 text-xs text-slate-500">{item.available ? "Verified document available" : item.pending ? "Awaiting Admin review" : "Missing — re-upload required"}</p>{item.canSubmit && <label className="mt-4 block text-xs font-semibold text-slate-700">Choose file<input type="file" accept={kind === "photo" ? ".jpg,.jpeg,.png,.webp" : ".jpg,.jpeg,.png,.webp,.pdf"} onChange={(event) => setFiles((current) => ({ ...current, [kind]: event.target.files?.[0] || null }))} className="mt-2 block w-full text-xs" /></label>}</article>)}</div>
          {selectable.length > 0 && <form onSubmit={submit}><button disabled={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#287080] px-5 py-3 font-bold text-white disabled:opacity-60"><ShieldCheck size={19} />{submitting ? "Uploading securely…" : "Submit selected documents for review"}</button><p className="mt-2 text-center text-xs text-slate-500">Maximum 5 MB per file. Photo: JPG/PNG/WebP. Aadhaar and PAN: image or PDF.</p></form>}
        </>}
      </div>
    </section>
  </div>;
}

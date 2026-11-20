import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, FileCheck2, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import UpiPaymentStep from "../components/UpiPaymentStep";

const textFields = [
  ["studentName", "Student's Name", "text", "Enter the student's full name"],
  ["fatherName", "Father's Name", "text", "Enter the father's full name"],
  ["dateOfBirth", "Date of Birth", "date", ""],
  ["mobile", "Mobile Number (WhatsApp)", "tel", "+91 98765 43210"],
  ["email", "Email Address", "email", "student@example.com"],
];

const ExamRegistration = () => {
  const { slug } = useParams();
  const [exam, setExam] = useState(null);
  const [form, setForm] = useState({ studentName: "", fatherName: "", dateOfBirth: "", className: "", region: "", fullAddress: "", mobile: "", email: "" });
  const [files, setFiles] = useState({ photo: null, aadhaar: null, signature: null });
  const [state, setState] = useState({ loading: true, submitting: false, error: "", success: null });
  useEffect(() => { API.get(`/exams/${slug}`).then(({ data }) => { setExam(data); setState((old) => ({ ...old, loading: false })); }).catch((error) => setState((old) => ({ ...old, loading: false, error: error.response?.data?.message || "Registration is not available." }))); }, [slug]);
  const update = (event) => setForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (Object.values(form).some((value) => !String(value).trim())) return setState((old) => ({ ...old, error: "Please complete every required field." }));
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setState((old) => ({ ...old, error: "Please enter a valid email address." }));
    if (!/^\+?[0-9][0-9\s-]{8,14}$/.test(form.mobile)) return setState((old) => ({ ...old, error: "Please enter a valid WhatsApp mobile number." }));
    if (!files.photo || !files.aadhaar || !files.signature) return setState((old) => ({ ...old, error: "Student photograph, signature and Aadhaar Card are required." }));
    if ([files.photo, files.aadhaar, files.signature].some((file) => file.size > 5 * 1024 * 1024)) return setState((old) => ({ ...old, error: "Each document must be 5 MB or smaller." }));
    const payload = new FormData(); Object.entries(form).forEach(([key, value]) => payload.append(key, value)); Object.entries(files).forEach(([key, value]) => payload.append(key, value));
    setState((old) => ({ ...old, submitting: true, error: "" }));
    try { const { data } = await API.post(`/exams/${slug}/registrations`, payload); setState((old) => ({ ...old, submitting: false, success: data })); }
    catch (error) { setState((old) => ({ ...old, submitting: false, error: error.response?.data?.message || "Registration could not be submitted. Please try again." })); }
  };
  const submitProof = async ({ transactionReference, paymentDate, proof }) => {
    const payload = new FormData(); payload.append("accessToken", state.success.paymentIntent.accessToken); payload.append("transactionReference", transactionReference); payload.append("paymentDate", paymentDate); payload.append("proof", proof);
    await API.post(`/exams/payments/${state.success.paymentIntent.id}/proof`, payload);
  };
  if (state.loading) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin text-[#287080]" size={36} /></div>;
  if (!exam) return <div className="mx-auto max-w-2xl px-4 py-20"><div className="rounded-2xl border border-rose-200 bg-white p-8 text-center"><AlertCircle className="mx-auto text-rose-500" size={34} /><h1 className="mt-4 text-2xl font-bold text-[#102A43]">Registration unavailable</h1><p className="mt-2 text-slate-600">{state.error}</p></div></div>;
  if (state.success?.paymentIntent) return <UpiPaymentStep intent={state.success.paymentIntent} title="Complete workshop registration" description="Pay the exact registration fee using this organisation QR, then submit the payment proof for Admin verification." details={[["Student", state.success.studentName], ["Application", state.success.applicationNumber], ["Workshop", state.success.examination]]} onSubmit={submitProof} />;
  const closedCopy = exam.registrationState === "open" ? "" : exam.registrationState === "upcoming" ? `Registration opens on ${new Date(exam.registrationStart).toLocaleString("en-IN")}.` : "Registration Closed";
  return <div className="bg-[#F7F4EA] px-4 py-10 sm:py-14"><div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#D4B05F]/35 bg-white shadow-2xl"><header className="bg-[#102A43] px-6 py-8 text-white sm:px-10"><p className="text-xs font-bold uppercase tracking-[0.24em] text-[#D4B05F]">SSSS NYAS</p><h1 className="mt-3 text-2xl font-bold sm:text-4xl">{exam.title}</h1><p className="mt-2 text-lg text-white/75">Student Registration Form</p><div className="mt-5 flex flex-wrap gap-3 text-xs text-white/75"><span>Fee: ₹{Number(exam.registrationFee).toLocaleString("en-IN")}</span><span>Last date: {new Date(exam.registrationEnd).toLocaleDateString("en-IN")}</span><span>Duration: {exam.examDuration}</span><span>Event date & venue: {exam.examDate ? new Date(exam.examDate).toLocaleDateString("en-IN") : "To be announced"}</span></div></header><div className="p-6 sm:p-10">{closedCopy ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"><CalendarDays className="mx-auto text-amber-700" /><h2 className="mt-3 text-xl font-bold text-[#102A43]">{closedCopy}</h2></div> : <form onSubmit={submit} className="space-y-7" noValidate><div className="rounded-xl border border-[#D4B05F]/35 bg-[#FFF9EA] p-4 text-sm leading-6 text-[#6F541C]"><strong>Who can register:</strong> Classes {(exam.eligibleClassGroups || []).join(", ")} from {(exam.eligibleRegions || []).join(", ")}. A photograph, student signature and Aadhaar copy are mandatory.</div>{state.error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="shrink-0" size={19} />{state.error}</div>}<div className="grid gap-5 sm:grid-cols-2">{textFields.map(([name, label, type, placeholder]) => <Field key={name} name={name} label={label} type={type} placeholder={placeholder} value={form[name]} onChange={update} />)}<SelectField name="className" label="Class Group" value={form.className} onChange={update} options={exam.eligibleClassGroups || []} /><SelectField name="region" label="City / Region" value={form.region} onChange={update} options={exam.eligibleRegions || []} /></div><label className="block text-sm font-semibold text-slate-700">Full Address <span className="text-rose-600">*</span><textarea name="fullAddress" required rows="4" value={form.fullAddress} onChange={update} className="mt-2 w-full rounded-xl border border-slate-300 p-4" /></label><div className="grid gap-5 sm:grid-cols-3"><UploadField label="Passport-Size Photograph" accept="image/jpeg,image/png,image/webp" file={files.photo} onChange={(file) => setFiles((old) => ({ ...old, photo: file }))} /><UploadField label="Student Signature" accept="image/jpeg,image/png,image/webp" file={files.signature} onChange={(file) => setFiles((old) => ({ ...old, signature: file }))} /><UploadField label="Aadhaar Card" accept="image/jpeg,image/png,image/webp,application/pdf" file={files.aadhaar} onChange={(file) => setFiles((old) => ({ ...old, aadhaar: file }))} /></div><p className="flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={17} className="shrink-0 text-[#287080]" />Documents and payment proof are stored privately and reviewed only by authorised Admin users.</p><button disabled={state.submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#102A43] px-5 py-3 font-bold text-white disabled:opacity-60">{state.submitting ? <><LoaderCircle className="animate-spin" size={19} />Submitting securely…</> : <><FileCheck2 size={19} />Continue to ₹{Number(exam.registrationFee).toLocaleString("en-IN")} Payment</>}</button></form>}</div></div></div>;
};
const Field = ({ name, label, type, value, onChange, placeholder }) => <label className="block text-sm font-semibold text-slate-700">{label} <span className="text-rose-600">*</span><input name={name} type={type} required value={value} onChange={onChange} placeholder={placeholder} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4" /></label>;
const SelectField = ({ name, label, value, onChange, options }) => <label className="block text-sm font-semibold text-slate-700">{label} <span className="text-rose-600">*</span><select name={name} required value={value} onChange={onChange} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4"><option value="">Select</option>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
const UploadField = ({ label, accept, file, onChange }) => <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center"><input type="file" required accept={accept} className="sr-only" onChange={(event) => onChange(event.target.files?.[0] || null)} /><UploadCloud className="text-[#287080]" /><span className="mt-3 text-sm font-bold text-slate-700">{label} *</span><span className="mt-1 max-w-full truncate text-xs text-slate-500">{file ? file.name : "Choose a file"}</span></label>;
export default ExamRegistration;

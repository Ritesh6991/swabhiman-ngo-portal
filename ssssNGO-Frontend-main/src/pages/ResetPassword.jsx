import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { resetPassword } from "../services/authService";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(form.password)) return setStatus({ type: "error", text: "Use 8+ characters with uppercase, lowercase, and a number." });
    if (form.password !== form.confirm) return setStatus({ type: "error", text: "Passwords do not match." });
    const token = params.get("token");
    if (!token) return setStatus({ type: "error", text: "This reset link is incomplete." });
    setLoading(true);
    try { const response = await resetPassword({ token, password: form.password }); setStatus({ type: "success", text: response.data.message }); }
    catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Password could not be reset." }); }
    finally { setLoading(false); }
  };
  return <AuthLayout eyebrow="Secure password reset" title="Choose a new password" description="Reset links expire after 30 minutes and can only be used once.">
    <form onSubmit={submit} className="space-y-5">{status.text && <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{status.text}</div>}{status.type !== "success" && <><div><label htmlFor="new-password" className="form-label">New password</label><div className="relative"><input id="new-password" type={show ? "text" : "password"} className="form-input pr-12" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /><button type="button" className="absolute right-3 top-2.5 rounded-lg p-1.5 text-slate-500" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></div><div><label htmlFor="confirm-password" className="form-label">Confirm new password</label><input id="confirm-password" type={show ? "text" : "password"} className="form-input" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" /></div><button disabled={loading} className="primary-button">{loading ? <><LoaderCircle className="mr-2 animate-spin" size={19} /> Updating...</> : "Update password"}</button></>}<p className="text-center text-sm"><Link to="/login" className="font-semibold text-[#1E6674] hover:underline">Return to sign in</Link></p></form>
  </AuthLayout>;
};
export default ResetPassword;

import { useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, MailCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { recoverLoginId } from "../services/authService";

const ForgotLoginId = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setStatus({ type: "error", text: "Enter a valid email address." });
    setLoading(true);
    try { const response = await recoverLoginId(email.trim()); setStatus({ type: "success", text: response.data.message }); }
    catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Recovery is temporarily unavailable." }); }
    finally { setLoading(false); }
  };
  return <AuthLayout eyebrow="Account recovery" title="Recover login or member ID" description="Your registered email is your login ID. We can also send your member ID, if one has been issued.">
    <form onSubmit={submit} className="space-y-5">{status.text && <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{status.type === "success" && <MailCheck className="mr-2 inline" size={17} />}{status.text}</div>}<div><label htmlFor="id-email" className="form-label">Registered email</label><input id="id-email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></div><button disabled={loading} className="primary-button">{loading ? <><LoaderCircle className="mr-2 animate-spin" size={19} /> Sending...</> : "Send recovery details"}</button><p className="text-center text-sm"><Link to="/login" className="font-semibold text-[#1E6674] hover:underline">Back to sign in</Link></p></form>
  </AuthLayout>;
};
export default ForgotLoginId;

import { useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, MailCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { requestPasswordReset } from "../services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid registered email address.");
    setLoading(true);
    try { const response = await requestPasswordReset(email.trim()); setMessage(response.data.message); }
    catch (requestError) { setError(requestError.response?.data?.message || "Recovery is temporarily unavailable."); }
    finally { setLoading(false); }
  };
  return <AuthLayout eyebrow="Account recovery" title="Reset your password" description="We will send a secure, single-use reset link to your registered email address.">
    {message ? <div className="text-center"><MailCheck className="mx-auto text-[#1E6674]" size={42} /><h2 className="mt-4 text-xl font-bold text-[#0B2948]">Check your email</h2><p className="mt-2 text-sm leading-6 text-slate-600">{message}</p><Link to="/login" className="mt-6 inline-block font-semibold text-[#1E6674] hover:underline">Return to sign in</Link></div> :
      <form onSubmit={submit} noValidate className="space-y-5"><div><label htmlFor="recovery-email" className="form-label">Registered email</label><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="name@example.com" />{error && <p role="alert" className="form-error">{error}</p>}</div><button disabled={loading} className="primary-button">{loading ? <><LoaderCircle className="mr-2 animate-spin" size={19} /> Sending...</> : "Send secure reset link"}</button><p className="text-center text-sm"><Link to="/login" className="font-semibold text-[#1E6674] hover:underline">Back to sign in</Link></p></form>}
  </AuthLayout>;
};
export default ForgotPassword;

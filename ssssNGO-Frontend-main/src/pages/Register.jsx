import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { registerUser } from "../services/authService";
import AuthLayout from "../components/AuthLayout";

const emptyForm = { name: "", email: "", phone: "", password: "", confirmPassword: "" };

const Register = () => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.phone && !/^\+?[0-9]{10,15}$/.test(form.phone.replace(/\s/g, ""))) next.phone = "Use 10-15 digits, optionally beginning with +.";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(form.password)) next.password = "Use 8+ characters with uppercase, lowercase, and a number.";
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      navigate("/login", { replace: true, state: { message: "Account created. You can now sign in." } });
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration could not be completed. Please try again.");
    } finally { setLoading(false); }
  };

  const field = (name, label, type = "text", placeholder = "") => (
    <div><label htmlFor={name} className="form-label">{label}</label><input id={name} name={name} type={type} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} className="form-input" placeholder={placeholder} aria-invalid={Boolean(errors[name])} />{errors[name] && <p className="form-error">{errors[name]}</p>}</div>
  );

  return (
    <AuthLayout eyebrow="Join the community" title="Create your account" description="Start with a secure account. Membership details and payment come later in a guided flow.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {message && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</div>}
        {field("name", "Full name", "text", "As shown on your official documents")}
        <div className="grid gap-4 sm:grid-cols-2">{field("email", "Email address", "email", "name@example.com")}{field("phone", "Phone number (optional)", "tel", "+91 98765 43210")}</div>
        <div><label htmlFor="password" className="form-label">Create password</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="form-input pr-12" placeholder="Minimum 8 characters" aria-invalid={Boolean(errors.password)} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>{errors.password && <p className="form-error">{errors.password}</p>}</div>
        {field("confirmPassword", "Confirm password", showPassword ? "text" : "password", "Re-enter your password")}
        <div className="rounded-xl bg-[#F0F6F6] px-4 py-3 text-sm text-slate-700"><p className="flex items-center gap-2 font-semibold text-[#1E6674]"><CheckCircle2 size={17} /> Password requirements</p><p className="mt-1 pl-6">At least 8 characters, one uppercase letter, one lowercase letter, and one number.</p></div>
        <button type="submit" disabled={loading} className="primary-button">{loading ? <><LoaderCircle className="mr-2 animate-spin" size={19} /> Creating account...</> : "Create secure account"}</button>
        <p className="text-center text-sm text-slate-600">Already registered? <Link to="/login" className="font-semibold text-[#1E6674] hover:underline">Sign in</Link></p>
      </form>
    </AuthLayout>
  );
};

export default Register;

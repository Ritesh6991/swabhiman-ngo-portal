import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid registered email address.";
    if (!form.password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await loginUser({ email: form.email.trim(), password: form.password });
      localStorage.setItem("token", response.data.token);
      login(response.data.user);
      navigate(["admin", "owner"].includes(response.data.user.role) ? "/admin" : "/home", { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || "We could not sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="Welcome back" title="Sign in to your account" description="Access your membership, community directory, and administration tools.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {message && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</div>}
        <div>
          <label htmlFor="email" className="form-label">Registered email</label>
          <div className="relative"><Mail className="absolute left-4 top-3.5 text-slate-400" size={19} /><input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input pl-12" placeholder="name@example.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} /></div>
          {errors.email && <p id="email-error" className="form-error">{errors.email}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between gap-4"><label htmlFor="password" className="form-label">Password</label><Link to="/forgot-password" className="mb-1.5 text-sm font-semibold text-[#1E6674] hover:underline">Forgot password?</Link></div>
          <div className="relative"><LockKeyhole className="absolute left-4 top-3.5 text-slate-400" size={19} /><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="form-input px-12" placeholder="Enter your password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
          {errors.password && <p id="password-error" className="form-error">{errors.password}</p>}
        </div>
        <button type="submit" disabled={loading} className="primary-button">{loading ? <><LoaderCircle className="mr-2 animate-spin" size={19} /> Signing in...</> : "Sign in securely"}</button>
        <div className="flex flex-col items-center justify-center gap-2 border-t border-slate-200 pt-5 text-sm sm:flex-row sm:gap-4">
          <Link to="/register" className="font-semibold text-[#0B2948] hover:underline">Create an account</Link><span className="hidden text-slate-300 sm:block">•</span><Link to="/forgot-login-id" className="font-semibold text-[#1E6674] hover:underline">Forgot login or member ID?</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;

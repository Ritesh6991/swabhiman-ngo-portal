import { Link } from "react-router-dom";
import { ShieldCheck, HeartHandshake, GraduationCap } from "lucide-react";
import logo from "../assets/logo.png";

const highlights = [
  [ShieldCheck, "Secure member access", "Your account and membership information are protected."],
  [GraduationCap, "Education with purpose", "Supporting opportunity, culture, and community growth."],
  [HeartHandshake, "A trusted community", "Built for members, volunteers, and supporters."],
];

const AuthLayout = ({ eyebrow, title, description, children }) => (
  <main className="min-h-screen bg-[#F7F3E8] lg:grid lg:grid-cols-[0.92fr_1.08fr]">
    <section className="relative hidden overflow-hidden bg-[#0B2948] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div className="absolute -bottom-36 -left-28 h-96 w-96 rounded-full bg-[#1E6674]/30" />
      <Link to="/" className="relative flex items-center gap-4" aria-label="Return to home">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-lg">
          <img src={logo} alt="Swabhiman Shiksha Sanskriti Samajotthan Nyas logo" className="h-full w-full object-contain" />
        </span>
        <span>
          <span className="block text-xl font-bold">Swabhiman</span>
          <span className="text-sm text-slate-300">Shiksha Sanskriti Samajotthan Nyas</span>
        </span>
      </Link>

      <div className="relative max-w-lg">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#D8B968]">Member portal</p>
        <h2 className="text-4xl font-bold leading-tight">A professional home for meaningful community work.</h2>
        <div className="mt-10 space-y-6">
          {highlights.map(([Icon, heading, copy]) => (
            <div key={heading} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#E6CB83]"><Icon size={21} /></span>
              <div><h3 className="font-semibold">{heading}</h3><p className="mt-1 text-sm leading-6 text-slate-300">{copy}</p></div>
            </div>
          ))}
        </div>
      </div>
      <p className="relative text-xs text-slate-400">Swabhiman Shiksha Sanskriti Samajotthan Nyas</p>
    </section>

    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-9 flex items-center gap-3 lg:hidden">
          <img src={logo} alt="Swabhiman Shiksha Sanskriti Samajotthan Nyas logo" className="h-12 w-12 object-contain" />
          <span>
            <span className="block font-bold leading-tight text-[#0B2948]">Swabhiman</span>
            <span className="block text-xs leading-tight text-slate-600">Shiksha Sanskriti Samajotthan Nyas</span>
          </span>
        </Link>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1E6674]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0B2948] sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-md leading-7 text-slate-600">{description}</p>
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(11,41,72,0.10)] sm:p-8">
          {children}
        </div>
      </div>
    </section>
  </main>
);

export default AuthLayout;

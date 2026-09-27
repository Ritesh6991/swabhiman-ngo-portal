import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, CreditCard, FilePlus2, HandCoins, LayoutDashboard, LogOut, Menu, Newspaper, ReceiptIndianRupee, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const groups = [
  { label: "Overview", items: [["/admin", "Dashboard", LayoutDashboard, true]] },
  { label: "Membership", items: [["/admin/requests", "Applications", UserRoundCheck], ["/admin/members", "Members", UsersRound], ["/admin/payments", "Payments & Delivery", CreditCard]] },
  { label: "Donations", items: [["/admin/donations", "Verification", HandCoins]] },
  { label: "Content", items: [["/admin/upload", "Upload Post", FilePlus2], ["/admin/posts", "Manage Posts", Newspaper]] },
  { label: "Insights", items: [["/admin/analytics", "Analytics", BarChart3]] },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const ownerGroup = user?.role === "owner" ? [{ label: "Owner / Finance", items: [["/admin/accounts", "Private Accounts", ReceiptIndianRupee]] }] : [];
  const allGroups = [...groups, ...ownerGroup];
  const current = allGroups.flatMap((group) => group.items).find(([to, , , end]) => end ? pathname === to : pathname.startsWith(to));
  const signOut = () => { logout(); navigate("/login"); };

  const Sidebar = () => <div className="flex h-full flex-col bg-[#0C2744] text-white"><div className="flex items-center gap-3 border-b border-white/10 px-5 py-5"><img src={logo} alt="Swabhiman logo" className="h-11 w-11 rounded-xl bg-white object-contain p-1" /><div className="min-w-0"><p className="truncate text-base font-bold">Swabhiman</p><p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Operations Centre</p></div></div><nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Admin navigation">{allGroups.map((group) => <div key={group.label}><p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">{group.label}</p><div className="mt-2 space-y-1">{group.items.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={Boolean(end)} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-white text-[#0C2744] shadow-lg" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon size={18} /><span>{label}</span></NavLink>)}</div></div>)}</nav><div className="border-t border-white/10 p-4"><div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#D4B05F] font-bold text-[#0C2744]">{user?.name?.charAt(0)?.toUpperCase() || "A"}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.name || "Administrator"}</p><p className="text-[10px] font-bold uppercase tracking-wider text-[#D4B05F]">{user?.role}</p></div></div><button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/10 hover:text-white"><LogOut size={18} />Sign out</button></div></div>;

  return <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]"><aside className="sticky top-0 hidden h-screen lg:block"><Sidebar /></aside>{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/55" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[286px] shadow-2xl"><Sidebar /></aside></div>}<div className="min-w-0"><header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button aria-label="Open Admin navigation" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-[#0C2744] lg:hidden"><Menu size={20} /></button><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#287080]">Swabhiman Nyas</p><p className="font-bold text-[#102A43]">{current?.[1] || "Administration"}</p></div></div><div className="flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-sm font-semibold text-slate-700">{user?.name || "Administrator"}</span><span className="block text-[10px] uppercase tracking-wider text-slate-400">Secure session</span></span><span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4B05F]/40 bg-[#FFF9EA] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8A641D]"><ShieldCheck size={14} />{user?.role}</span></div></header><main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1440px]"><Outlet /></div></main></div></div>;
};

export default AdminLayout;

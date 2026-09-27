import { useEffect, useState } from "react";
import { RefreshCw, Search, UsersRound } from "lucide-react";
import API from "../services/api";
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, ToolbarButton } from "../components/admin/AdminUI";

const AdminMembers = () => {
  const [members, setMembers] = useState([]); const [city, setCity] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const fetchMembers = async (searchCity = "") => { try { setLoading(true); setError(""); const response = await API.get(searchCity ? `/membership/search?city=${encodeURIComponent(searchCity)}` : "/membership/search"); setMembers(response.data); } catch (requestError) { setError(requestError.response?.data?.message || "Members could not be loaded."); } finally { setLoading(false); } };
  useEffect(() => { fetchMembers(); }, []);
  const searchMembers = () => fetchMembers(city.trim()); const resetSearch = () => { setCity(""); fetchMembers(); };
  return <main className="space-y-6">
    <PageHeader eyebrow="Membership directory" title="Members" description="Search approved member records by city and view their core membership details." actions={<ToolbarButton onClick={() => fetchMembers(city.trim())}><RefreshCw size={17} />Refresh</ToolbarButton>} />
    <SectionCard title="Find a member" description="Leave the city blank to show the full directory."><div className="flex flex-col gap-3 p-5 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search by city</span><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><input value={city} onChange={(event) => setCity(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchMembers()} placeholder="Search by city" className="form-input pl-10" /></label><ToolbarButton primary onClick={searchMembers}><Search size={17} />Search</ToolbarButton><ToolbarButton onClick={resetSearch}>Clear</ToolbarButton></div></SectionCard>
    {error && <ErrorState message={error} onRetry={() => fetchMembers(city.trim())} />}
    <SectionCard title={`${members.length} member${members.length === 1 ? "" : "s"}`} description={city ? `Filtered by ${city}` : "Approved membership directory"}>
      {loading ? <LoadingState label="Loading members…" /> : !members.length ? <EmptyState title="No members found" description={city ? "Try another city or clear the search." : "Approved members will appear here."} /> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Member</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Member ID</th><th className="px-5 py-3">Joined</th></tr></thead><tbody>{members.map((member) => <tr key={member._id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4"><p className="font-bold text-[#102A43]">{member.name}</p><p className="mt-1 text-xs text-slate-500">{member.email}</p></td><td className="px-4 py-4">{member.city || "Not recorded"}</td><td className="px-4 py-4 font-semibold">{member.memberId || "Not assigned"}</td><td className="px-5 py-4">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "Not recorded"}</td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{members.map((member) => <article key={member._id} className="p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#287080]/10 text-[#287080]"><UsersRound size={19} /></span><div className="min-w-0"><h3 className="font-bold text-[#102A43]">{member.name}</h3><p className="break-all text-sm text-slate-500">{member.email}</p></div></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">City</dt><dd className="font-semibold">{member.city || "Not recorded"}</dd></div><div><dt className="text-xs text-slate-500">Member ID</dt><dd className="font-semibold">{member.memberId || "Not assigned"}</dd></div><div><dt className="text-xs text-slate-500">Joined</dt><dd>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "Not recorded"}</dd></div></dl></article>)}</div>
      </>}
    </SectionCard>
  </main>;
};
export default AdminMembers;

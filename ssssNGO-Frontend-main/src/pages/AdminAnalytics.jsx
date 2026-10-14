import { useEffect, useState } from "react";
import { Eye, FileText, Hourglass, RefreshCw, UserRoundCheck, UsersRound } from "lucide-react";
import API from "../services/api";
import { ErrorState, LoadingState, PageHeader, SectionCard, StatCard, ToolbarButton } from "../components/admin/AdminUI";

const displayDay = (day) => {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
};

const AdminAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [error, setError] = useState("");
  const loadStats = async () => { try { setError(""); const [statsResponse, trafficResponse] = await Promise.all([API.get("/admin/stats"), API.get("/analytics/traffic")]); setStats(statsResponse.data); setTraffic(trafficResponse.data); } catch (requestError) { setError(requestError.response?.data?.message || "Analytics could not be loaded."); } };
  useEffect(() => { loadStats(); }, []);
  const maxViews = Math.max(1, ...(traffic?.lastSevenDays || []).map((item) => item.pageViews));

  return <main className="space-y-6">
    <PageHeader eyebrow="Operational intelligence" title="Analytics" description="A live, concise view of participation and the work waiting for the team." actions={<ToolbarButton onClick={loadStats}><RefreshCw size={17} />Refresh</ToolbarButton>} />
    {error && <ErrorState message={error} onRetry={loadStats} />}
    {(!stats || !traffic) && !error ? <SectionCard><LoadingState label="Loading analytics…" /></SectionCard> : stats && traffic && <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered users" value={stats.totalUsers ?? 0} detail="All user accounts" icon={UsersRound} />
        <StatCard label="Active members" value={stats.members ?? 0} detail="Approved membership records" icon={UserRoundCheck} tone="teal" />
        <StatCard label="Pending requests" value={stats.pendingRequests ?? 0} detail="Requires team review" icon={Hourglass} tone="gold" />
        <StatCard label="Published posts" value={stats.totalPosts ?? 0} detail="Public updates and media" icon={FileText} tone="light" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's page views" value={traffic.today.pageViews} detail="Every public page opened today" icon={Eye} tone="teal" />
        <StatCard label="Today's visitors" value={traffic.today.uniqueVisitors} detail="Anonymous unique visitors today" icon={UsersRound} tone="gold" />
        <StatCard label="Yesterday's page views" value={traffic.yesterday.pageViews} detail="Previous calendar day" icon={Eye} tone="light" />
        <StatCard label="7-day page views" value={traffic.lastSevenDays.reduce((sum, item) => sum + item.pageViews, 0)} detail="Rolling daily traffic total" icon={Eye} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard title="Daily website traffic" description="Public page views and anonymous visitors for the last 7 days.">
          <div className="flex h-64 items-end gap-2 p-5 sm:gap-4">
            {traffic.lastSevenDays.map((item) => <div key={item.day} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><div className="mb-2 text-xs font-bold text-[#102A43]">{item.pageViews}</div><div className="mx-auto w-full max-w-12 rounded-t-lg bg-[#287080]" style={{ height: `${Math.max(4, (item.pageViews / maxViews) * 100)}%` }} role="img" aria-label={`${item.pageViews} page views and ${item.uniqueVisitors} visitors on ${item.day}`} /><p className="mt-2 text-[11px] font-semibold text-slate-500">{displayDay(item.day)}</p><p className="text-[10px] text-slate-400">{item.uniqueVisitors} visitors</p></div>)}
          </div>
        </SectionCard>
        <SectionCard title="Top public pages" description="Most viewed routes in the last 7 days.">
          <div className="divide-y divide-slate-100">{traffic.topPages.length ? traffic.topPages.map((item) => <div key={item.path} className="flex items-center justify-between gap-4 px-5 py-4"><span className="min-w-0 truncate text-sm font-semibold text-slate-700">{item.path}</span><span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[#102A43]">{item.pageViews}</span></div>) : <p className="p-5 text-sm text-slate-500">Traffic will appear here after visitors open public pages.</p>}</div>
        </SectionCard>
      </section>
      <SectionCard title="How to use this view" description="These figures are drawn from the live system."><div className="grid gap-4 p-5 text-sm text-slate-600 md:grid-cols-3"><p><strong className="block text-[#102A43]">Act on pending work</strong>Open Membership Requests to verify applications that need attention.</p><p><strong className="block text-[#102A43]">Watch participation</strong>Use member and user totals as a quick operational health check.</p><p><strong className="block text-[#102A43]">Keep communication current</strong>Review published posts so public updates stay timely.</p></div></SectionCard>
    </>}
  </main>;
};
export default AdminAnalytics;

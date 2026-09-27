import { useEffect, useState } from "react";
import { FileText, Hourglass, RefreshCw, UserRoundCheck, UsersRound } from "lucide-react";
import API from "../services/api";
import { ErrorState, LoadingState, PageHeader, SectionCard, StatCard, ToolbarButton } from "../components/admin/AdminUI";

const AdminAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const loadStats = async () => { try { setError(""); const response = await API.get("/admin/stats"); setStats(response.data); } catch (requestError) { setError(requestError.response?.data?.message || "Analytics could not be loaded."); } };
  useEffect(() => { loadStats(); }, []);

  return <main className="space-y-6">
    <PageHeader eyebrow="Operational intelligence" title="Analytics" description="A live, concise view of participation and the work waiting for the team." actions={<ToolbarButton onClick={loadStats}><RefreshCw size={17} />Refresh</ToolbarButton>} />
    {error && <ErrorState message={error} onRetry={loadStats} />}
    {!stats && !error ? <SectionCard><LoadingState label="Loading analytics…" /></SectionCard> : stats && <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered users" value={stats.totalUsers ?? 0} detail="All user accounts" icon={UsersRound} />
        <StatCard label="Active members" value={stats.members ?? 0} detail="Approved membership records" icon={UserRoundCheck} tone="teal" />
        <StatCard label="Pending requests" value={stats.pendingRequests ?? 0} detail="Requires team review" icon={Hourglass} tone="gold" />
        <StatCard label="Published posts" value={stats.totalPosts ?? 0} detail="Public updates and media" icon={FileText} tone="light" />
      </section>
      <SectionCard title="How to use this view" description="These figures are drawn from the live system."><div className="grid gap-4 p-5 text-sm text-slate-600 md:grid-cols-3"><p><strong className="block text-[#102A43]">Act on pending work</strong>Open Membership Requests to verify applications that need attention.</p><p><strong className="block text-[#102A43]">Watch participation</strong>Use member and user totals as a quick operational health check.</p><p><strong className="block text-[#102A43]">Keep communication current</strong>Review published posts so public updates stay timely.</p></div></SectionCard>
    </>}
  </main>;
};
export default AdminAnalytics;

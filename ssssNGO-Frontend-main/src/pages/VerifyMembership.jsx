import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BadgeCheck, CircleAlert, LoaderCircle } from "lucide-react";
import API from "../services/api";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN", {
  day: "2-digit", month: "long", year: "numeric",
}) : "No expiry";

export default function VerifyMembership() {
  const { memberId } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    let active = true;
    API.get(`/member/verify/${encodeURIComponent(memberId)}`)
      .then(({ data }) => active && setState({ loading: false, data, error: "" }))
      .catch((error) => active && setState({
        loading: false,
        data: null,
        error: error.response?.data?.message || "Membership could not be verified.",
      }));
    return () => { active = false; };
  }, [memberId]);

  if (state.loading) return (
    <main className="grid min-h-[65vh] place-items-center bg-slate-50 px-4">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600"><LoaderCircle className="animate-spin" /> Verifying membership…</div>
    </main>
  );

  const member = state.data?.member;
  const verified = state.data?.verified;
  return (
    <main className="min-h-[65vh] bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className={`px-7 py-8 text-white ${verified ? "bg-[#102A43]" : "bg-slate-700"}`}>
          <div className="flex items-center gap-3">
            {verified ? <BadgeCheck size={36} className="text-amber-400" /> : <CircleAlert size={36} />}
            <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Membership verification</p><h1 className="mt-1 text-3xl font-black">{verified ? "Verified active member" : "Membership not active"}</h1></div>
          </div>
        </div>
        {member ? (
          <dl className="grid gap-5 p-7 text-sm sm:grid-cols-2">
            <div><dt className="font-bold uppercase tracking-wide text-slate-500">Member name</dt><dd className="mt-1 text-xl font-black text-[#102A43]">{member.name}</dd></div>
            <div><dt className="font-bold uppercase tracking-wide text-slate-500">Member ID</dt><dd className="mt-1 text-xl font-black text-[#102A43]">{member.memberId}</dd></div>
            <div><dt className="font-bold uppercase tracking-wide text-slate-500">Membership</dt><dd className="mt-1 font-bold capitalize text-slate-800">{member.membershipType || "Member"}</dd></div>
            <div><dt className="font-bold uppercase tracking-wide text-slate-500">Valid until</dt><dd className="mt-1 font-bold text-slate-800">{formatDate(member.validTill)}</dd></div>
          </dl>
        ) : <p className="p-7 text-slate-700">{state.error}</p>}
        <p className="border-t border-slate-100 px-7 py-5 text-xs leading-relaxed text-slate-500">This page verifies membership directly against the official Swabhiman Shiksha Sanskriti Samajotthan Nyas records.</p>
      </section>
    </main>
  );
}

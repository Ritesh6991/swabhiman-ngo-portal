import { CalendarDays, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const AnnouncementBar = ({ announcement, compact = false }) => {
  if (!announcement) return null;
  const registerClosed = announcement.registrationState === "closed";
  if (compact) return (
    <section className="mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Important announcement">
      <div className="relative overflow-hidden rounded-3xl border border-[#D4B05F]/35 bg-white p-6 shadow-xl sm:p-8">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#D4B05F]" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#287080]"><CalendarDays size={16} />Important registration notice</p><h2 className="mt-3 text-xl font-bold text-[#102A43] sm:text-2xl">{announcement.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{announcement.message}</p></div>
          {announcement.ctaLink && <Link to={announcement.ctaLink} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${registerClosed ? "border border-slate-200 bg-slate-50 text-slate-600" : "bg-[#102A43] text-white hover:bg-[#287080]"}`}>{announcement.ctaLabel || "View details"}<ChevronRight size={18} /></Link>}
        </div>
      </div>
    </section>
  );
  return (
    <aside className="border-b border-[#D4B05F]/25 bg-[#102A43] text-white" aria-label="Live website notice">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm leading-5"><strong>{announcement.title}</strong><span className="mx-2 hidden text-[#D4B05F] sm:inline">•</span><span className="block text-white/75 sm:inline">{announcement.message}</span></p>
        {announcement.ctaLink && <Link to={announcement.ctaLink} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start rounded-lg bg-[#D4B05F] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#102A43] sm:self-auto">{announcement.ctaLabel || "View details"}<ChevronRight size={15} /></Link>}
      </div>
    </aside>
  );
};

export default AnnouncementBar;

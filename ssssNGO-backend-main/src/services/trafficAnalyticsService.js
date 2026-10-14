const crypto = require("crypto");

const timeZone = "Asia/Kolkata";

const formatTrafficDay = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const trafficDayRange = (days, now = new Date()) => Array.from(
  { length: days },
  (_, index) => formatTrafficDay(new Date(now.getTime() - ((days - index - 1) * 24 * 60 * 60 * 1000))),
);

const normalizePublicPath = (value) => {
  const rawPath = String(value || "").trim().split(/[?#]/, 1)[0];
  if (!rawPath.startsWith("/") || rawPath.length > 160) return null;
  const path = rawPath.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  if (/^\/admin(?:\/|$)/i.test(path)) return null;
  if (/^\/posts\/[a-f\d]{24}$/i.test(path)) return "/posts/:id";
  if (/^\/verify\/[^/]+$/i.test(path)) return "/verify/:memberId";
  if (/^\/exam-registration\/[^/]+$/i.test(path)) return "/exam-registration/:exam";
  return path.toLowerCase();
};

const hashDailyVisitor = (visitorId, day, secret) => crypto
  .createHash("sha256")
  .update(`${day}:${visitorId}:${secret}`)
  .digest("hex");

const fillDailyTraffic = (rows, dayKeys) => {
  const byDay = new Map(rows.map((row) => [row._id, row]));
  return dayKeys.map((day) => {
    const row = byDay.get(day);
    return {
      day,
      pageViews: row?.pageViews || 0,
      uniqueVisitors: row?.visitors?.length || 0,
    };
  });
};

module.exports = {
  fillDailyTraffic,
  formatTrafficDay,
  hashDailyVisitor,
  normalizePublicPath,
  trafficDayRange,
};

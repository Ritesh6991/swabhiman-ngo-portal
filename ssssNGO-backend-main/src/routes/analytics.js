const express = require("express");
const rateLimit = require("express-rate-limit");
const PageView = require("../models/PageView");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const {
  fillDailyTraffic,
  formatTrafficDay,
  hashDailyVisitor,
  normalizePublicPath,
  trafficDayRange,
} = require("../services/trafficAnalyticsService");

const router = express.Router();
const pageViewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/page-view", pageViewLimiter, async (req, res, next) => {
  try {
    const path = normalizePublicPath(req.body?.path);
    const visitorId = String(req.body?.visitorId || "").trim();
    const userAgent = String(req.headers["user-agent"] || "");
    if (!path || !/^[a-zA-Z0-9_-]{16,100}$/.test(visitorId) || /bot|crawl|spider|slurp/i.test(userAgent)) {
      return res.status(204).end();
    }

    const day = formatTrafficDay();
    const secret = process.env.TRAFFIC_HASH_SALT || process.env.JWT_SECRET;
    if (!secret) return res.status(204).end();

    await PageView.create({
      day,
      path,
      visitorHash: hashDailyVisitor(visitorId, day, secret),
      device: /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop",
    });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/traffic", auth, admin, async (_req, res, next) => {
  try {
    const dayKeys = trafficDayRange(14);
    const dailyRows = await PageView.aggregate([
      { $match: { day: { $in: dayKeys } } },
      { $group: { _id: "$day", pageViews: { $sum: 1 }, visitors: { $addToSet: "$visitorHash" } } },
    ]);
    const daily = fillDailyTraffic(dailyRows, dayKeys);
    const lastSevenDays = daily.slice(-7);
    const topPages = await PageView.aggregate([
      { $match: { day: { $in: dayKeys.slice(-7) } } },
      { $group: { _id: "$path", pageViews: { $sum: 1 } } },
      { $sort: { pageViews: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, path: "$_id", pageViews: 1 } },
    ]);

    res.json({
      today: lastSevenDays.at(-1),
      yesterday: lastSevenDays.at(-2),
      lastSevenDays,
      topPages,
      privacy: "Anonymous daily counts; no IP addresses or personal identities are stored.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

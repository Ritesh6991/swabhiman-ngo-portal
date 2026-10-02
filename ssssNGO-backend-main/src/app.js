const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/admin");

const app = express();

// Public Render traffic reaches the service through Cloudflare and Render's
// single internal proxy hop. Use Cloudflare's edge-generated client address and
// discard any caller-supplied forwarding chain. If that edge header is absent,
// fail closed to the proxy socket address instead of trusting spoofable input.
app.use((req, _res, next) => {
  if (process.env.RENDER === "true") {
    const edgeClientIp = String(req.headers["cf-connecting-ip"] || "").trim();
    if (edgeClientIp) req.headers["x-forwarded-for"] = edgeClientIp;
    else delete req.headers["x-forwarded-for"];
  }
  next();
});
app.set("trust proxy", 1);

// ================= MIDDLEWARE =================
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); },
}));

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://127.0.0.1:5173")
  .split(",").map((value) => value.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origin not allowed");
    error.status = 403;
    callback(error);
  },
  credentials: true,
}));


// Membership identity documents are private and must never be served as static files.
app.use("/uploads/docs", (_req, res) => res.status(404).end());
app.use("/uploads/private", (_req, res) => res.status(404).end());
app.use("/uploads/receipts", (_req, res) => res.status(404).end());

app.use("/sangathan-assets", express.static(path.resolve(__dirname, "assets", "sangathan"), {
  dotfiles: "deny",
  index: false,
  maxAge: "7d",
}));

// ================= STATIC UPLOADS =================
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads"), {
  dotfiles: "deny",
  index: false,
  maxAge: "1h",
}));

// ================= ROUTES =================
app.use("/api/member", require("./routes/member"));
app.use("/api/membership", require("./routes/membership"));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/posts", require("./routes/post"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/sangathan", require("./routes/sangathan"));
app.use("/api/admin/donations", require("./routes/adminDonations"));
app.use("/api/accounts", require("./routes/accounts"));
app.use("/api/exams", require("./routes/exams"));
app.use("/api/announcements", require("./routes/announcements"));

app.get("/", (req, res) => {
  res.send("NGO API is running");
});

app.get("/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
    database: databaseReady ? "connected" : "disconnected",
  });
});

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.message);
  const status = error.status || (error.name === "ValidationError" ? 400 : 500);
  res.status(status).json({ message: status < 500 ? error.message : "Unexpected server error" });
});

module.exports = app;

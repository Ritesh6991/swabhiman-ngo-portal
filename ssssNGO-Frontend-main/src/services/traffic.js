import API from "./api.js";
import { isTrackablePath } from "../utils/trafficTracking.js";

const visitorKey = "ssss:traffic-visitor:v1";
const lastViewKey = "ssss:traffic-last-view:v1";

const getVisitorId = () => {
  const existing = localStorage.getItem(visitorKey);
  if (existing) return existing;
  const created = globalThis.crypto?.randomUUID?.().replaceAll("-", "")
    || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(visitorKey, created);
  return created;
};

export const trackPageView = async (path) => {
  if (!isTrackablePath(path)) return false;
  const now = Date.now();
  const previous = JSON.parse(sessionStorage.getItem(lastViewKey) || "null");
  if (previous?.path === path && now - previous.at < 2000) return false;
  sessionStorage.setItem(lastViewKey, JSON.stringify({ path, at: now }));

  try {
    await API.post("/analytics/page-view", { path, visitorId: getVisitorId() }, { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
};

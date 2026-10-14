import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../services/traffic";
import { isTrackablePath } from "../utils/trafficTracking";

const PageViewTracker = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isTrackablePath(pathname)) return undefined;
    const run = () => { void trackPageView(pathname); };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(run, 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
};

export default PageViewTracker;

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { absoluteUrl, DEFAULT_DESCRIPTION, getRouteSeo, SITE_NAME } from "../utils/seo";

const DEFAULT_IMAGE = absoluteUrl("/logo.png");

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
}

function setCanonical(canonicalPath) {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalPath) {
    canonical?.remove();
    return;
  }
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = absoluteUrl(canonicalPath);
}

export function Seo({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = "/",
  robots = "index, follow",
  type = "website",
  image = DEFAULT_IMAGE,
}) {
  useEffect(() => {
    const canonicalUrl = canonicalPath ? absoluteUrl(canonicalPath) : null;
    document.title = title;
    setCanonical(canonicalPath);
    setMeta('meta[name="description"]', { name: "description", content: description });
    setMeta('meta[name="robots"]', { name: "robots", content: robots });
    setMeta('meta[property="og:type"]', { property: "og:type", content: type });
    setMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    setMeta('meta[property="og:title"]', { property: "og:title", content: title });
    setMeta('meta[property="og:description"]', { property: "og:description", content: description });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl || absoluteUrl("/") });
    setMeta('meta[property="og:image"]', { property: "og:image", content: image || DEFAULT_IMAGE });
    setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image || DEFAULT_IMAGE });
  }, [canonicalPath, description, image, robots, title, type]);

  return null;
}

export function RouteSeo() {
  const { pathname } = useLocation();
  return <Seo {...getRouteSeo(pathname)} />;
}

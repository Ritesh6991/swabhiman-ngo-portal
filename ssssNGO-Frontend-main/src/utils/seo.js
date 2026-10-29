export const SITE_NAME = "Swabhiman Shiksha Sanskriti Samajotthan Nyas";
export const SITE_URL = "https://www.swabhimanshikshasanskriti.in";
export const DEFAULT_DESCRIPTION =
  "Official website of Swabhiman Shiksha Sanskriti Samajotthan Nyas, supporting education, culture and social upliftment.";

const publicPages = {
  "/": {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
  },
  "/home": {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
  },
  "/posts": {
    title: `Our Work & Campaigns | ${SITE_NAME}`,
    description:
      "Read the latest campaigns, programmes, community work and updates from Swabhiman Shiksha Sanskriti Samajotthan Nyas.",
    canonicalPath: "/posts",
  },
  "/about": {
    title: `About Us | ${SITE_NAME}`,
    description:
      "Learn about the mission, values and social initiatives of Swabhiman Shiksha Sanskriti Samajotthan Nyas.",
    canonicalPath: "/about",
  },
  "/contact": {
    title: `Contact Us | ${SITE_NAME}`,
    description:
      "Contact Swabhiman Shiksha Sanskriti Samajotthan Nyas for membership, programmes, volunteering and support.",
    canonicalPath: "/contact",
  },
  "/sangathan": {
    title: `Sangathan | ${SITE_NAME}`,
    description:
      "Meet the Sangathan members working with Swabhiman Shiksha Sanskriti Samajotthan Nyas across its organisational sections.",
    canonicalPath: "/sangathan",
  },
  "/donate": {
    title: `Donate | ${SITE_NAME}`,
    description:
      "Support the education, culture and social-upliftment initiatives of Swabhiman Shiksha Sanskriti Samajotthan Nyas.",
    canonicalPath: "/donate",
  },
};

const privatePage = (title) => ({
  title: `${title} | ${SITE_NAME}`,
  description: DEFAULT_DESCRIPTION,
  canonicalPath: null,
  robots: "noindex, nofollow",
});

export function getRouteSeo(pathname) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "").toLowerCase() : "/";

  if (publicPages[normalizedPath]) return publicPages[normalizedPath];
  if (/^\/posts\/[^/]+$/.test(normalizedPath)) {
    return {
      title: `Campaign Update | ${SITE_NAME}`,
      description: "Read this campaign update from Swabhiman Shiksha Sanskriti Samajotthan Nyas.",
      canonicalPath: normalizedPath,
    };
  }
  if (normalizedPath === "/login") return privatePage("Login");
  if (normalizedPath === "/register") return privatePage("Register");
  if (normalizedPath.startsWith("/admin")) return privatePage("Administration");
  if (
    normalizedPath.startsWith("/verify/") ||
    normalizedPath.startsWith("/exam-registration/") ||
    ["/join", "/members", "/my-documents", "/forgot-password", "/forgot-login-id", "/reset-password"].includes(normalizedPath)
  ) {
    return privatePage("Secure Portal");
  }

  return {
    title: `Page | ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: null,
    robots: "noindex, follow",
  };
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function textExcerpt(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

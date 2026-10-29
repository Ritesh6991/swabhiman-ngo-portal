import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getRouteSeo, SITE_URL, textExcerpt } from "../src/utils/seo.js";

const root = new URL("../", import.meta.url);

test("public routes have unique canonical URLs and titles", () => {
  const routes = ["/", "/posts", "/about", "/contact", "/sangathan", "/donate"];
  const metadata = routes.map(getRouteSeo);
  assert.equal(new Set(metadata.map(({ canonicalPath }) => canonicalPath)).size, routes.length);
  assert.equal(new Set(metadata.map(({ title }) => title)).size, routes.length);
  metadata.forEach(({ robots }) => assert.notEqual(robots, "noindex, nofollow"));
});

test("private routes are excluded from search indexing", () => {
  ["/admin", "/login", "/my-documents", "/verify/SVB-1"].forEach((route) => {
    assert.match(getRouteSeo(route).robots, /^noindex/);
  });
});

test("post detail receives its own canonical path", () => {
  assert.equal(getRouteSeo("/posts/abc123").canonicalPath, "/posts/abc123");
  assert.equal(textExcerpt("a   b", 10), "a b");
});

test("robots advertises a valid sitemap and sitemap contains canonical public routes", async () => {
  const [robots, sitemap] = await Promise.all([
    readFile(new URL("public/robots.txt", root), "utf8"),
    readFile(new URL("public/sitemap.xml", root), "utf8"),
  ]);
  assert.match(robots, new RegExp(`Sitemap: ${SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml`));
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  ["/", "/posts", "/about", "/contact", "/sangathan", "/donate"].forEach((path) => {
    assert.match(sitemap, new RegExp(`<loc>${SITE_URL}${path === "/" ? "/" : path}</loc>`));
  });
  assert.doesNotMatch(sitemap, /\/admin|\/login|\/my-documents/);
});

test("Vercel serves route-specific SEO entry pages before the SPA fallback", async () => {
  const vercel = JSON.parse(await readFile(new URL("vercel.json", root), "utf8"));
  const rewriteMap = new Map(vercel.rewrites.map(({ source, destination }) => [source, destination]));
  ["/posts", "/about", "/contact", "/sangathan", "/donate"].forEach((route) => {
    assert.equal(rewriteMap.get(route), `/seo${route}.html`);
  });
  assert.deepEqual(vercel.rewrites.at(-1), { source: "/(.*)", destination: "/" });
});

test("Vercel excludes private routes from server-level indexing", async () => {
  const vercel = JSON.parse(await readFile(new URL("vercel.json", root), "utf8"));
  const privateHeaders = new Map(
    vercel.headers.map(({ source, headers }) => [source, headers?.find(({ key }) => key === "X-Robots-Tag")?.value]),
  );
  ["/admin/:path*", "/verify/:path*", "/login", "/register", "/join", "/members", "/my-documents"].forEach(
    (route) => assert.equal(privateHeaders.get(route), "noindex, nofollow"),
  );
});

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { absoluteUrl, getRouteSeo } from "../src/utils/seo.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "dist/index.html");
const routes = ["/posts", "/about", "/contact", "/sangathan", "/donate"];

const escapeAttribute = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function replaceMeta(html, attribute, selectorValue, value) {
  const escapedValue = escapeAttribute(value);
  const escapedSelector = selectorValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapedSelector}")[^>]*>`, "i");
  const tag = html.match(pattern)?.[0];
  if (!tag) throw new Error(`Missing metadata selector: ${attribute}="${selectorValue}"`);
  const updatedTag = tag.replace(/(content=")[^"]*(")/i, `$1${escapedValue}$2`);
  return html.replace(tag, updatedTag);
}

const baseHtml = await readFile(indexPath, "utf8");

for (const route of routes) {
  const metadata = getRouteSeo(route);
  const canonical = absoluteUrl(metadata.canonicalPath);
  let html = baseHtml
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(metadata.title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/i, `$1${canonical}$2`);

  html = replaceMeta(html, "name", "description", metadata.description);
  html = replaceMeta(html, "name", "robots", metadata.robots || "index, follow");
  html = replaceMeta(html, "property", "og:title", metadata.title);
  html = replaceMeta(html, "property", "og:description", metadata.description);
  html = replaceMeta(html, "property", "og:url", canonical);
  html = replaceMeta(html, "name", "twitter:title", metadata.title);
  html = replaceMeta(html, "name", "twitter:description", metadata.description);

  const outputPath = resolve(root, `dist/seo${route}.html`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
}

console.log(`Generated ${routes.length} route-specific SEO entry pages.`);

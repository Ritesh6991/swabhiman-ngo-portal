import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("homepage exposes stable professional branding metadata", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");

  assert.match(html, /<title>Swabhiman Shiksha Sanskriti Samajotthan Nyas<\/title>/);
  assert.match(html, /href="\/favicon-48x48\.png"/);
  assert.match(html, /href="\/apple-touch-icon\.png"/);
  assert.match(html, /href="\/site\.webmanifest"/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.swabhimanshikshasanskriti\.in\/"/);
  assert.match(html, /property="og:site_name" content="Swabhiman Shiksha Sanskriti Samajotthan Nyas"/);
  assert.doesNotMatch(html, /<title>swabhimanSSS<\/title>/);
});

test("robots allows favicon crawling and manifest uses stable icon URLs", async () => {
  const [robots, manifest] = await Promise.all([
    readFile(new URL("public/robots.txt", root), "utf8"),
    readFile(new URL("public/site.webmanifest", root), "utf8"),
  ]);
  const parsedManifest = JSON.parse(manifest);

  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.deepEqual(
    parsedManifest.icons.map(({ src, sizes }) => ({ src, sizes })),
    [
      { src: "/favicon-192x192.png", sizes: "192x192" },
      { src: "/favicon-512x512.png", sizes: "512x512" },
    ],
  );
});

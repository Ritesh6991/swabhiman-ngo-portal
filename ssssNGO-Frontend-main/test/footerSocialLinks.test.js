import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("footer includes the official LinkedIn profile as a safe external link", async () => {
  const footer = await readFile(new URL("../src/components/Footer.jsx", import.meta.url), "utf8");

  assert.match(
    footer,
    /href="https:\/\/www\.linkedin\.com\/in\/swabhiman-shiksha-sanskriti-samajotthan-nyas-regd-2aa008442"/,
  );
  assert.match(footer, /aria-label="Follow us on LinkedIn"/);
  assert.match(footer, /target="_blank"/);
  assert.match(footer, /rel="noopener noreferrer"/);
});

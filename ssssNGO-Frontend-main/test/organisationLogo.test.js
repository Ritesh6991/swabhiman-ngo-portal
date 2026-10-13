import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("all organisation logo UI uses the shared logo component", () => {
  const shared = read("src/components/OrganisationLogo.jsx");
  assert.match(shared, /assets\/logo\.png/);
  assert.match(shared, /object-contain/);

  for (const file of [
    "src/components/Navbar.jsx",
    "src/components/HeroSlider.jsx",
    "src/components/AuthLayout.jsx",
    "src/components/Footer.jsx",
    "src/layouts/AdminLayout.jsx",
  ]) {
    assert.match(read(file), /OrganisationLogo/);
  }
});

test("admin brand navigates accessibly to the public homepage", () => {
  const adminLayout = read("src/layouts/AdminLayout.jsx");
  assert.match(adminLayout, /href="\/"/);
  assert.match(adminLayout, /aria-label="Go to website home"/);
  assert.match(adminLayout, /title="Go to website home"/);
});

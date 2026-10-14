import test from "node:test";
import assert from "node:assert/strict";
import { linkifyPostText } from "../src/utils/linkifyPostText.js";

test("linkifies HTTPS and bare www URLs while preserving surrounding text", () => {
  const parts = linkifyPostText(
    "website:- www.swabhimanshikshasanskriti.in https://www.facebook.com/share/p/example/",
  );
  const links = parts.filter((part) => part.type === "link");

  assert.deepEqual(
    links.map(({ text, href }) => ({ text, href })),
    [
      {
        text: "www.swabhimanshikshasanskriti.in",
        href: "https://www.swabhimanshikshasanskriti.in/",
      },
      {
        text: "https://www.facebook.com/share/p/example/",
        href: "https://www.facebook.com/share/p/example/",
      },
    ],
  );
});

test("keeps sentence punctuation outside the generated link", () => {
  const parts = linkifyPostText("Details: https://example.com/path). धन्यवाद।");
  const link = parts.find((part) => part.type === "link");

  assert.equal(link.text, "https://example.com/path");
  assert.equal(link.href, "https://example.com/path");
  assert.equal(parts.map((part) => part.text).join(""), "Details: https://example.com/path). धन्यवाद।");
});

test("does not turn non-HTTP schemes into links", () => {
  const parts = linkifyPostText("javascript:alert(1) and data:text/html,test");

  assert.equal(parts.some((part) => part.type === "link"), false);
});

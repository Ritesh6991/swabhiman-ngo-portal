import test from "node:test";
import assert from "node:assert/strict";
import { optimizePublicImage } from "../src/utils/imageDelivery.js";

test("adds safe Cloudinary delivery optimisation without changing the asset identity", () => {
  const original = "https://res.cloudinary.com/fhmig2ti/image/upload/v1793024677/posts/example.jpg";
  const optimized = optimizePublicImage(original, 800);
  assert.equal(
    optimized,
    "https://res.cloudinary.com/fhmig2ti/image/upload/f_auto,q_auto,w_800,c_limit/v1793024677/posts/example.jpg",
  );
});

test("leaves non-Cloudinary and invalid URLs unchanged", () => {
  assert.equal(optimizePublicImage("https://example.com/image.jpg"), "https://example.com/image.jpg");
  assert.equal(optimizePublicImage("not a url"), "not a url");
});

test("bounds requested image widths and does not duplicate a transformation", () => {
  const original = "https://res.cloudinary.com/demo/image/upload/v1/posts/example.png";
  const optimized = optimizePublicImage(original, 99999);
  assert.match(optimized, /f_auto,q_auto,w_2000,c_limit/);
  assert.equal(optimizePublicImage(optimized, 2000), optimized);
});

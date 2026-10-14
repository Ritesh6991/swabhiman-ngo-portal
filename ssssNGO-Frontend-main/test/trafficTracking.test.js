import test from "node:test";
import assert from "node:assert/strict";
import { isTrackablePath } from "../src/utils/trafficTracking.js";

test("tracks public pages but never admin routes", () => {
  assert.equal(isTrackablePath("/"), true);
  assert.equal(isTrackablePath("/posts/example"), true);
  assert.equal(isTrackablePath("/admin"), false);
  assert.equal(isTrackablePath("/admin/payments"), false);
});

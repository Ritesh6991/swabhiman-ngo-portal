const test = require("node:test");
const assert = require("node:assert/strict");
const {
  fillDailyTraffic,
  hashDailyVisitor,
  normalizePublicPath,
  trafficDayRange,
} = require("../src/services/trafficAnalyticsService");

test("normalizes public routes without retaining sensitive or high-cardinality values", () => {
  assert.equal(normalizePublicPath("/Posts/6aae411f93cc605ca071d0a5?ref=test"), "/posts/:id");
  assert.equal(normalizePublicPath("/verify/SVB-12345"), "/verify/:memberId");
  assert.equal(normalizePublicPath("/admin/payments"), null);
  assert.equal(normalizePublicPath("https://example.com"), null);
});

test("daily visitor hashes cannot be correlated across days", () => {
  const first = hashDailyVisitor("visitor_123456789", "2026-10-14", "test-secret");
  const second = hashDailyVisitor("visitor_123456789", "2026-10-15", "test-secret");
  assert.equal(first.length, 64);
  assert.notEqual(first, second);
});

test("fills missing traffic days with zero counts", () => {
  const days = trafficDayRange(3, new Date("2026-10-14T12:00:00Z"));
  const result = fillDailyTraffic([{ _id: days[1], pageViews: 4, visitors: ["a", "b"] }], days);
  assert.deepEqual(result.map(({ pageViews, uniqueVisitors }) => [pageViews, uniqueVisitors]), [[0, 0], [4, 2], [0, 0]]);
});

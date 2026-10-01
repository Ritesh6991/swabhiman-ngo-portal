const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

const withServer = async (callback) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

test("allows the configured frontend origin and emits security headers", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl, { headers: { Origin: "http://127.0.0.1:5173" } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  });
});

test("rejects an untrusted origin with a controlled 403 response", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl, { headers: { Origin: "https://evil.example" } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    assert.deepEqual(await response.json(), { message: "Origin not allowed" });
  });
});

test("health endpoint fails closed while MongoDB is disconnected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "unavailable", database: "disconnected" });
  });
});

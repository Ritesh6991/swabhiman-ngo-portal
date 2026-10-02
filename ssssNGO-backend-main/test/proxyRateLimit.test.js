const test = require("node:test");
const assert = require("node:assert/strict");
process.env.RENDER = "true";
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

test("uses the Render edge client address and trusts only the nearest proxy hop", async () => {
  assert.equal(app.get("trust proxy"), 1);

  const route = `/__test/client-ip-${process.pid}`;
  app.get(route, (req, res) => res.json({ ip: req.ip }));

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}${route}`, {
      headers: {
        "CF-Connecting-IP": "198.51.100.19",
        "X-Forwarded-For": "203.0.113.27, 203.0.113.28",
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ip: "198.51.100.19" });
  });
});

test("rate limiting ignores spoofed forwarding chains and separates edge clients", async () => {
  await withServer(async (baseUrl) => {
    const endpoint = `${baseUrl}/api/auth/register`;
    const request = (clientIp, spoofedSuffix) => fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": clientIp,
        "X-Forwarded-For": spoofedSuffix,
      },
      body: "{}",
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await request("203.0.113.41", `198.51.100.${attempt + 1}`);
      assert.equal(response.status, 400);
    }

    const limited = await request("203.0.113.41", "198.51.100.250");
    assert.equal(limited.status, 429);
    assert.match((await limited.json()).message, /too many attempts/i);

    const differentClient = await request("203.0.113.42", "198.51.100.250");
    assert.equal(differentClient.status, 400);
  });
});

test("Render requests without an edge client address ignore X-Forwarded-For", async () => {
  const route = `/__test/client-ip-fallback-${process.pid}`;
  app.get(route, (req, res) => res.json({ ip: req.ip }));

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}${route}`, {
      headers: { "X-Forwarded-For": "198.51.100.99" },
    });
    const { ip } = await response.json();

    assert.match(ip, /127\.0\.0\.1$/);
  });
});

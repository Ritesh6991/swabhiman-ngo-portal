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

test("uses Render's first forwarded address and trusts only the nearest proxy hop", async () => {
  assert.equal(app.get("trust proxy"), 1);

  const route = `/__test/client-ip-${process.pid}`;
  app.get(route, (req, res) => res.json({ ip: req.ip }));

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}${route}`, {
      headers: { "X-Forwarded-For": "198.51.100.19, 203.0.113.27" },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ip: "198.51.100.19" });
  });
});

test("rate limiting uses forwarded client IPs without merging distinct clients", async () => {
  await withServer(async (baseUrl) => {
    const endpoint = `${baseUrl}/api/auth/register`;
    const request = (clientIp, spoofedSuffix) => fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `${clientIp}, ${spoofedSuffix}`,
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

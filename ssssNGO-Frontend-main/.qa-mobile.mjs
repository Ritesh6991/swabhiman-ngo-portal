import { writeFileSync } from "node:fs";

const loginResponse = await fetch("http://127.0.0.1:5000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@gmail.com", password: "Admin@Test2026!" }),
});
if (!loginResponse.ok) throw new Error(`Login failed: ${loginResponse.status}`);
const auth = await loginResponse.json();
const target = await fetch("http://127.0.0.1:9223/json/new?http://127.0.0.1:5173/", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let callId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++callId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
await call("Page.enable");
await call("Runtime.enable");
await new Promise((resolve) => setTimeout(resolve, 500));
await call("Runtime.evaluate", { expression: `localStorage.setItem("token", ${JSON.stringify(JSON.stringify(auth.token))}); localStorage.setItem("user", ${JSON.stringify(JSON.stringify(auth.user))});` });
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await call("Page.navigate", { url: "http://127.0.0.1:5173/admin" });
await new Promise((resolve) => setTimeout(resolve, 1200));
const screenshot = await call("Page.captureScreenshot", { format: "png", fromSurface: true });
writeFileSync("qa-admin-mobile.png", Buffer.from(screenshot.data, "base64"));
socket.close();

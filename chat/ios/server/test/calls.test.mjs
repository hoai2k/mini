// End to end: starts `wrangler dev` with a fixed SMS code (DEV_CODE) and drives
// accounts, phone numbers, lookups and calls, with app inboxes as WebSockets.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rmSync } from "node:fs";

const PORT = 8798;
const BASE = `http://127.0.0.1:${PORT}`;
let dev;

before(async () => {
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  rmSync(new URL("../.wrangler/test-state", import.meta.url), { recursive: true, force: true });
  const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
  dev = spawn(process.execPath, [wrangler, "dev", "--port", String(PORT), "--ip", "127.0.0.1", "--persist-to", ".wrangler/test-state",
    "--var", "DEV_CODE:424242", "--var", "PHONE_PEPPER:test-pepper"], {
    cwd, stdio: "ignore", detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("wrangler dev did not start");
});

after(() => { try { process.kill(-dev.pid, "SIGTERM"); } catch {} });

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, ...(await res.json()) };
}

function inbox(token) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/v1/inbox?token=${encodeURIComponent(token)}`);
  const got = [], waiters = [];
  ws.addEventListener("message", e => {
    if (e.data === "pong") return;
    const m = JSON.parse(e.data);
    got.push(m);
    for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); }
  });
  const next = (pred, ms = 5000) => {
    const hit = got.find(pred);
    if (hit) { got.splice(got.indexOf(hit), 1); return Promise.resolve(hit); }
    return new Promise((resolve, reject) => {
      const w = { pred, resolve };
      waiters.push(w);
      setTimeout(() => reject(new Error("timed out waiting for inbox event")), ms);
    });
  };
  return { ws, next, open: new Promise(r => ws.addEventListener("open", r)), close: () => ws.close() };
}

let ana, bo, cy;

test("accounts: create, validate handles, update, me", async () => {
  const a = await api("POST", "/v1/accounts", { handle: "Ana_B", name: "Ana" });
  assert.equal(a.status, 200);
  assert.equal(a.account.handle, "ana_b");
  ana = { token: a.token, handle: "ana_b" };
  assert.equal((await api("POST", "/v1/accounts", { handle: "ana_b", name: "Other" })).error, "handle_taken");
  assert.equal((await api("POST", "/v1/accounts", { handle: "a!", name: "X" })).error, "bad_handle");
  assert.equal((await api("POST", "/v1/accounts", { handle: "nameless" })).error, "bad_name");
  bo = { token: (await api("POST", "/v1/accounts", { handle: "bo", name: "Bo" })).token };
  assert.ok(!bo.token, "two-letter handles are too short");
  const b = await api("POST", "/v1/accounts", { handle: "bobo", name: "Bo" });
  bo = { token: b.token, handle: "bobo" };
  cy = { token: (await api("POST", "/v1/accounts", { handle: "cy.ipad", name: "Cy" })).token, handle: "cy.ipad" };
  assert.equal((await api("GET", "/v1/me", null, "nope-nope-nope-nope-nope")).status, 401);
  const me = await api("PATCH", "/v1/me", { name: "Ana B", voipToken: "ab".repeat(32), sandbox: true }, ana.token);
  assert.equal(me.account.name, "Ana B");
  assert.equal(me.account.hasVoip, true);
  assert.equal((await api("PATCH", "/v1/me", { voipToken: "zz" }, ana.token)).error, "bad_token");
});

test("phone numbers: verify with a code, then found by number only", async () => {
  assert.equal((await api("POST", "/v1/me/phone/start", { phone: "5551234" }, bo.token)).error, "bad_phone");
  assert.equal((await api("POST", "/v1/me/phone/start", { phone: "+15551230001" }, bo.token)).status, 200);
  assert.equal((await api("POST", "/v1/me/phone/check", { phone: "+15551230001", code: "000000" }, bo.token)).error, "wrong_code");
  const ok = await api("POST", "/v1/me/phone/check", { phone: "+15551230001", code: "424242" }, bo.token);
  assert.equal(ok.account.phoneLast4, "0001");
  const found = await api("POST", "/v1/lookup", { phones: ["+15551230001", "+15559999999"], handles: ["@cy.ipad", "nobody"] }, ana.token);
  assert.deepEqual(found.found.map(f => f.handle).sort(), ["bobo", "cy.ipad"]);
});

test("calls: ring by phone number over the inbox, answer, both told", async () => {
  const boIn = inbox(bo.token), anaIn = inbox(ana.token);
  await Promise.all([boIn.open, anaIn.open]);
  const start = await api("POST", "/v1/calls", { to: "+15551230001", room: "call-abc123" }, ana.token);
  assert.equal(start.status, 200);
  assert.equal(start.delivered, "app");
  const ring = await boIn.next(m => m.t === "ring");
  assert.equal(ring.call.from.handle, "ana_b");
  assert.equal(ring.call.room, "call-abc123");
  const ans = await api("POST", `/v1/calls/${start.call.id}/answer`, {}, bo.token);
  assert.equal(ans.call.status, "answered");
  const told = await anaIn.next(m => m.t === "call" && m.call.status === "answered");
  assert.equal(told.call.room, "call-abc123");
  assert.equal((await api("POST", `/v1/calls/${start.call.id}/answer`, {}, bo.token)).error, "bad_state");
  boIn.close(); anaIn.close();
});

test("calls: a third caller joins an ongoing call when it is approved", async () => {
  const boIn = inbox(bo.token), cyIn = inbox(cy.token);
  await Promise.all([boIn.open, cyIn.open]);
  // Cy (an iPad, no number) calls Bo by username while Bo is in "call-abc123".
  const start = await api("POST", "/v1/calls", { to: "@bobo", room: "call-cy0001" }, cy.token);
  await boIn.next(m => m.t === "ring" && m.call.from.handle === "cy.ipad");
  await api("POST", `/v1/calls/${start.call.id}/answer`, { room: "call-abc123" }, bo.token);
  const told = await cyIn.next(m => m.t === "call" && m.call.status === "answered");
  assert.equal(told.call.room, "call-abc123", "Cy is sent into Bo's ongoing call");
  boIn.close(); cyIn.close();
});

test("calls: decline, cancel, unknown, offline and strangers", async () => {
  const boIn = inbox(bo.token);
  await boIn.open;
  const c1 = await api("POST", "/v1/calls", { to: "bobo", room: "call-dec001" }, ana.token);
  assert.equal((await api("POST", `/v1/calls/${c1.call.id}/decline`, {}, bo.token)).call.status, "declined");
  const c2 = await api("POST", "/v1/calls", { to: "bobo", room: "call-can001" }, ana.token);
  await api("POST", `/v1/calls/${c2.call.id}/cancel`, {}, ana.token);
  const gone = await boIn.next(m => m.t === "call" && m.call.id === c2.call.id && m.call.status === "cancelled");
  assert.ok(gone);
  assert.equal((await api("POST", `/v1/calls/${c2.call.id}/decline`, {}, cy.token)).status, 404, "not your call");
  assert.equal((await api("POST", "/v1/calls", { to: "+15550000000", room: "call-x00001" }, ana.token)).status, 404);
  assert.equal((await api("POST", "/v1/calls", { to: "bobo", room: "x" }, ana.token)).error, "bad_room");
  boIn.close();
  await new Promise(r => setTimeout(r, 300));
  // Bo's app is closed and has no push token: still rings when the app opens.
  const c3 = await api("POST", "/v1/calls", { to: "bobo", room: "call-off001" }, ana.token);
  assert.equal(c3.delivered, "offline");
  const later = inbox(bo.token);
  const ring = await later.next(m => m.t === "ring" && m.call.id === c3.call.id);
  assert.ok(ring, "a ringing call is delivered when the inbox opens");
  later.close();
  // Ana has a push token but no APNs keys are configured on this server.
  const c4 = await api("POST", "/v1/calls", { to: "ana_b", room: "call-psh001" }, bo.token);
  assert.equal(c4.push.error, "apns_not_configured");
  const test = await api("POST", "/v1/me/test-ring", {}, ana.token);
  assert.equal(test.error, "apns_not_configured", "test ring reports the push setup");
  assert.equal((await api("POST", "/v1/me/test-ring", {}, bo.token)).error, "no_device_token");
});

test("accounts: deleting removes the account and its handle", async () => {
  assert.equal((await api("DELETE", "/v1/me", null, cy.token)).ok, true);
  assert.equal((await api("GET", "/v1/me", null, cy.token)).status, 401);
  const re = await api("POST", "/v1/accounts", { handle: "cy.ipad", name: "Cy again" });
  assert.equal(re.status, 200, "the handle is free again");
});

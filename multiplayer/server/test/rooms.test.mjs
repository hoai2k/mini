// End-to-end test: starts `wrangler dev` locally and drives the relay with
// real WebSocket clients (Node 22+ has a global WebSocket).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const WS = `ws://127.0.0.1:${PORT}`;
let dev;

before(async () => {
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
  // Run wrangler directly in its own process group so after() can stop it and
  // everything it started (workerd); otherwise the test run never exits on CI.
  dev = spawn(process.execPath, [wrangler, "dev", "--port", String(PORT), "--ip", "127.0.0.1", "--persist-to", ".wrangler/test-state"], {
    cwd,
    stdio: "ignore",
    detached: true,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("wrangler dev did not start");
});

after(() => {
  try { process.kill(-dev.pid, "SIGTERM"); } catch {}
});

function connect(path) {
  const ws = new WebSocket(`${WS}${path}`);
  const inbox = [];
  const waiters = [];
  ws.addEventListener("message", e => {
    const msg = JSON.parse(e.data);
    const i = waiters.findIndex(w => w.match(msg));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  return {
    ws,
    send: msg => ws.send(JSON.stringify(msg)),
    next(match = () => true, ms = 5000) {
      const i = inbox.findIndex(match);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { match, resolve };
        waiters.push(w);
        setTimeout(() => reject(new Error("timed out waiting for message")), ms);
      });
    },
  };
}

const lobby = async game => (await (await fetch(`${BASE}/lobby/${game}`)).json()).rooms;
const room = () => `r${Math.random().toString(36).slice(2, 10)}`;

test("host opens a room, it shows in the lobby, guests relay presence and topics", async () => {
  const id = room();
  const host = connect(`/room/testgame/${id}?host=1&title=Alice%27s%20Game&capacity=3&name=Alice`);
  const hello = await host.next(m => m.t === "welcome");
  assert.equal(hello.host, true);
  assert.deepEqual(hello.peers, {});

  let rooms = await lobby("testgame");
  const listed = rooms.find(r => r.id === id);
  assert.equal(listed.title, "Alice's Game");
  assert.equal(listed.count, 1);
  assert.equal(listed.capacity, 3);

  host.send({ t: "p", d: { tanks: [{ id: "h1" }] } });
  await new Promise(r => setTimeout(r, 100));

  const guest = connect(`/room/testgame/${id}?name=Bob`);
  const gHello = await guest.next(m => m.t === "welcome");
  assert.equal(gHello.host, false);
  assert.deepEqual(gHello.peers[hello.you], { tanks: [{ id: "h1" }] });
  const joined = await host.next(m => m.t === "join");
  assert.equal(joined.from, gHello.you);

  guest.send({ t: "m", topic: "fire", d: { angle: 1 } });
  const fire = await host.next(m => m.t === "m");
  assert.deepEqual(fire, { t: "m", from: gHello.you, topic: "fire", d: { angle: 1 } });

  guest.send({ t: "p", d: { tanks: [{ id: "g1" }] } });
  const pres = await host.next(m => m.t === "p");
  assert.equal(pres.from, gHello.you);

  rooms = await lobby("testgame");
  assert.equal(rooms.find(r => r.id === id).count, 2);

  guest.ws.close();
  const left = await host.next(m => m.t === "leave");
  assert.equal(left.from, gHello.you);
  host.ws.close();
});

test("a full room and a missing room are refused", async () => {
  const id = room();
  const host = connect(`/room/testgame/${id}?host=1&title=Tiny&capacity=1`);
  await host.next(m => m.t === "welcome");
  const late = connect(`/room/testgame/${id}`);
  assert.deepEqual(await late.next(), { t: "closed", reason: "full" });
  const nowhere = connect(`/room/testgame/${room()}`);
  assert.deepEqual(await nowhere.next(), { t: "closed", reason: "not_found" });
  host.ws.close();
});

test("when the host leaves, guests are told and the room leaves the lobby", async () => {
  const id = room();
  const host = connect(`/room/testgame/${id}?host=1&title=Gone`);
  await host.next(m => m.t === "welcome");
  const guest = connect(`/room/testgame/${id}`);
  await guest.next(m => m.t === "welcome");
  host.ws.close();
  assert.deepEqual(await guest.next(m => m.t === "closed"), { t: "closed", reason: "host_left" });
  await new Promise(r => setTimeout(r, 200));
  assert.equal((await lobby("testgame")).some(r => r.id === id), false);
});

test("pages from other websites are refused; listed and local origins are allowed", async () => {
  const at = origin => fetch(`${BASE}/lobby/testgame`, { headers: { Origin: origin } });
  assert.equal((await at("https://evil.example")).status, 403);
  assert.equal((await at("https://hoai2k.github.io")).status, 200);
  assert.equal((await at("http://games.hoai.net")).status, 200);
  assert.equal((await at("http://localhost:8000")).status, 200);
  const roomUrl = `${BASE}/room/testgame/${room()}`;
  assert.equal((await fetch(roomUrl, { headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await fetch(roomUrl, { headers: { Origin: "https://hoai.net" } })).status, 426);  // allowed, just not a WebSocket
});

test("a client flooding messages is disconnected", async () => {
  const id = room();
  const host = connect(`/room/testgame/${id}?host=1&title=Flood`);
  await host.next(m => m.t === "welcome");
  for (let i = 0; i < 400; i++) host.send({ t: "m", topic: "spam", d: i });
  assert.deepEqual(await host.next(m => m.t === "closed"), { t: "closed", reason: "rate_limited" });
});

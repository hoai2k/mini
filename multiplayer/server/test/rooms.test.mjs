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
  dev = spawn(process.execPath, [wrangler, "dev", "--local", "--port", String(PORT), "--ip", "127.0.0.1", "--persist-to", ".wrangler/test-state"], {
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
  // The host's state reaches the guest in its welcome, or, if the relay handles
  // the guest's arrival first, as the broadcast that follows.
  const hostState = gHello.peers[hello.you] && Object.keys(gHello.peers[hello.you]).length
    ? gHello.peers[hello.you]
    : (await guest.next(m => m.t === "p" && m.from === hello.you)).d;
  assert.deepEqual(hostState, { tanks: [{ id: "h1" }] });
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

test("votes: one vote per voter per item, changeable, with totals for everyone", async () => {
  const game = `votes${Math.floor(Math.random() * 1e6)}`;
  const cast = (item, voter, value) => fetch(`${BASE}/votes/${game}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, voter, value }),
  });
  assert.deepEqual(await (await cast("hoops", "voterA1", 1)).json(), { item: "hoops", up: 1, down: 0 });
  await cast("hoops", "voterB2", -1);
  await cast("hoops", "voterA1", 1); // the same vote again doesn't add
  assert.deepEqual(await (await cast("hoops", "voterC3", 1)).json(), { item: "hoops", up: 2, down: 1 });
  await cast("hoops", "voterB2", 1); // a changed mind
  await cast("puppy", "voterA1", -1);
  await cast("puppy", "voterA1", 0); // cleared
  const { items } = await (await fetch(`${BASE}/votes/${game}`)).json();
  assert.deepEqual(items, { hoops: { up: 3, down: 0 } });
  assert.equal((await cast("bad item!", "voterA1", 1)).status, 400);
  assert.equal((await cast("hoops", "voterA1", 5)).status, 400);
  assert.equal((await fetch(`${BASE}/votes/${game}`, { headers: { Origin: "https://evil.example" } })).status, 403);
});

test("turn: STUN servers always, TURN only when its secrets are set", async () => {
  const res = await fetch(`${BASE}/turn`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.turn, false);
  assert.ok(body.iceServers.some(s => s.urls.some(u => u.startsWith("stun:"))));
  assert.equal((await fetch(`${BASE}/turn`, { headers: { Origin: "https://evil.example" } })).status, 403);
});

// The Ai-Ching oracle route: without Workers AI (local dev has no AI binding)
// it validates the request and answers 502 or 503, so the page falls back quietly.
test("oracle rejects bad requests and reports when AI is unavailable", async () => {
  const post = (body) => fetch(`${BASE}/oracle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post({ question: "" })).status, 400);
  assert.equal((await post({ question: "Should I?", day: "2026-10-11", seed: "abc", hexagram: { n: 99 } })).status, 400);
  const ok = await post({ question: "Should I move?", day: "2026-10-11", seed: "abc123", hexagram: { n: 35, name: "Progress", zh: "晉", essence: "Rising." } });
  assert.ok([502, 503].includes(ok.status), `status ${ok.status}`);
  assert.equal((await fetch(`${BASE}/oracle`)).status, 405);
  const blocked = await fetch(`${BASE}/oracle`, { method: "POST", headers: { Origin: "https://evil.example" }, body: "{}" });
  assert.equal(blocked.status, 403);
});

test("transcribe checks the audio before calling Whisper", async () => {
  const post = (type, body) => fetch(`${BASE}/transcribe`, { method: "POST", headers: type ? { "Content-Type": type } : {}, body });
  assert.equal((await post("text/plain", "hello")).status, 415);
  assert.equal((await post("audio/webm", new Uint8Array(0))).status, 413);
  assert.equal((await post("audio/webm", new Uint8Array(2_000_000))).status, 413);
  const ok = await post("audio/webm", new Uint8Array(1000));
  assert.ok([502, 503].includes(ok.status), `status ${ok.status}`);
  assert.equal((await fetch(`${BASE}/transcribe`)).status, 405);
});

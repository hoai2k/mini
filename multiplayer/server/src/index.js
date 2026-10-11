// mini-rooms: a small real-time relay for browser party games, running on
// Cloudflare Workers with Durable Objects.
//
//   GET  /lobby/<game>                     list open rooms for a game (JSON)
//   WS   /room/<game>/<roomId>?name=...    join a room
//   WS   /room/<game>/<roomId>?host=1&title=...&capacity=8
//                                          open a new room as its host
//   GET  /turn                             ICE servers for WebRTC calls (JSON): STUN
//                                          always, plus Cloudflare TURN when the
//                                          TURN_KEY_ID and TURN_KEY_API_TOKEN
//                                          secrets are set
//   GET  /votes/<game>                     thumbs up/down totals per item (JSON)
//   POST /votes/<game>  {item, voter, value: 1 | -1 | 0}
//                                          set (or clear) one voter's vote
//   POST /oracle  {question, day, seed, hexagram, ...}
//                                          a short Workers AI opening for an
//                                          Ai-Ching reading (src/oracle.js)
//   POST /transcribe  (audio body)         speech to text for a spoken
//                                          Ai-Ching question (src/transcribe.js)
//
// Each room is one Durable Object (`Room`). It relays two kinds of message
// between the players in it, mirroring the presence/topics model the games
// used with InstantDB:
//
//   client -> server   {t:"p", d}            replace my presence data
//                      {t:"m", topic, d}     broadcast a topic message
//   server -> client   {t:"welcome", you, host, peers}
//                      {t:"join", from}
//                      {t:"p", from, d}
//                      {t:"m", from, topic, d}
//                      {t:"leave", from}
//                      {t:"closed", reason}  the room is gone (host left, full, ...)
//
// One `Lobby` Durable Object per game keeps the list of open rooms. Rooms
// report to it when players come and go, and every 30 s while anyone is
// connected; the lobby drops rooms it hasn't heard from in 90 s.
//
// Guards: browsers may connect only from the origins in ALLOWED_ORIGINS
// (wrangler.jsonc) or localhost, and a connection that sends more than
// RATE_LIMIT messages in RATE_WINDOW_MS is closed with reason "rate_limited".

import { DurableObject } from "cloudflare:workers";
import { handleOracle } from "./oracle.js";
import { handleTranscribe } from "./transcribe.js";

const MAX_MESSAGE_BYTES = 64 * 1024;
const MAX_CAPACITY = 16;
const HEARTBEAT_MS = 30_000;
const STALE_MS = 90_000;
const NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
const RATE_WINDOW_MS = 2_000;
const RATE_LIMIT = 300;
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// Requests without an Origin header (non-browser tools) are let through:
// they could send any Origin anyway, so the check only stops other websites
// from using the relay through their visitors' browsers.
function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || LOCAL_ORIGIN_RE.test(origin)) return true;
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean);
  return allowed.includes(origin);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Language",
};
const ITEM_RE = /^[A-Za-z0-9_-]{1,40}$/;
const VOTER_RE = /^[A-Za-z0-9_-]{6,40}$/;
const MAX_ITEMS = 500;
const VOTE_RATE = 120; // writes per minute per IP
const STUN_ONLY = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];
const TURN_TTL_S = 24 * 3600;
let turnCache = null; // { at, iceServers } shared by requests on this isolate

// Short-lived TURN credentials from Cloudflare Realtime, so calls still
// connect when a direct path between two browsers is blocked (mobile data,
// strict routers, offices). Cached for an hour; each lasts a day.
async function iceServers(env) {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return { iceServers: STUN_ONLY, turn: false };
  if (turnCache && Date.now() - turnCache.at < 3600_000) return { iceServers: turnCache.iceServers, turn: true };
  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: TURN_TTL_S }),
    });
    if (!res.ok) throw new Error(`TURN credentials: ${res.status}`);
    const data = await res.json();
    // Browsers block port 53, so those URLs would only time out.
    const servers = (data.iceServers || []).map(s => ({
      ...s,
      urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(u => !/:53(\?|$)/.test(u)),
    })).filter(s => s.urls.length);
    turnCache = { at: Date.now(), iceServers: servers };
    return { iceServers: servers, turn: true };
  } catch (e) {
    console.error(e);
    return { iceServers: STUN_ONLY, turn: false };
  }
}

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const parts = url.pathname.split("/").filter(Boolean);
    if ((parts[0] === "lobby" || parts[0] === "room" || parts[0] === "votes" || parts[0] === "turn" || parts[0] === "oracle" || parts[0] === "transcribe") && !originAllowed(request, env)) {
      return new Response("Origin not allowed", { status: 403, headers: CORS });
    }

    if (parts[0] === "lobby" && parts.length === 2 && NAME_RE.test(parts[1])) {
      const rooms = await env.LOBBY.getByName(parts[1]).list();
      return Response.json({ rooms }, { headers: { ...CORS, "Cache-Control": "no-store" } });
    }

    if (parts[0] === "oracle" && parts.length === 1) {
      return handleOracle(request, env, ctx, { ...CORS, "Cache-Control": "no-store" });
    }

    if (parts[0] === "transcribe" && parts.length === 1) {
      return handleTranscribe(request, env, { ...CORS, "Cache-Control": "no-store" });
    }

    if (parts[0] === "turn" && parts.length === 1) {
      return Response.json(await iceServers(env), { headers: { ...CORS, "Cache-Control": "no-store" } });
    }

    if (parts[0] === "votes" && parts.length === 2 && NAME_RE.test(parts[1])) {
      const votes = env.VOTES.getByName(parts[1]);
      if (request.method === "GET") {
        return Response.json({ items: await votes.totals() }, { headers: { ...CORS, "Cache-Control": "no-store" } });
      }
      if (request.method === "POST") {
        let body;
        try { body = await request.json(); } catch { body = null; }
        const value = body?.value;
        if (!body || !ITEM_RE.test(String(body.item)) || !VOTER_RE.test(String(body.voter)) || ![1, -1, 0].includes(value)) {
          return Response.json({ error: "bad_vote" }, { status: 400, headers: CORS });
        }
        const ip = request.headers.get("CF-Connecting-IP") || "local";
        const result = await votes.cast(String(body.item), String(body.voter), value, ip);
        return Response.json(result, { status: result.error ? 429 : 200, headers: CORS });
      }
      return new Response("Method not allowed", { status: 405, headers: CORS });
    }

    if (parts[0] === "room" && parts.length === 3 && NAME_RE.test(parts[1]) && NAME_RE.test(parts[2])) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected a WebSocket upgrade", { status: 426, headers: CORS });
      }
      return env.ROOM.getByName(`${parts[1]}/${parts[2]}`).fetch(request);
    }

    if (url.pathname === "/") return new Response("mini-rooms is running", { headers: CORS });
    return new Response("Not found", { status: 404, headers: CORS });
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Presence lives in memory only: clients resend it many times a second,
    // so after a hibernation wake-up it refills on its own.
    this.presence = new Map();
    this.rates = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const [, , game, roomId] = url.pathname.split("/");
    const wantsHost = url.searchParams.get("host") === "1";
    let meta = await this.ctx.storage.get("meta");
    const sockets = this.ctx.getWebSockets();

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const reject = reason => {
      server.accept();
      server.send(JSON.stringify({ t: "closed", reason }));
      server.close(4000, reason);
      return new Response(null, { status: 101, webSocket: client });
    };

    if (wantsHost) {
      if (meta?.open) return reject("taken");
      meta = {
        open: true,
        game,
        roomId,
        title: clean(url.searchParams.get("title"), 40) || "Untitled Game",
        capacity: Math.max(1, Math.min(MAX_CAPACITY, parseInt(url.searchParams.get("capacity"), 10) || 8)),
      };
      await this.ctx.storage.put("meta", meta);
    } else {
      if (!meta?.open) return reject("not_found");
      if (sockets.length >= meta.capacity) return reject("full");
    }

    const peerId = crypto.randomUUID();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peerId, isHost: wantsHost, name: clean(url.searchParams.get("name"), 24) });

    const peers = {};
    for (const ws of sockets) {
      const a = ws.deserializeAttachment();
      if (a) peers[a.peerId] = this.presence.get(a.peerId) ?? {};
    }
    server.send(JSON.stringify({ t: "welcome", you: peerId, host: wantsHost, peers }));
    this.broadcast({ t: "join", from: peerId }, server);

    await this.reportToLobby();
    await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const me = ws.deserializeAttachment();
    if (!me || typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) return;
    const now = Date.now();
    let rate = this.rates.get(me.peerId);
    if (!rate || now - rate.start >= RATE_WINDOW_MS) this.rates.set(me.peerId, rate = { start: now, count: 0 });
    if (++rate.count > RATE_LIMIT) {
      try { ws.send(JSON.stringify({ t: "closed", reason: "rate_limited" })); } catch {}
      ws.close(4008, "rate_limited");
      await this.dropPeer(ws);
      return;
    }
    let msg;
    try { msg = JSON.parse(message); } catch { return; }

    if (msg.t === "p") {
      this.presence.set(me.peerId, msg.d ?? {});
      this.broadcast({ t: "p", from: me.peerId, d: msg.d ?? {} }, ws);
    } else if (msg.t === "m" && typeof msg.topic === "string") {
      this.broadcast({ t: "m", from: me.peerId, topic: msg.topic.slice(0, 64), d: msg.d ?? null }, ws);
    }
  }

  async webSocketClose(ws) {
    await this.dropPeer(ws);
  }

  async webSocketError(ws) {
    await this.dropPeer(ws);
  }

  async dropPeer(ws) {
    const me = ws.deserializeAttachment();
    if (!me) return;
    ws.serializeAttachment(null);
    this.presence.delete(me.peerId);
    this.rates.delete(me.peerId);

    if (me.isHost) {
      // The host owns the map and the AI, so the room ends with them.
      const meta = await this.ctx.storage.get("meta");
      if (meta) await this.ctx.storage.put("meta", { ...meta, open: false });
      for (const other of this.ctx.getWebSockets()) {
        if (other === ws) continue;
        other.serializeAttachment(null);
        try {
          other.send(JSON.stringify({ t: "closed", reason: "host_left" }));
          other.close(4001, "host_left");
        } catch {}
      }
      this.presence.clear();
    } else {
      this.broadcast({ t: "leave", from: me.peerId }, ws);
    }
    await this.reportToLobby();
  }

  async alarm() {
    if (this.livePeers().length === 0) {
      await this.reportToLobby();
      return;
    }
    await this.reportToLobby();
    await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
  }

  livePeers() {
    return this.ctx.getWebSockets().filter(ws => ws.deserializeAttachment());
  }

  broadcast(msg, except) {
    const text = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except || !ws.deserializeAttachment()) continue;
      try { ws.send(text); } catch {}
    }
  }

  async reportToLobby() {
    const meta = await this.ctx.storage.get("meta");
    if (!meta) return;
    const lobby = this.env.LOBBY.getByName(meta.game);
    const count = this.livePeers().length;
    if (!meta.open || count === 0) {
      await lobby.remove(meta.roomId);
      if (meta.open) await this.ctx.storage.put("meta", { ...meta, open: false });
    } else {
      await lobby.upsert({ id: meta.roomId, title: meta.title, count, capacity: meta.capacity });
    }
  }
}

export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        count INTEGER NOT NULL,
        capacity INTEGER NOT NULL,
        updated INTEGER NOT NULL
      )`);
    });
  }

  upsert({ id, title, count, capacity }) {
    this.ctx.storage.sql.exec(
      `INSERT INTO rooms (id, title, count, capacity, updated) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, count = excluded.count,
         capacity = excluded.capacity, updated = excluded.updated`,
      id, title, count, capacity, Date.now()
    );
  }

  remove(id) {
    this.ctx.storage.sql.exec("DELETE FROM rooms WHERE id = ?", id);
  }

  list() {
    this.ctx.storage.sql.exec("DELETE FROM rooms WHERE updated < ?", Date.now() - STALE_MS);
    return this.ctx.storage.sql
      .exec("SELECT id, title, count, capacity, updated FROM rooms ORDER BY updated DESC LIMIT 50")
      .toArray();
  }
}

// One Votes object per game keeps everyone's thumbs up and down, one vote per
// voter per item (voter IDs are random per browser, so this counts browsers,
// not people). Totals are what the game shows; its owners use them to decide
// what to keep.
export class Votes extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.rates = new Map();
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS votes (
        item TEXT NOT NULL,
        voter TEXT NOT NULL,
        value INTEGER NOT NULL,
        updated INTEGER NOT NULL,
        PRIMARY KEY (item, voter)
      )`);
    });
  }

  totals() {
    const items = {};
    for (const row of this.ctx.storage.sql.exec(
      "SELECT item, SUM(value = 1) AS up, SUM(value = -1) AS down FROM votes GROUP BY item"
    )) {
      items[row.item] = { up: row.up, down: row.down };
    }
    return items;
  }

  cast(item, voter, value, ip) {
    const now = Date.now();
    let rate = this.rates.get(ip);
    if (!rate || now - rate.start > 60_000) this.rates.set(ip, rate = { start: now, count: 0 });
    if (++rate.count > VOTE_RATE) return { error: "rate_limited" };
    if (this.rates.size > 5000) this.rates.clear();

    const known = this.ctx.storage.sql.exec("SELECT 1 FROM votes WHERE item = ? LIMIT 1", item).toArray().length > 0;
    if (!known && value !== 0) {
      const count = this.ctx.storage.sql.exec("SELECT COUNT(DISTINCT item) AS n FROM votes").one().n;
      if (count >= MAX_ITEMS) return { error: "too_many_items" };
    }
    if (value === 0) {
      this.ctx.storage.sql.exec("DELETE FROM votes WHERE item = ? AND voter = ?", item, voter);
    } else {
      this.ctx.storage.sql.exec(
        `INSERT INTO votes (item, voter, value, updated) VALUES (?, ?, ?, ?)
         ON CONFLICT(item, voter) DO UPDATE SET value = excluded.value, updated = excluded.updated`,
        item, voter, value, now
      );
    }
    const row = this.ctx.storage.sql.exec(
      "SELECT COALESCE(SUM(value = 1), 0) AS up, COALESCE(SUM(value = -1), 0) AS down FROM votes WHERE item = ?", item
    ).one();
    return { item, up: row.up, down: row.down };
  }
}

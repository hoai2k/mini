// mini-rooms: a small real-time relay for browser party games, running on
// Cloudflare Workers with Durable Objects.
//
//   GET  /lobby/<game>                     list open rooms for a game (JSON)
//   WS   /room/<game>/<roomId>?name=...    join a room
//   WS   /room/<game>/<roomId>?host=1&title=...&capacity=8
//                                          open a new room as its host
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

import { DurableObject } from "cloudflare:workers";

const MAX_MESSAGE_BYTES = 64 * 1024;
const MAX_CAPACITY = 16;
const HEARTBEAT_MS = 30_000;
const STALE_MS = 90_000;
const NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] === "lobby" && parts.length === 2 && NAME_RE.test(parts[1])) {
      const rooms = await env.LOBBY.getByName(parts[1]).list();
      return Response.json({ rooms }, { headers: { ...CORS, "Cache-Control": "no-store" } });
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

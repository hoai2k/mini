// games-chat-calls: accounts and ringing for the Games Chat iOS app, a
// Cloudflare Worker with one Durable Object (`Directory`) holding every
// account, call and open app connection. The video itself still goes through
// the mini-rooms relay: a call just tells two (or more) apps which room to
// meet in.
//
// Accounts
//   POST   /v1/accounts               {handle, name}         -> {account, token}
//   GET    /v1/me                                             -> {account}
//   PATCH  /v1/me                     {name?, handle?, voipToken?, sandbox?}
//   DELETE /v1/me                                             (deletes the account)
//   POST   /v1/me/phone/start         {phone}                (texts a code: Twilio Verify)
//   POST   /v1/me/phone/check         {phone, code}          (links the number)
//   DELETE /v1/me/phone
//   POST   /v1/lookup                 {handles?, phones?}    -> {found: [{handle, name, query}]}
//   POST   /v1/me/test-ring                                  rings my own device by VoIP push
//                                     and says what Apple answered (setup check)
// Calls
//   POST   /v1/calls                  {to, room}             -> {call} | 404 not_found
//   GET    /v1/calls/<id>                                    -> {call}
//   POST   /v1/calls/<id>/answer      {room?}                (room: join my call instead)
//   POST   /v1/calls/<id>/decline
//   POST   /v1/calls/<id>/cancel                             (the caller hangs up first)
//   WS     /v1/inbox?token=...        live events while the app is open:
//                                     {t:"ring", call} {t:"call", call} (status changes)
//
// Every request but account creation carries `Authorization: Bearer <token>`
// (the inbox takes it in the query, as WebSockets can't set headers).
// Ringing: an app with its inbox open gets {t:"ring"} and rings itself (or,
// already in a call, asks whether to let the caller join); otherwise the
// callee's phone gets an Apple VoIP push and CallKit rings it.
//
// Secrets (wrangler secret put ...):
//   APNS_KEY        the .p8 key from developer.apple.com (Keys, with APNs)
//   APNS_KEY_ID     its Key ID
//   APNS_TEAM_ID    the Apple Developer Team ID
//   APNS_TOPIC      the app's bundle ID (VoIP pushes go to "<bundle>.voip")
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID
//                   phone number verification; without them phone numbers
//                   can't be linked and calls go by username only
//   PHONE_PEPPER    any long random string; phone numbers are stored only
//                   as HMACs with it
//   DEV_CODE        local testing only: accept this code instead of Twilio

import { DurableObject } from "cloudflare:workers";
import { b64url, makeApnsJwt } from "./apns.js";

export const HANDLE_RE = /^[a-z0-9][a-z0-9_.]{2,19}$/;
export const PHONE_RE = /^\+[1-9][0-9]{6,14}$/;
const ROOM_RE = /^[A-Za-z0-9_-]{6,64}$/;
const RING_MS = 45_000;
const CALL_KEEP_MS = 6 * 3600_000;
const MAX_LOOKUP = 500;
const RATE = { accounts: [10, 3600_000], calls: [40, 3600_000], phone: [6, 3600_000], lookup: [30, 3600_000] };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const json = (data, status = 200) => Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
const fail = (error, status = 400) => json({ error }, status);
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
const randomToken = n => b64url(crypto.getRandomValues(new Uint8Array(n)));

async function sha256(text) {
  return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    if (url.pathname === "/") return new Response("games-chat-calls is running", { headers: CORS });
    if (!url.pathname.startsWith("/v1/")) return fail("not_found", 404);
    // One directory for everyone: plenty for a friends-and-family app.
    return env.DIRECTORY.getByName("main").fetch(request);
  },
};

export class Directory extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.rates = new Map();
    ctx.blockConcurrencyWhile(async () => {
      const sql = this.ctx.storage.sql;
      sql.exec(`CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY, handle TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        token_hash TEXT NOT NULL, phone_hash TEXT UNIQUE, phone_last4 TEXT,
        voip_token TEXT, sandbox INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL)`);
      sql.exec("CREATE INDEX IF NOT EXISTS accounts_token ON accounts (token_hash)");
      sql.exec(`CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY, caller TEXT NOT NULL, callee TEXT NOT NULL, room TEXT NOT NULL,
        status TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL)`);
    });
  }

  // --- helpers ---------------------------------------------------------------
  limited(kind, key) {
    const [max, window] = RATE[kind];
    const id = `${kind}:${key}`, now = Date.now();
    let r = this.rates.get(id);
    if (!r || now - r.start > window) this.rates.set(id, r = { start: now, count: 0 });
    if (this.rates.size > 20000) this.rates.clear();
    return ++r.count > max;
  }

  row(sql, ...args) {
    return this.ctx.storage.sql.exec(sql, ...args).toArray()[0] ?? null;
  }

  async authed(request, token) {
    const t = token ?? (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!t || t.length < 20) return null;
    return this.row("SELECT * FROM accounts WHERE token_hash = ?", await sha256(t));
  }

  publicAccount(a, mine) {
    const out = { id: a.id, handle: a.handle, name: a.name };
    if (mine) { out.phoneLast4 = a.phone_last4 || null; out.hasVoip = !!a.voip_token; }
    return out;
  }

  phoneHash(phone) {
    return hmac(this.env.PHONE_PEPPER || "games-chat-calls", phone);
  }

  callView(c) {
    const who = id => {
      const a = this.row("SELECT id, handle, name FROM accounts WHERE id = ?", id);
      return a ? { handle: a.handle, name: a.name } : { handle: "", name: "Someone" };
    };
    return { id: c.id, from: who(c.caller), to: who(c.callee), room: c.room, status: c.status, created: c.created };
  }

  // Sends an event to every open inbox of an account; true if any is open.
  tell(accountId, msg) {
    const text = JSON.stringify(msg);
    let any = false;
    for (const ws of this.ctx.getWebSockets(accountId)) {
      try { ws.send(text); any = true; } catch {}
    }
    return any;
  }

  // --- requests ----------------------------------------------------------------
  async fetch(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean).slice(1);   // drop "v1"
    const m = request.method;
    const ip = request.headers.get("CF-Connecting-IP") || "local";
    let body = {};
    if (m === "POST" || m === "PATCH") {
      try { body = await request.json(); } catch { body = {}; }
      if (!body || typeof body !== "object") body = {};
    }
    this.sweep();

    if (parts[0] === "accounts" && parts.length === 1 && m === "POST") return this.createAccount(body, ip);

    if (parts[0] === "inbox" && parts.length === 1) {
      if (request.headers.get("Upgrade") !== "websocket") return fail("expected_websocket", 426);
      const me = await this.authed(request, url.searchParams.get("token"));
      if (!me) return fail("unauthorized", 401);
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server, [me.id]);
      server.send(JSON.stringify({ t: "hello", account: this.publicAccount(me, true) }));
      // Anything still ringing for me (the push may have been missed).
      for (const c of this.ctx.storage.sql.exec("SELECT * FROM calls WHERE callee = ? AND status = 'ringing'", me.id)) {
        server.send(JSON.stringify({ t: "ring", call: this.callView(c) }));
      }
      return new Response(null, { status: 101, webSocket: client });
    }

    const me = await this.authed(request);
    if (!me) return fail("unauthorized", 401);

    if (parts[0] === "me") {
      if (parts.length === 1 && m === "GET") return json({ account: this.publicAccount(me, true) });
      if (parts.length === 1 && m === "PATCH") return this.updateMe(me, body);
      if (parts.length === 1 && m === "DELETE") return this.deleteMe(me);
      if (parts[1] === "phone" && parts.length === 3 && m === "POST" && parts[2] === "start") return this.phoneStart(me, body);
      if (parts[1] === "phone" && parts.length === 3 && m === "POST" && parts[2] === "check") return this.phoneCheck(me, body);
      if (parts[1] === "test-ring" && parts.length === 2 && m === "POST") return this.testRing(me);
      if (parts[1] === "phone" && parts.length === 2 && m === "DELETE") {
        this.ctx.storage.sql.exec("UPDATE accounts SET phone_hash = NULL, phone_last4 = NULL WHERE id = ?", me.id);
        return json({ ok: true });
      }
    }
    if (parts[0] === "lookup" && parts.length === 1 && m === "POST") return this.lookup(me, body);
    if (parts[0] === "calls") {
      if (parts.length === 1 && m === "POST") return this.startCall(me, body);
      const call = parts[1] && this.row("SELECT * FROM calls WHERE id = ?", parts[1]);
      if (!call || (call.caller !== me.id && call.callee !== me.id)) return fail("not_found", 404);
      if (parts.length === 2 && m === "GET") return json({ call: this.callView(call) });
      if (parts.length === 3 && m === "POST") return this.changeCall(me, call, parts[2], body);
    }
    return fail("not_found", 404);
  }

  async createAccount(body, ip) {
    if (this.limited("accounts", ip)) return fail("rate_limited", 429);
    const handle = String(body.handle ?? "").toLowerCase().trim();
    const name = clean(body.name, 30);
    if (!HANDLE_RE.test(handle)) return fail("bad_handle");
    if (!name) return fail("bad_name");
    if (this.row("SELECT 1 AS x FROM accounts WHERE handle = ?", handle)) return fail("handle_taken", 409);
    const id = crypto.randomUUID();
    const token = randomToken(32);
    this.ctx.storage.sql.exec("INSERT INTO accounts (id, handle, name, token_hash, created) VALUES (?, ?, ?, ?, ?)",
      id, handle, name, await sha256(token), Date.now());
    return json({ account: this.publicAccount(this.row("SELECT * FROM accounts WHERE id = ?", id), true), token });
  }

  updateMe(me, body) {
    if (body.handle !== undefined) {
      const handle = String(body.handle).toLowerCase().trim();
      if (!HANDLE_RE.test(handle)) return fail("bad_handle");
      const other = this.row("SELECT id FROM accounts WHERE handle = ?", handle);
      if (other && other.id !== me.id) return fail("handle_taken", 409);
      this.ctx.storage.sql.exec("UPDATE accounts SET handle = ? WHERE id = ?", handle, me.id);
    }
    if (body.name !== undefined) {
      const name = clean(body.name, 30);
      if (!name) return fail("bad_name");
      this.ctx.storage.sql.exec("UPDATE accounts SET name = ? WHERE id = ?", name, me.id);
    }
    if (body.voipToken !== undefined) {
      const t = body.voipToken === null ? null : String(body.voipToken);
      if (t !== null && !/^[0-9a-f]{32,200}$/i.test(t)) return fail("bad_token");
      // A device token belongs to one account at a time.
      if (t) this.ctx.storage.sql.exec("UPDATE accounts SET voip_token = NULL WHERE voip_token = ? AND id != ?", t, me.id);
      this.ctx.storage.sql.exec("UPDATE accounts SET voip_token = ?, sandbox = ? WHERE id = ?", t, body.sandbox ? 1 : 0, me.id);
    }
    return json({ account: this.publicAccount(this.row("SELECT * FROM accounts WHERE id = ?", me.id), true) });
  }

  deleteMe(me) {
    this.ctx.storage.sql.exec("DELETE FROM calls WHERE caller = ? OR callee = ?", me.id, me.id);
    this.ctx.storage.sql.exec("DELETE FROM accounts WHERE id = ?", me.id);
    for (const ws of this.ctx.getWebSockets(me.id)) { try { ws.close(4001, "deleted"); } catch {} }
    return json({ ok: true });
  }

  // Rings my own device through Apple, to check the push setup end to end.
  async testRing(me) {
    if (this.limited("calls", me.id)) return fail("rate_limited", 429);
    if (!me.voip_token) return json({ ok: false, error: "no_device_token" });
    const call = {
      id: crypto.randomUUID(), from: { handle: "games.chat", name: "Games Chat test call" },
      to: { handle: me.handle, name: me.name }, room: "call-ringtest", status: "ringing", created: Date.now(),
    };
    const push = await this.voip(me, { kind: "ring", call });
    return json({ ...push, sandbox: !!me.sandbox });
  }

  // --- phone numbers ---------------------------------------------------------------
  twilio(path, form) {
    const e = this.env;
    return fetch(`https://verify.twilio.com/v2/Services/${e.TWILIO_VERIFY_SID}/${path}`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form),
    });
  }

  smsReady() {
    const e = this.env;
    return !!(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && e.TWILIO_VERIFY_SID) || !!e.DEV_CODE;
  }

  async phoneStart(me, body) {
    const phone = String(body.phone ?? "");
    if (!PHONE_RE.test(phone)) return fail("bad_phone");
    if (!this.smsReady()) return fail("sms_not_configured", 501);
    if (this.limited("phone", me.id)) return fail("rate_limited", 429);
    if (this.env.DEV_CODE) return json({ ok: true, dev: true });
    const res = await this.twilio("Verifications", { To: phone, Channel: "sms" });
    if (!res.ok) return fail("sms_failed", 502);
    return json({ ok: true });
  }

  async phoneCheck(me, body) {
    const phone = String(body.phone ?? ""), code = String(body.code ?? "").trim();
    if (!PHONE_RE.test(phone) || !/^[0-9]{4,10}$/.test(code)) return fail("bad_code");
    if (!this.smsReady()) return fail("sms_not_configured", 501);
    let ok;
    if (this.env.DEV_CODE) ok = code === String(this.env.DEV_CODE);
    else {
      const res = await this.twilio("VerificationCheck", { To: phone, Code: code });
      ok = res.ok && (await res.json()).status === "approved";
    }
    if (!ok) return fail("wrong_code", 403);
    const hash = await this.phoneHash(phone);
    // A number belongs to whoever verified it last.
    this.ctx.storage.sql.exec("UPDATE accounts SET phone_hash = NULL, phone_last4 = NULL WHERE phone_hash = ?", hash);
    this.ctx.storage.sql.exec("UPDATE accounts SET phone_hash = ?, phone_last4 = ? WHERE id = ?", hash, phone.slice(-4), me.id);
    return json({ account: this.publicAccount(this.row("SELECT * FROM accounts WHERE id = ?", me.id), true) });
  }

  // Which of these handles and phone numbers have the app. Numbers are only
  // matched, never listed: you learn about a number only if you already have it.
  async lookup(me, body) {
    if (this.limited("lookup", me.id)) return fail("rate_limited", 429);
    const found = [];
    for (const h of (Array.isArray(body.handles) ? body.handles : []).slice(0, MAX_LOOKUP)) {
      const a = this.row("SELECT * FROM accounts WHERE handle = ?", String(h).toLowerCase().replace(/^@/, ""));
      if (a) found.push({ handle: a.handle, name: a.name, query: h });
    }
    for (const p of (Array.isArray(body.phones) ? body.phones : []).slice(0, MAX_LOOKUP)) {
      if (!PHONE_RE.test(String(p))) continue;
      const a = this.row("SELECT * FROM accounts WHERE phone_hash = ?", await this.phoneHash(String(p)));
      if (a) found.push({ handle: a.handle, name: a.name, query: p });
    }
    return json({ found });
  }

  // --- calls -------------------------------------------------------------------------
  async findCallee(to) {
    const t = String(to ?? "").trim();
    if (PHONE_RE.test(t)) return this.row("SELECT * FROM accounts WHERE phone_hash = ?", await this.phoneHash(t));
    return this.row("SELECT * FROM accounts WHERE handle = ?", t.toLowerCase().replace(/^@/, ""));
  }

  async startCall(me, body) {
    if (this.limited("calls", me.id)) return fail("rate_limited", 429);
    const room = String(body.room ?? "");
    if (!ROOM_RE.test(room)) return fail("bad_room");
    const callee = await this.findCallee(body.to);
    if (!callee) return fail("not_found", 404);
    if (callee.id === me.id) return fail("cannot_call_self");
    const now = Date.now();
    const id = crypto.randomUUID();
    this.ctx.storage.sql.exec("INSERT INTO calls (id, caller, callee, room, status, created, updated) VALUES (?, ?, ?, ?, 'ringing', ?, ?)",
      id, me.id, callee.id, room, now, now);
    const call = this.callView(this.row("SELECT * FROM calls WHERE id = ?", id));
    const live = this.tell(callee.id, { t: "ring", call });
    let push = null;
    if (!live && callee.voip_token) push = await this.voip(callee, { kind: "ring", call });
    await this.ctx.storage.setAlarm(now + RING_MS + 1000);
    return json({ call, delivered: live ? "app" : push?.ok ? "push" : callee.voip_token ? "push_failed" : "offline", push });
  }

  async changeCall(me, call, action, body) {
    const now = Date.now();
    let status;
    if (action === "answer" && me.id === call.callee && call.status === "ringing") {
      // Answering while already in a call: the caller joins that call instead.
      const room = body.room && ROOM_RE.test(String(body.room)) ? String(body.room) : call.room;
      this.ctx.storage.sql.exec("UPDATE calls SET room = ? WHERE id = ?", room, call.id);
      status = "answered";
    } else if (action === "decline" && me.id === call.callee && call.status === "ringing") status = "declined";
    else if (action === "cancel" && me.id === call.caller && call.status === "ringing") status = "cancelled";
    else if (action === "end" && (call.status === "answered" || call.status === "ringing")) status = "ended";
    else return fail("bad_state", 409);
    this.ctx.storage.sql.exec("UPDATE calls SET status = ?, updated = ? WHERE id = ?", status, now, call.id);
    const view = this.callView(this.row("SELECT * FROM calls WHERE id = ?", call.id));
    this.tell(call.caller, { t: "call", call: view });
    const live = this.tell(call.callee, { t: "call", call: view });
    // Stop the callee's phone ringing if the caller gave up.
    if (status === "cancelled" && !live) {
      const callee = this.row("SELECT * FROM accounts WHERE id = ?", call.callee);
      if (callee?.voip_token) await this.voip(callee, { kind: "cancel", call: view });
    }
    return json({ call: view });
  }

  // Calls that rang out become "missed"; old calls are forgotten.
  sweep() {
    const now = Date.now();
    const stale = this.ctx.storage.sql.exec("SELECT * FROM calls WHERE status = 'ringing' AND created < ?", now - RING_MS).toArray();
    for (const c of stale) {
      this.ctx.storage.sql.exec("UPDATE calls SET status = 'missed', updated = ? WHERE id = ?", now, c.id);
      const view = this.callView({ ...c, status: "missed" });
      this.tell(c.caller, { t: "call", call: view });
      this.tell(c.callee, { t: "call", call: view });
    }
    this.ctx.storage.sql.exec("DELETE FROM calls WHERE created < ?", now - CALL_KEEP_MS);
    return stale;
  }

  async alarm() {
    for (const c of this.sweep()) {
      const callee = this.row("SELECT * FROM accounts WHERE id = ?", c.callee);
      if (callee?.voip_token) await this.voip(callee, { kind: "cancel", call: this.callView({ ...c, status: "missed" }) });
    }
    if (this.row("SELECT 1 AS x FROM calls WHERE status = 'ringing'")) await this.ctx.storage.setAlarm(Date.now() + 5000);
  }

  webSocketMessage(ws, message) {
    if (message === "ping") ws.send("pong");
  }

  // --- Apple VoIP push ---------------------------------------------------------------
  async apnsJwt() {
    const e = this.env;
    if (this.jwt && Date.now() - this.jwt.at < 40 * 60_000) return this.jwt.token;
    this.jwt = { at: Date.now(), token: await makeApnsJwt({ key: e.APNS_KEY, keyId: e.APNS_KEY_ID, teamId: e.APNS_TEAM_ID }) };
    return this.jwt.token;
  }

  async voip(account, payload) {
    const e = this.env;
    if (!e.APNS_KEY || !e.APNS_KEY_ID || !e.APNS_TEAM_ID || !e.APNS_TOPIC) return { ok: false, error: "apns_not_configured" };
    const host = account.sandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";
    try {
      const res = await fetch(`https://${host}/3/device/${account.voip_token}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${await this.apnsJwt()}`,
          "apns-topic": `${e.APNS_TOPIC}.voip`,
          "apns-push-type": "voip",
          "apns-priority": "10",
          "apns-expiration": "0",
        },
        body: JSON.stringify({ aps: {}, ...payload }),
      });
      if (res.status === 410 || res.status === 400) {
        const why = await res.json().catch(() => ({}));
        if (why.reason === "Unregistered" || why.reason === "BadDeviceToken") {
          this.ctx.storage.sql.exec("UPDATE accounts SET voip_token = NULL WHERE id = ?", account.id);
        }
        return { ok: false, status: res.status, reason: why.reason };
      }
      return { ok: res.ok, status: res.status };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }
}

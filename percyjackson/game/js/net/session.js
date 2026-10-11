// One browser's connection to a mini-rooms room (MULTIPLAYER.md), after
// Brick Kart's session (hoai2k/francis, brick-kart/js/online/session.js).
//
// What it adds to the plain relay client:
// - stable identities: every presence carries our uid (the main profile id of
//   this tab) and name, and the roster is keyed by uid, so a reconnect is the
//   same player with a new peer id
// - presence publishing with a heartbeat, and a re-send whenever someone new
//   appears (the relay hands newcomers empty presence after hibernation)
// - a shared clock: guests estimate the host's clock with ping / pong topics
//   (the sample with the smallest round trip wins; corrections ease in)
// - leaving is decided late: a player missing from the room is "missing" for
//   LEAVE_GRACE before they count as gone, so a quick reconnect is no leave
// - reconnecting: a guest whose socket drops re-joins the same room with backoff
// - host migration: the relay closes the room when the host leaves. Everyone
//   agrees on the next host from the join order the host published (the first
//   remaining player), who hosts "<base>-g<gen+1>"; the others join it (and the
//   next in line hosts it if the first never shows). The new host keeps serving
//   the old host's timeline, so shared timestamps stay valid.
//
// It never throws into the game: failures end in 'status' / 'fatal' events.
import { PROTO, GAME, SOCKETS, HEARTBEAT, ID_RE, ROOM_RE, str, num, cleanName, baseOf } from './proto.js';

const CLOCK = ['ping', 'pong'];
const LEAVE_GRACE = 3000;
const now = () => performance.now();

let loading = null;
export function loadClient(timeoutMs = 10000) {
  if (window.MiniRooms) return Promise.resolve(window.MiniRooms);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    // published next to the game; in the repository it lives in multiplayer/client/
    const srcs = [new URL('../../mini-rooms.js', import.meta.url).href, new URL('../../../../multiplayer/client/mini-rooms.js', import.meta.url).href];
    const timer = setTimeout(() => reject(new Error('mini-rooms load timed out')), timeoutMs);
    const tryLoad = (list) => {
      if (!list.length) { clearTimeout(timer); reject(new Error('Could not load the multiplayer client')); return; }
      const s = document.createElement('script');
      s.src = list[0];
      s.onload = () => { if (window.MiniRooms) { clearTimeout(timer); resolve(window.MiniRooms); } else tryLoad(list.slice(1)); };
      s.onerror = () => { s.remove(); tryLoad(list.slice(1)); };
      document.head.appendChild(s);
    };
    tryLoad(srcs);
  });
  loading.catch(() => { loading = null; });
  return loading;
}

export class Session {
  constructor(lib, { uid, name, topics = [] }) {
    this.net = lib.connect(GAME);
    this.me = { uid, name: cleanName(name) };
    this.topics = topics;
    this.room = null; this.roomId = null; this.base = null; this.gen = 0;
    this.isHost = false;
    this.status = 'idle';          // idle | connecting | open | reconnecting | migrating | closed
    this.peers = new Map();        // peer id -> { pid, uid, name, p, t }
    this.byUid = new Map();        // uid -> peer (everyone but me)
    this.order = [];               // host: uids in join order (published as R.o)
    this.formerPos = new Map();
    this.mine = {};                // my presence fields (set by the game)
    this.hostUid = null; this.hostP = null; this.lastRoom = null; this.hostSeenAt = 0;
    this.handlers = {};
    this.offset = 0; this.synced = false; this.samples = []; this.pingT = 0; this.pingN = 0; this.pings = new Map(); this.rtt = 0;
    this.pubT = 0; this.dirty = false; this.republishAt = 0;
    this.graceUntil = 0;
    this.missing = new Map();
    this.closing = false;
  }
  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); }
  emit(evt, ...a) { for (const fn of this.handlers[evt] || []) { try { fn(...a); } catch (e) { console.error('online:', evt, e); } } }
  setStatus(s, info) { this.status = s; this.emit('status', s, info); }
  get ready() { return !!this.room?.ready; }

  // ---- lobby: the open rooms every 4 s (each request gives up after 6 s)
  watchRooms(cb) {
    let stopped = false, timer = null;
    const tick = async () => {
      let res;
      try { res = { rooms: await Promise.race([this.net.listRooms(), new Promise((_, no) => setTimeout(() => no(new Error('lobby timed out')), 6000))]) }; } catch (error) { res = { rooms: [], error }; }
      if (stopped) return;
      try { cb(res); } catch (e) { console.error(e); }
      timer = setTimeout(tick, 4000);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }

  // ---- hosting and joining
  host(id, title) {
    this.title = str(title, 40) || 'Camp Half-Blood';
    this.base = id; this.gen = 0; this.order = [this.me.uid];
    this.offset = 0; this.synced = true; this.hostUid = this.me.uid;
    this.setStatus('connecting');
    this.open(id, true, (err) => {
      if (err) { this.fatal(err === 'taken' ? 'taken' : 'unreachable'); return; }
      this.setStatus('open'); this.emit('joined', { asHost: true });
    });
  }
  join(id) {
    if (typeof id !== 'string' || !ROOM_RE.test(id)) { this.fatal('not_found'); return; }
    const b = baseOf(id); this.base = b.base; this.gen = b.gen;
    this.setStatus('connecting');
    this.open(id, false, (err) => {
      if (err) { this.fatal(err === 'disconnected' || err === 'timeout' ? 'unreachable' : err); return; }
      this.setStatus('open'); this.hostSeenAt = now();
      this.emit('joined', { asHost: false });
      this.startSync();
    });
  }
  open(id, asHost, cb) {
    this.drop();
    let room;
    try { room = asHost ? this.net.host(id, { title: this.title || 'Camp Half-Blood', name: this.me.name, capacity: SOCKETS }) : this.net.join(id, { name: this.me.name }); } catch (e) { console.error(e); setTimeout(() => cb('disconnected'), 0); return; }
    this.room = room; this.roomId = id; this.isHost = asHost;
    this.peers.clear();
    let done = false;
    const finish = (err) => { if (done) return; done = true; clearTimeout(timer); cb(err); };
    const timer = setTimeout(() => { if (!done) { try { room.leave(); } catch (e) { /* gone */ } if (this.room === room) this.room = null; finish('timeout'); } }, 9000);
    room.onClose((reason) => {
      if (!done) { if (this.room === room) this.room = null; finish(reason || 'disconnected'); return; }
      if (this.room === room) { this.room = null; this.lost(reason || 'disconnected'); }
    });
    room.subscribePresence(({ peers }) => {
      if (this.room !== room || !room.ready) return;
      this.onPeers(peers);
      if (!done) { this.publish(true); finish(null); }
    });
    for (const t of [...CLOCK, ...this.topics]) room.subscribeTopic(t, (d, from) => { if (this.room === room) { try { this.onTopic(t, d, from); } catch (e) { console.error('online topic', t, e); } } });
  }
  drop() { const r = this.room; this.room = null; if (r) { try { r.leave(); } catch (e) { /* closed */ } } }
  // The host steps down on purpose (its tab is going into the background, where
  // it can't run the monsters): close the room and follow everyone to the
  // successor as a guest.
  handoff() { if (!this.isHost || !this.ready || this.closing || !this.byUid.size) return false; this.drop(); this.migrate(true); return true; }
  // A guest gives up on a host that has gone silent without leaving.
  abandonHost() { if (this.isHost || !this.ready || this.closing) return false; this.drop(); this.migrate(false); return true; }
  leave() { this.closing = true; clearTimeout(this.retryT); this.drop(); this.setStatus('closed'); }
  fatal(reason) { clearTimeout(this.retryT); this.drop(); this.setStatus('closed', reason); this.emit('fatal', reason); }
  lost(reason) {
    if (this.closing || reason === 'left') return;
    if (reason === 'host_left') { this.migrate(false); return; }
    if (this.isHost) { this.migrate(true); return; }   // our room went with our socket
    if (reason === 'full' || reason === 'not_found' || reason === 'taken') { this.migrate(false); return; }
    this.reconnect();
  }
  // A guest lost its socket: re-join the same room with backoff (play goes on meanwhile).
  reconnect() {
    this.graceUntil = now() + 30000;
    this.setStatus('reconnecting');
    const t0 = now(), waits = [300, 800, 1500, 2500, 4000];
    let n = 0, refused = 0;
    const attempt = () => {
      if (this.closing) return;
      this.open(this.roomId, false, (err) => {
        if (this.closing) return;
        if (!err) { this.setStatus('open'); this.graceUntil = now() + 6000; this.hostSeenAt = now(); this.emit('reconnected'); this.startSync(); return; }
        if (err === 'not_found') { this.migrate(false); return; }
        if (err === 'full') { this.fatal('full'); return; }
        if (err === 'disconnected') refused++;
        if (now() - t0 > 15000 || (refused >= 5 && now() - t0 > 7000)) { this.fatal('unreachable'); return; }
        this.retryT = setTimeout(attempt, waits[Math.min(n++, waits.length - 1)]);
      });
    };
    attempt();
  }
  // The host is gone: the first remaining player in its join order hosts the successor room.
  migrate(wasHost) {
    const R = (wasHost ? this.mine.R : this.lastRoom) || {};
    const order = Array.isArray(R.o) ? R.o.filter((u) => typeof u === 'string') : [];
    const oldHost = wasHost ? this.me.uid : this.hostUid;
    const known = (u) => u === this.me.uid || this.byUid.has(u);
    let cands = order.filter((u) => u !== oldHost && known(u));
    for (const u of this.byUid.keys()) if (u !== oldHost && !cands.includes(u)) cands.push(u);
    if (!wasHost && !cands.includes(this.me.uid)) cands.push(this.me.uid);
    if (!cands.length) cands = [this.me.uid];
    const rank = cands.indexOf(this.me.uid);
    const gen = Math.max(this.gen, num(R.g, 0, 999, 0)) + 1;
    const id = `${this.base}-g${gen}`.slice(0, 64);
    this.gen = gen;
    this.graceUntil = now() + 30000;
    const next = cands[0] === this.me.uid ? this.me.name : this.byUid.get(cands[0])?.name || '';
    this.setStatus('migrating', { next, wasHost });
    this.emit('migrating', { wasHost, nextUid: cands[0] });
    const t0 = now();
    this.refused = 0;
    const attempt = () => {
      if (this.closing) return;
      const el = now() - t0;
      if (el > 20000 || (this.refused >= 8 && el > 8000)) { this.fatal(this.refused > 4 ? 'unreachable' : 'host_lost'); return; }
      const myTurn = rank >= 0 && el >= rank * 4000;
      const done = (asHost) => {
        this.setStatus('open');
        this.graceUntil = now() + 6000;
        if (asHost) { this.hostUid = this.me.uid; this.synced = true; this.order = [this.me.uid, ...order.filter((u) => u !== this.me.uid && u !== oldHost)]; } else { this.startSync(); this.hostSeenAt = now(); }
        this.emit('migrated', { asHost, wasHost });
      };
      if (myTurn) {
        this.title = `${this.me.name}'s camp`;
        this.open(id, true, (err) => {
          if (this.closing) return;
          if (!err) { done(true); return; }
          if (err === 'taken') this.open(id, false, (e2) => { if (!e2) done(false); else this.retryT = setTimeout(attempt, 700); });
          else { if (err === 'disconnected') this.refused++; this.retryT = setTimeout(attempt, 900); }
        });
      } else {
        this.open(id, false, (err) => {
          if (this.closing) return;
          if (!err) { done(false); return; }
          if (err === 'full') { this.fatal('full'); return; }
          if (err === 'disconnected') this.refused++;
          this.retryT = setTimeout(attempt, 700);
        });
      }
    };
    this.retryT = setTimeout(attempt, rank === 0 ? 0 : 400);
  }

  // ---- presence: the game keeps its fields in this.mine and calls publish()
  publish(force = false, minGap = 0) {
    const t = now();
    if (!force && t - this.pubT < minGap) { this.dirty = true; return; }
    if (!this.room?.ready) { this.dirty = true; return; }
    this.pubT = t; this.dirty = false;
    const p = { v: PROTO, u: this.me.uid, n: this.me.name, ...this.mine };
    if (this.isHost) { p.h = 1; p.R = { o: this.order, g: this.gen }; this.mine.R = p.R; }
    try { this.room.publishPresence(p); } catch (e) { console.error(e); }
  }
  onPeers(peers) {
    const seen = new Set(), before = new Set(this.byUid.keys()), changed = [];
    let host = null, newPeer = false;
    for (const [pid, raw] of Object.entries(peers || {})) {
      let peer = this.peers.get(pid);
      if (!peer) { peer = { pid, uid: null, name: '', p: null, t: now() }; this.peers.set(pid, peer); newPeer = true; }
      const d = raw && typeof raw === 'object' && raw.v === PROTO ? raw : null;
      if (d && typeof d.u === 'string' && ID_RE.test(d.u) && d.u !== this.me.uid) {
        if (peer.p !== d) { changed.push(peer); peer.t = now(); }
        peer.uid = d.u; peer.name = cleanName(str(d.n, 24)); peer.p = d; peer.host = d.h === 1;
        seen.add(d.u);
        const old = this.byUid.get(d.u);
        if (!old || old === peer || peer.t >= old.t || !this.peers.has(old.pid)) this.byUid.set(d.u, peer);
        if (peer.host && this.byUid.get(d.u) === peer) host = peer;
      }
    }
    for (const pid of [...this.peers.keys()]) if (!(pid in (peers || {}))) this.peers.delete(pid);
    for (const u of seen) this.missing.delete(u);
    for (const u of seen) if (!before.has(u)) this.emit('arrived', this.byUid.get(u));
    if (this.isHost) {
      this.order = this.order.filter((u, i) => { const keep = u === this.me.uid || this.byUid.has(u); if (!keep) this.formerPos.set(u, i); return keep; });
      for (const u of seen) {
        if (this.order.includes(u)) continue;
        const at = this.formerPos.get(u); this.formerPos.delete(u);
        if (at === undefined) this.order.push(u); else this.order.splice(Math.max(1, Math.min(at, this.order.length)), 0, u);
      }
      if (this.formerPos.size > 40) this.formerPos.delete(this.formerPos.keys().next().value);
    } else if (host) {
      if (host.p !== this.hostP) this.hostSeenAt = now();
      this.hostUid = host.uid; this.hostP = host.p;
      if (host.p.R && typeof host.p.R === 'object') { this.lastRoom = host.p.R; this.gen = Math.max(this.gen, num(host.p.R.g, 0, 999, 0)); }
    }
    if (newPeer) this.republishAt = now() + 150 + Math.random() * 250;
    this.emit('peers', changed);
  }
  // players no longer in the room: missing first, gone after LEAVE_GRACE
  sweep() {
    if (now() < this.graceUntil || !this.room?.ready) return;
    const t = now(), live = new Set();
    let hello = false;
    for (const p of this.peers.values()) { if (p.uid) live.add(p.uid); else hello = true; }
    for (const [u, peer] of [...this.byUid]) {
      if (live.has(u)) { this.missing.delete(u); continue; }
      if (!this.missing.has(u)) { this.missing.set(u, t); this.emit('missing', peer); continue; }
      if (t - this.missing.get(u) > (hello ? 10000 : LEAVE_GRACE)) { this.missing.delete(u); this.byUid.delete(u); this.emit('left', peer); }
    }
  }
  // ---- topics
  send(topic, data) {
    if (!this.room?.ready) return false;
    try { this.room.publishTopic(topic, { v: PROTO, u: this.me.uid, ...data }); return true; } catch (e) { console.error(e); return false; }
  }
  onTopic(topic, d, from) {
    if (!d || typeof d !== 'object') return;
    // (the chapter objectives' `act` topic predates this protocol: it carries v 1)
    if (d.v !== PROTO && !(topic === 'act' && d.v === 1)) return;
    if (topic === 'ping') { if (this.isHost && typeof d.a === 'number' && typeof d.u === 'string') this.send('pong', { a: d.a, h: this.sharedNow(), to: d.u }); return; }
    if (topic === 'pong') {
      if (d.to !== this.me.uid || this.isHost) return;
      const sent = this.pings.get(d.a);
      if (sent === undefined || typeof d.h !== 'number' || !Number.isFinite(d.h)) return;
      this.pings.delete(d.a);
      const t = now(), rtt = t - sent;
      if (rtt < 0 || rtt > 5000) return;
      this.samples.push({ rtt, off: d.h + rtt / 2 - t });
      if (this.samples.length > 12) this.samples.shift();
      let best = this.samples[0];
      for (const s of this.samples) if (s.rtt < best.rtt) best = s;
      if (!this.synced) { this.offset = best.off; this.synced = true; this.emit('synced'); } else this.targetOffset = best.off;
      this.rtt = best.rtt;
      return;
    }
    const peer = typeof d.u === 'string' ? this.byUid.get(d.u) : null;
    this.emit('topic', topic, d, peer || null, from);
  }
  // ---- shared clock (ms)
  sharedNow() { return now() + this.offset; }
  startSync() { this.samples = []; this.pings.clear(); this.synced = false; this.targetOffset = undefined; this.pingN = 6; this.pingT = 0; }
  ping() {
    const a = Math.round(now() * 1000) / 1000;
    this.pings.set(a, now());
    if (this.pings.size > 20) this.pings.delete(this.pings.keys().next().value);
    this.send('ping', { a });
  }
  tick(dt) {
    const t = now();
    if (!this.room?.ready) return;
    if (!this.isHost) {
      this.pingT -= dt;
      if (this.pingT <= 0) { if (this.pingN > 0) { this.pingN--; this.pingT = 0.25; } else this.pingT = 6; this.ping(); }
      if (this.targetOffset !== undefined) {
        const d = this.targetOffset - this.offset;
        if (Math.abs(d) > 250) this.offset = this.targetOffset;
        else this.offset += Math.max(-dt * 8, Math.min(dt * 8, d));
      }
    }
    if (this.republishAt && t >= this.republishAt) { this.republishAt = 0; this.publish(true); }
    else if (this.dirty) this.publish(true);
    else if (t - this.pubT > HEARTBEAT * 1000) this.publish(true);
    this.sweep();
  }
  // the room's members (me first), in join order
  members() {
    const list = [{ uid: this.me.uid, name: this.me.name, me: true, host: this.isHost, p: this.mine }];
    for (const peer of this.byUid.values()) list.push({ uid: peer.uid, name: peer.name, me: false, host: peer.uid === this.hostUid, missing: this.missing.has(peer.uid), p: peer.p || {} });
    const order = this.isHost ? this.order : (this.lastRoom?.o || []);
    const pos = (u) => { const i = order.indexOf(u); return i < 0 ? 999 : i; };
    return list.sort((a, b) => pos(a.uid) - pos(b.uid));
  }
}

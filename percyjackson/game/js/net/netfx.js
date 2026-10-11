// What other browsers should see happen: effects, telegraphs, projectiles
// and ground hazards made by the things this browser simulates (its own
// heroes, and on the host the monsters, bosses and AI companions) are
// recorded while those things update, batched into one `ev` topic every
// 50 ms, and replayed on the other browsers when the sender's objects are
// drawn at that moment (sender time + that sender's render delay), so a
// projectile leaves the monster you can see.
//
// Replays are for the eyes only: a replayed projectile does no damage (its
// owner's browser decides hits), a replayed hazard burns nobody, and nothing
// a replay does is recorded again.
import * as THREE from 'three/webgpu';
import { r2 } from './proto.js';

const FX = ['shockwave', 'slashArc', 'explosion', 'splat', 'summonCircle', 'blinkPuff', 'slashLine', 'slashX', 'heal', 'hitSpark', 'poof', 'debris', 'curseDeath', 'blackLightning', 'landDust', 'splash', 'flash'];
const SKIP = new Set(['onHit', 'onExpire', 'trail', 'owner', 'src', 'mesh', 'hit', 'lightH']);
const MAX_OUT = 40;

export class NetFx {
  constructor(online) {
    this.on = online; this.g = online.game;
    this.out = []; this.pend = [];
    this.cap = 0; this.inner = 0; this.replaying = false;
    this.flushT = 0;
    this.stats = { sent: 0, recv: 0, played: 0, dropped: 0 };
  }
  // Wrap the effect makers once (they record only while capturing).
  install() {
    if (this.installed) return; this.installed = true;
    const g = this.g, self = this;
    const wrap = (obj, name, type) => {
      const orig = obj?.[name]; if (typeof orig !== 'function') return;
      obj[name] = function (...args) {
        if (self.cap > 0 && self.inner === 0 && !self.replaying) self.record(type, args);
        self.inner++;
        try { return orig.apply(this, args); } finally { self.inner--; }
      };
    };
    for (const f of FX) wrap(g.fx, f, 'fx.' + f);
    wrap(g.bolts, 'spawn', 'bolts');
    wrap(g.markers, 'spawn', 'marker');
    wrap(g.projectiles, 'fire', 'proj');
    wrap(g.hazards, 'add', 'hazard');
    // what a monster's projectile leaves behind when it lands (host)
    const kill = g.projectiles.kill;
    g.projectiles.kill = function (p, reason) {
      if (p?.team === 'enemy' && !p.replay && self.on.isHost) return self.capture(() => kill.call(this, p, reason));
      return kill.call(this, p, reason);
    };
  }
  capture(fn) { this.cap++; try { return fn(); } finally { this.cap--; } }
  // Record whatever obj.update makes (heroes, monsters, allies this browser runs).
  wrapUpdate(obj) {
    if (!obj || Object.prototype.hasOwnProperty.call(obj, 'update')) return;
    const self = this, proto = Object.getPrototypeOf(obj).update;
    if (typeof proto !== 'function') return;
    obj.update = function (dt) { self.cap++; try { return proto.call(this, dt); } finally { self.cap--; } };
    obj._netCap = true;
  }
  unwrapUpdate(obj) { if (obj?._netCap) { delete obj.update; delete obj._netCap; } }

  // ---- encoding (vectors, colours, entities by id; functions dropped)
  enc(v, depth = 0) {
    if (v == null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return typeof v === 'number' ? r2(v) : v;
    if (v.isVector3) return { v: [r2(v.x), r2(v.y), r2(v.z)] };
    if (v.isColor) return v.getHex();
    if (v.isEnemy || v.isBoss) return { e: this.on.netIdOf(v) };
    if (v.isPlayer) return { p: this.on.keyOf(v) };
    if (typeof v === 'function' || v.isObject3D || depth > 2) return undefined;
    if (Array.isArray(v)) return v.length <= 16 ? v.map((x) => this.enc(x, depth + 1)) : undefined;
    if (typeof v === 'object') {
      const o = {};
      for (const [k, x] of Object.entries(v)) { if (SKIP.has(k)) continue; const e = this.enc(x, depth + 1); if (e !== undefined) o[k] = e; }
      return o;
    }
    return undefined;
  }
  dec(v, depth = 0) {
    if (v == null || typeof v !== 'object') return v;
    if (depth > 3) return undefined;
    if (Array.isArray(v.v) && v.v.length === 3 && v.v.every(Number.isFinite)) return new THREE.Vector3(v.v[0], v.v[1], v.v[2]);
    if (v.e !== undefined && Object.keys(v).length === 1) return this.on.entityById(v.e);
    if (v.p !== undefined && Object.keys(v).length === 1) return this.on.heroByKey(v.p);
    if (Array.isArray(v)) return v.map((x) => this.dec(x, depth + 1));
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = this.dec(x, depth + 1);
    return o;
  }
  record(type, args) {
    if (!this.on.ready) return;
    if (this.out.length >= MAX_OUT) { this.stats.dropped++; return; }
    try { this.out.push([type, Math.round(this.on.session.sharedNow()), ...args.map((a) => this.enc(a))]); } catch (e) { /* not encodable: skip */ }
  }
  update(dt) {
    this.flushT -= dt;
    if (this.flushT <= 0 && this.out.length) {
      this.flushT = 0.05;
      this.on.session.send('ev', { e: this.out });
      this.stats.sent += this.out.length;
      this.out = [];
    }
    // play what is due
    if (!this.pend.length) return;
    const now = this.on.session?.sharedNow?.() ?? performance.now();
    for (let i = 0; i < this.pend.length; i++) {
      const p = this.pend[i];
      if (now - p.delay < p.t && now - p.t < 1000) continue;
      this.pend.splice(i--, 1);
      if (now - p.t < 2000) this.play(p.type, p.args);
    }
  }
  receive(d, uid) {
    if (!Array.isArray(d.e)) return;
    const delay = (this.on.lag(uid)?.delay ?? 0.12) * 1000;
    for (const ev of d.e.slice(0, MAX_OUT)) {
      if (!Array.isArray(ev) || typeof ev[0] !== 'string' || typeof ev[1] !== 'number') continue;
      this.pend.push({ type: ev[0], t: ev[1], args: ev.slice(2), delay });
      this.stats.recv++;
    }
    if (this.pend.length > 200) this.pend.splice(0, this.pend.length - 200);
  }
  play(type, raw) {
    const g = this.g;
    let args;
    try { args = raw.map((a) => this.dec(a)); } catch (e) { return; }
    this.replaying = true;
    try {
      if (type.startsWith('fx.')) {
        const f = type.slice(3);
        if (FX.includes(f) && typeof g.fx[f] === 'function') g.fx[f](...args);
      } else if (type === 'bolts') g.bolts.spawn(...args);
      else if (type === 'marker' && args[0]?.pos) g.markers.spawn({ ...args[0], follow: args[0].follow?.pos ? args[0].follow : null });
      else if (type === 'proj' && args[0]?.pos && args[0]?.vel) {
        const o = args[0];
        g.projectiles.fire({ ...o, dmg: 0, onHit: null, onExpire: null, trail: null, owner: null, target: o.target?.pos ? o.target : null, replay: true });
      } else if (type === 'hazard' && args[0]?.pos) {
        const n = g.hazards.list.length;
        g.hazards.add({ ...args[0], dps: 0, src: null });
        const h = g.hazards.list[n]; if (h) h.tick = 1e9;   // shown, never ticks damage
      }
      this.stats.played++;
    } catch (e) { /* a bad replay never breaks the frame */ } finally { this.replaying = false; }
  }
  clear() { this.out = []; this.pend = []; }
}

// Snapshot interpolation for things another browser simulates (remote heroes,
// and the host's monsters on a guest), after Brick Kart's netrace.js:
//
// - owners stamp each update with the shared clock (session.sharedNow)
// - receivers keep a short buffer per object and draw it at now − D, where D
//   adapts per sender: lateness + min(0.15 s, update spacing) + 2 × jitter +
//   15 ms, kept between 90 and 600 ms, growing by at most 15% a second and
//   shrinking by at most 5% a second (a single very late update is clamped)
// - past the newest update the object carries on with its velocity for 0.3 s,
//   then eases to a stop (a lost packet, a reconnect, a host change)
// - the shown pose moves by the sampled velocity and is pulled towards the
//   sampled pose with exp(−11·dt); jumps over SNAP metres (respawns, warps) snap
import { HZ } from './proto.js';

const BUF = 24;
export const SNAP = 8;
const EXTRAP = 0.3, EXTRAP_FADE = 0.5;
const SMOOTH = 11;

export const wrapAngle = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
export const angleDiff = (a, b) => wrapAngle(b - a);

// How late one sender's updates arrive, and so how far behind to draw them.
export class Lag {
  constructor() { this.late = 0.06; this.dev = 0.02; this.space = 1 / HZ; this.init = false; this.lastT = null; this.delay = 0.12; this.set = false; }
  // t: the update's shared time (s), nowT: shared now (s)
  observe(t, nowT) {
    const late = nowT - t;
    if (Number.isFinite(late) && Math.abs(late) < 5) {
      if (!this.init) { this.late = late; this.init = true; }
      this.dev += (Math.min(0.06, Math.abs(late - this.late)) - this.dev) * 0.1;
      this.late += (Math.min(late, this.late + 0.08) - this.late) * 0.1;
    }
    if (this.lastT !== null && t > this.lastT) this.space += (Math.min(0.5, t - this.lastT) - this.space) * 0.1;
    if (this.lastT === null || t > this.lastT) this.lastT = t;
  }
  target() { return Math.max(0.09, Math.min(0.6, this.late + Math.min(0.15, this.space) + 2 * this.dev + 0.015)); }
  ease(dt) {
    const want = this.target();
    if (!this.set) { this.delay = want; this.set = true; return; }
    this.delay += Math.max(-dt * 0.05 * this.delay, Math.min(dt * 0.15 * this.delay, want - this.delay));
  }
}

// One object's buffered samples: { t, x, y, z, f, vx, vy, vz, ...extra }.
export class Track {
  constructor() { this.buf = []; this.cur = { t: 0, x: 0, y: 0, z: 0, f: 0, vx: 0, vy: 0, vz: 0, extra: 0 }; }
  get n() { return this.buf.length; }
  newest() { return this.buf[this.buf.length - 1] ?? null; }
  push(s) {
    const last = this.newest();
    if (last && s.t <= last.t) { if (s.t < last.t - 5) this.buf.length = 0; else return false; }
    this.buf.push(s);
    if (this.buf.length > BUF) this.buf.shift();
    return true;
  }
  // seed the buffer with a state stamped at time t (a hand-over: start from where it is now)
  seed(s) { this.buf = [s]; }
  // the state at render time rt (s): between the two samples around it, or projected past the newest
  sample(rt) {
    const out = this.cur, b = this.buf;
    if (!b.length) return null;
    const newest = b[b.length - 1];
    if (rt >= newest.t || b.length === 1) {
      Object.assign(out, newest);
      const gap = Math.max(0, rt - newest.t);
      out.extra = gap;
      if (gap > 0) {
        // straight on for EXTRAP, then easing to a stop over EXTRAP_FADE
        const g = gap <= EXTRAP ? gap : EXTRAP + Math.min(EXTRAP_FADE, gap - EXTRAP) * (1 - Math.min(1, (gap - EXTRAP) / EXTRAP_FADE) * 0.5);
        out.x = newest.x + newest.vx * g; out.z = newest.z + newest.vz * g;
        out.y = newest.y + Math.max(-2, Math.min(2, newest.vy * Math.min(g, 0.15)));
        const k = gap <= EXTRAP ? 1 : Math.max(0, 1 - (gap - EXTRAP) / EXTRAP_FADE);
        out.vx = newest.vx * k; out.vz = newest.vz * k; out.vy = 0;
      }
      return out;
    }
    let i = b.length - 1;
    while (i > 0 && b[i - 1].t > rt) i--;
    if (i === 0) { Object.assign(out, b[0]); out.extra = 0; return out; }   // older than anything we have
    const A = b[i - 1], B = b[i], f = (rt - A.t) / Math.max(1e-4, B.t - A.t);
    Object.assign(out, f < 0.5 ? A : B);
    out.extra = 0;
    // a teleport between the two isn't a path: hold the earlier one, jump once
    const dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, reach = SNAP + (Math.hypot(A.vx, A.vz) + Math.hypot(B.vx, B.vz) + 8) * (B.t - A.t);
    if (dx * dx + dy * dy + dz * dz > reach * reach) { Object.assign(out, A); return out; }
    out.x = A.x + dx * f; out.y = A.y + dy * f; out.z = A.z + dz * f;
    out.f = wrapAngle(A.f + angleDiff(A.f, B.f) * f);
    out.vx = A.vx + (B.vx - A.vx) * f; out.vz = A.vz + (B.vz - A.vz) * f; out.vy = A.vy + (B.vy - A.vy) * f;
    return out;
  }
}

// The shown pose: predicted with the sample's velocity, eased onto the sample.
export function pose(pos, s, dt, snap = SNAP) {
  const dx = s.x - pos.x, dy = s.y - pos.y, dz = s.z - pos.z;
  if (dx * dx + dy * dy + dz * dz > snap * snap) { pos.set(s.x, s.y, s.z); return true; }
  pos.x += s.vx * dt; pos.z += s.vz * dt;
  const k = 1 - Math.exp(-SMOOTH * dt), ky = 1 - Math.exp(-SMOOTH * 1.6 * dt);
  pos.x += (s.x - pos.x) * k; pos.y += (s.y - pos.y) * ky; pos.z += (s.z - pos.z) * k;
  return false;
}

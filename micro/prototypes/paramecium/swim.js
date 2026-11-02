// How the Paramecium swims on the 2D slide (pure: no three.js; swim.test.mjs
// runs it in node). Seen from above: x right, y up the screen, z the depth
// (µm, the coverslip above, the slide below; DEPTH in route.js).
//
// - Quick and light (the owner, 2026-11-02: "the paramecium is quick"): LS
//   sets the speed (analogue, up to VMAX) and the way to go; the cell turns
//   to it fast (TURN rad/s) and, at low Reynolds number, stops almost at once
//   when you let go (TAU s).
// - A (dash): a ciliary sprint, DASH_V for DASH_T s, recharged in DASH_CD s.
// - B (the avoiding reaction): the cilia reverse; it backs up quickly and
//   swings its front round (towards the stick, or away from a threat).
// - Depth: RS up/down (or LB/RB) swims deeper / shallower at DEPTH_V. The
//   microscope's focus follows you (main.js).
// - Auto-weave (the owner: "sometimes you should automatically wind above or
//   below a simple obstacle plant"): touching a filament, a stalk or a clump
//   (an obstacle with `weave`), the cell slides over or under it on its own,
//   to the side its depth is already on (else the side with more room), a
//   little slowed; only something that fills the depth (a wall: the trap,
//   the giant amoeba) turns it aside, glancing along it.
//
// Obstacles (world.js `near`, main.js extras), all with a depth extent:
//   { kind: 'seg', x0, y0, z0, x1, y1, z1, r, weave }  a filament or stalk, round (radius r)
//   { kind: 'disc', x, y, z, r, h, weave }             a clump or a wall: radius r, half-thickness h
import { DEPTH } from './route.js';

export const LENGTH = 120;      // µm, P. bursaria (a broad, short Paramecium)
export const WIDTH = 52;        // µm across
export const THICK = 18;        // µm: the body's half-thickness (it is flattened)
export const VMAX = 620;        // µm/s
export const DASH_V = 1500, DASH_T = 0.28, DASH_CD = 0.9;
export const BACK_V = 700, BACK_T = 0.36;
export const DEPTH_V = 260;     // µm/s
export const TURN = 11;         // rad/s
export const TAU = 0.09;        // s: speed follows the stick this fast (and stops)
export const WEAVE_V = 520;     // µm/s: how fast it winds over or under
/** The body as three discs along its axis (offset ahead, radius). */
export const BODY = [[38, 21], [0, 26], [-38, 22]];
export const ZMIN = DEPTH.min + THICK, ZMAX = DEPTH.max - THICK;

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createSwimState(x = 0, y = 0, a = Math.PI / 2, z = 0) {
  return { x, y, z, a, v: 0, vx: 0, vy: 0, vz: 0, dashT: 0, dashCd: 0, backT: 0, backTurn: 0, weave: 0, weaveDir: 0, blocked: 0, contacts: [] };
}

/** Closest point parameter on segment (x0,y0)-(x1,y1) to (px,py), in the plane. */
function segT(o, px, py) {
  const dx = o.x1 - o.x0, dy = o.y1 - o.y0, L2 = dx * dx + dy * dy;
  return L2 > 1e-9 ? clamp(((px - o.x0) * dx + (py - o.y0) * dy) / L2, 0, 1) : 0;
}

/**
 * One body disc (centre px, py, pz, radius rb) against an obstacle: null when
 * clear, else { nx, ny (the plane's push-out direction), pen (µm), oz, need (µm
 * of depth that would clear it), up (the side to wind to: +1 over, -1 under) }.
 */
export function contact(o, px, py, pz, rb, thick = THICK) {
  let cx, cy, oz, R, H;
  if (o.kind === 'seg') {
    const t = segT(o, px, py);
    cx = o.x0 + (o.x1 - o.x0) * t; cy = o.y0 + (o.y1 - o.y0) * t; oz = o.z0 + (o.z1 - o.z0) * t; R = o.r; H = o.r;
  } else { cx = o.x; cy = o.y; oz = o.z; R = o.r; H = o.h; }
  const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
  const pen = rb + R - d;
  if (pen <= 0) return null;
  const gap = Math.abs(pz - oz) - (thick + H);
  if (gap >= 0) return null;
  const n = d > 1e-6 ? [dx / d, dy / d] : [1, 0];
  return { nx: n[0], ny: n[1], pen, oz, need: -gap, H, up: pz >= oz ? 1 : -1 };
}

/**
 * Advance the cell by dt.
 *   input: { mx, my, m (stick: world direction, y up; m 0..1), depth (-1 deeper .. +1 shallower) }
 *   env:   { obstacles: [...], drag = 1 (a crowd's slow-down), push: { x, y } (µm/s, a current), held }
 * Returns the state (contacts: this step's contacts, for the puffs and the rumble).
 */
export function stepSwim(S, input, env, dt) {
  const { mx = 0, my = 0, m = 0, depth = 0 } = input || {};
  const drag = env.drag ?? 1;
  S.dashCd = Math.max(0, S.dashCd - dt);
  // heading: toward the stick, fast
  if (S.backT > 0) {
    S.backT -= dt;
    S.a = wrap(S.a + S.backTurn * dt / BACK_T);
  } else if (m > 0.08) {
    const want = Math.atan2(my, mx);
    const da = wrap(want - S.a), step = TURN * dt * (S.dashT > 0 ? 0.5 : 1);
    S.a = wrap(S.a + clamp(da, -step, step));
  }
  // speed along the heading
  let target;
  if (S.backT > 0) target = -BACK_V;
  else if (S.dashT > 0) { S.dashT -= dt; target = DASH_V; }
  else {
    const align = m > 0.08 ? Math.max(0, Math.cos(wrap(Math.atan2(my, mx) - S.a))) : 0;
    target = VMAX * Math.min(1, m) * (0.35 + 0.65 * align);
  }
  const k = 1 - Math.exp(-dt / (S.dashT > 0 ? 0.04 : TAU));
  S.v += (target * drag * (S.weave > 0.05 ? 0.78 : 1) - S.v) * k;
  const ca = Math.cos(S.a), sa = Math.sin(S.a);
  let vx = ca * S.v + (env.push ? env.push.x : 0), vy = sa * S.v + (env.push ? env.push.y : 0);
  if (env.held) { vx *= 0.15; vy *= 0.15; }
  // depth: the stick, plus the weave
  let vz = depth * DEPTH_V;
  S.x += vx * dt; S.y += vy * dt;
  // contacts: each body disc against each obstacle near it
  S.contacts.length = 0;
  let weaveWant = 0, weaveNeed = 0;
  for (const o of env.obstacles || []) {
    for (const [off, rb] of BODY) {
      const px = S.x + ca * off, py = S.y + sa * off;
      const c = contact(o, px, py, S.z, rb);
      if (!c) continue;
      const roomUp = ZMAX - (c.oz + c.H + THICK), roomDown = (c.oz - c.H - THICK) - ZMIN;
      let side = c.up;
      if ((side > 0 && roomUp < 0) || (side < 0 && roomDown < 0)) side = roomUp >= roomDown ? 1 : -1;
      const canWeave = o.weave && (side > 0 ? roomUp >= 0 : roomDown >= 0);
      if (canWeave) {
        // wind over or under: the depth moves, the plane gives a little
        if (c.need > weaveNeed) { weaveNeed = c.need; weaveWant = side; }
        const give = Math.min(c.pen, c.pen * 0.18);
        S.x += c.nx * give; S.y += c.ny * give;
      } else {
        // glance: out along the plane, the push into it dropped
        S.x += c.nx * c.pen; S.y += c.ny * c.pen;
        const vn = vx * c.nx + vy * c.ny;
        if (vn < 0) { vx -= vn * c.nx; vy -= vn * c.ny; }
        S.blocked = 0.15;
      }
      S.contacts.push({ x: px - c.nx * rb, y: py - c.ny * rb, z: S.z, o, weave: canWeave, pen: c.pen });
    }
  }
  if (weaveWant) {
    S.weaveDir = weaveWant;
    vz += weaveWant * Math.min(WEAVE_V, weaveNeed / dt);
    S.weave = Math.min(1, S.weave + dt * 6);
  } else S.weave = Math.max(0, S.weave - dt * 3);
  S.z = clamp(S.z + vz * dt, ZMIN, ZMAX);
  S.blocked = Math.max(0, S.blocked - dt);
  S.vx = vx; S.vy = vy; S.vz = vz;
  return S;
}

/** Start a dash (A); false while recharging. */
export function dash(S, toward = null) {
  if (S.dashCd > 0 || S.backT > 0) return false;
  if (toward !== null) S.a = wrap(S.a + wrap(toward - S.a) * 0.6);
  S.dashT = DASH_T; S.dashCd = DASH_CD;
  return true;
}
/** The avoiding reaction (B): back up and swing the front round (toward `turnTo`, else a quarter turn). */
export function backOff(S, turnTo = null) {
  if (S.backT > 0) return false;
  S.dashT = 0;
  S.backT = BACK_T;
  S.backTurn = turnTo === null ? Math.PI / 2 : clamp(wrap(turnTo - S.a), -2.2, 2.2);
  return true;
}
/** The body's front (the oral end) and the point of its gulp. */
export const frontOf = (S, k = 0.5) => ({ x: S.x + Math.cos(S.a) * LENGTH * k, y: S.y + Math.sin(S.a) * LENGTH * k });

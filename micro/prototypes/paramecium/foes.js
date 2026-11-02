// The hunters of the pond drop and the boss, for the 2D slide (pure: no
// three.js; foes.test.mjs runs them in node). Each lives at a depth (z, µm)
// and spans some of it; a contact needs the bodies to meet in the plane AND
// in depth, with a generous reach, so the drop is one connected volume seen
// from above: swim over or under a lunge and it misses, but a hunter follows
// you in depth too (each at its own pace). Every danger has a tell you can
// see before it lands (a wind-up, a raised pseudopod, the door's quiver).
//
//   Dileptus  a flask with a long toxicyst trunk: it stalks you, winds the
//             trunk back (0.9 s) and slashes. B (block) in the wind-up or the
//             slash knocks it back; X (a trichocyst jab) that lands staggers it.
//   Didinium  a barrel with a snout: it closes in, crouches (0.7 s, the
//             snout reddening) and lunges straight, fast, at the depth it
//             crouched at. B in the crouch or the lunge blocks it; or dodge
//             sideways, or change depth while it crouches.
//
// Fighting back (../CONTROLS.md "Fighting back", the shared createFight's
// rule): every hunter has an interest (1 at the start) that blocks (B) and
// jabs that land (X) wear down; at 0 it gives up and swims off (Dileptus,
// Didinium) or draws back (the giant amoeba). jabFoe() says whether a jab
// lands, and why not when it misses (out of reach, or out of its depth), so
// the game can show a hit or a miss every time.
//   giant     a giant amoeba (Amoeba proteus at game size), slow and huge,
//             filling the lower half of the drop; hunting, it reaches up
//             with pseudopods. Touch it and it closes round you: burst (B)
//             or dash out before it shuts (1.4 s). Over it, near the
//             coverslip, you are out of its reach.
//   trap      the bladderwort bladder guarding the portal (the boss): see
//             createTrap below.
//
// Players are { slot, S (swim.js state), live (can be hurt), held }.
// Each step returns events: { type: 'kill', P, by, how } | { type: 'engulf', P } | ...
import { THICK, BODY, LENGTH } from './swim.js';
import { DEPTH, ZK, ZTOL } from './route.js';
import { t as tt } from '../shared/text.js';

const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hyp = Math.hypot;
/** Distance from (px, py) to the segment a-b in the plane. */
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const t = L2 > 1e-9 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
  return hyp(px - ax - dx * t, py - ay - dy * t);
}
/** Does the player's body meet a segment (radius r) at depth z (half-thickness h, plus reach)? */
export function bodyHitsSeg(S, ax, ay, bx, by, r, z, h) {
  if (Math.abs(S.z - z) > THICK + h) return false;
  const ca = Math.cos(S.a), sa = Math.sin(S.a);
  for (const [off, rb] of BODY) if (segDist(S.x + ca * off, S.y + sa * off, ax, ay, bx, by) < rb + r) return true;
  return false;
}
const near = (list, x, y, R, pred = () => true) => {
  let best = null, bd = R;
  for (const P of list) { if (!P.live || !pred(P)) continue; const d = hyp(P.S.x - x, P.S.y - y); if (d < bd) { bd = d; best = P; } }
  return best;
};
/** Move a value toward a target at a rate. */
const toward = (v, t, rate) => v + clamp(t - v, -rate, rate);

// ------------------------------------------------------------------ fighting back
/**
 * What each blow costs a hunter's interest: three jabs that land (X) drive a
 * hunter off, or two blocks (B) of its strike, or a mix; the giant amoeba
 * takes four jabs. A blow also makes it flinch (FIGHT.flinch s: knocked back
 * and lit up), and interest creeps back (regain per s) only while it is idle.
 */
export const FIGHT = { jab: 0.34, block: 0.5, giantJab: 0.26, giantBurst: 0.34, flinch: 0.4, knock: 300, regain: 0.03, reach: 110, spread: 0.42 };
/** The jab: three threads fanned ahead of the front (u along the heading from the centre to the tip of its reach). */
export function jabRays(S) {
  const u0 = LENGTH * 0.45, out = [];
  for (const da of [-FIGHT.spread, 0, FIGHT.spread]) {
    const fx = S.x + Math.cos(S.a) * u0, fy = S.y + Math.sin(S.a) * u0, a = S.a + da;
    out.push([fx, fy, fx + Math.cos(a) * FIGHT.reach, fy + Math.sin(a) * FIGHT.reach]);
  }
  return out;
}
/** Distance between two segments in the plane (sampled: good enough for a jab against a body). */
function segSeg(a, b) {
  let d = Infinity;
  for (let k = 0; k <= 8; k++) { const t = k / 8; d = Math.min(d, segDist(a[0] + (a[2] - a[0]) * t, a[1] + (a[3] - a[1]) * t, b[0], b[1], b[2], b[3])); }
  for (let k = 0; k <= 8; k++) { const t = k / 8; d = Math.min(d, segDist(b[0] + (b[2] - b[0]) * t, b[1] + (b[3] - b[1]) * t, a[0], a[1], a[2], a[3])); }
  return d;
}
/** A hunter's body as capsules in the plane: [[x0, y0, x1, y1], radius]. */
export function foeBody(F) {
  const ca = Math.cos(F.a), sa = Math.sin(F.a), P = (u) => [F.x + ca * u, F.y + sa * u];
  if (F.kind === 'dileptus') { const T = dileptusTrunk(F); return [[[...P(-140), ...P(40)], DILEPTUS.R], [[T.bx, T.by, T.tx, T.ty], 9]]; }
  if (F.kind === 'didinium') return [[[...P(-DIDINIUM.L * 0.2), ...P(DIDINIUM.L * 0.2)], DIDINIUM.R], [[...P(DIDINIUM.L * 0.5), ...P(DIDINIUM.L * 0.66)], 8]];
  if (F.kind === 'giant') {
    const out = [[[F.x, F.y, F.x, F.y], GIANT.R * 0.95]];
    for (const p of F.pods) { const th = p.a, r = giantAt(F, th).r; out.push([[F.x + Math.cos(th) * GIANT.R * 0.8, F.y + Math.sin(th) * GIANT.R * 0.8, F.x + Math.cos(th) * r, F.y + Math.sin(th) * r], 34]); }
    return out;
  }
  return [];
}
/** The depth a hunter is at near (x, y) and its half-thickness there. */
function foeDepth(F, x, y) {
  if (F.kind === 'dileptus') return { z: F.z, h: DILEPTUS.H };
  if (F.kind === 'didinium') return { z: F.z, h: DIDINIUM.H };
  // the giant: from the slide up to its top there
  const { top } = giantAt(F, Math.atan2(y - F.y, x - F.x));
  return { z: (GIANT.zBottom + top) / 2, h: (top - GIANT.zBottom) / 2 };
}
const engaged = (F) => F.placed && F.mode !== 'parked' && F.mode !== 'flee' && F.mode !== 'retreat';
/**
 * Would player P's jab (X) land on hunter F now? { hit, why, x, y, z (where), d (plane gap, µm), dz (depth gap) }.
 * why: 'hit' | 'reach' (it is not in front of you, or too far) | 'depth' (in front, but out of its depth) | 'gone'.
 */
export function jabFoe(F, P) {
  if (!engaged(F)) return { hit: false, why: 'gone', d: Infinity, dz: Infinity };
  const S = P.S;
  let best = { d: Infinity };
  for (const ray of jabRays(S)) for (const [seg, r] of foeBody(F)) {
    const d = segSeg(ray, seg) - r;
    if (d < best.d) {
      // the contact point: the ray's point nearest the body
      let bt = 0, bd = Infinity;
      for (let k = 0; k <= 10; k++) { const t = k / 10, x = ray[0] + (ray[2] - ray[0]) * t, y = ray[1] + (ray[3] - ray[1]) * t, q = segDist(x, y, ...seg); if (q < bd) { bd = q; bt = t; } }
      best = { d, x: ray[0] + (ray[2] - ray[0]) * bt, y: ray[1] + (ray[3] - ray[1]) * bt };
    }
  }
  const { z, h } = foeDepth(F, best.x ?? S.x, best.y ?? S.y);
  const dz = Math.max(0, Math.abs(S.z - z) - h - THICK);
  const out = { hit: false, why: 'reach', x: best.x, y: best.y, z: clamp(S.z, z - h, z + h), d: Math.max(0, best.d), dz };
  if (best.d > 6) return out;
  if (dz > ZTOL) { out.why = 'depth'; return out; }
  out.hit = true; out.why = 'hit';
  return out;
}
/** A blow landed on F (from P): its interest falls, it flinches (knocked back, lit up). Returns true when it gives up. */
function blow(F, P, cost, x = F.x, y = F.y) {
  F.interest = Math.max(0, (F.interest ?? 1) - cost);
  F.hitT = 0; F.hitX = x; F.hitY = y;
  const a = Math.atan2(F.y - P.S.y, F.x - P.S.x);
  F.kx = Math.cos(a) * FIGHT.knock; F.ky = Math.sin(a) * FIGHT.knock;
  return F.interest <= 0;
}
/** Each step: the flinch runs out and the knock-back carries it. */
function stepFlinch(F, dt) {
  if (F.hitT === undefined || F.hitT < 0) return;
  F.hitT += dt;
  const k = Math.exp(-dt * 6);
  F.x += (F.kx || 0) * dt; F.y += (F.ky || 0) * dt; F.kx = (F.kx || 0) * k; F.ky = (F.ky || 0) * k;
  if (F.hitT > 2) F.hitT = -1;
}
/** A jab that landed (jabFoe said hit): 'hit' | 'fled' (it gives up). */
export function hitFoe(F, P, j) {
  if (F.kind === 'giant') {
    const gone = blow(F, P, FIGHT.giantJab, j.x, j.y);
    F.kx *= 0.2; F.ky *= 0.2; // too big to knock about: its pseudopod snaps back instead
    F.pinch = 2.2;
    if (gone) { F.mode = 'retreat'; F.t = 0; return 'fled'; }
    return 'hit';
  }
  const gone = blow(F, P, FIGHT.jab, j.x, j.y);
  if (gone) { F.mode = 'flee'; F.t = 0; F.target = null; return 'fled'; }
  F.mode = F.kind === 'dileptus' ? 'stunned' : 'stagger'; F.t = 0;
  if (F.kind === 'dileptus') F.stunFor = 0.9;
  return 'hit';
}

// ------------------------------------------------------------------ Dileptus
export const DILEPTUS = { L: 330, R: 34, H: 28, trunk: [55, 200], reach: 205, speed: 270, turn: 2.6, zv: 150, windup: 0.9, strike: 0.26, recover: 1.0, stun: 1.7 };
export function createDileptus() {
  return { kind: 'dileptus', x: 0, y: 0, z: -20, a: 0, home: null, placed: false, mode: 'parked', t: 0, target: null, swing: 0, interest: 1, hitT: -1, grace: 0, wig: Math.random() * TAU, strikeA: 0, log: [] };
}
/** The trunk now: from its base to its tip (it swings back in the wind-up and across in the slash). */
export function dileptusTrunk(D) {
  const [u0, u1] = DILEPTUS.trunk;
  const bend = D.swing;
  const ca = Math.cos(D.a), sa = Math.sin(D.a);
  const bx = D.x + ca * u0, by = D.y + sa * u0;
  const ta = D.a + bend;
  return { bx, by, tx: bx + Math.cos(ta) * (u1 - u0), ty: by + Math.sin(ta) * (u1 - u0), a: ta };
}
export function stepDileptus(D, players, dt) {
  const ev = [];
  if (!D.placed || D.mode === 'parked') return ev;
  D.t += dt; D.wig += dt;
  D.grace = Math.max(0, D.grace - dt);
  stepFlinch(D, dt);
  const C = DILEPTUS;
  const P = D.target && D.target.live ? D.target : null;
  const goTo = (gx, gy, sp, turn = C.turn) => {
    const want = Math.atan2(gy - D.y, gx - D.x);
    D.a = wrap(D.a + clamp(wrap(want - D.a), -turn * dt, turn * dt));
    const d = hyp(gx - D.x, gy - D.y);
    const v = Math.min(sp, d / Math.max(dt, 1e-3)) * Math.max(0.2, Math.cos(wrap(want - D.a)));
    D.x += Math.cos(D.a) * v * dt; D.y += Math.sin(D.a) * v * dt;
  };
  switch (D.mode) {
    case 'idle': {
      D.swing = Math.sin(D.wig * 1.3) * 0.25;
      const ang = D.t * 0.25;
      goTo(D.home.x + Math.cos(ang) * 160, D.home.y + Math.sin(ang) * 160, 120, 1.2);
      D.z = toward(D.z, Math.sin(D.t * 0.4) * 40 * ZK, 30 * dt);
      D.interest = Math.min(1, D.interest + FIGHT.regain * dt);
      const Q = D.grace > 0 ? null : near(players, D.x, D.y, 560);
      if (Q) { D.target = Q; D.mode = 'stalk'; D.t = 0; ev.push({ type: 'hunt', who: D, P: Q }); }
      break;
    }
    case 'stalk': {
      if (!P || hyp(P.S.x - D.home.x, P.S.y - D.home.y) > 1100) { D.mode = 'idle'; D.target = null; break; }
      D.swing = Math.sin(D.wig * 2.2) * 0.3;
      const dx = P.S.x - D.x, dy = P.S.y - D.y, d = hyp(dx, dy);
      goTo(P.S.x - (dx / (d || 1)) * 150, P.S.y - (dy / (d || 1)) * 150, C.speed);
      D.z = toward(D.z, P.S.z, C.zv * dt);
      const inFront = Math.abs(wrap(Math.atan2(dy, dx) - D.a)) < 0.9;
      if (d < C.reach + 40 && inFront && Math.abs(P.S.z - D.z) < THICK + C.H + ZTOL) { D.mode = 'windup'; D.t = 0; D.strikeA = Math.sign(wrap(Math.atan2(dy, dx) - D.a)) || 1; ev.push({ type: 'tell', who: D, P }); }
      break;
    }
    case 'windup': {
      // the trunk draws back to the far side (the tell), still tracking a little
      D.swing = -D.strikeA * 0.85 * Math.min(1, D.t / C.windup) + Math.sin(D.t * 40) * 0.04;
      if (P) { const want = Math.atan2(P.S.y - D.y, P.S.x - D.x); D.a = wrap(D.a + clamp(wrap(want - D.a), -1.2 * dt, 1.2 * dt)); }
      if (D.t >= C.windup) { D.mode = 'strike'; D.t = 0; }
      break;
    }
    case 'strike': {
      D.swing = D.strikeA * (-0.85 + 1.9 * Math.min(1, D.t / C.strike));
      const T = dileptusTrunk(D);
      for (const Q of players) if (Q.live && bodyHitsSeg(Q.S, T.bx, T.by, T.tx, T.ty, 7, D.z, C.H + 22)) { ev.push({ type: 'kill', P: Q, by: 'Dileptus', how: tt('paramecium.how.dileptus') }); D.mode = 'recover'; D.t = 0; break; }
      if (D.mode === 'strike' && D.t >= C.strike) { D.mode = 'recover'; D.t = 0; ev.push({ type: 'miss', who: D }); }
      break;
    }
    case 'recover':
      D.swing *= Math.exp(-dt * 3);
      if (D.t >= C.recover) { D.mode = P ? 'stalk' : 'idle'; D.t = 0; }
      break;
    case 'stunned':
      D.swing = Math.sin(D.t * 30) * 0.2 * Math.exp(-D.t);
      D.x -= Math.cos(D.a) * 120 * Math.exp(-D.t * 2) * dt; D.y -= Math.sin(D.a) * 120 * Math.exp(-D.t * 2) * dt;
      if (D.t >= (D.stunFor ?? C.stun)) { D.stunFor = undefined; D.mode = D.interest <= 0 ? 'flee' : 'stalk'; D.t = 0; if (D.mode === 'flee') ev.push({ type: 'fled', who: D }); }
      break;
    case 'flee': {
      // gives up: swims off and rests far from everyone
      const Q = near(players, D.x, D.y, 1e9);
      const away = Q ? Math.atan2(D.y - Q.S.y, D.x - Q.S.x) : D.a;
      D.a = wrap(D.a + clamp(wrap(away - D.a), -4 * dt, 4 * dt));
      D.x += Math.cos(D.a) * 380 * dt; D.y += Math.sin(D.a) * 380 * dt;
      D.swing = Math.sin(D.wig * 3) * 0.2;
      if (D.t > 4) { D.mode = 'idle'; D.home = { x: D.x, y: D.y }; D.grace = 25; D.interest = 1; D.target = null; }
      break;
    }
  }
  return ev;
}
/**
 * B by player P: a block. In the wind-up or the slash it knocks the Dileptus
 * back, stunned ('driven'; its interest falls by FIGHT.block, so twice and it
 * gives up: 'beaten'); while it stalks you, a lighter blow; else 'early'.
 */
export function burstDileptus(D, P) {
  if (!D.placed || D.mode === 'parked' || D.mode === 'flee') return null;
  const T = dileptusTrunk(D);
  const close = segDist(P.S.x, P.S.y, T.bx, T.by, T.tx, T.ty) < 110 || hyp(P.S.x - D.x, P.S.y - D.y) < 200;
  if (!close || Math.abs(P.S.z - D.z) > THICK + DILEPTUS.H + ZTOL + 30) return null;
  if (D.mode === 'windup' || D.mode === 'strike' || D.mode === 'stalk') {
    const gone = blow(D, P, D.mode === 'stalk' ? FIGHT.block / 2 : FIGHT.block, T.tx, T.ty);
    if (gone) { D.mode = 'flee'; D.t = 0; D.target = null; return 'beaten'; }
    D.mode = 'stunned'; D.t = 0; D.stunFor = undefined;
    return gone ? 'beaten' : 'driven';
  }
  return 'early';
}

// ------------------------------------------------------------------ Didinium
export const DIDINIUM = { L: 100, R: 38, H: 36, speed: 480, zv: 260, crouch: 0.7, lunge: 0.42, lungeV: 1350, recover: 1.1, sight: 620, misses: 3, rest: 6, stagger: 0.8 };
export function createDidinium(i = 0) {
  return { kind: 'didinium', i, x: 0, y: 0, z: 0, a: 0, home: null, placed: false, mode: 'parked', t: 0, target: null, grace: 0, misses: 0, interest: 1, hitT: -1, spin: Math.random() * TAU, lz: 0 };
}
export function stepDidinium(D, players, dt) {
  const ev = [];
  if (!D.placed || D.mode === 'parked') return ev;
  const C = DIDINIUM;
  D.t += dt; D.spin += dt * (D.mode === 'lunge' ? 14 : 5);
  D.grace = Math.max(0, D.grace - dt);
  stepFlinch(D, dt);
  const P = D.target && D.target.live ? D.target : null;
  const turnTo = (gx, gy, rate) => { const want = Math.atan2(gy - D.y, gx - D.x); D.a = wrap(D.a + clamp(wrap(want - D.a), -rate * dt, rate * dt)); };
  switch (D.mode) {
    case 'idle': {
      // circles its home, nosing about
      const ang = D.t * 0.5 + D.i * 3;
      turnTo(D.home.x + Math.cos(ang) * 120, D.home.y + Math.sin(ang) * 120, 2.5);
      D.x += Math.cos(D.a) * 150 * dt; D.y += Math.sin(D.a) * 150 * dt;
      D.z = toward(D.z, Math.sin(D.t * 0.7 + D.i) * 60 * ZK, 40 * dt);
      D.interest = Math.min(1, D.interest + FIGHT.regain * dt);
      const Q = D.grace > 0 ? null : near(players, D.x, D.y, C.sight);
      if (Q) { D.target = Q; D.mode = 'chase'; D.t = 0; ev.push({ type: 'hunt', who: D, P: Q }); }
      break;
    }
    case 'chase': {
      if (!P || hyp(P.S.x - D.x, P.S.y - D.y) > C.sight * 1.8) { D.mode = 'idle'; D.target = null; break; }
      turnTo(P.S.x, P.S.y, 5);
      const d = hyp(P.S.x - D.x, P.S.y - D.y);
      if (d > 190) { D.x += Math.cos(D.a) * C.speed * dt; D.y += Math.sin(D.a) * C.speed * dt; }
      // it follows you in depth, quickly (a plane-changer)
      D.z = toward(D.z, P.S.z, C.zv * dt);
      if (d < 260 && D.t > 0.4) { D.mode = 'crouch'; D.t = 0; ev.push({ type: 'tell', who: D, P }); }
      break;
    }
    case 'crouch':
      // aims: turns to you, but its depth is set now (the lunge keeps it)
      if (P) turnTo(P.S.x, P.S.y, 6);
      D.lz = D.z;
      if (D.t >= C.crouch) { D.mode = 'lunge'; D.t = 0; }
      break;
    case 'lunge': {
      D.x += Math.cos(D.a) * C.lungeV * dt; D.y += Math.sin(D.a) * C.lungeV * dt;
      // the snout: the front of the barrel
      const sx = D.x + Math.cos(D.a) * C.L * 0.55, sy = D.y + Math.sin(D.a) * C.L * 0.55;
      for (const Q of players) if (Q.live && bodyHitsSeg(Q.S, D.x, D.y, sx, sy, 12, D.z, C.H)) { ev.push({ type: 'kill', P: Q, by: 'Didinium', how: tt('paramecium.how.didinium') }); D.mode = 'recover'; D.t = 0; D.misses = 0; break; }
      if (D.mode === 'lunge' && D.t >= C.lunge) { D.mode = 'recover'; D.t = 0; D.misses++; ev.push({ type: 'miss', who: D }); }
      break;
    }
    case 'recover':
    case 'stagger':
      if (D.t >= (D.mode === 'stagger' ? C.stagger : C.recover)) {
        if (D.misses >= C.misses) { D.mode = 'rest'; D.t = 0; D.misses = 0; ev.push({ type: 'rest', who: D }); }
        else { D.mode = P ? 'chase' : 'idle'; D.t = 0; }
      }
      break;
    case 'rest':
      D.x += Math.cos(D.a) * 60 * dt; D.y += Math.sin(D.a) * 60 * dt; D.a += dt * 0.6;
      if (D.t >= C.rest) { D.mode = 'idle'; D.t = 0; D.target = null; D.grace = 2; }
      break;
    case 'flee': {
      // driven off: swims away from everyone, then rests far off, its interest back
      const Q = near(players, D.x, D.y, 1e9);
      const away = Q ? Math.atan2(D.y - Q.S.y, D.x - Q.S.x) : D.a;
      D.a = wrap(D.a + clamp(wrap(away - D.a), -6 * dt, 6 * dt));
      D.x += Math.cos(D.a) * 520 * dt; D.y += Math.sin(D.a) * 520 * dt;
      if (D.t > 3.5) { D.mode = 'idle'; D.home = { x: D.x, y: D.y }; D.grace = 25; D.interest = 1; D.target = null; D.misses = 0; }
      break;
    }
  }
  return ev;
}
/**
 * B by player P against a Didinium crouching or lunging at them: blocked. Its
 * snout glances off the trichocysts, it is knocked back staggered and its
 * interest falls (FIGHT.block): 'blocked' | 'beaten' (it gives up) | null (not at you).
 */
export function blockDidinium(D, P) {
  if (!D.placed || !(D.mode === 'crouch' || D.mode === 'lunge')) return null;
  const sx = D.x + Math.cos(D.a) * DIDINIUM.L * 0.55, sy = D.y + Math.sin(D.a) * DIDINIUM.L * 0.55;
  const d = Math.min(hyp(P.S.x - D.x, P.S.y - D.y), hyp(P.S.x - sx, P.S.y - sy));
  if (d > (D.mode === 'crouch' ? 330 : 200) || Math.abs(P.S.z - D.z) > THICK + DIDINIUM.H + ZTOL + 20) return null;
  const gone = blow(D, P, FIGHT.block, sx, sy);
  if (gone) { D.mode = 'flee'; D.t = 0; D.target = null; return 'beaten'; }
  D.mode = 'stagger'; D.t = 0;
  return 'blocked';
}

// ------------------------------------------------------------------ the giant amoeba
export const GIANT = { R: 230, speed: 32, sight: 900, top: -10 * ZK, podTop: 75 * ZK, podV: 120 * ZK, podMax: 270, close: 1.4, zBottom: DEPTH.min, N: 72, retreat: 14 };
export function createGiant() {
  return { kind: 'giant', x: 0, y: 0, home: null, placed: false, mode: 'parked', t: 0, a: 0, target: null, pods: [], grace: 0, pinch: 0, interest: 1, hitT: -1, out: new Float32Array(GIANT.N), seed: Math.random() * 100, eaten: [] };
}
/** The outline's radius at angle th now (µm from the centre), and how high (z) the body reaches there. */
export function giantAt(G, th) {
  const t = G.t + G.seed;
  let r = GIANT.R * (1 + 0.07 * Math.sin(3 * th + t * 0.31) + 0.05 * Math.sin(5 * th - t * 0.47) + 0.03 * Math.sin(8 * th + t * 0.9));
  let top = GIANT.top;
  for (const p of G.pods) {
    const d = wrap(th - p.a), k = Math.exp(-(d * d) / (p.w * p.w));
    r += p.len * k;
    top = Math.max(top, GIANT.top + (p.raise * (GIANT.podTop - GIANT.top)) * k * Math.min(1, p.len / 120));
  }
  return { r, top };
}
/** Is a point (x, y, z) inside the giant (its outline in the plane, under its top there)? */
export function insideGiant(G, x, y, z, pad = 0) {
  if (!G.placed || G.mode === 'parked') return false;
  const dx = x - G.x, dy = y - G.y, d = hyp(dx, dy);
  if (d > GIANT.R * 1.2 + GIANT.podMax + pad) return false;
  const { r, top } = giantAt(G, Math.atan2(dy, dx));
  return d < r + pad && z < top + THICK;
}
export function stepGiant(G, players, dt) {
  const ev = [];
  if (!G.placed || G.mode === 'parked') return ev;
  G.t += dt;
  G.grace = Math.max(0, G.grace - dt);
  G.pinch = Math.max(0, G.pinch - dt);
  stepFlinch(G, dt);
  // driven back (its interest worn out): it draws its pseudopods in and creeps away, then calms
  if (G.mode === 'retreat') {
    G.target = null; G.pinch = Math.max(G.pinch, 0.5);
    const Q = near(players, G.x, G.y, 1e9);
    if (Q) { const a = Math.atan2(G.y - Q.S.y, G.x - Q.S.x); G.x += Math.cos(a) * GIANT.speed * 2.5 * dt; G.y += Math.sin(a) * GIANT.speed * 2.5 * dt; }
    if (G.t >= GIANT.retreat) { G.mode = 'roam'; G.t = 0; G.interest = 1; G.grace = 6; G.home = { x: G.x, y: G.y }; }
  } else if (!G.target) G.interest = Math.min(1, G.interest + FIGHT.regain * dt);
  const P = G.grace > 0 || G.mode === 'retreat' ? null : near(players, G.x, G.y, GIANT.sight, (Q) => !Q.engulfed || Q.engulfed.by === G);
  if (P && !G.target) ev.push({ type: 'hunt', who: G, target: P }); // it starts reaching for a player (target, not P: no hint is tied to it)
  G.target = P;

  // creep: toward its prey, else round its home
  const gx = P ? P.S.x : G.home.x + Math.cos(G.t * 0.07) * 200, gy = P ? P.S.y : G.home.y + Math.sin(G.t * 0.07) * 200;
  const d = hyp(gx - G.x, gy - G.y);
  if (d > 5) { const v = Math.min(GIANT.speed * (P ? 1 : 0.6), d) * dt; G.x += ((gx - G.x) / d) * v; G.y += ((gy - G.y) / d) * v; G.a = Math.atan2(gy - G.y, gx - G.x); }
  // pseudopods: one reaches for the prey (and rises: the tell, its tip brightening), the others ripple
  const want = P ? Math.atan2(P.S.y - G.y, P.S.x - G.x) : null;
  if (!G.pods.length) for (let i = 0; i < 3; i++) G.pods.push({ a: i * 2.1, len: 40, w: 0.32, raise: 0, hunt: false });
  for (const [i, p] of G.pods.entries()) {
    const hunt = i === 0 && want !== null && G.pinch <= 0;
    p.hunt = hunt;
    if (hunt) {
      p.a = wrap(p.a + clamp(wrap(want - p.a), -0.8 * dt, 0.8 * dt));
      const dist = hyp(P.S.x - G.x, P.S.y - G.y) - GIANT.R * 0.9;
      p.len = toward(p.len, clamp(dist + 40, 30, GIANT.podMax), GIANT.podV * dt);
      p.raise = toward(p.raise, clamp((P.S.z - GIANT.top) / (GIANT.podTop - GIANT.top) + 0.25, 0, 1), 0.7 * dt);
      p.w = 0.26;
    } else {
      p.a = wrap(p.a + dt * 0.05 * (i % 2 ? 1 : -1));
      p.len = toward(p.len, 50 + 40 * Math.sin(G.t * 0.3 + i * 2), (G.pinch > 0 && i === 0 ? 260 : 25) * dt);
      p.raise = toward(p.raise, 0, 0.6 * dt);
      p.w = 0.36;
    }
  }
  // what it covers, it engulfs: the cup closes round a player in GIANT.close s (burst or dash out)
  for (const Q of players) {
    if (G.mode === 'retreat' && !Q.engulfed) continue;
    if (!Q.live) continue;
    const inside = insideGiant(G, Q.S.x, Q.S.y, Q.S.z, 6);
    if (inside && !Q.engulfed) { Q.engulfed = { by: G, t: 0 }; ev.push({ type: 'engulf', P: Q }); }
    if (Q.engulfed && Q.engulfed.by === G) {
      if (!insideGiant(G, Q.S.x, Q.S.y, Q.S.z, 26)) { Q.engulfed = null; ev.push({ type: 'escaped', P: Q }); continue; }
      Q.engulfed.t += dt;
      if (Q.engulfed.t >= GIANT.close) { Q.engulfed = null; ev.push({ type: 'kill', P: Q, by: 'the giant amoeba', how: tt('paramecium.how.giant') }); }
    }
  }
  for (let i = 0; i < GIANT.N; i++) G.out[i] = giantAt(G, (i / GIANT.N) * TAU).r;
  return ev;
}
/** A burst (B) or a trichocyst jab (X) at the giant: a held player bursts free; a reaching pseudopod pulls back. */
export function burstGiant(G, P) {
  if (!G.placed || G.mode === 'parked') return null;
  if (P.engulfed && P.engulfed.by === G) {
    P.engulfed = null;
    const a = Math.atan2(P.S.y - G.y, P.S.x - G.x), { r } = giantAt(G, a);
    const d = hyp(P.S.x - G.x, P.S.y - G.y);
    const out = Math.max(0, r - d) + 45;
    P.S.x += Math.cos(a) * out; P.S.y += Math.sin(a) * out;
    P.S.z = Math.min(P.S.z + 60 * ZK, DEPTH.max - THICK);
    G.pinch = 2.2;
    if (blow(G, P, FIGHT.giantBurst, P.S.x, P.S.y)) { G.mode = 'retreat'; G.t = 0; return 'fled'; }
    G.kx *= 0.2; G.ky *= 0.2;
    return 'freed';
  }
  if (G.pods[0] && G.pods[0].hunt && hyp(P.S.x - G.x, P.S.y - G.y) < GIANT.R + G.pods[0].len + 120) { G.pinch = 2.2; return 'pinched'; }
  return null;
}

// ------------------------------------------------------------------ the bladderwort trap (the boss)
// A Utricularia bladder hanging just above the slide in front of the biofilm
// (the portal), its door toward whoever comes. Dormant until someone comes
// within WAKE of its door. Its tell: the door quivers and the walls draw in
// (TELL s, a red rim at the door); then a pulse (PULSE s) springs the walls
// out and pulls everything near the door toward it (hardest close in; weaker
// near the coverslip, above its door); drawn within SUCK of the door, you are
// sucked in. After each pulse it resets (RESET s, door shut: the moment to
// dash past). Aimed pulses when you come within AIM of the door, and on its
// own every 7-12 s while you are about. Every wasted pulse and every burst
// out (B in a pulse) costs it resolve; spent, it hangs slack for SPENT s and
// the way is open.
export const TRAP = { a: 230, b: 165, z: -45 * ZK, h: 105 * ZK, door: 52, wake: 680, aim: 330, reach: 430, suck: 90, suckZ: 90 * ZK, pull: 950, tell: 1.2, pulse: 0.38, reset: 2.4, spent: 24, resolve: 5 };
export function createTrap() {
  return { kind: 'trap', x: 0, y: 0, a: 0, placed: false, state: 'hidden', t: 0, resolve: TRAP.resolve, next: 9, log: [], caught: new Set(), blocked: new Set(), quiver: 0, flex: 0 };
}
/** The door's centre (the bladder's front). */
export const trapDoor = (T) => ({ x: T.x + Math.cos(T.a) * TRAP.a * 0.98, y: T.y + Math.sin(T.a) * TRAP.a * 0.98, z: TRAP.z + 10 * ZK });
/** The bladder's wall as obstacles (two discs along its axis, filling the lower drop: you glance off it). */
export function trapObstacles(T) {
  if (!T.placed) return [];
  const ca = Math.cos(T.a), sa = Math.sin(T.a);
  return [-80, 70].map((u) => ({ kind: 'disc', x: T.x + ca * u, y: T.y + sa * u, z: TRAP.z, r: u > 0 ? TRAP.b * 0.92 : TRAP.b, h: TRAP.h, weave: false, what: 'trap' }));
}
export function stepTrap(T, players, dt) {
  const ev = [];
  const pushes = new Map(); // P -> { x, y } µm/s
  if (!T.placed) return { ev, pushes };
  T.t += dt;
  const door = trapDoor(T);
  const live = players.filter((P) => P.live);
  const dmin = Math.min(Infinity, ...live.map((P) => hyp(P.S.x - door.x, P.S.y - door.y)));
  const log = (type, extra) => { T.log.push({ type, t: +T.t.toFixed(2), ...extra }); ev.push({ type: 'trap-' + type, ...extra }); };
  switch (T.state) {
    case 'hidden': break;
    case 'dormant': if (dmin < TRAP.wake) { T.state = 'set'; T.t = 0; T.next = 5; log('wake'); } break;
    case 'set':
      T.next -= dt;
      if (dmin > TRAP.wake * 1.6) { T.state = 'dormant'; T.t = 0; break; }
      if (dmin < TRAP.aim || T.next <= 0) { T.state = 'tell'; T.t = 0; log('tell', { aimed: dmin < TRAP.aim }); }
      break;
    case 'tell':
      T.quiver = 1;
      if (T.t >= TRAP.tell) { T.state = 'pulse'; T.t = 0; T.caught.clear(); T.blocked.clear(); log('pulse'); }
      break;
    case 'pulse': {
      const wide = T.resolve <= TRAP.resolve / 2 ? 1.3 : 1;
      for (const P of live) {
        const dx = door.x - P.S.x, dy = door.y - P.S.y, d = hyp(dx, dy);
        if (d > TRAP.reach * wide || T.blocked.has(P)) continue;
        // weaker above the door (near the coverslip), strongest at the door's depth
        const dk = 1 - 0.55 * clamp((P.S.z - door.z) / (140 * ZK), 0, 1);
        const k = Math.pow(1 - d / (TRAP.reach * wide), 0.7) * dk;
        pushes.set(P, { x: (dx / (d || 1)) * TRAP.pull * k, y: (dy / (d || 1)) * TRAP.pull * k });
        if (d < TRAP.suck && Math.abs(P.S.z - door.z) < TRAP.suckZ) { T.caught.add(P); ev.push({ type: 'kill', P, by: 'the bladderwort trap', how: tt('paramecium.how.trap') }); log('catch', { slot: P.slot }); }
      }
      if (T.t >= TRAP.pulse) {
        if (!T.caught.size) { T.resolve -= 1; log('miss', { resolve: T.resolve }); }
        T.state = T.resolve <= 0 ? 'spent' : 'reset'; T.t = 0;
        if (T.state === 'spent') log('spent');
        T.next = 7 + Math.random() * 5;
      }
      break;
    }
    case 'reset': if (T.t >= TRAP.reset) { T.state = 'set'; T.t = 0; } break;
    case 'spent': if (T.t >= TRAP.spent) { T.state = 'set'; T.t = 0; T.resolve = Math.ceil(TRAP.resolve / 2); log('rearmed'); } break;
  }
  // the walls: drawn in while set and in the tell, sprung out in the pulse, slack when spent
  const want = T.state === 'pulse' ? 1 : T.state === 'tell' ? -0.6 - 0.15 * Math.sin(T.t * 50) : T.state === 'spent' ? 0.4 : T.state === 'reset' ? 0.2 : -0.3;
  T.flex += (want - T.flex) * Math.min(1, dt * (T.state === 'pulse' ? 25 : 4));
  T.quiver = Math.max(0, T.quiver - dt * 3);
  return { ev, pushes };
}
/** B in a pulse: the player bursts out of the inflow (costs the trap resolve). */
export function burstTrap(T, P) {
  if (!T.placed || T.state !== 'pulse') return null;
  const door = trapDoor(T);
  if (hyp(P.S.x - door.x, P.S.y - door.y) > TRAP.reach * 1.3 || T.blocked.has(P)) return null;
  T.blocked.add(P);
  T.resolve -= 1;
  T.log.push({ type: 'blocked', t: +T.t.toFixed(2), slot: P.slot, resolve: T.resolve });
  return 'blocked';
}
export const trapGuarding = (T) => T.placed && T.state !== 'spent';

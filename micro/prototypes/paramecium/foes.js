// The hunters of the pond drop and the boss, for the 2D slide (pure: no
// three.js; foes.test.mjs runs them in node). Each lives at a depth (z, µm)
// and spans some of it; a contact needs the bodies to meet in the plane AND
// in depth, with a generous reach, so the drop is one connected volume seen
// from above: swim over or under a lunge and it misses, but a hunter follows
// you in depth too (each at its own pace). Every danger has a tell you can
// see before it lands (a wind-up, a raised pseudopod, the door's quiver).
//
//   Dileptus  a flask with a long toxicyst trunk: it stalks you, winds the
//             trunk back (0.9 s) and slashes. A trichocyst burst (B) in the
//             wind-up or the slash drives it off (twice and it gives up).
//   Didinium  a barrel with a snout: it closes in, crouches (0.55 s) and
//             lunges straight, fast, at the depth it crouched at. B cannot
//             stop it: dodge sideways or change depth while it crouches.
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
import { THICK, BODY } from './swim.js';
import { DEPTH } from './route.js';
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

// ------------------------------------------------------------------ Dileptus
export const DILEPTUS = { L: 330, R: 34, H: 28, trunk: [55, 200], reach: 205, speed: 270, turn: 2.6, zv: 120, windup: 0.9, strike: 0.26, recover: 1.0, stun: 1.7, drives: 2 };
export function createDileptus() {
  return { kind: 'dileptus', x: 0, y: 0, z: -20, a: 0, home: null, placed: false, mode: 'parked', t: 0, target: null, swing: 0, drives: 0, grace: 0, wig: Math.random() * TAU, strikeA: 0, log: [] };
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
      D.z = toward(D.z, Math.sin(D.t * 0.4) * 40, 30 * dt);
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
      if (d < C.reach + 40 && inFront && Math.abs(P.S.z - D.z) < THICK + C.H + 40) { D.mode = 'windup'; D.t = 0; D.strikeA = Math.sign(wrap(Math.atan2(dy, dx) - D.a)) || 1; ev.push({ type: 'tell', who: D, P }); }
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
      if (D.t >= C.stun) { D.mode = D.drives >= C.drives ? 'flee' : 'stalk'; D.t = 0; if (D.mode === 'flee') ev.push({ type: 'fled', who: D }); }
      break;
    case 'flee': {
      // gives up: swims off and rests far from everyone
      const Q = near(players, D.x, D.y, 1e9);
      const away = Q ? Math.atan2(D.y - Q.S.y, D.x - Q.S.x) : D.a;
      D.a = wrap(D.a + clamp(wrap(away - D.a), -2 * dt, 2 * dt));
      D.x += Math.cos(D.a) * 380 * dt; D.y += Math.sin(D.a) * 380 * dt;
      D.swing = Math.sin(D.wig * 3) * 0.2;
      if (D.t > 4) { D.mode = 'idle'; D.home = { x: D.x, y: D.y }; D.grace = 25; D.drives = 0; D.target = null; }
      break;
    }
  }
  return ev;
}
/** A trichocyst burst (B) by player P: drives the Dileptus off when its trunk is at you. */
export function burstDileptus(D, P) {
  if (!D.placed || D.mode === 'parked') return null;
  const T = dileptusTrunk(D);
  const close = segDist(P.S.x, P.S.y, T.bx, T.by, T.tx, T.ty) < 110 || hyp(P.S.x - D.x, P.S.y - D.y) < 200;
  if (!close || Math.abs(P.S.z - D.z) > THICK + DILEPTUS.H + 70) return null;
  if (D.mode === 'windup' || D.mode === 'strike' || D.mode === 'stalk') {
    D.mode = 'stunned'; D.t = 0; D.drives++;
    return D.drives >= DILEPTUS.drives ? 'beaten' : 'driven';
  }
  return 'early';
}

// ------------------------------------------------------------------ Didinium
export const DIDINIUM = { L: 100, R: 38, H: 36, speed: 480, zv: 210, crouch: 0.55, lunge: 0.42, lungeV: 1350, recover: 1.1, sight: 620, misses: 3, rest: 6 };
export function createDidinium(i = 0) {
  return { kind: 'didinium', i, x: 0, y: 0, z: 0, a: 0, home: null, placed: false, mode: 'parked', t: 0, target: null, grace: 0, misses: 0, spin: Math.random() * TAU, lz: 0 };
}
export function stepDidinium(D, players, dt) {
  const ev = [];
  if (!D.placed || D.mode === 'parked') return ev;
  const C = DIDINIUM;
  D.t += dt; D.spin += dt * (D.mode === 'lunge' ? 14 : 5);
  D.grace = Math.max(0, D.grace - dt);
  const P = D.target && D.target.live ? D.target : null;
  const turnTo = (gx, gy, rate) => { const want = Math.atan2(gy - D.y, gx - D.x); D.a = wrap(D.a + clamp(wrap(want - D.a), -rate * dt, rate * dt)); };
  switch (D.mode) {
    case 'idle': {
      // circles its home, nosing about
      const ang = D.t * 0.5 + D.i * 3;
      turnTo(D.home.x + Math.cos(ang) * 120, D.home.y + Math.sin(ang) * 120, 2.5);
      D.x += Math.cos(D.a) * 150 * dt; D.y += Math.sin(D.a) * 150 * dt;
      D.z = toward(D.z, Math.sin(D.t * 0.7 + D.i) * 60, 40 * dt);
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
      if (D.t >= (D.mode === 'stagger' ? 0.8 : C.recover)) {
        if (D.misses >= C.misses) { D.mode = 'rest'; D.t = 0; D.misses = 0; ev.push({ type: 'rest', who: D }); }
        else { D.mode = P ? 'chase' : 'idle'; D.t = 0; }
      }
      break;
    case 'rest':
      D.x += Math.cos(D.a) * 60 * dt; D.y += Math.sin(D.a) * 60 * dt; D.a += dt * 0.6;
      if (D.t >= C.rest) { D.mode = 'idle'; D.t = 0; D.target = null; D.grace = 2; }
      break;
  }
  return ev;
}

// ------------------------------------------------------------------ the giant amoeba
export const GIANT = { R: 230, speed: 32, sight: 900, top: -10, podTop: 75, podV: 120, podMax: 270, close: 1.4, zBottom: DEPTH.min, N: 72 };
export function createGiant() {
  return { kind: 'giant', x: 0, y: 0, home: null, placed: false, mode: 'parked', t: 0, a: 0, target: null, pods: [], grace: 0, pinch: 0, out: new Float32Array(GIANT.N), seed: Math.random() * 100, eaten: [] };
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
  const P = G.grace > 0 ? null : near(players, G.x, G.y, GIANT.sight, (Q) => !Q.engulfed || Q.engulfed.by === G);
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
    P.S.z = Math.min(P.S.z + 60, DEPTH.max - THICK);
    G.pinch = 2.2;
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
export const TRAP = { a: 230, b: 165, z: -45, h: 105, door: 52, wake: 680, aim: 330, reach: 430, suck: 90, pull: 950, tell: 1.2, pulse: 0.38, reset: 2.4, spent: 24, resolve: 5 };
export function createTrap() {
  return { kind: 'trap', x: 0, y: 0, a: 0, placed: false, state: 'hidden', t: 0, resolve: TRAP.resolve, next: 9, log: [], caught: new Set(), blocked: new Set(), quiver: 0, flex: 0 };
}
/** The door's centre (the bladder's front). */
export const trapDoor = (T) => ({ x: T.x + Math.cos(T.a) * TRAP.a * 0.98, y: T.y + Math.sin(T.a) * TRAP.a * 0.98, z: TRAP.z + 10 });
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
        const dk = 1 - 0.55 * clamp((P.S.z - door.z) / 140, 0, 1);
        const k = Math.pow(1 - d / (TRAP.reach * wide), 0.7) * dk;
        pushes.set(P, { x: (dx / (d || 1)) * TRAP.pull * k, y: (dy / (d || 1)) * TRAP.pull * k });
        if (d < TRAP.suck && Math.abs(P.S.z - door.z) < 90) { T.caught.add(P); ev.push({ type: 'kill', P, by: 'the bladderwort trap', how: tt('paramecium.how.trap') }); log('catch', { slot: P.slot }); }
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

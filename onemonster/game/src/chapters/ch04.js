// Chapter 4: the Furious-Floating Ice-Ferg strikes the fishing boat Peg
// (design.md, chapter 4, "Two-player versus" and "How each creature moves").
// The sea from high above: currents of foam run across it in lanes, the Peg
// zigzags from the bottom of the screen for the harbour by the lighthouse, and
// the Ice-Ferg drifts, huffs up fury (hold Action) and charges (let go).
// A charge that hits the Peg is SCRUNNCCCHHH: the snatch. A charge that misses
// leaves the iceberg dazed for a moment. Little rowing boats cross: bumping one
// costs fury and a sea lion slides off; lose all three and the Ice-Ferg is
// dazed. Sprint rides a current lane (fast, but it hardly turns).
// The holder is the Peg's captain: steer, and Action for a burst of steam that
// shoves the boat the way the stick points, then must build up again.

import * as art from '../art.js';
import { makeFx, roundRect } from '../chasedraw.js';
import { marksFor } from './index.js';
import { actionPrompt, marker, letterTag, buttonName } from '../prompt.js';

// Tuning: the numbers that make the chapter fair (logical px and seconds).
export const TUNE = {
  time: 45,
  ferg: {
    radius: 115, accel: 130, drag: 0.55, maxSpeed: 130,
    huffAccelK: 0.45, rideK: 2.6, rideAccelK: 0.3,
    furyTime: 1.5, furyTimeGentle: 1.15, minFury: 0.2,
    chargeMin: 470, chargeAdd: 560, chargeDur: 0.5, chargeDurAdd: 0.35,
    windup: 0.4, recover: 1.1, recoverAdd: 0.8, dazed: 2, lions: 3,
  },
  peg: {
    radius: 70, cruise: 42, cruiseGentleS: 36, cruiseGentleH: 48, turn: 1.5,
    steamImpulse: 500, steamDecay: 2.6, steamCd: 3.2, steamCdGentle: 2.6, puffed: 2, puffedCruise: 14,
    currentK: 0.35,
  },
  hitSpeed: 240, // a charge must still be going this fast to strike
  hitReach: 175, // centre to centre, for a strike
  hitStop: 0.3, // the world freezes this long on the SCRUNNCCCHHH
};

const HARBOUR = { x: 1330, y: 320, r: 110, shallow: 260 }; // too shallow for an iceberg inside `shallow`
const BOUNDS = { x0: 170, x1: 1765, y0: 265, y1: 1035 };
// Rocks and shore from the scene, as circles (x, y, r).
const ROCKS = [
  [130, 220, 120], [300, 200, 75], [80, 510, 95], [60, 720, 95], [120, 900, 250], [380, 1010, 125], [540, 1070, 60],
  [1850, 330, 150], [1690, 370, 45], [1870, 430, 120], [1860, 880, 150], [1720, 880, 55], [1760, 1040, 70],
  [1040, 205, 55], [1150, 195, 60],
];
// The current lanes: foam runs from (x0, y0) to (x1, y1).
const LANES = [
  { x0: 360, y0: 820, x1: 1560, y1: 700, w: 115, s: 80 },
  { x0: 1600, y0: 565, x1: 520, y1: 470, w: 110, s: 75 },
  { x0: 330, y0: 345, x1: 830, y1: 305, w: 95, s: 85 },
].map((l) => {
  const dx = l.x1 - l.x0, dy = l.y1 - l.y0, len = Math.hypot(dx, dy);
  return { ...l, len, ux: dx / len, uy: dy / len, ang: Math.atan2(dy, dx) };
});
// The rowing boats' crossings: y, and where the open water is.
const ROWS = [{ y: 455, xa: 330, xb: 1640 }, { y: 715, xa: 360, xb: 1620 }, { y: 590, xa: 230, xb: 1720 }];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function currentAt(x, y) {
  let cx = 0, cy = 0, best = -1, bestF = 0;
  LANES.forEach((l, i) => {
    const t = ((x - l.x0) * l.ux + (y - l.y0) * l.uy) / l.len;
    if (t < -0.05 || t > 1.05) return;
    const px = l.x0 + l.ux * l.len * t, py = l.y0 + l.uy * l.len * t;
    const d = Math.hypot(x - px, y - py);
    const f = Math.max(0, 1 - (d / l.w) ** 2) * clamp(Math.min(t + 0.05, 1.05 - t) / 0.15, 0, 1);
    if (f <= 0) return;
    cx += l.ux * l.s * f; cy += l.uy * l.s * f;
    if (f > bestF) { bestF = f; best = i; }
  });
  return { x: cx, y: cy, lane: best, f: bestF };
}

// Keep a body in the bounds and out of the rocks; returns true if it hit.
function collide(b, r, bounce = 0.3) {
  let hit = false;
  if (b.x < BOUNDS.x0) { b.x = BOUNDS.x0; if (b.vx < 0) b.vx *= -bounce; hit = true; }
  if (b.x > BOUNDS.x1) { b.x = BOUNDS.x1; if (b.vx > 0) b.vx *= -bounce; hit = true; }
  if (b.y < BOUNDS.y0) { b.y = BOUNDS.y0; if (b.vy < 0) b.vy *= -bounce; hit = true; }
  if (b.y > BOUNDS.y1) { b.y = BOUNDS.y1; if (b.vy > 0) b.vy *= -bounce; hit = true; }
  for (const [x, y, rr] of ROCKS) {
    const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy), min = rr + r * 0.8;
    if (d < min && d > 0.01) {
      const nx = dx / d, ny = dy / d;
      b.x = x + nx * min; b.y = y + ny * min;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= (1 + bounce) * vn * nx; b.vy -= (1 + bounce) * vn * ny; }
      hit = true;
    }
  }
  return hit;
}

// How far a charge of this fury carries (the aim arrow shows it).
export function chargeReach(fury) {
  const F = TUNE.ferg;
  return (F.chargeMin + F.chargeAdd * fury) * (F.chargeDur + F.chargeDurAdd * fury) * (5 / 6);
}

const SIZE = 1.05; // the iceberg about 315 px tall: big enough to read from above
const PEG_H = 215; // the Peg's sprite height: plainly bigger than a rowing boat (100)

export default function create(env) {
  const { W, H } = env;
  const F = TUNE.ferg, P = TUNE.peg;
  const total = TUNE.time + (env.gentle[0] ? 10 : 0);
  const fx = makeFx();
  const rng = env.rng;

  const ferg = {
    x: 1600, y: 700, vx: 0, vy: 0, mode: 'drift', modeT: 0, fury: 0, launchFury: 0,
    aimX: 1, aimY: 0, cdx: 0, cdy: 0, chargeT: 0, chargeDur: 0, chargeSp: 0, charges: 0,
    lions: F.lions, riding: false, bumpCd: 0, fullSaid: false, rideSaid: 0,
  };
  const fc = art.makeCreature('iceferg', ferg.x, ferg.y);
  fc.sizeK = SIZE;

  const cruise = env.gentle[1] ? P.cruiseGentleH : env.gentle[0] ? P.cruiseGentleS : P.cruise;
  const steamCdMax = env.gentle[1] ? P.steamCdGentle : P.steamCd;
  const peg = {
    x: 720, y: 1012, hd: -Math.PI / 2, sp: cruise, vx: 0, vy: 0, nvx: 0, nvy: 0,
    steamCd: 1, puffed: 0, steamT: 0, turnRate: 0, rock: 0, sink: 0, bumpCd: 0,
  };

  // The AI captain's zigzag for the harbour.
  const side = rng() < 0.5 ? 1 : -1;
  const jit = () => (rng() - 0.5) * 120;
  const waypoints = [
    // Each leg crosses a current lane the way it flows.
    side > 0 ? { x: 1000 + jit() * 0.5, y: 870 + jit() * 0.3 } : { x: 540 + jit() * 0.5, y: 860 + jit() * 0.3 },
    side > 0 ? { x: 1180 + jit() * 0.5, y: 620 + jit() * 0.2 } : { x: 880 + jit() * 0.5, y: 630 + jit() * 0.2 },
    { x: 1020 + jit() * 0.5, y: 420 + jit() * 0.2 },
    { x: HARBOUR.x, y: HARBOUR.y },
  ];
  const brain = { wp: 0, seenCharge: 0, dodgeAt: -1, dodgeDir: null, side: 1, sideT: 0, best: 1e9, stuckT: 0 };

  const rowboats = ROWS.map((r, i) => spawnRow(r, i, i === 2 ? 6 : rng() * 2));
  function spawnRow(r, i, wait) {
    const dir = rng() < 0.5 ? 1 : -1;
    return { row: r, i, x: dir > 0 ? r.xa : r.xb, y: r.y + (rng() - 0.5) * 40, vx: dir * (60 + rng() * 30), vy: 0, push: 0, pvx: 0, pvy: 0,
      item: rng() < 0.5 ? 3 : 4, alpha: 0, wait, rock: 0, out: false };
  }

  const wakes = []; // foam left behind: { x, y, nx, ny, t, w }
  const parts = []; // mist, chips, bubbles, sea lions, splash rings
  let wakeT = 0;
  let t = 0;
  let shake = 0;
  let freeze = 0; // hit-stop left, s
  let flash = 0; // the white flash of the impact, 1..0
  let bottle = null;
  const kind = env.inputKind || 'keyboard';

  function say(s, x, y) { fx.say(s, x, y); }
  function setMode(m, d = 0) { ferg.mode = m; ferg.modeT = d; }

  function splashRing(x, y, size = 120) { parts.push({ k: 'ring', x, y, t: 0, life: 0.9, size }); }
  function lionOff() {
    ferg.lions = Math.max(0, ferg.lions - 1);
    const dir = rng() < 0.5 ? -1 : 1;
    parts.push({ k: 'lion', x: ferg.x + dir * 40, y: ferg.y - 150, vx: dir * 160, vy: -120, t: 0, life: 0.8, dir });
    env.sfx('splash');
    if (ferg.lions === 0) {
      setMode('dazed', F.dazed);
      ferg.fury = 0;
      say('Dazed!', ferg.x, ferg.y - 170);
      env.sfx('bonk');
    }
  }

  function endCharge(missed) {
    ferg.vx *= 0.25; ferg.vy *= 0.25;
    const fury = ferg.launchFury;
    if (missed) {
      say('Missed!', ferg.x, ferg.y - 170);
      env.sfx('splash');
      splashRing(ferg.x + ferg.cdx * 80, ferg.y + 10, 170);
      if (fury >= 0.95 && ferg.lions > 0) lionOff(); // charged too hard
    }
    if (ferg.mode === 'charge') setMode('recover', F.recover + F.recoverAdd * fury);
    ferg.fury = 0;
  }

  function strike() {
    setMode('crash', 99);
    ferg.vx = 0; ferg.vy = 0;
    self.done = true;
    self.outcome = 'snatched';
    if (ferg.launchFury >= 0.95) { self.bonus = 1; say('Full fury!', ferg.x, ferg.y - 170); }
    freeze = env.reduceMotion ? 0.12 : TUNE.hitStop;
    flash = 1;
    env.sfx('crunch');
    env.sfx('splash');
    env.vibrate(220);
    art.kick(fc, 0.6);
    shake = env.reduceMotion ? 6 : 34;
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2, s = 150 + rng() * 350;
      parts.push({ k: 'chip', x: (ferg.x + peg.x) / 2, y: (ferg.y + peg.y) / 2 - 40, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, t: 0, life: 0.9 + rng() * 0.5, r: 6 + rng() * 10, spin: rng() * 6 });
    }
    splashRing(peg.x, peg.y, 260);
    splashRing((ferg.x + peg.x) / 2, (ferg.y + peg.y) / 2, 340);
    // The blow shoves the boat clear of the ice, so it is seen going down.
    const bx = peg.x - ferg.x + ferg.cdx * 40, by = peg.y - ferg.y + ferg.cdy * 40, bd = Math.hypot(bx, by) || 1;
    peg.nvx = (bx / bd) * 420; peg.nvy = (by / bd) * 420;
  }

  // ---------- the Ice-Ferg ----------
  function stepFerg(dt, inp) {
    const sx = clamp(inp.x || 0, -1, 1), sy = clamp(inp.y || 0, -1, 1);
    const sm = Math.hypot(sx, sy);
    if (sm > 0.3) { ferg.aimX = sx / sm; ferg.aimY = sy / sm; }
    const cur = currentAt(ferg.x, ferg.y);
    ferg.modeT -= dt;
    ferg.bumpCd -= dt;
    let accel = F.accel;
    const ridingWanted = inp.sprint && cur.lane >= 0 && cur.f > 0.25 && (ferg.vx * cur.x + ferg.vy * cur.y >= -20 || sx * cur.x + sy * cur.y > 0);

    if (ferg.mode === 'recover' || ferg.mode === 'dazed') {
      if (ferg.modeT <= 0) {
        if (ferg.mode === 'dazed' && ferg.lions === 0) { ferg.lions = F.lions; say('Back on!', ferg.x, ferg.y - 170); }
        setMode('drift');
      } else accel *= 0.15;
    }
    if (ferg.mode === 'drift' && inp.action) {
      setMode('huff');
      env.sfx('creak');
      art.kick(fc, -0.25);
      ferg.fullSaid = false;
    }
    if (ferg.mode === 'huff') {
      ferg.fury = Math.min(1, ferg.fury + dt / (env.gentle[0] ? F.furyTimeGentle : F.furyTime));
      accel *= F.huffAccelK;
      if (ferg.fury >= 1 && !ferg.fullSaid) {
        ferg.fullSaid = true;
        say('Full fury!', ferg.x, ferg.y - 170);
        env.sfx('creak'); env.vibrate(40);
        art.kick(fc, 0.3);
      }
      if (rng() < dt * 22) {
        const a = rng() * Math.PI * 2;
        parts.push({ k: 'mist', x: ferg.x + Math.cos(a) * 90, y: ferg.y - 60 - rng() * 140, vx: Math.cos(a) * 60, vy: -20 - rng() * 30, t: 0, life: 1.1, r: 18 + rng() * 22 });
      }
      if (!inp.action) {
        if (ferg.fury < F.minFury) { setMode('drift'); ferg.fury = 0; env.sfx('steam'); }
        else {
          // Launch the charge.
          const fury = ferg.fury;
          ferg.launchFury = fury;
          ferg.cdx = ferg.aimX; ferg.cdy = ferg.aimY;
          ferg.chargeSp = F.chargeMin + F.chargeAdd * fury;
          ferg.chargeDur = F.chargeDur + F.chargeDurAdd * fury;
          ferg.chargeT = 0;
          ferg.charges++;
          // A short rear-back first: the tell the captain can read.
          setMode('windup', F.windup);
          env.sfx('creak');
          art.kick(fc, 0.4);
          if (Math.abs(ferg.cdx) > 0.2) fc.facing = Math.sign(ferg.cdx);
        }
      }
    }
    if (ferg.mode === 'windup') {
      const k = Math.exp(-6 * dt);
      ferg.vx *= k; ferg.vy *= k;
      ferg.x += (ferg.vx + cur.x) * dt - ferg.cdx * 40 * dt;
      ferg.y += (ferg.vy + cur.y) * dt - ferg.cdy * 40 * dt;
      collide(ferg, F.radius, 0.3);
      if (ferg.modeT <= 0) {
        setMode('charge', ferg.chargeDur);
        env.sfx('whoosh');
        env.vibrate(50);
        art.kick(fc, -0.5);
        shake = Math.max(shake, env.reduceMotion ? 2 : 8 * ferg.launchFury);
      }
    }
    if (ferg.mode === 'charge') {
      ferg.chargeT += dt;
      const p = clamp(ferg.chargeT / ferg.chargeDur, 0, 1);
      const sp = ferg.chargeSp * (1 - 0.5 * p * p);
      ferg.vx = ferg.cdx * sp; ferg.vy = ferg.cdy * sp;
      ferg.x += (ferg.vx + cur.x) * dt;
      ferg.y += (ferg.vy + cur.y) * dt;
      if (collide(ferg, F.radius, 0.2)) {
        say('Bonk!', ferg.x, ferg.y - 170);
        env.sfx('bonk');
        art.kick(fc, 0.5);
        endCharge(false);
        setMode('recover', F.recover + F.recoverAdd * ferg.launchFury + 0.4);
      } else if (p >= 1) endCharge(true);
    } else if (ferg.mode !== 'crash' && ferg.mode !== 'windup') {
      ferg.riding = ridingWanted && ferg.mode === 'drift';
      if (ferg.riding) {
        accel *= F.rideAccelK;
        if (t - ferg.rideSaid > 4) { ferg.rideSaid = t; env.sfx('whoosh'); }
      }
      ferg.vx += sx * accel * dt;
      ferg.vy += sy * accel * dt;
      const k = Math.exp(-F.drag * dt);
      ferg.vx *= k; ferg.vy *= k;
      const sp = Math.hypot(ferg.vx, ferg.vy);
      if (sp > F.maxSpeed) { ferg.vx *= F.maxSpeed / sp; ferg.vy *= F.maxSpeed / sp; }
      const ck = ferg.riding ? F.rideK : 1;
      ferg.x += (ferg.vx + cur.x * ck) * dt;
      ferg.y += (ferg.vy + cur.y * ck) * dt;
      collide(ferg, F.radius, 0.3);
      // The harbour shallows push the iceberg back out.
      const hx = ferg.x - HARBOUR.x, hy = ferg.y - HARBOUR.y, hd = Math.hypot(hx, hy) || 1;
      if (hd < HARBOUR.shallow) {
        const k2 = (HARBOUR.shallow - hd) * 4 * dt;
        ferg.x += (hx / hd) * k2; ferg.y += (hy / hd) * k2;
        const vn = ferg.vx * hx / hd + ferg.vy * hy / hd;
        if (vn < 0) { ferg.vx -= vn * hx / hd * 0.5; ferg.vy -= vn * hy / hd * 0.5; }
      }
    }
    if (ferg.mode !== 'charge' && ferg.mode !== 'crash' && sm > 0.3 && Math.abs(sx) > 0.2 && ferg.mode !== 'huff') fc.facing = Math.sign(sx);
    if (ferg.mode === 'huff' && Math.abs(ferg.aimX) > 0.2) fc.facing = Math.sign(ferg.aimX);
  }

  // ---------- the Peg ----------
  function aiCaptain(dt) {
    const elapsed = total - self.time;
    let wp = waypoints[brain.wp];
    // Next waypoint when reached, or when the iceberg sits on it.
    if (brain.wp < waypoints.length - 1 && (Math.hypot(wp.x - peg.x, wp.y - peg.y) < 90 || Math.hypot(wp.x - ferg.x, wp.y - ferg.y) < 230)) {
      brain.wp++; wp = waypoints[brain.wp]; brain.best = 1e9;
    }
    // Getting nowhere (the iceberg in the way): grow bolder and squeeze past.
    const wd = Math.hypot(wp.x - peg.x, wp.y - peg.y);
    if (wd < brain.best - 15) { brain.best = wd; brain.stuckT = 0; } else brain.stuckT += dt;
    const bold = 1 + Math.max(0, brain.stuckT - 2) * 0.8;
    let dx = wp.x - peg.x, dy = wp.y - peg.y;
    let d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    // Keep clear of the iceberg, more when it is huffing; warier as time goes on.
    // Ahead of the boat it is rounded on the side with more sea; behind, outrun.
    const fx_ = peg.x - ferg.x, fy_ = peg.y - ferg.y, fd = Math.hypot(fx_, fy_) || 1;
    const huffing = ferg.mode === 'huff';
    const R = (huffing ? 460 : 210) + elapsed * 3 * env.skill;
    const calm = ferg.mode === 'recover' || ferg.mode === 'dazed';
    brain.sideT -= dt;
    if (fd < R && !calm) {
      let w = (1 - fd / R) * (huffing ? 2 : 0.8) * (0.5 + env.skill);
      if (Math.hypot(peg.x - HARBOUR.x, peg.y - HARBOUR.y) < 300) w *= 0.3; // dash for it
      if (!huffing) w /= bold;
      const ahead = (dx * -fx_ + dy * -fy_) / fd;
      if (ahead > 0.1) {
        const tx = -fy_ / fd, ty = fx_ / fd;
        if (!(brain.sideT > 0)) {
          const room = (q) => Math.min(q.x - BOUNDS.x0, BOUNDS.x1 - q.x, q.y - BOUNDS.y0, BOUNDS.y1 - q.y) - (ROCKS.some(([x, y, r]) => Math.hypot(q.x - x, q.y - y) < r + 70) ? 300 : 0);
          brain.side = room({ x: peg.x + tx * 220, y: peg.y + ty * 220 }) >= room({ x: peg.x - tx * 220, y: peg.y - ty * 220 }) ? 1 : -1;
          brain.sideT = 2;
        }
        dx += tx * brain.side * w * 1.6 + (fx_ / fd) * w * 0.4;
        dy += ty * brain.side * w * 1.6 + (fy_ / fd) * w * 0.4;
      } else {
        dx += (fx_ / fd) * w; dy += (fy_ / fd) * w;
      }
      // Huffing close by: steam clear before it charges (that spends the steam).
      if (huffing && fd < 330 && peg.steamCd <= 0 && rng() < dt * 1.2 * (1 - env.skill) * (0.4 + ferg.fury)) {
        brain.dodgeAt = t; brain.dodgeDir = { x: fx_ / fd, y: fy_ / fd };
      }
    }
    // Keep off the rocks and the edges.
    for (const [x, y, r] of ROCKS) {
      const ex = peg.x - x, ey = peg.y - y, e = Math.hypot(ex, ey);
      if (e < r + 140) { const w = (1 - (e - r) / 140) * 1.5; dx += (ex / e) * w; dy += (ey / e) * w; }
    }
    if (peg.x < BOUNDS.x0 + 100) dx += 1;
    if (peg.x > BOUNDS.x1 - 100) dx -= 1;
    if (peg.y > BOUNDS.y1 - 30) dy -= 1;
    // A charge coming: maybe dodge with a burst of steam.
    let action = false;
    if ((ferg.mode === 'windup' || ferg.mode === 'charge') && brain.seenCharge !== ferg.charges) {
      brain.seenCharge = ferg.charges;
      const p = clamp(0.25 + 0.6 * env.skill + (env.gentle[1] ? 0.15 : 0) + 0.1 * (elapsed / total), 0, 0.95);
      if (rng() < p) {
        brain.dodgeAt = t + 0.25 - 0.2 * env.skill;
        // Sideways from the line of the charge, on the side the boat is already.
        const cr = ferg.cdx * fy_ - ferg.cdy * fx_;
        const s = cr >= 0 ? 1 : -1;
        brain.dodgeDir = { x: -ferg.cdy * s, y: ferg.cdx * s };
      }
    }
    if (brain.dodgeDir && t >= brain.dodgeAt) {
      dx = brain.dodgeDir.x * 3 + dx * 0.3; dy = brain.dodgeDir.y * 3 + dy * 0.3;
      if (peg.steamCd <= 0) action = true;
      if (t > brain.dodgeAt + 0.6 || peg.steamCd > 0.5) brain.dodgeDir = null;
    }
    // Allow for the current (steer a little into it).
    d = Math.hypot(dx, dy) || 1;
    const cur = currentAt(peg.x, peg.y);
    dx = (dx / d) * cruise - cur.x * P.currentK;
    dy = (dy / d) * cruise - cur.y * P.currentK;
    d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d, action, actionPressed: action, actionReleased: false, sprint: false };
  }

  function stepPeg(dt, inp) {
    const sx = clamp(inp.x || 0, -1, 1), sy = clamp(inp.y || 0, -1, 1);
    const sm = Math.hypot(sx, sy);
    peg.steamCd -= dt;
    peg.puffed -= dt;
    peg.steamT -= dt;
    peg.bumpCd -= dt;
    if (sm > 0.3) {
      const want = Math.atan2(sy, sx);
      const diff = wrap(want - peg.hd);
      const rate = P.turn * (peg.steamT > 0 ? 1.6 : 1);
      const turn = clamp(diff, -rate * dt, rate * dt);
      peg.hd = wrap(peg.hd + turn);
      peg.turnRate = turn / dt;
    } else peg.turnRate *= Math.exp(-6 * dt);
    if (inp.actionPressed && peg.steamCd <= 0) {
      const ux = sm > 0.3 ? sx / sm : Math.cos(peg.hd), uy = sm > 0.3 ? sy / sm : Math.sin(peg.hd);
      peg.nvx += ux * P.steamImpulse; peg.nvy += uy * P.steamImpulse;
      peg.steamCd = steamCdMax;
      peg.puffed = P.puffed;
      peg.steamT = 0.7;
      env.sfx('steam');
      env.sfx('horn');
      for (let i = 0; i < 6; i++) parts.push({ k: 'steam', x: peg.x, y: peg.y - 40, vx: (rng() - 0.5) * 80 - ux * 60, vy: -40 - rng() * 60 - uy * 60, t: 0, life: 1.2, r: 16 + rng() * 14 });
    }
    const target = peg.puffed > 0 && peg.steamT <= 0 ? P.puffedCruise : cruise;
    peg.sp += (target - peg.sp) * (1 - Math.exp(-1.5 * dt));
    const k = Math.exp(-P.steamDecay * dt);
    peg.nvx *= k; peg.nvy *= k;
    const cur = currentAt(peg.x, peg.y);
    peg.vx = Math.cos(peg.hd) * peg.sp + peg.nvx + cur.x * P.currentK;
    peg.vy = Math.sin(peg.hd) * peg.sp + peg.nvy + cur.y * P.currentK;
    peg.x += peg.vx * dt;
    peg.y += peg.vy * dt;
    const b = { x: peg.x, y: peg.y, vx: peg.nvx, vy: peg.nvy };
    if (collide(b, P.radius, 0.4)) { peg.x = b.x; peg.y = b.y; peg.nvx = b.vx; peg.nvy = b.vy; }
    peg.rock += dt;
  }

  // ---------- rowing boats ----------
  function stepRows(dt) {
    for (let i = 0; i < rowboats.length; i++) {
      const b = rowboats[i];
      if (b.wait > 0) { b.wait -= dt; continue; }
      b.x += (b.vx + b.pvx) * dt;
      b.y += b.pvy * dt;
      const kk = Math.exp(-2 * dt);
      b.pvx *= kk; b.pvy *= kk;
      b.y += (b.row.y - b.y) * (1 - Math.exp(-0.5 * dt));
      b.rock = Math.max(0, b.rock - dt);
      b.bump = Math.max(0, (b.bump || 0) - dt);
      const atEnd = b.vx > 0 ? b.x > b.row.xb : b.x < b.row.xa;
      b.alpha = clamp(b.alpha + (atEnd ? -dt : dt) * 1.5, 0, 1);
      if (atEnd && b.alpha <= 0) { rowboats[i] = spawnRow(b.row, b.i, 1.5 + rng() * 3); continue; }
      if (b.alpha < 0.5) continue;
      // They row round the iceberg when they can (a slow drift never costs a sea lion).
      const ax = ferg.x - b.x, ay = ferg.y - b.y, ad = Math.hypot(ax, ay);
      if (ad < 330 && Math.sign(ax) === Math.sign(b.vx)) b.pvy += (ay > 0 ? -1 : 1) * 140 * dt * (1 - ad / 330) * 4;
      // The Peg pushes them aside.
      const pd = Math.hypot(b.x - peg.x, b.y - peg.y);
      if (pd < P.radius + 50 && pd > 0.1) { b.pvx += ((b.x - peg.x) / pd) * 100; b.pvy += ((b.y - peg.y) / pd) * 100; b.rock = 0.5; }
      // The Ice-Ferg bumps into them.
      const fd = Math.hypot(b.x - ferg.x, b.y - ferg.y);
      if (fd < F.radius + 45 && fd > 0.1 && b.bump <= 0 && ferg.mode !== 'crash') {
        const nx = (b.x - ferg.x) / fd, ny = (b.y - ferg.y) / fd;
        const hard = ferg.mode === 'charge' || ferg.mode === 'windup' || Math.hypot(ferg.vx, ferg.vy) + (ferg.riding ? 200 : 0) > 90;
        b.pvx += nx * 240; b.pvy += ny * 240; b.rock = 1; b.bump = 1.2;
        splashRing(b.x, b.y, 110);
        if (!hard) { say('Bump!', b.x, b.y - 90); env.sfx('thump'); continue; } // nudged aside, no harm done
        ferg.vx = -nx * 60; ferg.vy = -ny * 60;
        if (ferg.mode === 'charge') endCharge(false);
        if (ferg.mode === 'huff') setMode('drift');
        ferg.fury = Math.max(0, ferg.fury - 0.5);
        art.kick(fc, 0.35);
        env.sfx('bonk');
        say('Splash!', b.x, b.y - 120);
        lionOff();
      }
    }
  }

  // ---------- foam ----------
  function stepFoam(dt) {
    wakeT -= dt;
    if (wakeT <= 0) {
      wakeT = 0.07;
      const psp = Math.hypot(peg.vx, peg.vy);
      if (!self.done || self.outcome === 'kept') {
        const ux = Math.cos(peg.hd), uy = Math.sin(peg.hd);
        wakes.push({ x: peg.x - ux * 60, y: peg.y - uy * 60, nx: -uy, ny: ux, t: 0, w: 0.5 + psp / 120 });
      }
      const fsp = Math.hypot(ferg.vx, ferg.vy);
      if (fsp > 30 && ferg.mode !== 'crash') {
        const ux = ferg.vx / fsp, uy = ferg.vy / fsp;
        wakes.push({ x: ferg.x - ux * 90, y: ferg.y + 15 - uy * 50, nx: -uy, ny: ux, t: 0, w: 0.6 + fsp / 220, big: true });
      }
    }
    for (const w of wakes) w.t += dt;
    while (wakes.length && wakes[0].t > 1.8) wakes.shift();
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.vx !== undefined) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 'chip' || p.k === 'lion') p.vy += 900 * dt;
        else { p.vx *= Math.exp(-1.5 * dt); p.vy *= Math.exp(-1.5 * dt); }
      }
      if (p.k === 'lion' && p.t >= p.life && !p.splashed) { p.splashed = true; splashRing(p.x, p.y, 90); }
      if (p.t > p.life) parts.splice(i, 1);
    }
  }

  const self = {
    focus: () => [ferg, peg], // what the camera frames: the snatcher, then the holder
    time: total,
    done: false,
    outcome: null,
    bonus: 0,
    outroTime: 3.2, // the Peg goes down and the bottle bobs away before the celebration
    ferg, peg, rowboats, fc, TUNE, HARBOUR,
    update(dt, inS, inH) {
      t += dt;
      flash = Math.max(0, flash - dt * 2.5);
      if (freeze > 0) { freeze -= dt; return; } // the SCRUNNCCCHHH hangs for a moment
      fx.update(dt);
      shake = Math.max(0, shake - dt * 40);
      if (self.done) {
        outro(dt);
        stepFoam(dt);
        return;
      }
      self.time = Math.max(0, self.time - dt);
      stepFerg(dt, inS || {});
      const hin = env.versus && inH ? inH : aiCaptain(dt);
      stepPeg(dt, hin);
      stepRows(dt);
      // Iceberg meets boat.
      const dx = peg.x - ferg.x, dy = peg.y - ferg.y, d = Math.hypot(dx, dy) || 1;
      if (d < F.radius + P.radius) {
        const sp = Math.hypot(ferg.vx, ferg.vy);
        if (ferg.mode === 'charge' && sp >= TUNE.hitSpeed && d < TUNE.hitReach) strike();
        else if (ferg.mode === 'charge' && sp >= TUNE.hitSpeed) { /* a near thing: keep charging */ }
        else {
          const nx = dx / d, ny = dy / d, push = F.radius + P.radius - d;
          peg.x += nx * push; peg.y += ny * push;
          if (peg.bumpCd <= 0) {
            peg.nvx += nx * 120; peg.nvy += ny * 120;
            ferg.vx *= 0.4; ferg.vy *= 0.4;
            peg.bumpCd = 0.8;
            env.sfx('thump');
                  say('Bump!', peg.x, peg.y - 150);
            art.kick(fc, 0.2);
            if (ferg.mode === 'charge') endCharge(false);
          }
        }
      }
      if (!self.done && Math.hypot(peg.x - HARBOUR.x, peg.y - HARBOUR.y) < HARBOUR.r) {
        self.done = true;
        self.outcome = 'kept';
        env.sfx('horn');
        env.sfx('cheer');
        say('Safe in the harbour!', HARBOUR.x, HARBOUR.y - 120);
      } else if (!self.done && self.time <= 0) {
        self.done = true;
        self.outcome = 'kept';
        env.sfx('horn');
      }
      animFerg(dt);
      stepFoam(dt);
    },
    draw(g, tt) {
      g.save();
      if (shake > 0) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      art.drawScene(g, 'scenes/iceferg', W, H);
      drawLanes(g, tt);
      drawHarbour(g, tt);
      drawWakes(g);
      for (const p of parts) if (p.k === 'ring') drawRing(g, p);
      const things = [
        ...rowboats.filter((b) => b.wait <= 0 && b.alpha > 0).map((b) => ({ y: b.y, draw: () => drawRow(g, b, tt) })),
        { y: peg.y, draw: () => drawPeg(g, tt) },
        { y: ferg.y + 30, draw: () => drawFerg(g, tt) },
      ];
      if (bottle) things.push({ y: bottle.y, draw: () => art.drawSprite(g, art.prop('typhoonigator', 1), bottle.x, bottle.y + Math.sin(tt * 4) * 5, { height: 70, ay: 0.7, rot: Math.sin(tt * 2.3) * 0.5, alpha: bottle.a }) });
      things.sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      for (const p of parts) if (p.k !== 'ring') drawPart(g, p);
      if (!self.done) { drawMeters(g); drawPrompts(g, tt); }
      if (self.done && self.outcome === 'snatched') drawScrunch(g, tt);
      fx.draw(g);
      g.restore();
      if (flash > 0) { g.save(); g.globalAlpha = flash * 0.8; g.fillStyle = '#fbf6e8'; g.fillRect(0, 0, W, H); g.restore(); }
      if (t < 5 && !self.done) hint(g, env.versus
        ? `Ice-Ferg: hold ${buttonName(kind, 'action', 0)}, let go to CHARGE!  ·  Peg: steer home, ${buttonName(kind, 'action', 1)} for steam!`
        : `Hold ${buttonName(kind)} to huff up fury, let go to CHARGE the Peg!`, W, t);
    },
    marks() {
      const elapsed = total - self.time;
      return marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: elapsed / total, bonus: self.bonus });
    },
    hud() {
      const lions = 'Sea lions ' + ferg.lions;
      return self.bonus ? `${lions} · Full fury!` : lions;
    },
  };

  function animFerg(dt) {
    const m = ferg.mode;
    if (m === 'huff' || m === 'windup') art.setAnim(fc, 'huff');
    else if (m === 'charge') art.setAnim(fc, 'charge');
    else if (m === 'crash') art.setAnim(fc, 'crash');
    else if (m === 'recover' || m === 'dazed') art.setAnim(fc, 'dazed');
    else art.setAnim(fc, 'drift');
    fc.sizeK = SIZE * (1 + (m === 'huff' ? 0.1 * ferg.fury : m === 'windup' ? 0.1 * ferg.launchFury : 0));
    const f = fc.facing;
    art.animate(fc, dt, 0, 0);
    fc.facing = f;
    fc.lean = 0; // seen from a slant: never tilt it
    fc.x = ferg.x; fc.y = ferg.y + 45;
  }

  let outT = 0;
  function outro(dt) {
    outT += dt;
    if (self.outcome === 'snatched') {
      peg.sink = Math.min(1, outT / 4);
      const kk = Math.exp(-3 * dt);
      peg.x += peg.nvx * dt; peg.y += peg.nvy * dt; peg.nvx *= kk; peg.nvy *= kk;
      if (outT > 0.9) art.setAnim(fc, 'celebrate');
      if (rng() < dt * 12 && peg.sink < 1) parts.push({ k: 'bubble', x: peg.x + (rng() - 0.5) * 90, y: peg.y + (rng() - 0.5) * 40, vx: 0, vy: -30, t: 0, life: 0.8, r: 5 + rng() * 8 });
      if (outT > 1.4 && !bottle) {
        const bx = peg.x - ferg.x, by = peg.y - ferg.y, bd = Math.hypot(bx, by) || 1;
        bottle = { x: peg.x + (bx / bd) * 60, y: peg.y + (by / bd) * 30, vx: (bx / bd) * 70, vy: (by / bd) * 35, a: 1 };
        splashRing(bottle.x, bottle.y, 80);
        env.sfx('splash'); env.sfx('tinkle');
        say('A bottle!', bottle.x, bottle.y - 100);
      }
      if (bottle) { bottle.x += bottle.vx * dt; bottle.y += bottle.vy * dt; }
    } else {
      // The Peg chugs into the harbour; the Ice-Ferg sulks.
      const dx = HARBOUR.x - peg.x, dy = HARBOUR.y - 10 - peg.y, d = Math.hypot(dx, dy);
      if (d > 4) { peg.hd += wrap(Math.atan2(dy, dx) - peg.hd) * Math.min(1, dt * 2); peg.x += (dx / d) * Math.min(d, 40 * dt); peg.y += (dy / d) * Math.min(d, 40 * dt); }
      peg.rock += dt;
      peg.steamT = Math.sin(outT * 3) > 0.6 ? 0.2 : 0;
      if (rng() < dt * 3) parts.push({ k: 'steam', x: peg.x, y: peg.y - 50, vx: (rng() - 0.5) * 40, vy: -60, t: 0, life: 1.2, r: 14 + rng() * 10 });
      art.setAnim(fc, 'dazed');
      ferg.x += ferg.vx * dt; ferg.y += ferg.vy * dt;
      ferg.vx *= Math.exp(-2 * dt); ferg.vy *= Math.exp(-2 * dt);
      fc.x = ferg.x; fc.y = ferg.y + 45;
    }
    const f = fc.facing;
    art.animate(fc, dt, 0, 0);
    fc.facing = f;
    fc.lean = 0;
  }

  // ---------- drawing ----------
  function drawLanes(g, tt) {
    for (const l of LANES) {
      // A pale band of foam along the lane, so it reads as a river in the sea.
      g.save();
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(236,246,250,0.16)';
      g.lineWidth = l.w * 1.5;
      g.beginPath(); g.moveTo(l.x0, l.y0); g.lineTo(l.x1, l.y1); g.stroke();
      g.strokeStyle = 'rgba(246,252,255,0.22)';
      g.lineWidth = l.w * 0.7;
      g.stroke();
      // Streaks of foam running along it.
      g.strokeStyle = 'rgba(248,252,255,0.9)';
      g.lineWidth = 6;
      for (let i = 0; i < 11; i++) {
        const ph = ((tt * l.s) / l.len + i / 11 + i * 0.037) % 1;
        const off = (((i * 37) % 7) - 3) * (l.w / 5);
        const x = l.x0 + l.ux * l.len * ph - l.uy * off, y = l.y0 + l.uy * l.len * ph + l.ux * off;
        g.globalAlpha = Math.sin(ph * Math.PI) * 0.7;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - l.ux * 60, y - l.uy * 60);
        g.stroke();
      }
      g.restore();
      // Big foam arrows, the way it flows.
      for (let i = 0; i < 3; i++) {
        const ph = ((tt * l.s * 0.6) / l.len + i / 3) % 1;
        const x = l.x0 + l.ux * l.len * ph, y = l.y0 + l.uy * l.len * ph;
        const a = Math.min(1, Math.sin(ph * Math.PI) * 1.6);
        if (!art.drawSprite(g, art.prop('iceferg', 5), x, y, { height: 120, ax: 0.5, ay: 0.5, rot: l.ang, alpha: a })) {
          g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(l.ang);
          g.strokeStyle = '#f4fbfb'; g.lineWidth = 10; g.lineCap = 'round';
          g.beginPath(); g.moveTo(-50, 0); g.lineTo(40, 0); g.moveTo(10, -28); g.lineTo(40, 0); g.lineTo(10, 28); g.stroke();
          g.restore();
        }
      }
    }
  }

  // The harbour mouth under the quay: the Peg's finish line, ringed and
  // flagged on the pier, so the player knows where to cut the boat off.
  function drawHarbour(g, tt) {
    g.save();
    g.globalAlpha = 0.16;
    g.fillStyle = '#bff0e6';
    g.beginPath(); g.ellipse(HARBOUR.x, HARBOUR.y, HARBOUR.shallow, HARBOUR.shallow * 0.55, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    const p = 1 + Math.sin(tt * 3) * 0.05;
    g.save();
    g.translate(HARBOUR.x, HARBOUR.y);
    g.scale(p, p * 0.55);
    g.setLineDash([22, 16]);
    g.lineDashOffset = -tt * 30;
    g.lineWidth = 9;
    g.strokeStyle = 'rgba(51,36,26,0.55)';
    g.beginPath(); g.arc(0, 0, HARBOUR.r + 3, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(255,240,170,0.95)';
    g.beginPath(); g.arc(0, 0, HARBOUR.r, 0, Math.PI * 2); g.stroke();
    g.restore();
    marker(g, HARBOUR.x, HARBOUR.y - HARBOUR.r * 0.55 - 6, { t: tt, colour: '#f2c53d', size: 0.9 });
    g.save();
    g.font = '800 30px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(251,246,232,0.95)';
    g.fillStyle = '#33241a';
    g.strokeText('The harbour', HARBOUR.x, HARBOUR.y + 6);
    g.fillText('The harbour', HARBOUR.x, HARBOUR.y + 6);
    g.restore();
  }

  // The things that must read at a glance: which boat is the Peg (the letter
  // is aboard), and what to press right now.
  function drawPrompts(g, tt) {
    if (self.outcome !== 'snatched') {
      const ly = peg.y - PEG_H * 0.62;
      letterTag(g, peg.x, ly - 10, { t: tt, r: 40 });
      g.save();
      g.font = '800 28px Fraunces, Georgia, serif';
      g.textAlign = 'center';
      g.lineWidth = 7;
      g.strokeStyle = 'rgba(251,246,232,0.95)';
      g.fillStyle = '#33241a';
      g.strokeText('The Peg', peg.x, ly + 50);
      g.fillText('The Peg', peg.x, ly + 50);
      g.restore();
    }
    const d = Math.hypot(peg.x - ferg.x, peg.y - ferg.y);
    const px = ferg.x, py = ferg.y - 250;
    if (ferg.mode === 'drift' && ferg.charges === 0 && d < 1100) {
      // Never charged yet: say how.
      actionPrompt(g, px, py, 'Hold: huff!', { kind, side: 0, t: tt, size: 34 });
    } else if (ferg.mode === 'huff') {
      if (aimed() && ferg.fury >= 0.5) actionPrompt(g, px, py, 'Let go: CHARGE!', { kind, side: 0, t: tt, pulse: 1, size: 38 });
      else if (ferg.fury >= 1) actionPrompt(g, px, py, 'Aim at the Peg!', { kind, side: 0, t: tt, size: 32 });
    }
    // In versus, the captain is told when steam would save the boat.
    if (env.versus && (ferg.mode === 'windup' || (ferg.mode === 'huff' && ferg.fury > 0.6)) && d < 700 && peg.steamCd <= 0) {
      actionPrompt(g, peg.x, peg.y - PEG_H * 0.62 - 90, 'Steam!', { kind, side: 1, t: tt, pulse: 1, size: 32 });
    }
  }

  // Is the Peg in the charge's path and within its reach?
  function aimed() {
    const reach = chargeReach(ferg.fury);
    const dx = peg.x - ferg.x, dy = peg.y - ferg.y;
    const along = dx * ferg.aimX + dy * ferg.aimY;
    const across = Math.abs(dx * ferg.aimY - dy * ferg.aimX);
    return along > 0 && along < reach + 60 && across < P.radius + 70;
  }

  // The SCRUNNCCCHHH itself, big across the sea.
  function drawScrunch(g, tt) {
    const k = clamp(outT / 0.35, 0, 1);
    if (outT > 2.2) return;
    g.save();
    g.globalAlpha = outT > 1.7 ? 1 - (outT - 1.7) / 0.5 : 1;
    g.translate((ferg.x + peg.x) / 2, Math.min(ferg.y, peg.y) - 230);
    g.rotate(-0.1 + Math.sin(tt * 30) * 0.015 * (1 - k));
    const s = 0.5 + 0.5 * (1 - (1 - k) * (1 - k)) + (freeze > 0 ? 0.25 : 0);
    g.scale(s, s);
    g.font = '900 110px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.lineWidth = 16;
    g.strokeStyle = '#33241a';
    g.fillStyle = '#f2c53d';
    g.strokeText('SCRUNNCCCHHH!!', 0, 0);
    g.fillText('SCRUNNCCCHHH!!', 0, 0);
    g.restore();
  }

  function drawWakes(g) {
    g.save();
    g.fillStyle = '#f4fbfb';
    for (const w of wakes) {
      const a = 1 - w.t / 1.8;
      const spread = (w.big ? 70 : 34) + w.t * (w.big ? 60 : 50) * w.w;
      const r = (w.big ? 9 : 5) * (0.6 + a);
      g.globalAlpha = a * (w.big ? 0.32 : 0.55);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(w.x + w.nx * spread * s, w.y + w.ny * spread * s * 0.6, r * 1.6, r, 0, 0, Math.PI * 2);
        g.fill();
      }
      if (w.t < 0.5) {
        g.globalAlpha = (0.5 - w.t) * 0.7;
        g.beginPath(); g.ellipse(w.x, w.y, r * 2.4, r * 1.2, 0, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
  }

  function drawRing(g, p) {
    const k = p.t / p.life;
    art.drawSprite(g, art.prop('iceferg', 6), p.x, p.y, { height: p.size * (0.6 + k * 0.7), ay: 0.6, sy: 0.7, alpha: 1 - k });
  }

  // A boat sprite drawn bow-first along heading a (the sheet's boats point down-right).
  function boatSprite(g, sp, x, y, a, h, base, extra = {}) {
    const flip = Math.cos(a) < 0;
    const rot = flip ? wrap(a - (Math.PI - base)) : wrap(a - base);
    return art.drawSprite(g, sp, x, y, { height: h, ay: 0.5, flip, rot: rot * 0.75, ...extra });
  }

  function drawRow(g, b, tt) {
    const rockA = Math.sin(tt * 9 + b.i) * 0.25 * b.rock + Math.sin(tt * 2 + b.i * 2) * 0.04;
    const a = b.vx > 0 ? 0 : Math.PI;
    g.save();
    g.globalAlpha = 0.25 * b.alpha;
    g.fillStyle = '#f4fbfb';
    g.beginPath(); g.ellipse(b.x - Math.sign(b.vx) * 40, b.y + 6, 30 + Math.sin(tt * 6 + b.i) * 6, 8, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    if (!boatSprite(g, art.prop('iceferg', b.item), b.x, b.y, a + rockA, 100, 0.55, { alpha: b.alpha })) {
      g.save(); g.globalAlpha = b.alpha; g.fillStyle = b.item === 3 ? '#b5463a' : '#5f8f5a'; g.strokeStyle = '#33241a'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(b.x, b.y, 48, 20, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
  }

  function drawPeg(g, tt) {
    const roll = Math.sin(tt * 2.2) * 0.04 + clamp(peg.turnRate, -1.5, 1.5) * 0.05;
    const leaning = !self.done && (peg.steamT > 0 || Math.abs(peg.turnRate) > 1.1);
    let item = leaning ? 7 : 1;
    let alpha = 1, h = PEG_H, y = peg.y + Math.sin(tt * 2.6) * 3;
    if (self.outcome === 'snatched') { item = 2; alpha = 1 - peg.sink * 0.75; h = PEG_H * 1.05 * (1 - peg.sink * 0.4); y += peg.sink * 25; }
    else if (self.outcome === 'kept' && peg.steamT > 0) item = 7;
    // The steam-recharge ring under the boat (the captain's one trick).
    if (!self.done) {
      g.save();
      g.translate(peg.x, peg.y + 55);
      g.scale(1, 0.4);
      g.lineWidth = 11;
      g.strokeStyle = 'rgba(30,40,60,0.35)';
      g.beginPath(); g.arc(0, 0, 95, 0, Math.PI * 2); g.stroke();
      const f = peg.steamCd <= 0 ? 1 : 1 - peg.steamCd / steamCdMax;
      g.strokeStyle = peg.steamCd <= 0 ? '#f8f1e0' : '#9fb4c0';
      g.beginPath(); g.arc(0, 0, 95, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.stroke();
      g.restore();
    }
    // In the charge's path: the boat is ringed red, so the aim reads.
    if (!self.done && ferg.mode === 'huff' && aimed()) {
      g.save();
      g.strokeStyle = '#ff6b4a';
      g.lineWidth = 7;
      g.setLineDash([16, 12]);
      g.lineDashOffset = -tt * 60;
      g.beginPath(); g.ellipse(peg.x, peg.y + 10, 125, 85, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    if (!boatSprite(g, art.prop('iceferg', item), peg.x, y, peg.hd + roll, h, 0.5, { alpha })) {
      g.save(); g.globalAlpha = alpha; g.fillStyle = '#2f7f7a'; g.strokeStyle = '#33241a'; g.lineWidth = 4;
      g.translate(peg.x, peg.y); g.rotate(peg.hd);
      g.beginPath(); g.ellipse(0, 0, 100, 42, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#c9a36a'; g.fillRect(-30, -22, 44, 44); g.strokeRect(-30, -22, 44, 44);
      g.restore();
    }
  }

  function drawFerg(g, tt) {
    // A dark skirt of water where the ice sits, and a ring of foam that grows with fury.
    g.save();
    g.globalAlpha = 0.25;
    g.fillStyle = '#1c3448';
    g.beginPath(); g.ellipse(ferg.x, ferg.y + 40, 170, 40, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.5 + ferg.fury * 0.4;
    g.strokeStyle = '#f4fbfb';
    g.lineWidth = 5 + ferg.fury * 7;
    const wob = Math.sin(tt * 5) * 6;
    g.beginPath(); g.ellipse(ferg.x, ferg.y + 40, 170 + wob + ferg.fury * 25, 36 + wob * 0.3, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
    if (ferg.mode === 'huff' || ferg.mode === 'windup') drawAim(g, tt);
    if (ferg.mode === 'charge') drawChargeTrail(g, tt);
    art.drawCreature(g, fc, tt, { reduceMotion: env.reduceMotion, shadow: false });
  }

  // The aim: a wide pale lane the charge will take, as far as it reaches, with
  // a big arrowhead; red and throbbing once the fury is full or the charge is
  // launched.
  function drawAim(g, tt) {
    const wind = ferg.mode === 'windup';
    const fury = wind ? ferg.launchFury : ferg.fury;
    const reach = chargeReach(fury);
    const ax = wind ? ferg.cdx : ferg.aimX, ay = wind ? ferg.cdy : ferg.aimY;
    const x0 = ferg.x + ax * 100, y0 = ferg.y + 20 + ay * 60;
    const x1 = ferg.x + ax * reach, y1 = ferg.y + 20 + ay * reach;
    const hot = wind || fury >= 1;
    const col = hot ? '#ff6b4a' : '#fff6dc';
    g.save();
    g.lineCap = 'round';
    g.globalAlpha = hot ? 0.38 + Math.sin(tt * 12) * 0.08 : 0.3;
    g.strokeStyle = col;
    g.lineWidth = (P.radius + 70) * 2 * 0.8;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.globalAlpha = 1;
    g.lineWidth = 12;
    g.setLineDash([6, 26]);
    g.lineDashOffset = -tt * 120;
    g.strokeStyle = '#33241a';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 8;
    g.stroke();
    g.setLineDash([]);
    g.translate(x1, y1);
    g.rotate(Math.atan2(ay, ax));
    g.fillStyle = col;
    g.strokeStyle = '#33241a';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(44, 0); g.lineTo(-20, -36); g.lineTo(-8, 0); g.lineTo(-20, 36); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  // Speed lines behind a charging iceberg.
  function drawChargeTrail(g, tt) {
    g.save();
    g.strokeStyle = 'rgba(248,252,255,0.7)';
    g.lineWidth = 7;
    g.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const ox = -ferg.cdy * i * 45, oy = ferg.cdx * i * 28;
      const len = 120 + ((i + 2) * 53 + tt * 900) % 90;
      g.beginPath();
      g.moveTo(ferg.x + ox - ferg.cdx * 110, ferg.y + 30 + oy - ferg.cdy * 60);
      g.lineTo(ferg.x + ox - ferg.cdx * (110 + len), ferg.y + 30 + oy - ferg.cdy * (60 + len * 0.6));
      g.stroke();
    }
    g.restore();
  }

  function drawMeters(g) {
    // The fury bar, above the iceberg, while it huffs and rears back. (The sea
    // lions aboard are counted in the shell's HUD line and seen on the ledges.)
    const x = ferg.x, y = ferg.y - 385;
    g.save();
    if (ferg.mode === 'huff' || ferg.mode === 'windup') {
      const w = 300, hh = 44;
      const f = ferg.mode === 'windup' ? ferg.launchFury : ferg.fury;
      g.fillStyle = 'rgba(251,246,232,0.95)';
      g.strokeStyle = '#33241a';
      g.lineWidth = 5;
      roundRect(g, x - w / 2 - 8, y - hh / 2 - 8, w + 16, hh + 16, 20);
      g.fill(); g.stroke();
      g.fillStyle = '#e9dfc8';
      roundRect(g, x - w / 2, y - hh / 2, w, hh, 14);
      g.fill();
      const hot = f >= 1 && Math.sin(t * 14) > 0;
      g.fillStyle = f >= 1 ? (hot ? '#ff6b4a' : '#d9443d') : f > 0.6 ? '#e2873a' : '#7fb3d0';
      roundRect(g, x - w / 2, y - hh / 2, Math.max(14, w * f), hh, 14);
      g.fill();
      g.font = '800 30px Fraunces, Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 6;
      g.strokeStyle = 'rgba(251,246,232,0.9)';
      g.fillStyle = '#33241a';
      const label = f >= 1 ? 'FULL FURY!' : 'FURY';
      g.strokeText(label, x, y + 1);
      g.fillText(label, x, y + 1);
    }
    g.restore();
  }

  function seaLion(g, x, y, k, rot) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(k, k);
    g.fillStyle = '#9a6a3a';
    g.strokeStyle = '#33241a';
    g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 6, 24, 16, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(6, -14, 13, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#33241a';
    g.beginPath(); g.arc(10, -17, 2.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(17, -10, 5, 3.5, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function drawPart(g, p) {
    const k = p.t / p.life;
    g.save();
    if (p.k === 'mist' || p.k === 'steam') {
      g.globalAlpha = (1 - k) * (p.k === 'mist' ? 0.32 : 0.6);
      g.fillStyle = p.k === 'mist' ? '#eef6fb' : '#f6eef0';
      g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k), 0, Math.PI * 2); g.fill();
    } else if (p.k === 'chip') {
      g.globalAlpha = 1 - k;
      g.translate(p.x, p.y);
      g.rotate(p.spin * p.t * 3);
      g.fillStyle = '#eef3fb';
      g.strokeStyle = '#5b7a9a';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(-p.r, 0); g.lineTo(0, -p.r); g.lineTo(p.r, p.r * 0.4); g.closePath(); g.fill(); g.stroke();
    } else if (p.k === 'bubble') {
      g.globalAlpha = 1 - k;
      g.strokeStyle = '#f4fbfb';
      g.lineWidth = 3;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.stroke();
    } else if (p.k === 'lion' && p.t < p.life) {
      seaLion(g, p.x, p.y, 1, p.dir * p.t * 5);
    }
    g.restore();
  }

  return self;
}

// The opening hint: big ink type on a cream band across the top of the sea.
function hint(g, text, W, t) {
  const a = t > 4 ? 1 - (t - 4) : 1;
  g.save();
  g.globalAlpha = Math.max(0, a);
  g.fillStyle = 'rgba(251,246,232,0.93)';
  g.fillRect(0, 118, W, 70);
  g.fillStyle = '#33241a';
  g.fillRect(0, 118, W, 4); g.fillRect(0, 184, W, 4);
  g.font = '800 38px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, W / 2, 154);
  g.restore();
}

// A competent player's input for the next frame (scripts/chapter-check.mjs):
// gets in front of the Peg, huffs while closing in, leads the aim, and lets go
// when the boat is within the charge's reach.
export function autopilot(ch) {
  const s = ch._ap || (ch._ap = { held: false });
  const { ferg, peg } = ch;
  const F = TUNE.ferg;
  const dx = peg.x - ferg.x, dy = peg.y - ferg.y, d = Math.hypot(dx, dy);
  const ahead = { x: peg.x + Math.cos(peg.hd) * 180, y: peg.y + Math.sin(peg.hd) * 180 };
  let mx = ahead.x - ferg.x, my = ahead.y - ferg.y;
  let action = false;
  if (ferg.mode === 'drift' || ferg.mode === 'huff') {
    if (d < 560) action = true;
    if (ferg.mode === 'huff') {
      const sp = F.chargeMin + F.chargeAdd * ferg.fury;
      const lead = d / sp + F.windup;
      mx = peg.x + peg.vx * lead - ferg.x;
      my = peg.y + peg.vy * lead - ferg.y;
      const reach = chargeReach(ferg.fury);
      if ((ferg.fury >= 0.6 && d < reach * 0.7) || (ferg.fury >= 1 && d < reach * 0.85)) action = false;
    }
  }
  const m = Math.hypot(mx, my) || 1;
  const out = { x: mx / m, y: my / m, sprint: false, action, actionPressed: action && !s.held, actionReleased: !action && s.held };
  s.held = action;
  return out;
}

// The how-to-play page (chapters/index.js, "THE HOW-TO-PLAY PAGE"): three
// steps composed from the art until the pictures OM-H4a/b/c arrive.
const INK = '#33241a';
function foamLane(cg, pts, w) {
  cg.save();
  cg.lineCap = 'round'; cg.lineJoin = 'round';
  cg.strokeStyle = 'rgba(240,250,255,0.35)'; cg.lineWidth = w;
  cg.beginPath(); pts.forEach(([x, y], j) => (j ? cg.lineTo(x, y) : cg.moveTo(x, y))); cg.stroke();
  cg.restore();
}
function aimArrow(cg, x0, y0, x1, y1, col) {
  cg.save();
  cg.lineCap = 'round';
  cg.globalAlpha = 0.3; cg.strokeStyle = col; cg.lineWidth = 70;
  cg.beginPath(); cg.moveTo(x0, y0); cg.lineTo(x1, y1); cg.stroke();
  cg.globalAlpha = 1; cg.lineWidth = 8; cg.setLineDash([5, 18]); cg.strokeStyle = INK;
  cg.beginPath(); cg.moveTo(x0, y0); cg.lineTo(x1, y1); cg.stroke();
  cg.setLineDash([]);
  cg.translate(x1, y1); cg.rotate(Math.atan2(y1 - y0, x1 - x0));
  cg.fillStyle = col; cg.strokeStyle = INK; cg.lineWidth = 4;
  cg.beginPath(); cg.moveTo(34, 0); cg.lineTo(-14, -28); cg.lineTo(-6, 0); cg.lineTo(-14, 28); cg.closePath(); cg.fill(); cg.stroke();
  cg.restore();
}
export const HOWTO = [
  {
    text: 'Drift with the currents: the foam arrows show which way they run.',
    scene: 'scenes/iceferg', crop: [300, 480, 920, 690],
    items: [
      { draw: (cg) => foamLane(cg, [[40, 400], [200, 330], [400, 300], [620, 220]], 110) },
      { sprite: ['props.iceferg', 5], x: 120, y: 380, h: 90, ay: 0.5, rot: -0.35 },
      { sprite: ['props.iceferg', 5], x: 540, y: 250, h: 90, ay: 0.5, rot: -0.35 },
      { creature: 'iceferg', anim: 'drift', x: 330, y: 440, h: 270, shadow: false },
      { path: [[150, 470], [300, 470], [430, 420], [560, 330]], arrow: true },
    ],
  },
  {
    text: 'Hold the button to huff up your fury, aim at the Peg, and let go to charge!',
    scene: 'scenes/iceferg', crop: [560, 420, 920, 690],
    items: [
      { draw: (cg, t) => {
        cg.save(); cg.fillStyle = '#eef6fb';
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7 + t * 0.4, r = 26 + (i % 3) * 10;
          cg.globalAlpha = 0.45;
          cg.beginPath(); cg.arc(300 + Math.cos(a) * 150, 250 + Math.sin(a) * 90 - 40, r, 0, Math.PI * 2); cg.fill();
        }
        cg.restore();
      } },
      { draw: (cg) => aimArrow(cg, 400, 330, 610, 250, '#ff6b4a') },
      { creature: 'iceferg', anim: 'huff', x: 280, y: 450, h: 300, shadow: false },
      { word: 'HUFF!', x: 150, y: 140, size: 52 },
    ],
  },
  {
    text: 'Charge into the Peg before it gets to the harbour. SCRUNCH!',
    scene: 'scenes/iceferg', crop: [980, 40, 920, 690],
    items: [
      { sprite: ['props.iceferg', 6], x: 430, y: 390, h: 150, ay: 0.5 },
      { sprite: ['props.iceferg', 1], x: 470, y: 330, h: 190, ay: 0.5, rot: -0.3 },
      { creature: 'iceferg', anim: 'charge', x: 230, y: 470, h: 280, shadow: false },
      { word: 'SCRUNCH!', x: 380, y: 110, size: 56 },
    ],
  },
];

// Kart Dash: kart physics, items and the computer driver. Pure, no DOM.
//
// A kart is a plain object (see newKart). Every player simulates their own
// kart with stepKart at a fixed step and publishes it; the owner also drives
// the computer karts. Speeds are metres per second, angles radians, heading
// h is the driving direction in the world's x (east) / z (south) plane.

import { locate, advance, lapOf, pointAt, wrapAngle, WORLD, LAPS } from './track.js';

export const VMAX = 27;
export const OFFROAD = 11;
export const TURN = 2.0;
export const KART_R = 1.15;
export const SPIN_TIME = 1.25;
export const BOOST_TIME = 1.1;
export const STAR_TIME = 6;
export const BANANA_R = 1.5;
export const BOMB_FUSE = 1.6;
export const BOMB_R = 7.5;
export const ITEMS = ['boost', 'banana', 'bomb', 'star'];
export const ITEM_SLOTS = 2;
export const ROLL_TIME = 0.9;

export function newKart(spot, extra = {}) {
  return {
    x: spot.x, z: spot.z, h: spot.h, v: 0,
    steer: 0,            // smoothed steering, for the sprite
    drift: 0,            // -1 / 1 while drifting
    charge: 0,           // seconds of drift
    hop: 0,              // visual hop height (m)
    hopV: 0,
    spin: 0,             // seconds of spin-out left
    boost: 0,            // seconds of boost left
    star: 0,             // seconds of star left
    items: [],           // up to ITEM_SLOTS held items; items[0] is used next
    roll: 0,             // seconds the newest item is still rolling (the slot machine)
    total: spot.s ?? 0,  // metres along the track since the start line (negative on the grid)
    s: (spot.s ?? 0) < 0 ? 0 : spot.s ?? 0,
    hint: -1,
    d: 0,
    offroad: false,
    lapStart: 0,         // race time (s) the current lap started
    lapTimes: [],
    finished: 0,         // race time (s) when finished, 0 while racing
    ...extra,
  };
}

// Steps one kart by dt seconds. input = { steer -1..1, drift bool, brake bool }.
// env = { track, obstacles (grid with near()), pads, raceTime, laps }.
// Returns a list of events: 'bump', 'mini', 'super', 'pad', 'lap', 'finish'.
export function stepKart(k, input, dt, env) {
  const { track } = env;
  const ev = [];
  const steerIn = k.spin > 0 ? 0 : Math.max(-1, Math.min(1, input.steer || 0));
  k.steer += (steerIn - k.steer) * Math.min(1, dt * 10);

  // Drifting: hold drift while turning at speed. Turning into the drift is
  // tight, turning out of it wide; the longer it lasts, the bigger the boost
  // when it's let go.
  if (k.spin <= 0 && input.drift && !k.drift && Math.abs(steerIn) > 0.3 && k.v > 12) {
    k.drift = Math.sign(steerIn);
    k.charge = 0;
    k.hopV = 4;
  }
  if (k.drift && (!input.drift || k.v < 9 || k.spin > 0)) {
    if (k.spin <= 0 && k.charge > 0.9) {
      const big = k.charge > 1.9;
      k.boost = Math.max(k.boost, big ? BOOST_TIME : 0.6);
      ev.push(big ? 'super' : 'mini');
    }
    k.drift = 0;
    k.charge = 0;
  }
  if (k.drift) k.charge += dt * (Math.sign(steerIn) === k.drift ? 1.25 : 0.7);

  // Speed.
  const where = locate(track, k.x, k.z, k.hint);
  if (k.hint < 0) k.s = where.s;
  k.hint = where.i;
  k.d = where.d;
  k.offroad = Math.abs(where.d) > track.half + 0.4;
  let target = VMAX * (env.speedScale ?? 1);
  if (k.offroad && k.boost <= 0 && k.star <= 0) target = OFFROAD;
  if (k.star > 0) target = VMAX * 1.22;
  if (k.boost > 0) target = VMAX * 1.5;
  if (k.drift) target *= 0.97;
  if (k.spin > 0) {
    k.v *= Math.exp(-dt * 2.8);
  } else if (input.brake) {
    if (k.v > 0.5) k.v = Math.max(0, k.v - 28 * dt);
    else k.v = Math.max(-7, k.v - 9 * dt); // reverse out of trouble
  } else if (k.v < target) {
    k.v += (target - k.v) * (k.boost > 0 ? 4 : 0.9) * dt + 2.5 * dt;
    if (k.v > target) k.v = target;
  } else {
    k.v += (target - k.v) * (k.offroad ? 2.6 : 1.2) * dt;
  }

  // Boost pads.
  for (const p of env.pads || []) {
    let ds = where.s - p.s;
    if (ds < -track.length / 2) ds += track.length;
    if (ds >= 0 && ds < p.len && Math.abs(where.d - p.d) < p.w / 2 + 0.6) {
      if (k.boost < 0.5) ev.push('pad');
      k.boost = Math.max(k.boost, 0.9);
    }
  }

  // Turning: needs some speed, a little less grip at top speed.
  const grip = Math.min(1, Math.abs(k.v) / 9) * (1 - 0.18 * Math.min(1, Math.abs(k.v) / VMAX));
  let turn;
  if (k.drift) turn = k.drift * (0.62 + 0.55 * Math.max(-1, Math.min(1, steerIn * k.drift))) * TURN * 1.05;
  else turn = steerIn * TURN * grip;
  if (k.v < 0) turn = -turn;
  if (k.spin <= 0) k.h = wrapAngle(k.h + turn * dt);

  // Move. A drifting kart slides outwards a little.
  const slide = k.drift ? -k.drift * 0.22 : 0;
  k.x += Math.cos(k.h + slide) * k.v * dt;
  k.z += Math.sin(k.h + slide) * k.v * dt;

  // Trees and tyre stacks.
  if (env.obstacles) {
    for (const o of env.obstacles.near(k.x, k.z)) {
      const r = (o.r ?? 1.3) + KART_R;
      const dx = k.x - o.x, dz = k.z - o.z, d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 1e-6) {
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
        k.x = o.x + nx * r;
        k.z = o.z + nz * r;
        const into = -(Math.cos(k.h) * nx + Math.sin(k.h) * nz);
        if (into > 0.2 && Math.abs(k.v) > 3) {
          k.v = k.v > 0 ? -Math.min(6, k.v * 0.3) : k.v * 0.3;
          ev.push('bump');
        }
      }
    }
  }
  k.x = Math.max(1, Math.min(WORLD - 1, k.x));
  k.z = Math.max(1, Math.min(WORLD - 1, k.z));

  // Timers.
  k.spin = Math.max(0, k.spin - dt);
  k.boost = Math.max(0, k.boost - dt);
  k.star = Math.max(0, k.star - dt);
  k.hopV -= 30 * dt;
  k.hop = Math.max(0, k.hop + k.hopV * dt);
  if (k.hop === 0) k.hopV = 0;

  // Progress and laps.
  const after = locate(track, k.x, k.z, k.hint);
  k.hint = after.i;
  if (!k.finished) {
    const laps = env.laps ?? LAPS;
    const before = lapOf(k.total, track.length, laps).done;
    k.total = advance(k.total, k.s, after.s, track.length);
    const now = lapOf(k.total, track.length, laps);
    if (now.done > before && env.raceTime != null) {
      k.lapTimes.push(env.raceTime - k.lapStart);
      k.lapStart = env.raceTime;
      if (now.finished) {
        k.finished = Math.max(0.001, env.raceTime);
        ev.push('finish');
      } else {
        ev.push('lap');
      }
    }
  }
  k.s = after.s;
  return ev;
}

// Pushes kart a out of kart b (only a moves: everyone moves their own kart).
// Returns true on contact.
export function bumpKarts(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z, d2 = dx * dx + dz * dz, r = KART_R * 2;
  if (d2 >= r * r || d2 < 1e-6) return false;
  const d = Math.sqrt(d2), push = (r - d) * 0.6;
  a.x += (dx / d) * push;
  a.z += (dz / d) * push;
  a.v *= 0.97;
  return true;
}

// Items: a kart holds up to ITEM_SLOTS. A box fills the next empty slot (and
// that slot rolls for ROLL_TIME); using one takes the first and the second
// moves up. Returns true if the item went in.
export function addItem(k, item, roll = ROLL_TIME) {
  if (!ITEMS.includes(item) || k.items.length >= ITEM_SLOTS) return false;
  k.items.push(item);
  k.roll = roll;
  return true;
}
// The first item can be used unless it is the one still rolling.
export function itemReady(k) {
  return k.items.length > 0 && !(k.roll > 0 && k.items.length === 1);
}
// Takes the first item (null if none is ready); the queued one moves up.
export function takeItem(k) {
  if (!itemReady(k)) return null;
  return k.items.shift();
}

// Touch steering, after Brick Kart: the steering finger steers by how far it
// has moved sideways from where it touched down. Full lock is TOUCH.lock of
// the screen's shorter side (clamped), with a small dead zone and a gentle
// curve; past full lock the anchor follows the finger, so turning back is
// instant. Dragging it TOUCH.brake of the screen height below the anchor
// brakes (reversing when slow) until it slides back up past half that; the
// anchor follows the finger upwards so "back up" is always relative.
export const TOUCH = { lock: 0.14, lockMin: 48, lockMax: 100, dead: 0.08, curve: 1.4, brake: 0.1, brakeMin: 48, brakeMax: 110, release: 0.5, smooth: 0.05 };
export const touchLock = (w, h) => Math.max(TOUCH.lockMin, Math.min(TOUCH.lockMax, Math.min(w, h) * TOUCH.lock));
export const touchBrake = (w, h) => Math.max(TOUCH.brakeMin, Math.min(TOUCH.brakeMax, h * TOUCH.brake));
// d = { x0, y0, brake } (the anchor and whether it was braking); (x, y) the
// finger now; w, h the screen. Returns the new { x0, y0, steer, brake }.
export function dragSteer(d, x, y, w, h) {
  const r = touchLock(w, h), b = touchBrake(w, h);
  let x0 = d.x0, y0 = d.y0;
  if (Math.abs(x - x0) > r) x0 = x - Math.sign(x - x0) * r;
  if (y < y0) y0 = y;
  const v = (x - x0) / r, a = Math.abs(v) > 0.999 ? 1 : Math.abs(v);   // (snap rounding at full lock)
  const steer = a <= TOUCH.dead ? 0 : Math.sign(v) * Math.pow((a - TOUCH.dead) / (1 - TOUCH.dead), TOUCH.curve);
  const dy = y - y0;
  const brake = d.brake ? dy > b * TOUCH.release : dy > b;
  return { x0, y0, steer, brake };
}

// A random item for a kart in place `rank` (0 = leading) of `count`: the
// leaders get more bananas and bombs, the back of the pack boosts and stars.
export function rollItem(rank, count, r = Math.random()) {
  const f = count > 1 ? Math.max(0, Math.min(1, rank / (count - 1))) : 0.5;
  const w = {
    boost: 20 + 22 * f,
    banana: 42 - 32 * f,
    bomb: 33 - 8 * f,
    star: 3 + 24 * f,
  };
  const sum = w.boost + w.banana + w.bomb + w.star;
  let x = r * sum;
  for (const k of ITEMS) {
    if ((x -= w[k]) < 0) return k;
  }
  return 'boost';
}

// Where a thrown bomb is t seconds after launch: it flies ahead, bouncing,
// slows to a stop and goes off at BOMB_FUSE. b = { x, z, h, v }.
export function bombAt(b, t) {
  const T = Math.min(t, BOMB_FUSE);
  const slow = 1.25;                      // seconds until it stops
  const tt = Math.min(T, slow);
  const dist = b.v * tt - (b.v / (2 * slow)) * tt * tt;
  const bounce = Math.abs(Math.sin(T * Math.PI * 2.4)) * 2.2 * Math.max(0, 1 - T / slow);
  return { x: b.x + Math.cos(b.h) * dist, z: b.z + Math.sin(b.h) * dist, y: bounce + 0.6, done: t >= BOMB_FUSE };
}

// Rank karts: finished first by finish time, then by distance driven. A kart
// that joined late times its race from its own start, `start` seconds after
// the main start, so finishers are compared by when they actually crossed.
export function standings(list) {
  return [...list].sort((a, b) => {
    if (a.finished && b.finished) return a.finished + (a.start || 0) - (b.finished + (b.start || 0));
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.total - a.total;
  });
}

// A kart's best lap. A late joiner's first lap starts wherever they were put
// on the track (k.partial), so it doesn't count.
export function bestLap(k) {
  const laps = k.partial ? k.lapTimes.slice(1) : k.lapTimes;
  return laps.length ? Math.min(...laps) : 0;
}

// Joining a race already under way: a kart and a short countdown of their
// own, unless the race is nearly over. LATE.count is that countdown (ms);
// LATE.closeLeft the seconds before the end when the next race is nearer.
export const LATE = { count: 4000, closeLeft: 15, pace: 24, maxTime: 600 };
// o = { raceTime (s since GO), firstFinish (s, Infinity if nobody has
// finished), leadTotal (metres the leader has driven), length (of a lap) }.
export function lateJoinOpen({ raceTime, firstFinish = Infinity, leadTotal = 0, length, laps = LAPS }) {
  if (!(raceTime >= 0) || Number.isFinite(firstFinish)) return false;
  if (LATE.maxTime - raceTime < LATE.closeLeft) return false;
  const left = (laps * length - Math.max(0, leadTotal)) / LATE.pace;
  return left >= LATE.closeLeft;
}

// The computer driver (and the debug bots' autopilot): follows the track a
// little to one side of the centre, wobbling, drifting through tight bends.
// brain = { lane, phase, skill } (kept per kart). Returns an input.
export function autopilot(k, track, brain, t) {
  const ahead = 7 + Math.max(0, k.v) * 0.55;
  const lane = Math.max(-track.half + 2.5, Math.min(track.half - 2.5, brain.lane + Math.sin(t * 0.7 + brain.phase) * 2.2));
  const p = pointAt(track, k.s + ahead, lane);
  const want = Math.atan2(p.z - k.z, p.x - k.x);
  const err = wrapAngle(want - k.h);
  // Curvature over the next stretch decides drifting and braking.
  const i0 = Math.floor((k.s + 6) / track.step), i1 = Math.floor((k.s + 26) / track.step);
  let bend = 0;
  for (let i = i0; i <= i1; i += 4) bend += track.curv[((i % track.n) + track.n) % track.n];
  bend /= Math.max(1, Math.floor((i1 - i0) / 4) + 1);
  const steer = Math.max(-1, Math.min(1, err * 2.6 + Math.sin(t * 3.1 + brain.phase) * 0.12 * (1 - brain.skill)));
  const drift = brain.skill > 0.4 && Math.abs(bend) > 1 / 38 && k.v > 14 && Math.sign(bend) === Math.sign(steer);
  const brake = Math.abs(err) > 1.3 && k.v > 8;
  // Stuck against something: back up for a moment.
  if (brain.stuck > 1.2) return { steer: -steer, drift: false, brake: true };
  return { steer, drift: drift || (k.drift !== 0 && Math.abs(bend) > 1 / 60), brake };
}

// Keeps a brain's "stuck" timer: seconds spent slow while racing.
export function watchStuck(brain, k, dt) {
  if (Math.abs(k.v) < 3 && k.spin <= 0) brain.stuck = (brain.stuck || 0) + dt;
  else if (brain.stuck > 1.2 && brain.stuck < 2.2) brain.stuck += dt;
  else brain.stuck = 0;
  if (brain.stuck > 2.2) brain.stuck = 0;
}

// Packs a kart for the network: [x, z, h, v, flags, total, finished].
// flags: 1 spin, 2 boost, 4 star, 8 drifting, 16 drifting right, 32 charged,
// 64 super charged.
export function packKart(k) {
  const fl = (k.spin > 0 ? 1 : 0) | (k.boost > 0 ? 2 : 0) | (k.star > 0 ? 4 : 0) | (k.drift ? 8 : 0) |
    (k.drift > 0 ? 16 : 0) | (k.charge > 0.9 ? 32 : 0) | (k.charge > 1.9 ? 64 : 0);
  const r = (v, m) => Math.round(v * m) / m;
  return [r(k.x, 100), r(k.z, 100), r(k.h, 1000), r(k.v, 10), fl, r(k.total, 10), r(k.finished, 1000)];
}

// Checks and unpacks a kart from the network; null if it isn't valid.
export function unpackKart(a) {
  if (!Array.isArray(a) || a.length !== 7 || !a.every(Number.isFinite)) return null;
  const [x, z, h, v, fl, total, finished] = a;
  if (x < -10 || x > WORLD + 10 || z < -10 || z > WORLD + 10) return null;
  return {
    x, z, h: wrapAngle(h), v: Math.max(-10, Math.min(60, v)), fl: fl | 0,
    total: Math.max(-100, Math.min(1e5, total)), finished: Math.max(0, Math.min(3600, finished)),
  };
}

// Baseball: a top-down tabletop baseball board, after the Japanese toy
// (Epoch's "Yakyūban") and the pinball baseball arcades. The pitcher rolls
// the ball from the mound down a groove to home plate; the batter's bat is a
// spring-loaded flipper pivoting beside the plate. Press and hold to pull it
// back against the spring (the further back, the faster it swings), release
// to let it fly round. Where the bat meets the ball decides where it goes: an
// early swing meets it in front of the plate and pulls it to left field, a
// late one meets it behind and sends it the opposite way, a full pull drives
// it to the wall, a tap bunts it. The ball then rolls across the board,
// bounces off the wall, the rails and the little fielders, and drops into a
// pocket: OUT, 1B, 2B, 3B, or the HOME RUN pocket that slides along the
// wall. The labels change as the game goes on: every half-inning the board is
// dealt fresh, every batter a few pockets swap and a bonus pocket lights up
// (a lit 2B counts as a 3B). A ball that stops on open turf is fielded by the
// nearest fielder (out if they're close, a hit if not); one that bangs into
// the wall hard enough hops it for a home run. A pitch can be a fastball, a
// slow ball, a curve either way, or once an inning the vanishing pitch, which
// drops under the board near the plate and pops up behind it.
//
// Two teams: players alternate between them in the order they join (alone,
// the other team is the computer). The batting team sends its players up in
// turn; the fielding team's pitcher rotates each half-inning. Everyone sees
// the same board, the batter's face at home plate and the pitcher's on the
// mound; whoever isn't up watches and sees when they're on deck.
//
// The board is in board units: the width is 1, the height 16/9 (the shape of
// the 1080 x 1920 board picture, so an x in units is x * 1080 px in the art
// and a y is y * 1080 px), x to the right, y down, home plate near the bottom.
//
// Authority: the pitcher sends the pitch { n, type, seed, lead }; its path is
// a pure function of time, so everyone rolls the same pitch. The batter's
// client knows its own bat exactly, so it alone finds the contact (pure
// findContact over 1 ms steps) and sends the launch { x, y, vx, vy, s, t }.
// From a launch the roll is a fixed-step simulation using only + - * / and
// sqrt (bit-for-bit the same in every browser), so every client rolls the
// ball into the same pocket. The owner validates, rolls it too, records the
// outcome in shared state, and applies it to the count, bases and score once
// the ball has settled. Shared state holds everything a late joiner needs.

import { ordinal } from '../js/seatqueue.js';

// --- the board ---------------------------------------------------------------
// Measured off the delivered board picture (bb2-board, 1080 x 1920): a pixel
// (px, py) is (px / 1080, py / 1080) in board units.
export const BW = 1;
export const BH = 16 / 9;
export const BR = 0.016;                       // ball radius
const BR_HIT = BR * 1.3;                       // its size as drawn, for the bat
export const HOME = { x: 0.5, y: 1.412 };      // middle of home plate
export const APEX = { x: 0.5, y: 1.444 };      // where the foul lines meet, at the back of the plate
export const FOUL_K = 1.123;                   // the foul lines: K |x - 0.5| = APEX.y - y
export const MOUND = { x: 0.5, y: 1.074 };
export const PITCHER_R = 0.045;                // the pitcher's bubble on the mound
export const BASES = [{ x: 0.839, y: 1.02 }, { x: 0.5, y: 0.776 }, { x: 0.161, y: 1.02 }];
export const WALL = { x: 0.5, y: 1.175, r: 1.0 };   // the outfield wall: a wide arc, its face 0.175 down in the middle
export const SIDE = 0.02;                      // the tin rim at x = SIDE and 1 - SIDE
export const RAIL_Y = 1.02;                    // past the bases the foul lines are rails
export const CATCH_Y = 1.56;                   // a pitch this far down is in the catcher's mitt
export const PLATE_HALF = 0.05;
// The bat's pivot, beside and a little behind the plate: the bat squares up
// over the plate, so letting go as the ball arrives hits it straight away (and
// a fair hit any time from a quarter second early to a moment late).
export const PIVOT = { x: 0.36, y: 1.48 };
export const BAT_L = 0.2;
export const BAT_W = 0.011;                    // half the barrel's thickness
export const FIELDER_R = 0.03;
export const REACH = 0.08;                     // an outfielder gets to a ball this close
export const REACH_IN = 0.11;                  // and an infielder

// The fielders, on the grass. The little figures are obstacles; the pitcher
// (a face bubble on the mound) and the catcher only field the ball, it rolls
// past them.
export const FIELDERS = [
  { id: 'P', x: MOUND.x, y: MOUND.y, r: PITCHER_R, soft: true },
  { id: '1B', x: 0.735, y: 1.075, r: FIELDER_R },
  { id: '2B', x: 0.615, y: 0.955, r: FIELDER_R },
  { id: 'SS', x: 0.385, y: 0.955, r: FIELDER_R },
  { id: '3B', x: 0.265, y: 1.075, r: FIELDER_R },
  { id: 'LF', x: 0.2, y: 0.55, r: FIELDER_R },
  { id: 'CF', x: 0.5, y: 0.4, r: FIELDER_R },
  { id: 'RF', x: 0.8, y: 0.55, r: FIELDER_R },
];
export const CATCHER = { x: 0.5, y: 1.6 };      // behind the plate, clear of the swinging bat

// Pockets: ten fixed ones in groups (their labels are dealt per group) and
// the home run pocket that slides along the wall (slot 10).
export const POCKETS = [
  { x: 0.645, y: 1.135, r: 0.032, g: 'i' },
  { x: 0.355, y: 1.135, r: 0.032, g: 'i' },
  { x: 0.5, y: 0.93, r: 0.032, g: 'i' },
  { x: 0.25, y: 0.71, r: 0.036, g: 'm' },
  { x: 0.75, y: 0.71, r: 0.036, g: 'm' },
  { x: 0.5, y: 0.56, r: 0.036, g: 'm' },
  { x: 0.085, y: 0.76, r: 0.036, g: 'c' },
  { x: 0.915, y: 0.76, r: 0.036, g: 'c' },
  { x: 0.3, y: 0.41, r: 0.038, g: 'd' },
  { x: 0.7, y: 0.41, r: 0.038, g: 'd' },
];
export const SLOTS = POCKETS.length;           // fixed slots; the slider is slot SLOTS
export const SLIDER_R = 0.045;
// The slider's track, just inside the wall (written out so every browser has
// exactly the same numbers; 0.94 from the wall's centre, -114 to -66 deg).
const TRACK = [
  [0.1177, 0.3163], [0.1785, 0.2917], [0.2409, 0.2714], [0.3046, 0.2555], [0.3692, 0.2441],
  [0.4344, 0.2373], [0.5, 0.235], [0.5656, 0.2373], [0.6308, 0.2441], [0.6954, 0.2555],
  [0.7591, 0.2714], [0.8215, 0.2917], [0.8823, 0.3163],
];
export const SLIDE_SPEED = 0.32;               // track lengths per second while a pitch is on

export function pingpong(v) {
  const p = v - 2 * Math.floor(v / 2);
  return p > 1 ? 2 - p : p;
}
// Where the slider is for u in 0..1.
export function sliderPos(u) {
  const f = Math.max(0, Math.min(1, u)) * (TRACK.length - 1);
  const i = Math.min(TRACK.length - 2, Math.floor(f));
  const k = f - i;
  return { x: TRACK[i][0] + (TRACK[i + 1][0] - TRACK[i][0]) * k, y: TRACK[i][1] + (TRACK[i + 1][1] - TRACK[i][1]) * k };
}
// The slider moves from su while a pitch is on: windup (lead ms) then flight (t s).
export const sliderU = (su, lead, t) => pingpong(su + SLIDE_SPEED * (lead / 1000 + t));
export const fair = (x, y) => FOUL_K * Math.abs(x - 0.5) <= APEX.y - y;

// A small deterministic random generator (integer maths only).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- pitches -------------------------------------------------------------------
export const PITCH_Y0 = MOUND.y + 0.075;      // the ball leaves the front of the mound, into the groove
export const TYPES = {
  fast: { name: 'Fastball', v: 0.75, short: 'Fast' },
  slow: { name: 'Slow ball', v: 0.39, short: 'Slow' },
  curveL: { name: 'Curveball', v: 0.54, side: -1, short: 'Curve ◀' },
  curveR: { name: 'Curveball', v: 0.54, side: 1, short: 'Curve ▶' },
  vanish: { name: 'Vanishing pitch', v: 0.57, vanish: true, short: 'Vanish' },
};
export const TYPE_IDS = Object.keys(TYPES);
export const HATCH = [HOME.y - 0.13, HOME.y - 0.01];           // where the vanishing pitch is under the board

export function makePitch(type, seed) {
  const k = TYPES[type] || TYPES.fast;
  const r = rng(seed)();
  const T = (HOME.y - PITCH_Y0) / k.v;
  let off = 0, D = 0;
  if (k.side) D = k.side * (0.015 + 0.025 * r);
  else off = (r - 0.5) * 0.024;
  return { type: TYPES[type] ? type : 'fast', seed, v: k.v, T, off, D, vanish: !!k.vanish, end: (CATCH_Y - PITCH_Y0) / k.v };
}
// The pitch t seconds after it leaves the mound (t < 0: still in the pitcher's hand).
export function pitchAt(p, t) {
  const tt = Math.max(0, t);
  const tau = tt / p.T;
  const y = PITCH_Y0 + p.v * tt;
  const x = 0.5 + p.off + p.D * (2 * tau * tau - tau);
  const vx = p.D * (4 * tau - 1) / p.T;
  const under = p.vanish && y > HATCH[0] && y < HATCH[1];
  return { x, y, vx, vy: p.v, under, held: t < 0 };
}
// Over the plate (a strike when not swung at)?
export function inZone(p) {
  return Math.abs(pitchAt(p, p.T).x - 0.5) <= PLATE_HALF + BR * 0.5;
}

// --- the bat -------------------------------------------------------------------
// The bat's angle th: its direction from the pivot is (cos th, sin th) with y
// down, so th = 0 points straight across the plate. At rest it points back
// towards the catcher; holding pulls it further back against a spring; on
// release the spring drives it round (th falling) through the plate to a
// stop over the batter's front shoulder.
export const TH_REST = 0.95;
export const PULL_MAX = 1.2;
export const PULL_MIN = 0.06;
export const PULL_RATE = 2.6;                  // rad/s while held
export const TH_END = -1.75;
// Stiff, like the toy's flipper: let go and the bat is round to the plate in
// well under a tenth of a second.
const SPRING_K = 600;
const PRELOAD = 0.35;
const BAT_DRAG = 3;                            // rad/s² once the spring lets go
export const SWING_MS = 1200;                  // longest a swing can last

export const pullFor = holdMs => Math.max(PULL_MIN, Math.min(PULL_MAX, (holdMs / 1000) * PULL_RATE));
export const holdFor = pull => (Math.max(PULL_MIN, Math.min(PULL_MAX, pull)) / PULL_RATE) * 1000;
// Angular speed as the bat passes its rest angle, for a pull.
export const swingSpeed = pull => Math.sqrt(SPRING_K * ((pull + PRELOAD) * (pull + PRELOAD) - PRELOAD * PRELOAD));

// The swing's angle and angular velocity at every millisecond from release.
export function makeSwing(pull) {
  const d = Math.max(PULL_MIN, Math.min(PULL_MAX, pull));
  const th = [], om = [];
  let a = TH_REST + d, w = 0, done = -1;
  const dt = 0.001;
  for (let i = 0; i < SWING_MS; i++) {
    th.push(a);
    om.push(w);
    if (done >= 0) continue;
    const acc = a > TH_REST ? -SPRING_K * (a - (TH_REST - PRELOAD)) : BAT_DRAG;
    w += acc * dt;
    a += w * dt;
    if (a <= TH_END) { a = TH_END; w = 0; done = i + 1; }
    else if (a <= TH_REST && w >= 0) { w = 0; done = i + 1; }
  }
  return { pull: d, th, om, done: done < 0 ? SWING_MS : done };
}
export const swingAt = (sw, ms) => {
  const i = Math.max(0, Math.min(SWING_MS - 1, Math.floor(ms)));
  return { th: sw.th[i], om: sw.om[i], done: i >= sw.done };
};

// How lively the bat is along its length: the sweet spot is near the barrel.
export const batE = r => Math.max(0.12, Math.min(0.5, 0.5 - 30 * (r - 0.14) * (r - 0.14)));
export const VMAX = 2.75;
// Hits ease towards VMAX rather than stopping dead at it, so a harder swing
// still hits harder.
const VSOFT = 5.6;
const SPIN_K = 0.35, SPIN_MAX = 1.6;
const AIM_GAIN = 1.3;

// The ball (centre b, velocity v) against the bat at angle th turning at om:
// null when they don't touch or are parting, otherwise the ball's new velocity
// and spin. The bat is much heavier, so it carries on.
export function batHit(b, v, th, om) {
  const c = Math.cos(th), s = Math.sin(th);
  const rx = b.x - PIVOT.x, ry = b.y - PIVOT.y;
  const along = Math.max(0, Math.min(BAT_L, rx * c + ry * s));
  const px = PIVOT.x + c * along, py = PIVOT.y + s * along;
  let nx = b.x - px, ny = b.y - py;
  const d = Math.hypot(nx, ny);
  // The ball as drawn (a little bigger than it rolls): if they touch on screen, they touch.
  if (d >= BR_HIT + BAT_W) return null;
  if (d < 1e-9) { nx = Math.sin(th) * -Math.sign(om || -1); ny = -Math.cos(th) * -Math.sign(om || -1); }
  else { nx /= d; ny /= d; }
  // The bat's surface velocity where they touch.
  const ux = -s * along * om, uy = c * along * om;
  const rvx = v.x - ux, rvy = v.y - uy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return null;
  const e = batE(along);
  const tx = -ny, ty = nx;
  const vt = rvx * tx + rvy * ty;
  let ox = ux + rvx - (1 + e) * vn * nx - 0.12 * vt * tx;
  let oy = uy + rvy - (1 + e) * vn * ny - 0.12 * vt * ty;
  // Widened a little (about the straight-away line) so timing reaches the
  // corners: letting go as the ball arrives still hits it straight away.
  { const a = Math.atan2(ox, -oy) * AIM_GAIN, m = Math.sqrt(ox * ox + oy * oy); ox = Math.sin(a) * m; oy = -Math.cos(a) * m; }
  const sp = Math.hypot(ox, oy);
  { const k = sp > 1e-9 ? (VMAX * Math.tanh(sp / VSOFT)) / sp : 1; ox *= k; oy *= k; }
  const spin = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, SPIN_K * vt));
  return { vx: ox, vy: oy, s: spin, along, e };
}

const r4 = v => Math.round(v * 1e4) / 1e4;
// Swinging with `pull`, released tRel seconds after the pitch left the mound:
// the launch at the first touch, or null for a miss. Pure: the batter's
// client works it out the moment they let go.
export function findContact(p, pull, tRel) {
  const sw = makeSwing(pull);
  const start = Math.ceil(Math.max(0, -tRel) * 1000);
  for (let i = start; i < sw.done; i++) {
    const t = tRel + i / 1000;
    if (t > p.end) break;
    const b = pitchAt(p, t);
    if (b.under || b.held) continue;
    if (b.y > HOME.y + 0.08) break;           // gone past the plate: too late to hit, a miss (not a foul)
    const h = batHit(b, { x: b.vx, y: b.vy }, sw.th[i], sw.om[i]);
    if (h) {
      return { ms: i, t: Math.round(t * 1000) / 1000, th: sw.th[i], along: h.along,
        L: { x: r4(b.x), y: r4(b.y), vx: r4(h.vx), vy: r4(h.vy), s: r4(h.s), t: Math.round(t * 1000) / 1000 } };
    }
  }
  return null;
}
// Does a swing released at tRel overlap the pitch's flight (so it counts)?
export const swingCounts = (p, pull, tRel) => tRel + makeSwing(pull).done / 1000 > 0 && tRel < p.end;

// --- the roll ------------------------------------------------------------------
export const ROLL_DT = 1 / 240;
const MU = 1.8;                                // rolling friction, units/s²
const DRAG = 0.1;                              // and a little drag, 1/s
const SPIN_DECAY = 1.6;
const WALL_E = 0.5, RAIL_E = 0.55, FIELDER_E = 0.35;
export const V_OVER = 0.9;                     // into the wall this fast and it hops over
const V_CAP = 1.3;                             // a pocket catches a ball slower than this
const HOLE_PULL = 9;
const RAIL_NX = 0.7468219712063605, RAIL_NY = 0.6650240171027253;   // the foul lines' unit normal
const ROLL_STEPS = 2400;

// Rolls a launch to its end: { end: 'pocket'|'over'|'foul'|'stop', slot, x, y,
// steps, path } where path holds x, y every other step (for drawing).
export function roll(L, su = 0, lead = 0) {
  const sp0 = sliderPos(sliderU(su, lead, L.t));
  const holes = POCKETS.map(p => ({ x: p.x, y: p.y, r: p.r })).concat([{ x: sp0.x, y: sp0.y, r: SLIDER_R }]);
  let x = L.x, y = L.y, vx = L.vx, vy = L.vy, s = L.s;
  let wasFair = fair(x, y), went = 0, touched = false;
  const path = [x, y];
  const out = (end, extra = {}) => ({ end, x, y, steps: i, path, ...extra });
  let i = 0;
  for (; i < ROLL_STEPS; i++) {
    const sp = Math.sqrt(vx * vx + vy * vy);
    if (sp < MU * ROLL_DT * 1.5) {
      vx = 0; vy = 0;
      // Settled: foul if it stopped in foul ground.
      if (!fair(x, y)) return out('foul');
      return out('stop');
    }
    let ax = -s * vy, ay = s * vx;
    const f = MU / sp + DRAG;
    ax -= f * vx; ay -= f * vy;
    // Pockets pull the ball in a little; a slow one drops.
    for (let j = 0; j < holes.length; j++) {
      const h = holes[j];
      const dx = h.x - x, dy = h.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < h.r * h.r) {
        const d = Math.sqrt(d2);
        if (d < h.r - BR * 0.5 && sp < V_CAP) return out('pocket', { slot: j, x: h.x, y: h.y });
        ax += HOLE_PULL * dx / h.r; ay += HOLE_PULL * dy / h.r;
      }
    }
    vx += ax * ROLL_DT; vy += ay * ROLL_DT;
    // Friction can't push it backwards.
    if (vx * (vx - ax * ROLL_DT) + vy * (vy - ay * ROLL_DT) < 0) { vx = 0; vy = 0; }
    x += vx * ROLL_DT; y += vy * ROLL_DT;
    went += sp * ROLL_DT;
    s -= s * SPIN_DECAY * ROLL_DT;
    // The outfield wall.
    if (y < WALL.y) {
      const dx = x - WALL.x, dy = y - WALL.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > WALL.r - BR) {
        const nx = dx / d, ny = dy / d;
        const vn = vx * nx + vy * ny;
        if (vn > 0) {
          if (vn > V_OVER && wasFair) return out('over');
          vx -= (1 + WALL_E) * vn * nx; vy -= (1 + WALL_E) * vn * ny;
        }
        x = WALL.x + nx * (WALL.r - BR); y = WALL.y + ny * (WALL.r - BR);
      }
    }
    if (x < SIDE + BR) { x = SIDE + BR; if (vx < 0) vx = -vx * WALL_E; }
    if (x > 1 - SIDE - BR) { x = 1 - SIDE - BR; if (vx > 0) vx = -vx * WALL_E; }
    if (y > BH - BR) return out('foul');
    // Fielders.
    for (let j = 0; j < FIELDERS.length; j++) {
      const fl = FIELDERS[j];
      if (fl.soft) continue;
      const dx = x - fl.x, dy = y - fl.y;
      const rr = fl.r + BR;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 1e-9;
        const nx = dx / d, ny = dy / d;
        const vn = vx * nx + vy * ny;
        if (vn < 0) { vx -= (1 + FIELDER_E) * vn * nx; vy -= (1 + FIELDER_E) * vn * ny; s = 0; }
        touched = true;
        x = fl.x + nx * rr; y = fl.y + ny * rr;
      }
    }
    // The foul lines: in the infield crossing one is a foul ball; past the
    // bases, or once a fielder has touched it, they are rails that keep a
    // fair ball fair.
    const isFair = fair(x, y);
    if (isFair) wasFair = true;
    else if (wasFair && (y < RAIL_Y || touched) && y < APEX.y) {
      const left = x < 0.5;
      const nx = left ? RAIL_NX : -RAIL_NX, ny = -RAIL_NY;
      const g = (APEX.y - y) - FOUL_K * Math.abs(x - 0.5);   // < 0 outside
      const back = -g * RAIL_NY + 1e-4;
      x += nx * back; y += ny * back;
      const vn = vx * nx + vy * ny;
      if (vn < 0) { vx -= (1 + RAIL_E) * vn * nx; vy -= (1 + RAIL_E) * vn * ny; }
    } else if (wasFair || went > 0.12 || y > APEX.y + 0.1) return out('foul');
    if (i % 2 === 1) path.push(x, y);
  }
  return out(fair(x, y) ? 'stop' : 'foul');
}

// --- pocket labels -------------------------------------------------------------
// One letter per fixed slot: O out, 1 single, 2 double, 3 triple, H home run.
export const LABEL = { O: 'OUT', 1: '1B', 2: '2B', 3: '3B', H: 'HR' };
export const LONG = { O: 'OUT', 1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', H: 'HOME RUN', F: 'FOUL', S: 'STRIKE', W: 'STRIKE', B: 'BALL' };
const POOLS = {
  i: [['O', 'O', '1'], ['O', 'O', 'O'], ['O', '1', 'O'], ['1', 'O', 'O']],
  m: [['1', '2', 'O'], ['1', '1', 'O'], ['2', '1', '1'], ['O', '1', '2']],
  c: [['2', '3'], ['3', '2'], ['O', '3'], ['3', 'O']],
  d: [['3', '2'], ['O', '3'], ['2', 'H'], ['H', 'O'], ['2', '3']],
};
const shuffle = (a, rand) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const groupSlots = g => POCKETS.map((p, i) => (p.g === g ? i : -1)).filter(i => i >= 0);
// A fresh board (each half-inning).
export function dealLabels(rand) {
  const pk = new Array(SLOTS).fill('O');
  for (const g of Object.keys(POOLS)) {
    const pool = shuffle(POOLS[g][Math.floor(rand() * POOLS[g].length)].slice(), rand);
    groupSlots(g).forEach((slot, k) => { pk[slot] = pool[k]; });
  }
  const s = pk.join('');
  return { pk: s, bonus: pickBonus(s, -1, rand) };
}
// The lit pocket: one hit pocket short of a home run, never the same twice running.
export function pickBonus(pk, old, rand) {
  const ok = [...pk].map((c, i) => ('123'.includes(c) && i !== old ? i : -1)).filter(i => i >= 0);
  return ok.length ? ok[Math.floor(rand() * ok.length)] : -1;
}
// Between batters: two pockets in the same group trade labels and the light moves.
export function nudgeLabels(pk, bonus, rand) {
  const a = [...pk];
  const groups = Object.keys(POOLS);
  for (let k = 0; k < 2; k++) {
    const slots = groupSlots(groups[Math.floor(rand() * groups.length)]);
    const i = slots[Math.floor(rand() * slots.length)];
    let j = slots[Math.floor(rand() * slots.length)];
    if (j === i) j = slots[(slots.indexOf(i) + 1) % slots.length];
    [a[i], a[j]] = [a[j], a[i]];
  }
  const s = a.join('');
  return { pk: s, bonus: pickBonus(s, bonus, rand) };
}
const UP = { 1: '2', 2: '3', 3: 'H' };
// The label a slot counts as (the slider is always a home run; the lit pocket goes up one).
export function slotLabel(pk, bonus, slot) {
  if (slot === SLOTS) return 'H';
  const c = pk[slot] || 'O';
  return slot === bonus && UP[c] ? UP[c] : c;
}
// What a finished roll is: H/3/2/1/O/F.
export function outcome(r, pk, bonus) {
  if (r.end === 'over') return 'H';
  if (r.end === 'foul') return 'F';
  if (r.end === 'pocket') return slotLabel(pk, bonus, r.slot);
  // Fielded: an out if someone is close, otherwise a hit (a double deep, a
  // triple if it dies by the wall).
  const near = nearestFielder(r.x, r.y);
  if (near.d < (r.y > BASES[1].y ? REACH_IN : REACH)) return 'O';
  return r.y < 0.29 ? '3' : r.y < 0.5 ? '2' : '1';
}
export function nearestFielder(x, y) {
  // The catcher pounces on anything that dribbles in front of the plate.
  // (sqrt, not hypot: the same answer in every browser.)
  const dist = (ax, ay) => Math.sqrt((x - ax) * (x - ax) + (y - ay) * (y - ay));
  let best = { id: 'C', d: dist(CATCHER.x, CATCHER.y) - 0.08 };
  for (const f of FIELDERS) {
    const d = dist(f.x, f.y) - (f.soft ? 0.01 : f.r);
    if (d < best.d) best = { id: f.id, d };
  }
  return best;
}

// --- the rules -----------------------------------------------------------------
export const CPU = 'cpu';
export const INNINGS = [1, 2, 3, 5];
const isId = v => typeof v === 'string' && v.length > 0 && v.length <= 64;

// Runners move up k bases (4: everyone home); moves say who went where
// (from 0 = the batter at home, 1-3 the bases; to 4 = scored).
export function advance(bases, k, batter) {
  const nb = [null, null, null], moves = [];
  let runs = 0;
  for (let i = 2; i >= 0; i--) {
    if (!bases[i]) continue;
    const to = i + 1 + k;
    moves.push({ id: bases[i], from: i + 1, to: Math.min(4, to) });
    if (to >= 4) runs++;
    else nb[to - 1] = bases[i];
  }
  moves.push({ id: batter, from: 0, to: Math.min(4, k) });
  if (k >= 4) runs++;
  else nb[k - 1] = batter;
  return { bases: nb, runs, moves };
}
// A walk: only forced runners move.
export function walk(bases, batter) {
  const nb = bases.slice(), moves = [];
  let runs = 0;
  let i = 0;
  while (i < 3 && nb[i]) i++;
  // Everyone from base i-1 down to first moves up one.
  if (i === 3) { runs = 1; moves.push({ id: nb[2], from: 3, to: 4 }); i = 2; }
  for (let j = i; j > 0; j--) { moves.push({ id: nb[j - 1], from: j, to: j + 1 }); nb[j] = nb[j - 1]; }
  nb[0] = batter;
  moves.push({ id: batter, from: 0, to: 1 });
  return { bases: nb, runs, moves };
}

// Teams follow the people here: leavers drop out, newcomers join the smaller
// team (team 0 on a tie), in join order.
export function syncTeams(teams, ids) {
  const here = new Set(ids);
  const t = [teams[0].filter(id => here.has(id)), teams[1].filter(id => here.has(id))];
  for (const id of ids) {
    if (t[0].includes(id) || t[1].includes(id)) continue;
    t[t[0].length <= t[1].length ? 0 : 1].push(id);
  }
  return t;
}
export const batterOf = (sh, team = sh.half) => (sh.teams[team].length ? sh.teams[team][sh.up[team] % sh.teams[team].length] : CPU);
export const pitcherOf = (sh, team = 1 - sh.half) => (sh.teams[team].length ? sh.teams[team][sh.pi[team] % sh.teams[team].length] : CPU);

export function newGame(ids, innings = 3, g = 1, rand = Math.random) {
  const teams = syncTeams([[], []], ids);
  const { pk, bonus } = dealLabels(rand);
  const sh = {
    v: 2, g, phase: 'ready', inns: innings, inn: 1, half: 0, outs: 0, b: 0, s: 0,
    score: [0, 0], line: [[0], []], bases: [null, null, null],
    teams, up: [0, 0], pi: [0, 0], bat: CPU, pit: CPU,
    pk, bonus, lay: 1, su: 0.5, vn: 1, pn: 0, pitch: null, play: null, last: null, over: null, st: {},
  };
  sh.bat = batterOf(sh);
  sh.pit = pitcherOf(sh);
  return sh;
}

const clone = o => JSON.parse(JSON.stringify(o));
// Applies a pitch's result (S W B F O 1 2 3 H) to the game. Pure but for rand
// (the labels). Returns the next shared state, with `last` describing it.
export function applyResult(sh0, res, rand = Math.random, extra = {}) {
  const sh = clone(sh0);
  const team = sh.half;
  const batter = sh.bat;
  let endAB = false, runs = 0, moves = [], call = res;
  const stat = id => (sh.st[id] = sh.st[id] || [0, 0, 0]);
  if (res === 'S' || res === 'W') {
    sh.s++;
    if (sh.s >= 3) { sh.outs++; endAB = true; call = 'K'; }
  } else if (res === 'B') {
    sh.b++;
    if (sh.b >= 4) { ({ bases: sh.bases, runs, moves } = walk(sh.bases, batter)); endAB = true; call = 'BB'; }
  } else if (res === 'F') {
    if (sh.s < 2) sh.s++;
  } else if (res === 'O') {
    sh.outs++; endAB = true;
  } else {
    const k = res === 'H' ? 4 : Number(res);
    ({ bases: sh.bases, runs, moves } = advance(sh.bases, k, batter));
    endAB = true;
    if (batter !== CPU) { stat(batter)[0]++; if (k === 4) stat(batter)[1]++; }
  }
  if (runs && batter !== CPU) stat(batter)[2] += runs;
  sh.score[team] += runs;
  sh.line[team][sh.inn - 1] = (sh.line[team][sh.inn - 1] || 0) + runs;
  sh.last = { n: sh.pn, res: call, runs, by: batter, moves, ...extra };
  sh.play = null;
  sh.pitch = null;
  sh.phase = 'ready';
  if (endAB) { sh.b = 0; sh.s = 0; sh.up[team]++; }
  // A walk-off in the last inning (or later).
  if (team === 1 && sh.inn >= sh.inns && sh.score[1] > sh.score[0]) return finish(sh, 1);
  if (sh.outs >= 3) return endHalf(sh, rand);
  if (endAB) {
    Object.assign(sh, nudgeLabels(sh.pk, sh.bonus, rand));
    sh.lay++;
    sh.bat = batterOf(sh);
  }
  return sh;
}
function finish(sh, winner) {
  sh.phase = 'over';
  sh.over = winner;
  return sh;
}
function endHalf(sh, rand) {
  sh.outs = 0; sh.b = 0; sh.s = 0;
  sh.bases = [null, null, null];
  sh.pi[1 - sh.half]++;
  if (sh.half === 0) {
    if (sh.inn >= sh.inns && sh.score[1] > sh.score[0]) return finish(sh, 1);
    sh.half = 1;
  } else {
    if (sh.inn >= sh.inns && sh.score[0] !== sh.score[1]) return finish(sh, sh.score[0] > sh.score[1] ? 0 : 1);
    if (sh.inn >= sh.inns + 3) return finish(sh, -1);
    sh.inn++;
    sh.half = 0;
  }
  if (sh.line[sh.half].length < sh.inn) sh.line[sh.half][sh.inn - 1] = 0;
  Object.assign(sh, dealLabels(rand));
  sh.lay++;
  sh.vn = 1;
  sh.bat = batterOf(sh);
  sh.pit = pitcherOf(sh);
  sh.last = { ...sh.last, side: true };
  return sh;
}

// --- validating messages and shared state ----------------------------------------
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const isNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

export function readPitchMsg(d) {
  if (!d || typeof d !== 'object') return null;
  if (!isInt(d.n, 1, 1e7) || !TYPE_IDS.includes(d.type) || !isInt(d.seed, 0, 2 ** 31) || !isInt(d.lead, 300, 2500)) return null;
  return { n: d.n, type: d.type, seed: d.seed, lead: d.lead };
}
export function readLaunch(L) {
  if (!L || typeof L !== 'object') return null;
  const ok = isNum(L.x, 0.25, 0.75) && isNum(L.y, HOME.y - 0.3, HOME.y + 0.2) && isNum(L.vx, -VMAX - 0.01, VMAX + 0.01)
    && isNum(L.vy, -VMAX - 0.01, VMAX + 0.01) && Math.hypot(L.vx, L.vy) <= VMAX + 0.01
    && isNum(L.s, -SPIN_MAX, SPIN_MAX) && isNum(L.t, 0, 6);
  return ok ? { x: L.x, y: L.y, vx: L.vx, vy: L.vy, s: L.s, t: L.t } : null;
}
// { n, L } for a hit, { n, miss: true, sw } for a miss.
export function readBatMsg(d) {
  if (!d || typeof d !== 'object' || !isInt(d.n, 1, 1e7)) return null;
  if (d.miss === true) return { n: d.n, miss: true, sw: d.sw === true };
  const L = readLaunch(d.L);
  return L ? { n: d.n, L } : null;
}
export function readSwingMsg(d) {
  if (!d || typeof d !== 'object' || !isInt(d.n, 0, 1e7)) return null;
  if (d.pull === undefined) return { n: d.n };
  return isNum(d.pull, 0, PULL_MAX) ? { n: d.n, pull: d.pull } : null;
}
const RES = ['S', 'W', 'B', 'F', 'O', '1', '2', '3', 'H'];
const readBases = b => (Array.isArray(b) && b.length === 3 ? b.map(v => (isId(v) ? v : null)) : [null, null, null]);
const readIds = a => (Array.isArray(a) ? a.filter(isId).slice(0, 32) : []);
const readLine = a => (Array.isArray(a) ? a.slice(0, 20).map(v => (isInt(v, 0, 999) ? v : 0)) : []);
export function readShared(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 2) return null;
  const phase = ['ready', 'pitch', 'play', 'over'].includes(raw.phase) ? raw.phase : 'ready';
  const sh = {
    v: 2, g: isInt(raw.g, 0, 1e7) ? raw.g : 1, phase,
    inns: INNINGS.includes(raw.inns) ? raw.inns : 3,
    inn: isInt(raw.inn, 1, 20) ? raw.inn : 1, half: raw.half === 1 ? 1 : 0,
    outs: isInt(raw.outs, 0, 3) ? raw.outs : 0, b: isInt(raw.b, 0, 4) ? raw.b : 0, s: isInt(raw.s, 0, 3) ? raw.s : 0,
    score: Array.isArray(raw.score) ? [0, 1].map(i => (isInt(raw.score[i], 0, 999) ? raw.score[i] : 0)) : [0, 0],
    line: Array.isArray(raw.line) ? [readLine(raw.line[0]), readLine(raw.line[1])] : [[], []],
    bases: readBases(raw.bases),
    teams: Array.isArray(raw.teams) ? [readIds(raw.teams[0]), readIds(raw.teams[1])] : [[], []],
    up: Array.isArray(raw.up) ? [0, 1].map(i => (isInt(raw.up[i], 0, 1e6) ? raw.up[i] : 0)) : [0, 0],
    pi: Array.isArray(raw.pi) ? [0, 1].map(i => (isInt(raw.pi[i], 0, 1e6) ? raw.pi[i] : 0)) : [0, 0],
    bat: isId(raw.bat) ? raw.bat : CPU, pit: isId(raw.pit) ? raw.pit : CPU,
    pk: typeof raw.pk === 'string' && new RegExp(`^[O123H]{${SLOTS}}$`).test(raw.pk) ? raw.pk : 'O'.repeat(SLOTS),
    bonus: isInt(raw.bonus, -1, SLOTS - 1) ? raw.bonus : -1,
    lay: isInt(raw.lay, 0, 1e7) ? raw.lay : 0,
    su: isNum(raw.su, 0, 1) ? raw.su : 0.5,
    vn: isInt(raw.vn, 0, 3) ? raw.vn : 0,
    pn: isInt(raw.pn, 0, 1e7) ? raw.pn : 0,
    pitch: readPitchMsg(raw.pitch),
    play: null, last: null,
    over: raw.over === 0 || raw.over === 1 || raw.over === -1 ? raw.over : null,
    st: {},
  };
  if (raw.play && typeof raw.play === 'object' && isInt(raw.play.n, 1, 1e7) && RES.includes(raw.play.res)) {
    const L = raw.play.L ? readLaunch(raw.play.L) : null;
    sh.play = { n: raw.play.n, res: raw.play.res, sw: raw.play.sw === true, L, slot: isInt(raw.play.slot, -1, SLOTS) ? raw.play.slot : -1, dur: isInt(raw.play.dur, 0, 20000) ? raw.play.dur : 1000 };
  }
  if (raw.last && typeof raw.last === 'object' && isInt(raw.last.n, 0, 1e7)) {
    const moves = Array.isArray(raw.last.moves) ? raw.last.moves.slice(0, 4).filter(m => m && isId(m.id) && isInt(m.from, 0, 3) && isInt(m.to, 1, 4)) : [];
    sh.last = { n: raw.last.n, res: typeof raw.last.res === 'string' ? raw.last.res.slice(0, 3) : '', runs: isInt(raw.last.runs, 0, 4) ? raw.last.runs : 0,
      by: isId(raw.last.by) ? raw.last.by : CPU, moves, side: raw.last.side === true };
  }
  if (raw.st && typeof raw.st === 'object') {
    for (const [id, v] of Object.entries(raw.st).slice(0, 64)) {
      if (isId(id) && Array.isArray(v) && v.length === 3 && v.every(x => isInt(x, 0, 9999))) sh.st[id] = v.slice();
    }
  }
  if (!sh.line[0].length) sh.line[0] = [0];
  return sh;
}

// --- the computer --------------------------------------------------------------
// A swing plan for a pitch: { pull, tRel } aiming for a solid hit somewhere
// fair, or null to take it. skill 0..1 adds less timing error.
export function planSwing(p, rand = Math.random, skill = 0.5) {
  if (!inZone(p) && rand() < 0.6) return null;
  const bunt = rand() < 0.08;
  const pull = bunt ? 0.12 : 0.55 + rand() * 0.65;
  let best = null;
  for (let tRel = -0.6; tRel < p.end; tRel += 0.01) {
    const c = findContact(p, pull, tRel);
    if (!c) continue;
    const ang = Math.atan2(c.L.vx, -c.L.vy);
    if (Math.abs(ang) > 0.7 || c.L.vy > 0) continue;
    const score = -Math.abs(ang + (rand() - 0.5) * 0.6) + Math.hypot(c.L.vx, c.L.vy) * 0.2;
    if (!best || score > best.score) best = { pull, tRel, score };
  }
  if (!best) return { pull, tRel: Math.max(-0.2, p.T - 0.25) };
  return { pull: best.pull, tRel: best.tRel + (rand() - 0.5) * (0.16 - skill * 0.12) };
}
export function cpuPitch(sh, rand = Math.random) {
  const r = rand();
  const type = sh.vn > 0 && r < 0.12 ? 'vanish' : r < 0.42 ? 'fast' : r < 0.6 ? 'slow' : r < 0.8 ? 'curveL' : 'curveR';
  return { type, seed: Math.floor(rand() * 2 ** 31), lead: 700 + Math.floor(rand() * 600) };
}

// --- the game -------------------------------------------------------------------
const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
const TEAM_COLORS = ['#ff5fa2', '#3fe0d0'];
const LABEL_COLORS = { O: '#ff5b5b', 1: '#ffffff', 2: '#5fe08a', 3: '#b994ff', H: '#ffd43b' };
const CROWD = ['#ff5fa2', '#3fe0d0', '#ffd43b', '#ffffff', '#ff8c42', '#9775fa', '#69db7c', '#e9ecef'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = t => 1 - (1 - t) * (1 - t);
const BASE_PT = [HOME, BASES[0], BASES[1], BASES[2], HOME];
const READY_AFK_MS = 20000;
const RESULT_HOLD_MS = 1300;

const STYLE = `
.bb-root { position:absolute; inset:0; overflow:hidden; background:#10162e; user-select:none; -webkit-user-select:none; }
.bb-pitch { position:absolute; display:none; grid-template-columns:1fr 1fr; gap:6px; pointer-events:auto; }
.bb-pitch button { font:800 var(--bb-fs,13px) ${FONT}; color:#fff; border:0; border-radius:12px; padding:0 6px; min-height:var(--bb-bh,38px);
  background:linear-gradient(#3b4fa8,#273578); box-shadow:0 3px 0 #141c45, inset 0 1px 0 rgba(255,255,255,.25); cursor:pointer; }
.bb-pitch button:active { transform:translateY(2px); box-shadow:0 1px 0 #141c45; }
.bb-pitch button:focus-visible { outline:3px solid #ffd43b; outline-offset:2px; }
.bb-pitch button[disabled] { opacity:.4; cursor:default; }
.bb-pitch button.wide { grid-column:1 / -1; background:linear-gradient(#7a3fd0,#4d2391); box-shadow:0 3px 0 #2a1155; }
.bb-pitch button.fast { background:linear-gradient(#e2404f,#a5202c); box-shadow:0 3px 0 #5c0f17; }
.bb-over { position:absolute; inset:0; display:none; align-items:center; justify-content:center; background:rgba(8,10,30,.55); }
.bb-card { background:#1d2350; border:2px solid #ffd43b; border-radius:18px; padding:16px 18px; color:#fff; text-align:center;
  font-family:${FONT}; max-width:min(92%,340px); box-shadow:0 10px 30px rgba(0,0,0,.5); }
.bb-card h2 { margin:0 0 6px; font-size:22px; font-weight:900; }
.bb-card p { margin:4px 0; font-size:14px; opacity:.9; }
.bb-card .row { display:flex; gap:6px; justify-content:center; margin-top:10px; flex-wrap:wrap; }
.bb-card button { font:800 14px ${FONT}; border:0; border-radius:12px; padding:8px 12px; cursor:pointer; background:#3b4fa8; color:#fff; }
.bb-card button.go { background:#ffd43b; color:#231; }
.bb-card button[aria-pressed="true"] { background:#3fe0d0; color:#102; }
.bb-card button:focus-visible { outline:3px solid #fff; outline-offset:2px; }
`;

export default {
  id: 'baseball',
  name: 'Baseball',
  emoji: '⚾',
  blurb: 'Tabletop baseball: pull back the spring bat and let it swing; roll the ball into the hit pockets.',
  minPlayers: 1,
  maxPlayers: 12,
  needsFace: false,
  fullBleed: false,

  create(api) {
    const me = api.me.id;
    const root = document.createElement('div');
    root.className = 'bb-root';
    const style = document.createElement('style');
    style.textContent = STYLE;
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-label', 'Baseball board: hold to pull the bat back, release to swing');
    const ctx = canvas.getContext('2d');
    const pitchBox = document.createElement('div');
    pitchBox.className = 'bb-pitch';
    const overBox = document.createElement('div');
    overBox.className = 'bb-over';
    root.append(style, canvas, pitchBox, overBox);
    api.el.append(root);
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const now = () => performance.now();

    // --- local state ---------------------------------------------------------
    let sh = readShared(api.shared());
    let cur = null;            // the pitch on: { n, type, seed, lead, p, t0 }
    const bat = { mode: 'rest', th: TH_REST, pullAt: 0, pull: 0, sw: null, relAt: 0, backAt: 0, backFrom: TH_REST, by: null };
    let mine = null;           // my swing's result for this pitch: { n, c, at, sent }
    let swungN = 0;            // the pitch my (or the CPU's) swing counted on
    let sentN = 0;             // the pitch I've reported
    let ball = null;           // the roll being shown: { n, L, r, at, res, done, lead, su }
    let banner = null;         // { text, sub, color, at, big }
    const fx = [];             // particles and rings
    const floats = [];         // floating texts
    let shake = null;
    const flips = new Map();   // slot -> { at, from }
    let shownPk = sh?.pk ?? null, shownBonus = sh?.bonus ?? -1, shownLay = sh?.lay ?? 0;
    let runAnim = null;        // { moves, at }
    let shownLast = sh?.last?.n ?? -1, shownLastG = sh?.g ?? 0;
    let lit = null;            // { slot, at, color } a pocket lighting up
    let shownBat = sh?.bat ?? null;
    let bannerN = 0;
    const stats = { swings: 0, contacts: 0, sent: 0, pitches: 0 };
    let records = { hits: api.store.get('hits', 0), hr: api.store.get('hr', 0) };
    // Owner bookkeeping (local clocks only).
    let readySince = 0, readyKey = '', cpuPitchAt = 0, pitchSeen = null, playSeen = null;
    let cpuPlan = null;        // { n, pressAt, relAt }
    let botPlan = null;        // the rookie's: { n, timers }
    let pointerHeld = false, keyHeld = false, padHeld = false, holdSpent = false;
    let w = 1, h = 1, dpr = 1, L = null;
    let boardCache = null;
    let raf = 0, timer = 0, destroyed = false;

    const players = () => api.players();
    const person = id => players().find(m => m.id === id);
    const nameOf = id => (id === CPU ? 'Robo' : person(id)?.name || 'Someone');
    const colorOf = id => (id === CPU ? '#adb5bd' : person(id)?.color || '#adb5bd');
    const teamName = (s, t) => (s.teams[t].length ? s.teams[t].map(nameOf).join(' & ') : 'Robots');
    const role = () => (!sh ? 'watch' : sh.bat === me ? 'bat' : sh.pit === me ? 'pitch' : 'watch');
    const iOwn = () => api.isOwner();

    // --- layout --------------------------------------------------------------
    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const land = w / h > 0.8;
      const s = land ? Math.min(h / BH, (w * 0.5) / BW) : Math.min(w / BW, h / BH);
      const bw = BW * s, bh = BH * s;
      L = { s, land, ox: (w - bw) / 2, oy: (h - bh) / 2, bw, bh };
      L.side = (w - bw) / 2;
      L.panel = land && L.side >= 150;
      boardCache = null;
      placeButtons();
    }
    const X = x => L.ox + x * L.s;
    const Y = y => L.oy + y * L.s;

    // --- the board picture ---------------------------------------------------
    function fieldPath(g, s) {
      g.beginPath();
      g.arc(WALL.x * s, WALL.y * s, WALL.r * s, 0, 2 * Math.PI);
    }
    // The trapdoor in the groove the vanishing pitch drops through.
    function drawHatch(g, s) {
      const top = HATCH[0], len = HATCH[1] - HATCH[0] - 0.03;
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect((0.5 - 0.02) * s, (top + 0.004) * s, 0.044 * s, len * s);
      g.fillStyle = '#4a4f5c';
      g.fillRect((0.5 - 0.022) * s, top * s, 0.044 * s, len * s);
      g.strokeStyle = '#9aa1b1';
      g.lineWidth = 0.003 * s;
      g.strokeRect((0.5 - 0.022) * s, top * s, 0.044 * s, len * s);
      g.strokeStyle = '#2b2f38';
      g.beginPath(); g.moveTo(0.5 * s, (top + 0.004) * s); g.lineTo(0.5 * s, (top + len - 0.004) * s); g.stroke();
      g.fillStyle = '#c3c8d4';
      for (const [dx, dy] of [[-0.016, 0.006], [0.016, 0.006], [-0.016, len - 0.006], [0.016, len - 0.006]]) {
        g.beginPath(); g.arc((0.5 + dx) * s, (top + dy) * s, 0.003 * s, 0, Math.PI * 2); g.fill();
      }
    }
    function paintBoard() {
      const s = L.s * dpr;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(BW * s));
      c.height = Math.max(1, Math.round(BH * s));
      const g = c.getContext('2d');
      const art = api.img('bb2-board');
      if (art) {
        g.drawImage(art, 0, 0, c.width, c.height);
        drawHatch(g, s);
        return c;
      }
      const R = rng(42);
      // The stands and the crowd behind the wall.
      const sky = g.createLinearGradient(0, 0, 0, 0.35 * s);
      sky.addColorStop(0, '#1b2350');
      sky.addColorStop(1, '#2b3778');
      g.fillStyle = sky;
      g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 900; i++) {
        const x = R(), y = R() * 0.35;
        if (Math.hypot(x - WALL.x, y - WALL.y) < WALL.r + 0.04) continue;
        g.fillStyle = CROWD[Math.floor(R() * CROWD.length)];
        g.globalAlpha = 0.55 + R() * 0.45;
        g.beginPath();
        g.arc(x * s, y * s, (0.006 + R() * 0.004) * s, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      // Pennants along the top.
      for (let i = 0; i < 9; i++) {
        const x = (0.08 + i * 0.105) * s, y = 0.02 * s;
        g.fillStyle = CROWD[i % CROWD.length];
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x + 0.05 * s, y + 0.012 * s); g.lineTo(x, y + 0.024 * s);
        g.fill();
      }
      // Side walls and the bottom rail.
      g.fillStyle = '#2f6fd6';
      g.fillRect(0, 0, SIDE * s, c.height);
      g.fillRect((1 - SIDE) * s, 0, SIDE * s, c.height);
      // The turf, mown in stripes round home plate.
      g.save();
      fieldPath(g, s);
      g.clip();
      g.fillStyle = '#3c9a3e';
      g.fillRect(0, 0, c.width, c.height);
      for (let k = 30; k >= 1; k--) {
        g.fillStyle = k % 2 ? '#43a845' : '#3a953c';
        g.beginPath();
        g.arc(APEX.x * s, APEX.y * s, k * 0.06 * s, 0, Math.PI * 2);
        g.fill();
      }
      // Foul ground: a darker, flatter green outside the lines.
      g.fillStyle = 'rgba(20,70,30,0.45)';
      g.beginPath();
      g.moveTo(APEX.x * s, APEX.y * s);
      g.lineTo(SIDE * s, (APEX.y - FOUL_K * (0.5 - SIDE)) * s);
      g.lineTo(SIDE * s, BH * s);
      g.lineTo((1 - SIDE) * s, BH * s);
      g.lineTo((1 - SIDE) * s, (APEX.y - FOUL_K * (0.5 - SIDE)) * s);
      g.closePath();
      g.fill();
      // The infield dirt: an arc round the mound, the base paths, the plate circle.
      const dirt = '#c98f55';
      g.save();
      g.beginPath();
      g.moveTo(APEX.x * s, APEX.y * s);
      g.lineTo((APEX.x - 0.62) * s, (APEX.y - 0.62 * FOUL_K) * s);
      g.lineTo((APEX.x + 0.62) * s, (APEX.y - 0.62 * FOUL_K) * s);
      g.closePath();
      g.clip();
      g.fillStyle = dirt;
      g.beginPath();
      g.arc(MOUND.x * s, (MOUND.y + 0.02) * s, 0.42 * s, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.fillStyle = '#43a845';
      g.beginPath();
      const inner = 0.055;
      g.moveTo(HOME.x * s, (HOME.y - inner * 1.6) * s);
      g.lineTo((BASES[0].x - inner * 1.2) * s, BASES[0].y * s);
      g.lineTo(BASES[1].x * s, (BASES[1].y + inner * 1.2) * s);
      g.lineTo((BASES[2].x + inner * 1.2) * s, BASES[2].y * s);
      g.closePath();
      g.fill();
      g.fillStyle = dirt;
      g.beginPath(); g.arc(HOME.x * s, (HOME.y - 0.005) * s, 0.085 * s, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(MOUND.x * s, MOUND.y * s, 0.06 * s, 0, Math.PI * 2); g.fill();
      for (const b of BASES) { g.beginPath(); g.arc(b.x * s, b.y * s, 0.045 * s, 0, Math.PI * 2); g.fill(); }
      g.restore();
      // Wall: a raised blue rail with a yellow cap.
      g.lineWidth = 0.03 * s;
      g.strokeStyle = '#2f6fd6';
      g.beginPath();
      g.arc(WALL.x * s, WALL.y * s, (WALL.r + 0.015) * s, 0, 2 * Math.PI);
      g.stroke();
      g.lineWidth = 0.006 * s;
      g.strokeStyle = '#ffd43b';
      g.beginPath();
      g.arc(WALL.x * s, WALL.y * s, (WALL.r + 0.03) * s, 0, 2 * Math.PI);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 0.003 * s;
      g.beginPath();
      g.arc(WALL.x * s, WALL.y * s, (WALL.r + 0.002) * s, 0, 2 * Math.PI);
      g.stroke();
      // Foul lines.
      g.strokeStyle = '#f8f9fa';
      g.lineWidth = 0.006 * s;
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.moveTo(APEX.x * s, APEX.y * s);
        const len = 0.5 - SIDE;
        g.lineTo((APEX.x + sgn * len) * s, (APEX.y - len * FOUL_K) * s);
        g.stroke();
      }
      // Batter's boxes.
      g.lineWidth = 0.004 * s;
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.strokeRect((HOME.x - 0.105) * s, (HOME.y - 0.045) * s, 0.06 * s, 0.09 * s);
      g.strokeRect((HOME.x + 0.045) * s, (HOME.y - 0.045) * s, 0.06 * s, 0.09 * s);
      // The groove from the mound to the plate, with the vanishing hatch.
      g.lineCap = 'round';
      g.strokeStyle = '#7a5230';
      g.lineWidth = 0.032 * s;
      g.beginPath(); g.moveTo(0.5 * s, PITCH_Y0 * s); g.lineTo(0.5 * s, (HOME.y - 0.03) * s); g.stroke();
      g.strokeStyle = '#5b3b20';
      g.lineWidth = 0.02 * s;
      g.beginPath(); g.moveTo(0.5 * s, PITCH_Y0 * s); g.lineTo(0.5 * s, (HOME.y - 0.03) * s); g.stroke();
      g.lineCap = 'butt';
      drawHatch(g, s);
      // The mound and its rubber.
      g.fillStyle = '#d9a46a';
      g.beginPath(); g.arc(MOUND.x * s, MOUND.y * s, 0.05 * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.fillRect((MOUND.x - 0.02) * s, (MOUND.y - 0.004) * s, 0.04 * s, 0.008 * s);
      // Bases and home plate.
      for (const b of BASES) {
        g.save();
        g.translate(b.x * s, b.y * s);
        g.rotate(Math.PI / 4);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(-0.014 * s, -0.01 * s, 0.03 * s, 0.03 * s);
        g.fillStyle = '#fff';
        g.fillRect(-0.015 * s, -0.015 * s, 0.03 * s, 0.03 * s);
        g.restore();
      }
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo((HOME.x - 0.024) * s, (HOME.y - 0.02) * s);
      g.lineTo((HOME.x + 0.024) * s, (HOME.y - 0.02) * s);
      g.lineTo((HOME.x + 0.024) * s, (HOME.y + 0.002) * s);
      g.lineTo(APEX.x * s, (APEX.y - 0.002) * s);
      g.lineTo((HOME.x - 0.024) * s, (HOME.y + 0.002) * s);
      g.closePath();
      g.fill();
      // A printed tin frame.
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.lineWidth = 0.008 * s;
      g.strokeRect(0.004 * s, 0.004 * s, c.width - 0.008 * s, c.height - 0.008 * s);
      return c;
    }

    // --- drawing helpers ----------------------------------------------------
    function rr(x, y, wd, ht, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + wd, y, x + wd, y + ht, r);
      ctx.arcTo(x + wd, y + ht, x, y + ht, r);
      ctx.arcTo(x, y + ht, x, y, r);
      ctx.arcTo(x, y, x + wd, y, r);
      ctx.closePath();
    }
    function text(str, x, y, size, color = '#fff', align = 'center', weight = 900, outline = 'rgba(0,0,0,0.65)') {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      if (outline) {
        ctx.lineWidth = Math.max(2, size * 0.18);
        ctx.strokeStyle = outline;
        ctx.lineJoin = 'round';
        ctx.strokeText(str, x, y);
      }
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }
    function drawFace(id, cx, cy, r, ring) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(cx + r * 0.08, cy + r * 0.12, r * 1.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = id === CPU ? '#8d99ae' : colorOf(id);
      ctx.fill();
      ctx.save();
      ctx.clip();
      let drew = false;
      if (id !== CPU) {
        const media = api.mediaOf?.(id);
        const sw = media?.videoWidth || media?.width || 0;
        const shh = media?.videoHeight || media?.height || 0;
        if (sw > 0 && shh > 0) {
          const k = Math.max((r * 2) / sw, (r * 2) / shh);
          try { ctx.drawImage(media, cx - (sw * k) / 2, cy - (shh * k) / 2, sw * k, shh * k); drew = true; } catch { /* not ready */ }
        }
      }
      if (!drew) {
        if (id === CPU) {
          ctx.fillStyle = '#dee2e6';
          ctx.fillRect(cx - r * 0.6, cy - r * 0.45, r * 1.2, r * 0.9);
          ctx.fillStyle = '#ff5b5b';
          ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.08, r * 0.15, 0, Math.PI * 2); ctx.arc(cx + r * 0.28, cy - r * 0.08, r * 0.15, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#495057';
          ctx.fillRect(cx - r * 0.3, cy + r * 0.2, r * 0.6, r * 0.1);
        } else text((nameOf(id)[0] || '?').toUpperCase(), cx, cy + r * 0.05, r, '#fff', 'center', 900, null);
      }
      ctx.restore();
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.strokeStyle = ring;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    function nameTag(str, cx, cy, color) {
      const size = clamp(L.s * 0.03, 10, 16);
      ctx.font = `800 ${size}px ${FONT}`;
      const tw = ctx.measureText(str).width + size;
      ctx.fillStyle = 'rgba(10,14,40,0.75)';
      rr(cx - tw / 2, cy - size * 0.7, tw, size * 1.4, size * 0.7);
      ctx.fill();
      text(str, cx, cy, size, color, 'center', 800, null);
    }

    function drawPockets(t) {
      const s = L.s;
      const pk = sh?.pk || 'O'.repeat(SLOTS);
      const bonus = sh?.bonus ?? -1;
      const slots = POCKETS.map((p, i) => ({ ...p, i }));
      const su = sliderNow();
      const sp = sliderPos(su);
      slots.push({ x: sp.x, y: sp.y, r: SLIDER_R, i: SLOTS });
      for (const p of slots) {
        const lab = slotLabel(pk, bonus, p.i);
        const col = LABEL_COLORS[lab];
        const cx = X(p.x), cy = Y(p.y), r = p.r * s;
        const isLit = lit && lit.slot === p.i && t - lit.at < 1800;
        const glowOn = p.i === bonus || p.i === SLOTS || isLit;
        if (glowOn) {
          const pulse = isLit ? 1 - (t - lit.at) / 1800 : 0.5 + 0.5 * Math.sin(t / 220);
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.45 * pulse;
          const gr = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.2);
          gr.addColorStop(0, col);
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // The hole.
        const hole = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
        hole.addColorStop(0, '#000');
        hole.addColorStop(0.75, '#141414');
        hole.addColorStop(1, '#333');
        ctx.fillStyle = hole;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = Math.max(2, r * 0.22);
        ctx.strokeStyle = col;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2); ctx.stroke();
        // The label plate, flipping when it changes.
        const flip = flips.get(p.i);
        let sy = 1, shownLab = lab;
        if (flip) {
          const k = (t - flip.at) / 650;
          if (k >= 1) flips.delete(p.i);
          else {
            sy = Math.abs(Math.cos(k * Math.PI));
            if (k < 0.5) shownLab = flip.from;
          }
        }
        const str = (p.i === bonus && shownLab === lab && lab !== (pk[p.i] || 'O') ? '★' : '') + (p.i === SLOTS ? 'HOME RUN' : LABEL[shownLab]);
        const size = clamp(s * (p.i === SLOTS ? 0.028 : 0.03), 9, 18);
        ctx.font = `900 ${size}px ${FONT}`;
        const tw = ctx.measureText(str).width + size * 0.8;
        const py = cy + (p.y < 0.5 ? r + size * 0.9 : -(r + size * 0.85));
        ctx.save();
        ctx.translate(cx, py);
        ctx.scale(1, Math.max(0.05, sy));
        const plateCol = LABEL_COLORS[shownLab];
        ctx.fillStyle = 'rgba(12,16,40,0.85)';
        rr(-tw / 2, -size * 0.68, tw, size * 1.36, size * 0.4);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = plateCol;
        ctx.stroke();
        text(str, 0, size * 0.04, size, plateCol, 'center', 900, null);
        ctx.restore();
      }
    }

    // The delivered figure with its white cap tinted (cached per colour).
    const tinted = new Map();
    function fielderArt(color) {
      const art = api.img('bb2-fielder');
      if (!art) return null;
      if (tinted.has(color)) return tinted.get(color);
      let out = art;
      try {
        const c = document.createElement('canvas');
        c.width = art.naturalWidth || art.width;
        c.height = art.naturalHeight || art.height;
        const g = c.getContext('2d');
        g.drawImage(art, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height);
        const k = c.width / 256;
        const tc = document.createElement('canvas').getContext('2d');
        tc.fillStyle = color;
        tc.fillRect(0, 0, 1, 1);
        const [tr, tg, tb] = tc.getImageData(0, 0, 1, 1).data;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            const ex = (x / k - 105) / 54, ey = (y / k - 82) / 50;
            if (ex * ex + ey * ey > 1) continue;
            const i = (y * c.width + x) * 4;
            const r = d.data[i], gg = d.data[i + 1], bb = d.data[i + 2];
            if (d.data[i + 3] < 128 || Math.min(r, gg, bb) < 140 || Math.max(r, gg, bb) - Math.min(r, gg, bb) > 40) continue;
            const lum = (r + gg + bb) / 765;
            d.data[i] = tr * lum; d.data[i + 1] = tg * lum; d.data[i + 2] = tb * lum;
          }
        }
        g.putImageData(d, 0, 0);
        out = c;
      } catch { /* untinted */ }
      tinted.set(color, out);
      return out;
    }
    function drawFielder(f, color, t) {
      const s = L.s;
      const cx = X(f.x), cy = Y(f.y), r = FIELDER_R * s;
      const art = fielderArt(color);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.25, r * 1.15, r * 1.05, 0, 0, Math.PI * 2); ctx.fill();
      if (art) {
        // Standing up on its round base, the base centred on the spot.
        const D = r * 4.6;
        ctx.drawImage(art, -D * (105 / 256), -D * (172 / 256) + Math.sin(t / 500 + f.x * 9) * r * 0.04, D, D);
      } else {
        // Base, shoulders, glove, cap.
        ctx.rotate(Math.atan2(HOME.y - f.y, HOME.x - f.x) - Math.PI / 2);
        ctx.fillStyle = '#e9ecef';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8b5a2b';
        const sway = Math.sin(t / 400 + f.x * 9) * r * 0.08;
        ctx.beginPath(); ctx.arc(r * 0.78, r * 0.35 + sway, r * 0.32, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1c27d';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.38, Math.PI, 2 * Math.PI); ctx.fill();
        ctx.fillRect(-r * 0.38, -r * 0.08, r * 0.76, r * 0.12);
        ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.3, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function basePos(k) { return BASE_PT[Math.max(0, Math.min(4, k))]; }
    function runnerAt(m, k) {
      // Along the base path from m.from to m.to, k in 0..1.
      const seg = m.to - m.from;
      if (seg <= 0) return basePos(m.to);
      const f = k * seg;
      const i = Math.min(seg - 1, Math.floor(f));
      const a = basePos(m.from + i), b = basePos(m.from + i + 1);
      const u = f - i;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
    function drawRunner(id, p, alpha = 1) {
      const r = 0.021 * L.s;
      const cx = X(p.x), cy = Y(p.y) - r * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(cx + r * 0.2, cy + r * 0.9, r * 0.9, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      const gr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
      gr.addColorStop(0, '#fff');
      gr.addColorStop(0.35, colorOf(id));
      gr.addColorStop(1, '#222');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      text((nameOf(id)[0] || '?').toUpperCase(), cx, cy + r * 0.05, r * 1.05, '#fff', 'center', 900, 'rgba(0,0,0,0.5)');
      ctx.restore();
    }
    function drawRunners(t) {
      if (!sh) return;
      const moving = runAnim && t - runAnim.at < runAnim.dur ? runAnim : null;
      const movers = new Set(moving ? moving.moves.filter(m => m.to < 4).map(m => `${m.id}@${m.to}`) : []);
      sh.bases.forEach((id, i) => {
        if (id && !movers.has(`${id}@${i + 1}`)) drawRunner(id, BASES[i]);
      });
      if (moving) {
        const k = clamp((t - moving.at) / (moving.dur - 250), 0, 1);
        for (const m of moving.moves) {
          const p = runnerAt(m, easeOut(k));
          drawRunner(m.id, p, m.to === 4 && k >= 1 ? 1 - clamp((t - moving.at - moving.dur + 250) / 250, 0, 1) : 1);
        }
      }
    }

    function batAngle(t) {
      if (bat.mode === 'pull') return TH_REST + pullFor(t - bat.pullAt);
      if (bat.mode === 'swing') return swingAt(bat.sw, t - bat.relAt).th;
      if (bat.mode === 'back') return bat.backFrom + (TH_REST - bat.backFrom) * clamp((t - bat.backAt) / 380, 0, 1);
      return TH_REST;
    }
    function drawBat(t) {
      const s = L.s;
      const th = batAngle(t);
      bat.th = th;
      const px = X(PIVOT.x), py = Y(PIVOT.y);
      const pullK = bat.mode === 'pull' ? clamp((th - TH_REST) / PULL_MAX, 0, 1) : 0;
      // The spring: a coil wound round the pivot pin, like a mousetrap's. Its
      // outer end is pinned to the board; its inner end turns with the bat, so
      // pulling back winds it tighter (more turns, closer together).
      {
        const anchor = TH_REST + PULL_MAX + 0.6;          // where the outer end is pinned
        const turns = 1.4 + (th - TH_REST) / (Math.PI * 2) + 0.15;
        const r0 = 0.009 * s, r1 = 0.026 * s - (th - TH_REST) * 0.003 * s;
        const steps = 90;
        ctx.save();
        ctx.lineCap = 'round';
        const spiral = () => {
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const ang = anchor + (th - anchor) * u - turns * Math.PI * 2 * u;
            const r = r1 + (r0 - r1) * u;
            const x = px + Math.cos(ang) * r, y = py + Math.sin(ang) * r;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
        };
        ctx.strokeStyle = 'rgba(20,24,30,0.55)';
        ctx.lineWidth = Math.max(2.5, 0.0065 * s);
        spiral(); ctx.stroke();
        ctx.strokeStyle = '#ced4da';
        ctx.lineWidth = Math.max(1.5, 0.0038 * s);
        spiral(); ctx.stroke();
        // The pinned end.
        ctx.fillStyle = '#868e96';
        ctx.beginPath(); ctx.arc(px + Math.cos(anchor) * r1, py + Math.sin(anchor) * r1, 0.006 * s, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // The tension meter: an arc round the pivot.
      if (bat.mode === 'pull') {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.012 * s;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.arc(px, py, 0.075 * s, TH_REST, TH_REST + PULL_MAX); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * pullK})`;
        ctx.beginPath(); ctx.arc(px, py, 0.075 * s, TH_REST, th); ctx.stroke();
        ctx.restore();
      }
      // Motion blur while swinging.
      if (bat.mode === 'swing') {
        const st = swingAt(bat.sw, t - bat.relAt);
        if (Math.abs(st.om) > 3) {
          ctx.save();
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.arc(px, py, BAT_L * s, th, th + Math.min(0.9, Math.abs(st.om) * 0.04));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(th);
      const art = api.img('bb2-bat');
      const Lp = BAT_L * s;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.save();
      ctx.translate(0.006 * s, 0.008 * s);
      batShape(Lp, s);
      ctx.fill();
      ctx.restore();
      if (art) ctx.drawImage(art, -0.01 * s, -Lp / 8, Lp + 0.01 * s, Lp / 4);
      else {
        const gr = ctx.createLinearGradient(0, -BAT_W * s, 0, BAT_W * s);
        gr.addColorStop(0, '#f6d29b');
        gr.addColorStop(0.5, '#d89a52');
        gr.addColorStop(1, '#a8682c');
        ctx.fillStyle = gr;
        batShape(Lp, s);
        ctx.fill();
        ctx.fillStyle = '#343a40';
        ctx.fillRect(0.008 * s, -0.0055 * s, 0.045 * s, 0.011 * s);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(0.09 * s, -0.008 * s, 0.09 * s, 0.003 * s);
      }
      ctx.restore();
      // The pivot pin.
      ctx.fillStyle = '#adb5bd';
      ctx.beginPath(); ctx.arc(px, py, 0.01 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#495057';
      ctx.beginPath(); ctx.arc(px, py, 0.004 * s, 0, Math.PI * 2); ctx.fill();
    }
    function batShape(Lp, s) {
      const k = 0.012 * s;
      ctx.beginPath();
      ctx.moveTo(-0.004 * s, -k * 0.75);
      ctx.lineTo(0.008 * s, -k * 0.75);
      ctx.lineTo(0.012 * s, -k * 0.42);
      ctx.lineTo(0.07 * s, -k * 0.45);
      ctx.quadraticCurveTo(0.12 * s, -k * 0.6, 0.15 * s, -k);
      ctx.lineTo(Lp - k, -k);
      ctx.arc(Lp - k, 0, k, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(0.15 * s, k);
      ctx.quadraticCurveTo(0.12 * s, k * 0.6, 0.07 * s, k * 0.45);
      ctx.lineTo(0.012 * s, k * 0.42);
      ctx.lineTo(0.008 * s, k * 0.75);
      ctx.lineTo(-0.004 * s, k * 0.75);
      ctx.closePath();
    }

    function drawBall(x, y, scale = 1, spin = 0, alpha = 1) {
      const r = BR * L.s * scale * 1.2;
      const cx = X(x), cy = Y(y);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(cx + r * 0.35, cy + r * 0.45, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      const art = api.img('baseball-ball');
      ctx.translate(cx, cy);
      ctx.rotate(spin);
      if (art) ctx.drawImage(art, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
      else {
        const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        gr.addColorStop(0, '#fff');
        gr.addColorStop(1, '#d9d9d9');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e03131';
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * 0.9, -0.7, 0.7); ctx.stroke();
        ctx.beginPath(); ctx.arc(r * 1.25, 0, r * 0.9, Math.PI - 0.7, Math.PI + 0.7); ctx.stroke();
      }
      ctx.restore();
    }

    // --- the slider, the pitch and the roll ------------------------------------
    function sliderNow() {
      if (!sh) return 0.5;
      if (ball && sh.play?.n === ball.n) return sliderU(ball.su, ball.lead, ball.L.t);
      if (cur && cur.n === sh.pn && (sh.phase === 'pitch' || sh.phase === 'play')) {
        const tt = clamp((now() - cur.t0) / 1000, -cur.lead / 1000, cur.p.end);
        if (sh.phase === 'play' && sh.play && !sh.play.L) return sliderU(sh.su, cur.lead, cur.p.end);
        return sliderU(sh.su, cur.lead, tt);
      }
      return sh.su;
    }
    const pitchClock = () => (cur ? (now() - cur.t0) / 1000 : -1);

    function startPitch(m, at = now()) {
      if (cur && cur.n >= m.n) return;
      cur = { ...m, p: makePitch(m.type, m.seed), t0: at + m.lead };
      mine = null;
      ball = null;
      stats.pitches++;
      api.sfx('whoosh');
      if (sh?.bat === CPU && iOwn()) planCpu();
    }

    function startRoll(n, Lc, at, su, lead) {
      if (ball && ball.n === n) return;
      const r = roll(Lc, su, lead);
      const res = outcome(r, sh?.pk || 'O'.repeat(SLOTS), sh?.bonus ?? -1);
      ball = { n, L: Lc, r, at, res, done: false, su, lead };
      const sp = Math.hypot(Lc.vx, Lc.vy);
      stats.contacts++;
      // Crack!
      const hard = sp > 2.2;
      api.sfx(hard ? 'bang' : 'pop');
      for (let i = 0; i < (hard ? 18 : 8); i++) {
        const a = Math.random() * Math.PI * 2, v = (0.2 + Math.random() * 0.6) * (hard ? 1 : 0.5);
        fx.push({ kind: 'spark', x: Lc.x, y: Lc.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, at, life: 380, color: hard ? '#ffd43b' : '#fff' });
      }
      floats.push({ text: hard ? 'CRACK!' : sp < 0.9 ? 'tap' : 'CLACK', x: Lc.x - 0.12, y: Lc.y - 0.06, at, color: hard ? '#ffd43b' : '#fff', size: hard ? 0.06 : 0.04 });
      if (hard && !reduced) shake = { at, mag: 5 };
    }
    // Where the roll is now: { x, y, k, dist, phase }.
    function rollState(t) {
      const r = ball.r;
      const steps = (t - ball.at) / 1000 / ROLL_DT;
      const n = r.path.length / 2;
      const f = clamp(steps / 2, 0, n - 1);
      const i = Math.floor(f), u = f - i;
      const j = Math.min(n - 1, i + 1);
      const x = r.path[i * 2] + (r.path[j * 2] - r.path[i * 2]) * u;
      const y = r.path[i * 2 + 1] + (r.path[j * 2 + 1] - r.path[i * 2 + 1]) * u;
      return { x, y, done: f >= n - 1, steps };
    }
    function finishRoll(t) {
      if (!ball || ball.done) return;
      ball.done = true;
      ball.doneAt = t;
      const r = ball.r;
      const res = sh?.play?.n === ball.n ? sh.play.res : ball.res;
      ball.res = res;
      const col = LABEL_COLORS[res] || '#fff';
      if (r.end === 'pocket') {
        lit = { slot: r.slot, at: t };
        fx.push({ kind: 'ring', x: r.x, y: r.y, at: t, life: 700, color: col });
      }
      if (r.end === 'over' || res === 'H') {
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2, v = 0.15 + Math.random() * 0.45;
          fx.push({ kind: 'spark', x: r.x, y: Math.max(0.1, r.y - 0.08), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.2, at: t + Math.random() * 300, life: 900, color: CROWD[i % CROWD.length] });
        }
      }
      showResult(ball.n, res, r);
    }
    function showResult(n, res, r) {
      if (bannerN >= n) return;
      bannerN = n;
      const t = now();
      let textStr = LONG[res] || res, sub = '';
      const fielder = r && r.end === 'stop' ? nearestFielder(r.x, r.y) : null;
      if (r?.end === 'over') sub = 'Over the wall!';
      else if (r?.end === 'pocket') sub = r.slot === SLOTS ? 'Into the home run pocket!' : (sh && r.slot === sh.bonus ? 'Into the lit pocket!' : '');
      else if (fielder && res === 'O') sub = `Fielded by ${fielder.id === 'C' ? 'the catcher' : fielder.id === 'P' ? 'the pitcher' : fielder.id}`;
      else if (fielder) sub = 'Found a gap!';
      if (res === 'B' && cur?.type === 'vanish') sub = 'The vanishing pitch!';
      if ((res === 'S' || res === 'W') && cur?.type === 'vanish') sub = 'The vanishing pitch!';
      else if (res === 'W') sub = 'Swing and a miss';
      else if (res === 'S') sub = 'Looking';
      banner = { text: textStr, sub, color: LABEL_COLORS[res] || (res === 'F' ? '#ffa94d' : res === 'B' ? '#74c0fc' : '#ffffff'), at: t, big: res === 'H' };
      if (res === 'H') { api.sfx('win'); setTimeout(() => api.sfx('blow'), 200); }
      else if (res === 'O') api.sfx('miss');
      else if ('123'.includes(res)) api.sfx('score');
      else api.sfx('click');
    }

    // --- my swing ----------------------------------------------------------------
    // src 'me' (my bat) or 'cpu' (the owner swings for the computer).
    function canSwing(src) {
      if (!sh || sh.phase === 'over') return false;
      return src === 'cpu' ? sh.bat === CPU && iOwn() : sh.bat === me;
    }
    function press(src = 'me') {
      if (!canSwing(src) || bat.mode !== 'rest') return;
      bat.mode = 'pull';
      bat.pullAt = now();
      bat.by = src === 'cpu' ? CPU : me;
      api.send('pull', { n: cur?.n ?? sh.pn });
      api.sfx('tick');
    }
    function release(src = 'me') {
      if (!canSwing(src) || bat.mode !== 'pull') return;
      const t = now();
      const pull = pullFor(t - bat.pullAt);
      bat.mode = 'swing';
      bat.pull = pull;
      bat.sw = makeSwing(pull);
      bat.relAt = t;
      stats.swings++;
      api.send('swing', { n: cur?.n ?? sh.pn, pull: Math.round(pull * 1000) / 1000 });
      api.sfx('flap');
      // Does this swing count on the pitch, and does it touch the ball?
      if (cur && sh.phase === 'pitch' && cur.n === sh.pn && swungN !== cur.n && sentN !== cur.n) {
        const tRel = (t - cur.t0) / 1000;
        if (swingCounts(cur.p, pull, tRel)) {
          swungN = cur.n;
          const c = findContact(cur.p, pull, tRel);
          mine = { n: cur.n, c, at: c ? t + c.ms : 0, sent: false };
        }
      }
    }
    function batTick(t) {
      if (bat.mode === 'swing' && t - bat.relAt > bat.sw.done + 120) {
        bat.mode = 'back';
        bat.backAt = t;
        bat.backFrom = swingAt(bat.sw, bat.sw.done).th;
      } else if (bat.mode === 'back' && t - bat.backAt > 400) bat.mode = 'rest';
      // Held input keeps pulling; a let-go swings.
      const held = pointerHeld || keyHeld || padHeld;
      if (sh?.bat === me) {
        if (held && bat.mode === 'rest' && !holdSpent) { press('me'); holdSpent = true; }
        if (!held) { holdSpent = false; if (bat.mode === 'pull' && bat.by === me) release('me'); }
      }
      // CPU batting (owner).
      if (cpuPlan && cur && cpuPlan.n === cur.n && sh?.bat === CPU && iOwn()) {
        if (t >= cpuPlan.pressAt && bat.mode === 'rest' && !cpuPlan.pressed) { cpuPlan.pressed = true; press('cpu'); }
        if (t >= cpuPlan.relAt && bat.mode === 'pull' && bat.by === CPU) { release('cpu'); cpuPlan = null; }
      }
      // Report my result: the launch the moment the bat meets the ball, a miss
      // once the pitch is in the mitt.
      if (!cur || !sh || sh.phase !== 'pitch' || cur.n !== sh.pn || sentN === cur.n) return;
      const swinger = sh.bat === me ? 'me' : sh.bat === CPU && iOwn() ? 'cpu' : null;
      if (!swinger) return;
      if (mine && mine.n === cur.n && mine.c && t >= mine.at) {
        sentN = cur.n;
        const msg = { n: cur.n, L: mine.c.L };
        api.send('bat', msg);
        stats.sent++;
        startRoll(cur.n, mine.c.L, t, sh.su, cur.lead);
        if (iOwn()) ownerBat(msg, me);
      } else if ((!mine || !mine.c) && pitchClock() > cur.p.end + 0.05 && !(bat.mode === 'swing' && swungN === cur.n && t - bat.relAt < 60)) {
        sentN = cur.n;
        const msg = { n: cur.n, miss: true, sw: swungN === cur.n };
        api.send('bat', msg);
        stats.sent++;
        if (iOwn()) ownerBat(msg, me);
      }
    }
    function planCpu() {
      if (!cur) return;
      const plan = planSwing(cur.p, Math.random, 0.45);
      if (!plan) { cpuPlan = null; return; }
      const relAt = cur.t0 + plan.tRel * 1000;
      cpuPlan = { n: cur.n, relAt, pressAt: relAt - holdFor(plan.pull), pressed: false };
    }

    // --- pitching ------------------------------------------------------------------
    function throwPitch(type, auto = false) {
      if (!sh || sh.phase !== 'ready') return;
      const by = sh.pit;
      if (!auto && !(by === me || (by === CPU && iOwn()))) return;
      if (type === 'vanish' && sh.vn <= 0) return;
      const m = { n: sh.pn + 1, type, seed: Math.floor(Math.random() * 2 ** 31), lead: auto && by === CPU ? cpuPitch(sh).lead : 650 + Math.floor(Math.random() * 400) };
      if (cur && cur.n >= m.n) return;
      api.send('pitch', m);
      startPitch(m);
      if (iOwn()) ownerPitch(m, me);
      showButtons();
    }

    // --- the owner -------------------------------------------------------------------
    function publish(next) {
      sh = next;
      api.setShared(next);
      afterShared();
    }
    function ownerPitch(m, from) {
      if (!sh || sh.phase !== 'ready' || m.n !== sh.pn + 1) return;
      if (!(from === sh.pit || from === me)) return;
      if (m.type === 'vanish' && sh.vn <= 0) return;
      publish({ ...sh, phase: 'pitch', pn: m.n, pitch: m, play: null, vn: m.type === 'vanish' ? sh.vn - 1 : sh.vn });
    }
    function ownerBat(d, from) {
      if (!sh || sh.phase !== 'pitch' || d.n !== sh.pn || !sh.pitch) return;
      if (!(from === sh.bat || (sh.bat === CPU && from === me) || from === 'timeout')) return;
      const p = makePitch(sh.pitch.type, sh.pitch.seed);
      let play;
      if (d.L) {
        const r = roll(d.L, sh.su, sh.pitch.lead);
        const res = outcome(r, sh.pk, sh.bonus);
        play = { n: d.n, res, L: d.L, slot: r.end === 'pocket' ? r.slot : -1, sw: true, dur: Math.round((r.steps * ROLL_DT) * 1000) + (r.end === 'over' ? 600 : 250) };
      } else {
        const res = d.sw ? 'W' : inZone(p) ? 'S' : 'B';
        play = { n: d.n, res, L: null, slot: -1, sw: !!d.sw, dur: 500 };
      }
      publish({ ...sh, phase: 'play', play });
    }
    function ownerApply() {
      const p = sh.pitch ? makePitch(sh.pitch.type, sh.pitch.seed) : null;
      const su = sh.play?.L ? sliderU(sh.su, sh.pitch?.lead ?? 0, sh.play.L.t) : p ? sliderU(sh.su, sh.pitch.lead, p.end) : sh.su;
      const next = applyResult({ ...sh, su: Math.round(su * 1e4) / 1e4 }, sh.play.res, Math.random);
      publish(next);
    }
    function ownerTick(t) {
      if (!iOwn()) { pitchSeen = null; playSeen = null; return; }
      if (!sh) { publish(newGame(players().map(m => m.id), api.store.get('innings', 3))); return; }
      if (sh.phase === 'over') return;
      const ids = players().map(m => m.id);
      const teams = syncTeams(sh.teams, ids);
      let next = sh, dirty = false;
      if (JSON.stringify(teams) !== JSON.stringify(sh.teams)) { next = { ...next, teams }; dirty = true; }
      if (next.bat !== CPU && !ids.includes(next.bat)) { next = { ...next, bat: batterOf(next) }; dirty = true; }
      if (next.pit !== CPU && !ids.includes(next.pit)) { next = { ...next, pit: pitcherOf(next) }; dirty = true; }
      if (next.phase === 'ready') {
        if (next.bat === CPU && next.teams[next.half].length && next.b === 0 && next.s === 0) { next = { ...next, bat: batterOf(next) }; dirty = true; }
        if (next.pit === CPU && next.teams[1 - next.half].length) { next = { ...next, pit: pitcherOf(next) }; dirty = true; }
      }
      if (dirty) publish(next);
      if (sh.phase === 'ready') {
        const key = `${sh.pn}|${sh.pit}`;
        if (key !== readyKey) { readyKey = key; readySince = t; cpuPitchAt = t + 1300 + Math.random() * 1000; }
        if (sh.pit === CPU && t >= cpuPitchAt) throwPitch(cpuPitch(sh).type, true);
        else if (sh.pit !== CPU && t - readySince > READY_AFK_MS) {
          api.toast?.(`${nameOf(sh.pit)} took too long: a fastball for them.`);
          throwPitch('fast', true);
        }
      } else if (sh.phase === 'pitch') {
        if (!pitchSeen || pitchSeen.n !== sh.pn) pitchSeen = { n: sh.pn, at: t };
        const p = makePitch(sh.pitch.type, sh.pitch.seed);
        if (t > pitchSeen.at + sh.pitch.lead + p.end * 1000 + 2500) ownerBat({ n: sh.pn, miss: true, sw: false }, 'timeout');
      } else if (sh.phase === 'play' && sh.play) {
        if (!playSeen || playSeen.n !== sh.play.n) playSeen = { n: sh.play.n, at: t };
        if (t > playSeen.at + sh.play.dur + RESULT_HOLD_MS) ownerApply();
      }
    }

    // --- messages ----------------------------------------------------------------------
    const present = id => players().some(m => m.id === id);
    const asOwner = from => from === api.owner();
    api.on('pitch', (d, from) => {
      const m = readPitchMsg(d);
      if (!m || !sh || !present(from)) return;
      if (!(from === sh.pit || asOwner(from))) return;
      if (m.n !== sh.pn + 1 && !(sh.pitch && sh.pitch.n === m.n)) return;
      startPitch(m);
      if (iOwn()) ownerPitch(m, from);
    });
    api.on('bat', (d, from) => {
      const m = readBatMsg(d);
      if (!m || !sh || !present(from)) return;
      const batter = sh.bat === CPU ? api.owner() : sh.bat;
      if (from !== batter) return;
      if (m.L && cur && cur.n === m.n) startRoll(m.n, m.L, now(), sh.su, cur.lead);
      if (iOwn()) ownerBat(m, from);
    });
    api.on('pull', (d, from) => {
      const m = readSwingMsg(d);
      if (!m || !sh || from === me) return;
      const batter = sh.bat === CPU ? api.owner() : sh.bat;
      if (from !== batter || bat.mode !== 'rest') return;
      bat.mode = 'pull'; bat.pullAt = now(); bat.by = from;
    });
    api.on('swing', (d, from) => {
      const m = readSwingMsg(d);
      if (!m || m.pull === undefined || !sh || from === me) return;
      const batter = sh.bat === CPU ? api.owner() : sh.bat;
      if (from !== batter) return;
      bat.mode = 'swing'; bat.sw = makeSwing(m.pull); bat.relAt = now(); bat.pull = m.pull; bat.by = from;
    });
    api.on('again', (d, from) => {
      if (!iOwn() || !sh || sh.phase !== 'over' || !present(from)) return;
      const inns = INNINGS.includes(d?.inns) ? d.inns : sh.inns;
      publish(newGame(players().map(m => m.id), inns, sh.g + 1));
    });

    // --- shared state changes ---------------------------------------------------------
    function afterShared() {
      if (!sh) return;
      const t = now();
      if (sh.g !== shownLastG) {
        shownLastG = sh.g;
        cur = null; ball = null; mine = null; runAnim = null; banner = null; bannerN = 0;
        shownLast = sh.last?.n ?? -1;
      }
      // A new batter steps in with the bat at rest.
      if (sh.bat !== shownBat) {
        shownBat = sh.bat;
        if (bat.mode === 'pull') bat.mode = 'rest';
        holdSpent = pointerHeld || keyHeld || padHeld;
      }
      // A pitch I missed the message for.
      if (sh.phase === 'pitch' && sh.pitch && (!cur || cur.n < sh.pitch.n)) startPitch(sh.pitch, t - 0);
      if (sh.phase === 'play' && sh.play) {
        if (sh.play.L && (!ball || ball.n !== sh.play.n) && cur && cur.n === sh.play.n && sentN !== sh.play.n) startRoll(sh.play.n, sh.play.L, t, sh.su, cur.lead);
        else if (sh.play.L && !ball && !cur) {
          // Joined mid-roll: put the ball where it ends.
          startRoll(sh.play.n, sh.play.L, t - 20000, sh.su, sh.pitch?.lead ?? 0);
        }
        if (!sh.play.L) showResult(sh.play.n, sh.play.res, null);
      }
      // Labels that changed flip over.
      if (shownPk && sh.pk !== shownPk) {
        for (let i = 0; i < SLOTS; i++) if (sh.pk[i] !== shownPk[i]) flips.set(i, { at: t + i * 40, from: shownPk[i] });
        api.sfx('tick');
      }
      if (shownBonus !== sh.bonus && sh.bonus >= 0) {
        flips.set(sh.bonus, { at: t, from: sh.pk[sh.bonus] });
        lit = { slot: sh.bonus, at: t };
      }
      shownPk = sh.pk; shownBonus = sh.bonus; shownLay = sh.lay;
      // A finished play: runners run, runs count, the side changes.
      if (sh.last && sh.last.n !== shownLast) {
        shownLast = sh.last.n;
        const last = sh.last;
        if (last.moves.length) runAnim = { moves: last.moves, at: t, dur: 350 + 260 * Math.max(...last.moves.map(m => m.to - m.from)) };
        if (last.runs) {
          floats.push({ text: `+${last.runs} RUN${last.runs > 1 ? 'S' : ''}`, x: HOME.x, y: HOME.y - 0.1, at: t + 500, color: '#ffd43b', size: 0.055 });
          setTimeout(() => api.sfx('score'), 500);
        }
        if (last.res === 'K') banner = { text: 'STRIKEOUT', sub: `${nameOf(last.by)} is out`, color: '#ff5b5b', at: t };
        else if (last.res === 'BB') banner = { text: 'WALK', sub: `${nameOf(last.by)} takes first`, color: '#74c0fc', at: t };
        if (last.side) {
          banner = { text: 'SWITCH SIDES', sub: `${sh.half ? 'Bottom' : 'Top'} of the ${ordinal(sh.inn)}: ${nameOf(sh.bat)} bats`, color: '#ffd43b', at: t + (last.res === 'K' ? 900 : 0) };
          api.sfx('join');
        }
        if (last.by === me && '123H'.includes(last.res)) {
          records.hits++;
          api.store.set('hits', records.hits);
          if (last.res === 'H') { records.hr++; api.store.set('hr', records.hr); }
        }
      }
      if (sh.phase === 'over') showOver();
      else overBox.style.display = 'none';
      showButtons();
    }

    // --- pitch buttons and the game-over card ---------------------------------------------
    const PITCH_BTNS = [
      ['fast', 'Fastball', 'fast'], ['slow', 'Slow ball', ''], ['curveL', '◀ Curve', ''], ['curveR', 'Curve ▶', ''], ['vanish', 'Vanish ✨', 'wide'],
    ];
    const btns = PITCH_BTNS.map(([type, label, cls]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (cls) b.className = cls;
      b.dataset.type = type;
      b.setAttribute('aria-label', `Pitch: ${TYPES[type].name}${TYPES[type].side ? (TYPES[type].side < 0 ? ' breaking left' : ' breaking right') : ''}`);
      b.addEventListener('click', e => { e.stopPropagation(); throwPitch(type); });
      pitchBox.append(b);
      return b;
    });
    function placeButtons() {
      if (!L) return;
      if (L.panel) {
        const wd = Math.min(L.side - 20, 220);
        Object.assign(pitchBox.style, { left: `${L.ox + L.bw + (L.side - wd) / 2}px`, top: `${2 * clamp(h * 0.09, 22, 44) + 142}px`, width: `${wd}px`, gridTemplateColumns: '1fr 1fr' });
        pitchBox.style.setProperty('--bb-bh', '38px');
        pitchBox.style.setProperty('--bb-fs', '13px');
      } else if (L.side >= 84) {
        // A narrow screen with room beside the board: one column there.
        const wd = Math.min(L.side - 12, 150);
        Object.assign(pitchBox.style, { left: `${L.ox + L.bw + (L.side - wd) / 2}px`, top: `${Math.max(8, L.oy + (L.bh - 200) / 2)}px`, width: `${wd}px`, gridTemplateColumns: '1fr' });
        pitchBox.style.setProperty('--bb-bh', '34px');
        pitchBox.style.setProperty('--bb-fs', '12px');
      } else {
        // On the board, in the foul ground right of the plate.
        const wd = Math.min(0.36 * L.s, 190);
        Object.assign(pitchBox.style, { left: `${X(0.985) - wd}px`, top: `${Y(HOME.y - 0.02)}px`, width: `${wd}px`, gridTemplateColumns: '1fr 1fr' });
        pitchBox.style.setProperty('--bb-bh', `${Math.round(clamp(0.085 * L.s, 24, 40))}px`);
        pitchBox.style.setProperty('--bb-fs', `${Math.round(clamp(0.032 * L.s, 10, 14))}px`);
      }
    }
    function showButtons() {
      const on = !!sh && sh.phase === 'ready' && sh.pit === me;
      pitchBox.style.display = on ? 'grid' : 'none';
      if (on) {
        const vb = btns[4];
        vb.disabled = sh.vn <= 0;
        vb.textContent = sh.vn > 0 ? 'Vanish ✨ ×1' : 'Vanish: used';
      }
    }
    function showOver() {
      overBox.style.display = 'flex';
      overBox.textContent = '';
      const card = document.createElement('div');
      card.className = 'bb-card';
      const h2 = document.createElement('h2');
      const win = sh.over;
      const mineTeam = sh.teams[0].includes(me) ? 0 : sh.teams[1].includes(me) ? 1 : -1;
      h2.textContent = win === -1 ? 'A tie game!' : mineTeam === win ? 'You win! 🏆' : `${teamName(sh, win)} win!`;
      const p1 = document.createElement('p');
      p1.textContent = `${teamName(sh, 0)} ${sh.score[0]} – ${sh.score[1]} ${teamName(sh, 1)}`;
      const p2 = document.createElement('p');
      const st = sh.st[me];
      p2.textContent = st ? `You: ${st[0]} hit${st[0] === 1 ? '' : 's'}, ${st[1]} home run${st[1] === 1 ? '' : 's'}, ${st[2]} RBI` : `Career on this device: ${records.hits} hits, ${records.hr} home runs`;
      const row = document.createElement('div');
      row.className = 'row';
      let inns = sh.inns;
      const pick = [];
      for (const n of INNINGS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = `${n} inning${n > 1 ? 's' : ''}`;
        b.setAttribute('aria-pressed', String(n === inns));
        b.addEventListener('click', () => { inns = n; pick.forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
        pick.push(b);
        row.append(b);
      }
      const row2 = document.createElement('div');
      row2.className = 'row';
      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'go';
      again.textContent = 'Play again';
      again.addEventListener('click', () => {
        api.store.set('innings', inns);
        if (iOwn()) publish(newGame(players().map(m => m.id), inns, sh.g + 1));
        else api.send('again', { inns });
      });
      row2.append(again);
      card.append(h2, p1, p2, row, row2);
      overBox.append(card);
    }

    // --- input -------------------------------------------------------------------------
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      pointerHeld = true;
      batTick(now());
    });
    const up = () => { pointerHeld = false; batTick(now()); };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    const KEYS = { Digit1: 'fast', Digit2: 'slow', Digit3: 'curveL', Digit4: 'curveR', Digit5: 'vanish', ArrowUp: 'fast', ArrowDown: 'slow', ArrowLeft: 'curveL', ArrowRight: 'curveR', KeyV: 'vanish' };
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const down = e.type === 'keydown';
      if (e.code === 'Space' || e.code === 'Enter') {
        if (e.target?.tagName === 'BUTTON') return;
        if (role() !== 'bat') return;
        e.preventDefault();
        if (down && e.repeat) return;
        keyHeld = down;
        batTick(now());
      } else if (down && KEYS[e.code] && role() === 'pitch') {
        e.preventDefault();
        throwPitch(KEYS[e.code]);
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    let lastPad = {};
    function onPad(pad) {
      const r = role();
      padHeld = r === 'bat' && (!!pad.pressed?.[0] || pad.rt > 0.5);
      if (r === 'pitch') {
        const edge = k => pad[k] && !lastPad[k];
        if (pad.a) throwPitch('fast');
        else if (pad.yBtn) throwPitch('slow');
        else if (pad.xBtn) throwPitch('vanish');
        else if (edge('left')) throwPitch('curveL');
        else if (edge('right')) throwPitch('curveR');
      }
      if (sh?.phase === 'over' && pad.a) overBox.querySelector('.go')?.click();
      lastPad = { left: pad.left, right: pad.right };
    }

    // --- the frame -------------------------------------------------------------------------
    function hudTop() {
      const s = L.s;
      if (!sh) return;
      const land = L.panel;
      const x0 = land ? 10 : L.ox + 0.035 * s, y0 = land ? 12 : L.oy + 0.012 * s;
      const wd = land ? L.side - 20 : L.bw - 0.07 * s;
      const ht = land ? Math.min(150, h * 0.4) : 0.122 * s;
      ctx.fillStyle = 'rgba(8,12,34,0.88)';
      rr(x0, y0, wd, ht, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,212,59,0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const fs = clamp(ht * (land ? 0.16 : 0.28), 10, 22);
      // Inning.
      const innStr = `${sh.half ? '▼' : '▲'}${sh.inn}`;
      text(innStr, x0 + fs * 1.4, y0 + ht * (land ? 0.2 : 0.33), fs * 1.2, '#ffd43b');
      text(`of ${sh.inns}`, x0 + fs * 1.4, y0 + ht * (land ? 0.34 : 0.72), fs * 0.62, '#adb5bd', 'center', 700, null);
      // Teams and scores.
      const tx = x0 + fs * 2.9, tw = land ? wd - fs * 3.2 : wd * 0.52;
      for (const t of [0, 1]) {
        const ty = y0 + ht * (land ? 0.18 + t * 0.17 : 0.3 + t * 0.4);
        const batting = sh.half === t;
        ctx.fillStyle = TEAM_COLORS[t];
        ctx.beginPath(); ctx.arc(tx + fs * 0.35, ty, fs * 0.32, 0, Math.PI * 2); ctx.fill();
        if (batting) text('⚾', tx + fs * 0.35, ty, fs * 0.5, '#fff', 'center', 900, null);
        let name = teamName(sh, t);
        ctx.font = `800 ${fs * 0.8}px ${FONT}`;
        const maxW = tw - fs * 2.6;
        while (name.length > 3 && ctx.measureText(name).width > maxW) name = name.slice(0, -2) + '…';
        text(name, tx + fs * 0.9, ty, fs * 0.8, batting ? '#fff' : '#ced4da', 'left', 800, null);
        text(String(sh.score[t]), tx + tw - fs * 0.6, ty, fs * 1.05, '#ffd43b', 'center', 900, null);
      }
      // Count lights.
      const cx = land ? x0 + 24 : x0 + wd * 0.77, cy = land ? y0 + ht * 0.62 : y0 + ht * 0.21;
      const rows = [['B', sh.b, 4, '#69db7c'], ['S', sh.s, 3, '#ffd43b'], ['O', sh.outs, 3, '#ff5b5b']];
      const lg = land ? ht * 0.12 : ht * 0.29;
      rows.forEach(([lab, v, max, col], i) => {
        const yy = cy + i * lg;
        text(lab, cx - lg * 0.55, yy, lg * 0.7, '#ced4da', 'center', 900, null);
        for (let k = 0; k < max - 1; k++) {
          ctx.fillStyle = k < v ? col : 'rgba(255,255,255,0.22)';
          if (k < v) { ctx.shadowColor = col; ctx.shadowBlur = 6; }
          ctx.beginPath(); ctx.arc(cx + lg * 0.3 + k * lg * 1.0, yy, lg * 0.4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      if (land) {
        // The line-ups: who bats when.
        let yy = y0 + ht + 22;
        for (const t of [0, 1]) {
          text(t === sh.half ? 'Batting' : 'Fielding', 12, yy, 13, TEAM_COLORS[t], 'left', 900, null);
          yy += 18;
          const team = sh.teams[t].length ? sh.teams[t] : [CPU];
          team.forEach((id, k) => {
            const st = sh.st[id];
            const tag = id === sh.bat ? ' • up' : id === sh.pit ? ' • pitching' : '';
            text(`${k + 1}. ${nameOf(id)}${id === me ? ' (you)' : ''}${tag}${st ? `  ${st[0]}H ${st[1]}HR` : ''}`, 16, yy, 12, id === sh.bat || id === sh.pit ? '#fff' : '#adb5bd', 'left', 700, null);
            yy += 16;
          });
          yy += 8;
          if (yy > h - 20) break;
        }
      }
    }
    function statusLine() {
      if (!sh) return 'Setting up the board…';
      const r = role();
      if (sh.phase === 'over') return 'Game over';
      if (r === 'bat') {
        if (sh.phase === 'ready') return sh.pit === CPU ? 'Robo is choosing a pitch…' : `${nameOf(sh.pit)} is choosing a pitch…`;
        if (sh.phase === 'pitch') return 'Hold to pull back · let go to swing!';
        return 'Watch it roll…';
      }
      if (r === 'pitch') {
        if (sh.phase === 'ready') return 'Pick a pitch to throw';
        return `You're pitching to ${nameOf(sh.bat)}`;
      }
      const team = sh.teams[sh.half];
      const at = team.indexOf(me);
      if (at >= 0 && team.length > 1) {
        const k = (at - (sh.up[sh.half] % team.length) + team.length) % team.length;
        return k === 1 ? `${nameOf(sh.bat)} bats · you're on deck` : `${nameOf(sh.bat)} bats · you're ${ordinal(k)} in the order`;
      }
      const ft = sh.teams[1 - sh.half];
      if (ft.includes(me)) return `${nameOf(sh.pit)} pitches · your team is fielding`;
      return `${nameOf(sh.bat)} bats · ${nameOf(sh.pit)} pitches`;
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      const t = now();
      tick(t);
      draw(t);
    }
    function tick(t) {
      if (destroyed) return;
      batTick(t);
      ownerTick(t);
      if (ball && !ball.done && rollState(t).done) finishRoll(t);
    }

    function draw(t) {
      if (!L) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#10162e';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      if (shake) {
        const k = (t - shake.at) / 260;
        if (k >= 1) shake = null;
        else ctx.translate((Math.random() - 0.5) * shake.mag * (1 - k), (Math.random() - 0.5) * shake.mag * (1 - k));
      }
      if (!boardCache || (!boardCache.art && api.img('bb2-board'))) { boardCache = paintBoard(); boardCache.art = !!api.img('bb2-board'); }
      ctx.drawImage(boardCache, L.ox, L.oy, L.bw, L.bh);
      drawPockets(t);
      const fieldColor = sh ? TEAM_COLORS[1 - sh.half] : TEAM_COLORS[1];
      for (const f of FIELDERS) if (!f.soft) drawFielder(f, fieldColor, t);
      drawFielder({ x: CATCHER.x, y: CATCHER.y }, fieldColor, t);
      drawRunners(t);
      // The pitcher on the mound, winding up.
      const s = L.s;
      let wind = 0;
      if (cur && sh && cur.n === sh.pn && sh.phase === 'pitch') {
        const k = (t - (cur.t0 - cur.lead)) / cur.lead;
        if (k < 1) wind = Math.sin(clamp(k, 0, 1) * Math.PI);
      }
      if (sh) {
        const pr = PITCHER_R * s * (1 + wind * 0.12);
        drawFace(sh.pit, X(MOUND.x), Y(MOUND.y), pr, TEAM_COLORS[1 - sh.half]);
        if (wind > 0) {
          ctx.strokeStyle = `rgba(255,255,255,${0.6 * wind})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(X(MOUND.x), Y(MOUND.y), pr + 6, -Math.PI / 2, -Math.PI / 2 + wind * Math.PI * 2); ctx.stroke();
        }
        nameTag(sh.pit === me ? 'You' : nameOf(sh.pit), X(MOUND.x + 0.1), Y(MOUND.y - 0.035), TEAM_COLORS[1 - sh.half]);
      }
      // The ball: in flight from the mound, or rolling after a hit.
      if (ball) {
        const rs = rollState(t);
        const r = ball.r;
        let scale = 1, alpha = 1, by = rs.y;
        if (rs.done && r.end === 'pocket') {
          const k = clamp((t - (ball.doneAt || t)) / 300, 0, 1);
          scale = 1 - 0.55 * k; alpha = 1 - 0.6 * k;
        } else if (rs.done && r.end === 'over') {
          const k = clamp((t - (ball.doneAt || t)) / 700, 0, 1);
          scale = 1 + k * 1.6; alpha = 1 - k; by = rs.y - k * 0.25;
        }
        if (!(rs.done && r.end === 'pocket' && t - (ball.doneAt || t) > 1500)) drawBall(rs.x, by, scale, rs.steps * 0.05, alpha);
      } else if (cur && sh && (sh.phase === 'pitch' || (sh.phase === 'play' && sh.play?.n === cur.n)) && cur.n === sh.pn) {
        const tt = pitchClock();
        if (tt <= cur.p.end + 0.6) {
          const b = pitchAt(cur.p, Math.min(tt, cur.p.end));
          if (b.held) {
            const k = clamp(1 + tt / (cur.lead / 1000), 0, 1);
            drawBall(MOUND.x + Math.sin(k * 9) * 0.012, PITCH_Y0 - 0.01, 0.9);
          } else if (b.under) {
            // Under the board: a faint shadow through the hatch.
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), BR * s * 0.8, 0, Math.PI * 2); ctx.fill();
          } else {
            const near = cur.p.vanish ? clamp(Math.min(Math.abs(b.y - HATCH[0]), Math.abs(b.y - HATCH[1])) / 0.02, 0.3, 1) : 1;
            drawBall(b.x, b.y, near, tt * 12);
          }
        }
      }
      // The batter: their face beside the plate, the bat in their hands.
      if (sh) {
        const team = TEAM_COLORS[sh.half];
        ctx.fillStyle = team;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(X(PIVOT.x - 0.07), Y(PIVOT.y + 0.012), 0.05 * s, 0.075 * s, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        drawBat(t);
        drawFace(sh.bat, X(PIVOT.x - 0.095), Y(PIVOT.y + 0.01), 0.058 * s, team);
        nameTag(sh.bat === me ? 'You' : nameOf(sh.bat), X(PIVOT.x - 0.095), Y(PIVOT.y + 0.095), team);
      }
      // Effects.
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i];
        const k = (t - f.at) / f.life;
        if (k >= 1) { fx.splice(i, 1); continue; }
        if (k < 0) continue;
        if (f.kind === 'spark') {
          const dt = (t - f.at) / 1000;
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = f.color;
          ctx.beginPath(); ctx.arc(X(f.x + f.vx * dt), Y(f.y + f.vy * dt + 0.2 * dt * dt), Math.max(1.5, 0.005 * s * (1 - k)), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        } else if (f.kind === 'ring') {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 4 * (1 - k) + 1;
          ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), (0.03 + 0.09 * easeOut(k)) * s, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        const k = (t - f.at) / 1100;
        if (k >= 1) { floats.splice(i, 1); continue; }
        if (k < 0) continue;
        ctx.globalAlpha = 1 - k * k;
        text(f.text, X(f.x), Y(f.y - 0.06 * k), f.size * s * (k < 0.15 ? 0.6 + k * 2.7 : 1), f.color);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      hudTop();
      // The banner.
      if (banner) {
        const k = (t - banner.at) / (banner.big ? 2600 : 1700);
        if (k >= 1) banner = null;
        else if (k >= 0) {
          const pop = k < 0.12 ? 0.5 + (k / 0.12) * 0.6 : k < 0.2 ? 1.1 - ((k - 0.12) / 0.08) * 0.1 : 1;
          const fade = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
          ctx.globalAlpha = fade;
          const by = Y(0.9);
          const size = (banner.big ? 0.13 : 0.1) * s * pop;
          text(banner.text, X(0.5), by, size, banner.color, 'center', 900, 'rgba(10,10,30,0.85)');
          if (banner.sub) text(banner.sub, X(0.5), by + size * 0.75, clamp(0.038 * s, 11, 20), '#fff');
          ctx.globalAlpha = 1;
        }
      }
      // Whose turn, and what to do.
      const msg = statusLine();
      const fs = clamp(0.032 * s, 11, 17);
      if (L.panel) {
        const x0 = L.ox + L.bw + 10;
        const lines = [msg];
        if (role() === 'bat') lines.push('Space / A held: pull · release: swing');
        if (role() === 'pitch' && sh?.phase === 'ready') lines.push('Keys 1-5 or arrows · V vanish');
        const mid = x0 + (L.side - 20) / 2;
        // Who's at bat and who's pitching, face to face.
        if (sh) {
          const fr = clamp(h * 0.09, 22, 44);
          [[sh.bat, 'AT BAT', TEAM_COLORS[sh.half]], [sh.pit, 'PITCHING', TEAM_COLORS[1 - sh.half]]].forEach(([id, lab, col], k) => {
            const cx = mid + (k ? 1 : -1) * Math.min(L.side * 0.24, fr * 2.4), cy = 16 + fr;
            drawFace(id, cx, cy + 14, fr, col);
            text(lab, cx, cy + fr + 26, 11, col, 'center', 900, null);
            text(id === me ? 'You' : nameOf(id), cx, cy + fr + 42, 13, '#fff', 'center', 800, null);
          });
        }
        lines.forEach((ln, i) => text(ln, mid, 2 * clamp(h * 0.09, 22, 44) + 88 + i * (fs + 8), fs, i ? '#adb5bd' : '#fff', 'center', 800, null));
      } else {
        ctx.font = `800 ${fs}px ${FONT}`;
        const tw = ctx.measureText(msg).width + fs * 1.4;
        const by = Y(0.135) + fs * 0.4;
        ctx.fillStyle = 'rgba(8,12,34,0.8)';
        rr(w / 2 - tw / 2, by - fs * 0.75, tw, fs * 1.5, fs * 0.75);
        ctx.fill();
        text(msg, w / 2, by, fs, role() === 'watch' ? '#ced4da' : '#ffd43b', 'center', 800, null);
      }
    }

    // --- start ---------------------------------------------------------------------------------
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();
    afterShared();
    raf = requestAnimationFrame(frame);
    // Keep the game moving when frames are throttled (a hidden bot window).
    timer = setInterval(() => tick(now()), 50);

    // A test bot's move (js/rookie.js): pitch when it's my turn to, and bat
    // with a planned swing (a press and a let-go at about the right times).
    function rookie() {
      if (!sh) return;
      if (sh.pit === me && sh.phase === 'ready' && Math.random() < 0.5) throwPitch(cpuPitch(sh).type);
      if (sh.bat === me && cur && cur.n === sh.pn && sh.phase === 'pitch' && botPlan?.n !== cur.n) {
        const plan = planSwing(cur.p, Math.random, 0.2) || (Math.random() < 0.3 ? { pull: 0.9, tRel: cur.p.T - 0.25 } : null);
        botPlan = { n: cur.n, timers: [] };
        if (!plan) return;
        const relAt = cur.t0 + plan.tRel * 1000;
        const pressAt = relAt - holdFor(plan.pull);
        const at = ms => Math.max(0, ms - now());
        botPlan.timers.push(setTimeout(() => { pointerHeld = true; batTick(now()); }, at(pressAt)));
        botPlan.timers.push(setTimeout(() => { pointerHeld = false; batTick(now()); }, at(Math.max(relAt, pressAt + 30))));
      }
    }

    return {
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        clearInterval(timer);
        botPlan?.timers.forEach(clearTimeout);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        root.remove();
      },
      onChange() {
        const next = readShared(api.shared());
        if (!next) return;
        sh = next;
        afterShared();
      },
      onPad,
      rookie,
      // For the browser checks.
      _view() {
        const t = now();
        return {
          me, owner: api.owner(), role: role(), sh: sh && JSON.parse(JSON.stringify(sh)),
          pitch: cur && { n: cur.n, type: cur.type, t: pitchClock(), T: cur.p.T, end: cur.p.end, t0: cur.t0 },
          bat: { mode: bat.mode, th: batAngle(t), by: bat.by },
          ball: ball && { n: ball.n, end: ball.r.end, slot: ball.r.slot ?? -1, x: ball.r.x, y: ball.r.y, res: ball.res, done: ball.done, L: ball.L, ...(() => { const r = rollState(t); return { px: r.x, py: r.y }; })() },
          banner: banner?.text ?? null, stats: { ...stats }, layout: { ...L }, status: statusLine(), buttons: pitchBox.style.display !== 'none',
        };
      },
      // The release time (s after the pitch leaves the mound) whose swing with
      // `pull` sends the ball closest to `angle` (radians off straight up, +
      // right); with `want` (outcomes such as '123H') only a release whose
      // neighbours a few ms either side roll to one of them too.
      _aim(pull, angle = 0, want = null, earliest = 0) {
        if (!cur || !sh) return null;
        // A wanted result the asked pull can't give reliably: try other pulls.
        if (want && !this._aim1(pull, angle, want, earliest)) {
          for (const p of [PULL_MAX, 1.0, 0.8, 0.6, 0.4]) {
            const r = this._aim1(p, angle, want, earliest);
            if (r) return r;
          }
        }
        return this._aim1(pull, angle, want, earliest);
      },
      _aim1(pull, angle = 0, want = null, earliest = 0) {
        if (!cur || !sh) return null;
        const res = tRel => {
          const c = findContact(cur.p, pull, tRel);
          return c ? { c, o: outcome(roll(c.L, sh.su, cur.lead), sh.pk, sh.bonus) } : null;
        };
        let best = null;
        for (let tRel = -0.6; tRel < cur.p.end; tRel += 0.004) {
          const r = res(tRel);
          if (!r || cur.t0 + tRel * 1000 - holdFor(pull) < earliest) continue;
          if (want) {
            if (!want.includes(r.o)) continue;
            // Robust to a test browser's timing jitter (its release may be up to 15 ms
            // late): the same result 18 ms either side.
            const near = [-0.018, -0.012, -0.006, 0.006, 0.012, 0.018].map(d => res(tRel + d));
            if (near.some(n => !n || !want.includes(n.o))) continue;
          }
          const ang = Math.atan2(r.c.L.vx, -r.c.L.vy);
          if (!best || Math.abs(ang - angle) < best.err) best = { tRel, err: Math.abs(ang - angle), L: r.c.L, o: r.o };
        }
        return best && { tRel: best.tRel, t0: cur.t0, hold: holdFor(pull), L: best.L, o: best.o };
      },
    };
  },
};

export const _physics = {
  makePitch, pitchAt, inZone, makeSwing, swingAt, swingSpeed, pullFor, holdFor, batHit, findContact, swingCounts,
  roll, sliderPos, sliderU, dealLabels, nudgeLabels, pickBonus, slotLabel, outcome, nearestFielder, advance, walk,
  syncTeams, newGame, applyResult, batterOf, pitcherOf, readShared, readPitchMsg, readBatMsg, readSwingMsg, readLaunch,
  planSwing, cpuPitch, rng, fair, POCKETS, FIELDERS, SLOTS, TH_REST, PULL_MAX, VMAX, CPU,
  PIVOT, HOME, HATCH, BASES, MOUND, APEX,
};

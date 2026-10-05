// Act III — The Sea King's Court. Cross the hall on the processional
// grooves, freeze among the courtiers when the king's gaze lantern sweeps,
// dash while the whale masks the hall, and take her pearl from the pedestal
// by the throne. Design: design/acts.md, "Act III". Headless: drawing is in
// act3-art.js.
import { beatPhase, clamp, lerp, easeInOut } from './shared.js';
import * as art from './act3-art.js';

// ---------------------------------------------------------------- the set
export const ROWY = [432, 512, 596];           // the three grooves (Act I's rows)
export const ROWSCALE = [0.72, 0.86, 1.0];
export const XMIN = 190, XMAX = 1100;
export const START = { row: 2, x: 200 };
export const THRONE_X = 690, WITCH_X = 875;
export const PEDESTAL = { row: 0, x: 1068, reach: 46 };
export const LANTERN = { x: 985, y: 236 };    // the gaze lantern's eye
export const SENTRIES = [470, 745, 1000];      // along the front groove
export const BEAT = 60 / 76.5;                  // fallback only; input.beat drives

export const TUNE = {
  walk: 112, rowTween: 0.26, grace: 1.6, lanterns: 3,
  restAim: 0, warn: 1.25, hold: 0.85, sweepSpeed: 300, lock: 0.75, rest: [0.8, 1.6],
  aimRange: [340, 1000],           // patrol targets (beam centre x)
  cover: 56,                      // half-width of an attendant's cover
  snapOpen: 0.38,                 // fraction of each beat the jaws are open
  whaleFirst: 21, whaleEvery: [20, 25], whaleDur: 5, whaleMask: [0.9, 4.0],
  fishDur: 4.2,
  caught: 1.8, haul: 300, haulDur: 0.7,
};
// The rest aim lights the pedestal: the king keeps his eye on his treasure.
TUNE.restAim = PEDESTAL.x;

// Win sequence, seconds per phase.
export const OUTRO = { take: 1.3, turn: 2.0, lunge: 0.9, iris: 1.3 };
const OUTRO_ORDER = ['take', 'turn', 'lunge', 'iris'];

const COURTIERS = [
  { kind: 'pink', row: 0, x: 380, a: 250, b: 820, step: 42, pat: 'SSSR', dir: 1 },
  { kind: 'guard', row: 0, x: 780, a: 640, b: 955, step: 40, pat: 'SSRR', dir: -1 },
  { kind: 'green', row: 1, x: 300, a: 210, b: 760, step: 46, pat: 'SSSR', dir: 1 },
  { kind: 'blue', row: 1, x: 940, a: 600, b: 1090, step: 44, pat: 'SSRS', dir: -1 },
  { kind: 'guard', row: 1, x: 560, a: 400, b: 720, step: 38, pat: 'SRSR', dir: 1 },
  { kind: 'green', row: 2, x: 620, a: 230, b: 1060, step: 50, pat: 'SSSSR', dir: -1 },
];
const PEARLS = [[2, 345], [2, 610], [2, 875], [1, 450], [1, 830], [0, 540]];

// ---------------------------------------------------------------- helpers
// The beam falls as a long pool of light across all three grooves, a little
// wider toward the audience. `aim` is the x of its centre.
export function beamOn(aim, row) {
  return { cx: aim, hw: [62, 70, 80][row] };
}
export const effRow = (p) => (p.rowT < 0.5 ? p.from : p.row);
export const rowY = (p) => lerp(ROWY[p.from], ROWY[p.row], easeInOut(p.rowT));
export const rowScale = (p) => lerp(ROWSCALE[p.from], ROWSCALE[p.row], easeInOut(p.rowT));

function rand(st) {
  let s = st.rs;
  s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
  st.rs = s;
  return s / 4294967296;
}

// The whale's track, right to left: a fast entrance, a slow glide across the
// lantern while it masks the hall, a fast exit.
export function whaleX(t) {
  if (t < 1) return lerp(1900, 1080, 1 - (1 - t) ** 2);
  if (t < 4) return lerp(1080, 520, (t - 1) / 3);
  return lerp(520, -620, ((t - 4) / 1) ** 2);
}
export const fishX = (t) => lerp(1480, -220, t / TUNE.fishDur);

// Advance the gaze. It rests on the pedestal, then patrols: for each leg it
// winds up (warn: the lantern pulses and a dotted arrow shows where it will
// go), then sweeps there. The last leg returns it to the pedestal.
// `emit` and `pick` are null when predicting.
function stepGaze(g, dt, emit, pick) {
  if (g.lock > 0) { g.lock -= dt; return; }
  g.t += dt;
  if (g.phase === 'rest') {
    g.aim = TUNE.restAim;
    if (g.t >= g.dur && pick) { g.legs = pick(); toWarn(g, TUNE.warn, emit); }
  } else if (g.phase === 'warn') {
    if (g.t >= g.dur) { g.phase = 'sweep'; g.t = 0; g.from = g.aim; g.dur = Math.max(0.3, Math.abs(g.to - g.from) / TUNE.sweepSpeed); if (emit) emit({ type: 'gazeSweep' }); }
  } else if (g.phase === 'sweep') {
    const k = clamp(g.t / g.dur, 0, 1);
    g.aim = lerp(g.from, g.to, easeInOut(k));
    if (k >= 1) {
      if (g.legs.length) toWarn(g, TUNE.hold, emit);
      else { g.phase = 'rest'; g.t = 0; g.dur = pick ? TUNE.rest[0] + pick(true) * (TUNE.rest[1] - TUNE.rest[0]) : 9; }
    }
  }
}
function toWarn(g, dur, emit) {
  g.phase = 'warn'; g.t = 0; g.dur = dur; g.to = g.legs.shift();
  if (emit) emit({ type: 'gazeTurn', to: g.to });
}

// Is a point on a groove in the beam, for this aim?
export function litAt(aim, row, x) {
  const { cx, hw } = beamOn(aim, row);
  return Math.abs(x - cx) < hw * 0.82 + 8;
}

// ---------------------------------------------------------------- module
export default {
  id: 3, key: 'court', kicker: 'Act III', title: "The Sea King's Court", size: 110,
  sub: 'Hold A to freeze among the courtiers as the gaze sweeps.\nTake her pearl while the whale masks the hall.',
  action: 'Hold A: freeze · A: take',

  create({ seed = 1, carry = {} } = {}) {
    const st = {
      status: 'play', statusT: 0, events: [], result: null,
      phase: 'play', phaseT: 0, t: 0,
      rs: (seed >>> 0) || 1,
      carry: { tea: carry.tea || 0, rose: !!carry.rose },
      beat: 0, beatN: null, steps: 0,
      p: { row: START.row, from: START.row, rowT: 1, x: START.x, face: 1, frozen: false, walk: 0, grace: 0, hidden: false, lit: false },
      lanterns: TUNE.lanterns, score: 0, pearls: 0, taken: false,
      courtiers: COURTIERS.map((c) => ({ ...c, x0: c.x, x1: c.x })),
      pearlsOnFloor: PEARLS.map(([row, x]) => ({ row, x, got: false })),
      sentries: SENTRIES.map((x) => ({ x, open: false })),
      gaze: { phase: 'rest', t: 0, dur: 4, aim: TUNE.restAim, from: TUNE.restAim, to: TUNE.restAim, lock: 0, legs: [] },
      whale: { t: -1, next: TUNE.whaleFirst, warned: false, passes: 0 },
      fish: { t: -1, next: TUNE.whaleFirst + 10 },
      masked: false, canTake: false, omens: [], unseenPass: false, cause: null,
      stats: { freezes: 0, hiddenPasses: 0, maskedTime: 0, hits: 0 },
    };
    return st;
  },

  step(st, dt, input = {}) {
    st.statusT += dt;
    st.t += dt;
    st.beat = input.beat ?? st.beat + dt / BEAT;
    if (st.status !== 'play') return;
    st.phaseT += dt;
    const emit = (e) => st.events.push(e);

    beatMachinery(st, emit);
    stepPassers(st, dt, emit);

    if (st.phase === 'play') play(st, dt, input, emit);
    else if (st.phase === 'caught') {
      if (st.phaseT >= TUNE.caught) { st.status = 'lost'; st.statusT = 0; }
    } else {
      if (st.phase === 'lunge' && !st.swallowed) { st.swallowed = true; emit({ type: 'swallow' }); }
      if (st.phaseT >= OUTRO[st.phase]) {
        const i = OUTRO_ORDER.indexOf(st.phase) + 1;
        if (i >= OUTRO_ORDER.length) {
          st.status = 'won'; st.statusT = 0;
          st.result = { keepsakes: { pearl: true }, score: st.score, pearls: st.pearls };
        } else {
          st.phase = OUTRO_ORDER[i]; st.phaseT = 0;
          if (st.phase === 'turn') emit({ type: 'whaleTurn' });
        }
      }
    }
  },

  hud(st) {
    if (st.phase !== 'play' && st.phase !== 'caught' && st.phase !== 'take') return null;
    const ks = [];
    if (st.carry.tea >= 3) ks.push({ id: 'tea', have: true });
    if (st.carry.rose) ks.push({ id: 'rose', have: true });
    ks.push({ id: 'pearl', have: st.taken });
    return {
      lanterns: st.lanterns, maxLanterns: 3, pearls: st.pearls,
      progress: clamp((st.p.x - XMIN) / (PEDESTAL.x - XMIN) * 0.85 + (st.p.row === 0 ? 0.15 : st.p.row === 1 ? 0.07 : 0), 0, 1),
      keepsakes: ks,
    };
  },

  announce(e) {
    if (e.type === 'hit') return `Hit. ${e.lanterns} lantern${e.lanterns === 1 ? '' : 's'} left.`;
    if (e.type === 'spotted') return 'Spotted by the gaze lantern!';
    if (e.type === 'gazeTurn') return 'The gaze lantern turns.';
    if (e.type === 'whaleNear') return 'The whale is coming.';
    if (e.type === 'whalePass') return 'The whale masks the hall. Go for the pearl!';
    if (e.type === 'pearlTaken') return 'You take her pearl.';
    if (e.type === 'swallow') return 'The whale swallows the court.';
    return null;
  },

  draw: art.draw, drawOver: art.drawOver, onEvent: art.onEvent,
};

// ---------------------------------------------------------------- the beat
function beatMachinery(st, emit) {
  const n = Math.floor(st.beat), ph = beatPhase(st.beat);
  if (st.beatN == null) st.beatN = n;
  if (n !== st.beatN) {
    if (n > st.beatN) onBeat(st, n, emit);
    st.beatN = n;
  }
  // Courtiers slide into their step in the first part of each beat.
  const k = easeInOut(ph / 0.42);
  for (const c of st.courtiers) c.x = lerp(c.x0, c.x1, k);
  // Sentry jaws snap open on the beat (asleep under the rose).
  const open = !st.carry.rose && ph < TUNE.snapOpen && st.phase !== 'turn' && st.phase !== 'lunge' && st.phase !== 'iris';
  for (const s of st.sentries) s.open = open;
}

function onBeat(st, n, emit) {
  let stepped = false;
  for (const c of st.courtiers) {
    c.x0 = c.x1;
    if (c.pat[((n % c.pat.length) + c.pat.length) % c.pat.length] !== 'S') continue;
    let nx = c.x1 + c.dir * c.step;
    if (nx < c.a || nx > c.b) { c.dir = -c.dir; nx = c.x1 + c.dir * c.step; }
    c.x1 = nx; stepped = true;
  }
  if (stepped) { st.steps++; emit({ type: 'courtierStep' }); }
  if (!st.carry.rose && st.phase === 'play' && effRow(st.p) === 2) emit({ type: 'sentrySnap' });
}

// ---------------------------------------------------------------- whale and fish
function stepPassers(st, dt, emit) {
  const w = st.whale, f = st.fish;
  if (w.t < 0) {
    w.next -= dt;
    if (!w.warned && w.next <= 2) { w.warned = true; emit({ type: 'whaleNear' }); }
    if (w.next <= 0) { w.t = 0; w.passes++; emit({ type: 'whalePass' }); }
  } else {
    w.t += dt;
    if (w.t >= TUNE.whaleDur) {
      w.t = -1; w.warned = false;
      const [a, b] = TUNE.whaleEvery;
      w.next = a + rand(st) * (b - a) - TUNE.whaleDur;
      f.next = Math.min(f.next, 7 + rand(st) * 3);
    }
  }
  if (f.t < 0) {
    f.next -= dt;
    if (f.next <= 0 && w.t < 0 && w.next > TUNE.fishDur + 1) { f.t = 0; emit({ type: 'fishPass' }); }
    else if (f.next <= 0) f.next = 1;
  } else {
    f.t += dt;
    if (f.t >= TUNE.fishDur) { f.t = -1; f.next = 99; }
  }
  const wm = w.t >= TUNE.whaleMask[0] && w.t <= TUNE.whaleMask[1];
  const fm = f.t >= 0 && Math.abs(fishX(f.t) - LANTERN.x) < 170;
  st.masked = wm || fm;
  st.maskedBy = wm ? 'whale' : fm ? 'fish' : null;
}

// ---------------------------------------------------------------- play
function play(st, dt, input, emit) {
  const p = st.p, g = st.gaze;
  p.grace = Math.max(0, p.grace - dt);
  if (p.rowT < 1) p.rowT = Math.min(1, p.rowT + dt / TUNE.rowTween);

  // Take the pearl.
  const atPedestal = effRow(p) === PEDESTAL.row && Math.abs(p.x - PEDESTAL.x) < PEDESTAL.reach;
  // The pearl can only be lifted in the whale's shadow, and the whale is
  // there to turn and swallow the court the moment it is taken.
  st.canTake = atPedestal && st.maskedBy === 'whale';
  if (input.a && st.canTake) {
    st.taken = true; st.phase = 'take'; st.phaseT = 0; p.frozen = false;
    st.score += 300 + st.lanterns * 100;
    emit({ type: 'pearlTaken' });
    return;
  }

  // Being hauled back after a spotting: no control for a moment.
  const hauled = p.haulT != null && p.haulT < 1;
  if (hauled) {
    p.haulT = Math.min(1, p.haulT + dt / TUNE.haulDur);
    p.x = lerp(p.haulFrom, p.haulTo, easeInOut(p.haulT));
  }
  // Freeze, walk, change groove.
  const wasFrozen = p.frozen;
  p.frozen = !!input.aHeld && !hauled;
  if (p.frozen && !wasFrozen) { st.stats.freezes++; emit({ type: 'freeze' }); }
  p.moving = false;
  if (!p.frozen && !hauled) {
    const mx = clamp(input.moveX || 0, -1, 1);
    p.moving = !!mx;
    if (mx) { p.x = clamp(p.x + mx * TUNE.walk * dt, XMIN, XMAX); p.face = mx > 0 ? 1 : -1; p.walk += Math.abs(mx) * dt; }
    if (p.rowT >= 1) {
      if (input.up && p.row > 0) { p.from = p.row; p.row--; p.rowT = 0; emit({ type: 'groove' }); }
      else if (input.down && p.row < 2) { p.from = p.row; p.row++; p.rowT = 0; emit({ type: 'groove' }); }
    }
  }

  // Pearls along the grooves.
  const r = effRow(p);
  for (const q of st.pearlsOnFloor) {
    if (!q.got && q.row === r && Math.abs(q.x - p.x) < 28) { q.got = true; st.pearls++; st.score += 10; emit({ type: 'pearl', x: q.x, y: ROWY[q.row] }); }
  }

  // The gaze.
  const pick = (rest) => (rest ? rand(st) : patrol(st));
  stepGaze(g, dt, emit, pick);
  p.hidden = p.frozen && st.courtiers.some((c) => c.kind !== 'guard' && c.row === r && Math.abs(c.x - p.x) < TUNE.cover * ROWSCALE[r]);
  p.lit = !st.masked && litAt(g.aim, r, p.x);
  if (st.masked) st.stats.maskedTime += dt;

  if (p.lit && p.hidden) st.unseenPass = true;
  if (!p.lit && st.unseenPass) { st.unseenPass = false; st.score += 25; st.stats.hiddenPasses++; emit({ type: 'unseen', x: p.x, y: rowY(p) }); }

  if (p.lit && !p.hidden && p.grace <= 0) {
    g.lock = TUNE.lock; st.unseenPass = false;
    emit({ type: 'spotted', x: p.x, y: rowY(p) });
    hit(st, 'gaze', emit);
    // a seahorse guard's crook hauls him back toward the entrance
    if (st.phase === 'play') { p.haulFrom = p.x; p.haulTo = Math.max(XMIN, p.x - TUNE.haul); p.haulT = 0; emit({ type: 'hauledBack' }); }
  }
  // Guards bump; open jaws bite.
  for (const c of st.courtiers) {
    if (c.kind === 'guard' && c.row === r && p.rowT >= 0.35 && Math.abs(c.x - p.x) < 34 * ROWSCALE[r] && p.grace <= 0) {
      emit({ type: 'guardBump', x: p.x, y: rowY(p) });
      hit(st, 'guard', emit);
      p.x = clamp(p.x + (p.x < c.x ? -36 : 36), XMIN, XMAX);
    }
  }
  if (r === 2) for (const s of st.sentries) {
    if (s.open && Math.abs(s.x - p.x) < 46 && p.grace <= 0) { emit({ type: 'sentryBite', x: p.x, y: rowY(p) }); hit(st, 'sentry', emit); }
  }

  // Tea-leaf omens, one beat ahead of each hazard.
  st.omens.length = 0;
  if (st.carry.tea >= 3) {
    if (!p.lit && !st.masked) {
      const ahead = { ...g, legs: g.legs.slice() };
      stepGaze(ahead, BEAT, null, null);
      if (litAt(ahead.aim, r, p.x)) st.omens.push({ x: p.x, y: rowY(p) - 175 * ROWSCALE[r], kind: 'gaze' });
    }
    const ph = beatPhase(st.beat);
    if (!st.carry.rose && ph >= TUNE.snapOpen && r >= 1) {
      for (const s of st.sentries) if (Math.abs(s.x - p.x) < 210) st.omens.push({ x: s.x, y: 560, kind: 'sentry' });
    }
  }
}

// A patrol of two or three legs that swing well across the hall, then home.
function patrol(st) {
  const [lo, hi] = TUNE.aimRange, legs = [];
  let at = TUNE.restAim;
  const count = 3 + (rand(st) < 0.5 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    let x;
    do x = lo + rand(st) * (hi - lo); while (Math.abs(x - at) < 360);
    legs.push(Math.round(x)); at = x;
  }
  legs.push(TUNE.restAim);
  return legs;
}

function hit(st, cause, emit) {
  const p = st.p;
  if (p.grace > 0 || st.phase !== 'play') return;
  st.lanterns--; p.grace = TUNE.grace; st.cause = cause; st.stats.hits++;
  emit({ type: 'hit', lanterns: st.lanterns, cause });
  if (st.lanterns <= 0) {
    st.phase = 'caught'; st.phaseT = 0; p.frozen = false;
    st.lostTitle = 'Seized by\nthe Court';
    st.lostSub = cause === 'sentry' ? 'The red sentries do not sleep for strangers.'
      : cause === 'guard' ? 'The seahorse guard has you by the collar.'
      : "The Sea King's lantern found you out.";
    emit({ type: 'caught' });
  }
}


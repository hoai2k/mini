// Act III — The Sea King's Court. Cross the hall on the processional
// grooves, freeze among the courtiers when the king's gaze lantern sweeps,
// dash while the whale masks the hall, and take her pearl from the pedestal
// by the throne. Design: design/acts.md, "Act III". Headless: drawing is in
// act3-art.js.
import { beatPhase, clamp, lerp, easeInOut } from './shared.js';
import { FILM } from '../theme.js';
import * as art from './act3-art.js';

// ---------------------------------------------------------------- the set
// The court is a long processional gallery on a moving panorama: the floor
// (grooves, courtiers, sentries) is HALL_W wide and rolls past 1:1 as the
// sailor advances; the back wall with the throne, the king, the witch and the
// gaze lantern rolls at PAR, so the king is in view from the start and the
// pedestal ends up beside him. x is floor (world) x; st.cam is the scroll.
export const ROWY = [432, 512, 596];           // the three grooves (Act I's rows)
export const ROWSCALE = [0.72, 0.86, 1.0];
export const HALL_W = 3100, PAR = 0.12;
export const CAM_MAX = HALL_W - 1280;
export const XMIN = 190, XMAX = 2730;
export const START = { row: 2, x: 200 };
export const PEDESTAL = { row: 0, x: 2700, reach: 46 };
// Back-wall pieces, in screen x at cam 0 (screen x = BX - cam * PAR). The
// throne stands on the backcloth's painted dais, which is centred on it.
// The film edition's opening passage: three sets walked left to right (stage
// px, feet at y). Each lobster guard's claws open and shut across the way.
export const PASSAGE = {
  y: 640, x0: 190, exit: 1190, walk: 250, acc: 2000, fade: 0.6, hw: 18, knock: 300,
  guards: [{ x: 520, phase: 0 }, { x: 900, phase: 1.3 }], open: 1.7, shut: 1.3, guardW: 70,
  pearls: [[420, 470], [640, 400], [860, 470]],
};
export const TRANSFORM = PASSAGE.fade;
export const THRONE_BX = 800, WITCH_BX = 965, LANTERN_BX = 600;
export const DAIS_Y = 372;                      // where the throne stands
export const LANTERN_Y = 249;                   // the gaze lantern's painted pupil
export const SENTRIES = [470, 760, 1050, 1420, 1720, 2010, 2330, 2620]; // along the front groove
// The sentries face right; their snapping head is this far right of centre.
export const SENTRY_HEAD = 50, SENTRY_REACH = 42;
// Scenes: where a retry or the scene select starts. Each stands on the front
// groove midway between two sentry jaws (heads at sentry x + SENTRY_HEAD), clear
// of every courtier, and a checkpoint is set as the sailor crosses its x.
export const SCENES = [
  { name: 'The Hall Doors', x: START.x, row: START.row },
  { name: 'Before the Throne', x: 955, row: 2 },
  { name: "The Witch's Side", x: 1620, row: 2 },
  { name: 'The Treasury Steps', x: 2220, row: 2 },
];
export const BEAT = 60 / 76.5;                  // fallback only; input.beat drives

export const TUNE = {
  walk: 150, rowTween: 0.26, grace: 1.6, lanterns: 3,
  // The gaze: dark for a while, then a warning (time to find a courtier), then
  // the beam sweeps right across the stage from one wing and off the other.
  firstDark: 4, warn: 3, sweepSpeed: 230, margin: 260, lock: 0.75, rest: [5, 8],
  cover: 64,                      // half-width of an attendant's cover
  snapOpen: 0.38,                 // fraction of each beat the jaws are open
  whaleFirst: 20, whaleEvery: [20, 25], whaleDur: 5, whaleMask: [0.9, 4.0],
  fishDur: 4.2,
  caught: 1.8,
};
// Where the beam rests while the lantern is dark: nowhere on the floor.
export const GAZE_OFF = -10000;

// Win sequence, seconds per phase.
export const OUTRO = { take: 1.3, turn: 2.0, lunge: 0.9, iris: 1.3 };
const OUTRO_ORDER = ['take', 'turn', 'lunge', 'iris'];

const COURTIERS = [
  { kind: 'pink', row: 0, x: 380, a: 250, b: 900, step: 42, pat: 'SSSR', dir: 1 },
  { kind: 'guard', row: 0, x: 1000, a: 820, b: 1300, step: 40, pat: 'SSRR', dir: -1 },
  { kind: 'blue', row: 0, x: 1500, a: 1220, b: 1900, step: 42, pat: 'SSSR', dir: 1 },
  { kind: 'guard', row: 0, x: 2000, a: 1820, b: 2240, step: 40, pat: 'SRSR', dir: -1 },
  { kind: 'green', row: 0, x: 2350, a: 2150, b: 2620, step: 42, pat: 'SSRS', dir: 1 },
  { kind: 'pink', row: 0, x: 2500, a: 2380, b: 2620, step: 40, pat: 'SSRR', dir: -1 },
  { kind: 'green', row: 1, x: 300, a: 210, b: 780, step: 46, pat: 'SSSR', dir: 1 },
  { kind: 'guard', row: 1, x: 760, a: 620, b: 1020, step: 38, pat: 'SRSR', dir: 1 },
  { kind: 'pink', row: 1, x: 1300, a: 940, b: 1640, step: 44, pat: 'SSRS', dir: -1 },
  { kind: 'green', row: 1, x: 1900, a: 1540, b: 2200, step: 46, pat: 'SSSR', dir: 1 },
  { kind: 'guard', row: 1, x: 2300, a: 2120, b: 2520, step: 40, pat: 'SRSR', dir: -1 },
  { kind: 'blue', row: 1, x: 2560, a: 2380, b: 2720, step: 44, pat: 'SSSR', dir: 1 },
  { kind: 'blue', row: 2, x: 620, a: 230, b: 1120, step: 50, pat: 'SSSSR', dir: -1 },
  { kind: 'pink', row: 2, x: 1600, a: 1140, b: 2060, step: 48, pat: 'SSSR', dir: 1 },
  { kind: 'green', row: 2, x: 2450, a: 2080, b: 2720, step: 48, pat: 'SSSSR', dir: -1 },
];
const PEARLS = [[2, 345], [1, 470], [0, 620], [2, 905], [1, 1160], [0, 1380], [2, 1570], [1, 1850], [0, 2060], [2, 2180], [1, 2450], [0, 2600]];

// ---------------------------------------------------------------- helpers
// The beam falls as a long pool of light across all three grooves, a little
// wider toward the audience. `aim` is the x of its centre.
export function beamOn(aim, row) {
  return { cx: aim, hw: [58, 66, 74][row] };
}
export const effRow = (p) => (p.rowT < 0.5 ? p.from : p.row);
export const rowY = (p) => lerp(ROWY[p.from], ROWY[p.row], easeInOut(p.rowT));
export const rowScale = (p) => lerp(ROWSCALE[p.from], ROWSCALE[p.row], easeInOut(p.rowT));
// Where a back-wall piece stands on screen for a scroll.
export const backX = (bx, cam) => bx - cam * PAR;
// The camera keeps the sailor a little left of centre.
export const camFor = (x) => clamp(x - 560, 0, CAM_MAX);

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

// Advance the gaze. It stays dark, then winds up (warn: the lantern pulses and
// an arrow along the floor shows which way it will come), then sweeps: the
// beam enters from one wing, crosses the whole stage at a steady pace and
// leaves by the other, so once it has passed you it is gone. Then dark again.
// The sweep runs in floor x, fixed when the warning starts. `ctx` is
// { cam, rand } in play and null when predicting (the omens), which can't
// start a new sweep.
function stepGaze(g, dt, emit, ctx) {
  if (g.lock > 0) { g.lock -= dt; return; }
  g.t += dt;
  if (g.phase === 'dark') {
    if (g.t >= g.dur && ctx) {
      g.dir = ctx.rand() < 0.5 ? 1 : -1;
      const left = ctx.cam - TUNE.margin, right = ctx.cam + 1280 + TUNE.margin;
      g.from = g.dir > 0 ? left : right; g.to = g.dir > 0 ? right : left;
      g.phase = 'warn'; g.t = 0; g.dur = TUNE.warn;
      if (emit) emit({ type: 'gazeTurn', dir: g.dir });
    }
  } else if (g.phase === 'warn') {
    if (g.t >= g.dur) {
      g.phase = 'sweep'; g.t = 0; g.aim = g.from; g.dur = Math.abs(g.to - g.from) / TUNE.sweepSpeed;
      if (emit) emit({ type: 'gazeSweep' });
    }
  } else if (g.phase === 'sweep') {
    g.aim = lerp(g.from, g.to, clamp(g.t / g.dur, 0, 1));
    if (g.t >= g.dur) {
      g.phase = 'dark'; g.t = 0; g.aim = GAZE_OFF;
      g.dur = ctx ? TUNE.rest[0] + ctx.rand() * (TUNE.rest[1] - TUNE.rest[0]) : 9;
    }
  }
}

// Where the king and the lantern look (floor x): along the beam while it
// sweeps, toward the wing it will come from while it winds up, else ahead.
export function gazeLook(st) {
  const g = st.gaze;
  return g.phase === 'sweep' ? g.aim : g.phase === 'warn' ? g.from : st.cam + 640;
}

// Is a point on a groove in the beam, for this aim?
export function litAt(aim, row, x) {
  const { cx, hw } = beamOn(aim, row);
  return Math.abs(x - cx) < hw;
}

// ---------------------------------------------------------------- module
export default {
  id: 3, key: 'court', kicker: 'Act III', title: FILM ? "Neptune's Court" : "The Sea King's Court", size: 110,
  sub: FILM ? "Cross Neptune's hall to his seal of passage.\nThe witch is watching through her scrying eye."
    : "Cross the Sea King's hall to the treasury\nand take her pearl from its pedestal.",
  // Shown as a silent-film intertitle after the act card ([A] is the A button).
  intertitle: FILM ? "Press [A] beside a courtier\nto hide from the witch's scrying eye.\n\nNeptune grants you passage:\nwalk up to his seal at the far end of the hall."
    : "Press [A] beside a courtier\nto hide from the Sea King's lantern.\n\nTake her pearl from the pedestal\nat the far end of the hall.",
  action: 'A: hide',
  scenes: SCENES,

  // `from`: null, { scene } (scene select) or a checkpoint this act made
  // ({ scene, x, row, got, score, pearls, stats }).
  create({ seed = 1, carry = {}, from = null } = {}) {
    const st = {
      status: 'play', statusT: 0, events: [], result: null,
      phase: 'play', phaseT: 0, t: 0,
      rs: (seed >>> 0) || 1,
      carry: { tea: carry.tea || 0, rose: !!carry.rose },
      beat: 0, beatN: null, steps: 0, cam: camFor(START.x),
      p: { row: START.row, from: START.row, rowT: 1, x: START.x, face: 1, frozen: false, walk: 0, grace: 0, hidden: false, lit: false },
      lanterns: TUNE.lanterns, score: 0, pearls: 0, taken: false,
      courtiers: COURTIERS.map((c) => ({ ...c, x0: c.x, x1: c.x })),
      pearlsOnFloor: PEARLS.map(([row, x]) => ({ row, x, got: false })),
      sentries: SENTRIES.map((x) => ({ x, open: false })),
      gaze: { phase: 'dark', t: 0, dur: TUNE.firstDark, aim: GAZE_OFF, from: GAZE_OFF, to: GAZE_OFF, dir: 1, lock: 0 },
      whale: { t: -1, next: TUNE.whaleFirst, warned: false, passes: 0 },
      fish: { t: -1, next: TUNE.whaleFirst + 10 },
      masked: false, canTake: false, omens: [], unseenPass: false, cause: null,
      stats: { freezes: 0, hiddenPasses: 0, maskedTime: 0, hits: 0 },
      checkpoint: null,
    };
    const k = clamp(from?.scene | 0, 0, SCENES.length - 1);
    // The film edition opens with the passage of tableaux 19-21: he walks
    // through the lobster palace (past its guards' claws), the sea flora and
    // the azure grotto into Neptune's court (stepPassage). Not on a resume.
    if (FILM && k <= 0 && !(from && from.x != null)) startPassage(st);
    if (k <= 0 && !(from && from.x != null)) return st;
    // Resume: stand in the scene's groove, lanterns full, hazards afresh but fair.
    const x = clamp(from.x ?? SCENES[k].x, XMIN, XMAX), row = clamp(from.row ?? SCENES[k].row, 0, 2) | 0;
    Object.assign(st.p, { x, row, from: row, rowT: 1, grace: 2.5 });
    st.cam = camFor(x);
    for (const i of from.got || []) if (st.pearlsOnFloor[i]) st.pearlsOnFloor[i].got = true;
    st.pearls = from.pearls | 0; st.score = from.score | 0;
    Object.assign(st.stats, from.stats || {});
    st.gaze.dur = TUNE.firstDark + 1;                 // the lantern stays dark a while first
    st.whale.next = 14; st.fish.next = 26;
    st.checkpoint = { ...from, scene: k };
    return st;
  },

  // (see stepPassage for the film edition's opening walk)
  step(st, dt, input = {}) {
    st.statusT += dt;
    st.t += dt;
    st.beat = input.beat ?? st.beat + dt / BEAT;
    if (st.status !== 'play') return;
    if (st.transform != null) { stepPassage(st, dt, input); return; }
    st.phaseT += dt;
    const emit = (e) => st.events.push(e);

    beatMachinery(st, emit);
    stepPassers(st, dt, emit);

    st.cam += (camFor(st.p.x) - st.cam) * Math.min(1, dt * 3);
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
      progress: clamp((st.p.x - XMIN) / (PEDESTAL.x - XMIN), 0, 1),
      keepsakes: ks,
    };
  },

  announce(e) {
    if (e.type === 'hit') return `Hit. ${e.lanterns} lantern${e.lanterns === 1 ? '' : 's'} left.`;
    if (e.type === 'spotted') return FILM ? "Spotted by the witch's eye!" : 'Spotted by the gaze lantern!';
    if (e.type === 'gazeTurn') return `${FILM ? "The witch's eye sweeps" : "The Sea King's lantern turns"} ${e.dir > 0 ? 'from the left' : 'from the right'}. Hide beside a courtier!`;
    if (e.type === 'whaleNear') return FILM ? "Neptune's whale is coming." : 'The whale is coming.';
    if (e.type === 'whalePass') return FILM ? "The whale masks the hall: the witch's eye cannot see you." : 'The whale masks the hall: the lantern cannot see you.';
    if (e.type === 'pearlTaken') return FILM ? "Neptune's seal: he grants you passage on his whale." : 'You take her pearl.';
    if (e.type === 'swallow') return FILM ? 'The whale takes you aboard.' : 'The whale swallows the court.';
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
  const fm = f.t >= 0 && Math.abs(fishX(f.t) - backX(LANTERN_BX, st.cam)) < 170;
  st.masked = wm || fm;
  st.maskedBy = wm ? 'whale' : fm ? 'fish' : null;
}

// ---------------------------------------------------------------- play
function play(st, dt, input, emit) {
  const p = st.p, g = st.gaze;
  p.grace = Math.max(0, p.grace - dt);
  if (p.rowT < 1) p.rowT = Math.min(1, p.rowT + dt / TUNE.rowTween);

  // Take the pearl: walking up to the pedestal at the far right, on any
  // groove, takes it (the act's goal; no button, no waiting). The whale then
  // rises to swallow the court.
  st.canTake = p.x >= PEDESTAL.x - PEDESTAL.reach;
  if (st.canTake) {
    st.taken = true; st.phase = 'take'; st.phaseT = 0; p.frozen = false;
    st.score += 300 + st.lanterns * 100;
    emit({ type: 'pearlTaken' });
    return;
  }

  // Hide: A strikes a courtier's pose and holds it until you move (or press
  // A again); holding A keeps it too.
  const wasFrozen = p.frozen;
  const trying = !!(input.moveX || input.up || input.down);
  if (input.a) p.pose = !p.pose;
  if (trying && !input.aHeld) p.pose = false;
  p.frozen = !!(p.pose || input.aHeld);
  if (p.frozen && !wasFrozen) { st.stats.freezes++; emit({ type: 'freeze' }); }
  if (!p.frozen) p.pose = false;
  p.moving = false;
  if (!p.frozen) {
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
  // Crossing a scene boundary is a checkpoint: a retry starts in the safe
  // groove at that boundary with what has been gathered so far.
  let reached = 0;
  SCENES.forEach((sc, i) => { if (p.x >= sc.x) reached = i; });
  if (reached > (st.checkpoint?.scene | 0)) {
    st.checkpoint = {
      scene: reached, x: SCENES[reached].x, row: SCENES[reached].row,
      got: st.pearlsOnFloor.flatMap((q, i) => (q.got ? [i] : [])),
      score: st.score, pearls: st.pearls, stats: { ...st.stats },
    };
  }
  for (const q of st.pearlsOnFloor) {
    if (!q.got && q.row === r && Math.abs(q.x - p.x) < 28) { q.got = true; st.pearls++; st.score += 10; emit({ type: 'pearl', x: q.x, y: ROWY[q.row] }); }
  }

  // The gaze.
  stepGaze(g, dt, emit, { cam: st.cam, rand: () => rand(st) });
  p.hidden = p.frozen && st.courtiers.some((c) => c.kind !== 'guard' && c.row === r && Math.abs(c.x - p.x) < TUNE.cover * ROWSCALE[r]);
  p.lit = !st.masked && litAt(g.aim, r, p.x);
  if (st.masked) st.stats.maskedTime += dt;

  if (p.lit && p.hidden) st.unseenPass = true;
  if (!p.lit && st.unseenPass) { st.unseenPass = false; st.score += 25; st.stats.hiddenPasses++; emit({ type: 'unseen', x: p.x, y: rowY(p) }); }

  if (p.lit && !p.hidden && p.grace <= 0) {
    g.lock = TUNE.lock; st.unseenPass = false;
    emit({ type: 'spotted', x: p.x, y: rowY(p) });
    hit(st, 'gaze', emit); // the beam holds on him a moment, then sweeps on
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
    if (s.open && Math.abs(s.x + SENTRY_HEAD - p.x) < SENTRY_REACH && p.grace <= 0) { emit({ type: 'sentryBite', x: p.x, y: rowY(p) }); hit(st, 'sentry', emit); }
  }

  // Tea-leaf omens, one beat ahead of each hazard.
  st.omens.length = 0;
  if (st.carry.tea >= 3) {
    if (!p.lit && !st.masked) {
      const ahead = { ...g };
      stepGaze(ahead, BEAT, null, null);
      if (litAt(ahead.aim, r, p.x)) st.omens.push({ x: p.x, y: rowY(p) - 175 * ROWSCALE[r], kind: 'gaze' });
    }
    const ph = beatPhase(st.beat);
    if (!st.carry.rose && ph >= TUNE.snapOpen && r >= 1) {
      for (const s of st.sentries) if (Math.abs(s.x + SENTRY_HEAD - p.x) < 210) st.omens.push({ x: s.x + SENTRY_HEAD, y: 528, kind: 'sentry' });
    }
  }
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


// ---------------------------------------------------------------- the passage (film)
function startPassage(st) {
  st.transform = 0;
  st.tf = { set: 0, x: 215, vx: 0, face: 1, walk: 0, knockT: 0, fade: 0, got: [], t: 0 };
}
// A guard's claws: open (passable) or shut across the way.
export const guardOpen = (g, t) => ((t + g.phase) % (PASSAGE.open + PASSAGE.shut)) < PASSAGE.open;
function stepPassage(st, dt, input) {
  const P = PASSAGE, f = st.tf;
  st.transform += dt; f.t += dt;
  if (f.fade > 0) {
    f.fade += dt;
    if (f.fade >= P.fade) {
      f.fade = 0;
      if (f.set >= 2) { st.transform = null; st.tf = null; st.events.push({ type: 'courtOpens' }); return; }
      f.set++; f.x = P.x0 + 40; f.vx = 0;
      st.events.push({ type: 'passageSet', set: f.set });
    }
    return;
  }
  f.knockT = Math.max(0, f.knockT - dt);
  const mx = f.knockT > 0 ? 0 : clamp(input.moveX || 0, -1, 1);
  if (Math.abs(mx) > 0.15) f.face = Math.sign(mx);
  f.vx += clamp(mx * P.walk - f.vx, -P.acc * dt, P.acc * dt);
  let nx = clamp(f.x + f.vx * dt, P.x0, P.exit + 20);
  if (f.set === 0) for (const g of P.guards) {
    const shut = !guardOpen(g, f.t), inside = Math.abs(nx - g.x) < P.guardW / 2 + P.hw;
    if (shut && inside) {
      // caught in the claws as they shut: knocked back; shut ahead: blocked
      if (Math.abs(f.x - g.x) < P.guardW / 2 + P.hw) { f.knockT = 0.5; f.vx = -P.knock; nx = g.x - P.guardW / 2 - P.hw - 30; st.events.push({ type: 'clawSnap', x: g.x }); }
      else nx = f.x;
    }
  }
  f.x = nx; f.walk += Math.abs(f.vx) * dt;
  if (f.set === 1) P.pearls.forEach(([px, py], i) => {
    if (!f.got.includes(i) && Math.abs(px - f.x) < 50) { f.got.push(i); st.pearls++; st.score += 10; st.events.push({ type: 'pearl', x: px, y: py }); }
  });
  if (f.x >= P.exit) f.fade = 0.0001;
}

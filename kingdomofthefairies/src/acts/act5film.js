// The film edition's last two acts (design/film-adaptation.md), built on Act
// V's machinery (act5.js): its climb, burning interior, carry and hazards.
//
// Act V — The Enchanted Tower (tableaux 23-25): climb the cliff, dive for the
// witch's tower, swim the sea gap while she swoops (A dives under; Aurora's
// light drives her off at last), and climb the tower wall to the window.
//
// Act VI — The Burning Tower (tableaux 26-32): her demons set the tower alight;
// climb to Azurine and carry her down as the way breaks behind you, out
// across the clifftop; roll the witch's barrel over the edge on the beat; the
// wedding procession and the apotheosis.
//
// Headless: drawing is in act5film-art.js.
import act5, {
  BEAT_S, GRACE, LANTERNS, CLIFF, HOLDS, QUAY,
  stepCliff, stepHouse, stepQuay, hit, checkpoint, setPhase, climberPos, stepRocks, reachTop,
} from './act5.js';
import { createWall, stepWall, jolt } from './climb.js';
import { clamp, lerp } from './shared.js';
import * as art from './act5film-art.js';

// ---------------------------------------------------------------- the swim
// World x along the sea gap, from the foot of the cliff (0) to the tower's
// rock (len). The current pulls back toward the cliff; keep swimming.
// Aurora drives the witch off after `swoops` swoops or `auroraAt` of the way across.
export const SWIM = { len: 2400, speed: 240, current: 45, dive: 0.9, diveCD: 0.45, every: [1.8, 2.4], warn: 1.5, swoops: 3, auroraAt: 0.7, aurora: 2.0 };

// ---------------------------------------------------------------- the tower
// The tower wall: x on stage, y up from the rocks at its foot to her window.
// Every hold is on the delivered tower-wall-tall: `painted` holds are the
// stones that jut from its wall (their top faces, measured on the cloth as
// drawn: 760 wide, centred, foot at y -30), and `ivy` holds are grips in its
// painted ivy, drawn as a knot of vine. The top is the sill of her window,
// the painted one at the upper right. Plain moves reach 130, leaps 190.
export const TOWER_TOP = 1520;
export const TOWER_HOLDS = [
  { x: 590, y: 128, kind: 'ledge', painted: true, start: true },   // the flat rock at its foot
  { x: 460, y: 210, kind: 'ledge', painted: true },                // the rock beside it
  { x: 545, y: 240, ivy: true },
  { x: 512, y: 345, kind: 'ledge', painted: true },
  { x: 575, y: 455, ivy: true },
  { x: 600, y: 550, ivy: true },
  { x: 590, y: 640, kind: 'ledge', painted: true },
  { x: 500, y: 720, ivy: true },
  { x: 405, y: 750, kind: 'ledge', painted: true, pearl: true },
  { x: 470, y: 830, ivy: true },
  { x: 515, y: 925, kind: 'ledge', painted: true },                // halfway
  { x: 530, y: 1035, kind: 'ledge', painted: true },
  { x: 560, y: 1130, ivy: true, kind: 'crumble' },                 // dry ivy: it tears away
  { x: 495, y: 1235, kind: 'ledge', painted: true },               // the lower window's sill
  { x: 560, y: 1330, ivy: true },
  { x: 595, y: 1425, kind: 'ledge', painted: true },
  // a detour up the right of the wall, for its pearls
  { x: 700, y: 752, ivy: true },
  { x: 752, y: 830, kind: 'ledge', painted: true },
  { x: 812, y: 960, kind: 'ledge', painted: true, pearl: true },
  { x: 770, y: 1060, ivy: true },
  { x: 738, y: 1155, kind: 'ledge', painted: true, pearl: true },
  { x: 680, y: 1395, ivy: true },
  { x: 760, y: 1430, ivy: true },                                  // under her sill
  { x: 812, y: TOWER_TOP, kind: 'top' },                           // her window's sill
];
export const TOWER_HALF = TOWER_HOLDS.findIndex((h) => h.x === 515 && h.y === 925);
export const TOWER_WINDOW = { x: 825, y: TOWER_TOP };

// The film's cliff (cliff-face-tall-2 as Act V draws it: 820 wide from x 230,
// its foot at y -30): every ledge hold is on the top face of one of its
// painted ledges, and every grip in its painted ivy; leaps cross the dark
// cleft to the pearls on the right. No giant, no boot: he climbs over the
// grass edge from the ledge below it. Plain moves reach 130, leaps 190.
export const FILM_CLIFF = [
  { x: 670, y: 70, kind: 'ledge', painted: true, start: true },
  { x: 745, y: 160, kind: 'ledge', painted: true },
  { x: 620, y: 180, ivy: true },
  { x: 610, y: 290, ivy: true },
  { x: 880, y: 300, kind: 'ledge', painted: true, pearl: true },
  { x: 760, y: 380, kind: 'ledge', painted: true },
  { x: 650, y: 410, kind: 'ledge', painted: true },
  { x: 540, y: 435, kind: 'ledge', painted: true },
  { x: 430, y: 455, kind: 'ledge', painted: true },
  { x: 330, y: 380, ivy: true },
  { x: 350, y: 520, ivy: true },
  { x: 380, y: 612, kind: 'ledge', painted: true },
  { x: 500, y: 600, kind: 'ledge', painted: true },
  { x: 620, y: 585, kind: 'ledge', painted: true, pearl: true },
  { x: 300, y: 690, ivy: true },
  { x: 370, y: 785, kind: 'ledge', painted: true },
  { x: 490, y: 772, kind: 'ledge', painted: true },
  { x: 610, y: 760, kind: 'ledge', painted: true },
  { x: 730, y: 745, kind: 'ledge', painted: true },
  { x: 900, y: 712, kind: 'ledge', painted: true },
  { x: 975, y: 860, ivy: true },
  { x: 960, y: 945, kind: 'ledge', painted: true, pearl: true },
  { x: 450, y: 870, ivy: true },
  { x: 420, y: 965, kind: 'ledge', painted: true },
  { x: 540, y: 955, kind: 'ledge', painted: true },
  { x: 660, y: 945, kind: 'ledge', painted: true },
  { x: 770, y: 930, kind: 'ledge', painted: true },
  { x: 430, y: 1060, kind: 'ledge', painted: true },
  { x: 560, y: 1040, kind: 'ledge', painted: true, pearl: true },
  { x: 350, y: 1145, ivy: true },
  { x: 310, y: 1230, ivy: true },
  { x: 400, y: 1275, kind: 'ledge', painted: true },
  { x: 520, y: 1248, kind: 'ledge', painted: true },
  { x: 640, y: 1240, kind: 'ledge', painted: true },
  { x: 760, y: 1236, kind: 'ledge', painted: true },
  { x: 900, y: 1225, kind: 'ledge', painted: true },
  { x: 900, y: 1300, ivy: true },
  { x: 950, y: 1385, kind: 'ledge', painted: true, pearl: true },
  { x: 575, y: 1350, ivy: true, kind: 'crumble' },
  { x: 450, y: 1418, kind: 'ledge', painted: true },
  { x: 580, y: 1414, kind: 'ledge', painted: true },
  { x: 380, y: 1492, kind: 'ledge', painted: true },
  { x: 520, y: 1498, kind: 'ledge', painted: true },
  { x: 660, y: 1502, kind: 'ledge', painted: true },
  { x: 640, y: 1580, ivy: true },
  { x: 370, y: 1667, kind: 'ledge', painted: true },
  { x: 500, y: 1663, kind: 'ledge', painted: true },
  { x: 640, y: 1658, kind: 'ledge', painted: true },
  { x: 330, y: 1760, ivy: true, kind: 'crumble' },
  { x: 380, y: 1850, ivy: true },
  { x: 470, y: 1878, kind: 'ledge', painted: true },
  { x: 580, y: 1874, kind: 'ledge', painted: true },
  { x: 690, y: 1870, kind: 'ledge', painted: true },
  { x: 850, y: 1830, kind: 'ledge', painted: true, pearl: true },
  { x: 560, y: CLIFF.top + 6, kind: 'top' },
  { x: 680, y: CLIFF.top + 6, kind: 'top' },
];
export const FILM_CLIFF_HALF = FILM_CLIFF.findIndex((h) => h.x === 420 && h.y === 965);

// Cut-scene lengths, seconds.
export const FILM_T = { dive: 3.8, window: 3.6, iris: 1.6, barrelFall: 2.4, wedding: 7.5, apotheosis: 8.5, defeat: 1.8, splash: 1.0, rise: 3.2 };

// The walking scenes between the climbs (all stage px, feet at `y`): the
// clifftop he dives from, the cliff he rolls the witch's barrel over, the
// wedding street and the apotheosis. Each was measured on its delivered set.
export const WALK = { speed: 240, acc: 2000, g: 2000, jump: 720, cut: 2400, buffer: 0.13 };
export const DIVE = { y: 372, x0: 170, edge: 360, start: 210 };          // coast-gap's cliff path
export const BARREL = {                                                  // cliff-whirlpool's ledge
  y: 412, x0: 150, edge: 728, start: 230, at: 470, hw: 40, push: 150, knock: 320,
};
// The witch's last stand on that ledge: she winds up (warn), then hurls a
// bolt of fire along the ground (leap it, A), or blasts him back if he lingers
// at her side; the sword (X) swings, and three blows that reach her beat her.
// Then, as in the film, Aurora shuts her in a barrel: it drops out of the air
// over her (`trap`: Aurora casts until `drop`, it falls until `land`, rocks
// until the end) and he pushes it over the cliff.
export const DUEL = {
  hp: 3, x: 610, back: 640, idle: [0.9, 1.4], warn: 0.65, reach: 115, near: 150,
  bolt: 400, boltR: 26, boltH: 34, reel: 0.8, hw: 34, swing: 0.35,
  trap: { drop: 0.6, land: 1.05, end: 1.9 },
};
// (each walk starts with its figures in view, clear of the left curtain at ~x 170)
export const WEDDING = { y: 652, x0: 60, gate: 880, start: 330, follow: 96, petals: 14 };
export const APOTH = { y: 592, x0: 120, x1: 1160, mark: 640, near: 40, start: 320 };
const PRINCE_HW = 18;

const CARRY_DEFAULT = { tea: 0, guitar: false, rose: false, pearl: false, stone: false, sleepers: 0 };

function base(st, dt, input) {
  st.statusT += dt;
  st.clock += dt;
  st.beat = input.beat ?? st.clock / BEAT_S;
  if (st.status !== 'play') return false;
  st.phaseT += dt;
  st.inv = Math.max(0, st.inv - dt);
  if (st.defeatT != null) {
    st.defeatT += dt;
    if (st.defeatT >= FILM_T.defeat) { st.status = 'lost'; st.statusT = 0; }
    return false;
  }
  return true;
}

function filmKeepsakes(c) {
  return [
    { id: 'tea', have: (c.tea || 0) >= 3 }, { id: 'guitar', have: !!c.guitar },
    { id: 'pearl', have: !!c.pearl }, { id: 'stone', have: !!c.stone },
  ];
}

function winFilm(st, extra = {}) {
  st.status = 'won'; st.statusT = 0;
  st.result = { keepsakes: {}, score: st.score, pearls: st.pearls, ...extra };
}

// ================================================================= Act V
export const TOWER_SCENES = [
  { name: 'The Cliff Foot' }, { name: 'Halfway Up the Cliff' }, { name: 'The Sea Gap' },
  { name: 'The Tower Wall' }, { name: 'Halfway Up the Tower' },
];

function startSwim(st) {
  setPhase(st, 'swim');
  st.sw = { x: 0, dive: 0, cd: 0, swoop: null, next: 1.8, swoops: 0, aurora: null, stroke: 0 };
  st.rocks = [];
  checkpoint(st, 2);
  st.events.push({ type: 'swimStart' });
}

// The climbs are continuous (climb.js): anywhere on the painted face, from
// the start ledge or a checkpoint's place; the hold lists give the start,
// the halfway mark, the pearls and the dry ivy.
function startWall(st, name, holds, at, half, opts = {}) {
  st.holds = holds.map((h) => ({ kind: 'hold', ...h, gone: false }));
  st.wall = createWall(name, holds, at, opts);
  st.shelter = null;   // no tiny guitarist's gap on the film's cliff
  st.climb = { ...st.climb, halfY: holds[half].y };
  st.camY = clamp(st.wall.y - 250, 0, st.climb.camMax);
}
const wallAt = (holds, from, half) => (from?.wy != null ? { x: from.wx, y: from.wy }
  : from?.hold != null && holds[from.hold] ? holds[from.hold] : half != null ? holds[half] : holds.find((h) => h.start));
function takenAgain(st, from, half) {
  // pearls taken before the checkpoint stay taken
  const taken = from?.taken ?? st.wall.pearls.map((p, i) => (p.y <= st.wall.y + 4 ? i : -1)).filter((i) => i >= 0);
  for (const i of taken) if (st.wall.pearls[i]) st.wall.pearls[i].taken = true;
}

function startTower(st, from = null) {
  setPhase(st, 'tower');
  st.climb = { top: TOWER_TOP, camMax: TOWER_TOP - 330, half: TOWER_HALF, halfScene: 4, openTop: true };
  startWall(st, 'tower', TOWER_HOLDS, wallAt(TOWER_HOLDS, from, from ? TOWER_HALF : null), TOWER_HALF,
    { goal: { x: TOWER_WINDOW.x, y: TOWER_WINDOW.y, r: 60 }, floor: 110 });
  if (from) takenAgain(st, from);
  st.rocks = []; st.nextRock = 3.4;
  if (!from) checkpoint(st, 3);
}

function stepClimb(st, dt, input) {
  const w = st.wall, cfg = st.climb;
  const r = stepWall(w, dt, input, {
    events: st.events,
    hit: (cause) => hit(st, { cause }),
    pearl: (p) => { st.pearls++; st.score += 10; st.events.push({ type: 'pearl', x: p.x, y: p.y }); },
  });
  if (r === 'top') { reachTop(st, { x: w.x }); return; }
  if ((st.checkpoint?.scene | 0) < cfg.halfScene && w.mode === 'ledge' && w.y >= cfg.halfY - 6) {
    checkpoint(st, cfg.halfScene, { wx: w.x, wy: w.y, taken: w.pearls.map((p, i) => (p.taken ? i : -1)).filter((i) => i >= 0) });
  }
  // The camera follows, like a cliff flat winched down through the floor.
  const want = clamp(w.y - 250, 0, cfg.camMax);
  st.camY += (want - st.camY) * Math.min(1, dt * 3);
  const before = st.lanterns;
  stepRocks(st, dt, climberPos(st));
  if (st.lanterns < before) jolt(w);
}

export const actTower = {
  id: 5, key: 'tower', kicker: 'Act V', title: 'The Enchanted Tower', size: 116, page: 5,
  sub: 'Climb the cliff and dive for the witch’s tower.\nSwim the sea gap, then climb the tower to her window.',
  intertitle: 'Climb anywhere on the rock:\nfastest up the ivy and the cracks,\nslowest over the wet cleft.\n\nPush up into a ledge to haul yourself onto it.\nDust above means a stone is about to fall.',
  action: 'A: leap',
  scenes: TOWER_SCENES,
  mood: (st) => (st.phase === 'swim' ? 'storm' : st.phase === 'dive' || st.phase === 'window' ? 'tender' : 'storm'),
  touchLive: (st) => ['cliff', 'tower', 'swim'].includes(st.phase) || (st.phase === 'dive' && !st.dv),
  touchVerb: (st) => (st.phase === 'swim' || st.phase === 'dive' ? 'Dive' : 'Leap'),
  touchHint: 'drag to climb, A to leap; in the sea, drag to swim, A to dive',
  touchScheme: (st) => (st.phase === 'swim' ? { mode: 'stick', hint: 'Drag to swim · tap to dive' } : { mode: 'stick', hint: 'Drag to climb' }),

  create({ seed = 1, carry = {}, from = null } = {}) {
    const k = clamp(from?.scene | 0, 0, TOWER_SCENES.length - 1);
    // The cliff, from Act V's own create (scene 1 is its halfway checkpoint).
    const st = act5.create({ seed, carry, from: k === 1 ? { ...from, scene: 1 } : null });
    st.part = 'tower';
    // the film's own cliff route, on the cliff's painted ledges and ivy
    st.climb = { top: CLIFF.top, camMax: CLIFF.camMax, half: FILM_CLIFF_HALF, halfScene: 1, openTop: true };
    startWall(st, 'cliff', FILM_CLIFF, wallAt(FILM_CLIFF, k === 1 ? from : null, k === 1 ? FILM_CLIFF_HALF : null), FILM_CLIFF_HALF, { floor: 40 });
    st.cl = null;
    if (k === 1) takenAgain(st, from);
    else st.camY = 0;
    st.carry = { ...CARRY_DEFAULT, ...carry };
    st.events.length = 0;
    if (k >= 2) { st.score = from.score ?? 0; st.pearls = from.pearls ?? 0; }
    if (k === 2) startSwim(st);
    else if (k === 3) startTower(st);
    else if (k === 4) startTower(st, from || {});
    st.events.length = 0;
    st.checkpoint = k > 0 ? { ...from, scene: k } : null;
    return st;
  },

  step(st, dt, input = {}) {
    if (!base(st, dt, input)) return;
    if ((st.phase === 'cliff' || st.phase === 'tower') && st.wall) stepClimb(st, dt, input);
    else if (st.phase === 'cliff' || st.phase === 'tower') stepCliff(st, dt, input);
    else if (st.phase === 'dive') { if (!st.w) startDive(st); stepDive(st, dt, input); }
    else if (st.phase === 'swim') stepSwim(st, dt, input);
    else if (st.phase === 'window') { if (st.phaseT >= FILM_T.window) setPhase(st, 'iris'); }
    else if (st.phase === 'iris' && st.phaseT >= FILM_T.iris) winFilm(st);
    if (st.defeatT === 0) lostText(st);
    st.lastBeat = st.beat;
  },

  hud(st) {
    if (!['cliff', 'swim', 'tower'].includes(st.phase)) return null;
    const prog = st.phase === 'cliff' ? 0.4 * clamp(climberPos(st).y / CLIFF.top, 0, 1)
      : st.phase === 'swim' ? 0.4 + 0.2 * clamp(st.sw.x / SWIM.len, 0, 1)
        : 0.6 + 0.4 * clamp(climberPos(st).y / TOWER_TOP, 0, 1);
    return { lanterns: st.lanterns, maxLanterns: LANTERNS, pearls: st.pearls, progress: prog, keepsakes: filmKeepsakes(st.carry) };
  },

  announce(e) {
    if (e.type === 'hit') return `Hit. ${e.lanterns} lantern${e.lanterns === 1 ? '' : 's'} left.`;
    if (e.type === 'clifftop') return 'The top. He dives for the tower.';
    if (e.type === 'swimStart') return 'Swim for the tower. Press A to dive under the witch.';
    if (e.type === 'witchSwoop') return 'The witch is swooping down! Dive!';
    if (e.type === 'auroraLight') return "Aurora's light drives the witch away.";
    if (e.type === 'towerFoot') return 'The tower. Climb to her window.';
    if (e.type === 'stoneWarn') return 'Dust above: a stone is about to fall.';
    if (e.type === 'holdCrumble') return 'The dry ivy tears away.';
    return null;
  },

  focus: art.focusTower, draw: art.drawTower, drawOver: art.drawOverTower, onEvent: art.onEventTower,
};

function lostText(st) {
  st.lostTitle = st.phase === 'swim' ? 'The Sea Takes\nHim Down' : st.phase === 'tower' ? 'The Tower\nThrows Him Off' : 'The Cliff\nGives Way';
  st.lostSub = st.phase === 'swim' ? 'When her shadow darkens the water, press A to dive.' : 'Watch the dust: the stone falls where it gathers.';
}

function stepSwim(st, dt, input) {
  const sw = st.sw;
  const mx = input.moveX || (input.left ? -1 : 0) || (input.right ? 1 : 0);
  sw.x = clamp(sw.x + (mx * SWIM.speed - SWIM.current) * dt, 0, SWIM.len);
  if (Math.abs(mx) > 0.2) sw.stroke += dt;
  sw.cd = Math.max(0, sw.cd - dt);
  if (sw.dive > 0) { sw.dive -= dt; if (sw.dive <= 0) { sw.cd = SWIM.diveCD; st.events.push({ type: 'surface' }); } }
  else if (input.a && sw.cd <= 0) { sw.dive = SWIM.dive; st.events.push({ type: 'dive' }); }
  // The witch swoops at where he will be; her shadow on the water warns.
  if (sw.aurora == null && !sw.swoop) {
    sw.next -= dt;
    if (sw.next <= 0) {
      const lead = SWIM.warn + (st.omen ? BEAT_S : 0);
      sw.swoop = { x: clamp(sw.x + mx * SWIM.speed * lead * 0.6, 0, SWIM.len), t: 0, lead };
      st.events.push({ type: 'witchSwoop' });
    }
  }
  if (sw.swoop) {
    sw.swoop.t += dt;
    if (sw.swoop.t >= sw.swoop.lead && !sw.swoop.struck) {
      sw.swoop.struck = true;
      if (Math.abs(sw.x - sw.swoop.x) < 80 && sw.dive <= 0) hit(st, { cause: 'witch' });
      else st.events.push({ type: 'witchMiss' });
    }
    if (sw.swoop.t >= sw.swoop.lead + 0.6) {
      sw.swoop = null; sw.swoops++;
      const [lo, hi] = SWIM.every; sw.next = lo + st.rand() * (hi - lo);
      if (sw.swoops >= SWIM.swoops) { sw.aurora = 0; st.events.push({ type: 'auroraLight' }); }
    }
  }
  if (sw.aurora == null && !sw.swoop && sw.x >= SWIM.len * SWIM.auroraAt) { sw.aurora = 0; st.events.push({ type: 'auroraLight' }); }
  if (sw.aurora != null) sw.aurora += dt;
  if (sw.x >= SWIM.len) { st.score += 150; st.events.push({ type: 'towerFoot' }); startTower(st); }
}

// ================================================================= Act VI
export const BURNING_SCENES = [
  { name: 'Inside the Tower' }, { name: 'Carrying Her Down' }, { name: 'Out on the Cliff' },
  { name: "The Witch's Last Attack" }, { name: 'The Wedding' },
];
// Film scenes 0-3 are Act V's house (2), carry (3), quay (4) and barrel (5).
const LEGACY_SCENE = [2, 3, 4, 5];

export const actBurning = {
  id: 6, key: 'burning', kicker: 'Act VI', title: 'The Burning Tower', size: 120, page: 7,
  sub: 'The witch’s demons set the tower alight.\nClimb to Azurine and carry her out before it falls.',
  action: 'A: leap',
  scenes: BURNING_SCENES,
  // the wedding has its own song (period-wedding); until it is delivered the
  // shell plays the revel march for it
  mood: (st) => (st.phase === 'wedding' || st.phase === 'apotheosis' || st.phase === 'iris' ? 'wedding' : 'storm'),
  touchLive: (st) => ['house', 'quay'].includes(st.phase) || (st.phase === 'barrel' && st.barrel?.fallT == null),
  // the second button swings the sword in the witch's last stand
  touchVerbB: (st) => (st.phase === 'barrel' && st.duel && st.duel.state !== 'trap' ? 'Strike' : ''),
  touchVerb: (st) => (st.phase === 'barrel' && st.duel ? 'Leap' : ['barrel', 'wedding', 'apotheosis'].includes(st.phase) ? '' : st.phase === 'house' && st.carry?.stone && !st.stoneThrown ? 'Action' : 'Leap'),
  touchHint: 'drag to walk and climb, A to leap',
  touchScheme: (st) => (['wedding', 'apotheosis'].includes(st.phase) || (st.phase === 'barrel' && !st.duel) ? { mode: 'swipe', hint: 'Drag ↔ to walk' } : { mode: 'stick', hint: 'Drag to walk · up and down on stairs and ladders' }),

  create({ seed = 1, carry = {}, from = null } = {}) {
    const k = clamp(from?.scene | 0, 0, BURNING_SCENES.length - 1);
    const lk = LEGACY_SCENE[Math.min(k, 2)];
    const st = act5.create({ seed, carry, from: { ...(from || {}), scene: lk } });
    st.part = 'burning';
    st.carry = { ...CARRY_DEFAULT, ...carry };
    st.score = from?.score ?? 0; st.pearls = from?.pearls ?? 0;
    st.sleepersShown = Math.min(12, Math.max(0, carry.sleepers || 0));
    if (k === 3) { startBarrel(st); st.haz = []; }
    if (k === 4) { startWedding(st); st.haz = []; }
    st.events.length = 0;
    st.checkpoint = k > 0 ? { ...(from || {}), scene: k } : null;
    return st;
  },

  step(st, dt, input = {}) {
    if (!base(st, dt, input)) return;
    const cpBefore = st.checkpoint;
    if (st.phase === 'house') stepHouse(st, dt, input);
    else if (st.phase === 'quay') stepQuay(st, dt, input);
    else if (st.phase === 'barrel') { if (!st.barrel && !st.duel) startBarrel(st); stepBarrel(st, dt, input); }
    else if (st.phase === 'wedding') stepWedding(st, dt, input);
    else if (st.phase === 'apotheosis') stepApotheosis(st, dt, input);
    else if (st.phase === 'iris' && st.phaseT >= FILM_T.iris) winFilm(st, { ending: 'wedding' });
    // Act V's house checkpoints are numbered as its own scenes; renumber.
    if (st.checkpoint && st.checkpoint !== cpBefore && !st.checkpoint.film) {
      const film = LEGACY_SCENE.indexOf(st.checkpoint.scene);
      if (film >= 0) st.checkpoint = { ...st.checkpoint, scene: film };
    }
    if (st.defeatT === 0) { st.lostTitle = 'The Fire Takes\nthe Tower'; st.lostSub = 'The ceiling shudders before it falls.'; }
    st.lastBeat = st.beat;
  },

  hud(st) {
    if (!['house', 'quay', 'barrel'].includes(st.phase)) return null;
    const prog = st.phase === 'house' ? (st.p.carry ? 0.45 : 0.15) : st.phase === 'quay' ? 0.7 + 0.2 * clamp((st.p.x - QUAY.x0) / (QUAY.x1 - QUAY.x0), 0, 1)
      : st.duel ? 0.9 + 0.05 * (1 - st.duel.hp / DUEL.hp) : 0.95 + 0.05 * clamp(((st.barrel?.x ?? BARREL.at) - BARREL.at) / (BARREL.edge - BARREL.at), 0, 1);
    return { lanterns: st.lanterns, maxLanterns: LANTERNS, pearls: st.pearls, progress: prog, keepsakes: filmKeepsakes(st.carry) };
  },

  announce(e) {
    if (e.type === 'hit') return `Hit. ${e.lanterns} lantern${e.lanterns === 1 ? '' : 's'} left.`;
    if (e.type === 'beamWarn') return 'The ceiling shudders.';
    if (e.type === 'shutterLocked') return 'The shutter is barred fast.';
    if (e.type === 'shutterSmash') return "Aurora's lamp opens the shutter. Climb the ivy.";
    if (e.type === 'liftHer') return 'You lift Azurine. Carry her down: no leaping now.';
    if (e.type === 'floorBreak') return 'The way you came is gone. A ladder drops at the right.';
    if (e.type === 'houseFall') return 'Out onto the clifftop. The tower is falling.';
    if (e.type === 'witchReturns') return 'The witch attacks one last time! Leap her fire with A, and strike her with the sword with X.';
    if (e.type === 'witchStruck') return e.hp > 0 ? 'You strike the witch.' : 'The witch is beaten.';
    if (e.type === 'witchBlast') return 'She blasts you back.';
    if (e.type === 'witchBeaten') return 'The witch is beaten. Aurora shuts her in a barrel.';
    if (e.type === 'witchInBarrel') return 'Push the barrel over the cliff.';
    if (e.type === 'barrelFall') return 'Into the whirlpool!';
    if (e.type === 'wedding') return 'The wedding. Walk Azurine along the street to the castle gate; catch the falling petals.';
    if (e.type === 'apotheosis') return 'Walk with Azurine to the light beneath Aurora.';
    if (e.type === 'ascend') return 'The Kingdom of the Fairies.';
    return null;
  },

  focus: art.focusBurning, draw: art.drawBurning, drawOver: art.drawOverBurning, onEvent: art.onEventBurning,
};

// ---------------------------------------------------------------- walking scenes
// The prince on foot on a flat floor: walk, and (where allowed) leap.
function walker(x, y) { return { x, y, vx: 0, vy: 0, on: true, face: 1, walk: 0, buffer: 0, knockT: 0, landT: 0 }; }
function walk(w, dt, input, { y, x0, x1, leap = false, events = null }) {
  let mx = clamp(input.moveX || 0, -1, 1);
  if (w.knockT > 0) { w.knockT -= dt; mx = 0; }
  w.landT = Math.max(0, w.landT - dt);
  if (Math.abs(mx) > 0.15) w.face = Math.sign(mx);
  w.vx += clamp(mx * WALK.speed - w.vx, -WALK.acc * dt, WALK.acc * dt);
  w.buffer = input.a ? WALK.buffer : Math.max(0, w.buffer - dt);
  if (leap && w.on && w.buffer > 0) { w.vy = -WALK.jump; w.on = false; w.buffer = 0; events?.push({ type: 'leap' }); }
  if (!w.on) {
    w.vy += (WALK.g + (w.vy < 0 && !input.aHeld ? WALK.cut : 0)) * dt;
    w.y += w.vy * dt;
    if (w.y >= y) { w.y = y; w.vy = 0; w.on = true; w.landT = 0.12; }
  }
  w.x = clamp(w.x + w.vx * dt, x0, x1);
  if (w.on) w.walk += Math.abs(w.vx) * dt;
}

// Act V: from the cliff top he walks to the edge and dives for the tower
// (A, or walking off the edge), arcing down into the sea.
function startDive(st) {
  setPhase(st, 'dive');
  st.w = walker(DIVE.start, DIVE.y);
  st.dv = null;
}
function stepDive(st, dt, input) {
  const w = st.w;
  if (st.dv) {
    const d = st.dv;
    d.t += dt;
    if (!d.splash) { d.vy += WALK.g * 0.8 * dt; w.x += d.vx * dt; w.y += d.vy * dt; d.rot += dt * 3.2;
      if (w.y >= 600) { d.splash = true; d.t = 0; st.events.push({ type: 'diveSplash', x: w.x }); } }
    else if (d.t >= FILM_T.splash) startSwim(st);
    return;
  }
  walk(w, dt, input, { y: DIVE.y, x0: DIVE.x0, x1: DIVE.edge + 40 });
  if ((input.a && w.x > DIVE.edge - 110) || w.x > DIVE.edge + 10) {
    st.dv = { t: 0, vx: 260 + Math.max(0, w.vx) * 0.6, vy: -620, rot: 0, splash: false };
    st.events.push({ type: 'diveLeap' });
  }
}

// Act VI: the witch's last attack. She stands on the clifftop and fights; once
// he has beaten her she hides in her barrel, and he pushes it over the edge.
function startBarrel(st) {
  setPhase(st, 'barrel');
  st.w = walker(BARREL.start, BARREL.y);
  st.duel = { x: DUEL.x, hp: DUEL.hp, state: 'idle', t: 0, next: DUEL.idle[1], bolts: [], strikeT: 0 };
  st.barrel = null;
}
function stepDuel(st, dt, input) {
  const d = st.duel, w = st.w;
  const dist = d.x - DUEL.hw - (w.x + PRINCE_HW);   // the gap between them
  const reach = dist < DUEL.reach - DUEL.hw && d.state !== 'trap';
  // A leaps; X swings the sword (wherever he is), and a swing that reaches
  // her is a blow
  walk(w, dt, d.state === 'trap' ? {} : input, { y: BARREL.y, x0: BARREL.x0, x1: d.x - DUEL.hw - PRINCE_HW, leap: true, events: st.events });
  d.t += dt; w.strikeT = Math.max(0, (w.strikeT || 0) - dt);
  if (input.x && w.strikeT <= 0 && w.knockT <= 0 && d.state !== 'trap') {
    w.strikeT = DUEL.swing; st.events.push({ type: 'swordSwing', x: w.x });
    if (reach && d.state !== 'reel') {
      d.hp--; d.state = 'reel'; d.t = 0; d.bolts.length = 0;
      st.events.push({ type: 'witchStruck', x: d.x, hp: d.hp });
      // beaten: the heroic stinger (victoryStinger, design/music-requests.md)
      if (d.hp <= 0) { d.state = 'trap'; d.t = 0; st.score += 300; st.events.push({ type: 'witchBeaten', x: d.x, sound: 'victoryStinger' }); }
    }
  }
  if (d.state === 'idle' && d.t >= d.next) { d.state = 'warn'; d.t = 0; st.events.push({ type: 'witchWinds', x: d.x }); }
  else if (d.state === 'warn' && d.t >= DUEL.warn) {
    d.state = 'idle'; d.t = 0; d.next = lerp(DUEL.idle[0], DUEL.idle[1], st.rand());
    if (dist < DUEL.near - DUEL.hw) {   // too close: she blasts him back
      w.knockT = 0.6; w.vx = -BARREL.knock; w.vy = -320; w.on = false;
      st.events.push({ type: 'witchBlast', x: w.x });
      duelHit(st);
    } else { d.bolts.push({ x: d.x - DUEL.hw - 10 }); st.events.push({ type: 'witchBolt', x: d.x }); }
  } else if (d.state === 'reel') {
    d.x = lerp(d.x, DUEL.back, Math.min(1, dt * 6));   // driven back toward the edge
    if (d.t >= DUEL.reel) { d.state = 'idle'; d.t = 0; d.next = DUEL.idle[0]; }
  } else if (d.state === 'trap') {
    const T2 = DUEL.trap, was = d.t - dt, at = (q) => was < q && d.t >= q;
    if (at(0.05)) st.events.push({ type: 'auroraCasts', x: d.x });
    if (at(T2.land)) st.events.push({ type: 'barrelDrop', x: d.x, sound: 'barrelKnock' });
    if (d.t >= T2.end) {
      // shut in Aurora's barrel where she stood
      st.barrel = { x: Math.min(d.x, BARREL.edge - 70), state: 'still', t: 0, fallT: null, rot: 0 };
      st.duel = null;
      st.events.push({ type: 'witchInBarrel' });
      return;
    }
  }
  // her bolts run along the ground at him: leap them
  for (const bo of d.bolts) bo.x -= DUEL.bolt * dt;
  d.bolts = d.bolts.filter((bo) => {
    if (bo.x < BARREL.x0 - 60) return false;
    if (Math.abs(bo.x - w.x) < DUEL.boltR && w.y > BARREL.y - DUEL.boltH) { duelHit(st); return false; }
    return true;
  });
}
export const duelReach = (st) => !!st.duel && st.duel.x - DUEL.hw - (st.w.x + PRINCE_HW) < DUEL.reach - DUEL.hw && st.duel.state !== 'trap';
function duelHit(st) {
  if (hit(st, { cause: 'witch' }) && st.defeatT != null) {
    st.lostTitle = 'The Witch\nHolds the Cliff';
    st.lostSub = 'Leap her fire with A; strike her with the sword with X.';
  }
}
function stepBarrel(st, dt, input) {
  if (st.duel) return stepDuel(st, dt, input);
  const b = st.barrel, w = st.w;
  if (b.fallT != null) {
    b.fallT += dt;
    walk(w, dt, {}, { y: BARREL.y, x0: BARREL.x0, x1: BARREL.edge - 60 });
    if (b.fallT >= FILM_T.barrelFall) startWedding(st);
    return;
  }
  walk(w, dt, input, { y: BARREL.y, x0: BARREL.x0, x1: BARREL.edge - 60 });
  // beaten, she cowers in it: he walks into it and rolls it to the edge
  const contact = w.x + PRINCE_HW >= b.x - BARREL.hw - 2;
  if (contact && w.vx > 20) { b.x += BARREL.push * dt; b.rot += BARREL.push * dt / 40; st.pushing = true; }
  else st.pushing = false;
  if (contact) w.x = Math.min(w.x, b.x - BARREL.hw - PRINCE_HW);
  if (b.x >= BARREL.edge) { b.fallT = 0; st.pushing = false; st.score += 150; st.events.push({ type: 'barrelFall' }); }
}

// The wedding: he walks Azurine (she follows a step behind) along the
// wedding street past the crew, the fairies and the king and queen, to the
// castle gate, catching the petals that fall on the way.
function startWedding(st) {
  setPhase(st, 'wedding');
  st.events.push({ type: 'wedding' });
  st.checkpoint = { scene: 4, film: true, score: st.score, pearls: st.pearls };
  st.w = walker(WEDDING.start, WEDDING.y);
  st.az = { x: WEDDING.start - WEDDING.follow, walk: 0, face: 1 };
  st.petals = Array.from({ length: WEDDING.petals }, (_, i) => ({ x: 180 + ((i * 263) % 680), y: -40 - i * 70, got: false }));
  st.petalsGot = 0;
}
function follow(st, dt, gap) {
  const a = st.az, want = st.w.x - gap * st.w.face, dx = want - a.x;
  const v = clamp(dx * 4, -WALK.speed, WALK.speed);
  a.x += v * dt; a.vx = v; a.walk += Math.abs(v) * dt;
  if (Math.abs(v) > 20) a.face = Math.sign(v);
}
function stepWedding(st, dt, input) {
  const w = st.w;
  walk(w, dt, input, { y: WEDDING.y, x0: WEDDING.x0, x1: WEDDING.gate + 40 });
  follow(st, dt, WEDDING.follow);
  for (const p of st.petals) {
    if (p.got) continue;
    p.y += 70 * dt; p.x += Math.sin(st.phaseT * 2 + p.y * 0.02) * 30 * dt;
    if (p.y > WEDDING.y + 10) { p.y = -30; continue; }
    if (Math.abs(p.x - w.x) < 40 && p.y > w.y - 200 && p.y < w.y) { p.got = true; st.petalsGot++; st.score += 20; st.events.push({ type: 'petal', x: p.x, y: p.y }); }
  }
  if (w.x >= WEDDING.gate) startApotheosis(st);
}

// The apotheosis: the couple walk together into the light beneath Aurora,
// and rise with her.
function startApotheosis(st) {
  setPhase(st, 'apotheosis');
  st.events.push({ type: 'apotheosis' });
  st.w = walker(APOTH.start, APOTH.y);
  st.az = { x: APOTH.start - 80, walk: 0, face: 1 };
  st.riseT = null;
}
function stepApotheosis(st, dt, input) {
  const w = st.w;
  if (st.riseT != null) {
    st.riseT += dt;
    if (st.riseT >= FILM_T.rise) setPhase(st, 'iris');
    return;
  }
  walk(w, dt, input, { y: APOTH.y, x0: APOTH.x0, x1: APOTH.x1 });
  follow(st, dt, 70);
  // both in the light at the centre of the stage
  if (Math.abs(w.x - APOTH.mark - 35) < APOTH.near && Math.abs(st.az.x - APOTH.mark + 35) < APOTH.near + 30) {
    st.riseT = 0; w.vx = 0; st.events.push({ type: 'ascend' });
  }
}

export { GRACE, HOLDS, lerp };

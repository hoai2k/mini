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
  stepCliff, stepHouse, stepQuay, hit, checkpoint, setPhase, climberPos,
} from './act5.js';
import { clamp, lerp } from './shared.js';
import * as art from './act5film-art.js';

// ---------------------------------------------------------------- the swim
// World x along the sea gap, from the foot of the cliff (0) to the tower's
// rock (len). The current pulls back toward the cliff; keep swimming.
// Aurora drives the witch off after `swoops` swoops or `auroraAt` of the way across.
export const SWIM = { len: 2400, speed: 240, current: 45, dive: 0.9, diveCD: 0.45, every: [1.8, 2.4], warn: 1.5, swoops: 3, auroraAt: 0.7, aurora: 2.0 };

// ---------------------------------------------------------------- the tower
// The tower wall: x on stage, y up from the rocks at its foot to the window.
export const TOWER_TOP = 1520;
export const TOWER_HOLDS = [
  { x: 500, y: 0, kind: 'ledge' }, { x: 620, y: 0, kind: 'ledge', start: true }, { x: 740, y: 0, kind: 'ledge' },
  { x: 570, y: 100 }, { x: 680, y: 105 }, { x: 610, y: 200 }, { x: 730, y: 205, pearl: true },
  { x: 660, y: 300 }, { x: 550, y: 305 }, { x: 470, y: 395 }, { x: 530, y: 490, kind: 'ledge' },
  { x: 640, y: 480 }, { x: 750, y: 485 }, { x: 830, y: 575, kind: 'crumble' }, { x: 730, y: 585 }, { x: 625, y: 590, pearl: true },
  { x: 540, y: 680 }, { x: 460, y: 770 }, { x: 560, y: 860, kind: 'ledge' },
  { x: 670, y: 945 }, { x: 600, y: 1040, kind: 'crumble' }, { x: 710, y: 1045 }, { x: 810, y: 1135, pearl: true }, { x: 730, y: 1225 },
  { x: 620, y: 1230 }, { x: 520, y: 1320 }, { x: 600, y: 1415, kind: 'ledge' },
  { x: 640, y: TOWER_TOP, kind: 'top' },
];
export const TOWER_HALF = TOWER_HOLDS.findIndex((h) => h.x === 560 && h.y === 860);

// Cut-scene lengths, seconds.
export const FILM_T = { dive: 3.8, window: 3.6, iris: 1.6, barrelFall: 2.4, wedding: 7.5, apotheosis: 8.5, defeat: 1.8, splash: 1.0, rise: 3.2 };

// The walking scenes between the climbs (all stage px, feet at `y`): the
// clifftop he dives from, the cliff he rolls the witch's barrel over, the
// wedding street and the apotheosis. Each was measured on its delivered set.
export const WALK = { speed: 240, acc: 2000, g: 2000, jump: 720, cut: 2400, buffer: 0.13 };
export const DIVE = { y: 372, x0: 170, edge: 360, start: 210 };          // coast-gap's cliff path
export const BARREL = {                                                  // cliff-whirlpool's ledge
  y: 412, x0: 150, edge: 728, start: 230, at: 470, hw: 40, push: 120,
  shake: 0.7, lurch: 0.35, lurchDist: 150, every: [1.6, 2.4], knock: 320,
};
export const WEDDING = { y: 652, x0: 60, gate: 880, start: 90, follow: 96, petals: 14 };
export const APOTH = { y: 646, x0: 120, x1: 1160, mark: 640, near: 40, start: 220 };
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

function startTower(st, hold = null) {
  setPhase(st, 'tower');
  st.holds = TOWER_HOLDS.map((h) => ({ kind: 'hold', ...h, gone: false }));
  const start = hold ?? st.holds.findIndex((h) => h.start);
  st.cl = { at: start, from: start, moveT: 0, moveDur: 0, kind: null, crumbleT: 0 };
  st.climb = { top: TOWER_TOP, camMax: TOWER_TOP - 330, half: TOWER_HALF, halfScene: 4, openTop: true };
  st.camY = clamp(st.holds[start].y - 250, 0, st.climb.camMax);
  st.rocks = []; st.nextRock = 3.4;
  if (hold == null) checkpoint(st, 3);
}

export const actTower = {
  id: 5, key: 'tower', kicker: 'Act V', title: 'The Enchanted Tower', size: 116, page: 5,
  sub: 'Climb the cliff and dive for the witch’s tower.\nSwim the sea gap, then climb the tower to her window.',
  intertitle: act5.intertitle,
  action: 'A: leap',
  scenes: TOWER_SCENES,
  mood: (st) => (st.phase === 'swim' ? 'storm' : st.phase === 'dive' || st.phase === 'window' ? 'tender' : 'storm'),
  touchVerb: (st) => (st.phase === 'swim' || st.phase === 'dive' ? 'Dive' : 'Leap'),
  touchHint: 'drag to climb, A to leap; in the sea, drag to swim, A to dive',
  touchScheme: (st) => (st.phase === 'swim' ? { mode: 'stick', hint: 'Drag to swim · tap to dive' } : { mode: 'stick', hint: 'Drag to climb' }),

  create({ seed = 1, carry = {}, from = null } = {}) {
    const k = clamp(from?.scene | 0, 0, TOWER_SCENES.length - 1);
    // The cliff, from Act V's own create (scene 1 is its halfway checkpoint).
    const st = act5.create({ seed, carry, from: k === 1 ? { ...from, scene: 1 } : null });
    st.part = 'tower';
    st.carry = { ...CARRY_DEFAULT, ...carry };
    st.events.length = 0;
    if (k >= 2) { st.score = from.score ?? 0; st.pearls = from.pearls ?? 0; }
    if (k === 2) startSwim(st);
    else if (k === 3) startTower(st);
    else if (k === 4) {
      startTower(st, from.hold ?? TOWER_HALF);
      for (const j of from.taken ?? st.holds.map((h, j) => (h.pearl && j <= TOWER_HALF ? j : -1)).filter((j) => j >= 0)) if (st.holds[j]) st.holds[j].taken = true;
    }
    st.events.length = 0;
    st.checkpoint = k > 0 ? { ...from, scene: k } : null;
    return st;
  },

  step(st, dt, input = {}) {
    if (!base(st, dt, input)) return;
    if (st.phase === 'cliff' || st.phase === 'tower') stepCliff(st, dt, input);
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
    if (e.type === 'holdCrumble') return 'The hold crumbles away.';
    return null;
  },

  draw: art.drawTower, drawOver: art.drawOverTower, onEvent: art.onEventTower,
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
  mood: (st) => (st.phase === 'wedding' || st.phase === 'apotheosis' || st.phase === 'iris' ? 'revel' : 'storm'),
  touchVerb: (st) => (['barrel', 'wedding', 'apotheosis'].includes(st.phase) ? '' : st.phase === 'house' && st.carry?.stone && !st.stoneThrown ? 'Leap / lamp' : 'Leap'),
  touchHint: 'drag to walk and climb, A to leap',
  touchScheme: (st) => (['barrel', 'wedding', 'apotheosis'].includes(st.phase) ? { mode: 'swipe', hint: 'Drag ↔ to walk' } : { mode: 'stick', hint: 'Drag to walk · up and down on stairs and ladders' }),

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
    else if (st.phase === 'barrel') { if (!st.barrel) startBarrel(st); stepBarrel(st, dt, input); }
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
      : 0.9 + 0.1 * clamp(((st.barrel?.x ?? BARREL.at) - BARREL.at) / (BARREL.edge - BARREL.at), 0, 1);
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
    if (e.type === 'witchReturns') return 'The witch attacks again, from a barrel! Walk into it to push it over the cliff. Stand clear when it shakes.';
    if (e.type === 'barrelShake') return 'The barrel shakes.';
    if (e.type === 'barrelKnock') return 'The barrel lurches back and knocks you down.';
    if (e.type === 'barrelFall') return 'Into the whirlpool!';
    if (e.type === 'wedding') return 'The wedding. Walk Azurine along the street to the castle gate; catch the falling petals.';
    if (e.type === 'apotheosis') return 'Walk with Azurine to the light beneath Aurora.';
    if (e.type === 'ascend') return 'The Kingdom of the Fairies.';
    return null;
  },

  draw: art.drawBurning, drawOver: art.drawOverBurning, onEvent: art.onEventBurning,
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

// Act VI: the witch's last attack. She rides at the clifftop in a barrel;
// he walks into it to push it toward the edge. Now and then it shakes and
// lurches back at him: standing against it then knocks him down.
function startBarrel(st) {
  setPhase(st, 'barrel');
  st.w = walker(BARREL.start, BARREL.y);
  st.barrel = { x: BARREL.at, v: 0, state: 'still', t: 0, next: 2.0, fallT: null, knocks: 0, rot: 0 };
}
function stepBarrel(st, dt, input) {
  const b = st.barrel, w = st.w;
  if (b.fallT != null) {
    b.fallT += dt;
    walk(w, dt, {}, { y: BARREL.y, x0: BARREL.x0, x1: BARREL.edge - 60 });
    if (b.fallT >= FILM_T.barrelFall) startWedding(st);
    return;
  }
  walk(w, dt, input, { y: BARREL.y, x0: BARREL.x0, x1: BARREL.edge - 60 });
  const contact = w.x + PRINCE_HW >= b.x - BARREL.hw - 2;
  b.t += dt;
  if (b.state === 'still') {
    // he pushes it along when he walks into it
    if (contact && w.vx > 20) { const nx = b.x + BARREL.push * dt; b.x = nx; b.rot += BARREL.push * dt / 40; w.x = Math.min(w.x, b.x - BARREL.hw - PRINCE_HW); st.pushing = true; }
    else { st.pushing = false; if (contact) w.x = Math.min(w.x, b.x - BARREL.hw - PRINCE_HW); }
    if (b.t >= b.next) { b.state = 'shake'; b.t = 0; st.events.push({ type: 'barrelShake', x: b.x }); }
  } else if (b.state === 'shake') {
    if (contact) w.x = Math.min(w.x, b.x - BARREL.hw - PRINCE_HW);
    if (b.t >= BARREL.shake) { b.state = 'lurch'; b.t = 0; b.from = b.x; }
  } else if (b.state === 'lurch') {
    const f = Math.min(1, b.t / BARREL.lurch);
    b.x = Math.max(BARREL.at - 60, b.from - BARREL.lurchDist * Math.sin(f * Math.PI / 2));
    b.rot -= dt * 6;
    if (w.x + PRINCE_HW > b.x - BARREL.hw && w.knockT <= 0) {
      w.knockT = 0.6; w.vx = -BARREL.knock; w.vy = -320; w.on = false; b.knocks++;
      w.x = b.x - BARREL.hw - PRINCE_HW;
      st.events.push({ type: 'barrelKnock', x: w.x });
    }
    if (f >= 1) { b.state = 'still'; b.t = 0; b.next = lerp(BARREL.every[0], BARREL.every[1], (b.knocks * 0.37 + b.x * 0.013) % 1); }
  }
  if (b.x >= BARREL.edge) { b.fallT = 0; st.pushing = false; st.score += 300 + Math.max(0, 3 - b.knocks) * 50; st.events.push({ type: 'barrelFall' }); }
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
  a.x += v * dt; a.walk += Math.abs(v) * dt;
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

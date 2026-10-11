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
import { beatHit, BEAT_WINDOW, clamp, lerp } from './shared.js';
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
export const FILM_T = { dive: 3.8, window: 3.6, iris: 1.6, barrelFall: 2.4, wedding: 7.5, apotheosis: 8.5, defeat: 1.8 };
export const BARREL = { pushes: 3, every: 2 };  // on-beat pushes to roll it over

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
  touchVerb: (st) => (st.phase === 'swim' ? 'Dive' : 'Leap'),
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
    else if (st.phase === 'dive') { if (st.phaseT >= FILM_T.dive) startSwim(st); }
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
  touchVerb: (st) => (st.phase === 'barrel' ? 'On the beat' : st.phase === 'house' && st.carry?.stone && !st.stoneThrown ? 'Leap / lamp' : 'Leap'),
  touchHint: 'drag to walk and climb, A to leap',
  touchScheme: (st) => (st.phase === 'barrel' ? { mode: 'swipe', hint: 'Tap on the beat' } : { mode: 'stick', hint: 'Drag to walk · up and down on stairs and ladders' }),

  create({ seed = 1, carry = {}, from = null } = {}) {
    const k = clamp(from?.scene | 0, 0, BURNING_SCENES.length - 1);
    const lk = LEGACY_SCENE[Math.min(k, 2)];
    const st = act5.create({ seed, carry, from: { ...(from || {}), scene: lk } });
    st.part = 'burning';
    st.carry = { ...CARRY_DEFAULT, ...carry };
    st.score = from?.score ?? 0; st.pearls = from?.pearls ?? 0;
    st.sleepersShown = Math.min(12, Math.max(0, carry.sleepers || 0));
    st.barrel = { pushes: 0, beats: [], fallT: null };
    if (k === 3) { setPhase(st, 'barrel'); st.haz = []; }
    if (k === 4) { setPhase(st, 'wedding'); st.haz = []; }
    st.events.length = 0;
    st.checkpoint = k > 0 ? { ...(from || {}), scene: k } : null;
    return st;
  },

  step(st, dt, input = {}) {
    if (!base(st, dt, input)) return;
    const cpBefore = st.checkpoint;
    if (st.phase === 'house') stepHouse(st, dt, input);
    else if (st.phase === 'quay') stepQuay(st, dt, input);
    else if (st.phase === 'barrel') stepBarrel(st, dt, input);
    else if (st.phase === 'wedding') { if (st.phaseT >= FILM_T.wedding) { setPhase(st, 'apotheosis'); st.events.push({ type: 'apotheosis' }); } }
    else if (st.phase === 'apotheosis') { if (st.phaseT >= FILM_T.apotheosis) setPhase(st, 'iris'); }
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
    const prog = st.phase === 'house' ? (st.p.carry ? 0.45 : 0.15) : st.phase === 'quay' ? 0.7 + 0.2 * clamp((st.p.x - QUAY.x0) / (QUAY.x1 - QUAY.x0), 0, 1) : 0.9 + 0.1 * st.barrel.pushes / BARREL.pushes;
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
    if (e.type === 'witchReturns') return "The witch attacks again! Press A on the beat to roll her barrel over the cliff.";
    if (e.type === 'barrelPush') return `The barrel rolls. ${e.n} of ${BARREL.pushes}.`;
    if (e.type === 'barrelFall') return 'Into the whirlpool!';
    if (e.type === 'wedding') return 'The wedding procession.';
    if (e.type === 'apotheosis') return 'The Kingdom of the Fairies.';
    return null;
  },

  draw: art.drawBurning, drawOver: art.drawOverBurning, onEvent: art.onEventBurning,
};

function stepBarrel(st, dt, input) {
  const b = st.barrel;
  if (b.fallT != null) {
    b.fallT += dt;
    if (b.fallT >= FILM_T.barrelFall) { setPhase(st, 'wedding'); st.events.push({ type: 'wedding' }); st.checkpoint = { scene: 4, film: true, score: st.score, pearls: st.pearls }; }
    return;
  }
  if (input.a) {
    const k = beatHit(st.beat, BEAT_WINDOW);
    if (k != null && !b.beats.includes(k)) {
      b.beats.push(k); b.pushes++; st.score += 100;
      st.events.push({ type: 'barrelPush', n: b.pushes });
      if (b.pushes >= BARREL.pushes) { b.fallT = 0; st.score += 300; st.events.push({ type: 'barrelFall' }); }
    } else st.events.push({ type: 'offBeat' });
  }
}

export { GRACE, HOLDS, lerp };

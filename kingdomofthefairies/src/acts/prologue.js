// Prologue — The Betrothal (film edition only; design/film-adaptation.md).
// Tableaux 1-11 of the film, played on the delivered sets with the cast's
// cut-outs, leading straight into Act I (`intro: true`, src/main.js):
// - the betrothal court: the prince, in his court dress, receives the four
//   fairies' gifts for his bride and takes Azurine's hand; the uninvited witch
//   curses the betrothal;
// - the rampart: her demons' chariot of fire carries Azurine off, and he runs
//   after it along the parapet, leaping the fire it drops;
// - the armoury: the witch binds him, Aurora frees him, and he takes up his
//   helmet, shield and the enchanted sword.
// Nothing can be lost here: fire only knocks him back. B skips the scene.
// Headless: drawing is in prologue-art.js.
import { clamp } from './shared.js';
import * as art from './prologue-art.js';

export const BEAT_S = 60 / 76.5;
export const FLOOR = 600;                       // the court's and the armoury's floor
export const PHYS = { g: 2000, jump: 760, walk: 250, acc: 2200, cut: 2400, buffer: 0.13 };
export const REACH = 70;                        // how near he must stand to take or give
// Who stands where in the court (stage px, feet on the floor unless `y`).
export const GIFTS = ['flower', 'ring', 'crown', 'gold'];
export const FAIRIES = [
  { gift: 'flower', id: 'aurora-stand', x: 300, name: 'Aurora' },
  { gift: 'ring', id: 'fairy-ring', x: 450, name: 'the fairy of the ring' },
  { gift: 'crown', id: 'fairy-crown', x: 600, name: 'the fairy of the crown' },
  { gift: 'gold', id: 'fairy-gold', x: 750, name: 'the fairy of gold' },
];
export const AZURINE_X = 1080;
export const COURT_START = 205;   // just inside the left curtain
// The rampart: a 2560-wide walk along the parapet; the chariot stays ahead.
// y: where he walks on the painted parapet: the front of rampart-strip's coping
// (its top face runs y 482-490), in line with the gargoyles' bases
// The coping steps down in perspective over the strip's first 600 px.
export const rampartFloor = (x) => (x <= 440 ? 508 : x >= 600 ? 494 : 508 - ((x - 440) / 160) * 14);
export const RAMPART = { w: 2560, y: 494, end: 2260, lead: 340, speed: 210, catchUp: 320, dropEvery: 1.25, burn: 1.7, fireW: 30, knock: 330 };
export const CHARIOT_Y = 165;
// The armoury: the racks he takes his arms from.
export const ARMS = [{ id: 'helmet', x: 820 }, { id: 'shield', x: 980 }, { id: 'sword', x: 1140 }];
export const DOOR_X = 1230;   // the way out of the armoury, once armed
export const T = { curse: 4.8, escape: 2.6, bind: 1.8, free: 2.2, knighted: 2.0, iris: 1.3, fade: 0.6 };
const ORDER = ['court', 'curse', 'rampart', 'escape', 'bind', 'free', 'armoury', 'knighted', 'iris'];
export const SCENES = [{ name: 'The Betrothal' }, { name: 'The Abduction' }, { name: 'The Arming' }];
const SCENE_PHASE = ['court', 'rampart', 'bind'];
export const sceneOf = (phase) => (['court', 'curse'].includes(phase) ? 0 : ['rampart', 'escape'].includes(phase) ? 1 : 2);

export default {
  id: 0, key: 'prologue', kicker: 'Prologue', title: 'The Betrothal', size: 120, page: 6, intro: true,
  sub: 'Receive the fairies’ gifts for your bride.\n[A] to take or give · [B] skips a scene.',
  action: 'A: take, give, leap',
  scenes: SCENES,
  mood: (st) => (['curse', 'rampart', 'escape', 'bind'].includes(st.phase) ? 'storm' : ['free', 'armoury', 'knighted', 'iris'].includes(st.phase) ? 'tender' : 'revel'),
  touchVerb: (st) => (st.phase === 'rampart' ? 'Leap' : st.near ? st.near.verb : ''),
  touchHint: 'drag to walk, tap to take or leap',
  touchScheme: () => ({ mode: 'swipe', hint: 'Drag ↔ to walk · tap to take, give or leap' }),

  create({ from = null } = {}) {
    const st = {
      status: 'play', statusT: 0, events: [], result: null, checkpoint: null,
      phase: 'court', phaseT: 0, t: 0, beat: 0, fade: 0,
      p: { x: COURT_START, y: FLOOR, vx: 0, vy: 0, face: 1, on: true, walk: 0, buffer: 0, knockT: 0 },
      gifts: [], betrothed: false, near: null,
      chariot: { x: 0, y: 250, up: 0 }, fires: [], dropT: 0, knocks: 0,
      arms: [], score: 0,
    };
    const k = clamp(from?.scene | 0, 0, SCENES.length - 1);
    if (k > 0) { enter(st, SCENE_PHASE[k]); st.gifts = [...GIFTS]; st.betrothed = true; st.checkpoint = { scene: k }; }
    return st;
  },

  step(st, dt, input = {}) {
    st.statusT += dt; st.t += dt;
    st.beat = input.beat ?? st.t / BEAT_S;
    if (st.status !== 'play') return;
    st.phaseT += dt;
    st.fade = Math.max(0, st.fade - dt / T.fade);
    const ph = st.phase;
    // B skips to the next scene (or out of the prologue from the last).
    if (input.b && st.phaseT > 0.3) return skip(st);
    if (ph === 'court') court(st, dt, input);
    else if (ph === 'curse') { walk(st, dt, input.moveX || 0, input, { x1: AZURINE_X - 50 }); if (st.phaseT >= T.curse) next(st); }
    else if (ph === 'rampart') rampart(st, dt, input);
    else if (ph === 'escape') { walk(st, dt, input.moveX || 0, input, { leap: true, floor: rampartFloor, x0: 60, x1: RAMPART.w - 100 }); st.chariot.up += dt; if (st.phaseT >= T.escape) next(st); }
    else if (ph === 'bind' && st.phaseT >= T.bind) next(st);
    else if (ph === 'free') { walk(st, dt, st.phaseT > 0.9 ? input.moveX || 0 : 0, input); if (st.phaseT >= T.free) next(st); }
    else if (ph === 'armoury') armoury(st, dt, input);
    // armed, he walks out of the armoury's door at the right himself
    else if (ph === 'knighted') { walk(st, dt, input.moveX || 0, input, { x1: 1300 }); if (st.p.x >= DOOR_X) next(st); }
    else if (ph === 'iris') { walk(st, dt, 1, {}, { x1: 1400 }); if (st.phaseT >= T.iris) finish(st); }
  },

  hud: () => null,

  announce(e) {
    if (e.type === 'scene') return {
      court: 'The betrothal court. Walk to each fairy and press A to receive her gift for Princess Azurine.',
      curse: 'The witch, uninvited, curses the betrothal.',
      rampart: "That night her demons carry Azurine away in a chariot of fire. Run after it along the rampart; leap the fire it drops.",
      bind: 'In the armoury the witch binds the prince.',
      free: 'Aurora breaks the spell.',
      armoury: 'Take up your helmet, your shield and the enchanted sword.',
    }[e.phase] || null;
    if (e.type === 'gift') return `${e.from} gives ${e.gift === 'gold' ? 'gold' : 'the ' + e.gift}.`;
    if (e.type === 'betrothed') return 'The prince takes Azurine’s hand.';
    if (e.type === 'arm') return `The ${e.arm}.`;
    if (e.type === 'knighted') return 'Aurora arms him for the rescue. Go out of the door at the right, to the sea.';
    return null;
  },

  draw: art.draw, drawOver: art.drawOver, onEvent: art.onEvent,
};

// Walking (and leaping, where `leap`): the floor at the scene's height, or
// a function of x where the painted floor is not level.
function walk(st, dt, mx, input = {}, { leap = false, floor = FLOOR, x0 = 40, x1 = 1240 } = {}) {
  const p = st.p, floorAt = typeof floor === 'function' ? floor : () => floor;
  if (p.knockT > 0) { p.knockT -= dt; mx = 0; }
  if (Math.abs(mx) > 0.15) p.face = Math.sign(mx);
  p.vx += clamp(mx * PHYS.walk - p.vx, -PHYS.acc * dt, PHYS.acc * dt);
  p.buffer = input.a ? PHYS.buffer : Math.max(0, p.buffer - dt);
  if (leap && p.on && p.buffer > 0) { p.vy = -PHYS.jump; p.on = false; p.buffer = 0; st.events.push({ type: 'leap' }); }
  if (!p.on) {
    p.vy += (PHYS.g + (p.vy < 0 && !input.aHeld ? PHYS.cut : 0)) * dt;
    p.y += p.vy * dt;
    if (p.y >= floorAt(p.x)) { p.y = floorAt(p.x); p.vy = 0; p.on = true; st.events.push({ type: 'land' }); }
  }
  p.x = clamp(p.x + p.vx * dt, x0, x1);
  if (p.on) { p.y = floorAt(p.x); p.walk += Math.abs(p.vx) * dt; }
}

function court(st, dt, input) {
  walk(st, dt, input.moveX || 0, input, { x1: AZURINE_X - 50 });
  const p = st.p;
  // who he is beside, and what A does there
  const f = FAIRIES.find((q) => !st.gifts.includes(q.gift) && Math.abs(q.x - p.x) < REACH);
  const done = st.gifts.length === GIFTS.length;
  st.near = f ? { verb: 'Receive', at: f.x, label: `Receive ${f.gift === 'gold' ? 'the gold' : 'the ' + f.gift}` }
    : done && Math.abs(AZURINE_X - 60 - p.x) < REACH ? { verb: 'Take her hand', at: AZURINE_X, label: 'Take her hand' }
      : null;
  if (!input.a || !st.near) return;
  if (f) {
    st.gifts.push(f.gift); st.score += 50;
    st.events.push({ type: 'gift', gift: f.gift, from: f.name, x: f.x, n: st.gifts.length });
  } else { st.betrothed = true; st.near = null; st.events.push({ type: 'betrothed' }); next(st); }
}

function rampart(st, dt, input) {
  const R = RAMPART, p = st.p, ch = st.chariot;
  walk(st, dt, input.moveX || 0, input, { leap: true, floor: rampartFloor, x0: 60, x1: R.w - 100 });
  // the chariot keeps its lead, faster when he gains on it
  const gap = ch.x - p.x;
  ch.x += (gap < R.lead ? R.catchUp : R.speed) * dt;
  ch.y = CHARIOT_Y + Math.sin(st.t * 1.7) * 14;   // above the gargoyles' heads (y 300)
  // it drops fire on the parapet ahead of him
  st.dropT += dt;
  if (st.dropT >= R.dropEvery && ch.x < R.end + 200) { st.dropT = 0; st.fires.push({ x: ch.x - 40, y: ch.y + 40, vy: 0, burn: 0, lit: false }); st.events.push({ type: 'fireDrop' }); }
  for (const f of st.fires) {
    if (!f.lit) { f.vy += 1400 * dt; f.y += f.vy * dt; if (f.y >= rampartFloor(f.x)) { f.y = rampartFloor(f.x); f.lit = true; st.events.push({ type: 'fireLand', x: f.x }); } }
    else f.burn += dt;
    // fire on the parapet knocks him back (nothing is lost)
    if (f.lit && f.burn < R.burn && p.knockT <= 0 && Math.abs(p.x - f.x) < R.fireW && p.y > rampartFloor(p.x) - 40) {
      p.knockT = 0.45; p.vx = -R.knock * Math.sign(f.x - p.x || 1); p.vy = -280; p.on = false; st.knocks++;
      st.events.push({ type: 'scorched', x: p.x });
    }
  }
  st.fires = st.fires.filter((f) => !f.lit || f.burn < R.burn);
  if (p.x >= R.end) next(st);
}

function armoury(st, dt, input) {
  walk(st, dt, input.moveX || 0, input, { x1: 1200 });
  const p = st.p, a = ARMS.find((q) => !st.arms.includes(q.id) && Math.abs(q.x - p.x) < REACH);
  st.near = a ? { verb: 'Take', at: a.x, label: `Take the ${a.id}` } : null;
  if (input.a && a) {
    st.arms.push(a.id); st.score += 50;
    st.events.push({ type: 'arm', arm: a.id, x: a.x, n: st.arms.length });
    if (st.arms.length === ARMS.length) { st.events.push({ type: 'knighted' }); next(st); }
  }
}

function enter(st, phase) {
  st.phase = phase; st.phaseT = 0; st.near = null;
  const p = st.p;
  if (phase === 'rampart') { Object.assign(p, { x: 140, y: rampartFloor(140), vx: 0, vy: 0, on: true, face: 1, knockT: 0 }); st.chariot = { x: 480, y: CHARIOT_Y, up: 0 }; st.fires = []; st.dropT = 0; st.fade = 1; }
  if (phase === 'bind') { Object.assign(p, { x: 420, y: FLOOR, vx: 0, vy: 0, on: true, face: 1 }); st.fade = 1; }
  if (phase === 'curse') p.vx = 0;
  st.events.push({ type: 'scene', phase });
  const k = SCENE_PHASE.indexOf(phase);
  if (k > 0) st.checkpoint = { scene: k };
}
function next(st) { enter(st, ORDER[ORDER.indexOf(st.phase) + 1]); }

// B: on to the start of the next scene (taking what the skipped one gave).
function skip(st) {
  const k = sceneOf(st.phase);
  if (k === 0) { st.gifts = [...GIFTS]; st.betrothed = true; return enter(st, 'rampart'); }
  if (k === 1) return enter(st, 'bind');
  st.arms = ARMS.map((a) => a.id);
  return st.phase === 'iris' ? finish(st) : enter(st, 'iris');
}

function finish(st) {
  st.status = 'won'; st.statusT = 0;
  st.result = { keepsakes: {}, score: st.score, pearls: 0 };
}

// Bacterium prototype (Level 5 of the Zoom Chain): steer (LS) or run and tumble as a
// magnetotactic spirillum, or as the predator Bdellovibrio, in bog sediment
// at 1000×, at the limit of the light microscope. See README.md.
//
// Micro Zoom: the forward landmark (a host cell with phages landing on it, far
// right) zooms into the phage level; the backdoor (the looming Paramecium, top
// left) rises to the pool. Up to four local players (shared/players.js), with
// the LEGO-style split screen (shared/splitscreen.js) and the edge arrows
// (shared/landmark.js).
import * as THREE from '../shared/vendor/three.module.min.js';
import { mountHud, keyFor } from '../shared/hud.js';
import { createDash, hudControls } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { loadTexture } from '../shared/assets.js';
import { createLightOptics, LOOK_NAMES, psfSigmaUm } from '../shared/techniques/bacterium-fluorescence.js';
import { createShapes } from '../shared/techniques/bacterium-shapes.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, DIC_MODES } from '../shared/techniques/adapters.js';
import { createWorld, oxygenY, segDist, WORLD } from './world.js';
import { createSwimmer, SPECIES } from './swim.js';
import { createGame, GOAL_PREY } from './game.js';
import { createDrawer } from './draw.js';
import { createOverlay } from './overlay.js';
import { createHunger, createCapture, createFight } from '../shared/predation.js';
import { createPlayers } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks } from '../shared/landmark.js';
import { embed } from '../shared/embed.js';
import { gauss } from './world.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.autoClear = false;

// --- players: P1 on the keyboard and the first controller; 2-4 join with any button on another ---
const players = createPlayers({
  max: 4,
  onJoin: (p) => { hud.toast(`Player ${p.slot + 1} joined`); embed.join(p.slot, p.color, p.name); },
  onLeave: (p) => { hud.toast(`Player ${p.slot + 1} left`); embed.leave(p.slot); },
  onChange: (list) => { if (hud) hud.players(list); },
});
if (embed.players) players.fromJSON(embed.players);
embed.on('players', (r) => players.fromJSON(r));
const pad = players.pad(0);
const ctl = players.controls(0);
const hud = mountHud({
  title: 'Bacterium',
  sub: 'A magnetotactic spirillum, 3 µm long, in bog sediment at 1000× (or the predator Bdellovibrio). Steer with the stick; let go and Brownian motion, flow and the field push you about.',
  controls: hudControls({
    move: 'Steer: the cell turns toward the stick and swims (speed from the tilt). Let go: you drift at the mercy of the water',
    camera: 'Move the stage',
    dash: 'Sprint run: every flagellum at full motor speed (recharges). Sprinting out of a grazer\'s current wears it down',
    attack: 'Hold: take up food · Bdellovibrio: attach and bore into prey',
    defend: 'Defend: tumble, a quick random turn that leans toward the stick. At the moment a predator strikes (a grazer\'s surge, a phage landing, a Bdellovibrio\'s ram) it evades',
    special: 'Data overlay: oxygen, food, field lines (data, not optics). At the Paramecium: back to the pool',
    analog: 'Fine focus down / up',
    secondary: 'Reverse the run: the other pole leads (back along the field)',
    look: 'Look: phase, fluorescence, darkfield, SEM, DIC',
    zoom: 'Field: 180 µm eyepiece … 22 µm camera crop',
  }),
  note: 'Real scale and speeds in µm and µm/s; a few labelled stretches (see Features). Goal: find the microaerobic band (0.5–5 % oxygen) and feed until you divide; as Bdellovibrio, take three prey. The brass chevron points to the host cell where phages land (the way on); the ring to the Paramecium (the way back). Up to four players: press any button on another controller to join.',
});
hud.players(players.list);
/** A button as the instructions should name it: the controller's, or the key while no controller is connected. */
const glyph = (b) => (hud.glyphs === 'keyboard' ? keyFor(b) || b : b);

// --- tiny DOM bits: end card, DATA tag, scale bar, oxygen ticks, warnings, the backdoor prompt ---
const card = Object.assign(document.createElement('div'), { className: 'bx-card' });
const tag = Object.assign(document.createElement('div'), { className: 'bx-tag', textContent: 'DATA OVERLAY · not optics: what the cell senses' });
const scaleEl = Object.assign(document.createElement('div'), { className: 'bx-scale' });
const o2El = Object.assign(document.createElement('div'), { className: 'bx-o2' });
const warnEl = document.createElement('div');
warnEl.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,12,16,.7);color:#ff8a7a;border-radius:12px;padding:6px 14px;font:600 13px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap;z-index:20;display:none;max-width:calc(100vw - 32px);overflow:hidden;text-overflow:ellipsis;text-align:center';
const promptEl = document.createElement('div');
promptEl.style.cssText = 'position:fixed;left:50%;bottom:14vh;transform:translateX(-50%);background:rgba(18,16,10,.72);color:#efe4c4;border:1px solid rgba(201,163,90,.7);border-radius:999px;padding:5px 14px;font:600 13px system-ui,sans-serif;pointer-events:none;z-index:6;display:none';
// the corner brackets that mark each player's cell (a game marker, not optics), clipped to each split view
const markCv = document.createElement('canvas');
markCv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:3';
document.body.append(card, tag, scaleEl, o2El, warnEl, promptEl, markCv);
const markG = markCv.getContext('2d');

// --- simulation ---
const world = createWorld();
const drawer = createDrawer(world);
const dashFor = (sp) => (sp === 'mtb' ? createDash({ duration: 0.6, cooldown: 3 }) : createDash({ duration: 0.45, cooldown: 2.5 }));
/** Every player's cell: its own swimmer, rules (game), dash, catch and HUD state. */
const roster = [];
function makePlayer(p) {
  const swimmer = createSwimmer(world);
  const P = {
    slot: p.slot, color: p.color, name: `Player ${p.slot + 1}`, swimmer, S: swimmer.state, game: createGame(world, swimmer),
    dash: dashFor('mtb'), pad: players.pad(p.slot), ctl: players.controls(p.slot),
    capture: createCapture({ onRespawn: () => respawnPlayer(P) }),
    cat: { kind: null, who: null, phase: null, t: 0, x0: 0, y0: 0, a0: 0, zoom0: 2, released: false },
    backT: 0, eatenFor: 0, msg: { phageHint: false }, blockT: 0, sprintT: 0, phage: null, bdello: null,
  };
  // the capture's card (unused: the catch follows the predator, then respawns), its veil (the
  // fade) and caption: in multiplayer one player's fade must not black out everyone's screen
  P.card = P.capture.card;
  P.veil = P.card.nextElementSibling;
  return P;
}
const P1 = makePlayer(players.get(0));
roster.push(P1);
const swimmer = P1.swimmer, game = P1.game, S = P1.S;
const multi = () => roster.length > 1;
const alive = () => roster.filter((P) => P.S.alive);

/** Keep one player record per joined player (a join during play, or the shell's roster). */
function syncRoster() {
  for (const p of players.list) {
    if (roster.some((P) => P.slot === p.slot)) continue;
    const P = makePlayer(p);
    P.swimmer.reset(P1.S.species);
    P.dash = dashFor(P1.S.species);
    roster.push(P);
    roster.sort((a, b) => a.slot - b.slot);
    placeNear(P, P1);
  }
  for (let i = roster.length - 1; i >= 0; i--) {
    const P = roster[i];
    if (P === P1 || players.get(P.slot)) continue;
    P.capture.reset(false);
    P.card.remove(); if (P.veil) { P.veil.nextElementSibling && P.veil.nextElementSibling.remove(); P.veil.remove(); }
    roster.splice(i, 1);
  }
  for (const P of roster) { const p = players.get(P.slot); P.waiting = !!(p && p.waiting); if (P.veil) P.veil.style.visibility = multi() ? 'hidden' : ''; }
}
/** Put P beside a teammate (a few body lengths away, clear of grains). */
function placeNear(P, M) {
  const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 2;
  const m = M.S.inside || M.S;
  P.S.x = Math.max(WORLD.x0 + 4, Math.min(WORLD.x1 - 4, m.x + Math.cos(a) * d));
  P.S.y = Math.max(world.surfaceY(P.S.x) + 2, Math.min(WORLD.y1 - 6, m.y + Math.sin(a) * d));
  P.S.a = m.a !== undefined ? m.a + (Math.random() - 0.5) : P.S.a;
  world.pushOutOfGrains(P.S, P.S.sp.r + 0.2);
}

// --- pacing: a calm opening, then predators that come and go (shared/predation.js) ---
// Grazers switch their feeding current on and off; phages come in clouds from a
// nearby lysis and thin out; Bdellovibrio and the amoeba's edge only come for
// you while hungry. A restart gives a fresh calm opening.
const pacing = { grace: 45, cycles: true, now: 0, t0: 0, firstHungry: null, firstThreat: null, firstCatch: null };
world.grazers.forEach((g, i) => { g.hunger = createHunger({ grace: pacing.grace + i * 10, hungry: [20, 35] }); g.feeding = false; });
const phageH = createHunger({ grace: pacing.grace + 5, hungry: [20, 30], restMissed: [20, 35] });
const bdelloH = createHunger({ grace: pacing.grace + 12 });
const amoebaH = createHunger({ grace: pacing.grace + 15, hungry: [30, 50] });
const predators = () => [
  ...world.grazers.map((g, i) => ({ name: `grazer ${i + 1}`, h: g.hunger, on: world.opts.grazers })),
  { name: 'phages', h: phageH, on: world.opts.phages }, { name: 'Bdellovibrio', h: bdelloH, on: world.opts.hunters }, { name: 'amoeba', h: amoebaH, on: world.opts.amoeba },
];
const isHungry = (h) => (pacing.cycles ? h.hungry : h.state !== 'grace');
const hungerText = (h) => (h.state === 'grace' ? `calm ${Math.ceil(h.left)} s` : !pacing.cycles ? 'on' : h.state === 'hungry' ? `on ${Math.ceil(h.left)} s` : `off ${Math.ceil(h.left)} s`);
function resetPressure() {
  const g = pacing.grace, o = g ? 1 : 0;
  world.grazers.forEach((gr, i) => { gr.hunger.reset(g + o * i * 10); gr.feeding = false; gr.gulping = false; });
  phageH.reset(g + o * 5); bdelloH.reset(g + o * 12); amoebaH.reset(g + o * 15);
  pacing.t0 = pacing.now; pacing.firstHungry = null; pacing.firstThreat = null; pacing.firstCatch = null;
  for (const p of world.phages) p.anim = false;
  for (const c of world.cells) if (c.kind === 'bdello' && c.prey && c.prey.isPlayer) { c.prey = null; c.cooldown = 6; c.L = 1.0; }
}
let phageWas = false;
function updatePressure(dt) {
  for (const p of predators()) p.h.update(dt);
  for (const g of world.grazers) g.feeding = isHungry(g.hunger) || roster.some((P) => P.S.caught && P.S.caught.who === g);
  world.hunt.phage = isHungry(phageH);
  world.hunt.bdello = isHungry(bdelloH);
  world.hunt.amoeba = isHungry(amoebaH);
  // a phage cloud: a nearby infected cell bursts, and its phages drift your way (towards one of the players)
  const live = alive();
  if (world.hunt.phage && !phageWas && world.opts.phages && live.length) {
    const T = live[Math.floor(Math.random() * live.length)].S;
    const a = Math.random() * 6.28, d = 24 + Math.random() * 10;
    world.addPatch(T.x + Math.cos(a) * d, Math.max(world.surfaceY(T.x) + 6, T.y + Math.sin(a) * d), true);
    hud.toast(`A cell nearby has burst: a cloud of phages drifts in. Keep moving, shake off any that stick (${glyph('A')} / ${glyph('B')})`, 3200);
  }
  if (!world.hunt.phage && phageWas && live.length) hud.toast('The phage cloud has thinned out', 2000);
  phageWas = world.hunt.phage;
  if (pacing.firstHungry === null && predators().some((p) => p.on && isHungry(p.h))) pacing.firstHungry = pacing.now - pacing.t0;
}

// --- being caught: strike → hold → eat → the Eaten card (shared/predation.js) ---
// Solo: the Eaten card and A to start again. Multiplayer: the catch plays out
// the same, then the player rejoins beside a teammate.
const CATCH = {
  grazer: { by: 'A peritrich', how: 'swept you into its oral funnel and packed you into a food vacuole', sound: 'bacterium/graze',
    strike: 'Caught in the feeding current: drawn into the oral funnel', hold: 'Down the funnel: the oral cilia sweep you deeper', eat: 'Packed into a food vacuole: digestion begins' },
  amoeba: { by: 'The amoeba', how: 'closed you into a phagosome', sound: 'bacterium/graze',
    strike: 'The amoeba\'s edge rises round you', hold: 'Its lobes meet over you: you are enclosed', eat: 'Closed into a phagosome, drawn in and darkening' },
  phage: { by: 'A phage', how: 'injected its DNA: your cell burst into new phages', sound: 'bacterium/phage',
    strike: 'The phage\'s tail sheath contracts: its tube pierces the envelope', hold: 'Its DNA is going in', eat: 'Lytic cycle: the cell rounds up, fills with new phages and bursts' },
  bdello: { by: 'Bdellovibrio', how: 'bored in and turned you into a bdelloplast', sound: 'bacterium/eat',
    strike: 'Bdellovibrio rams your wall', hold: 'It bores through into the periplasm', eat: 'You round up into a bdelloplast: it eats you from inside' },
};
const capture = P1.capture;
const cat = P1.cat;
function startCatch(P, { kind, who }) {
  const S = P.S, cat = P.cat;
  Object.assign(cat, { kind, who, phase: 'strike', t: 0, x0: S.x, y0: S.y, a0: S.a, zoom0: view.zoom, released: false });
  S.catchAnim = cat;
  P.eatenFor = 0;
  P.capture.start({ by: CATCH[kind].by, how: CATCH[kind].how });
  audio.play(CATCH[kind].sound, { volume: 1, rate: kind === 'amoeba' ? 0.7 : 1 });
  P.pad.rumble(400, 0.7, 0.8);
  if (kind === 'phage') who.p.anim = true;
  if (pacing.firstCatch === null) pacing.firstCatch = pacing.now - pacing.t0;
  embed.captured({ by: CATCH[kind].by, player: P.slot });
}
const catcherHunger = (cat) => (cat.kind === 'grazer' ? cat.who.hunger : cat.kind === 'phage' ? phageH : cat.kind === 'bdello' ? bdelloH : amoebaH);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
function stepCatch(P, dt) {
  const S = P.S, cat = P.cat;
  if (!P.capture.active) return;
  const prev = cat.phase;
  const c0 = P.capture.update(dt);
  if (!c0.active) return; // over: respawnPlayer has run
  // after the eat the catch follows the predator (follow, fade out, fade in): drawn as 'eaten'
  const c = { ...c0, phase: AFTER.has(c0.phase) ? 'eaten' : c0.phase };
  cat.realPhase = c0.phase;
  cat.phase = c.phase; cat.t = c.t;
  const k = c.t, e = c.phase === 'eaten' ? 1 : c.phase === 'eat' ? ease(k) : 0;
  if (c.phase !== prev) {
    if (c.phase === 'eat') {
      catcherHunger(cat).fed();
      audio.play(cat.kind === 'phage' ? 'bacterium/phage' : 'bacterium/eat', { volume: 0.9, rate: 0.7 });
    }
    if (c.phase === 'hold' && cat.kind === 'bdello') audio.play('bacterium/eat', { volume: 0.8, rate: 1.2 });
  }
  if (cat.kind === 'grazer') {
    const g = cat.who, Q = g.pose, R = g.R;
    g.gulping = c.phase !== 'eaten';
    const deep = { x: Q.mouth.x - Q.up.x * R * 0.55, y: Q.mouth.y - Q.up.y * R * 0.55 };
    if (c.phase === 'strike') { const q = ease(k); S.x = cat.x0 + (Q.mouth.x - cat.x0) * q; S.y = cat.y0 + (Q.mouth.y - cat.y0) * q; S.a += dt * 7; }
    else if (c.phase === 'hold') { const q = ease(k); S.x = Q.mouth.x + (deep.x - Q.mouth.x) * q; S.y = Q.mouth.y + (deep.y - Q.mouth.y) * q; S.a += dt * 6; }
    else { S.x = deep.x - Q.up.x * R * 0.25 * e + Q.up.y * R * 0.3 * e; S.y = deep.y - Q.up.y * R * 0.25 * e - Q.up.x * R * 0.3 * e; S.a += dt * 2 * (1 - e); }
  } else if (cat.kind === 'amoeba') {
    // the phagosome is drawn in and carried along as the edge creeps on
    const A = cat.who, nx = -Math.sin(A.ang), ny = Math.cos(A.ang);
    if (cat.ax === undefined) { cat.ax = cat.x0 - A.x; cat.ay = cat.y0 - A.y; }
    S.x = A.x + cat.ax - nx * 6 * e; S.y = A.y + cat.ay - ny * 6 * e;
  } else if (cat.kind === 'phage') {
    if (c.phase === 'eaten' && !cat.released) {
      // the burst: new phages into the water
      cat.released = true;
      for (let i = 0; i < 30; i++) { const p = world.newPhage(S.x + gauss(Math.random) * 1.2, S.y + gauss(Math.random) * 1.2); p.z = (Math.random() - 0.5) * 0.4; world.phages.push(p); }
      for (const ph of S.phages) ph.p.anim = true; // the shells stay with the ghost
      P.pad.rumble(250, 0.5, 0.4);
    }
  } else if (cat.kind === 'bdello') {
    const b = cat.who, sp = S.sp;
    b.attachT = 0;
    const pole = { x: S.x + Math.cos(S.a) * sp.L * 0.5, y: S.y + Math.sin(S.a) * sp.L * 0.5 };
    if (c.phase === 'strike') { const q = 1 - ease(k); b.x = pole.x + Math.cos(S.a) * (0.55 + 1.6 * q); b.y = pole.y + Math.sin(S.a) * (0.55 + 1.6 * q); b.a = S.a + Math.PI; }
    else if (c.phase === 'hold') { const q = ease(k); b.x = pole.x + Math.cos(S.a) * 0.55 * (1 - q) - Math.cos(S.a) * sp.L * 0.35 * q; b.y = pole.y + Math.sin(S.a) * 0.55 * (1 - q) - Math.sin(S.a) * sp.L * 0.35 * q; b.a = S.a + Math.PI; }
    else { b.x = S.x; b.y = S.y; b.a = S.a + Math.PI * 0.5 + e * 1.2; b.L = 1.0 - 0.3 * e; b.curve = 0.7 + 0.8 * e; }
  }
  // the grazer carries the food vacuole off: its bell contracts on its stalk and re-extends
  if (cat.kind === 'grazer' && c0.phase === 'follow' && c0.t < 0.05) { cat.who.contract = 1.6; cat.who.ext = 0.4; }
}
const AFTER = new Set(['follow', 'fadeOut', 'fadeIn']);
/** The catch is over (the screen is black): respawn beside a teammate, or (alone) at a safe spot. */
function respawnPlayer(P) {
  const cat = P.cat;
  if (cat.kind === 'grazer' && cat.who) cat.who.gulping = false;
  if (cat.kind === 'bdello' && cat.who) { const b = cat.who; b.prey = null; b.cooldown = 6; b.L = 1.0; b.curve = 0.7; }
  cat.kind = null; cat.who = null; cat.phase = null; cat.ax = undefined;
  P.swimmer.reset(P.S.species);
  P.dash = dashFor(P.S.species);
  P.eatenFor = 0; P.phage = null; P.bdello = null;
  const mates = alive().filter((Q) => Q !== P && !Q.capture.active);
  if (mates.length) { placeNear(P, mates[0]); hud.toast(`${P.name} is back, beside ${mates[0].name}`); return; }
  // a safe spot in the band: the candidate furthest from the grazers' funnels and the amoeba's edge
  let best = { x: -20, y: 32 }, bd = -1;
  for (let i = 0; i < 20; i++) {
    const q = { x: WORLD.x0 + 30 + Math.random() * (WORLD.x1 - WORLD.x0 - 60), y: oxygenY(1 + Math.random() * 3) };
    const d = Math.min(...world.grazers.map((g) => Math.hypot(q.x - g.pose.mouth.x, q.y - g.pose.mouth.y)), Math.hypot(q.x - world.amoeba.x, q.y - world.amoeba.y) - 40);
    if (d > bd) { bd = d; best = q; }
  }
  P.S.x = best.x; P.S.y = best.y;
  world.pushOutOfGrains(P.S, P.S.sp.r + 0.2);
  if (P === P1) { view.cx = P.S.x; view.cy = P.S.y; }
  hud.toast(multi() ? `${P.name} is back` : 'A new cell swims into the field, away from the predators', 2400);
}
/** Multiplayer: a caught or spent player comes back beside a teammate (solo uses the cards). */
function rejoin(P) {
  const cat = P.cat;
  if (cat.kind === 'grazer' && cat.who) cat.who.gulping = false;
  if (cat.kind === 'bdello' && cat.who) { const b = cat.who; b.prey = null; b.cooldown = 6; b.L = 1.0; b.curve = 0.7; }
  P.capture.reset(false);
  cat.kind = null; cat.who = null; cat.phase = null;
  P.swimmer.reset(P.S.species);
  P.dash = dashFor(P.S.species);
  P.eatenFor = 0;
  const mates = alive().filter((Q) => Q !== P);
  if (mates.length) { placeNear(P, mates[0]); hud.toast(`${P.name} is back, beside ${mates[0].name}`); }
  else { P.S.x = -20; P.S.y = 32; hud.toast(`${P.name} is back`); }
}

// --- the fights ----------------------------------------------------------------
// Every predator winds up readably before it strikes (shared/predation.js
// createFight), and B (the tumble) at the strike evades it:
//  - a grazer: its oral cilia beat harder and its funnel tips toward you while
//    the feeding current intensifies (wind-up), then a surge pulls (strike);
//    caught at the funnel's mouth then, you are swept in. Sprinting out (A)
//    wears it down; out of interest it coils back on its stalk.
//  - a phage: it homes in (a game stretch: phages only diffuse), its long tail
//    fibres catch your wall and its baseplate settles (wind-up), then it
//    commits (strike) and binds. Tumbling at that moment shakes it off.
//  - Bdellovibrio (hunting the magnetotactic cell): it stalks you, lines up a
//    few µm off with a tremble (wind-up), then rams (strike).
const segTo = (x, y, S) => segDist(x, y, S.x, S.y, S.a, S.sp.L)[0];
const fightable = (P) => P.S.alive && !P.capture.active && !P.waiting;
const towards = (a, b, v, dt, o) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const m = Math.min(d, v * dt); o.x = a.x + (dx / d) * m; o.y = a.y + (dy / d) * m; return o; };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
for (const g of world.grazers) g.fight = createFight({ windup: 1.1, strike: 0.5, recoverT: 1.2, repelT: 1.6, retreatT: 8, facingRate: 0, blockHit: 0.36, biteHit: 0.3 });
function runFights(dt) {
  const who = (P) => (multi() ? `${P.name}: ` : '');
  for (const P of roster) { P.blockT = Math.max(0, P.blockT - dt); P.sprintT = Math.max(0, P.sprintT - dt); }
  // grazers
  for (const g of world.grazers) {
    const live = world.opts.grazers && g.contract <= 0 && g.feeding !== false;
    let T = null, d = Infinity;
    if (live) for (const P of roster) { if (!fightable(P)) continue; const q = Math.hypot(P.S.x - g.pose.mouth.x, P.S.y - g.pose.mouth.y); if (q < d) { d = q; T = P; } }
    const f = g.fight.update(dt, { near: !!T && d < 45, inReach: !!T && d < 24, facing: !!T && T.blockT > 0, blocking: !!T && T.blockT > 0 });
    g.fightState = live ? f.state : 'stalk'; g.fightT = f.t; g.target = T;
    const want = !live ? 1 : f.state === 'windup' ? 1 + 1.5 * f.t : f.state === 'strike' ? 3.4 : f.state === 'repelled' ? 0.2 : f.state === 'retreat' ? 0.1 : 1;
    g.pull = (g.pull || 1) + (want - (g.pull || 1)) * Math.min(1, dt * (f.state === 'strike' ? 14 : 5));
    // the funnel tips toward its target as it winds up
    let lean = 0;
    if (T && (f.state === 'windup' || f.state === 'strike')) { const up = Math.atan2(g.pose.up.y, g.pose.up.x); lean = Math.max(-0.45, Math.min(0.45, wrapA(Math.atan2(T.S.y - g.pose.mouth.y, T.S.x - g.pose.mouth.x) - up))) * (f.state === 'strike' ? 1 : f.t); }
    g.lean = (g.lean || 0) + (lean - (g.lean || 0)) * Math.min(1, dt * 4);
    if (!T) continue;
    if (T.sprintT > 0 && d < 34 && f.state !== 'retreat') { T.sprintT = 0; const gone = g.fight.bitten(); hud.toast(gone ? `${who(T)}You sprint out of its current: the grazer gives up` : `${who(T)}You sprint against the current: its pull falters`, 1800); }
    if (f.hit && d < 8) { const ev = {}; T.game.catchBy('grazer', g, ev); if (ev.caught) startCatch(T, ev.caught); }
    if (f.blocked) { T.pad.rumble(200, 0.6, 0.5); hud.toast(`${who(T)}Tumbled clear: the grazer's surge misses you`, 1800); }
    // out of interest (worn down by sprints and dodges): it coils back on its stalk and its current stops
    if (g.fight.state === 'retreat' && !g.retreating) { g.retreating = true; g.contract = 3; g.ext = 0; g.hunger.missed(); hud.toast('The grazer gives up: it coils back on its stalk', 2000); }
    else if (g.fight.state !== 'retreat') g.retreating = false;
  }
  // phages and Bdellovibrio, per player
  for (const P of roster) {
    const S = P.S;
    // --- a phage homing in ---
    if (P.phage && (!fightable(P) || !world.opts.phages || !world.hunt.phage || P.phage.p.stuck)) { P.phage.p.homing = false; P.phage = null; }
    if (!P.phage && fightable(P) && world.opts.phages && world.hunt.phage) {
      P.phageCool = (P.phageCool ?? 3) - dt;
      if (P.phageCool <= 0) {
        P.phageCool = 0.5;
        let best = null, bd = 18;
        for (const p of world.phages) { if (p.stuck || p.anim || p.homing) continue; const q = Math.hypot(p.x - S.x, p.y - S.y); if (q < bd) { bd = q; best = p; } }
        if (best) { P.phageCool = 6 + Math.random() * 5; best.homing = true; best.splay = 0; P.phage = { p: best, fight: createFight({ windup: 0.75, strike: 0.25, recoverT: 1, repelT: 1, retreatT: 2.5, facingRate: 0, blockHit: 1, biteHit: 1 }) }; }
      }
    }
    if (P.phage) {
      const { p, fight } = P.phage;
      const d = segTo(p.x, p.y, S) - S.sp.r;
      const f = fight.update(dt, { near: d < 22, inReach: d < 1.5, facing: P.blockT > 0, blocking: P.blockT > 0 });
      // the nearest point of your wall, and just outside it
      const ca = Math.cos(S.a), sa = Math.sin(S.a);
      const u = Math.max(-S.sp.L / 2, Math.min(S.sp.L / 2, (p.x - S.x) * ca + (p.y - S.y) * sa));
      const qx = S.x + ca * u, qy = S.y + sa * u, nl = Math.hypot(p.x - qx, p.y - qy) || 1;
      const nx = (p.x - qx) / nl, ny = (p.y - qy) / nl;
      p.dirA = Math.atan2(-ny, -nx);
      if (f.state === 'stalk') towards(p, { x: qx + nx * 1.0, y: qy + ny * 1.0 }, 32, dt, p);
      else if (f.state === 'windup') { p.x = qx + nx * (S.sp.r + 0.55); p.y = qy + ny * (S.sp.r + 0.55); p.splay = f.t; }
      else if (f.state === 'strike') { p.x = qx + nx * (S.sp.r + 0.55 * (1 - f.t)); p.y = qy + ny * (S.sp.r + 0.55 * (1 - f.t)); p.splay = 1; }
      else { towards(p, { x: p.x + nx * 5, y: p.y + ny * 5 }, 8, dt, p); p.splay *= Math.exp(-dt * 3); }
      if (f.hit) {
        const side = (p.x - S.x) * -sa + (p.y - S.y) * ca > 0 ? 1 : -1;
        const ph = { p, u, side, t: 0, irreversible: false, shed: false };
        p.stuck = ph; p.homing = false; S.phages.push(ph); P.phage = null;
        audio.play('bacterium/phage', { volume: 0.8 }); P.pad.rumble(80, 0.4, 0.1);
        hud.toast(`${who(P)}A phage has bound to your wall: sprint (${glyph('A')}) or tumble (${glyph('B')}) within 3 s to shake it off`, 2600);
      } else if (f.blocked || f.retreated || d > 26 || (P.sprintT > 0 && d < 3)) {
        if (f.blocked || P.sprintT > 0) hud.toast(`${who(P)}Shaken off: the phage's fibres let go`, 1500);
        p.homing = false; p.splay = 0; p.x += nx * 2; p.y += ny * 2; P.phage = null;
      }
    }
    // --- Bdellovibrio lining up to ram the magnetotactic cell ---
    if (P.bdello && (!fightable(P) || S.species !== 'mtb' || !world.opts.hunters || !world.hunt.bdello || S.attacker)) { P.bdello.c.stalking = null; P.bdello.c.cooldown = 6; P.bdello = null; }
    if (!P.bdello && fightable(P) && S.species === 'mtb' && world.opts.hunters && world.hunt.bdello && !S.attacker) {
      P.bdelloCool = (P.bdelloCool ?? 2) - dt;
      if (P.bdelloCool <= 0) {
        P.bdelloCool = 0.5;
        let best = null, bd = 30;
        for (const c of world.cells) { if (c.kind !== 'bdello' || c.prey || c.hidden > 0 || c.cooldown > 0 || c.stalking) continue; const q = Math.hypot(c.x - S.x, c.y - S.y); if (q < bd) { bd = q; best = c; } }
        if (best) { P.bdelloCool = 3; best.stalking = P; best.cooldown = 99; P.bdello = { c: best, fight: createFight({ windup: 0.85, strike: 0.3, recoverT: 1.2, repelT: 1.3, retreatT: 4, facingRate: 0, blockHit: 0.5, biteHit: 0.4 }) }; }
      }
    }
    if (P.bdello) {
      const { c, fight } = P.bdello;
      const d = segTo(c.x, c.y, S) - S.sp.r;
      const f = fight.update(dt, { near: d < 32, inReach: d < 6, facing: P.blockT > 0, blocking: P.blockT > 0 });
      const to = Math.atan2(S.y - c.y, S.x - c.x);
      const off = { x: S.x - Math.cos(to) * (S.sp.L * 0.5 + 4.2), y: S.y - Math.sin(to) * (S.sp.L * 0.5 + 4.2) };
      c.tumble = 0;
      if (f.state === 'stalk') { towards(c, off, 85, dt, c); c.a = to; }
      else if (f.state === 'windup') { towards(c, off, 120, dt, c); c.a = to + Math.sin(t * 46) * 0.12 * f.t; c.flPhase += dt * 30; }
      else if (f.state === 'strike') { towards(c, S, 170, dt, c); c.a = to; }
      else if (f.state === 'retreat') { towards(c, { x: c.x - Math.cos(to) * 10, y: c.y - Math.sin(to) * 10 }, 90, dt, c); c.a = to + Math.PI; }
      else { towards(c, { x: c.x - Math.cos(to) * 4, y: c.y - Math.sin(to) * 4 }, f.state === 'repelled' ? 50 : 15, dt, c); c.a = to; }
      c.windup = f.state === 'windup' ? f.t : f.state === 'strike' ? 1 : 0;
      if (f.hit && d < 1.4) {
        S.attacker = c; c.prey = { x: S.x, y: S.y, a: S.a, L: S.sp.L, isPlayer: true }; c.attachT = 0; S.attackT = 0; c.stalking = null; c.windup = 0; P.bdello = null;
        P.pad.rumble(300, 0.8, 0.8);
        hud.toast(`${who(P)}Bdellovibrio has rammed you! Sprint (${glyph('A')}) or tumble (${glyph('B')}) to shake it off`, 2600);
      } else if (f.blocked || f.retreated || d > 45 || (P.sprintT > 0 && d < 8 && fight.bitten())) {
        if (f.blocked) { P.pad.rumble(150, 0.5, 0.4); hud.toast(`${who(P)}Tumbled: the Bdellovibrio's ram misses`, 1500); }
        if (f.retreated || fight.state === 'retreat') bdelloH.missed();
        c.stalking = null; c.cooldown = 6; c.windup = 0; P.bdello = null;
      }
    }
  }
}

// --- rendering ---
const optics = createLightOptics(renderer);
const shapes = createShapes(6000);
const overlay = createOverlay();
const looks = createBorrowedLooks(renderer);
// split screen: in a 2D field the view is drawn around a centre; each view is
// rendered to the screen and captured (the optics end on the screen)
/** The split layout without degenerate (empty) regions, for shared/landmark.js. */
const arrowSplit = () => { const L = split.layout; return { layout: { ...L, regions: L.regions.filter((r) => r.polygon.length > 2) }, project: split.project }; };
const split = createSplitScreen(renderer, { capture: true });
const marks = createLandmarks({ zIndex: 4 });

// Delivered art (null until delivered; the ids may not be in the list yet).
const safeTexture = (id) => { try { return loadTexture(id, { srgb: false }); } catch { return Promise.resolve(null); } };
const plates = { phase: null };
safeTexture('MP-B01').then((t) => { if (t) plates.phase = t; });
safeTexture('MP-B02').then((t) => { if (t) shapes.setTextures({ bio: t }); });
safeTexture('MP-B03').then((t) => { if (t) shapes.setTextures({ cil: t }); });
safeTexture('MP-B04').then((t) => { if (t) shapes.setTextures({ mag: t }); });

const ZOOMS = [180, 90, 45, 22]; // field height in µm: the eyepiece field at 1000×, then camera crops
/** The field shown: being eaten (alone), the camera pulls back to watch the predator, then follows it. */
const zoomIdx = () => (!multi() && P1.capture.active && P1.cat.realPhase && /eat|follow|fade/.test(P1.cat.realPhase) ? Math.min(view.zoom, 1) : view.zoom);
const view = { mark: true, zoom: 2, cx: 0, cy: 30, stage: new THREE.Vector2(), focus: 0, look: 'phase', overlay: false, stop: true, focusFollows: true };

const gl = renderer.getContext();
const soft = /SwiftShader|llvmpipe|Software/i.test(String(gl.getParameter(gl.RENDERER)) + (gl.getExtension('WEBGL_debug_renderer_info') ? gl.getParameter(0x9246) : ''));
let renderScale = soft ? 0.5 : 1;
let splitScale = 1; // a split frame renders every view: each at a lower resolution
function resize() {
  const pr = Math.min(devicePixelRatio || 1, 1.5) * renderScale * splitScale;
  // CSS size with a pixel ratio, so the split screen and the edge arrows work in CSS px
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  const b = renderer.getDrawingBufferSize(new THREE.Vector2());
  optics.resize(Math.max(2, b.x), Math.max(2, b.y));
}
addEventListener('resize', resize);
resize();

// --- features ---
const features = createFeatures({ key: 'bacterium', pad });
const audio = createAudio(['bacterium/amb-sediment', 'bacterium/run', 'bacterium/tumble', 'bacterium/sprint', 'bacterium/eat', 'bacterium/phage', 'bacterium/graze']);
audio.addToFeatures(features);
audio.loop('bacterium/amb-sediment', { volume: 0.6 });
const runLoop = audio.loop('bacterium/run', { volume: 0 });
const snd = { t: 0, lastEat: -9, feeding: false, lastPhage: -9 };
/** Gamepads fire no DOM events: unlock sound on any pad button. */
function unlockOnPad() {
  if (pad.kind !== 'controller') return;
  for (let b = 0; b < 16; b++) if (pad.value(b) > 0.5) { audio.unlock(); return; }
}
const SPECIES_NAMES = { mtb: SPECIES.mtb.name, bdello: SPECIES.bdello.name };
features.add({ id: 'species', group: 'Body', label: 'Protagonist', choices: [SPECIES_NAMES.mtb, SPECIES_NAMES.bdello], value: SPECIES_NAMES.mtb,
  about: 'Magnetospirillum: a 3 µm helical cell with a chain of magnetite magnetosomes and a flagellum at each pole; it seeks the microaerobic band. Bdellovibrio: a 1 µm curved rod with one sheathed polar flagellum that rams Gram-negative prey, bores into the periplasm and grows inside the rounded "bdelloplast".',
  onChange: (v) => setSpecies(v === SPECIES_NAMES.bdello ? 'bdello' : 'mtb') });
const LOOK_CYCLE = ['phase', 'fluorescence', 'darkfield', 'sem', 'dic'];
const LOOK_LABEL = { phase: 'Phase contrast', fluorescence: 'Fluorescence', darkfield: 'Darkfield' };
features.add({ id: 'look', group: 'Optics', label: 'Microscope look (D-pad ←→)', choices: Object.values(LOOK_LABEL), value: LOOK_LABEL.phase,
  about: 'Phase contrast (Ph3, 100× oil): cells dark with bright halos; flagella (20 nm) and phages (60 nm) are invisible, as they really are. Fluorescence: three stains shown in pseudo-colour on black (membranes FM 4-64 magenta, flagella Alexa 488 maleimide green, magnetosome chain MamC-GFP shown blue, phages SYBR green). Darkfield: high-intensity darkfield, which does show flagellar bundles (Macnab 1976).',
  onChange: (v) => { view.look = Object.keys(LOOK_LABEL).find((k) => LOOK_LABEL[k] === v) || 'phase'; } });
features.add({ id: 'psf', group: 'Optics', label: 'Diffraction limit (point spread)', on: true,
  about: `Every image is blurred by a Gaussian of σ = 0.21 λ/NA = ${(psfSigmaUm() * 1000).toFixed(0)} nm (FWHM ≈ 0.21 µm at NA 1.3). Zooming the camera past the eyepiece field is empty magnification: softer, never more detailed. Off: an impossible perfect lens.`,
  onChange: (on) => { optics.toggles.psf = on; } });
features.add({ id: 'halo', group: 'Optics', label: 'Phase halo', on: true, about: 'The phase ring leaks low spatial frequencies back: φ − 0.75·blur(φ), so cells get bright halos and big objects lighter centres. Off: an ideal phase plate.', onChange: (on) => { optics.toggles.halo = on; } });
features.add({ id: 'focus', group: 'Optics', label: 'Depth of field ≈ 0.4 µm, fine focus (LT/RT)', on: true,
  about: 'At NA 1.3 only a slice about 0.4 µm thick is sharp. Things above or below are drawn wider and fainter with their total kept. On: focus drifts back to your cell when the triggers are released. Off: focus stays where you leave it.',
  onChange: (on) => { view.focusFollows = on; } });
features.add({ id: 'plate', group: 'Optics', label: 'Out-of-focus background', on: true, about: 'Bacteria and silt far below the focal plane as a soft mottle (the MP-B01 plate when delivered, procedural until then).', onChange: (on) => { optics.toggles.plate = on; } });
features.add({ id: 'noise', group: 'Optics', label: 'Camera shot noise', on: true, about: 'Per-frame sensor noise; in fluorescence it grows with the square root of the signal.', onChange: (on) => { optics.toggles.noise = on; } });
features.add({ id: 'stop', group: 'Optics', label: 'Eyepiece field stop', on: true, about: 'At 180 µm (the whole field of a 100× objective with an FN 18 eyepiece) the round field stop shows. Smaller fields are camera crops.', onChange: (on) => { view.stop = on; } });
features.add({ id: 'chMemb', group: 'Optics', label: 'Stain: membranes (FM 4-64)', on: true, about: 'A lipophilic dye in the membranes of every cell, brighter at the rim. Fluorescence look only.', onChange: (on) => { drawer.chan.memb = on ? 1 : 0; } });
features.add({ id: 'chFlag', group: 'Optics', label: 'Stain: flagella (Alexa 488 maleimide)', on: true, about: 'Flagellin with a cysteine added, labelled with a maleimide dye: how Turner, Ryu and Berg filmed bundles forming and flying apart in tumbles.', onChange: (on) => { drawer.chan.flag = on ? 1 : 0; } });
features.add({ id: 'chMag', group: 'Optics', label: 'Stain: magnetosome chain (MamC-GFP)', on: true, about: 'A fluorescent protein fused to a magnetosome membrane protein: a line down the middle of the cell. Shown in blue so it reads apart from the flagella (pseudo-colour).', onChange: (on) => { drawer.chan.mag = on ? 1 : 0; } });
features.add({ id: 'chPhage', group: 'Optics', label: 'Stain: phages (SYBR Gold)', on: true, about: 'A nucleic-acid stain makes each 60 nm phage a diffraction-limited spot: the standard way to count viruses in pond water. Without it, no light microscope shows them.', onChange: (on) => { drawer.chan.phage = on ? 1 : 0; } });
features.add({ id: 'overlay', group: 'Optics', label: 'Data overlay (Y)', on: false,
  about: 'Oxygen (blue too little, green the band, red too much; isolines at 0.1, 1, 10 %), food contours, the field lines and the grazers\' currents, and the magnetosome chain picked out. Marked on screen as data, not optics.',
  onChange: (on) => { view.overlay = on; tag.classList.toggle('show', on); o2El.classList.toggle('show', on); } });
features.add({ id: 'mark', group: 'Optics', label: 'Mark your cell', on: true, about: 'Corner brackets round your cell (a game marker, not optics): at 1000× you are one small grey rod among many.', onChange: (on) => { view.mark = on; } });
features.add({ id: 'shapes', group: 'Rendering', label: 'Instanced 2D distance-field specimen', fixed: true,
  about: 'Every cell, filament, phage, grain and giant-cell edge is a quad whose fragment shader computes its true cross-section chord (2√(r²−d²)) and adds optical path, scatter, stain and absorbance into float buffers. Sub-pixel parts are widened with their total kept.' });
features.add({ id: 'field', group: 'Rendering', label: 'Shared optical field', fixed: true, about: 'The buffers are adapters.js\'s optical field plus a fluorescence attachment, so the borrowed looks read the same specimen.' });
// Motion
const STEER_MODES = ['Steer: the cell follows the stick', 'Tumble bias only: the stick leans each tumble', 'Honest: no steering'];
features.add({ id: 'bias', group: 'Motion', label: 'LS steering', choices: STEER_MODES, value: STEER_MODES[0],
  about: 'A real bacterium cannot steer: it runs, and chooses only WHEN to tumble. Steer (a labelled game assist, the default): while the stick is held the body turns toward it, fast but not instantly (up to ~5 rad/s), and swims at a speed set by the tilt; rotational and translational Brownian motion are cut to about a third and a half but still show, and the magnetic torque still pulls (gently) toward the field line. Let go and the cell keeps running at cruise speed wherever Brownian motion, the flow, the grazers\' currents and the field turn it. Tumble bias only: the stick does nothing but lean each tumble (B): eight angles from the real distribution, the nearest kept. Honest: no steering at all; the stick does nothing.',
  onChange: (v) => { swimmer.opts.steer = v === STEER_MODES[0]; swimmer.opts.bias = v !== STEER_MODES[2]; } });
features.add({ id: 'spont', group: 'Motion', label: 'Spontaneous tumbles', choices: ['Off: you are the chemotaxis network', 'Real motor clock'], value: 'Off: you are the chemotaxis network',
  about: 'Real motors switch on their own (E. coli about once a second). With the clock on, tumbles come by themselves and are suppressed while things are getting better, as the Che network does: chemotaxis without a pilot.',
  onChange: (v) => { swimmer.opts.spontaneous = v.startsWith('Real'); } });
features.add({ id: 'rotdiff', group: 'Motion', label: 'Rotational Brownian motion', on: true, about: 'Runs are not straight: D_r ≈ 0.15 rad²/s for the spirillum, 0.6 for tiny Bdellovibrio, so the small cell loses its heading within a second.', onChange: (on) => { swimmer.opts.rotDiff = on; } });
features.add({ id: 'brown', group: 'Motion', label: 'Translational Brownian motion', on: true, about: 'Everything jitters: D ≈ 0.25 µm²/s for you, ~4 µm²/s for a phage, 0.2/r µm²/s for clay specks. Visible at this magnification.', onChange: (on) => { swimmer.opts.brownian = on; world.opts.brownian = on; } });
features.add({ id: 'lowre', group: 'Motion', label: 'Low Reynolds number (no coasting)', on: true, about: 'At Re ≈ 10⁻⁵ a bacterium coasts about a tenth of a nanometre when its motor stops. Off: a one-second glide, physically wrong, for comparison.', onChange: (on) => { swimmer.opts.lowRe = on; } });
features.add({ id: 'beat', group: 'Motion', label: 'Flagellar rotation shown', choices: ['Slowed (readable)', 'Faster (aliases)'], value: 'Slowed (readable)',
  about: 'Real flagella turn at 100–300 Hz (the sheathed Bdellovibrio one perhaps faster): far beyond a 60 Hz display. Slowed so the helix can be followed.', onChange: (v) => { drawer.opts.slowBeat = v.startsWith('Slowed'); swimmer.opts.beat = v.startsWith('Slowed') ? 1 : 5; } });
features.add({ id: 'flagella', group: 'Body', label: 'Flagella', on: true, about: 'Spirillum: one flagellum at each pole. Bdellovibrio: one sheathed polar flagellum, shed when it enters prey. E. coli-like rods: a bundle behind in a run, splayed in a tumble.', onChange: (on) => { drawer.opts.flagella = on; } });
features.add({ id: 'pattern', group: 'Body', label: 'How each cell turns', fixed: true,
  about: 'E. coli-like rods tumble (mean 68°). Bdellovibrio, a polar flagellate, reverses and flicks (the Vibrio pattern). Magnetospirillum mostly reverses; its tumble (B) is a labelled stop-and-turn drawn from the E. coli angles.' });
// Simulation
features.add({ id: 'bfield', group: 'Simulation', label: 'Magnetic field at the slide', choices: ['Earth (20 µT horizontal)', 'Bar magnet (200 µT)', 'Cancelled (0 µT)'], value: 'Earth (20 µT horizontal)',
  about: 'The magnetosome chain\'s moment (~10⁻¹⁵ A·m²) feels a torque m×B: mB/kT ≈ 5 in the Earth\'s horizontal field, so the cell lines up within a second or two. North points into the sediment, as the field\'s downward dip does in the Northern Hemisphere. Cancel it and the magnetotactic cell is as lost as any other.',
  onChange: (v) => { world.opts.field = v.startsWith('Earth') ? 20 : v.startsWith('Bar') ? 200 : 0; } });
features.add({ id: 'oxygen', group: 'Simulation', label: 'Oxygen stress', on: true, about: 'Too much oxygen damages a microaerophile; too little leaves either cell without energy. Off: no penalty.', onChange: (on) => { game.opts.oxygen = on; } });
features.add({ id: 'grazers', group: 'World', label: 'Peritrich grazers', on: true, about: 'Two Vorticella-like bells on stalks, oral cilia beating a feeding current (a sink, ~60 µm/s at 16 µm, faster than you near the funnel). Touch the bell and it may contract on its stalk.', onChange: (on) => { world.opts.grazers = on; } });
features.add({ id: 'amoeba', group: 'World', label: 'Amoeba edge', on: true, about: 'The leading edge of a giant amoeba creeps toward you at ~1.4 µm/s: easy to outswim, deadly to anything parked while feeding.', onChange: (on) => { world.opts.amoeba = on; } });
features.add({ id: 'phages', group: 'World', label: 'Phages', on: true, about: 'Tail-first adsorption is reversible for a few seconds here (much longer in life), then irreversible; then the DNA goes in. Dashing shears loosely bound phages off (a labelled stretch).', onChange: (on) => { world.opts.phages = on; } });
features.add({ id: 'hunters', group: 'World', label: 'Bdellovibrio hunters', on: true, about: 'Three predators hunting Gram-negative prey, making bdelloplasts. One may hit you: dash or tumble at once to shake it off before it bores in.', onChange: (on) => { world.opts.hunters = on; } });
const GRACES = ['45 s', '20 s', '0 s (predators from the start)'];
features.add({ id: 'grace', group: 'World', label: 'Calm opening before the predators', choices: GRACES, value: GRACES[0],
  about: 'For the first 45 s of a run (and after every restart) the grazers\' feeding currents are off, no phage cloud drifts in, the Bdellovibrio leave you alone and the amoeba\'s edge does not creep toward you, so you can explore first. They wake one after another over the next 15 s. Shorter openings are for testing.',
  onChange: (v) => { pacing.grace = parseFloat(v); resetPressure(); } });
features.add({ id: 'hunger', group: 'World', label: 'Predators come and go', on: true,
  about: 'After the opening each predator is on for a while, then rests: a grazer beats its feeding current for 20–35 s, then folds its cilia; a phage cloud (a nearby cell bursting) lasts 20–30 s, then thins; Bdellovibrio hunt you for 18–32 s; the amoeba creeps toward you for 30–50 s. They rest 45–75 s after a catch, less after a miss. The stats corner shows each. Off: once the opening is over they are on all the time (the old pacing).',
  onChange: (on) => { pacing.cycles = on; } });
features.add({ id: 'npc', group: 'World', label: 'Other bacteria swim', on: true, about: 'E. coli-like rods run and tumble at 18–28 µm/s; other magnetotactic cells swim along the field and reverse by the oxygen sense. Off: everything sits still (Brownian only).', onChange: (on) => { world.opts.npcRun = on; } });
features.add({ id: 'scenery', group: 'World', label: 'Biofilm, EPS, clay, detritus', fixed: true, about: 'An EPS-rich biofilm of attached rods and cocci over clay and silt grains larger than you; matrix strands; decaying detritus flakes at the heart of each food patch.' });
features.add({ id: 'pad', group: 'Controls', label: 'Shared control scheme', fixed: true, about: 'LS steer (released: drift), RS stage, A sprint, X feed/attach, B tumble, Y data, LT/RT focus, LB/RB reverse, D-pad ←→ look, ↑↓ field, Menu features, View panel.' });
// Borrowed (default off), also reachable from the look cycle.
const borrow = borrowedSwitches(features);
const bmode = { dic: 0 };
borrow.add({ id: 'semMite', label: 'SEM (scanning electron microscope)', from: 'mite',
  about: 'The specimen\'s height buffer handed to the mite\'s secondary-electron composite. The SEM resolves nanometres, so here flagella would show in life only in fixed, dried, coated samples; nothing in an SEM swims.' });
features.add({ id: 'semMiteMode', group: 'Borrowed', label: 'SEM detector', from: 'mite', choices: SEM_LOOKS, value: SEM_LOOKS[0], about: 'SE, BSE or false colour.', onChange: (v) => looks.semMode(SEM_LOOKS.indexOf(v)) });
borrow.add({ id: 'dicTardigrade', label: 'Tardigrade DIC (Nomarski)', from: 'tardigrade',
  about: 'The optical path, after the diffraction blur, handed to the tardigrade\'s interference model. Path differences are scaled ×6 so 0.03 µm bacteria show (its constants are tuned for animals).' });
features.add({ id: 'dicMode', group: 'Borrowed', label: 'Tardigrade look', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0], about: 'DIC or its brightfield.', onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
features.add({ id: 'sdfNote', group: 'Borrowed', label: 'Bodies from distance fields', from: 'shared sdf.js', fixed: true, about: 'The same idea as shared/sdf.js (bodies from capsules and tubes), done per pixel in 2D: a 3 µm cell flat in a 0.4 µm focal slice needs no 3D mesh.' });

function currentLookKey() { return borrow.id === 'semMite' ? 'sem' : borrow.id === 'dicTardigrade' ? 'dic' : view.look; }
function cycleLook(dir) {
  const i = LOOK_CYCLE.indexOf(currentLookKey());
  const next = LOOK_CYCLE[(i + dir + LOOK_CYCLE.length) % LOOK_CYCLE.length];
  if (next === 'sem') features.set('semMite', true);
  else if (next === 'dic') features.set('dicTardigrade', true);
  else { if (borrow.id) features.set(borrow.id, false); features.set('look', LOOK_LABEL[next]); }
  const name = { phase: LOOK_NAMES.phase, fluorescence: LOOK_NAMES.fluorescence, darkfield: LOOK_NAMES.darkfield, sem: 'SEM (borrowed from the mite): an electron microscope, not a live view', dic: 'DIC (borrowed from the tardigrade)' }[next];
  hud.toast(name);
}

function setSpecies(sp) {
  for (const P of roster) {
    if (P.capture.active) P.capture.reset(false);
    P.swimmer.reset(sp);
    P.dash = dashFor(sp);
    P.cat.kind = null; P.eatenFor = 0;
    if (P !== P1) placeNear(P, P1);
  }
  resetPressure();
  view.zoom = ZOOMS.indexOf(SPECIES[sp].view);
  view.cx = S.x; view.cy = S.y;
  card.classList.remove('show');
  hud.toast(sp === 'mtb' ? `Magnetospirillum: find the 0.5–5 % oxygen band, feed (hold ${glyph('X')}) until you divide` : `Bdellovibrio: ram and bore into ${GOAL_PREY} Gram-negative prey (${glyph('X')} when touching)`, 3200);
}

// --- the landmarks: forward (the host with phages) and the backdoor (the Paramecium) ---
const LMK = world.landmarks;
const FWD = { x: LMK.forward.x, y: LMK.forward.y, z: 0 };
const BACK = { x: LMK.back.x, y: LMK.back.y, z: 0 };
const lm = { fired: false, near: false, log: [] };
function landmark(kind, P) {
  lm.log.push({ kind, slot: P ? P.slot : 0, t });
  embed.landmark(kind, { player: P ? P.slot : 0 });
}
function landmarkTick(dt) {
  const F = LMK.forward;
  let at = null, close = false;
  for (const P of roster) {
    if (!P.S.alive) { P.backT = 0; continue; }
    const [d] = segDist(P.S.x, P.S.y, F.x, F.y, F.a, F.L);
    if (d < F.r + P.S.sp.r + F.reach) at = at || P;
    if (d < 14) close = true;
    P.backT = Math.hypot(P.S.x - BACK.x, P.S.y - BACK.y) < LMK.back.r ? P.backT + dt : 0;
  }
  // reaching the host: any player touching it zooms everyone in (once, until all have left it)
  if (at && !lm.fired) { lm.fired = true; landmark('forward', at); }
  if (!close) lm.fired = false;
  const dweller = roster.find((P) => P.backT > 0.5) || null;
  if (!!dweller !== lm.near) { lm.near = !!dweller; embed.near('back', lm.near); }
  // standalone the page shows its own quiet prompt (the shell draws one in the game)
  promptEl.style.display = lm.near && !embed.active ? 'block' : 'none';
  if (lm.near) promptEl.textContent = `${glyph('Y')} · back to the Paramecium's pool`;
}

// --- loop ---
let t = 0, last = performance.now(), blocked = false, fps = 60, fpsT = 0, frames = 0, frameCount = 0;
const debug = {
  freeze: false,
  teleport(x, y, a, slot = 0) {
    const P = roster.find((Q) => Q.slot === slot) || P1;
    P.S.x = x; P.S.y = y; if (a !== undefined) P.S.a = a;
    if (P === P1 || !multi()) { view.cx = x; view.cy = y; }
  },
  look(k) { const want = LOOK_CYCLE.indexOf(k); for (let i = 0; i < 6 && currentLookKey() !== k; i++) cycleLook(1); return want >= 0; },
  zoom(i) { view.zoom = i; },
  tumble() { return swimmer.tumble(null); },
  dash() { if (P1.dash.trigger()) doDash(P1); },
  reverse() { return swimmer.reverse(); },
  overlay(on) { features.set('overlay', on); },
  species(s) { features.set('species', SPECIES_NAMES[s]); },
  phageOnMe(slot = 0) { const T = (roster.find((Q) => Q.slot === slot) || P1).S; const p = world.newPhage(T.x, T.y); p.z = 0; world.phages.push(p); const ph = { p, u: (Math.random() - 0.5) * T.sp.L * 0.6, side: 1, t: 0, irreversible: false, shed: false }; p.stuck = ph; T.phages.push(ph); },
  nearGrazer(i = 0, d = 14) { const Q = world.grazers[i].pose; debug.teleport(Q.mouth.x + Q.up.x * d, Q.mouth.y + Q.up.y * d, Math.atan2(-Q.up.y, -Q.up.x)); },
  /** Make every predator hungry now (tests of the fights). */
  hungry() { for (const p of predators()) p.h.reset(0.01); },
  /** A button for a player in tests: 'B' tumble (defend), 'A' sprint. */
  press(b, slot = 0) { const P = roster.find((Q) => Q.slot === slot) || P1; if (b === 'B') { P.blockT = 0.55; P.swimmer.tumble(null); } else if (b === 'A' && P.dash.trigger()) { doDash(P); P.sprintT = 0.55; } },
  step(n = 1, dt = 1 / 60, inp = {}) { for (let i = 0; i < n; i++) tick(dt, { 0: { attack: !!inp.attack, attackPressed: !!inp.attack && i === 0, steer: inp.steer || null } }); },
};

function doDash(P) {
  audio.play('bacterium/sprint', { volume: 0.9 });
  const res = P.swimmer.dash();
  P.S.dashOn = true;
  P.pad.rumble(160, 0.5, 0.7);
  const who = multi() ? `${P.name}: ` : '';
  if (res === 'shook') { bdelloH.missed(); hud.toast(`${who}Shook the Bdellovibrio off before it could bore in`); }
  else if (res === 'detached') hud.toast(`${who}Let go of the prey`);
}

const idle = () => ({ attack: false, attackPressed: false, focusing: false, steer: null });
function tick(dt, inputs) {
  t += dt;
  pacing.now = t;
  updatePressure(dt);
  for (const P of roster) if (P !== P1) { Object.assign(P.swimmer.opts, swimmer.opts); Object.assign(P.game.opts, game.opts); }
  const evs = new Map();
  for (const P of roster) {
    const inp = inputs[P.slot] || (inputs[P.slot] = idle());
    P.dash.update(dt);
    const ev = {};
    inp.dashActive = P.dash.active;
    P.swimmer.step(dt, t, inp, ev);
    evs.set(P, ev);
  }
  snd.t += dt;
  const fastest = Math.max(...roster.map((P) => (P.S.alive && P.S.mode !== 'tumble' ? Math.min(1, P.S.speed / 40) : 0)));
  runLoop.set({ volume: 0.7 * fastest, rate: 0.8 + 0.6 * fastest + (roster.some((P) => P.dash.active) ? 0.2 : 0) });
  // hunters pick a player: the amoeba's edge creeps toward the nearest living cell
  const A = world.amoeba;
  let target = P1.S, bd = Infinity;
  for (const P of alive()) { const d = Math.hypot(P.S.x - A.x, P.S.y - A.y); if (d < bd) { bd = d; target = P.S; } }
  world.update(dt, t, target);
  // the fights: predators wind up readably before they strike (shared/predation.js createFight)
  runFights(dt);
  for (const P of roster) {
    const ev = evs.get(P), inp = inputs[P.slot], S = P.S;
    // uptake: a soft eating sound every ~0.7 s while X feeds, and when a prey is finished
    if ((S.feeding && snd.t - snd.lastEat > 0.7) || (ev.emerged && snd.t - snd.lastEat > 0.2)) {
      snd.lastEat = snd.t;
      audio.play('bacterium/eat', { volume: 0.7, rate: 0.95 + Math.random() * 0.1 });
    }
    if (ev.phage && snd.t - snd.lastPhage > 0.2) { snd.lastPhage = snd.t; audio.play('bacterium/phage', { volume: 0.8 }); }
    if (ev.captured) audio.play('bacterium/graze', { volume: 0.9 });
    const wasAlive = S.alive;
    P.game.update(dt, t, inp, ev);
    if (ev.caught) startCatch(P, ev.caught);
    stepCatch(P, dt);
    if (wasAlive && !S.alive && !S.caught && S.over !== 'won') embed.died({ cause: S.cause || '', player: P.slot });
    events(P, ev);
  }
  if (pacing.firstThreat === null && S.alive && (S.flow > 15 || S.phages.length || S.attacker || world.insideAmoeba(S.x, S.y, t) > 0)) pacing.firstThreat = t - pacing.t0;
  // focus drifts back to the cell's plane
  if (view.focusFollows && !(inputs[0] && inputs[0].focusing)) view.focus *= Math.exp(-dt * 1.5);
  // camera: the stage follows the cell (the group's middle with friends; the split screen does the rest)
  const k = 1 - Math.exp(-dt * 5);
  let fx = S.x, fy = S.y;
  if (multi()) {
    const ps = roster.filter((P) => !P.waiting).map((P) => P.S.inside || P.S);
    fx = ps.reduce((a, p) => a + p.x, 0) / ps.length; fy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
  }
  // once eaten, the view slides down so your remains sit above the Eaten card
  const lift = 0;
  view.cx += (fx - view.cx) * k; view.cy += (fy - lift - view.cy) * k;
  landmarkTick(dt);
}

/** What happened to a player this frame, as toasts (named in multiplayer). */
function events(P, ev) {
  const who = multi() ? `${P.name}: ` : '';
  const S = P.S;
  if (ev.phage) { P.pad.rumble(60, 0.3, 0); if (!P.msg.phageHint) { P.msg.phageHint = true; hud.toast(`${who}A phage stuck to you! Dash (${glyph('A')}) or tumble (${glyph('B')}) within 3 s to shake it off`, 3200); } else hud.toast(`${who}Another phage stuck: shake it off (${glyph('A')} / ${glyph('B')})`); }
  if (ev.shed) hud.toast(`${who}Shook off ${ev.shed} phage${ev.shed > 1 ? 's' : ''} while the binding was still reversible`);
  if (ev.irreversible) { P.pad.rumble(200, 0.6, 0.4); hud.toast(`${who}Irreversible: the phage's tail is through the envelope`, 2600); }
  if (ev.captured) { P.pad.rumble(300, 0.6, 0.9); hud.toast(`${who}Caught in the feeding current at the oral funnel: DASH (${glyph('A')})!`, 2200); }
  if (ev.engulfing) { P.pad.rumble(250, 0.5, 0.5); hud.toast(`${who}The amoeba's edge is closing over you: swim out!`, 2200); }
  if (ev.attacked) { P.pad.rumble(300, 0.8, 0.8); hud.toast(`${who}Bdellovibrio has rammed you! Dash (${glyph('A')}) or tumble (${glyph('B')}) to shake it off`, 2600); }
  if (ev.attach) hud.toast(`${who}Attached: boring through the outer membrane (minutes in life, 2.5 s here)`, 2600);
  if (ev.entered) { P.pad.rumble(200, 0.4, 0.4); hud.toast(`${who}Inside the periplasm: the prey rounds into a bdelloplast. What happens inside is beyond the light microscope.`, 3600); }
  if (ev.emerged) hud.toast(`${who}Prey ${S.prey} of ${GOAL_PREY} eaten. (In life the predator divides inside and the progeny burst out hours later.)`, 3400);
  if (ev.gramPos) hud.toast('Gram-positive: no periplasm, so Bdellovibrio cannot get in');
  if (ev.divide) hud.toast(`${who}Growing to divide: each daughter will get half the magnetosome chain`, 2400);
  if (ev.divided) { P.pad.rumble(300, 0.5, 0.5); hud.toast(`${who}Divided! (${S.divisions}) Two cells now swim the band. Keep feeding.`, 3000); }
  if (ev.contracted) hud.toast('The peritrich jerked back on its coiling stalk: its current stops for a moment');
  if (ev.bump && Math.random() < 0.02) hud.toast('A clay grain, bigger than you');
}

function readInput(P, dt) {
  const inp = idle();
  const S = P.S, c = P.ctl, me = P === P1;
  const ls = c.move();
  // the stick in world axes (screen up = world +y, toward the air)
  if (ls.m > 0) inp.steer = { x: ls.x, y: -ls.y, m: Math.min(1, ls.m) };
  if (S.alive) {
    if (c.defend.pressed()) {
      P.blockT = 0.55; // a tumble at a strike evades it
      const bias = P.swimmer.opts.bias && ls.m > 0.3 ? { x: ls.x, y: -ls.y } : null;
      if (P.swimmer.tumble(bias)) {
        audio.play('bacterium/tumble', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
        P.pad.rumble(40, 0.2, 0);
        if (S.attacker) { S.attacker.cooldown = 4; S.attacker.prey = null; S.attacker = null; bdelloH.missed(); hud.toast(`${multi() ? P.name + ': ' : ''}Tumbled free of the Bdellovibrio`); }
      }
    }
    if (c.lb.pressed() || c.rb.pressed()) { if (P.swimmer.reverse() && me) hud.toast(S.species === 'mtb' ? (S.sense > 0 ? 'Reversed: swimming north, along the field (down)' : 'Reversed: swimming south, against the field (up)') : 'Reversed'); }
    if (c.dash.pressed() && P.dash.trigger()) { doDash(P); P.sprintT = 0.55; }
    inp.attack = c.attack.down();
    inp.attackPressed = c.attack.pressed();
  } else if (me && !multi() && !S.caught && S.overT > 1 && (c.dash.pressed() || c.attack.pressed())) setSpecies(S.species);
  // Y: at the Paramecium it takes everyone back up to the pool; elsewhere (player 1) the data overlay
  if (c.special.pressed()) {
    if (P.backT > 0.5) landmark('back', P);
    else if (me) features.set('overlay', !view.overlay);
  }
  if (!me) return inp;
  const ls2 = c.lookStep();
  if (ls2) cycleLook(ls2);
  const zs = c.zoomStep();
  if (zs) { view.zoom = Math.max(0, Math.min(ZOOMS.length - 1, view.zoom + zs)); hud.toast(view.zoom === 0 ? 'Field 180 µm: the whole eyepiece field at 1000×' : `Field ${ZOOMS[view.zoom]} µm: a camera crop (empty magnification, no new detail)`); }
  const an = c.analog();
  if (Math.abs(an) > 0.05) { view.focus = Math.max(-3, Math.min(3, view.focus + an * 1.5 * dt)); inp.focusing = true; }
  const rs = c.camera();
  const half = ZOOMS[view.zoom] / 2;
  view.stage.x = Math.max(-half, Math.min(half, view.stage.x + rs.x * half * dt));
  view.stage.y = Math.max(-half, Math.min(half, view.stage.y - rs.y * half * dt));
  if (rs.m === 0) view.stage.multiplyScalar(Math.exp(-dt * 0.8));
  return inp;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frameCount++;
  players.poll();
  syncRoster();
  unlockOnPad();
  blocked = features.update();
  if (!blocked) hud.update(pad);
  const inputs = {};
  if (!blocked) for (const P of roster) if (!P.waiting) inputs[P.slot] = readInput(P, dt);
  if (!debug.freeze) tick(dt, inputs);
  else for (const P of roster) P.S.dashOn = P.dash.active;
  for (const P of roster) {
    const S = P.S;
    if (S.alive || S.caught) continue;
    if (multi() && S.over !== 'won') { if (S.overT > 2.6) rejoin(P); continue; }
    // solo (or a win): oxygen and starvation: the cell is seen to stop and fade before the card (catches use shared/predation.js's card)
    if (S.overT > (S.over === 'won' ? 0 : 1.2)) showEnd(S);
    if (S.over !== 'won' && S.overT > 8) setSpecies(S.species);
  }
  if (S.alive && S.overT === 0 && !S.over && card.classList.contains('show') && !roster.some((P) => P.S.over === 'won')) card.classList.remove('show');
  if (roster.some((P) => P.S.over === 'won') && (pad.pressed(players.BTN.A))) setSpecies(S.species);
  warn();

  render(dt);
  frames++; fpsT += dt;
  if (fpsT > 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  stats();
}

/** The red line at the top: what is happening to whom, and what to do. */
function warn() {
  const lines = [];
  const bar = (k) => '▮'.repeat(Math.round(k * 5)) + '▯'.repeat(5 - Math.round(k * 5));
  for (const P of roster) {
    const S = P.S, who = multi() ? `${P.name}: ` : '';
    let text = '', sev = 0;
    if (P.capture.active && P.cat.phase !== 'eaten') { text = CATCH[P.cat.kind][P.cat.phase]; sev = 3; }
    else if (attackText(P)) { const a = attackText(P); text = a.text; sev = a.sev; }
    else if (!S.alive && S.over && S.over !== 'won' && !S.caught) { text = `Run over: ${(S.cause || 'the cell has stopped').toLowerCase()}`; sev = 2.5; }
    else if (S.alive && S.warning) {
      const w = S.warning;
      let hint = '';
      if (w.kind === 'o2high') hint = S.species === 'mtb' && S.sense < 0 ? ` (you are swimming up: ${glyph('LB/RB')} reverses)` : ' (down toward the sediment)';
      if (w.kind === 'o2low') hint = S.species === 'mtb' && S.sense > 0 ? ` (you are swimming down: ${glyph('LB/RB')} reverses)` : '';
      text = `${w.text}${hint} ${w.kind === 'heal' ? '' : w.kind === 'o2high' ? 'damage ' : 'energy '}${w.kind === 'o2low' || w.kind === 'starve' ? bar(1 - w.level) : bar(w.level)}`;
      sev = w.kind === 'heal' ? 0.5 : 1 + w.level;
    }
    if (text) lines.push({ text: who + text, sev, color: sev >= 2 || (S.warning && S.warning.level > 0.5) ? '#ff8a7a' : sev <= 0.5 ? '#bfe3c0' : '#ffc27a' });
  }
  lines.sort((a, b) => b.sev - a.sev);
  const top = lines.slice(0, multi() ? 2 : 1);
  warnEl.innerHTML = top.map((l) => `<div style="color:${l.color}">${l.text}</div>`).join('');
  warnEl.style.display = top.length ? 'block' : 'none';
}

/** What is attacking a player right now, for the warning line. */
function attackText(P) {
  if (!P.S.alive) return null;
  const g = world.grazers.find((q) => q.target === P && (q.fightState === 'windup' || q.fightState === 'strike'));
  if (g) return { text: `A grazer's current is ${g.fightState === 'strike' ? 'SURGING' : 'intensifying'}: tumble (${glyph('B')}) as it pulls, or sprint out (${glyph('A')})`, sev: 2.2 };
  if (P.bdello && /windup|strike/.test(P.bdello.fight.state)) return { text: `Bdellovibrio is lining up to ram you: tumble (${glyph('B')}) at the ram`, sev: 2.1 };
  if (P.phage && /windup|strike/.test(P.phage.fight.state)) return { text: `A phage's tail fibres have caught your wall: tumble (${glyph('B')}) now`, sev: 2.1 };
  if (P.bdello && P.bdello.fight.state === 'stalk') return { text: `A Bdellovibrio is stalking you: keep moving, tumble (${glyph('B')}) when it rams`, sev: 1.6 };
  if (P.phage && P.phage.fight.state === 'stalk') return { text: `A phage is homing in on you: tumble (${glyph('B')}) as it lands`, sev: 1.5 };
  return null;
}

function showEnd(S) {
  if (card.classList.contains('show')) return;
  if (S.over === 'won') card.innerHTML = `<h2>Three prey taken</h2><p>The last bdelloplast lyses: five new attack-phase cells swim out. In life this cycle takes three to four hours per prey.</p><p>Press ${glyph('A')} to hunt again.</p>`;
  else card.innerHTML = `<h2>Run over${S.cause ? `: ${S.cause.toLowerCase()}` : ''}</h2><p>${S.over}</p><p>Press ${glyph('A')} to try again (a new cell starts in a few seconds).</p>`;
  card.classList.add('show');
}

/** Draw the specimen around (cx, cy) to the screen: one view. */
function drawField(cx, cy, stopOk) {
  const [W, H] = optics.size;
  const fieldH = ZOOMS[zoomIdx()];
  const umPerPx = fieldH / H;
  const fieldW = W * umPerPx;
  shapes.setView(cx, cy, fieldW, fieldH, umPerPx, view.focus, t);
  renderer.setRenderTarget(optics.field);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(shapes.scene, shapes.camera);
  const look = currentLookKey();
  const stopR = stopOk && view.stop && zoomIdx() === 0 ? 90 / umPerPx : 0;
  if (look === 'sem') {
    const f = optics.field.textures;
    looks.fieldFromBuffers(W, H, { a: { opd: f[0], abs: f[2], opdW: [0, 0, 1, 0], scatW: [0, 1, 0, 0] }, opdK: 1, absK: 1, heightK: 1 });
    renderer.setRenderTarget(null);
    looks.semFromField({ umPerPx, dist: fieldH * 3, cls: CLS.CUTICLE, subCls: CLS.GRAIN, dt: 1 / 60 });
  } else if (look === 'dic') {
    optics.diffract(umPerPx);
    const f = optics.field.textures;
    looks.fieldFromBuffers(W, H, { a: { opd: f[0], abs: f[2], opdW: [1, 0, 0, 0], scatW: [0, 1, 0, 0] }, opdK: 6, absK: 1 });
    renderer.setRenderTarget(null);
    looks.dic({ mode: bmode.dic, pxPerUm: 1 / umPerPx, time: t, opdK: 1, absK: 1 });
  } else {
    optics.render({ look, umPerPx, center: [cx, cy], time: t, stopR, plate: look === 'phase' ? plates.phase : null });
  }
  if (view.overlay) overlay.render(renderer, { center: [cx, cy], size: [fieldW, fieldH], res: [W, H], time: t, band: S.sp.o2, world, flTex: optics.field.textures[1] });
}

const posOf = (P) => { const p = P.S.inside || P.S; return { x: p.x, y: p.y, z: 0 }; };
function render(dt) {
  const fieldH = ZOOMS[zoomIdx()];
  const cx = view.cx + view.stage.x, cy = view.cy + view.stage.y;
  shapes.begin();
  drawer.draw(shapes, t, roster.map((P) => P.S), view);
  shapes.end();
  const list = roster.filter((P) => !P.waiting).map((P) => ({ slot: P.slot, position: posOf(P) }));
  const L = split.update(list.length ? list : [{ slot: 0, position: posOf(P1) }], { center: { x: cx, y: cy }, pxPerUnit: innerHeight / fieldH, yUp: true }, dt);
  // split frames render every view: drop each one's resolution while split
  const want = L.views.length > 1 ? 0.7 : 1;
  if (want !== splitScale) { splitScale = want; resize(); }
  if (L.views.length <= 1) {
    const o = L.views[0] ? L.views[0].offset : { x: 0, y: 0 };
    drawField(cx + o.x, cy + o.y, true);
  } else {
    for (const v of L.views) { drawField(cx + v.offset.x, cy + v.offset.y, false); split.capture(v.index); }
    split.compose();
  }
  // the edge arrows: the brass chevron to the host cell, the ring to the Paramecium
  marks.begin();
  marks.drawSplit(arrowSplit(), FWD, { kind: 'forward', label: 'Host', range: 420, onScreen: 'none' });
  marks.drawSplit(arrowSplit(), BACK, { kind: 'backdoor', label: 'Pool', range: 420, onScreen: 'none' });
  drawMarks(L, fieldH);
  // scale bar and oxygen ticks
  const bar = fieldH >= 90 ? 20 : fieldH >= 40 ? 5 : 2;
  const cssPerUm = innerHeight / fieldH;
  scaleEl.innerHTML = `<i style="width:${Math.round(bar * cssPerUm)}px"></i>${bar} µm · field ${fieldH} µm${view.zoom ? ' (crop)' : ''}`;
  if (view.overlay) {
    const ticks = [0.1, 0.5, 1, 2, 5, 10, 20, 50];
    o2El.innerHTML = ticks.map((p) => {
      const y = oxygenY(p);
      const top = innerHeight / 2 - (y - cy) * cssPerUm;
      return top > 10 && top < innerHeight - 10 ? `<span style="top:${top}px">${p} % O₂</span>` : '';
    }).join('');
  }
}

/** Corner brackets round each player's cell (solo: the old gold marker; together: each in their colour). */
function drawMarks(L, fieldH) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  if (markCv.width !== w || markCv.height !== h) { markCv.width = w; markCv.height = h; }
  markG.setTransform(1, 0, 0, 1, 0, 0);
  markG.clearRect(0, 0, w, h);
  if (!view.mark) return;
  markG.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cssPerUm = innerHeight / fieldH;
  for (const v of L.views) {
    markG.save();
    if (L.views.length > 1) {
      markG.beginPath();
      for (const r of L.regions) if (r.view === v.index && r.polygon.length > 2) { markG.moveTo(r.polygon[0][0], r.polygon[0][1]); for (const q of r.polygon.slice(1)) markG.lineTo(q[0], q[1]); markG.closePath(); }
      markG.clip();
    }
    for (const P of roster) {
      const S = P.S;
      if (S.over && S.over !== 'won' && S.overT > 2.5) continue;
      if (P.capture.active && P.cat.phase === 'eaten' && multi()) continue;
      const q = split.project(v.index, posOf(P));
      const size = Math.max(26, S.sp.L * cssPerUm + 18), hs = size / 2, arm = 7;
      markG.globalAlpha = multi() ? 0.8 : 0.55;
      markG.strokeStyle = multi() ? P.color : '#ffd28a';
      markG.lineWidth = multi() ? 2 : 1.5;
      markG.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x = q.x + sx * hs, y = q.y + sy * hs;
        markG.moveTo(x - sx * arm, y); markG.lineTo(x, y); markG.lineTo(x, y - sy * arm);
      }
      markG.stroke();
      if (multi()) { markG.fillStyle = P.color; markG.font = '600 10px system-ui, sans-serif'; markG.textAlign = 'center'; markG.fillText(`P${P.slot + 1}`, q.x, q.y - hs - 4); }
    }
    // an attack under way: a pulsing red ring on the predator (a game marker, not optics)
    const ring = (x, y, r) => { const q = split.project(v.index, { x, y, z: 0 }); markG.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 18)); markG.strokeStyle = '#ff5a46'; markG.lineWidth = 2; markG.beginPath(); markG.arc(q.x, q.y, r, 0, Math.PI * 2); markG.stroke(); };
    for (const g of world.grazers) if (g.fightState === 'windup' || g.fightState === 'strike') ring(g.pose.mouth.x, g.pose.mouth.y, Math.max(16, 7 * cssPerUm));
    for (const P of roster) {
      if (P.bdello && /windup|strike/.test(P.bdello.fight.state)) ring(P.bdello.c.x, P.bdello.c.y, Math.max(12, 1.6 * cssPerUm));
      if (P.phage && /windup|strike/.test(P.phage.fight.state)) ring(P.phage.p.x, P.phage.p.y, Math.max(9, 0.9 * cssPerUm));
    }
    markG.globalAlpha = 1;
    markG.restore();
  }
}

function stats() {
  const sp = S.sp;
  const look = currentLookKey();
  const lookName = { phase: 'Phase contrast', fluorescence: 'Fluorescence (pseudo-colour)', darkfield: 'Darkfield', sem: 'SEM (borrowed)', dic: 'DIC (borrowed)' }[look];
  const feel = S.signal > 0.08 ? '↑ getting better: keep running' : S.signal < -0.08 ? '↓ getting worse: tumble?' : '· no change';
  const dash = P1.dash;
  const lines = [
    `${sp.short} · ${lookName} · focus ${view.focus >= 0 ? '+' : ''}${view.focus.toFixed(1)} µm`,
    `speed ${Math.round(S.speed).toString().padStart(3)} µm/s · ${(S.speed / sp.L).toFixed(0)} body lengths/s · ${S.mode === 'tumble' ? 'TUMBLE' : S.boring ? 'BORING IN' : S.inside ? 'INSIDE PREY' : dash.active ? 'SPRINT' : 'run'}${S.mode === 'run' && !S.boring && !S.inside ? (S.steering ? ' · steering (LS)' : swimmer.opts.steer ? ' · adrift: Brownian, flow, field' : '') : ''}`,
    `O₂ ${S.o2 < 1 ? S.o2.toFixed(2) : S.o2.toFixed(1)} % air sat. (wants ${sp.o2[0]}–${sp.o2[1] > 50 ? 'any higher' : sp.o2[1] + ' %'}) ${S.inBand ? '✓ in band' : ''}`,
    `senses: ${feel}`,
    S.species === 'mtb'
      ? `growth ${'█'.repeat(Math.round(S.growth * 10))}${'░'.repeat(10 - Math.round(S.growth * 10))} · food ${S.food.toFixed(2)}${S.feeding ? ' (uptake)' : ''} · O₂ damage ${Math.round(S.stress * 100)} % · energy ${Math.round(S.energy * 100)} %`
      : `prey ${S.prey}/${GOAL_PREY} · energy ${Math.round(S.energy * 100)} %${S.boring ? ` · boring ${Math.min(100, Math.round((S.boreT / 2.5) * 100))} %` : ''}`,
    `${dash.text()} · phages on you ${S.phages.length}${S.phages.some((p) => p.irreversible) ? ' (IRREVERSIBLE)' : ''}${S.attacker ? ' · BDELLOVIBRIO ATTACHED' : ''}`,
    S.species === 'mtb' ? `field ${world.opts.field} µT, mB/kT ≈ ${(S.mB || 0).toFixed(1)} (gentle pull: steer against it) · running ${S.sense > 0 ? 'north (down the field)' : 'south (up the field)'}` : `run ${sp.v} µm/s, sprint ${sp.dash} µm/s`,
    `predators: ${predators().map((p) => `${p.name} ${!p.on ? 'off' : roster.some((P) => P.capture.active && catcherHunger(P.cat) === p.h) ? 'EATING' : hungerText(p.h)}`).join(' · ')}`,
    capture.active ? `CAUGHT by ${CATCH[cat.kind].by.toLowerCase()}: ${cat.phase}` : '',
    `host cell ${Math.round(Math.hypot(S.x - FWD.x, S.y - FWD.y))} µm · Paramecium ${Math.round(Math.hypot(S.x - BACK.x, S.y - BACK.y))} µm`,
    multi() ? `players ${roster.length} · views ${split.views.length}${split.merged ? ' (together)' : ''}` : '',
    `${Math.round(fps)} fps · ${shapes.count} shapes`,
  ];
  hud.stats(lines.filter((l) => l !== '').join('\n'));
}

/** Test hook: start a catch ('grazer' | 'amoeba' | 'phage' | 'bdellovibrio') on a player (default player 1). */
function forceCapture(kind = 'grazer', slot = 0) {
  const P = roster.find((Q) => Q.slot === slot) || P1;
  const S = P.S, ev = {};
  if (!S.alive) { if (multi()) rejoin(P); else setSpecies(S.species); }
  if (kind === 'grazer') {
    const g = world.grazers[0], Q = g.pose;
    debug.teleport(Q.mouth.x + Q.up.x * 2.5, Q.mouth.y + Q.up.y * 2.5, Math.atan2(-Q.up.y, -Q.up.x), P.slot);
    if (!multi()) { view.cx = S.x; view.cy = S.y; }
    P.game.catchBy('grazer', g, ev);
  } else if (kind === 'amoeba') {
    const A = world.amoeba, c = Math.cos(A.ang), s = Math.sin(A.ang);
    debug.teleport(A.x + s * 2, A.y - c * 2, A.ang, P.slot);
    P.game.catchBy('amoeba', A, ev);
  } else if (kind === 'phage') {
    debug.phageOnMe(P.slot);
    const ph = S.phages[S.phages.length - 1];
    ph.irreversible = true;
    P.game.catchBy('phage', ph, ev);
  } else {
    if (S.species !== 'mtb') setSpecies('mtb');
    const b = world.cells.find((c) => c.kind === 'bdello');
    b.x = S.x + Math.cos(S.a) * 3; b.y = S.y + Math.sin(S.a) * 3;
    b.prey = { x: S.x, y: S.y, a: S.a, L: S.sp.L, isPlayer: true }; b.attachT = 0;
    S.attacker = b;
    P.game.catchBy('bdello', b, ev);
  }
  if (ev.caught) startCatch(P, ev.caught);
  return P.capture.phase;
}
window.__micro = { forceCapture, capture,
  pacing: () => ({ t: pacing.now - pacing.t0, firstHungry: pacing.firstHungry, firstThreat: pacing.firstThreat, firstCatch: pacing.firstCatch, grace: pacing.grace,
    hunters: predators().map((p) => ({ name: p.name, state: p.h.state, hungry: isHungry(p.h), left: +p.h.left.toFixed(1) })),
    capture: capture.active ? { phase: cat.phase, by: CATCH[cat.kind].by } : null, mode: S.mode, alive: S.alive }),
  world, swimmer, game, view, debug, features, optics, shapes, get t() { return t; }, get dash() { return P1.dash; },
  // Micro Zoom: players, split screen and landmarks
  players, split, landmarks: { forward: FWD, back: BACK, log: lm.log, get near() { return lm.near; } },
  get frames() { return frameCount; },
  /** The fights: each grazer's state, and each player's phage and Bdellovibrio stalker. */
  fights: () => ({ grazers: world.grazers.map((g) => ({ state: g.fightState, t: +(g.fightT || 0).toFixed(2), interest: +g.fight.interest.toFixed(2), pull: +(g.pull || 1).toFixed(2), target: g.target ? g.target.slot : null })),
    phage: roster.map((P) => (P.phage ? P.phage.fight.state : null)), bdello: roster.map((P) => (P.bdello ? P.bdello.fight.state : null)) }),
  roster: () => roster.map((P) => ({ slot: P.slot, x: P.S.x, y: P.S.y, alive: P.S.alive, mode: P.S.mode, over: P.S.over, cause: P.S.cause, warning: P.S.warning && P.S.warning.text, stress: P.S.stress, energy: P.S.energy, o2: P.S.o2, capture: P.capture.active ? P.cat.phase : null })),
  get warning() { return warnEl.textContent; },
};
requestAnimationFrame((n) => { last = n; frame(n); });

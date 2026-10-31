// Amoeba prototype: Amoeba proteus crawling on a wet-mount slide, hunting by
// forming a food cup around prey. See README.md for the biology, the
// simulation and the labelled departures.
import * as THREE from '../shared/vendor/three.module.min.js';
import { BTN } from '../shared/pad.js';
import { createControls, createDash, hudControls } from '../shared/controls.js';
import { mountHud } from '../shared/hud.js';
import { loadTexture } from '../shared/assets.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { Body, N } from '../shared/techniques/amoeba-softbody.js';
import { Cytoplasm } from './cytoplasm.js';
import { SPECIES, makePrey, PREY_OPTS } from './prey.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, DIC_MODES, PARAMECIUM_MODES } from '../shared/techniques/adapters.js';
import { squirmerFlow } from '../shared/techniques/paramecium-squirmer.js';
import { buildWorld, worldColliders, addResidue, wetMountCanvas, cytoplasmCanvas, meanColor, trapCapsules } from './world.js';
import { View } from './render.js';
import { rng, TAU, clamp } from './util.js';
import { createHunger, createCapture, createFight } from '../shared/predation.js';
import { createPlayers } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks } from '../shared/landmark.js';
import { embed } from '../shared/embed.js';

const MODES = ['Brightfield', 'Phase contrast', 'Darkfield', 'Immersive (hypothetical)'];
const OBJECTIVES = [{ name: '10×', field: 1800 }, { name: '20×', field: 900 }];
const AMOEBA_TIME = { 'Amoeba ×10': 1, 'Amoeba ×3': 0.3, 'Amoeba ×1 (real time)': 0.1 };
const SWIM_TIME = { 'Swimmers ×0.1': 1, 'Swimmers ×0.3': 3, 'Swimmers real speed': 10 };
const GRANULES = { '2600 granules': 2600, '1300 granules': 1300, '600 granules': 600 };
const CUP_WRAP = 3.3;
const PSEUDO_SPEED = { 'Quick (2×)': 2, 'Original': 1 };
const SURGE = 2.5; // pseudopod rate multiplier at the peak of a surge // radians (≈ 190°) of membrane around the prey before A can close

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.autoClear = false;

// Local multiplayer (shared/players.js): player 1 on the keyboard and the first
// controller, players 2-4 join with any button on another controller at any
// time. Each player is their own amoeba with the lead-and-follow sticks; the
// screen splits LEGO-style (shared/splitscreen.js) when they crawl apart.
// The per-player state below (body, cyto, surge, caught, FC, R, C, pad,
// ctl...) is switched to the cell being stepped by use(cell).
const cells = [];
const players = createPlayers({
  max: 4,
  onJoin: (p) => { embed.post('join', { index: p.slot, color: p.color, name: p.name, roster: players.toJSON() }); addCell(p); hud.toast(`Player ${p.slot + 1} joined`); },
  onLeave: (p) => { embed.post('leave', { index: p.slot, roster: players.toJSON() }); removeCell(p.slot); hud.toast(`Player ${p.slot + 1} left`); },
  onChange: (list) => hud && hud.players(list),
});
let pad = players.pad(0);
let ctl = players.controls(0);
let surge = createDash({ duration: 0.9, cooldown: 2.4 });
let cur = null; // the cell being stepped
const SCHEMES = ['Lead and follow (new)', 'Two pseudopods (classic)'];
const COMMON_CONTROLS = {
  dash: 'Surge: pseudopods shoot out 2.5× faster and the cell flows after them',
  attack: 'Close the food cup: cytoplasm fills in round the prey',
  defend: 'Let go / egest a food vacuole',
  special: 'Labels',
  look: 'Optics: brightfield, phase, darkfield, immersive',
  zoom: 'Objective 10× / 20×',
};
const CONTROLS = {
  lead: {
    rows: hudControls({
      ...COMMON_CONTROLS,
      move: 'First stick pushed grows the pseudopod and aims it; the other stick moves the body after it',
      camera: 'Either stick can lead (see the corner: LS / RS roles)',
      analog: 'Hold: the body stick grows a second pseudopod beside the first, to encircle',
      secondary: 'Spread out / push harder',
      extra: [['LS click', 'Fine focus down'], ['RS click', 'Fine focus up']],
    }),
    note: 'Pseudopod stick and body stick both held: the cell travels behind its pseudopod. Body stick alone towards it: the body flows in and takes it back. Release both and the roles reset once the pseudopod is gone (or after eating). Every arm takes body from somewhere else: the cell keeps its volume. Time is compressed; see the corner.',
  },
  classic: {
    rows: hudControls({
      ...COMMON_CONTROLS,
      move: 'Pseudopod 1: aim and extend',
      camera: 'Pseudopod 2: aim and extend',
      analog: 'Spread out / push harder',
      secondary: 'Fine focus down / up',
    }),
    note: 'Release a stick to let that pseudopod flow back. Every arm takes body from somewhere else: the cell keeps its volume. Time is compressed; see the corner.',
  },
};
const WAY_NOTE = ' Crawl right to the green Paramecium bursaria swimming low over the slide (the brass chevron) to zoom in to the pool; the Sphagnum leaf tip to the left (the ring) is the way back up: Y there. Other controllers join with any button.';
const hud = mountHud({
  title: 'Amoeba',
  sub: 'Amoeba proteus (~450 µm) on a wet-mount slide. Push out pseudopods, chase down ciliates, cup round them and fill in. Mind the fungal traps.',
  controls: CONTROLS.lead.rows,
  note: CONTROLS.lead.note + WAY_NOTE,
});
/** Swap the help panel's controls list when the scheme changes (same markup as mountHud). */
function showControls(which) {
  const el = document.querySelector('.hud');
  if (!el) return;
  const CHIP = { A: 'a', B: 'b', X: 'x', Y: 'y' };
  const KEYS = { 'LT/RT': 'Z / X', 'LB/RB': 'Q / F', A: 'Space', B: 'Shift', X: 'E', Y: 'R', LS: 'WASD', RS: 'Arrows', View: 'Tab', Menu: 'Esc', 'D-pad': '1–4', 'LS click': 'C', 'RS click': 'V' };
  const ul = el.querySelector('ul');
  if (ul) {
    ul.innerHTML = CONTROLS[which].rows.map(([b, what]) => {
      const kb = KEYS[b] || KEYS[b.split(' ')[0]] || '';
      return `<li><span class="k ${CHIP[b] || ''}" title="Keyboard: ${kb}">${b}</span><span>${what}</span></li>`;
    }).join('');
  }
  const note = el.querySelector('.note');
  if (note) note.textContent = CONTROLS[which].note + WAY_NOTE;
  // In the Micro Zoom shell its controls card follows the scheme too.
  if (embed.active) embed.post('hud', { title: 'Amoeba', sub: el.querySelector('.sub')?.textContent || '', controls: CONTROLS[which].rows, note: CONTROLS[which].note + WAY_NOTE });
}

const rand = rng(11);
const world = buildWorld(7);
let body = new Body(rand, 0, 0);
let cyto = new Cytoplasm(rand, body, 2600);
const prey = [];
let ambient = [];

const textures = {
  bg: new THREE.CanvasTexture(wetMountCanvas()),
  cyto: new THREE.CanvasTexture(cytoplasmCanvas()),
};
for (const t of [textures.bg, textures.cyto]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; }
textures.bgMean = meanColor(textures.bg.image);
textures.cytoMean = meanColor(textures.cyto.image);
const view = new View(renderer, { body, cyto, world, textures });

// Delivered art replaces the stand-ins when it arrives.
loadTexture('MP-A01', { srgb: false }).then((t) => { if (t) { textures.bg = t; textures.bgMean = meanColor(t.image); } });
loadTexture('MP-A02', { srgb: false }).then((t) => {
  if (t) { view.bodyMat.uniforms.uCyto.value = t; view.bodyMat.uniforms.uCytoMean.value.set(...meanColor(t.image)); }
});
loadTexture('MP-A03', { repeat: false, srgb: false }).then((t) => { if (t) view.setPhoto(t, meanColor(t.image)); });

// --- state ----------------------------------------------------------------
const S = {
  time: 0, mode: 0, focus: 0.6, objective: 1, labels: false,
  camX: 0, camY: 0,
  amoebaK: 1, swimK: 1, granules: 2600, rumble: true,
  flags: { tie: true, refraction: true, chroma: true, dof: true, bgRefraction: true, vignette: true, grain: true, obstacles: true, above: true },
  streaming: true, brownian: true, cv: true, respawn: true,
  fps: 60, statT: 0, pending: [],
  flee: true, traps: true,
  scheme: 'lead', pinches: 0, pinch: true,
};
// Lead and follow: which stick grows the pseudopod (body.pods[0]) and which
// moves the body; a stick in `latch` must be let go before it can lead again.
let R = { pod: null, body: null, latch: new Set(), branch: false, last: null };
// Per-player game state (was in S): food eaten, the cup candidate and the closing cup, trap contact, bites, surge, drain.
const newCellState = () => ({ eaten: 0, cand: null, closing: null, stuckT: 0, stuckN: 0, bitten: 0, surgeK: 1, drain: 0, A0init: 0 });
let C = newCellState();
const fragments = [];

// --- the fungal traps' pacing (shared/predation.js) ----------------------------
// A calm opening: the trap hyphae are absent at first. When the opening ends
// they grow in from one end over GROW_S seconds. After that the fungus's
// "hunger" comes and goes: while hungry the adhesive knobs are sticky, while
// resting they are dormant (small, pale, not sticky). A restart gives a fresh
// opening and the hyphae grow again.
const GROW_S = 25;
const pacing = { grace: 45, cycles: true, t0: 0, firstHungry: null, firstThreat: null, firstCatch: null };
const fungus = createHunger({ grace: pacing.grace, hungry: [30, 50], restFed: [50, 80], restMissed: [20, 35] });
const trapList = () => world.obstacles.filter((o) => o.type === 'trap' && !o.haustorium);
// Each trap hypha fights readably (shared/predation.js createFight): while the
// fungus is hungry and a membrane comes near, the hypha winds up (it curls and
// its adhesive knobs swell and shimmer: the tell), then snaps shut; only then
// is it sticky (o.grip). Stiffening (hold B) as it snaps makes it slide off
// (a block); a pseudopod jab (X) engulfs and cuts its tip (bite back). Enough
// and the hypha withdraws for a while (retreat).
for (const o of trapList()) {
  o.grow = 0; o.active = 0; o.grip = 0; o.wind = 0;
  o.fight = createFight({ windup: 1.1, strike: 0.3, recoverT: 2.4, repelT: 2.0, retreatT: 16, facingRate: 0, blockHit: 0.35, biteHit: 0.4 });
}
// Haustoria: the fungus's feeding hyphae, grown into the cell when it catches you.
const makeHaustoria = () => [0, 1, 2].map((k) => {
  const o = { type: 'trap', haustorium: true, x: 0, y: 0, ang: 0, L: 80, W: 5, layer: 'focus', seed: 0.3 + k * 0.2, grow: 0, active: 0, hidden: true, collide: { capsules: [], circles: [] } };
  world.obstacles.push(o);
  return o;
});
let haustoria = makeHaustoria();
const fungusOn = () => (pacing.cycles ? fungus.hungry : fungus.state !== 'grace');
function updateFungus(dt) {
  fungus.update(dt);
  const awake = fungus.state !== 'grace';
  const sticky = fungusOn() || cells.some((c) => c.caught.active);
  for (const o of trapList()) {
    const st = o.fight.state;
    if (st === 'retreat') o.grow = Math.max(0.3, o.grow - dt / 4); // withdrawn
    else if (awake) o.grow = Math.min(1, o.grow + dt / GROW_S);
    o.active = clamp(o.active + (sticky ? 1 : -1) * dt / 2, 0, 1);
    trapFight(o, dt, sticky && S.traps && !o.hidden && o.grow > 0.05);
  }
  const t = S.time - pacing.t0;
  if (pacing.firstHungry === null && S.traps && sticky && trapList().some((o) => o.grow > 0.02)) pacing.firstHungry = t;
  if (pacing.firstThreat === null && C.stuckN > 0) pacing.firstThreat = t;
}
/** The grown part of a hypha as a segment, and the nearest player membrane to it. */
function trapSeg(o) {
  const c = Math.cos(o.ang), s = Math.sin(o.ang), h = o.L / 2, g = o.grow ?? 1;
  const ax = o.x - c * h, ay = o.y - s * h;
  return [ax, ay, ax + c * o.L * g, ay + s * o.L * g];
}
function nearestToTrap(o) {
  const [ax, ay, bx, by] = trapSeg(o);
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1;
  let best = null;
  for (const c of cells) {
    const b = c.body;
    for (let i = 0; i < N; i += 2) {
      const t = clamp(((b.x[i] - ax) * ex + (b.y[i] - ay) * ey) / l2, 0, 1);
      const d = Math.hypot(b.x[i] - ax - ex * t, b.y[i] - ay - ey * t) - o.W / 2;
      if (!best || d < best.d) best = { d, cell: c, x: ax + ex * t, y: ay + ey * t };
    }
  }
  return best;
}
function trapFight(o, dt, armed) {
  o.grip = Math.max(0, o.grip - dt);
  if (!armed) { if (o.fight.state !== 'retreat') o.fight.reset(); o.grip = 0; o.wind = Math.max(0, o.wind - dt * 2); return; }
  const n = nearestToTrap(o);
  o.near = n;
  const blocking = !!n && n.cell.s.defend > 0.5;
  const f = o.fight.update(dt, { near: !!n && n.d < 220, inReach: !!n && n.d < 40, facing: true, blocking });
  o.wind = f.state === 'windup' ? f.t : f.state === 'strike' ? 1 : Math.max(0, o.wind - dt * 2);
  if (f.state === 'windup' && f.t < 0.05 && n) { const k = cur; use(n.cell); hud.toast(`${who()}A trap hypha curls, its knobs swelling: stiffen (hold B) or cut it (X)`, 2200); rumble(120, 0.25, 0); use(k); }
  if (f.hit && n) { o.grip = 7; const k = cur; use(n.cell); hud.toast(`${who()}The hypha snaps shut on the membrane`); rumble(250, 0.4, 0.6); use(k); }
  if (f.blocked && n) { o.grip = 0; const k = cur; use(n.cell); hud.toast(`${who()}Stiffened: the hypha slides off the membrane (trap resolve ${Math.round(o.fight.interest * 100)}%)`); rumble(200, 0.5, 0.3); use(k); }
  if (f.retreated) { o.grip = 0; hud.toast('The fungus gives up on you: the hypha withdraws', 2400); }
}
/** X at a trap hypha: a fast pseudopod jab engulfs its tip and cuts it (bite back). */
function cutHypha(o, n) {
  C.jab = { t: 0.45, x: n.x, y: n.y };
  o.grow = Math.max(0.2, o.grow - 0.28);
  o.grip = 0;
  C.stuckT = 0;
  const gone = o.fight.bitten();
  audio.play('amoeba/engulf', { volume: 0.8, rate: 1.3 });
  rumble(220, 0.4, 0.4);
  hud.toast(`${who()}Pseudopod jab: you engulf the hypha tip and cut it off${gone ? '. The fungus withdraws' : ` (trap resolve ${Math.round(o.fight.interest * 100)}%)`}`, 2400);
}
/** The trap threatening this cell most (winding up, striking or gripping), within reach of a jab. */
function threatTrap(c) {
  let best = null;
  for (const o of trapList()) {
    if (!o.near || o.near.cell !== c || o.grow < 0.05 || o.hidden) continue;
    if (o.near.d > 90) continue;
    if (!best || o.near.d < best.near.d) best = o;
  }
  return best;
}
function resetFungus() {
  fungus.reset(pacing.grace);
  for (const o of trapList()) { o.grow = 0; o.active = 0; o.grip = 0; o.wind = 0; o.fight.reset(); }
  for (const c of cells) for (const h of c.haustoria) { h.hidden = true; h.grow = 0; }
  pacing.t0 = S.time; pacing.firstHungry = null; pacing.firstThreat = null; pacing.firstCatch = null;
}

// --- caught by the fungus: strike → hold → eat → the Eaten card -------------------
// No card: the camera pulls back over the fungus as it drains you, holds there a
// couple of seconds, fades, and you come back (beside a teammate, or alone at
// a spot away from the traps).
let caught = createCapture({ onRespawn: () => captureRespawn(cells[0]) });
let FC = { pts: [], A0: 0, phase: null };
const CATCH_TEXT = {
  strike: 'Haustoria pierce the membrane! Surge (A) to tear free',
  hold: 'The fungus starts to drain you: surge (A) NOW',
  eat: 'Drained: the cytoplasm darkens and the cell shrivels',
};
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
function startCatch(pts) {
  if (caught.active) return;
  FC.pts = pts.slice(0, 3); FC.A0 = body.A0; FC.phase = 'strike';
  caught.start({ by: 'A zoopagalean fungus', how: 'grew haustoria into you and drained your cytoplasm' });
  embed.captured({ by: 'fungus', player: cur ? cur.slot : 0 });
  if (C.closing) cancelClose();
  haustoria.forEach((h, k) => { h.hidden = !FC.pts[k]; h.grow = 0; });
  audio.play('amoeba/engulf', { volume: 1, rate: 0.6 });
  rumble(500, 0.8, 0.9);
  if (pacing.firstCatch === null) pacing.firstCatch = S.time - pacing.t0;
}
function placeHaustoria(reach) {
  haustoria.forEach((h, k) => {
    const p = FC.pts[k];
    if (!p) return;
    const dx = body.cx - p.x, dy = body.cy - p.y, d = Math.hypot(dx, dy) || 1;
    h.L = Math.max(30, d * 0.75);
    h.ang = Math.atan2(dy, dx);
    // grown from the hypha (its -x end) toward the cell's centre
    h.x = p.x + (dx / d) * h.L * 0.5; h.y = p.y + (dy / d) * h.L * 0.5;
    h.grow = reach * (0.8 + 0.2 * Math.sin(k * 2.1 + 1));
  });
}
function stepCatch(dt) {
  if (!caught.active) return;
  if ((FC.phase === 'strike' || FC.phase === 'hold') && surge.active) {
    // torn free in time: the haustoria take a bite, and the fungus rests a while
    caught.reset(false); FC.phase = null;
    body.A0 = FC.A0 * 0.93; C.bitten++; C.stuckT = 0; C.drain = 0;
    for (const h of haustoria) { h.hidden = true; h.grow = 0; }
    fungus.missed();
    hud.toast(`${who()}Torn free! The haustoria took a bite of the cell (−7%)`, 2600);
    rumble(300, 0.6, 0.6);
    return;
  }
  const c = caught.update(dt, pad);
  if (!c.active) { FC.phase = null; return; }
  if (c.phase === 'fadeIn') { FC.phase = c.phase; C.drain = 0; return; }
  if (c.phase !== FC.phase) {
    FC.phase = c.phase;
    if (c.phase === 'eat') { fungus.fed(); audio.play('amoeba/digest', { volume: 1, rate: 0.7 }); rumble(700, 0.5, 0.8); }
  }
  const k = c.t;
  if (c.phase === 'strike') { placeHaustoria(0.55 * ease(k)); C.drain = 0; }
  else if (c.phase === 'hold') { placeHaustoria(0.55 + 0.45 * ease(k)); C.drain = 0.15 * k; }
  else {
    const e = c.phase === 'eat' ? ease(k) : 1;
    placeHaustoria(1);
    C.drain = 0.15 + 0.85 * e;
    body.A0 = FC.A0 * (1 - 0.45 * e); // the cell shrivels as it is sucked dry
  }
}
/** The end of a catch (the screen is black): a fresh amoeba, beside a teammate or alone at a safe spot. */
function captureRespawn(c) {
  const k = cur;
  use(c);
  FC.phase = null; C.drain = 0;
  for (const h of haustoria) { h.hidden = true; h.grow = 0; }
  for (const o of trapList()) { o.grip = 0; o.fight.reset(); }
  if (cells.length > 1) respawnCell(c);
  else {
    // the start spot furthest from every trap hypha
    const spots = [[0, 0], [900, -520], [-760, 640], [320, 980], [-300, -900]];
    let best = spots[0], bd = -1;
    for (const [x, y] of spots) {
      const d = Math.min(...trapList().map((o) => Math.hypot(o.x - x, o.y - y)));
      if (d > bd) { bd = d; best = [x, y]; }
    }
    c.s = Object.assign(newCellState(), { eaten: c.s.eaten });
    c.R.pod = c.R.body = null; c.R.latch.clear();
    makeBody(c, best[0], best[1]);
    S.camX = best[0]; S.camY = best[1];
    resetFungus();
    hud.toast('A fresh amoeba, away from the traps. The fungus will grow back', 3000);
  }
  use(k === c ? c : k || cells[0]);
}
/** After the Eaten card (card mode only): a fresh cell where the old one was; the fungus starts over. */
function restartCell() {
  FC.phase = null;
  body.A0 = C.A0init; C.drain = 0; C.bitten = 0; C.stuckT = 0; C.stuckN = 0; C.eaten = 0;
  if (C.closing) cancelClose();
  const Rr = Math.sqrt(body.A0 / Math.PI);
  for (let i = 0; i < N; i++) { const a = (i / N) * TAU; body.x[i] = body.cx + Rr * Math.cos(a); body.y[i] = body.cy + Rr * Math.sin(a); }
  for (const p of body.pods) { p.s = 0; p.target = 0; p.active = false; p.ret = 0; }
  body.grid.build(body.x, body.y, N);
  resetFungus();
  hud.toast('A fresh amoeba. The fungus is gone for now, but its hyphae will grow back', 3000);
}

// --- features panel ----------------------------------------------------------
const features = createFeatures({ key: 'amoeba', pad });
const F = (o) => features.add(o);
const audio = createAudio(['amoeba/amb-pool', 'amoeba/stretch', 'amoeba/boost', 'amoeba/engulf', 'amoeba/vacuole', 'amoeba/digest']);
audio.addToFeatures(features);
audio.loop('amoeba/amb-pool', { volume: 0.6 });
const snd = { t: 0, lastStretch: -9, pods: [], systole: 0 };
/** Gamepads fire no DOM events: unlock sound on any pad button. */
function unlockOnPad() {
  if (pad.kind !== 'controller') return;
  for (let b = 0; b < 16; b++) if (pad.value(b) > 0.5) { audio.unlock(); return; }
}
/** A pseudopod starting to flow out (rate-limited), a vacuole emptying. */
function soundTick(dt) {
  snd.t += dt;
  body.pods.forEach((p, k) => {
    const on = p.s > 0.15;
    if (on && !snd.pods[k] && snd.t - snd.lastStretch > 0.9) {
      snd.lastStretch = snd.t;
      audio.play('amoeba/stretch', { volume: p.idle ? 0.3 : 0.7, rate: 0.9 + Math.random() * 0.2, pan: k ? 0.3 : -0.3 });
    }
    snd.pods[k] = on;
  });
  const sy = cyto.cv.systole > 0;
  if (sy && !snd.systole) audio.play('amoeba/vacuole', { volume: 0.6, rate: 0.95 + Math.random() * 0.1 });
  snd.systole = sy;
}
F({ id: 'look', group: 'Optics', label: 'Optical method', choices: MODES, value: MODES[0],
  about: 'D-pad left/right cycles. Brightfield is the reference look; phase contrast (dark phase with bright halos), darkfield (scattered light on black) and a hypothetical immersive lit view are for comparison. All four read the same property buffer.',
  onChange: (v) => { S.mode = Math.max(0, MODES.indexOf(v)); } });
F({ id: 'propbuf', group: 'Rendering', label: 'Optical property buffer', fixed: true,
  about: 'Objects draw phase (thickness × refractive step) and red/green/blue optical density additively into a float target, not colour; one composite pass applies the optics. Module: shared/techniques/amoeba-optics.js.' });
F({ id: 'tie', group: 'Optics', label: 'Defocus contrast (transport of intensity)', on: true,
  about: 'A transparent cell is nearly invisible in focus; slight defocus gives I ≈ I0(1 − Δz∇²φ): bright and dark lines at edges and granules. Fine focus (LB/RB) sets Δz and its sign.',
  onChange: (v) => { S.flags.tie = v; } });
F({ id: 'refraction', group: 'Optics', label: 'Edge refraction loss', on: true,
  about: 'Steep slopes at the membrane bend light out of the objective aperture, darkening the edge in proportion to |∇φ|².', onChange: (v) => { S.flags.refraction = v; } });
F({ id: 'chroma', group: 'Optics', label: 'Chromatic fringes', on: true,
  about: 'Red, green and blue focus at slightly different depths, so the defocus term uses a different spacing per channel: faint coloured fringes like the reference photo.', onChange: (v) => { S.flags.chroma = v; } });
F({ id: 'dof', group: 'Optics', label: 'Depth of field', on: true,
  about: 'Things floating above the focal plane are drawn to a separate half-resolution buffer and Gaussian-blurred (≈ 6 µm depth of field at 20×). Focusing up makes them sharper.', onChange: (v) => { S.flags.dof = v; } });
F({ id: 'bgrefr', group: 'Optics', label: 'Background refraction', on: true,
  about: 'The slide texture is sampled through the phase gradient, so the field wobbles slightly behind the cell like a lens.', onChange: (v) => { S.flags.bgRefraction = v; } });
F({ id: 'vignette', group: 'Rendering', label: 'Vignette', on: true, about: 'Illumination falls off towards the edge of the field.', onChange: (v) => { S.flags.vignette = v; } });
F({ id: 'grain', group: 'Rendering', label: 'Sensor grain', on: true, about: 'A little per-pixel noise, like a camera on a microscope.', onChange: (v) => { S.flags.grain = v; } });
F({ id: 'dome', group: 'Rendering', label: 'Thickness dome from a distance grid', fixed: true,
  about: 'Each frame the membrane polygon is rasterised on the CPU and an exact distance transform gives distance-from-edge; thickness rises as its square root. It drives phase, absorption and the ectoplasm rim. Module: shared/techniques/amoeba-sdfgrid.js.' });
F({ id: 'mask', group: 'Rendering', label: 'MSAA membrane mask', fixed: true,
  about: 'The membrane ring, Catmull-Rom subdivided and triangulated (earcut), is drawn into a 4× multisampled mask for a clean edge.' });
F({ id: 'wrinkle', group: 'Body', label: 'Crumpled uroid', on: true,
  about: 'Small folds at the rear (the uroid) where the membrane is being taken back in.', onChange: (v) => { view.flags.wrinkle = v; } });
F({ id: 'caps', group: 'Body', label: 'Hyaline caps', on: true,
  about: 'A clear cap of cytoplasm at each advancing tip, free of granules.', onChange: (v) => { view.flags.caps = v; cyto.caps = v; } });
F({ id: 'area', group: 'Body', label: 'Volume conservation (area pressure)', on: true,
  about: 'An exact area projection after each step: any arm pushed out is paid for elsewhere. Off, the cell shrinks under tension and arms are free. Module: shared/techniques/amoeba-softbody.js.',
  onChange: (v) => { body.opts.area = v; } });
F({ id: 'rear', group: 'Body', label: 'Rear retraction (uroid)', on: true,
  about: 'The area correction is weighted to the membrane facing away from the active pseudopods, so the rear retracts and the cell crawls. Off, it shrinks evenly.', onChange: (v) => { body.opts.rearWeight = v; } });
F({ id: 'self', group: 'Body', label: 'Self-contact', on: true,
  about: 'Membrane nodes that are far apart along the ring repel when they meet, so two pseudopods can press together round prey without crossing.', onChange: (v) => { body.opts.selfContact = v; } });
F({ id: 'idle', group: 'Body', label: 'Idle pseudopods (polypodial)', on: true,
  about: 'A resting A. proteus probes with several pseudopods at once; up to three weak ones come and go when you are not steering.', onChange: (v) => { body.opts.idlePods = v; } });
F({ id: 'overdamped', group: 'Motion', label: 'Overdamped (low Reynolds number)', fixed: true,
  about: 'Displacement is proportional to force each step; nothing coasts. Stop protruding and the cell stops.' });
F({ id: 'atime', group: 'Motion', label: 'Amoeba time compression', choices: Object.keys(AMOEBA_TIME), value: 'Amoeba ×10',
  about: 'A. proteus advances about 1–4 µm/s. ×10 is the clock; with quick pseudopods (below) they grow ×20 their real rate, so a pseudopod reaches out in about a second. ×1 is real time (very slow).', onChange: (v) => { S.amoebaK = AMOEBA_TIME[v] ?? 1; } });
F({ id: 'pspeed', group: 'Motion', label: 'Pseudopod speed', choices: Object.keys(PSEUDO_SPEED), value: 'Quick (2×)',
  about: 'Quick: pseudopods ramp up and advance 2× faster than the original tuning (the cell still keeps its area, and the rear still retracts to pay for each arm). The time readout includes it.',
  onChange: (v) => { body.opts.speed = PSEUDO_SPEED[v] ?? 2; } });
F({ id: 'surge', group: 'Motion', label: 'Surge (A)', fixed: true,
  about: 'For 0.9 s every active pseudopod extends up to 2.5× faster (eased in and out), may run a little further ahead, the rear contracts harder and streaming surges toward the tips, so the whole cell lunges; recharges over 2.4 s. With no stick held it surges along the cell\'s current heading. It also tears the membrane free of a fungal trap. Inspired by blebbing, A. proteus\'s fastest protrusion; the strength is a game value.' });
F({ id: 'stime', group: 'Motion', label: 'Swimmer speed', choices: Object.keys(SWIM_TIME), value: 'Swimmers ×0.1',
  about: 'Ciliates swim at 0.3–1 mm/s: far too fast to catch on a ×10 amoeba clock, so swimmers are slowed. Real speed shows why amoebae ambush.', onChange: (v) => { S.swimK = SWIM_TIME[v] ?? 1; } });
F({ id: 'stream', group: 'Simulation', label: 'Fountain streaming', on: true,
  about: 'Endoplasm granules flow towards each advancing tip, about twice as fast as the tip, along the cell axis; the gel rim stays put.', onChange: (v) => { S.streaming = v; } });
F({ id: 'brown', group: 'Simulation', label: 'Brownian / saltatory jitter', on: true, about: 'Random jiggling of granules.', onChange: (v) => { S.brownian = v; } });
F({ id: 'gran', group: 'Simulation', label: 'Granules', choices: Object.keys(GRANULES), value: '2600 granules',
  about: 'Particles carried by the endoplasm: fine granules, bipyramidal crystals, lipid droplets, algal remnants. Fewer for slow GPUs.', onChange: (v) => { S.granules = GRANULES[v] ?? 2600; } });
F({ id: 'cv', group: 'Simulation', label: 'Contractile vacuole cycle', on: true,
  about: 'Fills slowly (≈ 40 s here, minutes in life), then empties in about a second; faster while food vacuoles shed water.', onChange: (v) => { S.cv = v; } });
F({ id: 'cup', group: 'Simulation', label: 'Food cup and food vacuoles', fixed: true,
  about: 'The membrane run near a prey cell is measured by how far it winds round it; when the rims meet, the lining zips shut and the cup becomes a food vacuole that sheds water, then digests.' });
F({ id: 'flee', group: 'Simulation', label: 'Ciliates flee the membrane', on: true,
  about: 'Tetrahymena, Colpidium and Paramecium sense the approaching membrane (a mechanical and chemical cue) and swim away at about 2.2× their speed for a couple of seconds, so a plain pseudopod rarely catches them: surge (A) to close the gap. Escape swimming is real; the range and speed are game values.',
  onChange: (v) => { S.flee = v; } });
F({ id: 'traps', group: 'World', label: 'Fungal trap hyphae (hazard)', on: true,
  about: 'Zoopagalean fungi (Stylopage, Zoopage) catch amoebae on adhesive hyphae, then grow haustoria into them. Membrane touching a sticky trap hypha sticks (it moves at 8% of its pace); a surge (A) tears it free. Stuck for 8 s, haustoria pierce the cell: surge in the next 1.5 s to tear free with a bite (−7% of the cell), or it is drained, darkening and shrivelling, and eaten. Real predators of amoebae; the timing, the bite and the drain are game rules.',
  onChange: (v) => { S.traps = v; for (const o of world.obstacles) if (o.type === 'trap' && !o.haustorium) o.hidden = !v; } });
const GRACES = ['45 s', '20 s', '0 s (traps from the start)'];
F({ id: 'grace', group: 'World', label: 'Calm opening before the traps', choices: GRACES, value: GRACES[0],
  about: 'The trap hyphae are absent for the first 45 s (and after every restart), so you can explore first. Then they grow in from one end over 25 s, and the HUD says so. Shorter openings are for testing.',
  onChange: (v) => { pacing.grace = parseFloat(v); resetFungus(); } });
F({ id: 'hunger', group: 'World', label: 'Traps come and go (fungal hunger)', on: true,
  about: 'Once grown, the fungus is "hungry" for 30–50 s: its adhesive knobs are sticky (large and dark). Then it rests, 50–80 s after a catch and 20–35 s after you tear free: the knobs are dormant (small and pale) and do not stick. Off: once grown they stay sticky (the old pacing).',
  onChange: (on) => { pacing.cycles = on; } });
F({ id: 'infill', group: 'Simulation', label: 'Filling in (X)', on: true,
  about: 'While the cup closes, endoplasm floods toward the cup mouth so the rims visibly fill and thicken as they meet over the prey.',
  onChange: (v) => { cyto.infill = v; } });
F({ id: 'avoid', group: 'Simulation', label: 'Avoidance reaction, trichocysts', fixed: true,
  about: 'Ciliates that touch the membrane back up, pivot and swim off. A Paramecium in a closing cup fires a local burst of trichocysts that shoves it clear (three bursts).' });
F({ id: 'obstacles', group: 'World', label: 'Obstacles on the slide', on: true,
  about: 'Spirogyra filaments, gliding diatoms and detritus flakes the cell must flow round.', onChange: (v) => { S.flags.obstacles = v; } });
F({ id: 'above', group: 'World', label: 'Out-of-focus layer', on: true,
  about: 'Filaments and flakes floating above the focal plane (MP-A03 when delivered).', onChange: (v) => { S.flags.above = v; } });
F({ id: 'rumble', group: 'Controls', label: 'Rumble', on: true, about: 'Controller rumble on contact, surges, trichocyst bursts, captures and when a trap hypha grabs the membrane.', onChange: (v) => { S.rumble = v; } });
F({ id: 'scheme', group: 'Controls', label: 'Controls', choices: SCHEMES, value: SCHEMES[0],
  about: 'Lead and follow: the first stick pushed grows a pseudopod (the pseudopod stick); the other stick moves the bulk of the cell (the body stick): the rear contracts and the cytoplasm streams after it. Both held: the cell travels behind its pseudopod, which holds its length. Body stick alone towards the pseudopod: the body flows into it and takes it back. Hold LT or RT and the body stick grows a second pseudopod 30–70° beside the first instead, to encircle prey. LB spreads out, RB pushes harder. Roles reset once the pseudopod is gone or after eating. Two pseudopods (classic): each stick grows its own pseudopod, LT/RT spread out and push harder, LB/RB focus.',
  onChange: (v) => {
    S.scheme = v === SCHEMES[1] ? 'classic' : 'lead';
    R.pod = R.body = null; R.latch.clear(); R.branch = false;
    showControls(S.scheme);
  } });
F({ id: 'sticks', group: 'Controls', label: 'Stick-driven pseudopods', fixed: true,
  about: 'Each pseudopod grows from the part of the membrane facing its stick; turning the stick bends it; centring the stick lets it flow back. A game interpretation of chemotactic protrusion.' });
F({ id: 'simple', group: 'Body', label: 'Membrane never crosses itself', fixed: true,
  about: 'Self-contact keeps every membrane node a few µm off every other stretch of membrane (a spatial hash of segments, so a segment cannot slip between two nodes); necks thinner than ≈ 26 µm push back; and any step that would still make two stretches cross is undone for those nodes. The mask outline is checked too: where the smooth, wrinkled outline would fold over itself it is drawn straight, so the triangulation never leaves stray triangles. Module: shared/techniques/amoeba-softbody.js.' });
F({ id: 'pinch', group: 'Body', label: 'Pinch-off (rare)', on: true,
  about: 'If a neck of the cell is squeezed thinner than 12 µm and a fungal trap hypha lies across it, the hypha cuts it: the piece with the nucleus stays the amoeba, the other piece rounds up, darkens and breaks up over a few seconds, and the cut pseudopod is left a stump. Necks resist thinning, so this almost never happens in play.',
  onChange: (v) => { S.pinch = v; } });

// --- borrowed (default off) ----------------------------------------------------
// The property buffers (phase, optical density; the out-of-focus layer blurred)
// become the shared optical field (shared/techniques/adapters.js), which other
// prototypes' image formation reads instead of this one's composite.
const looks = createBorrowedLooks(renderer);
const borrow = borrowedSwitches(features);
const bmode = { dic: 0, par: 0 };
borrow.add({ id: 'semMite', label: 'SEM (scanning electron microscope)', from: 'mite',
  about: 'The phase buffer read as a height map (phase × 40 µm, roughly the dome of a crawling cell), turned into the mite\'s G-buffer as seen from a virtual beam 4 mm above the slide, then shaded by its secondary-electron composite: tilt contrast, detector shadows on the glass, crevice darkening, noise. Physically odd: a live amoeba cannot be imaged in a vacuum; real SEMs of A. proteus are fixed and dried (S05).' });
F({ id: 'semMiteMode', group: 'Borrowed', label: 'SEM detector', from: 'mite', choices: SEM_LOOKS, value: SEM_LOOKS[0],
  about: 'SE (topography), BSE (the glass slide outshines the organic cell) or false colour.', onChange: (v) => looks.semMode(SEM_LOOKS.indexOf(v)) });
borrow.add({ id: 'dicTardigrade', label: 'DIC (Nomarski) relief', from: 'tardigrade',
  about: 'The tardigrade\'s interference image from the same phase and absorbance: relief from the gradient of optical path along one shear direction, warm and cool fringes. Real Nomarski images of amoebae look much like this.' });
F({ id: 'dicTardigradeMode', group: 'Borrowed', label: 'Tardigrade look', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0],
  about: 'Which of the tardigrade images the switch above uses: DIC or its brightfield.', onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
borrow.add({ id: 'microscopeParamecium', label: 'Paramecium microscope', from: 'paramecium',
  about: 'Darkfield, phase contrast with the phase-ring halo, brightfield, a simpler DIC or the lit view, formed the paramecium way (high-pass of the path, post pass with chromatic softness and grain), from the same buffers.' });
F({ id: 'microscopeParameciumMode', group: 'Borrowed', label: 'Paramecium technique', from: 'paramecium', choices: PARAMECIUM_MODES, value: PARAMECIUM_MODES[0],
  about: 'Which technique the paramecium switch above uses.', onChange: (v) => (bmode.par = PARAMECIUM_MODES.indexOf(v)) });
F({ id: 'preyLowRe', group: 'Borrowed', label: 'Prey: no-coasting recoil (low Re)', from: 'paramecium', on: false,
  about: 'The paramecium\'s lowRe(): prey speed follows the beat with a 35 ms lag, and a trichocyst burst stops within milliseconds (≈7 µm) instead of gliding for ≈0.2 s (≈38 µm). Truer to low Reynolds number; a grabbed Paramecium escapes the cup less easily.',
  onChange: (v) => (PREY_OPTS.lowRe = v) });
let preyFlowOn = false;
F({ id: 'preyFlow', group: 'Borrowed', label: 'Prey: squirmer flow round swimmers', from: 'paramecium', on: false,
  about: 'Each swimming prey stirs the water as a neutral squirmer (source dipole, decaying as 1/r³), and other prey nearby drift in it: pushed ahead at its poles, swept back along its sides. Weak unless they pass close.',
  onChange: (v) => (preyFlowOn = v) });

// --- prey ------------------------------------------------------------------
const MIX = ['chilomonas', 'chilomonas', 'chilomonas', 'chilomonas', 'chilomonas', 'chlamydomonas', 'chlamydomonas', 'chlamydomonas',
  'tetrahymena', 'tetrahymena', 'tetrahymena', 'colpidium', 'colpidium', 'paramecium'];

function freeSpot(rMin, rMax) {
  for (let k = 0; k < 40; k++) {
    const a = rand() * TAU, d = rand.range(rMin, rMax);
    const x = body.cx + Math.cos(a) * d, y = body.cy + Math.sin(a) * d;
    const col = worldColliders(world, 0);
    let ok = body.grid.sample(x, y) < -40;
    for (const c of col.capsules) {
      const ex = c.bx - c.ax, ey = c.by - c.ay, l2 = ex * ex + ey * ey;
      const t = clamp(((x - c.ax) * ex + (y - c.ay) * ey) / l2, 0, 1);
      if (Math.hypot(x - c.ax - ex * t, y - c.ay - ey * t) < c.r + 60) ok = false;
    }
    if (ok) return [x, y];
  }
  return [body.cx + rMax, body.cy];
}

function spawn(key, rMin = 260, rMax = 850) {
  const [x, y] = freeSpot(rMin, rMax);
  const p = makePrey(key, x, y, rand() * TAU, rand);
  prey.push(p);
  return p;
}

function despawn(p) {
  const i = prey.indexOf(p);
  if (i >= 0) prey.splice(i, 1);
  view.removePrey(p);
}

// --- input -----------------------------------------------------------------
const test = { input: null, presses: new Set() };
const NONE = { m: 0, dx: 1, dy: 0 };
const ROLE_ON = 0.35, ROLE_OFF = 0.12;
/** Both sticks and the shoulder buttons, from the pad or the test override. */
function rawInput() {
  if (test.input && (!cur || cur.slot === 0)) {
    const t = test.input;
    const st = (s) => { const m = Math.min(1, Math.hypot(s?.x || 0, s?.y || 0)); return m > 0 ? { m, dx: s.x / m, dy: -s.y / m } : NONE; };
    return { ls: st(t.ls), rs: st(t.rs), lt: t.lt || 0, rt: t.rt || 0, lb: t.lb ? 1 : 0, rb: t.rb ? 1 : 0, lsc: !!t.lsc, rsc: !!t.rsc };
  }
  const st = (s) => (s.m > 0 ? { m: s.m, dx: s.x / Math.hypot(s.x, s.y), dy: -s.y / Math.hypot(s.x, s.y) } : NONE);
  return { ls: st(ctl.move()), rs: st(ctl.camera()), lt: pad.lt(), rt: pad.rt(), lb: pad.down(BTN.LB) ? 1 : 0, rb: pad.down(BTN.RB) ? 1 : 0, lsc: pad.down(BTN.LS), rsc: pad.down(BTN.RS) };
}
const IDLE = { ls: NONE, rs: NONE, lt: 0, rt: 0, lb: 0, rb: 0, lsc: false, rsc: false };
function readInput() {
  // caught by the fungus: the cell no longer answers the sticks (only a surge, A, in the strike or hold)
  const r = caught.active ? IDLE : rawInput();
  if (S.scheme === 'classic') {
    const pods = [r.ls, r.rs];
    // A surge with no stick held goes along the cell's heading.
    if (surge.active && pods[0].m === 0 && pods[1].m === 0) pods[0] = { m: 1, dx: body.fx || 1, dy: body.fy || 0 };
    return { pods, push: r.rt, spread: r.lt };
  }
  return leadInput(r);
}
const other = (k) => (k === 'ls' ? 'rs' : 'ls');
/**
 * Lead and follow. One stick is the pseudopod stick (body.pods[0]), the other
 * the body stick; with no pseudopod the first stick pushed past ROLE_ON takes
 * the pseudopod. Holding LT or RT turns the body stick into a second
 * pseudopod (body.pods[1]) that sprouts beside the first.
 */
function leadInput(r) {
  for (const k of [...R.latch]) if (r[k].m < ROLE_OFF) R.latch.delete(k);
  if (!R.pod) {
    if (R.body && r[R.body].m < ROLE_OFF) R.body = null;
    const order = r.ls.m >= r.rs.m ? ['ls', 'rs'] : ['rs', 'ls'];
    for (const k of order) {
      if (k === R.body || R.latch.has(k) || r[k].m < ROLE_ON) continue;
      R.pod = k; R.body = other(k);
      break;
    }
  }
  const ps = R.pod ? r[R.pod] : NONE;
  const bk = R.pod ? other(R.pod) : R.body;
  const bs = bk ? r[bk] : NONE;
  R.branch = !!R.pod && Math.max(r.lt, r.rt) > 0.5;
  const pods = [ps, NONE];
  let bodyIn = null;
  if (R.branch) {
    if (bs.m > 0.06) {
      // The second pseudopod keeps its place while it is still out; a new one
      // starts 30–70° round from the first, on the side the stick points.
      const b2 = body.pods[1];
      const tip = b2.active || b2.s > 0.12 ? b2.tip : body.branchTip(bs.dx, bs.dy, body.pods[0]);
      pods[1] = { ...bs, tip };
    }
  } else if (bs.m > 0) bodyIn = bs;
  // A surge with no stick held: the body flows on along its heading.
  if (surge.active && ps.m === 0 && pods[1].m === 0 && !bodyIn) bodyIn = { m: 1, dx: body.fx || 1, dy: body.fy || 0 };
  R.last = { pod: R.pod, body: bk };
  return { pods, push: r.rb, spread: r.lb, body: bodyIn };
}
/** After a step: the roles reset once the lead pseudopod has gone back into the body. */
function updateRoles() {
  if (S.scheme !== 'lead' || !R.pod) return;
  const p = body.pods[0];
  if (p.active) return;
  if (p.s < 0.02 && (p.ret <= 0.05 || body.podReach(p) < 40)) resetRoles(false);
  else if (p.s < 0.15 && body.podReach(p) < 30) resetRoles(false);
}
/** Roles back to none; after eating, a stick still held must be let go before it leads again. */
function resetRoles(latch) {
  const r = rawInput();
  if (latch && R.pod && r[R.pod].m >= ROLE_OFF) R.latch.add(R.pod);
  const bk = R.pod ? other(R.pod) : R.body;
  R.body = bk && r[bk].m >= ROLE_OFF ? bk : null;
  R.pod = null;
}
function rolesText() {
  if (S.scheme !== 'lead') return 'Controls: two pseudopods (classic) · LS: pseudopod 1 · RS: pseudopod 2';
  if (!R.pod && !R.body) return 'LS: free · RS: free (push one to grow a pseudopod)';
  const bk = R.pod ? other(R.pod) : R.body;
  const name = (k) => (k === R.pod ? 'pseudopod' : k === bk ? (R.branch ? 'second pseudopod' : 'body') : 'free');
  return `LS: ${name('ls')} · RS: ${name('rs')}`;
}
const pressed = (b) => pad.pressed(b) || ((!cur || cur.slot === 0) && test.presses.has(b));
/** Toasts about one player's amoeba name the player when more than one is playing. */
const who = (c = cur) => (cells.length > 1 && c ? `${c.p.name}: ` : '');

function rumble(ms, weak, strong) { if (S.rumble) pad.rumble(ms, weak, strong); }

// --- game logic ---------------------------------------------------------------
function tryClose() {
  const c = C.cand;
  if (!c) { hud.toast(who() + 'No prey in the cup: wrap pseudopods round one first'); return; }
  if (c.cup.wrap < CUP_WRAP) {
    hud.toast(who() + `Not enclosed yet: ${Math.round((c.cup.wrap * 180) / Math.PI)}° of ${Math.round((CUP_WRAP * 180) / Math.PI)}°`);
    return;
  }
  C.closing = { prey: c.prey, t: 0, low: 0 };
  audio.play('amoeba/engulf', { volume: 0.7 });
  hud.toast(who() + `Closing the food cup round the ${c.prey.sp.name}…`);
}

function cancelClose(msg) {
  C.closing = null;
  body.closing = null;
  if (msg) hud.toast(who() + msg);
}

function capture(p, cup) {
  // Sealed across the mouth (cup) or already enclosed by the membrane (no cup).
  const area = cup ? body.seal(cup) : 1.3 * Math.PI * (p.sp.L / 2) * (p.sp.W / 2);
  if (!cup) { body.A0 += area; body.closing = null; }
  const { L, W } = p.sp;
  const rx0 = L / 2 + 5, ry0 = W / 2 + 5;
  const v = {
    x: p.x, y: p.y, rx0, ry0, rx: rx0, ry: ry0, ang: p.heading, spin: rand.range(-0.03, 0.03),
    scale: Math.max(1, Math.sqrt(area / (Math.PI * rx0 * ry0))), fit: 1,
    digest: 0, digestTime: p.sp.digest, nutrition: 0.35 * Math.PI * (L / 2) * (W / 2), age: 0, prey: p,
  };
  v.rx = rx0 * v.scale; v.ry = ry0 * v.scale;
  cyto.addVacuole(v);
  p.captured = v;
  C.eaten++;
  if (S.scheme === 'lead') {
    // The cup has closed: its pseudopods dissolve into the vacuole and the roles reset.
    for (const pod of body.pods.slice(0, 2)) { pod.active = false; pod.target = 0; pod.ret = 1; }
    resetRoles(true);
  }
  C.closing = null;
  hud.toast(who() + `${p.sp.name} engulfed: a food vacuole forms`);
  audio.play('amoeba/vacuole', { volume: 0.9, rate: 0.85 });
  rumble(300, 0.5, 0.2);
}

/** A food vacuole reached the uroid (cytoplasm.js): let the prey go, or leave the residue. Runs inside use(c). */
function onEgest(c, v) {
  const k = cur;
  use(c);
  const p = v.prey;
  if (p && p.alive && v.digest < 0.15) {
    p.captured = null;
    p.x = body.ux; p.y = body.uy;
    p.th = Math.atan2(body.uy - body.cy, body.ux - body.cx);
    p.state = 'swim'; p.speedK = 1.6; p.sc = 1;
    hud.toast(who() + `Let go: the ${p.sp.name} swims off`);
  } else {
    if (p) despawn(p);
    const fx = body.ux + (body.ux - body.cx) * 0.08, fy = body.uy + (body.uy - body.cy) * 0.08;
    addResidue(world, fx, fy, Math.max(14, Math.max(v.rx, v.ry) * 1.6), rand());
    if (p && S.respawn) S.pending.push({ key: Object.keys(SPECIES).find((k) => SPECIES[k] === p.sp), t: 6 });
    hud.toast(who() + 'Food vacuole egested at the uroid');
  }
  use(k);
}

function egest() {
  const v = cyto.vacuoles.filter((x) => !x.egest).sort((a, b) => b.digest - a.digest || b.age - a.age)[0];
  if (!v) { hud.toast(who() + 'Nothing to let go'); return; }
  v.egest = true;
}

// Borrowed squirmer flow: each swimming prey's dipole field moves the others (2D, z = 0).
const fA = new THREE.Vector3(), fB = new THREE.Vector3(), fU = new THREE.Vector3(), fQ = new THREE.Vector3(), fOut = new THREE.Vector3();
function preyFlow(dt) {
  const free = prey.filter((p) => !p.captured);
  const moves = free.map((p) => {
    fOut.set(0, 0, 0);
    fQ.set(p.x, p.y, 0);
    for (const q of free) {
      if (q === p) continue;
      const c = Math.cos(q.heading), sn = Math.sin(q.heading), h = q.sp.L / 2;
      fA.set(q.x - c * h, q.y - sn * h, 0); fB.set(q.x + c * h, q.y + sn * h, 0);
      fU.set(c * (q.v || 0), sn * (q.v || 0), 0);
      squirmerFlow(fQ, fA, fB, fU, q.sp.W / 2, fOut);
    }
    return [fOut.x, fOut.y];
  });
  free.forEach((p, i) => { p.x += moves[i][0] * dt; p.y += moves[i][1] * dt; });
}

const tmp = {};
/** The membrane nearest a point over every player's cell: { d, i, cell }. */
function nearestCell(x, y) {
  let best = null;
  for (const c of cells) { const n = c.body.nearest(x, y); if (!best || n.d < best.d) best = { d: n.d, i: n.i, cell: c }; }
  return best;
}
function stepPrey(dt, col) {
  const swim = S.swimK;
  const subs = Math.ceil(swim / 2);
  const closingOn = (p) => cells.some((c) => c.s.closing && c.s.closing.prey === p);
  for (const p of prey.slice()) {
    if (p.captured) {
      p.update(dt);
      if (p.captured.digest >= 1 && !p.done) {
        p.done = true;
        audio.play('amoeba/digest', { volume: 0.8 });
        despawn(p);
        p.captured.prey = null;
        p.captured.residue = true;
        if (S.respawn) S.pending.push({ key: Object.keys(SPECIES).find((k) => SPECIES[k] === p.sp), t: 8 });
      }
      continue;
    }
    for (let s = 0; s < subs; s++) p.update((dt * swim) / subs);
    p.updateCircles();
    // The membrane yields to the prey it is closing round, so it is not squeezed out.
    const closing = closingOn(p);
    const share = closing ? 0.2 : p.sp.kind === 4 ? 0.55 : 0.85;
    let touched = false;
    for (const c of p.circles) {
      for (const cap of col.capsules) {
        const ex = cap.bx - cap.ax, ey = cap.by - cap.ay, l2 = ex * ex + ey * ey || 1;
        const t = clamp(((c.x - cap.ax) * ex + (c.y - cap.ay) * ey) / l2, 0, 1);
        const qx = c.x - cap.ax - ex * t, qy = c.y - cap.ay - ey * t;
        const d = Math.hypot(qx, qy), r = cap.r + c.r;
        if (d < r && d > 1e-3) { p.x += (qx / d) * (r - d); p.y += (qy / d) * (r - d); p.avoid(0.7); }
      }
      for (const o of col.circles) {
        const qx = c.x - o.x, qy = c.y - o.y, d = Math.hypot(qx, qy), r = o.r + c.r;
        if (d < r && d > 1e-3) { p.x += (qx / d) * (r - d); p.y += (qy / d) * (r - d); p.avoid(0.7); }
      }
      for (const cl of cells) {
        cl.body.collideCircle(c.x, c.y, c.r + 1.5, share, tmp);
        if (tmp.hits) { p.x += tmp.x; p.y += tmp.y; touched = true; }
      }
    }
    const near = nearestCell(p.x, p.y);
    const nb = near.cell.body;
    // Ciliates flee an approaching membrane (escape swimming), so they must be chased.
    if (S.flee && p.sp.ciliate && near.d - p.sp.W / 2 < 75 && !touched && p.state === 'swim' && !closing && (p.fleeT || 0) <= 0) {
      const ax = p.x - nb.x[near.i], ay = p.y - nb.y[near.i];
      p.th = Math.atan2(ay, ax) + rand.range(-0.5, 0.5);
      p.speedK = 2.2; p.browse = -1; p.fleeT = 2.5;
    }
    p.fleeT = (p.fleeT || 0) - dt;
    if (near.d - p.sp.W / 2 < p.sp.sense || touched) {
      if (!p.touch) { const k = cur; use(near.cell); rumble(60, 0.15, 0); use(k); }
      p.touch = 1;
      p.avoid();
    } else p.touch = 0;
    for (const cl of cells) {
      const d = cl.body.grid.sample(p.x, p.y);
      if (d > 0) {
        cl.body.grid.grad(p.x, p.y, tmp);
        p.x -= tmp.x * (d + p.sp.W / 2); p.y -= tmp.y * (d + p.sp.W / 2);
      }
    }
    if (S.respawn && Math.hypot(p.x - nb.cx, p.y - nb.cy) > 1500) {
      const k = cur;
      use(cells[(rand() * cells.length) | 0]);
      const [x, y] = freeSpot(700, 950);
      p.x = x; p.y = y; p.th = Math.atan2(body.cy - y, body.cx - x) + rand.range(-0.8, 0.8);
      use(k);
    }
  }
}

function updateCup(dt) {
  // The best cup candidate: the prey the membrane wraps furthest.
  let best = null;
  for (const p of prey) {
    if (p.captured || p.layer !== 'focus') continue;
    if (Math.hypot(p.x - body.cx, p.y - body.cy) > body.req + 450) continue;
    const reach = Math.max(p.sp.L, p.sp.W) / 2 + 130;
    const cup = body.cupAround(p.x, p.y, reach);
    if (cup && (!best || cup.wrap > best.cup.wrap)) best = { prey: p, cup };
  }
  C.cand = best && best.cup.wrap > 1.6 ? best : null;

  const CL = C.closing;
  if (!CL) { body.closing = null; return; }
  const p = CL.prey;
  CL.t += dt;
  const reach = Math.max(p.sp.L, p.sp.W) / 2 + 130;
  const cup = body.cupAround(p.x, p.y, reach);
  if (!cup || cup.wrap < 2.1) CL.low += dt; else CL.low = 0;
  if (CL.low > 0.8 || CL.t > 14) { cancelClose(`The ${p.sp.name} slipped away`); return; }
  if (!cup) return;
  body.closing = { i0: cup.i0, i1: cup.i1, mx: cup.mx, my: cup.my, px: p.x, py: p.y, run: cup.run };
  // A Paramecium caught in a closing cup fires its trichocysts.
  if (p.sp.kind === 4 && p.charges > 0 && p.cool <= 0 && cup.wrap > 2.4) {
    const n = body.nearest(p.x, p.y);
    if (p.discharge(body.x[n.i], body.y[n.i])) {
      body.blast(p.x, p.y, 140, 30);
      rumble(450, 0.9, 1);
      hud.toast(who() + (p.charges ? 'Trichocysts! The Paramecium blasts the cup open' : 'Its last nearby trichocysts are spent'));
    }
  }
  if (body.grid.sample(p.x, p.y) > p.sp.W * 0.25) { capture(p, null); return; }
  if (cup.gap < 16) {
    const { inside } = body.cupContains(cup, p.x, p.y);
    if (inside) capture(p, cup);
    else cancelClose(`The ${p.sp.name} got out before the rims met`);
  }
}

// --- pinch-off ----------------------------------------------------------------
/** Cut the ring across nodes i and j: the piece with the nucleus stays the cell. */
function pinchOff(i, j) {
  const nu = cyto.nucleus;
  const lost = body.pinchAt(i, j, nu.x, nu.y);
  body.grid.build(body.x, body.y, N);
  S.pinches++;
  if (C.closing) cancelClose();
  const n = lost.xs.length;
  if (n >= 3 && lost.area > 50) {
    let cx = 0, cy = 0;
    for (let k = 0; k < n; k++) { cx += lost.xs[k]; cy += lost.ys[k]; }
    fragments.push({ xs: Float64Array.from(lost.xs), ys: Float64Array.from(lost.ys), cx: cx / n, cy: cy / n, R: Math.sqrt(lost.area / Math.PI), A: lost.area, age: 0, seed: rand(), mesh: null });
  }
  hud.toast(who() + 'The hypha cut through a thin neck: that piece of the cell is lost', 2600);
  rumble(400, 0.8, 0.8);
}
/** A lost piece rounds up (curve shortening at a fixed area), shrinks a little, darkens and breaks up over about 4 s. */
function updateFragments(dt) {
  for (let f = fragments.length - 1; f >= 0; f--) {
    const fr = fragments[f], n = fr.xs.length, xs = fr.xs, ys = fr.ys;
    fr.age = Math.min(1, fr.age + dt / 4);
    for (let it = 0; it < 3; it++) {
      const ox = Float64Array.from(xs), oy = Float64Array.from(ys);
      for (let k = 0; k < n; k++) {
        const a = (k + n - 1) % n, b = (k + 1) % n;
        xs[k] += 0.3 * (ox[a] + ox[b] - 2 * ox[k]);
        ys[k] += 0.3 * (oy[a] + oy[b] - 2 * oy[k]);
      }
    }
    let area = 0, cx = 0, cy = 0;
    for (let k = 0, j = n - 1; k < n; j = k++) {
      const c = xs[j] * ys[k] - xs[k] * ys[j];
      area += c; cx += (xs[j] + xs[k]) * c; cy += (ys[j] + ys[k]) * c;
    }
    area *= 0.5;
    if (Math.abs(area) > 1) { cx /= 6 * area; cy /= 6 * area; }
    const want = fr.A * (1 - 0.4 * fr.age);
    const k1 = Math.sqrt(want / Math.max(1, Math.abs(area)));
    for (let k = 0; k < n; k++) { xs[k] = cx + (xs[k] - cx) * k1; ys[k] = cy + (ys[k] - cy) * k1; }
    fr.cx = cx; fr.cy = cy; fr.R = Math.sqrt(want / Math.PI);
    if (fr.age >= 1) { view.removeFragment(fr); fragments.splice(f, 1); }
  }
}

// Membrane on a trap hypha sticks: it keeps only a little of each step's motion.
let trapX = new Float64Array(N), trapY = new Float64Array(N);
const stuckIdx = [];
function stickToTraps(dt, traps) {
  let n = 0;
  stuckIdx.length = 0;
  const free = surge.active;
  for (let i = 0; i < N; i++) {
    const x = body.x[i], y = body.y[i];
    for (const c of traps) {
      const ex = c.bx - c.ax, ey = c.by - c.ay, l2 = ex * ex + ey * ey;
      const t = clamp(((x - c.ax) * ex + (y - c.ay) * ey) / l2, 0, 1);
      if (Math.hypot(x - c.ax - ex * t, y - c.ay - ey * t) < c.r) {
        n++; stuckIdx.push(i);
        const keep = C.defend > 0.5 ? 0.55 : 0.08; // stiffened, it peels away
        if (!free) { body.x[i] = trapX[i] + (x - trapX[i]) * keep; body.y[i] = trapY[i] + (y - trapY[i]) * keep; }
        break;
      }
    }
  }
  if (n && !C.stuckN) { hud.toast(who() + 'Caught on a fungal trap hypha: surge (A) to tear free'); rumble(250, 0.4, 0.6); }
  C.stuckN = free ? 0 : n;
  C.stuckT = C.stuckN ? C.stuckT + dt : Math.max(0, C.stuckT - dt * 2);
  if (C.stuckT > 8 && !caught.active) {
    // stuck too long: haustoria grow in where the membrane is glued (the catch sequence)
    const pts = [];
    for (let k = 0; k < 3; k++) { const i = stuckIdx[Math.floor(((k + 0.5) / 3) * stuckIdx.length)]; if (i !== undefined) pts.push({ x: body.x[i], y: body.y[i] }); }
    startCatch(pts);
  }
}

/** Other players' membranes as circles, so amoebae push against one another instead of overlapping. */
function othersAsCircles(col, c) {
  if (cells.length < 2) return col;
  const circles = col.circles.slice();
  for (const o of cells) {
    if (o === c) continue;
    const b = o.body;
    if (Math.hypot(b.cx - c.body.cx, b.cy - c.body.cy) > c.body.req + b.req + 500) continue;
    for (let i = 0; i < N; i += 2) circles.push({ x: b.x[i], y: b.y[i], r: 7 });
  }
  return { capsules: col.capsules, circles };
}

function simStep(dt) {
  const col = S.flags.obstacles ? worldColliders(world, dt) : { capsules: [], circles: [] };
  const adt = dt * S.amoebaK;
  updateFungus(dt);
  const traps = S.traps ? trapCapsules(world) : [];
  for (const c of cells) {
    use(c);
    const input = readInput();
    // Surge: ease the pseudopod boost in and out over the dash.
    let sk = surge.active ? 1 + (SURGE - 1) * Math.sin(Math.PI * Math.min(1, 1 - surge.phase)) ** 0.6 : 1;
    // Defend (B held near a trap): the cell stiffens and draws its pseudopods in.
    C.defend = clamp((C.defend || 0) + ((C.defendHeld && !caught.active) ? 1 : -1) * dt * 6, 0, 1);
    if (C.defend > 0.5) { input.pods = [NONE, NONE]; input.body = null; }
    // Attack (X at a hypha): a fast pseudopod jab at the cut.
    if (C.jab && C.jab.t > 0) {
      C.jab.t -= dt;
      const dx = C.jab.x - body.cx, dy = C.jab.y - body.cy, l = Math.hypot(dx, dy) || 1;
      input.pods = [{ m: 1, dx: dx / l, dy: dy / l }, input.pods[1] || NONE];
      sk = Math.max(sk, SURGE);
    }
    body.opts.boost = sk; C.surgeK = sk;
    stepCatch(dt);
    if (traps.length) { trapX.set(body.x); trapY.set(body.y); }
    body.step(adt, input, othersAsCircles(col, c));
    if (traps.length) stickToTraps(dt, traps);
    body.grid.build(body.x, body.y, N);
    updateCup(adt);
  }
  use(cells[0]);
  stepPrey(dt, col);
  for (const c of cells) {
    use(c);
    // Traps and prey moved membrane nodes too: keep the ring simple.
    body.untangle();
    if (S.pinch && traps.length) {
      const cut = body.findCut(traps);
      if (cut) pinchOff(cut[0], cut[1]);
    }
    updateRoles();
    soundTick(dt);
    // Optional parts of the cytoplasm simulation.
    const saved = body.pods.map((p) => p.s);
    if (!S.streaming) for (const p of body.pods) p.s = 0;
    const cvT = cyto.cv.t;
    cyto.brownian = S.brownian;
    cyto.update(adt, body, S.time);
    if (!S.cv) { cyto.cv.t = cvT; cyto.cv.r = Math.max(cyto.cv.r, 6); cyto.cv.systole = 0; }
    body.pods.forEach((p, k) => { p.s = saved[k]; });
  }
  use(cells[0]);
  updateFragments(dt);
  if (preyFlowOn) preyFlow(dt * S.swimK);
  for (const q of ambient) { q.update(dt * S.swimK); if (Math.hypot(q.x - S.camX, q.y - S.camY) > 1400) { q.x = S.camX - Math.cos(q.th) * 1100; q.y = S.camY - Math.sin(q.th) * 1100; } }
  stepBeacon(dt);
  for (const pe of S.pending) pe.t -= dt;
  for (const pe of S.pending.filter((x) => x.t <= 0)) {
    // respawned prey turn up round any player
    use(cells[(rand() * cells.length) | 0]);
    spawn(pe.key, 750, 1000);
    use(cells[0]);
  }
  S.pending = S.pending.filter((x) => x.t > 0);
  S.time += dt;
}

// --- players ---------------------------------------------------------------------
/** Switch the per-player state to cell c (see the players note at the top). */
function use(c) {
  if (!c) return;
  cur = c;
  ({ body, cyto, surge, caught, FC, R, pad, ctl, trapX, trapY, haustoria } = c);
  C = c.s;
}

/** Player 1's cell: the state created above. */
function firstCell(p) {
  const c = { p, slot: 0, body, cyto, surge, caught, FC, R, pad, ctl, trapX, trapY, haustoria, s: C, layer: view.cells[0] };
  cyto.onEgest = (v) => onEgest(c, v);
  return c;
}

/** A new player's amoeba: a fresh cell beside a teammate (warmed up a little so it is not a perfect disc). */
function addCell(p) {
  if (cells.some((c) => c.slot === p.slot)) return;
  const c = { p, slot: p.slot, pad: players.pad(p.slot), ctl: players.controls(p.slot), surge: createDash({ duration: 0.9, cooldown: 2.4 }),
    caught: null, FC: { pts: [], A0: 0, phase: null },
    R: { pod: null, body: null, latch: new Set(), branch: false, last: null }, trapX: new Float64Array(N), trapY: new Float64Array(N),
    haustoria: makeHaustoria(), s: newCellState() };
  c.caught = createCapture({ onRespawn: () => captureRespawn(c) });
  const [x, y] = spotBeside(c);
  makeBody(c, x, y);
  cells.push(c);
  cells.sort((a, b) => a.slot - b.slot);
  retint();
  return c;
}

/** Where a new or returning amoeba appears: beside the nearest teammate, clear of it. */
function spotBeside(c) {
  const mates = cells.filter((o) => o !== c && !o.caught.active);
  const m = mates[0] || cells.find((o) => o !== c);
  if (!m) return [0, 0];
  const a = (c.slot * 2.1) + 0.6;
  const d = m.body.req * 1.25 + 140;
  return [m.body.cx + Math.cos(a) * d, m.body.cy + Math.sin(a) * d];
}

/** Give cell c a new body and cytoplasm at (x, y) (its view layer is rebound or made). */
function makeBody(c, x, y) {
  const old = c.cyto;
  if (old) for (const v of old.vacuoles) if (v.prey) despawn(v.prey);
  // the Features switches (pseudopod speed, area, self-contact...) as player 1's cell has them
  const opts = cells[0] ? { ...cells[0].body.opts, boost: 1 } : {};
  c.body = new Body(rand, x, y);
  Object.assign(c.body.opts, opts);
  c.cyto = new Cytoplasm(rand, c.body, c.slot === 0 ? 2600 : 1300);
  const c0 = cells[0] ? cells[0].cyto : null;
  if (c0) Object.assign(c.cyto, { caps: c0.caps, infill: c0.infill });
  c.cyto.onEgest = (v) => onEgest(c, v);
  c.body.grid.build(c.body.x, c.body.y, N);
  // a short warm-up: a resting, polypodial cell
  const idle = { pods: [{ m: 0, dx: 1, dy: 0 }, { m: 0, dx: 1, dy: 0 }], push: 0, spread: 0, body: null };
  for (let i = 0; i < 90; i++) { c.body.step(1 / 60, idle, { capsules: [], circles: [] }); c.body.grid.build(c.body.x, c.body.y, N); c.cyto.update(1 / 60, c.body, S.time); }
  c.s.A0init = c.body.A0;
  if (c.layer) view.rebindCell(c.layer, c.body, c.cyto); else c.layer = view.addCell(c.body, c.cyto);
}

function removeCell(slot) {
  const i = cells.findIndex((c) => c.slot === slot);
  if (i <= 0) return; // player 1 always stays
  const c = cells[i];
  for (const v of c.cyto.vacuoles) if (v.prey) despawn(v.prey);
  for (const h of c.haustoria) { h.hidden = true; h.grow = 0; }
  c.caught.reset(false);
  view.removeCell(c.layer);
  c.ret?.remove(); c.retText?.remove();
  cells.splice(i, 1);
  use(cells[0]);
  retint();
}

/** Multiplayer: drained by the fungus (or lost), the amoeba comes back beside a teammate. */
function respawnCell(c) {
  const [x, y] = spotBeside(c);
  c.s = Object.assign(newCellState(), { eaten: c.s.eaten });
  c.R.pod = c.R.body = null; c.R.latch.clear();
  makeBody(c, x, y);
  use(c);
  const m = cells.find((o) => o !== c);
  hud.toast(`${c.p.name}: a fresh amoeba${m ? ` beside ${m.p.name}` : ''}`, 2600);
}

function retint() {
  for (const c of cells) view.setTint(c.layer, c.p.color, cells.length > 1 ? 0.1 : 0);
}

/** Every joined player has a cell, and only they do (after the shell's roster arrives). */
function syncCells() {
  for (const p of players.list) {
    const c = cells.find((o) => o.slot === p.slot);
    if (c) c.p = p; else addCell(p);
  }
  for (const c of cells.slice()) if (!players.get(c.slot)) removeCell(c.slot);
  retint();
}

// --- landmarks ----------------------------------------------------------------------
// Forward: a green Paramecium bursaria (Chlorella symbionts) swimming low over
// the slide, ~2.6 mm to the right of the start: reaching it with the membrane
// zooms in to the pool (the camera follows it out, §2.6/§3 of the design).
// Backdoor: a Sphagnum leaf tip dipping into the pool, ~2.3 mm to the left,
// with the water film's edge round it: dwelling there, Y goes back up to the
// tardigrade. About a minute of steady crawling each way; longer while hunting.
const FWD_HOME = { x: 2600, y: 350 };
const BACK_TIP = { x: -2300, y: -260 };
const BACK_LABEL = 'Back to the tardigrade';
const beacon = makePrey('bursaria', FWD_HOME.x, FWD_HOME.y, 0.6, rng(29));
const leaf = (() => {
  const L = 2600, W = 560, ang = 0.22;
  const cx = BACK_TIP.x - Math.cos(ang) * L / 2, cy = BACK_TIP.y - Math.sin(ang) * L / 2;
  const o = { type: 'leaf', x: cx, y: cy, ang, L, W, layer: 'focus', seed: 0.37 };
  // Colliders: capsules down the leaf's axis, as wide as the blade.
  const hw = (d) => (W / 2) * Math.pow(Math.min(1, d / L), 0.55);
  const ds = [30, 120, 300, 600, 1000, 1600, 2500];
  const at = (d) => [BACK_TIP.x - Math.cos(ang) * d, BACK_TIP.y - Math.sin(ang) * d];
  const capsules = [];
  for (let k = 0; k < ds.length - 1; k++) {
    const [ax, ay] = at(ds[k]), [bx, by] = at(ds[k + 1]);
    capsules.push({ ax, ay, bx, by, r: Math.max(8, hw((ds[k] + ds[k + 1]) / 2) * 0.92) });
  }
  o.collide = { capsules, circles: [] };
  world.obstacles.push(o);
  return o;
})();
const lm = { fwdLatch: false, near: false, log: [] };
function stepBeacon(dt) {
  const b = beacon;
  // it wanders in a loose circle round its spot, low over the slide
  const dx = FWD_HOME.x - b.x, dy = FWD_HOME.y - b.y;
  if (Math.hypot(dx, dy) > 170) {
    const want = Math.atan2(dy, dx);
    let da = want - b.th; da = Math.atan2(Math.sin(da), Math.cos(da));
    b.th += clamp(da, -1, 1) * dt * 1.2;
  }
  b.state = 'swim';
  b.update(dt * Math.min(S.swimK, 1) * 0.6);
}
/** Where each player stands with respect to the landmarks; posts them. */
function checkLandmarks() {
  let near = false;
  for (const c of cells) {
    const b = c.body;
    c.atBack = !c.caught.active && (Math.hypot(b.cx - BACK_TIP.x, b.cy - BACK_TIP.y) < b.req + 260 || b.nearest(BACK_TIP.x, BACK_TIP.y).d < 90);
    if (c.atBack) near = true;
    c.atFwd = !c.caught.active && b.nearest(beacon.x, beacon.y).d < beacon.sp.W / 2 + 45;
  }
  const fwd = cells.find((c) => c.atFwd);
  if (fwd && !lm.fwdLatch) {
    lm.fwdLatch = true;
    lm.log.push({ type: 'landmark', kind: 'forward', slot: fwd.slot });
    hud.toast(`${who(fwd)}A green Paramecium bursaria: follow it out into the pool`, 2600);
    embed.landmark('forward', { player: fwd.slot });
  }
  if (!cells.some((c) => c.atFwd || Math.hypot(c.body.cx - beacon.x, c.body.cy - beacon.y) < c.body.req + 250)) lm.fwdLatch = false;
  setNear(near);
}
const promptEl = document.createElement('div');
promptEl.style.cssText = 'position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);z-index:21;padding:6px 14px;border-radius:999px;background:rgba(18,16,10,.62);color:#efe3c2;border:1px solid rgba(201,163,90,.55);font:600 13px system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:none;white-space:nowrap;display:none';
document.body.appendChild(promptEl);
function setNear(on) {
  if (on === lm.near) return;
  lm.near = on;
  embed.near('back', on, BACK_LABEL);
  lm.log.push({ type: 'near', on });
  const kb = !players.hasController;
  promptEl.innerHTML = `<b style="display:inline-block;min-width:18px;padding:0 5px;margin-right:6px;border-radius:${kb ? '5px' : '50%'};background:${kb ? '#3a3426' : '#c9a33a'};color:${kb ? '#efe3c2' : '#1a1508'};text-align:center">${kb ? 'R' : 'Y'}</b>${BACK_LABEL}`;
  promptEl.style.display = on && !embed.active ? 'block' : 'none';
}

// --- labels and the cup reticle (DOM) ----------------------------------------------------
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:12px/1.2 system-ui,sans-serif;color:#1d2228;';
document.body.appendChild(overlay);
const warnEl = document.createElement('div');
warnEl.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,12,16,.7);color:#ff8a7a;border-radius:12px;padding:6px 14px;font:600 13px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap;z-index:20;display:none;max-width:calc(100vw - 32px)';
document.body.appendChild(warnEl);
const reticle = document.createElement('div');
reticle.style.cssText = 'position:absolute;border:1.5px dashed rgba(40,60,90,.55);border-radius:50%;display:none;transform:translate(-50%,-50%);';
const retText = document.createElement('div');
retText.style.cssText = 'position:absolute;transform:translate(-50%,0);white-space:nowrap;background:rgba(255,255,255,.55);padding:1px 6px;border-radius:8px;display:none;';
overlay.append(reticle, retText);
const labelPool = [];
function label(i, x, y, text) {
  let el = labelPool[i];
  if (!el) {
    el = document.createElement('div');
    el.style.cssText = 'position:absolute;white-space:nowrap;padding:1px 5px;border-radius:6px;background:rgba(255,255,255,.6);transform:translate(8px,-50%);';
    const dot = document.createElement('i');
    dot.style.cssText = 'position:absolute;left:-8px;top:50%;width:5px;height:5px;margin-top:-3px;border-radius:50%;background:#c33;';
    el.appendChild(dot);
    el.appendChild(document.createElement('span'));
    overlay.appendChild(el);
    labelPool[i] = el;
  }
  const [sx, sy] = toScreen(x, y);
  el.style.left = `${sx}px`; el.style.top = `${sy}px`;
  el.lastChild.textContent = text;
  el.style.display = sx < -50 || sy < -20 || sx > innerWidth + 50 || sy > innerHeight + 20 ? 'none' : '';
}
/** Screen position (CSS px) of a slide point as player `slot`'s view shows it. */
function toScreen(x, y, slot = 0) {
  const L = split.layout;
  if (!L.regions.length) {
    const [l, b, w, h] = view.view;
    return [((x - l) / w) * innerWidth, (1 - (y - b) / h) * innerHeight];
  }
  const reg = L.regions.find((r) => r.slot === slot);
  const q = split.project(reg ? reg.view : 0, { x, y, z: 0 });
  return [q.x, q.y];
}
function updateOverlay() {
  const dark = S.mode === 2 || S.mode === 3;
  overlay.style.color = dark ? '#eef' : '#1d2228';
  // The cup reticle, one per player.
  for (const cl of cells) {
    const st = cl.s;
    if (!cl.ret) {
      cl.ret = reticle.cloneNode(); cl.retText = retText.cloneNode();
      overlay.append(cl.ret, cl.retText);
    }
    const rt = cl.ret, rtx = cl.retText;
    const c = cl.caught.active ? null : st.closing ? { prey: st.closing.prey } : st.cand;
    if (c) {
      const p = c.prey;
      const [sx, sy] = toScreen(p.x, p.y, cl.slot);
      const r = (Math.max(p.sp.L, p.sp.W) / 2 + 22) * view.cssPerUm;
      rt.style.display = rtx.style.display = '';
      rt.style.left = `${sx}px`; rt.style.top = `${sy}px`;
      rt.style.width = rt.style.height = `${2 * r}px`;
      const ready = st.closing || (st.cand && st.cand.cup.wrap >= CUP_WRAP);
      rt.style.borderColor = ready ? 'rgba(40,140,60,.8)' : cells.length > 1 ? cl.p.color : 'rgba(40,60,90,.5)';
      rtx.style.left = `${sx}px`; rtx.style.top = `${sy + r + 4}px`;
      const deg = st.cand ? Math.round((st.cand.cup.wrap * 180) / Math.PI) : 0;
      rtx.textContent = (cells.length > 1 ? `${cl.p.name} · ` : '') + (st.closing ? 'filling in…' : ready ? `${deg}° wrapped: X to close` : `${deg}° wrapped`);
    } else {
      rt.style.display = rtx.style.display = 'none';
    }
  }
  let i = 0;
  if (S.labels) {
    const nu = cyto.nucleus;
    label(i++, nu.x, nu.y, 'nucleus (discoid, ~45 µm)');
    label(i++, cyto.cv.x, cyto.cv.y, 'contractile vacuole');
    label(i++, body.ux, body.uy, 'uroid (rear)');
    for (const pod of body.pods) if (pod.s > 0.2 && !pod.idle) label(i++, pod.x, pod.y, 'hyaline cap');
    for (const v of cyto.vacuoles) label(i++, v.x + v.rx, v.y, v.prey ? `food vacuole (${v.prey.sp.name})` : 'food vacuole (residue)');
    const gx = body.cx + (body.ux - body.cx) * 0.35, gy = body.cy + (body.uy - body.cy) * 0.35;
    label(i++, gx, gy, 'granular endoplasm (sol)');
    const e = body.nearest(body.cx + 1000 * body.fy, body.cy - 1000 * body.fx);
    label(i++, body.x[e.i], body.y[e.i], 'ectoplasm (clear gel rim)');
    for (const p of prey) if (!p.captured) label(i++, p.x + p.sp.L / 2, p.y, `${p.sp.name} ${p.sp.real.split(',')[0]}`);
    if (S.traps) for (const o of trapList()) if (o.grow > 0.1) label(i++, o.x, o.y, `fungal trap hypha (Zoopagales), ${o.active > 0.5 ? 'sticky' : 'dormant'}`);
    let k = 0;
    for (const o of world.obstacles) {
      if (o.layer !== 'focus' || k > 6) continue;
      const [sx, sy] = toScreen(o.x, o.y);
      if (sx < 0 || sy < 0 || sx > innerWidth || sy > innerHeight) continue;
      label(i++, o.x, o.y, o.type === 'spiro' ? 'Spirogyra (alga)' : o.type === 'diatom' ? 'diatom' : o.type === 'leaf' ? 'Sphagnum leaf tip (the way back up)' : 'detritus'); k++;
    }
  }
  for (; i < labelPool.length; i++) labelPool[i].style.display = 'none';
}

// --- frame loop -----------------------------------------------------------------
function resize() { view.setSize(innerWidth, innerHeight); }
addEventListener('resize', resize);
resize();

cells.push(firstCell(players.get(0)));
use(cells[0]);

// Warm up: a polypodial resting cell, prey scattered round it.
for (const k of MIX) spawn(k);
ambient = [makePrey('paramecium', -500, 300, 0.4, rand), makePrey('colpidium', 400, -200, 2.4, rand)];
for (const a of ambient) a.layer = 'above';
for (let i = 0; i < 600; i++) {
  const saved = test.input;
  test.input = { ls: null, rs: null };
  simStep(1 / 60);
  test.input = saved;
}
S.camX = body.cx; S.camY = body.cy;
C.A0init = body.A0;
resetFungus(); // the warm-up does not use up the calm opening

let last = performance.now();
let acc = 0;
// Split screen: a 2D microscope field drawn round a centre (shared/splitscreen.js);
// while split each view draws its property buffers at SPLIT_SCALE of the screen.
const split = createSplitScreen(renderer, { renderScale: 0.75 });
const SPLIT_SCALE = 0.7;
const splitT = { on: 0, off: 0 };
const marks = createLandmarks();
function frame(now) {
  if (paused && !renderOnce) { last = now; requestAnimationFrame(frame); return; }
  renderOnce = false;
  const dtReal = clamp((now - last) / 1000, 0, 0.1);
  last = now;
  S.fps += (1 / Math.max(dtReal, 1e-3) - S.fps) * 0.05;
  players.poll();
  use(cells[0]);
  unlockOnPad();
  const menu = features.update();
  if (!menu) {
    hud.update(pad);
    for (const c of cells) {
      if (c.p.waiting) continue;
      use(c);
      const fight = !caught.active || FC.phase === 'strike' || FC.phase === 'hold';
      if (fight && pressed(BTN.A) && surge.trigger()) { audio.play('amoeba/boost', { volume: 0.9 }); rumble(220, 0.3, 0.5); if (C.stuckN && !caught.active) hud.toast(`${who()}Surge: torn free of the trap`); }
      const threat = caught.active ? null : threatTrap(c);
      if (!caught.active && pressed(BTN.X) && !C.closing) {
        // at a hypha (and no cup ready to close): cut it; otherwise close the cup
        if (threat && !(C.cand && C.cand.cup.wrap >= CUP_WRAP)) cutHypha(threat, threat.near);
        else tryClose();
      }
      if (!caught.active && pressed(BTN.B)) {
        if (threat || C.stuckN) C.defendMode = true;
        else if (C.closing) cancelClose('Let go: the cup opens'); else egest();
      }
      if (!pad.down(BTN.B)) C.defendMode = false;
      C.defendHeld = C.defendMode && pad.down(BTN.B);
      // Y: on the backdoor (the leaf tip), go back up; elsewhere player 1's labels.
      if (pressed(BTN.Y)) {
        if (c.atBack && !caught.active) { lm.log.push({ type: 'landmark', kind: 'back', slot: c.slot }); hud.toast(`${who()}Back up to the water film`); embed.landmark('back', { player: c.slot }); }
        else if (c.slot === 0) S.labels = !S.labels;
      }
      if (c.slot !== 0) continue;
      const look = ctl.lookStep() || (test.presses.has(BTN.RIGHT) ? 1 : 0);
      if (look) features.set('look', MODES[(S.mode + look + MODES.length) % MODES.length]);
      const zs = ctl.zoomStep();
      if (zs) S.objective = zs > 0 ? 1 : 0;
      // Fine focus: LB/RB in the classic scheme; the stick clicks in lead and follow (LB/RB spread and push).
      const ri = S.scheme === 'classic' ? null : rawInput();
      const sec = S.scheme === 'classic' ? ctl.secondary() : (ri.rsc ? 1 : 0) - (ri.lsc ? 1 : 0);
      if (sec) S.focus = clamp(S.focus + sec * dtReal * 0.8, -1, 1);
    }
    use(cells[0]);
  }
  for (const c of cells) c.surge.update(dtReal);
  test.presses.clear();
  if (!menu && !paused) {
    acc += dtReal;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 4) { simStep(1 / 60); acc -= 1 / 60; steps++; }
    if (steps === 4) acc = 0;
  }
  checkLandmarks();
  // Camera: follow the cell, gently, leading a little in the direction of travel
  // (with several players: their centroid; the split screen takes it from there).
  // once eaten, the view slides so the shrivelled cell sits above the Eaten card
  const solo = cells.length === 1;
  const lift = 0;
  let tx, ty;
  const watching = solo && caught.active && ['eat', 'follow', 'fadeOut'].includes(FC.phase) && FC.pts[0];
  if (watching) { tx = (body.cx + FC.pts[0].x) / 2; ty = (body.cy + FC.pts[0].y) / 2; }
  else if (solo) { tx = body.cx + body.fx * 60 * Math.min(1, body.fm); ty = body.cy + body.fy * 60 * Math.min(1, body.fm) - lift; }
  else { tx = 0; ty = 0; for (const c of cells) { tx += c.body.cx; ty += c.body.cy; } tx /= cells.length; ty /= cells.length; }
  S.camX += (tx - S.camX) * Math.min(1, dtReal * 0.8);
  S.camY += (ty - S.camY) * Math.min(1, dtReal * 0.8);
  renderAll(dtReal);
  S.statT -= dtReal;
  if (S.statT <= 0) {
    S.statT = 0.25;
    let L = 0;
    for (let i = 0; i < N; i += 4) for (let j = i + 8; j < N; j += 4) L = Math.max(L, Math.hypot(body.x[i] - body.x[j], body.y[i] - body.y[j]));
    const ob = OBJECTIVES[S.objective];
    const amoebaX = Math.round(10 * S.amoebaK);
    const swimX = (0.1 * S.swimK).toFixed(1).replace(/\.0$/, '');
    hud.stats([
      rolesText(),
      `${MODES[S.mode]} · ${ob.name} objective, field ${(ob.field / 1000).toFixed(1)} mm · focus ${S.focus >= 0 ? '+' : ''}${S.focus.toFixed(2)}`,
      `Time: amoeba ×${amoebaX} (pseudopods ×${Math.round(amoebaX * (body.opts.speed || 1))}) · swimmers ×${swimX} of real speed`,
      `${surge.active ? `SURGE ×${C.surgeK.toFixed(1)}` : surge.text()}${C.stuckN ? ` · STUCK on a trap ${C.stuckT.toFixed(1)} s` : ''}${C.bitten ? ` · bitten ${C.bitten}` : ''}`,
      `Fungal traps: ${fungusText()}${caught.active ? ` · CAUGHT: ${FC.phase}` : ''}`,
      `Cell ${Math.round(L)} µm long · ${Math.round(body.A0 / 1000)}×10³ µm² · eaten ${C.eaten}${S.pinches ? ` · pinched off ${S.pinches}` : ''}`,
      `${C.cand ? `Cup: ${Math.round((C.cand.cup.wrap * 180) / Math.PI)}° round ${C.cand.prey.sp.name}` : 'Cup: none'}${C.closing ? ' · closing' : ''}`,
      cells.length > 1 ? `Players: ${cells.map((c) => `${c.p.name} eaten ${c.s.eaten}${c.caught.active ? ' (caught)' : c.p.waiting ? ' (waiting)' : ''}`).join(' · ')} · views ${split.layout.views.length}` : '',
      `${Math.round(S.fps)} fps`,
    ].filter(Boolean).join('\n'));
  }
  requestAnimationFrame(frame);
}

/** The field (µm across the screen). */
// while you are drained the view pulls back (eased) to show the fungus at work
const pull = { k: 1 };
const fieldWidth = () => {
  const want = cells.length === 1 && caught.active && ['eat', 'follow', 'fadeOut'].includes(FC.phase) ? 1.45 : 1;
  pull.k += (want - pull.k) * 0.04;
  return OBJECTIVES[S.objective].field * (innerWidth > innerHeight ? 1 : 0.6) * pull.k;
};
/** Draw every view (one, straight to the screen, while the players are together), then the overlays. */
function renderAll(dt) {
  const fieldW = fieldWidth();
  for (const c of cells) { c.layer.drain = c.s.drain || 0; const q = (c.pos ||= { x: 0, y: 0, z: 0 }); q.x = c.body.cx; q.y = c.body.cy; }
  view.bodyMat.uniforms.uDrain.value = cells[0].s.drain || 0;
  split.update(cells.map((c) => ({ slot: c.slot, position: c.pos })), { center: { x: S.camX, y: S.camY }, pxPerUnit: innerWidth / fieldW, yUp: true }, dt);
  const L = split.layout;
  const many = L.views.length > 1;
  splitT.on = many ? splitT.on + dt : 0;
  splitT.off = many ? 0 : splitT.off + dt;
  if (splitT.on > 0.4) view.setScale(SPLIT_SCALE);
  if (splitT.off > 1) view.setScale(1);
  const args = { time: S.time, prey: [...prey, ...ambient, beacon], mode: S.mode, focus: S.focus, flags: S.flags, granuleCount: S.granules, fragments };
  if (!many) {
    const o = L.views[0] ? L.views[0].offset : { x: 0, y: 0 };
    view.setView(S.camX + o.x, S.camY + o.y, fieldW);
    view.render({ ...args, buffersOnly: !!borrow.id });
    if (borrow.id) renderBorrowed(dt);
  } else {
    L.views.forEach((v, k) => {
      view.setView(S.camX + v.offset.x, S.camY + v.offset.y, fieldW);
      view.render({ ...args, target: split.target(v.index), update: k === 0 });
    });
    // The optics composite is display-ready: no second encoding when the regions are drawn.
    const cs = renderer.outputColorSpace;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    split.compose();
    renderer.outputColorSpace = cs;
  }
  // Warnings: player 1's, else the first player in trouble.
  const warn = (c) => (c.caught.active ? (c.FC.phase === 'eaten' ? '' : CATCH_TEXT[c.FC.phase]) : c.s.stuckN ? `Stuck on a fungal trap hypha: surge (A) to tear free (haustoria in ${Math.max(0, 8 - c.s.stuckT).toFixed(1)} s)` : '');
  const wc = cells.find((c) => warn(c));
  warnEl.textContent = wc ? who(wc) + warn(wc) : '';
  warnEl.style.display = warnEl.textContent ? 'block' : 'none';
  updateOverlay();
  marks.begin();
  marks.drawSplit(split, { x: beacon.x, y: beacon.y, z: 0 }, { kind: 'forward', label: 'Pool', range: 4500 });
  marks.drawSplit(split, { x: BACK_TIP.x, y: BACK_TIP.y, z: 0 }, { kind: 'backdoor', label: 'Leaf', range: 4500 });
  if (cells.length > 1) drawRings(L, innerWidth / fieldW);
}

/** With more than one player: a faint broken ring in each player's colour round their amoeba, and a name tag. */
function drawRings(L, ppu) {
  const cv = marks.canvas, g = cv.getContext('2d');
  const k = cv.width / (cv.clientWidth || innerWidth);
  g.save();
  g.setTransform(k, 0, 0, k, 0, 0);
  for (const c of cells) {
    const reg = L.regions.find((r) => r.slot === c.slot);
    if (!reg) continue;
    const q = split.project(reg.view, c.pos);
    const r = Math.min(220, c.body.req * ppu * 1.35 + 10);
    g.save();
    if (L.views.length > 1) { g.beginPath(); reg.polygon.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); }
    g.globalAlpha = c.caught.active ? 0.25 : 0.45;
    g.strokeStyle = c.p.color; g.lineWidth = 1.25; g.setLineDash([10, 8]);
    g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 0.85; g.fillStyle = c.p.color; g.font = '600 11px system-ui,sans-serif'; g.textAlign = 'center';
    g.fillText(c.p.name, q.x, q.y - r - 5);
    g.restore();
  }
  g.restore();
}

function fungusText() {
  if (!S.traps) return 'off';
  const g = trapList()[0]?.grow ?? 0;
  if (fungus.state === 'grace') return `absent (calm, ${Math.ceil(fungus.left)} s)`;
  const growing = g < 1 ? `growing ${Math.round(g * 100)}% · ` : '';
  return `${growing}${fungusOn() ? `sticky${pacing.cycles ? ` ${Math.ceil(fungus.left)} s` : ''}` : `dormant ${Math.ceil(fungus.left)} s`}`;
}
function renderBorrowed(dt) {
  const o = view.optics;
  let def = o.defRT;
  if (S.flags.dof) { o.blur(o.defRT.texture, o.tmpRT, o.defBlurRT, 7 + 5 * (1 - S.focus)); def = o.defBlurRT; }
  looks.fieldFromBuffers(o.w, o.h, { a: { opd: o.focusRT.texture, absSwz: 'gba' }, b: { opd: def.texture, absSwz: 'gba' }, opdK: 1, absK: 1, heightK: 40 });
  const umPerPx = view.view[2] / (view.bw * view.scale);
  if (borrow.id === 'semMite') looks.semFromField({ umPerPx, dist: 4000, cls: CLS.CUTICLE, subCls: CLS.GRAIN, dt });
  else if (borrow.id === 'dicTardigrade') looks.dic({ mode: bmode.dic, pxPerUm: 1 / umPerPx, time: S.time, opdK: 1, absK: 1 });
  else looks.paramecium({ mode: bmode.par, time: S.time, opdK: 1, absK: 1 });
}

let paused = false;
let renderOnce = false;
// The shell's roster (players who joined in its menus), then joins during play.
if (embed.players) { players.fromJSON(embed.players); syncCells(); }
embed.on('players', (r) => { players.fromJSON(r); syncCells(); });
hud.players(players.list);
requestAnimationFrame(frame);

// --- headless review ----------------------------------------------------------------
const cellOf = (slot) => cells.find((c) => c.slot === slot) || cells[0];
/** Test hook: lay a grown, sticky trap hypha across player `slot`'s membrane and start the fungus's catch. */
function forceCapture(slot = 0) {
  use(cellOf(slot));
  const o = trapList()[0];
  let best = 0;
  for (let i = 0; i < N; i++) if (body.x[i] > body.x[best]) best = i;
  o.x = body.x[best]; o.y = body.y[best]; o.ang = Math.PI / 2 + 0.2;
  for (const t of trapList()) { t.grow = 1; t.active = 1; }
  const pts = [-10, 0, 10].map((d) => { const i = (best + d + N) % N; return { x: body.x[i], y: body.y[i] }; });
  startCatch(pts);
  if (cells.length === 1) { S.camX = body.cx; S.camY = body.cy; }
  const ph = caught.phase;
  use(cells[0]);
  return ph;
}
window.__micro = {
  forceCapture, get capture() { return cells[0].caught; },
  pacing: () => ({ t: S.time - pacing.t0, firstHungry: pacing.firstHungry, firstThreat: pacing.firstThreat, firstCatch: pacing.firstCatch, grace: pacing.grace,
    hunters: [{ name: 'fungus', state: fungus.state, hungry: fungusOn(), left: +fungus.left.toFixed(1), grow: +(trapList()[0]?.grow ?? 0).toFixed(2) }],
    capture: caught.active ? { phase: FC.phase, by: 'fungus' } : null, mode: caught.active ? 'caught' : C.stuckN ? 'stuck' : 'free', stuckN: C.stuckN,
    captured: cells.filter((c) => c.caught.active).map((c) => c.slot) }),
  THREE, renderer, camera: view.camera, scene: view.focusScene, scenes: { mask: view.maskScene, focus: view.focusScene, above: view.aboveScene },
  view, get body() { return cells[0].body; }, get cyto() { return cells[0].cyto; }, prey, world, state: S, features,
  get cell() { return cells[0].s; },
  players, cells, split, marks, landmarks: lm, beacon, leaf,
  get layout() { return split.layout; },
  set input(v) { test.input = v; }, get input() { return test.input; },
  press(name) { test.presses.add(BTN[name]); },
  setMode(i) { features.set('look', MODES[i]); },
  pause(v = true) { paused = v; },
  /** While paused: draw one frame (for screenshots). */
  renderOnce() { renderOnce = true; },
  /** Run the simulation for `sec` seconds of game time without rendering. */
  advance(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) simStep(1 / 60); S.camX = body.cx; S.camY = body.cy; },
  spawnPrey(key, x, y, th = 0) { const p = makePrey(key, x, y, th, rand); prey.push(p); return p; },
  clearPrey() { for (const p of prey.slice()) if (!p.captured) despawn(p); S.respawn = false; },
  close: tryClose, get surge() { return cells[0].surge; }, ctl, readInput,
  /** Lead and follow roles: { pod: 'ls'|'rs'|null, body, branch }. */
  get roles() { const R0 = cells[0].R; return { pod: R0.pod, body: R0.pod ? other(R0.pod) : R0.body, branch: R0.branch, latch: [...R0.latch] }; },
  rolesText, fragments,
  /** 'lead' or 'classic'. */
  scheme(v) { features.set('scheme', v === 'classic' ? SCHEMES[1] : SCHEMES[0]); },
  /** Test hook: cut the neck between ring nodes i and j as a hypha would (pinch-off demo). */
  pinch(i, j) { pinchOff(i, j); },
  /** Test hook: make the cell a fresh disc at its centroid (organelles kept). */
  resetBody() {
    const R = Math.sqrt(body.A0 / Math.PI);
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU; body.x[i] = body.cx + R * Math.cos(a); body.y[i] = body.cy + R * Math.sin(a); }
    for (const p of body.pods) { p.s = 0; p.target = 0; p.active = false; p.ret = 0; }
    body.grid.build(body.x, body.y, N);
  },
  traps: trapList,
  /** Test hook: player `slot` holds B (defend) or lets go. */
  defend(on = true, slot = 0) { const c = cellOf(slot); c.s.defendHeld = on; c.s.defendMode = on; },
  /** Test hook: player `slot` presses X at the nearest threatening trap hypha (cuts it). Returns whether it could. */
  cut(slot = 0) { const c = cellOf(slot); const o = threatTrap(c); if (!o) return false; use(c); cutHypha(o, o.near); use(cells[0]); return true; },
  /** Test hook: a fresh amoeba for player `slot` centred at (x, y) µm. */
  place(slot, x, y) { const c = cellOf(slot); makeBody(c, x, y); use(cells[0]); if (cells.length === 1) { S.camX = x; S.camY = y; } },
  /** Test hook: put player `slot` at the forward landmark (the P. bursaria) or the backdoor (the leaf tip). */
  teleport(kind, slot = 0) {
    const c = cellOf(slot);
    if (kind === 'forward') { lm.fwdLatch = false; window.__micro.place(slot, beacon.x - 90, beacon.y); }
    else window.__micro.place(slot, BACK_TIP.x + 230, BACK_TIP.y + 40);
    return c.slot;
  },
};

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
import { buildWorld, worldColliders, nearColliders, addResidue, wetMountCanvas, cytoplasmCanvas, meanColor, trapCapsules, SLIDE, distFromStart, bearingFromStart, ringPoint, PATCHES, PATCH, CILIATES, BACK_TIP, leafDist, LEAF, portalParts, clearAt, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, canPlace } from './world.js';
import { createDirector } from '../shared/director.js';
import { View } from './render.js';
import { Chaos, CHAOS_R, CHAOS_WAKE, CHAOS_LEASH, RING } from './chaos.js';
import { resolvePair, overlap, reaches, BINS } from './contact.js';
import { rng, TAU, clamp, hyp, Scratch } from './util.js';
import { selectRoles, selectInput as selectPods, podList, podExists, steeredSlot, basePoint, DEG, STICK_OFF, KEYS } from './select.js';
import { createHunger, createCapture, createFight } from '../shared/predation.js';
import { createPlayers } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks, portalArrowOn } from '../shared/landmark.js';
import { embed } from '../shared/embed.js';
import { createQuality } from '../shared/quality.js';
import { createPortalGlow, createPortalLight } from '../shared/portal.js';
import { t as tt, tx as ttx } from '../shared/text.js';

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
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25)); // the quality governor owns it from here
renderer.autoClear = false;
// Software GL (SwiftShader, as in headless checks): the property buffers at
// half resolution or less, like the other worlds' fallbacks. Players never see it.
const SOFTWARE = (() => {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(gl.RENDERER)) + (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''));
})();

// Local multiplayer (shared/players.js): player 1 on the keyboard and the first
// controller, players 2-4 join with any button on another controller at any
// time. Each player is their own amoeba with the lead-and-follow sticks; the
// screen splits LEGO-style (shared/splitscreen.js) when they crawl apart.
// The per-player state below (body, cyto, surge, caught, FC, R, C, pad,
// ctl...) is switched to the cell being stepped by use(cell).
const cells = [];
const players = createPlayers({
  max: 4,
  onJoin: (p) => { embed.post('join', { index: p.slot, color: p.color, name: p.name, roster: players.toJSON() }); addCell(p); audio.play('shared/join', { volume: 0.6 }); hud.toast(tt('shared.players.joined', { n: p.slot + 1 })); },
  onLeave: (p) => { embed.post('leave', { index: p.slot, roster: players.toJSON() }); removeCell(p.slot); hud.toast(tt('shared.players.left', { n: p.slot + 1 })); },
  onChange: (list) => hud && hud.players(list),
});
let pad = players.pad(0);
let ctl = players.controls(0);
let surge = createDash({ duration: 0.9, cooldown: 2.4 });
let cur = null; // the cell being stepped
const SCHEMES = ['Pseudopods and movement (default)', 'Lead and follow', 'Two pseudopods (classic)'];
const SCHEME_IDS = ['select', 'lead', 'classic'];
// The help panel's rows and note for each control scheme: amoeba.hud in
// shared/text_config.js (common rows, then each scheme's own).
const COMMON_CONTROLS = ttx('amoeba.hud.common');
const CONTROLS = Object.fromEntries(SCHEME_IDS.map((id) => [id, {
  rows: hudControls({ ...COMMON_CONTROLS, ...ttx(`amoeba.hud.schemes.${id}.controls`) }),
  note: tt(`amoeba.hud.schemes.${id}.note`),
}]));
const WAY_NOTE = tt('amoeba.hud.wayNote');
const hud = mountHud({
  title: tt('amoeba.hud.title'),
  sub: tt('amoeba.hud.sub'),
  controls: CONTROLS.select.rows,
  note: CONTROLS.select.note + WAY_NOTE,
});
/** Swap the help panel's controls list when the scheme changes (same markup as mountHud). */
function showControls(which) {
  const el = document.querySelector('.hud');
  if (!el) return;
  const CHIP = { A: 'a', B: 'b', X: 'x', Y: 'y' };
  const KEYS = { 'LT/RT': 'Z / X', LT: 'Z', RT: 'X', 'LB/RB': 'Q / F', A: 'Space', B: 'Shift', X: 'E', Y: 'R', LS: 'WASD', RS: 'Arrows', View: 'Tab', Menu: 'Esc', 'D-pad': '1–4', 'LS click': 'C', 'RS click': 'V' };
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
  if (embed.active) embed.post('hud', { title: tt('amoeba.hud.title'), sub: el.querySelector('.sub')?.textContent || '', controls: CONTROLS[which].rows, note: CONTROLS[which].note + WAY_NOTE });
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
// Every shader program, compiled now (in the background where the driver can),
// not on the first frame, the first split or the first pinch-off.
view.precompile();

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
  flee: true, traps: true, passive: false,
  scheme: 'select', pinches: 0, pinch: true,
};
// Lead and follow: which stick grows the pseudopod (body.pods[0]) and which
// moves the body; a stick in `latch` must be let go before it can lead again.
// Pseudopods and movement: R.sel / R.adj are the indices (in body.pods) of the
// pseudopods RS (R) and LS (L) own (kept through neutral); choose / glow: RT's
// choosing (select.js selectRoles).
const newRoles = () => ({ pod: null, body: null, branch: false, last: null, ...selectRoles() });
let R = newRoles();
// the view widened for choosing pseudopods (frameChoosing): k eased toward want, which only grows
const selZoom = { k: 1, want: 1 };
// Per-player game state (was in S): food eaten, the cup candidate and the closing cup, trap contact, bites, surge, drain.
const newCellState = () => ({ eaten: 0, cand: null, closing: null, stuckT: 0, stuckN: 0, bitten: 0, surgeK: 1, drain: 0, A0init: 0,
  stuckAt: [], bites: [], death: 0, reform: 0 });
let C = newCellState();
const fragments = [];

// --- the fungal traps' pacing (shared/predation.js) ----------------------------
// The trap hyphae lie grown on their ring from the start (no calm opening on
// a clock: the calm is the warm-up space round the start). The fungus's
// "hunger" comes and goes, and shows: while hungry the adhesive knobs are
// large, dark and sticky; while resting they are small, pale and do not stick.
// A hypha driven off withdraws and grows back over GROW_S seconds.
const GROW_S = 25;
const pacing = { grace: 0, cycles: true, t0: 0, firstHungry: null, firstThreat: null, firstCatch: null };
const fungus = createHunger({ grace: pacing.grace, hungry: [30, 50], restFed: [50, 80], restMissed: [20, 35] });
const trapList = () => world.obstacles.filter((o) => o.type === 'trap' && !o.haustorium);
// Each trap hypha fights readably (shared/predation.js createFight): while the
// fungus is hungry and a membrane comes near, the hypha winds up (it curls and
// its adhesive knobs swell and shimmer: the tell), then snaps shut; only then
// is it sticky (o.grip). Stiffening (hold B) as it snaps makes it slide off
// (a block); a pseudopod jab (X) engulfs and cuts its tip (bite back). Enough
// and the hypha withdraws for a while (retreat).
for (const o of trapList()) {
  o.grow = 1; o.active = 0; o.grip = 0; o.wind = 0;
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
    // only the hyphae someone is near fight (the rest of the ring waits, and costs nothing)
    let near = false;
    for (const c of cells) if (hyp(c.body.cx - o.x, c.body.cy - o.y) < o.L / 2 + c.body.req + 520) near = true;
    trapFight(o, dt, sticky && S.traps && !o.hidden && o.grow > 0.05 && near && !S.passive);
    if (near && !challengeLog.traps && S.traps) { const n = o.near && o.fight.state !== 'idle' ? o.near : nearestToTrap(o); if (n && n.d < 220) logChallenge('traps', n.cell); }
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
      const d = hyp(b.x[i] - ax - ex * t, b.y[i] - ay - ey * t) - o.W / 2;
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
  if (n && n.d < 220) logChallenge('traps', n.cell);
  o.wind = f.state === 'windup' ? f.t : f.state === 'strike' ? 1 : Math.max(0, o.wind - dt * 2);
  if (f.state === 'windup' && f.t < 0.05 && n) { const k = cur; use(n.cell); hud.toast(tt('amoeba.toasts.trapCurls', { who: who() }), 2200); rumble(120, 0.25, 0); use(k); }
  if (f.hit && n) { o.grip = 7; const k = cur; use(n.cell); hud.toast(tt('amoeba.toasts.trapSnaps', { who: who() })); rumble(250, 0.4, 0.6); use(k); }
  if (f.blocked && n) { o.grip = 0; const k = cur; use(n.cell); hud.toast(tt('amoeba.toasts.stiffened', { who: who(), resolve: Math.round(o.fight.interest * 100) })); rumble(200, 0.5, 0.3); use(k); }
  if (f.retreated) { o.grip = 0; hud.toast(tt('amoeba.toasts.fungusGivesUp'), 2400); }
}
/** The pseudopod a jab uses: the first (lead, classic), or a free one (select and steer). */
function jabSlot() {
  if (S.scheme !== 'select') return 0;
  const k = steeredSlot(body, held());
  body.pods[k].active = false; body.pods[k].s = 0;
  return k;
}
/** X at a trap hypha: a fast pseudopod jab engulfs its tip and cuts it (bite back). */
function cutHypha(o, n) {
  C.jab = { t: 0.45, x: n.x, y: n.y, k: jabSlot() };
  o.grow = Math.max(0.2, o.grow - 0.28);
  o.grip = 0;
  C.stuckT = 0;
  const gone = o.fight.bitten();
  audio.play('amoeba/engulf', { volume: 0.8, rate: 1.3 });
  rumble(220, 0.4, 0.4);
  hud.toast(gone ? tt('amoeba.toasts.jabGone', { who: who() }) : tt('amoeba.toasts.jab', { who: who(), resolve: Math.round(o.fight.interest * 100) }), 2400);
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
  for (const o of trapList()) { o.grow = 1; o.active = 0; o.grip = 0; o.wind = 0; o.fight.reset(); }
  for (const c of cells) for (const h of c.haustoria) { h.hidden = true; h.grow = 0; }
  pacing.t0 = S.time; pacing.firstHungry = null; pacing.firstThreat = null; pacing.firstCatch = null;
}

// --- caught by the fungus: strike → hold → eat → the Eaten card -------------------
// No card: the camera pulls back over the fungus as it drains you, holds there a
// couple of seconds, fades, and you come back (beside a teammate, or alone at
// a spot away from the traps).
let caught = createCapture({ onRespawn: () => captureRespawn(cells[0]) });
let FC = { pts: [], A0: 0, phase: null };
const CHAOS_TEXT = ttx('amoeba.banner.chaosCapture');
const CATCH_TEXT = ttx('amoeba.banner.fungusCapture');
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// A catch: the player keeps control through strike, hold and eat (a surge can
// still tear free); 'die' is the death animation (the stain takes over, the cell
// goes slack and breaks up, its granules drift off), then a short fade, the
// respawn, and the fresh cell re-forms (its granules gather: C.reform).
const CATCH_PHASES = [['strike', 0.45], ['hold', 1.0], ['eat', 2.4], ['die', 1.8], ['fadeOut', 0.45], ['fadeIn', 0.45]];
const DYING = ['die', 'fadeOut', 'fadeIn'];
/** Is cell c past the point of no return (dissolving, or faded out)? Its sticks no longer answer. */
const dying = (c = cur) => !!c && c.caught.active && DYING.includes(c.FC.phase);
const nodeNear = (b, x, y) => b.nearest(x, y).i;
function startCatch(pts) {
  if (caught.active) return;
  FC.pts = pts.slice(0, 3); FC.A0 = body.A0; FC.phase = 'strike';
  FC.nodes = FC.pts.map((p) => nodeNear(body, p.x, p.y));
  caught.start({ by: tt('amoeba.capture.fungus'), phases: CATCH_PHASES });
  embed.captured({ by: 'fungus', player: cur ? cur.slot : 0 });
  if (C.closing) cancelClose();
  haustoria.forEach((h, k) => { h.hidden = !FC.pts[k]; h.grow = 0; });
  audio.play('amoeba/pierce', { volume: 0.9, old: ['amoeba/engulf', { volume: 1, rate: 0.6 }] });
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
  if (FC.by === 'chaos') { stepEngulf(dt); return; }
  if ((FC.phase === 'strike' || FC.phase === 'hold' || FC.phase === 'eat') && surge.active) {
    // torn free in time: the haustoria take a bite (more, the longer they drained), and the fungus rests a while
    caught.reset(false); FC.phase = null;
    for (const i of FC.nodes || []) C.bites.push({ i, t: 0, s: 0.5 + 0.5 * C.drain });
    body.A0 = Math.min(FC.A0 * 0.93, body.A0); C.bitten++; C.stuckT = 0; C.drain = 0;
    for (const h of haustoria) { h.hidden = true; h.grow = 0; }
    fungus.missed();
    audio.play('amoeba/tear', { volume: 0.8 });
    hud.toast(tt('amoeba.toasts.tornFree', { who: who() }), 1800);
    rumble(300, 0.6, 0.6);
    return;
  }
  const c = caught.update(dt, pad);
  if (!c.active) { FC.phase = null; return; }
  if (c.phase === 'fadeIn') { FC.phase = c.phase; C.drain = 0; return; }
  if (c.phase !== FC.phase) {
    FC.phase = c.phase;
    if (c.phase === 'eat') { fungus.fed(); audio.play('amoeba/digest', { volume: 1, rate: 0.7 }); rumble(700, 0.5, 0.8); }
    if (c.phase === 'die') audio.play('amoeba/death', { volume: 0.8 });
  }
  const k = c.t;
  C.death = c.phase === 'die' ? k : DYING.includes(c.phase) ? 1 : 0;
  if (c.phase === 'strike') { placeHaustoria(0.55 * ease(k)); C.drain = 0; }
  else if (c.phase === 'hold') { placeHaustoria(0.55 + 0.45 * ease(k)); C.drain = 0.15 * k; }
  else {
    const e = c.phase === 'eat' ? ease(k) : 1;
    placeHaustoria(1);
    C.drain = 0.15 + 0.85 * e;
    body.A0 = FC.A0 * (1 - 0.4 * e - 0.15 * C.death); // the cell shrivels as it is sucked dry, then goes slack
  }
}
/** Engulfed by Chaos: drawn into it, digested in a food vacuole (darkening, shrinking), carried off. */
function stepEngulf(dt) {
  if ((FC.phase === 'strike' || FC.phase === 'hold') && surge.active) {
    // broke out before the vacuole sealed
    caught.reset(false); FC.phase = null; FC.by = null; C.drain = 0;
    C.bites.push({ i: nodeNear(body, chaos.body.cx, chaos.body.cy), t: 0, s: 0.6, chaos: true });
    audio.play('amoeba/tear', { volume: 0.8 });
    hud.toast(tt('amoeba.toasts.surgedOut', { who: who() }), 1800);
    rumble(300, 0.6, 0.6);
    return;
  }
  const c = caught.update(dt, pad);
  if (!c.active) { FC.phase = null; FC.by = null; return; }
  if (c.phase === 'fadeIn') { FC.phase = c.phase; C.drain = 0; return; }
  if (c.phase !== FC.phase) {
    FC.phase = c.phase;
    if (c.phase === 'eat') { audio.play('amoeba/digest', { volume: 1, rate: 0.6 }); rumble(600, 0.5, 0.7); }
    if (c.phase === 'die') audio.play('amoeba/death', { volume: 0.8 });
  }
  FC.pts = [{ x: chaos.body.cx, y: chaos.body.cy }];
  // pulled towards its middle
  const pull = c.phase === 'strike' ? 0.3 : c.phase === 'hold' ? 0.8 : 1.2;
  const dx = (chaos.body.cx - body.cx) * Math.min(1, pull * dt), dy = (chaos.body.cy - body.cy) * Math.min(1, pull * dt);
  moveCell(cur, dx, dy);
  const e = c.phase === 'eat' ? ease(c.t) : c.phase === 'strike' || c.phase === 'hold' ? 0 : 1;
  C.death = c.phase === 'die' ? c.t : DYING.includes(c.phase) ? 1 : 0;
  C.drain = 0.1 + 0.8 * e;
  body.A0 = FC.A0 * (1 - 0.5 * e - 0.1 * C.death);
}
// --- harm, made visible ------------------------------------------------------------
// Whatever hurts the cell shows where it comes from: a stain seeping into the
// cytoplasm from the contact (yellow-green from a fungus, rust-brown from Chaos's
// digestion) and a tremor of the membrane there. Stuck on a trap hypha: a stain
// creeping in from each glued spot, growing towards the 8 s mark, and the glued
// membrane shivers. Caught: the haustoria's stain spreads with the drain until it
// fills the cell. Engulfed by Chaos: its digestion seeps in from Chaos's side.
// Torn free: the bitten spots stay stained for a few seconds. Dying: the cell
// goes slack and breaks up, its granules drifting off and fading (C.death); the
// fresh cell gathers itself up from scattered granules (C.reform).
const TINT_FUNGUS = [0.3, 0.07, 0.68], TINT_CHAOS = [0.12, 0.36, 0.78];
function harmOf(c) {
  const b = c.body, s = c.s, F = c.FC;
  const h = (c.harmBuf ||= { stains: [], shock: [], tint: TINT_FUNGUS, death: 0, scatter: 0, gran: 1 });
  h.stains.length = 0; h.shock.length = 0; h.tint = TINT_FUNGUS;
  const at = (i) => [b.x[i], b.y[i]];
  const stain = (i, reach, str) => { if (h.stains.length < 3 && i != null) h.stains.push([...at(i), reach, str]); };
  const shock = (i, amp) => { if (h.shock.length < 4 && i != null) h.shock.push([...at(i), amp]); };
  const R = b.req;
  if (c.caught.active && F.by === 'chaos') {
    h.tint = TINT_CHAOS;
    const i = nodeNear(b, chaos.body.cx, chaos.body.cy);
    const k = F.phase === 'strike' ? 0.25 : F.phase === 'hold' ? 0.45 : 0.6 + 0.4 * (s.drain || 0);
    stain(i, 60 + 2.6 * R * k, 0.5 + 0.5 * k);
    if (F.phase === 'strike' || F.phase === 'hold') shock(i, 0.8);
  } else if (c.caught.active) {
    const dr = s.drain || 0;
    for (const i of F.nodes || []) { stain(i, 60 + 2.4 * R * Math.min(1, dr * 1.15), 0.6 + 0.4 * dr); if (!DYING.includes(F.phase)) shock(i, 1 - 0.5 * dr); }
  } else if (s.stuckN) {
    const k = Math.min(1, s.stuckT / 8);
    for (const i of s.stuckAt) { stain(i, 25 + 75 * k, 0.3 + 0.45 * k); shock(i, 0.7 + 0.3 * k); }
  }
  // Chaos's arms round you: its stain seeps in where they press, deeper as the ring closes; shut, the membrane trembles
  const ring = !c.caught.active && chaos.on && chaos.ring && chaos.ringOf && chaos.ringOf.cell === c && (chaos.encircling || chaos.closing) ? chaos.ring : null;
  if (ring && ring.cover >= 0.35) {
    h.tint = TINT_CHAOS;
    const k = ring.cover, cb = chaos.body;
    for (const n of [0, 1]) { const pod = cb.pods[n]; if (pod.s > 0.2) stain(nodeNear(b, cb.x[pod.tip], cb.y[pod.tip]), 40 + 90 * k, 0.25 + 0.5 * k); }
    stain(nodeNear(b, cb.cx, cb.cy), 40 + 70 * k, 0.2 + 0.4 * k);
    if (chaos.closing) for (const n of [0, 1]) shock(nodeNear(b, cb.x[cb.pods[n].tip], cb.y[cb.pods[n].tip]), 0.9);
  }
  for (const q of s.bites) { if (q.chaos) h.tint = TINT_CHAOS; stain(q.i, 60 + 40 * q.t, q.s * (1 - q.t / 5)); }
  if (s.reform > 0) { h.death = s.reform; h.scatter = ease(s.reform); h.gran = 1 - 0.85 * s.reform; }
  else { h.death = s.death; h.scatter = ease(s.death); h.gran = 1 - 0.9 * ease(s.death); }
  return h;
}
/** Per step: bites fade, a fresh cell finishes gathering itself up. */
function stepHarm(dt) {
  for (const q of C.bites) q.t += dt;
  if (C.bites.length && C.bites[0].t > 5) C.bites = C.bites.filter((q) => q.t <= 5);
  if (C.reform > 0 && !caught.active) C.reform = Math.max(0, C.reform - dt / 1.3);
}
/** The end of a catch (the screen is black): a fresh amoeba, beside a teammate or alone at a safe spot. */
function captureRespawn(c) {
  const k = cur;
  use(c);
  const byChaos = FC.by === 'chaos';
  FC.phase = null; FC.by = null; C.drain = 0;
  for (const h of haustoria) { h.hidden = true; h.grow = 0; }
  for (const o of trapList()) { o.grip = 0; o.fight.reset(); }
  if (byChaos) { chaos.state = 'dormant'; chaos.fight.reset(); chaos.restUntil = chaos.t + 40; } // sated (it flows back to its post)
  if (cells.length > 1) respawnCell(c);
  else {
    const best = safeSpot(c.body.cx, c.body.cy);
    c.s = Object.assign(newCellState(), { eaten: c.s.eaten });
    Object.assign(c.R, newRoles());
    makeBody(c, best[0], best[1]);
    S.camX = best[0]; S.camY = best[1];
  }
  c.s.reform = 1; // the fresh cell gathers itself up (granules drawing together)
  audio.play('amoeba/reform', { volume: 0.8 });
  use(k === c ? c : k || cells[0]);
}
/**
 * Where a fresh amoeba starts after a catch: on calm glass a little back from
 * where it was caught (toward the start, never further back than it), clear of
 * every trap hypha, of Chaos, of the leaf and of the encounters' patches.
 */
function safeSpot(x, y) {
  const d = distFromStart(x, y), a = bearingFromStart(x, y);
  const safe = ([px, py]) => trapList().every((o) => hyp(o.x - px, o.y - py) > o.L / 2 + 330)
    && (!chaos.on || hyp(chaos.body.cx - px, chaos.body.cy - py) > CHAOS_R + 800) && leafDist(px, py) > LEAF.W / 2 + 300
    && encPatches.every((P) => hyp(P.x - px, P.y - py) > P.r + 350);
  for (const back of [450, 650, 900, 1200, 1600, 2100]) {
    const r = Math.max(0, d - back);
    for (const da of [0, 0.12, -0.12, 0.25, -0.25, 0.4, -0.4]) { const p = ringPoint(r, a + da); if (safe(p)) return p; }
    if (r === 0) break;
  }
  return [0, 0];
}
/** After the Eaten card (card mode only): a fresh cell where the old one was. */
function restartCell() {
  FC.phase = null;
  body.A0 = C.A0init; C.drain = 0; C.bitten = 0; C.stuckT = 0; C.stuckN = 0; C.eaten = 0;
  if (C.closing) cancelClose();
  const Rr = Math.sqrt(body.A0 / Math.PI);
  for (let i = 0; i < N; i++) { const a = (i / N) * TAU; body.x[i] = body.cx + Rr * Math.cos(a); body.y[i] = body.cy + Rr * Math.sin(a); }
  for (const p of body.pods) { p.s = 0; p.target = 0; p.active = false; p.ret = 0; }
  body.grid.build(body.x, body.y, N);
  hud.toast(tt('amoeba.toasts.freshAmoeba'), 3000);
}

// --- features panel ----------------------------------------------------------
const features = createFeatures({ key: 'amoeba', pad });
const F = (o) => features.add(o);
const audio = createAudio(['amoeba/amb-pool', 'amoeba/stretch', 'amoeba/boost', 'amoeba/engulf', 'amoeba/vacuole', 'amoeba/digest', 'shared/portal-chime',
  'amoeba/drain', 'amoeba/tremble', 'amoeba/squish', 'amoeba/roll', 'amoeba/stick', 'amoeba/tear', 'amoeba/pierce', 'amoeba/pinch', 'amoeba/chaos', 'amoeba/chaos-windup', 'amoeba/chaos-engulf', 'amoeba/death', 'amoeba/reform',
  'shared/portal-enter', 'shared/slowdown', 'shared/portal-near', 'shared/portal-sealed', 'shared/portal-appear', 'shared/backdoor', 'shared/foe-flees', 'shared/join', 'shared/danger']);
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
  // caught by the trap fungus: the drain loop runs through its 'eat' phase
  // (and stops when the catch moves on, ends or is torn free); the membrane
  // trembles about once a second while it holds and drains
  const draining = caught.active && FC.by !== 'chaos' && FC.phase === 'eat';
  if (draining && !cur.drainSnd) cur.drainSnd = audio.loop('amoeba/drain', { volume: 0.6 });
  else if (!draining && cur.drainSnd) { cur.drainSnd.stop(); cur.drainSnd = null; }
  if (caught.active && (FC.phase === 'hold' || FC.phase === 'eat')) {
    C.trembleT = (C.trembleT ?? 0.3) - dt;
    if (C.trembleT <= 0) { C.trembleT = 1; audio.play('amoeba/tremble', { volume: 0.45, rate: 0.95 + Math.random() * 0.1 }); }
  } else C.trembleT = undefined;
  if (caught.active) return;
  // changing shape (LT spreads, held it rounds up): a subtle squish on the press and the release, at most every 0.3 s
  const lt = rawInput().lt >= (C.ltSnd ? 0.3 : 0.5);
  if (lt !== !!C.ltSnd) {
    C.ltSnd = lt;
    if (!(C.squishT > snd.t)) { C.squishT = snd.t + 0.3; audio.play('amoeba/squish', { volume: 0.3, rate: 0.95 + Math.random() * 0.1 }); }
  }
  // turning fast (the front swinging round as it moves): a subtle roll, at most every 1.5 s
  const ang = Math.atan2(body.fy, body.fx);
  if (C.lastAng !== undefined && dt > 0) {
    const turn = Math.abs(Math.atan2(Math.sin(ang - C.lastAng), Math.cos(ang - C.lastAng))) / dt;
    C.turnRate = (C.turnRate || 0) + (turn - (C.turnRate || 0)) * Math.min(1, dt * 6);
    if (C.turnRate > 0.8 && body.fm > 0.3 && !(C.rollT > snd.t)) { C.rollT = snd.t + 1.5; audio.play('amoeba/roll', { volume: 0.25, rate: 0.9 + Math.random() * 0.2 }); }
  }
  C.lastAng = ang;
}
F({ id: 'look', group: 'Optics', choices: MODES, value: MODES[0],
  onChange: (v) => { S.mode = Math.max(0, MODES.indexOf(v)); } });
F({ id: 'propbuf', group: 'Rendering', fixed: true });
F({ id: 'tie', group: 'Optics', on: true,
  onChange: (v) => { S.flags.tie = v; } });
F({ id: 'refraction', group: 'Optics', on: true,
  onChange: (v) => { S.flags.refraction = v; } });
F({ id: 'chroma', group: 'Optics', on: true,
  onChange: (v) => { S.flags.chroma = v; } });
F({ id: 'dof', group: 'Optics', on: true,
  onChange: (v) => { S.flags.dof = v; } });
F({ id: 'bgrefr', group: 'Optics', on: true,
  onChange: (v) => { S.flags.bgRefraction = v; } });
F({ id: 'vignette', group: 'Rendering', on: true, onChange: (v) => { S.flags.vignette = v; } });
F({ id: 'grain', group: 'Rendering', on: true, onChange: (v) => { S.flags.grain = v; } });
F({ id: 'dome', group: 'Rendering', fixed: true });
F({ id: 'mask', group: 'Rendering', fixed: true });
F({ id: 'wrinkle', group: 'Body', on: true,
  onChange: (v) => { view.flags.wrinkle = v; } });
F({ id: 'caps', group: 'Body', on: true,
  onChange: (v) => { view.flags.caps = v; cyto.caps = v; } });
F({ id: 'area', group: 'Body', on: true,
  onChange: (v) => { body.opts.area = v; } });
F({ id: 'rear', group: 'Body', on: true,
  onChange: (v) => { body.opts.rearWeight = v; } });
F({ id: 'self', group: 'Body', on: true,
  onChange: (v) => { body.opts.selfContact = v; } });
F({ id: 'idle', group: 'Body', on: true,
  onChange: (v) => { body.opts.idlePods = v; } });
F({ id: 'overdamped', group: 'Motion', fixed: true });
F({ id: 'atime', group: 'Motion', choices: Object.keys(AMOEBA_TIME), value: 'Amoeba ×10',
  onChange: (v) => { S.amoebaK = AMOEBA_TIME[v] ?? 1; } });
F({ id: 'pspeed', group: 'Motion', choices: Object.keys(PSEUDO_SPEED), value: 'Quick (2×)',
  onChange: (v) => { body.opts.speed = PSEUDO_SPEED[v] ?? 2; } });
F({ id: 'surge', group: 'Motion', fixed: true });
F({ id: 'stime', group: 'Motion', choices: Object.keys(SWIM_TIME), value: 'Swimmers ×0.1',
  onChange: (v) => { S.swimK = SWIM_TIME[v] ?? 1; } });
F({ id: 'stream', group: 'Simulation', on: true,
  onChange: (v) => { S.streaming = v; } });
F({ id: 'brown', group: 'Simulation', on: true, onChange: (v) => { S.brownian = v; } });
F({ id: 'gran', group: 'Simulation', choices: Object.keys(GRANULES), value: '2600 granules',
  onChange: (v) => { S.granules = GRANULES[v] ?? 2600; } });
F({ id: 'cv', group: 'Simulation', on: true,
  onChange: (v) => { S.cv = v; } });
F({ id: 'cup', group: 'Simulation', fixed: true });
F({ id: 'flee', group: 'Simulation', on: true,
  onChange: (v) => { S.flee = v; } });
F({ id: 'traps', group: 'World', on: true,
  onChange: (v) => { S.traps = v; for (const o of world.obstacles) if (o.type === 'trap' && !o.haustorium) o.hidden = !v; } });
F({ id: 'hunger', group: 'World', on: true,
  onChange: (on) => { pacing.cycles = on; } });
F({ id: 'infill', group: 'Simulation', on: true,
  onChange: (v) => { cyto.infill = v; } });
F({ id: 'avoid', group: 'Simulation', fixed: true });
F({ id: 'obstacles', group: 'World', on: true,
  onChange: (v) => { S.flags.obstacles = v; } });
F({ id: 'above', group: 'World', on: true,
  onChange: (v) => { S.flags.above = v; } });
F({ id: 'rumble', group: 'Controls', on: true, onChange: (v) => { S.rumble = v; } });
F({ id: 'scheme', group: 'Controls', choices: SCHEMES, value: SCHEMES[0],
  onChange: (v) => {
    S.scheme = SCHEME_IDS[Math.max(0, SCHEMES.indexOf(v))];
    for (const c of cells) Object.assign(c.R, newRoles());
    showControls(S.scheme);
  } });
F({ id: 'sticks', group: 'Controls', fixed: true });
F({ id: 'simple', group: 'Body', fixed: true });
F({ id: 'pinch', group: 'Body', on: true,
  onChange: (v) => { S.pinch = v; } });

// --- borrowed (default off) ----------------------------------------------------
// The property buffers (phase, optical density; the out-of-focus layer blurred)
// become the shared optical field (shared/techniques/adapters.js), which other
// prototypes' image formation reads instead of this one's composite.
const looks = createBorrowedLooks(renderer);
const borrow = borrowedSwitches(features);
const bmode = { dic: 0, par: 0 };
borrow.add({ id: 'semMite', from: 'mite' });
F({ id: 'semMiteMode', group: 'Borrowed', from: 'mite', choices: SEM_LOOKS, value: SEM_LOOKS[0],
  onChange: (v) => looks.semMode(SEM_LOOKS.indexOf(v)) });
borrow.add({ id: 'dicTardigrade', from: 'tardigrade' });
F({ id: 'dicTardigradeMode', group: 'Borrowed', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0],
  onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
borrow.add({ id: 'microscopeParamecium', from: 'paramecium' });
F({ id: 'microscopeParameciumMode', group: 'Borrowed', from: 'paramecium', choices: PARAMECIUM_MODES, value: PARAMECIUM_MODES[0],
  onChange: (v) => (bmode.par = PARAMECIUM_MODES.indexOf(v)) });
F({ id: 'preyLowRe', group: 'Borrowed', from: 'paramecium', on: false,
  onChange: (v) => (PREY_OPTS.lowRe = v) });
let preyFlowOn = false;
F({ id: 'preyFlow', group: 'Borrowed', from: 'paramecium', on: false,
  onChange: (v) => (preyFlowOn = v) });

// --- prey ------------------------------------------------------------------
// Prey live in patches: a few easy flagellates round the start and patches of
// them scattered over the slide (world.js PATCHES: ambient food), and the
// encounters' patches of ciliates (they flee), placed by the director
// (encPatches). Each prey keeps to its patch (a loose tether), and an eaten one comes
// back to it after a while, swimming in from out of everyone's view, so there
// is always food, and a player can stay in a safe spot as long as they like.
// Prey far from every player only swim (no collisions or contact checks).
const PREY_AWAKE = 1300;
const keyOf = (p) => Object.keys(SPECIES).find((k) => SPECIES[k] === p.sp);

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
/** Is (x, y) farther than `rad` µm outside every player's view? */
function unseen(x, y, rad = 0) {
  // the widest each view can be (the drained pull-back included), no side effects
  const w = OBJECTIVES[S.objective].field * (innerWidth > innerHeight ? 1 : 0.6) * 1.45 / 2, h = w * (innerHeight / Math.max(1, innerWidth));
  return cells.every((c) => Math.abs(x - c.body.cx) > w + rad + 60 || Math.abs(y - c.body.cy) > h + rad + 60);
}
/** A prey of `key` in patch P: inside it (`inside`), or swimming in from just outside everyone's view. */
function spawnIn(P, key, inside) {
  let x = P.x, y = P.y, th = rand() * TAU;
  for (let k = 0; k < 30; k++) {
    const a = rand() * TAU, d = inside ? P.r * Math.sqrt(rand()) : P.r + rand.range(150, 450);
    x = P.x + Math.cos(a) * d; y = P.y + Math.sin(a) * d;
    if (cells.every((c) => c.body.grid.sample(x, y) < -40) && (inside || unseen(x, y, 40))) { th = inside ? th : a + Math.PI; break; }
    if (!inside && k === 29) return null; // everywhere round it is in view: try again later
  }
  const p = makePrey(key, x, y, th, rand);
  p.home = P;
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
/**
 * Both sticks and the shoulder buttons, from the pad or the test override.
 * The triggers are swapped here (the owner, 2026-11-02): the physical LT holds
 * movement mode and RT spreads, so everything below reads `rt` as "move the
 * cell" and `lt` as "spread" as before.
 */
function rawInput() {
  if (test.input && (!cur || cur.slot === 0)) {
    const t = test.input;
    const st = (s) => { const m = Math.min(1, Math.hypot(s?.x || 0, s?.y || 0)); return m > 0 ? { m, dx: s.x / m, dy: -s.y / m } : NONE; };
    return { ls: st(t.ls), rs: st(t.rs), lt: t.rt || 0, rt: t.lt || 0, lb: t.lb ? 1 : 0, rb: t.rb ? 1 : 0, lsc: !!t.lsc, rsc: !!t.rsc };
  }
  const st = (s) => (s.m > 0 ? { m: s.m, dx: s.x / Math.hypot(s.x, s.y), dy: -s.y / Math.hypot(s.x, s.y) } : NONE);
  return { ls: st(ctl.move()), rs: st(ctl.camera()), lt: pad.rt(), rt: pad.lt(), lb: pad.down(BTN.LB) ? 1 : 0, rb: pad.down(BTN.RB) ? 1 : 0, lsc: pad.down(BTN.LS), rsc: pad.down(BTN.RS) };
}
const IDLE = { ls: NONE, rs: NONE, lt: 0, rt: 0, lb: 0, rb: 0, lsc: false, rsc: false };
function readInput() {
  // caught by the fungus: the cell no longer answers the sticks (only a surge, A, in the strike or hold)
  // Caught, the cell still answers (struggle, surge, stiffen) until it dies.
  const r = dying() || outro ? IDLE : rawInput();
  if (S.scheme === 'classic') {
    const pods = [r.ls, r.rs];
    // A surge with no stick held goes along the cell's heading.
    if (surge.active && pods[0].m === 0 && pods[1].m === 0) pods[0] = { m: 1, dx: body.fx || 1, dy: body.fy || 0 };
    return { pods, push: r.rt, spread: r.lt };
  }
  if (S.scheme === 'select') return selectInput(r);
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
// --- pseudopods and movement (the default scheme): select.js -------------------
// Each stick keeps its pseudopod through neutral; RT held chooses them (glows
// at their bases, moved round the membrane by the sticks); LT held moves the
// cell; LB thickens the steered pseudopod (none steered: spreads the cell); RB
// pushes it harder. The logic is select.js; here it is fed this player's
// body and roles, with sound and rumble.
const held = () => [R.sel, R.adj].filter((v) => v != null);
const SELECT_ENV = { dt: 1 / 60, surge: false, rumble: (ms, w, st) => rumble(ms, w, st), sound: (e) => audio.play(e === 'enter' ? 'amoeba/stretch' : 'amoeba/squish', { volume: e === 'enter' ? 0.35 : 0.5, rate: e === 'enter' ? 1.6 : 1.3 }) };
function selectInput(r) {
  SELECT_ENV.surge = surge.active;
  const was = R.choose;
  const out = selectPods(body, R, r, SELECT_ENV);
  if (R.choose && !was && cur) frameChoosing(cur);
  if (!R.choose && was && R.committed) rumble(60, 0.2, 0.1);
  return out;
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
  if (S.scheme === 'select') {
    const steering = R.on.sel || R.on.adj;
    const r = rawInput();
    const lb = r.lb ? (steering ? tt('amoeba.corner.lbThick') : body.roundK > 0.05 ? tt('amoeba.corner.lbRounding') : tt('amoeba.corner.lbSpreading')) : '';
    const motion = ttx('amoeba.corner.motion');
    if (R.mode === 'move') return tt('amoeba.corner.moving', { what: R.move === 'free' || !R.move ? tt('amoeba.corner.pushAStick') : R.move.split(' + ').map((w) => motion[w] ?? w).join(' + '), lt: lb });
    if (R.mode === 'choose') {
      const one = (key, stick, letter) => { const g = R.glow[key]; return tt(g && g.busy ? 'amoeba.corner.glowBusy' : g && g.moved ? 'amoeba.corner.glowMoved' : 'amoeba.corner.glowReady', { stick, letter }); };
      return tt('amoeba.corner.choosing', { ls: one('adj', 'LS', 'L'), rs: one('sel', 'RS', 'R') });
    }
    const one = (key, stick, letter) => (R[key] != null ? (R.on[key] ? tt('amoeba.corner.stickMoving', { stick, letter }) : tt('amoeba.corner.stickHolding', { stick, letter })) : tt('amoeba.corner.stickFree', { stick }));
    return tt('amoeba.corner.select', { ls: one('adj', 'LS', 'L'), rs: one('sel', 'RS', 'R'), lt: lb });
  }
  if (S.scheme !== 'lead') return tt('amoeba.corner.classic');
  if (!R.pod && !R.body) return tt('amoeba.corner.leadFree');
  const bk = R.pod ? other(R.pod) : R.body;
  const name = (k) => tt(`amoeba.corner.roles.${k === R.pod ? 'pseudopod' : k === bk ? (R.branch ? 'second' : 'body') : 'free'}`);
  return tt('amoeba.corner.lead', { ls: name('ls'), rs: name('rs') });
}
const pressed = (b) => pad.pressed(b) || ((!cur || cur.slot === 0) && test.presses.has(b));
/** Toasts about one player's amoeba name the player when more than one is playing. */
const who = (c = cur) => (cells.length > 1 && c ? `${c.p.name}: ` : '');

function rumble(ms, weak, strong) { if (S.rumble) pad.rumble(ms, weak, strong); }

// --- game logic ---------------------------------------------------------------
function tryClose() {
  const c = C.cand;
  if (!c) { hud.toast(who() + tt('amoeba.toasts.noPrey')); return; }
  if (c.cup.wrap < CUP_WRAP) {
    hud.toast(who() + tt('amoeba.toasts.notEnclosed', { deg: Math.round((c.cup.wrap * 180) / Math.PI), need: Math.round((CUP_WRAP * 180) / Math.PI) }));
    return;
  }
  C.closing = { prey: c.prey, t: 0, low: 0 };
  audio.play('amoeba/engulf', { volume: 0.7 });
  hud.toast(who() + tt('amoeba.toasts.closingCup', { name: c.prey.sp.name }));
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
  } else if (S.scheme === 'select') {
    // The cup's pseudopods dissolve into the vacuole; a stick still held must be let go first.
    for (const pod of body.pods) if (!pod.idle) { pod.active = false; pod.target = 0; pod.ret = 1; }
    const r = rawInput();
    R.sel = R.adj = null; R.on.sel = R.on.adj = false;
    if (r.rs.m >= STICK_OFF) R.latch.add('rs');
    if (r.ls.m >= STICK_OFF) R.latch.add('ls');
  }
  C.closing = null;
  hud.toast(who() + tt('amoeba.toasts.engulfed', { name: p.sp.name }));
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
    hud.toast(who() + tt('amoeba.toasts.letGoSwims', { name: p.sp.name }));
  } else {
    if (p) despawn(p);
    const fx = body.ux + (body.ux - body.cx) * 0.08, fy = body.uy + (body.uy - body.cy) * 0.08;
    addResidue(world, fx, fy, Math.max(14, Math.max(v.rx, v.ry) * 1.6), rand());
    if (p && S.respawn) S.pending.push({ key: keyOf(p), home: p.home, t: 6 });
    hud.toast(who() + tt('amoeba.toasts.egested'));
  }
  use(k);
}

function egest() {
  const v = cyto.vacuoles.filter((x) => !x.egest).sort((a, b) => b.digest - a.digest || b.age - a.age)[0];
  if (!v) { hud.toast(who() + tt('amoeba.toasts.nothingToLetGo')); return; }
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

const tmp = new Scratch();
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
        if (S.respawn) S.pending.push({ key: keyOf(p), home: p.home, t: 8 });
      }
      continue;
    }
    // its patch: a loose tether (it comes back once it has fled), slack while a player is in or near the patch
    if (p.home && (p.fleeT || 0) <= 0 && !p.touch) {
      const H = p.home, dx = H.x - p.x, dy = H.y - p.y;
      let slack = false;
      for (const c of cells) if (hyp(c.body.cx - H.x, c.body.cy - H.y) < H.r + c.body.req + 120) slack = true;
      if (dx * dx + dy * dy > H.r * H.r && !slack) {
        let da = Math.atan2(dy, dx) - p.th; da = Math.atan2(Math.sin(da), Math.cos(da));
        p.th += clamp(da, -1, 1) * dt * 1.5;
      }
    }
    // far from every player: it only swims (no contact or collisions)
    let awake = false;
    for (const c of cells) if (Math.abs(p.x - c.body.cx) < PREY_AWAKE && Math.abs(p.y - c.body.cy) < PREY_AWAKE) { awake = true; break; }
    if (!awake) { p.update(dt * swim); p.touch = 0; continue; }
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
        const d = hyp(qx, qy), r = cap.r + c.r;
        if (d < r && d > 1e-3) { p.x += (qx / d) * (r - d); p.y += (qy / d) * (r - d); p.avoid(0.7); }
      }
      for (const o of col.circles) {
        const qx = c.x - o.x, qy = c.y - o.y, d = hyp(qx, qy), r = o.r + c.r;
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
      if (!p.touch) { const k = cur; use(near.cell); rumble(60, 0.15, 0); use(k); if (p.home && p.home.ring !== 'start') logChallenge(p.home.ring, near.cell); }
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
    if (S.respawn && !p.home && Math.hypot(p.x - nb.cx, p.y - nb.cy) > 1500) {
      // A stray (spawned by a test) lost far behind: it turns up again round a player.
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
  if (CL.low > 0.8 || CL.t > 14) { cancelClose(tt('amoeba.toasts.slippedAway', { name: p.sp.name })); return; }
  if (!cup) return;
  body.closing = { i0: cup.i0, i1: cup.i1, mx: cup.mx, my: cup.my, px: p.x, py: p.y, run: cup.run };
  // A Paramecium caught in a closing cup fires its trichocysts.
  if (p.sp.kind === 4 && p.charges > 0 && p.cool <= 0 && cup.wrap > 2.4) {
    const n = body.nearest(p.x, p.y);
    if (p.discharge(body.x[n.i], body.y[n.i])) {
      body.blast(p.x, p.y, 140, 30);
      rumble(450, 0.9, 1);
      hud.toast(who() + (p.charges ? tt('amoeba.toasts.trichocysts') : tt('amoeba.toasts.trichocystsSpent')));
    }
  }
  if (body.grid.sample(p.x, p.y) > p.sp.W * 0.25) { capture(p, null); return; }
  if (cup.gap < 16) {
    const { inside } = body.cupContains(cup, p.x, p.y);
    if (inside) capture(p, cup);
    else cancelClose(tt('amoeba.toasts.gotOut', { name: p.sp.name }));
  }
}

// --- pinch-off ----------------------------------------------------------------
/** Cut the ring across nodes i and j: the piece with the nucleus stays the cell. */
/** A piece lost to a cut: it rounds up, darkens and breaks up (updateFragments). */
function addFragment(lost) {
  const n = lost.xs.length;
  if (n < 3 || lost.area <= 50) return;
  let cx = 0, cy = 0;
  for (let k = 0; k < n; k++) { cx += lost.xs[k]; cy += lost.ys[k]; }
  fragments.push({ xs: Float64Array.from(lost.xs), ys: Float64Array.from(lost.ys), cx: cx / n, cy: cy / n, R: Math.sqrt(lost.area / Math.PI), A: lost.area, age: 0, seed: rand(), mesh: null });
}
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
  audio.play('amoeba/pinch', { volume: 0.8 });
  hud.toast(who() + tt('amoeba.toasts.neckCut'), 2600);
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
      if (hyp(x - c.ax - ex * t, y - c.ay - ey * t) < c.r) {
        n++; stuckIdx.push(i);
        const keep = C.defend > 0.5 ? 0.55 : 0.08; // stiffened, it peels away
        if (!free) { body.x[i] = trapX[i] + (x - trapX[i]) * keep; body.y[i] = trapY[i] + (y - trapY[i]) * keep; }
        break;
      }
    }
  }
  if (n && !C.stuckN) { hud.toast(who() + tt('amoeba.toasts.caughtTrap')); rumble(250, 0.4, 0.6); audio.play('amoeba/stick', { volume: 0.7 }); }
  C.stuckN = free ? 0 : n;
  // where it is glued (up to three spots along the stuck membrane), for the stain and the tremor
  C.stuckAt.length = 0;
  if (C.stuckN) for (let k = 0; k < 3; k++) { const i = stuckIdx[Math.floor(((k + 0.5) / 3) * stuckIdx.length)]; if (i !== undefined && !C.stuckAt.includes(i)) C.stuckAt.push(i); }
  C.stuckT = C.stuckN ? C.stuckT + dt : Math.max(0, C.stuckT - dt * 2);
  if (C.stuckT > 8 && !caught.active) {
    // stuck too long: haustoria grow in where the membrane is glued (the catch sequence)
    const pts = [];
    for (let k = 0; k < 3; k++) { const i = stuckIdx[Math.floor(((k + 0.5) / 3) * stuckIdx.length)]; if (i !== undefined) pts.push({ x: body.x[i], y: body.y[i] }); }
    startCatch(pts);
  }
}

/**
 * The slide's colliders near cell c (within its grid box and a margin), so a
 * body's step tests only the few it could touch, not every one on the slide.
 */
const CHAOS_COL = { capsules: [], circles: [] }, PREY_COL = { capsules: [], circles: [] };
function nearCol(c) {
  const b = c.body, out = (c.nearCol ||= { capsules: [], circles: [] });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < N; i += 2) { const x = b.x[i], y = b.y[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  nearColliders(lastCol, x0, y0, x1, y1, 60, out);
  // Snagged: a cell whose rear has hooked round a flake or a diatom stretches
  // out thinner and thinner behind its pseudopod. Stretched past ~1.8x its
  // usual length, it flows over the small debris (as amoebae crawl over
  // detritus) until it has gathered itself up again.
  const span = Math.max(x1 - x0, y1 - y0);
  c.overSpan = span > 900 ? true : span < 700 ? false : !!c.overSpan;
  if (c.overSpan) {
    out.circles.length = 0; // flakes
    out.capsules = out.capsules.filter((k) => hyp(k.bx - k.ax, k.by - k.ay) > 160); // diatoms out; filaments and the leaf stay
  }
  return out;
}
/** The colliders round every player (the prey that are awake are all there). */
function preyCol(col) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cells) { x0 = Math.min(x0, c.body.cx); y0 = Math.min(y0, c.body.cy); x1 = Math.max(x1, c.body.cx); y1 = Math.max(y1, c.body.cy); }
  return nearColliders(col, x0, y0, x1, y1, PREY_AWAKE + 200, PREY_COL);
}
let lastCol = { capsules: [], circles: [] };
// Cells (the players and Chaos) are not each other's colliders: they step
// freely, then resolveCells() settles every touching pair as a push-pull
// struggle (contact.js).

/**
 * One fixed step of the world. granules: false skips the granule (cytoplasm)
 * update; the next step that runs it integrates the time skipped, so a frame
 * that catches up with two steps moves the granules once.
 */
function simStep(dt, granules = true) {
  const col = S.flags.obstacles ? worldColliders(world, dt) : { capsules: [], circles: [] };
  lastCol = col;
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
    if (C.defend > 0.5) { input.pods = []; input.body = null; }
    // Attack (X at a hypha): a fast pseudopod jab at the cut.
    if (C.jab && C.jab.t > 0) {
      C.jab.t -= dt;
      const dx = C.jab.x - body.cx, dy = C.jab.y - body.cy, l = Math.hypot(dx, dy) || 1;
      input.pods = input.pods.slice();
      input.pods[C.jab.k || 0] = { m: 1, dx: dx / l, dy: dy / l };
      sk = Math.max(sk, SURGE);
    }
    body.opts.boost = sk; C.surgeK = sk;
    stepCatch(dt);
    stepHarm(dt);
    if (traps.length) { trapX.set(body.x); trapY.set(body.y); }
    // Pushing a pseudopod against another cell (Chaos, a player): the cell puts its weight behind it, the body
    // flowing on after the pseudopod, so a held push keeps driving the tip in (a channel into Chaos) or shoves
    if (c.touchT > 0 && !(input.body && input.body.m > 0.3) && input.pods) {
      let best = null;
      for (const q of input.pods) if (q && q.m > 0.5 && (!best || q.m > best.m)) best = q;
      if (best) input.body = { m: 0.6 * best.m, dx: best.dx, dy: best.dy };
    }
    // contact inhibition: pseudopods that touch another cell are drawn back, so its idle ones go quiet while it is held
    body.opts.idlePods = !(c.touchT > 0);
    body.step(adt, input, nearCol(c));
    // how hard it pushes where it meets another cell (contact.js): the surge shoves, spreading out (LT) gives way, stiffening (B) holds
    body.pushK = sk * (1 - 0.6 * body.spread) * (C.defend > 0.5 ? 1.25 : 1);
    if (body.turned) cyto.rotateAbout(body.cx, body.cy, body.turned); // the contents turn with the cell
    if (traps.length) stickToTraps(dt, traps);
    body.grid.build(body.x, body.y, N);
    updateCup(adt);
  }
  use(cells[0]);
  stepChaos(dt, adt, chaos.on ? nearColliders(col, chaos.body.cx, chaos.body.cy, chaos.body.cx, chaos.body.cy, 900, CHAOS_COL) : col, granules);
  stepPrey(dt, preyCol(col));
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
    // Optional parts of the cytoplasm simulation (granules on the frame's last step).
    C.gAcc = (C.gAcc || 0) + adt;
    if (!granules) continue;
    const saved = body.pods.map((p) => p.s);
    if (!S.streaming) for (const p of body.pods) p.s = 0;
    const cvT = cyto.cv.t;
    cyto.brownian = S.brownian;
    cyto.update(Math.min(C.gAcc, 4 / 60 * S.amoebaK), body, S.time);
    C.gAcc = 0;
    if (!S.cv) { cyto.cv.t = cvT; cyto.cv.r = Math.max(cyto.cv.r, 6); cyto.cv.systole = 0; }
    body.pods.forEach((p, k) => { p.s = saved[k]; });
  }
  use(cells[0]);
  // cells meeting cells, last, after prey and untangling have moved membrane: nothing undoes it before the frame is drawn
  resolveCells(dt);
  updateFragments(dt);
  if (preyFlowOn) preyFlow(dt * S.swimK);
  for (const q of ambient) { q.update(dt * S.swimK); if (Math.hypot(q.x - S.camX, q.y - S.camY) > 1400) { q.x = S.camX - Math.cos(q.th) * 1100; q.y = S.camY - Math.sin(q.th) * 1100; } }
  stepBeacon(dt);
  for (const pe of S.pending) pe.t -= dt;
  for (const pe of S.pending.filter((x) => x.t <= 0)) {
    // an eaten prey comes back to its patch, swimming in from out of view (or round a player, with no patch)
    if (pe.home) { if (!spawnIn(pe.home, pe.key, false)) { pe.t = 2; continue; } }
    else { use(cells[(rand() * cells.length) | 0]); spawn(pe.key, 750, 1000); use(cells[0]); }
    pe.t = -1e9;
  }
  S.pending = S.pending.filter((x) => x.t > -1e8);
  // the director once a frame (on its last step, with the frame's time): its views are the frame's
  dirDt += dt;
  if (granules) { stepDirector(dirDt); dirDt = 0; }
  checkLandmarks();
  S.time += dt;
}

// --- the boss ---------------------------------------------------------------------
function stepChaos(dt, adt, col, granules = true) {
  if (!chaos.on) return;
  const ps = cells.map((c) => ({ cell: c, body: c.body, x: c.body.cx, y: c.body.cy, req: c.body.req, active: !c.caught.active && !c.p.waiting }));
  const ev = chaos.update(dt, adt, ps, col, { calm: chaos.resting || S.passive, granules });
  for (const { e, p: pl } of ev) {
    const c = pl ? pl.cell : null, k = cur;
    if (c) use(c);
    if (e === 'wake') { audio.play('amoeba/chaos', { volume: 0.8 }); hud.toast(tt('amoeba.toasts.chaosStirs'), 2800); logChallenge('chaos', c); }
    else if (e === 'windupCup') { audio.play('amoeba/chaos-windup', { volume: 0.6 }); hud.toast(tt('amoeba.toasts.chaosCups', { who: who() }), 3000); rumble(150, 0.3, 0); }
    else if (e === 'ring' && c) { audio.play('shared/danger', { volume: 0.7 }); hud.toast(tt('amoeba.toasts.chaosRing', { who: who() }), 2800); rumble(200, 0.4, 0.2); }
    else if (e === 'closing' && c) { audio.play('shared/danger', { volume: 1, rate: 1.15 }); audio.play('amoeba/chaos-windup', { volume: 0.5, rate: 1.3 }); hud.toast(tt('amoeba.toasts.chaosShut', { who: who() }), 2400); rumble(400, 0.7, 0.6); }
    else if (e === 'broken' && c) { hud.toast(tt('amoeba.toasts.chaosBroken', { who: who() }), 2400); rumble(150, 0.3, 0.3); }
    else if (e === 'windupLunge') { audio.play('amoeba/chaos-windup', { volume: 0.6, rate: 1.1 }); hud.toast(tt('amoeba.toasts.chaosLunges', { who: who() }), 2400); rumble(150, 0.3, 0); }
    else if (e === 'engulf' && c) startEngulf(c);
    else if (e === 'retreat') { audio.play('shared/foe-flees', { volume: 0.7 }); hud.toast(tt('amoeba.toasts.chaosGone'), 3000); }
    else if (e === 'leash') hud.toast(tt('amoeba.toasts.chaosReturns'), 2800);
    use(k);
  }
  // engulfed: carried along inside it
  for (const c of cells) {
    if (!(c.caught.active && c.FC.by === 'chaos')) continue;
    const dx = chaos.body.cx - (c.lastChaos ? c.lastChaos.x : chaos.body.cx), dy = chaos.body.cy - (c.lastChaos ? c.lastChaos.y : chaos.body.cy);
    c.lastChaos = { x: chaos.body.cx, y: chaos.body.cy };
    moveCell(c, dx, dy);
  }
}
/** Translate a player's whole cell (membrane, granules, organelles, vacuoles). */
function moveCell(c, dx, dy) {
  if (!dx && !dy) return;
  const b = c.body, y = c.cyto;
  for (let i = 0; i < N; i++) { b.x[i] += dx; b.y[i] += dy; b.sx[i] += dx; b.sy[i] += dy; }
  b.centroid(); b.ux += dx; b.uy += dy;
  for (let i = 0; i < y.n; i++) { y.px[i] += dx; y.py[i] += dy; }
  y.nucleus.x += dx; y.nucleus.y += dy; y.cv.x += dx; y.cv.y += dy;
  for (const v of y.vacuoles) { v.x += dx; v.y += dy; }
  b.grid.build(b.x, b.y, N);
}
/**
 * Every touching pair of cells (each player and Chaos, and players with each
 * other) settled as a push-pull struggle (contact.js resolvePair): the
 * membranes press against each other and dent, the stronger push wins ground,
 * a share of it shoving the weaker cell as a whole. Never an overlap. A cell
 * being engulfed by Chaos, waiting to join or dissolving is out of it.
 * touchT: how recently a player touched another cell (contact inhibition).
 */
const CONTACT_OUT = { shiftA: { x: 0, y: 0 }, shiftB: { x: 0, y: 0 } };
const contactLog = { pairs: 0, depth: 0 };
function resolveCells(dt) {
  const live = cells.filter((c) => !c.p.waiting && !(c.caught.active && (c.FC.by === 'chaos' || DYING.includes(c.FC.phase))));
  for (const c of cells) c.touchT = Math.max(0, (c.touchT || 0) - dt);
  contactLog.pairs = 0; contactLog.depth = 0;
  const moved = new Set();
  let rnd = 0;
  const settle = (A, B, onA, onB) => {
    for (let it = 0; it < 6; it++) {
      const r = resolvePair(A, B, CONTACT_OUT);
      if (!r) return it > 0;
      if (!it && !rnd) { contactLog.pairs++; contactLog.depth = Math.max(contactLog.depth, r.depth); }
      onA(r.shiftA.x, r.shiftA.y); onB(r.shiftB.x, r.shiftB.y);
    }
    return true;
  };
  // three rounds: a correction that made a ring cross itself is undone by untangle(), so the pairs are settled again after it
  for (let round = 0; round < 3; round++) {
    rnd = round;
    if (chaos.on) {
      const cb = chaos.body;
      for (const c of live) {
        const b = c.body;
        if (Math.hypot(b.cx - cb.cx, b.cy - cb.cy) > cb.req * 2.6 + b.req + 200) continue;
        if (settle(b, cb, (x, y) => moveCell(c, x, y), (x, y) => chaos.translate(x, y))) { c.touchT = 0.6; moved.add(c); moved.add(chaos); }
      }
    }
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      if (Math.hypot(a.body.cx - b.body.cx, a.body.cy - b.body.cy) > a.body.req + b.body.req + 700) continue;
      if (settle(a.body, b.body, (x, y) => moveCell(a, x, y), (x, y) => moveCell(b, x, y))) { moved.add(a); moved.add(b); }
    }
    for (const o of moved) {
      const b = o === chaos ? chaos.body : o.body;
      b.untangle(); b.centroid();
    }
  }
  for (const o of moved) { const b = o === chaos ? chaos.body : o.body; b.grid.build(b.x, b.y, N); }
  // a ring closing round you holds your pseudopods in too
  if (chaos.closing && chaos.ringOf && chaos.ringOf.cell) chaos.ringOf.cell.touchT = Math.max(chaos.ringOf.cell.touchT || 0, 0.3);
}
/** Chaos's cup closed round cell c: engulfed (strike, hold, eat, follow, fade, respawn). */
function startEngulf(c) {
  const k = cur;
  use(c);
  if (C.closing) cancelClose();
  FC.by = 'chaos'; FC.phase = 'strike'; FC.A0 = body.A0; FC.pts = [{ x: chaos.body.cx, y: chaos.body.cy }];
  c.lastChaos = { x: chaos.body.cx, y: chaos.body.cy };
  caught.start({ by: tt('amoeba.capture.chaos'), phases: CATCH_PHASES });
  embed.captured({ by: 'Chaos', player: c.slot });
  audio.play('amoeba/chaos-engulf', { volume: 0.55, old: ['amoeba/engulf', { volume: 1, rate: 0.55 }] });
  rumble(500, 0.8, 0.9);
  use(k);
}
/** X with your membrane round the neck of one of Chaos's arms: pinch it off. Returns true if it cut. */
function pinchChaos(c, reach = 70) {
  if (!chaos.on || !chaos.awake) return false;
  const pin = chaos.pincer(c.body, reach);
  if (!pin) return false;
  const { lost, gone } = chaos.cut(pin.i, pin.j);
  addFragment(lost);
  const b = chaos.body;
  C.jab = { t: 0.35, x: (b.x[pin.i] + b.x[pin.j]) / 2, y: (b.y[pin.i] + b.y[pin.j]) / 2, k: jabSlot() };
  audio.play('amoeba/pinch', { volume: 0.9, old: ['amoeba/engulf', { volume: 1, rate: 1.4 }] });
  rumble(350, 0.7, 0.6);
  hud.toast(gone ? tt('amoeba.toasts.pinchedGone', { who: who() }) : tt('amoeba.toasts.pinched', { who: who() }), 2400);
  return true;
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
    R: newRoles(), trapX: new Float64Array(N), trapY: new Float64Array(N),
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
  // Not a perfect disc: start from a settled teammate's shape (turned, scaled to
  // this cell's area), or warm up as a resting, polypodial cell over the next
  // few frames (stepWarmups), so a join costs no long frame.
  const src = cells.find((o) => o !== c && o.body && o.cyto && !o.warm && !o.caught.active);
  c.warm = 0;
  if (src) copySettled(c, src, x, y);
  else c.warm = 90;
  c.body.grid.build(c.body.x, c.body.y, N);
  c.s.A0init = c.body.A0;
  if (c.layer) view.rebindCell(c.layer, c.body, c.cyto); else c.layer = view.addCell(c.body, c.cyto);
}

/** Cell c takes settled cell src's outline and contents, turned and centred at (x, y). */
function copySettled(c, src, x, y) {
  const a = src.body, b = c.body, ya = src.cyto, yb = c.cyto;
  const k = Math.sqrt(b.A0 / Math.max(1, Math.abs(a.area) * a.flat));
  const th = c.slot * 2.1 + 0.9, cs = Math.cos(th) * k, sn = Math.sin(th) * k;
  const tx = (px, py) => x + (px - a.cx) * cs - (py - a.cy) * sn;
  const ty = (px, py) => y + (px - a.cx) * sn + (py - a.cy) * cs;
  for (let i = 0; i < N; i++) { const px = a.x[i], py = a.y[i]; b.x[i] = tx(px, py); b.y[i] = ty(px, py); }
  b.centroid();
  b.ux = tx(a.ux, a.uy); b.uy = ty(a.ux, a.uy);
  for (let i = 0; i < yb.n; i++) { const j = i % ya.n; const px = ya.px[j], py = ya.py[j]; yb.px[i] = tx(px, py); yb.py[i] = ty(px, py); }
  for (const key of ['nucleus', 'cv']) { const o = ya[key]; const ox = o.x, oy = o.y; yb[key].x = tx(ox, oy); yb[key].y = ty(ox, oy); }
}
/** Spread a new cell's warm-up (90 resting steps of its soft body) over the frames after it appears. */
const WARM_IDLE = { pods: [], push: 0, spread: 0, body: null };
const NO_COLLIDE = { capsules: [], circles: [] };
function stepWarmups() {
  for (const c of cells) {
    if (!c.warm) continue;
    const n = Math.min(c.warm, 15);
    for (let i = 0; i < n; i++) c.body.step(1 / 60, WARM_IDLE, NO_COLLIDE);
    c.warm -= n;
    c.body.grid.build(c.body.x, c.body.y, N);
  }
}

function removeCell(slot) {
  const i = cells.findIndex((c) => c.slot === slot);
  if (i <= 0) return; // player 1 always stays
  const c = cells[i];
  for (const v of c.cyto.vacuoles) if (v.prey) despawn(v.prey);
  for (const h of c.haustoria) { h.hidden = true; h.grow = 0; }
  c.caught.reset(false);
  if (c.drainSnd) { c.drainSnd.stop(); c.drainSnd = null; }

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
  Object.assign(c.R, newRoles());
  makeBody(c, x, y);
  use(c);
  const m = cells.find((o) => o !== c);
  hud.toast(m ? tt('amoeba.toasts.backBeside', { name: c.p.name, mate: m.p.name }) : tt('amoeba.toasts.back', { name: c.p.name }), 1800);
}

/**
 * Telling players apart: each player's amoeba has its own shade of endoplasm
 * and of its food vacuoles, as extra optical density (absorbed red, green,
 * blue). Player 1 is today's cell; then a cool grey-green, a rosier and a
 * bluish cell, keyed to the player colours (teal, rose, blue). Readable in
 * brightfield, plausible (stored food and digesting prey colour real amoebae),
 * but a labelled departure: real strains are not colour-coded. The faint
 * multiplayer tint stays.
 */
const VARIETIES = [
  { endo: [0, 0, 0], vac: [0, 0, 0] },
  { endo: [0.13, 0.03, 0.1], vac: [0.18, 0.02, 0.15] },
  { endo: [0, 0.13, 0.06], vac: [0, 0.2, 0.08] },
  { endo: [0.14, 0.08, 0], vac: [0.2, 0.11, 0] },
];

function retint() {
  for (const c of cells) {
    view.setTint(c.layer, c.p.color, cells.length > 1 ? 0.1 : 0);
    const v = VARIETIES[c.slot % VARIETIES.length];
    view.setVariety(c.layer, v.endo, v.vac);
  }
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

// --- landmarks: the portal (the way on) and the backdoor ----------------------------
// The portal: a green Paramecium bursaria (Chlorella symbionts) swimming low
// over the slide at the opening toward open water, in the shared golden glow
// (shared/portal.js, no text). It is the director's last entry (below): placed
// once every encounter before it is met, in glass nobody has seen, a short way
// ahead of whoever leads; Chaos lies on its post beside it. The portal opens
// once its encounters are met, and never waits on Chaos (the owner,
// 2026-11-02: "you should be able to reach the portal even if you haven't
// defeated the boss, just pushing him away or sneaking to it should be
// sufficient"): slip past it while it is slow to notice you, or push it
// aside. On the portal itself it blocks only with its body (cells never
// overlap). You are at the portal when any part of your cell (outline or
// pseudopod) is within PORTAL.R of it, not only your centre. It is never an
// automatic door (the owner, 2026-11-01): at the open portal the game shows
// "Y Enter the portal" (embed.near('portal')), and Y (R) goes through:
// enterPortal (the one place the zoom on is triggered). Sealed, it says why
// (a toast as you arrive, and the warning line while you stay on it).
// Backdoor: a Sphagnum leaf tip dipping into the pool, ~2.3 mm to the left
// (world.js LEAF), with the water film's edge round it: dwelling there, Y goes
// back up to the tardigrade.
const BACK_LABEL = tt('amoeba.prompts.back');
// R: any part of a cell within this of the portal's centre is at the portal (the glow, and the bursaria circling in it)
const PORTAL = { placed: false, found: false, x: 0, y: 0, a: 0, R: 120, reach: 120 };
const beacon = makePrey('bursaria', 0, -1e6, 0.6, rng(29));
const leaf = world.leaf;
const lm = { fwdLatch: false, near: false, nearFwd: false, portal: false, log: [], hinted: false, sealedAt: false };
// When each encounter was first met (for tests and tuning): t is seconds since the start, d µm from it.
const challengeLog = {};
function logChallenge(kind, c) {
  if (challengeLog[kind] || !c) return;
  challengeLog[kind] = { t: +(S.time - pacing.t0).toFixed(2), d: Math.round(distFromStart(c.body.cx, c.body.cy)), slot: c.slot };
}
function stepBeacon(dt) {
  const b = beacon;
  if (!PORTAL.placed) return;
  // it wanders in a small loose circle round the portal, low over the slide
  const dx = PORTAL.x - b.x, dy = PORTAL.y - b.y;
  if (outro) {
    // through the portal: it turns up the screen, to swim off into the pool (the next world's view is from behind it)
    let da = Math.PI / 2 - b.th; da = Math.atan2(Math.sin(da), Math.cos(da));
    b.th += clamp(da, -1, 1) * dt * 5;
  } else if (Math.hypot(dx, dy) > 70) {
    const want = Math.atan2(dy, dx);
    let da = want - b.th; da = Math.atan2(Math.sin(da), Math.cos(da));
    b.th += clamp(da, -1, 1) * dt * 1.6;
  }
  b.state = 'swim';
  b.update(dt * Math.min(S.swimK, 1) * 0.45);
}
/** Is Chaos's body over the portal's centre right now (blocking it physically)? Information only: no rule waits on it. */
function blocked() {
  return PORTAL.placed && chaos.on && chaos.body.grid.sample(PORTAL.x, PORTAL.y) > 0;
}
/** Is any part of cell c (outline or pseudopod) within PORTAL.R of the portal, or over it? */
function atPortal(c) {
  const b = c.body;
  if (Math.hypot(b.cx - PORTAL.x, b.cy - PORTAL.y) > b.req * 3 + PORTAL.R) return false; // its outline cannot reach that far
  // a pseudopod forced into a channel through Chaos counts too: it is part of the cell
  return reaches(b, PORTAL.x, PORTAL.y, PORTAL.R);
}
/** Why the way on is still sealed: the next encounter's text key. */
const sealedWhy = () => (ENCOUNTERS[director.index] && ENCOUNTERS[director.index].id === 'caudatum' ? 'amoeba.toasts.sealedCaudatum' : 'amoeba.toasts.sealed');
/** Put the portal at (x, y), met coming along bearing a (from whoever leads), with Chaos on its post beside it. */
function placePortal(x, y, a) {
  Object.assign(PORTAL, { placed: true, found: false, x, y, a });
  beacon.x = x + 40; beacon.y = y; beacon.th = a + Math.PI / 2;
  glow.setPosition(x, y, 0);
  glow.group.visible = true;
  // its rest when beaten: off to one side of the portal and a little beyond it, clear of the leaf and the traps
  const ux = Math.cos(a), uy = Math.sin(a);
  const side = [900, -900, 1400, -1400].map((k) => [x + ux * 250 - uy * k, y + uy * 250 + ux * k]).find(([rx, ry]) => leafDist(rx, ry) > LEAF.W / 2 + 500 && clearAt(rx, ry, 200)) || [x + ux * 900, y + uy * 900];
  chaos.on = true;
  chaos.setPost(...portalParts(x, y, a).chaos, { x: side[0], y: side[1] });
  lm.hinted = false;
}

// ---------------------------------------------------------------- the encounters, placed as you go
// The director (shared/director.js; design/encounter-pattern.md "Placed as
// you go") places the encounters one at a time, in this order (world.js
// ENCOUNTERS), in glass nobody has seen, a little ahead of whoever is furthest
// along (or, if they linger, round them): a patch of fleeing ciliates, a patch
// with Paramecium caudatum, then Chaos on guard at the portal. Each comes only
// after the one before was met and a calm break has passed; nothing a player
// has seen is ever placed, moved or removed. Easy prey and the fungal traps
// are scenery (world.js), anywhere.
const encPatches = [];
/** The encounter patch for entry `id` at (x, y): prey of its kinds, inside it (it is out of everyone's view). */
function placePatch(id, x, y) {
  let P = encPatches.find((q) => q.ring === id);
  const kinds = id === 'caudatum' ? ['paramecium', 'paramecium', ...CILIATES] : [...CILIATES, ...CILIATES, 'tetrahymena'];
  if (P) {
    // moved (still unseen): its prey go with it
    for (const p of prey) if (p.home === P && !p.captured) { p.x += x - P.x; p.y += y - P.y; }
    Object.assign(P, { x, y });
    return P;
  }
  P = { ring: id, x, y, r: PATCH.ciliates.r, kinds, placedT: S.time };
  encPatches.push(P);
  for (const key of kinds) spawnIn(P, key, true);
  return P;
}
const ENC = {
  ciliates: { place: (x, y) => placePatch('ciliates', x, y),
    // in or beside the patch (the cell's edge within ~120 µm of it: its prey all round you)
    met: (P, [q]) => hyp(q.x - P.x, q.z - P.y) < P.r + q.req + 120 },
  caudatum: { place: (x, y) => placePatch('caudatum', x, y), met: (P, [q]) => hyp(q.x - P.x, q.z - P.y) < P.r + q.req + 120 },
  // the last: entering the open portal ends the level
  portal: { place: (x, y, b) => { placePortal(x, y, b); return PORTAL; }, met: () => false },
};
// The default path (world.js DEFAULT_PATH): all three laid out along one bearing on the director's first
// update, so the way on exists from the start (sealed until both patches are met: portalSealed); head off
// another way and each, while nobody has seen it, leaves the path and is placed ahead of you as before (one
// thing each, a patch moved whole or the portal: single).
const director = createDirector({ ...DIRECTOR, canPlace, defaultPath: DEFAULT_PATH, entries: ENCOUNTERS.map((e) => ({ ...e, ...ENC[e.id], single: true })) });
const PORTAL_INDEX = ENCOUNTERS.findIndex((e) => e.final);
/** The way on exists from the start but stays shut until every earlier encounter is met (the director's order). */
function portalSealed() { return director.index < PORTAL_INDEX; }
// What every view sees: the screen's rectangle round each split view's centre
// (the whole screen: conservative for a split view), at the objective and
// pull-back in use; and, when the camera lags a cell (advance() steps without
// moving it), the rectangle round that cell too.
const dirViews = Array.from({ length: 8 }, () => ({ frustum: [[1, 0, 0, 0], [-1, 0, 0, 0], [0, 0, 1, 0], [0, 0, -1, 0]], focus: { x: 0, y: 0, z: 0 } }));
function rectView(v, cx, cy, hw, hh) {
  v.frustum[0][3] = -(cx - hw); v.frustum[1][3] = cx + hw; v.frustum[2][3] = -(cy - hh); v.frustum[3][3] = cy + hh;
  v.focus.x = cx; v.focus.z = cy;
  return v;
}
function directorViews() {
  const hw = (OBJECTIVES[S.objective].field * (innerWidth > innerHeight ? 1 : 0.6) * Math.max(1, pull.k) * selZoom.k * groupZoom.applied) / 2, hh = hw * (innerHeight / Math.max(1, innerWidth));
  const list = [];
  const L = split.layout, views = L && L.views.length ? L.views : [{ offset: { x: 0, y: 0 } }];
  for (const v of views) { const o = v.offset || { x: 0, y: 0 }; if (list.length < 4) list.push(rectView(dirViews[list.length], S.camX + (o.x || 0), S.camY + (o.y || 0), hw, hh)); }
  for (const c of cells) {
    if (list.length >= dirViews.length) break;
    if (list.some((v) => Math.abs(c.body.cx - v.focus.x) < hw * 0.6 && Math.abs(c.body.cy - v.focus.z) < hh * 0.6)) continue;
    list.push(rectView(dirViews[list.length], c.body.cx, c.body.cy, hw, hh));
  }
  return list;
}
/** The director's players: each live cell's centre (director x, z = slide x, y) and its radius. */
const dirPlayers = () => cells.filter((c) => !c.p.waiting).map((c) => ({ id: c.slot, x: c.body.cx, z: c.body.cy, req: c.body.req, alive: !c.caught.active }));
let directorOn = false, dirDt = 0;
function stepDirector(dt) {
  if (!directorOn || outro) return;
  const ev = director.update(dt, dirPlayers(), directorViews());
  for (const e of ev) {
    const c = cells.find((q) => q.slot === (e.by && e.by[0])) || cells[0];
    if (e.type === 'placed') logChallenge(`${e.id}Placed`, c);
    if (e.type === 'met') logChallenge(`${e.id}Met`, c);
  }
  driftPatch(dt);
}
/**
 * A patch placed beyond a lingering player's reach swims over to them: its
 * centre (and so its prey, tethered to it) drifts toward the leader at
 * PATCH_DRIFT µm/s until they meet it. Behaviour, not a placement.
 */
const PATCH_DRIFT = 30;
function driftPatch(dt) {
  const i = director.index, e = ENCOUNTERS[i];
  if (!e || e.final) return;
  const S0 = director.entry(e.id);
  if (!S0 || S0.state !== 'placed' || !S0.handle) return;
  const lead = director.leader, c = lead && cells.find((q) => q.slot === lead.id);
  const P = S0.handle;
  if (!c || lead.moving || S.time - P.placedT < 5) return;
  const dx = c.body.cx - P.x, dy = c.body.cy - P.y, d = hyp(dx, dy);
  if (d < P.r + c.body.req + 60) return;
  const k = Math.min(d, PATCH_DRIFT * dt) / d;
  P.x += dx * k; P.y += dy * k;
}
/** Where each player stands with respect to the landmarks; posts them. */
function checkLandmarks() {
  // the way on unseals (both patches met): heard once, on the edge
  const isSealed = portalSealed();
  if (lm.wasSealed && !isSealed) audio.play('shared/portal-appear', { volume: 0.8 });
  lm.wasSealed = isSealed;
  let near = false, nearFwd = false, dmin = Infinity;
  for (const c of cells) {
    const b = c.body;
    c.atBack = !c.caught.active && (Math.hypot(b.cx - BACK_TIP.x, b.cy - BACK_TIP.y) < b.req + 260 || b.nearest(BACK_TIP.x, BACK_TIP.y).d < 90);
    if (c.atBack) near = true;
    c.atFwd = false;
    if (!PORTAL.placed || c.caught.active) continue;
    const d = Math.hypot(b.cx - PORTAL.x, b.cy - PORTAL.y);
    dmin = Math.min(dmin, d);
    c.atFwd = atPortal(c);
    if (!PORTAL.found && !unseen(PORTAL.x, PORTAL.y, -60)) { PORTAL.found = true; lm.log.push({ type: 'found', slot: c.slot }); logChallenge('portalFound', c); }
  }
  if (PORTAL.placed) {
    // nearing the open way on: the shell starts loading the next world (no prompt is shown)
    nearFwd = !portalSealed() && dmin < 1200;
    // re-sent every ~1.2 s while near, so a shell busy with a fade can't miss it (the next world must preload)
    lm.nearT = (lm.nearT || 0) + 1 / 60;
    if (nearFwd !== lm.nearFwd || (nearFwd && lm.nearT > 1.2)) { lm.nearFwd = nearFwd; lm.nearT = 0; embed.near('forward', nearFwd); }
    if (!lm.hinted && dmin < 1000 && chaos.on && !chaos.beaten) { lm.hinted = true; hud.toast(tt('amoeba.toasts.bossHint'), 4200); }
  }
  const fwd = cells.find((c) => c.atFwd);
  if (fwd && !lm.fwdLatch) {
    lm.fwdLatch = true;
    if (portalSealed()) {
      // the way on exists from the start (the default path) but opens only once both patches are met: it says which is left
      lm.log.push({ type: 'sealed', slot: fwd.slot, t: +S.time.toFixed(2) });
      audio.play('shared/portal-sealed', { volume: 0.6 });
      hud.toast(tt(sealedWhy(), { who: who(fwd) }), 3200);
    }
  }
  if (!cells.some((c) => c.atFwd || (PORTAL.placed && Math.hypot(c.body.cx - PORTAL.x, c.body.cy - PORTAL.y) < c.body.req + PORTAL.R + 150))) lm.fwdLatch = false;
  // sealed and someone on it: the warning line says why for as long as they stay
  lm.sealedAt = !!fwd && portalSealed();
  // anyone at the open portal: "Y Enter the portal"; their Y goes through (the input loop: atOpenPortal)
  setPortalPrompt(!!fwd && !outro && !portalSealed());
  setNear(near);
}
/** Can cell c go through now (at the open portal)? Then its Y enters. */
const atOpenPortal = (c) => PORTAL.placed && !outro && c.atFwd && !c.caught.active && !portalSealed();
/** The portal's Y prompt: on while anyone is at the open portal (the shell, or standalone embed.js, shows it). */
function setPortalPrompt(on) {
  if (on === lm.portal) return;
  lm.portal = on;
  if (on) audio.play('shared/portal-near', { volume: 0.6 });
  embed.near('portal', on);
}
/**
 * The way on: player c is at the open portal and pressed Y. This is the one place the
 * zoom into the next world is triggered (embed.landmark('forward'); the shell
 * runs the transition; standalone, embed.js shows a toast).
 */
function enterPortal(c) {
  if (outro) return;
  lm.fwdLatch = true;
  setPortalPrompt(false);
  lm.entered = true;
  lm.log.push({ type: 'landmark', kind: 'forward', slot: c.slot, t: +S.time.toFixed(2) });
  logChallenge('portal', c);
  glow.burst();
  const [sx, sy] = toScreen(PORTAL.x, PORTAL.y, c.slot);
  portalLight.bloom(sx, sy, { scale: 1.1 });
  audio.play('shared/portal-enter', { volume: 0.8 });
  audio.play('shared/portal-chime', { volume: 0.9 });
  audio.play('shared/slowdown', { volume: 0.5, delay: OUTRO.beat });

  const k = cur; use(c); rumble(520, 0.55, 0.85); use(k);
  if (!embed.active) hud.toast(tt('amoeba.toasts.bursaria', { who: who(c) }), 2600);
  startOutro(c);
  embed.landmark('forward', { player: c.slot, outro: embed.active });
}

// --- the outro (success, slow-down, freeze; embed.js "Continuous transitions") ----------
// Through the portal: the golden burst, bloom, chime and rumble above, then the
// world's time eases to a stop over ~1 s while it keeps rendering (the freeze
// frame), the P. bursaria turning up the screen to swim off into the pool as it
// slows. Frozen, it reports how the bursaria is framed (embed.frozen): it is
// the next world's creature, so the shell pushes in on it while the
// Paramecium's world fades in under the same framing (embed.on('camera')
// below drives this view's centre and field). All in frame time, so a slow
// machine plays it slower rather than skipping it. Standalone (or a shell that
// never answers) the freeze holds a moment and time comes back.
const OUTRO = { beat: 0.3, ease: 1.0, hold: 1.4, back: 0.6, giveUp: 8, rate: 1 }; // rate: tests slow it down
let outro = null;
const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// a 2D microscope view seen as a pose: looking straight down (pitch just short
// of vertical), the screen's up the slide's +y. `rel` is the camera's azimuth
// round the creature minus its heading in embed.js's three.js convention
// (azimuth atan2(z, x), the slide's +y as −z), so a 3D world turning to this
// pose shows the creature at the same angle on screen.
const TOP_PITCH = 1.55;
/** The pose of a creature at (x, y) µm, heading th, length len, in the view just drawn. */
function pose2D(x, y, th, len) {
  const [l, b, w, h] = view.view;
  return { f: len / w, x: (x - (l + w / 2)) / (w / 2), y: (y - (b + h / 2)) / (h / 2), pitch: TOP_PITCH, rel: Math.atan2(Math.sin(th + Math.PI / 2), Math.cos(th + Math.PI / 2)) };
}
const beaconLen = () => beacon.sp.L * (beacon.sc || 1);
function startOutro(c) {
  outro = { t: 0, scale: 1, frozenAt: null, cam: null, heard: false, slot: c.slot };
  // the chrome goes, the bloom stays (cinematic(false) restores both)
  if (embed.active) { embed.cinematic(true, canvas); portalLight.canvas.style.visibility = 'visible'; }
}
/** Advance the outro by dt (frame time); returns the time scale for the world. */
function stepOutro(dt) {
  const o = outro;
  o.t += dt * OUTRO.rate;
  o.scale = 1 - smooth01(OUTRO.beat, OUTRO.beat + OUTRO.ease, o.t);
  if (o.scale <= 0 && o.frozenAt === null) {
    o.frozenAt = o.t;
    if (embed.active) embed.frozen(pose2D(beacon.x, beacon.y, beacon.heading, beaconLen()));
  }
  if (o.frozenAt !== null) {
    const held = o.t - o.frozenAt;
    const back = !embed.active ? held - OUTRO.hold : !o.heard && held > OUTRO.giveUp ? held - OUTRO.giveUp : -1;
    if (back >= 0) {
      o.scale = smooth01(0, OUTRO.back, back);
      if (back >= OUTRO.back) endOutro();
    }
  }
  return outro ? outro.scale : 1;
}
function endOutro() {
  outro = null;
  if (embed.active) embed.cinematic(false, canvas);
}
// the shell drives the view from the freeze frame into the Paramecium's world
embed.on('camera', (d) => { if (outro && d.pose) { outro.cam = d.pose; outro.heard = true; } });
embed.on('pause', () => { if (outro) outro.heard = true; });
/** The view for a pose from the shell: centre and field width that frame the bursaria as the pose says. */
function poseView(pose) {
  const w = beaconLen() / Math.max(1e-6, pose.f), h = w * (view.bh / view.bw);
  return { x: beacon.x - pose.x * (w / 2), y: beacon.y - pose.y * (h / 2), w };
}

// --- the intro (continuous transitions; embed.js) -----------------------------
// In the game this world is the far end of the continuous transition from the
// tardigrade: its freeze frame holds an Amoeba proteus on the pool floor past
// the rim leaf's tip, seen from straight above and turned the way this cell
// faces, and this world fades in under the same framing, the cell where that
// glimpse was (the same size: a change of light, DIC to brightfield, more
// than of scale). On `hold` it stays frozen at its start but renders, the
// view centred on the cell, and reports how its opening view frames it
// (embed.opening); while held it takes the shell's `camera` poses (the view's
// centre and field from each), ending exactly on the opening view; on `begin`
// its time eases back in over INTRO_EASE s.
embed.provide('intro');
const INTRO_EASE = 0.6;
let intro = null; // { cam } while held; { ease } while time comes back
/** The cell's length in a pose (µm): the disc of its starting area, 2 √(A0/π) (344 µm; the tardigrade's glimpse is the same). */
const cellLen = () => 2 * Math.sqrt(body.A0 / Math.PI);
// (the cell is round as it opens, its front noise: poses give it its starting front, up the slide (Body's fy = 1), so the
// opening's rel is π, the angle the tardigrade's glimpse is turned to)
const cellHeading = () => Math.PI / 2;
const introHeld = () => embed.held || !!(intro && !('ease' in intro));
/** The opening view's field (µm across): the objective's, as play starts. */
const baseField = () => OBJECTIVES[S.objective].field * (innerWidth > innerHeight ? 1 : 0.6);
/** While held: the view's centre and field, from the shell's pose (or the opening view: centred on the cell). */
function introView() {
  const pose = intro && intro.cam;
  if (!pose) return { x: body.cx, y: body.cy, w: baseField() };
  const w = cellLen() / Math.max(1e-6, pose.f), h = w * (view.bh / view.bw);
  return { x: body.cx - pose.x * (w / 2), y: body.cy - pose.y * (h / 2), w };
}
embed.on('hold', () => {
  intro = { cam: null };
  S.camX = body.cx; S.camY = body.cy;
  embed.cinematic(true, canvas);
  embed.opening({ f: cellLen() / baseField(), x: 0, y: 0, pitch: TOP_PITCH, rel: Math.atan2(Math.sin(cellHeading() + Math.PI / 2), Math.cos(cellHeading() + Math.PI / 2)) });
});
embed.on('camera', (d) => { if (intro && !('ease' in intro) && d.pose) intro.cam = d.pose; });
embed.on('begin', () => { embed.cinematic(false, canvas); intro = { ease: 0 }; });
/** After the transition: time eases back in (the world's time scale, 0..1). */
function introEase(dt) {
  if (!intro || !('ease' in intro)) return 1;
  intro.ease += dt;
  const k = smooth01(0, INTRO_EASE, intro.ease);
  if (intro.ease >= INTRO_EASE) intro = null;
  return k;
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
      rtx.textContent = (cells.length > 1 ? tt('amoeba.ring.namePrefix', { name: cl.p.name }) : '') + (st.closing ? tt('amoeba.ring.filling') : ready ? tt('amoeba.ring.wrappedReady', { deg }) : tt('amoeba.ring.wrapped', { deg }));
    } else {
      rt.style.display = rtx.style.display = 'none';
    }
  }
  let i = 0;
  if (S.labels) {
    const nu = cyto.nucleus;
    label(i++, nu.x, nu.y, tt('amoeba.labels.nucleus'));
    label(i++, cyto.cv.x, cyto.cv.y, tt('amoeba.labels.contractileVacuole'));
    label(i++, body.ux, body.uy, tt('amoeba.labels.uroid'));
    for (const pod of body.pods) if (pod.s > 0.2 && !pod.idle) label(i++, pod.x, pod.y, tt('amoeba.labels.hyalineCap'));
    for (const v of cyto.vacuoles) label(i++, v.x + v.rx, v.y, v.prey ? tt('amoeba.labels.foodVacuole', { name: v.prey.sp.name }) : tt('amoeba.labels.foodVacuoleResidue'));
    const gx = body.cx + (body.ux - body.cx) * 0.35, gy = body.cy + (body.uy - body.cy) * 0.35;
    label(i++, gx, gy, tt('amoeba.labels.endoplasm'));
    const e = body.nearest(body.cx + 1000 * body.fy, body.cy - 1000 * body.fx);
    label(i++, body.x[e.i], body.y[e.i], tt('amoeba.labels.ectoplasm'));
    for (const p of prey) if (!p.captured) label(i++, p.x + p.sp.L / 2, p.y, `${p.sp.name} ${p.sp.real.split(',')[0]}`);
    if (S.traps) for (const o of trapList()) if (o.grow > 0.1) label(i++, o.x, o.y, tt(o.active > 0.5 ? 'amoeba.labels.trapSticky' : 'amoeba.labels.trapDormant'));
    let k = 0;
    for (const o of world.obstacles) {
      if (o.layer !== 'focus' || k > 6) continue;
      const [sx, sy] = toScreen(o.x, o.y);
      if (sx < 0 || sy < 0 || sx > innerWidth || sy > innerHeight) continue;
      label(i++, o.x, o.y, o.type === 'spiro' ? tt('amoeba.labels.spirogyra') : o.type === 'diatom' ? tt('amoeba.labels.diatom') : o.type === 'leaf' ? tt('amoeba.labels.leafTip') : tt('amoeba.labels.detritus')); k++;
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
// The boss: the giant amoeba Chaos, on its post beside the portal. Off the slide
// (far away, not stepped) until the portal is placed (placePortal).
const chaos = new Chaos(rng(41), view, 0, -2e5);
chaos.on = false;
// The portal's golden glow (shared/portal.js), drawn over the microscope image
// (after the optics) with a camera looking down on the slide: the group is
// turned so its "up" points at the viewer, and built at unit size and scaled in
// the slide's plane only, so the glints' rise stays tiny against the camera's
// distance and pixelHeight sizes them for the orthographic view. No beam (it
// would point straight at the viewer).
const GLOW_S = 100, GLOW_D = 10; // µm per unit (the pool is 1.35 units across); camera height
const glowScene = new THREE.Scene();
const glowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
glowCam.position.z = GLOW_D;
const glow = createPortalGlow({ THREE, scene: glowScene, size: 1, height: 0.9, beam: 0, count: 96, intensity: 1.7, pixelHeight: () => (view.bh || innerHeight) * GLOW_S * GLOW_D });
glow.group.rotation.x = Math.PI / 2;
glow.group.scale.set(GLOW_S, 1, GLOW_S);
const portalLight = createPortalLight({ zIndex: 3 });
{
  // compiled now with the rest (and drawn once, off screen, for drivers that build at the first draw)
  glow.group.traverse((o) => { o.visible = true; });
  const done = () => {
    const rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }), prev = renderer.getRenderTarget(), ac = renderer.autoClear;
    try { renderer.setRenderTarget(rt); renderer.autoClear = true; renderer.render(glowScene, glowCam); } catch (e) { /* only a warm-up */ } finally {
      renderer.setRenderTarget(prev); renderer.autoClear = ac; rt.dispose();
      glow.group.visible = PORTAL.placed; glow.update(0, 0, glowCam);
    }
  };
  if (renderer.compileAsync) renderer.compileAsync(glowScene, glowCam).catch(() => {}).then(done); else { renderer.compile(glowScene, glowCam); done(); }
}
/** The glow over the view just drawn (to the screen, or a split view's target). */
function drawGlow(target) {
  if (!PORTAL.placed || !glow.group.visible) return;
  const [l, b, w, h] = view.view, m = GLOW_S * 6;
  if (PORTAL.x < l - m || PORTAL.x > l + w + m || PORTAL.y < b - m || PORTAL.y > b + h + m) return;
  const c = view.camera;
  glowCam.left = c.left; glowCam.right = c.right; glowCam.top = c.top; glowCam.bottom = c.bottom;
  glowCam.position.x = 0; glowCam.position.y = 0;
  glowCam.updateProjectionMatrix();
  const prev = renderer.getRenderTarget(), ac = renderer.autoClear;
  renderer.setRenderTarget(target);
  renderer.autoClear = false;
  renderer.render(glowScene, glowCam);
  renderer.autoClear = ac;
  renderer.setRenderTarget(prev);
}

// Warm up: a polypodial resting cell, prey scattered round it.
// (The cell it leaves is the one the tardigrade world glimpses in its pool:
// ../shared/amoeba-opening.js. Anything that changes it, regenerate that with
// node micro/prototypes/amoeba/opening.mjs; --check says whether it still matches.)
for (const P of PATCHES) for (const key of P.kinds) spawnIn(P, key, true);
ambient = [makePrey('paramecium', -500, 300, 0.4, rand), makePrey('colpidium', 400, -200, 2.4, rand)];
for (const a of ambient) a.layer = 'above';
for (let i = 0; i < 600; i++) {
  const saved = test.input;
  test.input = { ls: null, rs: null };
  simStep(1 / 60, i % 3 === 2);
  test.input = saved;
}
S.camX = body.cx; S.camY = body.cy;
C.A0init = body.A0;
resetFungus(); // the clock for the encounter log starts after the warm-up
directorOn = true; // and the director's (the warm-up above is the cell settling, not play)

let last = performance.now();
let acc = 0;
const MAX_CATCHUP = 2;
// Split screen: a 2D microscope field drawn round a centre (shared/splitscreen.js);
// while split each view draws its property buffers at SPLIT_SCALE of the screen.
// Two to four players share one view, zoomed out up to this far (a field 2x
// as wide) before the screen splits; split views settle at 0.75 of it.
const SPLIT_ZOOM_MAX = 2;
const groupZoom = { z: 1, applied: 1 };
const split = createSplitScreen(renderer, { renderScale: SOFTWARE ? 1 : 0.75, zoomMax: SPLIT_ZOOM_MAX });
const splitT = { on: 0, off: 0, n: 1 };
// The shared quality governor: it steps the property buffers' scale (and then
// the effects level) down when frames run long, up when there is headroom,
// and owns the pixel ratio (shared/quality.js). Software GL caps it at 0.5.
const quality = createQuality({
  renderer, key: 'amoeba', min: SOFTWARE ? 0.3 : 0.5, max: SOFTWARE ? 0.5 : 1,
  onChange: ({ scale }) => { resize(); view.setScale(scale); },
});
quality.addToFeatures(features);
const marks = createLandmarks();
function frame(now) {
  if (paused && !renderOnce) { last = now; requestAnimationFrame(frame); return; }
  renderOnce = false;
  quality.update((now - last) / 1000);
  const dtReal = clamp((now - last) / 1000, 0, 0.1);
  last = now;
  S.fps += (1 / Math.max(dtReal, 1e-3) - S.fps) * 0.05;
  players.poll();
  use(cells[0]);
  unlockOnPad();
  const menu = features.update();
  // the outro (through the portal): no input; time eases to a freeze while the view keeps drawing
  // (held in the intro, the transition from the tardigrade: drawn, not stepped, no input)
  const held = introHeld();
  const ts = (outro ? stepOutro(dtReal) : 1) * (held ? 0 : introEase(dtReal));
  if (!menu && !outro && !held) {
    hud.update(pad);
    for (const c of cells) {
      if (c.p.waiting) continue;
      use(c);
      const fight = !caught.active || FC.phase === 'strike' || FC.phase === 'hold' || (FC.phase === 'eat' && FC.by !== 'chaos');
      if (fight && pressed(BTN.A) && surge.trigger()) { audio.play('amoeba/boost', { volume: 0.9 }); rumble(220, 0.3, 0.5); if (C.stuckN && !caught.active) hud.toast(tt('amoeba.toasts.surgeFree', { who: who() })); }
      const threat = caught.active ? null : threatTrap(c);
      if (!caught.active && pressed(BTN.X) && !C.closing) {
        // round one of Chaos's arms: pinch it off; at a hypha (and no cup ready to close): cut it; otherwise close the cup
        if (pinchChaos(c)) { /* cut */ }
        else if (threat && !(C.cand && C.cand.cup.wrap >= CUP_WRAP)) cutHypha(threat, threat.near);
        else tryClose();
      }
      if (!caught.active && pressed(BTN.B)) {
        if (threat || C.stuckN) C.defendMode = true;
        else if (C.closing) cancelClose(tt('amoeba.toasts.cupOpens')); else egest();
      }
      if (!pad.down(BTN.B)) C.defendMode = false;
      C.defendHeld = C.defendMode && pad.down(BTN.B);
      // Y: on the backdoor (the leaf tip), go back up; at the open portal, go
      // through; elsewhere player 1's labels.
      if (pressed(BTN.Y)) {
        if (atOpenPortal(c)) enterPortal(c);
        else if (c.atBack && !caught.active) { lm.log.push({ type: 'landmark', kind: 'back', slot: c.slot }); audio.play('shared/backdoor', { volume: 0.55 }); hud.toast(tt('amoeba.toasts.backUp', { who: who() })); embed.landmark('back', { player: c.slot }); }
        else if (c.slot === 0) S.labels = !S.labels;
      }
      if (c.slot !== 0) continue;
      const look = ctl.lookStep() || (test.presses.has(BTN.RIGHT) ? 1 : 0);
      if (look) features.set('look', MODES[(S.mode + look + MODES.length) % MODES.length]);
      const zs = ctl.zoomStep();
      if (zs) { S.objective = zs > 0 ? 1 : 0; selZoom.want = selZoom.k = 1; }
      // Fine focus: LB/RB in the classic scheme; the stick clicks in lead and follow (LB/RB spread and push).
      const ri = S.scheme === 'classic' ? null : rawInput();
      const sec = S.scheme === 'classic' ? ctl.secondary() : (ri.rsc ? 1 : 0) - (ri.lsc ? 1 : 0);
      if (sec) S.focus = clamp(S.focus + sec * dtReal * 0.8, -1, 1);
    }
    use(cells[0]);
  }
  for (const c of cells) c.surge.update(dtReal);
  test.presses.clear();
  if (!menu && !paused && !held) {
    // Fixed 60 Hz steps, at most two per frame (the owner's trade-off: on a
    // slow machine the world slows down rather than stutters); the soft bodies
    // run every step, the granules once per frame (on the last step).
    acc += dtReal * ts;
    const steps = Math.min(MAX_CATCHUP, Math.floor(acc * 60 + 1e-6));
    for (let k = 0; k < steps; k++) simStep(1 / 60, k === steps - 1);
    acc = steps === MAX_CATCHUP ? 0 : acc - steps / 60;
    stepWarmups();
  }
  // Camera: follow the cell, gently, leading a little in the direction of travel
  // (with several players: their centroid; the split screen takes it from there).
  // once eaten, the view slides so the shrivelled cell sits above the Eaten card
  const solo = cells.length === 1;
  const lift = 0;
  let tx, ty;
  const watching = solo && caught.active && ['eat', 'die', 'fadeOut'].includes(FC.phase) && FC.pts[0];
  if (watching) { tx = (body.cx + FC.pts[0].x) / 2; ty = (body.cy + FC.pts[0].y) / 2; }
  else if (solo) { tx = body.cx + body.fx * 60 * Math.min(1, body.fm); ty = body.cy + body.fy * 60 * Math.min(1, body.fm) - lift; }
  else { tx = 0; ty = 0; for (const c of cells) { tx += c.body.cx; ty += c.body.cy; } tx /= cells.length; ty /= cells.length; }
  S.camX += (tx - S.camX) * Math.min(1, dtReal * ts * 0.8);
  S.camY += (ty - S.camY) * Math.min(1, dtReal * ts * 0.8);
  // the continuous transition: the shell's pose sets the view's centre and field
  if (outro && outro.cam) { const pv = poseView(outro.cam); S.camX = pv.x; S.camY = pv.y; }
  if (held) { const pv = introView(); S.camX = pv.x; S.camY = pv.y; }
  renderAll(dtReal);
  S.statT -= dtReal;
  if (S.statT <= 0) {
    S.statT = 0.25;
    let L = 0;
    for (let i = 0; i < N; i += 4) for (let j = i + 8; j < N; j += 4) L = Math.max(L, hyp(body.x[i] - body.x[j], body.y[i] - body.y[j]));
    const ob = OBJECTIVES[S.objective];
    const amoebaX = Math.round(10 * S.amoebaK);
    const swimX = (0.1 * S.swimK).toFixed(1).replace(/\.0$/, '');
    hud.stats([
      rolesText(),
      `${MODES[S.mode]} · ${ob.name} objective, field ${(ob.field / 1000).toFixed(1)} mm · focus ${S.focus >= 0 ? '+' : ''}${S.focus.toFixed(2)}`,
      `Time: amoeba ×${amoebaX} (pseudopods ×${Math.round(amoebaX * (body.opts.speed || 1))}) · swimmers ×${swimX} of real speed`,
      `${surge.active ? `SURGE ×${C.surgeK.toFixed(1)}` : surge.text()}${C.stuckN ? ` · STUCK on a trap ${C.stuckT.toFixed(1)} s` : ''}${C.bitten ? ` · bitten ${C.bitten}` : ''}`,
      `Fungal traps: ${fungusText()}${caught.active ? ` · CAUGHT: ${FC.phase}` : ''} · out ${Math.round(distFromStart(body.cx, body.cy))} µm${PORTAL.placed ? (portalSealed() ? ' · portal sealed' : blocked() ? ' · portal open (Chaos on it)' : ' · portal open') : ''}${chaos.on ? ` · Chaos ${chaos.state}` : ''}`,
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
// Choosing pseudopods (RT): when the cell and its glows do not fit comfortably,
// the view widens (eased) to frame them, and stays there: it never zooms back
// in on its own (the owner, 2026-11-03: "auto zoom the camera out and keep it
// there"); changing the objective (D-pad) starts afresh. One field for every
// view, so in split screen it widens for whichever player needs it.
function frameChoosing(c) {
  const b = c.body;
  let ex = 0, ey = 0;
  for (let i = 0; i < N; i++) { ex = Math.max(ex, Math.abs(b.x[i] - b.cx)); ey = Math.max(ey, Math.abs(b.y[i] - b.cy)); }
  const m = 70; // the glows and their letters
  const w = baseField() * pull.k * (cells.length > 1 ? groupZoom.z : 1) * selZoom.want, h = w * (innerHeight / Math.max(1, innerWidth));
  const need = Math.max((2 * (ex + m)) / (0.8 * w), (2 * (ey + m)) / (0.8 * h));
  if (need > 1) selZoom.want = Math.min(3, selZoom.want * need);
}
const fieldWidth = () => {
  if (outro && outro.cam) { groupZoom.applied = 1; return poseView(outro.cam).w; }
  if (introHeld()) { groupZoom.applied = 1; return introView().w; }
  const want = cells.length === 1 && caught.active && ['eat', 'die', 'fadeOut'].includes(FC.phase) ? 1.45 : 1;
  pull.k += (want - pull.k) * 0.04;
  // several players in one view: the split screen's zoom-out (a wider field)
  // keeps them all in it; the screen splits only once it is at its widest
  groupZoom.applied = cells.length > 1 ? groupZoom.z : 1;
  // eased over ~0.6 s of real time, whatever the frame rate
  const now = performance.now(), zdt = Math.min(0.1, (now - (selZoom.t || now)) / 1000);
  selZoom.t = now;
  selZoom.k += (selZoom.want - selZoom.k) * Math.min(1, zdt * 5);
  return OBJECTIVES[S.objective].field * (innerWidth > innerHeight ? 1 : 0.6) * pull.k * selZoom.k * groupZoom.applied;
};
/** Draw every view (one, straight to the screen, while the players are together), then the overlays. */
function renderAll(dt) {
  const fieldW = fieldWidth();
  for (const c of cells) { c.layer.drain = c.s.drain || 0; c.layer.harm = harmOf(c); const q = (c.pos ||= { x: 0, y: 0, z: 0 }); q.x = c.body.cx; q.y = c.body.cy; }
  view.bodyMat.uniforms.uDrain.value = cells[0].s.drain || 0;
  split.update(cells.map((c) => ({ slot: c.slot, position: c.pos })), { center: { x: S.camX, y: S.camY }, pxPerUnit: innerWidth / fieldW, yUp: true, zoom: groupZoom.applied }, dt);
  groupZoom.z = split.zoom;
  const L = split.layout;
  // (the camera move frames one creature: a single view)
  const many = L.views.length > 1 && !(outro && outro.cam);
  splitT.on = many ? splitT.on + dt : 0;
  splitT.off = many ? 0 : splitT.off + dt;
  // The governor scales the property buffers (and by 0.7 / 0.55 while split;
  // it holds a moment after a split or merge itself).
  quality.setSplitViews(L.views.length);
  // Its effects level: fewer granules drawn, then no chromatic fringes.
  const lvl = quality.level;
  const flags = lvl > 0 ? S.flags : { ...S.flags, chroma: false };
  glow.setOpen(!portalSealed());
  glow.update(dt, S.time, glowCam);
  const args = { time: S.time, prey: PORTAL.placed ? [...prey, ...ambient, beacon] : [...prey, ...ambient], mode: S.mode, focus: S.focus, flags, granuleCount: Math.min(S.granules, [1100, 1800, 2600][lvl]), fragments };
  // While split, each view's own passes (mask, property buffers, blurs) are
  // scissored to the part of the screen it shows (split.scissor).
  const o0 = view.optics, internal = [view.maskRT, o0.focusRT, o0.defRT, o0.tmpRT, o0.defBlurRT, o0.haloRT, o0.haloTmp];
  if (!many) {
    if (splitT.scissored) { for (const t of internal) split.unscissor(t); splitT.scissored = false; }
    const o = L.views[0] && !(outro && outro.cam) ? L.views[0].offset : { x: 0, y: 0 };
    split.prewarm(); // the split compose programs' first draw, unseen, once they are built
    view.setView(S.camX + o.x, S.camY + o.y, fieldW);
    view.render({ ...args, buffersOnly: !!borrow.id });
    if (borrow.id) renderBorrowed(dt);
    drawGlow(null);
  } else {
    L.views.forEach((v, k) => {
      for (const t of internal) split.scissor(v, t);
      splitT.scissored = true;
      view.setView(S.camX + v.offset.x, S.camY + v.offset.y, fieldW);
      view.render({ ...args, target: split.target(v.index), update: k === 0 });
      drawGlow(split.target(v.index));
    });
    // The optics composite is display-ready: no second encoding when the regions are drawn.
    const cs = renderer.outputColorSpace;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    split.compose();
    renderer.outputColorSpace = cs;
  }
  // Warnings: player 1's, else the first player in trouble.
  const warn = (c) => (c.caught.active ? ((c.FC.by === 'chaos' ? CHAOS_TEXT : CATCH_TEXT)[c.FC.phase] || '') : c.s.stuckN ? tt('amoeba.banner.stuck', { s: Math.max(0, 8 - c.s.stuckT).toFixed(1) }) : '');
  const chaosWarn = (c) => (chaos.attacking && chaos.target && chaos.target.cell === c && !c.caught.active
    ? (chaos.closing ? tt('amoeba.banner.chaosShut')
      : chaos.fs === 'windup' ? tt('amoeba.banner.chaosWindup')
        : chaos.attack % 2 === 0 ? tt('amoeba.banner.chaosLunges')
          : tt('amoeba.banner.chaosClosing')) : '');
  const sealedWarn = (c) => (lm.sealedAt && c.atFwd ? tt(sealedWhy(), { who: '' }) : '');
  const warnAll = (c) => warn(c) || chaosWarn(c) || sealedWarn(c);
  const wc = cells.find((c) => warnAll(c));
  warnEl.textContent = wc ? who(wc) + warnAll(wc) : '';
  warnEl.style.display = warnEl.textContent ? 'block' : 'none';
  updateOverlay();
  marks.begin();
  // no arrow and no edge pointer to the portal by default (the owner): the golden sparkle
  // on the slide is its only marker; this canvas only shows the bloom on entering (the
  // Portal arrow setting adds an arrow: drawPortalArrow)
  portalLight.begin();
  marks.drawSplit(split, { x: BACK_TIP.x, y: BACK_TIP.y, z: 0 }, { kind: 'backdoor', label: tt('amoeba.marks.leaf'), range: 4500 });
  drawPortalArrow();
  if (cells.length > 1) drawRings(L, innerWidth / fieldW);
  drawPodMarks(L);
  drawChaosRing(L);
}

/**
 * Pseudopod mode: a subtle mark on the pseudopod each stick owns (R for RS,
 * L for LS): a thin line along the membrane round its tip, a short tick and
 * the stick's letter, in the player's colour; dimmer while it rests (its stick
 * at neutral). Choosing (RT held): instead, a soft glow in the player's colour
 * at the base of each stick's pseudopod, marked L and R, eased round the
 * membrane as the stick moves it (select.js); dim and pulsing while busy (its
 * stick was pushed when RT went down and has not yet come back to neutral),
 * bright with a ring once editable.
 */
const GLOW_PT = { x: 0, y: 0 };
function drawPodMarks(L) {
  if (S.scheme !== 'select') return;
  const cv = marks.canvas, g = cv.getContext('2d');
  const k = cv.width / (cv.clientWidth || innerWidth);
  g.save();
  g.setTransform(k, 0, 0, k, 0, 0);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.font = '700 12px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const c of cells) {
    if (c.caught.active || c.p.waiting) continue;
    const b = c.body, reg = L.regions.find((r) => r.slot === c.slot);
    g.save();
    if (L.views.length > 1 && reg) { g.beginPath(); reg.polygon.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); }
    if (c.R.choose) {
      const [cx0, cy0] = toScreen(b.cx, b.cy, c.slot), [cx1] = toScreen(b.cx + 1, b.cy, c.slot);
      const px = Math.abs(cx1 - cx0) || 1;
      for (const [key, letter] of [['sel', 'R'], ['adj', 'L']]) {
        const gl = c.R.glow[key];
        if (!gl) continue;
        basePoint(b, gl.a, GLOW_PT);
        const [sx, sy] = toScreen(GLOW_PT.x, GLOW_PT.y, c.slot);
        const pulse = gl.busy ? 0.5 + 0.5 * Math.sin(S.time * 7) : 1;
        const rad = Math.max(26, 46 * px);
        const grad = g.createRadialGradient(sx, sy, 0, sx, sy, rad);
        grad.addColorStop(0, 'rgba(255,250,235,0.95)'); grad.addColorStop(0.25, c.p.color); grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = gl.busy ? 0.4 + 0.25 * pulse : 0.9;
        g.fillStyle = grad; g.beginPath(); g.arc(sx, sy, rad, 0, TAU); g.fill();
        if (!gl.busy) { g.globalAlpha = 0.9; g.strokeStyle = c.p.color; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, Math.max(9, 16 * px), 0, TAU); g.stroke(); }
        // the letter just outside the membrane
        const ox = (GLOW_PT.x - b.cx), oy = (GLOW_PT.y - b.cy), ol = Math.hypot(ox, oy) || 1;
        const [lx, ly] = toScreen(GLOW_PT.x + (ox / ol) * 34, GLOW_PT.y + (oy / ol) * 34, c.slot);
        g.globalAlpha = gl.busy ? 0.55 : 1; g.lineWidth = 3; g.strokeStyle = 'rgba(20,18,12,0.8)'; g.strokeText(letter, lx, ly);
        g.fillStyle = c.p.color; g.fillText(letter, lx, ly);
      }
      g.restore();
      continue;
    }
    for (const [key, letter] of [['sel', 'R'], ['adj', 'L']]) {
      const pk = c.R[key];
      if (pk == null || !b.pods[pk]) continue;
      const fade = c.R.on[key] ? 1 : 0.5;
      const tip = b.pods[pk].tip;
      // along the membrane, 8 µm outside it, either side of the tip
      g.beginPath();
      for (let r = -6; r <= 6; r++) {
        const i = (tip + r + N) % N;
        const [sx, sy] = toScreen(b.x[i] + b.nx[i] * 8, b.y[i] + b.ny[i] * 8, c.slot);
        if (r === -6) g.moveTo(sx, sy); else g.lineTo(sx, sy);
      }
      g.strokeStyle = c.p.color; g.globalAlpha = (letter === 'R' ? 0.7 : 0.6) * fade; g.lineWidth = 2;
      g.stroke();
      const [ax, ay] = toScreen(b.x[tip] + b.nx[tip] * 12, b.y[tip] + b.ny[tip] * 12, c.slot);
      const [bx, by] = toScreen(b.x[tip] + b.nx[tip] * 13, b.y[tip] + b.ny[tip] * 13, c.slot);
      const dx = bx - ax, dy = by - ay, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + ux * 9, ay + uy * 9); g.lineWidth = 2; g.stroke();
      // the letter, with a faint dark halo so it reads on the pale slide and in darkfield
      const lx = ax + ux * 19, ly = ay + uy * 19;
      g.globalAlpha = 0.5 * fade; g.lineWidth = 3; g.strokeStyle = 'rgba(20,18,12,0.8)'; g.strokeText(letter, lx, ly);
      g.globalAlpha = fade; g.fillStyle = c.p.color; g.fillText(letter, lx, ly);
    }
    g.restore();
  }
  g.restore();
}

/**
 * Chaos encircling a player: the closing ring, drawn round their cell where
 * its membrane already rings them (rust red, brighter and thicker as it
 * closes), the open arc left as the gap to push out through. Shut (its X),
 * the whole ring pulses and tightens. Nothing is drawn while it only pushes.
 */
function drawChaosRing(L) {
  const r = chaos.ring, p = chaos.ringOf;
  if (!chaos.on || !r || !p || !p.cell || !(chaos.encircling || chaos.closing) || r.cover < 0.2) return;
  const c = p.cell, b = c.body;
  if (c.caught.active) return;
  const cv = marks.canvas, g = cv.getContext('2d');
  const k = cv.width / (cv.clientWidth || innerWidth);
  const reg = L.regions.find((q) => q.slot === c.slot);
  g.save();
  g.setTransform(k, 0, 0, k, 0, 0);
  if (L.views.length > 1 && reg) { g.beginPath(); reg.polygon.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); }
  const [cx, cy] = toScreen(b.cx, b.cy, c.slot);
  const [ex] = toScreen(b.cx + 1, b.cy, c.slot);
  const px = Math.abs(ex - cx) || 1; // screen px per µm
  const shut = !!chaos.closing, pulse = shut ? 0.5 + 0.5 * Math.sin(S.time * 18) : 0;
  const tight = shut ? Math.min(1, chaos.closing.t / RING.closeT) : 0;
  const rad = (b.req + 70 - 40 * tight) * px;
  g.lineCap = 'round';
  g.strokeStyle = shut ? `rgba(220,60,40,${0.75 + 0.25 * pulse})` : `rgba(200,80,50,${0.35 + 0.5 * r.cover})`;
  g.lineWidth = 2 + 4 * r.cover + 3 * pulse;
  const step = (Math.PI * 2) / BINS;
  for (let i = 0; i < BINS; i++) {
    if (!r.bins[i]) continue;
    // world angle (y up) to screen (y down)
    const a = -(i * step);
    g.beginPath(); g.arc(cx, cy, rad, a + step * 0.55, a - step * 0.55, true); g.stroke();
  }
  g.restore();
}

/** With more than one player: a faint broken ring in each player's colour round their amoeba, and a name tag. */
/**
 * The "Portal arrow" setting (the game's Settings, default off; ?arrow=1 here): an arrow at the edge of
 * each view toward the way on (the P. bursaria in its glow: the director's portals(), one here), with the
 * view's nearest cell's distance (µm, or mm from 1 mm). Sealed too: it is where the way on will open.
 */
let arrowLog = [];
const arrowLabel = (d) => (d >= 1000 ? `${(d / 1000).toFixed(1)} mm` : `${Math.round(d)} µm`);
function drawPortalArrow() {
  arrowLog = [];
  if (!portalArrowOn() || !PORTAL.placed || outro) return;
  const pp = { x: PORTAL.x, y: PORTAL.y, z: 0 };
  arrowLog = marks.drawSplit(split, (vp) => {
    let d = Infinity;
    for (const v of vp) { const c = cells.find((q) => q.slot === v.slot); if (c) d = Math.min(d, Math.hypot(c.body.cx - pp.x, c.body.cy - pp.y)); }
    if (!isFinite(d)) d = Math.hypot(body.cx - pp.x, body.cy - pp.y);
    return { position: pp, label: arrowLabel(d), distance: d };
  }, { kind: 'forward', portal: true, range: 4000 }).map((r) => r && { x: r.x, y: r.y, angle: r.angle, onScreen: r.onScreen, d: Math.round(r.picked.distance), label: r.picked.label, at: [Math.round(pp.x), Math.round(pp.y), 0] });
}
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
  get roles() { const R0 = cells[0].R; return { pod: R0.pod, body: R0.pod ? other(R0.pod) : R0.body, branch: R0.branch, latch: [...R0.latch], sel: R0.sel, adj: R0.adj }; },
  /** Select and steer: player `slot`'s pseudopods round the outline and which the sticks hold. */
  pods(slot = 0) {
    const c = cellOf(slot), b = c.body;
    const gl = (g) => (g ? { a: Math.round(g.a / DEG), target: Math.round(g.target / DEG), busy: g.busy, moved: g.moved, snapK: g.snapK, screen: toScreen(...Object.values(basePoint(b, g.a)), c.slot).map(Math.round) } : null);
    return { glow: { sel: gl(c.R.glow.sel), adj: gl(c.R.glow.adj) }, choose: c.R.choose, sel: c.R.sel, adj: c.R.adj, mode: c.R.mode, move: c.R.move, round: +b.roundK.toFixed(3), spread: +b.spread.toFixed(3), list: podList(b).map((p) => ({ k: p.k, deg: Math.round(p.a / DEG), y: Math.round(p.y - b.cy), idle: p.idle, s: +b.pods[p.k].s.toFixed(2), screen: toScreen(b.x[b.pods[p.k].tip], b.y[b.pods[p.k].tip], c.slot).map(Math.round) })) };
  },
  rolesText, fragments,
  /** Harm drawn on player `slot`'s cell now: { stains: [[x, y, reach, strength]], shock, tint, death, scatter, gran }. */
  harm(slot = 0) { const c = cellOf(slot); const h = harmOf(c); return { ...h, stains: h.stains.map((q) => q.slice()), shock: h.shock.map((q) => q.slice()) }; },
  /** 'select' (default), 'lead' or 'classic'. */
  scheme(v) { features.set('scheme', SCHEMES[Math.max(0, SCHEME_IDS.indexOf(v))]); },
  /** Test hook: cut the neck between ring nodes i and j as a hypha would (pinch-off demo). */
  pinch(i, j) { pinchOff(i, j); },
  /** Test hook: make the cell a fresh disc at its centroid (organelles kept). */
  resetBody() {
    const R = Math.sqrt(body.A0 / Math.PI);
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU; body.x[i] = body.cx + R * Math.cos(a); body.y[i] = body.cy + R * Math.sin(a); }
    for (const p of body.pods) { p.s = 0; p.target = 0; p.active = false; p.ret = 0; }
    body.grid.build(body.x, body.y, N);
  },
  traps: trapList, chaos,
  /** The slide: the trap hyphae's distances, the patches (scenery and the encounters'), Chaos, and when each encounter was placed and met. */
  route() {
    const traps = trapList().map((o) => {
      const c = Math.cos(o.ang), s = Math.sin(o.ang), h = o.L / 2;
      let near = Infinity, far = 0;
      for (let t = -h; t <= h; t += 5) { const d = Math.hypot(o.x + c * t, o.y + s * t); near = Math.min(near, d); far = Math.max(far, d); }
      return { cluster: o.cluster, nearest: Math.round(near), farthest: Math.round(far) };
    });
    return { slide: { ...SLIDE }, traps, patches: [...PATCHES, ...encPatches].map((P) => ({ ring: P.ring, x: Math.round(P.x), y: Math.round(P.y), d: Math.round(Math.hypot(P.x, P.y)), r: P.r, n: prey.filter((p) => p.home === P && !p.captured).length })),
      chaos: chaos.on ? { post: Math.round(Math.hypot(chaos.post.x, chaos.post.y)), wakes: CHAOS_WAKE, leash: CHAOS_LEASH, state: chaos.state } : null,
      met: { ...challengeLog }, prey: prey.length, encounters: director.state() };
  },
  /** The director (shared/director.js): state(), seenAt(x, y), placeNow(), log. */
  director,
  encounters() { return director.state(); },
  seenAt(x, y) { return director.seenAt(x, y); },
  placeNow() { return director.placeNow(); },
  /** Testing: place encounter `id` now at (x, y), met coming along bearing b (every earlier one counts as met). */
  placeEncounter(id, x, y, b = 0) { return director.force(id, x, y, b); },
  /** The portal for the level transition (the shell reads it): where it is (µm), whether it is placed, found, sealed or open, whether Chaos's body is over it (blocked), who is at it, and Chaos. */
  portal() {
    return { placed: PORTAL.placed, found: PORTAL.found, x: PORTAL.x, y: PORTAL.y, bearing: PORTAL.a, reach: PORTAL.reach, beacon: { x: beacon.x, y: beacon.y },
      blocked: blocked(), sealed: PORTAL.placed && portalSealed(), open: PORTAL.placed && !portalSealed(), glow: +glow.open.toFixed(2), prompt: lm.portal,
      at: cells.filter((c) => c.atFwd).map((c) => c.slot),
      chaos: { on: chaos.on, state: chaos.state, beaten: chaos.beaten, x: chaos.body.cx, y: chaos.body.cy, d: PORTAL.placed ? Math.round(Math.hypot(chaos.body.cx - PORTAL.x, chaos.body.cy - PORTAL.y)) : null } };
  },
  /** Testing: place the portal now, `d` µm from player `slot` at bearing `a` (default: their bearing from the start); every encounter before it counts as met. */
  placePortal(a = null, slot = 0, d = 1400) {
    const c = cellOf(slot), b = a ?? (distFromStart(c.body.cx, c.body.cy) > 1 ? bearingFromStart(c.body.cx, c.body.cy) : 0);
    director.force('portal', c.body.cx + Math.cos(b) * d, c.body.cy + Math.sin(b) * d, b);
    return window.__micro.portal();
  },
  /** Go through the portal now as player `slot` (what Y at the open portal does). */
  enterPortal(slot = 0) { enterPortal(cellOf(slot)); },
  /** The portal arrow drawn last frame, per view: [{ x, y, angle, onScreen, d, label, at } | null] ([] when off). */
  portalArrow: () => arrowLog,
  /** The director's portals (the way on): [{ instance, x, y, z, open, seen, state }]. */
  portals: () => director.portals().map(({ handle, ...q }) => q),
  /** Is the way on still sealed (encounters left before it)? */
  portalSealed: () => portalSealed(),
  /** The outro after the portal: null, or { t, scale (the world's time scale), frozen, cam (the shell's pose) }. */
  outro() { return outro ? { t: +outro.t.toFixed(3), scale: +outro.scale.toFixed(3), frozen: outro.frozenAt !== null, cam: outro.cam } : null; },
  /** The outro's timings (seconds); `rate` slows it (tests). */
  OUTRO,
  /** How the view just drawn frames player 1's cell (what embed.opening reports on hold), and the intro's state. */
  pose: () => pose2D(body.cx, body.cy, cellHeading(), cellLen()),
  get intro() { return intro ? { held: !('ease' in intro), cam: intro.cam } : null; },
  /** The bursaria (the next world's creature) as a pose in the view just drawn. */
  beaconPose: () => pose2D(beacon.x, beacon.y, beacon.heading, beaconLen()),
  /** Testing: traps never arm and Chaos never wakes (scripted runs). */
  passive(on = true) { S.passive = on; },
  log: challengeLog,
  /** Test hook: player `slot` presses X round one of Chaos's arms (reach: how close each side must be). */
  /** Test hook: Chaos engulfs player `slot` now. */
  engulf: (slot = 0) => startEngulf(cellOf(slot)),
  /** Cells in contact last step: { pairs, depth (the deepest overlap before it was settled, µm) }, and now: overlap between every two cells ({ n, depth }, 0 when apart). */
  contact: () => ({ ...contactLog, now: (() => { const bs = [...cells.filter((c) => !c.p.waiting && !(c.caught.active && c.FC.by === 'chaos')).map((c) => c.body), ...(chaos.on ? [chaos.body] : [])]; let n = 0, depth = 0; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const o = overlap(bs[i], bs[j]); n += o.n; depth = Math.max(depth, o.depth); } return { n, depth: +depth.toFixed(2) }; })() }),
  /** Chaos's ring round its target: null, or { cover, gap (deg), closing (s into its X, or null), slot }. */
  ring: () => (chaos.ring && chaos.ringOf ? { cover: +chaos.ring.cover.toFixed(2), gap: Math.round(chaos.ring.gap * 57.3), closing: chaos.closing ? +chaos.closing.t.toFixed(2) : null, slot: chaos.ringOf.cell.slot, state: chaos.state, fs: chaos.fs } : null),
  /** The view's widening for choosing pseudopods: { k (now), want }. */
  selZoom: () => ({ k: +selZoom.k.toFixed(3), want: +selZoom.want.toFixed(3) }),
  /** Test hook: another local player joins (as a controller would), with a cell. Returns its slot. */
  addPlayer() { const r = players.toJSON(); const slot = r.length; players.fromJSON([...r, { slot, padIndex: slot }]); syncCells(); return slot; },
  /** Test hook: Chaos wakes now and makes for player `slot` (its fight from the stalk). */
  wakeChaos() { chaos.state = 'fight'; chaos.fight.reset(); chaos.fs = 'stalk'; chaos.notice = 0; },
  /** Test hook: put Chaos (whole, granules and all) centred at (x, y) µm, and make that its post. */
  placeChaos(x, y) { chaos.on = true; chaos.setPost(x, y, chaos.restAt); },
  pinchChaos: (slot = 0, reach = 70) => { const c = cellOf(slot); use(c); const ok = pinchChaos(c, reach); use(cells[0]); return ok; },
  /** Test hook: player `slot` holds B (defend) or lets go. */
  defend(on = true, slot = 0) { const c = cellOf(slot); c.s.defendHeld = on; c.s.defendMode = on; },
  /** Test hook: player `slot` presses X at the nearest threatening trap hypha (cuts it). Returns whether it could. */
  cut(slot = 0) { const c = cellOf(slot); const o = threatTrap(c); if (!o) return false; use(c); cutHypha(o, o.near); use(cells[0]); return true; },
  /** Test hook: a fresh amoeba for player `slot` centred at (x, y) µm. */
  place(slot, x, y) { const c = cellOf(slot); makeBody(c, x, y); use(cells[0]); if (cells.length === 1) { S.camX = x; S.camY = y; } },
  /** Test hook: put player `slot` at the forward landmark (the P. bursaria) or the backdoor (the leaf tip). */
  teleport(kind, slot = 0) {
    const c = cellOf(slot);
    if (kind === 'forward') {
      if (!PORTAL.placed || portalSealed()) window.__micro.placePortal(null, slot);
      lm.fwdLatch = false;
      const x = PORTAL.x + Math.cos(PORTAL.a) * 240, y = PORTAL.y + Math.sin(PORTAL.a) * 240; // just beyond it (Chaos lies on the near side)
      window.__micro.place(slot, x, y);
    }
    else window.__micro.place(slot, BACK_TIP.x + 230, BACK_TIP.y + 40);
    return c.slot;
  },
};

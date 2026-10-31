// Bacterium prototype (Level 5 of the Zoom Chain): steer (LS) or run and tumble as a
// magnetotactic spirillum, or as the predator Bdellovibrio, in bog sediment
// at 1000×, at the limit of the light microscope. See README.md.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { createControls, createDash, hudControls } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { loadTexture } from '../shared/assets.js';
import { createLightOptics, LOOK_NAMES, psfSigmaUm } from '../shared/techniques/bacterium-fluorescence.js';
import { createShapes } from '../shared/techniques/bacterium-shapes.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, DIC_MODES } from '../shared/techniques/adapters.js';
import { createWorld, oxygenY } from './world.js';
import { createSwimmer, SPECIES } from './swim.js';
import { createGame, GOAL_PREY } from './game.js';
import { createDrawer } from './draw.js';
import { createOverlay } from './overlay.js';
import { createHunger, createCapture } from '../shared/predation.js';
import { gauss } from './world.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.autoClear = false;
const pad = createPad();
const ctl = createControls(pad);
const hud = mountHud({
  title: 'Bacterium',
  sub: 'A magnetotactic spirillum, 3 µm long, in bog sediment at 1000× (or the predator Bdellovibrio). Steer with the stick; let go and Brownian motion, flow and the field push you about.',
  controls: hudControls({
    move: 'Steer: the cell turns toward the stick and swims (speed from the tilt). Let go: you drift at the mercy of the water',
    camera: 'Move the stage',
    dash: 'Sprint run: every flagellum at full motor speed (recharges)',
    attack: 'Hold: take up food · Bdellovibrio: attach and bore into prey',
    defend: 'Tumble: a quick random turn (evade); it leans toward the stick',
    special: 'Data overlay: oxygen, food, field lines (data, not optics)',
    analog: 'Fine focus down / up',
    secondary: 'Reverse the run: the other pole leads (back along the field)',
    look: 'Look: phase, fluorescence, darkfield, SEM, DIC',
    zoom: 'Field: 180 µm eyepiece … 22 µm camera crop',
  }),
  note: 'Real scale and speeds in µm and µm/s; a few labelled stretches (see Features). Goal: find the microaerobic band (0.5–5 % oxygen) and feed until you divide; as Bdellovibrio, take three prey.',
});

// --- tiny DOM bits: end card, DATA tag, scale bar, oxygen ticks ---
const card = Object.assign(document.createElement('div'), { className: 'bx-card' });
const tag = Object.assign(document.createElement('div'), { className: 'bx-tag', textContent: 'DATA OVERLAY · not optics: what the cell senses' });
const scaleEl = Object.assign(document.createElement('div'), { className: 'bx-scale' });
const o2El = Object.assign(document.createElement('div'), { className: 'bx-o2' });
const mark = Object.assign(document.createElement('div'), { className: 'bx-mark' });
const warnEl = document.createElement('div');
warnEl.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,12,16,.7);color:#ff8a7a;border-radius:12px;padding:6px 14px;font:600 13px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap;z-index:20;display:none;max-width:calc(100vw - 32px)';
document.body.append(card, tag, scaleEl, o2El, mark, warnEl);

// --- simulation ---
const world = createWorld();
const swimmer = createSwimmer(world);
const game = createGame(world, swimmer);
const drawer = createDrawer(world);
const S = swimmer.state;
let dash = createDash({ duration: 0.6, cooldown: 3 });

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
  const caughtBy = S.caught && S.caught.who;
  for (const g of world.grazers) g.feeding = isHungry(g.hunger) || caughtBy === g;
  world.hunt.phage = isHungry(phageH);
  world.hunt.bdello = isHungry(bdelloH);
  world.hunt.amoeba = isHungry(amoebaH);
  // a phage cloud: a nearby infected cell bursts, and its phages drift your way
  if (world.hunt.phage && !phageWas && world.opts.phages && S.alive) {
    const a = Math.random() * 6.28, d = 24 + Math.random() * 10;
    world.addPatch(S.x + Math.cos(a) * d, Math.max(world.surfaceY(S.x) + 6, S.y + Math.sin(a) * d), true);
    hud.toast('A cell nearby has burst: a cloud of phages drifts in. Keep moving, shake off any that stick (A / B)', 3200);
  }
  if (!world.hunt.phage && phageWas && S.alive) hud.toast('The phage cloud has thinned out', 2000);
  phageWas = world.hunt.phage;
  if (pacing.firstHungry === null && predators().some((p) => p.on && isHungry(p.h))) pacing.firstHungry = pacing.now - pacing.t0;
}

// --- being caught: strike → hold → eat → the Eaten card (shared/predation.js) ---
const capture = createCapture({ onRestart: () => setSpecies(S.species) });
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
const cat = { kind: null, who: null, phase: null, t: 0, x0: 0, y0: 0, a0: 0, zoom0: 2, released: false };
function startCatch({ kind, who }) {
  Object.assign(cat, { kind, who, phase: 'strike', t: 0, x0: S.x, y0: S.y, a0: S.a, zoom0: view.zoom, released: false });
  S.catchAnim = cat;
  capture.start({ by: CATCH[kind].by, how: CATCH[kind].how });
  audio.play(CATCH[kind].sound, { volume: 1, rate: kind === 'amoeba' ? 0.7 : 1 });
  pad.rumble(400, 0.7, 0.8);
  if (kind === 'phage') who.p.anim = true;
  // close in so a 3 µm cell (and a ×3 phage) can be followed
  view.zoom = 3;
  if (pacing.firstCatch === null) pacing.firstCatch = pacing.now - pacing.t0;
}
const catcherHunger = () => (cat.kind === 'grazer' ? cat.who.hunger : cat.kind === 'phage' ? phageH : cat.kind === 'bdello' ? bdelloH : amoebaH);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
function stepCatch(dt) {
  if (!capture.active) return;
  const prev = cat.phase;
  const c = capture.update(dt, pad);
  if (!c.active) return; // restarted
  cat.phase = c.phase; cat.t = c.t;
  const k = c.t, e = c.phase === 'eaten' ? 1 : c.phase === 'eat' ? ease(k) : 0;
  if (c.phase !== prev) {
    if (c.phase === 'eat') {
      catcherHunger().fed();
      audio.play(cat.kind === 'phage' ? 'bacterium/phage' : 'bacterium/eat', { volume: 0.9, rate: 0.7 });
    }
    if (c.phase === 'hold' && cat.kind === 'bdello') audio.play('bacterium/eat', { volume: 0.8, rate: 1.2 });
  }
  if (cat.kind === 'grazer') {
    const g = cat.who, P = g.pose, R = g.R;
    g.gulping = c.phase !== 'eaten';
    const deep = { x: P.mouth.x - P.up.x * R * 0.55, y: P.mouth.y - P.up.y * R * 0.55 };
    if (c.phase === 'strike') { const q = ease(k); S.x = cat.x0 + (P.mouth.x - cat.x0) * q; S.y = cat.y0 + (P.mouth.y - cat.y0) * q; S.a += dt * 7; }
    else if (c.phase === 'hold') { const q = ease(k); S.x = P.mouth.x + (deep.x - P.mouth.x) * q; S.y = P.mouth.y + (deep.y - P.mouth.y) * q; S.a += dt * 6; }
    else { S.x = deep.x - P.up.x * R * 0.25 * e + P.up.y * R * 0.3 * e; S.y = deep.y - P.up.y * R * 0.25 * e - P.up.x * R * 0.3 * e; S.a += dt * 2 * (1 - e); }
  } else if (cat.kind === 'amoeba') {
    const A = cat.who, nx = -Math.sin(A.ang), ny = Math.cos(A.ang);
    S.x = cat.x0 - nx * 6 * e; S.y = cat.y0 - ny * 6 * e;
  } else if (cat.kind === 'phage') {
    if (c.phase === 'eaten' && !cat.released) {
      // the burst: new phages into the water
      cat.released = true;
      for (let i = 0; i < 30; i++) { const p = world.newPhage(S.x + gauss(Math.random) * 1.2, S.y + gauss(Math.random) * 1.2); p.z = (Math.random() - 0.5) * 0.4; world.phages.push(p); }
      for (const ph of S.phages) ph.p.anim = true; // the shells stay with the ghost
      pad.rumble(250, 0.5, 0.4);
    }
  } else if (cat.kind === 'bdello') {
    const b = cat.who, sp = S.sp;
    b.attachT = 0;
    const pole = { x: S.x + Math.cos(S.a) * sp.L * 0.5, y: S.y + Math.sin(S.a) * sp.L * 0.5 };
    if (c.phase === 'strike') { const q = 1 - ease(k); b.x = pole.x + Math.cos(S.a) * (0.55 + 1.6 * q); b.y = pole.y + Math.sin(S.a) * (0.55 + 1.6 * q); b.a = S.a + Math.PI; }
    else if (c.phase === 'hold') { const q = ease(k); b.x = pole.x + Math.cos(S.a) * 0.55 * (1 - q) - Math.cos(S.a) * sp.L * 0.35 * q; b.y = pole.y + Math.sin(S.a) * 0.55 * (1 - q) - Math.sin(S.a) * sp.L * 0.35 * q; b.a = S.a + Math.PI; }
    else { b.x = S.x; b.y = S.y; b.a = S.a + Math.PI * 0.5 + e * 1.2; b.L = 1.0 - 0.3 * e; b.curve = 0.7 + 0.8 * e; }
  }
}

// --- rendering ---
const optics = createLightOptics(renderer);
const shapes = createShapes(6000);
const overlay = createOverlay();
const looks = createBorrowedLooks(renderer);

// Delivered art (null until delivered; the ids may not be in the list yet).
const safeTexture = (id) => { try { return loadTexture(id, { srgb: false }); } catch { return Promise.resolve(null); } };
const plates = { phase: null };
safeTexture('MP-B01').then((t) => { if (t) plates.phase = t; });
safeTexture('MP-B02').then((t) => { if (t) shapes.setTextures({ bio: t }); });
safeTexture('MP-B03').then((t) => { if (t) shapes.setTextures({ cil: t }); });
safeTexture('MP-B04').then((t) => { if (t) shapes.setTextures({ mag: t }); });

const ZOOMS = [180, 90, 45, 22]; // field height in µm: the eyepiece field at 1000×, then camera crops
const view = { mark: true, zoom: 2, cx: 0, cy: 30, stage: new THREE.Vector2(), focus: 0, look: 'phase', overlay: false, stop: true, focusFollows: true };

const gl = renderer.getContext();
const soft = /SwiftShader|llvmpipe|Software/i.test(String(gl.getParameter(gl.RENDERER)) + (gl.getExtension('WEBGL_debug_renderer_info') ? gl.getParameter(0x9246) : ''));
let renderScale = soft ? 0.5 : 1;
function resize() {
  const pr = Math.min(devicePixelRatio || 1, 1.5) * renderScale;
  const w = Math.max(2, Math.floor(innerWidth * pr)), h = Math.max(2, Math.floor(innerHeight * pr));
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  optics.resize(w, h);
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
  if (capture.active) capture.reset(false);
  swimmer.reset(sp);
  resetPressure();
  dash = sp === 'mtb' ? createDash({ duration: 0.6, cooldown: 3 }) : createDash({ duration: 0.45, cooldown: 2.5 });
  view.zoom = ZOOMS.indexOf(SPECIES[sp].view);
  view.cx = S.x; view.cy = S.y;
  card.classList.remove('show');
  hud.toast(sp === 'mtb' ? 'Magnetospirillum: find the 0.5–5 % oxygen band, feed (hold X) until you divide' : `Bdellovibrio: ram and bore into ${GOAL_PREY} Gram-negative prey (X when touching)`, 3200);
}

// --- loop ---
let t = 0, last = performance.now(), blocked = false, fps = 60, fpsT = 0, frames = 0;
const msg = { phageHint: false };
const debug = {
  freeze: false,
  teleport(x, y, a) { S.x = x; S.y = y; if (a !== undefined) S.a = a; view.cx = x; view.cy = y; },
  look(k) { const want = LOOK_CYCLE.indexOf(k); for (let i = 0; i < 6 && currentLookKey() !== k; i++) cycleLook(1); return want >= 0; },
  zoom(i) { view.zoom = i; },
  tumble() { return swimmer.tumble(null); },
  dash() { if (dash.trigger()) doDash(); },
  reverse() { return swimmer.reverse(); },
  overlay(on) { features.set('overlay', on); },
  species(s) { features.set('species', SPECIES_NAMES[s]); },
  phageOnMe() { const p = world.newPhage(S.x, S.y); p.z = 0; world.phages.push(p); const ph = { p, u: (Math.random() - 0.5) * S.sp.L * 0.6, side: 1, t: 0, irreversible: false, shed: false }; p.stuck = ph; S.phages.push(ph); },
  nearGrazer(i = 0, d = 14) { const P = world.grazers[i].pose; debug.teleport(P.mouth.x + P.up.x * d, P.mouth.y + P.up.y * d, Math.atan2(-P.up.y, -P.up.x)); },
  step(n = 1, dt = 1 / 60, inp = {}) { for (let i = 0; i < n; i++) tick(dt, { attack: !!inp.attack, attackPressed: !!inp.attack && i === 0, steer: inp.steer || null }); },
};

function doDash() {
  audio.play('bacterium/sprint', { volume: 0.9 });
  const res = swimmer.dash();
  S.dashOn = true;
  pad.rumble(160, 0.5, 0.7);
  if (res === 'shook') { bdelloH.missed(); hud.toast('Shook the Bdellovibrio off before it could bore in'); }
  else if (res === 'detached') hud.toast('Let go of the prey');
}

function tick(dt, inp) {
  t += dt;
  pacing.now = t;
  updatePressure(dt);
  dash.update(dt);
  const ev = {};
  inp.dashActive = dash.active;
  swimmer.step(dt, t, inp, ev);
  snd.t += dt;
  const run = S.alive && S.mode !== 'tumble' ? Math.min(1, S.speed / 40) : 0;
  runLoop.set({ volume: 0.7 * run, rate: 0.8 + 0.6 * run + (dash.active ? 0.2 : 0) });
  // uptake: a soft eating sound every ~0.7 s while X feeds, and when a prey is finished
  if ((S.feeding && snd.t - snd.lastEat > 0.7) || (ev.emerged && snd.t - snd.lastEat > 0.2)) {
    snd.lastEat = snd.t;
    audio.play('bacterium/eat', { volume: 0.7, rate: 0.95 + Math.random() * 0.1 });
  }
  if (ev.phage && snd.t - snd.lastPhage > 0.2) { snd.lastPhage = snd.t; audio.play('bacterium/phage', { volume: 0.8 }); }
  if (ev.captured) audio.play('bacterium/graze', { volume: 0.9 });
  world.update(dt, t, S);
  game.update(dt, t, inp, ev);
  if (ev.caught) startCatch(ev.caught);
  stepCatch(dt);
  if (pacing.firstThreat === null && S.alive && (S.flow > 15 || S.phages.length || S.attacker || world.insideAmoeba(S.x, S.y, t) > 0)) pacing.firstThreat = t - pacing.t0;
  // focus drifts back to the cell's plane
  if (view.focusFollows && !inp.focusing) view.focus *= Math.exp(-dt * 1.5);
  // camera: the stage follows the cell
  const k = 1 - Math.exp(-dt * 5);
  // once eaten, the view slides down so your remains sit above the Eaten card
  const lift = capture.active && cat.phase === 'eaten' ? ZOOMS[view.zoom] * 0.22 : 0;
  view.cx += (S.x - view.cx) * k; view.cy += (S.y - lift - view.cy) * k;
  // events
  if (ev.phage) { pad.rumble(60, 0.3, 0); if (!msg.phageHint) { msg.phageHint = true; hud.toast('A phage stuck to you! Dash (A) or tumble (B) within 3 s to shake it off', 3200); } else hud.toast('Another phage stuck: shake it off (A / B)'); }
  if (ev.shed) hud.toast(`Shook off ${ev.shed} phage${ev.shed > 1 ? 's' : ''} while the binding was still reversible`);
  if (ev.irreversible) { pad.rumble(200, 0.6, 0.4); hud.toast('Irreversible: the phage\'s tail is through the envelope', 2600); }
  if (ev.captured) { pad.rumble(300, 0.6, 0.9); hud.toast('Caught in the feeding current at the oral funnel: DASH (A)!', 2200); }
  if (ev.engulfing) { pad.rumble(250, 0.5, 0.5); hud.toast('The amoeba\'s edge is closing over you: swim out!', 2200); }
  if (ev.attacked) { pad.rumble(300, 0.8, 0.8); hud.toast('Bdellovibrio has rammed you! Dash (A) or tumble (B) to shake it off', 2600); }
  if (ev.attach) hud.toast('Attached: boring through the outer membrane (minutes in life, 2.5 s here)', 2600);
  if (ev.entered) { pad.rumble(200, 0.4, 0.4); hud.toast('Inside the periplasm: the prey rounds into a bdelloplast. What happens inside is beyond the light microscope.', 3600); }
  if (ev.emerged) hud.toast(`Prey ${S.prey} of ${GOAL_PREY} eaten. (In life the predator divides inside and the progeny burst out hours later.)`, 3400);
  if (ev.gramPos) hud.toast('Gram-positive: no periplasm, so Bdellovibrio cannot get in');
  if (ev.divide) hud.toast('Growing to divide: each daughter will get half the magnetosome chain', 2400);
  if (ev.divided) { pad.rumble(300, 0.5, 0.5); hud.toast(`Divided! (${S.divisions}) Two cells now swim the band. Keep feeding.`, 3000); }
  if (ev.contracted) hud.toast('The peritrich jerked back on its coiling stalk: its current stops for a moment');
  if (ev.bump && Math.random() < 0.02) hud.toast('A clay grain, bigger than you');
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  pad.poll();
  unlockOnPad();
  blocked = features.update();
  if (!blocked) hud.update(pad);
  const live = !blocked;
  const inp = { attack: false, attackPressed: false, focusing: false, steer: null };
  if (live) {
    const ls = ctl.move();
    // the stick in world axes (screen up = world +y, toward the air)
    if (ls.m > 0) inp.steer = { x: ls.x, y: -ls.y, m: Math.min(1, ls.m) };
    if (S.alive) {
      if (ctl.defend.pressed()) {
        const bias = swimmer.opts.bias && ls.m > 0.3 ? { x: ls.x, y: -ls.y } : null;
        if (swimmer.tumble(bias)) {
          audio.play('bacterium/tumble', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
          pad.rumble(40, 0.2, 0);
          if (S.attacker) { S.attacker.cooldown = 4; S.attacker.prey = null; S.attacker = null; bdelloH.missed(); hud.toast('Tumbled free of the Bdellovibrio'); }
        }
      }
      if (ctl.lb.pressed() || ctl.rb.pressed()) { if (swimmer.reverse()) hud.toast(S.species === 'mtb' ? (S.sense > 0 ? 'Reversed: swimming north, along the field (down)' : 'Reversed: swimming south, against the field (up)') : 'Reversed'); }
      if (ctl.dash.pressed() && dash.trigger()) doDash();
      inp.attack = ctl.attack.down();
      inp.attackPressed = ctl.attack.pressed();
    } else if (!S.caught && S.overT > 1 && (ctl.dash.pressed() || ctl.attack.pressed())) setSpecies(S.species);
    if (ctl.special.pressed()) features.set('overlay', !view.overlay);
    const ls2 = ctl.lookStep();
    if (ls2) cycleLook(ls2);
    const zs = ctl.zoomStep();
    if (zs) { view.zoom = Math.max(0, Math.min(ZOOMS.length - 1, view.zoom + zs)); hud.toast(view.zoom === 0 ? 'Field 180 µm: the whole eyepiece field at 1000×' : `Field ${ZOOMS[view.zoom]} µm: a camera crop (empty magnification, no new detail)`); }
    const an = ctl.analog();
    if (Math.abs(an) > 0.05) { view.focus = Math.max(-3, Math.min(3, view.focus + an * 1.5 * dt)); inp.focusing = true; }
    const rs = ctl.camera();
    const half = ZOOMS[view.zoom] / 2;
    view.stage.x = Math.max(-half, Math.min(half, view.stage.x + rs.x * half * dt));
    view.stage.y = Math.max(-half, Math.min(half, view.stage.y - rs.y * half * dt));
    if (rs.m === 0) view.stage.multiplyScalar(Math.exp(-dt * 0.8));
  }
  if (!debug.freeze) tick(dt, inp);
  else S.dashOn = dash.active;
  // oxygen and starvation: the cell is seen to stop and fade before the card (catches use shared/predation.js's card)
  if (!S.alive && !S.caught && S.overT > (S.over === 'won' ? 0 : 1.2)) showEnd();
  if (S.alive && S.overT === 0 && !S.over && card.classList.contains('show')) card.classList.remove('show');
  if (!S.alive && !S.caught && S.over !== 'won' && S.overT > 8) setSpecies(S.species);
  warnEl.textContent = capture.active && cat.phase !== 'eaten' ? CATCH[cat.kind][cat.phase] : !S.alive && S.over && S.over !== 'won' && !S.caught ? 'Run over' : '';
  warnEl.style.display = warnEl.textContent ? 'block' : 'none';

  render();
  frames++; fpsT += dt;
  if (fpsT > 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  stats();
}

function showEnd() {
  if (card.classList.contains('show')) return;
  if (S.over === 'won') card.innerHTML = `<h2>Three prey taken</h2><p>The last bdelloplast lyses: five new attack-phase cells swim out. In life this cycle takes three to four hours per prey.</p><p>Press A to hunt again.</p>`;
  else card.innerHTML = `<h2>Run over</h2><p>${S.over}</p><p>Press A to try again (a new cell starts in a few seconds).</p>`;
  card.classList.add('show');
}

function render() {
  const [W, H] = optics.size;
  const fieldH = ZOOMS[view.zoom];
  const umPerPx = fieldH / H;
  const fieldW = W * umPerPx;
  const cx = view.cx + view.stage.x, cy = view.cy + view.stage.y;
  shapes.begin();
  drawer.draw(shapes, t, S, view);
  shapes.end();
  shapes.setView(cx, cy, fieldW, fieldH, umPerPx, view.focus, t);
  renderer.setRenderTarget(optics.field);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(shapes.scene, shapes.camera);
  const look = currentLookKey();
  const stopR = view.stop && view.zoom === 0 ? 90 / umPerPx : 0;
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
  if (view.overlay) {
    const band = S.sp.o2;
    overlay.render(renderer, { center: [cx, cy], size: [fieldW, fieldH], res: [W, H], time: t, band, world, flTex: optics.field.textures[1] });
  }
  // scale bar and oxygen ticks
  const bar = fieldH >= 90 ? 20 : fieldH >= 40 ? 5 : 2;
  const cssPerUm = innerHeight / fieldH;
  const showMark = view.mark && !(S.over && S.over !== 'won' && S.overT > 2.5);
  mark.style.display = showMark ? 'block' : 'none';
  if (showMark) {
    const size = Math.max(26, S.sp.L * cssPerUm + 18);
    const p = S.inside || S;
    mark.style.width = mark.style.height = `${size}px`;
    mark.style.left = `${innerWidth / 2 + (p.x - cx) * cssPerUm - size / 2}px`;
    mark.style.top = `${innerHeight / 2 - (p.y - cy) * cssPerUm - size / 2}px`;
  }
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

function stats() {
  const sp = S.sp;
  const look = currentLookKey();
  const lookName = { phase: 'Phase contrast', fluorescence: 'Fluorescence (pseudo-colour)', darkfield: 'Darkfield', sem: 'SEM (borrowed)', dic: 'DIC (borrowed)' }[look];
  const feel = S.signal > 0.08 ? '↑ getting better: keep running' : S.signal < -0.08 ? '↓ getting worse: tumble?' : '· no change';
  const lines = [
    `${sp.short} · ${lookName} · focus ${view.focus >= 0 ? '+' : ''}${view.focus.toFixed(1)} µm`,
    `speed ${Math.round(S.speed).toString().padStart(3)} µm/s · ${(S.speed / sp.L).toFixed(0)} body lengths/s · ${S.mode === 'tumble' ? 'TUMBLE' : S.boring ? 'BORING IN' : S.inside ? 'INSIDE PREY' : dash.active ? 'SPRINT' : 'run'}${S.mode === 'run' && !S.boring && !S.inside ? (S.steering ? ' · steering (LS)' : swimmer.opts.steer ? ' · adrift: Brownian, flow, field' : '') : ''}`,
    `O₂ ${S.o2 < 1 ? S.o2.toFixed(2) : S.o2.toFixed(1)} % air sat. (wants ${sp.o2[0]}–${sp.o2[1] > 50 ? 'any higher' : sp.o2[1] + ' %'}) ${S.inBand ? '✓ in band' : ''}`,
    `senses: ${feel}`,
    S.species === 'mtb'
      ? `growth ${'█'.repeat(Math.round(S.growth * 10))}${'░'.repeat(10 - Math.round(S.growth * 10))} · food ${S.food.toFixed(2)}${S.feeding ? ' (uptake)' : ''} · O₂ stress ${Math.round(S.stress * 100)} %`
      : `prey ${S.prey}/${GOAL_PREY} · energy ${Math.round(S.energy * 100)} %${S.boring ? ` · boring ${Math.min(100, Math.round((S.boreT / 2.5) * 100))} %` : ''}`,
    `${dash.text()} · phages on you ${S.phages.length}${S.phages.some((p) => p.irreversible) ? ' (IRREVERSIBLE)' : ''}${S.attacker ? ' · BDELLOVIBRIO ATTACHED' : ''}`,
    S.species === 'mtb' ? `field ${world.opts.field} µT, mB/kT ≈ ${(S.mB || 0).toFixed(1)} (gentle pull: steer against it) · running ${S.sense > 0 ? 'north (down the field)' : 'south (up the field)'}` : `run ${sp.v} µm/s, sprint ${sp.dash} µm/s`,
    `predators: ${predators().map((p) => `${p.name} ${!p.on ? 'off' : capture.active && catcherHunger() === p.h ? 'EATING YOU' : hungerText(p.h)}`).join(' · ')}`,
    capture.active ? `CAUGHT by ${CATCH[cat.kind].by.toLowerCase()}: ${cat.phase}` : '',
    `${Math.round(fps)} fps · ${shapes.count} shapes`,
  ];
  hud.stats(lines.filter((l) => l !== '').join('\n'));
}

/** Test hook: start a catch ('grazer' | 'amoeba' | 'phage' | 'bdellovibrio'). */
function forceCapture(kind = 'grazer') {
  if (!S.alive) setSpecies(S.species);
  if (kind === 'grazer') {
    const g = world.grazers[0], P = g.pose;
    debug.teleport(P.mouth.x + P.up.x * 2.5, P.mouth.y + P.up.y * 2.5, Math.atan2(-P.up.y, -P.up.x));
    view.cx = S.x; view.cy = S.y;
    game.catchBy('grazer', g, cat.ev = {});
  } else if (kind === 'amoeba') {
    const A = world.amoeba, c = Math.cos(A.ang), s = Math.sin(A.ang);
    debug.teleport(A.x + s * 2, A.y - c * 2, A.ang);
    game.catchBy('amoeba', A, cat.ev = {});
  } else if (kind === 'phage') {
    debug.phageOnMe();
    const ph = S.phages[S.phages.length - 1];
    ph.irreversible = true;
    game.catchBy('phage', ph, cat.ev = {});
  } else {
    if (S.species !== 'mtb') setSpecies('mtb');
    const b = world.cells.find((c) => c.kind === 'bdello');
    b.x = S.x + Math.cos(S.a) * 3; b.y = S.y + Math.sin(S.a) * 3;
    b.prey = { x: S.x, y: S.y, a: S.a, L: S.sp.L, isPlayer: true }; b.attachT = 0;
    S.attacker = b;
    game.catchBy('bdello', b, cat.ev = {});
  }
  if (cat.ev.caught) startCatch(cat.ev.caught);
  return capture.phase;
}
window.__micro = { forceCapture, capture,
  pacing: () => ({ t: pacing.now - pacing.t0, firstHungry: pacing.firstHungry, firstThreat: pacing.firstThreat, firstCatch: pacing.firstCatch, grace: pacing.grace,
    hunters: predators().map((p) => ({ name: p.name, state: p.h.state, hungry: isHungry(p.h), left: +p.h.left.toFixed(1) })),
    capture: capture.active ? { phase: cat.phase, by: CATCH[cat.kind].by } : null, mode: S.mode, alive: S.alive }),
  world, swimmer, game, view, debug, features, optics, shapes, get t() { return t; }, get dash() { return dash; } };
requestAnimationFrame((n) => { last = n; frame(n); });

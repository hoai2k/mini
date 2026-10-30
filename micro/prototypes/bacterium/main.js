// Bacterium prototype (Level 5 of the Zoom Chain): run and tumble as a
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

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.autoClear = false;
const pad = createPad();
const ctl = createControls(pad);
const hud = mountHud({
  title: 'Bacterium',
  sub: 'A magnetotactic spirillum, 3 µm long, in bog sediment at 1000× (or the predator Bdellovibrio). A bacterium cannot steer: it runs, and chooses when to tumble.',
  controls: hudControls({
    move: 'Tumble bias (assist: the next tumble leans toward the stick)',
    camera: 'Move the stage',
    dash: 'Sprint run: every flagellum at full motor speed (recharges)',
    attack: 'Hold: take up food · Bdellovibrio: attach and bore into prey',
    defend: 'Tumble: stop and turn to a random new heading',
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
document.body.append(card, tag, scaleEl, o2El, mark);

// --- simulation ---
const world = createWorld();
const swimmer = createSwimmer(world);
const game = createGame(world, swimmer);
const drawer = createDrawer(world);
const S = swimmer.state;
let dash = createDash({ duration: 0.6, cooldown: 3 });

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
features.add({ id: 'bias', group: 'Motion', label: 'Tumble bias (LS)', choices: ['Assist: lean toward the stick', 'Honest: fully random'], value: 'Assist: lean toward the stick',
  about: 'A real cell cannot choose its new heading. The assist draws eight tumble angles from the real distribution and keeps the one nearest the stick: still random, but leaning. Honest: the stick does nothing; only WHEN you tumble matters.',
  onChange: (v) => { swimmer.opts.bias = v.startsWith('Assist'); } });
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
features.add({ id: 'npc', group: 'World', label: 'Other bacteria swim', on: true, about: 'E. coli-like rods run and tumble at 18–28 µm/s; other magnetotactic cells swim along the field and reverse by the oxygen sense. Off: everything sits still (Brownian only).', onChange: (on) => { world.opts.npcRun = on; } });
features.add({ id: 'scenery', group: 'World', label: 'Biofilm, EPS, clay, detritus', fixed: true, about: 'An EPS-rich biofilm of attached rods and cocci over clay and silt grains larger than you; matrix strands; decaying detritus flakes at the heart of each food patch.' });
features.add({ id: 'pad', group: 'Controls', label: 'Shared control scheme', fixed: true, about: 'LS tumble bias, RS stage, A sprint, X feed/attach, B tumble, Y data, LT/RT focus, LB/RB reverse, D-pad ←→ look, ↑↓ field, Menu features, View panel.' });
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
  swimmer.reset(sp);
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
  step(n = 1, dt = 1 / 60, inp = {}) { for (let i = 0; i < n; i++) tick(dt, { attack: !!inp.attack, attackPressed: !!inp.attack && i === 0 }); },
};

function doDash() {
  audio.play('bacterium/sprint', { volume: 0.9 });
  const res = swimmer.dash();
  S.dashOn = true;
  pad.rumble(160, 0.5, 0.7);
  if (res === 'shook') hud.toast('Shook the Bdellovibrio off before it could bore in');
  else if (res === 'detached') hud.toast('Let go of the prey');
}

function tick(dt, inp) {
  t += dt;
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
  // focus drifts back to the cell's plane
  if (view.focusFollows && !inp.focusing) view.focus *= Math.exp(-dt * 1.5);
  // camera: the stage follows the cell
  const k = 1 - Math.exp(-dt * 5);
  view.cx += (S.x - view.cx) * k; view.cy += (S.y - view.cy) * k;
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
  const inp = { attack: false, attackPressed: false, focusing: false };
  if (live) {
    const ls = ctl.move();
    if (S.alive) {
      if (ctl.defend.pressed()) {
        const bias = swimmer.opts.bias && ls.m > 0.3 ? { x: ls.x, y: -ls.y } : null;
        if (swimmer.tumble(bias)) {
          audio.play('bacterium/tumble', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
          pad.rumble(40, 0.2, 0);
          if (S.attacker) { S.attacker.cooldown = 4; S.attacker.prey = null; S.attacker = null; hud.toast('Tumbled free of the Bdellovibrio'); }
        }
      }
      if (ctl.lb.pressed() || ctl.rb.pressed()) { if (swimmer.reverse()) hud.toast(S.species === 'mtb' ? (S.sense > 0 ? 'Reversed: swimming north, along the field (down)' : 'Reversed: swimming south, against the field (up)') : 'Reversed'); }
      if (ctl.dash.pressed() && dash.trigger()) doDash();
      inp.attack = ctl.attack.down();
      inp.attackPressed = ctl.attack.pressed();
    } else if (S.overT > 1 && (ctl.dash.pressed() || ctl.attack.pressed())) setSpecies(S.species);
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
  if (!S.alive && S.overT > 0) showEnd();
  if (S.alive && S.overT === 0 && !S.over && card.classList.contains('show')) card.classList.remove('show');
  if (!S.alive && S.over !== 'won' && S.overT > 8) setSpecies(S.species);

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
    `speed ${Math.round(S.speed).toString().padStart(3)} µm/s · ${(S.speed / sp.L).toFixed(0)} body lengths/s · ${S.mode === 'tumble' ? 'TUMBLE' : S.boring ? 'BORING IN' : S.inside ? 'INSIDE PREY' : dash.active ? 'SPRINT' : 'run'}`,
    `O₂ ${S.o2 < 1 ? S.o2.toFixed(2) : S.o2.toFixed(1)} % air sat. (wants ${sp.o2[0]}–${sp.o2[1] > 50 ? 'any higher' : sp.o2[1] + ' %'}) ${S.inBand ? '✓ in band' : ''}`,
    `senses: ${feel}`,
    S.species === 'mtb'
      ? `growth ${'█'.repeat(Math.round(S.growth * 10))}${'░'.repeat(10 - Math.round(S.growth * 10))} · food ${S.food.toFixed(2)}${S.feeding ? ' (uptake)' : ''} · O₂ stress ${Math.round(S.stress * 100)} %`
      : `prey ${S.prey}/${GOAL_PREY} · energy ${Math.round(S.energy * 100)} %${S.boring ? ` · boring ${Math.min(100, Math.round((S.boreT / 2.5) * 100))} %` : ''}`,
    `${dash.text()} · phages on you ${S.phages.length}${S.phages.some((p) => p.irreversible) ? ' (IRREVERSIBLE)' : ''}${S.attacker ? ' · BDELLOVIBRIO ATTACHED' : ''}`,
    S.species === 'mtb' ? `field ${world.opts.field} µT, mB/kT ≈ ${(S.mB || 0).toFixed(1)} · running ${S.sense > 0 ? 'north (down the field)' : 'south (up the field)'}` : `run ${sp.v} µm/s, sprint ${sp.dash} µm/s`,
    `${Math.round(fps)} fps · ${shapes.count} shapes`,
  ];
  hud.stats(lines.join('\n'));
}

window.__micro = { world, swimmer, game, view, debug, features, optics, shapes, get t() { return t; }, get dash() { return dash; } };
requestAnimationFrame((n) => { last = n; frame(n); });

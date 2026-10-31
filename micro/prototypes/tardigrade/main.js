// Tardigrade: climbing moss-leaf cell walls with your claws while the water
// film dries ("The Drying"). Seen through a DIC microscope.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { createControls, createDash, hudControls, addInvertY } from '../shared/controls.js';
import { mountHud } from '../shared/hud.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { DicMicroscope } from '../shared/techniques/tardigrade-dic.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, AMOEBA_MODES, PARAMECIUM_MODES } from '../shared/techniques/adapters.js';
import { legOffset } from '../shared/techniques/mite-gait.js';
import { World, Particles, LAYER_SUBSTRATE, LAYER_SPECIMEN } from './world.js';
import { Creature } from './creature.js';
import { Walker, GAITS, setGait, setGaitWith } from './gait.js';
import { Life, COMPRESSIONS } from './life.js';
import { Predator } from './predator.js';
import { wireAssets } from './textures.js';
import { LEAF_FX } from './materials.js';

const MODES = ['DIC (Nomarski)', 'Brightfield', 'Lit (hypothetical)'];
// The second entry is the 10× objective behind a 1.25× intermediate
// magnification changer (an Optovar, as on Zeiss stands): 12.5× overall.
const OBJECTIVES = [
  { name: '10×/0.25', field: 18, coc: 12, dof: 0.06 },
  { name: '10×/0.25 · 1.25× Optovar', field: 14.4, coc: 14, dof: 0.05 },
  { name: '20×/0.40', field: 9, coc: 10, dof: 0.035 },
  { name: '40×/0.65', field: 4.6, coc: 20, dof: 0.018 },
];

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
// Software GL (SwiftShader, as in headless checks) cannot afford full-screen
// float passes at full size: draw small and let the browser scale it up.
const glInfo = (() => {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
})();
const SOFTWARE = /swiftshader|llvmpipe|software/i.test(glInfo);
const PR = Number(new URLSearchParams(location.search).get('pr')) || 0; // testing override
renderer.setPixelRatio(PR || (SOFTWARE ? 0.4 : Math.min(devicePixelRatio, 1.5)));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(22, 1, 0.5, 200);
camera.layers.enableAll();
// Lit look only.
const hemi = new THREE.HemisphereLight(0xf2f6e8, 0x41502c, 1.1);
const sun = new THREE.DirectionalLight(0xfff4dc, 2.2);
sun.position.set(4, 10, 3);
for (const l of [hemi, sun]) { l.layers.enableAll(); scene.add(l); }
scene.add(sun.target);

const pad = createPad();
const ctl = createControls(pad);
const hud = mountHud({
  title: 'Tardigrade · The Drying',
  sub: 'A ~350 µm eutardigrade gripping moss-leaf cell walls in a drying water film, stalked by a Milnesium. Differential interference contrast (DIC) look.',
  controls: hudControls({
    move: 'Crawl (relative to the view); push into a leaf edge to reach across',
    camera: 'Turn and tilt the view (up looks up)',
    dash: 'Scramble: a burst of fast wave gait (costs water and reserves)',
    attack: 'Pierce with the stylets: feed, or jab a Milnesium so it backs off',
    defend: 'Hold: grip hard / brace (slower, won’t slip)',
    special: 'Hold: curl into a tun (again: wake, if wet)',
    analog: 'Fine focus down / up',
    secondary: 'Anatomy labels / rain (test)',
    look: 'Optical look: DIC / brightfield / lit',
    zoom: 'Magnification 10× / 12.5× / 20× / 40×',
    extra: [['LS click', 'Refocus on the animal'], ['RS click', 'New day (test)']],
  }),
  note: '1 s = 4 min of the day (240×; change it in Features). Walking and feeding are real time: up to ~225 µm/s, at the fast end of the measured range; the scramble (~400 µm/s) is a stretch. Claws drawn 1.6× longer, ~3× thicker than true. DIC relief is optical path, not height.',
});

const toast = (t, ms) => hud.toast(t, ms);
const world = new World(scene);
const assets = wireAssets(world);
const particles = new Particles(scene, assets.atlas);
const creature = new Creature(scene);
let rumbleOn = true;
const rumble = (ms, w, s) => { if (rumbleOn) pad.rumble(ms, w, s); };
let catchBudget = 0;
const audio = createAudio(['tardigrade/amb-film', 'tardigrade/step', 'tardigrade/dash', 'tardigrade/bite', 'tardigrade/tun', 'tardigrade/revive', 'tardigrade/rain', 'tardigrade/milnesium']);
audio.loop('tardigrade/amb-film', { volume: 0.6 });
const snd = { t: 0, lastStep: -1, side: 1, state: 'active', feeding: false, rain: false };
/** Gamepads fire no DOM events: unlock sound on any pad button. */
function unlockOnPad() {
  if (pad.kind !== 'controller') return;
  for (let b = 0; b < 16; b++) if (pad.value(b) > 0.5) { audio.unlock(); return; }
}
/** A claw hooks a wall: a footfall, at most ~8 a second, alternating sides. */
function footstep(q = 0.5) {
  if (snd.t - snd.lastStep < 0.13) return;
  snd.lastStep = snd.t; snd.side = -snd.side;
  audio.play('tardigrade/step', { volume: 0.3 + 0.15 * Math.random() + 0.1 * q, rate: 0.9 + Math.random() * 0.25, pan: 0.3 * snd.side });
}
const walker = new Walker(world, creature, {
  catch(q, big) {
    if (big) { rumble(180, 0.35, 0.6); footstep(1); return; }
    footstep(q);
    if (catchBudget <= 0) { rumble(45, 0.04, 0.12 + 0.12 * q); catchBudget = 0.12; }
  },
  slip() { toast('Losing grip! Hold A to brace'); rumble(400, 0.5, 0.2); },
  fall(t) { toast(t, 2600); rumble(300, 0.6, 0.8); },
  transfer(t) { toast(t); rumble(120, 0.15, 0.3); },
});
const life = new Life(world, walker, creature, { toast, rumble, newDay: () => predator.reset() });
const predator = new Predator(scene, world, { toast, rumble });
const dash = createDash({ duration: 0.9, cooldown: 2.6 });
const mic = new DicMicroscope(renderer, scene, camera, { layers: [LAYER_SUBSTRATE, LAYER_SPECIMEN], backdrop: assets.backdrop });
if (SOFTWARE) mic.setQuality(PR ? 2 : 0);

// ---------------------------------------------------------------- view state
// Starts at 12.5× (10× with the 1.25× Optovar: 1.6× the 20× field) so the
// leaf, the film and the surroundings read while the animal stays readable;
// D-pad down steps out to 10×, up in to 20× and 40×.
const view = { yaw: -0.35, pitch: 1.18, obj: 1, manualFocusT: 99, focus: 0, mode: 0, labels: false, target: new THREE.Vector3(), claws: 1, internals: true, sway: true };
view.target.copy(walker.dispPos);

function applyMode(m) {
  view.mode = m;
  mic.mode = Math.min(m, 1);
  scene.traverse((o) => { if (o.userData && o.userData.opt) o.material = m === 2 ? o.userData.lit : o.userData.opt; });
  scene.background = m === 2 ? new THREE.Color(0x6f7d5c) : null;
  scene.fog = m === 2 ? new THREE.Fog(0x6f7d5c, 14, 60) : null;
}

// ---------------------------------------------------------------- features
const features = createFeatures({ key: 'tardigrade', pad });
const F = (o) => features.add(o);
audio.addToFeatures(features);
F({ id: 'look', group: 'Rendering', label: 'Optical look', choices: MODES, value: MODES[0],
  about: 'DIC: relief from the gradient of optical path along one shear direction. Brightfield: pigment plus faint refractive edges. Lit: a hypothetical immersive view with ordinary lights (not what a microscope records). D-pad left/right cycles it.',
  onChange: (v) => applyMode(MODES.indexOf(v)) });
F({ id: 'opd', group: 'Rendering', label: 'Optical-path buffers (thickness from closed meshes)', fixed: true,
  about: 'Every transparent object adds Δn·thickness, depth·thickness and pigment into two float targets at once (MRT, additive, double sided): front faces subtract their depth, back faces add it, so each pixel holds the chord through the object. Shared as shared/techniques/tardigrade-dic.js.' });
F({ id: 'dof', group: 'Optics', label: 'Shallow depth of field (focal plane)', on: true,
  about: 'Leaves and specimen are two layers, each blurred by its own mean depth from the focal plane (gather blur). LT/RT turn the fine focus through them. Off: everything sharp.',
  onChange: (v) => (mic.opts.dof = v) });
F({ id: 'autofocus', group: 'Optics', label: 'Auto-focus on the animal', on: true,
  about: 'The focal plane follows the animal as it walks. Turning the fine focus (LT/RT) holds your setting while you stand still; walk on and it eases back onto the animal. LS click refocuses at once.',
  onChange: (v) => (view.autoFocus = v) });
F({ id: 'fringes', group: 'Optics', label: 'Three-wavelength interference', on: true,
  about: 'Evaluates sin²(π Γ/λ) at red, green and blue wavelengths, giving the warm shadows and cool highlights of real DIC. Off: one wavelength, pure grey.',
  onChange: (v) => (mic.opts.fringes = v) });
F({ id: 'shear', group: 'Optics', label: 'Shear × bias (relief strength)', choices: ['Standard', 'Subtle', 'Strong'], value: 'Standard',
  about: 'How far apart the two beams are and the bias retardation: more shear, stronger one-sided relief.',
  onChange: (v) => { mic.opts.shear = { Standard: 260, Subtle: 120, Strong: 600 }[v]; mic.opts.bias = { Standard: 95, Subtle: 80, Strong: 110 }[v]; } });
F({ id: 'angle', group: 'Optics', label: 'Shear direction', choices: ['45°', '135°', '0°', '90°'], value: '45°',
  about: 'The fixed direction of the prism shear on screen: relief is lit along this axis only, so a wall parallel to it vanishes (true of real DIC).',
  onChange: (v) => (mic.opts.angle = (parseFloat(v) * Math.PI) / 180) });
F({ id: 'grain', group: 'Rendering', label: 'Camera grain', on: true, about: 'Faint per-frame sensor noise.', onChange: (v) => (mic.opts.grain = v) });
F({ id: 'vignette', group: 'Rendering', label: 'Vignette', on: true, about: 'Light fall-off towards the edge of the field.', onChange: (v) => (mic.opts.vignette = v) });
F({ id: 'backdrop', group: 'Rendering', label: 'Out-of-focus backdrop (MP-T03)', on: true,
  about: 'A deeply defocused moss layer behind everything, as soft retardation. Procedural stand-in until the image arrives.', onChange: (v) => (mic.opts.backdrop = v) });
F({ id: 'walls', group: 'World', label: 'Cell walls as optical path', on: true,
  about: 'Raised cell walls, domed cells, costa: drawn per pixel in the leaf shader from the same pattern the claws use, so every foothold is a visible wall.', onChange: (v) => (LEAF_FX.uFx.value.x = v ? 1 : 0) });
F({ id: 'chloro', group: 'World', label: 'Chloroplasts', on: true, about: 'Lens-shaped green plastids lining each living cell: the only strong colour in the field. Cells you have sucked dry lose them.', onChange: (v) => (LEAF_FX.uFx.value.y = v ? 1 : 0) });
F({ id: 'film', group: 'World', label: 'Water film', on: true, about: 'Film thickness = capacity - dryness, as optical path (water vs air Δn 0.33): it shows as menisci and contact lines, not as blue water.', onChange: (v) => (LEAF_FX.uFx.value.z = v ? 1 : 0) });
F({ id: 'meniscus', group: 'World', label: 'Contact-line steepening', on: true, about: 'Film thickness rises as √h from the contact line, so a retreating meniscus is a sharp edge in DIC. Off: linear, soft.', onChange: (v) => (LEAF_FX.uFx.value.w = v ? 1 : 0) });
F({ id: 'artwalls', group: 'World', label: 'Footholds read from the delivered micrographs', fixed: true,
  about: 'When MP-T01/T02 arrive, wallmap.js finds the walls in the image (gradient threshold + chamfer distance transform) and labels the cells (flood fill): the claws hook the walls you see, a pierced cell empties as a whole, and the shader takes colour from the photo but relief from the wall map, so it follows this microscope’s shear.' });
F({ id: 'particles', group: 'World', label: 'Drifting bacteria and detritus', on: true, about: 'Point sprites from a 4×4 atlas (MP-T04 stand-in) in Brownian drift; they stop where the film has gone.', onChange: (v) => (particles.points.visible = v) });
F({ id: 'sdf', group: 'Body', label: 'SDF body from anatomical parts', fixed: true,
  about: 'Head, four trunk regions with cuticle folds, eight lobopod legs (IV terminal, backwards), meshed once with surface nets; buccal tube, stylets, pharyngeal bulb with placoids, eyespots, midgut, gonad and storage cells as separate meshes inside.' });
F({ id: 'internals', group: 'Body', label: 'Internal anatomy visible', on: true, about: 'Show the organs through the translucent cuticle.', onChange: (v) => { view.internals = v; for (const r of creature.internals) r.mesh.visible = v; } });
F({ id: 'claws', group: 'Body', label: 'Claw size', choices: ['Enhanced (1.6× long, ~3× thick)', 'True size'], value: 'Enhanced (1.6× long, ~3× thick)',
  about: 'Real claws are ~10 µm: barely a few pixels at 20×. Enhanced so the grip reads.', onChange: (v) => (view.claws = v.startsWith('True') ? 0.62 : 1) });
F({ id: 'rig', group: 'Body', label: 'Part rig on the CPU', fixed: true,
  about: 'Each vertex knows its part: legs stretch and turn from hip to foot (telescoping lobopods), the trunk carries a travelling lateral wave and the tun contraction, blended where parts meet.' });
F({ id: 'sway', group: 'Motion', label: 'Soft-body sway and surge', on: true, about: 'The trunk bends side to side with the gait and surges with each wave of legs.', onChange: (v) => (view.sway = v) });
let miteGait = false;
F({ id: 'gait', group: 'Motion', label: 'Leg coordination', choices: Object.keys(GAITS), value: Object.keys(GAITS)[0],
  about: 'Measured in Hypsibius (Nirody et al. 2021): steps run back to front along each side, the sides half a cycle apart, a tetrapod-like pattern. Alternatives for comparison.', onChange: (v) => { if (!miteGait) setGait(v); } });
F({ id: 'footholds', group: 'Motion', label: 'Claws need cell walls', on: true,
  about: 'Each foot searches for the nearest wall within reach and hooks it; junctions and walls across the pull hold best. Off: feet grip anywhere.', onChange: (v) => (walker.opts.footholds = v) });
F({ id: 'gravity', group: 'Motion', label: 'Slope load and slipping (exaggerated)', on: true,
  about: 'Steep and overhanging faces need more claws planted, or the animal slides. Real 0.35 mm animals are held mainly by surface tension; this is a game rule.', onChange: (v) => (walker.opts.gravity = v) });
F({ id: 'time', group: 'Simulation', label: 'Time compression', choices: Object.keys(COMPRESSIONS), value: Object.keys(COMPRESSIONS)[0],
  about: 'How fast the day (and so the drying) runs. Walking and feeding stay real time.', onChange: (v) => (life.compression = COMPRESSIONS[v]) });
F({ id: 'desic', group: 'Simulation', label: 'Desiccation', on: true, about: 'Dry leaf drains the water meter; empty, it forces a hasty tun.', onChange: (v) => (life.opts.desiccation = v) });
F({ id: 'risk', group: 'Simulation', label: 'Revival risk', on: true, about: 'A tun may not wake: worse after a hasty tun, on low reserves and long droughts.', onChange: (v) => (life.opts.risk = v) });
F({ id: 'capacity', group: 'Simulation', label: 'Film capacity field', fixed: true,
  about: 'Per leaf: wetter towards the stem, in random hollows and where another leaf nearly touches (capillary bridges); margins dry first. Film = capacity - dryness, which climbs through the day.' });
F({ id: 'labels', group: 'Controls', label: 'Anatomy labels', on: false, about: 'Name the claws, leg IV, buccal tube, bulb, eyespot, gut and storage cells (LB).', onChange: (v) => (view.labels = v) });
F({ id: 'rumble', group: 'Controls', label: 'Rumble', on: true, about: 'A small knock as each claw hooks a wall; heavy on slips and falls; a kick on each scramble and on a Milnesium bite.', onChange: (v) => (rumbleOn = v) });
F({ id: 'scramble', group: 'Motion', label: 'Scramble (A)', fixed: true,
  about: 'A 0.9 s burst of the same back-to-front wave gait at about 1.8× the walking pace (~400 µm/s, strides up to ~90% longer, swings as short as 90 ms), recharging over 2.6 s. Each costs ~3.5% water and 2% reserves. A stretch: the fastest walking measured in Hypsibius is ~260 µm/s.' });
F({ id: 'smooth', group: 'Motion', label: 'Smoothed trunk and camera', on: true,
  about: 'The trunk follows its target through three lags in series, and a change of face (a transfer, the leaf margin, a fall) blends the old pose out over a smootherstep, so position, velocity and acceleration stay continuous. Slipping uses grip hysteresis (slide below 85% of the load for 0.6 s, catch at 75%). Off: the old single lag.',
  onChange: (v) => (walker.opts.smooth = v) });
F({ id: 'milnesium', group: 'Simulation', label: 'Milnesium (predator)', on: true,
  about: 'A predatory tardigrade 1.5× your size with a wide buccal tube and no placoids. It starts far off on leaf C and browses for the first 40 s; then it closes in slowly (you see it coming), stalks you within ~650 µm and bites (reserves drain; empty, you are eaten). After a bite it lets go and keeps off for ~11 s. Escape: scramble (A), retreat into film too thin for its body (it barely moves below ~3.5 µm of water), jab it with the stylets (X) so it backs off, or tun (Y): it cannot get a tun into its mouth quickly and gives up after three tries. The thin-film refuge, the recoil and the tun giving-up are game rules.',
  onChange: (v) => { predator.on = v; predator.setVisible(v); } });
addInvertY(features);
F({ id: 'camrel', group: 'Controls', label: 'Camera-relative crawl', fixed: true, about: 'The stick direction on screen is projected onto the leaf the animal is on.' });

// ---------------------------------------------------------------- borrowed (default off)
const looks = createBorrowedLooks(renderer);
const borrow = borrowedSwitches(features);
const bmode = { amoeba: 0, par: 0 };
const leafMeshes = new Set(world.leaves.map((l) => l.mesh));
const bodyMeshes = new Set();
creature.group.traverse((o) => bodyMeshes.add(o));
borrow.add({ id: 'semMite', label: 'SEM (scanning electron microscope)', from: 'mite',
  about: 'The real geometry drawn into the mite\'s G-buffer (normal, material, depth in µm) and shaded by its secondary-electron composite: secant-law tilt contrast, edge glow, detector shadowing, crevice darkening, shot noise. Physically odd: a hydrated animal in a water film cannot go into a vacuum, and the cell walls (drawn per pixel by the optical leaf shader) are missing, so the leaves are bare slabs.',
  onChange: (v) => { if (v && view.mode === 2) features.set('look', MODES[0]); } });
F({ id: 'semMiteMode', group: 'Borrowed', label: 'SEM detector', from: 'mite', choices: SEM_LOOKS, value: SEM_LOOKS[0],
  about: 'SE (topography), BSE (composition: everything here is light organic matter, so it is flat) or false colour (animal amber, leaves green).', onChange: (v) => looks.semMode(SEM_LOOKS.indexOf(v)) });
const FIELD = 'The DIC optical-path and pigment buffers (after the focal-plane blur) handed to another microscope\'s image formation, so the focus and depth of field still work.';
borrow.add({ id: 'opticsAmoeba', label: 'Amoeba property optics', from: 'amoeba',
  about: `Brightfield with transport-of-intensity defocus contrast, phase contrast, darkfield or the immersive lit view. ${FIELD}`,
  onChange: (v) => { if (v && view.mode === 2) features.set('look', MODES[0]); } });
F({ id: 'opticsAmoebaMode', group: 'Borrowed', label: 'Amoeba method', from: 'amoeba', choices: AMOEBA_MODES, value: AMOEBA_MODES[0],
  about: 'Which optical method the amoeba switch above uses.', onChange: (v) => (bmode.amoeba = AMOEBA_MODES.indexOf(v)) });
borrow.add({ id: 'microscopeParamecium', label: 'Paramecium microscope', from: 'paramecium',
  about: `Darkfield, phase contrast (with the phase-ring halo), brightfield, the paramecium's simpler DIC or its lit view. ${FIELD}`,
  onChange: (v) => { if (v && view.mode === 2) features.set('look', MODES[0]); } });
F({ id: 'microscopeParameciumMode', group: 'Borrowed', label: 'Paramecium technique', from: 'paramecium', choices: PARAMECIUM_MODES, value: PARAMECIUM_MODES[0],
  about: 'Which technique the paramecium switch above uses.', onChange: (v) => (bmode.par = PARAMECIUM_MODES.indexOf(v)) });
features.add({ id: 'miteGait', group: 'Borrowed', label: 'Arachnid alternating tetrapod gait', from: 'mite', on: false,
  about: 'The mite\'s gait offsets (mite-gait.js) on the eight lobopods: diagonal groups {L1 R2 L3 R4} and {R1 L2 R3 L4} alternate, with a slight back-to-front lag. Not what tardigrades do (they run a back-to-front wave), here to compare. Overrides Leg coordination while on.',
  onChange: (v) => {
    miteGait = v;
    if (v) setGaitWith((L) => legOffset('tetrapod', L.pair, L.name.endsWith('L') ? 0 : 1, 4));
    else setGait(features.get('gait'));
  } });

// ---------------------------------------------------------------- labels
const labelBox = document.createElement('div');
labelBox.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:12px system-ui,sans-serif;color:#fff';
document.body.appendChild(labelBox);
const labelEls = Object.keys(creature.anchors).map((name) => {
  const d = document.createElement('div');
  d.textContent = name;
  d.style.cssText = 'position:absolute;transform:translate(8px,-50%);background:rgba(10,12,16,.6);padding:1px 6px;border-radius:6px;white-space:nowrap';
  const dot = document.createElement('i');
  dot.style.cssText = 'position:absolute;left:-8px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#ffd36e';
  d.appendChild(dot);
  labelBox.appendChild(d);
  return { name, d };
});

// ---------------------------------------------------------------- loop
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const b = renderer.getDrawingBufferSize(new THREE.Vector2());
  mic.setSize(b.x, b.y);
}
addEventListener('resize', resize);
resize();

let last = performance.now();
let time = 0;
const dirV = new THREE.Vector3(), right = new THREE.Vector3(), upS = new THREE.Vector3();
applyMode(view.mode);

window.__micro = { SOFTWARE, scene, camera, renderer, world, walker, creature, life, mic, view, features, applyMode, pad, predator, dash };

function frame() {
  const now = performance.now();
  const rawDt = (now - last) / 1000;
  last = now;
  const dt = Math.min(view.dtMax || 0.05, rawDt);
  if (view.mode !== 2 && !SOFTWARE) mic.autoQuality(rawDt);
  time += dt;
  catchBudget -= dt;
  pad.poll();
  unlockOnPad();
  snd.t += dt;
  const inMenu = features.update();
  hud.update(pad);
  const B = pad.BTN;
  const P = (b) => !inMenu && pad.pressed(b);
  const D = (b) => !inMenu && pad.down(b);

  const look = inMenu ? 0 : ctl.lookStep();
  if (look) { const m = (view.mode + look + 3) % 3; features.set('look', MODES[m]); toast(MODES[m]); }
  const zs = inMenu ? 0 : ctl.zoomStep();
  if (zs < 0 && view.obj > 0) { view.obj--; toast(`Objective ${OBJECTIVES[view.obj].name}`); }
  if (zs > 0 && view.obj < OBJECTIVES.length - 1) { view.obj++; toast(`Objective ${OBJECTIVES[view.obj].name}`); }
  if (P(B.RB)) life.rain();
  if (P(B.RS)) { life.newDay(); toast('A new day: 05:00, dew-soaked'); }
  if (P(B.LB)) features.set('labels', !view.labels);
  if (P(B.LS)) { view.focus = 0; toast('Refocused on the animal'); }
  // RS: yaw, and pitch by intent (up = look up: the camera swings down).
  const lk = inMenu ? { yaw: 0, pitch: 0 } : ctl.look();
  view.yaw -= lk.yaw * dt * 1.6;
  view.pitch = THREE.MathUtils.clamp(view.pitch - lk.pitch * dt * 1.2, 0.35, 1.52);
  const fin = inMenu ? 0 : ctl.analog();
  view.focus = THREE.MathUtils.clamp(view.focus - fin * dt * 0.8, -3, 3);
  // Auto-focus: the focal plane follows the animal (focus 0 is its mid-depth).
  // A manual turn of the fine focus holds for 4 s of standing still; once the
  // animal walks off, the focus eases back onto it.
  view.manualFocusT = Math.abs(fin) > 0.05 ? 0 : view.manualFocusT + dt;
  if (view.autoFocus !== false && view.manualFocusT > 4 && (walker.speed > 0.05 || view.manualFocusT > 8)) view.focus *= Math.exp(-dt / 0.6);

  // A: the scramble.
  dash.update(dt);
  if (!inMenu && ctl.dash.pressed() && life.state === 'active') {
    if (life.frozen || walker.slipping) { /* curled, feeding or sliding: no scramble */ }
    else if (life.energy < 0.04) toast('Too weak to scramble: feed first');
    else if (dash.trigger()) {
      audio.play('tardigrade/dash', { volume: 0.9 });
      life.desic = Math.min(1, life.desic + 0.035);
      life.energy = Math.max(0, life.energy - 0.02);
      rumble(160, 0.25, 0.55);
    }
  }

  // Camera-relative crawl direction.
  const ls = inMenu ? { x: 0, y: 0, m: 0 } : ctl.move();
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  upS.setFromMatrixColumn(camera.matrixWorld, 1);
  dirV.set(0, 0, 0).addScaledVector(right, ls.x).addScaledVector(upS, -ls.y);
  const film = life.filmHere();
  const filmF = film < 0.03 ? 0.3 : (0.4 + 0.6 * THREE.MathUtils.smoothstep(film, 0.03, 0.3)) * (film > 1.1 ? 0.7 : 1);
  const dashing = dash.active && !life.frozen;
  if (dashing && ls.m < 0.2) dirV.copy(walker.forward); // no stick: scramble straight ahead
  walker.update(dt, { dir: dirV, mag: dashing ? Math.max(ls.m, 1) : ls.m, brace: D(B.B), frozen: life.frozen, film: filmF, energy: life.energy, tun: life.tun > 0.02, dash: dashing });
  if (!view.sway) { creature.pose.sway = 0; creature.pose.surge = 0; creature.pose.bob = 0; }
  // X: a jab at a Milnesium whose head is at your mouth takes priority over feeding.
  const xPressed = P(B.X);
  const myMouth = creature.anchorWorld('buccal tube + stylets', new THREE.Vector3());
  const pev = predator.update(dt, { walker, life, mouth: myMouth }, xPressed && life.state === 'active' && !life.feeding);
  const jabbed = pev.includes('recoil');
  life.update(dt, { yDown: D(B.Y), yPressed: P(B.Y), bitePressed: xPressed && !jabbed, aPressed: P(B.A), moving: walker.speed });
  // life-state transitions: the tun, the revival, rain, a stylet bite
  if (life.state !== snd.state) {
    if (life.state === 'tun') audio.play('tardigrade/tun');
    else if (life.state === 'revive') audio.play('tardigrade/revive');
    snd.state = life.state;
  }
  const raining = life.rainT > 0;
  if (raining && !snd.rain) audio.play('tardigrade/rain', { volume: 0.8 });
  snd.rain = raining;
  const feeding = !!life.feeding;
  if (feeding && !snd.feeding) audio.play('tardigrade/bite', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
  snd.feeding = feeding;
  for (const e of pev) {
    if (e === 'bite' || e === 'tunBite') audio.play('tardigrade/milnesium', { volume: e === 'bite' ? 1 : 0.6 });
    else if (e === 'stalk') audio.play('tardigrade/milnesium', { volume: 0.45, rate: 0.85 });
    else if (e === 'hunt') audio.play('tardigrade/milnesium', { volume: 0.25, rate: 0.75 });
    else if (e === 'recoil') audio.play('tardigrade/bite', { volume: 1, rate: 0.85 });
    if (e === 'recoil') { toast('Stylets into its head: the Milnesium backs off'); rumble(220, 0.5, 0.4); creature.pose.stylet = 1; }
    else if (e === 'stalk') toast('A Milnesium has your scent: scramble (A), jab (X) or tun (Y)', 2600);
    else if (e === 'hunt') toast('Something large is moving in the film…', 2600);
    else if (e === 'tunBite') { toast('The Milnesium mouths your tun but cannot get it in'); rumble(120, 0.2, 0.3); }
    else if (e === 'givesUp') toast('The Milnesium gives up on the tun and wanders off');
    else if (e === 'bite') {
      life.energy = Math.max(0, life.energy - 0.2);
      life.feeding = null;
      walker.speed = 0;
      rumble(300, 0.8, 0.9);
      if (life.energy <= 0.001) life.eaten();
      else toast(`Milnesium bites! Reserves ${Math.round(life.energy * 100)}%. It lets go and backs off, for now`, 2600);
    }
  }

  // Creature rig.
  creature.group.matrix.copy(walker.matrix);
  creature.group.matrixWorldNeedsUpdate = true;
  creature.deformAll();
  if (view.claws !== 1) for (const c of creature.claws) { const s = view.claws; c.matrix.multiply(new THREE.Matrix4().makeScale(s, s, s)); }
  if (view.mode === 2 || borrow.id === 'semMite') creature.refreshNormals();
  particles.update(dt, walker.dispPos, walker.leaf, walker.side, world);

  // Camera orbit on the animal.
  const ob = OBJECTIVES[view.obj];
  const dist = ob.field / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, camera.aspect) * 1.0;
  view.dist = THREE.MathUtils.lerp(view.dist || dist, dist, 1 - Math.exp(-dt * 4));
  view.target.lerp(walker.dispPos, 1 - Math.exp(-dt * 3));
  camera.position.set(
    view.target.x + view.dist * Math.cos(view.pitch) * Math.sin(view.yaw),
    view.target.y + view.dist * Math.sin(view.pitch),
    view.target.z + view.dist * Math.cos(view.pitch) * Math.cos(view.yaw),
  );
  if (view.fixed) { // turnaround shots (testing): orbit in the animal's own frame
    const { yaw, pitch } = view.fixed;
    const off = new THREE.Vector3(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)).multiplyScalar(view.fixed.dist || 9);
    view.target.copy(walker.dispPos);
    camera.up.set(0, 1, 0).applyQuaternion(walker.dispQuat);
    camera.position.copy(walker.dispPos).add(off.applyQuaternion(walker.dispQuat));
  }
  camera.lookAt(view.target);
  camera.updateMatrixWorld();
  sun.target.position.copy(view.target);

  // Render.
  const H = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
  const ref = camera.position.distanceTo(walker.dispPos);
  const pxPerUnit = H / (2 * ref * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  for (const m of [particles.optMat]) m.uniforms.uPx.value = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  // The lit look swaps in ordinary materials, so the optical buffers would be empty.
  if (borrow.id && borrow.id !== 'semMite' && view.mode === 2) features.set(borrow.id, false);
  const micP = { ref, focus: view.focus, cocPerUnit: ob.coc, dof: ob.dof, pxPerUnit, time, backOff: new THREE.Vector3(view.yaw * 0.15, view.pitch * 0.1, 1) };
  if (borrow.id === 'semMite') {
    looks.semScene(scene, camera, { dt, umPerUnit: 100, cls: (o) => (bodyMeshes.has(o) ? CLS.CUTICLE : leafMeshes.has(o) ? CLS.LEAF : CLS.LITTER) });
  } else if (borrow.id) {
    // Optical-path units are scene units (100 µm): ×100 gives µm of path.
    const { a, b } = mic.render({ ...micP, buffersOnly: true });
    looks.fieldFromBuffers(a.width, a.height, { a: { opd: a.textures[0], abs: a.textures[1] }, b: { opd: b.textures[0], abs: b.textures[1] }, opdK: 100, absK: 1 });
    if (borrow.id === 'opticsAmoeba') looks.amoeba({ mode: bmode.amoeba, focus: 0.6, time, umPerPx: 100 / pxPerUnit, phaseK: 0.3, odK: 1 });
    else looks.paramecium({ mode: bmode.par, time, opdK: 0.5, absK: 1 });
  } else if (view.mode === 2) renderer.render(scene, camera);
  else mic.render(micP);

  // Labels.
  labelBox.style.display = view.labels ? '' : 'none';
  if (view.labels) {
    const v = new THREE.Vector3();
    for (const { name, d } of labelEls) {
      creature.anchorWorld(name, v).project(camera);
      d.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
      d.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    }
  }

  // Readout.
  const st = { active: walker.slipping ? 'SLIPPING' : life.feeding ? 'feeding' : life.tun > 0.02 ? 'curling up…' : walker.speed > 0.03 ? 'walking' : 'holding on',
    tun: 'tun (dry: waits for rain; wet: Y to wake)', skip: 'tun · time passing…', revive: 'rehydrating…', dead: life.energy <= 0.001 ? 'eaten' : 'did not wake' }[life.state];
  const planted = walker.feet.filter((f) => f.state === 'stance' && f.grip > 0.5).length;
  const bar = (x) => '█'.repeat(Math.round(x * 10)).padEnd(10, '·');
  hud.stats([
    `${life.clock}   (${life.compression ? life.compression + '×' : 'paused'})`,
    `${ob.name}  ${MODES[view.mode].split(' ')[0]}  focus ${view.focus >= 0 ? '+' : ''}${Math.round(-view.focus * 100)} µm`,
    `${walker.leaf.name}${walker.side < 0 ? ' · underside' : ''}`,
    `film     ${film > 0 ? Math.round(Math.min(film, 2) * 22) + ' µm' : 'DRY'}`,
    `water    ${bar(1 - life.desic)}`,
    `reserves ${bar(life.energy)}`,
    `claws    ${planted}/8 hooked · grip ${walker.gripSum.toFixed(1)} / need ${Math.max(0, walker.required).toFixed(1)}`,
    `state    ${st}${life.state === 'skip' || life.state === 'revive' ? ` · revival ~${Math.round(life.chance * 100)}%` : ''}`,
    walker.candidate ? `reach    ${walker.candidate.M.name}${walker.candidate.bridged ? ' (film bridge)' : ''}` : '',
    `${dash.active ? 'SCRAMBLE' : dash.text()}   ${Math.round(walker.speed * 100)} µm/s`,
    predator.on ? `Milnesium ${predator.state === 'wander' ? (predator.firstHunt ? 'browsing far off' : 'keeping off') : predator.state === 'recoil' ? 'backing off' : predator.state === 'approach' ? 'closing in' : 'stalking'} · ${Math.round(predator.dist * 100)} µm${predator.thinFilm ? ' · film too thin for it' : ''}` : '',
  ].filter(Boolean).join('\n'));

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

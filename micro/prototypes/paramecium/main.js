// Paramecium prototype: a fast ciliate in a pond drop, seen through several
// microscope techniques. See README.md for controls, approach and sources.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { loadTexture } from '../shared/assets.js';
import { createOptics, MODES, MODE_NAMES, shared, standInPlate } from './optics.js';
import { createCell, LENGTH } from './cell.js';
import { createWorld, DEPTH } from './world.js';
import { createSwimmer, VMAX } from './swim.js';
import { createEncounters } from './encounters.js';
import { createFeatures } from '../shared/features.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, AMOEBA_MODES, DIC_MODES } from '../shared/techniques/adapters.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.autoClear = false;
const pad = createPad();
const hud = mountHud({
  title: 'Paramecium',
  sub: 'Paramecium caudatum, 230 µm long, in a pond drop. Darkfield, phase contrast, brightfield, DIC and a lit view.',
  controls: [
    ['RT', 'Beat cilia: swim (speed follows the trigger, no gliding)'],
    ['LT', 'Slow beat: hover and feed (draws bacteria into the oral groove)'],
    ['LS', 'Steer (in the microscope view: point where to go)'],
    ['LB', 'Dive'], ['RB', 'Rise'],
    ['B', 'Avoidance reaction: reverse, pivot, swim off'],
    ['A', 'Trichocyst discharge: escape burst (3 charges)'],
    ['X', 'Next microscope technique'],
    ['Y', 'Microscope view / chase camera'],
    ['RS', 'Orbit the camera (microscope view: move the stage)'],
    ['D-pad', 'Up/down: objective (microscope) or camera distance'],
    ['View', 'Hide or show this panel'],
  ],
  note: 'Scale is honest (µm); cilia, threads and bacteria are drawn wider than life so they read, and the cilia beat is shown slowed. Watch for Didinium, the barrel-shaped hunter.',
});

const scene = new THREE.Scene();
const cell = createCell();
scene.add(cell.group);
const world = createWorld(scene);
const swimmer = createSwimmer(cell, world);
const enc = createEncounters(scene, world, cell);
const optics = createOptics(renderer);

// Delivered art, with procedural stand-ins until it arrives.
const plates = { darkfield: standInPlate('darkfield'), phase: standInPlate('phase') };
loadTexture('MP-P01', { srgb: false }).then((t) => { if (t) plates.darkfield = t; });
loadTexture('MP-P02', { srgb: false }).then((t) => { if (t) plates.phase = t; });
loadTexture('MP-P03', { srgb: false }).then((t) => {
  if (!t) return;
  cell.body.material.uniforms.uPellicle.value = t;
  cell.body.material.uniforms.uHasPellicle.value = 1;
});

// --- cameras ---------------------------------------------------------------
const chase = new THREE.PerspectiveCamera(50, 1, 1, 12000);
const scope = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
scope.up.set(0, 0, -1);
const OBJECTIVES = [ // field of view (FN 18) and an exaggerated, labelled depth of field
  { name: '10×', field: 1800, dof: [45, 260] },
  { name: '20×', field: 900, dof: [22, 160] },
  { name: '40×', field: 450, dof: [10, 90] },
];
const view = { fieldStop: true, smoothHelix: true, mode: 0, kind: 'chase', obj: 1, dist: 430, orbitYaw: 0.5, orbitPitch: 0.4, stage: new THREE.Vector2(),
  camAxis: new THREE.Vector3().copy(swimmer.state.axis), camYaw: swimmer.state.yaw, camPitch: 0, focusY: swimmer.state.axis.y };

// Render scale adapts to the GPU: a fence per frame tells us when the GPU is
// behind, then that frame's render is skipped (the simulation keeps running)
// and the internal resolution steps down until frames keep up.
const gl = renderer.getContext();
// a software renderer (headless checks, blocklisted GPUs) starts small
let renderScale = /SwiftShader|llvmpipe|Software/i.test(gl.getParameter(gl.RENDERER) + (gl.getExtension('WEBGL_debug_renderer_info') ? gl.getParameter(0x9246) : '')) ? 0.4 : 1;
let fence = null, rendered = 0, renderClock = 0, renderFps = 60;
function gpuBusy() {
  if (!fence) return false;
  if (gl.getSyncParameter(fence, gl.SYNC_STATUS) !== gl.SIGNALED) return true;
  gl.deleteSync(fence); fence = null;
  return false;
}
let adaptive = true;
function adapt(dt) {
  renderClock += dt;
  if (!adaptive) return;
  if (renderClock < 1) return;
  renderFps = rendered / renderClock; rendered = 0; renderClock = 0;
  const old = renderScale;
  if (renderFps < 42) renderScale = Math.max(0.4, renderScale * 0.82);
  else if (renderFps > 57 && renderScale < 1) renderScale = Math.min(1, renderScale * 1.1);
  if (renderScale !== old) resize();
}

function resize() {
  const pr = Math.min(devicePixelRatio || 1, 1.5) * renderScale;
  const w = Math.max(2, Math.floor(innerWidth * pr)), h = Math.max(2, Math.floor(innerHeight * pr));
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  optics.resize(w, h);
  chase.aspect = w / h;
  chase.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function updateCameras(dt, s) {
  const [W, H] = optics.size;
  const k = 1 - Math.exp(-dt * 6);
  view.camAxis.lerp(view.smoothHelix ? s.axis : s.center, k);
  if (view.kind === 'chase') {
    // follow the helix axis and the travel heading, not the rolling body
    const dy = Math.atan2(Math.sin(s.yaw - view.camYaw), Math.cos(s.yaw - view.camYaw));
    view.camYaw += dy * (1 - Math.exp(-dt * 3.5));
    view.camPitch += (s.pitch - view.camPitch) * (1 - Math.exp(-dt * 3));
    const yaw = view.camYaw + view.orbitYaw, pitch = Math.max(-1.3, Math.min(1.3, view.camPitch * 0.35 + view.orbitPitch));
    const back = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw));
    const target = debug.inspect ? s.center : view.camAxis;
    if (!view.smoothHelix) { view.camYaw = Math.atan2(-s.T.z, s.T.x); view.camPitch = Math.asin(Math.max(-1, Math.min(1, s.T.y))); }
    chase.position.copy(target).addScaledVector(back, -view.dist).addScaledVector(new THREE.Vector3(0, 1, 0), view.dist * 0.18);
    chase.position.y = Math.max(8, Math.min(DEPTH + 300, chase.position.y));
    chase.lookAt(target.x + back.x * 40, target.y + back.y * 40, target.z + back.z * 40);
    chase.updateMatrixWorld();
    shared.uFocus.value = chase.position.distanceTo(s.center);
    shared.uDof.value.set(70, 460);
    shared.uFade.value = 1400;
    shared.uNear.value.set(40, Math.max(60, shared.uFocus.value * 0.55));
    shared.uPxPersp.value = (2 * Math.tan((chase.fov * Math.PI) / 360)) / H;
    return chase;
  }
  const o = OBJECTIVES[view.obj];
  const half = o.field / 2 / 0.95;
  scope.top = half; scope.bottom = -half; scope.left = -half * (W / H); scope.right = half * (W / H);
  scope.updateProjectionMatrix();
  // the stage follows the cell; fine focus tracks its depth
  view.focusY += (s.center.y - view.focusY) * (1 - Math.exp(-dt * 3));
  scope.position.set(view.camAxis.x + view.stage.x, 2000, view.camAxis.z + view.stage.y);
  scope.lookAt(scope.position.x, 0, scope.position.z);
  scope.updateMatrixWorld();
  shared.uFocus.value = 2000 - view.focusY;
  shared.uDof.value.set(o.dof[0], o.dof[1]);
  shared.uFade.value = 500;
  shared.uNear.value.set(-2, -1);
  shared.uPxOrtho.value = (2 * half) / H;
  return scope;
}

// --- debug hooks for screenshots and tests ------------------------------------
const debug = {
  freeze: false, inspect: false, time: null,
  setMode(i) { features.set('look', MODE_NAMES[MODES[((i % MODES.length) + MODES.length) % MODES.length]]); },
  setView(k) { features.set('view', VIEW_NAMES[k]); },
  setOrbit(yaw, pitch, dist) { view.orbitYaw = yaw; view.orbitPitch = pitch; if (dist) view.dist = dist; },
  avoid() { swimmer.startAvoid(null, null); },
  burst() { doBurst(); },
  teleport(x, y, z, yaw = 0, pitch = 0) {
    const s = swimmer.state; s.axis.set(x, y, z); s.yaw = yaw; s.pitch = pitch;
    view.camAxis.set(x, y, z); view.camYaw = yaw; view.camPitch = pitch; view.focusY = y;
  },
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) tick(dt, true); },
};

// --- the feature panel (Menu / Esc) ---------------------------------------------
const VIEW_NAMES = { chase: 'Chase camera', scope: 'Microscope (top-down)' };
const features = createFeatures({ key: 'paramecium', pad });
const T = optics.toggles;
const sw = (u) => (on) => { u.value = on ? 1 : 0; };
// Optics
features.add({ id: 'look', group: 'Optics', label: 'Microscope technique (X)', choices: MODES.map((m) => MODE_NAMES[m]), value: MODE_NAMES.darkfield,
  about: 'How the image is formed from the optical-path, scatter and absorption buffers: darkfield (zero order removed: squared high-pass plus scatter), positive phase contrast (dark where the path is long), brightfield (absorption plus a defocus term), DIC (shear derivative of the path) or a hypothetical lit view.',
  onChange: (v) => { view.mode = MODES.findIndex((m) => MODE_NAMES[m] === v); } });
features.add({ id: 'view', group: 'Optics', label: 'Camera (Y)', choices: [VIEW_NAMES.chase, VIEW_NAMES.scope], value: VIEW_NAMES.chase,
  about: 'Chase: a hypothetical camera in the water that follows the helix axis. Microscope: orthographic, top-down, the stage follows the cell and fine focus tracks its depth.',
  onChange: (v) => { view.kind = v === VIEW_NAMES.scope ? 'scope' : 'chase'; view.stage.set(0, 0); } });
features.add({ id: 'objective', group: 'Optics', label: 'Objective (D-pad in the microscope view)', choices: OBJECTIVES.map((o) => o.name), value: '20×',
  about: 'Field of view for an FN 18 eyepiece: 10× 1.8 mm, 20× 0.9 mm, 40× 0.45 mm. Depth of field grows with lower power (exaggerated, see README).',
  onChange: (v) => { view.obj = OBJECTIVES.findIndex((o) => o.name === v); } });
features.add({ id: 'dof', group: 'Optics', label: 'Depth of field', on: true,
  about: 'Each fragment is split between a sharp and a defocused layer by its object\'s distance from the focal plane; the defocused layer is blurred at quarter resolution. Works with additive, order-free rendering.',
  onChange: (on) => { shared.uDofOn.value = on ? 1 : 0; } });
features.add({ id: 'halo', group: 'Optics', label: 'Phase halo and shade-off', on: true,
  about: 'A real phase ring leaks low spatial frequencies back into the image: φ − 0.82·blur(φ). That gives the bright halo round dark objects and the lighter centres of large ones. Off: an ideal phase plate.', onChange: sw(T.halo) });
features.add({ id: 'tie', group: 'Optics', label: 'Brightfield defocus contrast', on: true,
  about: 'Transparent cells are nearly invisible in focus; a little defocus shows them through the transport-of-intensity effect, I ≈ 1 − k∇²φ (here a high-pass of φ).', onChange: sw(T.tie) });
features.add({ id: 'plate', group: 'Optics', label: 'Background habitat plate', on: true,
  about: 'An out-of-focus pond plate behind the scene in darkfield and phase (MP-P01, MP-P02 when delivered; procedural specks until then), panned with the stage.', onChange: sw(T.plate) });
features.add({ id: 'chroma', group: 'Optics', label: 'Lateral chromatic softness', on: true, about: 'Red and blue sampled slightly apart, more toward the edge of the field, as an achromat objective does.', onChange: sw(T.chroma) });
features.add({ id: 'soft', group: 'Optics', label: 'Objective point spread', on: true, about: 'A small blur of every pixel with its neighbours: a light microscope never resolves a hard pixel edge.', onChange: sw(T.soft) });
features.add({ id: 'grain', group: 'Optics', label: 'Camera noise', on: true, about: 'Per-frame sensor noise, slightly stronger on bright backgrounds.', onChange: sw(T.grain) });
features.add({ id: 'stop', group: 'Optics', label: 'Eyepiece field stop', on: true, about: 'The round field of view with a black surround in the microscope view.', onChange: (on) => { view.fieldStop = on; } });
// Rendering
features.add({ id: 'buffers', group: 'Rendering', label: 'Optical-path buffers (MRT, additive)', fixed: true,
  about: 'No lights: every object adds its optical path difference (Δn × thickness), scatter and colour absorption into four float targets, sharp and defocused, with no depth test. Transmitted light really does sum along the axis.' });
features.add({ id: 'chord', group: 'Rendering', label: 'Front/back-face chord trick', fixed: true,
  about: 'A closed body adds −depth on front faces and +depth on back faces (relative to its own axis, for precision), so each pixel receives the chord through it. Thin parts (cilia, threads, stalks, bacteria) add a fixed path instead.' });
features.add({ id: 'minpx', group: 'Rendering', label: 'Sub-pixel widening with energy kept', fixed: true,
  about: 'Ribbons and specks thinner than a pixel are drawn one pixel wide with their path scaled down, so distant cilia aggregate into a faint fringe instead of shimmering.' });
features.add({ id: 'adaptive', group: 'Rendering', label: 'Adaptive resolution and frame skip', on: true,
  about: 'A GPU fence per frame: if the previous frame is unfinished the render is skipped (the simulation keeps running) and the internal resolution steps down. Off: fixed resolution.', onChange: (on) => { adaptive = on; if (!on && renderScale !== 1 && !/SwiftShader/i.test(gl.getParameter(gl.RENDERER))) { renderScale = 1; resize(); } } });
// Body
features.add({ id: 'sdf', group: 'Body', label: 'SDF body with carved oral groove', fixed: true,
  about: 'Slipper outline from two superellipse halves (blunt anterior, conical posterior), meshed with surface nets; the oral groove is carved by a chain of tapered capsules that twists from the anterior left to the cytostome, ending in a buccal pocket.' });
features.add({ id: 'cilia', group: 'Body', label: 'Cilia (≈4600 in kineties)', on: true,
  about: '100 kineties of 10 µm cilia, instanced ribbons beating in the vertex shader: a straight power stroke toward the posterior-right, a bent recovery with the tip lagging. Oral cilia line the groove; a stiffer caudal tuft trails behind.', onChange: (on) => { cell.cilia.mesh.visible = on; } });
features.add({ id: 'wave', group: 'Body', label: 'Metachronal waves', on: true,
  about: 'Each cilium\'s beat is offset in phase along a diagonal of the surface, so waves sweep over the cell. Off: all cilia beat in step.', onChange: (on) => { cell.cilia.mat.uniforms.uWave.value = on ? 1 : 0; } });
features.add({ id: 'pellicle', group: 'Body', label: 'Pellicle kinety pattern', on: true,
  about: 'Rows of alveolar units scatter faintly (procedural, or the MP-P03 texture when delivered).', onChange: (on) => { cell.body.material.uniforms.uPelOn.value = on ? 1 : 0; } });
features.add({ id: 'tricho', group: 'Body', label: 'Docked trichocysts', on: true,
  about: '2600 spindles 4 µm long just under the pellicle: the dense granular seam along the margin in micrographs.', onChange: (on) => { cell.trichocysts.mesh.visible = on; } });
features.add({ id: 'cyclosis', group: 'Body', label: 'Cyclosis (streaming)', on: true,
  about: 'Granules, crystals and food vacuoles ride the endoplasm loop: back along the ventral side, forward dorsally; vacuoles are egested at the cytoproct. Sped up about five times.', onChange: (on) => { cell.opts.cyclosis = on; } });
features.add({ id: 'cv', group: 'Body', label: 'Contractile vacuole cycle', on: true,
  about: 'Two vacuoles with eight radiating canals each: canals swell, empty into the vacuole, which then empties through its pore. Period 6 s, the two half a cycle apart.', onChange: (on) => { cell.opts.cv = on; } });
features.add({ id: 'nuclei', group: 'Body', label: 'Macronucleus and micronucleus', on: true, about: 'Ellipsoidal macronucleus mid-body with the small micronucleus beside it; low contrast, as in life.', onChange: (on) => { cell.macro.visible = on; cell.micro.visible = on; } });
// Motion
features.add({ id: 'lowre', group: 'Motion', label: 'Low Reynolds number (no coasting)', on: true,
  about: 'Speed follows the ciliary beat with a 35 ms lag, so the cell stops when the trigger is released. Off: a 1.4 s glide, like a fish; physically wrong at this scale, here for comparison.', onChange: (on) => { swimmer.opts.lowRe = on; } });
features.add({ id: 'helix', group: 'Motion', label: 'Helical path and roll', on: true,
  about: 'A left-handed helix of radius 29 µm and pitch 850 µm, one roll per turn, oral side toward the axis, body tilted along the path. Off: straight, with a slow roll.', onChange: (on) => { swimmer.opts.helix = on; } });
features.add({ id: 'smooth', group: 'Motion', label: 'Camera follows the helix axis', on: true,
  about: 'The chase camera tracks the helix axis and travel heading rather than the wobbling body, so steering stays calm. Off: it follows the body itself.', onChange: (on) => { view.smoothHelix = on; } });
features.add({ id: 'beat', group: 'Motion', label: 'Ciliary beat rate', choices: ['Slowed (readable)', 'Real (15–35 Hz)'], value: 'Slowed (readable)',
  about: 'Real cilia beat 15–35 Hz, faster than a 60 Hz display can show without aliasing; the slowed rate lets the strokes and waves be followed.', onChange: (v) => { swimmer.opts.beatScale = v.startsWith('Real') ? 4.5 : 1; } });
features.add({ id: 'avoid', group: 'Motion', label: 'Avoidance reaction (B, and on contact)', fixed: true, about: 'Ciliary reversal for 0.3 s (backing up), a pivot about the posterior end, then forward on a new heading (S08).' });
features.add({ id: 'burst', group: 'Motion', label: 'Trichocyst discharge (A)', fixed: true, about: 'About 240 threads fire from the patch facing the threat and throw the cell ≈100 µm the other way (S09). Three charges, one back every 7 s (invented).' });
// Simulation
features.add({ id: 'squirmer', group: 'Simulation', label: 'Flow round the swimming cell', on: true,
  about: 'Bacteria feel a neutral squirmer\'s dipole field: carried ahead at the poles, swept back along the sides, decaying as 1/r³.', onChange: (on) => { world.opts.squirmer = on; } });
features.add({ id: 'feeding', group: 'Simulation', label: 'Feeding currents', on: true,
  about: 'Oral cilia draw water into the groove (stronger with LT); bacteria reaching the cytostome are eaten, ten make a food vacuole. Vorticella peristomes feed the same way.', onChange: (on) => { world.opts.feeding = on; } });
features.add({ id: 'ambient', group: 'Simulation', label: 'Ambient drift', on: true, about: 'A slow drift (≈20 µm/s) with gentle eddies carries everything, the Paramecium included.', onChange: (on) => { world.opts.ambient = on; } });
features.add({ id: 'tumble', group: 'Simulation', label: 'Bacterial run-and-tumble', on: true, about: 'Half the bacteria swim 8–28 µm/s and pick a new direction every 0.6–2.4 s.', onChange: (on) => { world.opts.tumble = on; } });
// World
features.add({ id: 'didinium', group: 'World', label: 'Didinium hunters', on: true,
  about: 'Two barrel-shaped predators with two girdles of cilia and a proboscis. Contact means capture; trichocysts break free; otherwise you are swallowed whole.', onChange: (on) => { enc.opts.didinium = on; } });
features.add({ id: 'homing', group: 'World', label: 'Didinium homing', on: true, about: 'Within ≈2 body lengths Didinium turns toward you. Real Didinium finds prey by collision; this makes the encounter readable.', onChange: (on) => { enc.opts.homing = on; } });
features.add({ id: 'vort', group: 'World', label: 'Vorticella stalk contraction', on: true, about: 'Touch a Vorticella and its stalk coils in one frame (really milliseconds), then re-extends over about 3 s; neighbours may follow (S10, S11).', onChange: (on) => { world.opts.vortContract = on; } });
features.add({ id: 'scenery', group: 'World', label: 'Spirogyra, detritus, diatoms', fixed: true, about: 'Spirogyra filaments with helical serrated chloroplasts, pyrenoids and cross walls; flakes and sediment; Pinnularia and Fragilaria with striae.' });
// Borrowed (default off).
const looks = createBorrowedLooks(renderer);
const borrow = borrowedSwitches(features);
const bmode = { dic: 0, amoeba: 0 };
borrow.add({ id: 'semMite', label: 'SEM (scanning electron microscope)', from: 'mite',
  about: 'The real geometry (slipper body with its oral groove, Didinium, Vorticella, Spirogyra, nuclei) drawn into the mite\'s G-buffer and shaded by its secondary-electron composite: tilt contrast, edge glow, detector shadowing, crevice darkening, noise. Cilia, trichocysts, bacteria and granules are shaped in their own vertex shaders, so they are left out: a bald Paramecium. Physically odd: a swimming cell in an SEM; real SEMs of Paramecium are fixed and dried.' });
F_SEM_MODE();
const FIELD = 'The optical-path, scatter and absorption buffers (sharp plus the blurred defocused layer) handed to another prototype\'s image formation.';
borrow.add({ id: 'dicTardigrade', label: 'Tardigrade DIC (Nomarski)', from: 'tardigrade',
  about: `The tardigrade's interference model: sin²(π(bias + shear·∂OPD)/λ) at three wavelengths, so relief comes with warm and cool fringes, against this prototype's simpler tanh DIC. ${FIELD}` });
features.add({ id: 'dicTardigradeMode', group: 'Borrowed', label: 'Tardigrade look', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0],
  about: 'Which of the tardigrade images the switch above uses: DIC or its brightfield.', onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
borrow.add({ id: 'opticsAmoeba', label: 'Amoeba property optics', from: 'amoeba',
  about: `The amoeba's versions: brightfield with Beer–Lambert absorption, transport-of-intensity defocus and chromatic fringes, phase contrast, darkfield, or its immersive lit view with caustics. ${FIELD}` });
features.add({ id: 'opticsAmoebaMode', group: 'Borrowed', label: 'Amoeba method', from: 'amoeba', choices: AMOEBA_MODES, value: AMOEBA_MODES[0],
  about: 'Which optical method the amoeba switch above uses.', onChange: (v) => (bmode.amoeba = AMOEBA_MODES.indexOf(v)) });
function F_SEM_MODE() {
  features.add({ id: 'semMiteMode', group: 'Borrowed', label: 'SEM detector', from: 'mite', choices: SEM_LOOKS, value: SEM_LOOKS[0],
    about: 'SE (topography), BSE (composition: all light organic matter here) or false colour (the Paramecium amber, everything else brown).', onChange: (v) => looks.semMode(SEM_LOOKS.indexOf(v)) });
}
const cellMeshes = new Set();
cell.group.traverse((o) => cellMeshes.add(o));

features.add({ id: 'pad', group: 'Controls', label: 'Xbox controller, keyboard fallback', fixed: true, about: 'RT swim, LT feed, LS steer, LB/RB dive and rise, B avoid, A trichocysts, X technique, Y camera, RS orbit, D-pad objective, View panel, Menu features.' });

// --- loop --------------------------------------------------------------------
let t = 0, last = performance.now(), blocked = false;
const ev0 = () => ({});
let stats = { eaten: 0 };

function doBurst() {
  const s = swimmer.state;
  const threat = enc.nearestThreat(s.center);
  const away = swimmer.burst(threat ? threat.pos : null);
  if (!away) { hud.toast('No trichocysts left: they re-dock over time'); return; }
  const n = enc.discharge(s, away.clone().negate(), t, world.flowAt(s.center, t));
  pad.rumble(220, 0.9, 1.0);
  hud.toast(threat ? `Trichocysts fired (${n} threads): pushed clear of Didinium` : `Trichocysts fired (${n} threads)`);
}

function tick(dt, forced = false) {
  if (debug.freeze && !forced) return;
  t += dt;
  shared.uTime.value = t;
  const s = swimmer.state;
  s.inspect = debug.inspect;
  const live = !blocked && !forced;
  const ls = live ? pad.ls() : { x: 0, y: 0, m: 0 };
  const rise = live ? (pad.down(pad.BTN.RB) ? 1 : 0) - (pad.down(pad.BTN.LB) ? 1 : 0) : 0;
  const inp = {
    thrust: debug.inspect ? 0.5 : live ? pad.rt() : 0, hover: live ? pad.lt() : 0, steer: ls, rise, view: view.kind,
    avoid: live && pad.pressed(pad.BTN.B), burst: live && pad.pressed(pad.BTN.A),
  };
  const ev = ev0();
  swimmer.step(dt, t, inp, ev);
  if (inp.burst) doBurst();
  enc.update(dt, t, swimmer, ev);
  const w = world.update(dt, t, { center: s.center, axisA: s.axisA, axisB: s.axisB, U: s.U, mouth: s.mouth, feed: s.feed, alive: s.mode !== 'dead' });
  for (let i = 0; i < w.eaten; i++) if (cell.ingest()) hud.toast('A food vacuole forms at the cytostome');
  stats.eaten += w.eaten;

  // the cell
  cell.group.position.copy(s.center);
  cell.group.quaternion.copy(s.quat);
  const dead = s.mode === 'dead';
  cell.group.visible = !dead || s.deadT < 0.4;
  cell.update(dt, { phase: s.beatPhase, amp: s.amp, reverse: s.reverse, oral: s.oral });

  if (ev.hit) { pad.rumble(70, 0.25, 0.1); if (ev.vorticella) hud.toast('Bumped a Vorticella: its stalk coils (avoidance reaction)'); }
  if (ev.avoid) pad.rumble(50, 0.15, 0);
  if (ev.captured) { pad.rumble(400, 0.6, 0.8); hud.toast('Didinium has you! Fire trichocysts (A) to break free', 2600); }
  if (ev.eaten) hud.toast('Swallowed whole by Didinium', 2200);
  if (ev.respawned) hud.toast('A new Paramecium swims into view');
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  pad.poll();
  blocked = features.update(); // the panel is open: no game input this frame
  if (!blocked) hud.update(pad);
  if (!blocked && pad.pressed(pad.BTN.X)) { features.set('look', MODE_NAMES[MODES[(view.mode + 1) % MODES.length]]); hud.toast(MODE_NAMES[MODES[view.mode]]); }
  if (!blocked && pad.pressed(pad.BTN.Y)) { features.set('view', view.kind === 'chase' ? VIEW_NAMES.scope : VIEW_NAMES.chase); hud.toast(view.kind === 'scope' ? `Microscope view, ${OBJECTIVES[view.obj].name} objective` : 'Chase camera'); }
  if (!blocked && pad.pressed(pad.BTN.UP)) { if (view.kind === 'scope') { features.set('objective', OBJECTIVES[Math.min(2, view.obj + 1)].name); hud.toast(`${OBJECTIVES[view.obj].name} objective`); } else view.dist = Math.max(220, view.dist * 0.8); }
  if (!blocked && pad.pressed(pad.BTN.DOWN)) { if (view.kind === 'scope') { features.set('objective', OBJECTIVES[Math.max(0, view.obj - 1)].name); hud.toast(`${OBJECTIVES[view.obj].name} objective`); } else view.dist = Math.min(1600, view.dist * 1.25); }
  const rs = blocked ? { x: 0, y: 0, m: 0 } : pad.rs();
  if (view.kind === 'chase') {
    view.orbitYaw -= rs.x * 2.2 * dt;
    view.orbitPitch = Math.max(-1.2, Math.min(1.2, view.orbitPitch - rs.y * 1.6 * dt));
    if (rs.m === 0 && !debug.inspect) { const k = 1 - Math.exp(-dt * 0.6); view.orbitYaw += (0.5 - view.orbitYaw) * k; view.orbitPitch += (0.4 - view.orbitPitch) * k; }
  } else {
    const half = OBJECTIVES[view.obj].field / 2;
    view.stage.x = Math.max(-half, Math.min(half, view.stage.x + rs.x * half * dt));
    view.stage.y = Math.max(-half, Math.min(half, view.stage.y + rs.y * half * dt));
    if (rs.m === 0) view.stage.multiplyScalar(Math.exp(-dt * 0.8));
  }

  tick(dt);

  const s = swimmer.state;
  const cam = updateCameras(dt, s);
  adapt(dt);
  if (gpuBusy()) return; // the GPU is still on an earlier frame: skip this render
  const modeName = MODES[view.mode];
  const plate = modeName === 'darkfield' ? plates.darkfield : modeName === 'phase' ? plates.phase : null;
  const pf = OBJECTIVES[view.obj].field * 4;
  const optP = {
    mode: view.mode, stop: view.kind === 'scope' && view.fieldStop, plate,
    plateOff: new THREE.Vector2(cam.position.x / pf, -cam.position.z / pf),
    blurScale: view.kind === 'scope' ? 1 : 1.2,
  };
  if (borrow.id) renderBorrowed(cam, optP, dt);
  else optics.render(scene, cam, optP);
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  rendered++;

  const bl = s.netSpeed / LENGTH;
  const charges = '●'.repeat(s.charges) + '○'.repeat(3 - s.charges);
  const where = view.kind === 'scope' ? `microscope ${OBJECTIVES[view.obj].name}, field ${(OBJECTIVES[view.obj].field / 1000).toFixed(2)} mm` : 'chase camera (hypothetical)';
  const threat = enc.nearestThreat(s.center, 700);
  hud.stats([
    `${MODE_NAMES[modeName]} · ${where}`,
    `speed ${Math.round(s.netSpeed).toString().padStart(4)} µm/s · ${bl.toFixed(1)} body lengths/s (max ${VMAX})`,
    `depth ${Math.round(s.center.y)} of ${DEPTH} µm · ${s.mode === 'avoid' ? 'avoidance reaction' : s.mode === 'captured' ? 'CAUGHT by Didinium' : s.mode === 'dead' ? 'eaten' : s.feed > 0.3 ? 'feeding' : 'swimming'}`,
    `trichocysts ${charges} · food vacuoles ${cell.foodCount} · bacteria eaten ${stats.eaten}`,
    threat ? `Didinium ${Math.round(threat.pos.distanceTo(s.center))} µm away (${threat.state})` : 'no predator near',
    `${Math.round(renderFps)} fps · render scale ${renderScale.toFixed(2)}`,
  ].join('\n'));
}

function renderBorrowed(cam, optP, dt) {
  const [W, H] = optics.size;
  const ortho = view.kind === 'scope';
  const half = OBJECTIVES[view.obj].field / 2 / 0.95;
  const pxPerUm = ortho ? H / (2 * half) : H / (2 * Math.tan((chase.fov * Math.PI) / 360) * shared.uFocus.value);
  if (borrow.id === 'semMite') {
    const d = shared.uFocus.value;
    looks.semScene(scene, cam, { dt, umPerUnit: 1, tan: ortho ? [(half * W) / H / d, half / d] : undefined, cls: (o) => (cellMeshes.has(o) ? CLS.CUTICLE : CLS.LITTER) });
    return;
  }
  optics.render(scene, cam, { ...optP, upTo: 2 });
  const { main, pong } = optics.targets;
  looks.fieldFromBuffers(W, H, { a: { opd: main.textures[0], abs: main.textures[1], scatW: [0, 1, 0, 0] }, b: { opd: pong.textures[0], abs: pong.textures[1], scatW: [0, 1, 0, 0] }, opdK: 1, absK: 1 });
  if (borrow.id === 'dicTardigrade') looks.dic({ mode: bmode.dic, pxPerUm, time: t, opdK: 1, absK: 1 });
  else looks.amoeba({ mode: bmode.amoeba, focus: 0.6, time: t, umPerPx: 1 / pxPerUm, phaseK: 1, odK: 1 });
}

window.__micro = {
  scene, renderer, cell, world, swimmer, encounters: enc, optics, view, debug, MODES, features,
  get camera() { return view.kind === 'scope' ? scope : chase; },
  get t() { return t; },
};
requestAnimationFrame((n) => { last = n; frame(n); });

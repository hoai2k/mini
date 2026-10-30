// Paramecium prototype: Paramecium bursaria (green with symbiotic Chlorella)
// in a pond drop, seen through a microscope. Eat prey, keep your symbionts in
// the light, and escape Didinium and a giant Amoeba proteus. See README.md
// for controls, approach and sources.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { createControls, createDash, hudControls } from '../shared/controls.js';
import { loadTexture } from '../shared/assets.js';
import { createOptics, MODES, MODE_NAMES, shared, standInPlate } from './optics.js';
import { createCell, LENGTH, WIDTH, SPECIES, SPECIES_ID, FEATURE_KEY } from './cell.js';
import { createWorld, DEPTH } from './world.js';
import { createSwimmer, VMAX, DASH_V, DASH_T, BODY_R } from './swim.js';
import { createEncounters } from './encounters.js';
import { createPrey } from './prey.js';
import { createProteus } from './proteus.js';
import { createFeatures } from '../shared/features.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, AMOEBA_MODES, DIC_MODES } from '../shared/techniques/adapters.js';

const SP = SPECIES[SPECIES_ID];
const GREEN = SPECIES_ID === 'bursaria';
const GOAL = 6; // prey to eat in a round
const HL = LENGTH / 2;

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.autoClear = false;
const pad = createPad();
const ctl = createControls(pad);
const hud = mountHud({
  title: 'Paramecium',
  sub: GREEN
    ? `${SP.latin}, ${LENGTH} µm, green with symbiotic Chlorella, in a pond drop under the microscope. Eat, stay in the light, outswim the hunters.`
    : `${SP.latin}, ${LENGTH} µm, in a pond drop under the microscope. Eat and outswim the hunters.`,
  controls: hudControls({
    move: 'Steer (relative to the view)',
    camera: 'Move the stage (chase camera: orbit)',
    dash: 'Dash: ciliary sprint where the stick points',
    attack: 'Eat: a gulp pulls nearby prey in. Touching a hunter: fire trichocysts',
    defend: 'Avoidance reaction: back up and turn',
    special: 'Microscope view / chase camera',
    analog: 'LT slow feeding beat · RT swim (no gliding)',
    secondary: 'Dive / rise',
    look: 'Microscope technique',
    zoom: 'Objective (chase camera: distance)',
  }),
  note: `Goal: eat ${GOAL} prey (green rings)${GREEN ? ', keep in the light so your Chlorella feed you' : ''}. Red marks a hunter: Didinium (fast, harpoons you on contact) and Amoeba proteus (slow giant on the slide, cups you if you swim low). Scale is honest (µm).`,
});

// the goal strip: what you are doing, at a glance
const goalEl = document.createElement('div');
goalEl.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,12,16,.62);color:#eef1f4;border-radius:999px;padding:6px 14px;font:600 13px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap;z-index:3';
document.body.appendChild(goalEl);

const scene = new THREE.Scene();
const cell = createCell();
scene.add(cell.group);
const world = createWorld(scene);
const swimmer = createSwimmer(cell, world);
const enc = createEncounters(scene, world, cell);
const prey = createPrey(scene);
const amoeba = createProteus(scene);
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
const OBJECTIVES = [ // field of view (FN 18) and a labelled, exaggerated depth of field
  { name: '10×', field: 1800, dof: [30, 120] },
  { name: '20×', field: 900, dof: [16, 75] },
  { name: '40×', field: 450, dof: [9, 45] },
];
const DOFS = { strong: 'Strong (only your layer sharp)', mild: 'Mild', off: 'Off' };
const PLATES = { dim: 'Dimmed and blurred', full: 'Full', off: 'Off' };
const view = {
  fieldStop: true, smoothHelix: true, mode: 0, kind: 'scope', obj: 1, dist: 300 + 430 * (LENGTH / 230), orbitYaw: 0.5, orbitPitch: 0.4,
  stage: new THREE.Vector2(), camAxis: new THREE.Vector3().copy(swimmer.state.axis), camYaw: swimmer.state.yaw, camPitch: 0,
  focusY: swimmer.state.axis.y, scopeYaw: swimmer.state.yaw, turnView: true, lead: new THREE.Vector3(), dof: 'strong', plate: 'dim',
};
const fwdOf = (yaw, out = new THREE.Vector3()) => out.set(Math.cos(yaw), 0, -Math.sin(yaw));
const angleWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

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

// overlays: a shade layer (multiplied over the image) and the markers
const mkOverlay = (blend, z) => {
  const c = document.createElement('canvas');
  c.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:${z};${blend ? `mix-blend-mode:${blend};` : ''}`;
  document.body.insertBefore(c, canvas.nextSibling);
  return c;
};
const shadeCv = mkOverlay('multiply', 1), markCv = mkOverlay('', 2);
const shadeG = shadeCv.getContext('2d'), markG = markCv.getContext('2d');
let cssW = 1, cssH = 1, dpr = 1;

function resize() {
  const pr = Math.min(devicePixelRatio || 1, 1.5) * renderScale;
  const w = Math.max(2, Math.floor(innerWidth * pr)), h = Math.max(2, Math.floor(innerHeight * pr));
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  optics.resize(w, h);
  chase.aspect = w / h;
  chase.updateProjectionMatrix();
  cssW = innerWidth; cssH = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
  for (const c of [shadeCv, markCv]) { c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr); }
}
addEventListener('resize', resize);
resize();

function updateCameras(dt, s, steer) {
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
    shared.uDof.value.set(view.dof === 'off' ? 1e5 : 70, view.dof === 'off' ? 2e5 : 460);
    shared.uFade.value = 1400;
    shared.uNear.value.set(40, Math.max(60, shared.uFocus.value * 0.55));
    shared.uPxPersp.value = (2 * Math.tan((chase.fov * Math.PI) / 360)) / H;
    return chase;
  }
  const o = OBJECTIVES[view.obj];
  const half = o.field / 2 / 0.95;
  scope.top = half; scope.bottom = -half; scope.left = -half * (W / H); scope.right = half * (W / H);
  scope.updateProjectionMatrix();
  // The view turns with the heading (never the roll), slowly, and holds still
  // while the stick points sideways so steering is never fought by the camera.
  if (view.turnView) {
    const off = steer.m > 0.25 ? Math.abs(angleWrap(Math.atan2(steer.x, -steer.y))) : 0;
    const follow = s.mode === 'swim' && off < 0.6 && Math.abs(s.speed) > 60 ? 1 : 0;
    const d = angleWrap(s.yaw - view.scopeYaw);
    view.scopeYaw += Math.max(-1.1 * dt, Math.min(1.1 * dt, d * (1 - Math.exp(-dt * 1.4)) * follow));
  } else view.scopeYaw = Math.PI / 2;
  // lead a little ahead of the cell so you see what you swim into
  const want = fwdOf(s.yaw).multiplyScalar(Math.min(o.field * 0.14, Math.max(0, s.speed) * 0.12));
  view.lead.lerp(want, 1 - Math.exp(-dt * 1.5));
  // the stage follows the helix axis (the wobble stays on the cell, not the view); fine focus tracks its depth
  view.focusY += (s.center.y - view.focusY) * (1 - Math.exp(-dt * 3));
  const up = fwdOf(view.scopeYaw);
  const right = new THREE.Vector3(Math.sin(view.scopeYaw), 0, Math.cos(view.scopeYaw));
  scope.position.set(view.camAxis.x + view.lead.x, 2000, view.camAxis.z + view.lead.z)
    .addScaledVector(right, view.stage.x).addScaledVector(up, -view.stage.y);
  scope.up.copy(up);
  scope.lookAt(scope.position.x, 0, scope.position.z);
  scope.updateMatrixWorld();
  shared.uFocus.value = 2000 - view.focusY;
  const dofK = view.dof === 'mild' ? 2.2 : 1;
  shared.uDof.value.set(view.dof === 'off' ? 1e5 : o.dof[0] * dofK, view.dof === 'off' ? 2e5 : o.dof[1] * dofK);
  shared.uFade.value = view.dof === 'strong' ? 160 : 500;
  shared.uNear.value.set(-2, -1);
  shared.uPxOrtho.value = (2 * half) / H;
  return scope;
}

// --- the feature panel (Menu / Esc) ---------------------------------------------
const VIEW_NAMES = { chase: 'Chase camera', scope: 'Microscope (top-down)' };
const features = createFeatures({ key: FEATURE_KEY, pad });
const T = optics.toggles;
const sw = (u) => (on) => { u.value = on ? 1 : 0; };
const marks = { halo: true, threats: true, prey: true, light: true };
// Species
features.add({ id: 'species', group: 'Body', label: 'Species (reloads)', choices: Object.values(SPECIES).map((x) => x.name), value: SP.name,
  about: 'P. bursaria (85–150 µm, S27), the Level 3 protagonist: plump, green with several hundred symbiotic Chlorella 5–6 µm across, gathers on the lit side. P. caudatum (200–260 µm, S07): larger and colourless, no symbionts and no light meter.',
  onChange: (v) => { if (v !== SP.name) setTimeout(() => location.reload(), 60); } });
// Optics
features.add({ id: 'look', group: 'Optics', label: 'Microscope technique (D-pad ←→)', choices: MODES.map((m) => MODE_NAMES[m]), value: MODE_NAMES.brightfield,
  about: 'How the image is formed from the optical-path, scatter and absorption buffers: darkfield (zero order removed), positive phase contrast (dark where the path is long), brightfield (absorption plus a defocus term: the default, because the green Chlorella make P. bursaria the clearest thing in the field), DIC (shear derivative of the path) or a hypothetical lit view.',
  onChange: (v) => { view.mode = MODES.findIndex((m) => MODE_NAMES[m] === v); } });
features.add({ id: 'view', group: 'Optics', label: 'Camera (Y)', choices: [VIEW_NAMES.scope, VIEW_NAMES.chase], value: VIEW_NAMES.scope,
  about: 'Microscope (default): orthographic and top-down; the stage keeps your cell centred, a little behind the direction you swim, and fine focus tracks your depth. Chase: a hypothetical camera in the water that follows the helix axis.',
  onChange: (v) => { view.kind = v === VIEW_NAMES.chase ? 'chase' : 'scope'; view.stage.set(0, 0); } });
features.add({ id: 'turnView', group: 'Optics', label: 'Microscope view turns with your heading', on: true,
  about: 'The view slowly turns so you swim up the screen, following the helix axis and the heading, never the roll; it holds still while you steer sideways. Off: north stays up (like a real stage).',
  onChange: (on) => { view.turnView = on; } });
features.add({ id: 'objective', group: 'Optics', label: 'Objective (D-pad ↑↓)', choices: OBJECTIVES.map((o) => o.name), value: '20×',
  about: 'Field of view for an FN 18 eyepiece: 10× 1.8 mm, 20× 0.9 mm (the Level 3 field), 40× 0.45 mm.',
  onChange: (v) => { view.obj = Math.max(0, OBJECTIVES.findIndex((o) => o.name === v)); } });
features.add({ id: 'dof', group: 'Optics', label: 'Depth of field', choices: Object.values(DOFS), value: DOFS.strong,
  about: 'Each fragment is split between a sharp and a defocused layer by its distance from the focal plane. Strong: only the layer you swim in is crisp (16 µm sharp, fully blurred by 75 µm at 20×) and far layers fade, so the field is uncluttered. Mild: about twice as deep. Off: everything sharp.',
  onChange: (v) => { view.dof = Object.keys(DOFS).find((k) => DOFS[k] === v) || 'strong'; shared.uDofOn.value = view.dof === 'off' ? 0 : 1; } });
features.add({ id: 'plate', group: 'Optics', label: 'Background habitat plate', choices: Object.values(PLATES), value: PLATES.dim,
  about: 'The pond photograph behind the scene in darkfield and phase (MP-P01, MP-P02). Dimmed and blurred (default) keeps it from competing with your cell; Full is the plate as delivered.',
  onChange: (v) => { view.plate = Object.keys(PLATES).find((k) => PLATES[k] === v) || 'dim'; T.plate.value = view.plate === 'off' ? 0 : 1; } });
features.add({ id: 'halo', group: 'Optics', label: 'Phase halo and shade-off', on: true,
  about: 'A real phase ring leaks low spatial frequencies back into the image: φ − 0.82·blur(φ). That gives the bright halo round dark objects and the lighter centres of large ones. Off: an ideal phase plate.', onChange: sw(T.halo) });
features.add({ id: 'tie', group: 'Optics', label: 'Brightfield defocus contrast', on: true,
  about: 'Transparent cells are nearly invisible in focus; a little defocus shows them through the transport-of-intensity effect, I ≈ 1 − k∇²φ (here a high-pass of φ).', onChange: sw(T.tie) });
features.add({ id: 'chroma', group: 'Optics', label: 'Lateral chromatic softness', on: true, about: 'Red and blue sampled slightly apart, more toward the edge of the field, as an achromat objective does.', onChange: sw(T.chroma) });
features.add({ id: 'soft', group: 'Optics', label: 'Objective point spread', on: true, about: 'A small blur of every pixel with its neighbours: a light microscope never resolves a hard pixel edge.', onChange: sw(T.soft) });
features.add({ id: 'grain', group: 'Optics', label: 'Camera noise', on: true, about: 'Per-frame sensor noise, slightly stronger on bright backgrounds.', onChange: sw(T.grain) });
features.add({ id: 'stop', group: 'Optics', label: 'Eyepiece field stop', on: true, about: 'The round field of view with a black surround in the microscope view.', onChange: (on) => { view.fieldStop = on; } });
// Game aids (drawn over the image, not part of it)
features.add({ id: 'outline', group: 'Optics', label: 'Outline round your cell', on: true,
  about: 'A faint ring round your Paramecium with a tick at the front, so you can always find yourself. Drawn over the image, not part of the microscopy.', onChange: (on) => { marks.halo = on; } });
features.add({ id: 'threatMarks', group: 'Optics', label: 'Hunter markers', on: true,
  about: 'Red rings round a hunter that has noticed you, an arrow at the edge of the field when it is out of view, and amber for one that has not.', onChange: (on) => { marks.threats = on; } });
features.add({ id: 'preyMarks', group: 'Optics', label: 'Prey markers', on: true,
  about: 'Faint green rings round prey, bright when it is close enough to gulp, and an arrow to the nearest when none is in view.', onChange: (on) => { marks.prey = on; } });
features.add({ id: 'lightPool', group: 'Optics', label: 'Light and shade', on: true,
  about: 'Sunlight falls on part of the drop; the rest is shaded (darker, drawn over the image). P. bursaria needs the light for its Chlorella.', onChange: (on) => { marks.light = on; } });
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
  about: 'Slipper outline from two superellipse halves (P. bursaria: short, plump, rounded at both ends; P. caudatum: blunt anterior, conical posterior), meshed with surface nets; the oral groove is carved by a chain of tapered capsules ending in a buccal pocket.' });
if (cell.chlorella) features.add({ id: 'chlorella', group: 'Body', label: `Chlorella symbionts (${SP.chlorella})`, on: true,
  about: 'Green algae 5–6 µm across filling the cytoplasm and riding the cyclosis (S27); chlorophyll absorbs red and blue, so the cell is green in brightfield.', onChange: (on) => { cell.chlorella.visible = on; } });
features.add({ id: 'cilia', group: 'Body', label: 'Cilia in kineties', on: true,
  about: 'Rows of 10 µm cilia as instanced ribbons beating in the vertex shader: a straight power stroke toward the posterior-right, a bent recovery with the tip lagging. Oral cilia line the groove; a stiffer caudal tuft trails behind.', onChange: (on) => { cell.cilia.mesh.visible = on; } });
features.add({ id: 'wave', group: 'Body', label: 'Metachronal waves', on: true,
  about: 'Each cilium\'s beat is offset in phase along a diagonal of the surface, so waves sweep over the cell. Off: all cilia beat in step.', onChange: (on) => { cell.cilia.mat.uniforms.uWave.value = on ? 1 : 0; } });
features.add({ id: 'pellicle', group: 'Body', label: 'Pellicle kinety pattern', on: true,
  about: 'Rows of alveolar units scatter faintly (procedural, or the MP-P03 texture when delivered).', onChange: (on) => { cell.body.material.uniforms.uPelOn.value = on ? 1 : 0; } });
features.add({ id: 'tricho', group: 'Body', label: 'Docked trichocysts', on: true,
  about: 'Spindles 4 µm long just under the pellicle: the dense granular seam along the margin in micrographs.', onChange: (on) => { cell.trichocysts.mesh.visible = on; } });
features.add({ id: 'cyclosis', group: 'Body', label: 'Cyclosis (streaming)', on: true,
  about: 'Granules, Chlorella and food vacuoles ride the endoplasm loop: back along the ventral side, forward dorsally; vacuoles are egested at the cytoproct. Sped up about five times.', onChange: (on) => { cell.opts.cyclosis = on; } });
features.add({ id: 'cv', group: 'Body', label: 'Contractile vacuole cycle', on: true,
  about: 'Two vacuoles with eight radiating canals each: canals swell, empty into the vacuole, which then empties through its pore. Period 6 s, the two half a cycle apart.', onChange: (on) => { cell.opts.cv = on; } });
features.add({ id: 'nuclei', group: 'Body', label: 'Macronucleus and micronucleus', on: true, about: 'Ellipsoidal macronucleus mid-body with the small micronucleus beside it; low contrast, as in life.', onChange: (on) => { cell.macro.visible = on; cell.micro.visible = on; } });
// Motion
features.add({ id: 'lowre', group: 'Motion', label: 'Low Reynolds number (no coasting)', on: true,
  about: 'Speed follows the ciliary beat with a 35 ms lag, so the cell stops when the trigger is released. Off: a 1.4 s glide, like a fish; physically wrong at this scale, here for comparison.', onChange: (on) => { swimmer.opts.lowRe = on; } });
features.add({ id: 'helix', group: 'Motion', label: 'Helical path and roll', on: true,
  about: 'A left-handed helix (radius and pitch scaled from the 29 µm and 850 µm measured in P. caudatum), one roll per turn, oral side toward the axis. Off: straight, with a slow roll.', onChange: (on) => { swimmer.opts.helix = on; } });
features.add({ id: 'smooth', group: 'Motion', label: 'Camera follows the helix axis', on: true,
  about: 'Both cameras track the helix axis and travel heading rather than the wobbling body, so the view stays calm while the cell itself corkscrews. Off: they follow the body itself.', onChange: (on) => { view.smoothHelix = on; } });
features.add({ id: 'beat', group: 'Motion', label: 'Ciliary beat rate', choices: ['Slowed (readable)', 'Real (15–35 Hz)'], value: 'Slowed (readable)',
  about: 'Real cilia beat 15–35 Hz, faster than a 60 Hz display can show without aliasing; the slowed rate lets the strokes and waves be followed.', onChange: (v) => { swimmer.opts.beatScale = v.startsWith('Real') ? 4.5 : 1; } });
features.add({ id: 'dash', group: 'Motion', label: 'Dash (A): ciliary sprint', fixed: true,
  about: `All cilia beat hard for ${DASH_T} s: up to ${(DASH_V / 1000).toFixed(1)} mm/s toward the stick, after a quick pivot. Escape swimming in Paramecium reaches several mm/s for a moment [the peak and the 1.8 s recharge are game values].` });
features.add({ id: 'avoid', group: 'Motion', label: 'Avoidance reaction (B, and on contact)', fixed: true, about: 'Ciliary reversal for 0.3 s (backing up), a pivot about the posterior end, then forward on a new heading (S08).' });
features.add({ id: 'burst', group: 'Motion', label: 'Trichocyst defence (X on contact)', fixed: true, about: 'When a hunter touches or holds you, X fires the trichocysts from the patch facing it: threads shoot out and throw the cell about 100 µm clear, and the hunter recoils (S09). Three charges, one back every 9 s (invented).' });
// Simulation
features.add({ id: 'squirmer', group: 'Simulation', label: 'Flow round the swimming cell', on: true,
  about: 'Bacteria feel a neutral squirmer\'s dipole field: carried ahead at the poles, swept back along the sides, decaying as 1/r³.', onChange: (on) => { world.opts.squirmer = on; } });
features.add({ id: 'feeding', group: 'Simulation', label: 'Feeding currents', on: true,
  about: 'Oral cilia draw water into the groove (stronger with LT, strongest in a gulp); bacteria reaching the cytostome are eaten. Vorticella peristomes feed the same way.', onChange: (on) => { world.opts.feeding = on; } });
features.add({ id: 'ambient', group: 'Simulation', label: 'Ambient drift', on: true, about: 'A slow drift (≈20 µm/s) with gentle eddies carries everything, the Paramecium included.', onChange: (on) => { world.opts.ambient = on; } });
features.add({ id: 'tumble', group: 'Simulation', label: 'Bacterial run-and-tumble', on: true, about: 'Half the bacteria swim 8–28 µm/s and pick a new direction every 0.6–2.4 s.', onChange: (on) => { world.opts.tumble = on; } });
// World
features.add({ id: 'didinium', group: 'World', label: 'Didinium hunters', on: true,
  about: 'Two barrel-shaped predators with two girdles of cilia and a proboscis that fires toxicysts on contact and reels the prey in (S28, S56). Held: X fires trichocysts to break free, A struggles; otherwise you are swallowed whole.', onChange: (on) => { enc.opts.didinium = on; } });
features.add({ id: 'homing', group: 'World', label: 'Didinium homing', on: true, about: 'Within ≈480 µm a Didinium turns on you and swims nearly straight at about 1 mm/s; a sideways dash makes it overshoot. Real Didinium finds prey by collision; this makes the encounter readable.', onChange: (on) => { enc.opts.homing = on; } });
features.add({ id: 'proteus', group: 'World', label: 'Amoeba proteus', on: true,
  about: 'A slow giant (≈300 µm, up to 600 with pseudopods) creeping on the slide (S29). Swim low near it and two pseudopods flank you into a food cup (S05); stay between them and it closes. Dash out, or fire trichocysts. It creeps ≈10× and reaches ≈5× faster than life.', onChange: (on) => { amoeba.opts.on = on; if (!on && swimmer.state.captor === amoeba) swimmer.release(); } });
features.add({ id: 'vort', group: 'World', label: 'Vorticella stalk contraction', on: true, about: 'Touch a Vorticella and its stalk coils in one frame (really milliseconds), then re-extends over about 3 s (S10, S11).', onChange: (on) => { world.opts.vortContract = on; } });
features.add({ id: 'scenery', group: 'World', label: 'Spirogyra, detritus, diatoms, prey', fixed: true, about: 'Three Spirogyra filaments, sparse flakes and sediment, Pinnularia and Fragilaria, bacterial clumps and Chilomonas (which jumps away with its ejectisomes when you come close).' });
// Borrowed (default off).
const looks = createBorrowedLooks(renderer);
const borrow = borrowedSwitches(features);
const bmode = { dic: 0, amoeba: 0, sem: 0 };
const BORROW = { semMite: ['SEM', 'mite'], dicTardigrade: ['Tardigrade DIC', 'tardigrade'], opticsAmoeba: ['Amoeba optics', 'amoeba'] };
borrow.add({ id: 'semMite', label: 'SEM (scanning electron microscope)', from: 'mite',
  about: 'The real geometry (body with its oral groove, Didinium, Vorticella, Spirogyra, nuclei) drawn into the mite\'s G-buffer and shaded by its secondary-electron composite. Cilia, trichocysts, bacteria and granules are shaped in their own vertex shaders, so they are left out: a bald Paramecium. Physically odd: a swimming cell in an SEM.' });
features.add({ id: 'semMiteMode', group: 'Borrowed', label: 'SEM detector', from: 'mite', choices: SEM_LOOKS, value: SEM_LOOKS[0],
  about: 'SE (topography), BSE (composition) or false colour.', onChange: (v) => { bmode.sem = SEM_LOOKS.indexOf(v); looks.semMode(bmode.sem); } });
const FIELD = 'The optical-path, scatter and absorption buffers (sharp plus the blurred defocused layer) handed to another prototype\'s image formation.';
borrow.add({ id: 'dicTardigrade', label: 'Tardigrade DIC (Nomarski)', from: 'tardigrade',
  about: `The tardigrade's interference model: sin²(π(bias + shear·∂OPD)/λ) at three wavelengths, so relief comes with warm and cool fringes. ${FIELD}` });
features.add({ id: 'dicTardigradeMode', group: 'Borrowed', label: 'Tardigrade look', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0],
  about: 'Which of the tardigrade images the switch above uses: DIC or its brightfield.', onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
borrow.add({ id: 'opticsAmoeba', label: 'Amoeba property optics', from: 'amoeba',
  about: `The amoeba's versions: brightfield with Beer–Lambert absorption, transport-of-intensity defocus and chromatic fringes, phase contrast, darkfield, or its immersive lit view with caustics. ${FIELD}` });
features.add({ id: 'opticsAmoebaMode', group: 'Borrowed', label: 'Amoeba method', from: 'amoeba', choices: AMOEBA_MODES, value: AMOEBA_MODES[0],
  about: 'Which optical method the amoeba switch above uses.', onChange: (v) => (bmode.amoeba = AMOEBA_MODES.indexOf(v)) });
const cellMeshes = new Set();
cell.group.traverse((o) => cellMeshes.add(o));

features.add({ id: 'pad', group: 'Controls', label: 'Shared control scheme (CONTROLS.md)', fixed: true,
  about: 'LS steer, RS stage/orbit, A dash, X eat (trichocysts on contact), B avoidance reaction, Y microscope/chase, LT feed, RT swim, LB/RB dive/rise, D-pad ←→ technique, D-pad ↑↓ objective, View panel, Menu features. Keyboard fallbacks in shared/pad.js.' });

/** The look on screen, including a borrowed one. */
function lookName() {
  if (borrow.id) {
    const [name, from] = BORROW[borrow.id];
    const sub = borrow.id === 'semMite' ? SEM_LOOKS[bmode.sem] : borrow.id === 'dicTardigrade' ? DIC_MODES[bmode.dic] : AMOEBA_MODES[bmode.amoeba];
    return `${name}: ${sub} (borrowed from ${from})`;
  }
  return MODE_NAMES[MODES[view.mode]];
}

// --- light: a sunlit patch of the drop that wanders slowly --------------------
const light = { c: new THREE.Vector2(), r: 420 };
function lightAt(t) { light.c.set(-260 + 260 * Math.sin(t * 0.021), 60 + 220 * Math.cos(t * 0.017)); return light; }
const inLight = (p) => Math.hypot(p.x - light.c.x, p.z - light.c.y) < light.r;

// --- game state --------------------------------------------------------------
const dash = createDash({ duration: DASH_T, cooldown: 1.8 });
const game = { eaten: 0, round: 1, sun: 1, gulpT: 0, gulpCool: 0, dashFx: 0, deaths: 0, bacteria: 0 };
const threats = () => [...(enc.opts.didinium ? world.didinia : []), ...(amoeba.opts.on ? [amoeba] : [])];
const GULP_REACH = Math.max(70, LENGTH * 0.6);
const gulpCentre = new THREE.Vector3();
function updateGulpCentre(s) { return gulpCentre.copy(s.center).addScaledVector(s.T, HL * 0.35); }

/** A hunter close enough to touch (proboscis on the pellicle, or the food cup round you). */
function touchingThreat(s) {
  if (s.mode === 'captured') return s.captor;
  let best = null, bd = Infinity;
  for (const d of world.didinia) {
    if (!enc.opts.didinium || !d.tip) continue;
    const dd = Math.min(d.tip.distanceTo(s.center) - HL * 0.6, d.pos.distanceTo(s.center) - 70 - BODY_R);
    if (dd < 55 && dd < bd) { bd = dd; best = d; }
  }
  if (amoeba.opts.on && (amoeba.cup > 0.02 || amoeba.edgeDist(s.center) < 40) && amoeba.edgeDist(s.center) < 90) best = best || amoeba;
  return best;
}

function fireTrichocysts(threat) {
  const s = swimmer.state;
  const at = threat === amoeba ? new THREE.Vector3(amoeba.pos.x, s.center.y - 40, amoeba.pos.z) : threat ? threat.pos : null;
  const held = s.mode === 'captured';
  const away = swimmer.burst(at);
  if (!away) { hud.toast(held ? 'No trichocysts left: struggle with A!' : 'No trichocysts left: they re-dock over time'); return; }
  const n = enc.discharge(s, away.clone().negate(), t, world.flowAt(s.center, t));
  if (threat === amoeba) amoeba.recoil(); else if (threat) threat.stun = 3;
  pad.rumble(240, 0.9, 1.0);
  hud.toast(`Trichocysts fired (${n} threads): ${threat === amoeba ? 'the amoeba recoils' : threat ? 'Didinium lets go and backs off' : 'thrown clear'}`);
}

function doAttack() {
  const s = swimmer.state;
  if (s.mode === 'dead') return;
  const threat = touchingThreat(s);
  if (threat) { fireTrichocysts(threat); return; }
  if (game.gulpCool > 0) return;
  game.gulpCool = 0.5; game.gulpT = 0.6;
  const got = prey.near(updateGulpCentre(s), GULP_REACH).slice(0, 3);
  for (const it of got) prey.gulp(it);
  pad.rumble(90, 0.35, 0.1);
  if (!got.length) hud.toast('Gulp! Nothing in reach: swim up to prey (green rings), level with it');
}

function doDash(ls) {
  const s = swimmer.state;
  if (s.mode === 'captured') return; // A struggles instead
  if (!dash.ready) { hud.toast('Dash recharging', 700); return; }
  let yaw = null;
  if (ls.m > 0.3) yaw = view.kind === 'scope' ? swimmer.stickYaw(ls, view.scopeYaw) : s.yaw - ls.x * 1.2;
  if (swimmer.dash(yaw)) { dash.trigger(); game.dashFx = 0.45; pad.rumble(180, 0.6, 0.9); }
}

// --- loop --------------------------------------------------------------------
let t = 0, last = performance.now(), blocked = false;
let ls = { x: 0, y: 0, m: 0 };

function tick(dt, forced = false) {
  if (debug.freeze && !forced) return;
  t += dt;
  shared.uTime.value = t;
  const s = swimmer.state;
  s.inspect = debug.inspect;
  const live = !blocked && !forced;
  ls = live ? ctl.move() : { x: 0, y: 0, m: 0 };
  lightAt(t);
  // symbionts: in the light the Chlorella feed you; in shade the store runs down
  const sunny = inLight(s.center);
  if (GREEN && marks.light) game.sun = Math.max(0, Math.min(1, game.sun + dt * (sunny ? 0.16 : -0.03)));
  else game.sun = 1;
  dash.update(dt * (0.45 + 0.55 * game.sun));
  game.gulpT = Math.max(0, game.gulpT - dt); game.gulpCool = Math.max(0, game.gulpCool - dt); game.dashFx = Math.max(0, game.dashFx - dt);
  const inp = {
    thrust: debug.inspect ? 0.5 : live ? Math.max(ctl.rt(), debug.thrust) : debug.thrust,
    hover: Math.max(live ? ctl.lt() : 0, game.gulpT > 0 ? 1 : 0), steer: live ? ls : debug.steer, rise: live ? ctl.secondary() : 0,
    view: view.kind, camYaw: view.scopeYaw, vmaxK: 0.62 + 0.38 * game.sun,
    avoid: live && ctl.defend.pressed(), struggle: live && ctl.dash.pressed() && s.mode === 'captured',
  };
  const ev = {};
  if (live && ctl.dash.pressed()) doDash(ls);
  swimmer.step(dt, t, inp, ev);
  if (live && ctl.attack.pressed()) doAttack();
  enc.update(dt, t, swimmer, ev);
  amoeba.update(dt, t, swimmer, ev, world.flowAt);
  const w = world.update(dt, t, { center: s.center, axisA: s.axisA, axisB: s.axisB, U: s.U, mouth: s.mouth, feed: s.feed, alive: s.mode !== 'dead' });
  for (let i = 0; i < w.eaten; i++) cell.ingest(10);
  game.bacteria += w.eaten;
  const p = prey.update(dt, t, { center: s.center, mouth: s.mouth, alive: s.mode !== 'dead' }, world.flowAt);
  for (const it of p.eaten) {
    cell.ingest(1);
    game.eaten++;
    pad.rumble(120, 0.4, 0.2);
    if (game.eaten >= GOAL) {
      hud.toast(`Well fed: ${GOAL} prey! The cell divides. Round ${game.round + 1}`, 3000);
      game.eaten = 0; game.round++;
    } else hud.toast(`Ate ${it.kind === 'chilomonas' ? 'a Chilomonas' : 'a bacterial clump'}: a food vacuole forms (${game.eaten}/${GOAL})`);
  }

  // the cell
  cell.group.position.copy(s.center);
  cell.group.quaternion.copy(s.quat);
  const dead = s.mode === 'dead';
  cell.group.visible = !dead || s.deadT < 0.4;
  cell.update(dt, { phase: s.beatPhase, amp: s.amp, reverse: s.reverse, oral: s.oral });

  if (ev.hit) { pad.rumble(70, 0.25, 0.1); if (ev.vorticella) hud.toast('Bumped a Vorticella: its stalk coils (and you reverse)'); }
  if (ev.avoid) pad.rumble(50, 0.15, 0);
  if (ev.captured) {
    pad.rumble(400, 0.6, 0.8);
    hud.toast(ev.captured === 'amoeba' ? 'Engulfed by the amoeba\'s food cup! X: trichocysts · A: struggle' : 'Didinium\'s proboscis has you! X: fire trichocysts · A: struggle', 2800);
  }
  if (ev.eaten) { game.deaths++; game.eaten = 0; hud.toast(ev.eaten === 'amoeba' ? 'Digested by Amoeba proteus. The round starts again' : 'Swallowed whole by Didinium. The round starts again', 2600); }
  if (ev.respawned) hud.toast('A new Paramecium swims into view');
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  pad.poll();
  blocked = features.update(); // the panel is open: no game input this frame
  if (!blocked) hud.update(pad);
  if (!blocked) {
    const step = ctl.lookStep();
    if (step) {
      if (borrow.id) features.set(borrow.id, false);
      features.set('look', MODE_NAMES[MODES[(view.mode + step + MODES.length) % MODES.length]]);
      hud.toast(MODE_NAMES[MODES[view.mode]]);
    }
    if (ctl.special.pressed()) { features.set('view', view.kind === 'chase' ? VIEW_NAMES.scope : VIEW_NAMES.chase); hud.toast(view.kind === 'scope' ? `Microscope view, ${OBJECTIVES[view.obj].name} objective` : 'Chase camera (hypothetical)'); }
    const z = ctl.zoomStep();
    if (z) {
      if (view.kind === 'scope') { features.set('objective', OBJECTIVES[Math.max(0, Math.min(2, view.obj + z))].name); hud.toast(`${OBJECTIVES[view.obj].name} objective`); }
      else view.dist = Math.max(160, Math.min(1600, view.dist * (z > 0 ? 0.8 : 1.25)));
    }
  }
  const rs = blocked ? { x: 0, y: 0, m: 0 } : ctl.camera();
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
  const cam = updateCameras(dt, s, ls);
  adapt(dt);
  drawOverlay(cam, s);
  updateGoal(s);
  if (gpuBusy()) return; // the GPU is still on an earlier frame: skip this render
  const modeName = MODES[view.mode];
  const plate = modeName === 'darkfield' ? plates.darkfield : modeName === 'phase' ? plates.phase : null;
  const pf = OBJECTIVES[view.obj].field * 4;
  const optP = {
    mode: view.mode, stop: view.kind === 'scope' && view.fieldStop, plate,
    plateOff: new THREE.Vector2(cam.position.x / pf, -cam.position.z / pf),
    blurScale: view.kind === 'scope' ? (view.dof === 'strong' ? 1.6 : 1) : 1.2,
    plateMix: view.plate === 'full' ? 1 : 0.3, plateBlur: view.plate === 'full' ? 0 : 3.5,
    plateRot: view.kind === 'scope' ? view.scopeYaw - Math.PI / 2 : 0,
    bfSoft: 1,
  };
  if (borrow.id) renderBorrowed(cam, optP, dt);
  else optics.render(scene, cam, optP);
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  rendered++;

  const bl = s.netSpeed / LENGTH;
  const charges = '●'.repeat(s.charges) + '○'.repeat(3 - s.charges);
  const where = view.kind === 'scope' ? `microscope ${OBJECTIVES[view.obj].name}, field ${(OBJECTIVES[view.obj].field / 1000).toFixed(2)} mm` : 'chase camera (hypothetical)';
  const near = nearestThreat(s);
  hud.stats([
    `${lookName()} · ${where}`,
    `${SP.latin} ${LENGTH} µm · ${Math.round(s.netSpeed).toString().padStart(4)} µm/s · ${bl.toFixed(1)} body lengths/s (max ${VMAX})`,
    `depth ${Math.round(s.center.y)} of ${DEPTH} µm · ${stateText(s)}`,
    `prey ${game.eaten}/${GOAL} (round ${game.round}) · food vacuoles ${cell.foodCount} · bacteria ${game.bacteria}`,
    `${dash.text()} · trichocysts ${charges}${GREEN ? ` · light ${Math.round(game.sun * 100)}% (${inLight(s.center) ? 'in the sun' : 'in shade'})` : ''}`,
    near ? `${near.label} ${Math.round(near.d)} µm away (${near.state})` : 'no hunter near',
    `${Math.round(renderFps)} fps · render scale ${renderScale.toFixed(2)}`,
  ].join('\n'));
}

function stateText(s) {
  return s.mode === 'avoid' ? 'avoidance reaction' : s.mode === 'captured' ? (s.captor === amoeba ? 'ENGULFED by the amoeba' : 'HELD by Didinium')
    : s.mode === 'dead' ? 'eaten' : s.dashT > 0 ? 'dashing' : game.gulpT > 0 ? 'gulping' : s.feed > 0.3 ? 'feeding' : 'swimming';
}

function nearestThreat(s) {
  let best = null;
  for (const th of threats()) {
    const d = th === amoeba ? amoeba.edgeDist(s.center) : th.pos.distanceTo(s.center);
    if (!best || d < best.d) best = { th, d, label: th.label, state: th === amoeba ? amoeba.state : th.state };
  }
  return best && best.d < 900 ? best : null;
}

const hunting = (th) => (th === amoeba ? /cupping|toward/.test(amoeba.state) : th.state === 'hunting' || th.state === 'striking' || th.state === 'feeding');

function updateGoal(s) {
  const dots = '●'.repeat(game.eaten) + '○'.repeat(GOAL - game.eaten);
  const n = Math.round(dash.charge * 5);
  const parts = [`Eat ${GOAL} prey ${dots}`];
  if (GREEN) parts.push(`${inLight(s.center) ? '☀' : '☁'} light ${'▮'.repeat(Math.round(game.sun * 5))}${'▯'.repeat(5 - Math.round(game.sun * 5))}`);
  parts.push(`A dash ${'■'.repeat(n)}${'□'.repeat(5 - n)}`, `X trichocysts ${'●'.repeat(s.charges)}${'○'.repeat(3 - s.charges)}`);
  let warn = '';
  if (s.mode === 'captured') warn = s.captor === amoeba ? 'ENGULFED: X trichocysts · A struggle' : 'HELD by Didinium: X trichocysts · A struggle';
  else if (amoeba.cup > 0.05) warn = 'The amoeba is cupping you: DASH out (A)!';
  else { const h = threats().find((th) => hunting(th) && th !== amoeba); if (h) warn = `${h.label} is hunting you: dash sideways (A)`; }
  goalEl.innerHTML = parts.join(' &nbsp;·&nbsp; ') + (warn ? `<div style="color:#ff8a7a;text-align:center;margin-top:2px">${warn}</div>` : '');
  goalEl.style.borderRadius = warn ? '12px' : '999px';
}

// --- overlay: outline, markers, light and shade --------------------------------
const pv = new THREE.Vector3();
function toScreen(p, cam) {
  pv.copy(p).project(cam);
  return { x: (pv.x + 1) / 2 * cssW, y: (1 - pv.y) / 2 * cssH, ok: pv.z > -1 && pv.z < 1 };
}
function drawOverlay(cam, s) {
  const g = markG, sg = shadeG;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); sg.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH); sg.clearRect(0, 0, cssW, cssH);
  if (debug.clean) return;
  const scopeV = view.kind === 'scope';
  const pxPerUm = scopeV ? cssH / (2 * (OBJECTIVES[view.obj].field / 2 / 0.95)) : null;
  const cx = cssW / 2, cy = cssH / 2, R = scopeV && view.fieldStop ? cssH * 0.475 : Math.hypot(cssW, cssH) / 2;
  const visible = (q) => q.ok && (scopeV && view.fieldStop ? Math.hypot(q.x - cx, q.y - cy) < R - 6 : q.x > 8 && q.y > 8 && q.x < cssW - 8 && q.y < cssH - 8);
  const dark = MODES[view.mode] === 'darkfield' || (borrow.id === 'semMite');
  const edgeArrow = (q, col, text) => {
    let dx = q.x - cx, dy = q.y - cy;
    if (!q.ok) { dx = -dx; dy = -dy; }
    const a = Math.atan2(dy, dx);
    const rr = scopeV && view.fieldStop ? R - 22 : Math.min(cssW, cssH) / 2 - 26;
    const ex = scopeV && view.fieldStop ? cx + Math.cos(a) * rr : Math.max(26, Math.min(cssW - 26, cx + Math.cos(a) * cssW));
    const ey = scopeV && view.fieldStop ? cy + Math.sin(a) * rr : Math.max(26, Math.min(cssH - 26, cy + Math.sin(a) * cssH));
    g.save(); g.translate(ex, ey); g.rotate(a);
    g.fillStyle = col; g.beginPath(); g.moveTo(13, 0); g.lineTo(-7, -9); g.lineTo(-3, 0); g.lineTo(-7, 9); g.closePath(); g.fill();
    g.restore();
    if (text) {
      g.font = '600 12px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = 'center';
      g.fillText(text, ex - Math.cos(a) * 34, ey - Math.sin(a) * 26 + 4);
    }
  };

  // light and shade (microscope view): the shaded part of the drop darker
  if (GREEN && marks.light && scopeV) {
    const lc = toScreen(new THREE.Vector3(light.c.x, 0, light.c.y), cam);
    const lr = light.r * pxPerUm;
    sg.fillStyle = 'rgb(150,160,190)';
    sg.fillRect(0, 0, cssW, cssH);
    const gr = sg.createRadialGradient(lc.x, lc.y, lr * 0.8, lc.x, lc.y, lr * 1.12);
    gr.addColorStop(0, 'rgb(255,250,235)'); gr.addColorStop(1, 'rgb(150,160,190)');
    sg.fillStyle = gr; sg.beginPath(); sg.arc(lc.x, lc.y, lr * 1.12, 0, Math.PI * 2); sg.fill();
    if (!inLight(s.center) && !visible(lc)) edgeArrow(lc, '#ffd25a', 'light');
  }

  // prey
  if (marks.prey && s.mode !== 'dead') {
    const gc = updateGulpCentre(s);
    let anyVisible = false;
    for (const it of prey.items) {
      if (!it.alive || it.pull) continue;
      const q = toScreen(it.pos, cam);
      if (!visible(q)) continue;
      anyVisible = true;
      const d = it.pos.distanceTo(gc);
      const inReach = d < GULP_REACH;
      const depthOff = Math.abs(it.pos.y - s.center.y) > 45;
      const r = Math.max(8, (it.r + 6) * (pxPerUm || 1.2));
      g.strokeStyle = inReach ? 'rgba(90,230,110,0.95)' : dark ? 'rgba(120,230,140,0.45)' : 'rgba(30,140,50,0.5)';
      g.lineWidth = inReach ? 2 : 1.2;
      g.setLineDash(depthOff ? [3, 3] : []);
      g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
    }
    if (!anyVisible) { const n = prey.nearest(s.center); if (n) edgeArrow(toScreen(n.pos, cam), dark ? '#7fe08a' : '#2f9a45', 'food'); }
  }

  // hunters
  if (marks.threats) {
    for (const th of threats()) {
      const isA = th === amoeba;
      const d = isA ? amoeba.edgeDist(s.center) : th.pos.distanceTo(s.center);
      const hot = hunting(th) || (isA && amoeba.cup > 0);
      if (!hot && d > 700) continue;
      const centre = isA ? new THREE.Vector3(amoeba.pos.x, amoeba.H, amoeba.pos.z) : th.pos;
      const q = toScreen(centre, cam);
      const col = hot ? `rgba(255,${isA && amoeba.cup > 0 ? 60 : 90},70,${0.75 + 0.25 * Math.sin(t * 10)})` : 'rgba(255,190,80,0.7)';
      const label = `${th.label}${hot ? (isA ? (amoeba.cup > 0 ? ' · cupping you!' : ' · coming for you') : th.state === 'feeding' ? ' · has you' : ' · hunting you') : ''}`;
      if (visible(q)) {
        const r = isA ? (amoeba.R + 70) * (pxPerUm || 1) : Math.max(24, 80 * (pxPerUm || 1.2));
        g.strokeStyle = col; g.lineWidth = hot ? 2.5 : 1.5; g.setLineDash([8, 6]);
        g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.font = '600 12px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = 'center';
        g.fillText(label, q.x, Math.min(cssH - 8, q.y + r + 15));
      } else edgeArrow(q, col, `${th.label} ${Math.round(d)} µm`);
    }
  }

  // your cell: a faint outline with a tick at the front
  if (marks.halo && s.mode !== 'dead') {
    const c = toScreen(s.center, cam), f = toScreen(pv.copy(s.center).addScaledVector(s.T, HL), cam);
    const fx = f.x, fy = f.y;
    const c2 = toScreen(s.center, cam);
    let ax = fx - c2.x, ay = fy - c2.y;
    let L = Math.hypot(ax, ay);
    const scale = pxPerUm || (L > 1 ? L / HL : 1);
    if (L < 1) { ax = 0; ay = -1; L = 1; }
    const a = Math.atan2(ay, ax);
    const maj = Math.max(L, HL * scale * 0.5) + 9, min = (WIDTH / 2) * scale + 9;
    const held = s.mode === 'captured';
    g.strokeStyle = held ? `rgba(255,80,60,${0.6 + 0.4 * Math.sin(t * 12)})` : dark ? 'rgba(170,235,255,0.6)' : 'rgba(0,70,95,0.55)';
    g.lineWidth = held ? 2.5 : 1.5;
    g.beginPath(); g.ellipse(c.x, c.y, maj, Math.min(maj, min), a, 0, Math.PI * 2); g.stroke();
    // the heading tick
    g.fillStyle = g.strokeStyle;
    g.save(); g.translate(c.x + Math.cos(a) * (maj + 3), c.y + Math.sin(a) * (maj + 3)); g.rotate(a);
    g.beginPath(); g.moveTo(9, 0); g.lineTo(0, -5); g.lineTo(0, 5); g.closePath(); g.fill(); g.restore();
    // dash: an expanding ring
    if (game.dashFx > 0) {
      const k = 1 - game.dashFx / 0.45;
      g.strokeStyle = dark ? `rgba(200,240,255,${1 - k})` : `rgba(0,90,120,${1 - k})`;
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(c.x, c.y, maj * (1 + k * 0.9), Math.min(maj, min) * (1 + k * 0.9), a, 0, Math.PI * 2); g.stroke();
    }
    // the gulp reach while feeding
    if (game.gulpT > 0) {
      const gc = toScreen(updateGulpCentre(s), cam);
      g.strokeStyle = 'rgba(90,230,110,0.6)'; g.lineWidth = 1.5; g.setLineDash([4, 4]);
      g.beginPath(); g.arc(gc.x, gc.y, GULP_REACH * scale, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    }
  }
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

// --- debug hooks for screenshots and tests ------------------------------------
const debug = {
  freeze: false, inspect: false, clean: false, thrust: 0, steer: { x: 0, y: 0, m: 0 },
  setMode(i) { features.set('look', MODE_NAMES[MODES[((i % MODES.length) + MODES.length) % MODES.length]]); },
  setView(k) { features.set('view', VIEW_NAMES[k]); },
  setOrbit(yaw, pitch, dist) { view.orbitYaw = yaw; view.orbitPitch = pitch; if (dist) view.dist = dist; },
  avoid() { swimmer.startAvoid(null, null); },
  dash(yaw = null) { if (swimmer.dash(yaw)) { dash.trigger(); game.dashFx = 0.45; } },
  attack() { doAttack(); },
  burst() { fireTrichocysts(touchingThreat(swimmer.state)); },
  teleport(x, y, z, yaw = 0, pitch = 0) {
    const s = swimmer.state; s.axis.set(x, y, z); s.yaw = yaw; s.pitch = pitch;
    view.camAxis.set(x, y, z); view.camYaw = yaw; view.camPitch = pitch; view.focusY = y; view.scopeYaw = yaw;
  },
  /** Put a hunter at an offset (µm) from the player, heading at it. */
  didinium(dx, dz, i = 0) {
    const s = swimmer.state, d = world.didinia[i];
    d.pos.set(s.center.x + dx, s.center.y, s.center.z + dz); d.dir.set(-dx, 0, -dz).normalize(); d.stun = 0; d.sated = 0;
  },
  amoeba(dx, dz) { const s = swimmer.state; amoeba.pos.set(s.center.x + dx, 0, s.center.z + dz); amoeba.sated = 0; amoeba.stun = 0; },
  prey(dx, dz, i = 0) { const s = swimmer.state; const it = prey.items[i]; it.pos.set(s.center.x + dx, s.center.y, s.center.z + dz); it.alive = true; it.pull = 0; },
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) tick(dt, true); },
};

window.__micro = {
  scene, renderer, cell, world, swimmer, encounters: enc, prey, amoeba, optics, view, debug, MODES, features, game, dash,
  get camera() { return view.kind === 'scope' ? scope : chase; },
  get t() { return t; },
  get look() { return lookName(); },
};
requestAnimationFrame((n) => { last = n; frame(n); });

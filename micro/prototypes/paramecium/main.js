// Paramecium prototype: Paramecium bursaria (green with symbiotic Chlorella)
// in a pond drop, followed by a chase camera (Y: through the microscope). Eat prey, keep your symbionts in
// the light, and escape Didinium and a giant Amoeba proteus. See README.md
// for controls, approach and sources.
//
// Micro Zoom: the forward landmark (a biofilm on a leaf fragment, far side of
// the drop) zooms into the bacterium level; the backdoor (the slide floor where
// the Amoeba proteus crawls, the other way) rises to the amoeba level. Up to four
// local players (shared/players.js), each their own cell, with the LEGO-style
// split screen (shared/splitscreen.js) and the edge arrows (shared/landmark.js).
import * as THREE from '../shared/vendor/three.module.min.js';
import { mountHud, keyFor } from '../shared/hud.js';
import { createDash, hudControls, addInvertY } from '../shared/controls.js';
import { createContactFx } from './fx.js';
import { loadTexture } from '../shared/assets.js';
import { createOptics, MODES, MODE_NAMES, shared, standInPlate } from './optics.js';
import { createCell, LENGTH, WIDTH, SPECIES, SPECIES_ID, FEATURE_KEY } from './cell.js';
import { createWorld, DEPTH } from './world.js';
import { createSwimmer, VMAX, DASH_V, DASH_T, BODY_R } from './swim.js';
import { createEncounters } from './encounters.js';
import { createPrey } from './prey.js';
import { createProteus } from './proteus.js';
import { createCatchFx, sstep } from './catch.js';
import { createLandmarks as createDropLandmarks, LANDMARKS } from './landmarks.js';
import { createBladderwort } from './bladderwort.js';
import { createHunger, createCapture, createFight } from '../shared/predation.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { createPlayers } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks } from '../shared/landmark.js';
import { embed } from '../shared/embed.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, AMOEBA_MODES, DIC_MODES } from '../shared/techniques/adapters.js';

const SP = SPECIES[SPECIES_ID];
const GREEN = SPECIES_ID === 'bursaria';
const GOAL = 6; // prey to eat in a round
const HL = LENGTH / 2;
void sstep;

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
  title: 'Paramecium',
  sub: GREEN
    ? `${SP.latin}, ${LENGTH} µm, green with symbiotic Chlorella, in a pond drop under the microscope. Eat, stay in the light, outswim the hunters.`
    : `${SP.latin}, ${LENGTH} µm, in a pond drop under the microscope. Eat and outswim the hunters.`,
  controls: hudControls({
    move: 'Steer (relative to the view)',
    camera: 'Orbit the camera (microscope: move the stage)',
    dash: 'Dash: ciliary sprint where the stick points',
    attack: 'Eat: a gulp draws prey into the oral groove. At a hunter: fight back (ram it and sting with a jab of trichocysts)',
    defend: 'Defend: fire trichocysts at a hunter and back off (facing it, this blocks a strike); held: break free. Elsewhere: avoidance reaction',
    special: 'Chase camera / microscope view. On the amoeba\'s floor: back to the amoeba',
    analog: 'LT slow feeding beat · RT swim (no gliding)',
    secondary: 'Dive / rise',
    look: 'Microscope technique',
    zoom: 'Objective (chase camera: distance)',
  }),
  note: `Goal: eat ${GOAL} prey (bacterial clumps and Chilomonas)${GREEN ? ', keep in the light so your Chlorella feed you' : ''}. Hunters: Didinium (fast, harpoons you on contact; a red arrow at the edge when one closes in from out of view) and Amoeba proteus (slow giant on the slide, cups you if you swim low). You glance off whatever you touch. Scale is honest (µm). The brass chevron points to the biofilm on a leaf (the way on: swim down and touch it); the ring to the floor where the amoeba crawls (the way back). Up to four players: press any button on another controller to join.`,
});
hud.players(players.list);
/** A button as the instructions should name it: the controller's, or the key while no controller is connected. */
const glyph = (b) => (hud.glyphs === 'keyboard' ? keyFor(b) || b : b);

// the goal strip: what you are doing, at a glance
const goalEl = document.createElement('div');
goalEl.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,12,16,.62);color:#eef1f4;border-radius:999px;padding:6px 14px;font:600 13px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap;z-index:3';
document.body.appendChild(goalEl);
// the backdoor prompt (standalone: in the game the shell draws its own)
const promptEl = document.createElement('div');
promptEl.style.cssText = 'position:fixed;left:50%;bottom:14vh;transform:translateX(-50%);background:rgba(18,16,10,.72);color:#efe4c4;border:1px solid rgba(201,163,90,.7);border-radius:999px;padding:5px 14px;font:600 13px system-ui,sans-serif;pointer-events:none;z-index:6;display:none';
document.body.appendChild(promptEl);

const scene = new THREE.Scene();
const cell = createCell();
scene.add(cell.group);
const world = createWorld(scene);
const swimmer = createSwimmer(cell, world);
const enc = createEncounters(scene, world, cell);
const prey = createPrey(scene);
const amoeba = createProteus(scene);
const optics = createOptics(renderer);
const contactFx = createContactFx(scene);
const catchFx = createCatchFx(scene, world, amoeba);
const drop = createDropLandmarks(scene);
// the boss: a bladderwort trap guarding the biofilm (bladderwort.js; runBoss below)
const trap = createBladderwort(scene, world);
// the Amoeba proteus keeps to its patch of slide (the backdoor) when it is not hunting
amoeba.home = LANDMARKS.back.pos.clone(); amoeba.homeR = 220;

// --- pacing: a calm opening, then hunger that comes and goes (shared/predation.js) ---
// Each hunter has its own hunger. Only a hungry one hunts; a resting one wanders
// or creeps and leaves you be. A restart gives a fresh calm opening.
const pacing = { grace: 45, cycles: true, now: 0, t0: 0, firstHungry: null, firstThreat: null };
world.didinia.forEach((d, i) => { d.hunger = createHunger({ grace: pacing.grace + i * 12 }); });
amoeba.hunger = createHunger({ grace: pacing.grace + 6, hungry: [25, 40] });
const hunters = () => [...world.didinia, amoeba];
function resetHunger() {
  const g = pacing.grace;
  world.didinia.forEach((d, i) => d.hunger.reset(g + (g ? i * 12 : 0)));
  amoeba.hunger.reset(g + (g ? 6 : 0));
  pacing.t0 = pacing.now; pacing.firstHungry = null; pacing.firstThreat = null;
}
const isHungry = (h) => (pacing.cycles ? h.hungry : h.state !== 'grace');
const hungerText = (h) => (h.state === 'grace' ? `calm ${Math.ceil(h.left)} s` : !pacing.cycles ? 'hungry' : h.state === 'hungry' ? `hungry ${Math.ceil(h.left)} s` : `resting ${Math.ceil(h.left)} s`);
// Delivered art, with procedural stand-ins until it arrives.
const plates = { darkfield: standInPlate('darkfield'), phase: standInPlate('phase') };
loadTexture('MP-P01', { srgb: false }).then((t) => { if (t) plates.darkfield = t; });
loadTexture('MP-P02', { srgb: false }).then((t) => { if (t) plates.phase = t; });
const pellicleTex = { tex: null };
loadTexture('MP-P03', { srgb: false }).then((t) => {
  if (!t) return;
  pellicleTex.tex = t;
  for (const P of roster) { P.cell.body.material.uniforms.uPellicle.value = t; P.cell.body.material.uniforms.uHasPellicle.value = 1; }
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
  fieldStop: true, smoothHelix: true, mode: 0, kind: 'chase', obj: 1, dist: 120 + 310 * (LENGTH / 230), orbitYaw: 0.5, orbitPitch: 0.4,
  stage: new THREE.Vector2(), camAxis: new THREE.Vector3().copy(swimmer.state.axis), camYaw: swimmer.state.yaw, camPitch: 0,
  focusY: swimmer.state.axis.y, scopeYaw: swimmer.state.yaw, turnView: true, lead: new THREE.Vector3(), dof: 'mild', plate: 'dim',
  focusPull: 0, focusPullY: 0, // a contact pulls fine focus to what you touched, briefly
  pull: 0, // being eaten: 0..1, the camera pulls back to frame the hunter
  groupDist: 0, // multiplayer: the chase camera backs off as the group spreads (then the screen splits)
};
const fwdOf = (yaw, out = new THREE.Vector3()) => out.set(Math.cos(yaw), 0, -Math.sin(yaw));
const angleWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Render scale adapts to the GPU: a fence per frame tells us when the GPU is
// behind, then that frame's render is skipped (the simulation keeps running)
// and the internal resolution steps down until frames keep up.
const gl = renderer.getContext();
// a software renderer (headless checks, blocklisted GPUs) starts small
const softGpu = /SwiftShader|llvmpipe|Software/i.test(gl.getParameter(gl.RENDERER) + (gl.getExtension('WEBGL_debug_renderer_info') ? gl.getParameter(0x9246) : ''));
let renderScale = softGpu ? 0.4 : 1;
let splitScale = 1; // a split frame renders the whole optics pipeline once per view: each at a lower resolution
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
  const pr = Math.min(devicePixelRatio || 1, 1.5) * renderScale * splitScale;
  // CSS size with a pixel ratio, so the split screen and the edge arrows work in CSS px
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  const b = renderer.getDrawingBufferSize(new THREE.Vector2());
  const w = Math.max(2, b.x), h = Math.max(2, b.y);
  optics.resize(w, h);
  chase.aspect = innerWidth / innerHeight;
  chase.updateProjectionMatrix();
  cssW = innerWidth; cssH = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
  for (const c of [shadeCv, markCv]) { c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr); }
}
addEventListener('resize', resize);
resize();

/**
 * Place the shared camera. `s` is player 1 (the heading the views follow);
 * `grp` the group: { multi, axis (the middle of the players' helix axes),
 * center, spread }.
 */
function updateCameras(dt, s, steer, grp) {
  const [W, H] = optics.size;
  const k = 1 - Math.exp(-dt * 6);
  view.camAxis.lerp(grp.multi ? grp.axis : view.smoothHelix ? s.axis : s.center, k);
  const centre = grp.multi ? grp.center : s.center;
  // being eaten: the camera pulls back to watch the hunter swallow you and follows it
  view.pull += ((capture.active && EATING.has(cap.phase) ? 1 : 0) - view.pull) * (1 - Math.exp(-dt * 2.2));
  view.groupDist += ((grp.multi ? Math.min(view.dist * 1.2, grp.spread * 0.55) : 0) - view.groupDist) * (1 - Math.exp(-dt * 2));
  if (view.kind === 'chase') {
    // follow the helix axis and the travel heading, not the rolling body
    const dy = Math.atan2(Math.sin(s.yaw - view.camYaw), Math.cos(s.yaw - view.camYaw));
    view.camYaw += dy * (1 - Math.exp(-dt * 3.5));
    view.camPitch += (s.pitch - view.camPitch) * (1 - Math.exp(-dt * 3));
    const yaw = view.camYaw + view.orbitYaw, pitch = Math.max(-1.3, Math.min(1.3, view.camPitch * 0.35 + view.orbitPitch));
    const back = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw));
    const target = debug.inspect ? s.center : view.camAxis;
    if (!view.smoothHelix && !grp.multi) { view.camYaw = Math.atan2(-s.T.z, s.T.x); view.camPitch = Math.asin(Math.max(-1, Math.min(1, s.T.y))); }
    const dist = (view.dist + view.groupDist) * (1 + 1.6 * view.pull);
    chase.position.copy(target).addScaledVector(back, -dist).addScaledVector(new THREE.Vector3(0, 1, 0), dist * 0.18);
    chase.position.y = Math.max(8, Math.min(DEPTH + 300, chase.position.y));
    chase.lookAt(target.x + back.x * 40, target.y + back.y * 40, target.z + back.z * 40);
    chase.updateMatrixWorld();
    shared.uFocus.value = chase.position.distanceTo(centre);
    shared.uDof.value.set(view.dof === 'off' ? 1e5 : 70, view.dof === 'off' ? 2e5 : 460);
    shared.uFade.value = 1400 + view.groupDist;
    shared.uNear.value.set(40, Math.max(60, shared.uFocus.value * 0.55));
    shared.uPxPersp.value = (2 * Math.tan((chase.fov * Math.PI) / 360)) / H;
    return chase;
  }
  const o = OBJECTIVES[view.obj];
  const half = (o.field / 2 / 0.95) * (1 + 0.9 * view.pull);
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
  // lead a little ahead of the cell so you see what you swim into (alone: the group has no one heading)
  const want = grp.multi ? new THREE.Vector3() : fwdOf(s.yaw).multiplyScalar(Math.min(o.field * 0.14, Math.max(0, s.speed) * 0.12));
  view.lead.lerp(want, 1 - Math.exp(-dt * 1.5));
  // the stage follows the helix axis (the wobble stays on the cell, not the view); fine focus tracks its depth
  view.focusPull = Math.max(0, view.focusPull - dt);
  const fy = view.focusPull > 0 ? view.focusPullY : centre.y;
  view.focusY += (fy - view.focusY) * (1 - Math.exp(-dt * (view.focusPull > 0 ? 14 : 3)));
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
const marks = { threats: true, rings: false, prey: true, light: true };
// Species
features.add({ id: 'species', group: 'Body', label: 'Species (reloads)', choices: Object.values(SPECIES).map((x) => x.name), value: SP.name,
  about: 'P. bursaria (85–150 µm, S27), the Level 3 protagonist: plump, green with several hundred symbiotic Chlorella 5–6 µm across, gathers on the lit side. P. caudatum (200–260 µm, S07): larger and colourless, no symbionts and no light meter.',
  onChange: (v) => { if (v !== SP.name) setTimeout(() => location.reload(), 60); } });
// Optics
features.add({ id: 'look', group: 'Optics', label: 'Microscope technique (D-pad ←→)', choices: MODES.map((m) => MODE_NAMES[m]), value: MODE_NAMES.brightfield,
  about: 'How the image is formed from the optical-path, scatter and absorption buffers: darkfield (zero order removed), positive phase contrast (dark where the path is long), brightfield (absorption plus a defocus term: the default, because the green Chlorella make P. bursaria the clearest thing in the field), DIC (shear derivative of the path) or a hypothetical lit view.',
  onChange: (v) => { view.mode = MODES.findIndex((m) => MODE_NAMES[m] === v); } });
features.add({ id: 'view', group: 'Optics', label: 'Camera (Y)', choices: [VIEW_NAMES.chase, VIEW_NAMES.scope], value: VIEW_NAMES.chase,
  about: 'Chase (default, as before the readability rework): a hypothetical camera in the water that follows the helix axis; LS yaws and pitches. Microscope: orthographic and top-down; the stage keeps your cell centred, a little behind the direction you swim, fine focus tracks your depth and jumps to anything you touch.',
  onChange: (v) => { view.kind = v === VIEW_NAMES.chase ? 'chase' : 'scope'; view.stage.set(0, 0); } });
features.add({ id: 'turnView', group: 'Optics', label: 'Microscope view turns with your heading', on: true,
  about: 'The view slowly turns so you swim up the screen, following the helix axis and the heading, never the roll; it holds still while you steer sideways. Off: north stays up (like a real stage).',
  onChange: (on) => { view.turnView = on; } });
features.add({ id: 'objective', group: 'Optics', label: 'Objective (D-pad ↑↓)', choices: OBJECTIVES.map((o) => o.name), value: '20×',
  about: 'Field of view for an FN 18 eyepiece: 10× 1.8 mm, 20× 0.9 mm (the Level 3 field), 40× 0.45 mm.',
  onChange: (v) => { view.obj = Math.max(0, OBJECTIVES.findIndex((o) => o.name === v)); } });
features.add({ id: 'dof', group: 'Optics', label: 'Depth of field (microscope)', choices: Object.values(DOFS), value: DOFS.mild,
  about: 'Each fragment is split between a sharp and a defocused layer by its distance from the focal plane. Mild (default): about 35 µm sharp at 20×, so whatever you can bump into is visible; touching something pulls focus to it. Strong: only the layer you swim in is crisp (16 µm, fully blurred by 75 µm) and far layers fade. Off: everything sharp.',
  onChange: (v) => { view.dof = Object.keys(DOFS).find((k) => DOFS[k] === v) || 'mild'; shared.uDofOn.value = view.dof === 'off' ? 0 : 1; } });
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
// Game aids (drawn over the image, not part of it). Nothing is drawn round your own cell.
features.add({ id: 'threatMarks', group: 'Optics', label: 'Hunter arrow', on: true,
  about: 'A faint red arrow at the edge of the view, only for a hunter that is closing in on you from out of view. Hunters in view are left to the image.', onChange: (on) => { marks.threats = on; } });
features.add({ id: 'threatRings', group: 'Optics', label: 'Hunter rings', on: false,
  about: 'Dashed rings and labels round hunters in view (the rework\'s markers; off by default so the view stays immersive).', onChange: (on) => { marks.rings = on; } });
features.add({ id: 'preyMarks', group: 'Optics', label: 'Prey cues', on: true,
  about: 'A small soft ring on prey only when it is in reach of a gulp, and a faint arrow to the nearest prey when none is in view.', onChange: (on) => { marks.prey = on; } });
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
features.add({ id: 'avoid', group: 'Motion', label: 'Avoidance reaction (B)', fixed: true, about: 'Ciliary reversal for 0.3 s (backing up), a pivot about the posterior end, then forward on a new heading (S08).' });
features.add({ id: 'glance', group: 'Motion', label: 'Glance off obstacles', fixed: true,
  about: 'Touching anything (a filament, a flake, the slide, the coverslip, the meniscus at the rim of the drop) turns your heading along its surface so you slide past instead of stopping. The contact shows as a puff of specks at the point, a bump of the cell and a rumble; in the microscope view focus jumps to what you touched.' });
features.add({ id: 'avoidOnContact', group: 'Motion', label: 'Avoidance reaction on hard contact', on: false,
  about: 'What a real Paramecium does when its front end hits something (S08): back up and turn. Off by default because it takes control away; on, it fires on a hard head-on hit with a filament, flake or cell (never the glass).', onChange: (on) => { swimmer.opts.avoidOnContact = on; } });
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
const GRACES = ['45 s', '20 s', '0 s (hunters from the start)'];
features.add({ id: 'grace', group: 'World', label: 'Calm opening before the hunters get hungry', choices: GRACES, value: GRACES[0],
  about: 'For the first 45 s of a round (and after every restart) no hunter is hungry: Didinium wanders, Amoeba proteus creeps and neither comes for you, so you can explore first. The second Didinium wakes 12 s after the first and the amoeba 6 s after. Shorter openings are for testing.',
  onChange: (v) => { pacing.grace = parseFloat(v); resetHunger(); } });
features.add({ id: 'hunger', group: 'World', label: 'Hunger comes and goes', on: true,
  about: 'After the calm opening each hunter is hungry for 18–32 s (the amoeba 25–40 s), then rests: 45–75 s after a meal, 15–30 s after a miss (trichocysts drive it off, or it gives up). Only a hungry hunter hunts; the HUD shows each one\'s state. Off: once the opening is over they hunt all the time (the old pacing).',
  onChange: (on) => { pacing.cycles = on; } });
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

addInvertY(features);
features.add({ id: 'pad', group: 'Controls', label: 'Shared control scheme (CONTROLS.md)', fixed: true,
  about: 'LS steer, RS orbit/stage, A dash, X eat (trichocysts on contact), B avoidance reaction, Y chase/microscope, LT feed, RT swim, LB/RB dive/rise, D-pad ←→ technique, D-pad ↑↓ objective, View panel, Menu features. Keyboard fallbacks in shared/pad.js.' });

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
const audio = createAudio(['paramecium/amb-pool', 'paramecium/swim', 'paramecium/dash', 'paramecium/gulp', 'paramecium/trichocysts', 'paramecium/reverse', 'paramecium/didinium', 'paramecium/held']);
audio.addToFeatures(features);
audio.loop('paramecium/amb-pool', { volume: 0.6 });
const swimLoop = audio.loop('paramecium/swim', { volume: 0 });
const snd = { mode: 'swim', hunting: new WeakMap(), lastHunt: -9, t: 0 };
/** Gamepads fire no DOM events: unlock sound on any pad button. */
function unlockOnPad() {
  for (const P of roster) {
    if (P.pad.kind !== 'controller') continue;
    for (let b = 0; b < 16; b++) if (P.pad.value(b) > 0.5) { audio.unlock(); return; }
  }
}
function soundTick(dt) {
  snd.t += dt;
  const s = swimmer.state;
  const k = Math.max(...roster.map((P) => (P.swimmer.state.mode === 'dead' ? 0 : Math.min(1, Math.abs(P.swimmer.state.speed) / VMAX))));
  swimLoop.set({ volume: 0.15 + 0.7 * k, rate: 0.8 + 0.5 * k + (s.dashT > 0 ? 0.2 : 0) });
  for (const P of roster) {
    const m = P.swimmer.state.mode;
    if (m !== P.sndMode) { if (m === 'avoid') audio.play('paramecium/reverse', { volume: 0.8 }); P.sndMode = m; }
  }
  // Didinium closing in: once per hunt, quieter the further it is
  if (enc.opts.didinium && s.mode !== 'dead' && s.mode !== 'captured') {
    for (const d of world.didinia) {
      const on = d.state === 'hunting' || d.state === 'striking';
      if (on && !snd.hunting.get(d) && snd.t - snd.lastHunt > 1.5) {
        snd.lastHunt = snd.t;
        const T = (d.target || swimmer).state;
        const dist = d.pos.distanceTo(T.center);
        audio.play('paramecium/didinium', { volume: Math.max(0.25, Math.min(1, 700 / (dist + 200))), pan: Math.max(-1, Math.min(1, (d.pos.x - T.center.x) / 800)) });
      }
      snd.hunting.set(d, on);
    }
  }
}
const game = { eaten: 0, round: 1, sun: 1, gulpT: 0, gulpCool: 0, dashFx: 0, deaths: 0, bacteria: 0, contacts: 0 };
const threats = () => [...(enc.opts.didinium ? world.didinia : []), ...(amoeba.opts.on ? [amoeba] : [])];
const GULP_REACH = Math.max(70, LENGTH * 0.6);
const gulpCentre = new THREE.Vector3();
function updateGulpCentre(s) { return gulpCentre.copy(s.center).addScaledVector(s.T, HL * 0.35); }

// --- the players: one cell each ------------------------------------------------
const CATCH = {
  didinium: { by: 'Didinium', how: 'swallowed you whole', strike: 'Didinium\'s proboscis strikes: toxicysts fire into you!', hold: () => `HELD by Didinium: ${glyph('B')} trichocysts · ${glyph('A')} / ${glyph('X')} struggle`, eat: 'Didinium\'s mouth gapes wide: it swallows you whole', follow: 'Swallowed whole: the Didinium swims off with you inside', fadeOut: '', fadeIn: '' },
  amoeba: { by: 'Amoeba proteus', how: 'closed you into a food vacuole', strike: 'The food cup closes round you!', hold: () => `ENGULFED by the amoeba: ${glyph('B')} trichocysts · ${glyph('A')} / ${glyph('X')} struggle`, eat: 'A food vacuole forms round you and darkens: digestion begins', follow: 'Inside the amoeba: it creeps on, digesting', fadeOut: '', fadeIn: '' },
};
CATCH.bladder = { by: 'A bladderwort trap', how: 'sucked you in, and its door shut behind you', strike: 'SUCKED toward the trap door!', hold: () => `Pulled through the door: ${glyph('B')} trichocysts to burst free`, eat: 'The door shuts: you are inside the bladder', follow: 'Inside the bladder: its glands begin to digest you', fadeOut: '', fadeIn: '' };
const catchText = (k, phase) => { const v = CATCH[k][phase]; return typeof v === 'function' ? v() : v; };
const roster = [];
function makePlayer(p, c = null, sw = null) {
  const cellP = c || createCell();
  if (!c) {
    scene.add(cellP.group);
    if (pellicleTex.tex) { cellP.body.material.uniforms.uPellicle.value = pellicleTex.tex; cellP.body.material.uniforms.uHasPellicle.value = 1; }
  }
  const P = {
    slot: p.slot, color: p.color, name: `Player ${p.slot + 1}`, cell: cellP, swimmer: sw || createSwimmer(cellP, world),
    pad: players.pad(p.slot), ctl: players.controls(p.slot),
    dash: createDash({ duration: DASH_T, cooldown: 1.8 }), sun: 1, gulpT: 0, gulpCool: 0, dashFx: 0,
    capture: createCapture({ onRespawn: () => respawnPlayer(P) }),
    cap: { th: null, credit: 0, phase: null, from: new THREE.Vector3(), fromQ: new THREE.Quaternion(), anim: null },
    in: null, backT: 0, eatenFor: 0, waiting: false, sndMode: 'swim', blockT: 0, fightFx: 0, fightCool: 0, eatFx: 0,
  };
  // the capture's card, then its veil (the fade) and caption: in multiplayer one
  // player's fade must not black out everyone's screen, so the veil is hidden there
  P.card = P.capture.card;
  P.veil = P.card.nextElementSibling;
  return P;
}
const P1 = makePlayer(players.get(0), cell, swimmer);
roster.push(P1);
const dash = P1.dash, capture = P1.capture, cap = P1.cap;
const multi = () => roster.length > 1;
const liveRoster = () => roster.filter((P) => !P.waiting);

/** Keep one cell per joined player (a join during play, or the shell's roster). */
function syncRoster() {
  for (const p of players.list) {
    if (roster.some((P) => P.slot === p.slot)) continue;
    const P = makePlayer(p);
    roster.push(P);
    roster.sort((a, b) => a.slot - b.slot);
    placeNear(P, P1);
    P.swimmer.state.safeT = 3;
  }
  for (let i = roster.length - 1; i >= 0; i--) {
    const P = roster[i];
    if (P === P1 || players.get(P.slot)) continue;
    if (P.swimmer.state.captor) { P.swimmer.release(); }
    P.capture.reset(false);
    P.card.remove(); if (P.veil) { P.veil.nextElementSibling && P.veil.nextElementSibling.remove(); P.veil.remove(); }
    scene.remove(P.cell.group);
    roster.splice(i, 1);
  }
  for (const P of roster) {
    const p = players.get(P.slot);
    P.waiting = !!(p && p.waiting);
    if (P.veil) P.veil.style.visibility = multi() ? 'hidden' : '';
    P.cell.group.visible = !P.waiting;
    if (P !== P1) {
      // the switches in the feature panel act on every cell
      Object.assign(P.swimmer.opts, swimmer.opts);
      Object.assign(P.cell.opts, cell.opts);
      if (P.cell.chlorella && cell.chlorella) P.cell.chlorella.visible = cell.chlorella.visible;
      P.cell.cilia.mesh.visible = cell.cilia.mesh.visible;
      P.cell.trichocysts.mesh.visible = cell.trichocysts.mesh.visible;
      P.cell.macro.visible = cell.macro.visible; P.cell.micro.visible = cell.micro.visible;
      P.cell.cilia.mat.uniforms.uWave.value = cell.cilia.mat.uniforms.uWave.value;
      P.cell.body.material.uniforms.uPelOn.value = cell.body.material.uniforms.uPelOn.value;
    }
  }
}
/** Put P beside a teammate: a couple of body lengths to the side, at its depth. */
function placeNear(P, M) {
  const m = M.swimmer.state, s = P.swimmer.state;
  const a = m.yaw + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 0.6);
  const d = LENGTH * (1.4 + Math.random() * 0.8);
  s.axis.set(m.axis.x + Math.cos(a) * d, Math.max(70, Math.min(DEPTH - 70, m.axis.y + (Math.random() - 0.5) * 40)), m.axis.z - Math.sin(a) * d);
  s.yaw = m.yaw; s.pitch = 0; s.speed = 0;
}

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

const who = (P) => (multi() ? `${P.name}: ` : '');
/**
 * B, the defence: trichocysts fired at the hunter (the real defence against
 * Didinium) and a ciliary reversal that backs you off it while you keep facing
 * it. Facing a hunter at its strike, this blocks it. Held: breaks you free.
 */
function defend(P) {
  const s = P.swimmer.state;
  if (s.mode === 'dead') return;
  P.blockT = 0.6;
  const threat = s.mode === 'captured' ? s.captor : trap.awake && s.center.distanceTo(trap.door) < trap.pullR * 1.3 ? trap : nearHunter(P, 320);
  if (!threat) { if (P.swimmer.startAvoid(null, null)) audio.play('paramecium/reverse', { volume: 0.8 }); return; }
  fireTrichocysts(P, threat);
}
function fireTrichocysts(P, threat) {
  const s = P.swimmer.state;
  const at = threat === amoeba ? new THREE.Vector3(amoeba.pos.x, s.center.y - 40, amoeba.pos.z) : threat === trap ? trap.door : threat ? threat.pos : null;
  const held = s.mode === 'captured';
  s.reverse = -1; // the ciliary reversal: you back off, still facing it
  const away = P.swimmer.burst(at);
  if (away) audio.play('paramecium/trichocysts', { volume: 1 });
  if (!away) {
    if (!held && threat) { s.burst.addScaledVector(new THREE.Vector3().subVectors(s.center, at).setY(0).normalize(), 500); }
    hud.toast(held ? `${who(P)}No trichocysts left: struggle with ${glyph('A')} or ${glyph('X')}!` : `${who(P)}No trichocysts left (they re-dock over time): backing off`);
    return;
  }
  const n = enc.discharge(s, away.clone().negate(), t, world.flowAt(s.center, t));
  if (held) { if (threat === amoeba) amoeba.recoil(); else if (threat) threat.stun = 3; if (threat && threat.hunger && threat.hunger.hungry) threat.hunger.missed(); }
  P.pad.rumble(240, 0.9, 1.0);
  hud.toast(`${who(P)}Trichocysts fired (${n} threads)${held ? (threat === amoeba ? ': the amoeba recoils' : ': Didinium lets go and backs off') : ''}`);
}
/** The hunter close to a player (for B and X), or null. */
function nearHunter(P, within) {
  const s = P.swimmer.state;
  let best = null, bd = within;
  if (enc.opts.didinium) for (const d of world.didinia) { const dd = d.pos.distanceTo(s.center) - 60; if (dd < bd) { bd = dd; best = d; } }
  if (amoeba.opts.on) { const da = amoeba.edgeDist(s.center); if (da < bd) { bd = da; best = amoeba; } }
  return best;
}
const facingOf = (s, p) => { const v = new THREE.Vector3().subVectors(p, s.center); if (s === null) return 0; v.y *= 0.4; return s.F.dot(v.normalize()); };
const hunterPoint = (th, s) => (th === amoeba ? new THREE.Vector3(amoeba.pos.x, Math.min(s.center.y, amoeba.H), amoeba.pos.z) : th.pos);
/**
 * X at a hunter, fighting back: the cell rams it, body thrashing, and a jab of
 * trichocysts from the patch facing it stings it (no charge spent, a short
 * cooldown). Wears its interest down (createFight.bitten): it staggers back,
 * and after a few it gives up and swims off.
 */
function fightBack(P, th) {
  const s = P.swimmer.state;
  if (P.fightCool > 0) return true;
  P.fightCool = 0.8; P.fightFx = 0.5;
  const at = hunterPoint(th, s);
  const to = new THREE.Vector3().subVectors(at, s.center).normalize();
  P.swimmer.dash(Math.atan2(-to.z, to.x));
  enc.discharge(s, to, t, world.flowAt(s.center, t), 0.35);
  contactFx.puff(new THREE.Vector3().addVectors(s.center, at).multiplyScalar(0.5), to.clone().negate(), 0.8);
  audio.play('paramecium/trichocysts', { volume: 0.7, rate: 1.3 });
  P.pad.rumble(160, 0.7, 0.6);
  const reach = th === amoeba ? amoeba.edgeDist(s.center) < 120 : at.distanceTo(s.center) < 260;
  if (reach && th.fight) {
    const gone = th.fight.bitten();
    if (th === amoeba) amoeba.stun = Math.max(amoeba.stun, 0.8);
    hud.toast(gone ? `${who(P)}${th.label} has had enough: it turns and swims off` : `${who(P)}You ram and sting ${th.label}: it reels back`, 1600);
  }
  return true;
}

function doAttack(P) {
  const s = P.swimmer.state;
  if (s.mode === 'dead') return;
  if (s.mode === 'captured') { P.cap.credit = Math.min(1.2, P.cap.credit + 0.4); return; } // struggle
  const th = nearHunter(P, 260);
  if (th && facingOf(s, hunterPoint(th, s)) > 0.2) { fightBack(P, th); return; }
  if (P.gulpCool > 0) return;
  P.gulpCool = 0.5; P.gulpT = 0.6;
  audio.play('paramecium/gulp', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
  const got = prey.near(updateGulpCentre(s), GULP_REACH).slice(0, 3);
  for (const it of got) prey.gulp(it, P.feedRef);
  P.pad.rumble(90, 0.35, 0.1);
  if (!got.length) hud.toast(`${who(P)}Gulp! Nothing in reach: swim up to prey (green rings), level with it`);
}

function doDash(P, ls) {
  const s = P.swimmer.state;
  if (s.mode === 'captured') return; // A struggles instead
  if (!P.dash.ready) { if (P === P1) hud.toast('Dash recharging', 700); return; }
  let yaw = null;
  if (ls.m > 0.3) yaw = view.kind === 'scope' ? P.swimmer.stickYaw(ls, view.scopeYaw) : s.yaw - ls.x * 1.2;
  if (P.swimmer.dash(yaw)) { audio.play('paramecium/dash', { volume: 0.9 }); P.dash.trigger(); P.dashFx = 0.45; P.pad.rumble(180, 0.6, 0.9); }
}

/** A contact: show where it happened and what it was; never a silent stop. */
const taught = new Set();
function onContact(P, c) {
  game.contacts++;
  if (c.impact < 40) return; // a graze: you just slide on
  const k = Math.min(1, c.impact / 900);
  contactFx.puff(c.p, c.n, 0.35 + k);
  P.pad.rumble(60 + 90 * k, 0.15 + 0.4 * k, 0.05 + 0.3 * k);
  if (view.kind === 'scope' && !multi()) { view.focusPull = 0.5; view.focusPullY = c.p.y; }
  if (c.glass && !taught.has(c.what) && c.impact > 60) {
    taught.add(c.what);
    hud.toast(c.what === 'the slide' ? 'The slide: the glass floor of the drop. You glide along it' : c.what === 'the coverslip' ? 'The coverslip: the glass ceiling. You glide along it' : 'The meniscus: the edge of the drop. You slide round it', 2200);
  }
}

// --- being caught: strike → hold → eat → follow → fade → respawn (shared/predation.js) ----
// The camera pulls back to watch the hunter swallow you whole, follows it as
// it swims (or creeps) off with you inside, then fades; you respawn at a safe
// spot (alone) or beside a teammate (together), and it fades back in.
const catchKind = (th) => (th === amoeba ? 'amoeba' : th === trap ? 'bladder' : 'didinium');
function startCapture(P, th) {
  if (!th || P.capture.active) return;
  const k = catchKind(th), C = P.cap;
  C.th = th; C.credit = 0; C.phase = 'strike'; C.anim = null;
  P.eatenFor = 0;
  P.capture.start({ by: CATCH[k].by, how: CATCH[k].how });
  const s = P.swimmer.state;
  if (k === 'didinium') {
    const toward = new THREE.Vector3().subVectors(s.center, th.tip).normalize();
    enc.toxicysts(th.tip, toward, t);
    contactFx.puff(th.tip, toward, 1);
    audio.play('paramecium/didinium', { volume: 1 });
  }
  audio.play('paramecium/held', { volume: 1 });
  P.pad.rumble(400, 0.6, 0.8);
  hud.toast(`${who(P)}${k === 'amoeba' ? `The amoeba's food cup closes! ${glyph('B')}: trichocysts · ${glyph('A')} / ${glyph('X')}: struggle` : `Didinium's proboscis has you! ${glyph('B')}: fire trichocysts · ${glyph('A')} / ${glyph('X')}: struggle`}`, 2800);
  embed.captured({ by: CATCH[k].by, player: P.slot });
}
const otherCatch = (P) => roster.some((Q) => Q !== P && Q.capture.active);
const EATING = new Set(['eat', 'follow', 'fadeOut', 'fadeIn']);
/** Run the catch for this frame; returns the cell's eat-phase transform or null. */
function stepCapture(P, dt) {
  if (!P.capture.active) return null;
  const s = P.swimmer.state, C = P.cap;
  if (!C.th) { P.capture.update(dt); return null; } // respawned: fading back in
  const th = C.th, k = catchKind(th);
  // a fight in the strike or hold: trichocysts (B) break free, struggling (A/X) buys time
  if ((C.phase === 'strike' || C.phase === 'hold') && s.mode !== 'captured') {
    P.capture.reset(false); th.hunger.missed(); th.wrap = 0; C.th = null; C.phase = null;
    if (th.fight) th.fight.bitten();
    if (!otherCatch(P)) catchFx.reset();
    return null;
  }
  let step = dt;
  if (C.phase === 'hold') {
    const len = Math.max(0.8, (th.holdFor || 4) - 0.45); // as long as the old hold: 3.5 s (amoeba 2.5 s)
    const use = Math.min(C.credit, dt);
    C.credit -= use;
    step = (dt - use) / len;
  }
  const c = P.capture.update(step);
  if (!c.active || !C.th) return null; // over, or respawned this frame (respawnPlayer has run)
  if (c.phase !== C.phase) {
    C.phase = c.phase;
    if (c.phase === 'eat') {
      P.swimmer.eaten();
      C.from.copy(s.axis); C.fromQ.copy(P.cell.group.quaternion);
      th.hunger.fed(); th.sated = 14;
      game.deaths++;
      audio.play('paramecium/gulp', { volume: 1, rate: k === 'didinium' ? 0.6 : 0.5 });
      P.pad.rumble(600, 0.8, 0.6);
    }
    if (c.phase === 'follow') { th.followSpeed = k === 'didinium' ? 260 : 30; }
  }
  // the reel and the closing cup
  if (c.phase === 'strike') { s.captureT = 0; th.wrap = c.t; }
  else if (c.phase === 'hold') { s.captureT = c.t * (th.holdFor || 4); th.wrap = 1; }
  if (c.phase === 'strike' && k === 'didinium') catchFx.didiniumGape(th, 0, 0);
  if (EATING.has(c.phase)) {
    const e = c.phase === 'eat' ? c.t : 1;
    if (k === 'didinium' && c.phase !== 'eat') {
      // swallowed whole: the mouth closes, the Didinium swims off bulging with you inside
      const close = c.phase === 'follow' ? c.t : 1;
      catchFx.didiniumGape(th, Math.max(0, 1 - close * 2.5), 1);
      C.anim = C.anim || { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: new THREE.Vector3() };
      C.anim.pos.copy(th.pos).addScaledVector(th.dir, -6);
      C.anim.quat.setFromUnitVectors(new THREE.Vector3(1, 0, 0), th.dir.clone().negate());
      C.anim.scale.set(0.56, 0.78, 0.78);
    } else if (k === 'bladder') {
      // through the door and into the bladder; the door shuts behind you and the camera holds on it
      C.anim = C.anim || { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: new THREE.Vector3() };
      const inside = trap.centre.clone().addScaledVector(trap.dir, 60).setY(trap.centre.y - 40);
      C.anim.pos.copy(C.from).lerp(inside, sstep(0, 0.7, e));
      C.anim.quat.copy(C.fromQ);
      const k2 = 1 - 0.12 * sstep(0.5, 1, e);
      C.anim.scale.set(k2, k2, k2);
    } else C.anim = k === 'didinium' ? catchFx.eatDidinium(th, e, C.from, C.fromQ) : catchFx.eatAmoeba(e, C.from, C.fromQ);
    s.axis.copy(C.anim.pos); // the camera follows you (and so the hunter)
    return C.anim;
  }
  return null;
}
/** The catch is over (the screen is black): respawn beside a teammate, or (alone) somewhere safe. */
function respawnPlayer(P) {
  const C = P.cap;
  if (C.th) { C.th.wrap = 0; C.th.followSpeed = 0; }
  C.th = null; C.phase = null; C.anim = null;
  if (!otherCatch(P)) catchFx.reset();
  P.swimmer.respawn();
  P.cell.group.scale.set(1, 1, 1);
  P.eatenFor = 0;
  const mates = roster.filter((Q) => Q !== P && !Q.waiting && Q.swimmer.state.mode !== 'dead' && !Q.capture.active);
  const s = P.swimmer.state;
  if (mates.length) { placeNear(P, mates[0]); hud.toast(`${P.name} is back, beside ${mates[0].name}`); }
  else {
    // a safe spot: the candidate furthest from every hunter
    let best = null, bd = -1;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, r = 200 + Math.random() * 900;
      const q = new THREE.Vector3(Math.cos(a) * r, 120 + Math.random() * (DEPTH - 240), Math.sin(a) * r);
      const d = Math.min(...world.didinia.map((h) => h.pos.distanceTo(q)), Math.hypot(q.x - amoeba.pos.x, q.z - amoeba.pos.z) - amoeba.R, q.distanceTo(trap.door) - trap.pullR * 1.5);
      if (d > bd) { bd = d; best = q; }
    }
    s.axis.copy(best);
    if (P === P1) { view.camAxis.copy(best); view.focusY = best.y; }
    hud.toast('A new Paramecium swims into view, well away from the hunters', 2600);
  }
  s.safeT = 3;
}
function restartRound() {
  const s = swimmer.state;
  for (const P of roster) {
    if (P !== P1) { if (P.capture.active) P.capture.reset(false); P.cap.th = null; P.cap.phase = null; P.cap.anim = null; }
  }
  swimmer.respawn();
  cap.th = null; cap.phase = null; cap.anim = null;
  catchFx.reset();
  for (const P of roster) { P.cell.group.scale.set(1, 1, 1); if (P !== P1) { P.swimmer.respawn(); placeNear(P, P1); } }
  game.eaten = 0;
  // the hunters start well away from you
  const out = new THREE.Vector3(s.axis.x, 0, s.axis.z);
  if (out.lengthSq() < 1) out.set(1, 0, 0);
  out.normalize();
  world.didinia.forEach((d, i) => {
    const a = Math.atan2(out.z, out.x) + Math.PI + (i ? 0.9 : -0.9);
    const r = Math.min(1250, Math.hypot(s.axis.x, s.axis.z) + 1000);
    d.pos.set(Math.cos(a) * Math.min(r, 1300), d.pos.y, Math.sin(a) * Math.min(r, 1300));
    d.stun = 0; d.sated = 0; d.speed = 0;
  });
  if (Math.hypot(amoeba.pos.x - s.axis.x, amoeba.pos.z - s.axis.z) < 800) amoeba.pos.set(-out.x * 900, 0, -out.z * 900);
  amoeba.cup = 0; amoeba.sated = 0; amoeba.stun = 0; amoeba.wrap = 0;
  resetHunger();
  hud.toast('A new Paramecium swims into view. The hunters are calm for now', 2600);
}

// --- the fights -----------------------------------------------------------------
// Each hunter has a shared/predation.js fight. Calm (not hungry) it ignores you.
// Hungry and close it stalks, then winds up (a clear posture: Didinium slows and
// aims its swelling, reddening toxicyst tip at you; the amoeba lifts and spreads
// two arms round you), then strikes. Facing it and pressing B at the strike
// blocks it; X fights back; facing it wears it down too. Out of interest, it
// swims (or creeps) off. An unblocked strike that reaches you is a catch.
for (const d of world.didinia) d.fight = createFight({ windup: 0.95, strike: 0.32, recoverT: 1.0, repelT: 1.2, retreatT: 6 });
amoeba.fight = createFight({ windup: 1.4, strike: 0.5, recoverT: 1.6, repelT: 1.6, retreatT: 8, facingRate: 0.04 });
amoeba.fightMode = true;
enc.opts.fight = true;
const segDist = (p, s) => { const ab = new THREE.Vector3().subVectors(s.axisB, s.axisA); const k = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(p, s.axisA).dot(ab) / ab.lengthSq())); return s.axisA.clone().addScaledVector(ab, k).distanceTo(p); };
function runFights(dt) {
  const fightOn = (P) => { const s = P.swimmer.state; return !P.waiting && (s.mode === 'swim' || s.mode === 'avoid') && !P.capture.active && s.safeT <= 0; };
  for (const th of hunters()) {
    const isA = th === amoeba;
    if (isA ? !amoeba.opts.on : !enc.opts.didinium) { th.fightState = 'stalk'; continue; }
    const T = targetOf(th), s = T.swimmer.state;
    const on = th.hungry && th.stun <= 0 && th.sated <= 0 && fightOn(T);
    const at = hunterPoint(th, s);
    const dist = isA ? Math.hypot(s.center.x - amoeba.pos.x, s.center.z - amoeba.pos.z) : th.pos.distanceTo(s.center);
    const low = isA ? s.center.y < amoeba.H * 2 + 150 : true;
    const near = on && (isA ? dist < 650 : dist < 480);
    const inReach = on && (isA ? dist < amoeba.R + 330 && low : dist < 250);
    const facing = facingOf(s, at) > 0.45;
    const f = th.fight.update(dt, { near, inReach, facing, blocking: T.blockT > 0 });
    th.fightState = f.state; th.fightT = f.t;
    if (f.hit && on) {
      const hit = isA ? dist < amoeba.R + 290 && low : th.tip && segDist(th.tip, s) < 85;
      if (hit) {
        if (isA) amoeba.tip.set(amoeba.pos.x, amoeba.H, amoeba.pos.z);
        if (T.swimmer.capture(th)) startCapture(T, th);
      } else if (T === P1 || multi()) hud.toast(`${who(T)}${th.label} strikes and misses`, 1200);
    }
    if (f.blocked) {
      contactFx.puff(isA ? s.center : th.tip || th.pos, new THREE.Vector3().subVectors(s.center, at).normalize(), 1);
      if (isA) amoeba.recoil(); else th.stun = Math.max(th.stun || 0, 0.6);
      T.pad.rumble(220, 0.8, 0.7);
      hud.toast(`${who(T)}Blocked! ${th.label} recoils`, 1600);
    }
    if (f.retreated) { th.hunger.missed(); hud.toast(`${th.label} loses interest and ${isA ? 'creeps' : 'swims'} away`, 2200); }
  }
}

// --- the boss: the bladderwort trap guarding the biofilm ---------------------------
// A shared/predation.js fight with more resolve and three patterns: an aimed
// pulse when you come near its door (trigger hairs), a pulse on its own every
// 7–12 s while you are about, and (resolve under half) a wider pull. Its tell:
// the door quivers and the walls draw in; then the suction pulse pulls in
// everything near the door; then it resets for 2.4 s with the door shut: dash
// past then. Each wasted pulse and each trichocyst burst out of its inflow
// (B) costs it resolve; spent, it hangs full and slack and cannot fire for a
// while. Dormant until a player comes near after the calm opening.
trap.fight = createFight({ windup: 1.3, strike: 0.38, recoverT: 2.4, repelT: 1.4, retreatT: 24, facingRate: 0, blockHit: 0.18, biteHit: 0.17 });
trap.hunger = createHunger({ grace: 0 });
trap.spontT = 8;
const gaugeEl = document.createElement('div');
gaugeEl.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:3;pointer-events:none;display:none;color:#e6d3a3;font:600 11px/1.2 system-ui,sans-serif;letter-spacing:.04em;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.7)';
gaugeEl.innerHTML = '<div class="nm"></div><div style="margin:3px auto 0;width:150px;height:5px;border:1px solid rgba(201,163,90,.85);border-radius:3px;background:rgba(20,16,8,.45)"><i style="display:block;height:100%;background:#c9a35a;border-radius:2px;width:100%"></i></div>';
document.body.appendChild(gaugeEl);
const bossInfo = { log: [] };
function runBoss(dt) {
  const after = pacing.now - pacing.t0 > pacing.grace;
  let nd = Infinity;
  for (const P of liveRoster()) { const s = P.swimmer.state; if (s.mode === 'dead') continue; nd = Math.min(nd, s.center.distanceTo(trap.door)); }
  if (!trap.awake && (after || bossInfo.force) && nd < trap.wakeR) {
    trap.awake = true; bossInfo.log.push({ ev: 'wake', t });
    hud.toast('A bladderwort trap guards the biofilm. Watch its door: when it quivers, get clear; dash past while it resets', 3600);
  }
  if (!trap.awake) { trap.update(dt, 'stalk', 0, t); gaugeEl.style.display = 'none'; return; }
  const pullR = trap.pullR * (trap.phase2 ? 1.3 : 1);
  // the patterns: an aimed pulse (someone at its trigger hairs) or one on its own
  trap.spontT -= dt;
  let fire = nd < 320;
  if (trap.spontT <= 0 && nd < trap.wakeR) { fire = true; if (trap.fight.state === 'windup') trap.spontT = 7 + Math.random() * 5; }
  const inflow = (P) => { const s = P.swimmer.state; return !P.waiting && (s.mode === 'swim' || s.mode === 'avoid') && !P.capture.active && s.center.distanceTo(trap.door) < pullR; };
  const blocking = roster.some((P) => inflow(P) && P.blockT > 0);
  const f = trap.fight.update(dt, { near: nd < trap.wakeR, inReach: fire, facing: true, blocking });
  if (f.state === 'windup' && trap.state !== 'windup') bossInfo.log.push({ ev: 'tell', t });
  trap.phase2 = f.interest < 0.5;
  let caught = false;
  if (f.state === 'strike') {
    if (!trap.pulsed) { trap.pulsed = true; bossInfo.log.push({ ev: 'pulse', t }); contactFx.puff(trap.door, trap.dir, 1.4); for (const P of roster) if (inflow(P)) P.pad.rumble(300, 0.9, 0.9); }
    for (const P of roster) {
      if (!inflow(P)) continue;
      const s = P.swimmer.state;
      const to = new THREE.Vector3().subVectors(trap.door, s.center);
      const d = to.length();
      // the inflow: strongest at the door (a game value; really ≈1 m/s for half a millisecond)
      s.axis.addScaledVector(to.normalize(), (300 + 2400 * Math.pow(1 - d / pullR, 0.6)) * dt);
      if (d < 95) { s.safeT = 0; if (P.swimmer.capture(trap)) { startCapture(P, trap); caught = true; bossInfo.log.push({ ev: 'catch', slot: P.slot, t }); } }
    }
  } else trap.pulsed = false;
  if (f.hit && !caught && !roster.some((P) => P.capture.active && P.cap.th === trap)) {
    // a wasted pulse: it has to reset, and it tires
    const gone = trap.fight.bitten();
    bossInfo.log.push({ ev: 'miss', t });
    if (nd < trap.wakeR && !gone) hud.toast('The trap fired and missed: it is resetting. Dash past now!', 2000);
  }
  if (f.blocked) { bossInfo.log.push({ ev: 'blocked', t }); hud.toast('Trichocysts! You burst clear of the inflow', 1800); }
  if (trap.fight.state === 'retreat' && !trap.spent) { trap.spent = true; bossInfo.log.push({ ev: 'spent', t }); hud.toast('The trap has fired itself out: full and slack, it cannot reset for a while. Slip past to the biofilm!', 3600); }
  else if (trap.fight.state !== 'retreat') trap.spent = false;
  trap.fightT = f.t;
  trap.update(dt, trap.fight.state, f.t, t);
  // the resolve gauge: quiet, brass, only while someone is near
  const show = nd < trap.wakeR * 1.3;
  gaugeEl.style.display = show ? 'block' : 'none';
  if (show) {
    gaugeEl.querySelector('.nm').textContent = trap.spent ? 'Bladderwort trap · spent' : `Bladderwort trap${trap.phase2 ? ' · straining' : ''}`;
    gaugeEl.querySelector('i').style.width = `${Math.round(trap.fight.interest * 100)}%`;
  }
}

// --- who the hunters go for -------------------------------------------------------
/** The player a hunter goes for: the one it holds, else the nearest free one. */
function targetOf(th) {
  const held = roster.find((P) => P.swimmer.state.captor === th);
  if (held) return held;
  const at = th === amoeba ? new THREE.Vector3(amoeba.pos.x, 0, amoeba.pos.z) : th.pos;
  let best = null, bd = Infinity;
  for (const P of liveRoster()) {
    const s = P.swimmer.state;
    if (s.mode === 'dead' || s.mode === 'captured' || P.capture.active) continue;
    const d = th === amoeba ? Math.hypot(s.center.x - at.x, s.center.z - at.z) : s.center.distanceTo(at);
    if (d < bd) { bd = d; best = P; }
  }
  return best || P1;
}

// --- the landmarks ---------------------------------------------------------------
const FWD = LANDMARKS.forward, BACK = LANDMARKS.back;
const lm = { fired: false, near: false, log: [] };
function landmark(kind, P) {
  lm.log.push({ kind, slot: P ? P.slot : 0, t });
  embed.landmark(kind, { player: P ? P.slot : 0 });
}
const flatDist = (s, L) => Math.hypot(s.center.x - L.pos.x, s.center.z - L.pos.z);
function landmarkTick(dt) {
  let at = null, close = false;
  for (const P of roster) {
    const s = P.swimmer.state;
    const ok = !P.waiting && (s.mode === 'swim' || s.mode === 'avoid') && !P.capture.active;
    // forward: down on the biofilm (touch the leaf)
    const df = flatDist(s, FWD);
    if (ok && df < FWD.r && s.center.y < FWD.reachY) at = at || P;
    if (df < FWD.r * 1.6 && s.center.y < FWD.reachY * 1.6) close = true;
    // backdoor: low over the floor where the amoeba crawls
    P.backT = ok && flatDist(s, BACK) < BACK.r && s.center.y < BACK.reachY ? P.backT + dt : 0;
  }
  if (at && !lm.fired) { lm.fired = true; landmark('forward', at); }
  if (!close) lm.fired = false;
  const dweller = roster.find((P) => P.backT > 0.5) || null;
  if (!!dweller !== lm.near) { lm.near = !!dweller; embed.near('back', lm.near); }
  promptEl.style.display = lm.near && !embed.active ? 'block' : 'none';
  if (lm.near) promptEl.textContent = `${glyph('Y')} · back to the amoeba`;
}

// --- loop --------------------------------------------------------------------
let t = 0, last = performance.now(), blocked = false, frameCount = 0;
let ls = { x: 0, y: 0, m: 0 };
const NO_INPUT = { ls: { x: 0, y: 0, m: 0 }, rt: 0, lt: 0, rise: 0, avoid: false, dashP: false, attackP: false, defendP: false };
/** Read a player's buttons once per frame (pressed() is a fresh press since the last poll). */
function readInput(P) {
  const c = P.ctl;
  return { ls: c.move(), rt: c.rt(), lt: c.lt(), rise: c.secondary(), avoid: c.defend.pressed(), dashP: c.dash.pressed(), attackP: c.attack.pressed(), defendP: c.defend.pressed() };
}

function tick(dt, forced = false) {
  if (debug.freeze && !forced) return;
  t += dt;
  pacing.now = t;
  shared.uTime.value = t;
  const s = swimmer.state;
  s.inspect = debug.inspect;
  const live = !blocked && !forced;
  lightAt(t);
  const evs = new Map();
  for (const P of roster) {
    const sP = P.swimmer.state;
    const I = live && P.in && !P.waiting ? P.in : NO_INPUT;
    const lsP = I.ls;
    if (P === P1) ls = live ? lsP : { x: 0, y: 0, m: 0 };
    // symbionts: in the light the Chlorella feed you; in shade the store runs down
    const sunny = inLight(sP.center);
    if (GREEN && marks.light) P.sun = Math.max(0, Math.min(1, P.sun + dt * (sunny ? 0.16 : -0.03)));
    else P.sun = 1;
    P.dash.update(dt * (0.45 + 0.55 * P.sun));
    P.gulpT = Math.max(0, P.gulpT - dt); P.gulpCool = Math.max(0, P.gulpCool - dt); P.dashFx = Math.max(0, P.dashFx - dt);
    const isP1 = P === P1;
    const inp = {
      thrust: isP1 && debug.inspect ? 0.5 : live && !P.waiting ? Math.max(I.rt, isP1 ? debug.thrust : 0) : isP1 ? debug.thrust : 0,
      hover: Math.max(live ? I.lt : 0, P.gulpT > 0 ? 1 : 0), steer: live ? lsP : isP1 ? debug.steer : NO_INPUT.ls, rise: live ? I.rise : 0,
      view: view.kind, camYaw: view.scopeYaw, vmaxK: 1, // shade slows the dash recharge only, never your swimming
      avoid: false, struggle: live && I.dashP && sP.mode === 'captured', // B is handled by defend()
    };
    const ev = {};
    const locked = P.capture.active; // a catch in progress: only the fight (X, A, B) while held
    if (live && !locked && I.dashP) doDash(P, lsP);
    if (live && locked && sP.mode === 'captured' && I.dashP) P.cap.credit = Math.min(1.2, P.cap.credit + 0.4);
    P.blockT = Math.max(0, P.blockT - dt); P.fightFx = Math.max(0, P.fightFx - dt); P.fightCool = Math.max(0, P.fightCool - dt); P.eatFx = Math.max(0, P.eatFx - dt);
    if (live && (!locked || sP.mode === 'captured') && I.defendP) defend(P);
    P.swimmer.step(dt, t, inp, ev);
    if (live && (!locked || sP.mode === 'captured') && I.attackP) doAttack(P);
    evs.set(P, ev);
  }
  game.sun = P1.sun; game.gulpT = P1.gulpT; game.dashFx = P1.dashFx;
  soundTick(dt);
  // hunger: each hunter's own clock; only a hungry one hunts
  for (const th of hunters()) {
    th.hunger.update(dt);
    th.hungry = isHungry(th.hunger);
  }
  if (pacing.firstHungry === null && hunters().some((th) => th.hungry)) pacing.firstHungry = t - pacing.t0;
  // the fights: each hunter's wind-up, strike, block, bite back and retreat (shared/predation.js createFight)
  runFights(dt);
  runBoss(dt);
  // hunters pick a player: the one they hold, else the nearest free one
  const evH = {};
  enc.update(dt, t, (d) => { const T = targetOf(d); d.target = T.swimmer; return T.swimmer; }, evH);
  const aT = targetOf(amoeba);
  amoeba.target = aT.swimmer;
  for (const P of roster) if (P !== aT) P.swimmer.state.slow *= Math.exp(-dt * 4);
  amoeba.update(dt, t, aT.swimmer, evH, world.flowAt);
  if (pacing.firstThreat === null && s.mode === 'swim' && threats().some((th) => hunting(th) || (th === amoeba && amoeba.cup > 0))) pacing.firstThreat = t - pacing.t0;
  // a catch began: whoever is now held
  for (const P of roster) {
    const sP = P.swimmer.state;
    if (sP.mode === 'captured' && !P.capture.active && sP.captor) startCapture(P, sP.captor);
  }
  const anims = new Map();
  for (const P of roster) anims.set(P, stepCapture(P, dt));
  // the water, the bacteria and the prey, for every cell
  const feeds = roster.map((P) => {
    const sP = P.swimmer.state;
    if (!P.feedRef) P.feedRef = {};
    return Object.assign(P.feedRef, { center: sP.center, axisA: sP.axisA, axisB: sP.axisB, U: sP.U, mouth: sP.mouth, feed: sP.feed, alive: sP.mode !== 'dead' && !P.waiting });
  });
  const w = world.update(dt, t, feeds);
  roster.forEach((P, i) => { for (let k = 0; k < (w.eatenBy ? w.eatenBy[i] : 0); k++) P.cell.ingest(10); });
  game.bacteria += w.eaten;
  const p = prey.update(dt, t, feeds, world.flowAt);
  for (const it of p.eaten) {
    const P = roster.find((Q) => Q.feedRef === it.eatenBy) || P1;
    P.cell.ingest(1, it.kind === 'chilomonas' ? 12 : 9);
    P.eatFx = 0.6;
    game.eaten++;
    P.pad.rumble(120, 0.4, 0.2);
    if (game.eaten >= GOAL) {
      hud.toast(`Well fed: ${GOAL} prey! The cell divides. Round ${game.round + 1}`, 3000);
      game.eaten = 0; game.round++;
    } else hud.toast(`${who(P)}Ate ${it.kind === 'chilomonas' ? 'a Chilomonas' : 'a bacterial clump'}: a food vacuole forms (${game.eaten}/${GOAL})`);
  }

  // the cells
  for (const P of roster) {
    const sP = P.swimmer.state, C = P.cell, ev = evs.get(P), anim = anims.get(P);
    C.group.position.copy(sP.center);
    C.group.quaternion.copy(sP.quat);
    C.update(dt, { phase: sP.beatPhase, amp: sP.amp, reverse: sP.reverse, oral: sP.oral });
    if (ev.contact) onContact(P, ev.contact);
    if (ev.vorticella) hud.toast('Bumped a Vorticella: its stalk coils');
    // the bump: the cell recoils from the contact and squashes a little
    if (sP.bumpT > 0) {
      const k = Math.sin(Math.PI * (1 - sP.bumpT / 0.28));
      C.group.position.addScaledVector(sP.bumpN, 5 * k * (LENGTH / 120));
      C.group.scale.set(1 - 0.1 * k, 1 + 0.05 * k, 1 + 0.05 * k);
    } else C.group.scale.set(1, 1, 1);
    // eating prey: the cell bulges round the oral groove as the food vacuole forms
    if (P.eatFx > 0) { const k = Math.sin(Math.PI * P.eatFx / 0.6); C.group.scale.set(1 - 0.05 * k, 1 + 0.12 * k, 1 + 0.08 * k); }
    // fighting back: a ram with the body thrashing about its long axis
    if (P.fightFx > 0) {
      const k = P.fightFx / 0.5;
      C.group.rotateY(Math.sin(t * 46) * 0.22 * k);
      C.group.rotateX(Math.sin(t * 31) * 0.5 * k);
      C.group.scale.set(1 + 0.12 * k, 1 - 0.06 * k, 1 - 0.06 * k);
    }
    if (anim) { C.group.position.copy(anim.pos); C.group.quaternion.copy(anim.quat); C.group.scale.copy(anim.scale); }
    if (sP.slow > 0.1) P.pad.rumble(40, 0.15 * sP.slow, 0.05); // the food cup dragging on you
    if (ev.avoid) P.pad.rumble(50, 0.15, 0);
  }
  contactFx.update(dt);
  landmarkTick(dt);
}

/** The group for the shared camera: the middle of the players' helix axes, and how far apart they are. */
const grp = { multi: false, axis: new THREE.Vector3(), center: new THREE.Vector3(), spread: 0 };
function group() {
  const ps = liveRoster();
  grp.multi = ps.length > 1;
  grp.axis.set(0, 0, 0); grp.center.set(0, 0, 0);
  for (const P of ps) { grp.axis.add(P.swimmer.state.axis); grp.center.add(P.swimmer.state.center); }
  grp.axis.multiplyScalar(1 / Math.max(1, ps.length)); grp.center.multiplyScalar(1 / Math.max(1, ps.length));
  grp.spread = 0;
  for (const P of ps) grp.spread = Math.max(grp.spread, P.swimmer.state.axis.distanceTo(grp.axis));
  return grp;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frameCount++;
  players.poll();
  syncRoster();
  unlockOnPad();
  blocked = features.update(); // the panel is open: no game input this frame
  if (!blocked) hud.update(pad);
  for (const P of roster) P.in = blocked || P.waiting ? null : readInput(P);
  if (!blocked) {
    const step = ctl.lookStep();
    if (step) {
      if (borrow.id) features.set(borrow.id, false);
      features.set('look', MODE_NAMES[MODES[(view.mode + step + MODES.length) % MODES.length]]);
      hud.toast(MODE_NAMES[MODES[view.mode]]);
    }
    // Y: on the amoeba's floor it takes everyone back to the amoeba; elsewhere (player 1) the camera
    for (const P of roster) {
      if (P.waiting || !P.ctl.special.pressed()) continue;
      if (P.backT > 0.5) landmark('back', P);
      else if (P === P1) { features.set('view', view.kind === 'chase' ? VIEW_NAMES.scope : VIEW_NAMES.chase); hud.toast(view.kind === 'scope' ? `Microscope view, ${OBJECTIVES[view.obj].name} objective` : 'Chase camera (hypothetical)'); }
    }
    const z = ctl.zoomStep();
    if (z) {
      if (view.kind === 'scope') { features.set('objective', OBJECTIVES[Math.max(0, Math.min(2, view.obj + z))].name); hud.toast(`${OBJECTIVES[view.obj].name} objective`); }
      else view.dist = Math.max(160, Math.min(1600, view.dist * (z > 0 ? 0.8 : 1.25)));
    }
  }
  const rs = blocked ? { x: 0, y: 0, m: 0 } : ctl.camera();
  if (view.kind === 'chase') {
    // orbit: look() pitch +1 means look up (the camera swings lower), Invert Y honoured
    const lk = blocked ? { yaw: 0, pitch: 0, m: 0 } : ctl.look();
    view.orbitYaw -= lk.yaw * 2.2 * dt;
    view.orbitPitch = Math.max(-1.2, Math.min(1.2, view.orbitPitch + lk.pitch * 1.6 * dt));
    // being caught by the amoeba: the camera rises to look down into the cup and the vacuole
    const pitch0 = capture.active && cap.th === amoeba ? -0.85 : 0.4;
    if (rs.m === 0 && !debug.inspect) { const k = 1 - Math.exp(-dt * (capture.active ? 2 : 0.6)); view.orbitYaw += (0.5 - view.orbitYaw) * k; view.orbitPitch += (pitch0 - view.orbitPitch) * k; }
  } else {
    const half = OBJECTIVES[view.obj].field / 2;
    view.stage.x = Math.max(-half, Math.min(half, view.stage.x + rs.x * half * dt));
    view.stage.y = Math.max(-half, Math.min(half, view.stage.y + rs.y * half * dt));
    if (rs.m === 0) view.stage.multiplyScalar(Math.exp(-dt * 0.8));
  }

  tick(dt);

  const s = swimmer.state;
  const cam = updateCameras(dt, s, ls, group());
  adapt(dt);
  // the split screen (one view while together: the fast path, as before)
  const list = liveRoster().map((P) => ({ slot: P.slot, position: P.swimmer.state.center }));
  const L = split.update(list.length ? list : [{ slot: 0, position: s.center }], { camera: cam }, dt);
  const want = L.views.length > 1 ? 0.75 : 1;
  if (want !== splitScale) { splitScale = want; resize(); }
  drawOverlay(cam);
  updateGoal(s);
  if (gpuBusy()) return; // the GPU is still on an earlier frame: skip this render
  const modeName = MODES[view.mode];
  const plate = modeName === 'darkfield' ? plates.darkfield : modeName === 'phase' ? plates.phase : null;
  const pf = OBJECTIVES[view.obj].field * 4;
  const many = L.views.length > 1;
  split.render(cam, (v) => {
    // each view focuses on its own players' depth
    if (many) focusFor(v, cam);
    const optP = {
      mode: view.mode, stop: view.kind === 'scope' && view.fieldStop && !many, plate,
      plateOff: new THREE.Vector2(cam.position.x / pf, -cam.position.z / pf),
      blurScale: view.kind === 'scope' ? (view.dof === 'strong' ? 1.6 : 1) : 1.2,
      plateMix: view.plate === 'full' ? 1 : 0.3, plateBlur: view.plate === 'full' ? 0 : 3.5,
      plateRot: view.kind === 'scope' ? view.scopeYaw - Math.PI / 2 : 0,
      bfSoft: 1,
    };
    if (borrow.id) renderBorrowed(cam, optP, dt);
    else optics.render(scene, cam, optP);
  });
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  rendered++;
  // the edge arrows: the brass chevron to the biofilm, the ring to the amoeba's floor
  edgeMarks.begin();
  edgeMarks.drawSplit(arrowSplit(), FWD.pos, { kind: 'forward', label: FWD.label, range: 3000 });
  edgeMarks.drawSplit(arrowSplit(), BACK.pos, { kind: 'backdoor', label: BACK.label, range: 3000 });

  const bl = s.netSpeed / LENGTH;
  const charges = '●'.repeat(s.charges) + '○'.repeat(3 - s.charges);
  const where = view.kind === 'scope' ? `microscope ${OBJECTIVES[view.obj].name}, field ${(OBJECTIVES[view.obj].field / 1000).toFixed(2)} mm` : 'chase camera (hypothetical)';
  const near = nearestThreat(s);
  hud.stats([
    `${lookName()} · ${where}`,
    `${SP.latin} ${LENGTH} µm · ${Math.round(s.netSpeed).toString().padStart(4)} µm/s · ${bl.toFixed(1)} body lengths/s (max ${VMAX})`,
    `depth ${Math.round(s.center.y)} of ${DEPTH} µm · ${stateText(s)}`,
    `prey ${game.eaten}/${GOAL} (round ${game.round}) · food vacuoles ${cell.foodCount} · bacteria ${game.bacteria}`,
    `${dash.text()} · trichocysts ${charges}${GREEN ? ` · light ${Math.round(P1.sun * 100)}% (${inLight(s.center) ? 'in the sun' : 'in shade'})` : ''}`,
    near ? `${near.label} ${Math.round(near.d)} µm away (${near.state})` : 'no hunter near',
    `hunger: ${world.didinia.map((d, i) => `Didinium ${i + 1} ${enc.opts.didinium ? hungerText(d.hunger) : 'off'}`).join(' · ')} · amoeba ${amoeba.opts.on ? hungerText(amoeba.hunger) : 'off'}`,
    `biofilm ${Math.round(flatDist(s, FWD))} µm · amoeba's floor ${Math.round(flatDist(s, BACK))} µm`,
    multi() ? `players ${roster.length} · views ${L.views.length}${L.merged ? ' (together)' : ''}` : '',
    `${Math.round(renderFps)} fps · render scale ${(renderScale * splitScale).toFixed(2)}`,
  ].filter((l) => l).join('\n'));
}

/** A split view's focal plane: the depth of the players it shows. */
function focusFor(v, cam) {
  const c = new THREE.Vector3();
  let n = 0;
  for (const P of roster) if (v.slots.includes(P.slot)) { c.add(P.swimmer.state.center); n++; }
  if (!n) return;
  c.multiplyScalar(1 / n);
  if (view.kind === 'scope') shared.uFocus.value = cam.position.y - c.y;
  else { shared.uFocus.value = cam.position.distanceTo(c); shared.uNear.value.set(40, Math.max(60, shared.uFocus.value * 0.55)); }
}

function stateText(s) {
  if (capture.active) return `${cap.phase === 'strike' ? 'STRUCK' : cap.phase === 'hold' ? 'HELD' : 'BEING EATEN'} by ${CATCH[catchKind(cap.th)].by}`;
  return s.mode === 'avoid' ? 'avoidance reaction' : s.mode === 'captured' ? (s.captor === amoeba ? 'ENGULFED by the amoeba' : 'HELD by Didinium')
    : s.mode === 'dead' ? 'eaten' : s.dashT > 0 ? 'dashing' : P1.gulpT > 0 ? 'gulping' : s.feed > 0.3 ? 'feeding' : 'swimming';
}

function nearestThreat(s) {
  let best = null;
  for (const th of threats()) {
    const d = th === amoeba ? amoeba.edgeDist(s.center) : th.pos.distanceTo(s.center);
    if (!best || d < best.d) best = { th, d, label: th.label, state: th === amoeba ? amoeba.state : th.state };
  }
  return best && best.d < 900 ? best : null;
}

const hunting = (th) => (th === amoeba ? /cupping|toward/.test(amoeba.state) : th.state === 'hunting' || th.state === 'striking' || th.state === 'winding up' || th.state === 'feeding');
/** A hunter visibly attacking (winding up or striking). */
const attacking = (th) => th.fight && th.fightState && (th.fightState === 'windup' || th.fightState === 'strike') && (th === amoeba ? amoeba.cup > 0 : th.state === 'winding up' || th.state === 'striking');

function updateGoal(s) {
  const dots = '●'.repeat(game.eaten) + '○'.repeat(GOAL - game.eaten);
  const n = Math.round(dash.charge * 5);
  const parts = [`Eat ${GOAL} prey ${dots}`];
  if (GREEN) parts.push(`${inLight(s.center) ? '☀' : '☁'} light ${'▮'.repeat(Math.round(P1.sun * 5))}${'▯'.repeat(5 - Math.round(P1.sun * 5))}`);
  parts.push(`${glyph('A')} dash ${'■'.repeat(n)}${'□'.repeat(5 - n)}`, `${glyph('X')} trichocysts ${'●'.repeat(s.charges)}${'○'.repeat(3 - s.charges)}`);
  // the most urgent thing happening to anyone (named in multiplayer)
  let warn = '';
  if (trap.awake) {
    const near = liveRoster().find((P) => P.swimmer.state.center.distanceTo(trap.door) < trap.pullR * 1.3 && !P.capture.active);
    const st = trap.fight.state;
    if (near && st === 'windup') warn = `${who(near)}The trap door quivers: get clear of it, or wait for the pulse`;
    else if (near && st === 'strike') warn = `${who(near)}SUCTION! Dash away (${glyph('A')}) · ${glyph('B')} trichocysts burst you out`;
    else if (near && (st === 'recover' || st === 'repelled')) warn = `${who(near)}<span style="color:#bfe3a0">The trap is resetting: dash past now!</span>`;
  }
  for (const P of roster) {
    const sP = P.swimmer.state, C = P.cap;
    let w = '';
    if (P.capture.active && C.phase !== 'eaten') w = catchText(catchKind(C.th), C.phase);
    else if (P.capture.active) w = '';
    else if (sP.mode === 'captured') w = sP.captor === amoeba ? `ENGULFED: ${glyph('X')} trichocysts · ${glyph('A')} struggle` : `HELD by Didinium: ${glyph('X')} trichocysts · ${glyph('A')} struggle`;
    else {
      const a = threats().find((th) => attacking(th) && (th === amoeba ? amoeba.target === P.swimmer : th.target === P.swimmer));
      const h = threats().find((th) => hunting(th) && th !== amoeba && th.target === P.swimmer);
      if (a === amoeba) w = `The amoeba's arms rise round you: face it and ${glyph('B')} to block, ${glyph('X')} to fight back, or dash out (${glyph('A')})`;
      else if (a) w = `${a.label} is ${a.fightState === 'strike' ? 'STRIKING' : 'winding up to strike'}: face it and ${glyph('B')} to block · ${glyph('X')} to fight back`;
      else if (h) w = `${h.label} is hunting you: face it (${glyph('X')} fights back) or dash sideways (${glyph('A')})`;
      else { const r = threats().find((th) => th.fightState === 'retreat' && th.target === P.swimmer); if (r) w = ''; }
    }
    if (w) { warn = who(P) + w; break; }
  }
  goalEl.innerHTML = parts.join(' &nbsp;·&nbsp; ') + (warn ? `<div style="color:#ff8a7a;text-align:center;margin-top:2px">${warn}</div>` : '');
  goalEl.style.borderRadius = warn ? '12px' : '999px';
}

// --- overlay: subtle cues, light and shade (nothing round your own cell) --------
// Drawn once per split view, clipped to its region; in multiplayer each cell
// gets a faint ring in its player's colour so you can tell who is who.
/** The split layout without degenerate (empty) regions, for shared/landmark.js. */
const arrowSplit = () => { const L = split.layout; return { layout: { ...L, regions: L.regions.filter((r) => r.polygon.length > 2) }, project: split.project }; };
const split = createSplitScreen(renderer, { capture: true, up: null });
const edgeMarks = createLandmarks({ zIndex: 4 });
function drawOverlay(cam) {
  const g = markG, sg = shadeG;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); sg.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH); sg.clearRect(0, 0, cssW, cssH);
  if (debug.clean) return;
  const L = split.layout;
  const many = L.views.length > 1;
  for (const v of L.views) {
    const regs = L.regions.filter((r) => r.view === v.index && r.polygon.length > 2);
    const P = roster.find((Q) => v.slots.includes(Q.slot)) || P1;
    const anchor = regs.length && many ? [regs.reduce((a, r) => a + r.anchor[0], 0) / regs.length, regs.reduce((a, r) => a + r.anchor[1], 0) / regs.length] : [cssW / 2, cssH / 2];
    for (const ctx of [g, sg]) {
      ctx.save();
      if (many) { ctx.beginPath(); for (const r of regs) { ctx.moveTo(r.polygon[0][0], r.polygon[0][1]); for (const q of r.polygon.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); } ctx.clip(); }
    }
    drawViewOverlay(cam, P.swimmer.state, (p) => { const q = split.project(v.index, p); return { x: q.x, y: q.y, ok: !q.behind }; }, anchor, many);
    g.restore(); sg.restore();
  }
}
function drawViewOverlay(cam, s, proj, anchor, many) {
  const g = markG, sg = shadeG;
  const scopeV = view.kind === 'scope';
  const stopOn = scopeV && view.fieldStop && !many;
  const pxPerUm = scopeV ? cssH / (2 * (OBJECTIVES[view.obj].field / 2 / 0.95)) : cssH / (2 * Math.tan((chase.fov * Math.PI) / 360) * Math.max(1, chase.position.distanceTo(s.center)));
  const [cx, cy] = anchor;
  const R = stopOn ? cssH * 0.475 : Math.hypot(cssW, cssH) / 2;
  const visible = (q) => q.ok && (stopOn ? Math.hypot(q.x - cssW / 2, q.y - cssH / 2) < R - 6 : q.x > 8 && q.y > 8 && q.x < cssW - 8 && q.y < cssH - 8);
  const dark = MODES[view.mode] === 'darkfield' || (borrow.id === 'semMite');
  const edgeArrow = (q, col, text) => {
    let dx = q.x - cx, dy = q.y - cy;
    if (!q.ok) { dx = -dx; dy = -dy; }
    const a = Math.atan2(dy, dx);
    const rr = stopOn ? R - 22 : Math.min(cssW, cssH) / 2 - 26;
    const ex = stopOn ? cssW / 2 + Math.cos(a) * rr : Math.max(26, Math.min(cssW - 26, cx + Math.cos(a) * cssW));
    const ey = stopOn ? cssH / 2 + Math.sin(a) * rr : Math.max(26, Math.min(cssH - 26, cy + Math.sin(a) * cssH));
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
    const lc = proj(new THREE.Vector3(light.c.x, 0, light.c.y));
    const lr = light.r * pxPerUm;
    sg.fillStyle = 'rgb(150,160,190)';
    sg.fillRect(0, 0, cssW, cssH);
    const gr = sg.createRadialGradient(lc.x, lc.y, lr * 0.8, lc.x, lc.y, lr * 1.12);
    gr.addColorStop(0, 'rgb(255,250,235)'); gr.addColorStop(1, 'rgb(150,160,190)');
    sg.fillStyle = gr; sg.beginPath(); sg.arc(lc.x, lc.y, lr * 1.12, 0, Math.PI * 2); sg.fill();
    if (!inLight(s.center) && !visible(lc)) edgeArrow(lc, '#ffd25a', 'light');
  }

  // multiplayer: a faint ring in each player's colour (alone, nothing is drawn round your cell)
  if (multi()) {
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    for (const P of liveRoster()) {
      const sP = P.swimmer.state;
      if (sP.mode === 'dead') continue;
      const q = proj(P.cell.group.position);
      if (!q.ok) continue;
      const e = proj(P.cell.group.position.clone().addScaledVector(right, HL * 1.25));
      const r = Math.max(14, Math.hypot(e.x - q.x, e.y - q.y));
      g.globalAlpha = 0.55; g.strokeStyle = P.color; g.lineWidth = 1.6;
      g.beginPath(); g.arc(q.x, q.y, r, -0.3, Math.PI * 0.55); g.stroke();
      g.beginPath(); g.arc(q.x, q.y, r, Math.PI * 0.85, Math.PI * 1.55); g.stroke();
      g.globalAlpha = 0.8; g.fillStyle = P.color; g.font = '600 10px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText(`P${P.slot + 1}`, q.x, q.y - r - 4);
      g.globalAlpha = 1;
    }
  }

  // the trap's tell and pulse: a pulsing red ring at its door
  if (marks.threats && trap.awake && (trap.fight.state === 'windup' || trap.fight.state === 'strike')) {
    const q = proj(trap.door);
    if (visible(q)) { g.globalAlpha = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 18)); g.strokeStyle = '#ff5a46'; g.lineWidth = 2.2; g.beginPath(); g.arc(q.x, q.y, Math.max(16, trap.doorR * 1.3 * pxPerUm), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  }
  // an attack: a pulsing red ring on the toxicyst tip (or round the amoeba's rising arms) while it winds up and strikes
  if (marks.threats) for (const th of threats()) {
    if (!attacking(th)) continue;
    const q = proj(th === amoeba ? new THREE.Vector3(amoeba.pos.x, amoeba.H, amoeba.pos.z) : th.tip || th.pos);
    if (!visible(q)) continue;
    const k = th.fightState === 'strike' ? 1 : th.fightT || 0;
    const r = th === amoeba ? Math.max(30, (amoeba.R + 120) * pxPerUm) : 9 + 10 * (1 - k);
    g.globalAlpha = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 18));
    g.strokeStyle = '#ff5a46'; g.lineWidth = th === amoeba ? 2 : 2.2;
    if (th === amoeba) g.setLineDash([10, 8]);
    g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.globalAlpha = 1;
  }

  // prey: a small soft ring only when in reach of a gulp; a faint arrow when none is in view
  if (marks.prey && s.mode !== 'dead') {
    const gcs = liveRoster().map((P) => updateGulpCentre(P.swimmer.state).clone());
    let anyVisible = false;
    for (const it of prey.items) {
      if (!it.alive || it.pull) continue;
      const q = proj(it.pos);
      if (!visible(q)) continue;
      anyVisible = true;
      if (!gcs.some((gc) => it.pos.distanceTo(gc) < GULP_REACH)) continue;
      const r = Math.max(7, (it.r + 5) * pxPerUm);
      g.strokeStyle = dark ? 'rgba(150,240,160,0.55)' : 'rgba(40,150,60,0.55)';
      g.lineWidth = 1.2;
      g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.stroke();
    }
    if (!anyVisible) { const n = prey.nearest(s.center); if (n) edgeArrow(proj(n.pos), dark ? 'rgba(127,224,138,0.55)' : 'rgba(47,154,69,0.55)', ''); }
  }

  // hunters: a faint red arrow only for one closing in from out of view
  if (marks.threats || marks.rings) {
    for (const th of threats()) {
      const isA = th === amoeba;
      const d = isA ? amoeba.edgeDist(s.center) : th.pos.distanceTo(s.center);
      const hot = hunting(th) || (isA && amoeba.cup > 0);
      const centre = isA ? new THREE.Vector3(amoeba.pos.x, amoeba.H, amoeba.pos.z) : th.pos;
      const q = proj(centre);
      if (visible(q)) {
        if (!marks.rings || (!hot && d > 700)) continue;
        const col = hot ? 'rgba(255,90,70,0.8)' : 'rgba(255,190,80,0.7)';
        const r = isA ? (amoeba.R + 70) * pxPerUm : Math.max(24, 80 * pxPerUm);
        g.strokeStyle = col; g.lineWidth = 1.5; g.setLineDash([8, 6]);
        g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.font = '600 12px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = 'center';
        g.fillText(th.label, q.x, Math.min(cssH - 8, q.y + r + 15));
      } else if (marks.threats && hot && s.mode !== 'dead') {
        const a = 0.35 + 0.45 * Math.max(0, 1 - d / 900);
        edgeArrow(q, `rgba(255,80,60,${a.toFixed(2)})`, '');
      }
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
const slotP = (slot) => roster.find((P) => P.slot === slot) || P1;
const debug = {
  freeze: false, inspect: false, clean: false, thrust: 0, steer: { x: 0, y: 0, m: 0 },
  setMode(i) { features.set('look', MODE_NAMES[MODES[((i % MODES.length) + MODES.length) % MODES.length]]); },
  setView(k) { features.set('view', VIEW_NAMES[k]); },
  setOrbit(yaw, pitch, dist) { view.orbitYaw = yaw; view.orbitPitch = pitch; if (dist) view.dist = dist; },
  avoid() { swimmer.startAvoid(null, null); },
  dash(yaw = null) { if (swimmer.dash(yaw)) { dash.trigger(); P1.dashFx = 0.45; } },
  attack() { doAttack(P1); },
  burst() { fireTrichocysts(P1, touchingThreat(swimmer.state)); },
  /** Put a player (default player 1) at (x, y, z) µm; the camera snaps there for player 1. */
  teleport(x, y, z, yaw = 0, pitch = 0, slot = 0) {
    const P = slotP(slot), s = P.swimmer.state; s.axis.set(x, y, z); s.yaw = yaw; s.pitch = pitch;
    if (P === P1) { view.camAxis.set(x, y, z); view.camYaw = yaw; view.camPitch = pitch; view.focusY = y; view.scopeYaw = yaw; }
  },
  /** Put a hunter at an offset (µm) from the player, heading at it. */
  didinium(dx, dz, i = 0) {
    const s = swimmer.state, d = world.didinia[i];
    d.pos.set(s.center.x + dx, s.center.y, s.center.z + dz); d.dir.set(-dx, 0, -dz).normalize(); d.stun = 0; d.sated = 0;
  },
  amoeba(dx, dz) { const s = swimmer.state; amoeba.pos.set(s.center.x + dx, 0, s.center.z + dz); amoeba.sated = 0; amoeba.stun = 0; },
  prey(dx, dz, i = 0) { const s = swimmer.state; const it = prey.items[i]; it.pos.set(s.center.x + dx, s.center.y, s.center.z + dz); it.alive = true; it.pull = 0; },
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) tick(dt, true); },
  /** Make every hunter hungry now (tests of the fights). */
  /** Wake the boss now, whatever the calm opening says. */
  wakeBoss() { bossInfo.force = true; },
  hungry() { for (const th of hunters()) { th.hunger.reset(0.01); th.sated = 0; th.stun = 0; } swimmer.state.safeT = 0; },
  /** Player 1's buttons for tests: 'B' defend, 'X' attack (eat or fight back). */
  press(b, slot = 0) { const P = slotP(slot); if (b === 'B') defend(P); else if (b === 'X') doAttack(P); },
};

/** Test hook: put a hunter on a player (default player 1) and start its catch ('didinium' | 'amoeba'). */
function forceCapture(kind = 'didinium', slot = 0) {
  const P = slotP(slot);
  const s = P.swimmer.state;
  if (P.capture.active) P.capture.reset(false);
  if (s.mode !== 'swim') { s.mode = 'swim'; s.captor = null; s.avoid = null; }
  s.safeT = 0;
  let th;
  if (kind === 'amoeba') {
    th = amoeba;
    s.axis.y = Math.min(s.axis.y, 120);
    const yaw = s.yaw + Math.PI / 2;
    amoeba.pos.set(s.axis.x + Math.cos(yaw) * (amoeba.R + 90), 0, s.axis.z - Math.sin(yaw) * (amoeba.R + 90));
    amoeba.stun = 0; amoeba.sated = 0;
    amoeba.tip.set(amoeba.pos.x, amoeba.H, amoeba.pos.z);
  } else {
    th = world.didinia[0];
    // from the side, so the chase camera sees the proboscis strike
    const side = new THREE.Vector3().crossVectors(s.T, new THREE.Vector3(0, 1, 0)).normalize();
    th.dir.copy(side).negate();
    th.pos.copy(s.center).addScaledVector(side, WIDTH / 2 + 64).addScaledVector(s.T, LENGTH * 0.1);
    th.tip = (th.tip || new THREE.Vector3()).copy(th.pos).addScaledVector(th.dir, 66);
    th.stun = 0; th.sated = 0;
  }
  if (P.swimmer.capture(th)) startCapture(P, th);
  return P.capture.phase;
}

window.__micro = {
  forceCapture,
  /** Pacing for tests: time since the round began, first hungry and first threat (s), each hunter's hunger. */
  pacing: () => ({ t: t - pacing.t0, firstHungry: pacing.firstHungry, firstThreat: pacing.firstThreat, grace: pacing.grace, cycles: pacing.cycles,
    hunters: hunters().map((th) => ({ name: th.label, state: th.hunger.state, hungry: th.hungry, left: +th.hunger.left.toFixed(1), doing: th === amoeba ? amoeba.state : th.state })),
    capture: capture.active ? { phase: cap.phase, by: CATCH[catchKind(cap.th)].by } : null, mode: swimmer.state.mode }),
  capture,
  scene, renderer, cell, world, swimmer, encounters: enc, prey, amoeba, optics, view, debug, MODES, features, game, dash,
  get camera() { return view.kind === 'scope' ? scope : chase; },
  get t() { return t; },
  get look() { return lookName(); },
  // Micro Zoom: players, split screen and landmarks
  players, split, landmarks: { forward: FWD.pos, back: BACK.pos, log: lm.log, get near() { return lm.near; } },
  get frames() { return frameCount; },
  /** Each hunter's fight: state, progress, interest, what it is doing. */
  boss: () => ({ awake: trap.awake, state: trap.fight.state, t: +(trap.fightT || 0).toFixed(2), interest: +trap.fight.interest.toFixed(2), phase2: trap.phase2, door: trap.door.toArray(), log: bossInfo.log }),
  trap,
  fights: () => hunters().map((th) => ({ name: th.label, state: th.fightState, t: +(th.fightT || 0).toFixed(2), interest: +th.fight.interest.toFixed(2), doing: th === amoeba ? amoeba.state : th.state })),
  roster: () => roster.map((P) => { const s = P.swimmer.state; return { slot: P.slot, x: s.center.x, y: s.center.y, z: s.center.z, mode: s.mode, capture: P.capture.active ? P.cap.phase : null, waiting: P.waiting }; }),
};
requestAnimationFrame((n) => { last = n; frame(n); });

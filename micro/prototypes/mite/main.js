// Mite prototype: a box mite walking through a moss cushion, imaged as if in
// a scanning electron microscope. Units are µm throughout.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { createSem, shared, MODES, CLS } from './sem.js';
import { semTextures } from './textures.js';
import { buildWorld, HALF } from './world.js';
import { createMite, CFG } from './mite.js';
import { createFeatures } from '../shared/features.js';
import { createBorrowedLooks, borrowedSwitches, AMOEBA_MODES, DIC_MODES, PARAMECIUM_MODES } from '../shared/techniques/adapters.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(DPR);
renderer.autoClear = false;

const scene = new THREE.Scene();
const VFOV = 12; // a narrow scan field: SEM images have very little perspective
const camera = new THREE.PerspectiveCamera(VFOV, 16 / 9, 20, 30000);

let tex;
const swapTex = (key, t) => {
  const old = tex[key];
  scene.traverse((o) => {
    const u = o.material && o.material.uniforms;
    if (u && u.uTex && (u.uTex.value === old || (key === 'cuticle' && u.uCls && u.uTex.value === old))) {
      u.uTex.value = t;
    }
  });
  if (key === 'backdrop') sem.setBackdrop(t);
  tex[key] = t;
};
tex = semTextures((k, t) => swapTex(k, t));

const sem = createSem(renderer, tex.backdrop);
const world = buildWorld(tex);
scene.add(world.group);

const mite = createMite(scene, world.colliders, { cls: CLS.CUTICLE, tex });
mite.place(0, 0, 0.3);
const npc = createMite(scene, world.colliders, { cls: CLS.NPC, tex });
npc.place(-950, 820, 2.2);

const pad = createPad();
const hud = mountHud({
  title: 'Mite · SEM',
  sub: 'A box mite (Phthiracaridae), about 0.6 mm long, in a moss cushion, imaged like a scanning electron micrograph.',
  controls: [
    ['LS', 'Walk (relative to the view)'],
    ['RS', 'Orbit the specimen'],
    ['LT', 'Lower magnification'],
    ['RT', 'Higher magnification'],
    ['A', 'Hold: close up (ptychoidy)'],
    ['LB', 'Walk slowly'],
    ['RB', 'Hurry'],
    ['Y', 'Imaging mode: SE, BSE, false colour'],
    ['X', 'Observer: data bar and scan lines'],
    ['View', 'Hide this panel'],
    ['Menu', 'Features: what this does, switches'],
  ],
  note: 'A live mite walking in an SEM is a deliberate fiction: real specimens are dried and gold-coated in a vacuum. The mag and scale bar are true to the field of view.',
});

// SEM data bar (observer mode)
const bar = document.createElement('div');
bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:34px;background:#000;color:#e8e8e8;display:none;align-items:center;gap:22px;padding:0 14px;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;z-index:5;white-space:nowrap;overflow:hidden';
document.body.appendChild(bar);
let observer = false;

const rig = { yaw: -0.6, pitch: 0.62, hfw: 1400, target: mite.center.clone() };
const camFwd = new THREE.Vector3(), camRight = new THREE.Vector3();

let renderScale = 1, dynRes = true, slowEma = 16, scaleT = 0;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(DPR * renderScale);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  sem.resize(v.x, v.y);
}
addEventListener('resize', resize);
resize();

function placeCamera(dt) {
  const tanH = Math.tan(THREE.MathUtils.degToRad(VFOV) / 2) * camera.aspect;
  const d = rig.hfw / (2 * tanH);
  const k = dt ? 1 - Math.exp(-dt / 0.25) : 1;
  rig.target.lerp(mite.center, k);
  const cp = Math.cos(rig.pitch);
  camera.position.set(rig.target.x + Math.cos(rig.yaw) * cp * d, rig.target.y + Math.sin(rig.pitch) * d, rig.target.z + Math.sin(rig.yaw) * cp * d);
  camera.lookAt(rig.target);
  camera.near = Math.max(20, d * 0.08);
  camera.far = d + 9000;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  shared.uCutP.value.copy(rig.target).applyMatrix4(camera.matrixWorldInverse);
  shared.uCutR.value = 380 + rig.hfw * 0.06;
  return d;
}

function niceScale(hfw) {
  const want = hfw * 0.2;
  const p = Math.pow(10, Math.floor(Math.log10(want)));
  for (const m of [5, 2, 1]) if (m * p <= want) return m * p;
  return p;
}

// NPC: wanders, and shuts when the player comes close
const ai = { ang: 2.2, t: 0, scared: 0, pause: 0 };
function npcInput(dt) {
  ai.t += dt;
  ai.ang += (Math.sin(ai.t * 0.37) + Math.sin(ai.t * 0.83 + 1)) * 0.5 * dt;
  const c = npc.center;
  if (Math.hypot(c.x, c.z) > HALF * 0.75) ai.ang = Math.atan2(-c.z, -c.x);
  const dist = c.distanceTo(mite.center);
  if (dist < 420 && ai.scared <= 0 && npc.mode === 'walk') ai.scared = 3 + Math.random() * 2;
  ai.scared -= dt;
  ai.pause = (ai.pause + dt) % 14;
  const moving = ai.pause < 10;
  return { dir: new THREE.Vector3(Math.cos(ai.ang), 0, Math.sin(ai.ang)), mag: moving ? 0.6 : 0, maxSpeed: 180, hold: ai.scared > 0 };
}

// ---------- features panel ----------
const features = createFeatures({ key: 'mite', pad });
const LOOKS = ['SE', 'BSE', 'False colour'];
let npcOn = true, rumbleOn = true;
const F = (o) => features.add(o);
F({ id: 'gbuffer', group: 'Rendering', label: 'Deferred SEM composite', fixed: true,
  about: 'Surfaces write view-space normal, material class and depth to a float G-buffer; one full-screen shader turns that into a micrograph (shared/techniques/mite-sem.js).' });
F({ id: 'look', group: 'Rendering', label: 'Imaging mode (Y)', choices: LOOKS, value: 'SE',
  about: 'SE: secondary electrons, topographic. BSE: low-vacuum backscatter, brightness from atomic number. False colour: the SE image tinted by material, like published coloured SEMs.',
  onChange: (v) => { const i = LOOKS.indexOf(v); if (i !== sem.mode) sem.setMode(i); } });
F({ id: 'secant', group: 'Rendering', label: 'Secant-law tilt contrast', on: true,
  about: 'SE yield rises as 1/cos(theta) with the angle between surface and beam, so slopes and rims are bright and faces square to the beam are darker. The beam is the camera, so it moves with the view.',
  onChange: (v) => (sem.toggles.secant = v) });
F({ id: 'edge', group: 'Rendering', label: 'Edge effect', on: true,
  about: 'Electrons escape from two surfaces at silhouettes and thin parts (setae, hyphae, claws), so they glow. Found from depth jumps in the G-buffer plus a thin-feature flag.',
  onChange: (v) => (sem.toggles.edge = v) });
F({ id: 'shadow', group: 'Rendering', label: 'Detector shadowing (ETD)', on: true,
  about: 'The Everhart-Thornley detector sits off to the upper left: faces toward it are brighter, and a short screen-space march toward it darkens points with something in the way. Soft, never black.',
  onChange: (v) => (sem.toggles.shadow = v) });
F({ id: 'ao', group: 'Rendering', label: 'Dark crevices (SSAO)', on: true,
  about: 'Electrons emitted in a crevice are reabsorbed by its walls. Normal-oriented screen-space ambient occlusion over a ~34 µm radius.',
  onChange: (v) => (sem.toggles.ao = v) });
F({ id: 'bump', group: 'Rendering', label: 'Surface relief from SEM textures', on: true,
  about: 'Leaf cells, humus crumbs and cuticle pits as bump mapping: texture luminance read as height (procedural stand-ins until MP-M01..M03 are delivered).',
  onChange: (v) => (sem.toggles.bump = v) });
F({ id: 'noise', group: 'Rendering', label: 'Shot noise', on: true,
  about: 'Per-pixel noise that grows as the signal falls, fresh every frame, like a fast scan.', onChange: (v) => (sem.toggles.noise = v) });
F({ id: 'lines', group: 'Rendering', label: 'Scan-line jitter', on: true,
  about: 'Each raster line gets a small random brightness offset, as beam current and scan timing wander.', onChange: (v) => (sem.toggles.lines = v) });
F({ id: 'observer', group: 'Rendering', label: 'Observer mode (X)', on: false,
  about: 'A real micrograph data bar (HV, WD, mag, HFW, detector, true scale bar) and visible raster lines.',
  onChange: (v) => { observer = v; bar.style.display = v ? 'flex' : 'none'; sem.setRaster(v); } });
F({ id: 'dynres', group: 'Rendering', label: 'Dynamic resolution', on: true,
  about: 'Renders at a lower resolution while frames take longer than ~40 ms and climbs back when they are fast, so a slow GPU stays responsive.',
  onChange: (v) => { dynRes = v; if (!v && renderScale !== 1) { renderScale = 1; resize(); } } });
F({ id: 'dof', group: 'Optics', label: 'Infinite depth of field', fixed: true,
  about: 'An SEM beam converges at milliradians, so everything is sharp from front to back; no blur is applied anywhere.' });
F({ id: 'field', group: 'Optics', label: 'Narrow scan field, true magnification', fixed: true,
  about: 'A 12-degree field (little perspective, like a beam pivoting far above the sample). HFW is the real field width at the mite; mag = 127 mm / HFW; the scale bar is measured from it.' });
F({ id: 'cut', group: 'Optics', label: 'Cutaway in front of the mite', on: true,
  about: 'Terrain between the camera and the mite is discarded inside a cylinder, so moss never hides the specimen. A game convenience, not optics.',
  onChange: (v) => (shared.uCutOn.value = v ? 1 : 0) });
F({ id: 'sdf', group: 'Body', label: 'Anatomy from SDF parts', fixed: true,
  about: 'Notogaster, aspis, collar, genitoanal plates, bothridia, chelicerae and palps as signed-distance parts meshed with surface nets; the aspis is a separate hinged mesh.' });
F({ id: 'setae', group: 'Body', label: 'Setae and sensilli', on: true,
  about: '14 pairs of notogastral setae, four pairs on the aspis, two sensilli, and setae on every leg segment (drawn ~1.6x thicker than life).',
  onChange: (v) => (CFG.setae = v) });
F({ id: 'thick', group: 'Body', label: 'Thin parts thickened', fixed: true,
  about: 'Legs ~1.3x and setae ~1.6x thicker than life so they survive at screen size.' });
const GAITL = { 'Alternating tetrapod': 'tetrapod', 'Wave (one leg at a time)': 'wave', 'Pairs (not arachnid)': 'pairs' };
F({ id: 'gait', group: 'Motion', label: 'Gait', choices: Object.keys(GAITL), value: 'Alternating tetrapod',
  about: 'Tetrapod: L1 R2 L3 R4 swing together, then R1 L2 R3 L4, with a small back-to-front lag. Wave: one leg at a time per side. Pairs: for comparison (shared/techniques/mite-gait.js).',
  onChange: (v) => (CFG.gait = GAITL[v]) });
F({ id: 'ik', group: 'Motion', label: 'Two-bone leg IK', on: true,
  about: 'Femur+genu and tibia+tarsus solved analytically with the knee bent up, the tarsus angled down to a planted claw. Off: each leg is a stiff strut from trochanter to foot.',
  onChange: (v) => (CFG.ik = v) });
F({ id: 'plant', group: 'Motion', label: 'Planted feet, distance-driven phase', fixed: true,
  about: 'The gait phase advances with distance walked (and turning), feet stay fixed in the world during stance and land half a stance ahead, so they never skate.' });
F({ id: 'surface', group: 'Motion', label: 'Surface following and climbing', fixed: true,
  about: 'Five ray probes fit the body to the ground under it; a forward probe tips the body onto walls, so it can climb grains, leaves and stems. Feet are raycast onto the real surfaces.' });
F({ id: 'bob', group: 'Motion', label: 'Body bob and sway', on: true,
  about: 'A few µm of rise and fall and a slight roll in time with the alternating leg groups.', onChange: (v) => (CFG.bob = v) });
F({ id: 'ptych', group: 'Simulation', label: 'Ptychoidy speed', choices: ['Real (0.16 s)', 'Slowed 4x'], value: 'Real (0.16 s)',
  about: 'Hold A: legs pull in and the aspis folds down to seal the body. Real euphthiracaroids close in about 0.1-0.15 s (Heethoff et al. 2018).',
  onChange: (v) => (CFG.closeTime = v.startsWith('Real') ? 0.16 : 0.64) });
F({ id: 'roll', group: 'Simulation', label: 'Closed capsule rolls and falls', on: true,
  about: 'Closed, the mite is a rigid egg: gravity torque about the contact point tips it, it rolls without slipping down slopes and falls off edges. Off: it stays put.',
  onChange: (v) => (CFG.roll = v) });
F({ id: 'npc', group: 'Simulation', label: 'A second box mite', on: true,
  about: 'Another phthiracarid wanders with the same walker and shuts itself when you come close.',
  onChange: (v) => { npcOn = v; npc.setVisible(v); } });
for (const [id, label, about] of [
  ['moss', 'Moss shoots', 'Stems with lanceolate leaves on a 137.5-degree spiral, costa and cell relief; the lowest leaves arch to the floor as ramps.'],
  ['grains', 'Mineral grains', 'About 150 angular grains, 20-300 µm, faceted jittered icosahedra.'],
  ['litter', 'Leaf litter flakes', 'Curled, ragged fragments of dead leaves, walkable.'],
  ['hyphae', 'Fungal hyphae', 'Threads 3-5 µm thick strung between surfaces, with side branches.'],
  ['spores', 'Spores and pollen', 'Fungal conidia, echinate (aster-type) pollen and bisaccate conifer pollen.'],
]) F({ id, group: 'World', label, about: about + ' Off also removes it from walking.', on: true, onChange: (v) => world.setLayer(id, v) });
F({ id: 'tex', group: 'World', label: 'Procedural SEM textures', fixed: true,
  about: 'Stand-ins for MP-M01..M04 drawn in code; delivered images replace them automatically.' });
F({ id: 'camwalk', group: 'Controls', label: 'Camera-relative walking', fixed: true,
  about: 'LS walks relative to the view; the mite turns toward the stick at a limited rate and walks forward (it does not strafe).' });
F({ id: 'rumble', group: 'Controls', label: 'Rumble', on: true,
  about: 'A faint tick on footfalls, a thump on closing, landing and opening.', onChange: (v) => (rumbleOn = v) });

// ---------- borrowed looks (default off; shared/techniques/adapters.js) ----------
// The G-buffer is still drawn; an adapter reads it as a thick specimen
// (thickness = height above the floor, absorbance by material) and hands that
// to another prototype's microscope instead of the SEM composite.
const looks = createBorrowedLooks(renderer);
const borrow = borrowedSwitches(features);
const bmode = { dic: 0, amoeba: 0, par: 0 };
const THICK = 'Opaque scene read as a thick transparent specimen: optical path = height above the floor (from the G-buffer depth), tinted by material (cuticle amber, moss green). Physically odd: moss and a mite in air are opaque, not phase objects.';
borrow.add({ id: 'dicTardigrade', label: 'DIC (Nomarski) relief', from: 'tardigrade',
  about: `The tardigrade's interference image: relief from the gradient of optical path along one shear direction, three-wavelength fringes. ${THICK}` });
F({ id: 'dicTardigradeMode', group: 'Borrowed', label: 'Tardigrade look', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0],
  about: 'Which of the tardigrade images the switch above uses: DIC or its brightfield.', onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
borrow.add({ id: 'opticsAmoeba', label: 'Amoeba property optics', from: 'amoeba',
  about: `Brightfield (Beer–Lambert and transport-of-intensity defocus), phase contrast, darkfield or the immersive lit view, from a phase + optical-density buffer. ${THICK}` });
F({ id: 'opticsAmoebaMode', group: 'Borrowed', label: 'Amoeba method', from: 'amoeba', choices: AMOEBA_MODES, value: AMOEBA_MODES[0],
  about: 'Which optical method the amoeba switch above uses.', onChange: (v) => (bmode.amoeba = AMOEBA_MODES.indexOf(v)) });
borrow.add({ id: 'microscopeParamecium', label: 'Paramecium microscope', from: 'paramecium',
  about: `Darkfield, phase contrast, brightfield, DIC or the lit view, formed the paramecium way (high-pass, phase ring with halo, post pass with chromatic softness and grain). ${THICK}` });
F({ id: 'microscopeParameciumMode', group: 'Borrowed', label: 'Paramecium technique', from: 'paramecium', choices: PARAMECIUM_MODES, value: PARAMECIUM_MODES[0],
  about: 'Which technique the paramecium switch above uses.', onChange: (v) => (bmode.par = PARAMECIUM_MODES.indexOf(v)) });
// Material classes (CLS order): background, cuticle, leaf, stem, grain, litter, hypha, spore, other mite. Optical density per µm of height.
const MITE_ABS = [[0, 0, 0], [0.0012, 0.0026, 0.006], [0.004, 0.0012, 0.0045], [0.003, 0.0015, 0.0035], [0.0003, 0.0003, 0.0004],
  [0.0035, 0.0045, 0.0065], [0.0004, 0.0005, 0.0007], [0.001, 0.0016, 0.004], [0.001, 0.0035, 0.006]];

function renderView(dt) {
  if (!borrow.id) { sem.render(scene, camera, dt, rig.yaw, rig.pitch); return; }
  renderer.info.autoReset = false;
  renderer.info.reset();
  sem.renderGBuffer(scene, camera);
  const t = sem.target;
  looks.fieldFromGBuffer(t.texture, t.width, t.height, { camera, base: -60, dn: 0.008, hMax: 900, absorb: MITE_ABS });
  const time = performance.now() / 1000;
  const pxPerUm = t.width / rig.hfw;
  if (borrow.id === 'dicTardigrade') looks.dic({ mode: bmode.dic, pxPerUm, time, absK: 1 });
  else if (borrow.id === 'opticsAmoeba') looks.amoeba({ mode: bmode.amoeba, time, umPerPx: 1 / pxPerUm, phaseK: 0.6 });
  else looks.paramecium({ mode: bmode.par, time, opdK: 0.35 });
}

let speedMul = 1;
function tick(dt, input) {
  const ev = mite.update(dt, input);
  if (npcOn) npc.update(dt, npcInput(dt));
  return ev;
}

function readInput(dt) {
  pad.poll();
  if (features.update()) return { dir: new THREE.Vector3(), mag: 0, maxSpeed: 0, hold: false };
  hud.update(pad);
  const rs = pad.rs();
  rig.yaw += rs.x * 1.8 * dt;
  rig.pitch = THREE.MathUtils.clamp(rig.pitch - rs.y * 1.2 * dt, 0.18, 1.5);
  const zoom = pad.rt() - pad.lt();
  rig.hfw = THREE.MathUtils.clamp(rig.hfw * Math.exp(-zoom * 1.3 * dt), 260, 4200);
  if (pad.pressed(pad.BTN.Y)) { features.set('look', LOOKS[(sem.mode + 1) % LOOKS.length]); hud.toast(MODES[sem.mode]); }
  if (pad.pressed(pad.BTN.X)) { features.set('observer', !observer); hud.toast(observer ? 'Observer mode' : 'Observer mode off'); }
  speedMul = pad.down(pad.BTN.LB) ? 0.45 : pad.down(pad.BTN.RB) ? 1.7 : 1;
  const ls = pad.ls();
  camFwd.set(-Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  camRight.set(-camFwd.z, 0, camFwd.x);
  const dir = camFwd.clone().multiplyScalar(-ls.y).addScaledVector(camRight, ls.x);
  return { dir: dir.lengthSq() > 0 ? dir.normalize() : dir, mag: ls.m, maxSpeed: 210 * speedMul, hold: pad.down(pad.BTN.A) || pad.down(pad.BTN.B) };
}

function react(ev) {
  if (!rumbleOn) return;
  for (const e of ev) {
    if (e === 'step') pad.rumble(25, 0.08, 0);
    else if (e === 'closed') { pad.rumble(140, 0.35, 0.7); }
    else if (e === 'opened') pad.rumble(70, 0.2, 0.1);
    else if (e === 'impact') pad.rumble(110, 0.4, 0.5);
  }
}

let frames = 0, statT = 0;
function updateText(d) {
  const mag = 127000 / rig.hfw; // relative to a 127 mm (Polaroid 4x5) reference image width
  const st = mite.mode === 'walk' ? (mite.speed > 5 ? `walking ${mite.speed.toFixed(0)} µm/s` : 'standing') : mite.mode === 'closed' ? 'closed (ptychoid)' : mite.mode;
  const info = renderer.info.render;
  hud.stats(`${MODES[sem.mode]}${renderScale < 1 ? `  (res ${(renderScale * 100).toFixed(0)}%)` : ''}\nHFW ${rig.hfw.toFixed(0)} µm   mag ${mag.toFixed(0)}x\n${st}\n${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris`);
  if (observer) {
    const sb = niceScale(rig.hfw);
    const px = (sb / rig.hfw) * innerWidth;
    bar.innerHTML = `<span>HV 5.00 kV</span><span>WD ${(d / 1000).toFixed(1)} mm</span><span>mag ${mag.toFixed(0)} x</span><span>HFW ${(rig.hfw / 1000).toFixed(2)} mm</span><span>det ${sem.mode === 1 ? 'BSED' : 'ETD'}</span><span>${sem.mode === 1 ? 'LowVac 60 Pa' : 'HiVac'}</span>`
      + `<span style="margin-left:auto;display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:${px.toFixed(1)}px;height:6px;background:#fff"></span>${sb >= 1000 ? sb / 1000 + ' mm' : sb + ' µm'}</span><span>Micro prototypes</span>`;
  }
}

let last = performance.now();
const api = {
  scene, camera, renderer, sem, world, mite, npc, rig, features, cfg: CFG, paused: false,
  tick(dt, input = { dir: new THREE.Vector3(), mag: 0, maxSpeed: 210, hold: false }) { return tick(dt, input); },
  render(dt = 1 / 60) { const d = placeCamera(0); renderView(dt); updateText(d); },
  isolate(on) { world.group.visible = !on; npc.setVisible(!on); },
  setMode(m) { sem.setMode(m); sem.skipScan(); },
};
window.__micro = api;

// Never queue a frame while the last one is still on the GPU (a slow GPU
// would otherwise build a backlog and lag seconds behind the controls).
const gl = renderer.getContext();
let fence = null, lastSubmit = performance.now();
function gpuBusy() {
  if (!fence) return false;
  if (gl.getSyncParameter(fence, gl.SYNC_STATUS) !== gl.SIGNALED) return true;
  gl.deleteSync(fence); fence = null;
  return false;
}

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  if (api.paused) return;
  const input = readInput(dt);
  react(tick(dt, input));
  if (gpuBusy()) return;
  const raw = now - lastSubmit;
  lastSubmit = now;
  slowEma += (raw - slowEma) * 0.25;
  scaleT += raw;
  if (dynRes && scaleT > 300) {
    if (raw > 120 && renderScale > 0.26) { renderScale = Math.max(0.25, renderScale * 0.6); resize(); scaleT = 0; }
    else if (slowEma > 40 && scaleT > 800 && renderScale > 0.26) { renderScale = Math.max(0.25, renderScale * 0.8); resize(); scaleT = 0; }
    else if (slowEma < 20 && renderScale < 1 && scaleT > 2500) { renderScale = Math.min(1, renderScale * 1.15); resize(); scaleT = 0; }
  }
  const d = placeCamera(dt);
  renderView(dt);
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  frames++; statT += dt;
  if (statT > 0.25) { updateText(d); statT = 0; }
}
frame();

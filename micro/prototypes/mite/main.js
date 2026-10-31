// Mite prototype: a box mite walking through a moss cushion, imaged as if in
// a scanning electron microscope. Units are µm throughout.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { createControls, createDash, hudControls, addInvertY } from '../shared/controls.js';
import { createPredatorAI } from './predator.js';
import { mountHud } from '../shared/hud.js';
import { createSem, shared, MODES, CLS } from './sem.js';
import { semTextures } from './textures.js';
import { buildWorld, HALF } from './world.js';
import { createMite, CFG, PRED, JUMP } from './mite.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
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
// The predator: a parasitid (Mesostigmata), pale, long-legged, hunting by touch.
const pred = createMite(scene, world.colliders, { cls: CLS.NPC, tex, anat: PRED });
const predAI = createPredatorAI(pred, HALF);
predAI.reset(1150, -650);

const pad = createPad();
const ctl = createControls(pad);
const dash = createDash({ duration: 0.6, cooldown: 2.2 });
// Walking speeds (µm/s): the default walk is twice the old hurry pace.
const WALK = 720, DASH = 1300;
const hud = mountHud({
  title: 'Mite · SEM',
  sub: 'A box mite (Phthiracaridae), about 0.6 mm long, in a moss cushion, imaged like a scanning electron micrograph. A predatory mite hunts here.',
  controls: hudControls({
    move: 'Walk (relative to the view); climbs grains, stems and flakes, pushes through blades',
    camera: 'Orbit the specimen (up looks up)',
    dash: 'Jump: a crouch and a hop (borrowed from jumping oribatids)',
    attack: 'Bite with the chelicerae: graze spores and hyphal tips, nip a predator',
    defend: 'Scramble: a short burst of fast running',
    special: 'Hold: close up (ptychoidy); blocks the predator',
    analog: 'Magnification lower / higher',
    secondary: 'Walk slowly / hurry',
    look: 'Imaging mode: SE, BSE, false colour',
    zoom: 'Magnification steps',
    extra: [['LS click', 'Observer: data bar and scan lines']],
  }),
  note: 'A live mite walking in an SEM is a deliberate fiction: real specimens are dried and gold-coated in a vacuum. The mag and scale bar are true to the field of view. Speeds are a game stretch: the walk (~0.7 mm/s) is several times a real oribatid\'s, and box mites do not jump (zetorchestid oribatids do).',
});

// SEM data bar (observer mode)
const bar = document.createElement('div');
bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:34px;background:#000;color:#e8e8e8;display:none;align-items:center;gap:22px;padding:0 14px;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;z-index:5;white-space:nowrap;overflow:hidden';
document.body.appendChild(bar);
let observer = false;

// Starts zoomed out (HFW 2.4 mm, ~53x) so the moss around the mite reads.
const rig = { yaw: -0.6, pitch: 0.62, hfw: 2400, target: mite.center.clone() };
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

const cutKeep = new Set();
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
  // Per-object cutaway: dissolve only the flakes, leaves and stems actually
  // between the camera and the mite, whole, never what it stands on.
  const g = mite.ground && mite.ground.entry;
  cutKeep.clear(); if (g && g.cutId) cutKeep.add(g.cutId);
  world.cut.update(dt, camera.position, rig.target, { radius: 340, margin: 110, keep: cutKeep });
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
const audio = createAudio(['mite/amb-moss', 'mite/step', 'mite/dash', 'mite/close', 'mite/open', 'mite/bite', 'mite/blade', 'mite/predator']);
audio.addToFeatures(features);
audio.loop('mite/amb-moss', { volume: 0.6 });
/** Gamepads fire no DOM events: unlock sound on any pad button. */
function unlockOnPad() {
  if (pad.kind !== 'controller') return;
  for (let b = 0; b < 16; b++) if (pad.value(b) > 0.5) { audio.unlock(); return; }
}
const LOOKS = ['SE', 'BSE', 'False colour'];
let npcOn = true, rumbleOn = true, predOn = true;
const F = (o) => features.add(o);
F({ id: 'gbuffer', group: 'Rendering', label: 'Deferred SEM composite', fixed: true,
  about: 'Surfaces write view-space normal, material class and depth to a float G-buffer; one full-screen shader turns that into a micrograph (shared/techniques/mite-sem.js).' });
F({ id: 'look', group: 'Rendering', label: 'Imaging mode (D-pad left/right)', choices: LOOKS, value: 'SE',
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
F({ id: 'observer', group: 'Rendering', label: 'Observer mode (LS click)', on: false,
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
  about: 'Moss between the camera and the mite gets out of the way, so it never hides the specimen: each leaf, stem or litter flake whose centre line passes within ~340 µm of the line of sight in front of the mite dissolves as a whole over ~0.2 s (a stem takes its leaves; never what the mite stands on), and comes back the same way. Nothing is sliced, so orbiting and zooming out no longer clip plants. A game convenience, not optics.',
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
  about: 'Hold Y: legs pull in and the aspis folds down to seal the body. Real euphthiracaroids close in about 0.1-0.15 s (Heethoff et al. 2018).',
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
F({ id: 'climb', group: 'Motion', label: 'Climbing rigid surfaces', on: true,
  about: 'A face too steep to step onto (a grain, a stem, a flake on edge) tips the body up onto it as it comes within reach; the ground probes then find the face and the mite walks up and over, its up turning toward the smoothed surface normal. Off: it slides along steep faces (the old rule).',
  onChange: (v) => (CFG.climb = v) });
F({ id: 'clear', group: 'Motion', label: 'Body clearance', on: true,
  about: 'Thirteen rays from the body centre to its ellipsoid: any rigid surface inside it pushes the body back along the ground, so it never passes through grains, stems, flakes or the thick lowest leaves. The deepest overlap shows in the corner as "pen".',
  onChange: (v) => (CFG.clear = v) });
F({ id: 'foliage', group: 'Simulation', label: 'Bending blades and hyphae', on: true,
  about: 'Every thin moss leaf is a bendable blade (one tip offset with a spring back to rest, offset = d·u²) and every hypha a slack thread fixed at both ends (d·sin πu). Bodies push their centre lines out of the way, a mite standing on a blade bends it down, and they spring back. Only rods near a mite are simulated; their vertices and colliders are rewritten on the CPU (shared/techniques/mite-foliage.js).',
  onChange: (v) => { world.foliage.cfg.on = v; if (!v) world.foliage.reset(); } });
F({ id: 'speed', group: 'Simulation', label: 'Game walking speed', fixed: true,
  about: 'Walking is ~720 µm/s (LB slow ~360, RB hurry ~1 mm/s): twice the old hurry pace, so the moss can be crossed in good time. Real oribatids walk a few hundred µm/s at most; this is a game stretch. Strides lengthen up to 1.5x with speed and the gait phase runs on distance, so the feet stay planted.' });
F({ id: 'scramble', group: 'Simulation', label: 'Scramble (B)', fixed: true,
  about: '0.6 s at up to ~1.3 mm/s, recharging over 2.2 s. The gait phase runs on distance, so the legs speed up with it and the feet stay planted. A stretch: box mites are slow, steady walkers.' });
F({ id: 'jump', group: 'Simulation', label: 'Jump (A), borrowed from jumping oribatids', fixed: true,
  about: `A ${Math.round(JUMP.crouch * 1000)} ms crouch, then a ballistic hop (~${Math.round(JUMP.vy ** 2 / 5200)} µm high, ~0.5 mm long; more from a run), landing on the floor, a grain, a flake or a blade (which takes the landing and bends); ${JUMP.cool} s before the next. Box mites do not jump, but some oribatids do: Zetorchestes with enlarged hind legs and a catch mechanism (Krisper 1990), and the ptychoid Indotritia, a box-mite relative, jumps backwards with its forelegs (Wauthy et al. 1998). Borrowed here as a forward hop.` });
F({ id: 'bite', group: 'Simulation', label: 'Bite and graze (X)', fixed: true,
  about: 'The rostrum dips and the chelicerae work. In reach of the mouth: fungal spores (eaten) and hyphal branch tips (nibbled; they regrow), the box mite\'s real food. At the predator: a nip that makes it back off for 1.5 s (a game rule).' });
F({ id: 'predator', group: 'Simulation', label: 'Predatory mite (Parasitidae)', on: true,
  about: 'A pale, flattened gamasid ~0.8 mm long with long legs, leg I held up as a feeler. It wanders until it touches you or feels you scramble close by, then runs you down at ~0.9 mm/s (faster than your walk, slower than your scramble; all game speeds). It strikes at legs first: three grabs and you are caught. Closed up (Y), you are a smooth capsule it cannot grip; it gives up after three tries (adult ptychoid mites are nearly immune: Peschel et al. 2006).',
  onChange: (v) => { predOn = v; pred.setVisible(v); } });
F({ id: 'camwalk', group: 'Controls', label: 'Camera-relative walking', fixed: true,
  about: 'LS walks relative to the view; the mite turns toward the stick at a limited rate and walks forward (it does not strafe).' });
F({ id: 'rumble', group: 'Controls', label: 'Rumble', on: true,
  about: 'A faint tick on footfalls, a thump on closing, landing and opening, a kick on each scramble and jump, a jolt when the predator grabs a leg.', onChange: (v) => (rumbleOn = v) });
addInvertY(features);

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
// Player state: legs grabbed by the predator (3 = caught), stun after a grab, grazing.
const play = { hurt: 0, stun: 0, grazed: 0, caught: 0, nip: false, heal: 0 };
const _fp = new THREE.Vector3(), _bc = new THREE.Vector3();
const closedNow = () => mite.mode === 'closed' || (mite.mode === 'closing' && mite.st.retract > 0.5) || (mite.mode === 'opening' && mite.st.aspis > 0.5);
function biteNow() {
  if (mite.mode !== 'walk' || !mite.bite()) return;
  const m = mite.mouth(new THREE.Vector3());
  // A nip at the predator's legs or body?
  if (predOn && pred.center.distanceTo(m) < 330) { play.nip = true; audio.play('mite/bite', { volume: 1, rate: 0.85 }); return; }
  let best = null, bd = 150;
  for (const f of world.food) {
    if (f.left <= 0) continue;
    const p = f.kind === 'hypha' ? world.foliage.offsetAt(f.rod, f.u, _fp).add(f.p) : f.p;
    const d = p.distanceTo(m);
    if (d < bd) { bd = d; best = f; }
  }
  if (!best) { hud.toast('Nothing in reach of the chelicerae'); return; }
  audio.play('mite/bite', { volume: 0.8, rate: 0.95 + Math.random() * 0.12 });
  play.grazed++;
  if (best.kind === 'spore') { best.left = 0; world.eatSpore(best); hud.toast(`Ate a fungal spore (${play.grazed} grazed)`); }
  else { best.left = 0; best.t = 25; hud.toast(`Nibbled a hyphal tip (${play.grazed} grazed)`); }
  if (rumbleOn) pad.rumble(60, 0.25, 0.1);
}
function bodyOf(m) {
  return { center: _bc.set(...m.anat.noto.c).applyQuaternion(m.quat).add(m.center).clone(), quat: m.quat,
    radii: [m.radii[0] * 1.2 + 30, m.radii[1] * 1.15 + 30, m.radii[2] * 1.45 + 30], // legs splay; + half a blade width
    load: m.ground && m.ground.entry && m.ground.entry.rod, weight: m.anat.kind === 'pred' ? 13000 : 16000,
    loadU: m.ground && m.ground.entry && m.ground.entry.rod ? Math.min(1, Math.max(0, m.ground.point.clone().sub(m.ground.entry.rod.base).dot(m.ground.entry.rod.axis) / m.ground.entry.rod.len)) : 0.7 };
}
// ---------- sound ----------
const snd = { t: 0, lastStep: -1, side: 1, lastBlade: -1, mode: 'walk', bladeNear: new Set() };
function soundTick(dt, ev) {
  snd.t += dt;
  if (mite.mode !== snd.mode) {
    if (mite.mode === 'closing') audio.play('mite/close');
    else if (mite.mode === 'opening') audio.play('mite/open');
    snd.mode = mite.mode;
  }
  for (const e of ev) {
    if (e === 'jump') audio.play('mite/dash', { volume: 0.7, rate: 1.3 });
    if (e === 'land') audio.play('mite/step', { volume: 0.9, rate: 0.75 });
    // one plant of the lead leg per stride; at most ~8 a second
    if (e === 'step' && snd.t - snd.lastStep > 0.125) {
      snd.lastStep = snd.t; snd.side = -snd.side;
      audio.play('mite/step', { volume: 0.35 + Math.random() * 0.15, rate: 0.9 + Math.random() * 0.25 + Math.min(0.2, mite.speed / 2000), pan: 0.3 * snd.side });
    }
  }
  // a blade bent past a threshold near the mite brushes (once per bend, rate-limited)
  if (world.foliage.cfg.on && mite.mode === 'walk' && mite.speed > 20 && snd.t - snd.lastBlade > 0.3) {
    for (const rod of world.foliage.rods) {
      if (rod.kind !== 'cantilever' || !rod.awake) continue;
      const bend = rod.d.length() / rod.len;
      if (bend < 0.05) { snd.bladeNear.delete(rod); continue; }
      if (bend > 0.12 && !snd.bladeNear.has(rod)) {
        snd.bladeNear.add(rod);
        const d = rod.mid.distanceTo(mite.center);
        if (d < 700) {
          snd.lastBlade = snd.t;
          audio.play('mite/blade', { volume: Math.min(0.8, 0.3 + bend * 2) * (1 - d / 900), rate: 0.9 + Math.random() * 0.2 });
          break;
        }
      }
    }
  }
}
function tick(dt, input) {
  dash.update(dt);
  play.stun = Math.max(0, play.stun - dt);
  if (play.hurt > 0 && (play.heal += dt) > 20) { play.hurt--; play.heal = 0; }
  for (const f of world.food) if (f.kind === 'hypha' && f.left <= 0 && (f.t -= dt) <= 0) f.left = 1;
  if (play.stun > 0) input = { ...input, mag: 0 };
  // Blades and hyphae move first (pushed and loaded by where the mites were),
  // so each mite then settles on, and clears, the surfaces as they are now.
  world.foliage.update(dt, [mite, ...(npcOn ? [npc] : []), ...(predOn ? [pred] : [])].map(bodyOf));
  const ev = mite.update(dt, input);
  soundTick(dt, ev);
  if (npcOn) npc.update(dt, npcInput(dt));
  if (predOn) {
    const r = predAI.step(dt, { mite, closed: closedNow(), speed: mite.speed }, play.nip);
    pred.update(dt, r.input);
    for (const e of r.events) {
      if (e === 'hunt') audio.play('mite/predator', { volume: 0.9 });
      if (e === 'legHit') audio.play('mite/predator', { volume: 0.6, rate: 1.25 });
      if (e === 'hunt') hud.toast('A predatory mite has touched you: scramble (B), jump (A), close up (Y) or nip it (X)', 2600);
      else if (e === 'recoil') { hud.toast('Nipped: the predator recoils'); if (rumbleOn) pad.rumble(120, 0.4, 0.3); }
      else if (e === 'blocked') { hud.toast('Its chelicerae slide off the closed capsule'); if (rumbleOn) pad.rumble(90, 0.2, 0.35); }
      else if (e === 'givesUp') hud.toast('The predator gives up on the closed capsule');
      else if (e === 'legHit') {
        play.hurt++; play.stun = 0.7; play.heal = 0;
        if (rumbleOn) pad.rumble(260, 0.8, 0.9);
        if (play.hurt >= 3) {
          play.caught++; play.hurt = 0;
          hud.toast('Caught by the predator. Back to the start.', 2600);
          mite.place(0, 0, 0.3); predAI.reset(1150, -650);
        } else hud.toast(`It grabbed a leg (${play.hurt}/3): get away!`);
      }
    }
  }
  play.nip = false;
  return ev;
}

function readInput(dt) {
  pad.poll();
  unlockOnPad();
  if (features.update()) return { dir: new THREE.Vector3(), mag: 0, maxSpeed: 0, hold: false };
  hud.update(pad);
  // RS: orbit; pitch by intent (up looks up: the camera swings down).
  const lk = ctl.look();
  rig.yaw += lk.yaw * 1.8 * dt;
  rig.pitch = THREE.MathUtils.clamp(rig.pitch - lk.pitch * 1.2 * dt, 0.18, 1.5);
  const zoom = ctl.analog();
  rig.hfw = THREE.MathUtils.clamp(rig.hfw * Math.exp(-zoom * 1.3 * dt), 260, 4200);
  const look = ctl.lookStep();
  if (look) { features.set('look', LOOKS[(sem.mode + look + LOOKS.length) % LOOKS.length]); hud.toast(MODES[sem.mode]); }
  const zs = ctl.zoomStep();
  if (zs) { rig.hfw = THREE.MathUtils.clamp(rig.hfw / (zs > 0 ? 1.5 : 1 / 1.5), 260, 4200); hud.toast(`mag ${(127000 / rig.hfw).toFixed(0)}x`); }
  if (ctl.stickClick.left.pressed()) { features.set('observer', !observer); hud.toast(observer ? 'Observer mode' : 'Observer mode off'); }
  if (ctl.attack.pressed()) biteNow();
  const sec = ctl.secondary();
  speedMul = sec < 0 ? 0.5 : sec > 0 ? 1.4 : 1;
  const ls = ctl.move();
  camFwd.set(-Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  camRight.set(-camFwd.z, 0, camFwd.x);
  const dir = camFwd.clone().multiplyScalar(-ls.y).addScaledVector(camRight, ls.x);
  // A: jump. B: the scramble. Y (held): close up.
  if (ctl.dash.pressed() && play.stun <= 0 && mite.jump()) { if (rumbleOn) pad.rumble(90, 0.25, 0.4); }
  if (ctl.defend.pressed() && mite.mode === 'walk' && play.stun <= 0 && dash.trigger()) { audio.play('mite/dash', { volume: 0.9 }); if (rumbleOn) pad.rumble(140, 0.3, 0.5); }
  const dashing = dash.active && mite.mode === 'walk';
  if (dashing && ls.m < 0.2) dir.set(1, 0, 0).applyQuaternion(mite.quat).setY(0); // no stick: straight ahead
  return { dir: dir.lengthSq() > 0 ? dir.normalize() : dir, mag: dashing ? 1 : ls.m, maxSpeed: dashing ? DASH : WALK * speedMul * (1 - 0.15 * play.hurt), accel: dashing ? 0.05 : 0.18, hold: ctl.special.down() };
}

function react(ev) {
  if (!rumbleOn) return;
  for (const e of ev) {
    if (e === 'step') pad.rumble(25, 0.08, 0);
    else if (e === 'closed') { pad.rumble(140, 0.35, 0.7); }
    else if (e === 'opened') pad.rumble(70, 0.2, 0.1);
    else if (e === 'impact') pad.rumble(110, 0.4, 0.5);
    else if (e === 'land') pad.rumble(70, 0.25, 0.3);
  }
}

let frames = 0, statT = 0;
function updateText(d) {
  const mag = 127000 / rig.hfw; // relative to a 127 mm (Polaroid 4x5) reference image width
  const st = mite.mode === 'air' ? 'jumping' : mite.mode === 'crouch' ? 'crouching to jump' : mite.mode === 'walk' ? (dash.active ? `SCRAMBLE ${mite.speed.toFixed(0)} µm/s` : mite.st.climbing > 0.2 ? `climbing ${mite.speed.toFixed(0)} µm/s` : mite.speed > 5 ? `walking ${mite.speed.toFixed(0)} µm/s` : 'standing') : mite.mode === 'closed' ? 'closed (ptychoid)' : mite.mode;
  const fol = world.foliage.stats;
  const pst = predOn ? `predator ${predAI.state === 'hunt' ? 'HUNTING' : predAI.state === 'recoil' ? 'recoiling' : 'wandering'} ${predAI.dist.toFixed(0)} µm` : '';
  const info = renderer.info.render;
  hud.stats(`${MODES[sem.mode]}${renderScale < 1 ? `  (res ${(renderScale * 100).toFixed(0)}%)` : ''}\nHFW ${rig.hfw.toFixed(0)} µm   mag ${mag.toFixed(0)}x\n${st}\n${dash.text()}   legs grabbed ${play.hurt}/3   grazed ${play.grazed}\n${pst}\nblades bending ${fol.moving}   pen ${mite.st.pen.toFixed(0)} µm\n${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris`);
  if (observer) {
    const sb = niceScale(rig.hfw);
    const px = (sb / rig.hfw) * innerWidth;
    bar.innerHTML = `<span>HV 5.00 kV</span><span>WD ${(d / 1000).toFixed(1)} mm</span><span>mag ${mag.toFixed(0)} x</span><span>HFW ${(rig.hfw / 1000).toFixed(2)} mm</span><span>det ${sem.mode === 1 ? 'BSED' : 'ETD'}</span><span>${sem.mode === 1 ? 'LowVac 60 Pa' : 'HiVac'}</span>`
      + `<span style="margin-left:auto;display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:${px.toFixed(1)}px;height:6px;background:#fff"></span>${sb >= 1000 ? sb / 1000 + ' mm' : sb + ' µm'}</span><span>Micro prototypes</span>`;
  }
}

let last = performance.now();
const api = {
  scene, camera, renderer, sem, world, mite, npc, pred, predAI, play, dash, rig, features, cfg: CFG, paused: false,
  tick(dt, input = { dir: new THREE.Vector3(), mag: 0, maxSpeed: WALK, hold: false }) { return tick(dt, input); },
  render(dt = 1 / 60) { const d = placeCamera(0); renderView(dt); updateText(d); },
  isolate(on) { world.group.visible = !on; npc.setVisible(!on); pred.setVisible(!on && predOn); },
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

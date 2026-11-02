// Tardigrade: climbing moss-leaf cell walls with your claws, out from the
// shoot along spokes of leaves through rings of encounters (Milnesium, the
// rotifer meadows, dry patches) to the portal Prionchulus guards. Seen
// through a DIC microscope.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createDash, hudControls, addInvertY } from '../shared/controls.js';
import { createPlayers } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks, portalArrowOn } from '../shared/landmark.js';
import { embed } from '../shared/embed.js';
import { mountHud } from '../shared/hud.js';
import { createFeatures } from '../shared/features.js';
import { createQuality } from '../shared/quality.js';
import { createAudio } from '../shared/audio.js';
import { DicMicroscope } from '../shared/techniques/tardigrade-dic.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, AMOEBA_MODES, PARAMECIUM_MODES } from '../shared/techniques/adapters.js';
import { legOffset } from '../shared/techniques/mite-gait.js';
import { World, Particles, LAYER_SUBSTRATE, LAYER_SPECIMEN, RINGS, SPOKES, START_SPOT, tipU } from './world.js';
import { Creature } from './creature.js';
import { Walker, GAITS, setGait, setGaitWith } from './gait.js';
import { Life } from './life.js';
import { Predator } from './predator.js';
import { createCapture } from '../shared/predation.js';
import { wireAssets } from './textures.js';
import { LEAF_FX, opticalMaterial, litMaterial } from './materials.js';
import { Landmarks, PORTAL_IN, AMOEBA_LEN } from './landmarks.js';
import { Nematode, GUARD } from './nematode.js';
import { Meadows } from './meadow.js';
import { createPortalLight } from '../shared/portal.js';
import { createDirector } from '../shared/director.js';
import { DIRECTOR, encounters, canPlace, wayOut, defaultPathFor } from './encounters.js';

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

// Local multiplayer (shared/players.js): player 1 on the keyboard and the
// first controller; players 2-4 join with any button on another controller,
// at any time. Each is their own tardigrade; the screen splits LEGO-style
// (shared/splitscreen.js) when they walk apart.
const animals = []; // one per player: { p, slot, creature, walker, life, dash, ... }
const players = createPlayers({
  max: 4,
  onJoin: (p) => {
    // the roster rides along, so the shell carries this player into the next world
    embed.post('join', { index: p.slot, color: p.color, name: p.name, roster: players.toJSON() });
    addAnimal(p);
    hud.toast(`Player ${p.slot + 1} joined`);
  },
  onLeave: (p) => { embed.post('leave', { index: p.slot, roster: players.toJSON() }); removeAnimal(p.slot); hud.toast(`Player ${p.slot + 1} left`); },
  onChange: (list) => hud && hud.players(list),
});
const pad = players.pad(0);
const ctl = players.controls(0);
const hud = mountHud({
  title: 'Tardigrade · The Moss Film',
  sub: 'A ~350 µm eutardigrade gripping moss-leaf cell walls in the water film: out from the shoot past a Milnesium, rotifer meadows and dry patches to the pool Prionchulus guards. Differential interference contrast (DIC) look.',
  controls: hudControls({
    move: 'Crawl (relative to the view): a slight push creeps, full tilt hurries; keys walk at a middle pace, hold G to hurry, T to creep. Push into a leaf edge to reach across',
    camera: 'Turn and tilt the view (up looks up)',
    dash: 'Scramble: a burst of fast wave gait (recharges in a few seconds)',
    attack: 'Pierce with the stylets: feed, or jab a Milnesium (bite back)',
    defend: 'Hold: brace. Facing a Milnesium, it blocks the lunge',
    special: 'Hold: curl into a tun (again: wake). At the open portal: enter it',
    analog: 'Fine focus down / up',
    secondary: 'Anatomy labels / rain (test)',
    look: 'Optical look: DIC / brightfield / lit',
    zoom: 'Magnification 10× / 12.5× / 20× / 40×',
    extra: [['LS click', 'Refocus on the animal'], ['RS click', 'Restart (test)']],
  }),
  note: 'Goal: head out along the leaves in any direction. A few seconds of calm leaves, then a Milnesium in its water, a calm stretch, a band of rotifers across the way (push and jab through), a stretch of dry patches (bare cells, slow going: walk round them), and at the rim, about 8.4 mm out, the way on: the tip of a broad Sphagnum leaf dipping into the pool under a golden sparkle, guarded by Prionchulus. Lure it off its post (it gives up and glides back slowly), then get round it to the tip, to zoom in to the pool floor. Nothing runs out while you stay put; food heals. The leaf axil at the stem, left of the start (the ring), is the way back up: Y there. Other controllers join with any button. Walking ~30 µm/s at a slight push to ~150 µm/s at full tilt (inside the measured 79-263 µm/s); the scramble (~280 µm/s) is a stretch. Claws drawn 1.6× longer, ~3× thicker than true. DIC relief is optical path, not height.',
});

const toast = (t, ms) => hud.toast(t, ms);
const world = new World(scene);
const assets = wireAssets(world);
const particles = new Particles(scene, assets.atlas);
const creature = new Creature(scene);
/** A faint tint of the player's colour in the cuticle (multiplayer only), so each animal is recognisable. */
const CUTICLE = creature.body.userData.opt.uniforms.uAbs.value.clone();
function tintCreature(c, color, on) {
  const u = c.body.userData.opt.uniforms.uAbs.value.copy(CUTICLE);
  if (!on) return;
  const col = new THREE.Color(color);
  u.add(new THREE.Vector3(-Math.log(Math.max(0.05, col.r)), -Math.log(Math.max(0.05, col.g)), -Math.log(Math.max(0.05, col.b))).multiplyScalar(0.22));
}
/**
 * Telling players apart: each player's animal has its own gut colour, as if it
 * had been eating different food (a filter on what it eats; the gut still
 * takes on each meal's colour). Player 1 is today's look; then a green gut
 * (algae), a red-brown one and a violet one, keyed to the player colours
 * (teal, rose, blue). A labelled departure: real guts vary like this with diet,
 * not with who is playing. The cuticle tint above stays (multiplayer only).
 */
const GUT_TINTS = [[1, 1, 1], [0.7, 1, 0.5], [1, 0.6, 0.62], [0.82, 0.6, 1.25]];
let rumbleOn = true;
const rumble = (ms, w, s) => { if (rumbleOn) pad.rumble(ms, w, s); };
const audio = createAudio(['tardigrade/amb-film', 'tardigrade/step', 'tardigrade/dash', 'tardigrade/bite', 'tardigrade/tun', 'tardigrade/revive', 'tardigrade/rain', 'tardigrade/milnesium', 'shared/portal-chime']);
audio.loop('tardigrade/amb-film', { volume: 0.6 });
const snd = { t: 0, lastStep: -1, side: 1, state: 'active', feeding: false, rain: false };
/** Gamepads fire no DOM events: unlock sound on any pad button. */
function unlockOnPad() {
  for (const a of animals) {
    if (a.pad.kind !== 'controller') continue;
    for (let b = 0; b < 16; b++) if (a.pad.value(b) > 0.5) { audio.unlock(); return; }
  }
}
/** A claw hooks a wall: a footfall, at most ~8 a second, alternating sides (per animal). */
function footstep(a, q = 0.5) {
  if (snd.t - a.lastStep < 0.13) return;
  a.lastStep = snd.t; a.side = -a.side;
  audio.play('tardigrade/step', { volume: (0.3 + 0.15 * Math.random() + 0.1 * q) * (a.slot ? 0.7 : 1), rate: 0.9 + Math.random() * 0.25, pan: 0.3 * a.side });
}
/** Toasts about one animal name the player when more than one is playing. */
const who = (a) => (players.count > 1 ? `${a.p.name}: ` : '');
function walkerEvents(a) {
  const rb = (ms, w, s) => { if (rumbleOn) a.pad.rumble(ms, w, s); };
  return {
    catch(q, big) {
      if (big) { rb(180, 0.35, 0.6); footstep(a, 1); return; }
      footstep(a, q);
      if (a.catchBudget <= 0) { rb(45, 0.04, 0.12 + 0.12 * q); a.catchBudget = 0.12; }
    },
    slip() { toast(`${who(a)}Losing grip! Hold B to brace`); rb(400, 0.5, 0.2); },
    fall(t) { toast(who(a) + t, 2600); rb(300, 0.6, 0.8); },
    transfer(t) { toast(who(a) + t); rb(120, 0.15, 0.3); },
  };
}
const p1 = { p: players.get(0), slot: 0, pad, ctl, creature, lastStep: -1, side: 1, catchBudget: 0, state: 'active' };
const walker = new Walker(world, creature, walkerEvents(p1));
const lifeEvents = (a) => ({
  toast: (t, ms) => toast(who(a) + t, ms),
  rumble: (ms, w, s) => { if (rumbleOn) a.pad.rumble(ms, w, s); },
  newDay: () => { restartRings(); endCapture(); for (const b of animals) if (b !== a) { b.life.respawn(1); spawnNear(b, a); } },
  startSpot: () => [world.leaves[START_SPOT.leaf], 1, START_SPOT.u, START_SPOT.v, 1, 0],
  // Local multiplayer: a dead animal (a tun that did not wake) comes back beside a teammate.
  restart: (life) => { if (players.count > 1) respawnNear(a); else life.newDay(); },
  // The food is drawn in through the buccal tube and stays visible inside, fading into the gut.
  swallowed: (f) => swallowed(a, f),
});
const life = new Life(world, walker, creature, lifeEvents(p1));
const predator = new Predator(scene, world, { toast, rumble });
// Milnesium's water (placed by the director: see "the encounters, placed as you go" below)
const MZ = RINGS.milnesium;
const mz = { p: new THREE.Vector3(1e5, 0, 1e5), entered: false, placed: false, slot: null, t: 0 };
let milOn = true; // the feature switch (Simulation → Milnesium)
const dash = createDash({ duration: 0.9, cooldown: 2.6 });
Object.assign(p1, { walker, life, dash, particles: null });
animals.push(p1);
const places = new Landmarks(scene, world, { pixelHeight: () => renderer.getDrawingBufferSize(_db).y });
// The boss: Prionchulus, a predatory nematode guarding the portal (placed with it, placePortal).
const boss = new Nematode(scene, world);
// The rotifer meadows: a band across every spoke on the meadow ring (meadow.js, shared/crowd.js).
const meadowBands = world.spokes.map((sp) => {
  const mid = world.spokeAt(sp.k, (RINGS.meadow[0] + RINGS.meadow[1]) / 2, 2);
  const L = mid.leaf, half = (RINGS.meadow[1] - RINGS.meadow[0]) / 2;
  const u0 = THREE.MathUtils.clamp(mid.u - half, 1.4, tipU(L) - 1 - 2 * half);
  return { leaf: L, u0, u1: u0 + 2 * half };
});
const meadow = new Meadows(scene, world, meadowBands);

// ---------------------------------------------------------------- the rings
// The encounter pattern (../../design/encounter-pattern.md): the same rings in
// every direction (world.js RINGS, checked by route.test.mjs). Progress is the
// straight-line (horizontal) distance from the start over the portal ring's.
const START = world.start.clone();
function progress(p) { return world.radius(p) / RINGS.portal; }
const challenges = []; // the first time each challenge starts: { kind, progress, um, time }
function logChallenge(kind, a) {
  if (challenges.some((c) => c.kind === kind)) return;
  const p = a.walker.dispPos;
  challenges.push({ kind, slot: a.slot, progress: +progress(p).toFixed(3), um: Math.round(world.radius(p) * 100), spoke: world.spokeOf(a.walker.leaf, p), time: +time.toFixed(1) });
}
// The optical buffers are allocated once at the governor's best scale and
// each view uses a fraction of them (render({ viewScale })): no reallocation
// when the screen splits or the governor steps. Half float: half the
// bandwidth of the heaviest passes (screenshots compared, see README).
const Q_MAX = 0.85, Q_MIN = 0.4, Q_TAPS = [10, 16, 26];
const TEST = new URLSearchParams(location.search); // ?prec=float, ?rig=cpu: comparisons
const mic = new DicMicroscope(renderer, scene, camera, { layers: [LAYER_SUBSTRATE, LAYER_SPECIMEN], backdrop: assets.backdrop, scale: Q_MAX, precision: TEST.get('prec') === 'float' ? 'auto' : 'half' });
if (SOFTWARE) mic.setQuality(PR ? 2 : 0);
// One governor for every world (shared/quality.js): the render scale (here the
// share of the optical buffers each view uses, split factor included), the
// blur taps by effects level, and the renderer's pixel ratio. Software GL
// keeps its own fixed low path.
const quality = SOFTWARE ? null : createQuality({ renderer, key: 'tardigrade', min: Q_MIN, max: Q_MAX,
  onChange: ({ level }) => { mic.taps = Q_TAPS[level]; } });
const SPLIT_SW = [1, 1, 0.7, 0.55, 0.55];
/** The share of the optical buffers a view uses this frame. */
const viewScale = () => (quality ? quality.scale / Q_MAX : SPLIT_SW[Math.min(4, split.layout.views.length)]);

// ---------------------------------------------------------------- view state
// Starts at 12.5× (10× with the 1.25× Optovar: 1.6× the 20× field) so the
// leaf, the film and the surroundings read while the animal stays readable;
// D-pad down steps out to 10×, up in to 20× and 40×.
// (opens looking along leaf A, the +x spoke up and to the right)
const view = { yaw: Math.atan2(1, 0) + Math.PI + Math.PI / 6, pitch: 1.18, obj: 1, manualFocusT: 99, focus: 0, mode: 0, labels: false, target: new THREE.Vector3(), claws: 1, internals: true, sway: true };
view.target.copy(walker.dispPos);

// ---------------------------------------------------------------- the intro (continuous transitions)
// In the game this world is the far end of the continuous transition from the
// mite (embed.js "Continuous transitions"; ../../game/README.md): the mite's
// freeze frame holds a tardigrade walking in the water film of its leaf axil,
// and this world fades in under the same framing, the animal where the glimpse
// was. The two are the same size, so it is a hand-off: a short push and a
// change of light, SEM to DIC. On `hold` it stays frozen at its start but
// renders, reports how its opening view frames the animal (embed.opening),
// and takes the shell's `camera` poses (placePoseCamera: a dolly, the field of
// view kept; the view state follows so play carries on from it). On `begin`
// its time eases back in over INTRO_EASE s.
embed.provide('intro');
const INTRO_EASE = 0.6;
const TARDI_LEN = 3.5; // the animal's length in a pose (units of 100 µm: 350 µm, as the mite world's glimpse)
let intro = null; // { cam } while held; { ease } while time comes back
const headingOf = (w) => { const f = w.forward; return Math.atan2(f.z, f.x); };
/** How the view frames player 1's animal (embed.poseOf). */
const poseNow = () => embed.poseOf(camera, walker.dispPos, { len: TARDI_LEN, heading: headingOf(walker), pitch: view.pitch,
  yaw: Math.atan2(camera.position.z - view.target.z, camera.position.x - view.target.x) });
embed.on('hold', () => {
  intro = { cam: null };
  view.target.copy(walker.dispPos);
  renderView(0);
  embed.cinematic(true, canvas);
  embed.opening(poseNow());
});
embed.on('camera', (d) => { if (intro && d.pose) intro.cam = d.pose; });
embed.on('begin', () => { embed.cinematic(false, canvas); intro = { cam: null, ease: 0 }; });
/** The camera for a pose from the shell: a dolly (the field of view kept); the view state follows, so play carries on from it. */
function placePoseCamera(pose) {
  const r = embed.poseCamera(camera, pose, walker.dispPos, { len: TARDI_LEN, heading: headingOf(walker) });
  // this world's orbit: the camera at target + dist (cos p sin yaw, sin p, cos p cos yaw), so its yaw is pi/2 - the azimuth
  view.yaw = Math.PI / 2 - r.yaw; view.pitch = r.pitch;
  view.target.set(r.target.x, r.target.y, r.target.z);
  view.dist = r.depth;
  view.zoom = 1; view.camDist = view.dist;
}

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
F({ id: 'internals', group: 'Body', label: 'Internal anatomy visible', on: true, about: 'Show the organs through the translucent cuticle.', onChange: (v) => { view.internals = v; for (const a of animals) for (const r of a.creature.internals) r.mesh.visible = v; } });
F({ id: 'claws', group: 'Body', label: 'Claw size', choices: ['Enhanced (1.6× long, ~3× thick)', 'True size'], value: 'Enhanced (1.6× long, ~3× thick)',
  about: 'Real claws are ~10 µm: barely a few pixels at 20×. Enhanced so the grip reads.', onChange: (v) => (view.claws = v.startsWith('True') ? 0.62 : 1) });
F({ id: 'rig', group: 'Body', label: 'Part rig (on the GPU)', fixed: true,
  about: 'Runs in the vertex shader in the optical looks (the lit look and the borrowed SEM use the same rig on the CPU). Each vertex knows its part: legs stretch and turn from hip to foot (telescoping lobopods), the trunk carries a travelling lateral wave and the tun contraction, blended where parts meet.' });
F({ id: 'sway', group: 'Motion', label: 'Soft-body sway and surge', on: true, about: 'The trunk bends side to side with the gait and surges with each wave of legs.', onChange: (v) => (view.sway = v) });
let miteGait = false;
F({ id: 'gait', group: 'Motion', label: 'Leg coordination', choices: Object.keys(GAITS), value: Object.keys(GAITS)[0],
  about: 'Measured in Hypsibius (Nirody et al. 2021): steps run back to front along each side, the sides half a cycle apart, a tetrapod-like pattern. Alternatives for comparison.', onChange: (v) => { if (!miteGait) setGait(v); } });
F({ id: 'footholds', group: 'Motion', label: 'Claws need cell walls', on: true,
  about: 'Each foot searches for the nearest wall within reach and hooks it; junctions and walls across the pull hold best. Off: feet grip anywhere.', onChange: (v) => (walker.opts.footholds = v) });
F({ id: 'gravity', group: 'Motion', label: 'Slope load and slipping (exaggerated)', on: true,
  about: 'Steep and overhanging faces need more claws planted, or the animal slides. Real 0.35 mm animals are held mainly by surface tension; this is a game rule.', onChange: (v) => (walker.opts.gravity = v) });
F({ id: 'rings', group: 'Simulation', label: 'Rings round the start (the encounter pattern)', fixed: true,
  about: 'The shoot round the start, then a spoke of leaves every 30° out to the rim (~8.4 mm), with the same scenery at the same distances whichever way you go: a band of rotifers across every spoke (4.0-4.6 mm) and dry patches (5.5-6.2 mm). The enemies and events are placed as you go (shared/director.js), in order, on leaves nobody has seen yet a little ahead of whoever leads along their spoke: after a few seconds, Milnesium in its water; after a long calm (the meadow, the dry patches), the pool at the rim of your spoke with Prionchulus on guard. Linger and they come to you all the same. No drying clock, no water meter, no hunger: nothing runs out while you stay in a safe spot.' });
F({ id: 'capacity', group: 'Simulation', label: 'Film capacity field', fixed: true,
  about: 'Per leaf: wetter towards the stem, in random hollows and where another leaf nearly touches (capillary bridges); margins thinner. The dry ring\'s patches are bare: no film, a sharp contact line round them, slow going (claws on dry cell walls). The film does not dry out over time.' });
F({ id: 'labels', group: 'Controls', label: 'Anatomy labels', on: false, about: 'Name the claws, leg IV, buccal tube, bulb, eyespot, gut and storage cells (LB).', onChange: (v) => (view.labels = v) });
F({ id: 'rumble', group: 'Controls', label: 'Rumble', on: true, about: 'A small knock as each claw hooks a wall; heavy on slips and falls; a kick on each scramble and on a Milnesium bite.', onChange: (v) => (rumbleOn = v) });
F({ id: 'scramble', group: 'Motion', label: 'Scramble (A)', fixed: true,
  about: 'A 0.9 s burst of the same back-to-front wave gait at ~280 µm/s, nearly twice the full-tilt walk (150 µm/s): the legs step faster rather than further (each reaches only so far), with up to 45% of each cycle in swing and swings as short as 60 ms. It recharges over 2.6 s; it costs nothing else. A stretch: the fastest walking measured in Hypsibius is ~260 µm/s.' });
F({ id: 'reach', group: 'Motion', label: 'Leg reach and hand-off', fixed: true,
  about: 'A lobopod telescopes a little, never more: no leg is drawn longer than 1.14× its rest length. A planted foot steps before it is stretched past 1.11×, and one that cannot lets go; a foot with nothing in reach (crossing to another leaf, over a gap, falling) is drawn up under the body, paddling, until a hold comes into reach. After a transfer the feet let go of the old leaf one by one, back to front, each catching the new one as it comes in reach.' });
F({ id: 'smooth', group: 'Motion', label: 'Smoothed trunk and camera', on: true,
  about: 'The trunk follows its target through three lags in series, and a change of face (a transfer, the leaf margin, a fall) blends the old pose out over a smootherstep, so position, velocity and acceleration stay continuous. Slipping uses grip hysteresis (slide below 85% of the load for 0.6 s, catch at 75%). Off: the old single lag.',
  onChange: (v) => (walker.opts.smooth = v) });
F({ id: 'milnesium', group: 'Simulation', label: 'Milnesium (predator)', on: true,
  about: 'A predatory tardigrade 1.5× your size with a wide buccal tube and no placoids. It browses in its water (placed as you go: the first encounter, a few seconds out, on a leaf nobody has seen yet a little ahead of you) and hunts only a player in its water (it lets you go ~0.5 mm past it). A moment after someone first comes into its water it gets hungry, then hunger comes and goes (see Threats); only hungry does it close in, stalk you within ~650 µm and bite (each bite −25% health; at none, it grips you and swallows you whole, all of it shown). After a bite it lets go, backs off and rests 45-75 s. Escape: scramble (A) past it, retreat into film too thin for its body (a dry patch), jab it with the stylets (X) so it backs off, or tun (Y): it cannot get a tun into its mouth quickly and gives up after three tries. The thin-film refuge, the recoil and the tun giving-up are game rules.',
  onChange: (v) => { milOn = v; predator.on = v && mz.placed; predator.setVisible(v && mz.placed); } });
F({ id: 'boss', group: 'Simulation', label: 'Prionchulus (the boss)', on: true,
  about: 'A predatory nematode (~1.3 mm here; adults reach ~2 mm) on guard at the portal, 420 µm inside it, placed with the portal (the last encounter) at the rim of the spoke whoever leads is heading out along. Reaching the portal while it guards turns you back. It wakes when you come within ~650 µm of its post and follows you up to ~850 µm from it; then (or when it has lost you) it glides back at 30 µm/s, ignoring everyone: that is the way in. Its tells: coiling into an S (then a forward whip) or rippling fast (then a sideways sweep), tooth bared. Brace (B) facing it to block, jab its head (X) as it recovers. Worn down (the brass resolve gauge), it slides away into a deep groove for good, leaving the way open. Off: the portal is open.',
  onChange: (v) => { boss.on = v; if (!v) boss.group.visible = false; else boss.group.visible = boss.placed; } });
F({ id: 'meadow', group: 'Simulation', label: 'Rotifer meadow (a crowd)', on: true,
  about: 'On the meadow ring (4.0-4.6 mm out): a band of ~110 bdelloid rotifers across every spoke\'s leaf, anchored by the foot, swaying, their wheel-like coronae beating. Walk into them and they bend aside; a stylet jab (X) makes those in front contract onto their foot and opens a lane (they re-extend later, a little further off). They never hurt you; a dense patch slows you by up to a quarter. No timer. Only bands with someone on their leaf move. shared/crowd.js.',
  onChange: (v) => { meadow.on = v; meadow.mesh.visible = v; } });
F({ id: 'grace', group: 'Simulation', label: 'Milnesium wakes', choices: ['2 s', '10 s', '30 s', 'Off'], value: '2 s',
  about: 'How long after someone first comes into its water Milnesium browses before it first gets hungry. Either way it hunts only a player in its water. shared/predation.js.',
  onChange: (v) => { predator.pace.grace = v === 'Off' ? 0 : parseFloat(v); predator.hunger.reset(predator.pace.grace); } });
F({ id: 'hunger', group: 'Simulation', label: 'Milnesium hunger', choices: ['Comes and goes', 'Always', 'Never'], value: 'Comes and goes',
  about: 'Comes and goes: after the calm opening it is hungry for ~30-45 s at a time (once stalking it sees the hunt through), then rests (45-75 s after a bite or eating you, 15-30 s after a jab, losing you or giving up on a tun); only a hungry Milnesium closes in, stalks and bites. Always: hungry from the end of the calm opening on. Never: it only browses (for exploring and testing).',
  onChange: (v) => (predator.pace.mode = v) });
addInvertY(features);
if (quality) quality.addToFeatures(features);
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
  const b = renderer.getDrawingBufferSize(_db);
  mic.setSize(b.x, b.y);
}
const _db = new THREE.Vector2();
/** The governor changes the pixel ratio (and so the drawing buffer) on a split: follow it. */
function followBuffer() {
  const b = renderer.getDrawingBufferSize(_db);
  if (!mic.out || b.x !== mic.out.x || b.y !== mic.out.y) resize();
}
addEventListener('resize', resize);
resize();


// ---------------------------------------------------------------- players
// Two to four players share one view, zoomed out up to this far (the camera
// 1.7x farther back) before the screen splits; split views settle at 0.75 of it.
const SPLIT_ZOOM_MAX = 1.7;
let groupZoom = 1;
const split = createSplitScreen(renderer, { renderScale: SOFTWARE ? 1 : 0.75, zoomMax: SPLIT_ZOOM_MAX });
const marks = createLandmarks();
const BACK_LABEL = 'Back to the mite';

/** Testing and the roster: every joined player has an animal, and only they do. */
function syncAnimals() {
  for (const p of players.list) {
    const a = animals.find((b) => b.slot === p.slot);
    if (a) a.p = p; else addAnimal(p);
  }
  for (const a of animals.slice()) if (!players.get(a.slot)) removeAnimal(a.slot);
  retint();
}
function retint() {
  for (const a of animals) {
    tintCreature(a.creature, a.p.color, animals.length > 1);
    a.life.gutTint.set(...GUT_TINTS[a.slot % GUT_TINTS.length]);
  }
}

function addAnimal(p) {
  if (animals.some((a) => a.slot === p.slot)) return;
  const c = new Creature(scene);
  const a = { p, slot: p.slot, pad: players.pad(p.slot), ctl: players.controls(p.slot), creature: c, lastStep: -1, side: 1, catchBudget: 0, state: 'active', feeding: false };
  a.walker = new Walker(world, c, walkerEvents(a));
  a.life = new Life(world, a.walker, c, lifeEvents(a), { clock: false, day: life });
  a.life.opts = life.opts;
  a.dash = createDash({ duration: 0.9, cooldown: 2.6 });
  a.particles = new Particles(scene, assets.atlas, 220);
  c.group.traverse((o) => { if (o.userData && o.userData.opt) o.material = view.mode === 2 ? o.userData.lit : o.userData.opt; });
  a.particles.points.material = view.mode === 2 ? a.particles.litMat : a.particles.optMat;
  for (const r of c.internals) r.mesh.visible = view.internals;
  animals.push(a);
  animals.sort((x, y) => x.slot - y.slot);
  const mate = teammate(a);
  if (mate) spawnNear(a, mate);
  retint();
}

function removeAnimal(slot) {
  const i = animals.findIndex((a) => a.slot === slot);
  if (i <= 0) return; // player 1 always stays
  const a = animals[i];
  if (captive === a) { endCapture(); predator.state = 'wander'; predator.bored = 8; }
  scene.remove(a.creature.group);
  scene.remove(a.particles.points);
  animals.splice(i, 1);
  retint();
}

/** The nearest other animal that is up and about (else any other). */
function teammate(a) {
  const others = animals.filter((b) => b !== a);
  const up = others.filter((b) => b.life.state === 'active' && b !== captive);
  const pool = up.length ? up : others;
  let best = null, bd = Infinity;
  for (const b of pool) { const d = b.walker.dispPos.distanceTo(a.walker.dispPos); if (d < bd) { bd = d; best = b; } }
  return best;
}

/** Put an animal on the leaf beside a teammate, a body length behind and to one side. */
function spawnNear(a, mate) {
  const w = mate.walker, L = w.leaf;
  const s = a.slot % 2 ? 1 : -1;
  const u = THREE.MathUtils.clamp(w.u - w.hu * 1.6 + s * w.hv * 1.2, 1.2, L.len - 1.2);
  const lim = Math.max(0, L.hwAt(u) - 0.9);
  const v = THREE.MathUtils.clamp(w.v - w.hv * 1.6 - s * w.hu * 1.2, -lim, lim);
  a.walker.spawn(L, w.side, u, v, w.hu, w.hv);
  a.creature.group.visible = true;
}

/** Multiplayer: after being eaten (or a tun that did not wake) the animal comes back beside a teammate. */
function respawnNear(a) {
  a.life.respawn();
  a.dash = createDash({ duration: 0.9, cooldown: 2.6 });
  const mate = teammate(a);
  if (mate) spawnNear(a, mate); else a.walker.spawn(world.leaves[START_SPOT.leaf], 1, START_SPOT.u, START_SPOT.v, 1, 0);
  toast(`${a.p.name} wakes again${mate ? ` beside ${mate.p.name}` : ''}`, 2400);
}

// ---------------------------------------------------------------- being eaten
// A bite that empties your reserves is the catch (shared/predation.js): strike
// (the mouth tube and stylets lunge onto you), hold (it grips: you writhe),
// eat (you are drawn in through the mouth and pharynx, swallowed whole, and
// lie in its gut), then the Eaten card; A starts a new day. In multiplayer the
// caught player sees the whole sequence, then wakes beside a teammate (no card).
// No card: the camera pulls back to watch Milnesium swallow you whole and
// follows it for a couple of seconds, then a fade, and you wake again
// (beside a teammate, or alone at a safe spot away from it).
const capture = createCapture({ onRespawn: () => captureRespawn() });
let captive = null;
const cap = { phase: null, m0: new THREE.Matrix4(), feet0: [], t: 0 };
const _p0 = new THREE.Vector3(), _q0 = new THREE.Quaternion(), _s0 = new THREE.Vector3();
const _p1 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _s1 = new THREE.Vector3();
const _Tm = new THREE.Matrix4(), _M = new THREE.Matrix4(), _R = new THREE.Matrix4().makeRotationY(Math.PI), _S = new THREE.Matrix4();
const gauge = document.createElement('div');
gauge.style.cssText = 'position:fixed;left:50%;top:50px;transform:translateX(-50%);z-index:6;display:none;align-items:center;gap:8px;padding:3px 10px;border-radius:999px;background:rgba(18,16,10,.55);color:#e8d6a6;font:600 11px system-ui,sans-serif;letter-spacing:.04em;pointer-events:none';
gauge.innerHTML = '<span>PRIONCHULUS</span><span style="display:block;width:120px;height:5px;border:1px solid #b8913f;border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:100%;background:#d2a24c"></i></span>';
document.body.appendChild(gauge);
const gaugeBar = gauge.querySelector('i');
const capBanner = document.createElement('div');
capBanner.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:6;padding:6px 14px;border-radius:999px;font:600 13px system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;pointer-events:none;white-space:nowrap;display:none';
document.body.appendChild(capBanner);
const BOSS_LINES = { strike: 'Prionchulus pins you with its tooth!', hold: 'Held at its mouth…', eat: 'Prionchulus is sucking you dry' };
const CAP_LINES = { strike: 'Milnesium strikes: its mouth tube is on you!', hold: 'Gripped by the stylets…', eat: 'Milnesium is swallowing you whole' };
let captor = 'milnesium';
function startCapture(a = p1, by = 'milnesium') {
  if (capture.active) return;
  captive = a;
  captor = by;
  const L = a.life;
  L.state = 'caught'; L.feeding = null; L.tun = 0; a.creature.pose.tun = 0;
  Object.assign(cap, { phase: null, t: 0 });
  cap.m0.copy(a.walker.matrix);
  cap.feet0 = a.creature.pose.feet.map((f) => f.clone());
  if (by === 'boss') capture.start({ by: 'Prionchulus', how: 'pinned you with its tooth and sucked you dry' });
  else capture.start({ by: 'Milnesium', how: 'gripped you with its stylets and swallowed you whole' });
  audio.play('tardigrade/milnesium', { volume: 1, rate: 0.9 });
  if (rumbleOn) a.pad.rumble(500, 0.9, 1);
  embed.captured({ by: by === 'boss' ? 'Prionchulus' : 'Milnesium', player: a.slot });
}
function captureRespawn() {
  const a = captive || p1;
  if (animals.length > 1) respawnNear(a); else respawnSafe(a);
  a.creature.group.visible = true;
  if (captor === 'boss') { boss.reset(); }
  else { Object.assign(predator, { state: 'wander', bored: 15, lunge: 0, rear: 0, sated: false }); predator.fight.reset(); }
  if (animals.length === 1) { view.target.copy(a.walker.dispPos); view.dist = undefined; }
}
/**
 * Alone: wake in a safe spot near where you were: on your spoke, at the
 * nearest calm stretch behind you (or the start), well away from whatever
 * caught you. Never further back than that.
 */
const SAFE_R = [0, (RINGS.warm + RINGS.meadow[0]) / 2, (RINGS.meadow[1] + RINGS.dry[0]) / 2, (RINGS.dry[1] + RINGS.portal - RINGS.post - 6.5) / 2];
function respawnSafe(a) {
  const p = a.walker.dispPos.clone(), r = world.radius(p), k = world.spokeOf(a.walker.leaf, p);
  a.life.respawn();
  a.dash = createDash({ duration: 0.9, cooldown: 2.6 });
  const danger = captor === 'boss' ? boss.headW || boss.pointWorld(0) : predator.walker.dispPos;
  for (const R of SAFE_R.filter((x) => x <= r + 1).reverse()) {
    if (R === 0) break;
    const at = world.spokeAt(k, R);
    if (at && at.p.distanceTo(danger) > 6) { a.walker.spawn(at.leaf, 1, at.u, at.v, at.leaf.spoke >= 0 ? 1 : 1, 0); return; }
  }
  a.walker.spawn(world.leaves[START_SPOT.leaf], 1, START_SPOT.u, START_SPOT.v, 1, 0);
}
function endCapture() {
  capture.reset();
  cap.phase = null;
  if (captive) captive.creature.group.visible = true;
  creature.group.visible = true;
  captive = null;
}
/** The caught player's body during the catch, placed relative to Milnesium's mouth. */
/** Caught by Prionchulus: pinned at its head by the tooth, drained (deflating), then dragged off. */
function animateBossCapture(c, dt) {
  const a = captive || p1;
  const cr = a.creature;
  cap.t += dt;
  boss.captureStep(c.phase, c.t, dt);
  const h = boss.headW, f = boss.headDir;
  const fwd = _bc.copy(f).negate();
  const up = _bu.copy(boss.L.N);
  const z = _bz.crossVectors(fwd, up).normalize();
  const flail = c.phase === 'strike' || c.phase === 'hold' ? 1 : c.phase === 'eat' ? 1 - c.t : 0;
  const drained = c.phase === 'eat' ? ease(c.t) : c.phase === 'strike' || c.phase === 'hold' ? 0 : 1;
  const sc = 1 - 0.3 * drained;
  _bp.copy(h).addScaledVector(f, 1.55 * sc).addScaledVector(up, Math.sin(cap.t * 11) * 0.03 * flail);
  _M.makeBasis(fwd, up, z).setPosition(_bp);
  _M.multiply(_S.makeScale(sc, sc * (1 - 0.25 * drained), sc));
  if (c.phase === 'strike') {
    const k = ease(Math.min(1, c.t * 1.5));
    cap.m0.decompose(_p0, _q0, _s0); _M.decompose(_p1, _q1, _s1);
    _M.compose(_p0.lerp(_p1, k), _q0.slerp(_q1, k), _s0.lerp(_s1, k));
  }
  cr.group.matrix.copy(_M);
  cr.group.matrixWorldNeedsUpdate = true;
  cr.group.visible = true;
  cr.pose.feet.forEach((ft, i) => {
    const f0 = cap.feet0[i];
    if (!f0) return;
    const ph = cap.t * 13 + i * 1.7;
    ft.set(f0.x + Math.sin(ph) * 0.3 * flail, f0.y + (0.25 + 0.25 * Math.sin(ph * 1.3)) * flail, f0.z + Math.cos(ph) * 0.2 * flail);
  });
  cr.pose.tun = 0.65 * drained;
  cr.pose.stylet = 0;
  cr.deformAll();
}
const _bc = new THREE.Vector3(), _bp = new THREE.Vector3(), _bu = new THREE.Vector3(), _bz = new THREE.Vector3();
function animateCapture(c, dt) {
  if (captor === 'boss') { animateBossCapture(c, dt); return; }
  const a = captive || p1;
  const cr = a.creature;
  const ease = (x) => x * x * (3 - 2 * x);
  cap.t += dt;
  if (c.phase !== cap.phase) {
    cap.phase = c.phase;
    if (c.phase === 'hold') { audio.play('tardigrade/bite', { volume: 1, rate: 0.7 }); if (rumbleOn) a.pad.rumble(300, 0.5, 0.6); }
    if (c.phase === 'eat') { audio.play('tardigrade/milnesium', { volume: 0.8, rate: 0.7 }); if (rumbleOn) a.pad.rumble(700, 0.6, 0.3); }
  }
  predator.captureStep(c.phase, c.t, dt);
  const PM = predator.creature.group.matrix; // Milnesium's body space (scaled 1.5×), with its lunge
  const sp = 1 / 1.5;
  // the prey in Milnesium's body space: facing it, head at the mouth (x 1.45),
  // then drawn back through the buccal tube and pharynx (x ~1.0) into the gut
  const T = cap.t;
  let x, sc, y = -0.05, flail = 1, squeeze = 0;
  if (c.phase === 'strike') { x = null; }
  else if (c.phase === 'hold') { x = 1.45 + 1.75 * sp; sc = 1; flail = 1; }
  else if (c.phase === 'eat') { const e = ease(c.t); x = 1.45 + 1.75 * sp * (1 - e) - 1.5 * e; sc = 1 - 0.62 * e; flail = 1 - c.t; squeeze = 0.5 * e; y = -0.05 + 0.05 * e; }
  else { x = -0.2; sc = 0.38; flail = 0; squeeze = 0.5; y = 0.02; }
  if (x === null) {
    // struck where it stood: a jolt toward the mouth
    _M.copy(cap.m0);
    const mouth = predator.mouth(_p1);
    cap.m0.decompose(_p0, _q0, _s0);
    _p0.lerp(mouth, 0.12 * Math.sin(Math.min(1, c.t * 2) * Math.PI * 0.5));
    _M.compose(_p0, _q0, _s0);
  } else {
    _S.makeScale(sc * sp, sc * sp, sc * sp);
    _M.copy(PM).multiply(_Tm.makeTranslation(x, y, Math.sin(T * 11) * 0.06 * flail)).multiply(_R).multiply(_S);
    if (c.phase === 'hold') {
      // pulled in from where it stood
      const k = ease(Math.min(1, c.t * 1.6));
      cap.m0.decompose(_p0, _q0, _s0); _M.decompose(_p1, _q1, _s1);
      _M.compose(_p0.lerp(_p1, k), _q0.slerp(_q1, k), _s0.lerp(_s1, k));
    }
  }
  cr.group.matrix.copy(_M);
  cr.group.matrixWorldNeedsUpdate = true;
  cr.group.visible = true;
  // writhing legs, then still
  cr.pose.feet.forEach((f, i) => {
    const f0 = cap.feet0[i];
    if (!f0) return;
    const ph = T * 13 + i * 1.7;
    f.set(f0.x + Math.sin(ph) * 0.3 * flail, f0.y + (0.25 + 0.25 * Math.sin(ph * 1.3)) * flail, f0.z + Math.cos(ph) * 0.2 * flail);
  });
  cr.pose.tun = squeeze;
  cr.pose.stylet = 0;
  cr.deformAll();
}

// ---------------------------------------------------------------- landmarks
// The portal (the pool at a rim leaf's tip) is the way on: at it, open, the
// game shows "Y Enter the portal" and Y goes through (enterPortal). In the
// leaf axil a quiet "Y: back to the mite" prompt shows (the shell's, or this
// page's own when standalone) and Y there posts the back landmark.
const promptEl = document.createElement('div');
promptEl.style.cssText = 'position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);z-index:7;padding:6px 14px;border-radius:999px;background:rgba(18,16,10,.62);color:#efe3c2;border:1px solid rgba(201,163,90,.55);font:600 13px system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:none;white-space:nowrap;display:none';
document.body.appendChild(promptEl);
const lm = { fired: false, near: false, nearing: false, portal: false, log: [] };
function setNear(on) {
  if (on === lm.near) return;
  lm.near = on;
  embed.near('back', on, BACK_LABEL);
  lm.log.push({ type: 'near', on });
  const kb = !players.hasController;
  promptEl.innerHTML = `<b style="display:inline-block;min-width:18px;padding:0 5px;margin-right:6px;border-radius:${kb ? '5px' : '50%'};background:${kb ? '#3a3426' : '#c9a33a'};color:${kb ? '#efe3c2' : '#1a1508'};text-align:center">${kb ? 'R' : 'Y'}</b>${BACK_LABEL}`;
  promptEl.style.display = on && !embed.active ? 'block' : 'none';
}
function fireLandmark(kind, a) {
  lm.log.push({ type: 'landmark', kind, slot: a.slot, t: +time.toFixed(2) });
  embed.landmark(kind, { player: a.slot });
}

// ---------------------------------------------------------------- the encounters, placed as you go
// The director (../shared/director.js; design/encounter-pattern.md, "Placed
// as you go") places the enemies and events one at a time, in this order, on
// leaves nobody has seen yet, a short way ahead of whoever leads along their
// spoke (or, if they linger, round them): Milnesium in its water, then the
// pool at a rim leaf's tip with Prionchulus on guard (encounters.js). Each
// comes only after the one before was met and a calm break has passed;
// nothing a player has seen is placed, moved or removed. The meadows and the
// dry patches are scenery (world.js). Until placed, Milnesium is hidden and
// still, and there is no pool at any rim.
const alive = (a) => a.life.state !== 'caught' && a !== captive;
/** Is p in Milnesium's water (plus pad)? */
const inZone = (p, pad = 0) => mz.p.distanceTo(p) < MZ.r + pad;
const _zb = new THREE.Vector3();
/** Put Milnesium's water on walkable spot s ({ leaf, u, v, p }), it browsing there, facing back toward the start. */
function placeMilnesium(s) {
  const back = _zb.subVectors(START, s.p);
  let hu = back.dot(s.leaf.U), hv = back.dot(s.leaf.V);
  const l = Math.hypot(hu, hv) || 1;
  predator.setHome(s.leaf, s.u, s.v, hu / l, hv / l);
  predator.walker.dispPos.copy(predator.walker.tPos);
  predator.reset();
  mz.p.copy(s.p); mz.placed = true; mz.slot = s; mz.t = 0; mz.entered = false;
  predator.on = milOn; predator.setVisible(milOn);
}
/** No Milnesium (a new game): hidden, still, its water far off. */
function parkMilnesium() {
  mz.placed = false; mz.slot = null; mz.entered = false; mz.p.set(1e5, 0, 1e5);
  predator.on = false; predator.setVisible(false);
}
/** Is Milnesium busy with someone (it then stays where it is)? */
function engaged() {
  if (predator.state !== 'wander' || (capture.active && captor === 'milnesium')) return true;
  return animals.some((a) => alive(a) && inZone(a.walker.dispPos, MZ.leash + 2));
}
// The portal: the last encounter, on the rim of the spoke whoever leads is
// heading out along (out of everyone's sight), with Prionchulus on guard
// RINGS.post inside it. No arrow: its golden light spills in from the edge of
// the view on its side, and haloes it once in view.
const FOUND = 9, HINT = 9;
const portal = { placed: false, k: -1, leaf: null, found: false, hinted: false, turned: false, t: null };
function placePortal(k) {
  const L = world.spokes[k].leaves.at(-1);
  places.placeForward(L);
  world.pool = L;
  applyMode(view.mode); // the pool's material follows the look
  boss.setPost(L, L.len - PORTAL_IN - RINGS.post, 0);
  Object.assign(portal, { placed: true, k, leaf: L, found: false, hinted: false, turned: false, t: +time.toFixed(2) });
  const lead = director.leader && animals.find((a) => a.slot === director.leader.id);
  logChallenge('portal', lead || p1);
}
/** Is Prionchulus on guard at the portal (placed, at its post, not lured off or beaten)? */
const guarded = () => boss.guarding;
const E = encounters(world);
const ENC = {
  milnesium: { place: (x, z) => { const s = E.milAt(x, z); placeMilnesium(s); return s; },
    met: (h, [p]) => { const a = animals.find((b) => b.slot === p.id); return !!a && (inZone(a.walker.dispPos) || a.walker.dispPos.distanceTo(predator.walker.dispPos) < 5); } },
  // the last: entering the open portal ends the level
  portal: { place: (x, z) => { const R = E.rimAt(x, z); placePortal(R.k); return R; }, met: () => false },
};
// The default path (encounters.js defaultPathFor: out along spoke PATH_SPOKE): Milnesium and the pool with
// Prionchulus laid on its leaves on the first frame, so the way on exists from the start (sealed until
// Milnesium is met: portalSealed); head out along another spoke and each, while nobody has seen it, leaves the
// path and is placed ahead of you there as before (one object each: single).
const PATH = defaultPathFor(world);
const director = createDirector({ ...DIRECTOR, canPlace, progress: (p) => world.radius(p), defaultPath: PATH, entries: E.list.map((e) => ({ ...e, ...ENC[e.id], single: true })) });
const PORTAL_INDEX = E.list.findIndex((e) => e.final);
/** The way on exists from the start but stays shut until every earlier encounter is met (the director's order). */
function portalSealed() { return director.index < PORTAL_INDEX; }
/** How far through the encounters the game is: met / all (0..1). */
const encounterProgress = () => director.index / E.list.length;
let seenViews = null;
const _lastP = new Map();
function stepDirector(dt) {
  const ps = animals.map((a) => ({ id: a.slot, x: a.walker.dispPos.x, y: a.walker.dispPos.y, z: a.walker.dispPos.z, alive: alive(a) && a.life.state === 'active' }));
  // "ahead" on a spoke is along the spoke whoever leads is heading out on
  const lead = director.leader && animals.find((a) => a.slot === director.leader.id);
  if (lead && dt > 0) {
    const p = lead.walker.dispPos, q = _lastP.get(lead) || p;
    E.prefer = wayOut(world, lead.walker.leaf, p, (p.x - q.x) / dt, (p.z - q.z) / dt);
  }
  for (const a of animals) (_lastP.get(a) || _lastP.set(a, new THREE.Vector3()).get(a)).copy(a.walker.dispPos);
  if (!director.path) E.prefer = PATH.spoke; // (the default path is laid along its spoke, on the first update)
  const ev = director.update(dt, ps, seenViews);
  seenViews = null;
  for (const e of ev) if (e.type === 'met') logChallenge(`${e.id}Met`, animals.find((a) => e.by && a.slot === e.by[0]) || p1);
  driftMilnesium(dt);
  // first into its water: its hunger starts a moment later (until then it only browses)
  if (mz.placed && !mz.entered) {
    const a = animals.find((b) => alive(b) && inZone(b.walker.dispPos));
    if (a) { mz.entered = true; predator.hunger.reset(predator.pace.grace); logChallenge('milnesiumWater', a); }
    else predator.hunger.reset(predator.pace.grace);
  }
}
/**
 * Milnesium placed out of a lingering player's reach wanders over: its water
 * (its home, which it keeps near) drifts toward the leader at MIL_DRIFT units
 * a second until they are in it. Behaviour, not a placement.
 */
const MIL_DRIFT = 0.8;
function driftMilnesium(dt) {
  const S = director.entry('milnesium');
  if (!mz.placed || !S || S.state !== 'placed') return;
  mz.t += dt;
  const lead = director.leader, a = lead && animals.find((b) => b.slot === lead.id);
  if (mz.t < 5 || !a || lead.moving || predator.state !== 'wander' || (capture.active && captor === 'milnesium') || inZone(a.walker.dispPos)) return;
  const p = a.walker.dispPos, d = mz.p.distanceTo(p) || 1;
  mz.p.addScaledVector(_zb.subVectors(p, mz.p), (MIL_DRIFT * dt) / d);
  if (predator.home) predator.home.copy(mz.p);
}
/** A restart: the director starts over (Milnesium hidden, no portal), the meadows out again. */
function restartRings() {
  director.reset();
  predator.reset(); parkMilnesium();
  boss.unplace(); places.clearForward(); world.pool = null;
  Object.assign(portal, { placed: false, k: -1, leaf: null, found: false, hinted: false, turned: false, t: null });
  meadow.reset();
  lm.fired = false;
  challenges.length = 0;
}
parkMilnesium();

// ---------------------------------------------------------------- the portal (the way on)
// The portal (the rim leaf's tip, either face) is never an automatic door (the
// owner, 2026-11-01): while a player is at it and Prionchulus is off guard
// (lured more than GUARD from its post, or beaten), the game shows "Y Enter the
// portal" (embed.near('portal')) and that player's Y (R) zooms into the next
// world (instead of curling into a tun). On guard, it turns you back (a toast,
// once) and Y curls up as usual. Any player counts; in the game the others
// follow through the transition.
function setPortalPrompt(on) {
  if (on === lm.portal) return;
  lm.portal = on;
  embed.near('portal', on);
}
function checkPortal() {
  for (const a of animals) a.atPortal = false;
  if (!portal.placed || outro) { setPortalPrompt(false); return; }
  let at = null, dmin = Infinity;
  for (const a of animals) {
    if (!alive(a) || a.life.state !== 'active') continue;
    const d = a.walker.dispPos.distanceTo(places.forward);
    dmin = Math.min(dmin, d);
    if (places.atForward(a.walker)) { at = a; a.atPortal = true; }
  }
  if (dmin < FOUND) portal.found = true;
  if (!portal.hinted && dmin < HINT && guarded()) { portal.hinted = true; toast('Prionchulus guards the way on. Lure it off its post, then get round it', 3600); }
  // nearing the open way on: the shell can start loading the next world (no prompt is shown)
  const nearing = !portalSealed() && dmin < 14;
  if (nearing !== lm.nearing) { lm.nearing = nearing; embed.near('forward', nearing); }
  if (at && !lm.fired) {
    if (guarded()) {
      if (!lm.blocked) {
        if (!portal.turned) { portal.turned = true; toast('Turned back: Prionchulus is on guard. Lead it away from its post first, then get round it', 3600); }
        lm.log.push({ type: 'turnedBack', slot: at.slot, t: +time.toFixed(2) });
        lm.blocked = true;
      }
    } else if (portalSealed() && !lm.blocked) {
      // the way on exists from the start (the default path) but opens only once Milnesium is met
      toast('The pool will not take you yet: Milnesium is still out on the leaves', 2600);
      lm.log.push({ type: 'sealed', slot: at.slot, t: +time.toFixed(2) });
      lm.blocked = true;
    }
  }
  if (!at) lm.blocked = false;
  if (dmin > 6) lm.fired = false; // once per visit
  // anyone at the open portal: the prompt; their Y goes through (step's input loop)
  setPortalPrompt(!!at && !portalSealed() && !guarded());
}
/**
 * The way on: player `a` is at the open portal and pressed Y. This is the one place
 * the zoom into the next world is triggered (embed.landmark('forward'); the
 * shell runs the transition; standalone, embed.js shows a toast).
 */
function enterPortal(a) {
  if (lm.fired || outro) return;
  lm.fired = true;
  setPortalPrompt(false);
  startOutro(a);
  lm.log.push({ type: 'landmark', kind: 'forward', slot: a.slot, t: +time.toFixed(2) });
  embed.landmark('forward', { player: a.slot, outro: embed.active });
}
const portalLight = createPortalLight({ zIndex: 3 });

// ---------------------------------------------------------------- the outro: success, slow-down, freeze (embed.js "Continuous transitions")
// Into the pool: a golden burst from the tip, a bloom on the screen, a chime
// and a rumble; then time eases to a stop over ~1 s while rendering carries on
// (the freeze frame), the view settling on the Amoeba proteus crawling on the
// pool floor a little way out (the glimpse: the next world's creature). It
// settles from straight above (the amoeba world's microscope looks straight
// down) and turns the amoeba the way that world's cell faces when it opens,
// a little wider than there, while the sparkle dims so the cell reads. Frozen,
// it reports how the amoeba is framed (embed.frozen) and follows the shell's
// `camera` poses: a short push in while the amoeba world fades in under the
// same framing (the same size: DIC to brightfield, a change of light more than
// of scale). In frame time (dt is clamped), so a slow machine plays it slower
// rather than skipping it. Standalone the freeze holds a moment and time comes back.
const OUTRO = { beat: 0.3, ease: 1.0, hold: 1.4, back: 0.6, giveUp: 8, rate: 1 }; // rate: tests slow it down
// The amoeba world's opening view of its cell (a pose: embed.js; measured with
// its __micro.pose() on hold): looking straight down (2D), the cell's front up
// the slide (rel π), 0.382 of the view's width (344 µm in a 900 µm field). The
// freeze holds the glimpse 1.35× smaller, so the move is a short push.
const NEXT_OPENING = { f: 0.382, pitch: 1.55, rel: Math.PI };
let outro = null;
const glowU = places.glow.group.children[0].material.uniforms; // (its shared uniforms: uI is its brightness)
const glowI0 = glowU.uI.value;
const azimuth = () => Math.PI / 2 - view.yaw; // this world's orbit: the camera's azimuth round its target
function startOutro(a) {
  const am = places.amoeba;
  outro = { t: 0, scale: 1, frozenAt: null, cam: null, heard: false, a,
    from: { target: view.target.clone(), pitch: view.pitch, dist: view.dist || 20, h: am.heading } };
  places.glow.burst();
  const pr = split.project(0, places.forward);
  if (!pr.behind) portalLight.bloom(pr.x, pr.y, { scale: 1.1 });
  const me = split.project(0, a.walker.dispPos);
  if (!me.behind) portalLight.bloom(me.x, me.y, { scale: 0.7 });
  audio.play('shared/portal-chime', { volume: 0.9 });
  rumble(520, 0.55, 0.85);
  // the chrome goes, the bloom stays (cinematic(false) restores both)
  if (embed.active) { embed.cinematic(true, canvas); portalLight.canvas.style.visibility = 'visible'; }
  else toast(`${who(a)}The pool: the film meets open water`, 2400);
}
/** Advance the outro by dt (frame time); returns the time scale for the world. */
function stepOutro(dt) {
  const o = outro;
  o.t += dt * OUTRO.rate;
  o.scale = 1 - THREE.MathUtils.smoothstep(o.t, OUTRO.beat, OUTRO.beat + OUTRO.ease);
  // after the burst the sparkle dims, so the amoeba on the pool floor reads in the freeze frame
  glowU.uI.value = glowI0 * (1 - 0.8 * THREE.MathUtils.smoothstep(o.t, 0.5, 1.3));
  places.swimOff(o.t / 1.2); // the P. bursaria in the pool swim off out of the amoeba's frame
  if (o.scale <= 0 && o.frozenAt === null) {
    o.frozenAt = o.t;
    // the freeze frame: the camera exactly where the outro's framing ends, and how it frames the amoeba
    placeViewCamera(0);
    if (embed.active) embed.frozen(amoebaPose());
  }
  if (o.frozenAt !== null) {
    const heldT = o.t - o.frozenAt;
    // standalone (or a shell that never answered): time comes back
    const back = !embed.active ? heldT - OUTRO.hold : !o.heard && heldT > OUTRO.giveUp ? heldT - OUTRO.giveUp : -1;
    if (back >= 0) {
      o.scale = THREE.MathUtils.smoothstep(back, 0, OUTRO.back);
      if (back >= OUTRO.back) endOutro();
    }
  }
  return outro ? outro.scale : 1;
}
function endOutro() {
  outro = null;
  places.swimOff(0);
  glowU.uI.value = glowI0;
  if (embed.active) embed.cinematic(false, canvas);
}
/** How the view frames the amoeba in the pool (embed.poseOf). */
const amoebaPose = () => embed.poseOf(camera, places.amoeba.center, { len: AMOEBA_LEN, heading: places.amoeba.heading, pitch: view.pitch, yaw: azimuth() });
// the shell drives the camera from the freeze frame into the amoeba's world
embed.on('camera', (d) => { if (outro && d.pose) { outro.cam = d.pose; outro.heard = true; } });
embed.on('pause', () => { if (outro) outro.heard = true; });
/** The outro's own framing (before the shell's poses): eased by its clock onto the amoeba, from straight above. */
function placeOutroView() {
  const o = outro, f = o.from, am = places.amoeba;
  const b = THREE.MathUtils.smootherstep(o.t, 0, OUTRO.beat + OUTRO.ease);
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const dist = AMOEBA_LEN / (2 * (NEXT_OPENING.f / 1.35) * tanH);
  view.target.lerpVectors(f.target, am.center, b);
  view.pitch = f.pitch + (NEXT_OPENING.pitch - f.pitch) * b;
  view.dist = f.dist + (dist - f.dist) * b;
  // the amoeba turns the way the amoeba world's cell faces as it opens (the same angle on screen)
  const want = azimuth() - NEXT_OPENING.rel;
  am.setHeading(f.h + Math.atan2(Math.sin(want - f.h), Math.cos(want - f.h)) * b);
}
/** The camera for a pose from the shell during the outro: a dolly onto the amoeba (the field of view kept); the view state follows. */
function placeOutroCamera(pose) {
  const am = places.amoeba;
  const r = embed.poseCamera(camera, pose, am.center, { len: AMOEBA_LEN, heading: am.heading });
  view.yaw = Math.PI / 2 - r.yaw; view.pitch = r.pitch;
  view.target.set(r.target.x, r.target.y, r.target.z);
  view.dist = r.depth;
  view.zoom = 1; view.camDist = view.dist;
}

// ---------------------------------------------------------------- loop
let last = performance.now();
let time = 0;
const dirV = new THREE.Vector3(), right = new THREE.Vector3(), upS = new THREE.Vector3();
applyMode(view.mode);

let capPad = null;
const ZERO = { x: 0, y: 0, m: 0 };
const IDLE = { P: () => false, D: () => false, dashPressed: false, ls: ZERO };
// The keyboard has no analogue stick: WASD walks at a middle pace (KEY_WALK on
// the stick's curve, ~90 µm/s), G held hurries to full tilt, T held creeps.
const KEY_WALK = 0.7, heldKeys = new Set();
addEventListener('keydown', (e) => heldKeys.add(e.code));
addEventListener('keyup', (e) => heldKeys.delete(e.code));
addEventListener('blur', () => heldKeys.clear());
function moveOf(a) {
  const m = a.ctl.move();
  if (a.pad.kind !== 'keyboard' || !m.m) return m;
  const k = heldKeys.has('KeyG') ? 1 : heldKeys.has('KeyT') ? 0.05 : KEY_WALK;
  return { x: m.x * k, y: m.y * k, m: m.m * k };
}
function inputOf(a, inMenu) {
  if (inMenu || a.p.waiting) return IDLE;
  return { P: (b) => a.pad.pressed(b), D: (b) => a.pad.down(b), dashPressed: a.ctl.dash.pressed(), ls: moveOf(a) };
}

/** Tests that step without drawing: the camera and the views as a drawn frame would have them, so the director sees what they see. */
function stepViews(dt) {
  placeViewCamera(dt);
  split.update(animals.map((a) => ({ slot: a.slot, position: shownAt(a, a.shown || (a.shown = new THREE.Vector3())) })), { camera, zoom: view.zoom }, dt);
  groupZoom = split.zoom;
  viewN = 0;
  const L = split.layout;
  if (L.views.length <= 1) split.withView(0, camera, noteView);
  else for (const v of L.views) split.withView(v.index, camera, noteView);
}
const api = window.__micro = { cullViews: true, // per-view culling of the animals (false for A/B checks)
  SOFTWARE, scene, camera, renderer, world, walker, creature, life, mic, view, features, applyMode, pad, predator, dash, capture, paused: false,
  players, animals, split, marks, places, landmarks: lm, boss, quality, get captor() { return captor; },
  get time() { return time; },
  /** Testing: one fixed step with the left stick at (x, y) on screen (null: hands off). */
  testStep(dt = 1 / 30, stick = null, buttons = {}) {
    // buttons: { down: [button ids held], pressed: [button ids pressed this step] }
    const down = new Set(buttons.down || []), pr = new Set(buttons.pressed || []);
    step(dt, { P: (b) => pr.has(b), D: (b) => down.has(b) || pr.has(b), dashPressed: pr.has(0), ls: stick ? { x: stick.x, y: stick.y, m: Math.min(1, Math.hypot(stick.x, stick.y)) } : ZERO });
    stepViews(dt);
  },
  render(dt = 1 / 30) { renderView(dt); readout(); },
  pacing() {
    return { approach: capture.active || predator.state === 'approach' || predator.state === 'stalk', captured: capture.active, phase: capture.phase, kind: 'milnesium',
      hunger: { milnesium: predator.hunger.state }, states: { milnesium: predator.state }, dist: { milnesium: Math.round(predator.dist * 100) }, mode: life.state,
      target: predator.target ?? 0, captive: captive ? captive.slot : null };
  },
  /** Testing: Milnesium catches player `slot` now (the full sequence plays). */
  forceCapture(slot = 0) {
    const a = animals.find((b) => b.slot === slot) || p1;
    if (capture.active || a.life.state !== 'active') return;
    // bring it round to face you, mouth at your head
    const w = predator.walker, aw = a.walker;
    w.spawn(aw.leaf, aw.side, aw.u + 3.2, aw.v, -1, 0);
    predator.dist = 3;
    startCapture(a);
  },
  /** Testing: Prionchulus catches player `slot` now. */
  forceBossCapture(slot = 0) { const a = animals.find((b) => b.slot === slot) || p1; if (!capture.active) startCapture(a, 'boss'); },
  /** Testing: put player `slot` in a landmark zone ('forward' or 'back'). */
  teleport(kind, slot = 0) {
    const a = animals.find((b) => b.slot === slot) || p1;
    const [L, side, u, v, hu, hv] = places.spot(kind);
    a.walker.spawn(L, side, u, v, hu, hv);
  },
  /** Testing: place player `slot` at (u, v) on a leaf index. */
  place(slot, leaf, u, v, side = 1) { const a = animals.find((b) => b.slot === slot); if (a) a.walker.spawn(world.leaves[leaf], side, u, v, 1, 0); },
  get layout() { return split.layout; },
  meadow, challenges, progress: (slot = 0) => progress((animals.find((b) => b.slot === slot) || p1).walker.dispPos),
  rings: RINGS,
  /** The director (shared/director.js): state(), seenAt(x, y, z), placeNow(), log. */
  director, encounters: () => director.state(), seenAt: (x, y, z) => director.seenAt(x, y, z), placeNow: () => director.placeNow(),
  /** Testing: the camera and the views' frustums as a drawn frame would have them (for the director), without drawing. */
  views(dt = 1 / 30) { stepViews(dt); },
  /** The layout: the rings (units of 100 µm, from the start), each spoke's leaves and where its scenery sits, and where Milnesium is now. */
  route() {
    const um = (p) => Math.round(world.radius(p) * 100);
    return { rings: RINGS, start: START.toArray(), milnesium: mz.placed ? { um: um(mz.p), spoke: mz.slot.spoke, leaf: mz.slot.leaf.id } : null, spokes: world.spokes.map((sp) => ({ k: sp.k, bearing: Math.round(sp.a * 180 / Math.PI), exitUm: um(sp.exit.p), leaves: sp.leaves.map((L) => L.id),
      meadowUm: [um(meadowBands[sp.k].leaf.toWorld(meadowBands[sp.k].u0, 0, 0)), um(meadowBands[sp.k].leaf.toWorld(meadowBands[sp.k].u1, 0, 0))],
      dry: sp.leaves.flatMap((L) => L.dry.map((d) => um(L.toWorld(d.u, d.v, 0)))), portalUm: um(sp.leaves.at(-1).toWorld(sp.leaves.at(-1).len - PORTAL_IN, 0, 0)) })) };
  },
  /** How far out player `slot` is (units of 100 µm) and on which spoke. */
  where(slot = 0) { const a = animals.find((b) => b.slot === slot) || p1; const p = a.walker.dispPos; return { r: +world.radius(p).toFixed(2), spoke: world.spokeOf(a.walker.leaf, p), leaf: a.walker.leaf.id, u: +a.walker.u.toFixed(2), v: +a.walker.v.toFixed(2), side: a.walker.side }; },
  /**
   * The portal for the level transition: its world position, whether it is
   * placed, found (seen), guarded (Prionchulus on its post) or open, and the
   * boss's state and distance from its post.
   */
  portal() {
    const f = places.forward;
    return { placed: portal.placed, spoke: portal.k, x: f.x, y: f.y, z: f.z, found: portal.found, guarded: portal.placed && guarded(), sealed: portal.placed && portalSealed(), open: portal.placed && !portalSealed() && !guarded(),
      boss: { state: boss.state, fromPost: portal.placed ? +boss.fromPost.toFixed(2) : null, interest: +boss.interest.toFixed(2) }, glow: +places.glow.open.toFixed(2), prompt: lm.portal, t: portal.t };
  },
  /**
   * Testing only (it breaks the order on purpose): the portal now on spoke `k`
   * (default: player `slot`'s spoke). director.force marks every earlier
   * encounter met ('forced').
   */
  placePortal(k = null, slot = 0) { const a = animals.find((b) => b.slot === slot) || p1; const R = E.rims[k ?? world.spokeOf(a.walker.leaf, a.walker.dispPos)]; api.placeEncounter('portal', R.spot.x, R.spot.z); return api.portal(); },
  /** Testing only: place encounter `k` ('milnesium' | 'portal') at (x, z), snapped to a leaf (a rim for the portal), out of order. */
  placeEncounter(k, x, z, b = 0) { const pr = E.prefer; E.prefer = null; try { return director.force(k, x, z, b); } finally { E.prefer = pr; } },
  /** Go through the portal now as player `slot` (what Y at the open portal does). */
  enterPortal(slot = 0) { lm.fired = false; enterPortal(animals.find((b) => b.slot === slot) || p1); },
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
  /** Testing: advance the outro by n frames of dt, rendering each (deterministic stills). */
  outroStep(n = 1, dt = 1 / 30) {
    for (let i = 0; i < n && outro; i++) { const k = stepOutro(dt); if (k > 0) step(dt * k, IDLE); else places.update(0, camera, true); renderView(dt); }
    return api.outro();
  },
  /** How the view frames the amoeba in the pool (what embed.frozen reports). */
  amoebaPose: () => amoebaPose(),
  /** Testing: a restart (the RS button). */
  restart() { life.newDay(); },
  /** How the view frames player 1's animal now (what embed.opening reports on hold), and the intro's state. */
  pose: () => poseNow(),
  get intro() { return intro ? { held: !('ease' in intro), cam: intro.cam } : null; },
};

function frame() {
  const now = performance.now();
  const rawDt = (now - last) / 1000;
  last = now;
  let dt = Math.min(view.dtMax || 0.05, rawDt);
  // held in the intro (the transition from the mite): rendered, not stepped, no input
  if (embed.held || (intro && !('ease' in intro))) {
    renderView(0);
    requestAnimationFrame(frame);
    return;
  }
  if (intro) {
    // after the transition: time eases back in
    intro.ease += dt;
    const k = THREE.MathUtils.smoothstep(intro.ease, 0, INTRO_EASE);
    if (intro.ease >= INTRO_EASE) intro = null;
    dt *= k;
  }
  if (quality) { quality.setSplitViews(split.layout.views.length); quality.update(rawDt); followBuffer(); }
  players.poll();
  unlockOnPad();
  const inMenu = features.update();
  capPad = inMenu ? null : (captive ? captive.pad : pad);
  hud.update(pad);
  const B = pad.BTN;
  const P = (b) => !inMenu && pad.pressed(b);

  const look = inMenu ? 0 : ctl.lookStep();
  if (look) { const m = (view.mode + look + 3) % 3; features.set('look', MODES[m]); toast(MODES[m]); }
  const zs = inMenu ? 0 : ctl.zoomStep();
  if (zs < 0 && view.obj > 0) { view.obj--; toast(`Objective ${OBJECTIVES[view.obj].name}`); }
  if (zs > 0 && view.obj < OBJECTIVES.length - 1) { view.obj++; toast(`Objective ${OBJECTIVES[view.obj].name}`); }
  if (P(B.RB)) life.rain();
  if (P(B.RS)) { life.newDay(); toast('Back at the start'); }
  if (P(B.LB)) features.set('labels', !view.labels);
  if (P(B.LS)) { view.focus = 0; toast('Refocused on the animal'); }
  // RS: yaw, and pitch by intent (up = look up: the camera swings down). Any player turns the shared view.
  let yaw = 0, pitch = 0;
  if (!inMenu && !outro) for (const a of animals) { if (a.p.waiting) continue; const lk = a.ctl.look(); yaw += lk.yaw; pitch += lk.pitch; }
  yaw = THREE.MathUtils.clamp(yaw, -1, 1); pitch = THREE.MathUtils.clamp(pitch, -1, 1);
  view.yaw -= yaw * dt * 1.6;
  view.pitch = THREE.MathUtils.clamp(view.pitch - pitch * dt * 1.2, 0.35, 1.52);
  const fin = inMenu ? 0 : ctl.analog();
  view.focus = THREE.MathUtils.clamp(view.focus - fin * dt * 0.8, -3, 3);
  // Auto-focus: the focal plane follows the animal (focus 0 is its mid-depth).
  // A manual turn of the fine focus holds for 4 s of standing still; once the
  // animal walks off, the focus eases back onto it.
  view.manualFocusT = Math.abs(fin) > 0.05 ? 0 : view.manualFocusT + dt;
  if (view.autoFocus !== false && view.manualFocusT > 4 && (walker.speed > 0.05 || view.manualFocusT > 8)) view.focus *= Math.exp(-dt / 0.6);

  // through the portal: time eases to a freeze (stepOutro), no input
  const k = outro ? stepOutro(Math.min(rawDt, 0.05)) : 1;
  const G = outro ? IDLE : inputOf(p1, inMenu);
  G.others = {};
  if (!outro) for (const a of animals) if (a !== p1) G.others[a.slot] = inputOf(a, inMenu);
  if (!api.paused) {
    if (k > 0) step(dt * k, G);
    else places.update(0, camera, true); // frozen: the burst plays on (its own clock)
  }
  renderView(dt);
  readout();
  requestAnimationFrame(frame);
}

/** Milnesium hunts one player at a time: the nearest one up and about, held unless another is clearly nearer. */
function chooseTarget() {
  const cands = animals.filter((a) => a.life.state !== 'caught');
  if (!cands.length) return null;
  const up = cands.filter((a) => a.life.state === 'active');
  const pool = up.length ? up : cands;
  const me = predator.walker.dispPos;
  const cur = pool.find((a) => a.slot === predator.target);
  let best = cur || pool[0], bd = best.walker.dispPos.distanceTo(me) * (cur ? 0.75 : 1);
  for (const a of pool) { const d = a.walker.dispPos.distanceTo(me); if (d < bd) { bd = d; best = a; } }
  predator.target = best.slot;
  return best;
}

/** One step of the simulation. G: player 1's { P(b), D(b) (pressed, down), dashPressed, ls: stick }, G.others[slot] the others'. */
function step(dt, G) {
  time += dt;
  snd.t += dt;
  places.update(dt, camera, portal.placed && !portalSealed() && !guarded());
  const cs = capture.update(dt, capPad);
  if (!cs.active && captive) captive = null;
  // the caught player is back (after the fade) while the screen fades in
  const held = cs.active && cs.phase !== 'fadeIn';
  const inputs = new Map(animals.map((a) => [a, a === p1 ? G : (G.others && G.others[a.slot]) || IDLE]));
  let backNear = false;
  for (const a of animals) {
    const g = inputs.get(a);
    const w = a.walker, L = a.life;
    a.catchBudget -= dt;
    // A: the scramble.
    a.dash.update(dt);
    // (its only cost is the recharge: no water, no reserves)
    if (g.dashPressed && L.state === 'active') {
      if (L.frozen || w.slipping) { /* curled, feeding or sliding: no scramble */ }
      else if (a.dash.trigger()) {
        audio.play('tardigrade/dash', { volume: 0.9 });
        if (rumbleOn) a.pad.rumble(160, 0.25, 0.55);
      }
    }
    // Camera-relative crawl direction.
    const ls = g.ls;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    upS.setFromMatrixColumn(camera.matrixWorld, 1);
    dirV.set(0, 0, 0).addScaledVector(right, ls.x).addScaledVector(upS, -ls.y);
    const film = L.filmHere();
    // a dense patch of rotifers slows you a little (never stops you)
    const filmF = (film < 0.03 ? 0.3 : (0.4 + 0.6 * THREE.MathUtils.smoothstep(film, 0.03, 0.3)) * (film > 1.1 ? 0.7 : 1)) * (1 - 0.25 * (a.crowd || 0));
    const dashing = a.dash.active && !L.frozen;
    if (dashing && ls.m < 0.2) dirV.copy(w.forward); // no stick: scramble straight ahead
    w.update(dt, { dir: dirV, mag: dashing ? Math.max(ls.m, 1) : ls.m, brace: g.D(BTN_B), frozen: L.frozen, film: filmF, energy: L.energy, tun: L.tun > 0.02, dash: dashing });
    a.mouth = a.creature.anchorWorld('buccal tube + stylets', a.mouth || new THREE.Vector3());
    // The backdoor: the axil (where Y goes back). The portal: checkPortal below.
    const up = L.state === 'active' && a !== captive;
    a.atBack = up && places.atBack(w);
    if (a.atBack) backNear = true;
    if (L.state === 'active' && world.filmAt(w.leaf, w.u, w.v) < 0.03 && w.speed > 0.05) logChallenge('dry', a);
  }
  setNear(backNear);
  stepDirector(dt);
  checkPortal();

  // The rotifer meadow: pushed aside by every animal in it.
  if (meadow.on) {
    const crowd = meadow.update(dt, animals.map((a) => a.walker), predator.on ? [{ walker: predator.walker, radius: 1.7 }] : []);
    animals.forEach((a, i) => { a.crowd = crowd[i]; if (crowd[i] > 0 && a.life.state === 'active') logChallenge('meadow', a); });
  }

  // Milnesium hunts one of you: whoever is in its water (or, once it is stalking, within its leash).
  const target = held ? null : chooseTarget();
  const allowed = !!target && inZone(target.walker.dispPos, predator.target === target.slot && predator.state === 'stalk' ? MZ.leash : 0);
  const tg = target && allowed ? inputs.get(target) : IDLE;
  const xT = tg.P(BTN_X);
  let facing = false;
  if (target) {
    const tw = target.walker;
    facing = _fd.subVectors(predator.walker.dispPos, tw.dispPos).normalize().dot(tw.forward) > 0.5;
  }
  const blocking = !!target && tg.D(BTN_B) && target.life.state === 'active';
  const pev = !target ? [] : predator.update(dt, { walker: target.walker, life: target.life, mouth: target.mouth, facing, blocking }, xT && target.life.state === 'active' && !target.life.feeding, { allowed });
  if (target && (pev.includes('hunt') || pev.includes('stalk'))) logChallenge('milnesium', target);
  if (target) { target.facingPredator = facing && predator.state === 'stalk'; }

  // The boss (Prionchulus) fights whoever is nearest.
  const bossHeld = held && captor === 'boss';
  const bev = bossHeld ? [] : boss.update(dt, animals.map((a) => {
    const g = inputs.get(a), up = a.life.state === 'active' && !(held && a === captive);
    return { a, pos: a.walker.dispPos, mouth: a.mouth, forward: a.walker.forward, active: up, blocking: up && g.D(BTN_B), jab: up && g.P(BTN_X) && !a.life.feeding };
  }), { calm: false });
  for (const { e, a: pr } of bev) {
    const a = pr ? pr.a : null;
    const rb = (ms, w, s2) => { if (a && rumbleOn) a.pad.rumble(ms, w, s2); };
    if (e === 'wake') { toast('A predatory nematode, Prionchulus, uncoils off its post', 2800); logChallenge('boss', pr ? pr.a : p1); }
    else if (e === 'rewake') toast('Prionchulus stirs on its post', 1600);
    else if (e === 'return') { toast('Prionchulus gives up and glides back to its post: get round it!', 2400); logChallenge('bossLured', pr ? pr.a : p1); }
    else if (e === 'guard') toast('Prionchulus is back on guard', 1600);
    else if (e === 'windupWhip') { toast(`${a ? who(a) : ''}Prionchulus coils into an S, tooth bared: face it and brace (B)!`, 1800); rb(140, 0.3, 0); }
    else if (e === 'windupThrash') { toast(`${a ? who(a) : ''}Prionchulus thrashes: face it and brace (B)!`, 1800); rb(140, 0.3, 0); }
    else if (e === 'strike') audio.play('tardigrade/dash', { volume: 0.8, rate: 0.7 });
    else if (e === 'blocked' && a) { toast(`${who(a)}Braced! Its head glances off your claws (resolve ${Math.round(boss.interest * 100)}%)`); rb(260, 0.6, 0.5); (a.anim ||= {}).shove = 0.3; }
    else if (e === 'bitten' && a) { a.bossJab = true; toast(`${who(a)}Stylets into its head! (resolve ${Math.round(boss.interest * 100)}%)`); rb(200, 0.5, 0.4); audio.play('tardigrade/bite', { volume: 1, rate: 0.8 }); }
    else if (e === 'flounder') toast('In the thin film Prionchulus flounders and loses heart', 2000);
    else if (e === 'retreat') toast('Worn down, Prionchulus slides away into a deep groove between the cells: the way on is open', 3000);
    else if (e === 'hit' && a) {
      const L = a.life;
      L.energy = Math.max(0, L.energy - 0.35); L.feeding = null; a.walker.speed = 0;
      rb(320, 0.8, 0.9); audio.play('tardigrade/milnesium', { volume: 1, rate: 0.6 });
      if (L.energy <= 0.001) startCapture(a, 'boss');
      else toast(`${who(a)}Its tooth stabs you! Health ${Math.round(L.energy * 100)}%`, 2400);
    }
  }
  const jabbed = pev.includes('recoil');

  for (const a of animals) {
    const g = inputs.get(a), L = a.life;
    // In the backdoor zone Y means "go back", and at the open portal "go
    // through" (checkPortal: a.atPortal), not "curl into a tun".
    // X into the rotifer meadow: those in front contract and a lane opens
    a.meadowJab = false;
    if (meadow.on && g.P(BTN_X) && L.state === 'active' && !L.feeding && !a.bossJab && !(a === target && jabbed)) {
      const n = meadow.jab(a.walker);
      if (n) { a.meadowJab = true; (a.anim ||= {}).jab = 0.34; if (!a.toldMeadow) { a.toldMeadow = true; toast(`${who(a)}Touched, the rotifers snap their coronae shut and contract onto their feet`, 2600); } }
    }
    const yBack = a.atBack && g.P(BTN_Y);
    if (yBack) { fireLandmark('back', a); toast(`${who(a)}Back up to the moss canopy`); }
    const yPortal = !a.atBack && a.atPortal && L.state === 'active' && portal.placed && !portalSealed() && !guarded() && g.P(BTN_Y);
    if (yPortal) enterPortal(a);
    const yOwn = !a.atBack && !yPortal;
    L.update(dt, { yDown: yOwn && g.D(BTN_Y), yPressed: yOwn && g.P(BTN_Y), bitePressed: g.P(BTN_X) && !(a === target && jabbed) && !a.bossJab && !a.meadowJab, aPressed: g.P(BTN_A), moving: a.walker.speed });
    // life-state transitions: the tun, the revival, a stylet bite
    if (L.state !== a.state) {
      if (L.state === 'tun') audio.play('tardigrade/tun');
      else if (L.state === 'revive') audio.play('tardigrade/revive');
      a.state = L.state;
    }
    a.bossJab = false;
    const feeding = !!L.feeding;
    if (feeding && !a.feeding) audio.play('tardigrade/bite', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
    a.feeding = feeding;
  }
  const raining = life.rainT > 0;
  if (raining && !snd.rain) audio.play('tardigrade/rain', { volume: 0.8 });
  snd.rain = raining;
  for (const e of pev) {
    const a = target, L = a.life;
    const rb = (ms, w, s) => { if (rumbleOn) a.pad.rumble(ms, w, s); };
    if (e === 'bite' || e === 'tunBite') audio.play('tardigrade/milnesium', { volume: e === 'bite' ? 1 : 0.6 });
    else if (e === 'stalk') audio.play('tardigrade/milnesium', { volume: 0.45, rate: 0.85 });
    else if (e === 'hunt') audio.play('tardigrade/milnesium', { volume: 0.25, rate: 0.75 });
    else if (e === 'recoil') audio.play('tardigrade/bite', { volume: 1, rate: 0.85 });
    if (e === 'recoil') { toast(`${who(a)}Stylets into its head! It staggers back (interest ${Math.round(predator.fight.interest * 100)}%)`); rb(220, 0.5, 0.4); (a.anim ||= {}).hit = 0.3; }
    else if (e === 'windup') { toast(`${who(a)}Milnesium rears to strike! Face it and brace (B), or jab (X)`, 1800); rb(120, 0.3, 0); audio.play('tardigrade/milnesium', { volume: 0.5, rate: 1.2 }); }
    else if (e === 'strike') audio.play('tardigrade/milnesium', { volume: 0.9, rate: 1.05 });
    else if (e === 'blocked') { toast(`${who(a)}Blocked! Braced claws hold and you shove its head away`); rb(260, 0.6, 0.5); (a.anim ||= {}).shove = 0.3; audio.play('tardigrade/bite', { volume: 0.7, rate: 0.7 }); }
    else if (e === 'retreat') toast(`${who(a)}The Milnesium has had enough: it turns and crawls off`, 2600);
    else if (e === 'stalk') toast(`${who(a)}A Milnesium has your scent: scramble (A), jab (X) or tun (Y)`, 2600);
    else if (e === 'hunt') toast('Something large is moving in the film…', 2600);
    else if (e === 'tunBite') { toast(`${who(a)}The Milnesium mouths your tun but cannot get it in`); rb(120, 0.2, 0.3); }
    else if (e === 'givesUp') toast('The Milnesium gives up on the tun and wanders off');
    else if (e === 'bite') {
      L.energy = Math.max(0, L.energy - 0.25);
      L.feeding = null;
      a.walker.speed = 0;
      rb(300, 0.8, 0.9);
      if (L.energy <= 0.001) startCapture(a);
      else toast(`${who(a)}Milnesium bites! Health ${Math.round(L.energy * 100)}%. It lets go and backs off, for now`, 2600);
    }
  }

  // Creature rigs: on the GPU for the optical looks (the lit look and the
  // borrowed SEM draw the geometry with their own materials: CPU).
  const gpu = view.mode !== 2 && borrow.id !== 'semMite' && TEST.get('rig') !== 'cpu';
  predator.creature.setGpu(gpu);
  for (const a of animals) {
    const c = a.creature;
    c.setGpu(gpu);
    c.clawScale = view.claws;
    if (held && a === captive) animateCapture(cs, dt);
    else {
      if (!view.sway) { c.pose.sway = 0; c.pose.surge = 0; c.pose.bob = 0; }
      const off = fightPose(a, inputs.get(a), dt);
      c.group.matrix.copy(a.walker.matrix).multiply(off);
      c.group.matrixWorldNeedsUpdate = true;
      c.deformAll();
    }
    animateEating(a, dt);
    if (view.mode === 2 || borrow.id === 'semMite') c.refreshNormals();
    const pt = a.particles || particles;
    if (a.particles) a.particles.points.visible = particles.points.visible;
    pt.update(dt, a.walker.dispPos, a.walker.leaf, a.walker.side, world);
  }
}
const BTN_A = 0, BTN_B = 1, BTN_X = 2, BTN_Y = 3;
const _fd = new THREE.Vector3(), _off = new THREE.Matrix4(), _rz = new THREE.Matrix4();

/**
 * The player's own fight moves, layered on the walker's pose:
 *   attack (X): a stylet jab with a head thrust (also the start of every bite);
 *   guard (B held): crouched, head drawn in and down, claws braced;
 *   shove: a blocked lunge, the head butted forward; hit: a jab that landed, a recoil.
 */
function fightPose(a, g, dt) {
  const an = (a.anim ||= {});
  const c = a.creature, L = a.life;
  for (const k of ['jab', 'shove', 'hit']) an[k] = Math.max(0, (an[k] || 0) - dt);
  if (g && g.P(BTN_X) && L.state === 'active') an.jab = 0.34;
  const guard = g && g.D(BTN_B) && L.state === 'active' ? 1 : 0;
  an.guard = (an.guard || 0) + (guard - (an.guard || 0)) * (1 - Math.exp(-dt * 12));
  let dx = -0.07 * an.guard, dy = -0.05 * an.guard, rz = -0.1 * an.guard;
  if (an.jab > 0) { const e = Math.sin(Math.PI * (1 - an.jab / 0.34)); dx += 0.34 * e; rz -= 0.12 * e; c.pose.stylet = Math.max(c.pose.stylet, e); c.pose.gape = 0.6 * e; }
  else c.pose.gape = Math.max(0, (c.pose.gape || 0) - dt * 3);
  if (an.shove > 0) { const e = Math.sin(Math.PI * (1 - an.shove / 0.3)); dx += 0.28 * e; rz += 0.06 * e; }
  if (an.hit > 0) { const e = Math.sin(Math.PI * (1 - an.hit / 0.3)); dx -= 0.08 * e; }
  return _off.makeTranslation(dx, dy, 0).multiply(_rz.makeRotationZ(rz));
}

// ---------------------------------------------------------------- eating
// The food is drawn to the mouth, through the buccal tube and pharynx and into
// the gut, visible all the way through the transparent body; there it slowly
// shrinks and fades, tinting the gut's colour as it goes. A pierced leaf cell
// becomes a green bolus of chloroplasts that does the same.
const _lv = new THREE.Vector3(), _w0 = new THREE.Vector3(), _w1 = new THREE.Vector3();
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const bodyPoint = (a, x, y, z, out) => out.set(x, y, z).applyMatrix4(a.creature.group.matrix);
const MOUTH = [1.82, -0.1, 0], PHARYNX = [0.98, -0.03, 0];
function chloroBolus() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), opticalMaterial({ dn: 0.04, absorb: [2.6, 0.6, 2.9] }));
  m.userData = { opt: m.material, lit: litMaterial({ color: 0x4f9a3a, roughness: 0.6 }), own: true };
  if (view.mode === 2) m.material = m.userData.lit;
  m.layers.set(LAYER_SPECIMEN);
  m.frustumCulled = false;
  world.foodGroup.add(m);
  return m;
}
function animateEating(a, dt) {
  const f = a.life.feeding;
  // a meal broken off (spat out, a bite, a catch): the food goes back where it was
  if (a.eat && a.eat.f !== f) {
    const e = a.eat;
    if (!e.done) {
      if (e.f.item) { e.mesh.position.copy(e.home); e.mesh.scale.setScalar(1); e.mesh.userData.opt.uniforms.uAbs.value.copy(e.abs0); }
      else if (e.mesh) { e.mesh.removeFromParent(); }
    }
    a.eat = null;
  }
  if (f && !a.eat) {
    const mesh = f.item ? f.item.mesh : chloroBolus();
    a.eat = { f, mesh, home: mesh.position.clone(), abs0: mesh.userData.opt.uniforms.uAbs.value.clone() };
    if (!f.item) bodyPoint(a, ...MOUTH, mesh.position);
  }
  if (a.eat && f) {
    const e = a.eat, k = Math.min(1, f.t / f.dur), m = e.mesh;
    if (f.item) {
      if (k < 0.45) { const q = ease(k / 0.45); m.position.copy(e.home).lerp(bodyPoint(a, ...MOUTH, _w0), q); m.scale.setScalar(1 - 0.25 * q); }
      else { const q = ease((k - 0.45) / 0.55); bodyPoint(a, ...MOUTH, _w0).lerp(bodyPoint(a, ...PHARYNX, _w1), q); m.position.copy(_w0); m.scale.set(0.75 + 0.15 * q, 0.75 - 0.25 * Math.sin(Math.PI * q), 0.75 - 0.25 * Math.sin(Math.PI * q)); }
      // packed into the tube and the gut it reads denser (a labelled departure: real cells are fainter)
      m.userData.opt.uniforms.uAbs.value.copy(e.abs0).multiplyScalar(1 + 3 * ease(k));
    } else {
      // the cell's contents stream in: a bolus swelling at the mouth, then drawn back
      if (k < 0.6) { bodyPoint(a, ...MOUTH, m.position); m.scale.setScalar(0.2 + 0.8 * ease(k / 0.6)); }
      else { const q = ease((k - 0.6) / 0.4); bodyPoint(a, ...MOUTH, _w0).lerp(bodyPoint(a, ...PHARYNX, _w1), q); m.position.copy(_w0); }
    }
  }
  // swallowed meals: into the gut, then fading into its colour mass
  for (let i = (a.digest || []).length - 1; i >= 0; i--) {
    const d = a.digest[i];
    d.t += dt;
    const m = d.mesh;
    if (d.t < 1.6) {
      const q = ease(d.t / 1.6);
      _lv.set(PHARYNX[0] + (d.to[0] - PHARYNX[0]) * q, PHARYNX[1] + (d.to[1] - PHARYNX[1]) * q, PHARYNX[2] + (d.to[2] - PHARYNX[2]) * q);
    } else {
      const q = Math.min(1, (d.t - 1.6) / 7);
      _lv.set(...d.to);
      const u = m.userData.opt.uniforms;
      u.uDn.value = d.dn0 * (1 - q);
      u.uAbs.value.copy(d.abs0).multiplyScalar(1 - q);
      m.scale.setScalar(d.s0 * (1 - 0.65 * q));
      // the gut takes on the colour of what was eaten as it fades
      a.life.gutColour.lerp(d.gut, 1 - Math.pow(1 - 0.45, dt / 7));
      if (q >= 1) {
        m.removeFromParent();
        if (m.userData.own) { m.geometry.dispose(); m.userData.opt.dispose(); }
        a.digest.splice(i, 1);
        continue;
      }
    }
    _lv.y += 0.015 * Math.sin(time * 1.3 + i);
    bodyPoint(a, _lv.x, _lv.y, _lv.z, m.position);
  }
}
function swallowed(a, f) {
  const e = a.eat;
  const mesh = e ? e.mesh : f.item ? f.item.mesh : chloroBolus();
  if (e) e.done = true;
  const u = mesh.userData.opt.uniforms;
  if (!e || !e.f.item) u.uAbs.value.multiplyScalar(1.6);
  (a.digest ||= []).push({ mesh, t: 0, gut: new THREE.Vector3(...f.gut), dn0: u.uDn.value, abs0: u.uAbs.value.clone(), s0: mesh.scale.x,
    to: [-0.25 + (Math.random() - 0.5) * 0.5, 0.04 + (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.14] });
}

const _ct = new THREE.Vector3(), _c2 = new THREE.Vector3();
/** Where an animal is drawn (its walker, or Milnesium's mouth while it is being swallowed). */
const shownAt = (a, out) => (captive === a && capture.active ? out.setFromMatrixPosition(a.creature.group.matrix) : out.copy(a.walker.dispPos));
function renderView(dt) {
  if (intro && intro.cam) placePoseCamera(intro.cam);
  else if (outro && outro.cam) placeOutroCamera(outro.cam);
  else placeViewCamera(dt);
  sun.target.position.copy(view.target);
  drawViews(dt);
}
/** Camera orbit on the animals (on you and Milnesium together during a solo catch). */
function placeViewCamera(dt) {
  const ob = OBJECTIVES[view.obj];
  const solo = animals.length === 1;
  // a catch is framed closer (about the 20× field): you and Milnesium's head
  // eat / follow: the camera pulls back to watch Milnesium swallow you whole, then follows it
  const ph = capture.active ? capture.phase : null;
  const following = ph === 'eat' || ph === 'follow' || ph === 'fadeOut';
  const field = capture.active && solo ? (following ? ob.field * 1.3 : Math.min(ob.field, 9)) : ob.field;
  const dist = field / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, camera.aspect) * 1.0;
  if (outro) placeOutroView();
  else view.dist = THREE.MathUtils.lerp(view.dist || dist, dist, 1 - Math.exp(-dt * 4));
  // several players in one view: the split screen's zoom-out (the camera
  // pulled back along its view) keeps them all in frame; the screen splits
  // only once it is at its widest (shared/splitscreen.js)
  view.zoom = !solo && !outro && !view.fixed ? groupZoom : 1;
  view.camDist = view.dist * view.zoom;
  let aim;
  if (capture.active && solo && following) aim = captor === 'boss' ? _ct.copy(boss.headW) : _ct.copy(predator.walker.dispPos);
  else if (capture.active && solo && ph !== 'fadeIn') aim = _ct.copy(walker.dispPos).lerp(captor === 'boss' ? boss.headW : predator.walker.dispPos, 0.5);
  else { aim = _ct.set(0, 0, 0); for (const a of animals) aim.add(shownAt(a, _c2)); aim.multiplyScalar(1 / animals.length); }
  if (!outro) view.target.lerp(aim, 1 - Math.exp(-dt * 3));
  camera.position.set(
    view.target.x + view.camDist * Math.cos(view.pitch) * Math.sin(view.yaw),
    view.target.y + view.camDist * Math.sin(view.pitch),
    view.target.z + view.camDist * Math.cos(view.pitch) * Math.cos(view.yaw),
  );
  camera.up.set(0, 1, 0);
  if (view.fixed && solo) { // turnaround shots (testing): orbit in the animal's own frame
    const { yaw, pitch } = view.fixed;
    const off = new THREE.Vector3(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)).multiplyScalar(view.fixed.dist || 9);
    view.target.copy(walker.dispPos);
    camera.up.set(0, 1, 0).applyQuaternion(walker.dispQuat);
    camera.position.copy(walker.dispPos).add(off.applyQuaternion(walker.dispQuat));
  }
  camera.lookAt(view.target);
  camera.updateMatrixWorld();
}
function drawViews(dt) {
  const solo = animals.length === 1;
  viewN = 0;
  // Split screen (one view, straight to the screen, while together).
  const list = animals.map((a) => ({ slot: a.slot, position: shownAt(a, a.shown || (a.shown = new THREE.Vector3())) }));
  split.update(list, { camera, zoom: view.zoom }, dt);
  groupZoom = split.zoom;
  const L = split.layout;
  // The lit look swaps in ordinary materials, so the optical buffers would be empty.
  if (borrow.id && borrow.id !== 'semMite' && view.mode === 2) features.set(borrow.id, false);
  if (L.views.length <= 1) split.withView(0, camera, () => drawView(L.views[0], null, dt));
  else {
    for (const v of L.views) split.withView(v.index, camera, () => drawView(v, split.target(v.index), dt));
    // The microscope composite is already display-ready: no second encoding when the regions are drawn.
    const cs = renderer.outputColorSpace;
    if (view.mode !== 2) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    split.compose();
    renderer.outputColorSpace = cs;
  }

  // Labels (player 1's animal, as its view shows it).
  labelBox.style.display = view.labels ? '' : 'none';
  if (view.labels) {
    const vi = Math.max(0, L.regions.find((r) => r.slot === 0)?.view ?? 0);
    const v = new THREE.Vector3();
    for (const { name, d } of labelEls) {
      const q = split.project(vi, creature.anchorWorld(name, v));
      d.style.left = `${q.x}px`;
      d.style.top = `${q.y}px`;
    }
  }

  // Edge arrows (shared/landmark.js) and, with more than one player, a ring in each player's colour.
  marks.begin();
  portalLight.begin();
  // no arrow by default (the owner: keep moving and you find it): once open, the portal's golden
  // light spills in from the edge of the view on its side (or haloes it in view); no text (the Portal
  // arrow setting adds one: drawPortalArrow). On the default path it is there from the start, sealed.
  if (portal.placed && !portalSealed() && !(capture.active && solo) && !outro) {
    let d = Infinity;
    for (const a of animals) d = Math.min(d, a.walker.dispPos.distanceTo(places.forward));
    portalLight.drawSplit(split, places.forward, { strength: THREE.MathUtils.clamp(1.15 - d / 30, 0.3, 1), open: places.glow.open });
  }
  if (outro) return;
  marks.drawSplit(split, places.back, { kind: 'backdoor', label: 'Moss', range: 30 });
  drawPortalArrow();
  if (animals.length > 1) drawRings(L);
}

/**
 * The "Portal arrow" setting (the game's Settings, default off; ?arrow=1 here): an arrow at the edge of
 * each view toward the way on (the pool at a rim leaf's tip: the director's portals(), one here), with the
 * view's nearest tardigrade's distance (mm, or µm under 1 mm, as the readout counts). Sealed too: it is
 * where the way on will open.
 */
let arrowLog = [];
const arrowLabel = (d) => (d >= 10 ? `${(d / 10).toFixed(1)} mm` : `${Math.round(d * 100)} µm`);
function drawPortalArrow() {
  arrowLog = [];
  if (!portalArrowOn() || !portal.placed || outro) return;
  const pp = places.forward;
  arrowLog = marks.drawSplit(split, (vp) => {
    let d = Infinity;
    for (const v of vp) { const a = animals.find((b) => b.slot === v.slot); if (a) d = Math.min(d, a.walker.dispPos.distanceTo(pp)); }
    if (!isFinite(d)) d = p1.walker.dispPos.distanceTo(pp);
    return { position: pp, label: arrowLabel(d), distance: d };
  }, { kind: 'forward', portal: true, range: 90 }).map((r) => r && { x: r.x, y: r.y, angle: r.angle, onScreen: r.onScreen, d: +r.picked.distance.toFixed(2), label: r.picked.label, at: [pp.x, pp.y, pp.z].map((v) => +v.toFixed(2)) });
}

function drawRings(L) {
  const cv = marks.canvas, g = cv.getContext('2d');
  const k = cv.width / (cv.clientWidth || innerWidth);
  g.save();
  g.setTransform(k, 0, 0, k, 0, 0);
  const px = innerHeight / (2 * (view.camDist || view.dist) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  for (const a of animals) {
    const reg = L.regions.find((r) => r.slot === a.slot);
    if (!reg) continue;
    const q = split.project(reg.view, a.shown);
    g.save();
    if (L.views.length > 1) { g.beginPath(); reg.polygon.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); }
    // a faint broken ring under the animal and its name tag
    const rx = Math.min(1.9 * px, 150), ry = rx * 0.62;
    g.globalAlpha = a.life.state === 'active' ? 0.42 : 0.22;
    g.strokeStyle = a.p.color; g.lineWidth = 1.25;
    g.setLineDash([10, 7]);
    g.beginPath(); g.ellipse(q.x, q.y, rx, ry, 0, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 0.8; g.fillStyle = a.p.color; g.font = '600 11px system-ui,sans-serif'; g.textAlign = 'center';
    g.fillText(a.p.name, q.x, q.y - ry - 5);
    g.restore();
  }
  g.restore();
}

// --- per-view culling of the animals ---------------------------------------
// Every animal's meshes are deformed on the GPU (frustumCulled = false), so
// three.js would draw every player and Milnesium (≈170 k triangles each) in
// every view. Here each animal is tested against the view's own frustum, or,
// once the microscope knows it, the scissored part of its buffer the view
// writes, and hidden for that view only. The bound is 1.5× the rest pose's
// reach (the deformed pose stays within it: measured ≤ 0.99×) plus a margin,
// so nothing that could touch a written pixel is dropped: the image is the same.
const cullF = new THREE.Frustum(), cullM = new THREE.Matrix4(), cullS = new THREE.Sphere(), cullHid = [];
const restReach = new Map();
function reachOf(c) {
  let r = restReach.get(c);
  if (r === undefined) {
    r = 0;
    c.group.traverse((x) => { if (x.isMesh) { const g = x.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); r = Math.max(r, g.boundingSphere.center.length() + g.boundingSphere.radius); } });
    restReach.set(c, r);
  }
  const e = c.group.matrixWorld.elements;
  return (r * 1.5 + 0.2) * Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
}
/** Hide the animals outside `box` ([x0, y0, x1, y1], normalised device coordinates; null: the whole view) for this view's render. */
function cullAnimals(cam, box = null) {
  if (!api.cullViews) return;
  cullM.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  cullF.setFromProjectionMatrix(cullM);
  if (box) {
    const e = cullM.elements, P = cullF.planes; // clip-space rows: inside x0 w <= x <= x1 w, y0 w <= y <= y1 w
    P[0].setComponents(box[2] * e[3] - e[0], box[2] * e[7] - e[4], box[2] * e[11] - e[8], box[2] * e[15] - e[12]).normalize();
    P[1].setComponents(e[0] - box[0] * e[3], e[4] - box[0] * e[7], e[8] - box[0] * e[11], e[12] - box[0] * e[15]).normalize();
    P[2].setComponents(e[1] - box[1] * e[3], e[5] - box[1] * e[7], e[9] - box[1] * e[11], e[13] - box[1] * e[15]).normalize();
    P[3].setComponents(box[3] * e[3] - e[1], box[3] * e[7] - e[5], box[3] * e[11] - e[9], box[3] * e[15] - e[13]).normalize();
  }
  for (let i = 0; i <= animals.length; i++) {
    const c = i < animals.length ? animals[i].creature : predator.creature;
    if (!c || !c.group.visible) continue;
    cullS.center.setFromMatrixPosition(c.group.matrixWorld);
    cullS.radius = reachOf(c);
    if (!cullF.intersectsSphere(cullS)) { c.group.visible = false; cullHid.push(c.group); }
  }
}
function uncullAnimals() { for (const g of cullHid) g.visible = true; cullHid.length = 0; }

// What every view sees, for the director: its frustum and the point it frames (the camera's target at its distance).
const viewPool = [0, 1, 2, 3].map(() => ({ frustum: new THREE.Frustum(), focus: new THREE.Vector3() }));
const _vm = new THREE.Matrix4(), _vdir = new THREE.Vector3();
let viewN = 0;
function noteView() {
  if (viewN >= 4) return;
  const v = viewPool[viewN++];
  camera.updateMatrixWorld();
  v.frustum.setFromProjectionMatrix(_vm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  camera.getWorldDirection(_vdir);
  v.focus.copy(camera.position).addScaledVector(_vdir, view.camDist || view.dist || camera.position.distanceTo(view.target));
  seenViews = viewPool.slice(0, viewN);
}
function drawView(v, target, dt) {
  noteView();
  cullAnimals(camera);
  try { drawViewCulled(v, target, dt); } finally { uncullAnimals(); }
}

function drawViewCulled(v, target, dt) {
  const members = v && v.slots && v.slots.length ? animals.filter((a) => v.slots.includes(a.slot)) : [p1];
  const at = _at.set(0, 0, 0);
  for (const a of members) at.add(a.shown || a.walker.dispPos);
  at.multiplyScalar(1 / members.length);
  if (!members.length || (capture.active && animals.length === 1)) at.copy(walker.dispPos);
  if (outro) at.copy(places.amoeba.center); // through the portal: the focal plane on the amoeba in the pool
  const ob = OBJECTIVES[view.obj];
  const H = renderer.getDrawingBufferSize(_db).y;
  const ref = camera.position.distanceTo(at);
  const pxPerUnit = H / (2 * ref * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  for (const m of [particles.optMat, ...animals.filter((a) => a.particles).map((a) => a.particles.optMat)]) m.uniforms.uPx.value = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const micP = { ref, focus: view.focus, cocPerUnit: ob.coc, dof: ob.dof, pxPerUnit, time, backOff: _bo.set(view.yaw * 0.15, view.pitch * 0.1, 1), target, viewScale: viewScale(),
    // split: only this view's region of each optical pass (shared/splitscreen.js)
    // (and, knowing the rect, hide the animals outside it too: the passes write nothing there)
    region: target && v ? (w, h) => { const r = split.rectFor(v, w, h); if (r && w > 0 && h > 0) cullAnimals(camera, [r.x / w * 2 - 1, r.y / h * 2 - 1, (r.x + r.w) / w * 2 - 1, (r.y + r.h) / h * 2 - 1]); return r; } : null };
  if (borrow.id && !target) {
    if (borrow.id === 'semMite') {
      looks.semScene(scene, camera, { dt, umPerUnit: 100, cls: (o) => (bodyMeshes.has(o) ? CLS.CUTICLE : leafMeshes.has(o) ? CLS.LEAF : CLS.LITTER) });
    } else {
      // Optical-path units are scene units (100 µm): ×100 gives µm of path.
      const { a, b } = mic.render({ ...micP, buffersOnly: true, viewScale: 1 });
      looks.fieldFromBuffers(a.width, a.height, { a: { opd: a.textures[0], abs: a.textures[1] }, b: { opd: b.textures[0], abs: b.textures[1] }, opdK: 100, absK: 1 });
      if (borrow.id === 'opticsAmoeba') looks.amoeba({ mode: bmode.amoeba, focus: 0.6, time, umPerPx: 100 / pxPerUnit, phaseK: 0.3, odK: 1 });
      else looks.paramecium({ mode: bmode.par, time, opdK: 0.5, absK: 1 });
    }
  } else if (view.mode === 2) {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
  } else mic.render(micP);
  // the portal's golden sparkle, over the picture (not through the optics)
  if (places.glow.group.visible) {
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(target);
    renderer.render(places.overlay, camera);
    renderer.setRenderTarget(null);
    renderer.autoClear = ac;
  }
}

const _at = new THREE.Vector3(), _bo = new THREE.Vector3();

function readout() {
  // What Milnesium is up to, on screen whenever it matters.
  let bt = '', hot = true;
  const tName = animals.length > 1 ? (animals.find((a) => a.slot === predator.target)?.p.name || '') : '';
  if (capture.active) bt = (animals.length > 1 && captive ? `${captive.p.name}: ` : '') + ((captor === 'boss' ? BOSS_LINES : CAP_LINES)[capture.phase] || '');
  else if (boss.attacking) bt = `Prionchulus ${boss.fs === 'windup' ? (boss.pattern ? 'thrashes' : 'coils into an S') : 'strikes'}! Face it and brace (B)`;
  else if (predator.on && predator.attacking) bt = `${tName ? tName + ': ' : ''}Milnesium ${predator.fstate === 'windup' ? 'rears to strike' : 'lunges'}! Face it and brace (B)`;
  else if (predator.on && predator.state === 'retreat') { bt = 'The Milnesium has lost interest and crawls off'; hot = false; }
  else if (predator.on && predator.state === 'stalk') bt = tName ? `A Milnesium is stalking ${tName}` : 'A Milnesium is stalking you';
  else if (predator.on && predator.state === 'approach') { bt = tName ? `A Milnesium is closing in on ${tName}` : 'A Milnesium is closing in'; hot = false; }
  capBanner.style.display = bt ? 'block' : 'none';
  // the boss's resolve: a quiet brass gauge while it is awake
  const showG = boss.awake && !(capture.active && captor === 'boss');
  gauge.style.display = showG ? 'flex' : 'none';
  if (showG) gaugeBar.style.width = `${Math.round(boss.interest * 100)}%`;
  capBanner.textContent = bt;
  capBanner.style.background = hot ? 'rgba(150,30,20,.8)' : 'rgba(10,12,16,.6)';
  const film = life.filmHere();
  const ob = OBJECTIVES[view.obj];
  // Readout.
  const st = { caught: `caught by Milnesium (${capture.phase || ''})`, active: walker.slipping ? 'SLIPPING' : life.feeding ? 'feeding' : life.tun > 0.02 ? 'curling up…' : walker.speed > 0.03 ? 'walking' : 'holding on',
    tun: 'tun (Y to wake)', revive: 'rehydrating…', dead: 'eaten' }[life.state];
  const planted = walker.feet.filter((f) => f.state === 'stance' && f.grip > 0.5).length;
  const bar = (x) => '█'.repeat(Math.round(x * 10)).padEnd(10, '·');
  const L = split.layout;
  hud.stats([
    `out ${Math.round(world.radius(walker.dispPos) * 100)} µm of ${RINGS.portal * 100} (spoke ${world.spokeOf(walker.leaf, walker.dispPos) + 1})${portal.placed ? (portalSealed() ? ' · portal sealed' : guarded() ? ' · portal guarded' : ' · portal open') : ''}`,
    `${ob.name}  ${MODES[view.mode].split(' ')[0]}  focus ${view.focus >= 0 ? '+' : ''}${Math.round(-view.focus * 100)} µm`,
    `${walker.leaf.name}${walker.side < 0 ? ' · underside' : ''}`,
    `film     ${film > 0.03 ? Math.round(Math.min(film, 2) * 22) + ' µm' : 'DRY patch (slow going)'}`,
    `health   ${bar(life.energy)}`,
    `claws    ${planted}/8 hooked · grip ${walker.gripSum.toFixed(1)} / need ${Math.max(0, walker.required).toFixed(1)}`,
    `state    ${st}`,
    walker.candidate ? `reach    ${walker.candidate.M.name}${walker.candidate.bridged ? ' (film bridge)' : ''}` : '',
    `${dash.active ? 'SCRAMBLE' : dash.text()}   ${Math.round(walker.speed * 100)} µm/s`,
    predator.on ? `Milnesium ${predator.state === 'capture' ? 'eating you' : predator.state === 'wander' ? (predator.firstHunt ? 'browsing far off' : 'keeping off') : predator.state === 'recoil' ? 'backing off' : predator.state === 'approach' ? 'closing in' : predator.state === 'retreat' ? 'retreating' : `stalking (${predator.fstate})`} · interest ${Math.round(predator.fight.interest * 100)}% · ${Math.round(predator.dist * 100)} µm${predator.thinFilm ? ' · film too thin for it' : ''} · ${predator.hunger.state} ${Math.round(predator.hunger.left)} s` : '',
    animals.length > 1 ? `players  ${animals.map((a) => `${a.p.name} ${a.life.state}${a.p.waiting ? ' (waiting)' : ''}`).join(' · ')} · views ${L.views.length}` : '',
  ].filter(Boolean).join('\n'));
}

// The shell's roster (players who joined in the menus), then joins during play.
if (embed.players) { players.fromJSON(embed.players); syncAnimals(); }
embed.on('players', (r) => { players.fromJSON(r); syncAnimals(); });
hud.players(players.list);
requestAnimationFrame(frame);

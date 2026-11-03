// Phage prototype (Level 6 of the Zoom Chain): a T4-like tailed phage in bog
// water, drawn in realistic microscopic false light (the Goodsell watercolour,
// cryo-EM and fluorescence looks remain on the D-pad). Crisp game controls (a
// labelled departure: phages have no motor): LS forward/back along the view and
// sideways, LB/RB down/up, A dashes forward, LT/RT zoom out/in. X grabs whatever is in reach
// of the fibres (grab.js: a free molecule to carry, or any point of a cell to
// hang on to); only a matching receptor latches and starts injection. The water
// is a visible textured liquid (medium.js) with occasional currents you see
// coming (currents.js): hang on to a cell to ride one out.
// Inside, thread the DNA's leading end past the host's restriction enzyme and
// CRISPR complex until the whole genome is in. See README.md.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPlayers } from '../shared/players.js';
import { embed } from '../shared/embed.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks, portalArrowOn } from '../shared/landmark.js';
import { mountHud } from '../shared/hud.js';
import { createDash, hudControls, addInvertY } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { loadTexture } from '../shared/assets.js';
import { createCapture, createFight } from '../shared/predation.js';
import { createPost, goodsellShared, toonMaterial, inkedInstanced, setInkVisible } from '../shared/techniques/phage-goodsell.js';
import { createT4, t4LiteGeometry, T4_FL } from '../shared/techniques/phage-model.js';
import { createWorld, uvAt, uvClear, flocClear, progressAt, FIELD_R, START, UV_SHAFTS, DIRECTOR, DEFAULT_PATH, encounterSpecs, canPlace, bystanderClear } from './world.js';
import { createDirector } from '../shared/director.js';
import { createPortalGlow, createPortalLight } from '../shared/portal.js';
import { createQuality } from '../shared/quality.js';
import { createInside, GENOME_NODES } from './inside.js';
import { attachmentForward, aimedProtein } from './binding.js';
import { createCurrents, carriedPath } from './currents.js';
import { pickGrabTarget, surfacePart, GRAB } from './grab.js';
import { createMedium } from './medium.js';
import { beadMesh, beadMaterial, beadTemplate, PALETTE } from '../shared/techniques/phage-beads.js';
import { t as tt, tx } from '../shared/text.js';

const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const UP = new THREE.Vector3(0, 1, 0), AX_X = new THREE.Vector3(1, 0, 0), AX_Z = new THREE.Vector3(0, 0, 1);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
const _back = new THREE.Vector3(); // (a split view's own zoom: the camera's back axis)

// --- renderer, scenes, cameras ---
const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.localClippingEnabled = true;
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 2, 3000);
const post = createPost(renderer);
// The quality governor owns the resolution; ?pr=0.5 (for example) scales it further by hand.
const prParam = parseFloat(new URLSearchParams(location.search).get('pr'));
const renderScale = prParam > 0 ? Math.min(1, prParam) : 1;
const inside = createInside();
// The quality governor (shared/quality.js) owns the pixel ratio (1.0 while split)
// and gives a render scale (lower per split view) for the post target, and an
// effects level: 2 = DOF and two bloom levels, 1 = one bloom level, 0 = no DOF,
// the cheapest bloom, and (Goodsell) no ink on the crowds.
let qScale = 1, qLevel = 2;
// Software WebGL (SwiftShader, llvmpipe; the headless checks) gets the lightest bath and no AO taps, unless
// ?pr= asks for a full render (screenshots for judging the look).
const SOFT_GL = (() => { try { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return /swiftshader|llvmpipe|software/i.test(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''); } catch { return false; } })() && !(prParam > 0);
post.noAO = SOFT_GL;
const quality = createQuality({ renderer, key: 'phage', min: 0.5, max: 1,
  onChange: ({ scale, level }) => { qScale = scale; qLevel = level; post.quality = level; resize(); applyInk(); try { world.setCrowdLevel(SOFT_GL ? 0 : level); medium.setLevel(level); } catch { /* (before the world exists) */ } } });
function resize() {
  // Keep split-screen projections in CSS pixels, independently of render resolution.
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
  post.resize(buffer.x * qScale * renderScale, buffer.y * qScale * renderScale);
  camera.aspect = inside.camera.aspect = w / h;
  camera.updateProjectionMatrix(); inside.camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// --- input, HUD ---
// up to four local players (shared/players.js); P1 also on the keyboard
const players = createPlayers({
  max: 4,
  onJoin: (p) => { syncTeam(); audio.play('shared/join', { volume: 0.6 }); hud.toast(tt('shared.players.joined', { n: p.slot + 1 })); hud.players(players.list); embed.join(p.slot, p.color, p.name); },
  onLeave: (p) => { syncTeam(); hud.toast(tt('shared.players.left', { n: p.slot + 1 })); hud.players(players.list); embed.leave(p.slot); },
});
const pad = players.pad(0);
let ctl = players.controls(0);
const hud = mountHud({
  title: tt('phage.hud.title'),
  sub: tt('phage.hud.sub'),
  controls: hudControls({
    move: tt('phage.hud.controls.move'),
    camera: tt('phage.hud.controls.camera'),
    secondary: tt('phage.hud.controls.secondary'),
    dash: tt('phage.hud.controls.dash'),
    attack: tt('phage.hud.controls.attack'),
    defend: tt('phage.hud.controls.defend'),
    special: tt('phage.hud.controls.special'),
    analog: tt('phage.hud.controls.zoom'),
    look: tt('phage.hud.controls.look'),
  }),
  note: tt('phage.hud.note'),
});
const tag = Object.assign(document.createElement('div'), { className: 'ph-tag', textContent: tt('phage.dataTag') });
const label = Object.assign(document.createElement('div'), { className: 'ph-label' });
const scaleEl = Object.assign(document.createElement('div'), { className: 'ph-scale' });
const card = Object.assign(document.createElement('div'), { className: 'ph-card' });
const prog = Object.assign(document.createElement('div'), { className: 'ph-prog' });
const labels = document.createElement('div');
document.body.append(tag, label, scaleEl, card, prog, labels);

// --- the world and the phage ---
const world = createWorld(scene);
world.setCrowdLevel(SOFT_GL ? 0 : qLevel);
let t4 = null; // the current member's model (see use())
const progenyGeo = t4LiteGeometry();
const progeny = inkedInstanced(progenyGeo, toonMaterial({ vertexColors: true, fl: T4_FL.gold }), 40, { width: 0.8 });
progeny.setCount(0);
scene.add(progeny);

// delivered art (null until delivered); guard ids that may not be in the list yet
const safeTexture = (id, o) => { try { return loadTexture(id, o); } catch (e) { console.warn(`[micro] ${e.message}`); return Promise.resolve(null); } };
const art = { envelope: null, water: null, section: null, pano: null };
// MP-V06, the panorama, is sampled by direction: no mipmaps, so the wrap seam (where atan jumps) leaves no line
safeTexture('MP-V06', { repeat: false }).then((t) => { if (t) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; art.pano = softPanorama(t); applyArt(); } });
/**
 * The look target's far water is soft and sparse, but MP-V06 paints a dense crowd: false light uses a small,
 * heavily blurred copy of it, which keeps its colour and the soft shapes of its big cells and loses the crowd.
 */
function softPanorama(t) {
  try {
    // (three copies side by side, blurred together, the middle one kept: the blur wraps round the seam where atan jumps)
    const w = document.createElement('canvas'); w.width = 768; w.height = 128;
    for (const dx of [0, 256, 512]) w.getContext('2d').drawImage(t.image, dx, 0, 256, 128);
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.filter = 'blur(5px)';
    g.drawImage(w, -256, 0);
    const s = new THREE.CanvasTexture(c);
    s.colorSpace = THREE.SRGBColorSpace; s.generateMipmaps = false; s.minFilter = s.magFilter = THREE.LinearFilter; s.wrapS = THREE.RepeatWrapping;
    return s;
  } catch { return t; }
}
// MP-V07, far molecule sprites (a 4 × 4 sheet), for the far layer beyond the baths
safeTexture('MP-V07', { repeat: false }).then((t) => { if (t) world.setSprites(t); });
safeTexture('MP-V01').then((t) => { if (t) { art.envelope = t; applyArt(); } });
safeTexture('MP-V02').then((t) => { if (t) { art.water = t; applyArt(); } });
safeTexture('MP-V03', { repeat: false }).then((t) => { if (t) { art.section = t; applyArt(); } });

const LOOKS = ['Realistic false light', 'Goodsell watercolour', 'Cryo-EM greyscale', 'Fluorescence (pseudo-colour)'];
/** A look's name as shown (LOOKS are the stored values; the words are phage.features.lookFL.choices). */
const lookName = (v) => tx('phage.features.lookFL.choices')[v] ?? v;
const POST_LOOK = [3, 0, 1, 2]; // createPost's look index for each
const isFL = () => view.look === 0;
// The zoom: LT out, RT in, analogue and continuous, with the paramecium's feel (the same rate and easing):
// the camera's distance behind the phage, each player their own (the owner, 3 Nov 2026: "for Phage let's
// have LT/RT also be zoom instead of DPad"). The range is the old four D-pad steps' (60 to 290).
const ZOOM = { min: 60, start: 110, max: 290, rate: 1.1, ease: 0.14 };
const ZOOMS = [60, 110, 180, 290]; // (the old steps: debug.zoom(i) still takes an index)
// The camera's orientation is a quaternion turned about its own axes by RS (no yaw/pitch angles, no
// lookAt and no up vector, so there is no pole to flip at); nothing turns it unless a stick is held,
// apart from an optional, gentle roll that keeps the sunlit surface toward the top of the screen.
const view = { look: 0, groupZoom: 1, camDist: 180, q: new THREE.Quaternion(), overlay: false, ink: true, art: true, target: new THREE.Vector3(), dist: 180, iso: null, lookHold: 0, level: true, turnRate: 0 };
const opts = { drive: true, brownian: true, currents: true, tumble: true, uv: true, amoeba: true, medium: new URLSearchParams(location.search).get('medium') !== '0' };

function applyArt() {
  const use = view.art;
  // (false light draws the hosts' membrane procedurally, LOOK.md "Recipe": MP-V05's bead mosaic was the busy,
  // speckled surface the look target replaced, so it is no longer loaded; the Goodsell looks keep MP-V01)
  const env = use && !isFL() ? art.envelope : null;
  for (const h of [...world.hosts, ...world.bystanders]) {
    h.mat.setMap(isFL() ? null : (env || h.mat.userData.std), env ? [3, 1.5] : [6, 3]);
    h.mat.uniforms.uFLMap.value = 0;
    // the painted envelope carries its own colour; the wrong host keeps a dull tint so it reads apart
    h.mat.uniforms.uColor.value.set(env ? (h.wrong ? '#bba680' : '#e4e0d8') : h.color);
  }
  post.setBackdrop(use ? art.water : null);
  post.setPanorama(use ? art.pano : null, 0.5);
  waterColor = use && art.water ? '#a7c2bc' : '#bcd3ea';
  // in false light the painted (Goodsell) envelope only lends its grain
  inside.setSection(use ? art.section : null);
}
for (const h of [...world.hosts, ...world.bystanders]) h.mat.userData = { std: h.mat.uniforms.uMap.value };
let waterColor = '#bcd3ea';

// --- phage state ---
// Clear water below and left of Host A; keep the surface/UV direction upright.
// START comes from world.js: clear water at the lower left, far from Host A (upper right).
const newP = () => ({
  // (kv: the velocity a current gives you, eased toward its flow; hold: what the fibres hold, see grabbing)
  pos: START.clone(), vel: new THREE.Vector3(), bvel: new THREE.Vector3(), kv: new THREE.Vector3(), gust: new THREE.Vector3(), hold: null, reachT: 0, idleT: 0,
  q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 2.95), angVel: new THREE.Vector3(),
  mode: 'drift', foldTarget: 0, fold: 0, integrity: 1, host: null, walkLocal: new THREE.Vector3(), lift: 4,
  anchors: Array(6).fill(null), stepping: -1, stepT: 0, bound: 0, canCommit: false, commitT: 0, commitHost: null,
  clayT: 0, msgT: 0, kind: null, cutBy: null, burstT: 0, fade: 0, contract: 0, star: 0, shortOut: 0, dna: 1, dark: 0, crack: 0, scale: 1,
  stuckTip: Array(6).fill(null), lastHost: null, inBack: false, grab: null, grabCooldown: 0, snag: null, snagT: 0,
  damaged: false, wreck: 0, coHost: null, coT: 0,
});

// --- the team: one phage per player. The update functions below act on the
// "current" member through P, t4, dash, capture and ctl; use(m) switches them.
const team = []; // by slot
let P = null, dash = null, capture = null, cur = null;
let capsidMode = 'translucent';
function use(m) { cur = m; P = m.P; t4 = m.t4; dash = m.dash; capture = m.capture; ctl = players.controls(m.slot); }
const curPad = () => players.pad(cur ? cur.slot : 0);
const members = () => team.filter(Boolean);
const isMulti = () => members().length > 1;
/**
 * Telling players apart: each player's phage has its own head glass in false light (the tail keeps its
 * bronze tones), and its own capsid colour in the other looks. Player 1 is today's bronze (blue capsid);
 * then jade, copper and pearl-silver, keyed to the player colours (teal, rose, blue). A labelled departure:
 * every T4 is the same protein, colourless; the colours are the look's, not the virus's.
 */
const HEADS = [
  null,
  { fl: { color: '#2c6a3c', color2: '#5cb86a', glowColor: '#9ee0a0' }, capsid: '#6cc48a', capsidDeep: '#4a9a64' },
  { fl: { color: '#963e2a', color2: '#dc8062', glowColor: '#f6a68c' }, capsid: '#e49274', capsidDeep: '#c2684a' },
  { fl: { color: '#8e8a8c', color2: '#ece6e2', glowColor: '#fff8f0' }, capsid: '#d0ccd0', capsidDeep: '#a8a2a8' },
];
function makeMember(slot, color) {
  const z0 = team[0] ? team[0].zoomWant : ZOOM.start; // (a joining player starts at player 1's zoom)
  const m = { slot, color, zoom: z0, zoomWant: z0, P: newP(), t4: createT4({ clip: true }), dash: createDash({ duration: 0.5, cooldown: 2.4 }),
    capture: null, c: { active: false, phase: null, t: 0 }, jab: 0 };
  // caught: strike, hold, eat (the camera pulls back), follow the predator, fade, respawn, fade in
  m.capture = createCapture({ onRespawn: () => afterCatch(m) });
  m.t4.addTo(scene);
  m.t4.set({ capsid: capsidMode });
  m.t4.setHead(HEADS[slot % HEADS.length]);
  team[slot] = m;
  return m;
}
function dropMember(slot) {
  const m = team[slot];
  if (!m) return;
  m.t4.dispose(scene);
  team[slot] = null;
}
/** Make the team match the roster (joins and leaves, a roster from the shell). */
// ?spread=300: a joining player starts that far from player 1 (perf runs of a split crowd)
const SPREAD = Number(new URL(location.href).searchParams.get('spread')) || 0;
function syncTeam() {
  const want = new Set(players.list.map((p) => p.slot));
  for (const m of members()) if (!want.has(m.slot)) dropMember(m.slot);
  for (const p of players.list) {
    if (team[p.slot]) continue;
    const m = makeMember(p.slot, p.color);
    if (p.slot > 0 && team[0]) respawn(m); else placeAtStart(m);
    if (SPREAD && p.slot > 0 && team[0] && team[p.slot] === m) { const a = p.slot * 2.1; debug.place(p.slot, team[0].P.pos.x + Math.cos(a) * SPREAD, team[0].P.pos.y + Math.sin(a) * SPREAD * 0.6); }
    syncTeam.joined = true;
  }
  if (syncTeam.joined) { syncTeam.joined = false; for (const m of members()) m.t4.setStyle(isFL()); applyInk(); }
  if (team[0]) use(team[0]);
}

// --- features ---
const features = createFeatures({ key: 'phage', pad });
const audio = createAudio(['bacterium/run', 'bacterium/tumble', 'bacterium/sprint', 'bacterium/eat', 'bacterium/phage', 'bacterium/graze',
  'phage/amb-water', 'phage/grab', 'phage/release', 'phage/miss', 'phage/throw', 'phage/fold', 'phage/dash', 'phage/jab', 'phage/lobe', 'phage/current-coming', 'phage/current-pass',
  'phage/latch', 'phage/sheath', 'phage/inject', 'phage/cas', 'phage/burst', 'phage/snag',
  'shared/portal-enter', 'shared/portal-near', 'shared/portal-sealed', 'shared/portal-appear', 'shared/backdoor', 'shared/block', 'shared/death', 'shared/reform', 'shared/foe-flees', 'shared/join']);
audio.addToFeatures(features);
audio.loop('phage/amb-water', { volume: 0.5, old: 'bacterium/amb-sediment' });
/** A frequent sound (grab, miss) for the current player: at most one every `gap` s each. */
function playLimited(id, gap, opts) {
  const due = (P.sndT ||= {});
  if (due[id] > t && audio.set === 'new') return; // (the Old set's stand-ins were not limited)
  due[id] = t + gap;

  audio.play(id, opts);
}
const driftLoop = audio.loop('bacterium/run', { volume: 0 });
function unlockOnPad() { if (pad.kind !== 'controller') return; for (let b = 0; b < 16; b++) if (pad.value(b) > 0.5) { audio.unlock(); return; } }

features.add({ id: 'lookFL', group: 'Rendering', choices: LOOKS, value: LOOKS[0],
  onChange: (v) => { view.look = Math.max(0, LOOKS.indexOf(v)); applyStyle(); } });
features.add({ id: 'capsid2', group: 'Rendering', choices: ['Cutaway', 'Translucent', 'Solid'], value: 'Translucent',
  onChange: (v) => { capsidMode = v.toLowerCase(); for (const m of members()) m.t4.set({ capsid: capsidMode }); applyInk(); } });
features.add({ id: 'ink', group: 'Rendering', on: true, onChange: (on) => { view.ink = on; goodsellShared.uInkOn.value = on ? 1 : 0; applyInk(); } });
features.add({ id: 'depth', group: 'Rendering', on: true, onChange: (on) => { goodsellShared.uDepthOn.value = on ? 1 : 0; } });
features.add({ id: 'art', group: 'Rendering', on: true,
  onChange: (on) => { view.art = on; applyArt(); } });
features.add({ id: 'model', group: 'Body', fixed: true });
features.add({ id: 'drive', group: 'Motion', choices: ['Steer: LS, LB/RB move the phage (departure)', 'Honest: Brownian motion only'], value: 'Steer: LS, LB/RB move the phage (departure)',
  onChange: (v) => { opts.drive = v.startsWith('Steer'); } });
features.add({ id: 'brown', group: 'Motion', on: true,
  onChange: (on) => { opts.brownian = on; world.opts.hostBrownian = on; for (const b of world.baths) b.uniforms.uJit.value = on ? b.jit0 : 0; } });
features.add({ id: 'tumble', group: 'Motion', on: true,
  onChange: (on) => { opts.tumble = on; } });
features.add({ id: 'uv', group: 'Simulation', on: true,
  onChange: (on) => { opts.uv = on; } });
features.add({ id: 'amoeba', group: 'Simulation', on: true,
  onChange: (on) => { opts.amoeba = on; } });
features.add({ id: 'medium', group: 'World', on: new URLSearchParams(location.search).get('medium') !== '0',
  onChange: (on) => { opts.medium = on; } });
features.add({ id: 'crowd', group: 'World', on: true,
  onChange: (on) => { world.opts.crowd = on; } });
features.add({ id: 'currents', group: 'Motion', on: true,
  onChange: (on) => { opts.currents = on; if (!on) currents.reset(); } });
features.add({ id: 'level', group: 'Controls', on: true,
  onChange: (on) => { view.level = on; } });
addInvertY(features);
quality.addToFeatures(features);

/** The look's switches beyond the pass: the materials' style, the world's false-light extras, the ink hulls. */
function applyStyle() {
  const fl = isFL();
  goodsellShared.uStyle.value = fl ? 1 : 0;
  world.setStyle(fl);
  inside.setStyle(fl);
  for (const m of members()) m.t4.setStyle(fl);
  try { stray.t4.setStyle(fl); } catch { /* (during set-up, before the stray exists) */ }
  applyInk();
  applyArt();
}
/** Ink hulls only where they draw something: Goodsell-style looks with Ink on; at the lowest quality not on the crowds. */
function applyInk() {
  if (!world) return;
  const on = view.ink && !isFL();
  setInkVisible(scene, on);
  inside.setInk(on);
  if (on && qLevel === 0) for (const root of [scene, inside.scene]) root.traverse((o) => { if (o.userData.crowd && o.ink) o.ink.visible = false; });
}

// --- helpers ---
let toastT = 0;
function say(text, ms = 2200, force = false) { if (!force && toastT > 0) return; hud.toast(text, ms); toastT = Math.min(1.2, ms / 1000); }
function axisOf(out = new THREE.Vector3()) { return out.copy(UP).applyQuaternion(P.q); }
function centreOf(out = new THREE.Vector3()) { return axisOf(out).multiplyScalar(10 * P.scale).add(P.pos); }
/** The camera's own axes from view.q (right, up, forward into the screen). */
const camRight = (out = new THREE.Vector3()) => out.set(1, 0, 0).applyQuaternion(view.q);
const camUp = (out = new THREE.Vector3()) => out.set(0, 1, 0).applyQuaternion(view.q);
const camFwd = (out = new THREE.Vector3()) => out.set(0, 0, -1).applyQuaternion(view.q);
/**
 * The sticks in the water (the owner, 2 Nov 2026): LS up and down forward and back along the view (into
 * and out of the screen), LS left and right sideways; `vert` (RB minus LB) up and down the screen. All in
 * the view's own frame, so there is no up or down bias and no feedback into the view.
 */
function stickWorld(ls, vert, out) {
  out.copy(camRight(_w)).multiplyScalar(ls.x).addScaledVector(camFwd(_s), -ls.y).addScaledVector(camUp(_n), vert);
  if (out.lengthSq() > 1) out.normalize();
  return out;
}
/**
 * Turn the phage so its baseplate (attachment end) points a fraction k of the way toward `dir`, by the
 * shortest rotation from where it points now. (The old code aimed it with setFromUnitVectors(UP, -stick),
 * a full orientation built from a fixed reference: singular when the stick pointed up the screen, where the
 * phage flipped and spun about its axis.)
 */
function turnBaseToward(dir, k) {
  const cur = attachmentForward(P.q);
  const d = cur.dot(dir);
  if (d < -0.999) _q.setFromAxisAngle(_v.crossVectors(cur, camFwd(_w)).lengthSq() > 1e-6 ? _v.normalize() : AX_X, Math.PI * Math.min(1, k));
  else _q.identity().slerp(new THREE.Quaternion().setFromUnitVectors(cur, dir), Math.min(1, k));
  P.q.premultiply(_q).normalize();
}
function releaseAnchors() { for (let f = 0; f < 6; f++) { P.anchors[f] = null; t4.fibres[f].anchor = null; } P.stepping = -1; }

/** Put a member back in clear water: at `at` (default the start), whole and drifting. */
function placeAtStart(m, at = null) {
  use(m);
  P.pos.copy(at || START).add(at ? _v.set(0, 0, 0) : _v.set(m.slot * 26, (m.slot % 2) * 14, 0));
  releaseHold(false);
  P.vel.set(0, 0, 0); P.bvel.set(0, 0, 0); P.kv.set(0, 0, 0); P.gust.set(0, 0, 0); P.angVel.set(0, 0, 0);
  P.q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 2.95);
  Object.assign(P, { damaged: false, wreck: 0, coHost: null, coT: 0 });
  if (stray.paired === m) stray.paired = null;
  Object.assign(P, { mode: 'drift', foldTarget: 0, fold: 0, integrity: 1, host: null, canCommit: false, bound: 0, commitT: 0, kind: null, cutBy: null, burstT: 0, fade: 0, contract: 0, star: 0, shortOut: 0, dna: 1, dark: 0, crack: 0, scale: 1, grab: null, grabCooldown: 0, snag: null, snagT: 0, lift: 4 });
  releaseAnchors();
  P.stuckTip.fill(null);
  t4.set({ contract: 0, star: 0, shortOut: 0, dna: 1, dark: 0, crack: 0 });
  t4.group.scale.setScalar(1);
  t4.group.position.copy(P.pos); t4.group.quaternion.copy(P.q);
  t4.resetFibres(t);
  if (capture.active && !respawning) capture.reset(false); // (not from inside the capture's own respawn call)
}
/** Multiplayer: a caught player comes back beside a teammate who is still in play. */
function respawn(m) {
  const mate = members().find((o) => o !== m && (o.P.mode === 'drift' || o.P.mode === 'walk' || o.P.mode === 'clay'));
  // never further back than a safe spot near where you were lost (encounter pattern): a little back toward
  // the start, clear of the shafts and flocs; beside a teammate who is still in play, if any
  const at = mate ? mate.P.pos.clone().add(new THREE.Vector3(rand(-24, 24), 26, 0)) : safeSpot(m.P.lostAt);
  placeAtStart(m, at);
  audio.play('shared/reform', { volume: 0.7 });
  if (m.P === P) say(tt(mate ? 'phage.toasts.driftsBackBeside' : 'phage.toasts.driftsBack', { name: players.get(m.slot)?.name || tt('shared.hud.playerShort', { n: m.slot + 1 }) }), 2000, true);
}
let respawning = false;
/** A calm spot about 1.6 µm back toward the start from p (null: the start itself). */
function safeSpot(p) {
  if (!p) return null;
  const at = p.clone().sub(START);
  const d = at.length();
  if (d < 200) return null;
  at.setLength(Math.max(0, d - 160)).add(START);
  for (let i = 0; i < 12; i++) {
    if (uvAt(at).k === 0 && world.sdFloc(at).d > 30 && world.nearestHost(at).d > 40 && bystanderClear(at) > 40) return at;
    at.sub(START).multiplyScalar(0.93).add(START);
  }
  return at;
}
/** The end of a catch (the screen is black): solo or not, the phage drifts back in, beside a teammate if any. */
function afterCatch(m) {
  const wasInside = m.P.mode === 'inside' || m.P.kind === 'cut';
  const am = world.amoeba;
  if (m.P.kind === 'amoeba') { am.vacuole.visible = false; am.see(1); am.posture(0); }
  if (wasInside) { inside.reset(); m.P.fade = 0; for (const h of world.hosts) h.locked = false; }
  fight.reset(); if (fightState !== 'gone') fightState = 'guard';
  const was = cur;
  respawning = true;
  try { respawn(m); } finally { respawning = false; }
  m.P.kind = null; m.P.camFocus = null;
  if (was) use(was);
}
let started = false;
function resetLevel() {
  world.reset();
  for (const m of members()) placeAtStart(m);
  if (team[0]) use(team[0]);
  fight.reset(); fightState = 'stalk'; guard.gone = false; guard.turned = false; guard.hinted = false; portalGlow.group.visible = false;
  ringLog.length = 0; leadPos.copy(START); director.reset(); drift.idle = 0;
  inside.reset();
  resetStray();
  currents.reset(); world.current = null; curLog.length = 0; resetMols();
  progeny.setCount(0);
  card.classList.remove('show');
  P.burstSent = false;
  view.target.copy(P.pos); view.q.identity(); view.lookHold = 0;
  // in the game shell its intro has already said this
  if (!embed.active || started) say(tt('phage.toasts.intro'), 5200, true);
  started = true;
}

// --- death and capture sequences ---
function startCapture(kind, by, how) {
  if (capture.active) return;
  releaseHold(false);
  P.kind = kind;
  P.lostAt = kind === 'cut' || kind === 'dud' ? (P.commitHost || P.coHost || { pos: P.pos }).pos.clone() : P.pos.clone();
  P.mode = kind === 'cut' ? 'inside' : 'dead';
  capture.start({ by, how });
  curPad().rumble(400, 0.6, 0.9);
  if (isMulti()) embed.captured({ player: cur.slot, kind });
  audio.play(kind === 'amoeba' ? 'bacterium/graze' : kind === 'cut' ? 'bacterium/tumble' : 'bacterium/eat', { volume: 0.9 });
  if (kind !== 'cut') audio.play('shared/death', { volume: 0.6, delay: 0.4 }); // (cut: the genome, not the phage, is lost)
}
function captureAnim(phase, t, dt) {
  const am = world.amoeba;
  if (P.kind === 'amoeba') {
    const c = centreOf(_v);
    if (phase === 'strike') { am.tip.lerp(c, 0.2); world.drawPod(am.reach, am.base, am.tip, 1 - t); }
    else if (phase === 'hold') {
      P.pos.lerp(_w.copy(am.base).addScaledVector(_n.subVectors(am.center, am.base).normalize(), -16), dt * 1.4);
      am.tip.copy(centreOf(_v)); am.reach = am.tip.distanceTo(am.base);
      world.drawPod(am.reach, am.base, am.tip, 0);
      am.vacuole.visible = true; am.vacuole.position.copy(centreOf(_v)); am.vacuole.scale.setScalar(26 - 6 * t);
    } else if (phase === 'eat') {
      // swallowed whole: the lobe draws back in with the vacuole, and we watch through its membrane
      world.drawPod(am.reach * (1 - t), am.base, am.tip.lerp(am.base, dt * 2), 0, t < 0.95);
      am.see(1 - 0.5 * t);
      P.pos.lerp(_w.copy(am.base).addScaledVector(_n.subVectors(am.center, am.base).normalize(), 22), dt * 1.2);
      am.vacuole.visible = true; am.vacuole.position.copy(centreOf(_v)); am.vacuole.scale.setScalar(20 - 6 * t);
      P.dark = Math.min(1, 0.2 + t * 0.6); P.scale = 1 - 0.3 * t; P.foldTarget = 1;
    } else if (phase === 'follow' || phase === 'fadeOut') {
      // the amoeba moves on: cytoplasm streams the vacuole along its edge while it digests
      const k = phase === 'follow' ? t : 1;
      world.drawPod(0, am.base, am.tip, 0, false);
      am.see(0.5);
      const inward = _n.subVectors(am.center, am.base).normalize();
      P.pos.addScaledVector(_w.set(-inward.y, inward.x, 0), -dt * 24).addScaledVector(inward, dt * 4);
      am.vacuole.visible = true; am.vacuole.position.copy(centreOf(_v)); am.vacuole.scale.setScalar(14 - 4 * k);
      P.dark = Math.min(1, 0.8 + 0.2 * k); P.scale = 0.7 - 0.25 * k;
    }
  } else if (P.kind === 'uv') {
    if (phase === 'strike') post.uniforms.uFlash.value = (1 - t) * 0.7;
    else if (phase === 'hold') { P.dark = 0.4 + 0.6 * t; }
    else if (phase === 'eat') { P.dark = 1; P.crack = t; P.dna = 1 - 0.5 * t; P.foldTarget = 0.6; }
    else { P.dark = 1; P.crack = 1; P.dna = 0.5; P.pos.y += dt * 5; P.pos.x += dt * 3; } // the broken shell drifts on in the light
  } else if (P.kind === 'cut') {
    const e = P.cutBy;
    if (e.kind === 'cas' && (phase === 'eat' || phase === 'follow' || phase === 'fadeOut')) {
      if (phase === 'eat' && t < 0.05) inside.cutAnim(e, 'hold', 1);
      P.camFocus = inside.chew(e, dt).clone(); // Cas3 chews your DNA back toward the pore: the camera follows it
    } else if (phase === 'follow' || phase === 'fadeOut') { // the enzyme lets go and slides off along the host DNA
      e.closing = null; e.pos.x += dt * 14; e.pos.y -= dt * 4; e.g.position.copy(e.pos); P.camFocus = e.pos.clone();
    } else inside.cutAnim(e, phase, t);
  }
}

// --- explicit protein grab, then the existing irreversible injection ---
function beginCommit() {
  P.mode = 'commit'; P.commitT = 0; P.commitHost = P.host; P.host.locked = true; P.injected = false;
  say(tt('phage.toasts.receptorFits'), 3200, true);
  audio.play('phage/latch', { volume: 0.8, old: ['bacterium/phage', { volume: 0.9 }] });
  curPad().rumble(250, 0.3, 0.5);
}
// --- grabbing (X): whatever is in reach of the fibres (grab.js) ---
// X grabs, and pressed again lets go (RT, which also grabbed and held while squeezed, zooms now).
// A free molecule is carried at the baseplate and drifts off gently when let go; a point on a cell anchors
// you (a current passes you by), and LS crawls you along the surface. Only a matching receptor goes further:
// on a host's gold three-lobed receptor the fibres latch and the injection starts (Host A, the way on,
// with Y); every other part of a cell, and every other protein, only holds.
const HOLD_LIFT = 7; // the baseplate's stand-off from a held surface (the fibres' length, bent)
const HOLD_REACH_T = 0.18; // the fibres' reach out to what they grab
/** The fibres' reach centre: a little ahead of the baseplate. */
const handOf = (out = new THREE.Vector3()) => out.copy(attachmentForward(P.q)).multiplyScalar(4).add(P.pos);
/** The cells whose surface is within the grab's reach of point `hand` (hosts and the bystanders). */
function cellsNear(hand, reach = GRAB.reach) {
  const out = [];
  for (const h of [...world.hosts, ...world.bystanders]) {
    if (h.burst || h.hidden || h.locked) continue;
    if (Math.abs(h.pos.x - hand.x) > h.half + h.r + reach || Math.abs(h.pos.y - hand.y) > h.half + h.r + reach || Math.abs(h.pos.z - hand.z) > h.half + h.r + reach) continue;
    const n = new THREE.Vector3(), d = world.sdHost(h, hand, n);
    if (d > reach) continue;
    out.push({ host: h, d: Math.max(0, d), normal: n, point: hand.clone().addScaledVector(n, -d) });
  }
  return out;
}
/** What X would take now: the grab assist's pick, or null. */
function grabTarget() {
  const hand = handOf(new THREE.Vector3());
  return pickGrabTarget(hand, attachmentForward(P.q), mols.filter((o) => !o.heldBy), cellsNear(hand));
}
/** Host-local direction of a world direction. */
const dirToLocal = (h, d, out = new THREE.Vector3()) => { const c = Math.cos(-h.ang), sn = Math.sin(-h.ang); return out.set(d.x * c - d.y * sn, d.x * sn + d.y * c, d.z); };
/** Hold on to host h at world point `point` (its outward normal `normal`): anchored. */
function holdCell(h, point, normal, by, part) {
  releaseHold(false);
  P.hold = { kind: 'cell', host: h, local: world.toLocal(h, point, new THREE.Vector3()), nLocal: dirToLocal(h, normal), by, t: 0, part };
  P.reachT = HOLD_REACH_T;
  P.vel.multiplyScalar(0.3); P.gust.set(0, 0, 0);
  playLimited('phage/grab', 0.25, { volume: 0.6, rate: 0.95 + Math.random() * 0.1, old: ['bacterium/tumble', { volume: 0.35, rate: 1.5 }] }); curPad().rumble(70, 0.25, 0.15);
  ringLog.push({ kind: 'hold', what: h.id, t: +t.toFixed(2), slot: cur.slot });
}
function holdMol(o, by) {
  releaseHold(false);
  o.heldBy = cur.slot; o.vel.set(0, 0, 0);
  P.hold = { kind: 'mol', mol: o, by, t: 0 };
  P.reachT = HOLD_REACH_T;
  playLimited('phage/grab', 0.25, { volume: 0.5, rate: 1.1, old: ['bacterium/tumble', { volume: 0.3, rate: 1.8 }] }); curPad().rumble(50, 0.15, 0.1);
  ringLog.push({ kind: 'hold', what: 'molecule', t: +t.toFixed(2), slot: cur.slot });
}
/** Let go: a carried molecule drifts gently off ahead of the baseplate; from a cell, a small push off it. */
function releaseHold(push = true) {
  const g = P && P.hold;
  if (!g) return;
  P.hold = null;
  releaseAnchors();
  if (g.kind === 'mol') {
    g.mol.heldBy = null;
    if (push) g.mol.vel.copy(P.vel).add(P.kv).addScaledVector(attachmentForward(P.q), 16);
  } else if (push) P.gust.copy(world.dirToWorld(g.host, g.nLocal, _v)).multiplyScalar(12);
  if (push) audio.play('phage/release', { volume: 0.5, old: ['bacterium/tumble', { volume: 0.2, rate: 1.3 }] });
}
/**
 * X: grab (`by` 'x'). quiet: with no toasts and no proteins (the injection and the way on take a
 * deliberate press).
 */
function tryGrab(by = 'x', quiet = false) {
  if (!['drift', 'walk'].includes(P.mode) || P.grabCooldown > 0 || P.hold) return;
  if (P.foldTarget > 0.5 || P.fold > 0.5) { if (!quiet) say(tt('phage.toasts.fibresFolded'), 1800, true); return; }
  if (P.mode === 'walk') return;
  if (!quiet) {
    // A protein aimed at: the gold receptors are the ones that matter (the injection); a second player may
    // try a wrong protein, but cannot enter an occupied host phase.
    const aimed = aimedProtein(P.pos, attachmentForward(P.q), world.proteins, (target) => world.toWorld(target.host, target.local));
    const portalHost = aimed && world.portal && aimed.host === world.portal.host && aimed.compatible;
    if (portalHost && portalSealed()) { audio.play('shared/portal-sealed', { volume: 0.6 }); say(tt('phage.toasts.sealed'), 2400, true); P.grabCooldown = 0.6; return; }
    if (portalHost && guarded()) {
      // the way on, on guard: turned back (the lobe shoves you off the receptor)
      const n = world.dirToWorld(aimed.host, aimed.normal, new THREE.Vector3());
      P.gust.addScaledVector(n, 60).addScaledVector(_v.subVectors(P.pos, world.amoeba.center).normalize(), 25);
      P.grabCooldown = 0.6; curPad().rumble(160, 0.4, 0.5); audio.play('shared/portal-sealed', { volume: 0.6, old: ['bacterium/tumble', { volume: 0.6, rate: 0.8 }] });
      say(tt('phage.toasts.turnedBack'), 3200, true);
      ringLog.push({ kind: 'turnedBack', t: +t.toFixed(2), slot: cur.slot });
      return;
    }
    if (aimed) {
      const n = world.dirToWorld(aimed.host, aimed.normal, new THREE.Vector3()), at = world.toWorld(aimed.host, aimed.surface, new THREE.Vector3());
      // the way on is entered on purpose, with Y (the owner, 1 Nov 2026: "Press Y to enter portal", never an automatic door): hang on there
      if (portalHost) { holdCell(aimed.host, at, n, by, tt('phage.parts.goldReceptor')); say(tt('phage.toasts.wayOn'), 2000, true); return; }
      if (aimed.compatible) {
        if (members().some((m) => m !== cur && ['grab', 'commit', 'inside', 'burst'].includes(m.P.mode) && (m.P.mode !== 'grab' || m.P.grab?.protein.compatible))) {
          say(tt('phage.toasts.teammateBusy'), 1800, true); return;
        }
        releaseAnchors(); P.host = null; P.canCommit = false;
        P.grab = { protein: aimed, time: 0, from: P.pos.clone(), q: P.q.clone() };
        P.mode = 'grab'; P.vel.set(0, 0, 0); P.bvel.set(0, 0, 0); P.gust.set(0, 0, 0); P.kv.set(0, 0, 0);
        playLimited('phage/grab', 0.25, { volume: 0.6, old: ['bacterium/tumble', { volume: 0.35, rate: 1.4 }] });
        return;
      }
      holdCell(aimed.host, at, n, by, tt('phage.parts.violetProtein'));
      playLimited('phage/miss', 0.3, { volume: 0.5 }); // the wrong protein
      say(tt('phage.toasts.doesNotFit'), 2300);
      return;
    }
  }
  const tgt = grabTarget();
  if (!tgt) {
    if (!quiet) { cur.jab = 0.45; P.grabCooldown = 0.2; playLimited('phage/miss', 0.3, { volume: 0.5 }); say(tt('phage.toasts.nothingInReach'), 1600); }
    return;
  }
  if (tgt.kind === 'mol') { holdMol(tgt.mol, by); if (!quiet) say(tt('phage.toasts.gotMolecule'), 1600); return; }
  const h = tgt.cell.host;
  const part = surfacePart(world.toLocal(h, tgt.point, _v), h.wrong);
  holdCell(h, tgt.point, tgt.cell.normal, by, part);
  say(tt(h.bystander || h.wrong ? 'phage.toasts.holdingOn' : 'phage.toasts.holdingOnHint', { part, host: h.bystander ? tt('phage.hosts.otherKind') : h.name }), 2200);
}
/** Each frame while anchored to a cell: hang on at the anchor; LS crawls it along the surface. */
function updateHoldCell(dt, inp) {
  const g = P.hold, h = g.host;
  if (h.burst || h.hidden || h.locked) { releaseHold(); return; }
  g.t += dt;
  const A = world.toWorld(h, g.local, new THREE.Vector3()), n = world.dirToWorld(h, g.nLocal, new THREE.Vector3());
  // crawl: the stick's part along the surface moves the anchor (hand over hand), and it stays on the surface
  if (inp.stick) {
    const tan = _v.copy(inp.stick).addScaledVector(n, -inp.stick.dot(n));
    if (tan.lengthSq() > 1e-4) {
      A.addScaledVector(tan.normalize(), 16 * inp.stickM * dt);
      world.projectToHost(h, A, 0, A, n);
      world.toLocal(h, A, g.local); dirToLocal(h, n, g.nLocal);
    }
  }
  const goal = _w.copy(A).addScaledVector(n, HOLD_LIFT);
  P.pos.lerp(goal, 1 - Math.exp(-dt * 9));
  P.vel.set(0, 0, 0); P.kv.set(0, 0, 0); P.gust.set(0, 0, 0);
  P.angVel.multiplyScalar(Math.exp(-dt * 4));
  turnBaseToward(_s.copy(n).negate(), Math.min(1, dt * 5));
  integrateRotation(dt);
  // the six fibres plant round the anchor, reaching out over the first moment
  const k = 1 - Math.max(0, P.reachT) / HOLD_REACH_T;
  const ta = _n.crossVectors(n, Math.abs(n.y) < 0.9 ? UP : AX_X).normalize(), tb = _s.crossVectors(n, ta);
  for (let f = 0; f < 6; f++) {
    const a = (f / 6) * Math.PI * 2;
    const foot = A.clone().addScaledVector(ta, Math.cos(a) * 6).addScaledVector(tb, Math.sin(a) * 6);
    world.projectToHost(h, foot, 0.4, foot);
    t4.fibres[f].anchor = k < 1 ? t4.tip(f).clone().lerp(foot, k) : foot;
  }
}
function updateGrab(dt) {
  const g = P.grab, target = g.protein, h = target.host;
  g.time += dt;
  const progress = Math.min(1, g.time / 0.45), ease = progress * progress * (3 - 2 * progress);
  const normal = world.dirToWorld(h, target.normal);
  const point = world.toWorld(h, target.surface).addScaledVector(normal, target.compatible ? 4 : 11);
  P.pos.lerpVectors(g.from, point, ease);
  P.q.slerpQuaternions(g.q, new THREE.Quaternion().setFromUnitVectors(UP, normal), ease);
  // The visible fibres converge on the attempted protein before either latching or slipping.
  const contact = world.toWorld(h, target.local);
  for (let f = 0; f < 6; f++) t4.fibres[f].anchor = contact.clone().addScaledVector(normal, Math.sin(progress * Math.PI) * 2);
  if (progress < 1) return;
  P.grab = null;
  if (target.compatible) {
    enterWalk(h);
    // Pin the feet around the selected receptor rather than requiring an unseen patch count.
    P.q.setFromUnitVectors(UP, normal);
    t4.group.position.copy(P.pos); t4.group.quaternion.copy(P.q); t4.group.updateMatrixWorld(true);
    for (let f = 0; f < 6; f++) {
      const foot = t4.footTarget(f, t, new THREE.Vector3());
      world.projectToHost(h, foot, 0.4, foot);
      P.anchors[f] = world.toLocal(h, foot);
      t4.fibres[f].anchor = foot;
    }
    P.bound = 6; P.canCommit = true; beginCommit();
  } else {
    releaseAnchors(); P.mode = 'drift'; P.gust.copy(normal).multiplyScalar(28);
    P.angVel.set(0, 0, 0.8); P.grabCooldown = 0.25;
    say(tt('phage.toasts.slipOff'), 2300, true);
    playLimited('phage/miss', 0.3, { volume: 0.6, old: ['bacterium/tumble', { volume: 0.65, rate: 0.8 }] }); curPad().rumble(100, 0.15, 0.25);
  }
}

// --- the portal (Host A's gold receptors): its area, the Y prompt and entering on purpose ---
const PORTAL_REACH = 40;
/** The nearest of Host A's gold receptors within reach of player m's phage (centre), or null; only once the way on is placed. */
function portalReceptorNear(m) {
  if (!world.portal || !outsideModes.includes(m.P.mode) || m.P.mode === 'clay' || m.c.active) return null;
  const c = _pc.copy(UP).applyQuaternion(m.P.q).multiplyScalar(10 * m.P.scale).add(m.P.pos);
  let best = null, bd = PORTAL_REACH;
  for (const q of world.proteins) {
    if (q.host !== world.portal.host || !q.compatible) continue;
    const d = world.toWorld(q.host, q.local, _pq).distanceTo(c);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
const _pc = new THREE.Vector3(), _pq = new THREE.Vector3();
/** Y in the portal's area: the fibres latch on the receptor and the injection starts; on guard, turned back. */
function tryEnter() {
  const protein = portalReceptorNear(cur);
  if (!protein) return false;
  if (portalSealed()) { audio.play('shared/portal-sealed', { volume: 0.6 }); say(tt('phage.toasts.sealed'), 2400, true); return true; }
  if (guarded()) {
    const n = world.dirToWorld(protein.host, protein.normal, new THREE.Vector3());
    P.gust.addScaledVector(n, 60).addScaledVector(_v.subVectors(P.pos, world.amoeba.center).normalize(), 25);
    curPad().rumble(160, 0.4, 0.5); audio.play('shared/portal-sealed', { volume: 0.6, old: ['bacterium/tumble', { volume: 0.6, rate: 0.8 }] });
    say(tt('phage.toasts.turnedBack'), 3200, true);
    ringLog.push({ kind: 'turnedBack', t: +t.toFixed(2), slot: cur.slot });
    return true;
  }
  if (members().some((m) => m !== cur && ['grab', 'commit', 'inside', 'burst'].includes(m.P.mode) && (m.P.mode !== 'grab' || m.P.grab?.protein.compatible))) {
    say(tt('phage.toasts.teammateBusy'), 1800, true); return true;
  }
  P.foldTarget = 0; P.fold = Math.min(P.fold, 0.5);
  releaseHold(false); releaseAnchors(); P.host = null; P.canCommit = false; P.kv.set(0, 0, 0);
  P.grab = { protein, time: 0, from: P.pos.clone(), q: P.q.clone() };
  P.mode = 'grab'; P.vel.set(0, 0, 0); P.bvel.set(0, 0, 0); P.gust.set(0, 0, 0);
  ringLog.push({ kind: 'enter', t: +t.toFixed(2), slot: cur.slot });
  audio.play('shared/portal-enter', { volume: 0.8, old: ['bacterium/tumble', { volume: 0.35, rate: 1.4 }] });
  return true;
}
let nearPortal = false;
/** The shell's "Y Enter the portal" prompt: on while any player is in the area and the guard is away. */
let wasSealed;
function updatePortalPrompt(where) {
  // the way on unseals (both decoys met): heard once, on the edge
  const isSealed = portalSealed();
  if (wasSealed && !isSealed) audio.play('shared/portal-appear', { volume: 0.8 });
  wasSealed = isSealed;
  const on = where === 'outside' && !!world.portal && !portalSealed() && !guarded() && members().some((m) => portalReceptorNear(m));
  if (on !== nearPortal) { nearPortal = on; if (on) audio.play('shared/portal-near', { volume: 0.6 }); embed.near('portal', on, tt('phage.prompts.enterHostA')); }
}

// --- per-mode updates ---
const flow = new THREE.Vector3();
let t = 0;
const DRIVE = 36; // full stick, units/s (~0.36 µm/s on the slowed clock)
const _cf2 = new THREE.Vector3();
function updateDrift(dt, inp) {
  if (P.hold?.kind === 'cell') { updateHoldCell(dt, inp); return; }
  // crisp game control (a departure, the owner: "good control over the phage"): quick to speed up
  // (~0.15 s) and quick to stop (~0.2 s) in the water's drag; nothing but a visible current fights the stick
  const drive = _v.set(0, 0, 0);
  if (inp.stick && opts.drive) drive.copy(inp.stick).multiplyScalar(DRIVE * inp.stickM);
  P.vel.lerp(drive, 1 - Math.exp(-dt * (inp.stick ? 7 : 5)));
  P.idleT = inp.stick ? 0 : P.idleT + dt;
  // a current (currents.js) drags you along with its water (the water takes ~0.4 s to get you going)
  currents.flowAt(P.pos, _cf2);
  if (!opts.currents) _cf2.set(0, 0, 0);
  P.kv.lerp(_cf2, 1 - Math.exp(-dt * 2.5));
  P.gust.multiplyScalar(Math.exp(-dt * 2.6));
  // the ambient drift and a very slow thermal wander, only with the sticks let go
  const calm = Math.min(1, P.idleT / 1.2);
  world.flowAt(P.pos, t, flow).multiplyScalar(calm);
  if (opts.brownian && calm > 0) { P.bvel.multiplyScalar(Math.exp(-dt / 1.5)); const k = 1.6 * Math.sqrt(dt) * calm; P.bvel.x += gauss() * k; P.bvel.y += gauss() * k; P.bvel.z += gauss() * k; }
  else P.bvel.multiplyScalar(Math.exp(-dt * 4));
  P.pos.addScaledVector(P.vel, dt).addScaledVector(P.kv, dt).addScaledVector(P.gust, dt).addScaledVector(flow, dt).addScaledVector(P.bvel, dt);
  softBounds(dt);
  // rotation: damped by the water; a slow thermal tumble only after the sticks have been let go a while
  P.angVel.multiplyScalar(Math.exp(-dt / (inp.stick ? 0.3 : 0.7)));
  if (opts.tumble && P.idleT > 2) { const k = 0.08 * Math.sqrt(dt); P.angVel.x += gauss() * k; P.angVel.y += gauss() * k; P.angVel.z += gauss() * k; }
  const mv = _w.copy(P.vel).add(P.gust);
  const sp = mv.length();
  // close to a cell with the fibres out, they catch the water near it and swing the baseplate round to face it
  const near = world.nearestHost(centreOf(new THREE.Vector3()));
  const facing = !inp.stick && near.host && near.d < 45 && P.fold < 0.5;
  if (facing) {
    world.sdHost(near.host, P.pos, _s);
    turnBaseToward(_s.negate(), dt * (1 - near.d / 45) * 1.6);
  } else if (sp > 4) turnBaseToward(mv.normalize(), dt * Math.min(1, sp / 25) * 5.0); // steering: the fibres lead, promptly
  // readability: the body eases toward side-on to the view (weak; nothing else turns it)
  { const ax = axisOf(_n), f = camFwd(_s); const flat = _w.copy(ax).addScaledVector(f, -ax.dot(f)); if (flat.lengthSq() > 0.01) P.angVel.addScaledVector(_v.crossVectors(ax, flat.normalize()), dt * 0.5); }
  if (P.angVel.length() > 3) P.angVel.setLength(3); // a hard cap: nothing ever spins fast
  integrateRotation(dt);
  // solids
  const c = centreOf(_v);
  for (const h of world.hosts) {
    if (h.burst) continue;
    const sd = world.sdHost(h, c, _n);
    if (sd < 11) { P.pos.addScaledVector(_n, 11 - sd); const vn = P.vel.dot(_n); if (vn < 0) P.vel.addScaledVector(_n, -vn); P.gust.addScaledVector(_n, -Math.min(0, P.gust.dot(_n))); P.kv.addScaledVector(_n, -Math.min(0, P.kv.dot(_n))); }
  }
  // the bystanders (big bacteria of other kinds): solid scenery
  for (const h of world.bystanders) {
    if (Math.abs(h.pos.x - c.x) > h.half + h.r + 20 || Math.abs(h.pos.y - c.y) > h.half + h.r + 20 || Math.abs(h.pos.z - c.z) > h.half + h.r + 20) continue;
    const sd = world.sdHost(h, c, _n);
    if (sd < 11) { P.pos.addScaledVector(_n, 11 - sd); const vn = P.vel.dot(_n); if (vn < 0) P.vel.addScaledVector(_n, -vn); P.kv.addScaledVector(_n, -Math.min(0, P.kv.dot(_n))); }
  }
  const sa = world.sdAmoeba(c);
  if (sa < 12) P.pos.addScaledVector(_n.subVectors(c, world.amoeba.center).normalize(), 12 - sa);
  const sc = world.sdClay(c);
  if (sc < 9) { _n.set(0, Math.sign(c.y - world.clay.pos.y) || 1, 0); P.pos.addScaledVector(_n, 9 - sc); }
  // humic flocs: extended fibres snag in the tangle and drag you to a crawl; folded (B) you slip through
  const fl = world.sdFloc(c);
  const was = P.snag;
  P.snag = fl.d < 8 && P.fold < 0.5 ? fl.floc : null;
  if (P.snag) {
    P.snagT += dt;
    P.vel.multiplyScalar(Math.exp(-dt * 4)); P.kv.multiplyScalar(Math.exp(-dt * 4));
    P.pos.lerp(P.snag.pos, 1 - Math.exp(-dt * 0.25)); // pulled into the tangle
    if (!was) { say(tt('phage.toasts.flocSnag'), 2600, true); curPad().rumble(140, 0.3, 0.2); audio.play('phage/snag', { volume: 0.6, old: ['bacterium/tumble', { volume: 0.45, rate: 0.7 }] }); }
  } else P.snagT = 0;
  // a carried molecule rides at the baseplate, the fibres closed round it
  if (P.hold?.kind === 'mol') {
    const o = P.hold.mol, hand = handOf(_w);
    o.pos.lerp(hand, 1 - Math.exp(-dt * (P.reachT > 0 ? 14 : 20)));
    o.vel.set(0, 0, 0);
    const k = 1 - Math.max(0, P.reachT) / HOLD_REACH_T;
    for (let f = 0; f < 6; f++) { const a = (f / 6) * Math.PI * 2; const pt = o.pos.clone().add(_n.set(Math.cos(a), 0, Math.sin(a)).applyQuaternion(P.q).multiplyScalar(o.size * 1.2)); t4.fibres[f].anchor = k < 1 ? t4.tip(f).clone().lerp(pt, k) : pt; }
  }
  // fibre tips touching things
  if (P.fold < 0.4) {
    for (let f = 0; f < 6; f++) {
      const tip = t4.tip(f);
      if (world.sdClay(tip) < 1.6) { enterClay(); return; }
      // Cell contact alone never attaches: X explicitly tries the aimed protein.
    }
  }
}

/** No walls or floor: beyond the field's bounds a current carries you gently back. */
function softBounds(dt) {
  const d = _w.subVectors(P.pos, START), r = d.length();
  if (r > FIELD_R) P.pos.addScaledVector(d, -((r - FIELD_R) / r) * 1.2 * dt);
  if (r > FIELD_R + 150) P.pos.copy(START).addScaledVector(d, (FIELD_R + 150) / r); // and never far beyond
}

function integrateRotation(dt) {
  const w = P.angVel.length();
  if (w > 1e-5) { _q.setFromAxisAngle(_v.copy(P.angVel).multiplyScalar(1 / w), w * dt); P.q.premultiply(_q).normalize(); }
}

function enterWalk(host) {
  P.mode = 'walk'; P.host = host; P.lastHost = host;
  const base = world.projectToHost(host, P.pos, P.lift, new THREE.Vector3(), _n);
  world.toLocal(host, base, P.walkLocal);
  releaseAnchors();
  P.vel.set(0, 0, 0); P.gust.set(0, 0, 0);
  audio.play('bacterium/phage', { volume: 0.5, rate: 1.2 });
  curPad().rumble(80, 0.3, 0.1);
  // Attachment feedback is emitted by the successful protein grab.
}

function enterClay() {
  releaseHold(false);
  P.mode = 'clay'; P.clayT = 0;
  for (let f = 0; f < 6; f++) { const tip = t4.tip(f); if (world.sdClay(tip) < 4) { P.stuckTip[f] = tip.clone(); t4.fibres[f].anchor = P.stuckTip[f]; } }
  P.vel.set(0, 0, 0); P.gust.set(0, 0, 0);
  audio.play('phage/snag', { volume: 0.6, rate: 0.9, old: ['bacterium/tumble', { volume: 0.5, rate: 0.8 }] });
  say(tt('phage.toasts.claySnag'), 3000, true);
}

function updateClay(dt, inp) {
  P.clayT += dt;
  // wriggle a little on the stuck fibres
  const pull = _v.set(0, 0, 0);
  if (inp.stick) pull.copy(inp.stick).multiplyScalar(4);
  P.bvel.multiplyScalar(Math.exp(-dt / 0.5));
  if (opts.brownian) { P.bvel.x += gauss() * 3 * Math.sqrt(dt); P.bvel.y += gauss() * 3 * Math.sqrt(dt); }
  P.pos.addScaledVector(pull.add(P.bvel), dt);
  let n = 0; const mid = _w.set(0, 0, 0);
  for (const a of P.stuckTip) if (a) { mid.add(a); n++; }
  if (n) { mid.multiplyScalar(1 / n); _n.subVectors(P.pos, mid); if (_n.length() > 13) P.pos.copy(mid).addScaledVector(_n.normalize(), 13); }
  P.angVel.multiplyScalar(Math.exp(-dt * 2));
  if (opts.tumble) { P.angVel.x += gauss() * 0.2 * Math.sqrt(dt); P.angVel.z += gauss() * 0.2 * Math.sqrt(dt); }
  integrateRotation(dt);
  if (P.foldTarget > 0.5) leaveClay();
}
function leaveClay() {
  P.mode = 'drift'; P.stuckTip.fill(null);
  for (const f of t4.fibres) f.anchor = null;
  P.gust.set(0, -16, 0);
  say(tt('phage.toasts.clayFolded'), 1600, true);
}

function updateWalk(dt, inp) {
  const h = P.host;
  const base = world.toWorld(h, P.walkLocal, new THREE.Vector3());
  world.sdHost(h, base, _n);
  const normal = _n.clone();
  // stepping: one fibre at a time re-plants as the body moves on
  let planted = 0;
  for (let f = 0; f < 6; f++) if (P.anchors[f]) planted++;
  const tangent = _v.set(0, 0, 0);
  if (inp.stick) tangent.copy(inp.stick).addScaledVector(normal, -inp.stick.dot(normal));
  const speed = 11 * inp.stickM * (0.35 + 0.65 * planted / 6) * (P.stepping >= 0 ? 1.25 : 0.8);
  // reversible binding: a slow random walk on the surface even with the stick released [S99]
  if (opts.brownian) { P.bvel.multiplyScalar(Math.exp(-dt / 0.8)); P.bvel.x += gauss() * 2.4 * Math.sqrt(dt); P.bvel.y += gauss() * 2.4 * Math.sqrt(dt); P.bvel.z += gauss() * 1.2 * Math.sqrt(dt); }
  const tb = _w.copy(P.bvel).addScaledVector(normal, -P.bvel.dot(normal));
  const bob = Math.sin(t * 5.5) * 0.4 * (P.stepping >= 0 ? 1 : 0.3);
  base.addScaledVector(tangent.normalize(), speed * dt).addScaledVector(tb, dt);
  world.projectToHost(h, base, P.lift + bob, base, _n);
  world.toLocal(h, base, P.walkLocal);
  P.pos.copy(base);
  // stand on the fibres: the axis follows the surface normal, rocking
  const rock = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(t * 0.8) * 0.12, 0, Math.sin(t * 0.63 + 1) * 0.12));
  const target = new THREE.Quaternion().setFromUnitVectors(UP, _n).multiply(rock);
  if (inp.stick) target.premultiply(new THREE.Quaternion().setFromUnitVectors(_n, _w.copy(_n).addScaledVector(inp.stick, 0.25).normalize()));
  P.q.slerp(target, 1 - Math.exp(-dt * 2.4));
  t4.group.position.copy(P.pos); t4.group.quaternion.copy(P.q); t4.group.updateMatrixWorld(true);
  // feet
  P.stepT -= dt;
  const ideal = new THREE.Vector3(), nn = new THREE.Vector3();
  let worst = -1, worstD = 4.5;
  for (let f = 0; f < 6; f++) {
    t4.footTarget(f, t, ideal);
    world.projectToHost(h, ideal, 0.4, ideal, nn);
    if (!P.anchors[f]) {
      if (P.stepping !== f || P.stepT <= 0) { P.anchors[f] = world.toLocal(h, ideal, new THREE.Vector3()); if (P.stepping === f) P.stepping = -1; }
      continue;
    }
    const aw = world.toWorld(h, P.anchors[f], _v);
    const d = aw.distanceTo(ideal);
    if (d > worstD) { worstD = d; worst = f; }
    if (d > 13) P.anchors[f] = null; // overstretched: lets go
  }
  if (P.stepping < 0 && worst >= 0) { P.stepping = worst; P.anchors[worst] = null; P.stepT = 0.32; audio.play('bacterium/tumble', { volume: 0.12, rate: 1.6 }); }
  // bound fibres on a receptor patch
  let bound = 0;
  for (let f = 0; f < 6; f++) {
    const fb = t4.fibres[f];
    if (P.anchors[f]) { fb.anchor = fb.anchor || new THREE.Vector3(); world.toWorld(h, P.anchors[f], fb.anchor); if (world.patchAt(h, fb.anchor)) bound++; }
    else if (P.stepping === f) { fb.anchor = null; }
    else fb.anchor = null;
  }
  const was = P.canCommit;
  P.bound = bound; P.canCommit = bound >= 3;
  if (P.canCommit && !was) { say(tt('phage.toasts.fibresBound', { n: bound }), 2600, true); curPad().rumble(60, 0.2, 0); }
}

function leaveSurface(push) {
  const h = P.host;
  if (!h) return;
  const base = world.toWorld(h, P.walkLocal, new THREE.Vector3());
  world.sdHost(h, base, _n);
  P.mode = 'drift'; P.host = null; P.canCommit = false;
  releaseAnchors();
  P.gust.copy(_n).multiplyScalar(push ? 60 : 20);
  if (push && P.lastStick) P.gust.addScaledVector(P.lastStick, 25);
  P.angVel.set(gauss(), gauss(), gauss()).multiplyScalar(0.3);
}

// --- multiplicity reactivation (micro/design/combat-ideas.md, phage idea 1) ---
// UV does not kill outright: touching a UV shaft leaves a phage DAMAGED at once
// (its DNA broken: it dims, cracks, its glow fades; no slow drain). A damaged phage still binds and
// injects, but its genome cannot work alone: it waits on the host (mode
// 'coinfect'). If a teammate co-infects that host, the two genomes recombine
// into a working one (real for T-even phages: Luria 1947 [C26]) and the
// damaged player is whole again. Solo, a stray UV-damaged phage drifts in near
// you once you are damaged (out of view, ~1.7 µm off): drift up to it and it
// pairs with you, co-infecting whichever host you inject. A second shaft while
// damaged is fatal.
const COINFECT_WAIT = { solo: 5, multi: 45 };
const stray = { t4: createT4({ clip: false }), pos: new THREE.Vector3(), home: new THREE.Vector3(), vel: new THREE.Vector3(), q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.6),
  paired: null, used: false, contract: 0, host: null, local: new THREE.Vector3(), log: [] };
stray.t4.addTo(scene);
stray.t4.set({ capsid: 'translucent', dark: 0.75, crack: 0.45, dna: 0.85 });
function resetStray() {
  stray.pos.set(0, -9000, 0); stray.home.copy(stray.pos); stray.vel.set(0, 0, 0); stray.paired = null; stray.used = false; stray.contract = 0; stray.host = null; stray.shown = false;
  stray.t4.group.visible = stray.t4.fibreMesh.visible = false; stray.t4.set({ contract: 0, star: 0, shortOut: 0 });
  stray.t4.group.position.copy(stray.pos); stray.t4.group.quaternion.copy(stray.q); stray.t4.resetFibres(t);
}
function damage() {
  P.damaged = true; P.wreck = 0; P.integrity = 0; P.crack = Math.max(P.crack, 0.35);
  // the stray drifts in (once): beside you but out of view, across the view from the camera
  if (!stray.shown && !stray.used) {
    stray.shown = true;
    stray.home.copy(P.pos).addScaledVector(camRight(_v), -170).addScaledVector(camUp(_w), 30);
    if (uvAt(stray.home).k > 0) stray.home.addScaledVector(camRight(_v), 340);
    stray.pos.copy(stray.home); stray.t4.group.visible = stray.t4.fibreMesh.visible = true;
    stray.t4.group.position.copy(stray.pos); stray.t4.resetFibres(t);
  }
  curPad().rumble(300, 0.5, 0.6); audio.play('bacterium/eat', { volume: 0.6, rate: 1.3 });
  say(isMulti() ? tt('phage.toasts.damagedTeam')
    : tt('phage.toasts.damagedStray'), 5200, true);
  stray.log.push(`P${cur.slot + 1} damaged at t=${t.toFixed(1)}`);
}
function updateStray(dt) {
  const s = stray;
  if (s.used) return;
  const m = s.paired;
  if (m && !team[m.slot]) s.paired = null;
  if (!s.paired) {
    // a damaged phage that comes close pairs with it
    for (const o of members()) if (o.P.damaged && o.P.mode === 'drift' && o.P.pos.distanceTo(s.pos) < 70) {
      s.paired = o; s.log.push(`stray paired with P${o.slot + 1} at t=${t.toFixed(1)}`);
      if (o === team[0] || isMulti()) say(tt('phage.toasts.strayPaired'), 3600, true);
      break;
    }
  }
  if (s.host) {
    // co-infecting beside its partner: down onto the host, then the sheath snaps
    const at = world.toWorld(s.host, s.local, _w);
    s.pos.lerp(at, 1 - Math.exp(-dt * 4));
    const n = world.dirToWorld(s.host, _n.copy(s.local).setX(0).normalize(), new THREE.Vector3());
    s.q.slerp(_q.setFromUnitVectors(UP, n), 1 - Math.exp(-dt * 4));
    s.contract = Math.min(1, s.contract + dt * 0.8);
  } else if (s.paired) {
    const o = s.paired.P;
    _v.copy(o.pos).add(_w.set(Math.sin(t * 0.7) * 10 - 22, 18 + Math.cos(t * 0.5) * 6, 0)).sub(s.pos);
    s.vel.lerp(_v.multiplyScalar(1.6), 1 - Math.exp(-dt * 2));
    s.pos.addScaledVector(s.vel, dt);
    if (o.mode === 'commit' && o.commitHost) {
      // its partner commits: it lands beside it on the same host
      const h = o.commitHost;
      s.host = h;
      s.local.copy(world.toLocal(h, world.projectToHost(h, _v.copy(o.pos).add(_w.set(-18, 6, 6)), 4)));
    }
    if (!['drift', 'grab', 'walk', 'commit', 'coinfect', 'clay'].includes(o.mode)) s.paired = null;
  } else {
    // drifting near where it appeared
    s.vel.multiplyScalar(Math.exp(-dt * 1.5));
    if (!s.shown) return;
    s.vel.x += gauss() * 6 * Math.sqrt(dt) + (s.home.x - s.pos.x) * 0.2 * dt;
    s.vel.y += gauss() * 6 * Math.sqrt(dt) + (s.home.y - s.pos.y) * 0.2 * dt;
    s.vel.z += gauss() * 6 * Math.sqrt(dt) + (s.home.z - s.pos.z) * 0.2 * dt;
    s.pos.addScaledVector(s.vel, dt);
    _q.setFromAxisAngle(_v.set(0.3, 0.2, 1).normalize(), Math.sin(t * 0.3) * 0.002); s.q.premultiply(_q);
  }
  const k = s.contract;
  s.t4.set({ contract: k, star: k, shortOut: k, fold: 0 });
  s.t4.group.position.copy(s.pos); s.t4.group.quaternion.copy(s.q);
  s.t4.state.sway = s.host ? 0.4 : 1;
  s.t4.update(dt, t);
}
/** A member whose damaged genome is waiting in host h, other than `not`. */
const waitingOn = (h, not) => members().filter((o) => o !== not && o.P.mode === 'coinfect' && o.P.coHost === h);
/** Recombination: make member o whole again (beside its host, drifting), keeping `cur`. */
function reviveBeside(o, h) {
  const was = cur;
  const at = world.toWorld(h, o.P.walkLocal, new THREE.Vector3());
  const n = world.dirToWorld(h, _n.copy(o.P.walkLocal).setX(0).normalize(), new THREE.Vector3());
  at.addScaledVector(n, 34);
  respawning = true;
  try { placeAtStart(o, at); } finally { respawning = false; }
  o.P.fade = 0;
  stray.log.push(`P${o.slot + 1} revived (whole) by multiplicity reactivation at t=${t.toFixed(1)}`);
  use(was);
}
function updateCoinfect(dt) {
  // the empty, contracted shell stays on the host; its damaged genome waits inside for a partner
  P.coT += dt;
  const h = P.coHost;
  const base = world.toWorld(h, P.walkLocal, new THREE.Vector3());
  world.projectToHost(h, base, P.lift, base, _n);
  P.pos.copy(base);
  for (let f = 0; f < 6; f++) if (P.anchors[f]) world.toWorld(h, P.anchors[f], t4.fibres[f].anchor || (t4.fibres[f].anchor = new THREE.Vector3()));
  P.fade = 0;
  const limit = isMulti() ? COINFECT_WAIT.multi : COINFECT_WAIT.solo;
  if (P.coT > limit) {
    P.coHost = null; h.locked = false;
    startCapture('dud', tt('phage.capture.dud.by'), tt('phage.capture.dud.how'));
  } else if (P.msgT <= 0 && isMulti()) { say(tt('phage.toasts.genomeWaits', { n: cur.slot + 1, host: h.name, s: Math.ceil(limit - P.coT) }), 2200); P.msgT = 6; }
}

const COMMIT_T = 3.6;
function updateCommit(dt) {
  P.commitT += dt;
  const c = P.commitT, h = P.commitHost;
  P.shortOut = ramp(c, 0, 0.7);
  P.star = ramp(c, 0.5, 1.2);
  // the sheath snaps down with a little organic overshoot
  const k = ramp(c, 1.25, 1.75);
  P.contract = k < 1 ? k * k * (3 - 2 * k) : 1 + Math.sin((c - 1.75) * 18) * 0.05 * Math.exp(-(c - 1.75) * 5);
  P.dna = 1 - ramp(c, 2.1, COMMIT_T) * 0.35;
  P.lift = 4 - ramp(c, 0.3, 1.2) * 3;
  if (k > 0 && k < 1 && !P.snapped) { P.snapped = true; curPad().rumble(200, 0.7, 0.8); audio.play('phage/sheath', { volume: 0.9, old: ['bacterium/eat', { volume: 0.8, rate: 0.8 }] }); }
  // the DNA slides in once the sheath has snapped (the genome's ramp)
  if (P.snapped && !P.injected && c >= 2.1) { P.injected = true; audio.play('phage/inject', { volume: 0.7 }); }
  const base = world.toWorld(h, P.walkLocal, new THREE.Vector3());
  world.projectToHost(h, base, P.lift, base, _n);
  P.pos.copy(base);
  P.q.slerp(new THREE.Quaternion().setFromUnitVectors(UP, _n), 1 - Math.exp(-dt * 4));
  for (let f = 0; f < 6; f++) if (P.anchors[f]) world.toWorld(h, P.anchors[f], t4.fibres[f].anchor || (t4.fibres[f].anchor = new THREE.Vector3()));
  if (c > 2.4) P.fade = ramp(c, 2.6, COMMIT_T);
  if (c >= COMMIT_T) {
    P.snapped = false;
    const partners = waitingOn(h, cur);
    const strayJoins = stray.paired === cur && stray.host === h && !stray.used;
    if (P.damaged && !partners.length && !strayJoins) {
      // a damaged genome alone cannot work: wait in the host for a partner
      P.mode = 'coinfect'; P.coHost = h; P.coT = 0; P.fade = 0; h.locked = false;
      stray.log.push(`P${cur.slot + 1} damaged and alone in ${h.name}: waiting (t=${t.toFixed(1)})`);
      say(isMulti() ? tt('phage.toasts.genomeAloneTeam')
        : tt('phage.toasts.genomeAlone'), 4000, true);
      return;
    }
    if (strayJoins) { stray.used = true; stray.t4.group.visible = stray.t4.fibreMesh.visible = false; }
    for (const o of partners) reviveBeside(o, h);
    if (P.damaged) {
      P.damaged = false; P.integrity = 1; P.dark = 0; P.crack = 0; P.wreck = 0;
      stray.log.push(`P${cur.slot + 1} revived inside ${h.name} by multiplicity reactivation with ${strayJoins ? 'the stray' : 'P' + (partners[0].slot + 1)} (t=${t.toFixed(1)})`);
    }
    if (partners.length || strayJoins) say(partners.length ? tt('phage.toasts.reactivatedPlayers', { players: partners.map((o) => tt('shared.hud.playerShort', { n: o.slot + 1 })).join(', ') }) : tt('phage.toasts.reactivated'), 3600, true);
    P.mode = 'inside';
    inside.start(h);
    inside.setRadar(view.overlay);
    say(h.crispr ? tt('phage.toasts.insideHostB') : tt('phage.toasts.insideHost'), 4200, true);
  }
}

function updateBurst(dt) {
  P.burstT += dt;
  const b = P.burstT;
  if (b < 2.6) {
    inside.hideHostDna(ramp(b, 0.3, 0.6));
    P.fade = ramp(b, 1.6, 2.6);
    return 'inside';
  }
  if (!P.burstStarted) {
    P.burstStarted = true;
    const h = P.commitHost;
    h.burst = true; h.group.visible = false;
    P.progeny = [];
    for (let i = 0; i < 40; i++) {
      const dir = new THREE.Vector3(gauss(), gauss(), gauss() * 0.4).normalize();
      const p = world.toWorld(h, new THREE.Vector3(rand(-h.half, h.half), 0, 0)).addScaledVector(dir, rand(0, h.r * 0.8));
      P.progeny.push({ p, v: dir.multiplyScalar(rand(40, 90)), q: new THREE.Quaternion().random(), w: new THREE.Vector3(gauss(), gauss(), gauss()) });
    }
    progeny.setCount(40);
    P.pos.copy(h.pos).add(new THREE.Vector3(0, h.r + 40, 0));
    view.target.copy(h.pos);
    audio.play('phage/burst', { volume: 1, old: ['bacterium/graze', { volume: 0.8, rate: 1.3 }] });
    curPad().rumble(500, 0.8, 0.8);
  }
  P.fade = 1 - ramp(b, 2.6, 3.4);
  for (let i = 0; i < P.progeny.length; i++) {
    const g = P.progeny[i];
    g.v.multiplyScalar(Math.exp(-dt * 0.9)); g.v.x += gauss() * 8 * Math.sqrt(dt); g.v.y += gauss() * 8 * Math.sqrt(dt);
    g.p.addScaledVector(g.v, dt);
    _q.setFromAxisAngle(_v.copy(g.w).normalize(), dt * 0.8); g.q.multiply(_q);
    _m.compose(g.p, g.q, _s.setScalar(1)); progeny.setMatrixAt(i, _m);
  }
  progeny.instanceMatrix.needsUpdate = true;
  return 'outside';
}

// --- the encounters, placed as you go (micro/design/encounter-pattern.md "Placed as you go") ---
// The director (shared/director.js) places them one at a time, in order (world.js encounterSpecs): Host B
// (its matching CRISPR spacer, the clay beside it), the wrong host, then the way on, Host A's gold receptor
// under the shared golden glow with the amoeba on guard. Each goes in water nobody has seen (a 3D grid of
// what every split view has framed), a little ahead of whoever leads, out of every view, after a calm
// break; linger and they come round you all the same (a decoy then swims over to you). Nothing anyone
// has seen is placed, moved or removed. The flocs and the UV shafts are scenery, there from the start.
const ringLog = []; // the director's placements and what else happened on the way (tests and tuning)
const portalGlow = createPortalGlow({ THREE, scene, size: 18, intensity: 1.9, beam: 110, beamWidth: 9 });
// no arrow (the owner: keep moving and you find it): once placed, the way on's golden light spills in from the
// edge of each view on its side (or haloes it in view); no text
const portalLight = createPortalLight({ zIndex: 3 });
portalGlow.group.visible = false;
const guard = { gone: false, turned: false, hinted: false };
const _gp = new THREE.Vector3(), _gn = new THREE.Vector3();
/** The way on: the gold receptor's tip on Host A (and its outward normal), world. */
function portalPoint(out = _gp) { const pt = world.portal; return world.toWorld(pt.host, pt.protein.local, out); }
function portalNormal(out = _gn) { const pt = world.portal; return world.dirToWorld(pt.host, pt.protein.normal, out); }
/** Is the amoeba on guard (its lobe over the receptor, not driven off)? Before the portal exists: yes. */
function guarded() {
  if (!world.portal) return true;
  if (guard.gone || !opts.amoeba) return false;
  const am = world.amoeba;
  return am.reach > 2 && am.tip.distanceTo(portalPoint()) < 55;
}
const outsideMembers = () => members().filter((m) => !m.c.active && ['drift', 'walk', 'clay', 'grab'].includes(m.P.mode));
const hostById = (id) => world.hosts.find((h) => h.id === id);
// The leader's position, kept up to date for the encounters' shapes (each is laid out from the way it is met).
const leadPos = new THREE.Vector3();
const _dir = new THREE.Vector3(), _sp = new THREE.Vector3();
const metDecoy = (h) => (x, [p]) => {
  const m = team[p.id];
  return !!m && (m.P.host === h || m.P.coHost === h || world.sdHost(h, _sp.set(p.x, p.y, p.z)) < 70);
};
const placeDecoy = (h) => (x, z, b, info) => {
  _sp.set(x, info.y, z); _dir.subVectors(_sp, leadPos); if (_dir.lengthSq() < 1e-6) _dir.set(1, 0, 0);
  world.placeHost(h, _sp, _dir.normalize());
  return h;
};
const ENC = {
  B: { place: placeDecoy(hostById('B')), met: metDecoy(hostById('B')) },
  W: { place: placeDecoy(hostById('W')), met: metDecoy(hostById('W')) },
  portal: { place: (x, z, b, info) => { _sp.set(x, info.y, z); _dir.subVectors(_sp, leadPos); if (_dir.lengthSq() < 1e-6) _dir.set(1, 0, 0); return placePortal(_sp, _dir.normalize()); }, met: () => false },
};
// The default path (world.js DEFAULT_PATH): the three are pre-placed out across the view on the first frame, so
// the way on exists from the start (sealed until both decoys are met: portalSealed); head off another way and
// each, while nobody has seen it, leaves the path and is placed ahead of you as before (one host each: single).
const director = createDirector({ ...DIRECTOR, canPlace, defaultPath: DEFAULT_PATH, entries: encounterSpecs(leadPos).map((e) => ({ ...e, ...ENC[e.id], single: true })) });
const PORTAL_INDEX = encounterSpecs(leadPos).findIndex((e) => e.final);
/** The way on exists from the start but stays shut until both decoys are met (the director's order). */
const portalSealed = () => director.index < PORTAL_INDEX;
// What every view sees, for the director: each split view's frustum (its far plane brought in to 700 units
// past what it frames: beyond that the haze leaves only a faint ghost) and its focus. Filled while drawing.
const viewPool = [0, 1, 2, 3].map(() => ({ frustum: new THREE.Frustum(), focus: new THREE.Vector3() }));
const _pm = new THREE.Matrix4(), _cf = new THREE.Vector3();
let seenViews = [], seenN = 0, markTick = 0;
function noteView() {
  if (seenN >= 4) return;
  const v = viewPool[seenN++];
  camera.updateMatrixWorld();
  v.frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  camera.getWorldDirection(_cf);
  v.focus.copy(camera.position).addScaledVector(_cf, view.dist);
  const far = view.dist + DIRECTOR.seenDist;
  v.frustum.planes[4].normal.copy(_cf).negate(); v.frustum.planes[4].constant = _cf.dot(camera.position) + far;
  seenViews = viewPool.slice(0, seenN);
}
/**
 * A decoy placed beyond a lingering player's reach swims over to them (behaviour, not a placement: host
 * bacteria swim; here a slow drift of DRIFT units/s after DRIFT_WAIT s of the leader staying put).
 */
const DRIFT = 12, DRIFT_WAIT = 4;
const drift = { idle: 0 };
function stepDirector(dt) {
  const out = outsideMembers();
  const ps = members().map((m) => ({ id: m.slot, x: m.P.pos.x, y: m.P.pos.y, z: m.P.pos.z, alive: out.includes(m) }));
  const L = director.leader, lm = (L && team[L.id]) || out[0] || team[0];
  if (lm) leadPos.copy(lm.P.pos);
  // (what the views see is marked every third frame: a 3D grid walk is the director's one real cost here)
  const mark = seenViews.length && (++markTick % 3 === 0 || !director.state().seenCells);
  const ev = director.update(dt, ps, mark ? seenViews : null);
  seenN = 0;
  for (const e of ev) ringLog.push({ kind: e.type, id: e.id, t: +t.toFixed(2), how: e.how, at: [e.x, e.z] });
  // the lingering leader's decoy comes over
  const L2 = director.leader;
  drift.idle = L2 && !L2.moving ? drift.idle + dt : 0;
  const s = director.state(), cur = s.entries[s.index];
  if (!cur || cur.id === 'portal' || cur.state !== 'placed' || drift.idle < DRIFT_WAIT || s.t - cur.placedT < DRIFT_WAIT || !lm) return;
  const h = hostById(cur.id);
  if (h.burst || h.locked) return;
  const d = world.sdHost(h, lm.P.pos);
  if (d < 60) return;
  _dir.subVectors(lm.P.pos, h.pos).setLength(Math.min(d - 59, DRIFT * dt));
  world.shiftHost(h, _dir);
}
/** Place the way on: Host A at `pos`, met along `dir`, the amoeba on guard (the director's last encounter). */
function placePortal(pos, dir) {
  const pt = world.placePortal(pos, dir);
  ringLog.push({ kind: 'portal', t: +t.toFixed(2), at: pos.toArray().map((x) => +x.toFixed(0)), dir: dir.toArray().map((x) => +x.toFixed(2)) });
  const am = world.amoeba;
  const post = portalPoint().clone().addScaledVector(portalNormal(), 10);
  am.base.subVectors(post, am.center).normalize().multiplyScalar(am.r - 6).add(am.center);
  am.tip.copy(post); am.reach = am.tip.distanceTo(am.base);
  guard.gone = false; guard.turned = false;
  portalGlow.group.visible = true;
  return pt;
}
/** Each frame: the glow sits on the receptor, facing out, open when the guard is off it. */
function updatePortalGlow(dt) {
  if (!world.portal) return;
  const p = portalPoint(), n = portalNormal();
  portalGlow.setPosition(p.x, p.y, p.z);
  portalGlow.group.quaternion.setFromUnitVectors(UP, n);
  portalGlow.setOpen(!guarded() && !portalSealed());
  portalGlow.update(dt, t, camera);
}

// --- the boss outside: the amoeba on guard (shared createFight) ---
// Its lobe hovers over the receptor. Whoever comes within WAKE of it, it reaches for (stalk), rears and
// curls the lobe (the wind-up, 1.1 s: swollen, flushed rose, lips wide), then lunges (strike). Fold your
// fibres (B) and the strike slips (blocked); a fibre jab (X) makes it recoil; facing it wears its interest
// down. Interest at zero: it draws the lobe back for good and the way is open. It follows only out to
// LEASH from its post and is slower than a drifting phage, so you can also lure it out and slip round.
const fight = createFight({ windup: 1.1, strike: 0.4, recoverT: 1.0, repelT: 1.2, retreatT: 6 });
let fightState = 'guard';
const REACH = 34, WAKE = 170, LEASH = 260;
/** The lobe's tip and whether `m` can jab it now. */
function lobeNear(m) {
  const am = world.amoeba;
  if (!(am.reach > 2) || !opts.amoeba || !world.portal) return false;
  const c = m.t4.headWorld(new THREE.Vector3()).lerp(m.P.pos, 0.6);
  return c.distanceTo(am.tip) < REACH + 14;
}
function tryJab(m) {
  if (!lobeNear(m) || m.jab > 0) return false;
  m.jab = 0.45;
  const am = world.amoeba;
  const away = _v.subVectors(m.P.pos, am.tip).normalize();
  m.P.gust.addScaledVector(away, 45); // the kick also pushes you off it
  am.tip.addScaledVector(away, -28);   // and the lobe recoils
  const gone = fight.bitten();
  audio.play('phage/jab', { volume: 0.7, old: ['bacterium/sprint', { volume: 0.7, rate: 1.4 }] });
  curPad().rumble(140, 0.5, 0.4);
  say(gone ? tt('phage.toasts.jabGone') : tt('phage.toasts.jab'), 2000, true);
  return true;
}
function updateGuard(dt) {
  const am = world.amoeba;
  if (!world.portal) return;
  const post = portalPoint(new THREE.Vector3()).addScaledVector(portalNormal(), 10);
  am.base.subVectors(post, am.center).normalize().multiplyScalar(am.r - 6).add(am.center);
  if (guard.gone || !opts.amoeba) {
    // driven off (or switched off): the lobe draws back in
    am.reach = Math.max(0, am.reach - 40 * dt);
    if (am.reach > 0) am.tip.copy(am.base).addScaledVector(_w.subVectors(am.tip, am.base).normalize(), am.reach);
    am.posture(0); world.drawPod(am.reach, am.base, am.tip, 0.2, am.reach > 1);
    fightState = guard.gone ? 'gone' : 'off';
    return;
  }
  // the nearest phage to its post, within its leash
  const prey = outsideMembers().filter((m) => m.P.mode !== 'grab').map((m) => { use(m); return { m, c: centreOf(new THREE.Vector3()) }; })
    .map((o) => ({ ...o, d: o.c.distanceTo(post) })).filter((o) => o.d < (fightState === 'guard' ? WAKE : LEASH)).sort((a, b) => a.d - b.d)[0];
  if (!prey) {
    // back to its post, slower than you drift
    if (fightState !== 'guard') { fight.reset(); fightState = 'guard'; }
    const back = _w.subVectors(post, am.tip); const d = back.length();
    if (d > 0.5) am.tip.addScaledVector(back.normalize(), Math.min(d, 18 * dt));
    am.tip.x += Math.sin(t * 1.7) * 0.15; am.tip.y += Math.cos(t * 1.3) * 0.15;
    am.reach = am.tip.distanceTo(am.base);
    am.posture(0); world.drawPod(am.reach, am.base, am.tip, 0.4);
    return;
  }
  use(prey.m);
  const c = prey.c;
  if (fightState === 'guard') { fightState = 'stalk'; if (P.msgT <= 0) { say(tt('phage.toasts.amoebaReaches'), 3600, true); P.msgT = 4; } }
  const toward = _w.subVectors(c, am.tip);
  const d = toward.length();
  toward.normalize();
  const dirTo = new THREE.Vector3().subVectors(am.tip, P.pos).normalize();
  const base = axisOf(new THREE.Vector3()).negate();
  const facing = base.dot(dirTo) > 0.35 || (P.lastStickT > 0 && P.lastStick && P.lastStick.dot(dirTo) > 0.5);
  const blocking = P.foldTarget > 0.5;
  const f = fight.update(dt, { near: d < 140, inReach: d < REACH, facing: facing || (blocking && d < REACH), blocking });
  if (f.state === 'windup' && fightState !== 'windup') audio.play('phage/lobe', { volume: 0.8 }); // the lobe rears and lunges
  fightState = f.state;
  let open = 0.4, posture = 0, standoff = 26, sp = 15 + Math.sin(t * 2.1) * 4;
  if (f.state === 'stalk') { standoff = 22; }
  else if (f.state === 'windup') {
    standoff = 30; sp = 6; open = 1 + 0.6 * f.t + Math.sin(t * 18) * 0.08; posture = Math.min(1, f.t * 1.5);
    const side = new THREE.Vector3().crossVectors(toward, camFwd(_s)).normalize();
    am.tip.addScaledVector(side, Math.sin(f.t * Math.PI) * 10 * dt);
  } else if (f.state === 'strike') { standoff = 0; sp = 160; open = 1.6 - f.t * 1.6; posture = 1; }
  else if (f.state === 'recover') { standoff = 46; sp = 25; open = 0.3; }
  else if (f.state === 'repelled') { standoff = 80; sp = 70; open = 0; posture = 0; }
  if (f.blocked) { P.gust.addScaledVector(toward, 40); curPad().rumble(160, 0.4, 0.6); audio.play('shared/block', { volume: 0.7, old: ['bacterium/tumble', { volume: 0.6, rate: 0.8 }] }); say(tt('phage.toasts.lobeSlides'), 1800, true); }
  if (f.retreated) { guard.gone = true; audio.play('shared/foe-flees', { volume: 0.7 }); say(tt('phage.toasts.amoebaGone'), 3200, true); ringLog.push({ kind: 'guardGone', t: +t.toFixed(2) }); }
  const goal = d - standoff;
  am.tip.addScaledVector(toward, Math.sign(goal) * Math.min(Math.abs(goal), sp * dt));
  // never further than its leash from its post
  const off = _w.subVectors(am.tip, post);
  if (off.length() > LEASH * 0.8) am.tip.copy(post).addScaledVector(off.normalize(), LEASH * 0.8);
  am.reach = am.tip.distanceTo(am.base);
  am.posture(posture);
  world.drawPod(am.reach, am.base, am.tip, open);
  if (f.hit) startCapture('amoeba', tt('phage.capture.amoeba.by'), tt('phage.capture.amoeba.how'));
  if (f.state === 'windup' && f.t < 0.15 && P.msgT <= 0) { say(tt('phage.toasts.lobeRears'), 2400, true); P.msgT = 3; }
}

// --- overlay labels ---
const labelEls = new Map();
function placeLabel(id, pos3, html, cam) {
  let el = labelEls.get(id);
  if (!el) { el = document.createElement('div'); el.className = 'ph-data'; labels.appendChild(el); labelEls.set(id, el); }
  _v.copy(pos3).project(cam);
  const vis = _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1;
  el.style.display = vis ? 'block' : 'none';
  if (!vis) return;
  el.style.left = `${(_v.x * 0.5 + 0.5) * innerWidth}px`; el.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight}px`;
  if (el._h !== html) { el.innerHTML = html; el._h = html; }
}
function hideLabels() { for (const el of labelEls.values()) el.style.display = 'none'; }
function updateOverlay(where) {
  labels.style.display = view.overlay ? 'block' : 'none';
  tag.classList.toggle('show', view.overlay);
  for (const h of world.hosts) for (const r of h.rings) r.visible = view.overlay && where === 'outside';
  if (!view.overlay) return;
  hideLabels();
  if (where === 'outside') {
    for (const h of world.hosts) {
      if (h.burst || h.hidden) { const el = labelEls.get(h.id); if (el) el.style.display = 'none'; continue; }
      placeLabel(h.id, _w.copy(h.pos).add(new THREE.Vector3(0, h.r + 16, 0)),
        tt('phage.info.host', { name: h.name, receptors: h.receptors, defence: h.defence, odds: Math.round(h.odds * 100) }), camera);
    }
    { const near = UV_SHAFTS.reduce((a2, sh) => (sh.c.distanceTo(view.target) < a2.c.distanceTo(view.target) ? sh : a2));
      placeLabel('uv', near.b, tt('phage.info.uv'), camera); }
    if (world.portal) placeLabel('am', world.amoeba.center.clone().addScaledVector(camUp(_s), world.amoeba.r * 0.7), tt('phage.info.amoeba', { state: tt(guard.gone ? 'phage.info.amoebaGone' : guarded() ? 'phage.info.amoebaGuard' : 'phage.info.amoebaLured'), um: (LEASH / 100).toFixed(1) }), camera);
    // encounter odds (illustrative): diffusion-limited k = 4πRD, here for this field
    const d = world.nearestHost(P.pos);
    placeLabel('enc', _w.copy(P.pos).add(new THREE.Vector3(0, -12, 0)), tt('phage.info.encounter', { d: (Math.max(0, d.d) / 100).toFixed(2), s: Math.max(0.01, (Math.max(0, d.d) / 100) ** 2 / (6 * 4)).toFixed(2) }), camera);
  } else {
    inside.updateRadar();
    for (const e of inside.enzymes) placeLabel('e' + inside.enzymes.indexOf(e), _w.copy(e.pos).add(new THREE.Vector3(0, 14, 0)), tt('phage.info.enzyme', { label: e.label, nm: Math.round(e.detect) }), inside.camera);
  }
}

// --- frame ---
const debug = { freeze: false, iso: false, camOverride: null };
// Two to four players share one view, zoomed out up to this far (the camera
// 1.8x as far back) before the screen splits; split views settle at 0.75 of it.
const SPLIT_ZOOM_MAX = 1.8;
let groupZoom = 1;
const split = createSplitScreen(renderer, { capture: true, up: null, zoomMax: SPLIT_ZOOM_MAX });
const marks = createLandmarks();
/**
 * The "Portal arrow" setting (the game's Settings, default off; ?arrow=1 here): an arrow at the edge of each
 * view toward the way on (Host A's gold receptor; the director's portals(): one here, each host being one
 * object), with the view's nearest phage's distance in µm. Shown while the way on is still sealed too: it is
 * where the way on will open. The arrow follows landmark.js's projection, flipped when it is behind the camera.
 */
let arrowLog = [];
function drawPortalArrow() {
  arrowLog = [];
  if (!portalArrowOn() || !world.portal) return;
  const pp = portalPoint().clone();
  arrowLog = marks.drawSplit(split, (vp) => {
    let d = Infinity;
    for (const v of vp) { const m = team[v.slot]; if (m) d = Math.min(d, m.P.pos.distanceTo(pp)); }
    if (!isFinite(d)) d = P.pos.distanceTo(pp);
    return { position: pp, label: `${(d / 100).toFixed(1)} µm`, distance: d };
  }, { kind: 'forward', portal: true, range: 2000 }).map((r) => r && { x: r.x, y: r.y, angle: r.angle, onScreen: r.onScreen, d: +r.picked.distance.toFixed(1), label: r.picked.label, at: pp.toArray().map((x) => +x.toFixed(1)) });
}
let last = performance.now();
let blocked = false;
let nearBack = false;
const ZERO_LS = { x: 0, y: 0, m: 0 }, ZERO_LOOK = { yaw: 0, pitch: 0, m: 0 };
const outsideModes = ['drift', 'walk', 'clay'];

// --- free molecules to grab (grab.js): a few dozen bigger molecules drifting round the players ---
// (the bath's thousands live on the GPU and cannot be held: these are the ones the fibres can take. Each
// drifts slowly, is carried by a current, and when nobody is near comes back somewhere out of sight.)
const MOL_N = 36, MOL_NEAR = 300;
const molMat = beadMaterial({ sat: 1 });
const MOL_KINDS = [['complex', beadTemplate('complex', 21), [1.3, 1.7]], ['globule', beadTemplate('globule', 23, PALETTE.periwinkle), [1.4, 2.0]], ['teal', beadTemplate('globule', 25, PALETTE.teal), [1.3, 1.8]]];
const molMeshes = Object.fromEntries(MOL_KINDS.map(([k, tpl]) => { const bm = beadMesh(tpl, MOL_N, { material: molMat, dynamic: true }); scene.add(bm.mesh); return [k, bm]; }));
const mols = Array.from({ length: MOL_N }, (_, i) => {
  const [kind, , sz] = MOL_KINDS[i % MOL_KINDS.length];
  return { i, kind, size: rand(...sz), pos: new THREE.Vector3(), vel: new THREE.Vector3(), q: new THREE.Quaternion().random(), w: new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.25), heldBy: null };
});
const inSolid = (p, pad = 8) => world.hosts.some((h) => !h.hidden && !h.burst && world.sdHost(h, p) < pad) || bystanderClear(p) < pad || world.sdAmoeba(p) < pad;
/** Put molecule o in clear water `r0..r1` from p, out of sight when `hide` (behind the view) if it can. */
function placeMol(o, p, r0, r1, hide = false) {
  for (let k = 0; k < 10; k++) {
    o.pos.set(gauss(), gauss(), gauss()).normalize();
    if (hide && o.pos.dot(camFwd(_v)) > -0.2 && k < 8) continue;
    o.pos.multiplyScalar(rand(r0, r1)).add(p);
    if (!inSolid(o.pos)) break;
  }
  o.vel.set(0, 0, 0); o.heldBy = null;
}
function resetMols() { for (const o of mols) placeMol(o, START, 70, 260); } // (none right on top of you at the start)
const _mf = new THREE.Vector3();
function updateMols(dt, focus) {
  for (const o of mols) {
    if (o.heldBy != null) { const m = team[o.heldBy]; if (!m || m.P.hold?.mol !== o) o.heldBy = null; else continue; }
    // the water's drag takes a let-go molecule's speed away over a few seconds: it drifts gently off
    o.vel.multiplyScalar(Math.exp(-dt * 0.7));
    if (opts.currents) o.vel.lerp(currents.flowAt(o.pos, _mf).add(o.vel), 1 - Math.exp(-dt * 2.5));
    o.pos.addScaledVector(o.vel, dt);
    o.pos.addScaledVector(world.flowAt(o.pos, t, _mf), dt * 0.5);
    for (const h of world.hosts) { if (h.hidden || h.burst) continue; const d = world.sdHost(h, o.pos, _mf); if (d < 4) o.pos.addScaledVector(_mf, 4 - d); }
    // nobody near: it comes back near someone, out of sight
    let near = Infinity;
    for (const p of focus) near = Math.min(near, p.distanceTo(o.pos));
    if (near > MOL_NEAR && focus.length) placeMol(o, focus[o.i % focus.length], 130, 260, true);
  }
}
function drawMols(dt) {
  const n = Object.fromEntries(MOL_KINDS.map(([k]) => [k, 0]));
  for (const o of mols) {
    if (o.heldBy == null) o.q.multiply(_q.setFromEuler(new THREE.Euler(o.w.x * dt, o.w.y * dt, o.w.z * dt)));
    molMeshes[o.kind].set(n[o.kind]++, o.pos, o.q, o.size);
  }
  for (const [k, bm] of Object.entries(molMeshes)) { bm.setCount(n[k]); bm.commit(); }
}
// the grab assist's mark: a soft ring in each player's colour on what X would take now
const pingGeo = new THREE.RingGeometry(0.8, 1, 40);
const reachRings = [0, 1, 2, 3].map(() => { const mm = new THREE.Mesh(pingGeo, new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); mm.visible = false; mm.renderOrder = 6; scene.add(mm); return mm; });
function updateReachRing(m) {
  const ring = reachRings[m.slot];
  const show = m.P.mode === 'drift' && !m.P.hold && m.P.fold < 0.5 && !m.c.active;
  const tgt = show ? grabTarget() : null;
  m.reachTarget = tgt;
  ring.visible = !!tgt;
  if (!tgt) return;
  ring.position.copy(tgt.point);
  ring.scale.setScalar(tgt.kind === 'mol' ? tgt.mol.size * 3.2 : 6);
  ring.material.color.set(m.color || '#bfe8ff');
  ring.material.opacity = 0.28 + 0.12 * Math.sin(t * 6);
}

// --- currents (currents.js): one at a time, every 30-60 s, seen coming ---
const currents = createCurrents();
const curLog = [];
/** When one is due: aim it at a player in open water, across the view (so it is seen), on a fair path. */
function currentDue() {
  if (!opts.currents || debug.iso || debug.freeze) return null;
  const ok = members().filter((m) => m.P.mode === 'drift' && !m.c.active);
  if (!ok.length) return null;
  const m = ok[Math.floor(Math.random() * ok.length)];
  const target = m.P.pos.clone();
  if (target.distanceTo(START) < 160) return null; // (not in the calm water at the start)
  const pp = world.portal && !portalSealed() ? portalPoint().clone() : null;
  if (pp && target.distanceTo(pp) < 450) return null; // never across the way on
  for (let k = 0; k < 10; k++) {
    // from one side of the view (or from above or below it), a little into or out of it
    const side = k % 4 < 2 ? camRight(new THREE.Vector3()).multiplyScalar(Math.random() < 0.5 ? 1 : -1) : camUp(new THREE.Vector3()).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
    const dir = side.addScaledVector(camFwd(_v), rand(-0.3, 0.3)).addScaledVector(k % 4 < 2 ? camUp(_w) : camRight(_w), rand(-0.3, 0.3)).normalize();
    const path = carriedPath(target, dir, 560);
    const fair = path.every((p) => uvClear(p) > 70 && flocClear(p) > 30 && world.sdAmoeba(p) > 60 && (!pp || p.distanceTo(pp) > 320) && p.distanceTo(START) < FIELD_R);
    if (fair) return { target, dir, slot: m.slot };
  }
  return null;
}
let curWarned = false;
function stepCurrents(dt) {
  let pick = null;
  const ev = currents.update(dt, () => (pick = currentDue()));
  const a = currents.active;
  world.current = a && opts.currents ? { center: a.center, dir: a.dir, strength: a.strength, radius: currents.C.radius } : null;
  if (ev === 'start') {
    curWarned = false;
    curLog.push({ t: +t.toFixed(2), slot: pick?.slot, dir: a.dir.toArray().map((x) => +x.toFixed(2)) });
    // seen coming: a low whoosh and a word (where from, in the view's terms)
    const d = a.dir, from = Math.abs(d.dot(camRight(_v))) > Math.abs(d.dot(camUp(_w))) ? (d.dot(_v) > 0 ? 'Left' : 'Right') : (d.dot(_w) > 0 ? 'Below' : 'Above');
    audio.play('phage/current-coming', { volume: 0.5, old: ['bacterium/sprint', { volume: 0.35, rate: 0.45 }] });
    say(tt(`phage.toasts.current${from}`), 3000, true);
  }
  if (a && !curWarned && a.t > currents.C.warn - 0.3) {
    curWarned = true;
    audio.play('phage/current-pass', { volume: 0.6 });
    for (const m of members()) if (currents.nearness(m.P.pos) > 0.5) players.pad(m.slot).rumble(220, 0.2, 0.35);
  }
}

// --- the textured liquid (medium.js): slices of drifting noise across each view ---
const medium = createMedium();
scene.add(medium.mesh);
const mediumDrift = new THREE.Vector3();

/**
 * The zoom: LT out, RT in (paramecium's stepZoom): how far the trigger is squeezed sets how fast the wanted
 * distance moves (exponentially, so each step feels the same near and far), and the camera eases to it.
 */
const zoomForce = [];
function stepZoom(m, dt, frozen) {
  const f = zoomForce[m.slot], c = players.controls(m.slot);
  const rate = f !== undefined ? f : frozen ? 0 : c.lt() - c.rt();
  if (Math.abs(rate) > 0.04) m.zoomWant = clamp(m.zoomWant * Math.exp(rate * ZOOM.rate * dt), ZOOM.min, ZOOM.max);
  m.zoom += (m.zoomWant - m.zoom) * (1 - Math.exp(-dt / ZOOM.ease));
  if (Math.abs(m.zoom - m.zoomWant) < 1e-3) m.zoom = m.zoomWant;
}
/** The camera distance of a view showing these players (all of them by default): the widest of theirs. */
function zoomOf(slots) { let z = 0; for (const m of members()) if (!slots || slots.includes(m.slot)) z = Math.max(z, m.zoom); return z || ZOOM.start; }

function stepMember(m, dt, insideOwner, where) {
  use(m);
  P.msgT -= dt;
  dash.update(dt);
  const pl = players.get(m.slot);
  const idle = blocked || !pl || pl.waiting;
  const ls = idle ? ZERO_LS : ctl.move();
  const vert = idle ? 0 : ctl.secondary(); // RB up, LB down (the screen's up and down)
  const inp = { stick: null, stickM: 0 };
  const mag = Math.min(1, Math.hypot(ls.m, vert));
  if (mag > 0.05) { inp.stick = stickWorld(ls, vert, new THREE.Vector3()).normalize(); inp.stickM = mag; P.lastStick = inp.stick.clone(); P.lastStickT = 0.3; }
  P.lastStickT = (P.lastStickT || 0) - dt;
  const multi = isMulti();
  const c = capture.update(dt, pad);
  use(m); // (a respawn inside update may have switched members)
  m.c = c;
  const frozen = insideOwner && insideOwner !== m; // a teammate is inside a host: wait
  const live = !idle && !c.active && !debug.freeze && !frozen;
  stepZoom(m, dt, idle);
  if (!idle) {
    const lstep = ctl.lookStep();
    if (lstep) { const d = lstep; features.set('lookFL', LOOKS[(view.look + d + LOOKS.length) % LOOKS.length]); say(tt('phage.toasts.look', { look: lookName(LOOKS[view.look]) }), 1800, true); }
    if (ctl.special.pressed()) {
      // (the backdoor and the portal are far apart; whichever this player is in wins, else the overlay)
      if (where === 'outside' && P.inBack && outsideModes.includes(P.mode)) { audio.play('shared/backdoor', { volume: 0.55 }); embed.landmark('back', { player: m.slot }); }
      else if (!(where === 'outside' && live && tryEnter())) { view.overlay = !view.overlay; inside.setRadar(view.overlay); }
    }
  }
  if (live) {
    if (ctl.defend.pressed() && P.mode === 'coinfect') { P.coT = 1e6; }
    else if (ctl.defend.pressed() && outsideModes.includes(P.mode)) {
      P.foldTarget = P.foldTarget > 0.5 ? 0 : 1;
      audio.play('phage/fold', { volume: 0.6, rate: P.foldTarget ? 1 : 1.15, old: ['bacterium/tumble', { volume: 0.5, rate: P.foldTarget ? 0.9 : 1.15 }] });
      say(P.foldTarget ? tt('phage.toasts.foldIn') : tt('phage.toasts.foldOut'), 1800, true);
      if (P.mode === 'walk' && P.foldTarget > 0.5) leaveSurface(false);
      if (P.foldTarget > 0.5) releaseHold();
    }
    if (ctl.dash.pressed() && dash.ready && (P.mode === 'drift' || P.mode === 'walk')) {
      dash.trigger();
      // forward: along the view, into the screen (a held cell is let go; a carried molecule comes along)
      const dir = camFwd(new THREE.Vector3());
      if (P.hold?.kind === 'cell') releaseHold(false);
      if (P.mode === 'walk') { leaveSurface(true); say(tt('phage.toasts.pushOff'), 1800, true); }
      else { P.gust.addScaledVector(dir, 105); P.vel.addScaledVector(dir, 12); }
      world.gust(P.pos, dir);
      // A while carrying a molecule flings it along; otherwise the dash
      audio.play(P.hold?.kind === 'mol' ? 'phage/throw' : 'phage/dash', { volume: 0.7, old: ['bacterium/sprint', { volume: 0.8 }] });
      curPad().rumble(120, 0.4, 0.3);
    } else if (ctl.dash.pressed() && P.mode === 'clay') say(tt('phage.toasts.stuckClay'), 1800, true);
    // X: grab, or let go (pressed again); at an amoeba's lobe, a fibre jab
    if (ctl.attack.pressed()) {
      if (!tryJab(m)) { if (P.hold) releaseHold(); else tryGrab('x'); }
    }
  }
  P.reachT -= dt;
  m.jab = Math.max(0, m.jab - dt);
  P.grabCooldown = Math.max(0, P.grabCooldown - dt);
  if (frozen) return;
  P.fold += (P.foldTarget - P.fold) * (1 - Math.exp(-dt * 2.6));
  const still = { stick: null, stickM: 0 };
  if (!debug.freeze && !c.active) {
    if (P.mode === 'drift') updateDrift(dt, live ? inp : still);
    else if (P.mode === 'grab') updateGrab(dt);
    else if (P.mode === 'walk') updateWalk(dt, live ? inp : still);
    else if (P.mode === 'clay') updateClay(dt, live ? inp : still);
    else if (P.mode === 'commit') updateCommit(dt);
    else if (P.mode === 'coinfect') updateCoinfect(dt);
    else if (P.mode === 'burst') updateBurst(dt);
  }
  if (where === 'outside') updateReachRing(m);
  if (P.mode === 'inside' || (P.mode === 'burst' && P.burstT < 2.6)) {
    const ev = inside.update(dt, t, { steer: live && ls.m > 0 ? { x: ls.x, y: -ls.y } : null, surge: live && ctl.dash.pressed() }, c.active || debug.freeze);
    if (P.mode === 'inside' && !c.active) P.fade = Math.max(0, P.fade - dt * 1.5);
    if (ev.surged) { audio.play('bacterium/sprint', { volume: 0.6, rate: 1.2 }); say(tt('phage.toasts.surge'), 1400); }
    if (ev.cut && P.mode === 'inside') {
      P.cutBy = ev.cut;
      startCapture('cut', ev.cut.kind === 're' ? tt('phage.capture.re.by') : tt('phage.capture.crispr.by'), ev.cut.kind === 're' ? tt('phage.capture.re.how') : tt('phage.capture.crispr.how'));
    }
    if (ev.nearMiss) { say(tt('phage.toasts.nearMiss'), 2200, true); curPad().rumble(120, 0.3, 0.5); audio.play('bacterium/tumble', { volume: 0.6, rate: 1.3 }); }
    if (ev.retreat) say(tt('phage.toasts.crisprLetsGo'), 2400, true);
    if (P.mode === 'inside' && !c.active) {
      const b = inside.bossLock();
      // Cas3 swings in: heard on the edge into its wind-up
      if (b && b.state === 'windup' && P.casState !== 'windup') audio.play('phage/cas', { volume: 0.8 });
      P.casState = b ? b.state : null;

      if (b && b.state === 'windup' && P.msgT <= 0) { say(tt('phage.toasts.bound'), 2000, true); P.msgT = 3; }
      else if (b && b.match > 0.45 && b.state !== 'windup' && P.msgT <= 0) { say(tt('phage.toasts.guideGlowing'), 2200, true); P.msgT = 4; }
    }
    if (ev.won && P.mode === 'inside') { P.mode = 'burst'; P.burstT = 0; P.burstStarted = false; say(tt('phage.toasts.genomeIn'), 3000, true); audio.play('bacterium/eat', { volume: 0.8 }); }
  }
  // UV: a visible shaft, touched, damages you at once (no drain); a moment's grace to get out of it
  P.uvSafe = Math.max(0, (P.uvSafe || 0) - dt);
  if (where === 'outside' && !debug.iso && !c.active && !debug.freeze && opts.uv && outsideModes.includes(P.mode) && P.uvSafe <= 0) {
    const hit = uvAt(centreOf(_v));
    if (hit.k > 0.5) {
      P.uvSafe = 2.5;
      post.uniforms.uFlash.value = 0.35; post.uniforms.uFlashColor.value.set('#e6dcff');
      // knocked out of the light, sideways from the shaft's axis
      const out = _w.set(P.pos.x - hit.shaft.c.x, 0, P.pos.z - hit.shaft.c.z);
      if (out.lengthSq() < 1e-4) out.set(1, 0, 0);
      P.gust.addScaledVector(out.normalize(), 55);
      if (!P.damaged) damage();
      else startCapture('uv', tt('phage.capture.uv2.by'), tt('phage.capture.uv2.how'));
      ringLog.push({ kind: 'uvHit', t: +t.toFixed(2), slot: cur.slot, damaged: P.damaged });
    }
  }
  if (P.damaged) P.dark = Math.max(P.dark, 0.6);
  // the backdoor: open water at the flagellum, above the hosts
  P.inBack = where === 'outside' && P.mode === 'drift' && centreOf(_v).distanceTo(world.backdoor.pos) < world.backdoor.radius;
  if (c.active) captureAnim(c.phase, c.t, dt);
  // pose the model
  t4.set({ fold: P.fold, contract: P.contract, star: P.star, shortOut: P.shortOut, dna: P.dna, dark: P.dark, crack: P.crack });
  if (P.mode === 'drift' && !c.active) t4.group.position.copy(P.pos).add(_v.set(Math.sin(t * 13.1 + m.slot) * 0.12, Math.sin(t * 11.7 + 1 + m.slot) * 0.12, 0));
  else t4.group.position.copy(P.pos);
  t4.group.quaternion.copy(P.q);
  t4.group.scale.setScalar(P.scale);
  t4.group.visible = t4.fibreMesh.visible = P.mode !== 'inside' && !(P.mode === 'burst');
  for (let f = 0; f < 6; f++) t4.fibres[f].reach = m.jab > 0 ? 1.2 * Math.sin((m.jab / 0.45) * Math.PI) : P.mode === 'grab' ? 0.8 : P.mode === 'drift' && m.reachTarget ? 0.45 : P.mode === 'drift' && inp.stick ? 0.25 : 0;
  t4.state.sway = P.mode === 'walk' || P.mode === 'commit' ? 0.4 : 1;
  t4.update(dt, t);
}

/**
 * RS turns the view about its own axes: yaw about the view's up, pitch about its right. A quaternion
 * composed in the view's frame has no poles, so a held stick turns at a steady rate in any orientation,
 * and with the stick released the view stays exactly where it is. The optional levelling roll (Features:
 * Keep the surface up) turns about the line of sight only, weighted by how far the surface direction is
 * from it (zero looking straight up or down) and rate-limited, so it can never spin the view.
 */
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _prevQ = new THREE.Quaternion();
// --- the continuous transition in (embed.js "Continuous transitions") ---
// In the game the bacterium's freeze frame closes in on a phage glimpsed on its
// host (a gold glint) while this world fades in under the same framing: the
// shell sends `hold`; this world stays frozen at its start but renders, reports
// how its opening view frames your phage (embed.opening) and takes the shell's
// `camera` poses (a dolly, the field of view kept), ending exactly on that
// opening view; on `begin` time eases back in over INTRO_EASE s.
// The phage's length for the pose: baseplate to the head's top, ~23 units of
// 10 nm (shared/techniques/phage-model.js T4), the same 0.23 µm the bacterium
// world gives its glimpse. Its "heading" is a fixed reference (0): a pose
// only needs the same one for the opening and the move.
embed.provide('intro');
const INTRO_EASE = 0.6, PHAGE_LEN = 23;
let intro = null; // { cam } while held; { ease } while time comes back
/** The camera's elevation and azimuth (embed.js poses): from what it looks at back to it. */
function camAngles(cam) {
  const d = cam.getWorldDirection(new THREE.Vector3());
  return { yaw: Math.atan2(-d.z, -d.x), pitch: Math.asin(clamp(-d.y, -1, 1)) };
}
function phageCentre() { const was = cur; use(team[0]); const c = centreOf(new THREE.Vector3()); if (was) use(was); return c; }
const openingPose = () => embed.poseOf(camera, phageCentre(), { len: PHAGE_LEN, heading: 0, ...camAngles(camera) });
embed.on('hold', () => {
  intro = { cam: null };
  // the opening view settled (the camera's distance and target eased home), so play carries on from it without a drift
  view.dist = zoomOf(); view.target.copy(phageCentre());
  camera.quaternion.copy(view.q);
  camera.position.set(0, 0, view.dist).applyQuaternion(view.q).add(view.target);
  camera.updateMatrixWorld();
  embed.cinematic(true, canvas);
  embed.opening(openingPose());
});
embed.on('camera', (d) => { if (intro && !('ease' in intro) && d.pose) intro.cam = d.pose; });
embed.on('begin', () => { embed.cinematic(false, canvas); intro = { cam: null, ease: 0 }; });
/** The camera for a pose from the shell, with the haze and focus at its distance. */
function placePoseCamera(pose) {
  const c = phageCentre();
  const r = embed.poseCamera(camera, pose, c, { len: PHAGE_LEN, heading: 0 });
  const d = r.depth;
  camera.far = Math.max(3000, d + 1500);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  goodsellShared.uFogNear.value = d * 0.8; goodsellShared.uFogFar.value = d + 300;
  post.uniforms.uFocus.value = d;
}

function turnView(look, dt) {
  _prevQ.copy(view.q);
  if (look.m > 0.01) {
    view.q.multiply(_qa.setFromAxisAngle(AX_X, look.pitch * 1.25 * dt));
    view.q.multiply(_qb.setFromAxisAngle(UP, look.yaw * 1.6 * dt));
  }
  if (view.level) {
    const fwd = camFwd(_v), up = camUp(_w);
    const proj = _n.copy(UP).addScaledVector(fwd, -fwd.dot(UP));
    const w = proj.length();
    if (w > 1e-3) {
      proj.multiplyScalar(1 / w);
      const ang = Math.atan2(_s.crossVectors(up, proj).dot(fwd.negate()), up.dot(proj));
      const step = clamp(ang, -0.9 * dt, 0.9 * dt) * w * w;
      view.q.multiply(_qa.setFromAxisAngle(AX_Z, step));
    }
  }
  view.q.normalize();
  view.turnRate = dt > 0 ? 2 * Math.acos(Math.min(1, Math.abs(_prevQ.dot(view.q)))) / dt : 0;
}

function frame(now) {
  requestAnimationFrame(frame);
  const realDt = (now - last) / 1000;
  // held by the shell in the continuous transition: nothing moves (dt 0); after it, time eases back in
  const held = embed.held || (intro && !('ease' in intro));
  let ts = 1;
  if (intro && 'ease' in intro) { intro.ease += Math.min(0.05, realDt); ts = THREE.MathUtils.smoothstep(intro.ease, 0, INTRO_EASE); if (intro.ease >= INTRO_EASE) intro = null; }
  const dt = debug.pause || held ? 0 : Math.min(debug.maxDt || 0.05, realDt) * ts;
  last = now;
  t += dt;
  goodsellShared.uTime.value = t;
  quality.update(realDt);
  players.poll();
  syncTeam();
  unlockOnPad();
  blocked = features.update();
  if (!blocked) hud.update(pad);
  toastT -= dt;
  const owner = () => members().find((m) => m.P.mode === 'inside' || (m.P.mode === 'burst' && m.P.burstT < 2.6)) || null;
  let insideOwner = owner();
  const where = insideOwner ? 'inside' : 'outside';
  // the camera stick: any player
  const look = { yaw: 0, pitch: 0, m: 0 };
  if (!blocked && !held) for (const m of members()) { const l = players.controls(m.slot).look(); if (l.m > look.m) Object.assign(look, l); }
  for (const r of reachRings) r.visible = false;
  if (!held) for (const m of members()) stepMember(m, dt, insideOwner, where);
  insideOwner = owner();
  const lead = members().find((m) => m.P.mode === 'burst') || insideOwner || team[0];
  const solo = !isMulti();

  // the amoeba hunts the nearest phage; the crowd moves round the view
  if (where === 'outside' && !debug.iso) {
    if (!debug.freeze) { stepDirector(dt); updateGuard(dt); stepCurrents(dt); }
    updatePortalGlow(dt);
    use(team[0]);
    world.update(dt, t, view.target, centreOf(new THREE.Vector3()), camera.position.z);
    if (!debug.freeze) updateStray(dt);
  }
  use(lead);
  if (lead.P.mode === 'inside' || lead.P.mode === 'burst') {
    const s = inside.S;
    prog.style.display = where === 'inside' || lead.P.mode === 'inside' ? 'block' : 'none';
    const b = inside.bossLock();
    const lock = b ? (b.state === 'windup' || b.state === 'strike' ? 1 : b.match) : 0;
    prog.innerHTML = `<span>${tt('phage.inside.genomeIn', { kbp: Math.round(s.progress * 169) })}</span><i style="width:${(s.progress * 100).toFixed(1)}%"></i>`
      + `<span class="lock">${tt(b && b.state === 'retreat' ? 'phage.inside.matchLetGo' : lock > 0.99 ? 'phage.inside.matchBound' : 'phage.inside.match')}</span><b style="width:${(lock * 100).toFixed(0)}%"></b>`;
    prog.classList.toggle('hot', lock > 0.99);
  } else prog.style.display = 'none';
  // the win: the last world has no next stage, so the burst is the ending
  if (lead.P.mode === 'burst' && lead.P.burstT > 4 && !lead.P.burstSent) {
    lead.P.burstSent = true;
    enterPortal(lead);
  }
  if (card.classList.contains('show') && !blocked) for (const m of members()) { const c2 = players.controls(m.slot); if ((c2.dash.pressed() || c2.attack.pressed()) && lead.P.burstT > 4.6) { resetLevel(); break; } }
  updatePortalPrompt(where);
  // backdoor prompt
  const backNow = where === 'outside' && members().some((m) => m.P.inBack);
  if (backNow !== nearBack) {
    nearBack = backNow;
    embed.near('back', backNow, tt('phage.prompts.back'));
    if (backNow && !embed.active) say(tt('phage.toasts.flagellumStandalone'), 2600, true);
  }

  // camera: frame the group (solo: your phage)
  const commitFocus = solo && P.mode === 'commit';
  if (look.m > 0.01) view.lookHold = 0.45;
  else view.lookHold = Math.max(0, view.lookHold - dt);
  if (where === 'outside') turnView(look, dt);
  // caught: pull back to watch the predator swallow you, then follow it
  const watching = solo && team[0].c.active && ['eat', 'follow', 'fadeOut'].includes(team[0].c.phase) && team[0].P.kind !== 'cut';
  const zNow = zoomOf();
  const wantDist = commitFocus ? Math.min(zNow, 75) : watching ? Math.max(zNow, 110) * 2.1 : zNow;
  view.dist += (wantDist - view.dist) * (1 - Math.exp(-dt * (watching ? 1.2 : 2)));
  const inPlay = members().filter((m) => m.P.mode !== 'inside' && m.P.mode !== 'burst' && m.P.mode !== 'dead');
  const focusPts = (inPlay.length ? inPlay : [team[0]]).map((m) => { use(m); return centreOf(new THREE.Vector3()); });
  if (watching && team[0].P.kind === 'amoeba') focusPts[0].lerp(world.amoeba.base, 0.35); // frame the amoeba as well as you
  use(lead);
  marks.begin();
  portalLight.begin();
  if (where === 'outside') {
    const want = lead.P.mode === 'burst' ? lead.P.commitHost.pos : split.centroid(focusPts);
    view.target.lerp(_v.set(want.x, want.y, want.z), 1 - Math.exp(-dt * (lead.P.mode === 'burst' ? 1 : 2.5)));
    const o = debug.camOverride;
    // several phages in one view: the split screen's zoom-out (the camera
    // pulled back along its view) keeps them all in frame; the screen splits
    // only once it is at its widest (shared/splitscreen.js)
    view.groupZoom = !o && inPlay.length > 1 && lead.P.mode !== 'burst' && !(held && intro && intro.cam) ? groupZoom : 1;
    const dist = o ? o.dist : view.dist * (lead.P.mode === 'burst' ? 1.6 : 1) * view.groupZoom;
    view.camDist = dist;
    // the camera is the view quaternion, at `dist` behind the target along its own back axis
    if (o) view.q.setFromEuler(new THREE.Euler(o.pitch, o.yaw, 0, 'YXZ'));
    camera.quaternion.copy(view.q);
    camera.position.set(0, 0, dist).applyQuaternion(view.q).add(view.target);
    if (commitFocus && P.contract > 0.05 && P.contract < 1.1 && P.commitT < 2.2) { const k = (2.2 - P.commitT) * 0.25; camera.position.x += Math.sin(t * 61) * k; camera.position.y += Math.cos(t * 53) * k; } // the snap
    camera.updateMatrixWorld();
    goodsellShared.uFogNear.value = dist * 0.8; goodsellShared.uFogFar.value = dist + 300;
    post.uniforms.uWater.value.set(waterColor);
    post.uniforms.uUseBg.value = view.art && art.water ? 1 : 0;
    goodsellShared.uFogColor.value.set(waterColor);
    goodsellShared.uHaze.value.set('#185462');
    post.uniforms.uTop.value.set('#2f8494'); post.uniforms.uBot.value.set('#07202c'); post.uniforms.uShaft.value.set('#8ad8da');
    post.uniforms.uFocus.value = dist;
    // (the UV is drawn as its shafts, world geometry; the old screen wash over the sunlit layer is off)
    post.uniforms.uUv.value = 0;
    world.shafts.visible = !debug.iso; world.shafts.material.uniforms.uOn.value = opts.uv ? 1 : 0.35;
    // ambient occlusion and outlines (QuteMol-like): strong in false light and Goodsell, subtle in cryo-EM, none in fluorescence
    // (view.look: 0 false light, 1 Goodsell, 2 cryo-EM, 3 fluorescence)
    // (false light: no outlines, a light AO; the look target is shaded, not inked)
    post.uniforms.uAO.value = [0.3, 0.6, 0.4, 0.2][view.look];
    post.uniforms.uEdge.value = [0, 0.6, 0.8, 0.25][view.look];
    post.uniforms.uInk.value.set(view.look === 1 ? '#2b2236' : '#0c1c28');
    post.uniforms.uBgOff.value.set(view.target.x * 0.0006, view.target.y * 0.0006);
    if (held && intro && intro.cam) placePoseCamera(intro.cam);
  } else {
    const cutting = insideOwner && insideOwner.c.active && insideOwner.P.kind === 'cut';
    const chewing = cutting && ['eat', 'follow', 'fadeOut'].includes(insideOwner.c.phase);
    inside.frame(dt, look, chewing ? 140 : cutting ? 85 : (insideOwner ? insideOwner.zoom : zNow) * 1.05 + 40, chewing ? insideOwner.P.camFocus : null);
    goodsellShared.uFogNear.value = 150; goodsellShared.uFogFar.value = isFL() ? 300 : 360;
    post.uniforms.uWater.value.set('#efc4a0');
    post.uniforms.uUseBg.value = 0; // the cytoplasm, not the water plate
    goodsellShared.uFogColor.value.set('#efc4a0');
    goodsellShared.uHaze.value.set('#1d3f6e');
    post.uniforms.uTop.value.set('#3a74b0'); post.uniforms.uBot.value.set('#081a34'); post.uniforms.uShaft.value.set('#a6dcf4');
    post.uniforms.uFocus.value = inside.camera.position.distanceTo(inside.tip());
    post.uniforms.uUv.value = 0;
    post.uniforms.uAO.value = [0.45, 0.6, 0.4, 0.2][view.look]; post.uniforms.uEdge.value = [0.3, 0.6, 0.8, 0.25][view.look];
  }
  post.uniforms.uLook.value = POST_LOOK[view.look];
  post.uniforms.uTime.value = t;
  post.uniforms.uFade.value = lead.P.fade;
  const uvDying = members().some((m) => m.c.active && m.P.kind === 'uv');
  if (!uvDying) post.uniforms.uFlash.value *= Math.exp(-dt * 4);
  post.uniforms.uFlashColor.value.set(uvDying ? '#efe4ff' : '#ffffff');
  world.clay.group.visible = !debug.iso && !hostById('B').hidden;
  if (where === 'outside') {
    // LEGO split screen: one view while together, split as players drift apart
    const list = inPlay.length ? inPlay.map((m, i) => ({ slot: m.slot, position: focusPts[i] })) : [{ slot: 0, position: view.target }];
    split.update(list, { camera, zoom: view.groupZoom }, dt);
    groupZoom = split.zoom;
    quality.setSplitViews(split.views.length);
    // the phages' wakes in the bath (molecules make way round each phage, so it always reads)
    world.setWake(debug.iso ? [] : members().filter((m) => m.t4.group.visible).map((m) => { use(m); return { p: centreOf(new THREE.Vector3()), r: 16 * P.scale }; }));
    use(lead);
    if (!debug.freeze) updateMols(dt, focusPts);
    for (const mm of Object.values(molMeshes)) mm.mesh.visible = !debug.iso;
    drawMols(dt);
    // the textured liquid: drifting with the ambient water; a current streams it into streaks
    mediumDrift.x += dt * 2.2; mediumDrift.y += dt * 1.1;
    medium.mesh.visible = !debug.iso && opts.medium !== false;
    medium.update(t, view.dist * view.groupZoom, mediumDrift, world.current, currents.offset);
    const zAll = zoomOf();
    split.render(camera, (v) => {
      // split, each view keeps its own players' zoom: the camera pulled back (or in) along its view from the
      // shared framing, which is the widest of everyone's (put back after the view is drawn)
      const vk = split.views.length > 1 && !debug.camOverride ? zoomOf(v.slots) / zAll : 1;
      const pull = view.camDist * (vk - 1);
      if (pull) { camera.position.addScaledVector(_back.set(0, 0, 1).applyQuaternion(camera.quaternion), pull); camera.updateMatrixWorld(); post.uniforms.uFocus.value = view.camDist * vk; }
      noteView(); // (what this view sees, for the director)
      // each view wraps the bath round its own centre: the water is full in every view, together or apart
      world.viewBath(_v.set(0, 0, -view.dist * vk).applyQuaternion(camera.quaternion).add(camera.position));
      for (const m of members()) m.t4.setCutFrom(camera.position);
      for (const r of reachRings) r.quaternion.copy(camera.quaternion);
      // every internal pass (scene, DOF copy, bloom) scissored to this view's region when split
      post.render(scene, camera, (rt) => split.scissor(v, rt));
      if (pull) { camera.position.addScaledVector(_back, -pull); camera.updateMatrixWorld(); post.uniforms.uFocus.value = view.camDist; }
    });
    // (shared/landmark.js trips on an empty split region, which splitscreen.js can emit for a frame as players leave)
    if (!debug.iso && lead.P.mode !== 'burst' && split.layout.regions.every((r) => r.polygon && r.polygon.length >= 3)) {
      // no arrow to the way on by default (the owner: keep moving in any direction and you find it): its golden
      // sparkle is the marker; the Portal arrow setting adds one (drawPortalArrow)
      marks.drawSplit(split, world.backdoor.pos, { kind: 'backdoor', label: tt('phage.marks.sediment'), range: 600 });
      // (the way on is there from the start on the default path, but its light only shows once it is open)
      if (world.portal && !portalSealed()) {
        const pp = portalPoint(), d = Math.min(...members().map((m) => m.P.pos.distanceTo(pp)));
        portalLight.drawSplit(split, pp, { strength: THREE.MathUtils.clamp(1.2 - d / 1200, 0.5, 1), open: portalGlow.open });
      }
      drawPortalArrow();
    } else arrowLog = [];
  } else { arrowLog = []; for (const r of reachRings) r.visible = false; post.render(inside.scene, inside.camera); }

  use(team[0]);
  updateOverlay(where);
  const spd = P.vel.length() + P.gust.length();
  driftLoop.set({ volume: P.mode === 'drift' ? Math.min(0.25, spd / 200) : 0, rate: 0.6 + spd / 200 });
  const pxPerUnit = innerHeight / (2 * Math.tan((camera.fov * Math.PI) / 360) * (where === 'outside' ? view.dist : inside.camera.position.distanceTo(inside.tip())));
  scaleEl.innerHTML = `<i style="width:${(10 * pxPerUnit).toFixed(0)}px"></i>${where === 'outside' ? tt('phage.scale.outside') : tt('phage.scale.inside')}`;
  label.textContent = tt(opts.drive ? 'phage.caption.steered' : 'phage.caption.honest', { look: lookName(LOOKS[view.look]) });
  const n5 = (x) => { const k = Math.round(clamp(x, 0, 1) * 5); return '■'.repeat(k) + '□'.repeat(5 - k); };
  const modeName = { drift: P.hold?.kind === 'cell' ? `holding on to ${P.hold.part} of ${P.hold.host.name}` : P.hold ? 'carrying a molecule' : currents.nearness(P.pos) > 0.3 ? 'in a CURRENT' : 'drifting legs-first', grab: 'grabbing a surface protein', walk: `walking on ${P.host?.name}${P.bound ? ` · ${P.bound} fibres on OmpC` : ''}`, clay: 'stuck on clay (UV shelter)', commit: 'committed: contracting', coinfect: `damaged genome waiting in ${P.coHost?.name} for a partner (B: give up)`, inside: 'DNA entering the host', burst: 'burst', dead: 'lost' }[P.mode];
  const am = !world.portal ? 'not found yet' : guard.gone ? 'driven off' : ({ guard: 'on guard', stalk: 'REACHING', windup: 'WINDING UP!', strike: 'STRIKING!', recover: 'recovering', repelled: 'repelled', retreat: 'retreating', off: 'off' }[fightState] || fightState) + (guarded() ? '' : ' · receptor OPEN') + ` · interest ${Math.round(fight.interest * 100)} %`;
  const others = isMulti() ? '\n' + members().filter((m) => m.slot).map((m) => `P${m.slot + 1} ${m.P.mode} ${n5(m.P.integrity)}`).join('  ') : '';
  hud.stats(`${goalLine(where)}\n${modeName}\nfibres ${P.foldTarget > 0.5 ? 'folded' : 'extended'}\n${P.damaged ? 'DAMAGED: one more UV shaft is fatal' : 'whole'}  ${dash.text()}\nguard (amoeba) ${am}\n${where === 'inside' ? `genome in ${Math.round(inside.S.progress * 100)} %` : `${(P.pos.distanceTo(START) / 100).toFixed(1)} µm out · encounters ${director.index}/3 (${director.state().phase})`}${others}`);
}

/** The goal, one line, for the stage you are at (the HUD's first line). */
function goalLine(where) {
  if (where === 'inside') return 'GOAL: get the whole genome in · lead your end away from CRISPR-Cas';
  if (P.mode === 'commit' || P.mode === 'burst') return 'GOAL: injecting…';
  if (P.damaged) return 'GOAL: co-infect a host with a partner (the other damaged phage nearby, or a teammate)';
  if (!world.portal || portalSealed()) return `GOAL: explore, any direction · ${(P.pos.distanceTo(START) / 100).toFixed(1)} µm out · encounters ${director.index} of 3`;
  const d = Math.max(0, portalPoint().distanceTo(centreOf(_v)) - 10);
  if (d < 70) return guarded() ? 'GOAL: the amoeba guards the gold receptor: lure it off, or fold (B) and jab (X)' : 'GOAL: the receptor is open: press Y to enter Host A';
  return `GOAL: the golden glow on Host A · ${(d / 100).toFixed(1)} µm`;
}

/**
 * The end of the chain: the host has burst. This is the one place the phage world fires
 * embed.landmark('forward') (the phage is the last world: the shell treats it as the ending);
 * standalone it shows the Burst card. (The portal itself, Host A's open receptor, leads inside.)
 */
function enterPortal(m) {
  ringLog.push({ kind: 'forward', t: +t.toFixed(2), slot: m.slot });
  if (embed.active) embed.landmark('forward', { won: true, burst: 40, host: m.P.commitHost.id, player: m.slot });
  else showWinCard();
}

function showWinCard() {
  card.innerHTML = tt('phage.winCard', { host: lead().P.commitHost.name });
  card.classList.add('show');
}
const lead = () => members().find((m) => m.P.mode === 'burst') || team[0];

// --- debug hooks for scripted screenshots (they act on player 1) ---
const p1 = (fn) => (...a) => { use(team[0]); return fn(...a); };
Object.assign(debug, {
  teleport: p1((x, y, z = 0) => { releaseHold(false); P.vel.set(0, 0, 0); P.kv.set(0, 0, 0); P.gust.set(0, 0, 0); P.pos.set(x, y, z); view.target.copy(P.pos); t4.group.position.copy(P.pos); t4.resetFibres(t); if (P.mode !== 'drift') { P.mode = 'drift'; releaseAnchors(); } }),
  orient: p1((ax, ay, az) => { P.q.setFromEuler(new THREE.Euler(ax, ay, az)); P.angVel.set(0, 0, 0); }),
  isolate(on) { debug.iso = on; for (const h of world.hosts) h.group.visible = !on; world.opts.crowd = !on; world.amoeba.mesh.visible = !on; world.backdoor.group.visible = !on; const keep = new Set(members().map((m) => m.t4.fibreMesh)); for (const o of scene.children) if (o.isInstancedMesh && !keep.has(o) && o !== progeny) o.visible = !on; },
  cam(yaw, pitch, dist) { debug.camOverride = yaw == null ? null : { yaw, pitch, dist }; },
  fold: p1((v) => { P.foldTarget = v; }),
  walkOn: p1((id, u = 0, phi = 0) => {
    if (id === 'A' && (!world.portal || portalSealed())) debug.placePortal();
    use(team[0]);
    const h = world.hosts.find((x) => x.id === id);
    const local = new THREE.Vector3(u, Math.cos(phi) * (h.r + 6), Math.sin(phi) * (h.r + 6));
    P.pos.copy(world.toWorld(h, local)); P.foldTarget = 0; P.fold = 0;
    P.q.setFromUnitVectors(UP, world.dirToWorld(h, local.clone().setX(0).normalize(), new THREE.Vector3()));
    t4.group.position.copy(P.pos); t4.group.quaternion.copy(P.q); t4.resetFibres(t);
    enterWalk(h);
  }),
  grab: p1(tryGrab),
  /** Y in the portal's area (enter Host A on purpose). */
  enter: p1(() => tryEnter()),
  commit: p1(() => { if (P.mode === 'walk') beginCommit(); }),
  inside: p1((id = 'A') => { if (id === 'A' && (!world.portal || portalSealed())) { debug.placePortal(); use(team[0]); } const h = world.hosts.find((x) => x.id === id); P.commitHost = h; P.mode = 'inside'; inside.start(h); inside.setRadar(view.overlay); P.fade = 0; }),
  win: p1(() => { if (P.mode === 'inside') { inside.S.nodes.length = 0; P.mode = 'burst'; P.burstT = 0; P.burstStarted = false; for (let i = 0; i < GENOME_NODES; i++) inside.S.nodes.push(new THREE.Vector3(Math.sin(i * 0.2) * 40, 52 - i * 1.0, 0)); inside.S.prev = inside.S.nodes.map((n) => n.clone()); } }),
  capture: p1((kind, slot = 0) => {
    use(team[slot]);
    if (kind === 'amoeba' && (!world.portal || portalSealed())) { debug.placePortal(); use(team[slot]); }
    if (kind === 'amoeba') { const am = world.amoeba; const c = centreOf(new THREE.Vector3()); am.base.subVectors(c, am.center).normalize().multiplyScalar(am.r - 6).add(am.center); am.tip.copy(c).lerp(am.base, 0.3); am.reach = am.tip.distanceTo(am.base); startCapture('amoeba', 'The amoeba', 'closed a pseudopod round you into a food vacuole'); }
    if (kind === 'uv') startCapture('uv', 'UV-B from the sunlit surface', 'darkened and cracked your capsid and broke your DNA');
    if (kind === 'cut') { if (P.mode !== 'inside') debug.inside('A'); const e = inside.enzymes[0]; e.pos.copy(inside.tip()).add(new THREE.Vector3(14, -6, 0)); P.cutBy = e; startCapture('cut', 'The host\'s restriction enzyme', 'found a recognition site and cut your DNA'); }
    use(team[0]);
  }),
  /** Move player `slot` to x, y. */
  place: (slot, x, y) => { const m = team[slot]; if (!m) return; use(m); P.pos.set(x, y, 0); P.vel.set(0, 0, 0); t4.group.position.copy(P.pos); t4.resetFibres(t); use(team[0]); },
  /** UV-damage player `slot` (the revive test). */
  damage: (slot = 0) => { const was = cur; use(team[slot]); damage(); use(was); },
  stray: () => ({ pos: stray.pos.toArray().map((x) => +x.toFixed(0)), paired: stray.paired ? stray.paired.slot : null, used: stray.used, log: stray.log.slice() }),
  placements: () => world.placements(),
  /** Turn rates now: the view (rad/s) and each phage's angular speed (rad/s). */
  spin: () => ({ view: +view.turnRate.toFixed(4), phages: members().map((m) => +m.P.angVel.length().toFixed(4)) }),
  /** What player `slot`'s fibres hold: null | { kind: 'mol', i, pos } | { kind: 'cell', host, part, by }. */
  hold: (slot = 0) => { const g = team[slot]?.P.hold; return !g ? null : g.kind === 'mol' ? { kind: 'mol', i: g.mol.i, by: g.by, pos: g.mol.pos.toArray().map((x) => +x.toFixed(1)) } : { kind: 'cell', host: g.host.id, part: g.part, by: g.by }; },
  /** X as if pressed now; release() lets go. */
  grabNow: p1((by = 'x') => { if (!tryJab(cur)) tryGrab(by); return debug.hold(0); }),
  release: p1(() => releaseHold()),
  /** The free molecules: [{ i, pos, vel, held }]. */
  mols: () => mols.map((o) => ({ i: o.i, pos: o.pos.toArray().map((x) => +x.toFixed(1)), vel: +o.vel.length().toFixed(2), held: o.heldBy })),
  /** Put molecule i at x, y, z (still). */
  placeMol: (i, x, y, z) => { const o = mols[i]; o.pos.set(x, y, z); o.vel.set(0, 0, 0); },
  /** Send a current now at player 1 along [x, y, z] (default: from the view's left). */
  current: p1((dir = null) => { const d = dir ? new THREE.Vector3(...dir) : camRight(new THREE.Vector3()); currents.start(P.pos, d); curLog.push({ t: +t.toFixed(2), slot: 0, dir: d.normalize().toArray(), forced: true }); return debug.currents(); }),
  /** The current now ({ center, dir, t, strength, life } | null), when the next is due, and the log. */
  currents: () => { const a = currents.active; return { active: a && { center: a.center.toArray().map((x) => +x.toFixed(0)), dir: a.dir.toArray().map((x) => +x.toFixed(2)), t: +a.t.toFixed(2), strength: +a.strength.toFixed(2), life: +a.life.toFixed(1) }, next: +currents.next.toFixed(1), log: curLog.slice() }; },
  /** Where the camera looks (unit, world) and its right and up. */
  axes: () => ({ fwd: camFwd(new THREE.Vector3()).toArray(), right: camRight(new THREE.Vector3()).toArray(), up: camUp(new THREE.Vector3()).toArray() }),
  /** Fraction of the last frame's pixels covered by the scene (not bare backdrop), from the scene target's alpha. */
  coverage() {
    const rt = post.target, w = rt.width, h = rt.height;
    const half = rt.texture.type === THREE.HalfFloatType;
    const buf = half ? new Uint16Array(w * h * 4) : new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    const alpha = (i) => { if (!half) return buf[i] / 255; const x = buf[i], e = (x >> 10) & 31, f = x & 1023; return e === 0 ? f / 1024 / 16384 : e === 31 ? 1 : (1 + f / 1024) * 2 ** (e - 15); };
    let n = 0, c = 0;
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { n++; if (alpha((y * w + x) * 4 + 3) > 0.5) c++; }
    return c / n;
  },
  /** NaN or infinite texels in the last frame's scene target (they would bloom into black blocks; the pass now drops them). */
  nanCount() {
    const rt = post.target, w = rt.width, h = rt.height;
    if (rt.texture.type !== THREE.HalfFloatType) return 0;
    const buf = new Uint16Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    let n = 0;
    for (let i = 0; i < buf.length; i++) if (((buf[i] >> 10) & 31) === 31) n++;
    return n;
  },
  beads: () => world.bathBeads(),
  /** Place the way on now at bearing [x, y, z] (default: player 1's bearing). */
  /**
   * Testing only (it breaks the order on purpose): the way on now, `d` units from player 1 along `dir`
   * ([x, y, z]; default: away from the start). director.force marks every earlier encounter met.
   */
  placePortal(dir = null, d = 300) {
    use(team[0]);
    const u = dir ? new THREE.Vector3(...dir).normalize() : _v.subVectors(P.pos, START).normalize().clone();
    if (!(u.lengthSq() > 0.5)) u.set(1, 0, 0);
    const at = P.pos.clone().addScaledVector(u, d);
    leadPos.copy(P.pos);
    director.force('portal', at.x, at.z, Math.atan2(u.z, u.x));
    // (force puts it at the director's ground height: lift it to where it was asked for)
    if (Math.abs(at.y - world.portal.host.pos.y) > 1) placePortal(at, u);
    return debug.portal();
  },
  /** The portal arrow drawn last frame, per view: [{ x, y, angle, onScreen, d, label, at } | null] ([] when off). */
  portalArrow: () => arrowLog,
  /** The director's portals (the way on): [{ instance, x, y, z, open, seen, state }]. */
  portals: () => director.portals().map(({ handle, ...q }) => q),
  portalSealed: () => portalSealed(),
  /** The director (shared/director.js): its state, log, what is seen; placeNow ends the current break. */
  encounters: () => director.state(),
  encounterLog: () => director.log.slice(),
  seenAt: (x, y, z) => director.seenAt(x, y, z),
  placeNow: () => director.placeNow(),
  director,
  /** The way on: where it is, guarded or open, the guard's state; and the ring log. */
  portal: () => (world.portal ? { at: portalPoint().toArray().map((x) => +x.toFixed(1)), normal: portalNormal().toArray().map((x) => +x.toFixed(2)), guarded: guarded(), gone: guard.gone, state: fightState, interest: +fight.interest.toFixed(2), tip: +world.amoeba.tip.distanceTo(portalPoint()).toFixed(1) } : null),
  rings: () => ringLog.slice(),
  shafts: () => UV_SHAFTS.map((sh) => sh.c.toArray()),
  hosts: () => world.hosts.map((h) => ({ id: h.id, hidden: !!h.hidden, pos: h.pos.toArray().map((x) => +x.toFixed(0)), d: +h.pos.distanceTo(START).toFixed(0) })),
  /** The flocs (x, y, z, r): scenery. */
  flocs: () => world.flocs.map((f) => [...f.home.toArray(), f.r]),
  /** Drive the guard off (as if worn down). */
  driveOff() { guard.gone = true; },
  overlay(on) { view.overlay = on; inside.setRadar(on); },
  look(i) { features.set('lookFL', LOOKS[i]); },
  /** Set every player's zoom (camera distance) at once: an index into the old steps (0..3), or a distance. */
  zoom(i) { const d = Number.isInteger(i) && i >= 0 && i < ZOOMS.length ? ZOOMS[i] : clamp(i, ZOOM.min, ZOOM.max); for (const m of members()) m.zoom = m.zoomWant = d; view.dist = d; },
  /** Hold the zoom triggers for player slot as LT/RT would: +1 full LT (out), -1 full RT (in), null back to the pad. */
  zoomHold(v = 1, slot = 0) { zoomForce[slot] = v === null ? undefined : v; },
  /** Each player's zoom (camera distance) now: [{ slot, zoom, want }]. */
  zooms: () => members().map((m) => ({ slot: m.slot, zoom: +m.zoom.toFixed(1), want: +m.zoomWant.toFixed(1) })),
  ZOOM,
  reset: resetLevel,
  boss() { const b = inside.bossLock(); return b ? { state: b.state, match: +b.match.toFixed(2), d: +b.pos.distanceTo(inside.tip()).toFixed(1) } : null; },
});
Object.defineProperty(debug, 'nearPortal', { get: () => nearPortal }); // (is the Y prompt on)
Object.defineProperty(debug, 'fight', { get: () => ({ state: fightState, interest: fight.interest }) });
window.__micro = {
  get P() { return team[0].P; }, get t4() { return team[0].t4; }, get capture() { return team[0].capture; },
  team, players, split, world, inside, camera, view, debug, features, guard, post, medium, currents, get t() { return t; },
  get nearBack() { return nearBack; },
  /** Your phage as a pose (embed.js) in the view now. */
  cellPose: () => embed.poseOf(camera, phageCentre(), { len: PHAGE_LEN, heading: 0, ...camAngles(camera) }), get where() { return members().some((m) => m.P.mode === 'inside') ? 'inside' : 'outside'; },
};
// the roster: from the shell (embed), or P1 alone; joins keep coming during play
if (embed.players) players.fromJSON(embed.players);
embed.on('players', (r) => { players.fromJSON(r); syncTeam(); hud.players(players.list); });
syncTeam();
hud.players(players.list);
applyStyle();
resetLevel();
requestAnimationFrame((n) => { last = n; frame(n); });

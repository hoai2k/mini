// Phage prototype (Level 6 of the Zoom Chain): a T4-like tailed phage in bog
// water, drawn as a Goodsell-style molecular illustration. LS drives a soft,
// wobbly drift (a labelled departure: phages have no motor); Brownian motion,
// the flow and slow tumbling act on top. Bind a host with the long fibres,
// walk to an OmpC patch, commit (X): the sheath contracts and the DNA goes in.
// Inside, thread the DNA's leading end past the host's restriction enzyme and
// CRISPR complex until the whole genome is in. See README.md.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPlayers } from '../shared/players.js';
import { embed } from '../shared/embed.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks } from '../shared/landmark.js';
import { mountHud } from '../shared/hud.js';
import { createDash, hudControls, addInvertY } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { loadTexture } from '../shared/assets.js';
import { createHunger, createCapture } from '../shared/predation.js';
import { createPost, goodsellShared, toonMaterial, inkedInstanced } from '../shared/techniques/phage-goodsell.js';
import { createT4, t4LiteGeometry, T4 } from '../shared/techniques/phage-model.js';
import { createWorld, uvAt, BOUNDS, UV } from './world.js';
import { createInside, GENOME_NODES } from './inside.js';

const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();

// --- renderer, scenes, cameras ---
const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.localClippingEnabled = true;
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 2, 3000);
const post = createPost(renderer);
const gl = renderer.getContext();
const soft = /SwiftShader|llvmpipe|Software/i.test(String(gl.getParameter(gl.RENDERER)) + (gl.getExtension('WEBGL_debug_renderer_info') ? gl.getParameter(0x9246) : ''));
const renderScale = soft ? 0.6 : 1;
const inside = createInside();
function resize() {
  const pr = Math.min(devicePixelRatio || 1, 1.5) * renderScale;
  const w = Math.max(2, Math.floor(innerWidth * pr)), h = Math.max(2, Math.floor(innerHeight * pr));
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  post.resize(w, h);
  camera.aspect = inside.camera.aspect = w / h;
  camera.updateProjectionMatrix(); inside.camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// --- input, HUD ---
// up to four local players (shared/players.js); P1 also on the keyboard
const players = createPlayers({
  max: 4,
  onJoin: (p) => { syncTeam(); hud.toast(`Player ${p.slot + 1} joined`); hud.players(players.list); embed.join(p.slot, p.color, p.name); },
  onLeave: (p) => { syncTeam(); hud.toast(`Player ${p.slot + 1} left`); hud.players(players.list); embed.leave(p.slot); },
});
const pad = players.pad(0);
let ctl = players.controls(0);
const hud = mountHud({
  title: 'Phage',
  sub: 'A T4-like phage, 0.2 µm long, in bog water beside its host bacteria: a molecular illustration, not a microscope image. Drift with LS; let go and Brownian motion has you.',
  controls: hudControls({
    move: 'Drift (a labelled departure: phages have no motor). Bound to a host: walk fibre by fibre',
    camera: 'Orbit the view',
    dash: 'Current gust (departure) · on a surface: push off with the fibres',
    attack: 'Commit: bind irreversibly, contract the sheath, inject (needs an OmpC patch)',
    defend: 'Fibres: fold (slip past clay and wrong hosts) / extend (catch receptors)',
    special: 'Odds and receptor overlay (data, not optics)',
    look: 'Look: Goodsell watercolour, cryo-EM greyscale, fluorescence',
    zoom: 'Zoom in / out',
    extra: [['Y', 'At the flagellum (backdoor): back to the sediment']],
  }),
  note: 'Time is slowed about 20× (a phage crosses a host cell in ~0.04 s). Goal: find a host with receptors, commit, and get the whole genome in past its defences. Keep below the UV-bright water near the surface. Up to four players: press any button on another controller to join.',
});
const tag = Object.assign(document.createElement('div'), { className: 'ph-tag', textContent: 'DATA OVERLAY · receptors, defences and odds: data, not optics' });
const label = Object.assign(document.createElement('div'), { className: 'ph-label' });
const scaleEl = Object.assign(document.createElement('div'), { className: 'ph-scale' });
const card = Object.assign(document.createElement('div'), { className: 'ph-card' });
const prog = Object.assign(document.createElement('div'), { className: 'ph-prog' });
const labels = document.createElement('div');
document.body.append(tag, label, scaleEl, card, prog, labels);

// --- the world and the phage ---
const world = createWorld(scene);
let t4 = null; // the current member's model (see use())
const progenyGeo = t4LiteGeometry();
const progeny = inkedInstanced(progenyGeo, toonMaterial({ vertexColors: true }), 40, { width: 0.8 });
progeny.setCount(0);
scene.add(progeny);

// delivered art (null until delivered); guard ids that may not be in the list yet
const safeTexture = (id, o) => { try { return loadTexture(id, o); } catch (e) { console.warn(`[micro] ${e.message}`); return Promise.resolve(null); } };
const art = { envelope: null, water: null, section: null };
safeTexture('MP-V01').then((t) => { if (t) { art.envelope = t; applyArt(); } });
safeTexture('MP-V02').then((t) => { if (t) { art.water = t; applyArt(); } });
safeTexture('MP-V03', { repeat: false }).then((t) => { if (t) { art.section = t; applyArt(); } });

const LOOKS = ['Goodsell watercolour', 'Cryo-EM greyscale', 'Fluorescence (pseudo-colour)'];
const LOOK_KEY = ['goodsell', 'cryo', 'fluor'];
const ZOOMS = [60, 110, 180, 290];
const view = { look: 0, zoom: 1, yaw: 0, pitch: 0, overlay: false, ink: true, art: true, target: new THREE.Vector3(), dist: 180, iso: null };
const opts = { drive: true, brownian: true, tumble: true, uv: true, amoeba: true };

function applyArt() {
  const use = view.art;
  const env = use && art.envelope;
  for (const h of world.hosts) {
    h.mat.setMap(env ? art.envelope : h.mat.userData.std, env ? [3, 1.5] : [6, 3]);
    // the painted envelope carries its own colour; the wrong host keeps a dull tint so it reads apart
    h.mat.uniforms.uColor.value.set(env ? (h.wrong ? '#bba680' : '#e4e0d8') : h.color);
  }
  post.setBackdrop(use ? art.water : null);
  waterColor = use && art.water ? '#a7c2bc' : '#bcd3ea';
  inside.setSection(use ? art.section : null);
}
for (const h of world.hosts) h.mat.userData = { std: h.mat.uniforms.uMap.value };
let waterColor = '#bcd3ea';

// --- phage state ---
const START = new THREE.Vector3(-60, 30, 0);
const newP = () => ({
  pos: START.clone(), vel: new THREE.Vector3(), bvel: new THREE.Vector3(), gust: new THREE.Vector3(),
  q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.5), angVel: new THREE.Vector3(),
  mode: 'drift', foldTarget: 0, fold: 0, integrity: 1, host: null, walkLocal: new THREE.Vector3(), lift: 4,
  anchors: Array(6).fill(null), stepping: -1, stepT: 0, bound: 0, canCommit: false, commitT: 0, commitHost: null,
  clayT: 0, msgT: 0, kind: null, cutBy: null, burstT: 0, fade: 0, contract: 0, star: 0, shortOut: 0, dna: 1, dark: 0, crack: 0, scale: 1,
  stuckTip: Array(6).fill(null), lastHost: null, inBack: false,
});
const hunger = createHunger({ grace: 45 });

// --- the team: one phage per player. The update functions below act on the
// "current" member through P, t4, dash, capture and ctl; use(m) switches them.
const team = []; // by slot
let P = null, dash = null, capture = null, cur = null;
let capsidMode = 'cutaway';
function use(m) { cur = m; P = m.P; t4 = m.t4; dash = m.dash; capture = m.capture; ctl = players.controls(m.slot); }
const curPad = () => players.pad(cur ? cur.slot : 0);
const members = () => team.filter(Boolean);
const isMulti = () => members().length > 1;
function makeMember(slot, color) {
  const m = { slot, color, P: newP(), t4: createT4({ clip: true }), dash: createDash({ duration: 0.5, cooldown: 2.4 }),
    capture: createCapture({ onRestart: () => resetLevel() }), c: { active: false, phase: null, t: 0 } };
  m.t4.addTo(scene);
  m.t4.set({ capsid: capsidMode });
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
function syncTeam() {
  const want = new Set(players.list.map((p) => p.slot));
  for (const m of members()) if (!want.has(m.slot)) dropMember(m.slot);
  for (const p of players.list) {
    if (team[p.slot]) continue;
    const m = makeMember(p.slot, p.color);
    if (p.slot > 0 && team[0]) respawn(m); else placeAtStart(m);
  }
  const multi = isMulti();
  if (multi !== syncTeam.multi || members().length !== syncTeam.n) { for (const m of members()) m.t4.setTint(multi ? m.color : null); syncTeam.multi = multi; syncTeam.n = members().length; }
  if (team[0]) use(team[0]);
}

// --- features ---
const features = createFeatures({ key: 'phage', pad });
const audio = createAudio(['bacterium/amb-sediment', 'bacterium/run', 'bacterium/tumble', 'bacterium/sprint', 'bacterium/eat', 'bacterium/phage', 'bacterium/graze']);
audio.addToFeatures(features);
audio.loop('bacterium/amb-sediment', { volume: 0.5 });
const driftLoop = audio.loop('bacterium/run', { volume: 0 });
function unlockOnPad() { if (pad.kind !== 'controller') return; for (let b = 0; b < 16; b++) if (pad.value(b) > 0.5) { audio.unlock(); return; } }

features.add({ id: 'look', group: 'Rendering', label: 'Look (D-pad ←→)', choices: LOOKS, value: LOOKS[0],
  about: 'Goodsell watercolour: crowded, colour-coded molecules with ink outlines, flat soft light and depth by desaturation, after David Goodsell\'s paintings. Cryo-EM greyscale: what cryo-electron tomography really gives (Hu et al. 2015 [S99]): protein density dark on grey, a bright defocus fringe, heavy shot noise. Fluorescence: every protein glowing as if tagged, a pseudo-colour fantasy (no light microscope resolves a phage). All three are illustrations.',
  onChange: (v) => { view.look = Math.max(0, LOOKS.indexOf(v)); } });
features.add({ id: 'capsid', group: 'Rendering', label: 'Capsid', choices: ['Cutaway', 'Translucent', 'Solid'], value: 'Cutaway',
  about: 'Cutaway: the half of the head facing you is clipped away, showing the DNA packed inside as a coaxial spool (~169 kbp, about 57 µm of DNA in a 0.12 µm head [S98]). Translucent: the capsid as a glassy shell. Solid: as it would look from outside.',
  onChange: (v) => { capsidMode = v.toLowerCase(); for (const m of members()) m.t4.set({ capsid: capsidMode }); } });
features.add({ id: 'ink', group: 'Rendering', label: 'Ink outlines', on: true, about: 'An inverted-hull outline around every molecule, fading with depth, as in a Goodsell painting.', onChange: (on) => { goodsellShared.uInkOn.value = on ? 1 : 0; } });
features.add({ id: 'depth', group: 'Rendering', label: 'Depth by desaturation', on: true, about: 'Far things fade toward the water colour and lose saturation (Goodsell\'s depth cue) instead of getting smaller and darker.', onChange: (on) => { goodsellShared.uDepthOn.value = on ? 1 : 0; } });
features.add({ id: 'art', group: 'Rendering', label: 'Delivered art (MP-V01/V02/V03)', on: true,
  about: 'The envelope surface (MP-V01) on the hosts, the water backdrop (MP-V02) behind the scene and the envelope section (MP-V03) above the cytoplasm inside the host. Off: the procedural watercolour stand-ins.',
  onChange: (on) => { view.art = on; applyArt(); } });
features.add({ id: 'model', group: 'Body', label: 'T4 from its anatomy', fixed: true,
  about: 'Prolate icosahedral head 120 × 86 nm studded with capsomers; collar and fibritin whiskers; a 23-ring sheath (98 nm) that contracts to 42 nm and fattens, exposing the inner tube; a hexagonal baseplate that opens into a star; six kinked long fibres of 160 nm simulated as chains, and six short fibres under the plate [S98, S99].' });
features.add({ id: 'drive', group: 'Motion', label: 'LS drift', choices: ['Drift: LS pushes the phage (departure)', 'Honest: Brownian motion only'], value: 'Drift: LS pushes the phage (departure)',
  about: 'A phage has no motor: it moves only by diffusion until it touches a host [S100]. The default lets LS push a soft, slow drift (about 0.3 µm/s on the slowed clock) as a labelled game departure, with Brownian jitter, the flow and tumbling layered on. Honest: the stick does nothing in open water (walking on a host still works, since bound phages do wander on the surface [S99]).',
  onChange: (v) => { opts.drive = v.startsWith('Drift'); } });
features.add({ id: 'brown', group: 'Motion', label: 'Brownian motion', on: true,
  about: 'T4 diffuses with D ≈ 4 µm²/s [S100]. On the ~20× slowed clock that is ~0.2 µm²/s, drawn as a smooth random velocity (Ornstein–Uhlenbeck, not frame jitter) so it reads as organic. Everything jostles: hosts, molecules, the amoeba\'s edge.',
  onChange: (on) => { opts.brownian = on; world.opts.hostBrownian = on; } });
features.add({ id: 'tumble', group: 'Motion', label: 'Slow tumbling', on: true,
  about: 'A 0.1 µm particle forgets its orientation within about a millisecond (rotational diffusion ~1.3 × 10³ rad²/s). Here it turns slowly instead, so you can see the phage (a labelled departure).',
  onChange: (on) => { opts.tumble = on; } });
features.add({ id: 'uv', group: 'Simulation', label: 'UV near the surface', on: true,
  about: 'Sunlight UV-B damages phage DNA. In humic bog water it is absorbed within centimetres (10 % left at 1.5 cm in the most humic lake [S104]), so only the top of the field is dangerous: your integrity erodes there. Bound to the clay platelet you are shielded [S103].',
  onChange: (on) => { opts.uv = on; } });
features.add({ id: 'amoeba', group: 'Simulation', label: 'Amoeba edge', on: true,
  about: 'A grazing amoeba at the left edge. After a calm opening (45 s) it gets hungry now and then and reaches a pseudopod toward you; drift away or ride a gust. Amoebae grazing on viruses is [Unverified] in the spec.',
  onChange: (on) => { opts.amoeba = on; } });
features.add({ id: 'crowd', group: 'World', label: 'Crowded water', on: true,
  about: 'Humic colloids, proteins, sugars and solutes jostling, pushed by gusts and by your passage. Small solutes are drawn several times too large so they read (departure).',
  onChange: (on) => { world.opts.crowd = on; } });
addInvertY(features);

// --- helpers ---
let toastT = 0;
function say(text, ms = 2200, force = false) { if (!force && toastT > 0) return; hud.toast(text, ms); toastT = Math.min(1.2, ms / 1000); }
function axisOf(out = new THREE.Vector3()) { return out.copy(UP).applyQuaternion(P.q); }
function centreOf(out = new THREE.Vector3()) { return axisOf(out).multiplyScalar(10 * P.scale).add(P.pos); }
function stickWorld(ls, out) {
  // the stick in the view: camera right and up, flattened onto the play plane
  const r = _w.setFromMatrixColumn(camera.matrixWorld, 0); r.z = 0; r.normalize();
  const u = _n.setFromMatrixColumn(camera.matrixWorld, 1); u.z = 0; u.normalize();
  return out.copy(r).multiplyScalar(ls.x).addScaledVector(u, -ls.y);
}
function releaseAnchors() { for (let f = 0; f < 6; f++) { P.anchors[f] = null; t4.fibres[f].anchor = null; } P.stepping = -1; }

/** Put a member back in clear water: at `at` (default the start), whole and drifting. */
function placeAtStart(m, at = null) {
  use(m);
  P.pos.copy(at || START).add(at ? _v.set(0, 0, 0) : _v.set(m.slot * 26, (m.slot % 2) * 14, 0));
  P.vel.set(0, 0, 0); P.bvel.set(0, 0, 0); P.gust.set(0, 0, 0); P.angVel.set(0, 0, 0);
  P.q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.5);
  Object.assign(P, { mode: 'drift', foldTarget: 0, fold: 0, integrity: 1, host: null, canCommit: false, bound: 0, commitT: 0, kind: null, cutBy: null, burstT: 0, fade: 0, contract: 0, star: 0, shortOut: 0, dna: 1, dark: 0, crack: 0, scale: 1 });
  releaseAnchors();
  P.stuckTip.fill(null);
  t4.set({ contract: 0, star: 0, shortOut: 0, dna: 1, dark: 0, crack: 0 });
  t4.group.scale.setScalar(1);
  t4.group.position.copy(P.pos); t4.group.quaternion.copy(P.q);
  t4.resetFibres(t);
  if (capture.active) capture.reset(false);
}
/** Multiplayer: a caught player comes back beside a teammate who is still in play. */
function respawn(m) {
  const mate = members().find((o) => o !== m && (o.P.mode === 'drift' || o.P.mode === 'walk' || o.P.mode === 'clay'));
  const at = mate ? mate.P.pos.clone().add(new THREE.Vector3(rand(-24, 24), 26, 0)) : null;
  if (at) at.y = Math.min(at.y, UV.y0 - 20);
  placeAtStart(m, at);
  if (m.P === P) say(`${players.get(m.slot)?.name || 'P' + (m.slot + 1)} drifts back in${mate ? ' beside a teammate' : ''}.`, 2000, true);
}
let started = false;
function resetLevel() {
  world.reset();
  for (const m of members()) placeAtStart(m);
  if (team[0]) use(team[0]);
  hunger.reset();
  inside.reset();
  progeny.setCount(0);
  card.classList.remove('show');
  P.burstSent = false;
  view.target.copy(P.pos);
  // in the game shell its intro has already said this
  if (!embed.active || started) say('You are a T4-like phage in bog water. Drift with LS; fibres out (B) catch a host. It is calm for now.', 4200, true);
  started = true;
}

// --- death and capture sequences ---
function startCapture(kind, by, how) {
  if (capture.active) return;
  P.kind = kind;
  P.mode = kind === 'cut' ? 'inside' : 'dead';
  capture.start({ by, how });
  curPad().rumble(400, 0.6, 0.9);
  if (isMulti()) embed.captured({ player: cur.slot, kind });
  audio.play(kind === 'amoeba' ? 'bacterium/graze' : kind === 'cut' ? 'bacterium/tumble' : 'bacterium/eat', { volume: 0.9 });
}
const TITLES = { amoeba: 'Eaten', uv: 'Inactivated', cut: 'Cut' };
function retitleCard() {
  for (const el of document.body.children) {
    if (el.style && el.style.zIndex === '30' && el.firstChild && el.firstChild.textContent === 'Eaten' && TITLES[P.kind]) el.firstChild.textContent = TITLES[P.kind];
  }
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
    } else if (phase === 'eat' || phase === 'eaten') {
      const k = phase === 'eat' ? t : 1;
      world.drawPod(am.reach * (1 - k), am.base, am.tip.lerp(am.base, dt * 2), 0, k < 0.95);
      P.pos.lerp(_w.copy(am.base).addScaledVector(_n.subVectors(am.center, am.base).normalize(), 2), dt * 0.8);
      am.vacuole.visible = true; am.vacuole.position.copy(centreOf(_v)); am.vacuole.scale.setScalar(20 - 6 * k);
      P.dark = Math.min(1, 0.2 + k); P.scale = 1 - 0.45 * k; P.foldTarget = 1;
    }
  } else if (P.kind === 'uv') {
    if (phase === 'strike') post.uniforms.uFlash.value = (1 - t) * 0.7;
    else if (phase === 'hold') { P.dark = 0.4 + 0.6 * t; }
    else { const k = phase === 'eat' ? t : 1; P.dark = 1; P.crack = k; P.dna = 1 - 0.5 * k; P.foldTarget = 0.6; }
  } else if (P.kind === 'cut') {
    inside.cutAnim(P.cutBy, phase, t);
  }
}

// --- the commit (irreversible) ---
function tryCommit() {
  if (members().some((m) => m !== cur && ['commit', 'inside', 'burst'].includes(m.P.mode))) { say('A teammate is already injecting: wait for them.', 2000, true); return; }
  if (P.mode === 'walk' && P.canCommit) {
    P.mode = 'commit'; P.commitT = 0; P.commitHost = P.host; P.host.locked = true;
    say('Committed: short fibres bind for good, the baseplate opens into a star, the sheath contracts…', 3200, true);
    audio.play('bacterium/phage', { volume: 0.9 });
    curPad().rumble(250, 0.3, 0.5);
    return;
  }
  if (P.mode === 'walk' && P.host) say('Not here: commitment needs three long fibres bound on an OmpC patch (Y shows the patches).', 2600, true);
  else if (P.mode === 'clay') say('Stuck on clay: there is nothing to infect. Fold the fibres (B) to slip free.', 2600, true);
  else if (P.mode === 'drift') say('Nothing to bind: extend the fibres (B) and drift into a host first.', 2400, true);
}

// --- per-mode updates ---
const flow = new THREE.Vector3();
let t = 0;
function updateDrift(dt, inp) {
  const drive = _v.set(0, 0, 0);
  if (inp.stick && opts.drive) drive.copy(inp.stick).multiplyScalar(30 * inp.stickM);
  P.vel.lerp(drive, 1 - Math.exp(-dt * 1.4));
  if (opts.brownian) {
    const sig = inp.stick ? 7 : 10.5, tau = 0.6;
    P.bvel.multiplyScalar(Math.exp(-dt / tau));
    P.bvel.x += gauss() * sig * Math.sqrt(dt); P.bvel.y += gauss() * sig * Math.sqrt(dt); P.bvel.z += gauss() * sig * 0.4 * Math.sqrt(dt);
  } else P.bvel.multiplyScalar(Math.exp(-dt * 3));
  P.gust.multiplyScalar(Math.exp(-dt * 2.2));
  world.flowAt(P.pos, t, flow);
  P.pos.addScaledVector(P.vel, dt).addScaledVector(P.bvel, dt).addScaledVector(P.gust, dt).addScaledVector(flow, dt);
  P.pos.z += -P.pos.z * dt * 0.6;
  P.pos.x = clamp(P.pos.x, BOUNDS.x0, BOUNDS.x1); P.pos.y = clamp(P.pos.y, BOUNDS.y0, BOUNDS.y1); P.pos.z = clamp(P.pos.z, BOUNDS.z0, BOUNDS.z1);
  // slow tumbling, and the head leads when moving so the fibres trail like weed
  if (opts.tumble) {
    P.angVel.multiplyScalar(Math.exp(-dt / 0.9));
    P.angVel.x += gauss() * 0.45 * Math.sqrt(dt); P.angVel.y += gauss() * 0.45 * Math.sqrt(dt); P.angVel.z += gauss() * 0.45 * Math.sqrt(dt);
  } else P.angVel.multiplyScalar(Math.exp(-dt * 2));
  const mv = _w.copy(P.vel).add(P.gust);
  const sp = mv.length();
  // close to a cell with the fibres out, they catch the water near it and swing the baseplate round to face it
  const near = world.nearestHost(centreOf(new THREE.Vector3()));
  const facing = near.host && near.d < 45 && P.fold < 0.5;
  if (facing) {
    const ax = axisOf(new THREE.Vector3());
    world.sdHost(near.host, P.pos, _s);
    const k = (1 - near.d / 45) * 3.0;
    P.angVel.addScaledVector(new THREE.Vector3().crossVectors(ax, _s), dt * k);
  } else if (sp > 4) {
    const ax = axisOf(_n);
    const tq = new THREE.Vector3().crossVectors(ax, mv.normalize());
    P.angVel.addScaledVector(tq, dt * Math.min(1, sp / 25) * 3.2);
  }
  // it turns in depth too, but drifts back toward side-on so you can read it (part of the slowed-tumbling departure)
  { const ax = axisOf(_n); const flat = _w.set(ax.x, ax.y, 0); if (flat.lengthSq() > 1e-4) P.angVel.addScaledVector(new THREE.Vector3().crossVectors(ax, flat.normalize()), dt * 0.9); }
  integrateRotation(dt);
  // solids
  const c = centreOf(_v);
  for (const h of world.hosts) {
    if (h.burst) continue;
    const sd = world.sdHost(h, c, _n);
    if (sd < 11) { if (sd < 9) P.angVel.add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.4 * dt * 10)); P.pos.addScaledVector(_n, 11 - sd); const vn = P.vel.dot(_n); if (vn < 0) P.vel.addScaledVector(_n, -vn); P.gust.addScaledVector(_n, -Math.min(0, P.gust.dot(_n))); }
  }
  const sa = world.sdAmoeba(c);
  if (sa < 12) P.pos.addScaledVector(_n.subVectors(c, world.amoeba.center).normalize(), 12 - sa);
  const sc = world.sdClay(c);
  if (sc < 9) { _n.set(0, Math.sign(c.y - world.clay.pos.y) || 1, 0); P.pos.addScaledVector(_n, 9 - sc); }
  // fibre tips touching things
  if (P.fold < 0.4) {
    for (let f = 0; f < 6; f++) {
      const tip = t4.tip(f);
      if (world.sdClay(tip) < 1.6) { enterClay(); return; }
      const knee = t4.fibres[f].nodes[T4.KNEE];
      const a = world.nearestHost(tip), b = world.nearestHost(knee);
      const { host, d } = a.d < b.d ? a : b;
      if (host && d < 2.2) {
        if (host.wrong) {
          world.sdHost(host, tip, _n);
          P.gust.addScaledVector(_n, 18);
          if (P.msgT <= 0) { say('No receptor here: a Gram-positive with a thick wall and no OmpC. The fibres slide off.', 2600, true); P.msgT = 3; audio.play('bacterium/tumble', { volume: 0.4 }); }
        } else { enterWalk(host); return; }
      }
    }
  }
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
  say(`Bound reversibly to ${host.name}'s LPS. Walk with LS to an OmpC patch (Y), then X to commit.`, 3200, true);
}

function enterClay() {
  P.mode = 'clay'; P.clayT = 0;
  for (let f = 0; f < 6; f++) { const tip = t4.tip(f); if (world.sdClay(tip) < 4) { P.stuckTip[f] = tip.clone(); t4.fibres[f].anchor = P.stuckTip[f]; } }
  P.vel.set(0, 0, 0); P.gust.set(0, 0, 0);
  audio.play('bacterium/tumble', { volume: 0.5, rate: 0.8 });
  say('Fibres stuck to a clay platelet: a trap, but a shelter from UV. Fold them (B) to slip free.', 3000, true);
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
  say('Folded fibres slip off the clay.', 1600, true);
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
  if (P.canCommit && !was) { say(`${bound} fibres bound to OmpC: X to commit (irreversible).`, 2600, true); curPad().rumble(60, 0.2, 0); }
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
  if (k > 0 && k < 1 && !P.snapped) { P.snapped = true; curPad().rumble(200, 0.7, 0.8); audio.play('bacterium/eat', { volume: 0.8, rate: 0.8 }); }
  const base = world.toWorld(h, P.walkLocal, new THREE.Vector3());
  world.projectToHost(h, base, P.lift, base, _n);
  P.pos.copy(base);
  P.q.slerp(new THREE.Quaternion().setFromUnitVectors(UP, _n), 1 - Math.exp(-dt * 4));
  for (let f = 0; f < 6; f++) if (P.anchors[f]) world.toWorld(h, P.anchors[f], t4.fibres[f].anchor || (t4.fibres[f].anchor = new THREE.Vector3()));
  if (c > 2.4) P.fade = ramp(c, 2.6, COMMIT_T);
  if (c >= COMMIT_T) {
    P.mode = 'inside'; P.snapped = false;
    inside.start(h);
    inside.setRadar(view.overlay);
    say(h.crispr ? 'Inside Host B. Its CRISPR complexes carry a spacer matching you: they hunt hard. Lead the DNA end away (LS).' : 'Inside the host. Lead the DNA\'s end (LS) away from the restriction enzyme and CRISPR complex until the genome is in.', 4200, true);
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
    audio.play('bacterium/graze', { volume: 0.8, rate: 1.3 });
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

// --- the amoeba ---
let podGiveUp = 0;
function updateAmoeba(dt) {
  const am = world.amoeba;
  hunger.update(dt);
  const c = centreOf(_v);
  const reachable = opts.amoeba && hunger.hungry && (P.mode === 'drift' || P.mode === 'walk' || P.mode === 'clay') && world.sdAmoeba(c) < 260;
  if (reachable) {
    if (am.reach < 2) { am.base.subVectors(c, am.center).normalize().multiplyScalar(am.r - 6).add(am.center); am.tip.copy(am.base); }
    const toward = _w.subVectors(c, am.tip);
    const d = toward.length();
    const sp = 15 + Math.sin(t * 2.1) * 4;
    am.tip.addScaledVector(toward.normalize(), Math.min(d, sp * dt));
    am.tip.x += Math.sin(t * 1.7) * 0.15; am.tip.y += Math.cos(t * 1.3) * 0.15;
    am.reach = am.tip.distanceTo(am.base);
    if (am.reach > 300) { am.tip.sub(am.base).setLength(300).add(am.base); am.reach = 300; podGiveUp += dt; }
    if (d > 120) podGiveUp += dt * 0.5;
    if (podGiveUp > 8) { hunger.missed(); podGiveUp = 0; say('The amoeba gives up for now.', 1800); }
    world.drawPod(am.reach, am.base, am.tip, clamp(1 - (d - 10) / 60, 0.2, 1));
    if (d < 10) {
      hunger.fed(); podGiveUp = 0;
      startCapture('amoeba', 'The amoeba', 'closed a pseudopod round you into a food vacuole');
    }
    if (d < 70 && P.msgT <= 0) { say('A pseudopod is reaching for you: drift away or ride a gust (A)!', 2200, true); P.msgT = 4; }
  } else if (am.reach > 0) {
    am.reach = Math.max(0, am.reach - 30 * dt);
    if (am.reach > 0) am.tip.copy(am.base).addScaledVector(_w.subVectors(am.tip, am.base).normalize(), am.reach);
    world.drawPod(am.reach, am.base, am.tip, 0.3, am.reach > 1);
  }
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
      if (h.burst) continue;
      placeLabel(h.id, _w.copy(h.pos).add(new THREE.Vector3(0, h.r + 16, 0)),
        `<b>${h.name}</b><br>receptors: ${h.receptors}<br>defences: ${h.defence}<br>odds of a burst if you commit: <b>${Math.round(h.odds * 100)} %</b>`, camera);
    }
    placeLabel('uv', new THREE.Vector3(view.target.x, UV.y0 + 6, 0), `UV-B starts here · at the top ~${Math.round(uvAt(UV.y1) * 100)} % dose rate · bound to clay: shielded`, camera);
    const am = world.amoeba;
    placeLabel('am', new THREE.Vector3(BOUNDS.x0 + 30, view.target.y + 40, 0), `amoeba: <b>${hunger.state}</b>${hunger.state !== 'hungry' ? ` (${Math.ceil(hunger.left)} s)` : ''}<br>reach ~2.6 µm when hungry`, camera);
    // encounter odds (illustrative): diffusion-limited k = 4πRD, here for this field
    const d = world.nearestHost(P.pos);
    placeLabel('enc', _w.copy(P.pos).add(new THREE.Vector3(0, -12, 0)), `nearest host ${(Math.max(0, d.d) / 100).toFixed(2)} µm · diffusing, ~${Math.max(0.01, (Math.max(0, d.d) / 100) ** 2 / (6 * 4)).toFixed(2)} s real to reach`, camera);
  } else {
    inside.updateRadar();
    for (const e of inside.enzymes) placeLabel('e' + inside.enzymes.indexOf(e), _w.copy(e.pos).add(new THREE.Vector3(0, 14, 0)), `${e.label}<br>senses your end within ${Math.round(e.detect)} nm`, inside.camera);
  }
}

// --- frame ---
const debug = { freeze: false, iso: false, camOverride: null };
const split = createSplitScreen(renderer, { capture: true, up: null });
const marks = createLandmarks();
const bestPatch = () => { const h = world.hosts.find((x) => x.id === 'A'); return world.toWorld(h, h.patchList[1].local); };
let last = performance.now();
let blocked = false;
let nearBack = false;
const ZERO_LS = { x: 0, y: 0, m: 0 }, ZERO_LOOK = { yaw: 0, pitch: 0, m: 0 };
const outsideModes = ['drift', 'walk', 'clay'];

function stepMember(m, dt, insideOwner, where) {
  use(m);
  P.msgT -= dt;
  dash.update(dt);
  const pl = players.get(m.slot);
  const idle = blocked || !pl || pl.waiting;
  const ls = idle ? ZERO_LS : ctl.move();
  const inp = { stick: null, stickM: 0 };
  if (ls.m > 0) { inp.stick = stickWorld(ls, new THREE.Vector3()).normalize(); inp.stickM = Math.min(1, ls.m); P.lastStick = inp.stick.clone(); }
  const multi = isMulti();
  const c = capture.update(dt, multi ? null : pad);
  m.c = c;
  if (c.phase === 'eaten') {
    if (multi) {
      // multiplayer: no card; the sequence has played, so back in beside a teammate
      const wasInside = m === insideOwner;
      capture.reset(false);
      if (wasInside) { inside.reset(); P.fade = 0; }
      respawn(m);
      m.c = { active: false, phase: null, t: 0 };
      return;
    }
    retitleCard();
  }
  const frozen = insideOwner && insideOwner !== m; // a teammate is inside a host: wait
  const live = !idle && !c.active && !debug.freeze && !frozen;
  if (!idle) {
    const lstep = ctl.lookStep();
    if (lstep) { const d = lstep; features.set('look', LOOKS[(view.look + d + LOOKS.length) % LOOKS.length]); say(`Look: ${LOOKS[view.look]}${view.look ? ' (an illustration, labelled)' : ''}`, 1800, true); }
    const zs = ctl.zoomStep();
    if (zs) view.zoom = clamp(view.zoom - zs, 0, ZOOMS.length - 1);
    if (ctl.special.pressed()) {
      if (where === 'outside' && P.inBack && outsideModes.includes(P.mode)) embed.landmark('back', { player: m.slot });
      else { view.overlay = !view.overlay; inside.setRadar(view.overlay); }
    }
  }
  if (live) {
    if (ctl.defend.pressed() && outsideModes.includes(P.mode)) {
      P.foldTarget = P.foldTarget > 0.5 ? 0 : 1;
      audio.play('bacterium/tumble', { volume: 0.5, rate: P.foldTarget ? 0.9 : 1.15 });
      say(P.foldTarget ? 'Fibres folded back against the sheath: you slip past clay and cells.' : 'Fibres out: a wider net to catch receptors (and clay).', 1800, true);
      if (P.mode === 'walk' && P.foldTarget > 0.5) leaveSurface(false);
    }
    if (ctl.dash.pressed() && dash.ready && (P.mode === 'drift' || P.mode === 'walk')) {
      dash.trigger();
      const dir = inp.stick ? inp.stick.clone() : axisOf(new THREE.Vector3());
      if (P.mode === 'walk') { leaveSurface(true); say('Push-off: the fibres kick you free of the surface (departure).', 1800, true); }
      else { P.gust.addScaledVector(dir, 70); say('A passing current gust carries you (departure: a phage has no motor).', 1800); }
      world.gust(P.pos, dir);
      audio.play('bacterium/sprint', { volume: 0.8 });
      curPad().rumble(120, 0.4, 0.3);
    } else if (ctl.dash.pressed() && P.mode === 'clay') say('Stuck to clay: a gust cannot pull you off. Fold the fibres (B).', 1800, true);
    if (ctl.attack.pressed()) tryCommit();
  }
  if (frozen) return;
  P.fold += (P.foldTarget - P.fold) * (1 - Math.exp(-dt * 2.6));
  const still = { stick: null, stickM: 0 };
  if (!debug.freeze && !c.active) {
    if (P.mode === 'drift') updateDrift(dt, live ? inp : still);
    else if (P.mode === 'walk') updateWalk(dt, live ? inp : still);
    else if (P.mode === 'clay') updateClay(dt, live ? inp : still);
    else if (P.mode === 'commit') updateCommit(dt);
    else if (P.mode === 'burst') updateBurst(dt);
  }
  if (P.mode === 'inside' || (P.mode === 'burst' && P.burstT < 2.6)) {
    const ev = inside.update(dt, t, { steer: live && ls.m > 0 ? { x: ls.x, y: -ls.y } : null, surge: live && ctl.dash.pressed() }, c.active || debug.freeze);
    if (P.mode === 'inside' && !c.active) P.fade = Math.max(0, P.fade - dt * 1.5);
    if (ev.surged) { audio.play('bacterium/sprint', { volume: 0.6, rate: 1.2 }); say('A surge: the strand is pulled in faster (departure).', 1400); }
    if (ev.cut && P.mode === 'inside') {
      P.cutBy = ev.cut;
      startCapture('cut', ev.cut.kind === 're' ? 'The host\'s restriction enzyme' : 'The host\'s CRISPR complex', ev.cut.kind === 're' ? 'found a recognition site and cut your DNA' : 'matched your DNA to a spacer and cut it');
    }
    if (ev.won && P.mode === 'inside') { P.mode = 'burst'; P.burstT = 0; P.burstStarted = false; say('The whole genome is in. Phage genes switch on; the host\'s DNA is broken down…', 3000, true); audio.play('bacterium/eat', { volume: 0.8 }); }
  }
  // UV, per phage, outside
  if (where === 'outside' && !debug.iso && !c.active && !debug.freeze && opts.uv && outsideModes.includes(P.mode)) {
    const uv = uvAt(centreOf(_v).y);
    P.integrity -= uv * 0.11 * dt * (P.mode === 'clay' ? 0.12 : 1);
    if (uv > 0.15 && P.msgT <= 0) { say(P.mode === 'clay' ? 'UV-bright water, but the clay shields you.' : 'UV-bright water near the surface: it is damaging your DNA. Go deeper.', 2400, true); P.msgT = 5; }
    P.dark = Math.max(P.dark, (1 - P.integrity) * 0.6);
    if (P.integrity <= 0) { P.integrity = 0; startCapture('uv', 'UV-B from the sunlit surface', 'darkened and cracked your capsid and broke your DNA'); }
  }
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
  for (let f = 0; f < 6; f++) t4.fibres[f].reach = P.mode === 'drift' && inp.stick ? 0.25 : 0;
  t4.state.sway = P.mode === 'walk' || P.mode === 'commit' ? 0.4 : 1;
  t4.update(dt, t);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = debug.pause ? 0 : Math.min(debug.maxDt || 0.05, (now - last) / 1000);
  last = now;
  t += dt;
  goodsellShared.uTime.value = t;
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
  if (!blocked) for (const m of members()) { const l = players.controls(m.slot).look(); if (l.m > look.m) Object.assign(look, l); }
  for (const m of members()) stepMember(m, dt, insideOwner, where);
  insideOwner = owner();
  const lead = members().find((m) => m.P.mode === 'burst') || insideOwner || team[0];
  const solo = !isMulti();

  // the amoeba hunts the nearest phage; the crowd moves round the view
  if (where === 'outside' && !debug.iso) {
    const prey = members().filter((m) => !m.c.active && outsideModes.includes(m.P.mode))
      .sort((a, b) => world.sdAmoeba(a.P.pos) - world.sdAmoeba(b.P.pos))[0];
    if (prey && !debug.freeze) { use(prey); updateAmoeba(dt); }
    else if (!debug.freeze) hunger.update(dt);
    use(team[0]);
    world.update(dt, t, view.target, centreOf(new THREE.Vector3()), camera.position.z);
  }
  use(lead);
  if (lead.P.mode === 'inside' || lead.P.mode === 'burst') {
    const s = inside.S;
    prog.style.display = where === 'inside' || lead.P.mode === 'inside' ? 'block' : 'none';
    prog.innerHTML = `<span>Genome in: ${Math.round(s.progress * 169)} of 169 kbp</span><i style="width:${(s.progress * 100).toFixed(1)}%"></i>`;
  } else prog.style.display = 'none';
  // the win: the last world has no next stage, so the burst is the ending
  if (lead.P.mode === 'burst' && lead.P.burstT > 4 && !lead.P.burstSent) {
    lead.P.burstSent = true;
    if (embed.active) embed.landmark('forward', { won: true, burst: 40, host: lead.P.commitHost.id });
    else showWinCard();
  }
  if (card.classList.contains('show') && !blocked) for (const m of members()) { const c2 = players.controls(m.slot); if ((c2.dash.pressed() || c2.attack.pressed()) && lead.P.burstT > 4.6) { resetLevel(); break; } }
  // backdoor prompt
  const backNow = where === 'outside' && members().some((m) => m.P.inBack);
  if (backNow !== nearBack) {
    nearBack = backNow;
    embed.near('back', backNow, 'Y: back to Sediment');
    if (backNow && !embed.active) say('The bacterium\'s flagellum sweeping past: Y goes back to the sediment (in the game).', 2600, true);
  }

  // camera: frame the group (solo: your phage)
  const commitFocus = solo && P.mode === 'commit';
  if (commitFocus) { view.yaw *= Math.exp(-dt * 2); view.pitch += (0.1 - view.pitch) * (1 - Math.exp(-dt * 2)); }
  else if (look.m > 0) { view.yaw = clamp(view.yaw + look.yaw * 1.4 * dt, -1.1, 1.1); view.pitch = clamp(view.pitch + look.pitch * 1.1 * dt, -0.75, 0.75); }
  else { view.yaw *= Math.exp(-dt * 0.4); view.pitch *= Math.exp(-dt * 0.4); }
  view.dist += ((commitFocus ? Math.min(ZOOMS[view.zoom], 75) : ZOOMS[view.zoom]) - view.dist) * (1 - Math.exp(-dt * 2));
  const inPlay = members().filter((m) => m.P.mode !== 'inside' && m.P.mode !== 'burst' && m.P.mode !== 'dead');
  const focusPts = (inPlay.length ? inPlay : [team[0]]).map((m) => { use(m); return centreOf(new THREE.Vector3()); });
  use(lead);
  marks.begin();
  if (where === 'outside') {
    const want = lead.P.mode === 'burst' ? lead.P.commitHost.pos : split.centroid(focusPts);
    view.target.lerp(_v.set(want.x, want.y, want.z), 1 - Math.exp(-dt * (lead.P.mode === 'burst' ? 1 : 2.5)));
    const o = debug.camOverride;
    const yaw = o ? o.yaw : view.yaw, pitch = o ? o.pitch : view.pitch, dist = o ? o.dist : view.dist * (lead.P.mode === 'burst' ? 1.6 : 1);
    camera.position.set(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(view.target);
    camera.lookAt(view.target);
    camera.updateMatrixWorld();
    goodsellShared.uFogNear.value = dist * 0.8; goodsellShared.uFogFar.value = dist + 300;
    post.uniforms.uWater.value.set(waterColor);
    post.uniforms.uUseBg.value = view.art && art.water ? 1 : 0;
    goodsellShared.uFogColor.value.set(waterColor);
    post.uniforms.uUv.value = opts.uv && !debug.iso ? 0.9 : 0;
    post.uniforms.uBgOff.value.set(view.target.x * 0.0006, view.target.y * 0.0006);
  } else {
    inside.frame(dt, look, insideOwner && insideOwner.c.active && insideOwner.P.kind === 'cut' ? 85 : ZOOMS[view.zoom] * 1.05 + 40);
    goodsellShared.uFogNear.value = 150; goodsellShared.uFogFar.value = 360;
    post.uniforms.uWater.value.set('#efc4a0');
    post.uniforms.uUseBg.value = 0; // the cytoplasm, not the water plate
    goodsellShared.uFogColor.value.set('#efc4a0');
    post.uniforms.uUv.value = 0;
  }
  post.uniforms.uLook.value = view.look;
  post.uniforms.uTime.value = t;
  post.uniforms.uFade.value = lead.P.fade;
  const uvDying = members().some((m) => m.c.active && m.P.kind === 'uv');
  if (!uvDying) post.uniforms.uFlash.value *= Math.exp(-dt * 4);
  post.uniforms.uFlashColor.value.set(uvDying ? '#efe4ff' : '#ffffff');
  world.clay.group.visible = !debug.iso;
  if (where === 'outside') {
    // LEGO split screen: one view while together, split as players drift apart
    const list = inPlay.length ? inPlay.map((m, i) => ({ slot: m.slot, position: focusPts[i] })) : [{ slot: 0, position: view.target }];
    split.update(list, { camera }, dt);
    split.render(camera, () => {
      for (const m of members()) m.t4.setCutFrom(camera.position);
      _v.set(camera.position.x, UV.y0 + 40, 0).project(camera);
      post.uniforms.uUvLine.value = _v.y * 0.5 + 0.5;
      post.render(scene, camera);
    });
    // (shared/landmark.js trips on an empty split region, which splitscreen.js can emit for a frame as players leave)
    if (!debug.iso && lead.P.mode !== 'burst' && split.layout.regions.every((r) => r.polygon && r.polygon.length >= 3)) {
      marks.drawSplit(split, bestPatch(), { kind: 'forward', label: 'OmpC', range: 600 });
      marks.drawSplit(split, world.backdoor.pos, { kind: 'backdoor', label: 'Sediment', range: 600 });
    }
  } else post.render(inside.scene, inside.camera);

  use(team[0]);
  updateOverlay(where);
  const spd = P.vel.length() + P.gust.length();
  driftLoop.set({ volume: P.mode === 'drift' ? Math.min(0.25, spd / 200) : 0, rate: 0.6 + spd / 200 });
  const pxPerUnit = innerHeight / (2 * Math.tan((camera.fov * Math.PI) / 360) * (where === 'outside' ? view.dist : inside.camera.position.distanceTo(inside.tip())));
  scaleEl.innerHTML = `<i style="width:${(10 * pxPerUnit).toFixed(0)}px"></i>${where === 'outside' ? '100 nm' : '10 nm'}`;
  label.textContent = `${LOOKS[view.look]} · an illustration, not a microscope image · time slowed ~20×${opts.drive ? ' · LS drift and gusts are departures' : ''}`;
  const n5 = (x) => { const k = Math.round(clamp(x, 0, 1) * 5); return '■'.repeat(k) + '□'.repeat(5 - k); };
  const modeName = { drift: 'drifting', walk: `walking on ${P.host?.name}${P.bound ? ` · ${P.bound} fibres on OmpC` : ''}`, clay: 'stuck on clay (UV shelter)', commit: 'committed: contracting', inside: 'DNA entering the host', burst: 'burst', dead: 'lost' }[P.mode];
  const am = hunger.state === 'grace' ? `calm (${Math.ceil(hunger.left)} s)` : hunger.state === 'hungry' ? 'HUNGRY' : 'resting';
  const others = isMulti() ? '\n' + members().filter((m) => m.slot).map((m) => `P${m.slot + 1} ${m.P.mode} ${n5(m.P.integrity)}`).join('  ') : '';
  hud.stats(`${modeName}\nfibres ${P.foldTarget > 0.5 ? 'folded' : 'extended'}\nintegrity ${n5(P.integrity)}  ${dash.text()}\nUV ${Math.round(uvAt(centreOf(_v).y) * 100)} %  amoeba ${am}\n${where === 'inside' ? `genome in ${Math.round(inside.S.progress * 100)} %` : `x ${(P.pos.x / 100).toFixed(2)} µm  depth below UV ${Math.max(0, (UV.y0 - centreOf(_v).y) / 100).toFixed(2)} µm`}${others}`);
}

function showWinCard() {
  card.innerHTML = `<h2>Burst</h2><p>${lead().P.commitHost.name} lysed and released 40 new phages (real T4 bursts are dozens to hundreds; <i>[Unverified here]</i>). Taking over the cell took ~25 minutes, compressed to seconds.</p><p class="go">Press A to play again</p>`;
  card.classList.add('show');
}
const lead = () => members().find((m) => m.P.mode === 'burst') || team[0];

// --- debug hooks for scripted screenshots (they act on player 1) ---
const p1 = (fn) => (...a) => { use(team[0]); return fn(...a); };
Object.assign(debug, {
  teleport: p1((x, y, z = 0) => { P.pos.set(x, y, z); view.target.copy(P.pos); t4.group.position.copy(P.pos); t4.resetFibres(t); if (P.mode !== 'drift') { P.mode = 'drift'; releaseAnchors(); } }),
  orient: p1((ax, ay, az) => { P.q.setFromEuler(new THREE.Euler(ax, ay, az)); P.angVel.set(0, 0, 0); }),
  isolate(on) { debug.iso = on; for (const h of world.hosts) h.group.visible = !on; world.opts.crowd = !on; world.amoeba.mesh.visible = !on; world.backdoor.group.visible = !on; const keep = new Set(members().map((m) => m.t4.fibreMesh)); for (const o of scene.children) if (o.isInstancedMesh && !keep.has(o) && o !== progeny) o.visible = !on; },
  cam(yaw, pitch, dist) { debug.camOverride = yaw == null ? null : { yaw, pitch, dist }; },
  fold: p1((v) => { P.foldTarget = v; }),
  walkOn: p1((id, u = 0, phi = 0) => {
    const h = world.hosts.find((x) => x.id === id);
    const local = new THREE.Vector3(u, Math.cos(phi) * (h.r + 6), Math.sin(phi) * (h.r + 6));
    P.pos.copy(world.toWorld(h, local)); P.foldTarget = 0; P.fold = 0;
    P.q.setFromUnitVectors(UP, world.dirToWorld(h, local.clone().setX(0).normalize(), new THREE.Vector3()));
    t4.group.position.copy(P.pos); t4.group.quaternion.copy(P.q); t4.resetFibres(t);
    enterWalk(h);
  }),
  commit: p1(() => { if (P.mode === 'walk') { P.canCommit = true; tryCommit(); } }),
  inside: p1((id = 'A') => { const h = world.hosts.find((x) => x.id === id); P.commitHost = h; P.mode = 'inside'; inside.start(h); inside.setRadar(view.overlay); P.fade = 0; }),
  win: p1(() => { if (P.mode === 'inside') { inside.S.nodes.length = 0; P.mode = 'burst'; P.burstT = 0; P.burstStarted = false; for (let i = 0; i < GENOME_NODES; i++) inside.S.nodes.push(new THREE.Vector3(Math.sin(i * 0.2) * 40, 52 - i * 1.0, 0)); inside.S.prev = inside.S.nodes.map((n) => n.clone()); } }),
  capture: p1((kind, slot = 0) => {
    use(team[slot]);
    if (kind === 'amoeba') { const am = world.amoeba; const c = centreOf(new THREE.Vector3()); am.base.subVectors(c, am.center).normalize().multiplyScalar(am.r - 6).add(am.center); am.tip.copy(c).lerp(am.base, 0.3); am.reach = am.tip.distanceTo(am.base); startCapture('amoeba', 'The amoeba', 'closed a pseudopod round you into a food vacuole'); }
    if (kind === 'uv') startCapture('uv', 'UV-B from the sunlit surface', 'darkened and cracked your capsid and broke your DNA');
    if (kind === 'cut') { if (P.mode !== 'inside') debug.inside('A'); const e = inside.enzymes[0]; e.pos.copy(inside.tip()).add(new THREE.Vector3(14, -6, 0)); P.cutBy = e; startCapture('cut', 'The host\'s restriction enzyme', 'found a recognition site and cut your DNA'); }
    use(team[0]);
  }),
  /** Move player `slot` to x, y. */
  place: (slot, x, y) => { const m = team[slot]; if (!m) return; use(m); P.pos.set(x, y, 0); P.vel.set(0, 0, 0); t4.group.position.copy(P.pos); t4.resetFibres(t); use(team[0]); },
  hungry() { hunger.update(1e6); while (!hunger.hungry) hunger.update(1e6); },
  overlay(on) { view.overlay = on; inside.setRadar(on); },
  look(i) { features.set('look', LOOKS[i]); },
  zoom(i) { view.zoom = i; view.dist = ZOOMS[i]; },
  reset: resetLevel,
});
window.__micro = {
  get P() { return team[0].P; }, get t4() { return team[0].t4; }, get capture() { return team[0].capture; },
  team, players, split, world, inside, view, debug, features, hunger, post, get t() { return t; },
  get nearBack() { return nearBack; }, get where() { return members().some((m) => m.P.mode === 'inside') ? 'inside' : 'outside'; },
};
// the roster: from the shell (embed), or P1 alone; joins keep coming during play
if (embed.players) players.fromJSON(embed.players);
embed.on('players', (r) => { players.fromJSON(r); syncTeam(); hud.players(players.list); });
syncTeam();
hud.players(players.list);
resetLevel();
requestAnimationFrame((n) => { last = n; frame(n); });

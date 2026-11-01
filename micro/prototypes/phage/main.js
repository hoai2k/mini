// Phage prototype (Level 6 of the Zoom Chain): a T4-like tailed phage in bog
// water, drawn in realistic microscopic false light (the Goodsell watercolour,
// cryo-EM and fluorescence looks remain on the D-pad). LS drives a soft,
// wobbly drift (a labelled departure: phages have no motor); Brownian motion,
// the flow and slow tumbling act on top. Move attachment-fibres first and grab
// a protruding protein (X): a matching receptor latches and starts injection.
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
import { createCapture, createFight } from '../shared/predation.js';
import { createPost, goodsellShared, toonMaterial, inkedInstanced, setInkVisible } from '../shared/techniques/phage-goodsell.js';
import { createT4, t4LiteGeometry, T4_FL } from '../shared/techniques/phage-model.js';
import { createWorld, uvAt, progressAt, FIELD_R, START, UV_SHAFTS, DIRECTOR, encounterSpecs, canPlace, bystanderClear } from './world.js';
import { createDirector } from '../shared/director.js';
import { createPortalGlow, createPortalLight } from '../shared/portal.js';
import { createQuality } from '../shared/quality.js';
import { createInside, GENOME_NODES } from './inside.js';
import { attachmentForward, aimedProtein } from './binding.js';
import { createKicks } from './kicks.js';
import { beadMesh, beadMaterial, beadTemplate, PALETTE } from '../shared/techniques/phage-beads.js';

const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const UP = new THREE.Vector3(0, 1, 0), AX_X = new THREE.Vector3(1, 0, 0), AX_Z = new THREE.Vector3(0, 0, 1);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();

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
  onChange: ({ scale, level }) => { qScale = scale; qLevel = level; post.quality = level; resize(); applyInk(); try { world.setCrowdLevel(SOFT_GL ? 0 : level); } catch { /* (before the world exists) */ } } });
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
  onJoin: (p) => { syncTeam(); hud.toast(`Player ${p.slot + 1} joined`); hud.players(players.list); embed.join(p.slot, p.color, p.name); },
  onLeave: (p) => { syncTeam(); hud.toast(`Player ${p.slot + 1} left`); hud.players(players.list); embed.leave(p.slot); },
});
const pad = players.pad(0);
let ctl = players.controls(0);
const hud = mountHud({
  title: 'Phage',
  sub: 'A T4-like phage, 0.2 µm long, in bog water beside its host bacteria: a molecular illustration, not a microscope image. Drift with LS; let go and Brownian motion has you.',
  controls: hudControls({
    move: 'Drift across the view, fibres leading (a labelled departure: phages have no motor)',
    camera: 'Turn the view round you (no up or down; it stays where you leave it)',
    analog: 'Drift into the view (RT) / back toward you (LT)',
    dash: 'Current gust (departure) · on a surface: push off with the fibres',
    attack: 'Grab a protein with the leading fibres: gold three-lobed receptors bind and inject (Host A\'s, the way on: Y); violet pairs slip off · at an amoeba lobe: fibre jab',
    defend: 'Defend: fold the fibres and slip (the amoeba gets no purchase; past clay and wrong hosts) / extend (grab receptors with X)',
    special: 'At Host A\'s gold receptor (the way on): enter it · elsewhere: odds and receptor overlay (data, not optics)',
    look: 'Look: realistic false light, Goodsell watercolour, cryo-EM greyscale, fluorescence',
    zoom: 'Zoom in / out',
    extra: [['Y', 'At the flagellum (backdoor): back to the sediment']],
  }),
  note: 'Time is slowed about 20× (a phage crosses a host cell in ~0.04 s). Molecules strike you now and then: each knock is Brownian motion you can see. Head out any way you like: two decoy hosts come your way one after the other, then the way on: a golden glow on Host A\'s gold receptor, guarded by an amoeba\'s lobe (its light spills in from the edge of the view once placed). All through the water: humic flocs (fold your fibres, B, to slip through), big bacteria of other kinds, and violet UV shafts (touch one and you are damaged at once: keep out of the light). Lure it off, or fold and jab it (X) until it gives up, then press Y at the receptor to enter and get the whole genome in past the host\'s defences. Nothing runs down while you explore. Up to four players: press any button on another controller to join.',
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
const POST_LOOK = [3, 0, 1, 2]; // createPost's look index for each
const isFL = () => view.look === 0;
const ZOOMS = [60, 110, 180, 290];
// The camera's orientation is a quaternion turned about its own axes by RS (no yaw/pitch angles, no
// lookAt and no up vector, so there is no pole to flip at); nothing turns it unless a stick is held,
// apart from an optional, gentle roll that keeps the sunlit surface toward the top of the screen.
const view = { look: 0, zoom: 1, q: new THREE.Quaternion(), overlay: false, ink: true, art: true, target: new THREE.Vector3(), dist: 180, iso: null, lookHold: 0, level: true, turnRate: 0 };
const opts = { drive: true, brownian: true, kicks: true, tumble: true, uv: true, amoeba: true };

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
  pos: START.clone(), vel: new THREE.Vector3(), bvel: new THREE.Vector3(), kv: new THREE.Vector3(), gust: new THREE.Vector3(),
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
function makeMember(slot, color) {
  const m = { slot, color, P: newP(), t4: createT4({ clip: true }), dash: createDash({ duration: 0.5, cooldown: 2.4 }),
    capture: null, c: { active: false, phase: null, t: 0 }, jab: 0, kicks: createKicks({ rate: 1.7 }) };
  // caught: strike, hold, eat (the camera pulls back), follow the predator, fade, respawn, fade in
  m.capture = createCapture({ onRespawn: () => afterCatch(m) });
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

features.add({ id: 'lookFL', group: 'Rendering', label: 'Look (D-pad ←→)', choices: LOOKS, value: LOOKS[0],
  about: 'Realistic false light (the default): realistic biological surfaces and translucent materials lit by a hypothetical light, as in micro/design/phage-visual-style.html: the phage glows gold against teal-blue translucent cells covered in surface proteins, in a crowded, softly lit molecular water with haze, bloom and a large depth of field (only far layers soften). No microscope makes this picture: the light is invented. Goodsell watercolour: crowded, colour-coded molecules with ink outlines, flat soft light and depth by desaturation, after David Goodsell\'s paintings. Cryo-EM greyscale: what cryo-electron tomography really gives (Hu et al. 2015 [S99]): protein density dark on grey, a bright defocus fringe, heavy shot noise. Fluorescence: every protein glowing as if tagged, a pseudo-colour fantasy (no light microscope resolves a phage). All three are illustrations.',
  onChange: (v) => { view.look = Math.max(0, LOOKS.indexOf(v)); applyStyle(); } });
features.add({ id: 'capsid2', group: 'Rendering', label: 'Capsid', choices: ['Cutaway', 'Translucent', 'Solid'], value: 'Translucent',
  about: 'Translucent (the default): the capsid as a glassy, faceted shell, the DNA glowing inside. Cutaway: the half of the head facing you is clipped away, showing the DNA packed inside as a coaxial spool (~169 kbp, about 57 µm of DNA in a 0.12 µm head [S98]). Translucent: the capsid as a glassy shell. Solid: as it would look from outside.',
  onChange: (v) => { capsidMode = v.toLowerCase(); for (const m of members()) m.t4.set({ capsid: capsidMode }); applyInk(); } });
features.add({ id: 'ink', group: 'Rendering', label: 'Ink outlines', on: true, about: 'An inverted-hull outline around every molecule, fading with depth, as in a Goodsell painting (Goodsell, cryo-EM and fluorescence looks; false light has none). Hidden hulls cost nothing.', onChange: (on) => { view.ink = on; goodsellShared.uInkOn.value = on ? 1 : 0; applyInk(); } });
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
  about: 'T4 diffuses with D ≈ 4 µm²/s [S100]. On the ~20× slowed clock that is ~0.2 µm²/s. You feel it as discrete kicks from molecules striking you (Molecular kicks); the water round you jostles thermally (the small molecules fastest), and the hosts and the amoeba\'s edge drift. Off: no kicks, and the phage drifts only where you steer it.',
  onChange: (on) => { opts.brownian = on; world.opts.hostBrownian = on; for (const b of world.baths) b.uniforms.uJit.value = on ? b.jit0 : 0; } });
features.add({ id: 'tumble', group: 'Motion', label: 'Slow tumbling', on: true,
  about: 'A 0.1 µm particle forgets its orientation within about a millisecond (rotational diffusion ~1.3 × 10³ rad²/s). Here it turns slowly instead, so you can see the phage (a labelled departure).',
  onChange: (on) => { opts.tumble = on; } });
features.add({ id: 'uv', group: 'Simulation', label: 'UV sunfleck shafts', on: true,
  about: 'Sunlight UV-B damages phage DNA. In humic bog water it is absorbed within centimetres (10 % left at 1.5 cm in the most humic lake [S104]); where a gap in the floating peat mat lets the sun through, a shaft of it reaches down. Here the shafts are visible violet columns on a shell round the start: touch one and your DNA is damaged at once (a second touch while damaged destroys you). No slow drain: away from the shafts you are safe for as long as you like. Off: the shafts are harmless light.',
  onChange: (on) => { opts.uv = on; } });
features.add({ id: 'amoeba', group: 'Simulation', label: 'Amoeba on guard', on: true,
  about: 'The way on (Host A\'s gold receptor) is guarded by an amoeba grazing beside it: its lobe hovers over the receptor. Come near and it reaches for you (and rears before it strikes); it follows you only so far and is slower than you. Lure it off and slip round, or fold your fibres (B) so its strike slides off and jab it (X) until it gives up and draws its lobe back for good. Grabbing the receptor while it is on guard turns you back. Off: no guard. Amoebae grazing on viruses is [Unverified] in the spec.',
  onChange: (on) => { opts.amoeba = on; } });
features.add({ id: 'crowd', group: 'World', label: 'Crowded water', on: true,
  about: 'Thousands of molecules (proteins, humic colloids, sugars, ions) as bead clusters, jostling and tumbling, pushed by gusts and by your passage, filling the water in every direction and round every split view (they wrap round each view on the GPU). Small solutes are drawn several times too large so they read, and the water is far more crowded than a real bog (departures).',
  onChange: (on) => { world.opts.crowd = on; } });
features.add({ id: 'kicks', group: 'Motion', label: 'Molecular kicks', on: true,
  about: 'Brownian motion made visible: now and then a molecule from the water strikes you and rebounds, leaving a small push and a little spin (small ions and sugars often and lightly, a protein rarely and harder). Real phages are struck about 10^13 times a second and the sum is a smooth random walk [S100]; a few drawn hits are a labelled departure. While you aim at a protein the spin is softened, so a kick never wrecks a grab.',
  onChange: (on) => { opts.kicks = on; } });
features.add({ id: 'level', group: 'Controls', label: 'Keep the surface up', on: true,
  about: 'The water has no up or down for a phage, and RS turns the view freely about its own axes (a quaternion: no pole to flip at, and it never turns on its own). On: a gentle roll keeps the sunlit surface, where the UV is, toward the top of the screen; it fades out when you look straight up or down, so it can never spin the view. Off: the view rolls only when you turn it.',
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
/** The sticks in the water: LS across the view (its right and up, in 3D), the triggers into and out of it. */
function stickWorld(ls, depth, out) {
  out.copy(camRight(_w)).multiplyScalar(ls.x).addScaledVector(camUp(_n), -ls.y).addScaledVector(camFwd(_s), depth);
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
  P.vel.set(0, 0, 0); P.bvel.set(0, 0, 0); P.kv.set(0, 0, 0); P.gust.set(0, 0, 0); P.angVel.set(0, 0, 0);
  m.kicks.reset();
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
  if (m.P === P) say(`${players.get(m.slot)?.name || 'P' + (m.slot + 1)} drifts back in${mate ? ' beside a teammate' : ''}.`, 2000, true);
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
  ringLog.length = 0; director.reset(); drift.idle = 0;
  inside.reset();
  resetStray();
  progeny.setCount(0);
  card.classList.remove('show');
  P.burstSent = false;
  view.target.copy(P.pos); view.q.identity(); view.lookHold = 0;
  // in the game shell its intro has already said this
  if (!embed.active || started) say('You are a T4-like phage in bog water. Drift with LS (RT/LT: into or out of the view), turn the view with RS. Head out any way you like: what waits comes to meet you, whichever way you go. Last, a golden glow marks the way on.', 4800, true);
  started = true;
}

// --- death and capture sequences ---
function startCapture(kind, by, how) {
  if (capture.active) return;
  P.kind = kind;
  P.lostAt = kind === 'cut' || kind === 'dud' ? (P.commitHost || P.coHost || { pos: P.pos }).pos.clone() : P.pos.clone();
  P.mode = kind === 'cut' ? 'inside' : 'dead';
  capture.start({ by, how });
  curPad().rumble(400, 0.6, 0.9);
  if (isMulti()) embed.captured({ player: cur.slot, kind });
  audio.play(kind === 'amoeba' ? 'bacterium/graze' : kind === 'cut' ? 'bacterium/tumble' : 'bacterium/eat', { volume: 0.9 });
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
  P.mode = 'commit'; P.commitT = 0; P.commitHost = P.host; P.host.locked = true;
  say('Receptor fits: fibres latch, the baseplate opens and the sheath injects…', 3200, true);
  audio.play('bacterium/phage', { volume: 0.9 });
  curPad().rumble(250, 0.3, 0.5);
}
function tryGrab() {
  if (!['drift', 'walk', 'clay'].includes(P.mode) || P.grabCooldown > 0) return;
  if (P.foldTarget > 0.5 || P.fold > 0.5) { say('Extend the fibres (B) before grabbing a protein.', 1800, true); return; }
  if (P.mode === 'clay') { say('Fold the fibres (B) to slip free of the clay first.', 1800, true); return; }
  // A second player may try a wrong protein, but cannot enter an occupied host phase.
  const aimed = aimedProtein(P.pos, attachmentForward(P.q), world.proteins, (target) => world.toWorld(target.host, target.local));
  if (aimed && world.portal && aimed.host === world.portal.host && guarded()) {
    // the way on, on guard: turned back (the lobe shoves you off the receptor)
    const n = world.dirToWorld(aimed.host, aimed.normal, new THREE.Vector3());
    P.gust.addScaledVector(n, 60).addScaledVector(_v.subVectors(P.pos, world.amoeba.center).normalize(), 25);
    P.grabCooldown = 0.6; curPad().rumble(160, 0.4, 0.5); audio.play('bacterium/tumble', { volume: 0.6, rate: 0.8 });
    say('Turned back: the amoeba\'s lobe guards this receptor. Lure it away, or fold (B) and jab (X) until it gives up.', 3200, true);
    ringLog.push({ kind: 'turnedBack', t: +t.toFixed(2), slot: cur.slot });
    return;
  }
  // the way on is entered on purpose, with Y (the owner, 1 Nov 2026: "Press Y to enter portal", never an automatic door)
  if (aimed && aimed.compatible && world.portal && aimed.host === world.portal.host) { say('The way on: press Y to enter Host A.', 2000, true); P.grabCooldown = 0.25; return; }
  const protein = aimedProtein(P.pos, attachmentForward(P.q), world.proteins,
    (target) => world.toWorld(target.host, target.local));
  if (!protein) { cur.jab = 0.45; P.grabCooldown = 0.25; say('No protein in reach: aim the leading fibres closer to a protruding protein, then X to grab.', 1800, true); return; }
  if (protein.compatible && members().some((m) => m !== cur && ['grab', 'commit', 'inside', 'burst'].includes(m.P.mode) && (m.P.mode !== 'grab' || m.P.grab?.protein.compatible))) {
    say('A teammate is already attaching or injecting: wait for them.', 1800, true); return;
  }
  releaseAnchors(); P.host = null; P.canCommit = false;
  P.grab = { protein, time: 0, from: P.pos.clone(), q: P.q.clone() };
  P.mode = 'grab'; P.vel.set(0, 0, 0); P.bvel.set(0, 0, 0); P.gust.set(0, 0, 0);
  audio.play('bacterium/tumble', { volume: 0.35, rate: 1.4 });
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
    say('The fibres close, but this protein does not fit: you slip off. Try a gold three-lobed receptor.', 2300, true);
    audio.play('bacterium/tumble', { volume: 0.65, rate: 0.8 }); curPad().rumble(100, 0.15, 0.25);
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
  if (guarded()) {
    const n = world.dirToWorld(protein.host, protein.normal, new THREE.Vector3());
    P.gust.addScaledVector(n, 60).addScaledVector(_v.subVectors(P.pos, world.amoeba.center).normalize(), 25);
    curPad().rumble(160, 0.4, 0.5); audio.play('bacterium/tumble', { volume: 0.6, rate: 0.8 });
    say('Turned back: the amoeba\'s lobe guards this receptor. Lure it away, or fold (B) and jab (X) until it gives up.', 3200, true);
    ringLog.push({ kind: 'turnedBack', t: +t.toFixed(2), slot: cur.slot });
    return true;
  }
  if (members().some((m) => m !== cur && ['grab', 'commit', 'inside', 'burst'].includes(m.P.mode) && (m.P.mode !== 'grab' || m.P.grab?.protein.compatible))) {
    say('A teammate is already attaching or injecting: wait for them.', 1800, true); return true;
  }
  P.foldTarget = 0; P.fold = Math.min(P.fold, 0.5);
  releaseAnchors(); P.host = null; P.canCommit = false;
  P.grab = { protein, time: 0, from: P.pos.clone(), q: P.q.clone() };
  P.mode = 'grab'; P.vel.set(0, 0, 0); P.bvel.set(0, 0, 0); P.gust.set(0, 0, 0);
  ringLog.push({ kind: 'enter', t: +t.toFixed(2), slot: cur.slot });
  audio.play('bacterium/tumble', { volume: 0.35, rate: 1.4 });
  return true;
}
let nearPortal = false;
/** The shell's "Y Enter the portal" prompt: on while any player is in the area and the guard is away. */
function updatePortalPrompt(where) {
  const on = where === 'outside' && !!world.portal && !guarded() && members().some((m) => portalReceptorNear(m));
  if (on !== nearPortal) { nearPortal = on; embed.near('portal', on, 'Enter Host A (Y)'); }
}

// --- per-mode updates ---
const flow = new THREE.Vector3();
let t = 0;
function updateDrift(dt, inp) {
  const drive = _v.set(0, 0, 0);
  if (inp.stick && opts.drive) drive.copy(inp.stick).multiplyScalar(30 * inp.stickM);
  P.vel.lerp(drive, 1 - Math.exp(-dt * 1.6));
  // Brownian motion: the kicks (kicks.js) leave a velocity that the viscous water takes away again
  P.kv.multiplyScalar(Math.exp(-dt / 0.45));
  P.gust.multiplyScalar(Math.exp(-dt * 2.2));
  world.flowAt(P.pos, t, flow);
  P.pos.addScaledVector(P.vel, dt).addScaledVector(P.kv, dt).addScaledVector(P.gust, dt).addScaledVector(flow, dt);
  softBounds(dt);
  // rotation: damped by the water; a slow thermal tumble while idle
  P.angVel.multiplyScalar(Math.exp(-dt / 0.7));
  if (opts.tumble && !inp.stick) { const k = 0.14 * Math.sqrt(dt); P.angVel.x += gauss() * k; P.angVel.y += gauss() * k; P.angVel.z += gauss() * k; }
  const mv = _w.copy(P.vel).add(P.gust);
  const sp = mv.length();
  // close to a cell with the fibres out, they catch the water near it and swing the baseplate round to face it
  const near = world.nearestHost(centreOf(new THREE.Vector3()));
  const facing = !inp.stick && near.host && near.d < 45 && P.fold < 0.5;
  if (facing) {
    world.sdHost(near.host, P.pos, _s);
    turnBaseToward(_s.negate(), dt * (1 - near.d / 45) * 1.6);
  } else if (sp > 4) turnBaseToward(mv.normalize(), dt * Math.min(1, sp / 25) * 3.0); // steering: the fibres lead
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
    if (sd < 11) { P.pos.addScaledVector(_n, 11 - sd); const vn = P.vel.dot(_n); if (vn < 0) P.vel.addScaledVector(_n, -vn); }
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
    if (!was) { say('Fibres snagged in a humic floc: it drags you in. Fold them (B) to slip through.', 2600, true); curPad().rumble(140, 0.3, 0.2); audio.play('bacterium/tumble', { volume: 0.45, rate: 0.7 }); }
  } else P.snagT = 0;
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
  P.mode = 'clay'; P.clayT = 0;
  for (let f = 0; f < 6; f++) { const tip = t4.tip(f); if (world.sdClay(tip) < 4) { P.stuckTip[f] = tip.clone(); t4.fibres[f].anchor = P.stuckTip[f]; } }
  P.vel.set(0, 0, 0); P.gust.set(0, 0, 0);
  audio.play('bacterium/tumble', { volume: 0.5, rate: 0.8 });
  say('Fibres stuck to a clay platelet. Fold them (B) to slip free.', 3000, true);
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
  say(isMulti() ? 'UV broke your DNA: you are DAMAGED. Alone your injection fails; inject into the same host as a teammate and your genomes recombine (multiplicity reactivation). More UV is fatal.'
    : 'UV broke your DNA: you are DAMAGED. Alone your injection fails. Another damaged phage is drifting nearby: find it, pair with it and co-infect a host together. Another shaft is fatal.', 5200, true);
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
      if (o === team[0] || isMulti()) say('The stray damaged phage drifts along with you: co-infect a host together and your broken genomes can recombine.', 3600, true);
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
    startCapture('dud', 'Alone, your UV-damaged genome', 'could not replicate, and the host broke it down');
  } else if (P.msgT <= 0 && isMulti()) { say(`P${cur.slot + 1}'s damaged genome waits in ${h.name} (${Math.ceil(limit - P.coT)} s): a teammate injecting there revives it.`, 2200); P.msgT = 6; }
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
    P.snapped = false;
    const partners = waitingOn(h, cur);
    const strayJoins = stray.paired === cur && stray.host === h && !stray.used;
    if (P.damaged && !partners.length && !strayJoins) {
      // a damaged genome alone cannot work: wait in the host for a partner
      P.mode = 'coinfect'; P.coHost = h; P.coT = 0; P.fade = 0; h.locked = false;
      stray.log.push(`P${cur.slot + 1} damaged and alone in ${h.name}: waiting (t=${t.toFixed(1)})`);
      say(isMulti() ? 'Your damaged genome is in, but cannot work alone. A teammate who injects into this host will recombine with it.'
        : 'Your damaged genome is in, but cannot work alone, and no second phage came with you…', 4000, true);
      return;
    }
    if (strayJoins) { stray.used = true; stray.t4.group.visible = stray.t4.fibreMesh.visible = false; }
    for (const o of partners) reviveBeside(o, h);
    if (P.damaged) {
      P.damaged = false; P.integrity = 1; P.dark = 0; P.crack = 0; P.wreck = 0;
      stray.log.push(`P${cur.slot + 1} revived inside ${h.name} by multiplicity reactivation with ${strayJoins ? 'the stray' : 'P' + (partners[0].slot + 1)} (t=${t.toFixed(1)})`);
    }
    if (partners.length || strayJoins) say(`Multiplicity reactivation: two damaged genomes recombined into one that works${partners.length ? `: P${partners.map((o) => o.slot + 1).join(', P')} is whole again` : ''}.`, 3600, true);
    P.mode = 'inside';
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
  const m = team.find((o) => o.slot === p.id);
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
const director = createDirector({ ...DIRECTOR, canPlace, entries: encounterSpecs(leadPos).map((e) => ({ ...e, ...ENC[e.id] })) });
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
  const L = director.leader, lm = (L && team.find((o) => o.slot === L.id)) || out[0] || team[0];
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
  portalGlow.setOpen(!guarded());
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
  audio.play('bacterium/sprint', { volume: 0.7, rate: 1.4 });
  curPad().rumble(140, 0.5, 0.4);
  say(gone ? 'Jabbed again: the amoeba gives up and draws its lobe back.' : 'Fibre jab: the lobe flinches back (a departure: a phage has no weapon).', 2000, true);
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
  if (fightState === 'guard') { fightState = 'stalk'; if (P.msgT <= 0) { say('The amoeba beside Host A reaches its lobe for you: it guards the gold receptor. Lure it off and slip round, or fold (B) and jab (X) until it gives up.', 3600, true); P.msgT = 4; } }
  const toward = _w.subVectors(c, am.tip);
  const d = toward.length();
  toward.normalize();
  const dirTo = new THREE.Vector3().subVectors(am.tip, P.pos).normalize();
  const base = axisOf(new THREE.Vector3()).negate();
  const facing = base.dot(dirTo) > 0.35 || (P.lastStickT > 0 && P.lastStick && P.lastStick.dot(dirTo) > 0.5);
  const blocking = P.foldTarget > 0.5;
  const f = fight.update(dt, { near: d < 140, inReach: d < REACH, facing: facing || (blocking && d < REACH), blocking });
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
  if (f.blocked) { P.gust.addScaledVector(toward, 40); curPad().rumble(160, 0.4, 0.6); audio.play('bacterium/tumble', { volume: 0.6, rate: 0.8 }); say('Folded and slippery: the lobe slides off you.', 1800, true); }
  if (f.retreated) { guard.gone = true; say('The amoeba gives up and draws its lobe back for good: the gold receptor is open.', 3200, true); ringLog.push({ kind: 'guardGone', t: +t.toFixed(2) }); }
  const goal = d - standoff;
  am.tip.addScaledVector(toward, Math.sign(goal) * Math.min(Math.abs(goal), sp * dt));
  // never further than its leash from its post
  const off = _w.subVectors(am.tip, post);
  if (off.length() > LEASH * 0.8) am.tip.copy(post).addScaledVector(off.normalize(), LEASH * 0.8);
  am.reach = am.tip.distanceTo(am.base);
  am.posture(posture);
  world.drawPod(am.reach, am.base, am.tip, open);
  if (f.hit) startCapture('amoeba', 'The amoeba', 'closed its lobe round you into a food vacuole');
  if (f.state === 'windup' && f.t < 0.15 && P.msgT <= 0) { say('The lobe rears and curls to strike: fold your fibres (B) to slip, or jab it (X)!', 2400, true); P.msgT = 3; }
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
        `<b>${h.name}</b><br>receptors: ${h.receptors}<br>defences: ${h.defence}<br>odds of a burst if you commit: <b>${Math.round(h.odds * 100)} %</b>`, camera);
    }
    { const near = UV_SHAFTS.reduce((a2, sh) => (sh.c.distanceTo(view.target) < a2.c.distanceTo(view.target) ? sh : a2));
      placeLabel('uv', near.b, 'UV-B sunfleck: sunlight through a gap in the floating peat mat · touch it: damaged at once', camera); }
    if (world.portal) placeLabel('am', world.amoeba.center.clone().addScaledVector(camUp(_s), world.amoeba.r * 0.7), `amoeba: <b>${guard.gone ? 'driven off' : guarded() ? 'on guard' : 'lured off its post'}</b><br>its lobe follows you ~${(LEASH / 100).toFixed(1)} µm from the receptor`, camera);
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
let last = performance.now();
let blocked = false;
let nearBack = false;
const ZERO_LS = { x: 0, y: 0, m: 0 }, ZERO_LOOK = { yaw: 0, pitch: 0, m: 0 };
const outsideModes = ['drift', 'walk', 'clay'];

// --- Brownian kicks (kicks.js): molecules striking the phage and rebounding ---
const KICK_MODES = { drift: 1, walk: 0.35, clay: 0.25 };
const kickMat = beadMaterial({ sat: 1 });
const kickMeshes = Object.fromEntries([['small', beadTemplate('small', 9)], ['chain', beadTemplate('chain', 9)], ['globule', beadTemplate('globule', 9, PALETTE.periwinkle)]]
  .map(([k, tpl]) => { const bm = beadMesh(tpl, 32, { material: kickMat, dynamic: true }); scene.add(bm.mesh); return [k, bm]; }));
// a soft ring where a molecule strikes (camera-facing, additive), pooled
const pingGeo = new THREE.RingGeometry(0.55, 1, 24);
const pings = Array.from({ length: 12 }, () => { const mm = new THREE.Mesh(pingGeo, new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); mm.visible = false; mm.renderOrder = 5; scene.add(mm); return { mesh: mm, t: 1, s: 1 }; });
let pingNext = 0;
const kickLog = []; // the last few hits (tests read it)
function stepKicks(m, dt, on) {
  const k = KICK_MODES[P.mode] || 0;
  if (!on || !k || !opts.brownian || !opts.kicks) { if (!on || !opts.kicks || !opts.brownian) m.kicks.reset(); return; }
  const ax = axisOf(new THREE.Vector3());
  const body = { a: _v.copy(P.pos).addScaledVector(ax, 3).clone(), b: P.pos.clone().addScaledVector(ax, 21 * P.scale), r: 6 };
  // fair: while the fibres are aimed at a protein in reach, the spin is softened (a kick never wrecks a grab)
  const aiming = aimedProtein(P.pos, attachmentForward(P.q), world.proteins, (q) => world.toWorld(q.host, q.local)) != null;
  const hits = m.kicks.step(dt, body, { scale: k, spinScale: aiming ? 0.3 : 1 });
  for (const h of hits) {
    P.kv.add(h.dv); P.angVel.add(h.dw);
    if (P.mode === 'walk') P.bvel.addScaledVector(h.dv, 0.5);
    const big = h.kind === 'globule';
    players.pad(m.slot).rumble(big ? 90 : 45, big ? 0.22 : 0.08, big ? 0.3 : 0.14);
    if (big) audio.play('bacterium/tumble', { volume: 0.18, rate: 1.9 });
    const pg = pings[pingNext++ % pings.length];
    pg.mesh.position.copy(h.at); pg.t = 0; pg.s = big ? 5 : 3; pg.mesh.visible = true;
    kickLog.push({ t: +t.toFixed(2), slot: m.slot, kind: h.kind, dv: +h.dv.length().toFixed(2), dw: +h.dw.length().toFixed(3) });
    if (kickLog.length > 40) kickLog.shift();
  }
}
/** Draw every member's flying molecules and the strike rings. */
function drawKicks(dt) {
  const n = { small: 0, chain: 0, globule: 0 };
  for (const mm of members()) for (const f of mm.kicks.flying) {
    const bm = kickMeshes[f.k.kind];
    if (n[f.k.kind] >= bm.count) continue;
    const fade = f.hit ? Math.max(0, 1 - f.age / f.life) : Math.min(1, f.age * 6);
    bm.set(n[f.k.kind]++, f.p, f.q, f.k.size * (0.4 + 0.6 * fade));
  }
  for (const [k, bm] of Object.entries(kickMeshes)) { bm.setCount(n[k]); if (n[k]) bm.commit(); }
  for (const pg of pings) {
    if (!pg.mesh.visible) continue;
    pg.t += dt * 3.2;
    if (pg.t >= 1) { pg.mesh.visible = false; continue; }
    pg.mesh.material.opacity = 0.55 * (1 - pg.t);
    pg.mesh.scale.setScalar(pg.s * (0.4 + pg.t));
    pg.mesh.quaternion.copy(camera.quaternion);
  }
}

function stepMember(m, dt, insideOwner, where) {
  use(m);
  P.msgT -= dt;
  dash.update(dt);
  const pl = players.get(m.slot);
  const idle = blocked || !pl || pl.waiting;
  const ls = idle ? ZERO_LS : ctl.move();
  const depth = idle ? 0 : ctl.rt() - ctl.lt();
  const inp = { stick: null, stickM: 0 };
  const mag = Math.min(1, Math.hypot(ls.m, depth));
  if (mag > 0.05) { inp.stick = stickWorld(ls, depth, new THREE.Vector3()).normalize(); inp.stickM = mag; P.lastStick = inp.stick.clone(); P.lastStickT = 0.3; }
  P.lastStickT = (P.lastStickT || 0) - dt;
  const multi = isMulti();
  const c = capture.update(dt, pad);
  use(m); // (a respawn inside update may have switched members)
  m.c = c;
  const frozen = insideOwner && insideOwner !== m; // a teammate is inside a host: wait
  const live = !idle && !c.active && !debug.freeze && !frozen;
  if (!idle) {
    const lstep = ctl.lookStep();
    if (lstep) { const d = lstep; features.set('lookFL', LOOKS[(view.look + d + LOOKS.length) % LOOKS.length]); say(`Look: ${LOOKS[view.look]} (an illustration, labelled)`, 1800, true); }
    const zs = ctl.zoomStep();
    if (zs) view.zoom = clamp(view.zoom - zs, 0, ZOOMS.length - 1);
    if (ctl.special.pressed()) {
      // (the backdoor and the portal are far apart; whichever this player is in wins, else the overlay)
      if (where === 'outside' && P.inBack && outsideModes.includes(P.mode)) embed.landmark('back', { player: m.slot });
      else if (!(where === 'outside' && live && tryEnter())) { view.overlay = !view.overlay; inside.setRadar(view.overlay); }
    }
  }
  if (live) {
    if (ctl.defend.pressed() && P.mode === 'coinfect') { P.coT = 1e6; }
    else if (ctl.defend.pressed() && outsideModes.includes(P.mode)) {
      P.foldTarget = P.foldTarget > 0.5 ? 0 : 1;
      audio.play('bacterium/tumble', { volume: 0.5, rate: P.foldTarget ? 0.9 : 1.15 });
      say(P.foldTarget ? 'Fibres folded back against the sheath: you slip past clay and cells.' : 'Fibres out: a wider net to catch receptors (and clay).', 1800, true);
      if (P.mode === 'walk' && P.foldTarget > 0.5) leaveSurface(false);
    }
    if (ctl.dash.pressed() && dash.ready && (P.mode === 'drift' || P.mode === 'walk')) {
      dash.trigger();
      const dir = inp.stick ? inp.stick.clone() : attachmentForward(P.q);
      if (P.mode === 'walk') { leaveSurface(true); say('Push-off: the fibres kick you free of the surface (departure).', 1800, true); }
      else { P.gust.addScaledVector(dir, 70); say('A passing current gust carries you (departure: a phage has no motor).', 1800); }
      world.gust(P.pos, dir);
      audio.play('bacterium/sprint', { volume: 0.8 });
      curPad().rumble(120, 0.4, 0.3);
    } else if (ctl.dash.pressed() && P.mode === 'clay') say('Stuck to clay: a gust cannot pull you off. Fold the fibres (B).', 1800, true);
    if (ctl.attack.pressed()) {
      if (!tryJab(m)) tryGrab();
    }
  }
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
  stepKicks(m, dt, !debug.freeze && !c.active && where === 'outside');
  if (P.mode === 'inside' || (P.mode === 'burst' && P.burstT < 2.6)) {
    const ev = inside.update(dt, t, { steer: live && ls.m > 0 ? { x: ls.x, y: -ls.y } : null, surge: live && ctl.dash.pressed() }, c.active || debug.freeze);
    if (P.mode === 'inside' && !c.active) P.fade = Math.max(0, P.fade - dt * 1.5);
    if (ev.surged) { audio.play('bacterium/sprint', { volume: 0.6, rate: 1.2 }); say('A surge: the strand is pulled in faster (departure).', 1400); }
    if (ev.cut && P.mode === 'inside') {
      P.cutBy = ev.cut;
      startCapture('cut', ev.cut.kind === 're' ? 'The host\'s restriction enzyme' : 'The CRISPR-Cas complex', ev.cut.kind === 're' ? 'found a recognition site and cut your DNA' : 'matched its guide to your DNA, and Cas3 chewed the strand');
    }
    if (ev.nearMiss) { say('Near miss! You pulled your end free before Cas3 could cut; the complex loses some of its grip.', 2200, true); curPad().rumble(120, 0.3, 0.5); audio.play('bacterium/tumble', { volume: 0.6, rate: 1.3 }); }
    if (ev.retreat) say('The CRISPR complex lets go and drifts off along the host DNA, for now.', 2400, true);
    if (P.mode === 'inside' && !c.active) {
      const b = inside.bossLock();
      if (b && b.state === 'windup' && P.msgT <= 0) { say('Bound! Its guide blazes and Cas3 swings in: pull your end away (LS, A to surge)!', 2000, true); P.msgT = 3; }
      else if (b && b.match > 0.45 && b.state !== 'windup' && P.msgT <= 0) { say('The guide RNA is glowing: it is matching your DNA. Lead your end away from it.', 2200, true); P.msgT = 4; }
    }
    if (ev.won && P.mode === 'inside') { P.mode = 'burst'; P.burstT = 0; P.burstStarted = false; say('The whole genome is in. Phage genes switch on; the host\'s DNA is broken down…', 3000, true); audio.play('bacterium/eat', { volume: 0.8 }); }
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
      else startCapture('uv', 'A second UV-B shaft', 'darkened and cracked your capsid and broke your DNA past repair');
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
  for (let f = 0; f < 6; f++) t4.fibres[f].reach = m.jab > 0 ? 1.2 * Math.sin((m.jab / 0.45) * Math.PI) : P.mode === 'grab' ? 0.8 : P.mode === 'drift' && inp.stick ? 0.25 : 0;
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
  view.dist = ZOOMS[view.zoom]; view.target.copy(phageCentre());
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
  if (!held) for (const m of members()) stepMember(m, dt, insideOwner, where);
  insideOwner = owner();
  const lead = members().find((m) => m.P.mode === 'burst') || insideOwner || team[0];
  const solo = !isMulti();

  // the amoeba hunts the nearest phage; the crowd moves round the view
  if (where === 'outside' && !debug.iso) {
    if (!debug.freeze) { stepDirector(dt); updateGuard(dt); }
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
    prog.innerHTML = `<span>Genome in · ${Math.round(s.progress * 169)} of 169 kbp</span><i style="width:${(s.progress * 100).toFixed(1)}%"></i>`
      + `<span class="lock">CRISPR-Cas match${b && b.state === 'retreat' ? ' · let go' : lock > 0.99 ? ' · BOUND' : ''}</span><b style="width:${(lock * 100).toFixed(0)}%"></b>`;
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
    embed.near('back', backNow, 'Y: back to Sediment');
    if (backNow && !embed.active) say('The bacterium\'s flagellum sweeping past: Y goes back to the sediment (in the game).', 2600, true);
  }

  // camera: frame the group (solo: your phage)
  const commitFocus = solo && P.mode === 'commit';
  if (look.m > 0.01) view.lookHold = 0.45;
  else view.lookHold = Math.max(0, view.lookHold - dt);
  if (where === 'outside') turnView(look, dt);
  // caught: pull back to watch the predator swallow you, then follow it
  const watching = solo && team[0].c.active && ['eat', 'follow', 'fadeOut'].includes(team[0].c.phase) && team[0].P.kind !== 'cut';
  const wantDist = commitFocus ? Math.min(ZOOMS[view.zoom], 75) : watching ? Math.max(ZOOMS[view.zoom], 110) * 2.1 : ZOOMS[view.zoom];
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
    const dist = o ? o.dist : view.dist * (lead.P.mode === 'burst' ? 1.6 : 1);
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
    inside.frame(dt, look, chewing ? 140 : cutting ? 85 : ZOOMS[view.zoom] * 1.05 + 40, chewing ? insideOwner.P.camFocus : null);
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
    split.update(list, { camera }, dt);
    quality.setSplitViews(split.views.length);
    // the phages' wakes in the bath (molecules make way round each phage, so it always reads)
    world.setWake(debug.iso ? [] : members().filter((m) => m.t4.group.visible).map((m) => { use(m); return { p: centreOf(new THREE.Vector3()), r: 16 * P.scale }; }));
    use(lead);
    drawKicks(dt);
    split.render(camera, (v) => {
      noteView(); // (what this view sees, for the director)
      // each view wraps the bath round its own centre: the water is full in every view, together or apart
      world.viewBath(_v.set(0, 0, -view.dist).applyQuaternion(camera.quaternion).add(camera.position));
      for (const m of members()) m.t4.setCutFrom(camera.position);
      // every internal pass (scene, DOF copy, bloom) scissored to this view's region when split
      post.render(scene, camera, (rt) => split.scissor(v, rt));
    });
    // (shared/landmark.js trips on an empty split region, which splitscreen.js can emit for a frame as players leave)
    if (!debug.iso && lead.P.mode !== 'burst' && split.layout.regions.every((r) => r.polygon && r.polygon.length >= 3)) {
      // no arrow to the way on (the owner: keep moving in any direction and you find it): its golden sparkle is the only marker
      marks.drawSplit(split, world.backdoor.pos, { kind: 'backdoor', label: 'Sediment', range: 600 });
      if (world.portal) {
        const pp = portalPoint(), d = Math.min(...members().map((m) => m.P.pos.distanceTo(pp)));
        portalLight.drawSplit(split, pp, { strength: THREE.MathUtils.clamp(1.2 - d / 1200, 0.5, 1), open: portalGlow.open });
      }
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
  const modeName = { drift: 'drifting legs-first', grab: 'grabbing a surface protein', walk: `walking on ${P.host?.name}${P.bound ? ` · ${P.bound} fibres on OmpC` : ''}`, clay: 'stuck on clay (UV shelter)', commit: 'committed: contracting', coinfect: `damaged genome waiting in ${P.coHost?.name} for a partner (B: give up)`, inside: 'DNA entering the host', burst: 'burst', dead: 'lost' }[P.mode];
  const am = !world.portal ? 'not found yet' : guard.gone ? 'driven off' : ({ guard: 'on guard', stalk: 'REACHING', windup: 'WINDING UP!', strike: 'STRIKING!', recover: 'recovering', repelled: 'repelled', retreat: 'retreating', off: 'off' }[fightState] || fightState) + (guarded() ? '' : ' · receptor OPEN') + ` · interest ${Math.round(fight.interest * 100)} %`;
  const others = isMulti() ? '\n' + members().filter((m) => m.slot).map((m) => `P${m.slot + 1} ${m.P.mode} ${n5(m.P.integrity)}`).join('  ') : '';
  hud.stats(`${goalLine(where)}\n${modeName}\nfibres ${P.foldTarget > 0.5 ? 'folded' : 'extended'}\n${P.damaged ? 'DAMAGED: one more UV shaft is fatal' : 'whole'}  ${dash.text()}\nguard (amoeba) ${am}\n${where === 'inside' ? `genome in ${Math.round(inside.S.progress * 100)} %` : `${(P.pos.distanceTo(START) / 100).toFixed(1)} µm out · encounters ${director.index}/3 (${director.state().phase})`}${others}`);
}

/** The goal, one line, for the stage you are at (the HUD's first line). */
function goalLine(where) {
  if (where === 'inside') return 'GOAL: get the whole genome in · lead your end away from CRISPR-Cas';
  if (P.mode === 'commit' || P.mode === 'burst') return 'GOAL: injecting…';
  if (P.damaged) return 'GOAL: co-infect a host with a partner (the other damaged phage nearby, or a teammate)';
  if (!world.portal) return `GOAL: explore, any direction · ${(P.pos.distanceTo(START) / 100).toFixed(1)} µm out · encounters ${director.index} of 3`;
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
    if (id === 'A' && !world.portal) debug.placePortal();
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
  inside: p1((id = 'A') => { if (id === 'A' && !world.portal) { debug.placePortal(); use(team[0]); } const h = world.hosts.find((x) => x.id === id); P.commitHost = h; P.mode = 'inside'; inside.start(h); inside.setRadar(view.overlay); P.fade = 0; }),
  win: p1(() => { if (P.mode === 'inside') { inside.S.nodes.length = 0; P.mode = 'burst'; P.burstT = 0; P.burstStarted = false; for (let i = 0; i < GENOME_NODES; i++) inside.S.nodes.push(new THREE.Vector3(Math.sin(i * 0.2) * 40, 52 - i * 1.0, 0)); inside.S.prev = inside.S.nodes.map((n) => n.clone()); } }),
  capture: p1((kind, slot = 0) => {
    use(team[slot]);
    if (kind === 'amoeba' && !world.portal) { debug.placePortal(); use(team[slot]); }
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
  kicks: () => kickLog.slice(),
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
  zoom(i) { view.zoom = i; view.dist = ZOOMS[i]; },
  reset: resetLevel,
  boss() { const b = inside.bossLock(); return b ? { state: b.state, match: +b.match.toFixed(2), d: +b.pos.distanceTo(inside.tip()).toFixed(1) } : null; },
});
Object.defineProperty(debug, 'nearPortal', { get: () => nearPortal }); // (is the Y prompt on)
Object.defineProperty(debug, 'fight', { get: () => ({ state: fightState, interest: fight.interest }) });
window.__micro = {
  get P() { return team[0].P; }, get t4() { return team[0].t4; }, get capture() { return team[0].capture; },
  team, players, split, world, inside, camera, view, debug, features, guard, post, get t() { return t; },
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

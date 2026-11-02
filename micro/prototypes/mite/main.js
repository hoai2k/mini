// Mite prototype: a box mite walking through a moss cushion, imaged as if in
// a scanning electron microscope. Units are µm throughout.
import * as THREE from '../shared/vendor/three.module.min.js';
import { embed } from '../shared/embed.js';
import { createPlayers, PLAYER_COLORS } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks, portalArrowOn } from '../shared/landmark.js';
import { createLandmarkProps, FORWARD, BACKDOOR, TARDI_LEN } from './landmarks.js';
import { createPseudoscorpion } from './boss.js';
import { createThickets } from './thicket.js';
import { createPortalLight } from '../shared/portal.js';
import { createControls, createDash, hudControls, addInvertY } from '../shared/controls.js';
import { createPredatorAI } from './predator.js';
import { createHunger, createCapture, createFight } from '../shared/predation.js';
import { mountHud } from '../shared/hud.js';
import { createSem, shared, MODES, CLS, gMaterial } from './sem.js';
import { semTextures } from './textures.js';
import { buildWorld, floorH, TILE } from './world.js';
import { RINGS, PORTAL_CLEAR, CLUSTER, CLUSTERS, PRED_GROUND, BOSS, OPENING, NPC_HOME, predZoneAt, distFromStart, bearingFromStart, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, canPlace, BOUNDS, DRIP, FAMILY } from './layout.js';
import { createAmbient, createBeads, createDrops } from './life.js';
import { createDirector } from '../shared/director.js';
import { createQuality } from '../shared/quality.js';
import { createMite, CFG, PRED, JUMP } from './mite.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { createBorrowedLooks, borrowedSwitches, AMOEBA_MODES, DIC_MODES, PARAMECIUM_MODES } from '../shared/techniques/adapters.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const PR = Number(new URLSearchParams(location.search).get('pr')) || 0; // testing override: a fixed pixel ratio, no dynamic resolution
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
// The moss: one scenery tile repeated in every direction (world.js), the rings
// of the encounter pattern laid over it (layout.js).
const world = buildWorld(tex);
scene.add(world.group);
// the moss shoots stand aside where the thickets and the giant springtail are (and, once placed, the portal's arena)
world.exclude.set('thickets', CLUSTERS.map((c) => ({ x: c.x, z: c.z, r: c.r + 100 })));
world.exclude.set('back', [{ x: BACKDOOR.x, z: BACKDOOR.z, r: BACKDOOR.clear }]);
// the portal's golden glow is drawn after the SEM composite (additive, over the micrograph)
const glowScene = new THREE.Scene();
// Shaders are built while the page loads, not on the first frame: each
// sem.warm() links the new programs and draws one object of each kind into a
// G-buffer pixel, and the software renderer builds them in the GPU process
// while the rest of the world is made here (mite-sem.js warm(); no visible change).
sem.warm(scene, camera);
const props = createLandmarkProps(world, tex, { glowScene });
scene.add(props.group);
// The crowd: two rings of hyphal thickets full of springtails (thicket.js, layout.js CLUSTERS)
const thicket = createThickets({ scene, tex, clusters: CLUSTERS.map((c) => ({ ...c, posts: CLUSTER.posts })) });
// The boss: a pseudoscorpion on guard before the leaf axil (boss.js); it is put
// on its post when the portal is placed (placePortal), and worn down it backs
// into the moss to the side.
const boss = createPseudoscorpion(scene, tex, { post: { x: 0, z: 0, a: 0 }, home: { x: 0, z: 0 }, wake: BOSS.wake, leash: BOSS.leash, lose: BOSS.lose });
boss.setVisible(false);
sem.warm(scene, camera);

// The box mite is drawn at about 0.6 mm (mite.js) and placed at 0.58 of that:
// ~0.35 mm long, the size of a small phthiracarid (the Level 1 spec asks for
// ~270-390 µm). Its stride, hop and speeds shrink with it; the moss does not.
const MITE_SCALE = 0.58;
let mite = createMite(scene, world.colliders, { cls: CLS.CUTICLE, tex, scale: MITE_SCALE });
mite.place(0, 0, 0.3);
sem.warm(scene, camera);
const npc = createMite(scene, world.colliders, { cls: CLS.NPC, tex, scale: MITE_SCALE });
npc.place(NPC_HOME.x, NPC_HOME.z, 2.2);
// The box-mite family (the first encounter, placed by the director): three
// more box mites grazing together, which close up as you come. Parked hidden
// until placed.
const family = { home: null, mites: Array.from({ length: FAMILY.n }, (_, i) => {
  const m = createMite(scene, world.colliders, { cls: CLS.NPC, tex, scale: MITE_SCALE * [1.05, 0.9, 0.78][i % 3] });
  m.setVisible(false);
  return { m, ai: { ang: i * 2.1, t: i * 3.3, scared: 0, pause: i * 4 }, input: { dir: new THREE.Vector3(), mag: 0, maxSpeed: 150 * MITE_SCALE, hold: false } };
}) };
// The predator: a parasitid (Mesostigmata), pale, long-legged, hunting by touch.
const pred = createMite(scene, world.colliders, { cls: CLS.NPC, tex, anat: PRED });
// It hunts on its own ground, placed by the encounter director (placeEncounter:
// in moss nobody has seen, a short way ahead of whoever leads), twice. Until
// placed it is hidden, parked in a corner of the square and not stepped.
const A0 = Math.atan2(OPENING.uz, OPENING.ux);
const PRED_PARK = { x: BOUNDS.x1 - 400, z: BOUNDS.z1 - 400 };
const predZone = predZoneAt(PRED_PARK.x, PRED_PARK.z);
const predAI = createPredatorAI(pred, predZone);
let predPlaced = false;
/** Is the predator in play (switched on and placed by the director)? */
const predHere = () => predOn && predPlaced;
const PRED_AT = { x: predZone.x, z: predZone.z };
predAI.reset(PRED_AT.x, PRED_AT.z);
pred.setVisible(false);
sem.warm(scene, camera);

// Local multiplayer (shared/players.js): each player is a box mite of their
// own, with their own dash, wounds and sounds (a record, see makeRec).
// Code that acts on "the" player uses `mite`, `play`, `dash` and `snd`, which
// point at the record being stepped (withRec), and at player 1's otherwise.
const joins = [];
const players = createPlayers({
  max: 4,
  onJoin: (p) => { joins.push({ slot: p.slot, padIndex: p.padIndex }); syncPlayers(); hud.toast(`Player ${p.slot + 1} joined`); embed.join(p.slot, p.color, p.name, players.toJSON()); }, // the roster rides along, so the shell carries this player into the next world
  onLeave: (p) => { syncPlayers(); hud.toast(`Player ${p.slot + 1} left`); embed.leave(p.slot); },
  onChange: (list) => hud && hud.players(list),
});
const pad = players.pad(0);
const ctl = players.controls(0);
let dash = createDash({ duration: 0.6, cooldown: 2.2 });
// Walking speeds (µm/s, world), scaled with the body. The stick is analogue
// (the owner, 2026-11-02): a slight push walks at WALK_MIN (the old walk, 720
// at 0.6 mm), full tilt at WALK_MAX (the old scramble's limit), a quadratic
// curve between (fine control near the slow end); the scramble (B) is DASH,
// ~1.7x the old scramble. The keyboard walks at KEY_WALK on the curve; LB/RB
// (Q/F) reach the slow end and full tilt.
const WALK_MIN = Math.round(720 * MITE_SCALE), WALK_MAX = Math.round(WALK_MIN * 2.1), DASH = Math.round(WALK_MAX * 1.7);
const WALK = WALK_MAX; // full tilt (tests' default)
const KEY_WALK = 0.65;
/** Walking speed (world µm/s) for a stick deflection 0..1 after the pad's dead zone. */
function walkSpeed(m) { return m > 0 ? WALK_MIN + (WALK_MAX - WALK_MIN) * Math.min(1, m) ** 2 : 0; }
const hud = mountHud({
  title: 'Mite · SEM',
  sub: 'A box mite (Phthiracaridae), about 0.35 mm long, in a moss cushion, imaged like a scanning electron micrograph. A predatory mite hunts here.',
  controls: hudControls({
    move: 'Walk (relative to the view); climbs grains, stems and flakes, pushes through blades',
    camera: 'Orbit the specimen (up looks up)',
    dash: 'Jump: a crouch and a hop (borrowed from jumping oribatids); X in the air: a pounce-bite',
    attack: 'Bite: graze spores and hyphal tips (leg I holds them); at the predator, rear up and nip it',
    defend: 'Hold: dash (scramble), ~2x the walk; also breaks a grab in its strike window',
    special: 'Hold: close up (ptychoidy, defend): blocks the predator\'s strike. At the open portal: enter it. At the giant springtail: back up a world',

    secondary: 'Walk slowly / hurry',
    look: 'Imaging mode: SE, BSE, false colour',
    zoom: 'Magnification steps',
    extra: embed.active ? [] : [['LS click', 'Observer: SEM data bar and scan lines']],
  }),
  note: 'A live mite walking in an SEM is a deliberate fiction: real specimens are dried and gold-coated in a vacuum. The mag and scale bar are true to the field of view. Speeds are a game stretch: the walk (~0.42 mm/s) is a few times a real oribatid\'s, and box mites do not jump (zetorchestid oribatids do).',
});

// SEM data bar (observer mode)
const bar = document.createElement('div');
bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:34px;background:#000;color:#e8e8e8;display:none;align-items:center;gap:22px;padding:0 14px;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;z-index:5;white-space:nowrap;overflow:hidden';
document.body.appendChild(bar);
let observer = false;

// Starts at HFW 1.6 mm (~79x): the 0.35 mm mite is about a fifth of the
// field, with the moss around it in view.
const rig = { yaw: -0.6 - Math.PI / 6, pitch: 0.62, hfw: 1600, target: mite.center.clone() };
const camFwd = new THREE.Vector3(), camRight = new THREE.Vector3();

// The quality governor (shared/quality.js) owns the resolution: min(DPR, 1.25)
// alone, 1.0 when split, times its render scale (its step, and 0.7 / 0.55 for
// two / three or more views). The SEM's G-buffer and composite both run at the
// drawing-buffer size, so the scale goes into the pixel ratio. At its cheapest
// effects level the detector-shadow march is skipped.
let qScale = 1, qRatio = 1, qLevel = 2, shadowOn = true;
const quality = createQuality({ renderer: null, key: 'mite', min: 0.35,
  onChange: ({ scale, level, pixelRatio }) => {
    qScale = scale; qRatio = pixelRatio; qLevel = level;
    sem.toggles.shadow = shadowOn && level > 0;
    resize();
  } });
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(PR || Math.max(0.2, qRatio * qScale));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  sem.resize(v.x, v.y);
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- the intro (continuous transitions)
// In the game the springtail's freeze frame pushes in on the mite speck on its
// capitulum while this world fades in under the same framing (embed.js
// "Continuous transitions"). The shell sends `hold`: this world stays frozen
// at its start but renders, reports how its opening view frames the mite
// (embed.opening) and takes the shell's `camera` poses, ending exactly on that
// opening view; on `begin` time eases back in over INTRO_EASE s.
embed.provide('intro');
const INTRO_EASE = 0.6;
let intro = null; // { cam } while held; { ease } while time comes back
const miteLen = () => 2 * Math.max(...mite.radii);
const miteHeading = () => Math.atan2(mite.st.fwd.z, mite.st.fwd.x);
embed.on('hold', () => {
  intro = { cam: null };
  placeCamera(0);
  embed.cinematic(true, canvas);
  embed.opening(embed.poseOf(camera, mite.center, { len: miteLen(), heading: miteHeading(), pitch: rig.pitch, yaw: rig.yaw }));
});
embed.on('camera', (d) => { if (intro && d.pose) intro.cam = d.pose; });
embed.on('begin', () => { embed.cinematic(false, canvas); intro = { cam: null, ease: 0 }; });
/** The camera for a pose from the shell: a dolly (the scan's field of view kept); the rig follows, so play carries on from it. */
function placePoseCamera(pose) {
  const r = embed.poseCamera(camera, pose, mite.center, { len: miteLen(), heading: miteHeading() });
  rig.yaw = r.yaw; rig.pitch = r.pitch;
  rig.target.set(r.target.x, r.target.y, r.target.z);
  rig.viewHfw = 2 * r.halfW;
  const d = r.depth;
  camera.near = Math.max(20, d * 0.08);
  camera.far = d + 9000;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  // the cutaway clears the line of sight to the mite itself (the target may be off it)
  shared.uCutP.value.copy(mite.center).applyMatrix4(camera.matrixWorldInverse);
  shared.uCutR.value = 380 + rig.viewHfw * 0.06;
  world.cut.update(1 / 30, camera.position, mite.center, { radius: 340, margin: 110, keep: cutKeep, period: TILE });
  return d;
}

const cutKeep = new Set();
function placeCamera(dt) {
  const tanH = Math.tan(THREE.MathUtils.degToRad(VFOV) / 2) * camera.aspect;
  // several players: frame the group, a little wider as it spreads (the split screen takes over when they part)
  const mp = multi();
  const gc = mp ? groupCentre(recs()) : null;
  let want = mp ? rig.hfw * (1 + Math.min(0.6, (gc.spread / rig.hfw) * 0.7)) : rig.hfw;
  // a boss fight: the lens widens to keep the pseudoscorpion and its pincers in frame
  const bd = boss.engaged ? boss.center.distanceTo(mp ? gc.c : mite.center) : Infinity;
  if (bd < 3400 && !capture.active && !outro) want = Math.min(4200, Math.max(want, bd * 1.3 + 2600));
  if (!outro) rig.viewHfw = rig.viewHfw === undefined || !dt ? want : rig.viewHfw + (want - rig.viewHfw) * (1 - Math.exp(-dt / 0.4));
  const d = rig.viewHfw / (2 * tanH);
  const k = dt ? 1 - Math.exp(-dt / 0.25) : 1;
  // a catch is framed whole: you and the predator (alone; with company the camera keeps the group)
  if (outro) {
    // through the portal (a hand-off: the tardigrade is the mite's size): the
    // view settles on the tardigrade walking in the water, from the side and
    // height the tardigrade world opens on (NEXT_OPENING), a little wider than
    // it, as the tardigrade turns the way it faces there; the shell's move is
    // then a short push in while the light changes, SEM to DIC. Driven by the
    // outro's own clock (not by frames drawn), so the freeze lands exactly there.
    const f = outro.from, b = THREE.MathUtils.smootherstep(outro.t, 0, OUTRO.beat + OUTRO.ease);
    rig.target.lerpVectors(f.target, props.tardi.center, b);
    rig.hfw = rig.viewHfw = f.hfw + (OUTRO_HFW - f.hfw) * b;
    rig.pitch = f.pitch + (NEXT_OPENING.pitch - f.pitch) * b;
    props.tardi.setHeading(f.h + Math.atan2(Math.sin(rig.yaw - NEXT_OPENING.rel - f.h), Math.cos(rig.yaw - NEXT_OPENING.rel - f.h)) * b);
  } else if (bd < 3400 && !capture.active) {
    // a boss fight: hold both in one shot, from a little higher so the moss does not hide it
    rig.target.lerp(_ct.copy(mp ? gc.c : mite.center).lerp(boss.center, 0.4), k);
    if (rig.pitch < 0.8) rig.pitch += (0.8 - rig.pitch) * k * 0.5;
  }
  else if (mp) rig.target.lerp(gc.c, k);
  else if (capture.active && capture.phase !== 'fadeIn') {
    // close in side-on to the catch: your body and the predator's chelicerae in frame;
    // once it eats, pull back and follow the predator with its meal
    const follow = ['eat', 'follow', 'fadeOut'].includes(capture.phase);
    const capC = cap.byBoss ? boss.center : pred.center;
    rig.target.lerp(follow ? _ct.copy(capC) : _ct.copy(mite.center).lerp(capC, 0.18), k);
    const kc = dt ? 1 - Math.exp(-dt / 0.6) : 1;
    rig.hfw += ((follow ? 2000 : 1000) - rig.hfw) * kc;
    const ax = Math.atan2(capC.z - mite.center.z, capC.x - mite.center.x);
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const side = Math.abs(wrap(ax + Math.PI / 2 - rig.yaw)) < Math.abs(wrap(ax - Math.PI / 2 - rig.yaw)) ? ax + Math.PI / 2 : ax - Math.PI / 2;
    rig.yaw += wrap(side - rig.yaw) * kc;
    rig.pitch += (0.42 - rig.pitch) * kc;
  } else rig.target.lerp(mite.center, k);
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
  cutKeep.clear();
  for (const P of recs()) { const g = P.mite.ground && P.mite.ground.entry; if (g && g.cutId) cutKeep.add(g.cutId); }
  world.cut.update(dt, camera.position, rig.target, { radius: 340, margin: 110, keep: cutKeep, period: TILE });
  return d;
}

/** Centre of the players' mites and their spread (largest distance from it, µm). */
function groupCentre(list) {
  const c = new THREE.Vector3();
  for (const P of list) c.add(P.mite.center);
  c.divideScalar(list.length);
  let spread = 0;
  for (const P of list) spread = Math.max(spread, Math.hypot(P.mite.center.x - c.x, P.mite.center.z - c.z));
  return { c, spread };
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
  if (Math.hypot(c.x - NPC_HOME.x, c.z - NPC_HOME.z) > 1400) ai.ang = Math.atan2(NPC_HOME.z - c.z, NPC_HOME.x - c.x); // it stays in the warm-up
  let dist = Infinity;
  for (const P of recs()) dist = Math.min(dist, c.distanceTo(P.mite.center));
  if (dist < 300 && ai.scared <= 0 && npc.mode === 'walk') ai.scared = 3 + Math.random() * 2;
  ai.scared -= dt;
  ai.pause = (ai.pause + dt) % 14;
  const moving = ai.pause < 10;
  npcIn.dir.set(Math.cos(ai.ang), 0, Math.sin(ai.ang)); npcIn.mag = moving ? 0.6 : 0; npcIn.hold = ai.scared > 0;
  return npcIn;
}

// ---------- threats: pacing and being eaten (shared/predation.js) ----------
// Calm until someone first walks onto its ground (no clock), then hunger that
// comes and goes (the banner says so); only a hungry predator hunts. Its third grab holds on: strike (it seizes a leg), hold (it pulls you
// in; close up, Y, and the grip slips off), eat (its chelicerae work at the
// soft body by the legs, which go limp and fold), then the Eaten card.
const PRED_START = [PRED_AT.x, PRED_AT.z];
const npcIn = { dir: new THREE.Vector3(), mag: 0, maxSpeed: 180 * MITE_SCALE, hold: false };
const pace = { grace: Infinity, mode: 'Comes and goes' };
const hunger = createHunger({ grace: pace.grace });
const isHungry = () => (pace.mode === 'Never' ? false : pace.mode === 'Always' ? hunger.state !== 'grace' : hunger.hungry);
// A catch: strike, hold, eat (pulled in by the chelicerae and swallowed), then
// the camera pulls back and follows the predator for a couple of seconds, a
// fade, and you are back: beside a teammate, or (alone) at your last safe spot.
const capture = createCapture({ onRespawn: () => afterCatch() });
const cap = { phase: null, c0: new THREE.Vector3(), q0: new THREE.Quaternion(), leg: 0, heldOnce: false, t: 0 };
function afterCatch() {
  const P = cap.who || P1;
  P.mite.setVisible(true);
  if (cap.byBoss) { boss.release(); cap.byBoss = false; }
  pred.st.chel = 0;
  predAI.state = 'wander'; predAI.bored = 14; predAI.ang += Math.PI; predAI.rear = 0;
  fight.reset();
  if (multi()) respawnNear(P);
  else {
    // the last safe spot, or (none yet clear of the predator) a little back toward the start on the same bearing
    const c = P.mite.center, d = distFromStart(c.x, c.z), back = Math.max(0, d - 1500) / Math.max(1, d);
    const s = P.safe && P.safe.distanceTo(pred.center) > 900 ? P.safe : new THREE.Vector3(c.x * back, 0, c.z * back);
    P.mite.place(s.x, s.z, rig.yaw + Math.PI);
    P.play.hurt = 0; P.play.stun = 0; P.play.heal = 0;
  }
  cap.phase = null; cap.heldOnce = false;
  if (P === P1 || !multi()) { rig.target.copy(P.mite.center); rig.viewHfw = undefined; }
}
// Fighting back (shared/predation.js createFight): facing the hunting
// predator, blocking its strike (close up, B) and nipping it (X) wear its
// interest down; out of interest it runs off (and rests: hunger.missed()).
const fight = createFight();
const fightLog = { blocks: 0, bites: 0, retreats: 0 };
function wearDown(how) {
  fightLog[how === 'bite' ? 'bites' : 'blocks']++;
  if (fight.bitten()) {
    fightLog.retreats++;
    predAI.retreat();
    if (hunger.hungry) hunger.missed();
    hud.toast('The predatory mite has had enough: it runs off', 2200);
    fight.reset();
    return true;
  }
  predAI.repel();
  hud.toast(how === 'bite' ? 'Nipped! The predator recoils' : 'Its chelicerae slide off the closed capsule', 1500);
  return false;
}
const _ct = new THREE.Vector3(), _cm = new THREE.Vector3(), _cf = new THREE.Vector3(), _cq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
let capPad = null;
function resetLevel() {
  capture.reset();
  cap.phase = null;
  mite.place(0, 0, 0.3);
  recs().forEach((P, i) => { if (P.mite !== mite) { P.mite.place(Math.cos(i * 2.1) * 260, Math.sin(i * 2.1) * 260, 0.3); P.play.hurt = 0; P.play.stun = 0; } });
  newEncounters();
  pred.st.chel = 0;
  play.hurt = 0; play.stun = 0;
  hunger.reset(pace.grace);
}
function startCapture() {
  if (capture.active) return;
  const mouth = pred.mouth(_cm);
  let best = 0, bd = Infinity;
  for (let i = 0; i < 8; i++) { const d = mite.footW(i, _ct).distanceTo(mouth); if (d < bd) { bd = d; best = i; } }
  Object.assign(cap, { phase: null, leg: best, heldOnce: false, t: 0, who: cur });
  cap.c0.copy(mite.center); cap.q0.copy(mite.quat);
  play.caught++; play.hurt = 0; play.stun = 0;
  capture.start({ by: 'The predatory mite', how: 'seized a leg, pulled you in and ate you' });
  embed.captured({ by: 'predator', player: cur.slot });
  if (multi()) hud.toast(`Player ${cur.slot + 1} is seized by a leg: close up (Y)!`, 2200);
  audio.play('mite/predator', { volume: 1, rate: 0.9 });
  if (rumbleOn) padOf().rumble(400, 0.9, 1);
}
/** Pose the box mite and the predator for the current phase; false if you slipped free. */
function animateCapture(c, dt) {
  const ease = (x) => x * x * (3 - 2 * x);
  cap.t += dt;
  if (c.phase === 'fadeIn') return true; // already back (afterCatch)
  if (cap.byBoss) {
    if (['follow', 'fadeOut'].includes(c.phase)) { mite.setVisible(false); boss.captureStep('follow', c.t, dt); return true; }
    if (cap.heldOnce && mite.mode !== 'held') {
      // closed up in the pincer: the venom tooth cannot get through, it lets go
      capture.reset(); cap.phase = null; cap.byBoss = false;
      boss.st.state = 'recover'; boss.st.t = 0; boss.fight.bitten();
      hud.toast('Closed up: its venom tooth cannot get through the capsule, and it lets go', 2400);
      return false;
    }
    if (c.phase !== cap.phase) { cap.phase = c.phase; if (c.phase === 'eat') { audio.play('mite/bite', { volume: 1, rate: 0.6 }); if (rumbleOn) padOf().rumble(500, 0.6, 0.3); } }
    const at = boss.captureStep(c.phase, c.t, dt);
    const e = c.phase === 'eat' ? c.t : 0;
    mite.held(at, cap.q0, { flail: c.phase === 'eat' ? Math.max(0, 1 - 1.6 * c.t) : 1, limp: e, seizeLeg: -1, escape: c.phase !== 'eat' });
    cap.heldOnce = true;
    if (c.phase === 'eat' && c.t > 0.9) mite.setVisible(false);
    return true;
  }
  if (c.phase === 'follow' || c.phase === 'fadeOut') {
    // swallowed: the predator carries on, chelicerae still working, and the camera follows it
    mite.setVisible(false);
    pred.st.chel = 0.3 + 0.2 * Math.sin(cap.t * 5);
    return true;
  }
  if (cap.heldOnce && mite.mode !== 'held') {
    // closed up in time: a smooth capsule, nothing to grip
    capture.reset();
    cap.phase = null;
    pred.st.chel = 0;
    predAI.state = 'wander'; predAI.bored = 14; predAI.ang += Math.PI;
    if (hunger.hungry) hunger.missed();
    hud.toast('Closed up in time: its chelicerae slip off the capsule and it gives up', 2600);
    if (rumbleOn) padOf().rumble(160, 0.3, 0.6);
    return false;
  }
  if (c.phase !== cap.phase) {
    cap.phase = c.phase;
    if (c.phase === 'hold') audio.play('mite/predator', { volume: 0.8, rate: 1.2 });
    if (c.phase === 'eat') { hunger.fed(); audio.play('mite/bite', { volume: 1, rate: 0.7 }); if (rumbleOn) padOf().rumble(500, 0.6, 0.3); }
  }
  const u = c.t, T = cap.t;
  const mouth = pred.mouth(_cm);
  _cf.set(1, 0, 0).applyQuaternion(pred.quat).setY(0).normalize();
  const half = mite.size.z;
  // where the body ends up: against the chelicerae, at the same height
  // held up in the chelicerae, off the ground
  const end = _ct.copy(mouth).addScaledVector(_cf, half * 0.75);
  end.y = Math.max(cap.c0.y, mouth.y - 20);
  const center = new THREE.Vector3();
  let flail = 1, limp = 0, escape = true;
  _cq.copy(cap.q0);
  if (c.phase === 'strike') {
    pred.st.chel = ease(Math.min(1, u / 0.35));
    center.copy(cap.c0).lerp(end, 0.12 * ease(u));
  } else if (c.phase === 'hold') {
    pred.st.chel = 1 - 0.3 * ease(u);
    center.copy(cap.c0).lerp(end, 0.12 + 0.88 * ease(u));
    center.y += Math.sin(T * 17) * 6;
  } else {
    escape = false;
    const e = c.phase === 'eat' ? ease(u) : 1;
    pred.st.chel = c.phase === 'eat' ? 0.5 + 0.5 * Math.sin(T * 13) : 0.35 + 0.2 * Math.sin(T * 4);
    flail = c.phase === 'eat' ? Math.max(0, 1 - 1.6 * u) : 0;
    limp = e;
    // drawn in between the chelicerae, whole
    center.copy(end).addScaledVector(_cf, 6 * Math.sin(T * 13) - half * 1.5 * e);
    center.y -= 12 * e;
    if (u > 0.92) mite.setVisible(false);
    // it sags onto its side as the legs give way
    _cq.premultiply(new THREE.Quaternion().setFromAxisAngle(_cf, 0.3 * e));
  }
  mite.held(center, _cq, { flail, limp, seizeLeg: cap.leg, seize: pred.mouth(_ct), escape });
  cap.heldOnce = true;
  return true;
}

// ---------- features panel ----------
const features = createFeatures({ key: 'mite', pad });
const audio = createAudio(['mite/amb-moss', 'mite/step', 'mite/dash', 'mite/close', 'mite/open', 'mite/bite', 'mite/blade', 'mite/predator', 'shared/portal-chime']);
audio.addToFeatures(features);
audio.loop('mite/amb-moss', { volume: 0.6 });
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
  onChange: (v) => { shadowOn = v; sem.toggles.shadow = v && qLevel > 0; } });
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
if (!embed.active) F({ id: 'observer', group: 'Rendering', label: 'Observer mode (LS click)', on: false,
  about: 'A real micrograph data bar (HV, WD, mag, HFW, detector, true scale bar) and visible raster lines.',
  onChange: (v) => { observer = v; bar.style.display = v ? 'flex' : 'none'; sem.setRaster(v); } });
quality.addToFeatures(features);
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
  about: 'Hold Y (defend): legs pull in and the aspis folds down to seal the body. Real euphthiracaroids close in about 0.1-0.15 s (Heethoff et al. 2018).',
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
  about: `Walking is ~${WALK} µm/s (LB slow ~${WALK / 2}, RB hurry ~${Math.round(WALK * 1.4)}), scaled with the 0.35 mm body: about 1.2 body lengths a second. Real oribatids walk a few hundred µm/s at most; this is a game stretch. Strides lengthen up to 1.5x with speed and the gait phase runs on distance, so the feet stay planted.` });
F({ id: 'scramble', group: 'Simulation', label: 'Scramble (hold B)', fixed: true,
  about: `0.6 s at up to ~${DASH} µm/s, recharging over 2.2 s. The gait phase runs on distance, so the legs speed up with it and the feet stay planted. A stretch: box mites are slow, steady walkers.` });
F({ id: 'jump', group: 'Simulation', label: 'Jump (A), borrowed from jumping oribatids', fixed: true,
  about: `A ${Math.round(JUMP.crouch * 1000)} ms crouch, then a ballistic hop (~${Math.round(MITE_SCALE * JUMP.vy ** 2 / 5200)} µm high, ~0.3 mm long; more from a run; scaled with the body), landing on the floor, a grain, a flake or a blade (which takes the landing and bends); ${JUMP.cool} s before the next. Box mites do not jump, but some oribatids do: Zetorchestes with enlarged hind legs and a catch mechanism (Krisper 1990), and the ptychoid Indotritia, a box-mite relative, jumps backwards with its forelegs (Wauthy et al. 1998). Borrowed here as a forward hop.` });
F({ id: 'pounce', group: 'Simulation', label: 'Pounce-bite (X in the air; a game stretch)', fixed: true,
  about: 'In a jump, X dives at the nearest enemy point ahead (the predator, or the pseudoscorpion\'s pincer arm): a strong bite on impact (two bites\' worth, a hit-pause and a rumble), then a hop back; a mistimed dive is a clear miss. Box mites neither jump nor pounce: a game stretch on the borrowed Zetorchestes jump.' });
F({ id: 'boss', group: 'Simulation', label: 'Boss: pseudoscorpion (Neobisium-like)', fixed: true,
  about: '~2.5 mm, a real hunter of mites in moss, on guard before the wet leaf axil (the portal: placed as you go, the last encounter, in moss nobody has seen yet a short way ahead of you).' + ' Dormant until you come within 0.9 mm of its post; reaching the water while it guards turns you back. Lure it off (it follows you up to 2.6 mm from its post, then walks back slowly) and get round it, or wear it down. Its tell: pincers held open and dead still, then a snap, a two-pincer sweep, or a step-in and snap. Stay out of reach, close up (Y) to survive a grab (the venom tooth cannot get through), scramble (B) out of a grab in its strike window, and bite its pincer joints (X) while it recovers. About three good rounds and it backs into the moss. Its resolve is the brass gauge.' });
F({ id: 'bite', group: 'Simulation', label: 'Bite and graze (X)', fixed: true,
  about: 'The rostrum dips and the chelicerae work. In reach of the mouth: fungal spores (eaten) and hyphal branch tips (nibbled; they regrow), the box mite\'s real food. At the predator: a nip that makes it back off for 1.5 s (a game rule).' });
F({ id: 'predator', group: 'Simulation', label: 'Predatory mite (Parasitidae)', on: true,
  about: 'A pale, flattened gamasid ~0.8 mm long with long legs, leg I held up as a feeler. More than twice your length. It hunts on its own ground, placed as you go (the first encounter after a few seconds of open moss, and again later), in moss nobody has seen yet a short way ahead of you. Calm until you first walk onto its ground, then hungry only some of the time (see Threats); hungry, it searches toward you, and when it touches you or feels you scramble close by it runs you down at ~0.6 mm/s (faster than your walk, slower than your scramble; all game speeds). Resting, it wanders and ignores you. It strikes at legs: on the third grab it holds on, pulls you in and eats you (the whole catch is shown); close up (Y) while it holds you and its grip slips off. Each strike is telegraphed: it rears, leg I and the palps up, the chelicerae open (0.8 s). Closed up (Y), you are a smooth capsule its strike slides off; blocks, nips (X) and facing it wear its interest down until it runs off (adult ptychoid mites are nearly immune: Peschel et al. 2006).',
  onChange: (v) => { predOn = v; pred.setVisible(v && predPlaced); } });
F({ id: 'grace', group: 'Simulation', label: 'Calm opening', choices: ['Until its ground', '20 s', 'Off'], value: 'Until its ground',
  about: 'Until its ground (default): the predatory mite stays calm until someone first walks onto its hunting ground (no clock). 20 s / Off: a test calm on a timer, or none. shared/predation.js.',
  onChange: (v) => { pace.grace = v === 'Off' ? 0 : v === '20 s' ? 20 : Infinity; hunger.reset(pace.grace); } });
F({ id: 'hunger', group: 'Simulation', label: 'Predator hunger', choices: ['Comes and goes', 'Always', 'Never'], value: 'Comes and goes',
  about: 'Comes and goes: once it is awake it is hungry for ~18-32 s at a time, then rests (45-75 s after eating you, 15-30 s after you slip free, lose it or it gives up on your capsule); only a hungry predator searches toward you and hunts. Always: hungry from the end of the calm opening on. Never: it never hunts (for exploring and testing).',
  onChange: (v) => (pace.mode = v) });
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

// Player state: legs grabbed by the predator (3 = caught), stun after a grab, grazing.
let play = { hurt: 0, stun: 0, grazed: 0, caught: 0, nip: false, heal: 0 };
const _fp = new THREE.Vector3(), _bc = new THREE.Vector3();
const closedNow = () => mite.mode === 'closed' || (mite.mode === 'closing' && mite.st.retract > 0.5) || (mite.mode === 'opening' && mite.st.aspis > 0.5);
// X: three moves, chosen by what is in front of the chelicerae.
//  fight  the predator in reach: rear up (leg I raised), then lunge and snap;
//         the nip lands at the snap (it recoils and loses interest)
//  eat    a spore or a hyphal tip in reach: leg I reaches out and holds it to
//         the mouth while the chelicerae work and it shrinks away (0.9 s)
//  attack nothing in reach: a lunge with the chelicerae
function biteNow() {
  if (mite.mode !== 'walk' || play.act) return;
  const m = mite.mouth(new THREE.Vector3());
  if (!capture.active && boss.bitePoints().some((p) => p.distanceTo(m) < 520)) {
    Object.assign(play, { act: 'fight', actT: 0, actDur: 0.6, snapped: false, foe: 'boss' });
    return;
  }
  if (predHere() && !capture.active && pred.center.distanceTo(m) < 600) {
    Object.assign(play, { act: 'fight', actT: 0, actDur: 0.6, snapped: false, foe: 'pred' });
    return;
  }
  // in the thicket: graze the threads in front away and shove the springtails aside
  if (thicket.canClear(m)) {
    Object.assign(play, { act: 'clear', actT: 0, actDur: 0.32, snapped: false });
    return;
  }
  // food: the tile's (spores and hyphal tips, in tile coordinates: the copy
  // nearest the mouth) and the thickets' spore heads (where they stand)
  let best = null, bd = 130, bsx = 0, bsz = 0;
  for (const f of world.food) {
    if (f.left <= 0) continue;
    const p = f.kind === 'hypha' ? world.foliage.offsetAt(f.rod, f.u, _fp).add(f.p) : _fp.copy(f.p);
    const sx = TILE * Math.round((m.x - p.x) / TILE), sz = TILE * Math.round((m.z - p.z) / TILE);
    const d = Math.hypot(p.x + sx - m.x, p.y - m.y, p.z + sz - m.z);
    if (d < bd) { bd = d; best = f; bsx = sx; bsz = sz; }
  }
  for (const f of thicket.food) {
    if (f.left <= 0) continue;
    const d = f.p.distanceTo(m);
    if (d < bd) { bd = d; best = f; bsx = 0; bsz = 0; }
  }
  if (best) {
    const p0 = best.kind === 'hypha' ? world.foliage.offsetAt(best.rod, best.u, _fp).add(best.p).clone() : best.p.clone();
    p0.x += bsx; p0.z += bsz;
    Object.assign(play, { act: 'eat', actT: 0, actDur: 0.9, food: best, food0: p0, foodSx: bsx, foodSz: bsz });
    audio.play('mite/bite', { volume: 0.8, rate: 0.95 + Math.random() * 0.12 });
    return;
  }
  Object.assign(play, { act: 'attack', actT: 0, actDur: 0.4 });
  mite.bite();
  audio.play('mite/bite', { volume: 0.6, rate: 1.2 });
}
const _sm = new THREE.Matrix4(), _sp = new THREE.Vector3(), _sq = new THREE.Quaternion(), _ss = new THREE.Vector3(), _sp2 = new THREE.Vector3();
/** Move and shrink a spore instance (s: 1 whole, 0 gone). */
function placeSpore(f, at, s) {
  if (!f.s0) { f.im.getMatrixAt(f.i, _sm); _sm.decompose(_sp, _sq, _ss); f.s0 = _ss.clone(); f.q0 = _sq.clone(); }
  _sm.compose(at, f.q0, _ss.copy(f.s0).multiplyScalar(Math.max(0, s)));
  f.im.setMatrixAt(f.i, _sm);
  f.im.instanceMatrix.needsUpdate = true;
}
/** Advance the current player's act and pose it (mite.act). */
function stepAct(dt) {
  if (!play.act || mite.mode !== 'walk') {
    if (play.act === 'eat' && play.food && play.food.kind === 'spore') placeSpore(play.food, _sp2.set(play.food0.x - play.foodSx, play.food0.y, play.food0.z - play.foodSz), 1);
    if (play.act === 'eat' && play.food && play.food.kind === 'head' && play.food.left > 0) thicket.shrinkHead(play.food, 1);
    play.act = null; mite.act({}); return;
  }
  play.actT += dt;
  const u = Math.min(1, play.actT / play.actDur);
  const m = mite.mouth(new THREE.Vector3());
  if (play.act === 'fight') {
    // turn square to it, rear (0-0.45), lunge and snap (0.45-0.7)
    const foeC = play.foe === 'boss' ? boss.center : pred.center;
    const to = _ct.subVectors(foeC, mite.center).setY(0).normalize();
    mite.st.fwd.lerp(to, Math.min(1, dt * 10)).setY(0).normalize();
    const rear = u < 0.45 ? Math.sin((u / 0.45) * Math.PI / 2) : Math.max(0, 1 - (u - 0.45) / 0.15);
    const lunge = u < 0.45 ? 0 : Math.sin(Math.min(1, (u - 0.45) / 0.4) * Math.PI);
    mite.act({ rear, lunge });
    if (u > 0.45 && !play.snapped) {
      play.snapped = true;
      mite.bite();
      audio.play('mite/bite', { volume: 1, rate: 0.85 });
      if (play.foe === 'boss' && !capture.active && boss.bitePoints().some((p) => p.distanceTo(m) < 640)) {
        play.nips = (play.nips || 0) + 1;
        if (rumbleOn) padOf().rumble(140, 0.5, 0.4);
        const open = boss.open;
        const gone = boss.bitten(1, cur.slot);
        hud.toast(gone ? 'The pseudoscorpion has had enough: it backs into the moss' : `Bit ${open ? 'a pincer joint' : 'its pincer'}! It flinches`, 1500);
      } else if (play.foe !== 'boss' && predHere() && !capture.active && pred.center.distanceTo(m) < 700) {
        play.nips = (play.nips || 0) + 1;
        if (rumbleOn) padOf().rumble(140, 0.5, 0.4);
        wearDown('bite');
      }
    }
  } else if (play.act === 'eat') {
    // leg I reaches for the food (0-0.25), holds it under the mouth, the chelicerae work, it shrinks
    const f = play.food;
    const reach = Math.min(1, u / 0.25);
    const at = play.food0.clone().lerp(m.clone().add(new THREE.Vector3(0, -8, 0)), Math.min(1, u / 0.35));
    mite.act({ hold: at, holdK: reach, rear: 0.15 * reach });
    if (Math.floor(play.actT / 0.22) !== Math.floor((play.actT - dt) / 0.22)) mite.bite();
    // (the spore is drawn in its tile copy: back into tile coordinates)
    if (f.kind === 'spore') placeSpore(f, _sp2.set(at.x - play.foodSx, at.y, at.z - play.foodSz), 1 - Math.max(0, (u - 0.3) / 0.7));
    if (f.kind === 'head') thicket.shrinkHead(f, 1 - Math.max(0, (u - 0.3) / 0.7));
    if (u >= 1) {
      play.grazed++;
      if (f.kind === 'spore') { f.left = 0; world.eatSpore(f); hud.toast(`Ate a fungal spore (${play.grazed} grazed)`); }
      else if (f.kind === 'head') { f.left = 0; f.t = 30; thicket.shrinkHead(f, 0); hud.toast(`Grazed a conidiophore's spore head (${play.grazed} grazed)`); }
      else { f.left = 0; f.t = 25; hud.toast(`Nibbled a hyphal tip (${play.grazed} grazed)`); }
      if (rumbleOn) padOf().rumble(60, 0.25, 0.1);
    }
  } else if (play.act === 'clear') {
    // a quick lunge into the thicket: the chelicerae shear the threads, the head shoves springtails aside
    mite.act({ lunge: Math.sin(u * Math.PI), rear: 0.08 * Math.sin(u * Math.PI) });
    if (u > 0.4 && !play.snapped) {
      play.snapped = true;
      mite.bite();
      const f = _ct.set(1, 0, 0).applyQuaternion(mite.quat).setY(0).normalize();
      const r = thicket.bite(m, { x: f.x, z: f.z });
      play.cleared = (play.cleared || 0) + r.threads;
      if (r.threads) { play.grazed += r.threads; audio.play('mite/bite', { volume: 0.8, rate: 1.05 }); }
      else audio.play('mite/bite', { volume: 0.6, rate: 1.25 });
      if (r.shoved && rumbleOn) padOf().rumble(70, 0.3, 0.2);
      if (!thickLog.biteTip) { thickLog.biteTip = true; hud.toast(r.threads ? 'Grazed through the threads: bite (X) to clear a lane, walk to shove the springtails aside' : 'Shoved the springtails aside', 2400); }
    }
  } else {
    mite.act({ lunge: Math.sin(u * Math.PI), rear: 0.1 * Math.sin(u * Math.PI) });
  }
  if (u >= 1) { play.act = null; mite.act({}); }
}
function bodyOf(m) {
  // the radii and ground getters build their answers, so each is read once
  const nc = m.anat.noto.c, mr = m.radii, g = m.ground, rod = g && g.entry && g.entry.rod;
  return { center: _bc.set(nc[0], nc[1], nc[2]).multiplyScalar(m.scale).applyQuaternion(m.quat).add(m.center).clone(), quat: m.quat,
    radii: [mr[0] * 1.2 + 30, mr[1] * 1.15 + 30, mr[2] * 1.45 + 30], // legs splay; + half a blade width
    load: rod, weight: m.anat.kind === 'pred' ? 13000 : 16000 * m.scale ** 3,
    // (a tile blade: the contact point taken into its copy)
    loadU: rod ? Math.min(1, Math.max(0, _bc2.set(g.point.x - TILE * Math.round((g.point.x - rod.mid.x) / TILE), g.point.y, g.point.z - TILE * Math.round((g.point.z - rod.mid.z) / TILE)).sub(rod.base).dot(rod.axis) / rod.len)) : 0.7 };
}
const _bc2 = new THREE.Vector3();
// ---------- sound ----------
let snd = { t: 0, lastStep: -1, side: 1, lastBlade: -1, mode: 'walk', bladeNear: new Set() };
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
        const d = Math.hypot((rod.mid.x - mite.center.x) - TILE * Math.round((rod.mid.x - mite.center.x) / TILE), rod.mid.y - mite.center.y, (rod.mid.z - mite.center.z) - TILE * Math.round((rod.mid.z - mite.center.z) / TILE));
        if (d < 700) {
          snd.lastBlade = snd.t;
          audio.play('mite/blade', { volume: Math.min(0.8, 0.3 + bend * 2) * (1 - d / 900), rate: 0.9 + Math.random() * 0.2 });
          break;
        }
      }
    }
  }
}
// ---------- players ----------
const P1 = { slot: 0, color: PLAYER_COLORS[0], mite, play, dash, snd, speedMul: 1 };
const pls = [P1];
const recs = () => pls.filter(Boolean);
const multi = () => recs().length > 1;
let cur = P1;
/** Run fn with `mite`, `play`, `dash`, `snd` pointing at player record P. */
function withRec(P, fn) {
  // saved in locals, not an array (this runs dozens of times a frame)
  const c0 = cur, m0 = mite, p0 = play, d0 = dash, s0 = snd;
  cur = P; mite = P.mite; play = P.play; dash = P.dash; snd = P.snd;
  try { return fn(); } finally { cur = c0; mite = m0; play = p0; dash = d0; snd = s0; }
}
/** The pad of the player being stepped (rumble goes to their controller). */
const padOf = () => players.pad(cur.slot);
const held = (P) => P.mite.mode === 'held' || (capture.active && cap.who === P);
/** A box mite for a player who joined (or came in with the shell's roster), beside the others. */
function makeRec(p) {
  const m = createMite(scene, world.colliders, { cls: CLS.CUTICLE, tex, scale: MITE_SCALE });
  const near = recs().filter((q) => !held(q));
  const c = near.length ? groupCentre(near).c : new THREE.Vector3();
  const a = p.slot * 2.1;
  m.place(c.x + Math.cos(a) * 260, c.z + Math.sin(a) * 260, rig.yaw + Math.PI);
  return { slot: p.slot, color: p.color, mite: m, play: { hurt: 0, stun: 0, grazed: 0, caught: 0, nip: false, heal: 0 },
    dash: createDash({ duration: 0.6, cooldown: 2.2 }), snd: { t: 0, lastStep: -1, side: 1, lastBlade: -1, mode: 'walk', bladeNear: new Set() }, speedMul: 1 };
}
/** Keep one mite per joined player. */
function syncPlayers() {
  const want = new Set(players.list.map((p) => p.slot));
  for (const p of players.list) if (!pls[p.slot]) pls[p.slot] = makeRec(p);
  for (let s = 1; s < pls.length; s++) {
    const P = pls[s];
    if (!P || want.has(s)) continue;
    if (cap.who === P) { capture.reset(); cap.phase = null; cap.who = null; pred.st.chel = 0; }
    for (const m of P.mite.meshes) m.visible = false;
    P.mite.root.removeFromParent();
    pls[s] = null;
  }
}
/** Multiplayer: an eaten player comes back beside a teammate. */
function respawnNear(P) {
  const mates = recs().filter((q) => q !== P && !held(q));
  const c = mates.length ? mates[0].mite.center : new THREE.Vector3();
  const a = Math.random() * Math.PI * 2;
  P.mite.place(c.x + Math.cos(a) * 280, c.z + Math.sin(a) * 280, a + Math.PI);
  P.play.hurt = 0; P.play.stun = 0; P.play.heal = 0;
}

// ---------- landmarks: the portal (forward) and the backdoor ----------
// Forward, the portal: the wet leaf axil (landmarks.js), placed by the director
// as the last encounter (out of everyone's view, in moss nobody has seen, a
// short way ahead of whoever leads), guarded by the pseudoscorpion. Reaching its water while
// the pseudoscorpion is on guard turns you back (a toast, once a visit); lured
// off or driven off, the water is a portal you choose to take, never an
// automatic door: at it, "Y Enter the portal" shows (embed.near('portal')),
// and Y (keyboard R, here instead of closing up) goes through (enterPortal:
// the one place the zoom into the tardigrade's world starts). Backdoor (BACKDOOR): dwell
// beside the giant springtail's head and Y (here, instead of closing up)
// rises to the bog surface.
const lm = { fired: false, near: false, nearing: false, portal: false, log: [] };
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const atBack = (P) => !held(P) && flat(P.mite.center, props.back) < BACKDOOR.dwell;
const backPrompt = document.createElement('div');
backPrompt.style.cssText = 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:6;padding:6px 14px;border-radius:999px;background:rgba(10,12,16,.6);color:#e8e8e8;font:600 13px system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:none;white-space:nowrap;display:none';
document.body.appendChild(backPrompt);
function goBack(P) {
  lm.log.push({ kind: 'back', slot: P.slot, t: +simTime.toFixed(2) });
  embed.landmark('back', { player: P.slot });
}
const PORTAL = props.forward; // { placed, a, x, z, ... }
const portalState = { hinted: false, turned: false };
/** Is the pseudoscorpion on guard at the water (not lured more than 1.3 mm off it, not driven off)? */
function guarded() {
  if (!PORTAL.placed) return true;
  if (!boss.group.visible || ['gone', 'retreat'].includes(boss.st.state)) return false;
  return Math.hypot(boss.st.x - PORTAL.x, boss.st.z - PORTAL.z) < 1300;
}
/** Is player P at the portal's water (its reach)? */
const atPortal = (P) => PORTAL.placed && !held(P) && flat(P.mite.center, PORTAL) < FORWARD.reach && Math.abs(P.mite.center.y - PORTAL.y) < 450;
/** Can P go through now (at the water, the pseudoscorpion off guard)? Then Y enters. */
const atOpenPortal = (P) => !outro && atPortal(P) && !portalSealed() && !guarded();
function checkLandmarks() {
  let at = null, nearB = false, dmin = Infinity;
  for (const P of recs()) {
    if (held(P)) continue;
    const c = P.mite.center;
    if (PORTAL.placed) {
      const d = flat(c, PORTAL);
      dmin = Math.min(dmin, d);
      if (atPortal(P)) at = P;
    }
    if (atBack(P)) nearB = true;
  }
  if (PORTAL.placed && !outro) {
    // the boss's hint (brief, once): only when someone is close enough to meet it
    if (!portalState.hinted && dmin < 3200) { portalState.hinted = true; hud.toast('A pseudoscorpion guards the water. Lure it away from its post and get round it, or bite its pincer joints until it backs off', 3600); }
    // nearing the open way on (a screen or two): the shell starts loading the next world (no prompt is shown)
    const nearing = !portalSealed() && dmin < 3000;
    if (nearing !== lm.nearing) { lm.nearing = nearing; embed.near('forward', nearing); }
    if (at && !lm.fired) {
      if (guarded()) {
        if (!portalState.turned) { portalState.turned = true; hud.toast('Turned back: the pseudoscorpion is on guard. Lead it away from the water first, then get round it', 3600); }
        lm.log.push({ kind: 'turnedBack', slot: at.slot, t: +simTime.toFixed(2) });
        lm.fired = true; // once a visit (again after everyone has left)
        withRec(at, () => { if (rumbleOn) padOf().rumble(160, 0.4, 0.2); });
      } else if (portalSealed()) {
        // the way on exists from the start (the default path) but opens only once the predatory mite is met, twice
        hud.toast('The water is shut to you yet: the predatory mite is still out in the moss', 2600);
        lm.log.push({ kind: 'sealed', slot: at.slot, t: +simTime.toFixed(2) });
        lm.fired = true;
      }
    }
    if (dmin > FORWARD.reach + 250) lm.fired = false;
  }
  // at the open portal (anyone): "Y Enter the portal"; Y goes through (inputFor)
  setPortalPrompt(PORTAL.placed && !outro && !!at && !portalSealed() && !guarded());
  if (nearB !== lm.near) {
    lm.near = nearB;
    embed.near('back', nearB, 'Rise to the bog surface');
    // standalone: our own quiet prompt (in the game the shell shows it)
    if (!embed.active) {
      backPrompt.style.display = nearB ? 'block' : 'none';
      backPrompt.textContent = `${hud.glyphs === 'keyboard' ? 'R' : 'Y'}: back to the bog surface`;
    }
  }
}
/** The portal's Y prompt: on while anyone is at the open portal (the shell, or standalone embed.js, shows it). */
function setPortalPrompt(on) {
  if (on === lm.portal) return;
  lm.portal = on;
  embed.near('portal', on);
}
/**
 * The way on: player P is at the open portal and pressed Y. This is the one place the
 * zoom into the next world is triggered (embed.landmark('forward'); the shell
 * runs the continuous transition; standalone, embed.js shows a toast).
 */
function enterPortal(P) {
  if (outro) return;
  lm.fired = true;
  setPortalPrompt(false);
  lm.log.push({ kind: 'forward', slot: P.slot, t: +simTime.toFixed(2) });
  logChallenge('enter', P);
  startOutro(P);
  embed.landmark('forward', { player: P.slot, outro: embed.active });
}

// ---------- the encounters, placed as you go (shared/director.js) ----------
// The director (design/encounter-pattern.md, "Placed as you go") places the
// enemies and events one at a time, in this order, in moss nobody has seen
// yet, a short way ahead of whoever leads (or, if they linger, round them):
// the predatory mite on its hunting ground, the predatory mite again (it has
// gone on through the moss, out of sight), then the wet leaf axil with the
// pseudoscorpion on guard. Each comes only after the one before was met and a
// calm break has passed; nothing a player has seen is placed, moved or
// removed. The thickets, the moss and its food are scenery (layout.js).
// What every view sees comes from the frame drawn (drawFrame: each view's
// frustum and the point it frames).
const viewFrusta = [];
const viewFoci = [];
const _vs = new THREE.Sphere(), _vp = new THREE.Vector3();
let seenViews = null;
/** Can any view (last drawn) see a disc of radius r (µm) at (x, z)? */
const inSight = (x, z, r) => { _vs.center.set(x, floorH(x, z) + 300, z); _vs.radius = r + 400; return viewFrusta.some((f) => f.intersectsSphere(_vs)); };
/** Is the predator busy with anyone (hunting, striking, holding, or anyone within its reach)? */
const predEngaged = () => (capture.active && !cap.byBoss) || ['hunt', 'windup', 'strike', 'recover', 'recoil'].includes(predAI.state) || recs().some((P) => P.mite.center.distanceTo(pred.center) < 1800);
/** Which of the predator's encounters it is on now (1 or 2; 0 before it is placed). */
let predK = 0;
/** Put the predator's ground at (x, z), and the predator at its centre. */
function placePred(x, z, k) {
  Object.assign(predZone, predZoneAt(x, z));
  predAI.reset(x, z);
  pred.st.chel = 0;
  predPlaced = true; predK = k;
  pred.setVisible(predOn);
}
/** Park the predator, hidden (a new game: nothing placed yet). */
function parkPred() {
  Object.assign(predZone, predZoneAt(PRED_PARK.x, PRED_PARK.z));
  predAI.reset(PRED_PARK.x, PRED_PARK.z);
  predPlaced = false; predK = 0;
  pred.setVisible(false);
}
const reachPred = (P) => Math.hypot(P.mite.center.x - predZone.x, P.mite.center.z - predZone.z) < predZone.r + 400 || P.mite.center.distanceTo(pred.center) < 1500;
// what each encounter does when placed, and when it counts as met
// (one predator for both: on the default path its second ground is only a spot until the first is met,
// then the predator goes there once nobody sees it: movePredOn)
let pred2Spot = null;
const ENC = {
  pred: { place: (x, z) => { placePred(x, z, 1); return { k: 1 }; }, met: (h, [p]) => predK === 1 && reachPred(pls[p.id] || P1) },
  // the second time: only once the predator is out of every view and busy with nobody (it walks off, unseen)
  pred2: { place: (x, z, b, info) => {
    if (info.instance === 'default' && predK !== 2) { pred2Spot = { k: 2, x, z }; return pred2Spot; }
    pred2Spot = null; placePred(x, z, 2); return { k: 2 };
  }, met: (h, [p]) => predK === 2 && reachPred(pls[p.id] || P1),
    fits: (x, z, b) => ENCOUNTERS[1].fits(x, z, b) && (predK === 2 || director.index < 1 || (!predEngaged() && !inSight(pred.center.x, pred.center.z, 600))) },
  // the last: entering the open portal ends the level
  portal: { place: (x, z, b) => { placePortal(b, x, z); return { k: 'portal' }; }, met: () => false },
};
// The default path (layout.js DEFAULT_PATH): all three laid out along one bearing on the first frame, so the
// way on exists from the start (sealed until the predator is met twice: portalSealed); head off another way
// and each, while nobody has seen it, leaves the path and is placed ahead of you as before (one object each: single).
const director = createDirector({ ...DIRECTOR, canPlace, defaultPath: DEFAULT_PATH, entries: ENCOUNTERS.map((e) => ({ ...e, ...ENC[e.id], single: true })) });
const PORTAL_INDEX = ENCOUNTERS.findIndex((e) => e.final);
/** The way on exists from the start but stays shut until every earlier encounter is met (the director's order). */
function portalSealed() { return director.index < PORTAL_INDEX; }
/**
 * The predator's second ground on the default path: once its first is met, the predator goes on through
 * the moss to it, unseen (out of every view, busy with nobody, the spot itself out of view).
 */
function movePredOn() {
  if (!pred2Spot || predK !== 1 || director.index < 1) return;
  const D = director.entry('pred2').def;
  if (!D || D.handle !== pred2Spot || D.state !== 'placed') { pred2Spot = null; return; }
  if (predEngaged() || inSight(pred.center.x, pred.center.z, 600) || inSight(pred2Spot.x, pred2Spot.z, 650)) return;
  placePred(pred2Spot.x, pred2Spot.z, 2);
  pred2Spot = null;
}
/** How far through the encounters the game is: met / all (0..1). */
const encounterProgress = () => director.index / ENCOUNTERS.length;
function stepDirector(dt) {
  if (outro) return;
  const ev = director.update(dt, recs().map((P) => ({ id: P.slot, x: P.mite.center.x, z: P.mite.center.z, alive: !held(P) })), seenViews);
  seenViews = null;
  for (const e of ev) if (e.type === 'met') logChallenge(`${e.id}Met`, pls[e.by && e.by[0]] || P1);
  movePredOn();
  driftPred(dt);
}
/**
 * A predator placed out of a lingering player's reach wanders over: its
 * ground (and so the predator, which keeps inside it) drifts toward the
 * leader at PRED_DRIFT µm/s until they are on it. Behaviour, not a placement.
 */
const PRED_DRIFT = 200;
let predDriftT = 0;
function driftPred(dt) {
  const S = director.entry(predK === 2 ? 'pred2' : 'pred');
  if (!predPlaced || !S || S.state !== 'placed') { predDriftT = 0; return; }
  predDriftT += dt;
  const lead = director.leader, P = lead && pls[lead.id];
  if (predDriftT < 5 || !P || lead.moving || (capture.active && !cap.byBoss) || ['hunt', 'windup', 'strike', 'recover', 'recoil'].includes(predAI.state) || reachPred(P)) return;
  const dx = P.mite.center.x - predZone.x, dz = P.mite.center.z - predZone.z, d = Math.hypot(dx, dz) || 1;
  predZone.x += (dx / d) * PRED_DRIFT * dt; predZone.z += (dz / d) * PRED_DRIFT * dt;
}
/** A new game: the director starts over, the predator hidden and parked, no portal. */
function newEncounters() {
  director.reset();
  pred2Spot = null;
  parkPred();
  props.unplace();
  boss.setVisible(false);
  world.exclude.set('portal', []);
  portalState.hinted = false; portalState.turned = false;
  challengeLog.length = 0;
}
/** Put the portal (the wet leaf axil) at (x, z), met along bearing a, with the pseudoscorpion on guard before it. */
function placePortal(a, x, z) {
  props.place(a, x, z);
  boss.setPost(PORTAL.post, PORTAL.home);
  boss.setVisible(true);
  world.exclude.set('portal', [{ x: PORTAL.x, z: PORTAL.z, r: PORTAL_CLEAR }, { x: PORTAL.post.x, z: PORTAL.post.z, r: 1100 }]);
  portalState.hinted = false; portalState.turned = false;
  logChallenge('portal', recs().find((P) => !held(P)) || P1);
}

// ---------- the outro: success, slow-down, freeze (embed.js "Continuous transitions") ----------
// Going through the portal: a golden burst from the water, a bloom on the
// screen, a chime and a rumble; then time eases to a stop over ~1 s while
// rendering carries on (the freeze frame), the view settling on the water.
// Frozen, it reports how the tardigrade walking in the film is framed
// (embed.frozen) and follows the shell's `camera` poses: a short push in on the
// tardigrade while the tardigrade's world fades in under the same framing (the
// same body size: a change of light, SEM to DIC, more than of scale). In frame
// time (dt is clamped), so a slow machine plays it slower rather than skipping
// it. Standalone the freeze holds a moment and time comes back.
const OUTRO = { beat: 0.3, ease: 1.0, hold: 1.4, back: 0.6, giveUp: 8, rate: 1 }; // rate: tests slow it down
// The tardigrade world's opening view of its animal (a pose: embed.js; measured
// with its __micro.pose() at the start), and the field the freeze holds: the
// glimpse at ~0.18 of the view's width, so the move pushes in ~1.35x to it.
const NEXT_OPENING = { f: 0.243, pitch: 1.18, rel: 2.598 };
const OUTRO_HFW = TARDI_LEN / (NEXT_OPENING.f / 1.35);
let outro = null;
let fxT = 0; // the success effects' clock (frame time, so a slow machine or a test sees all of them)
const portalLight = createPortalLight({ zIndex: 3, clock: () => fxT });
function startOutro(P) {
  outro = { t: 0, scale: 1, frozenAt: null, cam: null, P, heard: false, d: 0,
    from: { target: rig.target.clone(), pitch: rig.pitch, hfw: rig.viewHfw ?? rig.hfw, h: props.tardi.heading } };
  props.glow.burst();
  const pr = split.project(0, _vp.set(PORTAL.x, PORTAL.y, PORTAL.z));
  if (!pr.behind) portalLight.bloom(pr.x, pr.y, { scale: 1.2 });
  const me = split.project(0, P.mite.center);
  if (!me.behind) portalLight.bloom(me.x, me.y, { scale: 0.7 });
  audio.play('shared/portal-chime', { volume: 0.9 });
  withRec(P, () => { if (rumbleOn) padOf().rumble(520, 0.55, 0.85); });
  hud.toast('', 1);
  banner.style.display = 'none'; gauge.style.display = 'none';
  // the chrome goes, the bloom stays (cinematic(false) restores both)
  if (embed.active) { embed.cinematic(true, canvas); portalLight.canvas.style.visibility = 'visible'; }
}
/** Advance the outro by dt (frame time); returns the time scale for the world. */
function stepOutro(dt) {
  const o = outro;
  o.t += dt * OUTRO.rate;
  fxT += dt * OUTRO.rate;
  o.scale = 1 - THREE.MathUtils.smoothstep(o.t, OUTRO.beat, OUTRO.beat + OUTRO.ease);
  if (o.scale <= 0 && o.frozenAt === null) {
    o.frozenAt = o.t;
    // the freeze frame: the camera exactly where the outro's framing ends, and how it frames the tardigrade
    o.d = placeCamera(1e-4);
    if (embed.active) embed.frozen(tardiPose());
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
  if (embed.active) embed.cinematic(false, canvas);
}
/** How the frozen view frames the tardigrade in the water (embed.poseOf). */
const tardiPose = () => embed.poseOf(camera, props.tardi.center, { len: TARDI_LEN, heading: props.tardi.heading, pitch: rig.pitch, yaw: rig.yaw });
// the shell drives the camera from the freeze frame into the tardigrade's world
embed.on('camera', (d) => { if (outro && d.pose) { outro.cam = d.pose; outro.heard = true; } });
embed.on('pause', () => { if (outro) outro.heard = true; });
/** The camera for a pose from the shell during the outro: a dolly onto the tardigrade (the scan's field of view kept). */
function placeOutroCamera(pose) {
  const c = props.tardi.center;
  const r = embed.poseCamera(camera, pose, c, { len: TARDI_LEN, heading: props.tardi.heading });
  rig.yaw = r.yaw; rig.pitch = r.pitch;
  rig.target.set(r.target.x, r.target.y, r.target.z);
  rig.viewHfw = 2 * r.halfW;
  const d = r.depth;
  camera.near = Math.max(20, d * 0.08);
  camera.far = d + 9000;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  shared.uCutP.value.copy(c).applyMatrix4(camera.matrixWorldInverse);
  shared.uCutR.value = 380 + rig.viewHfw * 0.06;
  world.cut.update(1 / 30, camera.position, c, { radius: 340, margin: 110, keep: cutKeep, period: TILE });
  return d;
}

// ---------- the scramble's stamina, its dust, the pounce-bite ----------
const stamText = (pl) => { const n = Math.round((pl.stam ?? 1) * 5); return 'scramble ' + '■'.repeat(n) + '□'.repeat(5 - n); };
// dust kicked up by a scramble: a few humus crumbs that fly back and settle (SEM-drawn, like everything)
const DUST = 64;
const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), gMaterial({ cls: CLS.LITTER }), DUST);
dust.frustumCulled = false;
scene.add(dust);
const dustP = Array.from({ length: DUST }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), t: 9, r: 8 }));
let dustI = 0;
/** A puff of humus crumbs in a ring round the feet (a jump's push-off or its landing; k scales it). */
function puffDust(m, n = 10, k = 1) {
  const c = m.center, y = c.y - 80;
  for (let i = 0; i < n; i++) {
    const d = dustP[dustI++ % DUST], a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    d.p.set(c.x + Math.cos(a) * 90, y, c.z + Math.sin(a) * 90);
    d.v.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar((250 + Math.random() * 300) * k).add(new THREE.Vector3(0, (200 + Math.random() * 300) * k, 0));
    d.t = 0; d.r = (9 + Math.random() * 14) * k;
  }
}
function kickDust(m, n = 2) {
  const back = new THREE.Vector3(-1, 0, 0).applyQuaternion(m.quat).setY(0).normalize();
  for (let i = 0; i < n; i++) {
    const d = dustP[dustI++ % DUST];
    d.p.copy(m.center).addScaledVector(back, 110).add(new THREE.Vector3((Math.random() - 0.5) * 120, -70, (Math.random() - 0.5) * 120));
    d.v.copy(back).multiplyScalar(300 + Math.random() * 300).add(new THREE.Vector3((Math.random() - 0.5) * 200, 250 + Math.random() * 250, (Math.random() - 0.5) * 200));
    d.t = 0; d.r = 5 + Math.random() * 9;
  }
}
const _dm = new THREE.Matrix4(), _dq = new THREE.Quaternion(), _ds = new THREE.Vector3();
function stepDust(dt) {
  for (let i = 0; i < DUST; i++) {
    const d = dustP[i];
    d.t += dt;
    if (d.t < 0.7) { d.v.y -= 1800 * dt; d.p.addScaledVector(d.v, dt); }
    const s = d.t < 0.7 ? d.r * (1 - d.t / 0.7) : 0;
    _dm.compose(d.p, _dq, _ds.set(s, s, s));
    dust.setMatrixAt(i, _dm);
  }
  dust.instanceMatrix.needsUpdate = true;
}
/** Enemy points a pounce-bite can land on: [{ p, foe: 'pred' | 'boss' }]. */
function pounceTargets() {
  const out = [];
  if (predHere() && !(capture.active && !cap.byBoss)) { out.push({ p: pred.center.clone(), foe: 'pred' }); out.push({ p: pred.mouth(new THREE.Vector3()).clone(), foe: 'pred' }); }
  for (const p of boss.bitePoints()) out.push({ p, foe: 'boss' });
  return out;
}
/** X in the air: dive at the nearest enemy point within reach ahead (aim assist), or straight down (a clear miss). */
function startDive() {
  if (play.dive) return;
  const c = mite.center, f = new THREE.Vector3(1, 0, 0).applyQuaternion(mite.quat).setY(0).normalize();
  let best = null, bs = Infinity;
  for (const t of pounceTargets()) {
    const v = t.p.clone().sub(c).setY(0), d = v.length();
    if (d > 800) continue;
    const off = d > 1 ? Math.acos(Math.max(-1, Math.min(1, v.divideScalar(d).dot(f)))) : 0;
    if (off > 1.1) continue;
    const sc = d * (1 + off);
    if (sc < bs) { bs = sc; best = t; }
  }
  const at = best ? best.p.clone() : c.clone().addScaledVector(f, 120);
  at.y = Math.max(at.y, floorH(at.x, at.z));
  if (mite.dive(at)) { play.dive = { target: best, at }; if (rumbleOn) padOf().rumble(80, 0.2, 0.2); }
}
let hitPause = 0;
// ---------- where the challenges start (layout.js RINGS) ----------
const thickLog = { biteTip: false };
const thickBodies = [], bodyRefs = [];
const bodyRef = (slot, p, radius) => { const b = bodyRefs[slot] || (bodyRefs[slot] = { position: new THREE.Vector3(), radius, slot }); b.position.copy(p); b.radius = radius; return b; };
/** First start of each challenge: { kind, slot, d (µm from the start), progress (encounters met / all), t }. */
const challengeLog = [];
function logChallenge(kind, P) {
  if (challengeLog.some((c) => c.kind === kind)) return;
  const c = P.mite.center, d = distFromStart(c.x, c.z);
  challengeLog.push({ kind, slot: P.slot, d: Math.round(d), progress: +encounterProgress().toFixed(3), t: +simTime.toFixed(2) });
}
function challenges() {
  for (const P of recs()) {
    if (held(P)) continue;
    const c = P.mite.center;
    if (predHere() && predAI.onGround(c)) {
      // walking onto its ground ends its calm: it is awake (hungry now and then) and lurking
      if (!challengeLog.some((x) => x.kind.startsWith('predator ground'))) { if (hunger.state === 'grace') { hunger.reset(0); hunger.update(0.01); } hud.toast('The predatory mite\'s hunting ground: watch for it rearing to strike', 2600); }
      logChallenge(`predator ground ${predK}`, P);
    }
    const cl = thicket.inside(c);
    if (cl) {
      if (!challengeLog.some((x) => x.kind.startsWith('thicket'))) hud.toast('A hyphal thicket full of springtails: push through (LS), bite the threads away (X), scramble (B)', 3200);
      logChallenge(`thicket ${cl.ring + 1}`, P);
    }
    // near each challenge (within 400 µm of it): the times a scripted rush meets them
    if (thicket.inside(c, 400)) logChallenge(`thicketNear ${thicket.inside(c, 400).ring + 1}`, P);
    if (predHere() && Math.hypot(c.x - predZone.x, c.z - predZone.z) < predZone.r + 400) logChallenge(`predatorNear ${predK}`, P);
    if (PORTAL.placed && flat(c, PORTAL) < 3000) logChallenge('portalNear', P);
  }
}
/** The dive lands: a strong bite if the target is still there, a squash, a rebound; or a clear miss. */
function diveImpact() {
  const d = play.dive;
  play.dive = null;
  play.lastImpact = { t: simTime, hit: false };
  const t = d.target;
  if (t) {
    const near = (t.foe === 'boss' ? boss.bitePoints() : [pred.center, pred.mouth(new THREE.Vector3())]).some((p) => p.distanceTo(mite.center) < 460);
    if (near) {
      play.lastImpact.hit = true; play.pounces = (play.pounces || 0) + 1;
      hitPause = 0.12;
      if (rumbleOn) padOf().rumble(260, 0.9, 0.7);
      audio.play('mite/bite', { volume: 1, rate: 0.75 });
      mite.bite();
      kickDust(mite, 8);
      if (t.foe === 'boss') { const gone = boss.bitten(2, cur.slot); hud.toast(gone ? 'Pounce-bite! The pseudoscorpion backs into the moss' : 'Pounce-bite on its pincer!', 1300); }
      else { wearDown('bite'); if (predAI.state !== 'retreat') wearDown('bite'); hud.toast('Pounce-bite on the predatory mite!', 1200); }
      // rebound: a little hop back
      mite.st.fwd.negate(); mite.jump(); play.rebound = 0.25;
      return;
    }
  }
  hud.toast('Missed!', 900);
  kickDust(mite, 4);
}
/** A grab's strike window: a scramble (B) breaks out of it. */
function dashOut(P) {
  capture.reset(); cap.phase = null; cap.heldOnce = false;
  const away = cap.byBoss ? boss.center : pred.center;
  const c = P.mite.center, v = c.clone().sub(away).setY(0).normalize();
  P.mite.setVisible(true);
  P.mite.place(c.x + v.x * 260, c.z + v.z * 260, Math.atan2(-v.z, v.x));
  P.play.scr = true; P.play.stam = Math.max(0, (P.play.stam ?? 1) - 0.4); P.play.hurt = Math.max(0, P.play.hurt - 1);
  if (cap.byBoss) { boss.st.state = 'recover'; boss.st.t = 0; boss.fight.bitten(); } else { pred.st.chel = 0; predAI.repel(); fight.bitten(); }
  cap.byBoss = false;
  withRec(P, () => { if (rumbleOn) padOf().rumble(200, 0.6, 0.6); kickDust(P.mite, 10); });
  hud.toast('Dashed out of its grip!', 1500);
}
/** The pseudoscorpion's grab: a catch like the predator's (createCapture), with its own pose. */
function startBossCapture() {
  if (capture.active) return;
  Object.assign(cap, { phase: null, leg: 0, heldOnce: false, t: 0, who: cur, byBoss: true });
  cap.c0.copy(mite.center); cap.q0.copy(mite.quat);
  play.caught++; play.stun = 0;
  capture.start({ by: 'The pseudoscorpion', how: 'seized you in its pincer, venomed you and ate you' });
  embed.captured({ by: 'boss', player: cur.slot });
  audio.play('mite/predator', { volume: 1, rate: 0.6 });
  if (rumbleOn) padOf().rumble(400, 0.9, 1);
}
// the boss's resolve: a quiet brass gauge, shown while it is engaged
const gauge = document.createElement('div');
gauge.style.cssText = 'position:fixed;left:50%;top:48px;transform:translateX(-50%);display:none;align-items:center;gap:10px;color:#e9d9a8;font:600 11px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-shadow:0 1px 2px #000a;pointer-events:none;z-index:6';
gauge.innerHTML = '<span>Pseudoscorpion</span><span style="width:180px;height:5px;border:1px solid #b8913f;background:rgba(20,16,8,.45);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:100%;background:linear-gradient(90deg,#8a6a2c,#d8b268);transition:width .25s"></i></span>';
document.body.appendChild(gauge);

function tick(dt, inputs) {
  if (hitPause > 0) { hitPause -= dt; dt *= 0.06; }
  stepDust(dt);
  // stamina, the scramble's dust
  for (const P of recs()) {
    const pl = P.play;
    if (pl.stam === undefined) pl.stam = 1;
    if (pl.scr) { pl.stam = Math.max(0, pl.stam - dt / 1.6); if (Math.random() < dt * 30) kickDust(P.mite, 1); }
    else pl.stam = Math.min(1, pl.stam + dt / 2.8);
  }
  // grazed hyphal tips and spore heads grow back (spores do not: there are plenty)
  for (const f of world.food) {
    if (f.left > 0 || f.kind !== 'hypha' || (f.t -= dt) > 0) continue;
    f.left = 1;
  }
  for (const f of thicket.food) {
    if (f.left > 0 || (f.t -= dt) > 0) continue;
    f.left = 1;
    thicket.shrinkHead(f, 1);
  }
  // the catch: the victim's own pad restarts (alone) or closes up
  const who = capture.active && cap.who ? cap.who : P1;
  let cs = withRec(who, () => capture.update(dt, capPad ? players.pad(who.slot) : null));
  if (cs.active && cs.phase === 'eaten' && multi()) {
    // multiplayer: no Eaten card; the player comes back beside a teammate
    capture.reset(); cap.phase = null; cap.who = null; pred.st.chel = 0;
    predAI.state = 'wander'; predAI.bored = 10; predAI.ang += Math.PI;
    respawnNear(who);
    hud.toast(`Player ${who.slot + 1} was eaten, and is back beside a teammate`, 2400);
    cs = { active: false };
  }
  // the strike window: a scramble (B, with stamina) breaks out of the grip
  if (cs.active && cs.phase === 'strike' && capPad && players.controls(who.slot).defend.down() && (who.play.stam ?? 1) > 0.3) { dashOut(who); cs = { active: false }; }
  if (cs.active) withRec(who, () => animateCapture(cs, dt));
  else if (predHere()) hunger.update(dt);
  // Blades and hyphae move first (pushed and loaded by where the mites were),
  // so each mite then settles on, and clears, the surfaces as they are now.
  // (the tile's blades and hyphae see each body's copies in tile coordinates; the thickets' threads stand where they are)
  const fbodies = [...recs().map((P) => P.mite), ...(npcOn ? [npc] : []), ...(predHere() ? [pred] : [])].map(bodyOf);
  world.foliage.update(dt, world.tileBodies(fbodies));
  thicket.updateFoliage(dt, fbodies);
  const evs = [];
  for (const P of recs()) withRec(P, () => {
    dash.update(dt);
    play.stun = Math.max(0, play.stun - dt);
    if (play.hurt > 0 && (play.heal += dt) > 20) { play.hurt--; play.heal = 0; }
    let input = (inputs && inputs[P.slot]) || { dir: new THREE.Vector3(), mag: 0, maxSpeed: WALK, hold: false };
    // the thicket drags (threads across the body, springtails pressing); the scramble halves it
    const dr = thicket.drag(mite.center, P.drag || (P.drag = { k: 1, threads: 0, press: 0 }));
    if (dr.k < 1 && input.maxSpeed) input.maxSpeed *= play.scr ? 1 - (1 - dr.k) * 0.5 : dr.k;
    if (play.stun > 0) input = { ...input, mag: 0 };
    if (cs.active && cap.who === P) input = { ...input, mag: 0 };
    const ev = mite.update(dt, input);
    if (ev.includes('jump')) puffDust(mite, 8, 0.8);
    if (ev.includes('land')) puffDust(mite, 18, Math.min(1.4, 0.6 + (mite.st.landV || 0) / 5000));
    if (play.dive && (ev.includes('land') || ev.includes('impact') || mite.mode === 'walk')) diveImpact();
    else if (play.dive && play.dive.target && mite.mode === 'air') {
      // homing: the dive follows its target as it moves
      const t = play.dive.target, pts = t.foe === 'boss' ? boss.bitePoints() : [pred.center.clone()];
      let best = null, bd = Infinity;
      for (const p of pts) { const d = p.distanceTo(t.p); if (d < bd) { bd = d; best = p; } }
      if (best) { t.p.copy(best); const at = best.clone(); at.y = Math.max(floorH(at.x, at.z), at.y - 120); mite.dive(at); }
    }
    if (play.rebound > 0 && (play.rebound -= dt) <= 0) mite.st.fwd.negate();
    soundTick(dt, ev);
    evs[P.slot] = ev;
  });
  if (npcOn) npc.update(dt, npcInput(dt));
  // the crowd: every mite shoves springtails aside; the gamasid feeds on them when it is not after you
  thickBodies.length = 0;
  for (const P of recs()) if (!held(P)) thickBodies.push(bodyRef(P.slot, P.mite.center, 175));
  const predBody = predHere() ? bodyRef(9, pred.center, 330) : null;
  if (predBody) thickBodies.push(predBody);
  thicket.update(dt, thickBodies, { pred: predHere() ? pred : null, predBody, predFree: predHere() && !capture.active && ['wander'].includes(predAI.state) });
  challenges(dt);
  const nip = recs().some((P) => P.play.nip);
  if (predHere() && capture.active && cap.who && !cap.byBoss) {
    if (['follow', 'fadeOut', 'fadeIn'].includes(capture.phase)) {
      // its meal swallowed, it walks on (the camera follows)
      const f = _ct.set(1, 0, 0).applyQuaternion(pred.quat).setY(0).normalize().clone();
      f.applyAxisAngle(_up, 0.25 * dt);
      pred.update(dt, { dir: f, mag: 0.35, maxSpeed: 260, hold: false, accel: 0.2 });
    } else {
      // the predator stands over its catch, turned to it
      const to = _ct.subVectors(cap.who.mite.center, pred.center).setY(0);
      pred.update(dt, { dir: to.lengthSq() > 1 ? to.normalize().clone() : new THREE.Vector3(), mag: 0.02, maxSpeed: 40, hold: false, accel: 0.2 });
    }
    pred.act({});
  } else if (predHere()) {
    // it goes for the nearest player
    let prey = P1, bd = Infinity;
    for (const P of recs()) { const d = P.mite.center.distanceTo(pred.center); if (d < bd) { bd = d; prey = P; } }
    withRec(prey, () => {
      const r = predAI.step(dt, { mite, closed: closedNow(), speed: mite.speed, hungry: isHungry() });
      pred.update(dt, r.input);
      // readable: rears with leg I up and the chelicerae open in the wind-up
      pred.act({ rear: predAI.rear });
      if (predAI.state === 'windup' || predAI.state === 'strike') pred.st.chel = Math.max(pred.st.chel, predAI.rear);
      else pred.st.chel = Math.max(0, pred.st.chel - dt * 3);
      // interest: worn down while you face it close by
      const hunting = ['hunt', 'windup', 'strike', 'recover', 'recoil'].includes(predAI.state);
      const toP = _ct.subVectors(pred.center, mite.center).setY(0).normalize();
      const fwd = _cf.set(1, 0, 0).applyQuaternion(mite.quat).setY(0).normalize();
      const f = fight.update(dt, { near: hunting && bd < 900, facing: toP.dot(fwd) > 0.5 });
      if (f.retreated) { fightLog.retreats++; predAI.retreat(); if (hunger.hungry) hunger.missed(); hud.toast('The predatory mite gives up on you', 1800); fight.reset(); }
      const who = multi() ? `Player ${cur.slot + 1}: ` : '';
      for (const e of r.events) {
        if ((e === 'gaveUp' || e === 'lost') && hunger.hungry) hunger.missed();
        if (e === 'hunt') { audio.play('mite/predator', { volume: 0.9 }); logChallenge('predator hunt', cur); }
        if (e === 'legHit') audio.play('mite/predator', { volume: 0.6, rate: 1.25 });
        if (e === 'hunt') hud.toast(`${who}A predatory mite has touched you: run (B), jump (A), close up (Y) or nip it (X)`, 2600);
        else if (e === 'windup') { hud.toast(`${who}It rears to strike: close up (Y), or jump`, 1400); if (rumbleOn) padOf().rumble(250, 0.15, 0); }
        else if (e === 'blocked') { if (rumbleOn) padOf().rumble(90, 0.2, 0.35); wearDown('block'); }
        else if (e === 'legHit') {
          play.hurt++; play.stun = 0.7; play.heal = 0;
          if (rumbleOn) padOf().rumble(260, 0.8, 0.9);
          if (play.hurt >= 3) startCapture();
          else hud.toast(`${who}It grabbed a leg (${play.hurt}/3): get away!`);
        }
      }
    });
  }
  // each player's act (bite, eat, fight), and the last safe spot
  for (const P of recs()) withRec(P, () => { stepAct(dt); if (!held(P) && pred.center.distanceTo(mite.center) > 1200 && mite.mode === 'walk' && (P.safeT = (P.safeT || 0) + dt) > 1) { P.safeT = 0; P.safe = mite.center.clone(); } });
  for (const P of recs()) P.play.nip = false;
  // the boss (boss.js): on guard before the axil once the portal is placed, dormant until someone comes near
  if (PORTAL.placed && !(capture.active && cap.byBoss)) {
    // placement paces it (layout.js): it wakes whenever someone comes near its post
    const bctx = { awake: true, players: recs().map((P) => {
      const c = P.mite.center, f = new THREE.Vector3(1, 0, 0).applyQuaternion(P.mite.quat).setY(0).normalize();
      const to = new THREE.Vector3(boss.st.x - c.x, 0, boss.st.z - c.z).normalize();
      return { slot: P.slot, x: c.x, z: c.z, center: c.clone(), alive: !held(P), closed: withRec(P, closedNow), airborne: P.mite.airborne, facing: f.dot(to) > 0.5 };
    }) };
    for (const e of boss.update(dt, bctx)) {
      const P = e.slot !== undefined ? pls[e.slot] : null;
      if (e.type === 'wake') {
        let nearest = P1, nd = Infinity;
        for (const Q of recs()) { const d = Math.hypot(Q.mite.center.x - boss.post.x, Q.mite.center.z - boss.post.z); if (d < nd) { nd = d; nearest = Q; } }
        const first = !challengeLog.some((x) => x.kind === 'boss');
        logChallenge('boss', nearest);
        if (first) hud.toast('The pseudoscorpion wakes! Watch for its pincers held open and still', 3000);
      }
      else if (e.type === 'tell') { for (const Q of recs()) if (Q.mite.center.distanceTo(boss.center) < 2600) withRec(Q, () => { if (rumbleOn) padOf().rumble(200, 0.12, 0); }); }
      else if (['snap', 'sweep', 'step'].includes(e.type)) audio.play('mite/predator', { volume: 0.8, rate: 0.7 });
      else if (e.type === 'grab' && P) withRec(P, () => startBossCapture());
      else if (e.type === 'survived') hud.toast('Closed up: the pincer closes on a smooth capsule', 1600);
      else if (e.type === 'miss') hud.toast('It missed: bite its pincer joints (X) while it recovers', 1500);
      else if (e.type === 'retreat') hud.toast('The pseudoscorpion backs into the moss: the way is open', 2600);
      else if (e.type === 'return') hud.toast('The pseudoscorpion turns back to guard the water', 1800);
    }
  }
  props.update(simTime, dt);
  stepDirector(dt);
  checkLandmarks();
  return evs;
}

function unlockAny() {
  for (const p of players.active) {
    const pp = players.pad(p.slot);
    if (pp.kind !== 'controller') continue;
    for (let b = 0; b < 16; b++) if (pp.value(b) > 0.5) { audio.unlock(); return; }
  }
}
/** Every player's input this frame, by slot (player 1 also drives the camera and the imaging). */
function readInput(dt) {
  players.poll(); // the roster and every player's pad (do not also poll the pads)
  syncPlayers();
  unlockAny();
  const menu = features.update();
  capPad = !menu;
  if (menu) return [];
  hud.update(pad);
  // RS: orbit (any player turns it); pitch by intent (up looks up: the camera swings down).
  let yaw = 0;
  for (const p of players.active) yaw += players.controls(p.slot).look().yaw;
  rig.yaw += THREE.MathUtils.clamp(yaw, -1, 1) * 1.8 * dt;
  const lk = ctl.look();
  rig.pitch = THREE.MathUtils.clamp(rig.pitch - lk.pitch * 1.2 * dt, 0.18, 1.5);
  const look = ctl.lookStep();
  if (look) { features.set('look', LOOKS[(sem.mode + look + LOOKS.length) % LOOKS.length]); hud.toast(MODES[sem.mode]); }
  const zs = ctl.zoomStep();
  if (zs) { rig.hfw = THREE.MathUtils.clamp(rig.hfw / (zs > 0 ? 1.5 : 1 / 1.5), 160, 4200); hud.toast(`mag ${(127000 / rig.hfw).toFixed(0)}x`); }
  // The SEM observer view is a standalone prototype aid, never a game action.
  if (!embed.active && ctl.stickClick.left.pressed()) { features.set('observer', !observer); hud.toast(observer ? 'Observer mode' : 'Observer mode off'); }
  camFwd.set(-Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  camRight.set(-camFwd.z, 0, camFwd.x);
  const out = [];
  for (const p of players.active) {
    const P = pls[p.slot];
    if (P) out[p.slot] = withRec(P, () => inputFor(players.controls(p.slot), players.pad(p.slot)));
  }
  return out;
}
/** One player's walking input from their controls (`mite` etc. are theirs). */
function inputFor(c, pd) {
  if (c.attack.pressed() && !mite.airborne) biteNow();
  const sec = c.secondary();
  const ls = c.move();
  // the walking speed: LB (Q) the slow end, RB (F) full tilt, else the stick (keys: a middle pace)
  const tilt = sec < 0 ? 1e-3 : sec > 0 ? 1 : pd && pd.kind === 'keyboard' ? KEY_WALK : ls.m;
  const dir = camFwd.clone().multiplyScalar(-ls.y).addScaledVector(camRight, ls.x);
  // Mite exception to shared actions: A jumps, B scrambles, Y closes up.
  // Shared c.defend reads B and c.special reads Y; at the backdoor Y goes back,
  // and at the open portal Y goes through (instead of closing up).
  if (c.dash.pressed() && play.stun <= 0 && mite.jump()) { if (rumbleOn) padOf().rumble(90, 0.25, 0.4); }
  // the scramble: held B, on a stamina meter (empties in ~1.6 s, refills in ~2.8 s)
  if (play.stam === undefined) play.stam = 1;
  const want = c.defend.down() && mite.mode === 'walk' && play.stun <= 0 && !play.act;
  if (want && !play.scr && play.stam > 0.15) { play.scr = true; audio.play('mite/dash', { volume: 0.9 }); if (rumbleOn) padOf().rumble(140, 0.3, 0.5); }
  if (!want || play.stam <= 0) play.scr = false;
  // X in the air: the pounce-bite
  if (c.attack.pressed() && mite.airborne) startDive();
  const toPortal = atOpenPortal(cur);
  if (toPortal && c.special.pressed()) enterPortal(cur);
  const hold = c.special.down() && !(toPortal && c.special.pressed());
  if (atBack(cur) && mite.mode === 'walk' && c.special.pressed()) goBack(cur);
  const dashing = play.scr && mite.mode === 'walk';
  if (dashing && ls.m < 0.2) dir.set(1, 0, 0).applyQuaternion(mite.quat).setY(0); // no stick: straight ahead
  return { dir: dir.lengthSq() > 0 ? dir.normalize() : dir, mag: dashing || ls.m > 0 ? 1 : 0, maxSpeed: dashing ? DASH : walkSpeed(tilt) * (1 - 0.15 * play.hurt), accel: dashing ? 0.08 : 0.16, turnK: dashing ? 2.4 : 1, lean: dashing ? 1 : 0, hold, jumpHeld: c.dash.down() };
}

function react(evs) {
  if (!rumbleOn) return;
  for (const P of recs()) withRec(P, () => react1(evs[P.slot] || []));
}
function react1(ev) {
  for (const e of ev) {
    if (e === 'step') padOf().rumble(25, 0.08, 0);
    else if (e === 'closed') { padOf().rumble(140, 0.35, 0.7); }
    else if (e === 'opened') padOf().rumble(70, 0.2, 0.1);
    else if (e === 'impact') padOf().rumble(110, 0.4, 0.5);
    else if (e === 'land') padOf().rumble(70, 0.25, 0.3);
  }
}

// What the predator is doing, always on screen when it matters.
const banner = document.createElement('div');
banner.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:6;padding:6px 14px;border-radius:999px;font:600 13px system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;pointer-events:none;white-space:nowrap;display:none';
document.body.appendChild(banner);
const CAP_LINES = { strike: 'Seized by a leg! Close up (Y) to slip free', hold: 'Being pulled in: close up (Y)!', eat: 'The predatory mite is eating you', follow: 'Eaten', fadeOut: 'Eaten', fadeIn: '' };
function updateBanner() {
  let txt = '', hot = true;
  gauge.style.display = boss.engaged ? 'flex' : 'none';
  gauge.querySelector('i').style.width = `${(boss.resolve * 100).toFixed(0)}%`;
  if (capture.active) txt = cap.byBoss && ['strike', 'hold'].includes(capture.phase) ? 'In its pincer! Close up (Y), or scramble out (B) now' : cap.byBoss && capture.phase === 'eat' ? 'The pseudoscorpion is eating you' : CAP_LINES[capture.phase] || '';
  else if (boss.attacking) txt = boss.st.state === 'tell' ? 'Pincers open and still: get out of reach, or close up (Y)' : 'It snaps!';
  else if (predHere() && predAI.attacking) txt = 'It rears to strike! Close up (Y), or jump (A)';
  else if (predHere() && predAI.state === 'retreat') { txt = 'The predatory mite is running off'; hot = false; }
  else if (predHere() && predAI.state === 'hunt') txt = `A predatory mite is hunting you${play.hurt ? ` (legs grabbed ${play.hurt}/3)` : ''}`;
  else if (predHere() && isHungry()) { txt = 'The predatory mite is hungry'; hot = false; }
  banner.style.display = txt ? 'block' : 'none';
  banner.textContent = txt;
  banner.style.background = hot ? 'rgba(150,30,20,.8)' : 'rgba(10,12,16,.6)';
}

let frames = 0, statT = 0;
// ---------- split screen and the edge arrows ----------
// The SEM composite (and a borrowed look) ends on the screen, so the split
// copies each view from it (capture). Split views render at a lower
// resolution (the quality governor's split factor): the composite costs per pixel.
const split = createSplitScreen(renderer, { capture: true });
const marks = createLandmarks();
const _vc = new THREE.Vector3(), _vd = new THREE.Vector3(), _pm = new THREE.Matrix4();
/** Where a view looks: its line of sight met with the floor's mean level (or 5 mm out, looking up). */
function viewTarget(cam, out) {
  cam.getWorldDirection(_vd);
  const t = _vd.y < -0.05 ? cam.position.y / -_vd.y : 5000;
  return out.copy(cam.position).addScaledVector(_vd, Math.min(t, 12000));
}
let glowT = 0;
const glowU = props.glow.group.children[0].material.uniforms; // (its shared uniforms: uI is its brightness)
function drawFrame(dt) {
  glowT += dt;
  if (PORTAL.placed) {
    props.glow.setOpen(!guarded() && !portalSealed());
    props.glow.update(dt, glowT, camera, outro ? outro.t : undefined);
    // after the burst the sparkle dims, so the tardigrade in the water reads in the freeze frame
    glowU.uI.value = outro ? 1.15 - 0.9 * THREE.MathUtils.smoothstep(outro.t, 0.5, 1.3) : 1.15;
  }
  // a caught player's view follows the predator with its meal
  const eating = capture.active && ['eat', 'follow', 'fadeOut'].includes(capture.phase);
  split.update(recs().map((P) => ({ slot: P.slot, position: (eating && cap.who === P ? (cap.byBoss ? boss.center : pred.center) : P.mite.center).clone() })), { camera }, dt);
  quality.setSplitViews(split.views.length);
  const one = split.views.length === 1;
  const cut0 = shared.uCutP.value.clone();
  let fi = 0;
  split.render(camera, (view) => {
    // the scenery tile's copies round this view's target, and this view's frustum and focus (what it sees: the director)
    viewTarget(camera, _vc);
    world.setView(camera, _vc.x, _vc.z);
    const f = viewFrusta[fi] || (viewFrusta[fi] = new THREE.Frustum());
    f.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    (viewFoci[fi] || (viewFoci[fi] = new THREE.Vector3())).copy(_vc);
    fi++;
    if (!one) {
      // the cutaway clears the way to this view's own players
      _vc.set(0, 0, 0);
      let n = 0;
      for (const s of view.slots) if (pls[s]) { _vc.add(pls[s].mite.center); n++; }
      if (n) shared.uCutP.value.copy(_vc.divideScalar(n)).applyMatrix4(camera.matrixWorldInverse);
    }
    // the screen pass is scissored to this view's region by the split; the G-buffer too
    if (!one) split.scissor(view, sem.target);
    renderView(dt);
    // the portal's golden glow, over the micrograph (additive; it reads through the moss)
    if (PORTAL.placed) { renderer.clearDepth(); renderer.render(glowScene, camera); }
  });
  viewFrusta.length = fi;
  viewFoci.length = fi;
  seenViews = viewFrusta.map((f, i) => ({ frustum: f, focus: viewFoci[i] }));
  split.unscissor(sem.target);
  shared.uCutP.value.copy(cut0);
  marks.begin();
  portalLight.begin();
  if (intro && !('ease' in intro)) return; // held in the intro: no marks
  // no arrow by default (the owner: keep moving and you find it): once open, the portal's golden
  // light spills in from the edge of the view on its side, or haloes it in view; no text (the Portal
  // arrow setting adds one: drawPortalArrow). On the default path it is there from the start, sealed.
  if (PORTAL.placed && !portalSealed() && !outro) {
    let d = Infinity;
    for (const P of recs()) d = Math.min(d, flat(P.mite.center, PORTAL));
    portalLight.drawSplit(split, PORTAL.at, { strength: THREE.MathUtils.clamp(1.2 - d / 9000, 0.4, 1), open: props.glow.open });
  }
  if (outro) return;
  marks.drawSplit(split, props.back, { kind: 'backdoor', label: 'Up', range: 4000 });
  drawPortalArrow();
  // players' colours: a faint ring round each mite (with company only)
  if (multi()) {
    const ctx = marks.canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(Math.min(window.devicePixelRatio || 1, 2), 0, 0, Math.min(window.devicePixelRatio || 1, 2), 0, 0);
    const pxPerUm = innerWidth / rig.viewHfw;
    for (const v of split.layout.views) {
      for (const s of v.slots) {
        const P = pls[s];
        if (!P) continue;
        const pr = split.project(v.index, P.mite.center);
        if (pr.behind) continue;
        const r = Math.max(12, 130 * pxPerUm);
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)';
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y + r * 0.25, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.5; ctx.strokeStyle = P.color;
        ctx.stroke();
        ctx.font = '600 10px system-ui, sans-serif'; ctx.fillStyle = P.color; ctx.textAlign = 'center';
        ctx.fillText(`P${s + 1}`, pr.x, pr.y + r * 0.25 + r * 0.45 + 12);
      }
    }
    ctx.restore();
  }
}
/**
 * The "Portal arrow" setting (the game's Settings, default off; ?arrow=1 here): an arrow at the edge of
 * each view toward the way on (the wet leaf axil: the director's portals(), one here, the axil being one
 * object), with the view's nearest mite's distance in mm. Sealed too: it is where the way on will open.
 */
let arrowLog = [];
function drawPortalArrow() {
  arrowLog = [];
  if (!portalArrowOn() || !PORTAL.placed || outro) return;
  const pp = PORTAL.at;
  arrowLog = marks.drawSplit(split, (vp) => {
    let d = Infinity;
    for (const v of vp) { const P = pls[v.slot]; if (P) d = Math.min(d, flat(P.mite.center, PORTAL)); }
    if (!isFinite(d)) d = flat(P1.mite.center, PORTAL);
    return { position: pp, label: `${(d / 1000).toFixed(1)} mm`, distance: d };
  }, { kind: 'forward', portal: true, range: 30000 }).map((r) => r && { x: r.x, y: r.y, angle: r.angle, onScreen: r.onScreen, d: Math.round(r.picked.distance), label: r.picked.label, at: [Math.round(pp.x), Math.round(pp.y), Math.round(pp.z)] });
}
function updateText(d) {
  updateBanner();
  const mag = 127000 / rig.hfw; // relative to a 127 mm (Polaroid 4x5) reference image width
  const st = mite.mode === 'air' ? 'jumping' : mite.mode === 'crouch' ? 'crouching to jump' : mite.mode === 'walk' ? (play.scr ? `SCRAMBLE ${mite.speed.toFixed(0)} µm/s` : mite.st.climbing > 0.2 ? `climbing ${mite.speed.toFixed(0)} µm/s` : mite.speed > 5 ? `walking ${mite.speed.toFixed(0)} µm/s` : 'standing') : mite.mode === 'closed' ? 'closed (ptychoid)' : mite.mode;
  const fol = world.foliage.stats;
  const pst = predHere() ? `predator ${capture.active ? `CAPTURE ${capture.phase}` : predAI.state === 'hunt' ? 'HUNTING' : predAI.state === 'recoil' ? 'recoiling' : 'wandering'} ${predAI.dist.toFixed(0)} µm · ${hunger.state === 'grace' ? 'calm until its ground' : `${hunger.state} ${hunger.left.toFixed(0)} s`}` : '';
  const info = renderer.info.render;
  const out = distFromStart(mite.center.x, mite.center.z);
  hud.stats(`${MODES[sem.mode]}${qScale < 1 ? `  (res ${(qScale * 100).toFixed(0)}%)` : ''}\n${(out / 1000).toFixed(1)} mm out${PORTAL.placed ? (portalSealed() ? ' · portal sealed' : guarded() ? ' · portal guarded' : ' · portal open') : ''}\nHFW ${rig.hfw.toFixed(0)} µm   mag ${mag.toFixed(0)}x\n${st}\n${stamText(play)}   legs grabbed ${play.hurt}/3   grazed ${play.grazed}\n${pst}\nblades bending ${fol.moving}   pen ${mite.st.pen.toFixed(0)} µm\n${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris`);
  if (observer) {
    const sb = niceScale(rig.hfw);
    const px = (sb / rig.hfw) * innerWidth;
    bar.innerHTML = `<span>HV 5.00 kV</span><span>WD ${(d / 1000).toFixed(1)} mm</span><span>mag ${mag.toFixed(0)} x</span><span>HFW ${(rig.hfw / 1000).toFixed(2)} mm</span><span>det ${sem.mode === 1 ? 'BSED' : 'ETD'}</span><span>${sem.mode === 1 ? 'LowVac 60 Pa' : 'HiVac'}</span>`
      + `<span style="margin-left:auto;display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:${px.toFixed(1)}px;height:6px;background:#fff"></span>${sb >= 1000 ? sb / 1000 + ' mm' : sb + ' µm'}</span><span>Micro prototypes</span>`;
  }
}

/** Tests that step without drawing: the camera and the views' frustums as a drawn frame would have them, so the director sees what they see. */
function stepViews(dt) {
  placeCamera(dt);
  split.update(recs().map((P) => ({ slot: P.slot, position: P.mite.center.clone() })), { camera }, dt);
  const n = Math.max(1, split.views.length);
  for (let i = 0; i < n && i < 4; i++) split.withView(i, camera, () => {
    camera.updateMatrixWorld();
    (viewFrusta[i] || (viewFrusta[i] = new THREE.Frustum())).setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    viewTarget(camera, viewFoci[i] || (viewFoci[i] = new THREE.Vector3()));
  });
  viewFrusta.length = Math.min(n, 4); viewFoci.length = viewFrusta.length;
  seenViews = viewFrusta.map((f, i) => ({ frustum: f, focus: viewFoci[i] }));
}
let last = performance.now(), simTime = 0;
const api = {
  scene, camera, renderer, sem, world, mite, npc, pred, predAI, play, dash, rig, features, cfg: CFG, paused: false,
  tick(dt, input = { dir: new THREE.Vector3(), mag: 0, maxSpeed: WALK, hold: false }) { return tick(dt, [input])[0]; },
  hunger, capture, pace, resetLevel,
  get time() { return simTime; },
  /** Testing: one fixed step with the left stick at (x, y) in world x/z (null: hands off); hold: Y; speed: µm/s at full tilt (a rush: ~730). */
  testStep(dt = 1 / 30, stick = null, hold = false, speed = WALK) {
    simTime += dt;
    const m = stick ? Math.min(1, Math.hypot(stick.x, stick.y)) : 0;
    tick(dt, [{ dir: new THREE.Vector3(stick ? stick.x : 0, 0, stick ? stick.y : 0).normalize(), mag: m, maxSpeed: speed, hold, accel: 0.18 }]);
    stepViews(dt);
  },
  // ---- multiplayer and landmarks (Playwright drives these)
  players, split, marks, joins, landmarks: { forward: FORWARD, back: BACKDOOR, forwardAt: props.forward.at, backAt: props.back }, landmarkLog: lm.log, props,
  get frames() { return frames; },
  get layout() { return split.layout; },
  recs: () => recs().map((P) => ({ slot: P.slot, x: Math.round(P.mite.center.x), z: Math.round(P.mite.center.z), mode: P.mite.mode, hurt: P.play.hurt })),
  /** Put a player's mite at (x, z) µm and snap the camera. */
  teleport(slot, x, z, yaw = rig.yaw + Math.PI) {
    const P = pls[slot];
    if (!P) return false;
    P.mite.place(x, z, yaw);
    if (!multi()) rig.target.copy(P.mite.center);
    return true;
  },
  fight, fightLog, boss, thicket, quality,
  /** Where each challenge first started: [{ kind, slot, d (µm from the start), progress (encounters met / all), t }]. */
  challenges: challengeLog,
  plan: { rings: RINGS, clusters: CLUSTERS, predZone, tile: TILE, encounters: ENCOUNTERS.map((e) => e.id) },
  /** The encounters now: where the predator is (which time), the portal (placed, guarded), the director's state. */
  route() {
    return { rings: RINGS, pred: { k: predK, placed: predPlaced, x: Math.round(predZone.x), z: Math.round(predZone.z), state: predAI.state },
      portal: api.portal(), encounters: director.state() };
  },
  /** The director (shared/director.js): state(), seenAt(x, z), placeNow(), log. */
  director,
  encounters() { return director.state(); },
  seenAt(x, z) { return director.seenAt(x, z); },
  placeNow() { return director.placeNow(); },
  /** Testing: could no view (last drawn) see a disc of radius r at (x, z)? */
  unseen: (x, z, r = 600) => !inSight(x, z, r),
  get viewCount() { return viewFrusta.length; },
  /** How far through the encounters the game is (met / all, 0..1). */
  progress() { return encounterProgress(); },
  /** The portal: placed, where, guarded or open, the boss's state and how far it is from the water. */
  portal() {
    return { placed: PORTAL.placed, a: +PORTAL.a.toFixed(3), x: Math.round(PORTAL.x), z: Math.round(PORTAL.z), guarded: PORTAL.placed && guarded(), sealed: PORTAL.placed && portalSealed(), open: PORTAL.placed && !portalSealed() && !guarded(),
      boss: { state: boss.st.state, x: Math.round(boss.st.x), z: Math.round(boss.st.z), fromWater: PORTAL.placed ? Math.round(Math.hypot(boss.st.x - PORTAL.x, boss.st.z - PORTAL.z)) : null, fromPost: PORTAL.placed ? Math.round(Math.hypot(boss.st.x - boss.post.x, boss.st.z - boss.post.z)) : null },
      glow: +props.glow.open.toFixed(2), prompt: lm.portal, tardigrade: PORTAL.placed ? props.tardi.center.toArray().map(Math.round) : null };
  },
  /**
   * Testing only (it breaks the order on purpose): the portal now, `d` µm from
   * player `slot` at bearing `a` (default: the way they face). director.force
   * marks every earlier encounter met ('forced').
   */
  placePortal(a = null, slot = 0, d = 3000) { const P = pls[slot] || P1, c = P.mite.center, b = a ?? Math.atan2(P.mite.st.fwd.z, P.mite.st.fwd.x); director.force('portal', c.x + Math.cos(b) * d, c.z + Math.sin(b) * d, b); return api.portal(); },
  /** Testing only: place encounter `k` ('pred' | 'pred2' | 'portal') at (x, z), met along bearing b, out of order. */
  placeEncounter(k, x, z, b = 0) { return director.force(k, x, z, b); },
  /** Go through the portal now as player `slot` (what Y at the open portal does). */
  enterPortal(slot = 0) { lm.fired = false; enterPortal(pls[slot] || P1); },
  /** The portal arrow drawn last frame, per view: [{ x, y, angle, onScreen, d, label, at } | null] ([] when off). */
  portalArrow() { return arrowLog; },
  /** The director's portals (the way on): [{ instance, x, y, z, open, seen, state }]. */
  portals() { return director.portals().map(({ handle, ...q }) => q); },
  /** Is the way on still sealed (encounters left before it)? */
  portalSealed() { return portalSealed(); },
  /** The outro after the portal: null, or { t, scale (the world's time scale), frozen, cam (the shell's pose) }. */
  outro() { return outro ? { t: +outro.t.toFixed(3), scale: +outro.scale.toFixed(3), frozen: outro.frozenAt !== null, cam: outro.cam } : null; },
  /** The outro's timings (seconds); `rate` slows it (tests). */
  OUTRO,
  /** Testing: advance the outro by n frames of dt, rendering each (deterministic stills). */
  outroStep(n = 1, dt = 1 / 30) {
    for (let i = 0; i < n && outro; i++) { const k = stepOutro(dt); simTime += dt * k; if (k > 0) tick(dt * k, []); const d = outro && outro.scale <= 0 ? (outro.d || placeCamera(1e-4)) : placeCamera(outro ? dt * Math.max(outro.scale, 0.15) : dt); if (outro) outro.d = d; drawFrame(dt); }
    return api.outro();
  },
  /** How the frozen view frames the tardigrade (what embed.frozen reports). */
  tardiPose: () => tardiPose(),
  /** Testing: player `slot` near the boss's post (the portal placed on their bearing if it is not yet), the calm over: it wakes. */
  bossFight(slot = 0) { const P = pls[slot] || P1; if (!PORTAL.placed || portalSealed()) api.placePortal(bearingFromStart(P.mite.center.x, P.mite.center.z) || A0, slot); pace.mode = 'Always'; hunger.reset(0); hunger.update(0.01); boss.reset(); predAI.reset(...PRED_START); pace.mode = 'Never'; const b = boss.post; P.mite.place(b.x + b.ux * 1150, b.z + b.uz * 1150, Math.atan2(b.uz, -b.ux)); rig.target.copy(P.mite.center); hunger.reset(0); hunger.update(0.01); },
  /** Testing: face the boss's nearest pincer joint, within bite reach. */
  bossBite(slot = 0) { const P = pls[slot] || P1; const j = boss.bitePoints()[0]; if (!j) return; const c = P.mite.center; const v = new THREE.Vector3(c.x - j.x, 0, c.z - j.z).normalize(); P.mite.place(j.x + v.x * 330, j.z + v.z * 330, Math.atan2(v.z, -v.x)); },
  impact(slot = 0) { const P = pls[slot] || P1; return { last: P.play.lastImpact || null, pounces: P.play.pounces || 0, mode: P.mite.mode, dive: !!P.play.dive, stam: P.play.stam, scr: !!P.play.scr }; },
  /** Testing: jump player `slot` toward (x, z) (it faces there first). */
  jumpAt(slot, x, z) { const P = pls[slot] || P1; const c = P.mite.center; P.mite.place(c.x, c.z, Math.atan2(-(z - c.z), x - c.x)); P.mite.jump(); },
  /** Testing: the predator comes for player `slot`, head to head, hungry and hunting (it winds up next). */
  setFoe(_k, slot = 0) {
    const P = pls[slot] || P1;
    hunger.reset(0); hunger.update(0.01); pace.mode = 'Always';
    api.nudgeFoe(_k, slot);
    fight.reset();
  },
  /** Testing: bring the predator back in front of player `slot` (its interest kept). */
  nudgeFoe(_k, slot = 0) {
    const P = pls[slot] || P1, c = P.mite.center;
    const f = new THREE.Vector3(1, 0, 0).applyQuaternion(P.mite.quat).setY(0).normalize();
    pred.place(c.x + f.x * 560, c.z + f.z * 560, Math.atan2(f.z, -f.x));
    predPlaced = true; pred.setVisible(predOn);
    predAI.state = 'hunt'; predAI.cool = 0.3; predAI.t2 = 0; predAI.bored = 0;
  },
  /** Testing: calm the predator again (wandering, grooming). */
  calm() { pace.mode = 'Never'; predAI.reset(predZone.x, predZone.z); predAI.rear = 0; },
  /** Testing: player `slot` presses X (bite / graze / clear, by what is in front). */
  bite(slot = 0) { const P = pls[slot] || P1; withRec(P, biteNow); return P.play.act || null; },
  /** Testing: the thicket's drag on player `slot` now ({ k, threads, press }). */
  drag(slot = 0) { const P = pls[slot] || P1; return { ...thicket.drag(P.mite.center) }; },
  /** Testing: what player `slot` is doing. */
  me(slot = 0) { const P = pls[slot] || P1; return { act: P.play.act || null, nips: P.play.nips || 0, grazed: P.play.grazed, mode: P.mite.mode, hurt: P.play.hurt }; },
  /** Testing: put a spore right in front of player `slot`'s mouth. */
  feed(slot = 0) {
    const P = pls[slot] || P1;
    const f = world.food.find((q) => q.kind === 'spore' && q.left > 0);
    const m = P.mite.mouth(new THREE.Vector3());
    const fw = new THREE.Vector3(1, 0, 0).applyQuaternion(P.mite.quat).setY(0).normalize();
    f.p.copy(m).addScaledVector(fw, 60); f.p.y = m.y - 30;
    f.s0 = null; placeSpore(f, f.p, 1); f.s0 = null;
    return true;
  },
  /** Testing: the camera and the views' frustums as a drawn frame would have them (for the director), without drawing. */
  views(dt = 1 / 30) { stepViews(dt); },
  /** Run n render passes (camera and split screen) without stepping the simulation. */
  settle(n = 30) { for (let i = 0; i < n; i++) { placeCamera(1 / 30); drawFrame(1 / 30); } },
  /** Is anyone dwelling on the backdoor (the prompt is up)? */
  get nearBack() { return lm.near; },
  pacing() {
    const d = pred.center.distanceTo(mite.center);
    return { approach: capture.active || predAI.state === 'hunt', captured: capture.active, phase: capture.phase, kind: 'predator',
      hunger: { predator: hunger.state }, states: { predator: predAI.state }, dist: { predator: Math.round(d) }, mode: mite.mode, pen: Math.round(mite.st.pen * mite.scale) };
  },
  /** Testing: the predator seizes you right now (the whole catch plays). */
  forceCapture(slot = 0) {
    if (capture.active) return;
    const P = pls[slot] || P1;
    withRec(P, () => api._force());
  },
  _force() {
    if (mite.mode !== 'walk') mite.place(mite.center.x, mite.center.z, 0.3);
    const a = 0.3 + Math.PI / 2, c = mite.center;
    const x = c.x + Math.cos(a) * 560, z = c.z - Math.sin(a) * 560;
    pred.place(x, z, Math.atan2(-(c.z - z), c.x - x));
    predPlaced = true; pred.setVisible(predOn);
    predAI.state = 'hunt';
    startCapture();
  },
  render(dt = 1 / 60) { const d = placeCamera(0); drawFrame(dt); updateText(d); },
  /** Testing: n steps of the simulation (players' pads as they are), no rendering; returns the frames stepped. */
  steps(n = 1, dt = 1 / 30, inputs = []) { for (let i = 0; i < n; i++) { simTime += dt; tick(dt, inputs); } return n; },
  /** Testing: n steps through the real input path (the pads and keyboard as they are read each frame), no rendering; returns each step's events for player 1. Pause the page first (`paused = true`). */
  inputSteps(n = 1, dt = 1 / 30) { const ev = []; for (let i = 0; i < n; i++) { simTime += dt; const r = tick(dt, readInput(dt)); ev.push(...((r && r[0]) || [])); stepViews(dt); } return ev; },
  isolate(on) { world.group.visible = !on; npc.setVisible(!on); pred.setVisible(!on && predHere()); },
  setMode(m) { sem.setMode(m); sem.skipScan(); },
};
window.__micro = api;

// The shell's roster (players who joined in the menus come along); joins
// during play are polled here and reported back to it.
if (embed.players) players.fromJSON(embed.players);
embed.on('players', (r) => { players.fromJSON(r); syncPlayers(); });
syncPlayers();
hud.players(players.list);

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
  frames++;
  const held = embed.held || (intro && !('ease' in intro));
  // through the portal: time eases to a freeze (stepOutro), no input
  let k = outro ? stepOutro(dt) : 1;
  if (intro && 'ease' in intro) {
    // after the transition: time eases back in
    intro.ease += dt;
    k = THREE.MathUtils.smoothstep(intro.ease, 0, INTRO_EASE);
    if (intro.ease >= INTRO_EASE) intro = null;
  }
  if (!held) {
    const input = outro ? [] : readInput(dt);
    if (outro) players.poll();
    simTime += dt * k;
    if (k > 0) react(tick(dt * k, input));
  }
  if (gpuBusy()) return;
  const raw = now - lastSubmit;
  lastSubmit = now;
  if (!PR && !held) quality.update(raw / 1000);
  const d = held && intro && intro.cam ? placePoseCamera(intro.cam)
    : outro && outro.cam ? placeOutroCamera(outro.cam)
      : outro && outro.scale <= 0 ? (outro.d || placeCamera(1e-4)) : placeCamera(held ? 1e-4 : outro ? dt * Math.max(outro.scale, 0.15) : dt);
  if (outro) outro.d = d;
  drawFrame(dt);
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  statT += dt;
  if (statT > 0.25) { updateText(d); statT = 0; }
}
sem.warm(scene, camera); // the last kinds (the dust)
frame();

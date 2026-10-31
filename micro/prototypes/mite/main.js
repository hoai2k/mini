// Mite prototype: a box mite walking through a moss cushion, imaged as if in
// a scanning electron microscope. Units are µm throughout.
import * as THREE from '../shared/vendor/three.module.min.js';
import { embed } from '../shared/embed.js';
import { createPlayers, PLAYER_COLORS } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks } from '../shared/landmark.js';
import { createLandmarkProps, FORWARD, BACKDOOR } from './landmarks.js';
import { createPseudoscorpion } from './boss.js';
import { createControls, createDash, hudControls, addInvertY } from '../shared/controls.js';
import { createPredatorAI } from './predator.js';
import { createHunger, createCapture, createFight } from '../shared/predation.js';
import { mountHud } from '../shared/hud.js';
import { createSem, shared, MODES, CLS, gMaterial } from './sem.js';
import { semTextures } from './textures.js';
import { buildWorld, HALF, floorH } from './world.js';
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
const props = createLandmarkProps(world, tex);
scene.add(props.group);
// The boss: a pseudoscorpion lying in wait before the leaf axil (boss.js); worn down, it backs into the moss to the side.
const BOSS_POST = (() => { const L = Math.hypot(FORWARD.x, FORWARD.z), ux = -FORWARD.x / L, uz = -FORWARD.z / L; return { x: FORWARD.x + ux * 900, z: FORWARD.z + uz * 900, a: Math.atan2(uz, ux), ux, uz }; })();
const boss = createPseudoscorpion(scene, tex, { post: BOSS_POST, home: { x: BOSS_POST.x + BOSS_POST.uz * 1300, z: BOSS_POST.z - BOSS_POST.ux * 1300 } });

// The box mite is drawn at about 0.6 mm (mite.js) and placed at 0.58 of that:
// ~0.35 mm long, the size of a small phthiracarid (the Level 1 spec asks for
// ~270-390 µm). Its stride, hop and speeds shrink with it; the moss does not.
const MITE_SCALE = 0.58;
let mite = createMite(scene, world.colliders, { cls: CLS.CUTICLE, tex, scale: MITE_SCALE });
mite.place(0, 0, 0.3);
const npc = createMite(scene, world.colliders, { cls: CLS.NPC, tex, scale: MITE_SCALE });
npc.place(-950, 820, 2.2);
// The predator: a parasitid (Mesostigmata), pale, long-legged, hunting by touch.
const pred = createMite(scene, world.colliders, { cls: CLS.NPC, tex, anat: PRED });
const predAI = createPredatorAI(pred, HALF);
predAI.reset(900, 1250); // ~1.5 mm off, to the side of the way on: it starts well away from you

// Local multiplayer (shared/players.js): each player is a box mite of their
// own, with their own dash, wounds and sounds (a record, see makeRec).
// Code that acts on "the" player uses `mite`, `play`, `dash` and `snd`, which
// point at the record being stepped (withRec), and at player 1's otherwise.
const joins = [];
const players = createPlayers({
  max: 4,
  onJoin: (p) => { joins.push({ slot: p.slot, padIndex: p.padIndex }); syncPlayers(); hud.toast(`Player ${p.slot + 1} joined`); embed.join(p.slot, p.color, p.name); },
  onLeave: (p) => { syncPlayers(); hud.toast(`Player ${p.slot + 1} left`); embed.leave(p.slot); },
  onChange: (list) => hud && hud.players(list),
});
const pad = players.pad(0);
const ctl = players.controls(0);
let dash = createDash({ duration: 0.6, cooldown: 2.2 });
// Walking speeds (µm/s, world): scaled with the body (720 and 1300 at 0.6 mm).
const WALK = Math.round(720 * MITE_SCALE), DASH = Math.round(WALK * 2.1); // the scramble: ~2x the walk
const hud = mountHud({
  title: 'Mite · SEM',
  sub: 'A box mite (Phthiracaridae), about 0.35 mm long, in a moss cushion, imaged like a scanning electron micrograph. A predatory mite hunts here.',
  controls: hudControls({
    move: 'Walk (relative to the view); climbs grains, stems and flakes, pushes through blades',
    camera: 'Orbit the specimen (up looks up)',
    dash: 'Jump: a crouch and a hop (borrowed from jumping oribatids)',
    attack: 'Bite: graze spores and hyphal tips (leg I holds them); at the predator, rear up and nip it',
    defend: 'Hold: close up (ptychoidy, defend): blocks the predator\'s strike',
    special: 'Observer: data bar and scan lines. At the giant springtail: back up a world',
    analog: 'RT (hold): scramble, a burst of fast running',
    secondary: 'Walk slowly / hurry',
    look: 'Imaging mode: SE, BSE, false colour',
    zoom: 'Magnification steps',
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
const rig = { yaw: -0.6, pitch: 0.62, hfw: 1600, target: mite.center.clone() };
const camFwd = new THREE.Vector3(), camRight = new THREE.Vector3();

let renderScale = 1, dynRes = true, slowEma = 16, scaleT = 0, splitK = 1;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(DPR * renderScale * splitK);
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
  // several players: frame the group, a little wider as it spreads (the split screen takes over when they part)
  const mp = multi();
  const gc = mp ? groupCentre(recs()) : null;
  const want = mp ? rig.hfw * (1 + Math.min(0.6, (gc.spread / rig.hfw) * 0.7)) : rig.hfw;
  rig.viewHfw = rig.viewHfw === undefined || !dt ? want : rig.viewHfw + (want - rig.viewHfw) * (1 - Math.exp(-dt / 0.4));
  const d = rig.viewHfw / (2 * tanH);
  const k = dt ? 1 - Math.exp(-dt / 0.25) : 1;
  // a catch is framed whole: you and the predator (alone; with company the camera keeps the group)
  if (mp) rig.target.lerp(gc.c, k);
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
  world.cut.update(dt, camera.position, rig.target, { radius: 340, margin: 110, keep: cutKeep });
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
  if (Math.hypot(c.x, c.z) > HALF * 0.75) ai.ang = Math.atan2(-c.z, -c.x);
  let dist = Infinity;
  for (const P of recs()) dist = Math.min(dist, c.distanceTo(P.mite.center));
  if (dist < 300 && ai.scared <= 0 && npc.mode === 'walk') ai.scared = 3 + Math.random() * 2;
  ai.scared -= dt;
  ai.pause = (ai.pause + dt) % 14;
  const moving = ai.pause < 10;
  return { dir: new THREE.Vector3(Math.cos(ai.ang), 0, Math.sin(ai.ang)), mag: moving ? 0.6 : 0, maxSpeed: 180 * MITE_SCALE, hold: ai.scared > 0 };
}

// ---------- threats: pacing and being eaten (shared/predation.js) ----------
// A calm opening, then hunger that comes and goes; only a hungry predator
// hunts. Its third grab holds on: strike (it seizes a leg), hold (it pulls you
// in; close up, Y, and the grip slips off), eat (its chelicerae work at the
// soft body by the legs, which go limp and fold), then the Eaten card.
const PRED_START = [900, 1250];
const pace = { grace: 45, mode: 'Comes and goes' };
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
    const s = P.safe && P.safe.distanceTo(pred.center) > 900 ? P.safe : new THREE.Vector3();
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
  predAI.reset(...PRED_START);
  boss.reset();
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
  if (multi()) hud.toast(`Player ${cur.slot + 1} is seized by a leg: close up (B)!`, 2200);
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
const audio = createAudio(['mite/amb-moss', 'mite/step', 'mite/dash', 'mite/close', 'mite/open', 'mite/bite', 'mite/blade', 'mite/predator']);
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
  about: 'Hold B (defend): legs pull in and the aspis folds down to seal the body. Real euphthiracaroids close in about 0.1-0.15 s (Heethoff et al. 2018).',
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
F({ id: 'scramble', group: 'Simulation', label: 'Scramble (hold RT)', fixed: true,
  about: `0.6 s at up to ~${DASH} µm/s, recharging over 2.2 s. The gait phase runs on distance, so the legs speed up with it and the feet stay planted. A stretch: box mites are slow, steady walkers.` });
F({ id: 'jump', group: 'Simulation', label: 'Jump (A), borrowed from jumping oribatids', fixed: true,
  about: `A ${Math.round(JUMP.crouch * 1000)} ms crouch, then a ballistic hop (~${Math.round(MITE_SCALE * JUMP.vy ** 2 / 5200)} µm high, ~0.3 mm long; more from a run; scaled with the body), landing on the floor, a grain, a flake or a blade (which takes the landing and bends); ${JUMP.cool} s before the next. Box mites do not jump, but some oribatids do: Zetorchestes with enlarged hind legs and a catch mechanism (Krisper 1990), and the ptychoid Indotritia, a box-mite relative, jumps backwards with its forelegs (Wauthy et al. 1998). Borrowed here as a forward hop.` });
F({ id: 'bite', group: 'Simulation', label: 'Bite and graze (X)', fixed: true,
  about: 'The rostrum dips and the chelicerae work. In reach of the mouth: fungal spores (eaten) and hyphal branch tips (nibbled; they regrow), the box mite\'s real food. At the predator: a nip that makes it back off for 1.5 s (a game rule).' });
F({ id: 'predator', group: 'Simulation', label: 'Predatory mite (Parasitidae)', on: true,
  about: 'A pale, flattened gamasid ~0.8 mm long with long legs, leg I held up as a feeler. More than twice your length. After a calm opening it is hungry only some of the time (see Threats); hungry, it searches toward you, and when it touches you or feels you scramble close by it runs you down at ~0.6 mm/s (faster than your walk, slower than your scramble; all game speeds). Resting, it wanders and ignores you. It strikes at legs: on the third grab it holds on, pulls you in and eats you (the whole catch is shown); close up (B) while it holds you and its grip slips off. Each strike is telegraphed: it rears, leg I and the palps up, the chelicerae open (0.8 s). Closed up (B), you are a smooth capsule its strike slides off; blocks, nips (X) and facing it wear its interest down until it runs off (adult ptychoid mites are nearly immune: Peschel et al. 2006).',
  onChange: (v) => { predOn = v; pred.setVisible(v); } });
F({ id: 'grace', group: 'Simulation', label: 'Calm opening', choices: ['45 s', '20 s', '90 s', 'Off'], value: '45 s',
  about: 'How long after a start (and after each restart) before the predatory mite gets hungry. It starts ~1.3 mm away and wanders meanwhile, ignoring you even if it bumps into you. shared/predation.js.',
  onChange: (v) => { pace.grace = v === 'Off' ? 0 : parseFloat(v); hunger.reset(pace.grace); } });
F({ id: 'hunger', group: 'Simulation', label: 'Predator hunger', choices: ['Comes and goes', 'Always', 'Never'], value: 'Comes and goes',
  about: 'Comes and goes: after the calm opening it is hungry for ~18-32 s at a time, then rests (45-75 s after eating you, 15-30 s after you slip free, lose it or it gives up on your capsule); only a hungry predator searches toward you and hunts. Always: hungry from the end of the calm opening on. Never: it never hunts (for exploring and testing).',
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
  if (predOn && !capture.active && pred.center.distanceTo(m) < 600) {
    Object.assign(play, { act: 'fight', actT: 0, actDur: 0.6, snapped: false, foe: 'pred' });
    return;
  }
  let best = null, bd = 130;
  for (const f of world.food) {
    if (f.left <= 0) continue;
    const p = f.kind === 'hypha' ? world.foliage.offsetAt(f.rod, f.u, _fp).add(f.p) : f.p;
    const d = p.distanceTo(m);
    if (d < bd) { bd = d; best = f; }
  }
  if (best) {
    const p0 = best.kind === 'hypha' ? world.foliage.offsetAt(best.rod, best.u, _fp).add(best.p).clone() : best.p.clone();
    Object.assign(play, { act: 'eat', actT: 0, actDur: 0.9, food: best, food0: p0 });
    audio.play('mite/bite', { volume: 0.8, rate: 0.95 + Math.random() * 0.12 });
    return;
  }
  Object.assign(play, { act: 'attack', actT: 0, actDur: 0.4 });
  mite.bite();
  audio.play('mite/bite', { volume: 0.6, rate: 1.2 });
}
const _sm = new THREE.Matrix4(), _sp = new THREE.Vector3(), _sq = new THREE.Quaternion(), _ss = new THREE.Vector3();
/** Move and shrink a spore instance (s: 1 whole, 0 gone). */
function placeSpore(f, at, s) {
  if (!f.s0) { f.im.getMatrixAt(f.i, _sm); _sm.decompose(_sp, _sq, _ss); f.s0 = _ss.clone(); f.q0 = _sq.clone(); }
  _sm.compose(at, f.q0, _ss.copy(f.s0).multiplyScalar(Math.max(0, s)));
  f.im.setMatrixAt(f.i, _sm);
  f.im.instanceMatrix.needsUpdate = true;
}
/** Advance the current player's act and pose it (mite.act). */
function stepAct(dt) {
  if (!play.act || mite.mode !== 'walk') { if (play.act && play.food && play.food.kind === 'spore') placeSpore(play.food, play.food0, 1); play.act = null; mite.act({}); return; }
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
      } else if (play.foe !== 'boss' && predOn && !capture.active && pred.center.distanceTo(m) < 700) {
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
    if (f.kind === 'spore') placeSpore(f, at, 1 - Math.max(0, (u - 0.3) / 0.7));
    if (u >= 1) {
      play.grazed++;
      if (f.kind === 'spore') { f.left = 0; world.eatSpore(f); hud.toast(`Ate a fungal spore (${play.grazed} grazed)`); }
      else { f.left = 0; f.t = 25; hud.toast(`Nibbled a hyphal tip (${play.grazed} grazed)`); }
      if (rumbleOn) padOf().rumble(60, 0.25, 0.1);
    }
  } else {
    mite.act({ lunge: Math.sin(u * Math.PI), rear: 0.1 * Math.sin(u * Math.PI) });
  }
  if (u >= 1) { play.act = null; mite.act({}); }
}
function bodyOf(m) {
  return { center: _bc.set(...m.anat.noto.c).multiplyScalar(m.scale).applyQuaternion(m.quat).add(m.center).clone(), quat: m.quat,
    radii: [m.radii[0] * 1.2 + 30, m.radii[1] * 1.15 + 30, m.radii[2] * 1.45 + 30], // legs splay; + half a blade width
    load: m.ground && m.ground.entry && m.ground.entry.rod, weight: m.anat.kind === 'pred' ? 13000 : 16000 * m.scale ** 3,
    loadU: m.ground && m.ground.entry && m.ground.entry.rod ? Math.min(1, Math.max(0, m.ground.point.clone().sub(m.ground.entry.rod.base).dot(m.ground.entry.rod.axis) / m.ground.entry.rod.len)) : 0.7 };
}
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
// ---------- players ----------
const P1 = { slot: 0, color: PLAYER_COLORS[0], mite, play, dash, snd, speedMul: 1 };
const pls = [P1];
const recs = () => pls.filter(Boolean);
const multi = () => recs().length > 1;
let cur = P1;
/** Run fn with `mite`, `play`, `dash`, `snd` pointing at player record P. */
function withRec(P, fn) {
  const saved = [cur, mite, play, dash, snd];
  cur = P; mite = P.mite; play = P.play; dash = P.dash; snd = P.snd;
  try { return fn(); } finally { [cur, mite, play, dash, snd] = saved; }
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

// ---------- landmarks ----------
// Forward (FORWARD, landmarks.js): any player reaching the water in the leaf
// axil zooms into the tardigrade's world; in the game the others follow
// through the transition. Backdoor (BACKDOOR): dwell beside the giant
// springtail's head and Y (here, instead of closing up) rises to the bog surface.
const lm = { fired: false, near: false, log: [] };
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const atBack = (P) => !held(P) && flat(P.mite.center, props.back) < BACKDOOR.dwell;
const backPrompt = document.createElement('div');
backPrompt.style.cssText = 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:6;padding:6px 14px;border-radius:999px;background:rgba(10,12,16,.6);color:#e8e8e8;font:600 13px system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:none;white-space:nowrap;display:none';
document.body.appendChild(backPrompt);
function goBack(P) {
  lm.log.push({ kind: 'back', slot: P.slot, t: +simTime.toFixed(2) });
  embed.landmark('back', { player: P.slot });
}
function checkLandmarks() {
  let at = null, nearF = false, nearB = false, dmin = Infinity;
  for (const P of recs()) {
    if (held(P)) continue;
    const c = P.mite.center;
    const d = flat(c, FORWARD);
    dmin = Math.min(dmin, d);
    if (d < FORWARD.reach && Math.abs(c.y - props.forward.y) < 450) at = P;
    if (d < FORWARD.reach + 250) nearF = true;
    if (atBack(P)) nearB = true;
  }
  props.update(simTime, dmin);
  if (at && !lm.fired) {
    lm.fired = true;
    lm.log.push({ kind: 'forward', slot: at.slot, t: +simTime.toFixed(2) });
    withRec(at, () => { if (rumbleOn) padOf().rumble(200, 0.3, 0.3); });
    embed.landmark('forward', { player: at.slot });
  }
  if (!nearF) lm.fired = false;
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

// ---------- the scramble's stamina, its dust, the pounce-bite ----------
const stamText = (pl) => { const n = Math.round((pl.stam ?? 1) * 5); return 'scramble ' + '■'.repeat(n) + '□'.repeat(5 - n); };
// dust kicked up by a scramble: a few humus crumbs that fly back and settle (SEM-drawn, like everything)
const DUST = 48;
const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), gMaterial({ cls: CLS.LITTER }), DUST);
dust.frustumCulled = false;
scene.add(dust);
const dustP = Array.from({ length: DUST }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), t: 9, r: 8 }));
let dustI = 0;
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
  if (predOn && !(capture.active && !cap.byBoss)) { out.push({ p: pred.center.clone(), foe: 'pred' }); out.push({ p: pred.mouth(new THREE.Vector3()).clone(), foe: 'pred' }); }
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
/** The dive lands: a strong bite if the target is still there, a squash, a rebound; or a clear miss. */
function diveImpact() {
  const d = play.dive;
  play.dive = null;
  play.lastImpact = { t: simTime, hit: false };
  const t = d.target;
  if (t) {
    const near = (t.foe === 'boss' ? boss.bitePoints() : [pred.center, pred.mouth(new THREE.Vector3())]).some((p) => p.distanceTo(mite.center) < 380);
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
/** A grab's strike window: a scramble (RT) breaks out of it. */
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
  for (const f of world.food) if (f.kind === 'hypha' && f.left <= 0 && (f.t -= dt) <= 0) f.left = 1;
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
  // the strike window: a scramble (RT, with stamina) breaks out of the grip
  if (cs.active && cs.phase === 'strike' && capPad && players.pad(who.slot).rt() > 0.4 && (who.play.stam ?? 1) > 0.3) { dashOut(who); cs = { active: false }; }
  if (cs.active) withRec(who, () => animateCapture(cs, dt));
  else if (predOn) hunger.update(dt);
  // Blades and hyphae move first (pushed and loaded by where the mites were),
  // so each mite then settles on, and clears, the surfaces as they are now.
  world.foliage.update(dt, [...recs().map((P) => P.mite), ...(npcOn ? [npc] : []), ...(predOn ? [pred] : [])].map(bodyOf));
  const evs = [];
  for (const P of recs()) withRec(P, () => {
    dash.update(dt);
    play.stun = Math.max(0, play.stun - dt);
    if (play.hurt > 0 && (play.heal += dt) > 20) { play.hurt--; play.heal = 0; }
    let input = (inputs && inputs[P.slot]) || { dir: new THREE.Vector3(), mag: 0, maxSpeed: WALK, hold: false };
    if (play.stun > 0) input = { ...input, mag: 0 };
    if (cs.active && cap.who === P) input = { ...input, mag: 0 };
    const ev = mite.update(dt, input);
    if (play.dive && (ev.includes('land') || ev.includes('impact') || mite.mode === 'walk')) diveImpact();
    if (play.rebound > 0 && (play.rebound -= dt) <= 0) mite.st.fwd.negate();
    soundTick(dt, ev);
    evs[P.slot] = ev;
  });
  if (npcOn) npc.update(dt, npcInput(dt));
  const nip = recs().some((P) => P.play.nip);
  if (predOn && capture.active && cap.who && !cap.byBoss) {
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
  } else if (predOn) {
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
        if (e === 'hunt') audio.play('mite/predator', { volume: 0.9 });
        if (e === 'legHit') audio.play('mite/predator', { volume: 0.6, rate: 1.25 });
        if (e === 'hunt') hud.toast(`${who}A predatory mite has touched you: run (RT), jump (A), close up (B) or nip it (X)`, 2600);
        else if (e === 'windup') { hud.toast(`${who}It rears to strike: close up (B), or jump`, 1400); if (rumbleOn) padOf().rumble(250, 0.15, 0); }
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
  // the boss (boss.js): dormant before the axil until someone comes near after the calm opening
  if (!(capture.active && cap.byBoss)) {
    const bctx = { awake: pace.grace === 0 || hunger.state !== 'grace', players: recs().map((P) => {
      const c = P.mite.center, f = new THREE.Vector3(1, 0, 0).applyQuaternion(P.mite.quat).setY(0).normalize();
      const to = new THREE.Vector3(boss.st.x - c.x, 0, boss.st.z - c.z).normalize();
      return { slot: P.slot, x: c.x, z: c.z, center: c.clone(), alive: !held(P), closed: withRec(P, closedNow), airborne: P.mite.airborne, facing: f.dot(to) > 0.5 };
    }) };
    for (const e of boss.update(dt, bctx)) {
      const P = e.slot !== undefined ? pls[e.slot] : null;
      if (e.type === 'wake') hud.toast('A pseudoscorpion lies in wait before the water! Watch for its pincers held open and still', 3000);
      else if (e.type === 'tell') { for (const Q of recs()) if (Q.mite.center.distanceTo(boss.center) < 2600) withRec(Q, () => { if (rumbleOn) padOf().rumble(200, 0.12, 0); }); }
      else if (['snap', 'sweep', 'step'].includes(e.type)) audio.play('mite/predator', { volume: 0.8, rate: 0.7 });
      else if (e.type === 'grab' && P) withRec(P, () => startBossCapture());
      else if (e.type === 'survived') hud.toast('Closed up: the pincer closes on a smooth capsule', 1600);
      else if (e.type === 'miss') hud.toast('It missed: bite its pincer joints (X) while it recovers', 1500);
      else if (e.type === 'retreat') hud.toast('The pseudoscorpion backs into the moss: the way is open', 2600);
    }
  }
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
  // Y (away from the backdoor) or LS click: observer mode
  if (ctl.stickClick.left.pressed() || (ctl.special.pressed() && !atBack(P1))) { features.set('observer', !observer); hud.toast(observer ? 'Observer mode' : 'Observer mode off'); }
  camFwd.set(-Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  camRight.set(-camFwd.z, 0, camFwd.x);
  const out = [];
  for (const p of players.active) {
    const P = pls[p.slot];
    if (P) out[p.slot] = withRec(P, () => inputFor(players.controls(p.slot)));
  }
  return out;
}
/** One player's walking input from their controls (`mite` etc. are theirs). */
function inputFor(c) {
  if (c.attack.pressed() && !mite.airborne) biteNow();
  const sec = c.secondary();
  const speedMul = sec < 0 ? 0.5 : sec > 0 ? 1.4 : 1;
  const ls = c.move();
  const dir = camFwd.clone().multiplyScalar(-ls.y).addScaledVector(camRight, ls.x);
  // A: jump. RT (held): the scramble. B (held): close up (defend). Y at the backdoor: go back.
  if (c.dash.pressed() && play.stun <= 0 && mite.jump()) { if (rumbleOn) padOf().rumble(90, 0.25, 0.4); }
  // the scramble: held RT, on a stamina meter (empties in ~1.6 s, refills in ~2.8 s)
  if (play.stam === undefined) play.stam = 1;
  const want = c.rt() > 0.4 && mite.mode === 'walk' && play.stun <= 0 && !play.act;
  if (want && !play.scr && play.stam > 0.15) { play.scr = true; audio.play('mite/dash', { volume: 0.9 }); if (rumbleOn) padOf().rumble(140, 0.3, 0.5); }
  if (!want || play.stam <= 0) play.scr = false;
  // X in the air: the pounce-bite
  if (c.attack.pressed() && mite.airborne) startDive();
  const hold = c.defend.down();
  if (atBack(cur) && mite.mode === 'walk' && c.special.pressed()) goBack(cur);
  const dashing = play.scr && mite.mode === 'walk';
  if (dashing && ls.m < 0.2) dir.set(1, 0, 0).applyQuaternion(mite.quat).setY(0); // no stick: straight ahead
  return { dir: dir.lengthSq() > 0 ? dir.normalize() : dir, mag: dashing ? 1 : ls.m, maxSpeed: dashing ? DASH : WALK * speedMul * (1 - 0.15 * play.hurt), accel: dashing ? 0.07 : 0.18, turnK: dashing ? 2.4 : 1, lean: dashing ? 1 : 0, hold };
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
const CAP_LINES = { strike: 'Seized by a leg! Close up (B) to slip free', hold: 'Being pulled in: close up (B)!', eat: 'The predatory mite is eating you', follow: 'Eaten', fadeOut: 'Eaten', fadeIn: '' };
function updateBanner() {
  let txt = '', hot = true;
  gauge.style.display = boss.engaged ? 'flex' : 'none';
  gauge.querySelector('i').style.width = `${(boss.resolve * 100).toFixed(0)}%`;
  if (capture.active) txt = cap.byBoss && ['strike', 'hold'].includes(capture.phase) ? 'In its pincer! Close up (B), or scramble out (RT) now' : CAP_LINES[capture.phase] || '';
  else if (boss.attacking) txt = boss.st.state === 'tell' ? 'Pincers open and still: get out of reach, or close up (B)' : 'It snaps!';
  else if (predOn && predAI.attacking) txt = 'It rears to strike! Close up (B), or jump (A)';
  else if (predOn && predAI.state === 'retreat') { txt = 'The predatory mite is running off'; hot = false; }
  else if (predOn && predAI.state === 'hunt') txt = `A predatory mite is hunting you${play.hurt ? ` (legs grabbed ${play.hurt}/3)` : ''}`;
  else if (predOn && isHungry()) { txt = 'The predatory mite is hungry'; hot = false; }
  banner.style.display = txt ? 'block' : 'none';
  banner.textContent = txt;
  banner.style.background = hot ? 'rgba(150,30,20,.8)' : 'rgba(10,12,16,.6)';
}

let frames = 0, statT = 0;
// ---------- split screen and the edge arrows ----------
// The SEM composite (and a borrowed look) ends on the screen, so the split
// copies each view from it (capture). Split views render at a lower
// resolution (splitK), the composite costs per pixel.
const split = createSplitScreen(renderer, { capture: true });
const marks = createLandmarks();
const _vc = new THREE.Vector3();
function drawFrame(dt) {
  // a caught player's view follows the predator with its meal
  const eating = capture.active && ['eat', 'follow', 'fadeOut'].includes(capture.phase);
  split.update(recs().map((P) => ({ slot: P.slot, position: (eating && cap.who === P ? (cap.byBoss ? boss.center : pred.center) : P.mite.center).clone() })), { camera }, dt);
  const k = split.views.length > 2 ? 0.55 : split.views.length > 1 ? 0.7 : 1;
  if (k !== splitK) { splitK = k; resize(); }
  const one = split.views.length === 1;
  const cut0 = shared.uCutP.value.clone();
  split.render(camera, (view) => {
    if (!one) {
      // the cutaway clears the way to this view's own players
      _vc.set(0, 0, 0);
      let n = 0;
      for (const s of view.slots) if (pls[s]) { _vc.add(pls[s].mite.center); n++; }
      if (n) shared.uCutP.value.copy(_vc.divideScalar(n)).applyMatrix4(camera.matrixWorldInverse);
    }
    renderView(dt);
  });
  shared.uCutP.value.copy(cut0);
  marks.begin();
  marks.drawSplit(split, props.forward, { kind: 'forward', label: 'Water', range: 4000 });
  marks.drawSplit(split, props.back, { kind: 'backdoor', label: 'Up', range: 4000 });
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
function updateText(d) {
  updateBanner();
  const mag = 127000 / rig.hfw; // relative to a 127 mm (Polaroid 4x5) reference image width
  const st = mite.mode === 'air' ? 'jumping' : mite.mode === 'crouch' ? 'crouching to jump' : mite.mode === 'walk' ? (play.scr ? `SCRAMBLE ${mite.speed.toFixed(0)} µm/s` : mite.st.climbing > 0.2 ? `climbing ${mite.speed.toFixed(0)} µm/s` : mite.speed > 5 ? `walking ${mite.speed.toFixed(0)} µm/s` : 'standing') : mite.mode === 'closed' ? 'closed (ptychoid)' : mite.mode;
  const fol = world.foliage.stats;
  const pst = predOn ? `predator ${capture.active ? `CAPTURE ${capture.phase}` : predAI.state === 'hunt' ? 'HUNTING' : predAI.state === 'recoil' ? 'recoiling' : 'wandering'} ${predAI.dist.toFixed(0)} µm · ${hunger.state} ${hunger.left.toFixed(0)} s` : '';
  const info = renderer.info.render;
  hud.stats(`${MODES[sem.mode]}${renderScale < 1 ? `  (res ${(renderScale * 100).toFixed(0)}%)` : ''}\nHFW ${rig.hfw.toFixed(0)} µm   mag ${mag.toFixed(0)}x\n${st}\n${stamText(play)}   legs grabbed ${play.hurt}/3   grazed ${play.grazed}\n${pst}\nblades bending ${fol.moving}   pen ${mite.st.pen.toFixed(0)} µm\n${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris`);
  if (observer) {
    const sb = niceScale(rig.hfw);
    const px = (sb / rig.hfw) * innerWidth;
    bar.innerHTML = `<span>HV 5.00 kV</span><span>WD ${(d / 1000).toFixed(1)} mm</span><span>mag ${mag.toFixed(0)} x</span><span>HFW ${(rig.hfw / 1000).toFixed(2)} mm</span><span>det ${sem.mode === 1 ? 'BSED' : 'ETD'}</span><span>${sem.mode === 1 ? 'LowVac 60 Pa' : 'HiVac'}</span>`
      + `<span style="margin-left:auto;display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:${px.toFixed(1)}px;height:6px;background:#fff"></span>${sb >= 1000 ? sb / 1000 + ' mm' : sb + ' µm'}</span><span>Micro prototypes</span>`;
  }
}

let last = performance.now(), simTime = 0;
const api = {
  scene, camera, renderer, sem, world, mite, npc, pred, predAI, play, dash, rig, features, cfg: CFG, paused: false,
  tick(dt, input = { dir: new THREE.Vector3(), mag: 0, maxSpeed: WALK, hold: false }) { return tick(dt, [input])[0]; },
  hunger, capture, pace, resetLevel,
  get time() { return simTime; },
  /** Testing: one fixed step with the left stick at (x, y) in world x/z (null: hands off); hold: Y. */
  testStep(dt = 1 / 30, stick = null, hold = false) {
    simTime += dt;
    const m = stick ? Math.min(1, Math.hypot(stick.x, stick.y)) : 0;
    tick(dt, [{ dir: new THREE.Vector3(stick ? stick.x : 0, 0, stick ? stick.y : 0).normalize(), mag: m, maxSpeed: WALK, hold, accel: 0.18 }]);
  },
  // ---- multiplayer and landmarks (Playwright drives these)
  players, split, marks, joins, landmarks: { forward: FORWARD, back: BACKDOOR, forwardAt: props.forward, backAt: props.back }, landmarkLog: lm.log, props,
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
  fight, fightLog, boss,
  /** Testing: player `slot` near the boss's post, the calm over: it wakes. */
  bossFight(slot = 0) { const P = pls[slot] || P1; pace.mode = 'Always'; hunger.reset(0); hunger.update(0.01); boss.reset(); predAI.reset(...PRED_START); pace.mode = 'Never'; const b = boss.post; P.mite.place(b.x + b.ux * 1100, b.z + b.uz * 1100, Math.atan2(b.uz, -b.ux)); rig.target.copy(P.mite.center); hunger.reset(0); hunger.update(0.01); },
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
    predAI.state = 'hunt'; predAI.cool = 0.3; predAI.t2 = 0; predAI.bored = 0;
  },
  /** Testing: calm the predator again (wandering, grooming). */
  calm() { pace.mode = 'Never'; predAI.state = 'wander'; predAI.rear = 0; },
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
    predAI.state = 'hunt';
    startCapture();
  },
  render(dt = 1 / 60) { const d = placeCamera(0); drawFrame(dt); updateText(d); },
  isolate(on) { world.group.visible = !on; npc.setVisible(!on); pred.setVisible(!on && predOn); },
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
  const input = readInput(dt);
  simTime += dt;
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
  drawFrame(dt);
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  statT += dt;
  if (statT > 0.25) { updateText(d); statT = 0; }
}
frame();

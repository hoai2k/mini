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
import { RINGS, PORTAL_CLEAR, CLUSTER, CLUSTERS, PRED_GROUND, BOSS, OPENING, NPC_HOME, predZoneAt, distFromStart, bearingFromStart, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, canPlace, insideEdge, BOUNDS, DRIP, FAMILY, FORWARD_YAW, M as conf, PARK, EDGE, toCorridor, WALK_FOR_WALLS, WALL_SECONDS, PORTAL_ALONG } from './layout.js';
import { createPush, deepestOverlap } from '../shared/push.js';
import { conf as gconf } from '../shared/config.js';
import { createAmbient, createBeads, createDrops } from './life.js';
import { createGround, createKeepOut } from './stand.js';
import { createDirector } from '../shared/director.js';
import { createQuality } from '../shared/quality.js';
import { createMite, CFG, PRED, JUMP, ANAT } from './mite.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { createBorrowedLooks, borrowedSwitches, AMOEBA_MODES, DIC_MODES, PARAMECIUM_MODES } from '../shared/techniques/adapters.js';
import { t as tt, tx } from '../shared/text.js';
import { createCamLock } from '../shared/camlock.js';

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
// What the small springtails stand on (stand.js): the floor with its grains and
// litter, cast once per lattice point and kept (the moss bends, so it is walked
// through); and what the grazing groups walk round: the big grains (over ~90 µm
// tall: they climb the smaller ones) and the moss stems.
const springGround = createGround((o, d, f, s, k) => world.colliders.cast(o, d, f, s, k));
const springKeepOut = createKeepOut([...world.grains.filter((g) => g.r > 80).map((g) => ({ x: g.x, z: g.z, r: g.r * 1.3 + 70 })),
  ...world.stems.map((s) => ({ x: s.x, z: s.z, r: 190 }))], TILE);
// The crowd: two rings of hyphal thickets full of springtails (thicket.js, layout.js CLUSTERS)
const thicket = createThickets({ scene, tex, clusters: CLUSTERS.map((c) => ({ ...c, posts: CLUSTER.posts })), ground: springGround });
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
// in moss nobody has seen, a short way ahead of whoever leads), three times. Until
// placed it is hidden, parked in a corner of the square and not stepped.
const A0 = Math.atan2(OPENING.uz, OPENING.ux);
const PRED_PARK = { x: PARK.x, z: PARK.z }; // behind the south wall, out of play (layout.js PARK)
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
  onJoin: (p) => { joins.push({ slot: p.slot, padIndex: p.padIndex }); syncPlayers(); audio.play('shared/join', { volume: 0.6 }); hud.toast(tt('shared.players.joined', { n: p.slot + 1 })); embed.join(p.slot, p.color, p.name, players.toJSON()); }, // the roster rides along, so the shell carries this player into the next world
  onLeave: (p) => { syncPlayers(); hud.toast(tt('shared.players.left', { n: p.slot + 1 })); embed.leave(p.slot); },
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
// (micro/game_config.js mite.walkSlowestSpeed, walkFullTiltSpeed, scrambleSpeed, keyboardWalkShare: 418, 878,
// 1493 and 0.65, the values these were derived from: 720 µm/s at the 0.6 mm anatomy x 0.58, x2.1, x1.7)
const WALK_MIN = conf('walkSlowestSpeed', 418), WALK_MAX = conf('walkFullTiltSpeed', 878), DASH = conf('scrambleSpeed', 1493);
const WALK = WALK_MAX; // full tilt (tests' default)
const KEY_WALK = conf('keyboardWalkShare', 0.65);
const STAM_EMPTY = conf('scrambleEmptySeconds', 1.6), STAM_FILL = conf('scrambleRefillSeconds', 2.8);
// the jump (A): game_config.js distances on level ground from a standstill (world µm), in the anatomy's units
JUMP.range0 = conf('jumpTapDistance', 1000) / MITE_SCALE;
JUMP.range1 = conf('jumpFullChargeDistance', 2100) / MITE_SCALE;
JUMP.charge = conf('jumpChargeSeconds', 0.45);
/** Walking speed (world µm/s) for a stick deflection 0..1 after the pad's dead zone. */
function walkSpeed(m) { return m > 0 ? WALK_MIN + (WALK_MAX - WALK_MIN) * Math.min(1, m) ** 2 : 0; }
const hud = mountHud({
  title: tt('mite.hud.title'),
  sub: tt('mite.hud.sub'),
  controls: hudControls({
    move: tt('mite.hud.controls.move'),
    camera: tt('mite.hud.controls.camera'),
    dash: tt('mite.hud.controls.dash'),
    attack: tt('mite.hud.controls.attack'),
    defend: tt('mite.hud.controls.defend'),
    special: tt('mite.hud.controls.special'),
    secondary: tt('mite.hud.controls.secondary'),
    look: tt('mite.hud.controls.look'),
    analog: tt('mite.hud.controls.zoom'),
    extra: [...(embed.active ? [] : [['LS click', tt('mite.hud.controls.readout')]])],
  }),
  note: tt('mite.hud.note'),
});

// SEM data bar (observer mode)
const bar = document.createElement('div');
bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:34px;background:#000;color:#e8e8e8;display:none;align-items:center;gap:22px;padding:0 14px;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;z-index:5;white-space:nowrap;overflow:hidden';
document.body.appendChild(bar);
let observer = false;

// Starts at HFW 1.6 mm (~79x): the 0.35 mm mite is about a fifth of the
// field, with the moss around it in view.
// The world's forward (the owner, 2026-11-03: the camera's turn is locked to it, so the layout has a
// "forward"): the camera looks along -(cos, sin) of this yaw (layout.js FORWARD_YAW; the default path
// runs straight out along it: see README).
const camLock = createCamLock({ forward: FORWARD_YAW });
const rig = { yaw: FORWARD_YAW, pitch: 0.62, hfw: 1600, target: mite.center.clone() };
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
  rig.zoom = 1;
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
// RS left/right peeks (shared/camlock.js): each view's camera slides sideways along the ground by up to
// peekFrac of the field's width, eased, and blended through a split and a merge.
const _pr = new THREE.Vector3();
function applyPeek() {
  if (outro) return;
  camera.updateMatrixWorld();
  _pr.setFromMatrixColumn(camera.matrixWorld, 0); _pr.y = 0;
  if (_pr.lengthSq() < 1e-8) return;
  _pr.normalize();
  camLock.applyPeek(split, (v, p) => _pr.clone().multiplyScalar(p * camLock.peekFrac * (rig.viewHfw || rig.hfw)));
}
// Two to four players share one view, zoomed out up to this far (1.8x the
// field) before the screen splits; split views settle at 0.75 of it.
const SPLIT_ZOOM_MAX = 1.8;
let groupZoom = 1;
function placeCamera(dt) {
  const tanH = Math.tan(THREE.MathUtils.degToRad(VFOV) / 2) * camera.aspect;
  // several players: frame the group (the split screen takes over when they part)
  const mp = multi();
  const gc = mp ? groupCentre(recs()) : null;
  let want = rig.hfw;
  // a boss fight: the lens widens to keep the pseudoscorpion and its pincers in frame
  const bd = boss.engaged ? boss.center.distanceTo(mp ? gc.c : mite.center) : Infinity;
  if (bd < 3400 && !capture.active && !outro) want = Math.min(4200, Math.max(want, bd * 1.3 + 2600));
  if (!outro) rig.viewHfw = rig.viewHfw === undefined || !dt ? want : rig.viewHfw + (want - rig.viewHfw) * (1 - Math.exp(-dt / 0.4));
  // a group in one view: the split screen's zoom-out (the camera pulled back
  // along its view) keeps everyone in frame; the screen splits only once it
  // is at its widest (shared/splitscreen.js). The boss's widening counts too.
  if (mp && !outro) rig.viewHfw = Math.max(rig.viewHfw, rig.hfw * groupZoom);
  rig.zoom = mp && !outro ? Math.max(1, rig.viewHfw / rig.hfw) : 1;
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

/** The family: each grazes about its home, edges away from a player walking up, and closes up (ptychoidy) when touched, rushed or bitten. */
const FAMILY_TOUCH = 300, FAMILY_ALARM = 480, FAMILY_RUSH = 650;
function stepFamily(dt) {
  if (!family.home) return;
  // placed round a lingering player, they wander over (like the predator's ground: driftPred)
  const S = director.entry('mites'), lead = director.leader, LP = lead && pls[lead.id];
  if (S && S.state === 'placed' && (family.driftT = (family.driftT || 0) + dt) > 5 && LP && !lead.moving) {
    const dx = LP.mite.center.x - family.home.x, dz = LP.mite.center.z - family.home.z, d = Math.hypot(dx, dz);
    if (d > FAMILY.r + 300) { family.home.x += (dx / d) * PRED_DRIFT * dt; family.home.z += (dz / d) * PRED_DRIFT * dt; }
  }
  for (const f of family.mites) {
    const { ai, m, input } = f;
    ai.t += dt;
    ai.ang += (Math.sin(ai.t * 0.41) + Math.sin(ai.t * 0.9 + 2)) * 0.6 * dt;
    const c = m.center;
    if (Math.hypot(c.x - family.home.x, c.z - family.home.z) > FAMILY.r) ai.ang = Math.atan2(family.home.z - c.z, family.home.x - c.x);
    // Ptychoidy is their alarm, so it should read as one, not as mites forever
    // tipping over (the owner, 2026-11-02: "a bunch of bugs flipping upside
    // down"): a mite walking up slowly is only turned away from; they shut
    // when touched (FAMILY_TOUCH), hurried at (a scramble or full tilt within
    // FAMILY_ALARM) or bitten (X), and stay shut a little less long.
    let dist = Infinity, near = null;
    for (const P of recs()) { const d = c.distanceTo(P.mite.center); if (d < dist) { dist = d; near = P; } }
    const rushed = near && (near.mite.speed > FAMILY_RUSH || near.mite.airborne);
    if (m.mode === 'walk' && ai.scared <= 0 && (dist < FAMILY_TOUCH || (dist < FAMILY_ALARM && rushed))) ai.scared = 1.8 + Math.random() * 1.4;
    else if (near && dist < FAMILY_ALARM + 80 && ai.scared <= 0) ai.ang = Math.atan2(c.z - near.mite.center.z, c.x - near.mite.center.x);
    ai.scared -= dt;
    ai.pause = (ai.pause + dt) % 11;
    input.dir.set(Math.cos(ai.ang), 0, Math.sin(ai.ang)); input.mag = ai.pause < 7 ? 0.7 : 0; input.hold = ai.scared > 0;
    m.update(dt, input);
  }
}
function placeFamily(x, z) {
  family.home = { x, z }; family.driftT = 0;
  family.mites.forEach((f, i) => { const a = (i / FAMILY.n) * Math.PI * 2 + 0.4; f.m.place(x + Math.cos(a) * 260, z + Math.sin(a) * 260, -a); f.m.setVisible(true); f.ai.scared = 0; });
}
function parkFamily() { family.home = null; for (const f of family.mites) { f.m.place(PRED_PARK.x - 900, PRED_PARK.z - 900, 0); f.m.setVisible(false); } }

// ---------- threats: pacing and being eaten (shared/predation.js) ----------
// Calm until someone first walks onto its ground (no clock), then hunger that
// comes and goes (the banner says so); only a hungry predator hunts. Its third grab holds on: strike (it seizes a leg), hold (it pulls you
// in; close up, Y, and the grip slips off), eat (its chelicerae work at the
// soft body by the legs, which go limp and fold), then the Eaten card.
const PRED_START = [PRED_AT.x, PRED_AT.z];
const npcIn = { dir: new THREE.Vector3(), mag: 0, maxSpeed: 180 * MITE_SCALE, hold: false };
const pace = { grace: Infinity, mode: 'Comes and goes' };
const hunger = createHunger({ grace: pace.grace });
const isHungry = () => (pace.mode === 'Never' ? false : pace.mode === 'Always' || predK === 3 ? hunger.state !== 'grace' : hunger.hungry); // the third time it is always hungry
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
    audio.play('shared/reform', { volume: 0.7 });
  }
  cap.phase = null; cap.heldOnce = false;
  if (P === P1 || !multi()) { rig.target.copy(P.mite.center); rig.viewHfw = undefined; }
}
// Fighting back (shared/predation.js createFight): facing the hunting
// predator, blocking its strike (close up, B) and nipping it (X) wear its
// interest down; out of interest it runs off (and rests: hunger.missed()).
const fight = createFight({ blockHit: conf('predatorBlockInterest', 0.3), facingRate: conf('predatorFacingInterestPerSecond', 0.06) });
const fightLog = { blocks: 0, bites: 0, retreats: 0, jumps: 0, tooHigh: 0 };
function wearDown(how) {
  fightLog[how === 'bite' ? 'bites' : how === 'jump' ? 'jumps' : 'blocks']++;
  if (fight.bitten(how === 'jump' ? JA_INTEREST : undefined)) {
    fightLog.retreats++;
    audio.play('shared/foe-flees', { volume: 0.7 });
    predAI.retreat();
    if (hunger.hungry) hunger.missed();
    hud.toast(tt('mite.toasts.predatorGone'), 2200);
    fight.reset();
    return true;
  }
  predAI.repel();
  hud.toast(how === 'bite' ? tt('mite.toasts.predatorNipped') : how === 'jump' ? tt('mite.toasts.jumpAttackPredator') : tt('mite.toasts.predatorBlocked'), 1500);
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
  capture.start({ by: tt('mite.capture.predator.by'), how: tt('mite.capture.predator.how') });
  embed.captured({ by: 'predator', player: cur.slot });
  if (multi()) hud.toast(tt('mite.toasts.playerSeized', { n: cur.slot + 1 }), 2200);
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
      hud.toast(tt('mite.toasts.closedUpLetsGo'), 2400);
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
    hud.toast(tt('mite.toasts.closedUpInTime'), 2600);
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
const audio = createAudio(['mite/amb-moss', 'mite/step', 'mite/dash', 'mite/close', 'mite/open', 'mite/bite', 'mite/blade', 'mite/predator', 'shared/portal-chime',
  'mite/jump', 'mite/land', 'mite/crouch', 'mite/strike', 'mite/devour', 'mite/drop-fall', 'mite/drop-splash', 'mite/predator-windup', 'mite/predator-strike', 'mite/glance', 'mite/pincer',
  'shared/portal-enter', 'shared/slowdown', 'shared/portal-near', 'shared/portal-sealed', 'shared/portal-appear', 'shared/backdoor', 'shared/hit', 'shared/reform', 'shared/foe-flees', 'shared/danger', 'shared/join']);
audio.addToFeatures(features);
audio.loop('mite/amb-moss', { volume: 0.6 });
const LOOKS = ['SE', 'BSE', 'False colour'];
let npcOn = true, rumbleOn = true, predOn = true;
const F = (o) => features.add(o);
F({ id: 'gbuffer', group: 'Rendering', fixed: true });
F({ id: 'look', group: 'Rendering', choices: LOOKS, value: 'SE',
  onChange: (v) => { const i = LOOKS.indexOf(v); if (i !== sem.mode) sem.setMode(i); } });
F({ id: 'secant', group: 'Rendering', on: true,
  onChange: (v) => (sem.toggles.secant = v) });
F({ id: 'edge', group: 'Rendering', on: true,
  onChange: (v) => (sem.toggles.edge = v) });
F({ id: 'shadow', group: 'Rendering', on: true,
  onChange: (v) => { shadowOn = v; sem.toggles.shadow = v && qLevel > 0; } });
F({ id: 'ao', group: 'Rendering', on: true,
  onChange: (v) => (sem.toggles.ao = v) });
F({ id: 'bump', group: 'Rendering', on: true,
  onChange: (v) => (sem.toggles.bump = v) });
F({ id: 'noise', group: 'Rendering', on: true,
  onChange: (v) => (sem.toggles.noise = v) });
F({ id: 'lines', group: 'Rendering', on: true,
  onChange: (v) => (sem.toggles.lines = v) });
if (!embed.active) F({ id: 'observer', group: 'Rendering', on: false,
  onChange: (v) => { observer = v; bar.style.display = v ? 'flex' : 'none'; sem.setRaster(v); } });
quality.addToFeatures(features);
F({ id: 'dof', group: 'Optics', fixed: true });
F({ id: 'field', group: 'Optics', fixed: true });
F({ id: 'cut', group: 'Optics', on: true,
  onChange: (v) => (shared.uCutOn.value = v ? 1 : 0) });
F({ id: 'sdf', group: 'Body', fixed: true });
F({ id: 'setae', group: 'Body', on: true,
  onChange: (v) => (CFG.setae = v) });
F({ id: 'thick', group: 'Body', fixed: true });
const GAITL = { 'Alternating tetrapod': 'tetrapod', 'Wave (one leg at a time)': 'wave', 'Pairs (not arachnid)': 'pairs' };
F({ id: 'gait', group: 'Motion', choices: Object.keys(GAITL), value: 'Alternating tetrapod',
  onChange: (v) => (CFG.gait = GAITL[v]) });
F({ id: 'ik', group: 'Motion', on: true,
  onChange: (v) => (CFG.ik = v) });
F({ id: 'plant', group: 'Motion', fixed: true });
F({ id: 'surface', group: 'Motion', fixed: true });
F({ id: 'bob', group: 'Motion', on: true,
  onChange: (v) => (CFG.bob = v) });
F({ id: 'ptych', group: 'Simulation', choices: ['Real (0.16 s)', 'Slowed 4x'], value: 'Real (0.16 s)',
  onChange: (v) => (CFG.closeTime = v.startsWith('Real') ? 0.16 : 0.64) });
F({ id: 'roll', group: 'Simulation', on: true,
  onChange: (v) => (CFG.roll = v) });
F({ id: 'npc', group: 'Simulation', on: true,
  onChange: (v) => { npcOn = v; npc.setVisible(v); } });
for (const id of ['moss', 'grains', 'litter', 'hyphae', 'spores']) F({ id, group: 'World', on: true, onChange: (v) => world.setLayer(id, v) });
F({ id: 'tex', group: 'World', fixed: true });
F({ id: 'climb', group: 'Motion', on: true,
  onChange: (v) => (CFG.climb = v) });
F({ id: 'clear', group: 'Motion', on: true,
  onChange: (v) => (CFG.clear = v) });
F({ id: 'foliage', group: 'Simulation', on: true,
  onChange: (v) => { world.foliage.cfg.on = v; if (!v) world.foliage.reset(); } });
F({ id: 'speed', group: 'Simulation', fixed: true,
  about: tt('mite.features.speed.about', { min: WALK_MIN, max: WALK_MAX, keys: Math.round(walkSpeed(KEY_WALK)) }) });
F({ id: 'scramble', group: 'Simulation', fixed: true,
  about: tt('mite.features.scramble.about', { dash: DASH }) });
F({ id: 'jump', group: 'Simulation', fixed: true,
  about: tt('mite.features.jump.about', { crouch: Math.round(JUMP.crouch * 1000), charge: JUMP.charge, cool: JUMP.cool }) });
F({ id: 'pounce', group: 'Simulation', fixed: true });
F({ id: 'boss', group: 'Simulation', fixed: true });
F({ id: 'bite', group: 'Simulation', fixed: true });
F({ id: 'predator', group: 'Simulation', on: true,
  onChange: (v) => { predOn = v; pred.setVisible(v && predPlaced); } });
F({ id: 'grace', group: 'Simulation', choices: ['Until its ground', '20 s', 'Off'], value: 'Until its ground',
  onChange: (v) => { pace.grace = v === 'Off' ? 0 : v === '20 s' ? 20 : Infinity; hunger.reset(pace.grace); } });
F({ id: 'hunger', group: 'Simulation', choices: ['Comes and goes', 'Always', 'Never'], value: 'Comes and goes',
  onChange: (v) => (pace.mode = v) });
F({ id: 'camwalk', group: 'Controls', fixed: true });
F({ id: 'rumble', group: 'Controls', on: true,
  onChange: (v) => (rumbleOn = v) });
addInvertY(features);

// ---------- borrowed looks (default off; shared/techniques/adapters.js) ----------
// The G-buffer is still drawn; an adapter reads it as a thick specimen
// (thickness = height above the floor, absorbance by material) and hands that
// to another prototype's microscope instead of the SEM composite.
const looks = createBorrowedLooks(renderer);
const borrow = borrowedSwitches(features);
const bmode = { dic: 0, amoeba: 0, par: 0 };
const THICK = tt('mite.borrowedThick');
borrow.add({ id: 'dicTardigrade', from: 'tardigrade',
  about: tt('mite.features.dicTardigrade.about', { thick: THICK }) });
F({ id: 'dicTardigradeMode', group: 'Borrowed', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0],
  onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
borrow.add({ id: 'opticsAmoeba', from: 'amoeba',
  about: tt('mite.features.opticsAmoeba.about', { thick: THICK }) });
F({ id: 'opticsAmoebaMode', group: 'Borrowed', from: 'amoeba', choices: AMOEBA_MODES, value: AMOEBA_MODES[0],
  onChange: (v) => (bmode.amoeba = AMOEBA_MODES.indexOf(v)) });
borrow.add({ id: 'microscopeParamecium', from: 'paramecium',
  about: tt('mite.features.microscopeParamecium.about', { thick: THICK }) });
F({ id: 'microscopeParameciumMode', group: 'Borrowed', from: 'paramecium', choices: PARAMECIUM_MODES, value: PARAMECIUM_MODES[0],
  onChange: (v) => (bmode.par = PARAMECIUM_MODES.indexOf(v)) });
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
// X: one family of moves, chosen by what is in front of the chelicerae; every
// press shows an attack (the owner, 2026-11-02: "I don't see any attack
// animations when pressing X"): the mite rears, the rostrum lifts (the
// chelicerae open), it lunges and snaps, and crumbs puff where the snap lands.
//  fight  the predator or the pseudoscorpion in reach: rear up (leg I
//         raised), then lunge and snap; the nip lands at the snap
//  eat    a spore or a hyphal tip in reach: leg I reaches out and holds it to
//         the mouth while the chelicerae work and it shrinks away (0.9 s)
//  devour a springtail in front: one press grabs it (the owner, 2026-11-04:
//         "a single press of X grab the creature and start eating it, where
//         pressing again will make the eating faster, but otherwise we still
//         just continue eat it more slowly from the first hit"): a snap, then
//         it is held to the mouth, struggling, and eaten over EAT_SEC s; each
//         further X is a chomp that eats EAT_PRESS of it. Walking off
//         EAT_WALK µm (slowed while eating), closing up, jumping or being
//         grabbed lets it wriggle free. A meal: scramble stamina refilled, a
//         grabbed leg healing faster
//  strike anything else: the lunge and snap (0.5 s). On one of the box-mite
//         family it shuts itself in its capsule; in the air, a snap at nothing
//  (the predator's body stands too high for a bite from the ground: the
//  fight's snap glances off its legs, and the jump attack, X as a jump comes
//  down, is the way to hit it: jumpAttack below)
// (A departure: box mites graze fungi and do not hunt; README.)
const sstepJ = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const BUG_REACH = 270;       // µm round a point 90 µm ahead of the mouth
const STRIKE_DUR = 0.5, DEVOUR_DUR = 1.2; // DEVOUR_DUR: the snap and the lift to the mouth (s)
const EAT_SEC = conf('eatSeconds', 3), EAT_PRESS = conf('eatPressShare', 0.25), EAT_WALK = conf('eatWalkOffDistance', 140);
const JA_BEFORE = conf('jumpAttackBeforeLandingSeconds', 0.25), JA_AFTER = conf('jumpAttackAfterLandingSeconds', 0.15);
const JA_REACH = conf('jumpAttackReach', 460), JA_INTEREST = conf('jumpAttackInterest', 0.4), GROUND_REACH = conf('groundBiteReach', 110);
/**
 * Can a bite from the ground by a mite whose mouth is at m reach the predator's body? Not where it stands on its
 * long legs: its belly is ~130-155 µm over the moss, and a bite from the ground reaches GROUND_REACH µm over the
 * moss under the biter (its mouth ~15-60 µm up, rearing). Only where the predator stands lower than you (in a
 * dip, you on a grain) does a bite reach it; the jump attack, coming down from above, always does.
 */
function predTooHigh(m) { return floorH(m.x, m.z) + GROUND_REACH < pred.center.y - PRED.noto.r[1]; }
// Eating seen from behind (the owner, 2026-11-04: "if you eat one while facing
// away from the camera, can we show it sort of lifted up during the eat
// animation such that it's more obvious from behind ... From the front it
// looks good already"): from the front the springtail is held under the mouth
// in plain view; from behind, the mite's own body hid it. So the devour blends,
// by how far the view looks along the mite's facing, toward a rear with the
// prey lifted in the chelicerae and legs I above the mite's outline, kicking.
// Each player's view is the one their own split view draws them in (each view
// has its own camera position; the yaw is shared): viewDir[slot], the
// horizontal direction from that camera to them, noted as each view is drawn.
const viewDir = [];
const _vdc = new THREE.Vector3();
function noteViewDirs(slots) {
  for (const s of slots) {
    const P = pls[s];
    if (!P) continue;
    _vdc.subVectors(P.mite.center, camera.position).setY(0);
    if (_vdc.lengthSq() < 1) continue;
    (viewDir[s] || (viewDir[s] = new THREE.Vector3())).copy(_vdc.normalize());
  }
}
/** How much of the from-behind lift to show (0 seen from the front .. 1 from behind), by the view's direction and the mite's facing. */
function liftFromView(fw) {
  const vd = viewDir[cur.slot] || camFwd;
  return sstepJ(-0.15, 0.45, vd.x * fw.x + vd.z * fw.z);
}
function biteNow() {
  if (play.act === 'devour') { chomp(); return; }
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
  // a springtail in front (the ambient groups), in reach of a lunge
  const fw = _ct.set(1, 0, 0).applyQuaternion(mite.quat).setY(0).normalize().clone();
  const c = mite.center;
  const bug = ambient.nearest(m.x + fw.x * 90, m.y, m.z + fw.z * 90, BUG_REACH, (b) => (b.x - c.x) * fw.x + (b.z - c.z) * fw.z > 60);
  if (bug && ambient.grab(bug.key, c.x, c.z)) {
    // one press: grabbed, and eating starts (its group leaps away)
    Object.assign(play, { act: 'devour', actT: 0, actDur: Infinity, eatP: 0, chomps: 0, snapped: false, bug: bug.key, bug0: new THREE.Vector3(bug.x, bug.y, bug.z), backK: null, eatFrom: mite.center.clone() });
    play.strikes = (play.strikes || 0) + 1;
    play.lastStrike = { hit: 'springtail', x: Math.round(bug.x), z: Math.round(bug.z) };
    if (rumbleOn) padOf().rumble(90, 0.35, 0.25);
    if (!lifeT.bugTip) { lifeT.bugTip = true; hud.toast(tt('mite.toasts.grabbedSpringtail'), 2800); }
    return;
  }
  // one of the box-mite family in front
  const fam = family.home && family.mites.find((f) => f.m.center.distanceTo(m) < 330 && f.m.mode === 'walk');
  if (fam) { Object.assign(play, { act: 'strike', actT: 0, actDur: STRIKE_DUR, snapped: false, bug: null, target: fam.m.center.clone(), fam }); return; }
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
  Object.assign(play, { act: 'strike', actT: 0, actDur: STRIKE_DUR, snapped: false, bug: null, target: null, fam: null });
}
/** X again while eating: a chomp, EAT_PRESS more of the meal. */
function chomp() {
  play.eatP = Math.min(1, (play.eatP || 0) + EAT_PRESS);
  play.chomps = (play.chomps || 0) + 1;
  play.chompT = 0;
  mite.bite();
  snapPuff(mite.mouth(new THREE.Vector3()), 0.45);
  audio.play('mite/bite', { volume: 0.95, rate: 1 + Math.random() * 0.15 });
  if (rumbleOn) padOf().rumble(50, 0.25, 0.1);
}
/** The strike's shape over its act (u 0..1): rear and gape (0-0.35), lunge and snap (0.35-0.75), settle. */
function strikePose(u) {
  const up = Math.min(1, u / 0.35), back = u < 0.35 ? 0 : Math.min(1, (u - 0.35) / 0.25);
  return {
    rear: 0.55 * Math.sin((up * Math.PI) / 2) * (1 - back),
    gape: Math.sin((up * Math.PI) / 2) * (1 - Math.min(1, back * 3)),
    lunge: u < 0.35 ? -0.25 * up : Math.sin(Math.min(1, (u - 0.35) / 0.55) * Math.PI) * 1.1,
  };
}
/** Crumbs and moss scales puffed out where a snap lands (at p, world; k scales it). */
function snapPuff(p, k = 1) {
  const n = Math.round(14 * k);
  for (let i = 0; i < n; i++) {
    const d = dustP[dustI++ % DUST];
    d.p.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30));
    d.v.set(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar((260 + Math.random() * 260) * k);
    d.t = 0; d.r = (8 + Math.random() * 11) * Math.min(1.3, k);
  }
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
  // the jump attack in the air: reared back with the chelicerae open, then driven down onto it
  if (play.dive && mite.mode === 'air') {
    play.diveT = (play.diveT || 0) + dt;
    const k = Math.min(1, play.diveT / 0.12);
    if (play.act === 'devour') ambient.drop(play.bug);
    play.act = null;
    mite.act({ rear: 1 - k, lunge: k, gape: 1 });
    return;
  }
  if (!play.act || mite.mode !== 'walk') {
    if (play.act === 'eat' && play.food && play.food.kind === 'spore') placeSpore(play.food, _sp2.set(play.food0.x - play.foodSx, play.food0.y, play.food0.z - play.foodSz), 1);
    if (play.act === 'eat' && play.food && play.food.kind === 'head' && play.food.left > 0) thicket.shrinkHead(play.food, 1);
    if (play.act === 'devour') ambient.drop(play.bug);
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
    mite.act({ rear, lunge, gape: u < 0.45 ? rear : 0 });
    if (u > 0.45 && !play.snapped) {
      play.snapped = true;
      mite.bite();
      snapPuff(_sp2.copy(m).lerp(foeC, 0.35), 1.1);
      audio.play('mite/bite', { volume: 1, rate: 0.85 });
      let fled = false;
      if (play.foe === 'boss' && !capture.active && boss.bitePoints().some((p) => p.distanceTo(m) < 640)) {
        play.nips = (play.nips || 0) + 1;
        if (rumbleOn) padOf().rumble(140, 0.5, 0.4);
        const open = boss.open;
        const gone = boss.bitten(1, cur.slot);
        fled = gone;
        hud.toast(gone ? tt('mite.toasts.bossGone') : tt(open ? 'mite.toasts.bitPincerJoint' : 'mite.toasts.bitPincer'), 1500);
      } else if (play.foe !== 'boss' && predHere() && !capture.active && pred.center.distanceTo(m) < 700) {
        if (predTooHigh(m)) {
          // its body stands too high on its long legs: the snap glances off a leg (the jump attack reaches it)
          play.tooHigh = (play.tooHigh || 0) + 1; fightLog.tooHigh++;
          play.lastStrike = { hit: 'tooHigh', x: Math.round(m.x), z: Math.round(m.z) };
          audio.play('mite/glance', { volume: 0.6, old: ['mite/bite', { volume: 0.6, rate: 1.4 }] });
          if (!lifeT.tooHighT || simTime - lifeT.tooHighT > 6) { hud.toast(tt('mite.toasts.tooHigh'), lifeT.tooHighT ? 1800 : 3600); lifeT.tooHighT = simTime; }
        } else {
          play.nips = (play.nips || 0) + 1;
          if (rumbleOn) padOf().rumble(140, 0.5, 0.4);
          wearDown('bite');
        }
      }
      // the pseudoscorpion has had enough (wearDown plays it for the predator)
      if (fled) audio.play('shared/foe-flees', { volume: 0.7 });
    }
  } else if (play.act === 'eat') {
    // leg I reaches for the food (0-0.25), holds it under the mouth, the chelicerae work, it shrinks
    const f = play.food;
    const reach = Math.min(1, u / 0.25);
    const at = play.food0.clone().lerp(m.clone().add(new THREE.Vector3(0, -8, 0)), Math.min(1, u / 0.35));
    const dart = Math.sin(Math.min(1, u / 0.3) * Math.PI); // a dart at it, chelicerae open, then the hold
    mite.act({ hold: at, holdK: reach, rear: 0.15 * reach + 0.2 * dart, lunge: 0.6 * dart, gape: u < 0.18 ? 1 : 0 });
    if (Math.floor(play.actT / 0.22) !== Math.floor((play.actT - dt) / 0.22)) mite.bite();
    // (the spore is drawn in its tile copy: back into tile coordinates)
    if (f.kind === 'spore') placeSpore(f, _sp2.set(at.x - play.foodSx, at.y, at.z - play.foodSz), 1 - Math.max(0, (u - 0.3) / 0.7));
    if (f.kind === 'head') thicket.shrinkHead(f, 1 - Math.max(0, (u - 0.3) / 0.7));
    if (u >= 1) {
      play.grazed++;
      if (f.kind === 'spore') { f.left = 0; world.eatSpore(f); hud.toast(tt('mite.toasts.ateSpore', { count: play.grazed })); }
      else if (f.kind === 'head') { f.left = 0; f.t = 30; thicket.shrinkHead(f, 0); hud.toast(tt('mite.toasts.grazedSporeHead', { count: play.grazed })); }
      else { f.left = 0; f.t = 25; hud.toast(tt('mite.toasts.nibbledHypha', { count: play.grazed })); }
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
      if (!thickLog.biteTip) { thickLog.biteTip = true; hud.toast(r.threads ? tt('mite.toasts.grazedThreads') : tt('mite.toasts.shovedSpringtails'), 2400); }
    }
  } else if (play.act === 'strike') {
    // turn onto the target, rear with the chelicerae open, lunge and snap
    if (play.target) {
      const to = _ct.subVectors(play.target, mite.center).setY(0);
      if (to.lengthSq() > 1) mite.st.fwd.lerp(to.normalize(), Math.min(1, dt * 10)).setY(0).normalize();
    }
    mite.act(strikePose(u));
    if (u > 0.42 && !play.snapped) {
      play.snapped = true;
      mite.bite();
      const fwd = _ct.set(1, 0, 0).applyQuaternion(mite.quat).setY(0).normalize();
      const at = play.target && play.target.distanceTo(m) < BUG_REACH + 160 ? play.target.clone() : m.clone().addScaledVector(fwd, 60);
      play.strikes = (play.strikes || 0) + 1;
      play.lastStrike = { hit: null, x: Math.round(at.x), z: Math.round(at.z) };
      audio.play('mite/strike', { volume: 0.8 });
      if (play.bug) {
        const r = ambient.nip(play.bug, mite.center.x, mite.center.z);
        if (r && play.target.distanceTo(m) < BUG_REACH + 160) {
          play.lastStrike.hit = 'springtail';
          snapPuff(at, 1.2);
          audio.play('mite/bite', { volume: 1, rate: 0.9 });
          if (rumbleOn) padOf().rumble(90, 0.35, 0.25);
          if (!lifeT.bugTip) { lifeT.bugTip = true; hud.toast(tt('mite.toasts.nippedSpringtail'), 2600); }
        } else { snapPuff(at, 0.7); audio.play('mite/bite', { volume: 0.6, rate: 1.2, only: 'old' }); }
      } else if (play.fam) {
        // a box mite of its own kind: it shuts itself in its capsule, and the bite glances off
        play.lastStrike.hit = 'boxmite';
        play.fam.ai.scared = Math.max(play.fam.ai.scared, 3);
        snapPuff(at, 0.8);
        audio.play('mite/glance', { volume: 0.7, old: ['mite/bite', { volume: 0.8, rate: 1.4 }] });
        if (!lifeT.famTip) { lifeT.famTip = true; hud.toast(tt('mite.toasts.boxMiteShut'), 2200); }
      } else { snapPuff(at, 0.7); audio.play('mite/bite', { volume: 0.6, rate: 1.2, only: 'old' }); }
    }
  } else if (play.act === 'devour') {
    // a quick snap onto it (0-0.25 s), then leg I holds it under the mouth and the chelicerae work while it
    // shrinks: the snap and the lift run on time (uh, over DEVOUR_DUR), the meal on its own progress (u, eatP:
    // EAT_SEC with no presses, EAT_PRESS more each chomp)
    const k = play.actT;
    // walked off with it: it wriggles free (it struggles all the while)
    if (play.eatFrom && Math.hypot(mite.center.x - play.eatFrom.x, mite.center.z - play.eatFrom.z) > EAT_WALK) {
      ambient.drop(play.bug);
      play.escapes = (play.escapes || 0) + 1;
      hud.toast(tt('mite.toasts.springtailEscaped'), 1600);
      play.act = null; mite.act({}); return;
    }
    play.eatP = Math.min(1, (play.eatP || 0) + dt / EAT_SEC);
    play.chompT = (play.chompT ?? 9) + dt;
    const uh = Math.min(1, k / DEVOUR_DUR), up = play.eatP;
    const snap = Math.min(1, k / 0.25);
    const to = _ct.subVectors(play.bug0, mite.center).setY(0);
    if (k < 0.25 && to.lengthSq() > 1) mite.st.fwd.lerp(to.normalize(), Math.min(1, dt * 12)).setY(0).normalize();
    const at = play.bug0.clone().lerp(m.clone().add(new THREE.Vector3(0, -10, 0)), sstepJ(0.1, 0.4, uh));
    // seen from behind: rear up and lift it clear of the body's outline (blended
    // by the view, eased so a peek never jumps it; from the front b is 0 and
    // this is the devour as it always was)
    const fw = _ct.set(1, 0, 0).applyQuaternion(mite.quat).setY(0).normalize();
    const want = liftFromView(fw);
    play.backK = play.backK == null ? want : play.backK + (want - play.backK) * Math.min(1, dt / 0.25);
    const L = play.backK * sstepJ(0.12, 0.38, uh) * (1 - sstepJ(0.86, 1, up));
    const kick = L * (1 - 0.6 * up); // it struggles, weaker as it is eaten
    const fight2 = 1 - 0.7 * up; // (and kicks and twists in the front view too)
    if (L > 0) {
      at.addScaledVector(fw, 55 * L);
      at.y += 150 * L + 6 * kick * Math.sin(k * 41);
      at.addScaledVector(_sp.set(-fw.z, 0, fw.x), 7 * kick * Math.sin(k * 29 + 1));
    }
    const ch = play.chompT < 0.18 ? Math.sin((play.chompT / 0.18) * Math.PI) : 0; // a chomp: the head jerks in
    mite.act({ rear: 0.2 + 0.25 * Math.sin(snap * Math.PI) + 0.9 * L + 0.15 * ch, lunge: 0.8 * Math.sin(snap * Math.PI) * (1 - 0.5 * L) + 0.35 * ch, gape: snap < 0.5 || (ch > 0 && play.chompT < 0.06) ? 1 : 0, hold: at, holdK: Math.min(1, uh / 0.3) });
    if (!play.snapped && k > 0.12) { play.snapped = true; mite.bite(); snapPuff(play.bug0.clone().setY(play.bug0.y + 20), 1); audio.play('mite/devour', { volume: 1, old: ['mite/bite', { volume: 1, rate: 0.85 }] }); }
    if (k > 0.3 && Math.floor(k / 0.2) !== Math.floor((k - dt) / 0.2)) {
      mite.bite(); audio.play('mite/bite', { volume: 0.5, rate: 1.1 + Math.random() * 0.2, only: 'old' });
      // held up, each bite of the chelicerae sheds bits of it against the sky
      if (L > 0.05) snapPuff(at, 0.4 * L);
    }
    if (L <= 0) at.addScaledVector(_sp.set(-fw.z, 0, fw.x), 5 * fight2 * Math.sin(k * 23));
    ambient.hold(play.bug, at, 1 - 0.95 * Math.max(0, (up - 0.08) / 0.92),
      { pitch: 0.7 * L, roll: (0.5 * kick + 0.3 * fight2 * (1 - L)) * Math.sin(k * 27), twist: (0.35 * kick + 0.22 * fight2 * (1 - L)) * Math.sin(k * 19 + 2) });
    if (up >= 1) {
      ambient.eaten(play.bug);
      play.grazed++; play.bugs = (play.bugs || 0) + 1;
      play.stam = 1;
      if (play.hurt > 0) play.heal += 8;
      if (rumbleOn) padOf().rumble(80, 0.3, 0.15);
      hud.toast(tt(play.hurt > 0 ? 'mite.toasts.ateSpringtailHurt' : 'mite.toasts.ateSpringtail', { count: play.bugs }), 1800);
      play.lastMeal = { t: +play.actT.toFixed(2), chomps: play.chomps || 0 };
      play.act = null; mite.act({});
    }
    return;
  } else if (play.act === 'jstrike') {
    // the jump attack's late form (X just after touchdown): a fast rear and downward snap from the landing crouch
    mite.act({ rear: 0.8 * Math.sin(Math.min(1, u / 0.3) * Math.PI / 2) * (1 - sstepJ(0.3, 0.6, u)), lunge: Math.sin(Math.min(1, Math.max(0, (u - 0.25) / 0.6)) * Math.PI), gape: u < 0.3 ? 1 : 0 });
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
    else if (mite.mode === 'crouch') audio.play('mite/crouch', { volume: 0.45 });
    snd.mode = mite.mode;
  }
  for (const e of ev) {
    if (e === 'jump') audio.play('mite/jump', { volume: 0.8, old: ['mite/dash', { volume: 0.7, rate: 1.3 }] });
    if (e === 'land') audio.play('mite/land', { volume: 0.8, old: ['mite/step', { volume: 0.9, rate: 0.75 }] });
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
  const m = createMite(scene, world.colliders, { cls: CLS.CUTICLE, tex, scale: MITE_SCALE, player: p.slot & 3 });
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
    puffDust(P.mite.center.clone(), 16, 1); // (a player who left: gone in a puff, not in a blink)
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
  audio.play('shared/reform', { volume: 0.7 });
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
  audio.play('shared/backdoor', { volume: 0.55 });
  embed.landmark('back', { player: P.slot });
}
const PORTAL = props.forward; // { placed, a, x, z, ... }
const portalState = { hinted: false, turned: false };
/** Is the pseudoscorpion on guard at the water (not lured more than 1.3 mm off it, not driven off)? */
function guarded() {
  if (!PORTAL.placed) return true;
  if (!boss.group.visible || ['gone', 'retreat', 'burrow'].includes(boss.st.state)) return false;
  return Math.hypot(boss.st.x - PORTAL.x, boss.st.z - PORTAL.z) < 1300;
}
/** Is player P at the portal's water (its reach)? */
const atPortal = (P) => PORTAL.placed && !held(P) && flat(P.mite.center, PORTAL) < FORWARD.reach && Math.abs(P.mite.center.y - PORTAL.y) < 450;
/** Can P go through now (at the water, the pseudoscorpion off guard)? Then Y enters. */
const atOpenPortal = (P) => !outro && atPortal(P) && !portalSealed() && !guarded();
function checkLandmarks() {
  // the way on unseals (the predatory mite met): heard once, on the edge
  const isSealed = portalSealed();
  if (lm.wasSealed && !isSealed) audio.play('shared/portal-appear', { volume: 0.8 });
  lm.wasSealed = isSealed;
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
    if (!portalState.hinted && dmin < 3200) { portalState.hinted = true; hud.toast(tt('mite.toasts.bossHint'), 3600); }
    // nearing the open way on (a screen or two): the shell starts loading the next world (no prompt is shown)
    const nearing = !portalSealed() && dmin < 3000;
    if (nearing !== lm.nearing) { lm.nearing = nearing; embed.near('forward', nearing); }
    if (at && !lm.fired) {
      if (guarded()) {
        audio.play('shared/portal-sealed', { volume: 0.6 });
        if (!portalState.turned) { portalState.turned = true; hud.toast(tt('mite.toasts.turnedBack'), 3600); }
        lm.log.push({ kind: 'turnedBack', slot: at.slot, t: +simTime.toFixed(2) });
        lm.fired = true; // once a visit (again after everyone has left)
        withRec(at, () => { if (rumbleOn) padOf().rumble(160, 0.4, 0.2); });
      } else if (portalSealed()) {
        // the way on exists from the start (the default path) but opens only once the predatory mite is met, twice
        audio.play('shared/portal-sealed', { volume: 0.6 });
        hud.toast(tt('mite.toasts.sealed'), 2600);
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
    embed.near('back', nearB, tt('mite.prompts.rise'));
    // standalone: our own quiet prompt (in the game the shell shows it)
    if (!embed.active) {
      backPrompt.style.display = nearB ? 'block' : 'none';
      backPrompt.textContent = tt('mite.prompts.backStandalone', { key: hud.glyphs === 'keyboard' ? 'R' : 'Y' });
    }
  }
}
/** The portal's Y prompt: on while anyone is at the open portal (the shell, or standalone embed.js, shows it). */
function setPortalPrompt(on) {
  if (on === lm.portal) return;
  lm.portal = on;
  if (on) audio.play('shared/portal-near', { volume: 0.6 });
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
  audio.play('shared/portal-enter', { volume: 0.8 });
  startOutro(P);
  embed.landmark('forward', { player: P.slot, outro: embed.active });
}

// ---------- the encounters, placed as you go (shared/director.js) ----------
// The director (design/encounter-pattern.md, "Placed as you go") places the
// enemies and events one at a time, in this order, in moss nobody has seen
// yet, a short way ahead of whoever leads (or, if they linger, round them):
// a family of box mites, the predatory mite on its hunting ground, a falling
// drop, the predatory mite again (gone on through the moss, out of sight;
// hungrier), a shower, the predatory mite a third time (hungriest), then the
// wet leaf axil with the pseudoscorpion on guard: rising in threat. Each comes only after the one before was met and a
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
/** Which of the predator's encounters it is on now (1, 2 or 3; 0 before it is placed). */
let predK = 0;
/**
 * Each time it is met again it is hungrier and faster (the owner, 2026-11-02: more danger nearer the
 * goal): hunting speed µm/s (the walk now runs 418 at a slight push to 870 at full tilt, the scramble
 * ~1480) and how far a fast-moving prey is felt (µm). The first can be outwalked at full tilt; the
 * second matches full tilt (scramble or jump to get away); the third outruns full tilt.
 */
const PRED_SPEEDS = conf('predatorHuntSpeeds', [760, 900, 1020]), PRED_FEEL = conf('predatorFeelDistances', [950, 1150, 1350]);
const PRED_LEVEL = [null, ...[0, 1, 2].map((i) => ({ chase: PRED_SPEEDS[i], vibration: PRED_FEEL[i] }))];
const PRED_IDS = ['pred', 'pred2', 'pred3'];
/** Put the predator's ground at (x, z), and the predator at its centre. */
function placePred(x, z, k) {
  Object.assign(predZone, predZoneAt(x, z));
  predAI.reset(x, z);
  Object.assign(predAI, PRED_LEVEL[k]);
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
const reachPred = (P) => Math.hypot(P.mite.center.x - predZone.x, P.mite.center.z - predZone.z) < predZone.r + 900 || P.mite.center.distanceTo(pred.center) < 1800;
// what each encounter does when placed, and when it counts as met
// (one predator for all three: on the default path its later grounds are only spots until the one before is
// met, then the predator goes on there once nobody sees it: movePredOn)
const encIndex = (id) => ENCOUNTERS.findIndex((e) => e.id === id);
const predSpots = [null, null, null, null];
function predEnc(k) {
  const id = PRED_IDS[k - 1], prevI = k > 1 ? encIndex(PRED_IDS[k - 2]) : -1, e = ENCOUNTERS[encIndex(id)];
  return {
    place: (x, z, b, info) => {
      if (k > 1 && info.instance === 'default' && predK !== k) { predSpots[k] = { k, x, z }; return predSpots[k]; }
      predSpots[k] = null; placePred(x, z, k); return { k };
    },
    met: (h, [p]) => predK === k && reachPred(pls[p.id] || P1),
    // a later time: only once the predator is out of every view and busy with nobody (it walks off, unseen)
    fits: (x, z, b) => e.fits(x, z, b) && (k === 1 || predK === k || director.index <= prevI || (!predEngaged() && !inSight(pred.center.x, pred.center.z, 600))),
  };
}
const nearAny = (x, z, r) => recs().some((P) => !held(P) && Math.hypot(P.mite.center.x - x, P.mite.center.z - z) < r);
/** The falling drops: one, then (a pool of its own, so the first can finish soaking away) a shower of three; never aimed at a player (life.js scatterSpot). */
const drip1 = createDrops({ scene, n: 1 }), drip3 = createDrops({ scene, n: DRIP.shower });
const dripEnc = (D, n) => ({
  place: (x, z, b) => {
    const spots = [{ x, z, delay: 0 }];
    for (let i = 1; i < n; i++) { const a = b + (i === 1 ? 1.9 : -1.9); spots.push({ x: x + Math.cos(a) * DRIP.spread, z: z + Math.sin(a) * DRIP.spread, delay: 0.55 * i }); }
    D.arm(spots); return { x, z };
  },
  // met when it falls (the drops land round whoever came near, never on them) or when someone passes its spot
  met: (h) => (D.spot && D.spot.x === h.x && D.state !== 'armed' && D.state !== 'idle') || nearAny(h.x, h.z, 900),
});
const ENC = {
  mites: { place: (x, z) => { placeFamily(x, z); return family.home; }, met: (h) => nearAny(h.x, h.z, FAMILY.r + 500) },
  pred: predEnc(1), pred2: predEnc(2), pred3: predEnc(3),
  drip: dripEnc(drip1, 1), drips: dripEnc(drip3, DRIP.shower),
  // the last: entering the open portal ends the level
  portal: { place: (x, z, b) => { placePortal(b, x, z); return { k: 'portal' }; }, met: () => false },
};
// The default path (layout.js DEFAULT_PATH): all seven laid out along one bearing on the first frame, so the
// way on exists from the start (sealed until every earlier encounter is met: portalSealed); head off another way
// and each, while nobody has seen it, leaves the path and is placed ahead of you as before (one object each: single).
const director = createDirector({ ...DIRECTOR, canPlace, defaultPath: DEFAULT_PATH, entries: ENCOUNTERS.map((e) => ({ ...e, ...ENC[e.id], single: true })) });
// Life everywhere (life.js): springtail groups on a lattice over the whole square, and water beads that
// grow commoner as the game goes on and thickest round the water (the way on: the moss gets wetter).
const ambient = createAmbient({ scene, tex, ground: springGround, keepOut: springKeepOut.push, blocked: (x, z) => (PORTAL.placed && Math.hypot(x - PORTAL.x, z - PORTAL.z) < PORTAL_CLEAR) || Math.hypot(x - BACKDOOR.x, z - BACKDOOR.z) < BACKDOOR.clear + 300 });
/** How wet the moss is at (x, z) now: rising with the encounters met, and toward the water (within 8 mm of it). */
const WET_R = 8000;
function wetness(x, z) {
  const p = director.index / ENCOUNTERS.length;
  let w = 0.06 + 0.7 * p ** 1.4;
  if (PORTAL.placed) w += 1.5 * Math.max(0, 1 - Math.hypot(x - PORTAL.x, z - PORTAL.z) / WET_R) ** 1.5;
  return w;
}
const beads = createBeads({ scene, wetness });
sem.warm(scene, camera);
const PORTAL_INDEX = ENCOUNTERS.findIndex((e) => e.final);
/** The way on exists from the start but stays shut until every earlier encounter is met (the director's order). */
function portalSealed() { return director.index < PORTAL_INDEX; }
/**
 * The predator's later grounds on the default path: once the one before is met, the predator goes on
 * through the moss to the next, unseen (out of every view, busy with nobody, the spot itself out of view).
 */
function movePredOn() {
  for (let k = 2; k <= 3; k++) {
    const spot = predSpots[k];
    if (!spot || predK !== k - 1 || director.index <= encIndex(PRED_IDS[k - 2])) continue;
    const D = director.entry(PRED_IDS[k - 1]).def;
    if (!D || D.handle !== spot || D.state !== 'placed') { predSpots[k] = null; continue; }
    if (predEngaged() || inSight(pred.center.x, pred.center.z, 600) || inSight(spot.x, spot.z, 650)) continue;
    placePred(spot.x, spot.z, k);
    predSpots[k] = null;
  }
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
  const S = director.entry(PRED_IDS[Math.max(0, predK - 1)]);
  if (!predPlaced || !S || S.state !== 'placed') { predDriftT = 0; return; }
  predDriftT += dt;
  const lead = director.leader, P = lead && pls[lead.id];
  if (predDriftT < 5 || !P || lead.moving || (capture.active && !cap.byBoss) || ['hunt', 'windup', 'strike', 'recover', 'recoil'].includes(predAI.state) || reachPred(P)) return;
  const dx = P.mite.center.x - predZone.x, dz = P.mite.center.z - predZone.z, d = Math.hypot(dx, dz) || 1;
  predZone.x += (dx / d) * PRED_DRIFT * dt; predZone.z += (dz / d) * PRED_DRIFT * dt;
}
/** A new game: the director starts over, the predator hidden and parked, no portal. */
/** The drops, their splashes, the springtail groups and the beads, each step. */
const _wetDir = new THREE.Vector3();
const lifeT = { t: 0, wetToast: false, edgeToast: 0, beadToast: false };
function stepLife(dt) {
  lifeT.t += dt;
  const ps = recs().filter((P) => !held(P)).map((P) => { const v = P.mite.mode === 'walk' ? P.mite.speed : 0, f = P.mite.st.fwd; return { x: P.mite.center.x, z: P.mite.center.z, vx: f.x * v, vz: f.z * v }; });
  for (const D of [drip1, drip3]) for (const e of D.update(dt, ps)) {
    if (e.type === 'fall') { hud.toast(tt('mite.toasts.drip'), 2400); audio.play('mite/drop-fall', { volume: 0.8, old: ['mite/dash', { volume: 0.5, rate: 0.5 }] }); }
    if (e.type === 'splash') {
      puffDust(new THREE.Vector3(e.x, floorH(e.x, e.z) + 30, e.z), 22, 1.6);
      audio.play('mite/drop-splash', { volume: 0.9, old: ['mite/close', { volume: 1, rate: 0.6 }] });
      // a mite it happens to land on is not knocked about: it is left in (or by) the bead, and climbs out (the beads below)
      for (const P of recs()) {
        const c = P.mite.center;
        if (held(P) || Math.hypot(c.x - e.x, c.z - e.z) > DRIP.splash) continue;
        logChallenge('drip bead', P);
        if (rumbleOn) players.pad(P.slot).rumble(120, 0.2, 0.3);
      }
      // the predator, caught by it too, staggers
      if (predHere() && Math.hypot(pred.center.x - e.x, pred.center.z - e.z) < DRIP.splash + 200) predAI.repel();
    }
  }
  const foci = recs().map((P) => P.mite.center);
  const bodies = [...foci, ...(predHere() ? [pred.center] : []), ...(family.home ? family.mites.map((f) => f.m.center) : [])];
  // the springtail groups are drawn round each player and round what each view frames (out to its reach as
  // zoomed: nothing comes or goes inside a view; one that must, while seen, dives into the moss or climbs out)
  const reach = Math.max(ambient.DRAW, 1.25 * (rig.viewHfw ?? rig.hfw) * (groupZoom || 1) + 1800);
  ambient.update(lifeT.t, bodies, [...foci, ...viewFoci.map((v) => ({ x: v.x, z: v.z, r: reach }))], viewFrusta.length ? inSight : null);
  for (const e of ambient.events) crumbPuff(e);
  beads.update(foci);
  // the moss gets wetter: said once, as the water nears
  if (!lifeT.wetToast && PORTAL.placed && !portalSealed() && foci.some((c) => Math.hypot(c.x - PORTAL.x, c.z - PORTAL.z) < WET_R * 0.75)) { lifeT.wetToast = true; hud.toast(tt('mite.toasts.wetter'), 2600); }
  // the walkable square's edge (half a metre out) is a wall of tall moss (edge.js); against it, a gentle word too
  lifeT.edgeToast = Math.max(0, lifeT.edgeToast - dt);
  if (!lifeT.edgeToast && foci.some((c) => !insideEdge(c.x, c.z, 450))) { lifeT.edgeToast = 20; hud.toast(tt('mite.toasts.edge'), 2600); }
}
/** Crumbs where a springtail dives into the moss or climbs out of it (life.js, thicket.js events). */
function crumbPuff(e) {
  if (e.type === 'eaten') { snapPuff(_sp2.set(e.x, e.y, e.z), 0.7); return; }
  puffDust(_sp2.set(e.x, e.y + 25, e.z), 9, 0.75);
}
function newEncounters() {
  director.reset();
  predSpots.fill(null);
  parkPred();
  parkFamily(); drip1.reset(); drip3.reset(); beads.reset(); ambient.reset();
  props.unplace();
  boss.setVisible(false);
  world.exclude.set('portal', []);
  portalState.hinted = false; portalState.turned = false;
  lifeT.wetToast = false; lifeT.beadToast = false;
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
  audio.play('shared/slowdown', { volume: 0.5, delay: OUTRO.beat });
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
  rig.zoom = 1;
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
const DUST = 128;
const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), gMaterial({ cls: CLS.LITTER }), DUST);
dust.frustumCulled = false;
scene.add(dust);
const dustP = Array.from({ length: DUST }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), t: 9, r: 8 }));
let dustI = 0;
/** A puff of humus crumbs in a ring round the feet (a jump's push-off or its landing; k scales it). */
function puffDust(m, n = 10, k = 1) {
  const c = m.center || m, y = m.center ? c.y - 80 : c.y;
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
/**
 * X, by what the mite is doing. The jump attack (the owner, 2026-11-04: "can we have the mite's jump be able to
 * be a jump attack, if they press X while landing? I want him to be able to fight the bigger mite etc by jumping
 * and attacking. The other mite is too high up to fight otherwise"): X in the air (the landing window opens
 * JA_BEFORE s before touchdown; earlier, X dives at once, the old pounce-bite, so the landing comes to it), or
 * up to JA_AFTER s after touchdown, strikes down with the chelicerae from above: it reaches the predator's body,
 * which a bite from the ground cannot (predTooHigh).
 */
function xPress() {
  if (mite.mode === 'air') { startDive(); return; }
  if (mite.mode === 'crouch') return;
  if (mite.mode === 'walk' && play.landT !== undefined && simTime - play.landT <= JA_AFTER + 1e-6 && !play.dive && play.act !== 'devour') { lateJumpAttack(); return; }
  biteNow();
}
/** X just after touchdown: the jump attack from the landing crouch, resolved at once. */
function lateJumpAttack() {
  play.landT = undefined;
  if (play.act === 'eat' || play.act === 'devour') return;
  Object.assign(play, { act: 'jstrike', actT: 0, actDur: 0.32, snapped: true });
  mite.bite();
  jumpAttackHit(pounceTargets(), 'late');
}
/** X in the air: dive at the nearest enemy point within reach ahead (aim assist), or straight down (a clear miss). */
function startDive() {
  if (play.dive) return;
  play.diveT = 0; play.diveLate = mite.timeToLand() <= JA_BEFORE;
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
      if (!challengeLog.some((x) => x.kind.startsWith('predator ground'))) { if (hunger.state === 'grace') { hunger.reset(0); hunger.update(0.01); } hud.toast(tt('mite.toasts.predatorGround'), 2600); }
      logChallenge(`predator ground ${predK}`, P);
    }
    const cl = thicket.inside(c);
    if (cl) {
      if (!challengeLog.some((x) => x.kind.startsWith('thicket'))) hud.toast(tt('mite.toasts.thicket'), 3200);
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
  mite.bite();
  if (jumpAttackHit(d.target ? [d.target, ...pounceTargets()] : pounceTargets(), play.diveLate ? 'landing' : 'dive')) {
    // rebound: a little hop back
    mite.st.fwd.negate(); mite.jump(); play.rebound = 0.25;
    return;
  }
  hud.toast(tt('mite.toasts.missed'), 900);
  kickDust(mite, 4);
}
/**
 * The jump attack lands (a dive's impact, or X just after touchdown): a hit on the predator's body or mouth, or
 * the pseudoscorpion's pincer, within JA_REACH of the body. The predator: a flash, a recoil (predAI.repel, or
 * it runs off), the bite sound, a hit-pause, and JA_INTEREST of its interest. True on a hit.
 */
function jumpAttackHit(targets, how) {
  const c = mite.center;
  let best = null, bd = JA_REACH;
  for (const t of targets) {
    const pts = t.foe === 'boss' ? boss.bitePoints() : (predHere() && !(capture.active && !cap.byBoss) ? [pred.center, pred.mouth(new THREE.Vector3())] : []);
    for (const p of pts) { const dd = p.distanceTo(c); if (dd < bd) { bd = dd; best = { foe: t.foe, p: p.clone() }; } }
  }
  play.lastImpact = { t: simTime, hit: !!best, how, foe: best ? best.foe : null };
  play.jumpAttacks = (play.jumpAttacks || 0) + 1;
  if (!best) return false;
  play.pounces = (play.pounces || 0) + 1;
  hitPause = 0.12;
  if (rumbleOn) padOf().rumble(260, 0.9, 0.7);
  audio.play('mite/bite', { volume: 1, rate: 0.75 });
  audio.play('mite/strike', { volume: 0.8 });
  kickDust(mite, 8);
  snapPuff(best.p, 1.4);
  hitFlash(best.p);
  if (best.foe === 'boss') { const gone = boss.bitten(2, cur.slot); hud.toast(gone ? tt('mite.toasts.pounceBossGone') : tt('mite.toasts.pounceBoss'), 1300); }
  else {
    play.jumpHits = (play.jumpHits || 0) + 1;
    // recoil: shoved back from the strike, as well as reeling (predAI.repel inside wearDown)
    const away = _ct.subVectors(pred.center, c).setY(0);
    if (away.lengthSq() > 1) { away.normalize(); pred.nudge(away.x * 120, away.z * 120); }
    wearDown('jump');
  }
  return true;
}
// a hit's flash: a burst of light where the strike lands (the SEM's charging flare), fading in ~0.25 s
const flashEl = document.createElement('div');
flashEl.style.cssText = 'position:fixed;left:0;top:0;width:220px;height:220px;margin:-110px 0 0 -110px;border-radius:50%;pointer-events:none;z-index:4;opacity:0;background:radial-gradient(circle,rgba(255,255,255,.95) 0,rgba(255,255,255,.55) 22%,rgba(255,255,255,0) 62%);mix-blend-mode:screen;transition:opacity .28s ease-out,transform .28s ease-out';
document.body.appendChild(flashEl);
const _hf = new THREE.Vector3();
let flashes = 0;
function hitFlash(p) {
  flashes++;
  _hf.copy(p).project(camera);
  const x = (_hf.x * 0.5 + 0.5) * innerWidth, y = (-_hf.y * 0.5 + 0.5) * innerHeight;
  flashEl.style.transition = 'none'; flashEl.style.opacity = '1'; flashEl.style.transform = `translate(${x}px,${y}px) scale(0.6)`;
  void flashEl.offsetWidth;
  flashEl.style.transition = ''; flashEl.style.opacity = '0'; flashEl.style.transform = `translate(${x}px,${y}px) scale(1.4)`;
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
  hud.toast(tt('mite.toasts.dashedOut'), 1500);
}
/** The pseudoscorpion's grab: a catch like the predator's (createCapture), with its own pose. */
function startBossCapture() {
  if (capture.active) return;
  Object.assign(cap, { phase: null, leg: 0, heldOnce: false, t: 0, who: cur, byBoss: true });
  cap.c0.copy(mite.center); cap.q0.copy(mite.quat);
  play.caught++; play.stun = 0;
  capture.start({ by: tt('mite.capture.boss.by'), how: tt('mite.capture.boss.how') });
  embed.captured({ by: 'boss', player: cur.slot });
  audio.play('mite/pincer', { volume: 0.9, old: ['mite/predator', { volume: 1, rate: 0.6 }] });
  if (rumbleOn) padOf().rumble(400, 0.9, 1);
}
// the boss's resolve: a quiet brass gauge, shown while it is engaged
const bossLog = { burrows: 0 };
const gauge = document.createElement('div');
gauge.style.cssText = 'position:fixed;left:50%;top:48px;transform:translateX(-50%);display:none;align-items:center;gap:10px;color:#e9d9a8;font:600 11px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-shadow:0 1px 2px #000a;pointer-events:none;z-index:6';
gauge.innerHTML = `<span>${tt('mite.bossName')}</span><span style="width:180px;height:5px;border:1px solid #b8913f;background:rgba(20,16,8,.45);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:100%;background:linear-gradient(90deg,#8a6a2c,#d8b268);transition:width .25s"></i></span>`;
document.body.appendChild(gauge);

function tick(dt, inputs) {
  if (hitPause > 0) { hitPause -= dt; dt *= 0.06; }
  stepDust(dt);
  // stamina, the scramble's dust
  for (const P of recs()) {
    const pl = P.play;
    if (pl.stam === undefined) pl.stam = 1;
    if (pl.scr) { pl.stam = Math.max(0, pl.stam - dt / STAM_EMPTY); if (Math.random() < dt * 30) kickDust(P.mite, 1); }
    else pl.stam = Math.min(1, pl.stam + dt / STAM_FILL);
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
    hud.toast(tt('shared.players.eatenBack', { n: who.slot + 1 }), 2400);
    cs = { active: false };
  }
  // the strike window: a scramble (B, with stamina) breaks out of the grip
  if (cs.active && cs.phase === 'strike' && capPad && players.controls(who.slot).defend.down() && (who.play.stam ?? 1) > 0.3) { dashOut(who); cs = { active: false }; }
  if (cs.active) withRec(who, () => animateCapture(cs, dt));
  else if (predHere()) hunger.update(dt);
  // Blades and hyphae move first (pushed and loaded by where the mites were),
  // so each mite then settles on, and clears, the surfaces as they are now.
  // (the tile's blades and hyphae see each body's copies in tile coordinates; the thickets' threads stand where they are)
  const fbodies = [...recs().map((P) => P.mite), ...(npcOn ? [npc] : []), ...(predHere() ? [pred] : []), ...(family.home ? family.mites.map((f) => f.m) : [])].map(bodyOf);
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
    // in a bead of water (a drop that landed on or by it): slowed, wobbling as it pushes and climbs out; no daze
    play.wet = mite.mode === 'walk' && !held(P) ? Math.max(drip1.wetAt(mite.center.x, mite.center.z, 175), drip3.wetAt(mite.center.x, mite.center.z, 175)) : 0;
    if (play.wet > 0 && input.maxSpeed) {
      const w = play.wet, t = simTime * 9 + P.slot;
      if (!lifeT.beadToast) { lifeT.beadToast = true; hud.toast(tt('mite.toasts.bead'), 2400); }
      const dir = input.mag > 0.01 ? _wetDir.copy(input.dir).applyAxisAngle(_up, 0.5 * w * Math.sin(t)) : input.dir;
      input = { ...input, dir, maxSpeed: input.maxSpeed * (1 - (1 - DRIP.slow) * w), accel: 0.35, lean: Math.max(input.lean || 0, 0.6 * w * (0.5 + 0.5 * Math.sin(t * 1.7))) };
    }
    if (cs.active && cap.who === P) input = { ...input, mag: 0 };
    // eating: slowed to a shuffle (walk on far enough and the meal wriggles free: stepAct)
    if (play.act === 'devour' && input.maxSpeed) input = { ...input, maxSpeed: input.maxSpeed * 0.35 };
    const ev = mite.update(dt, input);
    if (ev.includes('land') && !play.dive) play.landT = simTime;
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
  stepFamily(dt);
  stepLife(dt);
  // the crowd: every mite shoves springtails aside; the gamasid feeds on them when it is not after you
  thickBodies.length = 0;
  for (const P of recs()) if (!held(P)) thickBodies.push(bodyRef(P.slot, P.mite.center, 175));
  const predBody = predHere() ? bodyRef(9, pred.center, 330) : null;
  if (predBody) thickBodies.push(predBody);
  thicket.update(dt, thickBodies, { pred: predHere() ? pred : null, predBody, predFree: predHere() && !capture.active && ['wander'].includes(predAI.state) });
  for (const e of thicket.takeEvents()) crumbPuff(e);
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
      if (f.retreated) { fightLog.retreats++; audio.play('shared/foe-flees', { volume: 0.7 }); predAI.retreat(); if (hunger.hungry) hunger.missed(); hud.toast(tt('mite.toasts.predatorGivesUp'), 1800); fight.reset(); }
      const who = (text) => (multi() ? tt('shared.players.prefixed', { n: cur.slot + 1, text }) : text);
      for (const e of r.events) {
        if ((e === 'gaveUp' || e === 'lost') && hunger.hungry) hunger.missed();
        if (e === 'hunt') { audio.play('mite/predator', { volume: 0.9 }); logChallenge('predator hunt', cur); }
        if (e === 'legHit') audio.play('mite/predator', { volume: 0.6, rate: 1.25 });
        if (e === 'windup') audio.play('mite/predator-windup', { volume: 0.8 });
        if (e === 'strike') audio.play('mite/predator-strike', { volume: 0.8 });
        if (e === 'hunt') hud.toast(who(tt('mite.toasts.predatorTouched')), 2600);
        else if (e === 'windup') { hud.toast(who(tt('mite.toasts.predatorRears')), 1400); if (rumbleOn) padOf().rumble(250, 0.15, 0); }
        else if (e === 'blocked') { if (rumbleOn) padOf().rumble(90, 0.2, 0.35); audio.play('mite/glance', { volume: 0.8 }); wearDown('block'); }
        else if (e === 'legHit') {
          play.hurt++; play.stun = 0.7; play.heal = 0;
          if (rumbleOn) padOf().rumble(260, 0.8, 0.9);
          if (play.hurt >= 3) startCapture();
          else hud.toast(who(tt('mite.toasts.legGrabbed', { hurt: play.hurt })));
        }
      }
    });
  }
  // creatures push each other instead of walking through each other (shared/push.js)
  stepPush(dt);
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
        if (first) hud.toast(tt('mite.toasts.bossWakes'), 3000);
      }
      else if (e.type === 'tell') { audio.play('shared/danger', { volume: 0.5 }); for (const Q of recs()) if (Q.mite.center.distanceTo(boss.center) < 2600) withRec(Q, () => { if (rumbleOn) padOf().rumble(200, 0.12, 0); }); }
      else if (e.type === 'snap') audio.play('mite/pincer', { volume: 0.8, old: ['mite/predator', { volume: 0.8, rate: 0.7 }] });
      else if (['sweep', 'step'].includes(e.type)) audio.play('mite/predator', { volume: 0.8, rate: 0.7 });
      else if (e.type === 'grab' && P) withRec(P, () => startBossCapture());
      else if (e.type === 'survived') { audio.play('mite/glance', { volume: 0.8 }); hud.toast(tt('mite.toasts.bossClosedUp'), 1600); }

      else if (e.type === 'miss') hud.toast(tt('mite.toasts.bossMissed'), 1500);
      else if (e.type === 'retreat') { audio.play('shared/foe-flees', { volume: 0.7 }); hud.toast(tt('mite.toasts.bossRetreats'), 2600); }
      else if (e.type === 'burrow') { puffDust(new THREE.Vector3(e.x, floorH(e.x, e.z) + 40, e.z), 24, 2.2); bossLog.burrows++; }

      else if (e.type === 'return') hud.toast(tt('mite.toasts.bossReturns'), 1800);
    }
  }
  // backing down into the moss: crumbs keep coming up round it
  if (boss.st.state === 'burrow' && Math.random() < dt * 14) { const a = Math.random() * 6.283; puffDust(new THREE.Vector3(boss.st.x + Math.cos(a) * 500, floorH(boss.st.x, boss.st.z) + 30, boss.st.z + Math.sin(a) * 500), 4, 1.2); }
  props.update(simTime, dt);
  stepDirector(dt);
  checkLandmarks();
  return evs;
}

// ---------- bodies push each other (the owner, 2026-11-04: "can we have creatures push each other instead of
// clipping through each other? For example I saw another mite and just walked through him, whereas I'd hope
// to push and be pushed") ----------
// Every walking creature is a disc on the ground (shared/push.js), with a mass by its body's volume: a box mite
// 1 (the family's smallest ~0.5, its biggest ~1.2), the predatory mite ~6, a springtail ~0.35, the
// pseudoscorpion immovable. Overlaps part along the line between centres, shared by mass (a bigger mite shoves
// you more than you shove it), and a push carries on a little as a slide (game_config.js shared.pushCarry).
// The mites take the push through mite.nudge (the feet stay planted and step after the body); the ambient
// springtails as an offset that fades (life.js pushBy), so they stay stood on the ground (stand.js) where they
// end up. A mite held in jaws, and its captor during a catch, are left out; one in the air passes over what is
// below it. The thickets' crowd keeps its own rules (shared/crowd.js: it parts round a mite).
const push = createPush({ cell: 420, carry: gconf('shared.pushCarry', 0.35), tau: 0.15, maxSlide: 700, passes: 3 });
const BOX_MASS = (m) => (m.scale / MITE_SCALE) ** 3;
const PRED_MASS = (PRED.noto.r[0] * PRED.noto.r[1] * PRED.noto.r[2]) / (ANAT.noto.r[0] * ANAT.noto.r[1] * ANAT.noto.r[2] * MITE_SCALE ** 3);
const SPRING_MASS = 0.35, SPRING_R = 62, SPRING_AHEAD = 45;
// the pseudoscorpion's body (local x forward, µm): the carapace and the long abdomen behind it
const BOSS_DISCS = [[520, 240], [-150, 440], [-720, 400]];
const pushBodies = [], pushRefs = [];
const _pf = new THREE.Vector3();
function mitePushBody(id, m, mass) {
  const r = m.radii, f = _pf.set(1, 0, 0).applyQuaternion(m.quat).setY(0);
  if (f.lengthSq() < 1e-6) f.set(1, 0, 0); else f.normalize();
  const off = m.anat.noto.c[0] * m.scale, c = m.center;
  return { id, x: c.x + f.x * off, z: c.z + f.z * off, y: c.y, h: r[1], r: (r[0] + r[2]) / 2, m: mass, dx: 0, dz: 0 };
}
function stepPush(dt) {
  pushBodies.length = 0; pushRefs.length = 0;
  const add = (b, ref) => { pushBodies.push(b); pushRefs.push(ref); };
  const predCaught = capture.active && !cap.byBoss;
  for (const P of recs()) if (!held(P) && !(capture.active && cap.who === P)) add(mitePushBody(`p${P.slot}`, P.mite, BOX_MASS(P.mite)), P.mite);
  if (npcOn) add(mitePushBody('npc', npc, BOX_MASS(npc)), npc);
  if (family.home) family.mites.forEach((f, i) => add(mitePushBody(`fam${i}`, f.m, BOX_MASS(f.m)), f.m));
  if (predHere() && !predCaught) add(mitePushBody('pred', pred, PRED_MASS), pred);
  for (const b of ambient.live) {
    if (b.held || (b.dive || 0) > 0.3) continue;
    const ax = Math.cos(b.yaw), az = -Math.sin(b.yaw); // (its heading: yaw is -atan2(vz, vx))
    add({ id: `s${b.key}`, x: b.x + ax * SPRING_AHEAD * b.sc, z: b.z + az * SPRING_AHEAD * b.sc, y: b.y, h: 50 * b.sc, r: SPRING_R * b.sc, m: SPRING_MASS * b.sc ** 3, dx: 0, dz: 0 }, b.key);
  }
  if (PORTAL.placed && boss.group.visible && !['gone', 'burrow'].includes(boss.st.state)) {
    const ca = Math.cos(boss.st.a), sa = Math.sin(boss.st.a), by = boss.center.y;
    for (const [lx, r] of BOSS_DISCS) add({ id: `boss${lx}`, x: boss.st.x + ca * lx, z: boss.st.z + sa * lx, y: by, h: 260, r, m: Infinity, fixed: true, group: 'boss', dx: 0, dz: 0 }, null);
  }
  if (pushBodies.length < 2) return;
  push.step(dt, pushBodies);
  for (let i = 0; i < pushBodies.length; i++) {
    const b = pushBodies[i], ref = pushRefs[i];
    if (!(b.dx || b.dz) || !ref) continue;
    if (typeof ref === 'string') ambient.pushBy(ref, b.dx, b.dz);
    else ref.nudge(b.dx, b.dz);
  }
}

function unlockAny() {
  for (const p of players.active) {
    const pp = players.pad(p.slot);
    if (pp.kind !== 'controller') continue;
    for (let b = 0; b < 16; b++) if (pp.value(b) > 0.5) { audio.unlock(); return; }
  }
}
/** Every player's input this frame, by slot (player 1 also drives the camera and the imaging). */
// The trigger zoom: the field's half width (µm) runs 160 to 4200; full trigger changes it by e^1.4 a second
// (a little faster than the paramecium's 1.1, for a range nine times as wide).
const ZOOM_HFW = [160, 4200], ZOOM_RATE = 1.4;
let zoomToastT = 0;
function readInput(dt) {
  players.poll(); // the roster and every player's pad (do not also poll the pads)
  syncPlayers();
  unlockAny();
  const menu = features.update();
  capPad = !menu;
  if (menu) return [];
  hud.update(pad);
  // RS: the camera's turn is locked to the world's forward (FORWARD_YAW, shared/camlock.js): RS
  // left/right peeks sideways (each player's own); up/down pitches by intent (up looks up: the camera
  // swings down). With the Free camera setting and one player, RS left/right orbits as it used to.
  let yaw = 0;
  const nAct = players.active.length, free = camLock.free(nAct);
  for (const p of players.active) { const lk0 = players.controls(p.slot).look(); yaw += lk0.yaw; camLock.peek(p.slot, free ? 0 : lk0.yaw, dt); }
  camLock.keep(players.active.map((p) => p.slot));
  rig.yaw = camLock.yaw(rig.yaw, dt, nAct, THREE.MathUtils.clamp(yaw, -1, 1) * 1.8 * dt, capture.active);
  const lk = ctl.look();
  rig.pitch = THREE.MathUtils.clamp(rig.pitch - lk.pitch * 1.2 * dt, 0.18, 1.5);
  const look = ctl.lookStep();
  if (look) { features.set('look', LOOKS[(sem.mode + look + LOOKS.length) % LOOKS.length]); hud.toast(tx('mite.lookNames')[sem.mode] ?? MODES[sem.mode]); }
  // LT/RT: zoom out / in, analogue and continuous like the paramecium's (was D-pad steps of 1.5x; the owner,
  // 3 Nov 2026: trigger zoom wherever the triggers are free, and here they were). The field is one for
  // everyone, as RS turns the one view, so any player's triggers drive it; the camera eases to it
  // (placeCamera), and the magnification shows once the triggers are let go.
  let zr = 0;
  for (const p of players.active) { const c = players.controls(p.slot); zr += c.lt() - c.rt(); }
  zr = THREE.MathUtils.clamp(zr, -1, 1);
  if (Math.abs(zr) > 0.04) { rig.hfw = THREE.MathUtils.clamp(rig.hfw * Math.exp(zr * ZOOM_RATE * dt), ZOOM_HFW[0], ZOOM_HFW[1]); zoomToastT = 0.35; }
  else if (zoomToastT > 0 && (zoomToastT -= dt) <= 0) hud.toast(tt('mite.toasts.mag', { mag: (127000 / rig.hfw).toFixed(0) }));
  // The SEM observer view is a standalone prototype aid, never a game action.
  if (!embed.active && ctl.stickClick.left.pressed()) { features.set('observer', !observer); hud.toast(observer ? tt('mite.toasts.observerOn') : tt('mite.toasts.observerOff')); }
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
  // X: in the air, the jump attack (its dive); just landed, its late form; else a bite (or a chomp while eating)
  if (c.attack.pressed()) xPress();
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
const CAP_LINES = tx('mite.banner.capture');
function updateBanner() {
  let txt = '', hot = true;
  gauge.style.display = boss.engaged ? 'flex' : 'none';
  gauge.querySelector('i').style.width = `${(boss.resolve * 100).toFixed(0)}%`;
  if (capture.active) txt = cap.byBoss && ['strike', 'hold'].includes(capture.phase) ? tt('mite.banner.inPincer') : cap.byBoss && capture.phase === 'eat' ? tt('mite.banner.bossEating') : CAP_LINES[capture.phase] || '';
  else if (boss.attacking) txt = boss.st.state === 'tell' ? tt('mite.banner.pincersOpen') : tt('mite.banner.snaps');
  else if (predHere() && predAI.attacking) txt = tt('mite.banner.rears');
  else if (predHere() && predAI.state === 'retreat') { txt = tt('mite.banner.runningOff'); hot = false; }
  else if (predHere() && predAI.state === 'hunt') txt = play.hurt ? tt('mite.banner.huntingHurt', { hurt: play.hurt }) : tt('mite.banner.hunting');
  else if (predHere() && isHungry()) { txt = tt('mite.banner.hungry'); hot = false; }
  banner.style.display = txt ? 'block' : 'none';
  banner.textContent = txt;
  banner.style.background = hot ? 'rgba(150,30,20,.8)' : 'rgba(10,12,16,.6)';
}

let frames = 0, statT = 0;
// ---------- split screen and the edge arrows ----------
// The SEM composite (and a borrowed look) ends on the screen, so the split
// copies each view from it (capture). Split views render at a lower
// resolution (the quality governor's split factor): the composite costs per pixel.
const split = createSplitScreen(renderer, { capture: true, zoomMax: SPLIT_ZOOM_MAX });
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
  split.update(recs().map((P) => ({ slot: P.slot, position: (eating && cap.who === P ? (cap.byBoss ? boss.center : pred.center) : P.mite.center).clone() })), { camera, zoom: rig.zoom }, dt);
  applyPeek();
  groupZoom = split.zoom;
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
    noteViewDirs(view.slots);
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
  marks.drawSplit(split, props.back, { kind: 'backdoor', label: tt('mite.marks.up'), range: 4000 });
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
// The way on: a quiet row of marks, one per encounter, filled as each is met (the owner, 2026-11-02:
// "I never really felt like I was getting closer to the portal"); the moss's wetness says it too.
const wayOn = document.createElement('div');
wayOn.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);color:#e9d9a8;font:600 11px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-shadow:0 1px 2px #000c;pointer-events:none;z-index:6;opacity:.85';
document.body.appendChild(wayOn);
function updateWayOn() {
  const n = ENCOUNTERS.length, k = Math.min(n, director.index);
  wayOn.textContent = outro || embed.held || intro ? '' : tt(k >= n - 1 ? 'mite.status.wayOnNear' : 'mite.status.wayOn', { dots: '●'.repeat(k) + '○'.repeat(n - k) });
}
function updateText(d) {
  updateBanner();
  updateWayOn();
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
  split.update(recs().map((P) => ({ slot: P.slot, position: P.mite.center.clone() })), { camera, zoom: rig.zoom }, dt);
  applyPeek();
  groupZoom = split.zoom;
  const n = Math.max(1, split.views.length);
  for (let i = 0; i < n && i < 4; i++) split.withView(i, camera, () => {
    camera.updateMatrixWorld();
    noteViewDirs(split.views[i] ? split.views[i].slots : [0]);
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
  /** The camera rig (hfw: the field's half width the triggers zoom, viewHfw: the camera's eased one). */
  get rig() { return rig; },
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
  /** Testing only: place encounter `k` ('mites' | 'pred' | 'drip' | 'pred2' | 'drips' | 'pred3' | 'portal') at (x, z), met along bearing b, out of order. */
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
  me(slot = 0) { const P = pls[slot] || P1; return { act: P.play.act || null, nips: P.play.nips || 0, grazed: P.play.grazed, mode: P.mite.mode, hurt: P.play.hurt, strikes: P.play.strikes || 0, lastStrike: P.play.lastStrike || null, bugs: P.play.bugs || 0, stam: P.play.stam,
    eatP: P.play.act === 'devour' ? +P.play.eatP.toFixed(3) : null, chomps: P.play.chomps || 0, lastMeal: P.play.lastMeal || null, escapes: P.play.escapes || 0,
    jumpAttacks: P.play.jumpAttacks || 0, jumpHits: P.play.jumpHits || 0, tooHigh: P.play.tooHigh || 0, lastImpact: P.play.lastImpact || null, landT: P.play.landT ?? null, timeToLand: +Math.min(99, P.mite.timeToLand()).toFixed(3) }; },
  /** Testing: player `slot` presses X now (whatever X does: bite, chomp, the jump attack in the air or just after landing). */
  x(slot = 0) { const P = pls[slot] || P1; withRec(P, xPress); return P.play.act || (P.play.dive ? 'dive' : null); },
  /** Bodies pushing each other (shared/push.js): the last step's bodies and the deepest overlap among them now. */
  push: {
    get stats() { return push.stats; },
    bodies: () => pushBodies.map((b) => ({ id: b.id, x: Math.round(b.x), z: Math.round(b.z), r: Math.round(b.r), m: +(+b.m).toFixed(3), dx: +b.dx.toFixed(2), dz: +b.dz.toFixed(2) })),
    overlap: () => +deepestOverlap(pushBodies).toFixed(2),
    masses: () => ({ box: 1, pred: +PRED_MASS.toFixed(2), springtail: SPRING_MASS }),
  },
  /** The corridor's walls (layout.js EDGE, game_config.js seconds) and where player `slot` is in it: { a north of the start, c east }. */
  walls(slot = 0) { const P = pls[slot] || P1, c = toCorridor(P.mite.center.x, P.mite.center.z, {}); return { south: EDGE.south, north: EDGE.north, side: EDGE.side, seconds: WALL_SECONDS, speed: WALK_FOR_WALLS, portalAlong: PORTAL_ALONG, ux: EDGE.ux, uz: EDGE.uz, px: EDGE.px, pz: EDGE.pz, a: Math.round(c.a), c: Math.round(c.c) }; },
  /** The predator's body and a player's mouth heights (µm above the floor), for the reach checks. */
  reach(slot = 0) { const P = pls[slot] || P1, m = P.mite.mouth(new THREE.Vector3()); return { mouth: Math.round(m.y - floorH(m.x, m.z)), belly: Math.round(pred.center.y - PRED.noto.r[1] - floorH(pred.center.x, pred.center.z)), tooHigh: predTooHigh(m), groundReach: GROUND_REACH }; },
  fightConf: { JA_BEFORE, JA_AFTER, JA_REACH, JA_INTEREST, EAT_SEC, EAT_PRESS, EAT_WALK },
  get flashes() { return flashes; },
  bossLog,
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
  /**
   * Testing only: drop the single drop at (x, z), default right on player `slot` (the game never aims
   * one at a player): it falls after its warning ring and leaves a bead. Returns the spot.
   */
  dripAt(x = null, z = null, slot = 0) { const c = (pls[slot] || P1).mite.center; return drip1.fallAt([{ x: x ?? c.x, z: z ?? c.z, delay: 0 }]); },
  /** Player `slot`'s state for checks: { wet (0..1, in a bead), stun, speed, mode, x, z }. */
  wetState(slot = 0) { const P = pls[slot] || P1; return { wet: +(P.play.wet || 0).toFixed(3), stun: P.play.stun, speed: Math.round(P.mite.speed), mode: P.mite.mode, x: Math.round(P.mite.center.x), z: Math.round(P.mite.center.z) }; },
  /** Life and weather (life.js) and the box-mite family, for checks; inSight(x, z, r): can a view (last drawn or stepped) see that disc? */
  life: { ambient, beads, drip1, drip3, family, wetness, ground: springGround, keepOut: springKeepOut }, inSight: (x, z, r) => inSight(x, z, r),
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

// Springtail prototype (Zoom Chain, Level 0): the water springtail Podura
// aquatica on a bog pool's surface film, seen through a macro lens.
// Units: mm and seconds.
import * as THREE from '../shared/vendor/three.module.min.js';
import { embed } from '../shared/embed.js';
import { createPlayers, PLAYER_COLORS } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks } from '../shared/landmark.js';
import { mountHud } from '../shared/hud.js';
import { createControls, hudControls, addInvertY } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { loadTexture } from '../shared/assets.js';
import { createMacro, lens, macroShared, applyLook, MACRO_LOOKS } from '../shared/techniques/springtail-macro.js';
import { RippleField, Dimples, waterMaterial, waterGeometry, peatFloorTexture } from '../shared/techniques/springtail-surface.js';
import { buildWorld, inPool, poolE, mossTop, islandEdge, ISLANDS, POOL_GLSL, SHORE_GLSL, BANK_E, LANDMARK } from './world.js';
import { createLandmarkProps } from './landmarks.js';
import { createWolfSpider } from './boss.js';
import { createSpringtail } from './springtail.js';
import { createStenus, createStrider, createRain } from './enemies.js';
import { createHunger, createCapture, createFight } from '../shared/predation.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(10, 16 / 9, 4, 2600);
const macro = createMacro(renderer);

/** Delivered art, or null: ids may not exist in asset-list.js yet. */
function art(id, opts) {
  try { return loadTexture(id, opts).catch(() => null); } catch { return Promise.resolve(null); }
}

// ---------------------------------------------------------------- water
// The water is the ground everywhere: one wide sheet that follows the camera
// (fine cells close up, coarse to the horizon), with the ripple simulation an
// 84 mm window that scrolls with the springtail.
const field = new RippleField({ size: 84, n: 256, inside: inPool });
const dimples = new Dimples(96);
const floorTex = peatFloorTexture();
const waterMat = waterMaterial({ field, dimples, depthGlsl: POOL_GLSL, shoreGlsl: SHORE_GLSL, floorTex, floorScale: 1 / 22 });
const water = new THREE.Mesh(waterGeometry({ segs: 220, fine: 0.4, radius: 1100 }), waterMat);
water.frustumCulled = false;
scene.add(water);

const world = buildWorld();
scene.add(world.group);
let tail = createSpringtail();
scene.add(tail.group);
const tail0 = tail;
const stenus = createStenus(scene);
const strider = createStrider(scene);
const rain = createRain(scene);
const props = createLandmarkProps(world);
scene.add(props.group);
// The boss: a pond wolf spider on guard on the moss tongue (boss.js); it goes back under the bank (home) when worn down.
const boss = createWolfSpider(scene, { post: { x: LANDMARK.x - 5, z: 3, a: Math.PI }, home: { x: LANDMARK.x + 16, z: 5 } });

art('MP-S01').then((t) => { if (t) { waterMat.uniforms.uSurfTex.value = t; waterMat.uniforms.uHasSurfTex.value = 1; } });
art('MP-S02').then((t) => t && world.setMossTex(t));
art('MP-S03', { repeat: false }).then((t) => { if (t) { macroShared.uBackdrop.value = t; macroShared.uHasBackdrop.value = 1; } });
art('MP-S04', { repeat: false }).then((t) => t && world.sundews.setTexture(t));
art('MP-S05', { repeat: false }).then((t) => t && rain.setSprite(t));

// ---------------------------------------------------------------- player
const START = { x: -8, z: 2 };
let pl = {
  x: START.x, z: START.z, y: 0, vx: 0, vz: 0, heading: Math.PI / 2, mode: 'film',
  charge: 0, charging: false, cock: 1, hunker: 0, eatT: 0, flipT: 0, roll: 0, pitch: 0, bend: 0, furc: 0,
  air: null, leaf: null, struggle: 0, deadT: 0, cause: '', walk: 0, lives: 3, food: 0, moved: 0, landPulse: 0, onIsland: false,
  scale: 1, sy: 1, flailK: 0,
};
// Local multiplayer (shared/players.js): every player is a springtail of
// their own (this record is player 1's; others are made by makeRec). Code
// that acts on "the" player uses `pl` and `tail`, which point at the record
// being stepped (withRec), and at player 1 otherwise.
const PL_INIT = { ...pl };
const P1 = pl;
Object.assign(P1, { slot: 0, tail, ring: props.ring(PLAYER_COLORS[0]), color: PLAYER_COLORS[0] });
const pls = [P1];
const recs = () => pls.filter(Boolean);
const multi = () => recs().length > 1;
const alive = (P) => P.mode !== 'dead' && P.mode !== 'caught';
function withRec(P, fn) {
  const sp = pl, st = tail;
  pl = P; tail = P.tail;
  try { return fn(); } finally { pl = sp; tail = st; }
}
const GOAL = 8;
const game = { phase: 'title', t: 0, wonT: 0 };
const opt = { righting: true, slow: true, uPose: true, menisci: 1, rumble: true, autofocus: true, jumpFocus: true, dropShadow: true };

const joins = [];
const players = createPlayers({
  max: 4,
  onJoin: (p) => { joins.push({ slot: p.slot, padIndex: p.padIndex }); syncPlayers(); hud.toast(`Player ${p.slot + 1} joined`); embed.join(p.slot, p.color, p.name); },
  onLeave: (p) => { syncPlayers(); hud.toast(`Player ${p.slot + 1} left`); embed.leave(p.slot); },
  onChange: (list) => hud && hud.players(list),
});
const pad = players.pad(0);
const ctl = createControls(pad);
const hud = mountHud({
  title: 'Springtail · macro',
  sub: 'Level 0, a bog pool: the water springtail Podura aquatica, 1.5 mm long, lives on the surface film. Eat, dodge, and spring away with the furcula.',
  controls: hudControls({
    move: 'Walk on the film (slow, slippery)',
    camera: 'Orbit',
    dash: 'Furcula jump: hold to cock (hop to full), release; aim with LS. Released at an enemy in range: a pounce-bite',
    attack: 'Graze pollen, spores and algae; at a predator, rear up and nip it; in the air, a pounce-bite (dive and nip)',
    defend: 'Hold: hunker (defend). Facing a predator, it blocks the strike; waves cannot flip you',
    special: 'Camera: top-down / back to your low view',
    analog: 'Focus nearer / farther',
    secondary: 'Aperture wider / narrower',
    look: 'Look: low sun, overcast, stereo microscope',
    zoom: 'Magnification 1x, 2x, 3x, 5x',
    extra: [['LS click', 'Autofocus on the springtail']],
  }),
  note: `Goal: eat ${GOAL} clumps of food, then climb onto moss (an island or the bank). The scale bar is true at the focal plane. Jumps are shown slowed ~6x and half as long as life; ripples run ~5x slower (see Features).`,
});

// ---------------------------------------------------------------- overlay DOM
const css = document.createElement('style');
css.textContent = `
.st-bar { position: fixed; left: 14px; bottom: 14px; color: #f4f1ea; font: 12px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; text-shadow: 0 1px 2px #000a; pointer-events: none; }
.st-bar .rule { height: 5px; background: #f4f1ea; border: 1px solid #0006; margin-bottom: 4px; }
.st-status { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); background: rgba(10,12,16,.55); color: #eef1f4; padding: 6px 14px; border-radius: 999px; font: 600 13px system-ui, sans-serif; display: flex; gap: 14px; align-items: center; pointer-events: none; white-space: nowrap; }
.st-meter { width: 90px; height: 7px; background: #fff2; border-radius: 4px; overflow: hidden; }
.st-meter i { display: block; height: 100%; width: 0; background: #9fd0ff; }
.st-card { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; transition: opacity .6s; }
.st-card > div { max-width: min(460px, calc(100vw - 32px)); background: rgba(10,12,16,.72); backdrop-filter: blur(6px); color: #eef1f4; border-radius: 14px; padding: 16px 18px; font: 14px/1.45 system-ui, sans-serif; text-align: center; }
.st-card h2 { margin: 0 0 6px; font-size: 18px; } .st-card p { margin: 4px 0; color: #c5ccd3; } .st-card img { width: 100%; border-radius: 10px; margin-bottom: 8px; display: none; }
.st-card.hide { opacity: 0; }
.st-status .threat { font-weight: 500; color: #a9b2bc; } .st-status .threat.hot { color: #ffb38a; font-weight: 700; }
.st-status.caught { background: rgba(120,24,16,.72); }
.st-gauge { position: fixed; left: 50%; top: 14px; transform: translateX(-50%); display: none; align-items: center; gap: 10px; color: #e9d9a8; font: 600 11px/1 system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; text-shadow: 0 1px 2px #000a; pointer-events: none; z-index: 6; }
.st-gauge .g { width: 180px; height: 5px; border: 1px solid #b8913f; background: rgba(20,16,8,.45); border-radius: 3px; overflow: hidden; }
.st-gauge .g i { display: block; height: 100%; background: linear-gradient(90deg, #8a6a2c, #d8b268); transition: width .25s; }
`;
document.head.appendChild(css);
const bar = document.createElement('div');
bar.className = 'st-bar';
bar.innerHTML = '<div class="rule"></div><div class="lab"></div><div class="opt"></div>';
const status = document.createElement('div');
status.className = 'st-status';
status.innerHTML = '<span class="food"></span><span class="lives"></span><span class="furc">Furcula</span><span class="st-meter"><i></i></span><span class="threat"></span>';
const card = document.createElement('div');
card.className = 'st-card';
card.innerHTML = '<div><img alt=""><h2>Level 0 · Bog surface</h2><p>You are a water springtail, 1.5 mm long, standing on the surface film of a bog pool.</p><p>Graze the pollen, spores and algae floating on the water (X). Spring away with your furcula (hold and release A). Hunker (B) when ripples come.</p><p>Beware the rove beetle <i>Stenus</i> and its harpoon, the sundews\' glue, the water strider, and the rain.</p><p><b>Press A to start</b></p></div>';
// the boss's resolve: a quiet brass gauge, shown while it is engaged
const gauge = document.createElement('div');
gauge.className = 'st-gauge';
gauge.innerHTML = '<span class="nm">Pond wolf spider</span><span class="g"><i></i></span>';
document.body.append(bar, status, card, gauge);
art('MP-U05', { repeat: false }).then((t) => {
  if (!t || !t.image) return;
  const img = card.querySelector('img');
  img.src = t.image.currentSrc || t.image.src;
  img.style.display = 'block';
});
function showCard(title, lines) {
  card.querySelector('h2').textContent = title;
  card.querySelectorAll('p').forEach((p) => p.remove());
  for (const l of lines) { const p = document.createElement('p'); p.innerHTML = l; card.firstElementChild.appendChild(p); }
  card.classList.remove('hide');
}
// In the Micro Zoom game the shell has already shown the intro and the controls.
if (embed.active) card.classList.add('hide');

// ---------------------------------------------------------------- camera rig and optics
const ZOOMS = [1, 2, 3, 5];
const APERTURES = [2.8, 4, 5.6, 8, 11, 16, 22];
// Camera pitch: one wanted elevation (wantPitch, radians above the horizon)
// that RS always moves, in either view. Y jumps it to top-down and back to
// the low view you had. (It used to be two modes, and in top-down RS pitch
// was ignored, so the camera stuck overhead until Y was pressed again.)
const PITCH_MIN = 0.1, PITCH_MAX = 1.5, PITCH_TOP = 1.5, PITCH_LOW = 0.42;
const rig = { yaw: Math.PI, pitch: PITCH_LOW, wantPitch: PITCH_LOW, pitchLow: PITCH_LOW, get mode() { return this.wantPitch > 1.05 ? 'top' : 'low'; }, zi: 1, ai: 4, focusOff: 0, target: new THREE.Vector3(START.x, 0.25, START.z), look: 0, lens: null, dofK: 1, aim: null };
let lookDef = applyLook(0);
/** Where the jump being cocked, or the one in flight, will come down (x, y, z), or null. */
function landingPoint() {
  const P = pl;
  if (P.mode === 'air' && P.air) {
    const a = P.air;
    let gy = groundAt(P.x, P.z).y, t = 0;
    for (let k = 0; k < 3; k++) {
      // solve y + vy t - g t^2 / 2 = gy for the later root
      const disc = a.vy * a.vy + 2 * a.g * (P.y - gy);
      t = disc > 0 ? (a.vy + Math.sqrt(disc)) / a.g : 0;
      gy = groundAt(P.x + a.vx * t, P.z + a.vz * t).y;
    }
    const lx = P.x + a.vx * t, lz = P.z + a.vz * t;
    return { x: lx, y: gy, z: lz, inBank: poolE(lx, lz) > BANK_E };
  }
  if (P.charging && P.aim) {
    const p = 0.12 + 0.88 * P.charge;
    const R = 3 + 33 * p;
    const lx = P.x + P.aim.x * R, lz = P.z + P.aim.z * R;
    return { x: lx, y: groundAt(lx, lz).y, z: lz };
  }
  return null;
}
function placeCamera(dt) {
  // while a predator has you, the lens widens (or closes in) to frame you and
  // it together, and swings side-on to the catch
  const capOn = capture.active && cap.kind && cap.phase !== 'fadeIn' && !multi();
  // once it is eating, the lens pulls back and follows the predator with its meal
  const capFollow = capOn && cap.kind !== 'sundew' && ['eat', 'follow', 'fadeOut'].includes(cap.phase);
  // several players: frame the group (the split screen takes over when they part)
  const grp = recs().filter((P) => alive(P) && P.scale > 0.3);
  const mp = multi() && grp.length > 0;
  const gc = mp ? groupCentre(grp) : null;
  const base = 36 / ZOOMS[rig.zi];
  const hfwWant = capOn ? CAP_VIEW[cap.kind].hfw * (capFollow ? 1.7 : 1) : mp ? base * (1 + Math.min(0.5, (gc.spread / base) * 0.6)) : base;
  rig.hfw = rig.hfw === undefined || !dt ? hfwWant : rig.hfw + (hfwWant - rig.hfw) * (1 - Math.exp(-dt * 3));
  const L = (rig.lens = lens({ hfw: rig.hfw, N: APERTURES[rig.ai] }));
  const want = mp ? new THREE.Vector3(gc.x, gc.y + 0.25, gc.z) : new THREE.Vector3(pl.x, pl.y + 0.25, pl.z);
  // frame a little toward where a jump will land
  const land = opt.jumpFocus && !capOn && !mp ? landingPoint() : null;
  rig.aim = land;
  const frameAt = want.clone();
  let capSpan = 0;
  if (capOn) {
    const m = capMouth();
    if (cap.kind !== 'sundew') {
      capSpan = m.distanceTo(cap.mid.set(cap.x0, 0.25, cap.z0));
      // between you and the mouth, leaning toward the predator's body so its head and forebody are in frame
      if (capFollow) { frameAt.copy(m).lerp(capBody(), 0.55); capSpan = 3; }
      else frameAt.copy(m).add(cap.mid).multiplyScalar(0.5).lerp(capBody(), 0.3);
      const ax = Math.atan2(m.z - cap.z0, m.x - cap.x0);
      const side = Math.abs(wrapA(ax + Math.PI / 2 - rig.yaw)) < Math.abs(wrapA(ax - Math.PI / 2 - rig.yaw)) ? ax + Math.PI / 2 : ax - Math.PI / 2;
      rig.yaw += wrapA(side - rig.yaw) * (dt ? 1 - Math.exp(-dt * 2) : 1);
    } else frameAt.set(cap.x0, cap.y0 + 0.3, cap.z0);
  }
  // in a leap, frame low enough that the shadow below stays in the picture
  if (pl.mode === 'air' && !mp) { const gy = groundAt(pl.x, pl.z).y; frameAt.y = gy + 0.25 + (pl.y - gy) * 0.35; }
  if (land) frameAt.lerp(new THREE.Vector3(land.x, land.y + 0.25, land.z), 0.3);
  const k = dt ? 1 - Math.exp(-dt * (pl.mode === 'air' && !mp ? 3.5 : 6)) : 1;
  rig.target.lerp(frameAt, k);
  rig.wantPitch = THREE.MathUtils.clamp(rig.wantPitch, PITCH_MIN, PITCH_MAX);
  const pitchWant = capOn ? CAP_VIEW[cap.kind].pitch : rig.wantPitch;
  rig.pitch += (pitchWant - rig.pitch) * (dt ? 1 - Math.exp(-dt * (capOn ? 2.5 : 5)) : 1);
  const cp = Math.cos(rig.pitch);
  camera.position.set(rig.target.x + Math.cos(rig.yaw) * cp * L.s, rig.target.y + Math.sin(rig.pitch) * L.s, rig.target.z + Math.sin(rig.yaw) * cp * L.s);
  camera.up.set(0, 1, 0);
  if (rig.pitch > 1.45) camera.up.set(-Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  camera.lookAt(rig.target);
  camera.fov = L.vfov(camera.aspect);
  // the lens's working distance: nothing between it and ~35 mm before the subject
  camera.near = Math.max(2, L.s - 35);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  // the water sheet follows the camera's aim, snapped to whole ripple cells
  world.sky.position.copy(camera.position);
  water.position.set(Math.round(rig.target.x / field.dx) * field.dx, 0, Math.round(rig.target.z / field.dx) * field.dx);
  let focusD = opt.autofocus ? camera.position.distanceTo(capOn ? frameAt : want) : L.s;
  let wantK = 1;
  // keep both the predator and you sharp
  if (capOn) { focusD = camera.position.distanceTo(frameAt); wantK = THREE.MathUtils.clamp((capSpan + 1.5) / L.dof, 1, 14); }
  // a group in one view: deepen the focus (in effect) until every player is sharp
  if (mp && !capOn) {
    let far = 0;
    for (const P of grp) far = Math.max(far, Math.abs(camera.position.distanceTo(_v.set(P.x, P.y + 0.25, P.z)) - focusD));
    wantK = THREE.MathUtils.clamp((far + 0.6) / L.dof, 1, 14);
  }
  if (opt.autofocus && land) {
    // focus between the springtail and its landing spot, and stop down (in
    // effect) until both lie inside the depth of field
    const dT = camera.position.distanceTo(new THREE.Vector3(land.x, land.y + 0.1, land.z));
    focusD = (focusD + dT) / 2;
    wantK = THREE.MathUtils.clamp((Math.abs(dT - camera.position.distanceTo(want)) + 0.6) / L.dof, 1, 14);
  }
  rig.dofK += (wantK - rig.dofK) * (dt ? 1 - Math.exp(-dt * 6) : 1);
  rig.focusD = rig.focusD === undefined || !dt ? focusD : rig.focusD + (focusD - rig.focusD) * (1 - Math.exp(-dt * 8));
  macroShared.uFocus.value = rig.focusD + rig.focusOff;
  return L;
}

const _v = new THREE.Vector3();
/** Centre (x, y, z) of a group of players and its spread (largest distance from the centre, mm). */
function groupCentre(list) {
  let x = 0, y = 0, z = 0;
  for (const P of list) { x += P.x; y += P.y; z += P.z; }
  x /= list.length; y /= list.length; z /= list.length;
  let spread = 0;
  for (const P of list) spread = Math.max(spread, Math.hypot(P.x - x, P.z - z));
  return { x, y, z, spread };
}

// splitK: a split screen renders the macro chain once per view, so each view
// renders at a lower resolution (the views are smaller anyway)
let renderScale = 1, dynRes = true, slowEma = 16, scaleT = 0, splitK = 1;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(DPR * renderScale * splitK);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  macro.resize(v.x, v.y);
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- threats: pacing and being eaten
// shared/predation.js: a calm opening, then hunger that comes and goes. Only a
// hungry Stenus stalks and strikes, only a hungry strider answers ripples and
// grabs; a resting one patrols or rows about. Every catch plays out on screen
// (strike, hold, eat, then the Eaten card).
const pace = { grace: 45, mode: 'Comes and goes' };
const hunger = { stenus: createHunger({ grace: pace.grace }), strider: createHunger({ grace: pace.grace + 15 }) };
const isHungry = (h) => (pace.mode === 'Never' ? false : pace.mode === 'Always' ? h.state !== 'grace' : h.hungry);
function resetHunger() { hunger.stenus.reset(pace.grace); hunger.strider.reset(pace.grace + 15); }
const cap = { kind: null, x0: 0, y0: 0, z0: 0, h0: 0, leaf: null, phase: null, mid: new THREE.Vector3() };
// how close the lens frames each catch (field width, mm) and from how high
const CAP_VIEW = { boss: { hfw: 18, pitch: 0.5 }, stenus: { hfw: 12, pitch: 0.45 }, strider: { hfw: 16, pitch: 0.55 }, sundew: { hfw: 7, pitch: 0.75 } };
const CAP_TEXT = {
  boss: { by: 'The pond wolf spider', how: 'ran you down, sank its fangs in and ate you',
    phases: { strike: 'The wolf spider has you!', hold: 'Held in its fangs…', eat: 'The spider is eating you', follow: 'Eaten', fadeOut: 'Eaten', fadeIn: 'Back again' } },
  stenus: { by: 'Stenus', how: 'harpooned you with its sticky labium, reeled you in and ate you',
    phases: { strike: 'Harpooned by Stenus!', hold: 'Reeled in…', eat: 'Stenus is eating you', follow: 'Eaten', fadeOut: 'Eaten', fadeIn: 'Back again' } },
  strider: { by: 'The water strider', how: 'seized you in its forelegs and sucked you dry',
    phases: { strike: 'Grabbed by a strider!', hold: 'Lifted to its beak…', eat: 'Being sucked dry', follow: 'Eaten', fadeOut: 'Eaten', fadeIn: 'Back again' } },
  sundew: { by: 'The sundew', how: 'wrapped you in its tentacles and closed its leaf over you',
    phases: { strike: 'The tentacles close!', hold: 'Wrapped in glue…', eat: 'The leaf folds over you', follow: 'Digested', fadeOut: 'Digested', fadeIn: 'Back again' } },
};
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// A catch plays out (strike, hold, eat), the camera pulls back and follows the
// predator for a couple of seconds, a fade, and you are back: beside a
// teammate, or (alone) at your last safe spot.
const capture = createCapture({ onRespawn: () => afterCatch() });
function afterCatch() {
  const P = cap.who || P1;
  if (cap.leaf) { cap.leaf.target = null; cap.leaf.grip = 0; cap.leaf.close = 0; }
  if (cap.kind === 'stenus') stenus.release();
  if (cap.kind === 'strider') strider.release();
  if (cap.kind === 'boss') boss.release();
  if (multi()) respawnNear(P);
  else respawnSafe(P);
  cap.kind = null;
  // the camera starts over on you, under the fade
  if (P === P1 || multi()) { rig.hfw = undefined; rig.target.set(P.x, P.y + 0.25, P.z); }
}
/** Respawn alone: at the last safe spot (out of reach of both predators), or the start. */
function respawnSafe(P) {
  const at = P.safe && Math.hypot(P.safe.x - stenus.st.x, P.safe.z - stenus.st.z) > 12 ? P.safe : spotNear(START.x, START.z, 0);
  if (P.leaf) { P.leaf.target = null; P.leaf.grip = 0; P.leaf.close = 0; }
  resetBody(P, at.x, at.z);
  P.landPulse = 1;
}
// Fighting back (shared/predation.js createFight): facing a predator, blocking
// its strike (face it and hunker, B) and nipping it (X) wear its interest
// down; out of interest it retreats (and rests: hunger.missed()).
const fights = { stenus: createFight(), strider: createFight() };
const PRED = { stenus: () => stenus, strider: () => strider, boss: () => boss };
/** A bite on predator `kind` by player P (power 2: a pounce-bite counts double). */
function biteFoe(kind, P, power = 1, how = 'bite') {
  if (kind === 'boss') {
    const p = (boss.open ? 2 : 1) * power;
    const gone = boss.nipped(p, P.slot);
    hud.toast(gone ? 'The wolf spider has had enough: it backs off under the moss' : `${power > 1 ? 'Pounce-bite' : 'Nipped'}${boss.open ? ' an overreached tarsus' : ''}! The spider flinches`, 1600);
    return gone;
  }
  let gone = false;
  for (let i = 0; i < power && !gone; i++) gone = wearDown(kind, how);
  return gone;
}
/** Is P facing the predator at (x, z)? (heading within ~55°) */
const facingTo = (P, x, z) => Math.abs(wrapA(Math.atan2(z - P.z, x - P.x) - P.heading)) < 0.95;
const fightLog = { blocks: 0, bites: 0, retreats: 0 };
function wearDown(kind, how) {
  fightLog[how === 'bite' ? 'bites' : 'blocks']++;
  const gone = fights[kind].bitten();
  const pr = PRED[kind]();
  const name = kind === 'stenus' ? 'Stenus' : 'The strider';
  if (gone) {
    fightLog.retreats++;
    pr.retreat();
    hunger[kind].missed();
    hud.toast(`${name} has had enough: it ${kind === 'stenus' ? 'skims' : 'rows'} away`, 2200);
    fights[kind].reset();
  } else {
    pr.repel();
    hud.toast(how === 'bite' ? `Nipped ${kind === 'stenus' ? 'its tarsus' : 'a foreleg'}! ${name} staggers back` : `Blocked! ${name}'s strike glances off`, 1500);
  }
  return gone;
}
/** The predator's mouth (or the trapped spot on a sundew) for the camera. */
function capMouth() {
  if (cap.kind === 'boss') return boss.mouthPos();
  if (cap.kind === 'stenus') return stenus.mouthPos();
  if (cap.kind === 'strider') return strider.mouthPos();
  return new THREE.Vector3(cap.x0, cap.y0, cap.z0);
}
function capBody() {
  const s = cap.kind === 'boss' ? boss.st : cap.kind === 'stenus' ? stenus.st : strider.st;
  return new THREE.Vector3(s.x, 0.4, s.z);
}
/** A predator has you: control stops, and the whole catch is shown. */
function caught(kind) {
  if (capture.active || pl.mode === 'dead' || game.phase !== 'play') return;
  const P = pl;
  const solo = !multi();
  Object.assign(cap, { kind, who: P, x0: P.x, y0: P.y, z0: P.z, h0: P.heading, leaf: P.leaf, phase: null });
  P.mode = 'caught'; P.air = null; P.charging = false; P.charge = 0; P.vx = P.vz = 0; P.hunker = 0; P.eatT = 0; P.actT = 0; P.act = null;
  if (fights[kind]) fights[kind].reset();
  if (kind !== 'sundew') { P.pitch = 0; P.roll = 0; P.bend = 0; }
  if (hunger[kind]) hunger[kind].fed();
  const t = CAP_TEXT[kind];
  const left = !solo ? `. ${P === P1 ? 'You' : `Player ${P.slot + 1}`} will come back beside a teammate` : '';
  capture.start({ by: t.by, how: t.how + left });
  hud.toast(solo ? t.phases.strike : `Player ${P.slot + 1}: ${t.phases.strike}`, 1500);
  embed.captured({ by: kind, player: P.slot });
  rumbleFor(P, 450, 0.8, 1);
}
/** Pose the springtail and its captor for the current phase. */
function animateCapture(c, dt) {
  const P = pl;
  if (c.phase !== cap.phase) {
    cap.phase = c.phase;
    if (c.phase === 'hold') { rumble(300, 0.5, 0.7); if (cap.kind === 'strider') audio.play('springtail/raindrop', { volume: 0.25, rate: 1.8 }); }
    if (c.phase === 'eat') { audio.play('springtail/eat', { volume: 1, rate: cap.kind === 'stenus' ? 0.7 : 0.55 }); rumble(600, 0.6, 0.3); }
    if (c.phase === 'follow') audio.play('springtail/eat', { volume: 0.7, rate: 0.5 });
  }
  if (c.phase === 'fadeIn') return; // already back (afterCatch)
  const phase = c.phase === 'fadeOut' ? 'follow' : c.phase;
  // the mandibles' rhythm, heard while eating
  if (c.phase === 'eat' && cap.kind === 'stenus' && Math.floor(simT * 2.4) !== Math.floor((simT - dt) * 2.4)) audio.play('springtail/eat', { volume: 0.5, rate: 0.8 + Math.random() * 0.2 });
  let o;
  if (cap.kind === 'boss') o = boss.captureStep(phase, c.t, dt, cap);
  else if (cap.kind === 'stenus') o = stenus.captureStep(phase, c.t, dt, cap);
  else if (cap.kind === 'strider') o = strider.captureStep(phase, c.t, dt, cap);
  else o = sundewStep(phase, c.t, dt);
  P.x = o.x; P.y = o.y; P.z = o.z; P.heading = o.heading; P.pitch = o.pitch; P.roll = o.roll;
  P.scale = o.scale; P.sy = o.sy ?? 1; P.flailK = o.flail;
}
/** The sundew's catch: tentacles fold over you, the glue holds, the blade cups and closes. */
function sundewStep(phase, u, dt) {
  const leaf = cap.leaf, ease = (x) => x * x * (3 - 2 * x);
  const out = { x: cap.x0, y: cap.y0, z: cap.z0, heading: cap.h0 + Math.sin(simT * 9) * 0.15, pitch: 0, roll: 0, scale: 1, flail: 1 };
  if (!leaf) return out;
  if (phase === 'strike') { leaf.grip = ease(u); leaf.close = 0; out.roll = Math.sin(simT * 16) * 0.3; }
  else if (phase === 'hold') { leaf.grip = 1; leaf.close = 0.25 * ease(u); out.flail = 1 - 0.5 * u; out.roll = Math.sin(simT * 12) * 0.25 * (1 - u); out.y -= 0.06 * u; }
  else if (phase === 'eat') {
    const e = ease(u);
    leaf.grip = 1; leaf.close = 0.25 + 0.75 * e;
    out.flail = 0.5 * (1 - u); out.scale = 1 - 0.6 * e; out.y -= 0.06 + 0.12 * e;
  } else { leaf.grip = 1; leaf.close = 1; out.scale = 0; out.flail = 0; }
  leaf.target = new THREE.Vector3(out.x, out.y + 0.15 * out.scale, out.z);
  return out;
}

// ---------------------------------------------------------------- features
const features = createFeatures({ key: 'springtail', pad });
const F = (o) => features.add(o);
const audio = createAudio(['springtail/amb-bog', 'springtail/jump', 'springtail/land-water', 'springtail/land-sticky', 'springtail/eat', 'springtail/raindrop', 'springtail/stenus-skim', 'springtail/stenus-strike']);
audio.addToFeatures(features);
audio.loop('springtail/amb-bog', { volume: 0.6 });
/** Gamepads fire no DOM events: unlock sound on any pad button. */
function unlockOnPad() {
  for (const p of players.active) {
    const pp = players.pad(p.slot);
    if (pp.kind !== 'controller' && p.slot === 0) continue;
    for (let b = 0; b < 16; b++) if (pp.value(b) > 0.5) { audio.unlock(); return; }
  }
}
F({ id: 'dof', group: 'Rendering', label: 'Depth of field (bokeh gather)', on: true,
  about: 'Every surface writes its distance from the focal plane into the alpha of a half-float target. A half-res pass turns that into a signed blur-disc size (thin-lens CoC), 8x8 tiles record the largest foreground blur, and a 64-tap golden-spiral gather spreads each tap only as far as its own disc reaches (taps behind the centre are clamped to its blur, so sharp edges never smear backward). shared/techniques/springtail-macro.js.',
  onChange: (v) => (macro.options.dof = v) });
F({ id: 'rim', group: 'Rendering', label: 'Bright-rimmed bokeh discs', on: true,
  about: 'Taps near the edge of a blur disc are weighted up, like the onion-ring bokeh of real macro lenses with aspherical elements. Sun glints on the water bloom into discs.', onChange: (v) => (macro.options.rim = v ? 0.35 : 0) });
F({ id: 'caustics', group: 'Rendering', label: 'Caustics and dimple shadows on the pool floor', on: true,
  about: 'The floor under the refracted view ray is lit through the surface above it (offset toward the sun); its brightness is 1 / (1 + depth x curvature / 4), so ripples focus light into bright bands and each dimple throws a dark spot with a bright rim, like a water strider\'s famous shadows.',
  onChange: (v) => (waterMat.uniforms.uCaustics.value = v ? 1 : 0) });
F({ id: 'refraction', group: 'Rendering', label: 'Water film shading', fixed: true,
  about: 'Fresnel mix of a reflected sky-and-bog environment and the refracted pool floor (Snell, n = 1.333) through tea-coloured, humic bog water (Beer-Lambert absorption, red passes, blue is lost); a tiny sun disc gives the specular glints. The refracted floor writes its apparent depth so the lens blurs it as a camera would.' });
F({ id: 'velvet', group: 'Rendering', label: 'Velvety cuticle', fixed: true,
  about: 'Slate blue-black dorsum, reddish-brown venter and legs, fine granules as noise bump with frosty specks, a blue-grey sheen at grazing angles, dark furrows where two body rings meet (from the sdf.js part weights), glossy black eye patches. Checked against photographs of Podura.' });
F({ id: 'grain', group: 'Rendering', label: 'Sensor grain', on: true, about: 'A faint per-frame noise, like a high-ISO macro shot.', onChange: (v) => (macro.options.grain = v ? 0.012 : 0) });
F({ id: 'dynres', group: 'Rendering', label: 'Dynamic resolution', on: true,
  about: 'Drops the render resolution while frames are slow, climbs back when they are fast.', onChange: (v) => { dynRes = v; if (!v && renderScale !== 1) { renderScale = 1; resize(); } } });
F({ id: 'look', group: 'Optics', label: 'Look (D-pad left/right)', choices: MACRO_LOOKS.map((l) => l.name), value: MACRO_LOOKS[0].name,
  about: 'Low sun: daylight with glints and backlit moss. Overcast: soft sky light, no glints. Stereo microscope: a ring light round the objective, a round field stop, and ~4x the depth of field (stereo microscopes work at low aperture).',
  onChange: (v) => { rig.look = MACRO_LOOKS.findIndex((l) => l.name === v); lookDef = applyLook(rig.look); } });
F({ id: 'thinlens', group: 'Optics', label: 'Thin-lens macro camera', fixed: true,
  about: 'A 100 mm macro lens on a 36 mm sensor: magnification m = 36 / field width, subject distance f(1 + 1/m), field of view from the field width, effective aperture N(1 + m), total depth of field 2Nc(1 + m)/m^2 (c = 0.03 mm). At 2x and f/11 that is about 0.5 mm: the springtail is barely in focus end to end.' });
F({ id: 'autofocus', group: 'Optics', label: 'Autofocus on the springtail', on: true,
  about: 'The focal plane follows the springtail; LT/RT offset it. Off: focus stays at the lens\'s set distance from the orbit centre.', onChange: (v) => (opt.autofocus = v) });
F({ id: 'jumpFocus', group: 'Optics', label: 'Focus follows the jump', on: true,
  about: 'While you cock a jump and while you are in the air, the lens racks focus to between you and where you will land, deepens the depth of field until both are acceptably sharp, and the framing leans toward the landing. No marker: the landing spot comes into focus.',
  onChange: (v) => (opt.jumpFocus = v) });
F({ id: 'dropShadow', group: 'Rendering', label: 'Drop shadow under the springtail', on: true,
  about: 'A soft shadow straight below you on whatever is there (water film, moss, a sundew leaf, debris): a contact shadow when you stand, and in a leap it shows your height and the spot you will land on. Not optics but a game cue, alongside the true sun-cast shadow on the pool floor.',
  onChange: (v) => (opt.dropShadow = v) });
F({ id: 'sheen', group: 'Rendering', label: 'Legible water film', on: true,
  about: 'A boosted Fresnel sky sheen and a broad sun lobe so the film reads as a glossy sheet over the darker tea-coloured depths, a raised meniscus with a bright line and a wet dark band where the water meets an island or the bank, and a rising meniscus round each floating piece of debris.',
  onChange: (v) => { waterMat.uniforms.uSheen.value = v ? 1 : 0; waterMat.uniforms.uMeniscus.value = v ? 0.18 : 0; } });
F({ id: 'ripples', group: 'Simulation', label: 'Ripple height field', on: true,
  about: 'A 256 x 256 damped wave equation over 84 mm (0.33 mm cells), stepped 240 times a second on the CPU. Raindrops, landings, striders\' strokes and walking beetles push it. Ripples run at ~43 mm/s, ~5x slower than real millimetre capillary waves (~0.23 m/s minimum), so you can see and dodge them. shared/techniques/springtail-surface.js.',
  onChange: (v) => { field.enabled = v; if (!v) field.clear(); } });
F({ id: 'marangoni', group: 'Simulation', label: 'Marangoni surfactant', on: true,
  about: 'A second field: Stenus\'s secretion spreads (diffusion), decays, damps capillary waves under it and drives a surface flow down its gradient, which shoves floating food (and you) away from the beetle\'s wake.',
  onChange: (v) => (field.surfDecay = v ? 0.25 : 50) });
F({ id: 'showSurf', group: 'Simulation', label: 'Show the surfactant', on: false,
  about: 'Tints the film yellow where the surfactant lies (it is invisible in life: you would only see the calmed water).', onChange: (v) => (waterMat.uniforms.uShowSurf.value = v ? 1 : 0) });
F({ id: 'menisci', group: 'Simulation', label: 'Meniscus depth', choices: ['Exaggerated ~3x (game)', 'Life-like'], value: 'Exaggerated ~3x (game)',
  about: 'Analytic dimples where claws, the ventral tube, floating grains and the strider\'s legs press the film: a logarithmic profile, like the K0 meniscus of a small load, fading to flat a few contact radii out.',
  onChange: (v) => (dimples.scale = v.startsWith('Ex') ? 1 : 0.35) });
F({ id: 'righting', group: 'Simulation', label: 'Landing odds', choices: ['Real (85% upright)', 'Always upright'], value: 'Real (85% upright)',
  about: 'Semiaquatic springtails land on their ventral side 85% of the time (Ortega-Jimenez et al. 2022); otherwise you land on your back and must right yourself (tap A).', onChange: (v) => (opt.righting = v.startsWith('Real')) });
F({ id: 'slow', group: 'Simulation', label: 'Jump time', choices: ['Slowed ~6x (playable)', 'Real time'], value: 'Slowed ~6x (playable)',
  about: 'A real full jump off water lasts ~0.1-0.2 s at ~0.7 m/s take-off. Slowed, a full jump takes 0.85 s, so you can see the tumble, the U-pose and the landing.', onChange: (v) => (opt.slow = v.startsWith('Slow')) });
F({ id: 'pounce', group: 'Simulation', label: 'Pounce-bite (a departure)', fixed: true,
  about: 'X in the air, or a jump released at an enemy in range: the springtail tucks into a dive onto the nearest leg or body under its arc (aim assist), nips on impact (worth two nips: a stagger, a splash, a rumble, a brief hit-pause), then rebounds off it; a mistimed dive is a clear miss. Landing on food takes a whole bite. A labelled departure: Podura grazes, and its furcula jump is an escape (a few springtails such as Friesea prey on tiny animals, never by leaping).' });
F({ id: 'boss', group: 'World', label: 'Boss: pond wolf spider (Pirata)', fixed: true,
  about: 'A juvenile, ~5 mm (scaled down from adults so the arena fits), on guard on the moss tongue at the way on. Dormant until you come within 30 mm after the calm opening. Its tells: it crouches and raises its first two pairs of legs before a lunge, and turns to pounce on your landing ripples. Jump clear (a dodge wears it down), then nip or pounce on an overreached tarsus (double). About three good rounds and it backs off under the moss, leaving the bank open. Its resolve is the brass gauge. Catches follow the follow-and-respawn sequence.' });
F({ id: 'upose', group: 'Body', label: 'Mid-air U-pose righting', on: true,
  about: 'Right after take-off the body tumbles; within ~20 ms (here ~0.15 s) it curls head and tail up into a U, which aerodynamically turns the ventral tube downward. Off: it tumbles all the way and lands upright half the time.', onChange: (v) => (opt.uPose = v) });
F({ id: 'sdf', group: 'Body', label: 'Anatomy from SDF parts', fixed: true,
  about: 'Head with eye patches and mouth cone, 4-segment antennae, pronotum, two thoracic and six abdominal rings, three pairs of short legs, the collophore on Abd I, the retinaculum on Abd III and the furcula on Abd IV (a separate mesh that swings down and back ~160 degrees). Meshed with surface nets (shared/sdf.js), 26-bone part rig in the vertex shader.' });
F({ id: 'stenus', group: 'World', label: 'Rove beetle (Stenus)', on: true, onChange: (v) => { stenus.st.enabled = v; stenus.setVisible(v); } ,
  about: 'Patrols, stalks what moves, skims at you on its surfactant, lowers its head (the wind-up) and shoots its sticky labium ~2 mm.' });
F({ id: 'strider', group: 'World', label: 'Water strider (Gerris)', on: true, onChange: (v) => { strider.st.enabled = v; strider.setVisible(v); },
  about: 'Hears ripples: landings, grazing and struggling bring it rowing over; its strokes send waves that flip an unbraced springtail; its forelegs grab.' });
F({ id: 'rain', group: 'World', label: 'Rain', choices: ['Sometimes', 'Often', 'Off'], value: 'Sometimes',
  about: 'A drop ~3 mm across (twice your length) is telegraphed by its shadow, falls, craters the film and rings it.', onChange: (v) => { rain.enabled = v !== 'Off'; rain.every = v === 'Often' ? 3.5 : 7; } });
F({ id: 'grace', group: 'World', label: 'Calm opening', choices: ['45 s', '20 s', '90 s', 'Off'], value: '45 s',
  about: 'How long after a start (and after each life) before Stenus or the strider (15 s later) gets hungry. They patrol and row about meanwhile, keeping to the water away from you, and raindrops land around you rather than on you. shared/predation.js.',
  onChange: (v) => { pace.grace = v === 'Off' ? 0 : parseFloat(v); resetHunger(); } });
F({ id: 'hunger', group: 'World', label: 'Predator hunger', choices: ['Comes and goes', 'Always', 'Never'], value: 'Comes and goes',
  about: 'Comes and goes: after the calm opening each predator is hungry for ~18-32 s, then rests (45-75 s after a meal, 15-30 s after a miss or when it loses you); only a hungry one stalks, skims, strikes, answers ripples or grabs. Always: hungry from the end of the calm opening on. Never: they patrol and never hunt (for exploring and testing).',
  onChange: (v) => (pace.mode = v) });
addInvertY(features);
F({ id: 'camrel', group: 'Controls', label: 'Camera-relative walking and aiming', fixed: true, about: 'LS walks and aims relative to the view, in both camera modes.' });
F({ id: 'rumble', group: 'Controls', label: 'Rumble', on: true, about: 'A kick when the furcula fires, a tap on landing, a thump for raindrops and being caught.', onChange: (v) => (opt.rumble = v) });
const rumbleFor = (P, ms, a, b) => opt.rumble && players.pad(P.slot || 0).rumble(ms, a, b);
const rumble = (ms, a, b) => rumbleFor(pl, ms, a, b);

// ---------------------------------------------------------------- gameplay
const ripples = [];
const casters = macroShared.uCasters.value, casterK = macroShared.uCasterK.value;
const headPos = () => new THREE.Vector3(pl.x + Math.cos(pl.heading) * 0.68, pl.y, pl.z + Math.sin(pl.heading) * 0.68);
/** What lies under (x, z): moss (an island or the bank), a floating piece of debris, or the water film. */
const groundAt = (x, z) => {
  const m = mossTop(x, z);
  if (m > -Infinity) return { y: m, kind: 'moss' };
  const d = world.debris.at(x, z);
  if (d) return { y: d.top, kind: 'debris', piece: d };
  return { y: field.height(x, z), kind: 'film' };
};
/** The player mode for standing on a ground kind: debris is solid footing, like moss. */
const modeFor = (kind) => (kind === 'film' ? 'film' : 'moss');

function jump(dirX, dirZ, power, { thrown = false } = {}) {
  const p = Math.max(0.12, Math.min(1, power));
  const R = 3 + 33 * p; // mm (real full jump ~48 body lengths)
  const H = R * 0.3 + 0.6;
  let T = 0.32 + 0.53 * Math.sqrt(p);
  if (!opt.slow) T *= 0.17;
  const n = Math.hypot(dirX, dirZ) || 1;
  pl.air = { t: 0, T, vx: (dirX / n) * (R / T), vz: (dirZ / n) * (R / T), vy: (4 * H) / T, g: (8 * H) / (T * T), upright: thrown ? Math.random() < 0.5 : (!opt.righting || Math.random() < 0.85), uPose: opt.uPose, thrown, spin: 1 + Math.random() * 0.6 };
  if (!opt.uPose) pl.air.upright = Math.random() < 0.5;
  if (pl.mode === 'flipped') pl.air.upright = true;
  pl.heading = Math.atan2(dirZ, dirX);
  pl.mode = 'air';
  pl.cock = 0;
  pl.furc = 1;
  pl.flipT = 0;
  if (inPool(pl.x, pl.z) && pl.y < 0.5 && !world.debris.at(pl.x, pl.z)) {
    // the furcula's strike pushes the film down; the collophore lets go
    field.drop(pl.x - (dirX / n) * 0.6, pl.z - (dirZ / n) * 0.6, 0.4, -0.05 - 0.08 * p);
    ripples.push({ x: pl.x, z: pl.z, strength: 0.5 + 0.4 * p });
  }
  if (!thrown) { rumble(120, 0.25 + 0.4 * p, 0.2 + 0.5 * p); audio.play('springtail/jump', { volume: 0.5 + 0.5 * p, rate: 1.1 - 0.2 * p + Math.random() * 0.06 }); }
}

// ---------------------------------------------------------------- the pounce-bite
// A labelled departure: Podura's furcula jump is an escape (it grazes; a few
// springtails such as Friesea prey on tiny animals, never by leaping). Here a
// jump can end in a dive onto an enemy's leg or body, nipping on impact.
let hitPause = 0;
/** The best thing to pounce on from (x, z) along (dx, dz) within `range`: enemies first, then food. */
function pounceTarget(x, z, dx, dz, range, cone = 0.6, enemiesOnly = false) {
  let best = null, bs = Infinity;
  const consider = (px, pz, kind, foe, food) => {
    const vx = px - x, vz = pz - z, d = Math.hypot(vx, vz);
    if (d > range || d < 0.5) return;
    const off = Math.abs(wrapA(Math.atan2(vz, vx) - Math.atan2(dz, dx)));
    if (off > cone) return;
    const score = d * (1 + off * 2) * (foe ? 1 : 2.5);
    if (score < bs) { bs = score; best = { x: px, z: pz, kind, foe, food }; }
  };
  for (const k of ['stenus', 'strider', 'boss']) {
    const pr = PRED[k]();
    if (!pr.group.visible || pr.st.state === 'capture') continue;
    for (const [px, pz] of pr.nipPoints()) consider(px, pz, 'leg', k);
    if (pr.bodyPoints) for (const [px, pz] of pr.bodyPoints()) consider(px, pz, 'body', k);
  }
  if (!enemiesOnly) for (const c of world.food.clumps) if (c.bites > 0 && !(c.respawnT > 0)) consider(c.x, c.z, 'food', null, c);
  return best;
}
/** Start the dive: with a target in reach of the arc (aim assist), straight onto it; else straight down (a clear miss). */
function startDive(P, a, forced = null) {
  // where the jump would come down, then look for a target around there
  const land = landingPoint() || { x: P.x, z: P.z };
  const dx = land.x - P.x, dz = land.z - P.z;
  const reach = Math.hypot(dx, dz) + 7;
  const t = forced || pounceTarget(P.x, P.z, dx || Math.cos(P.heading), dz || Math.sin(P.heading), reach, 0.9);
  const tx = t ? t.x : land.x, tz = t ? t.z : land.z;
  const ty = groundAt(tx, tz).y;
  const T = Math.max(0.14, Math.min(0.32, Math.hypot(tx - P.x, tz - P.z) / 40 + 0.08));
  a.dive = { t: 0, T, x0: P.x, z0: P.z, y0: P.y, tx, tz, ty, target: t };
  if (P.slot === 0 || multi()) rumble(80, 0.2, 0.2);
}
function diveImpact(P, a) {
  const t = a.dive.target;
  P.air = null; P.y = groundAt(P.x, P.z).y; P.pitch = 0; P.bend = 0;
  P.sy = 0.55; // squash on impact
  P.landPulse = 1;
  P.lastImpact = { t: simT, hit: false, kind: t ? t.kind : null };
  const inPoolHere = inPool(P.x, P.z);
  if (t && t.foe) {
    const pr = PRED[t.foe]();
    const still = (pr.nipPoints().concat(pr.bodyPoints ? pr.bodyPoints() : [])).some(([x, z]) => Math.hypot(x - P.x, z - P.z) < 1.6);
    if (still && pr.st.state !== 'capture') {
      P.lastImpact.hit = true;
      P.pounces = (P.pounces || 0) + 1;
      hitPause = 0.12;
      rumble(260, 0.9, 0.7);
      audio.play('springtail/eat', { volume: 1, rate: 1.2 });
      if (inPoolHere) { field.drop(P.x, P.z, 1.2, -0.14); ripples.push({ x: P.x, z: P.z, strength: 1.2 }); }
      biteFoe(t.foe, P, 2, 'bite');
      // rebound off it
      const ax = P.x - (t.x), az = P.z - (t.z);
      P.mode = 'film';
      jump(ax || -Math.cos(P.heading), az || -Math.sin(P.heading), 0.22);
      if (P.air) P.air.upright = true;
      hud.toast(`Pounce-bite on ${t.foe === 'boss' ? 'the wolf spider' : t.foe === 'stenus' ? 'Stenus' : 'the strider'}!`, 1200);
      return;
    }
  }
  if (t && t.food && t.food.bites > 0 && Math.hypot(t.food.x - P.x, t.food.z - P.z) < 1.4) {
    // landing on food: a whole bite at once
    P.lastImpact.hit = true;
    hitPause = 0.06;
    const c = t.food;
    c.bites--; c.chew = 0;
    audio.play('springtail/eat', { volume: 0.9, rate: 1.05 });
    rumble(90, 0.3, 0.2);
    if (c.bites <= 0) { P.food++; c.respawnT = 6; hud.toast(`Pounced on ${c.type.name} (${P.food}/${GOAL})`); }
  } else if (!(t && t.food)) {
    // a clear miss: a splash, a stagger
    hud.toast('Missed!', 900);
    P.vx = Math.cos(P.heading) * 2; P.vz = Math.sin(P.heading) * 2;
  }
  if (inPoolHere) { field.drop(P.x, P.z, 0.7, -0.08); ripples.push({ x: P.x, z: P.z, strength: 1 }); }
  audio.play('springtail/land-water', { volume: 0.9, rate: 0.85 });
  P.mode = modeFor(groundAt(P.x, P.z).kind);
  P.landT = simT;
}

function die(cause) {
  if (pl.mode === 'dead' || game.phase !== 'play') return;
  pl.mode = 'dead';
  pl.deadT = 0;
  pl.cause = cause;
  rumbleFor(pl, 450, 0.8, 1);
  hud.toast(cause, 2400);
}

/** Put a springtail down, fresh, at (x, z). */
function resetBody(P, x, z) {
  P.x = x; P.z = z; P.vx = P.vz = 0; P.mode = 'film'; P.air = null; P.cock = 1; P.roll = 0; P.pitch = 0; P.charging = false; P.charge = 0;
  P.bend = 0; P.furc = 0; P.leaf = null; P.struggle = 0; P.scale = 1; P.sy = 1; P.flailK = 0; P.heading = Math.PI / 2; P.hunker = 0; P.eatT = 0; P.deadT = 0;
  P.act = null; P.actT = 0; P.eatFood = null;
  const g = groundAt(x, z);
  P.y = g.y; P.mode = modeFor(g.kind);
}
/** A free spot on the film about `r` mm from (x, z) (or moss when nothing else). */
function spotNear(x, z, r = 3) {
  for (let k = 0; k < 24; k++) {
    const a = k * 2.39996, rr = r + k * 0.4;
    const cx = x + Math.cos(a) * rr, cz = z + Math.sin(a) * rr;
    if (poolE(cx, cz) < 0.97 && !world.sundews.leafAt(cx, 0.1, cz)) return { x: cx, z: cz };
  }
  return { x, z };
}
/** Multiplayer: a player who was eaten (or swamped) comes back beside a teammate. */
function respawnNear(P) {
  const mates = recs().filter((q) => q !== P && alive(q));
  const m = mates.length ? mates[0] : null;
  const at = m ? spotNear(m.x, m.z, 3) : spotNear(START.x, START.z, 0);
  if (P.leaf) { P.leaf.target = null; P.leaf.grip = 0; P.leaf.close = 0; }
  resetBody(P, at.x, at.z);
  P.landPulse = 1;
}
function respawn() {
  resetBody(pl, START.x, START.z);
  for (const l of world.sundews.leaves) { l.target = null; l.grip = 0; l.close = 0; }
  capture.reset();
  cap.kind = null;
  stenus.reset();
  strider.reset();
  boss.reset();
  placeThreatsAway();
  rain.clear();
  resetHunger();
}
/** Start the beetle and the strider well away from you, out on open water. */
function placeThreatsAway() {
  for (let k = 0; k < 30; k++) {
    const c = nearbyWater(pl.x, pl.z, 34 + k, 0.8);
    if (!c) continue;
    const s = stenus.startFor(c.x, c.z);
    if (Math.hypot(s.x - pl.x, s.z - pl.z) > 30 && inPool(s.x, s.z)) { stenus.relocate(c.x, c.z); break; }
  }
  for (let k = 0; k < 30; k++) {
    const c = nearbyWater(pl.x, pl.z, 38 + k, 0.85);
    if (c && Math.hypot(c.x - stenus.st.x, c.z - stenus.st.z) > 20) { strider.relocate(c.x, c.z); break; }
  }
}

function newGame() {
  pl.lives = 3; pl.food = 0;
  respawn();
  // everyone else starts beside player 1
  recs().forEach((P, i) => { if (P !== pl) { const at = spotNear(pl.x, pl.z, 2.5 + i); resetBody(P, at.x, at.z); P.food = 0; } });
  game.phase = 'play';
  card.classList.add('hide');
}

function landAt(g) {
  const a = pl.air;
  pl.air = null;
  pl.y = g.y;
  pl.vx = a.vx * 0.04; pl.vz = a.vz * 0.04;
  pl.landPulse = 1;
  pl.landT = simT;
  const leaf = world.sundews.leafAt(pl.x, pl.y, pl.z);
  if (leaf && g.kind !== 'moss') return;
  if (!a.upright) { pl.mode = 'flipped'; pl.flipT = 0; pl.roll = Math.PI; rumble(160, 0.4, 0.3); hud.toast('Landed on your back: tap A to flick upright', 1600); }
  else pl.mode = modeFor(g.kind);
  if (g.kind === 'film') {
    audio.play('springtail/land-water', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
    // adhesive landing: the wet collophore grabs the film, no bounce
    field.drop(pl.x, pl.z, 0.45, -0.07);
    ripples.push({ x: pl.x, z: pl.z, strength: 1 });
  } else audio.play('springtail/land-water', { volume: 0.3, rate: 1.35 + Math.random() * 0.1 });
  rumble(60, 0.2, 0.05);
}

function stepPlayer(dt, inp) {
  const P = pl;
  P.cock = Math.min(1, P.cock + (P.mode === 'air' ? 0 : dt / 0.9));
  P.furc += ((P.mode === 'air' ? (P.air && P.air.t / P.air.T > 0.55 ? 0.6 : 1) : P.cock < 1 ? 1 - P.cock : 0) - P.furc) * Math.min(1, dt * (P.mode === 'air' ? 30 : 6));
  P.landPulse = Math.max(0, P.landPulse - dt * 2.5);
  P.eatT = Math.max(0, P.eatT - dt);
  const camF = new THREE.Vector3(-Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  const camR = new THREE.Vector3(-camF.z, 0, camF.x);
  const dir = camF.clone().multiplyScalar(-inp.move.y).addScaledVector(camR, inp.move.x);
  const mag = Math.min(1, inp.move.m);
  if (dir.lengthSq() > 0) dir.normalize();
  P.moved = Math.max(0, P.moved - dt);

  if (P.mode === 'caught') return; // posed by animateCapture
  if (P.mode === 'dead') {
    P.deadT += dt;
    if (P.deadT > 2.4) {
      if (multi()) respawnNear(P);
      else respawnSafe(P);
    }
    return;
  }

  if (P.mode === 'air') {
    const a = P.air;
    // X in the air: the pounce-bite (a dive onto the nearest enemy or food under the arc)
    if (inp.attackPressed && !a.dive && !a.thrown) startDive(P, a);
    if (a.dive) {
      a.dive.t += dt;
      const k = Math.min(1, a.dive.t / a.dive.T);
      P.x = a.dive.x0 + (a.dive.tx - a.dive.x0) * k; P.z = a.dive.z0 + (a.dive.tz - a.dive.z0) * k;
      P.y = a.dive.y0 + (a.dive.ty - a.dive.y0) * k * k;
      // tucked, nose down, into the dive
      P.pitch = -0.9 * Math.min(1, k * 3); P.bend = -0.4; P.roll = 0;
      if (k >= 1) diveImpact(P, a);
      return;
    }
    a.t += dt;
    const u = a.t / a.T;
    P.x += a.vx * dt; P.z += a.vz * dt;
    a.vy -= a.g * dt;
    P.y += a.vy * dt;
    // a jump released at an enemy in range turns into a pounce-bite as it comes down
    if (a.pounce && u > 0.55 && !a.dive) { startDive(P, a, a.pounce); if (a.dive) return; }
    // tumble backward off the furcula, then the U-pose turns the venter down
    const tumble = Math.min(1, u / 0.18);
    if (a.uPose) {
      const right = Math.min(1, Math.max(0, (u - 0.12) / 0.2));
      const spin = -Math.PI * 2 * a.spin * tumble;
      const end = a.upright ? -Math.PI * 2 * Math.round(a.spin) : -Math.PI * 2 * Math.round(a.spin) - Math.PI;
      P.pitch = spin + (end - spin) * right * right * (3 - 2 * right);
      P.bend = Math.min(1, Math.max(0, (u - 0.1) / 0.12)) * (1 - Math.max(0, (u - 0.85) / 0.15));
    } else {
      P.pitch = -Math.PI * 2 * a.spin * u * 2 + (a.upright ? 0 : 0);
      P.bend = 0;
    }
    if (u > 0.5) {
      // descending: check what we come down on
      const leaf = world.sundews.leafAt(P.x, P.y, P.z);
      if (leaf && P.y <= leaf.y + 0.15 && a.vy < 0) {
        P.air = null; P.mode = 'stuck'; P.leaf = leaf; P.y = leaf.y + 0.12; P.struggle = 0; P.pitch = 0; P.roll = 0; P.bend = 0;
        leaf.target = new THREE.Vector3(P.x, P.y + 0.2, P.z);
        hud.toast('Stuck in sundew glue! Mash A to tear free', 2000);
        audio.play('springtail/land-sticky');
        rumble(200, 0.5, 0.4);
        ripples.push({ x: P.x, z: P.z, strength: 0.3 });
        return;
      }
      const g = groundAt(P.x, P.z);
      if (P.y <= g.y && a.vy < 0) {
        if (!a.upright) P.pitch = Math.PI; else P.pitch = 0;
        P.bend = 0;
        landAt(g);
      }
    }
    // the bank is a steep wall of moss: hit it and drop back to the water at its foot
    if (poolE(P.x, P.z) > BANK_E) {
      const nx = P.x / Math.hypot(P.x, P.z), nz = P.z / Math.hypot(P.x, P.z);
      P.x -= nx * 0.3; P.z -= nz * 0.3;
      a.vx = -nx * 1.5; a.vz = -nz * 1.5;
    }
    return;
  }

  if (P.mode === 'stuck') {
    P.vx = P.vz = 0;
    if (inp.dashPressed) { P.struggle += 0.16; rumble(40, 0.3, 0.1); ripples.push({ x: P.x, z: P.z, strength: 0.4 }); }
    P.struggle = Math.max(0, P.struggle - dt * 0.12);
    P.leaf.target.set(P.x, P.y + 0.2, P.z);
    if (P.struggle >= 1) {
      const leaf = P.leaf;
      leaf.target = null; P.leaf = null;
      P.mode = 'film';
      P.cock = 1;
      jump(P.x - leaf.x || 1, P.z - leaf.z, 0.3);
      hud.toast('Free!');
    } else if (P.leaf.curl > 0.82) caught('sundew');
    return;
  }

  if (P.mode === 'flipped') {
    P.flipT += dt;
    P.roll = Math.PI;
    if (inp.dashPressed || P.flipT > 3.0) {
      // a flick of the furcula from the back rights it
      P.roll = 0; P.pitch = 0;
      if (inp.dashPressed && P.cock > 0.3) { P.mode = modeFor(groundAt(P.x, P.z).kind); jump(Math.cos(P.heading), Math.sin(P.heading), 0.12); }
      else P.mode = modeFor(groundAt(P.x, P.z).kind);
    }
    const fl = inPool(P.x, P.z) ? field.flow(P.x, P.z) : [0, 0];
    P.x += fl[0] * dt; P.z += fl[1] * dt;
    P.y = groundAt(P.x, P.z).y;
    return;
  }

  // on the film, on moss, or riding a piece of debris
  const here = groundAt(P.x, P.z);
  const onMoss = here.kind === 'moss';
  const solid = here.kind !== 'film';
  P.mode = modeFor(here.kind);
  if (here.piece) { P.x += here.piece.vx * dt; P.z += here.piece.vz * dt; }
  P.hunker += ((inp.defend ? 1 : 0) - P.hunker) * Math.min(1, dt * 10);
  const acc = (solid ? 7 : 11) * (1 - P.hunker * 0.95);
  const drag = solid ? 6 : 1.9 + P.hunker * 12;
  if (P.eatT <= 0) { P.vx += dir.x * mag * acc * dt; P.vz += dir.z * mag * acc * dt; }
  P.vx *= Math.exp(-drag * dt); P.vz *= Math.exp(-drag * dt);
  let fx = 0, fz = 0;
  if (!solid && inPool(P.x, P.z)) {
    const fl = field.flow(P.x, P.z);
    const sl = field.slope(P.x, P.z);
    fx = fl[0] * (1 - P.hunker * 0.8) - sl[0] * 30 * (1 - P.hunker); fz = fl[1] * (1 - P.hunker * 0.8) - sl[1] * 30 * (1 - P.hunker);
    // waves flip an unbraced springtail
    const s = Math.hypot(sl[0], sl[1]);
    if (s > 0.2 && P.hunker < 0.5) { P.mode = 'flipped'; P.flipT = 0; P.heading += (Math.random() - 0.5) * 2; rumble(200, 0.5, 0.3); hud.toast('Flipped by a wave! Tap A, or hunker (B) next time', 1700); return; }
  }
  const nx = P.x + (P.vx + fx) * dt, nz = P.z + (P.vz + fz) * dt;
  if (poolE(nx, nz) < BANK_E) { P.x = nx; P.z = nz; } else { P.vx *= 0.3; P.vz *= 0.3; }
  const sp = Math.hypot(P.vx, P.vz);
  if (sp > 0.4) { const ta = Math.atan2(P.vz, P.vx); P.heading += Math.max(-6 * dt, Math.min(6 * dt, Math.atan2(Math.sin(ta - P.heading), Math.cos(ta - P.heading)))); }
  else if (mag > 0.2) { const ta = Math.atan2(dir.z, dir.x); P.heading += Math.max(-4 * dt, Math.min(4 * dt, Math.atan2(Math.sin(ta - P.heading), Math.cos(ta - P.heading)))); }
  if (sp > 1.0) P.moved = 1;
  P.walk += (sp * dt) / 0.32;
  P.y = groundAt(P.x, P.z).y;
  P.pitch = 0; P.roll = 0; P.bend += (0 - P.bend) * Math.min(1, dt * 8);
  P.sy += (1 - P.sy) * Math.min(1, dt * 7);
  // the fight move rears the forebody (nose up), then drops it into the snap; the attack lunges low
  if (P.actT > 0 && (P.act === 'fight' || P.act === 'attack')) {
    const u = 1 - P.actT / P.actDur;
    P.pitch = P.act === 'fight' ? (u < 0.45 ? 0.55 * Math.sin((u / 0.45) * Math.PI / 2) : 0.55 * (1 - (u - 0.45) / 0.15)) : -0.15 * Math.sin(u * Math.PI);
    P.pitch = Math.max(-0.2, P.pitch);
  }

  // furcula: hold A to cock (a hop when tapped, a full jump at full charge), release to fire
  if (inp.dashDown && P.cock >= 1 && P.hunker < 0.5) {
    P.charging = true; P.charge = Math.min(1, P.charge + dt / 0.7);
    const d = mag > 0.25 ? dir : new THREE.Vector3(Math.cos(P.heading), 0, Math.sin(P.heading));
    P.aim = { x: d.x, z: d.z };
  }
  if (P.charging && !inp.dashDown) {
    P.charging = false;
    let d = mag > 0.25 ? dir : new THREE.Vector3(Math.cos(P.heading), 0, Math.sin(P.heading));
    let power = 0.12 + 0.88 * P.charge;
    // aim assist: an enemy near the aim line, within this jump's reach, becomes the target
    const R = 3 + 33 * power;
    const tgt = pounceTarget(P.x, P.z, d.x, d.z, R * 1.2, 0.45, true);
    if (tgt) {
      const dist = Math.hypot(tgt.x - P.x, tgt.z - P.z);
      d = new THREE.Vector3(tgt.x - P.x, 0, tgt.z - P.z).normalize();
      power = Math.max(0.12, Math.min(1, (dist - 3) / 33));
    }
    jump(d.x, d.z, power);
    if (tgt && P.air) P.air.pounce = tgt;
    P.charge = 0;
    return;
  }
  if (!P.charging) P.charge = 0;

  // X: three different moves, chosen by what is in front of the head.
  //  fight  a predator in reach: rear up, then snap (a nip on its tarsus at
  //         the snap: it staggers back and loses interest)
  //  eat    food in reach: the head goes down on a grain, the mouthparts work,
  //         the grain shrinks away (0.7 s a bite)
  //  attack nothing in reach: a lunge-nip forward
  if (inp.attackPressed && P.eatT <= 0 && !(P.actT > 0)) {
    const h = headPos();
    let foe = null, fd = 1.9;
    for (const k of ['stenus', 'strider']) {
      const pr = PRED[k]();
      if (!pr.group.visible || pr.st.state === 'capture') continue;
      if (k === 'boss') continue;
      for (const [x, z] of pr.nipPoints()) { const d = Math.hypot(x - h.x, z - h.z); if (d < fd) { fd = d; foe = k; } }
    }
    {
      // the boss: its tarsi and palps
      for (const [x, z] of boss.nipPoints()) { const d = Math.hypot(x - h.x, z - h.z); if (d < fd) { fd = d; foe = 'boss'; } }
    }
    let best = null, bd = 0.85;
    if (!foe) for (const c of world.food.clumps) {
      if (c.bites <= 0 || c.respawnT > 0) continue;
      const d = Math.hypot(c.x - h.x, c.z - h.z) - c.type.spread * 0.6;
      if (d < bd) { bd = d; best = c; }
    }
    if (foe) {
      P.act = 'fight'; P.actT = 0.6; P.actDur = 0.6; P.foe = foe; P.snapped = false;
      const pr = PRED[foe]().st;
      P.faceTo = Math.atan2(pr.z - P.z, pr.x - P.x);
    } else if (best) {
      P.act = 'eat'; P.actT = 0.7; P.actDur = 0.7; P.eatT = 0.7; P.eatFood = best;
      audio.play('springtail/eat', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
      ripples.push({ x: P.x, z: P.z, strength: 0.35 });
      rumble(40, 0.15, 0);
    } else {
      P.act = 'attack'; P.actT = 0.4; P.actDur = 0.4;
      P.vx += Math.cos(P.heading) * 5; P.vz += Math.sin(P.heading) * 5;
    }
  }
  if (P.actT > 0) {
    P.actT = Math.max(0, P.actT - dt);
    const u = 1 - P.actT / P.actDur;
    if (P.act === 'fight') {
      // turn square to it, rear (0-0.45), snap (0.45-0.6)
      P.heading += wrapA(P.faceTo - P.heading) * Math.min(1, dt * 14);
      if (u > 0.45 && !P.snapped) {
        P.snapped = true;
        P.vx += Math.cos(P.heading) * 4; P.vz += Math.sin(P.heading) * 4;
        const h = headPos();
        const pr = PRED[P.foe]();
        const hit = pr.st.state !== 'capture' && pr.nipPoints().some(([x, z]) => Math.hypot(x - h.x, z - h.z) < 2.3);
        audio.play('springtail/eat', { volume: 1, rate: 1.3 });
        if (hit) { rumble(160, 0.5, 0.5); P.nips = (P.nips || 0) + 1; biteFoe(P.foe, P, 1); }
      }
    } else if (P.act === 'eat' && P.eatFood) {
      const c = P.eatFood;
      c.chew = Math.min(1, u);
      if (P.actT <= 0) {
        c.chew = 0;
        c.bites--;
        if (c.bites <= 0) {
          P.food++;
          hud.toast(`Ate ${c.type.name} (${P.food}/${GOAL})${P.food === GOAL ? ': now reach the moss edge!' : ''}`);
          c.respawnT = 6;
        }
        P.eatFood = null;
      }
    }
    if (P.actT <= 0) P.act = null;
  }
  // last safe spot (for respawning alone): on the film or moss, no predator near
  P.safeT = (P.safeT || 0) + dt;
  if (P.safeT > 1 && Math.hypot(stenus.st.x - P.x, stenus.st.z - P.z) > 15 && Math.hypot(strider.st.x - P.x, strider.st.z - P.z) > 18 && !world.sundews.leafAt(P.x, P.y + 0.1, P.z)) { P.safeT = 0; P.safe = { x: P.x, z: P.z }; }
  if (game.phase === 'play' && P.food >= GOAL && onMoss && !P.fedSaid) {
    P.fedSaid = true;
    hud.toast('Fed and safe on the moss. The way on: the red capitula where the bank reaches into the pool', 3200);
  }
}

/** A point of open water about `r` mm from (x, z), well inside the pool, or null. */
function nearbyWater(x, z, r, eMax) {
  for (let k = 0; k < 24; k++) {
    const a = Math.random() * Math.PI * 2;
    const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
    if (poolE(cx, cz) < eMax && islandEdge(cx, cz).d > 8) return { x: cx, z: cz };
  }
  return null;
}

/** The player a predator at (x, z) goes for: the nearest one still free (player 1 when alone). */
function preyFor(x, z) {
  let best = null, bd = Infinity;
  for (const q of recs()) {
    if (!alive(q)) continue;
    const d = Math.hypot(q.x - x, q.z - z);
    if (d < bd) { bd = d; best = q; }
  }
  return best || pl;
}
function ctxOf(P, pred) {
  const live = alive(P) && game.phase === 'play';
  // a block: hunkered (B) and facing the predator
  const blocking = live && P.hunker > 0.5 && !!pred && facingTo(P, pred.st.x, pred.st.z);
  return { blocking, x: P.x, y: P.mode === 'air' ? P.y : 0, z: P.z, vx: P.air ? P.air.vx : P.vx, vz: P.air ? P.air.vz : P.vz, airborne: P.mode === 'air', hunker: P.hunker > 0.5, moving: (P.moved > 0 && P.hunker < 0.5) || P.mode === 'air' || P.mode === 'stuck' || P.eatT > 0, alive: live };
}
function stepWorld(dt) {
  const P = pl;
  const preyS = preyFor(stenus.st.x, stenus.st.z), preyR = preyFor(strider.st.x, strider.st.z);
  const ctxS = ctxOf(preyS, stenus), ctxR = ctxOf(preyR, strider);
  // interest: falls while the prey faces a hunting predator close by, comes back when it turns away
  for (const [k, prey, pr] of [['stenus', preyS, stenus], ['strider', preyR, strider]]) {
    const hunting = k === 'stenus' ? ['stalk', 'windup', 'strike', 'repelled'].includes(pr.st.state) : pr.st.state === 'hunt' || pr.st.st2 !== 'none';
    const f = fights[k].update(dt, { near: hunting && Math.hypot(prey.x - pr.st.x, prey.z - pr.st.z) < 12, facing: facingTo(prey, pr.st.x, pr.st.z) });
    if (f.retreated) { pr.retreat(); hunger[k].missed(); fights[k].reset(); hud.toast(`${k === 'stenus' ? 'Stenus' : 'The strider'} gives up on you`, 1800); }
  }
  if (game.phase === 'play' && !capture.active) { hunger.stenus.update(dt); hunger.strider.update(dt); }
  rain.calm = hunger.stenus.state === 'grace' && hunger.strider.state === 'grace';
  // the beetle and the strider keep to the water near you, wherever you go
  if (Math.hypot(stenus.st.x - preyS.x, stenus.st.z - preyS.z) > 70 && stenus.st.state === 'patrol') {
    const c = nearbyWater(preyS.x, preyS.z, 32, 0.8);
    if (c) stenus.relocate(c.x, c.z);
  }
  if (Math.hypot(strider.st.x - preyR.x, strider.st.z - preyR.z) > 75 && strider.st.state === 'idle') {
    const c = nearbyWater(preyR.x, preyR.z, 34, 0.85);
    if (c) strider.relocate(c.x, c.z);
  }
  world.debris.update(dt, field, inPool);
  for (const e of stenus.update(dt, { player: ctxS, field, inPool, hungry: isHungry(hunger.stenus) })) {
    if (e === 'caught' && ctxS.alive) withRec(preyS, () => caught('stenus'));
    if (e === 'blocked') { rumbleFor(preyS, 220, 0.6, 0.3); audio.play('springtail/land-water', { volume: 0.8, rate: 1.6 }); wearDown('stenus', 'block'); }
    if (e === 'gaveUp') hunger.stenus.missed();
    if (e === 'miss' && hunger.stenus.hungry) hunger.stenus.missed();
    if (e === 'spotted' && ctxS.alive) audio.play('springtail/stenus-skim', { volume: 0.25, rate: 0.8 });
    if (e === 'skim') audio.play('springtail/stenus-skim', { volume: 0.7 });
    if (e === 'strike') audio.play('springtail/stenus-strike', { volume: 0.9 });
    if (e === 'skim') hud.toast('Stenus is skimming at you!', 1000);
    if (e === 'windup' && ctxS.alive) { rumbleFor(preyS, 300, 0.15, 0); hud.toast('Stenus rears to strike: face it and hunker (B), or jump', 1400); } // the head dips: jump now
  }
  for (const e of strider.update(dt, { player: ctxR, field, inPool, ripples, hungry: isHungry(hunger.strider) })) {
    if (e === 'caught' && ctxR.alive) withRec(preyR, () => caught('strider'));
    if (e === 'blocked') { rumbleFor(preyR, 220, 0.6, 0.3); audio.play('springtail/land-water', { volume: 0.8, rate: 1.6 }); wearDown('strider', 'block'); }
    if (e === 'windup' && ctxR.alive) { rumbleFor(preyR, 300, 0.15, 0); hud.toast('The strider raises its forelegs: face it and hunker (B), or jump', 1400); }
    if (e === 'lost' && hunger.strider.hungry) hunger.strider.missed();
    // (timed on the simulation clock, so a paused game holds it too)
    if (e === 'heard' && ctxR.alive && !(strider.st.heardUntil > simT)) { strider.st.heardUntil = simT + 6; hud.toast('A water strider felt your ripples: keep still and hunker (B)', 1800); }
  }
  // the boss (boss.js): dormant on the moss tongue until someone comes near after the calm opening
  const bossCtx = { awake: pace.grace === 0 || hunger.stenus.state !== 'grace', field, inPool,
    players: recs().map((Q) => ({ slot: Q.slot, x: Q.x, z: Q.z, y: Q.y, heading: Q.heading, airborne: Q.mode === 'air', alive: alive(Q) && game.phase === 'play', landed: Q.landT !== undefined && simT - Q.landT < 0.2 && Q.mode !== 'air' })) };
  for (const e of boss.update(dt, bossCtx)) {
    const Q = e.slot !== undefined ? pls[e.slot] : null;
    if (e.type === 'wake') hud.toast('A pond wolf spider guards the moss bank! Watch it crouch and raise its front legs: then jump clear', 3000);
    else if (e.type === 'tell') { for (const R of recs()) if (Math.hypot(R.x - boss.st.x, R.z - boss.st.z) < 16) rumbleFor(R, 200, 0.12, 0); }
    else if (e.type === 'lunge' || e.type === 'pounce') audio.play('springtail/stenus-strike', { volume: 0.9, rate: 0.7 });
    else if (e.type === 'caught' && Q && alive(Q)) withRec(Q, () => caught('boss'));
    else if (e.type === 'dodged') hud.toast('Dodged! It overreached: nip its tarsus (X) or pounce (X in the air)', 1500);
    else if (e.type === 'retreat') hud.toast('The wolf spider backs off under the moss: the bank is open', 2600);
  }
  ripples.length = 0;
  const drops = rain.update(dt, { field, inPool, mossAt: (x, z) => Math.max(0, mossTop(x, z)), player: ctxS });
  for (const e of drops) {
    const d0 = Math.hypot(e.x - P.x, e.z - P.z);
    audio.play('springtail/raindrop', { volume: Math.max(0.12, Math.min(0.9, 4 / (d0 + 3))), rate: 0.92 + Math.random() * 0.16, pan: Math.max(-1, Math.min(1, (e.x - P.x) / 25)) });
    for (const Q of recs()) withRec(Q, () => {
      const d = Math.hypot(e.x - Q.x, e.z - Q.z);
      if (d < 6) rumble(250, Math.min(1, 3 / d), Math.min(1, 2 / d));
      if (!alive(Q) || game.phase !== 'play') return;
      if (d < e.r * 0.95 && Q.mode !== 'air') die('Swamped by a raindrop');
      else if (d < e.r * 3 && Q.mode !== 'air' && Q.mode !== 'stuck') {
        // thrown out of the crater
        const ax = Q.x - e.x, az = Q.z - e.z;
        Q.mode = 'film';
        jump(ax, az, 0.35 * (1 - d / (e.r * 3)) + 0.15, { thrown: true });
      }
    });
  }
  world.sundews.update(dt);
  // food drifts on the film, shoved by the Marangoni flow
  for (const c of world.food.clumps) {
    if (c.respawnT !== undefined && c.respawnT > 0) { c.respawnT -= dt; if (c.respawnT <= 0) { world.food.respawn(c); c.respawnT = undefined; } continue; }
    const fl = field.flow(c.x, c.z);
    c.vx += (fl[0] * 2 - c.vx) * dt * 2 + (Math.random() - 0.5) * dt * 0.6;
    c.vz += (fl[1] * 2 - c.vz) * dt * 2 + (Math.random() - 0.5) * dt * 0.6;
    const nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
    if (inPool(nx, nz) && poolE(nx, nz) < 0.93) { c.x = nx; c.z = nz; } else { c.vx *= -0.5; c.vz *= -0.5; }
    c.spin += dt * 0.05;
  }
  field.step(dt);
}

/** The drop shadow (one at a time): straight down from this springtail onto whatever is below. */
function setDrop(P) {
  const drop = macroShared.uDrop.value;
  if (!P || !opt.dropShadow || P.mode === 'dead' || P.mode === 'caught') { drop.set(0, -99, 0, 0); macroShared.uDropK.value = 0; }
  else if (P.mode === 'air') { drop.set(P.x, P.y + 0.1, P.z, 0.62); macroShared.uDropK.value = 0.85; }
  else { drop.set(P.x - Math.cos(P.heading) * 0.05, P.y + 0.06, P.z - Math.sin(P.heading) * 0.05, 0.62); macroShared.uDropK.value = 0.45; }
}
// pose the springtail model from the player state
function poseTail(t) {
  const P = pl, p = tail.pose;
  p.t = t;
  p.walk = P.walk;
  p.stride += ((P.mode === 'film' || P.mode === 'moss') && Math.hypot(P.vx, P.vz) > 0.3 ? 1 : 0) - p.stride;
  p.stride = Math.max(0, Math.min(1, p.stride));
  p.bend = P.bend * 1.0 + (P.charging ? -0.15 * P.charge : 0);
  p.furcula = P.furc;
  p.hunker = P.hunker;
  p.nod = 0;
  if (P.actT > 0) {
    const u = 1 - P.actT / P.actDur;
    if (P.act === 'eat') p.nod = 0.75 + 0.25 * Math.sin(u * Math.PI * 9); // head down on the grain, mouthparts working
    else if (P.act === 'attack') p.nod = Math.sin(Math.min(1, u * 1.6) * Math.PI); // the lunge-nip
    else if (P.act === 'fight') p.nod = u < 0.45 ? -0.6 * (u / 0.45) : 1.1 * Math.sin(((u - 0.45) / 0.55) * Math.PI); // head up, then the snap
  }
  p.tuck = P.mode === 'air' ? 1 : 0;
  p.flail = P.mode === 'flipped' || P.mode === 'stuck' || P.mode === 'dead' ? 1 : 0;
  if (P.mode === 'caught') { p.flail = P.flailK; p.stride = 0; p.tuck = 0; p.nod = 0; p.hunker = 0; p.bend = 0.3 * P.flailK * Math.sin(t * 11); }
  tail.update();
  const g = tail.group;
  let y = P.y;
  if (P.mode === 'film') y = field.height(P.x, P.z) - 0.01 - P.hunker * 0.02;
  if (P.mode === 'flipped') y = P.y + 0.42;
  if (P.mode === 'dead') y = P.y - Math.min(1, P.deadT) * 0.2;
  g.position.set(P.x, y, P.z);
  // in the air the body spins about its centre (pitch about the lateral axis)
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -P.heading, 0));
  const c = new THREE.Vector3(0, 0.25, 0);
  const qp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), P.pitch);
  const qr = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), P.roll);
  let tilt = new THREE.Quaternion();
  if (P.mode === 'film') {
    const sl = field.slope(P.x, P.z);
    tilt.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-sl[0], 1, -sl[1]).normalize());
  }
  g.quaternion.copy(tilt).multiply(q).multiply(qp).multiply(qr);
  if (P.pitch || P.roll) g.position.add(c.clone().sub(c.clone().applyQuaternion(new THREE.Quaternion().multiplyQuaternions(qp, qr))).applyQuaternion(q));
  g.scale.set(P.scale, P.scale * P.sy, P.scale);
  g.visible = P.scale > 0.02;
  g.updateMatrixWorld(true);
}

function updateContacts() {
  dimples.clear();
  for (const P of recs()) {
    if ((P.mode === 'film' || P.mode === 'flipped') && inPool(P.x, P.z)) {
      if (P.mode === 'film') for (const f of P.tail.feet()) dimples.add(f.x, f.z, 0.045, 0.03 + 0.02 * P.hunker);
      const c = P.tail.collophore();
      dimples.add(c.x, c.z, 0.06 + 0.06 * P.hunker, 0.012 + 0.05 * (P.hunker + P.landPulse));
      if (P.hunker > 0.2 || P.mode === 'flipped') dimples.add(P.x, P.z, 0.22, 0.035 * Math.max(P.hunker, P.mode === 'flipped' ? 1 : 0));
    }
  }
  setDrop(pl);
  // shadow casters
  let n = 0;
  const cast = (x, y, z, r, k) => { if (n < 8) { casters[n].set(x, y, z, r); casterK[n] = k; n++; } };
  for (const P of recs()) if (P.mode !== 'dead' && P.scale > 0.3) cast(P.x, P.y + 0.25 * P.scale, P.z, 0.3 * P.scale, 0.55);
  for (const c of stenus.contacts()) dimples.add(...c);
  if (boss.group.visible) for (const c of boss.contacts()) dimples.add(...c);
  if (strider.group.visible) for (const c of strider.contacts()) dimples.add(...c);
  for (const c of world.food.clumps) {
    if (c.bites <= 0 || c.respawnT > 0) continue;
    if (Math.hypot(c.x - rig.target.x, c.z - rig.target.z) < 30) dimples.add(c.x, c.z, c.type.spread * 0.7, 0.012 * c.bites);
  }
  world.debris.contacts(rig.target, (x, z, r, d) => dimples.add(x, z, r, d));
  if (boss.group.visible) { const s = boss.st; cast(s.x, s.y + 0.3, s.z, 1.2, 0.5); cast(s.x - Math.cos(s.a) * 2.2, s.y + 0.3, s.z - Math.sin(s.a) * 2.2, 1.3, 0.5); }
  if (stenus.group.visible) { const s = stenus.st; cast(s.x + Math.cos(s.a) * 1.2, 0.65, s.z + Math.sin(s.a) * 1.2, 0.55, 0.55); cast(s.x - Math.cos(s.a) * 1.2, 0.7, s.z - Math.sin(s.a) * 1.2, 0.45, 0.5); }
  if (strider.group.visible) { const s = strider.st; cast(s.x + Math.cos(s.a) * 1.8, 0.9, s.z + Math.sin(s.a) * 1.8, 0.6, 0.5); cast(s.x - Math.cos(s.a) * 1.6, 0.8, s.z - Math.sin(s.a) * 1.6, 0.5, 0.45); }
  for (const c of rain.casters()) cast(c[0], c[1], c[2], c[3], c[4]);
  for (; n < 8; n++) { casters[n].set(0, -99, 0, 0); casterK[n] = 0; }
}

// ---------------------------------------------------------------- input
const IDLE = { move: { x: 0, y: 0, m: 0 }, dashDown: false, dashPressed: false, attackPressed: false, defend: false };
/** Every player's input this frame, by slot (player 1 also drives the camera and the optics). */
function readInput(dt) {
  players.poll(); // the roster and every player's pad (do not also poll the pads)
  syncPlayers();
  unlockOnPad();
  menuOpen = features.update();
  if (menuOpen) return [];
  hud.update(pad);
  // RS: yaw (any player turns the shared camera), and pitch by intent (+1
  // looks up: the camera swings down toward the horizon), honouring the
  // shared Invert Y. It works in either view.
  let yaw = 0;
  for (const p of players.active) yaw += players.controls(p.slot).look().yaw;
  rig.yaw += THREE.MathUtils.clamp(yaw, -1, 1) * 1.9 * dt;
  const look = ctl.look();
  rig.wantPitch = THREE.MathUtils.clamp(rig.wantPitch - look.pitch * 1.1 * dt, PITCH_MIN, PITCH_MAX);
  if (rig.mode === 'low') rig.pitchLow = rig.wantPitch;
  if (ctl.special.pressed()) {
    if (rig.mode === 'top') { rig.wantPitch = Math.min(rig.pitchLow, 0.9); hud.toast('Low macro'); }
    else { rig.pitchLow = rig.wantPitch; rig.wantPitch = PITCH_TOP; hud.toast('Top-down (RS or Y to come back down)'); }
  }
  const zs = ctl.zoomStep();
  if (zs) { rig.zi = THREE.MathUtils.clamp(rig.zi + zs, 0, ZOOMS.length - 1); hud.toast(`${ZOOMS[rig.zi]}x · field ${(36 / ZOOMS[rig.zi]).toFixed(1)} mm`); }
  const ls = ctl.lookStep();
  if (ls) { const i = (rig.look + ls + MACRO_LOOKS.length) % MACRO_LOOKS.length; features.set('look', MACRO_LOOKS[i].name); hud.toast(MACRO_LOOKS[i].name); }
  if (ctl.lb.pressed()) { rig.ai = Math.max(0, rig.ai - 1); hud.toast(`f/${APERTURES[rig.ai]}`); }
  if (ctl.rb.pressed()) { rig.ai = Math.min(APERTURES.length - 1, rig.ai + 1); hud.toast(`f/${APERTURES[rig.ai]}`); }
  const an = ctl.analog();
  if (an) rig.focusOff = THREE.MathUtils.clamp(rig.focusOff + an * dt * 6 / ZOOMS[rig.zi], -15, 15);
  if (ctl.stickClick.left.pressed()) { rig.focusOff = 0; hud.toast('Autofocus'); }
  const out = [];
  for (const p of players.active) {
    const c = players.controls(p.slot);
    out[p.slot] = { move: c.move(), dashDown: c.dash.down(), dashPressed: c.dash.pressed(), attackPressed: c.attack.pressed(), defend: c.defend.down() };
  }
  if (game.phase !== 'play') {
    if (out.some((i) => i && i.dashPressed)) newGame();
    return [];
  }
  return out;
}

// ---------------------------------------------------------------- players
/** Make a springtail for a player who joined (or came in with the shell's roster), beside the others. */
function makeRec(p) {
  const t = createSpringtail({ share: tail0 });
  scene.add(t.group);
  const P = { ...PL_INIT, slot: p.slot, color: p.color, tail: t, ring: props.ring(p.color), lives: 3, food: 0 };
  const near = recs().filter((q) => alive(q));
  const c = near.length ? groupCentre(near) : { x: START.x, z: START.z };
  const at = spotNear(c.x, c.z, 2.5 + p.slot);
  resetBody(P, at.x, at.z);
  P.heading = pl.heading;
  return P;
}
/** Keep one springtail per joined player. */
function syncPlayers() {
  const want = new Set(players.list.map((p) => p.slot));
  for (const p of players.list) if (!pls[p.slot]) pls[p.slot] = makeRec(p);
  for (let s = 1; s < pls.length; s++) {
    const P = pls[s];
    if (!P || want.has(s)) continue;
    if (cap.who === P) { capture.reset(); cap.kind = null; cap.who = null; }
    scene.remove(P.tail.group);
    P.ring.visible = false;
    pls[s] = null;
  }
}
/** Each player's colour ring on the film (only with two or more players). */
function placeRings() {
  const on = multi();
  for (const P of recs()) {
    const r = P.ring;
    r.visible = on && P.scale > 0.3 && P.mode !== 'dead';
    if (!r.visible) continue;
    const y = P.mode === 'air' ? groundAt(P.x, P.z).y : P.y;
    r.position.set(P.x, y + 0.03, P.z);
    const k = P.mode === 'air' ? 0.8 : 1;
    r.scale.set(k, 1, k);
  }
}

// ---------------------------------------------------------------- landmarks
// The way on (forward): reaching the tongue of moss with the red capitula
// (LANDMARK, world.js) zooms into the next world. Any player counts; in the
// game the others follow through the transition. No backdoor: this is the
// top of the chain.
const lm = { fired: false, log: [] };
function checkLandmark() {
  if (game.phase !== 'play') return;
  let at = null, near = false;
  for (const P of recs()) {
    if (!alive(P)) continue;
    const d = Math.hypot(P.x - LANDMARK.x, P.z - LANDMARK.z);
    if (d < LANDMARK.reach) at = P;
    if (d < LANDMARK.reach + 12) near = true;
  }
  if (at && !lm.fired) {
    lm.fired = true;
    lm.log.push({ kind: 'forward', slot: at.slot, t: +simT.toFixed(2) });
    rumbleFor(at, 200, 0.3, 0.3);
    embed.landmark('forward', { player: at.slot });
  }
  if (!near) lm.fired = false; // left the moss: it can fire again
}

// ---------------------------------------------------------------- HUD text
function niceLen(w) {
  const p = Math.pow(10, Math.floor(Math.log10(w)));
  for (const m of [5, 2, 1]) if (m * p <= w) return m * p;
  return p;
}
let fps = 60;
function updateText(L) {
  // scale bar: true at the focal plane (in the middle of the frame)
  const vh = renderer.domElement.clientHeight;
  const mmPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * macroShared.uFocus.value) / vh;
  const want = mmPerPx * 160;
  const len = niceLen(want);
  bar.querySelector('.rule').style.width = `${(len / mmPerPx).toFixed(1)}px`;
  bar.querySelector('.lab').textContent = len >= 1 ? `${len} mm` : `${(len * 1000).toFixed(0)} µm`;
  const N = APERTURES[rig.ai];
  const dof = L.dof * MACRO_LOOKS[rig.look].dofK * rig.dofK;
  bar.querySelector('.opt').textContent = `${L.m.toFixed(1)}x · f/${N} (eff. f/${L.Neff.toFixed(0)}) · DOF ${dof.toFixed(2)} mm${rig.focusOff ? ` · focus ${rig.focusOff > 0 ? '+' : ''}${rig.focusOff.toFixed(1)} mm` : ''}`;
  status.querySelector('.food').textContent = `Food ${pl.food}/${GOAL}`;
  status.querySelector('.lives').textContent = '';
  const m = status.querySelector('.st-meter i');
  const furcTxt = status.querySelector('.furc');
  status.classList.toggle('caught', capture.active);
  const thr = status.querySelector('.threat');
  const hs = hunger.stenus, hr = hunger.strider;
  const hunting = ['stalk', 'skim', 'windup', 'strike'].includes(stenus.st.state) || strider.st.state === 'hunt';
  const attacking = stenus.attacking || strider.attacking || boss.attacking;
  gauge.style.display = boss.engaged ? 'flex' : 'none';
  gauge.querySelector('i').style.width = `${(boss.resolve * 100).toFixed(0)}%`;
  thr.textContent = capture.active ? '' : attacking ? 'Attacking! Face it + B, or jump' : hunting ? 'Hunted!' : isHungry(hs) || isHungry(hr) ? `${[isHungry(hs) && 'Stenus', isHungry(hr) && 'Strider'].filter(Boolean).join(' & ')} hungry` : 'Calm';
  thr.classList.toggle('hot', hunting || attacking);
  if (capture.active && cap.phase) { furcTxt.textContent = (cap.kind && CAP_TEXT[cap.kind].phases[cap.phase]) || 'Back again'; m.style.width = `${{ strike: 25, hold: 50, eat: 80, follow: 100, fadeOut: 100, fadeIn: 100 }[cap.phase] || 100}%`; m.style.background = '#e04f3a'; }
  else if (pl.mode === 'stuck') { furcTxt.textContent = 'Struggle'; m.style.width = `${pl.struggle * 100}%`; m.style.background = '#e07a5f'; }
  else if (pl.charging) { furcTxt.textContent = pl.charge > 0.98 ? 'Full jump' : 'Cocking'; m.style.width = `${pl.charge * 100}%`; m.style.background = '#f2cc8f'; }
  else { furcTxt.textContent = pl.cock < 1 ? 'Re-cocking' : 'Furcula'; m.style.width = `${pl.cock * 100}%`; m.style.background = pl.cock < 1 ? '#7a8a99' : '#9fd0ff'; }
  const info = renderer.info.render;
  hud.stats(`${pl.mode}${pl.mode === 'film' ? ` ${Math.hypot(pl.vx, pl.vz).toFixed(1)} mm/s` : ''}  Stenus: ${stenus.st.state} (${hs.state} ${hs.left.toFixed(0)} s)  strider: ${strider.st.state} (${hr.state} ${hr.left.toFixed(0)} s)${capture.active ? `  capture: ${cap.kind} ${cap.phase}` : ''}\n${MACRO_LOOKS[rig.look].name}${renderScale < 1 ? ` (res ${(renderScale * 100).toFixed(0)}%)` : ''}\n${fps.toFixed(0)} fps  ${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris`);
}

// ---------------------------------------------------------------- loop
let simT = 0, menuOpen = false, frames = 0;
function step(dt, inputs) {
  // the pounce-bite's hit-pause: the world all but stops for a moment
  if (hitPause > 0) { hitPause -= dt; dt *= 0.06; }
  simT += dt;
  macroShared.uTime.value = simT;
  // keep the ripple window on the springtails (their middle); its water mask only needs the islands near it
  const all = recs();
  const gc = all.length > 1 ? groupCentre(all) : { x: pl.x, z: pl.z, spread: 0 };
  const near = ISLANDS.filter((I) => Math.hypot(I.x - gc.x, I.z - gc.z) < field.size + I.r + gc.spread);
  field.inside = (x, z) => poolE(x, z) < 1 && near.every((I) => Math.hypot(x - I.x, z - I.z) > I.r);
  field.recenter(gc.x, gc.z);
  const who = capture.active && cap.who ? cap.who : P1;
  const c = withRec(who, () => capture.update(dt, menuOpen ? null : players.pad(who.slot)));
  if (game.phase === 'play' || game.phase === 'title') for (const P of recs()) withRec(P, () => stepPlayer(dt, (inputs && inputs[P.slot]) || IDLE));
  stepWorld(dt);
  if (c.active) withRec(who, () => animateCapture(c, dt));
  for (const P of recs()) withRec(P, () => poseTail(simT));
  placeRings();
  props.update(simT);
  checkLandmark();
  world.food.update((x, z) => field.height(x, z) + dimples.height(x, z) * 0.5);
  updateContacts();
}
const split = createSplitScreen(renderer, { capture: true });
const marks = createLandmarks();
// a caught player's view follows the predator with its meal
const posOf = (P) => {
  if (P.mode === 'caught' && cap.who === P && (cap.kind === 'stenus' || cap.kind === 'strider') && ['eat', 'follow', 'fadeOut'].includes(cap.phase)) { const b = capBody(); return { x: b.x, y: 0.4, z: b.z }; }
  return { x: P.x, y: P.y + 0.25, z: P.z };
};
function render(dt) {
  const L = placeCamera(dt);
  field.upload();
  split.update(recs().map((P) => ({ slot: P.slot, position: posOf(P) })), { camera }, dt);
  const k = split.views.length > 2 ? 0.55 : split.views.length > 1 ? 0.7 : 1;
  if (k !== splitK) { splitK = k; resize(); }
  const focus0 = macroShared.uFocus.value;
  const one = split.views.length === 1;
  split.render(camera, (view, target) => {
    renderer.setRenderTarget(target);
    let dofK = rig.dofK;
    if (!one) {
      // each view focuses on its own players, the water and the sky follow its camera
      const vr = view.slots.map((s) => pls[s]).filter(Boolean);
      const g = groupCentre(vr.length ? vr : [pl]);
      macroShared.uFocus.value = camera.position.distanceTo(_v.set(g.x, g.y + 0.25, g.z)) + rig.focusOff;
      let far = 0;
      for (const P of vr) far = Math.max(far, Math.abs(camera.position.distanceTo(_v.set(P.x, P.y + 0.25, P.z)) + rig.focusOff - macroShared.uFocus.value));
      dofK = THREE.MathUtils.clamp((far + 0.6) / L.dof, 1, 14);
      water.position.set(Math.round(g.x / field.dx) * field.dx, 0, Math.round(g.z / field.dx) * field.dx);
      world.sky.position.copy(camera.position);
      setDrop(vr[0]);
    }
    macro.render(scene, camera, { lens: L, look: lookDef, dofK });
  });
  if (!one) { macroShared.uFocus.value = focus0; setDrop(pl); }
  marks.begin();
  if (game.phase === 'play') marks.drawSplit(split, props.position, { kind: 'forward', label: 'Moss bank', range: 600 });
  return L;
}

const api = {
  scene, camera, renderer, macro, field, dimples, tail, stenus, strider, rain, world, pl, rig, game, features, paused: false,
  step(dt = 1 / 60, inp = IDLE) { step(dt, [inp]); },
  render(dt = 0) { const L = render(dt); updateText(L); },
  jump, newGame, respawn, inPool, groundAt, hunger, capture, cap, pace,
  get time() { return simT; },
  /** Testing: one fixed step with the left stick at (x, y) (null: hands off). */
  testStep(dt = 1 / 30, stick = null) {
    if (game.phase !== 'play') newGame();
    const m = stick ? Math.min(1, Math.hypot(stick.x, stick.y)) : 0;
    step(dt, [{ move: { x: stick ? stick.x : 0, y: stick ? stick.y : 0, m }, dashDown: false, dashPressed: false, attackPressed: false, defend: false }]);
  },
  // ---- multiplayer and landmarks (Playwright drives these)
  players, split, marks, joins, landmark: LANDMARK, landmarkLog: lm.log, props,
  get frames() { return frames; },
  get layout() { return split.layout; },
  recs: () => recs().map((P) => ({ slot: P.slot, x: +P.x.toFixed(2), z: +P.z.toFixed(2), mode: P.mode, color: P.color })),
  /** Put a player at (x, z) mm, standing, and snap the camera. */
  teleport(slot, x, z) {
    const P = pls[slot];
    if (!P) return false;
    if (game.phase !== 'play') newGame();
    resetBody(P, x, z);
    const g = groupCentre(recs());
    rig.target.set(g.x, g.y + 0.25, g.z);
    return true;
  },
  /** Run n render passes (camera and split screen) without stepping the simulation. */
  settle(n = 30) { for (let i = 0; i < n; i++) render(1 / 30); },
  /** Testing: is a predator coming for you, and how hungry is each. */
  pacing() {
    const S = stenus.st, R = strider.st;
    return {
      approach: capture.active || ['stalk', 'skim', 'windup', 'strike'].includes(S.state) || (R.state === 'hunt' && Math.hypot(R.x - pl.x, R.z - pl.z) < 25),
      captured: capture.active, phase: capture.phase, kind: cap.kind,
      hunger: { stenus: hunger.stenus.state, strider: hunger.strider.state },
      states: { stenus: S.state, strider: R.state },
      dist: { stenus: +Math.hypot(S.x - pl.x, S.z - pl.z).toFixed(1), strider: +Math.hypot(R.x - pl.x, R.z - pl.z).toFixed(1) },
      mode: pl.mode,
    };
  },
  /** Testing: get caught right now by 'stenus', 'strider' or 'sundew' (the full sequence plays). */
  forceCapture(kind = 'stenus', slot = 0) {
    if (game.phase !== 'play') newGame();
    if (capture.active) return;
    const P = pls[slot] || pl;
    withRec(P, () => api._force(kind, P));
  },
  _force(kind, P) {
    if (P.mode === 'air' || P.mode === 'flipped' || P.mode === 'dead') { P.mode = 'film'; P.air = null; P.roll = 0; P.pitch = 0; }
    if (kind === 'sundew') {
      const leaf = world.sundews.leaves[0];
      P.x = leaf.x; P.z = leaf.z; P.y = leaf.y + 0.12; P.mode = 'stuck'; P.leaf = leaf; leaf.target = new THREE.Vector3(P.x, P.y + 0.2, P.z); leaf.curl = 0.85;
      caught('sundew');
      return;
    }
    const a = P.heading + Math.PI / 2;
    if (kind === 'strider') {
      const s = strider.st;
      strider.relocate(P.x - Math.cos(a) * 4.4, P.z - Math.sin(a) * 4.4);
      s.a = a;
    } else {
      const s = stenus.st;
      s.x = P.x - Math.cos(a) * 4.3; s.z = P.z - Math.sin(a) * 4.3; s.a = a; s.state = 'strike'; s.t = 0;
      audio.play('springtail/stenus-strike', { volume: 0.9 });
    }
    caught(kind);
  },
  /** Set camera fields; `mode: 'top' | 'low'` and `pitch` set the wanted elevation. */
  setCam(o) {
    const { mode, pitch, ...rest } = o;
    Object.assign(rig, rest);
    if (pitch !== undefined) rig.wantPitch = rig.pitch = pitch;
    if (mode === 'top') rig.wantPitch = PITCH_TOP; else if (mode === 'low') rig.wantPitch = rig.pitchLow;
  },
  landingPoint,
  fights, fightLog, boss,
  /** Testing: the boss wakes and comes for player `slot` (put beside its post). */
  bossFight(slot = 0) { const P = pls[slot] || pl; pace.mode = 'Always'; hunger.stenus.reset(0); hunger.stenus.update(0.01); resetBody(P, boss.post.x - 14, boss.post.z); P.heading = 0; boss.reset(); rig.target.set(P.x, P.y, P.z); },
  /** Testing: last pounce-bite result for player `slot`. */
  impact(slot = 0) { const P = pls[slot] || pl; return { last: P.lastImpact || null, pounces: P.pounces || 0, mode: P.mode, dive: !!(P.air && P.air.dive) }; },
  /** Testing: jump from player `slot` toward (x, z) with the given power (as if released). */
  jumpAt(slot, x, z, power = 0.4) { const P = pls[slot] || pl; withRec(P, () => { jump(x - P.x, z - P.z, power); const t = pounceTarget(P.x, P.z, x - P.x, z - P.z, 40, 0.5, true); if (t && P.air) P.air.pounce = t; }); },
  /** Testing: a predator comes for player `slot`, head to head 3 mm off, hungry and stalking (it winds up next). */
  setFoe(kind = 'stenus', slot = 0) {
    if (game.phase !== 'play') newGame();
    const P = pls[slot] || pl;
    hunger[kind].reset(0); hunger[kind].update(0.01); pace.mode = 'Always';
    const a = P.heading;
    if (kind === 'stenus') { const s = stenus.st; Object.assign(s, { x: P.x + Math.cos(a) * 4.3, z: P.z + Math.sin(a) * 4.3, a: a + Math.PI, state: 'stalk', t: 0, seen: 3, v: 0, skimCool: 9, groom: 0 }); }
    else { strider.relocate(P.x + Math.cos(a) * 7.2, P.z + Math.sin(a) * 7.2); Object.assign(strider.st, { a: a + Math.PI, state: 'hunt', target: { x: P.x, z: P.z }, interest: 6 }); }
    fights[kind].reset();
  },
  /** Testing: bring the predator back in front of player `slot` (its interest kept). */
  nudgeFoe(kind = 'stenus', slot = 0) {
    const P = pls[slot] || pl, a = P.heading;
    if (kind === 'stenus') Object.assign(stenus.st, { x: P.x + Math.cos(a) * 3.9, z: P.z + Math.sin(a) * 3.9, a: a + Math.PI, state: 'stalk', t: 0, seen: 3, v: 0 });
    else { Object.assign(strider.st, { x: P.x + Math.cos(a) * 6.6, z: P.z + Math.sin(a) * 6.6, a: a + Math.PI, state: 'hunt', st2: 'none', target: { x: P.x, z: P.z }, interest: 6 }); }
  },
  /** Testing: calm the predators again (patrolling, grooming). */
  calm() { pace.mode = 'Never'; stenus.release(); strider.release(); },
  /** Testing: what player `slot` is doing (act: 'fight' | 'eat' | 'attack' | null). */
  me(slot = 0) { const P = pls[slot] || pl; return { act: P.act, actT: P.actT, nips: P.nips || 0, food: P.food, mode: P.mode, hunker: P.hunker, x: P.x, z: P.z, heading: P.heading }; },
  /** Testing: put food right under player `slot`'s head. */
  feed(slot = 0) { const P = pls[slot] || pl; const c = world.food.clumps.find((q) => q.bites > 0); c.x = P.x + Math.cos(P.heading) * 0.95; c.z = P.z + Math.sin(P.heading) * 0.95; c.vx = c.vz = 0; c.respawnT = undefined; return c.type.name; },
  /** Hide the moss and sundews (turnaround renders on open water). */
  isolate(on) { world.group.children.forEach((c) => { if (c !== world.sky) c.visible = !on; }); },
};
window.__micro = api;

// The shell's roster (players who joined in the menus come along), then any
// joins during play are polled here and reported back to it.
if (embed.players) players.fromJSON(embed.players);
embed.on('players', (r) => { players.fromJSON(r); syncPlayers(); });
syncPlayers();
hud.players(players.list);
// In the game the shell's intro replaces the start card: play at once.
if (embed.active) newGame();

const gl = renderer.getContext();
let fence = null, last = performance.now(), lastSubmit = last, statT = 0;
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
  const inp = readInput(dt);
  game.t += dt;
  step(dt, inp);
  if (gpuBusy()) return;
  const raw = now - lastSubmit;
  lastSubmit = now;
  slowEma += (raw - slowEma) * 0.25;
  fps = 1000 / Math.max(slowEma, 1);
  scaleT += raw;
  if (dynRes && scaleT > 300) {
    if (raw > 120 && renderScale > 0.26) { renderScale = Math.max(0.25, renderScale * 0.6); resize(); scaleT = 0; }
    else if (slowEma > 40 && scaleT > 800 && renderScale > 0.26) { renderScale = Math.max(0.25, renderScale * 0.8); resize(); scaleT = 0; }
    else if (slowEma < 20 && renderScale < 1 && scaleT > 2500) { renderScale = Math.min(1, renderScale * 1.15); resize(); scaleT = 0; }
  }
  const L = render(dt);
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  statT += dt;
  if (statT > 0.25) { updateText(L); statT = 0; }
}
frame();

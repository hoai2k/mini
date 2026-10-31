// Springtail prototype (Zoom Chain, Level 0): the water springtail Podura
// aquatica on a bog pool's surface film, seen through a macro lens.
// Units: mm and seconds.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { createControls, hudControls, addInvertY } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { loadTexture } from '../shared/assets.js';
import { createMacro, lens, macroShared, applyLook, MACRO_LOOKS } from '../shared/techniques/springtail-macro.js';
import { RippleField, Dimples, waterMaterial, waterGeometry, peatFloorTexture } from '../shared/techniques/springtail-surface.js';
import { buildWorld, inPool, poolE, mossTop, islandEdge, ISLANDS, POOL_GLSL, SHORE_GLSL, BANK_E } from './world.js';
import { createSpringtail } from './springtail.js';
import { createStenus, createStrider, createRain } from './enemies.js';
import { createHunger, createCapture } from '../shared/predation.js';

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
const tail = createSpringtail();
scene.add(tail.group);
const stenus = createStenus(scene);
const strider = createStrider(scene);
const rain = createRain(scene);

art('MP-S01').then((t) => { if (t) { waterMat.uniforms.uSurfTex.value = t; waterMat.uniforms.uHasSurfTex.value = 1; } });
art('MP-S02').then((t) => t && world.setMossTex(t));
art('MP-S03', { repeat: false }).then((t) => { if (t) { macroShared.uBackdrop.value = t; macroShared.uHasBackdrop.value = 1; } });
art('MP-S04', { repeat: false }).then((t) => t && world.sundews.setTexture(t));
art('MP-S05', { repeat: false }).then((t) => t && rain.setSprite(t));

// ---------------------------------------------------------------- player
const START = { x: -8, z: 2 };
const pl = {
  x: START.x, z: START.z, y: 0, vx: 0, vz: 0, heading: Math.PI / 2, mode: 'film',
  charge: 0, charging: false, cock: 1, hunker: 0, eatT: 0, flipT: 0, roll: 0, pitch: 0, bend: 0, furc: 0,
  air: null, leaf: null, struggle: 0, deadT: 0, cause: '', walk: 0, lives: 3, food: 0, moved: 0, landPulse: 0, onIsland: false,
  scale: 1, sy: 1, flailK: 0,
};
const GOAL = 8;
const game = { phase: 'title', t: 0, wonT: 0 };
const opt = { righting: true, slow: true, uPose: true, menisci: 1, rumble: true, autofocus: true, jumpFocus: true, dropShadow: true };

const pad = createPad();
const ctl = createControls(pad);
const hud = mountHud({
  title: 'Springtail · macro',
  sub: 'Level 0, a bog pool: the water springtail Podura aquatica, 1.5 mm long, lives on the surface film. Eat, dodge, and spring away with the furcula.',
  controls: hudControls({
    move: 'Walk on the film (slow, slippery)',
    camera: 'Orbit',
    dash: 'Furcula jump: hold to cock (hop to full), release; aim with LS',
    attack: 'Graze pollen, spores and algae',
    defend: 'Hold: hunker (collophore down; waves cannot flip you)',
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
document.body.append(bar, status, card);
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
  const capOn = capture.active && cap.kind;
  const hfwWant = capOn ? CAP_VIEW[cap.kind].hfw : 36 / ZOOMS[rig.zi];
  rig.hfw = rig.hfw === undefined || !dt ? hfwWant : rig.hfw + (hfwWant - rig.hfw) * (1 - Math.exp(-dt * 3));
  const L = (rig.lens = lens({ hfw: rig.hfw, N: APERTURES[rig.ai] }));
  const want = new THREE.Vector3(pl.x, pl.y + 0.25, pl.z);
  // frame a little toward where a jump will land
  const land = opt.jumpFocus && !capOn ? landingPoint() : null;
  rig.aim = land;
  const frameAt = want.clone();
  let capSpan = 0;
  if (capOn) {
    const m = capMouth();
    if (cap.kind !== 'sundew') {
      capSpan = m.distanceTo(cap.mid.set(cap.x0, 0.25, cap.z0));
      // between you and the mouth, leaning toward the predator's body so its head and forebody are in frame
      frameAt.copy(m).add(cap.mid).multiplyScalar(0.5).lerp(capBody(), 0.3);
      const ax = Math.atan2(m.z - cap.z0, m.x - cap.x0);
      const side = Math.abs(wrapA(ax + Math.PI / 2 - rig.yaw)) < Math.abs(wrapA(ax - Math.PI / 2 - rig.yaw)) ? ax + Math.PI / 2 : ax - Math.PI / 2;
      rig.yaw += wrapA(side - rig.yaw) * (dt ? 1 - Math.exp(-dt * 2) : 1);
    } else frameAt.set(cap.x0, cap.y0 + 0.3, cap.z0);
  }
  // in a leap, frame low enough that the shadow below stays in the picture
  if (pl.mode === 'air') { const gy = groundAt(pl.x, pl.z).y; frameAt.y = gy + 0.25 + (pl.y - gy) * 0.35; }
  if (land) frameAt.lerp(new THREE.Vector3(land.x, land.y + 0.25, land.z), 0.3);
  const k = dt ? 1 - Math.exp(-dt * (pl.mode === 'air' ? 3.5 : 6)) : 1;
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

let renderScale = 1, dynRes = true, slowEma = 16, scaleT = 0;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(DPR * renderScale);
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
const CAP_VIEW = { stenus: { hfw: 12, pitch: 0.45 }, strider: { hfw: 16, pitch: 0.55 }, sundew: { hfw: 7, pitch: 0.75 } };
const CAP_TEXT = {
  stenus: { by: 'Stenus', how: 'harpooned you with its sticky labium, reeled you in and ate you',
    phases: { strike: 'Harpooned by Stenus!', hold: 'Reeled in…', eat: 'Stenus is eating you', eaten: 'Eaten' } },
  strider: { by: 'The water strider', how: 'seized you in its forelegs and sucked you dry',
    phases: { strike: 'Grabbed by a strider!', hold: 'Lifted to its beak…', eat: 'Being sucked dry', eaten: 'Eaten' } },
  sundew: { by: 'The sundew', how: 'wrapped you in its tentacles and closed its leaf over you',
    phases: { strike: 'The tentacles close!', hold: 'Wrapped in glue…', eat: 'The leaf folds over you', eaten: 'Digested' } },
};
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const capture = createCapture({ onRestart: () => { if (pl.lives > 0) respawn(); else newGame(); } });
/** The predator's mouth (or the trapped spot on a sundew) for the camera. */
function capMouth() {
  if (cap.kind === 'stenus') return stenus.mouthPos();
  if (cap.kind === 'strider') return strider.mouthPos();
  return new THREE.Vector3(cap.x0, cap.y0, cap.z0);
}
function capBody() {
  const s = cap.kind === 'stenus' ? stenus.st : strider.st;
  return new THREE.Vector3(s.x, 0.4, s.z);
}
/** A predator has you: control stops, and the whole catch is shown. */
function caught(kind) {
  if (capture.active || pl.mode === 'dead' || game.phase !== 'play') return;
  const P = pl;
  P.lives--;
  Object.assign(cap, { kind, x0: P.x, y0: P.y, z0: P.z, h0: P.heading, leaf: P.leaf, phase: null });
  P.mode = 'caught'; P.air = null; P.charging = false; P.charge = 0; P.vx = P.vz = 0; P.hunker = 0; P.eatT = 0;
  if (kind !== 'sundew') { P.pitch = 0; P.roll = 0; P.bend = 0; }
  if (hunger[kind]) hunger[kind].fed();
  const t = CAP_TEXT[kind];
  const left = P.lives > 0 ? `. ${P.lives} li${P.lives === 1 ? 'fe' : 'ves'} left` : `. No lives left (you ate ${P.food} clump${P.food === 1 ? '' : 's'}): A starts a new game`;
  capture.start({ by: t.by, how: t.how + left });
  hud.toast(t.phases.strike, 1500);
  rumble(450, 0.8, 1);
}
/** Pose the springtail and its captor for the current phase. */
function animateCapture(c, dt) {
  const P = pl;
  if (c.phase !== cap.phase) {
    cap.phase = c.phase;
    if (c.phase === 'hold') { rumble(300, 0.5, 0.7); if (cap.kind === 'strider') audio.play('springtail/raindrop', { volume: 0.25, rate: 1.8 }); }
    if (c.phase === 'eat') { audio.play('springtail/eat', { volume: 1, rate: cap.kind === 'stenus' ? 0.7 : 0.55 }); rumble(600, 0.6, 0.3); }
    if (c.phase === 'eaten') audio.play('springtail/eat', { volume: 0.7, rate: 0.5 });
  }
  // the mandibles' rhythm, heard while eating
  if (c.phase === 'eat' && cap.kind === 'stenus' && Math.floor(simT * 2.4) !== Math.floor((simT - dt) * 2.4)) audio.play('springtail/eat', { volume: 0.5, rate: 0.8 + Math.random() * 0.2 });
  let o;
  if (cap.kind === 'stenus') o = stenus.captureStep(c.phase, c.t, dt, cap);
  else if (cap.kind === 'strider') o = strider.captureStep(c.phase, c.t, dt, cap);
  else o = sundewStep(c.phase, c.t, dt);
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
  if (pad.kind !== 'controller') return;
  for (let b = 0; b < 16; b++) if (pad.value(b) > 0.5) { audio.unlock(); return; }
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
const rumble = (ms, a, b) => opt.rumble && pad.rumble(ms, a, b);

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

function die(cause) {
  if (pl.mode === 'dead' || game.phase !== 'play') return;
  pl.mode = 'dead';
  pl.deadT = 0;
  pl.cause = cause;
  pl.lives--;
  rumble(450, 0.8, 1);
  hud.toast(cause, 2400);
}

function respawn() {
  pl.x = START.x; pl.z = START.z; pl.vx = pl.vz = 0; pl.mode = 'film'; pl.air = null; pl.cock = 1; pl.roll = 0; pl.pitch = 0;
  pl.bend = 0; pl.furc = 0; pl.leaf = null; pl.struggle = 0; pl.scale = 1; pl.sy = 1; pl.flailK = 0; pl.heading = Math.PI / 2;
  for (const l of world.sundews.leaves) { l.target = null; l.grip = 0; l.close = 0; }
  capture.reset();
  cap.kind = null;
  stenus.reset();
  strider.reset();
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
  game.phase = 'play';
  card.classList.add('hide');
}

function landAt(g) {
  const a = pl.air;
  pl.air = null;
  pl.y = g.y;
  pl.vx = a.vx * 0.04; pl.vz = a.vz * 0.04;
  pl.landPulse = 1;
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
      if (P.lives > 0) respawn();
      else { game.phase = 'over'; showCard('Eaten', [`${P.cause}.`, `You ate ${P.food} clump${P.food === 1 ? '' : 's'} of food.`, '<b>Press A to try again</b>']); }
    }
    return;
  }

  if (P.mode === 'air') {
    const a = P.air;
    a.t += dt;
    const u = a.t / a.T;
    P.x += a.vx * dt; P.z += a.vz * dt;
    a.vy -= a.g * dt;
    P.y += a.vy * dt;
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

  // furcula: hold A to cock (a hop when tapped, a full jump at full charge), release to fire
  if (inp.dashDown && P.cock >= 1 && P.hunker < 0.5) {
    P.charging = true; P.charge = Math.min(1, P.charge + dt / 0.7);
    const d = mag > 0.25 ? dir : new THREE.Vector3(Math.cos(P.heading), 0, Math.sin(P.heading));
    P.aim = { x: d.x, z: d.z };
  }
  if (P.charging && !inp.dashDown) {
    P.charging = false;
    const d = mag > 0.25 ? dir : new THREE.Vector3(Math.cos(P.heading), 0, Math.sin(P.heading));
    jump(d.x, d.z, 0.12 + 0.88 * P.charge);
    P.charge = 0;
    return;
  }
  if (!P.charging) P.charge = 0;

  // graze
  if (inp.attackPressed && P.eatT <= 0) {
    const h = headPos();
    let best = null, bd = 0.85;
    for (const c of world.food.clumps) {
      if (c.bites <= 0) continue;
      const d = Math.hypot(c.x - h.x, c.z - h.z) - c.type.spread * 0.6;
      if (d < bd) { bd = d; best = c; }
    }
    P.eatT = 0.35;
    if (best) {
      audio.play('springtail/eat', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
      best.bites--;
      ripples.push({ x: P.x, z: P.z, strength: 0.35 });
      rumble(40, 0.15, 0);
      if (best.bites <= 0) {
        P.food++;
        hud.toast(`Ate ${best.type.name} (${P.food}/${GOAL})${P.food === GOAL ? ': now reach the moss edge!' : ''}`);
        best.respawnT = 6;
      }
    }
  }
  if (game.phase === 'play' && P.food >= GOAL && onMoss) {
    game.phase = 'won';
    showCard('Level 0 complete', [`Fed and safe up on the Sphagnum, with ${P.lives} li${P.lives === 1 ? 'fe' : 'ves'} to spare.`, 'Next in the Zoom Chain: down into the moss.', '<b>Press A to play again</b>']);
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

function stepWorld(dt) {
  const P = pl;
  const alive = P.mode !== 'dead' && P.mode !== 'caught' && game.phase === 'play';
  if (game.phase === 'play' && !capture.active) { hunger.stenus.update(dt); hunger.strider.update(dt); }
  rain.calm = hunger.stenus.state === 'grace' && hunger.strider.state === 'grace';
  // the beetle and the strider keep to the water near you, wherever you go
  if (Math.hypot(stenus.st.x - P.x, stenus.st.z - P.z) > 70 && stenus.st.state === 'patrol') {
    const c = nearbyWater(P.x, P.z, 32, 0.8);
    if (c) stenus.relocate(c.x, c.z);
  }
  if (Math.hypot(strider.st.x - P.x, strider.st.z - P.z) > 75 && strider.st.state === 'idle') {
    const c = nearbyWater(P.x, P.z, 34, 0.85);
    if (c) strider.relocate(c.x, c.z);
  }
  world.debris.update(dt, field, inPool);
  const ctxP = { x: P.x, y: P.mode === 'air' ? P.y : 0, z: P.z, vx: P.air ? P.air.vx : P.vx, vz: P.air ? P.air.vz : P.vz, airborne: P.mode === 'air', hunker: P.hunker > 0.5, moving: (P.moved > 0 && P.hunker < 0.5) || P.mode === 'air' || P.mode === 'stuck' || P.eatT > 0, alive };
  for (const e of stenus.update(dt, { player: ctxP, field, inPool, hungry: isHungry(hunger.stenus) })) {
    if (e === 'caught' && alive) caught('stenus');
    if (e === 'miss' && hunger.stenus.hungry) hunger.stenus.missed();
    if (e === 'spotted' && alive) audio.play('springtail/stenus-skim', { volume: 0.25, rate: 0.8 });
    if (e === 'skim') audio.play('springtail/stenus-skim', { volume: 0.7 });
    if (e === 'strike') audio.play('springtail/stenus-strike', { volume: 0.9 });
    if (e === 'skim') hud.toast('Stenus is skimming at you!', 1000);
    if (e === 'windup' && alive) rumble(300, 0.15, 0); // the head dips: jump now
  }
  for (const e of strider.update(dt, { player: ctxP, field, inPool, ripples, hungry: isHungry(hunger.strider) })) {
    if (e === 'caught' && alive) caught('strider');
    if (e === 'lost' && hunger.strider.hungry) hunger.strider.missed();
    if (e === 'heard' && alive && strider.st.heardT !== true) { strider.st.heardT = true; hud.toast('A water strider felt your ripples: keep still and hunker (B)', 1800); setTimeout(() => (strider.st.heardT = false), 6000); }
  }
  ripples.length = 0;
  for (const e of rain.update(dt, { field, inPool, mossAt: (x, z) => Math.max(0, mossTop(x, z)), player: ctxP })) {
    const d = Math.hypot(e.x - P.x, e.z - P.z);
    audio.play('springtail/raindrop', { volume: Math.max(0.12, Math.min(0.9, 4 / (d + 3))), rate: 0.92 + Math.random() * 0.16, pan: Math.max(-1, Math.min(1, (e.x - P.x) / 25)) });
    if (d < 6) rumble(250, Math.min(1, 3 / d), Math.min(1, 2 / d));
    if (!alive) continue;
    if (d < e.r * 0.95 && P.mode !== 'air') die('Swamped by a raindrop');
    else if (d < e.r * 3 && P.mode !== 'air' && P.mode !== 'stuck') {
      // thrown out of the crater
      const ax = P.x - e.x, az = P.z - e.z;
      P.mode = 'film';
      jump(ax, az, 0.35 * (1 - d / (e.r * 3)) + 0.15, { thrown: true });
    }
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
  p.nod = P.eatT > 0 ? Math.sin((P.eatT / 0.35) * Math.PI) : 0;
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
  const P = pl;
  if ((P.mode === 'film' || P.mode === 'flipped') && inPool(P.x, P.z)) {
    if (P.mode === 'film') for (const f of tail.feet()) dimples.add(f.x, f.z, 0.045, 0.03 + 0.02 * P.hunker);
    const c = tail.collophore();
    dimples.add(c.x, c.z, 0.06 + 0.06 * P.hunker, 0.012 + 0.05 * (P.hunker + P.landPulse));
    if (P.hunker > 0.2 || P.mode === 'flipped') dimples.add(P.x, P.z, 0.22, 0.035 * Math.max(P.hunker, P.mode === 'flipped' ? 1 : 0));
  }
  for (const c of stenus.contacts()) dimples.add(...c);
  if (strider.group.visible) for (const c of strider.contacts()) dimples.add(...c);
  for (const c of world.food.clumps) {
    if (c.bites <= 0 || c.respawnT > 0) continue;
    if (Math.hypot(c.x - rig.target.x, c.z - rig.target.z) < 30) dimples.add(c.x, c.z, c.type.spread * 0.7, 0.012 * c.bites);
  }
  world.debris.contacts(rig.target, (x, z, r, d) => dimples.add(x, z, r, d));
  // the drop shadow: straight down from the springtail onto whatever is below
  const drop = macroShared.uDrop.value;
  if (!opt.dropShadow || P.mode === 'dead' || P.mode === 'caught') { drop.set(0, -99, 0, 0); macroShared.uDropK.value = 0; }
  else if (P.mode === 'air') { drop.set(P.x, P.y + 0.1, P.z, 0.62); macroShared.uDropK.value = 0.85; }
  else { drop.set(P.x - Math.cos(P.heading) * 0.05, P.y + 0.06, P.z - Math.sin(P.heading) * 0.05, 0.62); macroShared.uDropK.value = 0.45; }
  // shadow casters
  let n = 0;
  const cast = (x, y, z, r, k) => { if (n < 8) { casters[n].set(x, y, z, r); casterK[n] = k; n++; } };
  if (P.mode !== 'dead' && P.scale > 0.3) cast(P.x, P.y + 0.25 * P.scale, P.z, 0.3 * P.scale, 0.55);
  if (stenus.group.visible) { const s = stenus.st; cast(s.x + Math.cos(s.a) * 1.2, 0.65, s.z + Math.sin(s.a) * 1.2, 0.55, 0.55); cast(s.x - Math.cos(s.a) * 1.2, 0.7, s.z - Math.sin(s.a) * 1.2, 0.45, 0.5); }
  if (strider.group.visible) { const s = strider.st; cast(s.x + Math.cos(s.a) * 1.8, 0.9, s.z + Math.sin(s.a) * 1.8, 0.6, 0.5); cast(s.x - Math.cos(s.a) * 1.6, 0.8, s.z - Math.sin(s.a) * 1.6, 0.5, 0.45); }
  for (const c of rain.casters()) cast(c[0], c[1], c[2], c[3], c[4]);
  for (; n < 8; n++) { casters[n].set(0, -99, 0, 0); casterK[n] = 0; }
}

// ---------------------------------------------------------------- input
function readInput(dt) {
  pad.poll();
  unlockOnPad();
  const idle = { move: { x: 0, y: 0, m: 0 }, dashDown: false, dashPressed: false, attackPressed: false, defend: false };
  menuOpen = features.update();
  if (menuOpen) return idle;
  hud.update(pad);
  // RS: yaw, and pitch by intent (+1 looks up: the camera swings down toward
  // the horizon), honouring the shared Invert Y. It works in either view.
  const look = ctl.look();
  rig.yaw += look.yaw * 1.9 * dt;
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
  const inp = { move: ctl.move(), dashDown: ctl.dash.down(), dashPressed: ctl.dash.pressed(), attackPressed: ctl.attack.pressed(), defend: ctl.defend.down() };
  if (game.phase !== 'play') {
    if (inp.dashPressed) newGame();
    return idle;
  }
  return inp;
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
  status.querySelector('.lives').textContent = '●'.repeat(Math.max(0, pl.lives)) + '○'.repeat(Math.max(0, 3 - pl.lives));
  const m = status.querySelector('.st-meter i');
  const furcTxt = status.querySelector('.furc');
  status.classList.toggle('caught', capture.active);
  const thr = status.querySelector('.threat');
  const hs = hunger.stenus, hr = hunger.strider;
  const hunting = ['stalk', 'skim', 'windup', 'strike'].includes(stenus.st.state) || strider.st.state === 'hunt';
  thr.textContent = capture.active ? '' : hunting ? 'Hunted!' : isHungry(hs) || isHungry(hr) ? `${[isHungry(hs) && 'Stenus', isHungry(hr) && 'Strider'].filter(Boolean).join(' & ')} hungry` : 'Calm';
  thr.classList.toggle('hot', hunting);
  if (capture.active && cap.phase) { furcTxt.textContent = CAP_TEXT[cap.kind].phases[cap.phase]; m.style.width = `${{ strike: 25, hold: 50, eat: 80, eaten: 100 }[cap.phase]}%`; m.style.background = '#e04f3a'; }
  else if (pl.mode === 'stuck') { furcTxt.textContent = 'Struggle'; m.style.width = `${pl.struggle * 100}%`; m.style.background = '#e07a5f'; }
  else if (pl.charging) { furcTxt.textContent = pl.charge > 0.98 ? 'Full jump' : 'Cocking'; m.style.width = `${pl.charge * 100}%`; m.style.background = '#f2cc8f'; }
  else { furcTxt.textContent = pl.cock < 1 ? 'Re-cocking' : 'Furcula'; m.style.width = `${pl.cock * 100}%`; m.style.background = pl.cock < 1 ? '#7a8a99' : '#9fd0ff'; }
  const info = renderer.info.render;
  hud.stats(`${pl.mode}${pl.mode === 'film' ? ` ${Math.hypot(pl.vx, pl.vz).toFixed(1)} mm/s` : ''}  Stenus: ${stenus.st.state} (${hs.state} ${hs.left.toFixed(0)} s)  strider: ${strider.st.state} (${hr.state} ${hr.left.toFixed(0)} s)${capture.active ? `  capture: ${cap.kind} ${cap.phase}` : ''}\n${MACRO_LOOKS[rig.look].name}${renderScale < 1 ? ` (res ${(renderScale * 100).toFixed(0)}%)` : ''}\n${fps.toFixed(0)} fps  ${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris`);
}

// ---------------------------------------------------------------- loop
let simT = 0, menuOpen = false;
function step(dt, inp) {
  simT += dt;
  macroShared.uTime.value = simT;
  // keep the ripple window on the springtail; its water mask only needs the islands near it
  const near = ISLANDS.filter((I) => Math.hypot(I.x - pl.x, I.z - pl.z) < field.size + I.r);
  field.inside = (x, z) => poolE(x, z) < 1 && near.every((I) => Math.hypot(x - I.x, z - I.z) > I.r);
  field.recenter(pl.x, pl.z);
  const c = capture.update(dt, menuOpen ? null : pad);
  if (game.phase === 'play' || game.phase === 'title') stepPlayer(dt, inp);
  stepWorld(dt);
  if (c.active) animateCapture(c, dt);
  poseTail(simT);
  world.food.update((x, z) => field.height(x, z) + dimples.height(x, z) * 0.5);
  updateContacts();
}
function render(dt) {
  const L = placeCamera(dt);
  field.upload();
  macro.render(scene, camera, { lens: L, look: lookDef, dofK: rig.dofK });
  return L;
}

const api = {
  scene, camera, renderer, macro, field, dimples, tail, stenus, strider, rain, world, pl, rig, game, features, paused: false,
  step(dt = 1 / 60, inp = { move: { x: 0, y: 0, m: 0 }, dashDown: false, dashPressed: false, attackPressed: false, defend: false }) { step(dt, inp); },
  render(dt = 0) { const L = render(dt); updateText(L); },
  jump, newGame, respawn, inPool, groundAt, hunger, capture, cap, pace,
  get time() { return simT; },
  /** Testing: one fixed step with the left stick at (x, y) (null: hands off). */
  testStep(dt = 1 / 30, stick = null) {
    if (game.phase !== 'play') newGame();
    const m = stick ? Math.min(1, Math.hypot(stick.x, stick.y)) : 0;
    step(dt, { move: { x: stick ? stick.x : 0, y: stick ? stick.y : 0, m }, dashDown: false, dashPressed: false, attackPressed: false, defend: false });
  },
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
  forceCapture(kind = 'stenus') {
    if (game.phase !== 'play') newGame();
    if (capture.active) return;
    const P = pl;
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
  /** Hide the moss and sundews (turnaround renders on open water). */
  isolate(on) { world.group.children.forEach((c) => { if (c !== world.sky) c.visible = !on; }); },
};
window.__micro = api;

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
  const inp = readInput(dt);
  game.t += dt;
  if (game.phase === 'title' && game.t > 0.1) { /* the pool lives while the card is up */ }
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

// Springtail prototype (Zoom Chain, Level 0): the water springtail Podura
// aquatica on a bog pool's surface film, seen through a macro lens.
// Units: mm and seconds.
import * as THREE from '../shared/vendor/three.module.min.js';
import { embed } from '../shared/embed.js';
import { createPlayers, PLAYER_COLORS } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks, portalArrowOn } from '../shared/landmark.js';
import { mountHud, setHTML } from '../shared/hud.js';
import { createControls, hudControls, addInvertY } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { loadTexture } from '../shared/assets.js';
import { createMacro, lens, macroShared, applyLook, MACRO_LOOKS } from '../shared/techniques/springtail-macro.js';
import { RippleField, Dimples, waterMaterial, waterGeometry, peatFloorTexture } from '../shared/techniques/springtail-surface.js';
import { buildWorld, inPool, poolE, mossTop, islandEdge, ISLANDS, POOL_GLSL, SHORE_GLSL, BANK_E, START, ZONES, PORTAL, PORTALS, GROUND, PONDWEED, focusPortal, nearestPortal, pondweedAt, distFromStart, setZoneAt, parkZone, DIRECTOR, ENCOUNTERS, canPlace, inReach, FORWARD_YAW } from './world.js';
import { createDirector } from '../shared/director.js';
import { createQuality } from '../shared/quality.js';
import { createCrowd } from '../shared/crowd.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';
import { createLandmarkProps, RAFT_SHOW } from './landmarks.js';
import { createPortalLight } from '../shared/portal.js';
import { createWolfSpider, LEASH as BOSS_LEASH } from './boss.js';
import { createSpringtail } from './springtail.js';
import { updateJumpInput, takeQueuedJump } from './jump-input.js';
import { SUNDEW_PHASES, CATCH_PHASES, REFORM, digestion, reform } from './sundew-digestion.js';
import { newStruggle, stepStruggle } from './sundew-struggle.js';
import { createGlue } from './sundew-glue.js';
import { createMotes, surfacePoint } from './motes.js';
import { createStenus, createStrider, createRain } from './enemies.js';
import { createHunger, createCapture, createFight } from '../shared/predation.js';
import { t as tt, tx as ttx, fill } from '../shared/text.js';
import { createCamLock } from '../shared/camlock.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
const PR = Number(new URLSearchParams(location.search).get('pr')) || 0; // testing override: a fixed pixel ratio, no quality governor
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(10, 16 / 9, 4, 2600);
const macro = createMacro(renderer);
const _dbs = new THREE.Vector2();

/** Delivered art, or null: ids may not exist in asset-list.js yet. */
function art(id, opts) {
  try { return loadTexture(id, opts).catch(() => null); } catch { return Promise.resolve(null); }
}

// ---------------------------------------------------------------- water
// The water is the ground everywhere: one wide sheet that follows the camera
// (fine cells close up, coarse to the horizon), with the ripple simulation an
// 84 mm window that scrolls with the springtail.
const field = new RippleField({ size: 84, n: 256, inside: inPool });
field.useFloat(renderer); // a float upload where linear filtering of float textures exists (no per-texel half-float packing)
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
// a digested springtail's drifting motes, and a respawn's gathering ones (motes.js)
const motes = createMotes(scene);
const stenus = createStenus(scene);
const strider = createStrider(scene);
// each predator keeps to its own water (world.js ZONES), put where it meets you by the director
stenus.st.zone = ZONES.stenus;
strider.st.zone = ZONES.strider;
const rain = createRain(scene);
const props = createLandmarkProps(world, { pixelHeight: () => renderer.getDrawingBufferSize(_dbs).y });
scene.add(props.group);
// A mass of Podura on still water at the edge of the strider's water
// (combat-ideas.md §0 idea 5, a labelled departure: their protection is
// unverified). Slate blue-black bodies a springtail long; you push through
// them, and hidden in the mass (moving little) the strider's lock wanders to
// the others, so it often rows at the wrong one.
// It is simulated in its own frame (crowdG): placing the group moves the
// region and every member with it.
const crowdG = new THREE.Group();
scene.add(crowdG);
const crowd = createCrowd({
  scene: null, THREE, count: 220, region: { x: 0, z: 0, r: ZONES.crowd.r }, radius: 0.42, speed: 0.25, playerRadius: 0.8, respawn: Infinity, sit: 0.45,
  height: (x, z) => field.height(x + crowdG.position.x, z + crowdG.position.z),
  geometry: new THREE.SphereGeometry(1, 12, 8).scale(1.7, 0.75, 0.9),
  material: litMaterial({ surface: 'float n = mNoise(vLocal.xz * 6.0); s.albedo = mix(vec3(0.03, 0.035, 0.05), vec3(0.06, 0.065, 0.09), n); s.rough = 0.55; s.sheen = 0.5; s.sheenCol = vec3(0.35, 0.4, 0.5);' }),
});
crowd.mesh.frustumCulled = true;
crowdG.add(crowd.mesh);
crowdG.position.set(ZONES.crowd.x, 0, ZONES.crowd.z);
const crowdBodies = [];
// The bosses: a pond wolf spider at every portal raft (boss.js), made the
// first time someone comes near its hunting ground (`spiderFor`). It rests on
// the raft's rim (its post, facing out toward the start), goes out on rounds
// of its ground (GROUND.r round the raft, the pondweed patch) and walks back,
// and backs off under the raft (home) when worn down. Spiders whose ground
// nobody is near are parked: hidden and not updated (`stepSpiders`). `boss`
// is the one in focus: the spider of the portal nearest the players, the one
// that hunts them, fights and catches (`focusSpider`).
const spiders = PORTALS.map(() => null);
/** The spider of portal i (made on first use). */
function spiderFor(i) {
  if (spiders[i]) return spiders[i];
  const L = PORTALS[i], ux = Math.cos(L.a), uz = Math.sin(L.a);
  // its post: on the raft's near rim (toward the start), facing out; it backs off over the raft when beaten
  const s = createWolfSpider(scene, { post: { x: L.x - ux * (PORTAL.r - 3), z: L.z - uz * (PORTAL.r - 3), a: L.a + Math.PI }, home: { x: L.x + ux * 12, z: L.z + uz * 12 }, ground: { x: L.x, z: L.z, r: GROUND.r - 6 }, seed: i + 1 });
  s.portal = i; s.parked = false;
  spiders[i] = s;
  return s;
}
let boss = spiderFor(0);
// hidden and parked until the director places them (placeEncounter)
stenus.setVisible(false); strider.setVisible(false); crowd.mesh.visible = false;
stenus.relocate(ZONES.stenus.x, ZONES.stenus.z);
strider.relocate(ZONES.strider.x, ZONES.strider.z);

art('MP-S01').then((t) => { if (t) { waterMat.uniforms.uSurfTex.value = t; waterMat.uniforms.uHasSurfTex.value = 1; } });
art('MP-S02').then((t) => t && world.setMossTex(t));
art('MP-S03', { repeat: false }).then((t) => { if (t) { macroShared.uBackdrop.value = t; macroShared.uHasBackdrop.value = 1; } });
art('MP-S04', { repeat: false }).then((t) => t && world.sundews.setTexture(t));
art('MP-S05', { repeat: false }).then((t) => t && rain.setSprite(t));
art('MP-S06', { repeat: false }).then((t) => t && world.pondweed.setTexture(t));

// ---------------------------------------------------------------- player
// START (world.js): mid-pool; the rings (and the way on) lie round it
let pl = {
  x: START.x, z: START.z, y: 0, vx: 0, vz: 0, heading: Math.PI / 2, mode: 'film',
  charge: 0, charging: false, queuedJump: null, cock: 1, hunker: 0, eatT: 0, flipT: 0, roll: 0, pitch: 0, bend: 0, furc: 0,
  air: null, leaf: null, struggle: 0, deadT: 0, cause: '', walk: 0, lives: 3, food: 0, moved: 0, landPulse: 0, onIsland: false,
  scale: 1, sy: 1, flailK: 0, digestWhite: 0, dissolve: 0, wriggle: 0,
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
const alive = (P) => P.mode !== 'dead' && P.mode !== 'caught' && P.mode !== 'reform';
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
  onJoin: (p) => { joins.push({ slot: p.slot, padIndex: p.padIndex }); syncPlayers(); audio.play('shared/join', { volume: 0.6 }); hud.toast(tt('shared.players.joined', { n: p.slot + 1 })); embed.join(p.slot, p.color, p.name, players.toJSON()); }, // the roster rides along, so the shell carries this player into the next world
  onLeave: (p) => { syncPlayers(); hud.toast(tt('shared.players.left', { n: p.slot + 1 })); embed.leave(p.slot); },
  onChange: (list) => hud && hud.players(list),
});
const pad = players.pad(0);
const ctl = createControls(pad);
const hud = mountHud({
  title: tt('springtail.hud.title'),
  sub: tt('springtail.hud.sub'),
  controls: hudControls({
    move: tt('springtail.hud.controls.move'),
    camera: tt('springtail.hud.controls.camera'),
    dash: tt('springtail.hud.controls.dash'),
    attack: tt('springtail.hud.controls.attack'),
    defend: tt('springtail.hud.controls.defend'),
    special: tt('springtail.hud.controls.special'),
    secondary: tt('springtail.hud.controls.secondary'),
    look: tt('springtail.hud.controls.look'),
    zoom: tt('springtail.hud.controls.zoom'),
    extra: [['RT', tt('springtail.hud.controls.focusAhead')], ['LT', tt('springtail.hud.controls.focusNear')]],
  }),
  note: tt('springtail.hud.note'),
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
status.innerHTML = `<span class="food"></span><span class="lives"></span><span class="furc">${tt('springtail.status.furcula')}</span><span class="st-meter"><i></i></span><span class="threat"></span>`;
const card = document.createElement('div');
card.className = 'st-card';
card.innerHTML = `<div><img alt=""><h2>${tt('springtail.card.title')}</h2>${ttx('springtail.card.paragraphs').map((p) => `<p>${fill(p)}</p>`).join('')}<p><b>${tt('springtail.card.start')}</b></p></div>`;
// the boss's resolve: a quiet brass gauge, shown while it is engaged
const gauge = document.createElement('div');
gauge.className = 'st-gauge';
gauge.innerHTML = `<span class="nm">${tt('springtail.spider.name')}</span><span class="g"><i></i></span>`;
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
// The world's forward (the owner, 2026-11-03: the camera's turn is locked to it, so the layout has a
// "forward"): the camera looks along -(cos, sin) of this yaw, i.e. toward +x and a little -z (see README).
const camLock = createCamLock({ forward: FORWARD_YAW });
const rig = { yaw: FORWARD_YAW, pitch: PITCH_LOW, wantPitch: PITCH_LOW, pitchLow: PITCH_LOW, get mode() { return this.wantPitch > 1.05 ? 'top' : 'low'; }, zi: 1, ai: 4, target: new THREE.Vector3(START.x, 0.25, START.z), look: 0, lens: null, dofK: 1, aim: null };
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
// Two to four players share one view, zoomed out up to this far (the lens's
// field 1.8x wide) before the screen splits; split views settle at 0.75 of it.
const SPLIT_ZOOM_MAX = 1.8;
let groupZoom = 1;
function placeCamera(dt) {
  // while a predator has you, the lens widens (or closes in) to frame you and
  // it together, and swings side-on to the catch
  // after the catch (fadeOut), alone, the camera glides to where you will come back
  const glide = capture.active && cap.phase === 'fadeOut' && cap.to && cap.from && !cap.dip && !multi();
  const capOn = capture.active && cap.kind && cap.phase !== 'fadeIn' && !glide && !multi();
  // once it is eating, the lens pulls back and follows the predator with its meal
  const capFollow = capOn && cap.kind !== 'sundew' && ['eat', 'follow', 'fadeOut'].includes(cap.phase);
  // several players: frame the group (the split screen takes over when they part)
  const grp = recs().filter((P) => alive(P) && P.scale > 0.3);
  const mp = multi() && grp.length > 0;
  const gc = mp ? groupCentre(grp) : null;
  const base = 36 / ZOOMS[rig.zi];
  // stuck on a sundew leaf (alone): the lens closes in on the struggle
  const stuckView = !mp && pl.mode === 'stuck';
  const hfwWant = capOn ? CAP_VIEW[cap.kind].hfw * (capFollow ? 1.7 : 1) : stuckView ? Math.min(base, CAP_VIEW.sundew.hfw) : base;
  rig.hfw = rig.hfw === undefined || !dt ? hfwWant : rig.hfw + (hfwWant - rig.hfw) * (1 - Math.exp(-dt * 3));
  // a group in one view: the split screen's zoom-out (the lens's field widened,
  // the camera farther back on the same orbit) keeps everyone in frame; the
  // screen splits only once it is at its widest (shared/splitscreen.js)
  rig.zoom = mp ? groupZoom : 1;
  const L = (rig.lens = lens({ hfw: rig.hfw * rig.zoom, N: APERTURES[rig.ai] }));
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
  if (glide) {
    const u = cap.u * cap.u * (3 - 2 * cap.u);
    frameAt.set(cap.to.x, groundAt(cap.to.x, cap.to.z).y + 0.25, cap.to.z).sub(cap.from).multiplyScalar(u).add(cap.from);
  }
  // in a leap, frame low enough that the shadow below stays in the picture
  if (pl.mode === 'air' && !mp) { const gy = groundAt(pl.x, pl.z).y; frameAt.y = gy + 0.25 + (pl.y - gy) * 0.35; }
  if (land) frameAt.lerp(new THREE.Vector3(land.x, land.y + 0.25, land.z), 0.3);
  const k = dt ? 1 - Math.exp(-dt * (glide ? 14 : pl.mode === 'air' && !mp ? 3.5 : 6)) : 1;
  rig.target.lerp(frameAt, k);
  rig.wantPitch = THREE.MathUtils.clamp(rig.wantPitch, PITCH_MIN, PITCH_MAX);
  // stuck: look down onto the leaf, so the body stays in sight as it is pulled in
  const pitchWant = capOn ? CAP_VIEW[cap.kind].pitch : stuckView ? Math.max(rig.wantPitch, CAP_VIEW.sundew.pitch) : rig.wantPitch;
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
  let focusD = opt.autofocus ? camera.position.distanceTo(capOn || glide ? frameAt : want) : L.s;
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
  // near the portal raft and with it in front: deepen the focus (in effect) so the raft is sharp too
  if (PORTAL.placed && !capOn && !mp) {
    const dR = Math.hypot(pl.x - PORTAL.x, pl.z - PORTAL.z);
    if (dR < 26) {
      _v.set(PORTAL.x, props.position.y, PORTAL.z);
      const dT = camera.position.distanceTo(_v), dS = camera.position.distanceTo(want);
      if (dT < dS + 14) wantK = Math.max(wantK, THREE.MathUtils.clamp((Math.abs(dT - dS) + 1.5) / L.dof, 1, 14));
    }
  }
  rig.dofK += (wantK - rig.dofK) * (dt ? 1 - Math.exp(-dt * 6) : 1);
  rig.focusD = rig.focusD === undefined || !dt ? focusD : rig.focusD + (focusD - rig.focusD) * (1 - Math.exp(-dt * 8));
  macroShared.uFocus.value = rig.focusD;
  // RT / LT held (alone): look far or close (the catch, the glide, a sundew and the outro keep their cameras)
  rig.lookFx = null;
  const lu = !mp && !multi() && !capOn && !glide && !stuckView && !outro ? lookOf(pl.slot).u : 0;
  const fx = lookCamera(lu, L, rig.target, rig.focusD, rig.dofK);
  if (fx) { world.sky.position.copy(camera.position); macroShared.uFocus.value = fx.focus; rig.lookFx = fx; return fx.L; }
  return L;
}

// ---------------------------------------------------------------- looking far and close (RT / LT held)
// The owner (2026-11-02, revised): RT and LT change only the focus and the
// depth of field, never the lens, the camera's place or its angle. Held RT
// works like the focus of a jump (between the springtail and where it lands,
// stopped down until both are sharp), over a set band instead: from the
// springtail out to LOOK.reach mm ahead along the view (about two jumps; a
// full jump is 36 mm), so everything in front of you, plants and animals
// included, comes sharp rather than one distance past them. It eases in over
// LOOK.ease s. Held LT pulls the focal plane to the film in the lower part of
// the frame (LOOK.nearY) with the lens's own shallow depth. Let go and it eases
// back onto the springtail. Each player's own: alone it focuses the shared
// camera; with company each view takes its players' look (render).
const LOOK = { ease: 0.4, reach: 60, sharpPx: 1.2, nearY: -0.7 };
const looks = [], lookForce = [];
/** Player `slot`'s look: want (-1 close, 0, 1 far: the triggers) and u (eased, -1..1). */
function lookOf(slot) { return looks[slot] || (looks[slot] = { want: 0, u: 0 }); }
/** Ease every player's look toward what they hold (nothing while caught, stuck, re-forming or in the outro). */
function easeLook(dt) {
  for (const P of recs()) {
    const l = lookOf(P.slot);
    const held = lookForce[P.slot] !== undefined ? lookForce[P.slot] : l.want;
    const w = outro || game.phase !== 'play' || ['caught', 'stuck', 'dead', 'reform'].includes(P.mode) ? 0 : held;
    const k = dt / LOOK.ease;
    l.u = w > l.u ? Math.min(w, l.u + k) : Math.max(w, l.u - k);
  }
}
/** The look of a view: its players' strongest. */
function viewLook(slots) {
  let u = 0;
  for (const s of slots) { const l = looks[s]; if (l && Math.abs(l.u) > Math.abs(u)) u = l.u; }
  return u;
}
const _ld = new THREE.Vector3(), _la = new THREE.Vector3();
/** Distance from the camera to the film (y = 0) along the ray through screen height ndcY (-1..1) at the centre line; null if it misses. */
function filmDistAt(ndcY) {
  _la.set(0, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
  if (_la.y > -1e-3) return null;
  const t = -camera.position.y / _la.y;
  return t > 0 ? t : null;
}
/**
 * The look u (far > 0, close < 0) for `camera` as it stands (lens L): only the
 * focal plane and the depth of field change. Returns { L, focus, dofK, u }
 * (null at u = 0).
 */
function lookCamera(u, L, pivot, focus0, dofK0) {
  if (Math.abs(u) < 1e-3) return null;
  const e = THREE.MathUtils.smoothstep(Math.abs(u), 0, 1);
  camera.updateMatrixWorld();
  let focus, dofK;
  if (u > 0) {
    // the band from the springtail to LOOK.reach mm ahead along the view, all sharp
    const dS = camera.position.distanceTo(pivot);
    camera.getWorldDirection(_ld); _ld.y = 0;
    if (_ld.lengthSq() < 1e-6) _ld.set(0, 0, -1);
    _ld.normalize().multiplyScalar(LOOK.reach).add(pivot);
    _ld.y = Math.max(0, pivot.y - 0.25);
    const dF = camera.position.distanceTo(_ld);
    const lo = Math.max(1, Math.min(dS, dF) - 2), hi = Math.max(dS, dF) + 2;
    // The blur disc grows as |d - focus| / d (springtail-macro.js), so the band is
    // sharpest focused at the harmonic mean of its ends, stopped down until both
    // ends blur by under LOOK.sharpPx: beyond the band it softens again.
    const F = (2 * lo * hi) / (lo + hi), rel = (hi - lo) / (hi + lo);
    const k = THREE.MathUtils.clamp((L.cocK(macro.sceneRT.width) * rel) / LOOK.sharpPx, 1, 2000);
    focus = focus0 + (F - focus0) * e;
    dofK = dofK0 + (Math.max(dofK0, k) - dofK0) * e;
  } else {
    const d = filmDistAt(LOOK.nearY) ?? focus0 * 0.85;
    focus = focus0 + (Math.min(focus0, d) - focus0) * e;
    dofK = dofK0 + (1 - dofK0) * e; // the lens's own shallow depth
  }
  return { L, focus, dofK, u };
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

// The quality governor (shared/quality.js) sets the resolution: its render
// scale (stepped down when frames run long) times the split factor (a split
// screen renders the macro chain once per view, so each view renders at 0.7,
// or 0.55 for 3-4 views); its effects level sets the bokeh gather's taps.
let slowEma = 16;
const quality = createQuality({ renderer: null, key: 'springtail', min: 0.45, max: 1,
  onChange: ({ level }) => { macro.options.taps = [24, 40, 64][level]; resize(); } });
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(PR || quality.pixelRatio * quality.scale);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  macro.resize(v.x, v.y);
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- threats: pacing and being eaten
// shared/predation.js: calm until a player reaches its water, then hunger that comes and goes. Only a
// hungry Stenus stalks and strikes, only a hungry strider answers ripples and
// grabs; a resting one patrols or rows about. Every catch plays out on screen
// (strike, hold, eat, then the Eaten card).
// The challenges wait on rings round the start (world.js ZONES): each
// predator stays calm ('grace') until a player first comes into its water,
// then, after `pace.grace` seconds, its hunger comes and goes as before. So
// the calm stretches between them stay calm whatever the clock says.
const pace = { grace: 0, mode: 'Comes and goes', anywhere: false };
const hunger = { stenus: createHunger({ grace: Infinity }), strider: createHunger({ grace: Infinity }) };
const isHungry = (h) => (pace.mode === 'Never' ? false : pace.mode === 'Always' ? h.state !== 'grace' : h.hungry);
/** Re-arm the zones: calm until someone comes into each predator's water. */
function resetHunger() { hunger.stenus.reset(Infinity); hunger.strider.reset(Infinity); armed.stenus = armed.strider = false; }
const armed = { stenus: false, strider: false };
/** Is (x, z) within predator `k`'s reach (its water plus its leash)? */
const inZone = (k, x, z, pad = 0) => { const Z = ZONES[k]; return Math.hypot(x - Z.x, z - Z.z) < Z.r + Z.leash + pad; };
/** Is (x, z) in predator `k`'s own water (where a hunt can start)? */
const inCore = (k, x, z) => { const Z = ZONES[k]; return Math.hypot(x - Z.x, z - Z.z) < Z.r; };
// When each challenge first became active (progress: how many encounters are met, of the director's order, 0..1), for tests and tuning.
const challengeLog = {};
function logChallenge(kind, P) { if (!challengeLog[kind] && P) challengeLog[kind] = { progress: +encounterProgress().toFixed(3), d: +distFromStart(P.x, P.z).toFixed(1), x: +P.x.toFixed(1), z: +P.z.toFixed(1), t: +simT.toFixed(2) }; }
// ---------------------------------------------------------------- the encounters, placed as you go
// The director (shared/director.js; design/encounter-pattern.md "Placed as
// you go") places the enemies and events one at a time, in this order, in
// water nobody has seen, a little ahead of whoever is furthest along (or, if
// they linger, round them): Stenus, the water strider with its Podura mass,
// then the rain. Each comes only after the one before was met and a calm
// break has passed; nothing a player has seen is ever placed, moved or
// removed. Sundews, the pondweed and the portal rafts with their spiders are
// fixed (world.js). Until placed, each predator is hidden and parked
// (world.js parkZone). The portals stay closed until the director is done
// (`sealed`): nothing is skipped on the way to the way on.
const placed = { stenus: false, strider: false, rain: false };
const showPreds = () => {
  stenus.setVisible(placed.stenus && stenus.st.enabled);
  strider.setVisible(placed.strider && strider.st.enabled);
  crowd.mesh.visible = placed.strider;
};
// what each encounter does when placed, and when it counts as met
const ENC = {
  stenus: { place: (x, z, b) => placeEncounter('stenus', x, z, b),
    // in its reach (its water and its leash), or close to the beetle
    met: (h, [P]) => inReach('stenus', P.x, P.z) || Math.hypot(stenus.st.x - P.x, stenus.st.z - P.z) < 30 },
  strider: { place: (x, z, b) => placeEncounter('strider', x, z, b),
    met: (h, [P]) => inReach('strider', P.x, P.z) || inReach('crowd', P.x, P.z) || Math.hypot(strider.st.x - P.x, strider.st.z - P.z) < 30 },
  // from here on it rains round whoever leads (the last: then the portals open)
  rain: { place: () => { placed.rain = true; return true; }, met: () => true },
};
const director = createDirector({ ...DIRECTOR, canPlace, entries: ENCOUNTERS.map((e) => ({ ...e, ...ENC[e.id] })) });
/** How far through the encounters the game is: met / all (0..1). */
const encounterProgress = () => director.index / ENCOUNTERS.length;
/** The director puts encounter k at (x, z), met coming along bearing b (from the leader). */
function placeEncounter(k, x, z, b) {
  if (k === 'stenus') {
    setZoneAt('stenus', x, z, b);
    // the beetle starts at the spot the director chose (its patrol is about its water's centre)
    const st0 = stenus.startFor(0, 0);
    stenus.relocate(x - st0.x, z - st0.z);
    hunger.stenus.reset(Infinity); armed.stenus = false;
  } else if (k === 'strider') {
    setZoneAt('strider', x, z, b);
    setZoneAt('crowd', x, z, b);
    strider.relocate(x, z);
    crowdG.position.set(ZONES.crowd.x, 0, ZONES.crowd.z);
    crowdG.updateMatrixWorld(true);
    hunger.strider.reset(Infinity); armed.strider = false;
  }
  if (k in placed) placed[k] = true;
  showPreds();
  return { k, x, z, b };
}
// What every view sees, for the director: a frustum per split-screen view
// (the shared camera offset for it) and its focus (where it frames).
const viewPool = [0, 1, 2, 3].map(() => ({ frustum: new THREE.Frustum(), focus: new THREE.Vector3() }));
const _pm = new THREE.Matrix4();
let seenViews = null;
function directorViews() {
  const list = [];
  const n = Math.max(1, split.views.length);
  for (let i = 0; i < n && i < 4; i++) {
    const v = viewPool[i];
    split.withView(i, camera, () => {
      v.frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      const off = split.views[i] && split.views[i].offset && split.views[i].offset.isVector3 ? split.views[i].offset : null;
      v.focus.copy(rig.target); if (off) v.focus.add(off);
    });
    list.push(v);
  }
  seenViews = list;
}
function stepDirector(dt) {
  if (game.phase !== 'play' || outro) return;
  // in a portal's hunting ground before everything is met: the next encounter now, near them (no waiting out the break)
  if (!director.done && recs().some((P) => alive(P) && nearestPortal(P.x, P.z).d < GROUND.r)) { director.placeNow(); logChallenge('groundEarly', recs().find((P) => alive(P) && nearestPortal(P.x, P.z).d < GROUND.r)); }
  const ev = director.update(dt, recs().map((P) => ({ id: P.slot, x: P.x, z: P.z, alive: alive(P) })), seenViews);
  seenViews = null;
  for (const e of ev) if (e.type === 'met') logChallenge(`${e.id}Met`, pls[e.by && e.by[0]] || recs().find(alive) || pl);
  if (director.done && !challengeLog.portal) logChallenge('portal', recs().find(alive) || pl);
  driftStrider(dt);
}
/**
 * A strider placed beyond a lingering player's reach rows over to them: its
 * water (and so the strider, whose home keeps inside it) drifts toward the
 * leader at STRIDER_DRIFT mm/s until they are in its reach. Behaviour, not a
 * placement: the Podura mass stays where it was put. Near the start, among
 * the hand-placed islands, there is rarely open water for the strider and its
 * mass within reach of someone standing still.
 */
const STRIDER_DRIFT = 4;
function driftStrider(dt) {
  const S = director.entry('strider');
  if (!S || S.state !== 'placed' || simT - (S.placedSimT ?? (S.placedSimT = simT)) < 5 || strider.st.state === 'hunt' || strider.st.state === 'capture' || strider.st.st2 !== 'none') return;
  const lead = director.leader, P = lead && pls[lead.id];
  if (!P || lead.moving || inReach('strider', P.x, P.z)) return;
  const Z = ZONES.strider, a0 = Math.atan2(P.z - Z.z, P.x - Z.x), step = STRIDER_DRIFT * dt;
  // round any island in the way
  for (const da of [0, 0.6, -0.6, 1.2, -1.2]) {
    const nx = Z.x + Math.cos(a0 + da) * step, nz = Z.z + Math.sin(a0 + da) * step;
    if (islandEdge(nx, nz).d > 4) { Z.x = nx; Z.z = nz; return; }
  }
}
// The spider's hint waits until someone is within PORTAL_HINT mm of a raft.
const PORTAL_HINT = 70;
/**
 * Don't skip (the owner: "ensure the user encounters each thing in the game
 * before giving them the boss and portal"): the portals are fixed, so a
 * player can reach one early. Until the director is done (Stenus, the
 * strider and its mass, and the rain all met) every portal is sealed: its
 * sparkle stays dim and reaching it turns you back, whatever its spider is
 * doing; meanwhile the director places the rest promptly round anyone in a
 * hunting ground (stepDirector). `testOpen` (placePortal) lifts it for tests.
 */
let testOpen = false;
const sealed = () => !testOpen && !director.done;
/** Put portal i in focus: the nearest to the players (its raft's glow and the outro, its spider the one that hunts). */
function focusSpider(i) {
  if (i === PORTAL.i && boss === spiders[i]) return;
  focusPortal(i);
  props.setFocus(i);
  boss = spiderFor(i);
}
/** The portals' state: hints shown, turned back. */
const portal = { hinted: false, turned: false, sealedSaid: false };
/** Is the wolf spider of portal i on guard at it (on its post, not lured off, out on its ground or beaten)? */
function guardedAt(i) {
  const s = spiders[i];
  if (!s) return true;
  if (!s.group.visible && !s.parked) return false;
  if (['gone', 'retreat'].includes(s.st.state)) return false;
  return Math.hypot(s.st.x - PORTALS[i].x, s.st.z - PORTALS[i].z) < 15;
}
/** The focus portal: guarded (or sealed)? */
const guarded = () => sealed() || guardedAt(PORTAL.i);

// A clean escape from the labium plays in slow motion for a moment.
let slowMo = 0;
const cap = { kind: null, x0: 0, y0: 0, z0: 0, h0: 0, leaf: null, phase: null, mid: new THREE.Vector3() };
// how close the lens frames each catch (field width, mm) and from how high
const CAP_VIEW = { boss: { hfw: 18, pitch: 0.5 }, stenus: { hfw: 12, pitch: 0.45 }, strider: { hfw: 16, pitch: 0.55 }, sundew: { hfw: 7, pitch: 0.75 } };
const CAP_TEXT = ttx('springtail.capture');
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// A catch plays out (strike, hold, eat), the camera pulls back and follows the
// predator a moment, then (no black fade: `fade: false`) glides to where you
// come back, beside a teammate or (alone) at your last safe spot, and you
// re-form there out of gathering motes (mode 'reform', REFORM s). None of it
// is skippable, and A held or mashed through it does nothing (P.lockA).
const capture = createCapture({ onRespawn: () => afterCatch(), fade: false });
// a glide longer than this dips through black instead of whipping across the pool
const GLIDE_MAX = 70;
function afterCatch() {
  const P = cap.who || P1;
  if (cap.leaf) { cap.leaf.target = null; cap.leaf.grip = 0; cap.leaf.close = 0; }
  if (cap.kind === 'stenus') stenus.release();
  if (cap.kind === 'strider') strider.release();
  if (cap.kind === 'boss') boss.release();
  if (multi()) respawnNear(P);
  else respawnSafe(P, cap.to);
  cap.kind = null; cap.to = null;
  startReform(P);
  P.dip = cap.dip;
  // a long way: the camera starts over on you (it was dipped to black)
  if (cap.dip && (P === P1 || multi())) { rig.hfw = undefined; rig.target.set(P.x, P.y + 0.25, P.z); }
  cap.dip = false;
}
/** Respawn alone: at the last safe spot (out of reach of both predators), or the start. */
function safeSpot(P) {
  return P.safe && Math.hypot(P.safe.x - stenus.st.x, P.safe.z - stenus.st.z) > 12 ? P.safe : spotNear(START.x, START.z, 0);
}
function respawnSafe(P, at = safeSpot(P)) {
  if (P.leaf) { P.leaf.target = null; P.leaf.grip = 0; P.leaf.close = 0; }
  resetBody(P, at.x, at.z);
  P.landPulse = 1;
}
/** Stuck on a sundew leaf: the struggle starts (sundew-struggle.js); the glue strands attach on the first step. */
function stickToLeaf(P, leaf) {
  P.air = null; P.mode = 'stuck'; P.leaf = leaf; P.y = leaf.y + 0.3; P.struggle = 0; P.pitch = 0; P.roll = 0; P.bend = 0;
  P.ax = P.x; P.az = P.z; P.tugX = undefined; P.tugZ = undefined; P.yank = 0; P.pauseSaid = false;
  P.stuckS = newStruggle(); P.glueOn = false;
  P.charging = false; P.charge = 0; P.queuedJump = null;
  leaf.target = new THREE.Vector3(P.x, P.y + 0.2, P.z);
  hud.toast(tt('springtail.toasts.stuckInGlue'), 2200);
}
/** Come back: hidden, then the body re-forms from motes gathering on it (poseTail seeds them), with a ripple ring. */
function startReform(P) {
  P.mode = 'reform'; P.reformT = 0; P.reformSeeded = false; P.reformRing = false;
  audio.play('shared/reform', { volume: 0.7 });
  P.dissolve = 1; P.digestWhite = 1; P.lockA = true;
  P.charging = false; P.charge = 0; P.queuedJump = null;
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
    hud.toast(gone ? tt('springtail.toasts.spiderGone') : tt(power > 1 ? (boss.open ? 'springtail.toasts.spiderPounceTarsus' : 'springtail.toasts.spiderPounce') : (boss.open ? 'springtail.toasts.spiderNipTarsus' : 'springtail.toasts.spiderNip')), 1600);
    return gone;
  }
  let gone = false;
  for (let i = 0; i < power && !gone; i++) gone = wearDown(kind, how);
  return gone;
}
/** Is P facing the predator at (x, z)? (heading within ~55°) */
const facingTo = (P, x, z) => Math.abs(wrapA(Math.atan2(z - P.z, x - P.x) - P.heading)) < 0.95;
const fightLog = { blocks: 0, bites: 0, retreats: 0, escapes: 0, slips: 0, dodges: 0 };
function wearDown(kind, how) {
  fightLog[how === 'bite' ? 'bites' : 'blocks']++;
  const gone = fights[kind].bitten();
  const pr = PRED[kind]();
  if (how === 'block') audio.play('shared/block', { volume: 0.8 });
  if (gone) {
    fightLog.retreats++;
    audio.play('shared/foe-flees', { volume: 0.7 });
    pr.retreat();
    hunger[kind].missed();
    hud.toast(tt(`springtail.predators.${kind}.gone`), 2200);
    fights[kind].reset();
  } else {
    pr.repel();
    hud.toast(tt(`springtail.predators.${kind}.${how === 'bite' ? 'nipped' : 'blocked'}`), 1500);
  }
  return gone;
}
/**
 * A predator's attack missed you (a clean escape, a slip off the labium, a
 * dodged lunge): its interest falls as for a nip, but it is not staggered, so
 * the two-stage strike plays on.
 */
function missFoe(kind, how) {
  fightLog[how === 'slip' ? 'slips' : how === 'escape' ? 'escapes' : 'dodges'] = (fightLog[how === 'slip' ? 'slips' : how === 'escape' ? 'escapes' : 'dodges'] || 0) + 1;
  const gone = fights[kind].bitten();
  if (!gone) return false;
  fightLog.retreats++;
  audio.play('shared/foe-flees', { volume: 0.7 });
  PRED[kind]().retreat();
  hunger[kind].missed();
  fights[kind].reset();
  hud.toast(tt(`springtail.predators.${kind}.missedTooOften`), 2200);
  return true;
}
/** Stage 1 went wrong: the labium's sticky pads hold you. Mash A to tear loose before it reels you in. */
function stickToLabium() {
  const P = pl;
  P.mode = 'labium'; P.air = null; P.charging = false; P.charge = 0; P.queuedJump = null; P.vx = P.vz = 0; P.hunker = 0; P.act = null; P.actT = 0; P.eatT = 0;
  P.wriggle = 0;
  hud.toast(tt('springtail.toasts.stuckOnLabium'), 1600);
  audio.play('springtail/land-sticky', { volume: 0.8, rate: 1.3 });
  rumble(220, 0.6, 0.5);
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
  Object.assign(cap, { kind, who: P, x0: P.x, y0: P.y, z0: P.z, h0: P.heading, leaf: P.leaf, phase: null, u: 0, to: null, dip: false,
    grip0: P.leaf ? P.leaf.grip : 0, close0: P.leaf ? P.leaf.close : 0 });
  if (P.glue) P.glue.clear();
  P.glueOn = false;
  if (P.leaf) P.leaf.shake = 0;
  P.mode = 'caught'; P.air = null; P.charging = false; P.charge = 0; P.vx = P.vz = 0; P.hunker = 0; P.eatT = 0; P.actT = 0; P.act = null;
  if (fights[kind]) fights[kind].reset();
  if (kind !== 'sundew') { P.pitch = 0; P.roll = 0; P.bend = 0; }
  if (hunger[kind]) hunger[kind].fed();
  const t = CAP_TEXT[kind];
  const left = !solo ? (P === P1 ? tt('shared.players.youComeBack') : tt('shared.players.playerComesBack', { n: P.slot + 1 })) : '';
  capture.start({ by: t.by, how: t.how + left, phases: kind === 'sundew' ? SUNDEW_PHASES : CATCH_PHASES });
  hud.toast(solo ? t.phases.strike : tt('shared.players.prefixed', { n: P.slot + 1, text: t.phases.strike }), 1500);
  embed.captured({ by: kind, player: P.slot });
  rumbleFor(P, 450, 0.8, 1);
}
/** Pose the springtail and its captor for the current phase. */
function animateCapture(c, dt) {
  const P = pl;
  if (c.phase !== cap.phase) {
    cap.phase = c.phase;
    if (cap.kind === 'sundew' && c.phase === 'strike') audio.play('springtail/sundew-fold', { volume: 0.85 });
    if (cap.kind === 'sundew' && c.phase === 'eat') audio.play('shared/death', { volume: 0.7 });
    if (c.phase === 'hold') { rumble(300, 0.5, 0.7); if (cap.kind === 'strider') audio.play('springtail/raindrop', { volume: 0.25, rate: 1.8 }); }
    if (c.phase === 'eat') { audio.play('springtail/eat', { volume: 1, rate: cap.kind === 'stenus' ? 0.7 : 0.55 }); rumble(600, 0.6, 0.3); }
    if (c.phase === 'follow') audio.play('springtail/eat', { volume: 0.7, rate: 0.5 });
    if (c.phase === 'fadeOut') {
      // where you will come back (alone: your last safe spot); the camera glides there
      cap.to = multi() ? null : safeSpot(P);
      cap.from = rig.target.clone();
      cap.dip = !!cap.to && Math.hypot(cap.to.x - cap.from.x, cap.to.z - cap.from.z) > GLIDE_MAX;
    }
  }
  cap.u = c.t;
  // a long way back dips through black (the camera jumps under it)
  if (c.phase === 'fadeOut' && cap.dip && (P === P1 || multi())) capture.veil.style.opacity = String(Math.min(1, c.t * 2.5));
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
  P.digestWhite = o.white || 0; P.dissolve = o.dissolve || 0;
}
/** The sundew's catch: tentacles fold over you, the glue holds, the blade cups and closes. */
function sundewStep(phase, u, dt) {
  const leaf = cap.leaf, ease = (x) => x * x * (3 - 2 * x);
  const out = { x: cap.x0, y: cap.y0, z: cap.z0, heading: cap.h0 + Math.sin(simT * 9) * 0.15, pitch: 0, roll: 0, scale: 1, flail: 1, ...digestion(phase, u) };
  if (!leaf) return out;
  // carry on from how far the struggle had already been lost (grip0, close0);
  // the blade stops part-closed, so the white motes are seen rising out of it
  const c1 = Math.max(cap.close0, 0.35), c2 = 0.6;
  if (phase === 'strike') { leaf.grip = cap.grip0 + (1 - cap.grip0) * ease(u); leaf.close = cap.close0; out.roll = Math.sin(simT * 16) * 0.3; }
  else if (phase === 'hold') { leaf.grip = 1; leaf.close = cap.close0 + (c1 - cap.close0) * ease(u); out.flail = 1 - 0.5 * u; out.roll = Math.sin(simT * 12) * 0.25 * (1 - u); out.y -= 0.06 * u; }
  else if (phase === 'eat') {
    const e = ease(u);
    leaf.grip = 1; leaf.close = c1 + (c2 - c1) * e;
    out.flail = 0.5 * (1 - u); out.y -= 0.06 + 0.06 * e;
  } else { leaf.grip = 1; leaf.close = c2; out.flail = 0; out.y -= 0.12; }
  leaf.target = new THREE.Vector3(out.x, out.y + 0.15 * out.scale, out.z);
  // digestion: whitish motes shed from the body as it dissolves, and drift up and away
  const shed = Math.round((out.dissolve - (pl.dissolve || 0)) * 480);
  if (shed > 0) {
    const ctr = _v.set(out.x, out.y + 0.2, out.z).clone();
    for (let i = 0; i < shed; i++) motes.shed(surfacePoint(tail), ctr);
  }
  return out;
}

// ---------------------------------------------------------------- features
const features = createFeatures({ key: 'springtail', pad });
const F = (o) => features.add(o);
F({ id: 'aperture', group: 'Optics', choices: APERTURES.map((n) => `f/${n}`), value: 'f/11',
  onChange: (v) => { const i = APERTURES.indexOf(Number(v.slice(2))); if (i >= 0) rig.ai = i; } });
const audio = createAudio(['springtail/amb-bog', 'springtail/jump', 'springtail/land-water', 'springtail/land-sticky', 'springtail/eat', 'springtail/raindrop', 'springtail/stenus-skim', 'springtail/stenus-strike', 'shared/portal-chime',
  'springtail/charge', 'springtail/flip', 'springtail/right', 'springtail/pounce', 'springtail/glue-snap', 'springtail/struggle', 'springtail/tear-free', 'springtail/sundew-fold', 'springtail/strider', 'springtail/spider', 'springtail/spider-lunge',
  'shared/portal-enter', 'shared/slowdown', 'shared/portal-near', 'shared/portal-sealed', 'shared/portal-appear', 'shared/danger', 'shared/block', 'shared/death', 'shared/reform', 'shared/foe-flees', 'shared/join']);
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
F({ id: 'dof', group: 'Rendering', on: true,
  onChange: (v) => (macro.options.dof = v) });
F({ id: 'rim', group: 'Rendering', on: true,
  onChange: (v) => (macro.options.rim = v ? 0.35 : 0) });
F({ id: 'caustics', group: 'Rendering', on: true,
  onChange: (v) => (waterMat.uniforms.uCaustics.value = v ? 1 : 0) });
F({ id: 'refraction', group: 'Rendering', fixed: true });
F({ id: 'velvet', group: 'Rendering', fixed: true });
F({ id: 'grain', group: 'Rendering', on: true, onChange: (v) => (macro.options.grain = v ? 0.012 : 0) });
quality.addToFeatures(features);
F({ id: 'look', group: 'Optics', choices: MACRO_LOOKS.map((l) => l.name), value: MACRO_LOOKS[0].name,
  onChange: (v) => { rig.look = MACRO_LOOKS.findIndex((l) => l.name === v); lookDef = applyLook(rig.look); } });
F({ id: 'thinlens', group: 'Optics', fixed: true });
F({ id: 'autofocus', group: 'Optics', on: true,
  onChange: (v) => (opt.autofocus = v) });
F({ id: 'jumpFocus', group: 'Optics', on: true,
  onChange: (v) => (opt.jumpFocus = v) });
F({ id: 'dropShadow', group: 'Rendering', on: true,
  onChange: (v) => (opt.dropShadow = v) });
F({ id: 'sheen', group: 'Rendering', on: true,
  onChange: (v) => { waterMat.uniforms.uSheen.value = v ? 1 : 0; waterMat.uniforms.uMeniscus.value = v ? 0.18 : 0; } });
F({ id: 'ripples', group: 'Simulation', on: true,
  onChange: (v) => { field.enabled = v; if (!v) field.clear(); } });
F({ id: 'cheapRipples', group: 'Simulation', on: false,
  onChange: (v) => { if (field.setResolution(v ? 128 : 256, v ? 120 : 240)) waterMat.uniforms.uFieldTexel.value = field.dx; } });
F({ id: 'marangoni', group: 'Simulation', on: true,
  onChange: (v) => (field.surfDecay = v ? 0.25 : 50) });
F({ id: 'showSurf', group: 'Simulation', on: false,
  onChange: (v) => (waterMat.uniforms.uShowSurf.value = v ? 1 : 0) });
F({ id: 'menisci', group: 'Simulation', choices: ['Exaggerated ~3x (game)', 'Life-like'], value: 'Exaggerated ~3x (game)',
  onChange: (v) => (dimples.scale = v.startsWith('Ex') ? 1 : 0.35) });
F({ id: 'righting', group: 'Simulation', choices: ['Real (85% upright)', 'Always upright'], value: 'Real (85% upright)',
  onChange: (v) => (opt.righting = v.startsWith('Real')) });
F({ id: 'slow', group: 'Simulation', choices: ['Slowed ~6x (playable)', 'Real time'], value: 'Slowed ~6x (playable)',
  onChange: (v) => (opt.slow = v.startsWith('Slow')) });
F({ id: 'pounce', group: 'Simulation', fixed: true });
F({ id: 'boss', group: 'World', fixed: true });
F({ id: 'sundewGlue', group: 'World', fixed: true });
F({ id: 'upose', group: 'Body', on: true,
  onChange: (v) => (opt.uPose = v) });
F({ id: 'sdf', group: 'Body', fixed: true });
F({ id: 'stenus', group: 'World', on: true, onChange: (v) => { stenus.st.enabled = v; stenus.setVisible(v && placed.stenus); } });
F({ id: 'strider', group: 'World', on: true, onChange: (v) => { strider.st.enabled = v; strider.setVisible(v && placed.strider); } });
F({ id: 'rain', group: 'World', choices: ['Sometimes', 'Often', 'Off'], value: 'Sometimes',
  onChange: (v) => { rain.enabled = v !== 'Off'; rain.every = v === 'Often' ? 3.5 : 7; } });
F({ id: 'grace', group: 'World', choices: ['Off', '5 s', '15 s'], value: 'Off',
  onChange: (v) => { pace.grace = v === 'Off' ? 0 : parseFloat(v); resetHunger(); } });
F({ id: 'hunger', group: 'World', choices: ['Comes and goes', 'Always', 'Never'], value: 'Comes and goes',
  onChange: (v) => (pace.mode = v) });
addInvertY(features);
F({ id: 'camrel', group: 'Controls', fixed: true });
F({ id: 'rumble', group: 'Controls', on: true, onChange: (v) => (opt.rumble = v) });
const rumbleFor = (P, ms, a, b) => opt.rumble && players.pad(P.slot || 0).rumble(ms, a, b);
const rumble = (ms, a, b) => rumbleFor(pl, ms, a, b);

// ---------------------------------------------------------------- gameplay
const ripples = [];
const bossRipples = [];
const bossSaid = { wake: false };
const casters = macroShared.uCasters.value, casterK = macroShared.uCasterK.value;
const headPos = () => new THREE.Vector3(pl.x + Math.cos(pl.heading) * 0.68, pl.y, pl.z + Math.sin(pl.heading) * 0.68);
/** What lies under (x, z): moss (an island or the bank), a floating piece of debris, or the water film. */
const groundAt = (x, z) => {
  const m = mossTop(x, z);
  if (m > -Infinity) return { y: m, kind: 'moss' };
  const d = world.debris.at(x, z);
  if (d) return { y: d.top, kind: 'debris', piece: d };
  const w = pondweedAt(x, z);
  if (w) return { y: w.top, kind: 'leaf', leaf: w };
  return { y: field.height(x, z), kind: 'film' };
};
/** The player mode for standing on a ground kind: debris and pondweed leaves are solid footing, like moss. */
const modeFor = (kind) => (kind === 'film' ? 'film' : 'moss');

function jump(dirX, dirZ, power, { thrown = false } = {}) {
  const p = Math.max(0.12, Math.min(1, power));
  const R = 3 + 33 * p; // mm (real full jump ~48 body lengths)
  const H = R * 0.3 + 0.6;
  let T = 0.32 + 0.53 * Math.sqrt(p);
  if (!opt.slow) T *= 0.17;
  const n = Math.hypot(dirX, dirZ) || 1;
  pl.air = { p, t: 0, T, vx: (dirX / n) * (R / T), vz: (dirZ / n) * (R / T), vy: (4 * H) / T, g: (8 * H) / (T * T), upright: thrown ? Math.random() < 0.5 : (!opt.righting || Math.random() < 0.85), uPose: opt.uPose, thrown, spin: 1 + Math.random() * 0.6 };
  if (!opt.uPose) pl.air.upright = Math.random() < 0.5;
  if (pl.mode === 'flipped') pl.air.upright = true;
  pl.heading = Math.atan2(dirZ, dirX);
  pl.mode = 'air';
  pl.cock = 0;
  pl.furc = 1;
  pl.flipT = 0;
  if (inPool(pl.x, pl.z) && pl.y < 0.5 && !world.debris.at(pl.x, pl.z) && !pondweedAt(pl.x, pl.z)) {
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
      audio.play('springtail/pounce', { volume: 0.9, old: ['springtail/eat', { volume: 1, rate: 1.2 }] });
      if (inPoolHere) { field.drop(P.x, P.z, 1.2, -0.14); ripples.push({ x: P.x, z: P.z, strength: 1.2 }); }
      biteFoe(t.foe, P, 2, 'bite');
      // rebound off it
      const ax = P.x - (t.x), az = P.z - (t.z);
      P.mode = 'film';
      jump(ax || -Math.cos(P.heading), az || -Math.sin(P.heading), 0.22);
      if (P.air) P.air.upright = true;
      hud.toast(tt(`springtail.predators.${t.foe === 'boss' || t.foe === 'stenus' ? t.foe : 'strider'}.pounceOn`), 1200);
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
    if (c.bites <= 0) { P.food++; c.respawnT = 6; hud.toast(tt('springtail.toasts.pouncedOn', { name: c.type.name, food: P.food, goal: GOAL })); }
  } else if (!(t && t.food)) {
    // a clear miss: a splash, a stagger
    hud.toast(tt('springtail.toasts.missed'), 900);
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
  audio.play('shared/death', { volume: 0.7 });
  rumbleFor(pl, 450, 0.8, 1);
  hud.toast(cause, 2400);
}

/** Put a springtail down, fresh, at (x, z). */
function resetBody(P, x, z) {
  P.x = x; P.z = z; P.vx = P.vz = 0; P.mode = 'film'; P.air = null; P.cock = 1; P.roll = 0; P.pitch = 0; P.charging = false; P.charge = 0; P.queuedJump = null;
  P.bend = 0; P.furc = 0; P.leaf = null; P.struggle = 0; P.scale = 1; P.sy = 1; P.flailK = 0; P.heading = Math.PI / 2; P.hunker = 0; P.eatT = 0; P.deadT = 0;
  P.digestWhite = 0; P.dissolve = 0; P.rightT = undefined; P.flipHop = 0;
  if (P.glue) P.glue.clear();
  P.glueOn = false; P.stuckS = null; P.reformT = 0; P.dip = false;
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
  for (const l of world.sundews.leaves) { l.target = null; l.grip = 0; l.close = 0; l.shake = 0; }
  capture.reset();
  capture.veil.style.opacity = '0';
  motes.clear();
  cap.kind = null;
  stenus.reset();
  strider.reset();
  // every spider back on its post (one that was beaten stays gone), parked until someone is near
  for (const s of spiders) if (s && s.st.state !== 'gone') { s.release(); s.parked = true; s.setVisible(false); }
  placeThreatsAway();
  rain.clear();
  resetHunger();
}
/** Put the beetle and the strider back in their own water (where the director placed it). */
function placeThreatsAway() {
  stenus.relocate(ZONES.stenus.x, ZONES.stenus.z);
  strider.relocate(ZONES.strider.x, ZONES.strider.z);
}
/** A new game: nothing placed yet (the director starts over; the predators hidden and parked); the portals sealed again, every spider back on guard. */
function resetEncounters() {
  director.reset();
  for (const k of ['stenus', 'strider', 'crowd']) parkZone(k);
  placed.stenus = placed.strider = placed.rain = false;
  showPreds();
  stenus.relocate(ZONES.stenus.x, ZONES.stenus.z); strider.relocate(ZONES.strider.x, ZONES.strider.z);
  crowdG.position.set(ZONES.crowd.x, 0, ZONES.crowd.z);
  testOpen = false;
  for (const s of spiders) if (s) { s.reset(); s.parked = true; s.setVisible(false); }
  portal.hinted = false; portal.turned = false; portal.sealedSaid = false; bossSaid.wake = false;
  lm.fired = false; lm.blocked = false;
  for (const k of Object.keys(challengeLog)) delete challengeLog[k];
}

function newGame() {
  if (outro) endOutro();
  lm.fired = false; lm.nearing = false;
  if (lm.readyOn) { lm.readyOn = false; embed.near('portal', false); }
  lm.ready.length = 0;
  pl.lives = 3; pl.food = 0;
  resetEncounters();
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
  if (!a.upright) { pl.mode = 'flipped'; pl.flipT = 0; pl.rightT = undefined; pl.flipHop = 0; pl.roll = Math.PI; rumble(160, 0.4, 0.3); audio.play('springtail/flip', { volume: 0.8 }); hud.toast(tt('springtail.toasts.onYourBack'), 1100); }
  else pl.mode = modeFor(g.kind);
  if (g.kind === 'film') {
    audio.play('springtail/land-water', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
    // adhesive landing: the wet collophore grabs the film, no bounce
    field.drop(pl.x, pl.z, 0.45, -0.07);
    // a charged landing is a big ripple (the wolf spider feels it: big)
    ripples.push({ x: pl.x, z: pl.z, strength: 1, big: (a.p || 0) >= 0.45 });
  } else audio.play('springtail/land-water', { volume: 0.3, rate: 1.35 + Math.random() * 0.1 });
  rumble(60, 0.2, 0.05);
}

/** On its back: it rights itself by itself after FLIP_SELF s (A does it at once); the flip takes FLIP_TIME s. */
const FLIP_SELF = 1.2, FLIP_TIME = 0.28;
function stepPlayer(dt, inp) {
  const P = pl;
  // back from a catch: A held (or still being mashed) from the struggle does nothing until it is let go
  if (P.lockA) {
    if (P.mode !== 'reform' && !inp.dashDown) P.lockA = false;
    else inp = { ...inp, dashDown: false, dashPressed: false };
  }
  P.furc += ((P.mode === 'air' ? (P.air && P.air.t / P.air.T > 0.55 ? 0.6 : 1) : P.cock < 1 ? 1 - P.cock : 0) - P.furc) * Math.min(1, dt * (P.mode === 'air' ? 30 : 6));
  P.landPulse = Math.max(0, P.landPulse - dt * 2.5);
  P.eatT = Math.max(0, P.eatT - dt);
  const camF = new THREE.Vector3(-Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  const camR = new THREE.Vector3(-camF.z, 0, camF.x);
  const dir = camF.clone().multiplyScalar(-inp.move.y).addScaledVector(camR, inp.move.x);
  const mag = Math.min(1, inp.move.m);
  if (dir.lengthSq() > 0) dir.normalize();
  const jumpAim = mag > 0.25 ? dir : { x: Math.cos(P.heading), z: Math.sin(P.heading) };
  updateJumpInput(P, inp, dt, { x: jumpAim.x, z: jumpAim.z });
  // A held: the furcula cocks (once per charge, on the edge)
  if (P.charging && !P.wasCharging && P.mode !== 'caught' && P.mode !== 'dead') audio.play('springtail/charge', { volume: 0.55 });
  P.wasCharging = P.charging;
  P.moved = Math.max(0, P.moved - dt);

  if (P.mode === 'caught') return; // posed by animateCapture
  if (P.mode === 'reform') {
    // re-forming at the respawn spot (startReform): no control, not skippable
    P.reformT += dt;
    const u = Math.min(1, P.reformT / REFORM);
    const r = reform(u);
    P.dissolve = r.dissolve; P.digestWhite = r.white; P.vx = P.vz = 0;
    const veil = capture.veil;
    if (P.dip && (P === P1 || multi())) veil.style.opacity = String(Math.max(0, 1 - P.reformT / 0.35));
    if (!P.reformRing && u > 0.55) {
      // the body settles onto the film: a ring spreads from it
      P.reformRing = true; P.landPulse = 1;
      if (inPool(P.x, P.z)) { field.drop(P.x, P.z, 0.5, -0.07); ripples.push({ x: P.x, z: P.z, strength: 0.5 }); }
      audio.play('springtail/land-water', { volume: 0.5, rate: 1.1 });
      rumble(80, 0.25, 0.1);
    }
    if (u >= 1) {
      P.dissolve = 0; P.digestWhite = 0; P.dip = false;
      if (veil.style.opacity !== '0') veil.style.opacity = '0';
      P.mode = modeFor(groundAt(P.x, P.z).kind);
    }
    return;
  }
  if (P.mode === 'dead') {
    P.deadT += dt;
    if (P.deadT > 2.4) {
      if (multi()) respawnNear(P);
      else respawnSafe(P);
      startReform(P);
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
        stickToLeaf(P, leaf);
        logChallenge('sundewStuck', P);
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

  if (P.mode === 'labium') {
    // held on the tip of Stenus's labium, being reeled in: mash A to come loose
    const tip = stenus.labTip();
    P.x = tip.x; P.z = tip.z; P.y = Math.max(0, field.height(P.x, P.z)) + 0.05;
    P.heading = stenus.st.a + Math.PI + Math.sin(simT * 13) * 0.4;
    P.roll = Math.sin(simT * 17) * 0.5; P.pitch = Math.sin(simT * 11) * 0.2;
    if (inp.dashPressed) { P.wriggle += 0.2; rumble(40, 0.35, 0.15); ripples.push({ x: P.x, z: P.z, strength: 0.3 }); }
    P.wriggle = Math.max(0, P.wriggle - dt * 0.35);
    if (stenus.st.state !== 'reel') { P.mode = 'film'; P.roll = 0; P.pitch = 0; return; }
    if (P.wriggle >= 1) {
      // torn loose: it costs the jump (the furcula re-cocks slowly), and the mandibles come next
      P.mode = 'film'; P.roll = 0; P.pitch = 0; P.wriggle = 0;
      P.cock = -12; // ~1 s before the next jump (jump-input.js re-cocks at 1 / 0.08 s)
      const away = stenus.st.a;
      P.vx = Math.cos(away) * 6; P.vz = Math.sin(away) * 6;
      stenus.slip();
      fightLog.slipT = simT;
      missFoe('stenus', 'slip');
      audio.play('springtail/tear-free', { volume: 0.8 });
      hud.toast(tt('springtail.toasts.wriggledFree'), 1800);
      rumble(160, 0.5, 0.3);
    }
    return;
  }

  if (P.mode === 'stuck') {
    // Stuck in the glue (sundew-struggle.js): tug with LS and kick with A,
    // both together; stop and the leaf pulls you in. The body thrashes with
    // each effort, the strands to its legs thin and snap (sundew-glue.js, in poseTail).
    P.vx = P.vz = 0;
    const leaf = P.leaf, S = P.stuckS;
    if (!P.glueOn) { P.glue = P.glue || createGlue(scene); P.glue.attach(leaf, tail.feet()); P.glueOn = true; }
    const r = stepStruggle(S, inp, dt);
    if (r.tug && dir.lengthSq() > 0) { P.tugX = dir.x; P.tugZ = dir.z; P.heading += wrapA(Math.atan2(dir.z, dir.x) - P.heading) * 0.25; }
    if (r.tug || r.kick) {
      P.yank = 1;
      rumble(40, r.both ? 0.4 : 0.25, 0.1);
      ripples.push({ x: P.x, z: P.z, strength: 0.35 });
      if (r.kick) P.furc = 1; // the furcula slaps against the leaf
      // the wriggle heard, at most every 0.35 s
      if (r.kick && !(P.struggleSndT > simT)) { P.struggleSndT = simT + 0.35; audio.play('springtail/struggle', { volume: 0.6, rate: 0.95 + Math.random() * 0.1 }); }
    }
    P.yank = Math.max(0, (P.yank || 0) - dt * 4);
    if (r.paused && !P.pauseSaid) { P.pauseSaid = true; hud.toast(tt('springtail.toasts.leafPulling'), 1400); }
    if (!r.paused) P.pauseSaid = false;
    // the pose: big bends and rolls with the effort, a lunge against the strands toward the stick
    const th = S.thrash;
    P.bend = th * 0.9 * Math.sin(simT * 13) - 0.15 * S.sink;
    P.roll = th * 0.35 * Math.sin(simT * 9.3) + (1 - th) * 0.05 * Math.sin(simT * 3);
    P.pitch = th * 0.12 * Math.sin(simT * 7.7);
    const pull = 0.16 * P.yank * (1 - S.sink);
    P.x = P.ax + (P.tugX || 0) * pull; P.z = P.az + (P.tugZ || 0) * pull;
    // held up on the glue drops at first; pulled in, down among the tentacles,
    // which fold over, and the blade starts to cup
    P.y = leaf.y + 0.3 - 0.32 * S.sink;
    leaf.grip = 0.8 * S.sink; leaf.close = 0.3 * S.sink;
    leaf.shake = (0.03 * th + 0.03 * P.yank) * Math.sin(simT * 23);
    leaf.target.set(P.x, P.y + 0.2, P.z);
    P.struggle = S.progress;
    if (r.escaped) {
      P.glue.clear(); P.glueOn = false;
      leaf.target = null; leaf.grip = 0; leaf.close = 0; leaf.shake = 0; P.leaf = null;
      P.mode = 'film'; P.roll = 0; P.pitch = 0; P.bend = 0;
      P.cock = 1;
      const tugged = S.t - S.lastTug < 0.7 && P.tugX !== undefined;
      jump(tugged ? P.tugX : P.x - leaf.x || 1, tugged ? P.tugZ : P.z - leaf.z, 0.3);
      rumble(160, 0.5, 0.3);
      audio.play('springtail/tear-free', { volume: 0.9 });
      hud.toast(tt('springtail.toasts.free'));
    } else if (r.engulfed) caught('sundew');
    return;
  }

  if (P.mode === 'flipped') {
    // On its back in the film (the 15% of landings that are not upright, or a
    // wave): legs and furcula kick, the film dimples and ripples round it, and
    // it rights itself with a little flip on A, or by itself after FLIP_SELF s.
    P.flipT += dt;
    const fl = inPool(P.x, P.z) ? field.flow(P.x, P.z) : [0, 0];
    P.x += fl[0] * dt; P.z += fl[1] * dt;
    P.y = groundAt(P.x, P.z).y;
    if (P.rightT !== undefined) {
      // the flip: a roll back over (pi -> 2 pi) with a small hop
      P.rightT += dt;
      const u = Math.min(1, P.rightT / FLIP_TIME);
      P.roll = Math.PI * (1 + u * u * (3 - 2 * u));
      P.flipHop = Math.sin(u * Math.PI) * 0.35;
      if (u >= 1) { P.roll = 0; P.pitch = 0; P.flipHop = 0; P.rightT = undefined; P.mode = modeFor(groundAt(P.x, P.z).kind); }
      return;
    }
    P.roll = Math.PI + Math.sin(P.flipT * 23) * 0.12; // rocking as the legs kick
    // the kicking legs ripple the film
    if (inPool(P.x, P.z) && Math.floor(P.flipT / 0.14) !== Math.floor((P.flipT - dt) / 0.14)) {
      const a = P.heading + (Math.random() - 0.5) * 2.4;
      field.drop(P.x + Math.cos(a) * 0.5, P.z + Math.sin(a) * 0.5, 0.25, -0.025);
    }
    if (inp.dashPressed && P.cock > 0.3 && P.flipT > 0.08) {
      // a flick of the furcula from the back: flip over into a little hop
      P.roll = 0; P.pitch = 0; P.mode = modeFor(groundAt(P.x, P.z).kind);
      jump(Math.cos(P.heading), Math.sin(P.heading), 0.12);
      if (P.air) P.air.upright = true;
    } else if (inp.dashPressed || P.flipT > FLIP_SELF) { P.rightT = 0; audio.play('springtail/right', { volume: 0.5 }); field.drop(P.x, P.z, 0.4, -0.05); ripples.push({ x: P.x, z: P.z, strength: 0.4 }); }
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
    if (s > 0.2 && P.hunker < 0.5) { P.mode = 'flipped'; P.flipT = 0; P.rightT = undefined; P.flipHop = 0; P.heading += (Math.random() - 0.5) * 2; rumble(200, 0.5, 0.3); audio.play('springtail/flip', { volume: 0.8 }); hud.toast(tt('springtail.toasts.flipped'), 1500); return; }
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
  // Surface leaves catch walkers too; the airborne branch checks landings separately.
  const stickyLeaf = world.sundews.leafAt(P.x, P.y, P.z);
  if (stickyLeaf) {
    stickToLeaf(P, stickyLeaf);
    logChallenge('sundewStuck', P);
    audio.play('springtail/land-sticky');
    rumble(200, 0.5, 0.4);
    return;
  }
  // the fight move rears the forebody (nose up), then drops it into the snap; the attack lunges low
  if (P.actT > 0 && (P.act === 'fight' || P.act === 'attack')) {
    const u = 1 - P.actT / P.actDur;
    P.pitch = P.act === 'fight' ? (u < 0.45 ? 0.55 * Math.sin((u / 0.45) * Math.PI / 2) : 0.55 * (1 - (u - 0.45) / 0.15)) : -0.15 * Math.sin(u * Math.PI);
    P.pitch = Math.max(-0.2, P.pitch);
  }

  // Release on the ground, or consume the jump prepared during the last arc.
  const queuedJump = takeQueuedJump(P);
  if (queuedJump) {
    let d = new THREE.Vector3(queuedJump.x, 0, queuedJump.z);
    let power = queuedJump.power;
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
          hud.toast(tt(P.food === GOAL ? 'springtail.toasts.ateLast' : 'springtail.toasts.ate', { name: c.type.name, food: P.food, goal: GOAL }));
          c.respawnT = 6;
        }
        P.eatFood = null;
      }
    }
    if (P.actT <= 0) P.act = null;
  }
  // last safe spot (for respawning alone): on the film or moss, no predator near
  P.safeT = (P.safeT || 0) + dt;
  // (and not by a raft, where a spider rests, nor near the spider: a respawn there would wake it at once)
  if (P.safeT > 1 && Math.hypot(stenus.st.x - P.x, stenus.st.z - P.z) > 15 && Math.hypot(strider.st.x - P.x, strider.st.z - P.z) > 18 && !world.sundews.leafAt(P.x, P.y + 0.1, P.z) &&
    nearestPortal(P.x, P.z).d > 45 && !(boss.group.visible && Math.hypot(boss.st.x - P.x, boss.st.z - P.z) < 40)) { P.safeT = 0; P.safe = { x: P.x, z: P.z }; }
  if (game.phase === 'play' && P.food >= GOAL && onMoss && !P.fedSaid) {
    P.fedSaid = true;
    hud.toast(!sealed() ? tt('springtail.toasts.fedOpen') : tt('springtail.toasts.fedSealed'), 3200);
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
  return { blocking, x: P.x, y: P.mode === 'air' ? P.y : 0, z: P.z, vx: P.air ? P.air.vx : P.vx, vz: P.air ? P.air.vz : P.vz, airborne: P.mode === 'air', hunker: P.hunker > 0.5, moving: (P.moved > 0 && P.hunker < 0.5) || P.mode === 'air' || P.mode === 'stuck' || P.mode === 'labium' || P.eatT > 0, alive: live };
}
function stepWorld(dt) {
  const P = pl;
  const preyS = preyFor(stenus.st.x, stenus.st.z), preyR = preyFor(strider.st.x, strider.st.z);
  const ctxS = ctxOf(preyS, stenus), ctxR = ctxOf(preyR, strider);
  // interest: falls while the prey faces a hunting predator close by, comes back when it turns away
  for (const [k, prey, pr] of [['stenus', preyS, stenus], ['strider', preyR, strider]]) {
    const hunting = k === 'stenus' ? ['stalk', 'windup', 'strike', 'repelled'].includes(pr.st.state) : pr.st.state === 'hunt' || pr.st.st2 !== 'none';
    const f = fights[k].update(dt, { near: hunting && Math.hypot(prey.x - pr.st.x, prey.z - pr.st.z) < 12, facing: facingTo(prey, pr.st.x, pr.st.z) });
    if (f.retreated) { audio.play('shared/foe-flees', { volume: 0.7 }); pr.retreat(); hunger[k].missed(); fights[k].reset(); hud.toast(tt(`springtail.predators.${k}.givesUp`), 1800); }
  }
  // a predator wakes (its hunger starts) when a player first comes into its water
  if (game.phase === 'play') for (const k of ['stenus', 'strider']) {
    if (armed[k]) continue;
    const Q = recs().find((R) => alive(R) && inCore(k, R.x, R.z));
    if (Q) { armed[k] = true; hunger[k].reset(pace.grace); hunger[k].update(0); logChallenge(k, Q); }
  }
  if (game.phase === 'play' && !capture.active) { hunger.stenus.update(dt); hunger.strider.update(dt); }
  // rain once the director has brought it on (and none on you while both predators are still calm)
  rain.calm = hunger.stenus.state === 'grace' && hunger.strider.state === 'grace';
  const rainOn = placed.rain;
  world.debris.update(dt, field, inPool);
  // the Podura mass: only simulated while someone is near it (in its own frame, crowdG)
  const nearMass = recs().filter((R) => alive(R) && Math.hypot(R.x - ZONES.crowd.x, R.z - ZONES.crowd.z) < ZONES.crowd.r + 60);
  if (nearMass.length) {
    crowdBodies.length = 0;
    const ox = crowdG.position.x, oz = crowdG.position.z;
    for (const R of nearMass) crowdBodies.push({ position: { x: R.x - ox, y: R.y, z: R.z - oz }, radius: 0.8, velocity: { x: R.vx, y: 0, z: R.vz }, slot: R.slot });
    crowd.update(dt, crowdBodies);
    if (nearMass.some((R) => Math.hypot(R.x - ZONES.crowd.x, R.z - ZONES.crowd.z) < ZONES.crowd.r + 20)) logChallenge('crowd', nearMass[0]);
  }
  // hidden in it (and moving little), its prey is lost among the others: the strider's lock wanders
  if (strider.st.state === 'hunt' && Math.hypot(preyR.x - ZONES.crowd.x, preyR.z - ZONES.crowd.z) < ZONES.crowd.r && !(preyR.mode === 'air') && Math.hypot(preyR.vx, preyR.vz) < 3) {
    strider.st.confuseT = (strider.st.confuseT || 0) - dt;
    if (strider.st.confuseT <= 0 && crowd.alive > 0) {
      strider.st.confuseT = 1.2 + Math.random() * 0.8;
      const M = crowd.members;
      for (let k = 0; k < 8; k++) { const i = Math.floor(Math.random() * M.count); if (M.alive(i)) { strider.st.target = { x: M.x[i] + crowdG.position.x, z: M.z[i] + crowdG.position.z }; strider.st.decoyed = true; break; } }
    }
  } else strider.st.decoyed = false;
  // a predator only hunts a player in its own water (a stuck one stays its prey)
  const sHeld = recs().find((R) => R.mode === 'labium');
  // a hunt starts in its own water and carries on out to its leash
  const sOn = ['stalk', 'skim', 'windup', 'strike', 'reel', 'lungeTell', 'lunge', 'repelled'].includes(stenus.st.state);
  const huntS = isHungry(hunger.stenus) && (pace.anywhere || inCore('stenus', preyS.x, preyS.z) || (sOn && inZone('stenus', preyS.x, preyS.z)) || !!sHeld);
  for (const e of stenus.update(dt, { player: ctxS, field, inPool, hungry: huntS })) {
    if (e === 'caught' && ctxS.alive) withRec(preyS, () => caught('stenus'));
    // the two-stage strike (enemies.js): a clean escape, stuck on the labium, the follow-up lunge
    if (e === 'escaped') { slowMo = 0.7; rumbleFor(preyS, 160, 0.3, 0.6); hud.toast(tt('springtail.toasts.cleanEscape'), 1800); missFoe('stenus', 'escape'); }
    if (e === 'stuck' && ctxS.alive) withRec(preyS, () => stickToLabium());
    if (e === 'reeled') { const Q = sHeld || preyS; withRec(Q, () => { Q.mode = 'film'; caught('stenus'); }); }
    if (e === 'lungeTell' && ctxS.alive) { rumbleFor(preyS, 400, 0.25, 0.05); hud.toast(tt('springtail.toasts.stenusRears'), 1300); }
    if (e === 'lunge') audio.play('springtail/stenus-strike', { volume: 0.7, rate: 0.6 });
    if (e === 'lungeHit' && ctxS.alive) withRec(preyS, () => caught('stenus'));
    if (e === 'dodged' && ctxS.alive) { hud.toast(tt('springtail.toasts.dodgedMandibles'), 1100); missFoe('stenus', 'dodge'); }
    if (e === 'blocked') { rumbleFor(preyS, 220, 0.6, 0.3); audio.play('springtail/land-water', { volume: 0.8, rate: 1.6, only: 'old' }); wearDown('stenus', 'block'); }
    if (e === 'gaveUp') hunger.stenus.missed();
    if (e === 'miss' && hunger.stenus.hungry) hunger.stenus.missed();
    if (e === 'spotted' && ctxS.alive) audio.play('springtail/stenus-skim', { volume: 0.25, rate: 0.8 });
    if (e === 'skim') audio.play('springtail/stenus-skim', { volume: 0.7 });
    if (e === 'strike') audio.play('springtail/stenus-strike', { volume: 0.9 });
    if (e === 'skim') hud.toast(tt('springtail.toasts.stenusSkimming'), 1000);
    if (e === 'windup' && ctxS.alive) { rumbleFor(preyS, 300, 0.15, 0); audio.play('shared/danger', { volume: 0.6 }); hud.toast(tt('springtail.toasts.stenusFreezes'), 1400); } // the head dips: jump now
    if ((e === 'spotted' || e === 'windup') && ctxS.alive) logChallenge('stenusHunt', preyS);
  }
  const rOn = strider.st.state === 'hunt' || strider.st.st2 !== 'none';
  const huntR = isHungry(hunger.strider) && (pace.anywhere || inCore('strider', preyR.x, preyR.z) || (rOn && inZone('strider', preyR.x, preyR.z)));
  for (const e of strider.update(dt, { player: ctxR, field, inPool, ripples: pace.anywhere ? ripples : ripples.filter((r) => inZone('strider', r.x, r.z)), hungry: huntR })) {
    if (e === 'caught' && ctxR.alive) withRec(preyR, () => caught('strider'));
    if (e === 'blocked') { rumbleFor(preyR, 220, 0.6, 0.3); audio.play('springtail/land-water', { volume: 0.8, rate: 1.6, only: 'old' }); wearDown('strider', 'block'); }
    if (e === 'windup' && ctxR.alive) { rumbleFor(preyR, 300, 0.15, 0); audio.play('shared/danger', { volume: 0.6 }); hud.toast(tt('springtail.toasts.striderForelegs'), 1400); }
    if (e === 'lost' && hunger.strider.hungry) hunger.strider.missed();
    // (timed on the simulation clock, so a paused game holds it too)
    if (e === 'heard' && ctxR.alive) logChallenge('striderHunt', preyR);
    if (e === 'heard' && ctxR.alive && !(strider.st.heardUntil > simT)) { strider.st.heardUntil = simT + 6; audio.play('springtail/strider', { volume: 0.7 }); hud.toast(tt('springtail.toasts.striderFelt'), 1800); }
  }
  // the spiders (boss.js): each rests at its raft and goes out on rounds of
  // its hunting ground; the one in focus (`boss`, nearest the players) hunts
  // them; big ripples (charged landings, raindrops) can draw it off
  bossRipples.push(...ripples.filter((r) => r.big));
  const bossCtx = { awake: true, field, inPool, ripples: bossRipples,
    players: recs().map((Q) => ({ slot: Q.slot, x: Q.x, z: Q.z, y: Q.y, heading: Q.heading, airborne: Q.mode === 'air', alive: alive(Q) && game.phase === 'play', landed: Q.landT !== undefined && simT - Q.landT < 0.2 && Q.mode !== 'air' })) };
  const bossEv = stepSpiders(dt, bossCtx);
  bossRipples.length = 0;
  for (const e of bossEv) {
    const Q = e.slot !== undefined ? pls[e.slot] : null;
    if (e.type === 'wake') logChallenge('boss', recs().reduce((a, R) => (!a || Math.hypot(R.x - boss.st.x, R.z - boss.st.z) < Math.hypot(a.x - boss.st.x, a.z - boss.st.z) ? R : a), null));
    if (e.type === 'wake') audio.play('springtail/spider', { volume: 0.8 });
    if (e.type === 'wake' && !bossSaid.wake) { bossSaid.wake = true; hud.toast(tt('springtail.toasts.spiderWakes'), 3600); }
    else if (e.type === 'investigate') logChallenge('bossLured', boss.st);
    else if (e.type === 'return' && !boss.st.homeward) logChallenge('bossReturn', boss.st);
    else if (e.type === 'wander') logChallenge('spiderWander', boss.st);
    else if (e.type === 'tell') { audio.play('shared/danger', { volume: 0.5 }); for (const R of recs()) if (Math.hypot(R.x - boss.st.x, R.z - boss.st.z) < 16) rumbleFor(R, 200, 0.12, 0); }
    else if (e.type === 'lunge' || e.type === 'pounce') audio.play('springtail/spider-lunge', { volume: 0.8, old: ['springtail/stenus-strike', { volume: 0.9, rate: 0.7 }] });
    else if (e.type === 'caught' && Q && alive(Q)) withRec(Q, () => caught('boss'));
    else if (e.type === 'dodged') hud.toast(tt('springtail.toasts.spiderDodged'), 1500);
    else if (e.type === 'retreat') { audio.play('shared/foe-flees', { volume: 0.7 }); hud.toast(tt('springtail.toasts.spiderRetreats'), 2600); }
  }
  ripples.length = 0;
  // the rain falls round whoever leads (the director's leader: furthest along the encounters)
  const lead = director.leader;
  const rainP = (lead && pls[lead.id] && alive(pls[lead.id]) ? pls[lead.id] : recs().find(alive)) || P;
  const drops = rain.update(dt, { field, inPool, mossAt: (x, z) => Math.max(0, mossTop(x, z)), player: rainP === preyS ? ctxS : ctxOf(rainP, null), allow: rainOn && game.phase === 'play' });
  if (drops.length) logChallenge('rain', rainP);
  for (const e of drops) {
    bossRipples.push({ x: e.x, z: e.z, big: true });
    const d0 = Math.hypot(e.x - P.x, e.z - P.z);
    audio.play('springtail/raindrop', { volume: Math.max(0.12, Math.min(0.9, 4 / (d0 + 3))), rate: 0.92 + Math.random() * 0.16, pan: Math.max(-1, Math.min(1, (e.x - P.x) / 25)) });
    for (const Q of recs()) withRec(Q, () => {
      const d = Math.hypot(e.x - Q.x, e.z - Q.z);
      if (d < 6) rumble(250, Math.min(1, 3 / d), Math.min(1, 2 / d));
      if (!alive(Q) || game.phase !== 'play') return;
      if (d < e.r * 0.95 && Q.mode !== 'air') die(tt('springtail.toasts.swamped'));
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

/** For tests and tuning: when each challenge first came within 40 mm of a player (challengeLog *Near). */
function logNear() {
  for (const R of recs()) {
    if (!alive(R)) continue;
    if (!challengeLog.stenusNear && stenus.group.visible && Math.hypot(stenus.st.x - R.x, stenus.st.z - R.z) < 40) logChallenge('stenusNear', R);
    if (!challengeLog.striderNear && strider.group.visible && Math.hypot(strider.st.x - R.x, strider.st.z - R.z) < 40) logChallenge('striderNear', R);
    if (!challengeLog.crowdNear && Math.hypot(ZONES.crowd.x - R.x, ZONES.crowd.z - R.z) < 40 + ZONES.crowd.r) logChallenge('crowdNear', R);
    if (!challengeLog.sundewNear && (({ d, island }) => d - island.r < 40)(world.sundews.nearest(R.x, R.z))) logChallenge('sundewNear', R);
    const np = nearestPortal(R.x, R.z);
    if (!challengeLog.portalNear && np.d < 40) logChallenge('portalNear', R);
    // a portal's hunting ground (its pondweed thick round you), and a spider in sight close by
    if (!challengeLog.groundNear && np.d < GROUND.r) logChallenge('groundNear', R);
    if (!challengeLog.spiderNear && spiders.some((s) => s && !s.parked && s.group.visible && Math.hypot(s.st.x - R.x, s.st.z - R.z) < 45)) logChallenge('spiderNear', R);
  }
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
  tail.material.uniforms.uDigestWhite.value = P.digestWhite;
  tail.material.uniforms.uDigestDissolve.value = P.dissolve;
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
  p.flail = P.mode === 'flipped' || P.mode === 'stuck' || P.mode === 'labium' || P.mode === 'dead' ? 1 : 0;
  if (P.mode === 'caught') { p.flail = P.flailK; p.stride = 0; p.tuck = 0; p.nod = 0; p.hunker = 0; p.bend = 0.3 * P.flailK * Math.sin(t * 11); }
  // stuck: the legs and antennae thrash with every tug and kick, and go weak in a pause
  if (P.mode === 'stuck' && P.stuckS) p.flail = 0.3 + 0.95 * P.stuckS.thrash;
  if (P.mode === 'reform') p.flail = 0.15;
  tail.update();
  const g = tail.group;
  let y = P.y;
  if (P.mode === 'film') y = field.height(P.x, P.z) - 0.01 - P.hunker * 0.02;
  // on its back the roll about the body's middle (0.25 mm up) puts the dorsum
  // at the bottom: it lies in the film, sunk a little into its dimple
  if (P.mode === 'flipped') y = P.y - 0.03 + (P.flipHop || 0);
  if (P.mode === 'dead') y = P.y - Math.min(1, P.deadT) * 0.2;
  if (P.mode === 'reform' && inPool(P.x, P.z)) y = field.height(P.x, P.z) - 0.01;
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
  const pdt = Math.max(0, Math.min(0.1, t - (P.poseT ?? t)));
  P.poseT = t;
  // the glue strands, from the tentacle tips to the legs as they are posed now
  if (P.mode === 'stuck' && P.glueOn && P.stuckS) {
    const snaps = P.glue.update(pdt, tail.feet(), P.stuckS.progress, Math.max(P.yank || 0, P.stuckS.thrash * 0.6), t);
    // a strand snapped (sundew-glue.js counts them): heard at most every 0.1 s (the Old set: each time)
    if (snaps) {
      if (audio.set === 'old' || !(P.snapSndT > simT)) { P.snapSndT = simT + 0.1; audio.play('springtail/glue-snap', { volume: 0.7, rate: 0.95 + Math.random() * 0.1, old: ['springtail/land-sticky', { volume: 0.55, rate: 1.7 + Math.random() * 0.2 }] }); }
      rumble(90, 0.5, 0.2);
    }

  }
  // re-forming: motes fly in from round about and gather on the body
  if (P.mode === 'reform' && !P.reformSeeded) {
    P.reformSeeded = true;
    const from = new THREE.Vector3();
    for (let i = 0; i < 260; i++) {
      const to = surfacePoint(tail);
      const a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 1.2;
      from.set(to.x + Math.cos(a) * r, to.y + 0.2 + Math.random() * 1.1, to.z + Math.sin(a) * r);
      motes.gather(from, to, { dur: 0.45 + Math.random() * 0.15, delay: Math.random() * 0.3 });
    }
  }
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
  for (const P of recs()) if (P.mode !== 'dead' && P.scale > 0.3 && P.dissolve < 1) cast(P.x, P.y + 0.25 * P.scale, P.z, 0.3 * P.scale, 0.55 * (1 - P.dissolve));
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
  // RS: the camera's turn is locked to the world's forward (FORWARD_YAW, shared/camlock.js):
  // RS left/right peeks sideways (each player's own), up/down pitches by intent (+1 looks up:
  // the camera swings down toward the horizon), honouring the shared Invert Y. With the Free
  // camera setting and one player, RS left/right turns the camera as it used to (any player).
  let yaw = 0;
  const nAct = players.active.length, free = camLock.free(nAct);
  for (const p of players.active) { const lk = players.controls(p.slot).look(); yaw += lk.yaw; camLock.peek(p.slot, free ? 0 : lk.yaw, dt); }
  camLock.keep(players.active.map((p) => p.slot));
  rig.yaw = camLock.yaw(rig.yaw, dt, nAct, THREE.MathUtils.clamp(yaw, -1, 1) * 1.9 * dt, capture.active);
  const look = ctl.look();
  rig.wantPitch = THREE.MathUtils.clamp(rig.wantPitch - look.pitch * 1.1 * dt, PITCH_MIN, PITCH_MAX);
  if (rig.mode === 'low') rig.pitchLow = rig.wantPitch;
  // Y: on an open portal, enter it (the camera toggle waits until you are off it)
  if (!portalY() && ctl.special.pressed()) {
    if (rig.mode === 'top') { rig.wantPitch = Math.min(rig.pitchLow, 0.9); hud.toast(tt('springtail.toasts.cameraLow')); }
    else { rig.pitchLow = rig.wantPitch; rig.wantPitch = PITCH_TOP; hud.toast(tt('springtail.toasts.cameraTop')); }
  }
  const zs = Math.sign(ctl.zoomStep() + ctl.shoulderZoomStep());
  if (zs) { rig.zi = THREE.MathUtils.clamp(rig.zi + zs, 0, ZOOMS.length - 1); hud.toast(tt('springtail.toasts.zoom', { zoom: ZOOMS[rig.zi], field: (36 / ZOOMS[rig.zi]).toFixed(1) })); }
  const ls = ctl.lookStep();
  if (ls) { const i = (rig.look + ls + MACRO_LOOKS.length) % MACRO_LOOKS.length; features.set('look', MACRO_LOOKS[i].name); hud.toast(ttx('springtail.features.look.choices')[MACRO_LOOKS[i].name] ?? MACRO_LOOKS[i].name); }
  const out = [];
  for (const p of players.active) {
    const c = players.controls(p.slot);
    // held RT: look far; held LT: a close look (each player's own view)
    lookOf(p.slot).want = c.rt() > 0.35 ? 1 : c.lt() > 0.35 ? -1 : 0;
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
  const t = createSpringtail({ share: tail0, slot: p.slot });
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

// ---------------------------------------------------------------- the spiders, kept where someone is
/** A spider is stepped and shown only while someone is within this (mm) of its raft: it keeps within its 90 mm leash of its post, so it is then 130 mm or more from them, a blur at most at the far edge of a low view. */
const SPIDER_ACTIVE = 220;
const idleCtx = { awake: false, field, inPool, ripples: [], players: [] };
/** Which portal is in focus: the nearest to any player (20 mm of hysteresis), never while its spider is busy with someone. */
function chooseFocus() {
  if (boss.engaged || cap.kind === 'boss' || boss.st.state === 'capture') return;
  const live = recs().filter(alive), list = live.length ? live : recs();
  let bi = PORTAL.i, bd = Infinity, cd = Infinity;
  for (const P of list) {
    const n = nearestPortal(P.x, P.z);
    if (n.d < bd) { bd = n.d; bi = n.p.i; }
    cd = Math.min(cd, Math.hypot(P.x - PORTAL.x, P.z - PORTAL.z));
  }
  if (bi !== PORTAL.i && bd < cd - 20) focusSpider(bi);
}
/** Step the spiders near anyone (the focus one hunts: ctx); park the rest (hidden, still). Returns the focus spider's events. */
function stepSpiders(dt, ctx) {
  chooseFocus();
  let out = [];
  for (let i = 0; i < PORTALS.length; i++) {
    const L = PORTALS[i];
    const near = recs().some((P) => Math.abs(P.x - L.x) < SPIDER_ACTIVE && Math.abs(P.z - L.z) < SPIDER_ACTIVE && Math.hypot(P.x - L.x, P.z - L.z) < SPIDER_ACTIVE);
    let s = spiders[i];
    if (!near && !(s === boss && cap.kind === 'boss')) {
      if (s && !s.parked) { s.parked = true; s.setVisible(false); }
      continue;
    }
    s = spiderFor(i);
    if (s.parked) { s.parked = false; s.setVisible(s.st.state !== 'gone'); }
    const ev = s.update(dt, s === boss ? ctx : idleCtx);
    if (s === boss) out = ev;
    else for (const e of ev) if (e.type === 'wander') logChallenge('spiderWander', s.st);
  }
  return out;
}

// ---------------------------------------------------------------- the portal (the way on)
// Standing on a portal raft (PORTALS, world.js) while it is open puts up the
// prompt (embed.near('portal'): "Y Enter the portal"), and Y goes through into
// the next world (never an automatic door: the owner). Open means the way on
// is unsealed (every encounter met) and its wolf spider is off guard: lured
// more than 15 mm off it, out on its ground, or beaten. On guard, it turns you
// back (it strikes as its fight does). Any player counts; in the game the
// others follow through the transition. No backdoor: this is the top of the
// chain.
const lm = { fired: false, log: [], ready: [], readyOn: false };
/** The portal player P is at (on the raft or at its edge): its index, or -1. */
const atPortal = (P) => { const n = nearestPortal(P.x, P.z); return n.d < n.p.reach ? n.p.i : -1; };
function checkLandmark() {
  if (game.phase !== 'play') return;
  if (outro) return;
  // the way on unseals (every encounter met): heard once, on the edge
  const isSealed = sealed();
  if (lm.wasSealed && !isSealed) audio.play('shared/portal-appear', { volume: 0.8 });
  lm.wasSealed = isSealed;

  let at = null, atI = -1, near = false, dmin = Infinity;
  for (const P of recs()) {
    if (!alive(P)) continue;
    const n = nearestPortal(P.x, P.z);
    dmin = Math.min(dmin, n.d);
    if (n.d < n.p.reach) { at = P; atI = n.p.i; }
    if (n.d < n.p.reach + 12) near = true;
  }
  // the boss's hint (brief): only once someone is close enough to meet it
  if (!portal.hinted && dmin < PORTAL_HINT) { portal.hinted = true; hud.toast(tt('springtail.toasts.spiderHint'), 3600); }
  // nearing the way on: the shell starts loading the next world (no prompt is shown)
  const nearing = dmin < 120;
  if (nearing !== lm.nearing) { lm.nearing = nearing; embed.near('forward', nearing); }
  const shut = (i) => sealed() || guardedAt(i);
  // on an open portal: the prompt (Y enters: the owner, never an automatic door; game/README.md "Entering a portal (Y)")
  lm.ready.length = 0;
  for (const P of recs()) { if (!alive(P)) continue; const i = atPortal(P); if (i >= 0 && !shut(i)) lm.ready.push(P); }
  const ready = lm.ready.length > 0;
  if (ready !== lm.readyOn) { lm.readyOn = ready; embed.near('portal', ready); if (ready) audio.play('shared/portal-near', { volume: 0.6 }); if (ready) lm.log.push({ kind: 'ready', slot: lm.ready[0].slot, portal: atPortal(lm.ready[0]), t: +simT.toFixed(2) }); }
  if (at && !lm.fired) {
    if (shut(atI)) {
      if (sealed()) {
        audio.play('shared/portal-sealed', { volume: 0.6 });
        if (!portal.sealedSaid) { portal.sealedSaid = true; hud.toast(tt('springtail.toasts.sealed'), 3600); }
        lm.log.push({ kind: 'sealed', slot: at.slot, portal: atI, t: +simT.toFixed(2) });
      } else {
        audio.play('shared/portal-sealed', { volume: 0.6 });
        if (!portal.turned) { portal.turned = true; hud.toast(tt('springtail.toasts.turnedBack'), 3600); }
        lm.log.push({ kind: 'turnedBack', slot: at.slot, portal: atI, t: +simT.toFixed(2) });
      }
      lm.blockedT = simT;
      lm.fired = true; // once per visit (it can fire again after everyone has left)
      lm.blocked = true;
    }
  }
  if (!near) { lm.fired = false; lm.blocked = false; }
}
/** Y on an open portal (lm.ready): that player goes through. Returns true when it took the press (so Y's camera toggle does not). */
function portalY() {
  if (outro || !lm.ready.length) return false;
  const P = lm.ready.find((Q) => (Q.slot === 0 ? ctl : players.controls(Q.slot)).special.pressed());
  if (!P) return lm.ready.some((Q) => Q.slot === 0);
  enterPortal(P);
  return true;
}
/**
 * The way on: player P has reached the open portal. This is the one place the
 * zoom into the next world is triggered (embed.landmark('forward'); the shell
 * runs the transition; standalone, embed.js shows a toast).
 */
function enterPortal(P, i = atPortal(P) >= 0 ? atPortal(P) : nearestPortal(P.x, P.z).p.i) {
  if (outro) return;
  // the outro plays from this raft
  focusPortal(i); props.setFocus(i);
  if (!(boss.engaged || cap.kind === 'boss')) boss = spiderFor(i);
  lm.fired = true;
  if (lm.readyOn) { lm.readyOn = false; embed.near('portal', false); }
  lm.log.push({ kind: 'forward', slot: P.slot, portal: i, t: +simT.toFixed(2) });
  audio.play('shared/portal-enter', { volume: 0.8 });
  startOutro(P);
  embed.landmark('forward', { player: P.slot, outro: embed.active });
}

// ---------------------------------------------------------------- the outro (success, slow-down, freeze)
// Going through the portal (embed.js "Continuous transitions"): a golden burst
// from the raft, a bloom on the screen, a chime and a rumble; then time eases
// to a stop over ~1 s while rendering carries on (the freeze frame). Frozen,
// the world reports where the mite speck is on screen (embed.frozen) and the
// shell takes the camera (`camera` poses) to push in on it while the mite's
// world fades in under the same framing. All in frame time (dt is clamped),
// so a slow machine plays it slower rather than skipping it. Standalone the
// freeze holds a moment and time comes back.
const OUTRO = { beat: 0.3, ease: 1.0, hold: 1.4, back: 0.6, giveUp: 8, rate: 1 }; // rate: tests slow it down
let outro = null;
// the success effects run on frame time too (fxT), so a slow machine or a test sees all of them
let fxT = 0;
const portalLight = createPortalLight({ zIndex: 3, clock: () => fxT });
function startOutro(P) {
  outro = { t: 0, scale: 1, frozenAt: null, cam: null, P, L: null, heard: false };
  props.glow.burst();
  const pr = split.project(0, _v.set(PORTAL.x, props.position.y, PORTAL.z));
  if (!pr.behind) portalLight.bloom(pr.x, pr.y, { scale: 1.2 });
  const me = split.project(0, _v.set(P.x, P.y + 0.25, P.z));
  if (!me.behind) portalLight.bloom(me.x, me.y, { scale: 0.7 });
  audio.play('shared/portal-chime', { volume: 0.9 });
  audio.play('shared/slowdown', { volume: 0.5, delay: OUTRO.beat });
  rumbleFor(P, 520, 0.55, 0.85);

  // the chrome goes, the bloom stays (cinematic(false) restores both)
  if (embed.active) { embed.cinematic(true, canvas); portalLight.canvas.style.visibility = 'visible'; }
}
/** Advance the outro by dt (frame time); returns the time scale for the world. */
function stepOutro(dt) {
  const o = outro;
  o.t += dt * OUTRO.rate;
  fxT += dt * OUTRO.rate;
  const k = THREE.MathUtils.smoothstep(o.t, OUTRO.beat, OUTRO.beat + OUTRO.ease);
  o.scale = 1 - k;
  if (o.scale <= 0 && o.frozenAt === null) {
    o.frozenAt = o.t;
    if (embed.active) {
      const m = props.mite();
      embed.frozen(embed.poseOf(camera, m.c, { len: m.len, heading: m.heading, pitch: rig.pitch, yaw: rig.yaw }));
    }
  }
  if (o.frozenAt !== null) {
    const held = o.t - o.frozenAt;
    // standalone (or a shell that never answered): time comes back
    const back = !embed.active ? held - OUTRO.hold : !o.heard && held > OUTRO.giveUp ? held - OUTRO.giveUp : -1;
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
// the shell drives the camera from the freeze frame into the mite's world
embed.on('camera', (d) => { if (outro && d.pose) { outro.cam = d.pose; outro.heard = true; } });
embed.on('pause', () => { if (outro) outro.heard = true; });
/** The camera for a pose from the shell: a dolly toward the mite speck, the field of view kept. */
function placePoseCamera(pose) {
  const m = props.mite();
  const r = embed.poseCamera(camera, pose, m.c, m);
  camera.near = Math.max(0.02, r.depth * 0.15);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  world.sky.position.copy(camera.position);
  // the lens at that magnification (for the blur), focused on the speck
  const L = lens({ hfw: Math.max(0.2, 2 * r.halfW), N: APERTURES[rig.ai] });
  macroShared.uFocus.value = camera.position.distanceTo(m.c);
  rig.dofK = 8;
  return L;
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
  const lk = rig.lookFx ? (rig.lookFx.u > 0 ? tt('springtail.status.focusAhead', { mm: macroShared.uFocus.value.toFixed(0) }) : tt('springtail.status.focusNear')) : '';
  bar.querySelector('.opt').textContent = `${L.m.toFixed(1)}x · f/${N} (eff. f/${L.Neff.toFixed(0)}) · DOF ${(rig.lookFx ? L.dof * rig.lookFx.dofK : dof).toFixed(2)} mm${lk}`;
  status.querySelector('.food').textContent = tt('springtail.status.food', { food: pl.food, goal: GOAL });
  status.querySelector('.lives').textContent = '';
  const m = status.querySelector('.st-meter i');
  const furcTxt = status.querySelector('.furc');
  status.classList.toggle('caught', capture.active);
  const thr = status.querySelector('.threat');
  const hs = hunger.stenus, hr = hunger.strider;
  const hunting = ['stalk', 'skim', 'windup', 'strike', 'reel', 'lungeTell', 'lunge'].includes(stenus.st.state) || strider.st.state === 'hunt';
  const attacking = stenus.attacking || strider.attacking || boss.attacking;
  gauge.style.display = boss.engaged ? 'flex' : 'none';
  gauge.querySelector('i').style.width = `${(boss.resolve * 100).toFixed(0)}%`;
  const stage = stenus.stage;
  let threat = capture.active ? '' : pl.mode === 'stuck' ? tt('springtail.status.sundew') : stage === 'tell' ? tt('springtail.status.stenusJump') : stage === 'stuck' ? tt('springtail.status.stuck') : stage === 'lungeTell' || stage === 'lunge' ? tt('springtail.status.mandibles') : attacking ? tt('springtail.status.attacking') : hunting ? tt('springtail.status.hunted') : isHungry(hs) || isHungry(hr) ? tt(isHungry(hs) && isHungry(hr) ? 'springtail.status.bothHungry' : isHungry(hs) ? 'springtail.status.stenusHungry' : 'springtail.status.striderHungry') : tt('springtail.status.calm');
  thr.classList.toggle('hot', hunting || attacking);
  const prog = encounterProgress();
  if (!hunting && !attacking && !capture.active && pl.mode !== 'stuck' && !inZone('stenus', pl.x, pl.z) && !inZone('strider', pl.x, pl.z)) threat = tt('springtail.status.calmWater');
  setHTML(thr, threat); // may show a button glyph
  if (capture.active && cap.phase) { setHTML(furcTxt, (cap.kind && CAP_TEXT[cap.kind].phases[cap.phase]) || tt('springtail.status.backAgain')); m.style.width = `${{ strike: 25, hold: 50, eat: 80, follow: 100, fadeOut: 100, fadeIn: 100 }[cap.phase] || 100}%`; m.style.background = '#e04f3a'; }
  else if (pl.mode === 'stuck') { const S = pl.stuckS; setHTML(furcTxt, S && S.idle > 0.8 ? tt('springtail.status.pulledIn') : tt('springtail.status.struggle')); m.style.width = `${pl.struggle * 100}%`; m.style.background = '#e07a5f'; }
  else if (pl.mode === 'reform') { setHTML(furcTxt, tt('springtail.status.backAgain')); m.style.width = `${Math.min(1, pl.reformT / REFORM) * 100}%`; m.style.background = '#c9d6df'; }
  else if (pl.mode === 'labium') { setHTML(furcTxt, tt('springtail.status.wriggle')); m.style.width = `${Math.min(1, pl.wriggle) * 100}%`; m.style.background = '#e07a5f'; }
  else if (pl.charging) { setHTML(furcTxt, pl.charge > 0.98 ? tt('springtail.status.fullJump') : tt('springtail.status.cocking')); m.style.width = `${pl.charge * 100}%`; m.style.background = '#f2cc8f'; }
  else { setHTML(furcTxt, pl.cock < 1 ? tt('springtail.status.reCocking') : tt('springtail.status.furcula')); m.style.width = `${Math.max(0, pl.cock) * 100}%`; m.style.background = pl.cock < 1 ? '#7a8a99' : '#9fd0ff'; }
  const info = renderer.info.render;
  hud.stats(`${pl.mode}${pl.mode === 'film' ? ` ${Math.hypot(pl.vx, pl.vz).toFixed(1)} mm/s` : ''}  Stenus: ${stenus.st.state} (${hs.state} ${hs.left.toFixed(0)} s)  strider: ${strider.st.state} (${hr.state} ${hr.left.toFixed(0)} s)${capture.active ? `  capture: ${cap.kind} ${cap.phase}` : ''}  encounters ${director.index}/${ENCOUNTERS.length}${sealed() ? ' portals sealed' : guarded() ? ' portal guarded' : ' portal open'}\n${MACRO_LOOKS[rig.look].name}  quality ${quality.level} (res ${(quality.scale * 100).toFixed(0)}%)\n${fps.toFixed(0)} fps  ${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris`);
}

// ---------------------------------------------------------------- loop
let simT = 0, portalT = 0, menuOpen = false, frames = 0;
const foodNear = [];
function step(dt, inputs, visualDt = dt) {
  // Portal particles use elapsed visual time, independent of capped physics,
  // hit-pause and camera-dependent rendering cost.
  portalT += visualDt;
  // the pounce-bite's hit-pause: the world all but stops for a moment
  if (hitPause > 0) { hitPause -= dt; dt *= 0.06; }
  // a clean escape from the labium: a moment of slow motion
  else if (slowMo > 0) { slowMo -= dt; dt *= 0.3; }
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
  motes.update(dt);
  placeRings();
  props.update(simT, visualDt, camera, (i) => !sealed() && !guardedAt(i), outro ? outro.t : undefined, recs(), portalT);
  // the nearest columns of light, reflected in the film (a golden path toward a portal out of frame)
  waterMat.uniforms.uColH.value = props.columnLights(waterMat.uniforms.uCol.value, 1);
  if (game.phase === 'play') { stepDirector(dt); checkLandmark(); logNear(); }
  // only the food near a player or the view is drawn (world.js buildFood)
  foodNear.length = 0;
  for (const P of recs()) foodNear.push(P);
  foodNear.push(rig.target);
  world.food.update((x, z) => field.height(x, z) + dimples.height(x, z) * 0.5, foodNear);
  updateContacts();
}
const split = createSplitScreen(renderer, { capture: true, zoomMax: SPLIT_ZOOM_MAX });
const viewFx = []; // each view's focus distance and depth-of-field factor as last drawn (tests)
const marks = createLandmarks();
// a caught player's view follows the predator with its meal
const posOf = (P) => {
  if (P.mode === 'caught' && cap.who === P && (cap.kind === 'stenus' || cap.kind === 'strider' || cap.kind === 'boss') && ['eat', 'follow', 'fadeOut'].includes(cap.phase)) { const b = capBody(); return { x: b.x, y: 0.4, z: b.z }; }
  return { x: P.x, y: P.y + 0.25, z: P.z };
};
// RS left/right peeks (shared/camlock.js): each view's camera slides sideways along the ground by up to
// peekFrac of the view's width at its target, eased, and blended through a split and a merge.
const _pr = new THREE.Vector3();
function applyPeek() {
  if (outro) return;
  camera.updateMatrixWorld();
  _pr.setFromMatrixColumn(camera.matrixWorld, 0); _pr.y = 0;
  if (_pr.lengthSq() < 1e-8) return;
  _pr.normalize();
  const w = 2 * camera.position.distanceTo(rig.target) * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
  camLock.applyPeek(split, (v, p) => _pr.clone().multiplyScalar(p * camLock.peekFrac * w));
}
const MOSS_LOD_BEYOND = 90; // mm past the focus distance (a 64 mm tile reaches ~45 mm from its centre)
function render(dt) {
  // the outro: the camera slows with time, holds on the freeze, then follows the shell's poses
  let L;
  if (outro && outro.cam) { L = placePoseCamera(outro.cam); rig.zoom = 1; }
  else if (outro && outro.scale <= 0 && outro.L) L = outro.L;
  else L = placeCamera(outro ? dt * Math.max(outro.scale, 1e-3) : dt);
  if (outro) outro.L = L;
  field.upload();
  split.update(recs().map((P) => ({ slot: P.slot, position: posOf(P) })), { camera, zoom: rig.zoom }, dt);
  applyPeek();
  groupZoom = split.zoom;
  directorViews();
  quality.setSplitViews(split.views.length);
  const focus0 = macroShared.uFocus.value;
  const one = split.views.length === 1;
  split.render(camera, (view, target) => {
    renderer.setRenderTarget(target);
    let dofK = rig.lookFx ? rig.lookFx.dofK : rig.dofK, Lv = L;
    // how far the split has eased in (0 merged .. 1 split): a split view's own focus and look are
    // blended in with it, so the merge (the views' offsets reaching zero) needs no focus change
    // a split view's own focus, depth of field and look (split.viewBlend: blended with the players near
    // each, eased with the split's amount), so the split, the merge and players joining one view change
    // no focus at once: merged, every view has the shared camera's
    const SL = split.layout, sp = !SL.merged && !outro;
    const recAt = (j) => pls[SL.players[j].slot] || pl;
    if (sp) {
      const dAt = (j) => { const P = recAt(j); return camera.position.distanceTo(_v.set(P.x, P.y + 0.25, P.z)); };
      const own = split.viewBlend(view, dAt, focus0);
      let far = 0;
      for (const j of view.members || []) far = Math.max(far, Math.abs(dAt(j) - own));
      macroShared.uFocus.value = own;
      dofK += (THREE.MathUtils.clamp((far + 0.6) / L.dof, 1, 14) - dofK) * SL.amount;
    }
    if (!one) {
      // each view's water and sky follow its camera
      const vr = view.slots.map((s) => pls[s]).filter(Boolean);
      const g = groupCentre(vr.length ? vr : [pl]);
      water.position.set(Math.round(g.x / field.dx) * field.dx, 0, Math.round(g.z / field.dx) * field.dx);
      world.sky.position.copy(camera.position);
      setDrop(vr[0]);
    }
    // with company, each view looks far or close as its players hold RT / LT (alone, placeCamera did it)
    let saved = null;
    if (multi() && !outro) {
      const u0 = viewLook(recs().map((P) => P.slot)), u = sp ? split.viewBlend(view, (j) => lookOf(SL.players[j].slot).u, u0) : u0;
      if (u) {
        saved = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov, near: camera.near, sky: world.sky.position.clone() };
        const pivot = camera.getWorldDirection(_v).multiplyScalar(L.s).add(camera.position);
        const fx = lookCamera(u, L, pivot.clone(), macroShared.uFocus.value, dofK);
        if (fx) { macroShared.uFocus.value = fx.focus; dofK = fx.dofK; Lv = fx.L; world.sky.position.copy(camera.position); }
      }
    }
    // moss tiles beyond the focal plane (plus a tile's reach) switch to the coarse heads (looking far: from just past you)
    world.setLodDistance(Lv === L ? macroShared.uFocus.value + MOSS_LOD_BEYOND : Math.min(macroShared.uFocus.value + MOSS_LOD_BEYOND, Lv.s + 60));
    // split: each internal pass fills only this view's region (padded for the bokeh's reach)
    viewFx[view.index] = { focus: macroShared.uFocus.value, dofK }; // (tests: each view's focus as drawn)
    macro.render(scene, camera, { lens: Lv, look: lookDef, dofK, scissor: (rt) => split.scissor(view, rt, 64) });
    if (saved) {
      camera.position.copy(saved.p); camera.quaternion.copy(saved.q); camera.fov = saved.fov; camera.near = saved.near;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(); world.sky.position.copy(saved.sky);
    }
  });
  if (!one) { macroShared.uFocus.value = focus0; setDrop(pl); } else macroShared.uFocus.value = focus0;
  marks.begin();
  portalLight.begin();
  // no arrow (the owner: keep moving and you find it): the nearest portal's golden
  // light haloes it in view; no text
  if (game.phase === 'play' && !outro) {
    let d = Infinity;
    for (const P of recs()) d = Math.min(d, Math.hypot(P.x - PORTAL.x, P.z - PORTAL.z));
    // (the nearest raft, while it is drawn at all)
    // (a view looking far or close with company is drawn from its own camera: no halo then)
    const lookK = multi() ? 1 - Math.min(1, Math.max(...recs().map((P) => Math.abs(lookOf(P.slot).u)))) : 1;
    if (d < RAFT_SHOW && lookK > 0.05) portalLight.drawSplit(split, props.position, { strength: THREE.MathUtils.clamp(1.2 - d / 300, 0.65, 1) * lookK, open: props.glow.open });
  }
  drawPortalArrow();
  return L;
}

/**
 * The "Portal arrow" setting (the game's Settings, default off; ?arrow=1 here): an arrow at the edge of
 * each view toward its players' nearest raft, with the distance beside it. Sealed rafts are pointed at
 * too: they all open together once the encounters are met, and there is no nearer open one meanwhile.
 */
let arrowLog = [];
function drawPortalArrow() {
  arrowLog = [];
  if (!portalArrowOn() || game.phase !== 'play' || outro) return;
  arrowLog = marks.drawSplit(split, (vp) => {
    let best = null, bd = Infinity;
    for (const v of vp) { const P = pls[v.slot]; if (!P) continue; const n = nearestPortal(P.x, P.z); if (n.d < bd) { bd = n.d; best = n.p; } }
    return best && { position: { x: best.x, y: 1, z: best.z }, label: `${Math.round(bd)} mm`, distance: bd, portal: best.i };
  }, { kind: 'forward', portal: true, range: 900 }).map((r) => r && { x: r.x, y: r.y, angle: r.angle, onScreen: r.onScreen, portal: r.picked.portal, d: +r.picked.distance.toFixed(1), label: r.picked.label });
}

/** Tests that step without drawing: the camera and the views as a rendered frame would have them, so the director sees what they see. */
function stepViews(dt) {
  placeCamera(dt);
  split.update(recs().map((P) => ({ slot: P.slot, position: posOf(P) })), { camera, zoom: rig.zoom }, dt);
  applyPeek();
  groupZoom = split.zoom;
  directorViews();
}
const api = {
  scene, camera, renderer, macro, field, Box3: THREE.Box3, dimples, tail, stenus, strider, rain, world, pl, rig, game, features, paused: false,
  step(dt = 1 / 60, inp = IDLE) { step(dt, [inp]); },
  render(dt = 0) { const L = render(dt); updateText(L); },
  jump, newGame, respawn, inPool, groundAt, hunger, capture, cap, pace,
  get time() { return simT; },
  /** Testing: one fixed step with the left stick at (x, y) (null: hands off). */
  testStep(dt = 1 / 30, stick = null) {
    if (game.phase !== 'play') newGame();
    const m = stick ? Math.min(1, Math.hypot(stick.x, stick.y)) : 0;
    step(dt, [{ move: { x: stick ? stick.x : 0, y: stick ? stick.y : 0, m }, dashDown: false, dashPressed: false, attackPressed: false, defend: false }]);
    stepViews(dt);
  },
  // ---- multiplayer and landmarks (Playwright drives these)
  players, split, marks, joins, landmarkLog: lm.log, props, crowd, crowdG, director, spiders,
  /** The way on once placed: { x, z, r, reach, a } (null before). */
  /** The way on in focus (the portal nearest the players): { i, x, z, r, reach, a }. */
  get landmark() { return { i: PORTAL.i, x: PORTAL.x, z: PORTAL.z, r: PORTAL.r, reach: PORTAL.reach, a: PORTAL.a }; },
  /**
   * The portal in focus (the nearest to the players) for the level
   * transition: its world position (the raft's top, x, y, z), whether the way
   * on is still sealed (encounters left), guarded (its wolf spider on its
   * post) or open, its spider, and the sparkle's eased openness.
   */
  portal() {
    const s = spiders[PORTAL.i];
    return { placed: true, i: PORTAL.i, x: PORTAL.x, y: props.position.y, z: PORTAL.z, r: PORTAL.r, reach: PORTAL.reach, bearing: PORTAL.a,
      sealed: sealed(), guarded: guarded(), open: !guarded(), spider: s ? { state: s.st.state, x: s.st.x, z: s.st.z, d: Math.hypot(s.st.x - PORTAL.x, s.st.z - PORTAL.z), parked: s.parked } : null, glow: props.glow.open };
  },
  /** Every portal (fixed: world.js PORTALS) and its spider: { i, x, z, a, fill, spider: { state, x, z, d, parked, visible } | null }. */
  portals() {
    return PORTALS.map((L) => { const s = spiders[L.i]; return { i: L.i, x: L.x, z: L.z, a: +L.a.toFixed(3), fill: L.fill, spider: s ? { state: s.st.state, x: +s.st.x.toFixed(1), z: +s.st.z.toFixed(1), d: +Math.hypot(s.st.x - L.x, s.st.z - L.z).toFixed(1), parked: s.parked, visible: s.group.visible, rounds: s.st.rounds } : null }; });
  },
  /** The pondweed (world.js PONDWEED) and the hunting grounds' radius. */
  pondweed: { leaves: PONDWEED, ground: GROUND },
  /**
   * Testing only (it breaks the order on purpose): take player `slot` to a
   * portal, `d` mm short of its raft on its side toward the start (portal i,
   * or the nearest to them), and open the way on (the earlier encounters
   * not met: `testOpen`). Returns portal().
   */
  placePortal(a = null, slot = 0, d = 30, i = null) {
    const P = pls[slot] || pl;
    if (game.phase !== 'play') newGame();
    const L = PORTALS[i ?? nearestPortal(P.x, P.z).p.i];
    testOpen = true;
    api.teleport(slot, L.x - Math.cos(L.a) * d, L.z - Math.sin(L.a) * d);
    P.heading = L.a;
    focusSpider(L.i);
    return api.portal();
  },
  /** Testing: put player `slot` at (x, z) by portal i's raft, `d` mm out along bearing b from it (the way on not opened). */
  nearPortal(i, d = 120, b = null, slot = 0) {
    const L = PORTALS[i], a = b ?? L.a + Math.PI;
    api.teleport(slot, L.x + Math.cos(a) * d, L.z + Math.sin(a) * d);
    return { x: L.x + Math.cos(a) * d, z: L.z + Math.sin(a) * d };
  },
  /** Testing: are the portals still sealed (encounters left)? Set testOpen. */
  sealed(open = null) { if (open !== null) testOpen = !!open; return sealed(); },
  /** The portal arrow drawn last frame, per view: [{ x, y, angle, onScreen, portal, d, label } | null] ([] when off). */
  portalArrow() { return arrowLog; },
  /** Testing only: place encounter `k` ('stenus' | 'strider' | 'rain') at (x, z), met along bearing b, out of order. */
  placeEncounter(k, x, z, b = 0) { if (game.phase !== 'play') newGame(); return director.force(k, x, z, b); },
  /** The director (shared/director.js): state(), seenAt(x, z), placeNow(), log. */
  encounters() { return director.state(); },
  seenAt(x, z) { return director.seenAt(x, z); },
  placeNow() { return director.placeNow(); },
  /** Which players stand on an open portal (the "Y Enter the portal" prompt is up): their slots. */
  portalReady() { return lm.ready.map((P) => P.slot); },
  /** Testing: player `slot` presses Y on an open portal (what portalY does); false if they are not on one. */
  pressY(slot = 0) { const P = lm.ready.find((Q) => Q.slot === slot); if (!P || outro) return false; enterPortal(P); return true; },
  /** Go through the portal now as player `slot` (what Y on an open portal does). */
  enterPortal(slot = 0) { enterPortal(pls[slot] || pl); },
  /** The outro after the portal: null, or { t, scale (the world's time scale), frozen, cam (the shell's pose) }. */
  outro() { return outro ? { t: +outro.t.toFixed(3), scale: +outro.scale.toFixed(3), frozen: outro.frozenAt !== null, cam: outro.cam } : null; },
  /** The outro's timings (seconds); `rate` slows it (tests). */
  OUTRO,
  /** Testing: advance the outro by n frames of dt, rendering each (deterministic stills). */
  outroStep(n = 1, dt = 1 / 30) { for (let i = 0; i < n && outro; i++) { const ts = stepOutro(dt); if (ts > 0) step(dt * ts, null); render(dt); } return api.outro(); },
  get frames() { return frames; },
  get layout() { return split.layout; },
  recs: () => recs().map((P) => ({ slot: P.slot, x: +P.x.toFixed(2), z: +P.z.toFixed(2), mode: P.mode, color: P.color })),
  /** Testing (the split audit): each view's focus distance (mm) and depth-of-field factor as last drawn. */
  viewFx: () => viewFx.slice(0, Math.max(1, split.views.length)),
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
  settle(n = 30) { for (let i = 0; i < n; i++) { easeLook(1 / 30); render(1 / 30); } },
  /**
   * Testing: hold RT (1: look far), LT (-1: a close look) or let go (0) for player `slot`, as the
   * triggers would (null: back to the pad). Returns every player's eased look.
   */
  lookHold(v = 1, slot = 0) { lookForce[slot] = v === null ? undefined : v; return looks.map((l) => l && +l.u.toFixed(3)); },
  /** Testing: the look state: each player's eased u, and the camera's lens and focus this frame. */
  lookState() { return { u: looks.map((l) => l && +l.u.toFixed(3)), fx: rig.lookFx && { u: +rig.lookFx.u.toFixed(3), f: +rig.lookFx.L.f.toFixed(1), hfw: +rig.lookFx.L.hfw.toFixed(1), focus: +rig.lookFx.focus.toFixed(1), dofK: +rig.lookFx.dofK.toFixed(2) }, fov: +camera.fov.toFixed(2), focus: +macroShared.uFocus.value.toFixed(1), columns: props.columns() }; },
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
  /**
   * Testing: land player `slot` on sundew leaf `i` (stuck in its glue; the struggle starts).
   * Returns the leaf's { x, y, z, r }.
   */
  stickOnLeaf(i = 0, slot = 0) {
    if (game.phase !== 'play') newGame();
    const P = pls[slot] || pl, leaf = world.sundews.leaves[i];
    if (capture.active) return null;
    withRec(P, () => { resetBody(P, leaf.x, leaf.z); stickToLeaf(P, leaf); });
    rig.target.set(P.x, P.y + 0.25, P.z);
    return { x: leaf.x, y: leaf.y, z: leaf.z, r: leaf.r };
  },
  /** Testing: the struggle on a sundew leaf (null when not stuck), the glue strands snapped, the motes in flight, and a respawn's re-forming. */
  struggle(slot = 0) {
    const P = pls[slot] || pl, S = P.stuckS;
    return { mode: P.mode, progress: S ? +S.progress.toFixed(3) : null, sink: S ? +S.sink.toFixed(3) : null, idle: S ? +S.idle.toFixed(2) : null, thrash: S ? +S.thrash.toFixed(2) : null,
      snapped: P.glue && P.glueOn ? P.glue.snapped : 0, motes: motes.count, reformT: P.mode === 'reform' ? +P.reformT.toFixed(2) : null, dissolve: +P.dissolve.toFixed(2), x: P.x, z: P.z };
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
      P.x = leaf.x; P.z = leaf.z; stickToLeaf(P, leaf); P.stuckS.sink = 1; leaf.curl = 0.85;
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
  fights, fightLog,
  /** The wolf spider in focus (the nearest portal's). */
  get boss() { return boss; },
  /** Testing: the boss (the nearest portal's spider) wakes and comes for player `slot` (put beside its post; the way on opened). */
  bossFight(slot = 0) {
    const P = pls[slot] || pl;
    if (game.phase !== 'play') newGame();
    pace.mode = 'Always'; pace.anywhere = true; hunger.stenus.reset(0); hunger.stenus.update(0.01);
    api.placePortal(null, slot, 40);
    const ux = Math.cos(PORTAL.a), uz = Math.sin(PORTAL.a);
    resetBody(P, boss.post.x - ux * 14, boss.post.z - uz * 14); P.heading = PORTAL.a; boss.reset(); boss.parked = false; rig.target.set(P.x, P.y, P.z);
  },
  /** Testing: last pounce-bite result for player `slot`. */
  impact(slot = 0) { const P = pls[slot] || pl; return { last: P.lastImpact || null, pounces: P.pounces || 0, mode: P.mode, dive: !!(P.air && P.air.dive) }; },
  /** Testing: jump from player `slot` toward (x, z) with the given power (as if released). */
  jumpAt(slot, x, z, power = 0.4) { const P = pls[slot] || pl; withRec(P, () => { jump(x - P.x, z - P.z, power); const t = pounceTarget(P.x, P.z, x - P.x, z - P.z, 40, 0.5, true); if (t && P.air) P.air.pounce = t; }); },
  /** Testing: a predator comes for player `slot`, head to head 3 mm off, hungry and stalking (it winds up next). */
  setFoe(kind = 'stenus', slot = 0) {
    if (game.phase !== 'play') newGame();
    const P = pls[slot] || pl;
    hunger[kind].reset(0); hunger[kind].update(0.01); pace.mode = 'Always'; pace.anywhere = true;
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
  calm() { pace.mode = 'Never'; pace.anywhere = false; stenus.release(); strider.release(); },
  /** The level: the start and the encounters' water (live: placed by the director; parked far off until then). */
  route: { start: START, zones: ZONES },
  /** How far through the encounters the game is (shared by every player): met / all, 0..1. */
  progress() { return encounterProgress(); },
  /** When each challenge first became active: { stenus, stenusHunt, stenusNear, stenusMet, strider, striderHunt, striderNear, striderMet, crowd, crowdNear, rain, rainMet, sundewNear, sundewStuck, portal, portalNear, boss, bossLured, bossReturn } -> { progress (encounters met / all), d (mm from the start), x, z, t }. */
  challengeLog,
  /** Testing: read the pads and step the simulation n times (no rendering): mock pads drive it fast. */
  tick(n = 1, dt = 1 / 30) {
    for (let i = 0; i < n; i++) {
      const inp = readInput(dt); easeLook(dt); step(dt, inp);
      stepViews(dt);
    }
  },
  /** Testing: what Stenus is doing in its two-stage strike. */
  stenusStage() { return { state: stenus.st.state, stage: stenus.stage, t: +stenus.st.t.toFixed(2), wriggle: pl.wriggle, mode: pl.mode, cock: pl.cock }; },
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
// The shell holds animation frames while paused; do not count that pause as
// elapsed animation time on the first resumed frame.
embed.on('resume', () => { last = performance.now(); });
function gpuBusy() {
  if (!fence) return false;
  if (gl.getSyncParameter(fence, gl.SYNC_STATUS) !== gl.SIGNALED) return true;
  gl.deleteSync(fence); fence = null;
  return false;
}
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const visualDt = Math.max(0, (now - last) / 1000);
  const dt = Math.min(visualDt, 1 / 30);
  last = now;
  if (api.paused) return;
  frames++;
  // held by the shell in a transition (this world is never the new one yet), or in the outro: no input
  const ts = outro ? stepOutro(dt) : 1;
  const inp = outro || embed.held ? null : readInput(dt);
  easeLook(dt);
  if (ts > 0 && !embed.held) { game.t += dt * ts; step(dt * ts, inp, visualDt); }
  if (gpuBusy()) return;
  const raw = now - lastSubmit;
  lastSubmit = now;
  slowEma += (raw - slowEma) * 0.25;
  fps = 1000 / Math.max(slowEma, 1);
  if (!PR) quality.update(raw / 1000);
  const L = render(dt);
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  statT += dt;
  if (statT > 0.25) { updateText(L); statT = 0; }
}
frame();

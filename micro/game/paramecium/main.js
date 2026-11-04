// Paramecium: Paramecium bursaria (green with symbiotic Chlorella) on a 2D
// microscope slide, darkfield by default, styled after the world's card
// (the owner, 2026-11-02: "make it visually look like the image I see on the
// selection card ... more like a 2D slide where the paramecium is quick and
// you battle other protists ... including trying to avoid a giant amoeba";
// then "2.5D", then "not 3 depth levels, just a continuous depth. I want it
// to feel 3D": a water volume four body lengths deep that you swim through,
// seen in perspective, creatures interacting across it; then "realistic
// microscope like": the focus is a separate plane that a patient operator
// turns back to you once your depth settles, focus.js). The zoom is analogue on LT/RT, from 0.9x the
// field (504 µm) out to 5.6x (3.1 mm), starting at 3x. Everything in the drop can be pushed, bent, snapped
// or broken (stir.js: the jab's push wave and the body), and the drop grows richer toward the portal
// (world.js RICH). See README.md.
//
// Micro Zoom: the forward landmark (a biofilm on a leaf, guarded by a
// bladderwort trap) dives into the bacterium level; the backdoor (the
// amoeba's patch of slide) rises to the amoeba level. Up to four local
// players (shared/players.js), each their own cell, with the shared zoom-out
// and the LEGO-style split screen (shared/splitscreen.js, 2D).
import * as THREE from '../shared/vendor/three.module.min.js';
import { mountHud, keyFor } from '../shared/hud.js';
import { hudControls } from '../shared/controls.js';
import { loadTexture } from '../shared/assets.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { createPlayers } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks, portalArrowOn } from '../shared/landmark.js';
import { embed } from '../shared/embed.js';
import { createQuality } from '../shared/quality.js';
import { createPortalGlow, createPortalLight } from '../shared/portal.js';
import { createDirector } from '../shared/director.js';
import { createShapes } from './shapes.js';
import { createWorld, TILE } from './world.js';
import { createSwimState, stepSwim, dash as startDash, backOff, LENGTH, ZMIN, ZMAX, DASH_CD } from './swim.js';
import { makeWave, stepWaves, stepStir, bodyShove, pullTo, waveAt, WAVE } from './stir.js';
import { drawCell, drawCellHalo, VARIETIES, beatRate } from './cell.js';
import { createFocus, stepFocus, FOCUS } from './focus.js';
import { drawScenery, drawDileptus, drawDidinium, drawGiant, drawTrap, drawBloom, drawPrey, drawLeaf, makeLeaf, drawBack, drawSpirillum, drawKinClump, drawFight, drawMiss, drawWaves, SPIRILLUM } from './draw.js';
import { createDileptus, stepDileptus, burstDileptus, createDidinium, stepDidinium, blockDidinium, DIDINIUM, createGiant, stepGiant, burstGiant, GIANT, createTrap, stepTrap, burstTrap, trapObstacles, trapGuarding, trapDoor, TRAP, jabFoe, hitFoe, FIGHT } from './foes.js';
import { createBloom, placeBloom, stepBloom, gulpBloom, flingBloom, BLOOM } from './bloom.js';
import { createPrey, stepPrey, gulpPrey, spill, PREY } from './prey.js';
import { START, DEPTH, ZK, ZTOL, FIELD, ZOOM, BACK, DIRECTOR, ENCOUNTERS, DEFAULT_PATH, MET, DRIFT_TO, canPlace, didiniumHomes, trapAt, bandDist } from './route.js';
import { clumpLayout, placeInFrame } from '../shared/kin-clump.js';
import { t as tt, tx as ttx } from '../shared/text.js';
import { createCamLock } from '../shared/camlock.js';

const GOAL = 6; // prey to eat to divide
const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hyp = Math.hypot;
const sm01 = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // the shapes write display values; nothing is converted
renderer.autoClear = false;
renderer.setSize(innerWidth, innerHeight, false);

// --- players: P1 on the keyboard and the first controller; 2-4 join with any button on another ---
const players = createPlayers({
  max: 4,
  onJoin: (p) => { audio.play('shared/join', { volume: 0.6 }); hud.toast(tt('shared.players.joined', { n: p.slot + 1 })); embed.join(p.slot, p.color, p.name, players.toJSON()); syncCells(); },
  onLeave: (p) => { hud.toast(tt('shared.players.left', { n: p.slot + 1 })); embed.leave(p.slot); syncCells(); },
  onChange: (list) => { if (hud) hud.players(list); },
});
if (embed.players) players.fromJSON(embed.players);
embed.on('players', (r) => { players.fromJSON(r); syncCells(); });
const pad = players.pad(0);

const CONTROLS = {
  move: tt('paramecium.hud.controls.move'),
  camera: tt('paramecium.hud.controls.camera'),
  dash: tt('paramecium.hud.controls.dash'),
  attack: tt('paramecium.hud.controls.attack'),
  defend: tt('paramecium.hud.controls.defend'),
  secondary: tt('paramecium.hud.controls.secondary'),
  analog: tt('paramecium.hud.controls.analog'),
  look: tt('paramecium.hud.controls.look'),
};
const hud = mountHud({
  title: tt('paramecium.hud.title'),
  sub: tt('paramecium.hud.sub'),
  controls: hudControls(CONTROLS),
  note: tt('paramecium.hud.note', { goal: GOAL }),
});
hud.players(players.list);
const glyph = (b) => (hud.glyphs === 'keyboard' ? keyFor(b) || b : b);

// the goal strip and the depth gauge: what you are doing, at a glance (no hidden meters)
const goalEl = document.createElement('div');
goalEl.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(8,10,14,.66);color:#eef1f4;border-radius:12px;padding:6px 14px;font:600 13px/1.4 system-ui,sans-serif;pointer-events:none;white-space:nowrap;z-index:3;text-align:center';
document.body.appendChild(goalEl);
const gaugeEl = document.createElement('div');
gaugeEl.style.cssText = 'position:fixed;right:18px;top:50%;transform:translateY(-50%);width:34px;height:150px;pointer-events:none;z-index:3;font:600 10px system-ui,sans-serif;color:#cfd8e0;text-align:center';
gaugeEl.innerHTML = '<div style="opacity:.75">glass</div><div style="position:relative;margin:4px auto;width:4px;height:118px;border-radius:2px;background:linear-gradient(#9fc3e6,#2b3a4a 50%,#7a5a2a)"></div><div style="opacity:.75">slide</div>';
document.body.appendChild(gaugeEl);
const gaugeBar = gaugeEl.children[1];
const gaugeDots = [];

// --- the world ---
const shapes = createShapes(renderer, { floorZ: DEPTH.min });
const world = createWorld(11);
const dileptus = createDileptus();
const didinia = [createDidinium(0), createDidinium(1)];
const giant = createGiant();
const trap = createTrap();
const bloom = createBloom();
const prey = createPrey();
let leaf = { placed: false };
const game = { eaten: 0, divided: 0, t: 0 };
/** The jabs' push waves running now (stir.js): they shove, bend, snap and break what they reach. */
const waves = [];

// --- features ---
const features = createFeatures({ key: 'paramecium.v5', pad });
const LOOK_NAMES = ['Darkfield', 'Phase contrast', 'Brightfield'];
const LOOKS = {
  Darkfield: { bg: [0.004, 0.007, 0.014], add: 1, sub: 0, tile: 'dark', tileK: 0.16, shadow: 0.2, sprite: true },
  'Phase contrast': { bg: [0.3, 0.33, 0.31], add: 0.2, sub: 1.0, tile: 'phase', tileK: 0.55, subTint: [1, 1, 1], shadow: 0.3 },
  Brightfield: { bg: [0.86, 0.84, 0.76], add: 0, sub: 0.7, tile: null, tileK: 0, subTint: [1.0, 0.95, 0.9], shadow: 0.35 },
};
const PHASE_BG = [0.6, 0.655, 0.615]; // the bacterium's phase field (the dive turns the light to it)
// The world's forward (the owner, 2026-11-03): the view's turn is locked with the slide's +y up the
// screen (view.rot 0), so the layout has a "forward" (see README); RS left/right peeks instead.
const camLock = createCamLock({ forward: 0 });
const view = { look: 'Darkfield', parallax: true, tile: true, glitter: 1, rot: 0, cx: START.x, cy: START.y, focus: 0, vx: 0, vy: 0, fw: FIELD * ZOOM.start };
features.add({ id: 'look', group: 'Optics', choices: LOOK_NAMES, value: 'Darkfield',
  onChange: (v) => { view.look = v; } });
features.add({ id: 'depthcues', group: 'Optics', on: true,
  onChange: (v) => { view.parallax = v; } });
features.add({ id: 'tile', group: 'Optics', on: true, onChange: (v) => { view.tile = v; } });
features.add({ id: 'scenery', group: 'World', fixed: true });
const tiles = { dark: null, phase: null };
// the tiles lie far below the drop, out of focus: a small blurred copy of each is all the view needs (and cheap to sample)
function softTile(t) {
  const img = t.image, N = 512;
  try {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d');
    g.filter = 'blur(3px)';
    // drawn 3 x 3 and the middle kept, so the blur wraps across the seams
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) g.drawImage(img, i * N, j * N, N, N);
    const out = new THREE.CanvasTexture(c);
    out.wrapS = out.wrapT = THREE.RepeatWrapping; out.colorSpace = THREE.NoColorSpace; out.generateMipmaps = false; out.minFilter = THREE.LinearFilter;
    t.dispose();
    return out;
  } catch { return t; }
}
loadTexture('MP-P04').then((t) => { if (t) tiles.dark = softTile(t); });
loadTexture('MP-P05').then((t) => { if (t) tiles.phase = softTile(t); });
// the body art (MP-P06, darkfield, on #FF00FF): the magenta keyed out to black, premultiplied, so it simply adds to the field
const SPRITE_W = LENGTH * 1024 / 986, SPRITE_H = SPRITE_W / 2; // the cell spans 986 of the image's 1024 px
function keySprite(t) {
  try {
    const img = t.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const m = Math.max(0, Math.min(px[i], px[i + 2]) - px[i + 1]) / 255; // how much of the pixel is the magenta ground
      const bg = m > 0.82 ? 1 : m * 0.9;
      px[i] = Math.max(0, px[i] - bg * 255); px[i + 2] = Math.max(0, px[i + 2] - bg * 255); if (m > 0.82) px[i + 1] = 0;
      px[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    const out = new THREE.CanvasTexture(c);
    out.colorSpace = THREE.NoColorSpace; out.generateMipmaps = true; out.minFilter = THREE.LinearMipmapLinearFilter; out.magFilter = THREE.LinearFilter;
    t.dispose();
    return out;
  } catch { return null; }
}
loadTexture('MP-P06').then((t) => { if (t) { const k = keySprite(t); if (k) shapes.setSprite(k); } });

const audio = createAudio(['paramecium/amb-pool', 'paramecium/swim', 'paramecium/dash', 'paramecium/gulp', 'paramecium/trichocysts', 'paramecium/reverse', 'paramecium/didinium', 'paramecium/held', 'shared/portal-chime',
  'paramecium/depth', 'paramecium/burst', 'paramecium/stun', 'paramecium/dileptus', 'paramecium/slash', 'paramecium/giant', 'paramecium/giant-engulf', 'paramecium/trap-tell', 'paramecium/trap-fire', 'paramecium/divide', 'paramecium/vorticella', 'paramecium/bloom',
  'shared/portal-enter', 'shared/slowdown', 'shared/portal-near', 'shared/portal-sealed', 'shared/portal-appear', 'shared/backdoor', 'shared/death', 'shared/reform', 'shared/foe-flees', 'shared/join']);
audio.addToFeatures(features);
audio.loop('paramecium/amb-pool', { volume: 0.6 });
const swimLoop = audio.loop('paramecium/swim', { volume: 0 });
const quality = createQuality({ renderer, key: 'paramecium', scalePixelRatio: true });
quality.addToFeatures(features);

// --- the cells (one per player) ---
const cells = []; // P: { slot, color, S, live, dead, spawn, ... }
function makeCell(slot, x, y, a = Math.PI / 2, z = 0) {
  return {
    slot, color: players.list.find((p) => p.slot === slot)?.color || '#d2a24c', S: createSwimState(x, y, a, z), live: true, dead: null, spawn: 1, invuln: 0,
    burst: -1, jab: -1, jabCd: 0, charges: 3, chargeT: 0, beat: 0, bend: 0, squash: 0, vacuoles: [], engulfed: null, held: false,
    variety: VARIETIES[slot % VARIETIES.length], hint: {}, back: 0, atPortal: false, lastA: a,
    zoom: ZOOM.start, zoomWant: ZOOM.start, // the field is FIELD x zoom (LT out, RT in; each player their own)
    miss: null, // the last jab that missed: { t, x, y, z, why } (drawn as a fizzle where it fell short)
  };
}
const P1 = makeCell(0, START.x, START.y);
cells.push(P1);
function syncCells() {
  for (const p of players.list) {
    if (cells.some((c) => c.slot === p.slot)) continue;
    const near = cells.find((c) => c.live) || P1;
    const C = makeCell(p.slot, near.S.x + 150 * Math.cos(p.slot * 2), near.S.y + 150 * Math.sin(p.slot * 2), near.S.a, near.S.z);
    C.spawn = 0; C.invuln = 2; C.zoom = C.zoomWant = near.zoom;
    cells.push(C);
  }
  for (let i = cells.length - 1; i > 0; i--) if (!players.list.some((p) => p.slot === cells[i].slot)) cells.splice(i, 1);
  for (const c of cells) c.color = players.list.find((p) => p.slot === c.slot)?.color || c.color;
}
syncCells();
const multi = () => cells.length > 1;
const who = (P) => (multi() ? tt('paramecium.who', { n: P.slot + 1 }) : '');
/** A foe's name as shown (the foes report an English name, kept as data). */
const foeName = (by) => ttx('paramecium.foes')[by] ?? by;
const liveCells = () => cells.filter((c) => c.live);
/** The player as foes.js sees it. */
const foeView = () => cells;

// --- the encounters, placed as you go (shared/director.js; route.js) ---
const FWD = { x: 0, y: 0, b: 0 };
function placePortalAt(x, y, b) {
  leaf = makeLeaf(x, y);
  FWD.x = x; FWD.y = y; FWD.b = b;
  const [tx, ty] = trapAt(x, y, b);
  Object.assign(trap, { x: tx, y: ty, a: b + Math.PI, placed: true, state: 'dormant', t: 0, resolve: TRAP.resolve });
  glow.setPosition(x, y, 0);
  glow.group.visible = true;
  spir.x = x; spir.y = y; spir.z = DEPTH.min + 14;
  return leaf;
}
const director = createDirector({
  ...DIRECTOR, canPlace: (x, z, r) => canPlace(x, z, r), defaultPath: DEFAULT_PATH,
  entries: ENCOUNTERS.map((e) => ({
    ...e, single: true,
    place: (x, z, b) => {
      const y = z;
      if (e.id === 'dileptus') { Object.assign(dileptus, { home: { x, y }, x: x - Math.cos(b) * 60, y: y - Math.sin(b) * 60, a: b + Math.PI, placed: true, mode: 'idle', t: 0, grace: 1.5, drives: 0 }); return dileptus; }
      if (e.id === 'bloom') { placeBloom(bloom, x, y, b); return bloom; }
      if (e.id === 'giant') { Object.assign(giant, { home: { x, y }, x, y, placed: true, mode: 'roam', t: 0, grace: 1.5, pods: [] }); stepGiant(giant, [], 0); return giant; }
      if (e.id === 'didinium') {
        didiniumHomes(x, y, b).forEach(([hx, hy], i) => Object.assign(didinia[i], { home: { x: hx, y: hy }, x: hx, y: hy, a: b + Math.PI, placed: true, mode: 'idle', t: 0, grace: 1 + i * 2.5, misses: 0 }));
        return didinia;
      }
      return placePortalAt(x, y, b);
    },
    met: (h, [p]) => {
      if (e.id === 'dileptus') return hyp(p.x - dileptus.home.x, p.z - dileptus.home.y) < MET.dileptus || hyp(p.x - dileptus.x, p.z - dileptus.y) < MET.dileptus;
      if (e.id === 'bloom') return bandDist(p.x, p.z, bloom.x, bloom.y, bloom.b) < MET.bloom;
      if (e.id === 'giant') return hyp(p.x - giant.x, p.z - giant.y) < MET.giant;
      if (e.id === 'didinium') return didinia.some((d) => hyp(p.x - d.home.x, p.z - d.home.y) < MET.didinium || hyp(p.x - d.x, p.z - d.y) < MET.didinium);
      return hyp(p.x - FWD.x, p.z - FWD.y) < MET.portal;
    },
  })),
});
const PORTAL_INDEX = ENCOUNTERS.length - 1;
const portalSealed = () => director.state().index < PORTAL_INDEX;
const guarded = () => trapGuarding(trap);
const challengeLog = [];
/** The current encounter comes over to a player who lingers (behaviour, not a placement: main's driftEncounter). */
let lingerT = 0;
function driftEncounter(dt) {
  const s = director.state();
  const L = s.leader && cells.find((c) => c.slot === s.leader.id);
  if (!L || s.phase !== 'placed' || s.current === 'portal' || s.leader.moving) { lingerT = 0; return; }
  lingerT += dt;
  if (lingerT < 4) return;
  const homes = s.current === 'dileptus' ? [dileptus.home] : s.current === 'giant' ? [giant.home, giant] : s.current === 'didinium' ? didinia.map((d) => d.home) : s.current === 'bloom' ? [bloom] : [];
  for (const o of homes) {
    const d = hyp(L.S.x - o.x, L.S.y - o.y);
    const stop = DRIFT_TO[s.current];
    if (d <= stop) continue;
    const k = Math.min(d - stop, 300 * dt) / d, dx = (L.S.x - o.x) * k, dy = (L.S.y - o.y) * k;
    o.x += dx; o.y += dy;
    if (o === bloom) for (const c of bloom.cells) { c.x += dx; c.y += dy; }
  }
}
/** The director's views: each view's field (a turned rectangle, a margin for parallax). */
const dirViews = [0, 1, 2, 3].map(() => ({ frustum: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], focus: { x: 0, y: 0, z: 0 } }));
let lastViews = [{ cx: START.x, cy: START.y, hw: 320, hh: 180 }];
function directorViews() {
  const c = Math.cos(view.rot), s = Math.sin(view.rot);
  return lastViews.slice(0, 4).map((v, i) => {
    const D = dirViews[i], hw = v.hw * 1.2, hh = v.hh * 1.2;
    const ex = [c, s], ey = [-s, c];
    const dc = (e) => e[0] * v.cx + e[1] * v.cy;
    D.frustum[0] = [-ex[0], 0, -ex[1], dc(ex) + hw]; D.frustum[1] = [ex[0], 0, ex[1], -dc(ex) + hw];
    D.frustum[2] = [-ey[0], 0, -ey[1], dc(ey) + hh]; D.frustum[3] = [ey[0], 0, ey[1], -dc(ey) + hh];
    D.focus.x = v.cx; D.focus.y = 0; D.focus.z = v.cy;
    return D;
  });
}
const dirPlayers = () => cells.map((c) => ({ id: c.slot, x: c.S.x, z: c.S.y, alive: c.live }));

// --- the portal: the golden glow over the leaf (shared/portal.js), drawn over the field with a camera looking down ---
const GLOW_S = 200, GLOW_D = 10;
const glowScene = new THREE.Scene();
const glowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const _buf = new THREE.Vector2();
const glow = createPortalGlow({ THREE, scene: glowScene, size: 1, height: 0.9, beam: 0, count: 70, intensity: 1.25, pixelHeight: () => renderer.getDrawingBufferSize(_buf).y * GLOW_S * GLOW_D });
glow.group.rotation.x = Math.PI / 2;
glow.group.scale.set(GLOW_S, 1, GLOW_S);
glow.group.visible = false;
const glowUI = (() => { let u = null; glow.group.traverse((o) => { if (!u && o.material && o.material.uniforms && o.material.uniforms.uI) u = o.material.uniforms.uI; }); return u; })();
const GLOW_I = glowUI ? glowUI.value : 1;
const portalLight = createPortalLight({ zIndex: 3 });
const marks = createLandmarks();
// the next world's creature: a magnetotactic spirillum swimming over the biofilm
const spir = { x: 0, y: 0, z: DEPTH.min + 14, a: 0, roll: 0, home: 0 };

// --- the split screen (2D: the field drawn round a centre; its offsets turned with the view) ---
const SPLIT_ZOOM_MAX = 1.6;
const split = createSplitScreen(renderer, { capture: true, zoomMax: SPLIT_ZOOM_MAX });
const groupZoom = { z: 1, applied: 1 };
const toFrame = (x, y) => { const c = Math.cos(view.rot), s = Math.sin(view.rot), dx = x - view.cx, dy = y - view.cy; return { x: view.cx + dx * c + dy * s, y: view.cy - dx * s + dy * c, z: 0 }; };
const fromFrameOffset = (o) => { const c = Math.cos(view.rot), s = Math.sin(view.rot); return { x: o.x * c - o.y * s, y: o.x * s + o.y * c }; };

// ---------------------------------------------------------------- actions
const hintOnce = (P, k, text, ms = 3200) => { if (P.hint[k]) return; P.hint[k] = true; hud.toast(`${who(P)}${text}`, ms); };
const nearestThreatAngle = (P) => {
  let best = null, bd = 700;
  const consider = (x, y) => { const d = hyp(x - P.S.x, y - P.S.y); if (d < bd) { bd = d; best = Math.atan2(P.S.y - y, P.S.x - x); } };
  if (dileptus.placed) consider(dileptus.x, dileptus.y);
  for (const d of didinia) if (d.placed) consider(d.x, d.y);
  if (giant.placed) consider(giant.x, giant.y);
  if (trap.placed) { const D = trapDoor(trap); consider(D.x, D.y); }
  return best;
};
/** The hunters a jab can meet. */
const hunters = () => [dileptus, ...didinia, giant].filter((f) => f.placed && f.mode !== 'parked');
/** A hunter close enough to fight (in the plane and in depth): X jabs before it eats. */
const inFight = (P) => hunters().some((f) => {
  const r = f.kind === 'giant' ? GIANT.R + 260 : 380, z = f.kind === 'giant' ? GIANT.top : f.z;
  return f.mode !== 'flee' && f.mode !== 'retreat' && hyp(f.x - P.S.x, f.y - P.S.y) < r && (f.kind === 'giant' || Math.abs(z - P.S.z) < 160);
});
/**
 * X: a trichocyst jab ahead when a hunter is close (it lands, or it visibly
 * misses: out of reach, or out of the hunter's depth); else gulp prey at the
 * oral end, or a cone of algae in the bloom; else a jab at nothing.
 */
function attack(P) {
  const S = P.S;
  const fight = inFight(P) || P.engulfed;
  if (!fight) {
    const p = gulpPrey(prey, S);
    if (p) { ate(P, p.kind === 'chilomonas' ? tt('paramecium.food.chilomonas') : tt('paramecium.food.bacteria')); return; }
    const n = gulpBloom(bloom, S);
    if (n) {
      P.algae = (P.algae || 0) + n;
      audio.play('paramecium/gulp', { volume: 0.6, rate: 1.1 });
      if (P.algae >= BLOOM.perMeal) { P.algae -= BLOOM.perMeal; ate(P, tt('paramecium.food.chlamydomonas', { n: BLOOM.perMeal })); }
      return;
    }
  }
  if (P.jabCd > 0) return;
  // X in a dash (or just after one) is a strong jab: its wave reaches further and hits harder (it cracks
  // an empty diatom, tumbles a live one, crumbles a big clump)
  const strong = S.dashT > 0 || S.dashCd > DASH_CD - 0.4;
  P.jab = 0; P.jabCd = 0.35; P.miss = null; P.jabStrong = strong;
  waves.push(makeWave(S, { strong, slot: P.slot }));
  audio.play('paramecium/trichocysts', { volume: 0.7, rate: strong ? 1.1 : 1.3 });
  // held in the giant's cup: the jab bursts at it from inside (as B does)
  if (P.engulfed && P.engulfed.by === giant) {
    const r = burstGiant(giant, P);
    if (r) { landed(P, giant, r === 'fled' ? 'fled' : 'hit', P.S.x, P.S.y); log('jab', 'giant:' + r, P); }
    return;
  }
  // the nearest miss, to show why it fell short
  let best = null;
  for (const f of hunters()) {
    const j = jabFoe(f, P);
    if (j.hit) { const r = hitFoe(f, P, j); landed(P, f, r, j.x, j.y); log('jab', `${f.kind}:${r}`, P); return; }
    if (j.why !== 'gone' && (!best || j.d + j.dz < best.j.d + best.j.dz)) best = { f, j };
  }
  if (best && best.j.d < 220) {
    // a miss you can see: the threads fizzle where they fell short (or pass over or under it)
    const { f, j } = best;
    P.miss = { t: 0, x: j.x, y: j.y, z: S.z, why: j.why, foe: f.kind };
    log('miss', `${f.kind}:${j.why}`, P);
    hintOnce(P, 'miss-' + j.why, tt(j.why === 'depth' ? 'paramecium.toasts.missDepth' : 'paramecium.toasts.missReach'), 2600);
  }
}
/** A blow landed on hunter f (a jab or a block): flash, sound, rumble, a word once; it gives up at 0 interest. */
function landed(P, f, result, x, y) {
  audio.play('shared/hit', { volume: 0.85, old: ['paramecium/stun', { volume: 0.8 }] });
  audio.play('paramecium/stun', { volume: 0.5 });
  P.pad?.rumble?.(120, 0.45, 0.5);
  if (result === 'fled' || result === 'beaten') foeGivesUp(f, P);
  else if (f.kind === 'didinium') hintOnce(P, 'hitDid', tt('paramecium.toasts.hitDidinium'), 2400);
  else if (f.kind === 'dileptus') hintOnce(P, 'hitDil', tt('paramecium.toasts.hitDileptus'), 2400);
  else if (f.kind === 'giant') hintOnce(P, 'hitGiant', tt('paramecium.toasts.hitGiant'), 2600);
  void x; void y;
}
function foeGivesUp(f, P) {
  audio.play('shared/foe-flees', { volume: 0.7 });
  hud.toast(tt(f.kind === 'giant' ? 'paramecium.hints.giantGone' : f.kind === 'didinium' ? 'paramecium.hints.didiniumGone' : 'paramecium.hints.dileptusGone', { who: who(P) }), 2400);
  log('fled', f.kind, P);
}
function ate(P, what) {
  game.eaten++;
  P.vacuoles.push({ l: Math.random() * TAU, rho: 0.3 + Math.random() * 0.6, r: 4 + Math.random() * 2.5, age: 0 });
  if (P.vacuoles.length > 6) P.vacuoles.shift();
  audio.play('paramecium/gulp', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
  P.pad?.rumble?.(90, 0.3, 0.2);
  if (game.eaten >= GOAL) { game.eaten = 0; game.divided++; audio.play('paramecium/divide', { volume: 0.9 }); hud.toast(tt('paramecium.toasts.ateDivides', { who: who(P), what, n: game.divided }), 2600); }
  else hud.toast(tt('paramecium.toasts.ate', { who: who(P), what, eaten: game.eaten, goal: GOAL }), 1400);
}
/** Food spilled at (x, y, z): n clumps drifting out (a crumbled clump's bacteria, a cracked frustule's contents). */
function spillFood(x, y, z, n, speed = 70) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU; spill(prey, x + Math.cos(a) * 8, y + Math.sin(a) * 8, z + (Math.random() - 0.5) * 20, Math.cos(a) * speed, Math.sin(a) * speed); }
}
/** Something in the drop gave way (stir.js shove's events): food, a sound, a word the first time. */
function stirEvent(e, P, body = false) {
  if (!e) return;
  const vortSound = () => { if (!(game.vortSndT > game.t)) { game.vortSndT = game.t + 0.25; audio.play('paramecium/vorticella', { volume: 0.6, rate: 0.95 + Math.random() * 0.1 }); } };
  if (e.type === 'crack') {
    spillFood(e.x, e.y, e.z, 2);
    audio.play('paramecium/stun', { volume: 0.4, rate: 1.6 });
    P.pad?.rumble?.(90, 0.3, 0.3);
    log('stir', 'crack', P); hintOnce(P, 'crack', tt('paramecium.toasts.crack'), 2800);
  } else if (e.type === 'crumble') {
    spillFood(e.x, e.y, e.z, e.r > 45 ? 2 : 1, 55);
    audio.play('paramecium/bloom', { volume: 0.4, rate: 0.75 });
    log('stir', 'crumble', P); hintOnce(P, 'crumble', tt('paramecium.toasts.crumble'), 2800);
  } else if (e.type === 'spit') {
    spill(prey, e.x, e.y, e.z, Math.cos(e.a) * 80, Math.sin(e.a) * 80);
    vortSound(); log('stir', 'spit', P); hintOnce(P, 'spit', tt('paramecium.toasts.vortSpit'), 2800);
  } else if (e.type === 'snap') {
    vortSound(); log('stir', 'snap', P);
    if (!body) hintOnce(P, 'snap', tt('paramecium.toasts.vortSnap'), 2800);
  } else if (e.type === 'tumble') { log('stir', 'tumble', P); hintOnce(P, 'tumble', tt('paramecium.toasts.diatomLive'), 2800); }
  else if (e.type === 'push' && !body && e.kind === 'diatom') hintOnce(P, 'shove', tt('paramecium.toasts.diatomShove'), 2800);
}
/** B: the trichocyst burst (while charged) and the avoiding reaction. */
/**
 * B: the avoiding reaction (back up and swing away) and a block: a hunter's
 * strike at you (the Dileptus's slash, a Didinium's lunge) glances off the
 * trichocysts and knocks it back, charged or not. With a charge it is also a
 * trichocyst burst all round (frees you from the giant's cup, bursts you out
 * of the trap's inflow).
 */
function defend(P) {
  const S = P.S;
  const away = nearestThreatAngle(P);
  backOff(S, away);
  audio.play('paramecium/reverse', { volume: 0.7 });
  P.block = 0;
  let blocked = false;
  const rD = burstDileptus(dileptus, P);
  if (rD === 'driven' || rD === 'beaten') {
    blocked = true; log('block', 'dileptus:' + rD, P);
    audio.play('shared/block', { volume: 0.9, old: ['paramecium/stun', { volume: 0.8 }] });
    if (rD === 'beaten') foeGivesUp(dileptus, P);
    else hud.toast(tt('paramecium.toasts.dileptusRecoils', { who: who(P) }), 2200);
  } else if (rD === 'early') log('burst', 'dileptus:early', P);
  for (const d of didinia) {
    const r = blockDidinium(d, P);
    if (!r) continue;
    blocked = true; log('block', 'didinium:' + r, P);
    audio.play('shared/block', { volume: 0.9, old: ['paramecium/stun', { volume: 0.8 }] });
    if (r === 'beaten') foeGivesUp(d, P);
    else hud.toast(tt('paramecium.toasts.didiniumBlocked', { who: who(P) }), 2200);
  }
  if (blocked) { P.pad?.rumble?.(220, 0.6, 0.7); P.burst = 0; }
  if (P.charges <= 0) { if (!blocked) hintOnce(P, 'empty', tt('paramecium.toasts.noTrichocysts'), 2600); return; }
  P.charges--; P.burst = 0;
  audio.play('paramecium/trichocysts', { volume: 1 });
  audio.play('paramecium/burst', { volume: 0.8 });
  if (!blocked) P.pad?.rumble?.(200, 0.5, 0.6);
  const rG = burstGiant(giant, P);
  if (rG) { log('burst', 'giant:' + rG, P); if (rG === 'fled') foeGivesUp(giant, P); else if (rG === 'freed') hud.toast(tt('paramecium.toasts.burstCup', { who: who(P) }), 2000); }
  const rT = burstTrap(trap, P);
  if (rT) { log('burst', 'trap', P); hud.toast(tt('paramecium.toasts.burstInflow', { who: who(P), resolve: Math.max(0, trap.resolve) }), 2000); }
}
function log(type, what, P) { challengeLog.push({ type, what, slot: P ? P.slot : 0, t: +game.t.toFixed(2) }); if (challengeLog.length > 200) challengeLog.shift(); }
/** Death: the player keeps control until this moment; then the cell dissolves (visible), and comes back. */
const DISSOLVE = 1.5, RESPAWN = 2.4;
function kill(P, by, how) {
  if (!P.live || P.invuln > 0 || outro) return;
  P.live = false; P.dead = { t: 0, by, how }; P.engulfed = null;
  hud.toast(tt('paramecium.toasts.eaten', { who: who(P), by: foeName(by), how }), 2600);
  audio.play('paramecium/held', { volume: 1 });
  if (by === 'Dileptus') audio.play('paramecium/slash', { volume: 0.7 });
  audio.play('shared/death', { volume: 0.7, delay: 0.5 });
  P.pad?.rumble?.(500, 0.8, 0.9);
  embed.captured({ by, player: P.slot });
  log('died', by, P);
}
function respawn(P) {
  const others = cells.filter((c) => c !== P && c.live);
  let x, y, z = 0;
  if (others.length) { const o = others[0]; x = o.S.x - Math.cos(o.S.a) * 160; y = o.S.y - Math.sin(o.S.a) * 160; z = o.S.z; }
  else {
    // a little back toward the start, at the spot furthest from every hunter
    const bx = P.S.x + (START.x - P.S.x) * 0.15, by = P.S.y + (START.y - P.S.y) * 0.15;
    let best = -1;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU, cx = bx + Math.cos(a) * 650, cy = by + Math.sin(a) * 650;
      let d = 1e9;
      if (dileptus.placed) d = Math.min(d, hyp(cx - dileptus.x, cy - dileptus.y));
      for (const q of didinia) if (q.placed) d = Math.min(d, hyp(cx - q.x, cy - q.y));
      if (giant.placed) d = Math.min(d, hyp(cx - giant.x, cy - giant.y) - GIANT.R);
      if (trap.placed) d = Math.min(d, hyp(cx - trap.x, cy - trap.y) - 300);
      if (bloom.placed) d = Math.min(d, bandDist(cx, cy, bloom.x, bloom.y, bloom.b) + 200);
      if (d > best) { best = d; x = cx; y = cy; }
    }
  }
  Object.assign(P.S, { x, y, z: clamp(z, ZMIN, ZMAX), v: 0, dashT: 0, backT: 0 });
  P.live = true; P.dead = null; P.spawn = 0; P.invuln = 2.5; P.charges = 3;
  audio.play('shared/reform', { volume: 0.7 });
  for (const f of [dileptus, ...didinia]) if (f.target === P) { f.target = null; if (f.mode !== 'parked') f.mode = 'idle'; f.grace = 3; }
}

// ---------------------------------------------------------------- landmarks: the portal and the way back
const lm = { log: [], portal: false, nearing: false, back: false, latch: false, turned: false };
const BACKR = 260;
function stepLandmarks(dt) {
  // the way on unseals (every encounter met): heard once, on the edge
  const isSealed = portalSealed();
  if (lm.wasSealed && !isSealed) audio.play('shared/portal-appear', { volume: 0.8 });
  lm.wasSealed = isSealed;
  // the way on: down on the biofilm (over the leaf, deep in the drop)
  let any = null;
  for (const P of cells) {
    P.atPortal = leaf.placed && P.live && hyp(P.S.x - FWD.x, P.S.y - FWD.y) < leaf.r * 0.85 && P.S.z < -50 * ZK;
    if (P.atPortal) any = P;
  }
  if (leaf.placed) {
    const dmin = Math.min(...cells.map((P) => hyp(P.S.x - FWD.x, P.S.y - FWD.y)));
    const nearing = !portalSealed() && dmin < 1400;
    // (said again now and then while near: a shell busy with a fade when it came keeps no record of it; preloading is idempotent)
    lm.nearT = (lm.nearT || 0) + dt;
    if (nearing !== lm.nearing || (nearing && lm.nearT > 1.5)) { lm.nearing = nearing; lm.nearT = 0; embed.near('forward', nearing); }
    if (dmin < 900 && !portalSealed() && guarded()) hintOnce(P1, 'trap', tt('paramecium.toasts.bossHint'), 4000);
  }
  if (any && !lm.latch) {
    lm.latch = true;
    if (portalSealed()) { audio.play('shared/portal-sealed', { volume: 0.6 }); hud.toast(tt('paramecium.toasts.sealed', { who: who(any) }), 2600); }
    else if (guarded()) {
      audio.play('shared/portal-sealed', { volume: 0.6 });
      // turned back: swept off the leaf by the trap's guard
      lm.log.push({ kind: 'turnedBack', slot: any.slot, t: +game.t.toFixed(2) });
      hud.toast(tt('paramecium.toasts.sweptBack', { who: who(any) }), 2400);
      const a = Math.atan2(any.S.y - FWD.y, any.S.x - FWD.x);
      any.S.x = FWD.x + Math.cos(a) * leaf.r * 1.05; any.S.y = FWD.y + Math.sin(a) * leaf.r * 1.05; any.S.z = Math.max(any.S.z, -20 * ZK);
    } else hintOnce(any, 'portal', tt('paramecium.toasts.portal'), 2400);
  }
  if (!any) lm.latch = false;
  setPortalPrompt(!!any && !outro && !portalSealed() && !guarded());
  // the way back: dwell on the amoeba's patch of slide, deep
  let back = null;
  for (const P of cells) { const on = P.live && hyp(P.S.x - BACK.x, P.S.y - BACK.y) < BACKR && P.S.z < -40 * ZK; P.back = on ? P.back + dt : 0; if (P.back > 0.5) back = P; }
  if (!!back !== lm.back) { lm.back = !!back; embed.near('back', lm.back); }
}
function setPortalPrompt(on) { if (on === lm.portal) return; lm.portal = on; if (on) audio.play('shared/portal-near', { volume: 0.6 }); embed.near('portal', on); }
const atOpenPortal = (P) => P.atPortal && !outro && !portalSealed() && !guarded();
/** The way on: P at the open portal pressed Y (never an automatic door: the owner, 2026-11-01). */
function enterPortal(P) {
  if (outro) return;
  setPortalPrompt(false);
  glow.burst();
  audio.play('shared/portal-enter', { volume: 0.8 });
  startOutro(P);
  lm.log.push({ kind: 'forward', slot: P.slot, t: +game.t.toFixed(2) });
  embed.landmark('forward', { player: P.slot, outro: embed.active });
}
/** The spirillum: round the film's middle, or up to just ahead of whoever is down on the leaf. */
function stepSpirillum(dt, snap = false) {
  if (!leaf.placed) return;
  const P = cells.find((c) => c.atPortal) || (outro && outro.P);
  let wx, wy;
  if (P) { wx = P.S.x + Math.cos(P.S.a) * (LENGTH / 2 + 30); wy = P.S.y + Math.sin(P.S.a) * (LENGTH / 2 + 30); }
  else { spir.home += dt * 0.25; wx = FWD.x + Math.cos(spir.home) * 60; wy = FWD.y + Math.sin(spir.home) * 60; }
  const d = hyp(wx - spir.x, wy - spir.y);
  if (snap && d > 20) { spir.x = wx; spir.y = wy; }
  else if (d > 0.5) {
    const want = Math.atan2(wy - spir.y, wx - spir.x);
    spir.a = wrap(spir.a + clamp(wrap(want - spir.a), -4 * dt, 4 * dt));
    const v = Math.min(d, 60 * dt);
    spir.x += Math.cos(spir.a) * v; spir.y += Math.sin(spir.a) * v;
  } else spir.a += dt * 0.6;
  spir.roll += dt * 9;
}

// ---------------------------------------------------------------- the continuous transition
// Out (embed.js "Continuous transitions"; ../../game/README.md): through the
// portal a golden burst, a bloom on screen, the chime and a rumble; time
// eases to a stop over ~1 s while the view keeps drawing. Frozen, it reports
// how the spirillum is framed (a 2D pose: pitch 1.55, rel its on-screen
// heading + π/2) and asks for the dive (DIVE): the shell's poses then narrow
// the field onto it while the light turns from darkfield to the bacterium's
// phase contrast, its kin clump shows as a dark mass, the slime thins and the
// mass resolves into bacteria, and the bacterium world fades in under the
// same framing. All three neighbours are 2D slides now, so the move is one
// continuous narrowing of the same kind of view.
// In: provides 'intro'. Held at its start, it draws its opening view (the
// cell centred, facing up the screen), reports how that frames it, and
// follows the shell's poses (the amoeba's P. bursaria beacon → this cell);
// on `begin` time eases back in.
const OUTRO = { beat: 0.3, ease: 1.0, hold: 1.4, back: 0.6, giveUp: 8, rate: 1 };
const DIVE = { duration: 5.2, fade: [0.5, 0.78], halo: [0.5, 0.68] };
const LIGHT = [0.03, 0.3], SLIME = [0.36, 0.6];
const TOP_PITCH = 1.55;
let outro = null, intro = null, diveLight = 0;
let fxT = 0;
const portalBloom = createPortalLight({ zIndex: 4, clock: () => fxT });
/** The base field width (µm) at the current objective, before the group zoom. */
const baseField = () => FIELD * (innerWidth >= innerHeight ? 1 : 0.62);
/** The zoom of a view showing these players: the widest of theirs (so nobody's view is narrowed by another's). */
const zoomOf = (slots) => { let z = 0; for (const c of cells) if (slots.includes(c.slot)) z = Math.max(z, c.zoom); return z || P1.zoom; };
const aspect = () => innerHeight / Math.max(1, innerWidth);
/** A creature at (x, y), heading a, length len, as a pose in the view drawn now. */
function pose2D(x, y, a, len) {
  const w = view.fw, h = w * aspect(), q = toFrame(x, y);
  return { f: len / w, x: (q.x - view.cx) / (w / 2), y: (q.y - view.cy) / (h / 2), pitch: TOP_PITCH, rel: wrap(a - view.rot + Math.PI / 2) };
}
/** Set the view (centre, width, turn) so a creature at (x, y), heading a, length len, is framed as `pose` says. */
function poseView(pose, x, y, a, len) {
  const w = len / Math.max(1e-6, pose.f), h = w * aspect();
  view.rot = wrap(a + Math.PI / 2 - pose.rel);
  const o = fromFrameOffset({ x: pose.x * w / 2, y: pose.y * h / 2 });
  view.cx = x - o.x; view.cy = y - o.y; view.fw = w;
}
const spirPose = () => pose2D(spir.x, spir.y, spir.a, SPIRILLUM.L);
const cellPose = () => pose2D(P1.S.x, P1.S.y, P1.S.a, LENGTH);
function startOutro(P) {
  outro = { t: 0, scale: 1, frozenAt: null, cam: null, heard: false, P, u: 0 };
  stepSpirillum(0, true);
  const s = toScreen(FWD.x, FWD.y), c = toScreen(P.S.x, P.S.y);
  portalBloom.bloom(s.x, s.y, { scale: 1.2 }); portalBloom.bloom(c.x, c.y, { scale: 0.7 });
  audio.play('shared/portal-chime', { volume: 0.9 });
  audio.play('shared/slowdown', { volume: 0.5, delay: OUTRO.beat });
  P.pad?.rumble?.(520, 0.55, 0.85);
  if (embed.active) { embed.cinematic(true, canvas); portalBloom.canvas.style.visibility = 'visible'; }
}
function stepOutro(dt) {
  const o = outro;
  o.t += dt * OUTRO.rate; fxT += dt * OUTRO.rate;
  o.scale = 1 - sm01(OUTRO.beat, OUTRO.beat + OUTRO.ease, o.t);
  if (o.scale <= 0 && o.frozenAt === null) {
    o.frozenAt = o.t; o.f0 = spirPose().f;
    if (embed.active) embed.frozen(spirPose(), DIVE);
  }
  if (o.frozenAt !== null) {
    const held = o.t - o.frozenAt;
    const back = !embed.active ? held - OUTRO.hold : !o.heard && held > OUTRO.giveUp ? held - OUTRO.giveUp : -1;
    if (back >= 0) { o.scale = sm01(0, OUTRO.back, back); if (back >= OUTRO.back) endOutro(); }
  }
  return outro ? outro.scale : 1;
}
function endOutro() { outro = null; if (embed.active) embed.cinematic(false, canvas); }
embed.on('camera', (d) => {
  if (!d.pose) return;
  if (outro) { outro.cam = d.pose; outro.heard = true; if (Number.isFinite(d.u)) outro.u = d.u; }
  if (intro && !('ease' in intro)) intro.cam = d.pose;
});
embed.on('pause', () => { if (outro) outro.heard = true; });
embed.provide('intro');
const INTRO_EASE = 0.6;
embed.on('hold', () => {
  intro = { cam: null };
  view.rot = 0; view.cx = P1.S.x; view.cy = P1.S.y; view.fw = baseField() * P1.zoom; view.focus = P1.S.z; focals.clear();
  embed.cinematic(true, canvas);
  embed.opening({ f: LENGTH / view.fw, x: 0, y: 0, pitch: TOP_PITCH, rel: wrap(P1.S.a + Math.PI / 2) });
});
embed.on('begin', () => { embed.cinematic(false, canvas); intro = { ease: 0 }; });
function introEase(dt) {
  if (!intro || !('ease' in intro)) return 1;
  intro.ease += dt;
  const k = sm01(0, INTRO_EASE, intro.ease);
  if (intro.ease >= INTRO_EASE) intro = null;
  return k;
}
const introHeld = () => embed.held || !!(intro && !('ease' in intro));

// ---------------------------------------------------------------- input and simulation
let t = 0;
function stepPlayer(P, dt, input) {
  const S = P.S;
  P.invuln = Math.max(0, P.invuln - dt);
  P.jabCd = Math.max(0, P.jabCd - dt);
  if (P.miss) { P.miss.t += dt; if (P.miss.t > 0.6) P.miss = null; }
  if (P.block >= 0) { P.block += dt; if (P.block > 0.5) P.block = -1; }
  if (P.burst >= 0) P.burst += dt; if (P.burst > 1) P.burst = -1;
  if (P.jab >= 0) P.jab += dt; if (P.jab > 1) P.jab = -1;
  if (P.charges < 3) { P.chargeT += dt; if (P.chargeT >= 3) { P.chargeT = 0; P.charges++; } } else P.chargeT = 0;
  for (const v of P.vacuoles) v.age += dt;
  if (P.spawn < 1) P.spawn = Math.min(1, P.spawn + dt / 0.8);
  if (P.dead) {
    P.dead.t += dt;
    S.v *= Math.exp(-dt * 4);
    S.x += Math.cos(S.a) * S.v * dt; S.y += Math.sin(S.a) * S.v * dt;
    if (P.dead.by === 'the giant amoeba' && giant.placed) { S.x += (giant.x - S.x) * dt * 0.3; S.y += (giant.y - S.y) * dt * 0.3; }
    if (P.dead.by === 'the bladderwort trap' && trap.placed) { const D = trapDoor(trap); S.x += (trap.x - S.x) * dt * 2; S.y += (trap.y - S.y) * dt * 2; void D; }
    if (P.dead.t >= RESPAWN) respawn(P);
    return;
  }
  const env = { obstacles: [...world.near(S.x, S.y, 170, t), ...trapObstacles(trap)], drag: bloomDrag.get(P) ?? 1, push: trapPush.get(P) || null, held: !!P.engulfed };
  if (P.engulfed && giant.placed) { S.x += (giant.x - S.x) * dt * 0.25; S.y += (giant.y - S.y) * dt * 0.25; }
  stepSwim(S, input, env, dt);
  // the body shoves what it touches (stir.js): diatoms slide, filaments bend, stalks snap, flocs sweep along
  for (const e of bodyShove(world, S, dt, t)) stirEvent(e, P, true);
  // how long this cell's depth has held still (the microscope's operator refocuses on the most settled)
  P.stillT = Math.abs(S.vz) > FOCUS.moving ? 0 : (P.stillT || 0) + dt;
  // contacts: a puff and a rumble on a real bump (a weave is quiet)
  for (const c of S.contacts) if (!c.weave && c.pen > 3 && !P.bumpCd) { P.bumpCd = 0.25; P.pad?.rumble?.(60, 0.2, 0.1); }
  P.bumpCd = Math.max(0, (P.bumpCd || 0) - dt);
  if (S.contacts.some((c) => c.weave)) hintOnce(P, 'weave', tt('paramecium.toasts.weave'), 3000);
  // the body: bend into a turn, squash in a dash; the cilia beat with the speed
  const turn = wrap(S.a - P.lastA) / Math.max(dt, 1e-3); P.lastA = S.a;
  P.bend += (clamp(turn / 6, -1, 1) - P.bend) * Math.min(1, dt * 8);
  P.squash += ((S.dashT > 0 ? 1 : 0) - P.squash) * Math.min(1, dt * 10);
  P.beat += beatRate(S.v) * dt;
  // the wake: specks swept along the body and shed behind it, glittering (as the card shows the cell's trail)
  P.wake ||= [];
  const sp = Math.abs(S.v);
  P.wakeAcc = (P.wakeAcc || 0) + dt * Math.min(60, sp / 14);
  while (P.wakeAcc >= 1 && P.wake.length < 90) {
    P.wakeAcc -= 1;
    const side = Math.random() < 0.5 ? -1 : 1, u = -LENGTH * (0.2 + Math.random() * 0.35), v = side * (18 + Math.random() * 14);
    const ca = Math.cos(S.a), sa = Math.sin(S.a);
    P.wake.push({ x: S.x + ca * u - sa * v, y: S.y + sa * u + ca * v, z: S.z + (Math.random() - 0.5) * 30, vx: -ca * sp * 0.08 - sa * side * 25, vy: -sa * sp * 0.08 + ca * side * 25, t: 0, gold: Math.random() < 0.6 });
  }
  for (const w of P.wake) { w.t += dt; w.x += w.vx * dt; w.y += w.vy * dt; w.vx *= Math.exp(-dt * 2); w.vy *= Math.exp(-dt * 2); }
  while (P.wake.length && P.wake[0].t > 1.6) P.wake.shift();
}
const _in = { mx: 0, my: 0, m: 0, depth: 0 };
function readInput(P, dt, frozen) {
  _in.mx = _in.my = _in.m = _in.depth = 0;
  const c = frozen || !P.live ? null : players.controls(P.slot);
  if (!c) { camLock.peek(P.slot, 0, dt); return _in; }
  const m = c.move();
  // the stick in the view's frame: up the screen is the view's up
  const sx = m.x, sy = -m.y, cr = Math.cos(view.rot), sr = Math.sin(view.rot);
  _in.mx = sx * cr - sy * sr; _in.my = sx * sr + sy * cr; _in.m = Math.min(1, m.m);
  const rs = c.camera();
  // RS: up deeper (into the slide), down shallower (toward you); left/right peeks sideways (the view's
  // turn is locked to the slide's up, shared/camlock.js). With the Free camera setting and one player,
  // far left/right turns the view as it used to.
  const free = camLock.free(players.active.length);
  camLock.peek(P.slot, free ? 0 : rs.x, dt);
  if (free && Math.abs(rs.x) > 0.7 && Math.abs(rs.x) > Math.abs(rs.y)) view.rot = wrap(view.rot - rs.x * 1.5 * dt);
  else _in.depth = clamp(rs.y, -1, 1);
  _in.depth = clamp(_in.depth + c.secondary(), -1, 1);
  // deeper / shallower: heard where the depth input starts
  const diving = Math.abs(_in.depth) > (P.diving ? 0.3 : 0.5);
  if (diving && !P.diving) audio.play('paramecium/depth', { volume: 0.5, rate: _in.depth > 0 ? 0.9 : 1.1 });
  P.diving = diving;
  if (c.dash.pressed()) {
    const dir = _in.m > 0.2 ? Math.atan2(_in.my, _in.mx) : null;
    if (startDash(P.S, dir)) {
      audio.play('paramecium/dash', { volume: 0.9 }); P.pad?.rumble?.(160, 0.5, 0.7);
      // flung through the bloom: the algae scatter (flingBloom returns how many it flung, or nothing)
      if (flingBloom(bloom, P.S)) audio.play('paramecium/bloom', { volume: 0.7 });
    }
  }
  if (c.attack.pressed()) attack(P);
  if (c.defend.pressed()) defend(P);
  if (c.special.pressed()) {
    if (atOpenPortal(P)) enterPortal(P);
    else if (P.back > 0.5) { lm.log.push({ kind: 'back', slot: P.slot, t: +game.t.toFixed(2) }); audio.play('shared/backdoor', { volume: 0.55 }); embed.landmark('back', { player: P.slot }); }
  }
  if (P === P1) {
    const ls = c.lookStep ? c.lookStep() : 0;
    if (ls) { const i = (LOOK_NAMES.indexOf(view.look) + ls + LOOK_NAMES.length) % LOOK_NAMES.length; features.set('look', LOOK_NAMES[i]); }
  }
  return _in;
}
/**
 * The zoom: LT out, RT in, analogue and continuous (each player their own,
 * read even while the world is paused by a panel, never in a cinematic):
 * the trigger sets how fast the wanted zoom moves, and the zoom eases to it.
 */
const zoomForce = [];
function stepZoom(P, dt, frozen) {
  const c = players.controls(P.slot);
  const f = zoomForce[P.slot];
  const rate = f !== undefined ? f : !frozen && c ? (c.lt ? c.lt() : 0) - (c.rt ? c.rt() : 0) : 0;
  if (Math.abs(rate) > 0.04) P.zoomWant = clamp(P.zoomWant * Math.exp(rate * ZOOM.rate * dt), ZOOM.min, ZOOM.max);
  P.zoom += (P.zoomWant - P.zoom) * (1 - Math.exp(-dt / ZOOM.ease));
  if (Math.abs(P.zoom - P.zoomWant) < 1e-4) P.zoom = P.zoomWant;
}
/**
 * The drop stirred (stir.js): the push waves run out and shove what they reach (scenery, prey, the bloom,
 * the trap's hairs), the shoved things settle, open Vorticella draw food in, the trap's pulse drags the
 * light things (and prey) to its door.
 */
function stepStirring(dt) {
  for (const w of waves) w.P = cells.find((c) => c.slot === w.slot) || P1;
  for (const e of stepWaves(world, waves, dt, t)) stirEvent(e, cells.find((c) => c.slot === e.slot) || P1);
  stepStir(world, dt);
  for (const w of waves) {
    if (w.t > WAVE.dur + 0.02) continue;
    // prey: knocked along (a Chilomonas darts off)
    for (const p of prey.list) {
      if (p.dying > 0 || w.hit.has(p)) continue;
      const f = waveAt(w, p.x, p.y, p.z, p.r || 6);
      if (!f) continue;
      w.hit.add(p);
      const a = Math.atan2(p.y - w.y, p.x - w.x);
      if (p.kind === 'chilomonas') { p.a = a; p.v = 420; p.cd = 1.2; } else { p.vx = (p.vx || 0) + Math.cos(a) * 110 * f; p.vy = (p.vy || 0) + Math.sin(a) * 110 * f; }
    }
    // the bloom's cells: pushed out of the way along the wave
    if (bloom.placed && hyp(bloom.x - w.x, bloom.y - w.y) < 1200) for (const c of bloom.cells) {
      if (c.gone > 0 || w.hit.has(c)) continue;
      const f = waveAt(w, c.x, c.y, c.z, 3);
      if (!f) continue;
      w.hit.add(c);
      const dx = c.x - w.x, dy = c.y - w.y, d = hyp(dx, dy) || 1;
      c.x += dx / d * 22 * f; c.y += dy / d * 22 * f;
    }
    // the bladderwort: its antennae and trigger hairs wave; a set trap, its hairs touched, fires (early)
    if (trap.placed && !w.hit.has(trap)) {
      const D = trapDoor(trap);
      if (waveAt(w, D.x, D.y, D.z, 80)) {
        w.hit.add(trap); trap.wob = 1;
        if (trap.state === 'set') { trap.next = 0; log('stir', 'trap-trigger', w.P); }
      }
    }
  }
  if (trap.wob) { trap.wob *= Math.exp(-dt * 2.5); if (trap.wob < 0.01) trap.wob = 0; }
  // open Vorticella draw drifting food into their bells (their feeding current): food gathers at them
  for (const p of prey.list) {
    if (p.dying > 0 || p.kind !== 'clump') continue;
    world.eachIn(world.vorticella, p.x - 170, p.y - 170, p.x + 170, p.y + 170, (v, ox, oy) => {
      if (!world.vortOpen(v) || world.vis(v, ox, oy) < 0.5) return;
      const q = world.vortPose(v, ox, oy, t);
      const mx = q.x1 + Math.cos(q.a) * 26, my = q.y1 + Math.sin(q.a) * 26, dx = mx - p.x, dy = my - p.y, d = hyp(dx, dy);
      if (d > 170 || d < 12 || Math.abs(p.z - q.z1) > 90) return;
      const sp = 8 + 36 * (1 - d / 170);
      p.x += dx / d * sp * dt; p.y += dy / d * sp * dt; p.z += (q.z1 - p.z) * Math.min(1, dt * 0.6);
    }, 400);
  }
  // the trap's pulse drags in what is loose near its door (diatoms, flocs, prey)
  if (trap.placed && trap.state === 'pulse') {
    const D = trapDoor(trap);
    pullTo(world, D.x, D.y, D.z, TRAP.reach, 520, dt, t);
    for (const p of prey.list) {
      if (p.dying > 0) continue;
      const dx = D.x - p.x, dy = D.y - p.y, d = hyp(dx, dy);
      if (d > TRAP.reach) continue;
      if (d < TRAP.suck) { p.dying = 0.001; continue; }
      const k = 480 * Math.pow(1 - d / TRAP.reach, 0.7);
      p.x += dx / d * k * dt; p.y += dy / d * k * dt;
    }
  }
}
/**
 * The gradient's reference (world.js setRichRef): the portal's leaf (before it is placed, the director's
 * default-path portal). If the portal moves (placed as you go, ahead of you), the reference follows it
 * over several seconds, so the drop turns rather than jumps.
 */
const richRef = { x: 0, y: 0, set: false };
function stepRich(dt) {
  let tx, ty;
  if (leaf.placed) { tx = FWD.x; ty = FWD.y; } else { const ps = director.portals(); if (!ps.length) return; tx = ps[0].x; ty = ps[0].z; }
  if (!richRef.set) { richRef.x = tx; richRef.y = ty; richRef.set = true; }
  else {
    const d = hyp(tx - richRef.x, ty - richRef.y), m = Math.max(500, d * 0.15) * dt;
    if (d > m) { richRef.x += (tx - richRef.x) * m / d; richRef.y += (ty - richRef.y) * m / d; } else { richRef.x = tx; richRef.y = ty; }
  }
  world.setRichRef(richRef.x, richRef.y);
}
let bloomDrag = new Map(), trapPush = new Map();
function stepWorld(dt) {
  game.t += dt;
  const list = foeView();
  const ev = [];
  ev.push(...stepDileptus(dileptus, list, dt));
  for (const d of didinia) ev.push(...stepDidinium(d, list, dt));
  ev.push(...stepGiant(giant, list, dt));
  const tr = stepTrap(trap, list, dt);
  ev.push(...tr.ev);
  trapPush = tr.pushes;
  bloomDrag = stepBloom(bloom, list, dt);
  // more food toward the biofilm (the gradient: world.js RICH)
  stepPrey(prey, list, dt, t, (P) => PREY.perPlayer + Math.round(4 * world.rich(P.S.x, P.S.y)));
  stepRich(dt);
  stepStirring(dt);
  // what the giant covers, it eats too (prey, algae)
  if (giant.placed) {
    for (const p of prey.list) if (!p.dying && hyp(p.x - giant.x, p.y - giant.y) < GIANT.R * 0.9) p.dying = 0.001;
  }
  const startled = world.stepVorticella(dt, (v) => cells.some((P) => { const ox = Math.round((P.S.x - v.ax) / TILE) * TILE, oy = Math.round((P.S.y - v.ay) / TILE) * TILE; const p = world.vortPose(v, ox, oy, t); return hyp(P.S.x - p.x1, P.S.y - p.y1) < 110 && Math.abs(P.S.z - p.z1) < 60; }));
  // a Vorticella startled by a swimmer snaps its stalk shut: heard once per contraction (at most every 0.25 s)
  if (startled.length && !(game.vortSndT > game.t)) { game.vortSndT = game.t + 0.25; audio.play('paramecium/vorticella', { volume: 0.6, rate: 0.95 + Math.random() * 0.1 }); }
  for (const e of ev) {
    if (e.type === 'kill') kill(e.P, e.by, e.how);
    else if (e.type === 'engulf') { hintOnce(e.P, 'engulf', tt('paramecium.hints.giant'), 3600); audio.play('paramecium/giant-engulf', { volume: 0.7, old: ['paramecium/held', { volume: 0.7 }] }); }
    else if (e.type === 'tell' && e.who.kind === 'didinium') { audio.play('paramecium/didinium', { volume: 0.9 }); hintOnce(e.P, 'did', tt('paramecium.hints.didinium')); }
    else if (e.type === 'tell' && e.who.kind === 'dileptus') { audio.play('paramecium/dileptus', { volume: 0.8 }); hintOnce(e.P, 'dil', tt('paramecium.hints.dileptus')); }
    else if (e.type === 'miss' && e.who && e.who.kind === 'dileptus') audio.play('paramecium/slash', { volume: 0.6 }); // the slash sweeps past
    else if (e.type === 'hunt' && e.who === giant && !(giant.reachSndT > game.t)) { giant.reachSndT = game.t + 4; audio.play('paramecium/giant', { volume: 0.6 }); }
    else if (e.type === 'trap-tell') audio.play('paramecium/trap-tell', { volume: 0.8 });
    else if (e.type === 'trap-pulse') audio.play('paramecium/trap-fire', { volume: 0.5 });
    else if (e.type === 'fled') { audio.play('shared/foe-flees', { volume: 0.7 }); hud.toast(tt('paramecium.hints.dileptusGone', { who: '' }), 2000); }
    else if (e.type === 'trap-spent') hud.toast(tt('paramecium.hints.trapSlack'), 2800);
    if (/^(kill|miss|fled|rest|trap-)/.test(e.type)) log(e.type, e.who ? e.who.kind : e.by || '', e.P);
  }
  // director
  const dev = director.update(dt, dirPlayers(), directorViews());
  for (const e of dev) { challengeLog.push({ type: 'director', ev: e.type, id: e.id, how: e.how, t: +game.t.toFixed(2) }); if (e.type === 'met' && e.id === 'didinium' && !portalSealed()) {} }
  driftEncounter(dt);
}

// ---------------------------------------------------------------- the microscope's focus
// Each view has its own focal plane, turned by a patient operator (focus.js):
// it holds while its swimmer changes depth and refocuses once they settle.
// Keyed by the view's players; a shared view keeps its most settled player in
// focus. (The perspective is not lagged: view.focus, the swimmers' depth.)
const focals = new Map();
let worldDt = 0, focalFrame = 0;
function focalFor(slots) {
  const key = slots.slice().sort().join(',');
  const mine = cells.filter((c) => slots.includes(c.slot) && (c.live || c.dead));
  let best = null;
  for (const c of mine) if (!best || (c.stillT || 0) > (best.stillT || 0) + 0.05) best = c;
  const target = best ? best.S.z : view.focus;
  let F = focals.get(key);
  if (!F || F.used < focalFrame - 30) {
    // a new view (a split or a merge): it starts where the shared view's plane was
    const all = focals.get(cells.map((c) => c.slot).sort().join(','));
    F = Object.assign(createFocus(all && all !== F ? all.z : target), { key });
    focals.set(key, F);
  }
  if (F.used !== focalFrame) { stepFocus(F, target, worldDt); F.used = focalFrame; }
  return F;
}

// ---------------------------------------------------------------- the camera
function stepCamera(dt) {
  const live = cells.filter((c) => c.live || c.dead);
  if (!live.length) return;
  let x = 0, y = 0, z = 0, vx = 0, vy = 0;
  for (const c of live) { x += c.S.x; y += c.S.y; z += c.S.z; vx += c.S.vx; vy += c.S.vy; }
  const n = live.length;
  x /= n; y /= n; z /= n; vx /= n; vy /= n;
  // a little lead along the swim, critically damped (quick, no overshoot)
  const lead = n === 1 ? 0.14 : 0;
  const tx = x + vx * lead, ty = y + vy * lead;
  const k = 1 - Math.exp(-dt / 0.12);
  view.cx += (tx - view.cx) * k; view.cy += (ty - view.cy) * k;
  view.focus += (z - view.focus) * (1 - Math.exp(-dt / 0.1));
}
const toScreen = (x, y, slot = 0) => {
  const L = split.layout;
  if (L && L.views && !L.merged) { const v = L.views.find((q) => q.slots.includes(slot)) || L.views[0]; const p = split.project(v.index, toFrame(x, y)); return { x: p.x, y: p.y }; }
  const q = toFrame(x, y), w = view.fw, h = w * aspect();
  return { x: (q.x - view.cx) / w * innerWidth + innerWidth / 2, y: innerHeight / 2 - (q.y - view.cy) / h * innerHeight };
};

// ---------------------------------------------------------------- drawing
function currentLook() {
  return tintLook(lookNow());
}
function lookNow() {
  const L = LOOKS[view.look];
  if (diveLight <= 0) return L;
  const D = LOOKS.Darkfield, Ph = LOOKS['Phase contrast'], m = diveLight;
  return { bg: [0, 1, 2].map((i) => lerp(D.bg[i], PHASE_BG[i] * 0.5, m)), add: lerp(1, Ph.add, m), sub: lerp(0, Ph.sub, m), subTint: [1, 1, 1], tile: m < 0.5 ? 'dark' : 'phase', tileK: m < 0.5 ? D.tileK * (1 - 2 * m) : Ph.tileK * (2 * m - 1), shadow: lerp(D.shadow, Ph.shadow, m), sprite: m < 0.3 };
}
/**
 * The gradient's tint (world.js RICH; view.richK, eased, at the view's middle): toward the biofilm a warm
 * green creeps into the field and the habitat below, which thickens a little (the film's haze).
 */
function tintLook(L) {
  const g = view.richK || 0;
  const tile = L.tile === 'phase' ? [1, 1, 1] : [0.9, 0.95, 1.0];
  if (g < 0.002) return L.tileTint ? L : { ...L, tileTint: tile };
  const dark = L.add >= 0.99;
  const bg = dark ? [L.bg[0] + 0.012 * g, L.bg[1] + 0.016 * g, L.bg[2] - 0.006 * g] : [L.bg[0] * (1 + 0.01 * g), L.bg[1] * (1 + 0.035 * g), L.bg[2] * (1 - 0.13 * g)];
  const warm = L.tile === 'phase' ? [1.03, 1.05, 0.84] : [1.12, 1.06, 0.6];
  return { ...L, bg, tileK: L.tileK * (1 + 0.45 * g), tileTint: tile.map((v, i) => lerp(v, warm[i], g)) };
}
/** Perspective (route.js: the objective this far above the focal plane, µm): the scale of a thing dz above the focus. */
const PERSP = 900;
const persp = () => (view.parallax ? 1 / PERSP : 0);
const kAt = (dz) => 1 / Math.max(0.25, 1 - persp() * dz);
let focalNow = 0;
function fill(rect, lod = 1, focalOf = () => focalNow) {
  shapes.begin();
  const G = shapes;
  drawScenery(G, world, rect, t, { glitter: view.glitter, lod, waves });
  if (BACK) drawBack(G, BACK, t);
  if (leaf.placed) drawLeaf(G, leaf, t, { lawn: outro ? 1 - 0.75 * diveLight - 0.25 * sm01(SLIME[0], DIVE.fade[0], outro.u || 0) : 1 });
  drawGiant(G, giant, t);
  drawBloom(G, bloom, rect, t);
  drawPrey(G, prey, rect, t);
  drawTrap(G, trap, t);
  for (const d of didinia) drawDidinium(G, d, t);
  drawDileptus(G, dileptus, t);
  // fighting back: a blow that landed flashes on the hunter, and its interest shows over it while it hunts
  const up = fromFrameOffset({ x: 0, y: 1 });
  for (const f of [dileptus, ...didinia, giant]) drawFight(G, f, t, [up.x, up.y], [view.cx, view.cy]);
  if (leaf.placed) {
    const clumpK = outro ? sm01(0, OUTRO.beat + OUTRO.ease, outro.t) * (outro.frozenAt !== null ? 1 - outro.scale : 1) : 0;
    drawKinClump(G, spir, clumpK, 1 - sm01(SLIME[0], SLIME[1], outro ? outro.u || 0 : 0));
    drawSpirillum(G, spir, t, 1);
  }
  for (const P of cells) {
    if (!P.live && !P.dead) continue;
    const blink = P.invuln > 0 && P.live ? 0.65 + 0.35 * Math.cos(P.invuln * 18) : 1;
    for (const w of P.wake || []) { const k = 1 - w.t / 1.6; G.disc(w.x, w.y, 0.7, w.z, w.gold ? [1, 0.8, 0.4] : [0.85, 0.92, 1], 0.7 * k * k, 0.1, 0.4 * k, 1.5); }
    if (P.live) G.shadow(P.S.x, P.S.y, P.S.a, LENGTH / 2, 22, P.S.z, 0.55);
    drawCell(G, { x: P.S.x, y: P.S.y, z: P.S.z, a: P.S.a, v: P.S.v, bend: P.bend, squash: P.squash, t: t + P.slot * 7, beat: P.beat, variety: P.variety, burst: P.burst, jab: P.jab, jabStrong: P.jabStrong, dead: P.dead ? Math.min(1, P.dead.t / DISSOLVE) : 0, spawn: P.spawn, vacuoles: P.vacuoles, ring: multi() ? hexRgb(P.color) : null, alpha: blink, sprite: spriteOn, spriteW: SPRITE_W, spriteH: SPRITE_H });
    if (P.miss) drawMiss(G, P.miss, t);
    // out of focus, the cell keeps a readable halo
    // (zoomed out past the start, a soft outline as well, so the cell never shrinks into the scenery)
    const wide = Math.max(0, lod - 3.2) * 45;
    if (view.parallax || wide > 0) drawCellHalo(G, { x: P.S.x, y: P.S.y, z: P.S.z, a: P.S.a, dead: P.dead ? Math.min(1, P.dead.t / DISSOLVE) : 0, spawn: P.spawn, alpha: blink }, Math.max(view.parallax ? Math.abs(P.S.z - focalOf(P.slot)) : 0, wide));
  }
  drawWaves(G, waves);
  shapes.end();
}
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
let spriteOn = false;
function renderView(cx, cy, focus, look, hw = view.fw / 2, hh = hw * aspect(), focal = focus) {
  const W = renderer.domElement.width, w = hw * 2;
  shapes.setView({ cx, cy, hw, hh, rot: view.rot, focus, focal, pxUm: w / Math.max(1, W) });
  // the depth cues: perspective (parallax and scale), defocus, dimming (more below), the haze below the focus
  shapes.depth(persp(), view.parallax ? 0.06 : 0.015, view.parallax ? 0.0036 : 0.002, view.parallax ? 0.0016 : 0);
  const tex = view.tile && look.tile ? tiles[look.tile] : null;
  shapes.setTile(tex, look.tileK, look.tile === 'phase' ? 1000 : 1000, view.parallax ? 0.82 : 1, 0, look.tileTint || (look.tile === 'phase' ? [1, 1, 1] : [0.9, 0.95, 1.0]));
  shapes.render(look);
  // the portal's glow over it
  if (glow.group.visible && hyp(FWD.x - cx, FWD.y - cy) < Math.max(hw, hh) * 1.6 + GLOW_S * 3) {
    // in the same perspective as the leaf it hangs over (an orthographic camera widened by its depth's scale)
    const k = kAt(DEPTH.min + 8 - focus);
    glowCam.left = -hw / k; glowCam.right = hw / k; glowCam.top = hh / k; glowCam.bottom = -hh / k;
    glowCam.position.set(cx, cy, GLOW_D); glowCam.rotation.set(0, 0, view.rot);
    glowCam.updateProjectionMatrix(); glowCam.updateMatrixWorld();
    renderer.render(glowScene, glowCam);
  }
}
let fieldNow = 640;
function render(dt) {
  // the group's zoom-out (the split screen's): the field widens, only further apart does it split
  const camHeld = (outro && outro.cam) || (intro && intro.cam && !('ease' in intro));
  if (outro && outro.cam) poseView(outro.cam, spir.x, spir.y, spir.a, SPIRILLUM.L);
  else if (intro && intro.cam && !('ease' in intro)) poseView(intro.cam, P1.S.x, P1.S.y, P1.S.a, LENGTH);
  else { groupZoom.applied = multi() ? groupZoom.z : 1; view.fw = baseField() * zoomOf(cells.map((c) => c.slot)) * groupZoom.applied; }
  fieldNow = view.fw;
  // the gradient at the view's middle, eased (the tint)
  view.richK = lerp(view.richK || 0, world.rich(view.cx, view.cy), 1 - Math.exp(-dt / 1.5));
  // the dive's light: darkfield to phase contrast as the push begins
  diveLight = outro ? sm01(LIGHT[0], LIGHT[1], outro.u || 0) : 0;
  // the glow fades over the first ×1.5 of the dive's magnification, so its glints do not blow up into the frame
  if (glowUI) glowUI.value = GLOW_I * (outro && outro.cam && outro.f0 ? 1 - sm01(0, Math.log(1.5), Math.log(Math.max(1, outro.cam.f / outro.f0))) : 1);
  glow.setOpen(!guarded() && !portalSealed());
  glow.update(dt, t, glowCam);
  const hw0 = view.fw / 2;
  const list = cells.filter((c) => c.live || c.dead).map((c) => ({ slot: c.slot, position: toFrame(c.S.x, c.S.y) }));
  const L = split.update(list.length ? list : [{ slot: 0, position: toFrame(P1.S.x, P1.S.y) }], { center: { x: view.cx, y: view.cy }, pxPerUnit: innerWidth / view.fw, yUp: true, zoom: camHeld ? 1 : groupZoom.applied }, dt);
  groupZoom.z = split.zoom;
  // RS left/right peeks: each view's centre slides along the screen's right by up to peekFrac of the field
  if (!camHeld) camLock.applyPeek(split, (v, p) => ({ x: p * camLock.peekFrac * view.fw, y: 0 }));
  quality.setSplitViews(L.views.length);
  const look = currentLook();
  // the views: each one's centre and focus (its own players' depth). What a split view keeps of its
  // own (depth, focal plane, zoom) is eased in and out with the split (L.amount, 0 merged .. 1 split),
  // so the last split frame is the first merged one: the view's offset reaches zero on the same frame.
  const allSlots = cells.map((c) => c.slot);
  // (split: !L.merged, also while the views have joined into one on the way to a merge, whose offset
  // is then still the group's own)
  const splitNow = !L.merged && !camHeld;
  const Fall = focalFor(allSlots); // (kept stepping while split, so a merge eases back onto it)
  const cellAt = (j) => cells.find((c) => c.slot === L.players[j].slot) || P1;
  const vs = (splitNow ? L.views : [{ index: 0, offset: !camHeld && L.views[0] ? L.views[0].offset : { x: 0, y: 0 }, slots: allSlots }]).map((v) => {
    const o = fromFrameOffset(v.offset);
    const mine = cells.filter((c) => v.slots.includes(c.slot) && (c.live || c.dead));
    // the view's own depth, focal plane (each player's own, focus.js) and zoom, blended with the split
    // (split.viewBlend: continuous through the split, the merge and players joining one view)
    const focus = camHeld && outro ? lerp(view.focus, spir.z, sm01(0, 0.3, outro.u || 0)) : split.viewBlend(v, (j) => cellAt(j).S.z, view.focus);
    const fz = splitNow ? split.viewBlend(v, (j) => focalFor([L.players[j].slot]).z, Fall.z) : Fall.z;
    const focal = camHeld && outro ? lerp(fz, spir.z, sm01(0, 0.3, outro.u || 0)) : fz;
    // split, each view keeps its own players' zoom (the shared view: the widest of everyone's), zoomed
    // about its players, so they stay where the split screen shows them (their region's middle)
    const zAll = zoomOf(allSlots);
    const r = splitNow ? split.viewBlend(v, (j) => cellAt(j).zoom / zAll, 1) : 1;
    let cx = view.cx + o.x, cy = view.cy + o.y;
    if (r !== 1 && mine.length) {
      const mx = mine.reduce((s, c) => s + c.S.x, 0) / mine.length, my = mine.reduce((s, c) => s + c.S.y, 0) / mine.length;
      cx = mx - r * (mx - cx); cy = my - r * (my - cy);
    }
    const hw = hw0 * r;
    return { index: v.index, cx, cy, focus, focal, slots: v.slots, hw, hh: hw * aspect() };
  });
  lastViews = vs;
  // fill the shapes once for every view: the union of their fields, with room for the turn and for the
  // perspective (what lies deepest below the focus is drawn smallest, so more of it is in view)
  // (the turned view's own bounding box: the turn is locked to the slide's up in play, so this is the view's rectangle)
  const cr = Math.abs(Math.cos(view.rot)), sr = Math.abs(Math.sin(view.rot));
  const RX = Math.max(...vs.map((v) => (cr * v.hw + sr * v.hh) / kAt(DEPTH.min - v.focus))) + 30;
  const RY = Math.max(...vs.map((v) => (sr * v.hw + cr * v.hh) / kAt(DEPTH.min - v.focus))) + 30;
  const rect = [Math.min(...vs.map((v) => v.cx)) - RX, Math.min(...vs.map((v) => v.cy)) - RY, Math.max(...vs.map((v) => v.cx)) + RX, Math.max(...vs.map((v) => v.cy)) + RY];
  spriteOn = !!look.sprite && shapes.hasSprite;
  focalNow = vs[0].focal;
  fill(rect, Math.max(...vs.map((v) => v.hw)) * 2 / FIELD, (slot) => (vs.find((v) => v.slots.includes(slot)) || vs[0]).focal);
  renderer.setRenderTarget(null);
  if (vs.length === 1) renderView(vs[0].cx, vs[0].cy, vs[0].focus, look, vs[0].hw, vs[0].hh, vs[0].focal);
  else {
    for (const v of vs) { split.scissor(v.index, null); renderView(v.cx, v.cy, v.focus, look, v.hw, v.hh, v.focal); split.capture(v.index); }
    split.unscissor(null);
    split.compose();
  }
  // the edge marks: the way back (a quiet ring); the portal's light spills in from the edge; the arrow (setting)
  marks.begin();
  portalLight.begin();
  if (leaf.placed && !portalSealed() && !outro) {
    const d = Math.min(...cells.map((P) => hyp(P.S.x - FWD.x, P.S.y - FWD.y)));
    portalLight.drawSplit(split, toFrame(FWD.x, FWD.y), { strength: Math.max(0.3, Math.min(1, 1.2 - d / 1800)), open: glow.open });
  }
  if (!outro) marks.drawSplit(split, toFrame(BACK.x, BACK.y), { kind: 'backdoor', label: tt('paramecium.marks.pool'), range: 1500, onScreen: 'none' });
  drawPortalArrow();
}
let arrowLog = [];
function drawPortalArrow() {
  arrowLog = [];
  if (!portalArrowOn() || outro) return;
  const ps = director.portals();
  if (!ps.length) return;
  arrowLog = marks.drawSplit(split, (vp) => {
    let best = null, bd = Infinity;
    for (const p of ps) for (const v of vp) { const P = cells.find((c) => c.slot === v.slot); if (!P) continue; const d = hyp(P.S.x - p.x, P.S.y - p.z); if (d < bd) { bd = d; best = p; } }
    if (!best) return null;
    return { position: toFrame(best.x, best.z), label: bd >= 1000 ? `${(bd / 1000).toFixed(1)} mm` : `${Math.round(bd)} µm`, distance: bd };
  }, { kind: 'forward', portal: true, range: 1e9 }).map((r) => r && { x: r.x, y: r.y, angle: r.angle, onScreen: r.onScreen, label: r.picked && r.picked.label });
}

// ---------------------------------------------------------------- HUD
let goalText = '';
function updateHud() {
  const P = P1;
  const dashK = 1 - Math.max(0, P.S.dashCd) / 0.9;
  const dashBar = '▮'.repeat(Math.round(dashK * 4)) + '▯'.repeat(4 - Math.round(dashK * 4));
  const stars = '✦'.repeat(P.charges) + '✧'.repeat(3 - P.charges);
  // the depth, continuous: µm under the coverslip
  const depthName = (z) => tt('paramecium.status.depth', { um: Math.round(DEPTH.max - z) });
  let warn = '';
  for (const C of cells) {
    if (!C.live) { if (C.dead) warn = tt('paramecium.warn.eatenBy', { who: who(C), by: foeName(C.dead.by) }); continue; }
    if (C.engulfed) { warn = tt('paramecium.warn.engulfed', { who: who(C), glyph }); break; }
    if (trap.state === 'pulse' && trapPush.has(C)) { warn = tt('paramecium.warn.trapPulls', { who: who(C), glyph }); break; }
    for (const d of didinia) if (d.target === C && /crouch|lunge/.test(d.mode)) warn = tt('paramecium.warn.didinium', { who: who(C), glyph });
    if (dileptus.target === C && /windup|strike/.test(dileptus.mode)) warn = tt('paramecium.warn.dileptus', { who: who(C), glyph });
    if (!warn && giant.placed && giant.target === C && hyp(C.S.x - giant.x, C.S.y - giant.y) < GIANT.R + 320) warn = tt('paramecium.warn.giant', { who: who(C) });
  }
  const s = director.state();
  const way = !leaf.placed ? '' : portalSealed() ? '' : guarded() ? tt('paramecium.status.trap', { dots: '●'.repeat(Math.max(0, trap.resolve)) }) : tt('paramecium.status.wayOpen');
  const text = `<div>${tt(game.divided ? 'paramecium.status.lineDivided' : 'paramecium.status.line', { eaten: game.eaten, goal: GOAL, divided: game.divided, dash: dashBar, burst: stars, depth: depthName(P.S.z) })}${way}</div>${warn ? `<div style="color:#ff9c8a">${warn}</div>` : ''}`;
  if (text !== goalText) { goalText = text; goalEl.innerHTML = text; }
  void s;
  // the depth gauge: each player's depth between the coverslip (top) and the slide
  const H = 118;
  while (gaugeDots.length < cells.length) { const d = document.createElement('i'); d.style.cssText = 'position:absolute;left:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2px solid #0b0f14;box-sizing:border-box'; gaugeBar.appendChild(d); gaugeDots.push(d); }
  gaugeDots.forEach((d, i) => { const C = cells[i]; if (!C) { d.style.display = 'none'; return; } d.style.display = ''; d.style.background = multi() ? C.color : '#e9f0d0'; d.style.top = `${((DEPTH.max - C.S.z) / (DEPTH.max - DEPTH.min)) * H}px`; });
  gaugeEl.style.display = outro || introHeld() ? 'none' : '';
  goalEl.style.display = outro || introHeld() ? 'none' : '';
  if (!embed.active) {
    const fwd = leaf.placed ? `${(hyp(P.S.x - FWD.x, P.S.y - FWD.y) / 1000).toFixed(2)} mm` : '…';
    hud.stats(`field ${Math.round(fieldNow)} µm (zoom ${P.zoom.toFixed(2)}) · ${view.look} · z ${P.S.z.toFixed(0)} µm · portal ${fwd} · back ${(hyp(P.S.x - BACK.x, P.S.y - BACK.y) / 1000).toFixed(2)} mm · rich ${world.rich(P.S.x, P.S.y).toFixed(2)} · next ${s.current || '—'} (${s.phase})`);
  }
}

// ---------------------------------------------------------------- loop
let last = performance.now(), frameCount = 0;
const debug = { freeze: false };
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  quality.update(real);
  const dtRaw = Math.min(1 / 20, real);
  players.poll();
  hud.update(pad);
  const panel = features.update();
  for (const p of players.list) { const pp = players.pad(p.slot); for (let b = 0; b < 16; b++) if (pp && pp.value(b) > 0.5) { audio.unlock(); break; } }
  const held = introHeld();
  // the outro runs on the frame's real time (up to a quarter second a frame): a slow machine plays it slower, never skips it
  let scale = held ? 0 : outro ? stepOutro(Math.min(0.25, real)) : introEase(dtRaw);
  if (debug.freeze) scale = 0;
  const dt = dtRaw * scale;
  if (dt > 0) {
    t += dt;
    for (const P of cells) { P.pad = players.pad(P.slot); stepPlayer(P, dt, readInput(P, dt, panel || !!outro)); }
    camLock.keep(cells.map((P) => P.slot));
    // the view's turn: locked to the slide's up (eased back there when it was turned: the shell's pose, the free camera)
    if (!outro) view.rot = camLock.yaw(view.rot, dt, players.active.length, 0, false);
    stepWorld(dt);
    stepLandmarks(dt);
  } else if (held) {
    // drawn but not stepped: the shell's poses move the view
  }
  for (const P of cells) stepZoom(P, dtRaw, !!outro || held);
  worldDt = dt; focalFrame++;
  stepSpirillum(dtRaw * scale); // (frozen with the world: the dive's framing turns with it)
  if (!outro && !held) stepCamera(dtRaw);
  // the swim's sound follows the speed
  swimLoop.set({ volume: Math.min(0.5, Math.abs(P1.S.v) / 1400) });
  render(dtRaw);
  updateHud();
  frameCount++;
}
requestAnimationFrame(frame);
addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight, false));
split.prewarm?.();

// ---------------------------------------------------------------- test hooks
Object.assign(debug, {
  /** Place the portal now (as if every encounter before it were met). */
  placePortal() {
    const P = P1.S, b = P.a;
    director.force('portal', P.x + Math.cos(b) * 1500, P.y + Math.sin(b) * 1500, b);
    return { x: FWD.x, y: FWD.y };
  },
  /** Put player slot at (x, y), depth z, heading a. */
  teleport(x, y, z = null, a = null, slot = 0) {
    const P = cells.find((c) => c.slot === slot) || P1;
    P.S.x = x; P.S.y = y; if (z !== null) P.S.z = clamp(z, ZMIN, ZMAX); if (a !== null) { P.S.a = a; P.lastA = a; }
    if (P === P1 || !multi()) { view.cx = x; view.cy = y; }
  },
  /** P1 d µm from the leaf's middle on its far side (away from the trap), heading at it, low in the drop. */
  toPortal(d = 260, z = -90) { const b = FWD.b; debug.teleport(FWD.x + Math.cos(b) * d, FWD.y + Math.sin(b) * d, z, b + Math.PI); },
  /** The trap spent now (its guard down). */
  /** Player slot is eaten now (tests of the dissolve). */
  kill(slot = 0, by = 'Didinium') { const P = cells.find((c) => c.slot === slot) || P1; P.invuln = 0; kill(P, by, 'in a test'); },
  spendTrap() { trap.state = 'spent'; trap.t = 0; trap.resolve = 0; },
  /** Hold the zoom triggers for player slot as LT/RT would: +1 full LT (out), -1 full RT (in), null back to the pad. */
  zoomHold(v = 1, slot = 0) { zoomForce[slot] = v === null ? undefined : v; },
  /** Set player slot's zoom at once (1 closest .. ZOOM.max widest). */
  setZoom(z, slot = 0) { const P = cells.find((c) => c.slot === slot) || P1; P.zoom = P.zoomWant = clamp(z, ZOOM.min, ZOOM.max); },
  /** X and B for player slot, as the buttons do. */
  attack(slot = 0) { attack(cells.find((c) => c.slot === slot) || P1); },
  defend(slot = 0) { defend(cells.find((c) => c.slot === slot) || P1); },
  wakeBoss() { if (trap.placed) { trap.state = 'set'; trap.t = 0; trap.next = 0; } },
  /**
   * The nearest scenery of a kind to player slot ('diatom', 'clump', 'vort', 'filament'; filter(item) to
   * pick, e.g. d => d.empty): { x, y, z, a, it, ox, oy } (where it is now), or null.
   */
  nearest(kind, filter = () => true, slot = 0) {
    const P = cells.find((c) => c.slot === slot) || P1, R = 2600;
    const list = { diatom: world.diatoms, clump: world.clumps, vort: world.vorticella, filament: world.filaments }[kind];
    let best = null, bd = Infinity;
    world.eachIn(list, P.S.x - R, P.S.y - R, P.S.x + R, P.S.y + R, (it, ox, oy) => {
      if (!filter(it) || world.vis(it, ox, oy) < 0.5) return;
      let q;
      if (kind === 'diatom') { const p = world.diatomPose(it, ox, oy, t); if (p.s && (p.s.cracked || p.s.gone)) return; q = { x: p.x, y: p.y, z: p.z, a: p.a }; }
      else if (kind === 'clump') { const p = world.clumpPose(it, ox, oy); if (p.cr >= 0) return; q = { x: p.x, y: p.y, z: it.z, a: 0 }; }
      else if (kind === 'vort') { const p = world.vortPose(it, ox, oy, t); q = { x: p.x1, y: p.y1, z: p.z1, a: p.a, c: p.c }; }
      else q = { x: it.cx + ox, y: it.cy + oy, z: (it.z0 + it.z1) / 2, a: it.ang };
      const d = hyp(q.x - P.S.x, q.y - P.S.y);
      if (d < bd) { bd = d; best = { ...q, it, ox, oy, d }; }
    });
    return best;
  },
  /** The scenery state of a copy (what nearest() returned): its shove, crumble, crack, bends; a Vorticella's contraction. */
  stirOf(n) {
    if (!n) return null;
    if (world.vorticella.includes(n.it)) { const st = world.stalkState.get(n.it); return st ? { c: st.c, wob: st.wob || 0 } : { c: 0 }; }
    const s = world.dynOf(n.it, n.ox, n.oy);
    return s ? { ...s, it: undefined, kind: s.kind } : null;
  },
  /** The gradient toward the portal at (x, y) (0 open water .. 1 at the leaf) and its reference. */
  rich(x = P1.S.x, y = P1.S.y) { return { g: world.rich(x, y), leaf: world.leafK(x, y), back: world.backK(x, y), ref: { ...richRef } }; },
  place(id, x, y, b = 0) { director.force(id, x, y, b); return director.entry(id); },
  /**
   * A rush without rendering (tests): the real game logic stepped at 1/30 s, player 1 swimming along
   * `bearing` at full stick and dashing whenever it can, heading for the portal once it is open and near, `safe`
   * (no deaths) by default. Returns when each encounter was placed and met, and when the portal was reached.
   */
  rush({ bearing = 0.6, seconds = 120, safe = true, dash = true, steer = null, sight = 1600 } = {}) {
    const DT = 1 / 30, out = { placed: {}, met: {}, deaths: 0, track: [] };
    const base = director.log.length;
    let a = bearing;
    for (let k = 0; k < seconds / DT; k++) {
      t += DT;
      if (safe) P1.invuln = 1;
      const s = director.state();
      const toLeaf = leaf.placed && !portalSealed() && hyp(FWD.x - P1.S.x, FWD.y - P1.S.y) < sight; // (only once in sight: a player has no arrow)
      if (P1.engulfed && P1.charges > 0 && !(k % 15)) defend(P1); // (held in the giant's cup: burst out, as a player would)
      if (toLeaf) a = Math.atan2(FWD.y - P1.S.y, FWD.x - P1.S.x);
      else if (steer) { const b = steer(game.t, { x: P1.S.x, y: P1.S.y, a, s }); if (b !== null && b !== undefined) a = b; }
      if (dash && P1.S.dashCd <= 0) startDash(P1.S, a);
      if (k % 30 === 0) out.track.push([+game.t.toFixed(1), Math.round(P1.S.x), Math.round(P1.S.y)]);
      if (guarded() && hyp(P1.S.x - FWD.x, P1.S.y - FWD.y) < 900) debug.spendTrap();
      const input = { mx: Math.cos(a), my: Math.sin(a), m: 1, depth: toLeaf && hyp(P1.S.x - FWD.x, P1.S.y - FWD.y) < 700 ? -1 : 0 };
      for (const P of cells) stepPlayer(P, DT, P === P1 ? input : { mx: 0, my: 0, m: 0, depth: 0 });
      stepWorld(DT); stepLandmarks(DT); stepCamera(DT);
      lastViews = [{ cx: view.cx, cy: view.cy, hw: baseField() * P1.zoom / 2, hh: baseField() * P1.zoom / 2 * aspect() }];
      if (P1.dead && P1.dead.t < DT * 1.5) out.deaths++;
      if (P1.atPortal && !portalSealed() && !guarded()) { out.portal = +game.t.toFixed(1); break; }
    }
    for (const e of director.log.slice(base)) { if (e.type === 'placed' && !(e.id in out.placed)) out.placed[e.id] = +e.t.toFixed(1); if (e.type === 'met') out.met[e.id] = +e.t.toFixed(1); }
    return out;
  },
});
window.__micro = {
  get t() { return t; }, scene: shapes.scene, renderer, split, get layout() { return split.layout; }, players, cells, P1, view, world, director,
  dileptus, didinia, giant, trap, bloom, prey, get leaf() { return leaf; }, spir, game, debug, features, glow, waves,
  /** run.mjs and perf compatibility: P1's state (swimmer.state.center). */
  swimmer: { get state() { return { ...P1.S, center: { x: P1.S.x, y: P1.S.y, z: P1.S.z } }; } },
  /** teleport(x, y, a, slot); perf's 6-argument call (x, y, z, yaw, pitch, slot) works too. */
  teleport(x, y, a, slot = 0) { if (arguments.length >= 6) { slot = arguments[5]; a = null; } debug.teleport(x, y, null, a ?? null, slot); },
  get landmarks() { return { forward: { x: FWD.x, y: FWD.y, z: FWD.y, placed: !!leaf.placed }, back: { ...BACK }, log: lm.log, near: lm.back, nearing: lm.nearing, portal: lm.portal, embed: embed.active }; },
  portals: () => director.portals(),
  portalSealed, guarded, portalArrow: () => arrowLog,
  enterPortal(slot = 0) { enterPortal(cells.find((c) => c.slot === slot) || P1); },
  OUTRO, DIVE, ZOOM, FIGHT,
  foes: () => [dileptus, ...didinia, giant].map((f) => ({ kind: f.kind, mode: f.mode, placed: f.placed, x: +f.x.toFixed(1), y: +f.y.toFixed(1), z: +(f.z ?? 0).toFixed(1), interest: +(f.interest ?? 1).toFixed(2), hitT: f.hitT })),
  outro: () => outro && { t: +outro.t.toFixed(3), scale: +outro.scale.toFixed(3), frozen: outro.frozenAt !== null, u: outro.u, light: +diveLight.toFixed(3) },
  spirillum: () => ({ x: spir.x, y: spir.y, z: spir.z, a: spir.a, pose: spirPose() }),
  cellPose,
  /** The kin clump's cells on screen now (normalised device coordinates; the shell-path checks compare them with the bacterium's). */
  clumpScreen(n = 8) { return clumpLayout().slice(0, n).map((c) => { const q = placeInFrame(c, spir.x, spir.y, spir.a), f = toFrame(q.x, q.y), w = view.fw, h = w * aspect(); return { kind: c.kind, x: +((f.x - view.cx) / (w / 2)).toFixed(4), y: +((f.y - view.cy) / (h / 2)).toFixed(4) }; }); },
  challenges: () => challengeLog.slice(),
  /** The views as last drawn: centre, half extents (µm), the perspective's depth (focus) and the focal plane. */
  views: () => lastViews.map((v) => ({ index: v.index, slots: v.slots, cx: v.cx, cy: v.cy, hw: v.hw, hh: v.hh, focus: v.focus, focal: v.focal })),
  /** Where player `slot`'s cell is drawn now (CSS px from the top left), through its view as drawn (perspective included). */
  shown(slot = 0) {
    const c = cells.find((q) => q.slot === slot), v = lastViews.find((q) => q.slots && q.slots.includes(slot)) || lastViews[0];
    if (!c || !v) return null;
    const k = kAt(c.S.z - (v.focus ?? view.focus)), rx = (c.S.x - v.cx) * k, ry = (c.S.y - v.cy) * k;
    const cr = Math.cos(view.rot), sr = Math.sin(view.rot), x = rx * cr + ry * sr, y = -rx * sr + ry * cr;
    return { x: innerWidth / 2 + (x / v.hw) * innerWidth / 2, y: innerHeight / 2 - (y / v.hh) * innerHeight / 2, view: v.index };
  },
  state: () => ({ t: +t.toFixed(2), director: director.state(), eaten: game.eaten, divided: game.divided, cells: cells.map((c) => ({ slot: c.slot, x: +c.S.x.toFixed(1), y: +c.S.y.toFixed(1), z: +c.S.z.toFixed(1), a: +c.S.a.toFixed(2), v: +c.S.v.toFixed(0), live: c.live, dead: c.dead && c.dead.by, engulfed: !!c.engulfed })), trap: { state: trap.state, resolve: trap.resolve, log: trap.log.slice(-8) }, sealed: leaf.placed && portalSealed(), open: leaf.placed && !portalSealed() && !guarded(), prompt: lm.portal, shapes: shapes.count, shadows: shapes.shadows, sprite: shapes.hasSprite, field: Math.round(fieldNow), zoom: cells.map((c) => +c.zoom.toFixed(3)), focus: +view.focus.toFixed(1), focal: +focalNow.toFixed(1), focals: [...focals.values()].map((F) => ({ key: F.key, z: +F.z.toFixed(1), mode: F.mode, turns: F.turns, interrupted: F.interrupted })), views: split.layout ? split.layout.views.length : 1 }),
};

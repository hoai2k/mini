// Zoom transitions prototype: reach a destination in one world, a point is
// highlighted, the camera zooms continuously into it, and that point becomes
// the next world. Every world is a scale band of one multi-scale specimen
// (specimen.js), so the zoom target really contains the next world; the look
// (optics) morphs through one image-formation model (zoom-optics.js) before,
// during or after the zoom. See README.md.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad, BTN } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { createControls, createDash, hudControls } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { createZoomOptics, LOOKS } from '../shared/techniques/zoom-optics.js';
import { zoomField, EASES, STRATEGIES, makeTimeline, timelineState, tauAtZoom, scaleBar, fmtLen, eyepieceMag } from '../shared/techniques/zoom-path.js';
import { FIELD_VS, FIELD_FS } from './specimen.js';
import { WORLDS, TRANSITIONS, G, toGlobal, CHAIN_CONST, groundAt } from './chain.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.autoClear = false;
const pad = createPad();
const ctl = createControls(pad);
const dash = createDash({ duration: 0.3, cooldown: 1.0 });

const hud = mountHud({
  title: 'Zoom transitions',
  sub: 'Reach the spot, watch it highlighted, then zoom into it: the spot becomes the next world. Compare switching the look before, during or after the zoom.',
  controls: hudControls({
    move: 'Move the creature (a demo drives it if you leave it)',
    dash: 'Dash · on the highlighted frame: zoom now · hold: skip it',
    attack: 'Frame flash style',
    defend: 'Reverse: zoom back out',
    special: 'Replay this transition',
    analog: 'Scrub the transition (LT back, RT forward); A resumes',
    secondary: 'Previous / next transition',
    look: 'Strategy: look first / during / zoom first / crossfade / cut',
    zoom: 'Previous / next transition',
  }),
  note: 'One specimen at every scale: the zoom target is the next world. Field widths, the scale bar and the magnification (180 mm ÷ field, a 10× eyepiece) are true; creature speeds are real except the tun’s revival (sped up, labelled).',
});

// ---------------------------------------------------------------- features
let booted = false;
const features = createFeatures({ key: 'zoom', pad });
const STRAT_IDS = ['first', 'during', 'after', 'cross', 'cut'];
const STRAT_NAMES = STRAT_IDS.map((s) => STRATEGIES[s].name);
const HL_NAMES = ['Frame flash', 'Pulsing frame', 'Darken outside'];
const opts = { strategy: 'during', hl: 'Frame flash', zoomDur: 3.5, morphDur: 2.5, hlDur: 2.2, ease: 'log', miteLook: 'sem', bactLook: 'phase', demo: true, auto: true, scale: 0.75 };
features.add({ id: 'strategy', group: 'Rendering', label: 'Style transition strategy', choices: STRAT_NAMES, value: 'Look during',
  about: 'Look first: morph world N’s optics into N+1’s at N’s scale, then zoom. Look during: the optics morph with the zoom. Zoom first: zoom in N’s look, then morph. Crossfade: as during, but the two finished images cross-fade (no optics morph). Cut: the look switches at the hand-off.',
  onChange: (v) => { opts.strategy = STRAT_IDS[STRAT_NAMES.indexOf(v)] || 'during'; booted && retime(); } });
features.add({ id: 'hl', group: 'Rendering', label: 'Highlight: the next world’s frame', choices: HL_NAMES, value: 'Frame flash',
  about: 'The highlight is exactly the rectangle the next world’s screen will show (its field width × the screen’s aspect). Frame flash: the frame and its inside flash twice; pulsing frame; or darken everything outside it. The zoom is a pure scaling about one fixed point, so that rectangle grows to fill the screen exactly.',
  onChange: (v) => { opts.hl = HL_NAMES.includes(v) ? v : HL_NAMES[0]; } });
features.add({ id: 'zoomDur', group: 'Motion', label: 'Zoom duration', choices: ['2 s', '3.5 s', '6 s'], value: '3.5 s',
  about: 'How long the zoom takes, whatever the magnification ratio (1.7× to 150×).', onChange: (v) => { opts.zoomDur = parseFloat(v); booted && retime(); } });
features.add({ id: 'morphDur', group: 'Motion', label: 'Look morph duration (look first / zoom first)', choices: ['1 s', '2.5 s', '4 s'], value: '2.5 s',
  onChange: (v) => { opts.morphDur = parseFloat(v); booted && retime(); } });
features.add({ id: 'hlDur', group: 'Motion', label: 'Highlight duration', choices: ['1.2 s', '2.2 s', '3.5 s'], value: '2.2 s',
  onChange: (v) => { opts.hlDur = parseFloat(v); booted && retime(); } });
const EASE_NAMES = { log: 'Constant zoom speed (log)', smooth: 'Ease in and out', arrive: 'Fast start, slow arrival' };
features.add({ id: 'ease', group: 'Motion', label: 'Zoom easing', choices: Object.values(EASE_NAMES), value: EASE_NAMES.log,
  about: 'The field width is interpolated in log space, so “constant” means the same magnification per second all the way down.',
  onChange: (v) => { opts.ease = Object.keys(EASE_NAMES).find((k) => EASE_NAMES[k] === v) || 'log'; } });
features.add({ id: 'miteLook', group: 'Optics', label: 'Mite world look', choices: ['SEM', 'Stereo microscope'], value: 'SEM',
  about: 'The mite prototype’s SEM, or the reflected-light stereo microscope the spec names for the capitulum.', onChange: (v) => { opts.miteLook = v === 'SEM' ? 'sem' : 'stereo'; } });
features.add({ id: 'bactLook', group: 'Optics', label: 'Bacteria world look', choices: ['Phase contrast', 'Fluorescence'], value: 'Phase contrast',
  onChange: (v) => { opts.bactLook = v === 'Phase contrast' ? 'phase' : 'fluor'; } });
features.add({ id: 'scale', group: 'Rendering', label: 'Render scale', choices: ['50%', '75%', '100%'], value: '75%',
  about: 'Resolution of the specimen field (two worlds are drawn at once during a zoom).', onChange: (v) => { opts.scale = parseFloat(v) / 100; if (booted) resize(); } });
features.add({ id: 'specimen', group: 'World', label: 'One multi-scale specimen', fixed: true,
  about: 'Every world is a scale band of one specimen: capitulum leaves carry the cell lattice the DIC resolves, the film runs down a leaf into the pool, the biofilm’s cells are the texture the brightfield shows. Each layer fades in by pixel size, sub-pixel things keeping their amount, so N’s detail blurs out as N+1’s structures resolve, aligned.' });
features.add({ id: 'optics', group: 'Optics', label: 'One image-formation model (zoom-optics.js)', fixed: true,
  about: 'Macro, stereo, SEM, DIC, brightfield, phase, fluorescence, cryo-EM and the illustration are all one formula with different lamps and settings, so a morph moves the instrument (lamps dimming and brightening, the iris and condenser changing), not just pixels.' });
features.add({ id: 'logzoom', group: 'Optics', label: 'Log-scale zoom, honest scale bar (zoom-path.js)', fixed: true });
features.add({ id: 'demo', group: 'Controls', label: 'Demo when idle', on: true, about: 'The creature walks or swims to the destination by itself after a moment without input.', onChange: (v) => { opts.demo = v; } });
features.add({ id: 'auto', group: 'Controls', label: 'Continue into the next transition', on: true, about: 'After arriving, the next world’s destination is live, so the whole chain plays through.', onChange: (v) => { opts.auto = v; } });
const audio = createAudio(['springtail/amb-bog', 'mite/amb-moss', 'tardigrade/amb-film', 'paramecium/amb-pool', 'bacterium/amb-sediment', 'mite/step', 'tardigrade/step', 'tardigrade/revive', 'paramecium/swim', 'bacterium/run']);
audio.addToFeatures(features);

// ---------------------------------------------------------------- rendering
const zo = createZoomOptics(renderer);
const fieldMat = new THREE.RawShaderMaterial({
  glslVersion: THREE.GLSL3, vertexShader: FIELD_VS, fragmentShader: FIELD_FS, depthTest: false, depthWrite: false,
  uniforms: {
    uCenter: { value: new THREE.Vector2() }, uHalf: { value: new THREE.Vector2() }, uPx: { value: 1 }, uTime: { value: 0 }, uHBase: { value: 0 },
    uOff: { value: Array.from({ length: 6 }, () => new THREE.Vector2()) },
    uCr: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
    uCrB: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
    uLayers: { value: new THREE.Vector4() }, uBgAlb: { value: new THREE.Vector3() }, uMisc: { value: new THREE.Vector4(1, 0, 0, 0) },
  },
});
const fsTri = new THREE.BufferGeometry();
fsTri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
const fsMesh = new THREE.Mesh(fsTri, fieldMat);
fsMesh.frustumCulled = false;
const fsScene = new THREE.Scene();
fsScene.add(fsMesh);
const fsCam = new THREE.Camera();

const dbuf = new THREE.Vector2();
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.getDrawingBufferSize(dbuf);
  zo.resize(dbuf.x, dbuf.y, opts.scale);
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- state
const LOOK_OF = (id) => LOOKS[id === 'mite' ? opts.miteLook : id === 'bact' ? opts.bactLook : id];
const restLook = (w) => LOOK_OF(w === 0 ? 'macro' : TRANSITIONS[w].looks[TRANSITIONS[w].looks.length - 1]);
const smooth = (x) => { const t = Math.min(Math.max(x, 0), 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const cr = WORLDS.map(() => ({ pos: [0, 0], heading: 0, phase: 0, state: 1, moving: 0, pathI: 0 }));
const S = {
  k: 1, phase: 'approach', tau: 0, dir: 1, hold: false, tl: null, armed: true, idle: 0, time: 0,
  cam: [0, 0], w: WORLDS[0].field, camStart: [0, 0], cameFrom: 0, revive: 0, frozen: false, swell: 1,
  aHeld: 0, lastSeg: '', st: null, look: { a: LOOKS.macro, b: LOOKS.macro, t: 0, cross: false },
};
const world = () => (S.phase === 'approach' ? S.k - 1 : S.k);
const destG = (w) => toGlobal(w, WORLDS[w].path[WORLDS[w].path.length - 1]);

function headingTo(a, b) { return Math.atan2(b[1] - a[1], b[0] - a[0]); }

function resetCreatures(k) {
  // creatures of worlds already passed wait at their destinations; later ones at their spawn
  for (let j = 0; j < 6; j++) {
    const W = WORLDS[j], c = cr[j];
    const atDest = j < k - 1 && W.path.length;
    c.pos = atDest ? destG(j) : toGlobal(j, W.start);
    c.pathI = 0; c.moving = 0;
    const next = W.path.length ? toGlobal(j, W.path[0]) : [c.pos[0], c.pos[1] - 1];
    c.heading = atDest ? headingTo(toGlobal(j, W.path[Math.max(0, W.path.length - 2)]), destG(j)) : headingTo(c.pos, next);
    c.state = j === 2 ? (k >= 3 ? 1 : 0) : 1;
  }
  // after the hand-off the mite has wandered off along the leaf (see the hand-off in update)
  if (k >= 3) { const d1 = destG(1); cr[1].pos = [d1[0] + 0.8 * 320, d1[1] + 0.6 * 320]; cr[1].heading = Math.atan2(0.6, 0.8); }
  if (k >= 6) cr[5].heading = -Math.PI / 2;
}

function select(k, { atDest = false } = {}) {
  S.k = Math.min(Math.max(k, 1), 5);
  resetCreatures(S.k);
  S.phase = 'approach'; S.tau = 0; S.dir = 1; S.hold = false; S.armed = true; S.idle = 0; S.revive = 0; S.swell = 1;
  S.cameFrom = 0;
  const w = S.k - 1, c = cr[w];
  if (atDest) { c.pos = destG(w); c.pathI = WORLDS[w].path.length; }
  S.cam = followTarget();
  S.w = WORLDS[w].field;
  S.tl = buildTimeline();
}

// Mite → tardigrade has no change of scale (both ~0.35 mm), so it has no highlight and no
// zoom: a hand-off of creature and look at a constant field, while the tun rehydrates.
const HANDOFF = () => Math.max(4.5, opts.zoomDur + 1.5);
const isHandoff = (k = S.k) => WORLDS[k - 1].field === WORLDS[k].field;
function buildTimeline() {
  if (isHandoff()) {
    const strategy = opts.strategy === 'after' ? 'during' : opts.strategy;
    return makeTimeline({ H: 0, M: opts.morphDur, Z: HANDOFF(), strategy, handoff: 0.5 });
  }
  return makeTimeline({ H: opts.hlDur, M: opts.morphDur, Z: opts.zoomDur, strategy: opts.strategy, handoff: 0.55 });
}
/** Where the camera rests during the highlight: as little moved as possible, with the next frame on screen. */
function highlightCam() {
  const T = G[S.k], F0 = WORLDS[S.k - 1].field, F1 = WORLDS[S.k].field, A = dbuf.y / dbuf.x;
  const mx = Math.max(0, (F0 - F1) / 2 - 0.06 * F0), my = Math.max(0, ((F0 - F1) * A) / 2 - 0.06 * F0 * A);
  const cl = (v, m) => Math.min(Math.max(v, -m), m);
  return [T[0] + cl(S.camStart[0] - T[0], mx), T[1] + cl(S.camStart[1] - T[1], my)];
}
/** The next world's frame on screen, in drawing-buffer pixels [x0, y0, x1, y1] (y up). */
function nextRect() {
  const W = dbuf.x, H = dbuf.y, T = G[S.k], F1 = WORLDS[S.k].field;
  const cx = ((T[0] - S.cam[0]) / S.w) * W + W / 2, cy = ((T[1] - S.cam[1]) / S.w) * W + H / 2;
  const hw = ((F1 / S.w) * W) / 2, hh = (hw * H) / W;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
}
function retime() {
  if (!S.tl) return;
  const old = S.tl, st = timelineState(old, S.tau);
  S.tl = buildTimeline();
  if (S.phase !== 'trans') return;
  if (st.segment === 'highlight') S.tau = Math.min(S.tau, S.tl.H);
  else if (S.tau >= old.end) S.tau = S.tl.end;
  else S.tau = tauAtZoom(S.tl, st.zoom) + (st.zoom >= 1 ? Math.min(S.tau - old.zoomEnd, S.tl.post) : 0);
}

function followTarget() {
  const w = world();
  const c = cr[w].pos;
  if (S.phase === 'end' || w >= 5) return [c[0], c[1]];
  const T = G[w + 1];
  return [lerp(c[0], T[0], 0.3), lerp(c[1], T[1], 0.3)];
}

function beginTransition({ skip = false } = {}) {
  S.tl = buildTimeline();
  S.phase = 'trans'; S.tau = skip ? S.tl.H : 0; S.dir = 1; S.hold = false;
  S.camStart = [S.cam[0], S.cam[1]];
  const T = TRANSITIONS[S.k];
  if (!skip || isHandoff()) hud.toast(`${T.visible} (${T.spec})`, Math.max(2200, S.tl.H * 1000 + 600));
}

function arrive() {
  const k = S.k;
  S.cameFrom = k;
  if (k === 5 || !opts.auto) S.phase = 'end';
  else { S.k = k + 1; S.phase = 'approach'; S.armed = true; S.idle = 0; }
  hud.toast(TRANSITIONS[k].arrive, 2600);
}

function reverseOut() {
  // from the approach just after arriving: zoom back out of the transition we came through
  const k = S.phase === 'end' ? S.k : S.k - 1;
  if (k < 1) return;
  S.k = k; S.tl = buildTimeline(); S.phase = 'trans'; S.tau = S.tl.end; S.dir = -1; S.hold = false;
  S.camStart = followTargetFor(k - 1);
}
function followTargetFor(w) {
  const c = cr[w].pos, T = G[w + 1];
  return [lerp(c[0], T[0], 0.3), lerp(c[1], T[1], 0.3)];
}

// ---------------------------------------------------------------- sound
let actx = null;
function clickCtx() {
  if (actx) return actx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) actx = new AC();
  return actx;
}
for (const ev of ['keydown', 'pointerdown']) addEventListener(ev, () => { clickCtx(); actx?.resume?.(); }, { passive: true });
/** The objective clicking into place: a short noise tick and a metallic ping (synthesised). */
function click(strength = 1) {
  if (!actx || actx.state !== 'running' || !features.get('sound')) return;
  const t = actx.currentTime;
  const n = actx.createBuffer(1, Math.floor(actx.sampleRate * 0.03), actx.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (actx.sampleRate * 0.004));
  const src = actx.createBufferSource(); src.buffer = n;
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 2;
  const g = actx.createGain(); g.gain.value = 0.5 * strength;
  src.connect(bp).connect(g).connect(actx.destination); src.start(t);
  const o = actx.createOscillator(); o.frequency.value = 2350; o.type = 'triangle';
  const og = actx.createGain(); og.gain.setValueAtTime(0.12 * strength, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(og).connect(actx.destination); o.start(t); o.stop(t + 0.1);
}
const ambs = WORLDS.map((W, i) => audio.loop(W.amb, { volume: 0, rate: i === 5 ? 0.55 : 1 }));

// ---------------------------------------------------------------- HUD extras
const style = document.createElement('style');
style.textContent = `
.zt-menu { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(10,12,16,.66); backdrop-filter: blur(6px);
  border-radius: 10px; padding: 8px 10px; font: 12px/1.35 system-ui, sans-serif; color: #eef1f4; min-width: 330px; max-width: calc(100vw - 24px); z-index: 3; }
.zt-menu .row { display: flex; gap: 8px; padding: 2px 6px; border-radius: 6px; color: #a9b2bc; white-space: nowrap; }
.zt-menu .row.sel { background: rgba(255,214,110,.16); color: #fff2c8; outline: 1px solid rgba(255,214,110,.45); }
.zt-menu .row .n { width: 1.2em; font-weight: 700; } .zt-menu .row .lk { margin-left: auto; color: #9fd0ff; }
.zt-menu .bar { position: relative; height: 8px; border-radius: 4px; background: #2b3138; margin: 6px 2px 2px; overflow: hidden; }
.zt-menu .seg { position: absolute; top: 0; bottom: 0; } .zt-menu .cur { position: absolute; top: -2px; bottom: -2px; width: 3px; background: #fff; border-radius: 2px; }
.zt-menu .status { margin: 4px 2px 0; color: #eef1f4; white-space: normal; }
.zt-scale { position: fixed; left: 12px; bottom: 12px; background: rgba(10,12,16,.62); border-radius: 8px; padding: 8px 10px; color: #eef1f4;
  font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; pointer-events: none; z-index: 3; }
.zt-scale .bar { height: 5px; background: #fff; border: 1px solid #000; border-top: 0; margin-bottom: 4px; }
.zt-scale .big { font: 600 13px system-ui, sans-serif; }
@media (max-width: 700px) { .zt-menu { top: auto; bottom: 110px; min-width: 0; } }
`;
document.head.appendChild(style);
const menu = document.createElement('div');
menu.className = 'zt-menu';
document.body.appendChild(menu);
const scaleEl = document.createElement('div');
scaleEl.className = 'zt-scale';
scaleEl.innerHTML = '<div class="bar"></div><div class="big"></div><div class="mag"></div><div class="look"></div>';
document.body.appendChild(scaleEl);

function menuHtml() {
  const lookName = (id) => LOOK_OF(id).name;
  let rows = '';
  for (let k = 1; k <= 5; k++) {
    const T = TRANSITIONS[k];
    rows += `<div class="row${k === S.k ? ' sel' : ''}"><span class="n">${k}</span><span>${T.title}</span><span class="lk">${T.looks.map(lookName).join(' → ')}</span></div>`;
  }
  const tl = S.tl;
  let bar = '';
  if (tl) {
    const seg = (a, b, c) => `<div class="seg" style="left:${(a / tl.end) * 100}%;width:${((b - a) / tl.end) * 100}%;background:${c}"></div>`;
    bar = seg(0, tl.H, '#7a6a35') + (tl.pre ? seg(tl.H, tl.zoomStart, '#4f6f9a') : '') + seg(tl.zoomStart, tl.zoomEnd, '#3a8b2f') + (tl.post ? seg(tl.zoomEnd, tl.end, '#4f6f9a') : '');
    const x = S.phase === 'trans' ? S.tau / tl.end : 0;
    bar += `<div class="cur" style="left:calc(${x * 100}% - 1px)"></div>`;
  }
  return rows + `<div class="bar">${bar}</div><div class="status"></div>`;
}
let menuKey = '';

function statusText() {
  const T = TRANSITIONS[S.k], W = WORLDS[world()];
  const handoffName = { first: 'Look first, then the revival', during: 'Look while it revives', cross: 'Crossfade while it revives', cut: 'Cut mid-revival' };
  const strat = S.k === 2 && S.tl ? handoffName[S.tl.strategy] : STRATEGIES[opts.strategy].name;
  if (S.phase === 'end') return `${W.short}: ${W.creature}. End of the chain · B zoom back out · Y replay`;
  if (S.phase === 'approach') {
    const w = S.k - 1;
    if (w === 2 && cr[2].state < 1) return `${W.short}: the tun is rehydrating…`;
    const d = dist(cr[w].pos, destG(w));
    return `${W.short}: ${WORLDS[w].creature}. ${d < WORLDS[w].destR * 3 ? 'A: zoom' : `Go to the destination (${fmtLen(d, 2)} away)`} · ${strat}`;
  }
  const st = S.st;
  const seg = S.hold ? 'scrubbing (A resumes)' : S.dir < 0 ? (isHandoff() ? 'reversing' : 'zooming out') : st.segment === 'highlight' ? 'the next frame · A: zoom now' : st.segment === 'zoom' ? (isHandoff() ? 'hand-off: the tun revives' : 'zooming') : st.segment === 'look' ? 'changing the look' : 'arrived';
  return `${T.title} · ${strat} · ${seg} · zoom ${(st.zoom * 100).toFixed(0)}% · look ${(st.look * 100).toFixed(0)}%`;
}

// ---------------------------------------------------------------- update
function moveCreature(w, dt) {
  const W = WORLDS[w], c = cr[w];
  const m = ctl.move();
  let vx = 0, vy = 0;
  const boost = dash.active ? 2.2 : 1;
  if (m.m > 0.12) {
    S.idle = 0;
    vx = m.x * W.speed * boost; vy = -m.y * W.speed * boost;
  } else {
    S.idle += dt;
    if (opts.demo && S.idle > 1.2 && c.pathI < W.path.length) {
      const wp = toGlobal(w, W.path[c.pathI]);
      const d = dist(c.pos, wp);
      const last = c.pathI === W.path.length - 1;
      if (d < (last ? W.destR * 0.4 : W.speed * 0.25)) c.pathI++;
      else {
        const sp = W.speed * (last ? Math.min(1, 0.25 + d / (W.speed * 0.8)) : 1);
        vx = ((wp[0] - c.pos[0]) / d) * sp; vy = ((wp[1] - c.pos[1]) / d) * sp;
      }
    }
  }
  const v = Math.hypot(vx, vy);
  c.moving = v > 1e-6 ? 1 : 0;
  if (v > 1e-6) {
    c.pos[0] += vx * dt; c.pos[1] += vy * dt;
    let dh = Math.atan2(vy, vx) - c.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    c.heading += dh * Math.min(1, dt * (w === 4 ? 6 : 4));
    if (W.stride) {
      const before = Math.floor(c.phase * 2);
      c.phase += (v * dt) / W.stride;
      if (W.stepSound && Math.floor(c.phase * 2) !== before) audio.play(W.stepSound, { volume: 0.25, rate: 0.9 + Math.random() * 0.2 });
    }
  }
  if (!W.stride) c.phase += dt * (w === 3 ? 0.8 : w === 4 ? 1.2 + v / W.speed * 2 : 0.3);
}

function idleCreatures(dt, active, played) {
  // the ones not being played: Paramecium circles slowly, the spirillum jiggles, the rest rest
  const t = S.time;
  for (let j = 0; j < 6; j++) {
    if (j === active) continue;
    const c = cr[j];
    c.moving = 0;
    if (j === 3) { c.phase += dt * 0.8; }
    if (j === 4 || j === 5) c.phase += dt * 0.5;
    if (j === 3 && played < 3) {
      const o = toGlobal(3, WORLDS[3].start);
      c.pos = [o[0] + 22 * Math.cos(t * 0.5), o[1] + 22 * Math.sin(t * 0.5)];
      c.heading = t * 0.5 + Math.PI / 2;
    }
  }
}

function update(dt) {
  S.time += dt;
  dash.update(dt);
  const panel = features.update();
  hud.update(pad);
  if (Object.values(BTN).some((b) => pad.pressed(b))) { audio.unlock(); clickCtx(); actx?.resume?.(); }
  const input = !panel;

  if (input) {
    const step = -ctl.zoomStep() + (ctl.rb.pressed() ? 1 : 0) - (ctl.lb.pressed() ? 1 : 0);
    if (step) { select(S.k + Math.sign(step)); hud.toast(`${S.k}: ${TRANSITIONS[S.k].title}`, 1200); }
    const ls = ctl.lookStep();
    if (ls) {
      const i = (STRAT_IDS.indexOf(opts.strategy) + ls + STRAT_IDS.length) % STRAT_IDS.length;
      features.set('strategy', STRAT_NAMES[i]);
      hud.toast(`Strategy: ${STRAT_NAMES[i]}`, 1200);
    }
    if (ctl.attack.pressed()) {
      const i = (HL_NAMES.indexOf(opts.hl) + 1) % HL_NAMES.length;
      features.set('hl', HL_NAMES[i]);
      hud.toast(`Highlight: ${HL_NAMES[i]}`, 1200);
    }
    if (ctl.special.pressed()) {
      const k = S.phase === 'approach' && S.cameFrom === S.k - 1 && S.cameFrom > 0 ? S.cameFrom : S.k;
      select(k, { atDest: true });
      beginTransition();
    }
  }

  const w = world();
  const phase0 = S.phase;
  if (phase0 === 'approach' || phase0 === 'end') {
    // the tun rehydrating on arrival in the film
    if (S.revive > 0 && cr[2].state < 1) {
      cr[2].state = Math.min(1, cr[2].state + dt / 3.5);
      if (S.revive < 0.5 && cr[2].state > 0.15) { audio.play('tardigrade/revive', { volume: 0.7 }); S.revive = 1; }
    }
    const busy = w === 2 && cr[2].state < 0.9;
    if (input && ctl.dash.pressed()) {
      const near = w < 5 && S.phase === 'approach' && dist(cr[w].pos, destG(w)) < WORLDS[w].destR * 3;
      if (near) beginTransition();
      else if (dash.trigger()) pad.rumble(120, 0.3, 0.2);
    }
    if (!busy && input && S.phase === 'approach') moveCreature(w, dt);
    else if (!busy && input && S.phase === 'end') moveCreature(w, dt);
    idleCreatures(dt, w, w);
    if (S.phase === 'approach' && w < 5) {
      const d = dist(cr[w].pos, destG(w));
      if (S.armed && d < WORLDS[w].destR && !busy) beginTransition({ skip: ctl.dash.down() && S.aHeld > 0.35 });
      if (d > WORLDS[w].destR * 2.5) S.armed = true;
    }
    if (input && ctl.defend.pressed() && (S.cameFrom > 0 || S.phase === 'end')) reverseOut();
    if (input && Math.abs(ctl.analog()) > 0.05 && S.phase === 'approach' && w < 5) {
      cr[w].pos = destG(w); beginTransition({ skip: true }); S.hold = true;
    }
    S.aHeld = ctl.dash.down() ? S.aHeld + dt : 0;
    const f = followTarget();
    const k = 1 - Math.exp(-dt * 3);
    S.cam[0] += (f[0] - S.cam[0]) * k; S.cam[1] += (f[1] - S.cam[1]) * k;
    S.w = WORLDS[w].field;
  }

  if (phase0 === 'trans') {
    const tl = S.tl;
    const prev = S.tau;
    S.aHeld = ctl.dash.down() ? S.aHeld + dt : 0;
    if (input) {
      const a = ctl.analog();
      if (Math.abs(a) > 0.05) { S.hold = true; S.tau += a * dt * (tl.end / 3); }
      if (ctl.dash.pressed()) {
        if (S.hold) { S.hold = false; S.dir = 1; }
        else if (S.tau < tl.H) S.tau = tl.H;
      }
      if (S.aHeld > 0.3 && S.tau < tl.H && S.dir > 0) S.tau = tl.H;
      if (ctl.defend.pressed()) { S.dir = -S.dir; S.hold = false; }
    }
    if (!S.hold && !S.frozen) S.tau += dt * S.dir;
    S.tau = Math.min(Math.max(S.tau, 0), tl.end);
    S.st = timelineState(tl, S.tau);
    const F0 = WORLDS[S.k - 1].field, F1 = WORLDS[S.k].field;
    idleCreatures(dt, -1, S.k - 1);
    if (isHandoff()) {
      // constant field: the camera's attention moves from the mite to the reviving tun
      const p = S.st.zoom, e = smooth(p);
      const end = followTargetFor(2);
      S.cam = [lerp(S.camStart[0], end[0], e), lerp(S.camStart[1], end[1], e)];
      S.w = F0;
      const tun = cr[2];
      if (prev < tl.zoomStart + 0.1 * tl.Z && S.tau >= tl.zoomStart + 0.1 * tl.Z) audio.play('tardigrade/revive', { volume: 0.7 });
      tun.state = p;
      tun.moving = p > 0.85 && p < 1 ? 1 : 0;
      if (tun.moving) tun.phase += dt * 0.7;
      // the mite wanders off along the leaf, a neighbour now
      const m = cr[1], d1 = destG(1), away = [0.8, 0.6];
      m.pos = [d1[0] + away[0] * 320 * e, d1[1] + away[1] * 320 * e];
      m.heading = Math.atan2(away[1], away[0]);
      m.moving = p > 0.05 && p < 0.98 ? 1 : 0;
      if (m.moving) m.phase += (dt * 200) / WORLDS[1].stride;
    } else {
      // the highlight frames the next world; the zoom is a pure scaling about the fixed
      // point X, so that frame grows to fill the screen exactly (no drift, no jump)
      const T = G[S.k], camH = highlightCam();
      const c = smooth(S.st.hl / 0.6);
      const ch = [lerp(S.camStart[0], camH[0], c), lerp(S.camStart[1], camH[1], c)];
      S.w = zoomField(F0, F1, S.st.zoom, EASES[opts.ease]);
      const r = F1 / F0, k = S.w / F0;
      const X = [(T[0] - camH[0] * r) / (1 - r), (T[1] - camH[1] * r) / (1 - r)];
      S.cam = [X[0] + (ch[0] - X[0]) * k, X[1] + (ch[1] - X[1]) * k];
    }
    S.swell = S.k === 5 ? 1 + 0.1 * smooth(S.st.hl) : 1;
    if (!S.hold && !S.frozen) {
      if (S.dir > 0 && S.tau >= tl.end) arrive();
      else if (S.dir < 0 && S.tau <= 0) {
        S.phase = 'approach'; S.armed = false; S.idle = -2; S.cameFrom = 0;
        S.cam = [S.camStart[0], S.camStart[1]];
      }
    }
  }
  if (S.phase !== 'trans') S.st = null;
  else if (!S.st) S.st = timelineState(S.tl, S.tau);

  // ambience: crossfade by where we are on the scale
  const pos = S.phase === 'trans' ? S.k - 1 + S.st.zoom : world();
  ambs.forEach((a, i) => a.set({ volume: Math.sqrt(Math.max(0, 1 - Math.abs(pos - i))) * 0.8 }));
}

// ---------------------------------------------------------------- look of the moment
function currentLook() {
  if (S.phase !== 'trans') { const L = restLook(world()); return { a: L, b: L, t: 0, cross: false, label: L.name }; }
  const ids = TRANSITIONS[S.k].looks.map(LOOK_OF);
  const n = ids.length - 1;
  const x = S.st.look * n;
  const i = Math.min(n - 1, Math.floor(x));
  const t = x - i;
  const label = t <= 0.001 ? ids[i].name : t >= 0.999 ? ids[i + 1].name : `${ids[i].name} → ${ids[i + 1].name} ${(t * 100).toFixed(0)}%`;
  return { a: ids[i], b: ids[i + 1], t, cross: S.st.cross, label };
}

// ---------------------------------------------------------------- render
let fps = 60;
function render() {
  const B = world();
  const u = fieldMat.uniforms;
  const W = dbuf.x, H = dbuf.y;
  const fw = zo.field.width;
  const w = S.w, h = (w * H) / W;
  const base = [G[B][0], G[B][1]];
  u.uCenter.value.set(S.cam[0] - base[0], S.cam[1] - base[1]);
  u.uHalf.value.set(w / 2, h / 2);
  u.uPx.value = w / fw;
  u.uTime.value = S.time;
  for (let j = 0; j < 6; j++) u.uOff.value[j].set(G[j][0] - base[0], G[j][1] - base[1]);
  const leafTop = groundAt(G[4]);
  for (let j = 0; j < 6; j++) {
    const c = cr[j];
    u.uCr.value[j].set(c.pos[0] - G[j][0], c.pos[1] - G[j][1], c.heading, c.phase);
    const r = WORLDS[j].radius;
    const vis = r / w > 0.0012 && Math.hypot(c.pos[0] - S.cam[0], c.pos[1] - S.cam[1]) < w * 0.75 + r;
    const baseH = j === 0 ? 0 : j === 1 ? groundAt(c.pos) : j === 2 ? groundAt(c.pos) + 220 : j === 3 ? groundAt(c.pos) + 60 : leafTop;
    u.uCrB.value[j].set(c.state, vis ? 1 : 0, baseH, c.moving);
  }
  u.uLayers.value.set(w > 15 ? 1 : 0, w < 7000 ? 1 : 0, w < 2600 ? 1 : 0, w < 400 ? 1 : 0);
  u.uBgAlb.value.set(0.80, 0.88, 0.95);
  u.uMisc.value.set(S.swell, S.time, leafTop, 0);
  u.uHBase.value = w < 400 ? leafTop : groundAt(S.cam);
  renderer.setRenderTarget(zo.field);
  renderer.render(fsScene, fsCam);

  const L = currentLook();
  S.look = L;
  zo.compose({ a: L.a, b: L.b, t: L.t, cross: L.cross, umPerPx: w / fw, time: S.frozen ? 1 : S.time });

  // the highlight: the exact frame of the next world's screen
  const fx = { time: S.time };
  if (S.phase === 'trans' && !isHandoff()) {
    const st = S.st;
    fx.rect = nextRect();
    const hlIn = smooth(st.hl / 0.2);
    const fade = 1 - smooth((st.zoom - 0.55) / 0.45);
    if (opts.hl === 'Frame flash') {
      fx.frame = hlIn * fade;
      fx.flash = st.hl < 1 ? Math.pow(Math.abs(Math.sin(st.hl * 2 * Math.PI)), 6) : 0;
    } else if (opts.hl === 'Pulsing frame') {
      fx.frame = (0.55 + 0.45 * Math.sin(S.time * 6)) * hlIn * fade + 0.3 * hlIn * fade;
    } else {
      fx.dark = 0.62 * hlIn;
      fx.frame = 0.6 * hlIn * fade;
    }
  }
  zo.post(fx, null);
}

const fmtMag = (m) => (m >= 99.5 ? Math.round(m).toLocaleString('en-US') : m.toPrecision(2));
function updateHud() {
  const W = dbuf.x;
  const cssW = innerWidth;
  const sb = scaleBar(S.w, cssW, 0.16);
  scaleEl.querySelector('.bar').style.width = `${sb.px.toFixed(1)}px`;
  scaleEl.querySelector('.big').textContent = `${sb.label}`;
  const wN = world();
  scaleEl.querySelector('.mag').textContent = `field ${fmtLen(S.w)} · ≈${fmtMag(eyepieceMag(S.w))}× (10× eyepiece equiv.)`;
  const inst = S.phase === 'trans' ? `${WORLDS[S.k - 1].instrument} → ${WORLDS[S.k].instrument}` : WORLDS[wN].instrument;
  scaleEl.querySelector('.look').textContent = `${S.look.label} · ${inst}`;
  const key = `${S.k}|${S.phase}|${opts.strategy}|${opts.miteLook}|${opts.bactLook}|${S.tl?.end}|${S.phase === 'trans' ? Math.round(S.tau * 20) : 0}`;
  if (key !== menuKey) { menu.innerHTML = menuHtml(); menuKey = key; }
  menu.querySelector('.status').textContent = statusText();
  hud.stats(`${WORLDS[wN].short} · ${S.phase}${S.phase === 'trans' ? ` τ ${S.tau.toFixed(2)}/${S.tl.end.toFixed(1)}` : ''}
field ${fmtLen(S.w)} · ${(S.w / zo.field.width).toPrecision(3)} µm/px · ${fps.toFixed(0)} fps`);
  void W;
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps = fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
  pad.poll();
  if (!S.frozen) update(dt);
  else { features.update(); hud.update(pad); }
  render();
  updateHud();
  requestAnimationFrame(frame);
}

select(1);
booted = true;

// Test hooks (contact sheets, the smoke check).
window.__micro = {
  S, cr, opts, features,
  setTransition(k) { select(k); },
  /** Jump into transition k's timeline (creature at its destination), paused. */
  start(k = S.k) { select(k, { atDest: true }); beginTransition(); S.hold = true; },
  setZoom(p) { if (S.phase !== 'trans') this.start(S.k); S.tau = tauAtZoom(S.tl, p); S.hold = true; },
  setProgress(s) { if (S.phase !== 'trans') this.start(S.k); S.tau = s * S.tl.end; S.hold = true; },
  setStrategy(id) { features.set('strategy', STRATEGIES[id].name); },
  /** The next world's frame on screen (drawing-buffer px, y up) and the screen size. */
  rect() { return { rect: S.phase === 'trans' ? nextRect() : null, W: dbuf.x, H: dbuf.y, cam: S.cam, w: S.w }; },
  setHighlight(name) { features.set('hl', name); },
  freeze(on = true) { S.frozen = on; },
  hideHud(on = true) { document.querySelector('.hud').classList.toggle('hidden', on); },
  /** Render now and return the canvas as a data URL plus the scale readout (for contact sheets). */
  snap() {
    render(); updateHud();
    return { img: canvas.toDataURL('image/jpeg', 0.88), scale: [...scaleEl.children].map((e) => e.textContent).filter(Boolean).join(' | '), status: statusText() };
  },
  state() { return { k: S.k, phase: S.phase, tau: S.tau, st: S.st, field: S.w, look: S.look.label, world: world() }; },
};
requestAnimationFrame((n) => { last = n; frame(n); });

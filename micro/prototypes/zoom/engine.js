// The zoom engine: one multi-scale specimen (specimen.js) drawn through one
// image-formation model (shared/techniques/zoom-optics.js), the seven worlds'
// creatures, and the transitions between them, forward and reverse. No page
// chrome: the prototype page (main.js) and the game's player (player.js) both
// drive this.
//
//   const eng = createEngine({ canvas, size: () => [w, h], audio, opts });
//   eng.playForward(k) / eng.playReverse(k) / eng.select(k)   (k = 1..6: world k-1 → k)
//   each frame: eng.update(dt, input | null); eng.render();
//   eng.on('toast' | 'arrive' | 'reversed', fn)
import * as THREE from '../shared/vendor/three.module.min.js';
import { createDash } from '../shared/controls.js';
import { createZoomOptics, LOOKS } from '../shared/techniques/zoom-optics.js';
import { zoomField, EASES, STRATEGIES, makeTimeline, timelineState, tauAtZoom, scaleBar, fmtLen, eyepieceMag } from '../shared/techniques/zoom-path.js';
import { FIELD_VS, FIELD_FS } from './specimen.js';
import { WORLDS, TRANSITIONS, G, toGlobal, groundAt } from './chain.js';

export const NW = WORLDS.length;      // 7 worlds
export const NT = TRANSITIONS.length - 1; // 6 transitions
export const HL_NAMES = ['Frame flash', 'Pulsing frame', 'Darken outside'];
export const STRAT_IDS = ['auto', 'first', 'during', 'after', 'cross', 'cut'];
export const STRAT_NAMES = { auto: 'Recommended (per transition)', ...Object.fromEntries(Object.entries(STRATEGIES).map(([k, v]) => [k, v.name])) };
export const DEFAULT_OPTS = { strategy: 'auto', hl: 'Frame flash', zoomDur: 3.5, morphDur: 2.5, hlDur: 2.2, ease: 'log', miteLook: 'sem', bactLook: 'phase', demo: true, auto: true, scale: 0.75 };

const smooth = (x) => { const t = Math.min(Math.max(x, 0), 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const headingTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const fmtMag = (m) => (m >= 99.5 ? Math.round(m).toLocaleString('en-US') : m.toPrecision(2));

export function createEngine({ canvas, size = () => [innerWidth, innerHeight], audio = null, opts = { ...DEFAULT_OPTS } }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.autoClear = false;
  const dash = createDash({ duration: 0.3, cooldown: 1.0 });
  const listeners = {};
  const emit = (type, d) => { for (const fn of listeners[type] || []) fn(d); };

  // ------------------------------------------------------------ rendering
  const zo = createZoomOptics(renderer);
  const fieldMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: FIELD_VS, fragmentShader: FIELD_FS, depthTest: false, depthWrite: false,
    uniforms: {
      uCenter: { value: new THREE.Vector2() }, uHalf: { value: new THREE.Vector2() }, uPx: { value: 1 }, uTime: { value: 0 }, uHBase: { value: 0 },
      uOff: { value: Array.from({ length: NW }, () => new THREE.Vector2()) },
      uCr: { value: Array.from({ length: NW }, () => new THREE.Vector4()) },
      uCrB: { value: Array.from({ length: NW }, () => new THREE.Vector4()) },
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
  // a software rasteriser (headless checks) draws the specimen at 35 % resolution at most
  const SOFTWARE = (() => {
    try {
      const g = renderer.getContext(), ext = g.getExtension('WEBGL_debug_renderer_info');
      return /swiftshader|llvmpipe|software/i.test(String(g.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : g.RENDERER)));
    } catch { return false; }
  })();
  function resize() {
    const [w, h] = size();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    renderer.getDrawingBufferSize(dbuf);
    zo.resize(dbuf.x, dbuf.y, SOFTWARE ? Math.min(opts.scale, 0.35) : opts.scale);
  }
  resize();

  // ------------------------------------------------------------ state
  const LOOK_OF = (id) => LOOKS[id === 'mite' ? opts.miteLook : id === 'bact' ? opts.bactLook : id];
  const restLook = (w) => LOOK_OF(w === 0 ? 'macro' : TRANSITIONS[w].looks[TRANSITIONS[w].looks.length - 1]);
  const cr = WORLDS.map(() => ({ pos: [0, 0], heading: 0, phase: 0, state: 1, moving: 0, pathI: 0 }));
  const S = {
    k: 1, phase: 'approach', tau: 0, dir: 1, hold: false, tl: null, armed: true, idle: 0, time: 0,
    cam: [0, 0], w: WORLDS[0].field, camStart: [0, 0], cameFrom: 0, swell: 1, aHeld: 0, st: null, stop: false,
    look: { a: LOOKS.macro, b: LOOKS.macro, t: 0, cross: false, label: LOOKS.macro.name },
  };
  /** The world on screen: during a transition the finer one (its frame is the base frame). */
  const world = () => (S.phase === 'approach' ? S.k - 1 : S.k);
  const destG = (w) => toGlobal(w, WORLDS[w].path[WORLDS[w].path.length - 1]);
  const isHandoff = (k = S.k) => !!TRANSITIONS[k].handoff;
  const strategyFor = (k = S.k) => {
    const s = opts.strategy === 'auto' || !STRATEGIES[opts.strategy] ? TRANSITIONS[k].strategy : opts.strategy;
    return isHandoff(k) && s === 'after' ? 'during' : s; // nothing to zoom first in a hand-off
  };

  function resetCreatures(k) {
    // creatures of worlds already passed wait at their destinations (walked off, after a
    // hand-off); later ones at their spawn
    for (let j = 0; j < NW; j++) {
      const W = WORLDS[j], c = cr[j];
      const atDest = j < k - 1 && W.path.length;
      c.pos = atDest ? destG(j) : toGlobal(j, W.start);
      c.pathI = 0; c.moving = 0;
      const next = W.path.length ? toGlobal(j, W.path[0]) : [c.pos[0], c.pos[1] - 1];
      c.heading = atDest ? headingTo(toGlobal(j, W.path[Math.max(0, W.path.length - 2)]), destG(j)) : headingTo(c.pos, next);
      const T = TRANSITIONS[j + 1];
      if (atDest && T?.handoff) { c.pos = [c.pos[0] + T.wander[0], c.pos[1] + T.wander[1]]; c.heading = Math.atan2(T.wander[1], T.wander[0]); }
      c.state = j === 2 ? (k >= 3 ? 1 : 0) : 1;
    }
    if (k > NT) cr[NW - 1].heading = -Math.PI / 2;
  }

  function buildTimeline(k = S.k) {
    const strategy = strategyFor(k);
    if (isHandoff(k)) return makeTimeline({ H: 0, M: opts.morphDur, Z: Math.max(4.5, opts.zoomDur + 1.5), strategy, handoff: 0.5 });
    return makeTimeline({ H: opts.hlDur, M: opts.morphDur, Z: opts.zoomDur, strategy, handoff: 0.55 });
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

  const followTargetFor = (w) => {
    const c = cr[w].pos;
    if (w >= NW - 1) return [c[0], c[1]];
    const T = G[w + 1];
    return [lerp(c[0], T[0], 0.3), lerp(c[1], T[1], 0.3)];
  };
  const followTarget = () => (S.phase === 'end' ? [...cr[world()].pos] : followTargetFor(world()));

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

  /** The approach of transition k: play in world k-1 toward its destination. */
  function select(k, { atDest = false } = {}) {
    S.k = Math.min(Math.max(k, 1), NT);
    resetCreatures(S.k);
    S.phase = 'approach'; S.tau = 0; S.dir = 1; S.hold = false; S.armed = true; S.idle = 0; S.swell = 1; S.cameFrom = 0;
    const w = S.k - 1, c = cr[w];
    if (atDest) { c.pos = destG(w); c.pathI = WORLDS[w].path.length; }
    S.cam = followTarget();
    S.w = WORLDS[w].field;
    S.tl = buildTimeline();
  }

  function beginTransition({ skip = false } = {}) {
    S.tl = buildTimeline();
    S.phase = 'trans'; S.tau = skip ? S.tl.H : 0; S.dir = 1; S.hold = false;
    S.camStart = [S.cam[0], S.cam[1]];
    const T = TRANSITIONS[S.k];
    if (!skip || isHandoff()) emit('toast', { text: `${T.visible} (${T.spec})`, ms: Math.max(2200, S.tl.H * 1000 + 600) });
    emit('start', { k: S.k, dir: 'in' });
  }

  /** Forward transition k from its start (the creature at its destination). */
  function playForward(k) { select(k, { atDest: true }); beginTransition(); }

  /** Reverse transition k: from world k back out (or back across a hand-off) to world k-1. */
  function playReverse(k) {
    select(k, { atDest: true });
    // the arrival pose of transition k: world k's creature at its spawn, the old protagonist at its destination
    const T = TRANSITIONS[k];
    S.camStart = followTargetFor(k - 1);
    if (k === 2) cr[2].state = 1;
    S.tl = buildTimeline();
    S.phase = 'trans'; S.tau = S.tl.end; S.dir = -1; S.hold = false;
    S.st = timelineState(S.tl, S.tau);
    applyTransition(0);
    emit('toast', { text: T.back, ms: 2400 });
    emit('start', { k, dir: 'out' });
  }

  function arrive() {
    const k = S.k;
    S.cameFrom = k;
    emit('toast', { text: TRANSITIONS[k].arrive, ms: 2600 });
    if (k === NT || !opts.auto) S.phase = 'end';
    else { S.k = k + 1; S.phase = 'approach'; S.armed = true; S.idle = 0; S.tl = buildTimeline(); }
    emit('arrive', { k, world: WORLDS[k].id });
  }

  function reverseOut() {
    // from just after arriving: back out of the transition we came through
    const k = S.phase === 'end' ? S.k : S.k - 1;
    if (k < 1) return;
    S.k = k; S.tl = buildTimeline(); S.phase = 'trans'; S.tau = S.tl.end; S.dir = -1; S.hold = false;
    S.camStart = followTargetFor(k - 1);
    emit('start', { k, dir: 'out' });
  }

  // ------------------------------------------------------------ sound
  const ambs = audio ? WORLDS.map((W, i) => audio.loop(W.amb, { volume: 0, rate: i === NW - 1 ? 0.55 : 1 })) : [];
  const play = (id, o) => audio?.play(id, o);

  // ------------------------------------------------------------ update
  function moveCreature(w, dt, inp) {
    const W = WORLDS[w], c = cr[w];
    const m = inp?.move || { x: 0, y: 0, m: 0 };
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
      c.heading += dh * Math.min(1, dt * (w === 5 ? 6 : w === 3 ? 1.2 : 4));
      if (W.stride) {
        const before = Math.floor(c.phase * 2);
        c.phase += (v * dt) / W.stride;
        if (W.stepSound && Math.floor(c.phase * 2) !== before) play(W.stepSound, { volume: 0.25, rate: 0.9 + Math.random() * 0.2 });
      }
    }
    if (!W.stride) c.phase += dt * (w === 3 ? 0.5 + v / W.speed : w === 4 ? 0.8 : w === 5 ? 1.2 + (v / W.speed) * 2 : 0.3);
  }

  function idleCreatures(dt, active, played) {
    // the ones not being played: Paramecium circles slowly, the amoeba's pseudopods flow, the rest rest
    const t = S.time;
    for (let j = 0; j < NW; j++) {
      if (j === active) continue;
      const c = cr[j];
      if (j !== 2 && j !== 1) c.moving = 0;
      if (j === 3) c.phase += dt * 0.4;
      if (j === 4) c.phase += dt * 0.8;
      if (j === 5 || j === 6) c.phase += dt * 0.5;
      if (j === 4 && played < 4) {
        const o = toGlobal(4, WORLDS[4].start);
        c.pos = [o[0] + 22 * Math.cos(t * 0.5), o[1] + 22 * Math.sin(t * 0.5)];
        c.heading = t * 0.5 + Math.PI / 2;
      }
    }
  }

  /** Camera, field and creatures for the current point of the transition timeline. */
  function applyTransition(dt) {
    const tl = S.tl, F0 = WORLDS[S.k - 1].field, F1 = WORLDS[S.k].field;
    S.st = timelineState(tl, S.tau);
    if (isHandoff()) {
      // constant field: the camera's attention passes from the old creature to the new one
      const p = S.st.zoom, e = smooth(p), T = TRANSITIONS[S.k];
      const end = followTargetFor(S.k);
      S.cam = [lerp(S.camStart[0], end[0], e), lerp(S.camStart[1], end[1], e)];
      S.w = F0;
      const old = cr[S.k - 1], d = destG(S.k - 1);
      old.pos = [d[0] + T.wander[0] * e, d[1] + T.wander[1] * e];
      old.heading = Math.atan2(T.wander[1], T.wander[0]);
      old.moving = p > 0.05 && p < 0.98 ? 1 : 0;
      if (old.moving) old.phase += (dt * 200) / (WORLDS[S.k - 1].stride || 100);
      const nu = cr[S.k];
      if (S.k === 2) {
        nu.state = p;
        nu.moving = p > 0.85 && p < 1 ? 1 : 0;
        if (nu.moving) nu.phase += dt * 0.7;
      } else nu.phase += dt * 0.6;
    } else {
      // the highlight frames the next world; the zoom is a pure scaling about the fixed
      // point X, so that frame grows to fill the screen exactly (no drift, no jump)
      const T = G[S.k], camH = highlightCam();
      const c = smooth(S.st.hl / 0.6);
      const ch = [lerp(S.camStart[0], camH[0], c), lerp(S.camStart[1], camH[1], c)];
      S.w = zoomField(F0, F1, S.st.zoom, EASES[opts.ease] || EASES.log);
      const r = F1 / F0, k = S.w / F0;
      const X = [(T[0] - camH[0] * r) / (1 - r), (T[1] - camH[1] * r) / (1 - r)];
      S.cam = [X[0] + (ch[0] - X[0]) * k, X[1] + (ch[1] - X[1]) * k];
    }
    S.swell = S.k === NT ? 1 + 0.1 * smooth(S.st.hl) : 1;
  }

  /**
   * One step. inp (or null for no player): { move: {x, y, m}, dashPressed, dashDown,
   * analog (RT − LT), reversePressed }.
   */
  function update(dt, inp = null) {
    S.time += dt;
    dash.update(dt);
    const w = world();
    const phase0 = S.phase;
    if (phase0 === 'approach' || phase0 === 'end') {
      const busy = w === 2 && cr[2].state < 0.9;
      if (inp?.dashPressed) {
        const near = w < NW - 1 && S.phase === 'approach' && dist(cr[w].pos, destG(w)) < WORLDS[w].destR * 3;
        if (near) beginTransition();
        else if (dash.trigger()) emit('dash');
      }
      if (!busy && S.phase !== 'trans') moveCreature(w, dt, inp);
      idleCreatures(dt, w, w);
      if (S.phase === 'approach' && w < NW - 1) {
        const d = dist(cr[w].pos, destG(w));
        if (S.armed && d < WORLDS[w].destR && !busy) beginTransition({ skip: !!inp?.dashDown && S.aHeld > 0.35 });
        if (d > WORLDS[w].destR * 2.5) S.armed = true;
      }
      if (inp?.reversePressed && (S.cameFrom > 0 || S.phase === 'end')) reverseOut();
      if (inp && Math.abs(inp.analog || 0) > 0.05 && S.phase === 'approach' && w < NW - 1) {
        cr[w].pos = destG(w); beginTransition({ skip: true }); S.hold = true;
      }
      S.aHeld = inp?.dashDown ? S.aHeld + dt : 0;
      if (S.phase !== 'trans') {
        const f = followTarget();
        const k = 1 - Math.exp(-dt * 3);
        S.cam[0] += (f[0] - S.cam[0]) * k; S.cam[1] += (f[1] - S.cam[1]) * k;
        S.w = WORLDS[world()].field;
      }
    }

    if (phase0 === 'trans') {
      const tl = S.tl;
      const prev = S.tau;
      S.aHeld = inp?.dashDown ? S.aHeld + dt : 0;
      if (inp) {
        const a = inp.analog || 0;
        if (Math.abs(a) > 0.05) { S.hold = true; S.tau += a * dt * (tl.end / 3); }
        if (inp.dashPressed) {
          if (S.hold) { S.hold = false; S.dir = 1; }
          else if (S.tau < tl.H) S.tau = tl.H;
        }
        if (S.aHeld > 0.3 && S.tau < tl.H && S.dir > 0) S.tau = tl.H;
        if (inp.reversePressed) { S.dir = -S.dir; S.hold = false; }
      }
      if (!S.hold && !S.stop) S.tau += dt * S.dir;
      S.tau = Math.min(Math.max(S.tau, 0), tl.end);
      if (isHandoff() && S.k === 2) {
        const at = tl.zoomStart + 0.1 * tl.Z;
        if (prev < at && S.tau >= at) play('tardigrade/revive', { volume: 0.7 });
      }
      idleCreatures(dt, -1, S.k - 1);
      applyTransition(dt);
      if (!S.hold && !S.stop) {
        if (S.dir > 0 && S.tau >= tl.end) arrive();
        else if (S.dir < 0 && S.tau <= 0) {
          const k = S.k;
          S.phase = 'approach'; S.armed = false; S.idle = -2; S.cameFrom = 0;
          S.cam = [S.camStart[0], S.camStart[1]];
          S.w = WORLDS[k - 1].field;
          emit('reversed', { k, world: WORLDS[k - 1].id });
        }
      }
    }
    if (S.phase !== 'trans') S.st = null;
    else if (!S.st) S.st = timelineState(S.tl, S.tau);

    // ambience: crossfade by where we are on the scale
    const pos = S.phase === 'trans' ? S.k - 1 + S.st.zoom : world();
    ambs.forEach((a, i) => a.set({ volume: Math.sqrt(Math.max(0, 1 - Math.abs(pos - i))) * 0.8 }));
  }

  // ------------------------------------------------------------ look of the moment
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

  // ------------------------------------------------------------ render
  function renderField() {
    const B = world();
    const u = fieldMat.uniforms;
    const W = dbuf.x, H = dbuf.y;
    const fw = zo.field.width;
    const w = S.w, h = (w * H) / W;
    const base = G[B];
    u.uCenter.value.set(S.cam[0] - base[0], S.cam[1] - base[1]);
    u.uHalf.value.set(w / 2, h / 2);
    u.uPx.value = w / fw;
    u.uTime.value = S.time;
    for (let j = 0; j < NW; j++) u.uOff.value[j].set(G[j][0] - base[0], G[j][1] - base[1]);
    const leafTop = groundAt(G[5]);
    for (let j = 0; j < NW; j++) {
      const c = cr[j];
      u.uCr.value[j].set(c.pos[0] - G[j][0], c.pos[1] - G[j][1], c.heading, c.phase);
      const r = WORLDS[j].radius;
      const vis = r / w > 0.0012 && Math.hypot(c.pos[0] - S.cam[0], c.pos[1] - S.cam[1]) < w * 0.75 + r;
      const baseH = j === 0 || j === 3 ? 0 : j === 1 ? groundAt(c.pos) : j === 2 ? groundAt(c.pos) + 220 : j === 4 ? groundAt(c.pos) + 60 : leafTop;
      u.uCrB.value[j].set(c.state, vis ? 1 : 0, baseH, c.moving);
    }
    u.uLayers.value.set(w > 15 ? 1 : 0, w < 7000 ? 1 : 0, w < 2600 ? 1 : 0, w < 400 ? 1 : 0);
    u.uBgAlb.value.set(0.80, 0.88, 0.95);
    u.uMisc.value.set(S.swell, S.time, leafTop, 0);
    u.uHBase.value = w < 400 ? leafTop : groundAt(S.cam);
    renderer.setRenderTarget(zo.field);
    renderer.render(fsScene, fsCam);
  }

  function highlightFx() {
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
    return fx;
  }

  function render() {
    renderField();
    const L = currentLook();
    S.look = L;
    zo.compose({ a: L.a, b: L.b, t: L.t, cross: L.cross, umPerPx: S.w / zo.field.width, time: S.time });
    zo.post(highlightFx(), null);
  }

  /** What the scale readout should say. cssWidth: the canvas's CSS width. */
  function readout(cssWidth) {
    const sb = scaleBar(S.w, cssWidth, 0.16);
    const wN = world();
    return {
      bar: sb, field: fmtLen(S.w), mag: `≈${fmtMag(eyepieceMag(S.w))}×`,
      look: S.look.label,
      instrument: S.phase === 'trans' ? `${WORLDS[S.k - 1].instrument} → ${WORLDS[S.k].instrument}` : WORLDS[wN].instrument,
    };
  }

  return {
    S, cr, opts, renderer, zo, dash,
    get world() { return world(); },
    resize, select, playForward, playReverse, beginTransition, reverseOut, retime, update, render, readout,
    currentLook, nextRect, isHandoff, strategyFor, destG, LOOK_OF,
    on(type, fn) { (listeners[type] ||= []).push(fn); return () => { listeners[type] = listeners[type].filter((f) => f !== fn); }; },
    /** Seek the current transition (τ); pauses it. */
    seek(tau) { S.tau = Math.min(Math.max(tau, 0), S.tl.end); S.hold = true; applyTransition(0); },
    seekZoom(p) { this.seek(tauAtZoom(S.tl, p)); },
    profile() {
      const gl = renderer.getContext(), px = new Uint8Array(4);
      const sync = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now(); };
      const out = {}; let t = sync();
      renderField(); renderer.setRenderTarget(null); out.field = -t + (t = sync());
      const L = currentLook(); zo.compose({ a: L.a, b: L.b, t: L.t, cross: L.cross, umPerPx: S.w / zo.field.width, time: S.time }); renderer.setRenderTarget(null); out.compose = -t + (t = sync());
      zo.post({}, null); out.post = -t + (t = sync());
      out.size = [zo.field.width, zo.field.height, dbuf.x, dbuf.y];
      return out;
    },
    get drawingSize() { return [dbuf.x, dbuf.y]; },
    dispose() {
      for (const a of ambs) a.stop();
      fieldMat.dispose(); fsTri.dispose();
      renderer.dispose();
    },
  };
}

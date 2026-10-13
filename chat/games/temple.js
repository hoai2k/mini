// Temple Dash: an endless run down a raised temple walkway over the jungle,
// seen from behind the runner. Swipe left or right to change lanes, up to
// jump roots, fire and gaps, down to slide under arches; at a corner swipe
// the way it turns or run off the edge. One stumble brings the monkeys close
// behind; a second soon after, or any crash or fall, ends the run.
//
// Everyone in a session runs the same temple: the owner puts { seed, at } in
// shared state (temple/path.js builds the temple from the seed; `at` is when
// the first run starts, with a countdown). Runs are independent: each player
// publishes their own run (distance, lane, height, action) about ten times a
// second, and everyone else draws them as see-through runners in their
// colour, with their live face, where they are on the temple. A crash shows a
// puff and "Bo fell!" for everyone ('fell' message, and the run's state). A
// player who falls taps to run again from the start while the others carry
// on; anyone who joins mid-game just starts running. The best distance this
// session wins; the best ever is kept on this device.
//
// The temple is drawn with WebGL (temple/gl.js, geometry from temple/geo.js);
// obstacles, coins, runners, monkeys and the HUD are drawn on a 2D canvas over
// it with the same camera.

import * as P from './temple/path.js';
import { buildGeometry } from './temple/geo.js';
import { createScene, averageColor } from './temple/gl.js';
import * as art from './temple/art.js';

const STEP = 1 / 60;
const SEND_MS = 100;
const FIRST_DELAY = 3200;       // the opening countdown
const JOIN_DELAY = 1600;        // a "Ready... go" for anyone joining later
const CAM_D = 3.7, CAM_H = 2.3, CAM_H_TALL = 2.55, PITCH = 0.22;
const RUN_W = (art.FRAME_W / art.FRAME_H) * art.RUNNER_H;
const STRIDE = 2.7;             // metres per four running frames
const ROOT_W = P.HW * 2 + 0.6, ROOT_H = ROOT_W * 0.25;
// The slide-under beam spans the whole walkway and more, drawn 2:1 so its
// underside (62% down the picture) is about 1.25 m up.
const ARCH_W = P.HW * 2 + 1.2, ARCH_H = ARCH_W * 0.5;
// The delivered beam's underside is 53% down its picture, so it is drawn a
// little flatter to keep that underside about 1.25 m up too.
const ARCH_H_ART = 1.25 / (1 - 0.53);
const FIRE_W = 1.55, FIRE_H = 1.6, COIN_W = 0.48;
const CAUSE_TEXT = { edge: 'Off the edge!', gap: 'Fell in!', crash: 'Crashed!', caught: 'Caught by monkeys!' };
const FONT = 'ui-rounded, system-ui, sans-serif';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const okColor = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#ff5fa2');
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const fmtInt = n => Math.round(n).toLocaleString('en-US');

export default {
  id: 'temple',
  name: 'Temple Dash',
  emoji: '🏃',
  blurb: 'Run the jungle temple: swipe to dodge, jump, slide and turn. Friends run it with you.',
  minPlayers: 1,
  maxPlayers: 8,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const myId = api.me.id;

    // --- DOM ---------------------------------------------------------------
    const style = document.createElement('style');
    style.textContent = `
      .td-wrap { position: absolute; inset: 0; overflow: hidden; background: #f3b36b; touch-action: none; user-select: none; -webkit-user-select: none; }
      .td-wrap canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
      .td-gl { pointer-events: none; }
      .td-chips { position: absolute; left: 8px; right: 8px; display: flex; gap: 6px; flex-wrap: nowrap; overflow: hidden; pointer-events: none; justify-content: center; }
      .td-chip { display: flex; align-items: center; gap: 5px; padding: 3px 9px 3px 4px; border-radius: 999px; background: rgba(30,16,50,0.66);
        color: #fff; font: 800 12px ${FONT}; white-space: nowrap; border: 2px solid transparent; flex: 0 1 auto; min-width: 0; }
      .td-chip.me { border-color: rgba(255,255,255,0.8); }
      .td-chip.out { opacity: 0.62; }
      .td-chip .dot { width: 16px; height: 16px; border-radius: 50%; flex: none; display: grid; place-items: center; font-size: 10px; }
      .td-chip .nm { overflow: hidden; text-overflow: ellipsis; max-width: 70px; }
      .td-chip .d { font-variant-numeric: tabular-nums; color: #ffe08a; }
      .td-card { position: absolute; left: 50%; transform: translateX(-50%); min-width: 230px; max-width: calc(100% - 32px);
        background: rgba(30,16,50,0.9); border: 2px solid rgba(255,255,255,0.18); border-radius: 18px; padding: 12px 16px 14px; color: #fff;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: center; }
      .td-card h2 { margin: 0 0 4px; font: 900 22px ${FONT}; color: var(--sun, #ffd43b); }
      .td-card p { margin: 0 0 6px; font: 800 15px ${FONT}; }
      .td-card .best { font: 700 12px ${FONT}; color: #d8ccff; margin-bottom: 10px; }
      .td-card .tap { font: 700 11px ${FONT}; color: #b9addb; margin: 8px 0 0; }
    `;
    const wrap = document.createElement('div');
    wrap.className = 'td-wrap';
    const glCanvas = document.createElement('canvas');
    glCanvas.className = 'td-gl';
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.setAttribute('aria-label', 'Temple Dash. Swipe left or right to change lanes and to turn at corners, up to jump, down to slide.');
    const chips = document.createElement('div');
    chips.className = 'td-chips';
    const card = document.createElement('div');
    card.className = 'td-card';
    card.hidden = true;
    const cardTitle = document.createElement('h2');
    const cardLine = document.createElement('p');
    const cardBest = document.createElement('div');
    cardBest.className = 'best';
    const againBtn = document.createElement('button');
    againBtn.className = 'btn';
    againBtn.textContent = 'Run again';
    const cardTap = document.createElement('div');
    cardTap.className = 'tap';
    cardTap.textContent = 'or tap anywhere';
    card.append(cardTitle, cardLine, cardBest, againBtn, cardTap);
    wrap.append(glCanvas, canvas, chips, card);
    api.el.append(style, wrap);
    const ctx = canvas.getContext('2d');

    let sceneCanvas = glCanvas;
    let scene = null;
    try { scene = createScene(glCanvas); } catch (e) { console.warn('temple: WebGL failed, using 2D', e); }
    if (!scene) {
      sceneCanvas = document.createElement('canvas');
      sceneCanvas.className = 'td-gl';
      glCanvas.replaceWith(sceneCanvas);
      scene = createScene(sceneCanvas, true);
    }

    // --- art ---------------------------------------------------------------
    const sprites = new Map();
    const once = (key, fn) => {
      if (!sprites.has(key)) sprites.set(key, fn());
      return sprites.get(key);
    };
    const pic = (name, standIn) => api.img(name) || once(name, standIn);
    const runnerSheet = color => {
      const delivered = api.img('temple-runner');
      return once(`runner|${color}|${delivered ? 'art' : 'drawn'}`, () => art.tintShirt(delivered || once('runner-base', art.drawRunnerSheet), color));
    };
    const fires = [0, 1, 2].map(i => () => api.img('temple-fire') || once(`fire${i}`, () => art.drawFire(i)));
    let texSig = '';
    function refreshTextures() {
      const sig = ['temple-path', 'temple-wall', 'temple-sky'].map(n => (api.img(n) ? 1 : 0)).join('');
      if (sig === texSig) return;
      texSig = sig;
      const sky = pic('temple-sky', art.drawSky);
      scene.setTextures({
        path: pic('temple-path', art.drawPathTile), wall: pic('temple-wall', art.drawWallTile),
        jungle: once('jungle', art.drawJungleTile), trees: once('trees', art.drawTrees), sky,
      }, averageColor(sky, 0.74, 0.9), averageColor(sky, 0, 0.04));
      geoKey = '';
    }

    // --- state -------------------------------------------------------------
    let S = P.parseShared(api.shared());
    const temples = new Map();
    const templeFor = seed => {
      if (!temples.has(seed)) {
        if (temples.size > 3) temples.clear();
        temples.set(seed, P.createTemple(seed));
      }
      return temples.get(seed);
    };
    let temple = null, runSeed = 0;
    let run = null, startAt = 0, runNo = 0;
    let brain = P.newBrain();
    let rookieUntil = 0;
    let timeScale = 1;
    let sessionBest = 0;
    const records = { best: api.store.get('best', 0), score: api.store.get('bestScore', 0) };
    let newBest = false;
    let diedAt = 0;                     // performance.now() when my run ended
    const downFor = () => (run && !run.alive ? (now() - diedAt) / 1000 : 0);
    const remote = new Map();           // id -> drawn runner
    const fallen = new Set();           // `${id}:${n}` crashes already shown
    const inputs = [];                  // presses waiting for the next step
    const puffs = [], sparks = [], floaters = [];
    let vis = { x: 0, z: 0 };           // eases my drawn position across a turn
    let shake = 0, monkeyVis = 0;
    let lastSend = 0, sentSig = '';
    let stats = { frames: 0, cpu: 0, worst: 0, intervals: [] };
    let counts = { falls: 0, fellSeen: [], coins: 0, jumps: 0, slides: 0, turns: 0, stumbles: 0 };
    const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const now = () => performance.now();
    const members = () => api.players();
    const nameOf = id => members().find(m => m.id === id)?.name || 'Runner';
    const colorOf = id => okColor(members().find(m => m.id === id)?.color);
    const counting = () => run && run.alive && Date.now() < startAt;

    function ensureShared() {
      if (S || !api.isOwner()) return;
      api.setShared({ seed: 1 + Math.floor(Math.random() * 0x7ffffffe), at: Date.now() + FIRST_DELAY });
      S = P.parseShared(api.shared());
    }
    function beginRun(delay) {
      if (!S) return;
      temple = templeFor(S.seed);
      runSeed = S.seed;
      run = P.newRun(++runNo);
      run.timeScale = timeScale;
      startAt = Date.now() + Math.max(0, delay);
      brain = P.newBrain({ react: 0.22 + Math.random() * 0.14, mistakes: 0.02 });
      vis = { x: 0, z: 0 };
      camSnap = true;
      newBest = false;
      card.hidden = true;
      inputs.length = 0;
      sentSig = '';
      publish(true);
    }
    function runAgain() {
      if (!run || run.alive || downFor() < 0.35 || !S) return;
      api.sfx('click');
      beginRun(0);
      floaters.push({ text: 'Go!', t: 0, color: '#69db7c', big: true });
    }
    // The first run: with everyone at the opening countdown, or a short one for a late joiner.
    function maybeStart() {
      ensureShared();
      if (!S) return;
      if (!run) beginRun(S.at > Date.now() ? S.at - Date.now() : JOIN_DELAY);
      else if (counting() && S.seed !== runSeed) beginRun(Math.max(startAt - Date.now(), 0));
    }

    // --- layout --------------------------------------------------------------
    let w = 1, h = 1, dpr = 1, glScale = 1, inset = { top: 0, bottom: 0 };
    let glCap = 1.5, slowSince = 0, fastSince = 0;
    const cam = { x: 0, y: CAM_H, z: 0, yaw: 0, pitch: PITCH, f: 400, cx: 200, cy: 200 };
    let baseF = 400, camYaw = null, camSnap = true;
    function resize() {
      const r = api.el.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      glScale = Math.min(glCap, dpr);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      sceneCanvas.width = Math.round(w * glScale);
      sceneCanvas.height = Math.round(h * glScale);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      baseF = Math.min(w * 1.0, h * 1.15);
      chips.style.top = inset.top + 8 + 'px';
      card.style.bottom = Math.max(14, inset.bottom + 14) + 'px';
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    function project(x, y, z) {
      const rx = x - cam.x, rz = z - cam.z;
      const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw);
      const lf = rx * fx + rz * fz, lx = rx * -fz + rz * fx, ly = y - cam.y;
      const sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
      const depth = lf * cp - ly * sp, yc = lf * sp + ly * cp;
      if (depth < 0.4) return null;
      return { x: cam.cx + (cam.f * lx) / depth, y: cam.cy - (cam.f * yc) / depth, depth, s: cam.f / depth };
    }
    const yawOf = seg => (seg.yaw * Math.PI) / 2;

    // Who the camera follows: me, or once I've been down a moment the leading
    // runner still going.
    function focus() {
      if (run && temple && run.alive) {
        const p = P.pointAt(temple.seg(run.g), run.s, run.x);
        return { me: true, id: myId, g: run.g, s: run.s, x: run.x, y: run.y, wx: p.x + vis.x, wz: p.z + vis.z, yaw: yawOf(temple.seg(run.g)), v: P.speedAt(run.s) };
      }
      // Down: the camera stays where it happened for a moment.
      const held = () => {
        const s = run.deadS ?? run.s, p = P.pointAt(temple.seg(run.g), s, run.x);
        return { me: true, id: myId, g: run.g, s, x: run.x, y: 0, wx: p.x + vis.x, wz: p.z + vis.z, yaw: yawOf(temple.seg(run.g)), v: 0 };
      };
      if (run && temple && downFor() < 1.6) return held();
      let best = null;
      for (const r of remote.values()) if (r.live && r.a !== 4 && (!best || r.d > best.d)) best = r;
      if (best) return { me: false, id: best.id, g: best.g, s: best.d, x: best.x, y: best.y, wx: best.wx, wz: best.wz, yaw: yawOf(temple.seg(best.g)), v: P.speedAt(best.d) };
      if (run && temple) return held();
      return { me: true, id: myId, g: 0, s: 0, x: 0, y: 0, wx: 0, wz: 0, yaw: 0, v: 0 };
    }
    let lastFocusId = myId;
    function placeCamera(fc, dt) {
      if (fc.id !== lastFocusId) { camSnap = true; lastFocusId = fc.id; }
      if (camYaw == null || camSnap) camYaw = fc.yaw;
      camYaw = wrapAngle(camYaw + wrapAngle(fc.yaw - camYaw) * (1 - Math.exp(-dt * 8)));
      const tall = h > w * 1.2;
      const camH = tall ? CAM_H_TALL : CAM_H;
      const fx = Math.cos(camYaw), fz = Math.sin(camYaw);
      // Mostly behind the runner, following their lane part of the way.
      const lat = -fc.x * 0.45;
      const rx = -fz, rz = fx;
      const tx = fc.wx - fx * CAM_D + rx * lat, tz = fc.wz - fz * CAM_D + rz * lat;
      const ty = camH + Math.max(0, fc.y) * 0.4 + Math.min(0, fc.y) * 0.15;
      if (camSnap || Math.hypot(tx - cam.x, tz - cam.z) > 12) { cam.x = tx; cam.z = tz; cam.y = ty; camSnap = false; }
      const e = 1 - Math.exp(-dt * 16);
      cam.x += (tx - cam.x) * e;
      cam.z += (tz - cam.z) * e;
      cam.y += (ty - cam.y) * (1 - Math.exp(-dt * 6));
      cam.yaw = camYaw;
      cam.pitch = PITCH;
      const speedK = clamp((fc.v - P.V0) / (P.VMAX - P.V0), 0, 1);
      const f = baseF * (1 - 0.1 * speedK);
      cam.f += (f - cam.f) * (1 - Math.exp(-dt * 3));
      // Put the runner's feet about two thirds of the way down between the bars.
      const depth = CAM_D * Math.cos(PITCH) + camH * Math.sin(PITCH);
      const yc = CAM_D * Math.sin(PITCH) - camH * Math.cos(PITCH);
      const top = inset.top, bottom = h - inset.bottom;
      cam.cx = w / 2;
      cam.cy = top + (bottom - top) * (tall ? 0.7 : 0.76) + (cam.f * yc) / depth;
      if (shake > 0 && !reduced) {
        cam.cx += (Math.random() - 0.5) * shake * 16;
        cam.cy += (Math.random() - 0.5) * shake * 12;
      }
    }

    // --- network -------------------------------------------------------------
    function publish(force = false) {
      if (!run) return;
      const t = now();
      if (!force && t - lastSend < SEND_MS) return;
      const st = P.packRun(run, runSeed, sessionBest, counting());
      const sig = JSON.stringify(st);
      if (sig === sentSig && t - lastSend < 1000) return;
      sentSig = sig;
      lastSend = t;
      api.setState(st);
    }
    function showFall(id, k, wx, wz, y) {
      counts.falls++;
      counts.fellSeen.push(id);
      if (counts.fellSeen.length > 20) counts.fellSeen.shift();
      if (wx != null) puffAt(wx, Math.max(0.3, y + 0.5), wz, 10, '#d9c9a8');
      floaters.push({ text: `${nameOf(id)} fell!`, t: 0, color: colorOf(id) });
      api.sfx('miss');
    }
    function readRemote(dt) {
      const seen = new Set();
      for (const m of members()) {
        if (m.me) continue;
        seen.add(m.id);
        let r = remote.get(m.id);
        if (!r) { r = { id: m.id, live: false, d: 0, x: 0, y: 0, g: 0, a: 0, n: -1, c: 0, b: 0, sig: '', at: 0, wx: 0, wz: 0, airT: 0 }; remote.set(m.id, r); }
        const st = temple ? P.parseRunner(m.state, runSeed, temple) : null;
        r.b = st ? st.b : (Number.isFinite(m.state?.b) ? clamp(m.state.b, 0, 2e5) : r.b);
        if (!st) { r.live = false; continue; }
        const sig = JSON.stringify(st);
        if (sig !== r.sig) {
          const fresh = st.n !== r.n || !r.live;
          if (st.a === 1 && r.a !== 1) r.airT = 0;
          if (st.a === 4 && (r.a !== 4 || fresh)) r.deadAt = now();
          r.sig = sig;
          r.at = now();
          r.sample = st;
          if (fresh) { r.d = st.d; r.x = st.x; r.y = st.y; r.snap = true; }
          r.n = st.n; r.g = st.g; r.a = st.a; r.c = st.c; r.k = st.k; r.ch = st.ch;
          r.live = true;
          if (st.a === 4 && !fallen.has(`${m.id}:${st.n}`)) {
            fallen.add(`${m.id}:${st.n}`);
            // Only a crash I saw happen gets the puff, not one already over when I joined.
            if (!fresh) {
              const p = P.pointAt(temple.seg(st.g), st.d, st.x);
              showFall(m.id, st.k, p.x, p.z, st.y);
            }
          }
        }
        // Extrapolate from the last sample and ease towards it.
        const s = r.sample;
        const age = Math.min(0.4, (now() - r.at) / 1000);
        const seg = temple.seg(s.g);
        const td = s.a === 4 || s.a === 5 ? s.d : Math.min(s.d + P.speedAt(s.d) * age, seg.D + 1);
        if (r.snap || Math.abs(td - r.d) > 8) r.d = td;
        const e = 1 - Math.exp(-dt * 12);
        // Run on at their speed, and ease out the difference (easing alone would trail behind).
        if (s.a !== 4 && s.a !== 5) r.d += P.speedAt(r.d) * dt;
        r.d += (td - r.d) * e;
        r.x += (s.x - r.x) * e;
        if (s.a === 1) {
          r.airT += dt;
          const u = clamp(r.airT / P.JUMP_T, 0, 1);
          r.y = 4 * P.JUMP_H * u * (1 - u);
        } else r.y += (s.y - r.y) * (1 - Math.exp(-dt * 10));
        const p = P.pointAt(seg, r.d, r.x);
        if (r.snap || Math.hypot(p.x - r.wx, p.z - r.wz) > 8) { r.wx = p.x; r.wz = p.z; }
        const e2 = 1 - Math.exp(-dt * 14);
        r.wx += (p.x - r.wx) * e2;
        r.wz += (p.z - r.wz) * e2;
        r.snap = false;
      }
      for (const id of [...remote.keys()]) if (!seen.has(id)) remote.delete(id);
    }
    api.on('fell', (d, from) => {
      const m = P.parseFell(d);
      if (!m || from === myId || !members().some(p => p.id === from)) return;
      const key = `${from}:${m.n}`;
      if (fallen.has(key)) return;
      fallen.add(key);
      const r = remote.get(from);
      showFall(from, m.k, r?.live ? r.wx : null, r?.live ? r.wz : null, r?.y ?? 0);
    });

    // --- input ---------------------------------------------------------------
    const push = a => { if (run && run.alive && inputs.length < 4) inputs.push(a); };
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected || e.type !== 'keydown') return;
      const k = e.code;
      const map = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', Space: 'U', ArrowDown: 'D', KeyS: 'D', Enter: 'E' };
      const a = map[k];
      if (!a) return;
      if (run && !run.alive) {
        if (k === 'Space' || k === 'Enter') { if (e.target === againBtn) return; e.preventDefault(); if (!e.repeat) runAgain(); }
        return;
      }
      e.preventDefault();
      if (e.repeat) return;
      if (a === 'L') push({ side: -1 });
      else if (a === 'R') push({ side: 1 });
      else if (a === 'U') push({ jump: true });
      else if (a === 'D') push({ slide: true });
    }
    window.addEventListener('keydown', onKey);
    // Swipes: one action per touch, as soon as the finger has moved far enough;
    // a quick short flick counts on lifting.
    let touch = null;
    const swipeMin = () => clamp(Math.min(w, h) * 0.055, 16, 40);
    function fire(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) push({ side: dx > 0 ? 1 : -1 });
      else if (dy < 0) push({ jump: true });
      else push({ slide: true });
    }
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (run && !run.alive) { runAgain(); return; }
      canvas.setPointerCapture?.(e.pointerId);
      touch = { id: e.pointerId, x0: e.offsetX, y0: e.offsetY, t0: now(), fired: false };
    });
    canvas.addEventListener('pointermove', e => {
      if (!touch || touch.id !== e.pointerId || touch.fired) return;
      const dx = e.offsetX - touch.x0, dy = e.offsetY - touch.y0;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= swipeMin()) { touch.fired = true; fire(dx, dy); }
    });
    const lift = e => {
      if (!touch || touch.id !== e.pointerId) return;
      if (!touch.fired && e.type === 'pointerup') {
        const dx = e.offsetX - touch.x0, dy = e.offsetY - touch.y0;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= swipeMin() * 0.5 && now() - touch.t0 < 300) fire(dx, dy);
      }
      touch = null;
    };
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    againBtn.addEventListener('click', () => runAgain());
    let padDir = '';

    // --- effects ---------------------------------------------------------------
    function puffAt(x, y, z, n, col) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3.5;
        puffs.push({ x, y: y + Math.random() * 0.6, z, vx: Math.cos(a) * sp, vy: 1 + Math.random() * 2.5, vz: Math.sin(a) * sp, t: 0, max: 0.7 + Math.random() * 0.6, r: 0.35 + Math.random() * 0.5, col });
      }
      if (puffs.length > 120) puffs.splice(0, puffs.length - 120);
    }
    function sparkleAt(x, y, z) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        sparks.push({ x, y, z, vx: Math.cos(a) * 2, vy: 1.5 + Math.random() * 1.5, vz: Math.sin(a) * 2, t: 0, max: 0.4 });
      }
      if (sparks.length > 120) sparks.splice(0, sparks.length - 120);
    }
    function myWorld() {
      const p = P.pointAt(temple.seg(run.g), run.s, run.x);
      return { x: p.x + vis.x, z: p.z + vis.z };
    }
    function handle(ev) {
      for (const e of ev) {
        if (e.type === 'lane') api.sfx('click');
        else if (e.type === 'bump') { api.sfx('bounce'); shake = Math.max(shake, 0.15); }
        else if (e.type === 'turn') { api.sfx('whoosh'); counts.turns++; }
        else if (e.type === 'turned') { vis.x += e.ox; vis.z += e.oz; }
        else if (e.type === 'jump') { api.sfx('flap'); counts.jumps++; }
        else if (e.type === 'slide') { api.sfx('blow'); counts.slides++; const p = myWorld(); puffAt(p.x, 0.1, p.z, 5, '#e2cfa6'); }
        else if (e.type === 'land') { const p = myWorld(); puffAt(p.x, 0.05, p.z, 3, '#e2cfa6'); }
        else if (e.type === 'coin') {
          counts.coins++;
          api.sfx('pop');
          const c = temple.seg(run.g).coins.find(q => q.id === e.id);
          if (c) { const p = P.pointAt(temple.seg(run.g), c.s, P.laneX(c.lane)); sparkleAt(p.x, c.y, p.z); }
        } else if (e.type === 'stumble') {
          counts.stumbles++;
          api.sfx('bounce');
          shake = Math.max(shake, 0.35);
          if (run.alive) floaters.push({ text: e.kind === 'fire' ? 'Ouch, hot! Monkeys!' : 'Stumbled! Monkeys!', t: 0, color: '#ff8c42' });
        } else if (e.type === 'dead') died();
      }
    }
    function died() {
      diedAt = now();
      const p = myWorld();
      puffAt(p.x, 0.5, p.z, run.cause === 'crash' ? 14 : 8, '#d9c9a8');
      shake = run.cause === 'crash' ? 0.7 : 0.4;
      api.sfx(run.cause === 'crash' ? 'bang' : 'lose');
      const dist = Math.floor(Math.max(0, run.s)), score = P.scoreOf(run);
      sessionBest = Math.max(sessionBest, dist);
      if (dist > records.best) { records.best = dist; api.store.set('best', dist); newBest = true; }
      if (score > records.score) { records.score = score; api.store.set('bestScore', score); }
      floaters.push({ text: CAUSE_TEXT[run.cause] || 'Down!', t: 0, color: '#fff', big: true });
      fallen.add(`${myId}:${run.n}`);
      api.send('fell', { n: run.n, d: Math.round(run.s * 10) / 10, k: P.CAUSES.indexOf(run.cause) });
      publish(true);
    }

    // --- simulation ------------------------------------------------------------
    function simStep(dt) {
      if (!run || !temple) return;
      if (run.alive && Date.now() < startAt) { inputs.length = 0; return; }
      const auto = now() < rookieUntil;
      let act = inputs.shift() || null;
      if (auto && run.alive) act = P.autopilot(run, temple, brain, dt);
      const before = run.s;
      const ev = P.stepRun(run, temple, act, dt);
      handle(ev);
      if (run.alive) {
        // Every 500 m, a cheer (and a record when passing the best).
        if (Math.floor(run.s / 500) > Math.floor(before / 500)) {
          floaters.push({ text: `${fmtInt(Math.floor(run.s / 500) * 500)} m!`, t: 0, color: '#ffd43b', big: true });
          api.sfx('score');
        }
        if (records.best > 50 && before <= records.best && run.s > records.best) {
          floaters.push({ text: 'New record!', t: 0, color: '#63e6be', big: true });
          api.sfx('win');
        }
        // Dust from the runner's feet, more at speed.
        if (!run.air && run.slide <= 0 && Math.random() < dt * (2 + P.speedAt(run.s) * 0.25)) {
          const p = myWorld();
          puffs.push({ x: p.x + (Math.random() - 0.5) * 0.4, y: 0.05, z: p.z, vx: (Math.random() - 0.5), vy: 0.6 + Math.random() * 0.6, vz: (Math.random() - 0.5), t: 0, max: 0.3, r: 0.07 + Math.random() * 0.05, col: '#e6d4ad', a: 0.4, dust: true });
        }
      }
      if (auto && !run.alive && downFor() > 1.2) runAgain();
    }
    function updateParticles(dt) {
      for (const p of puffs) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 0.93; p.vz *= 0.93; p.vy *= 0.95; }
      for (let i = puffs.length - 1; i >= 0; i--) if (puffs[i].t > puffs[i].max) puffs.splice(i, 1);
      for (const s of sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; }
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t > sparks[i].max) sparks.splice(i, 1);
      for (const f of floaters) f.t += dt;
      for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].t > 1.8) floaters.splice(i, 1);
      if (floaters.length > 5) floaters.splice(0, floaters.length - 5);
      shake = Math.max(0, shake - dt * 1.8);
      const k = Math.exp(-dt * 7);
      vis.x *= k; vis.z *= k;
      let want = 0;
      if (run) {
        if (!run.alive && run.cause === 'caught') want = downFor() < 1.6 ? 1.15 : 0;
        else if (run.alive && Date.now() < startAt) want = 0.75;
        else if (run.alive) want = Math.max(run.chase > 0 ? 0.55 + 0.45 * run.chase : 0, clamp(1 - run.t / 2.5, 0, 1) * 0.8);
      }
      monkeyVis += (want - monkeyVis) * (1 - Math.exp(-dt * 4));
    }

    // --- drawing -------------------------------------------------------------
    function drawFace(id, x, y, r, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#e9b98a';
      ctx.fill();
      ctx.clip();
      const media = api.mediaOf?.(id);
      const sw = media?.videoWidth || media?.width || 0, sh = media?.videoHeight || media?.height || 0;
      let drew = false;
      if (sw && sh && (media.readyState === undefined || media.readyState >= 2)) {
        const k = Math.max((r * 2) / sw, (r * 2) / sh) * 1.25;
        try { ctx.drawImage(media, x - (sw * k) / 2, y - (sh * k) / 2 + r * 0.1, sw * k, sh * k); drew = true; } catch { /* not ready */ }
      }
      if (!drew) {
        ctx.fillStyle = '#7a4a2a';
        ctx.font = `900 ${Math.round(r * 1.1)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((nameOf(id)[0] || '?').toUpperCase(), x, y + r * 0.05);
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(1.5, r * 0.14);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // A runner whose feet are at (wx, y, wz). me: mine (solid), else a see-through friend.
    function drawRunner(o) {
      const p = project(o.wx, o.y, o.wz);
      if (!p) return;
      const sw = RUN_W * p.s, sh = sw * (art.FRAME_H / art.FRAME_W);
      if (sw < 2) return;
      let frame = Math.floor((o.d / STRIDE) * 4) % 4;
      if (frame < 0) frame += 4;
      let rot = 0, alpha = o.me ? 1 : 0.58;
      // A friend between the camera and me, or right where I am, is faint, so I can still see myself.
      if (!o.me && p.depth < CAM_D + 0.4) alpha = 0.18 * clamp((p.depth - 1) / 2, 0, 1);
      else if (!o.me && o.nearMe) alpha = 0.3;
      if (o.waiting || o.a === 5) frame = 0;
      else if (o.a === 1) frame = 4;
      else if (o.a === 2) frame = 5;
      else if (o.a === 3) rot = Math.sin(now() / 50) * 0.18;
      else if (o.a === 4) {
        if (o.k === 3) { frame = 4; rot = clamp(o.deadT ?? 1, 0, 1) * -1.4; }
        else if (o.k === 4) frame = 5;
        else { frame = 4; rot = (o.deadT ?? 1) * 2.4; alpha *= clamp(1 + o.y / 1.6, 0, 1); }   // gone below the edge
      }
      if (alpha <= 0.02) return;
      // Shadow on the stones.
      if (o.y > -0.1) {
        const g = project(o.wx, 0, o.wz);
        if (g) {
          ctx.fillStyle = `rgba(30,20,10,${0.32 * alpha * clamp(1 - o.y / 3, 0.3, 1)})`;
          ctx.beginPath();
          ctx.ellipse(g.x, g.y, sw * 0.42, sw * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const sheet = runnerSheet(o.color);
      const fw = sheet.width / 6, fh = sheet.height;
      const deliveredRunner = !!api.img('temple-runner');
      const feet = deliveredRunner ? art.ART_FEET : art.FEET, heads = deliveredRunner ? art.ART_HEADS : art.HEADS;
      const x0 = p.x - sw / 2, y0 = p.y - sh * feet;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (rot) {
        ctx.translate(p.x, p.y - sh * 0.45);
        ctx.rotate(rot);
        ctx.translate(-p.x, -(p.y - sh * 0.45));
      }
      ctx.drawImage(sheet, frame * fw, 0, fw, fh, x0, y0, sw, sh);
      ctx.restore();
      const hd = heads[frame];
      let hx = x0 + sw * hd[0], hy = y0 + sh * hd[1];
      if (rot) {
        const cx = p.x, cy = p.y - sh * 0.45, dx = hx - cx, dy = hy - cy;
        hx = cx + dx * Math.cos(rot) - dy * Math.sin(rot);
        hy = cy + dx * Math.sin(rot) + dy * Math.cos(rot);
      }
      drawFace(o.id, hx, hy, sw * hd[2], o.color, o.me ? 1 : alpha >= 0.5 ? Math.min(1, alpha + 0.2) : alpha);
      if (!o.me && p.depth < 90 && p.depth > CAM_D + 0.4) {
        const size = Math.round(clamp(sw * 0.32, 11, 15));
        ctx.font = `800 ${size}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        const ty = hy - sw * hd[2] - 6;
        ctx.strokeText(o.name, hx, ty);
        ctx.fillStyle = o.color;
        ctx.fillText(o.name, hx, ty);
      }
      // Monkeys on a friend's heels.
      if (!o.me && o.ch && o.a !== 4) {
        const q = project(o.back.x, 0, o.back.z);
        const img = pic('temple-monkeys', art.drawMonkeys);
        if (q && q.s * 1.6 > 6) {
          const mw = 1.6 * q.s, mh = mw / 2;
          ctx.globalAlpha = 0.7;
          ctx.drawImage(img, q.x - mw / 2, q.y - mh * 0.95 - Math.abs(Math.sin(now() / 90)) * mh * 0.05, mw, mh);
          ctx.globalAlpha = 1;
        }
      }
      return p;
    }

    // An image standing across the walkway at distance s on seg: from x0 to x1 metres, ht tall.
    function across(img, seg, s, x0, x1, ht, alpha = 1) {
      const a = P.pointAt(seg, s, x0), b = P.pointAt(seg, s, x1);
      const tl = project(a.x, ht, a.z), tr = project(b.x, ht, b.z), bl = project(a.x, 0, a.z);
      if (!tl || !tr || !bl) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.transform((tr.x - tl.x) / img.width, (tr.y - tl.y) / img.width, (bl.x - tl.x) / img.height, (bl.y - tl.y) / img.height, tl.x, tl.y);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
    // Faded far away, and close to the lens (things just passed fly by under the camera).
    const fogAlpha = d => (1 - 0.85 * clamp((d - 110) / 180, 0, 1)) * clamp((d - 1.2) / 2.2, 0, 1);

    let remoteShown = new Map();
    function render(fc) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!temple) { drawHud(fc); return; }
      const list = [];
      const tnow = now();
      const lo = fc.s - 6, hi = fc.s + 230;
      for (let k = Math.max(0, fc.g - 1); k <= fc.g + 3; k++) {
        const seg = temple.seg(k);
        if (seg.S > hi) break;
        // The arrow painted in the corner.
        if (seg.D > lo && seg.D < hi) {
          const at = P.pointAt(seg, seg.D, 0);
          const p = project(at.x, 0, at.z);
          if (p) list.push({ depth: p.depth + 3, draw: () => cornerArrow(seg) });
        }
        for (const o of seg.obs) {
          if (o.s < lo || o.s > hi || o.type === 'gap') continue;
          const c = P.pointAt(seg, o.s + o.len / 2, 0);
          const p = project(c.x, 0.5, c.z);
          if (!p) continue;
          const fa = fogAlpha(p.depth);
          if (o.type === 'root') list.push({ depth: p.depth, draw: () => across(pic('temple-root', art.drawRoot), seg, o.s + o.len / 2, -ROOT_W / 2, ROOT_W / 2, ROOT_H, fa) });
          else if (o.type === 'arch') list.push({ depth: p.depth, draw: () => across(pic('temple-beam', art.drawBeam), seg, o.s + o.len / 2, -ARCH_W / 2, ARCH_W / 2, api.img('temple-beam') ? ARCH_H_ART : ARCH_H, fa) });
          else if (o.type === 'fire') {
            for (let l = 0; l < 3; l++) {
              if (!(o.mask & (1 << l))) continue;
              const x = P.laneX(l - 1);
              const img = fires[Math.floor(tnow / 90 + l) % 3]();
              const flick = api.img('temple-fire') ? 0.92 + 0.08 * Math.sin(tnow / 60 + l * 2) : 1;
              list.push({ depth: p.depth - 0.01 * l, draw: () => across(img, seg, o.s + o.len / 2, x - FIRE_W / 2, x + FIRE_W / 2, FIRE_H * flick, fa) });
            }
          }
        }
        // Coins (the ones I haven't picked up).
        const coinImg = pic('temple-coin', art.drawCoin);
        for (const c of seg.coins) {
          if (c.s < lo || c.s > hi || (run && run.got.has(c.id))) continue;
          const at = P.pointAt(seg, c.s, P.laneX(c.lane));
          const p = project(at.x, c.y, at.z);
          if (!p) continue;
          const sw = COIN_W * p.s;
          if (sw < 1.5) continue;
          const spin = Math.max(0.18, Math.abs(Math.cos(tnow / 260 + c.s * 0.7)));
          list.push({ depth: p.depth, draw: () => {
            ctx.globalAlpha = fogAlpha(p.depth);
            ctx.drawImage(coinImg, p.x - (sw * spin) / 2, p.y - sw / 2, sw * spin, sw);
            ctx.globalAlpha = 1;
          } });
        }
      }
      // Runners.
      remoteShown = new Map();
      for (const r of remote.values()) {
        if (!r.live) continue;
        if (r.a === 4 && now() - (r.deadAt || 0) > 2500) continue;
        const seg = temple.seg(r.g);
        const [hx, hz] = P.heading(seg.yaw);
        const nearMe = run && run.alive && r.g === run.g && Math.abs(r.d - run.s) < 1.5 && Math.abs(r.x - run.x) < 1;
        const o = { id: r.id, me: false, nearMe, name: nameOf(r.id), color: colorOf(r.id), wx: r.wx, wz: r.wz, y: r.y, d: r.d, a: r.a, k: r.k, ch: r.ch, deadT: (now() - (r.deadAt || 0)) / 1000, back: { x: r.wx - hx * 1.6, z: r.wz - hz * 1.6 } };
        const p = project(o.wx, o.y + 1, o.wz);
        if (p) list.push({ depth: p.depth, draw: () => { const q = drawRunner(o); if (q) remoteShown.set(r.id, { x: q.x, y: q.y, depth: q.depth }); } });
      }
      if (run) {
        const wp = myWorld();
        const o = { id: myId, me: true, name: api.me.name, color: okColor(api.me.color), wx: wp.x, wz: wp.z, y: run.y, d: run.s, a: P.actOf(run), k: P.CAUSES.indexOf(run.cause), deadT: run.deadT, waiting: counting() };
        const p = project(o.wx, o.y + 1, o.wz);
        if (p && (run.alive || downFor() < 3 || fc.me)) list.push({ depth: p.depth, draw: () => drawRunner(o) });
      }
      // Dust and sparkles.
      for (const q of puffs) {
        const p = project(q.x, q.y, q.z);
        if (!p || p.depth < (q.dust ? CAM_D - 0.8 : 1)) continue;
        list.push({ depth: p.depth - 0.05, draw: () => {
          const f = q.t / q.max;
          ctx.globalAlpha = (q.a ?? 0.7) * (1 - f);
          ctx.fillStyle = q.col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.min(q.r * (1 + f) * p.s, Math.min(w, h) * 0.07), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } });
      }
      for (const q of sparks) {
        const p = project(q.x, q.y, q.z);
        if (!p) continue;
        list.push({ depth: p.depth - 0.06, draw: () => {
          ctx.globalAlpha = 1 - q.t / q.max;
          ctx.fillStyle = '#fff3a0';
          const r = clamp(0.06 * p.s, 1.5, 5);
          ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
          ctx.globalAlpha = 1;
        } });
      }
      list.sort((a, b) => b.depth - a.depth);
      for (const e of list) e.draw();
      drawMonkeys();
      drawHud(fc);
    }

    // Chevrons painted on the corner, pointing the way it turns.
    function cornerArrow(seg) {
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const a = seg.D - 1.6 + i * 1.3;
        const tip = P.pointAt(seg, seg.D, seg.dir * (0.6 + i * 0.9));
        const l = P.pointAt(seg, seg.D - 0.9, seg.dir * (-0.1 + i * 0.9)), r = P.pointAt(seg, seg.D + 0.9, seg.dir * (-0.1 + i * 0.9));
        const pt = project(tip.x, 0.02, tip.z), pl = project(l.x, 0.02, l.z), pr = project(r.x, 0.02, r.z);
        if (!pt || !pl || !pr || a < 0 || pt.depth < 5) continue;
        ctx.strokeStyle = 'rgba(255,214,80,0.85)';
        ctx.lineWidth = clamp(0.22 * pt.s, 1.5, 12);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pl.x, pl.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawMonkeys() {
      if (monkeyVis < 0.02) return;
      const img = pic('temple-monkeys', art.drawMonkeys);
      const mw = Math.min(w * 0.95, 560), mh = mw * (img.height / img.width);
      const bob = reduced ? 0 : Math.abs(Math.sin(now() / 85)) * mh * 0.05;
      const bottom = h - inset.bottom;
      const y = bottom - mh * 0.62 * Math.min(1.15, monkeyVis) + bob;
      ctx.drawImage(img, w / 2 - mw / 2, y, mw, mh);
      if (run && run.alive && run.chase > 0) {
        // A red warning glow at the bottom edge.
        const g = ctx.createLinearGradient(0, bottom, 0, bottom - h * 0.3);
        g.addColorStop(0, `rgba(255,40,40,${0.35 * run.chase * (0.7 + 0.3 * Math.sin(now() / 120))})`);
        g.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, bottom - h * 0.3, w, h * 0.3);
      }
    }

    function hudText(text, x, y, size, color = '#fff', align = 'left', weight = 900) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(30,16,50,0.78)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }
    function drawArrow(cx, cy, size, dir, glow) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dir, 1);
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, size * 0.45);
      ctx.lineTo(-size * 0.55, -size * 0.05);
      ctx.quadraticCurveTo(-size * 0.55, -size * 0.3, -size * 0.25, -size * 0.3);
      ctx.lineTo(size * 0.1, -size * 0.3);
      ctx.lineTo(size * 0.1, -size * 0.58);
      ctx.lineTo(size * 0.62, -size * 0.12);
      ctx.lineTo(size * 0.1, size * 0.34);
      ctx.lineTo(size * 0.1, size * 0.06);
      ctx.lineTo(-size * 0.18, size * 0.06);
      ctx.lineTo(-size * 0.18, size * 0.45);
      ctx.closePath();
      ctx.shadowColor = glow ? 'rgba(255,220,60,0.95)' : 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = glow ? 18 : 6;
      ctx.fillStyle = glow ? '#ffd43b' : 'rgba(255,255,255,0.9)';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(30,16,50,0.8)';
      ctx.stroke();
      ctx.restore();
    }
    function drawHud(fc) {
      const top = inset.top + 40;
      const big = Math.round(clamp(Math.min(w, h) * 0.085, 24, 40));
      if (run) {
        const dist = Math.floor(Math.max(0, run.s));
        hudText(`${fmtInt(dist)} m`, 14, top + big, big, '#fff');
        const coinImg = pic('temple-coin', art.drawCoin);
        ctx.drawImage(coinImg, 14, top + big + 8, 18, 18);
        hudText(`${run.coins}`, 36, top + big + 23, 16, '#ffd43b', 'left', 900);
        hudText(`${fmtInt(P.scoreOf(run))} pts`, w - 14, top + 22, 17, '#fff', 'right');
        hudText(`Best ${fmtInt(Math.max(records.best, dist))} m`, w - 14, top + 41, 12, '#e8dcff', 'right', 800);
      } else {
        hudText('Waiting for the temple…', w / 2, h * 0.4, 18, '#fff', 'center');
      }
      if (!fc.me) hudText(`Watching ${nameOf(fc.id)}`, w / 2, top + 22, 15, colorOf(fc.id), 'center', 900);
      // The turn hint: an arrow from a couple of seconds before the corner, lit inside the window.
      if (run && run.alive && temple && !counting()) {
        const seg = temple.seg(run.g);
        const v = P.speedAt(run.s);
        const [a, b] = P.turnWindow(seg, v);
        if (run.turned !== run.g && run.s > a - v * 2 && run.s <= b) {
          const inWin = run.s >= a;
          const pulse = inWin ? 1 + 0.12 * Math.sin(now() / 70) : 1;
          drawArrow(w / 2, h * 0.3, Math.round(clamp(Math.min(w, h) * 0.16, 48, 90) * pulse), seg.dir, inWin);
          if (inWin) hudText('Turn!', w / 2, h * 0.3 + clamp(Math.min(w, h) * 0.16, 48, 90) * 0.75, 18, '#ffd43b', 'center');
        } else if (!run.slide) {
          // A beam coming up: every lane is blocked, so say it plainly.
          const beam = seg.obs.find(o => o.type === 'arch' && o.s > run.s && o.s - run.s < v * 1.4);
          if (beam) {
            const pulse = 1 + 0.1 * Math.sin(now() / 70);
            hudText('⬇ Slide!', w / 2, h * 0.3, Math.round(clamp(Math.min(w, h) * 0.09, 26, 44) * pulse), '#ffd43b', 'center');
          }
        }
      }
      // The countdown.
      if (run && counting()) {
        const left = (startAt - Date.now()) / 1000;
        const n = Math.ceil(left);
        const label = n > 3 ? 'Get ready' : String(n);
        const frac = left - Math.floor(left);
        hudText(label, w / 2, h * 0.36, Math.round(label.length > 2 ? big : big * (1.7 + 0.5 * frac)), n > 3 ? '#fff' : '#ffd43b', 'center');
        const touchy = matchMedia?.('(pointer: coarse)').matches;
        const lines = touchy ? ['Swipe ← → to change lanes and turn', 'Swipe ↑ to jump · ↓ to slide'] : ['← → (A D) lanes and turns', '↑ / Space jump · ↓ slide'];
        const y0 = h - inset.bottom - 30 - (lines.length - 1) * 18 - h * 0.12;
        lines.forEach((l, i) => hudText(l, w / 2, y0 + i * 18, 13, '#fff', 'center', 800));
      }
      floaters.forEach((f, i) => {
        ctx.globalAlpha = clamp(1.8 - f.t, 0, 1);
        hudText(f.text, w / 2, h * 0.22 + i * 30 - f.t * 14, f.big ? 28 : 19, f.color, 'center');
        ctx.globalAlpha = 1;
      });
    }

    // Leaderboard chips: everyone's distance, the session's best runner crowned.
    let chipsAt = 0, chipSig = '';
    function updateChips(force) {
      const t = now();
      if (!force && t - chipsAt < 250) return;
      chipsAt = t;
      const rows = [];
      if (run) rows.push({ id: myId, me: true, d: Math.max(0, run.s), out: !run.alive, b: Math.max(sessionBest, run.alive ? 0 : run.s) });
      for (const r of remote.values()) rows.push({ id: r.id, me: false, d: r.live ? Math.max(0, r.d) : 0, out: !r.live || r.a === 4, b: Math.max(r.b || 0, r.live && r.a === 4 ? r.d : 0) });
      rows.sort((a, b) => b.d - a.d);
      const top = rows.reduce((m, r) => (r.b > (m?.b ?? 0) ? r : m), null);
      const sig = rows.map(r => `${r.id}|${Math.floor(r.d)}|${r.out}|${top === r}`).join(',');
      if (sig === chipSig) return;
      chipSig = sig;
      chips.replaceChildren();
      for (const r of rows.slice(0, 6)) {
        const c = document.createElement('div');
        c.className = 'td-chip' + (r.me ? ' me' : '') + (r.out ? ' out' : '');
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = r.me ? okColor(api.me.color) : colorOf(r.id);
        dot.textContent = top === r && r.b > 0 ? '👑' : r.out ? '💥' : '';
        const nm = document.createElement('span');
        nm.className = 'nm';
        nm.textContent = r.me ? 'You' : nameOf(r.id);
        const d = document.createElement('span');
        d.className = 'd';
        d.textContent = `${fmtInt(r.d)} m`;
        c.append(dot, nm, d);
        chips.append(c);
      }
      chips.hidden = rows.length < 2;
    }

    function updateCard() {
      const show = run && !run.alive && downFor() > 0.7;
      if (!show) { if (!card.hidden) card.hidden = true; return; }
      if (!card.hidden) return;
      cardTitle.textContent = CAUSE_TEXT[run.cause] || 'Down!';
      cardLine.textContent = `${fmtInt(Math.max(0, run.s))} m · ${run.coins} coins · ${fmtInt(P.scoreOf(run))} pts`;
      cardBest.textContent = newBest ? 'New best distance!' : `Best ${fmtInt(records.best)} m · best score ${fmtInt(records.score)}`;
      card.hidden = false;
      againBtn.focus({ preventScroll: true });
    }

    // --- loop --------------------------------------------------------------
    let raf = 0, last = now(), acc = 0, prevFrame = 0, geoKey = '';
    function frame(t) {
      raf = requestAnimationFrame(frame);
      const t0 = now();
      if (prevFrame) { stats.intervals.push(t0 - prevFrame); if (stats.intervals.length > 240) stats.intervals.shift(); }
      prevFrame = t0;
      const dt = Math.min(0.1, (t - last) / 1000 || 0);
      last = t;
      maybeStart();
      refreshTextures();
      readRemote(dt);
      acc += dt * timeScale;
      let n = 0;
      while (acc >= STEP && n++ < 8) { acc -= STEP; simStep(STEP); }
      if (acc > STEP) acc = 0;
      updateParticles(dt);
      countdownSounds();
      publish();
      const fc = focus();
      const key = `${fc.g}|${Math.floor(fc.s / 40)}|${temple?.seed}`;
      if (temple && key !== geoKey) { geoKey = key; scene.setGeometry(buildGeometry(temple, fc.s, fc.g)); }
      placeCamera(fc, dt);
      scene.draw(cam, glScale, w, h);
      render(fc);
      updateChips();
      updateCard();
      adaptResolution(t0);
      const cpu = now() - t0;
      stats.frames++;
      stats.cpu += cpu;
      stats.worst = Math.max(stats.worst, cpu);
    }
    let lastCount = null;
    function countdownSounds() {
      const n = counting() ? Math.ceil((startAt - Date.now()) / 1000) : null;
      if (n === lastCount) return;
      if (n != null && n >= 1 && n <= 3) api.sfx('tick');
      if (n == null && lastCount === 1) api.sfx('whoosh');
      lastCount = n;
    }
    let holdRes = false;
    function adaptResolution(t0) {
      if (holdRes) return;
      const iv = stats.intervals;
      if (iv.length < 30 || document.hidden) return;
      let sum = 0;
      for (let i = iv.length - 30; i < iv.length; i++) sum += iv[i];
      const avg = sum / 30;
      if (avg > 24 && glCap > 0.35) {
        fastSince = 0;
        if (!slowSince) slowSince = t0;
        if (t0 - slowSince > 1000) {
          glCap = Math.max(0.35, Math.min(glCap, glScale) * 0.75);
          slowSince = 0;
          stats.intervals.length = 0;
          resize();
        }
      } else if (avg < 17.5 && glScale < Math.min(1.5, dpr)) {
        // Fast again (a hiccup passed): step back up, slowly.
        slowSince = 0;
        if (!fastSince) fastSince = t0;
        if (t0 - fastSince > 4000) {
          glCap = Math.min(1.5, glScale / 0.75);
          fastSince = 0;
          stats.intervals.length = 0;
          resize();
        }
      } else { slowSince = 0; fastSince = 0; }
    }
    maybeStart();
    raf = requestAnimationFrame(frame);

    return {
      onChange() {
        const next = P.parseShared(api.shared());
        if (next) S = next;
        maybeStart();
      },
      onPad(pad) {
        const x = pad.x || 0, y = pad.y || 0;
        const dir = pad.left || x < -0.55 ? 'L' : pad.right || x > 0.55 ? 'R' : pad.up || y < -0.6 ? 'U' : pad.down || y > 0.6 ? 'D' : '';
        if (dir && dir !== padDir) {
          if (dir === 'L') push({ side: -1 });
          else if (dir === 'R') push({ side: 1 });
          else if (dir === 'U') push({ jump: true });
          else push({ slide: true });
        }
        padDir = dir;
        if (pad.a) { if (run && !run.alive) runAgain(); else push({ jump: true }); }
        if (pad.xBtn) push({ slide: true });
      },
      // Debug bots (js/rookie.js) call this every 400 ms: the autopilot runs
      // for me, reacting to what's ahead, and runs again after a fall.
      rookie() {
        rookieUntil = now() + 1500;
      },
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        scene?.destroy();
        scene = null;
        sprites.clear();
      },
      _test: {
        info() {
          const seg = temple && run ? temple.seg(run.g) : null;
          return {
            phase: !run ? 'wait' : !run.alive ? 'dead' : counting() ? 'count' : 'run',
            seed: S?.seed ?? 0, runSeed, n: run?.n ?? 0, s: run?.s ?? 0, x: run?.x ?? 0, lane: run?.lane ?? 0, y: run?.y ?? 0, g: run?.g ?? 0,
            alive: !!run?.alive, cause: run?.cause ?? '', coins: run?.coins ?? 0, score: run ? P.scoreOf(run) : 0, chase: run?.chase ?? 0,
            stumbles: run?.stumbles ?? 0, maxY: run?.maxY ?? 0, slide: run?.slide ?? 0, air: !!run?.air, turned: run?.turned ?? -1, t: run?.t ?? 0,
            seg: seg && { S: seg.S, D: seg.D, dir: seg.dir, window: P.turnWindow(seg, P.speedAt(run.s)) },
            remote: [...remote.values()].map(r => ({ id: r.id, live: r.live, d: r.d, x: r.x, g: r.g, a: r.a, n: r.n, shown: remoteShown.get(r.id) || null })),
            counts: { ...counts, fellSeen: counts.fellSeen.slice() }, floaters: floaters.map(f => f.text),
            best: records.best, sessionBest, scene: scene?.kind, focus: lastFocusId, card: !card.hidden, monkeys: monkeyVis,
          };
        },
        // Puts me at distance s (on the segment I'd be on having made every
        // turn), in a lane, running; keep: the monkeys stay as close as they were.
        place(s, lane = 0, keep = false) {
          if (!run || !temple) return;
          const seg = temple.segAt(s);
          Object.assign(run, { s, g: seg.k, turned: -1, lane, x: P.laneX(lane), y: 0, vy: 0, air: false, slide: 0, jumpBuf: 0, slideBuf: 0, maxY: 0 });
          if (!keep) Object.assign(run, { chase: 0, stumble: 0 });
          startAt = Math.min(startAt, Date.now());
          vis = { x: 0, z: 0 };
          camSnap = true;
          acc = 0;
          inputs.length = 0;
          publish(true);
        },
        // Slows the game down (tests use it so a swipe lands where they mean it to).
        scale(f) { timeScale = clamp(f, 0.01, 4); },
        // The first obstacle of a type at or after distance s, and the corner after it.
        find(type, s = 0) {
          if (!temple) return null;
          for (let k = temple.segAt(Math.max(0, s)).k; k < 200; k++) {
            const seg = temple.seg(k);
            const o = seg.obs.find(q => q.type === type && q.s >= s);
            if (o) return { ...o, g: k };
          }
          return null;
        },
        corner(k) { const seg = temple.seg(k); return { S: seg.S, D: seg.D, dir: seg.dir, window: P.turnWindow(seg) }; },
        stats() {
          const iv = stats.intervals.slice().sort((a, b) => a - b);
          return { frames: stats.frames, cpuAvg: stats.cpu / Math.max(1, stats.frames), cpuWorst: stats.worst, frameMedian: iv[Math.floor(iv.length / 2)] || 0, frameP90: iv[Math.floor(iv.length * 0.9)] || 0, glScale };
        },
        resetStats() { stats = { frames: 0, cpu: 0, worst: 0, intervals: [] }; },
        // Full resolution held (tests take sharp pictures with it, despite software WebGL).
        sharp(on) { holdRes = !!on; if (on) glCap = 1.5; stats.intervals.length = 0; resize(); },
        bench(n = 30) {
          const fc = focus();
          const t0 = now();
          for (let i = 0; i < n; i++) { scene.draw(cam, glScale, w, h); scene.finish(); }
          const t1 = now();
          for (let i = 0; i < n; i++) { render(fc); ctx.getImageData(0, 0, 1, 1); }
          const t2 = now();
          return { scene: (t1 - t0) / n, overlay: (t2 - t1) / n, glPixels: sceneCanvas.width * sceneCanvas.height, kind: scene.kind };
        },
      },
    };
  },
};

// Kart Dash: a behind-the-kart racer for one to four people in the call, with
// computer karts filling the grid. Three laps of a twisty circuit; item boxes
// hand out boost rockets, banana peels, bouncing bombs and rainbow stars;
// hits spin karts out with wheels, bolts and panels flying off.
//
// The ground and sky are drawn Mode-7 style by a WebGL shader (kart/gl.js);
// karts, items, trees, particles and the HUD are billboards on a 2D canvas
// over it. Each kart shows its driver's live face, in a helmet of their colour.
//
// Network: everyone simulates their own kart (kart/sim.js) at 60 steps a
// second and publishes it in their state about 20 times a second; other karts
// are drawn extrapolated and eased toward the latest sample. The owner runs
// the race (countdown, results) and the computer karts in shared state and
// their own player state. Items travel as messages: 'box' (a box taken),
// 'drop' and 'pop' (banana peels), 'bomb' and 'boom', 'hit' (spin someone
// out); the owner keeps live peels and box timers in shared state for anyone
// who joins mid-race. Late joiners watch and race in the next one.

import { buildTrack, scenery, itemBoxes, boostPads, obstacleGrid, gridSpot, pointAt, wrapAngle, lapOf, LAPS, WORLD } from './kart/track.js';
import {
  newKart, stepKart, bumpKarts, rollItem, bombAt, standings, autopilot, watchStuck, packKart, unpackKart,
  SPIN_TIME, BOOST_TIME, STAR_TIME, BANANA_R, BOMB_R, BOMB_FUSE, ITEMS,
} from './kart/sim.js';
import { createGround, averageColor } from './kart/gl.js';
import * as art from './kart/art.js';

const STEP = 1 / 60;
const SEND_MS = 50;
const COUNT_MS = 5200;          // countdown: "get ready", then 3-2-1-GO
const MAX_RACERS = 4;
const GRACE = 30;               // seconds the others get once someone finishes
// The chase camera: metres behind and above the kart (higher on an upright
// phone, where there's room to see more of the road ahead), and its tilt.
const CAM_D = 6.6, CAM_H = 2.7, CAM_H_TALL = 3.6, PITCH = 0.1;
const BOT_NAMES = ['Zippy', 'Turbo', 'Nitro'];
const BOT_COLORS = ['#ff8c42', '#9775fa', '#69db7c', '#4dabf7', '#ffd43b', '#3fe0d0', '#ff5fa2'];
const RAINBOW = ['#ff5f6d', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#b77dff'];
const ORD = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || 'th');
const fmt = s => {
  if (!(s > 0)) return '–';
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let TRACK = null;
function world() {
  if (TRACK) return TRACK;
  const track = buildTrack();
  const scen = scenery(track);
  const obstacles = obstacleGrid([...scen.trees.map(t => ({ ...t, r: 1.0 * t.k })), ...scen.tyres.map(t => ({ ...t, r: 1.25 }))]);
  TRACK = { track, scen, obstacles, boxes: itemBoxes(track), pads: boostPads(track) };
  return TRACK;
}

// Shared state from the owner, checked: { ph, r, go, racers, ai, res, bn, bx }.
function parseShared(S) {
  if (!S || typeof S !== 'object' || (S.ph !== 'count' && S.ph !== 'done')) return null;
  if (!Number.isInteger(S.r) || S.r < 0 || !Number.isFinite(S.go)) return null;
  const str = (v, n) => typeof v === 'string' && v.length > 0 && v.length <= n;
  const racers = Array.isArray(S.racers) ? S.racers.filter(id => str(id, 64)).slice(0, MAX_RACERS) : [];
  const ai = Array.isArray(S.ai) ? S.ai.filter(a => Array.isArray(a) && str(a[0], 16) && /^#[0-9a-f]{6}$/i.test(a[1])).slice(0, 3) : [];
  const res = Array.isArray(S.res) ? S.res.filter(e => Array.isArray(e) && str(e[0], 64) && str(e[1], 24) && /^#[0-9a-f]{6}$/i.test(e[2]) && Number.isFinite(e[3]) && Number.isFinite(e[4])).slice(0, 8) : null;
  const bn = Array.isArray(S.bn) ? S.bn.filter(b => Array.isArray(b) && str(b[0], 80) && Number.isFinite(b[1]) && Number.isFinite(b[2])).slice(0, 24) : [];
  const bx = Array.isArray(S.bx) ? S.bx.map(v => (Number.isFinite(v) ? v : 0)).slice(0, 32) : [];
  return { ph: S.ph, r: S.r, go: S.go, racers, ai, res, bn, bx };
}

export default {
  id: 'kart',
  name: 'Kart Dash',
  emoji: '🏎️',
  blurb: 'Race three laps with items, drifts and flying kart parts. Your face drives.',
  minPlayers: 1,
  maxPlayers: 8,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const W = world();
    const { track } = W;
    const myId = api.me.id;

    // --- DOM ---------------------------------------------------------------
    const style = document.createElement('style');
    style.textContent = `
      .kd-wrap { position: absolute; inset: 0; overflow: hidden; background: #7cc4ff; touch-action: none; user-select: none; -webkit-user-select: none; }
      .kd-wrap canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
      .kd-gl { pointer-events: none; }
      .kd-btn { position: absolute; width: 76px; height: 76px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85);
        background: rgba(30,16,50,0.55); color: #fff; font: 900 15px ui-rounded, system-ui, sans-serif; display: grid; place-items: center;
        touch-action: none; padding: 0; box-shadow: 0 4px 0 rgba(0,0,0,0.25); -webkit-tap-highlight-color: transparent; }
      .kd-btn:focus-visible { outline: 3px solid var(--aqua, #3fe0d0); outline-offset: 3px; }
      .kd-btn.on { background: rgba(255,95,162,0.75); transform: translateY(2px); box-shadow: none; }
      .kd-btn canvas { position: static; width: 54px; height: 54px; pointer-events: none; }
      .kd-item.empty { opacity: 0.55; }
      .kd-res { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); min-width: 250px; max-width: calc(100% - 32px);
        background: rgba(30,16,50,0.93); border: 2px solid rgba(255,255,255,0.18); border-radius: 18px; padding: 14px 16px 16px; color: #fff;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: center; }
      .kd-res h2 { margin: 0 0 8px; font: 900 22px ui-rounded, system-ui, sans-serif; color: var(--sun, #ffd43b); }
      .kd-res ol { list-style: none; margin: 0 0 12px; padding: 0; text-align: left; }
      .kd-res li { display: grid; grid-template-columns: 34px 14px 1fr auto; gap: 8px; align-items: center; padding: 5px 4px; font: 800 15px ui-rounded, system-ui, sans-serif; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .kd-res li .dot { width: 12px; height: 12px; border-radius: 50%; }
      .kd-res li .t { font-variant-numeric: tabular-nums; color: #d8ccff; font-size: 13px; }
      .kd-res li.me { color: var(--sun, #ffd43b); }
      .kd-res .best { font: 700 12px ui-rounded, system-ui, sans-serif; color: #c9bdf0; margin-bottom: 10px; }
    `;
    const wrap = document.createElement('div');
    wrap.className = 'kd-wrap';
    const glCanvas = document.createElement('canvas');
    glCanvas.className = 'kd-gl';
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.setAttribute('aria-label', 'Kart Dash race. Hold the left or right side to steer.');
    const driftBtn = document.createElement('button');
    driftBtn.className = 'kd-btn kd-drift';
    driftBtn.textContent = 'DRIFT';
    driftBtn.setAttribute('aria-label', 'Drift (hold while turning)');
    const itemBtn = document.createElement('button');
    itemBtn.className = 'kd-btn kd-item empty';
    itemBtn.setAttribute('aria-label', 'Use item');
    const itemIcon = document.createElement('canvas');
    itemIcon.width = itemIcon.height = 108;
    itemBtn.append(itemIcon);
    const results = document.createElement('div');
    results.className = 'kd-res';
    results.hidden = true;
    wrap.append(glCanvas, canvas, driftBtn, itemBtn, results);
    api.el.append(style, wrap);
    const ctx = canvas.getContext('2d');

    let groundCanvas = glCanvas;
    let ground = null;
    try { ground = createGround(glCanvas); } catch (e) { console.warn('kart: WebGL ground failed, using 2D', e); }
    if (!ground) {
      groundCanvas = document.createElement('canvas');
      groundCanvas.className = 'kd-gl';
      glCanvas.replaceWith(groundCanvas);
      ground = createGround(groundCanvas, true);
    }

    // --- textures ----------------------------------------------------------
    const sprites = new Map();
    const once = (key, fn) => {
      if (!sprites.has(key)) sprites.set(key, fn());
      return sprites.get(key);
    };
    // Art if delivered, else the drawn stand-in.
    const pic = (name, standIn) => api.img(name) || once(name, standIn);
    const kartSprite = (color, turn) => {
      const name = turn < 0 ? 'kart-left' : turn > 0 ? 'kart-right' : 'kart-back';
      const delivered = api.img(name);
      return once(`${name}|${color}|${delivered ? 'art' : 'drawn'}`, () => (delivered ? art.tint(delivered, color) : art.drawKart(color, turn)));
    };
    const partsSheet = color => {
      const delivered = api.img('kart-parts');
      return once(`parts|${color}|${delivered ? 'art' : 'drawn'}`, () => art.tint(delivered || once('parts-base', art.drawParts), color));
    };
    const trees = [0, 1, 2].map(v => () => api.img('kart-tree') || once(`tree${v}`, () => art.drawTree(v)));

    // Ground textures: rebuilt when delivered art arrives.
    let texSig = '';
    function refreshGround() {
      const g = api.img('kart-grass'), r = api.img('kart-road'), s = api.img('kart-sky');
      const sig = `${!!g}${!!r}${!!s}`;
      if (sig === texSig || !ground) return;
      texSig = sig;
      const grass = g || once('grass-tile', art.drawGrassTile);
      const road = r || once('road-tile', art.drawRoadTile);
      const ga = averageColor(grass), ra = averageColor(road);
      const map = art.drawMap(track, W.scen, W.pads, 2048, ga.map(v => v * 255), ra.map(v => v * 255));
      ground.setMap(map, WORLD);
      ground.setDetail(grass, ga, road, ra);
      const sky = s || once('sky', art.drawSky);
      const top = (() => {
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        const x = c.getContext('2d');
        x.drawImage(sky, 0, 0, sky.width, 4, 0, 0, 1, 1);
        const d = x.getImageData(0, 0, 1, 1).data;
        return [d[0] / 255, d[1] / 255, d[2] / 255];
      })();
      ground.setSky(sky, top, [ga[0] * 0.55 + 0.4, ga[1] * 0.55 + 0.42, ga[2] * 0.55 + 0.45]);
    }
    const minimap = art.drawMinimap(track, 220);

    // --- state -------------------------------------------------------------
    let S = parseShared(api.shared());
    let raceNo = -1;
    let mine = null;                 // my kart while I'm racing
    let myBrain = { lane: 0, phase: Math.random() * 6, skill: 0.85, stuck: 0 };
    let rookieUntil = 0;             // a debug bot is driving me (rookie())
    let itemAt = 0;                  // when the autopilot uses its item
    const bots = [];                 // computer karts, simulated by the owner
    const remote = new Map();        // id -> drawn kart for everyone else
    const bananas = new Map();       // id -> { x, z, owner }
    const popped = new Set();
    const bombs = new Map();         // id -> { x, z, h, v, t, mine }
    const boxUntil = W.boxes.map(() => 0); // performance.now() ms when each box is back
    const parts = [], sparks = [], puffs = [], booms = [], floaters = [];
    let dropCount = 0;
    let lastSend = 0, sentSig = '';
    let ownerTick = 0;
    let shake = 0;
    let lastPlace = 0;
    let finishShown = false;
    let stats = { frames: 0, cpu: 0, worst: 0, intervals: [] };
    let counts = { explosions: 0, hits: 0, pickups: 0, bursts: 0 };
    const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const records = { lap: api.store.get('bestLap', 0), race: api.store.get('bestRace', 0), wins: api.store.get('wins', 0) };

    const now = () => performance.now();
    const raceTime = () => (S ? (Date.now() - S.go) / 1000 : -99);
    const racing = () => S && S.ph === 'count' && raceTime() >= 0;

    // --- layout ------------------------------------------------------------
    let w = 1, h = 1, dpr = 1, glScale = 1, inset = { top: 0, bottom: 0 };
    // Dynamic resolution: the ground starts at up to 1.5 pixels per CSS pixel
    // and steps down while frames run slow (an old phone, software WebGL).
    let glCap = 1.5, slowSince = 0;
    let cam = { x: 0, z: 0, y: CAM_H, yaw: 0, pitch: PITCH, f: 400, cx: 200, cy: 200 };
    let baseF = 400, camYaw = null;
    function resize() {
      const r = api.el.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      glScale = Math.min(glCap, dpr);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const gc = groundCanvas;
      gc.width = Math.round(w * glScale);
      gc.height = Math.round(h * glScale);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      baseF = Math.min(w * 1.05, h * 1.12);
      const pad = Math.max(12, inset.bottom + 12);
      driftBtn.style.left = '14px';
      driftBtn.style.bottom = pad + 'px';
      itemBtn.style.right = '14px';
      itemBtn.style.bottom = pad + 'px';
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // The camera behind a kart, and where things land on screen.
    function placeCamera(k, dt) {
      const vis = k.h + (k.drift ? k.drift * 0.32 : 0);
      if (camYaw == null) camYaw = vis;
      camYaw = wrapAngle(camYaw + wrapAngle(vis - camYaw) * (1 - Math.exp(-dt * 5.5)));
      const boosting = (k.boost > 0 || k.star > 0) ? 1 : 0;
      const f = baseF * (1 - 0.07 * boosting);
      cam.f += (f - cam.f) * (1 - Math.exp(-dt * 4));
      cam.yaw = camYaw;
      const camH = h > w * 1.2 ? CAM_H_TALL : CAM_H;
      cam.pitch = PITCH;
      cam.y = camH;
      cam.x = k.x - Math.cos(camYaw) * CAM_D;
      cam.z = k.z - Math.sin(camYaw) * CAM_D;
      // Put the kart about two thirds of the way down the space between the bars.
      const depth = CAM_D * Math.cos(PITCH) + camH * Math.sin(PITCH);
      const yc = CAM_D * Math.sin(PITCH) - camH * Math.cos(PITCH);
      const top = inset.top, bottom = h - inset.bottom;
      const target = top + (bottom - top) * (h > w ? 0.66 : 0.72);
      cam.cx = w / 2;
      cam.cy = target + (cam.f * yc) / depth;
      if (shake > 0 && !reduced) {
        cam.cx += (Math.random() - 0.5) * shake * 14;
        cam.cy += (Math.random() - 0.5) * shake * 10;
      }
    }
    function project(x, y, z) {
      const rx = x - cam.x, rz = z - cam.z;
      const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw);
      const lf = rx * fx + rz * fz, lx = rx * -fz + rz * fx, ly = y - cam.y;
      const sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
      const depth = lf * cp - ly * sp, yc = lf * sp + ly * cp;
      if (depth < 0.5) return null;
      return { x: cam.cx + (cam.f * lx) / depth, y: cam.cy - (cam.f * yc) / depth, depth, s: cam.f / depth };
    }

    // --- race flow ---------------------------------------------------------
    const members = () => api.players();
    function nameOf(id) {
      if (id.startsWith('ai')) return S?.ai[+id.slice(2)]?.[0] ?? 'Bot';
      return members().find(m => m.id === id)?.name || 'Racer';
    }
    function colorOf(id) {
      if (id.startsWith('ai')) return S?.ai[+id.slice(2)]?.[1] ?? '#ff8c42';
      const c = members().find(m => m.id === id)?.color;
      return /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#ff5fa2';
    }
    // Owner: a new race with whoever is here (and computer karts to fill in).
    function startRace() {
      if (!api.isOwner()) return api.send('again', {});
      const ids = members().map(m => m.id).slice(0, MAX_RACERS);
      const used = new Set(members().map(m => (m.color || '').toLowerCase()));
      const colors = BOT_COLORS.filter(c => !used.has(c.toLowerCase()));
      const nAi = ids.length >= 3 ? MAX_RACERS - ids.length : ids.length === 2 ? 2 : 3;
      const ai = Array.from({ length: nAi }, (_, i) => [BOT_NAMES[i], colors[i % colors.length] || BOT_COLORS[i]]);
      api.setShared({ ph: 'count', r: (S?.r ?? 0) + 1, go: Date.now() + COUNT_MS, racers: ids, ai, res: null, bn: [], bx: [] });
      S = parseShared(api.shared());
      syncRace();
    }
    // Everyone: when the race number changes, line up on the grid.
    function syncRace() {
      if (!S) return;
      if (S.r !== raceNo) {
        raceNo = S.r;
        bananas.clear();
        popped.clear();
        bombs.clear();
        boxUntil.fill(0);
        remote.clear();
        finishShown = false;
        lastPlace = 0;
        results.hidden = true;
        mine = null;
        bots.length = 0;
        camYaw = null;
      }
      const slot = S.racers.indexOf(myId);
      if (slot >= 0 && (!mine || (raceTime() < 0 && mine.slot !== slot))) {
        mine = newKart(gridSpot(track, slot), { slot });
        myBrain = { lane: (slot % 2 ? 1 : -1) * 2, phase: Math.random() * 6, skill: 0.85, stuck: 0 };
      }
      if (slot < 0) mine = null;
      if (api.isOwner()) {
        S.ai.forEach((a, i) => {
          const spot = S.racers.length + i;
          if (!bots[i] || (raceTime() < 0 && bots[i].slot !== spot)) {
            // Taking over mid-race: carry on from where the old owner had it.
            const was = remote.get('ai' + i);
            const kart = was && raceTime() > 0 && !was.stale
              ? newKart({ x: was.x, z: was.z, h: was.h, s: 0 }, { slot: spot, v: was.v, total: was.total, finished: was.finished })
              : newKart(gridSpot(track, spot), { slot: spot });
            if (was && raceTime() > 0) kart.s = ((was.total % track.length) + track.length) % track.length;
            bots[i] = {
              id: 'ai' + i, slot: spot, kart,
              brain: { lane: [-3, 2.5, 0][i % 3], phase: i * 2.1, skill: [0.55, 0.75, 0.9][i % 3], stuck: 0 },
              useAt: 0, speed: [0.9, 0.93, 0.96][i % 3],
            };
          }
        });
        bots.length = S.ai.length;
      }
      // Live banana peels and box timers for anyone who joined mid-race.
      for (const [id, x, z] of S.bn) if (!bananas.has(id) && !popped.has(id)) bananas.set(id, { x, z });
      S.bx.forEach((t, i) => {
        if (i < boxUntil.length && t > Date.now()) boxUntil[i] = Math.max(boxUntil[i], now() + (t - Date.now()));
      });
    }
    function ownerUpdate() {
      if (!api.isOwner()) return;
      if (!S) return startRace();
      const ps = members();
      const t = raceTime();
      if (S.ph === 'count' && t < -1.4) {
        // Joiners during the countdown still make the grid.
        const ids = ps.map(m => m.id).slice(0, MAX_RACERS);
        const keep = S.racers.filter(id => ids.includes(id));
        for (const id of ids) if (!keep.includes(id) && keep.length < MAX_RACERS) keep.push(id);
        if (keep.join() !== S.racers.join()) {
          const nAi = keep.length >= 3 ? MAX_RACERS - keep.length : keep.length === 2 ? 2 : 3;
          setShared({ racers: keep, ai: S.ai.slice(0, nAi) });
        }
        return;
      }
      if (S.ph !== 'count' || t < 0) return;
      const entries = allKarts().filter(k => k.racer);
      const present = entries.filter(k => k.bot || ps.some(m => m.id === k.id));
      const humans = present.filter(k => !k.bot);
      const first = Math.min(...present.map(k => k.finished || Infinity));
      const allIn = humans.every(k => k.finished > 0) && present.every(k => k.finished > 0 || k.bot);
      if (!humans.length || allIn || (Number.isFinite(first) && t > first + GRACE) || t > 600) {
        const order = standings(present.map(k => ({ ...k })));
        const res = order.map(k => [k.id, nameOf(k.id).slice(0, 24) || 'Racer', colorOf(k.id), Math.round((k.finished || 0) * 1000), Math.round((k.bestLap || 0) * 1000)]);
        setShared({ ph: 'done', res });
      }
    }
    function setShared(patch) {
      if (!api.isOwner() || !S) return;
      const next = { ...S, ...patch };
      api.setShared({ ph: next.ph, r: next.r, go: next.go, racers: next.racers, ai: next.ai, res: next.res, bn: next.bn, bx: next.bx });
      S = parseShared(api.shared());
    }

    // Every kart in the race, mine, computer and remote, in one shape:
    // { id, x, z, h, v, fl, total, finished, hop, local kart or null }.
    function allKarts() {
      const out = [];
      const flagsOf = k => (k.spin > 0 ? 1 : 0) | (k.boost > 0 ? 2 : 0) | (k.star > 0 ? 4 : 0) | (k.drift ? 8 : 0) | (k.drift > 0 ? 16 : 0) | (k.charge > 0.9 ? 32 : 0) | (k.charge > 1.9 ? 64 : 0);
      const best = k => (k.lapTimes.length ? Math.min(...k.lapTimes) : 0);
      if (mine) out.push({ id: myId, racer: true, me: true, x: mine.x, z: mine.z, h: mine.h, v: mine.v, fl: flagsOf(mine), total: mine.total, finished: mine.finished, hop: mine.hop, kart: mine, bestLap: best(mine), steer: mine.steer });
      if (api.isOwner()) {
        for (const b of bots) out.push({ id: b.id, racer: true, bot: true, x: b.kart.x, z: b.kart.z, h: b.kart.h, v: b.kart.v, fl: flagsOf(b.kart), total: b.kart.total, finished: b.kart.finished, hop: b.kart.hop, kart: b.kart, bestLap: best(b.kart), steer: b.kart.steer });
      }
      for (const [id, r] of remote) {
        if (r.stale) continue;
        if (api.isOwner() && id.startsWith('ai')) continue;
        out.push({ id, racer: true, bot: id.startsWith('ai'), x: r.x, z: r.z, h: r.h, v: r.v, fl: r.fl, total: r.total, finished: r.finished, hop: (r.fl & 1) ? 0.2 : 0, kart: null, bestLap: r.bl || 0, steer: 0 });
      }
      return out;
    }

    // Reads everyone else's published karts.
    function readRemote(dt) {
      if (!S) return;
      const ps = members();
      const seen = new Set();
      const take = (id, a, bl) => {
        const k = unpackKart(a);
        if (!k) return;
        seen.add(id);
        let r = remote.get(id);
        const sig = a.join(',');
        if (!r) {
          r = { ...k, tx: k.x, tz: k.z, th: k.h, at: now(), sig, bl: 0 };
          remote.set(id, r);
        } else if (sig !== r.sig) {
          r.tx = k.x; r.tz = k.z; r.th = k.h; r.v = k.v; r.at = now(); r.sig = sig;
          if ((k.fl & 1) && !(r.fl & 1)) burst(r, colorOf(id), 7);
          r.fl = k.fl; r.total = k.total; r.finished = k.finished;
        }
        r.bl = Number.isFinite(bl) ? clamp(bl, 0, 3600000) / 1000 : 0;
        r.stale = false;
      };
      for (const m of ps) {
        if (m.me || !S.racers.includes(m.id) && !(m.state?.ai)) continue;
        const st = m.state || {};
        if (st.r !== S.r) continue;
        if (S.racers.includes(m.id) && st.k) take(m.id, st.k, st.bl);
        // The owner's computer karts.
        if (m.id === api.owner() && !api.isOwner() && Array.isArray(st.ai)) {
          st.ai.slice(0, 3).forEach((a, i) => take('ai' + i, a, 0));
        }
      }
      for (const [id, r] of remote) {
        if (!seen.has(id)) { r.stale = true; continue; }
        // Extrapolate from the last sample and ease toward it.
        const age = Math.min(0.3, (now() - r.at) / 1000);
        const px = r.tx + Math.cos(r.th) * r.v * age, pz = r.tz + Math.sin(r.th) * r.v * age;
        const e = 1 - Math.exp(-dt * 12);
        if (Math.hypot(px - r.x, pz - r.z) > 15) { r.x = px; r.z = pz; r.h = r.th; }
        r.x += (px - r.x) * e;
        r.z += (pz - r.z) * e;
        r.h = wrapAngle(r.h + wrapAngle(r.th - r.h) * e);
      }
    }

    function publish() {
      if (!S) return;
      const t = now();
      if (t - lastSend < SEND_MS) return;
      const st = { r: S.r };
      if (mine) {
        st.k = packKart(mine);
        st.bl = mine.lapTimes.length ? Math.round(Math.min(...mine.lapTimes) * 1000) : 0;
      }
      if (api.isOwner() && bots.length) st.ai = bots.map(b => packKart(b.kart));
      const sig = JSON.stringify(st);
      if (sig === sentSig && t - lastSend < 1000) return;
      sentSig = sig;
      lastSend = t;
      api.setState(st);
    }

    // --- effects -----------------------------------------------------------
    const near = (x, z) => Math.hypot(x - cam.x, z - cam.z) < 70;
    function sfx(name, x, z) {
      if (x == null || near(x, z)) api.sfx(name);
    }
    // Kart parts flying off: wheels, bolts, panels...
    function burst(k, color, n) {
      counts.bursts++;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 6;
        parts.push({
          x: k.x, y: 0.8 + Math.random() * 0.6, z: k.z,
          vx: Math.cos(a) * sp + Math.cos(k.h) * (k.v || 0) * 0.4, vz: Math.sin(a) * sp + Math.sin(k.h) * (k.v || 0) * 0.4, vy: 6 + Math.random() * 7,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 18, type: i % 6, color, life: 0, max: 1.6 + Math.random() * 0.8,
          size: [0.55, 0.3, 0.7, 0.8, 0.4, 0.55][i % 6],
        });
      }
      if (parts.length > 160) parts.splice(0, parts.length - 160);
    }
    function spinOut(k, kind, id) {
      if (!k || k.star > 0 || k.spin > 0) return false;
      k.spin = SPIN_TIME + (kind === 'bomb' ? 0.35 : 0);
      k.drift = 0;
      k.charge = 0;
      k.boost = 0;
      if (kind === 'bomb') { k.hopV = 9; k.v *= 0.4; }
      counts.hits++;
      burst(k, colorOf(id), kind === 'bomb' ? 10 : 6);
      if (k === mine) {
        shake = kind === 'bomb' ? 0.6 : 0.35;
        api.sfx(kind === 'bomb' ? 'bang' : 'miss');
        floaters.push({ text: kind === 'banana' ? 'Slipped!' : kind === 'bomb' ? 'Kaboom!' : 'Bonk!', t: 0, color: '#fff' });
      } else {
        sfx('bounce', k.x, k.z);
      }
      return true;
    }
    function explode(id, x, z) {
      if (!bombs.has(id) && popped.has(id)) return;
      bombs.delete(id);
      popped.add(id);
      counts.explosions++;
      booms.push({ x, z, t: 0 });
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
        puffs.push({ x, z, y: 0.5 + Math.random(), vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 2 + Math.random() * 4, t: 0, max: 0.8 + Math.random() * 0.6, r: 0.8 + Math.random() * 1.2 });
      }
      sfx('bang', x, z);
      if (Math.hypot(x - cam.x, z - cam.z) < 25) shake = Math.max(shake, 0.45);
      // Only karts simulated here are knocked; the others see them spin through their state.
      if (mine && Math.hypot(mine.x - x, mine.z - z) < BOMB_R) spinOut(mine, 'bomb', myId);
      if (api.isOwner()) for (const b of bots) if (Math.hypot(b.kart.x - x, b.kart.z - z) < BOMB_R) spinOut(b.kart, 'bomb', b.id);
    }

    // --- items -------------------------------------------------------------
    function rankOf(id) {
      const order = standings(allKarts().filter(k => k.racer));
      return { rank: Math.max(0, order.findIndex(k => k.id === id)), count: order.length };
    }
    function takeBoxes(k, id) {
      if (k.spin > 0) return;
      W.boxes.forEach((b, i) => {
        if (now() < boxUntil[i]) return;
        if (Math.hypot(k.x - b.x, k.z - b.z) > 2.5) return;
        boxUntil[i] = now() + 3000;
        api.send('box', { r: S.r, i });
        if (api.isOwner()) noteBox(i);
        if (k === mine) { sfx('pop'); counts.pickups++; }
        if (!k.item) {
          const { rank, count } = rankOf(id);
          k.item = rollItem(rank, count);
          k.roll = 0.9;
        }
      });
    }
    function noteBox(i) {
      if (!S) return;
      const bx = S.bx.slice();
      while (bx.length < W.boxes.length) bx.push(0);
      bx[i] = Date.now() + 3000;
      setShared({ bx });
    }
    function useItem(k, id) {
      if (!k || !k.item || k.roll > 0 || k.spin > 0 || !racing()) return false;
      const item = k.item;
      k.item = null;
      const fx = Math.cos(k.h), fz = Math.sin(k.h);
      if (item === 'boost') {
        k.boost = BOOST_TIME * 1.3;
        sfx('whoosh', k.x, k.z);
      } else if (item === 'star') {
        k.star = STAR_TIME;
        sfx('zap', k.x, k.z);
      } else if (item === 'banana') {
        const bid = `${id}.${S.r}.${dropCount++}`;
        const b = { x: k.x - fx * 2.8, z: k.z - fz * 2.8 };
        bananas.set(bid, b);
        api.send('drop', { r: S.r, id: bid, x: b.x, z: b.z });
        if (api.isOwner()) setShared({ bn: [...S.bn, [bid, b.x, b.z]].slice(-24) });
        sfx('click', k.x, k.z);
      } else if (item === 'bomb') {
        const bid = `${id}.${S.r}.${dropCount++}`;
        const b = { x: k.x + fx * 2.4, z: k.z + fz * 2.4, h: k.h, v: Math.max(0, k.v) + 22 };
        bombs.set(bid, { ...b, t: 0, by: id });
        api.send('bomb', { r: S.r, id: bid, ...b });
        sfx('fire', k.x, k.z);
      }
      return true;
    }
    function popBanana(id) {
      bananas.delete(id);
      popped.add(id);
      api.send('pop', { r: S.r, id });
      if (api.isOwner()) setShared({ bn: S.bn.filter(b => b[0] !== id) });
    }

    // Messages: checked, and only for the current race.
    const okId = v => typeof v === 'string' && v.length > 0 && v.length <= 80;
    const okXZ = (x, z) => Number.isFinite(x) && Number.isFinite(z) && x > -20 && x < 300 && z > -20 && z < 300;
    const thisRace = d => d && typeof d === 'object' && S && d.r === S.r;
    api.on('box', (d, from) => {
      if (from === myId || !thisRace(d) || !Number.isInteger(d.i) || d.i < 0 || d.i >= W.boxes.length) return;
      boxUntil[d.i] = now() + 3000;
      if (api.isOwner()) noteBox(d.i);
    });
    api.on('drop', (d, from) => {
      if (from === myId || !thisRace(d) || !okId(d.id) || !okXZ(d.x, d.z) || popped.has(d.id)) return;
      if (bananas.size > 30) return;
      bananas.set(d.id, { x: d.x, z: d.z });
      if (api.isOwner()) setShared({ bn: [...S.bn, [d.id, d.x, d.z]].slice(-24) });
    });
    api.on('pop', (d, from) => {
      if (from === myId || !thisRace(d) || !okId(d.id)) return;
      bananas.delete(d.id);
      popped.add(d.id);
      if (api.isOwner()) setShared({ bn: S.bn.filter(b => b[0] !== d.id) });
    });
    api.on('bomb', (d, from) => {
      if (from === myId || !thisRace(d) || !okId(d.id) || !okXZ(d.x, d.z) || !Number.isFinite(d.h) || !Number.isFinite(d.v) || bombs.size > 12 || popped.has(d.id)) return;
      bombs.set(d.id, { x: d.x, z: d.z, h: d.h, v: clamp(d.v, 0, 70), t: 0, by: from });
    });
    api.on('boom', (d, from) => {
      if (from === myId || !thisRace(d) || !okId(d.id) || !okXZ(d.x, d.z)) return;
      explode(d.id, d.x, d.z);
    });
    api.on('hit', (d, from) => {
      if (!thisRace(d) || !okId(d.t)) return;
      const kind = ['banana', 'bomb', 'star'].includes(d.kind) ? d.kind : 'star';
      if (d.t === myId) spinOut(mine, kind, myId);
      else if (api.isOwner()) {
        const b = bots.find(x => x.id === d.t);
        if (b) spinOut(b.kart, kind, b.id);
      }
    });
    api.on('again', (d, from) => {
      if (api.isOwner() && S && S.ph === 'done') startRace();
    });

    // --- input -------------------------------------------------------------
    const keys = new Set();
    const pointers = new Map();
    let driftHeld = false, padIn = { steer: 0, drift: false, brake: false };
    let useQueued = false;
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const k = e.code;
      const game = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyX', 'KeyC', 'KeyZ', 'Enter', 'KeyE'];
      if (!game.includes(k)) return;
      if (S?.ph === 'done' && (k === 'Space' || k === 'Enter')) return; // let the Play again button take it
      e.preventDefault();
      if (e.type === 'keydown') {
        if (!e.repeat && (k === 'Space' || k === 'Enter' || k === 'KeyE')) useQueued = true;
        keys.add(k);
      } else keys.delete(k);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    const blur = () => { keys.clear(); pointers.clear(); driftHeld = false; driftBtn.classList.remove('on'); };
    window.addEventListener('blur', blur);

    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, e.offsetX);
    });
    canvas.addEventListener('pointermove', e => { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e.offsetX); });
    const lift = e => pointers.delete(e.pointerId);
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    const driftOn = e => { e.preventDefault(); driftHeld = true; driftBtn.classList.add('on'); driftBtn.setPointerCapture?.(e.pointerId); };
    const driftOff = () => { driftHeld = false; driftBtn.classList.remove('on'); };
    driftBtn.addEventListener('pointerdown', driftOn);
    driftBtn.addEventListener('pointerup', driftOff);
    driftBtn.addEventListener('pointercancel', driftOff);
    driftBtn.addEventListener('click', e => e.preventDefault());
    itemBtn.addEventListener('pointerdown', e => { e.preventDefault(); useQueued = true; });
    itemBtn.addEventListener('click', e => { if (e.detail === 0) useQueued = true; }); // keyboard / controller focus

    function humanInput() {
      let steer = 0;
      if (Math.abs(padIn.steer) > 0.12) steer = padIn.steer;
      else if (keys.has('ArrowLeft') || keys.has('KeyA') || keys.has('ArrowRight') || keys.has('KeyD')) {
        steer = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      } else if (pointers.size) {
        let sum = 0;
        for (const x of pointers.values()) sum += clamp((x - w / 2) / (w * 0.3), -1, 1);
        steer = sum / pointers.size;
        if (Math.abs(steer) < 0.08) steer = 0;
      }
      // Two fingers, one on each side: brake (and back up when stopped).
      let left = false, right = false;
      for (const x of pointers.values()) { if (x < w * 0.4) left = true; if (x > w * 0.6) right = true; }
      const touchBrake = left && right;
      if (touchBrake) steer = 0;
      const drift = driftHeld || padIn.drift || keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyX') || keys.has('KeyC') || keys.has('KeyZ');
      const brake = touchBrake || padIn.brake || keys.has('ArrowDown') || keys.has('KeyS');
      return { steer, drift, brake };
    }

    // --- simulation --------------------------------------------------------
    const env = (scale = 1) => ({ track, obstacles: W.obstacles, pads: W.pads, raceTime: raceTime(), speedScale: scale });
    function handleEvents(ev, k, id) {
      for (const e of ev) {
        if (k !== mine) continue;
        if (e === 'bump') { api.sfx('bounce'); shake = Math.max(shake, 0.2); }
        else if (e === 'mini' || e === 'super') { api.sfx('whoosh'); floaters.push({ text: e === 'super' ? 'Super boost!' : 'Boost!', t: 0, color: e === 'super' ? '#ff9f43' : '#74c0fc' }); }
        else if (e === 'pad') api.sfx('whoosh');
        else if (e === 'lap') {
          const lap = lapOf(k.total, track.length).lap;
          api.sfx('score');
          floaters.push({ text: lap === LAPS ? 'Final lap!' : `Lap ${lap}`, t: 0, color: '#ffd43b', big: true });
          noteLap(k);
        } else if (e === 'finish') {
          noteLap(k);
          const place = rankOf(myId).rank + 1;
          lastPlace = place;
          api.sfx(place === 1 ? 'win' : 'score');
          floaters.push({ text: `Finish! ${ORD(place)}`, t: 0, color: place === 1 ? '#ffd43b' : '#fff', big: true });
          if (!records.race || k.finished < records.race) { records.race = k.finished; api.store.set('bestRace', k.finished); }
          if (place === 1 && rankOf(myId).count > 1) { records.wins++; api.store.set('wins', records.wins); }
        }
      }
    }
    function noteLap(k) {
      const t = k.lapTimes[k.lapTimes.length - 1];
      if (t > 5 && (!records.lap || t < records.lap)) {
        records.lap = t;
        api.store.set('bestLap', t);
        floaters.push({ text: `Best lap ${fmt(t)}!`, t: -0.6, color: '#63e6be' });
      }
    }
    function driveLocal(k, id, inp, scale, dt) {
      const ev = stepKart(k, inp, dt, env(scale));
      handleEvents(ev, k, id);
      if (k.roll > 0) k.roll = Math.max(0, k.roll - dt);
      // Bump other karts (each moves only itself).
      for (const o of allKarts()) {
        if (o.id === id || o.kart === k) continue;
        if (bumpKarts(k, o)) {
          if (k.star > 0 && !(o.fl & 4)) starHit(o);
          else if (k === mine && Math.random() < 0.05) api.sfx('bounce');
        }
      }
      // Banana peels.
      if (k.spin <= 0 && k.star <= 0) {
        for (const [bid, b] of bananas) {
          if (Math.hypot(k.x - b.x, k.z - b.z) < BANANA_R + 0.5) {
            popBanana(bid);
            spinOut(k, 'banana', id);
            break;
          }
        }
      } else if (k.star > 0) {
        for (const [bid, b] of bananas) if (Math.hypot(k.x - b.x, k.z - b.z) < BANANA_R + 0.5) popBanana(bid);
      }
      takeBoxes(k, id);
    }
    const lastRam = new Map();
    function starHit(o) {
      if ((lastRam.get(o.id) || 0) > now() - 1500) return;
      lastRam.set(o.id, now());
      if (o.kart) spinOut(o.kart, 'star', o.id);
      else if (o.bot) api.sendTo(api.owner(), 'hit', { r: S.r, t: o.id, kind: 'star' });
      else api.sendTo(o.id, 'hit', { r: S.r, t: o.id, kind: 'star' });
      sfx('bang', o.x, o.z);
    }
    function simStep(dt) {
      const t = raceTime();
      const go = racing();
      if (mine) {
        if (go) {
          const auto = now() < rookieUntil || mine.finished > 0 || S.ph === 'done';
          let inp;
          if (auto) {
            watchStuck(myBrain, mine, dt);
            inp = autopilot(mine, track, myBrain, t);
            // The autopilot uses items after a moment.
            if (mine.item && !mine.roll) {
              if (!itemAt) itemAt = now() + 600 + Math.random() * 2200;
              if (now() > itemAt) { useItem(mine, myId); itemAt = 0; }
            }
          } else {
            inp = humanInput();
          }
          driveLocal(mine, myId, inp, 1, dt);
          if (mine.drift && Math.random() < 0.5) sparkAt(mine);
        }
        if (useQueued && !(now() < rookieUntil)) useItem(mine, myId);
      }
      useQueued = false;
      if (api.isOwner() && go) {
        const lead = Math.max(...allKarts().filter(k => !k.bot).map(k => k.total), -1e9);
        for (const b of bots) {
          watchStuck(b.brain, b.kart, dt);
          const inp = autopilot(b.kart, track, b.brain, t);
          // Rubber band a little toward the human leader.
          const gap = lead - b.kart.total;
          const scale = clamp(b.speed + gap * 0.0008, 0.84, 1.0);
          driveLocal(b.kart, b.id, inp, scale, dt);
          if (b.kart.item && !b.kart.roll) {
            if (!b.useAt) b.useAt = now() + 900 + Math.random() * 3500;
            if (now() > b.useAt) { useItem(b.kart, b.id); b.useAt = 0; }
          }
          if (b.kart.drift && Math.random() < 0.5) sparkAt(b.kart);
        }
      }
      // Bombs in flight.
      for (const [id, b] of bombs) {
        b.t += dt;
        const p = bombAt(b, b.t);
        if (p.done) { explode(id, p.x, p.z); continue; }
        // The thrower sets it off early on touching a kart.
        if (b.by === myId || (api.isOwner() && b.by.startsWith('ai'))) {
          if (b.t > 0.15 && allKarts().some(k => k.id !== b.by && Math.hypot(k.x - p.x, k.z - p.z) < 2.4)) {
            api.send('boom', { r: S.r, id, x: p.x, z: p.z });
            explode(id, p.x, p.z);
          }
        }
      }
    }
    function sparkAt(k) {
      const fx = Math.cos(k.h), fz = Math.sin(k.h);
      const col = k.charge > 1.9 ? '#ff9f43' : k.charge > 0.9 ? '#74c0fc' : '#ffe066';
      for (const side of [-1, 1]) {
        sparks.push({ x: k.x - fx * 1.0 - fz * side * 0.9, z: k.z - fz * 1.0 + fx * side * 0.9, y: 0.15, vx: -fx * 3 + (Math.random() - 0.5) * 3, vz: -fz * 3 + (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, t: 0, max: 0.25 + Math.random() * 0.15, col });
      }
      if (sparks.length > 200) sparks.splice(0, sparks.length - 200);
    }
    function updateParticles(dt) {
      for (const p of parts) {
        p.life += dt;
        p.vy -= 22 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.rot += p.vr * dt;
        if (p.y < 0.15) { p.y = 0.15; p.vy = Math.abs(p.vy) * 0.42; p.vx *= 0.7; p.vz *= 0.7; p.vr *= 0.7; }
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life > parts[i].max) parts.splice(i, 1);
      for (const s of sparks) { s.t += dt; s.vy -= 14 * dt; s.x += s.vx * dt; s.y = Math.max(0.05, s.y + s.vy * dt); s.z += s.vz * dt; }
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t > sparks[i].max) sparks.splice(i, 1);
      for (const p of puffs) { p.t += dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vz *= 0.94; p.vy *= 0.96; }
      for (let i = puffs.length - 1; i >= 0; i--) if (puffs[i].t > puffs[i].max) puffs.splice(i, 1);
      for (const b of booms) b.t += dt;
      for (let i = booms.length - 1; i >= 0; i--) if (booms[i].t > 0.7) booms.splice(i, 1);
      for (const f of floaters) f.t += dt;
      for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].t > 1.6) floaters.splice(i, 1);
      shake = Math.max(0, shake - dt * 1.6);
    }

    // --- drawing -----------------------------------------------------------
    // A driver's head: their live face in a helmet of their colour.
    const botFaces = new Map();
    function botFace(color) {
      if (!botFaces.has(color)) {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        g.fillStyle = '#ffe0bd';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#2a2433';
        g.fillRect(14, 24, 36, 12);
        g.fillStyle = '#7df9ff';
        g.fillRect(18, 27, 10, 6);
        g.fillRect(36, 27, 10, 6);
        g.strokeStyle = '#a0522d';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(32, 40, 10, 0.2, Math.PI - 0.2);
        g.stroke();
        botFaces.set(color, c);
      }
      return botFaces.get(color);
    }
    function drawHead(id, x, y, r, color) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.clip();
      let drew = false;
      if (id.startsWith('ai')) {
        ctx.drawImage(botFace(color), x - r, y - r, r * 2, r * 2);
        drew = true;
      } else {
        const media = api.mediaOf?.(id);
        const sw = media?.videoWidth || media?.width || 0, sh = media?.videoHeight || media?.height || 0;
        if (sw && sh && (media.readyState === undefined || media.readyState >= 2)) {
          const k = Math.max((r * 2) / sw, (r * 2) / sh) * 1.25; // zoom in on the face a little
          try { ctx.drawImage(media, x - (sw * k) / 2, y - (sh * k) / 2 + r * 0.1, sw * k, sh * k); drew = true; } catch { /* not ready */ }
        }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${Math.round(r * 1.1)}px ui-rounded, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((nameOf(id)[0] || '?').toUpperCase(), x, y + r * 0.05);
      }
      // A see-through wash of their colour.
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = color;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
      // Helmet: a band over the top and a rim.
      ctx.lineWidth = Math.max(2, r * 0.22);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.06, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = Math.max(3, r * 0.42);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.18, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.22, Math.PI * 1.3, Math.PI * 1.55);
      ctx.stroke();
    }

    function drawKartAt(k, p) {
      const color = colorOf(k.id);
      const star = k.fl & 4;
      const tintCol = star ? RAINBOW[Math.floor(now() / 70) % RAINBOW.length] : color;
      let turn = 0;
      if (k.fl & 1) {
        turn = [0, 1, 0, -1][Math.floor(now() / 90) % 4];
      } else if (k.fl & 8) {
        turn = k.fl & 16 ? 1 : -1;
      } else if (k.me || k.kart) {
        turn = Math.abs(k.steer) > 0.35 ? Math.sign(k.steer) : 0;
      } else {
        const bearing = Math.atan2(k.z - cam.z, k.x - cam.x);
        const rel = wrapAngle(k.h - bearing);
        turn = rel > 0.3 ? 1 : rel < -0.3 ? -1 : 0;
      }
      const img = kartSprite(tintCol, turn);
      const sw = art.KART_SPAN * p.s, sh = (sw * img.height) / img.width;
      const lift = (k.hop || 0) * p.s;
      const x0 = p.x - sw / 2, y0 = p.y - sh * art.KART_GROUND - lift;
      ctx.save();
      // A kart between the camera and mine is see-through, so mine stays visible.
      if (!k.me && mine && p.depth < CAM_D - 1.2) ctx.globalAlpha = 0.45;
      if (k.fl & 1) {
        ctx.translate(p.x, p.y - sh * 0.4 - lift);
        ctx.rotate(Math.sin(now() / 60) * 0.25);
        ctx.translate(-p.x, -(p.y - sh * 0.4 - lift));
      }
      // Boost flames from the exhausts.
      if (k.fl & 2 || star) {
        for (const ex of [0.36, 0.64]) {
          const fx = x0 + sw * ex, fy = y0 + sh * 0.8;
          const len = sh * (0.18 + Math.random() * 0.12);
          const g = ctx.createLinearGradient(fx, fy, fx, fy + len);
          g.addColorStop(0, '#fff6b0');
          g.addColorStop(0.5, '#ff9f1a');
          g.addColorStop(1, 'rgba(255,60,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(fx - sw * 0.05, fy);
          ctx.lineTo(fx, fy + len);
          ctx.lineTo(fx + sw * 0.05, fy);
          ctx.fill();
        }
      }
      ctx.drawImage(img, x0, y0, sw, sh);
      const head = art.KART_HEAD[turn < 0 ? 'left' : turn > 0 ? 'right' : 'back'];
      drawHead(k.id, x0 + sw * head[0], y0 + sh * head[1] - Math.abs(Math.sin(now() / 140)) * sh * 0.008 * Math.min(1, k.v / 10), sw * art.KART_HEAD.r, color);
      ctx.restore();
      if (star) {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) {
          const a = now() / 200 + i * 1.6;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now() / 90 + i);
          ctx.fillRect(p.x + Math.cos(a) * sw * 0.55, y0 + sh * 0.5 + Math.sin(a) * sh * 0.4, 4, 4);
        }
        ctx.globalAlpha = 1;
      }
      // Name tag over other karts.
      if (!k.me && p.depth < 45) {
        ctx.font = '800 12px ui-rounded, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        const ty = y0 + sh * head[1] - sw * art.KART_HEAD.r * 1.6;
        ctx.strokeText(nameOf(k.id), p.x, ty);
        ctx.fillStyle = color;
        ctx.fillText(nameOf(k.id), p.x, ty);
      }
    }

    // Draws an image standing on the ground at (x, z), widthM metres wide.
    function billboard(img, p, widthM, groundFrac = 0.95, lift = 0, alpha = 1, squeeze = 1) {
      const sw = widthM * p.s, sh = (sw * img.height) / img.width;
      if (sw < 1.5) return;
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.drawImage(img, p.x - (sw * squeeze) / 2, p.y - sh * groundFrac - lift * p.s, sw * squeeze, sh);
      if (alpha < 1) ctx.globalAlpha = 1;
    }
    const fogAlpha = d => 1 - 0.7 * clamp((d - 90) / 120, 0, 1);

    function drawGantry(list) {
      const a = pointAt(track, 0, -track.half - 1.2), b = pointAt(track, 0, track.half + 1.2);
      const al = project(a.x, 0, a.z), ar = project(b.x, 0, b.z), tl = project(a.x, 6.6, a.z), tr = project(b.x, 6.6, b.z), ml = project(a.x, 5.3, a.z);
      if (!al || !ar || !tl || !tr || !ml) return;
      list.push({ depth: (al.depth + ar.depth) / 2 + 0.01, draw() {
        ctx.lineCap = 'round';
        for (const [g, t] of [[al, tl], [ar, tr]]) {
          ctx.strokeStyle = '#3a2a5a';
          ctx.lineWidth = Math.max(2, 0.45 * g.s);
          ctx.beginPath();
          ctx.moveTo(g.x, g.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
        const banner = once('banner', () => {
          const c = document.createElement('canvas');
          c.width = 512; c.height = 96;
          const g = c.getContext('2d');
          g.fillStyle = '#2b1a4a';
          g.fillRect(0, 0, 512, 96);
          for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) {
            g.fillStyle = (i + j) % 2 ? '#fff' : '#111';
            g.fillRect(i * 16, j * 8, 16, 8);
            g.fillRect(i * 16, 80 + j * 8, 16, 8);
          }
          g.font = '900 52px ui-rounded, system-ui, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#ffd43b';
          g.fillText('KART DASH', 256, 50);
          return c;
        });
        // An affine fit of the banner between the posts.
        ctx.save();
        ctx.transform((tr.x - tl.x) / 512, (tr.y - tl.y) / 512, (ml.x - tl.x) / 96, (ml.y - tl.y) / 96, tl.x, tl.y);
        ctx.drawImage(banner, 0, 0);
        ctx.restore();
      } });
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const list = [];
      const cap = Math.min(w, h) * 0.13; // the most a particle may cover, near the lens
      const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw);
      const inView = (x, z, far) => {
        const rx = x - cam.x, rz = z - cam.z, lf = rx * fx + rz * fz;
        return lf > 0.5 && lf < far && Math.abs(rx * -fz + rz * fx) < lf * (w / cam.f) * 0.6 + 6;
      };
      // Scenery.
      W.scen.trees.forEach((t, i) => {
        if (!inView(t.x, t.z, 200)) return;
        const p = project(t.x, 0, t.z);
        if (p) list.push({ depth: p.depth, draw: () => billboard(trees[i % 3](), p, 5.2 * t.k, 0.96, 0, fogAlpha(p.depth)) });
      });
      for (const t of W.scen.tyres) {
        if (!inView(t.x, t.z, 160)) continue;
        const p = project(t.x, 0, t.z);
        if (p) list.push({ depth: p.depth, draw: () => billboard(pic('kart-tyres', art.drawTyres), p, 2.4, 0.94, 0, fogAlpha(p.depth)) });
      }
      // Item boxes, spinning and bobbing.
      const tnow = now();
      W.boxes.forEach((b, i) => {
        if (tnow < boxUntil[i] || !inView(b.x, b.z, 160)) return;
        const bob = 0.9 + Math.sin(tnow / 300 + i) * 0.18;
        const p = project(b.x, 0, b.z);
        if (p) list.push({ depth: p.depth, draw: () => {
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 0.7 * p.s, 0.18 * p.s, 0, 0, Math.PI * 2);
          ctx.fill();
          billboard(pic('kart-itembox', art.drawItemBox), p, 1.6, 0.5, bob, 1, 0.75 + 0.25 * Math.abs(Math.cos(tnow / 500 + i)));
        } });
      });
      for (const [, b] of bananas) {
        if (!inView(b.x, b.z, 140)) continue;
        const p = project(b.x, 0, b.z);
        if (p) list.push({ depth: p.depth, draw: () => billboard(pic('kart-banana', art.drawBanana), p, 1.3, 0.9) });
      }
      for (const [, b] of bombs) {
        const q = bombAt(b, b.t);
        if (!inView(q.x, q.z, 160)) continue;
        const p = project(q.x, 0, q.z);
        if (p) list.push({ depth: p.depth, draw: () => {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 0.6 * p.s, 0.15 * p.s, 0, 0, Math.PI * 2);
          ctx.fill();
          const flash = b.t > BOMB_FUSE - 0.5 && Math.floor(b.t * 14) % 2;
          billboard(pic('kart-bomb', art.drawBomb), p, 1.4, 0.9, q.y - 0.6, flash ? 0.6 : 1);
        } });
      }
      // Karts.
      for (const k of allKarts()) {
        if (!inView(k.x, k.z, 220)) continue;
        const p = project(k.x, 0, k.z);
        if (p) list.push({ depth: p.depth, draw: () => drawKartAt(k, p) });
      }
      drawGantry(list);
      // Flying parts, sparks, smoke.
      for (const q of parts) {
        const p = project(q.x, q.y, q.z);
        if (!p || p.depth < 1.5) continue;
        list.push({ depth: p.depth - 0.01, draw: () => {
          const sheet = partsSheet(q.color);
          const cw = sheet.width / 3, chh = sheet.height / 2;
          const size = Math.min(q.size * p.s * 1.3, cap * 0.7);
          if (size < 1) return;
          ctx.save();
          ctx.globalAlpha = clamp((q.max - q.life) / 0.5, 0, 1);
          ctx.translate(p.x, p.y);
          ctx.rotate(q.rot);
          ctx.drawImage(sheet, (q.type % 3) * cw, Math.floor(q.type / 3) * chh, cw, chh, -size / 2, -size / 2, size, size);
          ctx.restore();
        } });
      }
      for (const q of puffs) {
        const p = project(q.x, q.y, q.z);
        if (!p || p.depth < 2.5) continue;
        list.push({ depth: p.depth, draw: () => {
          const f = q.t / q.max;
          ctx.globalAlpha = 0.75 * (1 - f);
          ctx.fillStyle = f < 0.25 ? '#ffb347' : '#6b6478';
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.min(q.r * (1 + f * 1.5) * p.s, cap), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } });
      }
      for (const b of booms) {
        const p = project(b.x, 1.2, b.z);
        if (!p) continue;
        list.push({ depth: p.depth - 0.5, draw: () => {
          const f = b.t / 0.7;
          const r = Math.min((1.5 + f * BOMB_R * 0.8) * p.s, cap * 3.5);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, `rgba(255,255,220,${1 - f})`);
          g.addColorStop(0.4, `rgba(255,190,60,${0.9 * (1 - f)})`);
          g.addColorStop(1, 'rgba(255,80,20,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        } });
      }
      list.sort((a, b) => b.depth - a.depth);
      for (const e of list) e.draw();
      // Sparks: short bright streaks along their flight.
      ctx.lineCap = 'round';
      for (const s of sparks) {
        const p = project(s.x, s.y, s.z), q = project(s.x - s.vx * 0.03, s.y - s.vy * 0.03, s.z - s.vz * 0.03);
        if (!p || !q) continue;
        ctx.globalAlpha = 1 - s.t / s.max;
        ctx.strokeStyle = s.col;
        ctx.lineWidth = clamp(0.06 * p.s, 1.5, 4);
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      drawHud();
    }

    function hudText(text, x, y, size, color = '#fff', align = 'left', weight = 900) {
      ctx.font = `${weight} ${size}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(30,16,50,0.75)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }
    function drawItemIcon(g, item, size) {
      const map = { boost: ['kart-boost', art.drawBoost], banana: ['kart-banana', art.drawBanana], bomb: ['kart-bomb', art.drawBomb], star: ['kart-star', art.drawStar] };
      const [name, fn] = map[item];
      g.drawImage(pic(name, fn), 0, 0, size, size);
    }
    let iconSig = '';
    function drawHud() {
      const top = inset.top + 10;
      const t = raceTime();
      const target = mine;
      // Speed lines while boosting.
      if (target && (target.boost > 0 || target.star > 0) && racing()) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2, r0 = Math.min(w, h) * (0.42 + Math.random() * 0.1);
          ctx.beginPath();
          ctx.moveTo(w / 2 + Math.cos(a) * r0, h * 0.55 + Math.sin(a) * r0);
          ctx.lineTo(w / 2 + Math.cos(a) * r0 * 1.4, h * 0.55 + Math.sin(a) * r0 * 1.4);
          ctx.stroke();
        }
      }
      const big = Math.round(clamp(Math.min(w, h) * 0.11, 30, 54));
      if (S && mine) {
        const { rank, count } = rankOf(myId);
        const place = mine.finished && lastPlace ? lastPlace : rank + 1;
        const pc = ['#ffd43b', '#e9ecef', '#ffa94d', '#a5d8ff'][place - 1] || '#fff';
        hudText(ORD(place), 14, top + big, big, pc);
        hudText(`of ${count}`, 16, top + big + 18, 14, '#fff', 'left', 800);
        const lap = Math.min(LAPS, lapOf(Math.max(0, mine.total), track.length).lap);
        hudText(`LAP ${lap}/${LAPS}`, w - 14, top + 26, 24, '#fff', 'right');
        hudText(fmt(mine.finished || Math.max(0, t)), w - 14, top + 46, 15, '#d8ccff', 'right', 800);
      } else if (S && S.ph !== 'done') {
        hudText('Watching', 14, top + 28, 24, '#fff');
        hudText('You race in the next one', 14, top + 48, 14, '#d8ccff', 'left', 800);
      }
      // Minimap.
      const ms = Math.round(clamp(Math.min(w, h) * 0.26, 80, 130));
      const mx = w - ms - 10, my = top + 56;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(minimap, mx, my, ms, ms);
      ctx.globalAlpha = 1;
      const k2 = ms / WORLD;
      for (const k of allKarts()) {
        ctx.fillStyle = colorOf(k.id);
        ctx.strokeStyle = k.me ? '#fff' : 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx + k.x * k2, my + k.z * k2, k.me ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Item: drawn into the item button.
      const it = mine?.item;
      const shown = mine && it ? (mine.roll > 0 ? ITEMS[Math.floor(now() / 80) % ITEMS.length] : it) : '';
      if (shown !== iconSig) {
        iconSig = shown;
        const g = itemIcon.getContext('2d');
        g.clearRect(0, 0, 108, 108);
        if (shown) drawItemIcon(g, shown, 108);
        itemBtn.classList.toggle('empty', !shown);
        itemBtn.setAttribute('aria-label', shown && !mine.roll ? `Use ${shown}` : 'No item');
      }
      driftBtn.hidden = itemBtn.hidden = !mine || S?.ph === 'done';
      // Countdown.
      if (S && S.ph === 'count' && t < 1) {
        const n = Math.ceil(-t);
        const label = t >= 0 ? 'GO!' : n <= 3 ? String(n) : 'Get ready';
        const frac = t >= 0 ? t : -t - Math.floor(-t);
        const size = label.length > 3 ? big * 0.9 : big * (1.8 + (t >= 0 ? 0.3 : 0.5 * frac));
        hudText(label, w / 2, h * 0.42, Math.round(size), t >= 0 ? '#69db7c' : n <= 3 ? '#ffd43b' : '#fff', 'center');
        // Lights.
        const lit = t >= 0 ? 4 : n <= 3 ? 4 - n : 0;
        for (let i = 0; i < 3; i++) {
          const x = w / 2 + (i - 1) * 34, y = top + 24;
          ctx.fillStyle = '#2a2433';
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = t >= 0 ? '#69db7c' : i < lit ? '#ff6b6b' : '#4a4058';
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t < -1.5 && mine) {
          const touch = matchMedia?.('(pointer: coarse)').matches;
          const lines = touch ? ['Hold left or right to steer', 'DRIFT in bends · tap the item', 'Hold both sides to brake'] : ['Arrows steer · Shift drifts', 'Space uses items · Down brakes'];
          const y0 = h - inset.bottom - 22 - (lines.length - 1) * 18;
          lines.forEach((l, i) => hudText(l, w / 2, y0 + i * 18, 13, '#fff', 'center', 800));
        }
      }
      // Floating messages.
      floaters.forEach((f, i) => {
        if (f.t < 0) return;
        ctx.globalAlpha = clamp(1.6 - f.t, 0, 1);
        hudText(f.text, w / 2, h * 0.3 - i * 36 - f.t * 18, f.big ? 30 : 22, f.color, 'center');
        ctx.globalAlpha = 1;
      });
    }

    function showResults() {
      const done = S && S.ph === 'done' && S.res;
      if (!done) { results.hidden = true; return; }
      const sig = JSON.stringify(S.res) + S.r;
      if (!results.hidden && results.dataset.sig === sig) return;
      results.dataset.sig = sig;
      results.replaceChildren();
      const h2 = document.createElement('h2');
      const myPlace = S.res.findIndex(e => e[0] === myId);
      h2.textContent = myPlace === 0 ? 'You win!' : myPlace > 0 ? `You came ${ORD(myPlace + 1)}` : 'Race over';
      const ol = document.createElement('ol');
      S.res.forEach(([id, name, color, fin, bl], i) => {
        const li = document.createElement('li');
        if (id === myId) li.className = 'me';
        const pos = document.createElement('span');
        pos.textContent = ORD(i + 1);
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = color;
        const nm = document.createElement('span');
        nm.textContent = name;
        const tm = document.createElement('span');
        tm.className = 't';
        tm.textContent = fin > 0 ? fmt(fin / 1000) + (bl > 0 ? ` · lap ${fmt(bl / 1000)}` : '') : id.startsWith('ai') ? '–' : 'DNF';
        li.append(pos, dot, nm, tm);
        ol.append(li);
      });
      const best = document.createElement('div');
      best.className = 'best';
      best.textContent = `Your best lap ${fmt(records.lap)} · best race ${fmt(records.race)} · wins ${records.wins}`;
      const again = document.createElement('button');
      again.className = 'btn';
      again.textContent = 'Play again';
      again.addEventListener('click', () => { api.sfx('click'); startRace(); });
      results.append(h2, ol, best, again);
      results.hidden = false;
      if (!finishShown) { finishShown = true; again.focus({ preventScroll: true }); }
    }

    // --- loop --------------------------------------------------------------
    let raf = 0, last = now(), acc = 0, prevFrame = 0;
    function frame(t) {
      raf = requestAnimationFrame(frame);
      const t0 = now();
      if (prevFrame) { stats.intervals.push(t0 - prevFrame); if (stats.intervals.length > 240) stats.intervals.shift(); }
      prevFrame = t0;
      const dt = Math.min(0.1, (t - last) / 1000 || 0);
      last = t;
      refreshGround();
      if (api.isOwner() && (t0 - ownerTick > 200 || !S)) { ownerTick = t0; ownerUpdate(); }
      readRemote(dt);
      acc += dt;
      let n = 0;
      while (acc >= STEP && n++ < 8) { acc -= STEP; simStep(STEP); }
      if (acc > STEP) acc = 0;
      updateParticles(dt);
      countdownSounds();
      publish();
      // Camera: my kart, or the leader when watching.
      let follow = mine;
      if (!follow) {
        const order = standings(allKarts());
        const lead = order[0];
        if (lead) follow = { x: lead.x, z: lead.z, h: lead.h, drift: 0, boost: 0, star: 0 };
      }
      if (!follow) { const g = gridSpot(track, 0); follow = { x: g.x, z: g.z, h: g.h, drift: 0, boost: 0, star: 0 }; }
      placeCamera(follow, dt);
      ground?.draw(cam, glScale);
      render();
      showResults();
      adaptResolution(t0);
      const cpu = now() - t0;
      stats.frames++;
      stats.cpu += cpu;
      stats.worst = Math.max(stats.worst, cpu);
    }
    let lastCount = null;
    function countdownSounds() {
      const n = S && S.ph === 'count' ? Math.ceil(-raceTime()) : null;
      if (n === lastCount) return;
      if (n != null && n >= 1 && n <= 3) api.sfx('tick');
      if (n != null && n <= 0 && lastCount === 1) api.sfx('honk');
      lastCount = n;
    }
    function adaptResolution(t0) {
      const iv = stats.intervals;
      if (iv.length < 30 || document.hidden) return;
      let sum = 0;
      for (let i = iv.length - 30; i < iv.length; i++) sum += iv[i];
      const avg = sum / 30;
      if (avg > 24 && glCap > 0.3) {
        if (!slowSince) slowSince = t0;
        if (t0 - slowSince > 1000) {
          glCap = Math.max(0.3, Math.min(glCap, glScale) * 0.72);
          slowSince = 0;
          stats.intervals.length = 0;
          resize();
        }
      } else {
        slowSince = 0;
      }
    }
    syncRace();
    raf = requestAnimationFrame(frame);

    return {
      onChange() {
        const next = parseShared(api.shared());
        if (next) S = next;
        syncRace();
      },
      onPad(pad) {
        const x = Math.abs(pad.x) > 0.15 ? pad.x : 0;
        padIn.steer = x || (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
        padIn.drift = pad.rt > 0.3 || !!pad.pressed?.[5] || !!pad.pressed?.[2];
        padIn.brake = pad.lt > 0.3 || !!pad.pressed?.[4] || pad.down;
        if (pad.a) {
          if (S?.ph === 'done') startRace();
          else useQueued = true;
        }
      },
      // Debug bots (js/rookie.js) call this every 400 ms: the autopilot
      // drives my kart and uses items, so a bot races and finishes.
      rookie() {
        rookieUntil = now() + 1500;
      },
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        window.removeEventListener('blur', blur);
        ground?.destroy();
        ground = null;
        sprites.clear();
      },
      // For tests.
      _test: {
        info() {
          const t = raceTime();
          const k = mine;
          return {
            phase: !S ? 'none' : S.ph === 'done' ? 'done' : t < 0 ? 'count' : 'race', raceTime: t, racers: S?.racers ?? [], ai: S?.ai?.length ?? 0,
            me: k && { x: k.x, z: k.z, h: k.h, v: k.v, total: k.total, lap: lapOf(Math.max(0, k.total), track.length).lap, laps: k.lapTimes.length, finished: k.finished, spin: k.spin, item: k.item, roll: k.roll || 0, boost: k.boost, star: k.star, drift: k.drift, d: k.d, offroad: k.offroad },
            rank: mine ? rankOf(myId).rank + 1 : 0, karts: allKarts().map(k => ({ id: k.id, x: k.x, z: k.z, spin: !!(k.fl & 1), finished: k.finished, total: k.total })),
            parts: parts.length, counts: { ...counts }, bananas: bananas.size, bombs: bombs.size, boxesUp: boxUntil.filter(u => now() >= u).length,
            results: S?.res ?? null, ground: ground?.kind, length: track.length,
          };
        },
        give(item) { if (mine && ITEMS.includes(item)) { mine.item = item; mine.roll = 0; } },
        use() { useQueued = true; },
        place(s, d = 0, v = 0) {
          if (!mine) return;
          const p = pointAt(track, s, d);
          const laps = Math.floor(Math.max(0, mine.total) / track.length);
          mine.x = p.x; mine.z = p.z; mine.h = p.h; mine.v = v; mine.hint = -1;
          mine.total = laps * track.length + s; mine.s = s;
        },
        boxes: () => W.boxes.map(b => ({ ...b })),
        bananaList: () => [...bananas.entries()].map(([id, b]) => ({ id, ...b })),
        stats() {
          const iv = stats.intervals.slice().sort((a, b) => a - b);
          return { frames: stats.frames, cpuAvg: stats.cpu / Math.max(1, stats.frames), cpuWorst: stats.worst, frameMedian: iv[Math.floor(iv.length / 2)] || 0, frameP90: iv[Math.floor(iv.length * 0.9)] || 0 };
        },
        // Times the ground (waiting for the GPU) and the 2D overlay, n frames each.
        bench(n = 30) {
          const t0 = now();
          for (let i = 0; i < n; i++) { ground.draw(cam, glScale); ground.finish(); }
          const t1 = now();
          for (let i = 0; i < n; i++) { render(); ctx.getImageData(0, 0, 1, 1); }
          const t2 = now();
          return { ground: (t1 - t0) / n, overlay: (t2 - t1) / n, glPixels: groundCanvas.width * groundCanvas.height, glScale, kind: ground.kind };
        },
        resetStats() { stats = { frames: 0, cpu: 0, worst: 0, intervals: [] }; },
      },
    };
  },
};

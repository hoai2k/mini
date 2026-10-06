// Gliders: the app. Screens (title, lobby, level select, play, pause,
// results), controller-first menus, split-screen rendering and the HUD.

import * as THREE from '../vendor/three.module.min.js';
import { LEVELS, PALETTES, buildLevel, dailyLevel, seededLevel, randomSeedText } from './levels.js';
import { World } from './world.js';
import { createFlyer, placeFlyer, advance } from './flight.js';
import { createScore, updateScore, crash, finish, bank, SCORING } from './scoring.js';
import { createLevelScene, Trail, Streaks, createShadow, Burst, splitLayout, MAX_PLAYERS } from './scene.js';
import { GLIDERS, VARIANTS, createGlider } from './creatures.js';
import { createInput, BTN } from './input.js';
import { createAudio } from './audio.js';
import { ASSETS } from './asset-list.js';
import { loadSettings, saveSettings, bestScores, recordScore } from './store.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const clamp = THREE.MathUtils.clamp;

export const PLAYER_COLORS = ['#3fd6ff', '#ffbf2e', '#ff5fa2', '#9bff5a'];
const MODES = [
  { id: 'best', label: 'Best run' },
  { id: 'total', label: 'Score attack' },
];
const LENGTHS = [
  { s: 60, label: '1 min' },
  { s: 120, label: '2 min' },
  { s: 180, label: '3 min' },
  { s: 300, label: '5 min' },
  { s: 0, label: 'Free flight' },
];
const ASSIST = [0, 0.45, 1];
const CAM_DIST = [3.4, 4.6, 6.4];

const settings = loadSettings();
const audio = createAudio();
const input = createInput();
const asset = (key) => (ASSETS[key]?.delivered ? ASSETS[key].file : null);

// ---------------------------------------------------------------- renderer
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
// The gliders were lit for ACES; the blocks, sky and clouds opt out (see scene.js).
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x2b1f4a, 1);
let W = innerWidth, H = innerHeight;

function pixelRatio(views = 1) {
  const dpr = devicePixelRatio || 1;
  if (settings.quality === 1) return Math.min(dpr, 2);
  if (settings.quality === 2) return Math.min(dpr, 1) * 0.75;
  return Math.min(dpr, views >= 3 ? 1 : views === 2 ? 1.25 : 1.5);
}
function resize() {
  W = innerWidth;
  H = innerHeight;
  renderer.setPixelRatio(pixelRatio(state.round ? state.players.length : 1));
  renderer.setSize(W, H, false);
  if (state.round && state.players.every((p) => p.hud)) layoutHud();
}

// ---------------------------------------------------------------- state
const state = {
  screen: 'title',
  titleNav: false,
  players: [], // lobby slots and, in play, the players
  levelDef: null,
  level: null, // { def, data, world, scene }
  round: null,
  paused: false,
  layers: [], // open modals and dialogs, topmost last
  confirmAction: null,
  randomSeed: randomSeedText(),
  time: 0,
};
window.__gliders = state;

// ---------------------------------------------------------------- fullscreen
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
async function requestFullscreen() {
  const el = document.documentElement;
  if (fsElement()) return;
  try {
    await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.());
    if (matchMedia('(pointer: coarse)').matches && screen.orientation?.lock) await screen.orientation.lock('landscape').catch(() => {});
  } catch {
    /* refused: carry on windowed */
  }
}
async function toggleFullscreen() {
  if (fsElement()) {
    try {
      await (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } catch {
      /* ignore */
    }
  } else requestFullscreen();
}
document.addEventListener('fullscreenchange', () => setTimeout(resize, 50));
document.addEventListener('webkitfullscreenchange', () => setTimeout(resize, 50));
addEventListener('resize', resize);

// ---------------------------------------------------------------- toast
let toastTimer = 0;
function toast(text, ms = 2200) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

// ---------------------------------------------------------------- levels
function levelDefs() {
  return [...LEVELS, dailyLevel(), { ...seededLevel(state.randomSeed, 'Random · ' + state.randomSeed), random: true }];
}
function findLevelDef(id) {
  return levelDefs().find((d) => d.id === id) || (id?.startsWith('seed:') ? seededLevel(id.slice(5)) : LEVELS[0]);
}

function useLevel(def) {
  if (state.level && state.level.def.id === def.id) return state.level;
  if (state.level) {
    state.level.scene.dispose();
    detachDemo();
  }
  const data = buildLevel(def);
  const world = new World(data.boxes);
  const scene = createLevelScene(data);
  state.level = { def, data, world, scene, demoPath: null };
  return state.level;
}

// ---------------------------------------------------------------- previews and portraits
const preview = (() => {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0xffc9b8, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xb18cff, 1.2);
  rim.position.set(-4, 2, -5);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  return { scene, camera, pivots: [] };
})();
const portraitCache = new Map();

function portraitURL(id, variant) {
  const delivered = asset('portrait.' + id);
  if (delivered) return delivered;
  const key = id + ':' + variant;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const size = 192;
  const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace });
  const g = createGlider(id, variant);
  const pivot = new THREE.Group();
  pivot.add(g.object);
  g.object.rotation.set(0.1, 0.55, -0.12);
  g.update({ dt: 0, time: 1.3, speed: 30, tuck: 0, flare: 0.2, roll: 0, pitch: 0, yaw: 0 });
  preview.scene.add(pivot);
  const cam = preview.camera;
  fitCamera(cam, g.object, 1, 0.82, new THREE.Vector3(0.25, 1.0, 0.9));
  const prevTarget = renderer.getRenderTarget();
  const prevClear = renderer.getClearAlpha();
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(preview.scene, cam);
  const px = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(0x2b1f4a, prevClear);
  preview.scene.remove(pivot);
  g.dispose();
  rt.dispose();
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/png');
  portraitCache.set(key, url);
  return url;
}

const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();
function fitCamera(cam, object, aspect, margin = 1.2, dir = new THREE.Vector3(0.0, 0.42, 1)) {
  object.updateWorldMatrix(true, true);
  _box.setFromObject(object);
  _box.getBoundingSphere(_sphere);
  cam.aspect = aspect;
  const fov = THREE.MathUtils.degToRad(cam.fov);
  const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * aspect));
  const d = (_sphere.radius * margin) / Math.sin(fit / 2);
  cam.position.copy(_sphere.center).addScaledVector(dir.clone().normalize(), d);
  cam.lookAt(_sphere.center);
  cam.near = d / 20;
  cam.far = d * 4;
  cam.updateProjectionMatrix();
}

// ---------------------------------------------------------------- navigation
function topLayer() {
  return state.layers.length ? $('#' + state.layers[state.layers.length - 1]) : $('#' + state.screen);
}
function visible(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && !el.disabled;
}
function navItems() {
  const layer = topLayer();
  return layer ? $$('[data-nav]', layer).filter(visible) : [];
}
let navFocused = null;
function focusEl(el, showRing = true) {
  if (!el) return;
  $$('.nav-focus').forEach((e) => e.classList.remove('nav-focus'));
  navFocused = el;
  el.focus({ preventScroll: false });
  if (showRing) el.classList.add('nav-focus');
  el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  if (el.dataset.level !== undefined) selectLevelCard(+el.dataset.level, false);
}
function currentFocus() {
  const items = navItems();
  if (items.includes(document.activeElement)) return document.activeElement;
  if (items.includes(navFocused)) return navFocused;
  return null;
}
function moveFocus(dir) {
  const items = navItems();
  if (!items.length) return;
  const cur = currentFocus();
  if (!cur) {
    focusEl(defaultFocus(items));
    return;
  }
  const r = cur.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const q = el.getBoundingClientRect();
    const x = q.left + q.width / 2, y = q.top + q.height / 2;
    const dx = x - cx, dy = y - cy;
    let main, side;
    if (dir === 'up') [main, side] = [-dy, dx];
    else if (dir === 'down') [main, side] = [dy, dx];
    else if (dir === 'left') [main, side] = [-dx, dy];
    else [main, side] = [dx, dy];
    if (main <= 4) continue;
    const score = main + Math.abs(side) * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) {
    focusEl(best);
    audio.move();
  }
}
function defaultFocus(items) {
  return items.find((e) => e.dataset.default !== undefined) || items[0];
}

function handleMenuAction(act) {
  const el = currentFocus();
  if (act === 'up' || act === 'down' || act === 'left' || act === 'right') {
    if (el && el.type === 'range' && (act === 'left' || act === 'right')) {
      const step = +el.step || 1;
      el.value = clamp(+el.value + (act === 'left' ? -step : step), +el.min, +el.max);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      audio.move();
      return;
    }
    if (el && el.dataset.cycle && (act === 'left' || act === 'right')) {
      cycleOption(el.dataset.cycle, act === 'left' ? -1 : 1);
      return;
    }
    if (el && el.classList.contains('scroll') && (act === 'up' || act === 'down')) {
      const before = el.scrollTop;
      el.scrollTop += act === 'up' ? -80 : 80;
      if (el.scrollTop !== before) return;
    }
    moveFocus(act);
    return;
  }
  if (act === 'confirm') {
    if (!el) {
      if (state.screen === 'title' && !state.layers.length) startGame('keyboard');
      else focusEl(defaultFocus(navItems()));
      return;
    }
    if (el.type === 'checkbox') {
      el.checked = !el.checked;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      audio.confirm();
      return;
    }
    if (el.type === 'range' || el.classList.contains('scroll')) return;
    el.click();
    return;
  }
  if (act === 'back') {
    back();
    return;
  }
  if (act === 'start') {
    if (state.layers.length) {
      const top = state.layers.at(-1);
      if (top === 'pause') resume();
      else if (top !== 'results') closeLayer();
      return;
    }
    if (state.screen === 'title') startGame(input.lastKind === 'controller' ? input.lastDevice : 'keyboard');
  }
}

function back() {
  if (state.layers.length) {
    const top = state.layers.at(-1);
    if (top === 'pause') resume();
    else if (top === 'results') return;
    else closeLayer();
    audio.back();
    return;
  }
  audio.back();
  if (state.screen === 'title' && state.titleNav) {
    state.titleNav = false;
    $$('.nav-focus').forEach((e) => e.classList.remove('nav-focus'));
    $('#title-hint').hidden = false;
  } else if (state.screen === 'levels') showScreen('lobby');
}

function openLayer(id) {
  const prevFocus = currentFocus();
  state.layers.push(id);
  const el = $('#' + id);
  el.hidden = false;
  el._restore = prevFocus;
  if (id === 'settings') syncSettingsUI();
  input.lockHeld();
  requestAnimationFrame(() => focusEl(defaultFocus(navItems()), input.lastKind !== 'pointer'));
}
function closeLayer() {
  const id = state.layers.pop();
  if (!id) return;
  const el = $('#' + id);
  el.hidden = true;
  if (el._restore && visible(el._restore)) focusEl(el._restore, input.lastKind !== 'pointer');
  input.lockHeld();
}
function closeAllLayers() {
  while (state.layers.length) $('#' + state.layers.pop()).hidden = true;
}

function confirmThen(text, fn) {
  state.confirmAction = fn;
  $('#confirm-text').textContent = text;
  openLayer('confirm');
}

// ---------------------------------------------------------------- screens
function showScreen(id) {
  closeAllLayers();
  for (const s of ['title', 'lobby', 'levels']) $('#' + s).hidden = s !== id;
  $('#hud').hidden = id !== 'play';
  state.screen = id;
  input.lockHeld();
  $('#title-bg').classList.toggle('on', id === 'title' && !!asset('titleBg'));
  if (id === 'title') {
    state.titleNav = false;
    $('#title-hint').hidden = false;
    endRound(true);
    useLevel(findLevelDef(settings.levelId));
    // Idle: nothing focused, so the title shows no selection until the stick moves.
    document.activeElement?.blur?.();
    navFocused = null;
  } else if (id === 'lobby') {
    endRound(true);
    for (const p of state.players) p.ready = false;
    renderSlots();
    requestAnimationFrame(() => focusEl($('#lobby-continue'), input.lastKind !== 'pointer'));
  } else if (id === 'levels') {
    endRound(true);
    buildLevelGrid();
    const defs = levelDefs();
    const i = Math.max(0, defs.findIndex((d) => d.id === settings.levelId));
    requestAnimationFrame(() => focusEl($(`[data-level="${i}"]`), input.lastKind !== 'pointer'));
  }
}

// ---------------------------------------------------------------- title
function startGame(via) {
  audio.unlock();
  audio.startMusic();
  requestFullscreen();
  // Whoever pressed start is player one.
  if (!state.players.length) {
    if (via?.startsWith?.('pad')) joinDevice(via);
    else if (via === 'keyboard') joinDevice('kb1');
    else if (!input.padIndexes().length) joinDevice('kb1');
  }
  audio.confirm();
  showScreen('lobby');
}

function updateTitle(now) {
  if (state.layers.length) return runMenu(now, true);
  if (!state.titleNav) {
    // Idle: any fresh controller button starts.
    for (const i of input.padIndexes()) {
      if (input.padAny(i)) {
        startGame('pad' + i);
        return;
      }
    }
    if (input.stickMoved()) {
      state.titleNav = true;
      $('#title-hint').hidden = true;
      focusEl($('#press-start'));
      input.lockHeld();
      return;
    }
    runMenu(now, false);
    return;
  }
  runMenu(now, true);
}

function runMenu(now, pads) {
  for (const act of input.menu(now, pads)) handleMenuAction(act);
}

// ---------------------------------------------------------------- lobby
const DEVICES = () => [...input.padIndexes().map((i) => 'pad' + i), 'kb1', 'kb2'];
const deviceLabel = (d) => (d.startsWith('pad') ? `Controller ${+d.slice(3) + 1}` : d === 'kb1' ? 'Keyboard · WASD' : 'Keyboard · arrows');

function joinDevice(dev) {
  if (state.players.length >= MAX_PLAYERS || state.players.some((p) => p.device === dev)) return null;
  const remembered = settings.gliders[dev];
  const used = new Set(state.players.map((p) => p.gliderId));
  let gliderId = remembered?.id && GLIDERS.some((g) => g.id === remembered.id) ? remembered.id : (GLIDERS.find((g) => !used.has(g.id)) || GLIDERS[0]).id;
  const slot = [0, 1, 2, 3].find((i) => !state.players.some((p) => p.slot === i));
  const p = { slot, device: dev, gliderId, variant: remembered?.variant || 0, invert: !!settings.invert[dev], ready: false };
  state.players.push(p);
  state.players.sort((a, b) => a.slot - b.slot);
  audio.confirm();
  renderSlots();
  return p;
}
function leaveSlot(p) {
  disposePlayerModel(p);
  state.players = state.players.filter((q) => q !== p);
  audio.back();
  renderSlots();
}
function rememberChoice(p) {
  settings.gliders[p.device] = { id: p.gliderId, variant: p.variant };
  settings.invert[p.device] = p.invert;
  saveSettings(settings);
}
function cycleGlider(p, d) {
  const i = GLIDERS.findIndex((g) => g.id === p.gliderId);
  p.gliderId = GLIDERS[(i + d + GLIDERS.length) % GLIDERS.length].id;
  disposePlayerModel(p);
  rememberChoice(p);
  audio.move();
  renderSlots();
}
function cycleVariant(p, d) {
  p.variant = (p.variant + d + VARIANTS) % VARIANTS;
  disposePlayerModel(p);
  rememberChoice(p);
  audio.move();
  renderSlots();
}

function renderSlots() {
  const root = $('#slots');
  root.innerHTML = '';
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const p = state.players.find((q) => q.slot === i);
    const el = document.createElement('div');
    el.className = 'slot' + (p ? ' joined' : '') + (p?.ready ? ' ready' : '');
    el.style.setProperty('--pc', PLAYER_COLORS[i]);
    if (!p) {
      el.innerHTML = `<span class="slot-tag">P${i + 1}</span>
        <div class="slot-empty"><span class="xb xb-a big-a">A</span><strong>Press A to join</strong>
        <span class="muted">or Space / Enter on a keyboard</span></div>`;
    } else {
      const g = GLIDERS.find((x) => x.id === p.gliderId);
      const swatches = Array.from({ length: VARIANTS }, (_, v) => `<button class="swatch${v === p.variant ? ' on' : ''}" data-variant="${v}" aria-label="Colours ${v + 1}"></button>`).join('');
      el.innerHTML = `<span class="slot-tag">P${i + 1}</span><span class="slot-device">${deviceLabel(p.device)}</span>
        <div class="slot-preview"></div>
        <div class="slot-info">
          <div class="slot-name-row"><button class="slot-arrow" data-d="-1" aria-label="Previous glider">◀</button><span class="slot-name">${g.name}</span><button class="slot-arrow" data-d="1" aria-label="Next glider">▶</button></div>
          <div class="slot-latin">${g.latin}</div>
          <div class="slot-blurb">${g.blurb}</div>
          <div class="slot-variants">${swatches}</div>
          <div class="slot-foot"><span>${p.invert ? '<span class="invert-flag">Inverted</span>' : 'Pull back: nose up'} · <span class="xb xb-y">Y</span></span>
          <button class="slot-ready-btn">${p.ready ? 'Ready!' : 'Ready?'}</button></div>
        </div>`;
      $$('.slot-arrow', el).forEach((b) => b.addEventListener('click', () => cycleGlider(p, +b.dataset.d)));
      $$('.swatch', el).forEach((b) => b.addEventListener('click', () => {
        p.variant = +b.dataset.variant;
        disposePlayerModel(p);
        rememberChoice(p);
        renderSlots();
      }));
      $('.slot-ready-btn', el).addEventListener('click', () => setReady(p, !p.ready));
      // Swatch colours come from the glider's palette for that variant.
      const swatchEls = $$('.swatch', el);
      for (let v = 0; v < VARIANTS; v++) {
        const pal = variantPalette(p.gliderId, v);
        swatchEls[v].style.background = `linear-gradient(135deg, ${pal.primary} 50%, ${pal.accent} 50%)`;
      }
    }
    el.dataset.slot = i;
    root.appendChild(el);
  }
  const n = state.players.length;
  $('#lobby-continue').disabled = false;
  $('#lobby-continue').textContent = n ? (n === 1 ? 'Continue · 1 player' : `Continue · ${n} players`) : 'Continue';
}

const variantPalettes = new Map();
function variantPalette(id, v) {
  const key = id + ':' + v;
  if (!variantPalettes.has(key)) {
    const g = createGlider(id, v);
    variantPalettes.set(key, g.palette);
    g.dispose();
  }
  return variantPalettes.get(key);
}

function setReady(p, ready) {
  p.ready = ready;
  ready ? audio.confirm() : audio.back();
  renderSlots();
  if (ready && state.players.every((q) => q.ready)) lobbyContinue();
}
function lobbyContinue() {
  if (!state.players.length) joinDevice(input.padIndexes().length ? 'pad' + input.padIndexes()[0] : 'kb1');
  for (const p of state.players) p.ready = true;
  setTimeout(() => state.screen === 'lobby' && showScreen('levels'), 250);
}

function updateLobby(now) {
  if (state.layers.length) return runMenu(now, true);
  for (const dev of DEVICES()) {
    const p = state.players.find((q) => q.device === dev);
    if (!p) {
      if (input.devicePressed(dev, 'join')) joinDevice(dev);
      else if (input.devicePressed(dev, 'leave') && !state.players.length) showScreen('title');
      continue;
    }
    if (input.devicePressed(dev, 'next')) cycleGlider(p, 1);
    else if (input.devicePressed(dev, 'prev')) cycleGlider(p, -1);
    else if (input.devicePressed(dev, 'up')) cycleVariant(p, -1);
    else if (input.devicePressed(dev, 'down')) cycleVariant(p, 1);
    else if (input.devicePressed(dev, 'alt')) {
      p.invert = !p.invert;
      rememberChoice(p);
      audio.move();
      renderSlots();
    } else if (input.devicePressed(dev, 'ready')) setReady(p, !p.ready);
    else if (input.devicePressed(dev, 'leave')) {
      if (p.ready) setReady(p, false);
      else leaveSlot(p);
    }
  }
  // Pads also navigate the footer with the stick (not the D-pad, which picks gliders).
  if (input.lastKind === 'pointer') return;
}

function disposePlayerModel(p) {
  if (p.model) {
    p.model.object.parent?.remove(p.model.object);
    p.model.dispose();
    p.model = null;
  }
  if (p.previewModel) {
    p.previewModel.object.parent?.remove(p.previewModel.object);
    p.previewModel.dispose();
    p.previewModel = null;
  }
}

function renderLobbyPreviews(time, dt) {
  const slots = $$('#slots .slot');
  renderer.setScissorTest(true);
  for (const p of state.players) {
    const el = slots[p.slot]?.querySelector('.slot-preview');
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) continue;
    if (!p.previewModel) {
      p.previewModel = createGlider(p.gliderId, p.variant);
      p.previewPivot = new THREE.Group();
      p.previewPivot.add(p.previewModel.object);
      preview.scene.add(p.previewPivot);
    }
    for (const q of state.players) if (q.previewPivot) q.previewPivot.visible = q === p;
    const spin = time * 0.5 + p.slot * 1.3;
    p.previewModel.object.rotation.set(Math.sin(time * 0.8 + p.slot) * 0.06, Math.sin(spin) * 0.8, Math.sin(time * 1.1 + p.slot) * 0.15);
    p.previewModel.update({ dt, time, speed: 35, tuck: 0, flare: p.ready ? 0.6 : 0.15 + 0.15 * Math.sin(time * 1.3), roll: Math.sin(time * 0.9) * 0.4, pitch: 0, yaw: 0 });
    p.previewModel.object.position.y = Math.sin(time * 1.6 + p.slot) * 0.08;
    fitCamera(preview.camera, p.previewModel.object, r.width / r.height, 0.8, new THREE.Vector3(0, 1.1, 0.95));
    const y = H - r.bottom;
    renderer.setViewport(r.left, y, r.width, r.height);
    renderer.setScissor(r.left, y, r.width, r.height);
    renderer.clearDepth();
    renderer.render(preview.scene, preview.camera);
  }
  renderer.setScissorTest(false);
}

// ---------------------------------------------------------------- level select
let gridDefs = [];
function buildLevelGrid() {
  gridDefs = levelDefs();
  const root = $('#level-grid');
  root.innerHTML = '';
  gridDefs.forEach((def, i) => {
    const pal = PALETTES[def.palette];
    const best = bestScores(def.id, settings.mode)[0];
    const b = document.createElement('button');
    b.className = 'level-card';
    b.dataset.nav = '';
    b.dataset.level = i;
    const bars = pal.blocks.slice(0, 6).map((c, k) => `<i style="background:${c};height:${[26, 38, 18, 44, 30, 22][k]}px"></i>`).join('');
    const label = def.random ? `Random · ${state.randomSeed}` : def.name;
    b.innerHTML = `<div class="sky" style="background:linear-gradient(180deg, ${pal.sky[0]}, ${pal.sky[1]} 70%, ${pal.fog})"><div class="blocks">${bars}</div></div>
      <div class="meta"><div class="name">${label}</div><div class="best">${best ? 'Best ' + fmt(best.score) : 'No score yet'}</div></div>`;
    b.addEventListener('click', () => {
      selectLevelCard(i, true);
      startRound();
    });
    b.addEventListener('pointerenter', () => input.lastKind === 'pointer' && selectLevelCard(i, false));
    root.appendChild(b);
  });
  syncOptions();
}

const MIX_BLURB = {
  balanced: 'A bit of everything: arches, frames, towers and tunnels.',
  spires: 'Forests of thin spires and tall towers to slalom through.',
  canyon: 'Split mesas with narrow canyons and long tunnels.',
  gates: 'Runs of frames and rings to thread one after another.',
  lattice: 'Open lattices of beams: gaps everywhere.',
  halls: 'Long halls and tunnels with windows in their walls.',
  ruins: 'Arches, aqueducts and broken walls.',
};
let previewTimer = 0;
function selectLevelCard(i, commit) {
  const def = gridDefs[i];
  if (!def) return;
  $$('.level-card').forEach((c, k) => c.classList.toggle('selected', k === i));
  settings.levelId = def.id;
  saveSettings(settings);
  $('#level-name').textContent = def.random ? 'Random · ' + state.randomSeed : def.name;
  $('#level-blurb').textContent = MIX_BLURB[def.mix] || '';
  const list = bestScores(def.id, settings.mode);
  $('#level-scores').innerHTML = list.length
    ? list.slice(0, 6).map((e) => `<li>${fmt(e.score)} <span class="who">· ${e.player} · ${GLIDERS.find((g) => g.id === e.glider)?.name || ''}</span></li>`).join('')
    : '<li class="who">No scores yet. Be the first.</li>';
  state.levelDef = def;
  clearTimeout(previewTimer);
  if (commit) useLevel(def);
  else previewTimer = setTimeout(() => state.screen === 'levels' && useLevel(def), 160);
}

function cycleOption(kind, d) {
  if (kind === 'mode') {
    const i = MODES.findIndex((m) => m.id === settings.mode);
    settings.mode = MODES[(i + d + MODES.length) % MODES.length].id;
  } else {
    const i = LENGTHS.findIndex((m) => m.s === settings.length);
    settings.length = LENGTHS[(i + d + LENGTHS.length) % LENGTHS.length].s;
  }
  saveSettings(settings);
  audio.move();
  syncOptions();
  if (state.screen === 'levels') {
    const focused = currentFocus();
    buildLevelGrid();
    if (focused?.dataset.cycle) focusEl($(`[data-cycle="${focused.dataset.cycle}"]`));
  }
}
function syncOptions() {
  $('#opt-mode .cycle-value').textContent = MODES.find((m) => m.id === settings.mode)?.label || MODES[0].label;
  $('#opt-length .cycle-value').textContent = LENGTHS.find((m) => m.s === settings.length)?.label || '3 min';
}

function updateLevels(now) {
  if (!state.layers.length) {
    const reroll = input.keyPressed('KeyR') || input.padIndexes().some((i) => input.padPressed(i, BTN.Y));
    if (reroll) {
      state.randomSeed = randomSeedText();
      const focusedIdx = currentFocus()?.dataset.level;
      buildLevelGrid();
      const ri = gridDefs.findIndex((d) => d.random);
      focusEl($(`[data-level="${focusedIdx ?? ri}"]`) || $(`[data-level="${ri}"]`));
      if (+focusedIdx === ri) selectLevelCard(ri, true);
      toast('New random seed: ' + state.randomSeed);
    }
  }
  runMenu(now, true);
}

// ---------------------------------------------------------------- play
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _probe = [0, 0, 0, 0];
const WORLD_UP = new THREE.Vector3(0, 1, 0);

function startRound() {
  const def = state.levelDef || findLevelDef(settings.levelId);
  state.levelDef = def;
  const L = useLevel(def);
  closeAllLayers();
  clearRoundObjects();
  detachDemo();
  const n = state.players.length;
  const round = {
    def,
    mode: settings.mode,
    length: settings.length,
    time: 0,
    left: settings.length,
    phase: 'countdown',
    countdown: 3.2,
    lastBeep: 4,
    overAt: 0,
  };
  state.round = round;
  state.paused = false;
  state.players.forEach((p, i) => {
    p.index = i;
    p.color = PLAYER_COLORS[p.slot];
    if (!p.model) p.model = createGlider(p.gliderId, p.variant);
    L.scene.scene.add(p.model.object);
    p.flyer = createFlyer();
    p.score = createScore(round.mode);
    p.trails = p.model.wingtips.map(() => new Trail(p.color));
    p.trails.forEach((t) => L.scene.scene.add(t.mesh));
    p.streaks = new Streaks();
    p.streaks.mesh.layers.set(1 + i);
    L.scene.scene.add(p.streaks.mesh);
    p.shadow = createShadow();
    L.scene.scene.add(p.shadow);
    p.burst = new Burst([p.model.palette.primary, p.model.palette.secondary, p.model.palette.accent, p.color]);
    L.scene.scene.add(p.burst.mesh);
    p.camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.1, 3000);
    p.camera.layers.enable(1 + i);
    p.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), shake: 0, fov: settings.fov };
    p.input = { pitch: 0, roll: 0, yaw: 0, tuck: 0, flare: 0 };
    p.portrait = portraitURL(p.gliderId, p.variant);
    spawn(p, true);
  });
  // An overview camera for the spare quarter with three players.
  state.overview = new THREE.PerspectiveCamera(50, 1, 1, 4000);
  buildHud();
  resize();
  showScreen('play');
  state.round = round;
  document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
  audio.unlock();
  input.lockHeld();
}

function clearRoundObjects() {
  for (const p of state.players) {
    if (p.model) p.model.object.parent?.remove(p.model.object);
    p.trails?.forEach((t) => {
      t.mesh.parent?.remove(t.mesh);
      t.dispose();
    });
    if (p.streaks) {
      p.streaks.mesh.parent?.remove(p.streaks.mesh);
      p.streaks.dispose();
    }
    if (p.shadow) {
      p.shadow.parent?.remove(p.shadow);
      p.shadow.geometry.dispose();
      p.shadow.material.dispose();
    }
    if (p.burst) {
      p.burst.mesh.parent?.remove(p.burst.mesh);
      p.burst.dispose();
    }
    p.trails = p.streaks = p.shadow = p.burst = null;
    if (state.level) state.level.scene.setPlayerGlow(p.index ?? 0, null);
  }
}

function endRound(silent) {
  if (!state.round) return;
  clearRoundObjects();
  state.round = null;
  state.paused = false;
  audio.silenceFlight();
  $('#hud').hidden = true;
  if (!silent) showScreen('levels');
}

function spawn(p, first) {
  const L = state.level.data;
  const n = state.players.length;
  const off = (p.index - (n - 1) / 2) * 7;
  const s = L.spawn;
  placeFlyer(p.flyer, [s.pos[0] - off, s.pos[1], s.pos[2]], s.yaw, s.pitch);
  p.alive = true;
  p.respawnIn = 0;
  p.model.object.visible = true;
  p.trails.forEach((t) => t.reset());
  p.model.object.position.copy(p.flyer.pos);
  p.model.object.quaternion.copy(p.flyer.quat);
  if (first) {
    p.cam.pos.copy(p.flyer.pos).addScaledVector(p.flyer.forward, -CAM_DIST[settings.camera]).add(_v.set(0, 2, 0));
    p.cam.look.copy(p.flyer.pos);
  }
}

function handleEvents(p, events) {
  for (const e of events) {
    if (e.type === 'bonus') {
      pop(p, `${e.kind === 'INVERTED' ? 'UPSIDE DOWN' : e.kind}  ×${e.mult}`);
      audio.bonus(e.mult);
      if (settings.vibration) input.rumble(p.device, 0.1, 0.4, 70);
    } else if (e.type === 'bank') {
      pop(p, '+' + fmt(e.amount), 'bank');
      audio.bank(clamp(e.amount / 20000, 0, 1));
      if (settings.vibration) input.rumble(p.device, 0.3, 0.6, 140);
    } else if (e.type === 'crash') {
      message(p, e.lost > 0 ? `Wipeout<small>combo lost: ${fmt(e.lost)}</small>` : 'Wipeout', true, 1.6);
    }
  }
}

function doCrash(p) {
  const events = crash(p.score);
  handleEvents(p, events);
  audio.crash();
  if (settings.vibration) input.rumble(p.device, 1, 0.8, 380);
  p.burst.fire(p.flyer.pos, p.flyer.vel);
  p.alive = false;
  p.respawnIn = 1.9;
  p.model.object.visible = false;
  p.cam.shake = settings.reduceMotion ? 0 : 0.6;
}

function sendBack(p, why) {
  handleEvents(p, bank(p.score));
  message(p, why, false, 1.4);
  spawn(p);
}

function updatePlayer(p, dt, time) {
  const round = state.round;
  const L = state.level;
  const f = p.flyer;
  if (p.alive) {
    const live = round.phase === 'play';
    const raw = live ? input.flight(p.device, p.invert) : { pitch: 0, roll: 0, yaw: 0, tuck: 0, flare: 0 };
    p.input = raw;
    if (live) {
      if (advance(f, raw, dt, L.world, { assist: ASSIST[settings.assist] })) {
        doCrash(p);
      } else {
        const dist = L.world.nearest(f.pos.x, f.pos.y, f.pos.z, SCORING.proximity + 1, _probe);
        let probes = null;
        if (dist < SCORING.proximity) {
          const r = SCORING.gapReach + 0.5;
          const ray = (v, s) => L.world.raycast(f.pos.x, f.pos.y, f.pos.z, v.x * s, v.y * s, v.z * s, r);
          probes = { left: ray(f.right, -1), right: ray(f.right, 1), up: ray(f.up, 1), down: ray(f.up, -1) };
        }
        handleEvents(p, updateScore(p.score, { dist, speed: f.speed, probes, inverted: f.up.y < -0.3 }, dt));
        const b = L.data.bounds;
        const r = Math.hypot(f.pos.x, f.pos.z);
        if (f.pos.y < b.floor) sendBack(p, 'Cloud dive');
        else if (r > b.edge || f.pos.y > b.ceiling) sendBack(p, 'Out of bounds');
        else if (r > b.radius + 110) message(p, 'Turn back<small>the sky ends ahead</small>', false, 0.2);
      }
    }
  } else {
    p.respawnIn -= dt;
    if (p.respawnIn <= 0 && round.phase === 'play') spawn(p);
  }

  // The model, contrails, shadow and glow.
  const m = p.model;
  if (p.alive) {
    m.object.position.copy(f.pos);
    m.object.quaternion.copy(f.quat);
  }
  m.update({ dt, time, speed: f.speed, tuck: p.input.tuck, flare: p.input.flare, roll: p.input.roll, pitch: p.input.pitch, yaw: p.input.yaw });
  const close = p.alive ? p.score.closeness : 0;
  const combo = p.score.pot > 0;
  const trailsOn = settings.trails;
  m.object.updateMatrixWorld(true);
  p.trails.forEach((t, k) => {
    t.mesh.visible = trailsOn;
    if (!trailsOn) return;
    const head = p.alive ? m.wingtips[k].getWorldPosition(_v2) : null;
    t.update(time, head, 0.07 + close * 0.22 + (combo ? 0.05 : 0), combo ? 0.85 : 0.4);
  });
  p.streaks.update(f.pos, f.vel, p.alive ? f.speed : 0, dt);
  p.burst.update(dt);
  L.scene.setPlayerGlow(p.index, p.alive && close > 0 ? f.pos : null, p.color, 0.4 + close * 0.8);
  const down = p.alive ? L.world.raycast(f.pos.x, f.pos.y, f.pos.z, 0, -1, 0, 90) : Infinity;
  p.shadow.visible = down < 90;
  if (p.shadow.visible) {
    p.shadow.position.set(f.pos.x, f.pos.y - down + 0.06, f.pos.z);
    const s = 1 + down * 0.02;
    p.shadow.scale.set(s, s, 1);
    p.shadow.material.opacity = clamp(1 - down / 90, 0, 1) * 0.9;
  }
  updateCamera(p, dt);
}

function updateCamera(p, dt) {
  const f = p.flyer;
  const c = p.cam;
  const dist = CAM_DIST[settings.camera];
  if (p.alive) {
    const vdir = _v.copy(f.vel).normalize();
    const dir = _v2.copy(f.forward).lerp(vdir, 0.55).normalize();
    const up = new THREE.Vector3().copy(WORLD_UP).lerp(f.up, 0.5).normalize();
    const desired = new THREE.Vector3().copy(f.pos).addScaledVector(dir, -dist).addScaledVector(up, dist * 0.26);
    // Keep the camera out of the blocks behind.
    const back = desired.clone().sub(f.pos);
    const bl = back.length();
    back.divideScalar(bl);
    const hit = state.level.world.raycast(f.pos.x, f.pos.y, f.pos.z, back.x, back.y, back.z, bl);
    if (hit < bl) desired.copy(f.pos).addScaledVector(back, Math.max(1.2, hit - 0.5));
    c.pos.lerp(desired, 1 - Math.exp(-dt * 9));
    c.look.lerp(_v.copy(f.pos).addScaledVector(f.forward, 6), 1 - Math.exp(-dt * 14));
    const roll = settings.reduceMotion ? 0.12 : 0.5;
    c.up.lerp(_v.copy(WORLD_UP).lerp(f.up, roll).normalize(), 1 - Math.exp(-dt * 6)).normalize();
    const fovTarget = settings.fov + (settings.reduceMotion ? 0 : clamp((f.speed - 30) * 0.22, 0, 22));
    c.fov += (fovTarget - c.fov) * (1 - Math.exp(-dt * 3));
  } else {
    c.look.lerp(f.pos, 1 - Math.exp(-dt * 4));
  }
  const cam = p.camera;
  cam.position.copy(c.pos);
  if (c.shake > 0) {
    c.shake = Math.max(0, c.shake - dt);
    cam.position.x += (Math.random() - 0.5) * c.shake;
    cam.position.y += (Math.random() - 0.5) * c.shake;
  }
  cam.up.copy(c.up);
  cam.lookAt(c.look);
  if (Math.abs(cam.fov - c.fov) > 0.01) {
    cam.fov = c.fov;
    cam.updateProjectionMatrix();
  }
}

function updatePlay(dt, time) {
  const round = state.round;
  if (!round) return;
  if (round.phase === 'countdown') {
    round.countdown -= dt;
    const n = Math.ceil(round.countdown);
    if (n !== round.lastBeep && n >= 0) {
      round.lastBeep = n;
      const el = $('#countdown');
      el.hidden = false;
      el.textContent = n > 0 ? String(n) : 'Fly!';
      audio.countdown(n <= 0);
    }
    if (round.countdown <= 0) {
      round.phase = 'play';
      setTimeout(() => ($('#countdown').hidden = true), 600);
    }
  } else if (round.phase === 'play') {
    round.time += dt;
    if (round.length > 0) {
      round.left = round.length - round.time;
      if (round.left <= 0) timeUp();
    }
  } else if (round.phase === 'over') {
    round.overAt -= dt;
    if (round.overAt <= 0 && !state.layers.includes('results')) showResults();
  }
  let maxSpeed = 0, maxClose = 0;
  for (const p of state.players) {
    updatePlayer(p, dt, time);
    if (p.alive) maxSpeed = Math.max(maxSpeed, p.flyer.speed);
    maxClose = Math.max(maxClose, p.alive ? p.score.closeness : 0);
  }
  audio.flight(maxSpeed, maxClose, round.phase === 'play');
  updateHud();
}

function timeUp() {
  const round = state.round;
  round.phase = 'over';
  round.overAt = 2.2;
  for (const p of state.players) handleEvents(p, finish(p.score));
  const b = $('#banner');
  b.textContent = 'Time!';
  b.hidden = false;
  audio.countdown(true);
}

function endRoundNow() {
  closeAllLayers();
  state.paused = false;
  if (state.round.phase !== 'over') timeUp();
  state.round.overAt = 0.6;
}

function showResults() {
  const round = state.round;
  $('#banner').hidden = true;
  const ranked = [...state.players].sort((a, b) => b.score.score - a.score.score);
  const def = round.def;
  $('#results-level').textContent = `${def.name} · ${MODES.find((m) => m.id === round.mode).label}${round.length ? ' · ' + LENGTHS.find((l) => l.s === round.length)?.label : ''}`;
  let place = 0, last = null;
  let anyRecord = false;
  $('#results-list').innerHTML = ranked
    .map((p, i) => {
      if (p.score.score !== last) place = i + 1;
      last = p.score.score;
      const g = GLIDERS.find((x) => x.id === p.gliderId);
      const rank = recordScore(def.id, round.mode, { score: Math.round(p.score.score), glider: p.gliderId, variant: p.variant, player: 'P' + (p.slot + 1), date: Date.now() });
      if (rank === 0) anyRecord = true;
      const s = p.score;
      return `<li class="${place === 1 && state.players.length > 1 ? 'first' : ''}" style="--pc:${p.color}">
        <span class="place">${place}</span><img src="${p.portrait}" alt="">
        <div><div class="who">P${p.slot + 1} · ${g.name}</div><div class="stats">Biggest bank ${fmt(s.bestBank)} · best ×${s.bestMult} · ${s.banks} banked · ${s.crashes} crash${s.crashes === 1 ? '' : 'es'}</div></div>
        <span class="score">${fmt(s.score)}${rank === 0 ? '<span class="record">New record!</span>' : rank > 0 ? `<span class="record">#${rank + 1} on this sky</span>` : ''}</span></li>`;
    })
    .join('');
  $('#results-title').textContent = state.players.length > 1 ? `P${ranked[0].slot + 1} wins!` : anyRecord ? 'New record!' : 'Results';
  if (anyRecord) audio.record();
  openLayer('results');
  audio.silenceFlight();
}

function pause(reason = '') {
  if (!state.round || state.paused || state.round.phase === 'over') return;
  state.paused = true;
  $('#pause-reason').textContent = reason;
  audio.silenceFlight();
  openLayer('pause');
}
function resume() {
  if (!state.paused) return;
  while (state.layers.length) closeLayer();
  state.paused = false;
  input.lockHeld();
}

function updatePlayInput(now) {
  if (state.layers.length) {
    runMenu(now, true);
    return;
  }
  if (input.keyPressed('Escape') || input.keyPressed('KeyP') || state.players.some((p) => input.pauseRequested(p.device)) || input.padIndexes().some((i) => input.padPressed(i, BTN.MENU))) {
    pause();
  }
}

// ---------------------------------------------------------------- HUD
function buildHud() {
  const root = $('#views');
  root.innerHTML = '';
  for (const p of state.players) {
    const el = document.createElement('div');
    el.className = 'pv';
    el.style.setProperty('--pc', p.color);
    const g = GLIDERS.find((x) => x.id === p.gliderId);
    el.innerHTML = `<div class="pv-top"><img class="pv-badge" alt="" src="${p.portrait}"><div>
        <div class="pv-name">P${p.slot + 1} · ${g.name}</div><div class="pv-score">0</div><div class="pv-sub"></div></div></div>
      <div class="pv-combo off"><div class="pv-pot">0<span class="pv-mult">×1</span></div><div class="pv-bankbar"><i></i></div></div>
      <div class="pv-pops"></div><div class="pv-msg" hidden></div><div class="pv-speed"></div>`;
    root.appendChild(el);
    p.hud = {
      root: el,
      score: $('.pv-score', el),
      sub: $('.pv-sub', el),
      combo: $('.pv-combo', el),
      pot: $('.pv-pot', el),
      bar: $('.pv-bankbar', el),
      barFill: $('.pv-bankbar i', el),
      pops: $('.pv-pops', el),
      msg: $('.pv-msg', el),
      speed: $('.pv-speed', el),
      last: {},
      msgUntil: 0,
    };
  }
  layoutHud();
}
function layoutHud() {
  const { views, spare } = splitLayout(state.players.length, W, H);
  state.players.forEach((p, i) => {
    const v = views[i];
    Object.assign(p.hud.root.style, { left: v.x + 'px', top: v.y + 'px', width: v.w + 'px', height: v.h + 'px' });
  });
  const sp = $('#spare');
  sp.hidden = !spare;
  if (spare) Object.assign(sp.style, { left: spare.x + 'px', top: spare.y + 'px', width: spare.w + 'px', height: spare.h + 'px' });
  state.spare = spare;
}
function setText(h, key, el, text) {
  if (h.last[key] !== text) {
    h.last[key] = text;
    el.innerHTML = text;
  }
}
function pop(p, text, cls = '') {
  const el = document.createElement('div');
  el.className = 'pop ' + cls;
  el.textContent = text;
  p.hud.pops.appendChild(el);
  setTimeout(() => el.remove(), 1250);
}
function message(p, html, bad, secs) {
  const h = p.hud;
  h.msg.hidden = false;
  h.msg.className = 'pv-msg' + (bad ? ' bad' : '');
  setText(h, 'msg', h.msg, html);
  h.msgUntil = state.time + secs;
}
function updateHud() {
  const round = state.round;
  for (const p of state.players) {
    const h = p.hud, s = p.score;
    setText(h, 'score', h.score, fmt(s.score));
    const sub = round.mode === 'best' ? (s.best > 0 ? `best run · this run ${fmt(s.run)}` : 'this run') : 'banked';
    setText(h, 'sub', h.sub, sub);
    const comboOn = s.pot > 0;
    h.combo.classList.toggle('off', !comboOn);
    if (comboOn) {
      setText(h, 'pot', h.pot, `${fmt(s.pot)}<span class="pv-mult">×${s.mult}</span>`);
      const away = s.away > 0;
      h.bar.classList.toggle('away', away);
      h.barFill.style.width = (away ? (s.away / SCORING.bankDelay) * 100 : s.closeness * 100).toFixed(1) + '%';
    }
    setText(h, 'speed', h.speed, p.alive ? `${Math.round(p.flyer.speed * 3.6)} km/h` : '');
    if (!p.alive && round.phase === 'play' && state.time >= h.msgUntil) message(p, 'Respawning…', false, 0.1);
    if (!h.msg.hidden && state.time > h.msgUntil) h.msg.hidden = true;
  }
  const t = $('#hud-timer');
  const secs = round.length > 0 ? Math.max(0, round.left) : round.time;
  const txt = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
  if (t.textContent !== txt) t.textContent = txt;
  t.classList.toggle('low', round.length > 0 && round.left < 15);
  if (state.spare) {
    const sp = $('#spare');
    const ranked = [...state.players].sort((a, b) => b.score.score - a.score.score);
    const html = '<h3>Standings</h3><ol>' + ranked.map((p) => `<li style="color:${p.color}"><span>P${p.slot + 1}</span><span>${fmt(p.score.score)}</span></li>`).join('') + '</ol>';
    if (sp._html !== html) sp.innerHTML = sp._html = html;
  }
}

// ---------------------------------------------------------------- attract mode (menus)
function findDemoPath(L) {
  const top = L.data.bounds.top;
  let best = null;
  const tries = 60;
  for (let k = 0; k < tries; k++) {
    const a = (k / tries) * Math.PI * 2 * 3.7;
    const rr = 60 + (k % 7) * 40;
    const c = new THREE.Vector3(Math.cos(a) * rr, top * (0.35 + (k % 5) * 0.12), Math.sin(a) * rr);
    const radius = 50 + (k % 4) * 25;
    let minD = Infinity, near = 0;
    for (let i = 0; i < 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      const d = L.world.nearest(c.x + Math.cos(t) * radius, c.y + Math.sin(t * 2) * 6, c.z + Math.sin(t) * radius, 40);
      minD = Math.min(minD, d);
      if (d < 30) near++;
    }
    if (minD > 9 && (!best || near > best.near)) best = { c, radius, near };
  }
  return best || { c: new THREE.Vector3(0, top + 30, 0), radius: 120, near: 0 };
}
let demo = null;
function detachDemo() {
  if (demo) {
    demo.model.object.parent?.remove(demo.model.object);
    demo.trails.forEach((t) => {
      t.mesh.parent?.remove(t.mesh);
      t.dispose();
    });
    demo.model.dispose();
    demo = null;
  }
}
const attractCam = new THREE.PerspectiveCamera(55, 1, 0.1, 4000);
function renderAttract(time, dt) {
  const L = state.level || useLevel(findLevelDef(settings.levelId));
  if (!L.demoPath) L.demoPath = findDemoPath(L);
  if (!demo) {
    const id = state.players[0]?.gliderId || GLIDERS[Math.floor(time) % GLIDERS.length].id;
    const model = createGlider(id, state.players[0]?.variant || 0);
    L.scene.scene.add(model.object);
    const trails = model.wingtips.map(() => new Trail('#ffffff'));
    trails.forEach((t) => L.scene.scene.add(t.mesh));
    demo = { model, trails, level: L };
  }
  if (demo.level !== L) {
    detachDemo();
    return;
  }
  const path = L.demoPath;
  const w = 0.24;
  const t = time * w;
  const pos = new THREE.Vector3(path.c.x + Math.cos(t) * path.radius, path.c.y + Math.sin(t * 2) * 6, path.c.z + Math.sin(t) * path.radius);
  const ahead = new THREE.Vector3(path.c.x + Math.cos(t + 0.05) * path.radius, path.c.y + Math.sin((t + 0.05) * 2) * 6, path.c.z + Math.sin(t + 0.05) * path.radius);
  const o = demo.model.object;
  o.position.copy(pos);
  const m = new THREE.Matrix4().lookAt(ahead, pos, WORLD_UP);
  o.quaternion.setFromRotationMatrix(m);
  o.rotateZ(-0.35);
  demo.model.update({ dt, time, speed: path.radius * w, tuck: 0, flare: 0.1, roll: 0.3, pitch: 0, yaw: 0 });
  o.updateMatrixWorld(true);
  demo.trails.forEach((tr, k) => tr.update(time, demo.model.wingtips[k].getWorldPosition(new THREE.Vector3()), 0.08, 0.55));

  const cam = attractCam;
  cam.aspect = W / H;
  if (state.screen === 'title') {
    // Close behind and beside the demo glider.
    const side = new THREE.Vector3(Math.cos(t), 0, Math.sin(t));
    const back = ahead.clone().sub(pos).normalize();
    cam.position.copy(pos).addScaledVector(back, -9).addScaledVector(side, 3.5 + Math.sin(time * 0.15) * 2.5).add(new THREE.Vector3(0, 2.8, 0));
    cam.up.set(0, 1, 0);
    cam.lookAt(pos.clone().addScaledVector(back, 4).add(new THREE.Vector3(0, -0.6, 0)));
  } else {
    const R = L.data.bounds.radius;
    const a = time * 0.05;
    cam.position.set(Math.cos(a) * R * 1.35, L.data.bounds.top * 0.95, Math.sin(a) * R * 1.35);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, L.data.bounds.top * 0.38, 0);
  }
  cam.fov = 55;
  cam.far = 4000;
  cam.updateProjectionMatrix();
  L.scene.update(time);
  L.scene.prepareView(cam);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
  renderer.render(L.scene.scene, cam);
}

function renderPlay(time) {
  const L = state.level;
  L.scene.update(time);
  const { views, spare } = splitLayout(state.players.length, W, H);
  renderer.setScissorTest(true);
  state.players.forEach((p, i) => {
    const v = views[i];
    const y = H - v.y - v.h;
    renderer.setViewport(v.x, y, v.w, v.h);
    renderer.setScissor(v.x, y, v.w, v.h);
    const aspect = v.w / v.h;
    if (p.camera.aspect !== aspect) {
      p.camera.aspect = aspect;
      p.camera.updateProjectionMatrix();
    }
    L.scene.prepareView(p.camera);
    renderer.render(L.scene.scene, p.camera);
  });
  if (spare) {
    const cam = state.overview;
    const R = L.data.bounds.radius;
    const a = time * 0.04;
    cam.position.set(Math.cos(a) * R * 1.3, L.data.bounds.top * 1.1, Math.sin(a) * R * 1.3);
    cam.lookAt(0, L.data.bounds.top * 0.4, 0);
    cam.aspect = spare.w / spare.h;
    cam.updateProjectionMatrix();
    const y = H - spare.y - spare.h;
    renderer.setViewport(spare.x, y, spare.w, spare.h);
    renderer.setScissor(spare.x, y, spare.w, spare.h);
    L.scene.prepareView(cam);
    renderer.render(L.scene.scene, cam);
  }
  renderer.setScissorTest(false);
}

// ---------------------------------------------------------------- settings
const SETTING_LABELS = {
  assist: ['Off', 'Gentle', 'Strong'],
  camera: ['Near', 'Normal', 'Far'],
  quality: ['Auto', 'High', 'Low'],
};
function syncSettingsUI() {
  for (const el of $$('[data-setting]')) {
    const k = el.dataset.setting;
    if (el.type === 'checkbox') el.checked = !!settings[k];
    else el.value = settings[k];
    const out = el.parentElement.querySelector('output');
    if (out) out.textContent = SETTING_LABELS[k] ? SETTING_LABELS[k][settings[k]] : k === 'fov' ? settings[k] + '°' : settings[k];
  }
}
function applySettings() {
  audio.setVolumes({ master: settings.volume / 100, music: settings.music / 100, sfx: settings.sfx / 100 });
  document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
  resize();
}
for (const el of $$('[data-setting]')) {
  const handler = () => {
    const k = el.dataset.setting;
    settings[k] = el.type === 'checkbox' ? el.checked : +el.value;
    saveSettings(settings);
    syncSettingsUI();
    applySettings();
  };
  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
}

// ---------------------------------------------------------------- clicks
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action], [data-open], [data-cycle]');
  if (!el) return;
  audio.unlock();
  if (el.dataset.open) {
    audio.confirm();
    openLayer(el.dataset.open);
    return;
  }
  if (el.dataset.cycle) {
    cycleOption(el.dataset.cycle, 1);
    return;
  }
  const a = el.dataset.action;
  const played = state.round && state.round.time > 15 && state.round.phase !== 'over';
  switch (a) {
    case 'start':
      startGame(input.lastKind === 'controller' ? input.lastDevice : input.lastKind);
      break;
    case 'fullscreen':
      toggleFullscreen();
      break;
    case 'title':
      if (played) confirmThen('Leave this round and return to the title?', () => showScreen('title'));
      else showScreen('title');
      break;
    case 'lobby':
      showScreen('lobby');
      break;
    case 'levels':
      if (played) confirmThen('Leave this round and choose another sky?', () => showScreen('levels'));
      else showScreen('levels');
      break;
    case 'resume':
      resume();
      break;
    case 'restart':
      if (played) confirmThen('Restart the round? Scores so far are lost.', startRound);
      else startRound();
      break;
    case 'end-round':
      endRoundNow();
      break;
    case 'close':
      audio.back();
      closeLayer();
      break;
    case 'confirm-yes': {
      const fn = state.confirmAction;
      state.confirmAction = null;
      closeLayer();
      fn?.();
      break;
    }
    case 'join-keyboard':
      if (!joinDevice('kb1')) joinDevice('kb2');
      break;
    case 'lobby-continue':
      lobbyContinue();
      break;
  }
});
addEventListener('pointerdown', () => {
  document.body.classList.add('pointer');
  $$('.nav-focus').forEach((e) => e.classList.remove('nav-focus'));
});
for (const type of ['keydown', 'keyup']) addEventListener(type, (e) => {
  if (type === 'keydown') document.body.classList.remove('pointer');
  // Keep the browser from scrolling or activating buttons itself: menus are driven by the game.
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.code) && !(e.target instanceof HTMLInputElement && e.target.type === 'text')) {
    if (e.code !== 'Tab') e.preventDefault();
  }
});

// Pause when the page is hidden or loses focus.
document.addEventListener('visibilitychange', () => document.hidden && pause('Paused while the game was in the background.'));
addEventListener('blur', () => pause('Paused while the window was in the background.'));
input.on('disconnect', (i) => {
  const p = state.players.find((q) => q.device === 'pad' + i);
  if (p && state.round) pause(`P${p.slot + 1}’s controller disconnected. Reconnect it, then resume.`);
  else if (p && state.screen === 'lobby') leaveSlot(p);
});
input.on('connect', (i) => {
  if (state.paused && state.players.some((p) => p.device === 'pad' + i)) $('#pause-reason').textContent = 'Controller reconnected. Resume when ready.';
  else toast(`Controller ${i + 1} connected`);
});

// ---------------------------------------------------------------- assets
(function applyAssets() {
  const logo = asset('logo');
  if (logo) {
    const img = $('#logo-img');
    img.src = logo;
    img.hidden = false;
    $('#logo-text').hidden = true;
  }
  const bg = asset('titleBg');
  if (bg) $('#title-bg').style.backgroundImage = `url(${bg})`;
})();

// ---------------------------------------------------------------- main loop
// ?dt=<seconds> fixes the step per frame (browser checks on slow software WebGL).
const FIXED_DT = +new URLSearchParams(location.search).get('dt') || 0;
let last = performance.now();
function frame(nowMs) {
  const now = nowMs / 1000;
  const dt = FIXED_DT || Math.min(0.05, Math.max(0, now - last / 1000));
  last = nowMs;
  state.time = now;
  state.frames = (state.frames || 0) + 1;
  input.poll();
  const screen = state.screen;
  if (screen === 'title') updateTitle(now);
  else if (screen === 'lobby') updateLobby(now);
  else if (screen === 'levels') updateLevels(now);
  else if (screen === 'play') updatePlayInput(now);

  if (state.screen === 'play' && state.round) {
    const t0 = performance.now();
    if (!state.paused) updatePlay(dt, now);
    state.updateMs = performance.now() - t0;
    renderPlay(now);
    state.renderMs = performance.now() - t0 - state.updateMs;
  } else {
    const coverTitle = state.screen === 'title' && asset('titleBg') && !state.layers.length;
    if (!coverTitle) renderAttract(now, dt);
    if (state.screen === 'lobby') renderLobbyPreviews(now, dt);
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

syncSettingsUI();
applySettings();
resize();
showScreen('title');
requestAnimationFrame(frame);

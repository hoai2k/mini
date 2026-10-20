// Image Annotator: open a picture, mark it with arrows, circles and freehand
// lines (each with an optional title), save, then export a flattened copy.

import {
  unitOf, dist, arrowTail, hitItem, bounds, defaultArrowAngle, defaultArrowLength,
  defaultCircleRadius, simplifyPath, round1,
} from './geometry.js';
import { labelOffset } from './layout.js';
import { drawAnnotations, FONTS } from './render.js';
import {
  exportOptions, outputSize, fileName, formatBytes, canWrite, renderFile, canShareFiles, download, typeName,
} from './exporter.js';
import { loadProject, saveProject } from './store.js';
import { ICONS } from './icons.js';

const $ = (id) => document.getElementById(id);
const els = {
  start: $('start'), editor: $('editor'), stage: $('stage'), canvas: $('canvas'),
  fileInput: $('fileInput'), fileName: $('fileName'), undo: $('undoBtn'), redo: $('redoBtn'),
  save: $('saveBtn'), saveLabel: $('saveLabel'), export: $('exportBtn'), selbar: $('selbar'),
  sheet: $('sheet'), hint: $('hint'), toast: $('toast'), fit: $('fitBtn'), continue: $('continueBtn'),
};
const ctx = els.canvas.getContext('2d');

document.querySelectorAll('[data-icon]').forEach((el) => {
  el.insertAdjacentHTML('afterbegin', ICONS[el.dataset.icon] || '');
});

const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#af52de', '#ffffff', '#111111'];
const DEFAULT_STYLE = { color: '#ff3b30', width: 8, opacity: 1, font: 'sans', fontSize: 44, box: false, outline: 'auto' };
const STYLE_KEYS = Object.keys(DEFAULT_STYLE);
const PREVIEW_EDGE = 2560;
const TOOL_HINTS = {
  arrow: 'Tap the picture to point an arrow at something',
  circle: 'Tap to circle something, or drag out from the middle',
  draw: 'Draw on the picture with a finger or the mouse',
};

// ---- State ----------------------------------------------------------------

let doc = null; // { name, type, blob, image, preview, w, h, u }
let items = [];
let selectedId = null;
let tool = 'arrow';
let undoStack = [];
let redoStack = [];
let savedJSON = null; // the items as last saved (null: never saved)
let labelBoxes = new Map();
let view = { scale: 1, ox: 0, oy: 0, fitted: true };
let nextId = 1;
let styles = readStyles();
let hintShown = false;

function readStyles() {
  try {
    const s = JSON.parse(localStorage.getItem('imageannotator-styles') || '{}');
    const out = {};
    for (const t of ['arrow', 'circle', 'draw']) out[t] = { ...DEFAULT_STYLE, ...(t !== 'arrow' ? { width: 6 } : {}), ...(s[t] || {}) };
    return out;
  } catch {
    return { arrow: { ...DEFAULT_STYLE }, circle: { ...DEFAULT_STYLE, width: 6 }, draw: { ...DEFAULT_STYLE, width: 6 } };
  }
}

function rememberStyle(item) {
  const s = {};
  for (const k of STYLE_KEYS) s[k] = item[k];
  styles[item.type] = s;
  try { localStorage.setItem('imageannotator-styles', JSON.stringify(styles)); } catch { /* private mode */ }
}

const snapshot = () => JSON.stringify(items);
const selected = () => items.find((i) => i.id === selectedId) || null;
const isDirty = () => !!doc && snapshot() !== savedJSON;

function commit(before) {
  if (before === snapshot()) return;
  undoStack.push(before);
  if (undoStack.length > 200) undoStack.shift();
  redoStack = [];
  changed();
}

function restore(json) {
  items = JSON.parse(json);
  if (!selected()) selectedId = null;
  changed();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
}

function changed() {
  updateChrome();
  requestDraw();
}

// ---- Opening --------------------------------------------------------------

function guessType(file) {
  if (file.type) return file.type;
  const ext = (file.name || '').split('.').pop().toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif', avif: 'image/avif' }[ext] || '';
}

async function decode(blob) {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('decode');
  }
  return img; // the URL stays alive as long as the picture is open
}

function makePreview(img, w, h) {
  // A smaller copy for drawing the editor quickly; the full picture is drawn
  // when zoomed in past it, and always for export.
  const s = PREVIEW_EDGE / Math.max(w, h);
  if (s >= 1) return null;
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  const cx = c.getContext('2d');
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function openBlob(blob, name, type, savedItems = null) {
  let img;
  try {
    img = await decode(blob);
  } catch {
    const kind = typeName(type);
    toast(`This browser can't open ${kind === 'unknown' ? 'that file' : `${kind} pictures`}. Try a JPEG or PNG.`, 4000);
    return false;
  }
  if (doc?.image?.src?.startsWith('blob:')) URL.revokeObjectURL(doc.image.src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  doc = { name, type, blob, image: img, preview: makePreview(img, w, h), w, h, u: unitOf(w, h) };
  items = savedItems ? JSON.parse(JSON.stringify(savedItems)) : [];
  nextId = items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
  savedJSON = savedItems ? snapshot() : null;
  undoStack = [];
  redoStack = [];
  selectedId = null;
  closeSheet();
  els.start.hidden = true;
  els.editor.hidden = false;
  els.fileName.textContent = name;
  view.fitted = true;
  hintShown = !!items.length;
  resize();
  changed();
  return true;
}

async function openFile(file) {
  if (!file) return;
  if (!/^image\//.test(guessType(file)) && !/\.(heic|heif|jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name || '')) {
    toast('That isn’t a picture.');
    return;
  }
  if (isDirty() && !confirm('Open a new picture? Your changes to this one aren’t saved.')) return;
  await openBlob(file, file.name || 'image', guessType(file));
}

function pickFile() {
  els.fileInput.value = '';
  els.fileInput.click();
}

els.fileInput.addEventListener('change', () => openFile(els.fileInput.files[0]));
$('startOpen').addEventListener('click', pickFile);
$('openBtn').addEventListener('click', pickFile);
$('homeBtn').addEventListener('click', () => {
  if (isDirty() && !confirm('Leave this picture? Your changes aren’t saved.')) return;
  doc = null;
  els.editor.hidden = true;
  els.start.hidden = false;
  closeSheet();
  showContinue();
});

async function showContinue() {
  const p = await loadProject();
  if (!p || !p.blob) {
    els.continue.hidden = true;
    return;
  }
  const url = URL.createObjectURL(p.blob);
  els.continue.innerHTML = '';
  const wrap = document.createElement('span');
  wrap.className = 'continue-wrap';
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  const text = document.createElement('span');
  text.innerHTML = '<span>Continue the saved picture</span><span class="sub"></span>';
  text.querySelector('.sub').textContent = p.name;
  wrap.append(img, text);
  els.continue.append(wrap);
  els.continue.hidden = false;
  els.continue.onclick = () => openBlob(p.blob, p.name, p.type, p.items || []);
}

// Drop and paste.
for (const target of [els.start, els.stage]) {
  target.addEventListener('dragover', (e) => { e.preventDefault(); target.classList.add('drag'); });
  target.addEventListener('dragleave', () => target.classList.remove('drag'));
  target.addEventListener('drop', (e) => {
    e.preventDefault();
    target.classList.remove('drag');
    openFile(e.dataTransfer.files[0]);
  });
}
window.addEventListener('paste', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
  if (file) openFile(new File([file], file.name && file.name !== 'image.png' ? file.name : 'pasted.png', { type: file.type }));
});

// ---- View -----------------------------------------------------------------

function stageSize() {
  const r = els.stage.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function fitScale() {
  const { w, h } = stageSize();
  const m = 16;
  return Math.max(0.01, Math.min((w - 2 * m) / doc.w, (h - 2 * m) / doc.h));
}

function fit() {
  view.scale = fitScale();
  view.fitted = true;
  clampView();
}

function clampView() {
  const { w, h } = stageSize();
  const iw = doc.w * view.scale;
  const ih = doc.h * view.scale;
  view.ox = iw <= w ? (w - iw) / 2 : Math.min(0, Math.max(w - iw, view.ox));
  view.oy = ih <= h ? (h - ih) / 2 : Math.min(0, Math.max(h - ih, view.oy));
  els.fit.hidden = view.fitted || Math.abs(view.scale - fitScale()) < 1e-3;
}

function zoomAt(sx, sy, scale) {
  const f = fitScale();
  const s = Math.max(f, Math.min(f * 12, scale));
  const ix = (sx - view.ox) / view.scale;
  const iy = (sy - view.oy) / view.scale;
  view.scale = s;
  view.ox = sx - ix * s;
  view.oy = sy - iy * s;
  view.fitted = Math.abs(s - f) < 1e-3;
  clampView();
  requestDraw();
}

function resize() {
  if (!doc) return;
  const { w, h } = stageSize();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  els.canvas.width = Math.max(1, Math.round(w * dpr));
  els.canvas.height = Math.max(1, Math.round(h * dpr));
  if (view.fitted) fit();
  else clampView();
  requestDraw();
}
new ResizeObserver(resize).observe(els.stage);
els.fit.addEventListener('click', () => { fit(); requestDraw(); });

const toImage = (sx, sy) => ({ x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale });
const toScreen = (p) => ({ x: p.x * view.scale + view.ox, y: p.y * view.scale + view.oy });

function localPoint(e) {
  const r = els.stage.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

// ---- Drawing --------------------------------------------------------------

let drawQueued = false;
function requestDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    draw();
  });
}

function draw() {
  if (!doc) return;
  const dpr = els.canvas.width / Math.max(1, stageSize().w);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
  const src = doc.preview && doc.preview.width >= doc.w * view.scale * dpr ? doc.preview : doc.image;
  ctx.imageSmoothingQuality = 'high';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18 / view.scale;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, doc.w, doc.h);
  ctx.shadowColor = 'transparent';
  ctx.clearRect(0, 0, doc.w, doc.h);
  ctx.drawImage(src, 0, 0, doc.w, doc.h);
  labelBoxes = drawAnnotations(ctx, items, doc.u, doc.w, doc.h);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSelection();
}

function handle(p, kind) {
  ctx.save();
  if (kind === 'move') {
    // The centre is only marked with a small dot, so it never hides the
    // spot being pointed at; it can still be grabbed from a finger's width.
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#0a84ff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (kind === 'rotate') {
    ctx.arc(p.x, p.y, 5, -Math.PI * 0.9, Math.PI * 0.4);
  } else {
    ctx.moveTo(p.x - 5, p.y + 5); ctx.lineTo(p.x + 5, p.y - 5);
    ctx.moveTo(p.x + 1, p.y - 5); ctx.lineTo(p.x + 5, p.y - 5); ctx.lineTo(p.x + 5, p.y - 1);
    ctx.moveTo(p.x - 1, p.y + 5); ctx.lineTo(p.x - 5, p.y + 5); ctx.lineTo(p.x - 5, p.y + 1);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSelection() {
  const item = selected();
  if (!item) return;
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  const dashed = (fn) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineDashOffset = 6;
    fn(); ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineDashOffset = 0;
    fn(); ctx.stroke();
  };
  if (item.type === 'arrow') {
    const c = toScreen(item);
    dashed(() => { ctx.beginPath(); ctx.arc(c.x, c.y, item.length * view.scale, 0, Math.PI * 2); });
    ctx.restore();
    handle(c, 'move');
    handle(toScreen(arrowTail(item)), 'rotate');
  } else if (item.type === 'circle') {
    const c = toScreen(item);
    const r = item.r * view.scale;
    const half = (item.width * doc.u * view.scale) / 2 + 4;
    dashed(() => { ctx.beginPath(); ctx.arc(c.x, c.y, r + half, 0, Math.PI * 2); });
    ctx.restore();
    handle(c, 'move');
    handle({ x: c.x + (r + 0) * Math.SQRT1_2, y: c.y + r * Math.SQRT1_2 }, 'resize');
  } else {
    const b = bounds(item, doc.u);
    const a = toScreen(b);
    dashed(() => { ctx.beginPath(); ctx.rect(a.x - 4, a.y - 4, b.w * view.scale + 8, b.h * view.scale + 8); });
    ctx.restore();
  }
  const box = labelBoxes.get(item.id);
  if (box) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    const a = toScreen(box);
    ctx.strokeRect(a.x - 3, a.y - 3, box.w * view.scale + 6, box.h * view.scale + 6);
    ctx.restore();
  }
}

// ---- Pointer gestures -----------------------------------------------------

const pointers = new Map();
let gesture = null;
let pinch = null;

function labelAt(p) {
  for (let i = items.length - 1; i >= 0; i--) {
    const b = labelBoxes.get(items[i].id);
    if (b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return items[i];
  }
  return null;
}

function newItem(type, p) {
  const s = styles[type];
  const base = { id: nextId++, type, ...s, title: '', textOn: false, label: null };
  // Big enough to grab on a phone however the picture is zoomed, but never
  // more than about half the picture.
  const cap = Math.min(doc.w, doc.h) * 0.45;
  if (type === 'arrow') {
    const length = round1(Math.min(cap, Math.max(defaultArrowLength(doc.w, doc.h), 110 / view.scale)));
    return { ...base, x: round1(p.x), y: round1(p.y), angle: defaultArrowAngle(p, doc.w, doc.h, length), length };
  }
  if (type === 'circle') return { ...base, x: round1(p.x), y: round1(p.y), r: round1(Math.min(cap, Math.max(defaultCircleRadius(doc.w, doc.h), 40 / view.scale))) };
  return { ...base, x: 0, y: 0, points: [[round1(p.x), round1(p.y)]] };
}

function select(id) {
  if (selectedId === id) return;
  selectedId = id;
  if (!id) closeSheet();
  else if (!els.sheet.hidden) fillSheet();
  updateChrome();
  requestDraw();
}

els.stage.addEventListener('pointerdown', (e) => {
  if (!doc || e.target !== els.canvas) return;
  if (e.button > 0) return;
  els.stage.setPointerCapture(e.pointerId);
  const sp = localPoint(e);
  pointers.set(e.pointerId, sp);
  if (pointers.size === 2) {
    cancelGesture();
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scale: view.scale, ox: view.ox, oy: view.oy };
    return;
  }
  if (pointers.size > 2) return;
  const p = toImage(sp.x, sp.y);
  const touch = e.pointerType !== 'mouse';
  const tol = (touch ? 20 : 9) / view.scale;
  const before = snapshot();
  gesture = { id: e.pointerId, start: sp, startP: p, moved: false, before, slop: touch ? 8 : 4, kind: null, item: null };
  const sel = selected();
  let hit = null;
  if (sel) {
    if (labelAt(p) === sel) hit = { item: sel, kind: 'label' };
    else {
      const k = hitItem(sel, p, tol, doc.u, true);
      if (k) hit = { item: sel, kind: k };
    }
  }
  if (!hit) {
    const l = labelAt(p);
    if (l) hit = { item: l, kind: 'label' };
  }
  if (!hit) {
    for (let i = items.length - 1; i >= 0; i--) {
      const k = hitItem(items[i], p, tol, doc.u, false);
      if (k) { hit = { item: items[i], kind: k }; break; }
    }
  }
  if (hit && tool === 'draw' && hit.kind !== 'label' && hit.item.id !== selectedId) {
    // Free draw draws over other marks; a plain tap still picks one.
    gesture.tapTarget = hit.item.id;
    hit = null;
  }
  if (hit) {
    select(hit.item.id);
    gesture.kind = hit.kind;
    gesture.item = hit.item;
    gesture.orig = JSON.parse(JSON.stringify(hit.item));
    if (hit.kind === 'label') {
      const b = labelBoxes.get(hit.item.id);
      gesture.boxCenter = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    }
    return;
  }
  // Empty spot: the tool decides.
  if (p.x < 0 || p.y < 0 || p.x > doc.w || p.y > doc.h) {
    gesture.kind = 'pan';
    gesture.view = { ox: view.ox, oy: view.oy };
    return;
  }
  if (tool === 'draw') {
    gesture.kind = 'draw';
    gesture.path = [[p.x, p.y]];
    return;
  }
  const item = newItem(tool, p);
  items.push(item);
  select(item.id);
  gesture.kind = tool === 'arrow' ? 'create-arrow' : 'create-circle';
  gesture.item = item;
  hideHint();
  changed();
});

els.stage.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  const sp = localPoint(e);
  pointers.set(e.pointerId, sp);
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const f = fitScale();
    const s = Math.max(f, Math.min(f * 12, (pinch.scale * d) / pinch.d));
    const ix = (pinch.mid.x - pinch.ox) / pinch.scale;
    const iy = (pinch.mid.y - pinch.oy) / pinch.scale;
    view.scale = s;
    view.ox = mid.x - ix * s;
    view.oy = mid.y - iy * s;
    view.fitted = Math.abs(s - f) < 1e-3;
    clampView();
    requestDraw();
    return;
  }
  const g = gesture;
  if (!g || g.id !== e.pointerId) return;
  if (!g.moved && Math.hypot(sp.x - g.start.x, sp.y - g.start.y) < g.slop) return;
  g.moved = true;
  const p = toImage(sp.x, sp.y);
  const dx = p.x - g.startP.x;
  const dy = p.y - g.startP.y;
  const it = g.item;
  const minLen = 24 * doc.u;
  switch (g.kind) {
    case 'pan':
      view.ox = g.view.ox + sp.x - g.start.x;
      view.oy = g.view.oy + sp.y - g.start.y;
      clampView();
      break;
    case 'move':
      it.x = round1(g.orig.x + dx);
      it.y = round1(g.orig.y + dy);
      break;
    case 'rotate':
      it.angle = Math.atan2(it.y - p.y, it.x - p.x);
      break;
    case 'resize':
      it.r = round1(Math.max(6 * doc.u, dist(p, it)));
      break;
    case 'label':
      it.label = labelOffset(it, { x: g.boxCenter.x + dx, y: g.boxCenter.y + dy }, doc.u);
      it.label.dx = round1(it.label.dx);
      it.label.dy = round1(it.label.dy);
      break;
    case 'create-arrow': {
      // Pressed on the spot to point at, dragged out to where the tail goes.
      const d = dist(p, it);
      if (d > minLen) {
        it.angle = Math.atan2(it.y - p.y, it.x - p.x);
        it.length = round1(d);
      }
      break;
    }
    case 'create-circle':
      it.r = round1(Math.max(6 * doc.u, dist(p, it)));
      break;
    case 'draw':
      g.path.push([p.x, p.y]);
      if (!g.item) {
        const item = newItem('draw', { x: g.path[0][0], y: g.path[0][1] });
        items.push(item);
        g.item = item;
        hideHint();
      }
      g.item.points = g.path.map(([x, y]) => [round1(x), round1(y)]);
      break;
    default:
      return;
  }
  requestDraw();
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pinch) {
    if (pointers.size < 2) pinch = null;
    return;
  }
  const g = gesture;
  if (!g || g.id !== e.pointerId) return;
  gesture = null;
  if (e.type === 'pointercancel') {
    restore(g.before);
    return;
  }
  if (g.kind === 'draw') {
    if (g.item) {
      g.item.points = simplifyPath(g.path, 1.5 * doc.u).map(([x, y]) => [round1(x), round1(y)]);
      select(g.item.id);
    } else {
      select(g.tapTarget || null); // a tap picks a mark, or lets go of the selection
    }
  } else if (g.kind === 'pan' && !g.moved) {
    select(null);
  }
  commit(g.before);
  if (g.item && g.moved) rememberStyle(g.item);
}
els.stage.addEventListener('pointerup', endPointer);
els.stage.addEventListener('pointercancel', endPointer);

// A second finger turns a stroke or drag into a pinch: undo what the first
// finger had started.
function cancelGesture() {
  if (!gesture) return;
  const g = gesture;
  gesture = null;
  items = JSON.parse(g.before);
  if (!selected()) selectedId = null;
  changed();
}

els.stage.addEventListener('wheel', (e) => {
  if (!doc) return;
  e.preventDefault();
  const sp = localPoint(e);
  if (e.ctrlKey || e.metaKey || e.deltaMode === 1) {
    zoomAt(sp.x, sp.y, view.scale * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.01)));
  } else {
    view.ox -= e.deltaX;
    view.oy -= e.deltaY;
    view.fitted = false;
    clampView();
    requestDraw();
  }
}, { passive: false });

// ---- Tools and chrome -----------------------------------------------------

function setTool(t) {
  tool = t;
  document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  if (!hintShown || !items.length) showHint();
}
document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => {
  setTool(b.dataset.tool);
  select(null);
}));

function showHint() {
  if (!doc) return;
  els.hint.textContent = TOOL_HINTS[tool];
  els.hint.hidden = false;
}
function hideHint() {
  hintShown = true;
  els.hint.hidden = true;
}

function updateChrome() {
  const sel = selected();
  els.selbar.hidden = !sel;
  els.undo.disabled = !undoStack.length;
  els.redo.disabled = !redoStack.length;
  const dirty = isDirty();
  els.save.classList.toggle('saved', !dirty && savedJSON !== null);
  els.saveLabel.textContent = !dirty && savedJSON !== null ? 'Saved' : 'Save';
  const canExport = !!doc && savedJSON !== null && !dirty;
  els.export.classList.toggle('is-disabled', !canExport);
  els.export.setAttribute('aria-disabled', String(!canExport));
  if (items.length) els.hint.hidden = true;
  else if (doc && !hintShown) showHint();
  if (sel && !els.sheet.hidden) syncSheet();
}

let toastTimer = 0;
function toast(msg, ms = 2200) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

$('doneBtn').addEventListener('click', () => select(null));
function deleteSelected() {
  const sel = selected();
  if (!sel) return;
  const before = snapshot();
  items = items.filter((i) => i !== sel);
  selectedId = null;
  closeSheet();
  commit(before);
}
$('deleteBtn').addEventListener('click', deleteSelected);
$('sheetDelete').addEventListener('click', deleteSelected);
els.undo.addEventListener('click', undo);
els.redo.addEventListener('click', redo);

// ---- Edit sheet -----------------------------------------------------------

const sheet = {
  title: $('sheetTitle'), swatches: $('swatches'), width: $('width'), widthOut: $('widthOut'),
  opacity: $('opacity'), opacityOut: $('opacityOut'), lengthField: $('lengthField'), length: $('length'),
  lengthOut: $('lengthOut'), titleInput: $('titleInput'), titleOpts: $('titleOpts'), font: $('font'),
  fontSize: $('fontSize'), fontSizeOut: $('fontSizeOut'), box: $('boxInput'), autoPlace: $('autoPlace'),
  textOn: $('textOn'), outline: $('outlineSwatches'), outlineLabel: $('outlineLabel'),
};
// Text outline (or background) colors; 'none' is transparent.
const OUTLINES = [
  { id: 'auto', name: 'Automatic: black or white' },
  { id: 'none', name: 'None (transparent)' },
  { id: '#ffffff', name: 'White' },
  { id: '#111111', name: 'Black' },
];
const NAMES = { arrow: 'Arrow', circle: 'Circle', draw: 'Drawing' };

for (const f of FONTS) {
  const o = document.createElement('option');
  o.value = f.id;
  o.textContent = f.name;
  o.style.fontFamily = f.css;
  sheet.font.append(o);
}
for (const c of COLORS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.style.background = c;
  b.dataset.color = c;
  b.setAttribute('aria-label', `Color ${c}`);
  sheet.swatches.append(b);
}
const custom = document.createElement('label');
custom.className = 'swatch custom';
custom.title = 'Any color';
custom.innerHTML = '<input type="color" aria-label="Any color">';
sheet.swatches.append(custom);
const customInput = custom.querySelector('input');
for (const o of OUTLINES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `swatch${o.id === 'auto' ? ' auto' : o.id === 'none' ? ' none' : ''}`;
  if (o.id.startsWith('#')) b.style.background = o.id;
  b.dataset.outline = o.id;
  b.title = o.name;
  b.setAttribute('aria-label', `Outline: ${o.name}`);
  sheet.outline.append(b);
}
const outlineCustom = document.createElement('label');
outlineCustom.className = 'swatch custom';
outlineCustom.title = 'Any color';
outlineCustom.innerHTML = '<input type="color" aria-label="Outline: any color">';
sheet.outline.append(outlineCustom);
const outlineInput = outlineCustom.querySelector('input');

let editBefore = null;
function editStart() {
  if (editBefore === null) editBefore = snapshot();
}
function editEnd() {
  if (editBefore === null) return;
  const b = editBefore;
  editBefore = null;
  commit(b);
  const sel = selected();
  if (sel) rememberStyle(sel);
}
function edit(fn) {
  const sel = selected();
  if (!sel) return;
  editStart();
  fn(sel);
  changed();
}

sheet.swatches.addEventListener('click', (e) => {
  const b = e.target.closest('[data-color]');
  if (!b) return;
  edit((s) => { s.color = b.dataset.color; });
  editEnd();
});
customInput.addEventListener('input', () => edit((s) => { s.color = customInput.value; }));
customInput.addEventListener('change', editEnd);

sheet.outline.addEventListener('click', (e) => {
  const b = e.target.closest('[data-outline]');
  if (!b) return;
  edit((s) => { s.outline = b.dataset.outline; });
  editEnd();
});
outlineInput.addEventListener('input', () => edit((s) => { s.outline = outlineInput.value; }));
outlineInput.addEventListener('change', editEnd);

sheet.textOn.addEventListener('change', () => {
  edit((s) => { s.textOn = sheet.textOn.checked; });
  editEnd();
  if (sheet.textOn.checked && !sheet.titleInput.value.trim()) sheet.titleInput.focus();
});

function slider(input, apply) {
  input.addEventListener('input', () => edit((s) => apply(s, Number(input.value))));
  input.addEventListener('change', editEnd);
}
slider(sheet.width, (s, v) => { s.width = v; });
slider(sheet.opacity, (s, v) => { s.opacity = v / 100; });
slider(sheet.length, (s, v) => { s.length = round1(v * doc.u); });
slider(sheet.fontSize, (s, v) => { s.fontSize = v; });
sheet.titleInput.addEventListener('input', () => edit((s) => { s.title = sheet.titleInput.value; }));
sheet.titleInput.addEventListener('change', editEnd);
sheet.titleInput.addEventListener('blur', editEnd);
sheet.titleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sheet.titleInput.blur();
});
sheet.font.addEventListener('change', () => { edit((s) => { s.font = sheet.font.value; }); editEnd(); });
sheet.box.addEventListener('change', () => { edit((s) => { s.box = sheet.box.checked; }); editEnd(); });
sheet.autoPlace.addEventListener('click', () => { edit((s) => { s.label = null; }); editEnd(); });

function syncSheet() {
  const s = selected();
  if (!s) return;
  sheet.title.textContent = `Edit ${NAMES[s.type].toLowerCase()}`;
  sheet.swatches.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === s.color.toLowerCase())));
  custom.setAttribute('aria-pressed', String(!COLORS.includes(s.color.toLowerCase())));
  if (document.activeElement !== customInput) customInput.value = /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : '#ff3b30';
  sheet.width.value = s.width;
  sheet.widthOut.textContent = s.width;
  sheet.opacity.value = Math.round(s.opacity * 100);
  sheet.opacityOut.textContent = `${Math.round(s.opacity * 100)}%`;
  sheet.lengthField.hidden = s.type !== 'arrow';
  if (s.type === 'arrow') {
    const v = Math.round(s.length / doc.u);
    sheet.length.max = Math.max(800, v);
    sheet.length.value = v;
    sheet.lengthOut.textContent = v;
  }
  if (document.activeElement !== sheet.titleInput) sheet.titleInput.value = s.title || '';
  const textOn = s.textOn ?? !!(s.title || '').trim();
  sheet.textOn.checked = textOn;
  sheet.titleOpts.hidden = !textOn;
  const outline = s.outline || 'auto';
  sheet.outline.querySelectorAll('[data-outline]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.outline === outline)));
  outlineCustom.setAttribute('aria-pressed', String(!OUTLINES.some((o) => o.id === outline)));
  if (document.activeElement !== outlineInput && /^#[0-9a-f]{6}$/i.test(outline)) outlineInput.value = outline;
  sheet.outlineLabel.textContent = s.box ? 'Background color' : 'Text outline';
  sheet.font.value = s.font;
  sheet.fontSize.value = s.fontSize;
  sheet.fontSizeOut.textContent = s.fontSize;
  sheet.box.checked = !!s.box;
  sheet.autoPlace.hidden = !s.label;
}

function fillSheet() {
  editEnd();
  syncSheet();
}
function openSheet() {
  if (!selected()) return;
  els.sheet.hidden = false;
  fillSheet();
}
function closeSheet() {
  editEnd();
  if (document.activeElement && els.sheet.contains(document.activeElement)) document.activeElement.blur();
  els.sheet.hidden = true;
}
$('settingsBtn').addEventListener('click', () => (els.sheet.hidden ? openSheet() : closeSheet()));
$('sheetClose').addEventListener('click', closeSheet);

// ---- Save and export ------------------------------------------------------

async function save() {
  if (!doc) return;
  editEnd();
  const json = snapshot();
  try {
    await saveProject({ name: doc.name, type: doc.type, blob: doc.blob, w: doc.w, h: doc.h, items: JSON.parse(json), savedAt: Date.now() });
    toast('Saved');
  } catch {
    toast('Saved for now (this browser won’t keep it after closing)', 3500);
  }
  savedJSON = json;
  updateChrome();
}
els.save.addEventListener('click', save);

const dlg = $('exportDlg');
const exportState = { options: [], results: new Map(), choice: null, json: null };
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const coarse = matchMedia('(pointer: coarse)').matches;

function exportFile(opt) {
  const r = exportState.results.get(opt.id);
  return r && new File([r.blob], fileName(doc.name, opt), { type: opt.mime, lastModified: Date.now() });
}

function renderOptions() {
  const box = $('exportOpts');
  box.innerHTML = '';
  for (const opt of exportState.options) {
    const label = document.createElement('label');
    label.className = `option${opt.disabled ? ' disabled' : ''}`;
    const size = outputSize(doc.w, doc.h, opt);
    const r = exportState.results.get(opt.id);
    label.innerHTML = '<input type="radio" name="fmt"><b></b><small></small><span class="size"></span>';
    const input = label.querySelector('input');
    input.value = opt.id;
    input.disabled = !!opt.disabled;
    input.checked = exportState.choice === opt.id;
    input.addEventListener('change', () => { exportState.choice = opt.id; updateExportButtons(); });
    label.querySelector('b').textContent = opt.label;
    label.querySelector('small').textContent = opt.note;
    label.querySelector('.size').textContent = opt.disabled ? '' : `${size.w} × ${size.h} px · ${r ? formatBytes(r.blob.size) : 'working…'}`;
    box.append(label);
  }
}

function updateExportButtons() {
  const opt = exportState.options.find((o) => o.id === exportState.choice);
  const ready = !!(opt && exportState.results.get(opt.id));
  const go = $('exportGo');
  const alt = $('exportAlt');
  const file = ready ? exportFile(opt) : null;
  const share = file ? canShareFiles(file) : !!navigator.share;
  let primary = 'download';
  if (isIOS && share) primary = 'share';
  else if (!coarse && window.showSaveFilePicker) primary = 'picker';
  const labels = {
    share: 'Save to Photos or Files',
    download: isAndroid ? 'Save to Downloads' : 'Download',
    picker: 'Save as…',
  };
  go.textContent = ready ? labels[primary] : 'Preparing…';
  go.disabled = !ready;
  go.dataset.mode = primary;
  const altMode = primary === 'share' ? 'download' : share ? 'share' : null;
  alt.hidden = !altMode;
  if (altMode) {
    alt.textContent = altMode === 'share' ? 'Share…' : 'Download';
    alt.dataset.mode = altMode;
    alt.disabled = !ready;
  }
  $('exportNote').textContent = primary === 'share'
    ? 'In the share sheet, choose “Save Image” to put it in Photos, or “Save to Files”.'
    : isAndroid ? 'The picture goes to Downloads, where Files and Photos find it. Share… sends it to another app.' : '';
}

async function openExport() {
  if (!doc) return;
  if (isDirty() || savedJSON === null) {
    toast('Save first, then export');
    return;
  }
  const json = snapshot();
  if (exportState.json !== json || exportState.doc !== doc) exportState.results = new Map();
  exportState.json = json;
  exportState.doc = doc;
  exportState.options = exportOptions(doc.type, canWrite);
  if (!exportState.choice || exportState.options.find((o) => o.id === exportState.choice)?.disabled) {
    exportState.choice = exportState.options[0].disabled ? 'jpeg' : 'original';
  }
  renderOptions();
  updateExportButtons();
  dlg.showModal();
  // Make every file up front, so the save button can hand one over straight
  // away (iOS only shares in direct answer to a tap).
  const order = [...exportState.options].sort((a, b) => (a.id === exportState.choice ? -1 : b.id === exportState.choice ? 1 : 0));
  for (const opt of order) {
    if (opt.disabled || exportState.results.has(opt.id)) continue;
    try {
      const r = await renderFile(doc.image, doc.w, doc.h, JSON.parse(json), opt);
      if (exportState.json !== json) return;
      if (opt.mime && r.blob.type && r.blob.type !== opt.mime) {
        opt.disabled = true;
        opt.note = `This browser can't write ${typeName(opt.mime)} files. Choose JPEG instead.`;
        if (exportState.choice === opt.id) exportState.choice = 'jpeg';
      } else {
        exportState.results.set(opt.id, r);
      }
    } catch {
      opt.disabled = true;
      opt.note = 'This picture is too big for this browser to write in that format.';
    }
    renderOptions();
    updateExportButtons();
  }
}
els.export.addEventListener('click', openExport);

async function deliver(mode) {
  const opt = exportState.options.find((o) => o.id === exportState.choice);
  const file = opt && exportFile(opt);
  if (!file) return;
  try {
    if (mode === 'share') {
      await navigator.share({ files: [file], title: file.name });
      dlg.close();
      return;
    }
    if (mode === 'picker') {
      const ext = file.name.split('.').pop();
      const handle = await window.showSaveFilePicker({ suggestedName: file.name, types: [{ description: typeName(opt.mime), accept: { [opt.mime]: [`.${ext}`] } }] });
      const w = await handle.createWritable();
      await w.write(file);
      await w.close();
      dlg.close();
      toast('Exported');
      return;
    }
    download(file, file.name);
    dlg.close();
    toast(isAndroid ? 'Saved to Downloads' : 'Downloaded');
  } catch (err) {
    if (err && err.name === 'AbortError') return; // closed the share sheet or the save window
    download(file, file.name);
    dlg.close();
    toast('Downloaded');
  }
}
$('exportGo').addEventListener('click', (e) => deliver(e.currentTarget.dataset.mode));
$('exportAlt').addEventListener('click', (e) => deliver(e.currentTarget.dataset.mode));

// ---- Keys -----------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (!doc || els.editor.hidden) return;
  const typing = e.target.closest?.('input, select, textarea');
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
  if (typing || dlg.open) return;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (mod) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
  else if (e.key === 'Escape') select(null);
  else if (e.key === 'a') setTool('arrow');
  else if (e.key === 'c') setTool('circle');
  else if (e.key === 'd') setTool('draw');
  else if (e.key === '+' || e.key === '=') { const s = stageSize(); zoomAt(s.w / 2, s.h / 2, view.scale * 1.25); }
  else if (e.key === '-') { const s = stageSize(); zoomAt(s.w / 2, s.h / 2, view.scale / 1.25); }
  else if (e.key === '0') { fit(); requestDraw(); }
});

window.addEventListener('beforeunload', (e) => {
  if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

// ---- Start ----------------------------------------------------------------

async function loadArt() {
  // Delivered artwork replaces the stand-ins (see design/image-requests.md).
  let list = [];
  try { list = await (await fetch('data/asset-list.json')).json(); } catch { /* offline first visit */ }
  const has = (id) => list.find((a) => a.id === id && a.status !== 'requested');
  const welcome = $('welcome');
  if (has('welcome')) {
    welcome.innerHTML = `<img src="${has('welcome').file}" alt="">`;
  } else {
    welcome.innerHTML = `<svg viewBox="0 0 280 210" aria-hidden="true">
      <g transform="rotate(-8 140 110)"><rect x="52" y="44" width="150" height="112" rx="6" fill="#e9e4da"/><rect x="62" y="54" width="130" height="80" fill="#8fb3c9"/><path d="M62 134l40-38 26 22 22-16 42 32z" fill="#5b8a5a"/></g>
      <g transform="rotate(5 150 110)"><rect x="80" y="52" width="150" height="112" rx="6" fill="#f4f2ee"/><rect x="90" y="62" width="130" height="80" fill="#a9c7d9"/><circle cx="196" cy="80" r="10" fill="#ffd36b"/><path d="M90 142l46-44 30 26 20-14 34 32z" fill="#6d9b67"/></g>
      <circle cx="140" cy="108" r="24" fill="none" stroke="#ff4d4f" stroke-width="5" stroke-linecap="round" stroke-dasharray="140 12"/>
      <path d="M232 178 168 128" stroke="#ff4d4f" stroke-width="7" stroke-linecap="round"/><path d="M160 122l26 4-13 16z" fill="#ff4d4f"/>
    </svg>`;
  }
  if (has('logo')) {
    const logo = $('logo');
    logo.src = has('logo').file;
    logo.onload = () => { logo.hidden = false; $('titleText').hidden = true; };
  }
}

// For the browser tests: ?test exposes the state read-only.
if (new URLSearchParams(location.search).has('test')) {
  window.__annotator = { items: () => JSON.parse(snapshot()), labels: () => Object.fromEntries(labelBoxes), view: () => ({ ...view }) };
}

if (coarse) $('dropHint').hidden = true;
setTool('arrow');
loadArt();
showContinue();
updateChrome();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

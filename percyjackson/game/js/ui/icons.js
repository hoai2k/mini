// Item icons: the icon sheets of design/image-requests.md "Round 6 · Loot"
// (icons-weapons-1, icons-weapons-2, icons-armour, icons-magic), each a grid
// of 256-pixel cells on flat magenta. Once a sheet is delivered to
// game/assets/ and named in assets/icons.json, loadIcons() keys out the
// magenta, finds each item's picture and maps its id to it; until then (or if
// a sheet fails to load, or a cell turns out empty) the item's emoji
// (loot.js `icon`) stands in. Only sheets listed in icons.json are requested,
// so a missing sheet never costs a failed request (test/loot.test.mjs keeps
// the list in step with the files in the folder).
//
// The cell order is the request's (build_requests.py icon_sheet lists), read
// left to right, top to bottom.
//
// The delivered sheets keep that order but not the grid's edges: the pictures
// drift up to a quarter of a cell and many (spears, glows, sparks) reach over
// a cell line into the next, so a plain 256-pixel cut slices them and pulls in
// a neighbour's tip. segmentSheet() therefore finds each picture itself: it
// labels the connected shapes on the keyed sheet (sparks and notes are shapes
// of their own), gives each shape to the cell its centre lies in, and cuts
// every item as the union of its shapes, masked so that a neighbour reaching
// into its box stays out. The same code cuts the loot kit (ui/lootkit.js).
export const CELL = 256;
export const ICON_SHEETS = {
  'icons-weapons-1': { cols: 4, rows: 4, ids: ['training_sword', 'bronze_dagger', 'camp_spear', 'club', 'bronze_axe', 'shepherd_crook', 'xiphos', 'hammer', 'reed_staff', 'lamer', 'labrys', 'kopis', 'dory', 'fang_dagger', 'ram_mace', 'forge_sword'] },
  'icons-weapons-2': { cols: 4, rows: 4, ids: ['backbiter', 'stygian_blade', 'twin_daggers', 'imperial_gladius', 'harpe', 'heracles_club', 'pelian_spear', 'ares_sword', 'boreas_axe', 'storm_spear', 'trident_blade', 'hunter_knives', 'fury_lash', 'minotaur_horn', 'chimera_fang', 'procrustes_axe'] },
  'icons-armour': { cols: 6, rows: 4, ids: ['camp_shirt', 'bronze_breastplate', 'hermes_uniform', 'linothorax', 'biker_jacket', 'hunter_parka', 'sea_armor', 'hoplite_panoply', 'spartan_cloak', 'satyr_vest', 'nemean_pelt', 'fleece_cloak', 'forge_apron', 'amazon_armor', 'achilles_armor', 'hebe_robe', 'wind_cloak', 'hermes_cap', 'counsellor_vest', 'lotus_robe', 'mist_cloak', 'fury_wings', 'hellhound_hide', 'drakon_scale'] },
  'icons-magic': { cols: 7, rows: 4, ids: ['master_bolt', 'hephaestus_net', 'medusa_head', 'nemesis_coin', 'aegis', 'pegasus_whistle', 'nectar_flask', 'bag_of_winds', 'helm_of_darkness', 'winged_shoes', 'greek_fire', 'zeus_thunder', 'orpheus_lyre', 'apple_of_discord', 'athena_owl', 'ariadne_thread', 'caduceus', 'boar_tusk', 'trident_charm', 'sun_chariot', 'kronos_hourglass', 'cornucopia', 'stymphalian_feathers', 'ares_shield', 'lotus_card', 'cerberus_ball', 'dionysus_vine', 'hermes_vitamins'] },
};
// item id -> [sheet, cell index]
export const ICON_CELL = Object.fromEntries(Object.entries(ICON_SHEETS).flatMap(([sheet, S]) => S.ids.map((id, i) => [id, [sheet, i]])));

// ---- keying and segmentation (pure: RGBA arrays in, numbers out; tested in node)

// Key flat magenta out of RGBA `d` in place (as ui/art.js keyMagenta): how
// magenta a pixel is sets its alpha, and the magenta spill is taken back out
// of the soft edges.
export function keyMagentaData(d) {
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], m = Math.min(r, b) - g;
    const a = 1 - Math.min(1, Math.max(0, (m - 60) / 110));
    if (a >= 1) continue;
    if (a <= 0.02) { d[i + 3] = 0; continue; }
    d[i] = Math.max(0, Math.min(255, (r - (1 - a) * 255) / a)); d[i + 2] = Math.max(0, Math.min(255, (b - (1 - a) * 255) / a)); d[i + 3] = Math.round(d[i + 3] * a);
  }
  return d;
}
// Key a white glow drawn over magenta (the kit's beam, glint and twinkle):
// magenta has no green, so the green channel is the glow's strength. The
// result is white with that alpha, for the game to tint.
export function keyWhiteGlowData(d) {
  for (let i = 0; i < d.length; i += 4) {
    const a = Math.max(0, Math.min(1, (d[i + 1] - 8) / 240));
    d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(255 * a);
  }
  return d;
}
// Label the shapes of keyed RGBA `d` (w × hh) on a grid of `B`-pixel blocks.
// A block is solid when any of its pixels is more than `solid` opaque; solid
// blocks that touch (8-way) form one shape. Faint blocks (any alpha above
// `faint`) within `halo` blocks of a shape join it (glows, soft edges); the
// rest is dropped as dust. Returns { B, gw, gh, label (Int32Array, 0 = none),
// shapes: [{ id, x0, y0, x1, y1 (pixels, x1/y1 exclusive), cx, cy, n }] }.
export function segmentData(d, w, hh, { B = 2, solid = 0.3, faint = 0.04, halo = 3, minBlocks = 3 } = {}) {
  const gw = Math.ceil(w / B), gh = Math.ceil(hh / B), N = gw * gh;
  const amax = new Float32Array(N), asum = new Float32Array(N);
  for (let y = 0; y < hh; y++) {
    const gy = (y / B) | 0;
    for (let x = 0; x < w; x++) {
      const a = d[(y * w + x) * 4 + 3] / 255, k = gy * gw + ((x / B) | 0);
      if (a > amax[k]) amax[k] = a; asum[k] += a;
    }
  }
  const label = new Int32Array(N), stack = new Int32Array(N);
  const shapes = [];
  let next = 0;
  for (let s = 0; s < N; s++) {
    if (label[s] || amax[s] <= solid) continue;
    const id = ++next; let top = 0, n = 0, sw = 0, sx = 0, sy = 0, x0 = gw, y0 = gh, x1 = 0, y1 = 0;
    stack[top++] = s; label[s] = id;
    while (top) {
      const k = stack[--top], kx = k % gw, ky = (k / gw) | 0;
      n++; const wt = asum[k] + 1e-6; sw += wt; sx += (kx + 0.5) * wt; sy += (ky + 0.5) * wt;
      if (kx < x0) x0 = kx; if (kx > x1) x1 = kx; if (ky < y0) y0 = ky; if (ky > y1) y1 = ky;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = kx + dx, ny = ky + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const q = ny * gw + nx; if (!label[q] && amax[q] > solid) { label[q] = id; stack[top++] = q; }
      }
    }
    shapes.push({ id, x0, y0, x1, y1, cx: sx / sw, cy: sy / sw, n, w: sw });
  }
  // the halo: faint blocks near a shape join it (a breadth-first grow, `halo` steps)
  let front = [];
  for (let k = 0; k < N; k++) if (label[k]) front.push(k);
  for (let step = 0; step < halo && front.length; step++) {
    const nf = [];
    for (const k of front) {
      const kx = k % gw, ky = (k / gw) | 0, id = label[k];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = kx + dx, ny = ky + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const q = ny * gw + nx; if (!label[q] && amax[q] > faint) {
          label[q] = id; nf.push(q);
          const S = shapes[id - 1]; if (nx < S.x0) S.x0 = nx; if (nx > S.x1) S.x1 = nx; if (ny < S.y0) S.y0 = ny; if (ny > S.y1) S.y1 = ny;
        }
      }
    }
    front = nf;
  }
  const keep = shapes.filter((S) => S.n >= minBlocks).map((S) => ({ id: S.id, x0: S.x0 * B, y0: S.y0 * B, x1: Math.min(w, (S.x1 + 1) * B), y1: Math.min(hh, (S.y1 + 1) * B), cx: S.cx * B, cy: S.cy * B, n: S.n }));
  return { B, gw, gh, label, shapes: keep };
}
// Give each shape to the grid cell its centre lies in (cols × rows over w × hh).
// Returns per cell { ids: [shape ids], x0, y0, x1, y1 } (null for an empty cell).
// The bodies (shapes of at least 2% of a cell) go by their centre; a small
// shape (a spark, a note, an ember) joins the nearest body's cell instead,
// and is dropped if no body is within a fifth of a cell of it: a spark from
// the sword below never lands in this cell.
export function cellsOf(seg, w, hh, cols, rows) {
  const cw = w / cols, ch = hh / rows, cells = Array.from({ length: cols * rows }, () => null);
  const big = (S) => S.n * seg.B * seg.B >= cw * ch * 0.02;
  const add = (i, S) => {
    const c = cells[i] ?? (cells[i] = { ids: [], x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, n: 0, bodies: [] });
    c.ids.push(S.id); c.n += S.n; if (big(S)) c.bodies.push(S);
    c.x0 = Math.min(c.x0, S.x0); c.y0 = Math.min(c.y0, S.y0); c.x1 = Math.max(c.x1, S.x1); c.y1 = Math.max(c.y1, S.y1);
  };
  for (const S of seg.shapes) if (big(S)) add(Math.min(rows - 1, Math.max(0, Math.floor(S.cy / ch))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(S.cx / cw))), S);
  const reach = Math.min(cw, ch) / 5;
  for (const S of seg.shapes) {
    if (big(S)) continue;
    let best = -1, bd = reach;
    cells.forEach((c, i) => { for (const T of c?.bodies ?? []) { const dx = Math.max(T.x0 - S.cx, 0, S.cx - T.x1), dy = Math.max(T.y0 - S.cy, 0, S.cy - T.y1), dd = Math.hypot(dx, dy); if (dd < bd) { bd = dd; best = i; } } });
    if (best >= 0) add(best, S);
  }
  // a cell without a body (only dust) is empty
  return cells.map((c) => (c && c.bodies.length ? c : null));
}
// Give each shape to the named region (sheet pixels [x0, y0, x1, y1]) its centre lies in.
export function regionsOf(seg, regions) {
  const out = {};
  for (const [name, [rx0, ry0, rx1, ry1]] of Object.entries(regions)) {
    const ss = seg.shapes.filter((S) => S.cx >= rx0 && S.cx < rx1 && S.cy >= ry0 && S.cy < ry1);
    out[name] = ss.length ? { ids: ss.map((S) => S.id), x0: Math.min(...ss.map((S) => S.x0)), y0: Math.min(...ss.map((S) => S.y0)), x1: Math.max(...ss.map((S) => S.x1)), y1: Math.max(...ss.map((S) => S.y1)) } : null;
  }
  return out;
}
// The pixels of one piece: RGBA of its box, with everything not in its shapes cleared.
export function pieceData(d, w, seg, piece) {
  const pw = piece.x1 - piece.x0, ph = piece.y1 - piece.y0, out = new Uint8ClampedArray(pw * ph * 4), own = new Set(piece.ids);
  for (let y = 0; y < ph; y++) {
    const sy = y + piece.y0, gy = (sy / seg.B) | 0;
    for (let x = 0; x < pw; x++) {
      const sx = x + piece.x0;
      if (!own.has(seg.label[gy * seg.gw + ((sx / seg.B) | 0)])) continue;
      const i = (sy * w + sx) * 4, o = (y * pw + x) * 4;
      out[o] = d[i]; out[o + 1] = d[i + 1]; out[o + 2] = d[i + 2]; out[o + 3] = d[i + 3];
    }
  }
  return { data: out, w: pw, h: ph };
}

// ---- the browser side

const urls = new Map();   // item id -> data URL of its picture
const report = {};        // sheet -> { cut, missing: [ids] } (window.__icons for the checks)
let loading = null;
// Draw a sheet into a canvas at its requested size and return its keyed pixels.
export function sheetPixels(img, w, hh, key = keyMagentaData) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, hh);
  const id = ctx.getImageData(0, 0, w, hh);
  key(id.data);
  return id.data;
}
// A piece as a canvas: its own size, or fitted into a size × size square
// (centred; never enlarged past `maxScale`).
export function pieceCanvas(p, size = 0, { pad = 0.04, maxScale = Infinity } = {}) {
  const src = document.createElement('canvas'); src.width = p.w; src.height = p.h;
  src.getContext('2d').putImageData(new ImageData(p.data, p.w, p.h), 0, 0);
  if (!size) return src;
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const k = Math.min(maxScale, (size * (1 - 2 * pad)) / Math.max(p.w, p.h)), dw = p.w * k, dh = p.h * k;
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, (size - dw) / 2, (size - dh) / 2, dw, dh);
  return c;
}
function cutSheet(name, img, size = 128) {
  const S = ICON_SHEETS[name]; if (!S) return 0;
  const w = S.cols * CELL, hh = S.rows * CELL;
  const d = sheetPixels(img, w, hh);
  const seg = segmentData(d, w, hh);
  const cells = cellsOf(seg, w, hh, S.cols, S.rows);
  let n = 0; const missing = [];
  S.ids.forEach((id, i) => {
    const cell = cells[i];
    if (!cell) { missing.push(id); return; }   // the emoji stands in
    // a small item stays small: it is never drawn bigger than a picture filling 82% of its cell
    const p = pieceData(d, w, seg, cell);
    urls.set(id, pieceCanvas(p, size, { maxScale: (size * 0.92) / (CELL * 0.82) }).toDataURL('image/png')); n++;
  });
  report[name] = { cut: n, missing, shapes: seg.shapes.length };
  if (missing.length) console.warn('icons: no picture in', name, 'for', missing.join(', '));
  return n;
}
// Load the delivered sheets (named in assets/icons.json). Never rejects.
export function loadIcons(base = 'assets/') {
  if (loading || typeof document === 'undefined') return loading ?? Promise.resolve(0);
  if (typeof window !== 'undefined') window.__icons = report;
  loading = fetch(base + 'icons.json').then((r) => (r.ok ? r.json() : { sheets: [] })).catch(() => ({ sheets: [] })).then((m) =>
    Promise.all((m.sheets ?? []).filter((s) => ICON_SHEETS[s]).map((s) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { try { resolve(cutSheet(s, img)); } catch (e) { console.warn('icons: could not cut', s, e); resolve(0); } };
      img.onerror = () => { console.warn('icons: could not load', s); resolve(0); };
      img.src = `${base}${s}.png`;
    })))).then((ns) => ns.reduce((a, b) => a + b, 0));
  return loading;
}
export const iconUrl = (id) => urls.get(id) ?? null;
// The icon to put in a tile or a card: the sheet's picture, else the emoji.
export function iconNode(base) {
  const u = base && iconUrl(base.id);
  if (!u || typeof document === 'undefined') return base?.icon ?? '?';
  const img = document.createElement('img'); img.className = 'ico-img'; img.src = u; img.alt = ''; img.draggable = false;
  return img;
}

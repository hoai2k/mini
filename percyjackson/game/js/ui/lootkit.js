// The loot kit (design/image-requests.md "Round 6 · Loot", ui-loot-kit.png,
// 2048 × 1024 on flat magenta): the rarity tile frames, the NEW badge, the
// upgrade arrows, the favourite star, the Legendary ribbon, the white beam,
// glint ring and twinkle (tinted by the game) and the drachma coin, stack and
// pouch. The sheet is laid out freely in four rows, so each piece is a named
// region of the sheet (KIT_REGIONS, measured on the delivered sheet) and is
// cut as the shapes whose centres lie in it (ui/icons.js segmentData).
//
// loadLootKit() cuts the pieces and, once they are ready, puts each on the
// page as a CSS variable (--kit-<piece>: url(...)) and the class `kit` on
// <html>, which style.css's `.kit` rules use: the tile frames as border
// images (their parchment centres are left out, so the icon stays on the dark
// tile), the badges, the ribbon and the coin. Without the sheet (or with a
// piece that comes out empty or the wrong shape) nothing changes: the CSS
// borders, the text badges and the drawn coin stay. lootdrops.js asks for the
// beam, glint and twinkle canvases (kitCanvas) and draws its plain beam when
// there are none.
import { segmentData, regionsOf, pieceData, pieceCanvas, sheetPixels, keyMagentaData, keyWhiteGlowData } from './icons.js';

export const KIT_W = 2048, KIT_H = 1024;
// name -> [x0, y0, x1, y1] (sheet pixels), and how it is keyed and used.
//   glow: a white glow, keyed by its strength (keyWhiteGlowData)
//   body: only the biggest shape (a frame without the sparks round it)
//   size: the canvas it is fitted into (0: its own size)
//   aspect: the [min, max] width / height the piece must have to be used
export const KIT_REGIONS = {
  frame_common: { r: [40, 10, 410, 350], body: true, size: 160, aspect: [0.85, 1.2] },
  frame_rare: { r: [420, 10, 820, 350], body: true, size: 160, aspect: [0.85, 1.2] },
  frame_heroic: { r: [830, 10, 1220, 350], body: true, size: 160, aspect: [0.85, 1.2] },
  frame_legendary: { r: [1230, 10, 1630, 350], body: true, size: 160, aspect: [0.85, 1.2] },
  frame_blessed: { r: [1636, 0, 2048, 352], body: true, size: 160, aspect: [0.85, 1.2] },
  badge_new: { r: [80, 352, 340, 556], size: 64, aspect: [0.8, 1.25] },
  arrow_up: { r: [380, 352, 640, 556], size: 64, aspect: [0.6, 1.2] },
  arrow_down: { r: [660, 352, 920, 556], size: 64, aspect: [0.6, 1.2] },
  star: { r: [960, 352, 1240, 556], size: 64, aspect: [0.8, 1.25] },
  ribbon: { r: [1250, 352, 2000, 556], aspect: [3, 6] },
  beam: { r: [470, 556, 760, 790], glow: true, aspect: [0.8, 1.6] },
  glint: { r: [830, 600, 1230, 770], glow: true, aspect: [2, 5] },
  twinkle: { r: [1300, 556, 1580, 775], glow: true, size: 64, aspect: [0.7, 1.4] },
  coin: { r: [480, 790, 760, 1024], size: 64, aspect: [0.8, 1.25] },
  coin_stack: { r: [800, 790, 1220, 1024], size: 96, aspect: [1, 2] },
  pouch: { r: [1240, 790, 1580, 1024], size: 96, aspect: [0.8, 1.5] },
};
// The tile frames by rarity (loot.js itemTier; a Blessed item uses frame_blessed).
export const FRAME_FOR = { common: 'frame_common', rare: 'frame_rare', heroic: 'frame_heroic', unique: 'frame_legendary', blessed: 'frame_blessed' };

const canvases = new Map();   // piece -> canvas
const dataUrls = new Map();   // piece -> its PNG data URL (made once)
const urlOf = (name) => { let u = dataUrls.get(name); if (!u) { u = canvases.get(name).toDataURL('image/png'); dataUrls.set(name, u); } return u; };
const report = { pieces: [], rejected: [] };
let loading = null;

// Cut the pieces out of a loaded sheet image (drawn at the request's size). Returns the names cut.
export function cutKit(img) {
  const plain = sheetPixels(img, KIT_W, KIT_H, keyMagentaData);
  const glowD = sheetPixels(img, KIT_W, KIT_H, (d) => d);   // unkeyed, for the glows (keyed per piece below)
  const seg = segmentData(plain, KIT_W, KIT_H, { B: 2 });
  const regions = regionsOf(seg, Object.fromEntries(Object.entries(KIT_REGIONS).map(([k, v]) => [k, v.r])));
  for (const [name, R] of Object.entries(KIT_REGIONS)) {
    let piece = regions[name];
    if (piece && R.body) {
      const big = seg.shapes.filter((S) => piece.ids.includes(S.id)).sort((a, b) => b.n - a.n)[0];
      piece = { ids: [big.id], x0: big.x0, y0: big.y0, x1: big.x1, y1: big.y1 };
    }
    const asp = piece ? (piece.x1 - piece.x0) / (piece.y1 - piece.y0) : 0;
    if (!piece || asp < R.aspect[0] || asp > R.aspect[1]) { report.rejected.push(name); console.warn('lootkit: no usable', name); continue; }
    let p;
    if (R.glow) {
      // a glow: its whole box from the unkeyed sheet, keyed by strength (the faint rays are part of it)
      const pw = piece.x1 - piece.x0, ph = piece.y1 - piece.y0, data = new Uint8ClampedArray(pw * ph * 4);
      for (let y = 0; y < ph; y++) data.set(glowD.subarray(((y + piece.y0) * KIT_W + piece.x0) * 4, ((y + piece.y0) * KIT_W + piece.x1) * 4), y * pw * 4);
      p = { data: keyWhiteGlowData(data), w: pw, h: ph };
    } else p = pieceData(plain, KIT_W, seg, piece);
    canvases.set(name, R.size ? squareOrFit(p, R.size, !!R.body) : pieceCanvas(p));
    report.pieces.push(name);
  }
  return report.pieces;
}
// A frame is stretched to the square (so its border-image slices are known);
// anything else keeps its shape inside the square.
function squareOrFit(p, size, stretch) {
  if (!stretch) return pieceCanvas(p, size, { pad: 0.02 });
  const src = pieceCanvas(p), c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(src, 0, 0, size, size);
  return c;
}
// Put the pieces on the page as CSS variables and switch the `.kit` rules on.
function publish() {
  const root = document.documentElement;
  for (const name of canvases.keys()) if (!KIT_REGIONS[name].glow) root.style.setProperty('--kit-' + name.replace(/_/g, '-'), `url(${urlOf(name)})`);
  const css = ['frame_common', 'frame_rare', 'frame_heroic', 'frame_legendary', 'frame_blessed'].every((n) => canvases.has(n));
  root.classList.toggle('kit', css);
  for (const n of ['badge_new', 'arrow_up', 'arrow_down', 'star', 'ribbon', 'coin', 'coin_stack', 'pouch']) root.classList.toggle('kit-' + n.replace(/_/g, '-'), canvases.has(n));
}
export function loadLootKit(base = 'assets/') {
  if (loading || typeof document === 'undefined') return loading ?? Promise.resolve([]);
  if (typeof window !== 'undefined') window.__lootkit = report;
  loading = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { try { cutKit(img); publish(); } catch (e) { console.warn('lootkit: could not cut', e); } resolve(report.pieces); };
    img.onerror = () => { console.warn('lootkit: could not load the sheet'); resolve([]); };
    img.src = base + 'ui-loot-kit.png';
  });
  return loading;
}
// A cut piece's canvas (null until the kit is loaded, or if the piece was unusable).
export const kitCanvas = (name) => canvases.get(name) ?? null;
// An <img> of a piece, or null (callers keep their text or emoji then).
export function kitImg(name, cls = 'kit-img') {
  if (!canvases.has(name) || typeof document === 'undefined') return null;
  const img = document.createElement('img'); img.className = cls; img.src = urlOf(name); img.alt = ''; img.draggable = false;
  return img;
}
// Text with drachmas in it ("◆ 40", "Salvage (+◆12)"): each ◆ becomes the
// kit's coin when there is one; otherwise the text as it is.
export function coinText(str, piece = 'coin') {
  if (!canvases.has(piece) || typeof document === 'undefined' || !String(str).includes('◆')) return str;
  const out = [];
  String(str).split('◆').forEach((s, i) => { if (i) out.push(kitImg(piece, 'kit-coin-img')); if (s) out.push(s); });
  return out;
}

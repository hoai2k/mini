// Drawing annotations on a 2D canvas, in image pixels (the caller sets the
// transform). The same code draws the editor's view and the exported file.

import { arrowHead, arrowTail } from './geometry.js';
import { layoutLabels } from './layout.js';

export const FONTS = [
  { id: 'sans', name: 'Sans', css: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', weight: 700 },
  { id: 'serif', name: 'Serif', css: 'Georgia, "Times New Roman", Times, serif', weight: 700 },
  { id: 'rounded', name: 'Rounded', css: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", Nunito, system-ui, sans-serif', weight: 700 },
  { id: 'marker', name: 'Marker', css: '"Marker Felt", "Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive', weight: 700 },
  { id: 'condensed', name: 'Poster', css: 'Impact, Haettenschweiler, "Arial Narrow Bold", "Franklin Gothic Bold", sans-serif', weight: 400 },
  { id: 'mono', name: 'Mono', css: 'ui-monospace, Menlo, Consolas, "Courier New", monospace', weight: 700 },
];

export function fontCss(item, u) {
  const f = FONTS.find((x) => x.id === item.font) || FONTS[0];
  return `${f.weight} ${Math.max(4, (item.fontSize || 40) * u)}px ${f.css}`;
}

// Black or white, whichever stands out against the colour.
export function contrastOf(hex) {
  const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#111111' : '#ffffff';
}

// The text's outline (or background) color: 'auto' picks black or white
// against the text color, 'none' is transparent, anything else is a color.
export function outlineOf(item) {
  const o = item.outline || 'auto';
  if (o === 'none') return null;
  return o === 'auto' ? contrastOf(item.color) : o;
}

export function measureLabel(ctx, item, u) {
  ctx.save();
  ctx.font = fontCss(item, u);
  const size = (item.fontSize || 40) * u;
  const w = ctx.measureText(item.title.trim()).width;
  ctx.restore();
  const pad = size * (item.box ? 0.45 : 0.15);
  return { w: w + pad * 2, h: size * 1.3 + (item.box ? size * 0.2 : 0) };
}

function strokePath(ctx, item) {
  const pts = item.points;
  ctx.beginPath();
  if (pts.length === 1) {
    ctx.moveTo(item.x + pts[0][0], item.y + pts[0][1]);
    ctx.lineTo(item.x + pts[0][0] + 0.01, item.y + pts[0][1]);
    return;
  }
  ctx.moveTo(item.x + pts[0][0], item.y + pts[0][1]);
  // Smooth through the midpoints so the line doesn't look jagged.
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(item.x + pts[i][0], item.y + pts[i][1], item.x + mx, item.y + my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(item.x + last[0], item.y + last[1]);
}

export function drawItem(ctx, item, u) {
  const w = Math.max(0.5, (item.width || 6) * u);
  ctx.save();
  ctx.globalAlpha = item.opacity ?? 1;
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (item.type === 'arrow') {
    // One filled outline (round tail, shaft, head) so a translucent arrow
    // has no darker overlap where shaft and head meet.
    const tail = arrowTail(item);
    const head = arrowHead(item, w);
    const nx = -Math.sin(item.angle);
    const ny = Math.cos(item.angle);
    const hw = w / 2;
    ctx.beginPath();
    ctx.moveTo(tail.x + nx * hw, tail.y + ny * hw);
    ctx.lineTo(head.base.x + nx * hw, head.base.y + ny * hw);
    ctx.lineTo(head.left.x, head.left.y);
    ctx.lineTo(head.tip.x, head.tip.y);
    ctx.lineTo(head.right.x, head.right.y);
    ctx.lineTo(head.base.x - nx * hw, head.base.y - ny * hw);
    ctx.lineTo(tail.x - nx * hw, tail.y - ny * hw);
    ctx.arc(tail.x, tail.y, hw, item.angle - Math.PI / 2, item.angle + Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
  } else if (item.type === 'circle') {
    ctx.beginPath();
    ctx.arc(item.x, item.y, Math.max(1, item.r), 0, Math.PI * 2);
    ctx.stroke();
  } else if (item.points.length) {
    strokePath(ctx, item);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawLabel(ctx, item, box, u) {
  const size = (item.fontSize || 40) * u;
  const halo = outlineOf(item);
  const alpha = item.opacity ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (box.target) {
    const c = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    // Leave the line at the box's edge, toward the item.
    const dx = box.target.x - c.x;
    const dy = box.target.y - c.y;
    const s = Math.min(Math.abs(box.w / 2 / (dx || 1e-9)), Math.abs(box.h / 2 / (dy || 1e-9)));
    const from = { x: c.x + dx * s, y: c.y + dy * s };
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(box.target.x, box.target.y);
    if (halo) {
      ctx.strokeStyle = halo;
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = Math.max(1, size * 0.08) + 2 * u;
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    ctx.strokeStyle = item.color;
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.stroke();
  }
  if (item.box && halo) {
    // With a background the outline color fills the box instead.
    ctx.fillStyle = halo;
    ctx.globalAlpha = alpha * 0.9;
    roundRect(ctx, box.x, box.y, box.w, box.h, size * 0.3);
    ctx.fill();
    ctx.globalAlpha = alpha;
  }
  ctx.font = fontCss(item, u);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 + size * 0.04;
  const text = item.title.trim();
  if (!item.box && halo) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = halo;
    ctx.lineWidth = size * 0.2;
    ctx.strokeText(text, cx, cy);
  }
  ctx.fillStyle = item.color;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

// Draws every mark, then every title on top, and returns the title boxes
// (Map id → box) so the editor can hit-test them.
export function drawAnnotations(ctx, items, u, W, H) {
  for (const item of items) drawItem(ctx, item, u);
  const boxes = layoutLabels(items, u, W, H, (item) => measureLabel(ctx, item, u));
  for (const item of items) {
    const box = boxes.get(item.id);
    if (box) drawLabel(ctx, item, box, u);
  }
  return boxes;
}

// Quiet edge indicators for the way on: where the next stage (forward) and the
// way back (backdoor) are, drawn near the edge of each player's view when the
// landmark is off screen.
//
//   forward   a small brass chevron (with a fainter one behind it)
//   backdoor  a hollow ring with a tiny tick on the side it lies
//
// Off screen: the mark sits just inside the view's region, on the line from
// the player (the region's anchor) towards the landmark, turned to point at
// it, and fades with distance (opacity from `nearAlpha` at distance 0 to
// `farAlpha` at `range`). A label (a few letters) or an icon (one character,
// or an image) can sit beside it. On screen: a gentle marker by default
// (`onScreen: 'marker'`: two faint corner ticks for forward, a faint ring
// for backdoor), or nothing (`onScreen: 'none'`) when the world draws the
// landmark itself.
//
// It draws on its own 2D overlay canvas (pointer-events: none) and clips to
// each region, so it respects the split screen.
//
//   import { createLandmarks } from '../shared/landmark.js';
//   const marks = createLandmarks();
//   ... each frame after rendering:
//   marks.begin();
//   // With shared/splitscreen.js: one mark per view (players sharing a view share it).
//   marks.drawSplit(split, nextStage.position, { kind: 'forward', label: 'Moss', range: 4000 });
//   marks.drawSplit(split, backdoor.position, { kind: 'backdoor', range: 4000 });
//   // Without split screen: give the projection yourself.
//   marks.draw({ position, kind: 'forward', project: (p) => toScreen(p), anchor: [x, y], distance: d, range: 4000 });
//
// API
//   createLandmarks({ parent = document.body, zIndex = 4, margin = 26 }) -> marks
//   marks.begin()                         clear (and resize) the overlay; once per frame
//   marks.draw({ position, project, kind = 'forward', region = null, anchor = null,
//     label = '', icon = null, distance = null, range = Infinity, onScreen = 'marker',
//     color, nearAlpha = 0.72, farAlpha = 0.28 })
//       project(position) -> { x, y, behind } CSS px; region: polygon(s) [[x,y],...] or
//       [[[x,y],...], ...] (default the whole screen); anchor: [x,y] (default the region's
//       centre). Returns { x, y, angle, onScreen } or null.
//   marks.drawSplit(split, position, opts)  draw for every view of split.layout
//   marks.canvas                           the overlay canvas
//   marks.dispose()

const STYLE = {
  forward: { color: '#d8b268', shadow: 'rgba(14,10,4,0.55)' },
  backdoor: { color: '#d9ddd6', shadow: 'rgba(8,10,12,0.55)' },
};

function inPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function createLandmarks({ parent = document.body, zIndex = 4, margin = 26 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'landmarks';
  Object.assign(canvas.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: String(zIndex) });
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1;

  function begin() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function shapes(kind, color, shadow, alpha, size) {
    // Drawn pointing along +x around the origin.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stroke = (w, c, a) => { ctx.globalAlpha = a; ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke(); };
    if (kind === 'backdoor') {
      const r = size * 0.55;
      const path = () => {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.moveTo(r + 2.5, -2.6); ctx.lineTo(r + 5.5, 0); ctx.lineTo(r + 2.5, 2.6);
      };
      path(); stroke(3.6, shadow, alpha * 0.8);
      path(); stroke(1.5, color, alpha);
      return;
    }
    const s = size * 0.5;
    const chev = (dx) => { ctx.beginPath(); ctx.moveTo(dx - s * 0.7, -s); ctx.lineTo(dx + s * 0.35, 0); ctx.lineTo(dx - s * 0.7, s); };
    chev(-s * 0.95); stroke(3.4, shadow, alpha * 0.45);
    chev(-s * 0.95); stroke(1.5, color, alpha * 0.45);
    chev(0); stroke(4, shadow, alpha * 0.8);
    chev(0); stroke(2, color, alpha);
  }

  function marker(kind, x, y, color, shadow, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    if (kind === 'backdoor') {
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.globalAlpha = alpha * 0.6; ctx.lineWidth = 3; ctx.strokeStyle = shadow; ctx.stroke();
      ctx.globalAlpha = alpha; ctx.lineWidth = 1.2; ctx.strokeStyle = color; ctx.stroke();
    } else {
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * 13, -6); ctx.lineTo(sx * 13, -13); ctx.lineTo(sx * 6, -13);
        ctx.moveTo(sx * 13, 6); ctx.lineTo(sx * 13, 13); ctx.lineTo(sx * 6, 13);
        ctx.globalAlpha = alpha * 0.6; ctx.lineWidth = 3; ctx.strokeStyle = shadow; ctx.stroke();
        ctx.globalAlpha = alpha; ctx.lineWidth = 1.3; ctx.strokeStyle = color; ctx.stroke();
      }
    }
    ctx.restore();
  }

  function draw({ position, project, kind = 'forward', region = null, anchor = null, label = '', icon = null,
    distance = null, range = Infinity, onScreen = 'marker', color, nearAlpha = 0.72, farAlpha = 0.28, size = 14 }) {
    const polys = !region ? [[[0, 0], [W, 0], [W, H], [0, H]]] : (Array.isArray(region[0][0]) ? region : [region]);
    const inside = (x, y) => polys.some((p) => inPoly(p, x, y));
    const insetInside = (x, y, m) => {
      if (!inside(x, y)) return false;
      for (let a = 0; a < 8; a++) {
        const px = x + Math.cos((a * Math.PI) / 4) * m, py = y + Math.sin((a * Math.PI) / 4) * m;
        if (px < 0 || py < 0 || px > W || py > H || !inside(px, py)) return false;
      }
      return true;
    };
    let ax, ay;
    if (anchor) [ax, ay] = anchor;
    else {
      let n = 0; ax = 0; ay = 0;
      for (const p of polys) for (const v of p) { ax += v[0]; ay += v[1]; n++; }
      ax /= n; ay /= n;
    }
    const st = STYLE[kind] || STYLE.forward;
    const col = color || st.color;
    const t = distance == null || !isFinite(range) ? 0.5 : Math.min(1, Math.max(0, distance / range));
    const alpha = nearAlpha + (farAlpha - nearAlpha) * t;
    const pr = project(position);
    const scale = dpr;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.beginPath();
    for (const p of polys) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
    ctx.clip();

    if (!pr.behind && insetInside(pr.x, pr.y, 6)) {
      if (onScreen === 'marker') marker(kind, pr.x, pr.y, col, st.shadow, alpha * 0.55);
      ctx.restore();
      return { x: pr.x, y: pr.y, angle: 0, onScreen: true };
    }
    let dx = pr.x - ax, dy = pr.y - ay;
    if (pr.behind) { dx = -dx; dy = -dy; }
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    // March out from the anchor to the last point still a margin inside the region.
    let lo = 0, hi = Math.hypot(W, H);
    if (!insetInside(ax, ay, margin)) lo = 0;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (insetInside(ax + dx * mid, ay + dy * mid, margin)) lo = mid; else hi = mid;
    }
    // The region is convex per polygon but a union need not be: walk back if a gap was jumped.
    const x = ax + dx * lo, y = ay + dy * lo;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    shapes(kind, col, st.shadow, alpha, size);
    ctx.restore();
    if (label || icon) {
      // Beside the mark, on the side towards the middle of the view.
      const lx = x - dx * (size + 4), ly = y - dy * (size + 4);
      ctx.globalAlpha = alpha * 0.9;
      if (icon && typeof icon === 'object' && 'width' in icon) ctx.drawImage(icon, lx - 6, ly - 6, 12, 12);
      const text = (typeof icon === 'string' ? icon + (label ? ' ' : '') : '') + (label || '');
      if (text) {
        ctx.font = '600 10px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textAlign = dx > 0.35 ? 'right' : dx < -0.35 ? 'left' : 'center';
        ctx.textBaseline = dy > 0.35 ? 'bottom' : dy < -0.35 ? 'top' : 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = st.shadow; ctx.strokeText(text, lx, ly);
        ctx.fillStyle = col; ctx.fillText(text, lx, ly);
      }
    }
    ctx.restore();
    return { x, y, angle, onScreen: false };
  }

  function drawSplit(split, position, opts = {}) {
    const L = split.layout;
    const out = [];
    for (const v of L.views) {
      const regs = L.regions.filter((r) => r.view === v.index);
      if (!regs.length) continue;
      const region = L.views.length === 1 ? null : regs.map((r) => r.polygon);
      const anchor = [regs.reduce((s, r) => s + r.anchor[0], 0) / regs.length, regs.reduce((s, r) => s + r.anchor[1], 0) / regs.length];
      let distance = opts.distance ?? null;
      if (distance == null && L.players) {
        for (const p of L.players) {
          if (!v.slots.includes(p.slot)) continue;
          const d = Math.hypot(p.position.x - position.x, (p.position.y || 0) - (position.y || 0), (p.position.z || 0) - (position.z || 0));
          distance = distance == null ? d : Math.min(distance, d);
        }
      }
      out.push(draw({ ...opts, position, region, anchor, distance, project: (p) => split.project(v.index, p) }));
    }
    return out;
  }

  return { begin, draw, drawSplit, canvas, dispose() { canvas.remove(); } };
}

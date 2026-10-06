// The overlay above the whole call that flies Bubble Blow bubbles from the
// sender's mouth in their video tile to a friend's face in theirs, where they
// pop. Every browser runs the flight locally from the same message, so
// everyone sees the bubble cross the screen.

import { drawBubble, makePop, drawPop } from './bubble-art.js';

const FLIGHT_S = 1.6;

// Where a point in a video (normalised 0..1 of the video frame) appears in a
// tile that shows it with object-fit: cover.
export function mapCover(rect, mediaW, mediaH, nx, ny) {
  const scale = Math.max(rect.width / mediaW, rect.height / mediaH);
  const dw = mediaW * scale, dh = mediaH * scale;
  return { x: rect.left + (rect.width - dw) / 2 + nx * dw, y: rect.top + (rect.height - dh) / 2 + ny * dh, scale };
}

// geom(id) -> { rect, w, h } for a person's tile (w, h: the video size)
// face(id) -> { x, y, s } their face centre and eye distance, normalised to
//             the video (s as a fraction of its width), or null
export function createFlyer(canvas, { geom, face, onPop }) {
  const ctx = canvas.getContext('2d');
  const flights = [];
  const pops = [];
  let raf = 0, last = 0, t = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function targetOf(f) {
    const g = geom(f.to);
    if (!g) return null;
    const fc = face(f.to);
    if (fc) {
      const p = mapCover(g.rect, g.w, g.h, fc.x, fc.y);
      return { x: p.x, y: p.y, r: Math.min(140, Math.max(24, fc.s * g.w * p.scale * 1.1)) };
    }
    return { x: g.rect.left + g.rect.width / 2, y: g.rect.top + g.rect.height * 0.42, r: Math.min(100, g.rect.width * 0.18) };
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    t += dt;
    resize();
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.age += dt;
      const target = targetOf(f) ?? f.lastTarget;
      if (!target) {
        flights.splice(i, 1);
        continue;
      }
      f.lastTarget = target;
      const k = Math.min(1, f.age / FLIGHT_S);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      // A quadratic arc that rises above both ends.
      const cx = (f.start.x + target.x) / 2;
      const cy = Math.min(f.start.y, target.y) - Math.max(80, Math.abs(target.x - f.start.x) * 0.35);
      const x = (1 - e) * (1 - e) * f.start.x + 2 * (1 - e) * e * cx + e * e * target.x + Math.sin(f.age * 9) * 4 * (1 - k);
      const y = (1 - e) * (1 - e) * f.start.y + 2 * (1 - e) * e * cy + e * e * target.y;
      const r = f.start.r + (target.r - f.start.r) * e;
      drawBubble(ctx, x, y, r, t, f.hue);
      if (k >= 1) {
        flights.splice(i, 1);
        pops.push(makePop(x, y, r, f.hue));
        onPop?.(f);
      }
    }
    for (let i = pops.length - 1; i >= 0; i--) if (!drawPop(ctx, pops[i], dt)) pops.splice(i, 1);
    if (flights.length || pops.length) raf = requestAnimationFrame(tick);
    else {
      raf = 0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  return {
    // { from, to, x, y, r, hue }: x, y, r normalised to the sender's video.
    launch(msg) {
      const g = geom(msg.from);
      let start;
      if (g) {
        const p = mapCover(g.rect, g.w, g.h, msg.x, msg.y);
        start = { x: p.x, y: p.y, r: Math.max(8, msg.r * g.w * p.scale) };
      } else {
        start = { x: innerWidth / 2, y: -40, r: 30 };
      }
      flights.push({ ...msg, start, age: 0 });
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    },
  };
}

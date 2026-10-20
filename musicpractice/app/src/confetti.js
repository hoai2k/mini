// A burst of confetti over everything for a moment (a perfect scale test):
// a canvas laid over the window, pieces in the theme's own colours thrown up
// and out from `from` (the score, a DOMRect), falling and fluttering, gone
// after about three seconds. Nothing at all for someone who prefers less motion.

const COLOURS = ['--brass', '--brass-2', '--red-2', '--ok-2', '--ink'];

/** Throw confetti inside `host` (an open dialog, so it shows above its backdrop), from `from`. */
export function confetti(host = document.body, from = null) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = innerWidth, H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  const css = getComputedStyle(host);
  const colours = COLOURS.map((c) => css.getPropertyValue(c).trim()).filter(Boolean);
  const ox = from ? from.left + from.width / 2 : W / 2;
  const oy = from ? from.top + from.height / 2 : H * 0.3;
  const half = from ? from.width / 2 : 60;
  const pieces = Array.from({ length: Math.round(Math.min(160, W / 3)) }, () => {
    const spread = (Math.random() - 0.5) * 2.4; // radians either side of straight up
    const speed = H * (0.45 + Math.random() * 0.75); // px/s
    return {
      x: ox + (Math.random() - 0.5) * half, y: oy,
      vx: Math.sin(spread) * speed, vy: -Math.cos(spread) * speed,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 5,
      spin: (Math.random() - 0.5) * 12, a: Math.random() * Math.PI,
      flutter: 2 + Math.random() * 3, colour: colours[Math.floor(Math.random() * colours.length)] || '#e0b84f',
    };
  });
  const g = H * 1.6, drag = 1.6, life = 3.2;
  let last = performance.now(), t = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    ctx.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.vx -= p.vx * drag * dt;
      p.vy += (g - p.vy * drag) * dt;
      p.x += p.vx * dt + Math.sin(t * p.flutter) * 0.6;
      p.y += p.vy * dt;
      p.a += p.spin * dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, (life - t) / 0.6));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.scale(1, Math.cos(t * p.flutter * 2)); // turning over as it falls
      ctx.fillStyle = p.colour;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < life) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// Celebration sparks: a burst of brass and ivory confetti from the keyboard.
export function createFx(canvas) {
  const g = canvas.getContext('2d');
  let parts = [];
  let raf = 0, last = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Resize the backing store only when the canvas changes size (a resize clears
  // and reallocates it, which is slow on phones).
  function size() {
    const r = canvas.getBoundingClientRect();
    const d = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    g.setTransform(d, 0, 0, d, 0, 0);
  }
  const COLORS = ['#f6d891', '#e2b45e', '#fffdf6', '#4fd6c7', '#ffb38a'];
  function burst(x, y, count = 70, power = 1) {
    if (reduced.matches) count = Math.min(count, 14);
    size();
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const v = (260 + Math.random() * 420) * power;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + Math.random() * 0.8, age: 0,
        w: 4 + Math.random() * 5, h: 7 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        c: COLORS[(Math.random() * COLORS.length) | 0], star: Math.random() < 0.18 });
    }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const r = canvas.getBoundingClientRect();
    g.clearRect(0, 0, r.width, r.height);
    parts = parts.filter((p) => (p.age += dt) < p.life);
    for (const p of parts) {
      p.vy += 900 * dt; p.vx *= 1 - 1.6 * dt; p.vy *= 1 - 0.9 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const fade = Math.min(1, (p.life - p.age) * 2.5);
      g.save(); g.globalAlpha = fade; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c;
      if (p.star) { g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? 2.5 : 6; const aa = (i * Math.PI) / 5; g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } g.fill(); }
      else g.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.rot * 1.3)), p.w, p.h * Math.abs(Math.cos(p.rot * 1.3)));
      g.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) g.clearRect(0, 0, r.width, r.height);
  }
  /** A small spark on a key for a correct note. */
  function spark(x, y) { burst(x, y, 8, 0.35); }
  return { burst, spark };
}

// Drawing for the see-through bubble, shared by the Bubble Blow effect (in my
// video) and the flight overlay (the bubble crossing to a friend's face).

export function drawBubble(ctx, x, y, r, t = 0, hue = 300, alpha = 1) {
  if (r <= 0.5) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Slight wobble so it feels like a soap film.
  const wob = 1 + Math.sin(t * 7) * 0.025;
  ctx.translate(x, y);
  ctx.scale(wob, 2 - wob);

  // Body: almost clear, a touch of colour towards the rim.
  const body = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
  body.addColorStop(0, 'rgba(255,255,255,0.03)');
  body.addColorStop(0.75, `hsla(${hue},90%,75%,0.10)`);
  body.addColorStop(0.93, `hsla(${hue + 60},95%,70%,0.32)`);
  body.addColorStop(1, `hsla(${hue + 120},95%,80%,0.55)`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Iridescent rim: a few thin arcs in shifting hues.
  ctx.lineWidth = Math.max(1, r * 0.035);
  for (let i = 0; i < 4; i++) {
    const a0 = t * 0.8 + i * 1.7;
    ctx.strokeStyle = `hsla(${(hue + i * 70 + t * 40) % 360},100%,72%,0.55)`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.985, a0, a0 + 1.4);
    ctx.stroke();
  }

  // Window highlight and a small glint.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, -r * 0.45, r * 0.2, r * 0.11, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(r * 0.45, r * 0.42, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A pop: returns droplets to animate with drawPop.
export function makePop(x, y, r, hue = 300) {
  const drops = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const sp = r * (2.2 + Math.random() * 2);
    drops.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 2 + Math.random() * r * 0.08 });
  }
  return { x, y, r, hue, drops, age: 0 };
}

// Advances and draws a pop; returns false when it has finished.
export function drawPop(ctx, pop, dt) {
  pop.age += dt;
  const k = pop.age / 0.45;
  if (k >= 1) return false;
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.strokeStyle = `hsla(${pop.hue + 60},100%,80%,0.9)`;
  ctx.lineWidth = Math.max(1, pop.r * 0.06 * (1 - k));
  ctx.setLineDash([pop.r * 0.25, pop.r * 0.18]);
  ctx.beginPath();
  ctx.arc(pop.x, pop.y, pop.r * (1 + k * 0.5), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const d of pop.drops) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vy += 600 * dt;
    ctx.fillStyle = `hsla(${pop.hue + 30},100%,85%,0.85)`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return true;
}

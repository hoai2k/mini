// Bunny: tall ears and a twitchy pink nose. Tilt your head and the ear on
// that side flops over; open your mouth to show two buck teeth.

import { withTemplate } from '../js/face.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// An ear grown along a curved spine from (bx, by): `dir` is the starting
// angle (0 = straight up, positive leans right), `bend` how much it curls
// towards the right as it rises, `len` its length in template units.
function ear(c, bx, by, dir, bend, len, width) {
  const N = 14;
  const L = [], R = [];
  let x = bx, y = by, a = dir;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    // Width swells then rounds off at the tip.
    const w = width * Math.sqrt(Math.max(0, 1 - Math.pow(u * 1.04, 3.2))) * (0.75 + 0.5 * Math.sin(Math.min(1, u * 2.4) * Math.PI * 0.5));
    const nx = Math.cos(a), ny = Math.sin(a);
    L.push([x - nx * w, y - ny * w]);
    R.push([x + nx * w, y + ny * w]);
    a += bend / N;
    x += Math.sin(a) * (len / N);
    y -= Math.cos(a) * (len / N);
  }
  const trace = (pts0, k) => {
    c.beginPath();
    for (let i = 0; i < L.length; i++) {
      const cx = (L[i][0] + R[i][0]) / 2, cy = (L[i][1] + R[i][1]) / 2;
      const px = cx + (L[i][0] - cx) * k, py = cy + (L[i][1] - cy) * k;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    for (let i = R.length - 1; i >= 0; i--) {
      const cx = (L[i][0] + R[i][0]) / 2, cy = (L[i][1] + R[i][1]) / 2;
      c.lineTo(cx + (R[i][0] - cx) * k, cy + (R[i][1] - cy) * k);
    }
    c.closePath();
  };
  c.lineJoin = 'round';
  trace(null, 1);
  const g = c.createLinearGradient(bx - width, by - len, bx + width, by);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e6e9f5');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 15;
  c.strokeStyle = '#b8bcd6';
  c.stroke();
  // Pink inside, starting a little up from the base.
  c.save();
  c.beginPath();
  c.rect(0, 0, 1024, by - len * 0.12);
  c.clip();
  trace(null, 0.58);
  c.fillStyle = '#ffb3cf';
  c.fill();
  c.restore();
  // Glossy streak.
  const m = Math.floor(N * 0.55);
  c.beginPath();
  c.moveTo(L[3][0] * 0.7 + R[3][0] * 0.3, L[3][1] * 0.7 + R[3][1] * 0.3);
  c.lineTo(L[m][0] * 0.7 + R[m][0] * 0.3, L[m][1] * 0.7 + R[m][1] * 0.3);
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.stroke();
}

function nose(c, k) {
  c.save();
  c.translate(512, 650);
  c.scale(k, k);
  c.beginPath();
  c.moveTo(-40, -18);
  c.quadraticCurveTo(0, -34, 40, -18);
  c.quadraticCurveTo(34, 18, 0, 34);
  c.quadraticCurveTo(-34, 18, -40, -18);
  c.closePath();
  const g = c.createRadialGradient(-12, -8, 3, 0, 4, 46);
  g.addColorStop(0, '#ffc2d8');
  g.addColorStop(1, '#ff6f9f');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 8;
  c.lineJoin = 'round';
  c.strokeStyle = '#cf3f70';
  c.stroke();
  c.beginPath();
  c.ellipse(-14, -10, 11, 5, -0.2, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.fill();
  c.restore();
}

export default {
  id: 'bunny',
  name: 'Bunny',
  emoji: '🐰',
  hint: 'Tilt your head to flop an ear',
  needs: { face: true },

  start(s) {
    s.flop = [0, 0];
    s.vel = [0, 0];
    s.teeth = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.flop ??= [0, 0];
    s.vel ??= [0, 0];
    s.teeth ??= 0;
    const roll = face ? face.roll : 0;
    // The ear on the side you tilt towards flops outwards (a springy settle).
    const dt = Math.min(f.dt, 0.05);
    for (let i = 0; i < 2; i++) {
      const lean = i === 0 ? -roll : roll;
      const target = clamp((lean - 0.12) * 5, 0, 1);
      s.vel[i] += ((target - s.flop[i]) * 140 - s.vel[i] * 11) * dt;
      s.flop[i] += s.vel[i] * dt;
    }
    const open = face ? face.mouthOpen : f.input.held ? 1 : 0;
    s.teeth += ((open > 0.15 ? 1 : 0) - s.teeth) * (1 - Math.exp(-f.dt * 16));
    if (!face) return;

    const art = f.img('bunny');
    withTemplate(ctx, face, c => {
      if (art) {
        c.drawImage(art, 0, 0, 1024, 1024);
        return;
      }
      // Right ear (the viewer's right) flops clockwise, the left the other way.
      ear(c, 420, 270, -0.08 - s.flop[0] * 0.95, -0.2 - s.flop[0] * 1.1, 300 - s.flop[0] * 20, 66);
      ear(c, 604, 270, 0.1 + s.flop[1] * 0.95, 0.42 + s.flop[1] * 1.1, 300 - s.flop[1] * 20, 66);
      // The nose twitches in bursts.
      const burst = Math.max(0, Math.sin(f.t * 1.7)) > 0.5 ? 1 : 0;
      nose(c, 1 + burst * 0.14 * Math.sin(f.t * 34));
    });

    // Two buck teeth hanging from the upper lip when the mouth opens.
    if (s.teeth > 0.04) {
      const up = face.pts?.[13];
      const base = up && Math.hypot(up.x - face.mouth.x, up.y - face.mouth.y) < face.scale * 0.8 ? up : { x: face.mouth.x, y: face.mouth.y - face.mouthOpen * face.scale * 0.15 };
      const k = face.scale / 240;
      ctx.save();
      ctx.translate(base.x, base.y);
      ctx.rotate(face.roll);
      ctx.scale(k, k * s.teeth);
      ctx.lineJoin = 'round';
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(sx < 0 ? -44 : 2, -6, 42, 66, [2, 2, 14, 14]);
        const g = ctx.createLinearGradient(0, 0, 0, 60);
        g.addColorStop(0, '#fff');
        g.addColorStop(1, '#eef0fa');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#b8bcd6';
        ctx.stroke();
      }
      ctx.restore();
    }
  },
};

// Alien: green skin, huge eyes, a tiny mouth and two springy antennae.

import { withTemplate, drawTemplate } from '../js/face.js';

// One antenna in template coordinates; `sway` bends the tip sideways.
function antenna(c, baseX, dir, sway, lift) {
  const bx = baseX, by = 236;
  const tx = baseX + dir * 190 + sway, ty = 70 - lift;
  const mx = baseX + dir * 30 + sway * 0.25, my = 120;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // Stalk: dark outline, lime body, highlight.
  const stalk = (w, col) => {
    c.beginPath();
    c.moveTo(bx, by);
    c.bezierCurveTo(bx, my + 40, mx, my - 20, tx, ty);
    c.lineWidth = w;
    c.strokeStyle = col;
    c.stroke();
  };
  stalk(26, '#3f8f1c');
  stalk(16, '#9be84b');
  c.save();
  c.translate(-3, -3);
  stalk(4, 'rgba(255,255,255,0.65)');
  c.restore();
  // Little springy coil marks near the base.
  c.strokeStyle = '#3f8f1c';
  c.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    const y = by - 14 - i * 20;
    c.beginPath();
    c.moveTo(bx - 9, y + 5);
    c.lineTo(bx + 9, y - 5);
    c.stroke();
  }
  // Glowing magenta ball.
  const g = c.createRadialGradient(tx, ty, 4, tx, ty, 62);
  g.addColorStop(0, 'rgba(255,80,220,0.55)');
  g.addColorStop(1, 'rgba(255,80,220,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(tx, ty, 62, 0, Math.PI * 2);
  c.fill();
  const b = c.createRadialGradient(tx - 10, ty - 12, 3, tx, ty, 34);
  b.addColorStop(0, '#ffd1f5');
  b.addColorStop(0.35, '#ff4fcf');
  b.addColorStop(1, '#c0138e');
  c.beginPath();
  c.arc(tx, ty, 32, 0, Math.PI * 2);
  c.fillStyle = b;
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = '#8c0e69';
  c.stroke();
  c.beginPath();
  c.ellipse(tx - 11, ty - 13, 9, 6, -0.6, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.fill();
}

export default {
  id: 'alien',
  name: 'Alien',
  emoji: '👽',
  hint: 'Take me to your leader',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  p = bulge(p, u_eyeL, 0.65 * u_scale, 0.6);
  p = bulge(p, u_eyeR, 0.65 * u_scale, 0.6);
  p = bulge(p, u_mouth, 0.6 * u_scale, -0.55);
  vec4 c = cam(toUv(p));
  // Green skin inside a soft ellipse that follows the head tilt.
  vec2 d = toPx(uv) - u_center;
  float cs = cos(-u_roll), sn = sin(-u_roll);
  d = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
  float e = length(d / (vec2(u_faceSize.x * 0.5, u_faceSize.y * 0.56)));
  float k = 1.0 - smoothstep(0.78, 1.05, e);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 green = vec3(0.45, 0.95, 0.4) * (0.25 + 1.0 * l);
  // Keep the whites of the eyes bright so the big eyes read.
  return vec4(mix(c.rgb, green, k * 0.85), 1.0);
}`,

  start(s) {
    s.off = 0;
    s.vel = 0;
    s.prev = null;
  },

  draw(ctx, f) {
    const face = f.face;
    if (!face) return;
    const s = f.state;
    const unit = face.scale / 240; // canvas pixels per template unit
    // Head motion kicks the antennae; a spring pulls them back.
    if (s.prev) {
      const dx = (face.center.x - s.prev.x) / unit;
      s.vel -= dx * 6;
    }
    s.prev = { x: face.center.x, y: face.center.y };
    const dt = Math.min(f.dt, 0.05);
    s.vel += (-90 * s.off - 5 * s.vel) * dt;
    s.off += s.vel * dt;
    s.off = Math.max(-90, Math.min(90, s.off));
    const wob = Math.sin(f.t * 5) * 14 + s.off;
    const wob2 = Math.sin(f.t * 5 + 1.7) * 14 + s.off;
    const lift = Math.sin(f.t * 7) * 8;
    const art = f.img('alien-antennae');
    if (art) {
      drawTemplate(ctx, face, art);
      return;
    }
    withTemplate(ctx, face, c => {
      antenna(c, 420, -1, wob, lift);
      antenna(c, 604, 1, wob2, -lift);
    });
  },
};

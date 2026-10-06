// Heart Eyes: a pulsing red heart over each eye. Smile (or hold Space) and
// hearts float up from around your head.

const MAX_HEARTS = 60;

function bake(draw, size) {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d');
  c.scale(size / 256, size / 256);
  draw(c);
  return cv;
}

// A plump glossy heart filling a 256 x 256 box.
function drawHeart(c) {
  const path = () => {
    c.beginPath();
    c.moveTo(128, 232);
    c.bezierCurveTo(30, 160, 14, 84, 56, 48);
    c.bezierCurveTo(90, 22, 122, 40, 128, 76);
    c.bezierCurveTo(134, 40, 166, 22, 200, 48);
    c.bezierCurveTo(242, 84, 226, 160, 128, 232);
    c.closePath();
  };
  path();
  const g = c.createRadialGradient(100, 80, 8, 128, 130, 120);
  g.addColorStop(0, '#ff7a8e');
  g.addColorStop(0.5, '#ff2f52');
  g.addColorStop(1, '#d4163c');
  c.fillStyle = g;
  c.fill();
  c.lineJoin = 'round';
  c.lineWidth = 12;
  c.strokeStyle = '#8f0f2c';
  c.stroke();
  c.beginPath();
  c.ellipse(82, 82, 22, 12, -0.7, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.fill();
  c.beginPath();
  c.arc(60, 112, 6, 0, Math.PI * 2);
  c.fill();
}

export default {
  id: 'hearteyes',
  name: 'Heart Eyes',
  emoji: '😍',
  hint: 'Smile to send hearts floating',
  needs: { face: true },

  start(s) {
    s.hearts = [];
    s.acc = 0;
    s.art = bake(drawHeart, 128);
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.art ??= bake(drawHeart, 128);
    s.hearts ??= [];
    s.acc ??= 0;
    const heart = f.img('heart') ?? s.art;

    if (face) {
      // Beating hearts over both eyes, tilted with the head.
      const beat = 1 + 0.12 * Math.sin(f.t * 9) + 0.04 * Math.sin(f.t * 18);
      const size = face.scale * 0.85 * beat;
      for (const eye of [face.eyeL, face.eyeR]) {
        ctx.save();
        ctx.translate(eye.x, eye.y);
        ctx.rotate(face.roll);
        ctx.drawImage(heart, -size / 2, -size / 2, size, size);
        ctx.restore();
      }

      if (face.smile > 0.4 || f.input.held) {
        s.acc += f.dt * 9;
        while (s.acc >= 1) {
          s.acc -= 1;
          if (s.hearts.length >= MAX_HEARTS) break;
          const a = Math.random() * Math.PI * 2;
          const r = face.scale * (0.9 + Math.random() * 0.9);
          s.hearts.push({
            x: face.center.x + Math.cos(a) * r * 0.9,
            y: face.center.y + Math.sin(a) * r * 0.9 - face.scale * 0.2,
            size: face.scale * (0.22 + Math.random() * 0.3),
            vy: -face.scale * (0.7 + Math.random() * 0.8),
            sway: Math.random() * 6,
            drift: (Math.random() - 0.5) * face.scale * 0.5,
            age: 0,
            life: 1.4 + Math.random() * 0.9,
            rot: (Math.random() - 0.5) * 0.6,
          });
        }
      }
    }

    // Floating hearts keep drifting and fading even after the smile ends.
    s.hearts = s.hearts.filter(h => {
      h.age += f.dt;
      if (h.age >= h.life) return false;
      const u = h.age / h.life;
      h.y += h.vy * f.dt;
      h.x += (h.drift + Math.sin(h.age * 4 + h.sway) * h.size * 1.2) * f.dt;
      const size = h.size * (1 + u * 0.5);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - u) * 1.6) * Math.min(1, h.age * 8);
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot + Math.sin(h.age * 3 + h.sway) * 0.2);
      ctx.drawImage(heart, -size / 2, -size / 2, size, size);
      ctx.restore();
      return true;
    });
  },
};

// Hotdog: a dancing hotdog bops beside you in time to a 120 bpm beat. Open
// your mouth and it jumps and spins.

function bake(draw, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'));
  return cv;
}

// The body in a 512 x 768 canvas: bun, sausage, mustard and face. Arms and
// legs are drawn live so they can dance.
function drawBody(c) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // Back of the bun.
  c.beginPath();
  c.roundRect(96, 150, 320, 540, 150);
  const bg = c.createLinearGradient(96, 0, 416, 0);
  bg.addColorStop(0, '#f2b25a');
  bg.addColorStop(0.5, '#ffd486');
  bg.addColorStop(1, '#e8a04a');
  c.fillStyle = bg;
  c.fill();
  c.lineWidth = 16;
  c.strokeStyle = '#a8631c';
  c.stroke();
  // Sausage.
  c.beginPath();
  c.roundRect(140, 50, 232, 620, 116);
  const sg = c.createLinearGradient(140, 0, 372, 0);
  sg.addColorStop(0, '#d8402c');
  sg.addColorStop(0.35, '#ff6a4a');
  sg.addColorStop(1, '#c0301f');
  c.fillStyle = sg;
  c.fill();
  c.lineWidth = 16;
  c.strokeStyle = '#7a1a10';
  c.stroke();
  // Mustard squiggle.
  c.beginPath();
  c.moveTo(168, 440);
  for (let i = 0; i < 6; i++) {
    c.quadraticCurveTo(190 + i * 30, i % 2 ? 470 : 410, 205 + i * 30, 440);
  }
  c.lineWidth = 22;
  c.strokeStyle = '#ffd92a';
  c.stroke();
  c.lineWidth = 6;
  c.strokeStyle = '#fff6a0';
  c.beginPath();
  c.moveTo(176, 432);
  c.quadraticCurveTo(200, 412, 224, 436);
  c.stroke();
  // Front flaps of the bun hugging the sausage.
  for (const side of [-1, 1]) {
    c.save();
    c.translate(256, 0);
    c.scale(side, 1);
    c.beginPath();
    c.moveTo(-132, 300);
    c.bezierCurveTo(-176, 400, -170, 600, -112, 676);
    c.bezierCurveTo(-60, 720, 0, 700, 8, 650);
    c.bezierCurveTo(-60, 600, -100, 470, -102, 330);
    c.closePath();
    c.fillStyle = '#ffc468';
    c.fill();
    c.lineWidth = 14;
    c.strokeStyle = '#a8631c';
    c.stroke();
    c.beginPath();
    c.moveTo(-134, 400);
    c.quadraticCurveTo(-140, 480, -126, 560);
    c.lineWidth = 9;
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.stroke();
    c.restore();
  }
  // Highlight on the sausage.
  c.beginPath();
  c.moveTo(178, 120);
  c.quadraticCurveTo(168, 200, 178, 270);
  c.lineWidth = 14;
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.stroke();
  // Face: big eyes and a wide grin.
  for (const x of [212, 300]) {
    c.beginPath();
    c.ellipse(x, 190, 30, 38, 0, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
    c.lineWidth = 8;
    c.strokeStyle = '#4a0f08';
    c.stroke();
    c.beginPath();
    c.arc(x + 4, 196, 15, 0, Math.PI * 2);
    c.fillStyle = '#2a1008';
    c.fill();
    c.beginPath();
    c.arc(x + 9, 188, 5, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
  }
  c.beginPath();
  c.moveTo(194, 262);
  c.quadraticCurveTo(256, 360, 318, 262);
  c.quadraticCurveTo(256, 280, 194, 262);
  c.closePath();
  c.fillStyle = '#5a1010';
  c.fill();
  c.lineWidth = 9;
  c.strokeStyle = '#3a0808';
  c.stroke();
  c.beginPath();
  c.ellipse(256, 322, 34, 16, 0, 0, Math.PI * 2);
  c.fillStyle = '#ff7a8a';
  c.fill();
  c.beginPath();
  c.moveTo(210, 266);
  c.quadraticCurveTo(256, 282, 302, 266);
  c.lineWidth = 12;
  c.strokeStyle = '#fff';
  c.stroke();
  // Rosy cheeks.
  for (const x of [172, 340]) {
    c.beginPath();
    c.ellipse(x, 252, 18, 11, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,170,170,0.65)';
    c.fill();
  }
}

// One arm from the shoulder (sx, sy) at an angle (0 = down, positive swings
// outwards), with a white glove.
function arm(c, sx, sy, side, ang) {
  const len = 78;
  const a1 = ang * side;
  const ex = sx + Math.sin(a1) * len * side * side, ey = sy + Math.cos(a1) * len;
  const hx = ex + Math.sin(a1 * 1.5) * len * 0.8, hy = ey + Math.cos(a1 * 1.5) * len * 0.8;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(sx, sy);
  c.quadraticCurveTo(ex, ey, hx, hy);
  c.lineWidth = 30;
  c.strokeStyle = '#7a1a10';
  c.stroke();
  c.lineWidth = 16;
  c.strokeStyle = '#ffb36a';
  c.stroke();
  c.beginPath();
  c.arc(hx, hy, 24, 0, Math.PI * 2);
  c.fillStyle = '#fff';
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = '#7a1a10';
  c.stroke();
}

function leg(c, x, lift) {
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x, 680);
  c.lineTo(x, 720 - lift);
  c.lineWidth = 28;
  c.strokeStyle = '#7a1a10';
  c.stroke();
  c.lineWidth = 14;
  c.strokeStyle = '#ffb36a';
  c.stroke();
  // Shoe.
  c.beginPath();
  c.ellipse(x + 10, 742 - lift, 34, 20, 0, 0, Math.PI * 2);
  c.fillStyle = '#3a6df0';
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = '#1c3a9e';
  c.stroke();
  c.beginPath();
  c.ellipse(x + 2, 734 - lift, 12, 6, -0.3, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.fill();
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const JUMP = 0.9;

export default {
  id: 'hotdog',
  name: 'Hotdog',
  emoji: '🌭',
  hint: 'Open your mouth to make it jump',
  needs: { face: true },

  start(s) {
    s.body = bake(drawBody, 512, 768);
    s.jump = -1;
    s.side = 0;
    s.x = null;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.body ??= bake(drawBody, 512, 768);
    s.jump ??= -1;
    if (!face) return;
    const dt = Math.min(f.dt, 0.05);

    // Stand on the side with more room, easing across if you move.
    const b = face.box;
    const roomL = b.x, roomR = f.w - (b.x + b.w);
    const room = Math.max(roomL, roomR);
    // About 1.6 face heights tall, shrinking (not below 1.1) to fit beside you.
    const H = Math.min(Math.max(Math.min(b.h * 1.6, (room - 8) * 1.5), b.h * 1.1), f.h * 0.96);
    const W = (H * 512) / 768;
    const want = clamp(roomR >= roomL ? b.x + b.w + room / 2 : room / 2, W / 2 + 4, f.w - W / 2 - 4);
    s.x = s.x == null ? want : s.x + (want - s.x) * (1 - Math.exp(-dt * 5));

    // The beat: 120 bpm is a bounce every half second.
    const t = f.t;
    const beat = Math.abs(Math.sin(Math.PI * 2 * t));
    const open = face.mouthOpen > 0.4 || f.input.held;
    if (open && s.jump < 0) {
      s.jump = 0;
      f.sfx('flap');
    }
    if (s.jump >= 0) {
      s.jump += dt / JUMP;
      if (s.jump >= 1) s.jump = -1;
    }
    const k = s.jump >= 0 ? s.jump : 0;
    const air = s.jump >= 0 ? Math.sin(Math.PI * k) : 0;
    const spin = s.jump >= 0 ? Math.cos(Math.PI * 2 * k) : 1;
    const bounce = beat * (1 - air);
    const sy = 0.9 + 0.16 * bounce + air * 0.08;
    const sx = (1.08 - 0.12 * bounce) * (Math.abs(spin) < 0.12 ? 0.12 * Math.sign(spin || 1) : spin);
    const sway = Math.sin(Math.PI * t) * 0.1 * (1 - air);
    const footY = f.h - 2 - bounce * H * 0.05 - air * H * 0.4;

    const sc = H / 768;
    ctx.save();
    ctx.translate(s.x, footY);
    ctx.rotate(sway);
    ctx.scale(sc * sx, sc * sy);
    ctx.translate(-256, -768);
    const art = f.img('hotdog');
    if (art) {
      ctx.drawImage(art, 0, 0, 512, 768);
    } else {
      // Legs alternate with the beat; arms wave opposite each other (both
      // go up when jumping).
      const ph = Math.sin(Math.PI * 2 * t);
      leg(ctx, 214, Math.max(0, ph) * 26 * (1 - air) + air * 20);
      leg(ctx, 298, Math.max(0, -ph) * 26 * (1 - air) + air * 20);
      ctx.drawImage(s.body, 0, 0);
      const wave = Math.sin(Math.PI * 4 * t);
      const up = air * 2.6;
      arm(ctx, 118, 360, -1, 0.7 + wave * 0.7 + up);
      arm(ctx, 394, 360, 1, 0.7 - wave * 0.7 + up);
    }
    ctx.restore();
  },
};

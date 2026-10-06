// Viking: an iron helmet with big ivory horns and a braided orange beard that
// swings along with your jaw. Skål!

import { withTemplate } from '../js/face.js';

function bake(draw, w = 512, h = 512, sw = 1024, sh = 1024) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.scale(w / sw, h / sh);
  draw(c);
  return cv;
}

// Round iron helmet, rim at y = 330, with two curved horns.
function drawHelmet(c) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  for (const mirror of [false, true]) {
    c.save();
    if (mirror) {
      c.translate(1024, 0);
      c.scale(-1, 1);
    }
    c.beginPath();
    c.moveTo(300, 300);
    c.bezierCurveTo(230, 300, 160, 250, 150, 170);
    c.bezierCurveTo(146, 110, 160, 70, 190, 44);
    c.bezierCurveTo(186, 100, 200, 140, 244, 170);
    c.bezierCurveTo(274, 190, 310, 190, 340, 190);
    c.lineTo(350, 290);
    c.closePath();
    const g = c.createLinearGradient(150, 60, 330, 300);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(1, '#e0cfa0');
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 15;
    c.strokeStyle = '#8f7a44';
    c.stroke();
    c.beginPath();
    c.moveTo(176, 170);
    c.quadraticCurveTo(168, 110, 190, 76);
    c.lineWidth = 8;
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.stroke();
    c.restore();
  }
  // Dome.
  c.beginPath();
  c.moveTo(288, 340);
  c.bezierCurveTo(272, 160, 380, 80, 512, 80);
  c.bezierCurveTo(644, 80, 752, 160, 736, 340);
  c.closePath();
  const dg = c.createLinearGradient(300, 80, 720, 340);
  dg.addColorStop(0, '#c8d0de');
  dg.addColorStop(0.5, '#8d97ad');
  dg.addColorStop(1, '#5d667c');
  c.fillStyle = dg;
  c.fill();
  c.lineWidth = 16;
  c.strokeStyle = '#363d52';
  c.stroke();
  // Centre ridge.
  c.beginPath();
  c.roundRect(488, 82, 48, 260, 14);
  c.fillStyle = '#6f7a92';
  c.fill();
  c.lineWidth = 10;
  c.stroke();
  // Rim band.
  c.beginPath();
  c.roundRect(274, 290, 476, 56, 24);
  const bg = c.createLinearGradient(0, 290, 0, 346);
  bg.addColorStop(0, '#f0b94a');
  bg.addColorStop(1, '#b8741a');
  c.fillStyle = bg;
  c.fill();
  c.lineWidth = 14;
  c.strokeStyle = '#6e430c';
  c.stroke();
  // Rivets.
  for (const x of [320, 400, 512, 624, 704]) {
    c.beginPath();
    c.arc(x, 318, 9, 0, Math.PI * 2);
    c.fillStyle = '#fff2c0';
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = '#6e430c';
    c.stroke();
  }
  // Shine.
  c.beginPath();
  c.moveTo(340, 250);
  c.quadraticCurveTo(350, 150, 430, 120);
  c.lineWidth = 12;
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.stroke();
}

// Beard in a frame whose origin is the chin and whose unit is the template.
function drawBeard(c, sway, open) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const drop = open * 30;
  const orange = c.createLinearGradient(0, -120, 0, 300);
  orange.addColorStop(0, '#ffb04a');
  orange.addColorStop(1, '#e0661c');
  // Fuller part along the jaw and chin.
  c.beginPath();
  c.moveTo(-250, -170);
  c.bezierCurveTo(-270, -60, -200, 40, -110, 70 + drop);
  c.bezierCurveTo(-60, 90 + drop, -50, 110 + drop, 0, 120 + drop);
  c.bezierCurveTo(50, 110 + drop, 60, 90 + drop, 110, 70 + drop);
  c.bezierCurveTo(200, 40, 270, -60, 250, -170);
  c.bezierCurveTo(200, -90, 150, -60, 100, -70);
  c.bezierCurveTo(60, -100, -60, -100, -100, -70);
  c.bezierCurveTo(-150, -60, -200, -90, -250, -170);
  c.closePath();
  c.fillStyle = orange;
  c.fill();
  c.lineWidth = 14;
  c.strokeStyle = '#8a3a0c';
  c.stroke();
  // Strands.
  c.lineWidth = 6;
  c.strokeStyle = 'rgba(138,58,12,0.55)';
  for (const x of [-170, -110, 110, 170]) {
    c.beginPath();
    c.moveTo(x, -90);
    c.quadraticCurveTo(x * 0.9, 0, x * 0.55, 60 + drop);
    c.stroke();
  }
  // Two braids with ties, swinging a little.
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * 62, 90 + drop);
    c.rotate(sway * side * 0.6 + sway);
    for (let i = 0; i < 6; i++) {
      c.save();
      c.translate(0, i * 38);
      c.rotate((i % 2 ? 1 : -1) * 0.3);
      c.beginPath();
      c.ellipse(0, 0, 34 - i * 2, 25, 0, 0, Math.PI * 2);
      c.fillStyle = i % 2 ? '#ff9a2e' : '#ffb85a';
      c.fill();
      c.lineWidth = 8;
      c.strokeStyle = '#8a3a0c';
      c.stroke();
      c.restore();
    }
    // Tie.
    c.beginPath();
    c.roundRect(-24, 6 * 38 - 20, 48, 24, 8);
    c.fillStyle = '#d9344a';
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = '#7a1024';
    c.stroke();
    c.restore();
  }
}

// Upturned moustache just under the nose, in template coordinates.
function drawMoustache(c) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  for (const side of [-1, 1]) {
    c.save();
    c.translate(512, 692);
    c.scale(side, 1);
    c.beginPath();
    c.moveTo(0, -4);
    c.bezierCurveTo(50, -28, 130, -16, 170, 6);
    c.bezierCurveTo(196, 20, 188, 48, 164, 40);
    c.bezierCurveTo(176, 26, 150, 14, 120, 24);
    c.bezierCurveTo(80, 38, 30, 40, 0, 20);
    c.closePath();
    c.fillStyle = '#ffa238';
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = '#8a3a0c';
    c.stroke();
    c.restore();
  }
}

export default {
  id: 'viking',
  name: 'Viking',
  emoji: '🪓',
  hint: 'Skål!',
  needs: { face: true },

  start(s) {
    s.helmet = bake(drawHelmet);
    s.jaw = 0;
    s.sway = 0;
    s.swayV = 0;
    s.prevRoll = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.helmet ??= bake(drawHelmet);
    s.jaw ??= 0;
    s.sway ??= 0;
    s.swayV ??= 0;
    if (!face) return;

    // Braids swing like pendulums when your head turns or tilts.
    const dt = Math.min(f.dt, 0.05);
    const droll = (face.roll - (s.prevRoll ?? 0)) / Math.max(dt, 0.001);
    s.prevRoll = face.roll;
    s.swayV += (-s.sway * 60 - s.swayV * 5 - droll * 0.05) * dt;
    s.sway += s.swayV * dt;
    s.jaw += (face.mouthOpen - s.jaw) * (1 - Math.exp(-f.dt * 18));

    // The beard hangs from the chin point, so it follows the jaw.
    const k = face.scale / 240;
    ctx.save();
    ctx.translate(face.chin.x, face.chin.y + s.jaw * face.scale * 0.1);
    ctx.rotate(face.roll);
    ctx.scale(k, k);
    ctx.translate(0, -20);
    drawBeard(ctx, Math.max(-0.5, Math.min(0.5, s.sway + Math.sin(f.t * 2) * 0.03)), s.jaw);
    ctx.restore();

    withTemplate(ctx, face, c => {
      drawMoustache(c);
      c.drawImage(f.img('viking') ?? s.helmet, 0, 0, 1024, 1024);
    });
  },
};

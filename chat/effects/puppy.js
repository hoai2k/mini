// Puppy: floppy ears and a button nose. Open your mouth (or hold Space) and a
// pink tongue slides out and wags.

import { withTemplate } from '../js/face.js';

// Renders stand-in art once into an offscreen canvas, drawing in 1024 x 1024
// template coordinates.
function bake(draw, w = 512, h = 512, sw = 1024, sh = 1024) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.scale(w / sw, h / sh);
  draw(c);
  return cv;
}

function earPath(c) {
  c.beginPath();
  c.moveTo(360, 210);
  c.bezierCurveTo(290, 180, 210, 225, 196, 335);
  c.bezierCurveTo(186, 440, 205, 530, 266, 556);
  c.bezierCurveTo(325, 570, 352, 480, 356, 400);
  c.bezierCurveTo(360, 330, 366, 260, 360, 210);
  c.closePath();
}

function drawEars(c) {
  c.lineJoin = 'round';
  for (const mirror of [false, true]) {
    c.save();
    if (mirror) {
      c.translate(1024, 0);
      c.scale(-1, 1);
    }
    earPath(c);
    const g = c.createLinearGradient(200, 200, 360, 560);
    g.addColorStop(0, '#d89457');
    g.addColorStop(1, '#a8602f');
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 16;
    c.strokeStyle = '#6b3a1a';
    c.stroke();
    // Cream inner ear.
    c.beginPath();
    c.moveTo(335, 262);
    c.bezierCurveTo(285, 250, 242, 290, 238, 350);
    c.bezierCurveTo(232, 420, 246, 486, 280, 504);
    c.bezierCurveTo(318, 500, 330, 430, 332, 380);
    c.bezierCurveTo(334, 330, 338, 292, 335, 262);
    c.fillStyle = '#ffe3c2';
    c.fill();
    // Glossy highlight.
    c.beginPath();
    c.ellipse(262, 300, 14, 44, 0.25, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fill();
    c.restore();
  }
  // Button nose.
  c.beginPath();
  c.moveTo(512, 690);
  c.bezierCurveTo(460, 690, 446, 636, 470, 612);
  c.bezierCurveTo(490, 596, 534, 596, 554, 612);
  c.bezierCurveTo(578, 636, 564, 690, 512, 690);
  c.closePath();
  const ng = c.createRadialGradient(498, 620, 6, 512, 645, 60);
  ng.addColorStop(0, '#5a5a6a');
  ng.addColorStop(0.35, '#26262e');
  ng.addColorStop(1, '#0c0c12');
  c.fillStyle = ng;
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = '#05050a';
  c.stroke();
  c.beginPath();
  c.ellipse(492, 622, 18, 9, -0.3, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.fill();
}

// A long pink tongue hanging from (512, 740) down to y = 960.
function drawTongue(c) {
  c.beginPath();
  c.moveTo(442, 735);
  c.lineTo(582, 735);
  c.lineTo(582, 880);
  c.bezierCurveTo(582, 975, 442, 975, 442, 880);
  c.closePath();
  const g = c.createLinearGradient(442, 740, 582, 960);
  g.addColorStop(0, '#ff8aa8');
  g.addColorStop(1, '#ff5f8a');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 14;
  c.lineJoin = 'round';
  c.strokeStyle = '#c93a64';
  c.stroke();
  // Centre crease and highlight.
  c.beginPath();
  c.moveTo(512, 760);
  c.lineTo(512, 900);
  c.lineWidth = 8;
  c.lineCap = 'round';
  c.strokeStyle = '#d9456f';
  c.stroke();
  c.beginPath();
  c.ellipse(470, 810, 9, 34, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fill();
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default {
  id: 'puppy',
  name: 'Puppy',
  emoji: '🐶',
  hint: 'Open your mouth to stick your tongue out',
  needs: { face: true },

  start(s) {
    s.len = 0;
    s.wag = 0;
    s.ears = bake(drawEars);
    s.tongue = bake(drawTongue);
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.ears ??= bake(drawEars);
    s.tongue ??= bake(drawTongue);
    const out = (face && face.mouthOpen > 0.35) || f.input.held;
    // The tongue eases out and back rather than snapping.
    const target = out ? clamp(face ? 0.35 + face.mouthOpen * 0.8 : 1, 0.4, 1) : 0;
    s.len += (target - s.len) * (1 - Math.exp(-f.dt * 14));
    if (!face) return;
    s.wag += f.dt * (6 + s.len * 6);

    withTemplate(ctx, face, c => {
      if (s.len > 0.02) {
        const art = f.img('puppy-tongue');
        const L = 220 * s.len;
        c.save();
        // Wag from the mouth centre.
        c.translate(512, 740);
        c.rotate(Math.sin(s.wag) * 0.09 * s.len);
        c.translate(-512, -740);
        c.beginPath();
        c.rect(0, 730, 1024, L + 10);
        c.clip();
        c.translate(0, L - 220);
        c.drawImage(art ?? s.tongue, 0, 0, 1024, 1024);
        c.restore();
      }
      const ears = f.img('puppy');
      c.drawImage(ears ?? s.ears, 0, 0, 1024, 1024);
    });
  },
};

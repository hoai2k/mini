// Pirate: a tricorn hat with a skull and an eyepatch. Open your mouth and a
// speech bubble shouts "Arrr!".

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

// Tricorn hat (brim at y = 240) and an eyepatch over the image-left eye.
function drawPirate(c) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // Strap first, so the patch and hat sit on top of it.
  c.beginPath();
  c.moveTo(250, 640);
  c.lineTo(392, 520);
  c.lineTo(790, 330);
  c.lineWidth = 16;
  c.strokeStyle = '#14141c';
  c.stroke();
  c.lineWidth = 5;
  c.strokeStyle = 'rgba(255,255,255,0.25)';
  c.stroke();
  // Hat: three-cornered, with the front point turned up.
  c.beginPath();
  c.moveTo(210, 262);
  c.bezierCurveTo(170, 180, 230, 120, 330, 110);
  c.bezierCurveTo(400, 20, 624, 20, 694, 110);
  c.bezierCurveTo(794, 120, 854, 180, 814, 262);
  c.bezierCurveTo(700, 290, 600, 244, 512, 262);
  c.bezierCurveTo(424, 244, 324, 290, 210, 262);
  c.closePath();
  const g = c.createLinearGradient(0, 30, 0, 290);
  g.addColorStop(0, '#4a4a5c');
  g.addColorStop(0.4, '#23232e');
  g.addColorStop(1, '#101018');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 16;
  c.strokeStyle = '#05050a';
  c.stroke();
  // Gold trim along the brim.
  c.beginPath();
  c.moveTo(214, 252);
  c.bezierCurveTo(324, 280, 424, 234, 512, 252);
  c.bezierCurveTo(600, 234, 700, 280, 810, 252);
  c.lineWidth = 12;
  c.strokeStyle = '#ffc928';
  c.stroke();
  c.beginPath();
  c.moveTo(330, 112);
  c.bezierCurveTo(400, 24, 624, 24, 694, 112);
  c.lineWidth = 10;
  c.stroke();
  // Skull and crossbones.
  c.fillStyle = '#fff';
  c.strokeStyle = '#8a8aa0';
  c.lineWidth = 7;
  for (const s of [-1, 1]) {
    c.save();
    c.translate(512, 178);
    c.rotate(s * 0.5);
    c.beginPath();
    c.roundRect(-62, -8, 124, 16, 8);
    c.fill();
    c.stroke();
    c.restore();
  }
  c.beginPath();
  c.ellipse(512, 156, 44, 40, 0, 0, Math.PI * 2);
  c.roundRect(486, 176, 52, 34, 8);
  c.fill();
  c.stroke();
  c.fillStyle = '#1a1a24';
  for (const x of [494, 530]) {
    c.beginPath();
    c.ellipse(x, 158, 11, 13, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.beginPath();
  c.moveTo(512, 172);
  c.lineTo(505, 186);
  c.lineTo(519, 186);
  c.closePath();
  c.fill();
  // Highlight on the crown.
  c.beginPath();
  c.moveTo(380, 90);
  c.quadraticCurveTo(450, 46, 540, 48);
  c.lineWidth = 9;
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.stroke();
  // Eyepatch.
  c.beginPath();
  c.ellipse(392, 520, 78, 66, -0.3, 0, Math.PI * 2);
  const pg = c.createRadialGradient(372, 496, 6, 392, 520, 84);
  pg.addColorStop(0, '#4a4a5c');
  pg.addColorStop(1, '#0c0c14');
  c.fillStyle = pg;
  c.fill();
  c.lineWidth = 12;
  c.strokeStyle = '#05050a';
  c.stroke();
  c.beginPath();
  c.ellipse(366, 494, 22, 10, -0.6, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.fill();
}

function bubble(ctx, x, y, text, size, pop, tx, ty, fill, line, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.font = `800 ${size}px "Trebuchet MS", system-ui, sans-serif`;
  const w = ctx.measureText(text).width + size * 1.2;
  const h = size * 1.8;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.12);
  ctx.strokeStyle = line;
  ctx.fillStyle = fill;
  const lx = (tx - x) * 0.5 / pop, ly = Math.min((ty - y) * 0.5 / pop, h * 1.1);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.moveTo(-w * 0.14, h / 2 - 2);
  ctx.lineTo(Math.max(-w / 2, Math.min(w / 2, lx)) * 0.7, ly);
  ctx.lineTo(w * 0.06, h / 2 - 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-w * 0.14 + 2, h / 2 - ctx.lineWidth / 2);
  ctx.lineTo(w * 0.06 - 2, h / 2 - ctx.lineWidth / 2);
  ctx.lineWidth += 1;
  ctx.strokeStyle = fill;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.04);
  ctx.restore();
}

const WORDS = ['Arrr!', 'Yo ho ho!', 'Ahoy!'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default {
  id: 'pirate',
  name: 'Pirate',
  emoji: '🏴‍☠️',
  hint: 'Open your mouth to talk like a pirate',
  needs: { face: true },

  start(s) {
    s.art = bake(drawPirate);
    s.pop = 0;
    s.word = WORDS[0];
    s.talk = 0;
    s.wasOpen = false;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.art ??= bake(drawPirate);
    s.pop ??= 0;
    s.word ??= WORDS[0];
    const open = (face && face.mouthOpen > 0.25) || f.input.held;
    s.talk = Math.max(0, (s.talk ?? 0) - f.dt);
    if (open && !s.wasOpen && s.talk <= 0) {
      s.word = WORDS[(Math.random() * WORDS.length) | 0];
      s.talk = 1.5;
    }
    s.wasOpen = open;
    s.pop += ((open || s.talk > 1 ? 1 : 0) - s.pop) * (1 - Math.exp(-f.dt * 12));
    if (!face) return;

    withTemplate(ctx, face, c => c.drawImage(f.img('pirate') ?? s.art, 0, 0, 1024, 1024));

    if (s.pop > 0.03) {
      const size = face.scale * 0.36;
      const right = face.center.x < f.w / 2;
      const bx = clamp(face.center.x + (right ? 1 : -1) * face.scale * 1.75, size * 2.2, f.w - size * 2.2);
      const by = clamp(face.mouth.y - face.scale * 1.1, size * 1.2, f.h - size);
      bubble(ctx, bx, by, s.word, size, s.pop, face.mouth.x + (right ? 1 : -1) * face.scale * 0.4, face.mouth.y - face.scale * 0.1, '#fff8e0', '#3b3b4c', '#22222e');
    }
  },
};

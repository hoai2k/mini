// Kitty: tabby ears that twitch now and then, a pink nose and whiskers. Open
// your mouth and a little pink "mew" speech bubble pops up.

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

// One left ear with its base centre at (0, 0), pointing up (negative y).
function drawEar(c) {
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-86, 10);
  c.bezierCurveTo(-96, -90, -70, -170, -26, -232);
  c.bezierCurveTo(10, -200, 70, -120, 92, 10);
  c.closePath();
  const g = c.createLinearGradient(-90, -230, 90, 10);
  g.addColorStop(0, '#b8b8c8');
  g.addColorStop(1, '#8a8a9c');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 16;
  c.strokeStyle = '#5c5c70';
  c.stroke();
  // Pink inside.
  c.beginPath();
  c.moveTo(-50, -4);
  c.bezierCurveTo(-56, -76, -40, -128, -20, -168);
  c.bezierCurveTo(10, -140, 40, -80, 54, -4);
  c.closePath();
  c.fillStyle = '#ff9fbd';
  c.fill();
  // Tabby stripes.
  c.lineCap = 'round';
  c.strokeStyle = '#6e6e84';
  c.lineWidth = 10;
  for (const [x, y, dx] of [[-74, -90, 24], [-56, -140, 22], [76, -90, -22]]) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + dx, y + 8);
    c.stroke();
  }
  c.beginPath();
  c.ellipse(-46, -120, 9, 30, 0.35, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fill();
}

// The ear drawn so that its base centre lands at (128, 246) in a 256 canvas.
function earArt(c) {
  c.translate(128, 246);
  drawEar(c);
}

// Nose and whiskers in template coordinates.
function drawFace(c) {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.lineWidth = 7;
  for (const side of [-1, 1]) {
    for (const [dy, dx] of [[-26, 250], [10, 270], [46, 240]]) {
      c.beginPath();
      c.moveTo(512 + side * 70, 676);
      c.quadraticCurveTo(512 + side * 160, 676 + dy * 0.2, 512 + side * dx, 676 + dy);
      c.stroke();
    }
  }
  c.beginPath();
  c.moveTo(512, 690);
  c.lineTo(512, 716);
  c.lineWidth = 8;
  c.strokeStyle = '#d9456f';
  c.stroke();
  c.beginPath();
  c.moveTo(466, 640);
  c.quadraticCurveTo(512, 626, 558, 640);
  c.quadraticCurveTo(552, 676, 512, 696);
  c.quadraticCurveTo(472, 676, 466, 640);
  c.closePath();
  const g = c.createRadialGradient(496, 646, 4, 512, 660, 52);
  g.addColorStop(0, '#ffb6cf');
  g.addColorStop(1, '#ff6b98');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 9;
  c.strokeStyle = '#c93a64';
  c.stroke();
  c.beginPath();
  c.ellipse(494, 645, 13, 6, -0.2, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.fill();
}

// A speech bubble with its tail pointing down-left or down-right to (tx, ty).
function bubble(ctx, x, y, text, size, pop, tx, ty, fill, line, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.font = `800 ${size}px "Trebuchet MS", system-ui, sans-serif`;
  const w = ctx.measureText(text).width + size * 1.1;
  const h = size * 1.8;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.12);
  ctx.strokeStyle = line;
  ctx.fillStyle = fill;
  // The tail only reaches part of the way to the target.
  const lx = (tx - x) * 0.5 / pop, ly = Math.min((ty - y) * 0.5 / pop, h * 1.1);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.moveTo(-w * 0.16, h / 2 - 2);
  ctx.lineTo(Math.max(-w / 2, Math.min(w / 2, lx)) * 0.7, ly);
  ctx.lineTo(w * 0.04, h / 2 - 2);
  ctx.fill();
  ctx.stroke();
  // Wipe the seam where the tail meets the body.
  ctx.beginPath();
  ctx.moveTo(-w * 0.16 + 2, h / 2 - ctx.lineWidth / 2);
  ctx.lineTo(w * 0.04 - 2, h / 2 - ctx.lineWidth / 2);
  ctx.lineWidth = ctx.lineWidth + 1;
  ctx.strokeStyle = fill;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.04);
  ctx.restore();
}

const WORDS = ['Mew!', 'Meow!', 'Mrrow~', 'Nyaa!'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default {
  id: 'kitty',
  name: 'Kitty',
  emoji: '🐱',
  hint: 'Open your mouth to meow',
  needs: { face: true },

  start(s) {
    s.ear = bake(earArt, 256, 256, 256, 256);
    s.face = bake(drawFace);
    s.next = 1.5;
    s.twitch = 0;
    s.which = 0;
    s.pop = 0;
    s.word = WORDS[0];
    s.talk = 0;
    s.wasOpen = false;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.ear ??= bake(earArt, 256, 256, 256, 256);
    s.face ??= bake(drawFace);
    s.next ??= 1.5;
    s.twitch ??= 0;
    s.pop ??= 0;
    s.word ??= WORDS[0];
    const open = (face && face.mouthOpen > 0.2) || f.input.held;
    // Mew once per opening, with a short cool-down.
    s.talk = Math.max(0, (s.talk ?? 0) - f.dt);
    if (open && !s.wasOpen && s.talk <= 0) {
      s.word = WORDS[(Math.random() * WORDS.length) | 0];
      s.talk = 1.4;
      f.sfx('pop');
    }
    s.wasOpen = open;
    s.pop += ((open || s.talk > 0.9 ? 1 : 0) - s.pop) * (1 - Math.exp(-f.dt * 12));
    // Ears twitch every few seconds: a quick damped wobble on one ear.
    s.next -= f.dt;
    if (s.next <= 0) {
      s.next = 2.5 + Math.random() * 3;
      s.twitch = 1;
      s.which = Math.random() < 0.5 ? 0 : 1;
    }
    s.twitch = Math.max(0, s.twitch - f.dt * 1.6);
    if (!face) return;

    const art = f.img('kitty');
    withTemplate(ctx, face, c => {
      if (art) {
        c.drawImage(art, 0, 0, 1024, 1024);
        return;
      }
      const wob = Math.sin((1 - s.twitch) * 26) * s.twitch * 0.32;
      for (const side of [0, 1]) {
        c.save();
        const x = side ? 664 : 360;
        c.translate(x, 292);
        // Ears lean outwards a touch; the twitching one flicks.
        c.rotate((side ? 1 : -1) * 0.22 + (side === s.which ? wob : 0));
        if (side) c.scale(-1, 1);
        c.drawImage(s.ear, -128, -246, 256, 256);
        c.restore();
      }
      c.drawImage(s.face, 0, 0, 1024, 1024);
    });

    if (s.pop > 0.03) {
      const size = face.scale * 0.34;
      const right = face.center.x < f.w / 2;
      const bx = clamp(face.center.x + (right ? 1 : -1) * face.scale * 1.75, size * 2, f.w - size * 2);
      const by = clamp(face.mouth.y - face.scale * 1.25, size * 1.2, f.h - size);
      bubble(ctx, bx, by, s.word, size, s.pop, face.mouth.x + (right ? 1 : -1) * face.scale * 0.35, face.mouth.y - face.scale * 0.1, '#ffe3ee', '#e0558a', '#d12a68');
    }
  },
};

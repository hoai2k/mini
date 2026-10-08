// Drawing and sound for chases (chase.js): stamina rings, the tug bar, cover
// that rustles, and the sounds and rumbles of chase events. Shared by the
// chase chapters (2, 7, 8, 9).

import * as art from './art.js';

// The stamina ring at a creature's feet: a full ring when rested, red when low,
// a dashed grey ring while winded.
export function staminaRing(g, m, x, y, r = 46, colour = '#f2c53d') {
  g.save();
  g.translate(x, y);
  g.scale(1, 0.35);
  g.lineWidth = 9;
  g.strokeStyle = 'rgba(40,25,20,0.35)';
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
  if (m.winded > 0) {
    g.setLineDash([10, 10]);
    g.strokeStyle = '#8f8a86';
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
  } else {
    g.strokeStyle = m.st < 0.3 ? '#c8443a' : colour;
    g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * m.st); g.stroke();
  }
  g.restore();
}

// The tug: a rope between the two with a knot that shows who is winning.
export function tugBar(g, c, x, y, labels = ['Snatch!', 'Break free!']) {
  if (!c.tug) return;
  const w = 420;
  g.save();
  g.translate(x - w / 2, y);
  g.fillStyle = 'rgba(248,241,224,0.92)';
  g.strokeStyle = '#33241a';
  g.lineWidth = 4;
  roundRect(g, -16, -38, w + 32, 76, 18);
  g.fill(); g.stroke();
  g.fillStyle = '#c8443a';
  g.fillRect(0, -8, w * 0.5, 16);
  g.fillStyle = '#8e4f8a';
  g.fillRect(w * 0.5, -8, w * 0.5, 16);
  const kx = w * (1 - c.tug.v);
  g.fillStyle = '#f2c53d';
  g.beginPath(); g.arc(kx, 0, 20, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#33241a';
  g.font = '800 26px Fraunces, Georgia, serif';
  g.textAlign = 'left';
  g.fillText(labels[0], 0, -14);
  g.textAlign = 'right';
  g.fillText(labels[1], w, -14);
  g.font = '600 22px Questrial, sans-serif';
  g.textAlign = 'center';
  g.fillText('Mash Action! Pull away with the stick!', w / 2, 34);
  g.restore();
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// A piece of cover (a bush, a flowerbed): drawn from a prop sprite, shaking
// while something moves inside it.
export function drawCover(g, k, t) {
  const shake = k.shake > 0 ? Math.sin(t * 60) * 5 * k.shake : 0;
  const sp = art.prop(k.sheet, k.item);
  if (!art.drawSprite(g, sp, k.x + shake, k.y + k.ry * 0.9, { height: k.h, rot: shake * 0.004 })) {
    g.save();
    g.fillStyle = '#5f7a45';
    g.strokeStyle = '#33241a';
    g.lineWidth = 4;
    g.beginPath(); g.ellipse(k.x + shake, k.y - k.h * 0.3, k.rx, k.h * 0.6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }
}

// Turn chase events into sounds, rumbles and little effects.
export function eventFx(env, events, fx) {
  for (const e of events) {
    switch (e.type) {
      case 'lunge': env.sfx('swoosh'); break;
      case 'dodge': env.sfx('dodge'); break;
      case 'dodged': fx?.text?.('Missed!', e); break;
      case 'stumble': env.sfx('stumble'); break;
      case 'grab': env.sfx('snap'); env.vibrate(60); break;
      case 'tug': env.sfx('tug'); break;
      case 'free': env.sfx('free'); env.vibrate(90); fx?.text?.('Broke free!', e); break;
      case 'snatch': env.sfx('snatch'); env.vibrate(160); break;
      case 'winded': env.sfx('pant'); fx?.text?.('Winded!', e); break;
      case 'rustle': env.sfx('rustle'); if (e.cover) e.cover.shake = 1; break;
      case 'flushed': env.sfx('rustle'); env.sfx('dodge'); if (e.cover) e.cover.shake = 1.5; fx?.text?.('Flushed out!', e); break;
    }
  }
}

// Little rising words ("Missed!", "Winded!") and puffs.
export function makeFx() {
  const items = [];
  return {
    items,
    text(s, at) { items.push({ s, x: at?.who?.x ?? at?.x ?? 960, y: (at?.who?.y ?? at?.y ?? 600) - 160, t: 0 }); },
    say(s, x, y) { items.push({ s, x, y, t: 0 }); },
    update(dt) { for (const i of items) i.t += dt; while (items.length && items[0].t > 1.2) items.shift(); },
    draw(g) {
      for (const i of items) {
        g.save();
        g.globalAlpha = Math.max(0, 1 - i.t / 1.2);
        g.font = '800 44px Fraunces, Georgia, serif';
        g.textAlign = 'center';
        g.lineWidth = 8;
        g.strokeStyle = '#33241a';
        g.fillStyle = '#f2c53d';
        g.strokeText(i.s, i.x, i.y - i.t * 60);
        g.fillText(i.s, i.x, i.y - i.t * 60);
        g.restore();
      }
    },
  };
}

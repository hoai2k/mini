// Drawing and sound for chases (chase.js): stamina rings, the tug bar, cover
// that rustles, and the sounds and rumbles of chase events. Shared by the
// chase chapters (2, 7, 8, 9).

import * as art from './art.js';
import { actionPrompt, buttonName } from './prompt.js';

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

// The tug: a rope between the two with a knot that shows who is winning, and
// what each side must do. opts: { kind: env.inputKind, t, sides: [0, 1] (the
// button side of each label in versus), W } — without kind the prompt is a
// plain line, as before. The bar stays inside the frame.
export function tugBar(g, c, x, y, labels = ['Snatch!', 'Break free!'], opts = {}) {
  if (!c.tug) return;
  const { kind = null, t = 0, sides = [0, 1], W = 1920 } = opts;
  const w = 640;
  x = Math.max(w / 2 + 40, Math.min(W - w / 2 - 40, x));
  y = Math.max(140, y);
  g.save();
  g.translate(x - w / 2, y);
  g.fillStyle = 'rgba(251,246,232,0.95)';
  g.strokeStyle = '#33241a';
  g.lineWidth = 5;
  roundRect(g, -24, -64, w + 48, 128, 26);
  g.fill(); g.stroke();
  // The rope: the snatcher's colour from the left, the holder's from the right.
  g.lineWidth = 4;
  g.fillStyle = '#c8443a';
  g.fillRect(0, -12, w * (1 - c.tug.v), 24);
  g.fillStyle = '#8e4f8a';
  g.fillRect(w * (1 - c.tug.v), -12, w * c.tug.v, 24);
  g.strokeRect(0, -12, w, 24);
  g.beginPath(); g.moveTo(w / 2, -18); g.lineTo(w / 2, 18); g.stroke();
  const kx = w * (1 - c.tug.v);
  const pulse = 1 + Math.sin(t * 12) * 0.08;
  g.fillStyle = '#f2c53d';
  g.beginPath(); g.arc(kx, 0, 28 * pulse, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#33241a';
  g.font = '800 34px Fraunces, Georgia, serif';
  g.textAlign = 'left';
  g.fillText(labels[0], 0, -28);
  g.textAlign = 'right';
  g.fillText(labels[1], w, -28);
  if (kind) {
    // Each side's own button, named: "Mash A!" / "Mash Enter!".
    g.font = '700 26px Questrial, sans-serif';
    g.textAlign = 'left';
    g.fillText(`Mash ${buttonName(kind, 'action', sides[0])}!`, 0, 48);
    g.textAlign = 'right';
    g.fillText(`Mash ${buttonName(kind, 'action', sides[1])}!`, w, 48);
    g.textAlign = 'center';
    g.font = '600 22px Questrial, sans-serif';
    g.fillText('pull away with the stick', w / 2, 48);
  } else {
    g.font = '700 26px Questrial, sans-serif';
    g.textAlign = 'center';
    g.fillText('Mash Action! Pull away with the stick!', w / 2, 48);
  }
  g.restore();
}

// The opening line of a chase, big on a cream band across the frame: what to
// do, in a few words. Written centred on W / 2, so the shell can refit it on
// a narrow screen.
export function hintBand(g, text, W, { y = 118, size = 46, sub = '' } = {}) {
  if (!text) return;
  g.save();
  g.fillStyle = 'rgba(251,246,232,0.93)';
  g.fillRect(0, y - size * 0.95, W, size * (sub ? 2.5 : 1.6));
  g.fillStyle = '#33241a';
  g.fillRect(0, y - size * 0.95, W, 4);
  g.fillRect(0, y - size * 0.95 + size * (sub ? 2.5 : 1.6) - 4, W, 4);
  g.font = `800 ${size}px Fraunces, Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText(text, W / 2, y + size * 0.2);
  if (sub) {
    g.font = `600 ${size * 0.62}px Questrial, sans-serif`;
    g.fillText(sub, W / 2, y + size * 1.05);
  }
  g.restore();
}

// A flier's breath (stamina) as a small pill under it, where a ring on the
// ground would be read as someone else's.
export function breathBar(g, m, x, y, colour = '#c9b8d4') {
  const w = 120, h = 16;
  g.save();
  g.translate(x - w / 2, y);
  g.fillStyle = 'rgba(251,246,232,0.9)';
  g.strokeStyle = '#33241a';
  g.lineWidth = 3;
  roundRect(g, -4, -4, w + 8, h + 8, 10);
  g.fill(); g.stroke();
  if (m.winded > 0) {
    g.fillStyle = '#8f8a86';
    const k = 1 - m.winded / m.windedTime;
    g.fillRect(0, 0, w * Math.max(0, Math.min(1, k)), h);
  } else {
    g.fillStyle = m.st < 0.3 ? '#c8443a' : colour;
    g.fillRect(0, 0, w * m.st, h);
  }
  g.restore();
}

// An in-world button prompt over a creature, in the chase's style: a thin
// wrapper so chapters pass the env and a side.
export function chasePrompt(g, env, x, y, text, { t = 0, pulse = 0, side = 0, size = 36 } = {}) {
  actionPrompt(g, x, y, text, { kind: env.inputKind || 'keyboard', t, pulse, side, size });
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
    text(s, at) { items.push({ s, x: at?.who?.x ?? at?.x ?? 960, y: (at?.who?.y ?? at?.y ?? 600) - (at?.who?.flies ? 420 : 300), t: 0 }); },
    say(s, x, y) { items.push({ s, x, y, t: 0 }); },
    update(dt) { for (const i of items) i.t += dt; while (items.length && items[0].t > 1.2) items.shift(); },
    draw(g) {
      for (const i of items) {
        g.save();
        g.globalAlpha = Math.max(0, 1 - i.t / 1.2);
        g.font = '800 54px Fraunces, Georgia, serif';
        g.textAlign = 'center';
        g.lineJoin = 'round';
        g.lineWidth = 16;
        g.strokeStyle = 'rgba(251,246,232,0.9)';
        g.strokeText(i.s, i.x, i.y - i.t * 60);
        g.lineWidth = 7;
        g.strokeStyle = '#33241a';
        g.fillStyle = '#f2c53d';
        g.strokeText(i.s, i.x, i.y - i.t * 60);
        g.fillText(i.s, i.x, i.y - i.t * 60);
        g.restore();
      }
    },
  };
}

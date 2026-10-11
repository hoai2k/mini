// Tableaux: the film edition's cutscenes show a painted scene concept
// (assets/tableaux/, from design/source/cut_planning.py) across the whole
// stage, with a slow push-in like a camera creeping toward the footlights,
// and a silent-film caption card. Drawing only; headless-safe.
import { clamp, easeInOut } from './shared.js';

// Draws tableau `id` (slot `tableau-<id>`) at `pt` seconds of a `dur`-second
// shot: fading up from black, pushing in by `zoom`, toward `focus` (stage px).
export function tableau(k, id, pt, dur, { zoom = 0.07, focus = [640, 360], fadeIn = 0.5, fadeOut = 0.5 } = {}) {
  const c = k.c, f = clamp(pt / dur, 0, 1), s = 1 + zoom * easeInOut(f);
  c.save();
  c.fillStyle = k.col('#140a12'); c.fillRect(0, 0, 1280, 720);
  c.translate(focus[0], focus[1]); c.scale(s, s); c.translate(-focus[0], -focus[1]);
  if (!k.asset('tableau-' + id, 640, 720, 1280, 720)) {
    const g = c.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, k.col('#3a2240')); g.addColorStop(1, k.col('#120810'));
    c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
  }
  c.restore();
  const a = Math.min(clamp(pt / fadeIn, 0, 1), clamp((dur - pt) / fadeOut, 0, 1));
  if (a < 1) { c.save(); c.globalAlpha = 1 - a; c.fillStyle = '#000'; c.fillRect(0, 0, 1280, 720); c.restore(); }
}

// A silent-film caption: plum card, double pink rule, a line of script and a
// smaller line of capitals, fading with `a`.
export function card(k, title, sub = '', a = 1, { cx = 640, y = 548, w = 760 } = {}) {
  if (a <= 0) return;
  const c = k.c, h = sub ? 112 : 84, x = cx - w / 2;
  c.save(); c.globalAlpha = a * 0.94;
  c.fillStyle = k.col('#2a1424'); c.fillRect(x, y, w, h);
  c.strokeStyle = k.col('#c79ab7'); c.lineWidth = 1.5;
  c.strokeRect(x + 6, y + 6, w - 12, h - 12); c.strokeRect(x + 12, y + 12, w - 24, h - 24);
  c.globalAlpha = a; c.textAlign = 'center'; c.fillStyle = k.col('#f3c6dc');
  c.font = '46px Yesteryear, cursive'; c.fillText(title, cx, y + (sub ? 56 : 56));
  if (sub) { c.font = '700 14px "Josefin Sans", sans-serif'; c.fillText(sub.toUpperCase(), cx, y + 88); }
  c.restore();
}

// How far into a shot its caption should be showing (fades in after `delay`).
export const cardAlpha = (pt, dur, delay = 0.6) => Math.min(clamp((pt - delay) / 0.5, 0, 1), clamp((dur - pt) / 0.4, 0, 1));

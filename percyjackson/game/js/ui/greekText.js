// The demigod reading effect in the page: writing first appears as Greek
// letters, holds a moment, then each letter rearranges itself and settles
// into English, left to right, with a gold glow. The timings are in
// ui/greekTiming.js (GREEK.title, GREEK.boss, ...). Only in-game and title
// text uses it; narration and messages are plain English. Respects
// settings.greekText and reduced motion (then the English shows at once).
import { settings, prefersReducedMotion } from '../settings.js';
import { GREEK, FLUX, FLUX_HZ, greekPlan, randGreek, upperOf } from './greekTiming.js';

export { toGreek, GREEK } from './greekTiming.js';

// Is the effect on? (Settings → Greek text effect, and not reduced motion.)
export const greekOn = () => !!settings.greekText && !prefersReducedMotion();

const active = new Set();
let raf = 0;
function loop(now) {
  raf = 0;
  for (const a of [...active]) {
    const t = (now - a.t0) / 1000 - a.delay;
    if (t < 0) continue;
    for (const L of a.letters) {
      if (L.done) continue;
      if (t >= L.at) { L.el.textContent = L.ch; L.el.classList.remove('flux'); L.el.classList.add('set'); L.done = true; a.left--; continue; }
      if (t >= L.at - FLUX) {
        const step = Math.floor(t * FLUX_HZ);
        if (step !== L.step) { L.step = step; L.el.textContent = randGreek(upperOf(L.ch)); L.el.classList.add('flux'); }
      }
    }
    if (a.left <= 0) { active.delete(a); a.finishDone(); }
  }
  if (active.size) raf = requestAnimationFrame(loop);
}

// Write `text` into `el` as Greek that settles into English.
// timing: { hold, settle } (a GREEK entry); delay: seconds before it starts.
export function demigodText(el, text, { timing = GREEK.title, delay = 0, onDone } = {}) {
  text = String(text ?? '');
  const handle = { done: false, finish() { /* replaced below */ }, cancel() { } };
  el.setAttribute('aria-label', text);
  if (!greekOn() || !text.trim()) {
    el.textContent = text; handle.done = true; onDone?.(); return handle;
  }
  el.textContent = '';
  el.classList.add('demigod');
  const gt = document.createElement('span'); gt.className = 'gt'; gt.setAttribute('aria-hidden', 'true');
  const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
  el.append(sr, gt);
  const plan = greekPlan(text, timing);
  const letters = [];
  let word = null;
  for (const L of plan) {
    if (/\s/.test(L.ch)) { word = null; gt.append(document.createTextNode(L.ch)); continue; }
    if (!word) { word = document.createElement('span'); word.className = 'gw'; gt.append(word); }
    const s = document.createElement('span'); s.className = 'gl';
    s.textContent = L.greek;
    if (L.at >= 0) letters.push({ el: s, ch: L.ch, at: L.at, step: -1, done: false });
    word.append(s);
  }
  const a = { el, letters, left: letters.length, t0: performance.now(), delay, finishDone: () => { handle.done = true; onDone?.(); } };
  handle.finish = () => {
    if (handle.done) return;
    active.delete(a);
    for (const L of letters) { L.el.textContent = L.ch; L.el.classList.remove('flux'); L.done = true; }
    handle.done = true; onDone?.();
  };
  handle.cancel = () => { active.delete(a); handle.done = true; };
  if (!letters.length) { handle.finish(); return handle; }
  active.add(a);
  if (!raf) raf = requestAnimationFrame(loop);
  return handle;
}

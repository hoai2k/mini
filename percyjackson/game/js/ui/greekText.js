// The demigod reading effect: writing first appears as Greek letters, then
// each letter rearranges itself and settles into English, left to right, with
// a gold glow. Respects settings.greekText and reduced motion (then the
// English shows at once).
import { settings, prefersReducedMotion } from '../settings.js';

// Look-alike Greek letters; any other letter becomes a random Greek one.
const LOOK = {
  A: 'Α', B: 'Β', E: 'Ε', Z: 'Ζ', H: 'Η', I: 'Ι', K: 'Κ', M: 'Μ', N: 'Ν', O: 'Ο', P: 'Ρ', T: 'Τ', Y: 'Υ', X: 'Χ',
  C: 'Ϲ', S: 'Σ', D: 'Δ', L: 'Λ', G: 'Γ', F: 'Φ', R: 'Ρ', U: 'Υ', V: 'Ν', W: 'Ω', J: 'Ϳ',
  a: 'α', b: 'β', d: 'δ', e: 'ε', i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'η', o: 'ο', p: 'ρ', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', v: 'ν', w: 'ω', x: 'χ', y: 'γ', z: 'ζ', c: 'ϲ', f: 'φ', g: 'γ', h: 'η', j: 'ϳ',
};
const RAND_L = 'αβγδεζηθκλμνξπρστφχψω';
const RAND_U = 'ΓΔΘΛΞΠΣΦΨΩ';
const isLetter = (c) => /[A-Za-z]/.test(c);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const randGreek = (upper, r = Math.random) => { const s = upper ? RAND_U : RAND_L; return s[Math.floor(r() * s.length)]; };
const upperOf = (c) => c === c.toUpperCase();

// Whole string to Greek letters (stable for a given seed), for scrolls and signs.
export function toGreek(text, seed = 1) {
  const r = rng(seed);
  let out = '';
  for (const c of text) out += isLetter(c) ? (r() < 0.8 && LOOK[c] ? LOOK[c] : randGreek(upperOf(c), r)) : c;
  return out;
}

const active = new Set();
let raf = 0;
function loop(now) {
  raf = 0;
  for (const a of [...active]) {
    const t = (now - a.t0) / 1000 - a.delay;
    if (t < 0) continue;
    let changed = false;
    for (const L of a.letters) {
      if (L.done) continue;
      if (t >= L.at) { L.el.textContent = L.ch; L.el.classList.remove('flux'); L.el.classList.add('set'); L.done = true; a.left--; continue; }
      if (t >= L.at - 0.3) {
        const step = Math.floor(t * 18);
        if (step !== L.step) { L.step = step; L.el.textContent = randGreek(upperOf(L.ch)); L.el.classList.add('flux'); }
      }
    }
    if (a.left <= 0) { active.delete(a); a.finishDone(); changed = true; }
    void changed;
  }
  if (active.size) raf = requestAnimationFrame(loop);
}

export function demigodText(el, text, { speed = 1, delay = 0, onDone } = {}) {
  text = String(text ?? '');
  const handle = { done: false, finish() { /* replaced below */ }, cancel() { } };
  el.setAttribute('aria-label', text);
  if (!settings.greekText || prefersReducedMotion() || !text.trim()) {
    el.textContent = text; handle.done = true; onDone?.(); return handle;
  }
  el.textContent = '';
  el.classList.add('demigod');
  const gt = document.createElement('span'); gt.className = 'gt'; gt.setAttribute('aria-hidden', 'true');
  const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
  el.append(sr, gt);
  const letters = [];
  const words = text.split(/(\s+)/);
  const nLetters = [...text].filter(isLetter).length || 1;
  const total = Math.min(1.2, 0.6 + nLetters * 0.012) / Math.max(0.25, speed);
  let idx = 0;
  const r = rng(text.length * 7919 + 13);
  for (const w of words) {
    if (/^\s+$/.test(w)) { gt.append(document.createTextNode(w)); continue; }
    const ws = document.createElement('span'); ws.className = 'gw';
    for (const ch of w) {
      const s = document.createElement('span'); s.className = 'gl';
      if (isLetter(ch)) {
        s.textContent = LOOK[ch] && r() < 0.85 ? LOOK[ch] : randGreek(upperOf(ch), r);
        letters.push({ el: s, ch, at: 0.3 + (idx / nLetters) * (total - 0.3) + r() * 0.08, step: -1, done: false });
        idx++;
      } else s.textContent = ch;
      ws.append(s);
    }
    gt.append(ws);
  }
  const a = { el, letters, left: letters.length, t0: performance.now(), delay, finishDone: () => { handle.done = true; onDone?.(); } };
  handle.finish = () => {
    if (handle.done) return;
    active.delete(a);
    for (const L of letters) { L.el.textContent = L.ch; L.el.classList.remove('flux'); L.done = true; }
    handle.done = true; onDone?.();
  };
  handle.cancel = () => { active.delete(a); handle.done = true; };
  active.add(a);
  if (!raf) raf = requestAnimationFrame(loop);
  return handle;
}

// The notation strip above the keyboard, as in Chet: a staff with one slot per
// note of the melody. Notes already found show as notes at their pitch (tap one
// to hear it); the note being looked for is a brass "?" tile; the rest are grey
// "?" tiles. During playback each slot glows as its note sounds.
import G from './glyphs.js';
import { spell, spellToken, staffStep, keyOf } from './music.js';

const NS = 'http://www.w3.org/2000/svg';
const U = 250; // font units per staff space
// Bottom staff line of each clef, as a diatonic step (C4 = 28).
const CLEFS = { treble: { bottom: 30, glyph: 'gClef', origin: 32 }, bass: { bottom: 18, glyph: 'fClef', origin: 24 } };
const ACC = { '-2': 'doubleFlat', '-1': 'flat', 1: 'sharp', 2: 'doubleSharp' };

/** Spell and place each note of a melody: { step, acc, midi }. Notes keep the
 *  spelling they were written with unless the melody was transposed. */
export function spellMelody(notes, shifted) {
  const key = keyOf(notes);
  return notes.map((n) => {
    const sp = !shifted && n.name ? spellToken(n.name) : spell(n.midi, key);
    return { midi: n.midi, acc: sp.acc, step: staffStep(sp) };
  });
}

export const clefFor = (notes) => (notes.reduce((a, n) => a + n.midi, 0) / notes.length < 55 ? 'bass' : 'treble');

export function createStaff(host, { onTap } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'staff-svg');
  svg.setAttribute('role', 'img');
  host.append(svg);
  let model = null; // { spelled, clef, pos, done }
  const slots = [];

  const el = (name, attrs, parent = svg) => {
    const e = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    parent.append(e);
    return e;
  };
  const glyph = (name, x, y, s, parent, cls) => el('path', { d: G[name].d, transform: `translate(${x} ${y}) scale(${s / U} ${-s / U})`, class: cls || '' }, parent);

  function draw() {
    svg.textContent = '';
    slots.length = 0;
    if (!model) return;
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const { spelled, clef } = model;
    const c = CLEFS[clef];
    const n = spelled.length;
    const steps = spelled.map((s) => s.step);
    const lo = Math.min(c.bottom - 3, ...steps.map((s) => s - 2));
    const hi = Math.max(c.bottom + 11, ...steps.map((s) => s + 2));
    // Staff space S: fit the height, and the width (each slot ~2.5 spaces, clef ~4).
    let S = Math.min(H / ((hi - lo) / 2 + 0.6), (W - 8) / (n * 2.5 + 5.2), 16);
    const yOf = (step) => H / 2 + ((lo + hi) / 2 - step) * (S / 2);
    const left = S * 0.6;
    // Staff lines
    for (let k = 0; k < 5; k++) el('line', { x1: left, x2: W - S * 0.5, y1: yOf(c.bottom + 2 * k), y2: yOf(c.bottom + 2 * k), class: 'staff-line', 'stroke-width': Math.max(1, S * 0.08) });
    // Final barline (thin, thick)
    const top = yOf(c.bottom + 8), bot = yOf(c.bottom);
    el('rect', { x: W - S * 0.5 - S * 0.5, y: top, width: S * 0.5, height: bot - top, class: 'staff-ink' });
    el('rect', { x: W - S * 0.5 - S * 1.05, y: top, width: Math.max(1, S * 0.1), height: bot - top, class: 'staff-ink' });
    // Clef
    glyph(c.glyph, left + S * 0.3, yOf(c.origin), S, svg, 'staff-ink');
    const x0 = left + S * 3.6, x1 = W - S * 1.8;
    const slotW = (x1 - x0) / n;
    const mid = yOf(c.bottom + 4);
    const headW = (G.notehead.w / U) * S;
    spelled.forEach((sp, i) => {
      const cx = x0 + slotW * (i + 0.5);
      const g = el('g', { class: 'slot', 'data-i': i });
      slots.push(g);
      const shown = model.done || i < model.pos;
      if (!shown) {
        const tw = Math.min(slotW * 0.74, S * 1.9), th = S * 2.7;
        g.classList.add(i === model.pos && !model.practice ? 'current' : 'pending');
        el('rect', { x: cx - tw / 2, y: mid - th / 2, width: tw, height: th, rx: S * 0.38, class: 'tile' }, g);
        const t = el('text', { x: cx, y: mid + S * 0.62, 'font-size': S * 1.75, 'text-anchor': 'middle', class: 'tile-q' }, g);
        t.textContent = '?';
        return;
      }
      g.classList.add('note');
      const y = yOf(sp.step);
      const hx = cx - headW / 2 + (sp.acc ? S * 0.35 : 0);
      // A wide invisible target so a note is easy to tap.
      el('rect', { x: cx - slotW / 2, y: 0, width: slotW, height: H, class: 'hit' }, g);
      // Ledger lines
      for (let s = c.bottom - 2; s >= sp.step; s -= 2) el('line', { x1: hx - S * 0.4, x2: hx + headW + S * 0.4, y1: yOf(s), y2: yOf(s), class: 'staff-line ledger', 'stroke-width': Math.max(1, S * 0.12) }, g);
      for (let s = c.bottom + 10; s <= sp.step; s += 2) el('line', { x1: hx - S * 0.4, x2: hx + headW + S * 0.4, y1: yOf(s), y2: yOf(s), class: 'staff-line ledger', 'stroke-width': Math.max(1, S * 0.12) }, g);
      if (sp.acc) {
        const a = ACC[sp.acc];
        glyph(a, hx - (G[a].w / U) * S - S * 0.22, y, S, g, 'staff-ink');
      }
      glyph('notehead', hx, y, S, g, 'staff-ink head');
      // Stems point toward the middle line.
      const up = sp.step < c.bottom + 4;
      const sw = Math.max(1, S * 0.12);
      el('rect', up
        ? { x: hx + headW - sw, y: y - S * 3.4, width: sw, height: S * 3.4 - S * 0.15, class: 'staff-ink' }
        : { x: hx, y: y + S * 0.15, width: sw, height: S * 3.4 - S * 0.15, class: 'staff-ink' }, g);
      if (i === model.lastFound) g.classList.add('pop');
    });
    svg.setAttribute('aria-label', `${model.done ? n : model.pos} of ${n} notes found`);
  }

  svg.addEventListener('pointerdown', (e) => {
    const g = e.target.closest?.('.slot.note');
    if (!g) return;
    e.preventDefault();
    const i = Number(g.dataset.i);
    flash(i, 'tap');
    onTap?.(model.spelled[i].midi, i);
  });

  function flash(i, cls, ms = 450) {
    const g = slots[i];
    if (!g) return;
    g.classList.remove(cls);
    void g.getBoundingClientRect();
    g.classList.add(cls);
    clearTimeout(g['_t' + cls]);
    g['_t' + cls] = setTimeout(() => g.classList.remove(cls), ms);
  }

  new ResizeObserver(() => draw()).observe(host);

  return {
    /** Show a melody: notes (parsed), whether it was transposed, and the answer state. */
    set(notes, shifted) {
      model = { spelled: spellMelody(notes, shifted), clef: clefFor(notes), pos: 0, done: false, practice: false, lastFound: -1 };
      draw();
    },
    update({ pos, done, practice }) {
      if (!model) return;
      model.lastFound = pos > model.pos ? pos - 1 : -1;
      Object.assign(model, { pos, done, practice });
      draw();
    },
    flash,
    hear(i, ms) { flash(i, 'hear', ms); },
  };
}

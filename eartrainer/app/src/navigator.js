// The navigator above the keys: the whole piano in miniature, with a bright
// window over the keys on screen. Grab the window (or anywhere on the bar)
// and drag to slide along the piano; tap elsewhere to jump there. Buttons
// move an octave at a time and show fewer or more keys. Keys being played,
// the melody's first-note marker and its range show on the miniature too, so
// nothing is lost off screen.
import { isWhite } from './music.js';
import { WHITE_COUNTS } from './keyboard.js';

export function createNavigator(host, kbd, { onWhites } = {}) {
  host.innerHTML = `
    <button class="nav-btn" data-act="left" aria-label="Down an octave" data-tip="Down an octave">‹</button>
    <div class="nav-track" role="slider" aria-label="Position on the piano" tabindex="-1">
      <div class="nav-keys"></div>
      <div class="nav-range" hidden></div>
      <div class="nav-view"><span class="nav-grip" aria-hidden="true"></span></div>
    </div>
    <button class="nav-btn" data-act="right" aria-label="Up an octave" data-tip="Up an octave">›</button>
    <div class="nav-zoom" role="group" aria-label="Keys on screen">
      <button class="nav-btn" data-act="fewer" aria-label="Fewer keys" data-tip="Fewer, bigger keys">−</button>
      <output class="nav-count"></output>
      <button class="nav-btn" data-act="more" aria-label="More keys" data-tip="More, smaller keys">+</button>
    </div>`;
  const track = host.querySelector('.nav-track');
  const keysEl = host.querySelector('.nav-keys');
  const view = host.querySelector('.nav-view');
  const rangeEl = host.querySelector('.nav-range');
  const count = host.querySelector('.nav-count');
  const total = kbd.total;
  const mini = new Map();

  // Miniature keys, placed in percent of the track.
  for (let m = kbd.lo; m <= kbd.hi; m++) {
    const el = document.createElement('i');
    const w = isWhite(m);
    el.className = w ? 'w' : 'b';
    const x = w ? kbd.whiteIndexOf(m) : kbd.whiteIndexOf(m - 1) + 1 - 0.3;
    el.style.left = `${(x / total) * 100}%`;
    el.style.width = `${((w ? 1 : 0.6) / total) * 100}%`;
    if (m % 12 === 0 && m !== kbd.lo) el.dataset.c = `C${m / 12 - 1}`;
    keysEl.append(el);
    mini.set(m, el);
  }
  kbd.addMirror((m, cls, on) => mini.get(m)?.classList.toggle(cls, on));

  function sync(pos, whites) {
    view.style.left = `${(pos / total) * 100}%`;
    view.style.width = `${(whites / total) * 100}%`;
    const keysOnScreen = kbd.shown().length;
    count.textContent = `${keysOnScreen} keys`;
    track.setAttribute('aria-valuetext', `${keysOnScreen} keys from ${kbd.start ? noteLabel(kbd.start) : ''}`);
    host.querySelector('[data-act=fewer]').disabled = whites <= WHITE_COUNTS[0];
    host.querySelector('[data-act=more]').disabled = whites >= Math.min(total, WHITE_COUNTS[WHITE_COUNTS.length - 1]);
  }
  const noteLabel = (m) => `${'C D EF G A B'[m % 12] || ''}${Math.floor(m / 12) - 1}`;

  // Dragging: grab offset inside the window, or centre the window on a tap outside it.
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = track.getBoundingClientRect();
    const at = ((e.clientX - r.left) / r.width) * total; // in white keys
    const inside = at >= kbd.pos && at <= kbd.pos + kbd.whites;
    drag = { id: e.pointerId, grab: inside ? at - kbd.pos : kbd.whites / 2, moved: false, startX: e.clientX };
    try { track.setPointerCapture(e.pointerId); } catch { /* fine */ }
    host.classList.add('dragging');
    if (!inside) kbd.scrollTo(at - drag.grab, { animate: true });
  });
  track.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (Math.abs(e.clientX - drag.startX) > 3) drag.moved = true;
    if (!drag.moved) return;
    const r = track.getBoundingClientRect();
    const at = ((e.clientX - r.left) / r.width) * total;
    kbd.scrollTo(at - drag.grab, { snap: false, quick: true });
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    host.classList.remove('dragging');
    kbd.scrollTo(kbd.pos, { animate: true }); // settle on a whole key
  };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);

  function octave(dir) { kbd.scrollTo(kbd.pos + 7 * dir, { animate: true }); }
  function zoom(dir) {
    const i = WHITE_COUNTS.findIndex((n) => n >= kbd.whites);
    const next = WHITE_COUNTS[Math.max(0, Math.min(WHITE_COUNTS.length - 1, (i < 0 ? WHITE_COUNTS.length - 1 : i) + dir))];
    kbd.setWhites(next, true);
    onWhites?.(kbd.whites);
  }
  host.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'left') octave(-1);
    if (act === 'right') octave(1);
    if (act === 'fewer') zoom(-1);
    if (act === 'more') zoom(1);
  });

  return {
    sync,
    octave,
    zoom,
    /** Mark a melody's range on the miniature (or clear it with null). */
    setRange(loNote, hiNote) {
      if (loNote == null) { rangeEl.hidden = true; return; }
      const a = kbd.whiteIndexOf(isWhite(loNote) ? loNote : loNote - 1);
      const b = kbd.whiteIndexOf(isWhite(hiNote) ? hiNote : hiNote + 1) + 1;
      rangeEl.hidden = false;
      rangeEl.style.left = `${(a / total) * 100}%`;
      rangeEl.style.width = `${((b - a) / total) * 100}%`;
    },
  };
}

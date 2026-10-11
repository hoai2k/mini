// The on-screen keyboard: the whole piano (A0 to C8) on one long strip, of
// which a window shows: eleven white keys (an octave and a half) by default,
// fewer or more on request. The strip slides to put each melody in view, and
// the player can slide it anywhere (the navigator bar above the keys, a
// sideways scroll on a trackpad, or the octave buttons).
//
// Keys answer on pointerdown for the lowest latency, each finger separately
// (chords and fast repeated notes work), and release on pointerup. Sliding a
// finger does not play other keys: an accidental slide must not count as a
// wrong note.
import { isWhite, isBlack, noteName } from './music.js';

// How far each black key sits off the line between its white keys (fraction of its width).
const BLACK_OFFSET = { 1: -0.12, 3: 0.12, 6: -0.14, 8: 0, 10: 0.14 };
// Computer keys: the home row plays the white keys on screen, the row above the black keys between them.
const WHITE_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
const BLACK_CODES = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'];
// How many white keys can show, from about an octave to the whole piano.
export const WHITE_COUNTS = [8, 11, 15, 18, 22, 29, 36, 52];

export function createKeyboard(root, { lo = 21, hi = 108, whites = 11, onDown, onUp, onView }) {
  const viewport = root;
  const strip = document.createElement('div');
  strip.className = 'strip';
  viewport.append(strip);
  const keys = new Map(); // midi -> element
  const whiteIndex = new Map();
  const whiteAt = [];
  for (let m = lo; m <= hi; m++) {
    const el = document.createElement('div');
    el.className = `key ${isWhite(m) ? 'white' : 'black'}`;
    el.dataset.midi = m;
    el.innerHTML = '<span class="glow"></span><span class="marker" aria-hidden="true"></span><span class="label"></span><span class="cap"></span>';
    if (isWhite(m)) { whiteIndex.set(m, whiteAt.length); whiteAt.push(m); }
    keys.set(m, el);
    strip.append(el);
  }
  const total = whiteAt.length;
  let pos = whiteIndex.get(60); // left edge of the view, in white keys (may be fractional while dragging)
  let keyW = 60;
  let cursor = null;
  let labelMode = 'c';
  const mirrors = []; // (midi, class, on) listeners: the navigator copies key states

  const maxPos = () => Math.max(0, total - whites);
  const clampPos = (p) => Math.min(maxPos(), Math.max(0, p));

  function layout() {
    const w = viewport.clientWidth;
    if (!w) return;
    keyW = w / whites;
    const bw = keyW * 0.6;
    for (const [m, el] of keys) {
      if (isWhite(m)) {
        el.style.left = `${whiteIndex.get(m) * keyW}px`;
        el.style.width = `${keyW}px`;
      } else {
        const x = (whiteIndex.get(m - 1) + 1) * keyW - bw / 2 + BLACK_OFFSET[m % 12] * bw;
        el.style.left = `${x}px`;
        el.style.width = `${bw}px`;
      }
    }
    strip.style.width = `${total * keyW}px`;
    strip.classList.toggle('dense', keyW < 34);
    place(false);
  }

  /** Move the strip to `pos`. A full update (dimming, labels, computer keys)
   *  runs unless `quick` (each frame of a drag only moves the strip). */
  function place(animate = true, quick = false) {
    strip.classList.toggle('sliding', animate);
    strip.style.transform = `translate3d(${-pos * keyW}px,0,0)`;
    if (!quick) {
      for (const [m, el] of keys) el.classList.toggle('off', !visible(m));
      labels();
    }
    onView?.(pos, whites, total);
  }

  /** Is a key on screen? (its middle inside the view) */
  function visible(m) {
    const el = keys.get(m);
    if (!el) return false;
    const mid = isWhite(m) ? whiteIndex.get(m) + 0.5 : whiteIndex.get(m - 1) + 1;
    return mid >= pos - 0.01 && mid <= pos + whites + 0.01;
  }
  /** The keys on screen, low to high. */
  function shown() {
    const out = [];
    for (const m of keys.keys()) if (visible(m)) out.push(m);
    return out;
  }

  /** Show the window starting on white key `s` (a midi note). */
  function setWindow(s, animate = true) {
    if (s == null || !whiteIndex.has(s)) return;
    pos = clampPos(whiteIndex.get(s));
    place(animate);
  }
  /** Scroll to a position in white keys; `snap` settles on a whole key. */
  function scrollTo(p, { animate = false, snap = true, quick = false } = {}) {
    pos = clampPos(snap ? Math.round(p) : p);
    place(animate, quick);
  }
  /** Show a range of notes: centred if it fits, else from its lowest note. */
  function showRange(loNote, hiNote, animate = true) {
    const a = whiteIndex.get(isWhite(loNote) ? loNote : loNote - 1);
    const b = whiteIndex.get(isWhite(hiNote) ? hiNote : hiNote + 1);
    const span = b - a + 1;
    const p = span <= whites ? a - Math.floor((whites - span) / 2) : a - 0.5;
    scrollTo(p, { animate });
  }
  function setWhites(n, animate = false) {
    const centre = pos + whites / 2;
    whites = Math.max(WHITE_COUNTS[0], Math.min(total, n));
    layout();
    scrollTo(centre - whites / 2, { animate });
  }

  function labels() {
    for (const [m, el] of keys) {
      const lab = el.querySelector('.label');
      let text = '';
      if (labelMode === 'all' || (labelMode === 'white' && isWhite(m)) || (labelMode === 'c' && m % 12 === 0)) {
        text = labelMode === 'c' ? noteName(m) : noteName(m, { octave: m % 12 === 0, flats: false });
      }
      if (lab.textContent !== text) lab.textContent = text;
    }
    // Computer-key hints (shown once a hardware keyboard has been used): the
    // first eleven white keys on screen and the black keys between them.
    const ws = shown();
    let i = 0;
    const capOf = new Map();
    for (const m of ws) {
      if (isWhite(m)) { if (i < WHITE_CODES.length) capOf.set(m, WHITE_CODES[i]); i++; } else if (i < BLACK_CODES.length) capOf.set(m, BLACK_CODES[i]);
    }
    for (const [m, el] of keys) {
      const code = capOf.get(m);
      const t = code ? code.replace('Key', '').replace('Semicolon', ';').replace('Quote', "'").replace('BracketLeft', '[').replace('BracketRight', ']') : '';
      const cap = el.querySelector('.cap');
      if (cap.textContent !== t) cap.textContent = t;
    }
    codeMap = new Map([...capOf].map(([m, c]) => [c, m]));
  }
  let codeMap = new Map();

  // ---- pointer input
  const held = new Map(); // pointerId -> midi
  function keyAt(target) {
    const el = target?.closest?.('.key');
    return el ? Number(el.dataset.midi) : null;
  }
  viewport.addEventListener('pointerdown', (e) => {
    const m = keyAt(e.target);
    if (m == null) return;
    e.preventDefault();
    try { viewport.setPointerCapture(e.pointerId); } catch { /* fine */ }
    held.set(e.pointerId, m);
    down(m, 'pointer', e);
  });
  const lift = (e) => {
    const m = held.get(e.pointerId);
    if (m == null) return;
    held.delete(e.pointerId);
    if (![...held.values()].includes(m)) up(m, 'pointer');
  };
  viewport.addEventListener('pointerup', lift);
  viewport.addEventListener('pointercancel', lift);
  viewport.addEventListener('lostpointercapture', lift);
  viewport.addEventListener('contextmenu', (e) => e.preventDefault());
  // A sideways scroll (trackpad, or shift + wheel) slides along the piano.
  let wheelT = 0;
  viewport.addEventListener('wheel', (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (!d) return;
    e.preventDefault();
    scrollTo(pos + d / keyW, { snap: false, quick: true });
    clearTimeout(wheelT);
    wheelT = setTimeout(() => scrollTo(pos, { animate: true }), 140);
  }, { passive: false });

  function mirror(m, cls, on) { for (const f of mirrors) f(m, cls, on); }
  function down(m, source, e) {
    keys.get(m)?.classList.add('down');
    mirror(m, 'down', true);
    onDown?.(m, source, e);
  }
  function up(m, source) {
    keys.get(m)?.classList.remove('down');
    mirror(m, 'down', false);
    onUp?.(m, source);
  }

  // ---- computer keys
  const codeHeld = new Set();
  function keydown(e) {
    const m = codeMap.get(e.code);
    if (m == null) return false;
    if (!e.repeat && !codeHeld.has(e.code)) { codeHeld.add(e.code); down(m, 'key'); document.documentElement.classList.add('kbd-used'); }
    return true;
  }
  function keyup(e) {
    const m = codeMap.get(e.code);
    if (!codeHeld.has(e.code)) return false;
    codeHeld.delete(e.code);
    if (m != null) up(m, 'key');
    return true;
  }

  // ---- states
  function flash(m, cls) {
    const el = keys.get(m);
    if (!el) return;
    el.classList.remove('ok', 'bad');
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove(cls), 520);
  }
  let marker = null;
  function setMarker(m) {
    if (marker != null) { keys.get(marker)?.classList.remove('first'); mirror(marker, 'first', false); }
    marker = m;
    if (m != null) { keys.get(m)?.classList.add('first'); mirror(m, 'first', true); }
  }
  function light(m, on) { keys.get(m)?.classList.toggle('lit', on); mirror(m, 'lit', on); }
  function clearLights() { for (const [m, el] of keys) if (el.classList.contains('lit')) light(m, false); }

  // ---- controller cursor: moves chromatically across the keys on screen
  function moveCursor(dir) {
    const ws = shown();
    let i = ws.indexOf(cursor);
    i = i < 0 ? Math.floor(ws.length / 2) : Math.max(0, Math.min(ws.length - 1, i + dir));
    setCursor(ws[i]);
  }
  function setCursor(m) {
    if (cursor != null) keys.get(cursor)?.classList.remove('cursor');
    cursor = m;
    if (m != null) keys.get(m)?.classList.add('cursor');
  }

  addEventListener('resize', () => requestAnimationFrame(layout));
  window.visualViewport?.addEventListener('resize', () => requestAnimationFrame(layout));
  new ResizeObserver(() => layout()).observe(viewport);
  layout();

  return {
    setWindow, scrollTo, showRange, setWhites, layout, flash, setMarker, light, clearLights, keydown, keyup,
    moveCursor, setCursor,
    get cursor() { return cursor; },
    pressCursor() { if (cursor != null) down(cursor, 'pad'); return cursor; },
    releaseCursor(m) { if (m != null) up(m, 'pad'); },
    releaseAll() { for (const m of held.values()) up(m, 'pointer'); held.clear(); for (const c of codeHeld) { const m = codeMap.get(c); if (m != null) up(m, 'key'); } codeHeld.clear(); },
    setLabels(mode) { labelMode = mode; labels(); },
    addMirror(f) { mirrors.push(f); },
    get start() { return whiteAt[Math.round(pos)]; },
    get pos() { return pos; },
    get whites() { return whites; },
    get total() { return total; },
    get lo() { return lo; },
    get hi() { return hi; },
    whiteIndexOf: (m) => whiteIndex.get(m),
    shown,
    visible,
    isBlack,
  };
}

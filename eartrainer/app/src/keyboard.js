// The on-screen keyboard: every key from C2 to C7 on one long strip, of which
// a window of eleven white keys (an octave and a half) shows. The strip slides
// to put each melody in view.
//
// Keys answer on pointerdown for the lowest latency, each finger separately
// (chords and fast repeated notes work), and release on pointerup. Sliding a
// finger does not play other keys: an accidental slide must not count as a
// wrong note.
import { isWhite, isBlack, noteName, windowKeys } from './music.js';

// How far each black key sits off the line between its white keys (fraction of its width).
const BLACK_OFFSET = { 1: -0.12, 3: 0.12, 6: -0.14, 8: 0, 10: 0.14 };
// Computer keys: the home row plays the white keys on screen, the row above the black keys between them.
const WHITE_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
const BLACK_CODES = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'];

export function createKeyboard(root, { lo = 36, hi = 96, whites = 11, onDown, onUp }) {
  const viewport = root;
  const strip = document.createElement('div');
  strip.className = 'strip';
  viewport.append(strip);
  const keys = new Map(); // midi -> element
  const whiteIndex = new Map();
  let wi = 0;
  for (let m = lo; m <= hi; m++) {
    const el = document.createElement('div');
    el.className = `key ${isWhite(m) ? 'white' : 'black'}`;
    el.dataset.midi = m;
    el.innerHTML = '<span class="glow"></span><span class="marker" aria-hidden="true"></span><span class="label"></span><span class="cap"></span>';
    if (isWhite(m)) whiteIndex.set(m, wi++);
    keys.set(m, el);
    strip.append(el);
  }
  let start = 60; // window start (a white key)
  let keyW = 60;
  let cursor = null;
  let labelMode = 'c';

  function layout() {
    const w = viewport.clientWidth;
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
    strip.style.width = `${wi * keyW}px`;
    place(false);
  }

  function place(animate = true) {
    strip.classList.toggle('sliding', animate);
    strip.style.transform = `translate3d(${-whiteIndex.get(start) * keyW}px,0,0)`;
    for (const [m, el] of keys) el.classList.toggle('off', !visible(m));
    labels();
  }

  const visible = (m) => {
    const ks = windowKeys(start, whites);
    return m >= ks[0] && m <= ks[ks.length - 1];
  };

  function setWindow(s, animate = true) {
    if (s == null || !whiteIndex.has(s)) return;
    start = s;
    place(animate);
  }

  function labels() {
    for (const [m, el] of keys) {
      const lab = el.querySelector('.label');
      let text = '';
      if (labelMode === 'all' || (labelMode === 'white' && isWhite(m)) || (labelMode === 'c' && m % 12 === 0)) {
        text = labelMode === 'c' ? noteName(m) : noteName(m, { octave: m % 12 === 0, flats: false });
      }
      lab.textContent = text;
    }
    // Computer-key hints, when a hardware keyboard has been used.
    const ws = windowKeys(start, whites);
    let i = 0;
    const capOf = new Map();
    for (const m of ws) {
      if (isWhite(m)) { capOf.set(m, WHITE_CODES[i]); i++; } else capOf.set(m, BLACK_CODES[i]);
    }
    for (const [m, el] of keys) {
      const code = capOf.get(m);
      el.querySelector('.cap').textContent = code ? code.replace('Key', '').replace('Semicolon', ';').replace('Quote', "'").replace('BracketLeft', '[').replace('BracketRight', ']') : '';
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

  function down(m, source, e) {
    keys.get(m)?.classList.add('down');
    onDown?.(m, source, e);
  }
  function up(m, source) {
    keys.get(m)?.classList.remove('down');
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
  function setMarker(m) {
    for (const el of keys.values()) el.classList.remove('first');
    if (m != null) keys.get(m)?.classList.add('first');
  }
  function light(m, on) { keys.get(m)?.classList.toggle('lit', on); }
  function clearLights() { for (const el of keys.values()) el.classList.remove('lit'); }

  // ---- controller cursor: moves chromatically across the keys on screen
  function moveCursor(dir) {
    const ws = windowKeys(start, whites);
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
    setWindow, layout, flash, setMarker, light, clearLights, keydown, keyup,
    moveCursor, setCursor,
    get cursor() { return cursor; },
    pressCursor() { if (cursor != null) down(cursor, 'pad'); return cursor; },
    releaseCursor(m) { if (m != null) up(m, 'pad'); },
    releaseAll() { for (const m of held.values()) up(m, 'pointer'); held.clear(); for (const c of codeHeld) { const m = codeMap.get(c); if (m != null) up(m, 'key'); } codeHeld.clear(); },
    setLabels(mode) { labelMode = mode; labels(); },
    get start() { return start; },
    visible,
    isBlack,
  };
}

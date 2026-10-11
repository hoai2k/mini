// Touch controls for phones and tablets. Feeds the same input snapshot the
// keyboard and pad do (src/input.js merges it), so acts need no changes and
// desktop is untouched: nothing here is shown unless the device is touch.
//
// Two schemes, chosen by the shell per scene (show({ mode })):
// - 'swipe' (rows and floors: Acts I, III, IV): the whole screen is the
//   control. Drag forward or back to move (moveX follows how far the finger
//   has travelled from where it settled), swipe up or down to change row,
//   and a quick tap is the act button. The A button stays for holding.
// - 'stick' (free movement: Act II swimming, Act V climbing): a floating
//   stick on the left half, analog in every direction. Its base is kept
//   fully on screen, however far the thumb strays.
// In both, the A button (labelled with its verb), B when a scene needs it,
// and pause sit on the right. Outside play a tap anywhere is a tap.

const DEAD = 0.22;            // stick dead zone (fraction of radius)
const RADIUS = 56;            // px the stick knob may travel
const BASE_R = 66;            // stick base radius (for keeping it on screen)
const DRAG_FULL = 70;         // swipe mode: px of drag for full speed
const FLICK = 38;             // swipe mode: px of vertical travel that counts as a swipe
const FLICK_MS = 320;         // ...within this long
const TAP_MS = 230, TAP_PX = 14;
const REPEAT_FIRST = 0.36, REPEAT_NEXT = 0.14;
const GESTURE_HOLD = 0.28;    // a tap or swipe-up "A" counts as A held this long (full jumps)
const FLICK_GAP = 200;        // ms between swipes within one drag

export function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
}

export function createTouch(root) {
  const zone = root.querySelector('.stick-zone');
  const base = root.querySelector('.stick-base');
  const knob = root.querySelector('.stick-knob');
  const hint = root.querySelector('.stick-hint');
  const btnA = root.querySelector('[data-t=a]');
  const btnB = root.querySelector('[data-t=b]');
  const btnPause = root.querySelector('[data-t=pause]');

  const st = { mode: 'stick', holdT: 0, lastFlick: 0, f: null, ax: 0, ay: 0, aHeld: false, edges: [], used: false, flickUpIsA: false };
  const rep = { dir: null, t: 0 };
  let taps = [];

  // Keep a stick base centred at (x, y) fully inside the viewport.
  const clampBase = (x, y) => [
    Math.min(innerWidth - BASE_R - 6, Math.max(BASE_R + 6, x)),
    Math.min(innerHeight - BASE_R - 6, Math.max(BASE_R + 6, y)),
  ];
  const placeBase = (x, y) => { base.style.left = x + 'px'; base.style.top = y + 'px'; };

  // ---- one finger on the control area
  zone.addEventListener('pointerdown', (e) => {
    if (st.f) return;
    e.preventDefault();
    zone.setPointerCapture(e.pointerId);
    const now = performance.now();
    st.used = true;
    if (st.mode === 'stick') {
      const [cx, cy] = clampBase(e.clientX, e.clientY);
      st.f = { id: e.pointerId, cx, cy };
      placeBase(cx, cy);
      base.classList.add('on');
      stickMove(e);
    } else {
      st.f = { id: e.pointerId, ax: e.clientX, x0: e.clientX, y0: e.clientY, t0: now, vy: e.clientY, vt: now, moved: 0 };
    }
  });
  zone.addEventListener('pointermove', (e) => {
    if (!st.f || e.pointerId !== st.f.id) return;
    if (st.mode === 'stick') stickMove(e); else swipeMove(e);
  });
  const end = (e) => {
    const f = st.f;
    if (!f || e.pointerId !== f.id) return;
    if (st.mode === 'swipe' && performance.now() - f.t0 < TAP_MS && f.moved < TAP_PX) { st.edges.push('a'); st.holdT = GESTURE_HOLD; }
    st.f = null; st.ax = 0; st.ay = 0;
    knob.style.transform = '';
    base.classList.remove('on');
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);

  function stickMove(e) {
    const f = st.f;
    let dx = e.clientX - f.cx, dy = e.clientY - f.cy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      // The base follows a thumb that strays far, but never leaves the screen.
      const over = d - RADIUS;
      [f.cx, f.cy] = clampBase(f.cx + (dx / d) * over, f.cy + (dy / d) * over);
      placeBase(f.cx, f.cy);
      dx = e.clientX - f.cx; dy = e.clientY - f.cy;
      const d2 = Math.hypot(dx, dy);
      if (d2 > RADIUS) { dx = (dx / d2) * RADIUS; dy = (dy / d2) * RADIUS; }
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / RADIUS, ny = dy / RADIUS, m = Math.hypot(nx, ny);
    if (m < DEAD) { st.ax = 0; st.ay = 0; return; }
    const k = (m - DEAD) / (1 - DEAD) / m; // rescale past the dead zone
    st.ax = nx * k; st.ay = ny * k;
  }

  function swipeMove(e) {
    const f = st.f, now = performance.now();
    f.moved = Math.max(f.moved, Math.hypot(e.clientX - f.x0, e.clientY - f.y0));
    // Forward / back: how far the finger has travelled from its anchor; the
    // anchor trails so reversing direction responds at once.
    let dx = e.clientX - f.ax;
    if (Math.abs(dx) > DRAG_FULL) { f.ax += dx - Math.sign(dx) * DRAG_FULL; dx = Math.sign(dx) * DRAG_FULL; }
    st.ax = Math.abs(dx) < 8 ? 0 : dx / DRAG_FULL;
    // Up / down: a quick vertical swipe changes row; several in one drag work.
    const dy = e.clientY - f.vy;
    if (now - f.vt > FLICK_MS) { f.vy = e.clientY; f.vt = now; }
    else if (Math.abs(dy) > FLICK && Math.abs(dy) > Math.abs(e.clientX - f.x0) * 0.6 && now - st.lastFlick > FLICK_GAP) {
      st.lastFlick = now;
      const asA = dy < 0 && st.flickUpIsA;
      const dir = dy < 0 ? 'up' : 'down';
      // One move per swipe: a second in the same drag needs the finger to reverse.
      if ((asA && f.leapt) || f.lastDir === dir) { f.vy = e.clientY; f.vt = now; return; }
      f.lastDir = dir;
      st.edges.push(asA ? 'a' : dir);
      if (asA) { st.holdT = GESTURE_HOLD; f.leapt = true; }
      f.vy = e.clientY; f.vt = now; f.ax = e.clientX; st.ax = 0;
    }
  }

  // ---- buttons (press = edge, hold = held)
  const press = (el, onDown, onUp) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); el.classList.add('on'); st.used = true; onDown(); });
    const up = () => { el.classList.remove('on'); onUp?.(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  press(btnA, () => { st.aHeld = true; st.edges.push('a'); }, () => { st.aHeld = false; });
  press(btnB, () => st.edges.push('b'));
  press(btnPause, () => st.edges.push('pause'));

  // ---- taps outside play (cards, playbill, curtain call), in stage coords
  root.ownerDocument.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || root.classList.contains('playing')) return;
    if (e.target.closest('button, input, label, .dialog, #title')) return;
    const c = root.ownerDocument.getElementById('stage').getBoundingClientRect();
    taps.push({ x: ((e.clientX - c.left) / c.width) * 1280, y: ((e.clientY - c.top) / c.height) * 720 });
  });

  return {
    // Called by input.poll each frame; returns this frame's touch input.
    poll(dt) {
      st.holdT = Math.max(0, st.holdT - dt);
      const out = { moveX: st.ax, moveY: st.mode === 'stick' ? st.ay : 0, aHeld: st.aHeld || st.holdT > 0, a: false, b: false, pause: false,
        up: false, down: false, left: false, right: false, tap: taps[0] || null, used: st.used };
      for (const e of st.edges) out[e] = true;
      st.edges = []; taps = [];
      if (st.mode === 'stick') {
        // Stick edges with repeat, for row-like moves.
        const dir = Math.hypot(st.ax, st.ay) < 0.45 ? null
          : Math.abs(st.ay) > Math.abs(st.ax) ? (st.ay < 0 ? 'up' : 'down') : (st.ax < 0 ? 'left' : 'right');
        if (dir) {
          if (dir !== rep.dir) { rep.dir = dir; rep.t = REPEAT_FIRST; out[dir] = true; }
          else if ((rep.t -= dt) <= 0) { rep.t = REPEAT_NEXT; out[dir] = true; }
        } else rep.dir = null;
      }
      return out;
    },
    // What the shell shows: play controls, the scheme, the A verb, B.
    show({ playing, mode = 'stick', verb, needB, hintText, flickUpIsA = false }) {
      root.hidden = false;
      root.classList.toggle('playing', playing);
      if (mode !== st.mode) { st.mode = mode; st.f = null; st.ax = st.ay = 0; base.classList.remove('on'); knob.style.transform = ''; }
      st.flickUpIsA = flickUpIsA;
      root.classList.toggle('swipe', mode === 'swipe');
      btnA.querySelector('.verb').textContent = verb || '';
      btnB.hidden = !needB;
      if (hintText != null && hint.textContent !== hintText) hint.textContent = hintText;
      if (!playing) { st.f = null; st.ax = st.ay = 0; st.aHeld = false; base.classList.remove('on'); knob.style.transform = ''; }
    },
    hide() { root.hidden = true; root.classList.remove('playing'); },
  };
}

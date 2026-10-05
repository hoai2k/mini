// Touch controls for phones and tablets. Feeds the same input snapshot the
// keyboard and pad do (src/input.js merges it), so acts need no changes and
// desktop is untouched: nothing here is shown unless the device is touch.
//
// Layout, landscape:
// - the left half of the screen is a floating stick: put a thumb down
//   anywhere there and drag (analog moveX / moveY, plus up/down/left/right
//   edges with repeat, like the pad's stick);
// - the right side has a large A button labelled with the act's verb, a
//   smaller B button when the scene needs one, and pause at top right;
// - outside play (cards, playbill, curtain call) a tap anywhere is a tap.

const DEAD = 0.22;            // stick dead zone (fraction of radius)
const RADIUS = 56;            // px the knob may travel
const REPEAT_FIRST = 0.36, REPEAT_NEXT = 0.14;

export function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
}

export function createTouch(root) {
  const zone = root.querySelector('.stick-zone');
  const base = root.querySelector('.stick-base');
  const knob = root.querySelector('.stick-knob');
  const btnA = root.querySelector('[data-t=a]');
  const btnB = root.querySelector('[data-t=b]');
  const btnPause = root.querySelector('[data-t=pause]');

  const st = { stick: null, ax: 0, ay: 0, aHeld: false, edges: [], used: false };
  const rep = { dir: null, t: 0 };
  let taps = [];

  // ---- the stick
  zone.addEventListener('pointerdown', (e) => {
    if (st.stick) return;
    e.preventDefault();
    zone.setPointerCapture(e.pointerId);
    st.stick = { id: e.pointerId, x: e.clientX, y: e.clientY };
    st.used = true;
    base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px';
    base.classList.add('on');
    move(e);
  });
  const move = (e) => {
    if (!st.stick || e.pointerId !== st.stick.id) return;
    let dx = e.clientX - st.stick.x, dy = e.clientY - st.stick.y;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      // A floating stick follows a thumb that strays far, so it never "sticks".
      const over = d - RADIUS;
      st.stick.x += (dx / d) * over; st.stick.y += (dy / d) * over;
      base.style.left = st.stick.x + 'px'; base.style.top = st.stick.y + 'px';
      dx = (dx / d) * RADIUS; dy = (dy / d) * RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / RADIUS, ny = dy / RADIUS, m = Math.hypot(nx, ny);
    if (m < DEAD) { st.ax = 0; st.ay = 0; return; }
    const k = (m - DEAD) / (1 - DEAD) / m; // rescale past the dead zone
    st.ax = nx * k; st.ay = ny * k;
  };
  const end = (e) => {
    if (!st.stick || e.pointerId !== st.stick.id) return;
    st.stick = null; st.ax = 0; st.ay = 0;
    knob.style.transform = '';
    base.classList.remove('on');
  };
  zone.addEventListener('pointermove', move);
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);

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
      const out = { moveX: st.ax, moveY: st.ay, aHeld: st.aHeld, a: false, b: false, pause: false,
        up: false, down: false, left: false, right: false, tap: taps[0] || null, used: st.used };
      for (const e of st.edges) out[e] = true;
      st.edges = []; taps = [];
      // Stick edges with repeat, for row changes and menu-like moves.
      const dir = Math.hypot(st.ax, st.ay) < 0.45 ? null
        : Math.abs(st.ay) > Math.abs(st.ax) ? (st.ay < 0 ? 'up' : 'down') : (st.ax < 0 ? 'left' : 'right');
      if (dir) {
        if (dir !== rep.dir) { rep.dir = dir; rep.t = REPEAT_FIRST; out[dir] = true; }
        else if ((rep.t -= dt) <= 0) { rep.t = REPEAT_NEXT; out[dir] = true; }
      } else rep.dir = null;
      return out;
    },
    // What the shell shows: play controls, the A verb, whether B is needed.
    show({ playing, verb, needB }) {
      root.hidden = false;
      root.classList.toggle('playing', playing);
      btnA.querySelector('.verb').textContent = verb || '';
      btnB.hidden = !needB;
      if (!playing) { st.stick = null; st.ax = st.ay = 0; st.aHeld = false; base.classList.remove('on'); }
    },
    hide() { root.hidden = true; root.classList.remove('playing'); },
  };
}

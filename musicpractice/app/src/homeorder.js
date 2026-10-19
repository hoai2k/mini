// Reordering the home screen's buttons, like an iPhone home screen: hold a
// button and they all jiggle; the held one lifts and follows the finger while
// the others slide out of its way; let go to drop it. While jiggling, any
// button can be dragged at once; tapping the background, Done or Escape
// stops, and so do 5 seconds untouched. Arrow keys move the focused button
// while jiggling.

const HOLD_MS = 450; // hold this long to start
const SLOP = 10; // moving further than this before then is a scroll or a tap, not a hold
const SLIDE = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
const IDLE_MS = 5000; // jiggling stops after this long untouched

/**
 * @param {{ container: HTMLElement, done: HTMLElement, order: string[], onChange: (order: string[]) => void }} opts
 * @returns {{ stop: () => void, editing: () => boolean }}
 */
export function setupHomeOrder({ container, done, order, onChange }) {
  const cards = () => [...container.querySelectorAll('.choice:not([hidden])')];
  const ids = () => cards().map((c) => c.dataset.tool);
  for (const id of order) {
    const el = container.querySelector(`[data-tool="${id}"]`);
    if (el) container.append(el);
  }

  let editing = false;
  let press = null; // { card, x, y, pointer, timer } from pointerdown until a drag or release
  let drag = null; // { card, grabX, grabY, dom, order, slots } while a button is lifted
  let swallowClick = false;
  let idleTimer = 0;

  function start() {
    if (editing) return;
    editing = true;
    container.classList.add('editing');
    done.hidden = false;
    // Each button jiggles a little out of step with the others.
    cards().forEach((c, i) => c.style.setProperty('--jiggle-delay', `${-0.13 * i}s`));
    navigator.vibrate?.(12);
    poke();
  }

  function stop() {
    clearTimeout(idleTimer);
    if (!editing) return;
    cancelPress();
    if (drag) drop();
    editing = false;
    container.classList.remove('editing');
    done.hidden = true;
  }

  /** Any touch, move or key while jiggling: stop only after IDLE_MS of nothing. */
  function poke() {
    clearTimeout(idleTimer);
    if (editing) idleTimer = setTimeout(() => { if (drag || press) poke(); else stop(); }, IDLE_MS);
  }

  /** Move buttons in the page, sliding each from where it was seen (FLIP). */
  function animateMove(change) {
    const before = new Map(cards().map((c) => [c, c.getBoundingClientRect()]));
    change();
    for (const c of cards()) {
      c.style.transition = 'none';
      c.style.transform = '';
    }
    for (const c of cards()) {
      const a = before.get(c);
      const b = c.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      c.style.transform = `translate(${dx}px, ${dy}px)`;
      c.getBoundingClientRect(); // apply before animating back
      c.style.transition = SLIDE;
      c.style.transform = '';
    }
  }

  /** Where a button's slot is, in its offset parent (unaffected by transforms and animations). */
  const slot = (c) => ({ left: c.offsetLeft, top: c.offsetTop, width: c.offsetWidth, height: c.offsetHeight });

  /** The viewport position of the offset parent that slot() measures from. */
  function origin() {
    const box = container.getBoundingClientRect();
    return { x: box.left - container.offsetLeft, y: box.top - container.offsetTop };
  }

  /*
   * While a button is dragged the page itself is left alone (Safari stops
   * sending touch events to an element that is moved in the page mid-drag):
   * the buttons only slide, by transforms, to the slots of the new order,
   * and the page is reordered when the button is dropped.
   */
  function lift(card, x, y) {
    if (drag) drop();
    const dom = cards();
    const o = origin();
    const s = slot(card);
    drag = { card, grabX: x - o.x - s.left, grabY: y - o.y - s.top, dom, order: [...dom], slots: dom.map(slot) };
    card.classList.add('dragging');
    card.style.transition = 'none';
    follow(x, y);
  }

  /** Keep the dragged button under the finger, and slide the others to make room for it. */
  function follow(x, y) {
    const { card, dom, slots } = drag;
    const o = origin();
    const left = x - o.x - drag.grabX;
    const top = y - o.y - drag.grabY;
    const home = slots[dom.indexOf(card)];
    card.style.transform = `translate(${left - home.left}px, ${top - home.top}px) scale(1.06)`;
    // The slot nearest the dragged button's centre.
    const cx = left + home.width / 2;
    const cy = top + home.height / 2;
    let best = 0;
    let bestD = Infinity;
    slots.forEach((r, i) => {
      const d = (r.left + r.width / 2 - cx) ** 2 + (r.top + r.height / 2 - cy) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best === drag.order.indexOf(card)) return;
    drag.order.splice(drag.order.indexOf(card), 1);
    drag.order.splice(best, 0, card);
    drag.order.forEach((c, i) => {
      if (c === card) return;
      const from = slots[dom.indexOf(c)];
      const to = slots[i];
      c.style.transition = SLIDE;
      c.style.transform = to === from ? '' : `translate(${to.left - from.left}px, ${to.top - from.top}px)`;
    });
  }

  function drop() {
    const { card, order: next } = drag;
    drag = null;
    card.classList.remove('dragging');
    // Now reorder the page, each button sliding on from where it is.
    animateMove(() => next.forEach((c) => container.append(c)));
    save();
  }

  function save() {
    const now = ids();
    if (now.join() !== order.join()) {
      order = now;
      onChange(now);
    }
  }

  function cancelPress() {
    if (press) clearTimeout(press.timer);
    press = null;
  }

  container.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.choice');
    if (!card || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (drag) drop(); // a drag whose end never arrived
    cancelPress();
    poke();
    swallowClick = false; // a touch drag ends without a click, so don't carry it over
    press = { card, x: e.clientX, y: e.clientY, pointer: e.pointerId };
    if (!editing) {
      press.timer = setTimeout(() => {
        if (!press) return;
        start();
        swallowClick = true;
        const p = press;
        press = null;
        try { card.setPointerCapture(p.pointer); } catch { /* the pointer is gone */ }
        lift(card, p.x, p.y);
      }, HOLD_MS);
    }
  });

  // Moves and releases are watched on the whole page, so a drag always ends.
  window.addEventListener('pointermove', (e) => {
    if (drag) {
      e.preventDefault();
      poke();
      follow(e.clientX, e.clientY);
      return;
    }
    if (!press || e.pointerId !== press.pointer) return;
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP;
    if (!moved) return;
    if (editing) {
      // While jiggling, any button drags straight away.
      const { card, pointer } = press;
      cancelPress();
      try { card.setPointerCapture(pointer); } catch { /* the pointer is gone */ }
      lift(card, e.clientX, e.clientY);
    } else {
      cancelPress(); // a scroll or a slide, not a hold
    }
  });

  const release = () => {
    cancelPress();
    if (drag) { drop(); swallowClick = true; }
    poke();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // Once lifted, the page mustn't scroll (iPhone ignores touch-action set mid-gesture).
  document.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
  container.addEventListener('touchmove', (e) => { if (editing) e.preventDefault(); }, { passive: false });
  // No link preview or menu on a long press, and no native link dragging.
  container.addEventListener('contextmenu', (e) => { if (e.target.closest('.choice')) e.preventDefault(); });
  container.addEventListener('dragstart', (e) => e.preventDefault());

  // A tap while jiggling, or the tap that ends a hold, doesn't open the tool.
  container.addEventListener('click', (e) => {
    if (swallowClick || editing) {
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Touching the background (or Done) stops jiggling. iPhone sends no click
  // for a tap on plain background, so this listens for the touch itself.
  const screen = container.closest('.screen') || document;
  screen.addEventListener('pointerdown', (e) => {
    if (editing && !e.target.closest('.choice') && !e.target.closest('button')) stop();
  });
  done.addEventListener('click', stop);
  screen.addEventListener('keydown', poke);

  // Keyboard: Escape stops, arrow keys move the focused button.
  container.addEventListener('keydown', (e) => {
    if (!editing) return;
    const card = e.target.closest?.('.choice');
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); return; }
    const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!card || !d) return;
    e.preventDefault();
    const list = cards();
    const to = list.indexOf(card) + d;
    if (to < 0 || to >= list.length) return;
    animateMove(() => container.insertBefore(card, d > 0 ? list[to].nextSibling : list[to]));
    card.focus();
    save();
    poke();
  });

  return { stop, editing: () => editing };
}

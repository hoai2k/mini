// Reordering the home screen's buttons, like an iPhone home screen: hold a
// button and they all jiggle; the held one lifts and follows the finger while
// the others slide out of its way; let go to drop it. While jiggling, any
// button can be dragged at once; tapping the background, Done or Escape
// stops. Arrow keys move the focused button while jiggling.

const HOLD_MS = 450; // hold this long to start
const SLOP = 10; // moving further than this before then is a scroll or a tap, not a hold
const SLIDE = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * @param {{ container: HTMLElement, done: HTMLElement, order: string[], onChange: (order: string[]) => void }} opts
 * @returns {{ stop: () => void, editing: () => boolean }}
 */
export function setupHomeOrder({ container, done, order, onChange }) {
  const cards = () => [...container.querySelectorAll('.choice')];
  const ids = () => cards().map((c) => c.dataset.tool);
  for (const id of order) {
    const el = container.querySelector(`[data-tool="${id}"]`);
    if (el) container.append(el);
  }

  let editing = false;
  let press = null; // { card, id, x, y, timer } from pointerdown until a drag or release
  let drag = null; // { card, id, grabX, grabY, slots }
  let swallowClick = false;

  function start() {
    if (editing) return;
    editing = true;
    container.classList.add('editing');
    done.hidden = false;
    // Each button jiggles a little out of step with the others.
    cards().forEach((c, i) => c.style.setProperty('--jiggle-delay', `${-0.13 * i}s`));
    navigator.vibrate?.(12);
  }

  function stop() {
    if (!editing) return;
    if (drag) drop();
    editing = false;
    container.classList.remove('editing');
    done.hidden = true;
  }

  /** Slide the other buttons to their new places (FLIP: measure, move, animate back to zero). */
  function animateMove(change, except) {
    const before = new Map(cards().map((c) => [c, c.getBoundingClientRect()]));
    change();
    for (const c of cards()) {
      if (c === except) continue;
      const a = before.get(c);
      const b = c.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (!dx && !dy) continue;
      c.style.transition = 'none';
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

  function lift(card, x, y) {
    const o = origin();
    const s = slot(card);
    drag = { card, grabX: x - o.x - s.left, grabY: y - o.y - s.top };
    card.classList.add('dragging');
    card.style.transition = 'none';
    follow(x, y);
  }

  /** Keep the dragged button under the finger, and give it the slot it is over. */
  function follow(x, y) {
    const { card } = drag;
    const o = origin();
    const left = x - o.x - drag.grabX;
    const top = y - o.y - drag.grabY;
    const home = slot(card);
    card.style.transform = `translate(${left - home.left}px, ${top - home.top}px) scale(1.06)`;
    // The slot nearest the dragged button's centre.
    const cx = left + home.width / 2;
    const cy = top + home.height / 2;
    const list = cards();
    const from = list.indexOf(card);
    let best = from;
    let bestD = Infinity;
    list.forEach((c, i) => {
      const r = slot(c);
      const d = (r.left + r.width / 2 - cx) ** 2 + (r.top + r.height / 2 - cy) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best !== from) {
      animateMove(() => {
        const target = list[best];
        container.insertBefore(card, best > from ? target.nextSibling : target);
      }, card);
      // Its slot moved: keep it under the finger.
      const now = slot(card);
      card.style.transform = `translate(${left - now.left}px, ${top - now.top}px) scale(1.06)`;
    }
  }

  function drop() {
    const { card } = drag;
    drag = null;
    card.classList.remove('dragging');
    card.style.transition = SLIDE;
    card.style.transform = '';
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
    cancelPress();
    swallowClick = false; // a touch drag ends without a click, so don't carry it over
    press = { card, x: e.clientX, y: e.clientY, pointer: e.pointerId };
    if (!editing) {
      press.timer = setTimeout(() => {
        if (!press) return;
        start();
        swallowClick = true;
        try { card.setPointerCapture(press.pointer); } catch { /* the pointer is gone */ }
        lift(card, press.x, press.y);
      }, HOLD_MS);
    }
  });

  container.addEventListener('pointermove', (e) => {
    if (drag) {
      e.preventDefault();
      follow(e.clientX, e.clientY);
      return;
    }
    if (!press) return;
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
  };
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', release);
  container.addEventListener('lostpointercapture', () => { if (drag) drop(); });

  // Once lifted, the page mustn't scroll (iPhone ignores touch-action set mid-gesture).
  container.addEventListener('touchmove', (e) => { if (drag || editing) e.preventDefault(); }, { passive: false });
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

  // Tapping the background or Done stops jiggling.
  const home = container.closest('.screen') || document;
  home.addEventListener('click', (e) => {
    if (editing && !e.target.closest('.choice')) stop();
  });
  done.addEventListener('click', stop);

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
  });

  return { stop, editing: () => editing };
}

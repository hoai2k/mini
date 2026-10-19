// The home screen and the Practice Routine as two pages side by side, for when
// the timer's button doesn't fit beside the others: swipe left from home to
// slide the timer in from the right, and right to slide back; the page under
// the finger follows it, and a short or slow swipe springs back. On a
// desktop an arrow at the edge does the same; on a touch screen a faint
// chevron at the right edge says there is a page to swipe in.
//
// IN DEVELOPMENT: used only with ?routine in the address (main.js).

const SLIDE_MS = 280;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
// What a swipe never starts on: things a finger drags or types into.
const NO_SWIPE = 'input, select, textarea, [role="slider"], .slider, dialog, .bow-slider, .vslider';

/**
 * @param {{ home: HTMLElement, timer: HTMLElement, current: () => string,
 *   go: (name: 'home' | 'routine') => void }} opts
 */
export function setupPager({ home, timer, current, go }) {
  let on = false;
  let drag = null; // { id, x, y, t, dx, claimed, from, to, toEl, fromEl }
  let moving = false;

  const width = () => document.documentElement.clientWidth;
  const els = (from) => (from === 'home' ? [home, timer] : [timer, home]); // `timer`: the routine's page
  const sign = (from) => (from === 'home' ? -1 : 1); // the way a finger moves to leave `from`

  function place(fromEl, toEl, from, dx) {
    const w = width();
    fromEl.style.transform = `translateX(${dx}px)`;
    toEl.style.transform = `translateX(${dx - sign(from) * w}px)`;
  }

  /** Show the incoming page beside the current one, fixed over the window, ready to move. */
  function lift(toEl) {
    toEl.hidden = false;
    toEl.classList.add('page-incoming');
  }

  function settle(fromEl, toEl) {
    for (const el of [fromEl, toEl]) {
      el.style.transform = '';
      el.style.transition = '';
      el.classList.remove('page-incoming');
    }
  }

  /** Finish a slide from `from` (already moved by `dx`) to the other page, or back (`commit` false). */
  function finish(from, dx, commit) {
    const [fromEl, toEl] = els(from);
    const w = width();
    const target = commit ? sign(from) * w : 0; // where the outgoing page ends
    moving = true;
    const opts = { duration: SLIDE_MS * (commit ? Math.max(0.35, 1 - Math.abs(dx) / w) : 0.8), easing: EASE, fill: 'forwards' };
    const a = fromEl.animate([{ transform: `translateX(${dx}px)` }, { transform: `translateX(${target}px)` }], opts);
    toEl.animate([{ transform: `translateX(${dx - sign(from) * w}px)` }, { transform: `translateX(${target - sign(from) * w}px)` }], opts);
    a.finished.then(() => {
      if (commit) {
        window.scrollTo(0, 0);
        go(from === 'home' ? 'routine' : 'home');
      } else {
        toEl.hidden = true;
      }
      for (const el of [fromEl, toEl]) for (const an of el.getAnimations()) an.cancel();
      settle(fromEl, toEl);
      moving = false;
    }).catch(() => { moving = false; });
  }

  /** Slide to the other page with no finger (the arrows, the back button). */
  function slide(from) {
    if (!on || moving || current() !== from) return false;
    const [, toEl] = els(from);
    lift(toEl);
    finish(from, 0, true);
    return true;
  }

  function down(e) {
    if (!on || moving || drag || !e.isPrimary || e.pointerType === 'mouse') return;
    const from = current();
    if (from !== 'home' && from !== 'routine') return;
    if (e.target.closest?.(NO_SWIPE)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, claimed: false, from };
  }

  function move(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.claimed) {
      if (Math.hypot(dx, dy) < 10) return;
      // Sideways, and the way out of this page: a page turn. Anything else is a scroll or a tap.
      if (Math.abs(dx) < Math.abs(dy) * 1.3 || Math.sign(dx) !== sign(drag.from)) { drag = null; return; }
      drag.claimed = true;
      const [fromEl, toEl] = els(drag.from);
      drag.fromEl = fromEl;
      drag.toEl = toEl;
      lift(toEl);
    }
    // Only the way out; back past the start stays put.
    drag.dx = sign(drag.from) < 0 ? Math.min(0, dx) : Math.max(0, dx);
    drag.v = drag.dx / Math.max(1, e.timeStamp - drag.t);
    place(drag.fromEl, drag.toEl, drag.from, drag.dx);
  }

  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.claimed) return;
    const w = width();
    const fast = Math.abs(d.dx) / Math.max(1, e.timeStamp - d.t) > 0.5;
    const commit = e.type !== 'pointercancel' && (Math.abs(d.dx) > w * 0.28 || (fast && Math.abs(d.dx) > 40));
    finish(d.from, d.dx, commit);
  }

  document.addEventListener('pointerdown', down, { passive: true });
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  // A swipe that turned the page isn't also a tap on what it started on.
  document.addEventListener('click', (e) => { if (moving) { e.preventDefault(); e.stopPropagation(); } }, true);

  return {
    /** Two pages (true) or the timer's button among the others (false). */
    set(paged) {
      on = paged;
      document.documentElement.classList.toggle('paged', paged);
    },
    get on() { return on; },
    slide,
  };
}

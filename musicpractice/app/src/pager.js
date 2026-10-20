// The home screen and the Practice Routine as two pages side by side, for when
// the timer's button doesn't fit beside the others: swipe left from home to
// slide the timer in from the right, and right to slide back; the page under
// the finger follows it, and a short or slow swipe springs back. A smaller
// Practice Routine button under the home buttons slides it in, and the
// routine's back arrow slides home (slide(), in main.js).

const EASE = 'cubic-bezier(.2, .8, .25, 1)';
// The ease's opening speed is SLOPE times its average, so a slide covering d
// px that should leave at the finger's v px/ms lasts SLOPE * d / v.
const SLOPE = 4;
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
  let stage = null; // while pages move: { y, w, sbw } (the scroll and width they started from)

  const width = () => stage?.w ?? document.documentElement.clientWidth;
  const els = (from) => (from === 'home' ? [home, timer] : [timer, home]); // `timer`: the routine's page
  const sign = (from) => (from === 'home' ? -1 : 1); // the way a finger moves to leave `from`

  function place(fromEl, toEl, from, dx) {
    const w = width();
    fromEl.style.transform = `translateX(${dx}px)`;
    toEl.style.transform = `translateX(${dx - sign(from) * w}px)`;
  }

  /*
   * While a page turns, both pages are fixed layers drawn exactly as they
   * are at rest: the outgoing one where it was scrolled to, the incoming one
   * at the top, each its full natural height (not squeezed to the window,
   * which moved centred content when it settled). The page can't scroll
   * meanwhile (html.paging), so a sliding page never widens it into a
   * scrollbar and a vertical nudge of the finger doesn't scroll it; the
   * scrollbar's width, where there is one, is kept so nothing shifts.
   */
  function freeze(fromEl, toEl) {
    const d = document.documentElement;
    stage = { y: window.scrollY, w: d.clientWidth, sbw: window.innerWidth - d.clientWidth };
    d.classList.add('paging');
    if (stage.sbw) d.style.paddingRight = `${stage.sbw}px`;
    for (const [el, top] of [[fromEl, -stage.y], [toEl, 0]]) {
      el.hidden = false;
      el.classList.add('page-moving');
      el.style.top = `${top}px`;
      el.style.right = `${stage.sbw}px`;
    }
  }

  /** Both pages back in the flow, the page scrollable again. */
  function thaw(fromEl, toEl) {
    for (const el of [fromEl, toEl]) {
      for (const an of el.getAnimations()) an.cancel();
      el.classList.remove('page-moving');
      el.style.transform = el.style.top = el.style.right = '';
    }
    const d = document.documentElement;
    d.classList.remove('paging');
    d.style.paddingRight = '';
  }

  /*
   * Finish a slide from `from` (already moved by `dx`) to the other page, or
   * back (`commit` false), leaving at `speed` px/ms (the finger's at the lift;
   * 0 for a button). As the Cambrian carousel learnt on an iPhone: a Web
   * Animation from exactly where the finger let go, timed so it starts at the
   * finger's speed (a fixed, short time eased from rest reads as a snap after
   * a flick); the end transforms written first, so the page under the
   * animation is already where it ends; the finished animation held
   * (fill: forwards) until both pages are put back in one step; and a timer
   * behind its promise, which a hidden tab would otherwise leave waiting.
   */
  function finish(from, dx, commit, speed = 0) {
    const [fromEl, toEl] = els(from);
    const w = width();
    const target = commit ? sign(from) * w : 0; // where the outgoing page ends
    moving = true;
    const d = Math.abs(target - dx);
    const ms = Math.min(420, Math.max(170, speed > 0.05 ? (SLOPE * d) / speed : 240 + d * 0.2));
    const opts = { duration: ms, easing: EASE, fill: 'forwards' };
    fromEl.style.transform = `translateX(${target}px)`;
    toEl.style.transform = `translateX(${target - sign(from) * w}px)`;
    const a = fromEl.animate([{ transform: `translateX(${dx}px)` }, { transform: `translateX(${target}px)` }], opts);
    toEl.animate([{ transform: `translateX(${dx - sign(from) * w}px)` }, { transform: `translateX(${target - sign(from) * w}px)` }], opts);
    let ended = false;
    const done = () => {
      if (ended) return;
      ended = true;
      clearTimeout(fallback);
      // Both pages back in the flow before routing, all in this one task
      // (nothing is drawn between): going home measures whether all five
      // buttons fit, and a page still fixed over the window always fits.
      const y = stage?.y ?? 0;
      thaw(fromEl, toEl);
      stage = null;
      if (commit) {
        window.scrollTo(0, 0);
        go(from === 'home' ? 'routine' : 'home');
      } else {
        toEl.hidden = true;
        window.scrollTo(0, y); // back where it was
      }
      moving = false;
    };
    const fallback = setTimeout(done, ms + 700);
    a.finished.then(done, done);
  }

  /** Slide to the other page with no finger (the arrows, the back button). */
  function slide(from) {
    if (!on || moving || current() !== from) return false;
    const [fromEl, toEl] = els(from);
    freeze(fromEl, toEl);
    finish(from, 0, true);
    return true;
  }

  function down(e) {
    if (!on || moving || drag || !e.isPrimary || e.pointerType === 'mouse') return;
    const from = current();
    if (from !== 'home' && from !== 'routine') return;
    if (e.target.closest?.(NO_SWIPE)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, claimed: false, from, trail: [] };
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
      freeze(fromEl, toEl);
    }
    // Only the way out; back past the start stays put.
    drag.dx = sign(drag.from) < 0 ? Math.min(0, dx) : Math.max(0, dx);
    drag.trail.push({ x: e.clientX, t: e.timeStamp });
    if (drag.trail.length > 30) drag.trail.shift();
    place(drag.fromEl, drag.toEl, drag.from, drag.dx);
  }

  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.claimed) return;
    const w = width();
    // The speed at the lift, over the last tenth of a second (a slow drag
    // ended with a flick is a flick), towards the other page.
    const recent = d.trail.filter((p) => e.timeStamp - p.t < 100);
    const first = recent[0] ?? d.trail.at(-1) ?? { x: d.x, t: d.t };
    const v = ((e.clientX - first.x) / Math.max(8, e.timeStamp - first.t)) * sign(d.from); // + towards the other page
    const commit = e.type !== 'pointercancel' && (Math.abs(d.dx) > w * 0.28 || (v > 0.45 && Math.abs(d.dx) > 20));
    finish(d.from, d.dx, commit, Math.max(0, commit ? v : -v));
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

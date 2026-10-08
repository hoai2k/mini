// Bottom sheets you can pull down. Dragging a sheet down slides it off the
// video so you can peek behind it; pull it back up and it settles again, let
// go far enough down (or flick) and it closes. A drag starts on the grip, on
// the header, or anywhere in the sheet while its scrolling part is already at
// the top. Horizontal drags are left to the browser (the effects strip
// scrolls sideways).
//
//   makeSheet(el, { onDismiss })   // onDismiss() should hide the sheet
//
// Optional: onExpand() runs when the sheet is dragged or flicked up (while
// canExpand() says so), and while collapsible() is true a shorter pull down
// calls onCollapse() instead of sliding the sheet away.

const START_PX = 8;

export function makeSheet(el, { onDismiss, scroller = null, onExpand = null, canExpand = () => true, collapsible = () => false, onCollapse = null } = {}) {
  let start = null; // { x, y, t, dragging }
  let dy = 0;

  const scrollParent = target => {
    const s = scroller ? el.querySelector(scroller) : null;
    return s && s.contains(target) ? s : null;
  };

  function begin(x, y, target) {
    if (target.closest('input, textarea, select')) return;
    const s = scrollParent(target);
    if (s && s.scrollTop > 0) return; // let the list scroll back up first
    start = { x, y, t: performance.now(), dragging: false, up: false, last: y, lastT: performance.now(), v: 0 };
  }

  function move(x, y, e) {
    if (!start) return;
    const ddx = x - start.x, ddy = y - start.y;
    if (!start.dragging) {
      if (Math.abs(ddx) > START_PX && Math.abs(ddx) > Math.abs(ddy)) { start = null; return; }
      const up = onExpand && canExpand() && ddy < -START_PX;
      if (ddy < START_PX && !up) return;
      start.dragging = true;
      start.up = up;
      el.classList.add('dragging');
    }
    e.preventDefault?.();
    const now = performance.now();
    start.v = (y - start.last) / Math.max(1, now - start.lastT);
    start.last = y;
    start.lastT = now;
    // Pulling up stretches a little, as a hint that letting go opens it up.
    dy = start.up ? Math.min(0, ddy) : Math.max(0, ddy);
    el.style.transform = `translateY(${start.up ? dy * 0.3 : dy}px)`;
  }

  function end() {
    if (!start) return;
    const dragged = start.dragging;
    const flick = start.v > 0.6;
    const up = start.up, flickUp = start.v < -0.5;
    start = null;
    el.classList.remove('dragging');
    if (!dragged) return;
    if (up) {
      el.style.transform = '';
      if (dy < -50 || (flickUp && dy < -20)) onExpand();
      dy = 0;
      return;
    }
    const h = el.getBoundingClientRect().height;
    if (collapsible()) {
      el.style.transform = '';
      if (dy > Math.min(90, h * 0.35) || (flick && dy > 30)) onCollapse?.();
    } else if (dy > h * 0.35 || (flick && dy > 30)) {
      el.style.transform = `translateY(${h + 40}px)`;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener('transitionend', onEnd);
        el.style.transform = '';
        onDismiss?.();
      };
      // Only the sheet's own slide counts (children's transitions bubble).
      const onEnd = e => { if (e.target === el) finish(); };
      el.addEventListener('transitionend', onEnd);
      setTimeout(finish, 350); // no transition runs with reduced motion
    } else {
      el.style.transform = '';
    }
    dy = 0;
  }

  // Touch: preventDefault on touchmove needs a non-passive listener.
  el.addEventListener('touchstart', e => {
    if (e.touches.length === 1) begin(e.touches[0].clientX, e.touches[0].clientY, e.target);
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY, e);
  }, { passive: false });
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', end);

  // Mouse and pen: once dragging, capture the pointer so the release is seen
  // wherever it happens, even over the video or outside the window.
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    begin(e.clientX, e.clientY, e.target);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    move(e.clientX, e.clientY, e);
    // Capture only once it is really a drag: capturing on press would send
    // the click to the sheet instead of the button that was pressed.
    if (start?.dragging && !el.hasPointerCapture(e.pointerId)) {
      try { el.setPointerCapture(e.pointerId); } catch {}
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    el.addEventListener(type, e => {
      if (e.pointerType !== 'touch') end();
    });
  }

  // A drag that started on a button shouldn't also click it.
  el.addEventListener('click', e => {
    if (el.dataset.justDragged) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
  const mark = () => {
    if (el.classList.contains('dragging')) {
      el.dataset.justDragged = '1';
      setTimeout(() => delete el.dataset.justDragged, 50);
    }
  };
  el.addEventListener('touchend', mark, true);
  el.addEventListener('pointerup', mark, true);
}

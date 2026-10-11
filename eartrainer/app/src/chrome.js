// Getting the browser's own bars out of the way on phones (the same method as
// Kingdom of the Fairies' src/chrome.js).
//
// - Where the Fullscreen API exists (Android, iPad, desktop; iPhone only with
//   Safari's experimental flag), fullscreen needs a user gesture, so turning
//   the device can't trigger it by itself. Instead, the first tap after the
//   device is in landscape requests fullscreen.
// - iPhone Safari has no element fullscreen. It does tuck its address and tab
//   bars away in landscape when the page is scrolled, but only if there is
//   something to scroll. On iPhone Safari (not the home-screen app) the page
//   is made a little taller than the screen, and while the bars are showing a
//   hint says to swipe up. Scrolling is only possible outside play (title,
//   songbooks, pause); during play the keyboard owns every gesture.
// - The home-screen app (Add to Home Screen) is already full screen.

const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isIPhone = /iP(hone|od)/.test(navigator.userAgent);
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;

export const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
export function canFullscreen() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}
// One request at a time: a tap's permission (user activation) is used up by the
// first request, so a second one in the same tap is always refused, and on
// some Android browsers that refusal is all the player sees. Once fullscreen
// has started, lock landscape (Android only allows the lock in fullscreen).
let pending = null;
// Set when the player left fullscreen themselves: taps stop asking for it.
let userLeft = false;
/** An explicit request (the Fullscreen button, the menu): taps may ask again. */
export function wantFullscreen(opts) { userLeft = false; return requestFullscreen(opts); }
let failures = 0;
let onFail = null;
export function onFullscreenFail(f) { onFail = f; }
export function requestFullscreen({ lock = false } = {}) {
  const el = document.documentElement;
  if (fullscreenElement() || pending) return pending || Promise.resolve(true);
  let r;
  try {
    r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.();
  } catch { r = Promise.reject(new Error('not allowed')); }
  // Old WebKit returns nothing: judge by the fullscreenchange that follows.
  if (!r || typeof r.then !== 'function') r = new Promise((ok) => setTimeout(() => ok(), 300)).then(() => { if (!fullscreenElement()) throw new Error('refused'); });
  pending = r.then(() => {
    failures = 0;
    if (lock) screen.orientation?.lock?.('landscape').catch(() => { /* the rotate card covers it */ });
    return true;
  }, () => {
    failures++;
    onFail?.(failures);
    return false;
  }).finally(() => { pending = null; });
  return pending;
}
export function exitFullscreen() {
  try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {}); } catch { /* ignore */ }
}

export function createChrome({ touch, isPlaying, hintEl, onStuck, onUserLeft }) {
  const landscape = () => innerWidth > innerHeight;

  // 1. A tap in landscape asks for fullscreen while it isn't on (where
  // supported): the first tap, and again after the system took it away
  // (switching apps, a rotation). But when the player leaves it themselves
  // (Chrome's "swipe down to exit", the back gesture, our button), taps stop
  // asking until they turn it back on: otherwise every tap would throw them
  // straight back in, with Chrome's notice each time. If the browser refuses on
  // pointerup (some count only the click as the tap), the click tries again.
  if (touch && canFullscreen() && !standalone) {
    let retryClick = false;
    let lastHidden = 0, lastTurn = 0;
    document.addEventListener('visibilitychange', () => { lastHidden = performance.now(); });
    addEventListener('orientationchange', () => { lastTurn = performance.now(); });
    screen.orientation?.addEventListener?.('change', () => { lastTurn = performance.now(); });
    const onChange = () => {
      if (fullscreenElement()) { userLeft = false; return; }
      const now = performance.now();
      const bySystem = document.hidden || now - lastHidden < 1500 || now - lastTurn < 1500;
      if (!bySystem) { userLeft = true; onUserLeft?.(); }
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    document.addEventListener('pointerup', () => {
      if (userLeft || !landscape() || fullscreenElement()) return;
      requestFullscreen({ lock: true }).then((ok) => { retryClick = !ok; });
    }, { capture: true });
    document.addEventListener('click', () => {
      if (userLeft || !retryClick || fullscreenElement()) return;
      retryClick = false;
      requestFullscreen({ lock: true });
    }, { capture: true });
  }

  // 2. iPhone Safari: let the bars be scrolled away.
  const scrollTrick = isIPhone && !standalone && !canFullscreen();
  if (scrollTrick) document.documentElement.classList.add('ios-scroll');
  // Safari's bars are showing when the visible height falls well short of the
  // screen's (in landscape the screen's height is its shorter side).
  const barsShowing = () => {
    const full = Math.min(screen.width, screen.height);
    const vh = window.visualViewport ? visualViewport.height : innerHeight;
    return vh < full - 24;
  };
  // Once the player has swiped and Safari still keeps a bar (newer Safari keeps
  // a small one in some layouts), stop asking: Add to Home Screen is the way.
  let gaveUp = false;
  try { gaveUp = sessionStorage.getItem('eartrainer.bars') === 'stuck'; } catch { /* private mode */ }
  const giveUp = (why) => {
    if (gaveUp) return;
    gaveUp = true;
    try { sessionStorage.setItem('eartrainer.bars', 'stuck'); } catch { /* fine */ }
    hintEl.hidden = true;
    onStuck?.(why);
  };
  function update() {
    if (!scrollTrick) return;
    const play = isPlaying();
    document.documentElement.classList.toggle('ios-scroll-play', play);
    const show = landscape() && barsShowing() && !play && !gaveUp;
    hintEl.hidden = !show;
  }
  if (scrollTrick) {
    addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    setInterval(update, 400);
    setTimeout(update, 0); // after the shell has finished starting up
    // After a real swipe, give Safari a moment; if the bars are still there, give up.
    let checkT = 0;
    addEventListener('scroll', () => {
      if (gaveUp || scrollY < 40 || !landscape()) return;
      clearTimeout(checkT);
      checkT = setTimeout(() => { if (barsShowing()) giveUp('swiped'); else update(); }, 900);
    }, { passive: true });
    // Tapping the hint dismisses it.
    hintEl.addEventListener('click', () => giveUp('dismissed'));
    // While playing, the page must not scroll (that would bring the bars back),
    // but it stays scrollable: making it unscrollable can make Safari show its
    // bars again. So touches are simply not allowed to pan it.
    document.addEventListener('touchmove', (e) => {
      if (document.documentElement.classList.contains('ios-scroll-play') && e.cancelable && !e.target.closest?.('.scroll')) e.preventDefault();
    }, { passive: false });
  }
  return { update, scrollTrick, isIOS, standalone };
}

// Keeping the page at its own size. iPhone Safari ignores user-scalable=no,
// so a pinch (two fingers holding a chord and drifting apart look like one)
// or a quick double tap could zoom the page, with no way back. Block those
// gestures, and if the page does end up zoomed, snap it back.
export function preventZoom() {
  const opts = { passive: false };
  // Safari's pinch gestures.
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault(), opts);
  // Any two-finger move (a pinch in browsers without gesture events).
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault();
  }, opts);
  // A second tap within 350 ms would zoom: cancel the zoom, but keep the tap
  // working (fast repeated taps on − or + still count).
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = e.timeStamp;
    if (now - lastEnd < 350 && e.cancelable && e.touches.length === 0 && !e.target.closest?.('input, select, textarea, .scroll')) {
      e.preventDefault();
      // Cancelling the zoom also cancels the tap's click: deliver it ourselves.
      const b = e.target.closest?.('button, [role="radio"], label') || e.target;
      if (!b.disabled) b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
    lastEnd = now;
  }, opts);
  document.addEventListener('dblclick', (e) => e.preventDefault(), opts);
  // Surfaces that are played on (the keys, the navigator, the staff) own their
  // touches outright: cancelling touchstart stops Safari from reading fast
  // taps as a double-tap zoom. Pointer events, which they listen to, still fire.
  for (const sel of ['#kbd', '#kbd-nav .nav-track', '#staff']) {
    document.querySelector(sel)?.addEventListener('touchstart', (e) => e.preventDefault(), opts);
  }
  // Snap back: rewriting the viewport tag resets Safari's zoom.
  const meta = document.querySelector('meta[name="viewport"]');
  const base = meta?.content || '';
  const vv = window.visualViewport;
  let t = 0;
  const snap = () => {
    if (!meta || !vv || vv.scale <= 1.01) return;
    meta.content = `${base}, maximum-scale=1`;
    setTimeout(() => { meta.content = base; }, 300);
  };
  vv?.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(snap, 200); });
  return { snap };
}

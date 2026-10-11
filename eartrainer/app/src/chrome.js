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
export function requestFullscreen() {
  const el = document.documentElement;
  if (fullscreenElement()) return;
  try {
    const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.();
    r?.catch?.(() => { /* refused: carry on */ });
  } catch { /* not allowed here */ }
}
export function exitFullscreen() {
  try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {}); } catch { /* ignore */ }
}

export function createChrome({ touch, isPlaying, hintEl }) {
  const landscape = () => innerWidth > innerHeight;

  // 1. The first tap in landscape asks for fullscreen (where supported).
  if (touch && canFullscreen() && !standalone) {
    document.addEventListener('pointerup', () => {
      if (landscape() && !fullscreenElement()) requestFullscreen();
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
  function update() {
    if (!scrollTrick) return;
    const play = isPlaying();
    document.documentElement.classList.toggle('ios-scroll-play', play);
    const show = landscape() && barsShowing() && !play;
    hintEl.hidden = !show;
  }
  if (scrollTrick) {
    addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    setInterval(update, 400);
    setTimeout(update, 0); // after the shell has finished starting up
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
  // working on buttons (fast repeated taps on − or + still count).
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = e.timeStamp;
    if (now - lastEnd < 350 && e.cancelable && e.touches.length === 0 && !e.target.closest?.('input, select, textarea, .scroll')) {
      e.preventDefault();
      const b = e.target.closest?.('button, [role="radio"], label');
      if (b && !b.disabled) b.click();
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

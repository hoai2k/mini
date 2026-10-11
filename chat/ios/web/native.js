// Injected by the Games Chat iOS app into the web app (chat/) before it runs.
// It turns the web page into the app's call screen without changing the web
// version: no fullscreen button (the app is already full screen), a hang-up
// button at the end of the bottom strip, straight into the call with the
// account's name, and a bridge to the native side:
//   page -> app   webkit.messageHandlers.native.postMessage({type, ...})
//                 {type: 'ready'}                 the page has loaded
//                 {type: 'joined', room}          in the room
//                 {type: 'peers', count}          other people in the call
//                 {type: 'hangup'}                leave the call
//   app -> page   window.GamesChatNative.hangup() / .toast(text)
(() => {
  if (window.GamesChatNative) return;
  const post = msg => { try { window.webkit.messageHandlers.native.postMessage(msg); } catch {} };
  const q = new URLSearchParams(location.search);

  // The web app hides its fullscreen buttons and never asks for fullscreen
  // when it believes it was opened from the home screen.
  try { Object.defineProperty(navigator, 'standalone', { get: () => true, configurable: true }); } catch {}
  // Scripts injected at document start can run before <html> exists.
  const markApp = () => document.documentElement?.classList.add('ios-app');
  markApp();

  let toastTimer = 0;
  function toast(text) {
    let el = document.getElementById('ios-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ios-toast';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.textContent = String(text).slice(0, 200);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function hangup() { post({ type: 'hangup' }); }

  window.GamesChatNative = { hangup, toast };

  function addHangup() {
    const controls = document.getElementById('controls');
    if (!controls || document.getElementById('btn-hangup')) return !!controls;
    const b = document.createElement('button');
    b.id = 'btn-hangup';
    b.type = 'button';
    b.className = 'ctrl hangup';
    b.setAttribute('aria-label', 'Hang up');
    b.innerHTML = '<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg></span><span class="lbl">Hang up</span>';
    b.addEventListener('click', hangup);
    controls.append(b);
    return true;
  }

  // The settings dialog's "Leave the call" hangs up the app call too.
  document.addEventListener('click', e => {
    if (e.target.closest('#btn-leave')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      hangup();
    }
  }, true);

  // Straight into the call: the app already knows who you are.
  function autoJoin() {
    const name = (q.get('name') || '').slice(0, 20);
    const input = document.getElementById('name-input');
    const go = document.getElementById('start-btn');
    if (!name || !input || !go) return false;
    input.value = name;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    go.click();
    post({ type: 'joined', room: q.get('room') || 'everyone' });
    return true;
  }

  // How many other people are in the call: the video tiles, minus mine.
  let lastPeers = -1;
  function countPeers() {
    const tiles = document.querySelectorAll('#stage .tile').length;
    const n = Math.max(0, tiles - 1);
    if (n !== lastPeers) { lastPeers = n; post({ type: 'peers', count: n }); }
  }

  function ready() {
    markApp();
    // The app passes native.css as window.__gamesChatCSS.
    if (window.__gamesChatCSS && !document.getElementById('ios-style')) {
      const st = document.createElement('style');
      st.id = 'ios-style';
      st.textContent = window.__gamesChatCSS;
      document.head.append(st);
    }
    addHangup();
    post({ type: 'ready' });
    // The app's modules load after this script; wait for the title screen.
    let tries = 0;
    const t = setInterval(() => {
      if (autoJoin() || ++tries > 100) clearInterval(t);
    }, 100);
    const stage = document.getElementById('stage');
    if (stage) new MutationObserver(countPeers).observe(stage, { childList: true, subtree: true });
    setInterval(countPeers, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

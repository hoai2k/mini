// Small things every screen uses: an element by id, a row of chips bound to
// a setting, a short message at the foot of the screen, and saving a file.
import { isApp, shareFile } from './native.js';
import { isIOS } from './devices.js';

export const $ = (id) => document.getElementById(id);

/**
 * Did the keyboard bring the focus where it is (Tab), rather than a click or
 * a tap? A clicked button keeps the focus, and Space would press it again: on
 * a control the pointer reached, Space is the screen's play/stop instead, as
 * in any player. A control reached with Tab is pressed by Space as usual.
 * (Not `:focus-visible`: Chrome turns that on for whatever has the focus as
 * soon as any key is pressed, Space included.)
 */
let byKeyboard = false;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => { byKeyboard = false; }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab') byKeyboard = true; }, true);
}
export const keyboardFocus = () => byKeyboard;
/** A control's own activating key: Enter, or Space where the keyboard brought the focus. */
export const pressKey = (e) => e.key === 'Enter' || (e.key === ' ' && keyboardFocus());

/** A row of single-choice chips bound to one setting. */
export function chips(container, options, get, set) {
  container.setAttribute('role', 'radiogroup');
  const buttons = options.map((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.textContent = o.label || o.id;
    b.addEventListener('click', () => { set(o.id); sync(); });
    container.append(b);
    return [o.id, b];
  });
  const sync = () => {
    for (const [id, b] of buttons) {
      b.setAttribute('aria-checked', String(get() === id));
      b.tabIndex = get() === id ? 0 : -1;
    }
  };
  // Arrow keys move between chips, as in a radio group.
  container.addEventListener('keydown', (e) => {
    const i = buttons.findIndex(([, b]) => b === document.activeElement);
    if (i < 0) return;
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const [id, b] = buttons[(i + d + buttons.length) % buttons.length];
    set(id);
    sync();
    b.focus();
  });
  sync();
  return sync;
}

/** A short message at the bottom of the screen. */
let noteTimer = 0;
export function note(text) {
  const el = $('note');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

/**
 * Save a file: the share sheet in the apps and on phones, a download
 * elsewhere. Resolves to 'shared', 'downloaded', 'aborted' (the share sheet
 * was closed), 'needsTap' (iPhone wants a fresh tap to share) or 'failed'.
 */
export async function saveFile(file, title) {
  if (isApp()) {
    // The app's own share sheet: no "tap again" step, and Android's web view has none.
    try { await shareFile(file, title); return 'shared'; } catch { return 'failed'; }
  }
  const phone = isIOS() || /Android/i.test(navigator.userAgent);
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'aborted';
      if (err?.name === 'NotAllowedError') return 'needsTap';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'downloaded';
}

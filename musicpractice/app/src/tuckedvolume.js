// A volume control tucked away as a faint speaker (the metronome's, at the
// picture's top right; the Playback Recorder's, beside the record button).
// Grab the speaker and drag up or down: the volume follows at once, the
// slider showing while it does and folding away a moment after. Tap it: the
// slider opens and stays until a tap elsewhere (or Escape). Arrow keys work
// on the slider.
//
// Markup: .tuck-vol > button.tuck-vol-knob + .tuck-vol-panel > .vslider >
// .vslider-track > .vslider-fill + .vslider-thumb (styles.css).

/**
 * @param {HTMLElement} root the .tuck-vol element
 * @param {{ get: () => number, set: (v: number) => void }} io the volume, 0 to 1
 * @returns {{ show: () => void, swallowedTap: (el: Element) => boolean }}
 */
export function tuckedVolume(root, { get, set }) {
  const knob = root.querySelector('.tuck-vol-knob');
  const slider = root.querySelector('.vslider');
  const track = slider.querySelector('.vslider-track');

  function show() {
    const v = get();
    slider.style.setProperty('--v', v);
    slider.setAttribute('aria-valuenow', String(Math.round(v * 100)));
    slider.setAttribute('aria-valuetext', `${Math.round(v * 100)}%`);
    root.dataset.level = v === 0 ? '0' : v < 0.5 ? '1' : '2';
  }
  function setVolume(v) {
    set(Math.round(Math.max(0, Math.min(1, v)) * 100) / 100);
    show();
  }
  let fold = 0;
  function open(on, { linger = 0 } = {}) {
    clearTimeout(fold);
    if (!on && linger) { fold = setTimeout(() => open(false), linger); return; }
    root.classList.toggle('open', on);
    knob.setAttribute('aria-expanded', String(on));
    slider.tabIndex = on ? 0 : -1;
  }
  // The speaker: a drag sets the volume by how far it moves (the slider's
  // height for all of it); a tap opens the slider.
  let grab = null; // { y, from, moved, wasOpen }
  knob.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    e.preventDefault();
    knob.setPointerCapture(e.pointerId);
    grab = { y: e.clientY, from: get(), moved: false, wasOpen: root.classList.contains('open') };
  });
  knob.addEventListener('pointermove', (e) => {
    if (!grab || !knob.hasPointerCapture(e.pointerId)) return;
    const dy = grab.y - e.clientY;
    if (!grab.moved && Math.abs(dy) < 6) return;
    if (!grab.moved) { grab.moved = true; open(true); }
    setVolume(grab.from + dy / (track.offsetHeight || 150)); // its unscaled height: it may still be opening
  });
  knob.addEventListener('pointerup', () => {
    if (!grab) return;
    if (grab.moved) { if (!grab.wasOpen) open(false, { linger: 1200 }); }
    else open(!grab.wasOpen);
    grab = null;
  });
  knob.addEventListener('pointercancel', () => { grab = null; });
  knob.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    open(!root.classList.contains('open'));
    if (root.classList.contains('open')) slider.focus();
  });
  // The slider itself: drag the knob or the track.
  slider.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    e.preventDefault();
    clearTimeout(fold);
    slider.setPointerCapture(e.pointerId);
    const at = (ev) => { const r = track.getBoundingClientRect(); return (r.bottom - ev.clientY) / r.height; };
    setVolume(at(e));
    const move = (ev) => setVolume(at(ev));
    slider.addEventListener('pointermove', move);
    slider.addEventListener('pointerup', () => slider.removeEventListener('pointermove', move), { once: true });
  });
  root.addEventListener('keydown', (e) => {
    const step = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 }[e.key];
    if (e.key === 'Escape') { open(false); knob.focus(); }
    else if (e.target === slider && (e.key === 'Home' || e.key === 'End')) setVolume(e.key === 'End' ? 1 : 0);
    else if (e.target === slider && step) setVolume(get() + step);
    else return;
    e.preventDefault();
    e.stopPropagation(); // not the page's own keys
  });
  // A tap anywhere else folds it away; on the page it sits over, that is all
  // the tap does (as when closing a menu): swallowedTap() says so.
  let foldedOn = null;
  document.addEventListener('pointerdown', (e) => {
    if (!root.classList.contains('open') || root.contains(e.target)) return;
    open(false);
    foldedOn = e.target;
    setTimeout(() => { foldedOn = null; }, 800); // a press that was not a tap leaves nothing behind
  }, true);
  show();
  return {
    show,
    /** Did the tap that just happened on `el` only fold the volume away? (Asking clears it.) */
    swallowedTap(el) {
      const hit = !!foldedOn && el.contains(foldedOn);
      foldedOn = null;
      return hit;
    },
  };
}

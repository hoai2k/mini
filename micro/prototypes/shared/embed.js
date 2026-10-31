// The embed protocol between the Micro Zoom game shell (micro/game/) and a
// world page (micro/prototypes/<world>/). The shell hosts each world in a
// same-origin <iframe> at `<world>/?embed=1`; the world talks to it through
// this module. Opened on its own (no ?embed=1, or not in a frame) a world
// works exactly as before, and the calls below fall back to a small toast so
// a prototype can be developed standalone.
//
//   import { embed } from '../shared/embed.js';
//   if (reachedNextWorld) embed.landmark('forward');
//   embed.near('back', playerOnBackdoor);           // the shell shows "Y: back to …"
//   if (playerOnBackdoor && ctl.special.pressed()) embed.landmark('back');
//   embed.on('pause', () => …);                     // optional; see "Pausing" below
//
// ---------------------------------------------------------------------------
// Messages. Every message is a plain object posted with
// postMessage(msg, location.origin) and tagged { 'micro-embed': 1, type, ... }.
// Both sides ignore messages from another origin or another window.
//
// World → shell
//   ready     {title, provides: string[]}  after the world's first frames ran
//             (sent automatically). `provides` lists extra roles the page
//             offers (embed.provide('transition') in the zoom player).
//   landmark  {kind: 'forward'|'back', ...info}  forward: the player reached
//             the next-stage landmark. back: the player dwelt on the backdoor
//             landmark and pressed Y. The shell plays the zoom transition.
//   near      {kind: 'forward'|'back', on: boolean, label?}  the player is at
//             (on) or has left (off) a landmark; the shell shows a prompt
//             ("Y · Rise to the moss canopy"). Optional.
//   menu      Menu/Start was pressed (features.js sends it instead of opening
//             its panel); the shell pauses.
//   controls  {shown: boolean}  the controls panel was shown or hidden (View),
//             so the shell's on-screen button can follow.
//   features  {open: boolean}  the developer feature panel opened or closed.
//   join      {index, color, name?}  a player joined during play (any button
//             on an unassigned controller, read by shared/players.js inside
//             the world); the shell shows a "Player N joined" toast.
//   leave     {index}  a player's controller went away (optional).
//   captured / died / progress {...}  optional, for statistics.
//   done      {...}  the zoom player finished a transition (see below).
//
// Shell → world
//   pause                    stop the simulation and the sound.
//   resume                   carry on.
//   sound     {on, volume}   the game's master sound switch and volume (0..1).
//   controls  {show, autoHide?}  show or hide the controls panel; autoHide is
//             seconds after which it hides itself (8 at the start of a board).
//   settings  {invertY, ...} shared settings changed in the shell.
//   features  {open}         open the world's developer feature panel.
//   players   {roster}       the joined players, shared/players.js toJSON(),
//             sent before `resume`; the world restores it with fromJSON() and
//             keeps polling for joins itself (see embed.players).
//
// ---------------------------------------------------------------------------
// Pausing. In embed mode the page starts held: its first two animation frames
// run (so it draws and reports `ready`), then requestAnimationFrame callbacks
// are held until the shell sends `resume`, and held again on `pause`. Every
// world drives its loop with requestAnimationFrame and clamps dt, so this
// freezes the simulation without code in the world. A world that keeps time
// some other way (setTimeout, setInterval) should listen to embed.on('pause').
// Sound: shared/audio.js suspends its AudioContext on pause by itself.
//
// Page chrome in embed mode: shared/hud.js drops the "All prototypes" link,
// starts with the controls panel hidden and follows `controls`; shared/
// features.js hides its tab, posts `menu` on Menu and opens on `features`.
//
// The zoom player (micro/prototypes/zoom/) is loaded as
// `zoom/?embed=1&from=<world>&to=<world>&dir=in|out`, calls
// embed.provide('transition') before its first frame, plays the one
// transition when it receives `resume`, and posts `done` when it arrives.

const TAG = 'micro-embed';
const params = new URLSearchParams(location.search);
const framed = (() => { try { return window.parent !== window; } catch { return true; } })();
const origin = location.origin && location.origin !== 'null' ? location.origin : null;
const active = params.get('embed') === '1' && framed && !!origin;

const listeners = new Map(); // type -> Set<fn>
const provides = new Set();
let paused = active;
let readySent = false;
let soundOn = true;
let volume = 1;
let settings = {};
let roster = null;

function emit(type, data) {
  for (const fn of listeners.get(type) || []) {
    try { fn(data); } catch (e) { console.error(`[micro] embed ${type} handler:`, e); }
  }
}

function post(type, data = {}) {
  if (!active) return;
  try { window.parent.postMessage({ ...data, [TAG]: 1, type }, origin); } catch { /* shell gone */ }
}

function sendReady() {
  if (readySent) return;
  readySent = true;
  post('ready', { title: document.title.replace(/ · Micro prototypes$/, ''), provides: [...provides] });
}

// Hold the page's animation frames while paused (see "Pausing" above).
let release = () => {};
if (active) {
  const native = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  const held = new Map();
  let fake = -1;
  let ran = 0;
  window.requestAnimationFrame = (cb) => {
    if (paused && ran >= 2) { const id = fake--; held.set(id, cb); return id; }
    return native((t) => {
      // A frame already queued when `pause` arrived is held too, so nothing
      // advances after the pause.
      if (paused && ran >= 2) { held.set(fake--, cb); return; }
      ran++;
      if (ran >= 2) sendReady();
      cb(t);
    });
  };
  window.cancelAnimationFrame = (id) => (id < 0 ? held.delete(id) : nativeCancel(id));
  release = () => {
    const cbs = [...held.values()];
    held.clear();
    for (const cb of cbs) window.requestAnimationFrame(cb);
  };

  addEventListener('message', (e) => {
    if (e.source !== window.parent || e.origin !== origin) return;
    const d = e.data;
    if (!d || typeof d !== 'object' || !d[TAG] || typeof d.type !== 'string') return;
    switch (d.type) {
      case 'pause': if (!paused) { paused = true; emit('pause', d); } return;
      case 'resume': if (paused) { paused = false; release(); emit('resume', d); } return;
      case 'sound':
        if (typeof d.on === 'boolean') soundOn = d.on;
        if (typeof d.volume === 'number') volume = Math.max(0, Math.min(1, d.volume));
        emit('sound', { on: soundOn, volume });
        return;
      case 'settings': {
        const { [TAG]: _t, type: _ty, ...rest } = d;
        settings = { ...settings, ...rest };
        emit('settings', rest);
        return;
      }
      case 'players': roster = d.roster ?? null; emit('players', roster); return;
      default: emit(d.type, d);
    }
  });
  document.documentElement.classList.add('micro-embed');
}

// Standalone fallback: a small toast, so landmarks can be tried without the shell.
let toastEl = null, toastTimer = 0;
function devToast(text) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:40;padding:8px 16px;border-radius:999px;'
      + 'background:rgba(28,24,14,.85);color:#f3e7c4;border:1px solid #b8913f;font:600 13px system-ui,sans-serif;pointer-events:none;'
      + 'transition:opacity .3s;opacity:0;white-space:nowrap;max-width:calc(100vw - 32px);overflow:hidden;text-overflow:ellipsis';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, 2600);
}

export const embed = {
  /** True when this page runs inside the Micro Zoom shell (?embed=1 in a frame). */
  active,
  /** The page's address parameters (from, to, dir for the zoom player). */
  params,
  /** True while the shell has the game paused (always false standalone). */
  get paused() { return paused; },
  /** The shell's master sound switch and volume. */
  get soundOn() { return soundOn; },
  get volume() { return volume; },
  /** Shared settings last sent by the shell ({ invertY, ... }). */
  get settings() { return settings; },
  /** The roster the shell passed in (players.js toJSON()), or null. */
  get players() { return roster; },
  /** Listen for a shell message ('pause', 'resume', 'sound', 'controls', 'settings', 'features', 'players'). Returns an unsubscribe. */
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type).delete(fn);
  },
  /** Post a raw message to the shell (no-op standalone). */
  post,
  /** Declare a role before the first frame, e.g. 'transition' for the zoom player. */
  provide(role) { provides.add(role); },
  /** The player reached a landmark: 'forward' (next world) or 'back' (dwelt on the backdoor and pressed Y). */
  landmark(kind, info = {}) {
    if (kind !== 'forward' && kind !== 'back') throw new Error(`embed.landmark: unknown kind ${kind}`);
    if (active) post('landmark', { ...info, kind });
    else devToast(kind === 'forward' ? 'Landmark reached: in the game this zooms in to the next world' : 'Backdoor: in the game this zooms out to the previous world');
  },
  /** The player is at (on) or has left (off) a landmark; the shell shows a prompt. */
  near(kind, on, label) {
    if (active) post('near', { kind, on: !!on, label });
  },
  /** Menu/Start pressed: the shell pauses (features.js calls this in embed mode). */
  menu() { post('menu'); },
  /** A player joined (index 0..3, colour as CSS); the shell toasts it. */
  join(index, color, name) { post('join', { index, color, name }); },
  leave(index) { post('leave', { index }); },
  captured(info = {}) { post('captured', info); },
  died(info = {}) { post('died', info); },
  progress(info = {}) { post('progress', info); },
  /** Zoom player: the transition has arrived. */
  done(info = {}) { if (active) post('done', info); else devToast('Transition done'); },
};

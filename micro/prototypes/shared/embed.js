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
//   frozen    {pose}  after a `landmark {kind: 'forward', outro: true}`: the
//             world has played its success and slowed to a freeze frame;
//             `pose` frames the next world's creature as it is now on screen
//             (see "Continuous transitions" below). Sent by embed.frozen().
//   opening   {pose}  in reply to `hold`: how the world's opening view frames
//             its own creature. Sent by embed.opening().
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
////   hold                     run frames but keep the world's time stopped (a
//             world that provides 'intro'): it draws its opening scene with
//             the camera the shell sends, and replies `opening {pose}`.
//   camera    {pose}         put the camera where `pose` frames the creature
//             (the old world's next creature, or the new world's own).
//   begin                    the transition is over: time runs again (the
//             world eases it in) and the camera is the world's own. Implies
//             `resume`.
//
// ---------------------------------------------------------------------------
// Continuous transitions (springtail → mite first; design: the owner,
// 2026-11-01: "an indication of success and then a slowdown to freeze frame,
// and a direct transition from the existing world scene into the beginning
// scene of the next world. It should feel continuous").
//
//   1. The old world (provides 'outro') reaches its portal: it posts
//      `landmark {kind: 'forward', outro: true}` and keeps running: a golden
//      burst, a chime, a rumble, then its time scale eases to 0 while it keeps
//      rendering. Frozen, it posts `frozen {pose}` (embed.frozen).
//   2. The shell has the next world preloaded (it started on `near`, at the
//      latest on the landmark). Once it is ready and provides 'intro', the
//      shell sends it `hold` (still frozen at its start, now rendering) and it
//      answers `opening {pose}` (embed.opening).
//   3. The shell eases one pose from the old world's to the new world's and
//      sends it as `camera {pose}` to both every frame: the old world pushes
//      in on the next creature (the mite speck on its capitulum), and the new
//      world, stacked above it, fades in under exactly the same framing, so
//      its creature is where the speck was, at the same size and growing at
//      the same rate. Then the old frame goes and the new world gets `begin`.
//
//   A pose frames a creature in a view, the same way in every world:
//     f      the creature's length over the view's width at its depth
//     x, y   its centre on screen, normalised device coordinates (-1..1, y up)
//     pitch  the camera's elevation above the horizon (radians)
//     rel    the camera's azimuth round the creature minus the creature's
//            heading (radians; azimuths as atan2(z, x) in the xz plane)
//   Every world dollies (its field of view fixed) so the creature lands at
//   (x, y) with apparent size f: embed.poseCamera() does the arithmetic for a
//   three.js camera.
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
// starts with the controls panel hidden, omits diagnostic stats and follows
// `controls`; shared/features.js hides its tab, posts `menu` on Menu and
// opens on `features`.
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
let held = false;
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
      case 'hold':
        held = true;
        if (paused) { paused = false; release(); }
        emit('hold', d);
        return;
      case 'begin': {
        const was = held || paused;
        held = false;
        if (paused) { paused = false; release(); }
        emit('begin', d);
        if (was) emit('resume', d);
        return;
      }
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
  /** True while the shell holds the world in a transition: draw, but keep time stopped. */
  get held() { return held; },
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
  /** A player joined (index 0..3, colour as CSS); the shell toasts it. Pass the
   *  roster (players.toJSON()) so the shell keeps it for the next world. */
  join(index, color, name, roster) { post('join', roster ? { index, color, name, roster } : { index, color, name }); },
  leave(index, roster) { post('leave', roster ? { index, roster } : { index }); },
  captured(info = {}) { post('captured', info); },
  died(info = {}) { post('died', info); },
  progress(info = {}) { post('progress', info); },
  /** Old world, after landmark('forward', { outro: true }): frozen; `pose` frames the next creature. */
  frozen(pose) { post('frozen', { pose }); },
  /** New world, on `hold`: how its opening view frames its creature. */
  opening(pose) { post('opening', { pose }); },
  /**
   * Hide the page's chrome (HUD, toasts, overlays) for a cinematic moment,
   * leaving `keep` (the world's WebGL canvas) on screen; on = false brings it back.
   */
  cinematic(on, keep) {
    for (const el of document.body.children) {
      if (el === keep || el.contains?.(keep) || el.tagName === 'SCRIPT') continue;
      if (on) { if (!('microCine' in el.dataset)) { el.dataset.microCine = el.style.visibility || ''; el.style.visibility = 'hidden'; } }
      else if ('microCine' in el.dataset) { el.style.visibility = el.dataset.microCine; delete el.dataset.microCine; }
    }
  },
  /**
   * The pose (see "Continuous transitions") of a creature at world point `c`
   * with heading `heading` (atan2(z, x) of its forward) and length `len`, in
   * a three.js perspective camera's current view; `pitch` and `yaw` are the
   * camera's elevation and azimuth round its target.
   */
  poseOf(camera, c, { len, heading, pitch, yaw }) {
    camera.updateMatrixWorld();
    const e = camera.matrixWorldInverse.elements;
    // the point in camera space
    const vx = e[0] * c.x + e[4] * c.y + e[8] * c.z + e[12];
    const vy = e[1] * c.x + e[5] * c.y + e[9] * c.z + e[13];
    const vz = e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14];
    const depth = Math.max(1e-6, -vz);
    const tanV = Math.tan((camera.fov * Math.PI) / 360), tanH = tanV * camera.aspect;
    return { f: len / (2 * depth * tanH), x: vx / (depth * tanH), y: vy / (depth * tanV), pitch, rel: wrapAngle(yaw - heading) };
  },
  /**
   * Place a three.js perspective camera (its fov and aspect kept) so the
   * creature at `c` (heading, len) is framed as `pose` says. Returns
   * { yaw, pitch, depth, target, halfW } (target: the point the camera looks at, at
   * the creature's depth).
   */
  poseCamera(camera, pose, c, { len, heading }) {
    const tanV = Math.tan((camera.fov * Math.PI) / 360), tanH = tanV * camera.aspect;
    const halfW = len / (2 * Math.max(1e-6, pose.f));
    const depth = halfW / tanH, halfH = depth * tanV;
    const yaw = heading + pose.rel, pitch = pose.pitch;
    const cp = Math.cos(pitch);
    // back: from the target toward the camera; right and up of the view
    const bx = Math.cos(yaw) * cp, by = Math.sin(pitch), bz = Math.sin(yaw) * cp;
    let rx = bz, rz = -bx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl; // right: up (0,1,0) × back, normalised
    const ux = by * rz, uy = bz * rx - bx * rz, uz = -by * rx;                    // up: back × right
    const ox = pose.x * halfW, oy = pose.y * halfH;
    const tx = c.x - rx * ox - ux * oy, ty = c.y - uy * oy, tz = c.z - rz * ox - uz * oy;
    camera.position.set(tx + bx * depth, ty + by * depth, tz + bz * depth);
    camera.up.set(0, 1, 0);
    camera.lookAt(tx, ty, tz);
    camera.updateMatrixWorld();
    return { yaw, pitch, depth, halfW, target: { x: tx, y: ty, z: tz } };
  },
  /** Zoom player: the transition has arrived. */
  done(info = {}) { if (active) post('done', info); else devToast('Transition done'); },
};

function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

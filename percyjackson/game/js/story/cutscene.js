// Cutscenes in the engine: the game's renderer and world, a camera moved
// along keyframes, letterbox bars, subtitles in the story voice (plain
// English: narration never uses the Greek letters), an optional story-card
// picture (shown once its image has loaded), fades.
// A press of A (or Enter / Space, a click, a tap) skips to the next shot: the
// skipped shot is run to its end off screen (fastForward), so whatever its
// act and the set's update reach by then (figures walked, the car driven, a
// sign read) is where the next shot starts; on the last shot it ends the
// cutscene. One press skips one shot (edge-triggered, with a short cooldown).
// Holding B pauses it (Backspace, a long press on a touch screen):
// the shot's clock, its figures, the camera and the subtitle stand still
// until it is let go. Skipping the whole cutscene: hold A (Enter / Space, the
// mouse button), or the Skip all button on a touch screen; a ring fills while
// you hold. (B used to skip it all too; it pauses now, and Menu no longer
// skips.) Menu or Esc opens the game's pause menu over it (main.js): while a
// menu is up the cutscene waits (alone the game is paused; online this
// screen's cutscene stands still, as when B is held), and a press made in the
// menu never skips a shot. The on-screen hint follows the device last used.
//
// A cutscene definition (story/cutscenes.js) is { id, title, build(game,
// ctx) } where build loads the set and returns { shots, update?(t, dt),
// dispose?() }. A shot is { dur, cam(k, t) -> { pos, look, fov? } (k: 0..1
// through the shot), lines: [{ at, text }], card?: { src, at, dur, side? ('left') }, fadeIn?,
// fadeOut? ('black' | 'white'), act?(k, dt, t), noFrame? (true: framed by hand, so
// story/framing.js leaves it alone) }. Before a shot plays, a camera that the
// set would hide is turned clear (frame below).
//
// Online the host drives (net/online.js shares the cutscene, and the shot it is
// on, in its scene setup): guests see the same cutscene and are brought up to
// the host's shot when they fall behind (syncShot), so the host's presses of A
// carry over. A guest's own press skips only its own view (it then waits for
// the host at the end). A guest holding skip asks the host, and the host skips
// when it holds skip itself or every guest has asked. Pausing is for this
// screen only: a paused guest catches up with the host's shot when it lets go.
import * as THREE from 'three/webgpu';
import { h } from '../ui/ui.js';
import { prefersReducedMotion } from '../settings.js';
import { artReady } from '../ui/art.js';
import { t } from '../text_config.js';
import { clearTurn, turnAbout, seenAt } from './framing.js';
import { shotDuration } from './subtitles.js';
import { finishShot, PressGate } from './shotSkip.js';

const HOLD = 0.85;   // seconds of holding to skip
const LONG = 0.35;   // a touch held this long is a long press (pause), not a tap (next)
const PAUSE_KEYS = ['Backspace'], SKIP_KEYS = ['Space', 'Enter'];   // (Esc: the pause menu, main.js)
const ease = (k) => k * k * (3 - 2 * k);

export class Cutscene {
  constructor(game, def, { remote = false, onEnd = null } = {}) {
    this.game = game; this.def = def; this.id = def.id;
    this.remote = remote; this.onEnd = onEnd;
    this.t = 0; this.shotIdx = -1; this.shotT = 0; this.hold = 0; this.done = false; this.voted = false;
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35 };
    this.held = { key: false, ptr: false, pauseKey: false, touch: false };
    this.touchT = 0; this.paused = false;
    this.votes = new Set();
    this.press = false; this.gate = new PressGate();   // (one press, one shot; a press already down as the cutscene starts never skips its first)
    this.padPrevA = new Set();
  }
  start() {
    const g = this.game;
    this.buildOverlay();
    this.set = this.def.build(g, this) ?? { shots: [] };
    this.shots = this.set.shots ?? [];
    for (const sh of this.shots) sh.dur = shotDuration(sh);   // (a longer subtitle in text_config.js holds its shot longer)
    // its music plays over the set's (story/cutscenes.js music keys; the generated music until a track arrives)
    if (this.def.music) g.audio?.setOverride?.(this.def.music);
    this.total = this.shots.reduce((s, x) => s + x.dur, 0);
    this.fov0 = g.rig.camera.fov;
    this.onKey = (e) => {
      if (g.ui?.active && e.type === 'keydown') return;   // (a key pressed in a menu over the cutscene is the menu's)
      const pause = PAUSE_KEYS.includes(e.code), skip = SKIP_KEYS.includes(e.code);
      if (!pause && !skip) return;
      const down = e.type === 'keydown';
      if (pause) this.held.pauseKey = down; else this.held.key = down;
      if (!down) return;
      e.preventDefault();
      if (skip && !e.repeat) this.press = true;   // (held keys repeat: only the first keydown is a press)
    };
    this.padPrevA = this.padA();
    window.addEventListener('keydown', this.onKey, true); window.addEventListener('keyup', this.onKey, true);
    this.nextShot();
    this.update(0);
  }
  buildOverlay() {
    const el = this.el = h('section', { class: 'cutscene', role: 'dialog', 'aria-label': this.def.title ?? t('cutscenes.ariaLabel') },
      h('div', { class: 'cs-bar top' }), h('div', { class: 'cs-bar bottom' }),
      this.cardEl = h('div', { class: 'cs-card hidden' }, this.cardImg = h('img', { alt: '', draggable: 'false' })),
      this.subEl = h('p', { class: 'cs-sub', 'aria-live': 'polite' }),
      this.fadeEl = h('div', { class: 'cs-fade' }),
      this.pausedEl = h('div', { class: 'cs-paused hidden' }, t('cutscenes.paused')),
      this.skipEl = h('div', { class: 'cs-skip' }, this.nextEl = h('span', { class: 'next' }, this.nextText()), h('span', { class: 'ring' }), h('span', { class: 'txt' }, this.skipText())),
      this.skipBtn = h('button', { class: 'cs-skipall hidden', type: 'button' }, t('cutscenes.skip.button')));
    this.hintDev = this.game.input?.lastDevice;
    this.skipBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.skipBtn.addEventListener('click', (e) => { e.stopPropagation(); if (!this.voted) { this.voted = true; this.requestSkip(); } });
    this.skipBtn.classList.toggle('hidden', this.hintDev !== 'touch'); this.skipEl.classList.toggle('touch', this.hintDev === 'touch');
    // a click (mouse, pen): the next shot, and held, the skip ring; a touch: a tap is the next shot, a long press pauses
    const down = (e) => {
      e.preventDefault();
      if (e.pointerType === 'touch') { this.held.touch = true; this.touchT = 0; return; }
      this.held.ptr = true; this.press = true;
    };
    const up = (e) => {
      if (e.pointerType === 'touch') { if (this.held.touch && e.type === 'pointerup' && this.touchT < LONG) this.press = true; this.held.touch = false; return; }
      this.held.ptr = false;
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
  }
  skipText() {
    const pad = this.game.input?.lastDevice?.startsWith?.('pad'), touch = this.game.input?.lastDevice === 'touch';
    return t(pad ? 'cutscenes.skip.pad' : touch ? 'cutscenes.skip.touch' : 'cutscenes.skip.kbm');
  }
  nextText() {
    const pad = this.game.input?.lastDevice?.startsWith?.('pad'), touch = this.game.input?.lastDevice === 'touch';
    const dev = pad ? 'pad' : touch ? 'touch' : 'kbm';
    return t(`cutscenes.next.${dev}`) + t('cutscenes.hintSep') + t(`cutscenes.pause.${dev}`);
  }
  // the hints follow the device last used (as the game's other prompts do)
  refreshHints() {
    const dev = this.game.input?.lastDevice;
    if (dev === this.hintDev || this.voted || this.done) return;
    this.hintDev = dev;
    this.nextEl.textContent = this.nextText();
    this.skipEl.querySelector('.txt').textContent = this.skipText();
    this.skipBtn.classList.toggle('hidden', dev !== 'touch'); this.skipEl.classList.toggle('touch', dev === 'touch');
  }
  nextShot() {
    this.shotIdx++; this.shotT = 0;
    const s = this.shots[this.shotIdx];
    if (!s) return;
    this.linesShown = new Set();
    this.subEl.replaceChildren(); this.subEl.classList.remove('show');
    if (s.fadeIn) this.fade(s.fadeIn, 1, 0, 0.6);
    s.enter?.(this.game, this);
    this.frame(s);
  }
  // Before a shot plays: if the set hides its look point or the figures in
  // frame, turn the whole shot round its look point (story/framing.js).
  frame(s) {
    const g = this.game, w = g.world;
    if (!s.cam || !w || s.framed || s.noFrame) return;
    s.framed = true;
    const poses = [];
    for (let i = 0; i <= 5; i++) { const c = s.cam(i / 5, (i / 5) * s.dur); if (c) poses.push({ pos: c.pos.clone(), look: c.look.clone() }); }
    if (!poses.length) return;
    // the figures in frame at the middle of the shot, within 25 m: their heads
    const mid = poses[Math.floor(poses.length / 2)], cam = g.rig.camera, keep = cam.position.clone(), q = cam.quaternion.clone();
    cam.position.copy(mid.pos); cam.lookAt(mid.look); cam.updateMatrixWorld();
    const heads = [];
    for (const a of this.set.actors ?? []) {
      if (!a.rig.root.visible) continue;
      const hd = a.rig.root.position.clone(); hd.y += 1.5 * (a.rig.root.scale.y || 1);
      const v = hd.clone().project(cam);
      if (v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95 && hd.distanceTo(mid.pos) < 25) heads.push(hd);
    }
    cam.position.copy(keep); cam.quaternion.copy(q); cam.updateMatrixWorld();
    const t = clearTurn(w, poses, heads);
    s.fix = t;
    if (!t.dyaw && !t.dpitch) return;
    const cam0 = s.cam;
    s.cam = (k, tt) => { const c = cam0(k, tt); if (c) turnAbout(c.pos, c.look, t.dyaw, t.dpitch, c.pos); return c; };
  }
  fade(color, from, to, dur) {
    const f = this.fadeEl;
    f.style.background = color === 'white' ? '#fff8e8' : '#000';
    f.style.transition = 'none'; f.style.opacity = String(from);
    void f.offsetWidth;
    f.style.transition = `opacity ${dur}s ease`; f.style.opacity = String(to);
  }
  line(text) {
    this.subEl.textContent = text; this.subEl.classList.add('show');
    this.game.audio?.ui?.('move');
  }
  // a pad holding button i (A 0: skip all; B 1: pause; padmap.js BTN)
  pad(i = 0) {
    for (const p of navigator.getGamepads?.() ?? []) if (p?.buttons[i]?.pressed) return true;
    return false;
  }
  // the pads holding A now (by index), for the press of A (its down edge)
  padA() {
    const out = new Set();
    for (const p of navigator.getGamepads?.() ?? []) if (p?.buttons[0]?.pressed) out.add(p.index);
    return out;
  }
  // A was pressed (pad, Enter / Space, a click or a tap) since the last frame
  pressed() {
    const a = this.padA();
    let edge = this.press;
    for (const i of a) if (!this.padPrevA.has(i)) edge = true;
    this.padPrevA = a; this.press = false;
    return edge;
  }
  // Skip the shot on screen: run it to its end (off screen), then the next
  // one starts; on the last shot, end the cutscene.
  skipShot() {
    if (this.done || !this.shots[this.shotIdx]) return;
    if (this.shotIdx >= this.shots.length - 1) {
      // the last shot: the host (or someone alone) ends it for everyone; a guest waits for the host
      if (this.remote) this.finish(); else this.finish(true);
      return;
    }
    this.advance();
  }
  // finish the shot on screen as if it had played to its end, and start the next
  advance() {
    this.fastForward();
    this.fadingOut = false;
    const next = this.shots[this.shotIdx + 1];
    if (!next?.fadeIn) { const f = this.fadeEl; f.style.transition = 'opacity .15s ease'; f.style.opacity = '0'; }   // (a fade the skipped shot began never darkens the next)
    this.cardEl.classList.add('hidden');
    this.nextShot();
  }
  // Run the rest of the shot on screen in small steps, as update() would:
  // its act (k up to 1), the set's update (figures, vehicles, traffic) and
  // the painted signs. Nothing is shown (no subtitles, cards or fades), and
  // the set can see ctx.ff to leave out its flashes and sounds.
  fastForward() {
    const s = this.shots[this.shotIdx];
    if (!s) return;
    this.ff = true;
    try { finishShot(s, this, (t, dt) => { this.set.update?.(t, dt); this.game.signs?.update?.(dt); }); }
    finally { this.ff = false; }
  }
  // a guest: the host is on shot i; catch up when behind (never back)
  syncShot(i) {
    if (!this.remote || this.done || !this.shots || this.paused) return;   // (paused: it catches up once let go)
    i = Math.min(i, this.shots.length - 1);
    while (!this.done && this.shotIdx < i) this.advance();
  }
  // every frame (real time): the shot, the camera target, the skip ring
  update(dt) {
    if (this.done) return;
    const g = this.game;
    let s = this.shots[this.shotIdx];
    // a menu over it (the pause menu): it waits, and what was pressed there doesn't skip
    if (g.ui?.active) { this.press = false; this.padPrevA = this.padA(); this.hold = 0; this.held.key = false; return; }
    // pause: hold B (Backspace, a long press): nothing moves on, not the clock, the figures or the camera
    if (this.held.touch) this.touchT += dt;
    const paused = this.held.pauseKey || this.pad(1) || (this.held.touch && this.touchT >= LONG);
    if (paused !== this.paused) { this.paused = paused; this.pausedEl.classList.toggle('hidden', !paused); this.el.classList.toggle('paused', paused); }
    if (paused) { this.press = false; this.padPrevA = this.padA(); this.refreshHints(); return; }
    // skip
    const holding = this.held.key || this.held.ptr || this.pad(0);
    this.hold = holding ? this.hold + dt : Math.max(0, this.hold - dt * 2);
    this.skipEl.style.setProperty('--p', Math.min(1, this.hold / HOLD).toFixed(3));
    this.skipEl.classList.toggle('holding', this.hold > 0.05);
    if (this.hold >= HOLD && !this.voted) { this.voted = true; this.requestSkip(); }
    if (this.done) return;
    this.refreshHints();
    // a press of A: the next shot
    if (this.gate.take(dt, this.pressed()) && s) {
      this.skipShot();
      if (this.done) return;
      s = this.shots[this.shotIdx];   // (the next shot from its start, this frame)
    }
    if (!s) { this.finish(); return; }
    this.t += dt; this.shotT += dt;
    const k = Math.min(1, this.shotT / s.dur);
    for (const [i, L] of (s.lines ?? []).entries()) if (this.shotT >= L.at && !this.linesShown.has(i)) { this.linesShown.add(i); this.line(L.text); }
    // the story-card picture: preloaded with the title (ui/art.js); one that isn't there is left out, never drawn late
    if (s.card && artReady(s.card.src)) {
      const on = this.shotT >= s.card.at && this.shotT < s.card.at + s.card.dur;
      if (on && this.cardImg.getAttribute('src') !== s.card.src) this.cardImg.src = s.card.src;
      this.cardEl.classList.toggle('left', s.card.side === 'left');
      this.cardEl.classList.toggle('hidden', !on);
    } else this.cardEl.classList.add('hidden');
    if (s.fadeOut && !this.fadingOut && s.dur - this.shotT < 0.6) { this.fadingOut = true; this.fade(s.fadeOut, 0, 1, 0.55); }
    s.act?.(k, dt, this.shotT);
    this.set.update?.(this.t, dt);
    const c = s.cam ? s.cam(k, this.shotT) : null;
    if (c) { this.cam.pos.copy(c.pos); this.cam.look.copy(c.look); this.cam.fov = c.fov ?? 35; }
    if (this.shotT >= s.dur) { this.fadingOut = false; this.nextShot(); if (!this.shots[this.shotIdx]) this.finish(); }
  }
  // place the game's camera (after the camera rig ran)
  applyCamera() {
    const g = this.game, cam = g.rig.camera;
    cam.position.copy(this.cam.pos);
    // never inside a block: slide toward the look point until out of it
    for (let i = 0; i < 24 && seenAt(g.world, cam.position.x, cam.position.y, cam.position.z); i++) cam.position.lerp(this.cam.look, 0.08);
    if (Math.abs(cam.fov - this.cam.fov) > 0.01) { cam.fov = this.cam.fov; cam.updateProjectionMatrix(); }
    cam.lookAt(this.cam.look);
    cam.updateMatrixWorld();
    g.rig.focus.copy(this.cam.look);
  }
  requestSkip() {
    const g = this.game;
    if (this.remote) {
      g.online?.cutsceneSkip?.(this.id);
      this.skipEl.querySelector('.txt').textContent = t('cutscenes.waitingOthers');
      return;
    }
    // the host (or someone alone) skips for everyone
    this.finish(true);
  }
  // a guest asked to skip: once everyone has, skip
  vote(uid, need) { this.votes.add(uid); if (this.votes.size >= need && !this.remote) this.finish(true); }
  finish(skipped = false) {
    if (this.done) return;
    if (this.remote) {
      // guests hold on the last picture until the host moves on
      this.waiting = true; this.fade('black', 0, 0.85, 0.5);
      this.skipEl.querySelector('.txt').textContent = t('cutscenes.waitingHost');
      this.done = true;
      return;
    }
    this.done = true; this.skipped = skipped;
    this.cleanup();
    this.onEnd?.(this, skipped);
  }
  cleanup() {
    window.removeEventListener('keydown', this.onKey, true); window.removeEventListener('keyup', this.onKey, true);
    const el = this.el; el?.classList.remove('in'); setTimeout(() => el?.remove(), 400);
    this.set?.dispose?.();
    if (this.def.music && this.game.audio?.overrideMusic === this.def.music) this.game.audio.setOverride(null);
    const cam = this.game.rig.camera;
    if (this.fov0 && cam.fov !== this.fov0) { cam.fov = this.fov0; cam.updateProjectionMatrix(); }
  }
  // the host moved on (guests), or the scene changed under it
  abort() { if (!this.cleaned) { this.cleaned = true; this.done = true; this.cleanup(); } }
}

// Camera helpers for shot definitions.
const V = (a) => (a.isVector3 ? a : new THREE.Vector3(...a));
// a straight move from one pose to another (eased unless reduced motion asks for a cut-and-hold)
export function move(from, to, { fov = 35, fov2 = fov } = {}) {
  const a = { pos: V(from.pos), look: V(from.look) }, b = { pos: V(to.pos), look: V(to.look) };
  const P = new THREE.Vector3(), L = new THREE.Vector3();
  return (k) => {
    const e = prefersReducedMotion() ? 0.5 : ease(k);
    return { pos: P.lerpVectors(a.pos, b.pos, e), look: L.lerpVectors(a.look, b.look, e), fov: fov + (fov2 - fov) * e };
  };
}
// follow something that moves (a vehicle): the camera at an offset from it
export function follow(target, offset, lookOffset = [0, 1, 0], { fov = 35, offset2 = offset } = {}) {
  const P = new THREE.Vector3(), L = new THREE.Vector3(), o1 = V(offset), o2 = V(offset2), lo = V(lookOffset), o = new THREE.Vector3();
  return (k) => {
    const e = prefersReducedMotion() ? 0.5 : ease(k);
    const p = typeof target === 'function' ? target() : target.position;
    o.lerpVectors(o1, o2, e);
    return { pos: P.copy(p).add(o), look: L.copy(p).add(lo), fov };
  };
}

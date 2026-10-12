// Cutscenes in the engine: the game's renderer and world, a camera moved
// along keyframes, letterbox bars, subtitles in the story voice (the Greek
// letters settling into English), an optional story-card picture, fades.
// Skippable: hold A, Esc (or Space / Enter) or hold a finger on the screen;
// a ring fills while you hold.
//
// A cutscene definition (story/cutscenes.js) is { id, title, build(game,
// ctx) } where build loads the set and returns { shots, update?(t, dt),
// dispose?() }. A shot is { dur, cam(k, t) -> { pos, look, fov? } (k: 0..1
// through the shot), lines: [{ at, text }], card?: { src, at, dur }, fadeIn?,
// fadeOut? ('black' | 'white'), act?(k, dt, t) }.
//
// Online the host drives (net/online.js shares the cutscene in its scene
// setup): guests see the same cutscene; a guest holding skip asks the host,
// and the host skips when it holds skip itself or every guest has asked.
import * as THREE from 'three/webgpu';
import { h } from '../ui/ui.js';
import { demigodText } from '../ui/greekText.js';
import { prefersReducedMotion } from '../settings.js';

const HOLD = 0.85;   // seconds of holding to skip
const ease = (k) => k * k * (3 - 2 * k);

export class Cutscene {
  constructor(game, def, { remote = false, onEnd = null } = {}) {
    this.game = game; this.def = def; this.id = def.id;
    this.remote = remote; this.onEnd = onEnd;
    this.t = 0; this.shotIdx = -1; this.shotT = 0; this.hold = 0; this.done = false; this.voted = false;
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35 };
    this.held = { key: false, ptr: false };
    this.votes = new Set();
  }
  start() {
    const g = this.game;
    this.buildOverlay();
    this.set = this.def.build(g, this) ?? { shots: [] };
    this.shots = this.set.shots ?? [];
    this.total = this.shots.reduce((s, x) => s + x.dur, 0);
    this.fov0 = g.rig.camera.fov;
    this.onKey = (e) => { if (['Escape', 'Space', 'Enter', 'KeyE'].includes(e.code)) { this.held.key = e.type === 'keydown'; if (e.type === 'keydown') e.preventDefault(); } };
    window.addEventListener('keydown', this.onKey, true); window.addEventListener('keyup', this.onKey, true);
    this.nextShot();
    this.update(0);
  }
  buildOverlay() {
    const el = this.el = h('section', { class: 'cutscene', role: 'dialog', 'aria-label': this.def.title ?? 'Cutscene' },
      h('div', { class: 'cs-bar top' }), h('div', { class: 'cs-bar bottom' }),
      this.cardEl = h('div', { class: 'cs-card hidden' }, this.cardImg = h('img', { alt: '', draggable: 'false' })),
      this.subEl = h('p', { class: 'cs-sub', 'aria-live': 'polite' }),
      this.fadeEl = h('div', { class: 'cs-fade' }),
      this.skipEl = h('div', { class: 'cs-skip' }, h('span', { class: 'ring' }), h('span', { class: 'txt' }, this.skipText())));
    this.cardImg.addEventListener('error', () => { this.cardBroken = true; this.cardEl.classList.add('hidden'); });
    const down = (e) => { this.held.ptr = true; e.preventDefault(); }, up = () => { this.held.ptr = false; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
  }
  skipText() {
    const pad = this.game.input?.lastDevice?.startsWith?.('pad'), touch = this.game.input?.lastDevice === 'touch';
    return `Hold ${pad ? 'A' : touch ? 'the screen' : 'Esc'} to skip`;
  }
  nextShot() {
    this.shotIdx++; this.shotT = 0;
    const s = this.shots[this.shotIdx];
    if (!s) return;
    this.linesShown = new Set();
    this.subEl.replaceChildren(); this.subEl.classList.remove('show');
    if (s.fadeIn) this.fade(s.fadeIn, 1, 0, 0.6);
    s.enter?.(this.game, this);
  }
  fade(color, from, to, dur) {
    const f = this.fadeEl;
    f.style.background = color === 'white' ? '#fff8e8' : '#000';
    f.style.transition = 'none'; f.style.opacity = String(from);
    void f.offsetWidth;
    f.style.transition = `opacity ${dur}s ease`; f.style.opacity = String(to);
  }
  line(text) {
    this.subH?.cancel?.();
    this.subEl.replaceChildren(); this.subEl.classList.add('show');
    this.subH = demigodText(this.subEl, text, { speed: 1.25 });
    this.game.audio?.ui?.('move');
  }
  pad() {
    for (const p of navigator.getGamepads?.() ?? []) if (p && (p.buttons[0]?.pressed || p.buttons[9]?.pressed || p.buttons[1]?.pressed)) return true;
    return false;
  }
  // every frame (real time): the shot, the camera target, the skip ring
  update(dt) {
    if (this.done) return;
    const g = this.game, s = this.shots[this.shotIdx];
    // skip
    const holding = this.held.key || this.held.ptr || this.pad();
    this.hold = holding ? this.hold + dt : Math.max(0, this.hold - dt * 2);
    this.skipEl.style.setProperty('--p', Math.min(1, this.hold / HOLD).toFixed(3));
    this.skipEl.classList.toggle('holding', this.hold > 0.05);
    if (this.hold >= HOLD && !this.voted) { this.voted = true; this.requestSkip(); }
    if (!s) { this.finish(); return; }
    this.t += dt; this.shotT += dt;
    const k = Math.min(1, this.shotT / s.dur);
    for (const [i, L] of (s.lines ?? []).entries()) if (this.shotT >= L.at && !this.linesShown.has(i)) { this.linesShown.add(i); this.line(L.text); }
    if (s.card && !this.cardBroken) {
      const on = this.shotT >= s.card.at && this.shotT < s.card.at + s.card.dur;
      if (on && this.cardImg.getAttribute('src') !== s.card.src) this.cardImg.src = s.card.src;
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
    if (Math.abs(cam.fov - this.cam.fov) > 0.01) { cam.fov = this.cam.fov; cam.updateProjectionMatrix(); }
    cam.lookAt(this.cam.look);
    cam.updateMatrixWorld();
    g.rig.focus.copy(this.cam.look);
  }
  requestSkip() {
    const g = this.game;
    if (this.remote) {
      g.online?.cutsceneSkip?.(this.id);
      this.skipEl.querySelector('.txt').textContent = 'Waiting for the others…';
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
      this.skipEl.querySelector('.txt').textContent = 'Waiting for the host…';
      this.done = true;
      return;
    }
    this.done = true; this.skipped = skipped;
    this.cleanup();
    this.onEnd?.(this, skipped);
  }
  cleanup() {
    window.removeEventListener('keydown', this.onKey, true); window.removeEventListener('keyup', this.onKey, true);
    this.subH?.cancel?.();
    const el = this.el; el?.classList.remove('in'); setTimeout(() => el?.remove(), 400);
    this.set?.dispose?.();
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

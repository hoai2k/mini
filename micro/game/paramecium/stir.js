// Stirring the drop (pure: no three.js; stir.test.mjs runs it in node). The
// owner, 2026-11-03: "pressing X seems to spurt out lines ... it only seems to
// have an effect on the tiny bugs that I can eat. It should also be able to
// move / affect other things in the environment, like at least wiggle them or
// push them aside, or maybe break them, depending on what they are.
// Everything should be interactable if possible."
//
// X is the trichocyst jab: its threads, and with them a push wave (the
// discharge and the cell's oral current, drawn as an arc running out ahead,
// WAVE) that moves what it reaches, by its mass:
//   - diatoms (too big to eat) are shoved and spun; a strong wave (X during a
//     dash) cracks an empty frustule (a dead one: glass only), spilling a
//     little food, and tumbles a live one;
//   - detritus clumps wobble, and crumble into loose particles (and the
//     bacteria living on them) once struck hard enough for their size; those
//     carrying a Vorticella colony are held together by it and only wobble;
//   - Spirogyra filaments, anchored, bend where struck and spring back;
//   - flocs are light: pushed far, a strong wave breaks them up;
//   - Vorticella snap their stalks shut and the bell recoils; one struck open
//     (feeding) knocks loose the bacterial clump at its mouth.
// The swimming body shoves the same things it touches (main.js bodyShove),
// and the bladderwort's pulse drags the light ones toward its door (pullTo).
// Hunters, prey and the bloom are main.js's (the jab's hits are foes.js's).
import { LENGTH } from './swim.js';
import { TILE } from './world.js';

/** The push wave: its run (s), reach (µm past the oral end), half-angle of its arc, depth reach; a strong one (X in a dash). */
export const WAVE = { dur: 0.42, fade: 0.2, reach: 170, half: 0.85, dz: 75, strong: { reach: 240, k: 2.6, dz: 105, half: 1.0 } };
/** Shoves: the impulse a wave gives (µm/s per unit mass at full strength), and how soon things stop again (low Reynolds number). */
export const SHOVE = { j: 300, drag: 0.32, spinDrag: 0.35, maxV: 900, maxSpin: 9 };
/** A filament's bend: its spring (rad/s), damping ratio, and the most it bends (µm). */
export const BEND = { w: 8, zeta: 0.3, max: 34, m: 1.6 };
/** A clump crumbles once struck this hard for its radius (strength ≥ r / per). */
export const CRUMBLE = { per: 36, dash: 0.6 };

const hyp = Math.hypot;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** A push wave from swimmer state S (the oral end, along its heading); strong for X during a dash. */
export function makeWave(S, { strong = false, slot = 0 } = {}) {
  const o = LENGTH * 0.5;
  const P = strong ? WAVE.strong : WAVE;
  return { x: S.x + Math.cos(S.a) * o, y: S.y + Math.sin(S.a) * o, z: S.z, a: S.a, t: 0, strong, k: strong ? WAVE.strong.k : 1, reach: P.reach, dz: P.dz, half: P.half, slot, hit: new Set(), r: 0 };
}
/** The wave's front now (µm from its origin): quick out, easing. */
export const waveFront = (w) => w.reach * (1 - (1 - Math.min(1, w.t / WAVE.dur)) ** 2);
/** Is the wave over (run and faded)? */
export const waveDone = (w) => w.t > WAVE.dur + WAVE.fade;
/**
 * Does wave w's front reach (x, y, z) now (rad: the thing's own radius)? Its strength there (falling off
 * with distance), or 0: outside its arc, past its front, or out of its depth.
 */
export function waveAt(w, x, y, z, rad = 0) {
  const dx = x - w.x, dy = y - w.y, d = hyp(dx, dy), dd = Math.max(0, d - rad);
  if (dd > w.r || Math.abs(z - w.z) > w.dz + rad * 0.3) return 0;
  if (d > rad + 10 && Math.cos(Math.atan2(dy, dx) - w.a) < Math.cos(w.half)) return 0;
  return w.k * (1 - 0.5 * dd / w.reach);
}
/** The wave's push direction at (x, y): outward from its origin (ahead, near the origin). */
function dirAt(w, x, y) {
  const dx = x - w.x, dy = y - w.y, d = hyp(dx, dy);
  if (d < 12) return [Math.cos(w.a), Math.sin(w.a)];
  // mostly outward, a little along the jab
  const ux = dx / d * 0.75 + Math.cos(w.a) * 0.25, uy = dy / d * 0.75 + Math.sin(w.a) * 0.25, l = hyp(ux, uy);
  return [ux / l, uy / l];
}

// ---------------------------------------------------------------- the states
const mkDiatom = () => ({ x: 0, y: 0, z: 0, a: 0, vx: 0, vy: 0, va: 0, cracked: false, ct: 0, gone: false });
const mkClump = () => ({ x: 0, y: 0, vx: 0, vy: 0, dmg: 0, cr: -1, dashT: 0 });
const mkFil = () => ({ b: [] });
const mkFloc = () => ({ x: 0, y: 0, vx: 0, vy: 0, sp: 0, gone: false });
const wake = (W, kind, it, s) => { W.active.add(s); s.kind = kind; s.it = it; return s; };

/**
 * Give item `ref` ({ kind, it, ox, oy }) a shove: impulse (jx, jy) (µm/s at unit mass), struck at (hx, hy)
 * (for the spin), strength k (1 a jab, ~2.6 a strong one; a crack or a crumble needs enough). Returns an
 * event when something gave way: { type: 'crack' | 'crumble' | 'tumble' | 'snap' | 'spit', x, y, z, ... }.
 */
export function shove(W, ref, jx, jy, hx, hy, k = 1, { strong = false, t = 0, dash = false } = {}) {
  const { kind, it, ox, oy } = ref;
  if (kind === 'diatom') {
    const s = wake(W, kind, it, W.dynOf(it, ox, oy, mkDiatom));
    if (s.gone) return null;
    const p = W.diatomPose(it, ox, oy, t), m = it.m;
    s.vx = clamp(s.vx + jx / m, -SHOVE.maxV, SHOVE.maxV); s.vy = clamp(s.vy + jy / m, -SHOVE.maxV, SHOVE.maxV);
    // the spin: struck off its middle, it turns (a rod: I = m L² / 12)
    const ca = Math.cos(p.a), sa = Math.sin(p.a);
    const lever = clamp((hx - p.x) * ca + (hy - p.y) * sa, -it.L / 2, it.L / 2);
    const jperp = -jx * sa + jy * ca;
    s.va = clamp(s.va + (lever * jperp) / (m * it.L * it.L / 12) * 0.9, -SHOVE.maxSpin, SHOVE.maxSpin);
    if (strong && !s.cracked) {
      if (it.empty) { s.cracked = true; s.ct = 0; s.vx *= 0.25; s.vy *= 0.25; s.va = (s.va >= 0 ? 1 : -1) * 0.8; return { type: 'crack', x: p.x, y: p.y, z: p.z, it }; } // (the glass gives: the halves barely travel)
      s.va += (Math.random() < 0.5 ? -1 : 1) * (4 + 3 * Math.random()); // a live one tumbles
      return { type: 'tumble', x: p.x, y: p.y, z: p.z, it };
    }
    return null;
  }
  if (kind === 'clump') {
    const s = wake(W, kind, it, W.dynOf(it, ox, oy, mkClump));
    if (s.cr >= 0) return null;
    const m = 2.2 * (it.r / 30) ** 2;
    s.vx = clamp(s.vx + jx / m * 0.6, -200, 200); s.vy = clamp(s.vy + jy / m * 0.6, -200, 200);
    if (it.colony) return null; // held together by the Vorticella colony on it: it only wobbles
    s.dmg += k;
    if (s.dmg >= it.r / CRUMBLE.per) { s.cr = 0; return { type: 'crumble', x: it.x + ox + s.x, y: it.y + oy + s.y, z: it.z, r: it.r, it }; }
    return null;
  }
  if (kind === 'filament') {
    const s = wake(W, kind, it, W.dynOf(it, ox, oy, mkFil));
    const ax = it.x0 + ox, ay = it.y0 + oy, dx = (it.x1 - it.x0) / it.L, dy = (it.y1 - it.y0) / it.L;
    const u = clamp((hx - ax) * dx + (hy - ay) * dy, 0, it.L);
    const jp = -jx * dy + jy * dx; // across the filament (+: to its left)
    let b = s.b.find((q) => Math.abs(q.u - u) < 90);
    if (!b) { if (s.b.length >= 4) s.b.shift(); b = { u, d: 0, v: 0 }; s.b.push(b); }
    b.v += jp / BEND.m;
    return null;
  }
  if (kind === 'floc') {
    const s = wake(W, kind, it, W.dynOf(it, ox, oy, mkFloc));
    const m = 0.35 + it.r / 30;
    s.vx = clamp(s.vx + jx / m, -SHOVE.maxV, SHOVE.maxV); s.vy = clamp(s.vy + jy / m, -SHOVE.maxV, SHOVE.maxV);
    s.sp = Math.min(1, s.sp + (strong ? 0.8 : 0.25 * k));
    return null;
  }
  if (kind === 'vort') {
    const r = W.snapVort(it, k);
    const p = W.vortPose(it, ox, oy, t);
    if (!r) return null;
    // struck open, feeding: the clump of bacteria at its mouth is knocked loose (one every so often)
    if (!(r.st.spit > 0) && (k >= 0.6 || dash)) { r.st.spit = 14; return { type: 'spit', x: p.x1 + Math.cos(p.a) * 26, y: p.y1 + Math.sin(p.a) * 26, z: p.z1, a: p.a, it }; }
    return { type: 'snap', x: p.x1, y: p.y1, z: p.z1, it };
  }
  return null;
}

/**
 * Advance the waves by dt: each front runs out, and what it reaches (once each) is shoved along it.
 * Returns the events (shove's, plus { type: 'push' } for the ones that only moved), each with the
 * jabbing player's slot.
 */
export function stepWaves(W, waves, dt, t) {
  const ev = [];
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    w.t += dt; w.r = waveFront(w);
    if (waveDone(w)) { waves.splice(i, 1); continue; }
    if (w.t > WAVE.dur + 0.02) continue;
    const R = w.r + 30, x0 = w.x - R, y0 = w.y - R, x1 = w.x + R, y1 = w.y + R;
    const opts = { strong: w.strong, t };
    const hitOnce = (key) => { if (w.hit.has(key)) return false; w.hit.add(key); return true; };
    const go = (ref, key, x, y, z, rad, mass = 1) => {
      const f = waveAt(w, x, y, z, rad);
      if (!f || !hitOnce(key)) return;
      const [ux, uy] = dirAt(w, x, y), J = SHOVE.j * f * mass;
      // struck where the front met it: its point nearest the wave's origin
      const d = hyp(x - w.x, y - w.y) || 1, hx = x - (x - w.x) / d * rad, hy = y - (y - w.y) / d * rad;
      const e = shove(W, ref, ux * J, uy * J, hx, hy, f, opts) || { type: 'push', kind: ref.kind, x, y, z, it: ref.it };
      e.slot = w.slot;
      ev.push(e);
    };
    W.eachIn(W.diatoms, x0, y0, x1, y1, (d, ox, oy) => {
      if (W.vis(d, ox, oy) < 0.5) return;
      const p = W.diatomPose(d, ox, oy, t);
      if (p.s && p.s.gone) return;
      go({ kind: 'diatom', it: d, ox, oy }, `d${d.id}:${ox},${oy}`, p.x, p.y, p.z, d.L * 0.35);
    });
    W.eachIn(W.clumps, x0, y0, x1, y1, (c, ox, oy) => {
      if (W.vis(c, ox, oy) < 0.5) return;
      const p = W.clumpPose(c, ox, oy);
      if (p.cr >= 0) return;
      go({ kind: 'clump', it: c, ox, oy }, `c${c.id}:${ox},${oy}`, p.x, p.y, c.z, c.r * 0.8);
    });
    W.eachIn(W.flocs, x0, y0, x1, y1, (f, ox, oy) => {
      if (W.vis(f, ox, oy) < 0.5) return;
      const p = W.flocPose(f, ox, oy);
      if (p.gone) return;
      go({ kind: 'floc', it: f, ox, oy }, `f${f.id}:${ox},${oy}`, p.x, p.y, f.z, f.r);
    });
    W.eachIn(W.vorticella, x0, y0, x1, y1, (v, ox, oy) => {
      if (W.vis(v, ox, oy) < 0.5) return;
      const p = W.vortPose(v, ox, oy, t);
      // the bell, or anywhere along the stalk (nearest the wave's origin)
      const sx = p.x1 - p.x0, sy = p.y1 - p.y0, L2 = sx * sx + sy * sy || 1;
      const q = clamp(((w.x - p.x0) * sx + (w.y - p.y0) * sy) / L2, 0.3, 1);
      go({ kind: 'vort', it: v, ox, oy }, `v${v.id}`, p.x0 + sx * q, p.y0 + sy * q, p.z0 + (p.z1 - p.z0) * q, v.bell);
    });
    W.eachIn(W.filaments, x0, y0, x1, y1, (f, ox, oy) => {
      if (W.vis(f, ox, oy) < 0.5) return;
      // its point nearest the wave's origin
      const ax = f.x0 + ox, ay = f.y0 + oy, dx = (f.x1 - f.x0) / f.L, dy = (f.y1 - f.y0) / f.L;
      const u = clamp((w.x - ax) * dx + (w.y - ay) * dy, 0, f.L);
      const z = f.z0 + (f.z1 - f.z0) * (u / f.L);
      go({ kind: 'filament', it: f, ox, oy }, `s${f.id}:${ox},${oy}`, ax + dx * u, ay + dy * u, z, f.r);
    });
  }
  return ev;
}

/**
 * The body shoving what it swims through: each contact the swim reported (swim.js contacts, their
 * obstacle's ref) pushes that thing away from the body, harder the faster it goes; a dash into a
 * clump knocks it about (and a small one crumbles); bumping a stalk snaps its bell shut.
 */
export function bodyShove(W, S, dt, t) {
  const ev = [];
  const sp = Math.abs(S.v), dash = S.dashT > 0;
  const seen = new Set();
  for (const c of S.contacts) {
    const ref = c.o && c.o.ref;
    if (!ref || seen.has(c.o)) continue;
    seen.add(c.o);
    // from the body's middle to where it touches: the thing is pushed that way, away from the body
    const nx = c.x - S.x, ny = c.y - S.y, l = hyp(nx, ny) || 1;
    const J = (60 + sp * 0.9) * dt * 2.5;
    if (ref.kind === 'vort') { const r = W.snapVort(ref.it, 0.5); if (r) ev.push({ type: 'snap', x: c.x, y: c.y, z: c.z, it: ref.it }); continue; }
    if (ref.kind === 'clump' && dash) {
      const s = W.dynOf(ref.it, ref.ox, ref.oy, mkClump);
      if (s.dashT > t) continue; // (once a dash)
      s.dashT = t + 0.3;
      const e = shove(W, ref, (nx / l) * J * 8, (ny / l) * J * 8, c.x, c.y, CRUMBLE.dash, { t, dash: true });
      if (e) ev.push(e);
      continue;
    }
    const e = shove(W, ref, (nx / l) * J, (ny / l) * J, c.x, c.y, 0, { t });
    if (e) ev.push(e);
  }
  // flocs are not obstacles: the body sweeps them along as it passes
  const R = LENGTH * 0.6;
  W.eachIn(W.flocs, S.x - R, S.y - R, S.x + R, S.y + R, (f, ox, oy) => {
    if (Math.abs(f.z - S.z) > 40 || W.vis(f, ox, oy) < 0.5) return;
    const p = W.flocPose(f, ox, oy);
    const dx = p.x - S.x, dy = p.y - S.y, d = hyp(dx, dy);
    if (d > R + f.r || p.gone) return;
    const k = (1 - d / (R + f.r)) * dt * 5;
    shove(W, { kind: 'floc', it: f, ox, oy }, (S.vx * 0.5 + dx / (d || 1) * 80) * k, (S.vy * 0.5 + dy / (d || 1) * 80) * k, p.x, p.y, 0, { t });
  }, 200);
  return ev;
}

/**
 * The bladderwort's pulse: the light things (diatoms, flocs) within reach of (x, y) are dragged toward it
 * (speed µm/s at the door, less further out); those drawn right in are gone (swallowed). Returns how many.
 */
export function pullTo(W, x, y, z, reach, speed, dt, t = 0, swallow = 60) {
  let n = 0;
  const x0 = x - reach, y0 = y - reach, x1 = x + reach, y1 = y + reach;
  W.eachIn(W.diatoms, x0, y0, x1, y1, (d, ox, oy) => {
    if (W.vis(d, ox, oy) < 0.5) return;
    const p = W.diatomPose(d, ox, oy, t), dx = x - p.x, dy = y - p.y, dist = hyp(dx, dy);
    if (dist > reach || Math.abs(p.z - z) > 160) return;
    const s = wake(W, 'diatom', d, W.dynOf(d, ox, oy, mkDiatom));
    if (s.gone) return;
    if (dist < swallow) { s.gone = true; n++; return; }
    const k = speed * (1 - dist / reach) ** 0.7 / Math.max(1, d.m * 0.5);
    s.x += dx / dist * k * dt; s.y += dy / dist * k * dt;
  });
  W.eachIn(W.flocs, x0, y0, x1, y1, (f, ox, oy) => {
    if (W.vis(f, ox, oy) < 0.5) return;
    const p = W.flocPose(f, ox, oy), dx = x - p.x, dy = y - p.y, dist = hyp(dx, dy);
    if (dist > reach || p.gone || Math.abs(f.z - z) > 160) return;
    const s = wake(W, 'floc', f, W.dynOf(f, ox, oy, mkFloc));
    if (dist < swallow) { s.gone = true; n++; return; }
    const k = speed * (1 - dist / reach) ** 0.7;
    s.x += dx / dist * k * dt; s.y += dy / dist * k * dt;
  }, 200);
  return n;
}

/** Step every moving state: shoves die away (no coasting at this size), bends spring back, crumbs settle. */
export function stepStir(W, dt) {
  const dk = Math.exp(-dt / SHOVE.drag), sk = Math.exp(-dt / SHOVE.spinDrag);
  for (const s of W.active) {
    let still = true;
    if (s.kind === 'diatom') {
      s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt;
      s.vx *= dk; s.vy *= dk; s.va *= sk;
      if (s.cracked && s.ct < 3) { s.ct += dt; still = false; }
      if (hyp(s.vx, s.vy) > 2 || Math.abs(s.va) > 0.03) still = false; else { s.vx = s.vy = s.va = 0; }
    } else if (s.kind === 'clump') {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= dk; s.vy *= dk;
      if (s.cr >= 0 && s.cr < 4) { s.cr += dt; still = false; }
      if (hyp(s.vx, s.vy) > 2) still = false; else s.vx = s.vy = 0;
    } else if (s.kind === 'floc') {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= dk; s.vy *= dk;
      if (hyp(s.vx, s.vy) > 2) still = false; else s.vx = s.vy = 0;
    } else if (s.kind === 'filament') {
      const w = BEND.w;
      for (let i = s.b.length - 1; i >= 0; i--) {
        const b = s.b[i];
        b.v += (-w * w * b.d - 2 * BEND.zeta * w * b.v) * dt;
        b.d = clamp(b.d + b.v * dt, -BEND.max, BEND.max);
        if (Math.abs(b.d) < 0.2 && Math.abs(b.v) < 1) s.b.splice(i, 1);
      }
      if (s.b.length) still = false;
    }
    if (still) W.active.delete(s);
  }
}

/** The tile copy's offsets nearest (x, y) for an item at tile-local (ix, iy). */
export const copyNear = (ix, iy, x, y) => [Math.round((x - ix) / TILE) * TILE, Math.round((y - iy) / TILE) * TILE];

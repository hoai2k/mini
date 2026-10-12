// Holds that monsters and bosses put on heroes:
//   stone  Medusa's gaze: the hero turns grey and can't move or act.
//   root   a spider net: the hero can't move but can still fight.
//   grab   Procrustes straps a hero to a bed: can't move or act; mashing
//          attack / dodge / jump breaks free, and so does a teammate's hit
//          on the captor (the captor calls releaseHero).
// and poison (pit scorpion, snake bites): damage over time in green.
// A hold lives in a game updater; a timer is the backstop in case the level
// is cleared while a hero is held. Remote heroes (online guests) are skipped:
// their own browser runs them.
import * as THREE from 'three/webgpu';

let stoneMat = null, netMat = null;
function stone() {
  stoneMat ??= new THREE.MeshStandardNodeMaterial({ color: 0x9a968e, roughness: 0.95, metalness: 0 });
  return stoneMat;
}
function net() {
  netMat ??= new THREE.MeshStandardNodeMaterial({ color: 0xf4f0e8, roughness: 0.6, transparent: true, opacity: 0.75, emissive: 0xc8d8ff, emissiveIntensity: 0.35 });
  return netMat;
}
const netGeo = new THREE.BoxGeometry(1, 1, 1);

export const isHeld = (p) => !!p?.hold;

// Hold a hero. o: { kind: 'stone'|'root'|'grab', dur, by (source), anchor
// (Vector3 or () => Vector3), mash (presses to break free), dps, onRelease(p, why) }
export function holdHero(g, p, o = {}) {
  if (!p || p.dead || p.downed || p.remote || p.hold) return false;
  const kind = o.kind ?? 'root';
  const h = { kind, t: 0, dur: o.dur ?? 2, by: o.by ?? null, anchor: o.anchor ?? p.pos.clone(), mash: 0, need: o.mash ?? 9, dps: o.dps ?? 0, onRelease: o.onRelease, tickT: 0, prop: null };
  p.hold = h;
  if (kind !== 'root') { h.lockWas = !!p.minigameLock; p.minigameLock = true; }
  p.vel?.set(0, p.vel.y, 0); p.knock?.set(0, 0, 0);
  if (kind === 'stone') {
    p.rig?.swap(stone());
    g.particles?.burst(p.pos.clone().setY(p.pos.y + 1), { count: 24, color: 0xb8b4aa, additive: false, speed: 2.5, life: 0.7, size: 0.3, sizeEnd: 0.8, drag: 3 });
    g.audio?.noise?.({ dur: 0.4, gain: 0.18, type: 'lowpass', freq: 900 });
  }
  if (kind === 'root') {
    const m = new THREE.Mesh(netGeo, net()); m.scale.set(1.3, 1.1, 1.3); m.position.copy(p.pos).setY(p.pos.y + 0.5);
    g.scene.add(m); h.prop = m;
  }
  if (kind === 'grab') p.action = { type: 'down', t: 1, dur: 1e6, elapsed: 0, held: true };
  const safety = setTimeout(() => { if (p.hold === h) releaseHero(g, p, 'timeout'); }, (h.dur + 4) * 1000);
  g.addUpdater((dt) => {
    if (p.hold !== h) { clearTimeout(safety); return false; }
    h.t += dt;
    if (p.dead || p.downed) { releaseHero(g, p, 'down'); return false; }
    const a = typeof h.anchor === 'function' ? h.anchor() : h.anchor;
    if (a) { p.pos.x = a.x; p.pos.z = a.z; if (kind === 'grab') p.pos.y = a.y; }
    p.vel?.set(0, kind === 'grab' ? 0 : p.vel.y, 0);
    // a locked hero skips its own update, so clear the hit flash here
    if (kind === 'grab' && p.hurtT > 0) { p.hurtT -= dt; if (p.hurtT <= 0) p.rig?.swap(null); }
    if (kind === 'stone') { p.rig?.swap(stone()); if (Math.random() < dt * 6) g.particles?.burst(p.pos.clone().setY(p.pos.y + 0.4 + Math.random() * 1.4), { count: 1, color: 0x8a867e, additive: false, speed: 0.4, life: 0.6, size: 0.12, gravity: 4 }); }
    if (kind === 'root' && h.prop) { h.prop.position.set(p.pos.x, p.pos.y + 0.5, p.pos.z); h.prop.rotation.y += dt * 0.5; }
    if (kind === 'grab') {
      // mash to break free; AI companions struggle on their own
      const inp = p.ai ? null : p.input?.();
      if (inp && (inp.pressed?.attack || inp.pressed?.dodge || inp.pressed?.jump || inp.pressed?.ranged)) { h.mash++; g.fx?.damageNumber?.(p.pos, 0, { color: '#ffd84a', text: '!' }); }
      if (p.ai) h.mash += dt * 2.2;
      if (h.mash >= h.need) { releaseHero(g, p, 'mash'); return false; }
    }
    if (h.dps > 0) {
      h.tickT -= dt;
      if (h.tickT <= 0) { h.tickT = 0.5; p.takeDamage(h.dps * 0.5, h.by, { dot: true, noKnock: true }); }
    }
    if (h.t >= h.dur) { releaseHero(g, p, 'time'); return false; }
    return true;
  });
  return true;
}

export function releaseHero(g, p, why = 'freed') {
  const h = p?.hold; if (!h) return;
  p.hold = null;
  if (h.kind !== 'root') p.minigameLock = h.lockWas ?? false;
  if (h.kind === 'grab' && p.action?.held) p.action = null;
  if (h.kind === 'grab' || h.kind === 'stone') p.iframes = Math.max(p.iframes ?? 0, 0.6);
  p.rig?.swap(null);
  if (h.prop) { g.scene.remove(h.prop); h.prop = null; }
  if (h.kind === 'stone') g.particles?.burst(p.pos.clone().setY(p.pos.y + 1), { count: 30, color: 0x9a968e, additive: false, speed: 4, life: 0.6, size: 0.2, gravity: 10 });
  if (h.kind === 'root') g.particles?.burst(p.pos.clone().setY(p.pos.y + 0.6), { count: 16, color: 0xf4f0e8, additive: false, speed: 3, life: 0.5, size: 0.15, gravity: 6 });
  h.onRelease?.(p, why);
}
// Let go of every hero a source holds (its death, a phase change).
export function releaseAllBy(g, by) {
  for (const p of g.hostileTargets?.() ?? g.players ?? []) if (p.hold && p.hold.by === by) releaseHero(g, p, 'source');
}

// Poison: dps for dur seconds, refreshed (not stacked) by new bites.
export function poisonHero(g, p, dps, dur, src = null) {
  if (!p || p.dead || p.remote) return;
  if (p.poison) { const P = p.poison; P.dur = Math.max(P.dur - P.t, dur); P.t = 0; P.dps = Math.max(P.dps, dps); return; }
  const P = p.poison = { t: 0, dur, dps, tick: 0.5 };
  g.addUpdater((dt) => {
    if (p.poison !== P || p.dead) { if (p.poison === P) p.poison = null; return false; }
    P.t += dt; P.tick -= dt;
    if (P.tick <= 0) {
      P.tick = 0.5;
      if (!p.downed) p.takeDamage(P.dps * 0.5, src, { dot: true, noKnock: true });
      g.particles?.burst(p.pos.clone().setY(p.pos.y + 1), { count: 4, color: 0x8aff3a, speed: 1.2, up: 1.2, life: 0.5, size: 0.12 });
    }
    if (P.t >= P.dur || p.downed) { p.poison = null; return false; }
    return true;
  });
}

// The shared monster animation: animateExtras poses whatever extras a model
// carries (wings, whip, tails, snakes, swaying parts, live flames, breath)
// every frame, for monsters, champions and bosses alike.
import { tickFlames } from '../flames.js';
import { whipPose } from './whip.js';

export function animateExtras(rig, dt, e) {
  const t = rig.t ?? 0;
  const W = rig.extras.wings;
  if (W) {
    const fast = e?.state === 'windup' || e?.swooping ? 2 : 1;
    const S = rig.wingStroke;
    if (S) {
      // A natural stroke (rig.wingStroke { base, amp, hand, down }): a quick
      // powered down-stroke with the hand spread, then a slower up-stroke with
      // the hand trailing low and swept back, so the wings read as a V or W
      // from above and never fold up into a fan over the back.
      rig.wingPh = ((rig.wingPh ?? (t * 0.37) % 1) + (dt || 0) * 9 * fast * (rig.wingFlap ?? 1) / (2 * Math.PI)) % 1;
      const p = rig.wingPh, d = S.down ?? 0.4, dn = p < d, q = dn ? p / d : (p - d) / (1 - d);
      const s = dn ? Math.cos(Math.PI * q) : -Math.cos(Math.PI * q), v = dn ? -Math.sin(Math.PI * q) : Math.sin(Math.PI * q);
      const hand = dn ? -v * 0.12 : -v * (S.hand ?? 0.45);
      for (const w of W) {
        w.ry ??= w.root.rotation.y;
        w.root.rotation.z = w.side * ((S.base ?? 0.45) + s * (S.amp ?? 0.4));
        w.root.rotation.y = w.ry + w.side * Math.max(0, v) * 0.18;
        w.elbow.rotation.z = w.side * ((S.h0 ?? 0) + hand);
      }
    } else {
      const f = Math.sin(t * 9 * fast * (rig.wingFlap ?? 1));
      for (const w of W) { w.root.rotation.z = w.side * (0.25 + f * 0.55); w.elbow.rotation.z = w.side * (0.1 + Math.max(0, f) * 0.5); }
    }
  }
  if (rig.whip) whipPose(rig, dt, e);
  const T = rig.extras.tails;
  if (T) for (const tail of T) for (let i = 0; i < tail.segs.length; i++) tail.segs[i].rotation.y = Math.sin(t * 3 + i * 0.8 + tail.ph) * 0.35;
  const S = rig.extras.snakes;
  if (S) {
    const rear = e?.gazeT > 0 || e?.state === 'windup' ? 1 : 0;
    for (const s of S) for (let i = 0; i < s.segs.length; i++) {
      s.segs[i].rotation.x = Math.sin(t * s.speed + i * 0.9 + s.ph) * s.amp - rear * 0.12;
      s.segs[i].rotation.z = Math.cos(t * s.speed * 0.8 + i * 0.7 + s.ph) * s.amp * 0.8;
    }
  }
  const Y = rig.extras.sway;
  if (Y) for (const s of Y) s.g.rotation[s.ax] = s.base + Math.sin(t * s.f + s.ph) * s.amp;
  if (rig.extras.flameHair) { const k = 1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 7.3) * 0.03; rig.extras.flameHair.scale.set(1, k, 1); }
  if (rig.flames) tickFlames(rig, dt, e);   // live voxel flames (flames.js), after the pose and the whip
  if (rig.extras.key) rig.extras.key.rotation.y += dt * 4;
  if (rig.extras.tongue) rig.extras.tongue.scale.z = Math.sin(t * 7) > 0.55 ? 1 : 0.15;   // the serpent tastes the air
  const B = rig.extras.breath;   // the hellhound's smoking breath: puffs roll out of the jaws, swell and rise
  if (B) for (let i = 0; i < B.length; i++) {
    const p = B[i], k = (t * 0.45 + i / B.length) % 1, s = Math.sin(k * Math.PI), o = p.userData.base;
    p.position.set(o.x + Math.sin(t * 1.3 + i * 2) * 0.05, o.y + k * 0.55, o.z + k * 0.6);
    p.scale.setScalar(0.3 + s * (0.5 + k)); p.visible = s > 0.1;
  }
}

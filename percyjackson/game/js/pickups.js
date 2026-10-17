// Pickups dropped by monsters, chests and crates: drachmas, health orbs,
// Power orbs and ammo bundles (a sheaf of arrows that tops up the quiver,
// resources.js). They pop out, bounce, then magnet to the nearest hero who
// can use them.
import * as THREE from 'three/webgpu';
import { addBundle, wantsBundle, QUIVER } from './resources.js';
import { t } from './text_config.js';

const KINDS = {
  coin: { color: 0xffc83a, emissive: 1.5, size: 0.22, geo: 'oct' },
  heal: { color: 0x5aff8a, emissive: 2.5, size: 0.28, geo: 'box' },
  ce: { color: 0x4ac8ff, emissive: 2.5, size: 0.24, geo: 'oct' },
  arrows: { color: 0xffe0a0, emissive: 0, size: 1.7, geo: 'bundle' },
};

// A bundle of three arrows tied with a red band: bronze heads, white fletching
// (the geometry and materials are shared by every bundle).
let BUNDLE = null;
function arrowBundle() {
  if (!BUNDLE) {
    const mat = (c, e = 0.35) => new THREE.MeshStandardNodeMaterial({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.6 });
    BUNDLE = { shaft: mat(0xd8a860, 0.7), head: mat(0xffc24a, 1.6), fl: mat(0xffffff, 1.0), band: mat(0xe8402a, 0.9),
      sg: new THREE.BoxGeometry(0.06, 0.78, 0.06), hg: new THREE.ConeGeometry(0.07, 0.16, 4), fg: new THREE.BoxGeometry(0.16, 0.16, 0.02), bg: new THREE.BoxGeometry(0.24, 0.07, 0.12) };
  }
  const B = BUNDLE, g = new THREE.Group();
  for (let i = -1; i <= 1; i++) {
    const a = new THREE.Group(); a.rotation.z = i * 0.16; a.position.x = i * 0.05;
    const s = new THREE.Mesh(B.sg, B.shaft), h = new THREE.Mesh(B.hg, B.head), f = new THREE.Mesh(B.fg, B.fl);
    h.position.y = 0.46; f.position.y = -0.3;
    a.add(s, h, f); g.add(a);
  }
  g.add(new THREE.Mesh(B.bg, B.band));
  g.rotation.z = 0.5;
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

export class Pickups {
  constructor(game) {
    this.game = game; this.list = [];
    this.geos = { oct: new THREE.OctahedronGeometry(1, 0), box: new THREE.BoxGeometry(1.4, 1.4, 1.4) };
    this.mats = {};
    for (const k in KINDS) this.mats[k] = new THREE.MeshStandardNodeMaterial({ color: KINDS[k].color, emissive: KINDS[k].color, emissiveIntensity: KINDS[k].emissive, roughness: 0.3, metalness: 0.6 });
  }
  drop(kind, pos, n = 1, value = 1) {
    for (let i = 0; i < n; i++) {
      const K = KINDS[kind];
      const m = K.geo === 'bundle' ? arrowBundle() : new THREE.Mesh(this.geos[K.geo], this.mats[kind]);
      m.scale.setScalar(K.size); m.castShadow = true;
      m.position.copy(pos).add(new THREE.Vector3(0, 0.8, 0));
      this.game.scene.add(m);
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3;
      this.list.push({ kind, mesh: m, pos: m.position, vel: new THREE.Vector3(Math.cos(a) * sp, 5 + Math.random() * 3, Math.sin(a) * sp), t: 0, value });
    }
  }
  update(dt) {
    if (!dt) return;
    const g = this.game, w = g.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      // nearest living player
      let best = null, bd = 3.8;
      for (const pl of g.players) {
        if (pl.dead || pl.downed) continue;
        // a bundle goes to the nearest hero on this screen whose quiver isn't full
        if (p.kind === 'arrows' && (pl.remote || !wantsBundle(pl.quiver))) continue;
        const d = pl.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = pl; }
      }
      if (best && p.t > 0.45 && (p.kind === 'coin' || (p.kind === 'heal' && best.hp < best.maxHp) || p.kind === 'ce' || p.kind === 'arrows')) {
        const to = best.pos.clone().setY(best.pos.y + 1).sub(p.pos);
        const d = to.length();
        p.vel.lerp(to.normalize().multiplyScalar(14), Math.min(1, dt * 10));
        if (d < 0.6) { this.collect(p, best); this.list.splice(i, 1); continue; }
      } else {
        p.vel.y -= 20 * dt;
        const gy = w.groundBelow(p.pos.x, p.pos.z, p.pos.y + 0.5);
        if (isFinite(gy) && p.pos.y + p.vel.y * dt < gy + 0.25) { p.pos.y = gy + 0.25; p.vel.y *= -0.4; p.vel.x *= 0.7; p.vel.z *= 0.7; }
      }
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.rotation.y += dt * 3; if (p.kind !== 'arrows') p.mesh.rotation.x += dt;
      if (p.t > (p.kind === 'arrows' ? 60 : 40) || p.pos.y < -20) { g.scene.remove(p.mesh); this.list.splice(i, 1); }
    }
  }
  collect(p, pl) {
    const g = this.game;
    g.scene.remove(p.mesh);
    if (p.kind === 'coin') { g.addCoins(Math.round(p.value * (1 + (pl.stats?.luck ?? 0))), pl); /* net: (pl) to whoever picked them up */ g.audio?.coin(); }
    else if (p.kind === 'heal') { pl.heal(pl.maxHp * 0.12); g.audio?.energy('heal'); }
    else if (p.kind === 'ce') { pl.gainCE(8); g.audio?.tone({ freq: 1200, to: 1800, dur: 0.1, gain: 0.05, type: 'sine' }); }
    else if (p.kind === 'arrows') {
      const n = addBundle(pl.quiver, p.value > 1 ? p.value : QUIVER.bundle);
      g.fx.damageNumber(pl.pos, n, { color: '#ffe0a0', text: t('pickups.ammoGain', { n }) });
      g.audio?.tone({ freq: 660, to: 990, dur: 0.07, gain: 0.06, type: 'triangle' }); g.audio?.tone({ freq: 990, to: 1320, dur: 0.08, gain: 0.05, type: 'triangle', at: 0.06 });
    }
    g.particles.burst(p.pos, { count: 6, color: KINDS[p.kind].color, speed: 2, life: 0.3, size: 0.12, shape: 1 });
  }
  clear() { for (const p of this.list) this.game.scene.remove(p.mesh); this.list = []; }
}

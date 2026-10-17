// Percy Jackson, son of Poseidon — Riptide and the sea.
//   LMB  Riptide combo: four celestial-bronze cuts, the last a wide slash
//        that throws up a ring of seawater.
//   RMB  Water Jet: a fast, pressurised jet of water.
//   1    Wave Surge: a cone of water that knocks monsters flat.
//   2    Healing Tide: a pool of seawater that heals heroes standing in it.
//        Percy hits harder while he stands in water (pool or real water) and
//        heals slowly in real water.
//   3    Riptide Throw: the sword spins out in a line and returns to his hand.
//   Learned in the skill tree (any power can go in any of 1 · 2 · 3):
//        Disarming Strike: a lunging thrust that stuns (a boss is marked).
//        Geyser: water bursts from the ground at the aim point, launching monsters.
//        Air Bubble: Percy and the heroes near him take half damage for a while.
//   F    Hurricane: a whirlpool storm around Percy pulls monsters in and
//        batters them.
import * as THREE from 'three/webgpu';
import { uniform, uv, vec3, vec4, float, sin, smoothstep, mix } from 'three/tsl';
import { Kit, makeDisc, zap, stun, mark } from './kit.js';
import { registerKit } from './index.js';
import { buildRiptide } from '../entities/models.js';
import { U } from '../gfx/materials.js';

const SEA = 0x2fd0d8, DEEP = 0x0f6f73, FOAM = 0xc8f6ff, BRONZE = 0xe8b850;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// The skill tree (and the new powers' numbers) is in skillRules.js.

// Swirling water funnel for Hurricane: an open cone with spiralling bands.
function funnelMesh() {
  const alpha = uniform(0);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const u = uv();
  const bands = sin(u.x.mul(6.283 * 7).add(u.y.mul(9)).sub(U.time.mul(9))).mul(0.5).add(0.5);
  const fine = sin(u.x.mul(6.283 * 19).sub(u.y.mul(14)).sub(U.time.mul(13))).mul(0.5).add(0.5);
  const a = bands.pow(3).mul(0.55).add(fine.pow(6).mul(0.35)).mul(smoothstep(0.0, 0.25, u.y)).mul(smoothstep(1.0, 0.7, u.y)).mul(alpha);
  m.colorNode = vec4(mix(vec3(0.03, 0.4, 0.48), vec3(0.6, 0.95, 1.0), fine).mul(a).mul(1.2), a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.35, 1, 32, 1, true).translate(0, 0.5, 0), m);
  mesh.renderOrder = 22; mesh.frustumCulled = false; mesh.userData.alpha = alpha;
  return mesh;
}

class PercyKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 12, range: 2.8, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.14, trail: BRONZE, sparkColor: 0xffe0a0 },
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 13, range: 2.8, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.05, shake: 0.16, trail: BRONZE, sparkColor: 0xffe0a0 },
      { style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 15, range: 3.1, arc: 0.8, lunge: 8, knock: 5, stop: 0.055, shake: 0.18, trail: SEA, sparkColor: FOAM },
      { style: 'spin', dur: 0.5, windup: 0.3, strike: 0.56, dmg: 25, range: 3.4, arc: Math.PI, lunge: 3, knock: 10, stop: 0.08, shake: 0.38, ring: true, ringColor: SEA, stagger: 0.55, trail: SEA, sparkColor: FOAM, splash: true },
    ];
    this.p.stats.meleeMult += r('riptide') * 0.08;
    const jc = 1 + r('jet_charges');
    this.slots = {
      ranged: this.ability({ name: 'Water Jet', icon: '💧', cd: 0.55, ce: 0, use: () => this.jet(), maxCharges: jc, chargesLeft: jc, gateTime: 0.3 }),
      ...this.equipSlots({
        surge: this.ability({ name: 'Wave Surge', icon: '🌊', cd: 6, ce: 12, use: () => this.surge() }),
        tide: this.ability({ name: 'Healing Tide', icon: '💦', cd: 15, ce: 16, use: () => this.tide() }),
        throw: this.ability({ name: 'Riptide Throw', icon: '🗡️', cd: 7, ce: 14, use: () => this.throwSword() }),
        disarm: this.ability({ name: 'Disarming Strike', icon: '⚔️', cd: 8, ce: 12, use: () => this.disarm() }),
        geyser: this.ability({ name: 'Geyser', icon: '⛲', cd: 9, ce: 14, use: () => this.geyser() }),
        bubble: this.ability({ name: 'Air Bubble', icon: '🫧', cd: 18, ce: 16, use: () => this.bubble() }),
      }),
    };
    this.domain = {
      name: 'Hurricane', icon: '🌀', key: 'hurricane', world: false, sureHit: false, type: 0, color: SEA, sound: 'garden', flash: 0x9af4ff,
      duration: 6 + r('hurricane') * 2, radius: 9,
      onStart: (g, d) => this.hurricaneStart(g, d),
      onTick: (g, d, dt) => this.hurricaneTick(g, d, dt),
      onEnd: (g, d) => this.hurricaneEnd(g, d),
    };
    this.pools = [];
    this.waterT = 0; this.healAcc = 0;
  }
  // ---------------------------------------------------------------- water
  inWater() {
    const p = this.p;
    if (p.inLiquid === 'water') return true;
    for (const pl of this.pools) if (Math.hypot(p.pos.x - pl.c.x, p.pos.z - pl.c.z) < pl.R && Math.abs(p.pos.y - pl.c.y) < 1.5) return true;
    return false;
  }
  outgoing() { return this.wet ? 1.25 + this.rank('sea') * 0.1 : 1; }
  tick(dt) {
    const p = this.p, g = this.game;
    this.wet = this.inWater();
    if (this.wet) {
      // sea-green shimmer while empowered by water
      if (Math.random() < dt * 14) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 1.8, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 1, 0, 0.6, 0.3, 1.6, 1.8, 0.12, 0, 1, 0.2, 1);
      if (p.inLiquid === 'water' && p.hp < p.maxHp && !p.dead && !p.downed) {
        this.healAcc += dt * (2 + this.rank('sea') * 1.5);
        if (this.healAcc >= 1) { const n = Math.floor(this.healAcc); this.healAcc -= n; p.heal(n, true); }
      }
    }
    p.heroLight.color.setRGB(this.wet ? 0.6 : 1, this.wet ? 1 : 0.92, this.wet ? 1 : 0.82);
  }
  onStrike(step) {
    if (!step.splash) return;
    const g = this.game, p = this.p;
    // the wide last slash flings a ring of seawater
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2, r = 0.8;
      g.particles.glow.emit(p.pos.x + Math.cos(a) * r, p.pos.y + 0.8, p.pos.z + Math.sin(a) * r, Math.cos(a) * 7, 3 + Math.random() * 2, Math.sin(a) * 7, 0.6, 0.6, 1.8, 2, 0.16, 14, 1.2, 0.08, 1);
    }
    g.fx.splash(p.pos, 2.5);
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: FOAM, r0: 0.6, r1: 4, dur: 0.45, thick: 0.18 });
    g.audio?.noise({ dur: 0.35, gain: 0.25, type: 'bandpass', freq: 1200, sweep: 300, q: 0.8 });
  }
  // ---------------------------------------------------------------- Water Jet
  jet() {
    const g = this.game, p = this.p;
    this.cast(0.26);
    const from = this.handPos();
    const dmg = 10 + this.rank('jet') * 3;
    const pr = g.projectiles.fire({ pos: from, vel: p.aimDir.clone().multiplyScalar(30), team: 'player', dmg, shape: 'arrow', color: SEA, emissive: 2.2, life: 0.55, radius: 0.5, scale: 0.9, light: 3,
      trail: (q) => {
        for (let i = 0; i < 2; i++) g.particles.glow.emit(q.pos.x + (Math.random() - 0.5) * 0.2, q.pos.y + (Math.random() - 0.5) * 0.2, q.pos.z + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2, 0.4, 0.6, 1.8, 2.2, 0.12, 10, 1, 0.05, 1);
      },
      onHit: (e, q) => { g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setLength(4.5), stagger: 0.25 }); g.fx.splash(q.pos, 1.5); g.fx.hitSpark(q.pos, null, { color: FOAM }); },
      onExpire: (q, why) => { if (why === 'wall' || why === 'expire') g.fx.splash(q.pos, 1); } });
    if (!pr) return false;
    g.audio?.noise({ dur: 0.18, gain: 0.22, type: 'bandpass', freq: 2200, sweep: 900, q: 1.2 });
  }
  // ---------------------------------------------------------------- Wave Surge
  surge() {
    const g = this.game, p = this.p, rk = this.rank('surge_up');
    this.cast(0.45, true);
    const L = 7 + rk * 1.2, arc = 0.75, dmg = 24 + rk * 8;
    const face = Math.atan2(p.aimDir.x, p.aimDir.z);
    const dir = new THREE.Vector3(Math.sin(face), 0, Math.cos(face));
    const origin = p.pos.clone();
    const hit = new Set();
    let t = 0;
    const dur = 0.45;
    if (!g.audio?.sample?.('splash')) g.audio?.noise({ dur: 0.8, gain: 0.45, type: 'lowpass', freq: 900, sweep: 2600, attack: 0.05, rev: 0.3 });
    g.shake(0.25);
    g.addUpdater((dt) => {
      t += dt;
      const k = Math.min(1, t / dur), front = 0.8 + k * L;
      // the wall of water: a curling crest marching outwards
      for (let i = 0; i < 16; i++) {
        const a = face + (Math.random() - 0.5) * 2 * arc, rr = front - Math.random() * 0.8;
        const x = origin.x + Math.sin(a) * rr, z = origin.z + Math.cos(a) * rr, y = origin.y + Math.random() * 1.8 * (1 - k * 0.5);
        g.particles.glow.emit(x, y, z, Math.sin(a) * 6, 2 + Math.random() * 3, Math.cos(a) * 6, 0.45, 0.4 + Math.random() * 0.4, 1.4, 1.8, 0.2 + Math.random() * 0.15, 12, 1.5, 0.08, Math.random() < 0.5 ? 1 : 0);
      }
      if (Math.random() < 0.6) g.particles.smoke.emit(origin.x + dir.x * front, origin.y + 0.3, origin.z + dir.z * front, 0, 1.2, 0, 0.6, 0.75, 0.95, 1.0, 0.6, 0, 1, 1.6, 0);
      for (const e of g.combat.query(origin, dir, front, arc)) {
        if (hit.has(e)) continue;
        tmp.subVectors(e.pos, origin).setY(0); if (tmp.length() < front - 1.6) continue;
        hit.add(e);
        g.combat.damageEnemy(e, dmg, p, { knock: tmp.normalize().multiplyScalar(15), stagger: 0.7 });
        if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 5);
        g.fx.splash(e.pos, 2);
      }
      if (k >= 1) {
        g.combat.hitBlocks(origin, dir, L, arc, 25, p);
        g.fx.slashArc(origin, face, SEA, L * 0.9, arc / Math.PI, 0.3);
        return false;
      }
      return true;
    });
  }
  // ---------------------------------------------------------------- Healing Tide
  tide() {
    const g = this.game, p = this.p, rk = this.rank('tide_up');
    this.cast(0.5, true, { type: 'raise' });
    const R = 3.6 + rk * 0.6, dur = 6 + rk * 1.5, heal = 3 + rk * 1.5;
    const gy = this.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5) ?? p.pos.y;
    const c = new THREE.Vector3(p.pos.x, gy, p.pos.z);
    const disc = makeDisc(SEA, { rings: 7, speed: 0.6, intensity: 1.4 });
    disc.position.set(c.x, c.y + 0.07, c.z); disc.scale.setScalar(0.01);
    g.scene.add(disc);
    const pool = { c, R }; this.pools.push(pool);
    const light = g.lights.flash(c.clone().setY(c.y + 1), SEA, 5, R * 2.5, dur + 0.5, { priority: 4, fade: false });
    g.audio?.energy('heal');
    g.audio?.noise({ dur: 1.2, gain: 0.3, type: 'lowpass', freq: 500, sweep: 1600, attack: 0.3, rev: 0.4 });
    g.fx.splash(c, 3);
    let t = 0, tick = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      const grow = Math.min(1, t / 0.4), fade = Math.min(1, (dur - t) / 0.6);
      disc.scale.setScalar(R * grow);
      disc.userData.alpha.value = Math.max(0, fade) * 0.9;
      if (Math.random() < 0.7) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R; g.particles.glow.emit(c.x + Math.cos(a) * r, c.y + 0.1, c.z + Math.sin(a) * r, 0, 0.8 + Math.random(), 0, 0.8, 0.5, 1.6, 1.8, 0.1, -0.5, 0.5, 0.25, 2); }
      if (tick <= 0) {
        tick = 0.5;
        for (const h of g.hostileTargets()) {
          if (h.dead || h.downed || Math.hypot(h.pos.x - c.x, h.pos.z - c.z) > R || Math.abs(h.pos.y - c.y) > 1.6) continue;
          if (h.heal) h.heal(h.maxHp * heal / 100 * 0.5 + 1, true); else h.hp = Math.min(h.maxHp, h.hp + 2);
          g.particles.burst(tmp.copy(h.pos).setY(h.pos.y + 0.6), { count: 4, color: 0x9affe0, speed: 1, up: 2.5, life: 0.6, size: 0.14, shape: 2 });
        }
        g.fx.rings.spawn(tmp.set(c.x, c.y + 0.08, c.z), { color: FOAM, r0: R * 0.3, r1: R, dur: 0.9, thick: 0.06 });
        // monsters wading through it are slowed
        for (const e of g.enemies) if (!e.dead && Math.hypot(e.pos.x - c.x, e.pos.z - c.z) < R) e.slowT = Math.max(e.slowT ?? 0, 0.6);
      }
      if (t >= dur) { g.scene.remove(disc); g.lights.remove(light); this.pools.splice(this.pools.indexOf(pool), 1); return false; }
      return true;
    });
  }
  // ---------------------------------------------------------------- Riptide Throw
  throwSword() {
    const g = this.game, p = this.p, rk = this.rank('throw_up');
    if (this.thrown) return false;
    p.action = { type: 'attack', step: { style: 'throw', strike: 0.45, windup: 0.3 }, style: 'throw', dur: 0.4, elapsed: 0, t: 0, windup: 0.3, strike: 0.45, struck: true, moveScale: 0.35 };
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const L = 10 + rk * 1.5, dmg = 22 + rk * 8;
    const dir = p.aimDir.clone().setY(0).normalize();
    const blade = buildRiptide(); blade.position.set(0, 0, 0); blade.scale.setScalar(1.6);
    const spin = new THREE.Group(); spin.add(blade); blade.position.z = -0.35;
    spin.position.copy(this.handPos());
    g.scene.add(spin);
    const held = p.rig.extras.weapon; if (held) held.visible = false;
    this.thrown = true;
    const light = g.lights.attach(spin, BRONZE, 4, 7, { offsetY: 0, priority: 4 });
    const out = new Set(), back = new Set();
    let t = 0, phase = 0, dist = 0;
    const OUT = 0.32;
    const pos = spin.position;
    g.audio?.whoosh(1.2);
    setTimeout(() => g.audio?.whoosh(0.8), 150);
    g.addUpdater((dt) => {
      t += dt;
      spin.rotation.y += dt * 26;
      const from = p.pos.clone().setY(p.pos.y + 1.2);
      if (phase === 0) {
        dist = Math.min(L, (t / OUT) * L);
        const want = from.clone().addScaledVector(dir, dist);
        // stop early at walls
        if (g.world.solidAt(want.x, want.y, want.z)) { phase = 1; t = 0; g.fx.hitSpark(pos, null, { color: BRONZE }); g.audio?.impact(0.7, 'crit'); }
        else pos.copy(want);
        if (t >= OUT) { phase = 1; t = 0; }
      } else {
        // fly home to Percy's hand
        tmp.subVectors(from, pos); const d = tmp.length();
        const sp = 26 + t * 30;
        if (d < sp * dt + 0.4) {
          g.scene.remove(spin); g.lights.remove(light);
          if (held) held.visible = true;
          this.thrown = false;
          g.particles.burst(from, { count: 10, color: BRONZE, speed: 3, life: 0.3, size: 0.1, shape: 3 });
          g.audio?.tone({ freq: 1400, to: 1800, dur: 0.12, gain: 0.06, type: 'triangle' });
          return false;
        }
        pos.addScaledVector(tmp.normalize(), sp * dt);
      }
      g.particles.glow.emit(pos.x, pos.y, pos.z, 0, 0, 0, 0.25, 2.2, 1.6, 0.5, 0.3, 0, 0, 0.05, 0);
      const set = phase === 0 ? out : back;
      for (const e of g.enemies) {
        if (e.dead || e.untargetable || set.has(e)) continue;
        const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, dy = pos.y - e.pos.y;
        if (dx * dx + dz * dz > (e.radius + 0.9) ** 2 || dy < -0.5 || dy > (e.height ?? 1.8) + 0.5) continue;
        set.add(e);
        g.combat.damageEnemy(e, dmg * (phase ? 0.8 : 1), p, { knock: tmp2.set(dx, 0, dz).normalize().multiplyScalar(5), stagger: 0.45 });
        g.fx.hitSpark(tmp2.copy(e.pos).setY(e.pos.y + 1), null, { color: BRONZE });
        g.hitStop(0.02);
      }
      return true;
    });
  }
  // ---------------------------------------------------------------- Disarming Strike
  // Luke's disarming move: a long thrust; the first monster it reaches is
  // stunned (a boss can't be, so its guard is opened: marked).
  disarm() {
    const g = this.game, p = this.p, rk = this.up('disarm');
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.45, windup: 0.25, lunge: 16 }, style: 'punch', dur: 0.42, elapsed: 0, t: 0, windup: 0.25, strike: 0.45, struck: true, moveScale: 0.15 };
    const dmg = 30 + rk * 12, hold = 2 + rk * 0.5;
    g.audio?.whoosh(1.1);
    let t = 0, done = false;
    g.addUpdater((dt) => {
      t += dt;
      if (p.dead || p.downed || t > 0.4) return false;
      if (t < 0.18 || done) return true;
      const dir = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      const e = g.combat.query(p.pos, dir, 3.4, 0.55).sort((a, b) => a.pos.distanceToSquared(p.pos) - b.pos.distanceToSquared(p.pos))[0];
      if (!e) return true;
      done = true;
      g.combat.damageEnemy(e, dmg, p, { melee: true, knock: dir.clone().multiplyScalar(4), stagger: 0.6 });
      if (!stun(e, hold)) mark(e, hold + 2, g);
      const at = tmp2.copy(e.pos).setY(e.pos.y + (e.height ?? 1.5) * 0.6);
      g.fx.slashX(at, 1.4, BRONZE); g.fx.hitSpark(at, dir, { color: BRONZE, crit: true });
      g.hitStop(0.06); g.shake(0.2);
      g.audio?.impact(1.4, 'crit');
      g.audio?.tone({ freq: 1500, to: 2200, dur: 0.12, gain: 0.07, type: 'triangle' });
      return false;
    });
  }
  // ---------------------------------------------------------------- Geyser
  // A ring of foam marks the spot, then the ground bursts: monsters fly.
  geyser() {
    const g = this.game, p = this.p, rk = this.up('geyser');
    const to = p.aimPoint.clone(); tmp.subVectors(to, p.pos).setY(0);
    if (tmp.length() > 10) to.copy(p.pos).addScaledVector(tmp.normalize(), 10);
    const gy = this.groundAt(to.x, to.z, p.pos.y + 3);
    if (gy == null || Math.abs(gy - p.pos.y) > 4) { g.audio?.ui('back'); return false; }
    to.y = gy;
    this.cast(0.4, true, { type: 'raise' });
    const R = 2.6 + rk * 0.4, dmg = 28 + rk * 10;
    g.fx.rings.spawn(tmp.set(to.x, to.y + 0.08, to.z), { color: FOAM, r0: R, r1: R * 0.3, dur: 0.4, thick: 0.15 });
    g.audio?.noise({ dur: 0.4, gain: 0.2, type: 'lowpass', freq: 300, sweep: 900, attack: 0.2 });
    let t = 0, burst = false;
    g.addUpdater((dt) => {
      t += dt;
      if (!burst && t >= 0.4) {
        burst = true;
        for (const e of g.enemies) {
          if (e.dead || Math.hypot(e.pos.x - to.x, e.pos.z - to.z) > R + e.radius || Math.abs(e.pos.y - to.y) > 2.5) continue;
          g.combat.damageEnemy(e, dmg, p, { stagger: 0.8, knock: tmp2.set(e.pos.x - to.x, 0, e.pos.z - to.z).setLength(3) });
          if (!e.isBoss && !e.isDummy) e.vel.y = Math.max(e.vel.y, 13);
        }
        g.fx.splash(to, 4); g.fx.shockwave(to, SEA, R + 0.6);
        g.shake(0.3);
        if (!g.audio?.sample?.('splash')) g.audio?.noise({ dur: 0.7, gain: 0.45, type: 'lowpass', freq: 700, sweep: 2600, attack: 0.02, rev: 0.3 });
      }
      // the column of water
      if (burst) for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * R * 0.5; g.particles.glow.emit(to.x + Math.cos(a) * r, to.y + 0.2, to.z + Math.sin(a) * r, Math.cos(a) * 1.5, 9 + Math.random() * 6, Math.sin(a) * 1.5, 0.7, 0.5, 1.6, 2, 0.2 + Math.random() * 0.15, 14, 1.2, 0.08, Math.random() < 0.5 ? 1 : 0); }
      return t < 1.1;
    });
  }
  // ---------------------------------------------------------------- Air Bubble
  // The air bubble he makes under the sea: heroes in it take half damage.
  bubble() {
    const g = this.game, p = this.p, rk = this.up('bubble');
    const dur = 4 + rk, R = 5 + rk;
    this.cast(0.4, true, { type: 'raise' });
    for (const h of g.players) {
      if (h.dead || h.downed || h.pos.distanceTo(p.pos) > R) continue;
      h.barrierT = Math.max(h.barrierT ?? 0, dur);   // (player.js: half damage while it lasts)
      g.particles.burst(tmp.copy(h.pos).setY(h.pos.y + 1), { count: 14, color: FOAM, speed: 2, up: 1, life: 0.6, size: 0.22, shape: 1 });
      g.fx.rings.spawn(tmp.set(h.pos.x, h.pos.y + 1, h.pos.z), { color: FOAM, r0: 0.4, r1: 1.4, dur: 0.4, thick: 0.15 });
    }
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: SEA, r0: 0.5, r1: R, dur: 0.5, thick: 0.08 });
    g.audio?.tone({ freq: 500, to: 900, dur: 0.25, gain: 0.07, type: 'sine', rev: 0.5 });
    g.audio?.noise({ dur: 0.5, gain: 0.2, type: 'bandpass', freq: 900, sweep: 300, q: 1 });
  }
  // ---------------------------------------------------------------- Hurricane
  hurricaneStart(g, d) {
    const p = this.p;
    this.storm = { t: 0, tick: 0, boltT: 0.4 };
    const f = funnelMesh(); g.scene.add(f); this.storm.funnel = f;
    const f2 = funnelMesh(); g.scene.add(f2); this.storm.funnel2 = f2;
    const disc = makeDisc(DEEP, { rings: 12, speed: -1.2, spokes: 5, intensity: 2 }); g.scene.add(disc); this.storm.disc = disc;
    this.storm.light = g.lights.attach(p.object, SEA, 10, 22, { offsetY: 4, priority: 8 });
    g.fx.dimTarget = 0.35;
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1.4, 0.8);
    g.audio?.noise({ dur: 6, gain: 0.35, type: 'bandpass', freq: 500, sweep: 900, q: 0.6, attack: 0.6, rev: 0.5 });
  }
  hurricaneTick(g, d, dt) {
    const s = this.storm; if (!s) return;
    const p = this.p, R = d.def.radius;
    s.t += dt; s.tick -= dt; s.boltT -= dt;
    const c = p.pos;
    const grow = Math.min(1, s.t / 0.6);
    const left = d.def.duration - s.t, fade = Math.max(0, Math.min(1, left / 0.6));
    s.funnel.position.set(c.x, c.y - 0.2, c.z); s.funnel.scale.set(R * grow, 9 * grow, R * grow); s.funnel.rotation.y -= dt * 3; s.funnel.userData.alpha.value = 0.55 * fade;
    s.funnel2.position.set(c.x, c.y - 0.2, c.z); s.funnel2.scale.set(R * 0.6 * grow, 12 * grow, R * 0.6 * grow); s.funnel2.rotation.y -= dt * 5; s.funnel2.userData.alpha.value = 0.4 * fade;
    s.disc.position.set(c.x, c.y + 0.08, c.z); s.disc.scale.setScalar(R * grow); s.disc.userData.alpha.value = fade;
    // spiralling spray
    const P = g.particles.glow;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * R, y = c.y + Math.random() * 6;
      const tang = 9 + (R - r) * 1.5;
      P.emit(c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r, -Math.sin(a) * tang - Math.cos(a) * 3, 1.5, Math.cos(a) * tang - Math.sin(a) * 3, 0.5, 0.5, 1.7, 2, 0.14 + Math.random() * 0.12, 0, 0.5, 0.1, Math.random() < 0.4 ? 1 : 0);
    }
    if (Math.random() < 0.15) g.particles.smoke.emit(c.x + (Math.random() - 0.5) * R * 1.6, c.y + 0.3, c.z + (Math.random() - 0.5) * R * 1.6, 0, 2, 0, 0.8, 0.12, 0.3, 0.36, 0.6, 0, 1, 2, 0);
    // pull everything in
    for (const e of g.enemies) {
      if (e.dead || e.isDummy) continue;
      tmp.subVectors(c, e.pos); const dy = tmp.y; tmp.y = 0; const dist = tmp.length();
      if (dist > R + 2 || Math.abs(dy) > 5 || dist < 0.01) continue;
      tmp.normalize();
      const pull = Math.min(dist * 3, 9) * (1 - (e.def?.knockResist ?? 0) * 0.7);
      const swirl = tmp2.set(-tmp.z, 0, tmp.x).multiplyScalar(6 * (1 - (e.def?.knockResist ?? 0)));
      e.knock.lerp(tmp.multiplyScalar(pull).add(swirl), Math.min(1, dt * 8));
      if (dist < 2) e.knock.multiplyScalar(0.5);
    }
    if (s.tick <= 0) {
      s.tick = 0.6;
      for (const e of g.enemies) {
        if (e.dead || Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > R) continue;
        g.combat.damageEnemy(e, 13, p, { stagger: 0.3, ceGain: 0 });
        g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 6, color: FOAM, speed: 4, life: 0.4, size: 0.12, shape: 1, gravity: 8 });
      }
      g.shake(0.12);
    }
    // the storm throws lightning at random monsters
    if (s.boltT <= 0) {
      s.boltT = 0.5 + Math.random() * 0.4;
      const list = g.enemies.filter((e) => !e.dead && Math.hypot(e.pos.x - c.x, e.pos.z - c.z) < R);
      const e = list[Math.floor(Math.random() * list.length)];
      if (e) {
        const top = e.pos.clone().setY(e.pos.y + 9), at = e.pos.clone().setY(e.pos.y + 1);
        zap(g, top, at, 0xcff8ff, 0.22, 0.2, 6);
        g.combat.damageEnemy(e, 22, p, { stagger: 0.6, ceGain: 0, color: '#cff8ff' });
        g.lights.flash(at, 0xcff8ff, 12, 12, 0.2, { priority: 6 });
        g.fx.flash(0xcff8ff, 0.15, 0.08);
        g.audio?.noise({ dur: 0.5, gain: 0.4, type: 'lowpass', freq: 3000, sweep: 100, rev: 0.4 });
      }
    }
  }
  hurricaneEnd(g) {
    const s = this.storm; if (!s) return;
    g.scene.remove(s.funnel, s.funnel2, s.disc); g.lights.remove(s.light);
    g.fx.dimTarget = 0;
    g.fx.splash(this.p.pos, 4);
    g.fx.rings.spawn(tmp.set(this.p.pos.x, this.p.pos.y + 0.1, this.p.pos.z), { color: FOAM, r0: 2, r1: 10, dur: 0.6, thick: 0.1 });
    this.storm = null;
  }
  dispose() { super.dispose(); if (this.storm) this.hurricaneEnd(this.game); }
}
registerKit('percy', PercyKit);

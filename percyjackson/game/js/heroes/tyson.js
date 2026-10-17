// Tyson, Cyclops and son of Poseidon — huge fists and a forge-hot heart.
//   LMB  slow, heavy four-punch combo with big knock-back. Press attack again
//        right as a punch lands to wind up a Mighty Blow (double damage,
//        bronze shockwave) on the next one.
//   RMB  Boulder: rips a chunk out of the floor and hurls it.
//   1    Ground Pound: leaps and slams the ground, launching everything near.
//   2    Watch Shield: his wristwatch springs into a round bronze shield that
//        blocks every hit from the front (and halves it for friends behind
//        him) and bats arrows back.
//   3    Forge Fire: immune to fire and burning, and for 8 s the whole team's
//        melee hits deal +30% with fiery sparks.
//   Learned in the skill tree (any power can go in any of 1 · 2 · 3):
//        Thunder Clap: a stunning shock wave in front of him.
//        Iron Skin: half damage, no knock-back, and Power from every hit taken.
//        Call Rainbow: his hippocampus friend tramples a line of monsters.
//   F    Big Brother: grows huge and unstoppable; every punch launches.
import * as THREE from 'three/webgpu';
import { Kit, teamBuff, buffOn, stun } from './kit.js';
import { registerKit } from './index.js';
import { BLOCKS } from '../world/blocks.js';

const BRONZE = 0xc9963a, FIRE = 0xff7a2a, EMBER = 0xffb04a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// The skill tree (and the new powers' numbers) is in skillRules.js.

class TysonKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.4, windup: 0.32, strike: 0.52, dmg: 16, range: 2.9, arc: 1.0, lunge: 6, knock: 7, stop: 0.07, shake: 0.22, trail: BRONZE, sparkColor: 0xffd8a0, chainAt: 0.6 },
      { style: 'swingL', dur: 0.44, windup: 0.34, strike: 0.54, dmg: 18, range: 3.0, arc: 1.2, lunge: 5, knock: 8, stop: 0.075, shake: 0.24, trail: BRONZE, sparkColor: 0xffd8a0, chainAt: 0.6 },
      { style: 'uppercut', dur: 0.48, windup: 0.34, strike: 0.52, dmg: 22, range: 3.0, arc: 1.0, lunge: 5, knock: 7, stop: 0.09, shake: 0.3, trail: EMBER, launch: true, chainAt: 0.62 },
      { style: 'slam', dur: 0.66, windup: 0.46, strike: 0.62, dmg: 34, range: 3.6, arc: Math.PI, lunge: 4, knock: 15, stop: 0.11, shake: 0.55, ring: true, ringColor: BRONZE, stagger: 0.7, trail: BRONZE },
    ];
    this.p.stats.meleeMult += r('fists') * 0.08;
    this.p.maxHp += 30 + r('vitality') * 15; this.p.hp = Math.min(this.p.hp + 30 + r('vitality') * 15, this.p.maxHp);
    this.p.radius = 0.42;
    this.speedMul = 0.92;
    this.slots = {
      ranged: this.ability({ name: 'Boulder', icon: '🪨', cd: 2.2, ce: 0, use: () => this.boulder() }),
      ...this.equipSlots({
        pound: this.ability({ name: 'Ground Pound', icon: '👊', cd: 6, ce: 12, use: () => this.pound() }),
        shield: this.ability({ name: 'Watch Shield', icon: '🛡️', cd: 10, ce: 12, use: () => this.shield() }),
        forge: this.ability({ name: 'Forge Fire', icon: '🔥', cd: 18, ce: 20, use: () => this.forge() }),
        clap: this.ability({ name: 'Thunder Clap', icon: '👏', cd: 8, ce: 12, use: () => this.clap() }),
        ironskin: this.ability({ name: 'Iron Skin', icon: '🗿', cd: 16, ce: 12, use: () => this.ironSkin() }),
        rainbow: this.ability({ name: 'Call Rainbow', icon: '🐴', cd: 14, ce: 16, use: () => this.rainbow() }),
      }),
    };
    this.domain = {
      name: 'Big Brother', icon: '💪', key: 'big_brother', world: false, sureHit: false, type: 0, color: FIRE, sound: 'fire', flash: 0xffc070,
      duration: 8 + r('brother') * 2, radius: 10,
      onStart: (g, d) => this.growStart(g, d),
      onTick: (g, d, dt) => this.growTick(g, d, dt),
      onEnd: (g) => this.growEnd(g),
    };
    this.window = 0.14 + r('mighty') * 0.035;
    this.windowAt = -9; this.armed = false; this.mightyNow = false;
    this.shieldT = 0; this.forgeT = 0;
    this.baseScale = p.rig.root.scale.x;
  }
  // ---------------------------------------------------------------- Mighty Blow timing
  tick(dt, inp) {
    const g = this.game, p = this.p;
    if (inp.pressed.attack) {
      const dtHit = g.time - this.windowAt;
      // a timed press, not a mash: another press just before it spoils the timing
      const mashed = g.time - (this.lastPressAt ?? -9) < 0.18;
      this.lastPressAt = g.time;
      if (dtHit >= 0 && dtHit <= this.window && !this.armed && !mashed) {
        this.armed = true;
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: EMBER, r0: 1.6, r1: 0.4, dur: 0.18, thick: 0.25 });
        g.audio?.tone({ freq: 220, to: 440, dur: 0.1, gain: 0.08, type: 'square', filter: 1500 });
      }
    }
    if (this.armed && Math.random() < 0.6) g.particles.burst(this.handPos(), { count: 1, color: EMBER, speed: 2, life: 0.25, size: 0.1, shape: 3 });
    // Watch Shield
    if (this.shieldT > 0) {
      this.shieldT -= dt;
      const sh = p.rig.extras.shield;
      const fwd = tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      // bat arrows and spit straight back
      for (const pr of g.projectiles.list) {
        if (pr.team !== 'enemy') continue;
        tmp2.subVectors(pr.pos, p.pos); const d = tmp2.setY(0).length();
        if (d < 2.2 && tmp2.normalize().dot(fwd) > 0.2) {
          pr.team = 'player'; pr.vel.reflect(fwd).multiplyScalar(1.3); pr.hit.clear();
          const dmg = pr.dmg ?? 10;
          pr.onHit = (e, q) => { g.combat.damageEnemy(e, dmg * 1.5, p, { knock: q.vel.clone().setY(0).setLength(5), stagger: 0.4 }); g.fx.hitSpark(q.pos, null, { color: BRONZE }); };
          g.fx.hitSpark(pr.pos.clone(), null, { color: BRONZE });
          g.audio?.tone({ freq: 1200, to: 800, dur: 0.1, gain: 0.08, type: 'square', filter: 3000 });
        }
      }
      if (sh) sh.scale.setScalar(Math.min(1, (this.shieldMax - this.shieldT) * 8, this.shieldT * 6 + 0.05));
      if (this.shieldT <= 0) { if (sh) sh.visible = false; if (g.pjShield?.owner === p) g.pjShield = null; }
    }
    if (this.ironT > 0) { this.ironT -= dt; if (Math.random() < dt * 10) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 1.1, p.pos.y + Math.random() * 2.4, p.pos.z + (Math.random() - 0.5) * 1.1, 0, 0.4, 0, 0.5, 1.6, 1.2, 0.7, 0.14, 0, 1, 0.1, 3); }
    // Forge Fire glow
    if (this.forgeT > 0) {
      this.forgeT -= dt;
      for (const pl of g.players) if (!pl.dead && Math.random() < dt * 14) { const h = pl.kit.handPos(tmp); g.particles.glow.emit(h.x, h.y, h.z, (Math.random() - 0.5), 1.5, (Math.random() - 0.5), 0.35, 3, 1.2, 0.3, 0.12, -1, 1, 0.05, 3); }
      if (Math.random() < dt * 20) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5), p.pos.y + Math.random() * 2.4, p.pos.z + (Math.random() - 0.5), 0, 2, 0, 0.5, 3, 1.1, 0.25, 0.22, -1, 1, 0.3, 0);
    }
    p.heroLight.color.setRGB(1, this.forgeT > 0 ? 0.6 : 0.9, this.forgeT > 0 ? 0.3 : 0.8);
  }
  onStrike(step) {
    this.windowAt = this.game.time;
    this.mightyNow = this.armed || (this.growing && step.style === 'slam');
    this.armed = false;
    if (this.mightyNow) {
      const g = this.game, p = this.p, c = p.pos.clone().addScaledVector(tmp.set(Math.sin(p.facing), 0, Math.cos(p.facing)), 1.4);
      g.fx.shockwave(c, EMBER, 3.6); g.fx.screenWave(c.clone().setY(c.y + 1), 0.6, 0.3); g.fx.chroma(0.5);
      g.lights.flash(c.clone().setY(c.y + 1), EMBER, 10, 10, 0.25);
      g.audio?.impact(1.8, 'crit');
    }
  }
  outgoing(e, o) {
    let m = 1;
    if (o.melee && this.mightyNow) m *= 2;
    if (this.growing) m *= 1.3;
    return m;
  }
  onMeleeHit(e, step) {
    const g = this.game;
    if (this.mightyNow) { g.hitStop(0.08); g.shake(0.35); stun(e, 0.5); if (this.rank('mighty_ce')) this.p.gainCE(4 * this.rank('mighty_ce')); }
    if ((step.launch || this.growing) && !e.isBoss && !e.isDummy) { e.vel.y = Math.max(e.vel.y, this.growing ? 11 : 9); if (this.growing) e.knock.addScaledVector(tmp.subVectors(e.pos, this.p.pos).setY(0).normalize(), 10); }
  }
  // fire, burning and Greek fire can't hurt him while the forge burns; the
  // shield stops everything from the front; Big Brother can't be staggered
  onIncoming(amount, src, o) {
    const g = this.game, p = this.p;
    if (this.forgeT > 0 && (o.dot || o.fire || src?.def?.ai === 'blob')) { if (Math.random() < 0.3) g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 4, color: FIRE, speed: 2, life: 0.3, size: 0.12 }); return 0; }
    if (this.shieldT > 0 && src?.pos) {
      const from = Math.atan2(src.pos.x - p.pos.x, src.pos.z - p.pos.z);
      let d = from - p.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 1.35) {
        g.fx.hitSpark(tmp.copy(p.pos).setY(p.pos.y + 1.4).addScaledVector(tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing)), 0.9), null, { color: BRONZE, big: true });
        g.audio?.tone({ freq: 900, to: 500, dur: 0.15, gain: 0.12, type: 'square', filter: 3000 });
        g.shake(0.1);
        return 0;
      }
    }
    if (this.ironT > 0) { o.noKnock = true; if (!o.dot) p.gainCE(3 + this.up('ironskin')); }
    if (this.growing) { o.noKnock = true; o.dot = true; return amount * 0.5; }
    return amount;
  }
  // the block under a point, for rubble colours
  floorDef(pos) { const id = this.game.world.get(Math.floor(pos.x), Math.floor(pos.y - 0.5), Math.floor(pos.z)); return id ? BLOCKS[id] : 7; }
  // ---------------------------------------------------------------- Boulder
  boulder() {
    const g = this.game, p = this.p, big = this.rank('boulder') + (this.growing ? 1 : 0);
    p.action = { type: 'attack', step: { style: 'throw', strike: 0.5, windup: 0.3 }, style: 'throw', dur: 0.45, elapsed: 0, t: 0, windup: 0.3, strike: 0.5, struck: true, moveScale: 0.3 };
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    const from = p.pos.clone().setY(p.pos.y + 2.1);
    g.fx.debris(p.pos.clone().setY(p.pos.y + 0.3), 0x8a7a6a, 3);
    const dist = Math.min(13, p.aimPoint.distanceTo(p.pos)) || 8;
    const flight = 0.6, grav = 20;
    const vel = p.aimDir.clone().multiplyScalar(dist / flight); vel.y = 0.5 * grav * flight;
    const pr = g.projectiles.fire({ pos: from, vel, team: 'player', shape: 'cube', color: 0x7a6a5a, emissive: 0.05, gravity: grav, life: 2, scale: 2 + big * 0.6, radius: 0.8,
      trail: (q) => { if (Math.random() < 0.3) g.particles.smoke.emit(q.pos.x, q.pos.y, q.pos.z, 0, 0, 0, 0.5, 0.5, 0.45, 0.4, 0.3, 0, 1, 0.8, 0); },
      onHit: (e, q) => { g.combat.damageEnemy(e, 24 + big * 8, p, { knock: q.vel.clone().setY(0).setLength(9), stagger: 0.7 }); },
      onExpire: (q) => { g.debris.burst(q.pos, this.floorDef(q.pos), 8); g.combat.aoe(q.pos, 2.2 + big * 0.8, 12 + big * 10, p, { knock: 7, stagger: 0.4 }); g.fx.shockwave(q.pos, 0xc8a080, 2.6 + big); g.audio?.impact(1.4); g.shake(0.25); } });
    if (!pr) return false;
    g.audio?.whoosh(1.1);
  }
  // ---------------------------------------------------------------- Ground Pound
  pound() {
    const g = this.game, p = this.p, rk = this.rank('pound_up');
    const R = 4 + rk * 0.8 + (this.growing ? 1.5 : 0);
    p.action = { type: 'attack', step: { style: 'slam', strike: 0.6, windup: 0.42 }, style: 'slam', dur: 0.6, elapsed: 0, t: 0, windup: 0.42, strike: 0.6, struck: true, moveScale: 0.1 };
    p.vel.y = 7;
    g.audio?.whoosh(1);
    setTimeout(() => {
      if (p.dead) return;
      const n = g.combat.aoe(p.pos, R, 30 + rk * 12, p, { melee: true, knock: 11, stagger: 0.8 });
      for (const e of g.enemies) if (!e.dead && !e.isBoss && !e.isDummy && e.pos.distanceTo(p.pos) < R) e.vel.y = Math.max(e.vel.y, 10);
      g.fx.shockwave(p.pos, BRONZE, R + 1.2);
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1, p.pos.z), { color: EMBER, r0: 0.5, r1: R * 1.3, dur: 0.5, thick: 0.2 });
      g.debris.burst(p.pos.clone().setY(p.pos.y + 0.2), this.floorDef(p.pos), 10);
      g.fx.screenWave(p.pos.clone().setY(p.pos.y + 0.5), 0.8, 0.4);
      g.shake(0.6); g.hitStop(n ? 0.07 : 0.03);
      g.audio?.impact(2);
      g.audio?.noise({ dur: 0.7, gain: 0.5, type: 'lowpass', freq: 400, sweep: 60, rev: 0.3 });
    }, 300);
  }
  // ---------------------------------------------------------------- Watch Shield
  shield() {
    const g = this.game, p = this.p;
    this.shieldMax = this.shieldT = 3 + this.rank('shield_up');
    g.pjShield = { owner: p, until: g.time + this.shieldT };
    const sh = p.rig.extras.shield; if (sh) { sh.visible = true; sh.scale.setScalar(0.05); }
    this.cast(0.3, false, { moveScale: 0.6 });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 1.3, p.pos.z), { color: BRONZE, r0: 0.2, r1: 1.4, dur: 0.25, thick: 0.25 });
    g.audio?.tone({ freq: 300, to: 1200, dur: 0.15, gain: 0.1, type: 'square', filter: 2500 });
    g.audio?.tone({ freq: 1500, dur: 0.3, gain: 0.06, type: 'triangle', rev: 0.4, at: 0.12 });
  }
  // ---------------------------------------------------------------- Forge Fire
  forge() {
    const g = this.game, p = this.p;
    const dur = 8 + this.rank('forge_up') * 2;
    this.forgeT = dur;
    teamBuff(g, 'forge', dur);
    this.cast(0.6, true, { type: 'raise' });
    for (const e of [p, ...g.players.filter((x) => x !== p)]) g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + 1), { count: 24, color: FIRE, speed: 4, up: 2, life: 0.6, size: 0.14, shape: 3 });
    g.fx.shockwave(p.pos, FIRE, 4);
    g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), FIRE, 10, 10, 0.5);
    g.audio?.energy('fire');
    g.audio?.tone({ freq: 1800, dur: 0.15, gain: 0.06, type: 'square', filter: 4000 });
    g.audio?.tone({ freq: 1800, dur: 0.15, gain: 0.05, type: 'square', filter: 4000, at: 0.2 });
    g.toast?.('Forge Fire: the team hits harder');
  }
  // ---------------------------------------------------------------- Thunder Clap
  clap() {
    const g = this.game, p = this.p, rk = this.up('clap');
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    this.cast(0.45, true);
    const R = 5 + (this.growing ? 1.5 : 0), arc = 0.8, hold = 1.2 + rk * 0.3, dmg = 26 + rk * 10;
    setTimeout(() => {
      if (p.dead) return;
      const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
      let n = 0;
      for (const e of g.combat.query(p.pos, dir, R, arc)) {
        g.combat.damageEnemy(e, dmg, p, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(8), stagger: 0.6 });
        stun(e, hold); n++;
      }
      const c = p.pos.clone().addScaledVector(dir, 1.2);
      g.fx.slashArc(p.pos, p.facing, EMBER, R, arc / Math.PI, 0.3);
      g.fx.shockwave(c, BRONZE, 3);
      g.fx.screenWave(c.clone().setY(c.y + 1.3), 0.5, 0.3);
      g.combat.hitBlocks(p.pos, dir, R, arc, 20, p);
      if (n) g.hitStop(0.05);
      g.shake(0.35);
      g.audio?.impact(1.6, 'crit');
      g.audio?.noise({ dur: 0.3, gain: 0.45, type: 'highpass', freq: 900, sweep: 300, q: 0.7 });
    }, 180);
  }
  // ---------------------------------------------------------------- Iron Skin
  ironSkin() {
    const g = this.game, p = this.p, rk = this.up('ironskin');
    const dur = 5 + rk;
    this.ironT = dur; p.barrierT = Math.max(p.barrierT ?? 0, dur);   // (player.js: half damage while it lasts)
    this.cast(0.5, true, { type: 'raise' });
    g.fx.shockwave(p.pos, 0x8a8f99, 3);
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1.2), { count: 20, color: 0xc0c8d0, speed: 3, life: 0.5, size: 0.12, shape: 3 });
    g.audio?.tone({ freq: 220, to: 110, dur: 0.4, gain: 0.15, type: 'square', filter: 900 });
    g.audio?.impact(1.2);
  }
  // ---------------------------------------------------------------- Call Rainbow
  // Rainbow the hippocampus answers his whistle: a surge of seawater races
  // along the aim line and tramples what's in it.
  rainbow() {
    const g = this.game, p = this.p, rk = this.up('rainbow');
    const L = 12 + rk * 2, dmg = 30 + rk * 12, sp = 22;
    const dir = p.aimDir.clone().setY(0).normalize(), start = p.pos.clone().addScaledVector(dir, -1.5);
    this.cast(0.4);
    g.audio?.tone({ freq: 1800, to: 2600, dur: 0.18, gain: 0.07, type: 'sine' });
    g.audio?.tone({ freq: 2200, to: 1600, dur: 0.2, gain: 0.06, type: 'sine', at: 0.2 });
    const hit = new Set();
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      const d = Math.min(L, t * sp), at = tmp.copy(start).addScaledVector(dir, d);
      // the rushing water, with a glint of rainbow scales at its head
      for (let i = 0; i < 12; i++) {
        const s = (Math.random() - 0.5) * 2.4, back = Math.random() * 1.5;
        g.particles.glow.emit(at.x - dir.z * s - dir.x * back, at.y + Math.random() * 1.6, at.z + dir.x * s - dir.z * back, dir.x * 8, 2 + Math.random() * 3, dir.z * 8, 0.5, 0.4, 1.4, 1.8, 0.2, 10, 1.2, 0.08, 1);
      }
      if (Math.random() < 0.6) g.particles.glow.emit(at.x, at.y + 1.2, at.z, dir.x * 6, 1, dir.z * 6, 0.35, Math.random() * 2, Math.random() * 2, Math.random() * 2, 0.18, 0, 1, 0.05, 3);
      for (const e of g.enemies) {
        if (e.dead || hit.has(e) || e.pos.distanceTo(at) > 1.8 + e.radius) continue;
        hit.add(e);
        g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().multiplyScalar(12).setY(4), stagger: 0.8 });
        g.fx.splash(e.pos, 1.5);
      }
      if (d >= L) { g.fx.splash(at, 3); return false; }
      return true;
    });
    g.shake(0.2);
  }
  // ---------------------------------------------------------------- Big Brother
  growStart(g) {
    const p = this.p;
    this.growing = true; this.growT = 0;
    this.savedReach = p.stats.reach ?? 1; p.stats.reach = this.savedReach * 1.35;
    this.light = g.lights.attach(p.object, FIRE, 6, 12, { offsetY: 3, priority: 7 });
    g.fx.shockwave(p.pos, EMBER, 7);
    g.debris.burst(p.pos.clone().setY(p.pos.y + 0.2), this.floorDef(p.pos), 12);
    g.audio?.tone({ freq: 80, to: 50, dur: 1.2, gain: 0.4, type: 'sawtooth', filter: 400, rev: 0.4 });
  }
  growTick(g, d, dt) {
    const p = this.p;
    this.growT += dt;
    const left = d.def.duration - this.growT;
    const k = Math.min(1, this.growT / 0.5) * Math.min(1, Math.max(0, left / 0.5));
    p.rig.root.scale.setScalar(this.baseScale * (1 + 0.5 * k));
    p.radius = 0.42 + 0.2 * k;
    // heavy footfalls shake the ground
    if (Math.hypot(p.vel.x, p.vel.z) > 2 && (this.stompT = (this.stompT ?? 0) - dt) <= 0) { this.stompT = 0.35; g.shake(0.12); g.fx.landDust(p.pos, 10); }
    if (Math.random() < dt * 16) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 1.4, p.pos.y + Math.random() * 3, p.pos.z + (Math.random() - 0.5) * 1.4, 0, 1.6, 0, 0.6, 2.6, 1.2, 0.3, 0.2, -1, 1, 0.3, 0);
  }
  growEnd(g) {
    const p = this.p;
    this.growing = false;
    p.rig.root.scale.setScalar(this.baseScale); p.radius = 0.42;
    if (this.savedReach != null) p.stats.reach = this.savedReach;
    if (this.light) { g.lights.remove(this.light); this.light = null; }
  }
  dispose() {
    super.dispose();
    if (this.growing) this.growEnd(this.game);
    const sh = this.p.rig.extras.shield; if (sh) sh.visible = false;
    if (this.game.pjShield?.owner === this.p) this.game.pjShield = null;
  }
}
registerKit('tyson', TysonKit);

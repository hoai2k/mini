// Clarisse La Rue, daughter of Ares — an electric spear and a boar shield.
//   LMB  spear combo with long reach; the spear crackles on every hit.
//   RMB  Spear Lightning: a short thrust of lightning that stuns.
//   1    Charge: a shield-first dash that carries monsters before her and
//        slams them down at the end.
//   2    War Cry: the whole team deals +25% damage for 8 s.
//   3    Boar Shield Bash: a cone of shield bash that stuns.
//   Learned in the skill tree (any power can go in any of 1 · 2 · 3):
//        Chain Lightning: a bolt that leaps from monster to monster.
//        Battle Frenzy: harder melee hits that heal her, for a while.
//        Hold the Line: half damage, and lightning zaps the monsters round her.
//   F    Ares's Fury: a burning rampage — every hit sets monsters on fire,
//        she strikes faster and steals life.
import * as THREE from 'three/webgpu';
import { Kit, zap, stun, burn, teamBuff } from './kit.js';
import { registerKit } from './index.js';

const RED = 0xd0402a, VOLT = 0xffd84a, FIRE = 0xff6a1a;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// The skill tree (and the new powers' numbers) is in skillRules.js.

class ClarisseKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.3, windup: 0.3, strike: 0.5, dmg: 13, range: 3.5, arc: 0.6, lunge: 7, knock: 3.5, stop: 0.045, shake: 0.14, trail: VOLT, sparkColor: 0xfff0a0, zap: true },
      { style: 'swingR', dur: 0.32, windup: 0.3, strike: 0.52, dmg: 13, range: 3.3, arc: 1.15, lunge: 6, knock: 4, stop: 0.05, shake: 0.16, trail: RED, sparkColor: 0xfff0a0 },
      { style: 'punch', dur: 0.32, windup: 0.3, strike: 0.5, dmg: 15, range: 3.7, arc: 0.6, lunge: 8, knock: 4.5, stop: 0.05, shake: 0.18, trail: VOLT, sparkColor: 0xfff0a0, zap: true },
      { style: 'spin', dur: 0.48, windup: 0.28, strike: 0.55, dmg: 24, range: 3.7, arc: Math.PI, lunge: 3, knock: 9, stop: 0.08, shake: 0.35, ring: true, ringColor: VOLT, stagger: 0.6, trail: VOLT, sparkColor: VOLT, zap: true },
    ];
    this.p.stats.meleeMult += r('spear') * 0.08;
    this.p.maxHp += r('tough') * 10; this.p.hp = Math.min(this.p.hp + r('tough') * 10, this.p.maxHp);
    this.p.stats.armor = Math.min(0.7, this.p.stats.armor + r('tough') * 0.03);
    this.slots = {
      ranged: this.ability({ name: 'Spear Lightning', icon: '⚡', cd: 1.1, ce: 0, use: () => this.lightning() }),
      ...this.equipSlots({
        charge: this.ability({ name: 'Charge', icon: '🐗', cd: 6, ce: 10, use: () => this.charge() }),
        cry: this.ability({ name: 'War Cry', icon: '📣', cd: 15, ce: 14, use: () => this.warCry() }),
        bash: this.ability({ name: 'Shield Bash', icon: '🛡️', cd: 8, ce: 12, use: () => this.bash() }),
        chain: this.ability({ name: 'Chain Lightning', icon: '🌩️', cd: 7, ce: 12, use: () => this.chain() }),
        frenzy: this.ability({ name: 'Battle Frenzy', icon: '😤', cd: 16, ce: 14, use: () => this.frenzy() }),
        hold: this.ability({ name: 'Hold the Line', icon: '🔱', cd: 15, ce: 14, use: () => this.holdLine() }),
      }),
    };
    this.domain = {
      name: "Ares's Fury", icon: '🔥', key: 'ares_fury', world: false, sureHit: false, type: 0, color: RED, sound: 'fire', flash: 0xff5a2a,
      duration: 8 + r('fury') * 1.5, radius: 12,
      onStart: (g, d) => this.furyStart(g, d),
      onTick: (g, d, dt) => this.furyTick(g, d, dt),
      onEnd: (g) => this.furyEnd(g),
    };
  }
  tip(out = new THREE.Vector3()) { const p = this.p; return out.set(p.pos.x + Math.sin(p.facing) * 1.8, p.pos.y + 1.1, p.pos.z + Math.cos(p.facing) * 1.8); }
  onMeleeHit(e, step) {
    const g = this.game;
    if (this.frenzyT > 0) this.p.heal(2 + this.up('frenzy'), true);
    if (step.zap) { const at = e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.6); zap(g, this.tip(), at, VOLT, 0.1, 0.12, 3); }
  }
  outgoing(e, o) {
    if (this.fury && !o.burn) burn(e, 3, 10 + this.rank('fury') * 4, this.p, this.game);
    return (this.fury ? 1.2 : 1) * (this.frenzyT > 0 && o.melee ? 1.3 : 1);
  }
  // ---------------------------------------------------------------- Spear Lightning
  lightning() {
    const g = this.game, p = this.p, rk = this.rank('volt');
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.45, windup: 0.3 }, style: 'punch', dur: 0.32, elapsed: 0, t: 0, windup: 0.3, strike: 0.45, struck: true, moveScale: 0.3 };
    const dir = p.aimDir.clone().setY(0).normalize();
    const L = 6.5 + rk * 1.2, dmg = 12 + rk * 3;
    const from = p.pos.clone().setY(p.pos.y + 1.1).addScaledVector(dir, 1);
    let end = from.clone().addScaledVector(dir, L);
    // stop at walls
    for (let s = 0.5; s < L; s += 0.5) { const q = tmp.copy(from).addScaledVector(dir, s); if (g.world.solidAt(q.x, q.y, q.z)) { end = q.clone(); break; } }
    zap(g, from, end, VOLT, 0.22, 0.18, 7);
    zap(g, from, end, 0xffffff, 0.08, 0.12, 5);
    const len = end.distanceTo(from);
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      tmp.subVectors(e.pos, p.pos); const along = tmp.dot(dir);
      if (along < 0 || along > len + 1) continue;
      const lat = Math.abs(tmp.x * dir.z - tmp.z * dir.x);
      if (lat > 0.9 + e.radius) continue;
      g.combat.damageEnemy(e, dmg, p, { knock: dir.clone().multiplyScalar(2), stagger: 0.3, color: '#ffe24a' });
      stun(e, 0.7 + rk * 0.25);
      g.fx.hitSpark(tmp2.copy(e.pos).setY(e.pos.y + (e.height ?? 1.5) * 0.6), dir, { color: VOLT });
    }
    g.lights.flash(end, VOLT, 8, 8, 0.15, { priority: 4 });
    g.audio?.noise({ dur: 0.25, gain: 0.35, type: 'highpass', freq: 2500, sweep: 6000, q: 0.7 });
    g.audio?.tone({ freq: 120, to: 60, dur: 0.2, gain: 0.15, type: 'sawtooth', filter: 1200 });
  }
  // ---------------------------------------------------------------- Charge
  charge() {
    const g = this.game, p = this.p, rk = this.rank('charge_up');
    const dir = p.aimDir.clone().setY(0).normalize();
    const dur = 0.4 + rk * 0.06, speed = 20;
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'cast', dur: dur + 0.1, elapsed: 0, t: 0, both: true, moveScale: 0, lock: true, hold: true, cancelable: false, root: dir.clone().multiplyScalar(speed) };
    p.iframes = Math.max(p.iframes, dur);
    const carried = new Set();
    let t = 0;
    g.audio?.whoosh(1.4);
    g.audio?.tone({ freq: 160, to: 90, dur: 0.4, gain: 0.2, type: 'sawtooth', filter: 800 });
    g.addUpdater((dt) => {
      t += dt;
      const front = tmp.copy(p.pos).addScaledVector(dir, 1.2);
      for (const e of g.combat.query(front, dir, 1.4, Math.PI)) {
        if (!carried.has(e)) { carried.add(e); g.combat.damageEnemy(e, 10, p, { stagger: 0.5, melee: true }); g.fx.hitSpark(tmp2.copy(e.pos).setY(e.pos.y + 1), dir, { color: RED }); }
      }
      for (const e of carried) {
        if (e.dead || e.isBoss) continue;
        e.knock.copy(dir).multiplyScalar(speed * (1 - (e.def?.knockResist ?? 0) * 0.6));
        stun(e, 0.3);
      }
      if (Math.random() < 0.8) g.particles.smoke.emit(p.pos.x, p.pos.y + 0.2, p.pos.z, -dir.x * 2, 0.8, -dir.z * 2, 0.5, 0.6, 0.55, 0.5, 0.4, 0, 2, 1.4, 0);
      if (t < dur && !p.hitWall && !p.dead) return true;
      p.action = null;
      // slam at the end
      const c = p.pos.clone().addScaledVector(dir, 1.2);
      const n = g.combat.aoe(c, 2.4, 22 + rk * 10, p, { knock: 9, stagger: 0.6, melee: true });
      for (const e of carried) if (!e.dead) stun(e, 0.8);
      g.fx.shockwave(c, RED, 3);
      g.shake(0.3); g.hitStop(n ? 0.06 : 0);
      g.audio?.impact(1.6);
      return false;
    });
  }
  // ---------------------------------------------------------------- War Cry
  warCry() {
    const g = this.game, p = this.p, rk = this.rank('cry_up');
    const dur = 8 + rk * 2;
    teamBuff(g, 'warCry', dur);
    this.cryT = dur;
    this.cast(0.6, true, { type: 'raise' });
    for (const pl of g.players) {
      if (pl.dead) continue;
      g.particles.burst(tmp.copy(pl.pos).setY(pl.pos.y + 1), { count: 20, color: RED, speed: 4, up: 1.5, life: 0.6, size: 0.14, shape: 3 });
      if (rk) pl.heal(6 * rk);
    }
    for (let i = 0; i < 3; i++) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1 + i * 0.5, p.pos.z), { color: i === 1 ? VOLT : RED, r0: 0.5, r1: 7 + i * 2, dur: 0.5 + i * 0.15, thick: 0.1 });
    for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < 5 && !e.isBoss && !e.isDummy) { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.5; }
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1.5), 0.8, 0.4);
    g.shake(0.35);
    g.audio?.noise({ dur: 0.8, gain: 0.45, type: 'bandpass', freq: 500, sweep: 900, q: 0.8, rev: 0.3 });
    g.audio?.tone({ freq: 196, to: 260, dur: 0.6, gain: 0.2, type: 'sawtooth', filter: 1200, rev: 0.3 });
    g.toast?.('War Cry: the team hits harder');
  }
  tick(dt) {
    const g = this.game, p = this.p;
    if (this.cryT > 0) {
      this.cryT -= dt;
      for (const pl of g.players) if (!pl.dead && Math.random() < dt * 5) g.particles.glow.emit(pl.pos.x + (Math.random() - 0.5) * 0.6, pl.pos.y + 0.2, pl.pos.z + (Math.random() - 0.5) * 0.6, 0, 2, 0, 0.6, 2.4, 0.5, 0.3, 0.12, 0, 1, 0.05, 3);
    }
    if (this.frenzyT > 0) { this.frenzyT -= dt; if (Math.random() < dt * 12) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.8, p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5) * 0.8, 0, 1.5, 0, 0.4, 2.6, 0.4, 0.2, 0.14, 0, 1, 0.1, 0); }
    if (this.holdT > 0) {
      this.holdT -= dt; this.zapT -= dt;
      if (this.zapT <= 0) {
        this.zapT = 0.5;
        const near = g.enemies.filter((e) => !e.dead && !e.untargetable && e.pos.distanceTo(p.pos) < 5.5).sort((a, b) => a.pos.distanceToSquared(p.pos) - b.pos.distanceToSquared(p.pos)).slice(0, 3);
        const from = p.pos.clone().setY(p.pos.y + 1.8);
        for (const e of near) { zap(g, from, e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.6), VOLT, 0.12, 0.14, 4); g.combat.damageEnemy(e, 8 + this.up('hold') * 3, p, { stagger: 0.2, color: '#ffe24a', ceGain: 0.5 }); }
        if (near.length) g.audio?.noise({ dur: 0.12, gain: 0.15, type: 'highpass', freq: 3000, sweep: 6000, q: 0.7 });
      }
    }
    // the spear tip crackles
    if (Math.random() < dt * 3) { const t = this.tip(); zap(g, t, t.clone().add(tmp.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8)), VOLT, 0.05, 0.08, 2); }
  }
  // ---------------------------------------------------------------- Chain Lightning
  // A bolt from the spear to the aimed monster, then on to the next nearest
  // one it hasn't hit, and so on.
  chain() {
    const g = this.game, p = this.p, rk = this.up('chain');
    const first = this.targetInAim(11, 0.6);
    if (!first) { g.audio?.ui('back'); return false; }
    p.facing = Math.atan2(first.pos.x - p.pos.x, first.pos.z - p.pos.z);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.4, windup: 0.25 }, style: 'punch', dur: 0.32, elapsed: 0, t: 0, windup: 0.25, strike: 0.4, struck: true, moveScale: 0.3 };
    const n = 4 + rk, dmg = 22 + rk * 6, hit = new Set();
    let from = this.tip(), e = first;
    for (let i = 0; i < n && e; i++) {
      const at = e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.6);
      zap(g, from, at, VOLT, 0.18, 0.2, 6); zap(g, from, at, 0xffffff, 0.06, 0.14, 4);
      g.combat.damageEnemy(e, dmg * (1 - i * 0.1), p, { stagger: 0.4, color: '#ffe24a' });
      stun(e, 0.4);
      hit.add(e); from = at;
      let next = null, bd = 6;
      for (const q of g.enemies) { if (q.dead || q.untargetable || hit.has(q)) continue; const d = q.pos.distanceTo(e.pos); if (d < bd) { bd = d; next = q; } }
      e = next;
    }
    g.lights.flash(from, VOLT, 8, 8, 0.15, { priority: 4 });
    g.audio?.noise({ dur: 0.35, gain: 0.35, type: 'highpass', freq: 2500, sweep: 6000, q: 0.7 });
  }
  // ---------------------------------------------------------------- Battle Frenzy
  frenzy() {
    const g = this.game, p = this.p;
    this.frenzyT = 6 + this.up('frenzy');
    this.cast(0.4, true, { type: 'raise' });
    g.fx.shockwave(p.pos, RED, 3);
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 20, color: RED, speed: 4, up: 1.5, life: 0.5, size: 0.14, shape: 3 });
    g.audio?.tone({ freq: 140, to: 220, dur: 0.4, gain: 0.18, type: 'sawtooth', filter: 1000, rev: 0.3 });
  }
  // ---------------------------------------------------------------- Hold the Line
  holdLine() {
    const g = this.game, p = this.p;
    const dur = 4 + this.up('hold');
    this.holdT = dur; this.zapT = 0.2;
    p.barrierT = Math.max(p.barrierT ?? 0, dur);   // (player.js: half damage while it lasts)
    this.cast(0.5, true, { type: 'raise' });
    g.fx.shockwave(p.pos, VOLT, 5.5);
    zap(g, p.pos.clone().setY(p.pos.y + 9), p.pos.clone().setY(p.pos.y + 1.8), VOLT, 0.2, 0.2, 6);
    g.audio?.noise({ dur: 0.5, gain: 0.4, type: 'lowpass', freq: 3000, sweep: 100, rev: 0.4 });
  }
  // ---------------------------------------------------------------- Shield Bash
  bash() {
    const g = this.game, p = this.p, rk = this.rank('bash_up');
    p.facing = Math.atan2(p.aimDir.x, p.aimDir.z);
    p.action = { type: 'attack', step: { style: 'swingL', strike: 0.45, windup: 0.25, lunge: 8 }, style: 'swingL', dur: 0.4, elapsed: 0, t: 0, windup: 0.25, strike: 0.45, struck: true, moveScale: 0.2 };
    const arc = 0.9 + rk * 0.2, R = 3.6;
    setTimeout(() => {
      if (p.dead) return;
      const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
      let n = 0;
      for (const e of g.combat.query(p.pos, dir, R, arc)) {
        g.combat.damageEnemy(e, 20, p, { melee: true, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(9), stagger: 0.6 });
        stun(e, 1.4 + rk * 0.4); n++;
      }
      g.fx.slashArc(p.pos, p.facing, RED, R, arc / Math.PI, 0.25);
      g.fx.shockwave(p.pos.clone().addScaledVector(dir, 1.6), 0xc9963a, 2.6);
      g.particles.burst(tmp.copy(p.pos).addScaledVector(dir, 1.2).setY(p.pos.y + 1.2), { count: 16, color: 0xc9963a, speed: 6, life: 0.35, size: 0.1, shape: 3, dir, spread: 0.8 });
      g.combat.hitBlocks(p.pos, dir, R, arc, 30, p);
      if (n) { g.hitStop(0.07); g.shake(0.3); }
      g.audio?.impact(1.7, 'crit');
      g.audio?.tone({ freq: 400, to: 200, dur: 0.2, gain: 0.15, type: 'square', filter: 1500 });
    }, 140);
  }
  // ---------------------------------------------------------------- Ares's Fury
  furyStart(g) {
    const p = this.p;
    this.fury = true; this.furyT = 0;
    this.saved = { lifesteal: p.stats.lifesteal ?? 0, attackSpeed: p.stats.attackSpeed ?? 1 };
    p.stats.lifesteal = this.saved.lifesteal + 0.15;
    p.stats.attackSpeed = this.saved.attackSpeed * 1.25;
    p.rig.setGlow(new THREE.Color(0.35, 0.05, 0.0));
    this.light = g.lights.attach(p.object, FIRE, 7, 12, { offsetY: 2, priority: 7 });
    g.fx.shockwave(p.pos, FIRE, 8);
    // a ring of fire bursts out and sets everything near alight
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; g.particles.glow.emit(p.pos.x + Math.cos(a), p.pos.y + 0.3, p.pos.z + Math.sin(a), Math.cos(a) * 10, 1 + Math.random() * 2, Math.sin(a) * 10, 0.6, 3, 1, 0.2, 0.3, 0, 2, 0.6, 0); }
    for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < 6) { g.combat.damageEnemy(e, 16, p, { knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(8), stagger: 0.5 }); }
    g.fx.flash(0xff4a1a, 0.3, 0.2);
    g.audio?.tone({ freq: 90, to: 140, dur: 1, gain: 0.3, type: 'sawtooth', filter: 700, rev: 0.4 });
  }
  furyTick(g, d, dt) {
    const p = this.p;
    this.furyT += dt;
    // burning aura and a trail of embers
    for (let i = 0; i < 3; i++) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.9, p.pos.y + Math.random() * 2, p.pos.z + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5), 2 + Math.random() * 2, (Math.random() - 0.5), 0.5, 3, 0.9, 0.2, 0.2 + Math.random() * 0.15, -1, 1, 0.3, 0);
    if (Math.random() < 0.4) g.particles.smoke.emit(p.pos.x, p.pos.y + 1.8, p.pos.z, 0, 1.5, 0, 0.8, 0.25, 0.2, 0.2, 0.4, 0, 1, 1.4, 0);
    if (Math.random() < dt * 6) { const t = this.tip(); zap(g, t, t.clone().add(tmp.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)), FIRE, 0.08, 0.1, 3); }
    // scorched footsteps: monsters she runs past catch fire
    if ((this.trailT = (this.trailT ?? 0) - dt) <= 0) {
      this.trailT = 0.3;
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: FIRE, r0: 0.4, r1: 1.6, dur: 0.4, thick: 0.25 });
      for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < 1.8) burn(e, 2, 8, p, g);
    }
  }
  furyEnd(g) {
    const p = this.p;
    this.fury = false;
    if (this.saved) { p.stats.lifesteal = this.saved.lifesteal; p.stats.attackSpeed = this.saved.attackSpeed; this.saved = null; }
    p.rig.setGlow(new THREE.Color(0, 0, 0));
    if (this.light) { g.lights.remove(this.light); this.light = null; }
  }
  dispose() { super.dispose(); if (this.fury) this.furyEnd(this.game); }
}
registerKit('clarisse', ClarisseKit);

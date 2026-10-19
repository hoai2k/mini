// Annabeth Chase, daughter of Athena — a bronze dagger and a plan.
//   LMB  fast dagger combo; hits from behind are critical (x2).
//   RMB  Thrown Knife.
//   1    Yankees Cap: invisible for a few seconds — monsters lose track of
//        her — and the first hit out of hiding is a guaranteed critical.
//   2    Battle Plan: marks the aimed monster's weak point; it takes +50%
//        damage from the whole team.
//   3    Daedalus Trap: a bronze snare that roots the monsters that step on it.
//   Learned in the skill tree (any power can go in any of 1 · 2 · 3):
//        Flank: darts round behind the aimed monster and strikes (a critical).
//        Battle Orders: the heroes near her run faster and gain Power.
//        Bronze Automaton: a little sentry that throws knives at monsters.
//   F    Wisdom's Gambit: time slows, every monster in sight is marked and all
//        of the team's hits are critical.
import { t } from '../text_config.js';
import * as THREE from 'three/webgpu';
import { Kit, mark, root, teamBuff, clearBuff, makeDisc } from './kit.js';
import { registerKit } from './index.js';
import { RANGED, lifeOf } from '../combatRules.js';
import { angleDiff } from '../util.js';

const GOLD = 0xe0b04a, GREY = 0x8c96a3, NAVY = 0x1e2a4a, BLUEPRINT = 0x6ab4ff;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// The skill tree (and the new powers' numbers) is in skillRules.js.

// Bronze snare: a toothed ring that springs shut.
function trapMesh() {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardNodeMaterial({ color: 0xc9963a, roughness: 0.3, metalness: 0.85, emissive: 0x5a3a08, emissiveIntensity: 0.8 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 4, 16), bronze); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), bronze); plate.position.y = 0.05; g.add(plate);
  const teeth = [];
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const piv = new THREE.Group(); piv.position.set(Math.cos(a) * 0.62, 0.06, Math.sin(a) * 0.62); piv.rotation.y = -a; g.add(piv);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.08).translate(0, 0.16, 0), bronze); t.rotation.z = 1.2; piv.add(t);
    teeth.push(t);
  }
  for (const m of g.children) m.castShadow = true;
  g.userData.teeth = teeth;
  return g;
}

class AnnabethKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'punch', dur: 0.22, windup: 0.28, strike: 0.48, dmg: 9, range: 2.5, arc: 0.9, lunge: 8, knock: 2, stop: 0.035, shake: 0.1, trail: GOLD, sparkColor: 0xffe0a0, chainAt: 0.55 },
      { style: 'swingR', dur: 0.24, windup: 0.28, strike: 0.5, dmg: 10, range: 2.6, arc: 1.15, lunge: 6, knock: 2.5, stop: 0.04, shake: 0.12, trail: GOLD, sparkColor: 0xffe0a0, chainAt: 0.55 },
      { style: 'swingL', dur: 0.24, windup: 0.28, strike: 0.5, dmg: 10, range: 2.6, arc: 1.15, lunge: 6, knock: 2.5, stop: 0.04, shake: 0.12, trail: GREY, sparkColor: 0xe0e8f0, chainAt: 0.55 },
      { style: 'punch', dur: 0.36, windup: 0.32, strike: 0.5, dmg: 18, range: 2.9, arc: 0.8, lunge: 13, knock: 6, stop: 0.07, shake: 0.24, trail: GOLD, sparkColor: GOLD, stagger: 0.5 },
    ];
    this.p.stats.meleeMult *= 1 + r('blade') * 0.08;
    this.p.stats.crit += r('owl') * 0.04;
    this.slots = {
      ranged: this.ability({ name: t('powers.annabeth.ranged'), icon: '🔪', cd: 0.6, ce: 0, use: () => this.knife() }),
      ...this.equipSlots({
        cap: this.ability({ name: t('skills.annabeth.cap.name'), icon: '🧢', cd: 14, ce: 14, use: () => this.vanish() }),
        plan: this.ability({ name: t('skills.annabeth.plan.name'), icon: '🦉', cd: 9, ce: 12, use: () => this.plan() }),
        trap: this.ability({ name: t('skills.annabeth.trap.name'), icon: '⚙️', cd: 9, ce: 10, use: () => this.trap() }),
        flank: this.ability({ name: t('skills.annabeth.flank.name'), icon: '🌀', cd: 7, ce: 10, use: () => this.flank() }),
        orders: this.ability({ name: t('skills.annabeth.orders.name'), icon: '📜', cd: 16, ce: 12, use: () => this.orders() }),
        automaton: this.ability({ name: t('skills.annabeth.automaton.name'), icon: '🤖', cd: 16, ce: 16, use: () => this.automaton() }),
      }),
    };
    this.domain = {
      name: t('heroes.annabeth.power'), icon: '🦉', key: 'wisdom', world: false, sureHit: false, type: 0, color: GOLD, sound: 'resonance', flash: 0xeaf4ff,
      duration: 6 + r('gambit') * 1.5, radius: 22,
      onStart: (g, d) => this.gambitStart(g, d),
      onTick: (g, d, dt) => this.gambitTick(g, d, dt),
      onEnd: (g, d) => this.gambitEnd(g, d),
    };
    this.invisT = 0; this.ambushT = -1;
    this.traps = [];
  }
  // ---------------------------------------------------------------- crits
  outgoing(e, o) {
    const g = this.game, p = this.p;
    let m = 1;
    // first hit out of invisibility: guaranteed critical (covers the whole strike)
    if (this.invisT > 0) { this.reveal(); this.ambushT = g.time + 0.12; }
    const ambush = this.ambushT > g.time;
    let behind = false;
    if (o.melee && e.facing != null && !e.isDummy) {
      const from = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
      behind = Math.abs(angleDiff(e.facing, from)) > 1.9;
    }
    if ((ambush || behind) && !o.crit && !o.pjCrit) { m *= 2; o.pjCrit = true; }
    if (behind) m *= 1 + this.rank('backstab') * 0.25;
    if (ambush || behind) g.fx.hitSpark(tmp.copy(e.pos).setY(e.pos.y + (e.height ?? 1.5) * 0.6), null, { color: GOLD, crit: true });
    return m;
  }
  // ---------------------------------------------------------------- Thrown Knife
  knife() {
    const g = this.game, p = this.p;
    this.cast(0.24);
    const n = 1 + this.rank('knives'), R = RANGED.knife;
    // aimed in 3D (kit.js shotDir); a pair fans out to either side of it
    const aim = this.shotDir(this.handPos());
    const base = Math.atan2(aim.x, aim.z), pitch = Math.asin(Math.max(-1, Math.min(1, aim.y)));
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i - 0.5) * 0.14 : 0);
      const pr = g.projectiles.fire({ pos: this.handPos(), vel: new THREE.Vector3(Math.sin(a) * Math.cos(pitch), Math.sin(pitch), Math.cos(a) * Math.cos(pitch)).multiplyScalar(R.speed), team: 'player', dmg: 11, shape: 'nail', color: GOLD, emissive: 1.2, life: lifeOf(R), radius: 0.4, scale: 1.6,
        trail: (q) => { if (Math.random() < 0.6) g.particles.burst(q.pos, { count: 1, color: GOLD, speed: 0.2, life: 0.2, size: 0.07, shape: 3 }); },
        onHit: (e, q) => { g.combat.damageEnemy(e, 11, p, { knock: q.vel.clone().setY(0).setLength(R.knock), stagger: 0.2 }); g.fx.hitSpark(q.pos, null, { color: GOLD }); } });
      if (!pr) return false;
    }
    g.audio?.energy('nail');
    g.audio?.whoosh(0.5);
  }
  // ---------------------------------------------------------------- Yankees Cap
  vanish() {
    const g = this.game, p = this.p;
    this.invisT = 5 + this.rank('cap_up') * 1.5;
    p.untargetable = true;
    p.rig.setDissolve(0.82);
    for (const k of ['weapon', 'cap']) if (p.rig.extras[k]) p.rig.extras[k].visible = false;
    p.heroLight.intensity = 0.3;
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 24, color: 0xdde6f0, additive: false, speed: 2.5, life: 0.6, size: 0.4, drag: 3, sizeEnd: 1.5 });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: NAVY, r0: 1.4, r1: 0.2, dur: 0.35, thick: 0.3 });
    g.audio?.tone({ freq: 900, to: 300, dur: 0.35, gain: 0.08, type: 'sine', rev: 0.5 });
    // monsters forget her right away
    for (const e of g.enemies) if (e.target === p) e.target = null;
  }
  reveal() {
    const g = this.game, p = this.p;
    if (this.invisT <= 0) return;
    this.invisT = 0;
    p.untargetable = false;
    p.rig.setDissolve(0);
    for (const k of ['weapon', 'cap']) if (p.rig.extras[k]) p.rig.extras[k].visible = true;
    p.heroLight.intensity = 1.6;
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 12, color: GOLD, speed: 3, life: 0.4, size: 0.1, shape: 3 });
  }
  tick(dt) {
    const g = this.game, p = this.p;
    if (this.invisT > 0) {
      this.invisT -= dt;
      if (Math.random() < dt * 8) g.particles.glow.emit(p.pos.x + (Math.random() - 0.5) * 0.6, p.pos.y + Math.random() * 1.9, p.pos.z + (Math.random() - 0.5) * 0.6, 0, 0.3, 0, 0.5, 0.5, 0.6, 0.8, 0.08, 0, 1, 0.1, 1);
      if (this.invisT <= 0 || p.downed || p.dead) { this.invisT = 0.001; this.reveal(); }
    }
    // traps
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i];
      tr.t += dt;
      if (!tr.sprung) {
        tr.mesh.rotation.y += dt * 0.6;
        if (Math.random() < dt * 3) g.particles.glow.emit(tr.pos.x, tr.pos.y + 0.15, tr.pos.z, 0, 0.6, 0, 0.5, 2.2, 1.6, 0.5, 0.08, 0, 1, 0.1, 3);
        const trig = g.enemies.find((e) => !e.dead && !e.isDummy && Math.hypot(e.pos.x - tr.pos.x, e.pos.z - tr.pos.z) < 1.1 + e.radius && Math.abs(e.pos.y - tr.pos.y) < 1.5);
        if (trig) this.spring(tr);
        else if (tr.t > 25) { g.scene.remove(tr.mesh); this.traps.splice(i, 1); }
      } else {
        const k = Math.min(1, (tr.t - tr.sprungAt) / 0.12);
        for (const t of tr.mesh.userData.teeth) t.rotation.z = 1.2 * (1 - k) - 0.15 * k;
        if (tr.t - tr.sprungAt > tr.hold) { g.scene.remove(tr.mesh); this.traps.splice(i, 1); }
      }
    }
  }
  // ---------------------------------------------------------------- Battle Plan
  plan() {
    const g = this.game, p = this.p, rk = this.rank('plan_up');
    const e = this.targetInAim(16, 0.5);
    if (!e) { g.audio?.ui('back'); return false; }
    this.cast(0.3);
    mark(e, 8 + rk * 2, g, rk * 0.1);
    const at = tmp.copy(e.pos).setY(e.pos.y + (e.height ?? 1.5) * 0.6).clone();
    const from = this.handPos();
    const d = tmp2.subVectors(at, from); const len = d.length();
    g.fx.slashLine(from, d.normalize(), len, GOLD, 0.08, 0.35);
    g.fx.slashX(at, 1.4 + (e.height ?? 1.5) * 0.3, GOLD);
    g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + 0.08, e.pos.z), { color: GOLD, r0: 2.4, r1: 0.6, dur: 0.4, thick: 0.15 });
    g.audio?.tone({ freq: 660, dur: 0.1, gain: 0.08, type: 'triangle' });
    g.audio?.tone({ freq: 990, dur: 0.18, gain: 0.08, type: 'triangle', at: 0.08 });
    g.toast?.(t('kit.annabeth.weakPoint'));
  }
  // ---------------------------------------------------------------- Daedalus Trap
  trap() {
    const g = this.game, p = this.p;
    const to = p.aimPoint.clone(); tmp.subVectors(to, p.pos).setY(0);
    if (tmp.length() > 7) to.copy(p.pos).addScaledVector(tmp.normalize(), 7);
    const gy = this.groundAt(to.x, to.z, p.pos.y + 2);
    if (gy == null || Math.abs(gy - p.pos.y) > 3) { g.audio?.ui('back'); return false; }
    to.y = gy;
    while (this.traps.filter((t) => !t.sprung).length >= 2) { const old = this.traps.find((t) => !t.sprung); g.scene.remove(old.mesh); this.traps.splice(this.traps.indexOf(old), 1); }
    this.cast(0.3);
    const mesh = trapMesh(); mesh.position.copy(to); g.scene.add(mesh);
    this.traps.push({ pos: to, mesh, t: 0, sprung: false, hold: 0 });
    g.fx.rings.spawn(tmp.set(to.x, to.y + 0.06, to.z), { color: GOLD, r0: 0.2, r1: 1.4, dur: 0.3, thick: 0.2 });
    g.audio?.tone({ freq: 400, to: 700, dur: 0.12, gain: 0.08, type: 'square', filter: 2000 });
  }
  spring(tr) {
    const g = this.game, p = this.p, rk = this.rank('trap_up');
    tr.sprung = true; tr.sprungAt = tr.t; tr.hold = 2.8 + rk * 0.8;
    const R = 2.6;
    for (const e of g.enemies) {
      if (e.dead || Math.hypot(e.pos.x - tr.pos.x, e.pos.z - tr.pos.z) > R + e.radius) continue;
      g.combat.damageEnemy(e, 18 + rk * 8, p, { stagger: 0.4, knock: null });
      root(e, tr.hold);
    }
    g.fx.shockwave(tr.pos, GOLD, R + 0.5);
    g.particles.burst(tmp.copy(tr.pos).setY(tr.pos.y + 0.3), { count: 20, color: GOLD, speed: 6, up: 1.2, life: 0.4, size: 0.1, shape: 3, gravity: 10 });
    g.shake(0.2); g.hitStop(0.04);
    g.audio?.tone({ freq: 1600, to: 500, dur: 0.12, gain: 0.12, type: 'square', filter: 4000 });
    g.audio?.impact(1.2, 'crit');
  }
  // ---------------------------------------------------------------- Flank
  // Round the back of the aimed monster in a blink of grey and a stab: the
  // hit counts as an ambush (a critical).
  flank() {
    const g = this.game, p = this.p, rk = this.up('flank'), w = g.world;
    const e = this.targetInAim(9, 0.5);
    if (!e) { g.audio?.ui('back'); return false; }
    // behind the monster (where it isn't facing), or beside it if that's a wall
    const f = e.facing ?? Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z) + Math.PI, d = (e.radius ?? 0.5) + 1;
    let to = null;
    for (const a of [f + Math.PI, f + Math.PI * 0.6, f - Math.PI * 0.6]) {
      const x = e.pos.x + Math.sin(a) * d, z = e.pos.z + Math.cos(a) * d, gy = w.groundBelow(x, z, e.pos.y + 1.5);
      if (isFinite(gy) && Math.abs(gy - e.pos.y) < 1.6 && !w.solidAt(x, gy + 0.5, z) && !w.solidAt(x, gy + 1.5, z)) { to = new THREE.Vector3(x, gy, z); break; }
    }
    if (!to) { g.audio?.ui('back'); return false; }
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 16, color: 0xdde6f0, additive: false, speed: 2, life: 0.4, size: 0.3, drag: 3, sizeEnd: 1.2 });
    p.pos.copy(to); p.vel.set(0, 0, 0); p.visY = p.pos.y; p.object.position.copy(p.pos);
    p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    p.aimDir.set(Math.sin(p.facing), 0, Math.cos(p.facing));
    p.iframes = Math.max(p.iframes, 0.3);
    p.action = { type: 'attack', step: { style: 'punch', strike: 0.4, windup: 0.2 }, style: 'punch', dur: 0.32, elapsed: 0, t: 0, windup: 0.2, strike: 0.4, struck: true, moveScale: 0.2 };
    this.ambushT = g.time + 0.12;
    g.combat.damageEnemy(e, 24 + rk * 10, p, { melee: true, stagger: 0.6, knock: tmp2.set(Math.sin(p.facing), 0, Math.cos(p.facing)).multiplyScalar(3) });
    this.ambushT = -1;
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 1), { count: 10, color: GOLD, speed: 3, life: 0.3, size: 0.1, shape: 3 });
    g.hitStop(0.05);
    g.audio?.whoosh(0.9);
    g.audio?.tone({ freq: 1200, to: 1700, dur: 0.1, gain: 0.07, type: 'triangle' });
  }
  // ---------------------------------------------------------------- Battle Orders
  orders() {
    const g = this.game, p = this.p, rk = this.up('orders');
    const dur = 6 + rk, power = 10 + rk * 5;
    this.cast(0.5, true, { type: 'raise' });
    for (const h of g.players) {
      if (h.dead || h.downed || h.pos.distanceTo(p.pos) > 10) continue;
      h.speedBuff = h.speedBuffT > 0 ? Math.max(h.speedBuff ?? 0, 0.3) : 0.3; h.speedBuffT = Math.max(h.speedBuffT ?? 0, dur);   // (player.js: +30% speed)
      h.gainCE?.(power);
      g.particles.burst(tmp.copy(h.pos).setY(h.pos.y + 1.2), { count: 12, color: BLUEPRINT, speed: 2.5, up: 2, life: 0.6, size: 0.12, shape: 3 });
      g.fx.rings.spawn(tmp.set(h.pos.x, h.pos.y + 0.08, h.pos.z), { color: GOLD, r0: 1.4, r1: 0.4, dur: 0.4, thick: 0.18 });
    }
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: BLUEPRINT, r0: 0.5, r1: 10, dur: 0.6, thick: 0.06 });
    g.audio?.tone({ freq: 523, dur: 0.12, gain: 0.08, type: 'triangle' });
    g.audio?.tone({ freq: 659, dur: 0.12, gain: 0.08, type: 'triangle', at: 0.1 });
    g.audio?.tone({ freq: 784, dur: 0.25, gain: 0.08, type: 'triangle', at: 0.2 });
    g.toast?.(t('kit.annabeth.orders'));
  }
  // ---------------------------------------------------------------- Bronze Automaton
  // One sentry at a time: a bronze drum with a turning head that throws
  // knives at the nearest monster it can reach.
  automaton() {
    const g = this.game, p = this.p, rk = this.up('automaton');
    const to = p.aimPoint.clone(); tmp.subVectors(to, p.pos).setY(0);
    if (tmp.length() > 5) to.copy(p.pos).addScaledVector(tmp.normalize(), 5);
    const gy = this.groundAt(to.x, to.z, p.pos.y + 2);
    if (gy == null || Math.abs(gy - p.pos.y) > 3) { g.audio?.ui('back'); return false; }
    to.y = gy;
    this.sentry?.end();
    this.cast(0.3);
    const bronze = new THREE.MeshStandardNodeMaterial({ color: 0xc9963a, roughness: 0.3, metalness: 0.85, emissive: 0x5a3a08, emissiveIntensity: 0.8 });
    const grp = new THREE.Group(); grp.position.copy(to);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.7, 8).translate(0, 0.35, 0), bronze); body.castShadow = true; grp.add(body);
    const head = new THREE.Group(); head.position.y = 0.8; grp.add(head);
    const hm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.36), bronze); hm.castShadow = true; head.add(hm);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), new THREE.MeshBasicNodeMaterial({ color: 0x9ad8ff })); eye.position.set(0, 0.02, 0.19); head.add(eye);
    g.scene.add(grp);
    g.fx.rings.spawn(tmp.set(to.x, to.y + 0.06, to.z), { color: GOLD, r0: 0.2, r1: 1.6, dur: 0.3, thick: 0.2 });
    g.audio?.tone({ freq: 300, to: 600, dur: 0.15, gain: 0.08, type: 'square', filter: 1800 });
    const dur = 8 + rk * 2, dmg = 9 + rk * 3;
    let t = 0, shotT = 0.4, alive = true;
    const end = () => { if (!alive) return; alive = false; g.scene.remove(grp); body.geometry.dispose(); hm.geometry.dispose(); eye.geometry.dispose(); g.particles.burst(tmp.copy(to).setY(to.y + 0.6), { count: 10, color: GOLD, speed: 3, life: 0.4, size: 0.1, shape: 3 }); if (this.sentry?.end === end) this.sentry = null; };
    this.sentry = { end };
    g.addUpdater((dt) => {
      if (!alive) return false;
      t += dt; shotT -= dt;
      const e = g.nearestEnemy(to, RANGED.sentry.seek);
      if (e) head.rotation.y = Math.atan2(e.pos.x - to.x, e.pos.z - to.z);
      else head.rotation.y += dt;
      if (e && shotT <= 0) {
        shotT = 0.7;
        const from = tmp.set(to.x, to.y + 0.85, to.z).clone(), aim = tmp2.set(e.pos.x - from.x, e.pos.y + (e.height ?? 1.5) * 0.5 - from.y, e.pos.z - from.z).normalize();
        g.projectiles.fire({ pos: from, vel: aim.multiplyScalar(RANGED.sentry.speed), team: 'player', dmg, shape: 'nail', color: GOLD, emissive: 1.2, life: lifeOf(RANGED.sentry), radius: 0.4, scale: 1.4,
          onHit: (h, q) => { g.combat.damageEnemy(h, dmg, p, { knock: q.vel.clone().setY(0).setLength(RANGED.sentry.knock), stagger: 0.15 }); g.fx.hitSpark(q.pos, null, { color: GOLD }); } });
        g.audio?.tone({ freq: 900, to: 600, dur: 0.05, gain: 0.04, type: 'square', filter: 2500 });
      }
      if (t >= dur || p.dead) { end(); return false; }
      return true;
    });
  }
  // ---------------------------------------------------------------- Wisdom's Gambit
  gambitStart(g, d) {
    const p = this.p;
    g.slowMo(d.def.duration, 0.55);
    teamBuff(g, 'gambit', 999);
    const disc = makeDisc(BLUEPRINT, { rings: 16, speed: 0.25, spokes: 12, intensity: 1.2 });
    g.scene.add(disc); this.plan_ = { disc, t: 0, lineT: 0 };
    g.fx.flash(0xeaf4ff, 0.5, 0.3);
    g.fx.chroma(0.8);
    this.markAll(g, d);
    g.audio?.tone({ freq: 523, dur: 1.2, gain: 0.08, type: 'triangle', rev: 0.6 });
    g.audio?.tone({ freq: 784, dur: 1.2, gain: 0.06, type: 'triangle', rev: 0.6, at: 0.15 });
  }
  markAll(g, d) {
    const p = this.p;
    for (const e of g.enemies) {
      if (e.dead || e.pos.distanceTo(p.pos) > d.def.radius) continue;
      if (!(e.pjMarkT > g.time)) {
        mark(e, 6, g, this.rank('plan_up') * 0.1);
        const at = e.pos.clone().setY(e.pos.y + (e.height ?? 1.5) * 0.6);
        g.fx.slashX(at, 1.2 + (e.height ?? 1.5) * 0.3, GOLD);
      } else e.pjMarkT = Math.max(e.pjMarkT, g.time + 2);
    }
  }
  gambitTick(g, d, dt) {
    const s = this.plan_; if (!s) return;
    const p = this.p;
    s.t += dt; s.lineT -= dt;
    s.disc.position.set(p.pos.x, p.pos.y + 0.07, p.pos.z);
    s.disc.scale.setScalar(Math.min(1, s.t * 3) * 14);
    s.disc.userData.alpha.value = 0.55;
    // battle lines: gold strategy lines from Annabeth to every marked monster
    if (s.lineT <= 0) {
      s.lineT = 0.25;
      this.markAll(g, d);
      const from = p.pos.clone().setY(p.pos.y + 0.15);
      for (const e of g.enemies) {
        if (e.dead || !(e.pjMarkT > g.time) || e.pos.distanceTo(p.pos) > d.def.radius) continue;
        const to = e.pos.clone().setY(e.pos.y + 0.15);
        const dir = tmp.subVectors(to, from); const len = dir.length(); if (len < 0.5) continue;
        g.fx.slashLine(from, dir.normalize(), len, BLUEPRINT, 0.05, 0.3);
        g.fx.rings.spawn(tmp2.set(e.pos.x, e.pos.y + 0.07, e.pos.z), { color: BLUEPRINT, r0: 1.2, r1: 1.0, dur: 0.3, thick: 0.15 });
      }
    }
    if (Math.random() < 0.5) { const a = Math.random() * Math.PI * 2, r = Math.random() * 12; g.particles.glow.emit(p.pos.x + Math.cos(a) * r, p.pos.y + 0.1, p.pos.z + Math.sin(a) * r, 0, 0.6, 0, 1, 0.8, 1.6, 2.6, 0.1, 0, 1, 0.05, 1); }
  }
  gambitEnd(g) {
    clearBuff(g, 'gambit');
    g.slowmo = 0;
    if (this.plan_) { g.scene.remove(this.plan_.disc); this.plan_ = null; }
  }
  dispose() { super.dispose(); this.sentry?.end(); this.reveal(); for (const t of this.traps) this.game.scene.remove(t.mesh); this.traps = []; if (this.plan_) this.gambitEnd(this.game); }
}
registerKit('annabeth', AnnabethKit);

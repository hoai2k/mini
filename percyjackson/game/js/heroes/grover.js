// Grover Underwood, satyr protector — reed pipes and the wild.
//   LMB  reed-pipe whacks and a hoof kick.
//   RMB  Pipe Song: a bouncing bolt of green music notes.
//   1    Tangle Vines: blocky vines burst from the ground and root monsters.
//   2    Calming Song: heals every hero near him over a few seconds and
//        slows monsters.
//   3    Maia!: winged sneakers carry him in a short flight over gaps and
//        monsters (untouchable in the air).
//   Learned in the skill tree (any power can go in any of 1 · 2 · 3):
//        Briar Burst: thorns all round him hurt, slow and push monsters back.
//        Lullaby: monsters near him fall asleep (bosses slow down).
//        Tin-Can Snack: health and Power back.
//   F    Panic: the voice of Pan — every monster flees from Grover in terror
//        and takes damage as it runs.
import { t } from '../text_config.js';
import * as THREE from 'three/webgpu';
import { Kit, root, slow, fear, stun, makeDisc } from './kit.js';
import { registerKit } from './index.js';
import { RANGED, lifeOf } from '../combatRules.js';

const GREEN = 0x5fae4a, LEAF = 0x9ad85a, NOTE = 0x8aff9a, PAN = 0x2e8b6e;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
// pentatonic reed-pipe notes
const SCALE = [587, 659, 784, 880, 988, 1175, 1319];

// The skill tree (and the new powers' numbers) is in skillRules.js.

const vineMat = () => new THREE.MeshStandardNodeMaterial({ color: 0x3f8a2e, roughness: 0.8, emissive: 0x0a2a06, emissiveIntensity: 0.6 });
const leafMat = () => new THREE.MeshStandardNodeMaterial({ color: 0x7acb4a, roughness: 0.7, emissive: 0x1a4a0a, emissiveIntensity: 0.6 });
const VINE_GEO = new THREE.BoxGeometry(0.16, 1, 0.16).translate(0, 0.5, 0), LEAF_GEO = new THREE.BoxGeometry(0.22, 0.06, 0.16);

class GroverKit extends Kit {
  constructor(p) {
    super(p);
    const r = (id) => this.rank(id);
    this.combo = [
      { style: 'swingL', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 11, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.14, trail: LEAF, sparkColor: 0xd8ffb0 },
      { style: 'swingR', dur: 0.3, windup: 0.3, strike: 0.52, dmg: 12, range: 2.6, arc: 1.2, lunge: 6, knock: 3.5, stop: 0.045, shake: 0.15, trail: LEAF, sparkColor: 0xd8ffb0 },
      { style: 'uppercut', dur: 0.46, windup: 0.32, strike: 0.52, dmg: 20, range: 2.8, arc: 1.0, lunge: 5, knock: 10, stop: 0.08, shake: 0.3, trail: GREEN, sparkColor: 0xffe0a0, stagger: 0.6, hoof: true },
    ];
    this.p.stats.meleeMult += r('hooves') * 0.08;
    this.slots = {
      ranged: this.ability({ name: t('powers.grover.ranged'), icon: '🎵', cd: 0.5, ce: 0, use: () => this.songBolt() }),
      ...this.equipSlots({
        vines: this.ability({ name: t('skills.grover.vines.name'), icon: '🌿', cd: 10, ce: 14, use: () => this.vines() }),
        calm: this.ability({ name: t('skills.grover.calm.name'), icon: '🎶', cd: 16, ce: 18, use: () => this.calm() }),
        maia: this.ability({ name: t('skills.grover.maia.name'), icon: '🪽', cd: 6, ce: 8, use: () => this.maia() }),
        briar: this.ability({ name: t('skills.grover.briar.name'), icon: '🌵', cd: 8, ce: 12, use: () => this.briar() }),
        lullaby: this.ability({ name: t('skills.grover.lullaby.name'), icon: '💤', cd: 14, ce: 16, use: () => this.lullaby() }),
        snack: this.ability({ name: t('skills.grover.snack.name'), icon: '🥫', cd: 20, ce: 0, use: () => this.snack() }),
      }),
    };
    this.domain = {
      name: t('heroes.grover.power'), icon: '🐐', key: 'panic', world: false, sureHit: false, type: 0, color: PAN, sound: 'garden', flash: 0x9aff7a,
      duration: 5 + r('panic'), radius: 26,
      onStart: (g, d) => this.panicStart(g, d),
      onTick: (g, d, dt) => this.panicTick(g, d, dt),
      onEnd: (g) => this.panicEnd(g),
    };
    this.vm = vineMat(); this.lm = leafMat();
    this.noteI = 0;
  }
  note(gain = 0.07, dur = 0.22, at = 0) {
    const f = SCALE[(this.noteI = (this.noteI + 1 + Math.floor(Math.random() * 3)) % SCALE.length)];
    this.game.audio?.tone({ freq: f, dur, gain, type: 'triangle', attack: 0.02, rev: 0.4, at });
    this.game.audio?.tone({ freq: f * 2, dur: dur * 0.7, gain: gain * 0.25, type: 'sine', attack: 0.02, rev: 0.4, at });
  }
  onMeleeHit(e, step) {
    if (step.hoof && !e.isBoss && !e.isDummy) e.vel.y = Math.max(e.vel.y, 6);
  }
  // ---------------------------------------------------------------- Pipe Song
  songBolt() {
    const g = this.game, p = this.p;
    this.cast(0.28);
    const dmg = 9 + this.rank('pipes') * 3, R = RANGED.note;
    const target = this.targetInAim(R.seek, 0.75);
    let wob = Math.random() * 6, lastWob = 0;
    const from = this.handPos();
    // aimed in 3D at the note's target (or as kit.js shotDir sees it)
    const dir = target ? this.shotDir(from, undefined, { target, point: this.clearPoint(from, target) }) : this.shotDir(from);
    const pr = g.projectiles.fire({ pos: from, vel: dir.multiplyScalar(R.speed), team: 'player', dmg, shape: 'orb', color: NOTE, life: lifeOf(R), light: 3, scale: 0.9, homing: target ? 3 : 0, target,
      trail: (q, dt) => {
        // the note bobs on its way (on top of its climb or dip and its homing)
        wob += (dt ?? 0.016) * 14;
        const w = Math.sin(wob) * 2.4; q.vel.y += w - lastWob; lastWob = w;
        if (Math.random() < 0.7) g.particles.glow.emit(q.pos.x, q.pos.y, q.pos.z, (Math.random() - 0.5), 0.8 + Math.random(), (Math.random() - 0.5), 0.6, 0.8, 2.6, 1.0, 0.16, -0.5, 1, 0.12, Math.random() < 0.5 ? 2 : 3);
      },
      onHit: (e, q) => { g.combat.damageEnemy(e, dmg, p, { knock: q.vel.clone().setY(0).setLength(R.knock), stagger: 0.25 }); g.fx.hitSpark(q.pos, null, { color: NOTE }); } });
    if (!pr) return false;
    this.note();
  }
  // ---------------------------------------------------------------- Tangle Vines
  vines() {
    const g = this.game, p = this.p, rk = this.rank('vines_up');
    const to = p.aimPoint.clone(); tmp.subVectors(to, p.pos).setY(0);
    if (tmp.length() > 9) to.copy(p.pos).addScaledVector(tmp.normalize(), 9);
    const gy = this.groundAt(to.x, to.z, p.pos.y + 3);
    to.y = gy ?? p.pos.y;
    this.cast(0.45, true);
    const R = 3.2 + rk * 0.5, hold = 2.6 + rk * 0.6;
    const grp = new THREE.Group(); grp.position.copy(to); g.scene.add(grp);
    // a thicket of blocky vines: each a stack of segments that curls upwards
    const vines = [];
    const N = 16 + rk * 4;
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
      const v = new THREE.Group(); v.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); v.rotation.y = Math.random() * 6;
      let parent = v; const h = 0.35 + Math.random() * 0.35;
      for (let s = 0; s < 4; s++) {
        const seg = new THREE.Group(); seg.position.y = s ? h : 0; seg.rotation.z = (Math.random() - 0.5) * 0.7; seg.rotation.x = (Math.random() - 0.5) * 0.7;
        const m = new THREE.Mesh(VINE_GEO, this.vm); m.scale.y = h; m.castShadow = true; seg.add(m);
        if (Math.random() < 0.6) { const l = new THREE.Mesh(LEAF_GEO, this.lm); l.position.set(0.12, h * 0.6, 0); l.rotation.z = 0.5; seg.add(l); }
        parent.add(seg); parent = seg;
      }
      v.scale.setScalar(0.01);
      grp.add(v); vines.push(v);
    }
    const caught = [];
    for (const e of g.enemies) {
      if (e.dead || Math.hypot(e.pos.x - to.x, e.pos.z - to.z) > R + e.radius || Math.abs(e.pos.y - to.y) > 2.5) continue;
      g.combat.damageEnemy(e, 12 + rk * 4, p, { stagger: 0.3 });
      if (root(e, hold)) caught.push(e); else slow(e, hold);
    }
    // vines wrapped around every rooted monster
    for (const e of caught) {
      const wrap = new THREE.Group(); wrap.position.set(e.pos.x - to.x, e.pos.y - to.y, e.pos.z - to.z);
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(VINE_GEO, this.vm); m.scale.set(1, 1.1 + Math.random() * 0.6, 1);
        const a = k / 4 * Math.PI * 2; m.position.set(Math.cos(a) * (e.radius + 0.08), 0, Math.sin(a) * (e.radius + 0.08)); m.rotation.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4);
        wrap.add(m);
      }
      wrap.scale.setScalar(0.01); grp.add(wrap); vines.push(wrap);
    }
    g.fx.shockwave(to, LEAF, R + 0.5);
    g.particles.burst(tmp.copy(to).setY(to.y + 0.3), { count: 30, color: 0x5a8a3a, additive: false, speed: 5, up: 1.5, life: 0.7, size: 0.18, gravity: 10, shape: 1 });
    g.audio?.noise({ dur: 0.5, gain: 0.35, type: 'lowpass', freq: 400, sweep: 1600, attack: 0.05 });
    this.note(0.06, 0.3); this.note(0.05, 0.3, 0.1);
    let t = 0, tick = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      const grow = Math.min(1, t / 0.3), shrink = t > hold ? Math.max(0.01, 1 - (t - hold) / 0.35) : 1;
      for (const v of vines) v.scale.setScalar(Math.max(0.01, grow * shrink));
      if (tick <= 0 && t < hold) {
        tick = 0.5;
        // anything walking into the thicket is caught too
        for (const e of g.enemies) {
          if (e.dead || Math.hypot(e.pos.x - to.x, e.pos.z - to.z) > R || Math.abs(e.pos.y - to.y) > 2.5) continue;
          if (!(e.sealT > 0)) root(e, Math.max(0.6, hold - t));
          g.combat.damageEnemy(e, 3, p, { stagger: 0, ceGain: 0.5 });
        }
      }
      if (t > hold + 0.4) { g.scene.remove(grp); return false; }
      return true;
    });
  }
  // ---------------------------------------------------------------- Calming Song
  calm() {
    const g = this.game, p = this.p, rk = this.rank('song');
    this.cast(0.6, true, { type: 'raise' });
    const dur = 4, R = 9, heal = 3 + rk;
    const disc = makeDisc(NOTE, { rings: 5, speed: 0.4, spokes: 7, intensity: 1 });
    g.scene.add(disc);
    let t = 0, tick = 0, n = 0;
    g.addUpdater((dt) => {
      t += dt; tick -= dt;
      disc.position.set(p.pos.x, p.pos.y + 0.07, p.pos.z);
      disc.scale.setScalar(R * Math.min(1, t * 4));
      disc.userData.alpha.value = Math.min(1, (dur - t) * 2) * 0.55;
      // notes drifting up around Grover
      if (Math.random() < 0.6) { const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 2.5; g.particles.glow.emit(p.pos.x + Math.cos(a) * r, p.pos.y + 1 + Math.random(), p.pos.z + Math.sin(a) * r, 0, 1.2, 0, 1.1, 0.8, 2.6, 1.0, 0.2, -0.2, 0.5, 0.15, Math.random() < 0.5 ? 2 : 3); }
      if (tick <= 0) {
        tick = 0.5; n++;
        this.note(0.06, 0.4);
        for (const h of g.hostileTargets()) {
          if (h.dead || h.downed || h.pos.distanceTo(p.pos) > R) continue;
          if (h.heal) h.heal(h.maxHp * heal / 100 + 1, n % 2 === 0); else h.hp = Math.min(h.maxHp, h.hp + 4);
          if (this.rank('empathy')) h.gainCE?.(2);
          g.particles.burst(tmp.copy(h.pos).setY(h.pos.y + 1.2), { count: 4, color: NOTE, speed: 1, up: 2.5, life: 0.7, size: 0.16, shape: 2 });
        }
        for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < R) { slow(e, 0.8); if (!e.isBoss && e.state === 'windup' && Math.random() < 0.3) { e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.8; } }
        g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: NOTE, r0: 0.6, r1: R, dur: 1, thick: 0.05 });
      }
      if (t >= dur) { g.scene.remove(disc); return false; }
      return true;
    });
  }
  // ---------------------------------------------------------------- Maia!
  maia() {
    const g = this.game, p = this.p, w = g.world, rk = this.rank('maia_up');
    const range = 9 + rk * 2;
    const dir = p.aimDir.clone().setY(0).normalize();
    const start = p.pos.clone();
    const fly = start.y + 2.2;
    // furthest landing spot along the line with clear air above the path
    let dest = null;
    for (let s = 1; s <= range; s += 0.5) {
      const x = start.x + dir.x * s, z = start.z + dir.z * s;
      if (w.solidAt(x, fly, z) || w.solidAt(x, fly + 1, z)) break;
      const gy = w.groundBelow(x, z, fly);
      if (isFinite(gy) && gy > start.y - 4 && gy < fly - 0.5 && !w.solidAt(x, gy + 0.5, z) && !w.solidAt(x, gy + 1.5, z)) dest = new THREE.Vector3(x, gy, z);
    }
    if (!dest || dest.distanceTo(start) < 1.5) { g.audio?.ui('back'); return false; }
    const dur = 0.5 + dest.distanceTo(start) * 0.025;
    const wings = p.rig.extras.wings ?? [];
    for (const wg of wings) wg.visible = true;
    p.invulnerable = true; p.iframes = Math.max(p.iframes, dur + 0.1);
    p.action = { type: 'cast', dur, elapsed: 0, t: 0, moveScale: 0, lock: true, hold: true, cancelable: false, both: true };
    p.facing = Math.atan2(dir.x, dir.z);
    g.audio?.tone({ freq: 700, to: 1400, dur: 0.3, gain: 0.08, type: 'sine', rev: 0.3 });
    g.audio?.whoosh(1);
    g.particles.burst(tmp.copy(start).setY(start.y + 0.3), { count: 14, color: 0xffffff, additive: false, speed: 3, up: 0.6, life: 0.6, size: 0.25, drag: 3, sizeEnd: 1 });
    let t = 0;
    g.addUpdater((dt) => {
      t += dt;
      const k = Math.min(1, t / dur);
      const peak = Math.max(1.8, fly - Math.max(start.y, dest.y) + 0.8);
      p.pos.set(start.x + (dest.x - start.x) * k, start.y + (dest.y - start.y) * k + Math.sin(k * Math.PI) * peak, start.z + (dest.z - start.z) * k);
      p.vel.set(0, 0, 0); p.visY = p.pos.y;
      p.object.position.copy(p.pos);
      for (const wg of wings) for (const f of wg.children) f.rotation.y = f.userData.side * (0.3 + Math.sin(t * 40) * 0.6);
      if (Math.random() < 0.7) g.particles.glow.emit(p.pos.x, p.pos.y + 0.1, p.pos.z, 0, -0.5, 0, 0.5, 1.6, 1.6, 1.6, 0.14, 2, 1, 0.05, 1);
      if (k < 1 && !p.dead) return true;
      for (const wg of wings) wg.visible = false;
      p.invulnerable = false; p.action = null;
      // hoof stomp on landing
      const dmg = 14 + rk * 8;
      const n = g.combat.aoe(p.pos, 2.4, dmg, p, { knock: 7, stagger: 0.5, melee: true });
      g.fx.shockwave(p.pos, LEAF, 2.8); g.fx.landDust(p.pos, 14);
      if (n) { g.shake(0.2); g.audio?.impact(1.1); }
      return false;
    });
  }
  // ---------------------------------------------------------------- Briar Burst
  // A get-off-me ring of thorns round Grover.
  briar() {
    const g = this.game, p = this.p, rk = this.up('briar');
    const R = 4.5 + rk * 0.5;
    this.cast(0.4, true);
    for (const e of g.enemies) {
      if (e.dead || e.pos.distanceTo(p.pos) > R + e.radius) continue;
      g.combat.damageEnemy(e, 22 + rk * 9, p, { stagger: 0.5, knock: tmp.subVectors(e.pos, p.pos).setY(0).setLength(9) });
      slow(e, 3);
    }
    // the thorns: dark green spikes thrown outwards
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2, r = 0.6 + Math.random() * 0.4;
      g.particles.glow.emit(p.pos.x + Math.cos(a) * r, p.pos.y + 0.3, p.pos.z + Math.sin(a) * r, Math.cos(a) * R * 2.2, 1 + Math.random() * 2, Math.sin(a) * R * 2.2, 0.4, 0.35, 0.9, 0.25, 0.16, 6, 1.4, 0.1, 3);
    }
    g.fx.shockwave(p.pos, LEAF, R + 0.5);
    g.particles.burst(tmp.copy(p.pos).setY(p.pos.y + 0.3), { count: 24, color: 0x3f6a2a, additive: false, speed: 7, up: 1, life: 0.6, size: 0.16, gravity: 12, shape: 1 });
    g.shake(0.2);
    g.audio?.noise({ dur: 0.35, gain: 0.35, type: 'highpass', freq: 1200, sweep: 3000, q: 0.7 });
    this.note(0.06, 0.2);
  }
  // ---------------------------------------------------------------- Lullaby
  // A slow, sleepy tune: monsters nearby stop where they are and doze off.
  lullaby() {
    const g = this.game, p = this.p, rk = this.up('lullaby');
    const R = 6 + rk, hold = 2.5 + rk * 0.5;
    this.cast(0.7, true, { type: 'raise' });
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || e.pos.distanceTo(p.pos) > R + e.radius) continue;
      if (stun(e, hold)) { n++; g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + (e.height ?? 1.5) + 0.3), { count: 5, color: 0xcfe0ff, speed: 0.6, up: 1, life: 1.2, size: 0.2, shape: 2 }); }
      else slow(e, hold * 1.5);
    }
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: 0xcfe0ff, r0: 0.6, r1: R, dur: 1.2, thick: 0.05 });
    g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.08, p.pos.z), { color: NOTE, r0: 0.6, r1: R * 0.8, dur: 1.5, thick: 0.04 });
    for (let i = 0; i < 4; i++) this.note(0.05, 0.6, i * 0.28);
    if (n) g.toast?.(t('kit.grover.lullaby'));
  }
  // ---------------------------------------------------------------- Tin-Can Snack
  // Satyrs eat tin cans. Grover crunches one and feels much better.
  snack() {
    const g = this.game, p = this.p, rk = this.up('snack');
    if (p.hp >= p.maxHp && p.ce >= p.maxCe) { g.audio?.ui('back'); return false; }
    this.cast(0.6, false, { type: 'sign', moveScale: 0.5 });
    p.heal(p.maxHp * (25 + rk * 8) / 100);
    p.gainCE(15 + rk * 5);
    g.particles.burst(this.handPos(tmp), { count: 10, color: 0xc8ccd4, additive: false, speed: 2, life: 0.5, size: 0.08, gravity: 8, shape: 3 });
    for (let i = 0; i < 3; i++) g.audio?.noise({ dur: 0.07, gain: 0.18, type: 'bandpass', freq: 3200, sweep: 1200, q: 2, at: i * 0.13 });
    g.audio?.energy('heal');
  }
  // ---------------------------------------------------------------- Panic
  panicStart(g, d) {
    const p = this.p;
    this.panic = { t: 0, waveT: 0 };
    const disc = makeDisc(PAN, { rings: 6, speed: 2.5, intensity: 1.6 }); g.scene.add(disc); this.panic.disc = disc;
    g.fx.flash(0x0a2a10, 0.55, 0.4);
    g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 2, 1);
    g.fx.chroma(1.5);
    g.shake(0.9);
    g.fx.dimTarget = 0.3;
    // the terrible roar of Pan
    g.audio?.tone({ freq: 70, to: 40, dur: 2.4, gain: 0.5, type: 'sawtooth', filter: 500, rev: 0.6 });
    g.audio?.tone({ freq: 140, to: 95, dur: 2.0, gain: 0.25, type: 'square', filter: 900, rev: 0.6 });
    g.audio?.noise({ dur: 2.2, gain: 0.45, type: 'bandpass', freq: 300, sweep: 120, q: 0.8, rev: 0.6 });
    for (let i = 0; i < 3; i++) g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1 + i * 0.6, p.pos.z), { color: i ? LEAF : PAN, r0: 1, r1: 18 + i * 6, dur: 0.7 + i * 0.25, thick: 0.08 });
    this.terrify(g, d);
  }
  terrify(g, d) {
    const p = this.p;
    for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < d.def.radius && !(e.pjFear?.until > g.time)) fear(e, d.def.duration - this.panic.t + 0.3, p, g, 8, p);
  }
  panicTick(g, d, dt) {
    const s = this.panic; if (!s) return;
    const p = this.p;
    s.t += dt; s.waveT -= dt;
    s.disc.position.set(p.pos.x, p.pos.y + 0.07, p.pos.z); s.disc.scale.setScalar(Math.min(1, s.t * 2) * 16);
    s.disc.userData.alpha.value = Math.max(0, Math.min(1, (d.def.duration - s.t) * 2)) * 0.6;
    if (s.waveT <= 0) {
      s.waveT = 0.7;
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.1, p.pos.z), { color: PAN, r0: 1, r1: 16, dur: 0.8, thick: 0.06 });
      this.terrify(g, d);   // newcomers panic too
    }
    // leaves and pan-pipe sparks whirl off Grover
    for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2; g.particles.glow.emit(p.pos.x, p.pos.y + 1.2, p.pos.z, Math.cos(a) * 9, Math.random() * 2, Math.sin(a) * 9, 0.7, 0.5, 2.2, 0.8, 0.18, 0, 1.5, 0.1, Math.random() < 0.5 ? 1 : 3); }
  }
  panicEnd(g) {
    const s = this.panic; if (!s) return;
    g.scene.remove(s.disc); g.fx.dimTarget = 0;
    this.panic = null;
  }
  dispose() { super.dispose(); if (this.panic) this.panicEnd(this.game); }
}
registerKit('grover', GroverKit);

// Attack patterns and per-boss hooks for the Lightning Thief bosses from
// chapter 3 on. BOOK1_PATTERNS is mixed into Boss.prototype (bosses.js), so
// `this` is the Boss: patterns are generators that yield seconds to wait and
// telegraph every big hit with a red ground marker first. BOOK1_HOOKS are the
// init / tick / damageMul / onDie / ambient hooks named in the BOSSES table.
// Marker cones take arc as a fraction of a half turn (0.35 = ±63°).
import * as THREE from 'three/webgpu';
import { BOSS_MODELS, buildBed } from './bossmodels.js';
import { animateExtras } from './monsters.js';
import { holdHero, releaseHero, poisonHero, isHeld } from './holds.js';
import { damp, angleDiff } from '../util.js';
import { toast } from '../ui/ui.js';
import { t as txt } from '../text_config.js';
import { STUN, STUN_IMMUNE, STUN_WINDUP, SHRIEK_R, stunnable } from '../story/museumRules.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), ZERO = new THREE.Vector3();
const heroName = (g, p) => g.heroName?.(p) ?? txt('bosses.aHero');
const once = (b, key, fn) => { b._once ??= {}; if (!b._once[key]) { b._once[key] = true; fn(); } };

// Is a hero standing in (or right by) sea water? The world's liquid map if it
// has one, otherwise the hero's own inLiquid flag.
export function inWater(g, p) {
  if (p.inLiquid === 'water') return true;
  const w = g.world; if (!w?.liquidAt) return false;
  for (const [dx, dz] of [[0, 0], [0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]]) for (const dy of [0.3, -0.5]) if (w.liquidAt(p.pos.x + dx, p.pos.y + dy, p.pos.z + dz) === 'water') return true;
  return false;
}
// A spot on open ground at angle a, distance r from c (or null).
function openSpot(b, c, a, r) {
  const g = b.game, s = new THREE.Vector3(c.x + Math.sin(a) * r, c.y, c.z + Math.cos(a) * r);
  const gy = g.world.groundBelow(s.x, s.z, c.y + 3);
  if (!isFinite(gy) || Math.abs(gy - c.y) > 2.5) return null;
  if (g.world.solidAt(s.x, gy + 0.5, s.z) || g.world.solidAt(s.x, gy + 1.5, s.z)) return null;
  s.y = gy; return s;
}
const alive = (b, kind) => b.game.enemies.filter((e) => !e.dead && e.bossSummon === b && (!kind || e.kind === kind)).length;

export const BOOK1_PATTERNS = {
  // ================================================================ Mrs. Dodds (chapter 1)
  // The shriek and the flight (objectives/museum.js starts it when her health
  // reaches a threshold): a wind-up you can see coming (a violet ring the size
  // of the shriek, a rising wail, her rising), a shriek that paralyzes every
  // hero inside it for STUN s (never one already held, nor one stunned in the
  // last few seconds), then she flies up over the walls to `dest` and waits
  // there (standBy) to be found. cb: { lift(), land() }.
  *dodds_flee(dest, cb = {}) {
    const g = this.game;
    this.cleanupPattern?.(); this.cleanupPattern = null;
    this.moving = false; this.untargetable = true; this.swooping = false; this.knock.set(0, 0, 0);
    this.anim = { type: 'raise', t: 0 }; this.hoverY = (this.B.hover ?? 0) + 0.9;
    g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), radius: SHRIEK_R, dur: STUN_WINDUP, color: 0xb05aff, follow: this });
    g.audio?.tone({ freq: 420, to: 1500, dur: STUN_WINDUP, gain: 0.08, type: 'sawtooth', filter: 3500 });
    toast(txt('bosses.alecto.shriek'), '');
    for (let k = 0; k < 6; k++) {
      const c = this.pos.clone().setY(this.pos.y + 2.2);
      for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 2; g.particles.glow.emit(c.x + Math.cos(a) * r, c.y + (Math.random() - 0.5), c.z + Math.sin(a) * r, -Math.cos(a) * r * 1.6, 0, -Math.sin(a) * r * 1.6, 0.45, 1.8, 0.9, 2.6, 0.16, 0, 1, 0.05, 1); }
      yield STUN_WINDUP / 6;
    }
    // the shriek
    const c = this.pos.clone();
    g.fx.shockwave(c, 0xd8a0ff, SHRIEK_R); g.fx.screenWave?.(c.clone().setY(c.y + 1.5), 1, 0.6); g.fx.chroma?.(0.8); g.fx.flash(0xb05aff, 0.3, 0.3); g.shake(0.6);
    g.audio?.tone({ freq: 1400, to: 2300, dur: 0.7, gain: 0.1, type: 'sawtooth', filter: 5000 }); g.audio?.tone({ freq: 1600, to: 800, dur: 0.7, gain: 0.07, type: 'square', filter: 4000, at: 0.05 });
    g.audio?.voiceSample?.('screech', 0.85);
    const now = g.time;
    for (const p of g.hostileTargets()) {
      if (p.dead || p.downed || p.pos.distanceTo(c) > SHRIEK_R + (p.radius ?? 0.3)) continue;
      if (!stunnable({ held: !!p.hold, immuneUntil: p.stunImmune ?? 0, now })) continue;
      p.stunImmune = now + STUN + STUN_IMMUNE;
      if (p.remote) g.online?.stunRemote?.(p, STUN);
      else holdHero(g, p, { kind: 'stun', dur: STUN, by: this });
      g.fx.damageNumber?.(p.pos, 0, { color: '#d8a0ff', text: txt('bosses.alecto.paralyzed') });
    }
    this.anim = { type: 'cast', t: 1 };
    yield 0.7;
    // up and away, over the walls
    cb.lift?.();
    g.audio?.whoosh?.(1.4);
    const from = this.pos.clone(), top = Math.max(from.y, dest.y) + 10;
    const dist = Math.hypot(dest.x - from.x, dest.z - from.z), cruise = Math.max(1.2, Math.min(4, dist / 15));
    this.flying = true; this.hoverY = 0; this.anim = { type: 'attack', t: 0.6, style: 'slam', windup: 0.3, strike: 0.5 };
    const t0 = g.time, up = 0.8, down = 0.9, T = up + cruise + down;
    for (;;) {
      const t = Math.min(T, g.time - t0);
      if (t < up) { const k = t / up; this.pos.set(from.x, from.y + (top - from.y) * k * k * (3 - 2 * k), from.z); }
      else if (t < up + cruise) { const k = (t - up) / cruise, e = k * k * (3 - 2 * k); this.pos.set(from.x + (dest.x - from.x) * e, top, from.z + (dest.z - from.z) * e); }
      else { const k = (t - up - cruise) / down; this.pos.set(dest.x, top + (dest.y - top) * k * k * (3 - 2 * k), dest.z); }
      this.facing = Math.atan2(dest.x - from.x, dest.z - from.z);
      if (Math.random() < 0.5) g.particles.smoke.emit(this.pos.x, this.pos.y + 1.5, this.pos.z, 0, -0.3, 0, 0.9, 0.12, 0.08, 0.1, 0.5, -0.2, 1, 2, 0);
      if (t >= T) break;
      yield 0;
    }
    this.flying = false;
    this.pos.copy(dest); this.vel.set(0, 0, 0); this.home = dest.clone(); this.visY = dest.y;
    this.hoverY = this.B.hover ?? 0; this.anim = null;
    this.standBy = true; this.untargetable = true;
    g.fx.shockwave(dest, 0xff7a1a, 4); g.audio?.impact?.(1.2);
    cb.land?.();
  },
  // ================================================================ hellhound
  *maul() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false; this.faceTarget(t);
    const tele = 0.75 - this.phase * 0.1;
    g.markers.spawn({ pos: this.pos, radius: 5, dur: tele, shape: 'cone', arc: 0.3, facing: this.facing, color: 0xff2a1a, follow: this });
    this.anim = { type: 'attack', t: 0.15, style: 'bite', windup: 0.3, strike: 0.5 };
    g.audio?.tone({ freq: 110, to: 70, dur: tele, gain: 0.22, type: 'sawtooth', filter: 600 });
    yield tele;
    this.anim = { type: 'attack', t: 0.5, style: 'bite', windup: 0.3, strike: 0.5 };
    this.knock.copy(this.fwd()).multiplyScalar(9);
    g.fx.slashArc(this.pos, this.facing, 0xff6a1a, 5, 0.3, 0.2); g.audio?.impact(1.6); g.shake(0.3);
    this.hurtCone(5.2, 0.95, this.dmg, 10);
    yield 0.45;
    this.anim = null; this.moving = true;
    yield 0.35;
  },
  *lunge() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    const tele = 0.85 - this.phase * 0.12;
    g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 3, length: 15, facing: this.facing, dur: tele, color: 0xff2a1a });
    this.anim = { type: 'attack', t: 0.15, style: 'bite', windup: 0.3, strike: 0.5 };
    g.audio?.tone({ freq: 160, to: 60, dur: tele, gain: 0.2, type: 'sawtooth', filter: 700 });
    yield tele;
    this.anim = { type: 'attack', t: 0.5, style: 'bite', windup: 0.3, strike: 0.5 };
    g.audio?.whoosh(1.4);
    yield* this.dashLine(dir, 24, 14, this.dmg * 1.2, { dust: 0x2a2024, hitR: 2.3 });
    this.anim = null; this.moving = true;
    yield 0.5;
  },
  // Melt into the shadows, slip behind a hero and burst out of the dark.
  *shadow_travel() {
    const g = this.game;
    const n = this.phase >= 2 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const t = this.target(); if (!t) break;
      this.moving = false; this.untargetable = true;
      const restore = () => { this.object.visible = true; this.untargetable = false; };
      this.cleanupPattern = restore;
      g.particles.burst(this.pos.clone().setY(this.pos.y + 1.2), { count: 40, color: 0x140c14, additive: false, speed: 3, life: 0.9, size: 0.9, sizeEnd: 2.4, drag: 2 });
      g.fx.rings.spawn(this.pos.clone().setY(this.ground(this.pos) + 0.06), { color: 0x6a1aa8, r0: 3, r1: 0.2, dur: 0.5, thick: 0.4 });
      g.audio?.energy('teleport');
      this.object.visible = false;
      yield 0.5;
      // come out of the shadow behind the hero
      const back = Math.atan2(-Math.sin(t.facing ?? 0), -Math.cos(t.facing ?? 0));
      let spot = null;
      for (const off of [0, 0.6, -0.6, 1.2, -1.2, Math.PI]) { spot = openSpot(this, t.pos, back + off, 6); if (spot) break; }
      spot ??= this.pos.clone();
      const pool = spot.clone(); pool.y += 0.05;
      g.fx.rings.spawn(pool, { color: 0x3a0a3a, r0: 0.4, r1: 2.6, dur: 0.6, thick: 0.6 });
      const tele = 0.8 - this.phase * 0.1;
      const facing = Math.atan2(t.pos.x - spot.x, t.pos.z - spot.z);
      g.markers.spawn({ pos: spot, shape: 'rect', width: 3, length: 12, facing, dur: tele, color: 0xff2a1a });
      g.particles.burst(spot.clone().setY(spot.y + 0.4), { count: 30, color: 0x1a0c1a, additive: false, speed: 1.5, up: 1.5, life: tele, size: 0.8, sizeEnd: 1.8 });
      yield tele;
      this.pos.copy(spot); this.visY = spot.y; this.vel.set(0, 0, 0); this.facing = facing;
      restore(); this.cleanupPattern = null;
      g.particles.burst(spot.clone().setY(spot.y + 1.2), { count: 40, color: 0x140c14, additive: false, speed: 4, life: 0.8, size: 0.9, sizeEnd: 2.4, drag: 2 });
      this.anim = { type: 'attack', t: 0.5, style: 'bite', windup: 0.3, strike: 0.5 };
      g.audio?.whoosh(1.6); g.audio?.impact(1.4);
      yield* this.dashLine(new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)), 22, 11, this.dmg * 1.3, { dust: 0x1a1018, hitR: 2.3 });
      this.anim = null;
      yield 0.4;
    }
    this.moving = true;
    yield 0.4;
  },
  *howl() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    const R = 5;
    g.markers.spawn({ pos: this.pos, radius: R, dur: 0.9, color: 0xb05aff, follow: this });
    g.audio?.tone({ freq: 220, to: 440, dur: 0.9, gain: 0.12, type: 'sawtooth', filter: 1500 });
    yield 0.9;
    g.fx.shockwave(this.pos, 0xff6a1a, R); g.fx.screenWave(this.pos, 0.6, 0.5); g.shake(0.4);
    g.audio?.tone({ freq: 440, to: 180, dur: 1.2, gain: 0.14, type: 'sawtooth', filter: 1800 });
    for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(this.pos) < R) { p.slowT = Math.max(p.slowT ?? 0, 2); p.takeDamage(this.dmg * 0.25, this, { knock: tmp.subVectors(p.pos, this.pos).setY(0).normalize().multiplyScalar(6) }); }
    if (alive(this) < 6) this.summon(Array(2 + this.phase).fill('pup'), this.pos, 4, 0xff4a1a);
    toast(txt('bosses.hellhound_alpha.howl'));
    yield 0.8;
    this.anim = null; this.moving = true;
    yield 0.3;
  },

  // ================================================================ the Furies
  *fury_whip() { yield* this.whip_lash(); },
  *fury_swoop() { yield* this.swoop(); },
  // The fighting sister flies up; the next one dives in where she was.
  *sister_swap() {
    const g = this.game, F = this.furies; if (!F) return;
    this.moving = false; this.untargetable = true;
    this.cleanupPattern = () => { this.untargetable = false; };
    const t = this.target();
    const next = (F.active + 1) % 3;
    // dive at a hero
    let land = this.pos.clone();
    if (t) { const s = openSpot(this, t.pos, Math.random() * Math.PI * 2, 2.5); if (s) land = s; }
    g.markers.spawn({ pos: land, radius: 3.6, dur: 1.0, color: 0xff3a1a });
    toast(txt('bosses.furies.swoop', { name: F.names[next] }));
    g.audio?.tone({ freq: 900, to: 400, dur: 0.8, gain: 0.08, type: 'sawtooth', filter: 3000 });
    // hand over: the old body rises to circle, the new one drops into place
    F.lp[F.active].set(0, 0, 0);
    F.active = next; this.rig = F.rigs[next];
    tmp.subVectors(land, this.pos);
    for (let i = 0; i < 3; i++) F.lp[i].sub(tmp);   // the holder jumps to the landing spot; keep the others where they are
    this.pos.copy(land); this.visY = land.y;
    this.hoverY = 0.4;
    yield 1.0;
    g.fx.shockwave(this.pos, 0xff7a1a, 3.8); g.shake(0.5); g.audio?.impact(1.8);
    this.hurtPlayers(this.pos, 3.6, this.dmg * 1.1, 12);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.hazards.fire(this.pos.clone().add(new THREE.Vector3(Math.cos(a) * 3, 0, Math.sin(a) * 3)), this.dmg * 0.3, 1); }
    this.hoverY = this.B.hover ?? 0;
    this.untargetable = false; this.cleanupPattern = null;
    this.moving = true;
    yield 0.6;
  },
  // All three crack their whips from where they are.
  *triple_whip() {
    const g = this.game, F = this.furies; if (!F) return;
    this.moving = false;
    const lines = [];
    const heroes = this.targets(); if (!heroes.length) return;
    for (let i = 0; i < 3; i++) {
      const from = F.rigs[i].root.getWorldPosition(new THREE.Vector3()); from.y = this.ground(from);
      const t = heroes[i % heroes.length];
      const dir = tmp.subVectors(t.pos, from).setY(0); const len = Math.min(16, dir.length() + 3); dir.normalize();
      lines.push({ from, dir: dir.clone(), len, facing: Math.atan2(dir.x, dir.z) });
      g.markers.spawn({ pos: from, shape: 'rect', width: 1.8, length: len, facing: Math.atan2(dir.x, dir.z), dur: 0.9 + i * 0.25, color: 0xff3a1a });
    }
    this.anim = { type: 'attack', t: 0.2, style: 'swingR', windup: 0.3, strike: 0.5 };
    yield 0.9;
    for (let i = 0; i < 3; i++) {
      const L = lines[i];
      F.crack[i] = 0.4; if (i === F.active) this.whipCrack = 0.4;
      const o = L.from.clone().setY(L.from.y + 1);
      g.fx.slashLine(o, L.dir, L.len, 0xff8a2a, 0.5, 0.25);
      g.audio?.energy('slash'); g.audio?.impact(1.1);
      this.hurtLine(L.from, L.dir, L.len, 0.9, this.dmg, 7);
      yield 0.25;
    }
    this.anim = null; this.moving = true;
    yield 0.6;
  },

  // ================================================================ Medusa
  // The stare: every hero facing her when it lands is turned to stone.
  *gaze() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    const tele = 1.6 - this.phase * 0.2, R = 22;
    once(this, 'gaze', () => toast(txt('bosses.medusa.liftsVeil'), 'big'));
    if (this._once.gaze && this.gazeCount) toast(txt('bosses.medusa.lookAway'));
    this.gazeCount = (this.gazeCount ?? 0) + 1;
    g.audio?.noise({ dur: tele, gain: 0.16, type: 'highpass', freq: 4000 });
    g.audio?.tone({ freq: 300, to: 900, dur: tele, gain: 0.06, type: 'triangle', filter: 2400 });
    this.gazeT = tele;
    let cone = null, shown = false;
    for (let k = 0; k < tele; k += 0.1) {
      // True Sight reveals where the stare will fall
      if (!shown && g.mist?.active) { shown = true; cone = g.markers.spawn({ pos: this.pos, radius: R, dur: tele - k, shape: 'cone', arc: 0.42, facing: this.facing, color: 0x9aff6a, follow: this }); }
      const t = this.target(); if (t) this.facing = this.facing + angleDiff(Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z), this.facing) * 0.15;
      if (cone) cone.mesh.rotation.z = this.facing + Math.PI;
      yield 0.1;
    }
    // the stare lands
    this.gazeT = 0;
    g.fx.flash(0xc8ff6a, 0.35, 0.25); g.fx.chroma(0.5);
    g.audio?.tone({ freq: 1200, to: 300, dur: 0.5, gain: 0.1, type: 'sawtooth', filter: 3000 });
    let stoned = 0;
    for (const p of g.hostileTargets()) {
      if (p.dead || p.downed || (p.iframes ?? 0) > 0) continue;
      tmp.subVectors(p.pos, this.pos).setY(0); const d = tmp.length();
      if (d > R || Math.abs(angleDiff(this.facing, Math.atan2(tmp.x, tmp.z))) > 1.32) continue;
      // facing her? (the angle between the hero's facing and the way to her)
      const toHer = Math.atan2(-tmp.x, -tmp.z);
      if (Math.abs(angleDiff(p.facing ?? 0, toHer)) > 1.1) continue;
      p.takeDamage(this.dmg * 0.4, this, { noKnock: true });
      if (holdHero(g, p, { kind: 'stone', dur: 2.6 + this.phase * 0.4, by: this })) { stoned++; g.fx.damageNumber?.(p.pos, 0, { color: '#c8c4b8', text: txt('bosses.medusa.petrified') }); }
    }
    if (stoned && this.gazeCount <= 2) toast(txt('bosses.medusa.turnedToStone'));
    yield 0.5;
    this.anim = null; this.moving = true;
    yield 0.5;
  },
  *snake_bite() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false; this.faceTarget(t);
    const n = 1 + Math.min(2, this.phase);
    for (let k = 0; k < n; k++) {
      const tt = this.target(); if (!tt) break; this.faceTarget(tt);
      const tele = 0.6 - this.phase * 0.08;
      g.markers.spawn({ pos: this.pos, radius: 5, dur: tele, shape: 'cone', arc: 0.28, facing: this.facing, color: 0x8aff3a, follow: this });
      this.anim = { type: 'attack', t: 0.15, style: 'punch', windup: 0.3, strike: 0.5 }; this.snakeRear = 1;
      g.audio?.noise({ dur: tele, gain: 0.14, type: 'highpass', freq: 5000 });
      yield tele;
      this.anim = { type: 'attack', t: 0.5, style: 'punch', windup: 0.3, strike: 0.5 }; this.snakeRear = 0;
      g.fx.slashArc(this.pos, this.facing, 0x8aff3a, 5, 0.28, 0.18);
      for (const p of this.hurtCone(5.2, 0.9, this.dmg * 0.8, 6)) poisonHero(g, p, this.dmg * 0.25, 3, this);
      yield 0.3;
    }
    this.anim = null; this.moving = true;
    yield 0.5;
  },
  *veil_sweep() {
    const g = this.game;
    this.moving = false;
    const R = 5;
    g.markers.spawn({ pos: this.pos, radius: R, dur: 0.85, color: 0xff2a1a, follow: this });
    this.anim = { type: 'attack', t: 0.15, style: 'spin', windup: 0.3, strike: 0.5 };
    yield 0.85;
    this.anim = { type: 'attack', t: 0.6, style: 'spin', windup: 0.3, strike: 0.5 };
    g.fx.shockwave(this.pos, 0x2a1a2a, R); g.audio?.whoosh(1.4);
    this.hurtPlayers(this.pos, R, this.dmg, 13);
    yield 0.5;
    this.anim = null; this.moving = true;
    yield 0.4;
  },
  *wake_statues() {
    const g = this.game;
    if (alive(this, 'gorgon_statue') >= 4) { yield* this.snake_bite(); return; }
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    g.audio?.noise({ dur: 1, gain: 0.2, type: 'lowpass', freq: 600 });
    yield 0.8;
    const out = this.summon(Array(2 + this.phase).fill('gorgon_statue'), this.pos, 5, 0x9aff6a);
    for (const e of out) { e.awake = true; e.spawnT = 0.5; }
    toast(txt('bosses.medusa.statuesStir'));
    yield 0.6;
    this.anim = null; this.moving = true;
  },

  // ================================================================ spiders
  *net_spit() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'cast', t: 1 };
    const shots = 1 + Math.min(2, this.phase);
    const heroes = this.targets(); if (!heroes.length) { this.moving = true; return; }
    const self = this;
    for (let k = 0; k < shots; k++) {
      const t = heroes[k % heroes.length];
      this.faceTarget(t);
      const c = (t.vel ? t.pos.clone().addScaledVector(t.vel, 0.4) : t.pos.clone()); c.y = this.ground(c);
      const flight = 0.9;
      g.markers.spawn({ pos: c, radius: 1.8, dur: 0.45 + flight, color: 0xf4f0e8 });
      yield 0.45;
      const from = this.mouth(), grav = 14;
      const vel = new THREE.Vector3((c.x - from.x) / flight, (c.y - from.y) / flight + 0.5 * grav * flight, (c.z - from.z) / flight);
      g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg * 0.5, gravity: grav, life: flight, shape: 'orb', color: 0xf4f0e8, emissive: 0.6, scale: 2.4, radius: 0.6, ghost: true,
        trail: (p) => { if (Math.random() < 0.5) g.particles.burst(p.pos, { count: 1, color: 0xf4f0e8, additive: false, speed: 0.2, life: 0.4, size: 0.18 }); },
        onHit: (target) => { target.takeDamage(self.dmg * 0.4, self, {}); holdHero(g, target, { kind: 'root', dur: 2.2, by: self }); },
        onExpire: (p) => {
          g.particles.burst(p.pos.clone().setY(p.pos.y + 0.3), { count: 20, color: 0xf4f0e8, additive: false, speed: 3, life: 0.6, size: 0.15, gravity: 6 });
          g.hazards.add({ pos: p.pos.clone(), radius: 1.8, dps: self.dmg * 0.1, dur: 3, color: 0xf4f0e8, slow: 0.5 });
          for (const h of g.hostileTargets()) if (!h.dead && h.pos.distanceTo(p.pos) < 1.9) holdHero(g, h, { kind: 'root', dur: 2.2, by: self });
        } });
      g.audio?.energy('spit');
      yield 0.25;
    }
    this.anim = null; this.moving = true;
    yield 0.5;
  },
  *leg_stab() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    const c = this.pos.clone().addScaledVector(dir, 3); c.y = this.ground(c);
    g.markers.spawn({ pos: c, radius: 3.2, dur: 0.75, color: 0xff2a1a });
    this.anim = { type: 'attack', t: 0.15, style: 'slam', windup: 0.3, strike: 0.5 };
    yield 0.75;
    this.anim = { type: 'attack', t: 0.6, style: 'slam', windup: 0.3, strike: 0.5 };
    g.fx.shockwave(c, 0xffb02a, 3.4); g.shake(0.4); g.audio?.impact(1.6); g.audio?.tone({ freq: 2200, dur: 0.05, gain: 0.06, type: 'square', filter: 6000 });
    this.hurtPlayers(c, 3.2, this.dmg, 10);
    yield 0.5;
    this.anim = null; this.moving = true;
    yield 0.3;
  },
  *skitter() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 3.6, length: 16, facing: this.facing, dur: 0.8, color: 0xff2a1a });
    for (let i = 0; i < 4; i++) { g.audio?.tone({ freq: 2400, dur: 0.03, gain: 0.05, type: 'square', filter: 6000, at: i * 0.15 }); }
    yield 0.8;
    yield* this.dashLine(dir, 22, 14, this.dmg * 1.1, { dust: 0xb08a4a, hitR: 2.4 });
    this.moving = true;
    yield 0.4;
  },
  *spawn_swarm() {
    const g = this.game;
    if (alive(this) >= 8) { yield* this.net_spit(); return; }
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    g.audio?.energy('summon');
    yield 0.6;
    const kinds = Array(3 + this.phase).fill('spider');
    if (this.phase >= 2) kinds.push('automaton');
    this.summon(kinds, this.pos, 3.5, 0xffb02a);
    yield 0.6;
    this.anim = null; this.moving = true;
  },

  // ================================================================ Procrustes
  *axe_sweep() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false; this.faceTarget(t);
    const tele = 0.8 - this.phase * 0.1;
    g.markers.spawn({ pos: this.pos, radius: 6, dur: tele, shape: 'cone', arc: 0.5, facing: this.facing, color: 0xff2a1a, follow: this });
    this.anim = { type: 'attack', t: 0.15, style: 'swingR', windup: 0.3, strike: 0.5 };
    yield tele;
    this.anim = { type: 'attack', t: 0.6, style: 'swingR', windup: 0.3, strike: 0.5 };
    g.fx.slashArc(this.pos, this.facing, 0xe8ecf4, 6, 0.5, 0.22); g.audio?.swing(2); g.audio?.impact(1.5);
    this.hurtCone(6.2, 1.55, this.dmg, 12);
    yield 0.5;
    this.anim = null; this.moving = true;
    yield 0.4;
  },
  *axe_chop() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    const from = this.pos.clone().setY(this.ground(this.pos));
    g.markers.spawn({ pos: from, shape: 'rect', width: 2.4, length: 10, facing: this.facing, dur: 0.9, color: 0xff2a1a });
    this.anim = { type: 'attack', t: 0.15, style: 'slam', windup: 0.3, strike: 0.5 };
    yield 0.9;
    this.anim = { type: 'attack', t: 0.6, style: 'slam', windup: 0.3, strike: 0.5 };
    g.shake(0.6); g.audio?.impact(2.2);
    for (let s = 2; s < 10; s += 2) g.fx.shockwave(from.clone().addScaledVector(dir, s), 0xc8b8a0, 1.4, 0.3);
    this.hurtLine(from, dir, 10, 1.2, this.dmg * 1.3, 10);
    yield 0.6;
    this.anim = null; this.moving = true;
    yield 0.4;
  },
  // Grab a hero and strap them to a "magic fingers" water bed.
  *grab_bed() {
    const g = this.game;
    if (this.grabbed) { yield* this.axe_sweep(); return; }
    const t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    const from = this.pos.clone().setY(this.ground(this.pos));
    g.markers.spawn({ pos: from, shape: 'rect', width: 2.6, length: 6, facing: this.facing, dur: 0.75, color: 0xff2a1a });
    this.anim = { type: 'cast', t: 1, both: true };
    once(this, 'pitch', () => toast(txt('bosses.procrustes.pitch')));
    yield 0.75;
    // the first hero in reach is caught
    let caught = null, bd = Infinity;
    for (const p of g.hostileTargets()) {
      if (p.dead || p.downed || (p.iframes ?? 0) > 0 || isHeld(p) || p.remote) continue;
      tmp.subVectors(p.pos, from); const along = tmp.dot(dir), lat = Math.abs(tmp.x * dir.z - tmp.z * dir.x);
      if (along > -0.5 && along < 6.3 && lat < 1.6 && along < bd) { bd = along; caught = p; }
    }
    if (caught) {
      const side = new THREE.Vector3(dir.z, 0, -dir.x);
      const bedPos = this.pos.clone().addScaledVector(side, 2.6).addScaledVector(dir, 1); bedPos.y = this.ground(bedPos);
      const bed = buildBed(); bed.position.copy(bedPos); bed.rotation.y = this.facing; g.scene.add(bed);
      g.fx.poof?.(bedPos);
      const anchor = bedPos.clone().setY(bedPos.y + 0.85);
      this.grabbed = caught; this.bed = bed; this.freeHits = 0;
      const self = this;
      holdHero(g, caught, { kind: 'grab', dur: 6, dps: this.dmg * 0.22, mash: 10, by: this, anchor,
        onRelease: (p, why) => {
          g.scene.remove(bed); g.fx.poof?.(bedPos);
          if (self.grabbed === p) { self.grabbed = null; self.bed = null; }
          if (why === 'mash' && !self.dead) { toast(txt('bosses.procrustes.tipped'), 'big'); self.dazeT = 2.5; }
          else if (why === 'freed' && !self.dead) toast(txt('bosses.procrustes.freed'));
        } });
      toast(txt('bosses.procrustes.straps', { name: heroName(g, caught) }), 'big');
      g.audio?.impact(1.4);
      // stand guard over the bed while the stretching starts
      this.anim = { type: 'raise', t: 0 };
      yield 1.2;
    } else {
      g.fx.slashArc(this.pos, this.facing, 0xffffff, 5, 0.2, 0.15); g.audio?.whoosh(1);
      yield 0.4;
    }
    this.anim = null; this.moving = true;
    yield 0.4;
  },
  *sales_pitch() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'cast', t: 1, both: true };
    const lines = txt('bosses.procrustes.salesLines');
    toast(lines[Math.floor(Math.random() * lines.length)]);
    const PULL = 6.5;
    g.markers.spawn({ pos: this.pos, radius: PULL, dur: 0.8, color: 0xffd84a, follow: this });
    yield 0.8;
    // a pull toward him, then the axe
    for (const p of g.hostileTargets()) { if (p.dead) continue; tmp.subVectors(this.pos, p.pos).setY(0); const d = tmp.length(); if (d < PULL && d > 2) { p.knock = (p.knock ?? new THREE.Vector3()).add(tmp.normalize().multiplyScalar(14)); } }
    g.fx.shockwave(this.pos, 0xffd84a, PULL, 0.5);
    yield 0.35;
    yield* this.axe_sweep();
  },

  // ================================================================ Cerberus
  *head_fire() {
    const g = this.game, t = this.target(); if (!t) return;
    const H = this.rig.extras.heads;
    this.moving = false; this.faceTarget(t);
    g.markers.spawn({ pos: this.pos, radius: 11, dur: 0.85, shape: 'cone', arc: 0.22, facing: this.facing, color: 0xff5a1a });
    this.headAct = [1, 0, 0];
    yield 0.85;
    g.audio?.energy('fire');
    for (let k = 0; k < 14; k++) {
      const dir = tmp2.set(Math.sin(this.facing), 0, Math.cos(this.facing));
      const from = H[0].mouth.getWorldPosition(new THREE.Vector3());
      g.particles.burst(from, { count: 10, color: k % 2 ? 0xff7a2a : 0xffc84a, speed: 16, spread: 0.25, dir, life: 0.6, size: 0.5, sizeEnd: 2.5, drag: 1.5, intensity: 3 });
      if (k % 3 === 0) this.hurtCone(11.5, 0.7, this.dmg * 0.35, 4);
      g.lights.flash(from.addScaledVector(dir, 4), 0xff6a1a, 8, 10, 0.1);
      yield 0.06;
    }
    this.headAct = [0, 0, 0];
    this.moving = true;
    yield 0.4;
  },
  *head_bite() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false; this.faceTarget(t);
    const tele = 0.7 - this.phase * 0.1;
    g.markers.spawn({ pos: this.pos, radius: 6.5, dur: tele, shape: 'cone', arc: 0.25, facing: this.facing, color: 0xff2a1a, follow: this });
    this.headAct = [0, 0.5, 0];
    this.anim = { type: 'attack', t: 0.15, style: 'bite', windup: 0.3, strike: 0.5 };
    yield tele;
    this.headAct = [0, 1, 0];
    this.anim = { type: 'attack', t: 0.5, style: 'bite', windup: 0.3, strike: 0.5 };
    this.knock.copy(this.fwd()).multiplyScalar(8);
    g.fx.slashArc(this.pos, this.facing, 0xfff0d0, 6.5, 0.25, 0.2); g.audio?.impact(1.8); g.shake(0.35);
    this.hurtCone(6.8, 0.8, this.dmg * 1.2, 11);
    yield 0.45;
    this.headAct = [0, 0, 0]; this.anim = null; this.moving = true;
    yield 0.3;
  },
  *head_lunge() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 3.6, length: 14, facing: this.facing, dur: 0.85, color: 0xff2a1a });
    this.headAct = [0, 0, 0.6];
    yield 0.85;
    this.headAct = [0, 0, 1];
    g.audio?.whoosh(1.6);
    yield* this.dashLine(dir, 20, 12, this.dmg * 1.2, { dust: 0x3a3440, hitR: 2.8 });
    this.headAct = [0, 0, 0]; this.moving = true;
    yield 0.4;
  },
  *triple_attack() {
    yield* this.head_fire();
    yield* this.head_bite();
    if (this.phase >= 1) yield* this.head_lunge();
  },
  *cerberus_stomp() { yield* this.stomp(); },
  // His heads droop: a window to strike for double damage.
  *sleepy() {
    const g = this.game;
    this.moving = false; this.anim = null;
    toast(txt('bosses.cerberus.sleepy'), 'big');
    once(this, 'ball', () => setTimeout(() => toast(txt('bosses.cerberus.ball')), 1800));
    this.sleepyT = 4 - this.phase * 0.5;
    g.audio?.tone({ freq: 180, to: 90, dur: 1.2, gain: 0.12, type: 'sine', filter: 800 });
    this.cleanupPattern = () => { this.sleepyT = 0; };
    yield this.sleepyT;
    this.sleepyT = 0; this.cleanupPattern = null;
    yield* this.roar();
    this.moving = true;
  },

  // ================================================================ Ares
  *sword_combo() {
    const g = this.game;
    const n = 2 + Math.min(2, this.phase);
    this.moving = false;
    for (let k = 0; k < n; k++) {
      const t = this.target(); if (!t) break;
      this.faceTarget(t);
      const tele = Math.max(0.35, 0.7 - this.phase * 0.1 - k * 0.05);
      g.markers.spawn({ pos: this.pos, radius: 5, dur: tele, shape: 'cone', arc: 0.38, facing: this.facing, color: 0xff2a1a, follow: this });
      const style = k % 2 ? 'swingL' : 'swingR';
      this.anim = { type: 'attack', t: 0.15, style, windup: 0.3, strike: 0.5 };
      yield tele;
      this.anim = { type: 'attack', t: 0.55, style, windup: 0.3, strike: 0.5 };
      this.knock.copy(this.fwd()).multiplyScalar(8);
      g.fx.slashArc(this.pos, this.facing, 0xff6a1a, 5, 0.38, 0.2, k % 2 === 1); g.audio?.swing(2); g.audio?.energy('fire');
      this.hurtCone(5.3, 1.2, this.dmg, 9);
      yield 0.3;
    }
    this.anim = null; this.moving = true;
    yield 0.5;
  },
  *spear_thrust() {
    const g = this.game, t = this.target(); if (!t) return;
    const X = this.rig.extras;
    this.moving = false;
    const dir = this.faceTarget(t);
    X.spear.visible = true; X.sword.visible = false;
    this.cleanupPattern = () => { X.spear.visible = false; X.sword.visible = true; };
    const from = this.pos.clone().setY(this.ground(this.pos));
    g.markers.spawn({ pos: from, shape: 'rect', width: 1.8, length: 13, facing: this.facing, dur: 0.85, color: 0xff2a1a });
    this.anim = { type: 'attack', t: 0.15, style: 'punch', windup: 0.3, strike: 0.5 };
    yield 0.85;
    this.anim = { type: 'attack', t: 0.5, style: 'punch', windup: 0.3, strike: 0.5 };
    this.knock.copy(dir).multiplyScalar(14);
    g.fx.slashLine(from.clone().setY(from.y + 1.4), dir, 13, 0xffe0a0, 0.4, 0.2); g.audio?.whoosh(1.4); g.audio?.impact(1.6);
    this.hurtLine(from, dir, 13, 0.9, this.dmg * 1.3, 12);
    yield 0.5;
    X.spear.visible = false; X.sword.visible = true; this.cleanupPattern = null;
    this.anim = null; this.moving = true;
    yield 0.4;
  },
  *bike_charge() {
    const g = this.game;
    const X = this.rig.extras;
    const n = this.phase >= 1 ? 2 : 1;
    this.moving = false;
    X.bike.visible = true; this.riding = true;
    this.cleanupPattern = () => { X.bike.visible = false; this.riding = false; };
    for (let k = 0; k < n; k++) {
      const t = this.target(); if (!t) break;
      const dir = this.faceTarget(t);
      const tele = 1.0 - this.phase * 0.12;
      g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 3.4, length: 24, facing: this.facing, dur: tele, color: 0xff2a1a });
      g.audio?.tone({ freq: 70, to: 140, dur: tele, gain: 0.25, type: 'sawtooth', filter: 900 });
      yield tele;
      g.audio?.tone({ freq: 140, to: 90, dur: 0.9, gain: 0.25, type: 'sawtooth', filter: 1200 });
      const self = this;
      yield* this.dashLine(dir, 28, 20, this.dmg * 1.4, { dust: 0x6a5a4a, hitR: 2.4, trail: (i) => { if (i % 3 === 0) g.hazards.fire(self.pos.clone(), self.dmg * 0.3, 1.1); } });
      yield 0.35;
    }
    X.bike.visible = false; this.riding = false; this.cleanupPattern = null;
    this.moving = true;
    yield 0.5;
  },
  *war_cry() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    g.markers.spawn({ pos: this.pos, radius: 5, dur: 0.8, color: 0xff2a1a, follow: this });
    yield 0.8;
    toast(txt('bosses.ares.roar'));
    g.fx.shockwave(this.pos, 0xff3a14, 5.5); g.shake(0.6); g.audio?.impact(2);
    this.hurtPlayers(this.pos, 5, this.dmg * 0.6, 14);
    this.rageT = 6;
    if (this.phase >= 1 && alive(this) < 4) this.summon(['skeleton', 'skeleton'], this.pos, 5, 0xff3a14);
    yield 0.6;
    this.anim = null; this.moving = true;
  },

  // ================================================================ Luke
  *duel_combo() {
    const g = this.game;
    const n = 3 + Math.min(2, this.phase);
    this.moving = false;
    for (let k = 0; k < n; k++) {
      const t = this.target(); if (!t) break;
      this.faceTarget(t);
      const tele = Math.max(0.28, 0.45 - this.phase * 0.06);
      // close the gap first
      if (t.pos.distanceTo(this.pos) > 3) this.knock.copy(this.fwd()).multiplyScalar(14);
      g.markers.spawn({ pos: this.pos, radius: 3.6, dur: tele, shape: 'cone', arc: 0.33, facing: this.facing, color: 0xff2a1a, follow: this });
      const style = ['swingR', 'swingL', 'punch', 'uppercut', 'swingR'][k];
      this.anim = { type: 'attack', t: 0.15, style, windup: 0.3, strike: 0.5 };
      yield tele;
      this.anim = { type: 'attack', t: 0.55, style, windup: 0.3, strike: 0.5 };
      this.knock.copy(this.fwd()).multiplyScalar(7);
      g.fx.slashArc(this.pos, this.facing, k % 2 ? 0xe0a040 : 0xc8ccd8, 3.6, 0.33, 0.15, k % 2 === 1); g.audio?.swing(1);
      this.hurtCone(3.9, 1.1, this.dmg, 7);
      yield 0.18;
    }
    this.anim = null; this.moving = true;
    yield 0.5;
  },
  // Guard: a hit in the window is turned aside and answered at once.
  *parry() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'sign', t: 0 };
    this.parryT = 1.5 - this.phase * 0.15; this.riposte = null;
    this.cleanupPattern = () => { this.parryT = 0; };
    once(this, 'parry', () => toast(txt('bosses.luke.onGuard')));
    g.fx.rings.spawn(this.pos.clone().setY(this.ground(this.pos) + 0.06), { color: 0x7ac8ff, r0: 2.2, r1: 1.4, dur: this.parryT, thick: 0.15 });
    g.audio?.tone({ freq: 1800, dur: 0.12, gain: 0.06, type: 'triangle' });
    while (this.parryT > 0 && !this.riposte) { this.parryT -= 0.1; yield 0.1; }
    this.parryT = 0; this.cleanupPattern = null;
    const r = this.riposte; this.riposte = null;
    if (r && !r.dead) {
      // riposte: instant, no telegraph — the punishment for swinging into a parry
      this.faceTarget(r);
      this.anim = { type: 'attack', t: 0.55, style: 'swingR', windup: 0.3, strike: 0.5 };
      g.fx.slashArc(this.pos, this.facing, 0xe0a040, 4, 0.4, 0.2); g.audio?.impact(1.8); g.fx.hitSpark?.(r.pos.clone().setY(r.pos.y + 1), null, { color: 0xe0a040, big: true });
      r.takeDamage(this.dmg * 1.5, this, { knock: tmp.subVectors(r.pos, this.pos).setY(0).normalize().multiplyScalar(12) });
      toast(txt('bosses.luke.riposte'));
      yield 0.4;
    }
    this.anim = null; this.moving = true;
    yield 0.3;
  },
  *lunge_strike() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    const tele = 0.55 - this.phase * 0.07;
    g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 1.8, length: 11, facing: this.facing, dur: tele, color: 0xff2a1a });
    this.anim = { type: 'attack', t: 0.15, style: 'punch', windup: 0.3, strike: 0.5 };
    yield tele;
    this.anim = { type: 'attack', t: 0.5, style: 'punch', windup: 0.3, strike: 0.5 };
    g.audio?.whoosh(1.3);
    yield* this.dashLine(dir, 26, 10, this.dmg * 1.2, { dust: 0, hitR: 1.4, trail: () => g.particles.burst(this.pos.clone().setY(this.pos.y + 1.2), { count: 2, color: 0xe0a040, speed: 0.5, life: 0.3, size: 0.2 }) });
    this.anim = null; this.moving = true;
    yield 0.4;
  },
  *summon_scorpion() {
    const g = this.game;
    if (alive(this, 'scorpion') >= 2) { yield* this.duel_combo(); return; }
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    yield 0.6;
    this.summon(['scorpion'], this.pos, 3.5, 0x9aff3a);
    toast(txt('bosses.luke.summons'));
    yield 0.5;
    this.anim = null; this.moving = true;
  },
};

// ---------------------------------------------------------------- hooks
export const BOOK1_HOOKS = {
  whipGlow(b) {
    const g = b.game;
    const tips = b.furies ? b.furies.rigs.map((r) => r.extras.whipTip) : [b.rig.extras.whipTip];
    for (const tip of tips) if (tip && Math.random() < 0.6) { const c = tip.getWorldPosition(tmp); g.particles.glow.emit(c.x, c.y, c.z, (Math.random() - 0.5), 1 + Math.random(), (Math.random() - 0.5), 0.4, 2.6, 1.1, 0.3, 0.22, -1, 1, 0.05, 0); }
  },
  hellhoundSmoke(b, dt) {
    const g = b.game; if (!b.object.visible) return;
    if (Math.random() < dt * 14) { const p = b.pos, r = b.radius; g.particles.smoke.emit(p.x + (Math.random() - 0.5) * r * 1.6, p.y + Math.random() * b.height, p.z + (Math.random() - 0.5) * r * 1.6, (Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, 1.8, 0.05, 0.03, 0.04, 0.5, -0.3, 1.2, 2.6, 0); }
    if (Math.random() < 0.3) { const c = b.mouth(); g.particles.glow.emit(c.x, c.y, c.z, (Math.random() - 0.5) * 0.5, 0.6 + Math.random(), (Math.random() - 0.5) * 0.5, 0.35, 2.6, 0.9, 0.2, 0.18, -1, 1, 0.05, 0); }
  },
  // ---- the Furies: three bodies, one health bar
  furiesInit(b) {
    const rigs = [b.rig, BOSS_MODELS.megaera(), BOSS_MODELS.tisiphone()];
    b.furies = { rigs, names: [...txt('bosses.furies.sisters')], active: 0, lp: rigs.map(() => new THREE.Vector3()), crack: [0, 0, 0], orbit: Math.random() * 6 };
    for (let i = 1; i < 3; i++) { const r = rigs[i]; r.tick = (dt, e) => animateExtras(r, dt, e); b.object.add(r.root); b.furies.lp[i].set(i === 1 ? 7 : -7, 5, 0); rigs[i].root.position.copy(b.furies.lp[i]); }
  },
  furiesTick(b, dt) {
    const F = b.furies; if (!F) return;
    F.orbit += dt * 0.7;
    let k = 0;
    for (let i = 0; i < 3; i++) {
      const r = F.rigs[i], lp = F.lp[i];
      F.crack[i] -= dt;
      if (i === F.active) { lp.x = damp(lp.x, 0, 3.5, dt); lp.y = damp(lp.y, 0, 3.5, dt); lp.z = damp(lp.z, 0, 3.5, dt); r.root.position.copy(lp); continue; }
      const a = F.orbit + k * Math.PI; k++;
      const want = tmp.set(Math.cos(a) * 7.5, 4.6 + Math.sin(F.orbit * 2 + i) * 0.6, Math.sin(a) * 7.5);
      lp.x = damp(lp.x, want.x, 2, dt); lp.y = damp(lp.y, want.y, 2, dt); lp.z = damp(lp.z, want.z, 2, dt);
      r.root.position.copy(lp);
      r.root.rotation.y = a + Math.PI;   // fly along the circle
      r.swap(null);
      r.torso.rotation.x -= r._lean ?? 0;
      r.animate({ dt, speed: 0.3, vel: ZERO, action: F.crack[i] > 0 ? { type: 'attack', t: 0.6, style: 'swingR', windup: 0.3, strike: 0.5 } : null });
      r._lean = (r.hunch ?? 0) + 0.25; r.torso.rotation.x += r._lean;
      animateExtras(r, dt, { swooping: true, whipCrack: F.crack[i] });
    }
  },
  furiesDie(b) { toast(txt('bosses.furies.die'), 'big'); },
  // ---- Medusa
  medusaTick(b, dt) {
    const eyes = b.rig.extras.eyes;
    if (eyes) eyes.visible = b.gazeT > 0 ? (b.gazeT < 0.5 || Math.sin(performance.now() * 0.03) > -0.3) : false;
    if (b.gazeT > 0) b.gazeT -= dt;
    const veil = b.rig.extras.veil;
    if (veil) veil.rotation.x = damp(veil.rotation.x, b.gazeT > 0 ? -0.9 : 0, 6, dt);
  },
  medusaDie(b) { toast(txt('bosses.medusa.die'), 'big'); },
  // ---- the spider queen
  spidersInit(b) { b.swarmT = 0; },
  spidersTick(b, dt) {
    const X = b.rig.extras;
    if (X.gears) for (const gg of X.gears) gg.rotation.x += dt * 2;
    if (X.abdomen) X.abdomen.rotation.x = Math.sin(performance.now() * 0.004) * 0.05;
    if (!b.swarmed && b.intro <= 0) { b.swarmed = true; b.summon(['spider', 'spider', 'spider', 'spider'], b.pos, 4, 0xffb02a); }
  },
  spidersDie(b) {
    let n = 0;
    for (const e of b.game.enemies) if (!e.dead && e.bossSummon === b) { e.hp = 0; e.die?.({ quiet: true }); n++; }   // the whole swarm winds down with her
    toast(n ? txt('bosses.spiders.dieSwarm') : txt('bosses.spiders.die'), 'big');
  },
  // ---- Procrustes
  procrustesHit(b, src) {
    if (b.grabbed && src && src !== b.grabbed && !src.isBoss && src.isPlayer) {
      b.freeHits = (b.freeHits ?? 0) + 1;
      if (b.freeHits >= 2) { const p = b.grabbed; releaseHero(b.game, p, 'freed'); b.dazeT = Math.max(b.dazeT ?? 0, 0.8); }
    }
    return 1;
  },
  procrustesDie(b) { toast(txt('bosses.procrustes.die'), 'big'); },
  // ---- Cerberus
  cerberusTick(b, dt) {
    const H = b.rig.extras.heads; if (!H) return;
    const t = performance.now() * 0.001, sleepy = b.sleepyT > 0;
    if (sleepy) b.sleepyT -= dt;
    const act = b.headAct ?? [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const h = H[i], a = act[i];
      const pitch = sleepy ? 0.75 : a > 0 ? -0.35 * a : Math.sin(t * 1.3 + i * 2) * 0.12;
      const yaw = sleepy ? 0 : Math.sin(t * 0.9 + i * 1.7) * 0.25 * (1 - a);
      h.head.rotation.x = damp(h.head.rotation.x, pitch, 8, dt);
      h.head.rotation.y = damp(h.head.rotation.y, yaw, 6, dt);
      h.mouth.rotation.x = damp(h.mouth.rotation.x, sleepy ? 0.02 : 0.15 + a * 0.6 + Math.max(0, Math.sin(t * 3 + i)) * 0.1, 12, dt);
    }
    if (sleepy && Math.random() < dt * 2) { const c = H[1].head.getWorldPosition(tmp); b.game.fx.damageNumber?.(c.clone().setY(c.y + 1), 0, { color: '#a8c8ff', text: 'z' }); }
  },
  // ---- Ares
  aresTick(b, dt) {
    const g = b.game;
    // the sea heals heroes standing in it
    b.waterT = (b.waterT ?? 0) - dt;
    if (b.waterT <= 0) {
      b.waterT = 0.5;
      for (const p of g.hostileTargets()) if (!p.dead && !p.downed && inWater(g, p)) {
        p.heal?.(p.maxHp * 0.02, true);
        g.particles.burst(p.pos.clone().setY(p.pos.y + 0.6), { count: 4, color: 0x7ad8ff, speed: 1.2, up: 1.5, life: 0.6, size: 0.12 });
        once(b, 'sea', () => toast(txt('bosses.ares.seaHeals')));
      }
    }
    if (b.rageT > 0) { b.rageT -= dt; b.speedMul = 1.35; } else b.speedMul = 1;
    if (b.riding) {
      b.rig.legR.rotation.x = -1.35; b.rig.legL.rotation.x = -1.35; b.rig.legR.rotation.z = 0.25; b.rig.legL.rotation.z = -0.25;
      b.rig.armR.rotation.x = -1.2; b.rig.armL.rotation.x = -1.2;
      if (Math.random() < 0.6) { const c = b.pos; g.particles.glow.emit(c.x - Math.sin(b.facing) * 1.6, c.y + 0.5, c.z - Math.cos(b.facing) * 1.6, 0, 0.6, 0, 0.5, 2.6, 1.0, 0.2, 0.3, -1, 1, 0.05, 0); }
    }
    const sw = b.rig.extras.sword;
    if (sw?.visible && Math.random() < 0.5) { const c = sw.localToWorld(tmp.set(0, 14 * 0.058, 0)); g.particles.glow.emit(c.x, c.y, c.z, (Math.random() - 0.5) * 0.4, 0.8 + Math.random(), (Math.random() - 0.5) * 0.4, 0.35, 2.6, 1.0, 0.2, 0.2, -1, 1, 0.05, 0); }
  },
  aresHit(b, src) {
    if (src && !src.isBoss && src.isPlayer && inWater(b.game, src)) { b.lastHitWet = true; return 1.6; }
    b.lastHitWet = false;
    return 1;
  },
  aresDie(b) {
    toast(txt('bosses.ares.dieWounded'), 'domain');
    setTimeout(() => toast(txt('bosses.ares.dieEnemy')), 2200);
  },
  // ---- Luke
  lukeHit(b, src) {
    if (b.parryT > 0 && src && !src.isBoss && src.pos && src.pos.distanceTo(b.pos) < 5) {
      const g = b.game;
      if (!b.riposte) b.riposte = src;
      g.fx.hitSpark?.(b.pos.clone().setY(b.pos.y + 1.6), null, { color: 0x9ad8ff, big: true });
      g.fx.damageNumber?.(b.pos, 0, { color: '#9ad8ff', text: txt('bosses.luke.parried') });
      g.audio?.tone({ freq: 1400, to: 900, dur: 0.15, gain: 0.12, type: 'square', filter: 4000 });
      return 0;
    }
    return 1;
  },
  lukeDie(b) {
    toast(txt('bosses.luke.die'), 'big');
    for (const e of b.game.enemies) if (!e.dead && e.bossSummon === b) { e.hp = 0; e.die?.({}); }
  },
};

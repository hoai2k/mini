// Chapter bosses. Each boss runs attack patterns as coroutines (generator
// functions that yield wait times), picks patterns by phase, and telegraphs
// every big hit with red ground markers. The models are in bossmodels.js;
// the patterns of the bosses from chapter 3 on are in bosses-book1.js.
//   • Alecto (Mrs. Dodds as a Fury, ch1): whip lash, swoop, ring of fire,
//     summons pups and harpies, a screech that slows.
//   • The Minotaur (ch2): telegraphed charges; a charge that hits a tree or a
//     wall leaves him stuck and stunned for 3 s, taking double damage (the
//     myth riddle: make it charge into the pine tree). Horn sweep, stomp,
//     rock throw; chained charges later.
//   • The alpha hellhound (ch3): shadow-travels between shadows and lunges
//     out of them, mauls, howls up pups.
//   • The Furies (ch4): Alecto, Megaera and Tisiphone share one health bar;
//     one fights on the ground while her sisters circle, and they take turns.
//   • Medusa (ch5): her stare petrifies every hero FACING her when it lands
//     (turn away!). True Sight shows the gaze cone. Snake bites poison.
//   • The Chimera (ch6): fire breath, lobbed fireballs, rattlesnake tail, pounce.
//   • The spider queen (ch7): Hephaestus's bronze queen spits nets that root,
//     calls her swarm; destroying her ends it.
//   • Procrustes (ch9): axe sweeps; straps a hero to a water bed (a teammate's
//     hit or mashing frees them; mashing free tips him onto his own bed: dazed).
//   • Cerberus (ch10): three heads (fire, bite, lunge); a sleepy spell when
//     his heads droop and he takes double damage.
//   • Ares (ch11): sword combos, spear thrust, motorcycle charge; heroes in the
//     sea heal and hit harder (def.waterBonus).
//   • Luke (ch12): fast duel with parry and riposte; summons pit scorpions.
// Bosses honour `mark` (+50% damage taken) and `status.slow`; they shrug off
// fear and root. They never target heroes who are `invisible` or `untargetable`.
//
// Per-boss hooks in BOSSES[id]: init(boss), tick(boss, dt) after the rig
// animates, damageMul(boss, src, o) → factor, onDie(boss), ambient(boss, dt).
// Fields a chapter may set on a Boss (chapter 1, objectives/museum.js):
//   standBy     true: no attack patterns and no walking (she talks; she waits
//               somewhere else after flying off). Set untargetable with it.
//   flying      true: a pattern moves her through the air itself (no physics).
//   hpFloor     health she can't be taken below; reaching it calls onFloor(boss)
//               (the flights at 75 / 50 / 25%).
//   skipPatterns  a Set of pattern names she doesn't use here.
import * as THREE from 'three/webgpu';
import { FLASH_MATERIAL } from './character.js';
import { goldDust, animateExtras, MONSTERS, MONSTER_IDS, buildMonsterModel } from './monsters.js';
import { BOSS_MODELS } from './bossmodels.js';
import { BOOK1_PATTERNS, BOOK1_HOOKS } from './bosses-book1.js';
import { releaseAllBy } from './holds.js';
import { rigOffsets } from './parts.js';
import { moveEntity } from '../physics.js';
import { damp, dampAngle, angleDiff } from '../util.js';
import { toast } from '../ui/ui.js';
import { t as txt } from '../text_config.js';
import { monsterDamage } from '../resources.js';
import { KNOCK } from '../combatRules.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const H = BOOK1_HOOKS;

const BOSSES = {
  alecto: {
    name: txt('bosses.alecto.name'), title: txt('bosses.alecto.title'), hp: 1400, speed: 3.4, dmg: 20, color: 0xff7a1a, radius: 0.9, height: 3, hover: 1.4,
    build: BOSS_MODELS.alecto,
    phases: [['whip_lash', 'swoop', 'whip_lash', 'screech'], ['whip_lash', 'swoop', 'whip_ring', 'summon_pups', 'screech'], ['swoop', 'whip_ring', 'whip_lash', 'summon_pups', 'swoop', 'screech']],
    ambient: (b) => H.whipGlow(b),
  },
  minotaur: {
    name: txt('bosses.minotaur.name'), title: txt('bosses.minotaur.title'), hp: 2200, speed: 2.6, dmg: 22, color: 0xffa040, radius: 1.2, height: 3.4,
    build: BOSS_MODELS.minotaur,
    phases: [['bull_charge', 'horn_sweep', 'rock_throw', 'bull_charge'], ['bull_charge', 'stomp', 'horn_sweep', 'rock_throw', 'bull_charge'], ['bull_charge', 'stomp', 'rock_throw', 'horn_sweep']],
    ambient: (b, dt) => { const g = b.game; if (Math.random() < dt * 1.5) { const c = b.rig.extras.muzzle.getWorldPosition(tmp); g.particles.smoke.emit(c.x, c.y, c.z, Math.sin(b.facing) * 1.5, -0.2, Math.cos(b.facing) * 1.5, 0.7, 0.5, 0.5, 0.5, 0.25, -0.5, 2, 1.2, 0); } },
  },
  hellhound_alpha: {
    name: txt('bosses.hellhound_alpha.name'), title: txt('bosses.hellhound_alpha.title'), hp: 1800, speed: 4.2, dmg: 20, color: 0xff4a1a, radius: 1.5, height: 3.4,
    build: BOSS_MODELS.hellhound_alpha,
    phases: [['maul', 'lunge', 'shadow_travel', 'maul'], ['maul', 'shadow_travel', 'howl', 'lunge'], ['shadow_travel', 'lunge', 'howl', 'maul', 'shadow_travel']],
    ambient: (b, dt) => H.hellhoundSmoke(b, dt),
  },
  furies: {
    name: txt('bosses.furies.name'), title: txt('bosses.furies.title'), hp: 2600, speed: 3.6, dmg: 15, color: 0xff7a1a, radius: 0.9, height: 3, hover: 1.4,
    build: BOSS_MODELS.alecto,
    phases: [['fury_whip', 'fury_swoop', 'sister_swap', 'fury_whip'], ['fury_whip', 'fury_swoop', 'sister_swap', 'triple_whip', 'screech'], ['triple_whip', 'fury_swoop', 'sister_swap', 'whip_ring', 'fury_swoop', 'screech']],
    init: (b) => H.furiesInit(b), tick: (b, dt) => H.furiesTick(b, dt), onDie: (b) => H.furiesDie(b), ambient: (b) => H.whipGlow(b),
  },
  medusa: {
    name: txt('bosses.medusa.name'), title: txt('bosses.medusa.title'), hp: 2400, speed: 2.4, dmg: 18, color: 0x8aff6a, radius: 1.0, height: 4,
    build: BOSS_MODELS.medusa,
    phases: [['gaze', 'snake_bite', 'veil_sweep', 'snake_bite'], ['gaze', 'snake_bite', 'wake_statues', 'veil_sweep'], ['gaze', 'snake_bite', 'gaze', 'wake_statues', 'veil_sweep']],
    tick: (b, dt) => H.medusaTick(b, dt), onDie: (b) => H.medusaDie(b),
  },
  chimera: {
    name: txt('bosses.chimera.name'), title: txt('bosses.chimera.title'), hp: 2400, speed: 3, dmg: 20, color: 0xff6a1a, radius: 1.3, height: 3,
    build: BOSS_MODELS.chimera,
    phases: [['fire_breath', 'fireballs', 'tail_strike'], ['fire_breath', 'pounce', 'fireballs', 'tail_strike'], ['fire_breath', 'fireballs', 'pounce', 'tail_strike', 'fire_breath']],
    ambient: (b) => { const g = b.game; if (Math.random() < 0.4) { const c = b.mouth(); g.particles.glow.emit(c.x, c.y, c.z, (Math.random() - 0.5) * 0.5, 0.8 + Math.random(), (Math.random() - 0.5) * 0.5, 0.4, 2.6, 1, 0.2, 0.2, -1, 1, 0.05, 0); } },
  },
  spiders: {
    name: txt('bosses.spiders.name'), title: txt('bosses.spiders.title'), hp: 2000, speed: 3.2, dmg: 16, color: 0xffb02a, radius: 1.6, height: 2.6,
    build: BOSS_MODELS.spiders,
    phases: [['net_spit', 'leg_stab', 'spawn_swarm', 'net_spit'], ['net_spit', 'leg_stab', 'skitter', 'spawn_swarm'], ['net_spit', 'skitter', 'spawn_swarm', 'leg_stab', 'net_spit']],
    init: (b) => H.spidersInit(b), tick: (b, dt) => H.spidersTick(b, dt), onDie: (b) => H.spidersDie(b),
  },
  procrustes: {
    name: txt('bosses.procrustes.name'), title: txt('bosses.procrustes.title'), hp: 2600, speed: 2.8, dmg: 22, color: 0xd8302a, radius: 1.2, height: 4.4,
    build: BOSS_MODELS.procrustes,
    phases: [['axe_sweep', 'grab_bed', 'axe_chop', 'axe_sweep'], ['axe_sweep', 'grab_bed', 'axe_chop', 'sales_pitch'], ['grab_bed', 'axe_sweep', 'axe_chop', 'sales_pitch', 'grab_bed']],
    damageMul: (b, src) => H.procrustesHit(b, src), onDie: (b) => H.procrustesDie(b),
  },
  cerberus: {
    name: txt('bosses.cerberus.name'), title: txt('bosses.cerberus.title'), hp: 3200, speed: 2.8, dmg: 22, color: 0xff8a1a, radius: 2.0, height: 4.4,
    build: BOSS_MODELS.cerberus,
    phases: [['triple_attack', 'head_bite', 'sleepy', 'cerberus_stomp'], ['triple_attack', 'head_fire', 'head_lunge', 'sleepy', 'cerberus_stomp'], ['triple_attack', 'head_fire', 'head_lunge', 'triple_attack', 'sleepy', 'cerberus_stomp']],
    tick: (b, dt) => H.cerberusTick(b, dt), damageMul: (b) => (b.sleepyT > 0 ? 2 : 1),
  },
  ares: {
    name: txt('bosses.ares.name'), title: txt('bosses.ares.title'), hp: 3000, speed: 3.2, dmg: 21, color: 0xff3a14, radius: 1.1, height: 4.2, waterBonus: true,
    build: BOSS_MODELS.ares,
    phases: [['sword_combo', 'spear_thrust', 'bike_charge', 'sword_combo'], ['sword_combo', 'bike_charge', 'spear_thrust', 'war_cry'], ['bike_charge', 'sword_combo', 'spear_thrust', 'war_cry', 'bike_charge']],
    tick: (b, dt) => H.aresTick(b, dt), damageMul: (b, src, o) => H.aresHit(b, src, o), onDie: (b) => H.aresDie(b),
  },
  luke: {
    name: txt('bosses.luke.name'), title: txt('bosses.luke.title'), hp: 2200, speed: 4.4, dmg: 17, color: 0xe0a040, radius: 0.7, height: 2.6,
    build: BOSS_MODELS.luke,
    phases: [['duel_combo', 'parry', 'lunge_strike', 'duel_combo'], ['duel_combo', 'parry', 'summon_scorpion', 'lunge_strike'], ['duel_combo', 'parry', 'lunge_strike', 'summon_scorpion', 'duel_combo', 'parry']],
    damageMul: (b, src, o) => H.lukeHit(b, src, o), onDie: (b) => H.lukeDie(b),
  },
};
// Old chapter data may still name these.
const BOSS_ALIASES = { hellhound: 'hellhound_alpha', pit_scorpion: 'luke', kindly_ones: 'furies', spider_queen: 'spiders' };

export const BOSS_IDS = Object.keys(BOSSES);
export const BOSS_DEFS = BOSSES;

const BOSS_VOICE = { minotaur: ['roar', 0.85], cerberus: ['roar', 0.7], chimera: ['roar', 1], hellhound_alpha: ['bark', 0.7], medusa: ['hiss', 0.8], furies: ['screech', 0.9], alecto: ['screech', 0.9], spiders: ['click', 0.7] };

// Boss health for the party: each extra player adds 60%, an AI companion 35%
// (companions deal less than people do). 1 player + 2 companions: x1.7.
export function partyHpScale(players) {
  const humans = Math.max(1, players.filter((p) => !p.ai).length), ai = players.filter((p) => p.ai).length;
  return 1 + (humans - 1) * 0.6 + ai * 0.35;
}

export class Boss {
  constructor(game, id, pos, level = 1) {
    id = BOSS_ALIASES[id] ?? id;
    if (!BOSSES[id]) { console.warn('unknown boss', id, '- using the Minotaur'); id = 'minotaur'; }
    this.game = game; this.id = id; this.B = BOSSES[id];
    this.def = { name: this.B.name, tier: 'boss', knockResist: 0.95, pitch: 0.5, waterBonus: !!this.B.waterBonus };
    this.displayName = this.B.name;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = this.B.radius ?? 1.1; this.height = this.B.height ?? 4.2;
    this.maxHp = this.B.hp * (1 + (level - 1) * 0.45) * partyHpScale(game.players); this.hp = this.maxHp;
    this.dmg = monsterDamage(this.B.dmg, 'boss', level, 0.2);   // (scaled for bosses, resources.js)
    this.level = level;
    // The rig turns inside an unrotated holder, so a boss can carry parts that
    // don't turn with it (the Furies' circling sisters).
    this.rig = this.B.build(); this.object = new THREE.Group(); this.object.add(this.rig.root); this.object.position.copy(pos);
    this.rig.tick ??= (dt2, e) => animateExtras(this.rig, dt2, e);
    this.facing = 0; this.phase = 0; this.isBoss = true; this.isEnemy = true;
    this.co = null; this.coWait = 0; this.flashT = 0; this.dead = false; this.deathT = 0;
    this.grounded = false; this.coyote = 0; this.visY = pos.y; this.stepUp = true;
    this.anim = null; this.moving = true; this.untargetable = false;
    this.status = { fear: 0, root: 0, slow: 0 }; this.mark = 0; this.stunT = 0; this.hoverY = this.B.hover ?? 0;
    this.home = pos.clone();
    this.intro = 2.6;
    this.lastPattern = null;
    this.lightH = game.lights.attach(this.object, this.B.color, 4, 10, { offsetY: 5, priority: 3 });
    this.B.init?.(this);
  }
  get name() { return this.B.name; }
  get title() { return this.B.title; }
  // ---------------------------------------------------------------- damage
  takeDamage(amount, src, o = {}) {
    if (this.dead || this.untargetable || this.intro > 0) return 0;
    const mul = this.B.damageMul ? this.B.damageMul(this, src, o) : 1;
    if (mul <= 0) return 0;
    const dmg = amount * mul * (this.stunT > 0 ? 2 : 1) * (this.mark > 0 ? 1.5 : 1);
    this.hp -= dmg; this.flashT = 0.08;
    if (this.hpFloor != null && this.hp <= this.hpFloor) { this.hp = this.hpFloor; const fn = this.onFloor; this.hpFloor = null; fn?.(this); return dmg; }
    if (o.knock && this.stunT <= 0) this.knock.addScaledVector(o.knock, KNOCK.boss);   // a boss only budges (combatRules.js)
    const f = this.hp / this.maxHp;
    const want = f < 0.33 ? 2 : f < 0.66 ? 1 : 0;
    if (want > this.phase && this.hp > 0 && this.stunT <= 0) this.enterPhase(want);
    if (this.hp <= 0) this.die();
    return dmg;
  }
  enterPhase(n) {
    const g = this.game;
    this.phase = n;
    this.swooping = false; this.knock.set(0, 0, 0);
    this.cleanupPattern?.(); this.cleanupPattern = null;
    this.co = this.roar(); this.coWait = 0;
    toast(txt('bosses.phase', { n: n + 1 }), 'big');
    g.audio?.boss();
    // a recorded roar for the beasts (the voice recordings in assets/sfx)
    const v = BOSS_VOICE[this.id];
    if (v) setTimeout(() => g.audio?.voiceSample?.(v[0], v[1]), 450);
    g.fx.flash(this.B.color, 0.4, 0.3);
    g.shake(0.7);
  }
  die() {
    const g = this.game;
    if (this.dead) return;
    this.dead = true; this.deathT = 0; this.co = null; this.stunT = 0;
    this.cleanupPattern?.(); this.cleanupPattern = null;
    releaseAllBy(g, this);
    this.B.onDie?.(this);
    g.slowMo(1.6, 0.25);
    g.shake(1); g.fx.flash(0xffd84a, 0.6, 0.4);
    g.audio?.enemyDie(true); g.audio?.gong();
    g.lights.remove(this.lightH);
    for (const m of g.markers.items) if (m.active && !m.keep) g.markers.cancel(m);
    g.onBossKilled?.(this);
  }
  // ---------------------------------------------------------------- helpers
  target() {
    let best = null, bd = Infinity;
    for (const p of this.game.hostileTargets()) { if (p.dead || p.downed || p.invisible || p.untargetable) continue; const d = p.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  // every hero a boss may pick on (alive, visible)
  targets() { return this.game.hostileTargets().filter((p) => !p.dead && !p.downed && !p.invisible && !p.untargetable); }
  hurtPlayers(center, radius, dmg, knockPow = 8, filter = null) {
    for (const p of this.game.hostileTargets()) {
      if (p.dead) continue;
      tmp.subVectors(p.pos, center); const dy = tmp.y; tmp.y = 0;
      if (tmp.length() < radius + (p.radius ?? 0.3) && Math.abs(dy) < 3 && (!filter || filter(p))) p.takeDamage(dmg, this, { knock: tmp.normalize().multiplyScalar(knockPow) });
    }
  }
  // players inside a line from `from` along `dir`
  hurtLine(from, dir, len, half, dmg, knockPow = 8, hit = null) {
    const out = [];
    for (const p of this.game.hostileTargets()) {
      if (p.dead || hit?.has(p)) continue;
      tmp.subVectors(p.pos, from); const dy = tmp.y; tmp.y = 0;
      const along = tmp.dot(dir), lat = Math.abs(tmp.x * dir.z - tmp.z * dir.x);
      if (along > -0.5 && along < len && lat < half + (p.radius ?? 0.3) && Math.abs(dy) < 3) { hit?.add(p); if (p.takeDamage(dmg, this, { knock: dir.clone().multiplyScalar(knockPow) }) > 0) out.push(p); }
    }
    return out;
  }
  // players inside a cone in front (radius, half-angle)
  hurtCone(radius, half, dmg, knockPow = 8, facing = this.facing, center = this.pos) {
    const out = [];
    for (const p of this.game.hostileTargets()) {
      if (p.dead) continue;
      tmp.subVectors(p.pos, center); const dy = tmp.y; tmp.y = 0;
      if (tmp.length() < radius + (p.radius ?? 0.3) && Math.abs(dy) < 3 && Math.abs(angleDiff(facing, Math.atan2(tmp.x, tmp.z))) < half) { if (p.takeDamage(dmg, this, { knock: tmp.normalize().multiplyScalar(knockPow).setY(3) }) > 0) out.push(p); }
    }
    return out;
  }
  ground(p) { const gy = this.game.world.groundBelow(p.x, p.z, p.y + 4); return isFinite(gy) ? gy : p.y; }
  faceTarget(t) { if (t) this.facing = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z); return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)); }
  fwd() { return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)); }
  mouth() { return this.rig.mouthWorld ? this.rig.mouthWorld(new THREE.Vector3()) : this.pos.clone().setY(this.pos.y + this.height * 0.8); }
  // spawn helpers for summons: a ring of monsters around a point
  summon(kinds, center = this.pos, r = 3.5, color = this.B.color) {
    const g = this.game, out = [];
    kinds.forEach((kind, i) => {
      const a = i / kinds.length * Math.PI * 2 + Math.random() * 0.6;
      const s = center.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); s.y = this.ground(s);
      if (g.world.solidAt?.(s.x, s.y + 0.5, s.z)) return;
      const e = g.spawnEnemy(kind, s, { summoned: true, level: g.mission?.def?.level ?? g.mission?.def?.difficulty ?? this.level }); if (e) { g.fx.summonCircle(s, color); e.aggro = true; e.bossSummon = this; out.push(e); }
    });
    return out;
  }
  // The room a boss stands in (its arena, or wherever Mrs. Dodds has flown).
  roomAt(p = this.pos) { return this.game.mission?.L?.rooms?.find((r) => p.x >= r.x0 && p.x <= r.x1 + 1 && p.z >= r.z0 && p.z <= r.z1 + 1) ?? null; }
  // A straight dash along dir (swoop, charge, pounce). Returns 'wall' if a
  // tall obstacle stopped it and stopOnWall is set, 'edge' where it would
  // leave the room it started in or run off a drop: it skids to a halt there
  // (a bull charge used to carry the Minotaur off Half-Blood Hill and out of
  // sight, until he fell far enough to be put back at his start).
  *dashLine(dir, speed, ticks, dmg, { stopOnWall = false, hitR = 2.2, dust = 0x8a7a6a, trail = null } = {}) {
    const g = this.game, w = g.world, hit = new Set(), last = this.pos.clone();
    const room = this.roomAt();
    let stuck = 0;
    for (let k = 0; k < ticks; k++) {
      this.knock.copy(dir).multiplyScalar(speed);
      for (const p of g.hostileTargets()) { if (!p.dead && !hit.has(p) && p.pos.distanceTo(this.pos) < hitR + (p.radius ?? 0.3)) { hit.add(p); p.takeDamage(dmg, this, { knock: dir.clone().multiplyScalar(13).setY(4) }); } }
      if (dust) g.particles.burst(this.pos, { count: 3, color: dust, additive: false, speed: 2, life: 0.5, size: 0.6, sizeEnd: 1.6 });
      trail?.(k);
      if (stopOnWall && k > 0) {
        // a tree, wall or pillar dead ahead (too tall to step over) or no headway against one
        const ax = this.pos.x + dir.x * (this.radius + 0.5), az = this.pos.z + dir.z * (this.radius + 0.5);
        const tall = w.solidAt(ax, this.pos.y + 1.5, az) && w.solidAt(ax, this.pos.y + 2.5, az);
        const moved = Math.hypot(this.pos.x - last.x, this.pos.z - last.z);
        stuck = this.hitWall && moved < speed * 0.01 ? stuck + 1 : 0;
        if (tall || stuck >= 2) { this.knock.set(0, 0, 0); this.vel.set(0, 0, 0); return 'wall'; }
      }
      // the next step would leave the room it started in (a doorway, an open
      // edge) or run off a drop: skid to a halt there
      const look = this.radius + 0.3 + speed * 0.05, bx = this.pos.x + dir.x * look, bz = this.pos.z + dir.z * look;
      const out = room && (bx < room.x0 || bx > room.x1 + 1 || bz < room.z0 || bz > room.z1 + 1);
      const gy = w.groundBelow(bx, bz, this.pos.y + 1.5);
      if (out || !isFinite(gy) || gy < this.pos.y - 2) { this.knock.set(0, 0, 0); this.vel.multiplyScalar(0.2); return 'edge'; }
      last.copy(this.pos);
      yield 0.04;
    }
    this.knock.set(0, 0, 0);
    return 'done';
  }
  // ---------------------------------------------------------------- shared patterns
  *roar() {
    const g = this.game;
    this.untargetable = true; this.anim = { type: 'raise', t: 0 }; this.moving = false;
    g.fx.shockwave(this.pos, this.B.color, 7);
    this.hurtPlayers(this.pos, 4, this.dmg * 0.5, 14);
    yield 1.2;
    this.untargetable = false; this.anim = null; this.moving = true;
  }
  *summon_pups() {
    const g = this.game;
    this.anim = { type: 'raise', t: 0 }; this.moving = false;
    const kinds = ['pup', 'pup'];
    if (this.phase >= 1) kinds.push('harpy');
    if (this.phase >= 2) kinds.push('pup', 'harpy');
    for (const kind of kinds) {
      const a = Math.random() * Math.PI * 2; const s = this.pos.clone().add(new THREE.Vector3(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5)); s.y = this.ground(s);
      const e = g.spawnEnemy(kind, s, { summoned: true, level: g.mission?.def?.level ?? g.mission?.def?.difficulty ?? 1 }); if (e) g.fx.summonCircle(s, this.B.color);
    }
    g.audio?.energy('summon');
    yield 1.0;
    this.anim = null; this.moving = true;
  }
  // ---------------------------------------------------------------- Alecto
  *whip_lash() {
    const g = this.game;
    for (let k = 0; k < 1 + this.phase; k++) {
      const t = this.target(); if (!t) break;
      this.moving = false;
      const dir = this.faceTarget(t);
      const from = this.pos.clone().setY(this.ground(this.pos));
      g.markers.spawn({ pos: from, shape: 'rect', width: 1.8, length: 10, facing: this.facing, dur: 0.75 - this.phase * 0.1, color: 0xff3a1a });
      this.anim = { type: 'attack', t: 0.2, style: 'swingR', windup: 0.3, strike: 0.5 };
      yield 0.75 - this.phase * 0.1;
      this.anim = { type: 'attack', t: 0.6, style: 'swingR', windup: 0.3, strike: 0.5 }; this.whipCrack = 0.3;
      const o = from.clone().setY(from.y + 1);
      g.fx.slashLine(o, dir, 10, 0xff8a2a, 0.5, 0.25);
      for (let s = 1; s < 10; s += 1) g.particles.burst(o.clone().addScaledVector(dir, s), { count: 3, color: 0xff7a1a, speed: 2, up: 1, life: 0.4, size: 0.25, sizeEnd: 0.05 });
      g.audio?.energy('slash'); g.audio?.impact(1.2);
      this.hurtLine(from, dir, 10, 0.9, this.dmg, 7);
      yield 0.35;
    }
    this.anim = null; this.moving = true;
    yield 0.5;
  }
  *swoop() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 3, length: 16, facing: this.facing, dur: 0.95, color: 0xff2a1a });
    this.anim = { type: 'raise', t: 0 }; this.hoverY = (this.B.hover ?? 0) + 1.2;
    g.audio?.tone({ freq: 700, to: 1400, dur: 0.5, gain: 0.07, type: 'sawtooth', filter: 3000 });
    yield 0.95;
    this.swooping = true; this.hoverY = Math.max(0.3, this.rig.hoverMin ?? 0);   // (rig.hoverMin: a Fury's hem would drag through the floor)
    this.anim = { type: 'attack', t: 0.6, style: 'slam', windup: 0.3, strike: 0.5 };
    g.audio?.whoosh(1.6);
    yield* this.dashLine(dir, 24, 16, this.dmg * 1.1, { dust: 0x3a2a24, hitR: 2 });
    this.swooping = false; this.hoverY = this.B.hover ?? 0;
    this.anim = null; this.moving = true;
    yield 0.7;
  }
  *whip_ring() {
    const g = this.game;
    this.moving = false;
    const R = 5.5;
    g.markers.spawn({ pos: this.pos, radius: R, dur: 1.0, color: 0xff3a1a, follow: this });
    this.anim = { type: 'attack', t: 0.2, style: 'spin', windup: 0.3, strike: 0.5 };
    yield 1.0;
    this.anim = { type: 'attack', t: 0.7, style: 'spin', windup: 0.3, strike: 0.5 }; this.whipCrack = 0.5;
    g.fx.shockwave(this.pos, 0xff7a1a, R + 0.5); g.fx.slashArc(this.pos, this.facing, 0xff8a2a, R, 1, 0.3);
    g.audio?.energy('fire'); g.shake(0.35);
    this.hurtPlayers(this.pos, R, this.dmg * 1.1, 11);
    const n = 6 + this.phase * 2;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.hazards.fire(this.pos.clone().add(new THREE.Vector3(Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2)), this.dmg * 0.35, 1.1); }
    yield 0.5;
    this.anim = null; this.moving = true;
    yield 0.4;
  }
  *screech() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'raise', t: 0 };
    // aimed: a cone at the nearest hero (a ring round her filled the room)
    const R = 9, HALF = 0.6;
    this.faceTarget(this.target());
    g.markers.spawn({ pos: this.pos, radius: R, dur: 0.9, shape: 'cone', arc: HALF / Math.PI, facing: this.facing, color: 0xb05aff, follow: this });
    yield 0.9;
    g.fx.slashArc(this.pos, this.facing, 0xd8a0ff, R, HALF * 2 / Math.PI, 0.3); g.fx.screenWave(this.pos, 0.8, 0.5); g.fx.chroma(0.6);
    g.audio?.tone({ freq: 1400, to: 2200, dur: 0.6, gain: 0.1, type: 'sawtooth', filter: 5000 }); g.audio?.tone({ freq: 1500, to: 900, dur: 0.6, gain: 0.07, type: 'square', filter: 4000, at: 0.05 });
    for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(this.pos) < R && Math.abs(angleDiff(this.facing, Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z))) < HALF) { p.slowT = Math.max(p.slowT ?? 0, 2.5); p.takeDamage(this.dmg * 0.3, this, { knock: tmp.subVectors(p.pos, this.pos).setY(0).normalize().multiplyScalar(5) }); }
    yield 0.6;
    this.anim = null; this.moving = true;
    yield 0.3;
  }
  // ---------------------------------------------------------------- Minotaur
  *bull_charge() {
    const g = this.game;
    const n = this.phase === 0 ? 1 : this.phase + 1;
    for (let k = 0; k < n; k++) {
      const t = this.target(); if (!t) break;
      this.moving = false;
      const dir = this.faceTarget(t);
      const tele = Math.max(0.6, 1.15 - this.phase * 0.2 - k * 0.1);
      g.markers.spawn({ pos: this.pos.clone().setY(this.ground(this.pos)), shape: 'rect', width: 3, length: 20, facing: this.facing, dur: tele, color: 0xff2a1a });
      this.anim = { type: 'attack', t: 0.2, style: 'slam', windup: 0.3, strike: 0.5 };
      g.audio?.tone({ freq: 90, to: 60, dur: tele, gain: 0.25, type: 'sawtooth', filter: 500 });
      for (let i = 0; i < 3; i++) { g.particles.burst(this.pos, { count: 6, color: 0x8a7a6a, additive: false, speed: 2, up: 1, life: 0.5, size: 0.5, sizeEnd: 1.4 }); yield tele / 3; }
      this.anim = { type: 'attack', t: 0.3, style: 'punch', windup: 0.3, strike: 0.5 };
      g.audio?.impact(1.4);
      const r = yield* this.dashLine(dir, 20 + this.phase * 4, 22, this.dmg * 1.3, { stopOnWall: true, hitR: 2.4 });
      if (r === 'wall') { yield* this.stuck(dir); return; }
      if (r === 'edge') g.particles.burst(this.pos, { count: 12, color: 0x8a7a6a, additive: false, speed: 3, life: 0.6, size: 0.6, sizeEnd: 1.6 });   // (a skid)
      this.anim = null;
      yield 0.5;
    }
    this.anim = null; this.moving = true;
    yield 0.6;
  }
  *stuck(dir) {
    const g = this.game;
    const c = this.pos.clone().addScaledVector(dir, this.radius + 0.4).setY(this.pos.y + 2.2);
    g.shake(0.9); g.fx.explosion(c, 0xc9a070, 1.6); g.audio?.impact(2.2); g.audio?.breakBlock('wood');
    for (let i = 0; i < 10; i++) g.debris.spawn(c.clone(), new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, (Math.random() - 0.5) * 6), 0.35, new THREE.Color(0.4, 0.3, 0.2), 1.2);
    toast(txt('bosses.minotaur.hornsStuck'), 'big');
    this.stunT = 3; this.anim = { type: 'stagger', t: 0 }; this.moving = false;
    yield 3;
    this.stunT = 0;
    g.particles.burst(c, { count: 16, color: 0x8a6a4a, additive: false, speed: 4, life: 0.6, size: 0.4, gravity: 8 });
    this.anim = { type: 'raise', t: 0 };
    g.audio?.tone({ freq: 120, to: 70, dur: 0.8, gain: 0.3, type: 'sawtooth', filter: 600 });
    yield 0.6;
    this.anim = null; this.moving = true;
  }
  *horn_sweep() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    this.faceTarget(t);
    g.markers.spawn({ pos: this.pos, radius: 5.5, dur: 0.7, shape: 'cone', arc: 0.35, facing: this.facing, color: 0xff2a1a, follow: this });   // (the sweep hits within 1.1 rad either side, 5.5 m out)
    this.anim = { type: 'attack', t: 0.2, style: 'swingR', windup: 0.3, strike: 0.5 };
    yield 0.7;
    this.anim = { type: 'attack', t: 0.6, style: 'swingR', windup: 0.3, strike: 0.5 };
    g.fx.slashArc(this.pos, this.facing, 0xfff0d0, 5.2, 0.95, 0.2);
    g.audio?.swing(2); g.audio?.impact(1.4);
    for (const p of g.hostileTargets()) { if (p.dead) continue; tmp.subVectors(p.pos, this.pos).setY(0); if (tmp.length() < 5.5 && Math.abs(angleDiff(this.facing, Math.atan2(tmp.x, tmp.z))) < 1.1) p.takeDamage(this.dmg, this, { knock: tmp.normalize().multiplyScalar(11).setY(5) }); }
    yield 0.4;
    this.anim = null; this.moving = true;
    yield 0.4;
  }
  *stomp() {
    const g = this.game;
    this.moving = false;
    const R = 5;   // (a ring you can run out of in the wind-up)
    g.markers.spawn({ pos: this.pos, radius: R, dur: 0.9, color: 0xff2a1a, follow: this });
    this.anim = { type: 'attack', t: 0.2, style: 'slam', windup: 0.3, strike: 0.5 };
    yield 0.9;
    this.anim = { type: 'attack', t: 0.6, style: 'slam', windup: 0.3, strike: 0.5 };
    g.fx.shockwave(this.pos, 0xc9a070, R); g.shake(0.6); g.audio?.impact(2);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.debris.spawn(this.pos.clone().setY(this.pos.y + 0.5), new THREE.Vector3(Math.cos(a) * 8, 5, Math.sin(a) * 8), 0.4, new THREE.Color(0.35, 0.3, 0.22), 1.2); }
    this.hurtPlayers(this.pos, R, this.dmg * 0.9, 12);
    yield 0.5;
    this.anim = null; this.moving = true;
    yield 0.4;
  }
  *rock_throw() {
    const g = this.game;
    this.moving = false;
    for (let k = 0; k < 1 + Math.min(1, this.phase); k++) {
      const t = this.target(); if (!t) break;
      this.faceTarget(t);
      this.anim = { type: 'attack', t: 0.2, style: 'throw', windup: 0.3, strike: 0.5 };
      const c = (t.vel ? t.pos.clone().addScaledVector(t.vel, 0.5) : t.pos.clone()); c.y = this.ground(c);
      const flight = 1.1;
      g.markers.spawn({ pos: c, radius: 2.4, dur: 0.6 + flight, color: 0xff2a1a });
      yield 0.6;
      this.anim = { type: 'attack', t: 0.6, style: 'throw', windup: 0.3, strike: 0.5 };
      const from = this.pos.clone().setY(this.pos.y + this.height);
      const grav = 16;
      const vel = new THREE.Vector3((c.x - from.x) / flight, (c.y - from.y) / flight + 0.5 * grav * flight, (c.z - from.z) / flight);
      const self = this;
      g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg, gravity: grav, life: flight, shape: 'cube', color: 0x7a6a58, emissive: 0.2, scale: 4, radius: 0.9, ghost: true,
        trail: (p) => { if (Math.random() < 0.4) g.particles.burst(p.pos, { count: 1, color: 0x8a7a6a, additive: false, speed: 0.4, life: 0.5, size: 0.4, sizeEnd: 0.8 }); },
        onHit: (target) => { target.takeDamage(self.dmg, self, { knock: tmp.set(vel.x, 0, vel.z).normalize().multiplyScalar(8) }); },
        onExpire: (p) => { g.fx.explosion(p.pos, 0xc9a070, 2.2); self.hurtPlayers(p.pos, 2.4, self.dmg * 0.8, 9); g.shake(0.3); for (let i = 0; i < 6; i++) g.debris.spawn(p.pos.clone().setY(p.pos.y + 0.5), new THREE.Vector3((Math.random() - 0.5) * 8, 5, (Math.random() - 0.5) * 8), 0.45, new THREE.Color(0.45, 0.4, 0.34), 1.4); } });
      g.audio?.whoosh(1.5);
      yield 0.5;
    }
    this.anim = null; this.moving = true;
    yield 0.4;
  }
  // ---------------------------------------------------------------- Chimera
  *fire_breath() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    this.faceTarget(t);
    g.markers.spawn({ pos: this.pos, radius: 11, dur: 0.9, shape: 'cone', arc: 0.28, facing: this.facing, color: 0xff5a1a });
    this.anim = { type: 'raise', t: 0 };
    yield 0.9;
    this.anim = { type: 'cast', t: 1 };
    g.audio?.energy('fire');
    for (let k = 0; k < 16; k++) {
      const dir = tmp2.set(Math.sin(this.facing), 0, Math.cos(this.facing));
      const from = this.mouth();
      g.particles.burst(from, { count: 10, color: k % 2 ? 0xff7a2a : 0xffc84a, speed: 16, spread: 0.25, dir, life: 0.6, size: 0.5, sizeEnd: 2.5, drag: 1.5, intensity: 3 });
      if (k % 3 === 0) for (const p of g.hostileTargets()) {
        if (p.dead) continue; tmp.subVectors(p.pos, this.pos).setY(0); const d = tmp.length();
        if (d < 11.5 && Math.abs(angleDiff(this.facing, Math.atan2(tmp.x, tmp.z))) < 0.75) p.takeDamage(this.dmg * 0.35, this, { knock: tmp.normalize().multiplyScalar(4) });
      }
      g.lights.flash(from.addScaledVector(dir, 4), 0xff6a1a, 8, 10, 0.1);
      yield 0.06;
    }
    this.anim = null; this.moving = true;
    yield 0.5;
  }
  *fireballs() {
    const g = this.game;
    this.moving = false; this.anim = { type: 'cast', t: 1 };
    const spots = [];
    for (const p of g.hostileTargets()) if (!p.dead && !p.invisible) spots.push(p.pos.clone());
    while (spots.length < 4 + this.phase * 2) { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 8; spots.push(this.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))); }
    const self = this, flight = 1.0, grav = 14;
    for (const s of spots) {
      s.y = this.ground(s);
      g.markers.spawn({ pos: s, radius: 2, dur: flight + 0.05, color: 0xff4a1a });
      const from = this.mouth();
      const vel = new THREE.Vector3((s.x - from.x) / flight, (s.y - from.y) / flight + 0.5 * grav * flight, (s.z - from.z) / flight);
      g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg, gravity: grav, life: flight, shape: 'orb', color: 0xff6a1a, scale: 2.6, radius: 0.6, ghost: true, light: 4,
        trail: (p) => { g.particles.burst(p.pos, { count: 1, color: 0xff8a2a, speed: 0.4, life: 0.4, size: 0.5, sizeEnd: 0.1, drag: 3 }); },
        onHit: (target) => target.takeDamage(self.dmg * 0.6, self, {}),
        onExpire: (p) => { g.fx.explosion(p.pos, 0xff6a1a, 2); self.hurtPlayers(p.pos, 2, self.dmg, 7); g.hazards.fire(p.pos, self.dmg * 0.4, 1.3); } });
      g.audio?.energy('fire');
      yield 0.12;
    }
    yield flight;
    this.anim = null; this.moving = true;
    yield 0.4;
  }
  *tail_strike() {
    const g = this.game;
    this.moving = false;
    const R = 5;
    g.markers.spawn({ pos: this.pos, radius: R, dur: 0.8, color: 0x8aff3a, follow: this });
    this.anim = { type: 'attack', t: 0.1, style: 'spin', windup: 0.3, strike: 0.5 };
    g.audio?.noise({ dur: 0.8, gain: 0.2, type: 'highpass', freq: 5000 }); // rattle
    yield 0.8;
    this.anim = { type: 'attack', t: 0.6, style: 'spin', windup: 0.3, strike: 0.5 };
    g.fx.slashArc(this.pos, this.facing + Math.PI, 0x8aff3a, R, 1, 0.25);
    g.audio?.swing(1);
    this.hurtPlayers(this.pos, R, this.dmg * 0.9, 10);
    const back = this.pos.clone().add(new THREE.Vector3(-Math.sin(this.facing) * 3, 0, -Math.cos(this.facing) * 3));
    g.hazards.acid(back, this.dmg * 0.4);
    yield 0.5;
    this.anim = null; this.moving = true;
    yield 0.3;
  }
  *pounce() {
    const g = this.game, t = this.target(); if (!t) return;
    this.moving = false;
    const dir = this.faceTarget(t);
    const dist = Math.min(12, t.pos.distanceTo(this.pos));
    const land = this.pos.clone().addScaledVector(dir, dist); land.y = this.ground(land);
    g.markers.spawn({ pos: land, radius: 3, dur: 0.85, color: 0xff2a1a });
    this.anim = { type: 'attack', t: 0.15, style: 'bite', windup: 0.3, strike: 0.5 };
    yield 0.85;
    this.anim = { type: 'dodge', t: 0.5 };
    this.vel.y = 9;
    yield* this.dashLine(dir, dist / 0.4, 10, this.dmg * 0.6, { dust: 0 });
    this.anim = { type: 'attack', t: 0.5, style: 'bite', windup: 0.3, strike: 0.5 };
    g.fx.shockwave(this.pos, 0xff8a3a, 3.4); g.shake(0.5); g.audio?.impact(1.8);
    this.hurtPlayers(this.pos, 3, this.dmg * 1.1, 11);
    yield 0.5;
    this.anim = null; this.moving = true;
    yield 0.4;
  }
  pickPattern() {
    let list = this.B.phases[Math.max(0, Math.min(2, this.phase | 0))];
    if (this.skipPatterns) list = list.filter((p) => !this.skipPatterns.has(p)).length ? list.filter((p) => !this.skipPatterns.has(p)) : list;
    let p;
    for (let i = 0; i < 4; i++) { p = list[Math.floor(Math.random() * list.length)]; if (p !== this.lastPattern) break; }
    if (typeof this[p] !== 'function') { console.warn('boss pattern missing', p, this.phase); p = list[0]; }
    this.lastPattern = p;
    return this[p]();
  }
  // ---------------------------------------------------------------- update
  update(dt) {
    const g = this.game;
    if (this.dead) {
      this.deathT += dt;
      if (Math.random() < 0.5) goldDust(g, this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * this.height, (Math.random() - 0.5) * 3)), 1);
      this.object.scale.setScalar(Math.max(0.01, 1 - this.deathT / 1.8));
      this.object.rotation.y += dt * 4;
      if (this.deathT > 1.8) { goldDust(g, this.pos.clone().setY(this.pos.y + 2), 3, { big: true }); return false; }
      return true;
    }
    if (g.frozen && g.domainSys?.inside(this.pos)) { this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null); this.flashT -= dt; return true; }
    this.flashT -= dt; this.whipCrack = (this.whipCrack ?? 0) - dt;
    this.intro = Math.max(0, this.intro - dt);
    this.mark = Math.max(0, this.mark - dt);
    for (const k in this.status) this.status[k] = Math.max(0, this.status[k] - dt);
    const t = this.target();
    // dazed (a hook knocked it out: Procrustes tipped onto his bed): stunned,
    // taking double damage, its attack patterns paused until it comes to
    if (this.dazeT > 0) { this.dazeT -= dt; this.stunT = this.dazeT > 0 ? Math.max(this.stunT, this.dazeT) : 0; }
    // coroutine
    if (this.intro <= 0 && !(this.dazeT > 0) && !this.standBy) {
      if (this.coWait > 0) this.coWait -= dt;
      else {
        if (!this.co) this.co = this.pickPattern();
        const r = this.co.next();
        if (r.done) { this.co = null; this.cleanupPattern = null; this.coWait = 0.4 + Math.random() * 0.6 - this.phase * 0.15; }
        else this.coWait = r.value ?? 0;
      }
    }
    // movement toward the nearest player
    let move = tmp2.set(0, 0, 0);
    if (t && this.moving && this.intro <= 0 && this.stunT <= 0 && !this.standBy && !this.flying) {
      tmp.subVectors(t.pos, this.pos).setY(0); const d = tmp.length();
      const slow = (this.status.slow > 0 ? 0.6 : 1) * (this.slowT > 0 ? 0.7 : 1);
      if (d > (this.B.keep ?? 3.5)) move.copy(tmp.normalize().multiplyScalar(this.B.speed * (1 + this.phase * 0.2) * slow * (this.speedMul ?? 1)));
      this.facing = dampAngle(this.facing, Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z), 4, dt);
    }
    this.slowT = (this.slowT ?? 0) - dt;
    this.vel.x = damp(this.vel.x, move.x + this.knock.x, 8, dt); this.vel.z = damp(this.vel.z, move.z + this.knock.z, 8, dt);
    if (!this.swooping) this.knock.multiplyScalar(Math.exp(-dt * 5));
    if (this.flying) this.vel.set(0, 0, 0);
    else moveEntity(this, g.world, dt);
    if (this.pos.y < -4) { this.pos.copy(this.home); this.vel.set(0, 0, 0); }
    // visuals
    this.visY = this.stepped ? damp(this.visY, this.pos.y, 12, dt) : this.pos.y; if (Math.abs(this.visY - this.pos.y) < 0.01) this.stepped = 0;
    this.hover = damp(this.hover ?? this.hoverY, this.hoverY, this.swooping ? 10 : 3, dt);
    const bob = this.B.hover ? Math.sin(performance.now() * 0.003) * 0.2 : 0;
    this.object.position.set(this.pos.x, this.visY + this.hover + bob + (this.intro > 0 ? -this.intro * 1.2 : 0), this.pos.z);
    this.rig.root.rotation.y = this.facing;
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    const sp = Math.hypot(this.vel.x, this.vel.z) / this.B.speed;
    const act = this.stunT > 0 ? { type: 'stagger', t: 0 } : this.anim ?? (this.intro > 0 ? { type: 'raise', t: 0 } : null);
    rigOffsets(this.rig, -1);   // hunch and arm spread ride on top of the pose
    this.rig.animate({ dt, speed: Math.min(1, sp), vel: this.vel, action: act });
    rigOffsets(this.rig, 1);
    this.rig.tick?.(dt, this);
    this.B.tick?.(this, dt);
    this.ambient(dt);
    return true;
  }
  ambient(dt) {
    const g = this.game;
    if (this.stunT > 0 && Math.random() < 0.5) { // dizzy stars
      const a = performance.now() * 0.006 + Math.random() * 6;
      g.particles.glow.emit(this.pos.x + Math.cos(a) * 1.1, this.pos.y + this.height + 0.6, this.pos.z + Math.sin(a) * 1.1, 0, 0.3, 0, 0.5, 2.6, 2.2, 0.6, 0.18, 0, 0, 0.05, 1);
    }
    this.B.ambient?.(this, dt);
  }
}
Object.assign(Boss.prototype, BOOK1_PATTERNS);

// One model of each monster kind and boss, hidden far below the level, for
// renderer.compileAsync at chapter load: every skin and prop material is
// shared per kind, so after this nothing a chapter spawns compiles a shader.
// Usage: const w = warmupGroup(kinds, [bossId]); scene.add(w);
// await renderer.compileAsync(scene, camera); scene.remove(w);
export function warmupGroup(kinds = MONSTER_IDS, bosses = []) {
  const grp = new THREE.Group(); grp.position.set(0, -500, 0);
  for (const k of kinds) if (MONSTERS[k]) grp.add(buildMonsterModel(MONSTERS[k].model).root);
  for (const id of bosses) { const b = BOSSES[BOSS_ALIASES[id] ?? id]; if (!b) continue; grp.add(b.build().root); if (b === BOSSES.furies) { grp.add(BOSS_MODELS.megaera().root, BOSS_MODELS.tisiphone().root); } }
  return grp;
}

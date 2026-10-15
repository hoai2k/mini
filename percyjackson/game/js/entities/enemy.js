// Monsters: shared enemy behaviour (targeting, steering, separation, pit
// avoidance, knockback, stagger, telegraphed attacks, golden-dust death) plus
// the archetype AIs, mapped onto the Greek bestiary in monsters.js:
//   melee    pup, spider, hellhound      ranged  harpy (feathers)
//   tank     dracaena (shield + spear)   teleport fury (blink + whip)
//   summon   empousa (calls pups)        blob    automaton (Greek-fire burst)
//   statue   living statue: stands frozen until a hero comes near or hits it
// Stat-block extras (monsters.js): poison (a hit poisons the hero), regrow
// (a skeleton falls to bones and stands up again unless hit while down),
// projectile 'bullet' (fast, straight) and 'wisp' (slow, homing), slamR.
//
// Fields other systems may set on an Enemy:
//   disguised / untargetable  true while the Mist shows a mortal (spawn with
//              { disguise: 'teacher' | 'student' | 'tourist' | 'farmer' | 'old_lady' |
//              'bellhop' | 'salesman' });
//              such an enemy wanders, never attacks and takes no damage.
//              reveal() drops the disguise (True Sight calls it).
//   status.fear  seconds: runs away from fearFrom (Vector3, or its target) and never attacks
//   status.root  seconds: cannot move (still attacks in reach)
//   status.slow  seconds: half speed
//   mark         seconds: takes +50% damage while > 0
//   slowT        seconds: legacy 40% speed slow (hazards, frost procs)
//   sealT        seconds: held in place (artifacts)
//   awake        a 'statue' monster is moving (set true to spawn it awake)
//   bossSummon   the boss that called this monster (it may clear them on death)
//   scold(hero)  a mortal-looking person (disguised, or a real mortal: def.mortal)
//              was swung at: recoil, a line in a speech bubble, then back to
//              their business (entities/mistPeople.js). Real mortals never reveal.
//   foe          chapter 1's people in the Mist (objectives/museum.js; rules in
//              story/museumRules.js): { hunt, provoked, wake, route(e, want) }.
//              Revealed but not hunting: wanders and leaves the heroes alone
//              until hit (hunt). Disguised and hunting: walks up to a hero
//              like an ordinary person and hurts them with no swing at all.
//              redisguise() puts the mortal disguise back on (the Mist again).
//   loiter       (monsters whose def has idle: 'loiter', the prologue's rats;
//              rules in entities/ratRules.js) { home, r, notice, alert, perch,
//              leash, face }: hangs around home (sniffs, eats, wanders) until a
//              hero comes within `notice` or hits it, rears up for `alert`
//              seconds, then chases; gives up past `leash`. dash(hero) sends it.
//              A chapter's monster groups loiter too (mission.js sets
//              loiter.kind = 'pack', with `pack` (the group), `scout` and
//              `joinT`; rules in entities/packRules.js): one that notices a
//              hero raises the alarm and the group joins one by one; a scout
//              runs back to its group first; a hero fighting close by is
//              heard through walls.
// Players with `invisible === true` are never chosen or kept as targets.
//
// Crowd rules (Minecraft Dungeons feel):
//   • attack tokens: at most TOKENS monsters wind up or recover against one
//     hero at a time (one more if an elite is among them); the rest circle at
//     range + 1 and wait 0.3–0.8 s before trying again.
//   • separation keeps bodies apart and spreads attackers round the hero.
//   • a monster only notices a hero it can see (line of sight); once in a
//     fight (aggro) it keeps chasing.
//   • minor monsters slide round corners (physics cornerSlide); bosses don't.
//   • ranged monsters back off at most twice, then stand and fight.
import * as THREE from 'three/webgpu';
import { moveEntity, groundAhead } from '../physics.js';
import { BLOCKS } from '../world/blocks.js';
import { buildMonsterModel, MONSTERS, addEliteShell, resolveKind, goldDust, mistPuff } from './monsters.js';
import { buildMortal, MORTALS, mortalId } from './mortals.js';
import { FLASH_MATERIAL } from './character.js';
import { poisonHero } from './holds.js';
import { rigOffsets } from './parts.js';
import { toast } from '../ui/ui.js';
import { RAT, notices, givesUp, nextIdle } from './ratRules.js';
import { PACK, packNotices, scoutRuns } from './packRules.js';
import { scoldLine, mayScold, RECOIL, SETTLE } from './mistPeople.js';
import { hiddenHitAllowed, HIDDEN_DMG } from '../story/museumRules.js';
import { damp, dampAngle, clamp, angleDiff } from '../util.js';
import { monsterDamage } from '../resources.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), TO = new THREE.Vector3(), SEP = new THREE.Vector3();
let bonesHint = false;
const TOKENS = 2;            // attackers per hero at once (+1 with an elite)
const SEP_GAP = 0.4, SEP_PUSH = 6;   // separation: gap kept between bodies, push strength
// Can a monster at a see b? (opaque solid blocks block the view; glass and
// invisible barriers don't)
export function lineOfSight(world, a, ah, b, bh) {
  const ax = a.x, ay = a.y + ah, az = a.z, dx = b.x - ax, dy = b.y + bh - ay, dz = b.z - az;
  const L = Math.hypot(dx, dy, dz), n = Math.ceil(L / 0.4);
  for (let i = 1; i < n; i++) {
    const k = i / n, id = world.get(Math.floor(ax + dx * k), Math.floor(ay + dy * k), Math.floor(az + dz * k));
    if (id && BLOCKS[id].solid && BLOCKS[id].opaque) return false;
  }
  return true;
}
const ELITE_AFFIX = {
  swift: { color: 0x4affd8, label: 'Swift' },
  armored: { color: 0xffc24a, label: 'Armored' },
  vampiric: { color: 0xff3a5a, label: 'Vampiric' },
  explosive: { color: 0xff8a2a, label: 'Explosive' },
  shadow: { color: 0xb05aff, label: 'Blinking' },
};

export class Enemy {
  constructor(game, kind, pos, { elite = null, level = 1, disguise = null } = {}) {
    kind = resolveKind(kind);
    this.game = game; this.kind = kind; this.def = MONSTERS[kind];
    const d = this.def;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = d.radius; this.height = d.height;
    const scale = 1 + (level - 1) * 0.35;
    this.maxHp = d.hp * scale; this.dmg = monsterDamage(d.dmg, d.tier, level, game.biome?.dmgStep ?? 0.25);   // (scaled by tier, resources.js; per difficulty step, which the biome can set)
    this.speed = d.speed * (0.92 + Math.random() * 0.16);
    this.armor = d.armor ?? 0;
    this.elite = elite;
    if (elite) {
      this.maxHp *= 2.6; this.dmg *= 1.3;
      if (elite === 'swift') this.speed *= 1.45;
      if (elite === 'armored') this.armor = Math.min(0.6, this.armor + 0.35);
    }
    this.hp = this.maxHp;
    this.status = { fear: 0, root: 0, slow: 0 }; this.fearFrom = null; this.mark = 0;
    this.disguised = false; this.untargetable = false;
    if (disguise) {
      this.disguised = true; this.untargetable = true; this.disguise = mortalId(disguise);
      this.rig = buildMortal(this.disguise);
      this.trueRadius = this.radius; this.trueHeight = this.height;
      this.radius = 0.38; this.height = 1.9;
      this.spawnT = 0; // mortals don't climb out of the floor
    } else this.buildTrueModel();
    this.object = this.rig.root;
    this.object.position.copy(this.pos);
    this.facing = Math.random() * Math.PI * 2;
    this.state = 'idle'; this.stateT = 0; this.cd = 0.5 + Math.random() * 1.2;
    this.stagger = 0; this.flashT = 0; this.dead = false; this.deathT = 0;
    this.grounded = false; this.coyote = 0; this.visY = pos.y;
    this.home = pos.clone(); this.wanderT = 0; this.aggro = false;
    this.action = null; this.marker = null;
    this.spawnT = 0.5;  // rise-out-of-ground intro
    this.blinkCd = 2 + Math.random() * 2;
    this.summonCount = 0;
    this.isEnemy = true;
    // crowd behaviour
    if (this.def.tier === 'minor') this.cornerSlide = true;
    this.patience = 0.3 + Math.random() * 0.5; this.waitT = 0;
    this.orbitSide = Math.random() < 0.5 ? -1 : 1;
    this.retreats = 0; this.retreating = false; this.capShots = 0;
    this.losT = Math.random() * 0.2;
    if (this.def.idle === 'loiter') this.loiter = { home: this.pos.clone(), r: RAT.wander, notice: this.def.notice ?? RAT.notice, alert: RAT.alert, perch: false, leash: RAT.leash, face: null, act: null, actT: Math.random() * 1.5, alertT: null, calmT: 0, returning: false, to: null };
  }
  get name() { return this.disguised ? MORTALS[this.disguise].name : (this.elite ? ELITE_AFFIX[this.elite].label + ' ' : '') + this.def.name; }
  get tier() { return this.def.tier; }
  get big() { return this.def.tier === 'elite' || this.def.tier === 'champion'; }
  buildTrueModel() {
    this.rig = buildMonsterModel(this.def.model);
    if (this.elite) addEliteShell(this.rig, ELITE_AFFIX[this.elite].color);
  }
  // Drop the Mist disguise: swap to the monster with a golden puff and attack.
  reveal() {
    if (!this.disguised || this.dead || this.def.mortal) return false;   // (a real mortal stays a person)
    const g = this.game;
    this.disguised = false; this.untargetable = false;
    this.radius = this.trueRadius; this.height = this.trueHeight;
    const old = this.object;
    old.parent?.remove(old);
    this.buildTrueModel();
    this.object = this.rig.root;
    this.object.position.copy(old.position); this.object.rotation.y = this.facing;
    g.scene.add(this.object);
    mistPuff(g, this.pos, this.height);
    if (!g.audio?.throttle?.('reveal', 150)) {   // (a whole crowd seen at once is one sound, not twenty)
      g.audio?.tone({ freq: 660, to: 1320, dur: 0.35, gain: 0.08, type: 'triangle', rev: 0.5 });
      g.audio?.noise({ dur: 0.45, gain: 0.16, type: 'bandpass', freq: 2200, sweep: 400, q: 1.2, rev: 0.3 });
    }
    this.voice();
    this.spawnT = 0; this.state = 'idle'; this.stateT = 0; this.cd = 0.5 + Math.random() * 0.4;
    this.aggro = true;
    let best = null, bd = Infinity;
    for (const t of g.hostileTargets()) { if (t.dead || t.downed || t.untargetable || t.invisible) continue; const d = t.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = t; } }
    this.target = best;
    if (best) this.facing = Math.atan2(best.pos.x - this.pos.x, best.pos.z - this.pos.z);
    if (this.foe && !this.foe.hunt) { this.aggro = false; this.target = null; }   // (the museum: seen, but not after you yet)
    g.onEnemyRevealed?.(this);
    return true;
  }
  // The Mist again (chapter 1): back into the mortal disguise, with a puff.
  redisguise() {
    if (this.disguised || this.dead || !this.disguise || this.bones || this.def.mortal) return false;
    const g = this.game;
    this.cancelAttack(); this.state = 'idle'; this.stateT = 0;
    this.disguised = true; this.untargetable = true;
    this.trueRadius = this.radius; this.trueHeight = this.height;
    const old = this.object;
    old.parent?.remove(old);
    this.rig = buildMortal(this.disguise);
    this.radius = 0.38; this.height = 1.9;
    this.object = this.rig.root;
    this.object.position.copy(old.position); this.object.rotation.y = this.facing;
    g.scene.add(this.object);
    mistPuff(g, this.pos, this.height);
    return true;
  }
  // A short cry for the kind of monster (wind-ups and reveals).
  voice() {
    const a = this.game.audio; if (!a || a.throttle?.('voice', 90)) return;
    if (a.voiceSample?.(this.def.voice, this.def.pitch)) return;
    const p = this.def.pitch ?? 1;
    switch (this.def.voice) {
      case 'bark': a.tone({ freq: 260 * p, to: 140 * p, dur: 0.09, gain: 0.12, type: 'square', filter: 1400 }); a.tone({ freq: 240 * p, to: 120 * p, dur: 0.1, gain: 0.1, type: 'square', filter: 1400, at: 0.12 }); break;
      case 'screech': a.tone({ freq: 900 * p, to: 1500 * p, dur: 0.22, gain: 0.06, type: 'sawtooth', filter: 4000 }); break;
      case 'hiss': a.noise({ dur: 0.35, gain: 0.14, type: 'highpass', freq: 3500 }); break;
      case 'click': a.tone({ freq: 2400, dur: 0.03, gain: 0.05, type: 'square', filter: 6000 }); a.tone({ freq: 2000, dur: 0.03, gain: 0.05, type: 'square', filter: 6000, at: 0.06 }); break;
      case 'rattle': for (let i = 0; i < 4; i++) a.tone({ freq: 900 + i * 120, dur: 0.025, gain: 0.05, type: 'square', filter: 3000, at: i * 0.05 }); break;
      case 'moan': a.tone({ freq: 260 * p, to: 180 * p, dur: 0.6, gain: 0.05, type: 'sine', filter: 1200, rev: 0.6 }); break;
      case 'grind': a.noise({ dur: 0.4, gain: 0.16, type: 'lowpass', freq: 500 }); break;
      case 'squeak': a.tone({ freq: 2600, to: 3400, dur: 0.07, gain: 0.04, type: 'triangle', filter: 6000 }); a.tone({ freq: 3000, to: 2400, dur: 0.06, gain: 0.035, type: 'triangle', filter: 6000, at: 0.09 }); break;
      case 'roar': a.tone({ freq: 140 * p, to: 70 * p, dur: 0.5, gain: 0.2, type: 'sawtooth', filter: 700 }); break;
    }
  }

  // ---------------------------------------------------------------- damage
  takeDamage(amount, src, o = {}) {
    if (this.dead || this.disguised || this.spawnT > 0.2) return 0;
    if (this.foe && !this.foe.hunt) { this.foe.hunt = true; this.foe.provoked = true; }   // (the museum: hit one, and it fights back)
    if (this.bones) { this.hp = 0; this.die({ ...o, scattered: true }); return amount; }   // scatter the bones
    if (this.def.ai === 'statue' && !this.awake) this.wake();
    let dmg = amount * (this.mark > 0 ? 1.5 : 1);
    // Bulwark shields block frontal hits
    if (this.def.shield && src && !o.unblockable && this.state !== 'stagger') {
      const from = Math.atan2(src.pos.x - this.pos.x, src.pos.z - this.pos.z);
      if (Math.abs(angleDiff(this.facing, from)) < 0.9) { dmg *= 0.2; o.blocked = true; this.game.fx.hitSpark(tmp.copy(this.pos).setY(this.pos.y + 1.2).addScaledVector(tmp2.set(Math.sin(this.facing), 0, Math.cos(this.facing)), 0.8), null, { color: 0xffe0a0 }); this.game.audio?.tone({ freq: 900, to: 600, dur: 0.12, gain: 0.1, type: 'square', filter: 3000 }); }
    }
    dmg *= 1 - this.armor;
    this.hp -= dmg;
    this.flashT = 0.1;
    const wasIdle = !this.aggro;
    this.aggro = true;
    if (this.loiter) { this.loiter.alertT = null; this.loiter.joinT = null; this.loiter.returning = false; this.loiter.calmT = 0; }
    // an idle group monster hit: a scout runs for its group, the rest wake the ones next to them
    if (wasIdle && this.loiter?.pack) { if (this.loiter.scout) this.scoutCall(); else this.loiter.pack.alarm(this, { local: true }); }
    if (src && src.isPlayer && !this.target && !src.invisible) this.target = src;
    if (o.knock) {
      const k = o.knock.clone().multiplyScalar(1 - (this.def.knockResist ?? 0) * (o.blocked ? 1 : 0.8));
      this.knock.add(k);
      if (k.length() > 6) this.vel.y = Math.max(this.vel.y, 4 + k.length() * 0.25);
    }
    const st = (o.stagger ?? 0.2) * (this.def.knockResist ? 0.5 : 1) * (this.elite ? 0.6 : 1);
    if (st > 0.15 && !o.blocked && (this.state !== 'windup' || st > 0.4 || !this.def.superArmor)) {
      if (this.state === 'windup') this.cancelAttack();
      this.state = 'stagger'; this.stateT = 0; this.stagger = st;
    }
    this.game.audio?.enemyHurt(this.def.pitch ?? 1);
    if (this.hp <= 0) this.die(o);
    else if (this.elite === 'shadow' && Math.random() < 0.25) this.blink(true);
    return dmg;
  }
  // Drop an attack in progress. Whoever calls this owns the next state; an
  // enemy left in 'windup' or 'recover' without an action falls back to idle.
  cancelAttack() {
    if (this.marker) { this.game.markers.cancel(this.marker); this.marker = null; }
    this.action = null;
    if (this.state === 'windup' || this.state === 'recover') { this.state = 'idle'; this.stateT = 0; }
  }
  die(o = {}) {
    if (this.dead) return;
    // skeleton warriors fall to bones and get back up unless hit while down
    if (this.def.regrow && !this.regrew && !o.pit) {
      this.regrew = true; this.bones = true; this.boneT = 0; this.hp = this.maxHp * 0.5;
      this.cancelAttack(); this.state = 'bones'; this.stateT = 0;
      this.game.particles.burst(this.pos.clone().setY(this.pos.y + 1), { count: 18, color: 0xe8e0c8, additive: false, speed: 3, life: 0.6, size: 0.18, gravity: 12 });
      this.game.audio?.tone({ freq: 700, to: 300, dur: 0.25, gain: 0.08, type: 'square', filter: 2500 });
      if (!bonesHint) { bonesHint = true; toast('The bones are pulling back together. Hit them before it gets up!'); }
      return;
    }
    this.bones = false;
    this.dead = true; this.deathT = 0; this.state = 'dead';
    this.cancelAttack();
    const g = this.game;
    const c = this.pos.clone(); c.y += this.height * 0.5;
    goldDust(g, c, this.height * 0.6, { color: this.elite ? 0xfff2a0 : 0xffd84a, big: this.big });
    g.audio?.enemyDie(this.big);
    g.onEnemyKilled?.(this, o);
    if (!o.quiet && (this.elite === 'explosive' || this.def.ai === 'blob')) this.explode(o.fromBlob);   // quiet: wound down by its boss
  }
  explode(chained) {
    const g = this.game;
    const c = this.pos.clone();
    const R = this.def.ai === 'blob' ? 3 : 2.6;
    const col = this.def.blast ?? 0xff8a2a;
    g.fx.explosion(c, col, R);
    if (this.def.blast) g.hazards?.add({ pos: c, radius: 1.8, dps: this.dmg * 0.3, dur: 3, color: col });
    g.audio?.energy('explode');
    g.shake(0.35);
    for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(c) < R + 0.4) p.takeDamage(this.dmg * (this.def.ai === 'blob' ? 1 : 0.6), this, { knock: tmp.subVectors(p.pos, c).setY(0).normalize().multiplyScalar(9) });
    // the blast hurts other monsters too
    for (const e of g.enemies) if (e !== this && !e.dead && e.pos.distanceTo(c) < R) e.takeDamage(this.dmg * 0.8, null, { knock: tmp.subVectors(e.pos, c).setY(0).normalize().multiplyScalar(8), fromBlob: true });
    g.combat.hitBlocks(c, tmp.set(0, 0, 1), R, Math.PI, 60, null);
  }

  // ---------------------------------------------------------------- AI
  pickTarget() {
    const g = this.game;
    let best = null, bd = this.foe?.hunt ? 120 : this.aggro ? 30 : 15;
    for (const t of g.hostileTargets()) {
      if (t.dead || t.downed || t.untargetable || t.invisible) continue;
      const d = t.pos.distanceTo(this.pos);
      if (d < bd) { bd = d; best = t; }
    }
    // not in a fight yet: notice a hero only if it can see them (checked a
    // few times a second), so monsters don't wake up through walls
    if (best && !this.aggro) {
      this.losT -= this.lastDt ?? 1 / 60;
      if (this.losT > 0) best = null;
      else { this.losT = 0.2; if (!lineOfSight(g.world, this.pos, Math.min(1.4, this.height * 0.8), best.pos, 1.2)) best = null; }
    }
    if (best) this.aggro = true;
    this.target = best;
    return best;
  }
  // Attack tokens: how many monsters are already winding up or recovering
  // against this hero, and may this one join them?
  hasToken(t) {
    let n = 0, elite = this.big;
    for (const e of this.game.enemies) {
      if (e === this || e.dead || e.target !== t || (e.state !== 'windup' && e.state !== 'recover')) continue;
      n++; if (e.big) elite = true;
    }
    return n < TOKENS + (elite ? 1 : 0);
  }
  // Wait for a token: circle the hero at range + 1, sliding sideways.
  circle(toT, d, ring) {
    const len = Math.max(0.01, d);
    const side = this.orbitSide;
    const radial = clamp((d - ring) * 1.5, -1, 1);
    const dir = TO.set(-toT.z / len * side * 0.7 + toT.x / len * radial, 0, toT.x / len * side * 0.7 + toT.z / len * radial);
    if (this.hitWall) this.orbitSide = -this.orbitSide;
    return this.steer(dir, 0.6);
  }
  // Steering: desired direction with separation and ledge avoidance.
  steer(dir, speedMul = 1) {
    const g = this.game;
    const want = tmp.copy(dir).setY(0);
    if (this.foe?.hunt) this.foe.route?.(this, want);   // (the museum: far from the heroes, follow the way through the rooms)
    if (want.lengthSq() > 0) want.normalize();
    const slow = (this.slowT > 0 ? 0.4 : 1) * (this.status.slow > 0 ? 0.5 : 1);
    want.multiplyScalar(this.speed * speedMul * slow * (this.dashT > 0 ? 1.12 : 1));
    // separation: a push at full walking speed (not scaled by speedMul), so
    // monsters crowding a hero still spread out round them
    const sep = SEP.set(0, 0, 0);
    for (const o of g.enemies) {
      if (o === this || o.dead || o.disguised) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z; const d2 = dx * dx + dz * dz; const r = this.radius + o.radius + SEP_GAP;
      if (d2 < r * r) {
        const d = Math.sqrt(d2);
        if (d < 1e-3) { sep.x += Math.random() - 0.5; sep.z += Math.random() - 0.5; continue; }
        sep.x += dx / d * (r - d) * SEP_PUSH; sep.z += dz / d * (r - d) * SEP_PUSH;
      }
    }
    for (const o of g.hostileTargets()) {
      if (o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z; const d2 = dx * dx + dz * dz; const r = this.radius + (o.radius ?? 0.35) + 0.1;
      if (d2 < r * r && d2 > 1e-4) { const d = Math.sqrt(d2); sep.x += dx / d * (r - d) * 4; sep.z += dz / d * (r - d) * 4; }
    }
    // blocked by a wall for a moment: follow it round (no pathfinding, but a
    // monster no longer stands pressed against a wall it can't see past)
    const dt = this.lastDt ?? 1 / 60;
    if (this.detourT > 0) { this.detourT -= dt; const l = want.length(); if (l > 0.01) want.copy(this.detour).multiplyScalar(l); }
    else if (this.hitWall && want.lengthSq() > 0.04) { this.blockT = (this.blockT ?? 0) + dt; if (this.blockT > 0.25) { this.blockT = 0; this.findDetour(want); } }
    else this.blockT = 0;
    const sl = sep.length(); if (sl > 1.5) sep.multiplyScalar(1.5 / sl);
    want.addScaledVector(sep, this.speed * slow);
    // don't walk off ledges on purpose
    const wl = want.length();
    if (wl > 0.05) {
      const ax = this.pos.x + want.x / wl * 0.9, az = this.pos.z + want.z / wl * 0.9;
      const drop = this.loiter && !this.aggro ? 0.9 : this.def.drop ?? 2.2;   // (a loitering rat never steps off its perch; a chasing one leaps down)
      if (!groundAhead(g.world, ax, this.pos.y, az, drop)) want.set(-want.z, 0, want.x).multiplyScalar(0.3);
    }
    return want;
  }
  findDetour(want) {
    const w = this.game.world, p = this.pos, base = Math.atan2(want.x, want.z);
    const open = (x, z) => !w.solidAt(x, p.y + 0.5, z) || (!w.solidAt(x, p.y + 1.5, z) && !w.solidAt(x, p.y + 2.5, z));
    for (const off of [0.8, 1.6, 2.4]) for (const s of [this.orbitSide, -this.orbitSide]) {
      const a = base + off * s, dx = Math.sin(a), dz = Math.cos(a);
      if (open(p.x + dx * (this.radius + 0.5), p.z + dz * (this.radius + 0.5)) && open(p.x + dx * (this.radius + 1.3), p.z + dz * (this.radius + 1.3))) {
        (this.detour ??= new THREE.Vector3()).set(dx, 0, dz); this.detourT = 0.5 + off * 0.25; this.orbitSide = s; return;
      }
    }
  }
  faceTo(p, dt, rate = 10) { this.facing = dampAngle(this.facing, Math.atan2(p.x - this.pos.x, p.z - this.pos.z), rate, dt); }

  update(dt) {
    const g = this.game;
    if (this.dead) {
      this.deathT += dt;
      this.rig.swap(null);
      this.object.scale.setScalar(Math.max(0.01, 1 - this.deathT * 2.2) * (this.rig.spec.scale ?? 1));
      this.object.position.y -= dt * 0.8;
      this.rig.animate({ dt, speed: 0, vel: this.vel, action: { type: 'death', t: Math.min(1, this.deathT * 2) } });
      return this.deathT < 0.5;
    }
    if (g.frozen && g.domainSys.inside(this.pos)) { // Unlimited Void: everything stops
      this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null); this.flashT -= dt;
      this.moveBody(dt, tmp.set(0, 0, 0));
      return true;
    }
    if (this.sealT > 0) { // Prison Realm: sealed in place
      this.sealT -= dt; this.flashT -= dt;
      if (Math.random() < 0.3) g.particles.glow.emit(this.pos.x + (Math.random() - 0.5), this.pos.y + Math.random() * this.height, this.pos.z + (Math.random() - 0.5), 0, 0.3, 0, 0.6, 1.2, 1.1, 1.8, 0.12, 0, 1, 1, 1);
      this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
      this.moveBody(dt, tmp2.set(0, 0, 0));
      return true;
    }
    this.spawnT = Math.max(0, this.spawnT - dt); this.lastDt = dt;
    this.stateT += dt; this.cd -= dt; this.flashT -= dt; this.slowT = (this.slowT ?? 0) - dt;
    this.blinkCd -= dt;
    if (this.dashT > 0) this.dashT -= dt;
    if (this.disguised) return this.foe?.hunt && !this.def.mortal ? this.updateHidden(dt) : this.updateDisguised(dt);
    if (this.bones) return this.updateBones(dt);
    if (this.def.ai === 'statue' && !this.awake) return this.updateDormant(dt);
    const S = this.status;
    S.fear = Math.max(0, S.fear - dt); S.root = Math.max(0, S.root - dt); S.slow = Math.max(0, S.slow - dt); this.mark = Math.max(0, this.mark - dt);
    let t;
    if (this.foe && !this.foe.hunt) {
      // the museum: seen through the Mist but not after you (yet): it goes about its business
      t = null; this.target = null; this.aggro = false;
      if (this.foe.wake) for (const p of g.hostileTargets()) if (!p.dead && !p.downed && !p.invisible && p.pos.distanceTo(this.pos) < 6) { this.foe.hunt = true; break; }
    } else t = this.loiter && !this.aggro ? this.watch(dt) : this.pickTarget();
    if (this.loiter && this.aggro && t && this.state !== 'windup' && this.state !== 'recover' && givesUp({ homeDist: Math.hypot(this.pos.x - this.loiter.home.x, this.pos.z - this.loiter.home.z), targetDist: t.pos.distanceTo(this.pos), leash: this.loiter.leash })) {
      // chased too far from home: back to loitering (no trains of rats down the street)
      this.aggro = false; this.target = t = null; this.dashT = 0;
      Object.assign(this.loiter, { returning: true, calmT: RAT.calm, alertT: null });
    }
    let move = tmp2.set(0, 0, 0);
    const ai = this.def.ai;
    const flee = this.loiter?.fleeT > 0 && this.loiter.pack;
    if (flee) {
      // a scout running back to its group, calling out
      const L = this.loiter;
      L.fleeT -= dt;
      const to = tmp.subVectors(L.pack.center, this.pos).setY(0);
      if (to.length() < PACK.fleeReach || L.fleeT <= 0 || L.pack.alarmed) { L.fleeT = 0; L.pack.alarm(this); }
      else if (this.state !== 'stagger') { if (this.state === 'windup') this.cancelAttack(); this.state = 'idle'; move.copy(this.steer(to, 1.1)); this.facing = dampAngle(this.facing, Math.atan2(to.x, to.z), 10, dt); }
    }
    if (flee && this.loiter.fleeT > 0) { /* (running) */ }
    else if (S.fear > 0 && this.state !== 'stagger') {
      if (this.state === 'windup') this.cancelAttack();
      if (this.state !== 'idle') { this.state = 'idle'; this.action = null; }
      const from = this.fearFrom ?? t?.pos;
      if (from) { const away = tmp.subVectors(this.pos, from).setY(0); if (away.lengthSq() < 1e-4) away.set(Math.random() - 0.5, 0, Math.random() - 0.5); move.copy(this.steer(away, 1.1)); this.facing = dampAngle(this.facing, Math.atan2(away.x, away.z), 10, dt); }
      if (Math.random() < dt * 3) g.particles.glow.emit(this.pos.x, this.pos.y + this.height + 0.3, this.pos.z, 0, 0.8, 0, 0.6, 1.6, 1.4, 2.2, 0.12, 0, 1, 0.05, 1);
    } else if (this.state === 'stagger') {
      if (this.stateT > this.stagger) this.state = 'idle';
    } else if ((this.state === 'windup' || this.state === 'recover') && !this.action) {
      // an attack was dropped without a state change (a net update, a hold): back to the chase
      this.state = 'idle'; this.stateT = 0;
    } else if (this.state === 'windup') {
      if (t) this.faceTo(t.pos, dt, this.def.ai === 'tank' ? 2.5 : 6);
      if (ai === 'blob') move.copy(this.steer(t ? tmp.subVectors(t.pos, this.pos) : tmp.set(0, 0, 0), 0.4));
      if (this.stateT >= this.action.windup) this.release();
    } else if (this.state === 'recover') {
      if (this.stateT > (this.action?.recover ?? 0.35)) { this.state = 'idle'; this.action = null; }
      if (this.lunge) { move.copy(this.lunge); this.lunge.multiplyScalar(Math.exp(-dt * 8)); }
    } else if (t) {
      const d = t.pos.distanceTo(this.pos);
      const toT = tmp.subVectors(t.pos, this.pos);
      // attack token: while the hero already has enough attackers, wait (and
      // circle) for a moment after a slot frees up
      const free = this.hasToken(t);
      if (!free) this.waitT = this.patience;
      else this.waitT = Math.max(0, this.waitT - dt);
      const ready = free && this.waitT <= 0;
      const ring = this.def.range + 1;
      const turn = ai === 'tank' ? 4 : 10;   // a dracaena turns slowly: flank her
      switch (ai) {
        case 'melee': case 'tank': case 'statue':
          if (!ready && d < ring + 2.5) move.copy(this.circle(toT, d, ring));
          else if (d > this.def.range * 0.9) move.copy(this.steer(toT)); else move.copy(this.steer(toT, 0.1));
          this.faceTo(t.pos, dt, turn);
          if (ready && d < this.def.range + 0.2 && this.cd <= 0) this.startAttack(ai === 'tank' ? 'slam' : ai === 'statue' ? 'slash' : 'bite');
          break;
        case 'blob':
          if (!ready && d < ring + 2.5) move.copy(this.circle(toT, d, ring + 0.6));
          else move.copy(this.steer(toT, 1));
          this.faceTo(t.pos, dt);
          if (ready && d < this.def.range + 0.4) this.startAttack('inflate');
          break;
        case 'ranged': case 'summon': {
          const keep = this.def.keep;
          // back off when a hero closes in, but only twice; then stand and fight
          const back = d < keep - 1.5 && (this.retreats < 2 || ai === 'summon');
          if (back && !this.retreating) { this.retreating = true; this.retreats++; }
          if (this.retreating && (d >= keep || !back)) this.retreating = false;
          if (d > this.def.range) move.copy(this.steer(toT));
          else if (this.retreating) move.copy(this.steer(toT.negate(), 0.8));
          else { const side = TO.set(-toT.z, 0, toT.x).normalize().multiplyScalar(Math.sin(this.stateT * 0.8 + this.home.x) > 0 ? 1 : -1); move.copy(this.steer(side, 0.5)); }
          this.faceTo(t.pos, dt);
          if (ready && this.cd <= 0 && d < this.def.range + 1) this.startAttack(ai === 'summon' && this.summonCount < 6 ? 'summon' : 'spit');
          break;
        }
        case 'teleport':
          if (ready && this.blinkCd <= 0 && d > 3) { this.blink(false); break; }
          if (!ready && d < ring + 2.5) move.copy(this.circle(toT, d, ring));
          else move.copy(this.steer(toT, d > 2 ? 1 : 0.1));
          this.faceTo(t.pos, dt);
          if (ready && d < this.def.range + 0.3 && this.cd <= 0) this.startAttack('slash');
          break;
      }
    } else if (this.loiter) {
      move.copy(this.loiterMove(dt));
    } else {
      // idle wander near home
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = 2 + Math.random() * 3; this.wander = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(Math.random() < 0.4 ? 0 : 0.35); if (this.pos.distanceTo(this.home) > 5) this.wander = tmp.subVectors(this.home, this.pos).setY(0).normalize().multiplyScalar(0.35); }
      if (this.wander) { move.copy(this.steer(this.wander, 0.35)); if (this.wander.lengthSq() > 0) this.facing = dampAngle(this.facing, Math.atan2(this.wander.x, this.wander.z), 4, dt); }
    }
    if (this.spawnT > 0 || S.root > 0) move.set(0, 0, 0);
    if (S.root > 0) { this.vel.x = this.knock.x; this.vel.z = this.knock.z; }
    this.moveBody(dt, move);
    // visuals
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    this.animate(dt);
    this.aura(dt);
    return true;
  }
  // ---- loitering (the prologue's rats; entities/ratRules.js)
  // Not chasing yet: notice a hero who comes close (with line of sight), rear
  // up and squeak for a moment, then chase. Returns the target once it does.
  watch(dt) {
    const g = this.game, L = this.loiter;
    L.calmT = Math.max(0, L.calmT - dt);
    let best = null, bd = Infinity;
    for (const t of g.hostileTargets()) { if (t.dead || t.downed || t.untargetable || t.invisible) continue; const d = t.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = t; } }
    if (this.spawnT > 0) return null;
    // a group's alarm reached this one: a moment, then it rears up and comes
    if (L.joinT != null && L.alertT == null) {
      L.joinT -= dt;
      if (L.joinT <= 0) { L.joinT = null; if (!best) return null; L.alertT = L.alert * 0.8; L.dashing = true; L.returning = false; if (Math.random() < 0.35) this.voice(); }
      return null;
    }
    if (L.alertT != null) {
      L.alertT -= dt;
      const hold = L.dashing || L.kind === 'pack' ? Infinity : L.notice * 1.8;
      if (!best || bd > hold) { L.alertT = null; L.dashing = false; return null; }   // the hero walked on
      this.faceTo(best.pos, dt, 8);
      if (L.alertT <= 0) {
        L.alertT = null; this.aggro = true; this.target = best; this.cd = Math.min(this.cd, 0.4);
        if (L.dashing) { L.dashing = false; this.dashT = L.kind === 'pack' ? 0 : 3; }
        if (L.scout && !L.pack?.alarmed) this.scoutCall();
        return best;
      }
      return null;
    }
    if (L.kind === 'pack') {
      // a group monster: sees a hero in its room (not across the gap in the next one)
      // within notice (scouts further), hears a fight close by
      if (!best || bd > Math.max(L.notice, PACK.hear)) return null;
      const A = L.area; if (A && !(best.pos.x >= A.x0 && best.pos.x <= A.x1 && best.pos.z >= A.z0 && best.pos.z <= A.z1)) return null;
      this.losT -= dt;
      if (this.losT > 0) return null;
      this.losT = 0.2 + Math.random() * 0.1;
      const fightNear = bd <= PACK.hear && g.enemies.some((o) => o !== this && !o.dead && o.aggro && !o.disguised && o.pos.distanceTo(this.pos) < PACK.hear + 2);
      const los = fightNear || lineOfSight(g.world, this.pos, Math.min(1.4, this.height * 0.8), best.pos, 1.2);
      if (packNotices({ dist: bd, los, scout: L.scout, fightNear })) {
        L.alertT = L.alert; L.returning = false; L.dashing = true; this.voice();
        if (!L.scout) L.pack?.alarm(this);   // (a scout runs back to tell them first)
      }
      return null;
    }
    if (best && L.calmT <= 0 && bd <= L.notice) {
      this.losT -= dt;
      if (this.losT <= 0) {
        this.losT = 0.2;
        if (notices({ dist: bd, los: (L.perch && bd < 6) || lineOfSight(g.world, this.pos, Math.min(1.4, this.height * 0.8), best.pos, 1.2), notice: L.notice, calm: L.calmT })) { L.alertT = L.alert; L.returning = false; this.voice(); }   // (a perched rat hears a hero walk underneath)
      }
    }
    return null;
  }
  // A scout that has seen the party (or been shot) runs back to its group to
  // raise the alarm; if the group is right there it just calls out.
  scoutCall() {
    const L = this.loiter, P = L?.pack; if (!P || P.alarmed) return;
    if (scoutRuns({ packDist: this.pos.distanceTo(P.center) })) { L.fleeT = PACK.flee; this.voice(); }
    else P.alarm(this);
  }
  // The director (world/roaming.js) sends this rat at a hero: a squeak, then a run.
  dash(hero) {
    const L = this.loiter; if (!L || this.aggro || this.dead) return false;
    L.alertT = 0.5; L.dashing = true; L.returning = false; L.calmT = 0;
    if (hero) this.facing = Math.atan2(hero.pos.x - this.pos.x, hero.pos.z - this.pos.z);
    this.voice();
    return true;
  }
  // ---- people in the Mist (entities/mistPeople.js)
  // A hero swung at (or shot at) someone who looks like a mortal: no harm
  // done, but they flinch, step back and tell the hero off (one line every
  // few seconds), then go back to what they were doing. On every screen.
  scold(hero) {
    if (!this.disguised || this.dead) return;
    const g = this.game, now = g.time;
    let line = null;
    if (mayScold(this.scoldAt, now)) { this.scoldAt = now; line = scoldLine(this.disguise, Math.random(), this.lastLine); this.lastLine = line; }
    const from = hero?.pos?.clone?.() ?? this.pos.clone().add(TO.set(Math.sin(this.facing), 0, Math.cos(this.facing)));
    const run = () => g.fx?.scold?.(this, line, from);
    if (g.online?.fx?.capture) g.online.fx.capture(run); else run();
  }
  // (fx.scold, here and on the other screens)
  recoil(from) {
    this.recoilT = RECOIL; this.glareT = SETTLE; this.recoilFrom = from ? from.clone() : null;
  }
  // Hanging around home: sniff, eat, wander a few steps; walk back after a chase.
  loiterMove(dt) {
    const L = this.loiter;
    if (L.alertT != null || this.spawnT > 0) return TO.set(0, 0, 0);
    if (L.returning) {
      const to = TO.subVectors(L.home, this.pos).setY(0);
      if (to.length() < 0.8) L.returning = false;
      else { this.facing = dampAngle(this.facing, Math.atan2(to.x, to.z), 8, dt); return this.steer(to, 0.55); }
    }
    L.actT -= dt;
    if (L.actT <= 0) {
      const n = nextIdle(Math.random());
      L.act = n.act; L.actT = n.dur; L.to = null;
      if (n.act === 'wander') { const a = Math.random() * Math.PI * 2, r = L.r * (0.3 + Math.random() * 0.7); L.to = new THREE.Vector3(L.home.x + Math.cos(a) * r, L.home.y, L.home.z + Math.sin(a) * r); }
    }
    if (L.act === 'wander' && L.to) {
      const to = TO.subVectors(L.to, this.pos).setY(0);
      if (to.length() < 0.25) { L.act = 'sniff'; L.actT = 0.8 + Math.random() * 1.5; L.to = null; return TO.set(0, 0, 0); }
      this.facing = dampAngle(this.facing, Math.atan2(to.x, to.z), 8, dt);
      return this.steer(to, 0.3);
    }
    if (L.act === 'eat' && L.face) this.faceTo(L.face, dt, 3);
    return TO.set(0, 0, 0);
  }
  // Mortal disguise: amble about near home like a harmless passer-by.
  updateDisguised(dt) {
    const g = this.game;
    let move = tmp2.set(0, 0, 0);
    // nothing a hero does moves a person in the Mist (knock-ups, staggers, slows: entities/mistPeople.js)
    if (this.vel.y > 0) this.vel.y = 0;
    this.knock.set(0, 0, 0); if (this.state !== 'idle') { this.state = 'idle'; this.action = null; }
    this.wanderT -= dt;
    if (this.recoilT > 0 || this.glareT > 0) {
      // told a hero off: a step back with the hands up, a glare, then back to their business
      this.recoilT = Math.max(0, (this.recoilT ?? 0) - dt);
      this.glareT = Math.max(0, (this.glareT ?? 0) - dt);
      if (this.recoilFrom) {
        this.faceTo(this.recoilFrom, dt, 12);
        if (this.recoilT > 0) move.copy(this.steer(tmp.subVectors(this.pos, this.recoilFrom).setY(0), 1.6 / Math.max(0.5, this.speed)));
      }
      this.wanderT = Math.max(this.wanderT, 0.8);
    } else if (this.wanderT <= 0) {
      this.wanderT = 2.5 + Math.random() * 3.5;
      this.wander = Math.random() < 0.45 ? new THREE.Vector3() : new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      if (this.pos.distanceTo(this.home) > 4) this.wander = tmp.subVectors(this.home, this.pos).setY(0).normalize().clone();
    }
    if (this.recoilT > 0 || this.glareT > 0) { /* (above) */ }
    else if (this.wander && this.wander.lengthSq() > 0) { move.copy(this.steer(this.wander, 1.2 / Math.max(0.5, this.speed))); this.facing = dampAngle(this.facing, Math.atan2(this.wander.x, this.wander.z), 4, dt); }
    else {
      // idle: glance at the nearest hero now and then (something is slightly off)
      let near = null, nd = 7;
      for (const p of g.hostileTargets()) { if (p.dead || p.invisible) continue; const d = p.pos.distanceTo(this.pos); if (d < nd) { nd = d; near = p; } }
      if (near) this.faceTo(near.pos, dt, 2);
    }
    if (this.spawnT > 0) move.set(0, 0, 0);
    const px = this.pos.x, pz = this.pos.z;
    this.moveBody(dt, move);
    // walked into a wall, a ledge, a prop or someone: turn away (or stop for a moment) rather than keep pushing
    if (move.lengthSq() > 0.01 && dt > 0 && Math.hypot(this.pos.x - px, this.pos.z - pz) / dt < 0.2) {
      this.mistBlockT = (this.mistBlockT ?? 0) + dt;
      if (this.mistBlockT > 0.35 && !(this.recoilT > 0)) {
        this.mistBlockT = 0;
        if (this.wander?.lengthSq() > 0) { const a = Math.PI + (Math.random() - 0.5) * Math.PI * 0.5, c = Math.cos(a), s = Math.sin(a);   // (back the way they came, more or less)
          this.wander.set(this.wander.x * c - this.wander.z * s, 0, this.wander.x * s + this.wander.z * c); }
        this.mistBlocks = (this.mistBlocks ?? 0) + 1;
        if (this.mistBlocks >= 2 || Math.random() < 0.35) { this.wander = new THREE.Vector3(); this.mistBlocks = 0; }   // (hemmed in: just stand a while)
        this.wanderT = 1.5 + Math.random() * 2;
      }
    } else { this.mistBlockT = 0; if (move.lengthSq() > 0.01) this.mistBlocks = 0; }
    this.rig.swap(null);
    this.animate(dt);
    // a real mortal under True Sight: a soft, calm outline (nothing to fight here)
    if (this.def.mortal) {
      const seen = !!g.mist?.active && g.mist.inside(this.pos);
      if (seen && !this.calmShell) { addEliteShell(this.rig, 0x3a6a7a); this.calmShell = true; this.rig.root.traverse((o) => { if (o.userData.shell) o.userData.calm = true; }); }
      if (this.calmShell) this.rig.root.traverse((o) => { if (o.userData.calm) o.visible = seen; });
      return true;
    }
    // a rare glint of monster eyes behind the mortal face (the only tell)
    this.glintT = (this.glintT ?? 2 + Math.random() * 4) - dt;
    if (this.glintT <= 0) {
      this.glintT = 3 + Math.random() * 5;
      const f = this.facing, y = this.pos.y + this.height * 0.86;
      for (const s of [-1, 1]) g.particles.glow.emit(this.pos.x + Math.sin(f) * 0.3 + Math.cos(f) * 0.09 * s, y, this.pos.z + Math.cos(f) * 0.3 - Math.sin(f) * 0.09 * s, 0, 0, 0, 0.35, 2.6, 0.5, 0.2, 0.09, 0, 0, 0.02, 1);
    }
    return true;
  }
  // Chapter 1 (objectives/museum.js): a monster hunting the heroes while the
  // Mist still shows a person. It walks up like anyone else in the museum
  // and its blows land with no swing, no wind-up, nothing to see: a hit on
  // the hero and a wisp of Mist (story/museumRules.js: at most one such hit
  // on a hero every HIDDEN_GAP s). It can't be hurt until True Sight shows it.
  updateHidden(dt) {
    const g = this.game;
    if (this.vel.y > 0) this.vel.y = 0;
    this.knock.set(0, 0, 0); if (this.state !== 'idle') { this.state = 'idle'; this.action = null; }
    this.recoilT = Math.max(0, (this.recoilT ?? 0) - dt); this.glareT = 0;
    let t = null, bd = Infinity;
    for (const p of g.hostileTargets()) { if (p.dead || p.downed || p.invisible || p.untargetable) continue; const d = p.pos.distanceTo(this.pos); if (d < bd) { bd = d; t = p; } }
    this.target = t;
    const move = tmp2.set(0, 0, 0);
    if (t) {
      const reach = Math.min(this.def.range ?? 1.5, 1.8) + (t.radius ?? 0.35) + 0.25;
      const toT = TO.subVectors(t.pos, this.pos).setY(0);
      // a brisk walk when far, a stroll close by (the eerie part: nobody here is running)
      if (bd > reach * 0.8 && !(this.recoilT > 0)) move.copy(this.steer(toT, Math.min(1, (bd > 8 ? 3.4 : 2.2) / Math.max(0.5, this.speed))));
      this.faceTo(t.pos, dt, 5);
      if (bd <= reach && this.cd <= 0 && this.spawnT <= 0 && hiddenHitAllowed(t.hiddenHitT, g.time)) {
        t.hiddenHitT = g.time;
        this.cd = (this.def.cd || 1.2) * (0.9 + Math.random() * 0.4) + 0.4;
        const dir = toT.lengthSq() > 1e-4 ? toT.clone().normalize() : new THREE.Vector3(0, 0, 1);
        this.hitPlayer(t, this.dmg * HIDDEN_DMG, dir.multiplyScalar(2.5));
        g.particles?.burst?.(t.pos.clone().setY(t.pos.y + 1.1).addScaledVector(dir, -0.4), { count: 6, color: 0xc8d8e0, additive: false, speed: 1.2, life: 0.5, size: 0.3, sizeEnd: 0.9, drag: 3 });
      }
    }
    this.moveBody(dt, move);
    this.rig.swap(null);
    this.animate(dt);
    return true;
  }
  // A living statue: frozen in its pose until a hero comes close or hits it.
  updateDormant(dt) {
    const g = this.game;
    if (this.spawnT <= 0) for (const p of g.hostileTargets()) if (!p.dead && !p.invisible && p.pos.distanceTo(this.pos) < (this.def.wake ?? 5)) { this.wake(); break; }
    this.moveBody(dt, tmp2.set(0, 0, 0));
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    const rise = this.spawnT > 0 ? -this.spawnT * 3 : 0;
    this.object.position.set(this.pos.x, this.pos.y + rise, this.pos.z);
    this.object.rotation.y = this.facing;
    return true;
  }
  wake() {
    if (this.awake) return;
    const g = this.game;
    this.awake = true; this.aggro = true;
    this.state = 'stagger'; this.stateT = 0; this.stagger = 0.6;
    const c = this.pos.clone().setY(this.pos.y + 1);
    g.particles.burst(c, { count: 28, color: 0xa8a49a, additive: false, speed: 3, life: 0.8, size: 0.25, sizeEnd: 0.7, gravity: 6 });
    g.audio?.noise({ dur: 0.5, gain: 0.2, type: 'lowpass', freq: 600 });
    this.voice();
  }
  // Fallen to bones: lie there, then pull back together and stand up.
  updateBones(dt) {
    const g = this.game;
    this.boneT += dt;
    this.moveBody(dt, tmp2.set(0, 0, 0));
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    this.object.position.set(this.pos.x, this.pos.y, this.pos.z);
    const up = this.boneT > 3 ? Math.min(1, (this.boneT - 3) * 2) : 0;
    this.rig.animate({ dt, speed: 0, vel: this.vel, action: up > 0 ? { type: 'hit', t: up } : { type: 'death', t: Math.min(1, this.boneT * 3) } });
    if (Math.random() < dt * 4) g.particles.glow.emit(this.pos.x + (Math.random() - 0.5), this.pos.y + 0.3, this.pos.z + (Math.random() - 0.5), 0, 0.4, 0, 0.5, 1.8, 2.2, 1.2, 0.1, 0, 1, 0.05, 1);
    if (this.boneT > 3.5) { this.bones = false; this.state = 'stagger'; this.stateT = 0; this.stagger = 0.4; this.voice(); }
    return true;
  }
  // Ambient particles: hellhound smoke, empousa flames, Greek fire, spider sparks, elite glow.
  aura(dt) {
    const g = this.game;
    this.smokeT = (this.smokeT ?? Math.random()) - dt;
    if (this.smokeT > 0) return;
    const a = this.def.aura;
    this.smokeT = this.elite ? 0.08 : a === 'smoke' ? 0.07 : a ? 0.12 : 1e9;
    if (this.elite && Math.random() < 0.5) { g.fx.curseSmoke(this, ELITE_AFFIX[this.elite].color); return; }
    const p = this.pos, r = this.radius;
    const x = p.x + (Math.random() - 0.5) * r * 1.6, z = p.z + (Math.random() - 0.5) * r * 1.6;
    if (a === 'smoke') g.particles.smoke.emit(x, p.y + Math.random() * this.height, z, (Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, 1.3, 0.05, 0.03, 0.04, 0.5, -0.3, 1.2, 2.6, 0);
    else if (a === 'fire') { const h = this.rig.head.getWorldPosition(tmp); g.particles.glow.emit(h.x + (Math.random() - 0.5) * 0.4, h.y + 0.45, h.z + (Math.random() - 0.5) * 0.4, 0, 1.6 + Math.random(), 0, 0.45, 2.6, 1.1, 0.25, 0.22, -1, 1, 0.05, 0); }
    else if (a === 'greekfire') { const f = (this.rig.extras.pot ?? this.rig.root).getWorldPosition(tmp); g.particles.glow.emit(f.x + (Math.random() - 0.5) * 0.3, f.y + 0.5, f.z + (Math.random() - 0.5) * 0.3, 0, 1.4 + Math.random(), 0, 0.5, 0.8, 2.6, 0.5, 0.2, -1, 1, 0.05, 0); if (this.rig.extras.fire) this.rig.extras.fire.scale.y = 0.5 + Math.random() * 0.25; }
    else if (a === 'wisp') g.particles.glow.emit(x, p.y + Math.random() * this.height + 0.4, z, 0, 0.5 + Math.random() * 0.5, 0, 0.6, 1.2, 2.2, 2.6, 0.14, -0.3, 1, 0.05, 1);
    else if (a === 'spark' && Math.random() < 0.3) g.particles.glow.emit(x, p.y + 0.3, z, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 0.25, 2.4, 1.8, 0.8, 0.06, 12, 0, 0.02, 1);
  }
  moveBody(dt, move) {
    const g = this.game;
    const accel = this.grounded ? 12 : 3;
    this.vel.x = damp(this.vel.x, move.x + this.knock.x, accel, dt);
    this.vel.z = damp(this.vel.z, move.z + this.knock.z, accel, dt);
    this.knock.multiplyScalar(Math.exp(-dt * 6));
    this.stepUp = this.knock.lengthSq() < 4;
    if (this.rig.float) { this.noGravity = true; this.pos.y = damp(this.pos.y, (this.floorY ?? this.pos.y), 8, dt); }
    moveEntity(this, g.world, dt);
    this.unoverlap(dt);
    if (this.rig.float) {
      const gy = g.world.groundBelow(this.pos.x, this.pos.z, this.pos.y + 1.5);
      if (isFinite(gy)) this.floorY = gy; else { this.noGravity = false; }
    }
    if (!Number.isFinite(this.pos.x + this.pos.y + this.pos.z)) { this.pos.copy(this.home); this.vel.set(0, 0, 0); this.knock.set(0, 0, 0); }
    if (this.pos.y < -6) { this.hp = 0; this.die({ pit: true }); g.onPitKill?.(this); }
  }
  // Bodies never sink into each other: ease out of any overlap with another
  // monster (never into a wall).
  unoverlap(dt) {
    const g = this.game, w = g.world, p = this.pos;
    for (const o of g.enemies) {
      if (o === this || o.dead || o.disguised || o.isBoss) continue;
      const dx = p.x - o.pos.x, dz = p.z - o.pos.z, r = this.radius + o.radius;
      const d2 = dx * dx + dz * dz; if (d2 >= r * r || Math.abs(p.y - o.pos.y) > 1.5) continue;
      const d = Math.sqrt(d2), ux = d > 1e-3 ? dx / d : Math.random() - 0.5, uz = d > 1e-3 ? dz / d : Math.random() - 0.5;
      const k = Math.min((r - d) * 0.5, dt * 6);
      const nx = p.x + ux * k, nz = p.z + uz * k;
      if (!w.solidAt(nx + ux * this.radius, p.y + 0.5, nz + uz * this.radius)) { p.x = nx; p.z = nz; }
    }
  }
  animate(dt) {
    const a = this.action;
    const speed = Math.hypot(this.vel.x, this.vel.z) / Math.max(1, this.speed);
    let act = null;
    if (this.state === 'windup' && a) act = a.anim === 'raise' ? { type: 'raise', t: 0 } : a.anim === 'cast' ? { type: 'cast', t: 1, both: true } : { type: 'attack', t: Math.min(0.28, this.stateT / a.windup * 0.25), style: a.style, windup: 0.3, strike: 0.5 };
    else if (this.state === 'recover' && a) act = { type: 'attack', t: 0.3 + Math.min(0.7, this.stateT / (a.recover ?? 0.35) * 0.7), style: a.style, windup: 0.3, strike: 0.5 };
    else if (this.state === 'stagger') act = { type: 'hit', t: Math.min(1, this.stateT / Math.max(0.2, this.stagger)) };
    else if (this.disguised && this.recoilT > 0) act = { type: 'raise', t: 0 };   // hands up, startled
    else if (this.loiter && this.loiter.alertT != null) act = { type: 'raise', t: 0 };
    else if (this.loiter && !this.aggro && (this.loiter.act === 'sniff' || this.loiter.act === 'eat') && !this.loiter.returning) act = { type: this.loiter.act, t: 0 };
    const bob = this.rig.float ? Math.sin(this.stateT * 2 + this.home.x) * 0.15 + this.rig.float : 0;
    let y = this.pos.y;
    this.visY = this.stepped ? damp(this.visY, y, 14, dt) : y; if (Math.abs(this.visY - y) < 0.01) this.stepped = 0;
    const rise = this.spawnT > 0 ? -this.spawnT * 3 : 0;
    this.object.position.set(this.pos.x, this.visY + bob + rise, this.pos.z);
    this.object.rotation.y = this.facing;
    if (this.rig.blob) {
      const inflate = this.state === 'windup' && a ? 1 + this.stateT / a.windup * 0.5 : 1;
      const sq = 1 + Math.sin(this.stateT * 12) * 0.08 * speed;
      this.rig.root.scale.set(inflate * sq * 0.9, inflate / sq * 0.9, inflate * sq * 0.9);
    }
    rigOffsets(this.rig, -1);   // hunch and arm spread ride on top of the pose
    this.rig.animate({ dt, speed: Math.min(1, speed), vel: this.vel, action: act });
    rigOffsets(this.rig, 1);
    this.rig.tick?.(dt, this);
  }

  // ---------------------------------------------------------------- attacks
  startAttack(kind) {
    const g = this.game;
    const d = this.def;
    const A = {
      bite: { windup: d.windup, recover: 0.35, style: 'swingR', range: d.range + 0.3 },
      slam: { windup: d.windup, recover: 0.7, style: 'slam', range: 3, marker: 'circleFront', radius: d.slamR ?? 2.6 },
      inflate: { windup: d.windup, recover: 0.1, anim: 'none', marker: 'circle', radius: 3 },
      spit: { windup: d.windup, recover: 0.4, anim: 'cast' },
      summon: { windup: d.windup + 0.4, recover: 0.6, anim: 'raise', marker: 'summon' },
      slash: { windup: d.windup, recover: 0.4, style: 'swingL', range: d.range + 0.4, marker: 'cone' },
    }[kind];
    this.action = { kind, ...A };
    this.state = 'windup'; this.stateT = 0;
    if (A.marker === 'circleFront') {
      const f = tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(1.6 * A.radius / 2.6).add(this.pos);
      this.marker = g.markers.spawn({ pos: f, radius: A.radius, dur: A.windup });
      this.action.center = f.clone();
    } else if (A.marker === 'circle') {
      this.marker = g.markers.spawn({ pos: this.pos, radius: A.radius, dur: A.windup, follow: this });
    } else if (A.marker === 'cone' || (kind === 'bite' && this.big)) {
      this.marker = g.markers.spawn({ pos: this.pos, radius: A.range, dur: A.windup, shape: 'cone', arc: kind === 'bite' ? 0.3 : 0.35, facing: this.facing, follow: this });
    }
    if (kind === 'inflate') g.audio?.charge(A.windup, 0.8);
    if (kind === 'summon') g.audio?.energy('summon');
    this.voice();
    if (this.big) g.audio?.warn();
  }
  release() {
    const g = this.game, a = this.action, t = this.target;
    if (!a) { this.cancelAttack(); return; }   // (the attack was dropped: back to the chase)
    this.marker = null;
    this.state = 'recover'; this.stateT = 0;
    this.cd = this.def.cd * (0.8 + Math.random() * 0.4) * (this.elite === 'swift' ? 0.7 : 1);
    this.patience = 0.3 + Math.random() * 0.5;
    if (this.retreats >= 2 && ++this.capShots >= 2) { this.retreats = 0; this.capShots = 0; }
    const fwd = tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing));
    switch (a.kind) {
      case 'bite': case 'slash': {
        this.lunge = fwd.clone().multiplyScalar(a.kind === 'slash' ? 7 : 6);
        for (const p of g.hostileTargets()) {
          if (p.dead) continue;
          const to = TO.subVectors(p.pos, this.pos); const dist = to.setY(0).length();
          if (dist < a.range + p.radius && Math.abs(angleDiff(this.facing, Math.atan2(to.x, to.z))) < 1.0) this.hitPlayer(p, this.dmg, fwd.clone().multiplyScalar(5));
        }
        g.fx.slashArc(this.pos, this.facing, this.def.slashColor ?? (a.kind === 'slash' ? 0xffb04a : 0xfff0d0), a.range, 0.3, 0.16);
        g.audio?.swing(0);
        break;
      }
      case 'slam': {
        const c = a.center;
        g.fx.shockwave(c, 0xff8a4a, a.radius + 0.6);
        g.shake(0.3);
        g.audio?.impact(1.8);
        for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(c) < a.radius + 0.2 + p.radius) this.hitPlayer(p, this.dmg, new THREE.Vector3().subVectors(p.pos, c).setY(0).normalize().multiplyScalar(10));
        break;
      }
      case 'inflate': this.hp = 0; this.die({}); break;
      case 'spit': {
        if (!t) break;
        const from = this.pos.clone().add(new THREE.Vector3(0, this.height * 0.8, 0)).addScaledVector(fwd, 0.4);
        const lead = t.vel ? t.pos.clone().addScaledVector(t.vel, 0.45) : t.pos.clone();
        const dist = lead.distanceTo(from);
        const self = this;
        if (this.def.projectile === 'feather') {
          // a fan of three sharp feathers, flying straight and fast
          for (let i = -1; i <= 1; i++) {
            const dir = new THREE.Vector3().subVectors(lead, from).setY(lead.y + 0.9 - from.y).normalize().applyAxisAngle(UP, i * 0.18);
            g.projectiles.fire({ pos: from, vel: dir.clone().multiplyScalar(14), team: 'enemy', dmg: this.dmg, gravity: 1, life: 1.6, shape: 'nail', color: 0xd8b070, emissive: 0.8, scale: 2.2, radius: 0.35,
              onHit: (target, p) => { self.hitPlayer(target, self.dmg, p.vel.clone().setY(0).normalize().multiplyScalar(3)); g.particles.burst(p.pos, { count: 6, color: 0x8a6a4a, additive: false, speed: 2, life: 0.5, size: 0.15, gravity: 4 }); },
              onExpire: (p, why) => { if (why === 'wall') g.particles.burst(p.pos, { count: 4, color: 0x8a6a4a, additive: false, speed: 1.5, life: 0.4, size: 0.12, gravity: 4 }); } });
          }
          g.audio?.whoosh(1.2);
          break;
        }
        if (this.def.projectile === 'bullet') {
          // a short burst from the rifle: fast and straight
          const muzzle = this.rig.extras.muzzle ? this.rig.extras.muzzle.getWorldPosition(new THREE.Vector3()) : from;
          for (let i = 0; i < 2; i++) {
            const dir = new THREE.Vector3().subVectors(lead, muzzle).setY(lead.y + 0.9 - muzzle.y).normalize().applyAxisAngle(UP, (Math.random() - 0.5) * 0.08);
            g.projectiles.fire({ pos: muzzle.clone().addScaledVector(dir, i * -0.8), vel: dir.multiplyScalar(26), team: 'enemy', dmg: this.dmg, life: 1, shape: 'nail', color: 0xffd84a, emissive: 3, scale: 1.6, radius: 0.3,
              onHit: (target, p) => self.hitPlayer(target, self.dmg * 0.6, p.vel.clone().setY(0).normalize().multiplyScalar(2)),
              onExpire: (p, why) => { if (why === 'wall') g.particles.burst(p.pos, { count: 4, color: 0xd8c8a0, additive: false, speed: 2, life: 0.3, size: 0.08, gravity: 6 }); } });
          }
          g.particles.burst(muzzle, { count: 6, color: 0xffd84a, speed: 3, life: 0.15, size: 0.2 });
          g.lights.flash(muzzle, 0xffd84a, 3, 4, 0.08);
          g.audio?.noise({ dur: 0.08, gain: 0.18, type: 'bandpass', freq: 1800, q: 0.8 });
          g.audio?.noise({ dur: 0.08, gain: 0.14, type: 'bandpass', freq: 1600, q: 0.8, at: 0.1 });
          break;
        }
        if (this.def.projectile === 'wisp') {
          // a slow, homing ball of cold spirit-light
          const dir = new THREE.Vector3().subVectors(lead, from).setY(lead.y + 0.9 - from.y).normalize();
          g.projectiles.fire({ pos: from, vel: dir.multiplyScalar(7), team: 'enemy', dmg: this.dmg, life: 3, shape: 'orb', color: 0x8ae8ff, emissive: 3, scale: 1.4, radius: 0.45, homing: 1.6, target: t, ghost: true, light: 2,
            trail: (p) => { if (Math.random() < 0.6) g.particles.burst(p.pos, { count: 1, color: 0x8ae8ff, speed: 0.2, life: 0.5, size: 0.25, sizeEnd: 0.05, drag: 3 }); },
            onHit: (target, p) => { self.hitPlayer(target, self.dmg, p.vel.clone().setY(0).normalize().multiplyScalar(3)); if (target.slowT !== undefined) target.slowT = Math.max(target.slowT, 1); } });
          g.audio?.tone({ freq: 500, to: 800, dur: 0.3, gain: 0.05, type: 'sine', rev: 0.6 });
          break;
        }
        const flight = clamp(dist / 11, this.def.lob ? 0.8 : 0.45, this.def.lob ? 1.3 : 1.1);
        // a lobber's shot is marked where it will land: time to step out
        if (this.def.lob) { const gy = g.world.groundBelow(lead.x, lead.z, lead.y + 2); g.markers.spawn({ pos: new THREE.Vector3(lead.x, isFinite(gy) ? gy : lead.y, lead.z), radius: 1.5, dur: flight }); }
        const grav = 14;
        const vel = new THREE.Vector3((lead.x - from.x) / flight, (lead.y + 0.8 - from.y) / flight + 0.5 * grav * flight, (lead.z - from.z) / flight);
        const col = this.def.projectile === 'fire' ? 0xff7a1a : 0x9aff3a;
        g.projectiles.fire({ pos: from, vel, team: 'enemy', dmg: this.dmg, gravity: grav, life: 3, shape: 'orb', color: col, scale: 1.1, light: 3,
          trail: (p) => { if (Math.random() < 0.6) g.particles.burst(p.pos, { count: 1, color: col, speed: 0.3, life: 0.4, size: 0.25, sizeEnd: 0.1, drag: 3 }); },
          onHit: (target, p) => { self.hitPlayer(target, self.dmg, p.vel.clone().setY(0).normalize().multiplyScalar(4)); g.fx.splat(p.pos, col); },
          onExpire: (p, why) => { if (why !== 'hit') { g.fx.splat(p.pos, col); if (col === 0xff7a1a) g.hazards?.fire(p.pos, self.dmg * 0.4, 1.2); else g.hazards?.acid(p.pos, self.dmg * 0.4); } } });
        g.audio?.energy(col === 0xff7a1a ? 'fire' : 'spit');
        break;
      }
      case 'summon': {
        const n = 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const a2 = this.facing + (i - (n - 1) / 2) * 0.9;
          const p = this.pos.clone().add(new THREE.Vector3(Math.sin(a2) * 1.8, 0, Math.cos(a2) * 1.8));
          const gy = g.world.groundBelow(p.x, p.z, p.y + 2); if (!isFinite(gy)) continue;
          p.y = gy;
          g.spawnEnemy(this.def.summons ?? 'pup', p, { summoned: true });
          g.fx.summonCircle(p, 0xff7a1a);
          this.summonCount++;
        }
        break;
      }
    }
  }
  hitPlayer(p, dmg, knock) {
    if (p.iframes > 0 || p.dead) return;
    const dealt = p.takeDamage(dmg, this, { knock });
    if (dealt > 0 && this.def.poison) poisonHero(this.game, p, this.def.poison.dps * (this.dmg / monsterDamage(this.def.dmg, this.def.tier)), this.def.poison.dur, this);   // (poison grows with the difficulty, not the tier's hit scale)
    if (dealt > 0 && this.elite === 'vampiric') { this.hp = Math.min(this.maxHp, this.hp + dealt * 1.5); }
  }
  blink(evade) {
    const g = this.game, t = this.target;
    let dest = null;
    for (let tries = 0; tries < 8 && !dest; tries++) {
      const base = t && !evade ? t.pos : this.pos;
      const ang = t && !evade ? Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z) + (Math.random() - 0.5) * 1.5 : Math.random() * Math.PI * 2;
      const r = evade ? 4 + Math.random() * 3 : 2.2;
      const p = base.clone().add(new THREE.Vector3(Math.sin(ang) * r, 0, Math.cos(ang) * r));
      const gy = g.world.groundBelow(p.x, p.z, base.y + 3);
      if (isFinite(gy) && Math.abs(gy - base.y) < 3 && !g.world.solidAt(p.x, gy + 0.5, p.z) && !g.world.solidAt(p.x, gy + 1.5, p.z)) { p.y = gy; dest = p; }
    }
    if (!dest) { this.blinkCd = 1; return; }
    const puff = this.def.puff ?? 0xffd84a;
    g.fx.blinkPuff(this.pos, puff);
    this.pos.copy(dest); this.visY = dest.y; this.vel.set(0, 0, 0);
    g.fx.blinkPuff(this.pos, puff);
    g.audio?.energy('teleport');
    this.blinkCd = 3 + Math.random() * 2;
    if (t) { this.facing = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z); if (!evade) this.cd = Math.min(this.cd, 0.15); }
  }
}

export { ELITE_AFFIX };

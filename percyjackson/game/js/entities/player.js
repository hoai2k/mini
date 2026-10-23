// Player controller: movement with voxel collision, aiming (mouse, right
// stick or auto-aim), facing, dodge roll with i-frames, falling into pits
// and respawn at the last safe spot. Combat is layered on in combat.js and
// the hero modules.
import * as THREE from 'three/webgpu';
import { moveEntity } from '../physics.js';
import { buildHeroModel } from './models.js';
import { dressHero, gearOf } from './gear/equip.js';
import { damp, dampAngle, clamp } from '../util.js';
import { BASE_COMBO } from '../combat.js';
import { createKit } from '../heroes/index.js';
import { applyGear } from '../loot.js';
import { useArtifact } from '../artifacts.js';
import { tickArtifact, spendArtifact } from '../gearEffects.js';
import { PROC } from '../loot.js';
import { settings } from '../settings.js';
import { t as txt } from '../text_config.js';
import { FLASK, canDrink, drink, tickFlask, newQuiver, resizeQuiver, tickQuiver } from '../resources.js';
import { AIM } from '../combatRules.js';

// the jump slam: damage before gear, radius in metres, knock-back, seconds
// before the next (with no cooldown, jump-slamming over and over out-damaged
// every combo and kept the hero untouchable most of the time)
export const SLAM = { dmg: 20, radius: 2.6, knock: 8, cd: 1.2 };

export const PLAYER_COLORS = ['#4fc8ff', '#ff5a6a', '#7aff7a', '#ffc94a'];

export class Player {
  constructor(game, index, device, hero) {
    this.game = game; this.index = index; this.device = device; this.hero = hero;
    this.color = PLAYER_COLORS[index];
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.radius = 0.32; this.height = 1.8;
    this.grounded = false; this.coyote = 0; this.visY = 0;
    this.facing = 0; this.aimDir = new THREE.Vector3(0, 0, 1); this.aiming = false;
    this.aimPoint = new THREE.Vector3();
    this.speed = 5.6;
    this.maxHp = 100; this.hp = 100; this.maxCe = 100; this.ce = 30;
    this.dead = false; this.downed = false; this.reviveT = 0;
    this.iframes = 0; this.dodgeT = 0; this.dodgeCd = 0; this.dodgeDir = new THREE.Vector3();
    this.action = null;   // current animation action
    this.safePos = new THREE.Vector3(); this.safeT = 0;
    this.fallT = 0;
    this.stats = { damage: 1, armor: 0, speed: 1, cdr: 0, ceGain: 1, crit: 0.08, lifesteal: 0 };
    // (dressed in the hero's gear: the equipped weapon in hand, the armour on, gear/equip.js)
    const sv0 = game.saveFor?.(this) ?? game.save;
    this.rig = buildHeroModel(hero, gearOf(sv0 && !String(device).startsWith('net:') ? sv0.gearFor(hero) : []));
    this.object = this.rig.root;
    this.object.userData.player = this;
    this.stepT = 0;
    this.onLand = (v) => { if (v > 12) game.fx?.landDust(this.pos, v); };
    this.isPlayer = true;
    this.cornerSlide = true;   // slide round pillar and door-frame corners (physics.js)
    this.autoRepeat = true;    // holding attack keeps the combo going, as in Minecraft Dungeons
    this.combo = BASE_COMBO; this.comboStep = 0; this.comboT = 0; this.attackBuffer = 0; this.struck = false;
    this.downT = 0; this.reviveProgress = 0;
    this.slowT = 0;
    this.battleSense = 1;      // Battle Sense charge (0..1); a perfect dodge spends it
    this.ai = false;           // true while an AI companion drives this hero
    this.procs = {}; this.artifacts = [];
    const sv = game.saveFor?.(this) ?? game.save;   // net: the profile of whoever plays this hero
    this.skills = sv ? sv.hero(hero).skills : {};
    this.loadout = sv ? sv.hero(hero).equip : null;   // the powers in slots 1 · 2 · 3 (heroes/skillRules.js)
    applyGear(this, sv ? sv.gearFor(hero) : []);
    this.hp = this.maxHp;
    // Ambrosia: one flask that refills over a cooldown; the quiver for the
    // basic ranged attack (resources.js)
    this.flask = { left: 0, max: 0 };
    this.quiver = newQuiver(this.stats);
    this.kit = createKit(this);
    this.heroLight = game.lights.attach(this.object, 0xffe8d0, 1.6, 7, { offsetY: 2.2, priority: 6 });
  }
  // Re-apply gear/skills (after inventory or skill-tree changes).
  // The hero's health share and ability cooldowns carry over: a new kit
  // starts with every slot ready and some kits add health (Tyson, Clarisse),
  // so a hero switch or a gear change used to refill both.
  refreshLoadout() {
    const g = this.game;
    const sv = g.saveFor?.(this) ?? g.save;   // net: the profile of whoever plays this hero
    const frac = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    const old = this.kit?.slots ?? {};
    this.skills = sv ? sv.hero(this.hero).skills : {};
    this.loadout = sv ? sv.hero(this.hero).equip : null;
    applyGear(this, sv ? sv.gearFor(this.hero) : []);
    this.dress(sv);
    resizeQuiver(this.quiver, this.stats);
    this.kit.dispose?.();
    this.kit = createKit(this);
    if (!this.dead && !this.downed) this.hp = Math.min(this.maxHp, Math.max(1, frac * this.maxHp));
    // a power keeps its own cooldown wherever it moves; a power new to a slot
    // takes over what was left on the slot's last one, so a swap mid-fight
    // never hands out a fresh ability
    const byPower = {}; for (const k in old) if (old[k].power) byPower[old[k].power] = old[k];
    for (const k in this.kit.slots) {
      const s = this.kit.slots[k], o = (s.power && byPower[s.power]) || old[k];
      if (!o) continue;
      s.cdLeft = o === old[k] && o.power !== s.power ? Math.min(s.cd, o.cdLeft ?? 0) : o.cdLeft ?? 0;
      if (s.maxCharges && o.maxCharges) { s.chargesLeft = Math.min(s.maxCharges, o.chargesLeft ?? s.maxCharges); s.recharge = o.recharge ?? 0; s.gate = o.gate ?? 0; }
    }
  }
  // The model wears the gear (gear/equip.js): changed live, no rebuild. g: { weapon, armor, tier }
  // ids (an online hero dressed from its owner's presence), else the profile's equipped items.
  dress(sv = this.game.saveFor?.(this) ?? this.game.save, g = null) {
    dressHero(this.rig, g ?? gearOf(sv ? sv.gearFor(this.hero) : []));
  }
  // ---------------------------------------------------------------- vitals
  gainCE(a) { if (this.domainActive) return; this.ce = Math.min(this.maxCe, this.ce + a * this.stats.ceGain); }
  heal(a, silent = false) {
    if (this.dead || this.downed) return;
    this.hp = Math.min(this.maxHp, this.hp + a);
    if (!silent) this.game.fx.damageNumber(this.pos, a, { color: '#6aff9a', text: '+' + Math.round(a) });
  }
  takeDamage(amount, src, o = {}) {
    const g = this.game;
    if (this.dead || this.downed) return 0;
    if (!o.pure && !o.dot && this.dodgeT > 0 && this.dodgeDur - this.dodgeT < 0.24) this.perfectDodge(src);
    if (!o.pure && (this.iframes > 0 || this.invulnerable)) return 0;
    // armour that lets you slip a blow
    if (!o.pure && !o.dot && this.stats.evade && Math.random() < this.stats.evade) { g.fx.damageNumber(this.pos, 0, { color: '#c8e8ff', text: txt('enemies.player.dodged') }); this.iframes = 0.2; return 0; }
    if (this.kit.onIncoming) { const r = this.kit.onIncoming(amount, src, o); if (r === 0) return 0; if (typeof r === 'number') amount = r; }
    const dmg = amount * (o.pure ? 1 : (1 - this.stats.armor)) * (g.difficultyDamageDealt ?? 1) * (this.barrierT > 0 ? 0.5 : 1);
    this.hp -= dmg;
    this.hurtT = 0.12;
    this.rig.swap(g.flashMaterial);
    if (o.knock && !o.noKnock) { this.knock = (this.knock || new THREE.Vector3()).add(o.knock); }
    if (!o.dot) {
      this.action = this.action && this.action.type !== 'attack' ? this.action : { type: 'hit', dur: 0.25, elapsed: 0, t: 0, moveScale: 0.5 };
      // the screen reacts to the hero you play, not to a companion being hit
      if (!this.ai && !this.remote) { g.shake(Math.min(0.5, 0.15 + dmg / 60)); g.fx.hurtVignette(); g.audio?.hurt(); }
      this.iframes = Math.max(this.iframes, 0.25);
    }
    g.fx.damageNumber(this.pos, dmg, { color: '#ff5a6a' });
    // Demeter's Briars: thorns hurt back
    if (this.stats.thorns && src && src.takeDamage && !src.isPlayer && !src.dead && !o.dot) g.combat.damageEnemy(src, dmg * this.stats.thorns, this, { stagger: 0.1, proc: true, color: '#7aff7a' });
    if (this.hp <= 0) this.goDown();
    return dmg;
  }
  // Battle Sense: dodging the instant before a hit lands slows the monsters
  // (not the heroes) for a moment. Demigod reflexes are wired for battle.
  perfectDodge(src) {
    const g = this.game;
    if (this.battleSense < 1 || settings.battleSense === false || this.ai) return;
    this.battleSense = 0;
    g.battleSense(2.2);
    g.fx.flash?.(0xffd84a, 0.22, 0.25);
    g.fx.screenWave?.(this.pos.clone().setY(this.pos.y + 1), 0.6, 0.4);
    g.audio?.tone?.({ freq: 110, to: 70, dur: 0.35, gain: 0.25, type: 'sine', filter: 900 });
    g.toast?.(txt('enemies.player.battleSense'), 'big');
    this.gainCE(12);
    void src;
  }
  goDown() {
    const g = this.game;
    this.hp = 0;
    const others = g.players.filter((p) => p !== this && !p.dead && !p.downed);
    if (others.length) { this.downed = true; this.downT = 25; this.reviveProgress = 0; this.action = null; g.toast?.(txt('enemies.player.down', { name: g.heroName?.(this) ?? txt('enemies.player.defaultName', { n: this.index + 1 }) })); g.onHeroDown?.(this); }
    else { this.dead = true; this.deadT = 0; g.onPlayerDied?.(this); }
    this.domainActive = false;
    g.audio?.enemyDie(true);
  }
  revive(frac = 0.4) { this.downed = false; this.dead = false; this.hp = this.maxHp * frac; this.iframes = 2; this.action = null; this.game.fx.heal(this.pos); this.game.audio?.energy('heal'); }
  // the flask's state, read by the HUD, companions and the playthrough bot
  get flaskLeft() { return this.flask.left; }
  get ammo() { return this.quiver.ammo; }
  get ammoMax() { return this.quiver.max; }
  // Back to full: a respawn or a new place fills the flask and the quiver.
  refill() { this.flask.left = 0; this.quiver.ammo = this.quiver.max; this.quiver.regen = 0; }
  useHeal() {
    if (!canDrink(this.flask, this.hp, this.maxHp)) return;
    const r = this.healOverTime;   // (on top of a heal still running: the Nectar Flask)
    this.healOverTime = { left: (r?.left ?? 0) + drink(this.flask, this.maxHp, this.stats), t: Math.max(FLASK.dur, r?.t ?? 0) };
    this.game.fx.heal(this.pos, 0x9affd8);
    // Ambrosia Shield: half damage for a moment after a drink
    if (this.procs.barrier) this.barrierT = Math.max(this.barrierT ?? 0, PROC.barrierFor(this.procs.barrier));
    this.game.audio?.energy('heal');
    this.action = { type: 'sign', dur: 0.6, elapsed: 0, t: 0, moveScale: 0.6, cancelable: true };
    this.game.toast?.(txt('enemies.player.ambrosia'));
  }
  // ---------------------------------------------------------------- combat
  updateCombat(dt, inp) {
    const g = this.game;
    this.comboT -= dt; tickFlask(this.flask, dt); tickQuiver(this.quiver, dt);
    if (this.slamCd > 0) this.slamCd = Math.max(0, this.slamCd - dt);
    if (this.healOverTime) { const r = this.healOverTime; const k = Math.min(r.left, (r.left / Math.max(0.05, r.t)) * dt); this.hp = Math.min(this.maxHp, this.hp + k); r.left -= k; r.t -= dt; if (r.t <= 0 || r.left <= 0) this.healOverTime = null; }
    // X in the air after a jump: a jump slam (Minecraft Dungeons II's heavy jump attack)
    if ((inp.pressed.attack || (inp.pressed.slam && !this.slamQueued)) && this.canSlam()) this.startSlam();
    if (this.slamQueued && (this.grounded && this.jumpedT === 0 || this.jumpedT > 0.24)) { this.slamQueued = false; if (this.canSlam()) this.startSlam(); }
    if (this.slam) { this.attackBuffer = 0; if (this.grounded || this.inLiquid || (this.slam.t += dt) > 1.5) this.landSlam(); }
    else if (inp.pressed.attack || (inp.held.attack && this.autoRepeat && this.attackBuffer <= 0)) this.attackBuffer = 0.28;
    else this.attackBuffer -= dt;
    if (inp.held.attack) this.attackHeldT = (this.attackHeldT ?? 0) + dt; else this.attackHeldT = 0;
    if (inp.pressed.heal) this.useHeal();
    this.barrierT = Math.max(0, (this.barrierT ?? 0) - dt); this.rampageT = Math.max(0, (this.rampageT ?? 0) - dt);
    this.artifacts.forEach((art, i) => {
      tickArtifact(art, dt, this.stats.cdr);   // (charges come back one a cooldown: gearEffects.js)
      if (inp.pressed['art' + (i + 1)] && this.dodgeT <= 0 && !(this.action && this.action.lock) && spendArtifact(art, this.stats.cdr)) {
        useArtifact(g, this, art);
        // Winged Heels: a burst of speed after a magic item
        if (this.procs.haste) { this.speedBuffT = Math.max(this.speedBuffT ?? 0, PROC.hasteFor(this.procs.haste)); this.speedBuff = Math.max(this.speedBuff ?? 0, 0.3); }
      }
    });
    if (this.barrierT > 0 && Math.random() < 0.4) g.particles.glow.emit(this.pos.x + (Math.random() - 0.5) * 1.2, this.pos.y + Math.random() * 2, this.pos.z + (Math.random() - 0.5) * 1.2, 0, 0.5, 0, 0.6, 2, 1.8, 0.8, 0.1, 0, 1, 1, 1);
    // strike moment. Checked before chaining: a fast step (or a long frame)
    // can pass its strike and its chain point in one frame, and chaining
    // first would throw that hit away.
    if (this.action && this.action.type === 'attack' && !this.action.struck && this.action.t >= this.action.step.strike) {
      const step = this.action.step;   // a strike can replace this.action (an exploding kill hurts us)
      this.action.struck = true;
      this.kit.onStrike?.(step);
      if (!step.custom) g.combat.meleeStrike(this, step);
      g.fx.slashArc(this.pos, this.facing, step.trail ?? this.rig.look?.accent ?? 0xffffff, step.range * 0.9, step.arc > 2 ? 1 : 0.28, 0.16, step.style === 'swingL');
    }
    const a = this.action;
    // chain / start melee
    const canChain = !a || a.type === 'hit' || (a.type === 'attack' && a.t >= (a.step.chainAt ?? 0.62)) || a.type === 'sign';
    if (this.attackBuffer > 0 && canChain && this.dodgeT <= 0 && !this.kit.blocksMelee?.()) {
      if ((!a || a.type !== 'attack') && this.comboT < 0) this.comboStep = 0;   // combo window expired
      const combo = this.kit.combo || this.combo;
      const step = combo[this.comboStep % combo.length];
      this.startAttack(step, this.comboStep % combo.length);
      this.comboStep = (this.comboStep + 1) % combo.length;
      this.attackBuffer = 0;
    }
    if (this.comboT < -0.45 && (!this.action || this.action.type !== 'attack')) this.comboStep = 0;
    if (this.action && this.action.type === 'attack') {
      const st = this.action.step, k = this.action.t;
      // lunge during strike window
      const lunge = k > (st.windup ?? 0.3) * 0.8 && k < (st.strike ?? 0.5) + 0.1 ? (st.lunge ?? 0) : 0;
      this.action.root = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(lunge).addScaledVector(this.moveIntent || new THREE.Vector3(), 1.4);
    }
    this.kit.update?.(dt, inp);
  }
  // ---------------------------------------------------------------- jump slam
  // In the air from a jump, a melee press dives the hero down and the landing
  // knocks back and hurts everything round about.
  canSlam() { return !this.slam && !(this.slamCd > 0) && !this.grounded && !this.inLiquid && this.coyote <= 0 && this.jumpedT > 0.12 && this.dodgeT <= 0 && !this.downed && !this.minigameLock && !(this.action && this.action.lock); }
  startSlam() {
    this.slam = { t: 0 };
    this.vel.y = Math.min(this.vel.y, -16);
    this.action = { type: 'attack', step: { style: 'spin', strike: 0.99, custom: true, dur: 1, chainAt: 1 }, style: 'spin', dur: 0.6, elapsed: 0, t: 0, struck: true, moveScale: 0.3 };
    this.game.audio?.whoosh(0.9);
  }
  landSlam() {
    const g = this.game; this.slam = null; this.action = null;
    this.slamCd = SLAM.cd * (1 - (this.stats.cdr ?? 0) * 0.5);
    if (this.inLiquid) return;
    const at = this.pos.clone(); at.y += 0.3;
    const dmg = SLAM.dmg * (this.stats.meleeMult ?? 1) * (this.stats.damage ?? 1);
    g.combat.aoe(at, SLAM.radius, dmg, this, { knock: SLAM.knock, stagger: 0.45, melee: true, blocks: true });
    g.fx.rings?.spawn(at.clone().setY(this.pos.y + 0.08), { color: 0xffe0a0, r1: SLAM.radius, dur: 0.35, thick: 0.3 });
    g.fx.landDust?.(this.pos, 18);
    g.particles?.burst?.(at, { count: 16, color: 0xd8c8a8, speed: 5, up: 1.2, life: 0.5, size: 0.16 });
    g.shake(0.35); g.hitStop?.(0.05);
    if (!g.audio?.sample?.('hit', { gain: 0.8, rate: 0.7 })) g.audio?.thud?.();
    this.iframes = Math.max(this.iframes, 0.1);
  }
  startAttack(step, idx) {
    // A swing goes where the hero faces: the cursor, the right stick, or the
    // way they're moving. A person's hero is never turned toward an enemy;
    // AI companions still steer their swings at their target.
    this.facing = Math.atan2(this.aimDir.x, this.aimDir.z);
    const steer = this.ai || this.input().virtual;
    let best = null, bd = steer ? 4.5 : step.range + 0.6;
    for (const e of this.game.enemies) {
      if (e.dead || e.untargetable) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < bd && Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - this.facing), Math.cos(Math.atan2(dx, dz) - this.facing))) < 0.9) { bd = d; best = e; }
    }
    if (steer) { if (best) { this.facing = Math.atan2(best.pos.x - this.pos.x, best.pos.z - this.pos.z); step = { ...step, lunge: step.lunge * Math.min(1.6, Math.max(0.2, (bd - 1.2) / 1.6)) }; } }
    // a person's swing only nudges forward a little, and not at all when
    // an enemy is already in reach in front
    else step = { ...step, lunge: best ? 0 : (step.lunge ?? 0) * 0.4 };
    this.action = { type: 'attack', step, style: step.style, dur: step.dur / ((this.stats.attackSpeed ?? 1) * (this.rampageT > 0 ? 1 + (this.procs.rampage ?? 0) * 0.1 : 1)), elapsed: 0, t: 0, windup: step.windup, strike: step.strike, struck: false, step: step, idx, moveScale: 0.25 };
    this.comboT = step.dur + 0.35;
    this.game.audio?.swing(idx);
  }
  spawn(p) { this.pos.copy(p); this.vel.set(0, 0, 0); this.visY = p.y; this.safePos.copy(p); this.object.position.copy(p); }
  input() { return this.game.input.get(this.device); }

  // Ranged aim help for a controller or touch: the nearest enemy within 20°
  // of the aim line, as far as a shot flies (combatRules.js AIM). Mouse and
  // right-stick aim get none (their shots still pitch up or down to a
  // monster on the aim line: heroes/kit.js shotDir).
  rangedAssist() {
    const inp = this.input();
    if (inp.mouse || inp.aimStick || inp.virtual || this.ai) return null;
    let best = null, bd = AIM.assist;
    const face = Math.atan2(this.aimDir.x, this.aimDir.z);
    for (const e of this.game.enemies) {
      if (e.dead || e.untargetable || e.disguised) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      const off = Math.atan2(Math.sin(Math.atan2(dx, dz) - face), Math.cos(Math.atan2(dx, dz) - face));
      if (d < bd && Math.abs(off) < AIM.assistCone) { bd = d; best = e; }
    }
    return best;
  }
  // Determine aim direction for this frame.
  updateAim(inp) {
    const g = this.game;
    this.aiming = false;
    if (inp.mouse) {
      g.rig.groundPoint(g.input.mouse.ndcX, g.input.mouse.ndcY, this.pos.y + 0.9, this.aimPoint);
      const d = this.aimPoint.clone().sub(this.pos); d.y = 0;
      if (d.lengthSq() > 0.04) { this.aimDir.copy(d.normalize()); this.aiming = true; }
    } else if (inp.aimStick) {
      g.rig.screenToWorldDir(inp.aimStick.x, inp.aimStick.y, this.aimDir).normalize();
      this.aiming = true;
      this.aimPoint.copy(this.pos).addScaledVector(this.aimDir, 6);
    } else if (!inp.virtual && !this.ai) {
      // a controller without the right stick (or touch): aim the way the hero
      // moves, or keeps facing when standing still; never turned toward an
      // enemy. Ranged shots get a little help from an enemy close to that
      // line (assistTarget, heroes/kit.js), without turning the hero.
      this.autoTarget = null;
      if (Math.hypot(inp.move.x, inp.move.y) > 0.2) g.rig.screenToWorldDir(inp.move.x, inp.move.y, this.aimDir).setY(0).normalize();
      else this.aimDir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
      this.aimPoint.copy(this.pos).addScaledVector(this.aimDir, 5);
    } else {
      // AI companions: auto-aim at nearest enemy, else movement direction
      const t = g.nearestEnemy?.(this.pos, 11);
      if (t) { this.aimDir.set(t.pos.x - this.pos.x, 0, t.pos.z - this.pos.z).normalize(); this.aimPoint.copy(t.pos); this.autoTarget = t; }
      else {
        this.autoTarget = null;
        if (this.vel.lengthSq() > 0.5) this.aimDir.set(this.vel.x, 0, this.vel.z).normalize();
        this.aimPoint.copy(this.pos).addScaledVector(this.aimDir, 5);
      }
    }
  }

  update(dt) {
    const g = this.game, inp = this.input();
    if (this.dead) { this.animate(dt); return; }
    // riding a train, the zoo truck or the Greyhound, or driving the taxi (openworld/roadtrip.js): the vehicle carries the hero
    if (this.vehicle) { this.vehicle.carry(this, dt); this.animate(dt); return; }
    if (this.downed) {
      this.downT -= dt;
      const helper = g.players.find((p) => p !== this && !p.dead && !p.downed && p.pos.distanceTo(this.pos) < 2.2);
      this.reviveProgress = helper ? this.reviveProgress + dt / 2.2 : Math.max(0, this.reviveProgress - dt);
      if (this.reviveProgress >= 1) this.revive(0.4);
      else if (this.downT <= 0) { this.downed = false; this.dead = true; this.deadT = 0; g.onPlayerDied?.(this); }
      this.vel.set(0, this.vel.y, 0); moveEntity(this, g.world, dt); this.animate(dt); return;
    }
    this.updateAim(inp);
    this.battleSense = Math.min(1, this.battleSense + dt / 7);
    // a camp minigame has the controls: stand still, aim, let it handle the buttons
    if (this.minigameLock) { this.vel.x = 0; this.vel.z = 0; moveEntity(this, g.world, dt); this.animate(dt); return; }
    // movement intent (AI companions steer in world space)
    let mv;
    if (inp.worldMove) mv = inp.worldMove.clone().setY(0);
    else {
      mv = g.rig.screenToWorldDir(inp.move.x, inp.move.y, new THREE.Vector3());
      const mvLen = Math.min(1, Math.hypot(inp.move.x, inp.move.y));
      if (mvLen > 0.01) mv.normalize().multiplyScalar(mvLen);
    }
    if (mv.lengthSq() > 1) mv.normalize();
    // hold Shift (keyboard): stand still and attack in place, facing the cursor
    if (inp.held.root) mv.set(0, 0, 0);
    this.moveIntent = mv;
    this.iframes = Math.max(0, this.iframes - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    // dodge roll: on the ground (or just off a ledge); a press in the air or
    // a moment early is remembered briefly, so the roll always comes out
    // (a right-stick flick rolls the way it was flicked, a screen direction; B and Shift roll the way you move or face)
    if (inp.pressed.dodge) { this.dodgeBuffer = this.grounded ? 0.2 : 0.75; this.dodgeAim = inp.dodgeDir ? g.rig.screenToWorldDir(inp.dodgeDir.x, inp.dodgeDir.y, new THREE.Vector3()).setY(0) : inp.dodgeToAim ? this.aimDir.clone().setY(0) : null; }
    else this.dodgeBuffer = Math.max(0, (this.dodgeBuffer ?? 0) - dt);
    if (this.dodgeBuffer > 0 && this.dodgeCd <= 0 && (this.grounded || this.coyote > 0 || this.inLiquid) && !this.downed && (!this.action || this.action.cancelable !== false) && !this.kit.blocksDodge?.()) { this.dodgeBuffer = 0; this.startDodge(this.dodgeAim?.lengthSq() > 0.01 ? this.dodgeAim : mv); this.dodgeAim = null; }
    // jump (A, Space): about a block and a half, from the ground or just after leaving a ledge
    // In a pool (the camp creek pond, the lava pool by the climbing wall) the
    // bank can be two blocks high, more than a jump clears: kick off the
    // bottom higher, and climb out on your own when walking into the bank,
    // so nobody (player or companion) is ever trapped in the water.
    const wading = this.inLiquid && this.grounded && this.hitWall && mv.lengthSq() > 0.25 && !this.downed && this.dodgeT <= 0;
    this.wadeT = wading ? (this.wadeT ?? 0) + dt : 0;
    // Q (keyboard): a jump slam from the ground jumps first and slams near the top
    const slamJump = inp.pressed.slam && !this.slam && this.dodgeT <= 0;
    if ((inp.pressed.jump || slamJump || this.wadeT > 0.25) && !this.downed && (this.grounded || this.coyote > 0) && this.dodgeT <= 0 && (!this.action || this.action.cancelable !== false)) {
      this.vel.y = this.inLiquid ? 12.6 : 10.5; this.grounded = false; this.coyote = 0; this.wadeT = 0; this.jumpedT = 0.001; if (slamJump) this.slamQueued = true;
      this.game.particles?.burst?.(this.pos.clone().setY(this.pos.y + 0.1), { count: 6, color: 0xd8c8a8, speed: 1.5, up: 1, life: 0.4, size: 0.1 });
    }
    if (this.jumpedT > 0) this.jumpedT = this.grounded && this.jumpedT > 0.1 ? 0 : this.jumpedT + dt;   // time since a jump, while airborne
    if (!this.downed) this.updateCombat(dt, inp);
    if (this.hurtT > 0) { this.hurtT -= dt; if (this.hurtT <= 0) this.rig.swap(null); }
    this.slowT = Math.max(0, this.slowT - dt);
    this.speedBuffT = Math.max(0, (this.speedBuffT ?? 0) - dt);
    let speed = this.speed * this.stats.speed * (this.inLiquid === 'water' ? 0.7 : 1) * (this.slowT > 0 ? 0.6 : 1) * (this.kit.speedMul ?? 1) * (this.speedBuffT > 0 ? 1 + (this.speedBuff ?? 0.3) : 1);
    if (this.stats.regen && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.stats.regen * dt);
    // Hephaestus's Embers: burn monsters right next to you
    if (this.procs.embers) {
      this.emberT = (this.emberT ?? 0) - dt;
      if (this.emberT <= 0) { this.emberT = 0.5; for (const e of g.enemies) if (!e.dead && !e.isDummy && !e.untargetable && e.pos.distanceTo(this.pos) < 2.2) g.combat.damageEnemy(e, 3 * this.procs.embers, this, { stagger: 0, proc: true, color: '#ff9a3a' }); }
      if (Math.random() < dt * 8) g.particles.burst(this.pos.clone().setY(this.pos.y + 0.4), { count: 1, color: 0xff7a2a, speed: 1, up: 1.5, life: 0.5, size: 0.12 });
    }
    const want = new THREE.Vector3();
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const k = this.dodgeT / this.dodgeDur;
      want.copy(this.dodgeDir).multiplyScalar(15 * (0.35 + k * 0.9));
      if (this.dodgeT <= 0) this.action = null;
    } else if (this.action && this.action.root) {
      want.copy(this.action.root);                         // attack lunges etc.
      // a companion's lunge stops at a ledge (a person's is their own call)
      if (this.ai && this.grounded && want.lengthSq() > 0.01) {
        const l = want.length(), gy = g.world.groundBelow(this.pos.x + want.x / l * 0.9, this.pos.z + want.z / l * 0.9, this.pos.y + 0.5);
        if (!isFinite(gy) || gy < this.pos.y - 2.5) want.set(0, 0, 0);
      }
    } else if (!this.downed) {
      const busy = this.action && this.action.moveScale !== undefined ? this.action.moveScale : 1;
      want.copy(mv).multiplyScalar(speed * busy);
    }
    if (this.knock && this.knock.lengthSq() > 0.01) { want.add(this.knock); this.knock.multiplyScalar(Math.exp(-dt * 8)); }
    // snappy on the ground (no ice), still steerable in a jump
    const accel = this.dodgeT > 0 ? 30 : this.grounded ? 24 : 9;
    this.vel.x = damp(this.vel.x, want.x, accel, dt);
    this.vel.z = damp(this.vel.z, want.z, accel, dt);
    moveEntity(this, g.world, dt);
    if (!Number.isFinite(this.pos.x + this.pos.y + this.pos.z + this.vel.x + this.vel.z)) { this.pos.copy(this.safePos); this.vel.set(0, 0, 0); this.knock?.set(0, 0, 0); }
    // pits: fell out of the world → respawn at last safe spot
    if (this.pos.y < -6) this.fellOff();
    if (this.grounded && !this.inLiquid) {
      this.safeT += dt;
      if (this.safeT > 0.4 && this.edgeSafe()) { this.safePos.copy(this.pos); this.safeT = 0; }
    }
    // facing
    const moving = Math.hypot(this.vel.x, this.vel.z) > 0.4;
    let targetFacing = this.facing;
    if (this.dodgeT > 0) targetFacing = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
    else if (this.action && this.action.faceAim !== false) targetFacing = Math.atan2(this.aimDir.x, this.aimDir.z);
    else if ((inp.mouse && this.aiming && (inp.held.attack || inp.held.ranged || inp.held.root)) || inp.aimStick) targetFacing = Math.atan2(this.aimDir.x, this.aimDir.z);
    else if (moving) targetFacing = Math.atan2(this.vel.x, this.vel.z);
    this.facing = dampAngle(this.facing, targetFacing, this.action ? 30 : 14, dt);
    // footsteps
    if (moving && this.grounded && this.dodgeT <= 0) {
      this.stepT += dt * Math.hypot(this.vel.x, this.vel.z) / 2.2;
      if (this.stepT > 1) { this.stepT = 0; g.audio?.footstep(g.surfaceAt(this.pos), this.pos); if (this.inLiquid) g.fx?.splash(this.pos, 0.4); }
    }
    this.animate(dt);
  }
  edgeSafe() {
    const w = this.game.world;
    for (const [dx, dz] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]]) if (!isFinite(w.groundBelow(this.pos.x + dx, this.pos.z + dz, this.pos.y)) || w.groundBelow(this.pos.x + dx, this.pos.z + dz, this.pos.y) < this.pos.y - 2) return false;
    return true;
  }
  startDodge(mv) {
    const dir = mv.lengthSq() > 0.01 ? mv.clone().normalize() : new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    this.dodgeDir.copy(dir); this.dodgeDur = 0.42; this.dodgeT = this.dodgeDur;
    this.iframes = 0.36; this.dodgeCd = 0.75 * (1 - this.stats.cdr * 0.5);
    this.action = { type: 'dodge', t: 0, dur: this.dodgeDur, elapsed: 0 };
    if (!this.game.audio?.sample?.('roll', { gain: 0.7 })) this.game.audio?.whoosh(0.6);
    this.game.fx?.dodgeTrail(this);
    this.onDodge?.();
  }
  fellOff() {
    const g = this.game;
    g.fx?.poof(this.pos);
    // An AI companion that steps off a ledge comes back beside the hero it
    // follows, unhurt: its last safe spot is usually the same ledge it walked
    // off (a boss arena over the abyss cost companions dozens of falls and
    // most of their health in the comfort playthroughs).
    const lead = this.ai && g.players?.find((q) => !q.ai && !q.dead && !q.downed && q.grounded && !q.inLiquid);
    // The last safe spot must still have ground under it (a Continue can bring
    // back a checkpoint from an older build of the level): otherwise, or after
    // a second fall within a few seconds, go back to the level's start instead
    // of falling from the same spot again and again.
    const now = performance.now(), again = now - (this.lastFallAt ?? -1e9) < 4000; this.lastFallAt = now;
    const w = g.world, sp = this.safePos, gy = w?.groundBelow(sp.x, sp.z, sp.y + 1) ?? -Infinity;
    if (!lead && (again || !Number.isFinite(gy) || sp.y - gy > 2) && g.level?.spawn) this.safePos.copy(g.level.spawn);
    this.spawn(lead ? lead.pos.clone().add(new THREE.Vector3(Math.sin(lead.facing + 2.4) * 1.2, 0.05, Math.cos(lead.facing + 2.4) * 1.2)) : this.safePos);
    if (lead && !this.edgeSafe()) this.spawn(lead.pos);
    this.iframes = 1;
    if (!this.ai) this.takeDamage?.(this.maxHp * 0.1, null, { pure: true, noKnock: true });
    g.audio?.hurt();
  }
  animate(dt) {
    const a = this.action;
    if (a) { a.elapsed = (a.elapsed ?? 0) + dt; a.t = Math.min(1, a.elapsed / a.dur); }
    const speed = Math.hypot(this.vel.x, this.vel.z) / this.speed;
    this.visY = this.stepped ? damp(this.visY, this.pos.y, 16, dt) : this.pos.y;
    if (Math.abs(this.visY - this.pos.y) < 0.01) this.stepped = 0;
    this.object.position.set(this.pos.x, this.visY, this.pos.z);
    this.object.rotation.y = this.facing;
    this.rig.animate({ dt, air: !this.grounded && !this.inLiquid && Math.abs(this.vel.y) > 1.5, speed: this.dodgeT > 0 ? 0 : clamp(speed, 0, 1), vel: this.vel, action: this.dead ? { type: 'death', t: Math.min(1, (this.deadT = (this.deadT ?? 0) + dt)) } : this.downed ? { type: 'down', t: 1 } : a });
    // an attack always lands its strike before it ends (see updateCombat)
    if (a && a.t >= 1 && a.type !== 'dodge' && !a.hold && !(a.type === 'attack' && !a.struck)) this.action = null;
  }
}

// Base class for a hero's ability kit: ability slots with cooldowns and
// Power costs, input routing and a generic ranged bolt. Also the shared
// combat statuses every kit can apply without touching the enemy code:
// marks (+50% damage taken), roots, stuns, slows, fear and burning, team
// buffs (War Cry, Forge Fire, Wisdom's Gambit) and per-kit hooks on the
// damage heroes deal (`kit.outgoing(e, o)` → multiplier) and take.
import * as THREE from 'three/webgpu';
import { uniform, uv, vec3, vec4, float, sin, length, smoothstep, atan, mix } from 'three/tsl';
import { t } from '../text_config.js';
import { BASE_COMBO } from '../combat.js';
import { U } from '../gfx/materials.js';
import { shoot, ammoInfo } from '../resources.js';
import { validLoadout, SLOTS } from './skillRules.js';
import { RANGED, AIM, lifeOf, pitchTo, dirOf, bodyCentre, lineTarget, cursorTarget, groundPitch } from '../combatRules.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

// ---------------------------------------------------------------- team buffs
export function teamBuff(g, key, dur) { (g.pjBuffs || (g.pjBuffs = {}))[key] = g.time + dur; }
export function buffOn(g, key) { return (g.pjBuffs?.[key] ?? -1) > g.time; }
export function clearBuff(g, key) { if (g.pjBuffs) delete g.pjBuffs[key]; }
const onTeam = (src) => !!src && (src.isPlayer || !!src.owner?.isPlayer);

// Damage multiplier applied to every hit an enemy takes.
function incomingToEnemy(e, src, o) {
  const g = e.game; let m = 1;
  if (e.pjMarkT > g.time) m *= 1.5 + (e.pjMarkBonus ?? 0);
  if (onTeam(src)) {
    if (buffOn(g, 'warCry')) m *= 1.25;
    if (o.melee && buffOn(g, 'forge')) {
      m *= 1.3;
      g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + (e.height ?? 1.5) * 0.6), { count: 8, color: 0xff8a2a, speed: 6, up: 1, life: 0.4, size: 0.09, gravity: 10, shape: 3 });
    }
    if (src.isPlayer && buffOn(g, 'gambit') && !o.crit && !o.pjCrit) { m *= 2; o.pjCrit = true; }
    const k = src.kit?.outgoing?.(e, o);
    if (typeof k === 'number') m *= k;
    if (o.pjCrit) g.particles.burst(tmp.copy(e.pos).setY(e.pos.y + (e.height ?? 1.5) * 0.7), { count: 6, color: 0xffd84a, speed: 5, life: 0.3, size: 0.12, shape: 3 });
  }
  return m;
}
export function hookEnemy(e) {
  if (e.pjHooked || !e.takeDamage) return;
  e.pjHooked = true;
  const base = e.takeDamage;
  e.takeDamage = function (amount, src, o = {}) { return base.call(this, amount * incomingToEnemy(this, src, o), src, o); };
}
// Damage a hero (or ally) takes: Tyson's Watch Shield guards those behind him.
function incomingToHero(p, src, o) {
  const g = p.game, s = g.pjShield;
  if (!s || s.until <= g.time || s.owner === p || s.owner.dead || !src?.pos) return 1;
  const o2 = s.owner, fx = Math.sin(o2.facing), fz = Math.cos(o2.facing);
  const srcAhead = (src.pos.x - o2.pos.x) * fx + (src.pos.z - o2.pos.z) * fz > 0;
  const behind = (p.pos.x - o2.pos.x) * fx + (p.pos.z - o2.pos.z) * fz < 0.6 && p.pos.distanceTo(o2.pos) < 5;
  return srcAhead && behind ? 0.5 : 1;
}
export function hookHero(p) {
  if (p.pjHooked || !p.takeDamage) return;
  p.pjHooked = true;
  const base = p.takeDamage;
  p.takeDamage = function (amount, src, o = {}) { return base.call(this, amount * incomingToHero(this, src, o), src, o); };
}

// ---------------------------------------------------------------- statuses
const canControl = (e) => !e.dead && !e.isBoss && !e.isDummy;
export function mark(e, dur, g, bonus = 0) { e.pjMarkT = Math.max(e.pjMarkT ?? 0, g.time + dur); e.pjMarkBonus = bonus; }
// Cancelling a wind-up must also leave the wind-up state: a monster left in
// 'windup' with no action threw every frame once the root wore off (Annabeth's
// trap or Grover's vines on a monster mid-attack froze the game).
export function root(e, dur) { if (!canControl(e)) return false; e.sealT = Math.max(e.sealT ?? 0, dur); e.cancelAttack?.(); if (e.state === 'windup' || e.state === 'recover') { e.state = 'idle'; e.stateT = 0; } return true; }
export function stun(e, dur) {
  if (e.dead || e.isDummy) return false;
  if (e.isBoss) return false;
  e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = Math.max(e.stagger ?? 0, dur);
  e.pjStunT = e.game.time + dur;
  return true;
}
export function slow(e, dur) { if (!e.dead) e.slowT = Math.max(e.slowT ?? 0, dur); }
export function fear(e, dur, from, g, dps = 0, src = null) { if (!canControl(e)) { slow(e, dur); return; } e.pjFear = { until: g.time + dur, from, dps, src, tick: 0 }; }
export function burn(e, dur, dps, src, g) { if (e.dead) return; e.pjBurn = { until: g.time + dur, dps: Math.max(dps, e.pjBurn?.until > g.time ? e.pjBurn.dps : 0), src, tick: 0.3 }; }

// Once per frame (whichever kit runs first): hooks, burning, fear, marks, stuns.
export function statusTick(g, dt) {
  if (g.pjStatusAt === g.time) return;
  g.pjStatusAt = g.time;
  for (const p of g.players) hookHero(p);
  for (const a of g.allies) hookHero(a);
  if (!dt) return;
  const P = g.particles.glow;
  for (const e of g.enemies) {
    hookEnemy(e);
    if (e.dead) continue;
    const h = e.height ?? 1.5;
    if (e.pjBurn) {
      const b = e.pjBurn;
      if (b.until <= g.time) e.pjBurn = null;
      else {
        b.tick -= dt;
        if (Math.random() < dt * 30) P.emit(e.pos.x + (Math.random() - 0.5) * 0.7, e.pos.y + Math.random() * h, e.pos.z + (Math.random() - 0.5) * 0.7, 0, 1.6 + Math.random(), 0, 0.45, 3, 1.1, 0.25, 0.18, -1, 1, 0.4, 0);
        if (b.tick <= 0) { b.tick = 0.4; g.combat.damageEnemy(e, b.dps * 0.4, b.src, { stagger: 0, ceGain: 0, color: '#ff9a3a', crit: false, burn: true }); }
      }
    }
    if (e.pjFear) {
      const f = e.pjFear;
      if (f.until <= g.time || e.dead) e.pjFear = null;
      else {
        const from = f.from.pos ?? f.from;
        tmp.subVectors(e.pos, from).setY(0); if (tmp.lengthSq() < 1e-3) tmp.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        tmp.normalize();
        e.cancelAttack?.(); e.state = 'stagger'; e.stateT = 0; e.stagger = 0.3;
        e.knock.copy(tmp).multiplyScalar((e.speed ?? 3) * 1.25);
        e.facing = Math.atan2(tmp.x, tmp.z);
        if (Math.random() < dt * 6) P.emit(e.pos.x, e.pos.y + h + 0.3, e.pos.z, 0, 1.2, 0, 0.5, 0.6, 2.2, 0.8, 0.22, 0, 1, 0.5, 2);
        if (f.dps) { f.tick -= dt; if (f.tick <= 0) { f.tick = 1; g.combat.damageEnemy(e, f.dps, f.src, { stagger: 0, ceGain: 0, color: '#9aff7a', crit: false }); } }
      }
    }
    if (e.pjMarkT > g.time && Math.random() < dt * 5) {
      g.fx.rings.spawn(tmp.set(e.pos.x, e.pos.y + h + 0.45, e.pos.z), { color: 0xffc84a, r0: 0.75, r1: 0.35, dur: 0.45, thick: 0.25 });
      P.emit(e.pos.x, e.pos.y + h + 0.45, e.pos.z, 0, 0.4, 0, 0.4, 3, 2.2, 0.6, 0.3, 0, 1, 0.4, 3);
    }
    if (e.pjStunT > g.time && Math.random() < dt * 10) {
      const a = g.time * 8 + Math.random();
      P.emit(e.pos.x + Math.cos(a) * 0.45, e.pos.y + h + 0.2, e.pos.z + Math.sin(a) * 0.45, 0, 0.2, 0, 0.3, 3, 2.6, 0.6, 0.14, 0, 1, 0.1, 3);
    }
  }
}

// ---------------------------------------------------------------- shared visuals
// Jagged lightning between two points drawn with additive slash quads.
export function zap(g, a, b, color = 0xffe24a, width = 0.16, dur = 0.16, segs = 5) {
  let p = a.clone();
  for (let i = 1; i <= segs; i++) {
    const q = a.clone().lerp(b, i / segs);
    if (i < segs) q.add(tmp2.set((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7));
    const d = tmp.subVectors(q, p); const len = d.length();
    if (len > 0.01) { g.fx.slashLine(p, d.clone().normalize(), len, color, width, dur, Math.random() * 3); g.fx.slashLine(p, d.clone().normalize(), len, 0xffffff, width * 0.35, dur * 0.8, Math.random() * 3); }
    p = q;
  }
}
// Flat glowing disc (pools, song circles, blueprints): rippling rings with an
// optional angular pattern. Returns a Mesh with userData { alpha, color }.
export function makeDisc(color, { rings = 9, speed = 1.5, spokes = 0, intensity = 1.6 } = {}) {
  const alpha = uniform(0), col = uniform(new THREE.Color(color));
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const p = uv().sub(0.5).mul(2); const r = length(p);
  const wave = sin(r.mul(rings * 6.283).sub(U.time.mul(speed * 6.283))).mul(0.5).add(0.5);
  const spoke = spokes ? sin(atan(p.y, p.x).mul(spokes).add(U.time.mul(1.5))).mul(0.5).add(0.5) : float(0);
  const edge = smoothstep(1.0, 0.9, r).mul(mix(float(0.35), float(1), smoothstep(0.6, 1.0, r)));
  const a = edge.mul(wave.pow(3).mul(0.6).add(0.25).add(spoke.pow(6).mul(0.4))).mul(alpha);
  m.colorNode = vec4(vec3(col).mul(a).mul(intensity), a);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 14; mesh.frustumCulled = false;
  mesh.userData = { alpha, color: col };
  return mesh;
}

// ---------------------------------------------------------------- kit base
export class Kit {
  constructor(player) {
    this.p = player; this.game = player.game;
    this.combo = BASE_COMBO;
    this.slots = {
      ranged: this.ability({ name: t('powers.base.ranged'), icon: '✦', cd: 0.55, ce: 0, use: () => this.powerBolt() }),
    };
    this.domain = null;
    this.skills = {};   // skill-tree ranks, filled from save
    hookHero(player);
  }
  ability(o) { return { cdLeft: 0, charges: 1, ...o }; }
  dispose() { for (const o of this.owned ?? []) this.game.scene.remove(o); }
  own(o) { (this.owned || (this.owned = [])).push(o); this.game.scene.add(o); return o; }
  rank(id) { return this.p.skills?.[id] ?? 0; }
  // a learned power's upgrades: its ranks after the first (which learns it)
  up(id) { return Math.max(0, this.rank(id) - 1); }
  // Slots 1 · 2 · 3 from the hero's equipped powers (the save's loadout,
  // checked against what the hero knows); powers maps power id -> ability.
  equipSlots(powers) {
    const eq = validLoadout(this.p.hero, this.p.skills, this.p.loadout), out = {};
    SLOTS.forEach((k, i) => { const a = powers[eq[i]]; if (a) out[k] = Object.assign(a, { power: eq[i] }); });
    return out;
  }
  get cdr() { return 1 - (this.p.stats.cdr ?? 0); }
  update(dt, inp) {
    statusTick(this.game, dt);
    for (const k in this.slots) {
      const s = this.slots[k];
      if (s.maxCharges) {
        // charge-based ability: recharges one charge at a time
        if (s.chargesLeft < s.maxCharges) { s.recharge = (s.recharge ?? 0) + dt; if (s.recharge >= s.cd * this.cdr) { s.recharge = 0; s.chargesLeft++; } }
        s.gate = Math.max(0, (s.gate ?? 0) - dt);
        s.cdLeft = s.chargesLeft > 0 ? s.gate : s.cd * this.cdr - (s.recharge ?? 0);
      } else s.cdLeft = Math.max(0, s.cdLeft - dt);
      const pressed = s.hold ? inp.held[k] : inp.pressed[k];
      // the basic ranged attack shoots from the quiver (resources.js); abilities don't
      const quiver = k === 'ranged' ? this.p.quiver : null;
      if (pressed && quiver && quiver.ammo <= 0 && s.cdLeft <= 0) { this.dryFire(); continue; }
      if (pressed && s.cdLeft <= 0 && this.p.ce >= (s.ce ?? 0) && this.canCast(s)) {
        // controller/touch ranged help: shoot at an enemy close to the aim
        // line, then put the hero's aim and facing back as they were
        const assist = quiver ? this.p.rangedAssist?.() : null, keepAim = assist && this.p.aimDir.clone(), keepFace = this.p.facing;
        if (assist) { this.p.aimDir.set(assist.pos.x - this.p.pos.x, 0, assist.pos.z - this.p.pos.z).normalize(); this.p.autoTarget = assist; this.p.aimPoint.copy(assist.pos); }
        const used = s.use();
        if (assist) { this.p.aimDir.copy(keepAim); this.p.facing = keepFace; this.p.autoTarget = null; }
        if (used !== false) {
          if (quiver) shoot(quiver);
          if (s.maxCharges) { s.chargesLeft--; s.gate = s.gateTime ?? 0.3; } else s.cdLeft = s.cd * this.cdr;
          this.p.ce -= s.ce ?? 0;
        }
      }
      if (s.onRelease && inp.released[k]) s.onRelease();
    }
    if (this.domain && inp.pressed.domain && this.p.ce >= this.p.maxCe && !this.game.domain && this.canCast(this.domain)) {
      this.p.ce = 0;
      this.game.startDomain(this.p, this.domain);
    }
    this.tick?.(dt, inp);
  }
  // Ranged with an empty quiver: a dry click, and (once) a word on how it refills.
  dryFire() {
    const g = this.game, p = this.p;
    if ((this.dryT ?? -9) > g.time - 0.25) return;
    this.dryT = g.time;
    if (!p.ai && !p.remote) {
      g.audio?.tone?.({ freq: 1400, to: 900, dur: 0.04, gain: 0.07, type: 'square', filter: 2400 });
      g.audio?.tone?.({ freq: 520, to: 380, dur: 0.05, gain: 0.05, type: 'triangle' });
      if (!Kit.dryHinted) { Kit.dryHinted = true; g.toast?.(ammoInfo(p.hero).out); }
      p.dryFlashT = 0.35;   // the HUD's ammo count flashes
    }
  }
  canCast() { const a = this.p.action; return this.p.dodgeT <= 0 && !(a && a.type === 'cast' && a.lock); }
  cast(dur = 0.35, both = false, extra = {}) { this.p.action = { type: 'cast', dur, elapsed: 0, t: 0, both, moveScale: 0.35, ...extra }; this.p.facing = Math.atan2(this.p.aimDir.x, this.p.aimDir.z); }
  // where a cast leaves the hand (1.1 m: the hand of a hero drawn at CHAR_SCALE, entities/character.js)
  handPos(out = new THREE.Vector3()) {
    const p = this.p; return out.set(p.pos.x + Math.sin(p.facing) * 0.6, p.pos.y + 1.1, p.pos.z + Math.cos(p.facing) * 0.6);
  }
  aimTarget() { return this.p.autoTarget || this.game.nearestEnemy(this.p.aimPoint, 3.5); }
  // ---------------------------------------------------------------- 3D aim
  // What a ranged shot from `from` aims at, in 3D, so it climbs to a monster
  // on a ledge or dips to one down a stair or a slope instead of flying flat
  // into the hill or over its head (tuning: combatRules.js AIM):
  //   1. a monster picked for the shot: the aim assist or a companion's
  //      target (autoTarget), or the one under the mouse cursor: its body
  //   2. a monster standing on the aim line: the shot keeps its heading and
  //      pitches to its body
  //   3. nothing to shoot at: the ground under the cursor (mouse), or the
  //      ground just ahead (pads): the shot runs parallel to it
  // Returns { target, point } (point: where to aim, or null to fly level
  // along the ground ahead).
  shotAim(from) {
    const g = this.game, p = this.p, inp = p.remote ? null : p.input?.();
    const picked = p.autoTarget && !p.autoTarget.dead ? p.autoTarget : inp?.mouse ? this.cursorPick() : null;
    if (picked) return { target: picked, point: this.clearPoint(from, picked) };
    const flat = tmp2.set(p.aimDir.x, 0, p.aimDir.z); if (flat.lengthSq() < 1e-6) flat.set(Math.sin(p.facing), 0, Math.cos(p.facing)); flat.normalize();
    const onLine = lineTarget(from, flat, g.enemies);
    if (onLine) return { target: onLine, point: this.clearPoint(from, onLine), keepYaw: true };
    if (inp?.mouse) {
      const gp = this.cursorGround();
      if (gp && Math.hypot(gp.x - p.pos.x, gp.z - p.pos.z) > 1.5) return { target: null, point: gp.setY(gp.y + (from.y - p.pos.y)) };
    }
    return { target: null, point: null };
  }
  // Where on a monster's body to aim: its middle, or higher up when the
  // edge of the ledge it stands on is in the way of a shot at its middle.
  clearPoint(from, e) {
    const c = bodyCentre(e, new THREE.Vector3()), h = e.height ?? 1.5;
    if (c.y <= from.y + 0.3) return c;
    for (const k of [0, 0.25, 0.4]) { c.y = e.pos.y + h * (0.5 + k); if (this.lineClear(from, c)) return c; }
    c.y = e.pos.y + h * 0.5;
    return c;
  }
  // No solid block on the straight line between two points, nor a hand's
  // breadth under it (a shot's size, and Grover's notes bob).
  lineClear(a, b) {
    const w = this.game.world, d = a.distanceTo(b), n = Math.ceil(d / 0.35);
    for (let i = 1; i < n; i++) {
      const k = i / n, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, z = a.z + (b.z - a.z) * k;
      if (w.solidAt(x, y, z) || w.solidAt(x, y - 0.25, z)) return false;
    }
    return true;
  }
  // A unit direction for a shot from `from`: toward shotAim's point (the
  // pitch held within AIM.maxPitch), or level along the ground ahead.
  shotDir(from, out = new THREE.Vector3(), aim = this.shotAim(from)) {
    const p = this.p;
    let yaw = Math.atan2(p.aimDir.x, p.aimDir.z), pitch;
    if (aim.point) {
      if (!aim.keepYaw && Math.hypot(aim.point.x - from.x, aim.point.z - from.z) > 0.5) yaw = Math.atan2(aim.point.x - from.x, aim.point.z - from.z);
      pitch = pitchTo(from, aim.point);
    } else {
      const P = AIM.groundProbe, here = p.grounded ? p.pos.y : this.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5);
      const ahead = here == null ? null : this.groundAt(p.pos.x + Math.sin(yaw) * P, p.pos.z + Math.cos(yaw) * P, here + P * Math.tan(AIM.maxPitch) + 0.5);
      pitch = here == null ? 0 : groundPitch(here, ahead);
    }
    return dirOf(yaw, pitch, out);
  }
  // The cursor's ray from the camera (mouse players only).
  cursorRay() {
    const g = this.game, m = g.input?.mouse; if (!m || !g.rig?.camera) return null;
    ray.setFromCamera(ndc.set(m.ndcX, m.ndcY), g.rig.camera);
    return ray.ray;
  }
  // The monster under the mouse cursor, if any (combatRules.js cursorTarget).
  cursorPick() {
    const r = this.cursorRay(); if (!r) return null;
    return cursorTarget(r.origin, r.direction, this.game.enemies, this.p.pos);
  }
  // The first solid block the cursor's ray meets: the ground (or the top
  // of a ledge) under the cursor. Null over the sky or a pit.
  cursorGround() {
    const r = this.cursorRay(), w = this.game.world; if (!r || !w) return null;
    const o = r.origin, d = r.direction;
    for (let t = 0; t < 160; t += 0.2) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < -8) return null;
      if (w.solidAt(x, y, z)) { t = Math.max(0, t - 0.2); return new THREE.Vector3(o.x + d.x * t, Math.floor(y) + 1, o.z + d.z * t); }
    }
    return null;
  }
  // Nearest living enemy roughly in the aim direction (falls back to the nearest close one).
  targetInAim(range = 12, cone = 0.45) {
    const g = this.game, p = this.p;
    let best = null, bd = range;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable) continue;
      tmp.subVectors(e.pos, p.pos).setY(0); const d = tmp.length();
      if (d < bd && (d < 1.5 || tmp.normalize().dot(p.aimDir) > cone)) { bd = d; best = e; }
    }
    return best ?? g.nearestEnemy(p.aimPoint, 3.5) ?? g.nearestEnemy(p.pos, 5);
  }
  groundAt(x, z, fromY) { const gy = this.game.world.groundBelow(x, z, fromY); return isFinite(gy) ? gy : null; }
  // Heal every hero (and allied summon) within radius of a point.
  healArea(c, radius, amount, color = 0x6aff9a) {
    const g = this.game; let n = 0;
    for (const t of g.hostileTargets()) {
      if (t.dead || t.downed || t.pos.distanceTo(c) > radius) continue;
      if (t.heal) t.heal(amount); else if (t.hp != null) t.hp = Math.min(t.maxHp ?? t.hp, t.hp + amount);
      g.particles.burst(tmp.copy(t.pos).setY(t.pos.y + 1), { count: 5, color, speed: 1.2, up: 2, life: 0.7, size: 0.16, shape: 1 });
      n++;
    }
    return n;
  }
  powerBolt() {
    const g = this.game, p = this.p, R = RANGED.bolt;
    this.cast(0.3);
    const from = this.handPos();
    const dir = this.shotDir(from); const col = p.rig.look?.accent ?? 0x6ad8ff;
    g.projectiles.fire({ pos: from, vel: dir.multiplyScalar(R.speed), team: 'player', dmg: 9, shape: 'orb', color: col, life: lifeOf(R), light: 3, scale: 0.8,
      trail: (pr) => g.particles.burst(pr.pos, { count: 1, color: col, speed: 0.3, life: 0.25, size: 0.25, sizeEnd: 0.1 }),
      onHit: (e, pr) => { g.combat.damageEnemy(e, 9, p, { knock: pr.vel.clone().setY(0).setLength(R.knock), stagger: 0.2 }); g.fx.hitSpark(pr.pos, null, { color: col }); } });
    g.audio?.whoosh(0.7);
  }
  cursedBlast() { return this.powerBolt(); }
}

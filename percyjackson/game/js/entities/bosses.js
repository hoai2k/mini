// Chapter bosses. Each boss runs attack patterns as coroutines (generator
// functions that yield wait times), picks patterns by phase, and telegraphs
// every big hit with red ground markers.
//   • Alecto (Mrs. Dodds as a Fury, ch1): whip lash, swoop, ring of fire,
//     summons pups and harpies, a screech that slows.
//   • The Minotaur (ch2): telegraphed charges; a charge that hits a tree or a
//     wall leaves him stuck and stunned for 3 s, taking double damage (the
//     myth riddle: make it charge into the pine tree). Horn sweep, stomp,
//     rock throw; chained charges later.
//   • The Chimera: fire breath, lobbed fireballs, rattlesnake tail strike, pounce.
// Bosses honour `mark` (+50% damage taken) and `status.slow`; they shrug off
// fear and root. They never target players with `invisible === true`.
import * as THREE from 'three/webgpu';
import { Skin, Rig, makeCharMaterial, PX, FLASH_MATERIAL } from './character.js';
import { QuadRig, paintQuad } from './quad.js';
import { paintPerson, solidMat } from './mortals.js';
import { addWings, addWhip, goldDust, animateExtras } from './monsters.js';
import { moveEntity } from '../physics.js';
import { damp, dampAngle, angleDiff } from '../util.js';
import { toast } from '../ui/ui.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const solid = solidMat;
const HS = 1.12;
function prop(rig, parent, w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = rig.mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mat);
  m.position.set(x * PX, y * PX, z * PX); m.rotation.set(rx, ry, rz); parent.add(m); return m;
}
function skinMat(seed, painter, emit = 3) {
  const S = new Skin(seed); painter(S);
  const m = makeCharMaterial(S.texture(), { emitStrength: emit, fill: 0.2 }); m.alphaTest = 0.5;
  return m;
}

const BOSSES = {
  alecto: {
    name: 'Alecto', title: 'ALECTO · THE KINDLY ONE', hp: 1400, speed: 3.4, dmg: 16, color: 0xff7a1a, radius: 0.9, height: 3.4, hover: 1.4,
    build() {
      const m = skinMat(501, (S) => paintPerson(S, { skin: 0x7a6a5a, hair: 0x9a9a9e, hairVolume: true, fringe: 2, hairSide: 5, hairBack: 7, eye: 0xff2a0a, eyeWhite: 0xffd84a, scowl: true, wrinkles: 0x4a3a2a, fangs: 0xf4f0e0, grin: true, top: 0x5a1a22, jacket: 0x161618, lapel: 0x2a2a2e, sleeve: 0x6a5a4a, hand: 0x6a5a4a, pants: 0x161618, skirt: 0x161618, skirtLen: 12, shoes: 0x4a3a2a }));
      const rig = new Rig({ material: m, scale: 1.75, bodyW: 7, armW: 3 });
      rig.legR.visible = rig.legL.visible = false;
      const rag = solid(0x161618);
      for (let i = 0; i < 6; i++) prop(rig, rig.hips, 1.8, 7 + (i % 3) * 2, 2, rag, -3.6 + i * 1.45, -3.5 - (i % 3), (i % 2) - 0.5);
      // her grey bun, now wild
      for (const [x, z, rz] of [[0, -3.4, 0], [-2.6, -2, 0.7], [2.6, -2, -0.7]]) prop(rig, rig.head, 3, 4, 3, solid(0x9a9a9e), x * HS, 8.6 * HS, z * HS, 0.4, 0, rz);
      addWings(rig, { span: 20, chord: 11, mat: solid(0x3a2a24), tip: solid(0x2a1c18), kind: 'bat', y: 10.5, flap: 0.8 });
      addWhip(rig, { segs: 9, len: 3.4 });
      rig.hunch = 0.2;
      return rig;
    },
    phases: [['whip_lash', 'swoop', 'whip_lash', 'screech'], ['whip_lash', 'swoop', 'whip_ring', 'summon_pups', 'screech'], ['swoop', 'whip_ring', 'whip_lash', 'summon_pups', 'swoop', 'screech']],
  },
  minotaur: {
    name: 'The Minotaur', title: 'THE MINOTAUR', hp: 2200, speed: 2.6, dmg: 22, color: 0xff2a1a, radius: 1.2, height: 4.6,
    build() {
      const fur = 0x6a4228;
      const m = skinMat(777, (S) => paintPerson(S, { skin: fur, hair: 0x3a2214, fringe: 1, hairSide: 2, hairBack: 3, eye: 0xff2a1a, eyeWhite: 0xff8a3a, scowl: true, brow: 0x2a160c, mouth: false, top: fur, sleeve: fur, hand: 0x4a2c18, pants: fur, skirt: 0xe2dccc, skirtLen: 3, shoes: 0x2a1a10, body: (s) => { s.rect(20, 30, 8, 2, 0xe2dccc, 0.04); s.rect(32, 30, 8, 2, 0xe2dccc, 0.04); s.rect(16, 30, 4, 2, 0xe2dccc, 0.04); s.rect(28, 30, 4, 2, 0xe2dccc, 0.04); s.rect(23, 29, 2, 1, 0xc9963a, 0); for (let i = 0; i < 30; i++) s.px(16 + Math.floor(s.r() * 24), 20 + Math.floor(s.r() * 9), 0x5a3420); } }));
      const rig = new Rig({ material: m, scale: 2.35, bodyW: 11, bodyD: 6, armW: 5, headS: 9, legH: 11 });
      // bull muzzle, nose ring and horns
      const muzzle = prop(rig, rig.head, 6, 4, 3, solid(0x4a2c18), 0, 2.2 * HS, 5.2 * HS);
      prop(rig, muzzle, 1, 1, 0.4, solid(0x120a06), -1.5, 0.6, 1.6); prop(rig, muzzle, 1, 1, 0.4, solid(0x120a06), 1.5, 0.6, 1.6);
      prop(rig, muzzle, 3, 2.4, 0.6, solid(0xc9963a, 0.3, 0.3, 0.8), 0, -1.6, 1.8);
      const horn = solid(0xeadfc4);
      for (const s of [-1, 1]) {
        const h1 = prop(rig, rig.head, 5, 2, 2, horn, s * 6.2 * HS, 6.5 * HS, 0.5 * HS, 0, 0, s * 0.25);
        prop(rig, h1, 2, 4, 1.8, horn, s * 2.2, 2.6, 0, 0, 0, -s * 0.3);
        prop(rig, h1, 1.4, 2.5, 1.4, solid(0x3a3020), s * 2.8, 5.6, 0, 0, 0, -s * 0.5);
      }
      for (const s of [-1, 1]) prop(rig, rig.head, 2.5, 1.5, 1, solid(0x4a2c18), s * 5 * HS, 5 * HS, -1 * HS, 0, 0, s * 0.4);
      rig.extras.muzzle = muzzle;
      rig.hunch = 0.18;
      return rig;
    },
    phases: [['bull_charge', 'horn_sweep', 'rock_throw', 'bull_charge'], ['bull_charge', 'stomp', 'horn_sweep', 'rock_throw', 'bull_charge'], ['bull_charge', 'stomp', 'bull_charge', 'rock_throw', 'horn_sweep']],
  },
  chimera: {
    name: 'The Chimera', title: 'THE CHIMERA · MOTHER OF MONSTERS’ CHILD', hp: 2400, speed: 3, dmg: 20, color: 0xff6a1a, radius: 1.3, height: 3.6,
    build() {
      const m = skinMat(313, (S) => paintQuad(S, { base: 0x8a7a66, dark: 0x5a4c3e, belly: 0xa89a84, back: 0x7a6a58, eye: 0xffc81a, eyeLow: 0xff7a1a, nose: 0x3a2214, teeth: 0xfff4e0, speckles: 50, custom: (s) => { s.box(0, 0, 8, 8, 8, 0xd8a040, 0.12); s.rect(9, 10, 2, 2, 0xffd84a, 0); s.rect(13, 10, 2, 2, 0xffd84a, 0); s.px(10, 11, 0x1a0a00); s.px(13, 11, 0x1a0a00); s.box(32, 0, 4, 4, 4, 0xe0b060, 0.1); s.rect(36, 4, 4, 1, 0x3a2214, 0); s.box(40, 32, 2, 2, 6, 0x5a7a3a, 0.2); for (let x = 40; x < 56; x += 2) s.px(x, 34 + (x % 4 ? 1 : 0), 0xd8c88a); } }), 2.6);
      const rig = new QuadRig({ material: m, scale: 2.5, bodyL: 13, bodyW: 7, bodyH: 7, legH: 7, legW: 3, headS: 7.5, ears: true, tail: 5, tailLen: 12, tailW: 2, tailCurl: 0.25, gait: 0.7 });
      // lion mane
      const mane = solid(0x9a5a1a);
      for (const [x, y, z, w, h] of [[0, 4.5, -0.5, 10, 4], [-4.6, 0, -0.5, 2.4, 9], [4.6, 0, -0.5, 2.4, 9], [0, -4, -0.5, 8, 2.4], [0, 2, -3, 9, 7]]) prop(rig, rig.head, w, h, 3, mane, x, y, z + 2.6);
      // goat head rising from the back, with curling horns
      const goat = new THREE.Group(); goat.position.set(0, 4 * PX, 1 * PX); rig.torso.add(goat);
      prop(rig, goat, 2.6, 5, 2.6, solid(0x6a6058), 0, 2.5, 0, 0.2);
      const gh = prop(rig, goat, 4, 4, 5, solid(0x7a7068), 0, 6, 1.4);
      prop(rig, gh, 0.8, 0.8, 0.4, solid(0xffd84a, 2), -1.3, 0.6, 2.6); prop(rig, gh, 0.8, 0.8, 0.4, solid(0xffd84a, 2), 1.3, 0.6, 2.6);
      for (const s of [-1, 1]) { const h = prop(rig, gh, 1.2, 4, 1.2, solid(0x4a4038), s * 1.5, 3, -1.5, -0.6, 0, s * 0.3); prop(rig, h, 1.2, 1.2, 3, solid(0x4a4038), 0, 2, -1.2); }
      rig.extras.goat = goat;
      // rattlesnake head at the tail tip, and rattle
      const sn = prop(rig, rig.tailTip, 3, 2.4, 4, solid(0x4a6a3a), 0, 0.6, -3.4);
      prop(rig, sn, 0.6, 0.6, 0.4, solid(0xffe04a, 2), -0.9, 0.6, -2); prop(rig, sn, 0.6, 0.6, 0.4, solid(0xffe04a, 2), 0.9, 0.6, -2);
      prop(rig, sn, 0.4, 1.4, 0.4, solid(0xffffff), -0.6, -1.4, -1.6); prop(rig, sn, 0.4, 1.4, 0.4, solid(0xffffff), 0.6, -1.4, -1.6);
      rig.extras.snake = sn;
      return rig;
    },
    phases: [['fire_breath', 'fireballs', 'tail_strike'], ['fire_breath', 'pounce', 'fireballs', 'tail_strike'], ['fire_breath', 'fireballs', 'pounce', 'tail_strike', 'fire_breath']],
  },
};

export const BOSS_IDS = ['alecto', 'minotaur', 'chimera'];
export const BOSS_DEFS = BOSSES;

export class Boss {
  constructor(game, id, pos, level = 1) {
    if (!BOSSES[id]) { console.warn('unknown boss', id, '- using the Minotaur'); id = 'minotaur'; }
    this.game = game; this.id = id; this.B = BOSSES[id];
    this.def = { name: this.B.name, tier: 'boss', knockResist: 0.95, pitch: 0.5 };
    this.displayName = this.B.name;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.knock = new THREE.Vector3();
    this.radius = this.B.radius ?? 1.1; this.height = this.B.height ?? 4.2;
    this.maxHp = this.B.hp * (1 + (level - 1) * 0.45) * (1 + (game.players.length - 1) * 0.6); this.hp = this.maxHp;
    this.dmg = this.B.dmg * (1 + (level - 1) * 0.2);
    this.rig = this.B.build(); this.object = this.rig.root; this.object.position.copy(pos);
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
  }
  get name() { return this.B.name; }
  get title() { return this.B.title; }
  // ---------------------------------------------------------------- damage
  takeDamage(amount, src, o = {}) {
    if (this.dead || this.untargetable || this.intro > 0) return 0;
    const dmg = amount * (this.stunT > 0 ? 2 : 1) * (this.mark > 0 ? 1.5 : 1);
    this.hp -= dmg; this.flashT = 0.08;
    if (o.knock && this.stunT <= 0) this.knock.addScaledVector(o.knock, 0.08);
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
    this.co = this.roar(); this.coWait = 0;
    toast(`PHASE ${n + 1}`, 'big');
    g.audio?.boss();
    g.fx.flash(this.B.color, 0.4, 0.3);
    g.shake(0.7);
  }
  die() {
    const g = this.game;
    this.dead = true; this.deathT = 0; this.co = null; this.stunT = 0;
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
    for (const p of this.game.hostileTargets()) { if (p.dead || p.downed || p.invisible) continue; const d = p.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  hurtPlayers(center, radius, dmg, knockPow = 8, filter = null) {
    for (const p of this.game.hostileTargets()) {
      if (p.dead) continue;
      tmp.subVectors(p.pos, center); const dy = tmp.y; tmp.y = 0;
      if (tmp.length() < radius + (p.radius ?? 0.3) && Math.abs(dy) < 3 && (!filter || filter(p))) p.takeDamage(dmg, this, { knock: tmp.normalize().multiplyScalar(knockPow) });
    }
  }
  // players inside a line from `from` along `dir`
  hurtLine(from, dir, len, half, dmg, knockPow = 8, hit = null) {
    for (const p of this.game.hostileTargets()) {
      if (p.dead || hit?.has(p)) continue;
      tmp.subVectors(p.pos, from); const dy = tmp.y; tmp.y = 0;
      const along = tmp.dot(dir), lat = Math.abs(tmp.x * dir.z - tmp.z * dir.x);
      if (along > -0.5 && along < len && lat < half + (p.radius ?? 0.3) && Math.abs(dy) < 3) { hit?.add(p); p.takeDamage(dmg, this, { knock: dir.clone().multiplyScalar(knockPow) }); }
    }
  }
  ground(p) { const gy = this.game.world.groundBelow(p.x, p.z, p.y + 4); return isFinite(gy) ? gy : p.y; }
  faceTarget(t) { if (t) this.facing = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z); return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)); }
  mouth() { return this.rig.mouthWorld ? this.rig.mouthWorld(new THREE.Vector3()) : this.pos.clone().setY(this.pos.y + this.height * 0.8); }
  // A straight dash along dir (swoop, charge, pounce). Returns 'wall' if a
  // tall obstacle stopped it and stopOnWall is set.
  *dashLine(dir, speed, ticks, dmg, { stopOnWall = false, hitR = 2.2, dust = 0x8a7a6a, trail = null } = {}) {
    const g = this.game, w = g.world, hit = new Set();
    for (let k = 0; k < ticks; k++) {
      this.knock.copy(dir).multiplyScalar(speed);
      for (const p of g.hostileTargets()) { if (!p.dead && !hit.has(p) && p.pos.distanceTo(this.pos) < hitR + (p.radius ?? 0.3)) { hit.add(p); p.takeDamage(dmg, this, { knock: dir.clone().multiplyScalar(13).setY(4) }); } }
      if (dust) g.particles.burst(this.pos, { count: 3, color: dust, additive: false, speed: 2, life: 0.5, size: 0.6, sizeEnd: 1.6 });
      trail?.(k);
      if (stopOnWall) {
        const ax = this.pos.x + dir.x * (this.radius + 0.5), az = this.pos.z + dir.z * (this.radius + 0.5);
        if (w.solidAt(ax, this.pos.y + 1.5, az) && w.solidAt(ax, this.pos.y + 2.5, az)) { this.knock.set(0, 0, 0); this.vel.set(0, 0, 0); return 'wall'; }
      }
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
      const e = g.spawnEnemy(kind, s, { summoned: true, level: g.mission?.def?.difficulty ?? 1 }); if (e) g.fx.summonCircle(s, this.B.color);
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
    this.swooping = true; this.hoverY = 0.3; this.anim = { type: 'attack', t: 0.6, style: 'slam', windup: 0.3, strike: 0.5 };
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
    const R = 9;
    g.markers.spawn({ pos: this.pos, radius: R, dur: 0.9, color: 0xb05aff, follow: this });
    yield 0.9;
    g.fx.shockwave(this.pos, 0xd8a0ff, R); g.fx.screenWave(this.pos, 0.8, 0.5); g.fx.chroma(0.6);
    g.audio?.tone({ freq: 1400, to: 2200, dur: 0.6, gain: 0.1, type: 'sawtooth', filter: 5000 }); g.audio?.tone({ freq: 1500, to: 900, dur: 0.6, gain: 0.07, type: 'square', filter: 4000, at: 0.05 });
    for (const p of g.hostileTargets()) if (!p.dead && p.pos.distanceTo(this.pos) < R) { p.slowT = Math.max(p.slowT ?? 0, 2.5); p.takeDamage(this.dmg * 0.3, this, { knock: tmp.subVectors(p.pos, this.pos).setY(0).normalize().multiplyScalar(5) }); }
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
    toast('His horns are stuck! Strike now!', 'big');
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
    g.markers.spawn({ pos: this.pos, radius: 5.2, dur: 0.7, shape: 'cone', arc: 0.95, facing: this.facing, color: 0xff2a1a, follow: this });
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
    const R = 6.5;
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
    const list = this.B.phases[Math.max(0, Math.min(2, this.phase | 0))];
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
      this.object.scale.setScalar(Math.max(0.01, (1 - this.deathT / 1.8)) * (this.rig.spec.scale ?? 1));
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
    // coroutine
    if (this.intro <= 0) {
      if (this.coWait > 0) this.coWait -= dt;
      else {
        if (!this.co) this.co = this.pickPattern();
        const r = this.co.next();
        if (r.done) { this.co = null; this.coWait = 0.4 + Math.random() * 0.6 - this.phase * 0.15; }
        else this.coWait = r.value ?? 0;
      }
    }
    // movement toward the nearest player
    let move = tmp2.set(0, 0, 0);
    if (t && this.moving && this.intro <= 0 && this.stunT <= 0) {
      tmp.subVectors(t.pos, this.pos).setY(0); const d = tmp.length();
      const slow = (this.status.slow > 0 ? 0.6 : 1) * (this.slowT > 0 ? 0.7 : 1);
      if (d > 3.5) move.copy(tmp.normalize().multiplyScalar(this.B.speed * (1 + this.phase * 0.2) * slow));
      this.facing = dampAngle(this.facing, Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z), 4, dt);
    }
    this.slowT = (this.slowT ?? 0) - dt;
    this.vel.x = damp(this.vel.x, move.x + this.knock.x, 8, dt); this.vel.z = damp(this.vel.z, move.z + this.knock.z, 8, dt);
    if (!this.swooping) this.knock.multiplyScalar(Math.exp(-dt * 5));
    moveEntity(this, g.world, dt);
    if (this.pos.y < -4) { this.pos.copy(this.home); this.vel.set(0, 0, 0); }
    // visuals
    this.visY = this.stepped ? damp(this.visY, this.pos.y, 12, dt) : this.pos.y; if (Math.abs(this.visY - this.pos.y) < 0.01) this.stepped = 0;
    this.hover = damp(this.hover ?? this.hoverY, this.hoverY, this.swooping ? 10 : 3, dt);
    const bob = this.B.hover ? Math.sin(performance.now() * 0.003) * 0.2 : 0;
    this.object.position.set(this.pos.x, this.visY + this.hover + bob + (this.intro > 0 ? -this.intro * 1.2 : 0), this.pos.z);
    this.object.rotation.y = this.facing;
    this.rig.swap(this.flashT > 0 ? FLASH_MATERIAL : null);
    const sp = Math.hypot(this.vel.x, this.vel.z) / this.B.speed;
    const act = this.stunT > 0 ? { type: 'stagger', t: 0 } : this.anim ?? (this.intro > 0 ? { type: 'raise', t: 0 } : null);
    this.rig.animate({ dt, speed: Math.min(1, sp), vel: this.vel, action: act });
    if (this.rig.hunch) this.rig.torso.rotation.x += this.rig.hunch;
    this.rig.tick?.(dt, this);
    this.ambient(dt);
    return true;
  }
  ambient(dt) {
    const g = this.game;
    if (this.stunT > 0 && Math.random() < 0.5) { // dizzy stars
      const a = performance.now() * 0.006 + Math.random() * 6;
      g.particles.glow.emit(this.pos.x + Math.cos(a) * 1.1, this.pos.y + this.height + 0.6, this.pos.z + Math.sin(a) * 1.1, 0, 0.3, 0, 0.5, 2.6, 2.2, 0.6, 0.18, 0, 0, 0.05, 1);
    }
    if (this.id === 'alecto' && this.rig.extras.whipTip && Math.random() < 0.7) { const c = this.rig.extras.whipTip.getWorldPosition(tmp); g.particles.glow.emit(c.x, c.y, c.z, (Math.random() - 0.5), 1 + Math.random(), (Math.random() - 0.5), 0.4, 2.6, 1.1, 0.3, 0.22, -1, 1, 0.05, 0); }
    if (this.id === 'minotaur' && Math.random() < dt * 1.5) { const c = this.rig.extras.muzzle.getWorldPosition(tmp); g.particles.smoke.emit(c.x, c.y, c.z, Math.sin(this.facing) * 1.5, -0.2, Math.cos(this.facing) * 1.5, 0.7, 0.5, 0.5, 0.5, 0.25, -0.5, 2, 1.2, 0); }
    if (this.id === 'chimera' && Math.random() < 0.4) { const c = this.mouth(); g.particles.glow.emit(c.x, c.y, c.z, (Math.random() - 0.5) * 0.5, 0.8 + Math.random(), (Math.random() - 0.5) * 0.5, 0.4, 2.6, 1, 0.2, 0.2, -1, 1, 0.05, 0); }
  }
}

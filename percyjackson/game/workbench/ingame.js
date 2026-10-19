// The model workbench's poses, and the in-game attacks.
//
// HERO_POSES are the workbench's pose buttons: hero-style action objects fed
// straight to rig.animate (heroes and people are animated this way in game).
// poseStep plays one frame of them the way the game would: the hunch and arm
// spread (parts.js rigOffsets) ride on top, and a floating rig (rig.float:
// harpies, keres, drones, ghosts) hangs at its hover height, with the bob
// enemy.js gives it, instead of standing on the floor.
//
// Monsters, champions and bosses are animated differently in game: enemy.js
// and bosses.js drive the rig from the monster's own attack (wind-up, strike,
// recover) and move the body (lunges, charges, pounces, swoops, hover). The
// InGame harness runs that same code: a real Enemy (or Boss) in a small fake
// game (a flat floor at y = 0, a training dummy as the target in front of it,
// and a do-nothing stand-in for audio, particles, markers and the rest), and
// starts the chosen attack over and over. Nothing here re-implements an
// attack: when a monster's attack changes in enemy.js, fodder.js or
// monsters.js, the harness shows the change.
import * as THREE from 'three/webgpu';
import { Enemy } from '../js/entities/enemy.js';
import { Boss, BOSS_DEFS } from '../js/entities/bosses.js';
import { MONSTERS } from '../js/entities/monsters.js';
import { applyChampionLook, CHAMPION_LOOKS } from '../js/entities/champions.js';
import { buildDummy } from '../js/entities/models.js';
import { rigOffsets } from '../js/entities/parts.js';

// (a boss's roar or a skeleton's first fall shows a toast: give it somewhere to go)
if (typeof document !== 'undefined' && !document.getElementById('toast-layer')) { const d = document.createElement('div'); d.id = 'toast-layer'; d.hidden = true; document.body?.append(d); }
const pretty = (s) => String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const ZERO = new THREE.Vector3();

// ------------------------------------------------------------------ hero poses
export const HERO_POSES = {
  idle: { label: 'Idle', speed: 0 },
  walk: { label: 'Walk', speed: 0.45 },
  run: { label: 'Run', speed: 1 },
  attack: { label: 'Attack', period: 1.3, action: (k, c) => ({ type: 'attack', t: k, style: ['swingR', 'swingL', 'punch', 'slam'][c % 4], windup: 0.3, strike: 0.5, step: c }) },
  cast: { label: 'Cast', period: 1.8, action: (k) => ({ type: 'cast', t: Math.min(1, k * 3), both: false }) },
  raise: { label: 'Raise', action: () => ({ type: 'raise', t: 0 }) },
  hit: { label: 'Hit', period: 1.1, action: (k) => ({ type: 'hit', t: Math.min(1, k * 1.6) }) },
  stagger: { label: 'Stagger', action: () => ({ type: 'stagger', t: 0 }) },
  dodge: { label: 'Dodge', period: 1.4, action: (k) => ({ type: 'dodge', t: Math.min(1, k * 1.5) }) },
  death: { label: 'Death', period: 3.2, action: (k) => ({ type: 'death', t: Math.min(1, k * 1.8) }) },
};
// The hero poses a group's models really play in game. Monsters, champions
// and bosses get their attacks from InGame instead; the rest of the hero
// poses are still offered for them, marked as hero styles.
export const MONSTER_GROUPS = new Set(['monsters', 'bosses', 'champions']);
export const GAME_POSES = {
  heroes: Object.keys(HERO_POSES), npcs: ['idle', 'walk', 'run'],
  people: ['idle', 'walk', 'run', 'raise', 'hit'], mortals: ['idle', 'walk', 'run', 'raise', 'hit'],
  monsters: ['idle', 'walk', 'run', 'hit', 'stagger'], champions: ['idle', 'walk', 'run', 'hit', 'stagger'], bosses: ['idle', 'walk', 'run', 'stagger'],
};
// A model built for the viewer (not through Enemy or Boss) gets what those
// would give it: a boss its hover height (bosses.js B.hover).
// (a boss hovers at B.hover and never uses a rig's own float: alecto is built on the fury's floating model)
export function prepStatic(group, id, rig) { if (group === 'bosses') rig.hover = BOSS_DEFS[id]?.hover ?? 0; return rig; }
const fake = { state: 'idle', swooping: false };   // (rig.tick's entity: fodder behaviour skips a rig with no game)
// One frame of a hero pose. st: { t } (seconds into the pose), kept by the caller.
export function poseStep(rig, pose, st, dt) {
  const a = HERO_POSES[pose] ?? HERO_POSES.idle, P = a.period ?? 1;
  st.t += dt;
  const action = a.action ? a.action((st.t % P) / P, Math.floor(st.t / P)) : null;
  rigOffsets(rig, -1);
  rig.animate({ dt, speed: a.speed ?? 0, vel: ZERO, action });
  rigOffsets(rig, 1);
  rig.tick?.(dt, fake);
  // (enemy.js animate: a floating rig's hover height and bob; bosses.js update: a boss's hover)
  rig.root.position.y = rig.hover != null ? (rig.hover ? rig.hover + Math.sin(st.t * 3) * 0.2 : 0) : rig.float ? rig.float + Math.sin(st.t * 2) * 0.15 : 0;
  return action;
}

// ------------------------------------------------------------------ the fake game
// Anything not listed answers with STUB: callable, any property, 0 as a number,
// so fx.groundY() is the floor and particles, audio, markers and lights do nothing.
const STUB = new Proxy(function () {}, {
  get: (o, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : STUB),
  apply: () => STUB, construct: () => STUB,
});
// A flat floor: one layer of stone (block id 1) under y = 0, as far as you like.
const FLAT = {
  sy: 64, platforms: [], roofs: [],
  get: (x, y) => (y === -1 ? 1 : 0),
  solidAt: (x, y) => Math.floor(y) === -1,
  blockAt: (x, y) => (Math.floor(y) === -1 ? 1 : 0),
  groundBelow: (x, z, fromY) => (fromY >= 0 ? 0 : -Infinity),
  liquidAt: () => null,
};
function makeGame(scene, target) {
  const base = {
    world: FLAT, scene, time: 0, frozen: false, mission: null, online: null, biome: null, mist: null, domainSys: null, hud: null,
    players: [target], enemies: [], hostileTargets: () => [target],
    projectiles: { list: [], fire: () => STUB, mat: () => null, geos: {} },
    spawnEnemy: () => null, heroName: () => 'hero',
  };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k] : STUB) });
}
// The target: a training dummy that wobbles when hit (and takes no damage, so no poison or holds).
function makeTarget(visual) {
  const T = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), radius: 0.35, height: 1.8, dead: false, downed: false, invisible: false, untargetable: false, isPlayer: true, iframes: 0, hp: 100, maxHp: 100, status: {}, wob: 0, wobV: 0 };
  T.takeDamage = (dmg, src, o = {}) => { T.wobV += 0.6 + (o.knock ? o.knock.length() * 0.12 : 0.3); T.hits = (T.hits ?? 0) + 1; return 0; };
  if (visual) { try { T.rig = buildDummy(); T.rig.root.rotation.y = Math.PI; } catch (e) { console.warn('workbench: no dummy', e); } }
  T.step = (dt) => {
    T.wobV += (-T.wob * 90 - T.wobV * 7) * dt; T.wob += T.wobV * dt;
    if (!T.rig) return;
    T.rig.root.position.copy(T.pos);
    T.rig.root.rotation.set(T.wob * 0.5, Math.PI, T.wob);
    T.rig.animate({ dt, speed: 0, vel: ZERO });
    T.rig.armR.rotation.z = 1.4; T.rig.armL.rotation.z = -1.4;
  };
  return T;
}

// ------------------------------------------------------------------ the attacks each kind has
const LABEL = { bite: 'Bite', slam: 'Slam', slash: 'Slash', inflate: 'Inflate and burst', spit: 'Shoot', summon: 'Summon', pummel: 'Pummel', pinch: 'Pinch', sting: 'Sting', blink: 'Blink and slash', die: 'Death' };
const CHARGERS = new Set(['colchis_calf', 'boarlet']);
// (named champions fight as the kind their region spawns, which can differ from
// the look's own kind: the Bronze Warden is a dracaena in an automaton's shell,
// world/regions/labyrinth.js)
const CHAMPION_KIND = { lab_bronze_warden: 'dracaena' };
export function kindOf(group, id) {
  if (group === 'monsters') return id;
  if (group === 'champions') return id.startsWith('kind:') ? id.slice(5) : CHAMPION_KIND[id] ?? CHAMPION_LOOKS[id]?.kind;
  return null;
}
// [{ key, label }] for an item, or [] when the game gives it no attacks of its own.
export function inGameVariants(group, id) {
  if (group === 'bosses') {
    const B = BOSS_DEFS[id]; if (!B?.phases) return [];
    const seen = [];
    for (const list of B.phases) for (const p of list) if (!seen.includes(p)) seen.push(p);
    return seen.map((p) => ({ key: `boss:${p}`, label: pretty(p), pattern: p, phase: B.phases.findIndex((l) => l.includes(p)) }));
  }
  const kind = kindOf(group, id), d = MONSTERS[kind];
  if (!d || d.mortal) return [];
  const v = (attack, extra = {}) => ({ key: extra.key ?? attack, label: extra.label ?? LABEL[attack] ?? pretty(attack), attack, ...extra });
  const out = [];
  switch (d.ai) {
    case 'melee':
      if (d.moves) d.moves.forEach((m, i) => out.push(v('bite', { key: `move${i}`, label: `${LABEL[m.kind] ?? pretty(m.kind)}`, moveIx: i, dist: m.trigger })));
      else out.push(v('bite', { label: CHARGERS.has(kind) ? 'Charge' : 'Bite', dist: d.range }));
      break;
    case 'tank': out.push(v('slam', { dist: d.range })); break;
    case 'statue': out.push(v('slash', { dist: d.range })); break;
    case 'blob': out.push(v('inflate', { dist: d.range })); break;
    case 'ranged': if (d.pummel) out.push(v('pummel', { dist: d.pummel.trigger })); out.push(v('spit', { dist: Math.min(d.range, 6) })); break;
    case 'summon': out.push(v('summon', { dist: Math.min(d.range, 6) }), v('spit', { dist: Math.min(d.range, 6) })); break;
    case 'teleport': out.push(v('slash', { dist: d.range }), v('blink', { dist: 6 })); break;
  }
  out.push(v('die', { dist: 2.5 }));
  return out;
}

// ------------------------------------------------------------------ the harness
// new InGame(group, id, key, { visual }) builds the monster (or boss) and its
// target in .group (add it to the scene; the floor is y = 0, the monster
// starts at the origin facing +z). step(dt) plays one frame and returns
// { action, strike } (the action given to rig.animate this frame; strike:
// the attack was released this frame). .rig is the monster's rig.
export class InGame {
  constructor(group, id, key, { visual = true } = {}) {
    const variant = inGameVariants(group, id).find((x) => x.key === key);
    if (!variant) throw new Error(`no in-game attack ${key} for ${id}`);
    this.variant = variant; this.group = new THREE.Group(); this.visual = visual;
    this.target = makeTarget(visual);
    this.game = makeGame(this.group, this.target);
    this.t = 0; this.mode = 'rest'; this.cycle = 0; this.start = new THREE.Vector3();
    if (group === 'bosses') this.makeBoss(id); else this.makeEnemy(group, id);
    if (this.target.rig) this.group.add(this.target.rig.root);
    // the action handed to rig.animate each frame (what the game asked for)
    const rig = this.rig, anim = rig.animate;
    rig.animate = (p) => { this.lastAction = p.action; return anim.call(rig, p); };
    this.target.step(0);
  }
  get rig() { return this.e.rig; }
  get dying() { return !!(this.e.dead || this.e.bones); }   // (sinking into the ground on purpose)
  get object() { return this.e.object; }
  makeEnemy(group, id) {
    const kind = kindOf(group, id), v = this.variant;
    const e = this.e = new Enemy(this.game, kind, this.start, {});
    if (group === 'champions') applyChampionLook(e, id.startsWith('kind:') ? null : id);
    this.baseScale = e.object.scale.x;
    e.spawnT = 0; e.aggro = true; e.awake = true; e.facing = 0; e.cd = 9; e.blinkCd = 9;
    this.game.enemies.push(e);
    this.group.add(e.object);
    this.target.pos.set(0, 0, Math.max(1.2, (v.dist ?? 2) * e.sizeK * 0.9));
  }
  makeBoss(id) {
    const v = this.variant;
    const b = this.e = new Boss(this.game, id, this.start, 1);
    b.intro = 0; b.facing = 0; b.phase = Math.max(0, v.phase);
    // every pattern the boss picks is this one, from where it started
    b.pickPattern = () => { this.reset(); this.cycle++; b.lastPattern = v.pattern; return b[v.pattern](); };
    this.game.enemies.push(b);
    this.group.add(b.object);
    this.target.pos.set(0, 0, Math.max(4.5, (b.B.keep ?? 3.5) + 1.5));
  }
  reset() {
    const e = this.e;
    e.pos.copy(this.start); e.vel.set(0, 0, 0); e.knock.set(0, 0, 0); e.facing = 0; e.visY = this.start.y;
    if (e.isBoss) { e.swooping = false; e.flying = false; e.anim = null; e.moving = true; e.untargetable = false; e.stunT = 0; return; }
    e.lunge = null; e.dashT = 0; e.status.root = 0; e.stagger = 0;
    if (e.dead || e.bones) {
      e.dead = false; e.bones = false; e.regrew = false; e.deathT = 0; e.hp = e.maxHp; e.state = 'idle'; e.stateT = 0;
      e.object.scale.setScalar(this.baseScale);
      e.rig.hips?.rotation.set(0, 0, 0);   // (back on its feet at once: in game a dead monster is gone)
    }
    e.object.position.copy(e.pos);
  }
  // start the chosen attack (enemies; a boss starts its own through pickPattern)
  fire() {
    const e = this.e, v = this.variant;
    this.reset(); this.cycle++;
    e.cd = 0; e.state = 'idle'; e.stateT = 0;
    if (v.attack === 'die') { e.hp = 0; e.die({}); }
    else if (v.attack === 'blink') { e.blink(false); e.startAttack('slash'); }
    else { if (v.moveIx != null) e.moveIx = v.moveIx; e.startAttack(v.attack); }
    this.mode = 'attack'; this.t = 0;
  }
  step(dt) {
    const e = this.e, g = this.game;
    g.time += dt; this.t += dt;
    let strike = false;
    if (e.isBoss) {
      if (this.t > 14 && e.co) { e.co = null; this.t = 0; }   // (a pattern waiting on something the fake game never does: start it again)
      const had = e.co; e.update(dt); if (e.co !== had) this.t = 0;
      strike = false;
    } else {
      if (this.mode === 'rest') { e.status.root = 1; e.cd = 9; e.blinkCd = 9; if (this.t > 0.6 || !this.cycle) this.fire(); }
      const prev = e.state;
      const alive = e.update(dt) !== false;
      if (prev === 'windup' && e.state === 'recover') strike = true;
      if (this.mode === 'attack') {
        const done = e.dead || e.bones ? !alive : this.variant.attack === 'die' ? this.t > 0.8 : e.state !== 'windup' && e.state !== 'recover';
        if (done) { this.mode = 'rest'; this.t = 0; if (e.dead) this.reset(); }
      }
    }
    this.target.step(dt);
    return { action: this.lastAction, strike };
  }
  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose?.(); });
  }
}

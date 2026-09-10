import type { LevelData, Platform, EnemyType } from './levels';
export type AttackKind =
  | 'laser'
  | 'kick'
  | 'stomp'
  | 'launch'
  | /** A shot Hopper parried back; opens armor like a kick but has no arc. */ 'reflect';
export interface CombatPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  gravitySign: number;
  grounded: boolean;
  h?: number;
  w?: number;
}
export interface CombatCallbacks {
  /** kx points away from the attacker. Returns true when the blow was parried. */
  hurt: (
    damage: number,
    kx: number,
    ky: number,
    parryable?: boolean,
  ) => boolean | void;
  effect: (name: string, x: number, y: number, color?: string) => void;
  sound: (name: string) => void;
  bossDefeated?: () => void;
  stomp?: () => void;
  /** A reflected shot has struck a barrier. */
  breakBarrier?: (id: string, damage?: number) => void;
}
export type CombatState = 'idle' | 'telegraph' | 'attack' | 'recover' | 'dead';
export interface EnemyRuntime {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  area: number;
  patrol: number;
  spriteIndex: number;
  facing: number;
  state: CombatState;
  timer: number;
  cooldown: number;
  invulnerable: number;
  telegraph: number;
  glow: number;
  bob: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  alive: boolean;
  asleep: boolean;
  armored: boolean;
  /** Ambush from behind: hidden until Hopper has passed, then it emerges. */
  dormant: boolean;
  ambush?: 'behind' | 'above' | 'under' | 'mirror';
  wake: number;
  /** 0 = lesson pacing; higher tiers quicken tells and cooldowns. */
  tier: number;
  /** Only the agile few leap, vault, overfly or double-dive; most keep it simple. */
  agile: boolean;
  /** Encounter waves: wave n stays hidden until wave n-1 of its group is down. */
  wave: number;
  group: string;
  /** Game time this one fell, and the earliest it may return to the route. */
  deadAt: number;
  reviveAt: number;
  /** Ground enemies leave their shelf for a pounce or a vault. */
  airborne: boolean;
  /** After landing a vault the next attack is always the volley from behind. */
  vaulted: boolean;
  open: number;
  sequence: number;
  attackIds: Set<string>;
}
export interface BossRuntime {
  id: string;
  type: LevelData['boss']['type'];
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  phase: number;
  state: CombatState;
  timer: number;
  telegraph: number;
  glow: number;
  bob: number;
  scaleX: number;
  scaleY: number;
  facing: number;
  active: boolean;
  alive: boolean;
  open: number;
  invulnerable: number;
  sequence: number;
  targetX: number;
  targetY: number;
  attackIds: Set<string>;
  arena: LevelData['boss']['arena'];
  spriteIndex: number;
}
export interface EnemyProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  delay: number;
  gravity: number;
  damage: number;
  type: 'orb' | 'seed' | 'wave' | 'lance' | 'ring';
  color: string;
  owner: string;
  active: boolean;
}
export interface HitResult {
  hits: number;
  kills: number;
  bossHit: boolean;
}
export const ENEMY_ORDER: EnemyType[] = [
  'shadeHound',
  'seedSpitter',
  'windowRay',
  'spireLeech',
  'cragTortoise',
  'riftCondor',
  'furnaceHound',
  'slagCaster',
  'chainManta',
  'ballastCrab',
  'coilWraith',
  'turbineWasp',
  'basaltBurrower',
  'thornChoir',
  'veilMedusa',
  'phaseSkate',
  'mirrorStalker',
  'gravityCantor',
];
const FLYERS = new Set<EnemyType>([
  'windowRay',
  'riftCondor',
  'chainManta',
  'coilWraith',
  'turbineWasp',
  'veilMedusa',
  'phaseSkate',
  'gravityCantor',
]);
const RANGED = new Set<EnemyType>([
  'seedSpitter',
  'spireLeech',
  'slagCaster',
  'chainManta',
  'coilWraith',
  'thornChoir',
  'veilMedusa',
  'gravityCantor',
]);
const ARMORED = new Set<EnemyType>([
  'cragTortoise',
  'slagCaster',
  'ballastCrab',
  'turbineWasp',
]);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const dist = (a: number, b: number) => Math.sqrt(a * a + b * b);
const nullCallbacks: CombatCallbacks = {
  hurt: () => {},
  effect: () => {},
  sound: () => {},
};
/** Feet-based entities; enemy rendering center is (x, y-h/2).
 * Call tryStomp BEFORE update, so a valid stomp resolves before contact damage.
 * time is elapsed game seconds (paused time excluded). update uses dt seconds.
 */
export class CombatWorld {
  enemies: EnemyRuntime[] = [];
  boss: BossRuntime;
  projectiles: EnemyProjectile[] = [];
  private callbacks: CombatCallbacks = nullCallbacks;
  private projectileId = 0;
  private deadBossReported = false;
  level: LevelData;
  brokenBarriers = new Set<string>();
  private groupTime = new Map<string, number>();
  /** Elapsed game seconds, tracked so kills can be timestamped. */
  private time = 0;
  /** A shadow that has just fallen stays down this long, even past a death. */
  static readonly respawnDelay = 15;
  constructor(level: LevelData) {
    this.level = level;
    this.boss = this.makeBoss();
    this.enemies = this.makeEnemies();
  }
  private makeEnemies(): EnemyRuntime[] {
    return this.level.enemies.map((s, i) => {
      const armored = ARMORED.has(s.type),
        flying = FLYERS.has(s.type),
        h = flying ? 76 : armored ? 91 : 65,
        w = armored ? 140 : flying ? 135 : 110;
      const maxHp = armored ? 5 : RANGED.has(s.type) ? 3 : 2;
      return {
        ...s,
        homeX: s.x,
        homeY: s.y,
        vx: 0,
        vy: 0,
        w,
        h,
        hp: maxHp,
        maxHp,
        patrol: s.patrol || 100,
        spriteIndex: ENEMY_ORDER.indexOf(s.type),
        facing: -1,
        state: 'idle',
        timer: 0,
        cooldown: 0.8 + (i % 5) * 0.19,
        invulnerable: 0,
        telegraph: 0,
        glow: 0,
        bob: 0,
        scaleX: 1,
        scaleY: 1,
        visible: true,
        alive: true,
        asleep: true,
        armored,
        dormant:
          s.ambush === 'behind' || s.ambush === 'under' || (s.wave ?? 0) > 0,
        ambush: s.ambush,
        wake: s.wake ?? 230,
        tier: s.tier ?? 0,
        agile: !!s.agile,
        wave: s.wave ?? 0,
        group: s.group ?? s.id,
        airborne: false,
        vaulted: false,
        deadAt: -1e9,
        reviveAt: 0,
        open: 0,
        sequence: 0,
        attackIds: new Set<string>(),
      } as EnemyRuntime;
    });
  }
  private makeBoss(): BossRuntime {
    const s = this.level.boss,
      index =
        s.type === 'nightRook' ? 0 : s.type === 'smelterLeviathan' ? 1 : 2;
    return {
      id: 'boss',
      type: s.type,
      x: s.x,
      y: s.y,
      vx: 0,
      vy: 0,
      w: [440, 650, 320][index],
      h: [250, 230, 430][index],
      hp: 70,
      maxHp: 70,
      phase: 1,
      state: 'idle',
      timer: 1.5,
      telegraph: 0,
      glow: 0,
      bob: 0,
      scaleX: 1,
      scaleY: 1,
      facing: -1,
      active: false,
      alive: true,
      open: 0,
      invulnerable: 0,
      sequence: 0,
      targetX: s.x,
      targetY: s.y,
      attackIds: new Set(),
      arena: { ...s.arena },
      spriteIndex: index,
    };
  }
  reset() {
    this.enemies = this.makeEnemies();
    this.boss = this.makeBoss();
    this.projectiles = [];
    this.deadBossReported = false;
  }
  /** Preserve already-cleared foes behind checkpoint, restore its challenge ahead. */
  /** Returning to a checkpoint restores the route, but a shadow killed moments
   * ago stays down until its delay is up; it then returns offscreen. */
  resetToCheckpoint(x: number) {
    this.groupTime = new Map();
    const previous = new Map(this.enemies.map((e) => [e.id, e]));
    const fresh = this.makeEnemies();
    this.enemies = fresh.map((e) => {
      if (e.x < x - 350)
        return { ...e, hp: 0, alive: false, state: 'dead' as CombatState };
      const was = previous.get(e.id);
      if (
        was &&
        !was.alive &&
        this.time - was.deadAt < CombatWorld.respawnDelay
      )
        return {
          ...e,
          hp: 0,
          alive: false,
          state: 'dead' as CombatState,
          visible: false,
          deadAt: was.deadAt,
          reviveAt: was.deadAt + CombatWorld.respawnDelay,
        };
      return e;
    });
    this.projectiles = [];
    this.boss = this.makeBoss();
    this.deadBossReported = false;
  }
  private shot(
    owner: string,
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: EnemyProjectile['type'] = 'orb',
    radius = 12,
    gravity = 0,
    delay = 0,
  ) {
    this.projectiles.push({
      id: ++this.projectileId,
      owner,
      x,
      y,
      vx,
      vy,
      type,
      radius,
      gravity,
      delay,
      life: 4.5,
      damage: 1,
      color:
        type === 'seed' ? '#ffb873' : type === 'wave' ? '#ff966b' : '#dfb6ff',
      active: delay <= 0,
    });
  }
  private aimed(
    e: { id: string; x: number; y: number; h: number },
    p: CombatPlayer,
    speed = 280,
    offset = 0,
  ) {
    const dx = p.x - e.x,
      dy = p.y - (p.h || 90) * 0.5 * p.gravitySign - (e.y - e.h * 0.55),
      a = Math.atan2(dy, dx) + offset;
    this.shot(
      e.id,
      e.x,
      e.y - e.h * 0.55,
      Math.cos(a) * speed,
      Math.sin(a) * speed,
    );
  }
  update(
    dt: number,
    time: number,
    p: CombatPlayer,
    platforms: Platform[],
    callbacks: CombatCallbacks,
  ) {
    this.callbacks = callbacks;
    this.time = time;
    dt = Math.min(dt, 0.05);
    for (const e of this.enemies) {
      if (!e.alive) {
        // A held-back shadow returns only once its delay is up and Hopper is
        // far enough away that it is never seen appearing.
        if (e.reviveAt && time >= e.reviveAt && Math.abs(e.x - p.x) > 1100) {
          const fresh = this.makeEnemies().find((o) => o.id === e.id);
          if (fresh) Object.assign(e, fresh, { asleep: true });
        }
        continue;
      }
      e.asleep = Math.abs(e.x - p.x) > 2200;
      if (e.asleep) continue;
      if (e.dormant) {
        e.visible = false;
        if (e.wave > 0) {
          // The next wave jumps in once the previous wave of its group is down,
          // or after the group has held Hopper for a while.
          const earlier = this.enemies.filter(
            (o) => o.group === e.group && o.wave < e.wave && o.alive,
          );
          const engaged = this.enemies.some(
            (o) => o.group === e.group && o.wave === 0 && !o.dormant,
          );
          if (engaged && this.groupTime.get(e.group) === undefined)
            this.groupTime.set(e.group, time);
          const held = time - (this.groupTime.get(e.group) ?? time);
          if (
            earlier.every((o) => !o.alive || o.dormant) ||
            held > 7 * e.wave
          ) {
            e.dormant = false;
            e.visible = true;
            e.facing = p.x - e.x < 0 ? -1 : 1;
            e.state = 'idle';
            e.cooldown = 0.35;
            if (!FLYERS.has(e.type)) {
              // Leap in from the wings rather than appearing in place.
              e.airborne = true;
              e.vy = -560;
              e.vx = e.facing * 220;
            }
            callbacks.effect('emerge', e.x, e.y - e.h * 0.5, '#f6c2ff');
            callbacks.sound('enemy');
          } else continue;
        } else if (e.ambush === 'under') {
          // Buried: the ground shivers as Hopper nears, then it surfaces
          // beneath whoever is still standing there.
          if (e.timer > 0) {
            e.timer -= dt;
            if (Math.floor(e.timer * 10) !== Math.floor((e.timer + dt) * 10))
              callbacks.effect('tell', e.x, e.y, '#e0b8a0');
            if (e.timer <= 0) {
              e.dormant = false;
              e.visible = true;
              e.facing = p.x - e.x < 0 ? -1 : 1;
              e.state = 'telegraph';
              e.timer = 0.05;
              e.cooldown = 0;
              callbacks.effect('emerge', e.x, e.y - e.h * 0.5, '#f6c2ff');
              callbacks.sound('enemy');
            } else continue;
          } else if (Math.abs(p.x - e.x) < 210) {
            e.timer = 0.45;
            continue;
          } else continue;
        } else if (p.x - e.x > e.wake) {
          // Stay hidden until Hopper is clearly past, then burst out behind it.
          e.dormant = false;
          e.visible = true;
          e.facing = 1;
          e.state = 'telegraph';
          e.timer = 0.55;
          e.cooldown = 0;
          callbacks.effect('emerge', e.x, e.y - e.h * 0.5, '#f6c2ff');
          callbacks.sound('enemy');
        } else continue;
      }
      e.invulnerable = Math.max(0, e.invulnerable - dt);
      e.open = Math.max(0, e.open - dt);
      e.glow = Math.max(0, e.glow - dt * 3);
      e.cooldown -= dt;
      const flying = FLYERS.has(e.type),
        dx = p.x - e.x,
        near = Math.abs(dx) < 820;
      // Idle motion is a readability aid as much as a flourish: a still black
      // silhouette disappears into a dark stage, a drifting one does not.
      e.bob = flying
        ? Math.sin(time * 2.5 + e.spriteIndex) * 13
        : Math.sin(time * 4 + e.sequence) * 5;
      e.scaleX = 1;
      e.scaleY = 1;
      e.visible =
        !e.dormant &&
        !(e.type === 'phaseSkate' && e.state === 'recover' && e.timer > 0.45);
      if (e.state === 'idle') {
        e.facing = dx < 0 ? -1 : 1;
        if (e.ambush === 'mirror') {
          // Shadow Hopper along the parallel shelf; pounce when it walks below.
          e.x += clamp(dx, -480 * dt, 480 * dt);
          e.vx = 0;
          if (
            Math.abs(dx) < 80 &&
            p.y > e.y + 120 &&
            p.y < e.y + 700 &&
            e.cooldown <= 0
          ) {
            e.state = 'telegraph';
            e.timer = 0.45;
            callbacks.effect('tell', e.x, e.y - e.h, '#ffe0a2');
          }
        } else if (!RANGED.has(e.type) && !flying) {
          e.vx = e.facing * 35;
          e.x += e.vx * dt;
        }
        if (e.ambush !== 'mirror' && near && e.cooldown <= 0) {
          e.state = 'telegraph';
          e.timer = this.tellTime(e);
          e.vx = 0;
          callbacks.effect('tell', e.x, e.y - e.h, '#ffe0a2');
        }
      } else if (e.state === 'telegraph') {
        e.timer -= dt;
        e.telegraph = 1 - e.timer / this.tellTime(e);
        e.scaleY = 0.84;
        e.scaleX = 1.1;
        if (e.timer <= 0) {
          this.startEnemyAttack(e, p);
          e.telegraph = 0;
        }
      } else if (e.state === 'attack') {
        e.timer -= dt;
        if (!e.airborne) {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        }
        if (e.timer <= 0 && !e.airborne) {
          e.vx = 0;
          e.vy = 0;
          if (e.vaulted && FLYERS.has(e.type)) {
            e.facing = dx < 0 ? -1 : 1;
            e.state = 'telegraph';
            e.timer = 0.28;
            callbacks.effect('tell', e.x, e.y - e.h, '#ffe0a2');
          } else {
            e.state = 'recover';
            e.timer = e.armored ? 1.35 : 0.8;
            e.open = e.timer;
          }
        }
      } else if (e.state === 'recover') {
        e.timer -= dt;
        if (!e.airborne) e.y += (e.homeY - e.y) * Math.min(1, dt * 5);
        if (e.timer <= 0) {
          e.state = 'idle';
          e.cooldown =
            (0.7 + (e.sequence % 3) * 0.25) * (e.tier >= 3 ? 0.6 : 1);
          // Agile divers come straight back around for a second pass.
          if (flying && !RANGED.has(e.type) && e.agile && e.sequence % 2 === 1)
            e.cooldown = 0.2;
        }
      }
      if (e.airborne) {
        // A leaping ground enemy is a real body in the air: it arcs under
        // gravity and lands back on its own shelf, where a vault turns into a
        // volley at Hopper's back.
        e.vy += 1900 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.vy > 0 && e.y >= e.homeY) {
          e.y = e.homeY;
          e.airborne = false;
          e.vy = 0;
          e.vx = 0;
          callbacks.effect('stomp', e.x, e.y, '#d8c3ff');
          if (e.vaulted) {
            e.facing = p.x - e.x < 0 ? -1 : 1;
            e.state = 'telegraph';
            e.timer = 0.28;
            callbacks.effect('tell', e.x, e.y - e.h, '#ffe0a2');
          } else {
            e.state = 'recover';
            e.timer = 0.55;
            e.open = 0.55;
          }
        }
      }
      if (!flying) {
        const support = platforms.find(
          (q) =>
            !q.ceiling &&
            q.routeRole !== 'optional' &&
            Math.abs(q.y - e.homeY) < 2 &&
            e.homeX >= q.x &&
            e.homeX <= q.x + q.w,
        );
        if (support) {
          e.x = clamp(
            e.x,
            support.x + e.w * 0.45,
            support.x + support.w - e.w * 0.45,
          );
          // A pouncing mirror stalker or a leaping enemy leaves its shelf.
          if (!(e.ambush === 'mirror' && e.state !== 'idle') && !e.airborne)
            e.y = support.y;
        } else if (!e.airborne)
          e.x = clamp(e.x, e.homeX - e.patrol, e.homeX + e.patrol);
      } else if (e.state !== 'attack' && !e.vaulted) {
        // Flyers drift back toward home rather than snapping, so an overfly
        // that ends on Hopper's far side is allowed to fire from there first.
        e.x +=
          (clamp(e.x, e.homeX - 260, e.homeX + 260) - e.x) *
          Math.min(1, dt * 3);
      }
      if (
        e.visible &&
        e.invulnerable <= 0 &&
        Math.abs(dx) < (e.w + (p.w || 110)) * 0.44 &&
        Math.abs(p.y - (p.h || 90) * 0.5 * p.gravitySign - (e.y - e.h * 0.5)) <
          ((p.h || 90) + e.h) * 0.4
      ) {
        if (callbacks.hurt(1, e.facing * 360, -240 * p.gravitySign)) {
          this.stagger(e, 1.3);
          e.x -= e.facing * 60;
        }
      }
    }
    this.updateBoss(dt, time, p, callbacks);
    for (const b of this.projectiles) {
      b.life -= dt;
      if (b.delay > 0) {
        b.delay -= dt;
        b.active = b.delay <= 0;
        continue;
      }
      b.vy += b.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.owner === 'player') {
        // A parried shot flies back and lands as a kick on whatever it meets,
        // and it takes a signal cage down in a few hits.
        const bar = (this.level.barriers || []).find(
          (q) =>
            !this.brokenBarriers.has(q.id) &&
            b.x > q.x - b.radius &&
            b.x < q.x + q.w + b.radius &&
            b.y > q.y - b.radius &&
            b.y < q.y + q.h + b.radius,
        );
        if (bar) {
          // A turned-back shot still hits hardest, but it is no longer the only
          // thing that opens a cage: the engine counts the damage.
          callbacks.breakBarrier?.(bar.id, 4);
          b.life = 0;
          callbacks.effect('spark', b.x, b.y, '#b6fbff');
          continue;
        }
        const r = this.hit(b.x, b.y, b.radius + 26, 2, 'reflect');
        if (r.hits) {
          b.life = 0;
          callbacks.effect('spark', b.x, b.y, b.color);
        }
      } else if (
        Math.abs(b.x - p.x) < (p.w || 110) * 0.5 + b.radius &&
        Math.abs(b.y - (p.y - (p.h || 90) * 0.5 * p.gravitySign)) <
          (p.h || 90) * 0.5 + b.radius
      ) {
        // A parried shot is turned rather than absorbed.
        if (
          callbacks.hurt(b.damage, Math.sign(b.vx) * 270, -180 * p.gravitySign)
        ) {
          this.reflect(b, p);
        } else {
          b.life = 0;
          callbacks.effect('spark', b.x, b.y, b.color);
        }
      }
      // Low waves travel along their lane; ordinary projectiles stop at solid art.
      if (
        b.type !== 'wave' &&
        platforms.some(
          (q) =>
            !q.ceiling &&
            b.x > q.x &&
            b.x < q.x + q.w &&
            b.y > q.y + 4 &&
            b.y < q.y + q.h,
        )
      )
        b.life = 0;
    }
    this.projectiles = this.projectiles.filter(
      (b) => b.life > 0 && Math.abs(b.x - p.x) < 2500,
    );
  }
  private tellTime(e: EnemyRuntime) {
    return (
      (e.state === 'telegraph' && e.timer < 0.3 && e.vaulted ? 0.28 : 0.65) *
        (e.tier >= 3 ? 0.78 : e.tier >= 2 ? 0.9 : 1) +
      (e.armored ? 0.2 : 0)
    );
  }
  /** Ground leap: a pounce onto Hopper, or a vault clean over it to land behind. */
  private leap(e: EnemyRuntime, p: CombatPlayer, over: boolean) {
    const dx = p.x - e.x,
      dir = dx < 0 ? -1 : 1;
    e.airborne = true;
    e.facing = dir;
    if (over) {
      // Land about 220 units past Hopper on an 0.8 s arc.
      const air = 0.8,
        landing = clamp(Math.abs(dx) + 220, 260, 900);
      e.vx = (dir * landing) / air;
      e.vy = -1900 * air * 0.5;
      e.vaulted = true;
    } else {
      e.vx = dir * clamp(Math.abs(dx) * 1.3, 260, 520);
      e.vy = -640;
      e.vaulted = false;
    }
    e.timer = 2;
  }
  private startEnemyAttack(e: EnemyRuntime, p: CombatPlayer) {
    e.state = 'attack';
    e.timer = 0.48;
    e.sequence++;
    e.vx = 0;
    e.vy = 0;
    this.callbacks.sound('enemy');
    const dx = p.x - e.x,
      flying = FLYERS.has(e.type);
    // Only agile spawns use the movement techniques, every other attack:
    // hounds pounce, ground shooters vault over Hopper and fire from behind,
    // shooting flyers overfly to Hopper's blind side, armored shells hop.
    if (e.agile && !e.vaulted && e.ambush !== 'mirror') {
      const alternate = e.sequence % 2 === 1;
      if (
        !flying &&
        !RANGED.has(e.type) &&
        !e.armored &&
        e.type !== 'basaltBurrower' &&
        alternate
      ) {
        this.leap(e, p, false);
        return;
      }
      if (
        !flying &&
        RANGED.has(e.type) &&
        alternate &&
        Math.abs(dx) < 420 &&
        Math.abs(p.y - e.y) < 60
      ) {
        this.leap(e, p, true);
        return;
      }
      if (e.armored && !flying && alternate) {
        e.airborne = true;
        e.vx = (dx < 0 ? -1 : 1) * 210;
        e.vy = -470;
        e.timer = 2;
        e.open = 0;
        return;
      }
      if (flying && RANGED.has(e.type) && alternate) {
        // Overfly: cross to Hopper's far side, then the volley comes next.
        const side = e.x < p.x ? 1 : -1,
          tx = p.x + side * 300,
          ty = p.y - (p.h || 90) * 0.5 * p.gravitySign - 240,
          ddx = tx - e.x,
          ddy = ty - e.y,
          len = Math.max(1, dist(ddx, ddy)),
          speed = 560;
        e.vx = (ddx / len) * speed;
        e.vy = (ddy / len) * speed;
        e.timer = Math.min(0.9, len / speed);
        e.vaulted = true;
        return;
      }
    }
    if (e.vaulted) {
      // The shot from behind: same volley as the species' ordinary attack.
      e.vaulted = false;
      e.open = 0;
    }
    switch (e.type) {
      case 'shadeHound':
        e.vx = e.facing * 380;
        e.timer = 0.5;
        break;
      case 'furnaceHound':
        e.vx = e.facing * 490;
        e.timer = 0.6;
        break;
      case 'mirrorStalker':
        if (e.ambush === 'mirror') {
          e.vx = 0;
          e.vy = 640;
          e.timer = 0.6;
          break;
        }
        e.vx = e.facing * 420;
        e.timer = 0.55;
        this.aimed(e, p, 180);
        break;
      case 'seedSpitter':
        for (const a of [-0.18, 0, 0.18]) this.aimed(e, p, 230, a);
        break;
      case 'slagCaster':
        for (const n of [-1, 1])
          this.shot(
            e.id,
            e.x,
            e.y - e.h,
            e.facing * (230 + n * 40),
            -290,
            'seed',
            15,
            440,
          );
        e.open = 1.6;
        break;
      case 'spireLeech':
        this.aimed(e, p, 520);
        e.timer = 0.22;
        break;
      case 'coilWraith':
        for (const a of [-0.07, 0.07]) this.aimed(e, p, 470, a);
        e.open = 1.8;
        break;
      case 'thornChoir':
        for (const a of [-0.34, -0.17, 0, 0.17, 0.34]) this.aimed(e, p, 240, a);
        break;
      case 'chainManta':
        this.aimed(e, p, 210);
        this.shot(e.id, p.x, p.y - 330, 0, 230, 'lance', 13, 0, 0.45);
        break;
      case 'veilMedusa':
        for (let n = 0; n < 6; n++) {
          const a = (n * Math.PI) / 3;
          this.shot(
            e.id,
            e.x,
            e.y - e.h * 0.5,
            Math.cos(a) * 180,
            Math.sin(a) * 180,
            'orb',
            10,
          );
        }
        break;
      case 'gravityCantor':
        for (const n of [-1, 1])
          this.shot(
            e.id,
            e.x + n * 70,
            e.y - 40,
            n * 95,
            150,
            'ring',
            19,
            40,
            0.25,
          );
        break;
      case 'cragTortoise':
        e.vx = e.facing * 150;
        e.open = 1.1;
        e.timer = 0.8;
        break;
      case 'ballastCrab':
        for (const n of [-1, 1])
          this.shot(e.id, e.x, e.y - 17, n * 310, 0, 'wave', 17);
        e.open = 1.6;
        break;
      case 'basaltBurrower':
        e.scaleY = 1.25;
        e.open = 1.5;
        this.shot(
          e.id,
          e.x + e.facing * 120,
          e.y - 20,
          0,
          -260,
          'seed',
          13,
          500,
        );
        break;
      case 'windowRay':
      case 'riftCondor':
      case 'turbineWasp':
      case 'phaseSkate': {
        const dx = p.x - e.x,
          dy = p.y - (p.h || 90) * 0.5 * p.gravitySign - (e.y - e.h * 0.5),
          len = Math.max(1, dist(dx, dy));
        const speed =
          e.type === 'turbineWasp' ? 510 : e.type === 'phaseSkate' ? 470 : 390;
        e.vx = (dx / len) * speed;
        e.vy = (dy / len) * speed;
        e.timer = Math.min(0.85, len / speed);
        break;
      }
    }
  }
  private updateBoss(
    dt: number,
    time: number,
    p: CombatPlayer,
    cb: CombatCallbacks,
  ) {
    const b = this.boss;
    if (!b.alive) return;
    if (!b.active) {
      if (p.x < b.arena.x + 50) return;
      b.active = true;
      b.state = 'telegraph';
      b.timer = 1.7;
      cb.effect('boss', b.x, b.y - b.h * 0.5, '#f0b5ff');
    }
    b.invulnerable = Math.max(0, b.invulnerable - dt);
    b.open = Math.max(0, b.open - dt);
    b.glow = Math.max(0, b.glow - dt * 2);
    b.bob = Math.sin(time * 1.7) * 12;
    b.facing = p.x < b.x ? -1 : 1;
    b.scaleX = 1;
    b.scaleY = 1;
    const phase = b.hp > (b.maxHp * 2) / 3 ? 1 : b.hp > b.maxHp / 3 ? 2 : 3;
    if (phase !== b.phase) {
      b.phase = phase;
      b.state = 'telegraph';
      b.timer = 1.7;
      b.open = 0;
      this.projectiles = [];
      cb.effect('phase', b.x, b.y - b.h * 0.5, '#ffe5b8');
      cb.sound('boss');
    }
    b.timer -= dt;
    if (b.state === 'telegraph') {
      b.telegraph = clamp(1 - b.timer / (b.sequence === 0 ? 1.7 : 1.2), 0, 1);
      b.scaleX = 1.03;
      b.scaleY = 0.95;
      if (b.timer <= 0) {
        b.targetX = p.x;
        b.targetY = p.y - (p.h || 90) * 0.5 * p.gravitySign;
        b.state = 'attack';
        b.telegraph = 0;
        this.startBossAttack(p);
      }
    } else if (b.state === 'attack') {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.x = clamp(b.x, b.arena.x + 360, b.arena.x + b.arena.w - 340);
      b.y = clamp(b.y, b.arena.y - 600, b.arena.y);
      if (b.timer <= 0) {
        b.state = 'recover';
        b.timer = 1.5;
        b.open = 1.5;
        b.vx = 0;
        b.vy = 0;
        cb.effect('core', b.x, b.y - b.h * 0.55, '#fff1c5');
      }
    } else if (b.state === 'recover') {
      if (b.timer <= 0) {
        b.state = 'telegraph';
        b.timer = 1.2;
        b.sequence++;
      }
    }
    if (b.open > 0) b.glow = Math.max(b.glow, 0.45 + Math.sin(time * 9) * 0.15);
    if (
      b.invulnerable <= 0 &&
      Math.abs(p.x - b.x) < (b.w + (p.w || 110)) * 0.35 &&
      Math.abs(p.y - (p.h || 90) * 0.5 * p.gravitySign - (b.y - b.h * 0.5)) <
        (b.h + (p.h || 90)) * 0.35
    )
      if (cb.hurt(2, b.facing * 420, -280 * p.gravitySign)) {
        b.state = 'recover';
        b.timer = 1.6;
        b.open = 1.6;
        b.vx = 0;
        b.vy = 0;
        cb.effect('core', b.x, b.y - b.h * 0.55, '#fff1c5');
      }
  }
  /** A parried enemy drops its guard and stands open for a moment. */
  private stagger(e: EnemyRuntime, seconds: number) {
    e.state = 'recover';
    e.timer = seconds;
    e.open = seconds;
    e.vx = 0;
    e.vy = 0;
    e.invulnerable = 0;
    e.glow = 1;
    this.callbacks.effect('guard', e.x, e.y - e.h, '#b6fbff');
  }
  /** Turn an incoming shot into Hopper's own, aimed back at whoever fired it. */
  reflect(b: EnemyProjectile, p: CombatPlayer) {
    const owner =
      this.enemies.find((e) => e.id === b.owner && e.alive) ||
      (b.owner === 'boss' && this.boss.alive ? this.boss : null);
    const speed = Math.max(560, dist(b.vx, b.vy) * 1.4);
    if (owner) {
      const dx = owner.x - b.x,
        dy = owner.y - owner.h * 0.5 - b.y,
        len = Math.max(1, dist(dx, dy));
      b.vx = (dx / len) * speed;
      b.vy = (dy / len) * speed;
    } else {
      b.vx = p.facing * speed;
      b.vy = -90;
    }
    b.owner = 'player';
    b.gravity = 0;
    b.delay = 0;
    b.active = true;
    b.life = 2.2;
    b.color = '#c9ffe5';
  }
  private startBossAttack(p: CombatPlayer) {
    const b = this.boss,
      phase = b.phase,
      pattern = b.sequence % 3;
    b.vx = 0;
    b.vy = 0;
    b.timer = 0.9;
    this.callbacks.sound('boss');
    if (b.type === 'nightRook') {
      if (pattern === 0) {
        const dx = b.targetX - b.x,
          dy = b.targetY - (b.y - b.h * 0.5),
          len = Math.max(1, dist(dx, dy));
        b.vx = (dx / len) * (500 + phase * 55);
        b.vy = (dy / len) * 340;
        b.timer = 0.9;
      } else if (pattern === 1) {
        for (let n = 0; n < 5 + phase; n++)
          this.aimed(b, p, 270, (n - (4 + phase) / 2) * 0.14);
        b.y = b.arena.y;
        b.timer = 0.55;
      } else {
        b.y = b.arena.y;
        for (const n of [-1, 1])
          this.shot('boss', b.x, b.arena.y - 23, n * 340, 0, 'wave', 23);
        b.open = 1.9;
        b.timer = 0.65;
      }
    } else if (b.type === 'smelterLeviathan') {
      b.y = b.arena.y;
      if (pattern === 0) {
        for (const n of [-1, 1])
          this.shot(
            'boss',
            b.x,
            b.y - 26,
            n * (300 + phase * 40),
            0,
            'wave',
            26,
          );
        b.timer = 0.75;
      } else if (pattern === 1) {
        for (let n = 0; n < 5; n++)
          this.aimed(b, p, 260 + n * 32, (n - 2) * 0.09);
        b.timer = 0.65;
      } else {
        for (let n = 0; n < 3 + phase; n++)
          this.shot(
            'boss',
            b.arena.x + 420 + n * 360,
            b.arena.y - 650,
            0,
            310,
            'lance',
            17,
            0,
            n * 0.13,
          );
        b.timer = 1.15;
      }
    } else {
      b.y = b.arena.y - 70;
      if (pattern === 0) {
        for (const n of [-1, 1])
          this.shot(
            'boss',
            b.x,
            b.arena.y - 28,
            n * (240 + phase * 35),
            0,
            'ring',
            28,
          );
        b.timer = 0.8;
      } else if (pattern === 1) {
        for (let n = 0; n < 3 + phase; n++)
          this.shot(
            'boss',
            b.targetX + (n - 2) * 170,
            b.arena.y - 720,
            0,
            330,
            'lance',
            16,
            0,
            0.25 + n * 0.12,
          );
        b.timer = 1.1;
      } else {
        for (let n = 0; n < 7; n++) {
          if (n === 3) continue;
          const a = Math.PI * 0.15 + n * Math.PI * 0.115;
          this.shot(
            'boss',
            b.x,
            b.y - b.h * 0.5,
            Math.cos(a) * 250,
            Math.sin(a) * 250,
            'orb',
            15,
          );
        }
        b.open = 1.9;
        b.timer = 0.85;
      }
    }
  }
  /** Circle centered on rendered hurt region. launch only hits behind facing.
   * attackId, when supplied, enforces once per swing for its entire lifetime.
   * Returns counts for hit stop, score and controller rumble.
   */
  hit(
    x: number,
    y: number,
    radius: number,
    damage: number,
    kind: AttackKind,
    facing = 1,
    attackId?: string,
  ): HitResult {
    const result: HitResult = { hits: 0, kills: 0, bossHit: false };
    for (const e of this.enemies) {
      if (
        !e.alive ||
        !e.visible ||
        e.invulnerable > 0 ||
        (attackId && e.attackIds.has(attackId))
      )
        continue;
      // The takeoff strike and the spin kick both reach behind Hopper only.
      if (
        (kind === 'launch' || kind === 'kick') &&
        (e.x - x) * facing > e.w * 0.2
      )
        continue;
      if (
        dist(e.x - x, e.y - e.h * 0.5 - y) >
        radius + Math.min(e.w, e.h) * 0.42
      )
        continue;
      if (
        kind === 'stomp' &&
        (e.type === 'cragTortoise' || (e.armored && e.open <= 0))
      ) {
        this.callbacks.effect('guard', e.x, e.y - e.h, '#ffe2a8');
        continue;
      }
      const guarded = e.armored && e.open <= 0 && kind === 'laser';
      const dealt = guarded ? Math.max(0.25, damage * 0.3) : damage;
      if (kind === 'kick' || kind === 'reflect') e.open = 1.5;
      e.hp -= dealt;
      e.invulnerable = 0.15;
      e.glow = 1;
      if (attackId) e.attackIds.add(attackId);
      result.hits++;
      this.callbacks.effect(
        'hit',
        e.x,
        e.y - e.h * 0.5,
        guarded ? '#dcb48a' : '#d8c3ff',
      );
      if (e.hp <= 0) {
        e.alive = false;
        e.state = 'dead';
        e.deadAt = this.time;
        result.kills++;
        this.callbacks.effect('explosion', e.x, e.y - e.h * 0.5, '#dab9ff');
        this.callbacks.sound('burst');
      }
    }
    const b = this.boss;
    if (
      b.active &&
      b.alive &&
      b.invulnerable <= 0 &&
      !(attackId && b.attackIds.has(attackId)) &&
      dist(b.x - x, b.y - b.h * 0.52 - y) <
        radius + Math.min(b.w, b.h) * 0.48 &&
      !(kind === 'launch' && (b.x - x) * facing > b.w * 0.2)
    ) {
      if (kind === 'stomp' && b.open <= 0) {
        this.callbacks.effect('guard', b.x, b.y - b.h, '#ffd5ac');
        return result;
      }
      b.hp -= damage * (b.open > 0 ? 1 : kind === 'laser' ? 0.3 : 0.65);
      b.invulnerable = 0.15;
      b.glow = 1;
      if (kind === 'kick' || kind === 'reflect' || kind === 'stomp')
        b.open = Math.max(b.open, 1.2);
      if (attackId) b.attackIds.add(attackId);
      result.hits++;
      result.bossHit = true;
      this.callbacks.effect('hit', b.x, b.y - b.h * 0.52, '#fff0bc');
      if (b.hp <= 0) {
        b.hp = 0;
        b.alive = false;
        b.state = 'dead';
        this.projectiles = [];
        this.callbacks.effect('bossExplosion', b.x, b.y - b.h * 0.5, '#ebc9ff');
        this.callbacks.sound('victory');
        if (!this.deadBossReported) {
          this.deadBossReported = true;
          this.callbacks.bossDefeated?.();
        }
      }
    }
    return result;
  }
  tryStomp(
    p: CombatPlayer,
    previousFeetY: number,
    holdJump: boolean,
    callbacks: CombatCallbacks,
  ): boolean {
    this.callbacks = callbacks;
    if (p.vy * p.gravitySign < 80) return false;
    const candidates = [
      ...this.enemies.filter((e) => e.alive && !e.asleep && e.visible),
      ...(this.boss.active && this.boss.alive ? [this.boss] : []),
    ];
    for (const e of candidates) {
      if (
        e.invulnerable > 0 ||
        Math.abs(p.x - e.x) > (e.w + (p.w || 110)) * 0.43
      )
        continue;
      const surface = p.gravitySign > 0 ? e.y - e.h : e.y;
      const crossing =
        p.gravitySign > 0
          ? previousFeetY <= surface + 8 && p.y >= surface
          : previousFeetY >= surface - 8 && p.y <= surface;
      if (!crossing) continue;
      if (
        e.id === 'boss'
          ? e.open <= 0
          : (e as EnemyRuntime).type === 'cragTortoise' ||
            ((e as EnemyRuntime).armored && e.open <= 0)
      )
        continue;
      const r = this.hit(e.x, e.y - e.h * 0.5, 12, 5, 'stomp', p.facing);
      if (r.hits) {
        p.y = surface;
        p.vy = -(holdJump ? 820 : 520) * p.gravitySign;
        p.grounded = false;
        callbacks.effect('stomp', p.x, surface, '#fff2bc');
        callbacks.sound('stomp');
        callbacks.stomp?.();
        return true;
      }
    }
    return false;
  }
}

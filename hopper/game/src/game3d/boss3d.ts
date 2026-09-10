/** The Night Rook: the mission-one commander at the summit transmitter.
 * Pure simulation like the shadows. Three phases by health: sweeps from its
 * perches with a marked corridor, a landed channel through its wing joints,
 * then an airborne finale with summoned condors. Its back is a landing.
 */
import type { World } from './world';
import { MOVE, type HopperState } from './controller';
import type { Combat, CombatCallbacks, Shadow } from './combat3d';
import type { ShadowKind } from './district';
import type { BossSpec } from './district';

export type RookState = 'sleep' | 'perch' | 'mark' | 'sweep' | 'climb' | 'fan' | 'land' | 'channel' | 'burst' | 'summon' | 'dead';

export interface RookRuntime {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  state: RookState;
  timer: number;
  telegraph: number;
  /** Seconds the core stays open. */
  open: number;
  hitFlash: number;
  alive: boolean;
  active: boolean;
  wingSpread: number;
  /** The marked corridor for a sweep. */
  markFrom: [number, number, number];
  markTo: [number, number, number];
  perchIndex: number;
  cycles: number;
  summoned: string[];
  radius: number;
  height: number;
  /** Ids Hopper's current kick has already struck. */
  kickHit: boolean;
  laserHits: Set<number>;
}

export const ROOK = {
  hp: 120,
  sweepSpeed: 70,
  sweepSpeedLate: 88,
  markTime: 1.2,
  climbTime: 1.6,
  fanCount: 7,
  channelTime: 4.2,
  contactDamage: 2,
};

export class NightRook {
  rook: RookRuntime;
  /** The three places it hangs between attacks; the tests read them. */
  readonly perches: [number, number, number][];
  private centre: [number, number, number];
  constructor(readonly spec: BossSpec, readonly world: World) {
    const ground = world.heightAt(spec.x, spec.z);
    this.centre = [spec.x, ground + spec.y, spec.z];
    // The mast top and two points over the arena's rim.
    // Perches Hopper can actually reach: a held jump peaks at 88 m, so the
    // commander hangs inside that, not two hundred metres over the arena.
    this.perches = [
      [spec.x, ground + 96, spec.z],
      [spec.x + spec.r * 0.55, ground + 56, spec.z + spec.r * 0.3],
      [spec.x - spec.r * 0.5, ground + 70, spec.z - spec.r * 0.35],
    ];
    this.rook = {
      x: this.perches[0][0], y: this.perches[0][1], z: this.perches[0][2], vx: 0, vy: 0, vz: 0, yaw: Math.PI, hp: ROOK.hp, maxHp: ROOK.hp, phase: 1, state: 'sleep', timer: 0, telegraph: 0, open: 0, hitFlash: 0, alive: true, active: false, wingSpread: 0.3, markFrom: [0, 0, 0], markTo: [0, 0, 0], perchIndex: 0, cycles: 0, summoned: [], radius: 9, height: 16, kickHit: false, laserHits: new Set(),
    };
  }
  /** The commander as an aim target: one object, kept in step with the
   * runtime, that the lasers and the lock-on can choose. It is never one of
   * the district's shadows. */
  target(): Shadow {
    const r = this.rook;
    const t = (this.aimTarget ||= {
      id: 'boss', kind: 'riftCondor' as ShadowKind, x: r.x, y: r.y, z: r.z, vx: 0, vy: 0, vz: 0, yaw: 0, hp: r.hp, maxHp: r.maxHp, state: 'idle', timer: 0, cooldown: 0, alive: true, dormant: false, group: 'boss', wave: 0, homeX: r.x, homeY: r.y, homeZ: r.z, flying: true, rooted: false, armored: false, radius: r.radius, height: r.height, size: 1, held: false, entry: undefined, delay: -1, arrive: 1, perch: [r.x, r.y, r.z], open: 0, hitFlash: 0, telegraph: 0, deadAt: -1e9, patrol: 0, phase: 0, scale: 1, grounded: false, spawnFlash: 0, beamX: r.x, beamY: r.y, beamZ: r.z,
    } satisfies Shadow);
    t.x = r.x;
    t.y = r.y;
    t.z = r.z;
    t.hp = r.hp;
    t.maxHp = r.maxHp;
    t.alive = r.alive;
    t.open = r.open;
    t.radius = r.radius;
    t.height = r.height;
    return t;
  }
  private aimTarget: Shadow | null = null;
  /** Wake when Hopper enters the arena. */
  wake(cb: CombatCallbacks) {
    const r = this.rook;
    if (r.active || !r.alive) return;
    r.active = true;
    r.state = 'perch';
    r.timer = 2.0;
    cb.sound('boss');
  }
  tell(): string {
    const r = this.rook;
    switch (r.state) {
      case 'mark':
        return 'CORRIDOR MARKED · leave the line';
      case 'sweep':
        return 'SWEEP · jump it and strike the back';
      case 'fan':
        return 'FEATHER FAN · find the gap';
      case 'channel':
        return 'CHANNELLING · kick the wing joints';
      case 'burst':
        return 'SHOCK RING · jump';
      case 'summon':
        return 'CONDORS · bounce off them to reach it';
      default:
        return r.open > 0 ? 'CORE EXPOSED · strike now' : 'Read the shadow. Find your opening.';
    }
  }
  private damage(amount: number, cb: CombatCallbacks) {
    const r = this.rook;
    if (!r.alive) return;
    r.hp -= amount;
    r.hitFlash = 0.2;
    cb.effect('hit', r.x, r.y + r.height * 0.5, r.z);
    cb.sound('hit');
    const frac = r.hp / r.maxHp;
    if (frac <= 0) {
      r.alive = false;
      r.state = 'dead';
      r.open = 0;
      cb.effect('dissolve', r.x, r.y + r.height * 0.5, r.z);
      cb.effect('dissolve', r.x + 12, r.y + 4, r.z - 6);
      cb.effect('dissolve', r.x - 12, r.y + 10, r.z + 6);
      cb.sound('explode');
      return;
    }
    if (frac <= 1 / 3 && r.phase < 3) {
      r.phase = 3;
      r.state = 'climb';
      r.timer = 1.2;
      cb.sound('boss');
    } else if (frac <= 2 / 3 && r.phase < 2) {
      r.phase = 2;
      r.state = 'climb';
      r.timer = 1.2;
      cb.sound('boss');
    }
  }
  private nextPerch(): [number, number, number] {
    const r = this.rook;
    r.perchIndex = (r.perchIndex + 1) % this.perches.length;
    return this.perches[r.perchIndex];
  }
  private flyToward(target: [number, number, number], speed: number, dt: number, k = 3) {
    const r = this.rook;
    const dx = target[0] - r.x,
      dy = target[1] - r.y,
      dz = target[2] - r.z,
      d = Math.hypot(dx, dy, dz) || 1;
    const blend = Math.min(1, k * dt);
    r.vx += ((dx / d) * speed - r.vx) * blend;
    r.vy += ((dy / d) * speed - r.vy) * blend;
    r.vz += ((dz / d) * speed - r.vz) * blend;
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.z += r.vz * dt;
    if (Math.hypot(r.vx, r.vz) > 4) r.yaw = Math.atan2(r.vx, r.vz);
    return d;
  }
  private featherFan(h: HopperState, combat: Combat, gapAt: number) {
    const r = this.rook;
    const base = Math.atan2(h.x - r.x, h.z - r.z);
    for (let i = 0; i < ROOK.fanCount; i++) {
      if (i === gapAt) continue;
      const a = base + (i - (ROOK.fanCount - 1) / 2) * 0.16;
      const speed = 55;
      const dy = (h.y + 6 - (r.y + 6)) / Math.max(1, Math.hypot(h.x - r.x, h.z - r.z) / speed);
      combat.projectiles.push({ id: 100000 + Math.floor(Math.random() * 1e6), x: r.x, y: r.y + 6, z: r.z, vx: Math.sin(a) * speed, vy: Math.max(-20, Math.min(20, dy)) + 6, vz: Math.cos(a) * speed, life: 4, radius: 1.6, damage: 1, gravity: 12, owner: 'shadow', kind: 'seed', ownerId: 'boss' });
    }
  }
  private shockRing(combat: Combat) {
    const r = this.rook;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      combat.projectiles.push({ id: 200000 + Math.floor(Math.random() * 1e6), x: r.x + Math.sin(a) * 8, y: r.y + 2, z: r.z + Math.cos(a) * 8, vx: Math.sin(a) * 40, vy: 0, vz: Math.cos(a) * 40, life: 3.2, radius: 2.2, damage: 1, gravity: 0, owner: 'shadow', kind: 'seed', ownerId: 'boss' });
    }
  }
  /** Hopper's attacks against the Rook: lasers, kicks, stomps. */
  private takeHits(h: HopperState, combat: Combat, cb: CombatCallbacks) {
    const r = this.rook;
    const cx = r.x,
      cy = r.y + r.height * 0.5,
      cz = r.z;
    // Lasers and reflected shots.
    for (const p of combat.projectiles) {
      if (p.owner !== 'hopper' || p.life <= 0 || r.laserHits.has(p.id)) continue;
      if (Math.hypot(p.x - cx, p.y - cy, p.z - cz) <= r.radius + p.radius + 2) {
        p.life = 0;
        r.laserHits.add(p.id);
        this.damage(p.damage, cb);
      }
    }
    // Kick: once per swing, within reach, opens more when the joints are exposed.
    const kickActive = combat.kick > 0.15 && combat.kick < 0.42;
    if (kickActive && !r.kickHit) {
      const d = Math.hypot(r.x - h.x, r.z - h.z);
      const vertical = r.y + r.height > h.y - 2 && r.y < h.y + MOVE.height + 2;
      if (d <= 7 + MOVE.radius + r.radius && vertical) {
        r.kickHit = true;
        this.damage(r.state === 'channel' ? 8 : 3, cb);
        if (r.state === 'channel') {
          r.open = 2.5;
          r.state = 'perch';
          r.timer = 2.5;
          r.wingSpread = 0.2;
        }
      }
    }
    if (combat.kick <= 0.05) r.kickHit = false;
    // Stomp: feet on its back from above during a sweep or a perch.
    if (!h.grounded && h.vy < 0) {
      const top = r.y + r.height;
      const dh = Math.hypot(r.x - h.x, r.z - h.z);
      if (dh <= r.radius + MOVE.radius && h.y <= top + 1.5 && h.y >= top - Math.max(2, -h.vy * (1 / 120) * 1.5)) {
        this.damage(10, cb);
        cb.bounce({ id: 'boss' } as Shadow);
        r.open = Math.max(r.open, 1.5);
        if (r.state === 'sweep') {
          r.state = 'climb';
          r.timer = ROOK.climbTime;
        }
      }
    }
  }
  update(dt: number, h: HopperState, combat: Combat, cb: CombatCallbacks) {
    const r = this.rook;
    if (!r.alive || !r.active) return;
    if (r.hitFlash > 0) r.hitFlash -= dt;
    if (r.open > 0) r.open -= dt;
    r.telegraph = 0;
    this.takeHits(h, combat, cb);
    if (!r.alive) return;
    const dx = h.x - r.x,
      dz = h.z - r.z,
      dh = Math.hypot(dx, dz);
    const ground = this.world.groundAt(r.x, r.z, r.y + 1).y;
    switch (r.state) {
      case 'perch': {
        // Hold the perch, face Hopper, then choose the next attack.
        const perch = this.perches[r.perchIndex];
        this.flyToward(perch, 30, dt);
        r.yaw = Math.atan2(dx, dz);
        r.wingSpread += (0.25 - r.wingSpread) * Math.min(1, dt * 4);
        r.timer -= dt;
        if (r.timer <= 0 && r.open <= 0) {
          r.cycles++;
          if (r.phase === 3 && r.summoned.filter((id) => combat.shadows.some((s) => s.id === id && s.alive)).length < 2) {
            r.state = 'summon';
            r.timer = 1.0;
          } else if (r.phase === 2 && r.cycles % 2 === 0) {
            r.state = 'land';
            r.timer = 3.0;
          } else if (r.cycles % 3 === 0) {
            r.state = 'fan';
            r.timer = 1.0;
          } else {
            r.state = 'mark';
            r.timer = ROOK.markTime * (r.phase === 3 ? 0.75 : 1);
            r.markFrom = [r.x, r.y, r.z];
          }
        }
        break;
      }
      case 'mark': {
        // The corridor: from the perch through Hopper's position and beyond.
        r.timer -= dt;
        r.telegraph = 1 - r.timer / ROOK.markTime;
        r.yaw = Math.atan2(dx, dz);
        const lead = 0.4,
          tx = h.x + h.vx * lead,
          ty = h.y + 7,
          tz = h.z + h.vz * lead;
        const ex = tx - r.x,
          ey = ty - r.y,
          ez = tz - r.z,
          el = Math.hypot(ex, ey, ez) || 1;
        r.markTo = [r.x + (ex / el) * (el + 160), Math.max(ground + 6, r.y + (ey / el) * (el + 160)), r.z + (ez / el) * (el + 160)];
        r.wingSpread += (1 - r.wingSpread) * Math.min(1, dt * 3);
        if (r.timer <= 0) {
          r.state = 'sweep';
          const speed = r.phase === 3 ? ROOK.sweepSpeedLate : ROOK.sweepSpeed;
          r.vx = (ex / el) * speed;
          r.vy = (ey / el) * speed;
          r.vz = (ez / el) * speed;
          r.timer = Math.min(3.2, (el + 160) / speed);
          cb.sound('boss');
        }
        break;
      }
      case 'sweep': {
        r.timer -= dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.z += r.vz * dt;
        const floor = this.world.groundAt(r.x, r.z, r.y + 1).y + 5;
        if (r.y < floor) r.y = floor;
        if (dh <= MOVE.radius + r.radius && h.y + MOVE.height > r.y - 2 && h.y < r.y + r.height && h.y + 3 < r.y + r.height) {
          const nx = dx / (dh || 1),
            nz = dz / (dh || 1);
          cb.hurt(ROOK.contactDamage, nx * 26, 12, nz * 26, r.x, r.z);
          r.state = 'climb';
          r.timer = ROOK.climbTime;
        } else if (r.timer <= 0) {
          r.state = 'climb';
          r.timer = ROOK.climbTime;
          r.open = 1.6;
        }
        break;
      }
      case 'climb': {
        r.timer -= dt;
        const perch = this.perches[r.perchIndex];
        const d = this.flyToward(perch, 55, dt, 2.5);
        if (r.timer <= 0 || d < 8) {
          this.nextPerch();
          r.state = 'perch';
          r.timer = r.phase === 3 ? 1.0 : 1.8;
        }
        break;
      }
      case 'fan': {
        r.timer -= dt;
        r.telegraph = 1 - r.timer;
        r.yaw = Math.atan2(dx, dz);
        if (r.timer <= 0) {
          this.featherFan(h, combat, 2 + Math.floor(Math.random() * 3));
          cb.sound('laser');
          r.state = 'perch';
          r.timer = 2.2;
          r.open = 1.2;
        }
        break;
      }
      case 'land': {
        // Come down near Hopper and channel through the wing joints.
        r.timer -= dt;
        const target: [number, number, number] = [h.x + (r.x - h.x) * 0.3, this.world.groundAt(h.x, h.z, h.y + 1).y, h.z + (r.z - h.z) * 0.3];
        const d = this.flyToward(target, 40, dt, 2.5);
        if (d < 6 || r.timer <= 0) {
          r.y = this.world.groundAt(r.x, r.z, r.y + 1).y;
          r.vx = r.vy = r.vz = 0;
          r.state = 'channel';
          r.timer = ROOK.channelTime;
          r.wingSpread = 1;
          cb.sound('boss');
        }
        break;
      }
      case 'channel': {
        r.timer -= dt;
        r.telegraph = 1 - r.timer / ROOK.channelTime;
        r.yaw = Math.atan2(dx, dz);
        if (r.timer <= 0) {
          r.state = 'burst';
          r.timer = 0.4;
        }
        break;
      }
      case 'burst': {
        r.timer -= dt;
        if (r.timer <= 0) {
          this.shockRing(combat);
          cb.sound('stomp');
          r.state = 'climb';
          r.timer = ROOK.climbTime;
        }
        break;
      }
      case 'summon': {
        r.timer -= dt;
        r.telegraph = 1 - r.timer;
        if (r.timer <= 0) {
          for (const side of [-1, 1]) {
            const id = `rook-condor-${r.cycles}-${side}`;
            if (combat.shadows.some((s) => s.id === id)) continue;
            combat.spawn({ id, kind: 'riftCondor', x: r.x + side * 40, z: r.z, y: r.y - 10, mode: 'a', group: 'rook' });
            r.summoned.push(id);
          }
          r.state = 'perch';
          r.timer = 1.0;
        }
        break;
      }
      default:
        break;
    }
  }
}

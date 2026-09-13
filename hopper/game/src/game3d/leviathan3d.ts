/** The Smelter Leviathan: the mission-two commander at the gantry elevator. A placeholder that
 * wakes, holds its ground and dies to Hopper's attacks until the fight is
 * written; see LEVEL-PLAN-M2-M3.md for the design it will follow. */
import type { World } from './world';
import { MOVE, type HopperState } from './controller';
import type { Combat, CombatCallbacks, Shadow } from './combat3d';
import type { BossSpec, ShadowKind } from './district';
import { COMMANDER_NAMES, type Commander, type CommanderRuntime } from './boss3d';

export const LEVIATHAN = { hp: 160 };

export interface LeviathanRuntime extends CommanderRuntime {
  kind: 'smelterLeviathan';
  laserHits: Set<number>;
  kickHit: boolean;
}

export class SmelterLeviathan implements Commander {
  readonly kind = 'smelterLeviathan' as const;
  readonly name = COMMANDER_NAMES.smelterLeviathan.name;
  readonly title = COMMANDER_NAMES.smelterLeviathan.title;
  readonly won = COMMANDER_NAMES.smelterLeviathan.won;
  readonly runtime: LeviathanRuntime;
  private aimTarget: Shadow | null = null;
  constructor(readonly spec: BossSpec, readonly world: World) {
    const ground = world.heightAt(spec.x, spec.z);
    this.runtime = {
      kind: 'smelterLeviathan', x: spec.x, y: ground + 12, z: spec.z, vx: 0, vy: 0, vz: 0, yaw: Math.PI, hp: LEVIATHAN.hp, maxHp: LEVIATHAN.hp, phase: 1, state: 'sleep', timer: 0, telegraph: 0, open: 0, hitFlash: 0, alive: true, active: false, radius: 9, height: 14, marks: [], gravity: 1, laserHits: new Set(), kickHit: false,
    };
  }
  target(): Shadow {
    const r = this.runtime;
    const t = (this.aimTarget ||= {
      id: 'boss', kind: 'riftCondor' as ShadowKind, x: r.x, y: r.y, z: r.z, vx: 0, vy: 0, vz: 0, yaw: 0, hp: r.hp, maxHp: r.maxHp, state: 'idle', timer: 0, cooldown: 0, alive: true, dormant: false, group: 'boss', wave: 0, homeX: r.x, homeY: r.y, homeZ: r.z, flying: true, rooted: false, armored: false, radius: r.radius, height: r.height, size: 1, held: false, entry: undefined, delay: -1, arrive: 1, perch: [r.x, r.y, r.z], perched: false, stare: 0, open: 0, hitFlash: 0, telegraph: 0, deadAt: -1e9, patrol: 0, phase: 0, scale: 1, grounded: false, spawnFlash: 0, beamX: r.x, beamY: r.y, beamZ: r.z, phased: false, underground: false, link: null, ceiling: false, stall: 0,
    } satisfies Shadow);
    t.x = r.x;
    t.y = r.y;
    t.z = r.z;
    t.hp = r.hp;
    t.maxHp = r.maxHp;
    t.alive = r.alive;
    t.open = r.open;
    return t;
  }
  wake(cb: CombatCallbacks) {
    const r = this.runtime;
    if (r.active || !r.alive) return;
    r.active = true;
    r.state = 'hold';
    r.open = 1e9;
    cb.sound('boss');
  }
  tell(): string {
    return this.runtime.open > 0 ? 'CORE EXPOSED · strike now' : 'Read the shadow. Find your opening.';
  }
  private damage(amount: number, cb: CombatCallbacks) {
    const r = this.runtime;
    if (!r.alive) return;
    r.hp -= amount;
    r.hitFlash = 0.2;
    cb.effect('hit', r.x, r.y + r.height * 0.5, r.z);
    cb.sound('hit');
    const frac = r.hp / r.maxHp;
    r.phase = frac <= 1 / 3 ? 3 : frac <= 2 / 3 ? 2 : 1;
    if (frac <= 0) {
      r.alive = false;
      r.state = 'dead';
      r.open = 0;
      cb.effect('dissolve', r.x, r.y + r.height * 0.5, r.z);
      cb.sound('explode');
    }
  }
  update(dt: number, h: HopperState, combat: Combat, cb: CombatCallbacks) {
    const r = this.runtime;
    if (!r.alive || !r.active) return;
    if (r.hitFlash > 0) r.hitFlash -= dt;
    r.yaw = Math.atan2(h.x - r.x, h.z - r.z);
    const cx = r.x,
      cy = r.y + r.height * 0.5,
      cz = r.z;
    for (const p of combat.projectiles) {
      if (p.owner !== 'hopper' || p.life <= 0 || r.laserHits.has(p.id)) continue;
      if (Math.hypot(p.x - cx, p.y - cy, p.z - cz) <= r.radius + p.radius + 2) {
        p.life = 0;
        r.laserHits.add(p.id);
        this.damage(p.damage, cb);
      }
    }
    const kickActive = combat.kick > 0.15 && combat.kick < 0.42;
    if (kickActive && !r.kickHit) {
      const d = Math.hypot(r.x - h.x, r.z - h.z);
      if (d <= 7 + MOVE.radius + r.radius && r.y + r.height > h.y - 2 && r.y < h.y + MOVE.height + 2) {
        r.kickHit = true;
        this.damage(4, cb);
      }
    }
    if (combat.kick <= 0.05) r.kickHit = false;
  }
}

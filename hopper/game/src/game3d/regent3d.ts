/** The Eclipse Regent: the mission-three commander at the eclipse dais.
 * Three gravity phases by hp thirds, each announced by a 1.5 s count-in:
 * heavy shadow rings crawling out from the centre (phase 1, gravity 1.35),
 * light lance volleys with summoned medusae (phase 2, gravity 0.5), then
 * both together with the arena's gravity flipping every 3 s (phase 3,
 * gravity ±0.85). The heart (44 m over the dais) and two hands (at dais
 * level) are the only core points that ever take damage; see
 * LEVEL-PLAN-M2-M3.md and hopper/3d/design/LEVEL-PLAN-M2-M3.md.
 */
import type { World } from './world';
import { MOVE, type HopperState } from './controller';
import type { Combat, CombatCallbacks, Shadow } from './combat3d';
import type { BossSpec, ShadowKind } from './district';
import { COMMANDER_NAMES, type Commander, type CommanderRuntime } from './boss3d';

export const REGENT = { hp: 180 };

export type RegentState = 'sleep' | 'count' | 'fight' | 'dead';

export interface RegentRuntime extends CommanderRuntime {
  kind: 'eclipseRegent';
  state: RegentState;
  laserHits: Set<number>;
  kickHit: boolean;
  /** Active shadow rings crawling out from the centre: each grows from 0. */
  rings: { r: number; hit: boolean }[];
  ringTimer: number;
  /** 0 or 1: how many rings of the current pair have been spawned. */
  ringPairCount: number;
  /** Seconds the hands stay lowered (kickable, laser-able). */
  handOpen: number;
  /** Active lances marking a spot before they strike. */
  lances: { x: number; z: number; t: number; last: boolean }[];
  lanceTimer: number;
  /** Lances left to spawn in the current volley (of 3). */
  lanceQueue: number;
  /** Phase 3: seconds left in the current 3 s gravity-flip cycle. */
  cycleTimer: number;
  /** Phase 3: successful interactions (hand kick or medusa bounce) this cycle. */
  cycleInteractions: number;
  /** Phase 3: whether the hand-lower window has already been used this cycle. */
  handCycleUsed: boolean;
}

export class EclipseRegent implements Commander {
  readonly kind = 'eclipseRegent' as const;
  readonly name = COMMANDER_NAMES.eclipseRegent.name;
  readonly title = COMMANDER_NAMES.eclipseRegent.title;
  readonly won = COMMANDER_NAMES.eclipseRegent.won;
  readonly runtime: RegentRuntime;
  /** The dais floor at the centre, computed once: `world.groundAt` under a
   * point at construction. The canopy underside Hopper lands on when
   * gravity is negative is a fixed constant (see the level plan). */
  private readonly FLOOR: number;
  private readonly CEILING = 280;
  private aimTarget: Shadow | null = null;
  /** The hand nearer Hopper, cached each update() for target(). */
  private nearHand: [number, number, number] = [0, 0, 0];
  private medusaKnownIds = new Set<string>();
  private medusaCounter = 0;

  constructor(readonly spec: BossSpec, readonly world: World) {
    this.FLOOR = world.groundAt(spec.x, spec.z, 1e5).y;
    this.runtime = {
      kind: 'eclipseRegent', x: spec.x, y: this.FLOOR, z: spec.z, vx: 0, vy: 0, vz: 0, yaw: Math.PI,
      hp: REGENT.hp, maxHp: REGENT.hp, phase: 1, state: 'sleep', timer: 0, telegraph: 0, open: 0, hitFlash: 0,
      alive: true, active: false, radius: 8, height: 40, marks: [], gravity: 1,
      laserHits: new Set(), kickHit: false,
      rings: [], ringTimer: 1.4, ringPairCount: 0, handOpen: 0,
      lances: [], lanceTimer: 0, lanceQueue: 3,
      cycleTimer: 3, cycleInteractions: 0, handCycleUsed: false,
    };
  }

  private heartPoint(): [number, number, number] {
    const r = this.runtime;
    return [r.x, r.y + 44, r.z];
  }
  private handPoints(): [number, number, number][] {
    const r = this.runtime;
    return [
      [r.x - 22, r.y + 4, r.z + 12],
      [r.x + 22, r.y + 4, r.z + 12],
    ];
  }
  /** The surface Hopper stands on this frame: the dais floor while gravity
   * pulls down, the canopy underside while it pulls up. */
  private floorY(): number {
    return this.runtime.gravity >= 0 ? this.FLOOR : this.CEILING;
  }

  target(): Shadow {
    const r = this.runtime;
    const heart = this.heartPoint();
    const point = r.handOpen > 0 ? this.nearHand : heart;
    const t = (this.aimTarget ||= {
      id: 'boss', kind: 'riftCondor' as ShadowKind, x: point[0], y: point[1], z: point[2], vx: 0, vy: 0, vz: 0, yaw: 0, hp: r.hp, maxHp: r.maxHp, state: 'idle', timer: 0, cooldown: 0, alive: true, dormant: false, group: 'boss', wave: 0, homeX: r.x, homeY: r.y, homeZ: r.z, flying: true, rooted: false, armored: false, radius: 8, height: 8, size: 1, held: false, entry: undefined, delay: -1, arrive: 1, perch: [r.x, r.y, r.z], perched: false, stare: 0, open: 0, hitFlash: 0, telegraph: 0, deadAt: -1e9, patrol: 0, phase: 0, scale: 1, grounded: false, spawnFlash: 0, beamX: r.x, beamY: r.y, beamZ: r.z, phased: false, underground: false, link: null, ceiling: false, stall: 0,
    } satisfies Shadow);
    t.x = point[0];
    t.y = point[1];
    t.z = point[2];
    t.hp = r.hp;
    t.maxHp = r.maxHp;
    t.alive = r.alive;
    t.open = r.handOpen > 0 ? r.handOpen : r.open;
    return t;
  }

  wake(cb: CombatCallbacks) {
    const r = this.runtime;
    if (r.active || !r.alive) return;
    r.active = true;
    r.phase = 1;
    r.state = 'count';
    r.timer = 1.5;
    r.telegraph = 0;
    cb.sound('boss');
  }

  tell(): string {
    const r = this.runtime;
    if (r.open > 0) return 'HEART OPEN · fire';
    if (r.handOpen > 0) return 'HANDS LOWERED · kick one';
    if (r.phase === 3 && r.cycleTimer < 0.6) return `GRAVITY TURNS · find the ${r.gravity > 0 ? 'ceiling' : 'floor'}`;
    if ((r.phase === 2 || r.phase === 3) && r.lances.length) return 'LANCE · move off the mark';
    if ((r.phase === 1 || r.phase === 3) && r.rings.length) return 'SHADOW RING · jump it';
    if (r.phase >= 2) return 'MEDUSA · bounce up to the heart';
    return 'Read the shadow. Find your opening.';
  }

  private damage(amount: number, cb: CombatCallbacks) {
    const r = this.runtime;
    if (!r.alive) return;
    r.hp -= amount;
    r.hitFlash = 0.2;
    const heart = this.heartPoint();
    cb.effect('hit', heart[0], heart[1], heart[2]);
    cb.sound('hit');
    this.applyHpEffects(cb);
  }

  /** Death and phase advance both react to hp thirds; called from damage()
   * for the usual combat path and every 'fight' frame besides so a phase
   * (or death) forced directly onto hp still takes hold. */
  private applyHpEffects(cb: CombatCallbacks) {
    const r = this.runtime;
    if (!r.alive) return;
    if (r.hp <= 0) {
      r.alive = false;
      r.state = 'dead';
      r.open = 0;
      r.handOpen = 0;
      r.gravity = 0.85;
      r.marks = [];
      const heart = this.heartPoint();
      cb.effect('dissolve', heart[0], heart[1], heart[2]);
      cb.sound('explode');
      return;
    }
    const frac = r.hp / r.maxHp;
    const newPhase: 1 | 2 | 3 = frac <= 1 / 3 ? 3 : frac <= 2 / 3 ? 2 : 1;
    if (newPhase > r.phase) {
      r.phase = newPhase;
      r.state = 'count';
      r.timer = 1.5;
      r.telegraph = 0;
      cb.sound('boss');
    }
  }

  /** Phase 3: two successful interactions per cycle (a hand kicked while
   * lowered, or a medusa bounced) opens the heart. */
  private registerInteraction() {
    const r = this.runtime;
    r.cycleInteractions++;
    if (r.cycleInteractions >= 2) r.open = Math.max(r.open, 4);
  }

  private enterPhase(phase: 1 | 2 | 3) {
    const r = this.runtime;
    r.phase = phase;
    r.state = 'fight';
    r.timer = 0;
    r.telegraph = 0;
    r.rings = [];
    r.ringTimer = 1.4;
    r.ringPairCount = 0;
    r.lances = [];
    r.lanceQueue = 3;
    r.lanceTimer = 0;
    r.handOpen = 0;
    if (phase === 1) {
      r.gravity = 1.35;
    } else if (phase === 2) {
      r.gravity = 0.5;
    } else {
      r.gravity = 0.85;
      r.cycleTimer = 3;
      r.cycleInteractions = 0;
      r.handCycleUsed = false;
    }
  }

  /** Lasers and kicks against the heart and the lowered hands: the only
   * points that ever take damage. */
  private takeHits(h: HopperState, combat: Combat, cb: CombatCallbacks) {
    const r = this.runtime;
    const heart = this.heartPoint();
    const hands = this.handPoints();
    for (const p of combat.projectiles) {
      if (p.owner !== 'hopper' || p.life <= 0 || r.laserHits.has(p.id)) continue;
      const reach = 8 + p.radius;
      const distHeart = Math.hypot(p.x - heart[0], p.y - heart[1], p.z - heart[2]);
      const hitHeart = r.open > 0 && distHeart <= reach;
      let hitHand = false;
      if (!hitHeart && r.handOpen > 0) {
        for (const hp of hands) {
          if (Math.hypot(p.x - hp[0], p.y - hp[1], p.z - hp[2]) <= reach) {
            hitHand = true;
            break;
          }
        }
      }
      if (hitHeart || hitHand) {
        p.life = 0;
        r.laserHits.add(p.id);
        this.damage(p.damage, cb);
      } else if (distHeart <= reach || hands.some((hp) => Math.hypot(p.x - hp[0], p.y - hp[1], p.z - hp[2]) <= reach)) {
        // A closed core: the shot sparks off harmlessly.
        p.life = 0;
        cb.effect('spark', p.x, p.y, p.z);
      }
    }
    const kickActive = combat.kick > 0.15 && combat.kick < 0.42;
    if (kickActive && !r.kickHit && r.handOpen > 0) {
      for (const hp of hands) {
        const d = Math.hypot(h.x - hp[0], h.z - hp[2]);
        if (d <= 7 + MOVE.radius && Math.abs(h.y - hp[1]) <= MOVE.height + 6) {
          r.kickHit = true;
          this.damage(4, cb);
          if (r.alive) {
            if (r.phase === 1) r.open = Math.max(r.open, 4);
            else if (r.phase === 3 && !r.handCycleUsed) {
              r.handCycleUsed = true;
              this.registerInteraction();
            }
          }
          break;
        }
      }
    }
    if (combat.kick <= 0.05) r.kickHit = false;
  }

  /** Phase 1 & 3: rings crawl out from the centre; a grounded Hopper caught
   * in the band takes 1, once per ring. Pairs 1.4 s apart; in phase 1 each
   * pair completing lowers the hands for 3 s. */
  private updateRings(dt: number, h: HopperState, cb: CombatCallbacks) {
    const r = this.runtime;
    r.ringTimer -= dt;
    if (r.ringTimer <= 0) {
      r.rings.push({ r: 0, hit: false });
      r.ringPairCount++;
      if (r.ringPairCount >= 2) {
        r.ringPairCount = 0;
        if (r.phase === 1) r.handOpen = Math.max(r.handOpen, 3);
        r.ringTimer = 3 + 1.4;
      } else {
        r.ringTimer = 1.4;
      }
    }
    const floor = this.floorY();
    for (const ring of r.rings) ring.r += 22 * dt;
    r.rings = r.rings.filter((ring) => ring.r <= 60);
    const onFloor = h.grounded && Math.abs(h.y - floor) <= 3;
    const dist = Math.hypot(h.x - r.x, h.z - r.z);
    for (const ring of r.rings) {
      r.marks.push({ shape: 'ring', x: r.x, y: floor, z: r.z, r: ring.r, color: '#5a2a8a', alpha: 1 });
      if (!ring.hit && onFloor && Math.abs(dist - ring.r) <= 3) {
        ring.hit = true;
        const nx = (h.x - r.x) / (dist || 1),
          nz = (h.z - r.z) / (dist || 1);
        cb.hurt(1, nx * 20, 6, nz * 20, r.x, r.z);
      }
    }
  }

  /** Phase 2 & 3: lances mark a spot near Hopper for 1.2 s, then strike --
   * 2 damage to a Hopper within 8 m of the mark and 6 m of the floor.
   * Volleys of three, 0.5 s apart, 1.5 s between volleys; in phase 2 the
   * heart opens 3 s after each volley's last lance lands. */
  private updateLances(dt: number, h: HopperState, cb: CombatCallbacks) {
    const r = this.runtime;
    r.lanceTimer -= dt;
    if (r.lanceTimer <= 0) {
      const last = r.lanceQueue <= 1;
      r.lances.push({ x: h.x + h.vx * 0.6, z: h.z + h.vz * 0.6, t: 1.2, last });
      r.lanceQueue--;
      if (r.lanceQueue <= 0) {
        r.lanceQueue = 3;
        r.lanceTimer = 1.5;
      } else {
        r.lanceTimer = 0.5;
      }
    }
    const floor = this.floorY();
    for (const lance of r.lances) lance.t -= dt;
    for (const lance of r.lances) {
      r.marks.push({ shape: 'disc', x: lance.x, y: floor, z: lance.z, r: 8, color: '#c8a4ff', alpha: Math.max(0, Math.min(1, lance.t / 1.2)) });
    }
    for (const lance of r.lances) {
      if (lance.t <= 0) {
        const dist = Math.hypot(h.x - lance.x, h.z - lance.z);
        if (dist <= 8 && Math.abs(h.y - floor) <= 6) cb.hurt(2, 0, 6, 0, lance.x, lance.z);
        cb.effect('spark', lance.x, floor, lance.z);
        if (lance.last && r.phase === 2) r.open = Math.max(r.open, 3);
      }
    }
    r.lances = r.lances.filter((l) => l.t > 0);
  }

  /** Phase 2 & 3: two medusae, capped, re-summoned when one dies. A death
   * (its only real cause is Hopper bouncing off it -- 5 dmg to 4 hp always
   * kills) counts as a phase-3 interaction. */
  private updateMedusas(combat: Combat) {
    const r = this.runtime;
    const alive = combat.shadows.filter((s) => s.group === 'regent' && s.kind === 'veilMedusa' && s.alive);
    const aliveIds = new Set(alive.map((s) => s.id));
    for (const id of this.medusaKnownIds) {
      if (!aliveIds.has(id)) {
        this.medusaKnownIds.delete(id);
        if (r.phase === 3) this.registerInteraction();
      }
    }
    for (const id of aliveIds) this.medusaKnownIds.add(id);
    if (alive.length < 2) {
      const side = alive.some((s) => s.x > r.x) ? -1 : 1;
      combat.spawn({ id: `regent-medusa-${this.medusaCounter++}`, kind: 'veilMedusa', x: r.x + side * 40, z: r.z + 20, y: r.y + 30, mode: 'a', group: 'regent' });
    }
  }

  /** Phase 3: every 3 s the arena's gravity flips sign; a fresh cycle also
   * lowers the hands once. */
  private updateGravityCycle(dt: number) {
    const r = this.runtime;
    r.cycleTimer -= dt;
    const pulse = 0.5 + 0.5 * Math.sin(r.cycleTimer * 6);
    r.marks.push({ shape: 'sphere', x: r.x, y: r.y + 44, z: r.z, r: 5 + pulse * 3, color: '#ffd35a', alpha: 0.6 });
    if (r.cycleTimer <= 0) {
      r.cycleTimer = 3;
      r.gravity = r.gravity > 0 ? -0.85 : 0.85;
      r.cycleInteractions = 0;
      r.handCycleUsed = false;
      r.handOpen = Math.max(r.handOpen, 3);
    }
  }

  update(dt: number, h: HopperState, combat: Combat, cb: CombatCallbacks) {
    const r = this.runtime;
    if (!r.alive || !r.active) return;
    if (r.hitFlash > 0) r.hitFlash -= dt;
    r.yaw = Math.atan2(h.x - r.x, h.z - r.z);
    const hands = this.handPoints();
    const d0 = Math.hypot(h.x - hands[0][0], h.z - hands[0][2]);
    const d1 = Math.hypot(h.x - hands[1][0], h.z - hands[1][2]);
    this.nearHand = d0 <= d1 ? hands[0] : hands[1];

    if (r.state === 'dead') return;
    r.marks = [];

    if (r.state === 'count') {
      r.timer -= dt;
      r.telegraph = Math.max(0, Math.min(1, 1 - r.timer / 1.5));
      const pulse = 0.5 + 0.5 * Math.sin(r.timer * 8);
      r.marks.push({ shape: 'sphere', x: r.x, y: r.y + 44, z: r.z, r: 5 + pulse * 3, color: '#ffd35a', alpha: 0.7 });
      if (r.timer <= 0) this.enterPhase(r.phase);
      return;
    }

    // 'fight'
    this.takeHits(h, combat, cb);
    if (!r.alive) return;
    this.applyHpEffects(cb);
    if (r.state !== 'fight') return;
    if (r.handOpen > 0) r.handOpen -= dt;
    if (r.open > 0) r.open -= dt;
    for (const hp of hands) if (r.handOpen > 0) r.marks.push({ shape: 'disc', x: hp[0], y: hp[1], z: hp[2], r: 8, color: '#ffae42', alpha: 0.8 });
    if (r.open > 0) {
      const heart = this.heartPoint();
      r.marks.push({ shape: 'sphere', x: heart[0], y: heart[1], z: heart[2], r: 8, color: '#ff5a5a', alpha: 0.8 });
    }
    if (r.phase === 1 || r.phase === 3) this.updateRings(dt, h, cb);
    if (r.phase === 2 || r.phase === 3) this.updateLances(dt, h, cb);
    if (r.phase === 2 || r.phase === 3) this.updateMedusas(combat);
    if (r.phase === 3) this.updateGravityCycle(dt);
    r.marks = r.marks.filter((m) => Number.isFinite(m.x) && Number.isFinite(m.y) && Number.isFinite(m.z) && Number.isFinite(m.r));
  }
}

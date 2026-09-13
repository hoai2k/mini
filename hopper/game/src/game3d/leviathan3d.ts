/** The Smelter Leviathan: the mission-two commander, coiled around the
 * gantry elevator tower at the Skyhook Works arena. A chain of sixteen
 * segments (`runtime.segments`) helixed around the tower axis; the head
 * (`runtime.x/y/z`) is the topmost end and the default aim target. Three
 * phases by hp thirds: the tail sweeps the pad, the furnace breathes across
 * the tower, then the coil uncoils across the launch ring. See
 * LEVEL-PLAN-M2-M3.md, "The commanders › Smelter Leviathan".
 */
import type { World } from './world';
import { MOVE, type HopperState } from './controller';
import type { Combat, CombatCallbacks, Shadow } from './combat3d';
import type { BossSpec, ShadowKind } from './district';
import { COMMANDER_NAMES, type Commander, type CommanderRuntime } from './boss3d';

export const LEVIATHAN = {
  hp: 160,
  countIn: 1.5,
  /** One revolution of the tail sweep, phase 1 and phase 3 (half speed). */
  sweepPeriod: 2.4,
  sweepPeriodPhase3: 4.0,
  /** Angular width of the sweep's hazard band, radians. */
  sweepArc: 0.35,
  sweepDamage: 2,
  /** Seconds the tail joint stays open after each revolution. */
  jointOpen: 2,
  /** Sweeps that must land before phase 1 can hand off to phase 2. */
  minSweeps: 2,
  breathTelegraph: 1.2,
  breathDuration: 3,
  breathTick: 0.5,
  breathDamagePerTick: 1,
  breathRest: 1.5,
  breathRange: 60,
  mawOpen: 3,
  /** Seconds the core stays open after a phase-3 crack. */
  coreOpen: 3,
  /** Reach for a laser or a kick against whichever core point is open. */
  coreReach: 8,
};

type LeviathanState = 'sleep' | 'countin' | 'sweep' | 'breathTelegraph' | 'breath' | 'breathRest' | 'phase3' | 'dead';

export interface LeviathanRuntime extends CommanderRuntime {
  kind: 'smelterLeviathan';
  state: LeviathanState;
  laserHits: Set<number>;
  kickHit: boolean;
  /** Tail sweep angle, radians, always advancing (never wrapped). */
  sweepAngle: number;
  /** Revolutions completed since wake -- gates the phase-1 -> phase-2 handoff. */
  sweeps: number;
  /** Whether this revolution has already landed its once-per-turn hit. */
  sweepHit: boolean;
  /** Which half (sign of x) the furnace breath is scorching this cycle. */
  breathSide: 1 | -1;
  /** Countdown to the next breath damage tick. */
  breathTick: number;
  /** World point the core is currently open at (tail joint, maw, or head). */
  openX: number;
  openY: number;
  openZ: number;
  /** 0..1 how far the coil has uncoiled toward the ring in phase 3. */
  uncoil: number;
  /** Which of the three phase-3 segments (4, 8, 12) are cracked. */
  cracked: boolean[];
}

export class SmelterLeviathan implements Commander {
  readonly kind = 'smelterLeviathan' as const;
  readonly name = COMMANDER_NAMES.smelterLeviathan.name;
  readonly title = COMMANDER_NAMES.smelterLeviathan.title;
  readonly won = COMMANDER_NAMES.smelterLeviathan.won;
  readonly runtime: LeviathanRuntime;
  private aimTarget: Shadow | null = null;
  private time = 0;
  private readonly cx: number;
  private readonly cz: number;
  private readonly ground: number;
  /** The pad's hazard band: sweep height and the grounded band's radii. */
  private readonly padY: number;
  /** Coil top (near the head) and base (the tail joint), world y. */
  private readonly topY: number;
  private readonly baseY: number;
  /** The maw's height, 70 m up the tower's face. */
  private readonly mawY: number;
  /** Phase-3 perches for segments 4, 8 and 12: real ring tops where one is
   * found nearby, else computed points on the ring's own circle. */
  private readonly crackPoints: [number, number, number][];

  constructor(readonly spec: BossSpec, readonly world: World) {
    this.ground = world.heightAt(spec.x, spec.z);
    this.cx = spec.x;
    this.cz = spec.z;
    this.padY = this.ground + 2;
    this.topY = this.ground + 120;
    this.baseY = this.ground + 6;
    this.mawY = this.ground + 70;
    const anchors: [number, number][] = [
      [0.5, 360],
      [2.6, 390],
      [4.7, 420],
    ];
    this.crackPoints = anchors.map(([a, wantY]) => {
      const px = this.cx + Math.sin(a) * 70,
        pz = this.cz + Math.cos(a) * 70;
      const perch = world.perchNear(px, pz, wantY, 40, 5);
      return (perch ? [perch.x, perch.y, perch.z] : [px, wantY, pz]) as [number, number, number];
    });
    this.runtime = {
      kind: 'smelterLeviathan', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: Math.PI, hp: LEVIATHAN.hp, maxHp: LEVIATHAN.hp, phase: 1, state: 'sleep', timer: 0, telegraph: 0, open: 0, hitFlash: 0, alive: true, active: false, radius: 14, height: 18, marks: [], segments: [], gravity: 1, laserHits: new Set(), kickHit: false, sweepAngle: 0, sweeps: 0, sweepHit: false, breathSide: 1, breathTick: 0, openX: 0, openY: 0, openZ: 0, uncoil: 0, cracked: [false, false, false],
    };
    this.computeSegments();
  }
  target(): Shadow {
    const r = this.runtime;
    const t = (this.aimTarget ||= {
      id: 'boss', kind: 'riftCondor' as ShadowKind, x: r.x, y: r.y, z: r.z, vx: 0, vy: 0, vz: 0, yaw: 0, hp: r.hp, maxHp: r.maxHp, state: 'idle', timer: 0, cooldown: 0, alive: true, dormant: false, group: 'boss', wave: 0, homeX: r.x, homeY: r.y, homeZ: r.z, flying: true, rooted: false, armored: false, radius: r.radius, height: r.height, size: 1, held: false, entry: undefined, delay: -1, arrive: 1, perch: [r.x, r.y, r.z], perched: false, stare: 0, open: 0, hitFlash: 0, telegraph: 0, deadAt: -1e9, patrol: 0, phase: 0, scale: 1, grounded: false, spawnFlash: 0, beamX: r.x, beamY: r.y, beamZ: r.z, phased: false, underground: false, link: null, ceiling: false, stall: 0,
    } satisfies Shadow);
    const open = r.open > 0;
    t.x = open ? r.openX : r.x;
    t.y = open ? r.openY : r.y;
    t.z = open ? r.openZ : r.z;
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
    r.state = 'countin';
    r.timer = LEVIATHAN.countIn;
    r.telegraph = 0;
    cb.sound('boss');
  }
  tell(): string {
    const r = this.runtime;
    switch (r.state) {
      case 'sweep':
        return r.open > 0 ? 'TAIL JOINT OPEN · kick it' : 'TAIL SWEEP · jump it';
      case 'breathTelegraph':
      case 'breath':
      case 'breathRest':
        return r.open > 0 ? 'MAW OPEN · fire into it' : 'FURNACE BREATH · cross to the cool side';
      case 'phase3':
        return r.open > 0 ? 'CORE EXPOSED · strike now' : 'CRACKED SEGMENT · stomp it';
      default:
        return r.open > 0 ? 'CORE EXPOSED · strike now' : 'Read the shadow. Find your opening.';
    }
  }
  private damage(amount: number, cb: CombatCallbacks) {
    const r = this.runtime;
    if (!r.alive) return;
    r.hp -= amount;
    r.hitFlash = 0.2;
    cb.effect('hit', r.x, r.y, r.z);
    cb.sound('hit');
    const frac = r.hp / r.maxHp;
    r.phase = frac <= 1 / 3 ? 3 : frac <= 2 / 3 ? 2 : 1;
    if (frac <= 0) {
      r.alive = false;
      r.state = 'dead';
      r.open = 0;
      cb.effect('dissolve', r.x, r.y, r.z);
      cb.sound('explode');
    }
  }
  /** A point along the coil: i in 0..15 for a segment (0 near the head, 15
   * the base/tail joint); i = -1 continues one step further for the head
   * itself. Two turns and change from base to top, purely for how it reads. */
  private coilPoint(i: number, radius: number): [number, number, number] {
    const turns = 2.25;
    const frac = i / 15;
    const angle = frac * turns * Math.PI * 2;
    const y = this.topY - frac * (this.topY - this.baseY);
    return [this.cx + Math.sin(angle) * radius, y, this.cz + Math.cos(angle) * radius];
  }
  /** Lays the sixteen segments and the head along the coil, with a slow
   * breathing wobble so it reads alive; in phase 3 the coil's radius eases
   * out toward the ring and segments 4/8/12 are pinned to real ring perches
   * instead of the formula, since those are the phase's stomp targets. */
  private computeSegments() {
    const r = this.runtime;
    const breathe = Math.sin(this.time * 1.3) * 1.1;
    const radius = 14 + breathe + r.uncoil * 46;
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const [x, y, z] = this.coilPoint(i, radius);
      pts.push([x, y + Math.sin(this.time * 1.1 + i * 0.35) * 0.6, z]);
    }
    if (r.phase === 3) {
      const idx = [4, 8, 12];
      for (let k = 0; k < 3; k++) pts[idx[k]] = this.crackPoints[k];
    }
    r.segments = pts;
    const head = this.coilPoint(-1, radius);
    r.x = head[0];
    r.y = head[1] + Math.sin(this.time * 1.1 - 0.35) * 0.6;
    r.z = head[2];
  }
  /** Hopper's attacks: lasers and kicks land on whichever core point is open
   * (tail joint, maw or the exposed head); against the closed body they just
   * spark. */
  private takeHits(h: HopperState, combat: Combat, cb: CombatCallbacks) {
    const r = this.runtime;
    if (r.open > 0) {
      const hx = r.openX,
        hy = r.openY,
        hz = r.openZ;
      for (const p of combat.projectiles) {
        if (p.owner !== 'hopper' || p.life <= 0 || r.laserHits.has(p.id)) continue;
        if (Math.hypot(p.x - hx, p.y - hy, p.z - hz) <= LEVIATHAN.coreReach + p.radius) {
          p.life = 0;
          r.laserHits.add(p.id);
          this.damage(p.damage, cb);
        }
      }
      const kickActive = combat.kick > 0.15 && combat.kick < 0.42;
      if (kickActive && !r.kickHit) {
        const d = Math.hypot(h.x - hx, h.z - hz),
          dy = Math.abs(h.y - hy);
        if (d <= 7 + MOVE.radius && dy <= 10) {
          r.kickHit = true;
          this.damage(4, cb);
        }
      }
    } else {
      for (const p of combat.projectiles) {
        if (p.owner !== 'hopper' || p.life <= 0) continue;
        const nearBody = (r.segments || []).some(([sx, sy, sz]) => Math.hypot(p.x - sx, p.y - sy, p.z - sz) <= 6 + p.radius) || Math.hypot(p.x - r.x, p.y - r.y, p.z - r.z) <= r.radius + p.radius;
        if (nearBody) {
          p.life = 0;
          cb.effect('spark', p.x, p.y, p.z);
        }
      }
    }
    if (combat.kick <= 0.05) r.kickHit = false;
  }
  private updateCountin(dt: number) {
    const r = this.runtime;
    r.timer -= dt;
    r.telegraph = 1 - Math.max(0, r.timer) / LEVIATHAN.countIn;
    if (r.timer <= 0) {
      r.state = 'sweep';
      r.sweepAngle = 0;
      r.sweeps = 0;
      r.sweepHit = false;
    }
  }
  /** The tail's rotating hazard: draws its telegraph, lands one hit per
   * revolution on a grounded Hopper caught in the band, and opens the tail
   * joint for a window after every completed turn. Shared by phase 1 (full
   * speed) and phase 3 (half speed, `period` says which). */
  private updateSweep(dt: number, period: number, h: HopperState, cb: CombatCallbacks) {
    const r = this.runtime;
    const prevAngle = r.sweepAngle;
    r.sweepAngle += ((Math.PI * 2) / period) * dt;
    const revNow = Math.floor(r.sweepAngle / (Math.PI * 2)),
      revPrev = Math.floor(prevAngle / (Math.PI * 2));
    if (revNow > revPrev) {
      r.sweeps++;
      r.sweepHit = false;
      r.open = LEVIATHAN.jointOpen;
      const tail = r.segments![15];
      r.openX = tail[0];
      r.openY = tail[1];
      r.openZ = tail[2];
      cb.sound('boss');
    }
    const a = r.sweepAngle % (Math.PI * 2),
      lead = (r.sweepAngle + Math.PI / 2) % (Math.PI * 2),
      edge = 70;
    r.marks.push({ shape: 'line', x: this.cx, y: this.padY, z: this.cz, r: 1.6, x2: this.cx + Math.sin(a) * edge, y2: this.padY, z2: this.cz + Math.cos(a) * edge, color: '#ff7a3c', alpha: 0.85 });
    r.marks.push({ shape: 'line', x: this.cx, y: this.padY, z: this.cz, r: 1.2, x2: this.cx + Math.sin(lead) * edge, y2: this.padY, z2: this.cz + Math.cos(lead) * edge, color: '#ff7a3c', alpha: 0.3 });
    if (!r.sweepHit) {
      const dx = h.x - this.cx,
        dz = h.z - this.cz,
        dist = Math.hypot(dx, dz);
      const withinBand = dist >= 12 && dist <= 70;
      const withinHeight = Math.abs(h.y - this.padY) <= 3;
      let angDiff = Math.atan2(h.x - this.cx, h.z - this.cz) - a;
      angDiff = Math.atan2(Math.sin(angDiff), Math.cos(angDiff));
      if (h.grounded && withinBand && withinHeight && Math.abs(angDiff) <= LEVIATHAN.sweepArc / 2) {
        r.sweepHit = true;
        const nx = dx / (dist || 1),
          nz = dz / (dist || 1);
        cb.hurt(LEVIATHAN.sweepDamage, nx * 20, 10, nz * 20, this.cx, this.cz);
      }
    }
  }
  private updatePhase1(dt: number, h: HopperState, cb: CombatCallbacks) {
    const r = this.runtime;
    this.updateSweep(dt, LEVIATHAN.sweepPeriod, h, cb);
    if (r.phase >= 2 && r.sweeps >= LEVIATHAN.minSweeps) {
      r.state = 'breathTelegraph';
      r.timer = LEVIATHAN.breathTelegraph;
      r.open = 0;
      cb.sound('boss');
    }
  }
  private updateBreathTelegraph(dt: number, cb: CombatCallbacks) {
    const r = this.runtime;
    r.timer -= dt;
    r.telegraph = 1 - Math.max(0, r.timer) / LEVIATHAN.breathTelegraph;
    r.marks.push({ shape: 'disc', x: this.cx + r.breathSide * 30, y: this.padY + 1, z: this.cz, r: 60, color: '#ff7a24', alpha: 0.15 + 0.25 * r.telegraph });
    if (r.timer <= 0) {
      r.state = 'breath';
      r.timer = LEVIATHAN.breathDuration;
      r.breathTick = 0;
      r.openX = this.cx - r.breathSide * 10;
      r.openY = this.mawY;
      r.openZ = this.cz;
      r.open = LEVIATHAN.mawOpen;
      cb.sound('boss');
    }
  }
  private updateBreath(dt: number, h: HopperState, cb: CombatCallbacks) {
    const r = this.runtime;
    r.timer -= dt;
    r.breathTick -= dt;
    r.marks.push({ shape: 'disc', x: this.cx + r.breathSide * 30, y: this.padY + 1, z: this.cz, r: 60, color: '#ff7a24', alpha: 0.55 });
    if (r.breathTick <= 0) {
      r.breathTick += LEVIATHAN.breathTick;
      const dx = h.x - this.cx,
        dz = h.z - this.cz,
        dist = Math.hypot(dx, dz);
      const hotSide = (h.x - this.cx > 0 ? 1 : h.x - this.cx < 0 ? -1 : r.breathSide) === r.breathSide;
      if (hotSide && dist <= LEVIATHAN.breathRange) {
        cb.hurt(LEVIATHAN.breathDamagePerTick, (dx / (dist || 1)) * 10, 4, (dz / (dist || 1)) * 10, this.cx, this.cz);
      }
    }
    if (r.timer <= 0) {
      r.state = 'breathRest';
      r.timer = LEVIATHAN.breathRest;
      r.open = 0;
    }
  }
  private updateBreathRest(dt: number, cb: CombatCallbacks) {
    const r = this.runtime;
    r.timer -= dt;
    if (r.timer <= 0) {
      if (r.phase >= 3) {
        r.state = 'phase3';
        r.open = 0;
        r.uncoil = 0;
        r.cracked = [false, false, false];
        cb.sound('boss');
        return;
      }
      r.breathSide = r.breathSide === 1 ? -1 : 1;
      r.state = 'breathTelegraph';
      r.timer = LEVIATHAN.breathTelegraph;
    }
  }
  private updatePhase3(dt: number, h: HopperState, cb: CombatCallbacks) {
    const r = this.runtime;
    r.uncoil = Math.min(1, r.uncoil + dt / 2);
    this.updateSweep(dt, LEVIATHAN.sweepPeriodPhase3, h, cb);
    const idx = [4, 8, 12];
    let freshCrack = false;
    for (let k = 0; k < 3; k++) {
      const [sx, sy, sz] = r.segments![idx[k]];
      r.marks.push({ shape: 'sphere', x: sx, y: sy, z: sz, r: 5, color: '#ffb454', alpha: r.cracked[k] ? 0.25 : 0.5 + 0.3 * Math.sin(this.time * 6 + k) });
      if (r.cracked[k]) continue;
      for (const ev of h.events) {
        if (ev.kind === 'land' && ev.stomp) {
          const dh = Math.hypot(h.x - sx, h.z - sz),
            dy = Math.abs(h.y - sy);
          if (dh <= 7 && dy <= 6) {
            r.cracked[k] = true;
            freshCrack = true;
          }
        }
      }
    }
    if (freshCrack) {
      r.open = LEVIATHAN.coreOpen;
      r.openX = r.x;
      r.openY = r.y;
      r.openZ = r.z;
      cb.effect('spark', r.x, r.y, r.z);
      cb.sound('stomp');
    }
  }
  update(dt: number, h: HopperState, combat: Combat, cb: CombatCallbacks) {
    const r = this.runtime;
    if (!r.alive || !r.active) return;
    if (r.hitFlash > 0) r.hitFlash -= dt;
    if (r.open > 0) r.open = Math.max(0, r.open - dt);
    this.time += dt;
    r.marks = [];
    this.computeSegments();
    r.yaw = Math.atan2(h.x - r.x, h.z - r.z);
    this.takeHits(h, combat, cb);
    if (!r.alive) return;
    switch (r.state) {
      case 'countin':
        this.updateCountin(dt);
        break;
      case 'sweep':
        this.updatePhase1(dt, h, cb);
        break;
      case 'breathTelegraph':
        this.updateBreathTelegraph(dt, cb);
        break;
      case 'breath':
        this.updateBreath(dt, h, cb);
        break;
      case 'breathRest':
        this.updateBreathRest(dt, cb);
        break;
      case 'phase3':
        this.updatePhase3(dt, h, cb);
        break;
      default:
        break;
    }
  }
}

/** Shadows and Hopper's attacks in three dimensions. Pure simulation: the
 * renderer reads shadow positions, states and flashes; the engine feeds
 * Hopper's state and receives hurt/effect/sound callbacks.
 */
import { World } from './world';
import { MOVE, type HopperState } from './controller';
import type { District, ShadowKind, ShadowSpawn } from './district';

export type ShadowState = 'idle' | 'approach' | 'tell' | 'attack' | 'recover' | 'launched' | 'dead';
export interface Shadow {
  id: string;
  kind: ShadowKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  state: ShadowState;
  timer: number;
  cooldown: number;
  alive: boolean;
  /** Waiting for an earlier wave of its group to fall. */
  dormant: boolean;
  group: string;
  wave: number;
  homeX: number;
  homeY: number;
  homeZ: number;
  flying: boolean;
  rooted: boolean;
  /** Body: a vertical cylinder of this radius and height, feet at y. */
  radius: number;
  height: number;
  /** Seconds the core stays open after an attack. */
  open: number;
  hitFlash: number;
  telegraph: number;
  deadAt: number;
  patrol: number;
  phase: number;
  /** Squash for the renderer: throat inflate, bell pulse. */
  scale: number;
  grounded: boolean;
  spawnFlash: number;
}
export interface Projectile {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  radius: number;
  damage: number;
  gravity: number;
  /** 'shadow' hurts Hopper; 'hopper' hurts shadows (lasers and reflected shots). */
  owner: 'shadow' | 'hopper';
  kind: 'seed' | 'laser';
  ownerId?: string;
}
export interface CombatCallbacks {
  /** Returns true when the blow was blocked or parried. kx/ky/kz push away from the attacker. */
  hurt: (damage: number, kx: number, ky: number, kz: number, fromX: number, fromZ: number) => boolean;
  effect: (name: string, x: number, y: number, z: number) => void;
  sound: (name: string) => void;
  /** Hopper bounced off a shadow's back. */
  bounce: (shadow: Shadow) => void;
}

const SPECS: Record<ShadowKind, { hp: number; radius: number; height: number; flying: boolean; rooted: boolean; notice: number; range: number; tell: number; recover: number; cooldown: number }> = {
  shadeHound: { hp: 4, radius: 2.6, height: 3.2, flying: false, rooted: false, notice: 110, range: 30, tell: 0.55, recover: 0.9, cooldown: 1.6 },
  seedSpitter: { hp: 6, radius: 2.6, height: 5.5, flying: false, rooted: true, notice: 170, range: 170, tell: 0.7, recover: 1.2, cooldown: 2.4 },
  windowRay: { hp: 4, radius: 4.5, height: 1.6, flying: true, rooted: false, notice: 140, range: 140, tell: 0.75, recover: 1.6, cooldown: 2.2 },
};

const dist3 = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => Math.hypot(ax - bx, ay - by, az - bz);

export class Combat {
  shadows: Shadow[] = [];
  projectiles: Projectile[] = [];
  private nextProjectile = 1;
  time = 0;
  /** Hopper's attack timers, owned here so the tests can drive them. */
  kick = 0;
  kickCooldown = 0;
  kickHit = new Set<string>();
  heat = 0;
  overheated = 0;
  shotClock = 0;
  shield = 1;
  shieldBroken = 0;
  guarding = false;
  /** Locked target id, if any. */
  lock: string | null = null;
  constructor(readonly world: World, readonly district: District, private assist = false) {
    this.shadows = district.shadows.map((s) => this.make(s));
    this.wake();
  }
  private make(s: ShadowSpawn): Shadow {
    const spec = SPECS[s.kind];
    const y = s.mode === 'a' ? (s.y ?? 0) : this.world.heightAt(s.x, s.z) + (s.y ?? 0);
    const base = this.world.groundAt(s.x, s.z, y + 0.5).y;
    return {
      id: s.id, kind: s.kind, x: s.x, y: s.mode === 'a' ? y : Math.max(base, y), z: s.z, vx: 0, vy: 0, vz: 0, yaw: 0, hp: spec.hp, maxHp: spec.hp, state: 'idle', timer: 0, cooldown: 0.8 + (s.id.length % 4) * 0.3, alive: true, dormant: (s.wave ?? 0) > 0, group: s.group || s.id, wave: s.wave ?? 0, homeX: s.x, homeY: s.mode === 'a' ? y : Math.max(base, y), homeZ: s.z, flying: spec.flying, rooted: spec.rooted, radius: spec.radius, height: spec.height, open: 0, hitFlash: 0, telegraph: 0, deadAt: -1e9, patrol: s.patrol ?? 40, phase: Math.random() * Math.PI * 2, scale: 1, grounded: !spec.flying, spawnFlash: 0,
    };
  }
  /** Later waves wake when every earlier wave of their group is down. */
  private wake() {
    for (const s of this.shadows) {
      if (!s.dormant) continue;
      const earlier = this.shadows.filter((o) => o.group === s.group && o.wave < s.wave);
      if (earlier.every((o) => !o.alive)) {
        s.dormant = false;
        s.spawnFlash = 0.6;
      }
    }
  }
  /** Reset for a respawn: shadows ahead of the checkpoint return, the ones behind stay down. */
  resetToCheckpoint(z: number) {
    this.projectiles = [];
    this.shadows = this.shadows.map((s) => {
      const spawn = this.district.shadows.find((d) => d.id === s.id)!;
      if (s.homeZ < z - 60) return { ...this.make(spawn), cooldown: 1.2 };
      return s;
    });
    this.wake();
    this.kick = 0;
    this.heat = 0;
    this.overheated = 0;
    this.shield = 1;
    this.shieldBroken = 0;
  }
  aliveShadows(): Shadow[] {
    return this.shadows.filter((s) => s.alive && !s.dormant);
  }
  /** Nearest live shadow inside a cone from an origin along a direction. */
  pickTarget(x: number, y: number, z: number, dx: number, dy: number, dz: number, range: number, cone: number): Shadow | null {
    let best: Shadow | null = null,
      bestScore = Infinity;
    const dl = Math.hypot(dx, dy, dz) || 1;
    for (const s of this.aliveShadows()) {
      const cx = s.x - x,
        cy = s.y + s.height * 0.5 - y,
        cz = s.z - z,
        d = Math.hypot(cx, cy, cz);
      if (d > range || d < 1) continue;
      const cos = (cx * dx + cy * dy + cz * dz) / (d * dl);
      if (cos < Math.cos(cone)) continue;
      const score = d * (1.4 - cos);
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return best;
  }
  /** Hopper fires: two bolts toward the aimed target or straight ahead. */
  fire(x: number, y: number, z: number, dx: number, dy: number, dz: number, target: Shadow | null) {
    let tx = dx,
      ty = dy,
      tz = dz;
    if (target) {
      tx = target.x - x;
      ty = target.y + target.height * 0.5 - y;
      tz = target.z - z;
    }
    const l = Math.hypot(tx, ty, tz) || 1;
    for (const side of [-1.7, 1.7]) {
      const rx = Math.cos(Math.atan2(dx, dz)) * side,
        rz = -Math.sin(Math.atan2(dx, dz)) * side;
      this.projectiles.push({ id: this.nextProjectile++, x: x + rx, y, z: z + rz, vx: (tx / l) * 400, vy: (ty / l) * 400, vz: (tz / l) * 400, life: 0.7, radius: 0.8, damage: 1, gravity: 0, owner: 'hopper', kind: 'laser' });
    }
  }
  private spit(s: Shadow, h: HopperState) {
    const ox = s.x,
      oy = s.y + s.height * 0.8,
      oz = s.z;
    const lead = 0.6;
    const tx = h.x + h.vx * lead,
      ty = h.y + 7 + h.vy * lead * 0.5,
      tz = h.z + h.vz * lead;
    const dx = tx - ox,
      dz = tz - oz,
      dist = Math.hypot(dx, dz);
    const speed = Math.min(70, Math.max(35, dist * 0.55));
    const t = dist / speed;
    for (const a of [-0.22, 0, 0.22]) {
      const cos = Math.cos(a),
        sin = Math.sin(a);
      const vx = ((dx * cos - dz * sin) / dist) * speed,
        vz = ((dx * sin + dz * cos) / dist) * speed;
      const vy = (ty - oy) / t + 0.5 * 30 * t;
      this.projectiles.push({ id: this.nextProjectile++, x: ox, y: oy, z: oz, vx, vy, vz, life: 4, radius: 1.4, damage: 1, gravity: 30, owner: 'shadow', kind: 'seed', ownerId: s.id });
    }
  }
  damage(s: Shadow, amount: number, cb: CombatCallbacks, kx = 0, kz = 0) {
    if (!s.alive) return;
    s.hp -= amount;
    s.hitFlash = 0.18;
    if (!s.rooted && !s.flying) {
      s.vx += kx;
      s.vz += kz;
    }
    cb.effect('hit', s.x, s.y + s.height * 0.5, s.z);
    cb.sound('hit');
    if (s.hp <= 0) {
      s.alive = false;
      s.state = 'dead';
      s.deadAt = this.time;
      cb.effect('dissolve', s.x, s.y + s.height * 0.5, s.z);
      cb.sound('explode');
      if (this.lock === s.id) this.lock = null;
      this.wake();
    }
  }
  /** Spin kick: everything within reach, once per swing; parries shots early. */
  startKick(cb: CombatCallbacks) {
    if (this.kickCooldown > 0 || this.kick > 0) return false;
    this.kick = 0.5;
    this.kickCooldown = 0.55;
    this.kickHit.clear();
    cb.sound('kick');
    return true;
  }
  /** Dive stomp shockwave: damages and launches ground shadows. */
  shockwave(x: number, y: number, z: number, radius: number, cb: CombatCallbacks) {
    cb.effect('shockwave', x, y, z);
    cb.sound('stomp');
    for (const s of this.aliveShadows()) {
      const d = Math.hypot(s.x - x, s.z - z);
      if (d > radius + s.radius || Math.abs(s.y - y) > 8) continue;
      const nx = (s.x - x) / (d || 1),
        nz = (s.z - z) / (d || 1);
      this.damage(s, 5, cb, nx * 14, nz * 14);
      if (s.alive && !s.rooted && !s.flying) {
        s.state = 'launched';
        s.timer = 1.1;
        s.vy = 18;
        s.grounded = false;
      }
    }
  }
  update(dt: number, h: HopperState, cb: CombatCallbacks, aim: { x: number; y: number; z: number; dx: number; dy: number; dz: number; firing: boolean; guarding: boolean; kickPressed: boolean }) {
    this.time += dt;
    const world = this.world;
    // Hopper's attack timers.
    if (this.kickCooldown > 0) this.kickCooldown -= dt;
    if (aim.kickPressed && h.hitstun <= 0) this.startKick(cb);
    if (this.kick > 0) this.kick -= dt;
    // Guard.
    if (this.shieldBroken > 0) {
      this.shieldBroken -= dt;
      this.guarding = false;
    } else if (aim.guarding && this.shield > 0) {
      this.guarding = true;
      this.shield = Math.max(0, this.shield - dt * 0.15);
      if (this.shield <= 0) {
        this.shieldBroken = 0.6;
        this.guarding = false;
        cb.sound('shield');
      }
    } else {
      this.guarding = false;
      this.shield = Math.min(1, this.shield + dt * 0.5);
    }
    // Lasers.
    if (this.overheated > 0) this.overheated -= dt;
    if (aim.firing && this.overheated <= 0 && !this.guarding) {
      this.heat = Math.min(1, this.heat + dt / 3.5);
      this.shotClock -= dt;
      if (this.shotClock <= 0) {
        this.shotClock = 1 / 8;
        const locked = this.lock ? this.shadows.find((s) => s.id === this.lock && s.alive) || null : null;
        const target = locked || this.pickTarget(aim.x, aim.y, aim.z, aim.dx, aim.dy, aim.dz, 250, Math.PI / 6) || this.pickTarget(aim.x, aim.y, aim.z, aim.dx, -0.6, aim.dz, 160, Math.PI / 4);
        this.fire(aim.x, aim.y, aim.z, aim.dx, aim.dy, aim.dz, target);
        cb.sound('laser');
      }
      if (this.heat >= 1) {
        this.overheated = 1.2;
        cb.sound('ui');
      }
    } else {
      this.heat = Math.max(0, this.heat - dt / 2);
      this.shotClock = 0;
    }
    // Kick: active window sweeps everything around Hopper once.
    const kickActive = this.kick > 0.15 && this.kick < 0.42;
    if (kickActive) {
      for (const s of this.aliveShadows()) {
        if (this.kickHit.has(s.id)) continue;
        const d = Math.hypot(s.x - h.x, s.z - h.z);
        const vertical = s.y + s.height > h.y - 2 && s.y < h.y + MOVE.height + 2;
        if (d <= 7 + MOVE.radius + s.radius && vertical) {
          this.kickHit.add(s.id);
          const nx = (s.x - h.x) / (d || 1),
            nz = (s.z - h.z) / (d || 1);
          this.damage(s, 4, cb, nx * 22, nz * 22);
          if (s.alive && s.state === 'tell') {
            s.state = 'recover';
            s.timer = 1.0;
            s.open = 1.0;
          }
          if (s.alive && s.flying) {
            s.state = 'recover';
            s.timer = 1.4;
          }
        }
      }
    }
    // Projectiles.
    const parryWindow = this.kick > 0.36;
    for (const p of this.projectiles) {
      p.life -= dt;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.life <= 0) continue;
      if (p.y < world.groundAt(p.x, p.z, p.y + 1).y) {
        p.life = 0;
        cb.effect(p.kind === 'laser' ? 'spark' : 'splat', p.x, p.y, p.z);
        continue;
      }
      if (p.owner === 'shadow') {
        const dx = p.x - h.x,
          dz = p.z - h.z,
          dh = Math.hypot(dx, dz);
        const near = dh <= MOVE.radius + p.radius && p.y >= h.y - p.radius && p.y <= h.y + MOVE.height + p.radius;
        if (!near) continue;
        const fromFront = (dx * Math.sin(h.yaw) + dz * Math.cos(h.yaw)) / (dh || 1) > 0.35;
        if (parryWindow || (this.guarding && fromFront)) {
          // Reflect toward the shooter.
          const owner = this.shadows.find((s) => s.id === p.ownerId);
          const tx = (owner?.x ?? p.x - p.vx) - p.x,
            ty = (owner ? owner.y + owner.height * 0.5 : p.y) - p.y,
            tz = (owner?.z ?? p.z - p.vz) - p.z,
            l = Math.hypot(tx, ty, tz) || 1;
          p.vx = (tx / l) * 120;
          p.vy = (ty / l) * 120;
          p.vz = (tz / l) * 120;
          p.gravity = 0;
          p.owner = 'hopper';
          p.damage = 6;
          p.life = 3;
          if (!parryWindow) this.shield = Math.max(0, this.shield - 0.25);
          cb.effect('parry', p.x, p.y, p.z);
          cb.sound('shield');
          continue;
        }
        p.life = 0;
        const kx = -dx / (dh || 1),
          kz = -dz / (dh || 1);
        cb.hurt(p.damage, -kx * 18, 8, -kz * 18, p.x, p.z);
      } else {
        for (const s of this.aliveShadows()) {
          const d = dist3(p.x, p.y, p.z, s.x, s.y + s.height * 0.5, s.z);
          if (d <= s.radius + p.radius + (p.kind === 'laser' ? 1.5 : 0)) {
            p.life = 0;
            this.damage(s, p.damage, cb);
            break;
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
    // Shadows.
    for (const s of this.shadows) {
      if (!s.alive || s.dormant) continue;
      if (s.hitFlash > 0) s.hitFlash -= dt;
      if (s.spawnFlash > 0) s.spawnFlash -= dt;
      if (s.open > 0) s.open -= dt;
      if (s.cooldown > 0) s.cooldown -= dt;
      const tellScale = this.assist ? 1.5 : 1;
      const spec = SPECS[s.kind];
      const dx = h.x - s.x,
        dz = h.z - s.z,
        dh = Math.hypot(dx, dz),
        dy = h.y + 7 - (s.y + s.height * 0.5);
      const d3 = Math.hypot(dh, dy);
      s.telegraph = s.state === 'tell' ? 1 - s.timer / (spec.tell * tellScale) : 0;
      switch (s.kind) {
        case 'shadeHound': {
          if (s.state === 'launched') {
            s.timer -= dt;
            if (s.grounded && s.timer <= 0) {
              s.state = 'recover';
              s.timer = 0.6;
              s.open = 0.6;
            }
          } else if (s.state === 'idle') {
            // Patrol around home; notice Hopper.
            s.phase += dt * 0.6;
            const px = s.homeX + Math.cos(s.phase) * s.patrol * 0.5,
              pz = s.homeZ + Math.sin(s.phase) * s.patrol * 0.5;
            this.walkToward(s, px, pz, 8);
            if (d3 < spec.notice) s.state = 'approach';
          } else if (s.state === 'approach') {
            this.walkToward(s, h.x, h.z, 20);
            if (d3 > spec.notice * 1.5) s.state = 'idle';
            else if (dh < spec.range && Math.abs(dy) < 30 && s.cooldown <= 0 && s.grounded) {
              s.state = 'tell';
              s.timer = spec.tell * tellScale;
              s.vx = s.vz = 0;
              cb.sound('boss');
            }
          } else if (s.state === 'tell') {
            s.timer -= dt;
            s.yaw = Math.atan2(dx, dz);
            if (s.timer <= 0) {
              // Pounce toward where Hopper will be.
              const lead = 0.35,
                tx = h.x + h.vx * lead - s.x,
                tz = h.z + h.vz * lead - s.z,
                tl = Math.hypot(tx, tz) || 1;
              const speed = Math.min(36, Math.max(18, tl / 1.0));
              s.vx = (tx / tl) * speed;
              s.vz = (tz / tl) * speed;
              s.vy = 15 + Math.max(0, Math.min(14, dy * 0.6));
              s.grounded = false;
              s.state = 'attack';
              s.timer = 1.6;
              s.cooldown = spec.cooldown;
            }
          } else if (s.state === 'attack') {
            s.timer -= dt;
            // Contact while pouncing.
            if (dh <= MOVE.radius + s.radius && h.y + MOVE.height > s.y && h.y < s.y + s.height + 1) {
              const nx = dx / (dh || 1),
                nz = dz / (dh || 1);
              const blocked = cb.hurt(1, nx * 22, 9, nz * 22, s.x, s.z);
              s.state = 'recover';
              s.timer = blocked ? 1.2 : 0.8;
              s.open = 1.0;
              s.vx = -nx * 10;
              s.vz = -nz * 10;
            } else if (s.grounded || s.timer <= 0) {
              s.state = 'recover';
              s.timer = spec.recover;
              s.open = spec.recover;
            }
          } else if (s.state === 'recover') {
            s.timer -= dt;
            const k = Math.max(0, 1 - 6 * dt);
            s.vx *= k;
            s.vz *= k;
            if (s.timer <= 0) s.state = 'approach';
          }
          this.fall(s, dt);
          break;
        }
        case 'seedSpitter': {
          s.scale = 1 + (s.state === 'tell' ? s.telegraph * 0.35 : 0);
          s.yaw = Math.atan2(dx, dz);
          if (s.state === 'idle' || s.state === 'approach') {
            if (d3 < spec.range && s.cooldown <= 0) {
              s.state = 'tell';
              s.timer = spec.tell * tellScale;
              cb.sound('boss');
            }
          } else if (s.state === 'tell') {
            s.timer -= dt;
            if (s.timer <= 0) {
              this.spit(s, h);
              s.state = 'recover';
              s.timer = spec.recover;
              s.open = spec.recover;
              s.cooldown = spec.cooldown;
              cb.sound('laser');
            }
          } else if (s.state === 'recover') {
            s.timer -= dt;
            if (s.timer <= 0) s.state = 'idle';
          } else if (s.state === 'launched') {
            s.state = 'recover';
            s.timer = 0.5;
          }
          break;
        }
        case 'windowRay': {
          if (s.state === 'idle' || s.state === 'approach') {
            // Hang in the air, drifting in a slow circle around home.
            s.phase += dt * 0.35;
            const px = s.homeX + Math.cos(s.phase) * 26,
              pz = s.homeZ + Math.sin(s.phase) * 26,
              py = s.homeY + Math.sin(s.phase * 2) * 4;
            this.flyToward(s, px, py, pz, 14, dt);
            if (d3 < spec.notice && s.cooldown <= 0 && dy < 20) {
              s.state = 'tell';
              s.timer = spec.tell * tellScale;
              s.vx = s.vy = s.vz = 0;
              cb.sound('boss');
            }
          } else if (s.state === 'tell') {
            s.timer -= dt;
            s.yaw = Math.atan2(dx, dz);
            if (s.timer <= 0) {
              const tx = h.x - s.x,
                ty = h.y + 6 - s.y,
                tz = h.z - s.z,
                tl = Math.hypot(tx, ty, tz) || 1;
              s.vx = (tx / tl) * 48;
              s.vy = (ty / tl) * 48;
              s.vz = (tz / tl) * 48;
              s.state = 'attack';
              s.timer = Math.min(1.5, tl / 48 + 0.25);
              s.cooldown = spec.cooldown;
            }
          } else if (s.state === 'attack') {
            s.timer -= dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.z += s.vz * dt;
            const floor = world.groundAt(s.x, s.z, s.y + 1).y + 3;
            if (s.y < floor) s.y = floor;
            if (dh <= MOVE.radius + s.radius && h.y + MOVE.height > s.y - 1 && h.y < s.y + s.height + 1 && h.y + 2 < s.y + s.height) {
              const nx = dx / (dh || 1),
                nz = dz / (dh || 1);
              cb.hurt(1, nx * 20, 6, nz * 20, s.x, s.z);
              s.state = 'recover';
              s.timer = spec.recover;
            } else if (s.timer <= 0) {
              s.state = 'recover';
              s.timer = spec.recover;
            }
          } else if (s.state === 'recover') {
            s.timer -= dt;
            this.flyToward(s, s.homeX, s.homeY, s.homeZ, 22, dt);
            if (s.timer <= 0) s.state = 'idle';
          } else if (s.state === 'launched') {
            s.state = 'recover';
            s.timer = 1;
          }
          break;
        }
      }
    }
    // Stomp bounce: Hopper's feet land on a shadow's back from above.
    if (!h.grounded && h.vy < 0) {
      for (const s of this.aliveShadows()) {
        const top = s.y + s.height;
        const dh = Math.hypot(s.x - h.x, s.z - h.z);
        if (dh <= s.radius + MOVE.radius * 0.7 && h.y <= top + 1.2 && h.y >= top - Math.max(1.5, -h.vy * dt * 1.5)) {
          this.damage(s, 5, cb);
          cb.bounce(s);
          if (s.alive && s.flying) {
            s.state = 'recover';
            s.timer = 1.2;
          }
          break;
        }
      }
    }
  }
  private walkToward(s: Shadow, tx: number, tz: number, speed: number) {
    const dx = tx - s.x,
      dz = tz - s.z,
      d = Math.hypot(dx, dz);
    if (d < 1.5) {
      s.vx *= 0.8;
      s.vz *= 0.8;
      return;
    }
    s.vx = (dx / d) * speed;
    s.vz = (dz / d) * speed;
    s.yaw = Math.atan2(dx, dz);
  }
  private flyToward(s: Shadow, tx: number, ty: number, tz: number, speed: number, dt: number) {
    const dx = tx - s.x,
      dy = ty - s.y,
      dz = tz - s.z,
      d = Math.hypot(dx, dy, dz);
    const k = Math.min(1, 3 * dt);
    if (d > 0.5) {
      s.vx += ((dx / d) * speed - s.vx) * k;
      s.vy += ((dy / d) * speed - s.vy) * k;
      s.vz += ((dz / d) * speed - s.vz) * k;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;
    if (Math.hypot(s.vx, s.vz) > 2) s.yaw = Math.atan2(s.vx, s.vz);
  }
  /** Ground shadows follow the surface; airborne ones fall onto it. */
  private fall(s: Shadow, dt: number) {
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    const surface = this.world.groundAt(s.x, s.z, Math.max(s.y, s.y + s.vy * dt) + 0.5).y;
    if (s.grounded) {
      if (surface < s.y - 3) {
        s.grounded = false;
        s.vy = 0;
      } else s.y = surface;
    }
    if (!s.grounded) {
      s.vy -= 30 * dt;
      s.y += s.vy * dt;
      if (s.y <= surface && s.vy <= 0) {
        s.y = surface;
        s.vy = 0;
        s.grounded = true;
        if (s.state === 'attack') {
          s.state = 'recover';
          s.timer = SPECS[s.kind].recover;
          s.open = s.timer;
        }
      }
    }
  }
}

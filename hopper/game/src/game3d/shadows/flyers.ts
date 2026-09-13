/** flyers shadows of missions two and three. See LEVEL-PLAN-M2-M3.md for
 * each kind's contract; the numbers are in combat3d's SPECS. */
import type { Shadow, ShadowBehaviour, ShadowContext } from '../combat3d';
import type { ShadowKind } from '../district';
import type { Instance } from '../world';
import { MOVE } from '../controller';

// Two kinds need a target that outlives one frame (the manta's dragged
// platform, the skate's phase destination); a shadow doesn't have a spare
// field for it, so it's kept here, keyed by the shadow itself.
const mantaTarget = new WeakMap<Shadow, Instance | null>();
const skateTarget = new WeakMap<Shadow, { x: number; z: number }>();

const chainManta: ShadowBehaviour = {
  update({ s, h, world, combat, cb, dt, spec, tellScale, dx, dz, dh, d3 }: ShadowContext) {
    if (s.state === 'idle' || s.state === 'approach') {
      // Drift round home, same slow circle as windowRay, and under Hopper
      // once he is near: its dive comes up at him.
      s.phase += dt * 0.35;
      const near = d3 < spec.notice * 1.4;
      const px = s.homeX + Math.cos(s.phase) * 30,
        pz = s.homeZ + Math.sin(s.phase) * 30,
        py = near ? combat.stalkHeight(s, h, world, 24) : s.homeY + Math.sin(s.phase * 2) * 4;
      combat.flyToward(s, px, py, pz, near ? 24 : 14, dt);
      if (d3 < spec.notice && s.cooldown <= 0) {
        s.state = 'tell';
        s.timer = spec.tell * tellScale;
        s.vx = s.vy = s.vz = 0;
        cb.sound('boss');
      }
    } else if (s.state === 'tell') {
      // The tether drops toward Hopper as it picks its line.
      s.timer -= dt;
      s.yaw = Math.atan2(dx, dz);
      if (s.timer <= 0) {
        // The nearest moving structure within reach of Hopper, if any.
        let best: Instance | null = null,
          bestD = 140;
        for (const inst of world.instances) {
          if (!inst.moving) continue;
          const d = Math.hypot(inst.object.position.x - h.x, inst.object.position.z - h.z);
          if (d <= bestD) {
            bestD = d;
            best = inst;
          }
        }
        mantaTarget.set(s, best);
        s.open = 2.0;
        s.cooldown = spec.cooldown;
        s.state = 'attack';
        if (best) {
          best.moving!.boost = 2.0;
          s.timer = 2.0;
        } else {
          // Nothing to drag: dive at Hopper like a windowRay instead.
          const tx = h.x - s.x,
            ty = h.y + 6 - s.y,
            tz = h.z - s.z,
            tl = Math.hypot(tx, ty, tz) || 1;
          s.vx = (tx / tl) * 48;
          s.vy = (ty / tl) * 48;
          s.vz = (tz / tl) * 48;
          s.timer = Math.min(1.5, tl / 48 + 0.25);
        }
      }
    } else if (s.state === 'attack') {
      s.timer -= dt;
      const target = mantaTarget.get(s);
      if (target) {
        // Hover over the platform it is hauling.
        combat.flyToward(s, target.object.position.x, target.object.position.y + 30, target.object.position.z, 40, dt);
        if (s.timer <= 0) {
          mantaTarget.delete(s);
          s.state = 'recover';
          s.timer = spec.recover;
        }
      } else {
        // The windowRay-style dive: fixed velocity, clamped above the ground.
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        const floor = world.groundAt(s.x, s.z, s.y + 1).y + Math.max(3, s.height * 0.5);
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
      }
    } else if (s.state === 'recover') {
      s.timer -= dt;
      combat.flyToward(s, s.homeX, s.homeY, s.homeZ, 22, dt);
      if (s.timer <= 0) s.state = 'idle';
    } else if (s.state === 'launched') {
      s.state = 'recover';
      s.timer = 1.0;
    }
  },
};

const turbineWasp: ShadowBehaviour = {
  update({ s, h, world, combat, cb, dt, spec, tellScale, dx, dz, dh, dy, d3 }: ShadowContext) {
    if (s.state === 'idle' || s.state === 'approach') {
      s.phase += dt * 0.4;
      const px = s.homeX + Math.cos(s.phase) * 22,
        pz = s.homeZ + Math.sin(s.phase) * 22,
        py = s.homeY + Math.sin(s.phase * 2) * 3;
      combat.flyToward(s, px, py, pz, 18, dt);
      if (d3 < spec.notice && s.cooldown <= 0 && dy < 20) {
        s.state = 'tell';
        s.timer = spec.tell * tellScale;
        s.vx = s.vy = s.vz = 0;
        cb.sound('boss');
      }
    } else if (s.state === 'tell') {
      // Intake contracts as it winds up.
      s.timer -= dt;
      s.yaw = Math.atan2(dx, dz);
      s.scale = 1 - s.telegraph * 0.2;
      if (s.timer <= 0) {
        const tx = h.x - s.x,
          ty = h.y + 6 - s.y,
          tz = h.z - s.z,
          tl = Math.hypot(tx, ty, tz) || 1;
        s.vx = (tx / tl) * 70;
        s.vy = (ty / tl) * 70;
        s.vz = (tz / tl) * 70;
        s.scale = 1;
        s.state = 'attack';
        s.timer = 1.2;
        s.cooldown = spec.cooldown;
      }
    } else if (s.state === 'attack') {
      s.timer -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      const floor = world.groundAt(s.x, s.z, s.y + 1).y + Math.max(3, s.height * 0.5);
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
      combat.flyToward(s, s.homeX, s.homeY, s.homeZ, 22, dt);
      if (s.timer <= 0) s.state = 'idle';
    } else if (s.state === 'stalled') {
      // Kicked out of the air: drops 6m in the first half second, then
      // hangs dead still as a platform until the stall runs out.
      s.stall -= dt;
      s.scale = 0.9;
      const elapsed = 5 - s.stall;
      if (elapsed < 0.5) s.y -= 12 * dt;
      s.vx = s.vy = s.vz = 0;
      if (s.stall <= 0) {
        s.stall = 0;
        s.scale = 1;
        s.state = 'idle';
      }
    } else if (s.state === 'launched') {
      s.state = 'recover';
      s.timer = 1.0;
    }
  },
  onKick({ s }: ShadowContext) {
    s.state = 'stalled';
    s.stall = 5;
    s.open = 5;
    s.vx = s.vy = s.vz = 0;
  },
  onStomp({ s }: ShadowContext) {
    // Full damage already landed (the generic stomp handles that); stomping
    // it while it's stalled is just free damage, not a fresh recovery.
    if (s.state === 'stalled') return;
    s.state = 'recover';
    s.timer = 1.2;
  },
};

const veilMedusa: ShadowBehaviour = {
  update({ s, h, combat, cb, dt, spec, tellScale, dx, dz, dh, d3 }: ShadowContext) {
    if (s.state === 'idle' || s.state === 'approach') {
      // Drift toward Hopper, but never closer than 12m: aim short of him.
      const short = Math.max(0, dh - 12),
        len = dh || 1,
        tx = s.x + (dx / len) * short,
        tz = s.z + (dz / len) * short;
      combat.flyToward(s, tx, h.y + 7, tz, 9, dt);
      if (d3 < spec.notice && s.cooldown <= 0) {
        s.state = 'tell';
        s.timer = spec.tell * tellScale;
        cb.sound('boss');
      }
    } else if (s.state === 'tell') {
      // The bell flashes as it fills.
      s.timer -= dt;
      s.yaw = Math.atan2(dx, dz);
      s.scale = 1 + s.telegraph * 0.4;
      if (s.timer <= 0) {
        s.cooldown = spec.cooldown;
        if (d3 < 24 + MOVE.radius) {
          const nx = dx / (dh || 1),
            nz = dz / (dh || 1);
          cb.hurt(1, nx * 18, 10, nz * 18, s.x, s.z);
        }
        cb.effect('shockwave', s.x, s.y, s.z);
        s.state = 'recover';
        s.timer = spec.recover;
        s.open = spec.recover;
      }
    } else if (s.state === 'recover') {
      s.timer -= dt;
      // Ease the bell back down as the pulse settles, no flight home: it
      // simply resumes drifting toward Hopper from wherever it is.
      s.scale = 1 + Math.max(0, s.timer / spec.recover) * 0.4;
      const k = Math.max(0, 1 - 6 * dt);
      s.vx *= k;
      s.vy *= k;
      s.vz *= k;
      if (s.timer <= 0) {
        s.scale = 1;
        s.state = 'idle';
      }
    } else if (s.state === 'launched') {
      s.state = 'recover';
      s.timer = 1.0;
    }
  },
};

const phaseSkate: ShadowBehaviour = {
  update({ s, h, world, combat, cb, dt, spec, dx, dz, dh, d3 }: ShadowContext) {
    // True only in 'phased'; every other branch below clears it explicitly.
    s.phased = s.state === 'phased';
    if (s.state === 'idle' || s.state === 'approach') {
      s.phase += dt * 0.3;
      const px = s.homeX + Math.cos(s.phase) * 26,
        pz = s.homeZ + Math.sin(s.phase) * 26;
      combat.flyToward(s, px, s.homeY, pz, 20, dt);
      const floor = world.groundAt(s.x, s.z, s.y + 1).y + 3;
      if (s.y < floor) s.y = floor;
      if (d3 < spec.notice && s.cooldown <= 0) {
        // Fade out and set the point it will reappear at: 30m from Hopper,
        // on the side it is already on, so it arrives there mid-phase.
        const side = dh > 0.01 ? -dx / dh : 0,
          sidez = dh > 0.01 ? -dz / dh : 1;
        skateTarget.set(s, { x: h.x + side * 30, z: h.z + sidez * 30 });
        s.cooldown = spec.cooldown;
        s.state = 'phased';
        s.timer = 0.5;
        cb.sound('boss');
      }
    } else if (s.state === 'phased') {
      s.timer -= dt;
      const target = skateTarget.get(s) ?? { x: h.x, z: h.z };
      combat.flyToward(s, target.x, s.y, target.z, 90, dt);
      if (s.timer <= 0) {
        s.x = target.x;
        s.z = target.z;
        const floor = world.groundAt(s.x, s.z, s.y + 1).y + 3;
        if (s.y < floor) s.y = floor;
        s.vx = s.vy = s.vz = 0;
        s.phased = false;
        s.open = 0.4;
        s.state = 'silhouette';
        s.timer = 0.4;
        s.yaw = Math.atan2(h.x - s.x, h.z - s.z);
      }
    } else if (s.state === 'silhouette') {
      s.timer -= dt;
      s.vx = s.vy = s.vz = 0;
      s.yaw = Math.atan2(dx, dz);
      if (s.timer <= 0) {
        const tx = h.x - s.x,
          ty = h.y + 6 - s.y,
          tz = h.z - s.z,
          tl = Math.hypot(tx, ty, tz) || 1;
        s.vx = (tx / tl) * 80;
        s.vy = (ty / tl) * 80;
        s.vz = (tz / tl) * 80;
        s.state = 'attack';
        s.timer = 0.6;
      }
    } else if (s.state === 'attack') {
      s.timer -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      const floor = world.groundAt(s.x, s.z, s.y + 1).y + Math.max(3, s.height * 0.5);
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
      combat.flyToward(s, s.homeX, s.homeY, s.homeZ, 22, dt);
      if (s.timer <= 0) s.state = 'idle';
    } else if (s.state === 'launched') {
      s.state = 'recover';
      s.timer = 1.0;
    }
  },
};

const gravityCantor: ShadowBehaviour = {
  update({ s, world, combat, cb, dt, spec, tellScale, dx, dz, d3 }: ShadowContext) {
    if (s.state === 'idle' || s.state === 'approach') {
      // A wide, high circle round home -- it never dives to Hopper's level.
      s.phase += dt * 0.2;
      const px = s.homeX + Math.cos(s.phase) * 40,
        pz = s.homeZ + Math.sin(s.phase) * 40;
      combat.flyToward(s, px, s.homeY, pz, 12, dt);
      if (d3 < spec.notice && s.cooldown <= 0) {
        s.state = 'tell';
        s.timer = spec.tell * tellScale;
        s.vx = s.vy = s.vz = 0;
        cb.sound('boss');
      }
    } else if (s.state === 'tell') {
      // Prongs count in, a long wind-up before the flip lands.
      s.timer -= dt;
      s.yaw = Math.atan2(dx, dz);
      s.scale = 1 + s.telegraph * 0.25;
      if (s.timer <= 0) {
        world.flip(s.x, s.z, 30, world.heightAt(s.x, s.z) - 5, s.y + 10, 4.0);
        cb.effect('flip', s.x, s.y, s.z);
        s.scale = 1;
        s.cooldown = spec.cooldown;
        s.state = 'attack';
        s.timer = 4.0;
      }
    } else if (s.state === 'attack') {
      // Holds its station over the flipped column while it lasts.
      s.timer -= dt;
      s.vx = s.vy = s.vz = 0;
      if (s.timer <= 0) {
        s.state = 'recover';
        s.timer = spec.recover;
        s.open = spec.recover;
      }
    } else if (s.state === 'recover') {
      s.timer -= dt;
      const k = Math.max(0, 1 - 4 * dt);
      s.vx *= k;
      s.vy *= k;
      s.vz *= k;
      if (s.timer <= 0) s.state = 'idle';
    } else if (s.state === 'launched') {
      s.state = 'recover';
      s.timer = 1.0;
    }
  },
};

export const FLYERS: Partial<Record<ShadowKind, ShadowBehaviour>> = {
  chainManta,
  turbineWasp,
  veilMedusa,
  phaseSkate,
  gravityCantor,
};

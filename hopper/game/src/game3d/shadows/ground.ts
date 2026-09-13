/** ground shadows of missions two and three. See LEVEL-PLAN-M2-M3.md for
 * each kind's contract; the numbers are in combat3d's SPECS. */
import { MOVE } from '../controller';
import type { ShadowBehaviour, ShadowContext, ShadowState } from '../combat3d';
import type { ShadowKind } from '../district';

/** The melee contact test every ground lunge/charge in this file shares:
 * Hopper's cylinder against the shadow's, at its current position. */
function contact(ctx: ShadowContext): boolean {
  const { s, h, dh } = ctx;
  return dh <= MOVE.radius + s.radius && h.y + MOVE.height > s.y && h.y < s.y + s.height + 1;
}

/** Furnace Hound: patrols and closes like a shade hound, but its attack is a
 * fixed-line charge rather than a pounce. The line is set once, at the end
 * of the tell, so side-stepping during the charge works. */
const CHARGE_SPEED = 62;
function furnaceHound(ctx: ShadowContext) {
  const { s, h, dt, spec, tellScale, dx, dz, dh, dy, cb, combat, d3 } = ctx;
  if (s.state === 'launched') {
    s.timer -= dt;
    if (s.grounded && s.timer <= 0) {
      s.state = 'recover';
      s.timer = 0.6;
      s.open = 0.6;
    }
  } else if (s.state === 'idle') {
    s.phase += dt * 0.6;
    const px = s.homeX + Math.cos(s.phase) * s.patrol * 0.5,
      pz = s.homeZ + Math.sin(s.phase) * s.patrol * 0.5;
    combat.walkToward(s, px, pz, 8);
    if (d3 < spec.notice) s.state = 'approach';
  } else if (s.state === 'approach') {
    combat.walkToward(s, h.x, h.z, 27);
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
      // The charge line is fixed here -- it does not re-track Hopper.
      const nx = dx / (dh || 1),
        nz = dz / (dh || 1);
      s.vx = nx * CHARGE_SPEED;
      s.vz = nz * CHARGE_SPEED;
      s.state = 'attack';
      s.timer = 1.4;
      s.cooldown = spec.cooldown;
      s.phase = 0;
    }
  } else if (s.state === 'attack') {
    if (contact(ctx)) {
      const nx = dx / (dh || 1),
        nz = dz / (dh || 1);
      cb.hurt(2, nx * 28, 10, nz * 28, s.x, s.z);
      s.state = 'recover';
      s.timer = 0.7;
      s.open = 1.0;
    } else {
      s.timer -= dt;
      if (s.timer <= 0) {
        s.state = 'recover';
        s.timer = 0.7;
        s.open = 1.0;
      }
    }
  } else if (s.state === 'recover') {
    // The skid: velocity bleeds off so a stomp mid-skid still lands.
    s.timer -= dt;
    const k = Math.max(0, 1 - 6 * dt);
    s.vx *= k;
    s.vz *= k;
    if (s.timer <= 0) s.state = 'approach';
  }
  const charging = s.state === 'attack';
  const px = s.x,
    pz = s.z;
  combat.fall(s, dt, cb);
  if (charging) {
    // A wall (or anything else that stops it cold) ends the charge early:
    // two steps of barely moving reads the same as hitting something.
    const moved = Math.hypot(s.x - px, s.z - pz);
    if (moved < 0.4 * CHARGE_SPEED * dt) {
      s.phase += 1;
      if (s.phase >= 2) {
        s.state = 'recover';
        s.timer = 0.7;
        s.open = 1.0;
      }
    } else s.phase = 0;
  }
}

/** Ballast Crab: a slow armoured slammer. It walks Hopper down, rears, and
 * drops a ground shockwave that only threatens him while he's grounded. */
function ballastCrab(ctx: ShadowContext) {
  const { s, h, dt, spec, tellScale, dx, dz, dh, cb, combat, d3 } = ctx;
  s.scale = 1 + (s.state === 'tell' ? ctx.s.telegraph * 0.25 : 0);
  if (s.state === 'launched') {
    s.timer -= dt;
    if (s.grounded && s.timer <= 0) {
      s.state = 'recover';
      s.timer = 0.6;
      s.open = 0.6;
    }
  } else if (s.state === 'idle') {
    s.phase += dt * 0.4;
    const px = s.homeX + Math.cos(s.phase) * s.patrol * 0.5,
      pz = s.homeZ + Math.sin(s.phase) * s.patrol * 0.5;
    combat.walkToward(s, px, pz, 4);
    if (d3 < spec.notice) s.state = 'approach';
  } else if (s.state === 'approach') {
    combat.walkToward(s, h.x, h.z, 16);
    if (d3 > spec.notice * 1.5) s.state = 'idle';
    else if (dh < spec.range && s.cooldown <= 0 && s.grounded) {
      s.state = 'tell';
      s.timer = spec.tell * tellScale;
      s.vx = s.vz = 0;
      s.yaw = Math.atan2(dx, dz);
      cb.sound('boss');
    }
  } else if (s.state === 'tell') {
    s.timer -= dt;
    s.yaw = Math.atan2(dx, dz);
    if (s.timer <= 0) {
      combat.groundShock(s.x, s.y, s.z, 22, 1, h, cb);
      s.state = 'recover';
      s.timer = 1.2;
      s.open = 1.4;
      s.cooldown = spec.cooldown;
    }
  } else if (s.state === 'recover') {
    s.timer -= dt;
    if (s.timer <= 0) s.state = 'approach';
  }
  combat.fall(s, dt, cb);
}

/** Basalt Burrower: hidden under the terrain until it erupts. It manages its
 * own y while buried and never calls `fall` there -- fall's ground-snapping
 * is for surfaced shadows, and this one is hiding below the ground it. */
function basaltBurrower(ctx: ShadowContext) {
  const { s, h, dt, spec, tellScale, dh, cb, combat, world } = ctx;
  if (s.state === 'launched') {
    s.timer -= dt;
    combat.fall(s, dt, cb);
    if (s.grounded && s.timer <= 0) {
      s.state = 'recover';
      s.timer = 0.6;
      s.open = 0.6;
    }
    return;
  }
  if (s.state === 'idle' || s.state === 'burrow') {
    s.underground = true;
    s.state = 'burrow';
    const outOfRange = dh > spec.notice;
    // Chase where Hopper is headed, not where he is now; out of notice, it
    // just idles under its own home instead of trailing off the map.
    const tx = outOfRange ? s.homeX : h.x + h.vx * 0.4,
      tz = outOfRange ? s.homeZ : h.z + h.vz * 0.4;
    combat.walkToward(s, tx, tz, 20);
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    s.y = world.heightAt(s.x, s.z) - s.height;
    if (!outOfRange && Math.hypot(tx - s.x, tz - s.z) < 12 && s.cooldown <= 0) {
      s.state = 'tell';
      s.timer = spec.tell * tellScale;
      s.vx = s.vz = 0;
      cb.sound('boss');
      // The crack traces it from above -- once, right as the tell starts.
      cb.effect('crack', s.x, world.heightAt(s.x, s.z), s.z);
    }
    return;
  }
  if (s.state === 'tell') {
    s.timer -= dt;
    s.y = world.heightAt(s.x, s.z) - s.height;
    if (s.timer <= 0) {
      s.underground = false;
      s.y = world.heightAt(s.x, s.z);
      s.vy = 40;
      s.grounded = false;
      s.cooldown = spec.cooldown;
      combat.groundShock(s.x, s.y, s.z, 14, 1, h, cb);
      s.state = 'attack';
    }
    return;
  }
  if (s.state === 'attack') {
    // Airborne until fall() lands it -- fall() then opens the core itself;
    // stretch that to the longer window the level plan calls for.
    combat.fall(s, dt, cb);
    // fall() may have just landed and moved it into recover itself; TS still
    // sees s.state as 'attack' here, so read it through a widened type.
    if ((s.state as ShadowState) === 'recover') s.open = 1.5;
    return;
  }
  if (s.state === 'recover') {
    s.timer -= dt;
    combat.fall(s, dt, cb);
    if (s.timer <= 0) {
      s.state = 'burrow';
      s.underground = true;
    }
  }
}

/** Mirror Stalker, floor: a masked lunger that patrols and closes like a
 * hound, then commits to a straight lunge aimed at where Hopper is headed. */
function mirrorStalkerFloor(ctx: ShadowContext) {
  const { s, h, dt, spec, tellScale, dx, dz, dh, dy, cb, combat, d3 } = ctx;
  s.scale = 1 + (s.state === 'tell' ? ctx.s.telegraph * 0.15 : 0);
  if (s.state === 'launched') {
    s.timer -= dt;
    if (s.grounded && s.timer <= 0) {
      s.state = 'recover';
      s.timer = 0.6;
      s.open = 0.6;
    }
  } else if (s.state === 'idle') {
    s.phase += dt * 0.6;
    const px = s.homeX + Math.cos(s.phase) * s.patrol * 0.5,
      pz = s.homeZ + Math.sin(s.phase) * s.patrol * 0.5;
    combat.walkToward(s, px, pz, 9);
    if (d3 < spec.notice) s.state = 'approach';
  } else if (s.state === 'approach') {
    combat.walkToward(s, h.x, h.z, 26);
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
      const lead = 0.4,
        tx = h.x + h.vx * lead - s.x,
        tz = h.z + h.vz * lead - s.z,
        tl = Math.hypot(tx, tz) || 1;
      s.vx = (tx / tl) * 50;
      s.vz = (tz / tl) * 50;
      s.state = 'attack';
      s.timer = 0.8;
      s.cooldown = spec.cooldown;
    }
  } else if (s.state === 'attack') {
    s.timer -= dt;
    if (contact(ctx)) {
      const nx = dx / (dh || 1),
        nz = dz / (dh || 1);
      cb.hurt(2, nx * 22, 9, nz * 22, s.x, s.z);
      s.state = 'recover';
      s.timer = 1.0;
      s.open = 1.0;
      s.vx = -nx * 8;
      s.vz = -nz * 8;
    } else if (s.timer <= 0) {
      s.state = 'recover';
      s.timer = 1.0;
      s.open = 1.0;
    }
  } else if (s.state === 'recover') {
    s.timer -= dt;
    const k = Math.max(0, 1 - 6 * dt);
    s.vx *= k;
    s.vz *= k;
    if (s.timer <= 0) s.state = 'approach';
  }
  combat.fall(s, dt, cb);
}

/** Mirror Stalker, ceiling: hangs under a lintel at its spawn height and
 * never falls -- it lunges straight at Hopper in three dimensions and flies
 * itself home afterward. `grounded` stays true throughout so nothing in the
 * shared code (shockwaves, `fall`) tries to drop it. */
function mirrorStalkerCeiling(ctx: ShadowContext) {
  const { s, h, dt, spec, tellScale, dx, dz, dh, dy, cb, combat } = ctx;
  s.grounded = true;
  s.scale = 1 + (s.state === 'tell' ? ctx.s.telegraph * 0.15 : 0);
  if (s.state === 'idle') {
    s.x = s.homeX;
    s.y = s.homeY;
    s.z = s.homeZ;
    s.vx = s.vy = s.vz = 0;
    s.yaw = Math.atan2(dx, dz);
    if (dh < spec.range && dy < 0 && s.cooldown <= 0) {
      s.state = 'tell';
      s.timer = spec.tell * tellScale;
      cb.sound('boss');
    }
  } else if (s.state === 'tell') {
    s.timer -= dt;
    s.yaw = Math.atan2(dx, dz);
    if (s.timer <= 0) {
      const tx = h.x - s.x,
        ty = h.y - s.y,
        tz = h.z - s.z,
        tl = Math.hypot(tx, ty, tz) || 1;
      s.vx = (tx / tl) * 50;
      s.vy = (ty / tl) * 50;
      s.vz = (tz / tl) * 50;
      s.state = 'attack';
      s.timer = 0.8;
      s.cooldown = spec.cooldown;
    }
  } else if (s.state === 'attack') {
    s.timer -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;
    if (contact(ctx)) {
      const nx = dx / (dh || 1),
        nz = dz / (dh || 1);
      cb.hurt(2, nx * 22, 9, nz * 22, s.x, s.z);
      s.state = 'recover';
      s.timer = 1.0;
      s.open = 1.0;
    } else if (s.timer <= 0) {
      s.state = 'recover';
      s.timer = 1.0;
      s.open = 1.0;
    }
  } else if (s.state === 'recover') {
    combat.flyToward(s, s.homeX, s.homeY, s.homeZ, 30, dt);
    if (Math.hypot(s.x - s.homeX, s.y - s.homeY, s.z - s.homeZ) < 1) {
      s.x = s.homeX;
      s.y = s.homeY;
      s.z = s.homeZ;
      s.vx = s.vy = s.vz = 0;
      s.state = 'idle';
    }
  } else if (s.state === 'launched') {
    // It hangs from a lintel -- there's nowhere for it to fall to, so a
    // shockwave that somehow reaches it just knocks it into recovery.
    s.state = 'recover';
    s.timer = 0.6;
    s.open = 0.6;
  }
}

export const GROUND: Partial<Record<ShadowKind, ShadowBehaviour>> = {
  furnaceHound: { update: furnaceHound },
  ballastCrab: { update: ballastCrab },
  basaltBurrower: { update: basaltBurrower },
  mirrorStalker: { update: (ctx) => (ctx.s.ceiling ? mirrorStalkerCeiling(ctx) : mirrorStalkerFloor(ctx)) },
};

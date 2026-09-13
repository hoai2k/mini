/** rooted shadows of missions two and three. See LEVEL-PLAN-M2-M3.md for
 * each kind's contract; the numbers are in combat3d's SPECS. Every kind here
 * keeps its spawn (never moves) and always faces Hopper. */
import type { ShadowBehaviour, ShadowContext, Shadow } from '../combat3d';
import type { ShadowKind } from '../district';
import { MOVE } from '../controller';

/** A rooted shadow never moves and always turns to face Hopper. */
function root(s: Shadow, dx: number, dz: number) {
  s.vx = s.vy = s.vz = 0;
  s.yaw = Math.atan2(dx, dz);
}

/** Nearest point on segment a→b to point p, for the coil wraith's beam. */
function nearestOnSegment(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  px: number, py: number, pz: number,
): { x: number; y: number; z: number } {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len2 = dx * dx + dy * dy + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / len2));
  return { x: ax + dx * t, y: ay + dy * t, z: az + dz * t };
}

/** Slag caster: scoops, then lobs a slag ball that cools into a stepping
 * stone wherever it lands (the world does that; see combat3d's landing
 * handler for the 'slag' kind). */
function updateSlagCaster(ctx: ShadowContext) {
  const { s, h, cb, combat, dt, spec, tellScale, dx, dz, d3 } = ctx;
  root(s, dx, dz);
  if (s.state === 'idle') {
    if (d3 < spec.range && s.cooldown <= 0) {
      s.state = 'tell';
      s.timer = spec.tell * tellScale;
      cb.sound('boss');
    }
  } else if (s.state === 'tell') {
    s.timer -= dt;
    s.scale = 1 + s.telegraph * 0.2;
    if (s.timer <= 0) {
      combat.lob(s, h, 'slag', 3, 1, 0.7);
      s.scale = 1;
      s.state = 'recover';
      s.timer = spec.recover;
      s.open = spec.recover;
      s.cooldown = spec.cooldown;
    }
  } else if (s.state === 'recover') {
    s.timer -= dt;
    if (s.timer <= 0) s.state = 'idle';
  } else if (s.state === 'launched') {
    // Rooted, so a shockwave never actually launches it -- guard anyway.
    s.state = 'recover';
    s.timer = 0.5;
    s.open = 0.5;
  }
}

/** Coil wraith: a beam gate between itself and its link point (or, with no
 * link, a fixed point 60 m ahead worked out once so the lane doesn't swing
 * as Hopper moves around it). Crossing close to the beam while it holds is
 * a hit, once per 0.6 s grace kept in `stall` (wraiths never stall). */
function updateCoilWraith(ctx: ShadowContext) {
  const { s, h, cb, dt, spec, tellScale, dx, dz } = ctx;
  root(s, dx, dz);
  const oy = s.y + s.height * 0.5;
  if (s.link) {
    s.beamX = s.link[0];
    s.beamY = s.link[1];
    s.beamZ = s.link[2];
  } else if (s.beamX === s.x && s.beamY === s.y && s.beamZ === s.z) {
    s.beamX = s.x + Math.sin(s.yaw) * 60;
    s.beamY = oy;
    s.beamZ = s.z + Math.cos(s.yaw) * 60;
  }
  const hx = h.x, hy = h.y + 7, hz = h.z;
  const near = nearestOnSegment(s.x, oy, s.z, s.beamX, s.beamY, s.beamZ, hx, hy, hz);
  const toHopper = Math.hypot(hx - near.x, hy - near.y, hz - near.z);
  if (s.stall > 0) s.stall -= dt;
  if (s.state === 'idle') {
    // The 40 m notice band is the plan's, not the spec's range.
    if (toHopper < 40 && s.cooldown <= 0) {
      s.state = 'tell';
      s.timer = spec.tell * tellScale;
      cb.sound('boss');
    }
  } else if (s.state === 'tell') {
    s.timer -= dt;
    if (s.timer <= 0) {
      s.state = 'attack';
      s.timer = 3.0;
      s.stall = 0;
      cb.sound('laser');
    }
  } else if (s.state === 'attack') {
    s.timer -= dt;
    if (s.stall <= 0 && toHopper < 4 + MOVE.radius) {
      const nx = (hx - near.x) / (toHopper || 1),
        nz = (hz - near.z) / (toHopper || 1);
      cb.hurt(1, nx * 24, 6, nz * 24, s.x, s.z);
      s.stall = 0.6;
    }
    if (s.timer <= 0) {
      s.state = 'recover';
      s.timer = spec.recover;
      s.open = spec.recover;
      s.cooldown = spec.cooldown;
    }
  } else if (s.state === 'recover') {
    s.timer -= dt;
    if (s.timer <= 0) s.state = 'idle';
  } else if (s.state === 'launched') {
    s.state = 'recover';
    s.timer = 0.5;
    s.open = 0.5;
  }
}

/** A fan of five seeds across 40 degrees, aimed the way spit() leads a
 * single shot -- just three times as wide. */
function volley(ctx: ShadowContext) {
  const { s, h, combat } = ctx;
  const ox = s.x,
    oy = s.y + s.height * 0.8,
    oz = s.z;
  const lead = 0.6;
  const tx = h.x + h.vx * lead,
    ty = h.y + 7 + h.vy * lead * 0.5,
    tz = h.z + h.vz * lead;
  const dx = tx - ox,
    dz = tz - oz,
    dist = Math.hypot(dx, dz) || 1;
  const speed = Math.min(70, Math.max(35, dist * 0.55));
  const t = dist / speed;
  for (let i = 0; i < 5; i++) {
    const a = ((-20 + i * 10) * Math.PI) / 180;
    const cos = Math.cos(a),
      sin = Math.sin(a);
    const vx = ((dx * cos - dz * sin) / dist) * speed,
      vz = ((dx * sin + dz * cos) / dist) * speed;
    const vy = (ty - oy) / t + 0.5 * 30 * t;
    combat.projectiles.push({ id: combat.nextProjectile++, x: ox, y: oy, z: oz, vx, vy, vz, life: 4, radius: 1.4, damage: 1, gravity: 30, owner: 'shadow', kind: 'seed', ownerId: s.id });
  }
}

/** Thorn choir: heads open in sequence, then the fan volley. Kicking one
 * staggers every choir sharing its group -- a kick clears the whole cluster's
 * tell at once instead of picking them off one at a time. */
function updateThornChoir(ctx: ShadowContext) {
  const { s, cb, dt, spec, tellScale, dx, dz, d3 } = ctx;
  root(s, dx, dz);
  if (s.state === 'idle') {
    if (d3 < spec.range && s.cooldown <= 0) {
      s.state = 'tell';
      s.timer = spec.tell * tellScale;
      cb.sound('boss');
    }
  } else if (s.state === 'tell') {
    s.timer -= dt;
    s.scale = 1 + s.telegraph * 0.3;
    if (s.timer <= 0) {
      volley(ctx);
      s.scale = 1;
      s.state = 'recover';
      s.timer = spec.recover;
      s.open = spec.recover;
      s.cooldown = spec.cooldown;
    }
  } else if (s.state === 'recover') {
    s.timer -= dt;
    if (s.timer <= 0) s.state = 'idle';
  } else if (s.state === 'launched') {
    s.state = 'recover';
    s.timer = 0.5;
    s.open = 0.5;
  }
}
function onKickThornChoir(ctx: ShadowContext) {
  const { combat, cb, s } = ctx;
  for (const o of combat.shadows) {
    if (o.kind !== 'thornChoir' || !o.alive || o.group !== s.group) continue;
    o.state = 'recover';
    o.timer = 1.8;
    o.open = 1.8;
    o.cooldown = 2.5;
    cb.effect('hit', o.x, o.y + o.height * 0.5, o.z);
  }
}

export const ROOTED: Partial<Record<ShadowKind, ShadowBehaviour>> = {
  slagCaster: { update: updateSlagCaster },
  coilWraith: { update: updateCoilWraith },
  thornChoir: { update: updateThornChoir, onKick: onKickThornChoir },
};

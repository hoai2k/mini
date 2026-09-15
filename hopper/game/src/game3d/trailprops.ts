/** Where the tall things beside the trail stand.
 *
 * The trail's trees, pylons and spires used to be picture only, so Hopper ran
 * straight through a 40 m pine. They are placed here instead of inside the
 * picture, so the world can make them solid and both agree on exactly where
 * each one is: one seeded pass, two consumers.
 */
import type { World } from './world';

/** Half the ribbon's width in metres: wide enough for a 14 m grasshopper. */
export const TRAIL_HALF_WIDTH = 11;

/** The mass a prop carries, in its own unit space (it is authored 1 tall and
 * 1 wide, then scaled). `half` is the solid half-extent as a fraction of its
 * width and `top` how far up its height the solid part reaches. A thin post
 * or a lamp carries none: there is nothing there to walk into. */
export interface PropSolid {
  half: number;
  top: number;
}
export interface TrailProp {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** World width and height, metres. */
  w: number;
  h: number;
  /** Which of the region's big/small templates this is. */
  slot: number;
  big: boolean;
  solid: PropSolid | null;
}

/** The solid part of each template, in the order `templates()` lists them.
 * A trunk is a pole, a boulder is a rock, a kiosk is a building; foliage,
 * lamp heads and fence rails are not worth stopping a grasshopper. */
const SOLIDS: Record<string, { big: (PropSolid | null)[]; small: (PropSolid | null)[] }> = {
  // pylon, pylon, lamp | kiosk, lamp
  city: { big: [{ half: 0.09, top: 1 }, { half: 0.09, top: 1 }, null], small: [{ half: 0.5, top: 0.62 }, null] },
  // spire, spire, pine | boulder, cairn
  mountains: { big: [{ half: 0.2, top: 1 }, { half: 0.2, top: 1 }, { half: 0.05, top: 1 }], small: [{ half: 0.45, top: 0.7 }, { half: 0.4, top: 0.9 }] },
  // tree, tree, pine | haystack, fencePost
  fields: { big: [{ half: 0.06, top: 1 }, { half: 0.06, top: 1 }, { half: 0.05, top: 1 }], small: [{ half: 0.45, top: 0.9 }, null] },
};

/** A seeded stream, the same one `buildTrail` drew its layout from. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Every tall prop of a district: the ones at the trail's shoulder and the
 * clumps in the middle distance. Deterministic for a district. */
export function trailProps(world: World): TrailProp[] {
  const route = world.route,
    d = world.district,
    region = world.region;
  const random = rng(d.terrain.seed * 7919 + 13);
  const solids = SOLIDS[region.id] || SOLIDS.fields;
  const surface = (x: number, z: number) => world.groundAt(x, z, world.heightAt(x, z) + 30).y;
  const right = (yaw: number): [number, number] => [Math.cos(yaw), -Math.sin(yaw)];
  const keepOut: { x: number; z: number; r: number }[] = [];
  for (const p of d.placements) keepOut.push({ x: p.x, z: p.z, r: p.id.startsWith('structure.') ? 75 : 26 });
  if (d.boss) keepOut.push({ x: d.boss.x, z: d.boss.z, r: d.boss.r + 20 });
  for (const c of d.cages || []) keepOut.push({ x: c.x, z: c.z, r: 30 });
  const clear = (x: number, z: number, margin = 0) => keepOut.every((k) => Math.hypot(k.x - x, k.z - z) > k.r + margin);
  const slopeAt = (x: number, z: number) => Math.abs(world.heightAt(x + 4, z) - world.heightAt(x - 4, z)) + Math.abs(world.heightAt(x, z + 4) - world.heightAt(x, z - 4));
  const bigHeight = region.id === 'city' ? [52, 80] : region.id === 'mountains' ? [38, 78] : [26, 46];
  const out: TrailProp[] = [];

  for (let s = 20, i = 0; s < route.length - 20; s += 24, i++) {
    const p = route.pointAt(s),
      [rx, rz] = right(p.yaw);
    for (const side of [-1, 1]) {
      if (random() < 0.3) continue;
      const big = random() < 0.55;
      const off = big ? 34 + random() * 60 : 22 + random() * 24;
      const x = p.x + rx * side * off,
        z = p.z + rz * side * off;
      if (!clear(x, z, big ? 12 : 0) || slopeAt(x, z) > (big ? 5 : 8)) continue;
      if (route.distance(x, z) < TRAIL_HALF_WIDTH + (big ? 14 : 6)) continue;
      const y = surface(x, z) - 0.3,
        turn = random() * Math.PI * 2;
      if (big) {
        const h = bigHeight[0] + random() * (bigHeight[1] - bigHeight[0]);
        const w = h * (0.7 + random() * 0.5);
        const pick = Math.floor(random() * solids.big.length);
        out.push({ x, y, z, yaw: turn, w, h, slot: pick, big: true, solid: solids.big[pick] });
      } else {
        const h = 6 + random() * 9;
        const w = region.id === 'city' ? h * 1.6 : region.id === 'fields' ? h * (0.9 + random() * 0.3) : h * (1.1 + random() * 0.6);
        const pick = Math.floor(random() * solids.small.length);
        const solid = solids.small[pick];
        // A solid prop has to keep its own mass off the trail, not just its
        // centre: a boulder half as wide as it is tall would otherwise put
        // rock in the road.
        if (solid && route.distance(x, z) < TRAIL_HALF_WIDTH + 6 + w * solid.half) continue;
        out.push({ x, y, z, yaw: region.id === 'fields' && random() < 0.5 ? p.yaw : turn, w, h, slot: pick, big: false, solid });
      }
    }
  }

  for (let s = 30, i = 0; s < route.length; s += 34, i++) {
    const p = route.pointAt(s + random() * 30);
    for (const side of [-1, 1]) {
      if (random() < 0.2) continue;
      const off = (120 + random() * 310) * side;
      const cx = p.x + Math.cos(p.yaw) * off,
        cz = p.z - Math.sin(p.yaw) * off;
      if (!clear(cx, cz, 20)) continue;
      const pick = Math.floor(random() * solids.big.length);
      const count = 2 + Math.floor(random() * 4);
      for (let k = 0; k < count; k++) {
        const a = random() * Math.PI * 2,
          rad = random() * 60;
        const x = cx + Math.cos(a) * rad,
          z = cz + Math.sin(a) * rad;
        if (!clear(x, z, 8) || slopeAt(x, z) > 9) continue;
        const h = bigHeight[0] * (0.9 + random() * 0.8) + random() * (bigHeight[1] - bigHeight[0]);
        const w = h * (0.6 + random() * 0.5);
        out.push({ x, y: surface(x, z) - 0.4, z, yaw: random() * Math.PI * 2, w, h, slot: pick, big: true, solid: solids.big[pick] });
      }
    }
  }
  return out;
}

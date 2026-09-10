/** Scenery: the world either side of the trail, generated from a district
 * rather than authored place by place. Two jobs.
 *
 * The first is continuations. A span placed on its own — a ravine bridge, an
 * elevated rail — starts and stops in mid-air, which reads as scaffolding
 * rather than a world. Every span here is given an abutment its deck lands
 * on and one more span beyond that, so a bridge comes from somewhere and
 * goes somewhere.
 *
 * The second is the middle distance: real structures standing 150–430 m off
 * the trail, so the country does not stop at the props beside the path. They
 * are ordinary placements, so they are built, lit and collided with like any
 * other structure and Hopper can go and stand on them.
 */
import type { District, Placement } from './district';
import type { Route } from './route';

type Height = (x: number, z: number) => number;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The spans that need somewhere to land, and what carries them there. */
const SPANS: Record<string, { deck: number; length: number; abutment: (drop: number, r: number) => Placement | null; opts: (length: number) => Record<string, unknown> }> = {
  'structure.mountains.ravineBridge': {
    deck: 1.5,
    length: 120,
    // A rock column under the deck's end, tall enough to meet it.
    abutment: (drop, r) => (drop < 6 ? null : { id: 'structure.mountains.cragColumn', x: 0, z: 0, y: 0, opts: { h: drop - 1.5, r: Math.max(10, r) } }),
    opts: (length) => ({ length, width: 12, drop: 45 }),
  },
  'structure.city.railSpan': {
    deck: 34,
    length: 160,
    // The rail lands on a block of the city.
    abutment: (drop, r) => ({ id: 'structure.city.roofDeck', x: 0, z: 0, y: 0, opts: { w: r * 2, d: r * 2, h: Math.max(8, drop - 1.5) } }),
    opts: (length) => ({ length, height: 34, piers: Math.max(3, Math.round(length / 40)) }),
  },
};

/** Structures that fill the middle distance in each region, with their sizes. */
function farStructures(region: string, random: () => number): { id: string; opts: Record<string, unknown> }[] {
  const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)];
  switch (region) {
    case 'city':
      return [
        { id: 'structure.city.ivoryTower', opts: { h: 70 + random() * 90 } },
        { id: 'structure.city.roofDeck', opts: { w: 40 + random() * 30, d: 30 + random() * 24, h: 30 + random() * 70 } },
        { id: pick(['structure.city.billboard', 'structure.city.roofDeck']), opts: { height: 30 + random() * 25, w: 30, h: 16, d: 26 } },
      ];
    case 'mountains':
      return [
        { id: 'structure.mountains.cragColumn', opts: { h: 60 + random() * 90, r: 14 + random() * 10 } },
        { id: 'structure.mountains.cragColumn', opts: { h: 40 + random() * 60, r: 12 + random() * 8 } },
        { id: 'structure.mountains.ledgeShelf', opts: { w: 40 + random() * 30, d: 18 } },
      ];
    default:
      return [
        { id: 'structure.fields.farmhouse', opts: { w: 14 + random() * 8, d: 18 + random() * 8, h: 7 + random() * 4 } },
        { id: 'structure.fields.silo', opts: { r: 5 + random() * 3, h: 22 + random() * 16 } },
        { id: 'structure.fields.windbreak', opts: { count: 5 + Math.floor(random() * 4), spacing: 9, height: 20 + random() * 10 } },
        { id: 'structure.fields.terraceStep', opts: { w: 70 + random() * 50, d: 40 + random() * 20, h: 6, tiers: 2 + Math.floor(random() * 2) } },
      ];
  }
}

/** Everything the district gets beyond its authored placements. */
export function sceneryFor(d: District, route: Route, heightAt: Height): Placement[] {
  const random = rng(d.terrain.seed * 104729 + 7);
  const out: Placement[] = [];
  const placed: { x: number; z: number; r: number }[] = d.placements.map((p) => ({ x: p.x, z: p.z, r: p.id.startsWith('structure.') ? 70 : 24 }));
  const gates = [...(d.gates || []).map((g) => ({ x: g.x, z: g.z, r: g.r + 30 })), ...(d.boss ? [{ x: d.boss.x, z: d.boss.z, r: d.boss.r + 40 }] : [])];
  const free = (x: number, z: number, margin: number) =>
    placed.every((p) => Math.hypot(p.x - x, p.z - z) > p.r + margin) && gates.every((g) => Math.hypot(g.x - x, g.z - z) > g.r) && route.distance(x, z) > 120;
  const claim = (x: number, z: number, r: number) => placed.push({ x, z, r });
  // Totems, signals, capsules and pads must never end up inside a generated
  // support. Volumes (wind lanes, thermals) are not solid and a pier standing
  // in one is only weather around a bridge.
  const props = d.placements.filter((p) => !p.id.startsWith('structure.') && p.id !== 'prop.windLane' && p.id !== 'prop.thermalVent');
  const buries = (x: number, z: number) => props.some((p) => Math.hypot(p.x - x, p.z - z) < 26);

  // --- Continuations: a span lands on an abutment, and carries on beyond it.
  for (const p of d.placements) {
    const span = SPANS[p.id];
    if (!span) continue;
    const length = Number((p.opts?.length as number) ?? span.length);
    const yaw = p.yaw || 0,
      ax = Math.cos(yaw),
      az = -Math.sin(yaw);
    // The deck's height where the span was placed, and its two ends.
    const base = p.mode === 'a' ? p.y || 0 : heightAt(p.x, p.z) + (p.y || 0) - (p.y ? 0 : 1.5);
    const deckY = base + span.deck;
    for (const side of [-1, 1]) {
      const ex = p.x + ax * side * (length / 2),
        ez = p.z + az * side * (length / 2);
      // The abutment: it stands on the terrain and reaches the deck.
      const drop = deckY - heightAt(ex, ez);
      const foot = buries(ex, ez) ? null : span.abutment(drop, 14);
      if (foot) {
        out.push({ ...foot, x: ex, z: ez, yaw, y: 0 });
        claim(ex, ez, 30);
      }
      // And the span carries on from it, to a second abutment further out.
      const nx = ex + ax * side * (length * 0.98),
        nz = ez + az * side * (length * 0.98);
      const midX = (ex + nx) / 2,
        midZ = (ez + nz) / 2;
      const nextDrop = deckY - heightAt(nx, nz);
      // Only where the ground has not already climbed to meet the deck.
      if (nextDrop < 4 || buries(midX, midZ)) continue;
      out.push({ id: p.id, x: midX, z: midZ, y: deckY - span.deck, yaw, mode: 'a', opts: span.opts(length) });
      const far = buries(nx, nz) ? null : span.abutment(nextDrop, 14);
      if (far) out.push({ ...far, x: nx, z: nz, yaw, y: 0 });
      claim(midX, midZ, 40);
      claim(nx, nz, 30);
    }
  }

  // --- The middle distance: structures either side of the trail, well back.
  const kinds = farStructures(d.region, random);
  for (let s = 60; s < route.length - 60; s += 110) {
    for (const side of [-1, 1]) {
      if (random() < 0.25) continue;
      const p = route.pointAt(s + random() * 60);
      const off = (150 + random() * 280) * side;
      const x = p.x + Math.cos(p.yaw) * off,
        z = p.z - Math.sin(p.yaw) * off;
      if (!Number.isFinite(heightAt(x, z)) || !free(x, z, 40)) continue;
      const kind = kinds[Math.floor(random() * kinds.length)];
      out.push({ id: kind.id, x, z, y: 0, yaw: random() * Math.PI * 2, opts: kind.opts, mode: 'r' });
      claim(x, z, 90);
    }
  }
  return out;
}

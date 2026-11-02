// The grab assist (the owner, 2 Nov 2026: "It should be easy in the phage world to grab things, so if it's
// nearby you can auto-aim to grab it ... if you're near a cell surface it should be pretty easy to grab a
// random place"). X or RT picks the best thing within a forgiving reach of the fibres: a free molecule, or
// the nearest point of a cell's surface (any point: LPS fur, a porin, a membrane protein). Things ahead of
// the baseplate win over things beside or behind it, but anything in reach can be taken.
//
// Pure logic (three.js maths only), so it runs in node tests (grab.test.mjs).
import * as THREE from '../shared/vendor/three.module.min.js';

export const GRAB = { reach: 40, behind: 0.7 };

const _o = new THREE.Vector3();

/**
 * hand: the fibres' reach centre (world); forward: the baseplate's unit direction.
 * molecules: [{ pos }] (free ones only); cells: [{ host, point, normal, d }] with `point` the nearest
 * surface point and `d` the hand's distance to it. Returns { kind: 'mol', mol, point, d } |
 * { kind: 'cell', cell, point, d } | null. Score: distance, made up to (1 + behind) times longer for
 * something straight behind the baseplate than for something straight ahead.
 */
export function pickGrabTarget(hand, forward, molecules, cells, { reach = GRAB.reach, behind = GRAB.behind } = {}) {
  let best = null, score = Infinity;
  const consider = (kind, item, point, d) => {
    if (!(d <= reach)) return;
    _o.subVectors(point, hand);
    const len = _o.length();
    const cos = len > 1e-4 ? _o.dot(forward) / len : 1;
    const s = d * (1 + behind * (1 - cos) * 0.5);
    if (s < score) { score = s; best = kind === 'mol' ? { kind, mol: item, point: point.clone(), d } : { kind, cell: item, point: point.clone(), d }; }
  };
  for (const m of molecules) consider('mol', m, m.pos, m.pos.distanceTo(hand));
  for (const c of cells) consider('cell', c, c.point, Math.max(0, c.d));
  return best;
}

/** The kind of surface under a host-local point, for the toast (stable for a point; a wrong host is all wall). */
export function surfacePart(local, wrong = false) {
  if (wrong) return 'its thick wall';
  const h = Math.abs(Math.sin(local.x * 12.9898 + local.y * 78.233 + local.z * 37.719) * 43758.5453) % 1;
  return h < 0.45 ? 'the LPS fur' : h < 0.7 ? 'a porin' : h < 0.9 ? 'a membrane protein' : 'the outer membrane';
}

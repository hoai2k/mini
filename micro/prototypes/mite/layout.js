// Where things are in the mite's moss (µm). One route from the start (the
// origin) to the wet leaf axil (the forward landmark), up and to the right in
// the opening view. The first half is calm exploration with food; every
// challenge lies at or beyond halfway, in sequence:
//
//   0 ........ 3650 (half) ... predator's hunting ground ... thicket (the crowd) ... boss ... axil 7300
//
//   s (distance along the route)   what
//   0 - 3650                       open moss, spores and hyphal tips to graze, the second box mite
//   3950 - 5150                    the predatory mite's hunting ground (it lurks at and inside the thicket)
//   4250 - 5850                    the hyphal thicket full of springtails (the crowd)
//   ~6000 on                       the pseudoscorpion wakes (its post at s ~ 6700, beside the way in)
//   7300                           the water film in the leaf axil
//
// The world is a square around the route (BOUNDS), wide enough that the
// giant springtail (the backdoor, behind the start) fits too.

/** The way on: a unit vector (x, z) from the start toward the forward landmark. */
const DX = -1500, DZ = 1030; // the direction the landmark has always had (up and right in the start view)
const DL = Math.hypot(DX, DZ);
export const ROUTE = { ux: DX / DL, uz: DZ / DL, length: 7300 };
/** Right of the way on (looking along it from the start). */
const SX = -ROUTE.uz, SZ = ROUTE.ux;

/** A point `s` µm along the route, `side` µm to its right. */
export function along(s, side = 0) {
  return { x: ROUTE.ux * s + SX * side, z: ROUTE.uz * s + SZ * side };
}
/** How far along the route (x, z) lies (its projection, µm). */
export function progress(x, z) { return x * ROUTE.ux + z * ROUTE.uz; }

/** The walkable square (the floor is drawn a little beyond it). */
const C = along(2900);
export const HALF = 4500;
export const BOUNDS = { x0: C.x - HALF, x1: C.x + HALF, z0: C.z - HALF, z1: C.z + HALF, cx: C.x, cz: C.z, half: HALF };

/** The predatory mite's hunting ground: it lurks here and hunts nowhere else. */
export const PRED_ZONE = { ...along(4550, -150), r: 600 };
/** Where it starts: inside its ground, to the side of the way on. */
export const PRED_START = along(4600, -420);
/** The hyphal thicket full of springtails. */
export const THICKET = { ...along(5050, 80), r: 800 };
/** The pseudoscorpion's post (beside the way in, its abdomen alongside the water) and how near wakes it. */
export const BOSS = { s: 6700, side: -500, wake: 900 };

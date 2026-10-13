// Monster groups in a chapter (world/encounters.js places them): how a group
// mills about, notices heroes and comes at them, a few at first, then more
// and more. Pure rules (no Three.js), so the node tests can check them;
// entities/enemy.js (loiter) and mission.js (the group) run them.
//
//   idle     each monster hangs around its own spot in the group (sniffs,
//            eats, takes a few steps), like the prologue's rats (ratRules.js).
//   notice   a group monster notices a hero it can see within `notice`; a
//            scout, posted toward the way in, sees further (`scoutNotice`).
//            A hero fighting close by is heard without line of sight (`hear`).
//   alarm    a monster that notices raises the alarm: the rest of its group
//            join one by one, the nearest first (`joinDelay`), so the fight
//            builds over a few seconds instead of everything popping at once.
//   scouts   a scout that notices (or is shot) runs back to its group and
//            raises the alarm when it gets there; killed on the way, nobody
//            hears it. So a careful player can pick scouts off at range.
//   hit      a group monster that is hit only wakes the ones right next to
//            it (`hitWake`): shooting at the edge of a group pulls a few.
export const PACK = {
  notice: 11, scoutNotice: 15,      // metres, with line of sight
  hear: 7,                          // a fight this close is heard through anything
  alert: 0.35, scoutAlert: 0.5,     // rearing up (seconds) before the charge
  wander: 2,                        // metres from its spot
  flee: 2.6, fleeReach: 4,          // a scout runs back to its group for at most this long, until this close
  hitWake: 4.5,                     // metres: a hit wakes the group monsters this close to it
  join: { base: 0.25, perMetre: 0.12, jitter: 0.6, max: 3.2 },
};

// Does an idle group monster notice this hero?
export function packNotices({ dist, los = true, scout = false, fightNear = false }) {
  if (fightNear && dist <= PACK.hear) return true;
  return los && dist <= (scout ? PACK.scoutNotice : PACK.notice);
}
// After the alarm, how long before this monster (dist metres from whoever
// raised it) joins the fight. r in [0, 1).
export function joinDelay(dist, r) {
  const J = PACK.join;
  return Math.min(J.max, J.base + dist * J.perMetre + r * J.jitter);
}
// Who a hit wakes: the group monsters within hitWake of the one hit.
export function wokenByHit(dist) { return dist <= PACK.hitWake; }
// Does a scout run back to raise the alarm (rather than just fight)?
export function scoutRuns({ packDist }) { return packDist > PACK.fleeReach + 1; }

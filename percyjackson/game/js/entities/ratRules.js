// Sewer rats in the prologue (the training board): how they hang around,
// notice heroes and come at them. Pure rules (no Three.js), so the node tests
// can check them; entities/enemy.js (loiter) and world/roaming.js (the dash
// director) run them.
//
//   loiter   a rat hangs around its home (a trash can, a dumpster, the
//            hot-dog cart): it sniffs, eats, wanders a few steps. It notices a
//            hero only when one is close (notice, with line of sight) or when
//            it is hit.
//   alert    on noticing, it rears up and squeaks for a moment (alert
//            seconds: a perched rat longer, so there is time to shoot it),
//            then comes at the hero.
//   dash     now and then the director picks one loitering rat a fair way off
//            (dashRange) and sends it running at the lead hero; never while
//            maxAggro rats are already after the heroes.
//   leash    a rat that chased a hero far from home (leash) while the hero is
//            not right there gives up and goes back to loitering.
export const RAT = {
  notice: 4.5, alert: 0.45,          // an idle rat on the ground
  perchNotice: 12, perchAlert: 1.2,  // a rat up on a dumpster, the scaffolding, behind the fence
  leash: 16, calm: 2.5,              // gives up this far from home; then ignores heroes for a moment
  wander: 1.6,                       // metres it wanders from home
  dashEvery: [6, 11], dashRange: [7, 15], maxAggro: 3,
  holeEvery: [11, 17], holeRange: [11, 22], holeCap: 2,
};

// Does a loitering rat notice this hero?
export function notices({ dist, los = true, notice = RAT.notice, calm = 0 }) {
  return calm <= 0 && los && dist <= notice;
}
// Does a chasing rat give up and go home?
export function givesUp({ homeDist, targetDist, leash = RAT.leash }) {
  return homeDist > leash && targetDist > 6;
}
// What a loitering rat does next (r in [0, 1)): { act, dur }
export function nextIdle(r) {
  if (r < 0.38) return { act: 'sniff', dur: 1.4 + r * 5 };
  if (r < 0.7) return { act: 'eat', dur: 2 + (r - 0.38) * 8 };
  return { act: 'wander', dur: 1 + (r - 0.7) * 5 };
}
// Which rat (index into cands) the director sends at the lead hero, or -1.
// cands: [{ dist, los, aggro, perch, alerting }]
export function pickDasher(cands, { range = RAT.dashRange, maxAggro = RAT.maxAggro } = {}) {
  if (cands.filter((c) => c.aggro || c.alerting).length >= maxAggro) return -1;
  let best = -1, bd = Infinity;
  cands.forEach((c, i) => {
    if (c.aggro || c.alerting || c.perch || !c.los || c.dist < range[0] || c.dist > range[1]) return;
    const score = Math.abs(c.dist - (range[0] + range[1]) / 2);   // a fair way off: seen coming, not from the far end of the street
    if (score < bd) { bd = score; best = i; }
  });
  return best;
}
// Which beat of the walk to the bus a spot is in: 'walk' | 'melee' | 'ranged'.
export function beatAt(beats, x, z) {
  for (const b of beats ?? []) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return b.id;
  return null;
}

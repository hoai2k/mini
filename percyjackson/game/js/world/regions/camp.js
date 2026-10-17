// Camp Half-Blood in the open world: the camp itself is built by world/camp.js;
// this adds the people in camp who send you out into the world, and their quests.
// (Chiron and Mr. D already stand at the Big House as the hub's own people.)
//
// Positions are world coordinates (camp.js local + CAMP_AT; the main camp starts
// at world z 184, below the Road West strip).

// The nearest spot to (x, z) on open, level ground: grass (or the woods floor)
// all round, nothing built on it, at the camp's ground height.
function openSpot(c, x0, z0, r = 10) {
  const { W, B, FY, top, inRegion } = c;
  const free = (x, z) => {
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
      const g = W.get(x + a, FY - 1, z + b);
      if (g !== B.grass && g !== B.forest_floor && g !== B.dirt) return false;
      for (let y = FY; y < FY + 4; y++) if (W.get(x + a, y, z + b)) return false;
    }
    return true;
  };
  for (let d = 0; d <= r; d++) for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== d) continue;
    const x = x0 + dx, z = z0 + dz;
    if (inRegion(x, z) && top(x, z) === FY && free(x, z)) return [x, z];
  }
  return [x0, z0];
}

export function build(c) {
  const { add } = c;
  const person = (id, x, z, model, yaw) => { const [px, pz] = openSpot(c, x, z); add.npc({ id, x: px, z: pz, model, yaw }); };
  // Clarisse, outside the arena door, itching for a fight somewhere else
  person('camp_clarisse', 87, 255, 'hero:clarisse', -Math.PI / 2);
  // Argus, the camp's hundred-eyed head of security, at the foot of Half-Blood Hill
  person('camp_argus', 36, 212, 'mortal:guard', Math.PI / 4);
  // Silena Beauregard, by the canoe lake
  person('camp_silena', 37, 236, 'mortal:student', -Math.PI / 2);
  // Silena's love letters, blown all over camp
  [[72, 276], [100, 238], [24, 270], [83, 200]].forEach(([x, z], i) => {
    const [px, pz] = openSpot(c, x, z, 14);
    add.item({ id: `camp_letter_${i}`, quest: 'camp_silena_letters', x: px, z: pz });
  });
}

export const QUESTS = [
  // Clarisse: the Ares cabin needs bragging rights
  { id: 'camp_clarisse_warmup', giver: 'camp_clarisse',
    steps: [{ type: 'kill', count: 10, region: 'fields' }, { type: 'return' }], reward: { xp: 180, coins: 60, item: 'common' } },
  { id: 'camp_clarisse_scorpions', giver: 'camp_clarisse', requires: ['camp_clarisse_warmup'],
    steps: [{ type: 'reach', x: 262, z: 190, radius: 8 }, { type: 'kill', kind: 'scorpion', count: 6, region: 'canyon' }, { type: 'return' }], reward: { xp: 420, coins: 140, item: 'rare' } },
  { id: 'camp_clarisse_hounds', giver: 'camp_clarisse', requires: ['camp_clarisse_scorpions'],
    steps: [{ type: 'camp', id: 'asphodel_hellhound_den' }, { type: 'kill', kind: 'hellhound', count: 3, region: 'asphodel' }, { type: 'return' }], reward: { xp: 900, coins: 260, item: 'unique' } },
  // Argus: something is watching the camp, and he has a hundred eyes to know it
  { id: 'camp_argus_shore', giver: 'camp_argus',
    steps: [{ type: 'reach', x: 70, z: 70, radius: 8 }, { type: 'kill', kind: 'harpy', count: 5, region: 'shore' }, { type: 'return' }], reward: { xp: 300, coins: 90, item: 'common' } },
  { id: 'camp_argus_othrys', giver: 'camp_argus', requires: ['camp_argus_shore'],
    steps: [{ type: 'reach', x: 240, z: 95, radius: 8 }, { type: 'kill', count: 6, region: 'othrys' }, { type: 'return' }], reward: { xp: 650, coins: 190, item: 'rare' } },
  // Silena: letters, a stolen mirror, and a drop of forgetting
  { id: 'camp_silena_letters', giver: 'camp_silena',
    steps: [{ type: 'collect', count: 4 }, { type: 'return' }], reward: { xp: 100, coins: 40, item: 'common' } },
  { id: 'camp_silena_mirror', giver: 'camp_silena', requires: ['camp_silena_letters'],
    steps: [{ type: 'kill', kind: 'stymphalian', count: 3, region: 'fields' }, { type: 'return' }], reward: { xp: 200, coins: 70, item: 'common' } },
  { id: 'camp_silena_lethe', giver: 'camp_silena', requires: ['camp_silena_mirror'],
    steps: [{ type: 'camp', id: 'asphodel_tea_party' }, { type: 'collect', count: 1 }, { type: 'return' }], reward: { xp: 850, coins: 240, item: 'rare' } },
];

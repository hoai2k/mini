// The Fields of Asphodel (open world, south-east): where the Underworld breaks
// through. Grey ash plains carpeted with pale asphodel, black poplars, waiting
// shades, the River Styx winding down from the east edge to the south edge,
// Charon's Landing, the Judgment Pavilion, the Pale King's barrow, the Gates of
// Erebus (with Cerberus's empty collar), Sisyphus's hill, the Pool of Lethe and
// a shrine to Hades. Levels 9-12.
//
// Map (world x, z):  the west wing (x 170-250, z 330-400) holds Sisyphus's hill
// and the poplar grove with the mausoleum; the main block (x 250-400, z 290-400)
// holds the Landing, the pavilion, the barrow, the hellhound den and, across the
// Styx, the Gates of Erebus (a wall across the far bank, facing south). The
// woods road comes in at (262, 330).
import { B } from '../blocks.js';

// The River Styx: from the east edge of the world down to the south edge.
const RIVER = [[401, 344], [372, 352], [348, 349], [328, 356], [318, 372], [313, 388], [311, 401]];
function riverDist(x, z) {
  let best = Infinity;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best) best = d;
  }
  return best;
}
const HILL = [205, 375];       // Sisyphus's hill
const BARROW = [372, 312];     // the Pale King's barrow
const hillH = (x, z) => { const d = Math.hypot(x - HILL[0], (z - HILL[1]) * 1.1); return d < 24 ? Math.min(13, 15.5 - d * 0.68) : -99; };
const barrowH = (x, z) => { const e = Math.hypot((x - BARROW[0]) / 16, (z - BARROW[1]) / 12); return e < 1 ? Math.min(7, (1 - e) * 11) : -99; };

export const terrain = {
  height: (x, z, n) => {
    let h = Math.max(0, (n.fbm(x, z, 40) - 0.5) * 3 + 0.7);
    h = Math.max(h, hillH(x, z) + (n.fbm(x * 2, z * 2, 9) - 0.5) * 1.2, barrowH(x, z));
    const r = riverDist(x, z);
    if (r < 2.5) h = -2; else if (r < 3.7) h = Math.min(h, -1); else if (r < 5) h = Math.min(h, 0);
    return h;
  },
  surface: (x, z, h, n) => {
    if (h >= 9) return n.value(x * 0.3, z * 0.3) > 0.45 ? B.underworld_rock : B.rock;
    if (h >= 5 && n.value(x * 0.25, z * 0.25) > 0.6) return B.rock;
    const v = n.value(x * 0.15, z * 0.15);
    if (v > 0.78) return B.underworld_rock;
    return n.value(x * 0.11 + 31, z * 0.11) < 0.45 ? B.asphalt : B.asphodel;   // dark ash earth in drifts between the pale grey fields
  },
};

export function build(c) {
  const __t0 = performance.now();   // TEMP timing
  const { W, k, deco, add, rand, bounds: b, trees, scatter, level, inRegion, top, FY, n } = c;
  const G = (x, z) => top(x, z);
  const keep = [];      // footprints the trees stay out of
  const kept = (x, z, m = 2) => keep.some(([a, bb, cc, d]) => x >= a - m && x <= cc + m && z >= bb - m && z <= d + m);
  const brazier = (x, z, y = G(x, z)) => { deco.prop('brazier', x + 0.5, y, z + 0.5, { green: true }); W.addLight(x + 0.5, y + 1.6, z + 0.5, 0x3aff7a, 3.2, 9); };
  const shade = (x, z, rot = rand() * 6.28, s = 1) => deco.prop('ghost', x + 0.5, G(x, z), z + 0.5, { rot, scale: s * (0.95 + rand() * 0.2) });
  // register something that must stand on a floor under a ceiling: clear the column above, add it, put the column back
  const under = (x, z, y, fn) => { const saved = []; for (let yy = y; yy < W.sy; yy++) { saved.push(W.get(x, yy, z)); W.set(x, yy, z, 0); } fn(); saved.forEach((id, i) => { if (id) W.set(x, y + i, z, id); }); };
  const pave = (x0, z0, x1, z1, id, p = 1) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (rand() < p) { const y = G(x, z); if (isFinite(y)) W.set(x, y - 1, z, id); } };

  // ------------------------------------------------------------ the River Styx
  // the terrain carved its channel (water); make it the Styx, on a bed of basalt
  for (let z = b.z0; z < b.z1; z++) for (let x = b.x0; x < b.x1; x++) {
    if (W.get(x, FY - 1, z) !== B.water || !inRegion(x, z)) continue;
    for (let y = FY - 4; y < FY; y++) { const id = W.get(x, y, z); if (id === B.water) W.set(x, y, z, B.styx); else if (id === B.sand || id === B.wet_sand) W.set(x, y, z, B.basalt); }
  }

  // ------------------------------------------------------------ roads and trails
  c.road([[262, 331], [277, 334], [291, 337]], B.basalt, 3);                                 // in from the woods road
  c.road([[292, 338], [304, 347], [314, 360]], B.gravel_path, 3);                           // down to the Landing
  c.road([[290, 336], [287, 323], [286, 313]], B.gravel_path, 3);                           // up to the Judgment Pavilion
  c.road([[293, 336], [316, 330], [340, 328], [358, 330], [372, 330]], B.gravel_path, 2);  // east: the den and the barrow
  c.road([[358, 330], [361, 343]], B.gravel_path, 2);                                       // to the bridge
  c.road([[361, 358], [364, 364], [372, 367], [383, 365]], B.gravel_path, 3);               // across: to the Gates
  c.road([[364, 364], [362, 376], [366, 386]], B.gravel_path, 2);                           // and on to the roost
  c.road([[289, 340], [282, 355], [276, 366]], B.gravel_path, 2);                           // south to the shrine
  c.road([[276, 378], [262, 386], [250, 389]], B.gravel_path, 2);                           // on to the Pool of Lethe
  c.road([[262, 332], [246, 342], [232, 352], [226, 358]], B.gravel_path, 2);               // west to the hill
  c.road([[226, 358], [212, 350], [200, 346]], B.gravel_path, 2);                           // into the grove
  c.road([[230, 359], [221, 365], [212, 371], [207, 374]], B.gravel_path, 3);               // the boulder's rut up the hill

  // ------------------------------------------------------------ waystones
  add.waystone('asphodel_ferry', 296, 334);
  add.waystone('asphodel_gate', 360, 372);
  add.waystone('asphodel_barrow', 346, 340);
  add.waystone('asphodel_hill', 229, 357);

  // ------------------------------------------------------------ Charon's Landing
  {
    let bank = 312; while (bank < 330 && W.get(bank, FY - 1, 361) !== B.styx) bank++;
    const x0 = bank - 4, x1 = bank + 3;
    for (let x = x0; x <= x1; x++) for (let z = 360; z <= 362; z++) {
      W.set(x, FY, z, B.dark_planks); for (let y = FY + 1; y < FY + 5; y++) W.set(x, y, z, 0);
    }
    for (const x of [x0, x1]) for (const z of [360, 362]) { W.set(x, FY + 1, z, B.dark_planks); if (x === x1) for (let y = FY - 3; y < FY; y++) W.set(x, y, z, B.dark_planks); }
    W.set(x0 - 1, FY, 361, B.dark_planks);   // a step up from the bank
    deco.add('chain', x1 + 0.5, FY + 1, 362.5, { mode: 'hang', scale: 1.2, sway: 0.4 });
    // Charon's ferry, moored by the jetty, pointing downstream
    deco.prop('ferry', x1 - 1, FY - 0.35, 365.5, { rot: Math.atan2(16, -10) });
    W.addLight(x1 - 2, FY + 2.2, 365, 0x3aff7a, 3, 9);
    // the ticket desk: a black marble lectern with a gold top
    W.set(bank - 7, FY, 357, B.black_marble); W.set(bank - 7, FY + 1, 357, B.gold_trim);
    brazier(bank - 6, 359); brazier(bank - 6, 364);
    // the queue of the dead, along the road down to the water
    for (let i = 0; i < 9; i++) shade(Math.round(bank - 9 - i * 1.3), Math.round(357 - i * 1.4), 0.6 + (rand() - 0.5) * 0.4);
    add.chest({ id: 'asphodel_chest_jetty', x: x1, z: 361, rarity: 'common' });
    add.landmark({ id: 'asphodel_landing', x: bank - 3, z: 361 });
    add.npc({ id: 'asphodel_charon', x: bank - 6, z: 357, model: 'npc:asphodel_charon', yaw: -Math.PI / 2 });
    keep.push([bank - 20, 340, x1 + 2, 368]);
  }

  // ------------------------------------------------------------ the bridge over the Styx (black marble)
  {
    const x0 = 360, x1 = 362, z0 = 343, z1 = 358;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      W.set(x, FY, z, B.black_marble); for (let y = FY - 3; y < FY; y++) if (W.get(x, y, z) === B.styx && (z - z0) % 4 === 0 && x !== 361) W.set(x, y, z, B.basalt);
      for (let y = FY + 1; y < FY + 5; y++) W.set(x, y, z, 0);
      if ((x === x0 || x === x1) && z > z0 + 1 && z < z1 - 1) W.set(x, FY + 1, z, (z - z0) % 4 === 0 ? B.basalt : 0);
    }
    for (const z of [z0 - 1, z1 + 1]) brazier(x0 - 1, z);
    keep.push([x0 - 2, z0 - 2, x1 + 2, z1 + 2]);
  }
  // stepping stones across the lower river
  for (let x = 304; x <= 320; x += 2) if (W.get(x, FY - 1, 393) === B.styx || W.get(x - 1, FY - 1, 393) === B.styx) { for (let y = FY - 3; y <= FY; y++) W.set(x, y, 393, B.underworld_rock); W.set(x, FY, 394, B.underworld_rock); }

  // ------------------------------------------------------------ the Judgment Pavilion
  {
    const x0 = 278, x1 = 294, z0 = 300, z1 = 311, y0 = G(286, 306);
    c.flatten(x0, z0, x1, z1, y0, B.black_marble);
    for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) if ((x - x0) % 2 === 1) W.set(x, y0 - 1, z, B.gold_trim);
    for (const x of [x0, 282, 286, 290, x1]) for (const z of [z0, z1]) if (!(z === z1 && x === 286)) k.pillar(x, z, y0, 6, B.black_marble, B.gold_trim);
    for (const z of [304, 307]) for (const x of [x0, x1]) k.pillar(x, z, y0, 6, B.black_marble, B.gold_trim);
    // the judges' dais and their three thrones, facing the line of the dead
    W.fill(281, y0, 301, 291, y0, 303, B.obsidian);
    for (const x of [283, 286, 289]) { deco.prop('throne', x + 0.5, y0 + 1, 302.5, { color: x === 286 ? 0xd8b84a : 0x3aa86a }); W.set(x, y0 + 1, 302, B.barrier); }
    add.chest({ id: 'asphodel_chest_thrones', x: 293, z: 301, rarity: 'rare' });
    add.landmark({ id: 'asphodel_judgment', x: 286, z: 306 });
    // the roof
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) W.set(x, y0 + 6, z, B.underworld_rock);
    gableRoof(k, x0, z0, x1, z1, y0 + 7);
    W.addRoof([x0 - 2, y0 + 6, z0 - 2], [x1 + 2, y0 + 16, z1 + 2], [[x0, y0, z0], [x1, y0 + 5, z1]]);
    for (const [x, z] of [[x0 - 3, z0 - 3], [x1 + 3, z0 - 3], [x0 - 3, z1 + 3], [x1 + 3, z1 + 3]]) brazier(x, z);
    // the line waits along the road: the shades of the dead, patient forever
    for (let i = 0; i < 10; i++) shade(i % 2 ? 283 : 284, 313 + i * 2, Math.PI + (rand() - 0.5) * 0.3);
    keep.push([x0 - 4, z0 - 4, x1 + 4, z1 + 4]);
  }

  // ------------------------------------------------------------ the hellhound den: a monster's giant ribcage
  {
    const cx = 338, cz = 318, y0 = G(cx, cz);
    for (let x = cx - 9; x <= cx + 7; x++) W.set(x, y0 - 1, cz, B.bone_block);   // the spine (half sunk)
    const RIB = [[4, 0], [4, 1], [4, 2], [3, 3], [2, 4], [1, 5], [0, 5]];
    for (let x = cx - 7; x <= cx + 5; x += 3) for (const s of [-1, 1]) for (const [dz, dy] of RIB) if (!(x === cx - 7 && dy > 3)) W.set(x, y0 + dy, cz + s * dz, B.bone_block);
    // the skull at the east end, mouth open
    const sx = cx + 8;
    W.fill(sx, y0, cz - 2, sx + 3, y0 + 3, cz + 2, B.bone_block);
    W.fill(sx + 1, y0 + 1, cz - 1, sx + 3, y0 + 1, cz + 1, 0);
    W.set(sx + 3, y0 + 2, cz - 1, B.obsidian); W.set(sx + 3, y0 + 2, cz + 1, B.obsidian);
    deco.prop('fire', cx - 1 + 0.5, y0, cz + 0.5, { scale: 0.7, smoke: true }); W.addLight(cx - 0.5, y0 + 1.4, cz + 0.5, 0xff7a3a, 3, 9);
    pave(cx - 8, cz - 7, cx + 8, cz + 7, B.basalt, 0.35);
    for (let i = 0; i < 18; i++) { const x = cx - 9 + Math.floor(rand() * 18), z = cz - 8 + Math.floor(rand() * 16); const y = G(x, z); if (!W.get(x, y, z)) deco.add(rand() < 0.4 ? 'skull' : 'bone', x + 0.5, y, z + 0.5, { scale: 0.7 }); }
    add.camp({ id: 'asphodel_hellhound_den', x: cx - 2, z: cz + 6, kinds: ['hellhound', 'hellhound', 'skeleton'], count: 5, chest: 'rare' });
    keep.push([cx - 11, cz - 9, cx + 13, cz + 9]);
  }

  // ------------------------------------------------------------ the Pale King's barrow
  {
    const [mx, mz] = BARROW, y0 = G(372, 330);
    // a stone passage into the mound from the south, and the burial chamber under its top
    const room = (ax, az, bx, bz) => {
      for (let z = az - 1; z <= bz + 1; z++) for (let x = ax - 1; x <= bx + 1; x++) {
        const inside = x >= ax && x <= bx && z >= az && z <= bz;
        W.set(x, y0 - 1, z, inside ? B.dark_brick : B.black_marble);
        for (let y = y0; y <= y0 + 2; y++) W.set(x, y, z, inside ? 0 : B.black_marble);
        W.set(x, y0 + 3, z, B.black_marble);
      }
    };
    room(369, 308, 375, 313);            // the chamber
    room(371, 314, 373, 328);            // the passage
    for (let x = 370; x <= 374; x++) for (let y = y0; y <= y0 + 3; y++) W.set(x, y, 329, 0);   // open the mouth
    for (let x = 369; x <= 375; x++) W.set(x, y0 + 4, 328, B.black_marble);                  // the lintel
    for (const x of [369, 375]) for (let y = y0; y <= y0 + 3; y++) W.set(x, y, 328, B.basalt);
    W.fill(371, y0, 309, 373, y0, 310, B.stone_brick); W.fill(371, y0 + 1, 309, 373, y0 + 1, 310, B.black_marble);   // the sarcophagus
    under(372, 312, y0, () => add.chest({ id: 'asphodel_chest_crypt', x: 372, z: 312, rarity: 'epic', hidden: true }));
    deco.prop('brazier', 370, y0, 312.5, { green: true }); W.addLight(370, y0 + 1.6, 312.5, 0x3aff7a, 3, 7);
    for (const x of [370, 374]) deco.add('cobweb', x + 0.5, y0 + 2, 308.5, { mode: 'hang', scale: 1.1, sway: 0.1 });
    W.addLight(372.5, y0 + 1.5, 320, 0x3aff7a, 1.6, 6);
    W.addRoof([366, y0 + 3, 305], [378, y0 + 12, 330], [[369, y0, 308], [375, y0 + 2, 328]]);
    // on top: a broken ring of standing stones round a throne of black stone
    const ty = G(mx, mz);
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue;
      const a = i / 9 * Math.PI * 2, x = Math.round(mx + Math.cos(a) * 6), z = Math.round(mz + Math.sin(a) * 4.5), y = G(x, z);
      k.pillar(x, z, y, 2 + Math.floor(rand() * 3), B.basalt, i % 3 ? null : B.underworld_rock);
    }
    deco.prop('throne', mx + 0.5, ty, mz - 2 + 0.5, { color: 0x2a8a4a, bronze: true }); W.set(mx, ty, mz - 2, B.barrier);
    brazier(mx - 2, mz - 2, G(mx - 2, mz - 2)); brazier(mx + 2, mz - 2, G(mx + 2, mz - 2));
    for (let i = 0; i < 10; i++) { const x = mx - 5 + Math.floor(rand() * 10), z = mz - 3 + Math.floor(rand() * 7); deco.add(rand() < 0.5 ? 'skull' : 'bone', x + 0.5, G(x, z), z + 0.5, { scale: 0.7 }); }
    add.champion({ id: 'asphodel_pale_king', x: mx, z: mz + 1, kind: 'skeleton', level: 12, elite: 'armored' });
    add.landmark({ id: 'asphodel_barrow', x: mx, z: mz });
    keep.push([mx - 17, mz - 13, mx + 17, 331]);
  }

  // ------------------------------------------------------------ the Gates of Erebus
  // a black wall across the far bank, facing south (so the camera sees it as you come up),
  // with the river and the dark behind it
  {
    const z0 = 357, z1 = 359, gx0 = 379, gx1 = 387;
    for (let x = 364; x <= 398; x++) {
      const hgt = x < 368 ? 3 + (x - 364) * 2 : 9;
      for (let z = z0; z <= z1; z++) { const g = G(x, z); for (let y = Math.min(g, FY) - 3; y < FY + hgt; y++) W.set(x, y, z, (y - FY) % 5 === 4 ? B.black_marble : B.obsidian); }
      if (x % 2 === 0 && x >= 368) W.set(x, FY + hgt, z1, B.obsidian);   // crenels
      if (x >= 368 && x % 4 === 0 && (x < gx0 - 7 || x > gx1 + 7)) deco.add('skull', x + 0.5, FY + 5, z1 + 1.02, { mode: 'wall', facing: [0, 1], scale: 1.3 });
    }
    // the gateway, barred by black iron; beyond it, only dark
    for (let x = gx0; x <= gx1; x++) for (let z = z0; z <= z1; z++) for (let y = FY; y < FY + 8; y++) W.set(x, y, z, z === 358 ? B.barrier : 0);
    for (let x = gx0; x <= gx1; x++) for (let z = 352; z <= z1 + 3; z++) { const g = G(x, z); if (g >= FY) W.set(x, g - 1, z, B.obsidian); }
    deco.prop('iron_gate', (gx0 + gx1 + 1) / 2, FY, 358.5, { w: 8.4, h: 7, skulls: true });
    // twin towers, green fire burning on top
    for (const tx of [gx0 - 6, gx1 + 2]) {
      for (let x = tx; x < tx + 5; x++) for (let z = 355; z <= 361; z++) for (let y = FY - 3; y < FY + 13; y++) W.set(x, y, z, y >= FY + 11 || (y - FY) % 5 === 4 ? B.black_marble : B.obsidian);
      for (let x = tx; x < tx + 5; x += 2) W.set(x, FY + 13, 361, B.black_marble);
      deco.add('skull', tx + 2.5, FY + 8, 362.02, { mode: 'wall', facing: [0, 1], scale: 2.2 });
      // a great black hound's head crowns each tower, its eyes burning (Cerberus's kin keep the gate)
      const hy = FY + 13;
      W.fill(tx, hy, 356, tx + 4, hy + 3, 360, B.black_marble);
      W.fill(tx + 1, hy, 361, tx + 3, hy + 1, 362, B.black_marble); W.fill(tx + 2, hy + 1, 363, tx + 2, hy + 1, 363, B.obsidian);   // the muzzle, the nose
      W.fill(tx + 1, hy - 1, 362, tx + 3, hy - 1, 362, B.bone_block);                                                                  // fangs under the jaw
      for (const ex of [tx, tx + 4]) { W.fill(ex, hy + 4, 357, ex, hy + 5, 358, B.obsidian); W.set(ex, hy + 6, 357, B.obsidian); }    // ears
      for (const ex of [tx + 1, tx + 3]) W.set(ex, hy + 2, 361, B.lantern);                                                            // eyes
      W.fill(tx + 1, hy + 2, 360, tx + 3, hy + 2, 360, B.black_marble);
      W.addLight(tx + 2.5, hy + 2.5, 362.5, 0xff7a30, 5, 14);
      for (const fx of [tx, tx + 4]) deco.prop('fire', fx + 0.5, W.get(fx, FY + 13, 361) ? FY + 14 : FY + 13, 361.5, { scale: 0.8 });
    }
    // the forecourt, paved in black, with green fire either side of the gate
    pave(368, 362, 398, 372, B.black_marble, 0.85);
    for (const x of [gx0 - 1, gx1 + 1]) { deco.prop('brazier', x + 0.5, G(x, 363), 363.5); W.addLight(x + 0.5, G(x, 363) + 1.6, 363.5, 0xff8a3a, 4, 10); }
    for (let i = 0; i < 6; i++) shade(374 + i * 3, 365 + (i % 2), Math.PI + (rand() - 0.5) * 0.6);
    // Cerberus's collar: a huge red leather ring with gold spikes, lying empty
    const [cx, cz] = [370, 377], cy = G(cx, cz);
    for (let z = cz - 5; z <= cz + 5; z++) for (let x = cx - 5; x <= cx + 5; x++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d >= 2.6 && d <= 4.3) { W.set(x, cy, z, B.red_brick); if (d <= 3.6) W.set(x, cy + 1, z, B.red_brick); }
    }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; W.set(Math.round(cx + Math.cos(a) * 3.4), cy + 2, Math.round(cz + Math.sin(a) * 3.4), B.gold_plate); }
    W.set(cx, cy, cz + 5, B.gold_plate); W.set(cx, cy, cz + 6, B.bronze);   // the buckle and the name tag
    for (let x = cx - 1; x <= cx + 1; x++) for (const z of [cz - 4, cz - 3]) { W.set(x, cy, z, 0); W.set(x, cy + 1, z, 0); }   // a gap to step in
    add.chest({ id: 'asphodel_chest_collar', x: cx, z: cz, rarity: 'rare' });
    // and his bowl, the size of a hot tub, licked clean
    const [bx, bz] = [392, 377], by = G(bx, bz);
    for (let z = bz - 3; z <= bz + 3; z++) for (let x = bx - 3; x <= bx + 3; x++) { const d = Math.hypot(x - bx, z - bz); if (d <= 3.2) { W.set(x, by - 1, z, B.iron_plate); if (d >= 2.3) W.set(x, by, z, B.iron_plate); } }
    deco.add('bone', bx + 0.5, by, bz + 0.5, { scale: 2.2 });
    add.chest({ id: 'asphodel_chest_tower', x: 396, z: 362, rarity: 'common', hidden: true });
    add.landmark({ id: 'asphodel_erebus', x: (gx0 + gx1) >> 1, z: 364 });
    keep.push([362, 350, 398, 382]);
  }

  // ------------------------------------------------------------ the Furies' roost: toppled columns on the far bank
  {
    const cx = 368, cz = 389;
    const spots = [[-4, -3, 6], [3, -4, 4], [5, 2, 7], [-2, 4, 3], [-6, 1, 5], [1, 0, 2]];
    for (const [dx, dz, h] of spots) {
      const x = cx + dx, z = cz + dz, y = G(x, z);
      W.set(x, y - 1, z, B.marble_white);
      for (let i = 0; i < h; i++) W.set(x, y + i, z, i === h - 1 ? B.marble_white : B.column);
      if (h >= 5) for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) W.set(x + a, y + h, z + d, B.dark_planks);   // a nest of black sticks on top
    }
    // a fallen column lying in the ash
    for (let i = 0; i < 6; i++) W.set(cx - 3 + i, G(cx - 3 + i, cz + 7), cz + 7, B.column);
    for (let i = 0; i < 4; i++) deco.prop('rubble', cx - 5 + rand() * 10, G(cx, cz), cz - 5 + rand() * 10);
    for (let i = 0; i < 10; i++) { const x = cx - 7 + Math.floor(rand() * 14), z = cz - 6 + Math.floor(rand() * 12); const y = G(x, z); if (!W.get(x, y, z)) deco.add('chain', x + 0.5, y, z + 0.5, { scale: 0.8 }); }
    add.camp({ id: 'asphodel_fury_roost', x: cx, z: cz, kinds: ['fury', 'fury', 'skeleton', 'ghost'], count: 5, chest: 'rare' });
    keep.push([cx - 8, cz - 7, cx + 8, cz + 9]);
  }

  // ------------------------------------------------------------ the shrine of Hades
  {
    const cx = 275, cz = 371, x0 = 270, x1 = 280, z0 = 365, z1 = 377, y0 = G(cx, cz);
    c.flatten(x0, z0, x1, z1, y0, B.black_marble);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x === x0 || x === x1 || z === z0 || z === z1) && (x + z) % 2) W.set(x, y0 - 1, z, B.basalt);
    for (const [x, z] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1], [x0 + 1, cz], [x1 - 1, cz]]) k.pillar(x, z, y0, 5, B.basalt, B.gold_trim);
    for (let x = x0 + 2; x <= x1 - 2; x++) for (let y = y0; y < y0 + 3; y++) W.set(x, y, z0 + 1, y === y0 + 2 ? B.black_marble : B.obsidian);
    // the altar, and on it the Helm of Darkness
    W.fill(cx - 1, y0, z0 + 3, cx + 1, y0, z0 + 4, B.obsidian); W.fill(cx - 1, y0 + 1, z0 + 3, cx + 1, y0 + 1, z0 + 4, B.gold_trim);
    W.set(cx - 1, y0 + 2, z0 + 3, B.obsidian); W.set(cx, y0 + 2, z0 + 3, B.obsidian); W.set(cx + 1, y0 + 2, z0 + 3, B.obsidian);
    W.set(cx - 1, y0 + 2, z0 + 4, B.obsidian); W.set(cx + 1, y0 + 2, z0 + 4, B.obsidian);
    W.fill(cx - 1, y0 + 3, z0 + 3, cx + 1, y0 + 3, z0 + 4, B.obsidian); W.set(cx, y0 + 4, z0 + 3, B.black_marble); W.set(cx, y0 + 4, z0 + 4, B.black_marble);
    W.addLight(cx + 0.5, y0 + 4.5, z0 + 5, 0x3aff7a, 3, 8);
    brazier(cx - 3, z0 + 4, y0); brazier(cx + 3, z0 + 4, y0);
    for (const x of [cx - 2, cx + 2]) deco.add('skull', x + 0.5, y0 + 1, z0 + 2.02, { mode: 'wall', facing: [0, 1], scale: 0.9 });
    add.shrine({ id: 'asphodel_hades', x: cx, z: cz + 2, waves: [['ghost', 'ghost', 'skeleton'], ['skeleton', 'skeleton', 'hellhound', 'ghost'], ['fury', 'hellhound', 'skeleton', 'ghost', 'empousa'], ['fury', 'fury', 'hellhound', 'skeleton', 'skeleton', 'empousa']] });
    add.chest({ id: 'asphodel_chest_shrine', x: cx + 1, z: z0 - 2, rarity: 'common' });
    for (const [x, z] of [[x0 - 2, z0 - 1], [x1 + 2, z0 - 1], [x0 - 3, z0 + 4], [x1 + 3, z0 + 4]]) trees.pine(x, z, { trunk: B.bark_dark, leaves: B.pine_leaves, h: 12 + Math.floor(rand() * 3), R: 1.3 });
    keep.push([x0 - 4, z0 - 4, x1 + 4, z1 + 3]);
  }

  // ------------------------------------------------------------ the Pool of Lethe, and the empousai's picnic beside it
  {
    const x0 = 240, z0 = 387, x1 = 246, z1 = 392, y0 = G(243, 389);
    c.flatten(x0 - 2, z0 - 2, x1 + 2, z1 + 2, y0, B.marble_floor);
    k.pond(x0, z0, x1, z1, y0, B.water, 2, B.marble_white);
    W.addLight(243.5, y0 + 0.5, 389.5, 0x8ab8ff, 2.5, 8);
    for (const [x, z, r] of [[x0 - 1, 388, Math.PI / 2], [x0 - 1, 391, Math.PI / 2], [243, z0 - 2, 0], [x1 + 1, 390, -Math.PI / 2]]) shade(x, z, r, 0.85);
    deco.prop('vase', x1 + 2.5, y0, z0 - 1.5);
    add.chest({ id: 'asphodel_chest_lethe', x: x0 - 2, z: z1 + 2, rarity: 'common' });
    add.landmark({ id: 'asphodel_lethe', x: 243, z: 389 });
    add.item({ id: 'asphodel_lethe_vial', quest: 'camp_silena_lethe', x: x1 + 2, z: z1 });
    keep.push([x0 - 4, z0 - 4, x1 + 4, z1 + 4]);
    // the empousai's tea party: a long table under a ragged awning
    const px = 259, pz = 391, py = G(px, pz);
    for (const x of [px - 3, px + 3]) for (const z of [pz - 2, pz + 2]) { const y = G(x, z); for (let i = 0; i < 3; i++) W.set(x, y + i, z, B.dark_planks); }
    for (let x = px - 3; x <= px + 3; x++) for (let z = pz - 2; z <= pz + 2; z++) if (rand() < 0.85) W.set(x, py + 3, z, B.awning);
    deco.prop('table', px - 1 + 0.5, py, pz + 0.5); deco.prop('table', px + 1.5, py, pz + 0.5);
    deco.prop('vase', px + 0.5, py + 0.9, pz + 0.5, { scale: 0.5 });
    deco.prop('campfire', px + 0.5, G(px, pz - 5), pz - 5 + 0.5); W.addLight(px + 0.5, py + 1.3, pz - 4.5, 0xff8a3a, 3, 8);
    add.camp({ id: 'asphodel_tea_party', x: px, z: pz - 3, kinds: ['empousa', 'empousa', 'ghost'], count: 5, chest: 'common' });
    keep.push([px - 5, pz - 7, px + 5, pz + 4]);
  }

  // ------------------------------------------------------------ Sisyphus's hill
  {
    const [hx, hz] = HILL, sy = G(hx, hz);
    // the summit: a cairn and a signpost, and the treasure of a man who never gets there
    for (const [dx, dz, h] of [[1, -1, 2], [2, -1, 1], [1, 0, 1]]) { const y = G(hx + dx, hz + dz); for (let i = 0; i < h; i++) W.set(hx + dx, y + i, hz + dz, B.cobble); }
    deco.prop('signpost', hx - 1.5, sy, hz - 1.5, { rot: 0.7 });
    add.chest({ id: 'asphodel_chest_summit', x: hx - 1, z: hz + 1, rarity: 'rare' });
    // the boulder, halfway up the rut, and its eternal pusher
    trees.boulder(215, 367, 2.1, B.cobble);
    add.npc({ id: 'asphodel_sisyphus', x: 219, z: 364, model: 'npc:asphodel_sisyphus', yaw: Math.atan2(-4, 3) });
    add.landmark({ id: 'asphodel_sisyphus', x: hx, z: hz });
    // his camp at the foot: a lean-to and a pile of worn-out sandals
    const lx = 232, lz = 366, ly = G(lx, lz);
    for (let z = lz - 1; z <= lz + 1; z++) { W.set(lx - 1, ly, z, B.old_plank); W.set(lx - 1, ly + 1, z, B.old_plank); W.set(lx, ly + 2, z, B.old_plank); W.set(lx + 1, ly + 1, z, B.old_plank); }
    deco.prop('campfire', lx + 3.5, ly, lz + 0.5, { scale: 0.6 }); W.addLight(lx + 3.5, ly + 1.2, lz + 0.5, 0xff9a40, 2.5, 7);
    for (let i = 0; i < 4; i++) deco.add('bone', lx + 1 + rand() * 2, ly, lz + 2 + rand(), { scale: 0.5 });
    keep.push([lx - 3, lz - 3, lx + 5, lz + 3], [hx - 3, hz - 3, hx + 3, hz + 3], [212, 362, 222, 371]);
  }

  // ------------------------------------------------------------ the mausoleum in the black poplar grove
  {
    const x0 = 191, x1 = 199, z0 = 338, z1 = 345, y0 = G(195, 341);
    c.flatten(x0 - 1, z0 - 1, x1 + 1, z1 + 3, y0, B.stone_brick);
    k.room(x0, z0, x1, z1, y0, 5, B.stone_brick, { alt: B.cracked_brick, altP: 0.25, trim: B.black_marble, doors: [{ side: 's', at: 195, width: 3, height: 3 }] });
    for (const x of [x0 + 1, x1 - 1]) k.pillar(x, z1 + 1, y0, 5, B.column, B.marble_white);
    W.fill(195 - 1, y0, z0 + 1, 195 + 1, y0, z0 + 2, B.stone_brick);                     // a tomb inside
    add.chest({ id: 'asphodel_chest_mausoleum', x: x0 + 2, z: z0 + 2, rarity: 'common', hidden: true });
    deco.prop('brazier', x1 - 1.5, y0, z0 + 2.5, { green: true }); W.addLight(x1 - 1.5, y0 + 1.6, z0 + 2.5, 0x3aff7a, 2.5, 7);
    for (let z = z0; z <= z1 + 1; z++) for (let x = x0; x <= x1; x++) if (!(x >= 194 && x <= 196 && z >= 340 && z <= 342)) W.set(x, y0 + 5, z, B.black_marble);   // the roof, fallen in over the tomb
    W.addRoof([x0 - 1, y0 + 4, z0 - 1], [x1 + 1, y0 + 8, z1 + 2], [[x0 + 1, y0, z0 + 1], [x1 - 1, y0 + 3, z1 - 1]]);
    // graves: rows of grey headstones
    for (let gz = 349; gz <= 357; gz += 4) for (let gx = 182; gx <= 210; gx += 4) {
      if (rand() < 0.25 || (gx >= 193 && gx <= 198)) continue;
      const y = G(gx, gz); W.set(gx, y, gz, B.stone_brick); if (rand() < 0.6) W.set(gx, y + 1, gz, B.stone);
      if (rand() < 0.4) deco.add('asphodel', gx + 0.5, y, gz + 1.5, { scale: 0.8 });
    }
    add.camp({ id: 'asphodel_mausoleum', x: 195, z: 351, kinds: ['ghost', 'skeleton', 'ghost'], count: 6, chest: 'rare' });
    add.landmark({ id: 'asphodel_mausoleum', x: 195, z: 342 });
    keep.push([x0 - 3, z0 - 3, x1 + 3, z1 + 4], [180, 347, 212, 359]);
    // a hollow dead poplar with something inside
    const tx = 180, tz = 343, ty = G(tx, tz);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (dx || dz) for (let i = 0; i < (dz === 1 && dx === 0 ? 0 : 4 - Math.abs(dx)); i++) W.set(tx + dx, ty + i, tz + dz, B.bark_dark);
    add.chest({ id: 'asphodel_chest_hollow', x: tx, z: tz, rarity: 'common', hidden: true });
    keep.push([tx - 2, tz - 2, tx + 2, tz + 3]);
  }

  // ------------------------------------------------------------ quest items: lost fares and wedge stones
  const fares = [[300, 352], [303, 384], [283, 390], [268, 344], [330, 338]];
  fares.forEach(([x, z], i) => add.item({ id: `asphodel_fare_${i}`, quest: 'asphodel_charon_fares', x, z }));
  [[188, 392], [236, 384], [176, 364]].forEach(([x, z], i) => add.item({ id: `asphodel_wedge_${i}`, quest: 'asphodel_sisyphus_wedges', x, z }));
  for (const [x, z] of [...fares, [188, 392], [236, 384], [176, 364], [296, 334], [360, 372], [346, 340], [229, 357]]) keep.push([x - 1, z - 1, x + 1, z + 1]);   // nothing grows on the pick-ups or the waystones

  // ------------------------------------------------------------ the shades wandering the meadows
  for (let i = 0; i < 26; i++) {
    const x = b.x0 + 4 + Math.floor(rand() * (b.x1 - b.x0 - 8)), z = b.z0 + 4 + Math.floor(rand() * (b.z1 - b.z0 - 8));
    if (!inRegion(x, z) || kept(x, z, 3) || !level(x, z, 1, 1, 0)) continue;
    shade(x, z);
  }
  // green fire along the roads, here and there
  for (const [x, z] of [[266, 336], [282, 346], [318, 334], [345, 330], [236, 350], [256, 340]]) if (level(x, z, 1, 1, 0)) brazier(x, z);

  // ------------------------------------------------------------ black poplars
  const poplar = (x, z) => trees.pine(x, z, { trunk: B.bark_dark, leaves: rand() < 0.8 ? B.pine_leaves : B.obsidian, h: 11 + Math.floor(rand() * 6), R: 1.1 + rand() * 0.5 });
  const roadIds = new Set([B.basalt, B.gravel_path, B.dirt_path, B.black_marble, B.stone_brick]);
  const canPlant = (x, z) => inRegion(x, z) && !kept(x, z) && level(x, z, 3, 3, 1) && !roadIds.has(W.get(x, G(x, z) - 1, z)) && riverDist(x, z) > 5;
  // the grove round the mausoleum
  for (let i = 0; i < 260; i++) { const x = 172 + Math.floor(rand() * 76), z = 332 + Math.floor(rand() * 30); if (canPlant(x, z)) poplar(x, z); }
  // lines of them along the Styx, and a scatter over the plains
  for (let i = 0; i < 520; i++) {
    const x = b.x0 + 3 + Math.floor(rand() * (b.x1 - b.x0 - 6)), z = b.z0 + 3 + Math.floor(rand() * (b.z1 - b.z0 - 6));
    const r = riverDist(x, z), p = r < 9 ? 0.7 : 0.22;
    if (rand() < p && canPlant(x, z)) poplar(x, z);
  }
  // dead grey boulders
  for (let i = 0; i < 14; i++) { const x = b.x0 + Math.floor(rand() * (b.x1 - b.x0)), z = b.z0 + Math.floor(rand() * (b.z1 - b.z0)); if (canPlant(x, z)) trees.boulder(x, z, 1 + rand() * 0.8, rand() < 0.5 ? B.underworld_rock : B.basalt); }

  // ------------------------------------------------------------ ground cover
  // twisted dead trees standing bare among the poplars
  const deadTree = (x, z) => {
    const y = G(x, z), h = 5 + Math.floor(rand() * 3), s = rand() < 0.5 ? 1 : -1;
    for (let i = 0; i < h; i++) W.set(x, y + i, z, B.bark_dark);
    // crooked branches climbing as they reach out, one bent over at the top
    for (const [dx, dz, up] of [[s, 0, h - 3], [-s, 0, h - 1], [0, s, h - 2]]) {
      W.set(x + dx, y + up, z + dz, B.bark_dark); W.set(x + dx * 2, y + up + 1, z + dz * 2, B.bark_dark); W.set(x + dx * 2, y + up + 2, z + dz * 2, B.bark_dark);
    }
    W.set(x, y + h, z + s, B.bark_dark);
  };
  for (let i = 0, placed = 0; i < 200 && placed < 34; i++) { const x = b.x0 + 3 + Math.floor(rand() * (b.x1 - b.x0 - 6)), z = b.z0 + 3 + Math.floor(rand() * (b.z1 - b.z0 - 6)); if (canPlant(x, z)) { deadTree(x, z); placed++; } }
  // the ruins of older kingdoms of the dead: broken black pillars, a lone arch here and there
  for (let i = 0, placed = 0; i < 220 && placed < 30; i++) {
    const x = b.x0 + 3 + Math.floor(rand() * (b.x1 - b.x0 - 6)), z = b.z0 + 3 + Math.floor(rand() * (b.z1 - b.z0 - 6));
    if (!canPlant(x, z)) continue;
    const y = G(x, z);
    if (placed % 6 === 5 && level(x, z, 5, 1, 0) && canPlant(x + 2, z) && canPlant(x - 2, z)) {   // an arch over nothing
      for (const dx of [-2, 2]) for (let i2 = 0; i2 < 4; i2++) W.set(x + dx, y + i2, z, i2 === 3 ? B.black_marble : B.dark_brick);
      for (let dx = -1; dx <= 1; dx++) W.set(x + dx, y + 4, z, B.dark_brick); W.set(x - 2, y + 4, z, B.dark_brick);
    } else {
      const hh = 1 + Math.floor(rand() * 4);
      for (let i2 = 0; i2 < hh; i2++) W.set(x, y + i2, z, rand() < 0.35 ? B.underworld_rock : B.dark_brick);
      if (rand() < 0.5) W.set(x + (rand() < 0.5 ? 1 : -1), y, z, B.dark_brick);   // a fallen drum
    }
    placed++;
  }
  // green lanterns on posts down to Charon's jetty
  for (const [x, z] of [[302, 349], [306, 354], [309, 357], [309, 365]]) if (level(x, z, 1, 1, 1)) { const y = G(x, z); for (let i = 0; i < 3; i++) W.set(x, y + i, z, B.dark_planks); W.set(x, y + 3, z, B.neon_green); }
  // the pale asphodel itself: drifts of white flowers, faintly aglow in the dusk
  for (let z = b.z0 + 1; z < b.z1 - 1; z++) for (let x = b.x0 + 1; x < b.x1 - 1; x++) {
    const v = n.value(x * 0.21 + 5, z * 0.21);
    if (v < 0.45 || rand() > (v - 0.45) * 1.6) continue;
    const y = G(x, z);
    const gb = isFinite(y) ? W.get(x, y - 1, z) : 0;
    if ((gb !== B.asphodel && gb !== B.asphalt) || W.get(x, y, z)) continue;
    deco.add('asphodel', x + 0.2 + rand() * 0.6, y, z + 0.2 + rand() * 0.6, { scale: 1.05 + rand() * 0.55, sway: 0.6, emit: 0.35 });
    if (v > 0.62) deco.add('asphodel', x + 0.1 + rand() * 0.8, y, z + 0.1 + rand() * 0.8, { scale: 0.8 + rand() * 0.4, sway: 0.6, emit: 0.35 });
  }
  scatter([B.asphodel], ['asphodel', 'dry_grass', 'skull', 'dry_grass', 'bone'], 0.06);
  scatter([B.asphalt], ['dry_grass', 'dry_grass', 'bone', 'asphodel'], 0.05);
  scatter([B.underworld_rock, B.rock], ['dry_grass', 'bone', 'skull'], 0.04);
  console.log('openworld asphodel build ms', Math.round(performance.now() - __t0));   // TEMP timing
}

// A grey slate gable over the pavilion (ridge along x).
function gableRoof(k, x0, z0, x1, z1, y) {
  const W = k.w;
  for (let i = 0; z0 - 1 + i <= z1 + 1 - i; i++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    W.set(x, y + i, z0 - 1 + i, B.roof_slate); W.set(x, y + i, z1 + 1 - i, B.roof_slate);
    if (z1 + 1 - i - (z0 - 1 + i) <= 1) { W.set(x, y + i, z0 - 1 + i, B.black_marble); W.set(x, y + i, z1 + 1 - i, B.black_marble); }
  }
}

export const QUESTS = [
  // Charon: the ferryman wants his fares, his landing cleared and his raise
  { id: 'asphodel_charon_fares', giver: 'asphodel_charon',
    steps: [{ type: 'collect', count: 5 }, { type: 'return' }], reward: { xp: 500, coins: 150, item: 'common' } },
  { id: 'asphodel_charon_shades', giver: 'asphodel_charon', requires: ['asphodel_charon_fares'],
    steps: [{ type: 'kill', kind: 'ghost', count: 8, region: 'asphodel' }, { type: 'camp', id: 'asphodel_mausoleum' }, { type: 'return' }], reward: { xp: 750, coins: 220, item: 'rare' } },
  { id: 'asphodel_charon_raise', giver: 'asphodel_charon', requires: ['asphodel_charon_shades'],
    steps: [{ type: 'shrine', id: 'asphodel_hades' }, { type: 'reach', x: 383, z: 365, radius: 6 }, { type: 'return' }], reward: { xp: 950, coins: 280, item: 'rare' } },
  // Sisyphus: one day that boulder is staying at the top
  { id: 'asphodel_sisyphus_wedges', giver: 'asphodel_sisyphus',
    steps: [{ type: 'collect', count: 3 }, { type: 'reach', x: 205, z: 375, radius: 4 }, { type: 'return' }], reward: { xp: 550, coins: 160, item: 'common' } },
  { id: 'asphodel_sisyphus_furies', giver: 'asphodel_sisyphus', requires: ['asphodel_sisyphus_wedges'],
    steps: [{ type: 'camp', id: 'asphodel_fury_roost' }, { type: 'kill', kind: 'fury', count: 4, region: 'asphodel' }, { type: 'return' }], reward: { xp: 800, coins: 230, item: 'rare' } },
  { id: 'asphodel_sisyphus_king', giver: 'asphodel_sisyphus', requires: ['asphodel_sisyphus_furies'],
    steps: [{ type: 'champion', id: 'asphodel_pale_king' }, { type: 'chest', id: 'asphodel_chest_crypt' }, { type: 'return' }], reward: { xp: 1200, coins: 340, item: 'unique' } },
];

// The Labyrinth (open world, south): the ruins of Daedalus's maze breaking
// through the grassy hills south of camp, late afternoon. Levels 6-8.
//
//   x 18            70 (gate)        118   124          170
//   z 330 +------- road from camp ---+------------------+
//         |  waystone   Maze Gate    |   Fallen Colonnade|
//         |  Sunken     +-----------+|   (camp)          |
//         |  Courtyard  | the Broken ||  pit camp  waystone
//         |  (Athena)   |   Maze     ||  The Pit   Daedalus's
//         |  Webbed     | (Warden in ||  (vault)   Workshop
//   z 399 |  Halls      |  the heart)||                  |
//         +-------------+------------++------------------+
//
// The maze is a real one (a seeded backtracker, then broken through in
// places): its heart holds the Bronze Warden, its far dead ends the treasure.
import { B } from '../blocks.js';
import { column } from '../rooms.js';

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// the maze: NX × NZ cells of CS blocks (walls on the grid lines)
const MX0 = 70, MZ0 = 358, NX = 12, NZ = 10, CS = 4, MX1 = MX0 + NX * CS, MZ1 = MZ0 + NZ * CS;   // 118, 398
const HEART = [4, 3, 7, 6], YARD = [9, 1, 11, 3];   // rooms in the maze (cells, inclusive)
const inCells = (R, i, j) => i >= R[0] && i <= R[2] && j >= R[1] && j <= R[3];
const cellX = (i) => MX0 + i * CS + 2, cellZ = (j) => MZ0 + j * CS + 2;
const HEART_C = [cellX(HEART[0]) + 6, cellZ(HEART[1]) + 6];   // (94, 378)
// gates in the maze's outer wall: side, cell
const GATES = [['n', 1], ['w', 6], ['e', 7]];

// level ground the region's places stand on: [x0, z0, x1, z1, height]
const FLATS = [
  [18, 377, 52, 399, 5],             // the hill under the Webbed Halls
  [27, 347, 49, 371, 1],             // the Sunken Courtyard
  [MX0 - 1, MZ0 - 2, MX1 + 1, 399, 1],   // the maze
  [122, 336, 166, 352, 0],           // the Fallen Colonnade
  [124, 362, 168, 399, 1],           // the pit and the workshop
];
const inMaze = (x, z) => x >= MX0 && x <= MX1 && z >= MZ0 && z <= MZ1;

export const terrain = {
  height(x, z, n) {
    let h = (n.fbm(x, z, 34) - 0.5) * 7 + 1;
    // grassy knolls between the ruins
    h += 4 * smooth((12 - Math.hypot(x - 100, z - 344)) / 8);
    h += 5 * smooth((10 - Math.hypot(x - 58, z - 392)) / 7);
    h += 3 * smooth((9 - Math.hypot(x - 60, z - 356)) / 6);
    for (const [x0, z0, x1, z1, fh] of FLATS) {
      const d = Math.max(x0 - x, x - x1, z0 - z, z - z1, 0), w = 1 - smooth(d / 6);
      if (w > 0) h = h * (1 - w) + fh * w;
    }
    return h;
  },
  surface(x, z, h, n) {
    if (inMaze(x, z)) { const v = n.value(x * 0.7, z * 0.7); return v > 0.74 ? B.grass : v > 0.42 ? B.cobble : B.stone_brick; }
    const v = n.value(x * 0.2, z * 0.2);
    if (v > 0.66) return B.cobble;
    if (h >= 3 && n.value(x * 0.5 + 9, z * 0.5) > 0.7) return B.moss_floor;
    return B.grass;
  },
};

export function build(c) {
  const { W, k, deco, add, scatter, trees, inRegion, top, rand, n, road } = c;
  const S = (x, y, z, id) => { if (inRegion(x, z) && y >= 0 && y < W.sy) W.set(x, y, z, id); };
  const G = (x, y, z) => W.get(x, y, z);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const brick = (x, y, z) => { const v = n.hash(x * 3 + y, z * 5 - y); return v < 0.2 ? B.mossy_brick : v < 0.27 ? B.cracked_brick : B.stone_brick; };
  const col = (x, z, y0, y1, id) => { for (let y = y0; y <= y1; y++) S(x, y, z, typeof id === 'function' ? id(x, y, z) : id); };
  const clearUp = (x, z, y0, h = 8) => { for (let y = y0; y < y0 + h; y++) S(x, y, z, 0); };
  // level a footprint so you stand at `y` on it (fill below with dirt, top it with `id`, clear above)
  const pad = (x0, z0, x1, z1, y, id = null) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!inRegion(x, z)) continue;
      const g = top(x, z), cur = isFinite(g) ? G(x, g - 1, z) : B.dirt;
      for (let yy = Math.min(g, y) - 3; yy < y; yy++) S(x, yy, z, yy === y - 1 ? (id ?? cur ?? B.grass) : B.dirt);
      clearUp(x, z, y, 9);
    }
  };
  // steps from a doorway (standing at y) out to the ground along dir, w wide: no step over 1 block
  const apron = (x, z, y, [dx, dz], w = 3, id = B.cobble) => {
    const px = -dz, pz = dx, prev = new Map();
    for (let s = 1; s <= 16; s++) {
      let changed = false;
      for (let q = -(w >> 1); q <= (w >> 1); q++) {
        const bx = x + dx * s + px * q, bz = z + dz * s + pz * q, p = prev.get(q) ?? y;
        if (!inRegion(bx, bz)) continue;
        const g = top(bx, bz); let lv = g;
        if (g < p - 1) { lv = p - 1; for (let yy = g - 1; yy < lv; yy++) S(bx, yy, bz, yy === lv - 1 ? id : B.dirt); changed = true; }
        else if (g > p + 1) { lv = p + 1; for (let yy = lv; yy < g + 2; yy++) S(bx, yy, bz, 0); S(bx, lv - 1, bz, id); changed = true; }
        prev.set(q, lv);
      }
      if (!changed && s > 1) break;
    }
  };
  const light = (x, y, z, color = 0xffb060, i = 3, d = 8) => W.addLight(x + 0.5, y, z + 0.5, color, i, d);
  const brazier = (x, z, y) => { deco.prop('brazier', x + 0.5, y, z + 0.5); light(x, y + 1.4, z, 0xffa040, 4, 10); };
  const web = (x, y, z, s = 1.2) => deco.add('cobweb', x + 0.5, y, z + 0.5, { mode: 'hang', scale: s, sway: 0.1 });
  const bones = (x, z, y, n2 = 3) => { for (let i = 0; i < n2; i++) deco.add(i % 3 === 2 ? 'skull' : 'bone', x + 0.5 + (rand() - 0.5) * 2, y, z + 0.5 + (rand() - 0.5) * 2, { mode: 'flat', scale: 0.6 + rand() * 0.3 }); };
  // a Greek Delta, the mark of Daedalus, glowing blue in a wall (u along the wall, rows up from y)
  const delta = (x, y, z, along, size = 5) => {
    const rows = size === 5 ? [[-2, -1, 0, 1, 2], [-1, 1], [0]] : [[-1, 0, 1], [0]];
    rows.forEach((r, i) => r.forEach((u) => S(along === 'x' ? x + u : x, y + i, along === 'x' ? z : z + u, B.blue_energy)));
  };
  // a gate's two bronze leaves, swung open flat out from the wall either side of a 3-wide way
  // (along 'z': the leaves stand at x = c ± 2 and run from s out along dir; 'x' the other way)
  const gateLeaves = (c, s, y0, along, dir) => {
    for (const side of [-2, 2]) for (let q = 0; q < 3; q++) {
      const [x, z] = along === 'z' ? [c + side, s + dir * q] : [s + dir * q, c + side];
      const y = Math.min(y0, top(x, z));
      for (let yy = y; yy < y0 + 4; yy++) S(x, yy, z, yy === y0 + 3 || (yy === y0 + 1 && q === 1) ? B.gold_trim : B.bronze);
      if (q !== 1) S(x, y0 + 4, z, B.gold_trim);   // spear tips
    }
  };
  // a ragged monster camp: hide tents, a bone totem, a fire, banners
  const tent = (x, z, y, axis, id = B.old_plank) => {
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const yy = y + 2 - Math.abs(b), [bx, bz] = axis === 'x' ? [x + a, z + b] : [x + b, z + a];
      S(bx, yy, bz, id);
      if (a === -2 && Math.abs(b) < 2) for (let q = y; q < yy; q++) S(bx, q, bz, id);   // the closed back
    }
  };
  const totem = (x, z, y) => { col(x, z, y, y + 2, B.bone_block); deco.add('skull', x + 0.5, y + 3, z + 0.5, { scale: 0.9, sway: 0 }); deco.add('banner', x + 0.5, y + 2.4, z - 0.05, { mode: 'wall', facing: [0, -1], scale: 1.2, sway: 0.4 }); };
  const fire = (x, z, y) => { deco.prop('campfire', x + 0.5, y, z + 0.5); light(x, y + 1, z, 0xff8a30, 5, 11); };

  // ================================================================ the Broken Maze
  const E = Array.from({ length: NX }, () => new Array(NZ).fill(false));   // wall east of (i, j) open
  const Sd = Array.from({ length: NX }, () => new Array(NZ).fill(false));  // wall south of (i, j) open
  const room = (i, j) => (inCells(HEART, i, j) ? 1 : inCells(YARD, i, j) ? 2 : 0);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    if (room(i, j) && i + 1 < NX && room(i + 1, j) === room(i, j)) E[i][j] = true;
    if (room(i, j) && j + 1 < NZ && room(i, j + 1) === room(i, j)) Sd[i][j] = true;
  }
  const open = (i, j, a, b) => { if (a === i + 1) E[i][j] = true; else if (a === i - 1) E[a][j] = true; else if (b === j + 1) Sd[i][j] = true; else Sd[i][b] = true; };
  const vis = new Uint8Array(NX * NZ), stack = [];
  const visit = (i, j) => {
    const r = room(i, j);
    if (r) { for (let a = 0; a < NX; a++) for (let b = 0; b < NZ; b++) if (room(a, b) === r) { vis[b * NX + a] = 1; stack.push([a, b]); } }
    else { vis[j * NX + i] = 1; stack.push([i, j]); }
  };
  visit(1, 0);
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < NX && b < NZ && !vis[b * NX + a]);
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[Math.floor(rand() * nb.length)];
    open(i, j, a, b); visit(a, b);
  }
  // the heart opens on every side; a few walls have fallen and made loops
  E[HEART[0] - 1][4] = E[HEART[2]][5] = Sd[5][HEART[1] - 1] = Sd[6][HEART[3]] = true;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    if (i + 1 < NX && !E[i][j] && rand() < 0.1) E[i][j] = true;
    if (j + 1 < NZ && !Sd[i][j] && rand() < 0.1) Sd[i][j] = true;
  }
  const gateAt = (side, x, z) => GATES.some(([s, cIdx]) => s === side && (side === 'n' || side === 's'
    ? x > MX0 + cIdx * CS && x < MX0 + cIdx * CS + CS : z > MZ0 + cIdx * CS && z < MZ0 + cIdx * CS + CS));
  // is the grid-line block at (x, z) a wall? (boundary walls closed except at the gates)
  const wallAt = (x, z) => {
    const lx = x - MX0, lz = z - MZ0, onX = lx % CS === 0, onZ = lz % CS === 0;
    if (!onX && !onZ) return false;
    if (lx === 0) return !gateAt('w', x, z);
    if (lx === NX * CS) return !gateAt('e', x, z);
    if (lz === 0) return !gateAt('n', x, z);
    if (lz === NZ * CS) return true;
    const i = Math.floor(lx / CS), j = Math.floor(lz / CS);
    if (onX && onZ) {   // a post: stands unless every wall meeting it is open
      const segs = [!E[i - 1][j - 1], !E[i - 1][j], !Sd[i - 1][j - 1], !Sd[i][j - 1]];
      return segs.some(Boolean);
    }
    if (onX) return !E[i - 1][j];
    return !Sd[i][j - 1];
  };
  const mazeY = top(MX0 + 2, MZ0 + 2);
  for (let z = MZ0; z <= MZ1; z++) for (let x = MX0; x <= MX1; x++) {
    if (!wallAt(x, z)) continue;
    const lx = x - MX0, lz = z - MZ0, post = lx % CS === 0 && lz % CS === 0;
    const segKey = post ? n.hash(x, z) : n.hash(Math.floor(lx / CS) * 7 + (lx % CS === 0 ? 1 : 0), Math.floor(lz / CS) * 11 + (lz % CS === 0 ? 3 : 5));
    const edge = lx === 0 || lz === 0 || lx === NX * CS || lz === NZ * CS;
    // high walls (the outer ring highest), crumbling in places
    let h = post ? 6 + (segKey > 0.55 ? 1 : 0) : (edge ? 5 : 4) + Math.floor(segKey * 3);
    if (!edge && !post && segKey < 0.07) h = 1;                       // tumbled down to a step
    if (h > 2 && n.hash(x * 13, z * 7) < 0.28) h -= 1;                 // crumbling tops
    const y = top(x, z);
    col(x, z, y, y + h - 1, (xx, yy, zz) => (yy >= y + h - 2 && n.hash(xx * 5 + yy, zz) < 0.45 ? B.mossy_brick : yy === y && n.hash(xx, zz * 7) < 0.3 ? B.dark_brick : brick(xx, yy, zz)));
    if (h >= 4 && n.hash(x, z * 3) < 0.08) S(x, y + h - 1, z, B.key_frieze);
    // grass and bushes run wild along the tops
    else if (h >= 3 && n.hash(x * 7 + 1, z * 3) < 0.28) S(x, y + h, z, B.leaves);
  }
  // hanging ivy down the corridor walls, torches burning on the posts
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = MX0 + i * CS, z = MZ0 + j * CS, yb = mazeY, hv = n.hash(i * 13 + 5, j * 7 + 1);
    if (hv < 0.45 && G(x, yb + 3, z + 2) && !G(x + (hv < 0.3 ? 1 : -1), yb + 2, z + 2)) deco.add(hv < 0.22 ? 'vine' : 'ivy', x + (hv < 0.3 ? 1.03 : -0.03), yb + 2.6, z + 2.5, { mode: 'wall', facing: [hv < 0.3 ? 1 : -1, 0], scale: 2.2, sway: 0.15 });
    if (hv > 0.6 && G(x + 2, yb + 3, z) && !G(x + 2, yb + 2, z + (hv > 0.7 ? 1 : -1))) deco.add(hv > 0.8 ? 'vine' : 'ivy', x + 2.5, yb + 2.6, z + (hv > 0.7 ? 1.03 : -0.03), { mode: 'wall', facing: [0, hv > 0.7 ? 1 : -1], scale: 2.2, sway: 0.15 });
    if (i > 0 && j > 0 && (i + j * 3) % 7 === 0 && G(x, yb + 4, z) && !(i >= HEART[0] && i <= HEART[2] + 1 && j >= HEART[1] && j <= HEART[3] + 1)) {
      let t = yb + 4; while (G(x, t, z) && t < yb + 9) t++;
      S(x, t - 1, z, B.lantern); S(x, t, z, 0);   // a fire bowl burning on the post
    }
  }
  // blue banners of the Delta hung down the outer walls
  for (let x = MX0 + 6; x < MX1 - 2; x += 8) if (G(x, mazeY + 4, MZ0) && !G(x, mazeY + 1, MZ0 - 1)) deco.add('banner', x + 0.5, mazeY + 3.2, MZ0 - 0.03, { mode: 'wall', facing: [0, -1], scale: 2.2, sway: 0.3 });
  for (let z = MZ0 + 6; z < MZ1 - 2; z += 8) for (const [x, f] of [[MX0, -1], [MX1, 1]]) if (G(x, mazeY + 4, z) && !G(x + f, mazeY + 1, z)) deco.add('banner', x + 0.5 + f * 0.53, mazeY + 3.2, z + 0.5, { mode: 'wall', facing: [f, 0], scale: 2.2, sway: 0.3 });
  // inside: webs over the dark corners, vines, bones, rubble where the walls fell
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    if (room(i, j)) continue;
    const x = cellX(i), z = cellZ(j), r = n.hash(i * 31, j * 17);
    if (r < 0.22) web(x + (r < 0.11 ? -1 : 1), mazeY + 3.6, z + (r < 0.06 ? 1 : -1), 1.4);
    else if (r < 0.32) bones(x, z, mazeY, 2);
    else if (r < 0.38) deco.prop('rubble', x + 0.5, mazeY, z + 0.5);
    if (n.hash(i * 5, j * 9 + 2) < 0.3) deco.add('vine', x - 1.48, mazeY + 2.2, z + 0.5, { mode: 'wall', facing: [1, 0], scale: 1.8, sway: 0.15 });
    if (n.hash(i * 3 + 1, j * 7) < 0.4) deco.add(pick(['grass', 'fern', 'tall_grass']), x + 0.5 + rand(), mazeY, z + 0.5 - rand(), { scale: 0.8, sway: 1 });
  }
  // the dead ends: far ones keep the treasure, the rest Rachel's lost pages
  const deg = (i, j) => (i + 1 < NX && E[i][j] ? 1 : 0) + (i > 0 && E[i - 1][j] ? 1 : 0) + (j + 1 < NZ && Sd[i][j] ? 1 : 0) + (j > 0 && Sd[i][j - 1] ? 1 : 0) + (GATES.some(([s, g]) => (s === 'n' && j === 0 && i === g) || (s === 'w' && i === 0 && j === g) || (s === 'e' && i === NX - 1 && j === g)) ? 1 : 0);
  const dist = new Int16Array(NX * NZ).fill(-1), q = [[1, 0]]; dist[1] = 0;
  for (let h = 0; h < q.length; h++) {
    const [i, j] = q[h], d = dist[j * NX + i];
    const go = (a, b, ok) => { if (ok && dist[b * NX + a] < 0) { dist[b * NX + a] = d + 1; q.push([a, b]); } };
    go(i + 1, j, i + 1 < NX && E[i][j]); go(i - 1, j, i > 0 && E[i - 1][j]); go(i, j + 1, j + 1 < NZ && Sd[i][j]); go(i, j - 1, j > 0 && Sd[i][j - 1]);
  }
  const ends = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) if (!room(i, j) && deg(i, j) === 1 && !(i === 1 && j === 0)) ends.push([i, j, dist[j * NX + i]]);
  ends.sort((a, b) => b[2] - a[2]);
  const spare = [];   // corridor cells as a fallback when the maze has few dead ends
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) if (!room(i, j) && !ends.some((e) => e[0] === i && e[1] === j) && dist[j * NX + i] > 6) spare.push([i, j, dist[j * NX + i]]);
  spare.sort((a, b) => b[2] - a[2]);
  const spots = [...ends, ...spare.filter((_, i) => i % 3 === 0)];
  const take = () => { const s = spots.shift() ?? [2, 8]; return [cellX(s[0]), cellZ(s[1])]; };
  const [c1x, c1z] = take(); add.chest({ id: 'lab_maze_far', x: c1x, z: c1z, rarity: 'rare' }); web(c1x - 1, mazeY + 3.5, c1z - 1); bones(c1x, c1z, mazeY);
  const [c2x, c2z] = take(); add.chest({ id: 'lab_maze_end', x: c2x, z: c2z, rarity: 'common' }); web(c2x + 1, mazeY + 3.5, c2z + 1);
  for (let i = 0; i < 4; i++) { const [px, pz] = take(); add.item({ id: `lab_page_${i}`, quest: 'labyrinth_rachel_pages', x: px, z: pz }); deco.add('paper', px + 0.5, mazeY + 0.01, pz + 1.2, { mode: 'flat', scale: 0.8 }); }

  // the Maze Gate: a bronze-gated gatehouse with the Delta over the arch
  {
    const gx = MX0 + GATES[0][1] * CS + 2, gz = MZ0, y = top(gx, gz - 2);
    for (const tx of [gx - 4, gx + 2]) for (let dz = -2; dz <= 0; dz++) for (let dx = 0; dx < 3; dx++) col(tx + dx, gz + dz, y, y + 6, brick);
    for (let dz = -2; dz <= 0; dz++) for (let dx = -1; dx <= 1; dx++) { col(gx + dx, gz + dz, y + 4, y + 6, B.stone_brick); clearUp(gx + dx, gz + dz, y, 3); }
    for (let dx = -4; dx <= 4; dx++) { S(gx + dx, y + 7, gz - 2, dx % 2 ? B.key_frieze : B.stone_brick); S(gx + dx, y + 7, gz, dx % 2 ? B.key_frieze : B.stone_brick); }
    for (let dx = -2; dx <= 2; dx++) S(gx + dx, y + 3, gz - 2, B.bronze);   // the bronze lintel the Delta sits on
    // a gilded frame round the arch: gold jambs, a gold cornice, the blue Delta on a bronze field
    for (const dx of [-2, 2]) col(gx + dx, gz - 2, y, y + 6, (xx, yy) => (yy === y + 3 ? B.gold_plate : B.bronze));
    for (let dx = -3; dx <= 3; dx++) S(gx + dx, y + 7, gz - 2, B.gold_trim);
    for (let dx = -1; dx <= 1; dx++) for (let yy = y + 4; yy <= y + 6; yy++) S(gx + dx, yy, gz - 2, B.bronze);
    delta(gx, y + 4, gz - 2, 'x');
    gateLeaves(gx, gz - 3, y, 'z', -1);
    for (const dx of [-4, 4]) deco.add('banner', gx + dx + 0.5, y + 5, gz - 3.03, { mode: 'wall', facing: [0, -1], scale: 2.4, sway: 0.3 });
    k.torch(gx - 3, y + 2, gz - 2, [0, -1]); k.torch(gx + 3, y + 2, gz - 2, [0, -1]);
    light(gx, y + 5, gz - 4, 0xffc070, 3, 9);
    add.landmark({ id: 'lab_gate', x: gx, z: gz - 3 });
    add.waystone('labyrinth_gate', 69, 351);
    add.chest({ id: 'lab_gate_chest', x: gx - 3, z: gz + 3, rarity: 'common' });
    road([[64, 346], [70, 350], [gx, gz - 6], [gx, gz - 1]], B.stone_brick, 3);
  }
  // the side gates: a Delta over each
  {
    const wz = MZ0 + GATES[1][1] * CS + 2, y = top(MX0 - 2, wz);
    for (let dz = -2; dz <= 2; dz++) col(MX0, wz + dz, y + 4, y + 5, B.bronze);
    for (const dz of [-2, 2]) col(MX0, wz + dz, y, y + 3, (xx, yy) => (yy === y + 3 ? B.gold_trim : B.bronze));
    for (let dz = -3; dz <= 3; dz++) S(MX0, y + 6, wz + dz, B.gold_trim);
    delta(MX0, y + 4, wz, 'z', 3);
    apron(MX0 - 1, wz, y, [-1, 0], 3, B.cobble);
    gateLeaves(wz, MX0 - 1, y, 'x', -1);
    k.torch(MX0, y + 2, wz - 3, [-1, 0]); k.torch(MX0, y + 2, wz + 3, [-1, 0]);
    const ez = MZ0 + GATES[2][1] * CS + 2, y2 = top(MX1 + 2, ez);
    for (let dz = -2; dz <= 2; dz++) col(MX1, ez + dz, y2 + 4, y2 + 5, B.bronze);
    for (const dz of [-2, 2]) col(MX1, ez + dz, y2, y2 + 3, (xx, yy) => (yy === y2 + 3 ? B.gold_trim : B.bronze));
    for (let dz = -3; dz <= 3; dz++) S(MX1, y2 + 6, ez + dz, B.gold_trim);
    delta(MX1, y2 + 4, ez, 'z', 3);
    apron(MX1 + 1, ez, y2, [1, 0], 3, B.cobble);
    gateLeaves(ez, MX1 + 1, y2, 'x', 1);
    k.torch(MX1, y2 + 2, ez - 3, [1, 0]); k.torch(MX1, y2 + 2, ez + 3, [1, 0]);
  }
  // the heart: a round arena on a mosaic floor, the Warden's hall
  {
    const [hx, hz] = HEART_C, y = mazeY;
    for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) {
      const r = Math.hypot(dx, dz);
      S(hx + dx, y - 1, hz + dz, r < 2.5 ? B.marble_white : r < 5.5 ? ((dx + dz) & 1 ? B.marble_floor : B.marble) : B.stone_brick);
    }
    // the Delta inlaid in the floor
    for (const [u, v] of [[-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 0], [1, 0], [0, -1]]) S(hx + u, y - 1, hz + v, B.blue_energy);
    for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
      const hh = 3 + Math.floor(n.hash(hx + dx, hz + dz) * 4);
      column(k, hx + dx, hz + dz, y, hh, { cap: hh >= 6 ? B.marble_white : B.column });
    }
    for (const [dx, dz] of [[-6, 0], [6, 0], [0, -6], [0, 6]]) brazier(hx + dx, hz + dz, y);
    // a toppled bronze guardian: the Warden's broken twin
    for (let i = 0; i < 4; i++) S(hx - 3 + i, y, hz + 4, B.bronze);
    S(hx - 4, y, hz + 4, B.iron_plate); S(hx + 1, y, hz + 4, B.blue_energy);
    add.champion({ id: 'lab_bronze_warden', x: hx, z: hz + 1, kind: 'dracaena' });   // (fights like a slow, heavy guard; its look is the bronze automaton: entities/champions.js)
    add.landmark({ id: 'lab_heart', x: hx, z: hz });
  }
  // the maze yard: a scrapheap where the broken guards gather
  {
    const yx = cellX(YARD[0]) + 4, yz = cellZ(YARD[1]) + 4, y = mazeY;
    for (const [dx, dz, id] of [[-3, -3, B.bronze], [-3, -2, B.rust_metal], [-2, -3, B.iron_plate], [3, 3, B.bronze], [4, 2, B.rust_metal], [3, 2, B.iron_plate]]) { S(yx + dx, y, yz + dz, id); if (rand() < 0.5) S(yx + dx, y + 1, yz + dz, B.rust_metal); }
    fire(yx, yz, y);
    totem(yx + 4, yz - 3, y);
    tent(yx - 3, yz + 3, y, 'x', B.old_plank);
    deco.prop('anvil', yx + 1.5, y, yz - 2.5);
    deco.prop('statue', yx - 3.5, y, yz - 0.5, { bronze: true, pose: 1, rot: 0.6 });
    bones(yx + 2, yz + 1, y);
    add.camp({ id: 'lab_yard_camp', x: yx, z: yz, kinds: ['automaton', 'automaton', 'skeleton'], count: 5, radius: 7, chest: 'rare' });
    add.item({ id: 'lab_gear_0', quest: 'labyrinth_quintus_gears', x: yx - 2, z: yz - 1 });
  }

  // ================================================================ the Sunken Courtyard (Athena's shrine)
  {
    const cx = 38, cz = 359, g = top(cx, cz), f = g - 3;
    pad(28, 348, 48, 370, g);
    for (let z = cz - 7; z <= cz + 7; z++) for (let x = cx - 7; x <= cx + 7; x++) {
      for (let y = f; y < g + 2; y++) S(x, y, z, 0);
      S(x, f - 1, z, (x + z) & 1 ? B.marble_floor : (n.hash(x, z) < 0.25 ? B.grass : B.cobble));
    }
    for (let z = cz - 8; z <= cz + 8; z++) for (let x = cx - 8; x <= cx + 8; x++) {
      if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) !== 8) continue;
      for (let y = f - 1; y < g; y++) S(x, y, z, brick(x, y, z));
      S(x, g, z, B.stone_brick);   // a low rim
    }
    // steps down in the middle of each side
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      for (let q = -1; q <= 1; q++) for (let s = 0; s <= 2; s++) {
        const x = cx + dx * (8 - s) + (dz ? q : 0), z = cz + dz * (8 - s) + (dx ? q : 0), stand = g - s;
        for (let y = f - 1; y < stand; y++) S(x, y, z, B.stone_brick);
        for (let y = stand; y < g + 3; y++) S(x, y, z, 0);
      }
    }
    // broken columns round the rim
    for (const [dx, dz] of [[-8, -8], [-4, -8], [4, -8], [8, -8], [-8, 8], [-4, 8], [4, 8], [8, 8], [-8, -4], [-8, 4], [8, -4], [8, 4]]) {
      const hh = 2 + Math.floor(n.hash(cx + dx, cz + dz) * 5);
      column(k, cx + dx, cz + dz, g + 1, hh, { cap: hh >= 5 ? B.marble_white : B.column });
    }
    for (let i = 0; i < 4; i++) S(cx + 10 + i, top(cx + 10 + i, cz + 3), cz + 3, B.column_solid);   // one fell outward
    // Athena's sanctuary: a dry fountain, her owl on a pillar behind the altar
    k.pond(cx - 2, cz + 2, cx + 2, cz + 4, f, B.water, 1, B.marble_white);
    col(cx, cz + 5, f, f + 1, B.marble_white); S(cx, f + 2, cz + 5, B.owl_stone);
    deco.add('em_athena', cx + 0.5, f + 1.6, cz + 4.98, { mode: 'wall', facing: [0, -1], scale: 1.3, sway: 0 });
    deco.prop('vase', cx - 5.5, f, cz + 5.5); deco.prop('vase', cx + 5.5, f, cz + 5.5, { red: true });
    deco.prop('bench_marble', cx - 5.5, f, cz - 1.5, { rot: Math.PI / 2 }); deco.prop('bench_marble', cx + 5.5, f, cz - 1.5, { rot: Math.PI / 2 });
    k.lanternPost(cx - 6, cz - 6, f); k.lanternPost(cx + 6, cz - 6, f);
    for (const [dx, dz] of [[-6, 6], [6, 6], [-3, -6]]) deco.add('ivy', cx + dx + 0.5, f, cz + dz + 0.5, { scale: 1.1 });
    add.shrine({ id: 'lab_athena_shrine', x: cx, z: cz, rot: Math.PI, waves: [['skeleton', 'skeleton', 'spider'], ['automaton', 'spider', 'spider', 'skeleton'], ['automaton', 'automaton', 'fury']] });
    add.landmark({ id: 'lab_court', x: cx, z: cz - 2 });
    add.chest({ id: 'lab_court_chest', x: cx + 6, z: cz + 6, rarity: 'common' });
    add.waystone('labyrinth_court', 38, 342);
    road([[64, 346], [52, 344], [42, 343]], B.stone_brick, 3);
    road([[38, 345], [38, 350]], B.stone_brick, 3);
  }

  // ================================================================ the Webbed Halls (spiders)
  {
    const x0 = 20, z0 = 379, x1 = 48, z1 = 397, y = top(34, 388);
    pad(x0, z0, x1, z1, y, B.cobble);
    k.room(x0, z0, x1, z1, y, 5, B.dark_brick, { alt: B.mossy_brick, altP: 0.3, doors: [{ side: 'n', at: 34, width: 3 }, { side: 'e', at: 384, width: 3 }] });
    // inner walls: a long hall, two dark passages, the egg chamber at the back
    for (let x = x0; x <= x1; x++) if (Math.abs(x - 26) > 1 && Math.abs(x - 41) > 1) col(x, 389, y, y + 4, (xx, yy, zz) => brick(xx, yy, zz));
    for (let z = 389; z <= z1; z++) if (Math.abs(z - 393) > 1) col(33, z, y, y + 4, B.dark_brick);
    for (let z = 389; z <= z1; z++) if (Math.abs(z - 395) > 0) col(40, z, y, y + 4, B.dark_brick);
    // a roof with holes where it fell in (it hides when you are inside)
    // (the long front hall lost its roof; a light well falls on the egg chamber's hoard)
    for (let z = 389; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (x >= 44 && x <= 46 && z >= 393 && z <= 395) continue;
      if (n.hash(x * 2, z * 2) > 0.12 || x === x0 || x === x1 || z === 389 || z === z1) S(x, y + 5, z, n.hash(x, z) < 0.3 ? B.mossy_brick : B.stone_brick);
    }
    W.addRoof([x0, y + 5, 389], [x1, y + 5, z1], [[x0 + 1, y, 390], [x1 - 1, y + 4, z1 - 1]]);
    // webs everywhere, bones of the unlucky
    for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 1; x < x1; x++) {
      const h = n.hash(x * 7, z * 3);
      if (h < (z > 389 ? 0.14 : 0.03) && !G(x, y + 4, z)) web(x, y + 4.9, z, 1.3 + h * 3);
      else if (h > 0.96) bones(x, z, y, 2);
    }
    for (let x = x0 + 1; x < x1; x += 3) deco.add('cobweb', x + 0.5, y + 2.5, z0 - 0.02, { mode: 'wall', facing: [0, -1], scale: 1.6, sway: 0.05 });
    deco.add('cobweb', 34.5, y + 3.2, z0 + 0.5, { mode: 'hang', scale: 2.4, sway: 0.2 });   // across the doorway
    k.torch(x0 + 1, y + 2, 384, [1, 0]); k.torch(x1 - 1, y + 2, 386, [-1, 0]);
    light(44, y + 1.2, 393, 0x9ad0ff, 2, 7);
    apron(34, z0, y, [0, -1], 3, B.cobble); apron(x1, 384, y, [1, 0], 3, B.cobble);
    add.camp({ id: 'lab_web_camp', x: 34, z: 384, kinds: ['spider', 'spider', 'spider', 'skeleton'], count: 6, radius: 8, chest: 'rare' });
    add.chest({ id: 'lab_web_egg', x: 45, z: 394, rarity: 'rare', hidden: true });
    bones(44, 392, y, 4); web(44, y + 4.8, 395, 2.2);
    add.landmark({ id: 'lab_halls', x: 34, z: z0 - 2 });
  }

  // ================================================================ the Fallen Colonnade
  {
    const x0 = 124, x1 = 164, za = 339, zb = 349, y = top(144, 344);
    pad(x0 - 1, za - 1, x1 + 1, zb + 1, y, B.grass);
    for (let z = za + 1; z < zb; z++) for (let x = x0; x <= x1; x++) S(x, y - 1, z, n.hash(x, z * 3) < 0.25 ? B.grass : n.hash(x * 3, z) < 0.3 ? B.cobble : B.marble_floor);
    const cols = [];
    for (let x = x0 + 1; x <= x1; x += 4) for (const z of [za, zb]) {
      const r = n.hash(x * 9, z), intact = r > 0.55, hh = intact ? 7 : 2 + Math.floor(r * 6);
      column(k, x, z, y, hh, { cap: intact ? B.marble_white : B.column });
      cols.push({ x, z, intact });
      if (!intact && r < 0.25) for (let i = 1; i <= 4; i++) S(x, y, z + (z === za ? i : -i), B.column_solid);   // fell across the walk
    }
    // the architrave where neighbouring columns still stand
    for (const a of cols) { const b = cols.find((q) => q.z === a.z && q.x === a.x + 4); if (a.intact && b?.intact) for (let x = a.x; x <= b.x; x++) S(x, y + 7, a.z, x % 2 ? B.key_frieze : B.marble_white); }
    deco.prop('statue', 128.5, y, 344.5, { pose: 0, rot: Math.PI / 2 });
    deco.prop('bust', 160.5, y, 344.5, { rot: -Math.PI / 2 });
    deco.prop('rubble', 137.5, y, 342.5); deco.prop('rubble', 151.5, y, 346.5);
    for (const x of [133, 155]) tent(x, 344, y, 'z', B.old_plank);
    totem(146, 341, y); fire(142, 345, y); bones(148, 346, y);
    add.camp({ id: 'lab_colonnade_camp', x: 142, z: 344, kinds: ['skeleton', 'skeleton', 'fury'], count: 5, radius: 9, chest: 'common' });
    add.chest({ id: 'lab_colonnade_chest', x: 162, z: 346, rarity: 'common' });
    add.item({ id: 'lab_gear_1', quest: 'labyrinth_quintus_gears', x: 126, z: 347 });
    add.landmark({ id: 'lab_colonnade', x: 144, z: 344 });
    road([[MX0 + 8, MZ0 - 5], [100, 352], [122, 352], [140, 355], [158, 357]], B.cobble, 3);
  }

  // ================================================================ the Pit, and the vault under the workshop
  {
    const px0 = 128, pz0 = 380, N = 11, y = top(134, 386), bottom = 1;
    pad(px0 - 2, pz0 - 2, px0 + N + 1, pz0 + N + 1, y, B.cobble);
    // rim
    for (let z = pz0 - 1; z <= pz0 + N; z++) for (let x = px0 - 1; x <= px0 + N; x++) {
      if (x !== px0 - 1 && x !== px0 + N && z !== pz0 - 1 && z !== pz0 + N) continue;
      if (x === px0 - 1 && z >= 384 && z <= 386) continue;   // the way in (west)
      S(x, y, z, n.hash(x, z) < 0.35 ? B.cracked_brick : B.dark_brick);
    }
    // the shaft
    for (let z = pz0; z < pz0 + N; z++) for (let x = px0; x < px0 + N; x++) { for (let yy = bottom; yy < y + 3; yy++) S(x, yy, z, 0); S(x, bottom - 1, z, B.obsidian); }
    // lined with old brick
    for (let z = pz0 - 1; z <= pz0 + N; z++) for (let x = px0 - 1; x <= px0 + N; x++) {
      if (x !== px0 - 1 && x !== px0 + N && z !== pz0 - 1 && z !== pz0 + N) continue;
      for (let yy = bottom; yy < y - 1; yy++) if (G(x, yy, z)) S(x, yy, z, n.hash(x * 3 + yy, z) < 0.3 ? B.mossy_brick : B.dark_brick);
    }
    // a ledge stair winding down the walls (one block a step), from the west gap
    const ring = [];
    for (let z = 385; z >= pz0; z--) ring.push([px0, z]);
    for (let x = px0 + 1; x < px0 + N; x++) ring.push([x, pz0]);
    for (let z = pz0 + 1; z < pz0 + N; z++) ring.push([px0 + N - 1, z]);
    ring.forEach(([x, z], i) => { const stand = Math.max(bottom, y - 1 - Math.floor(i / 2)); for (let yy = bottom - 1; yy < stand; yy++) S(x, yy, z, yy === stand - 1 ? B.stone_brick : B.stone); });
    for (const [x, z] of [[px0 - 1, 384], [px0 - 1, 385], [px0 - 1, 386]]) S(x, y - 1, z, B.stone_brick);
    for (let i = 0; i < 9; i++) web(px0 + 1 + Math.floor(n.hash(i, 3) * (N - 2)), y + 0.5 - n.hash(i, 9) * 4, pz0 + 1 + Math.floor(n.hash(3, i) * (N - 2)), 1.6);
    bones(133, 386, bottom, 5); bones(137, 389, bottom, 3);
    // a passage east from the bottom to a sealed vault under Daedalus's floor
    for (let x = px0 + N; x <= 150; x++) for (let z = 385; z <= 387; z++) for (let yy = bottom; yy < bottom + 3; yy++) S(x, yy, z, 0);
    for (let x = 146; x <= 151; x++) for (let z = 382; z <= 390; z++) { for (let yy = bottom; yy < bottom + 3; yy++) S(x, yy, z, 0); S(x, bottom - 1, z, B.marble_floor); S(x, bottom + 3, z, B.stone_brick); }
    for (let x = px0 + N; x <= 145; x++) for (const z of [384, 388]) for (let yy = bottom; yy < bottom + 3; yy++) S(x, yy, z, B.stone_brick);
    for (let x = px0 + N; x <= 145; x++) for (let z = 385; z <= 387; z++) S(x, bottom - 1, z, B.cobble);
    delta(152, bottom + 1, 386, 'z', 3);
    light(148, bottom + 2, 386, 0x6ac8ff, 3, 8);
    deco.prop('vase', 147.5, bottom, 383.5); deco.prop('vase', 147.5, bottom, 389.5, { red: true });
    add.landmark({ id: 'lab_pit', x: 134, z: 386 });
    // the pit's watchers camp on its north lip
    tent(130, 375, y, 'x', B.old_plank); fire(135, 375, y); totem(139, 374, y);
    add.camp({ id: 'lab_pit_camp', x: 134, z: 375, kinds: ['skeleton', 'skeleton', 'spider', 'fury'], count: 5, radius: 8, chest: 'common' });
    add.item({ id: 'lab_gear_2', quest: 'labyrinth_quintus_gears', x: 126, z: 392 });
  }

  // ================================================================ Daedalus's Workshop
  {
    const x0 = 144, z0 = 371, x1 = 162, z1 = 391, y = top(153, 381), hgt = 6;
    pad(x0 - 1, z0 - 7, x1 + 2, z1 + 1, y, B.stone_brick);
    k.room(x0, z0, x1, z1, y, hgt, B.stone_brick, { alt: B.mossy_brick, altP: 0.15, trim: B.key_frieze, doors: [{ side: 'n', at: 153, width: 3 }, { side: 'w', at: 377, width: 3 }] });
    for (const x of [147, 150, 156, 159]) S(x, y + 2, z0, B.window);
    delta(153, y + 4, z0, 'x');
    // bronze wings on the back wall: feathers of gold and bronze
    const wing = (cx, dir) => { for (let r = 0; r < 4; r++) for (let u = 0; u <= 5 - r; u++) S(cx + dir * u, y + 1 + r, z1, r === 3 ? B.gold_plate : (u + r) % 2 ? B.bronze : B.gold_trim); };
    wing(152, -1); wing(154, 1); S(153, y + 1, z1, B.bronze); S(153, y + 2, z1, B.bronze);
    // east half: a flat roof with a parapet; the west half fell in long ago
    for (let z = z0; z <= z1; z++) for (let x = 153; x <= x1; x++) S(x, y + hgt, z, B.stone_brick);
    for (let z = z0; z <= z1; z++) for (const x of [x1]) if (z < 380 || z > 383) S(x, y + hgt + 1, z, B.stone_brick);
    for (let x = 153; x <= x1; x++) { S(x, y + hgt + 1, z0, B.stone_brick); S(x, y + hgt + 1, z1, B.stone_brick); }
    for (let x = x0 + 1; x < 153; x += 3) for (let z = z0; z <= z1; z++) if (n.hash(x, z) > 0.1) S(x, y + hgt, z, B.dark_planks);   // bare beams
    W.addRoof([153, y + hgt, z0], [x1, y + hgt + 1, z1], [[x0 + 1, y, z0 + 1], [x1 - 1, y + hgt - 1, z1 - 1]]);
    // the way up: old planks stacked as steps against the east wall
    k.stairs(x1 + 1, 387, y, hgt + 1, [0, -1], 2, B.old_plank);
    add.chest({ id: 'lab_workshop_roof', x: 158, z: 376, rarity: 'rare', hidden: true });
    // inside: benches, anvils, a half-built automaton, scattered drawings
    deco.prop('table', 147.5, y, 374.5, { len: 4 }); deco.prop('table', 158.5, y, 388.5, { len: 4 });
    deco.prop('anvil', 156.5, y, 375.5); deco.prop('anvil', 150.5, y, 387.5);
    deco.prop('scaffold_post', 146.5, y, 383.5, { h: 4 });
    deco.prop('statue', 159.5, y, 380.5, { bronze: true, pose: 0, rot: -Math.PI / 2 });
    deco.prop('statue', 159.5, y, 384.5, { bronze: true, pose: 1, rot: -Math.PI / 2 });
    for (let i = 0; i < 6; i++) deco.add('paper', 146 + rand() * 6, y + 0.01, 373 + rand() * 3, { mode: 'flat', scale: 0.7 });
    deco.add('paper', 147.6, y + 0.95, 374.4, { mode: 'flat', scale: 1 });
    // the half-built giant: legs, a hollow chest, a head on the floor with one blue eye
    for (const dx of [0, 2]) col(148 + dx, 381, y, y + 1, B.bronze);
    for (let dx = 0; dx <= 2; dx++) for (let dz = 0; dz <= 1; dz++) S(148 + dx, y + 2, 381 + dz, dx === 1 && dz === 0 ? B.iron_plate : B.bronze);
    S(150, y, 385, B.bronze); S(151, y, 385, B.bronze); S(150, y + 1, 385, B.bronze); S(151, y + 1, 385, B.blue_energy);
    k.torch(x0 + 1, y + 2, 381, [1, 0]); k.torch(x1 - 1, y + 2, 378, [-1, 0]);
    light(153, y + 4, 381, 0xffc070, 3, 10);
    apron(153, z0 - 7, y, [0, -1], 3, B.stone_brick); apron(x0 - 1, 377, y, [-1, 0], 3, B.stone_brick);
    // the forecourt, with braziers
    brazier(147, 366, y); brazier(159, 366, y);
    add.landmark({ id: 'lab_workshop', x: 153, z: 368 });
    add.waystone('labyrinth_workshop', 160, 358);
    // where the floor gave way into the vault below (the passage from the pit ends there too)
    for (let x = 146; x <= 148; x++) for (let z = 386; z <= 388; z++) for (let yy = 1; yy < y; yy++) S(x, yy, z, 0);
    for (const [x, z] of [[145, 385], [149, 389], [145, 389]]) S(x, y - 1, z, B.cracked_brick);
    deco.prop('rubble', 147.5, 1, 389.5); web(146, y - 0.5, 386, 1.6);
    add.chest({ id: 'lab_pit_vault', x: 147, z: 387, rarity: 'epic', hidden: true });
    add.npc({ id: 'quintus', x: 151, z: 376, y, model: 'npc:quintus', yaw: Math.PI });
  }

  // ================================================================ a lookout ruin on the coast
  {
    const x = 24, z = 344, y = top(x, z);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
      const hh = 1 + Math.floor(n.hash(x + dx, z + dz) * 4);
      if (dz === 2 && dx === 0) continue;
      col(x + dx, z + dz, y, y + hh - 1, brick);
    }
    add.chest({ id: 'lab_lookout', x, z, rarity: 'common', hidden: true });
    deco.add('vine', x - 1.5, y + 1.2, z + 0.5, { mode: 'wall', facing: [1, 0], scale: 1.4 });
  }

  // ================================================================ people
  add.npc({ id: 'rachel', x: 62, z: 347, model: 'npc:rachel', yaw: 2.3 });
  deco.prop('table', 60.5, top(60, 345), 345.5, { len: 2 });
  deco.add('paper', 60.6, top(60, 345) + 0.95, 345.4, { mode: 'flat', scale: 0.9 });

  // ================================================================ trees and grass between the ruins
  const busy = [[20, 340, 28, 348], [26, 340, 50, 371], [18, 376, 50, 399], [MX0 - 3, MZ0 - 8, MX1 + 5, 399], [120, 334, 168, 355], [122, 356, 170, 399], [56, 342, 72, 356]];
  // dark pines crowd the ruins (as on the sheet), a few broad oaks among them
  for (let i = 0, placed = 0; i < 260 && placed < 46; i++) {
    const x = 18 + Math.floor(rand() * 150), z = 332 + Math.floor(rand() * 66);
    if (busy.some(([a, b, cc, d]) => x >= a - 3 && x <= cc + 3 && z >= b - 3 && z <= d + 3) || !c.level(x, z, 3, 3, 1)) continue;
    let onRoad = false;   // keep the crowns off the roads
    for (let dz = -3; dz <= 3 && !onRoad; dz += 3) for (let dx = -3; dx <= 3; dx += 3) { const gb = G(x + dx, top(x + dx, z + dz) - 1, z + dz); if (gb === B.stone_brick || gb === B.cobble) { onRoad = true; break; } }
    if (onRoad) continue;
    if (rand() < 0.3) trees.oak(x, z); else trees.pine(x, z, { h: 7 + Math.floor(rand() * 5), R: 2.2 + rand() * 0.6 });
    placed++;
  }
  // slim cypresses at the edges of the ruins
  for (const [x, z] of [[54, 349], [57, 371], [62, 380], [66, 396], [52, 360], [121, 356], [120, 372], [168, 362], [118, 396], [26, 372], [50, 374]]) if (c.level(x, z, 1, 1, 1) && !G(x, top(x, z), z)) trees.pine(x, z, { h: 8 + Math.floor(rand() * 3), R: 1.1 });
  for (const [x, z] of [[56, 392], [60, 388], [64, 370], [96, 340], [104, 345]]) if (c.level(x, z, 3, 3, 1)) trees.boulder(x, z, 1.5, B.stone);
  scatter([B.grass, B.moss_floor], ['grass', 'tall_grass', 'fern', 'grass', 'flower_yellow', 'flower_red', 'tall_grass', 'flower_yellow'], 0.16);
  scatter([B.cobble, B.stone_brick], ['grass', 'fern', 'flower_yellow'], 0.03);
}

const lvl = { xp: 520, coins: 150 };
export const QUESTS = [
  // Rachel Elizabeth Dare, sketching the maze by the gate
  { id: 'labyrinth_rachel_pages', giver: 'rachel', steps: [{ type: 'collect', count: 4 }, { type: 'return' }], reward: { ...lvl } },
  { id: 'labyrinth_rachel_owl', giver: 'rachel', requires: ['labyrinth_rachel_pages'], steps: [{ type: 'reach', x: 38, z: 359, radius: 6 }, { type: 'shrine', id: 'lab_athena_shrine' }, { type: 'return' }], reward: { xp: 600, coins: 180, item: 'rare' } },
  { id: 'labyrinth_rachel_webs', giver: 'rachel', requires: ['labyrinth_rachel_owl'], steps: [{ type: 'kill', kind: 'spider', count: 8, region: 'labyrinth' }, { type: 'camp', id: 'lab_web_camp' }, { type: 'return' }], reward: { xp: 680, coins: 200, item: 'rare' } },
  // Quintus, the swordsman in the workshop (who is more than he seems)
  { id: 'labyrinth_quintus_gears', giver: 'quintus', steps: [{ type: 'kill', kind: 'automaton', count: 6, region: 'labyrinth' }, { type: 'collect', count: 3 }, { type: 'return' }], reward: { ...lvl } },
  { id: 'labyrinth_quintus_warden', giver: 'quintus', requires: ['labyrinth_quintus_gears'], steps: [{ type: 'reach', x: HEART_C[0], z: HEART_C[1] + 5, radius: 5 }, { type: 'champion', id: 'lab_bronze_warden' }, { type: 'return' }], reward: { xp: 760, coins: 220, item: 'rare' } },
  { id: 'labyrinth_quintus_vault', giver: 'quintus', requires: ['labyrinth_quintus_warden'], steps: [{ type: 'camp', id: 'lab_pit_camp' }, { type: 'chest', id: 'lab_pit_vault' }, { type: 'return' }], reward: { xp: 900, coins: 260, item: 'unique' } },
];

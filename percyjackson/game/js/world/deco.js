// Small decoration details: grass tufts, flowers, cobwebs, chains, paper
// talismans, bones, candles, banners and hanging lanterns. All sprite quads
// are merged into one mesh (wind sway via a vertex attribute); a few 3D
// props (shrine lanterns, stone lanterns) are merged into a second mesh.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { spriteUV, SPRITE_INDEX as SI } from '../gfx/textures.js';
import { ditherMask, occlusionAmount } from '../gfx/materials.js';
import { LiveSign, boardPainter } from './liveSign.js';
import { B } from './blocks.js';

// Props a hero can't walk through: [height in blocks, 'core' for the trunk or
// post only (else the prop's footprint)]. One block high can be stepped or
// hopped over; two need a jump from something lower or can't be crossed.
// (An audit of camp, Manhattan and 36 chapter levels found every palm, fence
// and campfire, half the statues and most tram pods walk-through.) Ghosts,
// flames, signs, low rails and the like stay passable.
export const SOLID_PROPS = {
  palm: [2, 'core'], statue: [2], tram_pod: [2], campfire: [1, 'core'], fence: [1], vase: [1], bust: [1], brazier: [1, 'core'],
  archery_target: [2, 'core'], signpost: [1, 'core'], clock: [2], weathervane: [2, 'core'], streetlight: [2, 'core'],
};
let solidMat = null;

export class Decorations {
  constructor() { this.items = []; this.props = []; this.mesh = null; this.propMesh = null; }
  // Invisible wall (B.barrier) under the solid props (SOLID_PROPS), in air
  // cells only; run once on the built world, before it is meshed (main.js
  // loadWorld). A footprint is the cells whose middle lies in the prop's
  // built boxes, seen from above.
  solidify(world) {
    if (this.solidified) return; this.solidified = true;
    solidMat ??= new THREE.MeshBasicNodeMaterial();
    const fake = { group: new THREE.Group() }, mats = { props: new Proxy({}, { get: () => solidMat }) }, box = new THREE.Box3(), b = new THREE.Box3();
    for (const p of this.props) {
      const spec = SOLID_PROPS[p.kind]; if (!spec) continue;
      const [h, core] = spec, y0 = Math.floor(p.y + 0.01), cells = [];
      if (core) cells.push([Math.floor(p.x), Math.floor(p.z)]);
      else {
        const one = new Decorations(); one.props = [p];
        try { one.buildProps(fake, mats); } catch (e) { continue; }
        box.makeEmpty();
        one.propMesh?.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); if (b.min.y < p.y + 1.6) box.union(b); o.geometry.dispose(); } });
        fake.group.clear();
        if (box.isEmpty()) continue;
        for (let x = Math.floor(box.min.x); x <= Math.floor(box.max.x); x++) for (let z = Math.floor(box.min.z); z <= Math.floor(box.max.z); z++) if (x + 0.5 >= box.min.x && x + 0.5 <= box.max.x && z + 0.5 >= box.min.z && z + 0.5 <= box.max.z) cells.push([x, z]);
        if (!cells.length) cells.push([Math.floor(p.x), Math.floor(p.z)]);
      }
      for (const [x, z] of cells) for (let k = 0; k < h; k++) if (!world.get(x, y0 + k, z)) world.set(x, y0 + k, z, B.barrier);
    }
  }
  add(type, x, y, z, o = {}) { this.items.push({ type, x, y, z, ...o }); }
  // 3D prop: { kind, x, y, z, rot }
  prop(kind, x, y, z, o = {}) { this.props.push({ kind, x, y, z, ...o }); }

  build(world, materials, density = 1) {
    const pos = [], nrm = [], uv = [], col = [], sway = [], emit = [], idx = [];
    let n = 0;
    const quad = (p0, p1, p2, p3, uvr, normal, sw, em, c = 1) => {
      const [u0, v0, u1, v1] = uvr;
      pos.push(...p0, ...p1, ...p2, ...p3);
      for (let i = 0; i < 4; i++) nrm.push(...normal);
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      if (sw < 0) sway.push(-sw, -sw, 0, 0); else sway.push(0, 0, sw, sw); emit.push(em, em, em, em);
      for (let i = 0; i < 4; i++) col.push(c, c, c);
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    };
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // big worlds: one mesh per 64 × 64 tile, so the camera culls what is off screen
    const tiled = world.sx * world.sz > 60000, TILE = 64, tiles = new Map();
    const order = tiled ? [...this.items].sort((a, b) => tileOf(a) - tileOf(b)) : this.items;
    function tileOf(it) { return Math.floor(it.z / TILE) * 1000 + Math.floor(it.x / TILE); }
    let curTile = null;
    const cut = () => { if (n) tiles.set(curTile, { pos: pos.splice(0), nrm: nrm.splice(0), uv: uv.splice(0), col: col.splice(0), sway: sway.splice(0), emit: emit.splice(0), idx: idx.splice(0) }); n = 0; };
    for (const it of order) {
      if (tiled && tileOf(it) !== curTile) { cut(); curTile = tileOf(it); }
      if (it.optional !== false && rnd() > density && (it.type === 'grass' || it.type === 'tall_grass' || it.type === 'fern')) continue;
      const s = it.scale ?? 1;
      const sprite = SI[it.type] ?? SI.grass;
      const uvr = spriteUV(sprite);
      const { x, y, z } = it;
      if (it.mode === 'wall') {
        // flat on a wall; facing = normal direction [nx, nz]
        const [nx, nz] = it.facing; const tx = -nz, tz = nx; const h = s * 0.5;
        const ox = x + nx * 0.02, oz = z + nz * 0.02;
        quad([ox - tx * h, y - h, oz - tz * h], [ox + tx * h, y - h, oz + tz * h], [ox + tx * h, y + h, oz + tz * h], [ox - tx * h, y + h, oz - tz * h], uvr, [nx, 0, nz], it.sway ?? 0.2, it.emit ?? 0);
      } else if (it.mode === 'hang') {
        // cross quad hanging down from y
        const h = s;
        for (const a of [0.785, 2.356]) {
          const cx = Math.cos(a) * s * 0.5, cz = Math.sin(a) * s * 0.5;
          quad([x - cx, y - h, z - cz], [x + cx, y - h, z + cz], [x + cx, y, z + cz], [x - cx, y, z - cz], uvr, [0, 1, 0], -(it.sway ?? 0.5), it.emit ?? 0);
        }
      } else if (it.mode === 'flat') {
        const h = s * 0.5; const yy = y + 0.02;
        quad([x - h, yy, z + h], [x + h, yy, z + h], [x + h, yy, z - h], [x - h, yy, z - h], uvr, [0, 1, 0], 0, it.emit ?? 0);
      } else {
        // crossed billboard standing on the ground
        const h = s; const ang = (it.rot ?? rnd() * Math.PI);
        for (const a of [ang, ang + Math.PI / 2]) {
          const cx = Math.cos(a) * s * 0.5, cz = Math.sin(a) * s * 0.5;
          quad([x - cx, y, z - cz], [x + cx, y, z + cz], [x + cx, y + h, z + cz], [x - cx, y + h, z - cz], uvr, [0, 1, 0], it.sway ?? 1, it.emit ?? 0, it.tint ?? 1);
        }
      }
    }
    cut();
    for (const m of this.meshes ?? []) { world.group.remove(m); m.geometry.dispose(); }
    this.meshes = [];
    for (const a of tiles.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(a.col, 3));
      g.setAttribute('sway', new THREE.Float32BufferAttribute(a.sway, 1));
      g.setAttribute('emit', new THREE.Float32BufferAttribute(a.emit, 1));
      g.setIndex(a.idx);
      const mesh = new THREE.Mesh(g, materials.deco);
      mesh.receiveShadow = true; mesh.castShadow = false;
      world.group.add(mesh); this.meshes.push(mesh);
    }
    this.mesh = this.meshes[0] ?? null;
    this.buildProps(world, materials);
  }
  buildProps(world, materials) {
    this.liveSigns = [];
    if (this.propMesh) { world.group.remove(this.propMesh); this.propMesh.traverse((o) => o.geometry?.dispose()); }
    const group = new THREE.Group();
    const M = materials.props;
    // Boxes are collected per material and merged into one mesh each (few draw calls).
    const batches = new Map();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
    const tiled = world.sx * world.sz > 60000;
    let tile = 0;   // (big worlds: batches per 64 × 64 tile as well, so the camera culls them)
    const put = (geo, mat, x, y, z, rx, ry, rz) => {
      _e.set(rx, ry, rz); _q.setFromEuler(_e); _m.compose(_v.set(x, y, z), _q, _s); geo.applyMatrix4(_m);
      const key = tiled ? tile + '|' + mat.uuid : mat;
      if (!batches.has(key)) batches.set(key, { mat, geos: [] });
      batches.get(key).geos.push(geo);
    };
    // legacy: world-space box rotated about its own centre
    const box = (w, h, d, x, y, z, mat, ry = 0) => put(new THREE.BoxGeometry(w, h, d), mat, x, y, z, 0, ry, 0);
    for (const p of this.props) {
      const { x, y, z } = p;
      tile = Math.floor(z / 64) * 1000 + Math.floor(x / 64);
      const rot = p.rot ?? 0, sc = p.scale ?? 1, cr = Math.cos(rot), sr = Math.sin(rot);
      // prop-local box: offsets are rotated by the prop's yaw and scaled
      const lb = (w, h, d, lx, ly, lz, mat, ry = 0, rx = 0, rz = 0) => put(new THREE.BoxGeometry(w * sc, h * sc, d * sc), mat, x + (lx * cr + lz * sr) * sc, y + ly * sc, z + (-lx * sr + lz * cr) * sc, rx, rot + ry, rz);
      const cyl = (rt, rb, h, lx, ly, lz, mat, seg = 8) => put(new THREE.CylinderGeometry(rt * sc, rb * sc, h * sc, seg), mat, x + (lx * cr + lz * sr) * sc, y + ly * sc, z + (-lx * sr + lz * cr) * sc, 0, rot, 0);
      switch (p.kind) {
        case 'stone_lantern': // tōrō
          box(0.7, 0.2, 0.7, x, y + 0.1, z, M.stone); box(0.3, 0.7, 0.3, x, y + 0.55, z, M.stone);
          box(0.6, 0.15, 0.6, x, y + 0.95, z, M.stone); box(0.42, 0.4, 0.42, x, y + 1.22, z, M.lanternGlow);
          box(0.8, 0.14, 0.8, x, y + 1.49, z, M.stone); box(0.4, 0.14, 0.4, x, y + 1.62, z, M.stone);
          break;
        case 'paper_lantern': // hanging red lantern
          box(0.04, 0.5, 0.04, x, y + 0.25, z, M.dark);
          box(0.5, 0.6, 0.5, x, y - 0.3, z, M.redLantern); box(0.56, 0.08, 0.56, x, y, z, M.dark); box(0.56, 0.08, 0.56, x, y - 0.6, z, M.dark);
          break;
        case 'torch':
          box(0.12, 0.6, 0.12, x, y + 0.3, z, M.wood); box(0.18, 0.18, 0.18, x, y + 0.66, z, M.flame);
          break;
        case 'candle_cluster':
          for (let i = 0; i < 3; i++) { const a = i * 2.1, r = 0.15; const hh = 0.2 + i * 0.08; box(0.08, hh, 0.08, x + Math.cos(a) * r, y + hh / 2, z + Math.sin(a) * r, M.wax); box(0.05, 0.08, 0.05, x + Math.cos(a) * r, y + hh + 0.05, z + Math.sin(a) * r, M.flame); }
          break;
        case 'torii': {
          const w = p.w ?? 5, h = p.h ?? 5;
          box(0.45, h, 0.45, x - w / 2, y + h / 2, z, M.red, p.rot); box(0.45, h, 0.45, x + w / 2, y + h / 2, z, M.red, p.rot);
          box(w + 1.6, 0.4, 0.6, x, y + h + 0.2, z, M.dark); box(w + 0.8, 0.3, 0.45, x, y + h - 0.8, z, M.red);
          break;
        }
        case 'bench': box(1.6, 0.12, 0.5, x, y + 0.5, z, M.wood); box(0.1, 0.5, 0.4, x - 0.7, y + 0.25, z, M.dark); box(0.1, 0.5, 0.4, x + 0.7, y + 0.25, z, M.dark); break;
        case 'streetlight': box(0.15, 5, 0.15, x, y + 2.5, z, M.metal); box(1.2, 0.12, 0.2, x + 0.5, y + 5, z, M.metal); box(0.4, 0.12, 0.3, x + 1, y + 4.9, z, M.lampGlow); break;
        case 'car': {
          const c = p.color ?? 0x7a1a1a; const cm = M.car(c);
          box(3.8, 0.9, 1.8, x, y + 0.65, z, cm, p.rot); box(2.2, 0.7, 1.6, x - 0.2, y + 1.4, z, M.glass, p.rot);
          break;
        }
        case 'vending_sign': box(0.1, 1.2, 2, x, y + 0.6, z, M.lampGlow); break;
        case 'dummy_post': box(0.2, 1.2, 0.2, x, y + 0.6, z, M.wood); break;
        case 'rubble': for (let i = 0; i < 5; i++) box(0.3 + Math.random() * 0.3, 0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.3, x + (Math.random() - 0.5) * 1.5, y + 0.12, z + (Math.random() - 0.5) * 1.5, M.stone, Math.random() * 3); break;
        // ------------------------------------------------ Half-Blood Quests props
        case 'vase': { // black-figure amphora (or a red-figure one with p.red)
          const body = p.red ? M.vaseBlack : M.terracotta, band = p.red ? M.terracotta : M.vaseBlack;
          lb(0.34, 0.08, 0.34, 0, 0.04, 0, band); lb(0.22, 0.12, 0.22, 0, 0.13, 0, body);
          lb(0.5, 0.42, 0.5, 0, 0.4, 0, body); lb(0.54, 0.16, 0.54, 0, 0.42, 0, band);
          lb(0.4, 0.14, 0.4, 0, 0.68, 0, body); lb(0.2, 0.22, 0.2, 0, 0.86, 0, band); lb(0.3, 0.06, 0.3, 0, 0.99, 0, body);
          lb(0.06, 0.3, 0.06, 0.24, 0.78, 0, band); lb(0.06, 0.3, 0.06, -0.24, 0.78, 0, band);
          break;
        }
        case 'display_case': { // plinth, glass box, a vase inside
          lb(1.0, 0.9, 1.0, 0, 0.45, 0, M.plinth); lb(1.06, 0.06, 1.06, 0, 0.92, 0, M.bronze);
          lb(0.96, 1.1, 0.96, 0, 1.5, 0, M.glassClear); lb(1.0, 0.05, 1.0, 0, 2.06, 0, M.bronze);
          for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lb(0.05, 1.12, 0.05, a * 0.48, 1.5, b * 0.48, M.bronze);
          const s2 = sc * 0.8, oy = 0.95; // vase
          const v = (w, h, d, ly, mat) => lb(w * 0.8, h * 0.8, d * 0.8, 0, oy + ly * 0.8, 0, mat);
          v(0.22, 0.12, 0.22, 0.13, M.terracotta); v(0.5, 0.42, 0.5, 0.4, M.terracotta); v(0.54, 0.16, 0.54, 0.42, M.vaseBlack); v(0.4, 0.14, 0.4, 0.68, M.terracotta); v(0.2, 0.22, 0.2, 0.86, M.vaseBlack);
          void s2;
          break;
        }
        case 'statue': { // blocky marble hero on a plinth; p.pose: 0 spear, 1 arms up, 2 thinker
          const m = p.bronze ? M.bronze : M.marble, pose = p.pose ?? 0;
          lb(1.2, 0.8, 1.2, 0, 0.4, 0, M.plinth); lb(1.3, 0.1, 1.3, 0, 0.85, 0, M.marble);
          const b = 0.9;
          lb(0.22, 0.75, 0.24, -0.14, b + 0.38, 0, m); lb(0.22, 0.75, 0.24, 0.14, b + 0.38, 0, m);
          lb(0.56, 0.75, 0.32, 0, b + 1.12, 0, m); lb(0.6, 0.18, 0.36, 0, b + 0.82, 0, m); // chiton fold
          lb(0.36, 0.38, 0.36, 0, b + 1.7, 0, m); lb(0.4, 0.12, 0.4, 0, b + 1.86, -0.02, m);
          if (pose === 1) { lb(0.18, 0.7, 0.18, -0.38, b + 1.75, 0, m, 0, 0, 0.3); lb(0.18, 0.7, 0.18, 0.38, b + 1.75, 0, m, 0, 0, -0.3); }
          else if (pose === 2) { lb(0.18, 0.6, 0.18, -0.36, b + 1.15, 0, m); lb(0.18, 0.55, 0.18, 0.3, b + 1.35, 0.18, m, 0, -0.9, 0); }
          else { lb(0.18, 0.6, 0.18, -0.37, b + 1.15, 0, m); lb(0.18, 0.6, 0.18, 0.37, b + 1.3, 0.1, m, 0, -0.4, 0); lb(0.07, 2.6, 0.07, 0.42, b + 1.4, 0.3, p.bronze ? M.dark : M.bronze); lb(0.16, 0.3, 0.06, 0.42, b + 2.75, 0.3, M.bronze); }
          break;
        }
        case 'bust': lb(0.5, 1.1, 0.5, 0, 0.55, 0, M.plinth); lb(0.5, 0.3, 0.3, 0, 1.25, 0, M.marble); lb(0.3, 0.34, 0.3, 0, 1.55, 0, M.marble); lb(0.34, 0.1, 0.34, 0, 1.74, -0.02, M.marble); break;
        case 'bench_marble': lb(1.8, 0.16, 0.6, 0, 0.5, 0, M.marble); lb(0.3, 0.45, 0.5, -0.65, 0.22, 0, M.marble); lb(0.3, 0.45, 0.5, 0.65, 0.22, 0, M.marble); break;
        case 'brazier': // bronze tripod bowl with a flame (add a light where you place it)
          for (let i = 0; i < 3; i++) { const a = i * 2.094; lb(0.07, 1.0, 0.07, Math.cos(a) * 0.22, 0.5, Math.sin(a) * 0.22, M.bronze); }
          lb(0.64, 0.18, 0.64, 0, 1.02, 0, M.bronze); lb(0.5, 0.06, 0.5, 0, 1.12, 0, M.dark);
          { const fl = p.green ? M.greenFlame : M.flame; lb(0.3, 0.34, 0.3, 0, 1.3, 0, fl, 0.4); lb(0.18, 0.3, 0.18, 0.05, 1.5, 0.02, fl, 1.1); }
          break;
        case 'archery_target': // straw boss on an easel, facing +z (rot turns it)
          lb(0.1, 1.9, 0.1, -0.55, 0.95, -0.25, M.wood, 0, 0.18); lb(0.1, 1.9, 0.1, 0.55, 0.95, -0.25, M.wood, 0, 0.18); lb(0.1, 1.6, 0.1, 0, 0.8, -0.6, M.wood, 0, -0.35);
          lb(1.4, 1.4, 0.22, 0, 1.25, 0, M.hay); lb(1.2, 1.2, 0.05, 0, 1.25, 0.12, M.white);
          lb(0.92, 0.92, 0.06, 0, 1.25, 0.13, M.targetBlue); lb(0.62, 0.62, 0.07, 0, 1.25, 0.14, M.targetRed); lb(0.3, 0.3, 0.08, 0, 1.25, 0.15, M.gold);
          if (p.arrows) for (let i = 0; i < 3; i++) lb(0.03, 0.03, 0.6, (i - 1) * 0.22, 1.2 + (i % 2) * 0.25, 0.4, M.wood);
          break;
        case 'campfire':
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; lb(0.36, 0.22, 0.36, Math.cos(a) * 0.85, 0.11, Math.sin(a) * 0.85, M.stone, a); }
          lb(1.2, 0.18, 0.2, 0, 0.14, 0, M.wood, 0.5); lb(1.2, 0.18, 0.2, 0, 0.24, 0, M.wood, -0.6); lb(1.1, 0.18, 0.2, 0, 0.34, 0, M.wood, 1.6);
          lb(0.6, 0.6, 0.6, 0, 0.6, 0, M.flame, 0.3); lb(0.4, 0.6, 0.4, 0.1, 1.0, 0.05, M.flame, 1.0); lb(0.24, 0.4, 0.24, -0.05, 1.35, 0, M.flame, 0.2);
          break;
        case 'canoe': { // along local x
          const c = M.car(p.color ?? 0xb8452a);
          lb(2.6, 0.32, 0.7, 0, 0.16, 0, c); lb(0.5, 0.32, 0.46, 1.5, 0.2, 0, c); lb(0.5, 0.32, 0.46, -1.5, 0.2, 0, c);
          lb(0.3, 0.3, 0.24, 1.85, 0.26, 0, c); lb(0.3, 0.3, 0.24, -1.85, 0.26, 0, c);
          lb(2.4, 0.08, 0.5, 0, 0.3, 0, M.dark); lb(0.12, 0.06, 0.66, 0.6, 0.34, 0, M.wood); lb(0.12, 0.06, 0.66, -0.6, 0.34, 0, M.wood);
          if (p.paddle) lb(1.6, 0.05, 0.12, 0.2, 0.4, 0.3, M.wood, 0.3);
          break;
        }
        case 'weathervane': // bronze eagle on a rod
          lb(0.06, 1.6, 0.06, 0, 0.8, 0, M.bronze); lb(1.0, 0.04, 0.04, 0, 1.1, 0, M.bronze); lb(0.04, 0.04, 1.0, 0, 1.1, 0, M.bronze);
          lb(0.5, 0.18, 0.16, 0, 1.75, 0, M.bronze); lb(0.16, 0.16, 0.16, 0.3, 1.82, 0, M.bronze); lb(0.1, 0.06, 0.06, 0.43, 1.8, 0, M.gold);
          lb(0.2, 0.08, 0.7, -0.05, 1.92, 0.3, M.bronze, 0, -0.5); lb(0.2, 0.08, 0.7, -0.05, 1.92, -0.3, M.bronze, 0, 0.5); lb(0.24, 0.1, 0.24, -0.33, 1.74, 0, M.bronze);
          break;
        case 'fence': { // wooden rail fence of p.len along local x
          const L = p.len ?? 4, m = p.white ? M.white : M.wood;
          for (let i = 0; i <= L; i += 2) lb(0.14, 1.1, 0.14, i - L / 2, 0.55, 0, m);
          lb(L, 0.1, 0.06, 0, 0.85, 0, m); lb(L, 0.1, 0.06, 0, 0.45, 0, m);
          break;
        }
        case 'car_flipped': { // an overturned car, wheels up
          const cm = M.car(p.color ?? 0x2a4a7a);
          lb(3.8, 0.8, 1.8, 0, 0.75, 0, cm, 0, 0, 0.12); lb(2.2, 0.6, 1.6, -0.1, 0.25, 0, M.glass, 0, 0, 0.12);
          for (const [a, b] of [[-1.25, -0.8], [1.25, -0.8], [-1.25, 0.8], [1.25, 0.8]]) lb(0.6, 0.6, 0.24, a, 1.25 + a * 0.12, b, M.dark);
          lb(0.16, 0.2, 0.4, 1.92, 0.95, -0.55, M.lampGlow); lb(0.16, 0.2, 0.4, 1.92, 0.95, 0.55, M.lampGlow);
          break;
        }
        case 'anvil': lb(0.5, 0.4, 0.4, 0, 0.2, 0, M.metal); lb(0.3, 0.2, 0.25, 0, 0.5, 0, M.metal); lb(0.9, 0.22, 0.36, 0.1, 0.71, 0, M.metal); lb(0.25, 0.14, 0.2, 0.6, 0.74, 0, M.metal); break;
        case 'table': // long dining table with benches
          lb(p.len ?? 3, 0.12, 1.0, 0, 0.8, 0, M.wood); for (const a of [-1, 1]) { lb(0.12, 0.8, 0.8, a * ((p.len ?? 3) / 2 - 0.2), 0.4, 0, M.dark); lb(p.len ?? 3, 0.1, 0.36, 0, 0.45, a * 0.85, M.wood); }
          if (p.plates) for (let i = 0; i < (p.len ?? 3) - 1; i++) { lb(0.24, 0.03, 0.24, i - ((p.len ?? 3) - 2) / 2, 0.875, 0.25, M.white); lb(0.24, 0.03, 0.24, i - ((p.len ?? 3) - 2) / 2, 0.875, -0.25, M.white); }
          break;
        case 'flagpole': lb(0.1, p.h ?? 5, 0.1, 0, (p.h ?? 5) / 2, 0, M.metal); lb(1.3, 0.8, 0.04, 0.68, (p.h ?? 5) - 0.5, 0, M.car(p.color ?? 0xf28c28)); lb(0.16, 0.16, 0.16, 0, (p.h ?? 5) + 0.06, 0, M.gold); break;
        case 'signpost': lb(0.14, 1.6, 0.14, 0, 0.8, 0, M.wood); lb(1.2, 0.36, 0.08, 0.35, 1.35, 0, M.wood); lb(1.0, 0.3, 0.08, -0.3, 0.95, 0, M.wood, 0.3); break;
        case 'boulder': lb(1.1, 0.8, 0.9, 0, 0.4, 0, M.stone, 0.3); lb(0.7, 0.5, 0.6, 0.2, 0.9, 0.05, M.stone, 0.9); break;
        case 'lyre': lb(0.08, 0.6, 0.08, -0.18, 0.3, 0, M.gold, 0, 0, 0.2); lb(0.08, 0.6, 0.08, 0.18, 0.3, 0, M.gold, 0, 0, -0.2); lb(0.5, 0.06, 0.06, 0, 0.6, 0, M.gold); lb(0.3, 0.12, 0.12, 0, 0.04, 0, M.wood); break;
        case 'chandelier': lb(0.04, 1.2, 0.04, 0, -0.6, 0, M.bronze); lb(1.2, 0.08, 1.2, 0, -1.2, 0, M.bronze); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; lb(0.14, 0.14, 0.14, Math.cos(a) * 0.5, -1.08, Math.sin(a) * 0.5, M.lanternGlow); } break;

        // ------------------------------------------------ the road west (Book 1, chapters 4-12)
        case 'greyhound': { // a Greyhound bus along local x (10 long); p.burning adds flames, p.tilt rolls it
          const body = M.car(0xc8ccd2), stripe = M.car(0x2a5ab8), tz = p.tilt ?? 0;
          lb(10, 2.2, 2.6, 0, 1.55, 0, body, 0, 0, 0); lb(10.02, 0.4, 2.62, 0, 1.3, 0, stripe, 0, tz);
          lb(9.4, 0.75, 2.64, -0.2, 2.15, 0, M.glass, 0, tz); lb(0.12, 1.4, 2.4, 5.0, 1.9, 0, M.glass, 0, tz);
          lb(9.8, 0.3, 2.5, 0, 2.75, 0, body, 0, tz); lb(10.1, 0.25, 2.66, 0, 0.5, 0, M.dark, 0, tz);
          for (const [a, b] of [[-3.4, 1.2], [3.2, 1.2], [-3.4, -1.2], [3.2, -1.2], [-2.3, 1.2], [-2.3, -1.2]]) lb(1.0, 1.0, 0.36, a, 0.5, b, M.dark, 0, tz);
          lb(0.1, 0.25, 0.5, 5.02, 0.9, 0.8, M.lampGlow); lb(0.1, 0.25, 0.5, 5.02, 0.9, -0.8, M.lampGlow);
          lb(1.6, 0.3, 0.06, 1.0, 1.75, 1.32, M.car(0xd8322a)); // the running dog
          if (p.burning) for (let i = 0; i < 6; i++) { const fx = -3.5 + i * 1.3 + (i % 2) * 0.3; lb(0.7, 0.9 + (i % 3) * 0.4, 0.7, fx, 3.2 + (i % 3) * 0.2, (i % 2 - 0.5) * 0.9, M.flame, i); lb(0.4, 0.6, 0.4, fx + 0.2, 3.9 + (i % 2) * 0.3, 0, M.flame, i * 2); }
          if (p.burning) for (let i = 0; i < 4; i++) lb(1.2, 0.9, 1.2, -2.5 + i * 1.6, 4.6 + i * 0.5, (i % 2) * 0.4, M.smoke, i);
          break;
        }
        case 'van': { // Argus's white van: Delphi Strawberry Service
          const w = M.car(0xeeeeea);
          lb(4.2, 1.8, 2.0, 0, 1.2, 0, w); lb(1.2, 1.1, 1.96, 2.4, 0.85, 0, w); lb(0.08, 0.7, 1.7, 3.0, 1.35, 0, M.glass);
          lb(0.08, 0.6, 1.8, 2.42, 1.75, 0, M.glass);
          for (const [a, b] of [[-1.3, 0.95], [1.9, 0.95], [-1.3, -0.95], [1.9, -0.95]]) lb(0.7, 0.7, 0.3, a, 0.35, b, M.dark);
          lb(0.7, 0.7, 0.04, -0.4, 1.4, 1.02, M.car(0xd8322a)); lb(0.3, 0.2, 0.04, -0.4, 1.85, 1.02, M.car(0x3f8a34));
          lb(0.7, 0.7, 0.04, -0.4, 1.4, -1.02, M.car(0xd8322a)); lb(0.3, 0.2, 0.04, -0.4, 1.85, -1.02, M.car(0x3f8a34));
          break;
        }
        case 'gnome': { // a garden gnome; p.color hat
          const hat = M.car(p.color ?? 0xd8322a);
          lb(0.34, 0.3, 0.3, 0, 0.15, 0, M.car(0x2a6ad8)); lb(0.38, 0.32, 0.32, 0, 0.45, 0, M.car(0x3f8a34));
          lb(0.26, 0.24, 0.26, 0, 0.72, 0, M.skin); lb(0.24, 0.2, 0.08, 0, 0.66, 0.13, M.white);
          lb(0.28, 0.16, 0.28, 0, 0.9, 0, hat); lb(0.18, 0.16, 0.18, 0, 1.04, 0, hat); lb(0.08, 0.14, 0.08, 0, 1.16, 0, hat);
          break;
        }
        case 'stone_person': { // someone Medusa caught: grey stone, frozen mid-scream. p.pose 0-4 (4 = a satyr)
          const m = M.stoneFig, pose = p.pose ?? 0;
          lb(0.9, 0.18, 0.7, 0, 0.09, 0, M.stone);
          const kneel = pose === 3, by = kneel ? 0.18 : 0.18;
          if (pose === 4) { lb(0.24, 0.5, 0.26, -0.15, by + 0.25, -0.05, M.stoneFig, 0, 0.3); lb(0.24, 0.5, 0.26, 0.15, by + 0.25, -0.05, M.stoneFig, 0, 0.3); lb(0.2, 0.4, 0.22, -0.15, by + 0.62, 0.05, m, 0, -0.4); lb(0.2, 0.4, 0.22, 0.15, by + 0.62, 0.05, m, 0, -0.4); }
          else if (kneel) { lb(0.22, 0.3, 0.7, -0.15, by + 0.15, 0.1, m); lb(0.22, 0.3, 0.7, 0.15, by + 0.15, 0.1, m); }
          else if (pose === 1) { lb(0.22, 0.8, 0.24, -0.15, by + 0.4, 0.15, m, 0, 0.45); lb(0.22, 0.8, 0.24, 0.15, by + 0.4, -0.15, m, 0, -0.45); }
          else { lb(0.22, 0.8, 0.24, -0.14, by + 0.4, 0, m); lb(0.22, 0.8, 0.24, 0.14, by + 0.4, 0, m); }
          const ty = kneel ? by + 0.3 : by + 0.8;
          const lean = pose === 0 ? 0.35 : pose === 1 ? -0.25 : pose === 3 ? 0.2 : 0;
          lb(0.56, 0.72, 0.32, 0, ty + 0.36, 0, m, 0, lean); lb(0.34, 0.34, 0.34, 0, ty + 0.9, lean * 0.6, m, 0, lean);
          if (pose === 4) { lb(0.08, 0.2, 0.08, -0.1, ty + 1.12, lean * 0.6, m, 0, 0, 0.4); lb(0.08, 0.2, 0.08, 0.1, ty + 1.12, lean * 0.6, m, 0, 0, -0.4); }
          if (pose === 0 || pose === 3) { lb(0.16, 0.6, 0.16, -0.3, ty + 0.95, 0.15, m, 0, -0.9, 0.5); lb(0.16, 0.6, 0.16, 0.3, ty + 0.95, 0.15, m, 0, -0.9, -0.5); }
          else if (pose === 2) { lb(0.16, 0.65, 0.16, -0.32, ty + 1.0, 0.2, m, 0, -1.3, 0.2); lb(0.16, 0.65, 0.16, 0.32, ty + 1.0, 0.2, m, 0, -1.3, -0.2); }
          else { lb(0.16, 0.6, 0.16, -0.36, ty + 0.55, 0.1, m, 0, 0.8); lb(0.16, 0.6, 0.16, 0.36, ty + 0.55, -0.1, m, 0, -0.8); }
          break;
        }
        case 'gazing_ball': lb(0.3, 0.8, 0.3, 0, 0.4, 0, M.stone); lb(0.5, 0.12, 0.5, 0, 0.86, 0, M.stone); put(new THREE.SphereGeometry(0.34 * sc, 14, 10), M.chrome, x, y + 1.2 * sc, z, 0, 0, 0); break;
        case 'birdbath': lb(0.26, 0.9, 0.26, 0, 0.45, 0, M.stone); lb(0.9, 0.14, 0.9, 0, 0.95, 0, M.stone); lb(0.7, 0.04, 0.7, 0, 1.03, 0, M.water); break;
        case 'arch_model': { // the Gateway Arch: a weighted catenary of steel boxes; p.span, p.h
          const span = p.span ?? 8, hh = p.h ?? 9, n = 28, A = 1.9;
          const pt = (i) => { const t = i / n * 2 - 1; return [t * span / 2, hh * (1 - (Math.cosh(t * A) - 1) / (Math.cosh(A) - 1))]; };
          for (let i = 0; i < n; i++) {
            const [ax, ay] = pt(i), [bx, by] = pt(i + 1);
            const L = Math.hypot(bx - ax, by - ay) + 0.12, ang = Math.atan2(by - ay, bx - ax);
            const th = (0.62 - ((ay + by) / 2 / hh) * 0.3) * Math.max(1, span / 10);
            lb(L, th, th, (ax + bx) / 2, (ay + by) / 2, 0, M.chrome, 0, 0, ang);
          }
          break;
        }
        case 'pole': lb(0.16, 6, 0.16, 0, 3, 0, M.wood); lb(1.4, 0.12, 0.12, 0, 5.6, 0, M.wood); for (const a of [-0.55, 0.55]) lb(0.08, 0.16, 0.08, a, 5.74, 0, M.white); break;
        case 'tram_pod': { // one of the Arch's egg-shaped tram cars
          lb(1.3, 1.6, 1.3, 0, 0.9, 0, M.white); lb(1.1, 0.25, 1.1, 0, 1.8, 0, M.white); lb(1.1, 0.25, 1.1, 0, 0.0 + 0.12, 0, M.white);
          lb(0.7, 1.0, 0.06, 0, 0.95, 0.66, M.glass); lb(0.12, 1.9, 0.12, -0.7, 0.95, 0, M.chrome); lb(0.12, 1.9, 0.12, 0.7, 0.95, 0, M.chrome);
          break;
        }
        case 'water_tower': for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lb(0.16, 5, 0.16, a * 0.9, 2.5, b * 0.9, M.metal);
          lb(2.6, 2.0, 2.6, 0, 6, 0, M.car(p.color ?? 0x6ac0e0)); lb(2.0, 0.6, 2.0, 0, 7.3, 0, M.car(p.color ?? 0x6ac0e0)); lb(0.8, 0.4, 0.8, 0, 7.8, 0, M.metal);
          lb(2.62, 0.3, 2.62, 0, 6.2, 0, M.white);
          break;
        case 'swan_boat': { // Tunnel of Love swan boat (along local x)
          const wht = M.white;
          lb(2.4, 0.6, 1.3, 0, 0.3, 0, wht); lb(1.8, 0.2, 1.0, -0.2, 0.62, 0, M.car(0xb02a3a));
          lb(0.4, 0.5, 1.2, -1.1, 0.75, 0, wht); lb(0.3, 1.1, 0.3, 1.2, 0.95, 0, wht, 0, 0, -0.2); lb(0.5, 0.25, 0.28, 1.35, 1.5, 0, wht); lb(0.25, 0.1, 0.12, 1.65, 1.45, 0, M.car(0xf28c28));
          lb(1.0, 0.5, 0.1, -0.2, 0.75, 0.66, wht, 0, 0, 0.1); lb(1.0, 0.5, 0.1, -0.2, 0.75, -0.66, wht, 0, 0, 0.1);
          if (p.rust) { lb(0.5, 0.2, 0.04, 0.3, 0.3, 0.66, M.rust); lb(0.4, 0.3, 0.04, -0.6, 0.35, -0.66, M.rust); }
          break;
        }
        case 'palm': { // a palm tree; p.h
          const hh = p.h ?? 5;
          for (let i = 0; i < hh; i++) lb(0.36 - i * 0.02, 1.02, 0.36 - i * 0.02, Math.sin(i * 0.4) * 0.25, i + 0.5, 0, M.palmTrunk);
          const tx = Math.sin(hh * 0.4) * 0.25;
          for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; lb(2.0, 0.08, 0.5, tx + Math.cos(a) * 0.9, hh + 0.1, Math.sin(a) * 0.9, M.palmLeaf, -a, 0, -0.35); }
          lb(0.5, 0.4, 0.5, tx, hh, 0, M.palmTrunk);
          break;
        }
        case 'slot': // a slot machine with its stool; faces +z
          lb(0.9, 1.5, 0.7, 0, 0.75, 0, M.car(0xb8862a)); lb(0.7, 0.5, 0.06, 0, 1.15, 0.36, M.neon(p.color ?? 0xff4a8a)); lb(0.8, 0.25, 0.06, 0, 1.6, 0.3, M.neon(0xffd84a));
          lb(0.06, 0.5, 0.06, 0.5, 1.2, 0.1, M.chrome); lb(0.12, 0.12, 0.12, 0.5, 1.5, 0.1, M.car(0xd8322a));
          lb(0.5, 0.08, 0.5, 0, 0.6, 0.9, M.car(0x5a1a3a)); lb(0.08, 0.6, 0.08, 0, 0.3, 0.9, M.chrome);
          break;
        case 'arcade': // an arcade cabinet; faces +z
          lb(0.9, 1.8, 0.8, 0, 0.9, 0, M.car(p.color ?? 0x2a2a6a)); lb(0.7, 0.55, 0.06, 0, 1.35, 0.38, M.neon(p.screen ?? 0x4ad8ff)); lb(0.9, 0.12, 0.45, 0, 0.95, 0.5, M.dark);
          lb(0.9, 0.25, 0.06, 0, 1.78, 0.38, M.neon(0xff5fb0));
          break;
        case 'card_table': // green felt card table with chips
          lb(1.8, 0.14, 1.1, 0, 0.8, 0, M.felt); lb(1.9, 0.06, 1.2, 0, 0.72, 0, M.car(0x5a2a1a)); lb(0.3, 0.72, 0.3, 0, 0.36, 0, M.dark);
          for (let i = 0; i < 4; i++) lb(0.12, 0.08 + i * 0.03, 0.12, -0.6 + i * 0.4, 0.92, 0.2 - (i % 2) * 0.3, M.car([0xd8322a, 0x2a6ad8, 0x17130f, 0x2aa85a][i]));
          break;
        case 'waterbed': { // a water bed, 2 wide x 3 long along local z; p.color, p.swan headboard, p.straps
          const sat = p.blue ? M.satinBlue : M.satinPink;
          lb(2.1, 0.45, 3.1, 0, 0.22, 0, M.car(0x5a2a1a)); lb(2.15, 0.08, 3.15, 0, 0.47, 0, M.gold);
          lb(1.9, 0.38, 2.9, 0, 0.66, 0, sat); lb(1.6, 0.14, 2.5, 0, 0.88, 0, sat);
          if (p.swan) { lb(2.1, 1.5, 0.3, 0, 1.0, -1.5, M.white); lb(0.4, 1.8, 0.4, 0.7, 1.8, -1.4, M.white, 0, 0.3); lb(0.7, 0.35, 0.4, 0.95, 2.6, -1.2, M.white); lb(0.3, 0.12, 0.2, 1.3, 2.55, -1.05, M.car(0xf28c28)); }
          else { lb(2.1, 1.1, 0.25, 0, 0.8, -1.5, M.car(0x5a2a1a)); lb(1.7, 0.7, 0.08, 0, 0.95, -1.36, sat); lb(2.2, 0.1, 0.3, 0, 1.38, -1.5, M.gold); }
          if (p.straps) for (const t of [-0.8, 0.6]) lb(2.16, 0.1, 0.18, 0, 0.85, t, M.dark);
          break;
        }
        case 'cactus': { const hh = p.h ?? 2.2; lb(0.36, hh, 0.36, 0, hh / 2, 0, M.cactus); lb(0.5, 0.26, 0.26, 0.3, hh * 0.5, 0, M.cactus); lb(0.26, 0.7, 0.26, 0.5, hh * 0.5 + 0.35, 0, M.cactus); lb(0.4, 0.22, 0.22, -0.26, hh * 0.65, 0, M.cactus); lb(0.22, 0.5, 0.22, -0.42, hh * 0.65 + 0.25, 0, M.cactus); break; }
        case 'ferry': { // Charon's ferry along local x, with a green lantern on the stern
          const hull = M.car(0x2a2420);
          lb(5, 0.5, 1.6, 0, 0.25, 0, hull); lb(5, 0.5, 0.15, 0, 0.75, 0.75, hull); lb(5, 0.5, 0.15, 0, 0.75, -0.75, hull);
          lb(0.9, 0.9, 0.5, 2.8, 0.9, 0, hull, 0, 0, 0.5); lb(0.12, 0.12, 0.12, 3.2, 1.45, 0, M.gold);
          lb(0.08, 2.4, 0.08, -2.2, 1.7, 0.5, M.wood); lb(0.3, 0.3, 0.3, -2.2, 2.9, 0.5, M.greenFlame);
          for (let i = 0; i < 3; i++) lb(0.12, 0.08, 1.4, -1 + i * 1.2, 0.55, 0, M.wood);
          break;
        }
        case 'iron_gate': { // tall black bars with gold spear tips; p.w along local x, p.h
          const w = p.w ?? 6, hh = p.h ?? 6;
          for (let i = 0; i <= w * 2; i++) { lb(0.1, hh, 0.1, -w / 2 + i / 2, hh / 2, 0, M.dark); lb(0.14, 0.3, 0.14, -w / 2 + i / 2, hh + 0.15, 0, M.gold); }
          for (const yy of [0.6, hh * 0.55, hh - 0.4]) lb(w + 0.2, 0.14, 0.16, 0, yy, 0, M.dark);
          lb(0.5, hh + 1.2, 0.5, -w / 2 - 0.3, (hh + 1.2) / 2, 0, M.dark); lb(0.5, hh + 1.2, 0.5, w / 2 + 0.3, (hh + 1.2) / 2, 0, M.dark);
          if (p.skulls) for (const sx of [-w / 2 - 0.3, w / 2 + 0.3]) lb(0.4, 0.36, 0.4, sx, hh + 1.4, 0, M.white);
          break;
        }
        case 'lifeguard_tower': {
          for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) lb(0.14, 2.2, 0.14, a, 1.1, b, M.white);
          lb(2.0, 0.14, 2.0, 0, 2.25, 0, M.wood); lb(1.8, 1.3, 1.6, 0, 2.95, -0.1, M.car(0x2aa8a0)); lb(1.2, 0.6, 0.06, 0, 3.05, 0.71, M.glass);
          lb(2.2, 0.14, 2.0, 0, 3.66, -0.1, M.white); lb(0.5, 0.1, 2.6, 0, 1.1, 1.9, M.wood, 0, 0.75);
          lb(0.06, 1.0, 0.06, 0.9, 4.2, 0.6, M.wood); lb(0.5, 0.3, 0.02, 1.15, 4.55, 0.6, M.car(0xd8322a));
          break;
        }
        case 'ferris_wheel': { // the Santa Monica pier wheel; p.r
          const R = p.r ?? 5;
          lb(0.25, R + 0.5, 0.25, -0.6 * R / 5 * 0, (R + 0.5) / 2, 0.5, M.white, 0, 0, 0.18); lb(0.25, R + 0.5, 0.25, 0, (R + 0.5) / 2, -0.5, M.white, 0, 0, -0.18);
          for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; lb(0.16, R * Math.PI * 2 / 24 + 0.05, 0.16, Math.cos(a) * R, R + 0.6 + Math.sin(a) * R, 0, M.neon(i % 2 ? 0xffd84a : 0xff5fb0), 0, 0, a); }
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; lb(0.08, R, 0.08, Math.cos(a) * R / 2, R + 0.6 + Math.sin(a) * R / 2, 0, M.white, 0, 0, a + Math.PI / 2); lb(0.6, 0.5, 0.6, Math.cos(a) * R, R + 0.1 + Math.sin(a) * R, 0, M.car([0xd8322a, 0x2a6ad8, 0xffd84a, 0x2aa85a][i % 4])); }
          break;
        }
        case 'umbrella': lb(0.06, 2.2, 0.06, 0, 1.1, 0, M.white); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; lb(1.0, 0.06, 0.5, Math.cos(a) * 0.5, 2.1, Math.sin(a) * 0.5, M.car(i % 2 ? 0xffffff : (p.color ?? 0xd8322a)), -a, 0, -0.25); } break;
        case 'deck_chair': lb(0.6, 0.1, 1.6, 0, 0.35, 0, M.car(p.color ?? 0x2aa8a0)); lb(0.6, 0.1, 0.7, 0, 0.6, -0.8, M.car(p.color ?? 0x2aa8a0), 0, 0.6); for (const a of [-0.25, 0.25]) for (const b of [-0.6, 0.6]) lb(0.06, 0.35, 0.06, a, 0.17, b, M.chrome); break;
        case 'throne': { // an Olympian throne; p.color trims it
          const m = p.bronze ? M.bronze : M.marble, t = M.car(p.color ?? 0xffd84a);
          lb(2.2, 0.6, 2.0, 0, 0.3, 0, M.marble); lb(1.6, 0.4, 1.4, 0, 0.8, 0.1, m); lb(1.6, 3.4, 0.4, 0, 2.3, -0.6, m); lb(1.2, 2.6, 0.1, 0, 2.3, -0.38, t); lb(1.3, 0.12, 1.2, 0, 1.05, 0.12, t);
          lb(0.3, 0.8, 1.2, -0.75, 1.3, 0.1, m); lb(0.3, 0.8, 1.2, 0.75, 1.3, 0.1, m); lb(1.8, 0.3, 0.5, 0, 4.1, -0.6, t); lb(0.6, 0.6, 0.1, 0, 3.4, -0.38, t);
          break;
        }
        case 'empire_state': { // a model of the Empire State Building; p.h
          const hh = p.h ?? 12, m = M.car(0x9aa0a8), wnd = M.lampGlow;
          lb(3.2, hh * 0.35, 2.6, 0, hh * 0.175, 0, m); lb(2.4, hh * 0.35, 2.0, 0, hh * 0.525, 0, m); lb(1.6, hh * 0.18, 1.3, 0, hh * 0.79, 0, m);
          lb(0.9, hh * 0.1, 0.8, 0, hh * 0.93, 0, m); lb(0.2, hh * 0.25, 0.2, 0, hh * 1.1, 0, M.chrome);
          for (let i = 1; i < 8; i++) lb(2.42, 0.08, 2.02, 0, hh * 0.35 + i * hh * 0.045, 0, wnd);
          for (let i = 1; i < 6; i++) lb(3.22, 0.08, 2.62, 0, i * hh * 0.06, 0, wnd);
          if (p.glow) lb(0.5, 0.5, 0.5, 0, hh * 1.25, 0, M.lampGlow);
          break;
        }
        case 'couch': lb(2.2, 0.45, 0.9, 0, 0.22, 0, M.car(p.color ?? 0x2a2a2e)); lb(2.2, 0.7, 0.25, 0, 0.6, -0.36, M.car(p.color ?? 0x2a2a2e)); lb(0.25, 0.6, 0.9, -1.0, 0.45, 0, M.car(p.color ?? 0x2a2a2e)); lb(0.25, 0.6, 0.9, 1.0, 0.45, 0, M.car(p.color ?? 0x2a2a2e)); break;
        case 'ghost': // a waiting spirit: pale, see-through, slightly bowed
          lb(0.5, 1.1, 0.34, 0, 0.75, 0, M.ghost, 0, 0.1); lb(0.32, 0.32, 0.32, 0, 1.5, 0.05, M.ghost); lb(0.6, 0.4, 0.4, 0, 0.2, 0, M.ghost);
          break;
        case 'round_shield': lb(1.2, 1.2, 0.12, 0, 0, 0, M.bronze, 0, 0, 0.785); lb(0.85, 0.85, 0.14, 0, 0, 0, M.gold, 0, 0, 0.785); lb(0.3, 0.3, 0.16, 0, 0, 0, M.bronze); break;
        case 'cone': lb(0.5, 0.06, 0.5, 0, 0.03, 0, M.car(0xf28c28)); lb(0.3, 0.6, 0.3, 0, 0.35, 0, M.car(0xf28c28)); lb(0.32, 0.1, 0.32, 0, 0.4, 0, M.white); break;
        case 'clock': { // the Lotus's giant clock (faces +z), hands spinning too fast
          lb(3.2, 3.2, 0.2, 0, 0, 0, M.gold, 0, 0, 0.785 / 2); lb(2.6, 2.6, 0.24, 0, 0, 0, M.white, 0, 0, 0.785 / 2);
          for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; lb(0.12, 0.3, 0.26, Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0, M.dark, 0, 0, a + Math.PI / 2); }
          lb(0.1, 1.0, 0.3, 0.2, 0.35, 0.05, M.dark, 0, 0, -0.6); lb(0.1, 0.7, 0.3, -0.25, 0.1, 0.05, M.dark, 0, 0, 2.2);
          break;
        }
        case 'gas_pump': lb(0.6, 1.5, 0.4, 0, 0.75, 0, M.car(0xd8322a)); lb(0.4, 0.3, 0.06, 0, 1.15, 0.22, M.lampGlow); lb(0.1, 0.5, 0.1, 0.35, 0.8, 0.1, M.dark); break;
        case 'fire': // a blaze (on a wreck, a barrel); p.smoke adds a dark plume
          lb(0.8, 0.9, 0.8, 0, 0.45, 0, M.flame, 0.3); lb(0.5, 0.8, 0.5, 0.15, 1.1, 0.05, M.flame, 1.0); lb(0.3, 0.6, 0.3, -0.1, 1.6, 0, M.flame, 0.5);
          if (p.smoke) for (let i = 0; i < 3; i++) lb(1.0 + i * 0.3, 0.8, 1.0 + i * 0.3, i * 0.3, 2.4 + i * 0.9, i * 0.15, M.smoke, i);
          break;
        // ------------------------------------------------ Manhattan (the prologue)
        case 'hotdog_cart': { // a steel cart with a striped umbrella; faces +z
          lb(1.8, 0.9, 0.9, 0, 0.75, 0, M.chrome); lb(1.84, 0.1, 0.94, 0, 1.22, 0, M.metal);
          lb(1.7, 0.3, 0.06, 0, 0.75, 0.46, M.car(0xd8322a)); lb(0.5, 0.2, 0.3, -0.4, 1.35, 0, M.car(0xc88a3a));
          for (const [a, b] of [[-0.7, 0.35], [0.7, 0.35], [-0.7, -0.35], [0.7, -0.35]]) lb(0.08, 0.6, 0.08, a, 0.3, b, M.dark);
          lb(0.08, 1.4, 0.08, 0.6, 1.9, 0, M.white);
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; lb(0.9, 0.06, 0.45, 0.6 + Math.cos(a) * 0.45, 2.6, Math.sin(a) * 0.45, M.car(i % 2 ? 0xffffff : 0x2a6ad8), -a, 0, -0.25); }
          break;
        }
        case 'dumpster': { // a green steel dumpster, 2 long (local x) x 1.4 x 1.4 high; lid propped open a little
          const G = M.car(0x2e5a3a);
          lb(2.0, 1.25, 1.35, 0, 0.7, 0, G); lb(2.06, 0.1, 1.4, 0, 1.33, 0, M.dark);
          lb(2.0, 0.08, 0.8, 0, 1.52, -0.28, M.car(0x24442c), 0, 0.35); lb(2.0, 0.08, 0.7, 0, 1.4, 0.36, M.car(0x24442c));
          for (const a of [-0.8, 0.8]) for (const b of [-0.55, 0.55]) lb(0.14, 0.14, 0.14, a, 0.07, b, M.dark);
          lb(0.1, 0.5, 0.5, 1.02, 0.85, 0, M.metal); lb(1.6, 0.2, 0.06, 0, 0.95, 0.69, M.white);
          lb(0.5, 0.25, 0.4, 0.4, 1.52, 0.15, M.car(0x2a2a30)); lb(0.36, 0.2, 0.3, -0.5, 1.5, 0.1, M.car(0x3a3a42));   // bags poking out
          break;
        }
        case 'trash_bags': { // a heap of black bin bags on the curb (p.n bags)
          const n = p.n ?? 5;
          for (let i = 0; i < n; i++) { const a = i * 2.39996, r = i ? 0.25 + (i % 3) * 0.18 : 0; const s = 0.45 + ((i * 37) % 10) / 40; lb(s, s * 0.85, s * 0.9, Math.cos(a) * r, s * 0.42 + (i > 4 ? 0.35 : 0), Math.sin(a) * r, M.car(i % 4 === 3 ? 0x3a3a46 : 0x1e1e24), a); lb(0.12, 0.14, 0.1, Math.cos(a) * r, s * 0.85 + (i > 4 ? 0.35 : 0), Math.sin(a) * r, M.car(0x2a2a30)); }
          break;
        }
        case 'chain_fence': { // a construction fence of p.len along local x: posts, a top rail, see-through mesh panels, green screen at the bottom
          const L = p.len ?? 4, h = p.h ?? 2;
          for (let i = 0; i <= L; i += 2) lb(0.08, h, 0.08, i - L / 2, h / 2, 0, M.chrome);
          lb(L, 0.06, 0.06, 0, h - 0.03, 0, M.chrome); lb(L, 0.04, 0.04, 0, 0.1, 0, M.chrome);
          for (let i = 0; i < L * 4; i++) lb(0.02, h - 0.2, 0.02, -L / 2 + (i + 0.5) / 4, h / 2, 0, M.chrome, 0, 0, 0.45);
          if (p.screen !== false) lb(L, 0.5, 0.03, 0, 0.35, 0.03, M.car(0x2e6a3a));
          break;
        }
        case 'sawhorse': // an orange-and-white striped barrier on legs (along local x)
          for (const a of [-0.7, 0.7]) { lb(0.08, 0.9, 0.08, a, 0.45, 0.18, M.dark, 0, 0.25); lb(0.08, 0.9, 0.08, a, 0.45, -0.18, M.dark, 0, -0.25); }
          for (let i = 0; i < 6; i++) lb(0.3, 0.22, 0.05, -0.75 + i * 0.3, 0.78, 0, i % 2 ? M.white : M.car(0xf28c28));
          break;
        case 'scaffold_post': lb(0.16, p.h ?? 2.2, 0.16, 0, (p.h ?? 2.2) / 2, 0, M.car(0x2a4a6a)); break;
        case 'hydrant': lb(0.4, 0.6, 0.4, 0, 0.3, 0, M.car(0xd8322a)); lb(0.3, 0.2, 0.3, 0, 0.7, 0, M.car(0xd8322a)); lb(0.6, 0.12, 0.14, 0, 0.42, 0, M.car(0xb8221a)); break;
        case 'trash_can': lb(0.6, 0.9, 0.6, 0, 0.45, 0, M.car(0x3a5a3a)); lb(0.66, 0.08, 0.66, 0, 0.92, 0, M.metal); break;
        case 'mailbox': lb(0.6, 0.9, 0.5, 0, 0.75, 0, M.car(0x2a4a9a)); lb(0.6, 0.2, 0.5, 0, 1.25, 0, M.car(0x2a4a9a)); for (const a of [-0.22, 0.22]) lb(0.08, 0.3, 0.08, a, 0.15, 0, M.dark); break;
        case 'subway_globe': // the green lamp posts at a subway entrance
          lb(0.12, 2.6, 0.12, 0, 1.3, 0, M.car(0x2e5a3a)); lb(0.4, 0.4, 0.4, 0, 2.8, 0, M.neon(0x6aff8a)); lb(0.3, 0.1, 0.3, 0, 3.05, 0, M.car(0x2e5a3a)); break;
        case 'traffic_light': // a pole with a three-lamp head over the street (arm along local x)
          lb(0.16, 4.2, 0.16, 0, 2.1, 0, M.dark); lb(2.6, 0.12, 0.12, 1.3, 4.1, 0, M.dark);
          lb(0.4, 1.1, 0.36, 2.4, 3.6, 0, M.car(0x2a2a1e));
          lb(0.26, 0.26, 0.06, 2.4, 3.95, 0.2, M.neon(0xff3a2a)); lb(0.26, 0.26, 0.06, 2.4, 3.62, 0.2, M.car(0x5a4a1a)); lb(0.26, 0.26, 0.06, 2.4, 3.29, 0.2, M.car(0x1a4a2a));
          break;
        case 'newsstand': lb(2.2, 2.2, 1.4, 0, 1.1, 0, M.car(0x2e5a3a)); lb(2.4, 0.14, 1.7, 0, 2.27, 0.1, M.dark); lb(1.8, 0.9, 0.06, 0, 1.3, 0.72, M.lampGlow);
          for (let i = 0; i < 6; i++) lb(0.26, 0.34, 0.04, -0.7 + i * 0.28, 1.25, 0.76, M.car([0xd8322a, 0xffd84a, 0x2a6ad8, 0xf2efe6][i % 4]));
          break;
        case 'planter': lb(1, 0.5, 1, 0, 0.25, 0, M.stone); lb(0.8, 0.3, 0.8, 0, 0.6, 0, M.car(0x3a7a2a)); break;
        case 'stoop_rail': lb(0.08, 0.9, p.len ?? 2, 0, 0.45, 0, M.dark); lb(0.1, 0.06, (p.len ?? 2) + 0.1, 0, 0.92, 0, M.dark); break;
        case 'bike_rack': for (let i = 0; i < 3; i++) lb(0.06, 0.7, 0.6, -0.5 + i * 0.5, 0.35, 0, M.chrome); break;
        case 'text_sign': { // a board with words on it: p.text, p.w, p.h, p.bg, p.fg, p.post (signpost height), p.glow
          const w = p.w ?? 2.4, hh = p.h ?? 0.7, ph = p.post ?? 0;
          if (ph > 0) { lb(0.14, ph, 0.14, -w / 2 + 0.2, ph / 2, -0.02, M.wood); lb(0.14, ph, 0.14, w / 2 - 0.2, ph / 2, -0.02, M.wood); }
          const cy = ph > 0 ? ph + hh / 2 - 0.15 : hh / 2;
          lb(w + 0.12, hh + 0.12, 0.08, 0, cy, -0.05, p.glow ? M.dark : M.wood);
          // p.greek: the words are Greek letters until a hero has a good look (world/liveSign.js)
          const mat = p.greek ? liveSignMaterial(this, p.text ?? '', { bg: p.bg, fg: p.fg, glow: p.glow, border: p.border, aspect: w / hh, pos: new THREE.Vector3(x, y + cy * sc, z), near: p.near, look: p.look })
            : signMaterial(p.text ?? '', { bg: p.bg, fg: p.fg, glow: p.glow, border: p.border, aspect: w / hh });
          for (const side of p.oneSided ? [1] : [1, -1]) {
            const pl = new THREE.Mesh(new THREE.PlaneGeometry(w * sc, hh * sc), mat);
            const lz = side * 0.0 + (side > 0 ? 0.0 : -0.1);
            pl.position.set(x + (0 * cr + lz * sr) * sc, y + cy * sc, z + (-0 * sr + lz * cr) * sc);
            pl.rotation.y = rot + (side > 0 ? 0 : Math.PI);
            pl.castShadow = false; pl.receiveShadow = true;
            group.add(pl);
          }
          break;
        }
      }
    }
    for (const { mat, geos } of batches.values()) {
      const g = mergeGeometries(geos, false); for (const x of geos) x.dispose();
      if (!g) continue;
      const m = new THREE.Mesh(g, mat); m.castShadow = !mat.transparent; m.receiveShadow = true; group.add(m);
    }
    this.propMesh = group; world.group.add(group);
  }
}

// Painted words for signs (place names on the road west, shop signs, neon).
const signCache = new Map();
const signSize = (aspect) => { const H = 128; return { H, W: Math.min(1024, Math.round(H * aspect / 4) * 4) }; };
// a sign whose words settle from Greek letters into English (kept in deco.liveSigns for game.signs)
function liveSignMaterial(deco, text, { bg = '#6a4a2a', fg = '#f6e7c0', glow = false, border = '#c9963a', aspect = 3, pos, near = 11, look = 1.4 } = {}) {
  const { W, H } = signSize(aspect);
  const s = new LiveSign(text, { w: W, h: H, paint: boardPainter({ bg, fg, glow, border }), pos, near, look });
  deco.liveSigns.push(s);
  return new THREE.MeshStandardNodeMaterial({ map: s.texture, roughness: 0.8, emissive: 0xffffff, emissiveMap: s.texture, emissiveIntensity: glow ? 1.8 : 0.22 });
}
function signMaterial(text, { bg = '#6a4a2a', fg = '#f6e7c0', glow = false, border = '#c9963a', aspect = 3 } = {}) {
  const key = [text, bg, fg, glow, border, aspect.toFixed(2)].join('|');
  if (signCache.has(key)) return signCache.get(key);
  const { W, H } = signSize(aspect);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(6, 6, W - 12, H - 12); }
  const lines = String(text).split('\n');
  let size = Math.floor((H - 28) / lines.length);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const font = (sz) => `bold ${sz}px Georgia, 'Times New Roman', serif`;
  g.font = font(size);
  while (size > 12 && Math.max(...lines.map((l) => g.measureText(l).width)) > W - 28) { size -= 2; g.font = font(size); }
  if (glow) { g.shadowColor = fg; g.shadowBlur = 14; }
  g.fillStyle = fg;
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.MeshStandardNodeMaterial({ map: tex, roughness: 0.8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow ? 1.8 : 0.22 });
  signCache.set(key, m);
  return m;
}

export function makePropMaterials() {
  const S = (c, o = {}) => { const m = new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.8, ...o }); m.maskNode = ditherMask(occlusionAmount()); return m; };
  return {
    stone: S(0x8a8a88), dark: S(0x1c1814), wood: S(0x6a4a2a), red: S(0xb5281f, { roughness: 0.4 }), metal: S(0x4a4e55, { metalness: 0.8, roughness: 0.35 }),
    wax: S(0xefe6cc), glass: S(0x223344, { roughness: 0.05, metalness: 0.6 }),
    flame: S(0xffb040, { emissive: 0xff9020, emissiveIntensity: 4 }),
    lanternGlow: S(0xffe0a0, { emissive: 0xffb050, emissiveIntensity: 2.5 }),
    redLantern: S(0xd02a1a, { emissive: 0xff3a1a, emissiveIntensity: 1.6 }),
    lampGlow: S(0xfff0d0, { emissive: 0xffe0b0, emissiveIntensity: 3 }),
    marble: S(0xece8de, { roughness: 0.3 }), plinth: S(0x2a3433, { roughness: 0.25 }), bronze: S(0xc9963a, { metalness: 0.85, roughness: 0.32 }),
    gold: S(0xffd84a, { metalness: 0.9, roughness: 0.25 }), terracotta: S(0xd9813a, { roughness: 0.55 }), vaseBlack: S(0x17130f, { roughness: 0.35 }),
    greenFlame: S(0x8affa0, { emissive: 0x3aff7a, emissiveIntensity: 4 }),
    white: S(0xf2efe6), hay: S(0xd8b85a), targetBlue: S(0x2a6ad8), targetRed: S(0xd8322a),
    glassClear: (() => { const m = new THREE.MeshStandardNodeMaterial({ color: 0xcfe8f2, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false }); return m; })(),
    car: (() => { const cache = new Map(); return (c) => { if (!cache.has(c)) cache.set(c, S(c, { roughness: 0.25, metalness: 0.5 })); return cache.get(c); }; })(),
    neon: (() => { const cache = new Map(); return (c) => { if (!cache.has(c)) cache.set(c, S(c, { emissive: c, emissiveIntensity: 2.6, roughness: 0.4 })); return cache.get(c); }; })(),
    stoneFig: S(0x9c9a92, { roughness: 0.95 }), skin: S(0xf0c8a0), chrome: S(0xd8dee6, { metalness: 0.95, roughness: 0.12 }),
    smoke: (() => { const m = new THREE.MeshStandardNodeMaterial({ color: 0x2a2624, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }); return m; })(),
    ghost: (() => { const m = new THREE.MeshStandardNodeMaterial({ color: 0xc8d8e8, emissive: 0x8aa8c8, emissiveIntensity: 0.6, roughness: 0.8, transparent: true, opacity: 0.35, depthWrite: false }); return m; })(),
    water: S(0x3a7aa8, { roughness: 0.05, metalness: 0.3 }), felt: S(0x1e6a3a, { roughness: 0.95 }), rust: S(0x7a4a2a),
    satinPink: S(0xe0506a, { roughness: 0.25, metalness: 0.15 }), satinBlue: S(0x2ab0c8, { roughness: 0.25, metalness: 0.15 }),
    palmTrunk: S(0x8a6a3a), palmLeaf: S(0x3a8a3a), cactus: S(0x4a8a3a),
  };
}

// Small decoration details: grass tufts, flowers, cobwebs, chains, paper
// talismans, bones, candles, banners and hanging lanterns. All sprite quads
// are merged into one mesh (wind sway via a vertex attribute); a few 3D
// props (shrine lanterns, stone lanterns) are merged into a second mesh.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { spriteUV, SPRITE_INDEX as SI } from '../gfx/textures.js';
import { ditherMask, occlusionAmount } from '../gfx/materials.js';

export class Decorations {
  constructor() { this.items = []; this.props = []; this.mesh = null; this.propMesh = null; }
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
    for (const it of this.items) {
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
    if (this.mesh) { world.group.remove(this.mesh); this.mesh.geometry.dispose(); }
    if (n) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
      g.setAttribute('emit', new THREE.Float32BufferAttribute(emit, 1));
      g.setIndex(idx);
      this.mesh = new THREE.Mesh(g, materials.deco);
      this.mesh.receiveShadow = true; this.mesh.castShadow = false;
      world.group.add(this.mesh);
    }
    this.buildProps(world, materials);
  }
  buildProps(world, materials) {
    if (this.propMesh) { world.group.remove(this.propMesh); this.propMesh.traverse((o) => o.geometry?.dispose()); }
    const group = new THREE.Group();
    const M = materials.props;
    // Boxes are collected per material and merged into one mesh each (few draw calls).
    const batches = new Map();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
    const put = (geo, mat, x, y, z, rx, ry, rz) => {
      _e.set(rx, ry, rz); _q.setFromEuler(_e); _m.compose(_v.set(x, y, z), _q, _s); geo.applyMatrix4(_m);
      if (!batches.has(mat)) batches.set(mat, []);
      batches.get(mat).push(geo);
    };
    // legacy: world-space box rotated about its own centre
    const box = (w, h, d, x, y, z, mat, ry = 0) => put(new THREE.BoxGeometry(w, h, d), mat, x, y, z, 0, ry, 0);
    for (const p of this.props) {
      const { x, y, z } = p;
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
      }
    }
    for (const [mat, geos] of batches) {
      const g = mergeGeometries(geos, false); for (const x of geos) x.dispose();
      if (!g) continue;
      const m = new THREE.Mesh(g, mat); m.castShadow = !mat.transparent; m.receiveShadow = true; group.add(m);
    }
    this.propMesh = group; world.group.add(group);
  }
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
  };
}

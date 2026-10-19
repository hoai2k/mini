// Floating voxel islands: cells drawn on a part (a bone of the rig: the head,
// the torso, an arm, ...) that touch nothing else on it, such as a clump of
// hair hanging in the air beside the head. For every workbench model it
// builds the rig unmerged and at rest (charmat.js PART_MERGE off, animate
// dt 0), and for each bone group (rig.head, torso, hips, arms, legs, and the
// hair or mane groups hung on them) fills a grid of GRID skin pixels in the
// group's own frame with what is drawn directly on it (the voxel kit's boxes
// and blob cells as solids; other meshes over their surface) and splits the
// filled cells into connected pieces (cells sharing a face). The largest
// piece is the part; a piece is held on when a fifth of it or more lies
// within half a pixel of the part (or of a piece already held on): a cube
// sunk into the mane, a decal on the face. Every other piece of at least
// MIN cells that is not shut inside the part is an island, printed with its
// size, the share of it against the part, and its centre (skin pixels, the
// group's frame).
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/islands.cjs [out.json] [keys] [--all] [--check]
// The head (and any group named hair or mane) is what the check is about:
// a mane or beard with a floating clump. --all also lists islands on the
// other parts (a pendant, a strap end or a dangling charm may be meant).
// --check exits 1 when a head, hair or mane group has an island that
// design/sizes.json "islands.reviewed" does not list (by its place, within
// 1 px) as looked at and found to be meant: a fringe flat on a forehead,
// fangs on a jaw that is its own group.
// Serves the repository on PERF_PORT (default 8765) if nothing is there yet.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { findChrome } = require('./lib.cjs');

const PORT = +(process.env.PERF_PORT || 8765);
const ROOT = path.resolve(__dirname, '../..');
const GAME = `http://127.0.0.1:${PORT}/percyjackson/game/`;
const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const CHECK = process.argv.includes('--check'), ALL = process.argv.includes('--all');
const OUT = ARGS[0] && ARGS[0] !== '-' ? ARGS[0] : null;
const ONLY = (ARGS[1] || '').split(',').filter(Boolean);
const SPEC = path.resolve(__dirname, '../design/sizes.json');
const GRID = +(process.env.ISLAND_GRID || 0.25), MIN = +(process.env.ISLAND_MIN || 2), FACE = process.env.ISLAND_N !== '26';

async function serve() {
  const up = async () => { try { return (await fetch(GAME)).ok; } catch { return false; } };
  if (await up()) return;
  spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', detached: true }).unref();
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250));
}

(async () => {
  await serve();
  const b = await chromium.launch({ executablePath: findChrome(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${GAME}workbench/?turn=0&lazy=1&lint=0&bg=light`);
  await p.waitForFunction(() => window.__wb, null, { timeout: 180000 });
  const res = await p.evaluate(async ({ only, GRID, MIN, FACE }) => {
    const THREE = await import('three/webgpu');
    const chr = await import('../js/entities/character.js');
    (await import('../js/entities/charmat.js')).PART_MERGE.on = false;   // (each mesh as drawn)
    const PX = chr.PX;
    const fx = (o) => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return !m || m.blending === THREE.AdditiveBlending || (m.transparent && !m.map && !m.vertexColors); };
    const visible = (o, top) => { for (let x = o; x && x !== top.parent; x = x.parent) if (!x.visible) return false; return true; };
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3(), inv = new THREE.Matrix4(), M = new THREE.Matrix4();
    // The solids the voxel kit draws (monsters.js VoxKit: its boxes, and the
    // cells of its rounded masses, fodder.js blob), recorded as each kit is
    // done, so a part is filled as solid cells: two cubes that share a face
    // join, two that only meet at an edge or a corner do not. Meshes drawn
    // some other way (skin boxes, grid hair) are sampled over their surface.
    const { VoxKit } = await import('../js/entities/monsters.js');
    Object.defineProperty(VoxKit.prototype, 'cached', { get() { return false; }, set() {}, configurable: true });   // (every build sculpts its blobs afresh)
    const done0 = VoxKit.prototype.done;
    VoxKit.prototype.done = function () {
      const rec = [];
      for (const [p, list] of this.lists) rec.push([p, { boxes: list.map((b) => ({ ...b })), grids: [] }]);
      for (const [p, parts] of this.vgrid ?? []) {
        let r = rec.find((q) => q[0] === p); if (!r) rec.push(r = [p, { boxes: [], grids: [] }]);
        for (const G of parts.values()) r[1].grids.push({ cell: G.cell, keys: [...G.cells.keys()] });
      }
      const before = new Map(rec.map(([p]) => [p, new Set(p.children)]));
      const out = done0.call(this);
      for (const [p, solid] of rec) {
        for (const c of p.children) if (!before.get(p).has(c) && c.isMesh) c.userData.kitSolid = true;
        const all = (p.userData.kitSolids ??= []); all.push(solid);
      }
      return out;
    };
    const GW = 4096, GO = 2048, E = new THREE.Euler(), Q = new THREE.Quaternion(), V = new THREE.Vector3();
    function cells(grp) {
      const occ = new Map(), put = (x, y, z) => { const k = `${x},${y},${z}`; if (!occ.has(k)) occ.set(k, true); };
      for (const S of grp.userData.kitSolids ?? []) {
        for (const b of S.boxes) {
          if (b.only != null) continue;   // (a flat decal on a face)
          const rot = b.rx || b.ry || b.rz; if (rot) Q.setFromEuler(E.set(b.rx, b.ry, b.rz, b.order ?? 'XYZ')).invert();
          const R = rot ? Math.hypot(b.w, b.h, b.d) / 2 : 0, hx = rot ? R : b.w / 2, hy = rot ? R : b.h / 2, hz = rot ? R : b.d / 2;
          const i0 = Math.round((b.x - hx) / GRID), i1 = Math.round((b.x + hx) / GRID), j0 = Math.round((b.y - hy) / GRID), j1 = Math.round((b.y + hy) / GRID), k0 = Math.round((b.z - hz) / GRID), k1 = Math.round((b.z + hz) / GRID);
          for (let i = i0; i < Math.max(i1, i0 + 1); i++) for (let j = j0; j < Math.max(j1, j0 + 1); j++) for (let k = k0; k < Math.max(k1, k0 + 1); k++) {
            if (rot) { V.set((i + 0.5) * GRID - b.x, (j + 0.5) * GRID - b.y, (k + 0.5) * GRID - b.z).applyQuaternion(Q); if (Math.abs(V.x) > b.w / 2 + 0.01 || Math.abs(V.y) > b.h / 2 + 0.01 || Math.abs(V.z) > b.d / 2 + 0.01) continue; }
            put(i, j, k);
          }
        }
        for (const G of S.grids) for (const key of G.keys) {
          const i = key % GW - GO, j = Math.floor(key / GW) % GW - GO, k = Math.floor(key / (GW * GW)) - GO;
          const x0 = Math.round(i * G.cell / GRID), x1 = Math.round((i + 1) * G.cell / GRID), y0 = Math.round(j * G.cell / GRID), y1 = Math.round((j + 1) * G.cell / GRID), z0 = Math.round(k * G.cell / GRID), z1 = Math.round((k + 1) * G.cell / GRID);
          for (let x = x0; x < Math.max(x1, x0 + 1); x++) for (let y = y0; y < Math.max(y1, y0 + 1); y++) for (let z = z0; z < Math.max(z1, z0 + 1); z++) put(x, y, z);
        }
      }
      inv.copy(grp.matrixWorld).invert();
      for (const m of grp.children) {
        if (!m.isMesh || m.userData.kitSolid || m.isInstancedMesh || m.isSprite || fx(m) || !visible(m, grp) || m.userData?.flames) continue;
        const pos = m.geometry.attributes.position, idx = m.geometry.index; if (!pos) continue;
        M.multiplyMatrices(inv, m.matrixWorld);
        const n = idx ? idx.count : pos.count;
        const v = (i, out) => out.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(M).divideScalar(PX);
        for (let t = 0; t < n; t += 3) {
          v(t, A); v(t + 1, B); v(t + 2, C);
          const L = Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A)), s = Math.max(1, Math.ceil(L / (GRID * 0.5)));
          for (let i = 0; i <= s; i++) for (let j = 0; j <= s - i; j++) {
            const u = i / s, w = j / s;
            P.copy(A).multiplyScalar(1 - u - w).addScaledVector(B, u).addScaledVector(C, w);
            put(Math.floor(P.x / GRID), Math.floor(P.y / GRID), Math.floor(P.z / GRID));
          }
        }
      }
      return occ;
    }
    function pieces(occ) {
      const seen = new Set(), out = [];
      for (const k0 of occ.keys()) {
        if (seen.has(k0)) continue;
        const q = [k0]; seen.add(k0); const list = [];
        while (q.length) {
          const k = q.pop(); list.push(k); const [x, y, z] = k.split(',').map(Number);
          for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
            if (FACE && Math.abs(dx) + Math.abs(dy) + Math.abs(dz) !== 1) continue;
            const n = `${x + dx},${y + dy},${z + dz}`; if (occ.has(n) && !seen.has(n)) { seen.add(n); q.push(n); }
          }
        }
        out.push(list);
      }
      return out.sort((a, b) => b.length - a.length);
    }
    const out = [];
    for (const it of window.__wb.items) {
      if (only.length && !only.includes(it.key)) continue;
      let rig; try { rig = it.build(); } catch (e) { out.push({ key: it.key, error: String(e.message) }); continue; }
      try { rig.animate?.({ dt: 0, speed: 0, vel: new THREE.Vector3(), action: null }); } catch {}
      rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, 0, 0); rig.root.updateMatrixWorld(true);
      // the bone groups, named; hair or mane groups hung on them by name
      const named = new Map();
      for (const k of ['head', 'neck', 'torso', 'hips', 'armR', 'armL', 'handR', 'handL', 'legR', 'legL']) if (rig[k]?.isObject3D && !named.has(rig[k])) named.set(rig[k], k);
      for (const [k, v] of Object.entries(rig.extras ?? {})) if (/hair|mane|beard/i.test(k) && v?.isObject3D && !named.has(v)) named.set(v, k);
      rig.root.traverse((o) => { if (!named.has(o) && /hair|mane|beard/i.test(o.name || '')) named.set(o, o.name); });
      const found = [];
      for (const [grp, name] of named) {
        if (!visible(grp, rig.root)) continue;
        const occ = cells(grp); if (occ.size < 4) continue;
        const ps = pieces(occ);
        // a piece is held on when enough of it lies against the part (or a
        // piece already held on): a cube sunk into the mane, or a decal laid
        // on the face, has a whole side within NEAR cells of it; a cube that
        // only meets the mane at an edge or a corner, or hangs off it, does not
        const main = new Set(ps[0]), NEAR = 2, HOLD = 0.2;
        const held = (pc) => {
          let near = 0;
          for (const k of pc) {
            const [x, y, z] = k.split(',').map(Number); let hit = false;
            for (let dx = -NEAR; dx <= NEAR && !hit; dx++) for (let dy = -NEAR; dy <= NEAR && !hit; dy++) for (let dz = -NEAR; dz <= NEAR && !hit; dz++) if (main.has(`${x + dx},${y + dy},${z + dz}`)) hit = true;
            if (hit) near++;
          }
          return near / pc.length;
        };
        // shut in: the part's own cells on every side (a cube drawn inside
        // another, never seen), not an island
        const shut = (pc) => {
          const c = [0, 0, 0]; for (const k of pc) k.split(',').forEach((v, a) => { c[a] += +v / pc.length; });
          const o = c.map(Math.round);
          return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].every((d) => {
            for (let i = 1; i < 400; i++) if (main.has(`${o[0] + d[0] * i},${o[1] + d[1] * i},${o[2] + d[2] * i}`)) return true;
            return false;
          });
        };
        let rest = ps.slice(1).filter((pc) => pc.length >= MIN && !shut(pc)), grew = true;
        while (grew) { grew = false; rest = rest.filter((pc) => { if (held(pc) < HOLD) return true; for (const k of pc) main.add(k); grew = true; return false; }); }
        for (const pc of rest) {
          const touch = held(pc);
          const c = [0, 0, 0]; for (const k of pc) k.split(',').forEach((v, a) => { c[a] += (+v + 0.5) * GRID / pc.length; });
          found.push({ part: name, cells: pc.length, main: ps[0].length, touch: +touch.toFixed(2), at: c.map((v) => +v.toFixed(1)) });
        }
      }
      out.push({ group: it.group, key: it.key, quad: !!(rig.isQuad || rig.isSerpent), islands: found });
      rig.root.traverse((o) => o.geometry?.dispose?.());
    }
    return out;
  }, { only: ONLY, GRID, MIN, FACE });
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  const hairy = (part) => /^(head|neck)$|hair|mane|beard/i.test(part) && !/flame/i.test(part);   // (flame hair is loose tongues of fire by design)
  const spec = fs.existsSync(SPEC) ? JSON.parse(fs.readFileSync(SPEC, 'utf8')) : {};
  const reviewed = spec.islands?.reviewed ?? {};
  const known = (key, i) => (reviewed[key]?.at ?? []).some((p) => Math.hypot(p[0] - i.at[0], p[1] - i.at[1], p[2] - i.at[2]) <= 1);
  let n = 0, bad = 0;
  for (const r of res) {
    if (r.error) { console.log(`${r.key}: ERROR ${r.error}`); bad++; continue; }
    const list = r.islands.filter((i) => ALL || hairy(i.part));
    if (!list.length) continue;
    for (const i of list) {
      const ok = hairy(i.part) && known(r.key, i);
      const flag = hairy(i.part) && !ok;
      n++; if (flag) bad++;
      console.log(`${flag ? 'FLOAT' : '     '} ${(r.key + (r.quad ? ' (q)' : '')).padEnd(26)} ${i.part.padEnd(10)} ${String(i.cells).padStart(4)} cells (part ${i.main}), ${Math.round(i.touch * 100)}% against it, at [${i.at.join(', ')}]${ok ? `  (reviewed: ${reviewed[r.key].note})` : ''}`);
    }
  }
  console.log(`\nislands (grid ${GRID} px, ${MIN}+ cells): ${res.length} models, ${n} listed, ${bad} on a head, hair or mane not reviewed (design/sizes.json islands); page errors ${errs.length}`, errs.slice(0, 3));
  await b.close();
  process.exit(errs.length || (CHECK && bad) ? 1 : 0);
})();

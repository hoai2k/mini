#!/usr/bin/env node
/** Bakes collision boxes for every delivered structure GLB into
 * `hopper/3d/models/collision.json`, in the model's own local frame (the
 * frame `swapDelivered` draws the GLB in: a child of the stand-in group at
 * local-origin, unit scale -- so no placement transform is applied here;
 * `world.ts` applies the instance's position/yaw at runtime, exactly as it
 * already does for the stand-in's own primitive-mesh colliders).
 *
 * Method (see collision-audit.mjs, which measures the mismatch this fixes):
 * a 2 m grid over the model's LOD0 footprint, two raycasts per column -- one
 * downward from above, one upward from below. The stand-in kit's surfaces
 * are single-sided (front-face only), so a downward ray registers only
 * upward-facing surfaces (tops) and an upward ray only downward-facing ones
 * (undersides); neither ray alone can find where a solid box ends, but
 * together, sorted by height, they alternate top/bottom/top/bottom for each
 * distinct solid layer the column passes through (a multi-tier terrace's
 * tiers, a bridge deck with open air below it, a tower solid all the way to
 * the ground) and consecutive pairs are exactly that layer's true vertical
 * extent -- both its walkable top and, unlike a top-only slab, its actual
 * body for `resolveWalls` to block a straight walk into it. An unpaired hit
 * (a one-sided decal plane, e.g.) falls back to a flat 1.5 m slab.
 *
 * Columns are then grouped into layers by (rounded) y0/y1 and run-merged
 * along X within each Z row, to keep the box count sane over flat expanses.
 *
 * Usage: node source/bake-collision.mjs [--step 2] [file.glb ...]
 * With no files, every delivered structure in manifest.json is baked.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELS = path.resolve(HERE, '..');
const ROOT = path.resolve(MODELS, '../../..');
const GAME = path.join(ROOT, 'hopper/game');
const require = createRequire(path.join(GAME, 'package.json'));
const args = process.argv.slice(2);
const stepIdx = args.indexOf('--step');
const step = stepIdx >= 0 ? +args[stepIdx + 1] : 2;
const wantFiles = new Set(args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--step'));

const delivery = JSON.parse(fs.readFileSync(path.join(MODELS, 'manifest.json'), 'utf8'));
const structures = delivery.models.filter((m) => m.category === 'structure' && m.status === 'delivered' && (!wantFiles.size || wantFiles.has(m.file) || wantFiles.has(m.request)));

const PAGE = `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/hopper/game/node_modules/three/build/three.module.js","three/addons/":"/hopper/game/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const q = new URLSearchParams(location.search);
const url = q.get('model');
const step = +q.get('step') || 2;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.load(url, (gltf) => {
  const root = gltf.scene;
  root.traverse((o) => { if (/^LOD\\d/.test(o.name)) o.visible = o.name.startsWith('LOD0'); });
  root.updateWorldMatrix(true, true);
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    let n = o, ok = true;
    while (n && n !== root.parent) { if (n.visible === false) { ok = false; break; } n = n.parent; }
    if (ok) meshes.push(o);
  });
  if (!meshes.length) { window.__result = { error: 'no visible meshes' }; return; }
  const box = new THREE.Box3();
  for (const m of meshes) box.expandByObject(m);
  const caster = new THREE.Raycaster();
  const columns = [];
  const x0 = Math.floor(box.min.x / step) * step, x1 = Math.ceil(box.max.x / step) * step;
  const z0 = Math.floor(box.min.z / step) * step, z1 = Math.ceil(box.max.z / step) * step;
  const span = box.max.y - box.min.y + 10;
  // De-duplicate coincident faces (shared/adjacent surfaces at the same height),
  // keeping hits sorted the direction the ray travelled.
  const dedupe = (hits) => {
    const ys = [];
    for (const h of hits) if (!ys.length || Math.abs(ys[ys.length - 1] - h.point.y) > 0.03) ys.push(h.point.y);
    return ys;
  };
  for (let x = x0; x <= x1; x += step) {
    for (let z = z0; z <= z1; z += step) {
      caster.set(new THREE.Vector3(x, box.max.y + 5, z), new THREE.Vector3(0, -1, 0));
      caster.far = span;
      const tops = dedupe(caster.intersectObjects(meshes, false)); // high to low
      caster.set(new THREE.Vector3(x, box.min.y - 5, z), new THREE.Vector3(0, 1, 0));
      caster.far = span;
      const bottoms = dedupe(caster.intersectObjects(meshes, false)); // low to high
      if (!tops.length && !bottoms.length) continue;
      // Merge into height-descending events and pair each top with the
      // bottom immediately under it -- see the header for why this
      // reconstructs true solid intervals (not just "first hit downward").
      const events = [...tops.map((y) => ({ y, kind: 'top' })), ...bottoms.map((y) => ({ y, kind: 'bottom' }))].sort((a, b) => b.y - a.y);
      let i = 0;
      while (i < events.length) {
        if (events[i].kind === 'top') {
          if (i + 1 < events.length && events[i + 1].kind === 'bottom') {
            columns.push({ x, z, y0: events[i + 1].y, y1: events[i].y });
            i += 2;
          } else {
            columns.push({ x, z, y0: events[i].y - 1.5, y1: events[i].y }); // unmatched: default slab
            i += 1;
          }
        } else {
          i += 1; // unmatched bottom with no top above it: not a surface Hopper would land on
        }
      }
    }
  }
  // A near-vertical wall (a cylindrical tower, a curved facade) is invisible
  // to a straight up/down ray -- it runs parallel to it. Ring-scan the
  // footprint's perimeter instead: rays fired inward, level by level, find
  // the actual outer surface (front-facing, same as the vertical scan). This
  // is a shell (one grid cell "deep"), not a solid, so it is baked at a
  // coarser cell (wallStep) than the footprint grid: a 2 m cell that is only
  // ever a thin shell in its own thickness reads as clutter, not a wall, to
  // code that wants a reasonably-sized platform or face (perchNear, the
  // wall-climb gait); a coarser cell gives resolveWalls, and that code, a
  // properly chunky box to find.
  const wallStep = Math.max(step, 5);
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const rx = (box.max.x - box.min.x) / 2, rz = (box.max.z - box.min.z) / 2;
  const ringR = Math.max(rx, rz) + 5;
  const ringN = Math.max(16, Math.round((2 * Math.PI * Math.max(rx, rz, 1)) / (wallStep * 0.6)));
  const wallColumns = [];
  for (let i = 0; i < ringN; i++) {
    const a = (i / ringN) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    const ox = cx + dx * ringR, oz = cz + dz * ringR;
    for (let y = box.min.y + wallStep / 2; y <= box.max.y; y += wallStep) {
      caster.set(new THREE.Vector3(ox, y, oz), new THREE.Vector3(-dx, 0, -dz));
      caster.far = ringR * 2 + 5;
      const hits = caster.intersectObjects(meshes, false);
      if (!hits.length) continue;
      const gx = Math.round(hits[0].point.x / wallStep) * wallStep,
        gz = Math.round(hits[0].point.z / wallStep) * wallStep;
      wallColumns.push({ x: gx, z: gz, y0: y - wallStep / 2, y1: y + wallStep / 2 });
    }
  }
  window.__result = { columns, wallColumns, step, wallStep };
}, undefined, (e) => { window.__result = { error: String(e) }; });
</script>`;

function contentType(file) {
  return { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream';
}

/** Group columns into layers by their (rounded) vertical extent -- a column
 * can now carry several intervals (a terrace's tiers, a bridge deck plus
 * its far-below abutment) -- then rectangle-merge each layer: first run-merge
 * along X within each Z row, then merge those runs along Z where consecutive
 * rows share the same X-span, so a flat expanse (a tier, a deck, a roof)
 * becomes real 2D rectangles instead of a ribbon of 2 m-deep strips -- boxes
 * this thin would never read as "a structure top" to code that wants a
 * reasonably-sized platform (e.g. `perchNear`'s hx/hz >= 2.5 m floor). */
function mergeColumns(columns, step) {
  const layers = new Map(); // "ry0|ry1" -> [{x, z}]
  for (const c of columns) {
    const ry0 = Math.round(c.y0 / 0.25) * 0.25,
      ry1 = Math.round(c.y1 / 0.25) * 0.25;
    if (ry1 - ry0 < 0.05) continue; // degenerate after rounding: not worth a box
    const key = `${ry0}|${ry1}`;
    if (!layers.has(key)) layers.set(key, { ry0, ry1, cols: [] });
    layers.get(key).cols.push({ x: c.x, z: c.z });
  }
  const boxes = [];
  for (const { ry0, ry1, cols } of layers.values()) {
    const rows = new Map(); // z -> [x]
    for (const c of cols) {
      if (!rows.has(c.z)) rows.set(c.z, []);
      rows.get(c.z).push(c.x);
    }
    // Pass 1: run-merge along X within each Z row.
    const runs = []; // {xMin, xMax, z}
    for (const [z, xs] of rows) {
      xs.sort((a, b) => a - b);
      let run = null;
      const flush = () => {
        if (run) runs.push({ xMin: run.xMin, xMax: run.xMax, z });
        run = null;
      };
      for (const x of xs) {
        if (run && x - run.xMax <= step + 0.01) run.xMax = x;
        else {
          flush();
          run = { xMin: x, xMax: x };
        }
      }
      flush();
    }
    // Pass 2: merge runs along Z into groups, row by row. Real geometry
    // rarely gives every row in a flat top the exact same X-run (raycasting
    // lands a hair off the grid at an edge, or the shape tapers a little),
    // so this is a tolerant sweep rather than an exact-span match: a row
    // joins the most-recent still-open group it substantially overlaps
    // (by X, and directly adjacent in Z), and the group's X-span is the
    // union of every row merged into it -- a mild, conservative widening
    // rather than the ribbon of separate 2 m-deep strips an exact match
    // degenerates to.
    runs.sort((a, b) => a.z - b.z || a.xMin - b.xMin);
    const open = []; // {zMin, zMax, xMin, xMax}
    for (const r of runs) {
      let best = null;
      for (const g of open) {
        if (r.z - g.zMax > step + 0.01) continue; // not adjacent in Z anymore
        const overlap = Math.min(g.xMax, r.xMax) - Math.max(g.xMin, r.xMin);
        const smaller = Math.min(g.xMax - g.xMin, r.xMax - r.xMin) + step;
        if (overlap <= 0 || overlap / smaller < 0.5) continue; // not substantially the same span
        if (!best || g.zMax > best.zMax) best = g;
      }
      if (best) {
        best.zMax = r.z;
        best.xMin = Math.min(best.xMin, r.xMin);
        best.xMax = Math.max(best.xMax, r.xMax);
      } else {
        open.push({ zMin: r.z, zMax: r.z, xMin: r.xMin, xMax: r.xMax });
      }
    }
    for (const g of open) {
      const hx = (g.xMax - g.xMin) / 2 + step / 2,
        hz = (g.zMax - g.zMin) / 2 + step / 2;
      boxes.push({ ox: (g.xMin + g.xMax) / 2, oz: (g.zMin + g.zMax) / 2, hx, hz, y0: ry0, y1: ry1 });
    }
  }
  return boxes;
}

/** Stack a run of boxes at the same (ox, oz, hx, hz) with touching y-ranges
 * into one tall box. The ring scan bakes a wall as a stack of `step`-tall
 * bands; left unmerged, each band's top edge reads as a small mantle-able
 * ledge instead of one continuous wall face a wall-kick needs. */
function mergeVertical(boxes) {
  const groups = new Map(); // "ox|oz|hx|hz" -> boxes, sorted by y0
  for (const b of boxes) {
    const key = `${b.ox}|${b.oz}|${b.hx}|${b.hz}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  const out = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.y0 - b.y0);
    let run = null;
    for (const b of group) {
      if (run && b.y0 - run.y1 <= 0.05) run.y1 = Math.max(run.y1, b.y1);
      else {
        if (run) out.push(run);
        run = { ...b };
      }
    }
    if (run) out.push(run);
  }
  return out;
}

async function main() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/bake') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(PAGE);
      return;
    }
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': contentType(file) });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const { chromium } = require('playwright-core');
  const executablePath = process.env.CHROMIUM || ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });

  const outPath = path.join(MODELS, 'collision.json');
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
  const out = { ...existing };
  let totalBoxes = 0;
  for (const m of structures) {
    const modelUrl = '/hopper/3d/models/' + m.file;
    await page.goto(`http://127.0.0.1:${port}/bake?model=${encodeURIComponent(modelUrl)}&step=${step}`);
    await page.waitForFunction(() => window.__result !== undefined, null, { timeout: 60000 });
    const result = await page.evaluate(() => window.__result);
    if (result.error) {
      console.log(`FAIL ${m.file}: ${result.error}`);
      continue;
    }
    const wallBoxes = mergeColumns(result.wallColumns, result.wallStep).map((b) => ({ ...b, wall: true }));
    const boxes = mergeVertical([...mergeColumns(result.columns, step), ...wallBoxes]);
    out[m.file] = boxes;
    totalBoxes += boxes.length;
    console.log(`${m.request} ${m.file}: ${result.columns.length} columns + ${result.wallColumns.length} wall samples -> ${boxes.length} boxes`);
  }
  await browser.close();
  server.close();
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
  console.log(`\n${structures.length} models, ${totalBoxes} boxes total. Written to ${outPath}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

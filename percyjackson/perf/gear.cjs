// Gear check: every armour item of loot.js on every hero (gear/armour.js,
// dressed by gear/equip.js), built in headless Chromium:
//
//   islands  at rest, every armour block is held on: the gear's boxes and the
//            body's skin boxes filled into one grid of GRID skin pixels (in
//            the root's frame, so a skirt panel or a cape segment is joined
//            to what it hangs from), split into connected pieces (cells
//            sharing a face); a piece with gear in it and no body is an
//            island (a floating plate, a clasp off the cape; MIN cells or more:
//            a lone cell is the grid catching a turned block's corner). Hair doesn't
//            count as body: a helmet must sit on the head, not on the hair.
//   clip     through walk, run and the workbench's attacks (swingR, swingL,
//            punch, slam; 30 frames a second), no armour block on one bone
//            goes into another bone's body (its skin box shrunk by CORE px)
//            deeper than that bone's own skin goes, plus TOL px: a bracer
//            may follow the arm across the chest as the arm does, a cuirass
//            may not cut into a swinging arm, greaves into the other leg, a
//            skirt or a cape into the legs. Pairs left out: head and arms (a
//            raised arm passes through the hair and any hat beside the head
//            in the slam, as it always did), hips and torso (the torso bends
//            over the skirt's top).
//   draws    the meshes and triangles of each hero in each armour (and with
//            a weapon in hand): what the gear costs.
//
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/gear.cjs [heroes] [--all]
// heroes: a comma list (default all). --all prints every row, not just the
// failing ones. Exits 1 on a failure. As a module (check.cjs): run({ browser,
// base, page?, only? }) resolves to { ok, lines, summary, rows }.
const { openModulePage, loadModule, watchErrors, reseed, cli } = require('./lib.cjs');

const LIM = { GRID: 0.3, MIN: 4, CORE: 0.5, TOL: 1.2 };

function moduleSource() {
  return `import * as THREE from 'three/webgpu';
import { PX } from '../js/entities/character.js';
import { buildHeroModel, HERO_LOOKS } from '../js/entities/models.js';
import { dressHero } from '../js/entities/gear/equip.js';
import { ARMOUR_IDS } from '../js/entities/gear/armour.js';
import { WEAPON_IDS } from '../js/entities/gear/weapons.js';
import { poseStep } from './ingame.js';
const LIM = ${JSON.stringify(LIM)};
const DT = 1 / 30;
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _e = new THREE.Euler(), _q = new THREE.Quaternion();
const visible = (o, top) => { for (let x = o; x && x !== top.parent; x = x.parent) if (!x.visible) return false; return true; };
// the bone a node hangs from
function boneOf(rig, o) {
  for (let p = o; p; p = p.parent) for (const k of ['head', 'handR', 'handL', 'armR', 'armL', 'legR', 'legL', 'torso', 'hips']) if (rig[k] === p) return k;
  return null;
}
// a bone's skin box (the meshes drawn with the rig's skin material), px, in the bone's frame
function skinBox(rig, g) {
  const box = new THREE.Box3(); let any = false;
  const inv = g.matrixWorld.clone().invert();
  for (const m of g.children) {
    if (!m.isMesh || (m.userData.baseMat ?? m.material) !== rig.material) continue;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox.clone().applyMatrix4(_m.multiplyMatrices(inv, m.matrixWorld))); any = true;
  }
  if (!any) return null;
  box.min.divideScalar(PX); box.max.divideScalar(PX);
  return box;
}
// points of a box (in its mesh's units): corners and centre
function boxPoints(b, out) {
  const [x, y, z] = b.at, [w, h, d] = b.size, rot = b.r && (b.r[0] || b.r[1] || b.r[2]);
  if (rot) _q.setFromEuler(_e.set(b.r[0], b.r[1], b.r[2]));
  for (const [i, j, k] of [[0, 0, 0], [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]]) {
    _v.set(i * w / 2, j * h / 2, k * d / 2); if (rot) _v.applyQuaternion(_q);
    out.push(x + _v.x, y + _v.y, z + _v.z);
  }
}
// the armour's meshes: { mesh, bone, local points (mesh units) }
function gearMeshes(rig) {
  const out = [];
  rig.root.traverse((m) => {
    if (!m.isMesh || !m.userData.gearBoxes || m.parent?.userData?.gearWeapon) return;
    const P = []; for (const b of m.userData.gearBoxes) if (b.f !== 'outfit') boxPoints(b, P);
    if (P.length && visible(m, rig.root)) out.push({ mesh: m, bone: boneOf(rig, m), P: new Float32Array(P), unit: m.userData.gearUnit });
  });
  return out;
}
const depthIn = (bx, x, y, z) => Math.min(x - bx.min.x, bx.max.x - x, y - bx.min.y, bx.max.y - y, z - bx.min.z, bx.max.z - z);
const SKIP = new Set(['head:armR', 'head:armL', 'armR:head', 'armL:head', 'hips:torso', 'torso:hips', 'handR:head', 'handL:head']);
const BODY = ['head', 'torso', 'armR', 'armL', 'legR', 'legL'];

// ---- islands: gear and body filled into one grid, connected pieces
function islands(rig) {
  rig.root.updateMatrixWorld(true);
  const inv = rig.root.matrixWorld.clone().invert(), G = LIM.GRID;
  const cells = new Map();   // key -> 1 body, 2 gear, 3 both
  const key = (x, y, z) => ((Math.floor(x / G) + 2000) * 4096 + (Math.floor(y / G) + 2000)) * 4096 + (Math.floor(z / G) + 2000);
  const fill = (M, unit, at, size, r, kind) => {
    const [w, h, d] = size, n = [w, h, d].map((s) => Math.max(2, Math.ceil(s / (G * 0.8 / (unit / PX))) + 1));
    const rot = r && (r[0] || r[1] || r[2]); if (rot) _q.setFromEuler(_e.set(r[0], r[1], r[2]));
    for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++) {
      _v.set((i / (n[0] - 1) - 0.5) * w, (j / (n[1] - 1) - 0.5) * h, (k / (n[2] - 1) - 0.5) * d); if (rot) _v.applyQuaternion(_q);
      _v.set(at[0] + _v.x, at[1] + _v.y, at[2] + _v.z).multiplyScalar(unit).applyMatrix4(M).divideScalar(PX);
      const q = key(_v.x, _v.y, _v.z); cells.set(q, (cells.get(q) ?? 0) | kind);
    }
  };
  for (const b of BODY) {
    const g = rig[b], B = skinBox(rig, g); if (!B || !visible(g, rig.root)) continue;
    const c = B.getCenter(new THREE.Vector3()), s = B.getSize(new THREE.Vector3());
    fill(_m.multiplyMatrices(inv, g.matrixWorld), PX, [c.x, c.y, c.z], [s.x, s.y, s.z], null, 1);
  }
  const gear = [];
  for (const { mesh, unit } of gearMeshes(rig)) {
    const M = _m.multiplyMatrices(inv, mesh.matrixWorld).clone();
    for (const b of mesh.userData.gearBoxes) fill(M, unit, b.at, b.size, b.r, b.f === 'outfit' ? 1 : 2);
  }
  // connected pieces
  const seen = new Set(), out = [];
  const D = [1, -1, 4096, -4096, 4096 * 4096, -4096 * 4096];
  for (const [k0, v0] of cells) {
    if (seen.has(k0)) continue;
    const q = [k0]; seen.add(k0); let body = false, gearN = 0, sx = 0, sy = 0, sz = 0;
    while (q.length) {
      const k = q.pop(), v = cells.get(k);
      if (v & 1) body = true; if (v & 2) { gearN++; sx += Math.floor(k / 4096 / 4096); sy += Math.floor(k / 4096) % 4096; sz += k % 4096; }
      for (const d of D) { const n = k + d; if (cells.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
    }
    if (!body && gearN >= LIM.MIN) out.push({ cells: gearN, at: [sx, sy, sz].map((v) => +((v / gearN - 2000) * G).toFixed(1)) });
  }
  return out;
}

// ---- clipping through the poses
const POSES = [['walk', 30, 2], ['run', 30, 2], ['attack', 156, 3]];
function clips(rig) {
  const bones = {};
  rig.root.updateMatrixWorld(true);
  for (const b of BODY) { const B = skinBox(rig, rig[b]); if (B) bones[b] = { g: rig[b], core: B.clone().expandByScalar(-LIM.CORE), skin: [] }; }
  // the skin's own points (a lattice through its box, about a pixel apart), for the baseline
  for (const b of Object.keys(bones)) {
    const B = skinBox(rig, rig[b]); const P = [];
    for (const i of [0, 0.25, 0.5, 0.75, 1]) for (const j of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]) for (const k of [0, 0.25, 0.5, 0.75, 1]) P.push(B.min.x + (B.max.x - B.min.x) * i, B.min.y + (B.max.y - B.min.y) * j, B.min.z + (B.max.z - B.min.z) * k);
    bones[b].skin = P;
  }
  const G = gearMeshes(rig).filter((x) => x.bone && !x.bone.startsWith('hand'));
  const worst = {};
  for (const [pose, n, every] of POSES) {
    const st = { t: 0 };
    for (let f = 0; f < n; f++) {
      poseStep(rig, pose, st, DT); rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, 0, 0);
      if (f % every) continue;
      rig.root.updateMatrixWorld(true);
      for (const B of BODY) {
        const T = bones[B]; if (!T) continue;
        const inv = T.g.matrixWorld.clone().invert();
        // the baseline: how deep each other bone's own skin goes into this one now
        const base = {};
        for (const A of Object.keys(bones)) {
          if (A === B) continue;
          const M = _m.multiplyMatrices(inv, bones[A].g.matrixWorld); let d = 0; const P = bones[A].skin;
          for (let i = 0; i < P.length; i += 3) { _v.set(P[i], P[i + 1], P[i + 2]).multiplyScalar(PX).applyMatrix4(M).divideScalar(PX); d = Math.max(d, depthIn(T.core, _v.x, _v.y, _v.z)); }
          base[A] = d;
        }
        for (const x of G) {
          const A = x.bone; if (A === B || SKIP.has(A + ':' + B)) continue;
          const M = _m.multiplyMatrices(inv, x.mesh.matrixWorld); let d = 0, at = null;
          for (let i = 0; i < x.P.length; i += 3) {
            _v.set(x.P[i], x.P[i + 1], x.P[i + 2]).multiplyScalar(x.unit).applyMatrix4(M).divideScalar(PX);
            const dd = depthIn(T.core, _v.x, _v.y, _v.z); if (dd > d) { d = dd; at = [_v.x, _v.y, _v.z]; }
          }
          const over = d - (base[A] ?? 0), k = A + ':' + B;
          if (over > (worst[k]?.over ?? -1)) worst[k] = { over: +over.toFixed(2), depth: +d.toFixed(2), base: +(base[A] ?? 0).toFixed(2), pose, f, at: at?.map((v) => +v.toFixed(1)) };
        }
      }
    }
  }
  return worst;
}
const cost = (rig) => { let meshes = 0, tris = 0; rig.root.traverse((o) => { if (o.isMesh && visible(o, rig.root)) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { meshes, tris: Math.round(tris) }; };

export function run(only) {
  const rows = [];
  const heroes = Object.keys(HERO_LOOKS).filter((h) => !only?.length || only.includes(h));
  for (const h of heroes) {
    globalThis.__perfReseed?.();
    const rig = buildHeroModel(h);
    const base = cost(rig);
    // every armour, and the two-handed carry with the heaviest one (the arms in front of the body)
    const combos = [...ARMOUR_IDS.map((a) => ({ armor: a })), { armor: 'achilles_armor', weapon: 'labrys' }, { armor: 'hoplite_panoply', weapon: 'twin_daggers' }];
    for (const g of combos) {
      dressHero(rig, g);
      const st = { t: 0 }; for (let i = 0; i < 18; i++) poseStep(rig, 'idle', st, DT);
      rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, 0, 0); rig.root.updateMatrixWorld(true);
      const isl = islands(rig), cl = clips(rig), c = cost(rig);
      const bad = Object.entries(cl).filter(([, w]) => w.over > LIM.TOL);
      rows.push({ hero: h, armor: g.armor, weapon: g.weapon ?? null, islands: isl, clip: cl, bad: bad.map(([k, w]) => ({ pair: k, ...w })), base, cost: c });
    }
    dressHero(rig, {});
    rig.root.traverse((o) => o.geometry?.dispose?.());
  }
  return rows;
}
`;
}

function report(rows, { all = false } = {}) {
  const lines = [];
  let fails = 0;
  lines.push(['hero'.padEnd(9), 'armour'.padEnd(19), 'weapon'.padEnd(13), 'islands', '  worst clip (over own skin, px)'.padEnd(46), 'meshes', '   tris', ' result'].join(' '));
  for (const r of rows) {
    const bad = r.islands.length || r.bad.length;
    if (bad) fails++;
    const w = Object.entries(r.clip).sort((a, b) => b[1].over - a[1].over)[0];
    const clip = w ? `${w[1].over.toFixed(2)} ${w[0]} (${w[1].pose} f${w[1].f})` : '-';
    if (!bad && !all) continue;
    lines.push([r.hero.padEnd(9), r.armor.padEnd(19), (r.weapon ?? '').padEnd(13), String(r.islands.length).padStart(7), ('  ' + clip).padEnd(46), String(r.cost.meshes).padStart(6), String(r.cost.tris).padStart(7), ' ' + (bad ? 'FAIL' : 'ok')].join(' '));
    for (const i of r.islands) lines.push(`      island: ${i.cells} cells at [${i.at}] (px, root frame)`);
    for (const b of r.bad) lines.push(`      clip ${b.pair}: ${b.depth} px deep (its own skin ${b.base}) at [${b.at}] in ${b.pair.split(':')[1]}'s frame, ${b.pose} frame ${b.f}; max ${LIM.TOL} over`);
  }
  // the cost per hero: own look, the heaviest armour, the heaviest with a weapon
  const per = {};
  for (const r of rows) { const p = (per[r.hero] ??= { base: r.base, max: null, maxW: null }); if (!r.weapon && (!p.max || r.cost.meshes > p.max.cost.meshes)) p.max = r; if (r.weapon && (!p.maxW || r.cost.meshes > p.maxW.cost.meshes)) p.maxW = r; }
  lines.push('\nmeshes (draws, before shadows) and triangles per hero:');
  for (const [h, p] of Object.entries(per)) lines.push(`  ${h.padEnd(9)} own look ${String(p.base.meshes).padStart(3)} / ${String(p.base.tris).padStart(6)}   heaviest armour (${p.max.armor}) ${String(p.max.cost.meshes).padStart(3)} / ${String(p.max.cost.tris).padStart(6)}   with ${p.maxW?.weapon} ${String(p.maxW?.cost.meshes).padStart(3)} / ${String(p.maxW?.cost.tris).padStart(6)}`);
  const n = new Set(rows.map((r) => r.armor)).size, hn = new Set(rows.map((r) => r.hero)).size;
  lines.push(`\ngear: ${n} armour items on ${hn} heroes (${rows.length} outfits), ${fails} failing. islands: gear held on by nothing at rest (grid ${LIM.GRID} px); clip: armour into another bone's body (skin box less ${LIM.CORE} px) more than ${LIM.TOL} px deeper than that bone's own skin, through walk, run and attack.`);
  return { ok: !fails, lines, rows, summary: { outfits: rows.length, failing: fails }, text: `${n} armours x ${hn} heroes (${rows.length} outfits), ${fails} failing` };
}

async function run({ browser, base, page = null, only = null, all = false }) {
  const own = page ? null : await openModulePage(browser, base);
  page = page ?? own.page;
  const w = watchErrors(page, (e) => String(e.message).slice(0, 300));
  try {
    const err = await loadModule(page, base, 'gear', moduleSource());
    const errors = [...(own ? own.errors : w.errors)]; if (err && !errors.length) errors.push(err);
    if (errors.length) return { ok: false, lines: [errors.join('\n')], rows: [], summary: { pageErrors: errors.length }, text: `page errors: ${errors[0]}` };
    await reseed(page);
    const rows = await page.evaluate((o) => import('./__gear.js').then((m) => m.run(o)), only);
    return report(rows, { all });
  } finally { w.stop(); if (own) await own.page.close(); }
}

module.exports = { run, moduleSource, report, LIM };
if (require.main === module) {
  const A = process.argv.slice(2);
  cli(run, { all: A.includes('--all'), only: (A.find((a) => !a.startsWith('--')) || '').split(',').filter(Boolean) });
}

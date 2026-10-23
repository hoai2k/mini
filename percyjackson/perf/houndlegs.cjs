// Hellhound legs stay on: every full-size hellhound (the elite, the alpha
// boss, Shadowfang and the Road West's hellhound champion, all monsters.js
// bigHound; and the pup and its champion, bigPup, built the same way) is played through idle, walk, run, its attacks, a hit, a
// stagger and a dodge at 30 frames a second, and on every frame each leg
// must still be rooted in the body: its root (the hip or shoulder joint)
// inside the haunch or chest block it hangs from (rig.extras.trunk), at
// least MARGIN skin pixels above its underside and in from its front and back, and at least MIN_VERTS of the leg's own
// blocks overlapping that block. Prints the worst frame per model and pose;
// exits 1 on any failure.
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/houndlegs.cjs
// Serves the repository on PERF_PORT (default 8765) if nothing is there yet.
// As a module (check.cjs): run({ browser, base, page? }) resolves to { ok, lines, summary, rows }.
const { openModulePage, loadModule, watchErrors, reseed, cli } = require('./lib.cjs');

const MARGIN = 2, MIN_VERTS = 8;

// The in-page module (served beside the workbench as workbench/__houndlegs.js).
function moduleSource() {
  return `import * as THREE from 'three/webgpu';
import { PX } from '../js/entities/character.js';
import { buildMonsterModel } from '../js/entities/monsters.js';
import { BOSS_DEFS } from '../js/entities/bosses.js';
import { buildShowcase } from '../js/entities/champions.js';
const MODELS = {
  hellhound: () => buildMonsterModel('hellhound'),
  hellhound_alpha: () => BOSS_DEFS.hellhound_alpha.build(),
  woods_shadowfang: () => buildShowcase('woods_shadowfang'),
  'kind:hellhound': () => buildShowcase('kind:hellhound'),
  pup: () => buildMonsterModel('pup'),
  'kind:pup': () => buildShowcase('kind:pup'),
};
const atk = (style, len = 1) => (f) => ({ speed: 0, action: { type: 'attack', t: (f / 30 / len) % 1, style, windup: 0.3, strike: 0.5 } });
const POSES = {
  idle: () => ({ speed: 0 }), walk: () => ({ speed: 0.35 }), run: () => ({ speed: 1 }),
  bite: atk('bite'), slam: atk('slam', 1.2), 'bite on the run': (f) => ({ ...atk('bite')(f), speed: 1 }),
  hit: (f) => ({ speed: 0, action: { type: 'hit', t: (f / 30 / 0.4) % 1 } }), stagger: () => ({ speed: 0, action: { type: 'stagger', t: 0.5 } }),
  dodge: (f) => ({ speed: 0.6, action: { type: 'dodge', t: (f / 30 / 0.5) % 1 } }),
};
const inv = new THREE.Matrix4(), M = new THREE.Matrix4(), v = new THREE.Vector3();
export function check(id) {
  globalThis.__perfReseed?.();   // (PERF_SEED: lib.cjs reseed)
  const out = [];
  for (const [pose, at] of Object.entries(POSES)) {
    const rig = MODELS[id](), T = rig.extras.trunk;
    if (!T) return [{ pose, fail: 'no rig.extras.trunk: not a full-size hellhound' }];
    const legs = rig.legs.map((g) => {
      const meshes = []; g.traverse((o) => { if (o.isMesh) meshes.push(o); });
      return { g, box: g.userData.row === 0 ? T.chest : T.haunch, meshes, name: (g.userData.row === 0 ? 'front ' : 'hind ') + (g.userData.side < 0 ? 'right' : 'left') };
    });
    const vel = new THREE.Vector3();
    let worst = { depth: Infinity, verts: Infinity };
    for (let f = -18; f < 150; f++) {   // (18 frames of rest first)
      const p = f < 0 ? { speed: 0 } : at(f);
      vel.set(0, 0, p.speed * 4);
      rig.animate({ dt: 1 / 30, speed: p.speed, vel, action: p.action ?? null });
      if (f < 0) continue;
      rig.root.updateMatrixWorld(true);
      inv.copy(rig.torso.matrixWorld).invert();
      for (const L of legs) {
        const b = L.box;
        const inside = (x, y, z, m) => x > b[0] + m && x < b[3] - m && y > b[1] + m && y < b[4] - m && z > b[2] + m && z < b[5] - m;
        // the joint: the leg's origin in the torso's space, in skin pixels
        v.setFromMatrixPosition(M.multiplyMatrices(inv, L.g.matrixWorld)).divideScalar(PX);
        // (up, down, fore and aft: the joint sits near the body's side by design, the leg hung on its flank)
        const depth = v.x > b[0] && v.x < b[3] ? Math.min(v.y - b[1], b[4] - v.y, v.z - b[2], b[5] - v.z) : -1;
        // the leg's own blocks inside the body block
        let verts = 0;
        for (const m of L.meshes) {
          M.multiplyMatrices(inv, m.matrixWorld);
          const P = m.geometry.attributes.position;
          for (let i = 0; i < P.count && verts < 64; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M).divideScalar(PX); if (inside(v.x, v.y, v.z, 0)) verts++; }
        }
        if (depth < worst.depth) worst = { ...worst, depth, depthAt: f, depthLeg: L.name };
        if (verts < worst.verts) worst = { ...worst, verts, vertsAt: f, vertsLeg: L.name };
      }
    }
    const fail = worst.depth < ${MARGIN} ? 'the ' + worst.depthLeg + ' leg\\'s joint is ' + worst.depth.toFixed(1) + ' px inside its body block at frame ' + worst.depthAt
      : worst.verts < ${MIN_VERTS} ? 'the ' + worst.vertsLeg + ' leg has only ' + worst.verts + ' vertices inside its body block at frame ' + worst.vertsAt : null;
    out.push({ pose, depth: +worst.depth.toFixed(1), verts: worst.verts, fail });
  }
  return out;
}
export const ids = Object.keys(MODELS);
`;
}


function report(rows, errors) {
  const lines = [];
  let fails = 0;
  lines.push(['model'.padEnd(18), 'pose'.padEnd(16), 'joint depth px'.padStart(14), 'leg verts in'.padStart(13), '  result'].join(' '));
  for (const [id, list] of rows) {
    for (const r of list) {
      if (r.fail) fails++;
      lines.push([id.padEnd(18), r.pose.padEnd(16), String(r.depth).padStart(14), String(r.verts).padStart(13), '  ' + (r.fail ? 'FAIL: ' + r.fail : 'ok')].join(' '));
    }
  }
  if (errors.length) { lines.push(errors.join('\n')); fails++; }
  lines.push(fails ? `\n${fails} failing` : '\nall legs stay attached');
  const all = rows.flatMap(([, l]) => l), worst = Math.min(...all.map((r) => r.depth));
  return { ok: !fails, lines, rows, summary: { models: rows.length, poses: all.length, failing: fails, minDepth: worst }, text: `${rows.length} hounds x ${all.length / Math.max(1, rows.length)} poses, ${fails} failing, min joint depth ${worst} px` };
}

async function run({ browser, base, page = null }) {
  const own = page ? null : await openModulePage(browser, base);
  page = page ?? own.page;
  const w = watchErrors(page, (e) => String(e.message).slice(0, 300));
  const errs = () => (own ? own.errors : w.errors);
  try {
    const err = await loadModule(page, base, 'houndlegs', moduleSource());
    if (err && !errs().length) errs().push(err);
    if (errs().length) return { ok: false, lines: [errs().join('\n')], rows: [], summary: { pageErrors: errs().length }, text: `page errors: ${errs()[0]}` };
    await reseed(page);
    const rows = await page.evaluate(() => import('./__houndlegs.js').then((m) => m.ids.map((id) => [id, m.check(id)])));
    return report(rows, [...errs()]);
  } finally { w.stop(); if (own) await own.page.close(); }
}

module.exports = { run, moduleSource, report };
if (require.main === module) cli(run);

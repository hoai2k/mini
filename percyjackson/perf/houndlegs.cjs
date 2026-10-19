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
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { findChrome } = require('./lib.cjs');

const PORT = +(process.env.PERF_PORT || 8765);
const ROOT = path.resolve(__dirname, '../..');
const GAME = `http://127.0.0.1:${PORT}/percyjackson/game/`;
const MARGIN = 2, MIN_VERTS = 8;

function page() {
  const wb = fs.readFileSync(path.join(ROOT, 'percyjackson/game/workbench/models.html'), 'utf8');
  const map = wb.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
  return `<!doctype html><html><head><meta charset="utf-8">${map}</head><body><script type="module">
import * as THREE from 'three/webgpu';
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
window.check = (id) => {
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
};
window.ids = Object.keys(MODELS);
window.ready = true;
</script></body></html>`;
}

async function serve() {
  const up = async () => { try { return (await fetch(GAME)).ok; } catch { return false; } };
  if (await up()) return;
  spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', detached: true }).unref();
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250));
}

(async () => {
  await serve();
  const browser = await chromium.launch({ executablePath: findChrome(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await browser.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));
  const url = GAME + 'workbench/__houndlegs.html';
  await pg.route(url, (r) => r.fulfill({ contentType: 'text/html', body: page() }));
  await pg.goto(url);
  await pg.waitForFunction(() => window.ready || false, null, { timeout: 180000 }).catch(() => {});
  if (errors.length) { console.log(errors.join('\n')); await browser.close(); process.exit(1); }
  let fails = 0;
  console.log(['model'.padEnd(18), 'pose'.padEnd(16), 'joint depth px'.padStart(14), 'leg verts in'.padStart(13), '  result'].join(' '));
  for (const id of await pg.evaluate(() => window.ids)) {
    for (const r of await pg.evaluate((i) => window.check(i), id)) {
      if (r.fail) fails++;
      console.log([id.padEnd(18), r.pose.padEnd(16), String(r.depth).padStart(14), String(r.verts).padStart(13), '  ' + (r.fail ? 'FAIL: ' + r.fail : 'ok')].join(' '));
    }
  }
  if (errors.length) { console.log(errors.join('\n')); fails++; }
  await browser.close();
  console.log(fails ? `\n${fails} failing` : '\nall legs stay attached');
  process.exit(fails ? 1 : 0);
})();

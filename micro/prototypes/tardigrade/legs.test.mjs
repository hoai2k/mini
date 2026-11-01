// Leg reach: no leg of the tardigrade is ever drawn longer than 1.15× its
// rest length (hip to claw base), however it moves. Drives the real page
// (headless Chromium, software WebGL) through a leaf-to-leaf transfer, a
// climb onto the steep leaf, a gap bridged by the water film, round a leaf
// margin, a fall, a teleport and scrambles with turns, at 60 Hz, and checks
// every leg on every frame (creature.legFrames().raw, the length the gait
// asked for before the creature's own backstop clamp). Also checks that after
// a transfer every foot lets go of the old leaf and catches the new one.
//
//   node --test micro/prototypes/tardigrade/legs.test.mjs
//   SHOTS=/some/dir node --test ...   also saves a screenshot per scenario
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAP = 1.15;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };

// Scenarios: [name, leaf, side, u, v, plan]. plan: frames of { n, mag, dash, brace, turn (rad/s of the
// wanted heading), fall, teleport }. The stick is solved each frame so the walker is asked to go
// exactly along the wanted heading on its leaf (no drift from the camera's tilt).
const SCENARIOS = [
  ['the Sphagnum leaf onto leaf E (a leaf-to-leaf transfer)', 3, 1, 9.5, -1.1, [{ n: 240, mag: 1 }], { transfer: true }],
  ['leaf A across the film gap to leaf B', 0, 1, 10, 1.5, [{ n: 300, mag: 1 }], { transfer: true }],
  ['leaf B up onto the steep leaf C (a climb, then braced)', 1, 1, 8, -0.9, [{ n: 150, mag: 1 }, { n: 150, mag: 1, brace: true }], { transfer: true }],
  ['round the margin of leaf D onto its underside', 4, 1, 8.5, 0, [{ n: 280, mag: 1 }], { transfer: true }],
  ['scrambles with turns on leaf E', 5, 1, 4, 0, [{ n: 60, mag: 1, dash: true }, { n: 60, mag: 1, turn: 1.4 }, { n: 60, mag: 1, dash: true, turn: -1.2 }, { n: 60, mag: 0.3, turn: 2 }, { n: 60, mag: 1, dash: true }, { n: 40, mag: 0 }]],
  ['a scramble into the climb onto leaf C', 1, 1, 7, -0.9, [{ n: 10, mag: 1 }, { n: 60, mag: 1, dash: true }, { n: 120, mag: 1 }], { transfer: true }],
  ['knocked off (a fall) and a teleport', 1, 1, 6, 0, [{ n: 60, mag: 1 }, { n: 1, mag: 1, fall: true }, { n: 120, mag: 1 }, { n: 1, mag: 1, teleport: true }, { n: 90, mag: 1 }]],
];

async function serve() {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(root, p);
    try {
      if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error();
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server;
}

test('no tardigrade leg is drawn longer than 1.15x its rest length', { timeout: 600000 }, async () => {
  const server = await serve();
  const { chromium } = createRequire(join(root, 'check.mjs'))('playwright');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const tab = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = [];
    tab.on('pageerror', (e) => errors.push(String(e)));
    await tab.goto(`http://127.0.0.1:${server.address().port}/tardigrade/`, { waitUntil: 'load' });
    await tab.waitForFunction(() => window.__micro && window.__micro.walker, null, { timeout: 120000 });
    await tab.evaluate(() => {
      const M = window.__micro;
      M.paused = true;
      M.predator.on = false; M.predator.setVisible(false);
      M.boss.on = false; M.boss.group.visible = false;
    });
    for (const [name, leaf, side, u, v, plan, expect = {}] of SCENARIOS) {
      const r = await tab.evaluate(({ leaf, side, u, v, plan, render }) => {
        const M = window.__micro, w = M.walker, c = M.creature, life = M.life;
        M.place(0, leaf, u, v, side);
        w.stats = { letGo: 0, capped: 0, steps: 0 };
        life.energy = 1; life.desic = 0; life.tun = 0; life.feeding = null;
        const out = { worst: 0, worstAt: '', frames: 0, transfers: 0, faces: [], handoffDone: null, handoffs: [] };
        let want = [w.hu, w.hv], wantLeaf = w.leaf, t = 0, caught = new Set(), lastLeaf = w.leaf, lastSide = w.side, sinceTransfer = -1;
        const stick = (m) => {
          // the camera-relative stick that the walker reads as `want` on its leaf
          if (!m) return { x: 0, y: 0 };
          const L = w.leaf;
          if (wantLeaf !== L) { want = [w.hu, w.hv]; wantLeaf = L; }
          M.camera.updateMatrixWorld();
          const e = M.camera.matrixWorld.elements;
          const R = [e[0], e[1], e[2]], U = [e[4], e[5], e[6]];
          const dot = (a, b) => a[0] * b.x + a[1] * b.y + a[2] * b.z;
          const a11 = dot(R, L.U), a12 = -dot(U, L.U), a21 = dot(R, L.V), a22 = -dot(U, L.V);
          const det = a11 * a22 - a12 * a21;
          let x = (want[0] * a22 - a12 * want[1]) / det, y = (a11 * want[1] - a21 * want[0]) / det;
          const l = Math.hypot(x, y) || 1;
          return { x: (x / l) * m, y: (y / l) * m };
        };
        for (const step of plan) {
          for (let k = 0; k < step.n; k++) {
            const dt = 1 / 60;
            if (step.turn) { const a = step.turn * dt, cs = Math.cos(a), sn = Math.sin(a); want = [want[0] * cs - want[1] * sn, want[0] * sn + want[1] * cs]; }
            if (step.fall) w.fall();
            if (step.teleport) M.teleport('forward');
            const pressed = step.dash && !M.dash.active && M.dash.ready ? [0] : [];
            M.testStep(dt, stick(step.mag), { pressed, down: step.brace ? [1] : [] });
            if (render && (k % 30 === 0)) M.render(dt);
            t += dt;
            if (w.leaf !== lastLeaf || w.side !== lastSide) {
              out.transfers++; sinceTransfer = 0; out.handoffDone = null; out.handoffs.push({ frame: out.frames, done: null });
              out.faces.push(`${lastLeaf.name}${lastSide < 0 ? ' (under)' : ''} -> ${w.leaf.name}${w.side < 0 ? ' (under)' : ''}`);
              lastLeaf = w.leaf; lastSide = w.side;
            } else if (sinceTransfer >= 0) sinceTransfer += dt;
            // hand-off: after a transfer, every foot lets go of the old face and lands on the new one
            if (sinceTransfer === 0) caught = new Set();
            if (sinceTransfer >= 0 && out.handoffDone === null) {
              w.feet.forEach((f, i) => { if (f.state === 'stance' && f.leaf === w.leaf && f.side === w.side) caught.add(i); });
              if (caught.size === 8) out.handoffDone = out.handoffs[out.handoffs.length - 1].done = +sinceTransfer.toFixed(2);
            }
            c.legFrames().forEach((F, i) => {
              if (F.raw > out.worst) { out.worst = F.raw; out.worstAt = `frame ${out.frames}, leg ${i}, ${w.feet[i].state}`; }
            });
            out.frames++;
          }
        }
        out.worst = +out.worst.toFixed(3);
        out.speed = Math.round(w.speed * 100);
        out.end = `${w.leaf.name} side ${w.side} u ${w.u.toFixed(2)} v ${w.v.toFixed(2)} heading ${w.hu.toFixed(2)},${w.hv.toFixed(2)} film ${life.filmHere().toFixed(2)}`;
        out.stats = { ...w.stats };
        return out;
      }, { leaf, side, u, v, plan, render: !!process.env.SHOTS });
      if (process.env.SHOTS) {
        await tab.evaluate(() => window.__micro.render(1 / 60));
        await tab.screenshot({ path: join(process.env.SHOTS, `legs-${SCENARIOS.findIndex((s) => s[0] === name)}.png`) });
      }
      console.log(`${name}: longest leg ${r.worst}× rest (${r.worstAt}) over ${r.frames} frames; faces ${r.faces.join(', ') || 'none'}; every foot caught the new face after ${r.handoffs.map((h) => h.done ?? '-').join(', ') || '-'} s; steps ${r.stats.steps}, let go ${r.stats.letGo}; ends ${r.end}, ${r.speed} µm/s`);
      assert.ok(r.worst <= CAP, `${name}: a leg was drawn ${r.worst}× its rest length (${r.worstAt})`);
      if (expect.transfer) {
        assert.ok(r.transfers > 0, `${name}: no transfer happened`);
        // every transfer with time left after it: all eight feet let go of the old face and caught the new one
        for (const h of r.handoffs.filter((h) => r.frames - h.frame > 150)) assert.ok(h.done !== null && h.done < 2.5, `${name}: the feet did not all catch the new face (${h.done})`);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});

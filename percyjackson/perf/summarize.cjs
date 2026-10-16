// Builds results/summary.json + prints a markdown table from the run-*.json files.
const fs = require('fs'), path = require('path');
const dir = path.join(require('./lib.cjs').WORK, 'results');
const out = {};
for (const f of fs.readdirSync(dir).filter((f) => /^run-.*\.json$/.test(f))) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f)));
  out[f] = { quality: r.boot.quality, backend: r.boot.backend, viewport: r.viewport, bootMs: r.boot.msToInteractive, bootNetMB: r.boot.network.total.MB, scenes: r.scenes.filter((s) => !s.error).map((s) => ({
    scene: s.scene, loadMs: s.loadMs, firstFramesMs: s.firstFrames?.first30ms, cpuAvg: s.frameCpu.avg, cpuP95: s.frameCpu.p95, cpuP99: s.frameCpu.p99, cpuMax: s.frameCpu.max,
    renderMs: s.segmentsAvgMs.render, gameMs: +(s.frameCpu.avg - (s.segmentsAvgMs.render ?? 0)).toFixed(2), draws: s.renderer.avgDraws, drawsMax: s.renderer.draws, tris: s.renderer.tris,
    geos: s.renderer.geos, tex: s.renderer.tex, programs: s.renderer.programs, visibleMeshes: s.sceneGraph.visibleMeshes, enemies: s.sceneGraph.enemies, longtasks: s.longtasks.count, ltMax: s.longtasks.max,
    heapMB: s.heapMB, allocMBs: s.allocMBperSec, musicMB: s.network.byCategory.music?.MB ?? 0 })), leak: r.leak?.filter((l) => l.label.startsWith('hub')) };
}
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(out, null, 1));
for (const [f, r] of Object.entries(out)) {
  console.log(`\n### ${f} (${r.backend}, ${r.quality}, ${r.viewport})  boot→interactive ${r.bootMs} ms, ${r.bootNetMB} MB`);
  console.log('| scene | load ms (sync) | first 30 frames ms | CPU/frame avg / p95 / p99 / max ms | of which render ms | draws avg/max | tris | geos (renderer) | vis meshes | enemies | long tasks (max ms) | heap MB | alloc MB/s |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of r.scenes) console.log(`| ${s.scene} | ${s.loadMs} | ${s.firstFramesMs} | ${s.cpuAvg} / ${s.cpuP95} / ${s.cpuP99} / ${s.cpuMax} | ${s.renderMs} | ${s.draws}/${s.drawsMax} | ${s.tris} | ${s.geos} | ${s.visibleMeshes} | ${s.enemies} | ${s.longtasks} (${s.ltMax}) | ${s.heapMB} | ${s.allocMBs} |`);
}

// Procedural stand-ins for the requested images (MP-T01..T04), swapped for
// the delivered files automatically once shared/asset-list.js marks them
// delivered. The leaf cells (T01, T02) are drawn in the leaf shader itself,
// so their stand-in is "no texture"; the particle atlas (T04) and the
// out-of-focus backdrop (T03) are painted on canvases here.
import * as THREE from '../shared/vendor/three.module.min.js';
import { loadTexture } from '../shared/assets.js';

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** 4×4 atlas: bacteria rods, cocci, detritus flecks, a few small algae. */
export function particleAtlasStandIn() {
  const N = 256, T = N / 4;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const r = rand(7);
  for (let i = 0; i < 16; i++) {
    const x0 = (i % 4) * T + T / 2, y0 = Math.floor(i / 4) * T + T / 2;
    g.save();
    g.translate(x0, y0);
    g.rotate(r() * Math.PI);
    if (i < 6) { // rods
      g.fillStyle = `rgba(${150 + r() * 40},${140 + r() * 30},${110},0.9)`;
      const L = T * (0.2 + r() * 0.25), W = T * 0.08;
      g.beginPath(); g.roundRect(-L / 2, -W / 2, L, W, W / 2); g.fill();
    } else if (i < 10) { // cocci clusters
      g.fillStyle = 'rgba(170,160,130,0.9)';
      for (let k = 0; k < 2 + (i % 3); k++) { g.beginPath(); g.arc((r() - 0.5) * T * 0.2, (r() - 0.5) * T * 0.2, T * 0.06, 0, 7); g.fill(); }
    } else if (i < 14) { // detritus flecks
      g.fillStyle = `rgba(${110 + r() * 40},${80 + r() * 30},${50},0.85)`;
      g.beginPath();
      for (let k = 0; k < 9; k++) { const a = (k / 9) * 6.283, rr = T * (0.12 + r() * 0.15); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.fill();
    } else { // tiny green algal cell
      g.fillStyle = 'rgba(80,150,60,0.9)';
      g.beginPath(); g.arc(0, 0, T * 0.14, 0, 7); g.fill();
    }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Soft, deeply defocused moss blades and menisci: low-frequency grey. */
export function backdropStandIn() {
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, N, N);
  const r = rand(21);
  g.filter = 'blur(18px)';
  for (let i = 0; i < 14; i++) {
    const v = 110 + r() * 40;
    g.fillStyle = `rgba(${v},${v},${v * 0.98},0.35)`;
    g.save();
    g.translate(r() * N, r() * N);
    g.rotate(r() * Math.PI);
    g.beginPath(); g.ellipse(0, 0, 40 + r() * 120, 12 + r() * 30, 0, 0, 7); g.fill();
    g.restore();
  }
  g.filter = 'none';
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/**
 * Wire the four requests: returns uniforms that start with the stand-ins and
 * switch when the real files arrive.
 */
export function wireAssets(world) {
  const atlas = { value: particleAtlasStandIn() };
  const backdrop = { value: backdropStandIn() };
  const has = { backdrop: { value: 0 } };
  loadTexture('MP-T04', { repeat: false, srgb: false }).then((t) => { if (t) atlas.value = t; });
  loadTexture('MP-T03', { srgb: false }).then((t) => { if (t) { backdrop.value = t; has.backdrop.value = 1; } });
  loadTexture('MP-T01', { srgb: false }).then((t) => {
    if (!t) return;
    for (const l of world.leaves) if (l.kind === 'lamina') { l.uniforms.uTex.value = t; l.uniforms.uHasTex.value = 1; }
  });
  loadTexture('MP-T02', { srgb: false }).then((t) => {
    if (!t) return;
    for (const l of world.leaves) if (l.kind === 'sphagnum') { l.uniforms.uTex.value = t; l.uniforms.uHasTex.value = 1; }
  });
  return { atlas, backdrop, has };
}

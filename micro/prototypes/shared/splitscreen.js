// LEGO-style dynamic split screen for 1-4 local players.
//
// Together, everyone shares one view. As players separate the screen splits
// along lines perpendicular to the directions between them (a Voronoi diagram
// of where they stand on screen); each player's view slides so they stay near
// the centre of mass of their own region, and the split lines turn smoothly
// as players circle one another. When they come back together the views'
// camera offsets shrink to zero exactly as the regions would show the same
// picture, the divider fades out with the offset, and the views merge with no
// visible seam. Players standing close together share a view inside a split
// (three walking together while the fourth wanders off: two regions).
//
// How it works, per frame:
//   1. Project each player with the shared camera (the world's own camera,
//      framing the group: aim it at split.centroid()). s_i = screen offset from
//      the centre in CSS px.
//   2. Sites q_i = s_i, scaled down as a whole so every site stays on screen;
//      regions = the power diagram (a weighted Voronoi diagram) of the sites
//      clipped to the screen. With 3-4 players the weights grow any region
//      smaller than about 1/2N of the screen, smoothly, so no one gets a sliver.
//   3. Each player should appear at d_i: where they already are while they
//      are near the middle (|s_i| up to the distance of their region's centroid
//      along s_i), otherwise held at that distance and eased onto the region's
//      centroid. The view's shift is s_i - d_i (px); players within ~20% of the
//      short side of each other blend shifts, so a close group shares a view.
//   4. Players whose shifts agree within 1.5 px share one view (one render).
//      All in one view with no shift: `merged`, and the world renders straight
//      to the screen exactly as it did without split screen.
//   5. Each view's shift becomes a camera offset in world units: the camera
//      slides parallel to its image plane, scaled at the depth of that view's
//      players (perspective) or by the zoom (orthographic). Orbit, chase and
//      top-down cameras all work: the camera keeps its orientation and lens.
//
// Use (three.js world):
//   import { createSplitScreen } from '../shared/splitscreen.js';
//   const split = createSplitScreen(renderer, { renderScale: 1 });
//   ... each frame, after moving the players and placing the shared camera:
//   split.update(players.map((p) => ({ slot: p.slot, position: p.mesh.position })), { camera }, dt);
//   split.render(camera, (view, target) => {
//     renderer.setRenderTarget(target);   // null on the fast path: the screen
//     renderer.render(scene, camera);     // the camera is already offset for this view
//   });
//   // split.render calls compose() for you when the screen is split.
//
// A pipeline that always ends on the screen (its last pass draws to the
// canvas) can be used unchanged: createSplitScreen(renderer, { capture: true })
// passes target null every time and copies the screen into the view's
// texture after each view (renderer.copyFramebufferToTexture, full resolution).
//
// A 2D world with no three.js camera (a microscope field drawn around a
// centre): split.update(players, { center: { x, y }, pxPerUnit, yUp: true });
// then view.offset is { x, y } in world units: draw view i around
// center + offset, into split.target(i), then split.compose().
//
// Performance: N views cost N renders of the world (plus a cheap compose).
// While merged there is one view and it renders straight to the screen, with
// no extra pass at all (the fast path); one player is always the fast path.
// `renderScale` (0.4-1, also settable live as split.renderScale) sizes each
// view's render target relative to the screen: 0.7 roughly halves the pixel
// cost of a split frame. A world with heavy post-processing should also drop
// its own internal resolution while split.views.length > 1.
//
// API
//   createSplitScreen(renderer, { renderScale = 1, capture = false,
//     divider = { color: '#c9a35a', width: 1.25, shadow: 'rgba(16,12,6,0.45)' },
//     mergeBlend = 0.2, minArea }) -> split
//   split.update(players, shared, dt = 1/60) -> layout
//     players: [{ slot, position: {x,y,z} }]  (1-4)
//     shared:  { camera }  or  { center: {x,y}, pxPerUnit, yUp = true }
//   split.layout -> { merged, width, height, views, regions, edges }
//     views[i]:   { index, slots, shift: {x,y} px, offset: Vector3 | {x,y} }
//     regions[k]: { slot, view, polygon: [[x,y],...], centroid: [x,y], anchor: [x,y] }
//                 CSS px from the top-left; anchor = where the player is drawn
//     edges[k]:   { a: [x,y], b: [x,y], alpha }  the dividers
//   split.views / split.regions / split.merged   shortcuts
//   split.render(camera, drawView)   drawView(view, target): render the view
//   split.withView(i, camera, fn)    offset the camera for view i, run fn, put it back
//   split.target(i)                  WebGLRenderTarget for view i (screen x renderScale)
//   split.compose()                  draw the regions and dividers to the screen
//   split.project(i, position)       -> { x, y, behind } in CSS px, as view i shows it
//   split.centroid(positions)        -> { x, y, z } for aiming the shared camera
//   split.spread(positions)          -> largest distance from the centroid
//   split.renderScale                 quality knob (read/write)
//   split.dispose()
import * as THREE from './vendor/three.module.min.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Clip a convex polygon by the half-plane nx*x + ny*y <= c (Sutherland-Hodgman). */
function clip(poly, nx, ny, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

function areaCentroid(poly) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
    const k = x0 * y1 - x1 * y0;
    A += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k;
  }
  A /= 2;
  if (Math.abs(A) < 1e-6) {
    const n = Math.max(1, poly.length);
    return { area: 0, c: [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n] };
  }
  return { area: Math.abs(A), c: [cx / (6 * A), cy / (6 * A)] };
}

const VERT = /* glsl */`
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG_LINEAR = /* glsl */`
  uniform sampler2D tex; uniform vec2 res;
  void main() {
    gl_FragColor = texture2D(tex, gl_FragCoord.xy / res);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const FRAG_RAW = /* glsl */`
  uniform sampler2D tex; uniform vec2 res;
  void main() { gl_FragColor = texture2D(tex, gl_FragCoord.xy / res); }`;
const LINE_VERT = /* glsl */`
  attribute vec4 rgba; varying vec4 vC;
  void main() { vC = rgba; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const LINE_FRAG = /* glsl */`
  varying vec4 vC; void main() { gl_FragColor = vC; }`;

function cssColor(c, fallbackAlpha = 1) {
  const col = new THREE.Color();
  let a = fallbackAlpha;
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) {
    const p = m[1].split(',').map((s) => parseFloat(s));
    col.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    if (p.length > 3) a = p[3];
  } else col.set(c);
  // The line shader writes straight to the screen with no colour conversion.
  return [col.r, col.g, col.b, a].map((v, i) => (i < 3 ? Math.pow(v, 1 / 2.2) : v));
}

export function createSplitScreen(renderer, opts = {}) {
  const {
    capture = false,
    divider = {},
    mergeBlend = 0.2,
  } = opts;
  let renderScale = opts.renderScale ?? 1;
  const minAreaOpt = opts.minArea;
  const dividerColor = cssColor(divider.color || '#c9a35a', 0.9);
  const shadowColor = cssColor(divider.shadow || 'rgba(16,12,6,0.42)');
  const dividerWidth = divider.width ?? 1.25;

  const weights = [0, 0, 0, 0];
  const targets = [];
  const grabs = [];
  const tmp = new THREE.Vector3();
  const right = new THREE.Vector3(), up = new THREE.Vector3();
  let layout = { merged: true, width: 1, height: 1, views: [], regions: [], edges: [] };
  let mode = null; // { camera } | { center, pxPerUnit, yUp }
  let W = 1, H = 1;
  const bufSize = new THREE.Vector2();

  // Compose scene: one mesh per region (polygon fan) + one divider mesh.
  const scene = new THREE.Scene();
  const cam = new THREE.Camera();
  const regionMeshes = [];
  const lineGeo = new THREE.BufferGeometry();
  const lineMat = new THREE.ShaderMaterial({ vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const lineMesh = new THREE.Mesh(lineGeo, lineMat);
  lineMesh.frustumCulled = false;
  lineMesh.renderOrder = 10;
  scene.add(lineMesh);

  function regionMesh(k) {
    if (!regionMeshes[k]) {
      const mk = (frag) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: { tex: { value: null }, res: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(new THREE.BufferGeometry(), mk(FRAG_LINEAR));
      m.userData.mats = { linear: m.material, raw: mk(FRAG_RAW) };
      m.frustumCulled = false;
      scene.add(m);
      regionMeshes[k] = m;
    }
    return regionMeshes[k];
  }

  // ------------------------------------------------------------- projection
  function screenOf(p, offset = null) {
    if (mode.camera) {
      const c = mode.camera;
      tmp.set(p.x, p.y, p.z);
      if (offset) tmp.sub(offset);
      tmp.applyMatrix4(c.matrixWorldInverse);
      const e = c.projectionMatrix.elements;
      const ortho = !!c.isOrthographicCamera;
      const z = ortho ? 1 : -tmp.z;
      if (!ortho && z < 1e-4) {
        // Behind the camera: far out on screen, mirrored the way a projection
        // mirrors it (as Vector3.project does), flagged so callers flip it back.
        const dx = tmp.x || 1e-3, dy = -tmp.y;
        const m = Math.hypot(dx, dy) || 1;
        return { x: (-dx / m) * 1e5, y: (-dy / m) * 1e5, z: 1e-4, ppuX: 1, ppuY: 1, behind: true };
      }
      const nx = (e[0] * tmp.x + e[8] * tmp.z + e[12]) / (ortho ? 1 : z);
      const ny = (e[5] * tmp.y + e[9] * tmp.z + e[13]) / (ortho ? 1 : z);
      return { x: nx * W / 2, y: -ny * H / 2, z, ppuX: (e[0] / z) * W / 2, ppuY: (e[5] / z) * H / 2, behind: false };
    }
    const { center, pxPerUnit, yUp = true } = mode;
    const ox = offset ? offset.x : 0, oy = offset ? offset.y : 0;
    return { x: (p.x - center.x - ox) * pxPerUnit, y: (yUp ? -1 : 1) * (p.y - center.y - oy) * pxPerUnit, z: 1, ppuX: pxPerUnit, ppuY: pxPerUnit, behind: false };
  }

  function sizes() {
    const s = renderer.getSize(new THREE.Vector2());
    W = Math.max(1, s.x); H = Math.max(1, s.y);
    renderer.getDrawingBufferSize(bufSize);
  }

  // ----------------------------------------------------------------- update
  function update(players, shared, dt = 1 / 60) {
    mode = shared;
    sizes();
    const n = Math.min(4, players.length);
    const S = [];
    for (let i = 0; i < n; i++) {
      const s = screenOf(players[i].position);
      if (s.behind) { s.x = -s.x; s.y = -s.y; } // un-mirror: the direction is what matters
      const l = Math.hypot(s.x, s.y), cap = 4 * Math.max(W, H);
      if (l > cap) { s.x *= cap / l; s.y *= cap / l; }
      S.push(s);
    }
    const views = [];
    const regions = [];
    const edges = [];
    const full = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
    const toAbs = (p) => [p[0] + W / 2, p[1] + H / 2];

    if (n <= 1) {
      views.push({ index: 0, slots: n ? [players[0].slot ?? 0] : [], shift: { x: 0, y: 0 }, offset: zeroOffset() });
      if (n) regions.push({ slot: players[0].slot ?? 0, view: 0, polygon: full.map(toAbs), centroid: [W / 2, H / 2], anchor: toAbs([S[0].x, S[0].y]) });
      layout = { merged: true, width: W, height: H, views, regions, edges, players: players.slice(0, n) };
      return layout;
    }

    // 2. Sites: the projected positions, scaled as a whole to stay on screen.
    let k = 1;
    for (const s of S) {
      if (Math.abs(s.x) > 1e-6) k = Math.min(k, (0.42 * W) / Math.abs(s.x));
      if (Math.abs(s.y) > 1e-6) k = Math.min(k, (0.42 * H) / Math.abs(s.y));
    }
    const q = S.map((s, i) => [s.x * k, s.y * k + i * 1e-3]);
    // Separate coincident sites a hair, so their bisector exists.
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (Math.hypot(q[i][0] - q[j][0], q[i][1] - q[j][1]) < 1e-3) { q[j][0] += 1e-2 * (j - i); q[j][1] += 7e-3; }
    }
    const minArea = minAreaOpt ?? 0.5 / n;
    const wMax = (0.3 * Math.min(W, H)) ** 2;
    const cells = [];
    for (let i = 0; i < n; i++) {
      let poly = full;
      for (let j = 0; j < n && poly.length; j++) {
        if (j === i) continue;
        // |x-qi|^2 - wi <= |x-qj|^2 - wj  <=>  2x.(qj-qi) <= |qj|^2 - |qi|^2 - wj + wi
        const nx = 2 * (q[j][0] - q[i][0]), ny = 2 * (q[j][1] - q[i][1]);
        const c = (q[j][0] ** 2 + q[j][1] ** 2) - (q[i][0] ** 2 + q[i][1] ** 2) - (n > 2 ? weights[j] - weights[i] : 0);
        poly = clip(poly, nx, ny, c);
      }
      cells.push(poly);
    }
    const geo = cells.map(areaCentroid);
    if (n > 2) {
      for (let i = 0; i < n; i++) {
        const frac = geo[i].area / (W * H);
        if (frac < minArea) weights[i] += (minArea - frac) * W * H * 6 * dt;
        else weights[i] -= weights[i] * Math.min(1, 1.5 * dt);
        weights[i] = Math.max(-wMax, Math.min(wMax, weights[i]));
      }
    } else weights.fill(0);

    // 3. Where each player should appear, and the raw shift of their view.
    const raw = [];
    const disp = [];
    for (let i = 0; i < n; i++) {
      const s = S[i];
      const g = geo[i].c;
      const len = Math.hypot(s.x, s.y);
      const gl = Math.hypot(g[0], g[1]);
      const ux = len > 1e-6 ? s.x / len : 0, uy = len > 1e-6 ? s.y / len : 0;
      const rho = Math.max(24, ux * g[0] + uy * g[1], 0.3 * gl);
      let d;
      if (len <= rho) d = [s.x, s.y];
      else {
        const t = smooth(1, 2.2, len / rho);
        d = [ux * rho + (g[0] - ux * rho) * t, uy * rho + (g[1] - uy * rho) * t];
      }
      raw.push([s.x - d[0], s.y - d[1]]);
    }
    // Players close together blend their shifts, so a group shares a view.
    const m = Math.min(W, H);
    const shift = [];
    for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0, sw = 0;
      for (let j = 0; j < n; j++) {
        const dd = Math.hypot(S[i].x - S[j].x, S[i].y - S[j].y);
        const w = j === i ? 1 : 1 - smooth(mergeBlend * 0.6 * m, mergeBlend * m, dd);
        sx += raw[j][0] * w; sy += raw[j][1] * w; sw += w;
      }
      shift.push([sx / sw, sy / sw]);
    }
    for (let i = 0; i < n; i++) disp.push([S[i].x - shift[i][0], S[i].y - shift[i][1]]);

    // 4. Group players whose shifts agree into views.
    const viewOf = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (viewOf[i] >= 0) continue;
      const members = [i];
      viewOf[i] = views.length;
      for (let j = i + 1; j < n; j++) {
        if (viewOf[j] < 0 && Math.hypot(shift[i][0] - shift[j][0], shift[i][1] - shift[j][1]) < 1.5) { viewOf[j] = views.length; members.push(j); }
      }
      let sx = 0, sy = 0, zs = 0, px = 0, py = 0;
      for (const j of members) { sx += shift[j][0]; sy += shift[j][1]; zs += S[j].z; px += S[j].ppuX; py += S[j].ppuY; }
      const c = members.length;
      sx /= c; sy /= c;
      if (Math.hypot(sx, sy) < 0.75) { sx = 0; sy = 0; }
      views.push({ index: views.length, slots: members.map((j) => players[j].slot ?? j), members, shift: { x: sx, y: sy }, offset: offsetFor(sx, sy, px / c, py / c) });
    }
    for (let i = 0; i < n; i++) {
      regions.push({ slot: players[i].slot ?? i, view: viewOf[i], polygon: cells[i].map(toAbs), centroid: toAbs(geo[i].c), anchor: toAbs(disp[i]), area: geo[i].area });
    }

    // Dividers: the shared edge of two regions in different views.
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (viewOf[i] === viewOf[j]) continue;
      const nx = 2 * (q[j][0] - q[i][0]), ny = 2 * (q[j][1] - q[i][1]);
      const c = (q[j][0] ** 2 + q[j][1] ** 2) - (q[i][0] ** 2 + q[i][1] ** 2) - (n > 2 ? weights[j] - weights[i] : 0);
      const nl = Math.hypot(nx, ny) || 1;
      const on = cells[i].filter((p) => Math.abs(nx * p[0] + ny * p[1] - c) / nl < 0.5);
      if (on.length < 2) continue;
      // The two extreme points along the edge.
      const tx = -ny / nl, ty = nx / nl;
      let a = on[0], b = on[0];
      for (const p of on) { if (p[0] * tx + p[1] * ty < a[0] * tx + a[1] * ty) a = p; if (p[0] * tx + p[1] * ty > b[0] * tx + b[1] * ty) b = p; }
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1) continue;
      const vi = views[viewOf[i]].shift, vj = views[viewOf[j]].shift;
      const alpha = smooth(1, 36, Math.hypot(vi.x - vj.x, vi.y - vj.y));
      if (alpha > 0.01) edges.push({ a: toAbs(a), b: toAbs(b), alpha });
    }
    const merged = views.length === 1 && views[0].shift.x === 0 && views[0].shift.y === 0;
    layout = { merged, width: W, height: H, views, regions, edges, players: players.slice(0, n) };
    return layout;
  }

  function zeroOffset() { return mode && mode.camera ? new THREE.Vector3() : { x: 0, y: 0 }; }

  function offsetFor(sx, sy, ppuX, ppuY) {
    if (mode.camera) {
      const c = mode.camera;
      right.setFromMatrixColumn(c.matrixWorld, 0).normalize();
      up.setFromMatrixColumn(c.matrixWorld, 1).normalize();
      return new THREE.Vector3().addScaledVector(right, sx / ppuX).addScaledVector(up, -sy / ppuY);
    }
    return { x: sx / ppuX, y: ((mode.yUp ?? true) ? -1 : 1) * sy / ppuY };
  }

  // ---------------------------------------------------------------- targets
  function target(i) {
    sizes();
    const w = Math.max(1, Math.round(bufSize.x * renderScale)), h = Math.max(1, Math.round(bufSize.y * renderScale));
    let t = targets[i];
    if (!t) {
      t = targets[i] = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, samples: 0 });
      t.texture.colorSpace = THREE.SRGBColorSpace;
      t.texture.minFilter = THREE.LinearFilter;
      t.texture.generateMipmaps = false;
    } else if (t.width !== w || t.height !== h) t.setSize(w, h);
    return t;
  }

  function grab(i) {
    sizes();
    let g = grabs[i];
    if (!g || g.image.width !== bufSize.x || g.image.height !== bufSize.y) {
      if (g) g.dispose();
      g = grabs[i] = new THREE.FramebufferTexture(bufSize.x, bufSize.y);
      g.minFilter = THREE.LinearFilter;
    }
    renderer.setRenderTarget(null);
    renderer.copyFramebufferToTexture(g);
    return g;
  }

  function withView(i, camera, fn) {
    const v = layout.views[i];
    const off = v && v.offset && v.offset.isVector3 ? v.offset : null;
    if (off && camera) { camera.position.add(off); camera.updateMatrixWorld(); }
    try { return fn(); } finally {
      if (off && camera) { camera.position.sub(off); camera.updateMatrixWorld(); }
    }
  }

  const sources = [];
  function compose() {
    sizes();
    const toNdc = (p) => [(p[0] / W) * 2 - 1, 1 - (p[1] / H) * 2];
    let used = 0;
    for (const r of layout.regions) {
      const src = sources[r.view];
      if (!src) continue;
      const mesh = regionMesh(used++);
      const pts = r.polygon.map(toNdc);
      const pos = [];
      for (let t = 1; t < pts.length - 1; t++) pos.push(pts[0][0], pts[0][1], 0, pts[t][0], pts[t][1], 0, pts[t + 1][0], pts[t + 1][1], 0);
      mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      mesh.material = src.raw ? mesh.userData.mats.raw : mesh.userData.mats.linear;
      mesh.material.uniforms.tex.value = src.texture;
      mesh.material.uniforms.res.value.set(bufSize.x, bufSize.y);
      mesh.visible = true;
    }
    for (let k = used; k < regionMeshes.length; k++) regionMeshes[k].visible = false;
    // Dividers: a dark shadow under a brass hairline.
    const pos = [], col = [];
    const quad = (a, b, wPx, rgba) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nx = (-dy / l) * wPx / 2, ny = (dx / l) * wPx / 2;
      const P = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]].map(toNdc);
      for (const ix of [0, 1, 2, 0, 2, 3]) { pos.push(P[ix][0], P[ix][1], 0); col.push(...rgba); }
    };
    for (const e of layout.edges) {
      quad(e.a, e.b, dividerWidth + 2.5, [shadowColor[0], shadowColor[1], shadowColor[2], shadowColor[3] * e.alpha]);
      quad(e.a, e.b, dividerWidth, [dividerColor[0], dividerColor[1], dividerColor[2], dividerColor[3] * e.alpha]);
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    lineGeo.setAttribute('rgba', new THREE.Float32BufferAttribute(col, 4));
    lineMesh.visible = pos.length > 0;
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(null);
    renderer.render(scene, cam);
    renderer.autoClear = ac;
  }

  function render(camera, drawView) {
    const L = layout;
    if (L.views.length <= 1) {
      // Fast path: straight to the screen (offset applied if the one view has one).
      withView(0, camera, () => drawView(L.views[0] || { index: 0, slots: [], shift: { x: 0, y: 0 }, offset: zeroOffset() }, null));
      return;
    }
    sources.length = 0;
    for (const v of L.views) {
      if (capture) {
        withView(v.index, camera, () => drawView(v, null));
        sources[v.index] = { texture: grab(v.index), raw: true };
      } else {
        const t = target(v.index);
        withView(v.index, camera, () => drawView(v, t));
        sources[v.index] = { texture: t.texture, raw: false };
      }
    }
    compose();
  }

  const api = {
    update,
    render,
    withView,
    target,
    /** Copy the screen into view i's texture (for pipelines that draw to the screen). */
    capture(i) { sources[i] = { texture: grab(i), raw: true }; },
    /** Draw the regions (from target(i) or capture(i)) and the dividers. */
    compose() {
      for (const v of layout.views) if (!sources[v.index] && targets[v.index]) sources[v.index] = { texture: targets[v.index].texture, raw: false };
      compose();
      sources.length = 0;
    },
    get layout() { return layout; },
    get views() { return layout.views; },
    get regions() { return layout.regions; },
    get merged() { return layout.merged; },
    get renderScale() { return renderScale; },
    set renderScale(v) { renderScale = Math.max(0.25, Math.min(1, v)); },
    /** Screen position (CSS px from the top-left) of a world point as view i shows it. */
    project(i, p) {
      if (!mode) return { x: 0, y: 0, behind: false };
      const v = layout.views[i];
      const s = screenOf(p, v ? v.offset : null);
      return { x: s.x + W / 2, y: s.y + H / 2, behind: s.behind };
    },
    centroid(ps) {
      const c = { x: 0, y: 0, z: 0 };
      for (const p of ps) { c.x += p.x; c.y += p.y || 0; c.z += p.z || 0; }
      const k = ps.length || 1;
      c.x /= k; c.y /= k; c.z /= k;
      return c;
    },
    spread(ps) {
      const c = api.centroid(ps);
      let r = 0;
      for (const p of ps) r = Math.max(r, Math.hypot(p.x - c.x, (p.y || 0) - c.y, (p.z || 0) - c.z));
      return r;
    },
    dispose() {
      for (const t of targets) if (t) t.dispose();
      for (const g of grabs) if (g) g.dispose();
      for (const m of regionMeshes) { m.geometry.dispose(); m.userData.mats.linear.dispose(); m.userData.mats.raw.dispose(); }
      lineGeo.dispose(); lineMat.dispose();
    },
  };
  return api;
}

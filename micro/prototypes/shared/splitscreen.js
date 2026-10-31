// LEGO-style dynamic split screen for 1-4 local players.
//
// Together, everyone shares one view. As players separate the screen splits
// along lines perpendicular to the directions between them as they appear on
// screen, so the tilt of a divider always shows where the other player is:
// each player's region faces the others. The split lines turn smoothly as
// players circle one another (P2 walks off to the right: a vertical divider;
// P2 circles round above P1: it turns through 45° to horizontal), and when the
// players come back together, from any side, each view's camera offset
// shrinks to zero exactly as its divider fades, so the last split frame and
// the first merged frame are the same picture. Players standing close
// together share a view inside a split (three walking together while the
// fourth wanders off: two regions).
//
// How it works, per frame:
//   1. Project each player with the shared camera (the world's own camera,
//      framing the group: aim it at split.centroid()). s_i = screen offset from
//      the centre in CSS px. A player near or behind the camera plane is slid
//      along the ground towards the camera's aim point until it is safely in
//      front, projected, and pushed back out radially: the direction stays the
//      ground-plane direction and never mirrors.
//   2. Sites. Two players: q = -/+ R (cos a, sin a), where a is the on-screen
//      direction from the lower slot to the higher one, unwrapped (it never
//      jumps 180°), followed along the shortest arc and rate-limited; the
//      divider is the line through the centre perpendicular to it. Three or
//      four: q_i = s_i scaled to stay on screen, eased and speed-limited.
//      Regions = the power diagram (a weighted Voronoi diagram) of the sites
//      clipped to the screen; with 3-4 players the weights grow any region
//      smaller than about 1/2N of the screen, smoothly, so no one gets a sliver.
//   3. Each player should appear at d_i: where they already are while they
//      are near the middle (|s_i| up to rho_i, the distance of their region's
//      centroid along s_i), otherwise held at that distance and eased onto the
//      region's centroid. The raw shift is s_i - d_i (px): exactly zero while
//      every player is inside their rho. Players within ~20% of the short side
//      of each other blend shifts, so a close group shares a view.
//   4. Merged or split, with hysteresis on E = max |s_i| / rho_i: the screen
//      splits when E passes `splitAt` (1.12) and merges again only at E <= 1,
//      where every raw shift is already zero. On splitting, the shifts ease in
//      from zero over `splitIn` seconds (no jump); dividers fade with the
//      difference between the views' shifts. So a merge is continuous: the
//      offsets reach zero and the dividers vanish on the same frame.
//   5. Players whose shifts agree (within 1 px, apart again beyond 2 px) share
//      one view (one render). While merged there is one view with no shift and
//      the world renders straight to the screen exactly as without split screen.
//   6. Each view's shift becomes a camera offset in world units. By default
//      the camera slides along the ground plane (opts.up, +y) by exactly the
//      amount that puts its players at their displayed points (a ray-plane
//      intersection), so every view keeps the shared camera's height, angle
//      and lens over its own player, as the LEGO games do. With opts.up null
//      (or a ray grazing the ground, blended in smoothly) it slides parallel
//      to its image plane instead, scaled at the players' depth (perspective)
//      or by the zoom (orthographic): right for chase cameras and
//      free-swimming 3D worlds.
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
//     divider = { color: '#c9a35a', width: 1.75, shadow: 'rgba(16,12,6,0.5)', soft: 5 },
//     mergeBlend = 0.2, minArea, up = [0, 1, 0] | null,
//     splitAt = 1.12, splitIn = 0.35, turnRate = 3 (rad/s) }) -> split
//   split.update(players, shared, dt = 1/60) -> layout
//     players: [{ slot, position: {x,y,z} }]  (1-4)
//     shared:  { camera }  or  { center: {x,y}, pxPerUnit, yUp = true }
//   split.layout -> { merged, width, height, views, regions, edges, players,
//                     amount (0-1 split ease-in), spread (E), angle (2 players:
//                     on-screen direction from the lower slot to the higher,
//                     radians, unwrapped) }
//     views[i]:   { index, slots, shift: {x,y} px, offset: Vector3 | {x,y} }
//     regions[k]: { slot, view, polygon: [[x,y],...], centroid: [x,y], anchor: [x,y] }
//                 CSS px from the top-left; anchor = where the player is drawn
//     edges[k]:   { a: [x,y], b: [x,y], alpha, slots: [s, t], angle }  the dividers
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
const wrapPi = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

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
    splitAt = 1.12,
    splitIn = 0.35,
    turnRate = 3,
  } = opts;
  // Camera offsets slide along the ground plane (normal `up`) by default, so
  // each view keeps the shared camera's height and angle over its player (as
  // in the LEGO games); null slides in the image plane instead (chase cams,
  // free-floating 3D swimmers).
  const groundUp = opts.up === null ? null : new THREE.Vector3(...(opts.up || [0, 1, 0])).normalize();
  let renderScale = opts.renderScale ?? 1;
  const minAreaOpt = opts.minArea;
  const dividerColor = cssColor(divider.color || '#c9a35a', 0.95);
  const shadowColor = cssColor(divider.shadow || 'rgba(16,12,6,0.5)');
  const dividerWidth = divider.width ?? 1.75;
  const shadowSoft = divider.soft ?? 5;

  const targets = [];
  const grabs = [];
  const tmp = new THREE.Vector3();
  const right = new THREE.Vector3(), up = new THREE.Vector3();
  let layout = { merged: true, width: 1, height: 1, views: [], regions: [], edges: [], amount: 0, spread: 0, angle: 0 };
  let mode = null; // { camera } | { center, pxPerUnit, yUp }
  let W = 1, H = 1;
  const bufSize = new THREE.Vector2();

  // State carried between frames, keyed by slot so it survives reordering.
  const st = {
    split: false,     // the hysteresis state
    amount: 0,        // 0-1 ease-in of the shifts after a split starts
    angle: null,      // 2 players: unwrapped on-screen direction lower slot -> higher slot
    sites: new Map(), // 3-4 players: slot -> smoothed site [x, y]
    weights: new Map(), // slot -> power-diagram weight
    together: new Set(), // 'a:b' slot pairs sharing a view
    key: '',          // the roster the state belongs to
  };

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
  /** Perspective projection of a camera-space point in front of the camera: CSS px from the centre. */
  function perspPx(e, x, y, zc) {
    const z = -zc;
    return [((e[0] * x + e[8] * zc + e[12]) / z) * W / 2, -((e[5] * y + e[9] * zc + e[13]) / z) * H / 2];
  }

  /** The exact projection (as view `offset` shows p), as three.js would; behind the camera it is mirrored and flagged. */
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

  // For the layout: like screenOf, but a player near or behind the camera
  // plane is slid towards the camera's aim point (along the ground when there
  // is one) until it sits at a safe depth, projected there, and pushed back
  // out radially by the same factor. It is exact in front of that depth,
  // continuous through it, and keeps the ground-plane direction behind the
  // camera instead of a mirrored or arbitrary one.
  const axO = new THREE.Vector3(), axD = new THREE.Vector3(), axPlane = new THREE.Plane(), axRay = new THREE.Ray(), axHit = new THREE.Vector3();
  function layoutScreenOf(p, refDepth) {
    const s = screenOf(p);
    if (s.behind) { s.x = -s.x; s.y = -s.y; } // un-mirror: the direction is what matters
    if (!mode.camera || mode.camera.isOrthographicCamera) return s;
    const c = mode.camera;
    // The aim point's depth: where the camera's axis meets the ground through p, else refDepth.
    let zRef = refDepth;
    if (groundUp) {
      c.getWorldPosition(axO);
      c.getWorldDirection(axD);
      axRay.set(axO, axD);
      axPlane.setFromNormalAndCoplanarPoint(groundUp, axHit.set(p.x, p.y, p.z));
      if (axRay.intersectPlane(axPlane, axHit)) zRef = axHit.distanceTo(axO);
    }
    const zMin = Math.max(1.5 * c.near, 0.2 * zRef);
    tmp.set(p.x, p.y, p.z).applyMatrix4(c.matrixWorldInverse);
    const z = -tmp.z;
    if (z >= zMin || zRef <= zMin * 1.05) return s;
    const t = (zRef - zMin) / (zRef - z); // F + (p - F) t sits at depth zMin; F = (0, 0, -zRef)
    const e = c.projectionMatrix.elements;
    const [fx, fy] = perspPx(e, 0, 0, -zRef);
    const [px, py] = perspPx(e, tmp.x * t, tmp.y * t, -zRef + (tmp.z + zRef) * t);
    return { x: fx + (px - fx) / t, y: fy + (py - fy) / t, z: zMin, ppuX: (e[0] / zMin) * W / 2, ppuY: (e[5] / zMin) * H / 2, behind: z < 1e-4 };
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
    dt = Math.max(0, Math.min(0.1, dt || 0));
    const n = Math.min(4, players.length);
    players = players.slice(0, n);
    const slotOf = (i) => players[i].slot ?? i;
    const key = players.map((p, i) => slotOf(i)).join(',');
    if (key !== st.key) {
      // A player joined or left: keep merged/split, start the sites afresh.
      st.key = key; st.sites.clear(); st.angle = null;
      for (const k of [...st.weights.keys()]) if (!players.some((p, i) => slotOf(i) === k)) st.weights.delete(k);
    }

    // 1. Screen positions in the shared view.
    let refDepth = 0, nIn = 0;
    if (mode.camera && !mode.camera.isOrthographicCamera) {
      for (const p of players) { const s = screenOf(p.position); if (!s.behind && s.z > mode.camera.near) { refDepth += s.z; nIn++; } }
      refDepth = nIn ? refDepth / nIn : Math.max(10 * mode.camera.near, 1);
    }
    const S = [];
    const cap = 4 * Math.max(W, H);
    for (let i = 0; i < n; i++) {
      const s = layoutScreenOf(players[i].position, refDepth);
      const l = Math.hypot(s.x, s.y);
      if (l > cap) { s.x *= cap / l; s.y *= cap / l; }
      S.push(s);
    }
    const views = [];
    const regions = [];
    const edges = [];
    const full = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
    const toAbs = (p) => [p[0] + W / 2, p[1] + H / 2];

    if (n <= 1) {
      st.split = false; st.amount = 0; st.angle = null; st.together.clear();
      views.push({ index: 0, slots: n ? [slotOf(0)] : [], members: n ? [0] : [], shift: { x: 0, y: 0 }, offset: zeroOffset() });
      if (n) regions.push({ slot: slotOf(0), view: 0, polygon: full.map(toAbs), centroid: [W / 2, H / 2], anchor: toAbs([S[0].x, S[0].y]), area: W * H });
      layout = { merged: true, width: W, height: H, views, regions, edges, players, amount: 0, spread: 0, angle: 0 };
      return layout;
    }

    // 2. Sites.
    const q = [];
    if (n === 2) {
      // The divider is perpendicular to the on-screen direction a, lower slot -> higher slot.
      const [ia, ib] = slotOf(0) <= slotOf(1) ? [0, 1] : [1, 0];
      const vx = S[ib].x - S[ia].x, vy = S[ib].y - S[ia].y;
      if (st.angle === null) st.angle = Math.hypot(vx, vy) > 1e-3 ? Math.atan2(vy, vx) : 0;
      else if (Math.hypot(vx, vy) > 1e-3) {
        const d = wrapPi(Math.atan2(vy, vx) - st.angle); // shortest arc
        if (!st.split) st.angle += d; // merged: follow at once, so a re-split starts from the current direction
        else {
          const step = d * (1 - Math.exp(-dt / 0.06));
          const lim = turnRate * dt;
          st.angle += Math.max(-lim, Math.min(lim, step));
        }
      }
      const R = 0.25 * Math.min(W, H), ux = Math.cos(st.angle), uy = Math.sin(st.angle);
      q[ia] = [-R * ux, -R * uy];
      q[ib] = [R * ux, R * uy];
    } else {
      let k = 1;
      for (const s of S) {
        if (Math.abs(s.x) > 1e-6) k = Math.min(k, (0.42 * W) / Math.abs(s.x));
        if (Math.abs(s.y) > 1e-6) k = Math.min(k, (0.42 * H) / Math.abs(s.y));
      }
      const a = 1 - Math.exp(-dt / 0.06), vmax = 2 * Math.max(W, H) * dt;
      for (let i = 0; i < n; i++) {
        const want = [S[i].x * k, S[i].y * k + i * 1e-3];
        const prev = st.sites.get(slotOf(i));
        let site = want;
        if (prev && st.split) {
          let dx = (want[0] - prev[0]) * a, dy = (want[1] - prev[1]) * a;
          const l = Math.hypot(dx, dy);
          if (l > vmax) { dx *= vmax / l; dy *= vmax / l; }
          site = [prev[0] + dx, prev[1] + dy];
        }
        st.sites.set(slotOf(i), site);
        q.push([site[0], site[1]]);
      }
      // Separate coincident sites a hair, so their bisector exists.
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        if (Math.hypot(q[i][0] - q[j][0], q[i][1] - q[j][1]) < 1e-3) { q[j][0] += 1e-2 * (j - i); q[j][1] += 7e-3; }
      }
    }
    const wt = (i) => (n > 2 ? st.weights.get(slotOf(i)) || 0 : 0);
    const bisector = (i, j) => [2 * (q[j][0] - q[i][0]), 2 * (q[j][1] - q[i][1]),
      // |x-qi|^2 - wi <= |x-qj|^2 - wj  <=>  2x.(qj-qi) <= |qj|^2 - |qi|^2 - wj + wi
      (q[j][0] ** 2 + q[j][1] ** 2) - (q[i][0] ** 2 + q[i][1] ** 2) - (wt(j) - wt(i))];
    const cells = [];
    for (let i = 0; i < n; i++) {
      let poly = full;
      for (let j = 0; j < n && poly.length; j++) {
        if (j === i) continue;
        const [nx, ny, c] = bisector(i, j);
        poly = clip(poly, nx, ny, c);
      }
      cells.push(poly);
    }
    const geo = cells.map(areaCentroid);
    if (n > 2) {
      // Minimum area, clamped smoothly: a small region's weight grows until it has its share.
      const minArea = minAreaOpt ?? 0.5 / n;
      const wMax = (0.3 * Math.min(W, H)) ** 2;
      for (let i = 0; i < n; i++) {
        const frac = geo[i].area / (W * H);
        let w = st.weights.get(slotOf(i)) || 0;
        const deficit = smooth(0, 1, (minArea - frac) / minArea) * minArea;
        if (deficit > 0) w += deficit * W * H * 6 * dt;
        else w -= w * Math.min(1, 1.5 * dt);
        st.weights.set(slotOf(i), Math.max(-wMax, Math.min(wMax, w)));
      }
    }

    // 3. Where each player should appear, and the raw shift of their view.
    const raw = [];
    let E = 0;
    for (let i = 0; i < n; i++) {
      const s = S[i];
      const g = geo[i].c;
      const len = Math.hypot(s.x, s.y);
      const gl = Math.hypot(g[0], g[1]);
      const ux = len > 1e-6 ? s.x / len : 0, uy = len > 1e-6 ? s.y / len : 0;
      const rho = Math.max(24, ux * g[0] + uy * g[1], 0.3 * gl);
      E = Math.max(E, len / rho);
      let d;
      if (len <= rho) d = [s.x, s.y];
      else {
        const t = smooth(1, 2.2, len / rho);
        d = [ux * rho + (g[0] - ux * rho) * t, uy * rho + (g[1] - uy * rho) * t];
      }
      raw.push([s.x - d[0], s.y - d[1]]);
    }

    // 4. Merged or split, with hysteresis; the shifts ease in after a split.
    if (!st.split && E > splitAt) { st.split = true; st.amount = 0; }
    else if (st.split && E <= 1) { st.split = false; st.amount = 0; }
    if (st.split) st.amount = Math.min(1, st.amount + (splitIn > 0 ? dt / splitIn : 1));
    const amt = st.split ? smooth(0, 1, st.amount) : 0;

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
      shift.push([(sx / sw) * amt, (sy / sw) * amt]);
    }
    const disp = S.map((s, i) => [s.x - shift[i][0], s.y - shift[i][1]]);

    // 5. Group players whose shifts agree into views (with hysteresis per pair).
    const pairKey = (i, j) => `${Math.min(slotOf(i), slotOf(j))}:${Math.max(slotOf(i), slotOf(j))}`;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dd = Math.hypot(shift[i][0] - shift[j][0], shift[i][1] - shift[j][1]);
      if (!st.split || dd < 1) st.together.add(pairKey(i, j));
      else if (dd > 2) st.together.delete(pairKey(i, j));
    }
    const viewOf = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (viewOf[i] >= 0) continue;
      const members = [i];
      viewOf[i] = views.length;
      for (let h = 0; h < members.length; h++) {
        for (let j = 0; j < n; j++) if (viewOf[j] < 0 && st.together.has(pairKey(members[h], j))) { viewOf[j] = views.length; members.push(j); }
      }
      members.sort((a, b) => a - b);
      let sx = 0, sy = 0;
      for (const j of members) { sx += shift[j][0]; sy += shift[j][1]; }
      const c = members.length;
      sx /= c; sy /= c;
      // A soft dead zone: sub-pixel shifts fade to exactly zero without a step.
      const sl = Math.hypot(sx, sy), keep = smooth(0.15, 0.6, sl);
      sx *= keep; sy *= keep;
      const offset = st.split && (sx !== 0 || sy !== 0) ? viewOffset(players, S, members, sx, sy) : zeroOffset();
      views.push({ index: views.length, slots: members.map((j) => slotOf(j)), members, shift: { x: sx, y: sy }, offset });
    }
    for (let i = 0; i < n; i++) {
      regions.push({ slot: slotOf(i), view: viewOf[i], polygon: cells[i].map(toAbs), centroid: toAbs(geo[i].c), anchor: toAbs(disp[i]), area: geo[i].area });
    }

    // Dividers: the shared edge of two regions in different views, fading
    // with the difference between the views (zero when they show the same).
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (viewOf[i] === viewOf[j]) continue;
      const [nx, ny, c] = bisector(i, j);
      const nl = Math.hypot(nx, ny) || 1;
      const on = cells[i].filter((p) => Math.abs(nx * p[0] + ny * p[1] - c) / nl < 0.5);
      if (on.length < 2) continue;
      // The two extreme points along the edge.
      const tx = -ny / nl, ty = nx / nl;
      let a = on[0], b = on[0];
      for (const p of on) { if (p[0] * tx + p[1] * ty < a[0] * tx + a[1] * ty) a = p; if (p[0] * tx + p[1] * ty > b[0] * tx + b[1] * ty) b = p; }
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1) continue;
      const vi = views[viewOf[i]].shift, vj = views[viewOf[j]].shift;
      const alpha = Math.min(amt, smooth(0, 64, Math.hypot(vi.x - vj.x, vi.y - vj.y)));
      if (alpha > 0.004) edges.push({ a: toAbs(a), b: toAbs(b), alpha, slots: [slotOf(i), slotOf(j)], angle: Math.atan2(ty, tx) });
    }
    const merged = !st.split;
    layout = { merged, width: W, height: H, views, regions, edges, players, amount: amt, spread: E, angle: n === 2 ? st.angle : null };
    return layout;
  }

  function zeroOffset() { return mode && mode.camera ? new THREE.Vector3() : { x: 0, y: 0 }; }

  /** The camera offset of a view showing `members` shifted by (sx, sy) px. */
  function viewOffset(players, S, members, sx, sy) {
    let px = 0, py = 0;
    for (const j of members) { px += S[j].ppuX; py += S[j].ppuY; }
    const c = members.length;
    const plane = offsetFor(sx, sy, px / c, py / c);
    if (!mode.camera || !groundUp) return plane;
    // Each member: the ground move that puts them at their displayed point,
    // blended into the image-plane move where its ray grazes the ground.
    const out = new THREE.Vector3();
    for (const j of members) {
      const g = groundOffset(players[j].position, S[j].x - sx, S[j].y - sy);
      out.add(g ? g.o.lerp(plane, 1 - g.w) : plane);
    }
    return out.multiplyScalar(1 / c);
  }

  // The camera translation T, along the ground, that shows world point P at
  // screen point (dx, dy) (px from the centre): the shared camera sees P - T
  // there, so P - T is where the ray through (dx, dy) meets P's ground plane.
  // w: how much to trust it (it fades out as the ray grazes the ground).
  const ray = new THREE.Ray(), o3 = new THREE.Vector3(), d3 = new THREE.Vector3(), plane = new THREE.Plane();
  function groundOffset(P, dx, dy) {
    const c = mode.camera;
    const nx = dx / (W / 2), ny = -dy / (H / 2);
    o3.set(nx, ny, -1).unproject(c);
    d3.set(nx, ny, 1).unproject(c).sub(o3).normalize();
    const w = smooth(0.06, 0.18, Math.abs(d3.dot(groundUp)));
    if (w <= 0) return null;
    ray.set(o3, d3);
    plane.setFromNormalAndCoplanarPoint(groundUp, tmp.set(P.x, P.y, P.z));
    const X = ray.intersectPlane(plane, new THREE.Vector3());
    if (!X) return null;
    return { o: new THREE.Vector3(P.x, P.y, P.z).sub(X), w };
  }

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
      if (!src || r.polygon.length < 3) continue;
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
    // Dividers: a soft dark shadow under an antialiased brass hairline. Each
    // is a strip across the line, its alpha given at offsets (CSS px) from it.
    const pos = [], col = [];
    const strip = (a, b, profile, rgb, alpha) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      for (let k = 0; k < profile.length - 1; k++) {
        const [o0, a0] = profile[k], [o1, a1] = profile[k + 1];
        const P = [[a[0] + nx * o0, a[1] + ny * o0], [b[0] + nx * o0, b[1] + ny * o0], [b[0] + nx * o1, b[1] + ny * o1], [a[0] + nx * o1, a[1] + ny * o1]].map(toNdc);
        const A = [a0, a0, a1, a1];
        for (const ix of [0, 1, 2, 0, 2, 3]) { pos.push(P[ix][0], P[ix][1], 0); col.push(rgb[0], rgb[1], rgb[2], A[ix] * alpha); }
      }
    };
    const hw = dividerWidth / 2, f = 0.6, sh = shadowSoft;
    const shadowProfile = [[-sh, 0], [-hw, 1], [hw, 1], [sh, 0]];
    const lineProfile = [[-hw - f, 0], [-hw + f * 0.5, 1], [hw - f * 0.5, 1], [hw + f, 0]];
    for (const e of layout.edges) strip(e.a, e.b, shadowProfile, shadowColor, shadowColor[3] * e.alpha);
    for (const e of layout.edges) strip(e.a, e.b, lineProfile, dividerColor, dividerColor[3] * e.alpha);
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

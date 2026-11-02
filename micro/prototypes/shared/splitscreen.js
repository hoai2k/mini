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
//      every player is inside their rho. Each player's shift becomes their own
//      camera offset (step 6); players within ~12% of the short side of each
//      other share one offset (blending out to ~26%, closed over chains), so a
//      close group shares a view, and its views are already identical when
//      they join.
//   4. Merged or split, with hysteresis on E = max |s_i| / rho_i: the screen
//      splits when E passes `splitAt` (1.12), and the group would not fit
//      around its own on-screen centre either (or a player is leaving the
//      screen), so a player joining beside a teammate before the world's
//      camera has re-centred starts merged; it merges again only at E <= 1,
//      where every raw shift is already zero. On splitting, the shifts ease in
//      from zero over `splitIn` seconds (no jump); dividers fade with the
//      difference between the views' shifts. So a merge is continuous: the
//      offsets reach zero and the dividers vanish on the same frame.
//   5. Players whose offsets agree (within 0.3 px, apart beyond 0.8 px) share
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
// Each split view only needs its own region, so every view carries `rect`, the
// bounding box of its regions (drawing-buffer px, bottom-left origin, padded
// by `margin`), and the split scissors to it: split.render() scissors the
// view's target (or, with `capture`, the screen) before drawView, and
// split.target(i) comes back already scissored. A world with passes of its
// own (G-buffers, blurs at other sizes) calls split.scissor(view, rt) on each
// of them (scaled to that target's size; null = the screen); with 4 players
// that cuts the fill to about 35-45%. Merged, nothing is scissored. Render
// targets are pooled by size (no reallocation on split/merge or when the
// scale toggles), the compose geometry is preallocated, and the compose
// shaders are compiled when the split screen is created (in the background
// where the driver can), so the first split costs no shader compile.
// While merged there is one view and it renders straight to the screen, with
// no extra pass at all (the fast path); one player is always the fast path.
// `renderScale` (0.4-1, also settable live as split.renderScale) sizes each
// view's render target relative to the screen: 0.7 roughly halves the pixel
// cost of a split frame. A world with heavy post-processing should also drop
// its own internal resolution while split.views.length > 1.
//
// API
//   createSplitScreen(renderer, { renderScale = 1, capture = false,
//     scissor = true, margin = 24 (drawing-buffer px), captureScale = false,
//     divider = { color: '#c9a35a', width: 1.75, shadow: 'rgba(16,12,6,0.5)', soft: 5 },
//     mergeBlend = 0.2, minArea, up = [0, 1, 0] | null,
//     splitAt = 1.12, splitIn = 0.5, turnRate = 3 (rad/s) }) -> split
//   split.update(players, shared, dt = 1/60) -> layout
//     players: [{ slot, position: {x,y,z} }]  (1-4)
//     shared:  { camera }  or  { center: {x,y}, pxPerUnit, yUp = true }
//   split.layout -> { merged, width, height, views, regions, edges, players,
//                     amount (0-1 split ease-in), spread (E), angle (2 players:
//                     on-screen direction from the lower slot to the higher,
//                     radians, unwrapped) }
//     views[i]:   { index, slots, shift: {x,y} px, offset: Vector3 | {x,y},
//                   rect: {x,y,w,h} drawing-buffer px from the bottom-left (padded by margin),
//                   box: {x,y,w,h} CSS px from the top-left (unpadded) }
//     regions[k]: { slot, view, polygon: [[x,y],...], centroid: [x,y], anchor: [x,y] }
//                 CSS px from the top-left; anchor = where the player is drawn
//     edges[k]:   { a: [x,y], b: [x,y], alpha, slots: [s, t], angle }  the dividers
//   split.views / split.regions / split.merged   shortcuts
//   split.render(camera, drawView)   drawView(view, target): render the view
//   split.withView(i, camera, fn)    offset the camera for view i, run fn, put it back
//   split.target(i)                  WebGLRenderTarget for view i (screen x renderScale), scissored to its rect
//   split.scissor(view|i, target|null, margin?)  scissor a pass of view i to its rect,
//                                    scaled to the target's size (null: the screen, in the
//                                    renderer's current viewport scale); off while merged.
//                                    Returns the rect used, or null when not scissored.
//   split.unscissor(target|null)     turn it off again (targets the world reuses unsplit)
//   split.rectFor(view|i, w, h, margin?)  the rect scaled to a w x h buffer
//   split.viewScale                  the shared per-view resolution factor for the view
//                                    count: 1, 0.7 (2 views), 0.55 (3-4); for worlds that
//                                    scale their own buffers (shared/quality.js includes it)
//   split.compose()                  draw the regions and dividers to the screen
//   split.prewarm()                  worlds that draw their own frames (not through
//                                    split.render) call it in a frame that draws to the
//                                    screen: the compose programs' first draw, unseen
//   split.project(i, position)       -> { x, y, behind } in CSS px, as view i shows it
//   split.centroid(positions)        -> { x, y, z } for aiming the shared camera
//   split.spread(positions)          -> largest distance from the centroid
//   split.renderScale                 quality knob (read/write); with captureScale the
//                                    capture path renders each view into the bottom-left
//                                    renderScale part of the screen (renderer viewport) and
//                                    copies only its rect, so a world drawing through
//                                    three's screen viewport gets cheaper views too
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
    gl_FragColor = texture2D(tex, gl_FragCoord.xy * res);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const FRAG_RAW = /* glsl */`
  uniform sampler2D tex; uniform vec2 res;
  void main() { gl_FragColor = texture2D(tex, gl_FragCoord.xy * res); }`;
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
    splitIn = 0.5,
    splitOut = 0.5,
    turnRate = 3,
    zoomMax = 1,
    comfort = 0.6,
    splitFit = 0.86,
    mergeAt = 0.75,
    mergeDwell = 0.8,
    zoomOutTime = 0.35,
    zoomInTime = 1,
    zoomBand = 0.1,
    scissor: autoScissor = true,
    margin = 24,
    captureScale = false,
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
    merging: false,   // split, easing the shifts back out to a merge
    dwell: 0,         // seconds the group has fitted the merge zoom while split
    amount: 0,        // 0-1 ease-in of the shifts after a split starts (and out before a merge)
    zoom: 1,          // the merged view's zoom-out factor (1 = the world's solo framing)
    zoomV: 0,         // its rate (critically damped)
    zoomTarget: 1,    // what it eases to (held inside the dead band)
    need: 1,          // the zoom the group needs to sit inside the comfortable margin
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
  // Preallocated compose geometry: region fans (a power-diagram cell clipped
  // to the screen has at most 7 corners; room for 24) and divider strips (6
  // dividers x 2 strips x 3 bands x 6 vertices = 216; room for 288).
  const REGION_V = 3 * 22, LINE_V = 288;
  const lineGeo = new THREE.BufferGeometry();
  const linePos = new THREE.BufferAttribute(new Float32Array(LINE_V * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const lineCol = new THREE.BufferAttribute(new Float32Array(LINE_V * 4), 4).setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute('position', linePos);
  lineGeo.setAttribute('rgba', lineCol);
  lineGeo.setDrawRange(0, 0);
  const lineMat = new THREE.ShaderMaterial({ vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const lineMesh = new THREE.Mesh(lineGeo, lineMat);
  lineMesh.frustumCulled = false;
  lineMesh.renderOrder = 10;
  scene.add(lineMesh);

  function regionMesh(k) {
    if (!regionMeshes[k]) {
      const mk = (frag) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: { tex: { value: null }, res: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(REGION_V * 3), 3).setUsage(THREE.DynamicDrawUsage));
      g.setDrawRange(0, 0);
      const m = new THREE.Mesh(g, mk(FRAG_LINEAR));
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
    return { x: fx + (px - fx) / t, y: fy + (py - fy) / t, z: zMin, ppuX: (e[0] / zMin) * W / 2, ppuY: (e[5] / zMin) * H / 2, behind: z < 1e-4, approx: true };
  }

  const cssSize = new THREE.Vector2();
  function sizes() {
    const s = renderer.getSize(cssSize);
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

    // The zoom the world applied to its camera this frame (it read split.zoom).
    const zApplied = Math.max(1, shared.zoom ?? st.zoom);
    const zMax = Math.max(1, zoomMax);
    if (n <= 1) {
      st.split = false; st.merging = false; st.dwell = 0; st.amount = 0; st.angle = null; st.together.clear();
      st.need = 1; st.zoomTarget = 1; easeZoom(1, dt);
      views.push({ index: 0, slots: n ? [slotOf(0)] : [], members: n ? [0] : [], shift: { x: 0, y: 0 }, offset: zeroOffset() });
      if (n) regions.push({ slot: slotOf(0), view: 0, polygon: full.map(toAbs), centroid: [W / 2, H / 2], anchor: toAbs([S[0].x, S[0].y]), area: W * H });
      layout = { merged: true, width: W, height: H, views, regions, edges, players, amount: 0, spread: 0, angle: 0, zoom: st.zoom, need: 1, fit: 0, merging: false };
      setRects(layout);
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

    // 3. How far out the group reaches (F: the largest |s_x| / (W/2) or
    // |s_y| / (H/2); Fc: the same about the group's own on-screen centre),
    // and the raw shift of each player's view: split, each player is shown at
    // their region's centroid.
    const raw = [];
    let E = 0, F = 0, Fc = 0, leaving = false;
    const mx = S.reduce((a, s) => a + s.x, 0) / n, my = S.reduce((a, s) => a + s.y, 0) / n;
    for (let i = 0; i < n; i++) {
      const s = S[i];
      const g = geo[i].c;
      const len = Math.hypot(s.x, s.y);
      const gl = Math.hypot(g[0], g[1]);
      const ux = len > 1e-6 ? s.x / len : 0, uy = len > 1e-6 ? s.y / len : 0;
      const rho = Math.max(24, ux * g[0] + uy * g[1], 0.3 * gl);
      E = Math.max(E, len / rho);
      F = Math.max(F, Math.abs(s.x) / (W / 2), Math.abs(s.y) / (H / 2));
      Fc = Math.max(Fc, Math.abs(s.x - mx) / (W / 2), Math.abs(s.y - my) / (H / 2));
      if (Math.abs(s.x) > 0.47 * W || Math.abs(s.y) > 0.47 * H) leaving = true;
      raw.push([s.x - g[0], s.y - g[1]]);
    }

    // 4. Zoom out first, split last. `need` is the zoom that puts the group
    // inside the comfortable margin (F = comfort): exact for a zoom that
    // scales the picture about its centre (a 2D field, a wider field of
    // view), close for a camera pulled back. Merged, the zoom follows it up at
    // once and back down only past a dead band. The screen splits only once
    // the zoom is at its maximum (or a player is leaving the screen) and the
    // group still reaches past splitFit, around the screen centre and its own
    // centre alike; it merges once the group has fitted mergeAt x the maximum
    // zoom for mergeDwell seconds, easing the shifts out (the views settle at
    // that zoom while split, so the merged picture needs no zoom change).
    const need = zApplied * F / comfort, needC = zApplied * Fc / comfort;
    const splitNeed = zMax * splitFit / comfort, mergeNeed = mergeAt * zMax, zSplit = Math.max(1, Math.min(zMax, mergeNeed));
    st.need = need;
    if (!st.split) {
      if (need > splitNeed && needC > splitNeed && (zApplied >= 0.97 * zMax || leaving)) { st.split = true; st.merging = false; st.dwell = 0; st.amount = 0; }
    } else {
      st.dwell = need <= mergeNeed ? st.dwell + dt : 0;
      if (!st.merging && st.dwell >= mergeDwell) st.merging = true;
      else if (st.merging && need > mergeNeed * 1.25) { st.merging = false; st.dwell = 0; }
    }
    if (st.split && st.merging) {
      st.amount = Math.max(0, st.amount - (splitOut > 0 ? dt / splitOut : 1));
      if (st.amount <= 0) { st.split = false; st.merging = false; st.dwell = 0; }
    } else if (st.split) st.amount = Math.min(1, st.amount + (splitIn > 0 ? dt / splitIn : 1));
    const amt = st.split ? smooth(0, 1, st.amount) : 0;
    const want = Math.max(1, Math.min(zMax, need));
    if (st.split && !st.merging) st.zoomTarget = zSplit;
    else if (want > st.zoomTarget || want < st.zoomTarget / (1 + zoomBand)) st.zoomTarget = want;
    easeZoom(st.zoomTarget, dt, st.split && !st.merging ? 1.2 : undefined);

    // Each player's own camera offset (world units) for their eased-in shift;
    // players close together blend offsets, so a group shares a view. Blending
    // the offsets rather than the pixel shifts means a group's views are
    // identical when they join (perspective makes one pixel shift a different
    // ground move at each player's depth).
    const own = [];
    for (let i = 0; i < n; i++) {
      let rx = raw[i][0] * amt, ry = raw[i][1] * amt;
      const keep = smooth(0.15, 0.6, Math.hypot(rx, ry)); // a soft dead zone: sub-pixel shifts fade to exactly zero
      rx *= keep; ry *= keep;
      own.push(rx || ry ? viewOffset(players, S, [i], rx, ry) : zeroOffset());
    }
    const m = Math.min(W, H);
    // Blend weights by on-screen closeness, closed over chains (the strongest
    // path's weakest link), so players who fully share a view blend alike
    // and stay together while a third approaches only one of them.
    const bw = [];
    for (let i = 0; i < n; i++) {
      bw.push([]);
      for (let j = 0; j < n; j++) bw[i][j] = i === j ? 1 : 1 - smooth(mergeBlend * 0.6 * m, mergeBlend * 1.3 * m, Math.hypot(S[i].x - S[j].x, S[i].y - S[j].y));
    }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) bw[i][j] = Math.max(bw[i][j], Math.min(bw[i][k], bw[k][j]));
    const off = [];
    for (let i = 0; i < n; i++) {
      const o = zeroOffset();
      let sw = 0;
      for (let j = 0; j < n; j++) if (bw[i][j] > 0) { oAdd(o, own[j], bw[i][j]); sw += bw[i][j]; }
      off.push(oScale(o, 1 / sw));
    }
    const ppu = (i) => Math.max(1e-6, (S[i].ppuX + S[i].ppuY) / 2);

    // 5. Group players whose offsets agree (within 0.3 px, apart beyond 0.8 px) into views.
    const pairKey = (i, j) => `${Math.min(slotOf(i), slotOf(j))}:${Math.max(slotOf(i), slotOf(j))}`;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dd = oDist(off[i], off[j]) * Math.max(ppu(i), ppu(j));
      if (!st.split || dd < 0.3) st.together.add(pairKey(i, j));
      else if (dd > 0.8) st.together.delete(pairKey(i, j));
    }
    const viewOf = new Array(n).fill(-1);
    const disp = [];
    for (let i = 0; i < n; i++) {
      if (viewOf[i] >= 0) continue;
      const members = [i];
      viewOf[i] = views.length;
      for (let h = 0; h < members.length; h++) {
        for (let j = 0; j < n; j++) if (viewOf[j] < 0 && st.together.has(pairKey(members[h], j))) { viewOf[j] = views.length; members.push(j); }
      }
      members.sort((a, b) => a - b);
      let offset = zeroOffset();
      if (st.split) { for (const j of members) oAdd(offset, off[j], 1); oScale(offset, 1 / members.length); }
      if (oDist(offset, zeroOffset()) * ppu(i) < 1e-3) offset = zeroOffset();
      // Where the view shows its players, and its shift in px (the mean of theirs).
      let sx = 0, sy = 0;
      for (const j of members) {
        const e = S[j].approx ? null : screenOf(players[j].position, offset);
        disp[j] = e && !e.behind ? [e.x, e.y] : [S[j].x - raw[j][0] * amt, S[j].y - raw[j][1] * amt];
        sx += S[j].x - disp[j][0]; sy += S[j].y - disp[j][1];
      }
      sx /= members.length; sy /= members.length;
      if (!st.split) { sx = 0; sy = 0; }
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
    layout = { merged, width: W, height: H, views, regions, edges, players, amount: amt, spread: E, angle: n === 2 ? st.angle : null,
      zoom: st.zoom, need, fit: F, merging: st.merging };
    setRects(layout);
    if (renderer.outputColorSpace !== warmCs || renderer.toneMapping !== warmTm) warm();
    return layout;
  }

  /** Ease the zoom toward z (critically damped: out quickly, in slowly, or over `time`). */
  function easeZoom(z, dt, time) {
    const T = time ?? (z > st.zoom ? zoomOutTime : zoomInTime);
    const w = 2 / Math.max(1e-3, T), x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const d = st.zoom - z, tmpV = (st.zoomV + w * d) * dt;
    st.zoomV = (st.zoomV - w * tmpV) * e;
    let out = z + (d + tmpV) * e;
    if ((z - st.zoom > 0) === (out > z)) { out = z; st.zoomV = 0; } // no overshoot
    st.zoom = Math.max(1, Math.min(Math.max(1, zoomMax), out));
  }

  // Each view's box (CSS px, top-left) and rect (drawing-buffer px, bottom-left, padded).
  function setRects(L) {
    for (const v of L.views) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      if (L.views.length <= 1) { x0 = 0; y0 = 0; x1 = W; y1 = H; }
      else for (const r of L.regions) {
        if (r.view !== v.index) continue;
        for (const p of r.polygon) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      }
      if (!(x1 > x0 && y1 > y0)) { x0 = y0 = 0; x1 = y1 = 0; }
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
      v.box = { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
      v.rect = rectFor(v, bufSize.x, bufSize.y, margin);
    }
  }

  /** View v's box as a rect in a w x h buffer (bottom-left origin), padded by m buffer px (scaled). */
  function rectFor(v, w, h, m = margin) {
    if (typeof v === 'number') v = layout.views[v];
    if (!v || !v.box || layout.views.length <= 1) return { x: 0, y: 0, w, h };
    const b = v.box, kx = w / W, ky = h / H;
    const pad = m * (w / Math.max(1, bufSize.x));
    const x0 = Math.max(0, Math.floor(b.x * kx - pad)), x1 = Math.min(w, Math.ceil((b.x + b.w) * kx + pad));
    const yt = Math.max(0, Math.floor(b.y * ky - pad)), yb = Math.min(h, Math.ceil((b.y + b.h) * ky + pad));
    return { x: x0, y: h - yb, w: Math.max(0, x1 - x0), h: Math.max(0, yb - yt) };
  }

  const scissorPrev = new THREE.Vector4(), vp4 = new THREE.Vector4();
  let scissorPrevTest = false, screenScissored = false;
  /** Scissor a pass of view v: a render target (scaled to its size) or the screen (null). */
  function scissor(v, t = null, m = margin) {
    if (typeof v === 'number') v = layout.views[v];
    const on = !!v && layout.views.length > 1;
    if (t) {
      if (!on) { t.scissorTest = false; return null; }
      const r = rectFor(v, t.width, t.height, m);
      t.scissor.set(r.x, r.y, r.w, r.h);
      t.scissorTest = true;
      return r;
    }
    if (!on) { unscissor(null); return null; }
    // The screen: three's scissor is in CSS px of the renderer's current viewport scale.
    renderer.getViewport(vp4);
    const sw = vp4.z / W || 1, sh = vp4.w / H || 1; // the part of the screen in use (captureScale)
    const r = rectFor(v, W * sw, H * sh, m);
    if (!screenScissored) { renderer.getScissor(scissorPrev); scissorPrevTest = renderer.getScissorTest(); screenScissored = true; }
    renderer.setScissor(r.x, r.y, r.w, r.h);
    renderer.setScissorTest(true);
    return r;
  }
  function unscissor(t = null) {
    if (t) { t.scissorTest = false; return; }
    if (!screenScissored) return;
    screenScissored = false;
    renderer.setScissor(scissorPrev);
    renderer.setScissorTest(scissorPrevTest);
  }

  // Compile the compose shaders at creation, not at the first split (that
  // was a 100-400 ms hitch in software GL the moment a second player joined).
  // Both output colour spaces are compiled: the renderer's own and linear (the
  // worlds that compose display-ready images set linear around compose()).
  // compileAsync lets a driver with KHR_parallel_shader_compile build them in
  // the background; without it the calls are only queued here, never waited
  // on. Once they are ready, the next split.render() (or split.prewarm(), for
  // worlds that draw their own frames) draws each of them once as a zero-area
  // triangle, which changes no pixel, because some drivers (ANGLE on Vulkan,
  // SwiftShader) only build the pipeline at a program's first draw. It has to
  // be a frame that draws to the screen anyway: a draw in a frame the world
  // skips would present a cleared canvas. update() warms again if the world
  // changes its output colour space or tone mapping later (a cache hit for
  // programs already built).
  let warmCs = null, warmTm = null, warmReady = false, warmDrawn = false, composed = false;
  function warmVariants(fn) {
    const m = regionMesh(0);
    const prev = renderer.getRenderTarget(), mat0 = m.material, cs0 = renderer.outputColorSpace;
    const spaces = warmCs === THREE.LinearSRGBColorSpace ? [warmCs] : [warmCs, THREE.LinearSRGBColorSpace];
    try {
      renderer.setRenderTarget(null);
      for (const cs of spaces) {
        renderer.outputColorSpace = cs;
        for (const mat of [m.userData.mats.linear, m.userData.mats.raw]) { m.material = mat; fn(); }
      }
    } catch (e) { /* only a warm-up */ } finally {
      renderer.outputColorSpace = cs0;
      m.material = mat0;
      renderer.setRenderTarget(prev);
    }
  }
  function warm() {
    warmCs = renderer.outputColorSpace; warmTm = renderer.toneMapping;
    warmReady = false; warmDrawn = false;
    const jobs = [];
    warmVariants(() => {
      if (renderer.compileAsync) jobs.push(renderer.compileAsync(scene, cam));
      else renderer.compile(scene, cam);
    });
    Promise.all(jobs).catch(() => {}).then(() => { warmReady = true; });
  }
  /** The zero-area draws, once the programs are ready (in a frame that draws to the screen). */
  function warmDraw() {
    if (!warmReady || warmDrawn) return;
    warmDrawn = true;
    if (composed) return; // the region and divider geometry is no longer all zeros
    const m = regionMesh(0), info = renderer.info.render;
    const keep = [info.frame, info.calls, info.triangles, info.points, info.lines];
    const ac = renderer.autoClear, vis = [m.visible, lineMesh.visible];
    renderer.autoClear = false;
    m.visible = lineMesh.visible = true;
    m.geometry.setDrawRange(0, 3); lineGeo.setDrawRange(0, 3);
    warmVariants(() => renderer.render(scene, cam));
    m.geometry.setDrawRange(0, 0); lineGeo.setDrawRange(0, 0);
    [m.visible, lineMesh.visible] = vis;
    renderer.autoClear = ac;
    [info.frame, info.calls, info.triangles, info.points, info.lines] = keep;
  }
  warm();

  function zeroOffset() { return mode && mode.camera ? new THREE.Vector3() : { x: 0, y: 0 }; }
  const oAdd = (a, b, k) => { if (a.isVector3) a.addScaledVector(b, k); else { a.x += b.x * k; a.y += b.y * k; } return a; };
  const oScale = (a, k) => { if (a.isVector3) a.multiplyScalar(k); else { a.x *= k; a.y *= k; } return a; };
  const oDist = (a, b) => (a.isVector3 ? a.distanceTo(b) : Math.hypot(a.x - b.x, a.y - b.y));

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
  // Targets are pooled by size: a split, a merge or a scale change hands back
  // a target of the right size from the pool instead of reallocating (up to
  // POOL idle targets are kept; the oldest beyond that is freed).
  const pool = [];
  const POOL = 6;
  function target(i) {
    sizes();
    const w = Math.max(1, Math.round(bufSize.x * renderScale)), h = Math.max(1, Math.round(bufSize.y * renderScale));
    let t = targets[i];
    if (!t || t.width !== w || t.height !== h) {
      if (t) { pool.push(t); targets[i] = null; }
      const k = pool.findIndex((p) => p.width === w && p.height === h);
      if (k >= 0) t = pool.splice(k, 1)[0];
      else {
        t = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, samples: 0 });
        t.texture.colorSpace = THREE.SRGBColorSpace;
        t.texture.minFilter = THREE.LinearFilter;
        t.texture.generateMipmaps = false;
      }
      targets[i] = t;
      while (pool.length > POOL) pool.shift().dispose();
    }
    if (autoScissor) scissor(layout.views[i], t);
    else t.scissorTest = false;
    return t;
  }

  // The screen copy of view i: only its rect (scaled by `k` with captureScale)
  // is copied into a full-size texture kept per view.
  const gl = renderer.getContext();
  function grab(i, k = 1) {
    sizes();
    let g = grabs[i];
    if (!g || g.image.width !== bufSize.x || g.image.height !== bufSize.y) {
      if (g) g.dispose();
      g = grabs[i] = new THREE.FramebufferTexture(bufSize.x, bufSize.y);
      g.minFilter = THREE.LinearFilter;
      g.userData.ready = false;
    }
    renderer.setRenderTarget(null);
    const v = layout.views[i];
    const r = v && layout.views.length > 1 ? rectFor(v, Math.round(bufSize.x * k), Math.round(bufSize.y * k), margin) : null;
    const handle = g.userData.ready ? renderer.properties.get(g).__webglTexture : null;
    if (r && handle && renderer.state && renderer.state.bindTexture) {
      if (r.w > 0 && r.h > 0) {
        renderer.state.bindTexture(gl.TEXTURE_2D, handle);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, r.x, r.y, r.x, r.y, r.w, r.h);
        renderer.state.unbindTexture();
      }
    } else {
      renderer.copyFramebufferToTexture(g);
      g.userData.ready = true;
    }
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
  const setSource = (i, texture, raw, k = 1) => {
    const s = sources[i] || (sources[i] = {});
    s.texture = texture; s.raw = raw; s.k = k;
  };
  const hasSource = (i) => !!(sources[i] && sources[i].texture);
  const clearSources = () => { for (const s of sources) if (s) s.texture = null; };
  // Divider profiles: offsets (CSS px) from the line and alpha there.
  const hw0 = dividerWidth / 2, f0 = 0.6;
  const shadowProfile = [[-shadowSoft, 0], [-hw0, 1], [hw0, 1], [shadowSoft, 0]];
  const lineProfile = [[-hw0 - f0, 0], [-hw0 + f0 * 0.5, 1], [hw0 - f0 * 0.5, 1], [hw0 + f0, 0]];
  const QUAD = [0, 1, 2, 0, 2, 3];
  const qx = [0, 0, 0, 0], qy = [0, 0, 0, 0], qa = [0, 0, 0, 0];
  function compose() {
    sizes();
    composed = true;
    unscissor(null);
    const sx = 2 / W, sy = 2 / H;
    let used = 0;
    for (const r of layout.regions) {
      const src = sources[r.view];
      if (!src || !src.texture || r.polygon.length < 3) continue;
      const mesh = regionMesh(used++);
      const attr = mesh.geometry.attributes.position, a = attr.array;
      const P = r.polygon;
      const tris = Math.min(P.length - 2, REGION_V / 3);
      // Uploaded only when a corner moved (a still split re-sent every fan each frame).
      let o = 0, moved = false;
      const put = (v) => { v = Math.fround(v); if (a[o] !== v) { a[o] = v; moved = true; } o++; };
      for (let t = 1; t <= tris; t++) {
        put(P[0][0] * sx - 1); put(1 - P[0][1] * sy); put(0);
        put(P[t][0] * sx - 1); put(1 - P[t][1] * sy); put(0);
        put(P[t + 1][0] * sx - 1); put(1 - P[t + 1][1] * sy); put(0);
      }
      if (moved) attr.needsUpdate = true;
      mesh.geometry.setDrawRange(0, tris * 3);
      mesh.material = src.raw ? mesh.userData.mats.raw : mesh.userData.mats.linear;
      mesh.material.uniforms.tex.value = src.texture;
      mesh.material.uniforms.res.value.set((src.k || 1) / bufSize.x, (src.k || 1) / bufSize.y);
      mesh.visible = true;
    }
    for (let k = used; k < regionMeshes.length; k++) regionMeshes[k].visible = false;
    // Dividers: a soft dark shadow under an antialiased brass hairline. Each
    // is a strip across the line, its alpha given at offsets (CSS px) from it.
    const pos = linePos.array, col = lineCol.array;
    let nv = 0, lineMoved = false;
    const setP = (i, v) => { v = Math.fround(v); if (pos[i] !== v) { pos[i] = v; lineMoved = true; } };
    const setC = (i, v) => { v = Math.fround(v); if (col[i] !== v) { col[i] = v; lineMoved = true; } };
    const strip = (a, b, profile, rgb, alpha) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      for (let k = 0; k < profile.length - 1; k++) {
        if (nv + 6 > LINE_V) return;
        const o0 = profile[k][0], a0 = profile[k][1], o1 = profile[k + 1][0], a1 = profile[k + 1][1];
        qx[0] = a[0] + nx * o0; qy[0] = a[1] + ny * o0; qx[1] = b[0] + nx * o0; qy[1] = b[1] + ny * o0;
        qx[2] = b[0] + nx * o1; qy[2] = b[1] + ny * o1; qx[3] = a[0] + nx * o1; qy[3] = a[1] + ny * o1;
        qa[0] = qa[1] = a0; qa[2] = qa[3] = a1;
        for (const ix of QUAD) {
          setP(nv * 3, qx[ix] * sx - 1); setP(nv * 3 + 1, 1 - qy[ix] * sy); setP(nv * 3 + 2, 0);
          setC(nv * 4, rgb[0]); setC(nv * 4 + 1, rgb[1]); setC(nv * 4 + 2, rgb[2]); setC(nv * 4 + 3, qa[ix] * alpha);
          nv++;
        }
      }
    };
    for (const e of layout.edges) strip(e.a, e.b, shadowProfile, shadowColor, shadowColor[3] * e.alpha);
    for (const e of layout.edges) strip(e.a, e.b, lineProfile, dividerColor, dividerColor[3] * e.alpha);
    if (nv && lineMoved) { linePos.needsUpdate = true; lineCol.needsUpdate = true; }
    lineGeo.setDrawRange(0, nv);
    lineMesh.visible = nv > 0;
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
      warmDraw();
      withView(0, camera, () => drawView(L.views[0] || { index: 0, slots: [], shift: { x: 0, y: 0 }, offset: zeroOffset() }, null));
      return;
    }
    clearSources();
    const k = capture && captureScale ? renderScale : 1;
    const vp = k < 1 ? renderer.getViewport(new THREE.Vector4()) : null;
    for (const v of L.views) {
      if (capture) {
        if (vp) renderer.setViewport(vp.x * k, vp.y * k, vp.z * k, vp.w * k);
        if (autoScissor) scissor(v, null);
        try { withView(v.index, camera, () => drawView(v, null)); } finally {
          unscissor(null);
          if (vp) renderer.setViewport(vp);
        }
        setSource(v.index, grab(v.index, k), true, k);
      } else {
        const t = target(v.index);
        withView(v.index, camera, () => drawView(v, t));
        setSource(v.index, t.texture, false);
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
    capture(i) { setSource(i, grab(i), true); },
    /** For worlds that draw their own frames (not through split.render): call in a frame that draws to the screen. */
    prewarm() { warmDraw(); },
    /** Draw the regions (from target(i) or capture(i)) and the dividers. */
    compose() {
      for (const v of layout.views) if (!hasSource(v.index) && targets[v.index]) setSource(v.index, targets[v.index].texture, false);
      compose();
      clearSources();
    },
    get layout() { return layout; },
    get views() { return layout.views; },
    get regions() { return layout.regions; },
    get merged() { return layout.merged; },
    /**
     * The merged view's zoom-out factor (1 = the world's solo framing, up to
     * zoomMax): read it before update() and widen the shared camera's framing
     * by it (2D: pxPerUnit / zoom; 3D: the camera pulled back zoom x along its
     * view, or tan(fov/2) x zoom), then pass it as shared.zoom.
     */
    get zoom() { return st.zoom; },
    get zoomMax() { return Math.max(1, zoomMax); },
    get renderScale() { return renderScale; },
    set renderScale(v) { renderScale = Math.max(0.25, Math.min(1, v)); },
    /** The shared per-view resolution factor for the current view count (1, 0.7, 0.55). */
    get viewScale() { const n = layout.views.length; return n >= 3 ? 0.55 : n === 2 ? 0.7 : 1; },
    scissor,
    unscissor,
    rectFor(v, w, h, m = margin) { return rectFor(v, w, h, m); },
    get margin() { return margin; },
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
      for (const t of pool) t.dispose();
      pool.length = 0;
      for (const g of grabs) if (g) g.dispose();
      for (const m of regionMeshes) { m.geometry.dispose(); m.userData.mats.linear.dispose(); m.userData.mats.raw.dispose(); }
      lineGeo.dispose(); lineMat.dispose();
    },
  };
  return api;
}

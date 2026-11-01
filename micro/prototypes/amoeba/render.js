// Draws the scene into the optical property buffers (see
// shared/techniques/amoeba-optics.js) and composes the microscope image.
//
// Passes per frame:
//   mask   — the membrane polygon (triangulated, 4× MSAA), full resolution;
//   focus  — the body (thickness dome from the CPU distance grid, ectoplasm,
//            hyaline caps, nucleus, contractile and food vacuoles), granules
//            (points), prey and the obstacles lying on the slide;
//   above  — things floating above the focal plane, half resolution, blurred;
//   compose — the optics.
// Local multiplayer: each player's amoeba is a cell layer (addCell): its own
// mask, body quad and granules. The masks of up to four cells go into one
// RGBA mask target, one channel each (one clear, one pass, one MSAA resolve
// per view), and each body reads its channel; cells outside a view are skipped.
// render({ target }) composes into a split-screen view's target instead of
// the screen; setScale(k) draws the buffers at k × the screen (split views).
import * as THREE from '../shared/vendor/three.module.min.js';
import { PropertyOptics, propertyMaterial } from '../shared/techniques/amoeba-optics.js';
import { N } from '../shared/techniques/amoeba-softbody.js';
import { QUAD_VS, FRAG_FS, BODY_FS, GRAN_VS, GRAN_FS, PREY_FS, SPIRO_FS, DIATOM_FS, FLAKE_FS, PHOTO_FS, TRAP_FS, LEAF_FS } from './shaders.js';
import { hyp } from './util.js';

const SUB = 3; // Catmull-Rom subdivisions per membrane segment for the mask
const CHANNELS = [new THREE.Vector4(1, 0, 0, 0), new THREE.Vector4(0, 1, 0, 0), new THREE.Vector4(0, 0, 1, 0), new THREE.Vector4(0, 0, 0, 1)];

/** Does the closed contour (Vector2s) cross itself? A grid hash over its segments. */
// The hash lives in reused typed arrays (counts, then the segments per cell in
// index order), so a check allocates nothing.
const CC = { start: new Int32Array(64), items: new Int32Array(256), fill: new Int32Array(64), box: new Int32Array(256) };
function contourCrosses(ct) {
  const n = ct.length;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { const v = ct[i]; if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y; }
  const cs = Math.max(12, Math.max(x1 - x0, y1 - y0) / 48);
  const W = Math.ceil((x1 - x0) / cs) + 1, H = Math.floor((y1 - y0) / cs) + 1;
  if (!(W > 0 && H > 0 && W * H < 1e6)) return false; // empty or not finite
  if (CC.start.length < W * H + 1) { CC.start = new Int32Array(W * H + 1); CC.fill = new Int32Array(W * H + 1); }
  if (CC.box.length < n * 4) CC.box = new Int32Array(n * 4);
  const start = CC.start, box = CC.box;
  start.fill(0, 0, W * H + 1);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = ct[i], b = ct[(i + 1) % n];
    const ca = Math.floor((Math.min(a.x, b.x) - x0) / cs), cb = Math.floor((Math.max(a.x, b.x) - x0) / cs);
    const ra = Math.floor((Math.min(a.y, b.y) - y0) / cs), rb = Math.floor((Math.max(a.y, b.y) - y0) / cs);
    box[i * 4] = ca; box[i * 4 + 1] = cb; box[i * 4 + 2] = ra; box[i * 4 + 3] = rb;
    for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) { start[r * W + c + 1]++; total++; }
  }
  for (let k = 0; k < W * H; k++) start[k + 1] += start[k];
  if (CC.items.length < total) CC.items = new Int32Array(total * 2);
  const items = CC.items, fill = CC.fill;
  fill.set(start.subarray(0, W * H));
  for (let i = 0; i < n; i++) {
    for (let r = box[i * 4 + 2]; r <= box[i * 4 + 3]; r++) for (let c = box[i * 4]; c <= box[i * 4 + 1]; c++) items[fill[r * W + c]++] = i;
  }
  const o = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  // Each segment against the earlier segments sharing a cell with it.
  for (let i = 0; i < n; i++) {
    const a = ct[i], b = ct[(i + 1) % n];
    for (let r = box[i * 4 + 2]; r <= box[i * 4 + 3]; r++) {
      for (let c = box[i * 4]; c <= box[i * 4 + 1]; c++) {
        const k = r * W + c;
        for (let q = start[k]; q < start[k + 1]; q++) {
          const j = items[q];
          if (j >= i) break;
          if (j === i - 1 || (i === n - 1 && j === 0)) continue;
          const p = ct[j], qq = ct[(j + 1) % n];
          const d1 = o(a, b, p), d2 = o(a, b, qq), d3 = o(p, qq, a), d4 = o(p, qq, b);
          if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
        }
      }
    }
  }
  return false;
}

/** One Catmull-Rom coordinate (module level, so the contour loop makes no closures). */
function catmull(p0, p1, p2, p3, t, t2, t3) {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export class View {
  constructor(renderer, { body, cyto, world, textures }) {
    this.renderer = renderer;
    this.body = body; this.cyto = cyto; this.world = world; this.tex = textures;
    this.optics = new PropertyOptics(renderer);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    this.camera.position.z = 5;
    this.focusScene = new THREE.Scene();
    this.aboveScene = new THREE.Scene();
    this.maskRT = new THREE.WebGLRenderTarget(4, 4, { samples: 4, depthBuffer: false });
    this.flags = { wrinkle: true, granules: true, caps: true };

    this.cells = [];
    this.scale = 1;
    const c0 = this.addCell(body, cyto);
    // The first cell's parts, under their old names.
    Object.assign(this, { maskScene: c0.maskScene, maskGeo: c0.maskGeo, maskPos: c0.maskPos, contour: c0.contour, sdfTex: c0.sdfTex, bodyMat: c0.bodyMat, bodyQuad: c0.bodyQuad, granPos: c0.granPos, granGeo: c0.granGeo, granMat: c0.granMat, points: c0.points });

    this.obMeshes = new Map();
    this.preyMeshes = new Map();
    this.photo = null;
    this.quadGeo = new THREE.PlaneGeometry(1, 1);
    this.view = [0, 0, 1, 1];
    this.px = 1;
  }

  /** A player's amoeba: its own mask, body quad and granules. Returns the layer. */
  addCell(body, cyto) {
    const c = { body, cyto, maskScene: new THREE.Scene(), scene: new THREE.Scene() };
    const nv = N * SUB;
    c.maskPos = new Float32Array(nv * 3);
    c.maskGeo = new THREE.BufferGeometry();
    c.maskGeo.setAttribute('position', new THREE.BufferAttribute(c.maskPos, 3));
    c.maskGeo.setIndex(new THREE.BufferAttribute(new Uint32Array((nv - 2) * 3), 1));
    c.contour = Array.from({ length: nv }, () => new THREE.Vector2());
    // The mask writes 1 into this cell's channel of the shared mask target (see render()).
    c.maskMat = new THREE.ShaderMaterial({
      uniforms: { uChan: { value: new THREE.Vector4(1, 0, 0, 0) } },
      vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec4 uChan; void main() { gl_FragColor = uChan; }',
      transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    });
    c.mask = new THREE.Mesh(c.maskGeo, c.maskMat);
    c.mask.frustumCulled = false;
    c.maskScene.add(c.mask);
    const g = body.grid, textures = this.tex;
    c.sdfTex = new THREE.DataTexture(g.bytes, g.res, g.res, THREE.RedFormat, THREE.UnsignedByteType);
    c.sdfTex.minFilter = c.sdfTex.magFilter = THREE.LinearFilter;
    c.sdfTex.needsUpdate = true;
    const first = this.cells[0];
    c.bodyMat = propertyMaterial({
      vertexShader: QUAD_VS, fragmentShader: BODY_FS,
      uniforms: {
        uSize: { value: new THREE.Vector2(1, 1) }, uMask: { value: this.maskRT.texture }, uChan: { value: new THREE.Vector4(1, 0, 0, 0) }, uSdf: { value: c.sdfTex },
        uCyto: first ? first.bodyMat.uniforms.uCyto : { value: textures.cyto }, uCytoMean: first ? first.bodyMat.uniforms.uCytoMean : { value: new THREE.Vector3(...textures.cytoMean) },
        uCytoOff: { value: new THREE.Vector2() }, uCytoTile: { value: 80 },
        uRes: first ? first.bodyMat.uniforms.uRes : { value: new THREE.Vector2(1, 1) }, uGrid: { value: new THREE.Vector3() },
        uOrgA: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
        uOrgB: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
        uOrgN: { value: 0 },
        uTips: { value: Array.from({ length: 5 }, () => new THREE.Vector4()) },
        uUroid: { value: new THREE.Vector3() }, uFlat: { value: 1 }, uTime: { value: 0 }, uDrain: { value: 0 },
        uTint: { value: new THREE.Vector4(0, 0, 0, 0) },
        uLook: { value: new THREE.Vector4(0, 1, 1, 0) },
      },
    });
    c.bodyQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), c.bodyMat);
    c.bodyQuad.frustumCulled = false;
    c.scene.add(c.bodyQuad);
    const n = cyto.n;
    c.granPos = new Float32Array(n * 3);
    const info = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { info[i * 3] = cyto.kind[i]; info[i * 3 + 1] = cyto.size[i]; info[i * 3 + 2] = cyto.seed[i]; }
    c.granGeo = new THREE.BufferGeometry();
    c.granGeo.setAttribute('position', new THREE.BufferAttribute(c.granPos, 3));
    c.granGeo.setAttribute('aInfo', new THREE.BufferAttribute(info, 3));
    c.granMat = propertyMaterial({ vertexShader: GRAN_VS, fragmentShader: GRAN_FS, uniforms: { uPx: { value: 1 }, uTime: { value: 0 } } });
    c.points = new THREE.Points(c.granGeo, c.granMat);
    c.points.frustumCulled = false;
    c.scene.add(c.points);
    c.drain = 0;
    this.cells.push(c);
    return c;
  }

  /**
   * Compile every shader program the view can use, at load: the cells' masks,
   * bodies and granules (Chaos is a cell too), each kind of prey and slide
   * object (the fungus's trap hyphae among them), the photo layer, pinched-off
   * fragments, the blurs, and the optics composite both to the screen and into
   * a render target (a split-screen view). Without it the composite's split
   * variant compiled on the frame a second player joined, and a fragment's
   * program on every first pinch-off. The calls are only queued (compileAsync
   * where the renderer has it: a driver with KHR_parallel_shader_compile
   * builds them in the background), so they overlap the rest of the start-up.
   * Once they are built, the ones the first frame does not draw are drawn
   * once into 1-pixel targets of the right formats, off screen, because some
   * drivers (ANGLE on Vulkan, SwiftShader) only build the pipeline at a
   * program's first draw. The stand-in materials stay alive, so a program is
   * never released and rebuilt when the last real user of it (a fragment) is
   * disposed.
   */
  precompile() {
    const r = this.renderer;
    if (!this.warmScene) {
      this.warmScene = new THREE.Scene();
      const tri = new THREE.BufferGeometry(); // a fragment's layout: positions only (zero area)
      tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
      for (const fs of [PREY_FS, SPIRO_FS, DIATOM_FS, FLAKE_FS, TRAP_FS, LEAF_FS, PHOTO_FS, FRAG_FS]) {
        const m = new THREE.Mesh(fs === FRAG_FS ? tri : this.quadGeo, propertyMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms: {} }));
        m.frustumCulled = false;
        m.visible = false;
        m.userData.draw = fs === FRAG_FS;
        this.warmScene.add(m);
      }
    }
    const jobs = [];
    const go = (scene, camera) => { if (r.compileAsync) jobs.push(r.compileAsync(scene, camera)); else r.compile(scene, camera); };
    const prev = r.getRenderTarget(), o = this.optics, mat0 = o.quad.material;
    try {
      r.setRenderTarget(this.maskRT);
      for (const c of this.cells) go(c.maskScene, this.camera);
      r.setRenderTarget(o.focusRT);
      for (const c of this.cells) go(c.scene, this.camera);
      for (const sc of [this.focusScene, this.aboveScene, this.warmScene]) go(sc, this.camera);
      o.quad.material = o.blurMat;
      go(o.quadScene, o.quadCam);
      o.quad.material = o.compMat;
      go(o.quadScene, o.quadCam); // into a render target: a split-screen view
      r.setRenderTarget(null);
      go(o.quadScene, o.quadCam); // to the screen
    } catch (e) { /* only a warm-up */ } finally {
      o.quad.material = mat0;
      r.setRenderTarget(prev);
    }
    Promise.all(jobs).catch(() => {}).then(() => this.warmDraws());
  }

  /** The first draws precompile() promises: off screen, into 1-pixel targets (nothing shown). */
  warmDraws() {
    const r = this.renderer, o = this.optics;
    const prev = r.getRenderTarget(), mat0 = o.quad.material;
    // the property buffers' format; a split view's target (shared/splitscreen.js target())
    const rtP = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
    const rtV = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, samples: 0 });
    rtV.texture.colorSpace = THREE.SRGBColorSpace;
    try {
      for (const m of this.warmScene.children) m.visible = m.userData.draw;
      r.setRenderTarget(rtP);
      r.render(this.warmScene, this.camera);
      o.quad.material = o.compMat;
      r.setRenderTarget(rtV);
      r.render(o.quadScene, o.quadCam);
    } catch (e) { /* only a warm-up */ } finally {
      for (const m of this.warmScene.children) m.visible = false;
      o.quad.material = mat0;
      r.setRenderTarget(prev);
      rtP.dispose(); rtV.dispose();
    }
  }

  /** The same layer, a new body and cytoplasm (a player's amoeba starting over). */
  rebindCell(c, body, cyto) {
    c.body = body;
    if (c === this.cells[0]) { this.body = body; this.cyto = cyto; }
    const g = body.grid;
    c.sdfTex.image = { data: g.bytes, width: g.res, height: g.res };
    c.sdfTex.needsUpdate = true;
    if (cyto.n !== c.cyto.n) throw new Error('rebindCell: granule count differs');
    c.cyto = cyto;
    const info = c.granGeo.attributes.aInfo;
    for (let i = 0; i < cyto.n; i++) { info.array[i * 3] = cyto.kind[i]; info.array[i * 3 + 1] = cyto.size[i]; info.array[i * 3 + 2] = cyto.seed[i]; }
    info.needsUpdate = true;
  }

  removeCell(c) {
    const i = this.cells.indexOf(c);
    if (i <= 0) return;
    this.cells.splice(i, 1);
    for (const o of [c.maskGeo, c.maskMat, c.granGeo, c.bodyQuad.geometry, c.bodyMat, c.granMat, c.sdfTex]) o.dispose();
  }

  /** A cell's own look: olive (extra olive endoplasm, 0 = A. proteus), rim (clear rim width scale), grain (granular texture contrast). */
  setLook(c, { olive = 0, rim = 1, grain = 1 } = {}) {
    c.bodyMat.uniforms.uLook.value.set(olive, rim, grain, 0);
  }

  /** A player's colour as a faint tint of the cell (strength 0: none). */
  setTint(c, color, strength) {
    const col = new THREE.Color(color);
    const od = (v) => -Math.log(Math.max(0.05, v));
    c.bodyMat.uniforms.uTint.value.set(od(col.r), od(col.g), od(col.b), strength);
  }

  setPhoto(tex, mean) {
    // MP-A03 delivered: replaces the procedural out-of-focus filaments.
    const m = propertyMaterial({ vertexShader: QUAD_VS, fragmentShader: PHOTO_FS, uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uTex: { value: tex }, uMean: { value: new THREE.Vector3(...mean) }, uDim: { value: 0.36 }, uTile: { value: new THREE.Vector2(3600, 2025) } } });
    tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
    tex.needsUpdate = true;
    this.photo = new THREE.Mesh(this.quadGeo, m);
    this.photo.frustumCulled = false;
    this.aboveScene.add(this.photo);
  }

  setSize(w, h) {
    this.renderer.setSize(w, h, false);
    const s = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.bw = s.x; this.bh = s.y;
    this.sizeBuffers();
  }

  /** The property buffers at k × the screen (split-screen views draw smaller). */
  setScale(k) {
    k = Math.max(0.3, Math.min(1, k));
    if (k === this.scale) return;
    this.scale = k;
    this.sizeBuffers();
  }

  sizeBuffers() {
    const w = Math.max(4, Math.round(this.bw * this.scale)), h = Math.max(4, Math.round(this.bh * this.scale));
    this.optics.setSize(w, h);
    this.maskRT.setSize(w, h);
    this.bodyMat.uniforms.uRes.value.set(w, h);
  }

  setView(cx, cy, width) {
    const height = width * (this.bh / this.bw);
    const c = this.camera;
    c.left = cx - width / 2; c.right = cx + width / 2;
    c.bottom = cy - height / 2; c.top = cy + height / 2;
    c.updateProjectionMatrix();
    this.view = [c.left, c.bottom, width, height];
    this.px = (this.bw * this.scale) / width;
    this.cssPerUm = this.renderer.domElement.clientWidth / width;
  }

  obstacleMesh(o) {
    let m = this.obMeshes.get(o);
    if (m) return m;
    const fs = o.type === 'spiro' ? SPIRO_FS : o.type === 'diatom' ? DIATOM_FS : o.type === 'trap' ? TRAP_FS : o.type === 'leaf' ? LEAF_FS : FLAKE_FS;
    const pad = o.type === 'spiro' || o.type === 'trap' ? 10 : o.type === 'diatom' ? 6 : o.type === 'leaf' ? 70 : o.L * 0.3;
    const size = new THREE.Vector2(o.L + pad * 2, (o.type === 'flake' ? o.L : o.W) + pad * 2);
    const u = {
      uSize: { value: size }, uL: { value: o.L }, uW: { value: o.W }, uSeed: { value: o.seed }, uPx: { value: 1 },
      uDim: { value: o.layer === 'above' ? 0.45 : 1 },
      uCell: { value: o.cell || 100 }, uPitch: { value: o.pitch || 40 }, uStrands: { value: o.strands || 1 },
      uGirdle: { value: o.girdle || 0 }, uResidue: { value: o.residue ? 1 : 0 },
      uGrow: { value: o.grow ?? 1 }, uActive: { value: o.active ?? 1 }, uKnobs: { value: o.haustorium ? 0 : 1 },
      uWind: { value: 0 }, uGrip: { value: 0 },
    };
    m = new THREE.Mesh(this.quadGeo, propertyMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms: u }));
    m.scale.set(size.x, size.y, 1);
    m.frustumCulled = false;
    (o.layer === 'above' ? this.aboveScene : this.focusScene).add(m);
    this.obMeshes.set(o, m);
    return m;
  }

  preyMesh(p) {
    let m = this.preyMeshes.get(p);
    if (m) return m;
    const { L, W, kind } = p.sp;
    let sx, sy;
    if (kind === 0) { sx = L * 3.2; sy = W + L * 1.8; }
    else if (kind === 1) { sx = L * 4.4; sy = L * 4.4; }
    else if (kind >= 4) { sx = L + 110; sy = W + 110; }
    else { sx = L + 30; sy = W + 30; }
    const u = {
      uSize: { value: new THREE.Vector2(sx, sy) }, uKind: { value: kind }, uL: { value: L }, uW: { value: W },
      uTime: { value: 0 }, uDigest: { value: 0 }, uAlive: { value: 1 }, uDischT: { value: 99 }, uDischAng: { value: 0 },
      uSeed: { value: Math.random() }, uSc: { value: 1 }, uPx: { value: 1 }, uDim: { value: 1 },
    };
    m = new THREE.Mesh(this.quadGeo, propertyMaterial({ vertexShader: QUAD_VS, fragmentShader: PREY_FS, uniforms: u }));
    m.scale.set(sx, sy, 1);
    m.frustumCulled = false;
    (p.layer === 'above' ? this.aboveScene : this.focusScene).add(m);
    this.preyMeshes.set(p, m);
    return m;
  }

  removePrey(p) {
    const m = this.preyMeshes.get(p);
    if (m) { m.parent.remove(m); m.material.dispose(); this.preyMeshes.delete(p); }
  }

  /** The mask outline: Catmull-Rom subdivided with the uroid wrinkles (smooth) or straight. */
  fillContour(time, smooth, c = this.cells[0]) {
    const b = c.body, x = b.x, y = b.y;
    const pos = c.maskPos, ct = c.contour;
    let k = 0;
    for (let i = 0; i < N; i++) {
      const i0 = (i + N - 1) % N, i2 = (i + 1) % N, i3 = (i + 2) % N;
      for (let s = 0; s < SUB; s++) {
        const t = s / SUB, t2 = t * t, t3 = t2 * t;
        let px, py;
        if (smooth) {
          px = catmull(x[i0], x[i], x[i2], x[i3], t, t2, t3);
          py = catmull(y[i0], y[i], y[i2], y[i3], t, t2, t3);
        } else {
          px = x[i] + (x[i2] - x[i]) * t; py = y[i] + (y[i2] - y[i]) * t;
        }
        if (smooth && this.flags.wrinkle) {
          // The uroid is crumpled: small folds near the rear.
          const du = hyp(px - b.ux, py - b.uy);
          const w = Math.max(0, 1 - du / 70);
          if (w > 0) {
            const a = b.nx[i], c = b.ny[i];
            const f = Math.sin((i + t) * 2.7 + time * 0.25) * 3.6 * w * w;
            px += a * f; py += c * f;
          }
        }
        pos[k * 3] = px; pos[k * 3 + 1] = py; pos[k * 3 + 2] = 0;
        ct[k].set(px, py);
        k++;
      }
    }
  }

  updateMask(time, c = this.cells[0]) {
    this.fillContour(time, true, c);
    // Ear clipping needs a simple polygon: on a crossed polygon it emits stray
    // triangles. The smooth, wrinkled contour can overshoot where the membrane
    // folds tightly even when the ring itself is simple, so fall back to
    // straight subdivision of the ring (simple whenever the ring is).
    this.maskFallback = false;
    if (contourCrosses(c.contour)) { this.fillContour(time, false, c); this.maskFallback = true; this.maskFallbacks = (this.maskFallbacks || 0) + 1; }
    const ct = c.contour;
    const tris = THREE.ShapeUtils.triangulateShape(ct, []);
    const idx = c.maskGeo.index.array;
    let j = 0;
    for (const t of tris) { if (j + 3 > idx.length) break; idx[j++] = t[0]; idx[j++] = t[1]; idx[j++] = t[2]; }
    c.maskGeo.setDrawRange(0, j);
    c.maskGeo.index.needsUpdate = true;
    c.maskGeo.attributes.position.needsUpdate = true;
  }

  /**
   * A piece of the cell lost to a pinch-off: { xs, ys, cx, cy, R, age (0..1), seed }.
   * Drawn from its own (simple) outline, rounding up, darkening and breaking up.
   */
  updateFragment(fr) {
    let m = fr.mesh;
    const n = fr.xs.length;
    if (!m) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(Math.max(1, n - 2) * 3), 1));
      const u = { uSize: { value: new THREE.Vector2(1, 1) }, uC: { value: new THREE.Vector3() }, uAge: { value: 0 }, uSeed: { value: fr.seed } };
      m = fr.mesh = new THREE.Mesh(geo, propertyMaterial({ vertexShader: QUAD_VS, fragmentShader: FRAG_FS, uniforms: u }));
      m.frustumCulled = false;
      this.focusScene.add(m);
      fr.ct = Array.from({ length: n }, () => new THREE.Vector2());
    }
    const geo = m.geometry, pos = geo.attributes.position.array;
    for (let i = 0; i < n; i++) { pos[i * 3] = fr.xs[i]; pos[i * 3 + 1] = fr.ys[i]; fr.ct[i].set(fr.xs[i], fr.ys[i]); }
    const idx = geo.index.array;
    let j = 0;
    if (!contourCrosses(fr.ct)) {
      for (const t of THREE.ShapeUtils.triangulateShape(fr.ct, [])) { if (j + 3 > idx.length) break; idx[j++] = t[0]; idx[j++] = t[1]; idx[j++] = t[2]; }
    }
    geo.setDrawRange(0, j);
    geo.index.needsUpdate = true;
    geo.attributes.position.needsUpdate = true;
    m.material.uniforms.uC.value.set(fr.cx, fr.cy, fr.R);
    m.material.uniforms.uAge.value = fr.age;
  }

  removeFragment(fr) {
    if (!fr.mesh) return;
    fr.mesh.parent.remove(fr.mesh);
    fr.mesh.geometry.dispose(); fr.mesh.material.dispose();
    fr.mesh = null;
  }

  /** One cell's uniforms, mask outline and granules for this frame. */
  updateCell(c, time, granuleCount) {
    const b = c.body, cyto = c.cyto;
    this.updateMask(time, c);
    const g = b.grid;
    c.sdfTex.needsUpdate = true;
    const bu = c.bodyMat.uniforms;
    c.bodyQuad.position.set(g.ox + g.size / 2, g.oy + g.size / 2, 0);
    c.bodyQuad.scale.set(g.size, g.size, 1);
    bu.uSize.value.set(g.size, g.size);
    bu.uGrid.value.set(g.ox, g.oy, g.size);
    bu.uFlat.value = b.flat;
    bu.uTime.value = time;
    bu.uCytoOff.value.set(-b.cx * 0.6, -b.cy * 0.6);
    bu.uUroid.value.set(b.ux, b.uy, 60);
    if (c !== this.cells[0]) bu.uDrain.value = c.drain || 0;
    let t = 0;
    for (const pod of b.pods) {
      const on = this.flags.caps && pod.s > 0.1 && t < 5;
      if (on) bu.uTips.value[t++].set(pod.x, pod.y, Math.min(1, pod.s * 1.3), 0);
    }
    for (; t < 5; t++) bu.uTips.value[t].set(0, 0, 0, 0);
    let o = 0;
    const A = bu.uOrgA.value, B = bu.uOrgB.value;
    const nu = cyto.nucleus;
    A[o].set(nu.x, nu.y, nu.r, nu.r * nu.asp); B[o].set(0, nu.ang, 1, 0); o++;
    if (cyto.cv.r > 1) { A[o].set(cyto.cv.x, cyto.cv.y, cyto.cv.r, cyto.cv.r); B[o].set(1, 0, 1, 0); o++; }
    // more nuclei (the giant Chaos is multinucleate)
    for (const e of cyto.extraNuclei || []) { if (o >= 10) break; A[o].set(e.x, e.y, e.r, e.r * 0.85); B[o].set(0, 0.4, 1, 0); o++; }
    for (const v of cyto.vacuoles) {
      if (o >= 12) break;
      A[o].set(v.x, v.y, v.rx, v.ry); B[o].set(2, v.ang, 1 - 0.7 * v.digest, 0); o++;
    }
    bu.uOrgN.value = o;
    const n = Math.min(cyto.n, granuleCount);
    const gp = c.granPos;
    for (let i = 0; i < n; i++) { gp[i * 3] = cyto.px[i]; gp[i * 3 + 1] = cyto.py[i]; }
    c.granGeo.attributes.position.needsUpdate = true;
    c.granGeo.setDrawRange(0, n);
    c.points.visible = this.flags.granules;
    c.granMat.uniforms.uPx.value = this.px;
    c.granMat.uniforms.uTime.value = time;
  }

  render({ time, prey, mode, focus, flags, granuleCount, buffersOnly = false, fragments = [], target = null, update = true }) {
    const r = this.renderer;
    // update: false re-renders the same frame from another view (split screen).
    // A cell's outline, uniforms and granules are brought up to date the first
    // time a view this frame draws it (below), so a cell no view shows (Chaos
    // far off, a player out of every split view) costs nothing.
    if (update) {
      this.frameId = (this.frameId || 0) + 1;
      for (const fr of fragments) this.updateFragment(fr);
    }
    for (const c of this.cells) c.granMat.uniforms.uPx.value = this.px;

    // Obstacles (and prey, below) outside this view are not drawn: the slide
    // runs on for millimetres in every direction.
    const [cl, cb, cw, ch] = this.view;
    const inView = (x, y, e) => x > cl - e && x < cl + cw + e && y > cb - e && y < cb + ch + e;
    for (const ob of this.world.obstacles) {
      const m = this.obstacleMesh(ob);
      m.visible = (ob.layer === 'above' ? flags.above && !this.photo : (flags.obstacles && !ob.hidden) || ob.residue) && inView(ob.x, ob.y, Math.max(ob.L, ob.W) * 0.6 + 80);
      m.position.set(ob.x, ob.y, 0);
      m.rotation.z = ob.ang;
      m.material.uniforms.uPx.value = this.px;
      if (ob.type === 'trap') {
        const u = m.material.uniforms;
        u.uGrow.value = ob.grow ?? 1; u.uActive.value = ob.active ?? 1; u.uL.value = ob.L;
        u.uWind.value = ob.wind || 0; u.uGrip.value = ob.grip > 0 ? 1 : 0;
      }
    }
    if (this.photo) {
      const [l, bt, w, h] = this.view;
      this.photo.visible = flags.above;
      this.photo.position.set(l + w / 2, bt + h / 2, 0);
      this.photo.scale.set(w * 1.05, h * 1.05, 1);
      this.photo.material.uniforms.uSize.value.set(w * 1.05, h * 1.05);
    }

    // Prey.
    for (const m of this.preyMeshes.values()) m.visible = false;
    for (const p of prey) {
      const m = this.preyMesh(p);
      m.visible = inView(p.x, p.y, 300);
      if (!m.visible) continue;
      const u = m.material.uniforms;
      m.position.set(p.x, p.y, 0);
      m.rotation.z = p.heading;
      u.uTime.value = p.time;
      u.uDigest.value = p.digest;
      u.uAlive.value = p.alive ? 1 : 0;
      u.uDischT.value = p.dischT;
      u.uDischAng.value = p.dischAng;
      u.uSc.value = p.sc;
      u.uPx.value = this.px;
    }

    // The cells in this view, four at a time: their masks into one target (a
    // channel each), then their bodies and granules into the property buffer;
    // then everything else, the out-of-focus layer, and the optics.
    r.setClearColor(0x000000, 0);
    this.optics.clear();
    const [vl, vb, vw, vh] = this.view, pad = 40;
    const seen = this.cells.filter((c) => {
      const g = c.body.grid;
      return g.ox < vl + vw + pad && g.ox + g.size > vl - pad && g.oy < vb + vh + pad && g.oy + g.size > vb - pad;
    });
    for (const c of seen) if (c.frameId !== this.frameId) { c.frameId = this.frameId; this.updateCell(c, time, granuleCount); }
    this.maskPasses = 0;
    for (let i = 0; i < seen.length; i += 4) {
      const batch = seen.slice(i, i + 4);
      r.setRenderTarget(this.maskRT);
      r.clear(true, false, false);
      batch.forEach((c, k) => {
        const ch = CHANNELS[k];
        c.maskMat.uniforms.uChan.value.copy(ch);
        c.bodyMat.uniforms.uChan.value.copy(ch);
        r.render(c.maskScene, this.camera);
      });
      this.maskPasses++;
      r.setRenderTarget(this.optics.focusRT);
      for (const c of batch) r.render(c.scene, this.camera);
    }
    r.setRenderTarget(this.optics.focusRT);
    r.render(this.focusScene, this.camera);
    r.setRenderTarget(this.optics.defRT);
    r.render(this.aboveScene, this.camera);
    if (buffersOnly) return; // a borrowed look reads optics.focusRT / defRT itself
    this.optics.compose({
      view: this.view, bg: this.tex.bg, bgMean: this.tex.bgMean, bgTile: 1400,
      mode, focus, time, flags, target,
    });
  }
}

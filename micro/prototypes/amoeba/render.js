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
// mask, body quad and granules. The mask and body passes run once per cell
// (the shared mask target is reused), adding into the same property buffer.
// render({ target }) composes into a split-screen view's target instead of
// the screen; setScale(k) draws the buffers at k × the screen (split views).
import * as THREE from '../shared/vendor/three.module.min.js';
import { PropertyOptics, propertyMaterial } from '../shared/techniques/amoeba-optics.js';
import { N } from '../shared/techniques/amoeba-softbody.js';
import { QUAD_VS, FRAG_FS, BODY_FS, GRAN_VS, GRAN_FS, PREY_FS, SPIRO_FS, DIATOM_FS, FLAKE_FS, PHOTO_FS, TRAP_FS, LEAF_FS } from './shaders.js';

const SUB = 3; // Catmull-Rom subdivisions per membrane segment for the mask

/** Does the closed contour (Vector2s) cross itself? A grid hash over its segments. */
function contourCrosses(ct) {
  const n = ct.length;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const v of ct) { if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y; }
  const cs = Math.max(12, Math.max(x1 - x0, y1 - y0) / 48);
  const W = Math.ceil((x1 - x0) / cs) + 1;
  const cells = new Map();
  const o = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (let i = 0; i < n; i++) {
    const a = ct[i], b = ct[(i + 1) % n];
    const ca = Math.floor((Math.min(a.x, b.x) - x0) / cs), cb = Math.floor((Math.max(a.x, b.x) - x0) / cs);
    const ra = Math.floor((Math.min(a.y, b.y) - y0) / cs), rb = Math.floor((Math.max(a.y, b.y) - y0) / cs);
    for (let r = ra; r <= rb; r++) {
      for (let c = ca; c <= cb; c++) {
        const k = r * W + c;
        let list = cells.get(k);
        if (!list) cells.set(k, (list = []));
        for (const j of list) {
          if (j === i - 1 || (i === n - 1 && j === 0)) continue;
          const p = ct[j], q = ct[(j + 1) % n];
          const d1 = o(a, b, p), d2 = o(a, b, q), d3 = o(p, q, a), d4 = o(p, q, b);
          if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
        }
        list.push(i);
      }
    }
  }
  return false;
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
    const mask = new THREE.Mesh(c.maskGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    mask.frustumCulled = false;
    c.maskScene.add(mask);
    const g = body.grid, textures = this.tex;
    c.sdfTex = new THREE.DataTexture(g.bytes, g.res, g.res, THREE.RedFormat, THREE.UnsignedByteType);
    c.sdfTex.minFilter = c.sdfTex.magFilter = THREE.LinearFilter;
    c.sdfTex.needsUpdate = true;
    const first = this.cells[0];
    c.bodyMat = propertyMaterial({
      vertexShader: QUAD_VS, fragmentShader: BODY_FS,
      uniforms: {
        uSize: { value: new THREE.Vector2(1, 1) }, uMask: { value: this.maskRT.texture }, uSdf: { value: c.sdfTex },
        uCyto: first ? first.bodyMat.uniforms.uCyto : { value: textures.cyto }, uCytoMean: first ? first.bodyMat.uniforms.uCytoMean : { value: new THREE.Vector3(...textures.cytoMean) },
        uCytoOff: { value: new THREE.Vector2() }, uCytoTile: { value: 80 },
        uRes: first ? first.bodyMat.uniforms.uRes : { value: new THREE.Vector2(1, 1) }, uGrid: { value: new THREE.Vector3() },
        uOrgA: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
        uOrgB: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
        uOrgN: { value: 0 },
        uTips: { value: Array.from({ length: 5 }, () => new THREE.Vector4()) },
        uUroid: { value: new THREE.Vector3() }, uFlat: { value: 1 }, uTime: { value: 0 }, uDrain: { value: 0 },
        uTint: { value: new THREE.Vector4(0, 0, 0, 0) },
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
    for (const o of [c.maskGeo, c.granGeo, c.bodyQuad.geometry, c.bodyMat, c.granMat, c.sdfTex]) o.dispose();
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
          const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
          px = cr(x[i0], x[i], x[i2], x[i3]);
          py = cr(y[i0], y[i], y[i2], y[i3]);
        } else {
          px = x[i] + (x[i2] - x[i]) * t; py = y[i] + (y[i2] - y[i]) * t;
        }
        if (smooth && this.flags.wrinkle) {
          // The uroid is crumpled: small folds near the rear.
          const du = Math.hypot(px - b.ux, py - b.uy);
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
    if (update) {
      for (const c of this.cells) this.updateCell(c, time, granuleCount);
      for (const fr of fragments) this.updateFragment(fr);
    }
    for (const c of this.cells) c.granMat.uniforms.uPx.value = this.px;

    // Obstacles.
    for (const ob of this.world.obstacles) {
      const m = this.obstacleMesh(ob);
      m.visible = ob.layer === 'above' ? flags.above && !this.photo : (flags.obstacles && !ob.hidden) || ob.residue;
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
    for (const p of prey) {
      const m = this.preyMesh(p);
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

    // Each cell: its mask, then its body and granules into the property buffer;
    // then everything else, the out-of-focus layer, and the optics.
    r.setClearColor(0x000000, 0);
    this.optics.clear();
    for (const c of this.cells) {
      r.setRenderTarget(this.maskRT);
      r.clear(true, false, false);
      r.render(c.maskScene, this.camera);
      r.setRenderTarget(this.optics.focusRT);
      r.render(c.scene, this.camera);
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

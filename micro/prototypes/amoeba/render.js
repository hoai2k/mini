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
import * as THREE from '../shared/vendor/three.module.min.js';
import { PropertyOptics, propertyMaterial } from '../shared/techniques/amoeba-optics.js';
import { N } from '../shared/techniques/amoeba-softbody.js';
import { QUAD_VS, BODY_FS, GRAN_VS, GRAN_FS, PREY_FS, SPIRO_FS, DIATOM_FS, FLAKE_FS, PHOTO_FS } from './shaders.js';

const SUB = 3; // Catmull-Rom subdivisions per membrane segment for the mask

export class View {
  constructor(renderer, { body, cyto, world, textures }) {
    this.renderer = renderer;
    this.body = body; this.cyto = cyto; this.world = world; this.tex = textures;
    this.optics = new PropertyOptics(renderer);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    this.camera.position.z = 5;
    this.maskScene = new THREE.Scene();
    this.focusScene = new THREE.Scene();
    this.aboveScene = new THREE.Scene();
    this.maskRT = new THREE.WebGLRenderTarget(4, 4, { samples: 4, depthBuffer: false });
    this.flags = { wrinkle: true, granules: true, caps: true };

    // Mask: the membrane polygon.
    const nv = N * SUB;
    this.maskPos = new Float32Array(nv * 3);
    this.maskGeo = new THREE.BufferGeometry();
    this.maskGeo.setAttribute('position', new THREE.BufferAttribute(this.maskPos, 3));
    this.maskGeo.setIndex(new THREE.BufferAttribute(new Uint32Array((nv - 2) * 3), 1));
    this.contour = Array.from({ length: nv }, () => new THREE.Vector2());
    const mask = new THREE.Mesh(this.maskGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    mask.frustumCulled = false;
    this.maskScene.add(mask);

    // The body quad, over the distance grid.
    const g = body.grid;
    this.sdfTex = new THREE.DataTexture(g.bytes, g.res, g.res, THREE.RedFormat, THREE.UnsignedByteType);
    this.sdfTex.minFilter = this.sdfTex.magFilter = THREE.LinearFilter;
    this.sdfTex.needsUpdate = true;
    this.bodyMat = propertyMaterial({
      vertexShader: QUAD_VS, fragmentShader: BODY_FS,
      uniforms: {
        uSize: { value: new THREE.Vector2(1, 1) }, uMask: { value: this.maskRT.texture }, uSdf: { value: this.sdfTex },
        uCyto: { value: textures.cyto }, uCytoMean: { value: new THREE.Vector3(...textures.cytoMean) },
        uCytoOff: { value: new THREE.Vector2() }, uCytoTile: { value: 80 },
        uRes: { value: new THREE.Vector2(1, 1) }, uGrid: { value: new THREE.Vector3() },
        uOrgA: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
        uOrgB: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
        uOrgN: { value: 0 },
        uTips: { value: Array.from({ length: 5 }, () => new THREE.Vector4()) },
        uUroid: { value: new THREE.Vector3() }, uFlat: { value: 1 }, uTime: { value: 0 },
      },
    });
    this.bodyQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.bodyMat);
    this.bodyQuad.frustumCulled = false;
    this.focusScene.add(this.bodyQuad);

    // Granules.
    const n = cyto.n;
    this.granPos = new Float32Array(n * 3);
    const info = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { info[i * 3] = cyto.kind[i]; info[i * 3 + 1] = cyto.size[i]; info[i * 3 + 2] = cyto.seed[i]; }
    this.granGeo = new THREE.BufferGeometry();
    this.granGeo.setAttribute('position', new THREE.BufferAttribute(this.granPos, 3));
    this.granGeo.setAttribute('aInfo', new THREE.BufferAttribute(info, 3));
    this.granMat = propertyMaterial({ vertexShader: GRAN_VS, fragmentShader: GRAN_FS, uniforms: { uPx: { value: 1 }, uTime: { value: 0 } } });
    this.points = new THREE.Points(this.granGeo, this.granMat);
    this.points.frustumCulled = false;
    this.focusScene.add(this.points);

    this.obMeshes = new Map();
    this.preyMeshes = new Map();
    this.photo = null;
    this.quadGeo = new THREE.PlaneGeometry(1, 1);
    this.view = [0, 0, 1, 1];
    this.px = 1;
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
    this.optics.setSize(s.x, s.y);
    this.maskRT.setSize(s.x, s.y);
    this.bodyMat.uniforms.uRes.value.set(s.x, s.y);
  }

  setView(cx, cy, width) {
    const height = width * (this.bh / this.bw);
    const c = this.camera;
    c.left = cx - width / 2; c.right = cx + width / 2;
    c.bottom = cy - height / 2; c.top = cy + height / 2;
    c.updateProjectionMatrix();
    this.view = [c.left, c.bottom, width, height];
    this.px = this.bw / width;
    this.cssPerUm = this.renderer.domElement.clientWidth / width;
  }

  obstacleMesh(o) {
    let m = this.obMeshes.get(o);
    if (m) return m;
    const fs = o.type === 'spiro' ? SPIRO_FS : o.type === 'diatom' ? DIATOM_FS : FLAKE_FS;
    const pad = o.type === 'spiro' ? 8 : o.type === 'diatom' ? 6 : o.L * 0.3;
    const size = new THREE.Vector2(o.L + pad * 2, (o.type === 'flake' ? o.L : o.W) + pad * 2);
    const u = {
      uSize: { value: size }, uL: { value: o.L }, uW: { value: o.W }, uSeed: { value: o.seed }, uPx: { value: 1 },
      uDim: { value: o.layer === 'above' ? 0.45 : 1 },
      uCell: { value: o.cell || 100 }, uPitch: { value: o.pitch || 40 }, uStrands: { value: o.strands || 1 },
      uGirdle: { value: o.girdle || 0 }, uResidue: { value: o.residue ? 1 : 0 },
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
    else if (kind === 4) { sx = L + 110; sy = W + 110; }
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

  updateMask(time) {
    const b = this.body, x = b.x, y = b.y;
    const pos = this.maskPos, ct = this.contour;
    let k = 0;
    for (let i = 0; i < N; i++) {
      const i0 = (i + N - 1) % N, i2 = (i + 1) % N, i3 = (i + 2) % N;
      for (let s = 0; s < SUB; s++) {
        const t = s / SUB, t2 = t * t, t3 = t2 * t;
        const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
        let px = cr(x[i0], x[i], x[i2], x[i3]);
        let py = cr(y[i0], y[i], y[i2], y[i3]);
        if (this.flags.wrinkle) {
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
    const tris = THREE.ShapeUtils.triangulateShape(ct, []);
    const idx = this.maskGeo.index.array;
    let j = 0;
    for (const t of tris) { if (j + 3 > idx.length) break; idx[j++] = t[0]; idx[j++] = t[1]; idx[j++] = t[2]; }
    this.maskGeo.setDrawRange(0, j);
    this.maskGeo.index.needsUpdate = true;
    this.maskGeo.attributes.position.needsUpdate = true;
  }

  render({ time, prey, mode, focus, flags, granuleCount }) {
    const b = this.body, cyto = this.cyto, r = this.renderer;
    this.updateMask(time);

    // Body uniforms.
    const g = b.grid;
    this.sdfTex.needsUpdate = true;
    const bu = this.bodyMat.uniforms;
    this.bodyQuad.position.set(g.ox + g.size / 2, g.oy + g.size / 2, 0);
    this.bodyQuad.scale.set(g.size, g.size, 1);
    bu.uSize.value.set(g.size, g.size);
    bu.uGrid.value.set(g.ox, g.oy, g.size);
    bu.uFlat.value = b.flat;
    bu.uTime.value = time;
    bu.uCytoOff.value.set(-b.cx * 0.6, -b.cy * 0.6);
    bu.uUroid.value.set(b.ux, b.uy, 60);
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

    // Granules.
    const n = Math.min(cyto.n, granuleCount);
    const gp = this.granPos;
    for (let i = 0; i < n; i++) { gp[i * 3] = cyto.px[i]; gp[i * 3 + 1] = cyto.py[i]; }
    this.granGeo.attributes.position.needsUpdate = true;
    this.granGeo.setDrawRange(0, n);
    this.points.visible = this.flags.granules;
    this.granMat.uniforms.uPx.value = this.px;
    this.granMat.uniforms.uTime.value = time;

    // Obstacles.
    for (const ob of this.world.obstacles) {
      const m = this.obstacleMesh(ob);
      m.visible = ob.layer === 'above' ? flags.above && !this.photo : flags.obstacles || ob.residue;
      m.position.set(ob.x, ob.y, 0);
      m.rotation.z = ob.ang;
      m.material.uniforms.uPx.value = this.px;
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

    // Mask, then property buffers, then optics.
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(this.maskRT);
    r.clear(true, false, false);
    r.render(this.maskScene, this.camera);
    this.optics.clear();
    r.setRenderTarget(this.optics.focusRT);
    r.render(this.focusScene, this.camera);
    r.setRenderTarget(this.optics.defRT);
    r.render(this.aboveScene, this.camera);
    this.optics.compose({
      view: this.view, bg: this.tex.bg, bgMean: this.tex.bgMean, bgTile: 1400,
      mode, focus, time, flags,
    });
  }
}

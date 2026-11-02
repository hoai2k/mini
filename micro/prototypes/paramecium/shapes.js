// The 2D slide's renderer: every shape in the field (filament walls, ribbons,
// granules, outlines, cilia, glows) is one instance of a soft signed-distance
// quad, all in one dynamic buffer and one draw. Darkfield is light scattered
// by each structure on a black field, so the shapes simply add up (additive
// blending: no sorting); the other looks subtract them from a lit field
// (dark structures on grey or ivory, phase's bright halo added on top).
//
// Depth (the owner, 2026-11-02: "2.5D ... go further or closer a little"):
// each instance carries its depth z (µm). The microscope's focus follows the
// player (uFocus); what lies off the focal plane is drawn softer (its edge
// widened by uBlur per µm, which also spreads and so dims thin lines, as
// defocus does), a little dimmer, and scaled about the view's centre by
// 1 + uPar · (z − focus) (nearer the objective: larger, and sliding faster
// as the view moves: parallax). The far habitat tile lies below the drop.
//
// Instance layout (16 floats):
//   a0: x0, y0, x1, y1      capsule: its two ends; ellipse: centre, major axis (vector, its length the radius)
//   a1: r, rb, soft, z      radius (capsule) or minor radius (ellipse), edge softness (µm), depth
//   a2: r, g, b, intensity
//   a3: type, glow, glowR, ringW   type 0 capsule, 1 capsule outline, 2 ellipse, 3 ellipse outline
import * as THREE from '../shared/vendor/three.module.min.js';

const F = 16;
const _bg = new THREE.Color();
const VS = /* glsl */`
attribute vec4 a0; attribute vec4 a1; attribute vec4 a2; attribute vec4 a3;
uniform vec4 uView;      // centre x, y; half width, half height (µm)
uniform vec2 uRot;       // cos, sin of the view's turn
uniform float uFocus, uPar, uBlur, uPx, uDim;
varying vec2 vL; varying vec4 vS; varying vec4 vC; varying vec3 vT;
void main() {
  float type = a3.x;
  float dz = a1.w - uFocus;
  float k = max(0.3, 1.0 + uPar * dz);
  float blur = uBlur * abs(dz);
  float soft = a1.z + blur;
  float glowR = a3.z + blur * 0.6;
  vec2 c, ax; float hl, ra, rb;
  if (type < 1.5) {
    c = 0.5 * (a0.xy + a0.zw);
    vec2 d = a0.zw - a0.xy; float L = length(d);
    ax = L > 1e-4 ? d / L : vec2(1.0, 0.0);
    hl = 0.5 * L; ra = a1.x; rb = a1.x;
  } else {
    c = a0.xy; float L = length(a0.zw);
    ax = L > 1e-4 ? a0.zw / L : vec2(1.0, 0.0);
    hl = 0.0; ra = L; rb = a1.y;
  }
  float px = uPx / k;
  float s = max(soft, 0.7 * px);
  // the reach of the soft edge and the halo (exp(-3) ≈ 5 %): no further, every pixel costs
  float gk0 = a3.z / max(glowR, 0.5);
  float haloI = a3.y * gk0 * gk0 * a2.a;
  float pad = s + (haloI > 0.04 ? 3.0 * glowR : 0.0) + a3.w + px;
  vec2 ext = vec2(hl + ra + pad, rb + pad);
  vec2 local = position.xy * ext;
  vec2 w = c + ax * local.x + vec2(-ax.y, ax.x) * local.y;
  vec2 rel = (w - uView.xy) * k;
  vec2 r2 = vec2(rel.x * uRot.x + rel.y * uRot.y, -rel.x * uRot.y + rel.y * uRot.x);
  gl_Position = vec4(r2 / uView.zw, 0.0, 1.0);
  // too faint to see once spread by the defocus (a speck far off the focal plane): no fragments at all
  float wdt = type > 0.5 && type < 1.5 || type > 2.5 ? a3.w : 2.0 * rb;
  float peak = a2.a * clamp(wdt / (1.6 * s), 0.03, 1.0) / (1.0 + uDim * abs(dz)) + haloI;
  if (peak < 0.012) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vL = vec2(local.x, local.y);
  vS = vec4(type < 1.5 ? hl : ra, rb, s, a3.w);
  vC = vec4(a2.rgb, a2.a / (1.0 + uDim * abs(dz)));
  float gk = a3.z / max(glowR, 0.5);
  vT = vec3(type, a3.y * gk * gk, max(glowR, 0.5));
}`;
const FS = /* glsl */`
uniform float uSub, uGain; uniform vec3 uSubTint;
varying vec2 vL; varying vec4 vS; varying vec4 vC; varying vec3 vT;
void main() {
  float type = vT.x;
  float d, width;
  if (type < 1.5) {
    vec2 q = vec2(max(abs(vL.x) - vS.x, 0.0), vL.y);
    d = length(q) - vS.y; width = 2.0 * vS.y;
  } else {
    vec2 q = vL / vec2(vS.x, vS.y);
    d = (length(q) - 1.0) * min(vS.x, vS.y); width = 2.0 * min(vS.x, vS.y);
  }
  bool ring = type > 0.5 && type < 1.5 || type > 2.5;
  if (ring) { d = abs(d) - 0.5 * vS.w; width = vS.w; }
  float s = vS.z;
  float cov = 1.0 - smoothstep(-s, s, d);
  // a line thinner than its blur spreads its light: dimmer, as defocus does
  cov *= clamp(width / (1.6 * s), 0.03, 1.0);
  float halo = vT.y * exp(-max(d, 0.0) / vT.z);
  vec3 col = vC.rgb * vC.a * (cov + halo);
  if (uSub > 0.0) {
    float l = dot(col, vec3(0.3, 0.55, 0.15));
    col = (vec3(l) * 1.1 + (vec3(l) - col) * 0.55) * uSub * uSubTint;
    col = max(col, 0.0);
  } else col *= uGain;
  gl_FragColor = vec4(col, 1.0);
}`;
const BG_VS = /* glsl */`varying vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BG_FS = /* glsl */`
uniform sampler2D uTex; uniform vec4 uView; uniform vec2 uRot; uniform float uK, uScale, uTileUm, uBias;
uniform vec3 uTint;
varying vec2 vN;
void main() {
  vec2 rel = vN * uView.zw;
  vec2 r2 = vec2(rel.x * uRot.x - rel.y * uRot.y, rel.x * uRot.y + rel.y * uRot.x);
  vec2 w = uView.xy + r2 / uScale;
  vec3 c = texture2D(uTex, w / uTileUm, uBias).rgb;
  gl_FragColor = vec4(c * uK * uTint, 1.0);
}`;

export function createShapes(renderer, { max = 70000 } = {}) {
  const data = new Float32Array(max * F);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const buf = new THREE.InstancedInterleavedBuffer(data, F).setUsage(THREE.DynamicDrawUsage);
  for (const [i, name] of ['a0', 'a1', 'a2', 'a3'].entries()) geo.setAttribute(name, new THREE.InterleavedBufferAttribute(buf, 4, i * 4));
  geo.instanceCount = 0;
  const uniforms = {
    uView: { value: new THREE.Vector4(0, 0, 320, 180) }, uRot: { value: new THREE.Vector2(1, 0) },
    uFocus: { value: 0 }, uPar: { value: 0.0009 }, uBlur: { value: 0.07 }, uPx: { value: 0.5 }, uDim: { value: 0.006 },
    uSub: { value: 0 }, uGain: { value: 1 }, uSubTint: { value: new THREE.Vector3(1, 1, 1) },
  };
  const mk = (sub) => new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, uniforms: sub ? { ...uniforms, uSub: { value: 1 } } : uniforms,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: sub ? THREE.ReverseSubtractEquation : THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const addMat = mk(false), subMat = mk(true);
  const addMesh = new THREE.Mesh(geo, addMat), subMesh = new THREE.Mesh(geo, subMat);
  addMesh.frustumCulled = subMesh.frustumCulled = false;
  const scene = new THREE.Scene(), subScene = new THREE.Scene();
  scene.add(addMesh); subScene.add(subMesh);
  const cam = new THREE.Camera();
  // the far habitat tile, below the drop
  const bgU = {
    uTex: { value: null }, uView: uniforms.uView, uRot: uniforms.uRot, uK: { value: 0.3 }, uScale: { value: 0.8 }, uTileUm: { value: 2600 }, uBias: { value: 1.6 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
  };
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: BG_VS, fragmentShader: BG_FS, uniforms: bgU, depthTest: false, depthWrite: false }));
  bgMesh.frustumCulled = false;
  const bgScene = new THREE.Scene();
  bgScene.add(bgMesh);

  let n = 0;
  const api = {
    max, scene, cam,
    get count() { return n; },
    begin() { n = 0; },
    /** One instance (the low-level call). */
    put(type, x0, y0, x1, y1, r, rb, soft, z, cr, cg, cb, I, glow, glowR, ringW) {
      if (n >= max || !(I > 0.002)) return;
      const o = n * F;
      data[o] = x0; data[o + 1] = y0; data[o + 2] = x1; data[o + 3] = y1;
      data[o + 4] = r; data[o + 5] = rb; data[o + 6] = soft; data[o + 7] = z;
      data[o + 8] = cr; data[o + 9] = cg; data[o + 10] = cb; data[o + 11] = I;
      data[o + 12] = type; data[o + 13] = glow; data[o + 14] = glowR; data[o + 15] = ringW;
      n++;
    },
    /** A filled capsule (a line with round ends) from (x0, y0) to (x1, y1), radius r. */
    line(x0, y0, x1, y1, r, z, c, I, soft = 0, glow = 0, glowR = 3) { api.put(0, x0, y0, x1, y1, r, r, soft, z, c[0], c[1], c[2], I, glow, glowR, 0); },
    disc(x, y, r, z, c, I, soft = 0, glow = 0, glowR = 3) { api.put(0, x, y, x, y, r, r, soft, z, c[0], c[1], c[2], I, glow, glowR, 0); },
    ring(x, y, r, w, z, c, I, soft = 0, glow = 0, glowR = 3) { api.put(1, x, y, x, y, r, r, soft, z, c[0], c[1], c[2], I, glow, glowR, w); },
    /** An ellipse centred (x, y), its major axis at angle a, radii ra (along) and rb (across). */
    ell(x, y, a, ra, rb, z, c, I, soft = 0, glow = 0, glowR = 3) { api.put(2, x, y, Math.cos(a) * ra, Math.sin(a) * ra, rb, rb, soft, z, c[0], c[1], c[2], I, glow, glowR, 0); },
    ellRing(x, y, a, ra, rb, w, z, c, I, soft = 0, glow = 0, glowR = 3) { api.put(3, x, y, Math.cos(a) * ra, Math.sin(a) * ra, rb, rb, soft, z, c[0], c[1], c[2], I, glow, glowR, w); },
    end() { buf.needsUpdate = true; buf.addUpdateRange?.(0, n * F); geo.instanceCount = n; },
    /**
     * Set the view: centre (cx, cy), half extents (µm), its turn (radians, the
     * screen's up turned from the slide's +y), the focus depth, µm per pixel.
     */
    setView({ cx, cy, hw, hh, rot = 0, focus = 0, pxUm = 0.5 }) {
      uniforms.uView.value.set(cx, cy, hw, hh);
      uniforms.uRot.value.set(Math.cos(rot), Math.sin(rot));
      uniforms.uFocus.value = focus;
      uniforms.uPx.value = pxUm;
    },
    depth(par, blur, dim) { uniforms.uPar.value = par; uniforms.uBlur.value = blur; uniforms.uDim.value = dim; },
    /** The habitat tile: texture (or null), brightness, its µm across, its parallax scale, its blur (mip bias), a tint. */
    setTile(tex, k = 0.3, tileUm = 2600, scale = 0.8, bias = 1.6, tint = [1, 1, 1]) {
      bgU.uTex.value = tex; bgU.uK.value = k; bgU.uTileUm.value = tileUm; bgU.uScale.value = scale; bgU.uBias.value = bias; bgU.uTint.value.set(...tint);
    },
    /**
     * Draw the field into the current target: clear to bg, the tile, then the
     * shapes: added (add, darkfield and phase's halo) and/or subtracted (sub).
     */
    render(look) {
      const ac = renderer.autoClear;
      renderer.autoClear = false;
      _bg.setRGB(look.bg[0], look.bg[1], look.bg[2], THREE.LinearSRGBColorSpace);
      renderer.setClearColor(_bg, 1);
      renderer.clear(true, true, false);
      if (bgU.uTex.value && bgU.uK.value > 0) renderer.render(bgScene, cam);
      if (look.sub > 0) { subMat.uniforms.uSub.value = look.sub; subMat.uniforms.uSubTint.value.set(...(look.subTint || [1, 1, 1])); renderer.render(subScene, cam); }
      if (look.add > 0) { uniforms.uGain.value = look.add; renderer.render(scene, cam); }
      renderer.autoClear = ac;
    },
  };
  return api;
}

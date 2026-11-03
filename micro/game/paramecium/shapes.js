// The 2D slide's renderer: every shape in the field (filament walls, ribbons,
// granules, outlines, cilia, glows) is one instance of a soft signed-distance
// quad, all in one dynamic buffer and one draw. Darkfield is light scattered
// by each structure on a black field, so the shapes simply add up (additive
// blending: no sorting); the other looks subtract them from a lit field
// (dark structures on grey or ivory, phase's bright halo added on top).
//
// Depth (the owner, 2026-11-02: "not 3 depth levels, just a continuous depth.
// I want it to feel 3D"): each instance carries its depth z (µm) in one
// continuous water volume. The view is a perspective from 1 / uPar µm
// above the swimmer's depth (uFocus): a thing at dz = z − uFocus is scaled
// about the view's centre by 1 / (1 − uPar · dz) (nearer the objective:
// larger, and sliding faster as the view moves; deeper: smaller and slower:
// parallax). What is sharp is the microscope's focal plane (uFocal), which
// lags the swimmer the way a person turns the fine focus (focus.js). Off the
// focal plane a thing is drawn softer (its edge widened by uBlur per µm, which also
// spreads and so dims thin lines, as defocus does) and dimmer (uDim per µm,
// more for what lies deeper), and what lies deeper also sinks into a cool
// haze (uHaze). Soft shadows fall on the slide (shadow(): a second, small
// buffer subtracted from the field before the shapes are added, offset from
// the thing by its height above the slide as by a low lamp: the further
// apart a thing and its shadow, the higher it swims). The player's body art
// (sprite(): MP-P06, a darkfield P. bursaria) is drawn in the same pass,
// added, with the same projection and focus. The far habitat tile lies
// below the drop.
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
uniform float uFocus, uFocal, uPar, uBlur, uPx, uDim, uHaze;
varying vec2 vL; varying vec4 vS; varying vec4 vC; varying vec3 vT;
void main() {
  // a game marker (a tell, a hit, a miss, a warning ring: type + 10) keeps most of its edge out of focus
  float mk = step(9.5, a3.x);
  float type = a3.x - 10.0 * mk;
  // the perspective from the swimmer's depth (uFocus); the focus from the microscope's focal plane (uFocal)
  float dz = a1.w - uFocus;
  float df = a1.w - uFocal;
  float k = 1.0 / max(0.25, 1.0 - uPar * dz);
  float dim = mix(1.0 + uDim * abs(df) * (df < 0.0 ? 1.4 : 0.6), 1.0, mk);
  float blur = uBlur * abs(df) * (1.0 - 0.8 * mk);
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
  float peak = a2.a * clamp(wdt / (1.6 * s), 0.03, 1.0) / dim + haloI;
  if (peak < 0.012) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vL = vec2(local.x, local.y);
  vS = vec4(type < 1.5 ? hl : ra, rb, s, a3.w);
  // deeper than the focus: a cool haze (the water between), and dimmer
  float hz = clamp(-df * uHaze, 0.0, 0.7) * (1.0 - mk);
  vec3 col = mix(a2.rgb, vec3(0.45, 0.62, 0.85) * dot(a2.rgb, vec3(0.33)), hz);
  vC = vec4(col, a2.a / dim);
  // (a halo too faint to pad the quad for is left out, so no quad's edge ever cuts a glow)
  vT = vec3(type, haloI > 0.04 ? a3.y * gk0 * gk0 : 0.0, max(glowR, 0.5));
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
    // the ellipse's distance (a close approximation: k0 (k0 − 1) / k1), right along both axes, so its soft edge ends inside the quad
    vec2 r = vec2(vS.x, vS.y);
    float k0 = length(vL / r), k1 = length(vL / (r * r));
    d = k1 > 1e-6 ? k0 * (k0 - 1.0) / k1 : -min(r.x, r.y); width = 2.0 * min(vS.x, vS.y);
  }
  bool ring = type > 0.5 && type < 1.5 || type > 2.5;
  if (ring) { d = abs(d) - 0.5 * vS.w; width = vS.w; }
  float s = vS.z;
  float cov = 1.0 - smoothstep(-s, s, d);
  // a line thinner than its blur spreads its light: dimmer, as defocus does
  cov *= clamp(width / (1.6 * s), 0.03, 1.0);
  float halo = vT.y * exp(-max(d, 0.0) / vT.z) * (1.0 - smoothstep(2.0 * vT.z, 3.0 * vT.z, d));
  vec3 col = vC.rgb * vC.a * (cov + halo);
  if (uSub > 0.0) {
    float l = dot(col, vec3(0.3, 0.55, 0.15));
    col = (vec3(l) * 1.1 + (vec3(l) - col) * 0.55) * uSub * uSubTint;
    col = max(col, 0.0);
  } else col *= uGain;
  gl_FragColor = vec4(col, 1.0);
}`;
// a shadow on the slide: the shape's coverage only, subtracted (no halo)
const SHADOW_FS = /* glsl */`
uniform vec3 uShadow;
varying vec2 vL; varying vec4 vS; varying vec4 vC; varying vec3 vT;
void main() {
  vec2 r = vec2(vS.x, vS.y);
  float k0 = length(vL / r), k1 = length(vL / (r * r));
  float d = k1 > 1e-6 ? k0 * (k0 - 1.0) / k1 : -min(r.x, r.y);
  if (vT.x < 1.5) { vec2 c = vec2(max(abs(vL.x) - vS.x, 0.0), vL.y); d = length(c) - vS.y; }
  float cov = 1.0 - smoothstep(-vS.z, vS.z, d);
  gl_FragColor = vec4(uShadow * vC.a * cov, 1.0);
}`;
// the body art (a darkfield sprite, keyed and premultiplied at load): a quad at (x, y), turned a, ra x rb µm
const SPRITE_VS = /* glsl */`
attribute vec4 b0; attribute vec4 b1;
uniform vec4 uView; uniform vec2 uRot; uniform float uFocus, uFocal, uPar, uBlur, uPx, uDim;
varying vec2 vUv; varying float vI; varying float vBias; varying vec3 vTint;
attribute vec3 b2;
void main() {
  float dz = b1.z - uFocus;
  float k = 1.0 / max(0.25, 1.0 - uPar * dz);
  vec2 ax = vec2(cos(b0.z), sin(b0.z));
  vec2 local = position.xy * vec2(b0.w, b1.x);
  vec2 w = b0.xy + ax * local.x + vec2(-ax.y, ax.x) * local.y;
  vec2 rel = (w - uView.xy) * k;
  vec2 r2 = vec2(rel.x * uRot.x + rel.y * uRot.y, -rel.x * uRot.y + rel.y * uRot.x);
  gl_Position = vec4(r2 / uView.zw, 0.0, 1.0);
  vUv = position.xy * 0.5 + 0.5;
  float df = b1.z - uFocal;
  vI = b1.y / (1.0 + uDim * abs(df));
  vBias = log2(1.0 + uBlur * abs(df) / max(uPx / k, 0.05));
  vTint = b2;
}`;
const SPRITE_FS = /* glsl */`
uniform sampler2D uTex; uniform float uGain;
varying vec2 vUv; varying float vI; varying float vBias; varying vec3 vTint;
void main() {
  vec3 c = texture2D(uTex, vUv, vBias).rgb;
  // the Chlorella's green turned to this player's shade
  float g = max(0.0, c.g - max(c.r, c.b));
  c += g * (vTint - vec3(0.42, 0.84, 0.22)) * 1.6;
  // fade out toward the quad's border, so a defocused (mip-blurred) cell never shows the quad's edge
  float e = smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.97, vUv.x) * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
  gl_FragColor = vec4(max(c, 0.0) * vI * uGain * e, 1.0);
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

export function createShapes(renderer, { max = 90000, shadowMax = 1500, spriteMax = 8, floorZ = -240 } = {}) {
  const data = new Float32Array(max * F);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const buf = new THREE.InstancedInterleavedBuffer(data, F).setUsage(THREE.DynamicDrawUsage);
  for (const [i, name] of ['a0', 'a1', 'a2', 'a3'].entries()) geo.setAttribute(name, new THREE.InterleavedBufferAttribute(buf, 4, i * 4));
  geo.instanceCount = 0;
  const uniforms = {
    uView: { value: new THREE.Vector4(0, 0, 320, 180) }, uRot: { value: new THREE.Vector2(1, 0) },
    uFocus: { value: 0 }, uFocal: { value: 0 }, uPar: { value: 1 / 900 }, uBlur: { value: 0.07 }, uPx: { value: 0.5 }, uDim: { value: 0.006 }, uHaze: { value: 0.0016 },
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
  // the shadows on the slide: their own small buffer, the same projection, subtracted
  const sdata = new Float32Array(shadowMax * F);
  const sgeo = new THREE.InstancedBufferGeometry();
  sgeo.setAttribute('position', geo.getAttribute('position')); sgeo.setIndex(geo.getIndex());
  const sbuf = new THREE.InstancedInterleavedBuffer(sdata, F).setUsage(THREE.DynamicDrawUsage);
  for (const [i, name] of ['a0', 'a1', 'a2', 'a3'].entries()) sgeo.setAttribute(name, new THREE.InterleavedBufferAttribute(sbuf, 4, i * 4));
  sgeo.instanceCount = 0;
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: SHADOW_FS, uniforms: { ...uniforms, uShadow: { value: new THREE.Vector3(1, 1, 1) } },
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.ReverseSubtractEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const shadowMesh = new THREE.Mesh(sgeo, shadowMat); shadowMesh.frustumCulled = false;
  const shadowScene = new THREE.Scene(); shadowScene.add(shadowMesh);
  let ns = 0;
  // the body art: up to spriteMax quads with one texture
  const SPR = 10;
  const pdata = new Float32Array(spriteMax * SPR);
  const pgeo = new THREE.InstancedBufferGeometry();
  pgeo.setAttribute('position', geo.getAttribute('position')); pgeo.setIndex(geo.getIndex());
  const pbuf = new THREE.InstancedInterleavedBuffer(pdata, SPR).setUsage(THREE.DynamicDrawUsage);
  pgeo.setAttribute('b0', new THREE.InterleavedBufferAttribute(pbuf, 4, 0));
  pgeo.setAttribute('b1', new THREE.InterleavedBufferAttribute(pbuf, 3, 4));
  pgeo.setAttribute('b2', new THREE.InterleavedBufferAttribute(pbuf, 3, 7));
  pgeo.instanceCount = 0;
  const spriteMat = new THREE.ShaderMaterial({
    vertexShader: SPRITE_VS, fragmentShader: SPRITE_FS, uniforms: { ...uniforms, uTex: { value: null }, uGain: { value: 1 } },
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const spriteMesh = new THREE.Mesh(pgeo, spriteMat); spriteMesh.frustumCulled = false;
  const spriteScene = new THREE.Scene(); spriteScene.add(spriteMesh);
  let np = 0;
  // the light's slant: a shadow falls this far (x, y per µm of height) from what casts it
  const SLANT = [0.16, -0.26];
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
    max, scene, cam, floorZ,
    get count() { return n; },
    get shadows() { return ns; },
    begin() { n = 0; ns = 0; np = 0; },
    /**
     * A soft shadow on the slide of an ellipse (or, with rb < 0, a capsule from (x, y) along a for ra µm, radius −rb)
     * at depth z: offset by its height above the slide, softer and fainter the higher it is.
     */
    shadow(x, y, a, ra, rb, z, I = 0.5) {
      if (ns >= shadowMax) return;
      const h = Math.max(0, z - floorZ), k = 1 - Math.min(0.75, h / 700);
      if (I * k < 0.01) return;
      const o = ns * F, ox = x + SLANT[0] * h, oy = y + SLANT[1] * h, soft = 4 + h * 0.09;
      if (rb < 0) { sdata.set([ox, oy, ox + Math.cos(a) * ra, oy + Math.sin(a) * ra, -rb, -rb, soft, floorZ, 1, 1, 1, I * k, 0, 0, 0.5, 0], o); }
      else sdata.set([ox, oy, Math.cos(a) * ra, Math.sin(a) * ra, rb, rb, soft, floorZ, 1, 1, 1, I * k, 2, 0, 0.5, 0], o);
      ns++;
    },
    /** A soft shadow on the slide of a round rod from (x0, y0, z0) to (x1, y1, z1), radius r (each end offset by its own height). */
    shadowSeg(x0, y0, z0, x1, y1, z1, r, I = 0.4) {
      if (ns >= shadowMax) return;
      const h0 = Math.max(0, z0 - floorZ), h1 = Math.max(0, z1 - floorZ), h = (h0 + h1) / 2, k = 1 - Math.min(0.75, h / 700);
      if (I * k < 0.01) return;
      sdata.set([x0 + SLANT[0] * h0, y0 + SLANT[1] * h0, x1 + SLANT[0] * h1, y1 + SLANT[1] * h1, r, r, 4 + h * 0.09, floorZ, 1, 1, 1, I * k, 0, 0, 0.5, 0], ns * F);
      ns++;
    },
    /** The body art: centred (x, y), its long axis at a, w x h µm (the whole image), depth z, intensity, the Chlorella's shade. */
    sprite(x, y, a, w, h, z, I, tint = [0.42, 0.84, 0.22]) {
      if (np >= spriteMax || !spriteMat.uniforms.uTex.value || !(I > 0.003)) return;
      pdata.set([x, y, a, w / 2, h / 2, I, z, tint[0], tint[1], tint[2]], np * SPR);
      np++;
    },
    /** The body art's texture (null: none yet). */
    setSprite(tex) { spriteMat.uniforms.uTex.value = tex; },
    get hasSprite() { return !!spriteMat.uniforms.uTex.value; },
    /** One instance (the low-level call). */
    /** While true, what is drawn is a game marker: it stays legible out of focus (a fifth of the defocus, no dimming or haze). */
    marker: false,
    /** Every intensity drawn is scaled by this (a thing fading in or out: the gradient's ranked scenery). */
    gain: 1,
    put(type, x0, y0, x1, y1, r, rb, soft, z, cr, cg, cb, I, glow, glowR, ringW) {
      I *= api.gain;
      if (n >= max || !(I > 0.002)) return;
      if (api.marker) type += 10;
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
    end() {
      buf.needsUpdate = true; buf.addUpdateRange?.(0, n * F); geo.instanceCount = n;
      sbuf.needsUpdate = true; sgeo.instanceCount = ns;
      pbuf.needsUpdate = true; pgeo.instanceCount = np;
    },
    /**
     * Set the view: centre (cx, cy), half extents (µm), its turn (radians, the
     * screen's up turned from the slide's +y), the depth the perspective is
     * seen from (the swimmer's: focus), the microscope's focal plane (focal:
     * what is sharp; it lags the swimmer, focus.js), µm per pixel.
     */
    setView({ cx, cy, hw, hh, rot = 0, focus = 0, focal = focus, pxUm = 0.5 }) {
      uniforms.uView.value.set(cx, cy, hw, hh);
      uniforms.uRot.value.set(Math.cos(rot), Math.sin(rot));
      uniforms.uFocus.value = focus; uniforms.uFocal.value = focal;
      uniforms.uPx.value = pxUm;
    },
    depth(par, blur, dim, haze = 0) { uniforms.uPar.value = par; uniforms.uBlur.value = blur; uniforms.uDim.value = dim; uniforms.uHaze.value = haze; },
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
      if (ns && look.shadow > 0) { shadowMat.uniforms.uShadow.value.setScalar(look.shadow); renderer.render(shadowScene, cam); }
      if (look.sub > 0) { subMat.uniforms.uSub.value = look.sub; subMat.uniforms.uSubTint.value.set(...(look.subTint || [1, 1, 1])); renderer.render(subScene, cam); }
      if (look.add > 0) { uniforms.uGain.value = look.add; renderer.render(scene, cam); }
      if (np && look.sprite) { spriteMat.uniforms.uGain.value = look.add; renderer.render(spriteScene, cam); }
      renderer.autoClear = ac;
    },
  };
  return api;
}

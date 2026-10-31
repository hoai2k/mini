// springtail-surface: a water surface film seen through a macro lens, from the
// Micro springtail prototype.
//
//  - RippleField: a CPU height field (damped 2D wave equation) for ripples
//    from raindrops, landings and skimming insects, plus a surfactant field
//    that spreads, decays, damps capillary waves where it lies and pushes
//    floating things away from it (Marangoni flow). Uploaded each frame as an
//    RG half-float texture (r = height mm, g = surfactant 0..1). The field is
//    a window that can follow the player (recenter()), so the water itself
//    can be endless; a sponge layer at the window's rim soaks ripples up
//    instead of reflecting them.
//  - Menisci: analytic dimples where things press on the film (feet, a
//    ventral tube, floating grains). Each contact is (x, z, contact radius,
//    depth); the profile falls off logarithmically, like the K0 meniscus of a
//    small load, to zero a few radii out. Not simulated, so they cost nothing
//    and stay smooth at any zoom.
//  - waterMaterial(): shades the film: Fresnel reflection of the sky, sun
//    glints, refraction down to the pool floor (bog-tea absorption on the way),
//    caustics from the surface curvature (dimples throw dark spots with bright
//    rims onto the floor, like a water strider's shadow), and soft shadows of
//    whatever floats. Writes the springtail-macro depth convention, with the
//    refracted floor at its apparent depth so the lens blurs it correctly.
//    For legibility (game, not optics): a boosted Fresnel sky sheen and a
//    broad sun lobe so the film reads as a glossy sheet, a raised meniscus
//    rim where the water meets a shore (shoreGlsl), and the player's drop
//    shadow (springtail-macro's dropShadow) laid on the film itself.
//  - waterGeometry(): a flat grid, fine in the middle and coarse far out, to
//    centre under the camera so the water reaches the horizon.
//
// HOW TO PLUG IT IN
//   import { RippleField, waterMaterial, Dimples } from '../shared/techniques/springtail-surface.js';
//   const field = new RippleField({ size: 80, n: 256, inside: (x, z) => pool(x, z) });
//   const dimples = new Dimples(64);
//   const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 160, 160).rotateX(-Math.PI / 2),
//     waterMaterial({ field, dimples, depthGlsl: 'float poolDepth(vec2 p) { return 3.0; }', floorTex }));
//   each frame: dimples.clear(); dimples.add(x, z, r, depth) ...; field.step(dt); field.upload();
//   field.drop(x, z, radius, amount) for an impulse; field.height(x, z), field.slope(x, z),
//   field.flow(x, z) for gameplay. field.recenter(x, z) each frame to keep the window on the player.
// INPUTS: world units in mm, the surface at y = 0, y up. Needs springtail-macro.js.
import * as THREE from '../vendor/three.module.min.js';
import { MACRO_GLSL, macroShared } from './springtail-macro.js';

export class RippleField {
  /**
   * @param {{size?:number, n?:number, inside?:(x:number,z:number)=>boolean, c2?:number, rate?:number}} o
   *   size: side of the square domain (mm) centred on the origin; n: cells per
   *   side; c2: Courant number squared (<0.5); rate: wave steps per second.
   */
  constructor({ size = 80, n = 256, inside = () => true, c2 = 0.3, rate = 240 } = {}) {
    this.size = size; this.n = n; this.dx = size / n; this.c2 = c2; this.rate = rate;
    this.h = new Float32Array(n * n); this.p = new Float32Array(n * n);
    this.s = new Float32Array(n * n); this.s2 = new Float32Array(n * n);
    this.mask = new Uint8Array(n * n);
    this.inside = inside;
    this.ox = 0; this.oz = 0; // window centre (world mm)
    this.origin = { value: new THREE.Vector2(0, 0) };
    // sponge: extra damping in a rim of cells so ripples die before the edge
    this.sponge = new Float32Array(n * n);
    const W = Math.max(4, Math.round(n / 14));
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const m = Math.min(i, j, n - 1 - i, n - 1 - j);
      this.sponge[i + j * n] = m < W ? 0.12 * ((W - m) / W) ** 2 : 0;
    }
    this.buildMask(0, 0, n);
    this.half = new Uint16Array(n * n * 2);
    this.texture = new THREE.DataTexture(this.half, n, n, THREE.RGFormat, THREE.HalfFloatType);
    this.texture.minFilter = this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.needsUpdate = true;
    this.acc = 0;
    this.damping = 0.006;
    this.surfDecay = 0.25; // per second
    this.surfDiffuse = 0.18;
    this.enabled = true;
  }
  /** Recompute the water mask for rows/columns in the window (all by default). */
  buildMask() {
    const { n, size } = this;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * this.dx - size / 2 + this.ox, z = (j + 0.5) * this.dx - size / 2 + this.oz;
      this.mask[i + j * n] = i > 0 && j > 0 && i < n - 1 && j < n - 1 && this.inside(x, z) ? 1 : 0;
    }
  }
  /**
   * Keep the window centred near (x, z): when the point strays more than
   * `slack` of the window from the centre, shift the fields by whole cells.
   * Ripples that scroll out are lost; new water comes in calm.
   */
  recenter(x, z, slack = 0.12) {
    const { n, dx } = this;
    const di = Math.round((x - this.ox) / dx), dj = Math.round((z - this.oz) / dx);
    if (Math.abs(di) < n * slack && Math.abs(dj) < n * slack) return false;
    for (const name of ['h', 'p', 's']) {
      const a = this[name], b = new Float32Array(n * n);
      for (let j = 0; j < n; j++) {
        const sj = j + dj;
        if (sj < 0 || sj >= n) continue;
        for (let i = 0; i < n; i++) { const si = i + di; if (si >= 0 && si < n) b[i + j * n] = a[si + sj * n]; }
      }
      this[name] = b;
    }
    this.s2 = new Float32Array(n * n);
    this.ox += di * dx; this.oz += dj * dx;
    this.origin.value.set(this.ox, this.oz);
    this.buildMask();
    return true;
  }
  idx(x, z) {
    const i = Math.floor((x - this.ox + this.size / 2) / this.dx), j = Math.floor((z - this.oz + this.size / 2) / this.dx);
    return i < 0 || j < 0 || i >= this.n || j >= this.n ? -1 : i + j * this.n;
  }
  /** Bilinear sample of an array at a world point. */
  sampleArr(a, x, z) {
    const n = this.n;
    const fx = (x - this.ox + this.size / 2) / this.dx - 0.5, fz = (z - this.oz + this.size / 2) / this.dx - 0.5;
    const i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= n - 1 || j >= n - 1) return 0;
    const tx = fx - i, tz = fz - j, k = i + j * n;
    return (a[k] * (1 - tx) + a[k + 1] * tx) * (1 - tz) + (a[k + n] * (1 - tx) + a[k + n + 1] * tx) * tz;
  }
  height(x, z) { return this.sampleArr(this.h, x, z); }
  surf(x, z) { return this.sampleArr(this.s, x, z); }
  /** Surface gradient (dh/dx, dh/dz). */
  slope(x, z) {
    const e = this.dx;
    return [(this.height(x + e, z) - this.height(x - e, z)) / (2 * e), (this.height(x, z + e) - this.height(x, z - e)) / (2 * e)];
  }
  /** Vertical velocity of the surface (mm per wave step). */
  lift(x, z) { return this.sampleArr(this.h, x, z) - this.sampleArr(this.p, x, z); }
  /** Marangoni surface flow (mm/s): from high surfactant toward low. */
  flow(x, z, k = 40) {
    const e = this.dx * 1.5;
    return [-(this.surf(x + e, z) - this.surf(x - e, z)) / (2 * e) * k, -(this.surf(x, z + e) - this.surf(x, z - e)) / (2 * e) * k];
  }
  /** Gaussian push on the surface: negative amount = a depression that rings outward. */
  drop(x, z, radius, amount) {
    const n = this.n, r = Math.max(radius, this.dx);
    const ci = (x - this.ox + this.size / 2) / this.dx - 0.5, cj = (z - this.oz + this.size / 2) / this.dx - 0.5;
    const R = Math.ceil((r * 2.2) / this.dx);
    for (let j = Math.max(1, Math.floor(cj - R)); j <= Math.min(n - 2, Math.ceil(cj + R)); j++) {
      for (let i = Math.max(1, Math.floor(ci - R)); i <= Math.min(n - 2, Math.ceil(ci + R)); i++) {
        const k = i + j * n;
        if (!this.mask[k]) continue;
        const d2 = ((i - ci) ** 2 + (j - cj) ** 2) * this.dx * this.dx;
        this.h[k] += amount * Math.exp(-d2 / (r * r));
      }
    }
  }
  /** Release surfactant (0..1 concentration added over a radius). */
  release(x, z, radius, amount) {
    const n = this.n;
    const ci = (x - this.ox + this.size / 2) / this.dx - 0.5, cj = (z - this.oz + this.size / 2) / this.dx - 0.5;
    const R = Math.ceil((radius * 2) / this.dx);
    for (let j = Math.max(1, Math.floor(cj - R)); j <= Math.min(n - 2, Math.ceil(cj + R)); j++) {
      for (let i = Math.max(1, Math.floor(ci - R)); i <= Math.min(n - 2, Math.ceil(ci + R)); i++) {
        const k = i + j * n;
        if (!this.mask[k]) continue;
        const d2 = ((i - ci) ** 2 + (j - cj) ** 2) * this.dx * this.dx;
        this.s[k] = Math.min(1, this.s[k] + amount * Math.exp(-d2 / (radius * radius)));
      }
    }
  }
  step(dt) {
    if (!this.enabled) return;
    this.acc += dt;
    const sub = 1 / this.rate;
    let steps = 0;
    while (this.acc >= sub && steps < 8) { this.waveStep(); this.acc -= sub; steps++; }
    if (this.acc > sub) this.acc = 0;
    this.surfStep(dt);
  }
  waveStep() {
    const { n, h, p, s, mask, c2, sponge } = this;
    for (let j = 1; j < n - 1; j++) {
      let k = j * n + 1;
      for (let i = 1; i < n - 1; i++, k++) {
        if (!mask[k]) { p[k] = 0; continue; }
        const lap = h[k - 1] + h[k + 1] + h[k - n] + h[k + n] - 4 * h[k];
        const damp = 1 - (this.damping + s[k] * 0.06 + sponge[k]);
        p[k] = (2 * h[k] - p[k] + c2 * lap) * damp;
      }
    }
    // swap: p now holds the new field
    this.p = h; this.h = p;
  }
  surfStep(dt) {
    const { n, mask } = this;
    const a = this.s, b = this.s2;
    const D = Math.min(0.24, this.surfDiffuse * dt * 60 * 0.25), decay = Math.exp(-this.surfDecay * dt);
    for (let j = 1; j < n - 1; j++) {
      let k = j * n + 1;
      for (let i = 1; i < n - 1; i++, k++) {
        if (!mask[k]) { b[k] = 0; continue; }
        const v = a[k];
        const lap = (mask[k - 1] ? a[k - 1] : v) + (mask[k + 1] ? a[k + 1] : v) + (mask[k - n] ? a[k - n] : v) + (mask[k + n] ? a[k + n] : v) - 4 * v;
        b[k] = (v + D * lap) * decay;
      }
    }
    this.s = b; this.s2 = a;
  }
  upload() {
    const { h, s, half } = this;
    const toHalf = THREE.DataUtils.toHalfFloat;
    for (let k = 0, m = h.length; k < m; k++) { half[2 * k] = toHalf(h[k]); half[2 * k + 1] = toHalf(s[k]); }
    this.texture.needsUpdate = true;
  }
  clear() { this.h.fill(0); this.p.fill(0); this.s.fill(0); }
}

/** Contacts on the film, uploaded as a uniform array of (x, z, radius, depth). */
export class Dimples {
  constructor(max = 64) {
    this.max = max;
    this.list = Array.from({ length: max }, () => new THREE.Vector4());
    this.uniforms = { uDimples: { value: this.list }, uDimpleN: { value: 0 } };
    this.n = 0;
    this.scale = 1;
  }
  clear() { this.n = 0; this.uniforms.uDimpleN.value = 0; }
  /** depth > 0 presses the film down; depth < 0 is a meniscus climbing a wetted object. */
  add(x, z, r, depth) {
    if (this.n >= this.max || !depth) return;
    this.list[this.n++].set(x, z, r, depth * this.scale);
    this.uniforms.uDimpleN.value = this.n;
  }
  /** CPU copy of the GLSL profile (mm, negative down), for placing things on the film. */
  height(x, z) {
    let h = 0;
    for (let i = 0; i < this.n; i++) {
      const d = this.list[i];
      const r2 = (x - d.x) ** 2 + (z - d.y) ** 2, a2 = d.z * d.z, R2 = a2 * 36;
      if (r2 >= R2) continue;
      const g = Math.log((R2 + a2) / (r2 + a2)) / Math.log((R2 + a2) / a2);
      const q = 1 - r2 / R2;
      h -= d.w * g * q * q;
    }
    return h;
  }
}

/** GLSL for the dimple field (needs uniforms uDimples[MAXD], uDimpleN). */
export const DIMPLE_GLSL = /* glsl */ `
uniform vec4 uDimples[MAXD];
uniform int uDimpleN;
// height (mm) and gradient of all menisci at p
float dimpleField(vec2 p, out vec2 grad) {
  float h = 0.0; grad = vec2(0.0);
  for (int i = 0; i < MAXD; i++) {
    if (i >= uDimpleN) break;
    vec4 d = uDimples[i];
    vec2 q = p - d.xy;
    float r2 = dot(q, q), a2 = d.z * d.z, R2 = a2 * 36.0;
    if (r2 >= R2) continue;
    float D = log((R2 + a2) / a2);
    float g = log((R2 + a2) / (r2 + a2)) / D;
    float w = 1.0 - r2 / R2;
    float w2 = w * w;
    h -= d.w * g * w2;
    // d/dr divided by r: (g' w2 + g * 2w * w')/r with g' = -2r/((r2+a2)D), w' = -2r/R2
    float dr = -2.0 / ((r2 + a2) * D) * w2 + g * 2.0 * w * (-2.0 / R2);
    grad -= d.w * dr * q;
  }
  return h;
}
float dimpleH(vec2 p) { vec2 g; return dimpleField(p, g); }
`;

const WATER_VS = /* glsl */ `
uniform sampler2D uField; uniform float uFieldSize, uRippleK; uniform vec2 uFieldOrigin;
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 uv = (wp.xz - uFieldOrigin) / uFieldSize + 0.5;
  wp.y += texture2D(uField, uv).r * uRippleK;
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const WATER_FS = /* glsl */ `
${MACRO_GLSL}
${DIMPLE_GLSL}
uniform sampler2D uField, uFloor;
uniform float uFieldSize, uFieldTexel, uRippleK, uFloorScale, uCaustics, uShowSurf, uHasSurfTex, uSheen, uMeniscus;
uniform vec2 uFieldOrigin;
uniform sampler2D uSurfTex;
uniform vec3 uAbsorb;
varying vec3 vWorld;
POOL_DEPTH
SHORE_DIST
vec2 fieldUv(vec2 p) { return (p - uFieldOrigin) / uFieldSize + 0.5; }
float rippleH(vec2 p) { return texture2D(uField, fieldUv(p)).r * uRippleK; }
// the meniscus climbing a wetted shore: water rises ~uMeniscus mm at the edge
float shoreH(vec2 p) { float d = shoreDist(p); return d > 3.0 ? 0.0 : uMeniscus * exp(-max(d, 0.0) / 0.32); }
float totalH(vec2 p) { return rippleH(p) + dimpleH(p); }
vec3 floorColor(vec2 p) {
  vec3 c = texture2D(uFloor, p * uFloorScale).rgb;
  if (uHasSurfTex > 0.5) c = mix(c, texture2D(uSurfTex, p * uFloorScale * 0.7).rgb, 0.55);
  return c;
}
void main() {
  vec2 p = vWorld.xz;
  float e = uFieldTexel;
  vec2 rg = vec2(rippleH(p + vec2(e, 0.0)) - rippleH(p - vec2(e, 0.0)), rippleH(p + vec2(0.0, e)) - rippleH(p - vec2(0.0, e))) / (2.0 * e);
  vec2 dg; float dh = dimpleField(p, dg);
  float m0 = shoreH(p);
  vec2 mg = vec2(shoreH(p + vec2(0.05, 0.0)) - shoreH(p - vec2(0.05, 0.0)), shoreH(p + vec2(0.0, 0.05)) - shoreH(p - vec2(0.0, 0.05))) / 0.1;
  dh += m0;
  vec2 g = rg + dg + mg;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 P = vec3(p.x, vWorld.y + dh, p.y);
  vec3 V = normalize(cameraPosition - P);
  float surf = texture2D(uField, fieldUv(p)).g;
  float nv = max(dot(N, V), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  // legibility: a boosted sky sheen so the film reads as a surface, not as the floor
  F = clamp(F + uSheen * (0.06 + 0.5 * pow(1.0 - nv, 3.0)), 0.0, 1.0);
  // reflection: sky and the bog around, plus the sun as a tiny bright disc
  vec3 R = reflect(-V, N);
  vec3 refl = envSky(R);
  float sunA = max(dot(R, uSunDir), 0.0);
  // a sharp sun disc (glints that bloom into bokeh) and a soft halo
  float sharp = mix(1800.0, 4000.0, surf);
  refl += uSunCol * (pow(sunA, sharp) * 40.0 + pow(sunA, 120.0) * 0.6 + pow(sunA, 14.0) * 0.18 * uSheen);
  // refraction to the floor
  vec3 T = refract(-V, N, 1.0 / 1.333);
  float depth = poolDepth(p);
  float t = depth / max(-T.y, 0.05);
  vec2 fp = p + T.xz * t;
  // light reaching that floor point came through the surface above it, offset toward the sun
  vec3 Ls = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0 / 1.333);
  vec2 sp = fp - Ls.xz / Ls.y * depth;
  float c = 1.0;
  if (uCaustics > 0.5) {
    float s0 = totalH(sp), sx = totalH(sp + vec2(e, 0.0)) + totalH(sp - vec2(e, 0.0)), sz = totalH(sp + vec2(0.0, e)) + totalH(sp - vec2(0.0, e));
    float lap = (sx + sz - 4.0 * s0) / (e * e);
    c = clamp(1.0 / max(1.0 + lap * depth * 0.25, 0.12), 0.15, 5.0);
  }
  float shade = casterShadow(vec3(sp.x, 0.0, sp.y)) * dropShadow(vec3(fp.x, -depth, fp.y));
  vec3 fcol = floorColor(fp);
  vec3 fl = fcol * (uSunCol * max(uSunDir.y, 0.0) * c * shade * 0.85 + mix(uSkyHor, uSkyTop, 0.5) * 0.35);
  float path = t + depth / max(Ls.y, 0.2) * 0.6;
  vec3 trans = exp(-uAbsorb * path);
  vec3 refr = fl * trans + vec3(0.05, 0.035, 0.012) * (1.0 - trans) * (uSkyHor.g + uSunCol.g * 0.2) * 0.25;
  vec3 col = mix(refr, refl, F);
  if (uRing > 0.0) col += uRing * 0.05 * pow(nv, 40.0);
  // the shore meniscus catches the sky as a bright line, then a wet dark band
  float sd = shoreDist(p);
  col += mix(uSkyHor, uSkyTop, 0.4) * 0.35 * uSheen * exp(-max(sd, 0.0) / 0.12);
  col *= 1.0 - 0.3 * uSheen * smoothstep(0.1, 0.5, sd) * exp(-max(sd, 0.0) / 1.6);
  // the player's drop shadow on the film itself (a readable cue, not optics)
  col *= mix(1.0, dropShadow(P), 0.85);
  if (uShowSurf > 0.5) col = mix(col, vec3(0.9, 0.85, 0.2) * (0.3 + uSunCol.g * 0.15), smoothstep(0.02, 0.3, surf) * 0.55);
  // depth for the lens: reflections at the surface, the floor at its apparent depth
  float lr = dot(refl * F, vec3(0.3, 0.5, 0.2)), lt = dot(refr * (1.0 - F), vec3(0.3, 0.5, 0.2));
  float dS = distance(P, cameraPosition);
  float dF = dS + t / 1.333;
  float d = (lr * dS + lt * dF) / max(lr + lt, 1e-4);
  gl_FragColor = vec4(min(col, vec3(200.0)), d - uFocus);
}`;

/**
 * The water film material.
 * depthGlsl: GLSL defining `float poolDepth(vec2 p)` (mm below the surface).
 * floorTex: the pool floor's colour texture (repeat-wrapped); floorScale: repeats per mm.
 */
export function waterMaterial({ field, dimples, depthGlsl, shoreGlsl = 'float shoreDist(vec2 p) { return 1e3; }', floorTex, floorScale = 1 / 24, surfTex = null }) {
  const uniforms = {
    ...macroShared,
    ...dimples.uniforms,
    uField: { value: field.texture },
    uFieldSize: { value: field.size },
    uFieldOrigin: field.origin,
    uSheen: { value: 1 },
    uMeniscus: { value: 0.18 },
    uFieldTexel: { value: field.dx },
    uRippleK: { value: 1 },
    uFloor: { value: floorTex },
    uFloorScale: { value: floorScale },
    uCaustics: { value: 1 },
    uShowSurf: { value: 0 },
    uSurfTex: { value: surfTex },
    uHasSurfTex: { value: surfTex ? 1 : 0 },
    uAbsorb: { value: new THREE.Vector3(0.1, 0.19, 0.4) },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    defines: { MAXD: dimples.max },
    vertexShader: WATER_VS,
    fragmentShader: WATER_FS.replace('POOL_DEPTH', depthGlsl).replace('SHORE_DIST', shoreGlsl),
  });
}

/**
 * A flat water grid on y = 0 centred on the origin: `segs` cells a side,
 * spaced `fine` mm near the middle and widening to reach `radius` mm, so a
 * mesh re-centred under the camera every frame carries fine ripples close up
 * and still reaches the horizon.
 */
export function waterGeometry({ segs = 200, fine = 0.45, radius = 900 } = {}) {
  const g = new THREE.PlaneGeometry(2, 2, segs, segs).rotateX(-Math.PI / 2);
  const a = (fine * segs) / 2; // mm per unit u at the centre
  const b = radius - a;
  const map = (u) => a * u + b * u * u * u * u * u;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { p.setX(i, map(p.getX(i))); p.setZ(i, map(p.getZ(i))); }
  g.computeBoundingSphere();
  return g;
}

/** A procedural peat floor: dark humus, sunken Sphagnum leaves and twigs, sand. */
export function peatFloorTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#3a2716';
  g.fillRect(0, 0, size, size);
  const wrap = (fn) => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
  for (let i = 0; i < 900; i++) {
    const x = rnd() * size, y = rnd() * size, r = 2 + rnd() * 22;
    const l = 14 + rnd() * 22;
    g.fillStyle = `hsla(${24 + rnd() * 18}, ${30 + rnd() * 30}%, ${l}%, ${0.15 + rnd() * 0.3})`;
    wrap(() => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
  }
  // sunken dead Sphagnum leaves: pale, boat-shaped
  for (let i = 0; i < 240; i++) {
    const x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI, L = 6 + rnd() * 12;
    const hue = rnd() < 0.7 ? 40 + rnd() * 30 : 80 + rnd() * 30;
    g.fillStyle = `hsla(${hue}, ${25 + rnd() * 30}%, ${30 + rnd() * 25}%, ${0.5 + rnd() * 0.4})`;
    wrap(() => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, L, L * 0.32, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
  }
  // twigs and stems
  g.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI * 2, L = 30 + rnd() * 90;
    g.strokeStyle = `hsla(${20 + rnd() * 20}, 40%, ${14 + rnd() * 18}%, 0.85)`;
    g.lineWidth = 2 + rnd() * 4;
    wrap(() => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * L * 0.5, y + Math.sin(a + 0.4) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); });
  }
  // fine sand and diatom-pale specks
  for (let i = 0; i < 2500; i++) {
    const x = rnd() * size, y = rnd() * size;
    g.fillStyle = `hsla(${30 + rnd() * 20}, 20%, ${40 + rnd() * 40}%, ${0.3 + rnd() * 0.5})`;
    g.fillRect(x, y, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

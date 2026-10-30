// Differential interference contrast (Nomarski) microscopy, with a real
// focal plane, for transparent subjects. From the tardigrade prototype.
//
// How it works
// 1. Optical-path buffers. Every transparent object is drawn with an optical
//    material into a 2-texture float render target (MRT), additively, double
//    sided, no depth test. Each pixel ends up holding line-of-sight integrals:
//      tex 0  r = optical path difference  Σ Δn·thickness
//             g = Σ z·thickness   (z = view depth minus a reference depth)
//             b = Σ thickness     (so g/b is the mean depth of the pixel)
//      tex 1  rgb = absorbance (pigment), a = direct intensity offset
//    Thickness comes free from CLOSED meshes: front faces add -z, back faces
//    +z, so the sum is the chord through the object. Open meshes leave a
//    residue; close them (SDF meshes, extruded shapes and spheres are fine).
// 2. Defocus. Each layer (a camera layer, e.g. substrate vs. specimen) is
//    blurred with a gather blur whose radius comes from its own mean depth
//    relative to the focal plane: turn the fine focus and one layer sharpens
//    while the other dissolves.
// 3. Composite. Two beams sheared a fraction of a micrometre apart interfere:
//      I = sin²(π (Γ_bias + shear · ∂OPD/∂x_shear) / λ)
//    evaluated at three wavelengths (warm/cool fringes), times exp(-absorbance).
//    The relief is the gradient of optical path along one fixed direction on
//    screen, NOT height or lighting: dense organelles stand up like ridges.
//    Also: brightfield (absorbance with weak refractive edges that grow with
//    defocus), a backdrop texture, camera grain and a vignette.
//
// Interface
//   import { OPT, opticalMaterial, OPTICAL_BLEND, OPTICAL_VERT, OPTICAL_FRAG_HEAD,
//            DicMicroscope } from '../shared/techniques/tardigrade-dic.js';
//   mesh.material = opticalMaterial({ dn: 0.03, absorb: [r, g, b] });   // per unit thickness
//   (custom optical materials: RawShaderMaterial({ ...OPTICAL_BLEND, uniforms: { uRef: OPT.uRef, ... },
//    vertexShader: OPTICAL_VERT, fragmentShader: OPTICAL_FRAG_HEAD + body writing oOpd / oAbs }))
//   mesh.layers.set(1 or 2)        // two depth layers, each defocused separately
//   const mic = new DicMicroscope(renderer, scene, camera, { layers: [1, 2], backdrop: { value: tex } });
//   mic.setSize(drawingBufferWidth, drawingBufferHeight);
//   each frame: mic.render({ ref, focus, cocPerUnit, dof, pxPerUnit, time, backOff: Vector3 });
//     ref        reference depth (e.g. distance camera → subject); keeps floats small
//     focus      focal plane, relative to ref (scene units)
//     cocPerUnit blur radius in px (at 720p) per unit of defocus; dof = half depth of field
//     pxPerUnit  screen px per scene unit at the subject (makes relief scale-independent)
//     fill       optional: fill(rtA) writes both attachments of layer A itself (e.g. an
//                adapter from another pipeline's buffers, see adapters.js) instead
//                of rendering the scene; layer B is left empty
//     buffersOnly optional: stop after the defocus blur and return { a, b } (the
//                blurred 2-texture targets) instead of composing an image
//   Options (live): mic.mode 0 DIC / 1 brightfield; mic.opts = { dof, grain, vignette, fringes,
//     backdrop, shear (nm), bias (nm), angle (shear direction, radians) }.
//   Performance: mic.setQuality(0..3), or mic.autoQuality(dt) every frame.
//   Lit or other looks: render your own way instead of calling render().
import * as THREE from '../vendor/three.module.min.js';

/** Shared by every optical material: the reference depth. */
export const OPT = { uRef: { value: 10 } };

export const OPTICAL_BLEND = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  depthTest: false, depthWrite: false, side: THREE.DoubleSide, transparent: true,
  glslVersion: THREE.GLSL3,
};

export const OPTICAL_VERT = /* glsl */ `
precision highp float;
in vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out float vDepth;
out vec3 vLocal;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  vLocal = position;
  gl_Position = projectionMatrix * mv;
}`;

export const OPTICAL_FRAG_HEAD = /* glsl */ `
precision highp float;
in float vDepth;
in vec3 vLocal;
uniform float uRef;
layout(location = 0) out vec4 oOpd;
layout(location = 1) out vec4 oAbs;
`;

/** A plain transparent body: refractive index step dn, absorbance per unit thickness. */
export function opticalMaterial({ dn = 0.03, absorb = [0, 0, 0] } = {}) {
  return new THREE.RawShaderMaterial({
    ...OPTICAL_BLEND,
    uniforms: { uRef: OPT.uRef, uDn: { value: dn }, uAbs: { value: new THREE.Vector3(...absorb) } },
    vertexShader: OPTICAL_VERT,
    fragmentShader: OPTICAL_FRAG_HEAD + /* glsl */ `
uniform float uDn;
uniform vec3 uAbs;
void main() {
  float s = gl_FrontFacing ? -1.0 : 1.0;
  float z = vDepth - uRef;
  oOpd = vec4(s * z * uDn, s * z * z * 0.5, s * z, 0.0);
  oAbs = vec4(s * z * uAbs, 0.0);
}`,
  });
}

const FS_VERT = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BLUR_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tOpd;
uniform sampler2D tAbs;
uniform vec2 uRes;
uniform float uCoc;
uniform float uMaxR;
uniform float uFocus;
uniform float uDof;
uniform int uTaps;
layout(location = 0) out vec4 oOpd;
layout(location = 1) out vec4 oAbs;
float coc(vec4 o) {
  if (o.b < 1e-4) return 0.0;
  float z = o.g / o.b;
  return clamp((abs(z - uFocus) - uDof) * uCoc, 0.0, uMaxR);
}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  vec4 c0 = texture(tOpd, vUv);
  vec4 a0 = texture(tAbs, vUv);
  if (uMaxR < 0.5) { oOpd = c0; oAbs = a0; return; }
  float cself = coc(c0);
  vec4 sumO = c0, sumA = a0;
  float wsum = 1.0;
  float rot = ign(gl_FragCoord.xy) * 6.2831;
  for (int i = 1; i < 48; i++) {
    if (i >= uTaps) break;
    float fi = float(i);
    float r = sqrt(fi / float(uTaps)) * uMaxR;
    float a = fi * 2.39996 + rot;
    vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes;
    vec4 o = texture(tOpd, uv);
    // A sample spreads here if its blur circle reaches this far; empty samples
    // count where this pixel itself is defocused, so edges soften both ways.
    float w = o.b < 1e-4 ? clamp(cself - r + 1.0, 0.0, 1.0) : clamp(coc(o) - r + 1.0, 0.0, 1.0);
    sumO += o * w;
    sumA += texture(tAbs, uv) * w;
    wsum += w;
  }
  oOpd = sumO / wsum;
  oAbs = sumA / wsum;
}`;

const COMP_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tOpdA, tAbsA, tOpdB, tAbsB, tBack;
uniform vec2 uRes;
uniform int uMode;
uniform float uPxPerUnit;
uniform float uShear;
uniform float uBias;
uniform vec2 uDir;
uniform float uTime;
uniform vec3 uBackOff;
uniform float uGrain, uVignette, uFringes, uBackdrop;
out vec4 fragColor;
float opd(vec2 uv) { return texture(tOpdA, uv).r + texture(tOpdB, uv).r; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 px = 1.0 / uRes;
  vec4 aA = texture(tAbsA, vUv), aB = texture(tAbsB, vUv);
  vec3 absb = aA.rgb + aB.rgb;
  float direct = aA.a + aB.a;
  float back = (texture(tBack, vUv * uBackOff.z + uBackOff.xy).r - 0.5) * uBackdrop;
  vec3 col;
  if (uMode == 0) {
    vec2 s = uDir * px * 1.5;
    float g = (opd(vUv + s) - opd(vUv - s)) / (3.0 / uPxPerUnit);
    // Strong steps (menisci, leaf margins) saturate softly instead of clipping.
    float gamma = uBias + 230.0 * tanh(uShear * g / 230.0) + back * 40.0;
    vec3 lam = mix(vec3(540.0), vec3(630.0, 540.0, 465.0), uFringes);
    vec3 I = sin(3.14159265 * gamma / lam); I = I * I;
    float I0 = sin(3.14159265 * uBias / 540.0); I0 = I0 * I0;
    col = vec3(0.56) * I / I0;
    col = mix(col, vec3(dot(col, vec3(0.333))), 0.35);
    col *= exp(-absb * 0.9);
    col += direct * 0.6;
    col *= vec3(1.02, 1.0, 0.95);
  } else {
    float c = opd(vUv);
    float xp = opd(vUv + vec2(px.x, 0.0)), xm = opd(vUv - vec2(px.x, 0.0));
    float yp = opd(vUv + vec2(0.0, px.y)), ym = opd(vUv - vec2(0.0, px.y));
    float l = xp + xm + yp + ym - 4.0 * c;
    vec2 gr = vec2(xp - xm, yp - ym) * uPxPerUnit * 0.5;
    col = vec3(0.92, 0.9, 0.82) * (1.0 + back * 0.08);
    col *= exp(-absb * 1.25);
    col *= 1.0 - clamp(length(gr) * 1.4, 0.0, 0.45);
    col *= 1.0 + clamp(l * uPxPerUnit * uPxPerUnit * 0.02, -0.25, 0.25);
    col += direct * 0.4;
  }
  col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.025 * uGrain;
  vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
  col *= 1.0 - 0.28 * uVignette * smoothstep(0.35, 0.95, length(q));
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class DicMicroscope {
  constructor(renderer, scene, camera, { layers = [1, 2], backdrop = null, scale = 0.7 } = {}) {
    Object.assign(this, { renderer, scene, camera, layers, scale });
    this.mode = 0;
    this.opts = { dof: true, grain: true, vignette: true, fringes: true, backdrop: true, shear: 260, bias: 95, angle: Math.PI / 4 };
    renderer.extensions.get('EXT_color_buffer_float');
    this.type = renderer.extensions.get('EXT_float_blend') ? THREE.FloatType : THREE.HalfFloatType;
    const mk = this.mk = (w = 4, h = 4) => {
      const rt = new THREE.WebGLRenderTarget(w, h, { count: 2, type: this.type, format: THREE.RGBAFormat, depthBuffer: false });
      for (const t of rt.textures) { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; }
      return rt;
    };
    this.rt = { a: mk(), b: mk(), ab: mk(), bb: mk() };
    if (!backdrop) {
      const t = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
      t.needsUpdate = true;
      backdrop = { value: t };
    }
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.fsCam = new THREE.Camera();
    const raw = (frag, uniforms) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false, uniforms });
    this.blurMat = raw(BLUR_FRAG, { tOpd: { value: null }, tAbs: { value: null }, uRes: { value: new THREE.Vector2() }, uCoc: { value: 10 }, uMaxR: { value: 16 }, uFocus: { value: 0 }, uDof: { value: 0.05 }, uTaps: { value: 36 } });
    this.compMat = raw(COMP_FRAG, {
      tOpdA: { value: null }, tAbsA: { value: null }, tOpdB: { value: null }, tAbsB: { value: null },
      tBack: backdrop, uRes: { value: new THREE.Vector2() }, uMode: { value: 0 }, uPxPerUnit: { value: 100 },
      uShear: { value: 260 }, uBias: { value: 95 }, uDir: { value: new THREE.Vector2(0.7071, 0.7071) }, uTime: { value: 0 },
      uBackOff: { value: new THREE.Vector3(0, 0, 1) }, uGrain: { value: 1 }, uVignette: { value: 1 }, uFringes: { value: 1 }, uBackdrop: { value: 1 },
    });
    this.fsScene = new THREE.Scene();
    this.fsMesh = new THREE.Mesh(tri, this.blurMat);
    this.fsMesh.frustumCulled = false;
    this.fsScene.add(this.fsMesh);
    this.quality = 2;
  }

  /**
   * Quality level 0 (cheapest) .. 3: optical buffer resolution and blur taps.
   * Call autoQuality(dt) each frame to adapt to the machine.
   */
  setQuality(q) {
    this.quality = Math.max(0, Math.min(3, q));
    this.scale = [0.4, 0.55, 0.7, 0.85][this.quality];
    this.blurMat.uniforms.uTaps.value = [10, 16, 26, 36][this.quality];
    if (this.out) this.setSize(this.out.x, this.out.y);
  }

  autoQuality(dt) {
    const a = (this._aq ||= { t: 0, n: 0, sum: 0, cool: 2 });
    a.t += dt; a.n++; a.sum += dt; a.cool -= dt;
    if (a.t < 1) return;
    const avg = a.sum / a.n;
    if (a.cool <= 0 && avg > 1 / 30 && this.quality > 0) { this.setQuality(this.quality - 1); a.cool = 1.5; }
    else if (a.cool <= 0 && avg < 1 / 55 && this.quality < 3) { this.setQuality(this.quality + 1); a.cool = 4; }
    a.t = 0; a.n = 0; a.sum = 0;
  }

  setSize(w, h) {
    const W = Math.max(4, Math.round(w * this.scale)), H = Math.max(4, Math.round(h * this.scale));
    // Fresh targets rather than setSize: resizing multi-attachment float
    // targets in place proved very slow on some drivers (SwiftShader).
    for (const k in this.rt) { this.rt[k].dispose(); this.rt[k] = this.mk(W, H); }
    this.size = new THREE.Vector2(W, H);
    this.out = new THREE.Vector2(w, h);
  }

  render(p) {
    const r = this.renderer, cam = this.camera, o = this.opts;
    OPT.uRef.value = p.ref;
    const prevClear = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha();
    const prevMask = cam.layers.mask;
    r.setClearColor(0x000000, 0);
    const pass = (layer, rt) => {
      cam.layers.set(layer);
      r.setRenderTarget(rt);
      r.clear(true, false, false);
      if (layer !== undefined) r.render(this.scene, cam);
    };
    if (p.fill) {
      pass(undefined, this.rt.a);
      pass(undefined, this.rt.b);
      p.fill(this.rt.a);
    } else {
      pass(this.layers[0], this.rt.a);
      pass(this.layers[1], this.rt.b);
    }
    cam.layers.mask = prevMask;
    const scale = this.size.y / 720;
    const bu = this.blurMat.uniforms;
    bu.uRes.value.copy(this.size);
    bu.uCoc.value = p.cocPerUnit * scale;
    bu.uMaxR.value = o.dof ? Math.min(22, 18 * scale + 2) : 0;
    bu.uFocus.value = p.focus;
    bu.uDof.value = p.dof;
    this.fsMesh.material = this.blurMat;
    const blur = (src, dst) => {
      bu.tOpd.value = src.textures[0]; bu.tAbs.value = src.textures[1];
      r.setRenderTarget(dst);
      r.render(this.fsScene, this.fsCam);
    };
    blur(this.rt.a, this.rt.ab);
    blur(this.rt.b, this.rt.bb);
    if (p.buffersOnly) {
      r.setRenderTarget(null);
      r.setClearColor(prevClear, prevA);
      return { a: this.rt.ab, b: this.rt.bb };
    }
    const cu = this.compMat.uniforms;
    cu.tOpdA.value = this.rt.ab.textures[0]; cu.tAbsA.value = this.rt.ab.textures[1];
    cu.tOpdB.value = this.rt.bb.textures[0]; cu.tAbsB.value = this.rt.bb.textures[1];
    cu.uRes.value.copy(this.size);
    cu.uMode.value = this.mode;
    cu.uPxPerUnit.value = p.pxPerUnit * (this.size.y / this.out.y);
    cu.uTime.value = p.time;
    if (p.backOff) cu.uBackOff.value.copy(p.backOff);
    cu.uShear.value = o.shear; cu.uBias.value = o.bias;
    cu.uDir.value.set(Math.cos(o.angle), Math.sin(o.angle));
    cu.uGrain.value = o.grain ? 1 : 0; cu.uVignette.value = o.vignette ? 1 : 0;
    cu.uFringes.value = o.fringes ? 1 : 0; cu.uBackdrop.value = o.backdrop ? 1 : 0;
    this.fsMesh.material = this.compMat;
    r.setRenderTarget(null);
    r.setClearColor(prevClear, prevA);
    r.render(this.fsScene, this.fsCam);
  }
}

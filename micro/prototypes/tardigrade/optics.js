// The microscope.
//
// DIC (Nomarski): two layers (the leaves, and the animal with everything in
// the film) are rendered into optical-path buffers (see materials.js). Each
// layer is defocused by its distance from the focal plane (a gather blur
// whose radius comes from the layer's mean depth per pixel), then summed. The
// image is the interference of two beams sheared a fraction of a micrometre
// apart: I = sin²(π (Γ_bias + s·∂OPD/∂x_shear) / λ), evaluated at three
// wavelengths, which gives DIC's grey field, its one-sided relief and its
// faint warm/cool fringes. The relief is a gradient of optical path, not of
// height: a dense organelle "stands up" exactly like a ridge would.
//
// Brightfield: absorbance with weak refractive edges that grow with defocus.
// Lit: the "hypothetical immersive" look, an ordinary lit render.
import * as THREE from '../shared/vendor/three.module.min.js';
import { OPT } from './materials.js';
import { LAYER_SUBSTRATE, LAYER_SPECIMEN } from './world.js';

export const MODES = ['DIC (Nomarski)', 'Brightfield', 'Lit (hypothetical)'];

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
uniform float uCoc;   // px of blur radius per unit of defocus
uniform float uMaxR;  // px
uniform float uFocus; // focal plane, relative to the reference depth
uniform float uDof;   // half depth of field (units)
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
  vec4 sumO = c0, sumA = a0;
  float wsum = 1.0;
  float rot = ign(gl_FragCoord.xy) * 6.2831;
  const int N = 36;
  for (int i = 1; i < N; i++) {
    float fi = float(i);
    float r = sqrt(fi / float(N)) * uMaxR;
    float a = fi * 2.39996 + rot;
    vec2 off = vec2(cos(a), sin(a)) * r;
    vec2 uv = vUv + off / uRes;
    vec4 o = texture(tOpd, uv);
    float cr = coc(o);
    // A sample spreads to here if its own blur circle is at least this far.
    float w = clamp(cr - r + 1.0, 0.0, 1.0);
    // Empty samples count where this pixel itself is defocused (softens edges both ways).
    float cself = coc(c0);
    float w2 = o.b < 1e-4 ? clamp(cself - r + 1.0, 0.0, 1.0) : w;
    sumO += o * w2;
    sumA += texture(tAbs, uv) * w2;
    wsum += w2;
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
uniform float uShear;     // shear distance (nm) times exaggeration
uniform float uBias;      // bias retardation (nm)
uniform vec2 uDir;        // shear direction on screen
uniform float uTime;
uniform vec3 uBackOff;    // backdrop parallax (xy) and scale
out vec4 fragColor;
float opd(vec2 uv) { return texture(tOpdA, uv).r + texture(tOpdB, uv).r; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 px = 1.0 / uRes;
  vec4 aA = texture(tAbsA, vUv), aB = texture(tAbsB, vUv);
  vec3 absb = aA.rgb + aB.rgb;
  float direct = aA.a + aB.a;
  float back = texture(tBack, vUv * uBackOff.z + uBackOff.xy).r - 0.5;
  vec3 col;
  if (uMode == 0) {
    vec2 s = uDir * px * 1.5;
    // Slope of the optical path along the shear: units/units = dimensionless.
    float g = (opd(vUv + s) - opd(vUv - s)) / (3.0 / uPxPerUnit);
    float gamma = uBias + uShear * g + back * 40.0;
    vec3 lam = vec3(630.0, 540.0, 465.0);
    vec3 I = sin(3.14159265 * gamma / lam);
    I = I * I;
    vec3 I0 = sin(3.14159265 * uBias / lam); I0 = I0 * I0;
    col = vec3(0.56) * I / I0.g;            // grey field at the bias
    col = mix(col, vec3(dot(col, vec3(0.333))), 0.35); // DIC prisms + camera: mostly neutral
    col *= exp(-absb * 0.9);
    col += direct * 0.6;
    col *= vec3(1.02, 1.0, 0.95);           // faint warm cast of the lamp
  } else {
    // Brightfield: pigment, plus refraction showing at edges and when defocused.
    float c = opd(vUv);
    float l = opd(vUv + vec2(px.x, 0.0)) + opd(vUv - vec2(px.x, 0.0)) + opd(vUv + vec2(0.0, px.y)) + opd(vUv - vec2(0.0, px.y)) - 4.0 * c;
    vec2 gr = vec2(opd(vUv + vec2(px.x, 0.0)) - opd(vUv - vec2(px.x, 0.0)), opd(vUv + vec2(0.0, px.y)) - opd(vUv - vec2(0.0, px.y))) * uPxPerUnit * 0.5;
    col = vec3(0.92, 0.9, 0.82) * (1.0 + back * 0.08);
    col *= exp(-absb * 1.25);
    col *= 1.0 - clamp(length(gr) * 1.4, 0.0, 0.45);
    col *= 1.0 + clamp(l * uPxPerUnit * uPxPerUnit * 0.02, -0.25, 0.25);
    col += direct * 0.4;
  }
  // Camera noise and a gentle vignette.
  col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.025;
  vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
  col *= 1.0 - 0.28 * smoothstep(0.35, 0.95, length(q));
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class Optics {
  constructor(renderer, scene, camera, assets) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.mode = 0;
    this.focus = 0;
    renderer.extensions.get('EXT_color_buffer_float');
    const fb = renderer.extensions.get('EXT_float_blend');
    this.type = fb ? THREE.FloatType : THREE.HalfFloatType;
    const mk = () => {
      const rt = new THREE.WebGLRenderTarget(4, 4, { count: 2, type: this.type, format: THREE.RGBAFormat, depthBuffer: false });
      for (const t of rt.textures) { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; }
      return rt;
    };
    this.rt = { a: mk(), b: mk(), ab: mk(), bb: mk() };
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.fsCam = new THREE.Camera();
    this.blurMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: FS_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tOpd: { value: null }, tAbs: { value: null }, uRes: { value: new THREE.Vector2() }, uCoc: { value: 10 }, uMaxR: { value: 16 }, uFocus: { value: 0 }, uDof: { value: 0.05 } },
    });
    this.compMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: FS_VERT, fragmentShader: COMP_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tOpdA: { value: null }, tAbsA: { value: null }, tOpdB: { value: null }, tAbsB: { value: null },
        tBack: assets.backdrop, uRes: { value: new THREE.Vector2() }, uMode: { value: 0 }, uPxPerUnit: { value: 100 },
        uShear: { value: 260 }, uBias: { value: 95 }, uDir: { value: new THREE.Vector2(0.7071, 0.7071) }, uTime: { value: 0 },
        uBackOff: { value: new THREE.Vector3(0, 0, 1) },
      },
    });
    this.fsScene = new THREE.Scene();
    this.fsMesh = new THREE.Mesh(tri, this.blurMat);
    this.fsMesh.frustumCulled = false;
    this.fsScene.add(this.fsMesh);
  }

  setSize(w, h) {
    const s = 0.8;
    const W = Math.max(4, Math.round(w * s)), H = Math.max(4, Math.round(h * s));
    for (const k in this.rt) this.rt[k].setSize(W, H);
    this.size = new THREE.Vector2(W, H);
    this.out = new THREE.Vector2(w, h);
  }

  /** Swap every object's material for the look. */
  applyMode(mode) {
    this.mode = mode;
    const lit = mode === 2;
    this.scene.traverse((o) => {
      if (o.userData && o.userData.opt) o.material = lit ? o.userData.lit : o.userData.opt;
    });
  }

  /**
   * @param params { ref (reference depth), focus (focal plane rel. to ref), cocPerUnit, dof, pxPerUnit, time, backOff }
   */
  render(params) {
    const r = this.renderer, cam = this.camera;
    if (this.mode === 2) {
      cam.layers.enableAll();
      r.setRenderTarget(null);
      r.render(this.scene, cam);
      return;
    }
    OPT.uRef.value = params.ref;
    const prevClear = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    const pass = (layer, rt) => {
      cam.layers.set(layer);
      r.setRenderTarget(rt);
      r.clear(true, false, false);
      r.render(this.scene, cam);
    };
    pass(LAYER_SUBSTRATE, this.rt.a);
    pass(LAYER_SPECIMEN, this.rt.b);
    cam.layers.enableAll();
    const scale = this.size.y / 720;
    const bu = this.blurMat.uniforms;
    bu.uRes.value.copy(this.size);
    bu.uCoc.value = params.cocPerUnit * scale;
    bu.uMaxR.value = Math.min(22, 18 * scale + 2);
    bu.uFocus.value = params.focus;
    bu.uDof.value = params.dof;
    this.fsMesh.material = this.blurMat;
    const blur = (src, dst) => {
      bu.tOpd.value = src.textures[0]; bu.tAbs.value = src.textures[1];
      r.setRenderTarget(dst);
      r.render(this.fsScene, this.fsCam);
    };
    blur(this.rt.a, this.rt.ab);
    blur(this.rt.b, this.rt.bb);
    const cu = this.compMat.uniforms;
    cu.tOpdA.value = this.rt.ab.textures[0]; cu.tAbsA.value = this.rt.ab.textures[1];
    cu.tOpdB.value = this.rt.bb.textures[0]; cu.tAbsB.value = this.rt.bb.textures[1];
    cu.uRes.value.copy(this.size);
    cu.uMode.value = this.mode;
    cu.uPxPerUnit.value = params.pxPerUnit * (this.size.y / this.out.y);
    cu.uTime.value = params.time;
    cu.uBackOff.value.copy(params.backOff);
    this.fsMesh.material = this.compMat;
    r.setRenderTarget(null);
    r.setClearColor(prevClear, prevA);
    r.render(this.fsScene, this.fsCam);
  }
}

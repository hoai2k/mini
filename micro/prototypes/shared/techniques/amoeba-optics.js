// Technique: transmitted-light microscope optics from an "optical property
// buffer" (from the amoeba prototype).
//
// Instead of drawing colour, every object is drawn ADDITIVELY into a float
// render target holding what a microscope actually responds to:
//   R = phase (optical path difference: thickness × refractive-index step),
//   G, B, A = optical density for red, green and blue light (absorption).
// A second, half-resolution target holds objects above or below the focal
// plane; it is blurred (depth of field). One composite pass then turns the
// buffers into an image for a chosen optical method, so a whole scene changes
// consistently when the optics change:
//   0 brightfield  — Beer–Lambert absorption × weak defocus contrast from the
//                    transport-of-intensity equation (I ≈ I0 (1 − Δz ∇²φ)),
//                    edge darkening where steep slopes refract light out of the
//                    aperture, a little per-channel chromatic fringing;
//   1 phase contrast — positive Zernike: phase shows dark, with the bright
//                    halo of a finite phase ring (φ − blur(φ));
//   2 darkfield    — only scattered light: gradient and Laplacian magnitude
//                    of φ on black, pigments faintly coloured;
//   3 immersive    — a hypothetical lit view: φ read as height, normals from
//                    its gradient, diffuse + specular + Fresnel in water.
//
// Interface:
//   import { PropertyOptics, propertyMaterial } from '../shared/techniques/amoeba-optics.js';
//   const optics = new PropertyOptics(renderer);
//   optics.setSize(drawingBufferWidth, drawingBufferHeight);
//   // each frame: render your in-focus scene into optics.focusRT and the
//   // out-of-focus scene into optics.defRT (clear both to 0 first, see clear()),
//   // using propertyMaterial(...) (additive, no depth) for every object whose
//   // fragment shader writes vec4(phase, odR, odG, odB).
//   optics.clear(); renderer.setRenderTarget(optics.focusRT); renderer.render(focusScene, cam); ...
//   optics.compose({ view: [left, bottom, width, height] (world units of the screen),
//     bg: THREE.Texture (colour of the empty field, tiled in world space), bgMean: [r,g,b],
//     bgTile: world units per tile, mode: 0..3, focus: −1..1, time,
//     flags: { tie, refraction, chroma, dof, bgRefraction, vignette, grain } });
// Needs a WebGL2 renderer (half-float render targets with blending).
import * as THREE from '../vendor/three.module.min.js';

const NOISE = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + 1.), u.x), u.y); }
`;

const FULL_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const BLUR_FS = /* glsl */ `
uniform sampler2D uTex; uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec4 s = vec4(0.); float ws = 0.;
  for (int i = -6; i <= 6; i++) { float w = exp(-float(i * i) / 18.); s += texture2D(uTex, vUv + uDir * float(i)) * w; ws += w; }
  gl_FragColor = s / ws;
}`;

const COMPOSITE_FS = /* glsl */ `
${NOISE}
uniform sampler2D uFocus, uDef, uHalo, uBg;
uniform vec2 uRes;
uniform vec4 uView;
uniform float uBgTile, uMode, uFocusK, uTime;
uniform float uTie, uRefr, uChroma, uBgRefr, uVig, uGrain;
uniform vec3 uBgMean;
varying vec2 vUv;
float phaseAt(vec2 uv) { return texture2D(uFocus, uv).r + texture2D(uDef, uv).r; }
float lapAt(vec2 uv, float c, float s, vec2 px) {
  return phaseAt(uv + vec2(px.x * s, 0.)) + phaseAt(uv - vec2(px.x * s, 0.)) + phaseAt(uv + vec2(0., px.y * s)) + phaseAt(uv - vec2(0., px.y * s)) - 4. * c;
}
void main() {
  vec2 px = 1. / uRes;
  vec4 P = texture2D(uFocus, vUv) + texture2D(uDef, vUv);
  vec4 Hb = texture2D(uHalo, vUv) + texture2D(uDef, vUv);
  float s = 1.6;
  float pr = phaseAt(vUv + vec2(px.x * s, 0.)), pl = phaseAt(vUv - vec2(px.x * s, 0.));
  float pu = phaseAt(vUv + vec2(0., px.y * s)), pd = phaseAt(vUv - vec2(0., px.y * s));
  float lap = pr + pl + pu + pd - 4. * P.r;
  vec2 grad = vec2(pr - pl, pu - pd) * 0.5 / s;
  vec2 world = uView.xy + vUv * uView.zw;
  vec3 bg = texture2D(uBg, world / uBgTile + grad * 0.01 * uBgRefr).rgb;
  vec3 bgn = bg / uBgMean;
  vec3 T = exp(-P.gba);
  vec3 col;
  if (uMode < 0.5) {
    vec3 l3 = vec3(lap);
    if (uChroma > 0.5) l3 = vec3(lapAt(vUv, P.r, s * 1.3, px) * 0.8, lap, lapAt(vUv, P.r, s * 0.8, px) * 1.15);
    vec3 tie = 1. + uTie * uFocusK * l3 * 1.25;
    float refr = 1. - uRefr * clamp(dot(grad, grad) * 22., 0., 0.55);
    col = bg * T * clamp(tie, 0.2, 2.) * refr;
    col *= 1. - 0.05 * clamp(P.r, 0., 1.);
  } else if (uMode < 1.5) {
    float ph = P.r - Hb.r;
    vec3 base = vec3(0.55, 0.6, 0.56) * mix(vec3(1.), bgn, 0.5);
    col = base * (1. - 1.9 * ph - 0.25 * P.r) * mix(vec3(1.), T, 0.55);
    col += vec3(0.02) * uFocusK * lap * uTie;
  } else if (uMode < 2.5) {
    float sc = length(grad) * 2.4 + abs(lap) * 0.35 + abs(P.r - Hb.r) * 0.25;
    float bgs = length(bgn - 1.) * 0.6;
    vec3 tint = mix(vec3(0.85, 0.92, 1.), T * 1.4, 0.45);
    vec3 pig = (1. - T) * vec3(0.25, 0.3, 0.12);
    col = vec3(0.012, 0.014, 0.02) + tint * (sc + bgs) + pig * (0.3 + sc);
  } else {
    vec3 n = normalize(vec3(-grad * 9., 1.));
    vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
    float mask = smoothstep(0.03, 0.12, P.r);
    float caust = pow(vnoise(world * 0.018 + vec2(uTime * 0.05, 0.)) * vnoise(world * 0.027 - vec2(0., uTime * 0.04)), 1.5);
    vec3 floorC = vec3(0.30, 0.31, 0.22) * bgn * (0.8 + 1.4 * caust);
    vec3 under = vec3(0.30, 0.31, 0.22) * (texture2D(uBg, world / uBgTile + n.xy * 0.03 * uBgRefr).rgb / uBgMean) * (0.8 + 1.4 * caust);
    float dif = max(dot(n, L), 0.);
    vec3 Hh = normalize(L + vec3(0., 0., 1.));
    float spec = pow(max(dot(n, Hh), 0.), 70.);
    float fres = pow(1. - n.z, 2.);
    vec3 tint = exp(-P.gba * 1.6);
    vec3 cell = under * tint * (0.55 + 0.7 * dif) + vec3(0.12, 0.16, 0.14) * P.r + spec * 0.85 + fres * vec3(0.55, 0.85, 0.8) * 0.8;
    col = mix(floorC * T, cell, mask);
    col = mix(col, col * vec3(0.8, 0.95, 1.05), vUv.y * 0.4);
  }
  vec2 v = vUv - 0.5;
  col *= 1. - uVig * 0.32 * dot(v, v) * (uMode > 1.5 && uMode < 2.5 ? 0.3 : 1.);
  col += uGrain * (hash12(gl_FragCoord.xy + fract(uTime) * 100.) - 0.5) * 0.018;
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

/** An additive, depth-free ShaderMaterial for writing into the property buffers. */
export function propertyMaterial({ vertexShader, fragmentShader, uniforms }) {
  return new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  });
}

export class PropertyOptics {
  constructor(renderer) {
    this.renderer = renderer;
    const rt = () => new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.focusRT = rt();
    this.defRT = rt();
    this.tmpRT = rt();
    this.defBlurRT = rt();
    this.haloRT = rt();
    this.haloTmp = rt();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.blurMat = new THREE.ShaderMaterial({ vertexShader: FULL_VS, fragmentShader: BLUR_FS, uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: FULL_VS, fragmentShader: COMPOSITE_FS, depthTest: false, depthWrite: false,
      uniforms: {
        uFocus: { value: null }, uDef: { value: null }, uHalo: { value: null }, uBg: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) }, uView: { value: new THREE.Vector4() },
        uBgTile: { value: 1400 }, uMode: { value: 0 }, uFocusK: { value: 0.6 }, uTime: { value: 0 },
        uTie: { value: 1 }, uRefr: { value: 1 }, uChroma: { value: 1 }, uBgRefr: { value: 1 }, uVig: { value: 1 }, uGrain: { value: 1 },
        uBgMean: { value: new THREE.Vector3(0.77, 0.74, 0.67) },
      },
    });
    this.w = 4; this.h = 4;
  }

  setSize(w, h) {
    this.w = w; this.h = h;
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    this.focusRT.setSize(w, h);
    for (const t of [this.defRT, this.tmpRT, this.defBlurRT, this.haloRT, this.haloTmp]) t.setSize(hw, hh);
  }

  clear() {
    const r = this.renderer;
    r.setClearColor(0x000000, 0);
    for (const t of [this.focusRT, this.defRT]) { r.setRenderTarget(t); r.clear(true, false, false); }
  }

  blur(src, tmp, dst, sigmaPx) {
    const r = this.renderer, m = this.blurMat;
    this.quad.material = m;
    m.uniforms.uTex.value = src;
    m.uniforms.uDir.value.set((sigmaPx / 3) / src.image.width, 0);
    r.setRenderTarget(tmp); r.render(this.quadScene, this.quadCam);
    m.uniforms.uTex.value = tmp.texture;
    m.uniforms.uDir.value.set(0, (sigmaPx / 3) / src.image.height);
    r.setRenderTarget(dst); r.render(this.quadScene, this.quadCam);
  }

  compose({ view, bg, bgMean, bgTile, mode, focus, time, flags = {}, target = null }) {
    const r = this.renderer;
    // Depth of field: the out-of-focus layer, blurred more the further focus is from it.
    const dof = flags.dof !== false;
    if (dof) this.blur(this.defRT.texture, this.tmpRT, this.defBlurRT, 7 + 5 * (1 - focus));
    // Halo / low-pass of the focal plane for phase contrast and darkfield.
    this.blur(this.focusRT.texture, this.haloTmp, this.haloRT, 4.5);
    const u = this.compMat.uniforms;
    u.uFocus.value = this.focusRT.texture;
    u.uDef.value = dof ? this.defBlurRT.texture : this.defRT.texture;
    u.uHalo.value = this.haloRT.texture;
    u.uBg.value = bg;
    u.uRes.value.set(this.w, this.h);
    u.uView.value.set(view[0], view[1], view[2], view[3]);
    u.uBgTile.value = bgTile;
    u.uMode.value = mode;
    u.uFocusK.value = focus;
    u.uTime.value = time;
    u.uBgMean.value.set(bgMean[0], bgMean[1], bgMean[2]);
    const f = (k) => (flags[k] === false ? 0 : 1);
    u.uTie.value = f('tie'); u.uRefr.value = f('refraction'); u.uChroma.value = f('chroma');
    u.uBgRefr.value = f('bgRefraction'); u.uVig.value = f('vignette'); u.uGrain.value = f('grain');
    this.quad.material = this.compMat;
    r.setRenderTarget(target);
    r.render(this.quadScene, this.quadCam);
  }
}

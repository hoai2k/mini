// paramecium-microscope: transmitted-light microscope image formation for any
// three.js scene: darkfield, phase contrast, brightfield, DIC and a
// hypothetical lit view, with depth of field. From the Micro Paramecium
// prototype (micro/prototypes/paramecium/). Self-contained.
//
// HOW TO PLUG IT IN
//   import { createOptics, shared, volumeMaterial, sheetMaterial, pointsMaterial,
//            opticMaterial, GLSL_VERT_COMMON, GLSL_FRAG_COMMON, MODES, standInPlate }
//     from '../shared/techniques/paramecium-microscope.js';
//   const optics = createOptics(renderer);
//   optics.resize(drawingBufferWidth, drawingBufferHeight);   // device pixels
//   body.material = volumeMaterial({ dn: 0.026, scatter: 1, absorb: [r, g, b] }); // closed meshes
//   each frame: set shared.uFocus (view distance of the focal plane), shared.uDof
//     (sharp-until, fully-blurred-at, in scene units), shared.uFade, shared.uNear,
//     shared.uPxPersp = 2 tan(fov/2) / height or shared.uPxOrtho = frustum height / height,
//     shared.uTime; then optics.render(scene, camera, { mode, stop, plate, plateOff })
//     draws to the screen. mode: index into MODES.
//     Optional: fill(main) writes the four attachments itself (e.g. an adapter
//     from another pipeline's buffers, see adapters.js) instead of rendering
//     the scene; upTo: 2 stops after the defocus blur (read optics.targets:
//     main.textures[0..1] sharp, pong.textures[0..1] blurred defocused layer).
//     Optional: plateMix (0..1, how much of the habitat plate shows over the
//     plain background; default 1), plateBlur (mip bias, default 0) and
//     plateRot (radians, for a view that turns) keep a plate from competing
//     with the subject; bfSoft (0..1, default 0) soft-limits brightfield's
//     defocus and edge terms so thick bodies shade rather than clip to black. pointsMaterial({ loop: [a, b, zSpread] }) sizes the
//     cyclosis loop (default the 230 µm P. caudatum: [72, 15, 30]);
//     volumeMaterial's uLen uniform sets the pellicle's cell length (230).
//
// INPUTS
// - Every visible object must use one of the optic materials (volumeMaterial,
//   sheetMaterial, pointsMaterial, or opticMaterial with GLSL_FRAG_COMMON's
//   emit()); they write to four float attachments with additive blending,
//   no depth test, both faces. Anything else writes garbage into the buffers.
// - Closed meshes need consistent outward winding and an `aRef` attribute (the
//   centre or axis point of each vertex, object space) unless { centred: true }.
//   Works with Mesh and InstancedMesh.
// - Units: optical path in µm (dn × µm); the image constants are tuned for
//   cells tens to hundreds of µm thick at fields of 0.3–2 mm.
// - Switches (shared.* and optics.toggles, each a 0/1 uniform): dof, halo
//   (phase-ring leakage), tie (brightfield defocus term), plate, chroma,
//   soft (PSF), grain.
//
// WHAT IT DOES
// The microscope. Nothing in the scene is lit: every object writes what a
// transmitted-light microscope responds to into a set of float buffers, added
// up along each view ray, and the image is then formed from those buffers.
//
//   OPD      optical path difference, Δn × thickness in µm. Closed bodies use
//            the front/back face trick: a front face adds −depth, a back face
//            +depth, so the sum along a ray is the chord through the body.
//   scatter  light thrown out of the beam by sharp index steps (cell edges,
//            granules, crystals): what darkfield shows.
//   absorb   optical density per colour (chlorophyll, food vacuoles, detritus).
//
// Every fragment is split between a sharp layer and a defocused layer by how
// far its object sits from the focal plane, and the defocused layer is
// blurred: depth of field that works with additive, order-free rendering.
//
// The image modes then follow image formation:
//   darkfield   the zero order removed: |high-pass of the field|² + scatter
//   phase       positive phase contrast: dark where OPD is high, with the
//               halo and shade-off of a finite phase ring (φ − α·blur φ)
//   brightfield weak absorption, a defocus (transport-of-intensity) term and
//               edge darkening: pale and faint, as live cells really are
//   DIC         the shear derivative of φ: the relief look
//   immersive   a hypothetical lit view built from the same buffers
import * as THREE from '../vendor/three.module.min.js';

export const MODES = ['darkfield', 'phase', 'brightfield', 'dic', 'immersive'];
export const MODE_NAMES = {
  darkfield: 'Darkfield', phase: 'Phase contrast', brightfield: 'Brightfield', dic: 'DIC (Nomarski)', immersive: 'Immersive (hypothetical lit view)',
};

/** Uniforms every optic material shares (same objects, so one update reaches all). */
export const shared = {
  uFocus: { value: 400 }, // view-space distance of the focal plane
  uDof: { value: new THREE.Vector2(30, 200) }, // sharp until x µm off focus, fully defocused at y
  uFade: { value: 600 }, // contributions fade further than this past the defocus range
  uNear: { value: new THREE.Vector2(-2, -1) }, // objects nearer the camera than x..y fade out (chase view)
  uTime: { value: 0 },
  uDofOn: { value: 1 }, // 0: everything sharp (no depth of field)
  uPxPersp: { value: 0.001 }, // world size of one pixel per unit depth (perspective)
  uPxOrtho: { value: 1 }, // world size of one pixel (orthographic)
};

export const GLSL_VERT_COMMON = /* glsl */ `
uniform float uPxPersp;
uniform float uPxOrtho;
float pxWorld(float depth) { return isOrthographic ? uPxOrtho : max(depth, 1.0) * uPxPersp; }
`;

export const GLSL_FRAG_COMMON = /* glsl */ `
layout(location = 0) out highp vec4 oS0;
layout(location = 1) out highp vec4 oS1;
layout(location = 2) out highp vec4 oB0;
layout(location = 3) out highp vec4 oB1;
uniform float uFocus;
uniform vec2 uDof;
uniform float uFade;
uniform vec2 uNear;
uniform float uTime;
uniform float uDofOn;
// opd: µm of optical path; scat: scatter strength; absb: optical density rgb;
// refDepth: view depth of the object (or its local axis), for defocus.
void emit(float opd, float scat, vec3 absb, float refDepth) {
  float dz = abs(refDepth - uFocus);
  float b = smoothstep(uDof.x, uDof.y, dz) * uDofOn;
  float x = max(dz - uDof.y, 0.0) / uFade;
  float fade = smoothstep(uNear.x, uNear.y, refDepth) / (1.0 + x * x);
  vec4 a = vec4(opd, scat, 0.0, 0.0) * fade;
  vec4 c = vec4(absb, 0.0) * fade;
  oS0 = a * (1.0 - b); oS1 = c * (1.0 - b);
  oB0 = a * b; oB1 = c * b;
}
`;

const additive = {
  transparent: false,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
  glslVersion: THREE.GLSL3,
};

/** Spread into a ShaderMaterial's options: additive, order-free, MRT output. */
export function opticMaterial({ uniforms = {}, vertexShader, fragmentShader, defines = {} }) {
  const m = new THREE.ShaderMaterial({ ...additive, uniforms: { ...shared, ...uniforms }, vertexShader, fragmentShader, defines });
  m.toneMapped = false;
  return m;
}

/**
 * A closed body (any watertight mesh): OPD and absorption from the chord
 * through it, scatter from its rim. Needs an `aRef` attribute (the point on
 * its own centre or axis each vertex belongs to) unless `centred`.
 *   pattern 0 none, 1 pellicle (needs aUv: axial t, angle/2π), 2 diatom striae
 *   (along local x), 3 detritus mottling.
 */
export function volumeMaterial({ dn = 0.03, scatter = 1, absorb = [0, 0, 0], pattern = 0, centred = false, rimPow = 3, extra = {} } = {}) {
  return opticMaterial({
    uniforms: {
      uDn: { value: dn }, uScatter: { value: scatter }, uAbsorb: { value: new THREE.Vector3(...absorb) },
      uRimPow: { value: rimPow }, uPattern: { value: pattern },
      uPellicle: { value: null }, uHasPellicle: { value: 0 }, uAlpha: { value: 1 }, uPelOn: { value: 1 }, uLen: { value: 230 },
      ...extra,
    },
    defines: { CENTRED: centred ? 1 : 0, PATTERN: pattern },
    vertexShader: /* glsl */ `
      ${GLSL_VERT_COMMON}
      #if !CENTRED
      attribute vec3 aRef;
      #endif
      #if PATTERN == 1
      attribute vec2 aUv;
      varying vec2 vUv;
      #endif
      varying float vDepth;
      varying float vRef;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vLocal;
      void main() {
        vec4 lp = vec4(position, 1.0);
        #if CENTRED
        vec4 lr = vec4(0.0, 0.0, 0.0, 1.0);
        #else
        vec4 lr = vec4(aRef, 1.0);
        #endif
        vec3 n = normal;
        #ifdef USE_INSTANCING
        lp = instanceMatrix * lp; lr = instanceMatrix * lr; n = mat3(instanceMatrix) * n;
        #endif
        vec4 mv = modelViewMatrix * lp;
        vec4 mr = modelViewMatrix * lr;
        vDepth = -mv.z; vRef = -mr.z;
        vN = normalize(mat3(modelViewMatrix) * n);
        vV = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
        vLocal = position;
        #if PATTERN == 1
        vUv = aUv;
        #endif
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_FRAG_COMMON}
      uniform float uDn; uniform float uScatter; uniform vec3 uAbsorb; uniform float uRimPow; uniform float uAlpha;
      uniform sampler2D uPellicle; uniform float uHasPellicle; uniform float uPelOn; uniform float uLen;
      varying float vDepth; varying float vRef; varying vec3 vN; varying vec3 vV; varying vec3 vLocal;
      #if PATTERN == 1
      varying vec2 vUv;
      #endif
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float s = gl_FrontFacing ? -1.0 : 1.0;
        float chord = s * (vDepth - vRef);
        float ndv = abs(dot(normalize(vN), vV));
        float rim = pow(1.0 - ndv, uRimPow);
        float scat = uScatter * rim * 0.5;
        float opd = uDn * chord;
        #if PATTERN == 1
        // Pellicle: kineties as rows of alveolar units around the body (≈100 rows),
        // each unit ≈2.3 µm (drawn ≈1.5× larger so it reads). A delivered texture
        // (MP-P03) replaces the procedural rows.
        float rows = 96.0;
        vec2 g = vec2(vUv.y * rows, vUv.x * uLen / 3.4);
        g.y += 0.5 * floor(g.x);
        float ridge;
        if (uHasPellicle > 0.5) {
          ridge = 1.0 - texture(uPellicle, vec2(vUv.y * rows / 24.0, vUv.x * uLen / 3.4 / 24.0)).g;
        } else {
          vec2 f = abs(fract(g) - 0.5);
          ridge = smoothstep(0.30, 0.48, max(f.x * 1.15, f.y));
        }
        scat += uScatter * ridge * 0.05 * (0.35 + ndv) * uPelOn;
        #elif PATTERN == 2
        // Diatom valve: striae every ≈1 µm drawn at ≈2.4 µm, a raphe along the axis.
        float st = 0.5 + 0.5 * sin(vLocal.x * 6.2831 / 2.4);
        float raphe = 1.0 - smoothstep(0.4, 1.2, abs(vLocal.z));
        scat += uScatter * (0.12 * st * (1.0 - raphe) + 0.25 * raphe) * (0.3 + ndv);
        #elif PATTERN == 3
        float m = hash(floor(vLocal.xz / 6.0));
        scat += uScatter * 0.25 * m * ndv;
        #endif
        emit(opd * uAlpha, scat * uAlpha, uAbsorb * chord * uAlpha, vRef);
      }`,
  });
}

/** A thin sheet of fixed thickness, seen from both sides (cross walls, chloroplast ribbon). */
export function sheetMaterial({ dn = 0.04, thick = 2, scatter = 0.6, absorb = [0, 0, 0] } = {}) {
  return opticMaterial({
    uniforms: { uDn: { value: dn }, uThick: { value: thick }, uScatter: { value: scatter }, uAbsorb: { value: new THREE.Vector3(...absorb) } },
    vertexShader: /* glsl */ `
      ${GLSL_VERT_COMMON}
      attribute vec3 aRef;
      varying float vRef; varying vec3 vN; varying vec3 vV; varying float vEdge;
      attribute float aEdge;
      void main() {
        vec4 lp = vec4(position, 1.0); vec4 lr = vec4(aRef, 1.0); vec3 n = normal;
        #ifdef USE_INSTANCING
        lp = instanceMatrix * lp; lr = instanceMatrix * lr; n = mat3(instanceMatrix) * n;
        #endif
        vec4 mv = modelViewMatrix * lp;
        vRef = -(modelViewMatrix * lr).z;
        vN = normalize(mat3(modelViewMatrix) * n);
        vV = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
        vEdge = aEdge;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_FRAG_COMMON}
      uniform float uDn; uniform float uThick; uniform float uScatter; uniform vec3 uAbsorb;
      varying float vRef; varying vec3 vN; varying vec3 vV; varying float vEdge;
      void main() {
        float ndv = max(abs(dot(normalize(vN), vV)), 0.18);
        float t = uThick / ndv;
        float edge = smoothstep(0.55, 1.0, abs(vEdge));
        emit(uDn * t, uScatter * (0.15 + 0.85 * edge) * (1.0 - ndv * 0.6), uAbsorb * t, vRef);
      }`,
  });
}

/**
 * Instanced soft discs facing the camera: granules, bacteria, crystals.
 * Per instance: iPos (vec3), iP (radius µm, dn, scatter, seed).
 * With CYCLOSIS defined, iPos is instead (u0, speed, ring scale, tilt) and
 * the position follows the cytoplasmic loop inside the cell.
 */
export function pointsMaterial({ cyclosis = false, absorb = [0, 0, 0], rod = false, loop = [72, 15, 30] } = {}) {
  return opticMaterial({
    uniforms: { uAbsorb: { value: new THREE.Vector3(...absorb) }, uCyclosis: { value: 0 }, uHalfLen: { value: 115 }, uLoop: { value: new THREE.Vector3(...loop) } },
    defines: { CYCLOSIS: cyclosis ? 1 : 0, ROD: rod ? 1 : 0 },
    vertexShader: /* glsl */ `
      ${GLSL_VERT_COMMON}
      attribute vec4 iPos;
      attribute vec4 iP;
      uniform float uCyclosis;
      uniform vec3 uLoop;
      varying vec2 vQ; varying float vK; varying float vRef; varying vec4 vP;
      void main() {
        vec3 c;
        #if CYCLOSIS
        // Endoplasm loop: back along the ventral side from the cytostome, up through
        // the posterior, forward along the dorsal side (Paramecium cyclosis).
        float u = fract(iPos.x + uCyclosis * iPos.y) * 6.2831853;
        float a = uLoop.x * iPos.z, b = uLoop.y * iPos.z;
        vec3 q = vec3(cos(u) * a, sin(u) * b, (iP.w - 0.5) * uLoop.z * iPos.z);
        float ct = cos(iPos.w), st = sin(iPos.w);
        c = vec3(q.x, q.y * ct - q.z * st, q.y * st + q.z * ct);
        #else
        c = iPos.xyz;
        #endif
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        float depth = -mv.z;
        float px = pxWorld(depth);
        float r = iP.x;
        float re = max(r, px * 0.9);
        vK = (r * r) / (re * re); // energy kept when a speck is smaller than a pixel
        vec2 sz = vec2(re);
        #if ROD
        sz.x *= 2.4;
        #endif
        vec2 cs = position.xy * 1.6;
        float ang = iP.w * 6.2831853;
        vec2 o = cs * sz;
        mv.xy += vec2(cos(ang) * o.x - sin(ang) * o.y, sin(ang) * o.x + cos(ang) * o.y);
        vQ = cs;
        vRef = depth; vP = iP;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_FRAG_COMMON}
      uniform vec3 uAbsorb;
      varying vec2 vQ; varying float vK; varying float vRef; varying vec4 vP;
      void main() {
        float d2 = dot(vQ, vQ);
        if (d2 > 2.56) discard;
        float prof = max(1.0 - d2, 0.0);         // chord of a sphere, squared-ish
        float ring = exp(-pow((sqrt(d2) - 0.9) * 3.5, 2.0)); // the bright rim of a refractile speck
        float t = sqrt(prof) * 2.0 * vP.x * vK;
        emit(vP.y * t, vP.z * vK * (ring * 0.7 + prof * 0.6), uAbsorb * t, vRef);
      }`,
  });
}

// ---------------------------------------------------------------------------
// The pipeline: scene → MRT buffers → defocus blur → image formation → post.

const QUAD_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function rt(w, h, count, filter = THREE.LinearFilter) {
  return new THREE.WebGLRenderTarget(w, h, {
    count, type: THREE.HalfFloatType, format: THREE.RGBAFormat,
    minFilter: filter, magFilter: filter, depthBuffer: false, stencilBuffer: false,
  });
}

export function createOptics(renderer) {
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const qScene = new THREE.Scene();
  qScene.add(quad);
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let main = null, down = null, ping = null, pong = null, img = null;
  let W = 1, H = 1;

  const pass = (mat) => new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: QUAD_VS, depthTest: false, depthWrite: false, ...mat });

  // 1. Quarter-resolution copy of the defocused layer and of the whole OPD/scatter.
  const downMat = pass({
    uniforms: { tS0: { value: null }, tB0: { value: null }, tB1: { value: null }, uTexel: { value: new THREE.Vector2() } },
    fragmentShader: /* glsl */ `
      layout(location = 0) out highp vec4 o0; layout(location = 1) out highp vec4 o1; layout(location = 2) out highp vec4 o2;
      uniform sampler2D tS0, tB0, tB1; uniform vec2 uTexel; varying vec2 vUv;
      void main() {
        vec4 b0 = vec4(0), b1 = vec4(0), t = vec4(0);
        for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
          vec2 uv = vUv + (vec2(float(i), float(j)) - 0.5) * uTexel * 2.0;
          vec4 x = texture(tB0, uv);
          b0 += x; b1 += texture(tB1, uv); t += x + texture(tS0, uv);
        }
        o0 = b0 * 0.25; o1 = b1 * 0.25; o2 = t * 0.25;
      }`,
  });
  // 2. Separable gaussian on all three.
  const blurMat = pass({
    uniforms: { t0: { value: null }, t1: { value: null }, t2: { value: null }, uDir: { value: new THREE.Vector2() }, uWide: { value: 1.6 } },
    fragmentShader: /* glsl */ `
      layout(location = 0) out highp vec4 o0; layout(location = 1) out highp vec4 o1; layout(location = 2) out highp vec4 o2;
      uniform sampler2D t0, t1, t2; uniform vec2 uDir; uniform float uWide; varying vec2 vUv;
      void main() {
        vec4 a = vec4(0), b = vec4(0), c = vec4(0), cw = vec4(0); float ws = 0.0, wws = 0.0;
        for (int i = -7; i <= 7; i++) {
          float x = float(i);
          float w = exp(-x * x / 18.0);
          vec2 uv = vUv + uDir * x;
          a += texture(t0, uv) * w; b += texture(t1, uv) * w; ws += w;
          float ww = exp(-x * x / 30.0);
          cw += texture(t2, vUv + uDir * x * uWide) * ww; wws += ww;
        }
        o0 = a / ws; o1 = b / ws; o2 = cw / wws;
      }`,
  });
  // 3. Image formation.
  const formMat = pass({
    uniforms: {
      tS0: { value: null }, tS1: { value: null }, tB0: { value: null }, tB1: { value: null }, tL: { value: null },
      uTexel: { value: new THREE.Vector2() }, uMode: { value: 0 }, uPlate: { value: null }, uHasPlate: { value: 0 },
      uPlateOff: { value: new THREE.Vector2() }, uAspect: { value: 1 }, uTime: shared.uTime,
      uHalo: { value: 1 }, uTie: { value: 1 }, uPlateOn: { value: 1 }, uPlateMix: { value: 1 }, uPlateBlur: { value: 0 }, uPlateRot: { value: 0 }, uBfSoft: { value: 0 },
    },
    fragmentShader: /* glsl */ `
      layout(location = 0) out highp vec4 oC;
      uniform sampler2D tS0, tS1, tB0, tB1, tL, uPlate;
      uniform vec2 uTexel, uPlateOff; uniform float uMode, uHasPlate, uAspect, uTime, uHalo, uTie, uPlateOn, uPlateMix, uPlateBlur, uPlateRot, uBfSoft;
      varying vec2 vUv;
      float phi(vec2 uv) { return texture(tS0, uv).r + texture(tB0, uv).r; }
      void main() {
        vec4 s0 = texture(tS0, vUv), s1 = texture(tS1, vUv);
        vec4 b0 = texture(tB0, vUv), b1 = texture(tB1, vUv);
        vec4 L = texture(tL, vUv);
        float p = s0.r + b0.r;           // OPD, µm
        float sc = s0.g + b0.g;          // scatter
        vec3 A = s1.rgb + b1.rgb;        // optical density
        float hp = p - L.r;              // high-pass of the phase
        vec2 e = uTexel * 1.25;
        float gx = phi(vUv + vec2(e.x, 0)) - phi(vUv - vec2(e.x, 0));
        float gy = phi(vUv + vec2(0, e.y)) - phi(vUv - vec2(0, e.y));
        float g2 = gx * gx + gy * gy;
        vec2 pc = vec2((vUv.x - 0.5) * uAspect / 1.7778, vUv.y - 0.5);
        float pcs = cos(uPlateRot), psn = sin(uPlateRot);
        vec2 plUv = vec2(pcs * pc.x - psn * pc.y, psn * pc.x + pcs * pc.y) + 0.5 + uPlateOff;
        vec3 col;
        int m = int(uMode + 0.5);
        if (m == 0) {
          // Darkfield: only light scattered out of the cone reaches the eye.
          vec3 bg = vec3(0.004, 0.006, 0.01);
          if (uHasPlate * uPlateOn > 0.5) bg = mix(bg, texture(uPlate, plUv, uPlateBlur).rgb * 0.4, uPlateMix);
          float edge = 2.2 * g2 + 0.45 * hp * hp;
          float I = 1.0 - exp(-(edge + 0.06 * sc));
          vec3 tint = exp(-A * 0.55);
          col = bg + I * vec3(0.86, 0.92, 1.0) * mix(vec3(1.0), tint, 0.85);
          col += 0.004 * max(sc - 4.0, 0.0) * vec3(1.0, 0.9, 0.7);
        } else if (m == 1) {
          // Positive phase contrast: φ shifted a quarter wave against the
          // direct light; the finite phase ring lets the low-pass leak back,
          // which gives the bright halo and the shade-off of large objects.
          vec3 bg = vec3(0.47, 0.475, 0.47);
          if (uHasPlate * uPlateOn > 0.5) bg = mix(bg, texture(uPlate, plUv, uPlateBlur).rgb, uPlateMix);
          float v = p - 0.82 * uHalo * L.r;
          float I = mix(exp(-0.8 * v), 1.0 - 0.65 * tanh(0.65 * v), 0.5);
          col = bg * I * exp(-A * 0.3) * (1.0 - 0.12 * min(sc, 3.0));
        } else if (m == 2) {
          // Brightfield (Köhler, condenser stopped down a little): pale, warm, faint.
          vec3 lamp = vec3(0.95, 0.9, 0.76);
          // bfSoft: a soft limit so thick bodies shade instead of clipping to black
          float tie = mix(-0.55 * hp, -0.45 * tanh(1.2 * hp), uBfSoft) * uTie; // defocus contrast, transport of intensity
          float edgeDark = mix(0.55 * sqrt(g2), 0.5 * tanh(1.1 * sqrt(g2)), uBfSoft);
          col = lamp * exp(-A) * (1.0 + tie) * (1.0 - edgeDark) * (1.0 - 0.05 * min(sc, 4.0));
        } else if (m == 3) {
          // DIC: the derivative of φ along the shear direction, on a grey bias.
          vec2 sh = normalize(vec2(1.0, 1.0)) * uTexel * 2.0;
          float d = phi(vUv + sh) - phi(vUv - sh);
          float I = 0.5 + 0.45 * tanh(4.0 * d);
          col = vec3(0.5, 0.5, 0.48) * (0.35 + 1.3 * I) * exp(-A * 0.7) + vec3(0.02, 0.015, 0.0);
        } else {
          // Immersive: a hypothetical camera inside the water, lit from above.
          // The OPD map stands in for a thickness map; its gradient for normals.
          float yy = vUv.y;
          vec3 water = mix(vec3(0.01, 0.06, 0.09), vec3(0.05, 0.2, 0.24), yy);
          float ray = 0.04 * (0.5 + 0.5 * sin(vUv.x * 9.0 + yy * 4.0 + uTime * 0.2)) * yy;
          water += ray;
          vec3 n = normalize(vec3(-gx * 6.0, -gy * 6.0, 1.0));
          vec3 l = normalize(vec3(-0.35, 0.55, 0.75));
          float dif = max(dot(n, l), 0.0);
          float spec = pow(max(dot(reflect(-l, n), vec3(0, 0, 1)), 0.0), 24.0);
          float cover = 1.0 - exp(-p * 1.1);
          vec3 body = vec3(0.78, 0.88, 0.9) * (0.35 + 0.75 * dif) * exp(-A * 1.2);
          col = mix(water, body, cover * 0.85);
          col += spec * 0.35 * cover + (1.0 - exp(-sc)) * vec3(0.5, 0.75, 0.8) * 0.45;
          col = mix(col, water, clamp(length(b0.rg) * 0.0, 0.0, 1.0));
        }
        oC = vec4(col, 1.0);
      }`,
  });
  // 4. Post: lateral chromatic softness, the eyepiece field stop, grain.
  const postMat = pass({
    uniforms: { tC: { value: null }, uTexel: { value: new THREE.Vector2() }, uStop: { value: 0 }, uAspect: { value: 1 }, uTime: shared.uTime, uMode: { value: 0 },
      uChroma: { value: 1 }, uSoft: { value: 1 }, uGrain: { value: 1 } },
    fragmentShader: /* glsl */ `
      layout(location = 0) out highp vec4 oF;
      uniform sampler2D tC; uniform vec2 uTexel; uniform float uStop, uAspect, uTime, uMode, uChroma, uSoft, uGrain; varying vec2 vUv;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        vec2 c = vUv - 0.5;
        vec2 ca = c * 0.004 * uChroma; // lateral colour: grows toward the edge
        vec3 col;
        col.r = texture(tC, vUv + ca).r;
        col.g = texture(tC, vUv).g;
        col.b = texture(tC, vUv - ca).b;
        // slight softness: the objective's point spread
        vec3 soft = (texture(tC, vUv + vec2(uTexel.x, 0)).rgb + texture(tC, vUv - vec2(uTexel.x, 0)).rgb
                   + texture(tC, vUv + vec2(0, uTexel.y)).rgb + texture(tC, vUv - vec2(0, uTexel.y)).rgb) * 0.25;
        col = mix(col, soft, 0.35 * uSoft);
        float r = length(vec2(c.x * uAspect, c.y));
        if (uStop > 0.5) {
          float stop = 1.0 - smoothstep(0.475, 0.482, r);
          col *= stop * (1.0 - 0.18 * smoothstep(0.3, 0.475, r));
        } else {
          col *= 1.0 - 0.35 * smoothstep(0.45, 0.95, r);
        }
        float n = hash(vec3(gl_FragCoord.xy, floor(uTime * 60.0))) - 0.5;
        col += n * (uMode < 0.5 ? 0.018 : 0.03) * uGrain;
        oF = vec4(pow(max(col, 0.0), vec3(1.0 / 1.15)), 1.0);
      }`,
  });

  function resize(w, h) {
    W = w; H = h;
    for (const t of [main, down, ping, pong, img]) t && t.dispose();
    main = rt(w, h, 4);
    const qw = Math.max(1, Math.ceil(w / 4)), qh = Math.max(1, Math.ceil(h / 4));
    down = rt(qw, qh, 3); ping = rt(qw, qh, 3); pong = rt(qw, qh, 3);
    img = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
    downMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    formMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    formMat.uniforms.uAspect.value = w / h;
    postMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    postMat.uniforms.uAspect.value = w / h;
  }

  const draw = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qScene, qCam); };

  return {
    resize,
    get size() { return [W, H]; },
    get targets() { return { main, down, ping, pong, img }; },
    /** 0/1 switches: halo (phase ring leakage), tie (brightfield defocus), plate, chroma, soft, grain. */
    toggles: { halo: formMat.uniforms.uHalo, tie: formMat.uniforms.uTie, plate: formMat.uniforms.uPlateOn, chroma: postMat.uniforms.uChroma, soft: postMat.uniforms.uSoft, grain: postMat.uniforms.uGrain },
    /** Render the scene with `camera` and form the image in `mode` (index into MODES). */
    render(scene, camera, { mode, stop, plate, plateOff, blurScale = 1, upTo = 9, fill = null, plateMix = 1, plateBlur = 0, plateRot = 0, bfSoft = 0 }) {
      renderer.setRenderTarget(main);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      if (fill) fill(main);
      else renderer.render(scene, camera);

      downMat.uniforms.tS0.value = main.textures[0];
      downMat.uniforms.tB0.value = main.textures[2];
      downMat.uniforms.tB1.value = main.textures[3];
      if (upTo < 1) return;
      draw(downMat, down);
      if (upTo < 2) return;
      const qw = down.width, qh = down.height;
      blurMat.uniforms.uWide.value = 1.4 * blurScale;
      blurMat.uniforms.t0.value = down.textures[0]; blurMat.uniforms.t1.value = down.textures[1]; blurMat.uniforms.t2.value = down.textures[2];
      blurMat.uniforms.uDir.value.set(1.5 * blurScale / qw, 0);
      draw(blurMat, ping);
      blurMat.uniforms.t0.value = ping.textures[0]; blurMat.uniforms.t1.value = ping.textures[1]; blurMat.uniforms.t2.value = ping.textures[2];
      blurMat.uniforms.uDir.value.set(0, 1.5 * blurScale / qh);
      draw(blurMat, pong);
      if (upTo < 3) return;

      const f = formMat.uniforms;
      f.tS0.value = main.textures[0]; f.tS1.value = main.textures[1];
      f.tB0.value = pong.textures[0]; f.tB1.value = pong.textures[1]; f.tL.value = pong.textures[2];
      f.uMode.value = mode;
      f.uPlate.value = plate || null; f.uHasPlate.value = plate ? 1 : 0;
      if (plateOff) f.uPlateOff.value.copy(plateOff);
      f.uPlateMix.value = plateMix; f.uPlateBlur.value = plateBlur; f.uPlateRot.value = plateRot; f.uBfSoft.value = bfSoft;
      draw(formMat, img);
      if (upTo < 4) return;

      postMat.uniforms.tC.value = img.texture;
      postMat.uniforms.uStop.value = stop ? 1 : 0;
      postMat.uniforms.uMode.value = mode;
      draw(postMat, null);
    },
  };
}

/** Procedural stand-ins for the habitat plates (MP-P01 darkfield, MP-P02 phase). */
export function standInPlate(kind) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 576;
  const g = c.getContext('2d');
  let seed = kind === 'darkfield' ? 7 : 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  if (kind === 'darkfield') {
    g.fillStyle = '#010203'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * c.width, y = rnd() * c.height, r = 3 + rnd() ** 3 * 22, a = 0.03 + rnd() * 0.08;
      const gr = g.createRadialGradient(x, y, r * 0.5, x, y, r);
      gr.addColorStop(0, `rgba(170,190,210,0)`); gr.addColorStop(0.8, `rgba(170,190,210,${a})`); gr.addColorStop(1, 'rgba(170,190,210,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  } else {
    g.fillStyle = '#787a78'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 220; i++) {
      const x = rnd() * c.width, y = rnd() * c.height, r = 3 + rnd() ** 3 * 20;
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 1.6);
      gr.addColorStop(0, 'rgba(60,62,60,0.18)'); gr.addColorStop(0.6, 'rgba(60,62,60,0.06)'); gr.addColorStop(0.75, 'rgba(160,162,160,0.10)'); gr.addColorStop(1, 'rgba(160,162,160,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 1.6, 0, Math.PI * 2); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

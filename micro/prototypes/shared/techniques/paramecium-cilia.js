// paramecium-cilia: beating cilia (and other thin strands) as instanced,
// camera-facing ribbons animated in the vertex shader. From the Micro
// Paramecium prototype. Writes into the paramecium-microscope buffers.
//
// HOW TO PLUG IT IN
//   import { createStrands, KIND } from '../shared/techniques/paramecium-cilia.js';
//   const { mesh, mat, attrs } = createStrands(items, { segs: 6, dn: 0.03, scatter: 0.45 });
//   parent.add(mesh);  // items are in the parent's local space
//   each frame: mat.uniforms.uPhase.value += beatHz * dt (accumulate, never jump);
//     uAmp (stroke amplitude), uReverse (+1 normal, -1 ciliary reversal),
//     uOral (oral-cilia strength 0..1), uWave (1 metachronal wave, 0 in sync), uAlpha.
//   items: { base, normal, dir (stroke direction, tangent), length, width,
//     phase (metachronal offset in cycles; birth time for threads; coil 0..1 for
//     stalks), kind: KIND.CILIUM | CAUDAL | DOCKED | ORAL | THREAD | STALK }.
//   Needs the paramecium-microscope pipeline (or any MRT target with the same
//   four attachments) and its shared uniforms (uTime, uPxPersp/uPxOrtho).
//
// Thin things as instanced, camera-facing ribbons whose shape is computed in
// the vertex shader: beating cilia (with the metachronal wave as a phase
// offset per instance), the stiffer caudal tuft, docked trichocysts, extruded
// trichocyst threads and coiling Vorticella stalks.
//
// True widths are well under a pixel at these magnifications (a cilium is
// 0.25 µm across), so every ribbon is drawn at least about one pixel wide and
// its optical path is scaled down by the same factor: thin things read, and a
// distant field of cilia aggregates into the faint fringe a microscope shows
// instead of shimmering. Drawn widths are labelled in the README.
import * as THREE from '../vendor/three.module.min.js';
import { opticMaterial, GLSL_VERT_COMMON, GLSL_FRAG_COMMON } from './paramecium-microscope.js';

export const KIND = { CILIUM: 0, CAUDAL: 1, DOCKED: 2, ORAL: 3, THREAD: 4, STALK: 5 };

/**
 * @param {Array<{base:number[], normal:number[], dir:number[], length:number, width:number, phase:number, kind:number}>} items
 * @param {{segs?:number, dn?:number, scatter?:number, absorb?:number[]}} opt
 */
export function createStrands(items, { segs = 6, dn = 0.06, scatter = 0.7, absorb = [0, 0, 0] } = {}) {
  const n = items.length;
  const geo = new THREE.InstancedBufferGeometry();
  const verts = [], s = [], side = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    for (const sd of [-1, 1]) { verts.push(0, 0, 0); s.push(i / segs); side.push(sd); }
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1));
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  geo.setIndex(idx);
  const base = new Float32Array(n * 3), nrm = new Float32Array(n * 3), dir = new Float32Array(n * 3), p = new Float32Array(n * 4);
  items.forEach((it, i) => {
    base.set(it.base, i * 3); nrm.set(it.normal, i * 3); dir.set(it.dir, i * 3);
    p.set([it.length, it.width, it.phase || 0, it.kind || 0], i * 4);
  });
  const attrs = {
    iBase: new THREE.InstancedBufferAttribute(base, 3),
    iNorm: new THREE.InstancedBufferAttribute(nrm, 3),
    iDir: new THREE.InstancedBufferAttribute(dir, 3),
    iP: new THREE.InstancedBufferAttribute(p, 4),
  };
  for (const [k, a] of Object.entries(attrs)) geo.setAttribute(k, a);
  geo.instanceCount = n;

  const mat = opticMaterial({
    uniforms: {
      uPhase: { value: 0 }, uAmp: { value: 1 }, uReverse: { value: 1 }, uOral: { value: 0.5 }, uWave: { value: 1 },
      uDn: { value: dn }, uScatter: { value: scatter }, uAbsorb: { value: new THREE.Vector3(...absorb) },
      uAlpha: { value: 1 },
    },
    defines: { SEGS: segs },
    vertexShader: /* glsl */ `
      ${GLSL_VERT_COMMON}
      attribute float aS; attribute float aSide;
      attribute vec3 iBase; attribute vec3 iNorm; attribute vec3 iDir; attribute vec4 iP;
      uniform float uPhase, uAmp, uReverse, uOral, uTime, uWave;
      varying float vSide; varying float vRef; varying float vK; varying float vS; varying float vKind; varying float vLife;

      // Base angle of a cilium from the surface normal, toward the stroke direction:
      // a fast, straight power stroke and a slower, bent recovery stroke.
      float strokeAngle(float p) {
        if (p < 0.33) return mix(-0.95, 1.15, smoothstep(0.0, 1.0, p / 0.33));
        return mix(1.15, -0.95, smoothstep(0.0, 1.0, (p - 0.33) / 0.67));
      }
      float recoveryWeight(float p) { return p < 0.33 ? 0.0 : sin(3.14159 * (p - 0.33) / 0.67); }

      void main() {
        float len = iP.x, wid = iP.y, ph = iP.z;
        int kind = int(iP.w + 0.5);
        vec3 N = normalize(iNorm), D = iDir;
        vec3 pos = iBase, tan = N;
        float segL = len / float(SEGS);
        int idx = int(aS * float(SEGS) + 0.5);
        vLife = 1.0;
        if (kind == 0 || kind == 3) {
          // Beating cilium. uReverse flips the stroke (ciliary reversal).
          float amp = kind == 3 ? mix(0.6, 1.3, uOral) : uAmp;
          float rate = kind == 3 ? 1.35 : 1.0;
          vec3 Ds = D * uReverse;
          vec3 cur = iBase;
          ph *= uWave;
          float p0 = fract(uPhase * rate + ph);
          float rw = recoveryWeight(p0);
          for (int k = 0; k < SEGS; k++) {
            if (k >= idx) break;
            float sk = (float(k) + 0.5) / float(SEGS);
            float pk = fract(uPhase * rate + ph - sk * 0.16);
            float th = strokeAngle(pk) * amp + rw * sk * 1.1 * amp; // the tip lags and curls in recovery
            tan = cos(th) * N + sin(th) * Ds;
            cur += tan * segL;
          }
          pos = cur;
          float pT = fract(uPhase * rate + ph - aS * 0.16);
          tan = cos(strokeAngle(pT) * amp) * N + sin(strokeAngle(pT) * amp) * Ds;
        } else if (kind == 1) {
          // Caudal tuft: long, stiffer cilia bent outward, with a slow passive sway.
          float sway = 0.18 * sin(uTime * 2.3 + ph * 6.28);
          vec3 cur = iBase;
          for (int k = 0; k < SEGS; k++) {
            if (k >= idx) break;
            float sk = (float(k) + 0.5) / float(SEGS);
            float th = 0.35 + sk * 0.5 + sway * sk;
            tan = normalize(cos(th) * N + sin(th) * D);
            cur += tan * segL;
          }
          pos = cur;
        } else if (kind == 2) {
          pos = iBase + N * len * aS; // docked trichocyst, a spindle under the pellicle
          tan = N;
        } else if (kind == 4) {
          // Extruded trichocyst thread: shoots out within a few frames
          // (really milliseconds), then drifts and fades. iDir = drift, ph = birth time.
          float age = uTime - ph;
          float ext = smoothstep(0.0, 0.07, age);
          vLife = (1.0 - smoothstep(1.2, 3.2, age)) * step(0.0, age);
          pos = iBase + D * age * 6.0 + N * len * ext * aS;
          tan = N;
        } else {
          // Vorticella stalk: ph = coil (0 extended, 1 contracted). The
          // spasmoneme shortens it into a tight helix; extended it sways gently.
          float c = ph;
          float L = len * (1.0 - 0.78 * c);
          vec3 E2 = normalize(cross(N, D));
          float turns = 11.0;
          float a = 6.2831853 * turns * aS;
          float sway = (1.0 - c) * 4.0 * sin(uTime * 0.9 + iBase.x * 0.05) * aS * aS;
          pos = iBase + N * (L * aS) + (D * cos(a) + E2 * sin(a)) * (6.5 * c) + D * sway;
          vec3 dp = N * L + (-D * sin(a) + E2 * cos(a)) * (6.5 * c * 6.2831853 * turns);
          tan = normalize(dp);
        }
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vec3 tv = normalize(mat3(modelViewMatrix) * tan);
        vec3 vdir = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
        vec3 sideV = cross(tv, vdir);
        float sl = length(sideV);
        sideV = sl > 1e-4 ? sideV / sl : vec3(1.0, 0.0, 0.0);
        float depth = -mv.z;
        float px = pxWorld(depth);
        float taper = kind == 4 ? mix(1.0, 1.8, smoothstep(0.85, 1.0, aS)) : mix(1.0, 0.65, aS);
        float w = wid * taper;
        float we = max(w, px * 1.1);
        vK = w / we;
        mv.xyz += sideV * aSide * we * 0.5;
        vSide = aSide; vRef = depth; vS = aS; vKind = float(kind);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_FRAG_COMMON}
      uniform float uDn, uScatter, uAlpha; uniform vec3 uAbsorb;
      varying float vSide; varying float vRef; varying float vK; varying float vS; varying float vKind; varying float vLife;
      void main() {
        float prof = 1.0 - vSide * vSide;
        float t = prof * 1.5;
        float k = vK * vLife * uAlpha;
        float tip = vKind > 3.5 && vKind < 4.5 ? smoothstep(0.85, 1.0, vS) * 1.5 : 0.0;
        // a ribbon of width w stands for a fibre of diameter w: path ≈ Δn·w
        emit(uDn * t * k * 1.0, uScatter * (0.5 + tip) * k * (0.6 + 0.4 * prof), uAbsorb * t * k, vRef);
      }`,
  });
  // The shader moves everything: never cull by the (empty) bounding sphere.
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, mat, attrs, geo };
}

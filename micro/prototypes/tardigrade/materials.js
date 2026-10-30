// Two material sets for every object.
//
// Optical (DIC and brightfield): each transparent object writes into two
// float buffers at once (multiple render targets), with additive blending and
// no depth test, so every pixel ends up holding integrals along its line of
// sight:
//   buffer 0  r = optical path difference  Σ Δn·thickness
//             g = Σ z·thickness            (z = depth relative to a reference,
//             b = Σ thickness               so g/b is the mean depth: focus)
//   buffer 1  rgb = absorbance (pigment), a = direct intensity (delivered
//             micrographs that already carry their own relief)
// Thickness comes for free from closed meshes: a front face adds -z, a back
// face +z, so the sum is (back - front), the chord through the object.
//
// Lit ("hypothetical immersive"): ordinary three.js materials, for comparison.
import * as THREE from '../shared/vendor/three.module.min.js';
import { PATTERN_GLSL } from './patterns.js';

/** Uniforms every optical material shares (set once per frame by optics.js). */
export const OPT = {
  uRef: { value: 10 },
};

const ADD = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendEquationAlpha: THREE.AddEquation,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  transparent: true,
  glslVersion: THREE.GLSL3,
};

const VERT = /* glsl */ `
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

const FRAG_HEAD = /* glsl */ `
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
    ...ADD,
    uniforms: { uRef: OPT.uRef, uDn: { value: dn }, uAbs: { value: new THREE.Vector3(...absorb) } },
    vertexShader: VERT,
    fragmentShader: FRAG_HEAD + /* glsl */ `
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

/**
 * Moss leaf: a thin closed slab (local x = along, y = across, z = normal)
 * whose upper face adds what is too fine for geometry: the raised cell walls,
 * the slightly domed cells, chloroplasts, emptied cells, and the water film
 * (thickness = capacity - dryness, steepened at the contact line so the
 * meniscus reads as an edge, never as a blue sheet).
 */
export function leafOpticalMaterial(leaf) {
  return new THREE.RawShaderMaterial({
    ...ADD,
    uniforms: {
      uRef: OPT.uRef,
      uDry: leaf.uniforms.uDry,
      uFilm: { value: leaf.filmTex },
      uEaten: { value: leaf.eatenTex },
      uEatenInfo: { value: leaf.eatenInfo },
      uFilmInfo: { value: new THREE.Vector4(leaf.len, leaf.hw0, 0, 0) },
      uKind: { value: leaf.kind === 'sphagnum' ? 1 : 0 },
      uTex: leaf.uniforms.uTex,
      uHasTex: leaf.uniforms.uHasTex,
    },
    vertexShader: VERT,
    fragmentShader: FRAG_HEAD + PATTERN_GLSL + /* glsl */ `
uniform float uDry;
uniform sampler2D uFilm;
uniform sampler2D uEaten;
uniform vec4 uEatenInfo; // cols, rows, rowOffset, colOffset
uniform vec4 uFilmInfo;  // len, hw0
uniform int uKind;
uniform sampler2D uTex;
uniform float uHasTex;

float eaten(float row, float col) {
  vec2 t = vec2((col + uEatenInfo.w + 0.5) / uEatenInfo.x, (row + uEatenInfo.z + 0.5) / uEatenInfo.y);
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return 0.0;
  return texture(uEaten, t).r;
}

void main() {
  float s = gl_FrontFacing ? -1.0 : 1.0;
  float z = vDepth - uRef;
  // The lamina itself: cell wall material and cytoplasm, ~12 µm thick.
  vec4 opd = vec4(s * z * 0.012, s * z * z * 0.5, s * z, 0.0);
  vec3 ab = s * z * vec3(0.10, 0.06, 0.18);
  float extra = 0.0, extraOpd = 0.0, direct = 0.0;
  vec3 extraAb = vec3(0.0);
  if (gl_FrontFacing) {
    vec2 p = vLocal.xy;
    float wallOpd = 0.0, green = 0.0, amber = 0.0;
    float groove = 0.0;
    if (uKind == 0) {
      vec4 loc;
      vec4 c = laminaCell(p, loc);
      float d = c.x;
      // Raised wall: ~8 µm tall, a few µm wide; thicker in the costa.
      float wall = exp(-pow(d / 0.016, 2.0));
      wallOpd = wall * (c.w > 0.5 ? 0.012 : 0.009);
      // Cells bulge slightly between walls.
      wallOpd += smoothstep(0.0, 0.09, d) * 0.0025;
      groove = exp(-pow(d / 0.05, 2.0));
      // Chloroplasts: lens-shaped discs, many per cell, crowded along the walls.
      if (c.w < 0.5 && eaten(c.y, c.z) < 0.5) {
        for (int k = 0; k < 9; k++) {
          float fk = float(k);
          vec2 h = vec2(hash1(c.y * 31.0 + c.z * 7.0 + fk * 1.7), hash1(c.y * 13.0 + c.z * 3.0 + fk * 5.3));
          vec2 q = vec2(0.08 + h.x * (loc.z - 0.16), mix(0.045, loc.w - 0.045, step(0.5, h.y)) + (h.y - 0.5) * 0.06);
          float r = length((loc.xy - q) * vec2(0.85, 1.0));
          float disc = smoothstep(0.032, 0.022, r);
          green += disc;
        }
      } else if (c.w < 0.5) {
        amber += 0.25 * smoothstep(0.0, 0.05, d); // emptied cell: brownish wreck
      }
    } else {
      vec2 rel;
      vec4 c = sphagCell(p, rel);
      float d = c.x;
      float net = smoothstep(0.03, 0.012, d);       // chlorophyllose cells
      wallOpd = exp(-pow(d / 0.012, 2.0)) * 0.010 + net * 0.003;
      green = net * 0.9 * (1.0 - eaten(c.y, c.z));
      // Spiral fibrils across each hyaline cell, and round pores near the walls.
      float fib = abs(sin((rel.x * 0.55 + rel.y * 1.0) * 46.0));
      wallOpd += (1.0 - net) * smoothstep(0.93, 1.0, fib) * 0.0035 * step(c.w, 0.92);
      vec2 pc = vec2(fract(rel.x / 0.42) - 0.5, rel.y / 0.42);
      float pore = smoothstep(0.08, 0.06, length(pc * vec2(1.0, 2.2) - vec2(0.0, 0.18)));
      wallOpd -= pore * 0.002 * step(0.55, c.w);
      groove = exp(-pow(d / 0.04, 2.0));
    }
    if (uHasTex > 0.5) {
      // A delivered DIC micrograph replaces the drawn cells (tile = 400 µm).
      vec3 t = texture(uTex, p / 4.0).rgb;
      float l = dot(t, vec3(0.299, 0.587, 0.114));
      direct += (l - 0.55) * 1.2;
      extraAb += max(-log(max(t / max(l, 0.05), vec3(0.05))), 0.0) * 0.6;
      wallOpd *= 0.15; green = 0.0;
    }
    // Water film: thickness from capacity - dryness, held in the grooves.
    vec2 fuv = vec2(p.x / uFilmInfo.x, (p.y + uFilmInfo.y) / (2.0 * uFilmInfo.y));
    float cap = texture(uFilm, fuv).r * 2.5 - 0.5;
    float h = cap - uDry + groove * 0.12;
    float film = sqrt(max(h, 0.0)) * 0.22;           // units (≈ 22 µm at h = 1)
    extraOpd = wallOpd + film * 0.33;                 // water - air: Δn 0.33
    extra = wallOpd * 8.0 + film;
    extraAb += green * vec3(0.55, 0.12, 0.62) + amber * vec3(0.05, 0.12, 0.3);
  }
  oOpd = opd + vec4(extraOpd, extra * z, extra, 0.0);
  oAbs = vec4(ab + extraAb, direct);
}`,
  });
}

/** Drifting particles (bacteria, detritus) as point sprites from a 4×4 atlas. */
export function particleOpticalMaterial(atlasUniform) {
  return new THREE.RawShaderMaterial({
    ...ADD,
    uniforms: { uRef: OPT.uRef, uAtlas: atlasUniform, uPx: { value: 100 } },
    vertexShader: /* glsl */ `
precision highp float;
in vec3 position;
in vec2 aInfo; // tile, size (units)
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uPx;
out float vDepth;
out float vTile;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  vTile = aInfo.x;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(2.0, aInfo.y * uPx / vDepth);
}`,
    fragmentShader: /* glsl */ `
precision highp float;
in float vDepth;
in float vTile;
uniform float uRef;
uniform sampler2D uAtlas;
layout(location = 0) out vec4 oOpd;
layout(location = 1) out vec4 oAbs;
void main() {
  vec2 cell = vec2(mod(vTile, 4.0), floor(vTile / 4.0));
  vec4 t = texture(uAtlas, (cell + vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)) / 4.0);
  float a = t.a;
  float th = a * 0.02;
  float z = vDepth - uRef;
  oOpd = vec4(th * 0.06, th * z, th, 0.0);
  oAbs = vec4((1.0 - t.rgb) * a * 0.5, 0.0);
}`,
  });
}

// ------------------------------------------------------------------ lit

export function litMaterial({ color = 0xffffff, opacity = 1, roughness = 0.45, emissive = 0x000000 } = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness: 0, emissive,
    transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide,
  });
}

/** Lit leaf: green cells, raised pale walls, a glossy film where it is wet. */
export function leafLitMaterial(leaf) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uDry: leaf.uniforms.uDry,
      uFilm: { value: leaf.filmTex },
      uFilmInfo: { value: new THREE.Vector4(leaf.len, leaf.hw0, 0, 0) },
      uKind: { value: leaf.kind === 'sphagnum' ? 1 : 0 },
      uTex: leaf.uniforms.uTex,
      uHasTex: leaf.uniforms.uHasTex,
      uSun: { value: new THREE.Vector3(0.4, 1, 0.3).normalize() },
    },
    vertexShader: /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorldN;
varying vec3 vWorldP;
void main() {
  vLocal = position;
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,
    fragmentShader: PATTERN_GLSL + /* glsl */ `
uniform float uDry;
uniform sampler2D uFilm;
uniform vec4 uFilmInfo;
uniform int uKind;
uniform sampler2D uTex;
uniform float uHasTex;
uniform vec3 uSun;
varying vec3 vLocal;
varying vec3 vWorldN;
varying vec3 vWorldP;
float wallD(vec2 p) {
  if (uKind == 0) { vec4 l; return laminaCell(p, l).x; }
  vec2 r; return sphagCell(p, r).x;
}
void main() {
  vec2 p = vLocal.xy;
  float d = wallD(p);
  float e = 0.006;
  vec2 g = vec2(wallD(p + vec2(e, 0.0)) - wallD(p - vec2(e, 0.0)), wallD(p + vec2(0.0, e)) - wallD(p - vec2(0.0, e))) / (2.0 * e);
  float wall = exp(-pow(d / 0.018, 2.0));
  vec3 n = normalize(vWorldN) * (gl_FrontFacing ? 1.0 : -1.0);
  // Bump: walls are ridges, so the normal tilts away from the ridge line.
  vec3 base = uKind == 0 ? vec3(0.42, 0.62, 0.22) : vec3(0.62, 0.7, 0.5);
  vec3 col = mix(base, vec3(0.86, 0.9, 0.7), wall);
  if (uKind == 1) col = mix(col, vec3(0.25, 0.55, 0.18), smoothstep(0.03, 0.012, d));
  if (uHasTex > 0.5) col = texture(uTex, p / 4.0).rgb * 1.2;
  vec2 fuv = vec2(p.x / uFilmInfo.x, (p.y + uFilmInfo.y) / (2.0 * uFilmInfo.y));
  float h = texture(uFilm, fuv).r * 2.5 - 0.5 - uDry + exp(-pow(d / 0.05, 2.0)) * 0.12;
  float wet = smoothstep(0.0, 0.08, h);
  vec3 tilt = vec3(g * (1.0 - wet * 0.7) * 0.6 * (1.0 - wall), 0.0);
  // tangent-space tilt applied in world: approximate with the screen-space derivatives
  vec3 dpx = dFdx(vWorldP), dpy = dFdy(vWorldP);
  vec2 dux = dFdx(p), duy = dFdy(p);
  float det = dux.x * duy.y - dux.y * duy.x;
  vec3 T = normalize((dpx * duy.y - dpy * dux.y) / (det + 1e-9));
  vec3 B = normalize(cross(n, T));
  vec3 nn = normalize(n - T * tilt.x - B * tilt.y);
  float diff = max(dot(nn, uSun), 0.0) * 0.8 + 0.35;
  col *= diff * (1.0 - wet * 0.15);
  vec3 V = normalize(cameraPosition - vWorldP);
  vec3 H = normalize(uSun + V);
  col += wet * pow(max(dot(n, H), 0.0), 60.0) * 0.8;
  col = mix(col, col * vec3(0.8, 0.85, 0.9), wet * 0.3);
  // Dry cells look paler and crumpled.
  col = mix(col, col * vec3(1.1, 1.0, 0.75), (1.0 - wet) * 0.5);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,
  });
}

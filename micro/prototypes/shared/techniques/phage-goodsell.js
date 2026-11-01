// Goodsell-style molecular illustration for three.js, written for the phage
// prototype (Level 6) and free for any other prototype to borrow:
//
//  - toonMaterial(): flat watercolour colour with a soft two-tone light, a
//    gentle darkening at the silhouette, watercolour mottling in world space,
//    and depth by desaturation (far things fade toward the water colour, as in
//    David Goodsell's paintings). Optional organic vertex wobble, a texture
//    map, instancing, vertex colours and clipping planes (for cutaways).
//  - inkMaterial(): the outline, an inverted hull pushed out along the normal
//    by a roughly constant screen width, fading with depth.
//  - toon(mesh-like): helpers that add an ink hull to a mesh or instanced mesh.
//  - createPost(): the final pass. The scene is drawn with a transparent
//    background into a float-free RGBA target; the pass composites it over the
//    water and applies the look: 'goodsell' (watercolour paper, wet edges),
//    'cryo' (cryo-EM greyscale: dark density, bright defocus fringe, shot
//    noise) or 'fluor' (pseudo-colour emission on black). It also draws the
//    UV wash above a screen line, a flash, and a vignette.
//
// Since 1 November 2026 the same materials and pass also draw the default
// look, "realistic microscopic false light" (micro/design/phage-visual-style.html):
// goodsellShared.uStyle = 1 switches every material to a physically flavoured
// shading (wrap-lit albedo, a thickness-based translucency that darkens thick
// centres toward deep blue and lets the light through thin edges, a Fresnel
// rim, a wet specular, an optional procedural bump with cavity darkening and
// an emissive glow), and createPost's look 3 composites it over teal water
// with soft light shafts, a gentle depth-of-field from the depth buffer, a
// two-level threshold/blur bloom, haze, a filmic tone curve and a teal grade.
// Each material takes its false-light parameters from `fl` (see FL_DEFAULTS).
import * as THREE from '../vendor/three.module.min.js';

const NOISE = /* glsl */`
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

/** Shared uniforms: every toon/ink material reads these (fog, light, time). */
export const goodsellShared = {
  uFogColor: { value: new THREE.Color('#bcd3ea') },
  uFogNear: { value: 120 },
  uFogFar: { value: 420 },
  uDepthOn: { value: 1 },
  uTime: { value: 0 },
  uInkOn: { value: 1 },
  uInkWidth: { value: 0.0022 },
  uStyle: { value: 1 },                              // 0 Goodsell (and cryo/fluor), 1 false light
  uHaze: { value: new THREE.Color('#123f4c') },      // false light: the water's haze colour
};

/** False-light parameters per material (toonMaterial({ fl: {...} })). */
export const FL_DEFAULTS = {
  color: '#2f6fa8', color2: '#6fb3cf', keep: 0.35, // palette pair (variegated in world space) and how much of the own colour stays
  glow: 0, glowColor: '#ffc65a',                  // emissive glow (feeds the bloom)
  trans: 0.6, bump: 0, spec: 0.35, scale: 0.12,   // translucency, procedural bump, wet specular, variegation scale
};

const VERT = /* glsl */`
#include <common>
#include <clipping_planes_pars_vertex>
${NOISE}
uniform float uTime; uniform float uWob; uniform float uWobFreq;
attribute vec3 color;
varying vec3 vN; varying vec3 vView; varying vec3 vWorld; varying vec3 vCol; varying vec2 vUv; varying float vDepth;
void main(){
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
  im = instanceMatrix;
  #endif
  vec3 p = position;
  #ifdef WOBBLE
  float w = n3(p * uWobFreq + vec3(uTime * 0.35, uTime * 0.27, -uTime * 0.31)) - 0.5;
  p += normal * w * uWob;
  #endif
  vec4 wp = modelMatrix * im * vec4(p, 1.0);
  vec4 mvPosition = viewMatrix * wp;
  vWorld = wp.xyz;
  vN = normalize(normalMatrix * mat3(im) * normal);
  vView = -mvPosition.xyz;
  vDepth = -mvPosition.z;
  vCol = vec3(1.0);
  #ifdef USE_VCOL
  vCol = color;
  #endif
  #ifdef USE_INSTANCING_COLOR
  vCol *= instanceColor;
  #endif
  vUv = uv;
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}`;

const FRAG = /* glsl */`
#include <common>
#include <clipping_planes_pars_fragment>
${NOISE}
uniform vec3 uColor; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uDepthOn;
uniform float uOpacity; uniform float uDark; uniform vec3 uDarkColor; uniform float uMottle; uniform float uEmissive;
uniform sampler2D uMap; uniform float uUseMap; uniform vec2 uMapRepeat; uniform vec2 uMapOffset;
uniform float uStyle; uniform vec3 uHaze;
uniform vec3 uFLColor; uniform vec3 uFLColor2; uniform float uFLKeep; uniform float uFLGlow; uniform vec3 uFLGlowColor;
uniform float uFLTrans; uniform float uFLBump; uniform float uFLSpec; uniform float uFLScale;
varying vec3 vN; varying vec3 vView; varying vec3 vWorld; varying vec3 vCol; varying vec2 vUv; varying float vDepth;
vec4 falseLight(vec3 n, vec3 v){
  vec3 src = uColor * vCol;
  float l = dot(src, vec3(0.299, 0.587, 0.114));
  // variegated palette in world space, so it sticks to the thing
  float m = n3(vWorld * uFLScale) * 0.6 + n3(vWorld * uFLScale * 3.7) * 0.4;
  vec3 pal = mix(uFLColor, uFLColor2, smoothstep(0.28, 0.72, m));
  vec3 albedo = mix(pal * (0.62 + 0.55 * l), src, uFLKeep);
  if (uUseMap > 0.5) { vec3 tx = texture2D(uMap, vUv * uMapRepeat + uMapOffset).rgb; albedo *= mix(1.0, dot(tx, vec3(0.333)) * 1.45, 0.55); }
  float cav = 1.0;
  if (uFLBump > 0.0) {
    // procedural bump (height from world noise, normal from screen derivatives): a wet, lumpy membrane
    float h = n3(vWorld * 0.3) * 0.62 + n3(vWorld * 0.95) * 0.38;
    vec3 pv = -vView; vec3 dpx = dFdx(pv), dpy = dFdy(pv);
    float hx = dFdx(h), hy = dFdy(h);
    vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (hx * r1 + hy * r2);
    n = normalize(abs(det) * n - grad * uFLBump);
    cav = 0.62 + 0.75 * h;
    albedo = mix(albedo, albedo * vec3(1.25, 1.18, 0.82) + vec3(0.06, 0.07, 0.0), smoothstep(0.62, 0.8, h) * 0.6); // pale crests
  }
  // the hypothetical light: a warm key from the upper left, a teal fill from the water, wrapped for soft matter
  vec3 L = normalize(vec3(-0.45, 0.75, 0.5));
  float ndl = dot(n, L);
  float wrapD = clamp((ndl + 0.6) / 1.6, 0.0, 1.0);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.6);
  vec3 key = vec3(1.0, 0.93, 0.8);
  vec3 fill = vec3(0.3, 0.58, 0.7);
  vec3 col = albedo * (key * wrapD * 0.9 + fill * (0.6 + 0.4 * n.y));
  // translucency: thick centres absorb toward deep blue, thin edges let the light through
  col = mix(col, albedo * vec3(0.28, 0.5, 0.78), uFLTrans * ndv * ndv * 0.5);
  col += uFLTrans * fres * (albedo * 0.55 + vec3(0.32, 0.66, 0.76)) * 0.8;
  // wet specular
  vec3 H = normalize(L + v);
  col += key * pow(max(dot(n, H), 0.0), 64.0) * uFLSpec * (uFLBump > 0.0 ? cav : 1.0);
  col *= mix(1.0, cav, 0.8);
  // emissive glow (the phage's false light; the guide RNA's tell)
  float glow = uFLGlow * (1.0 - uDark * 0.85);
  col += uFLGlowColor * glow * (0.5 + 1.3 * fres);
  col += albedo * uEmissive * 1.6;
  col = mix(col, uDarkColor * 0.35, uDark * 0.6);
  // haze: a long, gentle fade into the water (a large depth of field: things stay readable)
  float f = uDepthOn * smoothstep(uFogNear, uFogFar * 1.8, vDepth) * 0.72;
  col = mix(col, uHaze, f * (1.0 - min(glow, 1.0) * 0.45));
  float a = uOpacity;
  if (uOpacity < 0.99) a = clamp(uOpacity * 0.55 + fres * 0.7 + glow * 0.1, 0.0, 1.0);
  return vec4(col, a);
}
void main(){
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN); vec3 v = normalize(vView);
  if (!gl_FrontFacing) n = -n;
  if (uStyle > 0.5) { gl_FragColor = falseLight(n, v); return; }
  vec3 L = normalize(vec3(-0.35, 0.75, 0.55));
  float d = dot(n, L);
  float shade = smoothstep(-0.35, 0.85, d);
  float rim = pow(1.0 - abs(dot(n, v)), 2.2);
  vec3 base = uColor * vCol;
  if (uUseMap > 0.5) base *= texture2D(uMap, vUv * uMapRepeat + uMapOffset).rgb * 1.15;
  base = mix(base, uDarkColor, uDark);
  vec3 col = base * (0.74 + 0.30 * shade) * (1.0 - 0.22 * rim);
  col += base * uEmissive;
  // watercolour mottling, in world space so it sticks to the thing
  float m = n3(vWorld * 0.35) * 0.6 + n3(vWorld * 1.3) * 0.4;
  col *= 1.0 + (m - 0.5) * uMottle;
  // depth by desaturation: toward the water colour, greyer with distance
  float f = uDepthOn * smoothstep(uFogNear, uFogFar, vDepth);
  float g = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(g), f * 0.5);
  col = mix(col, uFogColor, f * 0.82);
  gl_FragColor = vec4(col, uOpacity);
}`;

const INK_VERT = /* glsl */`
#include <common>
#include <clipping_planes_pars_vertex>
${NOISE}
uniform float uTime; uniform float uWob; uniform float uWobFreq; uniform float uInkWidth; uniform float uScale;
varying float vDepth;
void main(){
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
  im = instanceMatrix;
  #endif
  vec3 p = position;
  #ifdef WOBBLE
  float w = n3(p * uWobFreq + vec3(uTime * 0.35, uTime * 0.27, -uTime * 0.31)) - 0.5;
  p += normal * w * uWob;
  #endif
  vec4 mvPosition = viewMatrix * modelMatrix * im * vec4(p, 1.0);
  vec3 nv = normalize(normalMatrix * mat3(im) * normal);
  float depth = -mvPosition.z;
  mvPosition.xyz += nv * uInkWidth * depth * uScale;
  vDepth = depth;
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}`;

const INK_FRAG = /* glsl */`
#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 uInk; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uDepthOn; uniform float uInkOn; uniform float uOpacity;
varying float vDepth;
void main(){
  #include <clipping_planes_fragment>
  if (uInkOn < 0.5) discard;
  float f = uDepthOn * smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = vec4(mix(uInk, uFogColor, f * 0.85), uOpacity);
}`;

/**
 * A Goodsell toon material.
 * @param {{color?:THREE.ColorRepresentation, vertexColors?:boolean, opacity?:number,
 *   wobble?:number, wobbleFreq?:number, map?:THREE.Texture|null, mapRepeat?:[number,number],
 *   mottle?:number, side?:THREE.Side, clip?:boolean}} o
 */
export function toonMaterial(o = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...goodsellShared,
      uColor: { value: new THREE.Color(o.color ?? '#ffffff') },
      uOpacity: { value: o.opacity ?? 1 },
      uDark: { value: 0 },
      uDarkColor: { value: new THREE.Color('#2a1a10') },
      uMottle: { value: o.mottle ?? 0.16 },
      uEmissive: { value: 0 },
      uWob: { value: o.wobble ?? 0 },
      uWobFreq: { value: o.wobbleFreq ?? 0.05 },
      uMap: { value: o.map || null },
      uUseMap: { value: o.map ? 1 : 0 },
      uMapRepeat: { value: new THREE.Vector2(...(o.mapRepeat || [1, 1])) },
      uMapOffset: { value: new THREE.Vector2(...(o.mapOffset || [0, 0])) },
      uFLColor: { value: new THREE.Color() }, uFLColor2: { value: new THREE.Color() }, uFLKeep: { value: 0 },
      uFLGlow: { value: 0 }, uFLGlowColor: { value: new THREE.Color() }, uFLTrans: { value: 0 }, uFLBump: { value: 0 },
      uFLSpec: { value: 0 }, uFLScale: { value: 0.12 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: { ...(o.vertexColors ? { USE_VCOL: '' } : {}), ...(o.wobble ? { WOBBLE: '' } : {}) },
    transparent: (o.opacity ?? 1) < 1,
    depthWrite: (o.opacity ?? 1) >= 1,
    side: o.side ?? THREE.FrontSide,
    clipping: !!o.clip,
  });
  mat.setMap = (tex, repeat, offset) => {
    mat.uniforms.uMap.value = tex; mat.uniforms.uUseMap.value = tex ? 1 : 0;
    if (repeat) mat.uniforms.uMapRepeat.value.set(...repeat);
    mat.uniforms.uMapOffset.value.set(...(offset || [0, 0]));
  };
  mat.setFL = (fl) => setFL(mat, fl);
  setFL(mat, o.fl);
  return mat;
}

/** Set a material's false-light parameters (merged over FL_DEFAULTS, or over its current values with `partial`). */
export function setFL(mat, fl = {}, partial = false) {
  const u = mat.uniforms;
  const d = partial ? {} : FL_DEFAULTS;
  const v = (k) => (fl[k] !== undefined ? fl[k] : d[k]);
  if (v('color') !== undefined) u.uFLColor.value.set(v('color'));
  if (v('color2') !== undefined || v('color') !== undefined) u.uFLColor2.value.set(v('color2') ?? v('color'));
  for (const [k, name] of [['keep', 'uFLKeep'], ['glow', 'uFLGlow'], ['trans', 'uFLTrans'], ['bump', 'uFLBump'], ['spec', 'uFLSpec'], ['scale', 'uFLScale']]) if (v(k) !== undefined) u[name].value = v(k);
  if (v('glowColor') !== undefined) u.uFLGlowColor.value.set(v('glowColor'));
  return mat;
}

/** The ink outline (inverted hull). `width` scales the shared screen width. */
export function inkMaterial(o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...goodsellShared,
      uInk: { value: new THREE.Color(o.color ?? '#2b2236') },
      uScale: { value: o.width ?? 1 },
      uOpacity: { value: o.opacity ?? 1 },
      uWob: { value: o.wobble ?? 0 },
      uWobFreq: { value: o.wobbleFreq ?? 0.05 },
    },
    vertexShader: INK_VERT,
    fragmentShader: INK_FRAG,
    defines: o.wobble ? { WOBBLE: '' } : {},
    side: THREE.BackSide,
    transparent: (o.opacity ?? 1) < 1,
    depthWrite: (o.opacity ?? 1) >= 1,
    clipping: !!o.clip,
  });
}

/** A mesh with its ink hull as a child. Returns the mesh (mesh.ink is the hull). */
export function inked(geometry, mat, inkOpts = {}) {
  const mesh = new THREE.Mesh(geometry, mat);
  const ink = new THREE.Mesh(geometry, inkMaterial({
    wobble: mat.uniforms.uWob.value, wobbleFreq: mat.uniforms.uWobFreq.value, clip: mat.clipping, ...inkOpts }));
  ink.renderOrder = -1;
  mesh.add(ink);
  mesh.ink = ink;
  return mesh;
}

/** Show or hide every ink hull under `root` (hidden hulls cost no draw call). A hull can opt out with userData.inkOff. */
export function setInkVisible(root, on) {
  root.traverse((o) => { if (o.ink) { o.ink.userData.inkOn = on; o.ink.visible = on && !o.ink.userData.inkOff; } });
}

/** An instanced mesh with an ink hull sharing its instance matrices. */
export function inkedInstanced(geometry, mat, count, inkOpts = {}) {
  const mesh = new THREE.InstancedMesh(geometry, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const ink = new THREE.InstancedMesh(geometry, inkMaterial({ clip: mat.clipping, ...inkOpts }), count);
  ink.instanceMatrix = mesh.instanceMatrix;
  ink.frustumCulled = mesh.frustumCulled = false;
  mesh.add(ink);
  mesh.ink = ink;
  // (an instanced mesh with nothing to draw is hidden, so it costs no draw call)
  const setCount = (n) => { mesh.count = n; ink.count = n; mesh.visible = n > 0; };
  mesh.setCount = setCount;
  return mesh;
}

/**
 * Merge a few spheres into one geometry with vertex colours: a "molecule"
 * in Goodsell's manner (a cluster of atoms or subunits).
 * @param {{p:[number,number,number], r:number, c:THREE.ColorRepresentation}[]} parts
 */
export function blobGeometry(parts, detail = 1) {
  const pos = [], nor = [], col = [], idx = [];
  let base = 0;
  for (const part of parts) {
    const g = new THREE.IcosahedronGeometry(part.r, detail);
    const gi = g;
    const P = gi.attributes.position, N = gi.attributes.normal;
    const c = new THREE.Color(part.c);
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i) + part.p[0], P.getY(i) + part.p[1], P.getZ(i) + part.p[2]);
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      col.push(c.r, c.g, c.b);
    }
    if (gi.index) for (let i = 0; i < gi.index.count; i++) idx.push(gi.index.getX(i) + base);
    else for (let i = 0; i < P.count; i++) idx.push(i + base);
    base += P.count;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  geo.setIndex(idx);
  geo.userData.parts = parts;
  return geo;
}

/**
 * The same molecule as a lumpy cluster of clusters (each sphere becomes a core
 * and `k` smaller beads round it, detail 0), for the false-light look, whose
 * reference molecules read as bead-flowers with bumpy silhouettes. Swap it in
 * with mesh.geometry = lumpyGeometry(geo.userData.parts).
 */
export function lumpyGeometry(parts, k = 6, detail = 0) {
  const out = [];
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const part of parts) {
    const [x, y, z] = part.p, r = part.r;
    out.push({ p: [x, y, z], r: r * 0.66, c: part.c });
    for (let i = 0; i < k; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, q = Math.sqrt(1 - u * u);
      out.push({ p: [x + q * Math.cos(a) * r * 0.58, y + u * r * 0.58, z + q * Math.sin(a) * r * 0.58], r: r * (0.34 + rnd() * 0.14), c: part.c });
    }
  }
  return blobGeometry(out, detail);
}

const POST_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tScene; uniform sampler2D tBg; uniform float uUseBg; uniform vec2 uBgOff;
uniform vec2 uRes; uniform float uTime; uniform int uLook; uniform vec3 uWater;
uniform float uUvLine; uniform float uUv; uniform float uFlash; uniform vec3 uFlashColor; uniform float uPaper;
uniform float uFade;
uniform sampler2D tDepth; uniform float uNear; uniform float uFar; uniform float uFocus; uniform float uDof;
uniform sampler2D tBloomA; uniform sampler2D tBloomB; uniform float uBloom; uniform sampler2D tSoft; uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uShaft;
uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform float uProjScale;
uniform float uAO; uniform float uAOR; uniform int uAOTaps; uniform float uEdge; uniform vec3 uInk;
uniform sampler2D tPano; uniform float uUsePano; uniform vec2 uUvY; uniform vec2 uUvX; uniform float uUvWorld;
varying vec2 vUv;
${NOISE}
float linDepth(vec2 uv){ float z = texture2D(tDepth, uv).r * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
vec4 S(vec2 o){ return texture2D(tScene, vUv + o / uRes); }
// the view ray through this pixel (view space, z = -1), and the world direction: the backdrop and the UV
// are placed by direction and position, never by screen, so they hold whichever way the camera turns
vec3 viewRay(vec2 uv){ vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0); p.xyz /= p.w; return p.xyz / -p.z; }
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ s += a * n3(p); p *= 2.07; a *= 0.5; } return s; }
// screen-space ambient occlusion (QuteMol-like crease darkening between packed molecules) and depth outlines
float ssao(float zc, vec2 px){
  float rad = clamp(uAOR * uProjScale / zc, 2.0, 48.0);
  float occ = 0.0, rot = h2(px) * 6.2832;
  for (int i = 0; i < 12; i++) {
    if (i >= uAOTaps) break;
    float a = float(i) * 2.39996 + rot, rr = rad * (0.3 + 0.7 * fract(float(i) * 0.618 + 0.17));
    float zs = linDepth(vUv + vec2(cos(a), sin(a)) * rr / uRes);
    float dz = zc - zs;
    occ += smoothstep(0.0, uAOR * 0.3, dz) * (1.0 - smoothstep(uAOR * 0.8, uAOR * 2.5, dz));
  }
  return occ / float(uAOTaps);
}
float outline(float zc){
  vec2 e = vec2(1.0, 0.0) / uRes * max(1.0, uRes.y / 720.0);
  float zm = max(max(linDepth(vUv + e.xy), linDepth(vUv - e.xy)), max(linDepth(vUv + e.yx), linDepth(vUv - e.yx)));
  return smoothstep(0.035, 0.12, (zm - zc) / zc);
}
void main(){
  vec2 px = vUv * uRes;
  vec3 col;
  vec3 ray = viewRay(vUv);
  vec3 wdir = normalize(mat3(uCamWorld) * ray);
  vec4 sc0 = S(vec2(0.0));
  float zc = sc0.a > 0.01 ? linDepth(vUv) : 900.0;
  vec3 wpos = (uCamWorld * vec4(ray * zc, 1.0)).xyz;
  float shadeK = 1.0, inkK = 0.0;
  if (sc0.a > 0.01 && zc < uFar * 0.9) {
    if (uAO > 0.0 && uAOTaps > 0) shadeK = 1.0 - uAO * ssao(zc, px);
    if (uEdge > 0.0) inkK = uEdge * outline(zc) * (1.0 - smoothstep(uFocus * 1.5, uFocus * 6.0, zc));
  }
  if (uLook == 3) {
    // realistic false light: teal water, soft shafts from the upper left, a gentle DOF, bloom, a filmic grade
    float asp = uRes.x / uRes.y;
    vec2 q0 = vUv * vec2(asp, 1.0);
    // the backdrop by direction: lighter toward the sunlit surface (+y), clouds and far molecules all round
    vec3 bg = mix(uBot, uTop, smoothstep(-1.0, 1.0, wdir.y * 0.8 + 0.15));
    float cloud = fbm3(wdir * 2.6 + vec3(uTime * 0.01, 0.0, 0.0));
    bg *= 0.75 + 0.5 * cloud;
    float far1 = smoothstep(0.62, 0.8, n3(wdir * 22.0 + 4.0)), far2 = smoothstep(0.6, 0.78, n3(wdir * 41.0 - 9.0));
    bg = mix(bg, bg * vec3(0.55, 0.7, 0.95) + uShaft * 0.06, far1 * 0.5 + far2 * 0.3);
    if (uUsePano > 0.5) bg = mix(bg, texture2D(tPano, vec2(atan(wdir.z, wdir.x) / 6.2832 + 0.5, asin(clamp(wdir.y, -1.0, 1.0)) / 3.14159 + 0.5)).rgb, 0.85);
    vec2 sd = normalize(vec2(0.55, -1.0));
    float across = dot(q0 - vec2(0.1, 1.1), vec2(-sd.y, sd.x));
    float shaft = fbm(vec2(across * 7.0 + uBgOff.x * 4.0, uTime * 0.03)) * smoothstep(1.4, 0.0, length(q0 - vec2(0.1 * asp, 1.0)));
    bg += uShaft * pow(shaft, 2.0) * 0.55;
    vec4 sc = S(vec2(0.0));
    if (uDof > 0.0) {
      // a large depth of field: only far layers soften, gently (and the very near)
      float z = linDepth(vUv);
      float coc = (smoothstep(uFocus * 1.6, uFocus * 6.0, z) + (1.0 - smoothstep(uFocus * 0.25, uFocus * 0.55, z))) * uDof;
      // soften toward a blurred quarter-resolution copy (smooth, no ring artefacts)
      sc = mix(sc, texture2D(tSoft, vUv), clamp(coc, 0.0, 1.0) * 0.85);
    }
    sc.rgb *= shadeK;
    sc.rgb = mix(sc.rgb, uInk * sc.a * 0.35, inkK * 0.75);
    col = bg * (1.0 - sc.a) + sc.rgb;
    // haze lifted by the light near the key's corner
    col += uShaft * 0.06 * smoothstep(1.3, 0.0, length(q0 - vec2(0.15 * asp, 1.0)));
    if (uBloom > 0.0) col += (texture2D(tBloomA, vUv).rgb * 0.9 + texture2D(tBloomB, vUv).rgb * 1.2) * uBloom;
    // exposure, a filmic tone curve, then a teal grade with golden highlights
    col *= 1.6;
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col * vec3(0.86, 1.02, 1.08), col * vec3(1.06, 1.0, 0.9), smoothstep(0.35, 0.9, lum));
    col += (h2(px + fract(uTime * 3.1) * 71.0) - 0.5) * 0.02;
    vec2 qq = vUv - 0.5;
    col *= 1.0 - dot(qq, qq) * 0.55;
    if (uUv > 0.0) {
      float above = uUvWorld > 0.5 ? smoothstep(uUvY.x - 60.0, uUvY.y, wpos.y) * smoothstep(uUvX.x, uUvX.y, wpos.x) : smoothstep(uUvLine - 0.25, uUvLine + 0.35, vUv.y);
      float shafts = 0.6 + 0.4 * sin(vUv.x * 23.0 + vUv.y * 6.0 + uTime * 0.4) * sin(vUv.x * 9.0 - uTime * 0.23);
      col = mix(col, vec3(0.62, 0.5, 1.0), above * uUv * (0.18 + 0.14 * shafts));
    }
    col = mix(col, uFlashColor, uFlash);
    col = mix(col, vec3(0.0), uFade);
    gl_FragColor = vec4(col, 1.0);
    return;
  }
  vec4 sc = S(vec2(0.0));
  sc.rgb *= shadeK;
  sc.rgb = mix(sc.rgb, uInk * sc.a * 0.6, inkK);
  // the target holds premultiplied colour (translucent things blend over a clear, black background)
  vec3 un = sc.rgb / max(sc.a, 0.004);
  // alpha around this pixel: edges (wet edges, defocus fringes, glow)
  float aBlur = 0.0; vec3 cBlur = vec3(0.0);
  for (int i = 0; i < 8; i++){
    float an = float(i) * 0.7853982;
    vec4 s = S(vec2(cos(an), sin(an)) * 3.5);
    aBlur += s.a; cBlur += s.rgb * s.a;
  }
  aBlur /= 8.0; cBlur /= 8.0;
  float aWide = 0.0;
  for (int i = 0; i < 8; i++){
    float an = float(i) * 0.7853982 + 0.39;
    aWide += S(vec2(cos(an), sin(an)) * 9.0).a;
  }
  aWide /= 8.0;
  if (uLook == 1) {
    // cryo-EM: projected density is dark on mid grey, defocus gives a bright fringe, shot noise everywhere
    float lum = dot(un, vec3(0.299, 0.587, 0.114));
    float dens = sc.a * (0.55 + 0.45 * (1.0 - lum));
    float g = 0.60 - dens * 0.36 + (aWide - sc.a) * -0.10 + max(0.0, aBlur - sc.a) * 0.18;
    g += (fbm(px * 0.01 + 3.0) - 0.5) * 0.06;
    g += (h2(px + fract(uTime * 7.31) * 113.0) - 0.5) * 0.20;
    col = vec3(g);
  } else if (uLook == 2) {
    // fluorescence, pseudo-colour: every protein as if tagged, glowing on black
    vec3 c = un; float mn = min(c.r, min(c.g, c.b));
    vec3 e = max(c - mn * 0.7, 0.0) * 1.9 * sc.a;
    vec3 glow = max(cBlur - min(cBlur.r, min(cBlur.g, cBlur.b)) * 0.7, 0.0) * 1.2;
    col = vec3(0.012, 0.012, 0.02) + e + glow * 0.55;
    col += (h2(px + fract(uTime * 5.7) * 91.0) - 0.5) * 0.035;
  } else {
    // Goodsell watercolour: pale water with washes, paper grain, wet edges
    vec3 bg = uWater;
    if (uUseBg > 0.5) bg = mix(texture2D(tBg, (vUv - 0.5) * 0.84 + 0.5 + clamp(uBgOff, vec2(-0.07), vec2(0.07))).rgb * 1.06, uWater, 0.3);
    else {
      float w = fbm(vUv * vec2(uRes.x / uRes.y, 1.0) * 2.5 + uBgOff * 1.0);
      bg = uWater * (0.92 + 0.14 * w);
    }
    col = bg * (1.0 - sc.a) + sc.rgb;
    float edge = clamp(abs(aBlur - sc.a) * 1.6, 0.0, 1.0);
    col *= 1.0 - edge * 0.18;
    float paper = fbm(px * 0.35) * 0.6 + n2(px * 1.7) * 0.4;
    col *= 1.0 + (paper - 0.5) * 0.10 * uPaper;
    float wash = fbm(px * 0.004 + vec2(uTime * 0.003, 0.0));
    col *= 1.0 + (wash - 0.5) * 0.08 * uPaper;
  }
  // UV from the sunlit film above: a violet wash with soft shafts, above the line
  if (uUv > 0.0) {
    float above = uUvWorld > 0.5 ? smoothstep(uUvY.x - 60.0, uUvY.y, wpos.y) * smoothstep(uUvX.x, uUvX.y, wpos.x) : smoothstep(uUvLine - 0.25, uUvLine + 0.35, vUv.y);
    float shafts = 0.6 + 0.4 * sin(vUv.x * 23.0 + vUv.y * 6.0 + uTime * 0.4) * sin(vUv.x * 9.0 - uTime * 0.23);
    vec3 uvc = uLook == 1 ? vec3(0.95) : (uLook == 2 ? vec3(0.55, 0.35, 1.0) : vec3(0.93, 0.86, 1.0));
    col = mix(col, uvc, above * uUv * (0.22 + 0.16 * shafts));
  }
  col = mix(col, uFlashColor, uFlash);
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * (uLook == 1 ? 0.5 : 0.35);
  col = mix(col, vec3(0.0), uFade);
  gl_FragColor = vec4(col, 1.0);
}`;

const BRIGHT_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr;
varying vec2 vUv;
void main(){
  vec4 c = vec4(0.0);
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)); c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0));
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)); c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0));
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = uThr > 0.0 ? vec4(c.rgb * smoothstep(uThr, uThr + 0.55, l), 1.0) : c; // (threshold 0: a plain downsample, alpha kept)
}`;
const BLUR_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tSrc; uniform vec2 uDir;
varying vec2 vUv;
void main(){
  // 9-tap gaussian in 5 linear fetches
  vec4 c = texture2D(tSrc, vUv) * 0.227027;
  c += texture2D(tSrc, vUv + uDir * 1.384615) * 0.316216; c += texture2D(tSrc, vUv - uDir * 1.384615) * 0.316216;
  c += texture2D(tSrc, vUv + uDir * 3.230769) * 0.070270; c += texture2D(tSrc, vUv - uDir * 3.230769) * 0.070270;
  gl_FragColor = c;
}`;

/**
 * The final pass. Render the scene into post.target (clear alpha 0), then post.render().
 * Look 3 (false light) also reads the depth buffer (DOF) and runs a bloom chain at
 * 1/4 and 1/8 of the target; post.quality (0..2) trims it (2: DOF and two bloom
 * levels, 1: one bloom level, 0: no DOF, one cheap bloom level).
 */
export function createPost(renderer) {
  const gl = renderer.getContext();
  // HDR when the GPU can render to half floats (the glow is then free to exceed 1 and bloom)
  const hdr = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const target = new THREE.WebGLRenderTarget(2, 2, { samples: 0, type });
  target.depthTexture = new THREE.DepthTexture(2, 2);
  const mk = () => new THREE.WebGLRenderTarget(2, 2, { samples: 0, type, depthBuffer: false });
  const bA = [mk(), mk()], bB = [mk(), mk()], dA = [mk(), mk()]; // bloom at 1/4 and 1/8, the DOF's soft copy at 1/4 (ping-pong pairs)
  const all = [target, ...bA, ...bB, ...dA];
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: target.texture }, tBg: { value: null }, uUseBg: { value: 0 }, uBgOff: { value: new THREE.Vector2() },
      uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uLook: { value: 0 },
      uWater: { value: new THREE.Color('#bcd3ea') }, uUvLine: { value: 2 }, uUv: { value: 0 },
      uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color('#ffffff') }, uPaper: { value: 1 }, uFade: { value: 0 },
      tDepth: { value: target.depthTexture }, uNear: { value: 2 }, uFar: { value: 3000 }, uFocus: { value: 110 }, uDof: { value: 1 },
      tBloomA: { value: bA[0].texture }, tBloomB: { value: bB[0].texture }, uBloom: { value: 1 }, tSoft: { value: dA[0].texture },
      uTop: { value: new THREE.Color('#2a7f8e') }, uBot: { value: new THREE.Color('#071e2c') }, uShaft: { value: new THREE.Color('#7fd0d4') },
      uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uProjScale: { value: 500 },
      uAO: { value: 0 }, uAOR: { value: 6 }, uAOTaps: { value: 8 }, uEdge: { value: 0 }, uInk: { value: new THREE.Color('#10202c') },
      tPano: { value: null }, uUsePano: { value: 0 }, uUvY: { value: new THREE.Vector2(1e9, 1e9) }, uUvX: { value: new THREE.Vector2(0, 1) }, uUvWorld: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: POST_FRAG,
    depthTest: false, depthWrite: false,
  });
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const bright = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: hdr ? 0.8 : 0.66 } }, vertexShader: vs, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false });
  const blur = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: vs, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pass = (m, to) => { quad.material = m; renderer.setRenderTarget(to); renderer.render(scene, cam); };
  function blurPair(pair) {
    const [a, b] = pair;
    blur.uniforms.tSrc.value = a.texture; blur.uniforms.uDir.value.set(1 / a.width, 0); pass(blur, b);
    blur.uniforms.tSrc.value = b.texture; blur.uniforms.uDir.value.set(0, 1 / a.height); pass(blur, a);
  }
  const api = {
    target,
    hdr,
    uniforms: mat.uniforms,
    LOOKS: { goodsell: 0, cryo: 1, fluor: 2, falseLight: 3 },
    /** Effects quality 0..2 (the quality governor's level). */
    quality: 2,
    resize(w, h) {
      w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
      if (target.width === w && target.height === h) return;
      target.setSize(w, h); mat.uniforms.uRes.value.set(w, h);
      for (const t of [...bA, ...dA]) t.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2));
      for (const t of bB) t.setSize(Math.max(1, w >> 3), Math.max(1, h >> 3));
    },
    setBackdrop(tex) { mat.uniforms.tBg.value = tex; mat.uniforms.uUseBg.value = tex ? 1 : 0; },
    /** An equirectangular panorama for the false-light backdrop (by view direction), or null. */
    setPanorama(tex) { mat.uniforms.tPano.value = tex; mat.uniforms.uUsePano.value = tex ? 1 : 0; },
    /**
     * Draw `sceneToDraw` with `camera` into the target, then the look to the screen.
     * `scissor(rt)`, if given, is called on each internal target before it is drawn
     * (split screen: split.scissor(view, rt) limits every pass to the view's region).
     */
    render(sceneToDraw, camera, scissor = null) {
      if (scissor) for (const t of all) scissor(t);
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      renderer.render(sceneToDraw, camera);
      const fl = mat.uniforms.uLook.value === 3;
      const q = api.quality;
      const u = mat.uniforms;
      u.uNear.value = camera.near; u.uFar.value = camera.far;
      u.uInvProj.value.copy(camera.projectionMatrixInverse); u.uCamWorld.value.copy(camera.matrixWorld);
      if (camera.isPerspectiveCamera) u.uProjScale.value = target.height / (2 * Math.tan((camera.fov * Math.PI) / 360) * (camera.zoom || 1)) * (camera.view && camera.view.enabled ? camera.view.fullHeight / camera.view.height : 1);
      u.uAOTaps.value = q > 1 ? 10 : q > 0 ? 6 : 0;
      if (fl) {
        mat.uniforms.uNear.value = camera.near; mat.uniforms.uFar.value = camera.far;
        mat.uniforms.uDof.value = q > 0 ? 1 : 0;
        // bloom: bright pass to 1/4, blur; then (q 2) down to 1/8 and blur again for the wide glow
        if (q > 0) {
          // the DOF's soft copy: a quarter-resolution downsample, blurred twice
          const thr = bright.uniforms.uThr.value; bright.uniforms.uThr.value = 0;
          bright.uniforms.tSrc.value = target.texture; bright.uniforms.uTexel.value.set(1 / target.width, 1 / target.height);
          pass(bright, dA[0]); bright.uniforms.uThr.value = thr;
          // the bloom's bright pass thresholds the same 4-tap quarter-resolution average, so it reads
          // that copy (before its blur) texel for texel instead of the full-resolution scene again
          bright.uniforms.tSrc.value = dA[0].texture; bright.uniforms.uTexel.value.set(0, 0);
          pass(bright, bA[0]);
          blurPair(dA); blurPair(dA);
        } else {
          bright.uniforms.tSrc.value = target.texture; bright.uniforms.uTexel.value.set(1 / target.width, 1 / target.height);
          pass(bright, bB[0]);
        }
        const first = q > 0 ? bA : bB;
        blurPair(first);
        if (q > 1) {
          bright.uniforms.tSrc.value = bA[0].texture; bright.uniforms.uTexel.value.set(0.5 / bA[0].width, 0.5 / bA[0].height);
          const thr = bright.uniforms.uThr.value; bright.uniforms.uThr.value = 0;
          pass(bright, bB[0]);
          bright.uniforms.uThr.value = thr;
          blurPair(bB);
        }
        mat.uniforms.tBloomA.value = q > 0 ? bA[0].texture : bB[0].texture;
        mat.uniforms.tBloomB.value = q > 1 ? bB[0].texture : bA[0].texture;
        mat.uniforms.uBloom.value = q > 1 ? 1 : q > 0 ? 1.4 : 1.6;
        if (q === 1) mat.uniforms.tBloomB.value = bA[0].texture;
      }
      quad.material = mat;
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(scene, cam);
    },
  };
  return api;
}

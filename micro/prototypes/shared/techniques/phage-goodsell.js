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
  uFalseLight: { value: 0 },
  uInkWidth: { value: 0.0022 },
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
uniform float uFalseLight; uniform float uSurfaceKind;
uniform float uOpacity; uniform float uDark; uniform vec3 uDarkColor; uniform float uMottle; uniform float uEmissive;
uniform sampler2D uMap; uniform float uUseMap; uniform vec2 uMapRepeat; uniform vec2 uMapOffset;
varying vec3 vN; varying vec3 vView; varying vec3 vWorld; varying vec3 vCol; varying vec2 vUv; varying float vDepth;
vec3 proteinNormal(vec3 n, float h){
  vec3 dx = dFdx(-vView), dy = dFdy(-vView);
  vec3 rx = cross(dy, n), ry = cross(n, dx);
  float det = dot(dx, rx);
  return normalize(abs(det) * n - sign(det) * (dFdx(h) * rx + dFdy(h) * ry));
}
vec3 falseLight(vec3 n, vec3 v, vec3 original){
  float grain = n3(vWorld * 0.75) * 0.7 + n3(vWorld * 1.9) * 0.3;
  float ridges = n3(vWorld * 0.18 + n3(vWorld * 0.5));
  float detail = 1.0-smoothstep(0.15,0.65,max(length(dFdx(vWorld)),length(dFdy(vWorld))));
  n = proteinNormal(n, grain * 0.12 * detail + ridges * 0.28);
  float kind = uSurfaceKind;
  vec3 base = mix(vec3(0.009,0.055,0.10), vec3(0.035,0.19,0.26), ridges);
  float emit = 0.0;
  if(kind > 0.5 && kind < 1.5){
    base = mix(vec3(0.65,0.27,0.045), vec3(1.0,0.73,0.31), grain);
    emit = 0.12;
  }else if(kind > 1.5 && kind < 2.5){
    base = vec3(1.0,0.60,0.15); emit = 1.3;
  }else if(kind > 2.5 && kind < 3.5){
    float tint = dot(original, vec3(0.1,0.5,0.4));
    base = mix(vec3(0.045,0.07,0.19), vec3(0.06,0.20,0.28), tint);
  }else if(kind > 3.5 && kind < 4.5){
    base = original * 0.75 + vec3(0.02,0.06,0.10);
  }else if(kind > 4.5 && kind < 5.5){
    base = vec3(0.75,0.44,0.10); emit = 0.10;
  }else if(kind > 5.5){
    base = mix(vec3(0.16,0.075,0.29), vec3(0.41,0.22,0.55), grain);
  }
  base *= 0.78 + grain * 0.38;
  base = mix(base, uDarkColor, uDark);
  vec3 key = normalize(vec3(-0.45,0.75,0.8));
  vec3 fill = normalize(vec3(0.8,0.1,0.4));
  vec3 back = normalize(vec3(-0.2,-0.35,-0.8));
  float ndv = max(0.0,dot(n,v));
  float fresnel = pow(1.0-ndv,3.5);
  float rough = kind > 0.5 && kind < 2.5 ? 0.25 : 0.55;
  float spec = pow(max(0.0,dot(n,normalize(key+v))),mix(130.0,22.0,rough));
  float fillSpec = pow(max(0.0,dot(n,normalize(fill+v))),45.0);
  vec3 lit = base * (vec3(0.10,0.18,0.24) + vec3(1.0,0.86,0.69)*max(0.0,dot(n,key))*1.5 + vec3(0.12,0.42,0.72)*max(0.0,dot(n,fill))*0.7);
  lit += vec3(0.60,0.83,1.0) * (spec * 0.72 + fillSpec * 0.17);
  lit += vec3(0.17,0.50,0.67) * pow(max(0.0,dot(n,back)),1.5) * 0.42;
  lit += base * fresnel * 0.65; // thin protein edges scatter the hypothetical light
  lit += base * (emit + uEmissive * 1.5);
  if(kind > 0.5 && kind < 2.5) lit += vec3(1.0,0.61,0.18) * fresnel * 1.4;
  float fog = uDepthOn * (1.0-exp(-max(0.0,vDepth-uFogNear)*0.0035));
  return mix(lit,vec3(0.008,0.045,0.07),fog*0.8);
}
void main(){
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN); vec3 v = normalize(vView);
  if (!gl_FrontFacing) n = -n;
  vec3 L = normalize(vec3(-0.35, 0.75, 0.55));
  float d = dot(n, L);
  float shade = smoothstep(-0.35, 0.85, d);
  float rim = pow(1.0 - abs(dot(n, v)), 2.2);
  vec3 base = uColor * vCol;
  if (uUseMap > 0.5) base *= texture2D(uMap, vUv * uMapRepeat + uMapOffset).rgb * 1.15;
  if(uFalseLight > 0.5){
    gl_FragColor = vec4(falseLight(n,v,uColor*vCol),uOpacity); return;
  }
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
uniform vec3 uInk; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uDepthOn; uniform float uInkOn; uniform float uFalseLight; uniform float uOpacity;
varying float vDepth;
void main(){
  #include <clipping_planes_fragment>
  if (uInkOn < 0.5 || uFalseLight > 0.5) discard;
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
      uSurfaceKind: { value: 0 },
      uWob: { value: o.wobble ?? 0 },
      uWobFreq: { value: o.wobbleFreq ?? 0.05 },
      uMap: { value: o.map || null },
      uUseMap: { value: o.map ? 1 : 0 },
      uMapRepeat: { value: new THREE.Vector2(...(o.mapRepeat || [1, 1])) },
      uMapOffset: { value: new THREE.Vector2(...(o.mapOffset || [0, 0])) },
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

/** An instanced mesh with an ink hull sharing its instance matrices. */
export function inkedInstanced(geometry, mat, count, inkOpts = {}) {
  const mesh = new THREE.InstancedMesh(geometry, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const ink = new THREE.InstancedMesh(geometry, inkMaterial({ clip: mat.clipping, ...inkOpts }), count);
  ink.instanceMatrix = mesh.instanceMatrix;
  ink.frustumCulled = mesh.frustumCulled = false;
  mesh.add(ink);
  mesh.ink = ink;
  const setCount = (n) => { mesh.count = n; ink.count = n; };
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
  return geo;
}

const POST_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tScene; uniform sampler2D tBg; uniform float uUseBg; uniform vec2 uBgOff;
uniform vec2 uRes; uniform float uTime; uniform int uLook; uniform vec3 uWater;
uniform float uUvLine; uniform float uUv; uniform float uFlash; uniform vec3 uFlashColor; uniform float uPaper;
uniform float uFade;
varying vec2 vUv;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
vec4 S(vec2 o){ return texture2D(tScene, vUv + o / uRes); }
void main(){
  vec4 sc = S(vec2(0.0));
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
  vec2 px = vUv * uRes;
  vec3 col;
  if (uLook == 1) {
    // cryo-EM: projected density is dark on mid grey, defocus gives a bright fringe, shot noise everywhere
    float lum = dot(un, vec3(0.299, 0.587, 0.114));
    float dens = sc.a * (0.55 + 0.45 * (1.0 - lum));
    float g = 0.60 - dens * 0.36 + (aWide - sc.a) * -0.10 + max(0.0, aBlur - sc.a) * 0.18;
    g += (fbm(px * 0.01 + 3.0) - 0.5) * 0.06;
    g += (h2(px + fract(uTime * 7.31) * 113.0) - 0.5) * 0.20;
    col = vec3(g);
  } else if (uLook == 3) {
    // Real-time false light: deep water, broad focus, gentle scattering and warm bloom.
    vec2 uv = vUv; float aspect = uRes.x/uRes.y;
    float haze = fbm(uv*vec2(aspect,1.0)*3.0 + uBgOff);
    vec3 bg = mix(vec3(0.001,0.006,0.012),vec3(0.008,0.045,0.07),uv.y*0.65+haze*0.25);
    float shaft = pow(max(0.0,sin(uv.x*11.0+uv.y*3.5+0.7)),12.0);
    bg += vec3(0.08,0.16,0.19)*shaft*smoothstep(0.1,1.0,uv.y)*0.17;
    vec3 bloom = vec3(0.0);
    for(int i=0;i<12;i++){
      float angle=float(i)*0.5235988;
      vec2 d=vec2(cos(angle),sin(angle));
      vec3 a=S(d*5.0).rgb, b=S(d*13.0).rgb;
      bloom += max(a-vec3(1.0),vec3(0.0))*0.035 + max(b-vec3(1.0),vec3(0.0))*0.020;
    }
    col = bg*(1.0-sc.a)+sc.rgb+bloom;
    // Filmic shoulder followed by display transfer (the HDR scene stays linear).
    col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14),0.0,1.0);
    col = pow(col,vec3(1.0/2.2));
    col += (h2(px)-0.5)*0.008;
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
    float above = smoothstep(uUvLine - 0.25, uUvLine + 0.35, vUv.y);
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

/** The final pass. Render the scene into post.target (clear alpha 0), then post.render(). */
export function createPost(renderer, { hdr = false } = {}) {
  const target = new THREE.WebGLRenderTarget(2, 2, { samples: 0, type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType });
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: target.texture }, tBg: { value: null }, uUseBg: { value: 0 }, uBgOff: { value: new THREE.Vector2() },
      uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uLook: { value: 0 },
      uWater: { value: new THREE.Color('#bcd3ea') }, uUvLine: { value: 2 }, uUv: { value: 0 },
      uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color('#ffffff') }, uPaper: { value: 1 }, uFade: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: POST_FRAG,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    target,
    uniforms: mat.uniforms,
    LOOKS: { goodsell: 0, cryo: 1, fluor: 2, 'false-light': 3 },
    resize(w, h) { target.setSize(w, h); mat.uniforms.uRes.value.set(w, h); },
    setBackdrop(tex) { mat.uniforms.tBg.value = tex; mat.uniforms.uUseBg.value = tex ? 1 : 0; },
    /** Draw `sceneToDraw` with `camera` into the target, then the look to the screen. */
    render(sceneToDraw, camera) {
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      renderer.render(sceneToDraw, camera);
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(scene, cam);
    },
  };
}

// bacterium-shapes: an instanced 2D signed-distance specimen renderer for
// microscope scenes of thin, flat-lying things (bacteria, flagella, phages,
// clay, matrix strands, the edge of a giant cell). Each shape writes its
// optical path, scatter, height, fluorescence and absorbance into the field
// of bacterium-fluorescence.js, additively, with the thickness a real body
// of that cross-section would have. From the Micro Bacterium prototype.
//
// HOW TO PLUG IT IN
//   import { createShapes, SHAPE } from '../shared/techniques/bacterium-shapes.js';
//   const shapes = createShapes(4000);
//   each frame:
//     shapes.begin();
//     shapes.rod(x, y, angle, length, radius, { curve, z, dn, scat, fl: [r,g,b], ab: [r,g,b] });
//       (optional lab: [a, b]: two more fluorescence channels, in the alpha of
//       attachments 1 and 2, shown in bacterium-fluorescence's uCol3, uCol4)
//     shapes.strand(x, y, angle, length, radius, amp, wavelength, phase, { centred, taper, ... });
//     shapes.disc(x, y, radius, { wobble, seed, cap, ... });
//     shapes.chain(x, y, angle, length, dotRadius, count, {...});
//     shapes.edge(...), shapes.bell(...), shapes.slab(...)  (large bodies)
//     shapes.end();
//     shapes.setView(cx, cy, widthUm, heightUm, umPerPx, focusZ);
//     renderer.setRenderTarget(optics.field); renderer.clear(); renderer.render(shapes.scene, shapes.camera);
//
// UNITS AND HONESTY
// - µm everywhere. Thickness profiles are chords of the real cross-section:
//   a rod of radius r is 2√(r² − d²) thick at distance d from its axis.
// - Anything thinner than a pixel is widened to 0.6 px with its integrated
//   amount kept (scaled by (r/r')² for strands, (r/r')³ for blobs), so a
//   20 nm flagellum carries its true, tiny total into the point spread.
// - shapes.inView(x, y, reach): false when a shape that size can't reach the
//   current view (callers can skip building its material).
// - Defocus: each shape has a height z; the further from the focal plane
//   (beyond half the depth of field) the wider and fainter it is drawn,
//   again with the amount kept.
import * as THREE from '../vendor/three.module.min.js';

export const SHAPE = { ROD: 0, STRAND: 1, CSTRAND: 2, DISC: 3, EDGE: 4, BELL: 5, CHAIN: 6, SLAB: 7, TRUMPET: 8, AMOEBA: 9 };

const VS = /* glsl */ `
precision highp float;
in vec3 position;
in vec4 iA; // x, y, angle, type
in vec4 iB; // len, radius, p1, p2
in vec4 iC; // phase, z, dn, scatter
in vec4 iD; // fluorescence rgb, height scale
in vec4 iE; // absorbance rgb, membrane weight
in vec4 iF; // two extra fluorescence (label) channels, written to the alpha of attachments 1 and 2
uniform mat4 projectionMatrix;
uniform float uPx, uFocus, uDof, uDefocusK;
out vec2 vLocal;
flat out vec4 vA; flat out vec4 vB; flat out vec4 vC; flat out vec4 vD; flat out vec4 vE; flat out vec4 vF;
flat out float vBlur;
void main() {
  int type = int(iA.w + 0.5);
  float L = iB.x, r = iB.y, p1 = iB.z, p2 = iB.w;
  float dz = abs(iC.y - uFocus);
  float blur = max(dz - uDof * 0.5, 0.0) * uDefocusK;
  float m = blur + max(r, 0.6 * uPx) + 2.5 * uPx;
  vec2 lo, hi;
  if (type == 0) { float bend = abs(p1) * L * L / 8.0; lo = vec2(-L * 0.5 - m, -m - bend); hi = vec2(L * 0.5 + m, m + bend); }
  else if (type == 1) { lo = vec2(-m, -abs(p1) - m); hi = vec2(L + m, abs(p1) + m); }
  else if (type == 2) { lo = vec2(-L * 0.5 - m, -abs(p1) - m); hi = vec2(L * 0.5 + m, abs(p1) + m); }
  else if (type == 3) { float R = r * (1.0 + abs(p1)) + m; lo = vec2(-R); hi = vec2(R); }
  else if (type == 4) { lo = vec2(-L * 0.5, -r); hi = vec2(L * 0.5, abs(p1) + m + 2.0); }
  else if (type == 5) { lo = vec2(-L - m, -2.0 * L - m); hi = vec2(L + m, L * 0.35 + m); }
  else if (type == 6) { lo = vec2(-L * 0.5 - m, -m); hi = vec2(L * 0.5 + m, m); }
  else if (type == 8) { lo = vec2(-abs(p1) * 3.0 - m, -r - m); hi = vec2(L + 0.5 * r + m, r + m); }
  else if (type == 9) { lo = vec2(-1.25 * L - m, -2.4 * r - m); hi = vec2(1.25 * L + m, abs(p1) + 0.4 * r + m); }
  else { lo = vec2(-L * 0.5, -r); hi = vec2(L * 0.5, abs(p1) + m + 1.0); }
  vec2 q = mix(lo, hi, position.xy * 0.5 + 0.5);
  vLocal = q;
  float c = cos(iA.z), s = sin(iA.z);
  vec2 w = iA.xy + vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  vA = iA; vB = iB; vC = iC; vD = iD; vE = iE; vF = iF; vBlur = blur;
  gl_Position = projectionMatrix * vec4(w, 0.0, 1.0);
}`;

const FS = /* glsl */ `
precision highp float;
in vec2 vLocal;
flat in vec4 vA; flat in vec4 vB; flat in vec4 vC; flat in vec4 vD; flat in vec4 vE; flat in vec4 vF;
flat in float vBlur;
uniform float uPx, uTime;
uniform sampler2D tCil, tBio, tMag;
uniform float uHasCil, uHasBio, uHasMag;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }

// chord of a round cross-section of radius r at distance d, widened to rr
// (sub-pixel) and to rb (defocus) with the integrated amount kept.
float chord(float d, float r, float k) {
  float rr = max(r, 0.6 * uPx);
  float rb = rr + vBlur;
  float t = 2.0 * sqrt(max(rb * rb - d * d, 0.0));
  return t * pow(r / rb, k);
}

void main() {
  int type = int(vA.w + 0.5);
  vec2 p = vLocal;
  float L = vB.x, r = vB.y, p1 = vB.z, p2 = vB.w;
  float t = 0.0;      // thickness through the object, µm
  float rim = 0.0;    // 0..1, how much of the chord is near the surface (membrane stain)
  float tex = 1.0;
  if (type == 0) {
    // rod or vibrio: a capsule bent into a parabolic arc of curvature p1
    float y = p.y - p1 * p.x * p.x * 0.5;
    float x = clamp(p.x, -L * 0.5, L * 0.5);
    float d = length(vec2(p.x - x, y));
    t = chord(d, r, 2.0);
    rim = smoothstep(0.35 * r, r, d);
  } else if (type == 1 || type == 2) {
    // helical filament seen side on: a sine of amplitude p1 and wavelength p2
    float x0 = type == 1 ? 0.0 : -L * 0.5;
    float x = clamp(p.x, x0, x0 + L);
    float u = x - x0;
    float env = type == 1 ? smoothstep(0.0, 0.6, u) : 1.0;
    float k = 6.2831853 / max(p2, 0.01);
    float f = p1 * env * sin(k * u - vC.x);
    float fp = p1 * env * k * cos(k * u - vC.x);
    float dy = (p.y - f) / sqrt(1.0 + fp * fp);
    float d = length(vec2(p.x - x, dy));
    t = chord(d, r, 2.0);
    rim = smoothstep(0.35 * r, r, d);
  } else if (type == 3) {
    // a blob: sphere or flattened grain with a wobbly outline; p1 wobble, p2 seed, L cap on thickness
    // (a round blob, p1 = 0, skips the outline noise: R = r either way)
    float R = r;
    if (p1 != 0.0) R = r * (1.0 + p1 * (vnoise(vec2(atan(p.y, p.x) * 2.2 + p2, p2)) - 0.5) * 2.0);
    float d = length(p);
    float rr = max(R, 0.6 * uPx), rb = rr + vBlur;
    t = 2.0 * sqrt(max(rb * rb - d * d, 0.0)) * pow(R / rb, 3.0);
    if (L > 0.0) t = min(t, L * pow(R / rb, 2.0));
    rim = smoothstep(0.5 * R, R, d);
    if (p1 > 0.05) tex = 0.75 + 0.5 * fbm(p * 1.3 + p2);
  } else if (type == 4) {
    // the leading edge of a giant cell (an amoeba): inside below a wavy line; thin hyaline margin, thick behind
    float edge = p1 * (0.6 * sin(0.07 * p.x + p2 + 0.2 * uTime) + 0.4 * sin(0.17 * p.x + 2.0 * p2 - 0.13 * uTime));
    float d = edge - p.y; // depth inside
    t = clamp(d * 0.35, 0.0, 1.5) + clamp((d - 6.0) * 0.6, 0.0, 9.0);
    t *= smoothstep(-vBlur - uPx, vBlur + uPx, d);
    t *= smoothstep(L * 0.5, L * 0.42, abs(p.x)) * smoothstep(-r, -r * 0.8, p.y);
    rim = 1.0 - smoothstep(0.0, 2.0, d);
    tex = 0.85 + 0.3 * fbm(p * 0.6 + p2);
  } else if (type == 5) {
    // a peritrich's bell (Vorticella-like), oral opening at the origin facing +y, body centre (0, -L)
    float R = L;
    vec2 c = vec2(0.0, -R * 0.95);
    float db = length((p - c) * vec2(1.0, 0.92)) - R;
    // the oral funnel (vestibulum) carved from the top: half-width p1 at the rim, narrowing inward
    float w = p1 * (0.35 + 0.65 * clamp(1.0 + p.y / (0.7 * R), 0.0, 1.0));
    float dF = max(abs(p.x + 0.15 * p.y) - w, -0.7 * R - p.y);
    float d = max(db, -dF);
    t = clamp(-d * 0.9, 0.0, r);
    t *= smoothstep(-vBlur - uPx, 0.0, -d);
    rim = 1.0 - smoothstep(0.0, 1.5, -d);
    vec2 tuv = (p - c) / (2.2 * R) + 0.5;
    tex = uHasCil > 0.5 ? 0.5 + texture(tCil, tuv).r : 0.8 + 0.45 * fbm(p * 0.45 + p2);
  } else if (type == 6) {
    // a chain of small dots along x (magnetosomes): p1 = count
    float n = max(p1, 1.0);
    float sp = L / n;
    float xi = clamp(floor((p.x + L * 0.5) / sp), 0.0, n - 1.0);
    float cx = -L * 0.5 + (xi + 0.5) * sp;
    float d = length(vec2(p.x - cx, p.y));
    t = chord(d, r, 3.0);
    if (uHasMag > 0.5) tex = 0.4 + 1.2 * texture(tMag, vec2((p.x / L) + 0.5, p.y / (8.0 * r) + 0.5)).r;
  } else if (type == 8) {
    // a trumpet ciliate (Stentor): foot at the origin, axis along +x, length L; the body flares
    // from the foot's radius p1 to the oral disc of radius r at x = L, seen obliquely as an
    // ellipse (0.42 r along the axis); longitudinal pigment stripes on the body; spiral grooves
    // on the disc converging on the oral pouch; the holdfast a little flared disc at the foot.
    float u = clamp(p.x / L, 0.0, 1.0);
    float fr = abs(p1);
    float w = fr + (0.56 * r - fr) * pow(u, 2.3);
    float dB = abs(p.y) - w;
    float tb = p.x < 0.0 ? 0.0 : clamp(2.0 * sqrt(max(w * w - p.y * p.y, 0.0)) * 0.05, 0.0, 3.2);
    // the body runs in under the disc and fades out behind it (no seam where they meet)
    tb *= smoothstep(-vBlur - uPx, 0.0, -dB) * (1.0 - smoothstep(L - 0.32 * r, L - 0.05 * r, p.x));
    // the holdfast: a flared little disc round the foot
    vec2 hf = vec2(p.x + fr * 0.6, p.y) / vec2(fr * 1.1, fr * 2.4);
    float th = clamp((1.0 - length(hf)) * 2.5, 0.0, 1.6);
    // the oral disc
    vec2 e = vec2((p.x - L) / (0.42 * r), p.y / r);
    float de = length(e);
    vec2 mo = vec2(0.08, -0.12); // the oral pouch, a little off centre
    vec2 q = e - mo;
    float rho = length(q), th2 = atan(q.y, q.x);
    float groove = 0.82 + 0.18 * sin(18.0 * th2 + 9.0 * log(rho + 0.05) - vC.x);
    float td = clamp((1.0 - de) * 30.0, 0.0, 1.0) * mix(1.0, 3.2, smoothstep(0.05, 0.9, rho)) * groove;
    td *= smoothstep(0.03, 0.16, rho); // the pouch opens into the body: a dark well
    float rimD = abs(de - 1.0) * r;
    td += 3.0 * (1.0 - smoothstep(0.0, 2.5 + vBlur, rimD)); // the thickened rim (the membranelle band)
    // fine longitudinal pigment stripes (stentorin), following the flare
    float stripes = 0.94 + 0.12 * smoothstep(0.7, 0.98, abs(sin(3.14159 * 14.0 * p.y / max(w, 1.0))));
    t = max(max(tb * stripes, th), td) + 0.35 * min(tb, td);
    rim = max(1.0 - smoothstep(0.0, 2.0, -dB), 1.0 - smoothstep(0.0, 2.5, rimD));
    tex = 0.85 + 0.3 * fbm(p * 0.35 + p2);
  } else if (type == 9) {
    // a whole amoeba (Amoeba proteus-like): a closed body, half-axes L across and r deep, its front edge
    // through the origin (+y out of it) and its middle at (0, -r); lobed all round (pseudopods flowing slowly,
    // seed p2), the front rippling with amplitude p1; a thin clear margin, granular and thick behind it.
    // (bacterium world.js amoebaDepth is the same outline.)
    float a = L, b = r;
    vec2 q = vec2(p.x, p.y + b);
    float rho = length(q), th = atan(q.y, q.x), cth = cos(th), sth = sin(th);
    float Rb = inversesqrt((cth / a) * (cth / a) + (sth / b) * (sth / b));
    float fk = clamp((sth - 0.35) / 0.4, 0.0, 1.0), front = fk * fk * (3.0 - 2.0 * fk);
    float lobe = (1.0 - front) * 0.14 * b * (0.5 * sin(3.0 * th + 0.15 * uTime + p2) + 0.3 * sin(5.0 * th - 0.11 * uTime + 2.0 * p2) + 0.2 * sin(8.0 * th + 0.07 * uTime + 3.0 * p2));
    float wave = front * p1 * (0.6 * sin(0.07 * p.x + p2 + 0.2 * uTime) + 0.4 * sin(0.17 * p.x + 2.0 * p2 - 0.13 * uTime));
    float d = Rb + lobe + wave - rho;
    t = clamp(d * 0.35, 0.0, 1.5) + clamp((d - 6.0) * 0.6, 0.0, 9.0);
    t *= smoothstep(-vBlur - uPx, vBlur + uPx, d);
    rim = 1.0 - smoothstep(0.0, 2.0, d);
    tex = 0.85 + 0.3 * fbm(p * 0.6 + p2);
  } else {
    // slab: the biofilm and sediment surface, top edge wavy at y = 0, thickness r
    float edge = p1 * (0.6 * sin(0.04 * p.x + p2) + 0.4 * sin(0.11 * p.x + 2.0 * p2));
    float d = edge - p.y;
    t = clamp(d * 0.25, 0.0, 1.0) * smoothstep(-vBlur - uPx, vBlur + uPx, d);
    t *= smoothstep(L * 0.5, L * 0.47, abs(p.x));
    vec2 w = vA.xy + p;
    tex = uHasBio > 0.5 ? 0.4 + 1.2 * texture(tBio, w / 60.0).r : 0.55 + 0.9 * fbm(w * 0.5 + p2);
    rim = 0.3;
  }
  if (t <= 0.0) discard;
  float h = t * vD.a;
  float opd = vC.z * t * tex;
  float memb = vE.a > 0.0 ? mix(1.0, rim * 2.0, vE.a) : 1.0;
  o0 = vec4(opd, vC.w * t, h, smoothstep(0.0, 0.08, t));
  o1 = vec4(vD.rgb * t * vec3(memb, 1.0, 1.0) * tex, vF.x * t * tex);
  o2 = vec4(vE.rgb * t * tex, vF.y * t * tex);
}`;

export function createShapes(max = 4000) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  const names = ['iA', 'iB', 'iC', 'iD', 'iE', 'iF'];
  const arr = {};
  for (const n of names) {
    arr[n] = new Float32Array(max * 4);
    const a = new THREE.InstancedBufferAttribute(arr[n], 4);
    a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute(n, a);
  }
  geo.instanceCount = 0;
  const blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  blank.needsUpdate = true;
  const uniforms = {
    uPx: { value: 0.1 }, uFocus: { value: 0 }, uDof: { value: 0.4 }, uDefocusK: { value: 0.6 }, uTime: { value: 0 },
    tCil: { value: blank }, tBio: { value: blank }, tMag: { value: blank }, uHasCil: { value: 0 }, uHasBio: { value: 0 }, uHasMag: { value: 0 },
  };
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, uniforms,
    depthTest: false, depthWrite: false, transparent: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  let n = 0;
  let view = { x0: -1e9, x1: 1e9, y0: -1e9, y1: 1e9 };

  const DEF = { z: 0, dn: 0.045, scat: 0, fl: [0, 0, 0], ab: [0, 0, 0], hk: 1, memb: 0, phase: 0, lab: [0, 0] };
  function push(type, x, y, ang, L, r, p1, p2, o, reach) {
    if (n >= max) return;
    if (x + reach < view.x0 || x - reach > view.x1 || y + reach < view.y0 || y - reach > view.y1) return;
    const k = n * 4;
    const z = o.z ?? DEF.z, fl = o.fl || DEF.fl, ab = o.ab || DEF.ab, lab = o.lab || DEF.lab;
    arr.iA[k] = x; arr.iA[k + 1] = y; arr.iA[k + 2] = ang; arr.iA[k + 3] = type;
    arr.iB[k] = L; arr.iB[k + 1] = r; arr.iB[k + 2] = p1; arr.iB[k + 3] = p2;
    arr.iC[k] = o.phase ?? 0; arr.iC[k + 1] = z; arr.iC[k + 2] = o.dn ?? DEF.dn; arr.iC[k + 3] = o.scat ?? DEF.scat;
    arr.iD[k] = fl[0]; arr.iD[k + 1] = fl[1]; arr.iD[k + 2] = fl[2]; arr.iD[k + 3] = o.hk ?? 1;
    arr.iE[k] = ab[0]; arr.iE[k + 1] = ab[1]; arr.iE[k + 2] = ab[2]; arr.iE[k + 3] = o.memb ?? 0;
    arr.iF[k] = lab[0]; arr.iF[k + 1] = lab[1];
    n++;
  }

  return {
    scene, camera, uniforms, SHAPE,
    get count() { return n; },
    /** The culling box for the next shapes (µm): set it to cover every view before drawing a split frame. */
    cull(x0, y0, x1, y1) { view = { x0, x1, y0, y1 }; },
    inView(x, y, reach) { return !(x + reach < view.x0 || x - reach > view.x1 || y + reach < view.y0 || y - reach > view.y1); },
    /** The culling box now (µm): { x0, x1, y0, y1 }. */
    get box() { return view; },
    begin() { n = 0; },
    end() {
      geo.instanceCount = n;
      for (const nm of names) { const a = geo.attributes[nm]; a.clearUpdateRanges(); a.addUpdateRange(0, n * 4); a.needsUpdate = true; }
    },
    /** Camera: centre and size of the view in µm; umPerPx; the focal plane's z (µm). */
    setView(cx, cy, w, h, umPerPx, focus = 0, time = 0) {
      camera.left = cx - w / 2; camera.right = cx + w / 2; camera.top = cy + h / 2; camera.bottom = cy - h / 2;
      camera.updateProjectionMatrix();
      uniforms.uPx.value = umPerPx; uniforms.uFocus.value = focus; uniforms.uTime.value = time;
      view = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
    },
    /** Rod (curve = 0) or vibrio (curve = curvature, 1/µm), centred, along `ang`. */
    rod(x, y, ang, L, r, o = {}) { push(0, x, y, ang, L, r, o.curve || 0, 0, o, L * 0.5 + r + 3); },
    /** Helical filament from (x, y) along `ang` (a flagellum leaving a pole). o.centred: centred instead. */
    strand(x, y, ang, L, r, amp, wl, o = {}) { push(o.centred ? 2 : 1, x, y, ang, L, r, amp, wl, o, L + amp + 3); },
    disc(x, y, r, o = {}) { push(3, x, y, o.ang || 0, o.cap || 0, r, o.wobble || 0, o.seed || 0, o, r * 1.5 + 3); },
    chain(x, y, ang, L, r, count, o = {}) { push(6, x, y, ang, L, r, count, 0, o, L + 3); },
    /** Giant-cell edge: width L, depth inside `depth`, wobble amplitude amp. Inside is local −y. */
    edge(x, y, ang, L, depth, amp, seed, o = {}) { push(4, x, y, ang, L, depth, amp, seed, o, L + depth); },
    /** Peritrich bell: radius R, thickness cap, oral funnel half-width w. */
    bell(x, y, ang, R, cap, w, seed, o = {}) { push(5, x, y, ang, R, cap, w, seed, o, 3 * R); },
    /** Trumpet ciliate (Stentor): foot at (x, y), axis `ang`, length L to the oral disc of radius R; foot radius footR; o.phase turns the disc's spiral grooves. */
    trumpet(x, y, ang, L, R, footR, seed, o = {}) { push(8, x, y, ang, L, R, footR, seed, o, L + R * 1.5); },
    /** A whole amoeba: half-axes a (across) and b (deep), front edge through (x, y) facing local +y (`ang` along the edge), front ripple amp, seed. */
    amoeba(x, y, ang, a, b, amp, seed, o = {}) { push(9, x, y, ang, a, b, amp, seed, o, 1.25 * a + 2.4 * b); },
    /** Flat surface layer: width L, depth below the wavy top edge, edge wobble amp. */
    slab(x, y, L, depth, amp, seed, o = {}) { push(7, x, y, 0, L, depth, amp, seed, o, L + depth); },
    setTextures({ cil, bio, mag }) {
      if (cil) { uniforms.tCil.value = cil; uniforms.uHasCil.value = 1; }
      if (bio) { uniforms.tBio.value = bio; uniforms.uHasBio.value = 1; }
      if (mag) { uniforms.tMag.value = mag; uniforms.uHasMag.value = 1; }
    },
  };
}

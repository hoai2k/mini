// The data overlay (Y): what the cell senses, drawn as data, NOT optics.
// Oxygen as a colour wash with the target band outlined, food as contour
// lines, the Earth's field as streaming field lines, the grazers' feeding
// currents as streaks, and the magnetosome chain picked out. A microscope
// shows none of this; the overlay says so on screen.
import * as THREE from '../shared/vendor/three.module.min.js';

const VS = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FS = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform vec2 uCenter, uSize, uRes;
uniform float uTime, uTop, uScale, uLo, uHi;
uniform vec4 uPatch[12];
uniform vec4 uSink[2];
uniform vec3 uField; // direction xy, strength (µT)
uniform sampler2D tFl;
layout(location = 0) out vec4 o;
float oxy(float y) { return max(0.0, 100.0 * exp((y - uTop) / uScale) - 1.0); }
void main() {
  vec2 w = uCenter + (vUv - 0.5) * uSize;
  float px = uSize.y / uRes.y;
  vec4 c = vec4(0.0);
  // oxygen: blue (anoxic) → green (the band) → red (too much); log scale
  float O = oxy(w.y);
  float lo = log(uLo + 0.1), hi = log(uHi + 0.1), lO = log(O + 0.1);
  vec3 col = lO < lo ? mix(vec3(0.1, 0.25, 0.9), vec3(0.2, 0.8, 0.4), smoothstep(lo - 2.0, lo, lO))
           : lO > hi ? mix(vec3(0.2, 0.8, 0.4), vec3(0.95, 0.25, 0.15), smoothstep(hi, hi + 1.5, lO)) : vec3(0.2, 0.85, 0.4);
  c = vec4(col, 0.16);
  // band edges: dashed lines
  float yLo = uTop + uScale * log((uLo + 1.0) / 100.0), yHi = uTop + uScale * log((uHi + 1.0) / 100.0);
  float dash = step(0.5, fract(w.x / 4.0));
  float edge = max(1.0 - smoothstep(0.0, 1.6 * px, abs(w.y - yLo)), 1.0 - smoothstep(0.0, 1.6 * px, abs(w.y - yHi)));
  c = mix(c, vec4(0.3, 1.0, 0.5, 0.9), edge * dash);
  // oxygen isolines at 0.1, 1, 10, 100 %
  float ld = log(O + 1e-3) / log(10.0);
  float iso = abs(fract(ld + 0.5) - 0.5) / max(fwidth(ld), 1e-4);
  c = mix(c, vec4(0.85, 0.9, 1.0, 0.45), (1.0 - smoothstep(0.5, 1.5, iso)) * step(0.05, O));
  // food: contour lines of the dissolved-nutrient field
  float f = 0.0;
  for (int i = 0; i < 12; i++) { vec4 p = uPatch[i]; if (p.z <= 0.0) continue; vec2 d = w - p.xy; f += p.w * exp(-dot(d, d) / (p.z * p.z)); }
  float fl = f * 8.0;
  float fmask = smoothstep(0.08, 0.2, f);
  float line = 1.0 - smoothstep(0.0, 1.2, (0.5 - abs(fract(fl) - 0.5)) / max(fwidth(fl), 1e-4));
  c = mix(c, vec4(1.0, 0.68, 0.18, 0.85), line * fmask);
  c = mix(c, vec4(1.0, 0.6, 0.1, 0.18), fmask * 0.6);
  // the Earth's field: lines along B, chevrons moving north
  vec2 B = normalize(uField.xy);
  vec2 Bn = vec2(-B.y, B.x);
  float across = dot(w, Bn), along = dot(w, B);
  float sp = 9.0;
  float dl = abs(fract(across / sp + 0.5) - 0.5) * sp; // distance to the nearest field line, µm
  float lineB = 1.0 - smoothstep(0.5 * px, 1.5 * px, dl);
  float chev = step(0.8, fract((along + dl * 0.9) / 7.0 - uTime * 0.6));
  float near = 1.0 - smoothstep(0.0, 1.4, dl);
  float showB = clamp(uField.z / 20.0, 0.2, 1.0);
  c = mix(c, vec4(0.75, 0.8, 1.0, 0.35 * showB), lineB);
  c = mix(c, vec4(0.85, 0.9, 1.0, 0.7 * showB), chev * near);
  // feeding currents: streaks falling into each oral funnel
  for (int i = 0; i < 2; i++) {
    vec4 s = uSink[i];
    if (s.w <= 0.0) continue;
    vec2 d = w - s.xy;
    float r = length(d);
    if (r > 70.0) continue;
    float a = atan(d.y, d.x);
    float streak = smoothstep(0.75, 1.0, sin(a * 28.0)) * smoothstep(0.6, 0.95, fract(r / 8.0 + uTime * 1.2 * 16.0 / max(r, 4.0)));
    float strength = clamp(60.0 * pow(16.0 / max(r, 4.0), 2.0) / 120.0, 0.0, 1.0) * s.w;
    c = mix(c, vec4(0.6, 0.95, 1.0, 0.8), streak * strength);
    c = mix(c, vec4(1.0, 0.2, 0.2, 0.5), 1.0 - smoothstep(2.8, 3.3, r));
  }
  // the magnetosome chain, from the fluorescence attachment's third channel
  float m = texture(tFl, vUv).b;
  c = mix(c, vec4(1.0, 1.0, 1.0, 1.0), clamp(m * 0.25, 0.0, 1.0));
  o = c;
}`;

export function createOverlay() {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const uniforms = {
    uCenter: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) }, uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 }, uTop: { value: 135 }, uScale: { value: 38 }, uLo: { value: 0.5 }, uHi: { value: 5 },
    uPatch: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
    uSink: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    uField: { value: new THREE.Vector3(0, -1, 20) },
    tFl: { value: null },
  };
  const mat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, uniforms, depthTest: false, depthWrite: false, transparent: true, blending: THREE.NormalBlending });
  const mesh = new THREE.Mesh(tri, mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const cam = new THREE.Camera();
  return {
    uniforms,
    render(renderer, { center, size, res, time, band, world, flTex }) {
      const u = uniforms;
      u.uCenter.value.set(center[0], center[1]); u.uSize.value.set(size[0], size[1]); u.uRes.value.set(res[0], res[1]);
      u.uTime.value = time; u.uLo.value = band[0]; u.uHi.value = Math.min(band[1], 99);
      world.patches.slice(0, 12).forEach((p, i) => u.uPatch.value[i].set(p.x, p.y, p.r, p.amt));
      for (let i = world.patches.length; i < 12; i++) u.uPatch.value[i].set(0, 0, 0, 0);
      world.grazers.forEach((g, i) => { if (i < 2) u.uSink.value[i].set(g.pose.mouth.x, g.pose.mouth.y, 0, world.opts.grazers && g.contract <= 0 ? g.ext : 0); });
      const B = world.field;
      u.uField.value.set(B.x, B.y, B.uT);
      u.tFl.value = flTex;
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
    },
  };
}

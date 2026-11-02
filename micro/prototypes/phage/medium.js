// The water as a textured liquid of molecules (the owner, 2 Nov 2026: "make the world feel a bit more like
// you're moving through a textured liquid of molecules (like kind of transparent noise texture sort of thing
// on the water)"). A few transparent slices across the view at set depths in front of the camera, each
// sampling a slowly drifting 3D noise at the world point it passes through: tied to the world, so the
// near slices slide past faster than the far ones as you move (parallax) and the wisps read as a volume.
// The scene's depth test hides them behind nearer cells and molecules. One draw (all slices in one mesh).
//
// A current (currents.js) shows in it: round the current's centre and well ahead of its edge the wisps
// stretch into streaks along its direction and stream along with its water, so it is seen coming.
//
// Light only: each slice adds a faint pale colour and a very little alpha (a veil over the backdrop), as
// the UV shafts do (the post pass composites col = bg * (1 - a) + rgb).
import * as THREE from '../shared/vendor/three.module.min.js';

export const MEDIUM_SLICES = 4;
// each slice's depth, as a fraction of the camera's distance to the phage (the phage sits at 1); the far
// slices first in the index list, so the nearer ones blend over them
const DEPTHS = [0.55, 1.1, 1.6, 2.3];

export function createMedium() {
  const n = MEDIUM_SLICES;
  const pos = new Float32Array(n * 4 * 3), layer = new Float32Array(n * 4), idx = [];
  for (let i = 0; i < n; i++) {
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, y], k) => { pos.set([x, y, 0], (i * 4 + k) * 3); layer[i * 4 + k] = DEPTHS[i]; });
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  }
  const order = [...Array(n).keys()].reverse();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aDepth', new THREE.BufferAttribute(layer, 1));
  geo.setIndex(order.flatMap((i) => idx.slice(i * 6, i * 6 + 6)));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uBase: { value: 180 }, uOn: { value: 1 }, uDrift: { value: new THREE.Vector3() },
      uCur: { value: new THREE.Vector4(0, -1e5, 0, 140) }, uCurDir: { value: new THREE.Vector4(1, 0, 0, 0) }, uCurOff: { value: 0 },
      uTint: { value: new THREE.Color('#9fd2d8') }, uStreak: { value: new THREE.Color('#dff6ff') }, uGain: { value: 1 },
    },
    vertexShader: /* glsl */`
      attribute float aDepth; uniform float uBase;
      varying vec3 vW; varying float vNear;
      void main(){
        float d = uBase * aDepth;
        // the corner's ray through the view (whatever the projection, split views' offsets included), out to depth d
        vec4 v = inverse(projectionMatrix) * vec4(position.xy, 0.0, 1.0);
        vec3 r = v.xyz / v.w; r *= d / -r.z;
        vW = (inverse(viewMatrix) * vec4(r, 1.0)).xyz;
        vNear = aDepth;
        gl_Position = projectionMatrix * vec4(r, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uOn; uniform vec3 uDrift; uniform vec4 uCur; uniform vec4 uCurDir; uniform float uCurOff;
      uniform vec3 uTint; uniform vec3 uStreak; uniform float uGain;
      varying vec3 vW; varying float vNear;
      float h(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){
        vec3 p = vW - uDrift;
        // the liquid: soft clouds of molecules, a finer grain inside them, both drifting slowly
        // (two noise lookups a pixel: four full-view slices are the cost, so the grain is the second octave's own)
        float n2 = vn(p * 0.085 - vec3(uTime * 0.05, 0.0, uTime * 0.03));
        float n = vn(p * 0.03 + vec3(0.0, uTime * 0.04, 0.0)) * 0.62 + n2 * 0.38;
        float wisp = smoothstep(0.42, 0.82, n);
        float grain = smoothstep(0.7, 0.95, n2);
        // a current: streaks along its direction, streaming with its water, from well ahead of its edge
        float dc = length(vW - uCur.xyz);
        float k = uCurDir.w * (smoothstep(uCur.w * 2.2, uCur.w, dc) * 0.6 + smoothstep(uCur.w, uCur.w * 0.4, dc) * 0.4);
        float streak = 0.0;
        if (k > 0.002) {
          vec3 dir = uCurDir.xyz, q = vW - dir * uCurOff;
          float along = dot(q, dir); vec3 perp = q - dir * along;
          float s = vn(perp * 0.12 + dir * along * 0.011) * 0.7 + vn(perp * 0.3 + dir * along * 0.03 + 7.0) * 0.3;
          streak = smoothstep(0.5, 0.86, s) * k;
        }
        float nearFade = smoothstep(0.3, 0.9, vNear); // the slice before the phage stays faint: it never hides you
        float a = (wisp * 0.1 + grain * wisp * 0.05 + streak * 0.32) * nearFade * uOn * uGain;
        vec3 col = mix(uTint, uStreak, clamp(streak * 3.0, 0.0, 1.0));
        gl_FragColor = vec4(col * a, a * 0.3);
      }`,
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  const u = mat.uniforms;
  return {
    mesh, uniforms: u,
    /** Quality level 2 draws all four slices, 1 the nearer three, 0 the middle two. */
    setLevel(level) { geo.setDrawRange(level === 0 ? 6 : level === 1 ? 6 : 0, (level === 0 ? 2 : level === 1 ? 3 : n) * 6); },
    /**
     * Each frame: the clock, the camera's distance to the phage, the ambient drift, and the current
     * ({ center, dir, strength, radius } or null) with how far its water has moved.
     */
    update(t, base, drift, cur, curOff) {
      u.uTime.value = t; u.uBase.value = base; u.uDrift.value.copy(drift);
      if (cur) { u.uCur.value.set(cur.center.x, cur.center.y, cur.center.z, cur.radius); u.uCurDir.value.set(cur.dir.x, cur.dir.y, cur.dir.z, cur.strength); u.uCurOff.value = curOff; }
      else u.uCurDir.value.w = 0;
    },
  };
}

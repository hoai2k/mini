// The way on, made tempting: a golden sparkle over a portal (the place a world
// zooms on to the next). Drifting glints that twinkle and rise, a soft glow
// pool under them, a slow pulse. No text. Its gold echoes the phage world's
// false-light gold (~#f0b44a). Shared so every world's portal can carry the
// same effect.
//
//   import { createPortalGlow } from '../shared/portal.js';
//   const glow = createPortalGlow({ THREE, scene, size: 10 });
//   glow.setPosition(x, y, z);          // the centre, on the ground or film
//   glow.setOpen(false);                // guarded: dimmer, a little restless
//   ... each frame: glow.update(dt, time, camera);
//
// API
//   createPortalGlow({ THREE, scene = null, size = 10, color = '#f0b44a',
//     count = 40, intensity = 1, height = size * 0.9, pixelHeight }) -> glow
//     size        radius of the glow pool and of the glints' spread (world units)
//     intensity   overall brightness (worlds with HDR tone mapping may want > 1)
//     pixelHeight () -> drawing-buffer height in px (sizes the glints);
//                 default innerHeight x devicePixelRatio
//   glow.group             THREE.Group (add it yourself if no scene is given)
//   glow.setPosition(x, y, z)
//   glow.setOpen(open)     eases between guarded (false) and open (true)
//   glow.update(dt, time, camera)
//   glow.open              the eased openness, 0..1
//   glow.dispose()
//
// Cost: two draws (the glow pool, one Points cloud), no textures. Both blend
// additively into colour only (destination alpha is kept), so pipelines that
// keep depth or coverage in alpha are untouched.

export function createPortalGlow({ THREE, scene = null, size = 10, color = '#f0b44a', count = 40, intensity = 1, height = null, pixelHeight = null } = {}) {
  const group = new THREE.Group();
  group.name = 'portal-glow';
  const gold = new THREE.Color(color);
  const H = height ?? size * 0.9;
  const pxH = pixelHeight || (() => (typeof innerHeight === 'number' ? innerHeight * Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1) : 720));
  const blend = {
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  };
  const uniforms = {
    uTime: { value: 0 }, uOpen: { value: 0 }, uColor: { value: new THREE.Vector3(gold.r, gold.g, gold.b) },
    uSize: { value: size }, uH: { value: H }, uI: { value: intensity }, uViewH: { value: 720 },
  };

  // the glow pool: a disc lying flat, brightest in a soft ring, breathing slowly
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms, ...blend,
    vertexShader: /* glsl */ `uniform float uSize; varying vec2 vP;
      void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position * vec3(uSize * 1.35, 1.0, uSize * 1.35), 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uTime, uOpen, uI; uniform vec3 uColor; varying vec2 vP;
      void main() {
        float r = length(vP);
        float breathe = 0.75 + 0.25 * sin(uTime * mix(1.1, 1.6, uOpen));
        float ring = exp(-pow((r - 0.62 - 0.03 * sin(uTime * 0.9)) / 0.16, 2.0));
        float core = exp(-r * r * 4.0) * 0.45;
        float a = (ring + core) * smoothstep(1.0, 0.85, r) * breathe * mix(0.07, 0.2, uOpen) * uI;
        gl_FragColor = vec4(uColor * 1.15, a);
      }`,
  }));
  pool.position.y = 0.03;
  pool.renderOrder = 3;
  pool.frustumCulled = false;
  group.add(pool);

  // the glints: each one drifts up in a slow spiral from the disc, twinkles and fades
  const seeds = new Float32Array(count * 4);
  let s = 9183;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) { seeds[i * 4] = rnd(); seeds[i * 4 + 1] = Math.sqrt(rnd()); seeds[i * 4 + 2] = rnd(); seeds[i * 4 + 3] = 0.6 + rnd() * 0.8; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms, ...blend,
    vertexShader: /* glsl */ `uniform float uTime, uOpen, uSize, uH, uViewH; attribute vec4 seed; varying float vA; varying float vTw;
      void main() {
        float speed = mix(0.07, 0.11, uOpen) * seed.w;
        float life = fract(seed.x + uTime * speed);
        float ang = seed.z * 6.2832 + life * mix(1.4, 2.6, 1.0 - uOpen) + 0.3 * sin(uTime * 3.0 * (1.0 - uOpen) + seed.z * 40.0);
        float rad = uSize * (0.15 + 0.8 * seed.y) * (1.0 - 0.35 * life);
        vec3 p = vec3(cos(ang) * rad, 0.15 + life * uH * mix(0.55, 1.0, uOpen), sin(ang) * rad);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.65, 1.0, life));
        vTw = 0.5 + 0.5 * sin(uTime * (5.0 + 6.0 * seed.w) + seed.x * 60.0);
        gl_Position = projectionMatrix * mv;
        float worldSize = uSize * 0.07 * (0.7 + 0.6 * seed.w) * (0.6 + 0.6 * vTw);
        gl_PointSize = clamp(worldSize * projectionMatrix[1][1] * uViewH * 0.5 / max(-mv.z, 1e-3), 1.5, 64.0);
      }`,
    fragmentShader: /* glsl */ `uniform float uOpen, uI; uniform vec3 uColor; varying float vA; varying float vTw;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r = length(q);
        // a soft round body and a four-point star: a glint, not a dot
        float star = exp(-r * r * 9.0) + 0.55 * exp(-abs(q.x) * 18.0) * exp(-abs(q.y) * 2.6) + 0.55 * exp(-abs(q.y) * 18.0) * exp(-abs(q.x) * 2.6);
        float a = star * smoothstep(1.0, 0.6, r) * vA * (0.35 + 0.65 * vTw) * mix(0.45, 1.0, uOpen) * uI;
        gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.95, 0.8), 0.35 * vTw) * 5.0, a);
      }`,
  }));
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  group.add(pts);

  if (scene) scene.add(group);
  let want = 0;
  const api = {
    group,
    get open() { return uniforms.uOpen.value; },
    setPosition(x, y, z) { group.position.set(x, y, z); },
    setOpen(o) { want = o ? 1 : 0; },
    update(dt, time, camera) {
      uniforms.uTime.value = time;
      uniforms.uOpen.value += (want - uniforms.uOpen.value) * Math.min(1, (dt || 0) * 1.5);
      uniforms.uViewH.value = pxH();
      void camera;
    },
    dispose() { group.removeFromParent(); geo.dispose(); pts.material.dispose(); pool.geometry.dispose(); pool.material.dispose(); },
  };
  return api;
}

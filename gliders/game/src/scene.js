// Rendering a level: one instanced mesh of blocks with a shader that bevels
// their edges, darkens them toward the depths and lights them up near a
// player; a gradient sky with a sun; a drifting sea of clouds below; fog that
// melts the distance into the sky.

import * as THREE from '../vendor/three.module.min.js';

export const MAX_PLAYERS = 4;

const col = (hex) => new THREE.Color(hex);

function blockMaterial(level, uniforms) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0, toneMapped: false });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vBoxLocal;
        varying vec3 vBoxScale;
        varying vec3 vWorldPos;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vBoxLocal = position;
        vBoxScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vBoxLocal;
        varying vec3 vBoxScale;
        varying vec3 vWorldPos;
        uniform vec2 uHeight;
        uniform float uGlow;
        uniform vec4 uPlayers[${MAX_PLAYERS}];
        uniform vec3 uPlayerColors[${MAX_PLAYERS}];`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 e = (0.5 - abs(vBoxLocal)) * vBoxScale;
          float mn = min(e.x, min(e.y, e.z));
          float mx = max(e.x, max(e.y, e.z));
          float mid = e.x + e.y + e.z - mn - mx;
          float bevel = 1.0 - smoothstep(0.0, 0.55, mid);
          float crease = 1.0 - smoothstep(0.0, 0.07, mid);
          diffuseColor.rgb *= mix(1.0, 1.18, bevel) * mix(1.0, 0.82, crease);
          float h = smoothstep(uHeight.x, uHeight.y, vWorldPos.y);
          diffuseColor.rgb *= mix(0.68, 1.04, h);
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uGlow;
        for (int i = 0; i < ${MAX_PLAYERS}; i++) {
          if (uPlayers[i].w > 0.0) {
            float d = distance(vWorldPos, uPlayers[i].xyz);
            float g = 1.0 - smoothstep(0.0, 10.0, d);
            totalEmissiveRadiance += uPlayerColors[i] * g * g * 0.55 * uPlayers[i].w;
          }
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'gliders-blocks';
  return mat;
}

const skyVert = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }`;
const skyFrag = `
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uFog;
  uniform vec3 uSunDir;
  uniform vec3 uSun;
  void main() {
    float y = vDir.y;
    vec3 c = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.85, y), 0.75));
    c = mix(c, uFog, smoothstep(0.12, -0.02, y));
    float s = max(dot(vDir, uSunDir), 0.0);
    c += uSun * (pow(s, 600.0) * 1.4 + pow(s, 24.0) * 0.22 + pow(s, 4.0) * 0.07);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

const cloudVert = `
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const cloudFrag = `
  varying vec3 vWorld;
  uniform vec3 uCloud;
  uniform vec3 uShadow;
  uniform float uTime;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 p = vWorld.xz * 0.006 + vec2(uTime * 0.01, uTime * 0.004);
    float n = fbm(p + fbm(p * 0.5 + uTime * 0.006));
    float puff = smoothstep(0.3, 0.75, n);
    vec3 c = mix(uShadow, uCloud, 0.35 + 0.65 * puff);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export function createLevelScene(level) {
  const pal = level.palette;
  const scene = new THREE.Scene();
  const fogColor = col(pal.fog);
  scene.fog = new THREE.Fog(fogColor, 140, 1150);
  scene.background = fogColor;

  const uniforms = {
    uHeight: { value: new THREE.Vector2(-40, level.bounds.top) },
    uGlow: { value: pal.glow ? 0.32 : 0.0 },
    uPlayers: { value: Array.from({ length: MAX_PLAYERS }, () => new THREE.Vector4()) },
    uPlayerColors: { value: Array.from({ length: MAX_PLAYERS }, () => new THREE.Color()) },
  };

  // Blocks.
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = blockMaterial(level, uniforms);
  const n = level.boxes.length;
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4();
  const colors = pal.blocks.map(col);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const b = level.boxes[i];
    const M = b.m;
    m4.set(
      M[0] * b.h[0] * 2, M[3] * b.h[1] * 2, M[6] * b.h[2] * 2, b.c[0],
      M[1] * b.h[0] * 2, M[4] * b.h[1] * 2, M[7] * b.h[2] * 2, b.c[1],
      M[2] * b.h[0] * 2, M[5] * b.h[1] * 2, M[8] * b.h[2] * 2, b.c[2],
      0, 0, 0, 1,
    );
    mesh.setMatrixAt(i, m4);
    c.copy(colors[b.color % colors.length]).multiplyScalar(b.shade);
    mesh.setColorAt(i, c);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Light: a cool sky fill and a warm low sun.
  const sunDir = new THREE.Vector3(0.55, 0.62, 0.35).normalize();
  const hemi = new THREE.HemisphereLight(col(pal.hemi[0]), col(pal.hemi[1]), 1.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(col(pal.sun), 2.1);
  sun.position.copy(sunDir).multiplyScalar(100);
  scene.add(sun);
  scene.add(sun.target);

  // Sky dome (drawn at infinity, follows the camera).
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: col(pal.sky[0]) },
        uHorizon: { value: col(pal.sky[1]) },
        uFog: { value: fogColor },
        uSunDir: { value: sunDir },
        uSun: { value: col(pal.sun) },
      },
    }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // The sea of clouds below.
  const cloudShadow = col(pal.cloud).lerp(col(pal.hemi[1]), 0.35).multiplyScalar(0.86);
  const clouds = new THREE.Mesh(
    new THREE.PlaneGeometry(9000, 9000, 1, 1),
    new THREE.ShaderMaterial({
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uCloud: { value: col(pal.cloud) }, uShadow: { value: cloudShadow }, uTime: { value: 0 } },
      ]),
    }),
  );
  clouds.rotation.x = -Math.PI / 2;
  clouds.position.y = level.bounds.floor - 20;
  clouds.frustumCulled = false;
  scene.add(clouds);

  const playerSlots = uniforms.uPlayers.value;
  return {
    scene,
    mesh,
    fogColor,
    // Call before rendering each view.
    prepareView(camera) {
      sky.position.copy(camera.position);
      clouds.position.x = camera.position.x;
      clouds.position.z = camera.position.z;
    },
    update(time) {
      clouds.material.uniforms.uTime.value = time;
    },
    setPlayerGlow(i, pos, color, strength) {
      if (!pos) {
        playerSlots[i].w = 0;
        return;
      }
      playerSlots[i].set(pos.x, pos.y, pos.z, strength);
      uniforms.uPlayerColors.value[i].set(color);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
      clouds.geometry.dispose();
      clouds.material.dispose();
      mesh.dispose();
    },
  };
}

// --- Contrails: camera-facing ribbons from the wingtips, drawn per view.
const trailVert = `
  attribute vec3 aTangent;
  attribute float aSide;
  attribute float aAge;
  uniform float uWidth;
  varying float vAge;
  varying float vSide;
  #include <fog_pars_vertex>
  void main() {
    vec3 view = normalize(cameraPosition - position);
    vec3 s = cross(aTangent, view);
    float l = length(s);
    s = l > 1e-4 ? s / l : vec3(0.0, 1.0, 0.0);
    float w = uWidth * (1.0 - aAge) * (0.35 + 0.65 * (1.0 - aAge));
    vec3 p = position + s * aSide * w;
    vAge = aAge;
    vSide = aSide;
    vec4 mvPosition = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const trailFrag = `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vAge;
  varying float vSide;
  #include <fog_pars_fragment>
  void main() {
    float edge = 1.0 - abs(vSide);
    float a = uAlpha * (1.0 - vAge) * smoothstep(0.0, 0.6, edge + 0.25);
    gl_FragColor = vec4(uColor * (1.0 + 0.4 * edge), a);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export class Trail {
  constructor(color, length = 70) {
    this.n = length;
    this.points = [];
    const verts = length * 2;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(verts * 3);
    this.tan = new Float32Array(verts * 3);
    this.age = new Float32Array(verts);
    const side = new Float32Array(verts);
    for (let i = 0; i < verts; i++) side[i] = i % 2 ? 1 : -1;
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTangent', new THREE.BufferAttribute(this.tan, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    const idx = [];
    for (let i = 0; i < length - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(idx);
    this.material = new THREE.ShaderMaterial({
      vertexShader: trailVert,
      fragmentShader: trailFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0.7 }, uWidth: { value: 0.18 } }]),
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.geometry = g;
    this.lifetime = 1.6;
    g.setDrawRange(0, 0);
  }
  reset() {
    this.points.length = 0;
    this.geometry.setDrawRange(0, 0);
  }
  update(time, head, width, alpha) {
    const pts = this.points;
    const last = pts[0];
    if (head && (!last || last.p.distanceToSquared(head) > 0.36)) {
      pts.unshift({ p: head.clone(), t: time });
      if (pts.length > this.n - 1) pts.pop();
    }
    while (pts.length && time - pts[pts.length - 1].t > this.lifetime) pts.pop();
    this.material.uniforms.uWidth.value = width;
    this.material.uniforms.uAlpha.value = alpha;
    const list = this.list || (this.list = []);
    list.length = 0;
    if (head) list.push({ p: head, t: time });
    for (const q of pts) list.push(q);
    const count = list.length;
    if (count < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }
    for (let i = 0; i < count; i++) {
      const p = list[i].p;
      const a = list[Math.max(0, i - 1)].p, b = list[Math.min(count - 1, i + 1)].p;
      let tx = a.x - b.x, ty = a.y - b.y, tz = a.z - b.z;
      const l = Math.hypot(tx, ty, tz) || 1;
      tx /= l; ty /= l; tz /= l;
      const age = Math.min(1, (time - list[i].t) / this.lifetime);
      for (let s = 0; s < 2; s++) {
        const v = i * 2 + s;
        this.pos[v * 3] = p.x; this.pos[v * 3 + 1] = p.y; this.pos[v * 3 + 2] = p.z;
        this.tan[v * 3] = tx; this.tan[v * 3 + 1] = ty; this.tan[v * 3 + 2] = tz;
        this.age[v] = age;
      }
    }
    const g = this.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aTangent.needsUpdate = true;
    g.attributes.aAge.needsUpdate = true;
    g.setDrawRange(0, (count - 1) * 6);
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// --- Speed streaks: short lines that stream past a glider when it is fast.
export class Streaks {
  constructor(count = 48) {
    this.count = count;
    this.pos = new Float32Array(count * 6);
    this.seeds = Array.from({ length: count }, () => new THREE.Vector3());
    this.alive = false;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.mesh = new THREE.LineSegments(g, this.material);
    this.mesh.frustumCulled = false;
    this.geometry = g;
  }
  update(center, vel, speed, dt) {
    const k = THREE.MathUtils.clamp((speed - 45) / 50, 0, 1);
    this.material.opacity = k * 0.55;
    this.mesh.visible = k > 0.01;
    if (!this.mesh.visible) {
      this.alive = false;
      return;
    }
    const dir = vel.clone().normalize();
    const len = 1.2 + speed * 0.03;
    for (let i = 0; i < this.count; i++) {
      const s = this.seeds[i];
      // Relative to the glider: respawn ahead when one falls behind or strays.
      if (!this.alive || s.dot(dir) < -14 || s.lengthSq() > 900) {
        s.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(26);
        s.addScaledVector(dir, 12 + Math.random() * 16);
      }
      s.addScaledVector(dir, -speed * dt * 0.6);
      const a = i * 6;
      this.pos[a] = center.x + s.x; this.pos[a + 1] = center.y + s.y; this.pos[a + 2] = center.z + s.z;
      this.pos[a + 3] = center.x + s.x - dir.x * len; this.pos[a + 4] = center.y + s.y - dir.y * len; this.pos[a + 5] = center.z + s.z - dir.z * len;
    }
    this.alive = true;
    this.geometry.attributes.position.needsUpdate = true;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// --- A soft round shadow cast straight down onto the blocks.
let shadowTexture = null;
function getShadowTexture() {
  if (shadowTexture || typeof document === 'undefined') return shadowTexture;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  shadowTexture = new THREE.CanvasTexture(cv);
  return shadowTexture;
}

export function createShadow() {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshBasicMaterial({ map: getShadowTexture(), transparent: true, depthWrite: false, opacity: 1, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  return m;
}

// --- A burst of bits when a glider crashes.
export class Burst {
  constructor(colors) {
    this.n = 70;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.n * 3);
    this.col = new Float32Array(this.n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.vel = Array.from({ length: this.n }, () => new THREE.Vector3());
    this.material = new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
    this.mesh = new THREE.Points(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.geometry = g;
    this.colors = colors.map((c) => new THREE.Color(c));
    this.t = 0;
  }
  fire(at, vel) {
    for (let i = 0; i < this.n; i++) {
      this.pos[i * 3] = at.x; this.pos[i * 3 + 1] = at.y; this.pos[i * 3 + 2] = at.z;
      const c = this.colors[i % this.colors.length];
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.vel[i].set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 12).addScaledVector(vel, -0.12);
    }
    this.geometry.attributes.color.needsUpdate = true;
    this.t = 0;
    this.mesh.visible = true;
  }
  update(dt) {
    if (!this.mesh.visible) return;
    this.t += dt;
    for (let i = 0; i < this.n; i++) {
      const v = this.vel[i];
      v.y -= 6 * dt;
      v.multiplyScalar(1 - 1.5 * dt);
      this.pos[i * 3] += v.x * dt; this.pos[i * 3 + 1] += v.y * dt; this.pos[i * 3 + 2] += v.z * dt;
    }
    this.material.opacity = Math.max(0, 1 - this.t / 1.8);
    this.geometry.attributes.position.needsUpdate = true;
    if (this.t > 1.8) this.mesh.visible = false;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// --- Split-screen layout, in CSS pixels: rects for n players, plus a spare
// panel rect when three players leave a quarter free.
export function splitLayout(n, w, h) {
  if (n <= 1) return { views: [{ x: 0, y: 0, w, h }], spare: null };
  if (n === 2) {
    const hh = Math.floor(h / 2);
    return { views: [{ x: 0, y: 0, w, h: hh }, { x: 0, y: hh, w, h: h - hh }], spare: null };
  }
  const hw = Math.floor(w / 2), hh = Math.floor(h / 2);
  const quads = [
    { x: 0, y: 0, w: hw, h: hh },
    { x: hw, y: 0, w: w - hw, h: hh },
    { x: 0, y: hh, w: hw, h: h - hh },
    { x: hw, y: hh, w: w - hw, h: h - hh },
  ];
  return { views: quads.slice(0, n), spare: n === 3 ? quads[3] : null };
}

// Rendering a world: one instanced mesh of cubes per island (so islands out of
// view are skipped), with a shader that bevels each cube's edges and lights the
// rock near a scoring player; the distant giants; a gradient sky with a sun,
// optional painted cloud layers, and haze that thickens with distance and with
// depth, so the islands' undersides sink into the mist; layered sheets of mist
// below; rising motes in the updrafts; and the portals.

import * as THREE from '../vendor/three.module.min.js';

export const MAX_PLAYERS = 4;

const col = (hex) => new THREE.Color(hex);

// The haze, shared by the rock and the mist sheets: distance haze in the
// horizon colour, and mist that thickens toward the depths.
const ATMOS = `
  uniform vec3 uFogColor;
  uniform vec3 uMistColor;
  uniform float uFogDensity;
  uniform vec2 uMist; // top, bottom
  vec3 atmos(vec3 color, vec3 wp, float extra) {
    float d = distance(wp, cameraPosition);
    float fd = 1.0 - exp(-pow(d * uFogDensity, 1.3));
    float h = smoothstep(uMist.x, uMist.y, wp.y);
    float hf = h * (0.35 + 0.65 * smoothstep(30.0, 600.0, d)) + extra;
    vec3 fogc = mix(uFogColor, uMistColor, clamp(smoothstep(uMist.x + 200.0, uMist.y, wp.y) * 0.85 + 0.15 * h, 0.0, 1.0));
    return mix(color, fogc, clamp(max(fd, hf), 0.0, 1.0));
  }`;

function rockMaterial(uniforms) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0.0, toneMapped: false, fog: false });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBoxLocal;
        varying vec3 vBoxScale;
        varying vec3 vWorldPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBoxLocal = position;
        vBoxScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBoxLocal;
        varying vec3 vBoxScale;
        varying vec3 vWorldPos;
        uniform float uGlow;
        uniform vec4 uPlayers[${MAX_PLAYERS}];
        uniform vec3 uPlayerColors[${MAX_PLAYERS}];
        ${ATMOS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 e = (0.5 - abs(vBoxLocal)) * vBoxScale;
          float mn = min(e.x, min(e.y, e.z));
          float mx = max(e.x, max(e.y, e.z));
          float mid = e.x + e.y + e.z - mn - mx;
          float edge = max(vBoxScale.x, 4.0) * 0.06;
          float bevel = 1.0 - smoothstep(0.0, edge, mid);
          float crease = 1.0 - smoothstep(0.0, edge * 0.15, mid);
          diffuseColor.rgb *= mix(1.0, 1.14, bevel) * mix(1.0, 0.84, crease);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uGlow;
        for (int i = 0; i < ${MAX_PLAYERS}; i++) {
          if (uPlayers[i].w > 0.0) {
            float d = distance(vWorldPos, uPlayers[i].xyz);
            float g = 1.0 - smoothstep(0.0, 12.0, d);
            totalEmissiveRadiance += uPlayerColors[i] * g * g * 0.55 * uPlayers[i].w;
          }
        }`)
      .replace('#include <dithering_fragment>', `gl_FragColor.rgb = atmos(gl_FragColor.rgb, vWorldPos, 0.0);
        #include <dithering_fragment>`);
  };
  mat.customProgramCacheKey = () => 'gliders-rock';
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
  uniform vec3 uMistColor;
  uniform vec3 uSunDir;
  uniform vec3 uSun;
  uniform float uTime;
  uniform sampler2D uBand;
  uniform sampler2D uWisps;
  uniform float uHasBand;
  uniform float uHasWisps;
  void main() {
    vec3 d = normalize(vDir);
    float y = d.y;
    vec3 c = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.9, y), 0.7));
    // Toward and below the horizon: haze, then the bright mist far below.
    c = mix(c, uFog, smoothstep(0.14, 0.0, y));
    c = mix(c, uMistColor, smoothstep(0.0, -0.35, y));
    float s = max(dot(d, uSunDir), 0.0);
    vec3 sunGlow = uSun * (pow(s, 900.0) * 1.6 + pow(s, 32.0) * 0.25 + pow(s, 5.0) * 0.08);
    // Painted layers (greyscale: brightness is cloud).
    if (uHasWisps > 0.5 && y > 0.02) {
      vec2 uv = d.xz / (y + 0.12) * 0.22 + vec2(uTime * 0.0015, uTime * 0.0007);
      float w = texture2D(uWisps, uv).r * smoothstep(0.02, 0.3, y) * 0.55;
      c = mix(c, mix(vec3(1.0), uHorizon, 0.25) + sunGlow * 0.5, w);
    }
    if (uHasBand > 0.5) {
      float u = atan(d.z, d.x) / 6.2831853 * 2.0 + uTime * 0.0004;
      float v = clamp((y + 0.06) / 0.42, 0.0, 1.0);
      float b = texture2D(uBand, vec2(u, 1.0 - v)).r * step(y, 0.36) * smoothstep(-0.08, -0.02, y);
      vec3 cloud = mix(uMistColor, uHorizon, 0.35) * (0.92 + 0.18 * smoothstep(0.0, 0.3, y)) + sunGlow * 0.6;
      c = mix(c, cloud, b * 0.9);
    }
    c += sunGlow;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

const mistVert = `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const mistFrag = `
  varying vec3 vWorld;
  uniform vec3 uShadow;
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  uniform sampler2D uTex;
  uniform float uHasTex;
  ${ATMOS}
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
    vec2 p = vWorld.xz * 0.0018 + vec2(uTime * 0.004 + uSeed, uTime * 0.0017 - uSeed);
    float n;
    if (uHasTex > 0.5) n = texture2D(uTex, p * 0.5).r * 0.75 + texture2D(uTex, p * 0.21 + 0.37).r * 0.45 - 0.1;
    else n = fbm(p + fbm(p * 0.45 + uSeed));
    float puff = smoothstep(0.28, 0.78, n);
    vec3 c = mix(uShadow, uMistColor, 0.45 + 0.55 * puff);
    c = atmos(c, vWorld, 0.0);
    float d = distance(vWorld.xz, cameraPosition.xz);
    float a = uOpacity * (0.35 + 0.65 * puff) * (1.0 - smoothstep(4500.0, 6000.0, d));
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }`;

const moteVert = `
  attribute vec4 aCol; // x, z, base y, height
  attribute vec4 aMote; // radius, phase, speed, angle
  uniform float uTime;
  varying float vA;
  void main() {
    float t = fract(aMote.y + uTime * aMote.z / aCol.w);
    float ang = aMote.w + uTime * 0.25;
    vec3 p = vec3(aCol.x + cos(ang) * aMote.x, aCol.z + t * aCol.w, aCol.y + sin(ang) * aMote.x);
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(260.0 / -mv.z, 1.0, 9.0);
    vA = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.75, 1.0, t)) * (1.0 - smoothstep(500.0, 1100.0, -mv.z));
  }`;
const moteFrag = `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float a = (1.0 - smoothstep(0.2, 0.5, length(q))) * vA * 0.75;
    gl_FragColor = vec4(uColor, a);
  }`;

function islandMesh(boxes, start, end, geo, mat, colors) {
  const n = end - start;
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  const m4 = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const b = boxes[start + i];
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
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

// textures: optional { band, wisps, mist } (THREE.Texture) from the painted sky layers.
export function createLevelScene(level, textures = {}) {
  const pal = level.palette;
  const scene = new THREE.Scene();
  const fogColor = col(pal.fog);
  const mistColor = col(pal.mist || pal.fog);
  // Trails and other effects use three's own fog, matched to the haze.
  scene.fog = new THREE.FogExp2(fogColor, 1 / 3200);
  scene.background = mistColor;

  const atmos = {
    uFogColor: { value: fogColor },
    uMistColor: { value: mistColor },
    uFogDensity: { value: 1 / 3000 },
    uMist: { value: new THREE.Vector2(level.bounds.mist + 330, level.bounds.mist - 30) },
  };
  const uniforms = {
    ...atmos,
    uGlow: { value: pal.glow ? 0.32 : 0.0 },
    uPlayers: { value: Array.from({ length: MAX_PLAYERS }, () => new THREE.Vector4()) },
    uPlayerColors: { value: Array.from({ length: MAX_PLAYERS }, () => new THREE.Color()) },
  };

  // The islands: one mesh each, so the renderer can skip those out of view.
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = rockMaterial(uniforms);
  const colors = pal.blocks.map(col);
  const meshes = [];
  for (const part of level.parts) {
    if (part.end <= part.start) continue;
    const mesh = islandMesh(level.boxes, part.start, part.end, geo, mat, colors);
    scene.add(mesh);
    meshes.push(mesh);
  }
  if (level.backdrop?.length) {
    const far = islandMesh(level.backdrop, 0, level.backdrop.length, geo, mat, colors);
    scene.add(far);
    meshes.push(far);
  }

  // Light: a cool sky fill and a warm low sun.
  const sunDir = new THREE.Vector3(0.55, 0.5, 0.35).normalize();
  scene.add(new THREE.HemisphereLight(col(pal.hemi[0]), col(pal.hemi[1]), 1.5));
  const sun = new THREE.DirectionalLight(col(pal.sun), 2.2);
  sun.position.copy(sunDir).multiplyScalar(100);
  scene.add(sun);
  scene.add(sun.target);

  // Sky dome (drawn at infinity, follows the camera).
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  const skyU = {
    uTop: { value: col(pal.sky[0]) },
    uHorizon: { value: col(pal.sky[1]) },
    uFog: { value: fogColor },
    uMistColor: { value: mistColor },
    uSunDir: { value: sunDir },
    uSun: { value: col(pal.sun) },
    uTime: { value: 0 },
    uBand: { value: textures.band || blank },
    uWisps: { value: textures.wisps || blank },
    uHasBand: { value: textures.band ? 1 : 0 },
    uHasWisps: { value: textures.wisps ? 1 : 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, uniforms: skyU }));
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // Sheets of mist below, stacked so diving toward them feels deep.
  const shadow = mistColor.clone().lerp(col(pal.hemi[1]), 0.3).multiplyScalar(0.84);
  const mists = [];
  const mistPlane = new THREE.PlaneGeometry(14000, 14000, 1, 1);
  [
    { y: level.bounds.mist + 60, o: 0.45, seed: 0.0 },
    { y: level.bounds.mist + 10, o: 0.6, seed: 3.7 },
    { y: level.bounds.mist - 45, o: 0.92, seed: 7.1 },
  ].forEach((l, i) => {
    const m = new THREE.Mesh(
      mistPlane,
      new THREE.ShaderMaterial({
        vertexShader: mistVert,
        fragmentShader: mistFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { ...atmos, uShadow: { value: shadow }, uTime: { value: 0 }, uSeed: { value: l.seed }, uOpacity: { value: l.o }, uTex: { value: textures.mist || blank }, uHasTex: { value: textures.mist ? 1 : 0 } },
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = l.y;
    m.renderOrder = 5 - i;
    m.frustumCulled = false;
    scene.add(m);
    mists.push(m);
  });

  // Motes rising in the updrafts.
  let motes = null;
  if (level.updrafts?.length) {
    const per = 70;
    const n = level.updrafts.length * per;
    const aCol = new Float32Array(n * 4), aMote = new Float32Array(n * 4);
    let r = 1;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    level.updrafts.forEach((u, k) => {
      for (let i = 0; i < per; i++) {
        const j = (k * per + i) * 4;
        aCol.set([u.x, u.z, u.y0, u.y1 - u.y0], j);
        aMote.set([u.r * Math.sqrt(rnd()), rnd(), 14 + rnd() * 18, rnd() * Math.PI * 2], j);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(aCol, 4));
    g.setAttribute('aMote', new THREE.BufferAttribute(aMote, 4));
    motes = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: moteVert, fragmentShader: moteFrag, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(1, 1, 1) } } }));
    motes.frustumCulled = false;
    scene.add(motes);
  }

  // Portals: tumbling rings of purple cubes around a glowing heart.
  const portals = [];
  const portalMat = new THREE.MeshStandardMaterial({ color: 0x9b4dff, emissive: 0x7a2cff, emissiveIntensity: 0.9, roughness: 0.4, toneMapped: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xe0b8ff, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
  for (const p of level.portals || []) {
    const group = new THREE.Group();
    group.position.set(p.x, p.y, p.z);
    group.rotation.y = p.yaw;
    const cubes = new THREE.InstancedMesh(geo, portalMat, 40);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const ring = i % 2 ? p.r * 1.12 : p.r;
      const s = 1.2 + ((i * 7) % 5) * 0.35;
      q.setFromEuler(new THREE.Euler(a * 3, a * 2, a));
      m4.compose(new THREE.Vector3(Math.cos(a) * ring, Math.sin(a) * ring, ((i * 13) % 7) - 3), q, new THREE.Vector3(s, s, s));
      cubes.setMatrixAt(i, m4);
    }
    const core = new THREE.Mesh(new THREE.CircleGeometry(p.r * 0.95, 40), coreMat);
    core.material.side = THREE.DoubleSide;
    group.add(cubes, core);
    scene.add(group);
    portals.push({ group, cubes, core });
  }

  const playerSlots = uniforms.uPlayers.value;
  return {
    scene,
    meshes,
    fogColor,
    // Call before rendering each view.
    prepareView(camera) {
      sky.position.copy(camera.position);
      for (const m of mists) {
        m.position.x = camera.position.x;
        m.position.z = camera.position.z;
      }
    },
    update(time) {
      skyU.uTime.value = time;
      for (const m of mists) m.material.uniforms.uTime.value = time;
      if (motes) motes.material.uniforms.uTime.value = time;
      portals.forEach((p, i) => {
        p.cubes.rotation.z = time * 0.6 + i;
        p.core.material.opacity = 0.28 + 0.12 * Math.sin(time * 3 + i);
      });
    },
    // Low graphics: a shorter view with thicker haze to hide where it ends.
    setDetail(low) {
      atmos.uFogDensity.value = low ? 1 / 1500 : 1 / 3000;
      scene.fog.density = low ? 1 / 1600 : 1 / 3200;
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
      meshes.forEach((m) => m.dispose());
      sky.geometry.dispose();
      sky.material.dispose();
      mistPlane.dispose();
      mists.forEach((m) => m.material.dispose());
      blank.dispose();
      if (motes) {
        motes.geometry.dispose();
        motes.material.dispose();
      }
      portalMat.dispose();
      coreMat.dispose();
      portals.forEach((p) => {
        p.cubes.dispose();
        p.core.geometry.dispose();
      });
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

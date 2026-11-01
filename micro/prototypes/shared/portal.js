// The way on, made tempting: a golden sparkle over a portal (the place a world
// zooms on to the next). No text anywhere: the place itself has to say "go
// there". Its light is the super-gene's (micro/design/super-gene-return.html,
// the glowing super phage, SGR-01): a warm gold (#f0b44a) round a near-white
// core, a fine spray of tiny sparks with a few bigger four-point star glints,
// and a radiating burst, so the way on reads as the same golden thread that
// the phage's super-gene carries back up the chain. Shared so every world's
// portal carries the same look; each world tunes it with options.
//
// Two parts:
//
//   createPortalGlow  in the world (three.js): drifting glints that twinkle
//                     and rise, a soft glow pool under them, a slow pulse, a
//                     tall soft beacon of light with motes rising up it, and
//                     on success a burst (a ring racing out over the ground
//                     and a fountain of sparks).
//   createPortalLight on the screen (a 2D overlay): the portal's light seen
//                     from afar. Narrow macro and microscope views rarely
//                     have the portal in frame until you are on it, so its
//                     light spills in from the edge of the view on its side,
//                     the way a bright source just out of frame flares a real
//                     lens: a warm glow, an anamorphic streak and gold bokeh
//                     discs drifting in. In view, a soft halo and a glint mark
//                     it through the depth of field. On success, a bloom.
//
//   import { createPortalGlow, createPortalLight } from '../shared/portal.js';
//   const glow = createPortalGlow({ THREE, scene, size: 10 });
//   glow.setPosition(x, y, z);          // the centre, on the ground or film
//   glow.setOpen(false);                // guarded: dimmer, a little restless
//   ... each frame: glow.update(dt, time, camera);
//   glow.burst();                       // success (real time: it plays on through a freeze)
//
//   const light = createPortalLight();
//   ... each frame, after the landmark arrow (shared/landmark.js):
//   const marks = arrows.drawSplit(split, portalPos, { kind: 'forward' });
//   light.begin();
//   light.drawSplit(split, marks, { strength, open });
//   light.bloom(x, y);                  // success, at a point on screen (CSS px)
//
// API
//   createPortalGlow({ THREE, scene = null, size = 10, color = '#f0b44a',
//     count = 64, intensity = 1, height = size * 0.9, beam = size * 6,
//     beamWidth = size * 0.5, pixelHeight }) -> glow
//     size        radius of the glow pool and of the glints' spread (world units)
//     intensity   overall brightness (worlds with HDR tone mapping may want > 1)
//     beam        height of the beacon (0: none); a quarter of the glints rise up it
//     pixelHeight () -> drawing-buffer height in px (sizes the glints);
//                 default innerHeight x devicePixelRatio
//   glow.group             THREE.Group (add it yourself if no scene is given)
//   glow.setPosition(x, y, z)
//   glow.setOpen(open)     eases between guarded (false) and open (true)
//   glow.update(dt, time, camera, burstT?)
//   glow.burst()           the success burst (1.4 s, on its own real-time clock,
//                          or on burstT, seconds since it began, when update gets it)
//   glow.open              the eased openness, 0..1
//   glow.dispose()
//
//   createPortalLight({ parent = document.body, zIndex = 3, color = '#f0b44a',
//     clock = real seconds }) -> light   (clock: the blooms' time, e.g. the world's frame time)
//   light.begin()          clear (once per frame, before drawing)
//   light.draw({ x, y, angle, onScreen, strength = 1, open = 1, region = null })
//       x, y, angle, onScreen: shared/landmark.js draw()'s result (CSS px;
//       off screen, the arrow's spot just inside the edge and its direction)
//       strength 0..1 (nearer: stronger), region: polygon(s) to clip to
//   light.drawSplit(split, marks, opts)   one per view of a shared/splitscreen.js layout
//   light.bloom(x, y, { scale = 1 })      a golden bloom that swells and fades (1.3 s)
//   light.canvas, light.dispose()
//
// Cost: the glow is five draws (pool, burst ring, beacon, glints, sparks), no
// textures; all blend additively into colour only (destination alpha is
// kept), so pipelines that keep depth or coverage in alpha are untouched. The
// light is a 2D canvas with a handful of gradients, cleared only when drawn.

export function createPortalGlow({ THREE, scene = null, size = 10, color = '#f0b44a', count = 64, intensity = 1, height = null, beam = null, beamWidth = null, pixelHeight = null } = {}) {
  const group = new THREE.Group();
  group.name = 'portal-glow';
  const gold = new THREE.Color(color);
  const H = height ?? size * 0.9;
  const B = beam ?? size * 6;
  const BW = beamWidth ?? size * 0.5;
  const pxH = pixelHeight || (() => (typeof innerHeight === 'number' ? innerHeight * Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1) : 720));
  const blend = {
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  };
  const uniforms = {
    uTime: { value: 0 }, uOpen: { value: 0 }, uColor: { value: new THREE.Vector3(gold.r, gold.g, gold.b) },
    uSize: { value: size }, uH: { value: H }, uI: { value: intensity }, uViewH: { value: 720 },
    uBeam: { value: B }, uBeamW: { value: BW }, uBurst: { value: 99 },
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
        float a = (ring + core) * smoothstep(1.0, 0.85, r) * breathe * mix(0.1, 0.3, uOpen) * uI;
        gl_FragColor = vec4(uColor * 1.4, a);
      }`,
  }));
  pool.position.y = 0.03;
  pool.renderOrder = 3;
  pool.frustumCulled = false;
  group.add(pool);

  // the success burst on the ground: a bright ring racing out, then fading
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms, ...blend,
    vertexShader: /* glsl */ `uniform float uSize; varying vec2 vP;
      void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position * vec3(uSize * 5.0, 1.0, uSize * 5.0), 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uBurst, uI; uniform vec3 uColor; varying vec2 vP;
      void main() {
        float b = uBurst;
        if (b > 1.6) discard;
        float r = length(vP) * 5.0;                 // in pool radii
        float R = 0.3 + 4.2 * (1.0 - pow(1.0 - clamp(b / 1.3, 0.0, 1.0), 3.0));
        float w = 0.18 + 0.35 * b;
        float a = exp(-pow((r - R) / w, 2.0)) * (1.0 - smoothstep(0.5, 1.5, b)) * 0.55
          + exp(-r * r * 1.5) * (1.0 - smoothstep(0.0, 0.6, b)) * 0.45;  // the flash at the centre
        gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.96, 0.82), 0.3) * 1.5, a * uI * smoothstep(1.0, 0.95, length(vP)));
      }`,
  }));
  ring.position.y = 0.05;
  ring.renderOrder = 3;
  ring.frustumCulled = false;
  ring.visible = false;
  group.add(ring);

  // the beacon: a tall soft shaft of light, turned to face the camera about the vertical
  let shaft = null;
  if (B > 0) {
    shaft = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 8).translate(0, 0.5, 0), new THREE.ShaderMaterial({
      uniforms, ...blend,
      vertexShader: /* glsl */ `uniform float uBeam, uBeamW; varying vec2 vU;
        void main() {
          vU = vec2(position.x * 2.0, position.y);
          vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 toCam = cameraPosition - c; toCam.y = 0.0;
          vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(toCam + vec3(1e-4, 0.0, 0.0))));
          float w = uBeamW * (1.0 + 0.6 * position.y);
          vec3 p = c + side * position.x * 2.0 * w + vec3(0.0, position.y * uBeam, 0.0);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `uniform float uTime, uOpen, uI; uniform vec3 uColor; varying vec2 vU;
        void main() {
          float across = exp(-vU.x * vU.x * 3.5);
          float up = smoothstep(0.0, 0.05, vU.y) * pow(1.0 - vU.y, 1.6);
          float shimmer = 0.8 + 0.2 * sin(uTime * 2.3 - vU.y * 9.0);
          float a = across * up * shimmer * mix(0.12, 0.32, uOpen) * uI;
          gl_FragColor = vec4(uColor * 1.6, a);
        }`,
    }));
    shaft.frustumCulled = false;
    shaft.renderOrder = 3;
    group.add(shaft);
  }

  // the glints: each one drifts up in a slow spiral from the disc, twinkles and
  // fades; a quarter of them (seed.y > 0.75) rise high up the beacon
  const seeds = new Float32Array(count * 4);
  let s = 9183;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) { seeds[i * 4] = rnd(); seeds[i * 4 + 1] = rnd(); seeds[i * 4 + 2] = rnd(); seeds[i * 4 + 3] = 0.6 + rnd() * 0.8; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const GLINT_FRAG = /* glsl */ `uniform float uOpen, uI; uniform vec3 uColor; varying float vA; varying float vTw;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r = length(q);
        // a soft round body and a four-point star: a glint, not a dot
        float star = exp(-r * r * 9.0) + 0.55 * exp(-abs(q.x) * 18.0) * exp(-abs(q.y) * 2.6) + 0.55 * exp(-abs(q.y) * 18.0) * exp(-abs(q.x) * 2.6);
        float a = star * smoothstep(1.0, 0.6, r) * vA * (0.35 + 0.65 * vTw) * mix(0.55, 1.0, uOpen) * uI;
        gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.95, 0.8), 0.6 * vTw * exp(-r * r * 12.0)) * 1.7, min(1.0, a * 1.3));
      }`;
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms, ...blend,
    vertexShader: /* glsl */ `uniform float uTime, uOpen, uSize, uH, uViewH, uBeam, uBeamW; attribute vec4 seed; varying float vA; varying float vTw;
      void main() {
        bool high = seed.y > 0.75 && uBeam > 0.0;
        float speed = mix(0.07, 0.11, uOpen) * seed.w * (high ? 0.55 : 1.0);
        float life = fract(seed.x + uTime * speed);
        float ang = seed.z * 6.2832 + life * mix(1.4, 2.6, 1.0 - uOpen) + 0.3 * sin(uTime * 3.0 * (1.0 - uOpen) + seed.z * 40.0);
        float u = high ? (seed.y - 0.75) * 4.0 : seed.y / 0.75;
        float rad = high ? uBeamW * (0.3 + 0.9 * sqrt(u)) : uSize * (0.15 + 0.8 * sqrt(u)) * (1.0 - 0.35 * life);
        float y = high ? 0.3 + life * uBeam * 0.9 : 0.15 + life * uH * mix(0.55, 1.0, uOpen);
        vec3 p = vec3(cos(ang) * rad, y, sin(ang) * rad);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.65, 1.0, life));
        vTw = 0.5 + 0.5 * sin(uTime * (5.0 + 6.0 * seed.w) + seed.x * 60.0);
        gl_Position = projectionMatrix * mv;
        float worldSize = uSize * 0.09 * (0.7 + 0.6 * seed.w) * (0.6 + 0.6 * vTw) * (high ? 1.4 : 1.0);
        gl_PointSize = clamp(worldSize * projectionMatrix[1][1] * uViewH * 0.5 / max(-mv.z, 1e-3), 2.5, 72.0);
      }`,
    fragmentShader: GLINT_FRAG,
  }));
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  group.add(pts);

  // the burst's sparks: a fountain flung up and out from the centre
  const SPARKS = 90;
  const sseeds = new Float32Array(SPARKS * 4);
  for (let i = 0; i < SPARKS; i++) { sseeds[i * 4] = rnd(); sseeds[i * 4 + 1] = rnd(); sseeds[i * 4 + 2] = rnd(); sseeds[i * 4 + 3] = 0.6 + rnd() * 0.8; }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
  sgeo.setAttribute('seed', new THREE.BufferAttribute(sseeds, 4));
  const sparks = new THREE.Points(sgeo, new THREE.ShaderMaterial({
    uniforms, ...blend,
    vertexShader: /* glsl */ `uniform float uBurst, uSize, uH, uViewH; attribute vec4 seed; varying float vA; varying float vTw;
      void main() {
        float b = uBurst;
        float ang = seed.x * 6.2832;
        float out_ = uSize * (0.4 + 1.8 * seed.y) * (1.0 - exp(-b * 3.0));
        float up = uH * (0.6 + 1.6 * seed.z) * (1.0 - exp(-b * 2.6)) - 0.5 * uH * b * b;
        vec4 mv = modelViewMatrix * vec4(cos(ang) * out_, max(0.1, up), sin(ang) * out_, 1.0);
        vA = (1.0 - smoothstep(0.4, 1.4, b)) * step(b, 1.5);
        vTw = 0.5 + 0.5 * sin(b * (14.0 + 10.0 * seed.w) + seed.x * 30.0);
        gl_Position = projectionMatrix * mv;
        float worldSize = uSize * 0.12 * seed.w;
        gl_PointSize = clamp(worldSize * projectionMatrix[1][1] * uViewH * 0.5 / max(-mv.z, 1e-3), 2.5, 72.0);
      }`,
    fragmentShader: GLINT_FRAG,
  }));
  sparks.frustumCulled = false;
  sparks.renderOrder = 4;
  sparks.visible = false;
  group.add(sparks);

  if (scene) scene.add(group);
  let want = 0;
  let burstAt = -1;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const api = {
    group,
    get open() { return uniforms.uOpen.value; },
    setPosition(x, y, z) { group.position.set(x, y, z); },
    setOpen(o) { want = o ? 1 : 0; },
    burst() { burstAt = now(); want = 1; },
    get bursting() { return burstAt >= 0 && now() - burstAt < 1.6; },
    update(dt, time, camera, burstT) {
      uniforms.uTime.value = time;
      uniforms.uOpen.value += (want - uniforms.uOpen.value) * Math.min(1, (dt || 0) * 1.5);
      uniforms.uViewH.value = pxH();
      const b = burstAt < 0 ? 99 : burstT != null ? burstT : now() - burstAt;
      uniforms.uBurst.value = b;
      ring.visible = sparks.visible = b < 1.6;
      if (b < 1.6) uniforms.uOpen.value = Math.max(uniforms.uOpen.value, 1);
      void camera;
    },
    dispose() {
      group.removeFromParent();
      for (const m of [pool, ring, pts, sparks, shaft]) if (m) { m.geometry.dispose(); m.material.dispose(); }
    },
  };
  return api;
}

/**
 * One golden star glint on a point: the next world's creature on a portal
 * (the springtail's mite speck), so the eye and the camera have something to
 * go to. createGlint({ THREE, size, color, intensity, pixelHeight }) ->
 * { points, setPosition(x, y, z), update(time), dispose() }; add `points` to
 * the creature's parent. size: world units across.
 */
export function createGlint({ THREE, size = 0.5, color = '#f0b44a', intensity = 1, pixelHeight = null } = {}) {
  const gold = new THREE.Color(color);
  const pxH = pixelHeight || (() => (typeof innerHeight === 'number' ? innerHeight * Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1) : 720));
  const uniforms = { uTime: { value: 0 }, uSize: { value: size }, uViewH: { value: 720 }, uI: { value: intensity }, uColor: { value: new THREE.Vector3(gold.r, gold.g, gold.b) } };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */ `uniform float uSize, uViewH, uTime; varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vTw = 0.75 + 0.25 * sin(uTime * 2.2);
        gl_PointSize = clamp(uSize * projectionMatrix[1][1] * uViewH * 0.5 / max(-mv.z, 1e-3), 10.0, 160.0);
      }`,
    fragmentShader: /* glsl */ `uniform float uI; uniform vec3 uColor; varying float vTw;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r = length(q);
        float star = exp(-r * r * 14.0) + 0.5 * exp(-abs(q.x) * 22.0) * exp(-abs(q.y) * 3.0) + 0.5 * exp(-abs(q.y) * 22.0) * exp(-abs(q.x) * 3.0) + 0.25 * exp(-r * r * 3.0);
        float a = star * smoothstep(1.0, 0.7, r) * vTw * uI;
        gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.96, 0.84), 0.5 * exp(-r * r * 10.0)) * 2.4, min(1.0, a));
      }`,
  }));
  points.frustumCulled = false;
  points.renderOrder = 5;
  return {
    points,
    setPosition(x, y, z) { const a = geo.attributes.position; a.setXYZ(0, x, y, z); a.needsUpdate = true; },
    update(time) { uniforms.uTime.value = time; uniforms.uViewH.value = pxH(); },
    set intensity(v) { uniforms.uI.value = v; },
    dispose() { points.removeFromParent(); geo.dispose(); points.material.dispose(); },
  };
}

// ---------------------------------------------------------------- the light on the screen

function inPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function createPortalLight({ parent = document.body, zIndex = 3, color = '#f0b44a', clock = () => performance.now() / 1000 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'portal-light';
  Object.assign(canvas.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: String(zIndex), mixBlendMode: 'screen' });
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const c = /^#?([0-9a-f]{6})$/i.exec(color);
  const n = c ? parseInt(c[1], 16) : 0xf0b44a;
  const R = (n >> 16) & 255, G = (n >> 8) & 255, Bc = n & 255;
  const gold = (a) => `rgba(${R},${G},${Bc},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const pale = (a) => `rgba(255,244,214,${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  let W = 1, H = 1, dpr = 1, dirty = true;
  const blooms = [];
  const t0 = performance.now();
  const time = () => (performance.now() - t0) / 1000;
  // the bokeh discs: fixed seeds, each drifts in from the edge on its own cycle
  const DISCS = [];
  let s = 4211;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9; i++) DISCS.push({ ph: rnd(), lat: rnd() * 2 - 1, r: 0.5 + rnd() * 0.9, sp: 0.06 + rnd() * 0.06, tw: rnd() * 6.28 });

  function begin() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; dirty = blooms.length > 0; }
    else if (dirty) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; }
    if (blooms.length) drawBlooms();
  }

  function clipTo(region) {
    if (!region) return;
    const polys = Array.isArray(region[0][0]) ? region : [region];
    ctx.beginPath();
    for (const p of polys) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
    ctx.clip();
  }

  function disc(x, y, r, a) {
    // a macro lens's out-of-focus highlight: a soft disc with a brighter rim
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, gold(a * 0.35)); g.addColorStop(0.78, gold(a * 0.5)); g.addColorStop(0.92, pale(a * 0.8)); g.addColorStop(1, gold(0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function streak(x, y, len, a) {
    // an anamorphic streak: a thin horizontal flare through the source
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, 0.035);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
    g.addColorStop(0, pale(a)); g.addColorStop(0.25, gold(a * 0.55)); g.addColorStop(1, gold(0));
    ctx.fillStyle = g;
    ctx.fillRect(-len, -len, 2 * len, 2 * len);
    ctx.restore();
  }

  function draw({ x, y, angle = 0, onScreen = false, strength = 1, open = 1, region = null } = {}) {
    if (x == null || !isFinite(x) || !isFinite(y)) return;
    const t = time();
    const k = Math.max(0, Math.min(1, strength)) * (0.8 + 0.2 * open);
    if (k <= 0.01) return;
    dirty = true;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    clipTo(region);
    const m = Math.min(W, H);
    const breathe = 0.85 + 0.15 * Math.sin(t * 1.7);
    if (onScreen) {
      // in view: a halo the depth of field can't swallow, and a slow glint
      const r = m * (0.07 + 0.05 * k);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      g.addColorStop(0, pale(0.45 * k * breathe)); g.addColorStop(0.3, gold(0.28 * k)); g.addColorStop(1, gold(0));
      ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
      streak(x, y - r * 0.2, r * 3.2 * (0.8 + 0.2 * Math.sin(t * 0.9)), 0.4 * k * breathe);
      for (let i = 0; i < 4; i++) {
        const d = DISCS[i], ph = (d.ph + t * d.sp) % 1;
        disc(x + d.lat * r * 1.6, y - r * (0.3 + 1.6 * ph), m * 0.014 * d.r * (1 + ph), 0.5 * k * Math.sin(Math.PI * ph) * (0.6 + 0.4 * Math.sin(t * 3 + d.tw)));
      }
      ctx.restore();
      return;
    }
    // off screen: the light spills in from the edge on its side
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const R = m * (0.26 + 0.24 * k);
    const cx = x + ux * R * 0.12, cy = y + uy * R * 0.12;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, pale(0.95 * k * breathe)); g.addColorStop(0.15, pale(0.6 * k * breathe)); g.addColorStop(0.4, gold(0.35 * k * breathe)); g.addColorStop(1, gold(0));
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    streak(cx, cy, R * 1.7 * (0.85 + 0.15 * Math.sin(t * 0.7)), 0.95 * k * breathe);
    // bokeh discs drifting in from the light, spread along the edge
    const px = -uy, py = ux;
    for (const d of DISCS) {
      const ph = (d.ph + t * d.sp) % 1;
      const dist = R * (0.1 + 0.75 * ph), lat = d.lat * R * 0.7;
      const a = 0.95 * k * Math.sin(Math.PI * ph) * (0.6 + 0.4 * Math.sin(t * 2.4 + d.tw));
      disc(cx - ux * dist + px * lat, cy - uy * dist + py * lat, m * (0.016 + 0.026 * d.r * k), a);
    }
    ctx.restore();
  }

  function drawSplit(split, marks, opts = {}) {
    const L = split.layout;
    let j = 0;
    for (const v of L.views) {
      const regs = L.regions.filter((r) => r.view === v.index && r.polygon && r.polygon.length >= 3);
      if (!regs.length) continue;
      const mk = marks && marks[j++];
      if (!mk) continue;
      draw({ ...opts, ...mk, region: L.views.length === 1 ? null : regs.map((r) => r.polygon) });
    }
  }

  function drawBlooms() {
    const t = clock();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const m = Math.min(W, H);
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i], u = (t - b.t) / 1.3;
      if (u >= 1) { blooms.splice(i, 1); continue; }
      const r = m * b.scale * (0.12 + 0.55 * (1 - Math.pow(1 - u, 3)));
      const a = Math.sin(Math.PI * Math.min(1, u * 1.6 + 0.08)) * (1 - u);
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      g.addColorStop(0, pale(0.5 * a)); g.addColorStop(0.3, gold(0.3 * a)); g.addColorStop(1, gold(0));
      ctx.fillStyle = g; ctx.fillRect(b.x - r, b.y - r, 2 * r, 2 * r);
      // a ring of light going out
      ctx.strokeStyle = gold(0.5 * a); ctx.lineWidth = Math.max(1, m * 0.006 * (1 - u));
      ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.8, 0, Math.PI * 2); ctx.stroke();
      streak(b.x, b.y, r * 2.2, 0.7 * a);
    }
    ctx.restore();
    dirty = true;
  }

  return {
    canvas, begin, draw, drawSplit,
    bloom(x, y, { scale = 1 } = {}) { blooms.push({ x, y, scale, t: clock() }); },
    dispose() { canvas.remove(); },
  };
}

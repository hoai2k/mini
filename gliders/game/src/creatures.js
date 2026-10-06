// Procedural 3D glider creatures for Gliders.
//
// Every model is built from code: lofted bodies (a spine with a radius profile
// and elliptical cross sections), animated membrane patches, batches of rigid
// parts (feathers, bones, toes) merged into one draw call, and small canvas
// textures for fur, feathers, scales and fin rays.
//
// Conventions: the model faces +Z, up is +Y, its left side is +X. The origin
// is the centre of mass. Body length is about 1.6-2.8 units, span 0.8-2.6.
//
//   const g = createGlider('squirrel', 0);
//   scene.add(g.object);
//   g.update({ dt, time, speed, tuck, flare, roll, pitch, yaw });
//   g.dispose();

import * as THREE from '../vendor/three.module.min.js';

export const GLIDERS = [
  {
    id: 'squirrel',
    name: 'Flying Squirrel',
    latin: 'Glaucomys',
    blurb: 'A nocturnal acrobat that opens a furry cape from wrist to ankle and steers with its flat, fluffy tail.',
    variantNames: ['Natural', 'Moonlit', 'Dusk', 'Sunset'],
  },
  {
    id: 'microraptor',
    name: 'Microraptor',
    latin: 'Microraptor gui',
    blurb: 'A crow-sized dinosaur with flight feathers on all four limbs, and fossil pigments show they shimmered iridescent black like a starling.',
    variantNames: ['Natural', 'Ghost', 'Ember', 'Jade'],
  },
  {
    id: 'flyingfish',
    name: 'Flying Fish',
    latin: 'Exocoetidae',
    blurb: 'It escapes predators by bursting out of the sea, sculling the water with its long lower tail lobe, then sailing on wing-like fins for fifty metres or more.',
    variantNames: ['Natural', 'Pearl', 'Midnight', 'Tropic'],
  },
  {
    id: 'draco',
    name: 'Flying Dragon',
    latin: 'Draco volans',
    blurb: 'A palm-sized lizard whose wings are skin stretched over its own extra-long ribs, and who flags a bright yellow throat dewlap at rivals.',
    variantNames: ['Natural', 'Sand', 'Dusk', 'Lagoon'],
  },
  {
    id: 'frog',
    name: "Wallace's Flying Frog",
    latin: 'Rhacophorus nigropalmatus',
    blurb: 'It parachutes between rainforest trees on enormous webbed feet and lands with sticky toe pads.',
    variantNames: ['Natural', 'Albino', 'Night', 'Lagoon'],
  },
  {
    id: 'snake',
    name: 'Paradise Tree Snake',
    latin: 'Chrysopelea paradisi',
    blurb: 'No wings at all: it spreads its ribs to flatten into a ribbon and slithers through the air in an S-shaped wave.',
    variantNames: ['Natural', 'Ivory', 'Shadow', 'Gilded'],
  },
];

export const VARIANTS = 4;

// ---------------------------------------------------------------- helpers

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth (cubic Hermite, Catmull-Rom tangents) interpolation through keys
// [[t, value], ...] sorted by t.
function curve(keys) {
  const n = keys.length;
  const slope = (i) => {
    if (i === 0) return (keys[1][1] - keys[0][1]) / (keys[1][0] - keys[0][0]);
    if (i === n - 1) return (keys[n - 1][1] - keys[n - 2][1]) / (keys[n - 1][0] - keys[n - 2][0]);
    return (keys[i + 1][1] - keys[i - 1][1]) / (keys[i + 1][0] - keys[i - 1][0]);
  };
  const m = keys.map((_, i) => slope(i));
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (t > keys[i + 1][0]) i++;
    const [t1, p1] = keys[i];
    const [t2, p2] = keys[i + 1];
    const h = t2 - t1;
    const s = (t - t1) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p1 + (s3 - 2 * s2 + s) * h * m[i] +
      (-2 * s3 + 3 * s2) * p2 + (s3 - s2) * h * m[i + 1];
  };
}

const col = (hex) => new THREE.Color(hex);
const mixc = (out, a, b, t) => out.copy(a).lerp(b, clamp(t, 0, 1));

// Scratch objects shared by every creature (single-threaded, no per-frame allocation).
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _n3 = new THREE.Matrix3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);

// Blend a glide pose vector with tuck and flare targets: p = g + tuck*(t-g) + flare*(f-g).
function pose3(out, g, t, f, tuck, flare) {
  return out.set(
    g[0] + tuck * (t[0] - g[0]) + flare * (f[0] - g[0]),
    g[1] + tuck * (t[1] - g[1]) + flare * (f[1] - g[1]),
    g[2] + tuck * (t[2] - g[2]) + flare * (f[2] - g[2]),
  );
}
const pose1 = (g, t, f, tuck, flare) => g + tuck * (t - g) + flare * (f - g);
const mirror = (p, s) => [p[0] * s, p[1], p[2]];

// ---------------------------------------------------------------- textures

const hasCanvas = () => typeof document !== 'undefined' && typeof document.createElement === 'function';

function canvasTexture(w, h, draw, repeat = [1, 1]) {
  if (!hasCanvas()) return null;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext && cv.getContext('2d');
  if (!g) return null;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

const grey = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;

// Soft fur: short strokes running along the body (canvas y), mostly light so
// the vertex colours carry the palette.
function furTexture(seed, repeat) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = mulberry(seed);
    g.fillStyle = grey(236);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = grey(200 + r() * 55, 0.25);
      g.beginPath();
      g.ellipse(r() * w, r() * h, 10 + r() * 30, 14 + r() * 40, 0, 0, TAU);
      g.fill();
    }
    g.lineCap = 'round';
    for (let i = 0; i < 3200; i++) {
      const x = r() * w;
      const y = r() * h;
      const len = 3 + r() * 6;
      const v = 175 + r() * 80;
      g.strokeStyle = grey(v, 0.55);
      g.lineWidth = 0.7 + r() * 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 2, y + len);
      g.stroke();
      // wrap so the tile is seamless
      if (y + len > h) {
        g.beginPath();
        g.moveTo(x, y - h);
        g.lineTo(x, y - h + len);
        g.stroke();
      }
    }
  }, repeat);
}

// Small overlapping scales (rows of arcs), grey with a light centre.
function scaleTexture(seed, repeat, { cols = 16, rows = 24, line = 120, fill = 236, mottle = 0.18 } = {}) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = mulberry(seed);
    g.fillStyle = grey(fill);
    g.fillRect(0, 0, w, h);
    const cw = w / cols;
    const rh = h / rows;
    for (let j = -1; j <= rows; j++) {
      for (let i = -1; i <= cols; i++) {
        const x = (i + (j % 2 ? 0.5 : 0)) * cw;
        const y = j * rh;
        const grd = g.createRadialGradient(x, y + rh * 0.2, 1, x, y, cw * 0.8);
        const v = fill - r() * 30;
        grd.addColorStop(0, grey(v + 15));
        grd.addColorStop(0.75, grey(v));
        grd.addColorStop(1, grey(line));
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(x, y, cw * 0.62, rh * 0.95, 0, 0, TAU);
        g.fill();
      }
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = grey(120 + r() * 60, mottle * r());
      g.beginPath();
      g.arc(r() * w, r() * h, 4 + r() * 14, 0, TAU);
      g.fill();
    }
  }, repeat);
}

// Smooth amphibian skin: soft blotches and fine pale dots, no scales.
function skinTexture(seed, repeat) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = mulberry(seed);
    g.fillStyle = grey(238);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 6 + r() * 26;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const v = r() < 0.5 ? 205 : 255;
      grd.addColorStop(0, grey(v, 0.35));
      grd.addColorStop(1, grey(v, 0));
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 500; i++) {
      g.fillStyle = grey(r() < 0.7 ? 255 : 190, 0.5);
      g.beginPath();
      g.arc(r() * w, r() * h, 0.6 + r() * 1.3, 0, TAU);
      g.fill();
    }
  }, repeat);
}

// A feather vane: rachis along the length (canvas y), angled barbs, darker
// edge and a slight sheen band. u across the blade, v along it.
function featherTexture(seed) {
  return canvasTexture(64, 256, (g, w, h) => {
    const r = mulberry(seed);
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, grey(150));
    grd.addColorStop(0.18, grey(225));
    grd.addColorStop(0.5, grey(250));
    grd.addColorStop(0.82, grey(225));
    grd.addColorStop(1, grey(150));
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.lineWidth = 1;
    for (let y = -40; y < h + 40; y += 3) {
      const v = 170 + r() * 60;
      g.strokeStyle = grey(v, 0.6);
      g.beginPath();
      g.moveTo(w / 2, y);
      g.lineTo(0, y + 18);
      g.moveTo(w / 2, y);
      g.lineTo(w, y + 18);
      g.stroke();
    }
    // occasional split in the vane
    for (let i = 0; i < 4; i++) {
      const y = r() * h;
      const side = r() < 0.5 ? 0 : 1;
      g.strokeStyle = grey(90, 0.7);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(w / 2 + (side ? 4 : -4), y);
      g.lineTo(side ? w : 0, y + 16);
      g.stroke();
    }
    g.fillStyle = grey(255);
    g.fillRect(w / 2 - 1.5, 0, 3, h);
  });
}

// Overlapping small contour feathers for a feathered body.
function plumageTexture(seed, repeat) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = mulberry(seed);
    g.fillStyle = grey(210);
    g.fillRect(0, 0, w, h);
    const cols = 12;
    const rows = 14;
    const cw = w / cols;
    const rh = h / rows;
    for (let j = rows; j >= -1; j--) {
      for (let i = -1; i <= cols; i++) {
        const x = (i + (j % 2 ? 0.5 : 0) + (r() - 0.5) * 0.2) * cw;
        const y = j * rh;
        const grd = g.createLinearGradient(x, y - rh, x, y + rh * 0.6);
        const v = 225 + r() * 30;
        grd.addColorStop(0, grey(v - 20));
        grd.addColorStop(0.7, grey(v));
        grd.addColorStop(1, grey(185));
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(x, y, cw * 0.6, rh * 1.0, 0, 0, Math.PI);
        g.lineTo(x - cw * 0.6, y - rh);
        g.fill();
        g.strokeStyle = grey(245, 0.35);
        g.beginPath();
        g.moveTo(x, y - rh * 0.6);
        g.lineTo(x, y + rh * 0.8);
        g.stroke();
      }
    }
  }, repeat);
}

// Fin or wing membrane: `rays` lines running along u (canvas x), at constant v.
function rayTexture(seed, rays, { base = 245, ray = 120, segments = true, veins = 0 } = {}) {
  return canvasTexture(256, 256, (g, w, h) => {
    const r = mulberry(seed);
    g.fillStyle = grey(base);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = grey(base - 25 - r() * 30, 0.25);
      g.fillRect(r() * w, r() * h, 2 + r() * 5, 1 + r() * 3);
    }
    for (let v = 0; v < veins; v++) {
      let x = 0;
      let y = r() * h;
      g.strokeStyle = grey(ray + 40, 0.35);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      while (x < w) {
        x += 10 + r() * 14;
        y += (r() - 0.5) * 16;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let k = 0; k <= rays; k++) {
      const y = h - (k / rays) * h;
      const grd = g.createLinearGradient(0, y - 5, 0, y + 5);
      grd.addColorStop(0, grey(base, 0));
      grd.addColorStop(0.5, grey(ray, 0.95));
      grd.addColorStop(1, grey(base, 0));
      g.fillStyle = grd;
      g.fillRect(0, y - 5, w, 10);
      if (segments) {
        g.fillStyle = grey(base, 0.7);
        for (let x = 30; x < w; x += 18 + r() * 8) g.fillRect(x, y - 2, 1.5, 4);
      }
    }
  });
}

// ---------------------------------------------------------------- geometry builders

// Lofted body: a spine path(t) -> [x,y,z] for t in 0..1 (0 = tail end, 1 = nose),
// radius(t) -> [rx, ry] (half width, half height), optional section(angle, t)
// -> [sx, sy] multipliers, and color(out, t, angle, p) for vertex colours.
// Angle 0 points to the creature's left (+X), PI/2 up. Rings are denser at the
// ends so tips round off smoothly; each end closes on a single pole vertex.
function loft({ rings = 40, radial = 16, path, radius, section, color }) {
  const ts = [];
  for (let i = 0; i <= rings; i++) ts.push(0.5 - 0.5 * Math.cos((Math.PI * i) / rings));
  const vcount = 2 + (rings - 1) * (radial + 1);
  const pos = new Float32Array(vcount * 3);
  const uvs = new Float32Array(vcount * 2);
  const cols = new Float32Array(vcount * 3);
  const ringOf = new Uint16Array(vcount);
  const centers = new Float32Array((rings + 1) * 3);
  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  const S = new THREE.Vector3();
  const U = new THREE.Vector3();
  const Q = new THREE.Vector3();
  const c = new THREE.Color(1, 1, 1);
  const at = (t, out) => {
    const p = path(clamp(t, 0, 1));
    return out.set(p[0], p[1], p[2]);
  };
  let vi = 0;
  const put = (x, y, z, u, v, ring, t, a) => {
    pos[vi * 3] = x;
    pos[vi * 3 + 1] = y;
    pos[vi * 3 + 2] = z;
    uvs[vi * 2] = u;
    uvs[vi * 2 + 1] = v;
    ringOf[vi] = ring;
    c.setRGB(1, 1, 1);
    if (color) color(c, t, a, Q.set(x, y, z));
    cols[vi * 3] = c.r;
    cols[vi * 3 + 1] = c.g;
    cols[vi * 3 + 2] = c.b;
    vi++;
  };
  for (let i = 0; i <= rings; i++) {
    const t = ts[i];
    at(t, P);
    centers[i * 3] = P.x;
    centers[i * 3 + 1] = P.y;
    centers[i * 3 + 2] = P.z;
    if (i === 0 || i === rings) {
      put(P.x, P.y, P.z, 0.5, t, i, t, Math.PI / 2);
      if (i === 0) continue;
      break;
    }
    at(t + 1e-3, T);
    at(t - 1e-3, S);
    T.sub(S).normalize();
    S.crossVectors(UP, T);
    if (S.lengthSq() < 1e-8) S.set(1, 0, 0);
    S.normalize();
    U.crossVectors(T, S).normalize();
    const [rx, ry] = radius(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU;
      let sx = 1;
      let sy = 1;
      if (section) [sx, sy] = section(a, t);
      const cx = Math.cos(a) * rx * sx;
      const cy = Math.sin(a) * ry * sy;
      put(P.x + S.x * cx + U.x * cy, P.y + S.y * cx + U.y * cy, P.z + S.z * cx + U.z * cy,
        j / radial, t, i, t, a);
    }
  }
  const idx = [];
  const ring = (i) => 1 + (i - 1) * (radial + 1);
  const last = vcount - 1;
  for (let j = 0; j < radial; j++) idx.push(0, ring(1) + j + 1, ring(1) + j);
  for (let i = 1; i < rings - 1; i++) {
    const a0 = ring(i);
    const b0 = ring(i + 1);
    for (let j = 0; j < radial; j++) {
      const a = a0 + j;
      const b = a0 + j + 1;
      const cc = b0 + j + 1;
      const d = b0 + j;
      idx.push(a, b, cc, a, cc, d);
    }
  }
  const lr = ring(rings - 1);
  for (let j = 0; j < radial; j++) idx.push(lr + j, lr + j + 1, last);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // weld the normals along the UV seam
  const nor = geo.attributes.normal.array;
  for (let i = 1; i < rings; i++) {
    const a = ring(i) * 3;
    const b = (ring(i) + radial) * 3;
    for (let k = 0; k < 3; k++) {
      const m = (nor[a + k] + nor[b + k]) * 0.5;
      nor[a + k] = m;
      nor[b + k] = m;
    }
  }
  geo.userData.loft = { ringOf, centers, ts, rings: rings + 1 };
  return geo;
}

// Per-ring rigid bending of a lofted geometry, written in place each frame.
// fn(ringIndex, t, z, out) fills out.{x, y, yaw, pitch, sx, sy}: offsets added
// to the ring centre, a rotation (yaw about Y, then pitch about X) and a
// cross-section scale.
function makeBender(geo) {
  const { ringOf, centers, ts, rings } = geo.userData.loft;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  pos.setUsage(THREE.DynamicDrawUsage);
  nor.setUsage(THREE.DynamicDrawUsage);
  const bp = pos.array.slice();
  const bn = nor.array.slice();
  const rd = new Float32Array(rings * 13);
  const out = { x: 0, y: 0, yaw: 0, pitch: 0, sx: 1, sy: 1 };
  return {
    apply(fn) {
      for (let r = 0; r < rings; r++) {
        out.x = 0; out.y = 0; out.yaw = 0; out.pitch = 0; out.sx = 1; out.sy = 1;
        fn(r, ts[r], centers[r * 3 + 2], out);
        const cy = Math.cos(out.yaw);
        const sy = Math.sin(out.yaw);
        const cp = Math.cos(out.pitch);
        const sp = Math.sin(out.pitch);
        const o = r * 13;
        // M = Ry(yaw) * Rx(pitch), row-major
        rd[o] = cy; rd[o + 1] = sy * sp; rd[o + 2] = sy * cp;
        rd[o + 3] = 0; rd[o + 4] = cp; rd[o + 5] = -sp;
        rd[o + 6] = -sy; rd[o + 7] = cy * sp; rd[o + 8] = cy * cp;
        rd[o + 9] = out.x; rd[o + 10] = out.y; rd[o + 11] = out.sx; rd[o + 12] = out.sy;
      }
      const p = pos.array;
      const n = nor.array;
      const count = ringOf.length;
      for (let v = 0; v < count; v++) {
        const r = ringOf[v];
        const o = r * 13;
        const k = v * 3;
        const cx = centers[r * 3];
        const cyy = centers[r * 3 + 1];
        const cz = centers[r * 3 + 2];
        const dx = (bp[k] - cx) * rd[o + 11];
        const dy = (bp[k + 1] - cyy) * rd[o + 12];
        const dz = bp[k + 2] - cz;
        p[k] = rd[o] * dx + rd[o + 1] * dy + rd[o + 2] * dz + cx + rd[o + 9];
        p[k + 1] = rd[o + 3] * dx + rd[o + 4] * dy + rd[o + 5] * dz + cyy + rd[o + 10];
        p[k + 2] = rd[o + 6] * dx + rd[o + 7] * dy + rd[o + 8] * dz + cz;
        const nx = bn[k] / rd[o + 11];
        const ny = bn[k + 1] / rd[o + 12];
        const nz = bn[k + 2];
        let mx = rd[o] * nx + rd[o + 1] * ny + rd[o + 2] * nz;
        let my = rd[o + 3] * nx + rd[o + 4] * ny + rd[o + 5] * nz;
        let mz = rd[o + 6] * nx + rd[o + 7] * ny + rd[o + 8] * nz;
        const l = 1 / (Math.hypot(mx, my, mz) || 1);
        n[k] = mx * l;
        n[k + 1] = my * l;
        n[k + 2] = mz * l;
      }
      pos.needsUpdate = true;
      nor.needsUpdate = true;
    },
  };
}

// A set of animated grid patches sharing one geometry (one draw call). Each
// patch is (nu+1) x (nv+1) vertices; with layers = 2 a second copy sits just
// below the first so the top and underside can have different colours.
class MembraneSet {
  constructor() {
    this.patches = [];
    this.count = 0;
    this.geometry = null;
  }

  patch(nu, nv, { layers = 1, thickness = 0.012, color } = {}) {
    const p = { nu, nv, layers, thickness, color, start: this.count, stride: (nu + 1) * (nv + 1) };
    this.count += p.stride * layers;
    this.patches.push(p);
    return p;
  }

  build() {
    const n = this.count;
    const pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const cl = new Float32Array(n * 3);
    const idx = [];
    const c = new THREE.Color();
    for (const p of this.patches) {
      for (let l = 0; l < p.layers; l++) {
        const base = p.start + l * p.stride;
        for (let j = 0; j <= p.nv; j++) {
          for (let i = 0; i <= p.nu; i++) {
            const k = base + j * (p.nu + 1) + i;
            const u = i / p.nu;
            const v = j / p.nv;
            uv[k * 2] = u;
            uv[k * 2 + 1] = v;
            c.setRGB(1, 1, 1);
            if (p.color) p.color(c, u, v, l);
            cl[k * 3] = c.r;
            cl[k * 3 + 1] = c.g;
            cl[k * 3 + 2] = c.b;
            if (i < p.nu && j < p.nv) {
              const a = k;
              const b = k + 1;
              const d = k + p.nu + 1;
              const e = d + 1;
              if (l === 0) idx.push(a, b, e, a, e, d);
              else idx.push(a, e, b, a, d, e);
            }
          }
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    this.geometry = g;
    this.pos = pos;
    return g;
  }

  set(p, i, j, x, y, z) {
    const k = (p.start + j * (p.nu + 1) + i) * 3;
    this.pos[k] = x;
    this.pos[k + 1] = y;
    this.pos[k + 2] = z;
  }

  commit() {
    const a = this.pos;
    for (const p of this.patches) {
      if (p.layers < 2) continue;
      const s = p.start * 3;
      const d = (p.start + p.stride) * 3;
      for (let k = 0; k < p.stride * 3; k += 3) {
        a[d + k] = a[s + k];
        a[d + k + 1] = a[s + k + 1] - p.thickness;
        a[d + k + 2] = a[s + k + 2];
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

// Many small rigid parts (feathers, bones, toes, eyes) merged into one
// geometry; each part has a matrix and commit() rewrites moved parts.
class Batch {
  constructor() {
    this.parts = [];
    this.vcount = 0;
    this.geometry = null;
  }

  // color: THREE.Color or fn(out, x, y, z, nx, ny, nz, u, v) in the part's own space
  add(geo, color, matrix) {
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const n = geo.attributes.position.count;
    const pos = geo.attributes.position.array.slice();
    const nor = geo.attributes.normal.array.slice();
    const uv = geo.attributes.uv ? geo.attributes.uv.array.slice() : new Float32Array(n * 2);
    const cl = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      if (typeof color === 'function') {
        c.setRGB(1, 1, 1);
        color(c, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2], uv[i * 2], uv[i * 2 + 1]);
      } else if (color) c.copy(color);
      else c.setRGB(1, 1, 1);
      cl[i * 3] = c.r;
      cl[i * 3 + 1] = c.g;
      cl[i * 3 + 2] = c.b;
    }
    let index;
    if (geo.index) index = Array.from(geo.index.array);
    else index = Array.from({ length: n }, (_, i) => i);
    geo.dispose();
    const part = { start: this.vcount, n, pos, nor, uv, cl, index, matrix: new THREE.Matrix4(), dirty: true };
    if (matrix) part.matrix.copy(matrix);
    this.parts.push(part);
    this.vcount += n;
    return this.parts.length - 1;
  }

  build() {
    const n = this.vcount;
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const cl = new Float32Array(n * 3);
    const idx = [];
    for (const p of this.parts) {
      uv.set(p.uv, p.start * 2);
      cl.set(p.cl, p.start * 3);
      for (const i of p.index) idx.push(i + p.start);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    g.setIndex(idx);
    this.geometry = g;
    this.commit();
    return g;
  }

  set(i, m) {
    this.parts[i].matrix.copy(m);
    this.parts[i].dirty = true;
  }

  commit() {
    const P = this.geometry.attributes.position;
    const N = this.geometry.attributes.normal;
    const pa = P.array;
    const na = N.array;
    let any = false;
    for (const p of this.parts) {
      if (!p.dirty) continue;
      p.dirty = false;
      any = true;
      const e = p.matrix.elements;
      _n3.getNormalMatrix(p.matrix);
      const f = _n3.elements;
      for (let i = 0; i < p.n; i++) {
        const k = i * 3;
        const o = (p.start + i) * 3;
        const x = p.pos[k];
        const y = p.pos[k + 1];
        const z = p.pos[k + 2];
        pa[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
        pa[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        pa[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        const nx = p.nor[k];
        const ny = p.nor[k + 1];
        const nz = p.nor[k + 2];
        let a = f[0] * nx + f[3] * ny + f[6] * nz;
        let b = f[1] * nx + f[4] * ny + f[7] * nz;
        let c = f[2] * nx + f[5] * ny + f[8] * nz;
        const l = 1 / (Math.hypot(a, b, c) || 1);
        na[o] = a * l;
        na[o + 1] = b * l;
        na[o + 2] = c * l;
      }
    }
    if (any) {
      P.needsUpdate = true;
      N.needsUpdate = true;
    }
  }
}

// Rounded tube along +Z from 0 to `len`, radius r0 at the root, r1 at the tip.
function tube(len, r0, r1, { radial = 8, rings = 8, flat = 1 } = {}) {
  const rad = curve([[0, r0 * 0.35], [0.08, r0 * 0.9], [0.2, r0], [0.8, r1], [0.93, r1 * 0.85], [1, r1 * 0.3]]);
  return loft({
    rings,
    radial,
    path: (t) => [0, 0, lerp(-r0 * 0.6, len + r1 * 0.6, t)],
    radius: (t) => {
      const r = rad(t);
      return [r, r * flat];
    },
  });
}

// Feather blade along +Z: length, width, vane asymmetry (-1..1), droop, and
// a raised rachis so it reads as a shallow V. uv.x across, uv.y along.
function featherBlade(len, width, { asym = 0, droop = 0.04, segs = 6, root = 0.22 } = {}) {
  const rows = segs + 1;
  const pos = new Float32Array(rows * 3 * 3);
  const uv = new Float32Array(rows * 3 * 2);
  for (let r = 0; r < rows; r++) {
    const s = r / segs;
    let w;
    if (s < 0.5) w = lerp(root, 1, smooth(0, 0.5, s));
    else w = Math.pow(Math.cos(((s - 0.5) / 0.5) * Math.PI * 0.5), 0.65);
    w = Math.max(w, 0.02) * width * 0.5;
    const z = s * len;
    const y0 = -droop * len * s * s;
    const xs = [w * (1 - asym), 0, -w * (1 + asym)];
    for (let c = 0; c < 3; c++) {
      const k = (r * 3 + c) * 3;
      pos[k] = xs[c];
      pos[k + 1] = y0 + (c === 1 ? width * 0.09 : 0);
      pos[k + 2] = z;
      uv[(r * 3 + c) * 2] = c / 2;
      uv[(r * 3 + c) * 2 + 1] = s;
    }
  }
  const idx = [];
  for (let r = 0; r < segs; r++) {
    for (let c = 0; c < 2; c++) {
      const a = r * 3 + c;
      const b = a + 1;
      const d = a + 3;
      const e = d + 1;
      idx.push(a, d, e, a, e, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function ellipsoid(rx, ry, rz, ws = 12, hs = 8) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(rx, ry, rz);
  return g;
}

// Matrix placing a +Z-aligned part at `a` pointing to `b`, z-scaled by |b-a| / restLen.
function boneMatrix(out, a, b, restLen) {
  _v1.subVectors(b, a);
  const len = _v1.length() || 1e-6;
  _v1.multiplyScalar(1 / len);
  _q.setFromUnitVectors(Z_AXIS, _v1);
  _s.set(1, 1, len / restLen);
  return out.compose(a, _q, _s);
}

// Matrix placing a +Z-aligned part at `p`, heading yaw (about Y, 0 = +Z),
// then pitch (positive raises the tip), then roll about its own axis.
function partMatrix(out, p, yaw, pitch = 0, roll = 0, scale = 1) {
  _e.set(-pitch, yaw, roll, 'YXZ');
  _q.setFromEuler(_e);
  _s.set(scale, scale, scale);
  return out.compose(p, _q, _s);
}

// ---------------------------------------------------------------- shared creature kit

function makeEyes(kit, specs, { glossy = 0.12 } = {}) {
  const eyes = new Batch();
  const glints = new Batch();
  const center = new THREE.Vector3();
  for (const s of specs) center.add(new THREE.Vector3(...s.p));
  center.multiplyScalar(1 / specs.length);
  for (const s of specs) {
    const D = new THREE.Vector3(...s.dir).normalize();
    const Up = new THREE.Vector3(0, 1, 0).addScaledVector(D, -D.y).normalize();
    const Sd = new THREE.Vector3().crossVectors(D, Up);
    const iris = col(s.iris || '#2a1a10');
    const pupil = col(s.pupil || '#050505');
    const sclera = col(s.sclera || '#0d0b0a');
    const ax = s.pupilShape === 'h' ? 1 : s.pupilShape === 'v' ? 0.4 : 1;
    const ay = s.pupilShape === 'h' ? 0.5 : 1;
    const irisR = s.irisR ?? 0.75;
    const pupilR = s.pupilR ?? 0.42;
    const g = new THREE.SphereGeometry(s.r, 18, 14);
    const m = new THREE.Matrix4().makeTranslation(s.p[0] - center.x, s.p[1] - center.y, s.p[2] - center.z);
    eyes.add(g, (out, x, y, z, nx, ny, nz) => {
      _v1.set(nx, ny, nz);
      const d = _v1.dot(D);
      const ls = _v1.dot(Sd);
      const lu = _v1.dot(Up);
      const e = Math.hypot(ls / ax, lu / ay);
      const er = Math.hypot(ls, lu);
      if (d > 0 && e < pupilR) out.copy(pupil);
      else if (d > 0 && er < irisR) {
        mixc(out, iris, pupil, smooth(irisR * 0.6, irisR, er) * 0.6);
        out.lerp(_c.copy(iris).multiplyScalar(1.4), smooth(0.2, 0.0, lu) * 0.0);
      } else out.copy(sclera);
    }, m);
    const gp = new THREE.Vector3().copy(D).multiplyScalar(0.55).addScaledVector(Up, 0.7).addScaledVector(Sd, 0.15)
      .normalize().multiplyScalar(s.r * 0.86);
    const gm = new THREE.Matrix4().makeTranslation(s.p[0] - center.x + gp.x, s.p[1] - center.y + gp.y, s.p[2] - center.z + gp.z);
    glints.add(new THREE.SphereGeometry(s.r * 0.2, 8, 6), col('#ffffff'), gm);
    const gp2 = new THREE.Vector3().copy(D).multiplyScalar(0.8).addScaledVector(Up, -0.35).addScaledVector(Sd, -0.3)
      .normalize().multiplyScalar(s.r * 0.95);
    const gm2 = new THREE.Matrix4().makeTranslation(s.p[0] - center.x + gp2.x, s.p[1] - center.y + gp2.y, s.p[2] - center.z + gp2.z);
    glints.add(new THREE.SphereGeometry(s.r * 0.09, 6, 4), col('#ffffff'), gm2);
  }
  const group = new THREE.Group();
  group.position.copy(center);
  const eyeMat = kit.mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: glossy, metalness: 0 }));
  const glintMat = kit.mat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  group.add(kit.mesh(eyes.build(), eyeMat), kit.mesh(glints.build(), glintMat));
  return group;
}

function createKit(seed) {
  const geometries = [];
  const materials = [];
  const textures = [];
  const kit = {
    rand: mulberry(seed),
    tex(t) {
      if (t) textures.push(t);
      return t;
    },
    mat(m) {
      materials.push(m);
      return m;
    },
    std(opts) {
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, ...opts });
      if (!m.map) m.map = null;
      materials.push(m);
      return m;
    },
    mesh(geo, mat, { dynamic = false } = {}) {
      geometries.push(geo);
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      if (dynamic) m.frustumCulled = false;
      return m;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      geometries.length = 0;
      materials.length = 0;
      textures.length = 0;
    },
  };
  return kit;
}

function marker(name) {
  const o = new THREE.Object3D();
  o.name = name;
  return o;
}

// ---------------------------------------------------------------- palettes

const PALETTES = {
  squirrel: [
    { top: '#94755a', dark: '#5d4636', belly: '#f4ebdc', rim: '#3d2f27', nose: '#e7a19c', paw: '#ead3c2', eye: '#120c0a', iris: '#2a1a12', ui: ['#94755a', '#f4ebdc', '#e7a19c'] },
    { top: '#e6ded2', dark: '#c4b5a3', belly: '#ffffff', rim: '#a8988a', nose: '#f2aebb', paw: '#f6e3e3', eye: '#3a0a12', iris: '#a3243a', ui: ['#e6ded2', '#ffffff', '#f2aebb'] },
    { top: '#56556c', dark: '#34334a', belly: '#dcd6ea', rim: '#1e1d2b', nose: '#c58a99', paw: '#cbbfd6', eye: '#0a0a10', iris: '#25223a', ui: ['#56556c', '#dcd6ea', '#c58a99'] },
    { top: '#e37a3c', dark: '#a84a22', belly: '#fff1d2', rim: '#5b2a6d', nose: '#ff9fb2', paw: '#ffe0c8', eye: '#190d1c', iris: '#3a1a40', ui: ['#e37a3c', '#fff1d2', '#5b2a6d'] },
  ],
  microraptor: [
    { base: '#151b30', sheen: '#2c5aa8', teal: '#1f9a9a', belly: '#262c42', tip: '#090c16', iris: '#e3a62a', claw: '#d9cfbf', ui: ['#151b30', '#2c5aa8', '#1f9a9a'] },
    { base: '#d5dbe6', sheen: '#9bb2da', teal: '#a7dcd6', belly: '#eef1f6', tip: '#6f7a8e', iris: '#d33a3a', claw: '#7a6e64', ui: ['#d5dbe6', '#9bb2da', '#d33a3a'] },
    { base: '#1e1514', sheen: '#9a321c', teal: '#e2802c', belly: '#2e2221', tip: '#0a0606', iris: '#f5d443', claw: '#e8dcc6', ui: ['#1e1514', '#9a321c', '#e2802c'] },
    { base: '#0f3a2f', sheen: '#2fb07c', teal: '#a6e36b', belly: '#1d4a3d', tip: '#072019', iris: '#ffb347', claw: '#e6e0c8', ui: ['#0f3a2f', '#2fb07c', '#a6e36b'] },
  ],
  flyingfish: [
    { back: '#1b4f9e', flank: '#86b8e4', belly: '#f0f4f8', fin: '#86acd8', ray: '#2a4d80', iris: '#c9d5e2', ui: ['#1b4f9e', '#f0f4f8', '#86acd8'] },
    { back: '#93acc2', flank: '#dfe8f1', belly: '#ffffff', fin: '#eaf0f7', ray: '#9eb0c6', iris: '#e8c9d2', ui: ['#93acc2', '#ffffff', '#eaf0f7'] },
    { back: '#121c3e', flank: '#40569a', belly: '#bcc6e0', fin: '#34437a', ray: '#0d1433', iris: '#8fa3d9', ui: ['#121c3e', '#40569a', '#bcc6e0'] },
    { back: '#0d8a8c', flank: '#5ee0c1', belly: '#f8f3d2', fin: '#ffb02e', ray: '#c2410c', iris: '#ffe58a', ui: ['#0d8a8c', '#5ee0c1', '#ffb02e'] },
  ],
  draco: [
    { body: '#8d7f5f', dark: '#4d4433', belly: '#dbd2b8', wing: '#f2891c', band: '#2a1608', under: '#f7c45c', dewlap: '#ffd51f', iris: '#b8862a', ui: ['#f2891c', '#8d7f5f', '#ffd51f'] },
    { body: '#d1c3a2', dark: '#9c8b69', belly: '#f0e9d8', wing: '#f6d39a', band: '#a7652e', under: '#fbedc9', dewlap: '#fff0a8', iris: '#c45a3a', ui: ['#f6d39a', '#d1c3a2', '#a7652e'] },
    { body: '#4e4c5c', dark: '#2a2833', belly: '#9c99aa', wing: '#c8344f', band: '#1b0d20', under: '#e57b8e', dewlap: '#ffb13b', iris: '#e0a020', ui: ['#c8344f', '#4e4c5c', '#ffb13b'] },
    { body: '#2f7e6e', dark: '#1a4a40', belly: '#d0eadb', wing: '#2cb4e8', band: '#0d2a5c', under: '#9ee4f6', dewlap: '#ff6f91', iris: '#f2c14e', ui: ['#2cb4e8', '#2f7e6e', '#ff6f91'] },
  ],
  frog: [
    { top: '#3cae38', dark: '#23772a', side: '#f3d23a', belly: '#f7f0cc', web: '#141414', streak: '#f2c230', toe: '#ecc23c', iris: '#8a6220', ui: ['#3cae38', '#f3d23a', '#161616'] },
    { top: '#f1efdc', dark: '#d9d3b8', side: '#fbe5a2', belly: '#fffcef', web: '#e9b2a4', streak: '#fff1d6', toe: '#fbd0c2', iris: '#c0303c', ui: ['#f1efdc', '#fbe5a2', '#e9b2a4'] },
    { top: '#2b4d3e', dark: '#173027', side: '#8064b5', belly: '#d0c7e6', web: '#0e0e1b', streak: '#7fd2ff', toe: '#9e84dc', iris: '#c8a24a', ui: ['#2b4d3e', '#8064b5', '#7fd2ff'] },
    { top: '#22c4b4', dark: '#118478', side: '#ff9a2e', belly: '#fff4d6', web: '#3b0f5c', streak: '#ffde59', toe: '#ff9a2e', iris: '#3b0f5c', ui: ['#22c4b4', '#ff9a2e', '#3b0f5c'] },
  ],
  snake: [
    { base: '#0c110c', scale: '#5cb83a', spot: '#ff4a1c', spot2: '#ffb31c', belly: '#bcd94c', iris: '#c9b23a', tongue: '#d9264a', ui: ['#5cb83a', '#0c110c', '#ff4a1c'] },
    { base: '#bdb5a3', scale: '#f6f1e3', spot: '#ff8466', spot2: '#ffd08a', belly: '#fffaf0', iris: '#c0303c', tongue: '#e8708a', ui: ['#f6f1e3', '#bdb5a3', '#ff8466'] },
    { base: '#06070c', scale: '#2f4374', spot: '#c62a6c', spot2: '#ff7ab0', belly: '#5e719f', iris: '#e0e0ff', tongue: '#ff4a8a', ui: ['#2f4374', '#06070c', '#c62a6c'] },
    { base: '#1c1406', scale: '#e5b43c', spot: '#2fd3c8', spot2: '#8cf0e6', belly: '#f6dd8a', iris: '#2fd3c8', tongue: '#d9264a', ui: ['#e5b43c', '#1c1406', '#2fd3c8'] },
  ],
};

function paletteColors(raw) {
  const out = {};
  for (const k of Object.keys(raw)) if (typeof raw[k] === 'string') out[k] = col(raw[k]);
  return out;
}

// ---------------------------------------------------------------- squirrel

function buildSquirrel(kit, raw, root) {
  const P = paletteColors(raw);
  const fur = kit.tex(furTexture(11, [3, 3]));
  const tailFur = kit.tex(furTexture(13, [2, 5]));
  const tailMat = kit.std({ map: tailFur, roughness: 0.95 });
  const bodyMat = kit.std({ map: fur, roughness: 0.92 });
  const membMat = kit.std({ map: kit.tex(furTexture(12, [4, 4])), roughness: 0.95, side: THREE.DoubleSide });
  const eyeL = [0.118, 0.125, 0.455];

  // torso + head in one smooth loft
  const zt = (t) => lerp(-0.58, 0.64, t);
  const rx = curve([[0, 0.05], [0.07, 0.16], [0.3, 0.235], [0.5, 0.24], [0.64, 0.2], [0.73, 0.15], [0.8, 0.158], [0.88, 0.14], [0.95, 0.085], [1, 0.03]]);
  const ry = curve([[0, 0.04], [0.07, 0.1], [0.3, 0.13], [0.5, 0.135], [0.64, 0.13], [0.73, 0.115], [0.8, 0.13], [0.88, 0.115], [0.95, 0.07], [1, 0.025]]);
  const yc = curve([[0, 0.0], [0.4, 0.02], [0.68, 0.03], [0.82, 0.06], [1, 0.035]]);
  const body = loft({
    rings: 34,
    radial: 18,
    path: (t) => [0, yc(t), zt(t)],
    radius: (t) => [rx(t), ry(t)],
    section: (a) => [1, Math.sin(a) < 0 ? 0.75 : 1],
    color: (out, t, a, p) => {
      const up = Math.sin(a);
      mixc(out, P.belly, P.top, smooth(-0.45, 0.2, up));
      out.lerp(P.dark, smooth(0.5, 1, up) * 0.35 * smooth(0.2, 0.5, t));
      // dark ring around each eye and a pale cheek
      const de = Math.min(Math.hypot(p.x - eyeL[0], p.y - eyeL[1], p.z - eyeL[2]), Math.hypot(p.x + eyeL[0], p.y - eyeL[1], p.z - eyeL[2]));
      out.lerp(P.rim, smooth(0.1, 0.06, de) * 0.8);
      if (t > 0.8 && up < 0.1) out.lerp(P.belly, 0.5);
      out.lerp(P.nose, smooth(0.975, 1, t));
    },
  });
  const bodyMesh = kit.mesh(body, bodyMat);
  root.add(bodyMesh);

  // flat, fluffy tail on its own pivot
  const tailLen = 0.86;
  const trx = curve([[0, 0.03], [0.1, 0.11], [0.4, 0.155], [0.75, 0.13], [0.95, 0.065], [1, 0.05]]);
  const tail = loft({
    rings: 22,
    radial: 14,
    path: (t) => [0, 0, lerp(-tailLen, 0.05, t)],
    radius: (t) => [trx(t), 0.04 + 0.012 * Math.sin(t * Math.PI)],
    section: (a) => [1 + 0.05 * Math.cos(a * 8), 1 - 0.25 * Math.cos(a) ** 8],
    color: (out, t, a) => {
      mixc(out, P.belly, P.top, smooth(-0.5, 0.3, Math.sin(a)));
      out.lerp(P.dark, smooth(0.45, 0.0, t) * 0.75);
    },
  });
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.025, -0.5);
  tailPivot.add(kit.mesh(tail, tailMat));
  root.add(tailPivot);

  // patagium: one patch per side, fur on top and pale underneath
  const ms = new MembraneSet();
  const sides = [1, -1].map((s) => ({
    s,
    patch: ms.patch(9, 12, {
      layers: 2,
      thickness: 0.014,
      color: (out, u, v, layer) => {
        if (layer === 0) {
          mixc(out, P.top, P.dark, 0.15 + 0.2 * v);
          out.lerp(P.rim, smooth(0.62, 0.95, u) * 0.8);
          out.lerp(P.belly, smooth(0.06, 0, Math.min(v, 1 - v)) * 0.0);
        } else {
          mixc(out, P.belly, P.dark, smooth(0.85, 1, u) * 0.45);
        }
      },
    }),
  }));
  const membMesh = kit.mesh(ms.build(), membMat, { dynamic: true });
  root.add(membMesh);

  // limbs, paws, ears and nose (one batch)
  const bt = new Batch();
  const furCol = (out, x, y, z, nx, ny) => mixc(out, P.belly, P.top, smooth(-0.75, -0.2, ny));
  const armLen = 0.62;
  const legLen = 0.62;
  for (const sd of sides) {
    sd.arm = bt.add(tube(armLen, 0.05, 0.032, { flat: 0.75 }), furCol);
    sd.leg = bt.add(tube(legLen, 0.06, 0.036, { flat: 0.75 }), furCol);
    sd.hand = bt.add(ellipsoid(0.03, 0.018, 0.042), P.paw);
    sd.foot = bt.add(ellipsoid(0.034, 0.02, 0.055), P.paw);
    // ear: a rounded cup tilted out and back
    const ear = ellipsoid(0.055, 0.07, 0.022, 12, 8);
    const em = new THREE.Matrix4().compose(
      new THREE.Vector3(sd.s * 0.085, 0.2, 0.395),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, sd.s * 0.35, sd.s * -0.35)),
      new THREE.Vector3(1, 1, 1),
    );
    bt.add(ear, (out, x, y, z, nx, ny, nz) => mixc(out, P.top, P.nose, nz > 0.3 ? 0.6 : 0), em);
  }
  bt.add(ellipsoid(0.032, 0.024, 0.024), P.nose, new THREE.Matrix4().makeTranslation(0, 0.05, 0.635));
  const btMesh = kit.mesh(bt.build(), bodyMat, { dynamic: true });
  root.add(btMesh);

  const eyes = makeEyes(kit, [1, -1].map((s) => ({
    p: [s * eyeL[0], eyeL[1], eyeL[2]], r: 0.052, dir: [s * 0.8, 0.25, 0.55],
    iris: raw.iris, sclera: raw.eye, irisR: 0.82, pupilR: 0.55,
  })));
  root.add(eyes);

  const tips = [marker('wingtipL'), marker('wingtipR')];
  root.add(tips[0], tips[1]);

  const W = new THREE.Vector3();
  const A = new THREE.Vector3();
  const Sh = new THREE.Vector3();
  const Hp = new THREE.Vector3();
  const In = new THREE.Vector3();
  const Out = new THREE.Vector3();
  const Pt = new THREE.Vector3();

  return {
    eyes,
    tips,
    update(a) {
      const { tuck, flare, roll } = a;
      root.rotation.x = -0.3 * flare + 0.06 * tuck;
      bodyMesh.scale.set(1 + a.breath * 0.012, 1 + a.breath * 0.02, 1);
      tailPivot.rotation.x = 0.08 + 0.35 * flare - 0.12 * tuck + a.pitch * 0.25 + Math.sin(a.time * 1.3) * 0.04;
      tailPivot.rotation.y = Math.sin(a.time * 0.9) * 0.08 + a.yaw * 0.3 + a.roll * 0.15;
      tailPivot.rotation.z = -a.roll * 0.2;
      const rip = 0.004 + a.speed * 0.00018;
      const billow = 0.035 + 0.1 * flare - 0.025 * tuck + a.speed * 0.0002;
      for (const sd of sides) {
        const s = sd.s;
        const lift = s * roll * 0.07;
        Sh.set(s * 0.15, 0.035, 0.27);
        Hp.set(s * 0.16, 0.0, -0.35);
        pose3(W, [s * 0.92, 0.06 + lift, 0.42], [s * 0.3, 0.02, 0.32], [s * 0.98, 0.16 + lift, 0.5], tuck, flare);
        pose3(A, [s * 0.86, 0.0 + lift * 0.7, -0.52], [s * 0.26, -0.01, -0.46], [s * 0.92, 0.12 + lift * 0.7, -0.56], tuck, flare);
        const p = sd.patch;
        for (let j = 0; j <= p.nv; j++) {
          const v = j / p.nv;
          In.lerpVectors(Sh, Hp, v);
          Out.lerpVectors(W, A, v);
          Out.x -= s * (0.17 - 0.08 * flare) * Math.sin(Math.PI * v);
          Out.z += 0.04 * Math.sin(Math.PI * v);
          for (let i = 0; i <= p.nu; i++) {
            const u = i / p.nu;
            Pt.lerpVectors(In, Out, u);
            const bulge = Math.sin(Math.PI * Math.min(1, u * 1.05)) * Math.sin(Math.PI * v);
            Pt.y += billow * bulge;
            Pt.y += rip * u * Math.pow(v, 1.3) * Math.sin(a.ripple * 1.0 - v * 9 - u * 3) * (1 + flare);
            Pt.y += tuck * 0.035 * Math.sin(u * Math.PI * 3) * u;
            ms.set(p, i, j, Pt.x, Pt.y, Pt.z);
          }
        }
        bt.set(sd.arm, boneMatrix(_m, Sh, W, armLen));
        bt.set(sd.leg, boneMatrix(_m, Hp, A, legLen));
        _v2.copy(W).sub(Sh).normalize();
        bt.set(sd.hand, partMatrix(_m, W, Math.atan2(_v2.x, _v2.z), 0, 0));
        _v2.copy(A).sub(Hp).normalize();
        bt.set(sd.foot, partMatrix(_m, A, Math.atan2(_v2.x, _v2.z), 0, 0));
        tips[s > 0 ? 0 : 1].position.copy(W);
      }
      ms.commit();
      bt.commit();
    },
  };
}

// ---------------------------------------------------------------- microraptor

function buildMicroraptor(kit, raw, root) {
  const P = paletteColors(raw);
  const plum = kit.tex(plumageTexture(21, [4, 7]));
  const vane = kit.tex(featherTexture(22));
  const irid = {
    roughness: 0.42,
    metalness: 0.15,
    iridescence: 0.5,
    iridescenceIOR: 1.4,
    iridescenceThicknessRange: [260, 420],
  };
  const bodyMat = kit.mat(new THREE.MeshPhysicalMaterial({ vertexColors: true, map: plum, ...irid }));
  const featherMat = kit.mat(new THREE.MeshPhysicalMaterial({ vertexColors: true, map: vane, side: THREE.DoubleSide, ...irid }));

  const z0 = -1.08;
  const z1 = 0.7;
  const zt = (t) => lerp(z0, z1, t);
  const tTailBase = (-0.3 - z0) / (z1 - z0);
  const rx = curve([[0, 0.012], [0.15, 0.028], [0.33, 0.05], [0.43, 0.08], [0.53, 0.125], [0.61, 0.13], [0.69, 0.105], [0.76, 0.06], [0.81, 0.058], [0.865, 0.082], [0.92, 0.068], [0.96, 0.046], [0.988, 0.024], [1, 0.01]]);
  const ry = curve([[0, 0.012], [0.15, 0.026], [0.33, 0.045], [0.43, 0.075], [0.53, 0.115], [0.61, 0.12], [0.69, 0.1], [0.76, 0.06], [0.81, 0.062], [0.865, 0.085], [0.92, 0.062], [0.96, 0.04], [0.988, 0.02], [1, 0.01]]);
  const yc = curve([[0, 0.025], [0.43, 0.0], [0.62, 0.0], [0.72, 0.03], [0.8, 0.1], [0.87, 0.14], [0.95, 0.125], [1, 0.115]]);
  const body = loft({
    rings: 56,
    radial: 16,
    path: (t) => [0, yc(t), zt(t)],
    radius: (t) => [rx(t), ry(t)],
    color: (out, t, a) => {
      const up = Math.sin(a);
      mixc(out, P.belly, P.base, smooth(-0.5, 0.3, up));
      out.lerp(P.sheen, smooth(0.3, 1, up) * 0.35 * Math.sin(t * 9.0) ** 2);
      out.lerp(P.teal, smooth(0.6, 0.8, t) * smooth(0.2, 0.9, Math.abs(Math.cos(a))) * 0.35);
      out.lerp(P.tip, smooth(0.97, 1, t) * 0.6);
    },
  });
  const bender = makeBender(body);
  const bodyMesh = kit.mesh(body, bodyMat, { dynamic: true });
  root.add(bodyMesh);

  // tail curve shared by the body bend and the tail-fan feathers
  const tail = { ax: 0, ay: 0, zb: -0.3 };
  const tailAt = (z, out) => {
    const d = Math.max(0, tail.zb - z);
    out.x = tail.ax * d * d;
    out.y = tail.ay * d * d;
    out.yaw = Math.atan(-2 * tail.ax * d);
    out.pitch = Math.atan(2 * tail.ay * d);
    return out;
  };
  const bendTmp = { x: 0, y: 0, yaw: 0, pitch: 0 };

  const fb = new Batch();
  const featherColor = (tint, tipDark = 0.6, sheen = 0.35) => (out, x, y, z, nx, ny, nz, u, v) => {
    mixc(out, P.base, tint, sheen * (0.6 + 0.4 * Math.sin(v * 3)));
    out.lerp(P.tip, smooth(0.6, 1, v) * tipDark);
    out.lerp(P.teal, smooth(0.35, 0, Math.abs(u - 0.5)) * 0.12);
  };
  const feathers = [];
  const addF = (group, len, width, opts, tint, tipDark) => {
    const i = fb.add(featherBlade(len, width, opts), featherColor(tint, tipDark));
    const f = { i, len, group };
    feathers.push(f);
    return f;
  };
  const wing = [1, -1].map((s) => {
    const w = { s, prim: [], sec: [], tert: [], cov: [], leg: [], legCov: [] };
    for (let k = 0; k < 8; k++) w.prim.push(addF('prim', lerp(0.52, 0.38, k / 7), 0.135, { asym: -0.45 * s, droop: 0.05 }, P.sheen, 0.7));
    for (let k = 0; k < 7; k++) w.sec.push(addF('sec', lerp(0.38, 0.31, k / 6), 0.14, { asym: -0.2 * s }, P.sheen, 0.55));
    for (let k = 0; k < 3; k++) w.tert.push(addF('tert', lerp(0.3, 0.24, k / 2), 0.13, {}, P.sheen, 0.45));
    for (let k = 0; k < 9; k++) w.cov.push(addF('cov', lerp(0.2, 0.16, k / 8), 0.11, { root: 0.5 }, P.teal, 0.2));
    for (let k = 0; k < 6; k++) w.leg.push(addF('leg', lerp(0.36, 0.26, k / 5), 0.13, { asym: -0.3 * s }, P.sheen, 0.6));
    for (let k = 0; k < 4; k++) w.legCov.push(addF('legcov', 0.15, 0.1, { root: 0.5 }, P.teal, 0.2));
    const boneCol = (out, x, y, z, nx, ny) => mixc(out, P.belly, P.sheen, smooth(-0.3, 0.6, ny) * 0.6);
    w.upper = fb.add(tube(0.26, 0.03, 0.022), boneCol);
    w.fore = fb.add(tube(0.26, 0.022, 0.017), boneCol);
    w.hand = fb.add(tube(0.26, 0.017, 0.01), boneCol);
    w.thigh = fb.add(tube(0.18, 0.05, 0.035), boneCol);
    w.shin = fb.add(tube(0.2, 0.03, 0.02), boneCol);
    w.claw = fb.add(new THREE.ConeGeometry(0.012, 0.05, 6).rotateX(Math.PI / 2).translate(0, 0, 0.025), P.claw);
    w.foot = [];
    for (let k = 0; k < 3; k++) w.foot.push(fb.add(new THREE.ConeGeometry(0.012, 0.09, 6).rotateX(Math.PI / 2).translate(0, 0, 0.045), P.claw));
    return w;
  });
  const fan = [];
  for (let k = 0; k < 6; k++) {
    for (const s of [1, -1]) {
      fan.push({ s, k, f: addF('fan', lerp(0.13, 0.32, k / 5), 0.11, { asym: 0.25 * s }, P.sheen, 0.65) });
    }
  }
  const fanTip = addF('fan', 0.34, 0.09, {}, P.sheen, 0.7);
  const crest = [0, 1, 2].map((k) => addF('crest', 0.11 - k * 0.015, 0.05, { droop: -0.3 }, P.teal, 0.3));
  const fbMesh = kit.mesh(fb.build(), featherMat, { dynamic: true });
  root.add(fbMesh);

  const eyes = makeEyes(kit, [1, -1].map((s) => ({
    p: [s * 0.06, 0.168, 0.545], r: 0.029, dir: [s * 0.85, 0.25, 0.45],
    iris: raw.iris, sclera: '#0a0a0a', irisR: 0.8, pupilR: 0.38,
  })));
  root.add(eyes);
  const tips = [marker('wingtipL'), marker('wingtipR')];
  root.add(tips[0], tips[1]);

  const Sh = new THREE.Vector3();
  const E = new THREE.Vector3();
  const Wr = new THREE.Vector3();
  const H = new THREE.Vector3();
  const Hp = new THREE.Vector3();
  const K = new THREE.Vector3();
  const An = new THREE.Vector3();
  const R = new THREE.Vector3();

  return {
    eyes,
    tips,
    update(a) {
      const { tuck, flare } = a;
      root.rotation.x = -0.32 * flare + 0.05 * tuck;
      tail.ax = 0.06 * Math.sin(a.time * 1.2) + a.yaw * 0.25 + a.roll * 0.12;
      tail.ay = 0.04 + 0.35 * flare - 0.05 * tuck + a.pitch * 0.25 + 0.03 * Math.sin(a.time * 0.8);
      bender.apply((r, t, z, o) => {
        if (z < tail.zb) tailAt(z, o);
        const br = smooth(0.45, 0.6, t) * smooth(0.75, 0.65, t);
        o.sx = 1 + a.breath * 0.025 * br;
        o.sy = 1 + a.breath * 0.035 * br;
      });
      const flutter = (0.01 + a.speed * 0.00035) * (1 + flare * 0.8);
      const ph = a.ripple;
      for (const w of wing) {
        const s = w.s;
        const lift = s * a.roll * 0.06;
        Sh.set(s * 0.085, 0.06, 0.2);
        pose3(E, [s * 0.34, 0.07 + lift * 0.5, 0.1], [s * 0.18, 0.05, -0.04], [s * 0.36, 0.11, 0.17], tuck, flare);
        pose3(Wr, [s * 0.54, 0.08 + lift, 0.2], [s * 0.21, 0.08, 0.13], [s * 0.54, 0.15 + lift, 0.3], tuck, flare);
        pose3(H, [s * 0.76, 0.07 + lift * 1.3, 0.18], [s * 0.2, 0.09, -0.08], [s * 0.76, 0.16 + lift, 0.31], tuck, flare);
        fb.set(w.upper, boneMatrix(_m, Sh, E, 0.26));
        fb.set(w.fore, boneMatrix(_m, E, Wr, 0.26));
        fb.set(w.hand, boneMatrix(_m, Wr, H, 0.26));
        _v3.subVectors(H, Wr).normalize();
        R.copy(Wr).addScaledVector(_v3, 0.05);
        fb.set(w.claw, partMatrix(_m, R, Math.atan2(_v3.x, _v3.z) - s * 0.8, 0.2));
        // primaries fan from the hand; angle 0 = straight back, +PI/2 = outward
        for (let k = 0; k < w.prim.length; k++) {
          const f = w.prim[k];
          const q = k / (w.prim.length - 1);
          R.lerpVectors(H, Wr, q * 0.95);
          const ang = pose1(lerp(1.3, 0.55, q), lerp(0.12, 0.06, q), lerp(1.55, 0.6, q), tuck, flare);
          const wob = flutter * Math.sin(ph * 1.7 + k * 0.9) * (1 - q * 0.5);
          R.y += k * 0.004;
          fb.set(f.i, partMatrix(_m, R, Math.PI - s * ang, 0.04 + wob * 4 + flare * 0.06, s * (0.12 + flare * 0.25)));
          if (k === 0) {
            tips[s > 0 ? 0 : 1].position.set(R.x + s * Math.sin(ang) * f.len, R.y, R.z - Math.cos(ang) * f.len);
          }
        }
        for (let k = 0; k < w.sec.length; k++) {
          const q = k / (w.sec.length - 1);
          R.lerpVectors(Wr, E, q);
          R.y += 0.03 + k * 0.004;
          const ang = pose1(lerp(0.4, 0.15, q), 0.05, lerp(0.5, 0.2, q), tuck, flare);
          const wob = flutter * Math.sin(ph * 1.5 + k * 1.1 + 2);
          fb.set(w.sec[k].i, partMatrix(_m, R, Math.PI - s * ang, 0.03 + wob * 3, s * 0.1));
        }
        for (let k = 0; k < w.tert.length; k++) {
          const q = (k + 1) / (w.tert.length + 1);
          R.lerpVectors(E, Sh, q);
          R.y += 0.04;
          const ang = pose1(lerp(0.15, 0.05, q), 0.02, 0.2, tuck, flare);
          fb.set(w.tert[k].i, partMatrix(_m, R, Math.PI - s * ang, 0.02, s * 0.08));
        }
        for (let k = 0; k < w.cov.length; k++) {
          const q = k / (w.cov.length - 1);
          if (q < 0.5) R.lerpVectors(H, Wr, q * 2);
          else R.lerpVectors(Wr, E, (q - 0.5) * 2);
          R.y += 0.035;
          R.z += 0.065;
          const ang = pose1(lerp(0.9, 0.25, q), 0.08, lerp(1.0, 0.3, q), tuck, flare);
          fb.set(w.cov[k].i, partMatrix(_m, R, Math.PI - s * ang, 0.0, s * 0.12));
        }
        // hind wing
        Hp.set(s * 0.08, 0.0, -0.2);
        pose3(K, [s * 0.22, -0.01, -0.28], [s * 0.12, -0.04, -0.26], [s * 0.27, 0.02, -0.22], tuck, flare);
        pose3(An, [s * 0.36, 0.0 + lift * 0.6, -0.44], [s * 0.14, -0.05, -0.44], [s * 0.43, 0.05 + lift * 0.6, -0.36], tuck, flare);
        fb.set(w.thigh, boneMatrix(_m, Hp, K, 0.18));
        fb.set(w.shin, boneMatrix(_m, K, An, 0.2));
        _v3.subVectors(An, K).normalize();
        const fy = Math.atan2(_v3.x, _v3.z);
        for (let k = 0; k < w.foot.length; k++) fb.set(w.foot[k], partMatrix(_m, An, fy + (k - 1) * 0.35, -0.15));
        for (let k = 0; k < w.leg.length; k++) {
          const q = k / (w.leg.length - 1);
          R.lerpVectors(An, K, q * 0.9);
          R.y += 0.01 + k * 0.004;
          const ang = pose1(lerp(0.65, 0.25, q), 0.04, lerp(0.95, 0.4, q), tuck, flare);
          const wob = flutter * Math.sin(ph * 1.3 + k);
          fb.set(w.leg[k].i, partMatrix(_m, R, Math.PI - s * ang, 0.03 + wob * 3, s * 0.1));
        }
        for (let k = 0; k < w.legCov.length; k++) {
          const q = k / (w.legCov.length - 1);
          R.lerpVectors(An, Hp, q * 0.9);
          R.y += 0.05;
          const ang = pose1(lerp(0.6, 0.2, q), 0.04, 0.8, tuck, flare);
          fb.set(w.legCov[k].i, partMatrix(_m, R, Math.PI - s * ang, 0.02, s * 0.1));
        }
      }
      // tail fan: pairs along the last stretch of tail, a diamond of feathers
      const spread = 1 + flare * 0.35 - tuck * 0.6 + a.pitch * 0.15;
      for (const t of fan) {
        const z = lerp(-0.62, -1.02, t.k / 5);
        tailAt(z, bendTmp);
        R.set(bendTmp.x, yc((z - z0) / (z1 - z0)) + bendTmp.y + 0.01, z);
        const ang = lerp(1.25, 0.32, t.k / 5) * spread;
        const wob = flutter * Math.sin(ph * 1.9 + t.k);
        fb.set(t.f.i, partMatrix(_m, R, Math.PI - t.s * ang + bendTmp.yaw, bendTmp.pitch + 0.02 + wob * 2, t.s * 0.1));
      }
      tailAt(z0 + 0.05, bendTmp);
      R.set(bendTmp.x, yc(0.03) + bendTmp.y, z0 + 0.05);
      fb.set(fanTip.i, partMatrix(_m, R, Math.PI + bendTmp.yaw, bendTmp.pitch, 0));
      for (let k = 0; k < crest.length; k++) {
        R.set((k - 1) * 0.02, 0.2 - k * 0.01, 0.52 - k * 0.04);
        fb.set(crest[k].i, partMatrix(_m, R, Math.PI + (k - 1) * 0.3, 0.6 + 0.08 * Math.sin(a.time * 2 + k), 0));
      }
      fb.commit();
    },
  };
}

// ---------------------------------------------------------------- flying fish

function buildFlyingFish(kit, raw, root) {
  const P = paletteColors(raw);
  const scales = kit.tex(scaleTexture(31, [6, 4], { cols: 14, rows: 18, line: 150, fill: 240, mottle: 0.05 }));
  const bodyMat = kit.std({ map: scales, roughness: 0.32, metalness: 0.35 });
  const finMat = kit.std({
    map: kit.tex(rayTexture(32, 12, { base: 245, ray: 110 })),
    roughness: 0.45,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });

  const z0 = -0.76;
  const z1 = 0.56;
  const zt = (t) => lerp(z0, z1, t);
  const rx = curve([[0, 0.03], [0.08, 0.04], [0.3, 0.085], [0.6, 0.125], [0.78, 0.125], [0.9, 0.105], [0.97, 0.065], [1, 0.02]]);
  const ry = curve([[0, 0.045], [0.08, 0.05], [0.3, 0.1], [0.6, 0.14], [0.78, 0.14], [0.9, 0.115], [0.97, 0.07], [1, 0.02]]);
  const yc = curve([[0, 0.0], [0.6, 0.0], [0.9, -0.01], [1, -0.03]]);
  const body = loft({
    rings: 44,
    radial: 18,
    path: (t) => [0, yc(t), zt(t)],
    radius: (t) => [rx(t), ry(t)],
    color: (out, t, a) => {
      const up = Math.sin(a);
      mixc(out, P.belly, P.flank, smooth(-0.55, -0.05, up));
      out.lerp(P.back, smooth(0.05, 0.45, up));
      // lateral line and darker snout
      out.lerp(P.back, smooth(0.04, 0.0, Math.abs(up - 0.12)) * 0.25);
      out.lerp(P.back, smooth(0.93, 1, t) * smooth(-0.4, 0.4, up) * 0.6);
      if (t > 0.965 && up < -0.1 && up > -0.5) out.lerp(P.ray, 0.5);
    },
  });
  const bender = makeBender(body);
  root.add(kit.mesh(body, bodyMat, { dynamic: true }));

  const sway = { amp: 0, ph: 0 };
  const bendX = (z) => {
    const d = Math.max(0, 0.05 - z);
    return sway.amp * d * d * Math.sin(sway.ph - z * 3);
  };
  const bendSlope = (z) => (bendX(z - 0.01) - bendX(z + 0.01)) / -0.02;

  const ms = new MembraneSet();
  const finColor = (out, u, v) => {
    mixc(out, P.fin, P.ray, smooth(0.75, 1, u) * 0.35);
    out.lerp(P.back, smooth(0.2, 0, u) * 0.5);
  };
  const pect = [1, -1].map((s) => ({ s, p: ms.patch(7, 24, { color: finColor }) }));
  const pelv = [1, -1].map((s) => ({ s, p: ms.patch(4, 12, { color: finColor }) }));
  const caudal = ms.patch(6, 14, { color: (out, u, v) => {
    finColor(out, u, v);
    out.lerp(P.back, smooth(0.4, 0, u) * 0.4);
  } });
  const dorsal = ms.patch(3, 6, { color: finColor });
  const anal = ms.patch(3, 6, { color: finColor });
  root.add(kit.mesh(ms.build(), finMat, { dynamic: true }));

  const eyes = makeEyes(kit, [1, -1].map((s) => ({
    p: [s * 0.085, 0.035, 0.44], r: 0.05, dir: [s * 0.95, 0.1, 0.3],
    iris: raw.iris, sclera: '#1a2230', irisR: 0.95, pupilR: 0.6,
  })), { glossy: 0.08 });
  root.add(eyes);
  const tips = [marker('wingtipL'), marker('wingtipR')];
  root.add(tips[0], tips[1]);

  const R = new THREE.Vector3();
  const pectLen = curve([[0, 0.92], [0.22, 1.0], [0.55, 0.86], [1, 0.42]]);
  const pelvLen = curve([[0, 0.38], [0.3, 0.42], [1, 0.2]]);
  const upperTip = new THREE.Vector3(0, 0.3, -1.12);
  const notch = new THREE.Vector3(0, -0.02, -0.93);
  const lowerTip = new THREE.Vector3(0, -0.44, -1.32);
  const E = new THREE.Vector3();

  const fanFin = (p, s, root0, rootLen, angA, angB, lenFn, dihedral, tremble, ph, billow) => {
    for (let j = 0; j <= p.nv; j++) {
      const v = j / p.nv;
      const ang = lerp(angA, angB, v);
      const rays = 12;
      const frac = (v * rays) % 1;
      const L = lenFn(v) * (1 - 0.05 * Math.sin(Math.PI * frac));
      const dx = s * Math.cos(ang);
      const dz = -Math.sin(ang);
      for (let i = 0; i <= p.nu; i++) {
        const u = i / p.nu;
        const x = root0.x + dx * L * u;
        const z = root0.z - rootLen * v + dz * L * u;
        let y = root0.y + dihedral * L * u * u;
        y += tremble * u * u * Math.sin(ph + v * 7 + u * 2);
        y += billow * Math.sin(Math.PI * v) * Math.sin(Math.PI * u * 0.8);
        ms.set(p, i, j, x + bendX(z), y, z);
      }
    }
  };

  return {
    eyes,
    tips,
    update(a) {
      const { tuck, flare } = a;
      root.rotation.x = -0.25 * flare + 0.05 * tuck;
      sway.amp = 0.035 + 0.035 * Math.max(0, Math.sin(a.time * 0.7)) + Math.abs(a.yaw) * 0.05;
      sway.ph = a.time * 7;
      bender.apply((r, t, z, o) => {
        o.x = bendX(z);
        o.yaw = Math.atan(bendSlope(z));
        const br = smooth(0.85, 0.95, t);
        o.sx = 1 + a.breath * 0.03 * br;
      });
      const tremble = 0.004 + a.speed * 0.00022 + flare * 0.006;
      const ph = a.ripple * 3.2;
      for (const f of pect) {
        const s = f.s;
        R.set(s * 0.1, 0.06 + s * a.roll * 0.02, 0.25);
        const a0 = pose1(-0.1, 1.42, -0.32, tuck, flare) - s * a.roll * 0.08;
        const a1 = pose1(1.25, 1.52, 1.1, tuck, flare);
        fanFin(f.p, s, R, 0.08, a0, a1, pectLen, 0.1 + s * a.roll * 0.08 + flare * 0.06, tremble, ph + s, 0.02 + flare * 0.04);
        const L = pectLen(0);
        tips[s > 0 ? 0 : 1].position.set(R.x + s * Math.cos(a0) * L, R.y + 0.1 * L, R.z - Math.sin(a0) * L);
      }
      for (const f of pelv) {
        const s = f.s;
        R.set(s * 0.06, -0.09, -0.24);
        const a0 = pose1(0.25, 1.45, 0.05, tuck, flare);
        const a1 = pose1(1.3, 1.55, 1.25, tuck, flare);
        fanFin(f.p, s, R, 0.05, a0, a1, pelvLen, 0.04, tremble * 0.8, ph + 1.3 + s, 0.01);
      }
      // forked tail, follows the body bend
      const p = caudal;
      for (let j = 0; j <= p.nv; j++) {
        const v = j / p.nv;
        if (v < 0.42) E.lerpVectors(upperTip, notch, v / 0.42);
        else E.lerpVectors(notch, lowerTip, (v - 0.42) / 0.58);
        const ry0 = lerp(0.045, -0.045, v);
        for (let i = 0; i <= p.nu; i++) {
          const u = i / p.nu;
          const z = lerp(z0 + 0.04, E.z, u);
          const y = lerp(ry0, E.y, u);
          ms.set(p, i, j, bendX(z) + tremble * 0.5 * u * Math.sin(ph * 0.7 + v * 5), y, z);
        }
      }
      const vfin = (pp, za, zb, ya, h) => {
        for (let j = 0; j <= pp.nv; j++) {
          const v = j / pp.nv;
          const z = lerp(za, zb, v);
          const y0 = ya(z);
          const hh = h * Math.sin(Math.PI * Math.min(1, v * 0.85 + 0.12)) * (1 - 0.3 * v);
          for (let i = 0; i <= pp.nu; i++) {
            const u = i / pp.nu;
            const zz = z - u * 0.05;
            ms.set(pp, i, j, bendX(zz), y0 + hh * u, zz);
          }
        }
      };
      vfin(dorsal, -0.2, -0.52, (z) => ry((z - z0) / (z1 - z0)) - 0.01, 0.11);
      vfin(anal, -0.3, -0.56, (z) => -ry((z - z0) / (z1 - z0)) + 0.01, -0.08);
      ms.commit();
    },
  };
}

// ---------------------------------------------------------------- draco

function buildDraco(kit, raw, root) {
  const P = paletteColors(raw);
  const scaleTex = kit.tex(scaleTexture(41, [8, 6], { cols: 20, rows: 26, line: 140, fill: 235, mottle: 0.3 }));
  const bodyMat = kit.std({ map: scaleTex, roughness: 0.68 });
  const wingTex = kit.tex(rayTexture(42, 5, { base: 240, ray: 150, segments: false, veins: 8 }));
  const wingMat = kit.std({ map: wingTex, roughness: 0.6, side: THREE.DoubleSide });

  const z0 = -1.3;
  const z1 = 0.58;
  const zt = (t) => lerp(z0, z1, t);
  const tb = (z) => (z - z0) / (z1 - z0);
  const rx = curve([[0, 0.006], [0.25, 0.022], [0.45, 0.045], [0.55, 0.095], [0.66, 0.12], [0.76, 0.1], [0.81, 0.07], [0.86, 0.08], [0.93, 0.06], [0.985, 0.022], [1, 0.006]]);
  const ry = curve([[0, 0.006], [0.25, 0.02], [0.45, 0.04], [0.55, 0.06], [0.66, 0.07], [0.76, 0.065], [0.81, 0.055], [0.86, 0.06], [0.93, 0.042], [0.985, 0.016], [1, 0.006]]);
  const yc = curve([[0, 0.0], [0.5, 0.0], [0.78, 0.01], [0.88, 0.05], [1, 0.03]]);
  const rng = mulberry(43);
  const blotch = [];
  for (let i = 0; i < 14; i++) blotch.push([rng(), rng()]);
  const body = loft({
    rings: 60,
    radial: 14,
    path: (t) => [0, yc(t), zt(t)],
    radius: (t) => [rx(t), ry(t)],
    section: (a) => [1, Math.sin(a) < 0 ? 0.7 : 1],
    color: (out, t, a) => {
      const up = Math.sin(a);
      mixc(out, P.belly, P.body, smooth(-0.5, 0.0, up));
      // dark saddle bands along the back and tail rings
      const band = Math.sin(t * 46) * 0.5 + 0.5;
      out.lerp(P.dark, smooth(0.0, 0.6, up) * smooth(0.55, 0.9, band) * 0.6);
      for (const [bt, ba] of blotch) {
        const d = Math.hypot((t - (0.5 + bt * 0.4)) * 6, (a / TAU - ba));
        out.lerp(P.dark, smooth(0.08, 0.03, d) * 0.5 * smooth(-0.2, 0.3, up));
      }
      if (t > 0.86 && t < 0.97 && Math.abs(up) < 0.25) out.lerp(P.dark, 0.25);
    },
  });
  const bender = makeBender(body);
  root.add(kit.mesh(body, bodyMat, { dynamic: true }));
  const tail = { ax: 0, ay: 0, zb: -0.38 };
  const tailBend = (z, o) => {
    const d = Math.max(0, tail.zb - z);
    o.x = tail.ax * d * d;
    o.y = tail.ay * d * d;
    o.yaw = Math.atan(-2 * tail.ax * d);
    o.pitch = Math.atan(2 * tail.ay * d);
  };

  const RIBS = 6;
  const ms = new MembraneSet();
  const wings = [1, -1].map((s) => ({
    s,
    p: ms.patch(10, (RIBS - 1) * 4, {
      layers: 2,
      thickness: 0.01,
      color: (out, u, v, layer) => {
        const ribs = v * (RIBS - 1);
        const frac = ribs % 1;
        if (layer === 0) {
          out.copy(P.wing);
          out.lerp(P.under, smooth(0.25, 0, u) * 0.6);
          // broken dark bands running across the ribs plus a dark trailing rim
          const band1 = smooth(0.08, 0.02, Math.abs(u - 0.48)) * smooth(0.05, 0.25, Math.sin(Math.PI * frac));
          const band2 = smooth(0.07, 0.02, Math.abs(u - 0.74)) * smooth(0.1, 0.35, Math.sin(Math.PI * frac));
          out.lerp(P.band, Math.max(band1, band2) * 0.95);
          out.lerp(P.band, smooth(0.88, 1, u) * 0.75);
          out.lerp(P.band, smooth(0.15, 0, Math.min(frac, 1 - frac)) * 0.25 * u);
        } else {
          mixc(out, P.under, P.wing, 0.25 + smooth(0.85, 1, u) * 0.4);
        }
      },
    }),
  }));
  const dew = ms.patch(3, 6, { color: (out, u) => mixc(out, P.dewlap, P.body, smooth(0.25, 0, u) * 0.6) });
  root.add(kit.mesh(ms.build(), wingMat, { dynamic: true }));

  // splayed legs and toes
  const lb = new Batch();
  const legCol = (out, x, y, z, nx, ny) => mixc(out, P.belly, P.body, smooth(-0.3, 0.4, ny));
  const legs = [];
  for (const s of [1, -1]) {
    for (const front of [true, false]) {
      const L = { s, front, a: lb.add(tube(0.16, 0.03, 0.022), legCol), b: lb.add(tube(0.13, 0.022, 0.015), legCol), toes: [] };
      for (let k = 0; k < 4; k++) L.toes.push(lb.add(tube(0.07 + (k === 2 ? 0.02 : 0), 0.009, 0.005, { radial: 6, rings: 6 }), P.dark));
      legs.push(L);
    }
  }
  root.add(kit.mesh(lb.build(), bodyMat, { dynamic: true }));

  const eyes = makeEyes(kit, [1, -1].map((s) => ({
    p: [s * 0.052, 0.095, 0.455], r: 0.021, dir: [s * 0.9, 0.3, 0.3],
    iris: raw.iris, sclera: '#151008', irisR: 0.8, pupilR: 0.35,
  })));
  root.add(eyes);
  const tips = [marker('wingtipL'), marker('wingtipR')];
  root.add(tips[0], tips[1]);

  const ribAng = curve([[0, 0], [1, 1]]);
  const ribLen = (v) => 0.93 * Math.pow(Math.sin(Math.PI * lerp(0.2, 0.92, v)), 0.6);
  const Pt = new THREE.Vector3();
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const C = new THREE.Vector3();

  return {
    eyes,
    tips,
    update(a) {
      const { tuck, flare } = a;
      root.rotation.x = -0.3 * flare + 0.05 * tuck;
      tail.ax = 0.05 * Math.sin(a.time * 1.1) + a.yaw * 0.2 + a.roll * 0.08;
      tail.ay = 0.03 + 0.25 * flare + a.pitch * 0.15;
      bender.apply((r, t, z, o) => {
        if (z < tail.zb) tailBend(z, o);
        const br = smooth(0.5, 0.65, t) * smooth(0.8, 0.7, t);
        o.sx = 1 + a.breath * 0.03 * br;
        o.sy = 1 + a.breath * 0.04 * br;
      });
      const flutter = 0.004 + a.speed * 0.00025;
      const billow = 0.03 + 0.08 * flare;
      for (const w of wings) {
        const s = w.s;
        const p = w.p;
        const lift = s * a.roll * 0.08;
        for (let j = 0; j <= p.nv; j++) {
          const v = j / p.nv;
          const ribs = v * (RIBS - 1);
          const frac = ribs % 1;
          const between = Math.sin(Math.PI * frac);
          const rz = lerp(0.12, -0.3, v);
          // angle 0 = straight out; positive sweeps back
          const ang = pose1(lerp(-0.12, 1.15, ribAng(v)), lerp(1.35, 1.5, v), lerp(-0.3, 1.0, v), tuck, flare);
          const L = ribLen(v) * (1 - 0.07 * between) * (1 - 0.15 * tuck);
          const dx = s * Math.cos(ang);
          const dz = -Math.sin(ang);
          for (let i = 0; i <= p.nu; i++) {
            const u = i / p.nu;
            Pt.set(s * 0.09 + dx * L * u, 0.02 + lift * u * u, rz + dz * L * u);
            Pt.y -= 0.02 * between * Math.sin(Math.PI * u) * (1 - tuck);
            Pt.y += billow * Math.sin(Math.PI * u * 0.9) * Math.sin(Math.PI * v);
            Pt.y += flutter * u * u * v * Math.sin(a.ripple * 2.2 - v * 8 - u * 4);
            Pt.y -= 0.04 * u * u * (1 - tuck);
            ms.set(p, i, j, Pt.x, Pt.y, Pt.z);
          }
        }
        const L0 = ribLen(0);
        const ang0 = pose1(-0.12, 1.35, -0.3, tuck, flare);
        tips[s > 0 ? 0 : 1].position.set(s * 0.09 + s * Math.cos(ang0) * L0, 0.02 + lift - 0.04, 0.12 - Math.sin(ang0) * L0);
      }
      // dewlap: a pointed flap under the throat, pulses out now and then
      const show = 0.55 + 0.45 * smooth(0.6, 1, Math.sin(a.time * 0.9)) + flare * 0.3;
      for (let j = 0; j <= dew.nv; j++) {
        const v = j / dew.nv;
        const z = lerp(0.47, 0.25, v);
        const top = yc(tb(z)) - ry(tb(z)) * 0.6;
        const depth = 0.13 * show * Math.sin(Math.PI * Math.pow(v, 0.7)) * (1 - 0.3 * v);
        for (let i = 0; i <= dew.nu; i++) {
          const u = i / dew.nu;
          ms.set(dew, i, j, 0.004 * Math.sin(a.time * 9 + v * 4) * u, top - depth * u, z - 0.08 * u * u * show);
        }
      }
      ms.commit();
      for (const L of legs) {
        const s = L.s;
        if (L.front) {
          A.set(s * 0.07, -0.02, 0.22);
          pose3(B, [s * 0.2, -0.03, 0.27], [s * 0.1, -0.05, 0.12], [s * 0.21, -0.02, 0.31], tuck, flare);
          pose3(C, [s * 0.25, -0.05, 0.37], [s * 0.12, -0.06, 0.02], [s * 0.27, -0.03, 0.4], tuck, flare);
        } else {
          A.set(s * 0.07, -0.02, -0.34);
          pose3(B, [s * 0.21, -0.03, -0.38], [s * 0.1, -0.05, -0.42], [s * 0.22, -0.02, -0.34], tuck, flare);
          pose3(C, [s * 0.27, -0.05, -0.49], [s * 0.11, -0.06, -0.55], [s * 0.3, -0.04, -0.45], tuck, flare);
        }
        lb.set(L.a, boneMatrix(_m, A, B, 0.16));
        lb.set(L.b, boneMatrix(_m, B, C, 0.13));
        _v3.subVectors(C, B).normalize();
        const yaw = Math.atan2(_v3.x, _v3.z);
        for (let k = 0; k < L.toes.length; k++) {
          lb.set(L.toes[k], partMatrix(_m, C, yaw + (k - 1.5) * 0.45 * (1 - 0.5 * tuck), -0.1));
        }
      }
      lb.commit();
    },
  };
}

// ---------------------------------------------------------------- frog

function buildFrog(kit, raw, root) {
  const P = paletteColors(raw);
  const skin = kit.tex(skinTexture(51, [3, 3]));
  const bodyMat = kit.std({ map: skin, roughness: 0.42 });
  const webMat = kit.std({ map: kit.tex(rayTexture(52, 4, { base: 235, ray: 255, segments: false, veins: 14 })), roughness: 0.5, side: THREE.DoubleSide });

  const z0 = -0.44;
  const z1 = 0.44;
  const zt = (t) => lerp(z0, z1, t);
  const rx = curve([[0, 0.05], [0.1, 0.2], [0.35, 0.29], [0.6, 0.29], [0.78, 0.27], [0.9, 0.21], [0.97, 0.12], [1, 0.04]]);
  const ry = curve([[0, 0.04], [0.1, 0.12], [0.35, 0.175], [0.6, 0.165], [0.78, 0.14], [0.9, 0.11], [0.97, 0.06], [1, 0.02]]);
  const yc = curve([[0, 0.0], [0.4, 0.025], [0.8, 0.01], [1, -0.02]]);
  const body = loft({
    rings: 36,
    radial: 20,
    path: (t) => [0, yc(t), zt(t)],
    radius: (t) => [rx(t), ry(t)],
    section: (a) => [1, Math.sin(a) < 0 ? 0.62 : 1],
    color: (out, t, a, p) => {
      const up = Math.sin(a);
      mixc(out, P.belly, P.side, smooth(-0.7, -0.25, up));
      out.lerp(P.top, smooth(-0.1, 0.35, up));
      out.lerp(P.dark, smooth(0.75, 1, up) * 0.18);
      // pale lip line along the jaw
      if (t > 0.72) out.lerp(P.belly, smooth(0.08, 0.0, Math.abs(up + 0.05)) * 0.7);
      // small pale speckles on the back
      const sp = Math.sin(p.x * 91) * Math.sin(p.z * 83) * Math.sin(p.x * 37 + p.z * 29);
      out.lerp(P.belly, smooth(0.7, 0.85, sp) * smooth(0.2, 0.6, up) * 0.35);
    },
  });
  const bodyMesh = kit.mesh(body, bodyMat);
  root.add(bodyMesh);

  const lb = new Batch();
  const legCol = (out, x, y, z, nx, ny) => {
    mixc(out, P.side, P.top, smooth(-0.35, 0.3, ny));
  };
  const toeCol = (out, x, y, z, nx, ny) => mixc(out, P.toe, P.top, smooth(0.2, 0.9, ny) * 0.4);
  const ms = new MembraneSet();
  const limbs = [];
  const webColor = (n) => (out, u, v) => {
    const frac = (v * (n - 1)) % 1;
    out.copy(P.web);
    out.lerp(P.streak, smooth(0.2, 0.0, Math.min(frac, 1 - frac)) * 0.55 * smooth(0.1, 0.5, u));
    out.lerp(P.streak, smooth(0.85, 1, u) * 0.35);
  };
  for (const s of [1, -1]) {
    for (const front of [true, false]) {
      const n = front ? 4 : 5;
      const segs = front ? [0.17, 0.17] : [0.25, 0.26, 0.17];
      const radii = front ? [[0.055, 0.04], [0.04, 0.03]] : [[0.085, 0.055], [0.05, 0.035], [0.034, 0.028]];
      const L = { s, front, n, segs, bones: [], toes: [], pads: [], web: ms.patch(5, (n - 1) * 6, { color: webColor(n) }) };
      for (let k = 0; k < segs.length; k++) L.bones.push(lb.add(tube(segs[k], radii[k][0], radii[k][1], { radial: 10 }), legCol));
      const toeLen = front ? 0.3 : 0.42;
      for (let k = 0; k < n; k++) {
        L.toes.push(lb.add(tube(toeLen, 0.016, 0.011, { radial: 6, rings: 6 }), toeCol));
        L.pads.push(lb.add(ellipsoid(0.026, 0.013, 0.028, 10, 6), P.toe));
      }
      L.toeLen = toeLen;
      limbs.push(L);
    }
  }
  root.add(kit.mesh(lb.build(), bodyMat, { dynamic: true }));
  root.add(kit.mesh(ms.build(), webMat, { dynamic: true }));

  const eyes = makeEyes(kit, [1, -1].map((s) => ({
    p: [s * 0.165, 0.15, 0.26], r: 0.085, dir: [s * 0.75, 0.45, 0.45],
    iris: raw.iris, sclera: '#0f0b06', pupilShape: 'h', irisR: 0.9, pupilR: 0.5,
  })));
  root.add(eyes);
  const tips = [marker('wingtipL'), marker('wingtipR')];
  root.add(tips[0], tips[1]);

  const J = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const T = new THREE.Vector3();
  const D = new THREE.Vector3();
  const Pt = new THREE.Vector3();
  const toeDirs = Array.from({ length: 5 }, () => new THREE.Vector3());
  const toeTips = Array.from({ length: 5 }, () => new THREE.Vector3());

  return {
    eyes,
    tips,
    update(a) {
      const { tuck, flare } = a;
      root.rotation.x = -0.28 * flare + 0.06 * tuck;
      bodyMesh.scale.set(1 + a.breath * 0.02, 1 - a.breath * 0.015 + 0.03 * Math.max(0, Math.sin(a.time * 5.5)) * 0.4, 1);
      const billow = 0.025 + 0.06 * flare + a.speed * 0.00025;
      const flutter = 0.004 + a.speed * 0.00022;
      for (const L of limbs) {
        const s = L.s;
        const lift = s * a.roll * 0.06;
        if (L.front) {
          J[0].set(s * 0.17, -0.06, 0.2);
          pose3(J[1], [s * 0.3, -0.07, 0.3], [s * 0.2, -0.09, 0.2], [s * 0.31, -0.03, 0.32], tuck, flare);
          pose3(J[2], [s * 0.42, -0.05 + lift, 0.4], [s * 0.26, -0.09, 0.32], [s * 0.45, 0.0 + lift, 0.42], tuck, flare);
        } else {
          J[0].set(s * 0.18, -0.05, -0.3);
          pose3(J[1], [s * 0.4, -0.06, -0.24], [s * 0.3, -0.08, -0.12], [s * 0.42, -0.02, -0.2], tuck, flare);
          pose3(J[2], [s * 0.54, -0.07 + lift * 0.6, -0.45], [s * 0.3, -0.09, -0.36], [s * 0.6, -0.02 + lift * 0.6, -0.4], tuck, flare);
          pose3(J[3], [s * 0.6, -0.06 + lift, -0.6], [s * 0.3, -0.08, -0.52], [s * 0.68, -0.0 + lift, -0.53], tuck, flare);
        }
        for (let k = 0; k < L.bones.length; k++) lb.set(L.bones[k], boneMatrix(_m, J[k], J[k + 1], L.segs[k]));
        const foot = J[L.bones.length];
        // toe fan: angle measured from +Z toward the creature's side
        const spread = 1 - 0.55 * tuck + 0.18 * flare;
        const centre = L.front ? 0.75 : 2.3;
        const width = (L.front ? 1.35 : 1.7) * spread;
        for (let k = 0; k < L.n; k++) {
          const q = k / (L.n - 1);
          const ang = centre + (q - 0.5) * width;
          toeDirs[k].set(s * Math.sin(ang), 0.05, Math.cos(ang)).normalize();
          const len = L.toeLen * (L.front ? 1 - 0.3 * Math.abs(q - 0.6) : 1 - 0.35 * Math.abs(q - 0.6));
          toeTips[k].copy(foot).addScaledVector(toeDirs[k], len);
          lb.set(L.toes[k], boneMatrix(_m, foot, toeTips[k], L.toeLen));
          lb.set(L.pads[k], partMatrix(_m, toeTips[k], Math.atan2(toeDirs[k].x, toeDirs[k].z), 0));
        }
        const p = L.web;
        for (let j = 0; j <= p.nv; j++) {
          const v = j / p.nv;
          const x = v * (L.n - 1);
          const k0 = Math.min(L.n - 2, Math.floor(x));
          const f = x - k0;
          const between = Math.sin(Math.PI * f);
          D.lerpVectors(toeDirs[k0], toeDirs[k0 + 1], f);
          const len0 = toeTips[k0].distanceTo(foot);
          const len1 = toeTips[k0 + 1].distanceTo(foot);
          const len = lerp(len0, len1, f) * (1 - 0.2 * between) * 0.97;
          for (let i = 0; i <= p.nu; i++) {
            const u = i / p.nu;
            Pt.copy(foot).addScaledVector(D, len * u);
            Pt.y += billow * between * Math.sin(Math.PI * u * 0.85);
            Pt.y += flutter * u * u * between * Math.sin(a.ripple * 2.5 + v * 6 + (L.front ? 0 : 2));
            ms.set(p, i, j, Pt.x, Pt.y, Pt.z);
          }
        }
        if (!L.front) tips[s > 0 ? 0 : 1].position.copy(toeTips[0]);
      }
      lb.commit();
      ms.commit();
    },
  };
}

// ---------------------------------------------------------------- snake

function snakeTexture(P) {
  return canvasTexture(128, 256, (g, w, h) => {
    const r = mulberry(61);
    const css = (c) => `#${c.getHexString(THREE.SRGBColorSpace)}`;
    g.fillStyle = css(P.base);
    g.fillRect(0, 0, w, h);
    const cols = 14;
    const rows = 18;
    const cw = w / cols;
    const rh = h / rows;
    for (let j = -1; j <= rows; j++) {
      for (let i = -1; i <= cols; i++) {
        const x = (i + (j % 2 ? 0.5 : 0)) * cw;
        const y = j * rh;
        const u = ((x / w) % 1 + 1) % 1;
        const belly = Math.abs(u - 0.75) < 0.16;
        const grd = g.createRadialGradient(x, y - rh * 0.15, 0.5, x, y, cw * 0.55);
        const c = belly ? P.belly : P.scale;
        grd.addColorStop(0, css(_c.copy(c).lerp(new THREE.Color(1, 1, 1), 0.15)));
        grd.addColorStop(0.6, css(c));
        grd.addColorStop(1, css(_c.copy(c).lerp(P.base, 0.85)));
        g.fillStyle = grd;
        g.beginPath();
        if (belly) g.ellipse(x, y, cw * 0.62, rh * 0.46, 0, 0, TAU);
        else g.ellipse(x, y, cw * 0.47, rh * 0.5, 0, 0, TAU);
        g.fill();
      }
    }
    // dorsal row of red-orange rosettes (u = 0.25 is the top of the body)
    for (let k = 0; k < 3; k++) {
      const y = (k + 0.5) * (h / 3);
      for (const dx of [0, -0.06, 0.06]) {
        const x = (0.25 + dx) * w;
        const yy = y + (dx === 0 ? 0 : rh * 0.7);
        const grd = g.createRadialGradient(x, yy, 0.5, x, yy, cw * (dx === 0 ? 1.1 : 0.7));
        grd.addColorStop(0, css(P.spot2));
        grd.addColorStop(0.5, css(P.spot));
        grd.addColorStop(1, css(_c.copy(P.spot).multiplyScalar(0.0).lerp(P.spot, 0.0)) + '00');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(x, yy, cw * (dx === 0 ? 1.0 : 0.6), rh * (dx === 0 ? 1.3 : 0.8), 0, 0, TAU);
        g.fill();
      }
    }
    for (let i = 0; i < 80; i++) {
      g.fillStyle = `rgba(0,0,0,${0.15 * r()})`;
      g.fillRect(r() * w, r() * h, 1, 1);
    }
  }, [1, 7]);
}

function buildSnake(kit, raw, root) {
  const P = paletteColors(raw);
  const tex = kit.tex(snakeTexture(P));
  const bodyMat = kit.std({ map: tex, roughness: 0.38, metalness: 0.05 });
  const z0 = -1.45;
  const z1 = 1.38;
  const zt = (t) => lerp(z0, z1, t);
  const rx = curve([[0, 0.006], [0.12, 0.045], [0.35, 0.108], [0.6, 0.116], [0.82, 0.085], [0.88, 0.06], [0.92, 0.065], [0.955, 0.07], [0.985, 0.045], [1, 0.015]]);
  const ry = curve([[0, 0.006], [0.12, 0.025], [0.35, 0.042], [0.6, 0.045], [0.82, 0.042], [0.88, 0.036], [0.92, 0.042], [0.955, 0.04], [0.985, 0.026], [1, 0.01]]);
  const hasTex = !!tex;
  const body = loft({
    rings: 96,
    radial: 12,
    path: (t) => [0, 0, zt(t)],
    radius: (t) => [rx(t), ry(t)],
    // flattened ribbon with a concave belly, as the real snake does in flight
    section: (a) => {
      const s = Math.sin(a);
      if (s >= 0) return [1, 1];
      return [1, 0.3 + 0.7 * Math.sqrt(Math.abs(Math.cos(a)))];
    },
    color: (out, t, a) => {
      const up = Math.sin(a);
      if (hasTex) {
        out.setRGB(1, 1, 1);
        if (t > 0.9) {
          // head: banded black and green
          const band = Math.sin(t * 160) > 0.3 ? 1 : 0;
          out.setRGB(1, 1, 1).lerp(P.base, band * 0.5 * smooth(0.0, 0.5, up));
        }
      } else {
        mixc(out, P.belly, P.scale, smooth(-0.5, -0.1, up));
        out.lerp(P.base, 0.4);
      }
    },
  });
  const bender = makeBender(body);
  root.add(kit.mesh(body, bodyMat, { dynamic: true }));

  const head = new THREE.Group();
  root.add(head);
  const eyes = makeEyes(kit, [1, -1].map((s) => ({
    p: [s * 0.052, 0.028, 1.25], r: 0.024, dir: [s * 0.9, 0.35, 0.3],
    iris: raw.iris, sclera: '#0a0a0a', irisR: 0.85, pupilR: 0.45,
  })));
  head.add(eyes);
  // forked tongue: two thin prongs from a stem
  const tb = new Batch();
  tb.add(tube(0.07, 0.006, 0.005, { radial: 5, rings: 5 }), P.tongue);
  for (const s of [1, -1]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.07), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s * 0.35, 0)), new THREE.Vector3(1, 1, 1));
    tb.add(tube(0.045, 0.005, 0.002, { radial: 5, rings: 5 }), P.tongue, m);
  }
  const tongueMat = kit.std({ roughness: 0.4 });
  const tongue = kit.mesh(tb.build(), tongueMat);
  tongue.position.set(0, -0.012, 1.36);
  head.add(tongue);

  const tips = [marker('wingtipL'), marker('wingtipR')];
  root.add(tips[0], tips[1]);

  const wave = { A: 0.3, k: TAU / 2.0, ph: 0, flat: 1 };
  const ampAt = curve([[z0, 0.16], [z0 + 0.6, 0.27], [0, 0.3], [0.7, 0.22], [1.05, 0.08], [z1, 0.03]]);
  const waveX = (z) => wave.A * ampAt(z) / 0.3 * Math.sin(wave.k * z - wave.ph);
  const waveY = (z) => 0.035 * wave.A / 0.3 * Math.sin(2 * (wave.k * z - wave.ph) + 0.6) * smooth(z1, 0.6, z);
  const o2 = { x: 0, y: 0, yaw: 0, pitch: 0 };
  const sample = (z, o) => {
    o.x = waveX(z);
    o.y = waveY(z);
    o.yaw = Math.atan((waveX(z + 0.01) - waveX(z - 0.01)) / 0.02);
    o.pitch = -Math.atan((waveY(z + 0.01) - waveY(z - 0.01)) / 0.02);
  };

  return {
    eyes,
    tips,
    update(a) {
      const { tuck, flare } = a;
      root.rotation.x = -0.18 * flare + 0.04 * tuck;
      wave.A = pose1(0.27, 0.1, 0.36, tuck, flare) * (1 + 0.1 * Math.sin(a.time * 0.6)) + Math.abs(a.yaw) * 0.04;
      wave.ph = a.slither;
      const flat = pose1(1, 0.72, 1.12, tuck, flare);
      bender.apply((r, t, z, o) => {
        sample(z, o);
        o.sx = flat * (1 + a.breath * 0.02);
        o.sy = 1 / Math.sqrt(flat);
        // tail lifts with pitch and when braking
        if (z < -0.8) o.y += (a.pitch * 0.12 + flare * 0.1) * ((-0.8 - z) / 0.65) ** 2;
      });
      sample(1.25, o2);
      head.position.set(o2.x, o2.y, 0);
      head.rotation.set(o2.pitch, o2.yaw, 0);
      head.position.x -= Math.sin(o2.yaw) * 1.25;
      head.position.z -= (1 - Math.cos(o2.yaw)) * 1.25;
      // tongue flick every few seconds
      const tf = a.time % 3.7;
      const flick = tf < 0.45 ? Math.sin((tf / 0.45) * Math.PI) : 0;
      tongue.scale.set(1, 1, Math.max(0.001, flick * (1 + 0.2 * Math.sin(a.time * 60))));
      tongue.visible = flick > 0.01;
      const env = wave.A + 0.1 * flat;
      tips[0].position.set(env, 0, -0.35);
      tips[1].position.set(-env, 0, -0.35);
    },
  };
}

// ---------------------------------------------------------------- public API

const BUILDERS = {
  squirrel: buildSquirrel,
  microraptor: buildMicroraptor,
  flyingfish: buildFlyingFish,
  draco: buildDraco,
  frog: buildFrog,
  snake: buildSnake,
};

export function createGlider(id, variant = 0, opts = {}) {
  const build = BUILDERS[id];
  if (!build) throw new Error(`Unknown glider: ${id}`);
  const vi = ((Math.floor(num(variant, 0)) % VARIANTS) + VARIANTS) % VARIANTS;
  const raw = PALETTES[id][vi];
  const kit = createKit(1000 + vi);
  const object = new THREE.Group();
  object.name = `glider:${id}`;
  const rootPose = new THREE.Group();
  object.add(rootPose);
  const creature = build(kit, raw, rootPose, opts);
  const rand = mulberry(7 + vi * 13 + id.length * 31);
  const anim = {
    time: 0, dt: 0, speed: 30, tuck: 0, flare: 0, roll: 0, pitch: 0, yaw: 0,
    ripple: 0, slither: 0, breath: 0, nextBlink: 1 + rand() * 2, blinkStart: -10,
  };
  const update = (state = {}) => {
    const dt = clamp(num(state.dt, 1 / 60), 0, 0.1);
    anim.dt = dt;
    anim.time = num(state.time, anim.time + dt);
    anim.speed = clamp(num(state.speed, 30), 0, 200);
    anim.tuck = damp(anim.tuck, clamp(num(state.tuck, 0), 0, 1), 10, dt);
    anim.flare = damp(anim.flare, clamp(num(state.flare, 0), 0, 1), 10, dt);
    anim.roll = damp(anim.roll, clamp(num(state.roll, 0), -1, 1), 8, dt);
    anim.pitch = damp(anim.pitch, clamp(num(state.pitch, 0), -1, 1), 8, dt);
    anim.yaw = damp(anim.yaw, clamp(num(state.yaw, 0), -1, 1), 8, dt);
    anim.ripple += dt * (5 + anim.speed * 0.12);
    anim.slither += dt * (4.2 + anim.speed * 0.025) * (1 - 0.4 * anim.tuck);
    anim.breath = Math.sin(anim.time * TAU * 0.3);
    // blink: quick close-open at random intervals
    if (anim.time < anim.blinkStart - 1) anim.blinkStart = -10;
    if (anim.time >= anim.nextBlink) {
      anim.blinkStart = anim.time;
      anim.nextBlink = anim.time + 1.8 + rand() * 3.5;
    }
    const bp = (anim.time - anim.blinkStart) / 0.16;
    const blink = bp >= 0 && bp < 1 ? Math.sin(bp * Math.PI) : 0;
    if (creature.eyes) creature.eyes.scale.y = 1 - 0.9 * blink;
    creature.update(anim);
  };
  update({ dt: 0, time: 0 });
  const p = raw.ui;
  return {
    object,
    update,
    palette: { primary: p[0], secondary: p[1], accent: p[2] },
    wingtips: creature.tips,
    dispose() {
      kit.dispose();
      object.removeFromParent();
    },
  };
}

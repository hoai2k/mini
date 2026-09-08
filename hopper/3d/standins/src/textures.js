/** Procedural stand-in textures.
 * Every painter is pure JavaScript over a Uint8Array, so the same code runs in
 * the browser and in node tests without a canvas. Painters aim for the
 * gouache look of the 2D game: flat colour fields, visible brush direction,
 * two or three tones per surface and no photographic detail.
 */
import {
  DataTexture,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
} from 'three';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
export function shade(rgb, k) {
  return rgb.map((c) => Math.max(0, Math.min(255, c * k)));
}

/** Deterministic hash noise: identical output for identical seeds. */
export function hash(x, y, seed = 0) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1442695041;
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
/** Tileable value noise over a grid of `period` cells. */
export function valueNoise(x, y, period, seed = 0) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    fx = smooth(x - xi),
    fy = smooth(y - yi);
  const p = (i, j) => hash(((i % period) + period) % period, ((j % period) + period) % period, seed);
  const a = p(xi, yi),
    b = p(xi + 1, yi),
    c = p(xi, yi + 1),
    d = p(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x, y, period, seed = 0, octaves = 4) {
  let sum = 0,
    amp = 0.5,
    freq = 1,
    norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, y * freq, period * freq, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** Fill a size×size RGBA buffer by calling shader(u, v, x, y) → [r,g,b]. */
export function paint(size, shader) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const rgb = shader(x / size, y / size, x, y),
        i = (y * size + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = rgb.length > 3 ? rgb[3] : 255;
    }
  return { width: size, height: size, data };
}

/** Gouache paper grain: multiplies a colour by a soft speckle. */
export function paper(u, v, size, seed, strength = 0.08) {
  const n = fbm(u * size * 0.25, v * size * 0.25, size * 0.25, seed, 2);
  return 1 - strength + n * strength * 2;
}
/** Posterise a 0..1 value into `steps` flat cel tones. */
export function cel(t, steps = 3) {
  return Math.floor(clamp01(t) * steps) / steps;
}

const PAINTERS = {
  /** Meadow: brushed horizontal blades, three greens. */
  grass(size, seed, base = '#5f8f3f') {
    const g = hexToRgb(base),
      dark = shade(g, 0.72),
      light = mix(g, [255, 232, 140], 0.28);
    return paint(size, (u, v, x, y) => {
      const streak = fbm(u * 28, v * 6, 28, seed, 3);
      const blades = hash(x, Math.floor(y / 3), seed + 5) > 0.93 ? 0.35 : 0;
      const t = cel(streak + blades, 3);
      return shade(mix(dark, light, t), paper(u, v, size, seed));
    });
  },
  /** Ploughed terraces: banded soil with irrigation lines. */
  terrace(size, seed, base = '#7a5a3c') {
    const s = hexToRgb(base);
    return paint(size, (u, v, x, y) => {
      const rows = Math.sin(v * Math.PI * 24) * 0.5 + 0.5;
      const n = fbm(u * 12, v * 12, 12, seed, 3);
      const line = (y % Math.floor(size / 12)) < 2 ? 0.7 : 1;
      return shade(mix(shade(s, 0.7), shade(s, 1.15), cel(rows * 0.6 + n * 0.4, 3)), line * paper(u, v, size, seed));
    });
  },
  /** Ivory stone panels: pale blocks with dark seams and warm shade. */
  ivory(size, seed, base = '#e8e0c8') {
    const s = hexToRgb(base);
    return paint(size, (u, v, x, y) => {
      const bw = size / 4,
        bh = size / 8,
        row = Math.floor(y / bh),
        bx = (x + (row % 2) * bw * 0.5) % bw,
        by = y % bh;
      const seam = bx < 3 || by < 3 ? 0.62 : 1;
      const n = fbm(u * 8, v * 8, 8, seed, 2);
      return shade(mix(shade(s, 0.9), shade(s, 1.05), cel(n, 3)), seam * paper(u, v, size, seed, 0.05));
    });
  },
  /** Teal glass bands: horizontal window rows with pale mullions. */
  glass(size, seed, base = '#5fb7a6') {
    const s = hexToRgb(base),
      frame = [232, 224, 200];
    return paint(size, (u, v, x, y) => {
      const rowH = size / 6,
        colW = size / 8;
      const isFrame = y % rowH < rowH * 0.22 || x % colW < 3;
      if (isFrame) return shade(frame, paper(u, v, size, seed, 0.04));
      const lit = hash(Math.floor(x / colW), Math.floor(y / rowH), seed) > 0.6;
      return mix(shade(s, 0.85), shade(s, lit ? 1.25 : 1.0), 1);
    });
  },
  /** Slate and basalt rock: angular tone patches with cracks. */
  rock(size, seed, base = '#5c626d') {
    const s = hexToRgb(base);
    return paint(size, (u, v) => {
      const n = fbm(u * 6, v * 6, 6, seed, 4);
      const crack = Math.abs(fbm(u * 10, v * 10, 10, seed + 9, 3) - 0.5) < 0.012 ? 0.55 : 1;
      return shade(mix(shade(s, 0.7), shade(s, 1.18), cel(n, 4)), crack * paper(u, v, size, seed));
    });
  },
  /** Iron plate: dark warm metal, rivet grid, brushed wear. */
  iron(size, seed, base = '#3c3b3f') {
    const s = hexToRgb(base);
    return paint(size, (u, v, x, y) => {
      const plate = size / 4;
      const edge = x % plate < 3 || y % plate < 3 ? 0.5 : 1;
      const rx = x % plate,
        ry = y % plate,
        rivet = (rx > 8 && rx < 14 && ry > 8 && ry < 14) || (rx > plate - 14 && rx < plate - 8 && ry > 8 && ry < 14) ? 1.5 : 1;
      const wear = fbm(u * 16, v * 4, 16, seed, 3);
      return shade(mix(shade(s, 0.85), shade(s, 1.2), cel(wear, 3)), edge * rivet * paper(u, v, size, seed, 0.05));
    });
  },
  /** Rust: streaks of orange over dark iron. */
  rust(size, seed, base = '#9a5a33') {
    const r = hexToRgb(base),
      iron = [60, 59, 63];
    return paint(size, (u, v) => {
      const streak = fbm(u * 4, v * 24, 24, seed, 3);
      return shade(mix(iron, r, cel(streak, 3)), paper(u, v, size, seed));
    });
  },
  /** Wet green steel for the docks: cool, streaked, spray-worn. */
  wetSteel(size, seed, base = '#4f6b6c') {
    const s = hexToRgb(base);
    return paint(size, (u, v, x, y) => {
      const streak = fbm(u * 6, v * 30, 30, seed, 3);
      const plate = y % (size / 3) < 3 ? 0.55 : 1;
      return shade(mix(shade(s, 0.75), shade(s, 1.15), cel(streak, 3)), plate * paper(u, v, size, seed));
    });
  },
  /** Red coral: cellular pits, a hot rim. */
  coral(size, seed, base = '#b7322c') {
    const c = hexToRgb(base);
    return paint(size, (u, v) => {
      const cells = fbm(u * 14, v * 14, 14, seed, 3);
      const pit = cells < 0.42 ? 0.6 : 1;
      return shade(mix(shade(c, 0.8), mix(c, [255, 220, 170], 0.25), cel(cells, 3)), pit * paper(u, v, size, seed));
    });
  },
  /** Ivory bone: smooth pale with faint growth rings. */
  bone(size, seed, base = '#efe5cf') {
    const b = hexToRgb(base);
    return paint(size, (u, v) => {
      const rings = Math.sin((u * 3 + fbm(u * 4, v * 4, 4, seed, 2)) * Math.PI * 4) * 0.5 + 0.5;
      return shade(mix(shade(b, 0.86), b, cel(rings, 3)), paper(u, v, size, seed, 0.05));
    });
  },
  /** Luminous reef: deep blue stone with cyan veins. */
  reef(size, seed, base = '#3f7fb5') {
    const b = hexToRgb(base),
      glow = [143, 232, 255];
    return paint(size, (u, v) => {
      const n = fbm(u * 5, v * 5, 5, seed, 3);
      const vein = Math.abs(fbm(u * 9, v * 9, 9, seed + 3, 3) - 0.5) < 0.02;
      return vein ? glow : shade(mix(shade(b, 0.7), shade(b, 1.1), cel(n, 3)), paper(u, v, size, seed));
    });
  },
  /** Obsidian: near-black violet glass with bright seams. */
  obsidian(size, seed, base = '#2a1e34') {
    const o = hexToRgb(base),
      seam = [165, 108, 255];
    return paint(size, (u, v, x, y) => {
      const n = fbm(u * 7, v * 7, 7, seed, 3);
      const isSeam = (x % Math.floor(size / 5) < 2 && hash(Math.floor(x / (size / 5)), 0, seed) > 0.4) || Math.abs(fbm(u * 3, v * 3, 3, seed + 7, 2) - 0.5) < 0.008;
      return isSeam ? seam : shade(mix(shade(o, 0.7), shade(o, 1.25), cel(n, 3)), paper(u, v, size, seed, 0.04));
    });
  },
  /** Shadow hide for enemies: charcoal with violet edge speckle. */
  shadow(size, seed, base = '#1a1520') {
    const s = hexToRgb(base),
      edge = [138, 75, 216];
    return paint(size, (u, v) => {
      const n = fbm(u * 6, v * 6, 6, seed, 3);
      const fleck = fbm(u * 20, v * 20, 20, seed + 2, 2) > 0.72;
      return fleck ? mix(s, edge, 0.5) : shade(mix(shade(s, 0.8), shade(s, 1.3), cel(n, 3)), paper(u, v, size, seed, 0.05));
    });
  },
};

/** Painted sky: sky at the zenith, haze band at the horizon, ground below. */
export function paintSky(width, height, region, seed = 1) {
  const sky = hexToRgb(region.sky),
    haze = hexToRgb(region.haze),
    ground = hexToRgb(region.ground),
    sun = hexToRgb(region.sun || '#fff1c2');
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = y / height; // 0 zenith → 1 nadir in an equirect
    for (let x = 0; x < width; x++) {
      const u = x / width;
      let rgb;
      if (v < 0.5) {
        const t = v / 0.5;
        // Zenith → horizon haze. Brushed cloud bands break the gradient.
        const cloud = fbm(u * 10, v * 20, 10, seed, 3);
        const band = cel(cloud, 4) * 0.35;
        rgb = mix(mix(sky, haze, Math.pow(t, 1.6)), [255, 255, 255], band * (0.15 + t * 0.35));
        // Sun disc just above the horizon, quarter turn from +Z.
        const dx = (u - 0.28) * width,
          dy = (v - 0.42) * height,
          r = Math.sqrt(dx * dx + dy * dy);
        if (r < height * 0.035) rgb = sun;
        else if (r < height * 0.12) rgb = mix(rgb, sun, (1 - (r - height * 0.035) / (height * 0.085)) * 0.35);
      } else {
        const t = (v - 0.5) / 0.5;
        rgb = mix(haze, ground, Math.min(1, t * 2.5));
      }
      const i = (y * width + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Three-tone cel ramp for MeshToonMaterial. */
export function paintRamp(steps = 3) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = Math.round(90 + (165 * i) / Math.max(1, steps - 1));
    data.set([v, v, v, 255], i * 4);
  }
  return { width: steps, height: 1, data };
}

export const TEXTURE_NAMES = Object.keys(PAINTERS);

/** Paint one of the named textures into a raw RGBA buffer. */
export function paintTexture(name, { size = 128, seed = 1, base } = {}) {
  const painter = PAINTERS[name];
  if (!painter) throw new Error(`Unknown stand-in texture: ${name}`);
  return painter(size, seed, base);
}

const cache = new Map();
/** Wrap a raw buffer as a three.js texture (cached per name/size/seed/base). */
export function makeTexture(name, options = {}) {
  const key = `${name}|${options.size || 128}|${options.seed || 1}|${options.base || ''}|${options.repeat || 1}`;
  if (cache.has(key)) return cache.get(key);
  const raw = paintTexture(name, options);
  const tex = new DataTexture(raw.data, raw.width, raw.height, RGBAFormat);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.repeat.set(options.repeat || 1, options.repeat || 1);
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}
export function makeSkyTexture(region, { width = 512, height = 256, seed = 1 } = {}) {
  const raw = paintSky(width, height, region, seed);
  const tex = new DataTexture(raw.data, raw.width, raw.height, RGBAFormat);
  tex.colorSpace = SRGBColorSpace;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
export function makeRampTexture(steps = 3) {
  const raw = paintRamp(steps);
  const tex = new DataTexture(raw.data, raw.width, raw.height, RGBAFormat);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

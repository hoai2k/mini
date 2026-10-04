// Canvas renderer. Everything is a procedural paper-cut stand-in: flat
// silhouettes with knife-cut holes, lit from behind, each layer casting a soft
// shadow on the one behind it. When art.get(id) has a delivered image it is
// drawn instead (ids match assets/manifest.json).

import { PALETTE as P, SKIES } from './palette.js';
import { COMMANDS } from './rhythm.js';

export const W = 1280;
export const H = 720;
export const U = 48; // pixels per field unit
const GROUND = 500;
const ARMY_SCREEN_X = 470;
const STRIP_W = 2560;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

let fiberCache = null;
function fiber() {
  if (!fiberCache) fiberCache = fiberTexture();
  return fiberCache;
}

/**
 * One backlit paper panel. From back to front: the shadow it casts on the
 * panel behind, a halo where light spills round its edge, the sheet itself
 * with paper grain, and light glowing through every knife cut.
 */
function cutLayer(w, h, color, shape, holes, opts = {}) {
  const shadow = { dx: 7, dy: 9, blur: 7, alpha: 0.35, ...(opts.shadow || {}) };
  const glow = opts.glow || '#F6D9A0';
  const sil = canvas(w, h);
  const s = sil.getContext('2d');
  s.fillStyle = color;
  shape(s);
  // Paper grain, only where there is paper.
  s.save();
  s.globalCompositeOperation = 'source-atop';
  s.globalAlpha = opts.grain ?? 0.1;
  s.fillStyle = s.createPattern(fiber(), 'repeat');
  s.fillRect(0, 0, w, h);
  s.restore();
  let light = null;
  if (holes) {
    s.globalCompositeOperation = 'destination-out';
    holes(s);
    s.globalCompositeOperation = 'source-over';
    light = canvas(w, h);
    const l = light.getContext('2d');
    l.fillStyle = glow;
    holes(l);
  }
  const out = canvas(w, h);
  const o = out.getContext('2d');
  o.save();
  o.globalAlpha = shadow.alpha;
  o.filter = `blur(${shadow.blur}px) brightness(0)`;
  o.drawImage(sil, shadow.dx, shadow.dy);
  o.drawImage(sil, shadow.dx - w, shadow.dy);
  o.restore();
  if (opts.halo !== 0) {
    // Rim light: a soft bright copy just behind the sheet.
    o.save();
    o.globalAlpha = opts.halo ?? 0.35;
    o.filter = 'blur(5px)';
    const tint = canvas(w, h);
    const t = tint.getContext('2d');
    t.drawImage(sil, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = glow;
    t.fillRect(0, 0, w, h);
    o.drawImage(tint, 0, -2);
    o.restore();
  }
  o.drawImage(sil, 0, 0);
  if (light) {
    // The cuts glow, and the glow bleeds a little onto the paper around them.
    o.save();
    o.globalAlpha = opts.cutGlow ?? 0.55;
    o.filter = 'blur(3px)';
    o.drawImage(light, 0, 0);
    o.filter = 'none';
    o.globalAlpha = (opts.cutGlow ?? 0.55) * 0.9;
    o.drawImage(light, 0, 0);
    o.restore();
  }
  return out;
}

/** Light haze between two panels: the lamp's glow, strongest near the horizon. */
function haze(g, color, top, bottom, alpha) {
  const grad = g.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, color);
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = grad;
  g.fillRect(0, top, W, bottom - top);
  g.restore();
}

function crescent(c, x, y, r, ang) {
  c.beginPath();
  c.arc(x, y, r, ang, ang + Math.PI);
  c.arc(x + Math.cos(ang + Math.PI / 2) * r * 0.35, y + Math.sin(ang + Math.PI / 2) * r * 0.35, r * 0.8, ang + Math.PI, ang, true);
  c.fill();
}

function leaf(c, x, y, len, ang, wid = 0.28) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -len * wid, len, 0);
  c.quadraticCurveTo(len * 0.5, len * wid, 0, 0);
  c.fill();
  c.restore();
}

function star(c, x, y, rOut, rIn, n) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? rIn : rOut;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
}

function fiberTexture() {
  const c = canvas(512, 512);
  const g = c.getContext('2d');
  const r = rng(7);
  const img = g.createImageData(512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + r() * 55;
    img.data[i] = v;
    img.data[i + 1] = v * 0.97;
    img.data[i + 2] = v * 0.9;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(120,100,70,0.18)';
  g.lineWidth = 0.7;
  for (let i = 0; i < 260; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const a = r() * Math.PI * 2;
    const l = 8 + r() * 30;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

export class Renderer {
  constructor(canvasEl, art) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.art = art;
    this.cam = 0;
    this.particles = [];
    this.floaters = [];
    this.flash = { L: -9, R: -9 };
    this.fiber = fiberTexture();
    this.fiberPattern = this.ctx.createPattern(this.fiber, 'repeat');
    this.layers = null;
    this.reduceMotion = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H) || 1;
    this.canvas.width = Math.round(W * scale * dpr);
    this.canvas.height = Math.round(H * scale * dpr);
    this.pixel = scale * dpr;
    this.fiberPattern = this.ctx.createPattern(this.fiber, 'repeat');
  }

  setStage(stage) {
    this.stage = stage;
    this.sky = SKIES[stage.sky];
    this.cam = 0;
    this.particles = [];
    this.floaters = [];
    this.layers = {
      sky: this.buildSky(stage.sky),
      karstFar: this.buildKarst(true),
      karst: this.buildKarst(false),
      grove: this.buildGrove(stage.id === 'garden'),
      paddy: this.buildPaddy(),
      reeds: this.buildReeds(),
    };
  }

  // ---------------------------------------------------------------- layers

  buildSky(kind) {
    const c = canvas(W, H);
    const g = c.getContext('2d');
    const s = SKIES[kind];
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, s.top);
    grad.addColorStop(0.5, s.mid);
    grad.addColorStop(0.8, s.low);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const night = kind === 'night';
    const cx = night ? 930 : 860;
    const cy = night ? 150 : 210;
    const R = night ? 70 : 84;
    // The drum's rings, cut faintly into the sky around the sun or moon.
    g.save();
    g.strokeStyle = s.glow;
    for (let i = 1; i <= 6; i++) {
      g.globalAlpha = 0.16 - i * 0.018;
      g.lineWidth = i % 2 ? 2 : 1;
      g.beginPath();
      g.arc(cx, cy, R + 26 * i, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 0.12;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      g.beginPath();
      g.arc(cx + Math.cos(a) * (R + 39), cy + Math.sin(a) * (R + 39), 7, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
    // Sun or moon: a lit paper disc.
    g.save();
    g.shadowColor = s.glow;
    g.shadowBlur = 70;
    g.fillStyle = s.glow;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.save();
    g.fillStyle = night ? 'rgba(58,76,110,0.35)' : 'rgba(176,122,58,0.4)';
    if (night) {
      const r = rng(3);
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.arc(cx - 40 + r() * 80, cy - 40 + r() * 80, 3 + r() * 9, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      // The sun is the drum's twelve-point star, cut from a bronze disc.
      star(g, cx, cy, R - 12, R * 0.38, 12);
      g.fillStyle = s.glow;
      g.beginPath();
      g.arc(cx, cy, R * 0.22, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    if (kind === 'dawn') {
      // The setting moon, a pale crescent: the moon changes every chapter.
      g.save();
      g.fillStyle = 'rgba(246,240,220,0.75)';
      crescent(g, 250, 120, 26, -0.6);
      g.restore();
    }
    if (night) {
      const r = rng(11);
      g.fillStyle = P.moon;
      for (let i = 0; i < 90; i++) {
        g.globalAlpha = 0.25 + r() * 0.6;
        const x = r() * W;
        const y = r() * H * 0.55;
        if (r() < 0.12) star(g, x, y, 4, 1.2, 4);
        else g.fillRect(x, y, 2, 2);
      }
      g.globalAlpha = 1;
    }
    // Paper clouds: scalloped strips with a row of cut holes, casting a shadow.
    const r = rng(kind.length * 13);
    const cloudColor = night ? '#2E3E62' : kind === 'dawn' ? '#C98E86' : '#EFE6CF';
    for (let i = 0; i < 6; i++) {
      const y = 70 + r() * 230;
      const x = r() * W;
      const len = 140 + r() * 300;
      const cloud = (cc) => {
        cc.beginPath();
        for (let k = 0; k <= len; k += 24) cc.arc(x + k, y, 13 + ((k / 24) % 3) * 5, Math.PI, 0);
        cc.lineTo(x + len, y + 9);
        cc.lineTo(x, y + 9);
        cc.fill();
      };
      g.save();
      g.globalAlpha = 0.3;
      g.fillStyle = '#000';
      g.filter = 'blur(4px)';
      g.translate(5, 7);
      cloud(g);
      g.restore();
      g.fillStyle = cloudColor;
      cloud(g);
      g.save();
      g.fillStyle = s.glow;
      g.globalAlpha = 0.7;
      for (let k = 12; k < len - 10; k += 24) {
        g.beginPath();
        g.arc(x + k, y + 1, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    return c;
  }

  buildKarst(far) {
    const r = rng(far ? 31 : 21);
    const base = far ? 380 : 430;
    const peaks = [];
    for (let x = 0; x < STRIP_W; x += (far ? 90 : 120) + r() * 160) {
      peaks.push({ x, w: 140 + r() * 180, h: (far ? 110 : 90) + r() * (far ? 130 : 170) });
    }
    const peakPath = (g, p, x, k = 1) => {
      const h = p.h * k;
      const w = p.w * k;
      g.moveTo(x - w / 2, base);
      g.bezierCurveTo(x - w * 0.55, base - h * 0.8, x - w * 0.25, base - h, x, base - h);
      g.bezierCurveTo(x + w * 0.3, base - h, x + w * 0.5, base - h * 0.7, x + w / 2, base);
      g.closePath();
    };
    const shape = (g) => {
      g.beginPath();
      for (const shift of [-STRIP_W, 0, STRIP_W]) for (const p of peaks) peakPath(g, p, p.x + shift);
      g.fill();
      g.fillRect(0, base - 20, STRIP_W, H);
    };
    const holes = (g) => {
      const rr = rng(far ? 6 : 5);
      for (const shift of [-STRIP_W, 0, STRIP_W]) {
        for (const p of peaks) {
          const x = p.x + shift;
          // A dotted contour inside each peak, like a stitched seam of light.
          for (let t = 0.08; t < 0.92; t += 0.045) {
            const a = Math.PI * (1 - t);
            const px = x + Math.cos(a) * p.w * 0.3;
            const py = base - 16 - Math.sin(a) * p.h * 0.72;
            g.beginPath();
            g.arc(px, py, far ? 1.4 : 1.8, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      // Mist bands and herons.
      for (let i = 0; i < 30; i++) {
        const x = rr() * STRIP_W;
        const y = base - 140 + rr() * 120;
        g.fillRect(x, y, 40 + rr() * 160, far ? 2 : 3);
      }
      if (!far) {
        for (let i = 0; i < 10; i++) {
          const x = rr() * STRIP_W;
          const y = 120 + rr() * 140;
          leaf(g, x, y, 22, -0.3, 0.18);
          leaf(g, x, y, 22, Math.PI + 0.3, 0.18);
          leaf(g, x + 4, y + 1, 12, 0.2, 0.25);
        }
      }
    };
    const color = far ? this.sky.far0 : this.sky.far;
    return cutLayer(STRIP_W, H, color, shape, holes, {
      shadow: { dx: 6, dy: 8, blur: 10, alpha: far ? 0.15 : 0.25 },
      glow: this.sky.glow,
      halo: far ? 0.2 : 0.3,
      cutGlow: far ? 0.35 : 0.5,
    });
  }

  buildGrove(garden) {
    const r = rng(garden ? 44 : 45);
    const items = [];
    for (let x = 0; x < STRIP_W; x += 70 + r() * 150) {
      const roll = r();
      const kind = roll < 0.2 ? 'house' : roll < 0.5 ? 'palm' : roll < 0.75 ? 'bamboo' : garden ? 'shrub' : 'palm';
      items.push({ x, kind, h: 140 + r() * 120, s: r() });
    }
    const top = (it) => GROUND - 40 - it.h;
    const fronds = (it) => Array.from({ length: 9 }, (_, i) => -Math.PI + (i / 8) * Math.PI + 0.15 * Math.sin(i + it.s * 7));
    const draw = (g, it, x) => {
      if (it.kind === 'palm') {
        g.beginPath();
        g.moveTo(x - 4, GROUND);
        g.quadraticCurveTo(x - 2 + it.s * 14, GROUND - it.h * 0.6, x, top(it));
        g.lineTo(x + 3, top(it));
        g.quadraticCurveTo(x + 2 + it.s * 14, GROUND - it.h * 0.6, x + 4, GROUND);
        g.fill();
        for (const a of fronds(it)) leaf(g, x, top(it), 74, a, 0.2);
      } else if (it.kind === 'bamboo') {
        for (let k = -1; k <= 1; k++) {
          const bx = x + k * 9;
          const t = GROUND - 40 - it.h * (0.8 + 0.2 * Math.abs(k));
          g.fillRect(bx - 2, t, 4, GROUND - t);
          for (let j = 0; j < 6; j++) leaf(g, bx, t + j * 24, 30, j % 2 ? -0.4 : Math.PI + 0.4, 0.2);
        }
      } else if (it.kind === 'shrub') {
        for (let k = 0; k < 7; k++) {
          g.beginPath();
          g.arc(x + (k - 3) * 16, GROUND - 30 - Math.sin((k / 6) * Math.PI) * 34, 22, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        // Stilt house with a saddle roof, as on the drum.
        const by = GROUND - 70;
        for (const px of [-40, -14, 14, 40]) g.fillRect(x + px - 2, by, 4, 60);
        g.fillRect(x - 46, by - 34, 92, 34);
        g.beginPath();
        g.moveTo(x - 84, by - 76);
        g.quadraticCurveTo(x, by - 22, x + 84, by - 76);
        g.lineTo(x + 60, by - 30);
        g.lineTo(x - 60, by - 30);
        g.closePath();
        g.fill();
        // Bird finials on the roof ends.
        leaf(g, x - 84, by - 76, 16, -2.4, 0.3);
        leaf(g, x + 84, by - 76, 16, -0.7, 0.3);
      }
    };
    const shape = (g) => {
      for (const shift of [-STRIP_W, 0, STRIP_W]) for (const it of items) draw(g, it, it.x + shift);
      g.fillRect(0, GROUND - 46, STRIP_W, 60);
    };
    const holes = (g) => {
      for (const shift of [-STRIP_W, 0, STRIP_W]) {
        for (const it of items) {
          const x = it.x + shift;
          if (it.kind === 'palm') {
            // Vein slits down every frond.
            for (const a of fronds(it)) leaf(g, x + Math.cos(a) * 14, top(it) + Math.sin(a) * 14, 46, a, 0.025);
          } else if (it.kind === 'bamboo') {
            for (let k = -1; k <= 1; k++) {
              const t = GROUND - 40 - it.h * (0.8 + 0.2 * Math.abs(k));
              for (let y = t + 20; y < GROUND - 50; y += 26) g.fillRect(x + k * 9 - 2, y, 4, 1.5);
            }
          } else if (it.kind === 'shrub') {
            for (let k = 0; k < 7; k++) {
              const fx = x + (k - 3) * 16;
              const fy = GROUND - 30 - Math.sin((k / 6) * Math.PI) * 34;
              star(g, fx, fy, 7, 2.5, 5);
            }
          } else {
            const by = GROUND - 70;
            for (let k = -3; k <= 3; k++) g.fillRect(x + k * 12 - 3, by - 28, 6, 18);
            for (let k = -5; k <= 5; k++) {
              g.beginPath();
              g.arc(x + k * 12, by - 50 + Math.abs(k) * -2.5, 2.2, 0, Math.PI * 2);
              g.fill();
            }
          }
        }
      }
    };
    return cutLayer(STRIP_W, H, this.sky.mid2, shape, holes, { glow: this.sky.glow, halo: 0.3, cutGlow: 0.4 });
  }

  buildPaddy() {
    const shape = (g) => {
      g.beginPath();
      g.moveTo(0, GROUND);
      for (let x = 0; x <= STRIP_W; x += 32) g.quadraticCurveTo(x + 16, GROUND - 7, x + 32, GROUND);
      g.lineTo(STRIP_W, H);
      g.lineTo(0, H);
      g.fill();
      // Rice sprouts along the bank.
      for (let x = 6; x < STRIP_W; x += 22) {
        leaf(g, x, GROUND + 2, 14, -1.9, 0.18);
        leaf(g, x, GROUND + 2, 12, -1.2, 0.18);
      }
    };
    const holes = (g) => {
      // Water between rice rows catching the light, kept faint under the HUD.
      for (let row = 0; row < 6; row++) {
        const y = GROUND + 30 + row * 30;
        for (let x = (row % 2) * 40; x < STRIP_W; x += 80) g.fillRect(x, y, 46 - row * 3, 1.5 + row * 0.3);
      }
    };
    return cutLayer(STRIP_W, H, this.sky.ground, shape, holes, {
      shadow: { dx: 0, dy: -6, blur: 8, alpha: 0.3 },
      glow: this.sky.glow,
      halo: 0.25,
      cutGlow: 0.14,
    });
  }

  buildReeds() {
    const r = rng(77);
    const lotus = [];
    const shape = (g) => {
      for (const shift of [-STRIP_W, 0, STRIP_W]) {
        for (let x = 0; x < STRIP_W; x += 18 + r() * 40) {
          const px = x + shift;
          const h = 40 + r() * 90;
          g.beginPath();
          g.moveTo(px - 3, H);
          g.quadraticCurveTo(px + 6, H - h * 0.6, px + 14 * (r() - 0.3), H - h);
          g.quadraticCurveTo(px + 4, H - h * 0.5, px + 3, H);
          g.fill();
          if (r() < 0.16) {
            // Lotus pad and, sometimes, a flower on a long stem.
            g.beginPath();
            g.ellipse(px + 20, H - 14, 34, 10, 0, 0.2, Math.PI * 2 - 0.2);
            g.lineTo(px + 20, H - 14);
            g.fill();
            if (shift === 0) lotus.push(px + 20);
            if (r() < 0.5) {
              const fy = H - 70 - r() * 30;
              g.fillRect(px + 38, fy, 2, H - fy);
              for (let k = -2; k <= 2; k++) leaf(g, px + 39, fy, 22 - Math.abs(k) * 3, -Math.PI / 2 + k * 0.38, 0.32);
            }
          }
        }
      }
    };
    const holes = (g) => {
      for (const shift of [-STRIP_W, 0, STRIP_W]) {
        for (const lx of lotus) {
          for (let k = 0; k < 6; k++) leaf(g, lx + shift, H - 14, 26, Math.PI + 0.25 + k * 0.5, 0.05);
        }
      }
    };
    return cutLayer(STRIP_W, H, P.ink, shape, holes, {
      shadow: { dx: 0, dy: -10, blur: 12, alpha: 0.4 },
      glow: this.sky.glow,
      halo: 0.4,
      cutGlow: 0.5,
    });
  }

  strip(img, factor, y = 0) {
    const g = this.ctx;
    const off = (((this.cam * factor) % STRIP_W) + STRIP_W) % STRIP_W;
    g.drawImage(img, -off, y);
    if (STRIP_W - off < W) g.drawImage(img, STRIP_W - off, y);
  }

  layer(id, fallback, factor) {
    const img = this.art.get(id);
    if (img) {
      const h = H;
      const w = (img.width / img.height) * h;
      const g = this.ctx;
      const off = (((this.cam * factor) % w) + w) % w;
      for (let x = -off; x < W; x += w) g.drawImage(img, x, 0, w, h);
    } else this.strip(fallback, factor);
  }

  // ---------------------------------------------------------------- figures

  /** A Lạc Việt warrior woman, facing right. */
  warrior(x, y, s, pose, t, archer) {
    const g = this.ctx;
    const img = this.art.get(archer ? 'unit-archer' : 'unit-spear');
    if (img) return this.sprite(img, x, y, 92 * s, pose);
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    const bob = pose.bob;
    g.translate(0, -bob);
    g.fillStyle = P.ink;
    // Skirt and body.
    g.beginPath();
    g.moveTo(-11, 0);
    g.lineTo(11, 0);
    g.lineTo(6, -30);
    g.lineTo(-6, -30);
    g.fill();
    g.fillRect(-5, -52, 10, 24);
    // Head, bun, feathered crown fanning back.
    g.beginPath();
    g.arc(1, -60, 7, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 5; i++) leaf(g, -2, -64, 26 - i * 2, -Math.PI * 0.62 - i * 0.16, 0.14);
    // Lacquer sash.
    g.fillStyle = P.lacquer;
    g.fillRect(-6, -36, 12, 4);
    // Cut detail: a band of dots round the skirt, an eye, a bead collar.
    this.cutLight(g);
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.arc(k * 3.6, -12, 1.1, 0, Math.PI * 2);
      g.fill();
    }
    g.fillRect(-7 + 1, -21, 12, 1);
    g.beginPath();
    g.arc(4, -61, 1, 0, Math.PI * 2);
    g.fill();
    g.fillRect(-3, -50, 7, 1);
    this.endCut(g);
    g.fillStyle = P.ink;
    if (archer) {
      g.save();
      g.translate(9, -46);
      g.rotate(pose.raise ? -0.7 : -0.2);
      g.lineWidth = 2.4;
      g.strokeStyle = P.ink;
      g.beginPath();
      g.arc(0, 0, 18, -1.2, 1.2);
      g.stroke();
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(Math.cos(-1.2) * 18, Math.sin(-1.2) * 18);
      g.lineTo(pose.raise ? -4 : 2, 0);
      g.lineTo(Math.cos(1.2) * 18, Math.sin(1.2) * 18);
      g.stroke();
      g.restore();
    } else {
      // Spear: levelled on a thrust, upright otherwise.
      g.save();
      g.translate(6, -44);
      g.rotate(pose.thrust ? 1.45 : 0.2);
      g.translate(pose.thrust * 10, 0);
      g.fillRect(-1.3, -44, 2.6, 70);
      g.beginPath();
      g.moveTo(0, -56);
      g.lineTo(4, -44);
      g.lineTo(-4, -44);
      g.fill();
      g.restore();
    }
    if (pose.shield) {
      g.beginPath();
      g.ellipse(13, -38, 7, 18, 0, 0, Math.PI * 2);
      g.fill();
      this.cutLight(g);
      star(g, 13, -38, 5, 2, 8);
      this.endCut(g);
    }
    g.restore();
  }

  /** A Han soldier, facing left: iron grey, conical cap, lamellar coat. */
  hanSoldier(e, x, y, t, beatPhase) {
    const g = this.ctx;
    const crossbow = e.type === 'crossbow';
    const img = this.art.get(crossbow ? 'han-crossbow' : 'han-spear');
    if (img) return this.sprite(img, x, y, 96, { bob: 0 }, e);
    g.save();
    g.translate(x, y - (crossbow ? 0 : Math.abs(Math.sin(beatPhase * Math.PI)) * 2));
    g.fillStyle = P.ironDark;
    if (crossbow) {
      // Kneeling crossbowman.
      g.fillRect(-10, -16, 20, 16);
      g.fillRect(-6, -40, 12, 26);
      g.beginPath();
      g.arc(-1, -47, 7, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-26, -38, 24, 3);
      g.fillRect(-24, -44, 3, 14);
    } else {
      g.beginPath();
      g.moveTo(-10, 0);
      g.lineTo(10, 0);
      g.lineTo(7, -32);
      g.lineTo(-7, -32);
      g.fill();
      g.fillRect(-6, -54, 12, 24);
      g.beginPath();
      g.arc(-1, -61, 7, 0, Math.PI * 2);
      g.fill();
      // Halberd (ji).
      g.fillRect(-14, -96, 2.6, 92);
      g.fillRect(-22, -86, 10, 2.5);
    }
    // Conical cap.
    g.beginPath();
    const hy = crossbow ? -50 : -64;
    g.moveTo(-9, hy);
    g.lineTo(-1, hy - 13);
    g.lineTo(7, hy);
    g.fill();
    // Lamellar: rows of small cut slots that let the light through.
    this.cutLight(g);
    const top = crossbow ? -38 : -52;
    for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++) g.fillRect(-5 + k * 4, top + 4 + row * 6, 2, 3);
    this.endCut(g);
    g.fillStyle = P.iron;
    g.fillRect(-6, top + 20, 12, 3);
    g.restore();
    this.hpBar(x, y - 108, e);
  }

  fort(e, x, y) {
    const g = this.ctx;
    const img = this.art.get('fort-palisade');
    if (img) {
      this.sprite(img, x + 60, y, 300, { bob: 0 }, e);
      return this.hpBar(x + 60, y - 290, e, 140);
    }
    g.save();
    g.translate(x, y);
    g.fillStyle = P.ironDark;
    for (let i = 0; i < 16; i++) {
      const px = -20 + i * 13;
      g.beginPath();
      g.moveTo(px, 0);
      g.lineTo(px, -110);
      g.lineTo(px + 6, -122);
      g.lineTo(px + 12, -110);
      g.lineTo(px + 12, 0);
      g.fill();
    }
    // Watchtower with a tiled roof.
    g.fillRect(70, -230, 8, 230);
    g.fillRect(130, -230, 8, 230);
    g.fillRect(60, -250, 90, 44);
    g.beginPath();
    g.moveTo(40, -250);
    g.quadraticCurveTo(105, -262, 170, -250);
    g.lineTo(150, -290);
    g.lineTo(60, -290);
    g.closePath();
    g.fill();
    g.fillRect(104, -340, 3, 52);
    g.fillStyle = P.iron;
    g.beginPath();
    g.moveTo(107, -340);
    g.lineTo(150, -330);
    g.lineTo(107, -316);
    g.fill();
    this.cutLight(g);
    for (let k = 0; k < 4; k++) g.fillRect(70 + k * 20, -238, 10, 18);
    this.endCut(g);
    // Damage: the paper tears away from the top.
    const lost = 1 - e.hp / e.maxHp;
    if (lost > 0) {
      this.cutLight(g);
      const r = rng(e.id + 1);
      for (let i = 0; i < Math.floor(lost * 24); i++) {
        g.beginPath();
        const cx = -20 + r() * 210;
        const cy = -100 - r() * 160;
        g.moveTo(cx, cy);
        g.lineTo(cx + 14 + r() * 20, cy + r() * 18);
        g.lineTo(cx + r() * 10, cy + 20 + r() * 20);
        g.fill();
      }
      this.endCut(g);
    }
    g.restore();
    this.hpBar(x + 90, y - 360, e, 140);
  }

  target(e, x, y, t) {
    const g = this.ctx;
    const img = this.art.get('straw-target');
    if (img) return this.sprite(img, x, y, 110, { bob: 0 }, e);
    g.save();
    g.translate(x, y);
    const hitShake = Math.max(0, (e.shake || 0) - t);
    g.rotate(Math.sin(t * 40) * hitShake * 0.4);
    g.fillStyle = P.ink;
    g.fillRect(-3, -90, 6, 90);
    g.fillRect(-26, -76, 52, 5);
    g.fillStyle = P.straw;
    g.beginPath();
    g.ellipse(0, -66, 16, 28, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(0, -104, 11, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = P.ink;
    g.lineWidth = 2;
    for (const yy of [-82, -66, -50]) {
      g.beginPath();
      g.moveTo(-14, yy);
      g.lineTo(14, yy);
      g.stroke();
    }
    g.restore();
    this.hpBar(x, y - 126, e, 50);
  }

  /** Knife cuts in a figure: light from the lamp shows through them. */
  cutLight(g) {
    g.save();
    g.shadowColor = this.sky.glow;
    g.shadowBlur = 4;
    g.fillStyle = this.sky.glow;
    g.strokeStyle = this.sky.glow;
  }

  endCut(g) {
    g.restore();
  }

  /** Light from behind spills round a figure's edge. */
  backlit() {
    const g = this.ctx;
    g.shadowColor = this.sky.glow;
    g.shadowBlur = 9;
    g.shadowOffsetX = 0;
    g.shadowOffsetY = -1;
  }

  /** The shadow a backlit figure throws forward onto the ground. */
  footShadow(x, w) {
    const g = this.ctx;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(x, GROUND + 12, w, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  hpBar(x, y, e, w = 44) {
    if (e.hp >= e.maxHp) return;
    const g = this.ctx;
    g.fillStyle = 'rgba(22,21,26,0.6)';
    g.fillRect(x - w / 2, y, w, 5);
    g.fillStyle = P.paper;
    g.fillRect(x - w / 2, y, (w * e.hp) / e.maxHp, 5);
  }

  sprite(img, x, y, h, pose = { bob: 0 }) {
    const w = (img.width / img.height) * h;
    this.ctx.drawImage(img, x - w / 2, y - h - (pose.bob || 0), w, h);
  }

  /** The bronze drum with both sisters: on a carrying frame, or the elephant. */
  drumCrew(x, y, view) {
    const g = this.ctx;
    const t = view.songTime;
    const armL = Math.max(0, 1 - (t - this.flash.L) * 6);
    const armR = Math.max(0, 1 - (t - this.flash.R) * 6);
    if (view.battle.elephant) {
      const charging = view.battle.order && view.battle.order.command === 'charge';
      const step = charging ? Math.sin(t * 14) * 4 : Math.sin(view.beatFloat * Math.PI) * 1.5;
      const img = this.art.get('war-elephant');
      if (img) this.sprite(img, x, y, 230, { bob: step });
      else this.elephant(x, y - Math.abs(step), view);
      this.sisters(x - 8, y - 160 - Math.abs(step), armL, armR, view);
    } else {
      const img = this.art.get('drum-bearers');
      if (img) this.sprite(img, x, y, 150, { bob: 0 });
      else {
        g.fillStyle = P.ink;
        g.fillRect(x - 60, y - 52, 120, 5); // carrying pole
        for (const px of [-64, 58]) this.warrior(x + px, y, 0.9, { bob: 0, thrust: 0 }, t, false);
        this.bronzeDrum(x, y - 18, 34, view);
      }
      this.sisters(x, y - 52, armL, armR, view);
    }
  }

  bronzeDrum(x, y, r, view) {
    const g = this.ctx;
    const pulse = view.spirit ? 0.5 + 0.5 * Math.sin(view.songTime * 8) : 0;
    g.save();
    g.fillStyle = P.bronze;
    g.shadowColor = view.spirit ? P.bronzeLight : 'transparent';
    g.shadowBlur = 20 * pulse;
    g.beginPath();
    g.moveTo(x - r, y - r * 0.9);
    g.lineTo(x + r, y - r * 0.9);
    g.quadraticCurveTo(x + r * 0.7, y, x + r * 0.85, y + r * 0.5);
    g.lineTo(x - r * 0.85, y + r * 0.5);
    g.quadraticCurveTo(x - r * 0.7, y, x - r, y - r * 0.9);
    g.fill();
    g.restore();
    g.fillStyle = P.bronzeLight;
    g.beginPath();
    g.ellipse(x, y - r * 0.9, r, r * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.ink;
    for (let k = 0; k < 3; k++) g.fillRect(x - r * 0.8, y - r * 0.55 + k * 9, r * 1.6, 1.5);
  }

  sisters(x, y, armL, armR, view) {
    const g = this.ctx;
    const imgT = this.art.get('sister-trac');
    const imgN = this.art.get('sister-nhi');
    if (imgT && imgN) {
      this.sprite(imgT, x - 30, y, 96, { bob: armL * 3 });
      this.sprite(imgN, x + 30, y, 96, { bob: armR * 3 });
      return;
    }
    const one = (sx, arm, side, gold) => {
      g.save();
      g.translate(sx, y);
      g.fillStyle = P.ink;
      g.beginPath();
      g.moveTo(-12, 0);
      g.lineTo(12, 0);
      g.lineTo(7, -36);
      g.lineTo(-7, -36);
      g.fill();
      g.fillRect(-6, -60, 12, 26);
      g.beginPath();
      g.arc(0, -68, 8, 0, Math.PI * 2);
      g.fill();
      // Tall gold crown of feathers.
      g.fillStyle = gold;
      for (let i = 0; i < 7; i++) leaf(g, 0, -72, 34, -Math.PI / 2 + (i - 3) * 0.2, 0.12);
      g.fillRect(-7, -48, 14, 5);
      g.fillStyle = P.ink;
      this.cutLight(g);
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.arc(0, -24 + k * 7, 1.6, 0, Math.PI * 2);
        g.fill();
      }
      star(g, 0, -56, 3.5, 1.3, 6);
      this.endCut(g);
      // Drumstick arm swings down on a hit.
      g.fillStyle = P.ink;
      g.save();
      g.translate(side * 4, -54);
      g.rotate(side * (-1.9 + arm * 1.3));
      g.fillRect(-2, 0, 4, 26);
      g.fillRect(-1.5, 24, 3, 14);
      g.restore();
      g.restore();
    };
    one(x - 24, armL, 1, P.bronzeLight); // Trắc, the centre
    one(x + 24, armR, -1, P.lacquer); // Nhị, the rim
    if (!view.battle.elephant) return;
    this.bronzeDrum(x, y + 6, 26, view);
  }

  elephant(x, y, view) {
    const g = this.ctx;
    g.save();
    g.translate(x, y);
    g.fillStyle = P.ink;
    const legPhase = view.songTime * (view.battle.order && view.battle.order.command === 'charge' ? 14 : 4);
    for (const [lx, ph] of [[-60, 0], [-34, 1.5], [36, 0.7], [62, 2.2]]) {
      g.fillRect(lx - 9, -60 + Math.sin(legPhase + ph) * 3, 18, 60);
    }
    g.beginPath();
    g.ellipse(0, -100, 92, 58, 0, 0, Math.PI * 2);
    g.fill();
    // Head, ear, trunk curling forward.
    g.beginPath();
    g.ellipse(86, -118, 40, 42, 0.2, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 16;
    g.lineCap = 'round';
    g.strokeStyle = P.ink;
    g.beginPath();
    g.moveTo(112, -104);
    g.quadraticCurveTo(140, -60, 128, -22);
    g.quadraticCurveTo(124, -10, 136, -12);
    g.stroke();
    g.fillStyle = P.paper;
    g.beginPath();
    g.moveTo(112, -96);
    g.quadraticCurveTo(138, -92, 150, -112);
    g.lineTo(146, -104);
    g.quadraticCurveTo(136, -88, 112, -90);
    g.fill();
    // Cut ornament on the caparison: rings and a star, like the drum.
    this.cutLight(g);
    g.beginPath();
    g.arc(70, -128, 4, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(-4, -96, 64, 30, 0, 0, Math.PI * 2);
    g.stroke();
    star(g, -4, -96, 20, 8, 10);
    // Tangential circles round the caparison, leg bands, ear and eye.
    g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.beginPath();
      g.arc(-4 + Math.cos(a) * 48, -96 + Math.sin(a) * 22, 3.2, 0, Math.PI * 2);
      g.stroke();
    }
    for (const lx of [-60, -34, 36, 62]) g.fillRect(lx - 8, -22, 16, 2);
    g.beginPath();
    g.ellipse(76, -112, 18, 24, 0.25, -1.2, 1.9);
    g.stroke();
    for (let k = 0; k < 4; k++) g.fillRect(118 + k * 2, -84 + k * 16, 9, 1.5);
    this.endCut(g);
    // Howdah.
    g.fillStyle = P.lacquer;
    g.fillRect(-50, -170, 92, 14);
    g.fillStyle = P.ink;
    g.fillRect(-46, -160, 4, 12);
    g.fillRect(34, -160, 4, 12);
    g.restore();
  }

  // ---------------------------------------------------------------- effects

  spawn(events, view) {
    const t = view.songTime;
    for (const ev of events) {
      if (ev.type === 'damage') {
        const sx = ev.x * U;
        const e = view.battle.enemies.find((n) => n.id === ev.target);
        if (e) e.shake = t + 0.25;
        this.scraps(sx, GROUND - 60, ev.source === 'elephant' ? 18 : 6, [P.paper, P.lacquer, P.straw]);
        this.floaters.push({ x: sx, y: GROUND - 140, text: `${Math.round(ev.amount)}`, t, color: P.paper });
      } else if (ev.type === 'defeated') {
        this.scraps(ev.x * U, GROUND - 60, 26, [P.ironDark, P.iron, P.paper, P.straw]);
      } else if (ev.type === 'volley') {
        for (let i = 0; i < 6; i++) this.projectile(ev.from * U - i * 10, ev.to * U, t + i * 0.03, P.ink, 1);
      } else if (ev.type === 'bolts') {
        const n = ev.enemy === 'fort' ? 8 : 3;
        for (let i = 0; i < n; i++) this.projectile(ev.from * U + 40, ev.to * U - 60 - i * 20, t + i * 0.04, P.ironDark, -1);
      } else if (ev.type === 'wound') {
        const ax = view.battle.army.x * U;
        this.scraps(ax - 30, GROUND - 50, ev.shielded ? 3 : 8, ev.shielded ? [P.bronzeLight] : [P.lacquer, P.ink]);
        if (ev.shielded) this.floaters.push({ x: ax, y: GROUND - 150, text: 'blocked', t, color: P.bronzeLight });
      } else if (ev.type === 'rally') {
        this.floaters.push({ x: view.battle.army.x * U - 120, y: GROUND - 170, text: `+${Math.round(ev.amount)}`, t, color: P.verdigris });
      } else if (ev.type === 'trample') {
        this.scraps(ev.x * U + 80, GROUND - 10, 40, [P.paper, P.paperShade, P.ink]);
        this.shake = t + 0.35;
      }
    }
  }

  scraps(x, y, n, colors) {
    if (this.reduceMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.3) * 260,
        vy: -120 - Math.random() * 260,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
        s: 4 + Math.random() * 7,
        c: colors[i % colors.length],
        life: 1.2 + Math.random() * 0.6,
      });
    }
  }

  projectile(fromX, toX, t0, color, dir) {
    this.particles.push({ kind: 'arrow', fromX, toX, t0, dur: 0.45, color, dir });
  }

  // ---------------------------------------------------------------- frame

  draw(view, dt) {
    const g = this.ctx;
    const { battle, songTime: t } = view;
    const targetCam = battle.army.x * U - ARMY_SCREEN_X;
    this.cam += (targetCam - this.cam) * Math.min(1, dt * 4);
    let sx = 0;
    if (this.shake && t < this.shake && !this.reduceMotion) sx = (Math.random() - 0.5) * 10;

    g.setTransform(this.pixel, 0, 0, this.pixel, 0, 0);
    g.clearRect(0, 0, W, H);
    const skyImg = this.art.get(`sky-${this.stage.sky}`);
    g.drawImage(skyImg || this.layers.sky, 0, 0, W, H);
    g.translate(sx, 0);
    // Panels from back to front, with the lamp's haze between them.
    this.layer('layer-karst-far', this.layers.karstFar, 0.07);
    haze(g, this.sky.low, 220, 400, 0.3);
    this.layer('layer-karst', this.layers.karst, 0.15);
    haze(g, this.sky.low, 260, GROUND - 30, 0.3);
    this.layer('layer-grove', this.layers.grove, 0.45);
    haze(g, this.sky.glow, GROUND - 60, GROUND + 10, 0.12);
    this.layer('layer-paddy', this.layers.paddy, 1);

    // World space.
    g.save();
    g.translate(-this.cam, 0);
    const beatPhase = view.beatFloat % 1;
    for (const e of battle.enemies) {
      if (!e.alive) continue;
      const x = e.x * U;
      if (x - this.cam < -300 || x - this.cam > W + 300) continue;
      g.save();
      this.footShadow(x + (e.type === 'fort' ? 90 : 0), e.type === 'fort' ? 130 : 22);
      this.backlit();
      if (e.type === 'fort') this.fort(e, x, GROUND);
      else if (e.type === 'target') this.target(e, x, GROUND, t);
      else this.hanSoldier(e, x, GROUND, t, beatPhase);
      g.restore();
    }
    this.army(view);
    this.drawParticles(t, dt);
    g.restore();

    this.layer('layer-reeds', this.layers.reeds, 1.25);
    g.setTransform(this.pixel, 0, 0, this.pixel, 0, 0);
    // Paper fibre over everything, as if the whole scene were one sheet.
    const fiberImg = this.art.get('paper-fiber');
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = 0.22;
    g.fillStyle = fiberImg ? g.createPattern(fiberImg, 'repeat') : this.fiberPattern;
    g.fillRect(0, 0, W, H);
    g.restore();
    // Vignette, like light falling off at the edge of a lightbox.
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10,8,12,0.55)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    this.hud(view);
  }

  army(view) {
    const g = this.ctx;
    const { battle, songTime: t } = view;
    const order = battle.order;
    const cmd = order ? order.command : null;
    const phase = view.beatFloat % 1;
    const bob = this.reduceMotion ? 0 : Math.abs(Math.sin(phase * Math.PI)) * (cmd === 'march' || cmd === 'charge' ? 6 : 2);
    const thrust = cmd === 'strike' ? Math.max(0, Math.sin(phase * Math.PI)) : 0;
    const shielded = battle.beat <= battle.shieldUntil;
    const n = battle.army.troops <= 0 ? 0 : Math.max(1, Math.ceil((battle.army.troops / battle.army.maxTroops) * 12));
    const front = battle.army.x * U;
    g.save();
    for (let i = 0; i < n; i++) this.footShadow(front - 20 - Math.floor(i / 2) * 34 - (i % 2) * 14, 16);
    this.footShadow(front - (battle.elephant ? 360 : 330), battle.elephant ? 110 : 80);
    this.backlit();
    const crewX = front - (battle.elephant ? 360 : 330);
    this.drumCrew(crewX, GROUND, view);
    for (let i = 0; i < n; i++) {
      const archer = i >= 8;
      const row = i % 2;
      const col = Math.floor(i / 2);
      const x = front - 20 - col * 34 - row * 14;
      const y = GROUND + row * 10;
      const stagger = this.reduceMotion ? 0 : Math.sin(t * 3 + i) * 0.6;
      this.warrior(x, y, 1 - row * 0.06, { bob: bob + stagger, thrust, shield: shielded, raise: cmd === 'strike' }, t, archer);
    }
    g.restore();
  }

  drawParticles(t, dt) {
    const g = this.ctx;
    this.particles = this.particles.filter((p) => {
      if (p.kind === 'arrow') {
        const k = (t - p.t0) / p.dur;
        if (k < 0) return true;
        if (k > 1) return false;
        const x = p.fromX + (p.toX - p.fromX) * k;
        const y = GROUND - 80 - Math.sin(k * Math.PI) * 120;
        const ang = Math.atan2(-Math.cos(k * Math.PI) * 120 * Math.PI, p.toX - p.fromX);
        g.save();
        g.translate(x, y);
        g.rotate(ang);
        g.fillStyle = p.color;
        g.fillRect(-14, -1, 28, 2);
        g.beginPath();
        g.moveTo(16, 0);
        g.lineTo(10, -3);
        g.lineTo(10, 3);
        g.fill();
        g.restore();
        return true;
      }
      p.life -= dt;
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y = Math.min(GROUND + 14, p.y + p.vy * dt);
      if (p.y >= GROUND + 14) p.vx *= 0.8;
      p.r += p.vr * dt;
      g.save();
      g.globalAlpha = Math.max(0, Math.min(1, p.life));
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      g.beginPath();
      g.moveTo(-p.s, -p.s * 0.4);
      g.lineTo(p.s, -p.s * 0.6);
      g.lineTo(p.s * 0.3, p.s * 0.6);
      g.fill();
      g.restore();
      return p.life > 0;
    });
    this.floaters = this.floaters.filter((f) => {
      const k = t - f.t;
      if (k > 1) return false;
      g.save();
      g.globalAlpha = 1 - k;
      g.font = '600 20px "Cormorant Garamond", Georgia, serif';
      g.textAlign = 'center';
      g.fillStyle = f.color;
      g.fillText(f.text, f.x, f.y - k * 40);
      g.restore();
      return true;
    });
  }

  // ---------------------------------------------------------------- HUD

  hud(view) {
    const g = this.ctx;
    const t = view.songTime;
    const cx = W / 2;
    const cy = H - 80;
    const R = 64;
    const beatInMeasure = ((Math.floor(view.beatFloat) % 4) + 4) % 4;
    const beatPhase = view.beatFloat - Math.floor(view.beatFloat);
    const responding = view.inResponse;

    // The drum face (tympanum): rings, herons, the star.
    const img = this.art.get('hud-drum');
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)';
    g.shadowBlur = 14;
    g.shadowOffsetY = 6;
    if (img) g.drawImage(img, cx - R, cy - R, R * 2, R * 2);
    else {
      g.fillStyle = P.bronze;
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    if (!img) {
      g.strokeStyle = P.ink;
      g.globalAlpha = 0.55;
      for (const rr of [R - 6, R - 20, R - 24, R - 38]) {
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(cx, cy, rr, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    // Four herons around the ring: one per beat of the measure.
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i / 4) * Math.PI * 2;
      const hx = cx + Math.cos(a) * (R - 13);
      const hy = cy + Math.sin(a) * (R - 13);
      const lit = i === beatInMeasure;
      g.fillStyle = lit ? (responding ? P.verdigris : P.paper) : 'rgba(22,21,26,0.6)';
      g.save();
      g.translate(hx, hy);
      g.rotate(a + Math.PI / 2);
      leaf(g, 0, 0, lit ? 13 : 10, -0.4, 0.3);
      leaf(g, 0, 0, lit ? 13 : 10, Math.PI + 0.4, 0.3);
      g.restore();
    }
    // Star pulses on the beat; flashes on hits.
    const pulse = Math.max(0, 1 - beatPhase * 3);
    const fl = Math.max(0, 1 - (t - this.flash.L) * 5);
    const fr = Math.max(0, 1 - (t - this.flash.R) * 5);
    g.fillStyle = view.spirit ? P.bronzeLight : P.paper;
    g.globalAlpha = 0.5 + 0.5 * Math.max(pulse * 0.6, fl);
    star(g, cx, cy, R - 42 + fl * 6, 12, 12);
    g.globalAlpha = 1;
    if (fr > 0) {
      g.strokeStyle = P.lacquer;
      g.globalAlpha = fr;
      g.lineWidth = 6;
      g.beginPath();
      g.arc(cx, cy, R - 2, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }

    // The phrase being drummed: four slots.
    const slotY = cy - R - 26;
    for (let i = 0; i < 4; i++) {
      const x = cx - 54 + i * 36;
      const d = view.phrase[i];
      g.strokeStyle = P.paper;
      g.globalAlpha = 0.6;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, slotY, 11, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
      if (d) this.glyph(x, slotY, d, 11);
    }
    g.font = '600 15px "Be Vietnam Pro", system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = P.paper;
    if (responding && view.responseCommand) {
      const c = COMMANDS.find((k) => k.id === view.responseCommand);
      g.fillText(`${c.name}! — ${c.gloss}`, cx, slotY - 26);
    }

    // Judgement text.
    if (view.feedback && t - view.feedback.t < 0.6) {
      const k = (t - view.feedback.t) / 0.6;
      g.globalAlpha = 1 - k;
      g.font = '700 26px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = view.feedback.color;
      g.fillText(view.feedback.text, cx, slotY - 50 - k * 16);
      g.globalAlpha = 1;
    }

    // Combo and the waking drum.
    if (view.combo > 1) {
      g.font = '700 22px "Cormorant Garamond", Georgia, serif';
      g.textAlign = 'left';
      g.fillStyle = view.spirit ? P.bronzeLight : P.paper;
      g.fillText(view.spirit ? `Trống thức — the drum wakes ×${view.combo}` : `Chain ×${view.combo}`, cx + R + 22, cy + 8);
    }

    // Command list, kept low so it stays clear of the field.
    g.textAlign = 'left';
    const list = COMMANDS.filter((c) => view.unlocked.includes(c.id));
    const px = 22;
    const rowH = 23;
    let py = H - 16 - (list.length - 1) * rowH;
    g.fillStyle = 'rgba(22,21,26,0.55)';
    g.fillRect(px - 10, py - 20, 268, list.length * rowH + 10);
    for (const c of list) {
      [...c.pattern].forEach((d, i) => this.glyph(px + 7 + i * 18, py - 5, d, 6.5));
      g.font = '600 15px "Be Vietnam Pro", system-ui, sans-serif';
      g.fillStyle = view.responseCommand === c.id && responding ? P.bronzeLight : P.paper;
      g.fillText(`${c.name}  ·  ${c.gloss}`, px + 84, py);
      py += rowH;
    }

    // Troops and goal.
    const b = view.battle;
    this.bar(24, 22, 280, b.army.troops / b.army.maxTroops, 'Nghĩa quân · the army', P.lacquer);
    const goals = b.enemies.filter((e) => e.goal);
    const goalHp = goals.reduce((s, e) => s + Math.max(0, e.hp), 0) / goals.reduce((s, e) => s + e.maxHp, 0);
    this.bar(W - 304, 22, 280, goalHp, goals[0].type === 'fort' ? 'Han fort' : 'Straw targets', P.iron);

    if (view.hint) {
      g.font = '500 18px "Be Vietnam Pro", system-ui, sans-serif';
      g.textAlign = 'center';
      const w = g.measureText(view.hint).width + 36;
      g.fillStyle = 'rgba(22,21,26,0.7)';
      g.fillRect(cx - w / 2, 70, w, 36);
      g.fillStyle = P.paper;
      g.fillText(view.hint, cx, 94);
    }
  }

  glyph(x, y, d, r) {
    const g = this.ctx;
    if (d === 'L') {
      g.fillStyle = P.bronzeLight;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    } else {
      g.strokeStyle = P.lacquer;
      g.fillStyle = P.lacquer;
      g.lineWidth = r * 0.35;
      g.beginPath();
      g.arc(x, y, r * 0.82, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(x, y, r * 0.25, 0, Math.PI * 2);
      g.fill();
    }
  }

  bar(x, y, w, frac, label, color) {
    const g = this.ctx;
    g.fillStyle = 'rgba(22,21,26,0.6)';
    g.fillRect(x, y + 20, w, 10);
    g.fillStyle = color;
    g.fillRect(x, y + 20, w * Math.max(0, frac), 10);
    g.font = '600 14px "Be Vietnam Pro", system-ui, sans-serif';
    g.textAlign = 'left';
    g.fillStyle = P.paper;
    g.fillText(label, x, y + 12);
  }

  hit(drum, t) {
    this.flash[drum] = t;
  }
}

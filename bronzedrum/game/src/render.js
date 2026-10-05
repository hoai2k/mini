// Canvas renderer. Everything is a procedural paper-cut stand-in: flat
// silhouettes with knife-cut holes, lit from behind, each layer casting a soft
// shadow on the one behind it. When art.get(id) has a delivered image it is
// drawn instead (ids match assets/manifest.json).

import { PALETTE as P, SKIES } from './palette.js';
import { COMMANDS, parsePattern } from './rhythm.js';
import { GUARD } from './battle.js';

const ROMAN = ['', 'I', 'II', 'III'];

export const W = 1280;
export const H = 720;
export const U = 48; // pixels per field unit
const GROUND = 500;
const FIELD_TOP = 290; // touch: taps between here and the ground land on the battle
// Small screens (a phone held sideways): below this many CSS pixels per
// logical pixel the HUD text grows to stay legible and the camera moves in
// on the action once it starts.
const COMPACT = 0.7;
const ZOOM_BATTLE = 1.45;
const ZOOM_STORY = 1.2;
const ZOOM_EYE = 400; // the screen height the zoom's focus is drawn at
const ARMY_SCREEN_X = 530; // the front rank's place on screen, leaving room behind for the drums
const STRIP_W = 2560;
// How strongly delivered layers are washed toward each chapter's light.
const LAYER_TINT = { dawn: 0.35, day: 0.25, night: 0.55, dusk: 0.45, foundry: 0.6, ash: 0.5 };
// The touch layout (phones and tablets): a big drum low in the middle, its
// centre the deep stroke and its rim ring the rim stroke, with the shield and
// reset buttons at the bottom right and pause at the top. Centre at the
// bottom edge so it reads as a drum in front of the player.
export const TOUCH = {
  drum: { x: 640, y: 668, r: 100, centre: 0.66, band: 1.3, reach: 1.42 },
  shield: { x: 1170, y: 628, r: 70 },
  reset: { x: 1000, y: 670, r: 36 },
  pause: { x: 640, y: 32, r: 24 },
};

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
    this.pressed = {}; // touch button id -> time pressed
    this.kicks = { chau: -9, mo: -9 }; // when the companion drums were last struck
    this.taps = []; // touch points, drawn as brief rings
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    // Phones and tablets: a lower pixel ratio keeps the frame rate up.
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H) || 1;
    this.canvas.width = Math.round(W * scale * dpr);
    this.canvas.height = Math.round(H * scale * dpr);
    this.pixel = scale * dpr;
    this.cssScale = scale;
    this.compact = scale < COMPACT;
    this.fiberPattern = this.ctx.createPattern(this.fiber, 'repeat');
  }

  setStage(stage) {
    this.stage = stage;
    this.sky = SKIES[stage.sky];
    this.cam = 0;
    this.particles = [];
    this.wakes = [];
    this.floaters = [];
    this.lit = new Map(); // layers lit and scaled for this chapter only
    this.motion = { front: 0, frontM: { x: 0, v: 0 }, crew: { x: -330, v: 0 }, units: [], enemies: new Map() };
    // Each chapter opens on the wide shot; small screens move in once it starts.
    this.zoom = { z: 1, x: W / 2, y: ZOOM_EYE, started: false };
    this.flash = { L: -9, R: -9 };
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
    const night = kind === 'night' || kind === 'foundry';
    const cx = night ? 930 : kind === 'dusk' ? 980 : 860;
    const cy = night ? 150 : kind === 'dusk' ? 330 : kind === 'ash' ? 180 : 210;
    const R = night ? 70 : kind === 'dusk' ? 110 : 84;
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
    if (kind === 'foundry') {
      // Embers drifting up from the furnaces instead of stars.
      const r = rng(17);
      for (let i = 0; i < 80; i++) {
        g.globalAlpha = 0.3 + r() * 0.6;
        g.fillStyle = r() < 0.5 ? '#FFB65C' : '#FF7A3A';
        g.fillRect(r() * W, H * 0.25 + r() * H * 0.5, 2, 2);
      }
      g.globalAlpha = 1;
    } else if (night) {
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

  /**
   * A delivered layer re-lit for this chapter. The painted layers are one
   * colour for every chapter, so each is washed toward the colour its
   * stand-in uses under this chapter's light (paper texture kept), once per
   * chapter.
   */
  litLayer(id, img) {
    // Cached per chapter and per screen size: drawn at exactly the size it
    // appears, so the frame loop never rescales a large image.
    const key = `${id}@${this.stage.sky}@${this.pixel}`;
    if (this.lit.has(key)) return this.lit.get(key);
    const tint = { 'layer-karst-far': 'far0', 'layer-karst': 'far', 'layer-grove': 'mid2', 'layer-paddy': 'ground' }[id];
    const h = Math.round(H * this.pixel);
    const c = canvas(Math.round((img.width / img.height) * h), h);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    if (tint) {
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = LAYER_TINT[this.stage.sky];
      g.fillStyle = this.sky[tint];
      g.fillRect(0, 0, c.width, c.height);
    }
    this.lit.set(key, c);
    return c;
  }

  layer(id, fallback, factor) {
    let img = this.art.get(id);
    if (img) {
      img = this.litLayer(id, img);
      const w = img.width / this.pixel;
      const g = this.ctx;
      const off = (((this.cam * factor) % w) + w) % w;
      for (let x = -off; x < W; x += w) g.drawImage(img, x, 0, w, H);
    } else this.strip(fallback, factor);
  }

  // ---------------------------------------------------------------- figures

  /** A Lạc Việt warrior woman, facing right. */
  warrior(x, y, s, pose, t, archer) {
    const g = this.ctx;
    const img = this.art.get(archer ? 'unit-archer' : 'unit-spear');
    if (img) {
      this.sprite(img, x, y, 92 * s, pose);
      if (pose.shield) this.roundShield(x + 14 * s + (pose.lean || 0), y - 40 * s - (pose.bob || 0), 11 * s, pose.alpha);
      return;
    }
    g.save();
    if (pose.alpha !== undefined) g.globalAlpha *= pose.alpha;
    g.translate(x + (pose.lean || 0), y);
    g.rotate(pose.tilt || 0);
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
      g.rotate(0.2 + 1.25 * Math.min(1, pose.thrust || 0));
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

  /** A round hide shield with a cut star, raised in front of a warrior. */
  roundShield(x, y, r, alpha = 1) {
    const g = this.ctx;
    g.save();
    g.globalAlpha *= alpha;
    g.fillStyle = P.bronze;
    g.beginPath();
    g.ellipse(x, y, r * 0.75, r, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.bronzeLight;
    star(g, x, y, r * 0.6, r * 0.25, 8);
    g.restore();
  }

  /** A Han soldier, facing left: iron grey, conical cap, lamellar coat. */
  hanSoldier(e, x, y, t, beatPhase) {
    const g = this.ctx;
    const crossbow = e.type === 'crossbow';
    const img = this.art.get(crossbow ? 'han-crossbow' : 'han-spear');
    if (img) return this.sprite(img, x, y, 96, e.pose || { bob: 0 });
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

  // ------------------------------------------------------------ chapter scenes
  // Props for the story chapters, at fixed places in the world (the army does
  // not move in them). Each prop draws its delivered art when there is some
  // (ids in assets/manifest.json) and a paper-cut stand-in otherwise.

  scene(view) {
    const t = view.songTime;
    const sess = view.session;
    const call = sess && sess.call;
    const callPulse = call && sess.phase === 'calling' ? this.strokePulse({ start: call.start, u: call.u, strokes: call.pattern.strokes }, t).pulse : 0;
    const caller = view.stage.caller;
    if (caller === 'mourning') {
      this.altar(150, GROUND, sess.index, sess.calls.length, t);
      this.callerDrum(560, GROUND, callPulse, 'mourning');
    } else if (caller === 'village') {
      sess.calls.forEach((c, i) => {
        const x = 40 + i * 125;
        const lit = i < sess.index;
        const calling = i === sess.index && sess.phase === 'calling';
        this.villageHouse(x, GROUND - 4, lit, calling ? callPulse : 0, t, i);
      });
    } else if (caller === 'festival') {
      this.lanternString(-480, 820, 150, sess.index, sess.calls.length, t);
      this.callerDrum(600, GROUND, callPulse, 'festival');
    } else if (caller === 'elegy') {
      sess.calls.forEach((c, i) => {
        const x = 60 + i * 135;
        const silent = i < sess.index;
        const calling = i === sess.index && sess.phase === 'calling';
        this.meltDrum(x, GROUND, silent, calling ? callPulse : 0, i === sess.index);
      });
    } else if (view.mode === 'casting') {
      this.foundry(view, t);
    }
  }

  /**
   * Mã Viện on horseback, watching from the rear of his columns: always near
   * the right edge of the screen, a little behind the field.
   */
  general(view) {
    const g = this.ctx;
    const x = this.cam + 1150;
    const y = GROUND - 30;
    g.save();
    g.globalAlpha = 0.92;
    this.prop('han-general', x, y, 180, () => {
      g.fillStyle = P.ironDark;
      // Horse, facing left.
      g.beginPath();
      g.ellipse(x, y - 70, 50, 24, 0, 0, Math.PI * 2);
      g.fill();
      for (const lx of [-36, -20, 22, 38]) g.fillRect(x + lx - 3, y - 52, 6, 52);
      g.beginPath();
      g.moveTo(x - 40, y - 80);
      g.lineTo(x - 70, y - 120);
      g.lineTo(x - 82, y - 112);
      g.lineTo(x - 56, y - 72);
      g.fill();
      // Rider with a crested helmet and a banner.
      g.fillRect(x - 8, y - 130, 16, 46);
      g.beginPath();
      g.arc(x, y - 138, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = P.lacquer;
      g.fillRect(x - 2, y - 160, 4, 12);
      g.fillStyle = P.ironDark;
      g.fillRect(x + 14, y - 200, 3, 120);
      g.fillStyle = P.lacquer;
      g.beginPath();
      g.moveTo(x + 17, y - 200);
      g.lineTo(x + 60, y - 190);
      g.lineTo(x + 17, y - 172);
      g.fill();
    });
    g.restore();
  }

  /** A prop: delivered art when there is some, else the stand-in callback. */
  prop(id, x, y, h, standIn, pose) {
    const img = this.art.get(id);
    if (img) {
      this.sprite(img, x, y, h, pose || { bob: 0 });
      return true;
    }
    standIn();
    return false;
  }

  altar(x, y, lit, total, t) {
    const g = this.ctx;
    this.prop('prop-altar', x, y, 170, () => {
      g.save();
      g.fillStyle = P.ink;
      g.fillRect(x - 70, y - 70, 140, 12); // table top
      g.fillRect(x - 62, y - 58, 8, 58);
      g.fillRect(x + 54, y - 58, 8, 58);
      // The memorial tablet, its inscription cut out.
      g.fillRect(x - 16, y - 140, 32, 70);
      g.beginPath();
      g.moveTo(x - 22, y - 140);
      g.quadraticCurveTo(x, y - 160, x + 22, y - 140);
      g.fill();
      this.cutLight(g);
      for (let k = 0; k < 5; k++) g.fillRect(x - 2, y - 132 + k * 11, 4, 6);
      this.endCut(g);
      g.restore();
    });
    // Incense sticks, one per answered call, standing in the altar's bowl:
    // lit ones glow and smoke.
    const painted = !!this.art.get('prop-altar');
    const bowlY = painted ? y - 78 : y - 70;
    for (let i = 0; i < total; i++) {
      const sx = painted ? x - 8 + i * 4 : x - 40 + i * 20;
      const top = bowlY - 26 - (i % 2) * 4;
      const on = i < lit;
      g.fillStyle = P.ink;
      g.fillRect(sx - 0.8, top, 1.6, bowlY - top);
      if (on) {
        g.save();
        g.fillStyle = '#FF8A3C';
        g.shadowColor = '#FF8A3C';
        g.shadowBlur = 8;
        g.fillRect(sx - 1.5, top - 3, 3, 4);
        g.restore();
        g.save();
        g.strokeStyle = 'rgba(242,232,213,0.35)';
        g.lineWidth = 2;
        g.beginPath();
        for (let k = 0; k < 14; k++) {
          const yy = top - 6 - k * 7;
          const xx = sx + Math.sin(t * 1.4 + k * 0.6 + i) * (2 + k * 0.8);
          k === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
        }
        g.stroke();
        g.restore();
      }
    }
  }

  /** The caller: a drummer at a standing drum, striking on the call's strokes. */
  callerDrum(x, y, pulse, kind) {
    const g = this.ctx;
    const id = kind === 'mourning' ? 'prop-mourning-drummer' : 'prop-festival-drummers';
    this.prop(id, x, y, kind === 'festival' ? 170 : 160, () => {
      g.save();
      g.fillStyle = P.ink;
      // Drum on a stand.
      g.fillRect(x - 6, y - 60, 4, 60);
      g.fillRect(x + 34, y - 60, 4, 60);
      g.fillStyle = kind === 'festival' ? P.lacquer : P.bronze;
      g.beginPath();
      g.ellipse(x + 16, y - 80, 30, 26, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = P.ink;
      // Drummer, arm raised and brought down on the strokes.
      const px = x - 40;
      g.fillRect(px - 7, y - 58, 14, 58);
      g.beginPath();
      g.arc(px, y - 68, 9, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.translate(px + 5, y - 54);
      g.rotate(-1.6 + pulse * 1.3);
      g.fillRect(-2, 0, 4, 34);
      g.restore();
      g.restore();
    }, { bob: pulse * 4 });
    if (pulse > 0.05) {
      // The ripple sits on the drum: where the painted art has it, or the stand-in's.
      const painted = this.art.get(id);
      const [rx, ry] = painted ? (kind === 'festival' ? [x - 4, y - 100] : [x + 70, y - 95]) : [x + 16, y - 80];
      g.save();
      g.globalAlpha = pulse * 0.6;
      g.strokeStyle = this.sky.glow;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(rx, ry, 36 + (1 - pulse) * 30, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }

  /** A stilt house on the river; its lanterns light when the village answers. */
  villageHouse(x, y, lit, pulse, t, i) {
    const g = this.ctx;
    this.prop('prop-village-house', x, y, 130, () => {
      g.save();
      g.fillStyle = this.sky.mid2;
      for (const px of [-30, -10, 10, 30]) g.fillRect(x + px - 2, y - 50, 4, 50);
      g.fillRect(x - 36, y - 76, 72, 28);
      g.beginPath();
      g.moveTo(x - 62, y - 108);
      g.quadraticCurveTo(x, y - 66, x + 62, y - 108);
      g.lineTo(x + 46, y - 74);
      g.lineTo(x - 46, y - 74);
      g.closePath();
      g.fill();
      g.restore();
    });
    // Lanterns: dark until the village answers, then warm and swaying.
    for (const lx of [-40, 40]) {
      const sway = Math.sin(t * 1.5 + i + lx) * 3;
      g.save();
      g.strokeStyle = P.ink;
      g.beginPath();
      g.moveTo(x + lx, y - 84);
      g.lineTo(x + lx + sway, y - 64);
      g.stroke();
      const img = this.art.get('prop-lantern');
      if (img && lit) this.sprite(img, x + lx + sway, y - 40, 26);
      else {
        g.fillStyle = lit ? '#F2A65A' : 'rgba(22,21,26,0.8)';
        if (lit) {
          g.shadowColor = '#FFC26A';
          g.shadowBlur = 22;
        }
        g.beginPath();
        g.ellipse(x + lx + sway, y - 56, 8, 11, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    if (pulse > 0.05) {
      g.save();
      g.globalAlpha = pulse * 0.7;
      g.strokeStyle = this.sky.glow;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y - 90, 30 + (1 - pulse) * 40, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }

  /** A string of festival lanterns across the sky: one more lit per answer. */
  lanternString(x0, x1, y, lit, total, t) {
    const g = this.ctx;
    g.save();
    g.strokeStyle = P.ink;
    g.lineWidth = 1.5;
    g.beginPath();
    for (let x = x0; x <= x1; x += 20) g.lineTo(x, y + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 30);
    g.stroke();
    const n = total * 3;
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) / n) * (x1 - x0);
      const yy = y + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 30 + 14 + Math.sin(t * 1.3 + i) * 2;
      const on = i < lit * 3;
      g.fillStyle = on ? (i % 2 ? P.lacquer : '#F2A65A') : 'rgba(22,21,26,0.7)';
      if (on) {
        g.shadowColor = '#FFC26A';
        g.shadowBlur = 16;
      } else g.shadowBlur = 0;
      g.beginPath();
      g.ellipse(x, yy, 9, 12, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  /** One of the drums gathered to be melted: lit while it can still sound, grey once silent. */
  meltDrum(x, y, silent, pulse, next) {
    const g = this.ctx;
    const img = this.art.get('prop-bronze-drum');
    g.save();
    if (silent) g.filter = 'grayscale(1) brightness(0.55)';
    if (next && !silent) {
      g.shadowColor = P.bronzeLight;
      g.shadowBlur = 12 + pulse * 20;
    }
    if (img) this.sprite(img, x, y, 90, { bob: pulse * 3 });
    else {
      g.fillStyle = silent ? '#5a5650' : P.bronze;
      g.beginPath();
      g.moveTo(x - 40, y - 80);
      g.lineTo(x + 40, y - 80);
      g.quadraticCurveTo(x + 28, y - 40, x + 34, y);
      g.lineTo(x - 34, y);
      g.quadraticCurveTo(x - 28, y - 40, x - 40, y - 80);
      g.fill();
      g.fillStyle = silent ? '#77726a' : P.bronzeLight;
      g.beginPath();
      g.ellipse(x, y - 80, 40, 9, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = P.ink;
      for (let k = 0; k < 3; k++) g.fillRect(x - 32, y - 62 + k * 14, 64, 1.5);
    }
    g.restore();
  }

  /** The foundry: a furnace and crucible, three moulds filling as the bronze is poured. */
  foundry(view, t) {
    const g = this.ctx;
    const sess = view.session;
    const fx = -60;
    this.prop('prop-furnace', fx, GROUND, 190, () => {
      g.save();
      g.fillStyle = P.ink;
      g.beginPath();
      g.moveTo(fx - 60, GROUND);
      g.lineTo(fx - 40, GROUND - 150);
      g.lineTo(fx + 40, GROUND - 150);
      g.lineTo(fx + 60, GROUND);
      g.fill();
      g.fillStyle = '#FF8A3C';
      g.shadowColor = '#FF8A3C';
      g.shadowBlur = 30 + Math.sin(t * 6) * 8;
      g.beginPath();
      g.arc(fx, GROUND - 40, 20, Math.PI, 0);
      g.fill();
      g.restore();
    });
    // The moulds: the current one fills pour by pour; cast ones glow bronze.
    for (let i = 0; i < sess.drums; i++) {
      const x = 170 + i * 150;
      const fill = i < sess.cast ? 1 : i === sess.cast ? sess.level / sess.pours : 0;
      const cracked = i === sess.cast && t - view.crackAt < 0.8;
      this.mould(x, GROUND, fill, cracked, i < sess.cast, t);
    }
    // The pour: a glowing stream from the crucible into the current mould.
    if (view.pouring && !sess.done) {
      const x = 170 + sess.cast * 150;
      g.save();
      g.strokeStyle = '#FFB65C';
      g.shadowColor = '#FF8A3C';
      g.shadowBlur = 18;
      g.lineWidth = 5 + Math.sin(t * 30);
      g.beginPath();
      g.moveTo(fx + 30, GROUND - 120);
      g.quadraticCurveTo(x - 40, GROUND - 170, x, GROUND - 70);
      g.stroke();
      g.restore();
    }
  }

  /**
   * Molten bronze rising inside a painted mould: the mould itself glows hot
   * from the bottom up to the fill level (and flashes pale when it cracks).
   */
  glowFill(img, x, y, h, fill, cracked) {
    const w = Math.round((img.width / img.height) * h);
    const c = this.glowCanvas || (this.glowCanvas = canvas(1, 1));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const g = c.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(img, 0, 0, w, h);
    g.globalCompositeOperation = 'source-atop';
    const level = h - h * 0.92 * fill;
    const grad = g.createLinearGradient(0, h, 0, level - 10);
    grad.addColorStop(0, cracked ? 'rgba(242,232,213,0.85)' : 'rgba(255,170,80,0.85)');
    grad.addColorStop(0.85, cracked ? 'rgba(242,232,213,0.6)' : 'rgba(255,120,40,0.65)');
    grad.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = grad;
    g.fillRect(0, cracked ? 0 : level - 10, w, h);
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = '#FF8A3C';
    ctx.shadowBlur = cracked ? 0 : 16 * fill;
    ctx.drawImage(c, x - w / 2, y - h);
    ctx.restore();
  }

  mould(x, y, fill, cracked, cast, t) {
    const g = this.ctx;
    const done = this.art.get('prop-drum-cast');
    if (cast && done) {
      this.sprite(done, x, y, 100);
      return;
    }
    const img = this.art.get('prop-mould');
    if (img) {
      this.sprite(img, x, y, 100);
      if (fill > 0 || cracked) this.glowFill(img, x, y, 100, fill, cracked);
      return;
    }
    {
      g.save();
      g.fillStyle = '#5b4436';
      g.beginPath();
      g.moveTo(x - 50, y - 90);
      g.lineTo(x + 50, y - 90);
      g.lineTo(x + 44, y);
      g.lineTo(x - 44, y);
      g.closePath();
      g.fill();
      g.restore();
    }
    if (fill > 0) {
      // Molten bronze rising inside: bright, then darkening as it sets.
      g.save();
      g.fillStyle = cast ? P.bronze : '#FFA24C';
      g.shadowColor = '#FF8A3C';
      g.shadowBlur = cast ? 6 : 20;
      const hgt = 70 * fill;
      g.fillRect(x - 34, y - 12 - hgt, 68, hgt);
      g.restore();
    }
    if (cracked) {
      g.save();
      g.strokeStyle = P.paper;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - 10, y - 90);
      g.lineTo(x + 4, y - 60);
      g.lineTo(x - 6, y - 40);
      g.lineTo(x + 8, y - 10);
      g.stroke();
      g.restore();
    }
  }

  /** A cut-paper "!" over every Han winding up to strike. */
  threatMarks(view) {
    const g = this.ctx;
    const pulse = 0.85 + 0.15 * Math.sin(view.songTime * 14);
    for (const e of view.threats || []) {
      const x = (this.motion.enemies.get(e.id)?.x ?? e.x * U) + (e.type === 'fort' ? 90 : 0);
      const y = GROUND - (e.type === 'fort' ? 380 : e.type === 'crossbow' ? 112 : 130);
      g.save();
      g.translate(x, y);
      g.scale(pulse, pulse);
      g.fillStyle = P.lacquer;
      g.shadowColor = this.sky.glow;
      g.shadowBlur = 10;
      g.beginPath();
      g.moveTo(0, -20);
      g.lineTo(15, 6);
      g.lineTo(-15, 6);
      g.closePath();
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = P.paper;
      g.fillRect(-1.6, -11, 3.2, 9);
      g.fillRect(-1.6, 0, 3.2, 3);
      g.restore();
    }
  }

  /**
   * The shield wall: a translucent paper dome over the whole army, its rim
   * a row of big overlapping bronze shields, glowing while the guard is up.
   * Snaps up, fades down.
   */
  shieldWall(view) {
    const g = this.ctx;
    const t = view.songTime;
    const up = Math.min(1, (t - view.guardAt) / 0.12);
    const down = Math.min(1, (view.guardUntil - t) / 0.15);
    const a = Math.max(0, Math.min(up, down));
    if (a <= 0) return;
    const right = this.motion.front + 50;
    const left = this.motion.crew.x - 110;
    const lift = (1 - up) * 50;
    const base = GROUND + 4;
    const top = GROUND - 150 + lift;
    const yAt = (x) => {
      const k = (x - left) / (right - left);
      return base - (base - top) * Math.sin(Math.PI * k) ** 0.6;
    };
    g.save();
    // The dome: a glowing translucent sheet over everyone.
    g.globalAlpha = a * 0.22;
    g.fillStyle = P.bronzeLight;
    g.beginPath();
    g.moveTo(left, base);
    for (let x = left; x <= right; x += 10) g.lineTo(x, yAt(x));
    g.lineTo(right, base);
    g.closePath();
    g.fill();
    g.globalAlpha = a * 0.8;
    g.strokeStyle = P.bronzeLight;
    g.lineWidth = 3;
    g.shadowColor = P.bronzeLight;
    g.shadowBlur = 18;
    g.beginPath();
    for (let x = left; x <= right; x += 10) (x === left ? g.moveTo : g.lineTo).call(g, x, yAt(x));
    g.stroke();
    g.restore();
    // Big shields along the rim.
    g.save();
    g.globalAlpha = a;
    const n = Math.max(6, Math.round((right - left) / 34));
    for (let i = 0; i <= n; i++) {
      const x = left + ((right - left) * i) / n;
      this.roundShield(x, yAt(x) + 4, 24);
    }
    g.restore();
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

  /** Draw a cut-out standing at (x, y): bob lifts it, tilt rocks it about its feet, lean shifts it. */
  sprite(img, x, y, h, pose = { bob: 0 }) {
    const w = (img.width / img.height) * h;
    const g = this.ctx;
    if (!pose.tilt && !pose.lean && pose.alpha === undefined) {
      g.drawImage(img, x - w / 2, y - h - (pose.bob || 0), w, h);
      return;
    }
    g.save();
    if (pose.alpha !== undefined) g.globalAlpha *= pose.alpha;
    g.translate(x + (pose.lean || 0), y - (pose.bob || 0));
    g.rotate(pose.tilt || 0);
    g.drawImage(img, -w / 2, -h, w, h);
    g.restore();
  }

  /** The bronze drum with both sisters: on a carrying frame, or the elephant. */
  drumCrew(x, y, view) {
    const g = this.ctx;
    const t = view.songTime;
    const armL = Math.max(0, 1 - (t - this.flash.L) * 6);
    const armR = Math.max(0, 1 - (t - this.flash.R) * 6);
    if (view.battle.elephant) {
      const charging = view.battle.order && view.battle.order.command === 'charge';
      // The elephant's gait comes from how fast it is actually moving.
      const step = charging && view.cycle ? this.strokePulse(view.cycle, t).pulse * 7 : view.crewBob || 0;
      const img = this.art.get('war-elephant');
      if (img) {
        // Painted art: the sisters stand inside the howdah, so draw them
        // first and let its rail cover their legs.
        this.sisters(x - 8, y - 165 - Math.abs(step), armL, armR, view, 30);
        this.sprite(img, x, y, 230, { bob: step });
        return;
      }
      this.elephant(x, y - Math.abs(step), view);
      this.sisters(x - 8, y - 160 - Math.abs(step), armL, armR, view);
    } else {
      const img = this.art.get('drum-bearers');
      if (img) {
        // The sisters stand at the two ends of the palanquin deck, the drum
        // showing between them.
        // The palanquin jolts a little with each stroke on the drum.
        const sh = this.shiver(Math.max(this.flash.L, this.flash.R), t, 1.6);
        const bob = (view.crewBob || 0) - sh.dy;
        this.sprite(img, x + sh.dx, y, 150, { bob });
        this.sisters(x + sh.dx, y - 52 - bob, armL, armR, view, 64);
        return;
      }
      {
        g.fillStyle = P.ink;
        g.fillRect(x - 60, y - 52, 120, 5); // carrying pole
        for (const px of [-64, 58]) this.warrior(x + px, y, 0.9, { bob: 0, thrust: 0 }, t, false);
        this.bronzeDrum(x, y - 18, 34, view);
      }
      this.sisters(x, y - 52, armL, armR, view);
    }
  }

  /**
   * The companion drummers who walk with the drum crew: one with a trống chầu
   * slung at her hip, struck when the shields go up; one with a mõ, knocked
   * when the rhythm is reset. Delivered art (BD-C11, BD-C12) or paper-cut
   * stand-ins; either shivers when its drum is struck.
   */
  companions(x, y, view) {
    const t = view.songTime;
    const bob = view.crewBob || 0;
    const kc = this.shiver(this.kicks.chau, t, 2.4);
    const km = this.shiver(this.kicks.mo, t, 2.4);
    const imgC = this.art.get('drummer-chau');
    const imgM = this.art.get('drummer-mo');
    if (imgM) this.sprite(imgM, x - 26 + km.dx, y, 84, { bob: bob - km.dy, tilt: km.k * 0.05 });
    else this.companionDrummer(x - 26 + km.dx, y - bob + km.dy, 'mo', km.k);
    if (imgC) this.sprite(imgC, x + 14 + kc.dx, y, 88, { bob: bob * 0.8 - kc.dy, tilt: kc.k * 0.05 });
    else this.companionDrummer(x + 14 + kc.dx, y - bob * 0.8 + kc.dy, 'chau', kc.k);
  }

  /** A stand-in companion drummer facing right, with her drum (hit: 0..1 just struck). */
  companionDrummer(x, y, kind, hit) {
    const g = this.ctx;
    g.save();
    g.translate(x, y);
    g.scale(1.05, 1.05);
    // Body: wrapped skirt, torso, head, a short fan of feathers.
    g.fillStyle = P.ink;
    g.beginPath();
    g.moveTo(-11, 0);
    g.lineTo(11, 0);
    g.lineTo(6, -34);
    g.lineTo(-6, -34);
    g.fill();
    g.fillRect(-5, -58, 10, 26);
    g.beginPath();
    g.arc(0, -65, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.paperShade;
    for (let i = 0; i < 5; i++) leaf(g, -1, -69, 22, -Math.PI / 2 - 0.5 + (i - 2) * 0.22, 0.12);
    g.fillStyle = P.lacquer;
    g.fillRect(-6, -36, 12, 4); // sash
    if (kind === 'chau') {
      // The barrel drum at her hip, its hide head facing the enemy.
      g.fillStyle = P.lacquer;
      g.beginPath();
      g.ellipse(15, -30, 13, 15, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = P.bronzeLight;
      g.fillRect(4, -31, 22, 2);
      g.fillStyle = hit ? '#FFF4DA' : '#E6D3AE';
      g.beginPath();
      g.ellipse(27, -30, 4, 14, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = P.ink;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-3, -56);
      g.lineTo(15, -45); // strap
      g.stroke();
      // Beater arm: raised, then down on the head when struck.
      const a = -1.1 + hit * 1.5;
      g.save();
      g.translate(4, -52);
      g.rotate(a);
      g.fillStyle = P.ink;
      g.fillRect(0, -2, 16, 4);
      g.fillStyle = '#5A3A22';
      g.fillRect(14, -1.5, 18, 3);
      g.fillStyle = P.lacquer;
      g.fillRect(29, -2.5, 5, 5);
      g.restore();
    } else {
      // The mõ held out in her left hand, the mallet in her right.
      g.fillStyle = P.ink;
      g.fillRect(2, -50, 14, 4); // forearm
      const grad = g.createRadialGradient(19, -50, 1, 21, -46, 11);
      grad.addColorStop(0, hit ? '#D09050' : '#A86E3A');
      grad.addColorStop(1, '#4E2E16');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(21, -46, 10, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1A0F08';
      g.fillRect(13, -43, 16, 2);
      const a = -1.4 + hit * 1.1;
      g.save();
      g.translate(3, -56);
      g.rotate(a);
      g.fillStyle = P.ink;
      g.fillRect(0, -2, 13, 4);
      g.fillStyle = '#5A3A22';
      g.fillRect(11, -1.2, 13, 2.4);
      g.fillStyle = '#7A4A26';
      g.beginPath();
      g.arc(25, 0, 3.5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.restore();
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

  sisters(x, y, armL, armR, view, spread = 30) {
    const g = this.ctx;
    const imgT = this.art.get('sister-trac');
    const imgN = this.art.get('sister-nhi');
    if (imgT && imgN) {
      this.sprite(imgT, x - spread, y, 96, { bob: armL * 3 });
      this.sprite(imgN, x + spread, y, 96, { bob: armR * 3 });
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
      } else if (ev.type === 'launch') {
        // The blow is visible all the way: bolts arc over, a spear lunges.
        const dur = ev.arrive - ev.launch;
        const to = this.motion.front - 10;
        if (ev.kind === 'spear') {
          const m = this.motion.enemies.get(ev.from);
          if (m) m.lunge = { t0: ev.launch, t1: ev.arrive };
        } else {
          const n = ev.kind === 'fort' ? 6 : 3;
          const fromX = ev.x * U + (ev.kind === 'fort' ? 110 : -20);
          for (let i = 0; i < n; i++) this.projectile(fromX, to - i * 18, ev.launch + i * 0.03, P.ironDark, -1, dur, ev.kind === 'fort' ? 150 : 110);
        }
      } else if (ev.type === 'deflect') {
        // Bolts and blades glance off the shields.
        this.scraps(this.motion.front - 20, GROUND - 100, 10, [P.bronzeLight, P.paper, P.ironDark]);
      } else if (ev.type === 'wound') {
        this.scraps(this.motion.front - 30, GROUND - 50, 8, [P.lacquer, P.ink]);
      } else if (ev.type === 'trample') {
        this.scraps(ev.x * U + 80, GROUND - 10, 40, [P.paper, P.paperShade, P.ink]);
        this.shake = t + 0.35;
      }
    }
  }

  scraps(x, y, n, colors) {
    if (this.reduceMotion) n = Math.ceil(n / 3);
    const sheet = this.scrapSheet();
    for (let i = 0; i < n; i++) {
      const c = colors[i % colors.length];
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.3) * 260,
        vy: -120 - Math.random() * 260,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
        s: 4 + Math.random() * 7,
        c,
        // With the delivered sheet (BD-F01): a cut scrap of the nearest colour.
        cell: sheet ? this.scrapCell(sheet, c) : undefined,
        life: 1.2 + Math.random() * 0.6,
      });
    }
  }

  /**
   * The paper-scrap sheet (BD-F01): sixteen scraps in a row of 128 px cells,
   * each in the band 192-320 px of the 512 px sheet. On first use each
   * cell's average colour is measured, so a burst can ask for "lacquer and
   * ink" and get red and grey scraps.
   */
  scrapSheet() {
    const img = this.art.get('fx-scraps');
    if (!img) return null;
    if (!this.scrapInfo) {
      const c = canvas(64, 4);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, img.height * 0.375, img.width, img.height * 0.25, 0, 0, 64, 4);
      const data = g.getImageData(0, 0, 64, 4).data;
      const cells = [];
      for (let i = 0; i < 16; i++) {
        let r = 0, gg = 0, b = 0, a = 0;
        for (let y = 0; y < 4; y++) {
          for (let x = i * 4; x < i * 4 + 4; x++) {
            const k = (y * 64 + x) * 4;
            const w = data[k + 3] / 255;
            r += data[k] * w; gg += data[k + 1] * w; b += data[k + 2] * w; a += w;
          }
        }
        cells.push(a ? [r / a, gg / a, b / a] : [128, 128, 128]);
      }
      this.scrapInfo = { cells, by: new Map() };
    }
    return img;
  }

  /** A random scrap cell among the three nearest in colour to a hex colour. */
  scrapCell(sheet, hex) {
    const info = this.scrapInfo;
    if (!info.by.has(hex)) {
      const n = parseInt(hex.slice(1), 16);
      const want = [n >> 16, (n >> 8) & 255, n & 255];
      const ranked = info.cells.map((c, i) => [Math.hypot(c[0] - want[0], c[1] - want[1], c[2] - want[2]), i]).sort((a, b) => a[0] - b[0]);
      info.by.set(hex, ranked.slice(0, 3).map((r) => r[1]));
    }
    const near = info.by.get(hex);
    return near[Math.floor(Math.random() * near.length)];
  }

  /** The drum wakes (or a drum is cast): its rings spread outward (BD-F03). */
  wake(t, where = 'crew') {
    this.wakes = (this.wakes || []).filter((w) => t - w.t < 1.6);
    this.wakes.push({ t, where });
  }

  /** One spreading burst of the drum's rings, centred on (x, y), up to `size` across. */
  wakeBurst(x, y, size, k) {
    const g = this.ctx;
    const img = this.art.get('fx-drum-wake');
    const d = size * (0.35 + 0.65 * (1 - (1 - k) ** 3));
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.85 * (1 - k) ** 1.5;
    if (img) {
      g.translate(x, y);
      g.rotate(k * 0.35);
      g.drawImage(img, -d / 2, -d / 2, d, d);
    } else {
      g.strokeStyle = P.bronzeLight;
      for (const f of [1, 0.8, 0.6]) {
        g.lineWidth = 4 * f;
        g.beginPath();
        g.arc(x, y, (d / 2) * f, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.restore();
  }

  projectile(fromX, toX, t0, color, dir, dur = 0.45, height = 120) {
    this.particles.push({ kind: 'arrow', fromX, toX, t0, dur, color, dir, height });
  }

  // ---------------------------------------------------------------- frame

  draw(view, dt) {
    const g = this.ctx;
    const { battle, songTime: t } = view;
    const targetCam = (this.motion ? this.motion.front : battle.army.x * U) - ARMY_SCREEN_X;
    this.cam += (targetCam - this.cam) * Math.min(1, dt * 4);
    let sx = 0;
    if (this.shake && t < this.shake && !this.reduceMotion) sx = (Math.random() - 0.5) * 10;

    g.setTransform(this.pixel, 0, 0, this.pixel, 0, 0);
    g.clearRect(0, 0, W, H);
    // The camera: wide, or moved in on the action on a small screen.
    const zm = this.updateZoom(view, dt);
    if (zm.z > 1.001) {
      g.translate(W / 2, ZOOM_EYE);
      g.scale(zm.z, zm.z);
      g.translate(-zm.x, -zm.y);
    }
    const skyArt = this.art.get(`sky-${this.stage.sky}`);
    const skyImg = skyArt ? this.litLayer(`sky-${this.stage.sky}`, skyArt) : null;
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
    if (view.mode !== 'battle') this.scene(view);
    if (view.stage && view.stage.id === 'mavien') this.general(view);
    const beatPhase = view.beatFloat % 1;
    for (const e of battle.enemies) {
      const m = this.enemyMotion(e, t, dt);
      if (!m) continue;
      const x = m.x;
      if (x - this.cam < -300 || x - this.cam > W + 300) continue;
      g.save();
      g.globalAlpha = m.alpha;
      this.footShadow(x + (e.type === 'fort' ? 90 : 0), e.type === 'fort' ? 130 : 22);
      this.backlit();
      const shown = { ...e, pose: { bob: m.bob, tilt: m.tilt, lean: m.lean || 0 } };
      if (e.type === 'fort') this.fort(e, x, GROUND);
      else if (e.type === 'target') this.target(e, x, GROUND, t);
      else this.hanSoldier(shown, x, GROUND, t, beatPhase);
      g.restore();
    }
    this.army(view, dt);
    if (view.shieldsUp || view.songTime <= view.guardUntil + 0.2) this.shieldWall(view);
    this.threatMarks(view);
    this.drawParticles(t, dt);
    // The drum waking: its rings spread from the drum the sisters play.
    for (const w of this.wakes || []) {
      const k = (t - w.t) / 1.4;
      if (w.where !== 'crew' || k < 0 || k > 1) continue;
      const cx = this.motion.crew.x;
      this.wakeBurst(cx, battle.elephant ? GROUND - 200 : GROUND - 80, 420, k);
    }
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

  /**
   * The small-screen camera. It opens wide to set the scene, then once the
   * action starts (the first stroke, or five seconds in) eases in: on the
   * gap between the army's front and the nearest enemy in a battle, on the
   * middle of the stage otherwise. Never shows past the painted edges.
   */
  updateZoom(view, dt) {
    const zm = this.zoom || (this.zoom = { z: 1, x: W / 2, y: ZOOM_EYE, started: false });
    const t = view.songTime;
    if (!zm.started && (Math.max(this.flash.L, this.flash.R) >= 0 || t > 5)) zm.started = true;
    let z = 1;
    let x = W / 2;
    let y = ZOOM_EYE;
    if (this.compact && zm.started) {
      const battle = view.mode === 'battle';
      z = battle ? ZOOM_BATTLE : ZOOM_STORY;
      y = GROUND; // the ground well above the drum, the figures in the middle
      if (battle) {
        const front = this.motion.front - this.cam;
        let near = Infinity;
        for (const e of view.battle.enemies) if (e.alive) near = Math.min(near, e.x * U - this.cam);
        x = near - front < 760 ? (front + near) / 2 - 40 : front + 120;
      }
    }
    // Keep the view inside the painted scene.
    x = Math.min(W - W / 2 / z, Math.max(W / 2 / z, x));
    y = Math.min(H - (H - ZOOM_EYE) / z, Math.max(ZOOM_EYE / z, y));
    const k = 1 - Math.exp(-dt * (this.reduceMotion ? 6 : 1.8));
    zm.z += (z - zm.z) * k;
    zm.x += (x - zm.x) * k;
    zm.y += (y - zm.y) * k;
    return zm;
  }

  /** A point in the scene (before zoom) to the point on screen. */
  toScreen(x, y) {
    const zm = this.zoom || { z: 1, x: W / 2, y: ZOOM_EYE };
    return { x: W / 2 + (x - zm.x) * zm.z, y: ZOOM_EYE + (y - zm.y) * zm.z };
  }

  /**
   * A soft spring toward a target: the figure accelerates and settles
   * instead of jumping. k sets how quickly it follows.
   */
  spring(m, target, k, dt) {
    const a = k * k * (target - m.x) - 2 * k * m.v;
    m.v += a * dt;
    m.x += m.v * dt;
  }

  /** Smoothed position and gait of one Han (or a target, or the fort). */
  enemyMotion(e, t, dt) {
    const mm = this.motion;
    let m = mm.enemies.get(e.id);
    if (!m) {
      m = { x: e.x * U, v: 0, phase: Math.random(), k: 2.6 + Math.random() * 0.8, alpha: 1, fell: null };
      mm.enemies.set(e.id, m);
    }
    if (!e.alive) {
      // Fall and fade rather than vanish.
      if (m.fell === null) m.fell = t;
      const k = (t - m.fell) / 0.5;
      if (k >= 1 || this.reduceMotion) return null;
      m.alpha = 1 - k;
      m.tilt = (e.type === 'fort' ? 0 : 0.9) * k;
      m.bob = -6 * k;
      return m;
    }
    if (e.type !== 'fort' && e.type !== 'target') this.spring(m, e.x * U, m.k, dt);
    else m.x = e.x * U;
    const speed = Math.abs(m.v);
    m.phase += (speed * dt) / 44;
    const gait = this.reduceMotion ? 0 : Math.min(1, speed / 40);
    m.bob = Math.abs(Math.sin(m.phase * Math.PI)) * 4 * gait + Math.sin(t * 2 + e.id) * 0.6;
    m.tilt = Math.sin(m.phase * Math.PI * 2) * 0.05 * gait;
    m.lean = 0;
    if (m.lunge && t <= m.lunge.t1 + 0.2) {
      // A spear lunge: drawn back, then driven forward as the blow lands.
      const k = Math.max(0, Math.min(1, (t - m.lunge.t0) / (m.lunge.t1 - m.lunge.t0)));
      // Drawn well back for most of the flight (the cue), then driven home.
      const drive = k < 0.75 ? -(k / 0.75) * 0.3 : ((k - 0.75) / 0.25) * 0.35;
      m.tilt += -drive;
      m.lean = -drive * 40;
    }
    m.alpha = 1;
    return m;
  }

  /**
   * The army moves on the rhythm that was drummed: how strongly a figure is
   * caught in a stroke at time tt (1 on the stroke, falling away after), and
   * how many strokes she has made this cycle. drum limits it to tùng or cắc.
   */
  strokePulse(cycle, tt, drum = null) {
    if (!cycle || tt < cycle.start) return { pulse: 0, count: 0 };
    const local = tt - cycle.start;
    let last = null;
    let count = 0;
    for (const s of cycle.strokes) {
      if (drum && s.drum !== drum) continue;
      const st = s.pos * cycle.u;
      if (st <= local) {
        last = st;
        count += 1;
      }
    }
    if (last === null || local > 4 * cycle.u) return { pulse: 0, count };
    return { pulse: Math.exp(-(local - last) / Math.min(0.14, cycle.u * 0.35)), count };
  }

  army(view, dt) {
    const g = this.ctx;
    const { battle, songTime: t } = view;
    const order = battle.order;
    const cmd = order ? order.command : null;
    const shielded = view.shieldsUp;
    const n = battle.army.troops <= 0 ? 0 : Math.max(1, Math.ceil((battle.army.troops / battle.army.maxTroops) * 12));
    const mm = this.motion;
    const frontTarget = battle.army.x * U;
    // The formation's front glides after the simulation's position.
    const fm = mm.frontM;
    const moving = view.cycle && (view.cycle.command === 'march' || view.cycle.command === 'charge');
    // On a march the formation surges forward on each drummed stroke.
    const surge = moving ? this.strokePulse(view.cycle, t).pulse : 0;
    this.spring(fm, frontTarget, 2 + 7 * surge, dt);
    mm.front = fm.x;
    const calm = this.reduceMotion ? 0 : 1;

    // Each soldier follows her own slot on her own spring: the front rank
    // a little quicker, small drifts in spacing, her own stride.
    if (mm.units.length === 0) {
      for (let i = 0; i < 12; i++) {
        const col = Math.floor(i / 2);
        mm.units.push({
          x: frontTarget - 20 - col * 34 - (i % 2) * 14,
          v: 0,
          k: 3.6 - col * 0.18 + Math.random() * 0.5,
          phase: Math.random(),
          drift: Math.random() * Math.PI * 2,
          delay: col * 0.07 + Math.random() * 0.05,
          alpha: 1,
        });
      }
    }
    // The drum crew walks behind the ranks, with the two companion drummers
    // (the barrel drum and the mõ) between them and the archers.
    const crewOffset = battle.elephant ? 460 : 445;
    const cm = mm.crew;
    this.spring(cm, frontTarget - crewOffset, 2.6, dt);

    g.save();
    for (let i = 0; i < 12; i++) if (mm.units[i].alpha > 0.05) this.footShadow(mm.units[i].x, 16 * mm.units[i].alpha);
    this.footShadow(cm.x, battle.elephant ? 110 : 80);
    this.footShadow(cm.x + (battle.elephant ? 200 : 170), 34);
    this.backlit();
    // The drum crew walks with the army.
    const crewSpeed = Math.abs(cm.v);
    cm.phase = (cm.phase || 0) + (crewSpeed * dt) / 60;
    const crewView = { ...view, crewBob: Math.abs(Math.sin(cm.phase * Math.PI)) * Math.min(1, crewSpeed / 40) * 3 * calm };
    this.drumCrew(cm.x, GROUND, crewView);
    this.companions(cm.x + (battle.elephant ? 200 : 170), GROUND, crewView);

    for (let i = 11; i >= 0; i--) {
      const u = mm.units[i];
      const archer = i >= 8;
      const row = i % 2;
      const col = Math.floor(i / 2);
      const alive = i < n;
      const slot = frontTarget - 20 - col * 34 - row * 14 + Math.sin(t * 0.5 + u.drift) * 3 * calm;
      if (alive) {
        this.spring(u, slot, u.k, dt);
        u.alpha = Math.min(1, u.alpha + dt * 4);
        u.fall = 0;
      } else {
        // Fallen: topple and fade where she stood.
        u.alpha = Math.max(0, u.alpha - dt * 2.2);
        u.fall = Math.min(1, (u.fall || 0) + dt * 2.2);
        u.v *= 0.9;
      }
      if (u.alpha <= 0.02) continue;
      const speed = Math.abs(u.v);
      const gait = Math.min(1, speed / 35) * calm;
      // Her own moment in the drummed rhythm: a ripple from front to back.
      const cyc = alive ? view.cycle : null;
      const tt = t - u.delay;
      let thrust = 0;
      let bob = Math.sin(t * 2.2 + u.drift) * 0.8 * calm;
      let tilt = (u.fall || 0) * -1.2;
      if (cyc && cyc.command === 'march') {
        // One step on every stroke: the foot lands on the drum.
        const { pulse, count } = this.strokePulse(cyc, tt);
        bob += pulse * 6 * calm;
        tilt += (count % 2 ? 1 : -1) * 0.07 * pulse * calm;
      } else if (cyc && cyc.command === 'strike') {
        // Spears thrust on Trắc's strokes, bows loose on Nhị's.
        thrust = this.strokePulse(cyc, tt, archer ? 'R' : 'L').pulse * calm;
        tilt += thrust * 0.12;
        bob += thrust * 2;
      } else {
        // Between orders: a walking gait if still catching up, else breathing.
        u.phase += (speed * dt) / 40;
        bob += Math.abs(Math.sin(u.phase * Math.PI)) * 5 * gait;
        tilt += Math.sin(u.phase * Math.PI * 2) * 0.06 * gait;
      }
      bob *= u.alpha;
      const y = GROUND + row * 10;
      this.warrior(u.x, y, 1 - row * 0.06, { bob, thrust, tilt, lean: thrust * 7, shield: shielded && alive, raise: thrust > 0.3, alpha: u.alpha }, t, archer);
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
        const hgt = p.height || 120;
        const x = p.fromX + (p.toX - p.fromX) * k;
        const y = GROUND - 90 - Math.sin(k * Math.PI) * hgt;
        const ang = Math.atan2(-Math.cos(k * Math.PI) * hgt * Math.PI, p.toX - p.fromX);
        g.save();
        g.translate(x, y);
        g.rotate(ang);
        const fx = this.art.get('fx-projectiles');
        if (fx) {
          // The delivered arrows and bolts (BD-F02), the in-flight cuts with
          // motion lines: cell 1 a Lạc Việt arrow, cell 3 a Han bolt.
          const cw = fx.width / 4;
          const len = p.dir < 0 ? 44 : 50;
          g.drawImage(fx, (p.dir < 0 ? 3 : 1) * cw, 0, cw, fx.height, -len / 2, -len / 2, len, len);
          g.restore();
          return true;
        }
        if (p.dir < 0) {
          // Han bolts: a faint light trail so they read against any sky.
          g.fillStyle = this.sky.glow;
          g.globalAlpha = 0.35;
          g.fillRect(-34, -1.5, 22, 3);
          g.globalAlpha = 1;
        }
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
      const sheet = p.cell !== undefined && this.art.get('fx-scraps');
      if (sheet) {
        const cw = sheet.width / 16;
        const sz = p.s * 2.6;
        g.drawImage(sheet, p.cell * cw, sheet.height * 0.375, cw, sheet.height * 0.25, -sz / 2, -sz / 2, sz, sz);
        g.restore();
        return p.life > 0;
      }
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
    // Touch play uses a bigger drum and larger text; desktop keeps the small HUD.
    const touch = !!view.touch;
    const cx = W / 2;
    const cy = touch ? TOUCH.drum.y : H - 92;
    const R = touch ? TOUCH.drum.r : 58;
    const s = R / 58;
    // Text size: larger on touch screens, and on small screens large enough
    // to read at arm's length (about 14 CSS pixels for body text).
    const k = Math.max(touch ? 1.3 : 1, this.compact ? Math.min(2, 0.95 / this.cssScale) : 1);
    const compact = this.compact;
    const grow = Math.min(1.3, k / (touch ? 1.3 : 1)); // the dots grow with the text, a little
    const font = (w, px, fam = '"Be Vietnam Pro", system-ui, sans-serif') => `${w} ${Math.round(px * k)}px ${fam}`;
    const serif = '"Cormorant Garamond", Georgia, serif';
    const scaled = (ax, ay, f, by = k) => {
      g.save();
      g.translate(ax, ay);
      g.scale(by, by);
      g.translate(-ax, -ay);
      f();
      g.restore();
    };
    // The drum shivers on every stroke.
    const sh = this.shiver(Math.max(this.flash.L, this.flash.R), t, touch ? 3.5 : 2);
    g.save();
    g.translate(sh.dx, sh.dy);
    if (touch) this.touchDrumBand(cx, cy, R, t);
    const beatInMeasure = view.heron; // lit heron: the army's beat, or the phrase's
    const beatPhase = view.beatFloat - Math.floor(view.beatFloat);
    const responding = view.inResponse;

    // The drum face (tympanum): rings, herons, the star.
    const img = this.art.get('hud-drum');
    g.save();
    g.shadowColor = view.ready ? P.bronzeLight : 'rgba(0,0,0,0.5)';
    g.shadowBlur = view.ready ? 18 + 8 * Math.sin(t * 4) : 14;
    g.shadowOffsetY = view.ready ? 0 : 6;
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
    // Four herons around the ring: one per beat of the pattern or the answer.
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i / 4) * Math.PI * 2;
      const hx = cx + Math.cos(a) * (R - 13 * s);
      const hy = cy + Math.sin(a) * (R - 13 * s);
      const lit = i === beatInMeasure;
      g.fillStyle = lit ? (responding ? P.verdigris : P.paper) : 'rgba(22,21,26,0.6)';
      g.save();
      g.translate(hx, hy);
      g.rotate(a + Math.PI / 2);
      leaf(g, 0, 0, (lit ? 13 : 10) * s, -0.4, 0.3);
      leaf(g, 0, 0, (lit ? 13 : 10) * s, Math.PI + 0.4, 0.3);
      g.restore();
    }
    // Star pulses with the army's beat; flashes on strokes.
    const pulse = responding ? Math.max(0, 1 - beatPhase * 3) : 0;
    const fl = Math.max(0, 1 - (t - this.flash.L) * 5);
    const fr = Math.max(0, 1 - (t - this.flash.R) * 5);
    g.fillStyle = view.spirit ? P.bronzeLight : P.paper;
    g.globalAlpha = 0.5 + 0.5 * Math.max(pulse * 0.6, fl);
    star(g, cx, cy, 16 * s + fl * 6, 12 * s, 12);
    g.globalAlpha = 1;
    if (fr > 0 && !touch) {
      g.strokeStyle = P.lacquer;
      g.globalAlpha = fr;
      g.lineWidth = 6;
      g.beginPath();
      g.arc(cx, cy, R - 2, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }

    if (touch) this.touchDrumLabels(cx, cy, R, k / 1.3);
    for (const w of this.wakes || []) {
      const q = (t - w.t) / 1.2;
      if (q >= 0 && q <= 1) this.wakeBurst(cx, cy, R * 4.2, q);
    }
    g.restore();

    // The phrase: the accepted pattern stays filled until the drum is ready
    // again; while drumming, the likeliest pattern is shown with the strokes
    // still to come drawn faintly.
    const slotY = touch ? cy - R * TOUCH.drum.band - 20 * grow : cy - R - 26 * grow;
    const cell = (touch ? 44 : 36) * grow;
    const dotR = (touch ? 14 : 11) * grow;
    const labelY = slotY - 26 * k;
    const ph = view.phraseView;
    // The line above the dots: whose turn it is, or the command being played.
    let label = null;
    let labelColor = P.paper;
    if (ph && ph.caller) label = 'Listen…';
    else if (ph && !ph.done && view.mode === 'echo' && !ph.filled) label = 'Your turn — answer it';
    else if (ph && ph.done && view.mode !== 'battle') label = view.mode === 'casting' ? 'Pouring…' : 'Answered';
    else if (ph && ph.done) {
      const c = COMMANDS.find((k) => k.id === ph.pattern.command);
      const charging = view.cycle && view.cycle.command === 'charge';
      label = charging ? 'Voi! — the elephant charges' : `${c.name} ${ROMAN[ph.pattern.tier]}! — ${c.gloss}`;
    } else if (!ph && view.sustaining) {
      label = touch ? 'The army keeps your rhythm' : 'The army keeps your rhythm — drum the next command';
      labelColor = P.paperShade;
    }
    g.font = font(600, label === null || labelColor === P.paper ? 15 : 14);
    if (touch) {
      // A dark band behind the dots and the label keeps them readable over the field.
      const bw = Math.max(4 * cell + 32, label ? g.measureText(label).width + 28 : 0);
      g.fillStyle = 'rgba(22,21,26,0.45)';
      g.fillRect(cx - bw / 2, labelY - 22 * k, bw, slotY + dotR + 8 - (labelY - 22 * k));
    }
    if (ph) {
      this.pattern(cx - 2 * cell, slotY, ph.pattern, dotR, cell, ph.filled, ph.done);
    } else {
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = P.paper;
        g.globalAlpha = view.ready ? 0.45 + 0.25 * Math.sin(t * 4) : 0.35;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(cx - 1.5 * cell + i * cell, slotY, dotR, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    if (label) {
      g.font = font(600, labelColor === P.paper ? 15 : 14);
      g.textAlign = 'center';
      g.fillStyle = labelColor;
      g.fillText(label, cx, labelY);
    }

    // Dots tumbling away after a reset.
    if (this.clearing && t - this.clearing.t < 0.5) {
      const q = (t - this.clearing.t) / 0.5;
      g.save();
      g.globalAlpha = 1 - q;
      g.translate(0, q * q * 40);
      this.pattern(cx - 2 * cell, slotY, this.clearing.pattern, dotR * (1 - 0.4 * q), cell + 30 * q, this.clearing.filled);
      g.restore();
    }

    // Confirmations for the reset and guard buttons: under the drum, or
    // beside it on touch screens, where the drum fills the bottom edge.
    if (view.confirm && t - view.confirm.t < 0.9) {
      const q = (t - view.confirm.t) / 0.9;
      g.save();
      g.globalAlpha = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
      g.font = font(700, 18);
      g.textAlign = touch ? 'left' : 'center';
      g.fillStyle = view.confirm.color;
      g.shadowColor = 'rgba(0,0,0,0.8)';
      g.shadowBlur = 6;
      if (touch) g.fillText(view.confirm.text, cx + R * TOUCH.drum.band + 20, cy - 30 - q * 4);
      else g.fillText(view.confirm.text, cx, H - 10 - q * 4);
      g.restore();
    }

    // Judgement text.
    if (view.feedback && t - view.feedback.t < 0.6) {
      const q = (t - view.feedback.t) / 0.6;
      g.globalAlpha = 1 - q;
      g.font = font(700, 26, serif);
      g.textAlign = 'center';
      g.fillStyle = view.feedback.color;
      g.fillText(view.feedback.text, cx, labelY - 24 * k - q * 16);
      g.globalAlpha = 1;
    }

    // Combo and the waking drum: beside the drum, or under the army's bar on touch screens.
    if (view.combo > 1 && view.mode === 'battle') {
      g.font = font(700, 22, serif);
      g.textAlign = 'left';
      g.fillStyle = view.spirit ? P.bronzeLight : P.paper;
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.8)';
      g.shadowBlur = touch ? 6 : 0;
      g.fillText(view.spirit ? `Trống thức — the drum wakes ×${view.combo}` : `Chain ×${view.combo}`, touch ? 24 : cx + R + 22, touch ? 22 + 60 * k : cy + 8);
      g.restore();
    }

    // Command list: every unlocked command and tier, kept low and clear of
    // the field. The tier being played is lit.
    g.textAlign = 'left';
    const list = view.mode === 'battle' ? COMMANDS.filter((c) => view.unlocked.includes(c.id)) : [];
    if (compact && list.length) {
      // Small screens: each command on two lines (its name, then its tiers),
      // narrow enough to grow large and still stay clear of the drum.
      const px = 22;
      const tierW = 70;
      const blockW = Math.max(120, 18 + view.maxTier * tierW);
      const by = (touch ? 500 : 570) / (px + blockW);
      g.save();
      g.translate(0, H);
      g.scale(Math.min(k, by), Math.min(k, by));
      g.translate(0, -H);
      let py = H - 14 - (list.length - 1) * 38 - 18;
      g.fillStyle = 'rgba(22,21,26,0.6)';
      g.fillRect(px - 10, py - 18, blockW + 12, list.length * 38 + 6);
      for (const c of list) {
        const active = ph && ph.done && ph.pattern.command === c.id;
        g.font = '600 14px "Be Vietnam Pro", system-ui, sans-serif';
        g.fillStyle = active ? P.bronzeLight : P.paper;
        g.fillText(`${c.name} · ${c.gloss.replace('Elephant charge', 'Charge')}`, px, py);
        c.tiers.slice(0, view.maxTier).forEach((text, i) => {
          const x0 = px + i * tierW;
          const lit = active && ph.pattern.tier === i + 1;
          g.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif';
          g.fillStyle = lit ? P.bronzeLight : 'rgba(242,232,213,0.6)';
          g.fillText(ROMAN[i + 1], x0, py + 18);
          this.pattern(x0 + 16, py + 13, { strokes: parsePattern(text) }, 4.4, 12, Infinity, lit, true);
        });
        py += 38;
      }
      g.restore();
    } else {
      if (touch) {
        g.save();
        g.translate(0, H);
        g.scale(1.2, 1.2);
        g.translate(0, -H);
      }
      const px = 22;
      const rowH = 22;
      const cellS = 12;
      let py = H - 14 - (list.length - 1) * rowH;
      g.fillStyle = 'rgba(22,21,26,0.6)';
      if (list.length) g.fillRect(px - 10, py - 19, 120 + view.maxTier * 84, list.length * rowH + 8);
      for (const c of list) {
        const active = ph && ph.done && ph.pattern.command === c.id;
        g.font = '600 14px "Be Vietnam Pro", system-ui, sans-serif';
        g.fillStyle = active ? P.bronzeLight : P.paper;
        g.fillText(`${c.name} · ${c.gloss.replace('Elephant charge', 'Charge')}`, px, py);
        c.tiers.slice(0, view.maxTier).forEach((text, i) => {
          const x0 = px + 116 + i * 84;
          const lit = active && ph.pattern.tier === i + 1;
          g.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif';
          g.fillStyle = lit ? P.bronzeLight : 'rgba(242,232,213,0.6)';
          g.fillText(ROMAN[i + 1], x0, py);
          this.pattern(x0 + 18, py - 5, { strokes: parsePattern(text) }, 4.4, cellS, Infinity, lit, true);
        });
        py += rowH;
      }
      if (touch) g.restore();
    }

    // Troops and goal.
    const b = view.battle;
    const sess = view.session;
    if (view.mode === 'echo') {
      const words = { mourning: 'Incense lit', village: 'Villages answering', festival: 'Rhythms answered', elegy: 'Drums silent' };
      scaled(W - 24, 22, () => this.bar(W - 304, 22, 280, sess.index / sess.calls.length, `${words[view.stage.caller] || 'Answered'} · ${sess.index} of ${sess.calls.length}`, P.bronzeLight));
    } else if (view.mode === 'casting') {
      scaled(W - 24, 22, () => this.bar(W - 304, 22, 280, (sess.cast + sess.level / sess.pours) / sess.drums, `Drums cast · ${sess.cast} of ${sess.drums}`, P.bronze));
      if (sess.u !== null) {
        g.font = font(600, 15);
        g.textAlign = 'left';
        g.fillStyle = P.paper;
        if (touch || compact) {
          g.fillText(`Hold ${Math.round(60 / sess.u)} BPM`, 24, H - 18 - 22 * k);
          g.fillText(`Pour ${sess.level} of ${sess.pours} into this mould`, 24, H - 18);
        } else g.fillText(`Hold ${Math.round(60 / sess.u)} BPM · pour ${sess.level} of ${sess.pours} into this mould`, 24, H - 18);
      }
    } else {
      scaled(24, 22, () => this.bar(24, 22, 280, b.army.troops / b.army.maxTroops, 'Nghĩa quân · the army', P.lacquer));
      if (b.survive) {
        scaled(W - 24, 22, () => this.bar(W - 304, 22, 280, Math.min(1, b.time / b.survive), `Hold the ford · ${Math.max(0, Math.ceil(b.survive - b.time))} s`, P.verdigris));
      } else {
        const goals = b.enemies.filter((e) => e.goal);
        const goalHp = goals.reduce((s2, e) => s2 + Math.max(0, e.hp), 0) / goals.reduce((s2, e) => s2 + e.maxHp, 0);
        scaled(W - 24, 22, () => this.bar(W - 304, 22, 280, goalHp, goals[0].type === 'fort' ? 'Han fort' : 'Straw targets', P.iron));
      }
    }

    if (view.hint) {
      // Larger on touch and small screens, never wider than the screen: a
      // long line breaks in two rather than shrinking.
      g.font = '500 18px "Be Vietnam Pro", system-ui, sans-serif';
      let lines = [view.hint];
      const fit = (ls) => Math.max(...ls.map((l) => g.measureText(l).width)) + 36;
      if (k > 1 && fit(lines) * k > W - 40) {
        const words = view.hint.split(' ');
        let best = null;
        for (let i = 1; i < words.length; i++) {
          const two = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
          if (!best || fit(two) < fit(best)) best = two;
        }
        if (best) lines = best;
      }
      const hintScale = Math.min(k, (W - 40) / fit(lines));
      // Just under the bars, which grow with the text.
      const top = Math.max(70, 22 + 32 * k + 8);
      scaled(cx, top, () => {
        g.font = '500 18px "Be Vietnam Pro", system-ui, sans-serif';
        g.textAlign = 'center';
        const w = fit(lines);
        g.fillStyle = 'rgba(22,21,26,0.7)';
        g.fillRect(cx - w / 2, top, w, 12 + 24 * lines.length);
        g.fillStyle = P.paper;
        lines.forEach((l, i) => g.fillText(l, cx, top + 24 + 24 * i));
      }, hintScale);
    }

    if (touch) this.touchButtons(view);
  }

  /**
   * A struck drum's shiver: a quick decaying shake for a quarter of a second
   * after time t0. Returns the offset to draw it at.
   */
  shiver(t0, t, amp) {
    const dt = t - t0;
    if (this.reduceMotion || dt < 0 || dt > 0.25) return { dx: 0, dy: 0, k: 0 };
    const k = 1 - dt / 0.25;
    return { dx: Math.sin(dt * 95) * amp * k, dy: Math.cos(dt * 70) * amp * 0.6 * k, k };
  }

  /** A companion drum was struck: the barrel drum for the shield, the mõ for a reset. */
  kick(drum, t) {
    this.kicks[drum] = t;
  }

  // ---------------------------------------------------------------- touch

  /**
   * The rim ring around the touch drum: Nhị's half of the drum. A lacquer
   * band that flashes on rim strokes, with the zones named faintly.
   */
  touchDrumBand(cx, cy, R, t) {
    const g = this.ctx;
    const outer = R * TOUCH.drum.band;
    const fr = Math.max(0, 1 - (t - this.flash.R) * 5);
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)';
    g.shadowBlur = 12;
    g.shadowOffsetY = 4;
    g.fillStyle = fr > 0 ? `rgba(168,50,45,${0.55 + 0.4 * fr})` : 'rgba(110,32,30,0.6)';
    g.beginPath();
    g.arc(cx, cy, outer, 0, Math.PI * 2);
    g.arc(cx, cy, R - 2, 0, Math.PI * 2, true);
    g.fill();
    g.restore();
    // Tangential circles cut round the band, as on the drum's own rings.
    g.fillStyle = 'rgba(242,232,213,0.22)';
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      g.beginPath();
      g.arc(cx + Math.cos(a) * (R + outer) / 2, cy + Math.sin(a) * (R + outer) / 2, 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = P.bronzeLight;
    g.globalAlpha = 0.7 + 0.3 * fr;
    g.lineWidth = 2 + 3 * fr;
    g.beginPath();
    g.arc(cx, cy, outer, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }

  /** Names on the touch drum's two zones, drawn over the drum face. */
  touchDrumLabels(cx, cy, R, grow = 1) {
    const g = this.ctx;
    const mid = (R + R * TOUCH.drum.band) / 2;
    g.save();
    g.font = `700 ${Math.round(15 * Math.min(grow, 1.25))}px "Be Vietnam Pro", system-ui, sans-serif`;
    g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,0.9)';
    g.shadowBlur = 4;
    g.fillStyle = 'rgba(242,232,213,0.9)';
    g.fillText('cắc', cx - mid, cy - 18);
    g.fillText('cắc', cx + mid, cy - 18);
    g.fillText('tùng', cx, cy - R * 0.32);
    // The edge of the centre zone.
    g.setLineDash([4, 6]);
    g.strokeStyle = 'rgba(242,232,213,0.45)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(cx, cy, R * TOUCH.drum.centre, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  /** The strip of rhythm dots above the touch drum, which a swipe clears. */
  onDots(x, y) {
    const slotY = TOUCH.drum.y - TOUCH.drum.r * TOUCH.drum.band - 20;
    return Math.abs(x - TOUCH.drum.x) < 130 && y > slotY - 60 && y < slotY + 18;
  }

  /**
   * What a touch at logical (x, y) presses: 'L', 'R', 'guard', 'reset',
   * 'pause', or 'none' (the dots, kept free so a swipe across them is clean).
   */
  touchTarget(x, y, mode) {
    const T = TOUCH;
    const near = (b, pad) => Math.hypot(x - b.x, y - b.y) < b.r + pad;
    if (near(T.pause, 16)) return 'pause';
    if (mode === 'battle' && near(T.shield, 18)) return 'guard';
    if (near(T.reset, 14)) return 'reset';
    const d = Math.hypot(x - T.drum.x, y - T.drum.y);
    if (d < T.drum.r * T.drum.centre) return 'L';
    if (this.onDots(x, y) && d > T.drum.r * T.drum.band) return 'none';
    if (d < T.drum.r * T.drum.reach) return 'R';
    // The battle itself (the army, the enemy, the ground between): shield.
    if (mode === 'battle' && y > this.toScreen(0, FIELD_TOP).y && y < this.toScreen(0, GROUND + 34).y) return 'guard';
    // Anywhere else: the screen's halves, for thumbs at the edges of a phone.
    return x < W / 2 ? 'L' : 'R';
  }

  /** Does a swipe starting at (x, y) reset the rhythm? From the drum or the dots. */
  swipeResets(x, y) {
    const d = Math.hypot(x - TOUCH.drum.x, y - TOUCH.drum.y);
    return d < TOUCH.drum.r * TOUCH.drum.reach || this.onDots(x, y);
  }

  /** A swipe: draw its streak. */
  swiped(x0, y0, x, y, t) {
    this.swipes = (this.swipes || []).filter((s) => t - s.t < 0.4);
    this.swipes.push({ x0, y0, x, y, t });
  }

  /** A touch landed: ring it, and press the button it hit. */
  touched(x, y, target, t) {
    this.taps.push({ x, y, t, target });
    if (this.taps.length > 8) this.taps.shift();
    if (target === 'guard' || target === 'reset' || target === 'pause') this.pressed[target] = t;
  }

  /**
   * The shield button's stand-in: a trống chầu, the big hide-headed barrel
   * drum that stands beside a bronze drum in a temple or a village hall. Seen
   * from the front and a little above: the buffalo-hide head with its red
   * centre, the lacquered barrel and its tacks, a beater resting across it.
   * The head lights when struck (hit, 0..1).
   */
  chauDrum(x, y, r, hit = 0) {
    const g = this.ctx;
    const hx = x;
    const hy = y - r * 0.2;
    const rx = r * 0.9;
    const ry = r * 0.6;
    // Barrel: lacquer red, bulging a little, below and behind the head.
    g.fillStyle = '#7A231F';
    g.beginPath();
    g.ellipse(hx, y + r * 0.42, rx * 0.96, ry * 0.62, 0, 0, Math.PI);
    g.lineTo(hx - rx, hy);
    g.ellipse(hx, hy, rx, ry, 0, Math.PI, 0, true);
    g.closePath();
    g.fill();
    g.save();
    g.shadowColor = 'transparent';
    g.fillStyle = P.lacquer;
    g.beginPath();
    g.ellipse(hx, y + r * 0.42, rx * 0.84, ry * 0.5, 0, 0, Math.PI);
    g.lineTo(hx - rx * 0.86, hy + ry * 0.3);
    g.ellipse(hx, hy + ry * 0.3, rx * 0.86, ry * 0.8, 0, Math.PI, 0, true);
    g.closePath();
    g.fill();
    // Staves and a bronze band round the belly.
    g.strokeStyle = 'rgba(22,21,26,0.35)';
    g.lineWidth = 1.5;
    for (const f of [-0.6, -0.3, 0, 0.3, 0.6]) {
      g.beginPath();
      g.moveTo(hx + f * rx, hy + ry * Math.sqrt(1 - f * f));
      g.lineTo(hx + f * rx * 0.96, y + r * 0.42 + ry * 0.62 * Math.sqrt(1 - f * f));
      g.stroke();
    }
    g.strokeStyle = P.bronzeLight;
    g.lineWidth = Math.max(2, r * 0.05);
    g.beginPath();
    g.ellipse(hx, y + r * 0.2, rx * 0.99, ry * 0.75, 0, 0.12, Math.PI - 0.12);
    g.stroke();
    // The hide head, its rim of tacks, and the red disc painted at its centre.
    g.fillStyle = hit ? `rgb(${240 + 15 * hit},${226 + 20 * hit},${196 + 30 * hit})` : '#E6D3AE';
    g.beginPath();
    g.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#5A3A22';
    g.lineWidth = Math.max(2, r * 0.06);
    g.stroke();
    g.fillStyle = P.bronzeLight;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      g.beginPath();
      g.arc(hx + Math.cos(a) * rx * 0.9, hy + Math.sin(a) * ry * 0.88, Math.max(1.5, r * 0.035), 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = P.lacquer;
    g.beginPath();
    g.ellipse(hx, hy, rx * 0.36, ry * 0.36, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#E6D3AE';
    g.save();
    g.translate(hx, hy);
    g.scale(1, ry / rx);
    star(g, 0, 0, rx * 0.24, rx * 0.1, 8);
    g.restore();
    if (hit) {
      // The head shivers outward from the stroke.
      g.strokeStyle = `rgba(242,232,213,${0.8 * hit})`;
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(hx, hy, rx * (0.45 + 0.5 * (1 - hit)), ry * (0.45 + 0.5 * (1 - hit)), 0, 0, Math.PI * 2);
      g.stroke();
    }
    // A beater resting across the head, its tip lifting on a stroke.
    g.save();
    g.translate(hx + rx * 0.62, hy - ry * 0.55 - hit * r * 0.12);
    g.rotate(-0.85 - hit * 0.25);
    g.fillStyle = '#5A3A22';
    g.fillRect(-r * 0.04, -r * 0.05, r * 0.82, r * 0.09);
    g.fillStyle = P.lacquer;
    g.fillRect(r * 0.62, -r * 0.06, r * 0.22, r * 0.11);
    g.restore();
    g.restore();
  }

  /**
   * The reset button's stand-in: a mõ, the round wooden slit drum knocked to
   * keep time in pagodas and village halls, on a red cushion with its mallet.
   */
  moDrum(x, y, r, hit = 0) {
    const g = this.ctx;
    // Cushion.
    g.fillStyle = P.lacquer;
    g.beginPath();
    g.ellipse(x, y + r * 0.68, r * 0.95, r * 0.24, 0, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.shadowColor = 'transparent';
    g.fillStyle = P.bronzeLight;
    g.fillRect(x - r * 0.95, y + r * 0.66, r * 1.9, Math.max(1.5, r * 0.05));
    // The body: a squat round block of dark polished wood, a touch wider than tall.
    const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 0.95);
    grad.addColorStop(0, hit ? '#C98A4E' : '#A86E3A');
    grad.addColorStop(1, '#4E2E16');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(x, y + r * 0.05, r * 0.86, r * 0.7, 0, 0, Math.PI * 2);
    g.fill();
    // Carved rings on the crown.
    g.strokeStyle = 'rgba(22,21,26,0.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(x, y - r * 0.12, r * 0.6, r * 0.42, 0, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
    // The slit: a long curved mouth cut through the front.
    g.fillStyle = '#1A0F08';
    g.beginPath();
    g.moveTo(x - r * 0.7, y + r * 0.3);
    g.quadraticCurveTo(x, y + r * 0.42, x + r * 0.7, y + r * 0.3);
    g.lineTo(x + r * 0.7, y + r * 0.36);
    g.quadraticCurveTo(x, y + r * 0.5, x - r * 0.7, y + r * 0.36);
    g.closePath();
    g.fill();
    // Highlight.
    g.strokeStyle = 'rgba(242,232,213,0.45)';
    g.lineWidth = Math.max(1.5, r * 0.06);
    g.beginPath();
    g.ellipse(x, y + r * 0.05, r * 0.72, r * 0.56, 0, Math.PI * 1.15, Math.PI * 1.5);
    g.stroke();
    // The mallet, leaning on the cushion against the body; it taps in on a press.
    const tip = { x: x + r * (0.8 - 0.12 * hit), y: y - r * 0.12 };
    const foot = { x: x + r * 1.08, y: y + r * 0.68 };
    g.strokeStyle = '#5A3A22';
    g.lineWidth = Math.max(2, r * 0.09);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(foot.x, foot.y);
    g.lineTo(tip.x, tip.y);
    g.stroke();
    g.fillStyle = '#7A4A26';
    g.beginPath();
    g.ellipse(tip.x, tip.y, r * 0.15, r * 0.13, -0.5, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.restore();
  }

  /** The shield, reset and pause buttons, and the rings left by touches. */
  touchButtons(view) {
    const g = this.ctx;
    const t = view.songTime;
    const sheet = this.art.get('touch-buttons');
    const b = view.battle;
    const buttons = [['reset', TOUCH.reset, 1], ['pause', TOUCH.pause, 2]];
    if (view.mode === 'battle') buttons.unshift(['guard', TOUCH.shield, 0]);
    for (const [id, pos, cellIx] of buttons) {
      const since = t - (this.pressed[id] ?? -9);
      const press = since < 0.18 ? 1 - 0.1 * Math.sin((since / 0.18) * Math.PI) : 1;
      let glow = 0;
      let alpha = id === 'pause' ? 0.75 : 0.92;
      if (id === 'guard') {
        // Call for the shield while an attack is coming; dim while it recovers.
        if ((view.threats.length || view.incoming) && !view.shieldsUp) glow = 0.6 + 0.4 * Math.sin(t * 12);
        if (b.time < b.guardReadyAt && !view.shieldsUp) alpha = 0.6;
      }
      const r = pos.r * press;
      const struck = id === 'guard' ? this.kicks.chau : id === 'reset' ? this.kicks.mo : -9;
      const bs = this.shiver(Math.max(struck, this.pressed[id] ?? -9), t, id === 'pause' ? 0 : 4);
      g.save();
      g.translate(bs.dx, bs.dy);
      g.globalAlpha = alpha;
      g.shadowColor = glow ? P.bronzeLight : 'rgba(0,0,0,0.55)';
      g.shadowBlur = glow ? 20 + 14 * glow : 10;
      g.shadowOffsetY = glow ? 0 : 4;
      const hit = Math.max(since < 0.25 ? 1 - since / 0.25 : 0, bs.k);
      if (sheet) {
        const cw = sheet.width / 3;
        g.drawImage(sheet, cellIx * cw, 0, cw, sheet.height, pos.x - r / 0.9, pos.y - r / 0.9, (2 * r) / 0.9, (2 * r) / 0.9);
      } else if (id === 'guard') this.chauDrum(pos.x, pos.y, r, hit);
      else if (id === 'reset') this.moDrum(pos.x, pos.y, r, hit);
      else {
        g.fillStyle = P.indigo;
        g.beginPath();
        g.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        g.fill();
        g.shadowColor = 'transparent';
        g.strokeStyle = P.bronze;
        g.lineWidth = Math.max(2, r * 0.08);
        g.beginPath();
        g.arc(pos.x, pos.y, r - g.lineWidth / 2, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = P.paper;
        g.fillRect(pos.x - r * 0.32, pos.y - r * 0.4, r * 0.22, r * 0.8);
        g.fillRect(pos.x + r * 0.1, pos.y - r * 0.4, r * 0.22, r * 0.8);
      }
      g.restore();
      if (view.shieldsUp && id === 'guard') {
        // The shield wall is up: a verdigris ring round the barrel drum.
        g.save();
        g.strokeStyle = P.verdigris;
        g.lineWidth = 5;
        g.beginPath();
        g.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
      if (id === 'guard' || id === 'reset') {
        g.save();
        g.font = `700 ${Math.round(16 * (this.compact ? Math.min(1.5, 0.95 / this.cssScale / 1.3) : 1))}px "Be Vietnam Pro", system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillStyle = P.paper;
        g.globalAlpha = alpha;
        g.shadowColor = 'rgba(0,0,0,0.9)';
        g.shadowBlur = 4;
        g.fillText(id === 'guard' ? 'Shield' : 'Reset', pos.x, pos.y - pos.r - 10);
        g.restore();
      }
    }
    // A swipe's streak, fading.
    for (const sw of (this.swipes || []).filter((q) => t - q.t < 0.4)) {
      const q = (t - sw.t) / 0.4;
      g.save();
      g.globalAlpha = 0.8 * (1 - q);
      g.strokeStyle = P.paper;
      g.lineWidth = 10 * (1 - q) + 2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(sw.x0, sw.y0);
      g.lineTo(sw.x, sw.y);
      g.stroke();
      g.restore();
    }
    // Rings where fingers landed.
    this.taps = this.taps.filter((p) => t - p.t < 0.35);
    for (const p of this.taps) {
      const q = (t - p.t) / 0.35;
      g.strokeStyle = p.target === 'L' ? P.bronzeLight : p.target === 'R' ? P.lacquer : P.paper;
      g.globalAlpha = 1 - q;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(p.x, p.y, 14 + 30 * q, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /**
   * A pattern as beat cells: one stroke fills its cell, a pair or a triplet
   * shares it (smaller, joined by a beam). The first `filled` strokes are
   * solid; the rest are faint, still to come.
   */
  pattern(x, y, pattern, r, cell, filled = Infinity, glow = false, small = false) {
    const g = this.ctx;
    const strokes = pattern.strokes;
    const perBeat = {};
    for (const s of strokes) perBeat[Math.floor(s.pos)] = (perBeat[Math.floor(s.pos)] || 0) + 1;
    strokes.forEach((s, i) => {
      const beat = Math.floor(s.pos);
      const n = perBeat[beat];
      const inner = s.pos - beat;
      const rr = n === 1 ? r : n === 2 ? r * 0.72 : r * 0.62;
      const sx = x + beat * cell + cell / 2 + (n === 1 ? 0 : (inner - (n - 1) / (2 * n)) * cell * (small ? 1.05 : 0.95));
      g.globalAlpha = i < filled ? 1 : 0.28;
      if (glow && i < filled && !small) {
        g.save();
        g.shadowColor = P.bronzeLight;
        g.shadowBlur = 10;
        this.glyph(sx, y, s.drum, rr);
        g.restore();
      } else this.glyph(sx, y, s.drum, rr);
    });
    // Beams under pairs and triplets.
    g.globalAlpha = 0.8;
    g.strokeStyle = P.paper;
    g.lineWidth = small ? 1 : 1.5;
    for (const [beat, n] of Object.entries(perBeat)) {
      if (n < 2) continue;
      const bx = x + Number(beat) * cell + cell / 2;
      const half = ((n - 1) / (2 * n)) * cell * (small ? 1.05 : 0.95);
      g.beginPath();
      g.moveTo(bx - half, y + r + 3);
      g.lineTo(bx + half, y + r + 3);
      g.stroke();
      if (n === 3 && !small) {
        g.font = '600 10px "Be Vietnam Pro", system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillStyle = P.paper;
        g.fillText('3', bx, y + r + 14);
      }
    }
    g.globalAlpha = 1;
  }

  /** Start the reset animation for the phrase that was showing. */
  clearDots(phraseView, t) {
    this.clearing = { pattern: phraseView.pattern, filled: phraseView.filled, t };
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

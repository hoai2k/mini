// Steampresser Sparrow: Pressing Business.
//
// The laundry's ironing board, and a basket of crumpled washing. One garment
// at a time slides onto the board, crossed with creases. The Steampresser
// Sparrow is the iron: move it anywhere on the board (stick, arrows or
// pointer), and any crease under its sole is pressed flat as it passes;
// each crease pressed out scores one. Press the action for a puff of steam,
// which presses much faster for a moment (three puffs in the tank, refilling
// as you go). But an iron left lingering heats the cloth, and steam heats
// it faster: let it get too hot and it scorches (−2). Keep it moving. Press
// out every crease of a garment without a scorch for a bonus of two. The
// next garment comes when this one is done or its time runs out; later ones
// have more creases, less time, and some are delicate silk that scorches
// sooner. Score: points.

import { drawBird, drawSprite, scene, SHEETS, band, blob, poly, wash, ink, hatch, label, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  // shirt, handkerchief, trousers, silk scarf, pillowcase, tablecloth: laid flat, seen from above
  'sprites.pressGarments': [3, 2],
  // the Sparrow pressing, legs tucked under; the same with steam billowing from its sole
  'sprites.sparrowPress': [2, 1],
});

const DURATION = 45;
// The ironing board, seen from above.
const BX0 = 150;
const BX1 = 1450;
const BY0 = 380;
const BY1 = 790;
// Where the iron can go (its sole's centre).
const IX0 = 230;
const IX1 = 1390;
const IY0 = 410;
const IY1 = 760;
const CELL = 40;
const COLS = Math.ceil((BX1 - BX0) / CELL);
const ROWS = Math.ceil((BY1 - BY0) / CELL);

const SOLE_RX = 78;
const SOLE_RY = 40;
const PRESS = 1.4; // pressing per second under the sole
const STEAM_PRESS = 2.7;
const STEAM_SIZE = 1.25;
const PUFF = 0.65; // seconds of steam per puff
const TANK = 3;
const REFILL = 1.3; // seconds per puff
const HEAT = 0.4; // heat per second while lingering, dry
const STEAM_HEAT = 1.5;
const COOL = 0.9;
const STILL = 400; // at or above this speed, the cloth doesn't heat
const SPEED = 640;
const SIZE = 290;
const K = SIZE / 400;

const GARMENTS = [
  { kind: 'hanky', w: 520, h: 300, col: '#f4f0e4', i: 1 },
  { kind: 'shirt', w: 860, h: 340, col: '#dfe8f0', i: 0 },
  { kind: 'pillow', w: 760, h: 300, col: '#f2e8d8', i: 4 },
  { kind: 'trousers', w: 940, h: 300, col: '#9aa0a8', i: 2 },
  { kind: 'cloth', w: 1000, h: 340, col: '#f0e6dc', i: 5 },
  { kind: 'scarf', w: 960, h: 200, col: '#eab0c4', i: 3, silk: true },
];

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    x: 800,
    y: 590,
    vx: 0,
    vy: 0,
    speed: 0,
    steam: 0, // seconds of steam left in this puff
    tank: TANK,
    garment: null,
    leaving: null, // the last one, sliding off
    gT: 0,
    heat: new Float32Array(COLS * ROWS),
    scorchCool: 0,
    pops: [],
    puffs: [],
    count: 0,
    creases: 0,
    scorches: 0,
    perfect: 0,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  function pop(text, x, y, color = INK, size = 42) {
    g.pops.push({ text, x, y, color, size, life: 1.2 });
  }
  const add = (n) => {
    g.score = Math.max(0, g.score + n);
  };

  // A garment with its creases: each crease a wavy line of points, each
  // point pressed flat 0..1.
  function nextGarment() {
    const p = progress();
    g.count++;
    let pool = GARMENTS.filter((G) => !G.silk);
    if (g.count === 1) pool = [GARMENTS[0]];
    else if (g.elapsed > 14 && rng() < lerp(0.15, 0.35, p)) pool = [GARMENTS[5]];
    const G = pool[Math.floor(rng() * pool.length)];
    const cx = 810;
    const cy = 585;
    const n = Math.min(7, Math.round(lerp(2, 6, p) + (G.w > 800 ? 1 : 0) + (rng() < 0.4 ? 1 : 0)));
    const creases = [];
    for (let k = 0; k < n; k++) {
      let tries = 0;
      let c = null;
      while (tries++ < 20) {
        const len = lerp(150, 290, rng()) * (0.8 + 0.4 * p);
        const a = (rng() - 0.5) * 2.2;
        const mx = cx + (rng() - 0.5) * (G.w - len * 0.8 - 60);
        const my = cy + (rng() - 0.5) * (G.h - 80);
        const x0 = mx - (Math.cos(a) * len) / 2;
        const y0 = my - (Math.sin(a) * len) / 2;
        const bend = (rng() - 0.5) * 50;
        const pts = [];
        const m = Math.max(4, Math.round(len / 22));
        for (let i = 0; i <= m; i++) {
          const u = i / m;
          const off = Math.sin(u * Math.PI) * bend;
          pts.push({ x: x0 + Math.cos(a) * len * u - Math.sin(a) * off, y: y0 + Math.sin(a) * len * u + Math.cos(a) * off, flat: 0 });
        }
        if (pts.every((q) => q.x > IX0 && q.x < IX1 && q.y > IY0 && q.y < IY1 && Math.abs(q.x - cx) < G.w / 2 - 20 && Math.abs(q.y - cy) < G.h / 2 - 16)) {
          if (!creases.some((o) => o.pts.some((q) => pts.some((r) => Math.hypot(q.x - r.x, q.y - r.y) < 40)))) {
            c = { pts, done: false, seed: rng() * 100 };
            break;
          }
        }
      }
      if (c) creases.push(c);
    }
    const limit = lerp(13, 8, p) + creases.length * 0.6;
    g.garment = { ...G, cx, cy, creases, limit, t: 0, slide: 1, scorched: 0, marks: [] };
    g.heat.fill(0);
    sfx('page');
  }
  nextGarment();

  // Bot and test helpers.
  g.open = () => (g.garment ? g.garment.creases.filter((c) => !c.done) : []);
  g.solePoint = (q, steam = g.steam > 0) => {
    const s = steam ? STEAM_SIZE : 1;
    const dx = (q.x - (g.x - 10)) / (SOLE_RX * s);
    const dy = (q.y - g.y) / (SOLE_RY * s);
    return dx * dx + dy * dy <= 1;
  };
  g.heatAt = (x, y) => {
    const i = Math.floor((x - BX0) / CELL);
    const j = Math.floor((y - BY0) / CELL);
    if (i < 0 || j < 0 || i >= COLS || j >= ROWS) return 0;
    return g.heat[j * COLS + i];
  };

  function finishGarment(timeUp) {
    const G = g.garment;
    if (!timeUp && !G.scorched) {
      add(2);
      g.perfect++;
      pop('Perfectly pressed!  +2', G.cx, BY0 - 50, PAL.magenta, 50);
      sfx('bloom');
    } else if (!timeUp) {
      pop('Pressed!', G.cx, BY0 - 50, PAL.green, 46);
      sfx('right');
    } else {
      pop('Next!', G.cx, BY0 - 50, PAL.slate, 44);
      sfx('page');
    }
    g.leaving = { ...G, out: 0 };
    nextGarment();
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }

    // Move the iron.
    const x0 = g.x;
    const y0 = g.y;
    if (input.pointer.active) {
      g.x = approach(g.x, input.pointer.x, 10, dt);
      g.y = approach(g.y, input.pointer.y, 10, dt);
    } else {
      g.vx = approach(g.vx, clamp(input.x, -1, 1) * SPEED, 12, dt);
      g.vy = approach(g.vy, clamp(input.y, -1, 1) * SPEED, 12, dt);
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    }
    g.x = clamp(g.x, IX0, IX1);
    g.y = clamp(g.y, IY0, IY1);
    const v = Math.hypot(g.x - x0, g.y - y0) / dt;
    g.speed = approach(g.speed, v, 10, dt);

    // Steam: a puff on each press, while the tank has some.
    if (input.actionPressed) {
      if (g.tank >= 1) {
        g.tank -= 1;
        g.steam = PUFF;
        sfx('splash');
      } else sfx('tick');
    }
    g.steam = Math.max(0, g.steam - dt);
    g.tank = Math.min(TANK, g.tank + dt / REFILL);
    const steaming = g.steam > 0;
    if (steaming && Math.random() < 0.6) g.puffs.push({ x: g.x + (Math.random() - 0.5) * 120, y: g.y + 10, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 80, life: 0.9, r: 12 + Math.random() * 10 });

    const G = g.garment;
    G.slide = Math.max(0, G.slide - dt * 4);
    G.t += dt;
    g.leaving && (g.leaving.out += dt * 3);
    if (g.leaving && g.leaving.out > 1) g.leaving = null;

    // Pressing: every crease point under the sole.
    if (G.slide <= 0) {
      const rate = steaming ? STEAM_PRESS : PRESS;
      for (const c of G.creases) {
        if (c.done) continue;
        for (const q of c.pts) if (q.flat < 1 && g.solePoint(q, steaming)) q.flat = Math.min(1, q.flat + rate * dt);
        if (c.pts.every((q) => q.flat >= 0.95)) {
          c.done = true;
          for (const q of c.pts) q.flat = 1;
          g.creases++;
          add(1);
          const mid = c.pts[Math.floor(c.pts.length / 2)];
          pop('+1', mid.x, mid.y - 50, PAL.green, 40);
          sfx('grow', { pitch: 4 + (g.creases % 5) * 2 });
        }
      }

      // Heat: lingering warms the cloth under the sole; steam, and silk, more.
      const still = 1 - clamp(g.speed / STILL, 0, 1);
      const heatRate = (steaming ? STEAM_HEAT : HEAT) * (G.silk ? 1.7 : 1) * still;
      for (let i = 0; i < g.heat.length; i++) g.heat[i] = Math.max(0, g.heat[i] - COOL * dt);
      let hot = 0;
      const ci0 = Math.floor((g.x - SOLE_RX - BX0) / CELL);
      const ci1 = Math.floor((g.x + SOLE_RX - BX0) / CELL);
      const cj0 = Math.floor((g.y - SOLE_RY - BY0) / CELL);
      const cj1 = Math.floor((g.y + SOLE_RY - BY0) / CELL);
      for (let j = Math.max(0, cj0); j <= Math.min(ROWS - 1, cj1); j++) {
        for (let i = Math.max(0, ci0); i <= Math.min(COLS - 1, ci1); i++) {
          const cx = BX0 + (i + 0.5) * CELL;
          const cy = BY0 + (j + 0.5) * CELL;
          const dx = (cx - g.x) / SOLE_RX;
          const dy = (cy - g.y) / SOLE_RY;
          const d = dx * dx + dy * dy;
          if (d > 1.2) continue;
          const k = j * COLS + i;
          g.heat[k] += (heatRate + COOL) * dt * (1 - d * 0.4);
          hot = Math.max(hot, g.heat[k]);
        }
      }
      g.hot = hot;
      g.scorchCool = Math.max(0, g.scorchCool - dt);
      if (hot >= 1 && g.scorchCool <= 0) {
        // Scorched! An iron-shaped mark is left on the cloth.
        g.scorches++;
        G.scorched++;
        add(-2);
        G.marks.push({ x: g.x, y: g.y, rot: (rng() - 0.5) * 0.2 });
        g.scorchCool = 1;
        for (let k = 0; k < g.heat.length; k++) g.heat[k] = Math.min(g.heat[k], 0.3);
        pop('Scorched!  −2', g.x, g.y - 120, PAL.brick, 46);
        sfx('wrong');
        env.vibrate?.(140);
      }
    }

    if (G.creases.every((c) => c.done)) finishGarment(false);
    else if (G.t >= G.limit) finishGarment(true);

    for (const p of g.puffs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += 20 * dt;
      p.life -= dt;
    }
    g.puffs = g.puffs.filter((p) => p.life > 0);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Points ${g.score} · Steam ${'●'.repeat(Math.floor(g.tank))}${'○'.repeat(TANK - Math.floor(g.tank))}`;
  g.summary = () => {
    const lines = [`${g.creases} crease${g.creases === 1 ? '' : 's'} pressed out, ${g.perfect} garment${g.perfect === 1 ? '' : 's'} pressed perfectly.`];
    lines.push(g.scorches ? `${g.scorches} scorch mark${g.scorches === 1 ? '' : 's'}.` : 'Not a single scorch!');
    return lines;
  };

  // ---------- drawing ----------

  function garmentShape(c, G, x, y) {
    const w = G.w;
    const h = G.h;
    const L = x - w / 2;
    const T = y - h / 2;
    if (G.kind === 'shirt') {
      poly(c, [[L + w * 0.2, T], [L + w * 0.8, T], [L + w, T + h * 0.3], [L + w * 0.86, T + h * 0.45], [L + w * 0.8, T + h * 0.35], [L + w * 0.8, T + h], [L + w * 0.2, T + h], [L + w * 0.2, T + h * 0.35], [L + w * 0.14, T + h * 0.45], [L, T + h * 0.3]], 3, 1.5);
    } else if (G.kind === 'trousers') {
      poly(c, [[L, T], [L + w, T], [L + w, T + h * 0.48], [L + w * 0.35, T + h * 0.52], [L + w, T + h * 0.56], [L + w, T + h], [L, T + h]], 4, 1.5);
    } else {
      poly(c, [[L, T], [L + w, T], [L + w, T + h], [L, T + h]], 5, 1.5);
    }
  }

  function drawGarment(c, G, dx) {
    const x = G.cx + dx;
    const y = G.cy;
    c.save();
    if (!drawSprite(c, 'sprites.pressGarments', G.i, x, y, { w: G.w, anchor: 'center' })) {
      garmentShape(c, G, x, y);
      wash(c, G.col, 0.95);
      ink(c, 2.2);
      c.save();
      garmentShape(c, G, x, y);
      c.clip();
      if (G.kind === 'cloth') {
        c.globalAlpha = 0.18;
        c.fillStyle = PAL.brick;
        for (let i = 0; i < G.w; i += 60) c.fillRect(x - G.w / 2 + i, y - G.h / 2, 26, G.h);
        for (let j = 0; j < G.h; j += 60) c.fillRect(x - G.w / 2, y - G.h / 2 + j, G.w, 26);
      } else if (G.kind === 'hanky') {
        c.strokeStyle = PAL.slate;
        c.lineWidth = 6;
        c.strokeRect(x - G.w / 2 + 22, y - G.h / 2 + 22, G.w - 44, G.h - 44);
      } else if (G.kind === 'pillow') {
        c.strokeStyle = 'rgba(185,138,163,0.5)';
        c.lineWidth = 10;
        c.strokeRect(x + G.w / 2 - 90, y - G.h / 2, 40, G.h);
      } else if (G.kind === 'scarf') {
        c.globalAlpha = 0.3;
        for (let i = 0; i < 9; i++) {
          blob(c, x - G.w / 2 + 60 + i * 105, y + Math.sin(i) * 40, 30, 22, i + 40, 0.2);
          c.fillStyle = PAL.magenta;
          c.fill();
        }
      } else if (G.kind === 'shirt') {
        c.beginPath();
        c.moveTo(x, y - G.h / 2);
        c.lineTo(x, y + G.h / 2);
        ink(c, 1.4);
        c.stroke();
        for (let k = 0; k < 4; k++) {
          c.beginPath();
          c.arc(x + 12, y - G.h / 2 + 60 + k * 70, 5, 0, Math.PI * 2);
          c.fillStyle = '#f8f8f8';
          c.fill();
          ink(c, 1.2);
          c.stroke();
        }
      }
      c.restore();
    }
    if (G.silk) {
      // a little sewn-in label: delicate
      poly(c, [[x - G.w / 2 + 20, y - G.h / 2 + 14], [x - G.w / 2 + 120, y - G.h / 2 + 14], [x - G.w / 2 + 120, y - G.h / 2 + 46], [x - G.w / 2 + 20, y - G.h / 2 + 46]], 6, 0.6);
      wash(c, '#fbf4e4');
      ink(c, 1.4);
      label(c, 'silk', x - G.w / 2 + 70, y - G.h / 2 + 31, { size: 22, color: PAL.magenta, weight: 700 });
    }
    // scorch marks: brown iron shapes
    for (const m of G.marks) {
      c.save();
      c.translate(m.x + dx, m.y);
      c.rotate(m.rot);
      c.beginPath();
      c.moveTo(-SOLE_RX - 12, 0);
      c.quadraticCurveTo(-SOLE_RX * 0.3, -SOLE_RY, SOLE_RX * 0.8, -SOLE_RY * 0.9);
      c.lineTo(SOLE_RX * 0.8, SOLE_RY * 0.9);
      c.quadraticCurveTo(-SOLE_RX * 0.3, SOLE_RY, -SOLE_RX - 12, 0);
      c.fillStyle = 'rgba(120,70,30,0.55)';
      c.fill();
      c.restore();
    }
    // the creases: dark folds that fade as they're pressed
    for (const cr of G.creases) {
      const pts = cr.pts;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const left = 1 - Math.min(a.flat, b.flat);
        if (left <= 0.02) continue;
        c.save();
        c.globalAlpha = 0.25 + 0.75 * left;
        // the fold's shadow
        c.beginPath();
        c.moveTo(a.x + dx, a.y + 5);
        c.lineTo(b.x + dx, b.y + 5);
        ink(c, 9 * left + 2, 'rgba(90,80,100,0.35)');
        c.stroke();
        // the zigzag of the fold
        c.beginPath();
        const mx = (a.x + b.x) / 2 + dx;
        const my = (a.y + b.y) / 2;
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        const nl = Math.hypot(nx, ny) || 1;
        const z = (i % 2 ? 1 : -1) * 6 * left;
        c.moveTo(a.x + dx, a.y);
        c.lineTo(mx + (nx / nl) * z, my + (ny / nl) * z);
        c.lineTo(b.x + dx, b.y);
        ink(c, 2.2);
        c.stroke();
        c.restore();
      }
    }
  }

  function drawIron(c, t) {
    const steaming = g.steam > 0;
    const hot = g.hot || 0;
    // the sole's footprint: a glow that warms from yellow to red with the heat
    c.save();
    const s = steaming ? STEAM_SIZE : 1;
    c.globalAlpha = 0.25 + 0.45 * hot;
    c.beginPath();
    c.ellipse(g.x - 10, g.y, SOLE_RX * s, SOLE_RY * s, 0, 0, Math.PI * 2);
    const col = hot > 0.7 ? '#d0402a' : hot > 0.4 ? '#e09a48' : '#f0d878';
    c.fillStyle = col;
    c.fill();
    c.globalAlpha = 0.8;
    ink(c, 2, hot > 0.7 ? '#a02a1a' : 'rgba(59,43,32,0.4)');
    c.setLineDash([8, 8]);
    c.stroke();
    c.restore();
    // the Sparrow, its sole on the cloth (legs tucked out of sight)
    const lean = clamp(g.vx / SPEED, -1, 1) * 0.06;
    const shake = hot > 0.75 && !env.reduceMotion ? Math.sin(t * 50) * 2 : 0;
    const frame = steaming ? 1 : 0;
    c.save();
    c.translate(g.x + shake, g.y + 6);
    c.rotate(lean);
    if (!drawSprite(c, 'sprites.sparrowPress', frame, 0, 0, { h: SIZE * 0.62 })) {
      c.beginPath();
      c.rect(-SIZE, -SIZE * 1.2, SIZE * 2, SIZE * 1.2);
      c.clip();
      drawBird(c, 'steampressersparrow', { x: 0, y: 130 * K, size: SIZE, t });
    }
    c.restore();
  }

  function drawLaundry(c) {
    // the laundry wall: tiles and a window of steam
    band(c, 0, 0, W, 360, '#d8e2dc', 0.6, 1);
    for (let x = 0; x < W; x += 80) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 340);
      ink(c, 1, 'rgba(59,43,32,0.15)');
      c.stroke();
    }
    for (let y = 0; y < 340; y += 80) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      ink(c, 1, 'rgba(59,43,32,0.15)');
      c.stroke();
    }
    // the floor
    band(c, 0, 340, W, H - 340, '#c9a87a', 0.55, 2);
    hatch(c, 0, 340, W, H, 18, 0.12, 1);
    // the basket of washing, top right; the folded pile, top left
    blob(c, 1460, 300, 120, 60, 7, 0.06);
    wash(c, PAL.wafer);
    ink(c, 2.2);
    hatch(c, 1340, 250, 1580, 350, 10, 0.25, 2);
    for (let i = 0; i < 4; i++) {
      blob(c, 1410 + i * 35, 250 - (i % 2) * 14, 40, 22, 20 + i, 0.25);
      wash(c, ['#dfe8f0', '#eab0c4', '#f2e8d8', '#9aa0a8'][i], 0.9);
      ink(c, 1.4);
    }
    for (let i = 0; i < 4; i++) {
      poly(c, [[60, 330 - i * 26], [240, 330 - i * 26], [236, 306 - i * 26], [64, 306 - i * 26]], 30 + i, 1);
      wash(c, ['#f4f0e4', '#dfe8f0', '#f0e6dc', '#9aa0a8'][i], 0.9);
      ink(c, 1.6);
    }
    // the ironing board: a long padded plank, pointed at the left
    c.beginPath();
    c.moveTo(BX0 - 40, (BY0 + BY1) / 2);
    c.quadraticCurveTo(BX0, BY0 - 10, BX0 + 200, BY0);
    c.lineTo(BX1, BY0);
    c.quadraticCurveTo(BX1 + 30, BY0, BX1 + 30, BY0 + 30);
    c.lineTo(BX1 + 30, BY1 - 30);
    c.quadraticCurveTo(BX1 + 30, BY1, BX1, BY1);
    c.lineTo(BX0 + 200, BY1);
    c.quadraticCurveTo(BX0, BY1 + 10, BX0 - 40, (BY0 + BY1) / 2);
    c.closePath();
    wash(c, '#e8dcc0', 0.95);
    ink(c, 2.6);
    c.save();
    c.clip();
    c.globalAlpha = 0.18;
    for (let x = BX0 - 40; x < BX1 + 40; x += 34) {
      for (let y = BY0; y < BY1; y += 34) {
        c.beginPath();
        c.arc(x + ((y / 34) % 2) * 17, y, 4, 0, Math.PI * 2);
        c.fillStyle = PAL.slate;
        c.fill();
      }
    }
    c.restore();
  }

  g.draw = (c, t) => {
    scene(c, 'steampressersparrow', W, H, drawLaundry);

    if (g.leaving) drawGarment(c, g.leaving, -g.leaving.out * 1200);
    drawGarment(c, g.garment, g.garment.slide * 1100);

    // how long this garment has: a ribbon along the board's top edge
    const G = g.garment;
    const left = clamp(1 - G.t / G.limit, 0, 1);
    c.save();
    poly(c, [[BX0 + 200, BY0 - 26], [BX1, BY0 - 26], [BX1, BY0 - 12], [BX0 + 200, BY0 - 12]], 9, 0.5);
    c.fillStyle = 'rgba(250,244,228,0.8)';
    c.fill();
    c.fillStyle = left < 0.25 ? PAL.brick : PAL.sage;
    c.fillRect(BX0 + 200, BY0 - 26, (BX1 - BX0 - 200) * left, 14);
    ink(c, 1.4);
    c.strokeRect(BX0 + 200, BY0 - 26, BX1 - BX0 - 200, 14);
    c.restore();

    drawIron(c, t);

    for (const p of g.puffs) {
      c.save();
      c.globalAlpha = clamp(p.life, 0, 1) * 0.55;
      blob(c, p.x, p.y, p.r, p.r * 0.8, Math.floor(p.r), 0.15, 10);
      c.fillStyle = '#ffffff';
      c.fill();
      c.restore();
    }

    for (const p of g.pops) {
      c.save();
      c.globalAlpha = Math.min(1, p.life * 2);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = `800 ${p.size}px Fraunces, Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeText(p.text, p.x, p.y);
      label(c, p.text, p.x, p.y, { size: p.size, color: p.color, weight: 800 });
      c.restore();
    }

    if (g.elapsed < 4.5) {
      c.save();
      c.globalAlpha = Math.min(1, 4.5 - g.elapsed);
      label(c, 'Glide over the creases · press for steam · keep moving!', W / 2, 300, { size: 34, weight: 600 });
      c.restore();
    }
  };

  g.focus = () => clamp(g.x, 450, W - 450);
  g.span = 900;

  return g;
}

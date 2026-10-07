// Ice-Cream Cone Coot: Scoop Stack.
//
// Scoops fall from the sky; move the Coot to catch them on its head. Each
// scoop sits where it touched the one below, so an off-centre catch leans the
// stack, and the Coot's own running sways it. Lean too far and the whole stack
// topples. Pickles and socks knock off the top scoop; a golden cherry counts
// three. Score: the tallest stack built (counting cherries as three).

import { drawBird, birdPoint, drawSprite, scene, band, blob, scoop as scoopPath, wash, ink, poly, label, PAL, INK } from '../draw.js';
import { clamp, approach } from './index.js';

const DURATION = 45;
const GROUND = 840;
const BIRD_SIZE = 300;
const K = BIRD_SIZE / 400;
// The top of the Coot's head, relative to its feet: the portrait's once it is
// delivered, the stand-in's until then. Read when the game starts.
const head = () => birdPoint('coot', 'head').map((v) => v * K);
const R = 30; // scoop radius
const STEP = R * 1.45; // height of each scoop in the stack
const TOPPLE = 46; // how far the stack's balance point may lean, in px

const FLAVOURS = [PAL.strawberry, PAL.lemon, '#f3ead2', '#8a5a3a', PAL.mint, '#b8c878', '#9aa8d8'];

export default function create(env) {
  const [HEAD_DX, HEAD_DY] = head();
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    x: W / 2,
    vx: 0,
    stack: [], // { dx, color, kind, count }
    sway: 0,
    swayV: 0,
    items: [], // falling: { x, y, vy, kind, color, spin }
    bits: [], // flying debris after a topple or a knock
    splats: [],
    spawn: 0.6,
    elapsed: 0,
    flash: 0,
    topples: 0,
  };

  const height = () => g.stack.reduce((n, s) => n + s.count, 0);

  function topPos() {
    let x = g.x + HEAD_DX;
    let y = GROUND + HEAD_DY;
    for (let i = 0; i < g.stack.length; i++) {
      x += g.stack[i].dx + Math.sin(g.sway) * STEP * 0.4 * (i + 1) / Math.max(1, g.stack.length) ;
      y -= STEP;
    }
    return { x, y };
  }

  // Where the stack's weight sits, relative to the head: the mean of each
  // scoop's offset, plus the sway.
  function balance() {
    if (!g.stack.length) return 0;
    let off = 0;
    let sum = 0;
    g.stack.forEach((s) => {
      off += s.dx;
      sum += off;
    });
    return sum / g.stack.length + Math.sin(g.sway) * g.stack.length * 5;
  }

  function topple() {
    const base = { x: g.x + HEAD_DX, y: GROUND + HEAD_DY };
    let off = 0;
    g.stack.forEach((s, i) => {
      off += s.dx;
      g.bits.push({ x: base.x + off, y: base.y - (i + 1) * STEP, vx: Math.sign(balance() || 1) * (120 + rng() * 200), vy: -200 - rng() * 200, color: s.color, kind: s.kind, r: R, spin: rng() * 6 });
    });
    g.stack = [];
    g.sway = 0;
    g.swayV = 0;
    g.topples++;
    sfx('topple');
    env.vibrate?.(120);
  }

  function spawnItem() {
    const t = g.elapsed / DURATION;
    const roll = rng();
    let kind = 'scoop';
    if (g.elapsed > 6 && roll < 0.08 + t * 0.1) kind = rng() < 0.5 ? 'pickle' : 'sock';
    else if (roll > 0.955) kind = 'cherry';
    g.items.push({
      x: 160 + rng() * (W - 320),
      y: -40,
      vy: 230 + t * 260 + rng() * 60,
      kind,
      color: FLAVOURS[Math.floor(rng() * FLAVOURS.length)],
      spin: (rng() - 0.5) * 3,
      a: 0,
    });
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }

    // Move: follow the pointer, or run with the stick.
    const prev = g.x;
    if (input.pointer.active) g.x = approach(g.x, input.pointer.x - HEAD_DX, 10, dt);
    else g.x += input.x * 820 * dt;
    g.x = clamp(g.x, 140, W - 140);
    const vx = (g.x - prev) / Math.max(dt, 1e-4);
    const ax = (vx - g.vx) / Math.max(dt, 1e-4);
    g.vx = vx;

    // Sway: a damped spring the running pushes against.
    const n = g.stack.length;
    g.swayV += (-g.sway * 14 - g.swayV * 3.2 - clamp(ax, -6000, 6000) * 0.00009 * Math.min(n, 12)) * dt;
    g.sway += g.swayV * dt;
    if (n && Math.abs(balance()) > TOPPLE) topple();

    // Spawn: faster as time goes on.
    g.spawn -= dt;
    if (g.spawn <= 0) {
      spawnItem();
      const t = g.elapsed / DURATION;
      g.spawn = 1.0 - t * 0.55 + rng() * 0.25;
    }

    const top = topPos();
    for (const it of g.items) {
      it.y += it.vy * dt;
      it.a += it.spin * dt;
      if (it.dead) continue;
      const dx = it.x - top.x;
      if (it.y >= top.y - R && it.y <= top.y + R * 0.6 && Math.abs(dx) < R * 1.7) {
        it.dead = true;
        if (it.kind === 'pickle' || it.kind === 'sock') {
          if (g.stack.length) {
            const s = g.stack.pop();
            g.bits.push({ x: top.x, y: top.y, vx: (dx > 0 ? -1 : 1) * 260, vy: -260, color: s.color, kind: s.kind, r: R, spin: 4 });
          }
          g.bits.push({ x: it.x, y: it.y, vx: (dx > 0 ? 1 : -1) * 220, vy: -320, color: it.color, kind: it.kind, r: R, spin: 6 });
          sfx('bonk');
          g.flash = 0.25;
          env.vibrate?.(60);
        } else {
          g.stack.push({ dx: clamp(dx, -R * 1.2, R * 1.2), color: it.kind === 'cherry' ? '#d8303a' : it.color, kind: it.kind, count: it.kind === 'cherry' ? 3 : 1 });
          g.swayV += dx * 0.012;
          sfx('catch', { pitch: Math.min(12, g.stack.length) });
          g.score = Math.max(g.score, height());
        }
      } else if (it.y > GROUND - 10) {
        it.dead = true;
        if (it.kind === 'scoop' || it.kind === 'cherry') {
          g.splats.push({ x: it.x, color: it.color, life: 3 });
          sfx('plop');
        }
      }
    }
    g.items = g.items.filter((it) => !it.dead);
    for (const b of g.bits) {
      b.vy += 900 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt;
    }
    g.bits = g.bits.filter((b) => b.y < H + 60);
    for (const s of g.splats) s.life -= dt;
    g.splats = g.splats.filter((s) => s.life > 0);
    g.flash = Math.max(0, g.flash - dt);
  };

  g.hud = () => `Stack ${height()} · Best ${g.score}`;
  g.summary = () => [g.topples ? `Your stack toppled ${g.topples} time${g.topples > 1 ? 's' : ''}.` : 'Not a single topple!'];

  // The painted scoops and things (sprites.scoops), or drawn in code.
  const CELL = { cherry: 7, pickle: 8, sock: 9 };
  function drawItem(c, kind, color, x, y, a, r = R) {
    const cell = kind === 'scoop' ? FLAVOURS.indexOf(color) : CELL[kind];
    const spin = kind === 'scoop' ? a * 0.2 : a;
    if (cell >= 0 && drawSprite(c, 'sprites.scoops', cell, x, y, { w: r * (kind === 'scoop' ? 2.5 : 2.2), anchor: 'center', rot: spin })) return;
    c.save();
    c.translate(x, y);
    c.rotate(a * 0.2);
    if (kind === 'pickle') {
      c.rotate(a);
      blob(c, 0, 0, r * 1.2, r * 0.55, 3, 0.1);
      wash(c, '#7a9a3a');
      ink(c);
      c.fillStyle = 'rgba(40,60,20,0.6)';
      for (let i = -2; i <= 2; i++) c.fillRect(i * 9, -4, 3, 3);
    } else if (kind === 'sock') {
      c.rotate(a);
      poly(c, [[-12, -34], [12, -34], [12, 10], [30, 18], [28, 34], [-10, 32], [-12, 0]], 4);
      wash(c, '#d0d4e8');
      ink(c);
      poly(c, [[-12, -34], [12, -34], [12, -24], [-12, -24]], 5);
      wash(c, '#c04a4a');
      ink(c, 1.5);
    } else if (kind === 'cherry') {
      c.beginPath();
      c.moveTo(0, -r * 0.6);
      c.quadraticCurveTo(6, -r * 1.4, 16, -r * 1.6);
      ink(c, 2.5, '#5a7a2a');
      blob(c, 0, 0, r * 0.75, r * 0.7, 6, 0.04);
      wash(c, '#d8303a');
      ink(c);
      c.fillStyle = 'rgba(255,240,180,0.9)';
      c.beginPath();
      c.arc(-6, -6, 5, 0, Math.PI * 2);
      c.fill();
    } else {
      scoopPath(c, 0, 0, r, 2);
      wash(c, color);
      ink(c);
    }
    c.restore();
  }

  g.draw = (c, t) => {
    scene(c, 'coot', W, H, (c) => {
      band(c, 0, 0, W, 520, PAL.sky, 0.5, 1);
      band(c, 0, 470, W, 120, PAL.slate, 0.35, 2);
      band(c, 0, 800, W, 100, PAL.wafer, 0.55, 3);
      c.save();
      c.globalAlpha = 0.35;
      for (let x = 0; x < W; x += 70) {
        c.beginPath();
        c.moveTo(x, 800);
        c.lineTo(x - 20, 900);
        ink(c, 1.5);
      }
      c.restore();
      // the ice-cream cart at the right
      poly(c, [[1420, 640], [1590, 640], [1590, 800], [1420, 800]], 1);
      wash(c, '#f2eee4');
      ink(c);
      for (let i = 0; i < 5; i++) {
        poly(c, [[1405 + i * 38, 590], [1443 + i * 38, 590], [1443 + i * 38, 630], [1405 + i * 38, 630]], 2 + i, 0.8);
        wash(c, i % 2 ? '#f2eee4' : PAL.strawberry);
        ink(c, 1.5);
      }
    });

    // splats on the boardwalk
    for (const s of g.splats) {
      c.save();
      c.globalAlpha = Math.min(1, s.life);
      blob(c, s.x, GROUND - 4, 34, 9, s.x, 0.15);
      wash(c, s.color);
      ink(c, 1.4);
      c.restore();
    }

    // the best-so-far marker
    if (g.score > 2) {
      const y = GROUND + HEAD_DY - g.score * STEP;
      if (y > 40) {
        c.save();
        c.setLineDash([10, 10]);
        c.globalAlpha = 0.4;
        c.beginPath();
        c.moveTo(60, y);
        c.lineTo(W - 60, y);
        ink(c, 2);
        c.restore();
        label(c, `best ${g.score}`, 70, y - 18, { size: 24, align: 'left', weight: 500 });
      }
    }

    // Running: step between the portrait and the mid-stride pose. Standing
    // under a falling scoop with nothing on its head: look up at it.
    g.walked = (g.walked || 0) + Math.abs(g.vx) * 0.016;
    const above = !g.stack.length && g.items.some((it) => Math.abs(it.x - (g.x + HEAD_DX)) < 120 && it.y < GROUND + HEAD_DY - 40 && it.y > 200);
    const frame = Math.abs(g.vx) > 60 ? (Math.floor(g.walked / 60) % 2 ? 'stride' : null) : above ? 'lookup' : null;
    drawBird(c, 'coot', { x: g.x, y: GROUND, size: BIRD_SIZE, t, pose: { frame } });

    // the stack
    let x = g.x + HEAD_DX;
    let y = GROUND + HEAD_DY;
    const lean = balance() / TOPPLE;
    g.stack.forEach((s, i) => {
      x += s.dx + Math.sin(g.sway) * STEP * 0.4 * (i + 1) / Math.max(1, g.stack.length);
      y -= STEP;
      drawItem(c, s.kind, s.color, x, y + R * 0.3, 0);
    });
    if (Math.abs(lean) > 0.7 && g.stack.length) {
      label(c, '!', x + Math.sign(lean) * 50, y - 20, { size: 54, color: '#c0403a', weight: 800 });
    }

    for (const it of g.items) {
      // a soft shadow where it will land
      c.save();
      c.globalAlpha = 0.12 + 0.2 * (it.y / GROUND);
      c.fillStyle = INK;
      c.beginPath();
      c.ellipse(it.x, GROUND - 2, 22, 6, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      drawItem(c, it.kind, it.color, it.x, it.y, it.a);
    }
    for (const b of g.bits) drawItem(c, b.kind, b.color, b.x, b.y, b.spin, b.r);
    if (g.flash > 0 && !env.reduceMotion) {
      c.fillStyle = `rgba(255,255,255,${g.flash})`;
      c.fillRect(0, 0, W, H);
    }
  };

  return g;
}

// Ice-Cream Cone Coot: Scoop Stack.
//
// Scoops fall from the sky; move the Coot to catch them on its head. Each
// scoop sits where it touched the one below, so an off-centre catch leans the
// stack, and the Coot's own running sways it. Lean too far and the whole stack
// topples. Pickles and socks knock scoops off; a golden cherry counts three.
// Score: the tallest stack built (counting cherries as three).
//
// A scoop that hits the side of the stack clings there for a moment, then
// slips down. How long it holds is physics, roughly: a stack leaning away from
// it holds it longer (that side faces up), one leaning towards it sheds it
// sooner; running into it presses it on, running away peels it off. A
// slipping scoop comes to rest on a scoop that juts out below it, or on
// another clinging scoop; one that ends up level with the top is pushed up
// onto the stack. Clinging scoops weigh on their side of the balance, so they
// can tip the stack, or steady it.

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
// The camera zooms out as the stack grows, about the middle of the boardwalk,
// so there is always this much sky (in world px) above the top scoop, and new
// scoops start just above the top of the view: the same warning however tall
// the stack. The painted scene stays put; the Coot and its scoops shrink.
const HEADROOM = 400;
const MIN_ZOOM = 0.38;

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
    clingers: [], // scoops clinging to the side: { lvl, side, grip, sliding, v, color, kind, count }
    sway: 0,
    swayV: 0,
    items: [], // falling: { x, y, vy, kind, color, spin }
    bits: [], // flying debris after a topple or a knock
    splats: [],
    spawn: 0.6,
    elapsed: 0,
    zoom: 1,
    flash: 0,
    topples: 0,
  };

  const height = () => g.stack.reduce((n, s) => n + s.count, 0);

  // The column: the Coot's head (0) and each scoop (1..n), as circles, with
  // the sway bending the stack.
  function column() {
    let x = g.x + HEAD_DX;
    let y = GROUND + HEAD_DY;
    const n = g.stack.length;
    const out = [{ x: x - R * 0.2, y: y + R * 1.1, r: R * 1.35 }];
    for (let i = 0; i < n; i++) {
      x += g.stack[i].dx + Math.sin(g.sway) * STEP * 0.4 * (i + 1) / Math.max(1, n);
      y -= STEP;
      out.push({ x, y: y + R * 0.3, r: R });
    }
    return out;
  }

  function topPos() {
    const col = column();
    const t = col[col.length - 1];
    return col.length > 1 ? { x: t.x, y: t.y - R * 0.3 } : { x: g.x + HEAD_DX, y: GROUND + HEAD_DY };
  }

  // Where a clinging scoop is: beside the column at level `lvl` (fractional:
  // between two scoops), on `side` (-1 left, 1 right).
  function clingPos(c, col = column()) {
    const top = col.length - 1;
    const l = clamp(c.lvl, 0, top);
    const i = Math.min(Math.floor(l), Math.max(0, top - 1));
    const f = top ? l - i : 0;
    const a = col[i];
    const b = col[Math.min(i + 1, top)];
    const r = a.r + (b.r - a.r) * f;
    return { x: a.x + (b.x - a.x) * f + c.side * (r + R * 1.1), y: a.y + (b.y - a.y) * f };
  }

  // Where the stack's weight sits, relative to the head: the mean of each
  // scoop's offset (clinging scoops count for a little less), plus the sway.
  function balance() {
    if (!g.stack.length) return 0;
    let off = 0;
    let sum = 0;
    g.stack.forEach((s) => {
      off += s.dx;
      sum += off;
    });
    let w = g.stack.length;
    const baseX = g.x + HEAD_DX;
    const col = column();
    for (const c of g.clingers) {
      sum += (clingPos(c, col).x - baseX) * 0.6;
      w += 0.6;
    }
    return sum / w + Math.sin(g.sway) * g.stack.length * 5;
  }

  function topple() {
    const col = column();
    const dir = Math.sign(balance() || 1);
    g.stack.forEach((s, i) => {
      const p = col[i + 1];
      g.bits.push({ x: p.x, y: p.y, vx: dir * (120 + rng() * 200), vy: -200 - rng() * 200, color: s.color, kind: s.kind, r: R, spin: rng() * 6 });
    });
    for (const c of g.clingers) shed(c, col, dir * (100 + rng() * 150));
    g.stack = [];
    g.clingers = [];
    g.sway = 0;
    g.swayV = 0;
    g.topples++;
    sfx('topple');
    env.vibrate?.(120);
  }

  // A clinging scoop lets go and falls.
  function shed(c, col, vx = c.side * 140) {
    const p = clingPos(c, col);
    g.bits.push({ x: p.x, y: p.y, vx, vy: -60, color: c.color, kind: c.kind, r: R, spin: c.side * 3, fall: true });
  }

  function addTop(it, dx) {
    g.stack.push({ dx: clamp(dx, -R * 1.2, R * 1.2), color: it.color, kind: it.kind, count: it.count });
    g.swayV += dx * 0.012;
    sfx('catch', { pitch: Math.min(12, g.stack.length) });
    g.score = Math.max(g.score, height());
  }

  const GRIP = 1.1; // seconds a clinging scoop holds on, all else even

  // A scoop arrives at the column (`part` is what it touched: 0 the head,
  // 1..n a scoop, or a clinging scoop): onto the top, or clinging to a side.
  function arrive(it, part, clinger) {
    const col = column();
    const n = col.length - 1;
    const top = col[n];
    const dx = it.x - top.x;
    const scoop = { color: it.kind === 'cherry' ? '#d8303a' : it.color, kind: it.kind, count: it.kind === 'cherry' ? 3 : 1 };
    // From above the top, or onto a bare head: it sits on top.
    if (!clinger && (n === 0 || (part === n && it.y <= top.y + R * 0.15))) {
      addTop(scoop, dx);
      return;
    }
    if (clinger) {
      // Cupped by a clinging scoop: it props that one up, and one high enough
      // is pushed up onto the top of the stack.
      clinger.grip = Math.max(clinger.grip, 0) + 0.7;
      clinger.sliding = false;
      clinger.v = 0;
      const lvl = clinger.lvl + 1;
      if (lvl >= n - 0.25) addTop(scoop, clinger.side * R * 1.15);
      else {
        g.clingers.push({ ...scoop, lvl, side: clinger.side, grip: GRIP, sliding: false, v: 0, t: 0 });
        sfx('catch', { pitch: -3 });
      }
      return;
    }
    const p = col[part];
    const side = Math.sign(it.x - p.x) || (rng() < 0.5 ? -1 : 1);
    g.clingers.push({ ...scoop, lvl: part, side, grip: GRIP, sliding: false, v: 0, t: 0 });
    g.swayV += side * 0.15;
    sfx('catch', { pitch: -5 });
  }

  // Clinging scoops: hold, slip, catch on a ledge, or fall.
  function cling(dt, ax) {
    if (!g.clingers.length) return;
    const col = column();
    const n = col.length - 1;
    const lean = balance() / TOPPLE; // + leaning right
    for (const c of g.clingers) {
      c.t += dt;
      // Pushed up level with the top (the stack was knocked shorter under
      // it): it rolls on.
      if (c.lvl >= n - 0.25 && n > 0) {
        c.promote = true;
        continue;
      }
      // What it rests on: a scoop below that juts out on its side, or another
      // clinging scoop just below.
      const k = Math.floor(c.lvl);
      const ledge = k >= 1 && k < n && (col[k].x - col[k + 1].x) * c.side > R * 0.3;
      const below = g.clingers.find((o) => o !== c && o.side === c.side && !o.sliding && c.lvl - o.lvl > 0.6 && c.lvl - o.lvl < 1.15);
      const held = ledge || below;
      if (!c.sliding) {
        // How fast its grip goes: the lean (away from it holds it on), the
        // Coot's running (speeding or running towards its side presses it on,
        // the other way peels it off), the stack's wobble.
        const press = clamp(((ax / 5000 + g.vx / 1100) * c.side), -1, 1);
        let rate = 1 + 1.1 * lean * c.side - 1.2 * press + 0.25 * Math.abs(g.swayV);
        rate = Math.max(0.12, rate) * (held ? 0.35 : 1);
        c.grip -= rate * dt;
        if (c.grip <= 0) c.sliding = true;
      } else {
        c.v = Math.min(320, c.v + 520 * dt);
        c.lvl -= (c.v * dt) / STEP;
        const k2 = Math.floor(c.lvl);
        const ledge2 = k2 >= 1 && k2 < n && (col[k2].x - col[k2 + 1].x) * c.side > R * 0.3;
        const on = g.clingers.find((o) => o !== c && o.side === c.side && !o.sliding && c.lvl - o.lvl > 0.5 && c.lvl - o.lvl < 1);
        if (ledge2 && c.lvl <= k2 + 0.65) {
          c.lvl = k2 + 0.65;
          c.sliding = false;
          c.v = 0;
          c.grip = 0.9;
          sfx('plop');
        } else if (on) {
          c.lvl = on.lvl + 1;
          c.sliding = false;
          c.v = 0;
          c.grip = 0.7;
          on.grip += 0.3;
          sfx('plop');
        } else if (c.lvl < -0.55) {
          c.gone = true;
          shed(c, col);
        }
      }
    }
    for (const c of g.clingers.filter((c) => c.promote)) {
      c.gone = true;
      addTop(c, c.side * R * 1.15);
    }
    g.clingers = g.clingers.filter((c) => !c.gone);
  }

  // The highest point of the stack (or of a clinging scoop), in world y.
  function stackTop() {
    let y = topPos().y - R;
    for (const c of g.clingers) y = Math.min(y, clingPos(c).y - R);
    return y;
  }
  function zoomFor() {
    return clamp(GROUND / (GROUND - stackTop() + HEADROOM), MIN_ZOOM, 1);
  }
  // The top of the view, and a pointer's x, in world units at this zoom.
  const viewTop = () => GROUND - GROUND / g.zoom;
  const toWorldX = (x) => W / 2 + (x - W / 2) / g.zoom;

  function spawnItem() {
    const t = g.elapsed / DURATION;
    const roll = rng();
    let kind = 'scoop';
    if (g.elapsed > 6 && roll < 0.08 + t * 0.1) kind = rng() < 0.5 ? 'pickle' : 'sock';
    else if (roll > 0.955) kind = 'cherry';
    g.items.push({
      x: 160 + rng() * (W - 320),
      y: viewTop() - 40,
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
    if (input.pointer.active) g.x = approach(g.x, toWorldX(input.pointer.x) - HEAD_DX, 10, dt);
    else g.x += input.x * 820 * dt;
    g.x = clamp(g.x, 140, W - 140);
    const vx = (g.x - prev) / Math.max(dt, 1e-4);
    const ax = (vx - g.vx) / Math.max(dt, 1e-4);
    g.vx = vx;

    // Sway: a damped spring the running pushes against.
    const n = g.stack.length;
    g.swayV += (-g.sway * 14 - g.swayV * 3.2 - clamp(ax, -6000, 6000) * 0.00009 * Math.min(n, 12)) * dt;
    g.sway += g.swayV * dt;
    cling(dt, ax);
    // Zoom out quickly as the stack climbs, back in slowly after a topple.
    const want = zoomFor();
    g.zoom = approach(g.zoom, want, want < g.zoom ? 3 : 0.7, dt);
    if (n && Math.abs(balance()) > TOPPLE) topple();

    // Spawn: faster as time goes on.
    g.spawn -= dt;
    if (g.spawn <= 0) {
      spawnItem();
      const t = g.elapsed / DURATION;
      g.spawn = 1.0 - t * 0.55 + rng() * 0.25;
    }

    for (const it of g.items) {
      it.y += it.vy * dt;
      it.a += it.spin * dt;
      if (it.dead) continue;
      // What it touches: a clinging scoop (from above), the stack or the head.
      const col = column();
      const onCling = g.clingers.find((c) => {
        const p = clingPos(c, col);
        return it.y < p.y && Math.hypot(it.x - p.x, it.y - p.y) < R * 1.9;
      });
      const part = onCling ? -1 : col.findIndex((p) => Math.hypot(it.x - p.x, it.y - p.y) < p.r + R * 0.4);
      if (onCling || part >= 0) {
        it.dead = true;
        if (it.kind === 'pickle' || it.kind === 'sock') {
          // A knock: off goes a clinging scoop on that side, or the top scoop.
          const top = topPos();
          const side = Math.sign(it.x - top.x) || 1;
          const victim = onCling || g.clingers.find((c) => c.side === side);
          if (victim) {
            victim.gone = true;
            shed(victim, col, side * 260);
            g.clingers = g.clingers.filter((c) => !c.gone);
          } else if (g.stack.length) {
            const s = g.stack.pop();
            g.bits.push({ x: top.x, y: top.y, vx: -side * 260, vy: -260, color: s.color, kind: s.kind, r: R, spin: 4 });
          }
          g.bits.push({ x: it.x, y: it.y, vx: side * 220, vy: -320, color: it.color, kind: it.kind, r: R, spin: 6 });
          sfx('bonk');
          g.flash = 0.25;
          env.vibrate?.(60);
        } else arrive(it, part, onCling);
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

  // For tests: where things are.
  g.column = column;
  g.clingPos = (c) => clingPos(c);

  g.hud = () => `Stack ${height()}` + (g.clingers.length ? ` +${g.clingers.length} hanging on` : '') + ` · Best ${g.score}`;
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

    // Everything that moves is drawn zoomed about the middle of the boardwalk.
    c.save();
    c.translate(W / 2, GROUND);
    c.scale(g.zoom, g.zoom);
    c.translate(-W / 2, -GROUND);

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
      if (y > viewTop() + 40) {
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
    const col = column();
    const lean = balance() / TOPPLE;
    g.stack.forEach((s, i) => drawItem(c, s.kind, s.color, col[i + 1].x, col[i + 1].y, 0));
    // clinging scoops: tilted against the side, trembling as they lose their
    // grip, a drip above one that is sliding
    for (const k of g.clingers) {
      const p = clingPos(k, col);
      const shake = !k.sliding && k.grip < 0.35 && !env.reduceMotion ? Math.sin(t * 50 + k.lvl) * 2.5 : 0;
      if (k.sliding) {
        c.save();
        c.globalAlpha = 0.6;
        blob(c, p.x - k.side * 8, p.y - R * 0.9, 7, 14, k.lvl, 0.1);
        wash(c, k.color);
        c.restore();
      }
      drawItem(c, k.kind, k.color, p.x + shake, p.y, k.side * -1.2);
    }
    if (Math.abs(lean) > 0.7 && g.stack.length) {
      const t0 = col[col.length - 1];
      label(c, '!', t0.x + Math.sign(lean) * 50, t0.y - R * 1.6, { size: 54, color: '#c0403a', weight: 800 });
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
    c.restore();
    if (g.flash > 0 && !env.reduceMotion) {
      c.fillStyle = `rgba(255,255,255,${g.flash})`;
      c.fillRect(0, 0, W, H);
    }
  };

  return g;
}

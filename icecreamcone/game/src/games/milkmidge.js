// Milkbottle Midge: Milk Round.
//
// Dawn, and the Midge rides the back of the milk float down a street of
// houses, each set back behind its own front garden. Hold the action to wind
// up a throw and let go to lob a bottle up the garden path: the longer the
// hold, the further back it flies, and a dotted ring on the ground shows
// where it will land. Past the farthest doorstep the wind-up swings back
// down again, so holding on is no help. A bottle that lands on a doorstep is
// a pint delivered; one that misses smashes (−1), and one that smashes near a
// sleeping dog wakes it too (−2 more). A house with a "No milk today" card on
// its door wants none: a bottle on that step comes back (−1). The float
// speeds up, the steps narrow and spread from near to far, and the dogs and
// cards come more often as the round goes on. Score: pints delivered.

import { drawBird, drawSprite, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, lerp } from './index.js';

Object.assign(SHEETS, {
  'sprites.milkHouses': [3, 2], // six house fronts, each with its door and doorstep at the bottom centre
  'sprites.milkProps': [3, 2], // bottle, spilt milk and glass, sleeping dog, barking dog, no-milk card, doormat
  'sprites.milkFloat': [1, 1], // the milk float, facing left
  'sprites.midgeThrow': [2, 1], // the Midge winding up, and flinging
});

const DURATION = 45;
const FLOAT_SX = 430; // where the float sits on screen; the street scrolls past
const ROAD_Y = 838; // the float's wheels
const HAND_Y = 600; // where the Midge lets go
const FENCE = 668; // the garden fences along the pavement
const NEAR = 690; // a bottle let go at once lands here, on the pavement
const FAR = 290; // the farthest a full wind-up throws
const STEP_MIN = 330; // the deepest doorstep
const STEP_MAX = 600; // the nearest doorstep
const HOUSE_COLS = ['#e8c9a0', '#d9a4a0', '#c9d0b0', '#e6d9a8', '#c4b4c8', '#d7b48a'];
const DOOR_COLS = [PAL.slate, PAL.brick, PAL.green, PAL.mustard, PAL.mauve, '#3f6a6a'];

// Depth: a doorstep further back is smaller.
const depth = (y) => lerp(0.62, 1, clamp((y - STEP_MIN) / (STEP_MAX - STEP_MIN), 0, 1));

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    fx: 0, // the float's place along the street
    speed: 150,
    holding: false,
    charge: 0, // 0..1, where the wind-up has got to
    dir: 1, // the wind-up going out (1) or swinging back (-1)
    fling: 0, // the throwing arm's follow-through
    houses: [],
    bottles: [], // in flight
    bits: [], // glass and milk
    puddles: [],
    pops: [],
    pints: 0,
    smashes: 0,
    woken: 0,
    refused: 0,
    passed: 0, // houses that wanted milk and got none
    nextX: 620,
    houseN: 0,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  // How long a full wind-up takes, out to the farthest step.
  g.windTime = () => lerp(1.25, 0.95, progress());
  // Where a bottle let go at this charge lands, on screen.
  g.landY = (c = g.charge) => lerp(NEAR, FAR, c);
  // And the charge that lands on a step.
  g.chargeFor = (y) => (NEAR - y) / (NEAR - FAR);
  g.flightTime = (c) => 0.5 + 0.3 * c;
  g.sx = (x) => x - g.fx + FLOAT_SX; // street to screen
  // How far up or down the path a bottle may land and still be on the step.
  g.tol = () => lerp(30, 20, progress());

  function pop(text, x, y, color = INK, size = 40) {
    g.pops.push({ text, x, y, color, size, life: 1.2 });
  }
  const add = (n) => {
    g.score = Math.max(0, g.score + n);
  };

  // The next house along the street.
  function addHouse() {
    const p = progress();
    const n = g.houseN++;
    const early = n < 4; // the first few: near, wide, no dogs, no cards
    const lo = early ? 470 : lerp(420, STEP_MIN, p);
    const hi = early ? 580 : STEP_MAX;
    const stepY = lo + rng() * (hi - lo);
    const s = depth(stepY);
    const note = !early && n > 0 && rng() < lerp(0.12, 0.24, p);
    const dog = !early && rng() < lerp(0.3, 0.5, p);
    const h = {
      x: g.nextX,
      stepY,
      s,
      half: (early ? 76 : lerp(68, 52, p)) * s,
      note,
      wants: note ? 0 : 1,
      got: 0,
      dog: dog ? { side: rng() < 0.5 ? -1 : 1, awake: 0, woke: false } : null,
      col: Math.floor(rng() * HOUSE_COLS.length),
      door: Math.floor(rng() * DOOR_COLS.length),
      cell: Math.floor(rng() * 6),
      counted: false,
    };
    if (h.dog) h.dog.x = h.x + h.dog.side * (h.half + 70 * s);
    if (h.dog) h.dog.y = lerp(stepY, FENCE, 0.55);
    g.houses.push(h);
    g.nextX += (early ? 400 : lerp(360, 250, p)) * (0.85 + rng() * 0.3);
  }
  while (g.nextX < g.fx + W + 400) addHouse();

  function throwBottle() {
    const c = g.charge;
    g.bottles.push({ x: g.fx, c, y0: HAND_Y, y1: g.landY(c), t: 0, dur: g.flightTime(c), spin: (rng() - 0.5) * 2 });
    g.fling = 0.35;
    g.charge = 0;
    g.dir = 1;
    sfx('move');
  }

  // A bottle comes down at (x, y) on the street.
  function land(b) {
    const y = b.y1;
    const h = g.houses.find((h) => Math.abs(b.x - h.x) <= h.half && Math.abs(y - h.stepY) <= g.tol());
    if (h && h.note) {
      g.refused++;
      add(-1);
      h.back = 1; // the bottle is set back out on the pavement
      pop('No milk today!  −1', g.sx(h.x), h.stepY - 130 * h.s, PAL.brick, 38);
      sfx('wrong');
      return;
    }
    if (h && h.got < h.wants) {
      h.got++;
      g.pints++;
      add(1);
      const perfect = Math.abs(b.x - h.x) < h.half * 0.4 && Math.abs(y - h.stepY) < g.tol() * 0.45;
      pop(perfect ? 'Perfect!' : 'Clink!', g.sx(h.x), h.stepY - 150 * h.s, perfect ? PAL.magenta : PAL.slate, perfect ? 50 : 42);
      sfx('catch', { pitch: perfect ? 7 : 0 });
      if (perfect) sfx('ding', { pitch: 0 });
      env.vibrate?.(20);
      return;
    }
    // Missed: smash.
    g.smashes++;
    let cost = 1;
    const sx = g.sx(b.x);
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * (0.1 + 0.8 * rng());
      const v = 120 + rng() * 200;
      g.bits.push({ x: b.x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + rng() * 0.3, glass: i % 3 === 0 });
    }
    g.puddles.push({ x: b.x, y, r: 24 * depth(y), life: 6 });
    sfx('splash');
    // Any dog asleep near it wakes up.
    for (const o of g.houses) {
      const d = o.dog;
      if (!d || d.woke) continue;
      if (Math.abs(d.x - b.x) < 170 && Math.abs(d.y - y) < 130) {
        d.woke = true;
        d.awake = 2.2;
        g.woken++;
        cost += 2;
        pop('Woof! Woof!', g.sx(d.x), d.y - 90, PAL.brick, 46);
        sfx('squawk');
        env.vibrate?.(120);
      }
    }
    add(-cost);
    pop(cost > 1 ? `Smash!  −${cost}` : 'Smash!  −1', sx, y - 50, '#8a5a3a', 36);
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);

    g.speed = lerp(150, 235, progress());
    g.fx += g.speed * dt;
    while (g.nextX < g.fx + W + 400) addHouse();

    // Wind up while held; let go to throw.
    if (g.time > 0) {
      if (input.actionPressed) {
        g.holding = true;
        g.charge = 0;
        g.dir = 1;
      }
      if (g.holding && input.action) {
        g.charge += (g.dir * dt) / g.windTime();
        if (g.charge >= 1) {
          g.charge = 1;
          g.dir = -1;
        } else if (g.charge <= 0) {
          g.charge = 0;
          g.dir = 1;
        }
      }
      if (g.holding && !input.action) {
        g.holding = false;
        throwBottle();
      }
    } else g.holding = false;

    for (const b of g.bottles) {
      b.t += dt;
      if (b.t >= b.dur) {
        b.dead = true;
        land(b);
      }
    }
    g.bottles = g.bottles.filter((b) => !b.dead);

    for (const h of g.houses) {
      if (h.dog && h.dog.awake > 0) h.dog.awake -= dt;
      if (h.back) h.back = Math.max(0, h.back - dt);
      if (!h.counted && h.x + h.half < g.fx - 300) {
        h.counted = true;
        if (h.got < h.wants) g.passed++;
      }
    }
    g.houses = g.houses.filter((h) => g.sx(h.x) > -400);

    for (const b of g.bits) {
      b.vy += 900 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt * 0.4;
      b.life -= dt;
    }
    g.bits = g.bits.filter((b) => b.life > 0);
    for (const p of g.puddles) p.life -= dt;
    g.puddles = g.puddles.filter((p) => p.life > 0 && g.sx(p.x) > -100);
    g.fling = Math.max(0, g.fling - dt);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
      p.x -= g.speed * dt; // they stay with the house
    }
    g.pops = g.pops.filter((p) => p.life > 0);

    // The round ends once the last bottles have come down.
    if (g.time <= 0 && !g.bottles.length) g.done = true;
  };

  g.hud = () => `Pints ${g.score}`;
  g.summary = () => {
    const lines = [`${g.pints} pint${g.pints === 1 ? '' : 's'} on the doorsteps.`];
    const woes = [];
    if (g.smashes) woes.push(`${g.smashes} smashed`);
    if (g.woken) woes.push(`${g.woken} dog${g.woken === 1 ? '' : 's'} woken`);
    if (g.refused) woes.push(`${g.refused} sent back`);
    lines.push(woes.length ? `Along the way: ${woes.join(', ')}.` : 'Not a drop spilt, and every dog still asleep!');
    return lines;
  };

  // ---------- drawing ----------

  function drawStandinScene(c) {
    // dawn: a pale lemon sky warming to pink at the rooftops
    const sky = c.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, 'rgba(201,217,224,0.85)');
    sky.addColorStop(0.6, 'rgba(239,217,106,0.45)');
    sky.addColorStop(1, 'rgba(234,143,176,0.35)');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, 420);
    c.beginPath();
    c.arc(1260, 250, 70, 0, Math.PI * 2);
    c.fillStyle = 'rgba(240,190,90,0.55)';
    c.fill();
    // distant rooftops and chimneys
    c.beginPath();
    c.moveTo(0, 300);
    let x = 0;
    let k = 0;
    while (x < W) {
      const w = 110 + ((k * 37) % 60);
      const top = 230 + ((k * 53) % 50);
      c.lineTo(x, top + 30);
      c.lineTo(x + w / 2, top);
      c.lineTo(x + w, top + 30);
      if (k % 2) {
        c.lineTo(x + w * 0.7, top + 18);
        c.lineTo(x + w * 0.7, top - 10);
        c.lineTo(x + w * 0.8, top - 10);
        c.lineTo(x + w * 0.8, top + 22);
      }
      x += w;
      k++;
    }
    c.lineTo(W, 420);
    c.lineTo(0, 420);
    c.closePath();
    wash(c, '#b9a7b8', 0.5);
    ink(c, 1.2);
    // gardens and hedges behind the houses
    band(c, 0, 400, W, FENCE - 400, PAL.sage, 0.45, 3);
    // the pavement and the road
    band(c, 0, FENCE, W, 60, '#cfc6b4', 0.85, 5);
    poly(c, [[0, FENCE + 58], [W, FENCE + 60], [W, FENCE + 72], [0, FENCE + 70]], 6, 1);
    wash(c, '#a89f90');
    ink(c, 1.6);
    band(c, 0, FENCE + 72, W, H - FENCE - 72, '#8f8a86', 0.55, 7);
    c.save();
    c.globalAlpha = 0.3;
    for (let i = 0; i < 9; i++) {
      poly(c, [[i * 190 + 40, 800], [i * 190 + 140, 800], [i * 190 + 140, 806], [i * 190 + 40, 806]], i, 1);
      c.fillStyle = PAPER_LINE;
      c.fill();
    }
    c.restore();
  }
  const PAPER_LINE = '#f4ecd8';

  function drawDog(c, d, t) {
    const x = g.sx(d.x);
    const y = d.y;
    const s = depth(y) * 0.9;
    const awake = d.awake > 0;
    if (drawSprite(c, 'sprites.milkProps', awake ? 3 : 2, x, y + 8 * s, { h: (awake ? 110 : 70) * s, flip: d.side > 0 })) {
      if (!awake && !d.woke) label(c, 'z', x + 40 * s, y - 60 * s - ((t * 20) % 30), { size: 28 * s, color: PAL.slate, weight: 700 });
      return;
    }
    c.save();
    c.translate(x, y);
    c.scale(s * (d.side > 0 ? -1 : 1), s);
    if (!awake) {
      // curled up asleep
      blob(c, 0, -22, 56, 26, 4, 0.05);
      wash(c, d.woke ? '#a07a5a' : '#c09a6a');
      ink(c, 2);
      blob(c, -40, -26, 20, 16, 5, 0.05);
      wash(c, '#a07a5a');
      ink(c, 2);
      c.beginPath();
      c.moveTo(-48, -28);
      c.lineTo(-38, -26);
      ink(c, 2);
      poly(c, [[-48, -40], [-58, -54], [-36, -42]], 6, 0.6);
      wash(c, '#7a5a3a');
      ink(c, 1.6);
      c.restore();
      if (!d.woke) {
        const k = (t * 0.8) % 1;
        c.save();
        c.globalAlpha = 1 - k;
        label(c, 'z', x - 10 * s + k * 30, y - 60 * s - k * 40, { size: 30 * s, color: PAL.slate, weight: 700 });
        c.restore();
      }
      return;
    }
    // standing, barking
    const bob = Math.sin(t * 25) * 3;
    blob(c, 0, -46 + bob, 48, 24, 7, 0.05);
    wash(c, '#c09a6a');
    ink(c, 2);
    for (const lx of [-30, -14, 18, 32]) {
      c.beginPath();
      c.moveTo(lx, -30 + bob);
      c.lineTo(lx, 0);
      ink(c, 5, '#a07a5a');
    }
    blob(c, -52, -74 + bob, 22, 18, 8, 0.05);
    wash(c, '#c09a6a');
    ink(c, 2);
    poly(c, [[-62, -90 + bob], [-70, -112 + bob], [-50, -94 + bob]], 9, 0.6);
    wash(c, '#7a5a3a');
    ink(c, 1.6);
    c.beginPath();
    c.moveTo(-74, -70 + bob);
    c.lineTo(-90, -66 + bob);
    c.lineTo(-74, -62 + bob);
    ink(c, 2);
    c.restore();
  }

  function drawBottle(c, x, y, s, rot = 0) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(s, s);
    if (!drawSprite(c, 'sprites.milkProps', 0, 0, 0, { h: 56, anchor: 'center' })) {
      poly(c, [[-11, 26], [11, 26], [12, 0], [6, -12], [6, -24], [-6, -24], [-6, -12], [-12, 0]], 1, 0.4);
      wash(c, '#fbf8ee');
      ink(c, 1.8);
      c.fillStyle = '#b8bcc0';
      c.fillRect(-7, -30, 14, 7);
      c.beginPath();
      c.rect(-7, -30, 14, 7);
      ink(c, 1.2);
    }
    c.restore();
  }

  function drawHouse(c, h, t) {
    const x = g.sx(h.x);
    const s = h.s;
    const wHouse = 250 * s;
    const hHouse = 300 * s;
    // the front garden and its path, down to the fence
    poly(c, [[x - wHouse / 2 - 20 * s, h.stepY], [x + wHouse / 2 + 20 * s, h.stepY], [x + wHouse / 2 + 30, FENCE], [x - wHouse / 2 - 30, FENCE]], h.x, 1);
    wash(c, PAL.green, 0.35);
    poly(c, [[x - 20 * s, h.stepY], [x + 20 * s, h.stepY], [x + 34, FENCE], [x - 34, FENCE]], h.x + 1, 1);
    wash(c, '#d9cfb0', 0.7);
    // stepping stones up the path
    const n = Math.max(2, Math.round((FENCE - h.stepY) / 46));
    for (let i = 1; i < n; i++) {
      const y = lerp(FENCE, h.stepY, i / n);
      blob(c, x, y, lerp(26, 16 * s, i / n), lerp(8, 5 * s, i / n), h.x + i, 0.12);
      wash(c, '#c8bfae', 0.9);
      ink(c, 1);
    }
    // the house front
    if (!drawSprite(c, 'sprites.milkHouses', h.cell, x, h.stepY + 4 * s, { w: wHouse })) {
      const top = h.stepY - hHouse;
      poly(c, [[x - wHouse / 2, h.stepY], [x + wHouse / 2, h.stepY], [x + wHouse / 2, top + 70 * s], [x - wHouse / 2, top + 70 * s]], h.x + 2, 1);
      wash(c, HOUSE_COLS[h.col]);
      ink(c, 2);
      poly(c, [[x - wHouse / 2 - 14 * s, top + 72 * s], [x, top], [x + wHouse / 2 + 14 * s, top + 72 * s]], h.x + 3, 1);
      wash(c, '#8a6a5a');
      ink(c, 2);
      poly(c, [[x - wHouse / 2 - 14 * s, top + 72 * s], [x, top], [x + wHouse / 2 + 14 * s, top + 72 * s]], h.x + 3, 1);
      hatch(c, x - wHouse / 2 - 20, top, x + wHouse / 2 + 20, top + 80 * s, 8, 0.25, 1);
      for (const wx of [-1, 1]) {
        poly(c, [[x + wx * 78 * s - 26 * s, top + 110 * s], [x + wx * 78 * s + 26 * s, top + 110 * s], [x + wx * 78 * s + 26 * s, top + 170 * s], [x + wx * 78 * s - 26 * s, top + 170 * s]], h.x + 4 + wx, 1);
        wash(c, '#e9e2b0', 0.9);
        ink(c, 1.6);
      }
      // the door
      poly(c, [[x - 28 * s, h.stepY - 8 * s], [x + 28 * s, h.stepY - 8 * s], [x + 28 * s, h.stepY - 118 * s], [x - 28 * s, h.stepY - 118 * s]], h.x + 7, 1);
      wash(c, DOOR_COLS[h.door]);
      ink(c, 2);
      // the doorstep
      poly(c, [[x - h.half, h.stepY + 6 * s], [x + h.half, h.stepY + 6 * s], [x + h.half, h.stepY - 10 * s], [x - h.half, h.stepY - 10 * s]], h.x + 8, 1);
      wash(c, '#d8d2c4');
      ink(c, 1.8);
    }
    if (h.got < h.wants && !h.note) {
      // a doormat on the step of each house waiting for its pint
      if (!drawSprite(c, 'sprites.milkProps', 5, x, h.stepY - 2 * s, { w: h.half * 1.4, anchor: 'center' })) {
        blob(c, x, h.stepY - 2 * s, h.half * 0.7, 7 * s, h.x + 12, 0.05);
        wash(c, PAL.lemon, 0.85);
        ink(c, 1.4);
      }
    }
    if (h.note) {
      // "No milk today" card on the door
      const cy = h.stepY - 80 * s;
      if (!drawSprite(c, 'sprites.milkProps', 4, x, cy + 30 * s, { h: 70 * s })) {
        poly(c, [[x - 40 * s, cy - 24 * s], [x + 40 * s, cy - 24 * s], [x + 40 * s, cy + 24 * s], [x - 40 * s, cy + 24 * s]], h.x + 9, 0.6);
        wash(c, '#fbf8ee');
        ink(c, 1.6);
        label(c, 'NO', x, cy - 9 * s, { size: 18 * s, color: PAL.brick, weight: 800 });
        label(c, 'MILK', x, cy + 11 * s, { size: 16 * s, color: PAL.brick, weight: 800 });
      }
    }
    // pints delivered
    for (let i = 0; i < h.got; i++) drawBottle(c, x + (i - (h.got - 1) / 2) * 24 * s, h.stepY - 14 * s, s * 0.9);
    if (h.dog) drawDog(c, h.dog, t);
  }

  function drawFloat(c, t) {
    const x = FLOAT_SX;
    const jolt = Math.sin(t * 9) * 1.5;
    if (!drawSprite(c, 'sprites.milkFloat', 0, x + 70, ROAD_Y + 14, { w: 520, flip: true })) {
      // the flatbed, its crates and the cab in front
      for (const wx of [x - 130, x + 230]) {
        c.beginPath();
        c.arc(wx, ROAD_Y - 10, 34, 0, Math.PI * 2);
        c.fillStyle = '#3a3430';
        c.fill();
        ink(c, 2);
        c.beginPath();
        c.arc(wx, ROAD_Y - 10, 12, 0, Math.PI * 2);
        c.fillStyle = '#b8bcc0';
        c.fill();
      }
      poly(c, [[x - 190, ROAD_Y - 40 + jolt], [x + 290, ROAD_Y - 40 + jolt], [x + 290, ROAD_Y - 70 + jolt], [x - 190, ROAD_Y - 70 + jolt]], 2, 1);
      wash(c, '#e8e2d0');
      ink(c, 2.2);
      poly(c, [[x + 170, ROAD_Y - 70 + jolt], [x + 300, ROAD_Y - 70 + jolt], [x + 290, ROAD_Y - 210 + jolt], [x + 190, ROAD_Y - 210 + jolt]], 3, 1);
      wash(c, PAL.sage);
      ink(c, 2.2);
      poly(c, [[x + 210, ROAD_Y - 120 + jolt], [x + 280, ROAD_Y - 120 + jolt], [x + 274, ROAD_Y - 190 + jolt], [x + 216, ROAD_Y - 190 + jolt]], 4, 1);
      wash(c, '#dfe8ec');
      ink(c, 1.6);
      poly(c, [[x + 160, ROAD_Y - 210 + jolt], [x + 310, ROAD_Y - 210 + jolt], [x + 305, ROAD_Y - 226 + jolt], [x + 165, ROAD_Y - 226 + jolt]], 5, 1);
      wash(c, PAL.sage);
      ink(c, 2);
      // crates of bottles
      for (const cx of [x - 170, x - 70, x + 30]) {
        poly(c, [[cx, ROAD_Y - 70 + jolt], [cx + 90, ROAD_Y - 70 + jolt], [cx + 90, ROAD_Y - 120 + jolt], [cx, ROAD_Y - 120 + jolt]], cx, 1);
        wash(c, '#c9925a');
        ink(c, 1.8);
        for (let i = 0; i < 4; i++) drawBottle(c, cx + 14 + i * 21, ROAD_Y - 132 + jolt, 0.62);
      }
    }
    // the Midge stands on the crates at the back, winding up to throw
    const lean = g.holding ? -0.12 - g.charge * 0.2 : g.fling > 0 ? 0.25 * (g.fling / 0.35) : 0;
    const squash = g.holding ? g.charge * 0.08 : 0;
    const cell = g.holding ? 0 : g.fling > 0 ? 1 : -1;
    c.save();
    c.translate(x - 120, ROAD_Y - 118 + jolt);
    c.rotate(lean);
    if (cell < 0 || !drawSprite(c, 'sprites.midgeThrow', cell, 0, 0, { h: 270, flip: true })) {
      c.scale(1 + squash * 0.5, 1 - squash);
      drawBird(c, 'milkmidge', { x: 0, y: 0, size: 270, t, flip: true });
    }
    c.restore();
    // the bottle in its claw while winding up
    if (g.holding) drawBottle(c, x - 40 - g.charge * 40, HAND_Y + 40 + g.charge * 20 + jolt, 0.9, -0.4 - g.charge);
  }

  g.draw = (c, t) => {
    scene(c, 'milkmidge', W, H, drawStandinScene);

    // the street scrolls: puddles, houses (back to front), fences
    for (const p of g.puddles) {
      c.save();
      c.globalAlpha = Math.min(1, p.life) * 0.8;
      if (!drawSprite(c, 'sprites.milkProps', 1, g.sx(p.x), p.y, { w: p.r * 3.6, anchor: 'center' })) {
        blob(c, g.sx(p.x), p.y, p.r * 1.6, p.r * 0.5, p.x, 0.15);
        c.fillStyle = '#fbf8ee';
        c.fill();
        ink(c, 1, '#c8c0b0');
      }
      c.restore();
    }
    const order = [...g.houses].sort((a, b) => a.stepY - b.stepY);
    for (const h of order) drawHouse(c, h, t);
    // garden fences along the pavement, with a gate gap at each path
    c.beginPath();
    const off = -(g.fx % 40);
    for (let x = off; x < W + 40; x += 40) {
      const gate = g.houses.some((h) => Math.abs(g.sx(h.x) - x) < 50);
      if (gate) continue;
      c.moveTo(x, FENCE + 4);
      c.lineTo(x, FENCE - 34);
    }
    c.moveTo(0, FENCE - 24);
    c.lineTo(W, FENCE - 24);
    ink(c, 2.2, '#7a5a3a');
    // bottles sent back, on the pavement
    for (const h of g.houses) if (h.note && h.back) drawBottle(c, g.sx(h.x) + 50, FENCE + 26, 0.9);

    // the landing ring while winding up
    if (g.holding) {
      const y = g.landY();
      const s = depth(y);
      c.save();
      c.setLineDash([8, 8]);
      c.beginPath();
      c.ellipse(FLOAT_SX, y, 44 * s, 14 * s, 0, 0, Math.PI * 2);
      c.fillStyle = 'rgba(239,217,106,0.45)';
      c.fill();
      ink(c, 3.5, PAL.brick);
      c.restore();
      c.save();
      c.globalAlpha = 0.25;
      c.setLineDash([4, 10]);
      c.beginPath();
      c.moveTo(FLOAT_SX, HAND_Y);
      c.lineTo(FLOAT_SX, y);
      ink(c, 2, PAL.slate);
      c.restore();
    }

    drawFloat(c, t);

    // bottles in flight: an arc up the garden, shrinking with distance
    for (const b of g.bottles) {
      const p = b.t / b.dur;
      const x = g.sx(b.x);
      const y = lerp(b.y0, b.y1, p) - (110 + 150 * b.c) * 4 * p * (1 - p);
      const s = lerp(1, depth(b.y1), p);
      // its shadow on the ground
      c.save();
      c.globalAlpha = 0.18;
      c.beginPath();
      c.ellipse(x, lerp(b.y0 + 60, b.y1, p), 16 * s, 5 * s, 0, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
      c.restore();
      drawBottle(c, x, y, s, b.spin * p * 6);
    }

    for (const b of g.bits) {
      c.save();
      c.globalAlpha = clamp(b.life * 2, 0, 1);
      c.beginPath();
      if (b.glass) {
        c.moveTo(g.sx(b.x) - 4, b.y);
        c.lineTo(g.sx(b.x) + 4, b.y - 6);
        ink(c, 2, '#8a9aa0');
      } else {
        c.arc(g.sx(b.x), b.y, 4, 0, Math.PI * 2);
        c.fillStyle = '#fbf8ee';
        c.fill();
        ink(c, 1, '#b8b0a0');
      }
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

    if (g.elapsed < 4) {
      c.save();
      c.globalAlpha = Math.min(1, 4 - g.elapsed);
      label(c, 'Hold to wind up · let go to throw onto the doorstep', W / 2, 130, { size: 36, weight: 600 });
      c.restore();
    }
  };

  // On a narrow screen: keep the float and the houses coming up in view.
  g.focus = () => FLOAT_SX + 260;
  g.span = 900;

  return g;
}

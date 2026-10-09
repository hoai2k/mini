// The Cutitup Snippit: Snip the String.
//
// A bunch of balloons and kites is tied to the fence along the bottom of the
// fair, and the wind has crossed their strings into a tangle. A tag under the
// clock shows the one to let go. Follow its string down with your eye, walk
// the Snippit to the knot where it is tied, and snip. The right string lets
// that balloon float away (10 points, 5 more if you were quick); a wrong one
// loses a balloon nobody asked for, costs 10 points and jams the blades for a
// moment. Every snipped balloon is replaced by a new one. More balloons join
// the bunch as time goes on, their strings curl more, and later they jostle
// in the wind and drift past each other while you look. Score: points.

import { drawBird, drawSprite, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.balloons': [6, 2], // round balloons in the six colours, then diamond kites in the same six
  'sprites.snippitSnip': [2, 1], // blades open, blades shut
  'sprites.snippitPoses': [3, 1], // mid-stride, jammed, looking up after a balloon it let go
});

const DURATION = 45;
const PEG_Y = 706; // where the strings are tied, on top of the rail
const RAIL_Y = 714;
const GROUND = 880; // the Snippit's feet
const SKY_Y = 300; // the middle of the bunch
const X0 = 330; // the outermost knots
const X1 = 1270;
const REACH = 72; // how far from a knot the blades still find it
const SIZE = 320;
const K = SIZE / 400;
// The stand-in's hinge (its eye) is at (-30, -220) from its feet: the snip point.
const HINGE_DX = -30 * K;
const HINGE_Y = GROUND - 220 * K;
const RIGHT = 10;
const QUICK = 5;
const QUICK_T = 3;
const WRONG = 10;
const JAM = 0.8;

export const COLORS = [
  { name: 'pink', c: PAL.strawberry, d: '#c0607a' },
  { name: 'yellow', c: PAL.lemon, d: '#b8a030' },
  { name: 'blue', c: PAL.slate, d: '#4f6a88' },
  { name: 'green', c: PAL.sage, d: '#6a8a50' },
  { name: 'purple', c: PAL.mauve, d: '#86587a' },
  { name: 'orange', c: PAL.orange, d: '#b0702a' },
];

// How many balloons are in the bunch, and how much their strings curl.
const countAt = (t) => (t < 10 ? 3 : t < 20 ? 4 : t < 31 ? 5 : 6);
const curlAt = (t) => 30 + Math.min(1, t / 35) * 150;
const slotX = (i, n) => (n <= 1 ? 800 : X0 + ((X1 - X0) * i) / (n - 1));

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    x: 800, // the snip point (the Snippit's hinge)
    vx: 0,
    face: 1,
    balloons: [], // tied: { color, kite, pegK, skyK, px, bx, by, w1, w2, ph, grow }
    loose: [], // floating away
    stubs: [], // cut ends falling from the knots
    want: null, // the balloon asked for
    wantT: 0,
    pending: 0, // replacements on their way
    pendT: 0,
    jam: 0,
    snipT: 0,
    happyT: 0, // watching a balloon it let go float off
    moving: false,
    swapT: 6,
    right: 0,
    wrong: 0,
    quick: 0,
    pops: [],
  };

  function pop(text, x, y, color = INK, size = 46) {
    g.pops.push({ text, x, y, color, size, life: 1.3 });
  }

  const curl = () => curlAt(g.elapsed);

  // A new balloon (or kite) in a colour nobody in the bunch has, tied to a
  // knot somewhere along the rail and floating somewhere in the bunch.
  function addBalloon(fresh = true) {
    const used = new Set(g.balloons.map((b) => b.color));
    const free = COLORS.map((_, i) => i).filter((i) => !used.has(i));
    if (!free.length) return null;
    const color = free[Math.floor(rng() * free.length)];
    const c = curl();
    const b = {
      color,
      kite: rng() < 0.4,
      pegK: rng(),
      skyK: rng(),
      px: 800,
      bx: 800,
      placed: false,
      by: SKY_Y + (rng() - 0.5) * 120,
      w1: (rng() - 0.5) * 2 * c,
      w2: (rng() - 0.5) * 2 * c,
      ph: rng() * 6.28,
      grow: fresh ? 0 : 1,
    };
    g.balloons.push(b);
    layout(0);
    if (fresh) {
      // come down into the bunch from above
      b.by0 = b.by;
      b.byNow = -120;
    }
    return b;
  }

  // Knot and bunch positions from each balloon's rank. A new balloon is put
  // straight in its place; the others slide over to make room.
  function layout(dt) {
    const n = g.balloons.length;
    [...g.balloons].sort((a, b) => a.pegK - b.pegK).forEach((b, i) => {
      const x = slotX(i, n);
      b.px = b.placed ? approach(b.px, x, 6, dt) : x;
    });
    [...g.balloons].sort((a, b) => a.skyK - b.skyK).forEach((b, i) => {
      const x = slotX(i, n) + (n > 3 ? (i % 2 ? 30 : -30) : 0);
      b.bx = b.placed ? approach(b.bx, x, 1.6, dt) : x;
      b.placed = true;
    });
  }

  function ask() {
    const last = g.want;
    const cands = g.balloons.filter((b) => b !== last && b.grow > 0.5);
    const from = cands.length ? cands : g.balloons;
    g.want = from[Math.floor(rng() * from.length)] || null;
    g.wantT = 0;
    if (g.want) sfx('tick');
  }

  // Start: three balloons whose strings are not simply straight down.
  for (let i = 0; i < 3; i++) addBalloon(false);
  for (const b of g.balloons) b.grow = 1;
  {
    const byPeg = [...g.balloons].sort((a, b) => a.pegK - b.pegK);
    const bySky = [...g.balloons].sort((a, b) => a.skyK - b.skyK);
    if (byPeg.every((b, i) => bySky[i] === b)) {
      const t = byPeg[0].skyK;
      byPeg[0].skyK = byPeg[2].skyK;
      byPeg[2].skyK = t;
    }
    for (const b of g.balloons) b.placed = false;
    layout(0);
  }
  ask();

  // The string of a tied balloon: a curve from its knot up to the balloon.
  g.top = (b) => ({ x: b.bx, y: (b.byNow ?? b.by) + Math.sin(g.elapsed * 1.3 + b.ph) * 8 });
  function stringPts(b, t = g.elapsed) {
    const top = g.top(b);
    const ty = top.y + (b.kite ? 62 : 70);
    const sway = Math.sin(t * 0.9 + b.ph) * 14;
    return [
      [b.px, PEG_Y],
      [b.px + b.w1 + sway * 0.5, PEG_Y - 170],
      [top.x + b.w2 - sway, ty + 150],
      [top.x, ty],
    ];
  }
  g.stringPts = stringPts;
  const bez = (p, u) => {
    const v = 1 - u;
    return [
      v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0],
      v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1],
    ];
  };

  // The tied balloon whose knot is under the blades, if any.
  g.under = (x = g.x) => {
    let best = null;
    for (const b of g.balloons) if (b.grow > 0.5 && Math.abs(b.px - x) < REACH && (!best || Math.abs(b.px - x) < Math.abs(best.px - x))) best = b;
    return best;
  };

  function snip(x) {
    g.snipT = 0.25;
    sfx('shutter');
    const b = g.under(x);
    if (!b) return;
    g.balloons = g.balloons.filter((o) => o !== b);
    const top = g.top(b);
    g.loose.push({ ...b, x: top.x, y: top.y, vx: (rng() - 0.5) * 60, vy: -60, life: 4 });
    g.stubs.push({ x: b.px, y: PEG_Y - 4, life: 0.8 });
    g.pending++;
    g.pendT = Math.max(g.pendT, 0.6);
    if (b === g.want) {
      g.right++;
      g.happyT = 0.7;
      let pts = RIGHT;
      if (g.wantT < QUICK_T) {
        pts += QUICK;
        g.quick++;
        pop('Quick! +' + pts, top.x, top.y - 90, PAL.magenta, 50);
      } else pop('+' + pts, top.x, top.y - 90, PAL.magenta, 50);
      g.score += pts;
      sfx('right');
      env.vibrate?.(25);
      g.want = null;
      ask();
    } else {
      g.wrong++;
      g.score = Math.max(0, g.score - WRONG);
      g.jam = JAM;
      pop('Wrong string!', b.px, PEG_Y - 120, PAL.brick, 44);
      sfx('wrong');
      env.vibrate?.(80);
    }
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }
    g.jam = Math.max(0, g.jam - dt);
    g.snipT = Math.max(0, g.snipT - dt);
    g.happyT = Math.max(0, g.happyT - dt);
    g.wantT += dt;

    // Walk along the fence: follow the pointer, or run with the stick.
    const was = g.x;
    if (input.pointer.active) g.x = approach(g.x, input.pointer.x, 12, dt);
    else {
      g.vx = approach(g.vx, input.x * 1000, 14, dt);
      g.x += g.vx * dt;
    }
    g.x = clamp(g.x, 240, W - 240);
    g.moving = Math.abs(g.x - was) > 40 * dt;
    if (Math.abs(g.x - was) > 0.5) g.face = g.x > was ? 1 : -1;

    if (input.actionPressed && g.jam <= 0) {
      if (input.pointer.active) g.x = clamp(input.pointer.x, 240, W - 240);
      snip(g.x);
    }

    // The bunch grows; snipped balloons are replaced.
    const want = countAt(g.elapsed);
    if (g.balloons.length + g.pending < want) g.pending++;
    if (g.pending > 0) {
      g.pendT -= dt;
      if (g.pendT <= 0) {
        g.pending--;
        g.pendT = 0.35;
        addBalloon(true);
        sfx('plop');
        if (!g.want) ask();
      }
    }
    for (const b of g.balloons) {
      b.grow = Math.min(1, b.grow + dt * 2.5);
      if (b.byNow !== undefined) {
        b.byNow = approach(b.byNow, b.by0, 4, dt);
        if (Math.abs(b.byNow - b.by0) < 1) delete b.byNow;
      }
      // the curls grow with the game
      const c = curl();
      b.w1 = clamp(b.w1, -c, c);
      b.w2 = clamp(b.w2, -c, c);
    }
    // Later the wind jostles the bunch: two neighbours drift past each other.
    if (g.elapsed > 22 && g.balloons.length > 2) {
      g.swapT -= dt;
      if (g.swapT <= 0) {
        g.swapT = g.elapsed > 34 ? 3 : 4.5;
        const sky = [...g.balloons].sort((a, b) => a.skyK - b.skyK);
        const i = Math.floor(rng() * (sky.length - 1));
        const t = sky[i].skyK;
        sky[i].skyK = sky[i + 1].skyK;
        sky[i + 1].skyK = t;
        sfx('shuffle');
      }
    }
    layout(dt);

    for (const l of g.loose) {
      l.vy = Math.max(-320, l.vy - 300 * dt);
      l.vx += Math.sin(l.life * 3 + l.ph) * 30 * dt;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.life -= dt;
    }
    g.loose = g.loose.filter((l) => l.life > 0 && l.y > -300);
    for (const s of g.stubs) s.life -= dt;
    g.stubs = g.stubs.filter((s) => s.life > 0);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Points ${g.score}`;
  g.summary = () => {
    const lines = [`${g.right} balloon${g.right === 1 ? '' : 's'} let go${g.quick ? `, ${g.quick} of them quick` : ''}.`];
    lines.push(g.wrong ? `${g.wrong} wrong string${g.wrong === 1 ? '' : 's'} snipped.` : 'Not one wrong string!');
    return lines;
  };

  // ---------- drawing ----------

  function drawBalloon(c, b, x, y, s = 1, alpha = 1) {
    const col = COLORS[b.color];
    c.save();
    c.globalAlpha *= alpha;
    if (drawSprite(c, 'sprites.balloons', (b.kite ? 6 : 0) + b.color, x, y, { h: (b.kite ? 130 : 140) * s, anchor: 'center' })) {
      c.restore();
      return;
    }
    c.translate(x, y);
    c.scale(s, s);
    if (b.kite) {
      poly(c, [[0, -66], [46, -6], [0, 62], [-46, -6]], b.color + 3, 1.5);
      wash(c, col.c);
      ink(c, 2.2);
      c.beginPath();
      c.moveTo(0, -66);
      c.lineTo(0, 62);
      c.moveTo(-46, -6);
      c.lineTo(46, -6);
      ink(c, 1.4, col.d);
      // a ribboned tail
      c.beginPath();
      c.moveTo(0, 62);
      c.bezierCurveTo(-18, 90, 22, 110, 4, 140);
      ink(c, 1.4);
      for (const [bx, by] of [[-6, 88], [8, 112]]) {
        poly(c, [[bx - 9, by - 6], [bx + 9, by + 6], [bx + 9, by - 6], [bx - 9, by + 6]], bx, 0.5);
        wash(c, col.c);
        ink(c, 1.2);
      }
    } else {
      blob(c, 0, -4, 50, 60, b.color + 7, 0.03, 20);
      wash(c, col.c);
      ink(c, 2.2);
      blob(c, -16, -26, 12, 18, 2, 0.1);
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.fill();
      poly(c, [[-7, 64], [7, 64], [0, 54]], 1, 0.5);
      wash(c, col.d);
      ink(c, 1.4);
    }
    c.restore();
  }

  function drawString(c, pts, width = 2, color = INK, u0 = 0, u1 = 1) {
    c.beginPath();
    const n = 28;
    for (let i = 0; i <= n; i++) {
      const [x, y] = bez(pts, u0 + ((u1 - u0) * i) / n);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    ink(c, width, color);
  }

  function drawSnippit(c, t) {
    const s = g.snipT > 0 ? g.snipT / 0.25 : 0;
    const jam = g.jam > 0 && !env.reduceMotion ? Math.sin(g.jam * 50) * 0.05 : 0;
    const walk = g.moving ? Math.sin(t * 14) * 0.04 : 0;
    const fx = g.x - HINGE_DX;
    // The painted poses: snipping, jammed, watching a balloon go, striding;
    // otherwise standing with its blades open.
    const o = { h: SIZE * 0.8, rot: jam + (g.moving ? walk * 0.5 : 0) };
    const pose = s > 0.2 ? ['sprites.snippitSnip', 1] : g.jam > 0 ? ['sprites.snippitPoses', 1] : g.happyT > 0 ? ['sprites.snippitPoses', 2] : g.moving && Math.floor(t * 7) % 2 ? ['sprites.snippitPoses', 0] : null;
    if (pose && drawSprite(c, pose[0], pose[1], fx, GROUND, o)) return;
    if (drawSprite(c, 'sprites.snippitSnip', 0, fx, GROUND, o)) return;
    c.save();
    c.translate(g.x, HINGE_Y);
    c.rotate(jam + walk - s * 0.12 + g.happyT * 0.12);
    c.scale(1 + s * 0.06, 1 - s * 0.08);
    c.translate(-g.x, -HINGE_Y);
    drawBird(c, 'snippit', { x: fx, y: GROUND, size: SIZE, t });
    c.restore();
    // shut blades: two ink strokes closing over the hinge
    if (s > 0) {
      c.save();
      c.globalAlpha = s;
      c.beginPath();
      for (const a of [-0.5, 0, 0.5]) {
        c.moveTo(g.x - 70 + Math.cos(a) * 10, PEG_Y - 4 + Math.sin(a) * 10);
        c.lineTo(g.x - 70 + Math.cos(a + Math.PI) * 28, PEG_Y - 4 + Math.sin(a + Math.PI) * 28);
      }
      ink(c, 3, PAL.magenta);
      c.restore();
    }
  }

  function drawTag(c, t) {
    const b = g.want;
    const x = 800;
    const y = 140;
    c.save();
    c.translate(x, y + Math.sin(t * 2) * 2);
    poly(c, [[-170, -46], [150, -46], [182, 0], [150, 46], [-170, 46]], 5, 1.2);
    c.fillStyle = 'rgba(250,244,228,0.95)';
    c.fill();
    ink(c, 2.4);
    c.beginPath();
    c.arc(160, 0, 8, 0, Math.PI * 2);
    ink(c, 2);
    label(c, 'Let go of', -70, 0, { size: 34, weight: 700 });
    if (b) drawBalloon(c, b, 70, b.kite ? -10 : -2, b.kite ? 0.42 : 0.55);
    else label(c, '…', 70, 0, { size: 40 });
    c.restore();
  }

  g.draw = (c, t) => {
    scene(c, 'snippit', W, H, (c) => {
      band(c, 0, 0, W, 520, PAL.sky, 0.55, 1);
      band(c, 0, 380, W, 160, '#e8dcb8', 0.4, 2);
      // far hills and the striped tent of the fair
      blob(c, 300, 560, 420, 110, 3, 0.05);
      wash(c, PAL.sage, 0.45);
      blob(c, 1300, 570, 480, 120, 4, 0.05);
      wash(c, '#b8c49a', 0.45);
      for (const [cx, cy] of [[260, 140], [1350, 110], [900, 70]]) {
        blob(c, cx, cy, 110, 34, cx, 0.12);
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.fill();
      }
      poly(c, [[1380, 600], [1470, 470], [1560, 600]], 6, 2);
      wash(c, '#f3e2c0');
      ink(c, 2);
      for (let i = 0; i < 4; i++) {
        poly(c, [[1395 + i * 42, 600], [1470, 470], [1412 + i * 42, 600]], i, 0.5);
        wash(c, PAL.strawberry, 0.7);
      }
      // the grass
      band(c, 0, 600, W, H - 600, PAL.sage, 0.55, 5);
      band(c, 0, 760, W, H - 760, PAL.green, 0.35, 6);
      // the fence: a rail and posts
      poly(c, [[60, RAIL_Y], [W - 60, RAIL_Y + 4], [W - 60, RAIL_Y + 26], [60, RAIL_Y + 22]], 7, 1);
      wash(c, '#c9925a');
      ink(c, 2.2);
      poly(c, [[60, RAIL_Y + 70], [W - 60, RAIL_Y + 72], [W - 60, RAIL_Y + 90], [60, RAIL_Y + 88]], 8, 1);
      wash(c, '#b98250');
      ink(c, 2);
      for (let x = 90; x < W; x += 236) {
        poly(c, [[x, RAIL_Y - 30], [x + 22, RAIL_Y - 32], [x + 24, GROUND + 8], [x + 2, GROUND + 6]], x, 1);
        wash(c, '#a87444');
        ink(c, 2);
        poly(c, [[x, RAIL_Y - 30], [x + 22, RAIL_Y - 32], [x + 24, GROUND + 8], [x + 2, GROUND + 6]], x, 1);
        hatch(c, x - 4, RAIL_Y - 34, x + 28, GROUND + 10, 8, 0.25, 1);
      }
    });

    // The knots on the rail.
    for (const b of g.balloons) {
      c.beginPath();
      c.arc(b.px, PEG_Y + 2, 7, 0, Math.PI * 2);
      c.fillStyle = '#7a5a3a';
      c.fill();
      ink(c, 1.6);
    }

    // The tangle: every tied string, all alike, so you have to follow it.
    const under = g.jam > 0 ? null : g.under();
    for (const b of g.balloons) {
      c.save();
      c.globalAlpha = b.grow;
      drawString(c, stringPts(b, t), 2.4);
      c.restore();
    }
    // The string under the blades glints for its first stretch.
    if (under) {
      c.save();
      c.globalAlpha = 0.85;
      drawString(c, stringPts(under, t), 5, PAL.magenta, 0, 0.22);
      c.restore();
    }
    // the cut ends left at the knots
    for (const s of g.stubs) {
      c.save();
      c.globalAlpha = s.life / 0.8;
      c.beginPath();
      c.moveTo(s.x, s.y);
      c.quadraticCurveTo(s.x + 10, s.y + 10, s.x + 4, s.y + 22 + (0.8 - s.life) * 60);
      ink(c, 2);
      c.restore();
    }

    // The bunch.
    for (const b of g.balloons) {
      const top = g.top(b);
      const isWant = b === g.want;
      const wob = isWant && !env.reduceMotion ? Math.sin(t * 9) * 0.06 : 0;
      c.save();
      c.translate(top.x, top.y);
      c.rotate(wob + Math.sin(t * 1.1 + b.ph) * 0.04);
      if (isWant) {
        c.beginPath();
        c.ellipse(0, 0, 76, 86, 0, 0, Math.PI * 2);
        c.save();
        c.setLineDash([10, 9]);
        ink(c, 3, PAL.magenta);
        c.restore();
      }
      drawBalloon(c, b, 0, 0, 0.3 + 0.7 * b.grow);
      c.restore();
    }
    // Floating away, trailing their cut strings.
    for (const l of g.loose) {
      c.beginPath();
      c.moveTo(l.x, l.y + 66);
      c.bezierCurveTo(l.x - 20, l.y + 120, l.x + 20, l.y + 170, l.x + Math.sin(l.life * 4) * 14, l.y + 230);
      ink(c, 2);
      drawBalloon(c, l, l.x, l.y, 1, Math.min(1, l.life));
    }

    drawTag(c, t);
    // A dotted mark from the blades to the rail: where a snip will land.
    c.save();
    c.setLineDash([4, 8]);
    c.beginPath();
    c.moveTo(g.x, PEG_Y - 34);
    c.lineTo(g.x, PEG_Y + 30);
    ink(c, 2, under ? PAL.magenta : 'rgba(59,43,32,0.4)');
    c.restore();
    drawSnippit(c, t);
    if (g.jam > 0) label(c, 'Jammed!', g.x, HINGE_Y - 150, { size: 32, color: PAL.brick, weight: 800 });

    for (const p of g.pops) {
      const k = Math.min(1, (1.3 - p.life) * 8);
      c.save();
      c.globalAlpha = Math.min(1, p.life * 2);
      c.translate(p.x, p.y);
      c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = `800 ${p.size}px Fraunces, Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeText(p.text, 0, 0);
      label(c, p.text, 0, 0, { size: p.size, color: p.color, weight: 800 });
      c.restore();
    }

    if (g.elapsed < 4) {
      c.save();
      c.globalAlpha = Math.min(1, 4 - g.elapsed);
      label(c, 'Follow its string down · snip at the knot', W / 2, 560, { size: 34, weight: 600 });
      c.restore();
    }
  };

  // The whole tangle has to stay in view on a narrow screen.
  g.focus = () => W / 2;
  g.span = 1180;

  return g;
}

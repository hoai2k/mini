// The Buttonbeaks: Button Up.
//
// Coats, cardigans and waistcoats come along the washing line, each with
// empty buttonholes, and every hole shows the button it is missing (its
// colour, its shape and its holes). The two Buttonbeaks stand behind the
// open button tin. Walk them to the bowl with the right button and press to
// pick it up, then walk under the coat as it passes and press again to toss
// it up: it sews itself into the matching hole. A button that doesn't match
// anything on that coat bounces off and is lost, and the Buttonbeaks are
// dazed for a moment. Coats with open holes simply carry on and away. The
// line runs faster as time goes on, coats come with more holes, and two more
// bowls of look-alike buttons join the tin. Score: buttons sewn on.

import { drawBird, drawSprite, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.buttons': [3, 2], // the six buttons, in KINDS order
  'sprites.coats': [4, 1], // coat, cardigan, waistcoat, jacket, each hung from two pegs
  'sprites.buttonBowl': [1, 1],
  'sprites.buttonbeaksToss': [2, 1], // holding a button up between them, tossing it
  'sprites.buttonbeaksPoses': [4, 1], // walking mid-stride, pecking into a bowl, dazed, cheering
});

const DURATION = 45;
const LINE_Y = 176; // the washing line, at its posts
const SAG = 26;
const COAT_W = 230;
const COAT_H = 290;
const HOLE_DY = [84, 166, 248]; // the buttonholes, below the line
const GROUND = 806; // the Buttonbeaks' feet, behind the tin
const SIZE = 280;
const HOLD_Y = GROUND - 205; // the button they hold up
const BOWL_Y = 838;
const BOWL_GAP = 176;
const REACH = 80; // how near a bowl they must be to pick from it
const DAZE = 1;

// Each button: colour, shape and its holes. The last two look like the first
// two at a glance (same colours), and join the tin later.
export const KINDS = [
  { c: PAL.strawberry, d: '#b8506e', shape: 'round', holes: 4 },
  { c: PAL.slate, d: '#4f6a88', shape: 'round', holes: 2 },
  { c: PAL.lemon, d: '#b8a030', shape: 'square', holes: 4 },
  { c: PAL.sage, d: '#5f7f48', shape: 'flower', holes: 2 },
  { c: PAL.strawberry, d: '#b8506e', shape: 'square', holes: 2 },
  { c: PAL.slate, d: '#4f6a88', shape: 'flower', holes: 4 },
];
const COAT_COLS = [PAL.mustard, PAL.olive, PAL.dusty, PAL.ochre, '#9aa8b8', PAL.mauve, '#c9b48a'];

const bowlsAt = (t) => (t < 18 ? 4 : 6);
const speedAt = (t) => 80 + Math.min(1, t / DURATION) * 60;
const gapAt = (t) => 320 - Math.min(1, t / DURATION) * 90;
const holesAt = (t, r) => (t < 8 ? 1 : t < 22 ? 1 + (r < 0.6 ? 1 : 0) : 2 + (r < 0.45 ? 1 : 0));
export const bowlX = (i, n) => 800 + (i - (n - 1) / 2) * BOWL_GAP;
const lineY = (x) => LINE_Y + SAG * (1 - Math.pow((x - 800) / 800, 2));

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    x: 800,
    vx: 0,
    holding: null, // the kind of button they hold
    coats: [], // { x, col, style, holes: [{ dy, kind, sewn, t }], done }
    flying: [], // tossed buttons: { kind, x, y, vy, state }
    bowls: 4,
    daze: 0,
    pickT: 0, // pecking a button out of a bowl
    cheerT: 0, // a button sewn on
    moving: false,
    tossT: 0,
    nextCoat: 0,
    sewn: 0,
    wrong: 0,
    open: 0, // holes that went by unfilled
    full: 0, // coats buttoned all the way
    pops: [],
  };

  function pop(text, x, y, color = INK, size = 44) {
    g.pops.push({ text, x, y, color, size, life: 1.3 });
  }

  function addCoat(x) {
    const kinds = bowlsAt(g.elapsed);
    const n = holesAt(g.elapsed, rng());
    const rows = n === 1 ? [1] : n === 2 ? [0, 2] : [0, 1, 2];
    g.coats.push({
      x,
      col: COAT_COLS[Math.floor(rng() * COAT_COLS.length)],
      style: Math.floor(rng() * 4),
      holes: rows.map((r) => ({ dy: HOLE_DY[r], kind: Math.floor(rng() * kinds), sewn: false, t: 0 })),
      swing: 0,
      ph: rng() * 6,
    });
  }
  // Two coats already on their way in.
  addCoat(W - 420);
  addCoat(W - 70);
  g.nextCoat = gapAt(0) - 70;

  g.coatTop = (coat) => lineY(coat.x) + 8;
  g.bowlX = (i) => bowlX(i, g.bowls);
  // The bowl in front of the Buttonbeaks, if any.
  g.overBowl = (x = g.x) => {
    for (let i = 0; i < g.bowls; i++) if (Math.abs(bowlX(i, g.bowls) - x) < REACH) return i;
    return -1;
  };
  // The coat a toss from x would reach.
  g.coatAbove = (x = g.x) => g.coats.find((c) => Math.abs(c.x - x) < COAT_W / 2 - 10) || null;

  function pick(i) {
    g.holding = i;
    g.pickT = 0.25;
    sfx('catch', { pitch: i });
    pop('Got it', bowlX(i, g.bowls), BOWL_Y - 70, INK, 30);
  }

  function toss() {
    g.flying.push({ kind: g.holding, x: g.x, y: HOLD_Y, vy: -1500, vx: 0, state: 'up', spin: 0 });
    g.holding = null;
    g.tossT = 0.3;
    sfx('pour');
  }

  // A tossed button reaches a coat: into the matching open hole, or off.
  function land(b, coat) {
    const top = g.coatTop(coat);
    const hole = coat.holes
      .filter((h) => !h.sewn && h.kind === b.kind)
      .sort((a, c) => Math.abs(top + a.dy - b.y) - Math.abs(top + c.dy - b.y))[0];
    if (hole) {
      hole.sewn = true;
      hole.t = 0.5;
      b.state = 'gone';
      g.score++;
      g.sewn++;
      g.cheerT = 0.6;
      coat.swing = 0.6;
      sfx('ding', { pitch: (g.sewn % 5) * 2 });
      env.vibrate?.(25);
      pop('+1', coat.x + 60, top + hole.dy - 30, PAL.magenta, 44);
      if (coat.holes.every((h) => h.sewn)) {
        g.full++;
        pop('All buttoned!', coat.x, top + COAT_H + 40, PAL.magenta, 40);
        sfx('right');
      }
    } else {
      b.state = 'off';
      b.vy = 300;
      b.vx = (rng() - 0.5) * 300;
      g.wrong++;
      g.daze = DAZE;
      coat.swing = 0.4;
      sfx('bonk');
      env.vibrate?.(60);
      pop(coat.holes.some((h) => !h.sewn) ? 'Not that one!' : 'All done already!', coat.x, top + COAT_H + 40, PAL.brick, 38);
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
    g.daze = Math.max(0, g.daze - dt);
    g.tossT = Math.max(0, g.tossT - dt);
    g.pickT = Math.max(0, g.pickT - dt);
    g.cheerT = Math.max(0, g.cheerT - dt);
    const was = g.x;
    const nb = bowlsAt(g.elapsed);
    if (nb !== g.bowls) {
      g.bowls = nb;
      pop('New buttons!', 800, BOWL_Y - 120, PAL.magenta, 46);
      sfx('bloom');
      if (g.holding !== null && g.holding >= nb) g.holding = null;
    }

    // Walk: follow the pointer, or run with the stick.
    if (input.pointer.active) g.x = approach(g.x, input.pointer.x, 12, dt);
    else {
      g.vx = approach(g.vx, input.x * 950, 14, dt);
      g.x += g.vx * dt;
    }
    g.x = clamp(g.x, 140, W - 140);
    g.moving = Math.abs(g.x - was) > 40 * dt;

    if (input.actionPressed && g.daze <= 0) {
      if (input.pointer.active) {
        // touch: tap a bowl to pick from it, tap up by the coats to toss
        g.x = clamp(input.pointer.x, 140, W - 140);
        if (input.pointer.y > HOLD_Y + 60) {
          const i = g.overBowl();
          if (i >= 0) pick(i);
        } else if (g.holding !== null) toss();
      } else if (g.holding !== null) toss();
      else {
        const i = g.overBowl();
        if (i >= 0) pick(i);
      }
    }

    // The line moves along.
    const v = speedAt(g.elapsed);
    for (const coat of g.coats) {
      coat.x -= v * dt;
      coat.swing = Math.max(0, coat.swing - dt);
      for (const h of coat.holes) h.t = Math.max(0, h.t - dt);
      if (coat.x < -COAT_W && !coat.gone) {
        coat.gone = true;
        const open = coat.holes.filter((h) => !h.sewn).length;
        g.open += open;
      }
    }
    g.coats = g.coats.filter((c) => !c.gone);
    g.nextCoat -= v * dt;
    if (g.nextCoat <= 0) {
      addCoat(W + COAT_W / 2 + 20);
      g.nextCoat = gapAt(g.elapsed) + rng() * 80;
    }

    for (const b of g.flying) {
      b.spin += dt * 12;
      if (b.state === 'up') {
        b.y += b.vy * dt;
        const coat = g.coats.find((c) => Math.abs(c.x - b.x) < COAT_W / 2 - 10 && b.y < g.coatTop(c) + COAT_H - 20);
        if (coat) land(b, coat);
        else if (b.y < -40) {
          b.state = 'gone';
          pop('Missed', b.x, 120, PAL.grey, 32);
        }
      } else if (b.state === 'off') {
        b.vy += 2000 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y > H + 40) b.state = 'gone';
      }
    }
    g.flying = g.flying.filter((b) => b.state !== 'gone');

    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Buttons ${g.score}`;
  g.summary = () => {
    const lines = [`${g.sewn} button${g.sewn === 1 ? '' : 's'} sewn on, ${g.full} coat${g.full === 1 ? '' : 's'} buttoned all the way.`];
    lines.push(g.wrong ? `${g.wrong} button${g.wrong === 1 ? '' : 's'} bounced off.` : 'Not one button bounced off!');
    return lines;
  };

  // ---------- drawing ----------

  // A button, drawn r across (or its ghost in an empty hole).
  function drawButton(c, kind, x, y, r, { ghost = false, rot = 0 } = {}) {
    const k = KINDS[kind];
    if (!ghost && drawSprite(c, 'sprites.buttons', kind, x, y, { h: r * 2, anchor: 'center', rot })) return;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    if (ghost) c.globalAlpha *= 0.85 + 0.15 * Math.sin(g.elapsed * 5);
    if (k.shape === 'round') blob(c, 0, 0, r, r, kind + 1, 0.02);
    else if (k.shape === 'square') poly(c, [[-r * 0.86, -r * 0.86], [r * 0.86, -r * 0.86], [r * 0.86, r * 0.86], [-r * 0.86, r * 0.86]], kind, 1);
    else {
      c.beginPath();
      for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const rr = r * (0.82 + 0.18 * Math.cos(a * 5));
        if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
    }
    if (ghost) {
      c.fillStyle = k.c;
      c.globalAlpha *= 0.75;
      c.fill();
      c.globalAlpha /= 0.75;
      c.save();
      c.setLineDash([5, 5]);
      ink(c, 2.4, k.d);
      c.restore();
    } else {
      wash(c, k.c, 1);
      ink(c, 2.2);
      // the rim
      if (k.shape === 'round') {
        c.beginPath();
        c.arc(0, 0, r * 0.72, 0, Math.PI * 2);
        ink(c, 1.2, k.d);
      }
    }
    // the thread holes
    c.fillStyle = ghost ? k.d : INK;
    const h = r * 0.26;
    const pts = k.holes === 2 ? [[-h, 0], [h, 0]] : [[-h, -h], [h, -h], [-h, h], [h, h]];
    for (const [px, py] of pts) {
      c.beginPath();
      c.arc(px, py, Math.max(2.5, r * 0.11), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function drawCoat(c, coat, t) {
    const top = g.coatTop(coat);
    const sw = coat.swing > 0 && !env.reduceMotion ? Math.sin(coat.swing * 20) * 0.04 * coat.swing : 0;
    c.save();
    c.translate(coat.x, top);
    c.rotate(sw + Math.sin(t * 1.4 + coat.ph) * 0.012);
    if (!drawSprite(c, 'sprites.coats', coat.style, 0, COAT_H, { h: COAT_H + 10 })) {
      const w = COAT_W / 2;
      const sleeve = coat.style !== 2; // the waistcoat has none
      const len = coat.style === 1 ? COAT_H - 10 : coat.style === 2 ? COAT_H - 16 : COAT_H;
      poly(c, [[-w + 30, 0], [-26, 10], [0, 40], [26, 10], [w - 30, 0], [w, 40], [w - 10, len], [-w + 10, len], [-w, 40]], coat.style + 2, 1.5);
      wash(c, coat.col);
      ink(c, 2.4);
      poly(c, [[-w + 30, 0], [-26, 10], [0, 40], [26, 10], [w - 30, 0], [w, 40], [w - 10, len], [-w + 10, len], [-w, 40]], coat.style + 2, 1.5);
      hatch(c, -w, 0, w, len, 12, 0.14, 1);
      if (sleeve) {
        for (const s of [-1, 1]) {
          poly(c, [[s * (w - 6), 36], [s * (w + 40), 150], [s * (w + 16), 168], [s * (w - 10), 96]], s + 5, 1.2);
          wash(c, coat.col);
          ink(c, 2.2);
        }
      }
      // the collar and the placket down the middle
      poly(c, [[-26, 10], [0, 40], [26, 10], [10, 4], [0, 22], [-10, 4]], 3, 0.8);
      wash(c, '#f2e6c8', 0.8);
      ink(c, 1.6);
      c.beginPath();
      c.moveTo(0, 40);
      c.lineTo(0, len);
      ink(c, 1.8);
      // pockets
      for (const s of [-1, 1]) {
        poly(c, [[s * 68 - 24, len - 90], [s * 68 + 24, len - 90], [s * 68 + 22, len - 40], [s * 68 - 22, len - 40]], s + 9, 1);
        ink(c, 1.6);
      }
    }
    // the clothes pegs
    for (const s of [-1, 1]) {
      poly(c, [[s * 80 - 7, -22], [s * 80 + 7, -22], [s * 80 + 6, 24], [s * 80 - 6, 24]], s + 11, 0.8);
      wash(c, '#d9b98a');
      ink(c, 1.6);
    }
    // the buttonholes: a slit and the button it wants, or the button sewn on
    for (const h of coat.holes) {
      if (h.sewn) {
        const s = 1 + h.t * 0.6;
        drawButton(c, h.kind, 0, h.dy, 24 * s);
        c.beginPath();
        c.moveTo(-6, h.dy - 6);
        c.lineTo(6, h.dy + 6);
        ink(c, 1.4, '#f4ecd8');
      } else {
        // a pale patch so the wanted button reads on any cloth
        blob(c, 0, h.dy, 36, 36, h.dy, 0.05);
        wash(c, '#faf3e0', 0.9);
        c.save();
        c.setLineDash([3, 5]);
        ink(c, 1.4);
        c.restore();
        drawButton(c, h.kind, 0, h.dy, 26, { ghost: true });
        if (g.holding === h.kind) {
          // the button they hold fits here: a pulsing ring says where to run
          const k = 0.5 + 0.5 * Math.sin(t * 8);
          c.beginPath();
          c.arc(0, h.dy, 44 + k * 8, 0, Math.PI * 2);
          ink(c, 4, `rgba(192,64,122,${0.55 + 0.45 * k})`);
        }
        c.beginPath();
        c.moveTo(-14, h.dy + 46);
        c.lineTo(14, h.dy + 46);
        ink(c, 3, INK);
      }
    }
    c.restore();
  }

  function drawBowl(c, i, t) {
    const x = bowlX(i, g.bowls);
    const near = g.overBowl() === i;
    c.save();
    if (near) {
      c.beginPath();
      c.ellipse(x, BOWL_Y + 4, 84, 30, 0, 0, Math.PI * 2);
      c.save();
      c.setLineDash([8, 8]);
      ink(c, 3, PAL.magenta);
      c.restore();
    }
    if (!drawSprite(c, 'sprites.buttonBowl', 0, x, BOWL_Y + 34, { h: 70 })) {
      c.beginPath();
      c.moveTo(x - 72, BOWL_Y - 8);
      c.quadraticCurveTo(x - 66, BOWL_Y + 36, x, BOWL_Y + 38);
      c.quadraticCurveTo(x + 66, BOWL_Y + 36, x + 72, BOWL_Y - 8);
      c.closePath();
      wash(c, '#c9925a');
      ink(c, 2.2);
      c.beginPath();
      c.ellipse(x, BOWL_Y - 8, 72, 16, 0, 0, Math.PI * 2);
      wash(c, '#8a5a3a', 0.9);
      ink(c, 2);
    }
    // a little heap of its buttons
    for (const [dx, dy, r] of [[-30, -16, 20], [30, -14, 20], [0, -26, 22]]) drawButton(c, i, x + dx, BOWL_Y + dy, r, { rot: dx * 0.02 });
    c.restore();
  }

  function drawBeaks(c, t) {
    const daze = g.daze > 0 && !env.reduceMotion ? Math.sin(g.daze * 40) * 0.06 : 0;
    const walk = g.moving ? Math.abs(Math.sin(t * 12)) * 8 : 0;
    const toss = g.tossT > 0 ? g.tossT / 0.3 : 0;
    // The painted poses: tossing, pecking, dazed, cheering, holding a button
    // up, striding; otherwise the portrait.
    const stride = g.moving && Math.floor(t * 7) % 2;
    const pose = toss > 0 ? ['sprites.buttonbeaksToss', 1]
      : g.pickT > 0 ? ['sprites.buttonbeaksPoses', 1]
      : g.daze > 0 ? ['sprites.buttonbeaksPoses', 2]
      : g.cheerT > 0 && g.holding === null ? ['sprites.buttonbeaksPoses', 3]
      : g.holding !== null ? ['sprites.buttonbeaksToss', 0]
      : stride ? ['sprites.buttonbeaksPoses', 0] : null;
    const drawn = pose && drawSprite(c, pose[0], pose[1], g.x, GROUND - walk, { h: SIZE * 0.62, rot: daze });
    if (!drawn) {
      c.save();
      c.translate(g.x, GROUND - walk - g.cheerT * 30);
      c.rotate(daze);
      drawBird(c, 'buttonbeaks', { x: 0, y: 0, size: SIZE, t, squash: toss * -0.08 });
      c.restore();
    }
    if (g.holding !== null) {
      // the button held up between them, on a loop of thread
      c.beginPath();
      c.moveTo(g.x - 40, HOLD_Y + 60 - walk);
      c.quadraticCurveTo(g.x, HOLD_Y - 10 - walk, g.x + 40, HOLD_Y + 60 - walk);
      ink(c, 1.6, '#b8506e');
      drawButton(c, g.holding, g.x, HOLD_Y - walk + Math.sin(t * 4) * 3, 30);
    }
    if (g.daze > 0) label(c, '✶  ✶', g.x, GROUND - 230, { size: 30, color: PAL.ochre, weight: 800 });
  }

  g.draw = (c, t) => {
    scene(c, 'buttonbeaks', W, H, (c) => {
      band(c, 0, 0, W, 600, PAL.sky, 0.5, 1);
      for (const [cx, cy] of [[300, 90], [1200, 70], [760, 520]]) {
        blob(c, cx, cy, 120, 32, cx, 0.12);
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.fill();
      }
      // a hedge and the garden
      blob(c, 800, 640, 900, 90, 4, 0.04, 30);
      wash(c, PAL.green, 0.5);
      band(c, 0, 640, W, H - 640, PAL.sage, 0.55, 3);
      band(c, 0, 760, W, H - 760, '#b8c49a', 0.45, 6);
      // the two posts and the line
      for (const px of [40, W - 40]) {
        poly(c, [[px - 14, LINE_Y - 30], [px + 14, LINE_Y - 30], [px + 16, 700], [px - 16, 700]], px, 1);
        wash(c, '#a87444');
        ink(c, 2.2);
      }
      // the button tin, open, the bowls set in it
      poly(c, [[180, 812], [W - 180, 812], [W - 150, 892], [150, 892]], 8, 1.2);
      wash(c, '#9aa8b8');
      ink(c, 2.4);
      poly(c, [[180, 812], [W - 180, 812], [W - 150, 892], [150, 892]], 8, 1.2);
      hatch(c, 150, 810, W - 150, 895, 10, 0.18, 1);
    });
    // the line itself, drawn in code because the coats hang on it
    c.beginPath();
    for (let x = 30; x <= W - 30; x += 40) {
      if (x === 30) c.moveTo(x, lineY(x));
      else c.lineTo(x, lineY(x));
    }
    ink(c, 2.4);

    for (const coat of g.coats) drawCoat(c, coat, t);
    // where a toss would go
    const above = g.holding !== null ? g.coatAbove() : null;
    c.save();
    c.setLineDash([4, 10]);
    c.beginPath();
    c.moveTo(g.x, HOLD_Y - 40);
    c.lineTo(g.x, above ? g.coatTop(above) + COAT_H : HOLD_Y - 140);
    ink(c, 2, g.holding === null ? 'rgba(59,43,32,0)' : above ? PAL.magenta : 'rgba(59,43,32,0.35)');
    c.restore();

    drawBeaks(c, t);
    for (let i = 0; i < g.bowls; i++) drawBowl(c, i, t);
    for (const b of g.flying) drawButton(c, b.kind, b.x, b.y, 26, { rot: b.spin });

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
      label(c, 'Pick the button it needs · toss it up under the coat', W / 2, 560, { size: 34, weight: 600 });
      c.restore();
    }
  };

  g.focus = () => g.x;
  g.span = 1000;

  return g;
}

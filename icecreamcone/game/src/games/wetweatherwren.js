// Wetweather Wren: Puddle Hop.
//
// It is raining, and the Wetweather Wren, a furled black umbrella, walks
// along the wet street (the street scrolls by on its own, faster as time
// goes on). Press the action to pop the umbrella open: the gust under it
// lifts the Wren into a hop, and while the action is held it floats down
// slowly under its canopy. Let go and it furls and drops. Hop every puddle
// (one point each): land in one and it splashes and stops for a moment.
// Little birds wait in the rain: float over one with the umbrella open to
// keep it dry (a point). From a quarter of the way in, shop awnings hang over
// the pavement: an open umbrella catches on them, so walk beneath with it
// shut. Gusts of wind lift an open umbrella higher still.
// Score: points (puddles hopped and birds kept dry).

import { art, drawBird, drawSprite, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.wrenPoses': [3, 1], // umbrella open (floating), umbrella open and walking, snagged inside-out
  'sprites.wrenWalk': [2, 1], // furled, walking: two strides, without the portrait's rain and puddle
  'sprites.wrenSplash': [1, 1], // furled, standing in a puddle, drenched and dripping
  'sprites.rainStreet': [2, 2], // small puddle, long puddle, pink striped awning, green striped awning
});

const DURATION = 45;
const GROUND = 760; // where the Wren's feet walk
const WREN_X = 420; // the Wren's place on the screen; the street moves
const SIZE = 230;
const HOP = 760; // the gust under a freshly opened umbrella
const G_OPEN = 1500;
const G_SHUT = 3400;
const FALL_OPEN = 170; // floating down under the canopy
const TOP_SHUT = Math.round((383 * SIZE) / 400); // how tall the Wren stands, furled (the painting's top)
const TOP_OPEN = 285; // and with its canopy open
const AWN_H = 330; // an awning's lower edge, above the pavement
const FOOT = 22; // how much of a puddle's rim is safe to stand on
const CANOPY_R = 140;
const PAVE_Y = 728; // the near pavement's kerb in the delivered scene (874 of 1080)

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    d: 0, // how far the street has scrolled: the Wren's place in the world
    speed: 0,
    h: 0, // the Wren's feet above the pavement
    vy: 0, // upwards is positive
    grounded: true,
    open: false,
    noOpen: 0, // a snagged umbrella can't open for a moment
    stun: 0,
    wet: 0,
    tilt: 0,
    snagT: 0,
    puddles: [], // { x0, x1, hit, counted }
    awnings: [], // { x0, x1, hit, color }
    chicks: [], // { x, state: 'wait' | 'dry' | 'cold', t, color }
    nextX: 700,
    gust: 0, // seconds left in the current gust
    gustT: 0, // until the next one
    hopped: 0,
    splashes: 0,
    sheltered: 0,
    snags: 0,
    streak: 0, // puddles hopped in a row
    bestStreak: 0,
    bonus: 0,
    bits: [],
    pops: [],
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  const baseSpeed = () => lerp(320, 540, progress());
  const top = () => g.h + (g.open ? TOP_OPEN : TOP_SHUT);

  function pop(text, x, y, color = INK, size = 44) {
    g.pops.push({ text, x, y, color, size, life: 1.2 });
  }
  const sx = (wx) => wx - g.d + WREN_X; // world to screen

  // Lays the street out ahead: dry stretches, puddles, little birds, awnings.
  function lay() {
    const t = g.elapsed;
    const p = progress();
    const dry = lerp(600, 260, p) * (0.8 + rng() * 0.5);
    let x = g.nextX + dry;
    const r = rng();
    const widthNow = () => lerp(250, 300, p) + rng() * lerp(60, 160, p);
    if (t > 5 && r < 0.22) {
      g.chicks.push({ x, state: 'wait', t: 0, color: [PAL.lemon, PAL.strawberry, PAL.mint, PAL.ochre][Math.floor(rng() * 4)] });
      // a little bird often sits just before a puddle: shelter it on the way over
      if (rng() < 0.6) {
        const w = widthNow();
        g.puddles.push({ x0: x + 60, x1: x + 60 + w });
        x += 60 + w;
      }
      g.nextX = x;
      return;
    }
    if (t > 13 && r < 0.48) {
      const len = 340 + rng() * 200;
      g.awnings.push({ x0: x, x1: x + len, color: rng() < 0.5 ? 0 : 1 });
      g.nextX = x + len;
      return;
    }
    const w = t < 6 ? 230 + rng() * 40 : widthNow();
    g.puddles.push({ x0: x, x1: x + w });
    g.nextX = x + w;
    if (t > 20 && rng() < 0.35) {
      // a second one close behind: land and hop again, or float over both
      const gap = 170 + rng() * 60;
      const w2 = 230 + rng() * 80;
      g.puddles.push({ x0: g.nextX + gap, x1: g.nextX + gap + w2 });
      g.nextX += gap + w2;
    }
  }

  function splash(p) {
    p.hit = true;
    g.streak = 0;
    g.splashes++;
    g.stun = 0.75;
    g.speed = 0;
    g.wet = 2;
    g.open = false;
    sfx('splash');
    env.vibrate?.(80);
    pop('Splash!', WREN_X, GROUND - 260, PAL.slate, 52);
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI * (0.1 + 0.8 * rng());
      const v = 260 + rng() * 420;
      g.bits.push({ kind: 'drop', x: WREN_X + (rng() - 0.5) * 60, y: GROUND, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + rng() * 0.4 });
    }
  }

  function snag(a) {
    a.hit = true;
    g.snags++;
    g.streak = 0;
    g.open = false;
    g.noOpen = 0.7;
    g.snagT = 0.6;
    g.stun = 0.45;
    g.speed = 0;
    g.vy = Math.min(g.vy, 0) - 100;
    sfx('bonk');
    env.vibrate?.(60);
    pop('Snagged!', WREN_X, GROUND - AWN_H - 40, PAL.brick, 46);
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }
    while (g.nextX < g.d + W + 600) lay();

    // The street moves on, unless the Wren has stopped.
    if (g.stun > 0) {
      g.stun -= dt;
      g.speed = 0;
    } else g.speed = approach(g.speed, baseSpeed(), 4, dt);
    g.d += g.speed * dt;
    g.noOpen = Math.max(0, g.noOpen - dt);
    g.snagT = Math.max(0, g.snagT - dt);
    g.wet = Math.max(0, g.wet - dt);

    // The umbrella: press to pop it open (a hop from the ground), hold to
    // keep it open, let go to furl it.
    if (input.actionPressed && g.noOpen <= 0 && g.stun <= 0) {
      g.open = true;
      sfx('switch');
      if (g.grounded) {
        g.grounded = false;
        g.vy = HOP;
        sfx('pour');
      }
    }
    if (!input.action || g.noOpen > 0) g.open = false;

    // Gusts, from a little way in: they lift an open umbrella.
    if (g.elapsed > 17) {
      if (g.gust > 0) g.gust -= dt;
      else {
        g.gustT -= dt;
        if (g.gustT <= 0) {
          g.gust = 1.1 + rng() * 0.6;
          g.gustT = 3 + rng() * 3;
          sfx('wind');
        }
      }
    }

    // Up and down.
    if (!g.grounded) {
      g.vy -= (g.open ? G_OPEN : G_SHUT) * dt;
      if (g.open && g.gust > 0 && g.h < 400) g.vy += 2200 * dt;
      if (g.open) g.vy = Math.max(g.vy, -FALL_OPEN);
      g.h += g.vy * dt;
      if (g.h <= 0) {
        g.h = 0;
        g.vy = 0;
        g.grounded = true;
        sfx('plop');
      }
    }
    g.tilt = approach(g.tilt, g.grounded ? 0 : clamp(-g.vy / 2000, -0.2, 0.2), 8, dt);

    // Puddles: feet down in one is a splash; past one dry is a point.
    for (const p of g.puddles) {
      if (p.hit || p.counted) continue;
      if (g.grounded && g.d > p.x0 + FOOT && g.d < p.x1 - FOOT) splash(p);
      else if (g.d > p.x1 - FOOT) {
        p.counted = true;
        g.score++;
        g.hopped++;
        g.streak++;
        g.bestStreak = Math.max(g.bestStreak, g.streak);
        sfx('catch', { pitch: Math.min(12, g.streak) });
        if (g.streak % 5 === 0) {
          g.score += 2;
          g.bonus += 2;
          sfx('right');
          pop(`${g.streak} dry in a row! +2`, WREN_X + 60, GROUND - top() - 40, PAL.magenta, 44);
        } else pop('+1', WREN_X + 40, GROUND - top() - 30, PAL.magenta, 40);
      }
    }
    // Awnings catch an open (or too high) umbrella.
    for (const a of g.awnings) {
      if (a.hit) continue;
      const reach = g.open ? CANOPY_R * 0.8 : 30;
      if (g.d + reach > a.x0 && g.d - reach < a.x1 && top() > AWN_H) snag(a);
    }
    // Little birds: the Wren's open canopy passing over keeps one dry.
    for (const c of g.chicks) {
      c.t += dt;
      if (c.state !== 'wait') continue;
      if (Math.abs(g.d - c.x) < 50 && g.open) {
        c.state = 'dry';
        c.t = 0;
        g.score++;
        g.sheltered++;
        sfx('ding', { pitch: 4 });
        pop('Kept dry! +1', sx(c.x), GROUND - 160, PAL.magenta, 38);
      } else if (g.d - c.x > 50) {
        c.state = 'cold';
        c.t = 0;
      }
    }

    // Forget what is well behind.
    const gone = g.d - WREN_X - 400;
    g.puddles = g.puddles.filter((p) => p.x1 > gone);
    g.awnings = g.awnings.filter((a) => a.x1 > gone);
    g.chicks = g.chicks.filter((c) => c.x > gone - 600);

    for (const b of g.bits) {
      b.vy += 1400 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    g.bits = g.bits.filter((b) => b.life > 0);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Points ${g.score}`;
  g.summary = () => {
    const lines = [`${g.hopped} puddle${g.hopped === 1 ? '' : 's'} hopped, ${g.sheltered} little bird${g.sheltered === 1 ? '' : 's'} kept dry.`];
    const woes = [];
    if (g.splashes) woes.push(`${g.splashes} splash${g.splashes === 1 ? '' : 'es'}`);
    if (g.bonus) lines.push(`Best run: ${g.bestStreak} dry in a row (+${g.bonus} bonus).`);
    if (g.snags) woes.push(`${g.snags} snag${g.snags === 1 ? '' : 's'} on an awning`);
    lines.push(woes.length ? `Along the way: ${woes.join(', ')}.` : 'Not a drop on your feet!');
    return lines;
  };

  // ---------- drawing ----------

  function standinStreet(c) {
    band(c, 0, 0, W, 610, '#9aa6b0', 0.5, 1);
    band(c, 0, 0, W, 200, '#7f8a96', 0.35, 2);
    // the far side of the street: a row of tall, narrow houses
    const fronts = ['#c9b8a0', '#b8a6a8', '#a9b0a0', '#c4ac8c', '#b0a4b4'];
    for (let i = 0; i < 9; i++) {
      const x0 = -20 + i * 190;
      const tall = 260 + ((i * 53) % 90);
      poly(c, [[x0, 600], [x0, 600 - tall], [x0 + 85, 540 - tall], [x0 + 175, 600 - tall], [x0 + 175, 600]], i + 3, 1.5);
      wash(c, fronts[i % fronts.length], 0.55);
      ink(c, 1.6);
      for (let k = 0; k < 2; k++) {
        poly(c, [[x0 + 30 + k * 70, 600 - tall + 60], [x0 + 75 + k * 70, 600 - tall + 60], [x0 + 75 + k * 70, 600 - tall + 120], [x0 + 30 + k * 70, 600 - tall + 120]], i * 3 + k, 1);
        wash(c, '#e8dca0', 0.5);
        ink(c, 1.2);
      }
    }
    // the road and the near pavement
    band(c, 0, 600, W, 80, '#7a7a80', 0.45, 5);
    poly(c, [[0, 680], [W, 682], [W, 696], [0, 694]], 6, 1);
    wash(c, '#a8a296', 0.8);
    ink(c, 1.8);
    band(c, 0, 694, W, H - 694, '#a6a8aa', 0.6, 7);
    hatch(c, 0, 600, W, 680, 16, 0.12, 1);
  }

  // The pavement's joints and kerb marks move with the street.
  function joints(c) {
    c.save();
    c.globalAlpha = 0.35;
    const step = 170;
    const off = -((g.d % step) + step) % step;
    for (let x = off; x < W + step; x += step) {
      c.beginPath();
      c.moveTo(x, 696);
      c.lineTo(x - 40, H);
      ink(c, 1.4);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(0, 820);
    c.lineTo(W, 822);
    c.stroke();
    c.restore();
  }

  // The painted near pavement (below its kerb, 725 down in game units),
  // scrolled with the street, so the flagstones move under the Wren as the
  // puddles do. Two copies side by side, the second mirrored so the seam
  // between them matches.
  function pavement(c) {
    const img = art('scene.wetweatherwren');
    const k = img.width / W;
    const y0 = PAVE_Y;
    const off = -(((g.d % (2 * W)) + 2 * W) % (2 * W));
    for (let i = 0; i < 3; i++) {
      const x = off + i * W;
      if (x > W || x + W < 0) continue;
      c.save();
      if (i % 2) {
        c.translate(x + W, 0);
        c.scale(-1, 1);
        c.drawImage(img, 0, y0 * k, img.width, (H - y0) * k, 0, y0, W, H - y0);
      } else c.drawImage(img, 0, y0 * k, img.width, (H - y0) * k, x, y0, W, H - y0);
      c.restore();
    }
  }

  function drawPuddle(c, p, t) {
    const x0 = sx(p.x0);
    const x1 = sx(p.x1);
    if (x1 < -50 || x0 > W + 50) return;
    const cx = (x0 + x1) / 2;
    const rx = (x1 - x0) / 2 + 10;
    const sprite = p.x1 - p.x0 > 300 ? 1 : 0;
    if (!drawSprite(c, 'sprites.rainStreet', sprite, cx, GROUND + 12, { w: rx * 2, anchor: 'center' })) {
      blob(c, cx, GROUND + 10, rx, 26, Math.floor(p.x0) % 97, 0.05, 20);
      wash(c, '#5f7d94', 0.85);
      ink(c, 2);
      // the sky in it
      c.save();
      c.globalAlpha = 0.5;
      blob(c, cx - rx * 0.25, GROUND + 6, rx * 0.45, 8, 3, 0.1);
      c.fillStyle = '#cfdde6';
      c.fill();
      c.restore();
    }
    // raindrop rings
    c.save();
    c.globalAlpha = 0.6;
    for (let k = 0; k < 3; k++) {
      const ph = (t * 1.3 + k * 0.37 + p.x0 * 0.001) % 1;
      const rx2 = 6 + ph * 34;
      c.beginPath();
      c.ellipse(cx + (k - 1) * rx * 0.5, GROUND + 10, rx2, rx2 * 0.3, 0, 0, Math.PI * 2);
      c.globalAlpha = 0.6 * (1 - ph);
      ink(c, 1.4, '#e8f0f4');
      c.stroke();
    }
    c.restore();
  }

  function drawAwning(c, a, t) {
    const x0 = sx(a.x0);
    const x1 = sx(a.x1);
    if (x1 < -50 || x0 > W + 50) return;
    const y1 = GROUND - AWN_H; // lower edge
    const y0 = y1 - 80;
    // a market stall's awning, on a striped pole at each end
    for (const px of [x0 + 14, x1 - 14]) {
      poly(c, [[px - 6, y0 + 10], [px + 6, y0 + 10], [px + 6, GROUND + 8], [px - 6, GROUND + 8]], Math.floor(px), 0.4);
      wash(c, '#8a6a4a');
      ink(c, 1.8);
    }
    if (drawSprite(c, 'sprites.rainStreet', 2 + a.color, (x0 + x1) / 2, y1 + 6, { w: x1 - x0 + 20 })) return;
    const cols = a.color ? ['#7f9a5a', '#e8e0c8'] : ['#c0607a', '#f2e8d0'];
    const n = Math.max(4, Math.round((x1 - x0) / 60));
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      poly(c, [[x0 + i * w, y0], [x0 + (i + 1) * w, y0], [x0 + (i + 1) * w, y1 - 10], [x0 + i * w, y1 - 10]], i + Math.floor(a.x0), 0.6);
      wash(c, cols[i % 2], 0.9);
    }
    // scalloped edge
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y0);
    c.lineTo(x1, y1 - 10);
    for (let i = n; i > 0; i--) c.arc(x0 + (i - 0.5) * w, y1 - 10, w / 2, 0, Math.PI);
    c.closePath();
    ink(c, 2.2);
    c.stroke();
    for (let i = 0; i < n; i++) {
      c.beginPath();
      c.arc(x0 + (i + 0.5) * w, y1 - 10, w / 2, 0, Math.PI);
      c.fillStyle = cols[i % 2];
      c.fill();
      ink(c, 1.8);
      c.stroke();
    }
    // drips from its edge
    c.fillStyle = '#5f7d94';
    for (let i = 0; i < n; i++) {
      const ph = (t * 1.7 + i * 0.37) % 1;
      c.beginPath();
      c.arc(x0 + (i + 0.5) * w, y1 + 6 + ph * 300, 3, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawChick(c, k, t) {
    const x = sx(k.x);
    if (x < -80 || x > W + 80) return;
    if (k.state === 'dry') {
      // off it flies, dry and pleased
      const fx = x - k.t * 260;
      const fy = GROUND - 30 - k.t * 340;
      if (fy < -60) return;
      if (!drawSprite(c, 'sprites.chicks', 5, fx, fy, { h: 70, anchor: 'center' })) chickStandin(c, fx, fy + 30, k.color, true, t);
      return;
    }
    const shiver = k.state === 'wait' && !env.reduceMotion ? Math.sin(t * 40 + k.x) * 2 : 0;
    if (!drawSprite(c, 'sprites.chicks', 0, x + shiver, GROUND, { h: 70 })) chickStandin(c, x + shiver, GROUND, k.color, false, t);
    if (k.state === 'wait') {
      // a little rain cloud of its own, to show it wants shelter
      blob(c, x, GROUND - 130, 40, 16, 4, 0.1);
      wash(c, '#8a96a2', 0.8);
      ink(c, 1.4);
      c.fillStyle = '#5f7d94';
      for (let i = -1; i <= 1; i++) c.fillRect(x + i * 16, GROUND - 112 + ((t * 120 + i * 13) % 30), 2.5, 9);
    }
  }
  function chickStandin(c, x, y, color, flying, t) {
    blob(c, x, y - 28, 26, 22, 2, 0.08);
    wash(c, color);
    ink(c, 1.8);
    c.beginPath();
    c.arc(x - 12, y - 34, 3.5, 0, Math.PI * 2);
    c.fillStyle = INK;
    c.fill();
    poly(c, [[x - 24, y - 30], [x - 40, y - 26], [x - 24, y - 22]], 1, 0.3);
    wash(c, PAL.ochre);
    ink(c, 1.2);
    if (flying) {
      const f = Math.sin(t * 30) * 12;
      poly(c, [[x, y - 34], [x + 26, y - 50 - f], [x + 18, y - 30]], 2, 0.5);
      wash(c, color);
      ink(c, 1.4);
    } else {
      c.beginPath();
      c.moveTo(x - 6, y - 8);
      c.lineTo(x - 8, y);
      c.moveTo(x + 6, y - 8);
      c.lineTo(x + 8, y);
      ink(c, 1.6);
      c.stroke();
    }
  }

  // The open canopy, drawn over the stand-in until the open pose arrives.
  function canopy(c, cx, cy, r, inside) {
    c.save();
    c.translate(cx, cy);
    if (inside) c.scale(1, -0.7);
    const n = 6;
    c.beginPath();
    c.moveTo(-r, 0);
    c.quadraticCurveTo(-r * 0.95, -r * 0.75, 0, -r * 0.78);
    c.quadraticCurveTo(r * 0.95, -r * 0.75, r, 0);
    for (let i = n; i > 0; i--) {
      const a = -r + ((i - 0.5) * 2 * r) / n;
      c.quadraticCurveTo(a + r / n, -16, a, 0 - 0);
      c.quadraticCurveTo(a - r / n, -16, -r + ((i - 1) * 2 * r) / n, 0);
    }
    c.closePath();
    c.fillStyle = '#2c2c34';
    c.fill();
    ink(c, 2.4);
    c.stroke();
    // ribs and a sheen
    for (let i = 1; i < n; i++) {
      c.beginPath();
      c.moveTo(0, -r * 0.78);
      c.quadraticCurveTo((-r + (i * 2 * r) / n) * 0.8, -r * 0.5, -r + (i * 2 * r) / n, -4);
      ink(c, 1.4, '#6a6a78');
      c.stroke();
    }
    c.beginPath();
    c.moveTo(-r * 0.6, -r * 0.45);
    c.quadraticCurveTo(-r * 0.45, -r * 0.7, -r * 0.1, -r * 0.72);
    ink(c, 4, 'rgba(200,210,230,0.35)');
    c.stroke();
    // the ferrule on top
    c.beginPath();
    c.moveTo(0, -r * 0.78);
    c.lineTo(0, -r * 0.78 - 26);
    ink(c, 4);
    c.stroke();
    c.restore();
  }

  function drawWren(c, t) {
    const feetY = GROUND - g.h;
    const walk = g.grounded && g.speed > 30 ? Math.abs(Math.sin(g.d / 40)) * 6 : 0;
    const shake = g.snagT > 0 && !env.reduceMotion ? Math.sin(g.snagT * 50) * 4 : 0;
    // its shadow on the pavement
    c.save();
    c.globalAlpha = 0.18 * clamp(1 - g.h / 500, 0.3, 1);
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(WREN_X, GROUND + 6, (g.open ? CANOPY_R : 70) * (1 - g.h / 1200), 10, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    const pose = g.snagT > 0 ? 2 : g.open ? (g.grounded ? 1 : 0) : -1;
    c.save();
    c.translate(WREN_X + shake, feetY - walk);
    c.rotate(g.tilt);
    let drawn = false;
    const soaked = g.wet > 1.2 && g.grounded && pose < 0; // just splashed: standing in the puddle, drenched
    if (pose >= 0) drawn = drawSprite(c, 'sprites.wrenPoses', pose, 0, 0, { h: TOP_OPEN, flip: true });
    else if (soaked) drawn = drawSprite(c, 'sprites.wrenSplash', 0, 0, 0, { h: TOP_SHUT, flip: true });
    else drawn = drawSprite(c, 'sprites.wrenWalk', Math.floor(g.d / 90) % 2, 0, 0, { h: TOP_SHUT, flip: true });
    if (!drawn && soaked) c.scale(1.08, 0.9); // the stand-in sags
    if (!drawn) {
      if (g.open) {
        c.beginPath();
        c.moveTo(0, -SIZE * 0.55);
        c.lineTo(0, -TOP_OPEN + 40);
        ink(c, 5, '#3a3a44');
        c.stroke();
        canopy(c, 0, -TOP_OPEN + 52, CANOPY_R, false);
      }
      if (g.snagT > 0) canopy(c, 0, -TOP_SHUT - 20, CANOPY_R * 0.7, true);
      // The portrait stands in a painted puddle: in the air, leave it (and
      // the claws' tips) behind.
      if (!g.grounded) {
        c.save();
        c.beginPath();
        c.rect(-SIZE, -SIZE * 2, SIZE * 2, SIZE * 2 - (52 * SIZE) / 400);
        c.clip();
      }
      drawBird(c, 'wetweatherwren', { x: 0, y: 0, size: SIZE, t, flip: true });
      if (!g.grounded) c.restore();
    }
    c.restore();
    // dripping wet after a splash
    if (g.wet > 0) {
      c.fillStyle = '#4a7ab0';
      for (let i = 0; i < 4; i++) {
        const ph = (t * 1.6 + i * 0.25) % 1;
        c.beginPath();
        c.arc(WREN_X - 50 + i * 30, feetY - 120 + ph * 110, 4, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  // Rain: streaks slanting down, stopped by the open canopy.
  function rain(c, t) {
    const lean = g.gust > 0 ? 0.55 : 0.22;
    const shelter = g.open ? { x0: WREN_X - CANOPY_R, x1: WREN_X + CANOPY_R, y: GROUND - g.h - TOP_OPEN + 20 } : null;
    c.save();
    c.strokeStyle = 'rgba(70,100,130,0.45)';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 120; i++) {
      const sp = 900 + (i % 7) * 60;
      const y = ((i * 97.3 + t * sp) % (H + 80)) - 40;
      let x = (i * 211.7 - t * sp * lean + (g.d * 0.15)) % (W + 200);
      if (x < -100) x += W + 200;
      x -= 100;
      if (shelter && x > shelter.x0 && x < shelter.x1 && y > shelter.y) continue;
      c.moveTo(x, y);
      c.lineTo(x - 22 * lean, y + 26);
    }
    c.stroke();
    c.restore();
  }

  function drawGust(c, t) {
    if (g.gust <= 0) return;
    c.save();
    c.globalAlpha = Math.min(1, g.gust * 2) * 0.7;
    for (let i = 0; i < 6; i++) {
      const y = 180 + i * 70 + Math.sin(t * 3 + i) * 10;
      const x = W - ((t * 900 + i * 300) % (W + 400));
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x + 60, y - 20, x + 120, y + 20, x + 200, y);
      ink(c, 2.4, '#e8eef2');
      c.stroke();
      blob(c, x + 30, y - 6, 9, 5, i, 0.2);
      wash(c, i % 2 ? PAL.ochre : PAL.olive);
    }
    c.restore();
  }

  g.draw = (c, t) => {
    const painted = scene(c, 'wetweatherwren', W, H, standinStreet);
    if (!painted) joints(c);
    else pavement(c);
    for (const p of g.puddles) drawPuddle(c, p, t);
    for (const k of g.chicks) drawChick(c, k, t);
    drawWren(c, t);
    for (const a of g.awnings) drawAwning(c, a, t);
    rain(c, t);
    drawGust(c, t);

    c.fillStyle = '#4a7ab0';
    for (const b of g.bits) {
      c.globalAlpha = clamp(b.life * 2, 0, 1);
      c.beginPath();
      c.arc(b.x, b.y, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    for (const p of g.pops) {
      const k = Math.min(1, (1.2 - p.life) * 8);
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
      label(c, 'Press to pop open and hop · hold to float', W / 2, 150, { size: 38, weight: 600 });
      c.restore();
    } else if (g.elapsed > 13 && g.elapsed < 16.5) {
      c.save();
      c.globalAlpha = Math.min(1, 16.5 - g.elapsed);
      label(c, 'Awnings! Keep the umbrella shut beneath them', W / 2, 150, { size: 36, weight: 600 });
      c.restore();
    }
  };

  // On a narrow screen, keep the Wren near the left with the street ahead.
  g.focus = () => WREN_X + 330;
  g.span = 900;

  return g;
}

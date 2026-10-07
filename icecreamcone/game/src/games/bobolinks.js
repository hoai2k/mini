// Highbutton Bobolinks: Left Foot, Right Foot.
//
// The two boots cross a moonlit stream on stepping stones. The stones come
// toward the boots in two lanes, each marked for the left or the right foot;
// press the matching side to step onto it. A wrong step splashes and the boots
// stumble for a moment. A double stone wants both feet at once (or one quickly
// after the other). The stone you are about to step on slowly sinks, and
// sinks faster as the night goes on: dawdle and it's gone, with a splash.
// Later the stones stop simply alternating, and doubles come more often.
//
// Score: the stones crossed in 40 seconds.

import { drawBird, scene, blob, wash, ink, poly, hatch, label, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

const DURATION = 40;
const STUMBLE = 0.6; // seconds the boots wobble after a splash
const BOTH = 0.15; // seconds to land the second foot of a double
const BOTH_POINTER = 0.3; // more time for touch, where two taps can't be at once
const AHEAD = 9; // stones kept queued

// Layout: an oval night vignette, like the book's round picture.
const OV = { x: 770, y: 468, rx: 650, ry: 418 };
const HORIZON = 318;
const NEAR = 860; // the stone under the boots
const LANE = 160; // half the distance between the lanes, up close
const STRIP = { x: 1500, y: 170, h: 470 };
const PADS = [
  { side: -1, x: 100, y: 790 },
  { side: 1, x: 1500, y: 790 },
];

const COL = { [-1]: '#e8d27a', 1: '#9cc4c8', 0: '#d4a8c8' };

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    stones: [], // the queue; stones[0] is the next one to step on: { side, sink }
    under: { side: -1 }, // the stone the boots stand on
    scroll: 0, // 1 just after a hop, easing back to 0
    hop: 0, // 1 at the start of a hop
    hopSide: 0,
    stumble: 0,
    pending: null, // first foot of a double: { side, t }
    streak: 0,
    best: 0,
    wrong: 0,
    sunk: 0,
    bootX: OV.x,
    sing: 0,
    pops: [],
    drops: [], // splash droplets
    rings: [], // ripples: { x, y, r, life }
    padFlash: { [-1]: 0, 1: 0 },
    shake: 0,
    lastSide: 1,
  };

  // ---------- the stones ----------

  // How fast the target sinks, and how tricky the pattern is, by time.
  const sinkTime = () => lerp(2.4, 1.05, clamp(g.elapsed / DURATION, 0, 1));
  g.sinkTime = sinkTime;

  function addStone() {
    const k = clamp(g.elapsed / DURATION, 0, 1);
    const prev = g.stones.length ? g.stones[g.stones.length - 1] : g.under;
    let side;
    if (g.elapsed > 7 && prev.side !== 0 && rng() < 0.05 + k * 0.17) side = 0;
    else {
      const last = prev.side === 0 ? g.lastSide : prev.side;
      side = rng() < lerp(0.85, 0.5, k) ? -last : last;
      g.lastSide = side;
    }
    g.stones.push({ side, sink: 0, wob: rng() * 6 });
  }
  while (g.stones.length < AHEAD) addStone();

  // ---------- events ----------

  function pop(text, x, y, color = INK, size = 44, tag = '') {
    if (tag) g.pops = g.pops.filter((q) => q.tag !== tag);
    g.pops.push({ x, y, text, color, size, life: 1, tag });
  }

  function splashAt(x, y, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + rng() * 0.8);
      const s = 160 + rng() * 320;
      g.drops.push({ x: x + (rng() - 0.5) * 60, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7 + rng() * 0.4 });
    }
    g.rings.push({ x, y, r: 20, life: 1 });
  }

  function stepOn(side) {
    const s = g.stones.shift();
    g.under = s;
    addStone();
    g.score++;
    g.streak++;
    g.best = Math.max(g.best, g.streak);
    g.scroll = 1;
    g.hop = 1;
    g.hopSide = side;
    g.pending = null;
    sfx('step', { side: side || -1 });
    if (side === 0) sfx('step', { side: 1 });
    const p = stonePos(0, s.side);
    g.rings.push({ x: p.x, y: p.y, r: 30, life: 0.8 });
    if (side === 0) pop('Both feet!', OV.x, NEAR - 290, '#b06a9a', 46, 'judge');
    if (g.streak > 0 && g.streak % 10 === 0) {
      pop(`${g.streak} in a row!`, OV.x, HORIZON + 70, '#e8d27a', 48, 'streak');
      sfx('ding', { pitch: Math.min(12, g.streak / 5) });
      g.sing = 1;
    }
  }

  function splash(why) {
    g.stumble = STUMBLE;
    g.pending = null;
    if (g.streak >= 5) pop('Streak lost', OV.x, HORIZON + 70, PAL.strawberry, 34, 'streak');
    g.streak = 0;
    const p = stonePos(1, g.stones[0].side);
    splashAt(p.x, p.y);
    pop(why, OV.x, NEAR - 290, '#f4ecd8', 54, 'judge');
    sfx('splash');
    env.vibrate?.(80);
    g.shake = env.reduceMotion ? 0 : 0.3;
  }

  // ---------- update ----------

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }
    g.pointer = input.kind === 'pointer';

    let L = !!input.left;
    let R = !!input.right;
    if (L) g.padFlash[-1] = 1;
    if (R) g.padFlash[1] = 1;

    if (g.stumble > 0) {
      g.stumble -= dt;
      L = R = false;
      if (g.stumble <= 0) g.stones[0].sink = 0;
    } else {
      const s = g.stones[0];
      if (s.side === 0) {
        // A double: both on one frame, or the second soon after the first.
        if (L && R) stepOn(0);
        else if (L || R) {
          const side = L ? -1 : 1;
          if (g.pending && g.pending.side !== side) stepOn(0);
          else if (!g.pending) {
            g.pending = { side, t: 0 };
            g.hopSide = side;
          }
        }
        if (g.pending) {
          g.pending.t += dt;
          if (g.pending.t > (g.pointer ? BOTH_POINTER : BOTH)) splash('Both feet!');
        }
      } else if (L && R) splash('One foot!');
      else if (L || R) {
        const side = L ? -1 : 1;
        if (side === s.side) stepOn(side);
        else {
          g.wrong++;
          splash(side < 0 ? 'Wrong foot!' : 'Wrong foot!');
        }
      }
      // The target sinks while you wait.
      if (g.stumble <= 0) {
        const t = g.stones[0];
        t.sink += dt / sinkTime();
        if (t.sink >= 1) {
          g.sunk++;
          const p = stonePos(1, t.side);
          splash('Too slow!');
          // the stone is gone; the next one comes forward
          g.stones.shift();
          addStone();
          g.scroll = 1;
          g.rings.push({ x: p.x, y: p.y, r: 40, life: 1 });
        }
      }
    }

    // Animation.
    g.scroll = approach(g.scroll, 0, 16, dt);
    if (g.scroll < 0.002) g.scroll = 0;
    g.hop = Math.max(0, g.hop - dt / 0.2);
    const target = OV.x + (g.under.side || 0) * 70;
    g.bootX = approach(g.bootX, target, 18, dt);
    g.sing = Math.max(0, g.sing - dt * 0.8);
    g.shake = Math.max(0, g.shake - dt);
    for (const k of [-1, 1]) g.padFlash[k] = Math.max(0, g.padFlash[k] - dt * 4);
    for (const q of g.pops) {
      q.life -= dt * 1.2;
      q.y -= dt * 40;
    }
    g.pops = g.pops.filter((q) => q.life > 0);
    for (const d of g.drops) {
      d.life -= dt;
      d.vy += 900 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    g.drops = g.drops.filter((d) => d.life > 0);
    for (const r of g.rings) {
      r.life -= dt * 1.4;
      r.r += dt * 120;
    }
    g.rings = g.rings.filter((r) => r.life > 0);
  };

  g.hud = () => (g.streak >= 3 ? `Stones ${g.score} · streak ${g.streak}` : `Stones ${g.score}`);
  g.summary = () => {
    const lines = [`Longest run without a splash: ${g.best} stones.`];
    const slips = [];
    if (g.wrong) slips.push(`${g.wrong} wrong step${g.wrong > 1 ? 's' : ''}`);
    if (g.sunk) slips.push(`${g.sunk} stone${g.sunk > 1 ? 's' : ''} sank`);
    lines.push(slips.length ? slips.join(', ') + '.' : 'Not a single splash!');
    return lines;
  };

  // ---------- drawing ----------

  // Where stone `d` of the path is: d = 0 under the boots, 1 the next...
  function stonePos(d, side) {
    const s = 1 / (1 + Math.max(-0.6, d) * 0.5);
    const y = HORIZON + (NEAR - HORIZON) * s;
    // the path drifts a little left and right with distance, like a real ford
    const drift = Math.sin(d * 0.9 + 1) * 40 * (1 - s);
    return { x: OV.x + drift + (side || 0) * LANE * s, y, s };
  }

  function drawStone(c, st, d, isNext, t) {
    const p = stonePos(d, st.side);
    if (p.y < HORIZON - 4) return;
    const sink = isNext ? st.sink : 0;
    const wide = st.side === 0;
    const rx = (wide ? 250 : 112) * p.s;
    const ry = 40 * p.s;
    const bob = Math.sin(t * 2 + st.wob) * 2 * p.s;
    const y = p.y + bob + sink * 22 * p.s;
    const alpha = clamp((p.y - HORIZON) / 60, 0, 1);
    c.save();
    c.globalAlpha = alpha;
    // the water dark around it
    c.fillStyle = 'rgba(10,16,30,0.35)';
    c.beginPath();
    c.ellipse(p.x, y + ry * 0.5, rx * 1.12, ry * 0.9, 0, 0, Math.PI * 2);
    c.fill();
    // the stone: a lumpy top and a darker side
    blob(c, p.x, y + ry * 0.35, rx, ry * 1.05, st.wob * 10, 0.05, 18);
    wash(c, '#4a5060', 1);
    ink(c, 2 * p.s + 0.6, '#14181f');
    blob(c, p.x, y, rx * 0.96, ry, st.wob * 10 + 3, 0.05, 18);
    wash(c, COL[st.side], 1);
    ink(c, 2.2 * p.s + 0.6, '#14181f');
    blob(c, p.x, y, rx * 0.96, ry, st.wob * 10 + 3, 0.05, 18);
    hatch(c, p.x - rx, y - ry, p.x + rx, y + ry, 8, 0.12);
    // the sinking water line creeping over the stone
    if (sink > 0.05) {
      c.save();
      c.globalAlpha = alpha * Math.min(0.8, sink);
      c.beginPath();
      c.ellipse(p.x, y + ry * 0.2, rx * 1.05, ry * (0.3 + sink), 0, 0, Math.PI * 2);
      c.fillStyle = '#2c4468';
      c.fill();
      c.restore();
    }
    // the mark: an arrow (or two) and a letter
    const k = p.s * (isNext ? 1.15 : 1);
    const mark = (dir, mx) => {
      c.save();
      c.translate(mx, y);
      c.scale(k, k * 0.55);
      poly(c, [[dir * 46, 0], [dir * 6, -30], [dir * 6, -13], [-dir * 34, -13], [-dir * 34, 13], [dir * 6, 13], [dir * 6, 30]], 3, 0.8);
      c.fillStyle = '#2a2a36';
      c.fill();
      c.restore();
    };
    if (wide) {
      mark(-1, p.x - rx * 0.45);
      mark(1, p.x + rx * 0.45);
      label(c, 'BOTH', p.x, y - 2, { size: Math.max(12, 34 * k), color: '#2a2a36', weight: 800 });
    } else mark(st.side, p.x);
    if (isNext) {
      // the target: a pale ring, and a shrinking arc for the time left
      c.beginPath();
      c.ellipse(p.x, y, rx * 1.18, ry * 1.45, 0, 0, Math.PI * 2);
      ink(c, 3, 'rgba(250,240,200,0.7)');
      c.beginPath();
      c.ellipse(p.x, y, rx * 1.18, ry * 1.45, 0, -Math.PI / 2, -Math.PI / 2 + (1 - sink) * Math.PI * 2);
      ink(c, 6, sink > 0.65 ? '#f08a6a' : '#f4e8b8');
    }
    c.restore();
  }

  function drawNight(c, t) {
    // paper, then the oval night vignette
    c.save();
    c.beginPath();
    c.ellipse(OV.x, OV.y, OV.rx, OV.ry, 0, 0, Math.PI * 2);
    c.clip();
    const sky = c.createLinearGradient(0, OV.y - OV.ry, 0, HORIZON);
    sky.addColorStop(0, '#1a2130');
    sky.addColorStop(1, '#2c3a50');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, HORIZON + 10);
    // stars
    c.fillStyle = 'rgba(250,240,200,0.6)';
    for (let i = 0; i < 26; i++) {
      const sx = 200 + ((i * 397) % 1150);
      const sy = 70 + ((i * 131) % 200);
      const tw = 1.2 + Math.sin(t * 1.3 + i) * 0.6;
      c.fillRect(sx, sy, tw, tw);
    }
    // the small moon, top right
    const mx = 1080;
    const my = 150;
    const glow = c.createRadialGradient(mx, my, 10, mx, my, 120);
    glow.addColorStop(0, 'rgba(250,236,150,0.45)');
    glow.addColorStop(1, 'rgba(250,236,150,0)');
    c.fillStyle = glow;
    c.fillRect(mx - 130, my - 130, 260, 260);
    blob(c, mx, my, 30, 30, 5, 0.03);
    wash(c, '#f2e08a', 1);
    ink(c, 1.5, '#8a7a3a');
    // the water
    const water = c.createLinearGradient(0, HORIZON, 0, OV.y + OV.ry);
    water.addColorStop(0, '#2a3c58');
    water.addColorStop(1, '#16223a');
    c.fillStyle = water;
    c.fillRect(0, HORIZON, W, H);
    // moonlight on the water, and ripples drifting by with the current
    c.save();
    for (let i = 0; i < 40; i++) {
      const row = i / 40;
      const y = HORIZON + 10 + Math.pow(row, 1.6) * 560;
      const s = 0.3 + row;
      const x = ((i * 233 + t * (30 + row * 90)) % 1500) + 20;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 40 * s, y);
      ink(c, 1.5 * s, 'rgba(180,200,230,0.18)');
    }
    for (let i = 0; i < 14; i++) {
      const y = HORIZON + 8 + i * 24 + i * i * 1.2;
      const w = 20 + i * 6 + Math.sin(t * 2 + i) * 8;
      c.beginPath();
      c.moveTo(mx - w + Math.sin(t + i) * 10, y);
      c.lineTo(mx + w + Math.sin(t + i) * 10, y);
      ink(c, 2 + i * 0.3, `rgba(242,224,138,${0.35 - i * 0.02})`);
    }
    c.restore();
    // the far bank: a dark line of bushes and reeds
    blob(c, 300, HORIZON + 2, 420, 34, 1, 0.08, 20);
    c.fillStyle = '#141a22';
    c.fill();
    blob(c, 1150, HORIZON, 380, 26, 2, 0.08, 20);
    c.fill();
    c.fillRect(0, HORIZON - 8, W, 14);
    reeds(c, t, 160, 500, HORIZON + 8, 0.7, 1);
    reeds(c, t, 1180, 1420, HORIZON + 6, 0.6, 2);
    // near reeds at the sides
    reeds(c, t, 120, 330, 850, 1.6, 3);
    reeds(c, t, 1220, 1420, 850, 1.6, 4);
    c.restore();
    // the vignette's edge, like a watercolour circle
    c.beginPath();
    c.ellipse(OV.x, OV.y, OV.rx, OV.ry, 0, 0, Math.PI * 2);
    c.save();
    c.globalAlpha = 0.6;
    ink(c, 10, 'rgba(36,48,63,0.4)');
    c.restore();
    ink(c, 2.6);
  }

  function reeds(c, t, x0, x1, base, s, seed) {
    for (let i = 0; i < 9; i++) {
      const x = x0 + ((x1 - x0) * i) / 8 + Math.sin(seed * 9 + i * 3) * 12;
      const h = (60 + ((i * 37 + seed * 11) % 50)) * s;
      const sway = Math.sin(t * 0.8 + i + seed) * 6 * s;
      c.beginPath();
      c.moveTo(x, base);
      c.quadraticCurveTo(x + sway * 0.3, base - h * 0.6, x + sway, base - h);
      ink(c, 2.2 * s, '#0e1218');
      if (i % 3 === 1) {
        blob(c, x + sway, base - h - 8 * s, 4 * s, 12 * s, i + seed, 0.05, 8);
        c.fillStyle = '#2a2018';
        c.fill();
      }
    }
  }

  function drawPads(c) {
    // the left and right foot buttons, at the paper's corners
    for (const p of PADS) {
      const f = g.padFlash[p.side];
      const r = 74 + f * 8;
      blob(c, p.x, p.y, r, r, p.side + 3, 0.04, 18);
      wash(c, f > 0 ? '#f0d890' : COL[p.side], 0.85);
      ink(c, 2.6);
      c.save();
      c.translate(p.x, p.y - 12);
      c.scale(1.2, 0.95);
      poly(c, [[p.side * 46, 0], [p.side * 6, -30], [p.side * 6, -13], [-p.side * 34, -13], [-p.side * 34, 13], [p.side * 6, 13], [p.side * 6, 30]], 3, 0.8);
      c.fillStyle = '#2a2a36';
      c.fill();
      c.restore();
      label(c, p.side < 0 ? 'Left' : 'Right', p.x, p.y + 40, { size: 26, weight: 800 });
    }
  }

  function drawStrip(c) {
    // progress across the stream, with the medal marks
    const max = Math.max(120, g.score + 10);
    const { x, y, h } = STRIP;
    const yAt = (v) => y + h - (h * Math.min(v, max)) / max;
    label(c, 'Far bank', x, y - 36, { size: 22, weight: 700 });
    poly(c, [[x - 12, y], [x + 12, y], [x + 12, y + h], [x - 12, y + h]], 9, 1);
    wash(c, '#9ab0c8', 0.6);
    ink(c, 2.2);
    poly(c, [[x - 12, yAt(g.score)], [x + 12, yAt(g.score)], [x + 12, y + h], [x - 12, y + h]], 10, 0.6);
    wash(c, PAL.mauve, 0.9);
    ink(c, 1.4);
    const medals = [[45, '#c08a5a'], [75, '#b0b0b8'], [105, '#e0b840']];
    for (const [v, col] of medals) {
      const my = yAt(v);
      c.beginPath();
      c.moveTo(x - 20, my);
      c.lineTo(x + 20, my);
      ink(c, 2);
      c.beginPath();
      c.arc(x - 34, my, 10, 0, Math.PI * 2);
      c.fillStyle = g.score >= v ? col : 'rgba(250,244,228,0.9)';
      c.fill();
      ink(c, 1.8, col);
    }
    // a little boot marker
    const by = yAt(g.score);
    blob(c, x + 28, by, 14, 10, 4, 0.05, 10);
    wash(c, PAL.mauve, 1);
    ink(c, 1.8);
    label(c, String(g.score), x + 6, y + h + 30, { size: 34, weight: 800 });
  }

  g.draw = (c, t) => {
    const shake = g.shake > 0 ? Math.sin(t * 70) * 10 * g.shake : 0;
    scene(c, 'bobolinks', W, H, () => {});
    c.save();
    c.translate(shake, 0);
    drawNight(c, t);

    c.save();
    c.beginPath();
    c.ellipse(OV.x, OV.y, OV.rx, OV.ry, 0, 0, Math.PI * 2);
    c.clip();
    // the stones, far to near; the one under the boots, then the queue
    for (let i = g.stones.length - 1; i >= 0; i--) drawStone(c, g.stones[i], i + 1 + g.scroll, i === 0, t);
    drawStone(c, g.under, g.scroll, false, t);
    for (const r of g.rings) {
      c.save();
      c.globalAlpha = r.life * 0.7;
      c.beginPath();
      c.ellipse(r.x, r.y, r.r * 1.6, r.r * 0.5, 0, 0, Math.PI * 2);
      ink(c, 2.5, '#c8d8f0');
      c.restore();
    }

    // the boots
    const under = stonePos(g.scroll, g.under.side);
    const lift = g.hop > 0 ? (g.hopSide || 0) : g.pending ? g.pending.side : 0;
    const hopY = g.hop > 0 ? -Math.sin(Math.PI * g.hop) * 46 : 0;
    const wobble = g.stumble > 0 && !env.reduceMotion ? Math.sin(g.stumble * 40) * 0.08 : 0;
    drawBird(c, 'bobolinks', { x: g.bootX, y: Math.min(under.y, NEAR) - 4 + hopY, size: 330, t, rot: wobble, pose: { lift, sing: Math.max(g.sing, g.stumble > 0 ? 0 : 0) } });
    for (const d of g.drops) {
      c.save();
      c.globalAlpha = clamp(d.life * 1.5, 0, 1);
      c.beginPath();
      c.ellipse(d.x, d.y, 5, 8, Math.atan2(d.vy, d.vx) + Math.PI / 2, 0, Math.PI * 2);
      c.fillStyle = '#b8d0f0';
      c.fill();
      c.restore();
    }
    c.restore();
    c.restore();

    drawPads(c);
    drawStrip(c);

    for (const q of g.pops) {
      c.save();
      c.globalAlpha = clamp(q.life * 2, 0, 1);
      const s = 1 + Math.max(0, q.life - 0.85) * 2;
      c.translate(q.x, q.y);
      c.scale(s, s);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(20,26,36,0.85)';
      c.font = `800 ${q.size}px Fraunces, Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeText(q.text, 0, 0);
      label(c, q.text, 0, 0, { size: q.size, color: q.color, weight: 800 });
      c.restore();
    }
    // the next step, said out loud for the first few stones
    if (g.score < 4 && g.stumble <= 0) {
      const s = g.stones[0].side;
      label(c, s === 0 ? 'Both feet!' : s < 0 ? 'Left foot!' : 'Right foot!', OV.x, HORIZON + 70, { size: 40, color: '#f4ecd8', weight: 800 });
    }
  };

  return g;
}

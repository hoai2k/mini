// Garbage Canary: Bin Day.
//
// A windy street on bin day. The Garbage Canary stands on the pavement, a
// dustbin with a canary peering out from under its lid, and the wind blows
// all sorts of things down the street towards it. Hold the action to lift
// the lid: rubbish that reaches the bin while the lid is up goes in (+1).
// But not everything is rubbish: a cat, a gentleman's hat, a letter, a
// sparrow. Anything that isn't must find the lid shut, so it bumps over the
// top and goes on its way; swallow one and the Canary splutters it out (−1)
// and can't open its lid for a moment.
// Rubbish that finds the lid shut blows past and is lost. Every five in a row
// without a slip earns a bonus that grows with the run (+1 at five, +2 at
// ten, ...). Things come faster and closer together as time goes on, more
// of them aren't rubbish (often hard on rubbish's heels), and gusts hurry
// some along.
// Score: points.

import { drawBird, drawSprite, scene, art, SHEETS, band, blob, poly, wash, ink, hatch, label, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  // paper ball, banana peel, tin can, apple core, fish bone; hat, letter, cat, sparrow, old boot
  'sprites.garbageItems': [5, 2],
  // the bin without its lid; the lid with the canary's head under it (same placement)
  'sprites.garbagecanaryLid': [2, 1],
  // the lid piece again, the canary squawking (spitting something out); singing (a run)
  'sprites.garbagecanaryCall': [2, 1],
});

const DURATION = 45;
const PAVE = 770; // the pavement, where the bin's feet stand
const BIN_X = 470;
const SIZE = 330;
const K = SIZE / 400;
const RIM_Y = PAVE - 250 * K; // the bin's open top
const MOUTH_Y = RIM_Y - 18; // the height things cross at
const CROSS_X = BIN_X + 80; // where something meets the bin's front rim
const HINGE = [BIN_X - 92 * K, RIM_Y]; // the lid hinges at the back
const OPEN_ANGLE = 1.15;
const JAM = 0.9; // seconds the lid stays shut after swallowing something that isn't rubbish
const BIG = 1.3; // things on the wind are drawn this much bigger than their base size

// What blows down the street. `rub`: rubbish. `move`: how it travels.
const KINDS = {
  paper: { rub: true, move: 'flutter', col: '#efe6cc', i: 0, name: 'paper' },
  peel: { rub: true, move: 'flutter', col: PAL.lemon, i: 1, name: 'banana peel' },
  tin: { rub: true, move: 'bounce', col: '#a8aeb0', i: 2, name: 'tin' },
  core: { rub: true, move: 'bounce', col: '#d8c890', i: 3, name: 'apple core' },
  fishbone: { rub: true, move: 'flutter', col: '#e8e0d0', i: 4, name: 'fish bones' },
  boot: { rub: true, move: 'bounce', col: '#7a5a3a', i: 9, name: 'old boot' },
  hat: { rub: false, move: 'flutter', col: '#3a3030', i: 5, name: 'hat' },
  letter: { rub: false, move: 'flutter', col: '#f6f0e0', i: 6, name: 'letter' },
  cat: { rub: false, move: 'leap', col: PAL.orange, i: 7, name: 'cat' },
  sparrow: { rub: false, move: 'fly', col: '#a07a50', i: 8, name: 'sparrow' },
};
const RUBBISH = ['paper', 'peel', 'tin', 'core', 'fishbone', 'boot'];
const KEEP = ['hat', 'letter', 'cat', 'sparrow'];

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    open: 0, // the lid, 0 shut .. 1 up
    holding: false,
    items: [],
    pops: [],
    litter: [], // missed rubbish left lying in the gutter
    wind: [], // streaks
    spawnT: 1.2,
    streak: 0,
    binned: 0,
    swallowed: 0,
    missed: 0,
    letPast: 0,
    gulp: 0,
    spit: 0,
    lastKeep: false,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  function pop(text, x, y, color = INK, size = 44) {
    // stack above any pop still showing nearby, rather than on top of it
    while (g.pops.some((p) => p.life > 0.5 && Math.abs(p.x - x) < 160 && Math.abs(p.y - y) < size)) y -= size;
    g.pops.push({ text, x, y, color, size, life: 1.2 });
  }
  const add = (n) => {
    g.score = Math.max(0, g.score + n);
  };

  function spawn() {
    const p = progress();
    // the first one is always rubbish; never three keepers in a row
    const keepChance = g.items.length === 0 && g.binned + g.missed === 0 ? 0 : lerp(0.22, 0.45, p);
    let keep = g.forceKeep || rng() < keepChance;
    if (g.lastKeep && keep && !g.forceKeep && rng() < 0.5) keep = false;
    g.forceKeep = false;
    g.lastKeep = keep;
    const kind = keep ? KEEP[Math.floor(rng() * KEEP.length)] : RUBBISH[Math.floor(rng() * RUBBISH.length)];
    const k = KINDS[kind];
    let speed = lerp(330, 560, p) * (0.9 + rng() * 0.2) * (kind === 'cat' ? 0.85 : 1);
    // never catch up with the one in front: arrive at least half a second after it
    const prev = g.coming().pop();
    if (prev) {
      const dist = W + 80 - CROSS_X;
      const after = g.eta(prev) + 0.5;
      if (dist / speed < after) speed = dist / after;
    }
    // later, a gust may hurry it along part of the way
    const gust = g.elapsed > 14 && rng() < lerp(0.1, 0.4, p) ? 1100 - rng() * 300 : null;
    g.items.push({
      kind,
      rub: k.rub,
      x: W + 80,
      y: MOUTH_Y,
      vx: -speed,
      t: 0,
      phase: rng() * 6,
      amp: 50 + rng() * 70,
      hop: 220 + rng() * 140,
      gust,
      gusted: false,
      state: 'come', // 'come' | 'in' | 'over' | 'spat'
      rot: 0,
      spin: (rng() - 0.5) * 4,
      vy: 0,
      life: 0,
    });
    let gap = lerp(1.5, 0.6, p) * (0.75 + rng() * 0.5);
    // later, something that isn't rubbish often follows hard on rubbish's heels
    if (!keep && g.elapsed > 10 && rng() < lerp(0.2, 0.5, p)) {
      gap = lerp(0.65, 0.5, p);
      g.forceKeep = true;
    }
    g.spawnT = Math.max(0.5, gap);
  }

  // Where it is on its way to the bin: its height at x.
  function pathY(it) {
    const k = KINDS[it.kind];
    const dx = it.x - CROSS_X;
    const fade = clamp((dx - 40) / 600, 0, 1);
    if (k.move === 'flutter') return MOUTH_Y + Math.sin(it.phase + it.t * 3.2) * it.amp * fade - 10 * fade;
    if (k.move === 'fly') return MOUTH_Y - 30 * fade + Math.sin(it.phase + it.t * 9) * 12 * fade;
    if (k.move === 'bounce') return MOUTH_Y - Math.abs(Math.sin((Math.PI * dx) / it.hop)) * 110 * Math.min(1, fade + 0.6);
    // the cat trots along the pavement, then leaps over the bin
    const r = 260;
    if (dx > r) return PAVE - 10;
    const top = PAVE - 10 - (MOUTH_Y - 20);
    return PAVE - 10 - top * (1 - (dx / r) * (dx / r)) * 1.0;
  }

  // Bot and test helpers: things still to come, nearest first, and how soon
  // each reaches the bin.
  g.coming = () => g.items.filter((it) => it.state === 'come').sort((a, b) => a.x - b.x);
  g.eta = (it) => (it.x - CROSS_X) / -it.vx;

  function arrive(it) {
    const open = g.open > 0.55;
    if (open && it.rub) {
      it.state = 'in';
      it.life = 0.35;
      g.binned++;
      g.streak++;
      add(1);
      g.gulp = 0.25;
      sfx('catch', { pitch: Math.min(12, g.streak) });
      pop('+1', BIN_X, RIM_Y - 120, PAL.green, 44);
      if (g.streak % 5 === 0) {
        // the bonus grows with the run: +1 at five, +2 at ten, ...
        const b = g.streak / 5;
        add(b);
        sfx('bloom');
        g.sing = 0.8;
        pop(`${g.streak} in a row!  +${b}`, BIN_X + 60, RIM_Y - 180, PAL.magenta, 46);
      }
    } else if (open) {
      // swallowed something that wasn't rubbish: spit it out
      it.state = 'spat';
      it.vx = -260 - rng() * 80;
      it.vy = -680;
      it.x = BIN_X;
      it.y = RIM_Y - 10;
      g.swallowed++;
      g.streak = 0;
      add(-1);
      g.spit = 0.5;
      g.jam = JAM;
      sfx('squawk');
      env.vibrate?.(120);
      pop(`Not rubbish!  −1`, BIN_X + 40, RIM_Y - 150, PAL.brick, 46);
    } else {
      // the lid's shut: over the top it goes
      it.state = 'over';
      it.vy = it.kind === 'cat' ? -200 : -380;
      it.vx = Math.min(it.vx, -300);
      sfx(it.rub ? 'bonk' : 'tick');
      if (it.rub) {
        g.missed++;
        g.streak = 0;
        pop('Missed', BIN_X + 30, RIM_Y - 110, PAL.slate, 36);
      } else {
        g.letPast++;
        if (it.kind === 'cat') sfx('ding', { pitch: -5 });
      }
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

    // The lid: up while the action is held.
    const was = g.holding;
    g.holding = !!input.action;
    if (g.holding && !was) sfx('switch');
    // spluttering after a swallow, the lid stays shut for a moment
    g.jam = Math.max(0, (g.jam || 0) - dt);
    g.open = clamp(g.open + (g.holding && g.jam <= 0 ? 9 : -12) * dt, 0, 1);
    g.gulp = Math.max(0, g.gulp - dt);
    g.spit = Math.max(0, g.spit - dt);
    g.sing = Math.max(0, (g.sing || 0) - dt);

    g.spawnT -= dt;
    if (g.spawnT <= 0) spawn();

    for (const it of g.items) {
      it.t += dt;
      it.rot += it.spin * dt;
      if (it.state === 'come') {
        if (it.gust && !it.gusted && it.x < it.gust) {
          it.gusted = true;
          // a gust hurries it, but never to within half a second of the one ahead
          const ahead = g.items.filter((o) => o !== it && o.state === 'come' && o.x < it.x).sort((p, q) => q.x - p.x)[0];
          let vx = it.vx * 1.55;
          if (ahead) {
            const soonest = g.eta(ahead) + 0.5;
            if ((it.x - CROSS_X) / -vx < soonest) vx = Math.max(vx, -(it.x - CROSS_X) / soonest);
          }
          it.vx = Math.min(it.vx, vx);
          for (let i = 0; i < 3; i++) g.wind.push({ x: it.x + 40 + i * 30, y: it.y - 40 + i * 30, life: 0.6 });
        }
        const px = it.x;
        it.x += it.vx * dt;
        it.y = pathY(it);
        if (px > CROSS_X && it.x <= CROSS_X) arrive(it);
      } else if (it.state === 'in') {
        // dropping into the bin
        it.x = approach(it.x, BIN_X, 10, dt);
        it.y += 500 * dt;
        it.life -= dt;
        if (it.life <= 0) it.dead = true;
      } else {
        it.vy += 1500 * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        const floor = it.kind === 'cat' || it.kind === 'boot' || it.kind === 'tin' ? PAVE - 10 : PAVE + 30;
        if (it.kind === 'sparrow') {
          it.vy = Math.min(it.vy, -40);
        } else if (it.y > floor) {
          it.y = floor;
          it.vy = -Math.abs(it.vy) * 0.3;
          if (it.state === 'over' && it.rub && !it.landed) {
            it.landed = true;
            g.litter.push({ kind: it.kind, x: it.x - 60 - rng() * 120, rot: rng() * 6 });
            if (g.litter.length > 8) g.litter.shift();
          }
        }
        if (it.x < -120 || it.y < -150) it.dead = true;
      }
    }
    g.items = g.items.filter((it) => !it.dead);

    if (rng() < dt * 1.5) g.wind.push({ x: W + 20, y: 140 + rng() * 520, life: 2.2 });
    for (const w of g.wind) {
      w.x -= 900 * dt;
      w.life -= dt;
    }
    g.wind = g.wind.filter((w) => w.life > 0);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Points ${g.score}${g.streak >= 2 ? ` · ${g.streak} in a row` : ''}`;
  g.summary = () => {
    const lines = [`${g.binned} bit${g.binned === 1 ? '' : 's'} of rubbish in the bin.`];
    if (g.swallowed) lines.push(g.swallowed === 1 ? '1 thing swallowed that wasn’t rubbish.' : `${g.swallowed} things swallowed that weren’t rubbish.`);
    else lines.push('Nothing swallowed that wasn’t rubbish!');
    return lines;
  };

  // ---------- drawing ----------

  function drawItem(c, it, x, y, rot) {
    const k = KINDS[it.kind];
    c.save();
    c.translate(x, y);
    const flap = it.kind === 'sparrow' || it.kind === 'cat';
    if (!flap) c.rotate(rot);
    const h = (it.kind === 'cat' ? 92 : it.kind === 'sparrow' ? 56 : it.kind === 'letter' ? 52 : 64) * BIG;
    if (!k.rub && it.state !== 'in') {
      // the shared cue for "not rubbish, keep the lid shut": a soft gold glow
      // and a twinkle
      const r = h * 0.85;
      const grd = c.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
      grd.addColorStop(0, 'rgba(255,226,120,0.55)');
      grd.addColorStop(1, 'rgba(255,226,120,0)');
      c.fillStyle = grd;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ink(c, 3, 'rgba(201,150,42,0.7)');
      c.stroke();
      const tw = 0.6 + 0.4 * Math.sin((it.t || 0) * 9);
      c.save();
      c.translate(r * 0.62, -r * 0.62);
      c.scale(tw, tw);
      c.beginPath();
      c.moveTo(0, -12);
      c.lineTo(3, -3);
      c.lineTo(12, 0);
      c.lineTo(3, 3);
      c.lineTo(0, 12);
      c.lineTo(-3, 3);
      c.lineTo(-12, 0);
      c.lineTo(-3, -3);
      c.closePath();
      c.fillStyle = '#e8b830';
      c.fill();
      c.restore();
    }
    if (!drawSprite(c, 'sprites.garbageItems', k.i, 0, 0, { h, anchor: 'center' })) {
      c.scale(BIG, BIG);
      drawItemStandin(c, it, k);
    }
    c.restore();
  }

  function drawItemStandin(c, it, k) {
    const kind = it.kind;
    if (kind === 'paper') {
      blob(c, 0, 0, 30, 27, 3, 0.22, 12);
      wash(c, k.col);
      ink(c, 2);
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(-18 + i * 10, -14);
        c.lineTo(-8 + i * 12, 12);
        ink(c, 1);
        c.stroke();
      }
    } else if (kind === 'peel') {
      for (const a of [-0.9, 0, 0.9]) {
        c.save();
        c.rotate(a);
        blob(c, 0, -20, 9, 26, a * 10 + 4, 0.1, 10);
        wash(c, k.col);
        ink(c, 1.8);
        c.restore();
      }
      blob(c, 0, 4, 10, 10, 5, 0.1, 8);
      wash(c, '#8a6a3a');
    } else if (kind === 'tin') {
      poly(c, [[-22, -30], [22, -30], [22, 30], [-22, 30]], 6, 1);
      wash(c, k.col);
      ink(c, 2.2);
      c.fillStyle = PAL.brick;
      c.fillRect(-22, -12, 44, 22);
      hatch(c, -22, -30, 22, 30, 8, 0.2, 1);
    } else if (kind === 'core') {
      blob(c, 0, -22, 22, 12, 7, 0.1);
      wash(c, PAL.brick);
      ink(c, 1.8);
      blob(c, 0, 0, 12, 18, 8, 0.1);
      wash(c, k.col);
      ink(c, 1.8);
      blob(c, 0, 22, 20, 11, 9, 0.1);
      wash(c, PAL.brick);
      ink(c, 1.8);
    } else if (kind === 'fishbone') {
      c.beginPath();
      c.moveTo(-34, 0);
      c.lineTo(28, 0);
      for (let i = -20; i <= 16; i += 9) {
        c.moveTo(i, -14);
        c.lineTo(i + 5, 0);
        c.lineTo(i, 14);
      }
      ink(c, 2.4, '#7a7060');
      c.stroke();
      blob(c, -36, 0, 13, 11, 10, 0.1);
      wash(c, k.col);
      ink(c, 1.8);
      poly(c, [[28, 0], [44, -14], [44, 14]], 11, 1);
      wash(c, k.col);
      ink(c, 1.8);
    } else if (kind === 'boot') {
      poly(c, [[-14, -32], [14, -32], [14, 12], [36, 16], [36, 30], [-18, 30]], 12, 1.5);
      wash(c, k.col);
      ink(c, 2.2);
      hatch(c, -18, -32, 36, 30, 9, 0.25, 2);
      // a hole in the toe
      c.beginPath();
      c.ellipse(28, 22, 6, 4, 0, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
    } else if (kind === 'hat') {
      poly(c, [[-22, -34], [22, -34], [24, 10], [-24, 10]], 13, 1);
      wash(c, k.col);
      ink(c, 2.2);
      c.fillStyle = PAL.mauve;
      c.fillRect(-24, -2, 48, 10);
      blob(c, 0, 12, 42, 7, 14, 0.04);
      wash(c, k.col);
      ink(c, 2);
    } else if (kind === 'letter') {
      poly(c, [[-34, -22], [34, -22], [34, 22], [-34, 22]], 15, 1);
      wash(c, k.col);
      ink(c, 2.2);
      c.beginPath();
      c.moveTo(-34, -22);
      c.lineTo(0, 4);
      c.lineTo(34, -22);
      ink(c, 1.6);
      c.stroke();
      c.fillStyle = PAL.strawberry;
      c.fillRect(16, -18, 13, 15);
      c.beginPath();
      c.arc(0, 6, 6, 0, Math.PI * 2);
      c.fillStyle = PAL.brick;
      c.fill();
    } else if (kind === 'cat') {
      // a ginger cat, leaping, facing left
      const leg = Math.sin(it.t * 14) * 8;
      blob(c, 6, 0, 42, 22, 16, 0.05);
      wash(c, k.col);
      ink(c, 2.2);
      hatch(c, -30, -20, 46, 20, 10, 0.2, 2);
      blob(c, -38, -16, 18, 16, 17, 0.05);
      wash(c, k.col);
      ink(c, 2.2);
      poly(c, [[-50, -28], [-46, -44], [-38, -30]], 18, 0.5);
      wash(c, k.col);
      ink(c, 1.6);
      poly(c, [[-34, -30], [-28, -46], [-24, -28]], 19, 0.5);
      wash(c, k.col);
      ink(c, 1.6);
      c.beginPath();
      c.arc(-44, -18, 3, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
      c.beginPath();
      c.moveTo(-20, 16);
      c.lineTo(-26 - leg, 34);
      c.moveTo(28, 16);
      c.lineTo(34 + leg, 34);
      c.moveTo(46, -4);
      c.quadraticCurveTo(70, -30, 62, -44);
      ink(c, 4, '#c07a30');
      c.stroke();
    } else if (kind === 'sparrow') {
      const flap = Math.sin(it.t * 22);
      blob(c, 0, 0, 22, 16, 20, 0.05);
      wash(c, k.col);
      ink(c, 2);
      blob(c, -20, -10, 11, 10, 21, 0.05);
      wash(c, k.col);
      ink(c, 1.8);
      c.beginPath();
      c.arc(-23, -12, 2.5, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
      poly(c, [[-30, -8], [-42, -6], [-30, -4]], 22, 0.3);
      wash(c, PAL.ochre);
      poly(c, [[-2, -6], [20, -6 - 26 * flap], [14, 0]], 23, 0.5);
      wash(c, '#7a5a3a');
      ink(c, 1.6);
    }
  }

  // The stand-in canary's head, larger than the stand-in drawing's, peeping
  // out under the lid's front edge and watching whatever comes next.
  function drawHead(c, shake) {
    const x = BIN_X + 58 * K + shake;
    const y = RIM_Y - 30;
    const next = g.coming()[0];
    const tx = next ? next.x : W;
    const ty = next ? next.y : MOUTH_Y;
    const a = Math.atan2(ty - y, tx - x);
    blob(c, x, y, 40, 34, 7, 0.05);
    wash(c, '#f2d24a');
    ink(c, 2.4);
    hatch(c, x - 40, y - 34, x + 40, y + 34, 10, 0.15, 2);
    // the beak points into the wind, open while squawking or singing
    const open = g.spit > 0 || g.sing > 0 ? 9 : 2;
    poly(c, [[x + 30, y - 4 - open], [x + 74, y + 2], [x + 30, y + 8 + open]], 3, 0.6);
    wash(c, PAL.ochre);
    ink(c, 2);
    // a round staring eye, its pupil following the next thing on the wind
    const ex = x + 12;
    const ey = y - 10;
    c.beginPath();
    c.arc(ex, ey, 13, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
    ink(c, 2);
    c.stroke();
    c.beginPath();
    c.arc(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6, 5, 0, Math.PI * 2);
    c.fillStyle = INK;
    c.fill();
    // a little crest
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(x - 10 + i * 8, y - 32);
      c.quadraticCurveTo(x - 22 + i * 6, y - 56, x - 34 + i * 8, y - 52);
      ink(c, 2.4, '#c9a42a');
      c.stroke();
    }
  }

  // The Canary: the bin's body, then its lid (with the canary's head under
  // it) hinged up at the back. Faces right, into the wind.
  function drawCanary(c, t) {
    const a = g.open * OPEN_ANGLE + (g.spit > 0 ? Math.sin(g.spit * 40) * 0.08 : 0);
    const shake = g.gulp > 0 && !env.reduceMotion ? Math.sin(g.gulp * 60) * 3 : 0;
    const [hx, hy] = HINGE;
    const lidSheet = 'sprites.garbagecanaryLid';
    // the dark open mouth
    if (g.open > 0.05) {
      c.save();
      c.beginPath();
      c.ellipse(BIN_X, RIM_Y + 4, 92 * K, 18 * g.open + 4, 0, 0, Math.PI * 2);
      c.fillStyle = '#2a2420';
      c.fill();
      c.restore();
    }
    const body = () => {
      if (!drawSprite(c, lidSheet, 0, BIN_X + shake, PAVE + 0.074 * SIZE, { h: 1.05 * SIZE, whole: true, flip: true })) {
        c.save();
        c.beginPath();
        c.rect(BIN_X - 200, RIM_Y, 400, PAVE - RIM_Y + 40);
        c.clip();
        drawBird(c, 'garbagecanary', { x: BIN_X + shake, y: PAVE, size: SIZE, t, flip: true });
        c.restore();
      }
    };
    const lid = () => {
      c.save();
      c.translate(hx, hy);
      c.rotate(-a);
      c.translate(-hx, -hy);
      const at = [BIN_X + shake, PAVE + 0.074 * SIZE, { h: 1.05 * SIZE, whole: true, flip: true }];
      const call = g.spit > 0 ? 0 : g.sing > 0 ? 1 : -1;
      const drawn = (call >= 0 && drawSprite(c, 'sprites.garbagecanaryCall', call, ...at)) || drawSprite(c, lidSheet, 1, ...at);
      if (!drawn) {
        c.beginPath();
        c.rect(BIN_X - 200, RIM_Y - 300, 400, 300);
        c.clip();
        drawBird(c, 'garbagecanary', { x: BIN_X + shake, y: PAVE, size: SIZE, t, flip: true });
        if (!art('subject.garbagecanary')) drawHead(c, shake);
      }
      c.restore();
    };
    body();
    // things dropping in show between the mouth and the bin's front
    lid();
  }

  function drawStreet(c) {
    // the sky and the houses across the street
    band(c, 0, 0, W, 360, PAL.sky, 0.55, 1);
    for (let i = 0; i < 6; i++) {
      const x0 = 40 + i * 270;
      const top = 150 + ((i * 53) % 70);
      poly(c, [[x0, top], [x0 + 250, top], [x0 + 250, 620], [x0, 620]], 30 + i, 1.2);
      wash(c, [PAL.dusty, '#c9b89a', PAL.sage, '#d8c8a0', PAL.mauve, '#c9b89a'][i], 0.55);
      ink(c, 1.8);
      poly(c, [[x0 - 10, top], [x0 + 125, top - 70], [x0 + 260, top]], 40 + i, 1.2);
      wash(c, '#8a6a5a', 0.6);
      ink(c, 1.8);
      for (const wx of [x0 + 40, x0 + 150]) {
        poly(c, [[wx, top + 60], [wx + 60, top + 60], [wx + 60, top + 140], [wx, top + 140]], wx, 0.8);
        wash(c, '#f2ead0', 0.8);
        ink(c, 1.4);
      }
      poly(c, [[x0 + 100, 520], [x0 + 150, 520], [x0 + 150, 620], [x0 + 100, 620]], 50 + i, 0.8);
      wash(c, '#6a5040', 0.7);
      ink(c, 1.4);
    }
    // the pavement, the kerb and the road
    poly(c, [[0, 620], [W, 620], [W, PAVE + 40], [0, PAVE + 40]], 60, 1);
    wash(c, '#d8d0c0', 0.8);
    ink(c, 1.8);
    for (let x = 60; x < W; x += 160) {
      c.beginPath();
      c.moveTo(x, 620);
      c.lineTo(x - 40, PAVE + 40);
      ink(c, 1);
      c.stroke();
    }
    poly(c, [[0, PAVE + 40], [W, PAVE + 40], [W, PAVE + 56], [0, PAVE + 56]], 61, 0.8);
    wash(c, '#a8a090');
    ink(c, 1.8);
    band(c, 0, PAVE + 56, W, H - PAVE - 56, '#8a8a88', 0.6, 62);
    hatch(c, 0, PAVE + 56, W, H, 14, 0.12, 1);
    // a lamp-post
    c.beginPath();
    c.moveTo(1240, PAVE + 20);
    c.lineTo(1240, 260);
    ink(c, 8, '#3a4a40');
    c.stroke();
    poly(c, [[1214, 260], [1266, 260], [1256, 210], [1224, 210]], 63, 1);
    wash(c, '#f2e2a0');
    ink(c, 2);
  }

  g.draw = (c, t) => {
    scene(c, 'garbagecanary', W, H, drawStreet);

    for (const w of g.wind) {
      c.save();
      c.globalAlpha = clamp(w.life, 0, 0.5) * 0.6;
      c.beginPath();
      c.moveTo(w.x, w.y);
      c.quadraticCurveTo(w.x + 60, w.y - 10, w.x + 140, w.y);
      ink(c, 2, PAL.slate);
      c.stroke();
      c.restore();
    }

    for (const l of g.litter) drawItem(c, { kind: l.kind, t: 0 }, l.x, PAVE + 34, l.rot);

    // things dropping into the bin go behind its front
    for (const it of g.items) if (it.state === 'in') drawItem(c, it, it.x, it.y, it.rot);
    drawCanary(c, t);
    for (const it of g.items) {
      if (it.state === 'in') continue;
      // a soft shadow on the pavement shows where it is
      if (it.state === 'come') {
        c.save();
        c.globalAlpha = 0.18;
        c.fillStyle = INK;
        c.beginPath();
        c.ellipse(it.x, PAVE + 20, 30, 6, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      drawItem(c, it, it.x, it.y, it.rot);
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
      label(c, 'Hold to open the lid for rubbish · keep it shut for anything else', W / 2 + 100, 170, { size: 32, weight: 600 });
      c.restore();
    }
  };

  g.focus = () => BIN_X + 260;
  g.span = 820;

  return g;
}

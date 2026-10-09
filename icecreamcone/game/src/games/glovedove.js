// Glove Dove: Squeaky Clean.
//
// The washing-up. A dirty dish lies in the sink, splashed with jam, egg,
// gravy and worse; the Glove Dove, a long pink rubber glove, stands on a
// sponge and scrubs. Move it onto a spot and rub: back and forth, round and
// round (spin the stick, or drag in circles); every bit of rubbing over a spot
// wears it away. When the last spot is gone the dish squeaks and goes up on
// the rack, and the next one slides in. Press the action for a squirt of
// washing-up liquid: for a few seconds the suds scrub twice as fast, but
// every squirt raises the foam in the sink, and a sink that foams over must
// be mopped up before you can carry on. Dishes get dirtier and the grime
// tougher as you go; later the dishes float and turn in the water.
// Score: dishes washed.

import { drawBird, drawSprite, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.dishes': [3, 2], // dinner plate, soup bowl, mug, saucepan, frying pan, pie dish: clean, seen from above
  'sprites.grime': [3, 2], // jam, fried egg, gravy, spaghetti, burnt-on crust, coffee ring
  'sprites.glovedoveScrub': [2, 1], // the Glove Dove on its sponge, scrubbing: two frames
});

const DURATION = 45;
const CX = 800; // the dish in the sink
const CY = 500;
const SINK = { x0: 470, x1: 1130, y0: 200, y1: 800 };
const SPEED = 1100; // the sponge, moved by the stick
const REACH = 46; // how far around the sponge it scrubs
const WEAR = 400; // pixels of rubbing to clear a plain spot of radius 40
const MAX_RUB = 24; // the most one frame's movement counts
const SOAP_TIME = 3.2;
const SOAP_FOAM = 0.36;
const FOAM_DRAIN = 0.06;
const MOP = 1.6;
const SIZE = 190;
const BOTTLE_X = SINK.x0 - 110; // the soap bottle and the foam gauge under it

// The grime: colour, how tough it is, and its look.
const GRIME = [
  { name: 'jam', color: '#c0405a', tough: 1 },
  { name: 'egg', color: '#e8c040', tough: 1.2 },
  { name: 'gravy', color: '#8a5a30', tough: 1.4 },
  { name: 'spaghetti', color: '#e08a3a', tough: 1.1 },
  { name: 'crust', color: '#4a3020', tough: 2.4 },
  { name: 'coffee', color: '#7a4a28', tough: 1.7 },
];
// The dishes: radius, colours, and which grime they tend to get.
const DISHES = [
  { name: 'plate', r: 250, face: '#f6f3ea', rim: '#7f93a8', grime: [0, 1, 2, 3] },
  { name: 'bowl', r: 220, face: '#f2ead8', rim: '#c9a83a', grime: [0, 2, 3] },
  { name: 'mug', r: 160, face: '#e8e2d4', rim: '#b98aa3', grime: [5, 5, 0] },
  { name: 'saucepan', r: 235, face: '#b8bcc0', rim: '#7a7f86', grime: [2, 4, 3] },
  { name: 'frying pan', r: 225, face: '#5a5a60', rim: '#3a3a40', grime: [1, 4, 2] },
  { name: 'pie dish', r: 240, face: '#e8d0a0', rim: '#c9925a', grime: [4, 0, 4] },
];

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    x: CX, // the sponge
    y: CY + 60,
    vx: 0,
    vy: 0,
    rubbing: 0, // how hard it is scrubbing just now, for the look
    soap: 0, // seconds of soapy scrubbing left
    foam: 0, // the foam in the sink: over 1, it overflows
    mop: 0, // seconds left mopping up
    dish: null,
    phase: 'in', // 'in' (sliding in), 'wash', 'rack' (going up on the rack)
    phaseT: 0,
    racked: [], // what's on the rack, for the picture
    squirts: 0,
    overflows: 0,
    spotsCleared: 0,
    fastest: 99,
    bubbles: [],
    pops: [],
    squeakT: 0,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);

  function pop(text, x, y, color = INK, size = 44) {
    g.pops.push({ text, x, y, color, size, life: 1.2 });
  }

  // A new dirty dish: more spots and tougher grime as time goes on.
  function newDish() {
    const n = g.score;
    const p = progress();
    const kind = n < 2 ? 0 : n < 4 ? Math.floor(rng() * 3) : Math.floor(rng() * DISHES.length);
    const d = DISHES[kind];
    const count = Math.min(7, 2 + Math.floor(n * 0.35) + (rng() < 0.4 ? 1 : 0));
    const spots = [];
    for (let i = 0; i < count; i++) {
      // spread out over the dish, not on top of one another
      let best = null;
      for (let k = 0; k < 12; k++) {
        const a = rng() * Math.PI * 2;
        const rr = Math.sqrt(rng()) * d.r * 0.72;
        const c = { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
        const gap = Math.min(...spots.map((s) => Math.hypot(s.x - c.x, s.y - c.y)), 999);
        if (!best || gap > best.gap) best = { ...c, gap };
      }
      const gi = n < 1 ? 0 : d.grime[Math.floor(rng() * d.grime.length)];
      const r = 30 + rng() * 18;
      spots.push({ x: best.x, y: best.y, r, grime: gi, dirt: 1, seed: Math.floor(rng() * 1000) });
    }
    g.dish = {
      kind,
      spots,
      angle: rng() * Math.PI * 2,
      turn: n >= 6 ? (rng() < 0.5 ? -1 : 1) * lerp(0.15, 0.5, p) : 0, // later dishes turn as they float
      start: g.elapsed,
      ox: -900, // slides in from the draining board
    };
    g.phase = 'in';
    g.phaseT = 0.35;
  }

  // A spot's place on the screen.
  g.spotAt = (s) => {
    const d = g.dish;
    const c = Math.cos(d.angle);
    const sn = Math.sin(d.angle);
    return { x: CX + d.ox + s.x * c - s.y * sn, y: CY + s.x * sn + s.y * c };
  };
  // With the mouse or a finger, the soap is a tap on the bottle or its gauge
  // (a touch anywhere else just moves the bird).
  g.onBottle = (p) => Math.abs(p.x - BOTTLE_X) < 90 && p.y > 150 && p.y < 730;
  g.dirty = () => (g.dish ? g.dish.spots.filter((s) => s.dirt > 0) : []);

  function rack() {
    const d = g.dish;
    const took = g.elapsed - d.start;
    g.score++;
    g.fastest = Math.min(g.fastest, took);
    g.phase = 'rack';
    g.phaseT = 0.45;
    g.racked.push(d.kind);
    sfx('right');
    env.vibrate?.(30);
    pop(took < 3 ? 'Squeaky clean! Speedy!' : 'Squeaky clean!', CX, CY - DISHES[d.kind].r - 50, PAL.magenta, 50);
    for (let i = 0; i < 12; i++) g.bubbles.push({ x: CX + (rng() - 0.5) * 300, y: CY + (rng() - 0.5) * 300, vx: (rng() - 0.5) * 80, vy: -120 - rng() * 160, r: 8 + rng() * 14, life: 1 + rng() * 0.6, sparkle: true });
  }

  function squirt() {
    g.soap = SOAP_TIME;
    g.foam += SOAP_FOAM;
    g.squirts++;
    sfx('plop');
    for (let i = 0; i < 16; i++) g.bubbles.push({ x: g.x + (rng() - 0.5) * 120, y: g.y + (rng() - 0.5) * 80, vx: (rng() - 0.5) * 120, vy: -60 - rng() * 120, r: 10 + rng() * 16, life: 0.9 + rng() * 0.6 });
    if (g.foam >= 1) {
      g.overflows++;
      g.mop = MOP;
      g.soap = 0;
      sfx('splash');
      env.vibrate?.(90);
      pop('It foamed over! Mop up!', CX, SINK.y0 - 30, PAL.slate, 48);
    } else pop('Squirt!', g.x, g.y - 190, PAL.slate, 36);
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }
    if (!g.dish) newDish();

    // The sponge: follow the pointer, or glide with the stick.
    const px = g.x;
    const py = g.y;
    if (input.pointer.active) {
      const tx = clamp(input.pointer.x, SINK.x0, SINK.x1);
      const ty = clamp(input.pointer.y, SINK.y0, SINK.y1);
      const k = 1 - Math.exp(-22 * dt);
      let mx = (tx - g.x) * k;
      let my = (ty - g.y) * k;
      const m = Math.hypot(mx, my);
      const cap = 1500 * dt;
      if (m > cap) {
        mx *= cap / m;
        my *= cap / m;
      }
      g.x += mx;
      g.y += my;
    } else {
      g.vx = approach(g.vx, (input.x || 0) * SPEED, 22, dt);
      g.vy = approach(g.vy, (input.y || 0) * SPEED, 22, dt);
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    }
    g.x = clamp(g.x, SINK.x0, SINK.x1);
    g.y = clamp(g.y, SINK.y0, SINK.y1);
    const moved = Math.min(MAX_RUB, Math.hypot(g.x - px, g.y - py));

    g.soap = Math.max(0, g.soap - dt);
    g.foam = Math.max(0, g.foam - FOAM_DRAIN * dt);
    if (g.mop > 0) {
      g.mop -= dt;
      g.foam = Math.max(0, g.foam - dt * 0.5);
    } else if (input.actionPressed && (!input.pointer.active || g.onBottle(input.pointer))) squirt();

    // The dish: sliding in, being washed, going up on the rack.
    const d = g.dish;
    if (g.phase === 'in') {
      g.phaseT -= dt;
      d.ox = -900 * Math.max(0, g.phaseT / 0.35);
      if (g.phaseT <= 0) {
        g.phase = 'wash';
        d.ox = 0;
      }
    } else if (g.phase === 'rack') {
      g.phaseT -= dt;
      d.ox = 900 * (1 - Math.max(0, g.phaseT / 0.45));
      if (g.phaseT <= 0) newDish();
    } else {
      d.angle += d.turn * dt;
      // Scrubbing: rubbing over a spot wears it away.
      g.rubbing = approach(g.rubbing, moved > 1 ? 1 : 0, 10, dt);
      if (g.mop <= 0 && moved > 0.5) {
        const power = g.soap > 0 ? 2.1 : 1;
        let any = false;
        for (const s of d.spots) {
          if (s.dirt <= 0) continue;
          const at = g.spotAt(s);
          if (Math.hypot(at.x - g.x, at.y - g.y) > s.r + REACH) continue;
          any = true;
          s.dirt -= (moved * power) / (WEAR * GRIME[s.grime].tough * (s.r / 40));
          if (s.dirt <= 0) {
            s.dirt = 0;
            g.spotsCleared++;
            sfx('ding', { pitch: (g.spotsCleared % 5) * 2 });
            for (let i = 0; i < 5; i++) g.bubbles.push({ x: at.x, y: at.y, vx: (rng() - 0.5) * 140, vy: -80 - rng() * 120, r: 6 + rng() * 8, life: 0.6 + rng() * 0.4, sparkle: true });
          }
        }
        if (any) {
          g.squeakT -= dt;
          if (g.squeakT <= 0) {
            sfx('stitch');
            g.squeakT = 0.09;
          }
          if (rng() < 0.35) g.bubbles.push({ x: g.x + (rng() - 0.5) * 70, y: g.y + (rng() - 0.5) * 40, vx: (rng() - 0.5) * 60, vy: -40 - rng() * 80, r: 5 + rng() * (g.soap > 0 ? 14 : 7), life: 0.6 + rng() * 0.5 });
        }
      }
      if (!g.dirty().length) rack();
    }

    for (const b of g.bubbles) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= 1 - 1.5 * dt;
      b.life -= dt;
    }
    g.bubbles = g.bubbles.filter((b) => b.life > 0);
    if (g.bubbles.length > 160) g.bubbles.splice(0, g.bubbles.length - 160);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Dishes ${g.score}`;
  g.summary = () => {
    const lines = [`${g.score} dish${g.score === 1 ? '' : 'es'} washed, ${g.spotsCleared} spots scrubbed away.`];
    if (g.score) lines.push(`Fastest dish: ${g.fastest.toFixed(1)} s.`);
    if (g.overflows) lines.push(`The sink foamed over ${g.overflows} time${g.overflows === 1 ? '' : 's'}.`);
    return lines;
  };

  // ---------- drawing ----------

  function standinKitchen(c) {
    // tiled wall, a window with rain, the counter and the sink
    band(c, 0, 0, W, 560, '#d9e0d0', 0.5, 1);
    c.save();
    c.globalAlpha = 0.25;
    for (let y = 30; y < 200; y += 60) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y + 2);
      ink(c, 1.2);
      c.stroke();
    }
    c.restore();
    poly(c, [[620, 20], [980, 20], [980, 170], [620, 170]], 2, 1);
    wash(c, '#c9d9e0', 0.8);
    ink(c, 2.4);
    c.beginPath();
    c.moveTo(800, 20);
    c.lineTo(800, 170);
    ink(c, 2);
    c.stroke();
    // the counter
    poly(c, [[0, 170], [W, 172], [W, H], [0, H]], 3, 1);
    wash(c, '#d9c8a0', 0.55);
    hatch(c, 0, 170, W, H, 22, 0.08, 1);
    // the sink: a deep white basin
    poly(c, [[SINK.x0 - 40, SINK.y0 - 30], [SINK.x1 + 40, SINK.y0 - 30], [SINK.x1 + 40, SINK.y1 + 40], [SINK.x0 - 40, SINK.y1 + 40]], 4, 1.5);
    wash(c, '#ece8de');
    ink(c, 2.6);
    poly(c, [[SINK.x0 - 10, SINK.y0], [SINK.x1 + 10, SINK.y0], [SINK.x1 + 10, SINK.y1 + 10], [SINK.x0 - 10, SINK.y1 + 10]], 5, 1.5);
    wash(c, '#9fb8c4', 0.6);
    ink(c, 2);
    // taps
    for (const tx of [740, 860]) {
      blob(c, tx, SINK.y0 - 40, 22, 16, tx, 0.1);
      wash(c, '#b8bcc0');
      ink(c, 2);
    }
    // the draining board and its rack on the right; the dirty pile on the left
    poly(c, [[SINK.x1 + 70, 260], [W - 40, 260], [W - 40, 760], [SINK.x1 + 70, 760]], 6, 1.5);
    wash(c, '#c8c0b0', 0.5);
    ink(c, 2);
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.moveTo(SINK.x1 + 110 + i * 38, 360);
      c.lineTo(SINK.x1 + 110 + i * 38, 640);
      ink(c, 2.4, '#7a848c');
      c.stroke();
    }
    c.beginPath();
    c.moveTo(SINK.x1 + 100, 640);
    c.lineTo(W - 70, 640);
    ink(c, 3, '#7a848c');
    c.stroke();
  }

  function drawDish(c, d) {
    const D = DISHES[d.kind];
    const x = CX + d.ox;
    c.save();
    c.translate(x, CY);
    c.rotate(d.angle);
    // (each dish's round body is centred in its cell, 55% of the cell wide)
    if (!drawSprite(c, 'sprites.dishes', d.kind, 0, 0, { w: (D.r * 2) / 0.55, anchor: 'center', whole: true })) {
      if (D.name === 'frying pan' || D.name === 'saucepan') {
        poly(c, [[D.r - 10, -18], [D.r + 170, -14], [D.r + 170, 14], [D.r - 10, 18]], 7, 1);
        wash(c, D.name === 'frying pan' ? '#3a2a20' : '#7a7f86');
        ink(c, 2);
      }
      if (D.name === 'mug') {
        c.beginPath();
        c.ellipse(D.r + 30, 0, 50, 34, 0, 0, Math.PI * 2);
        ink(c, 18, D.rim);
        c.stroke();
      }
      blob(c, 0, 0, D.r, D.r, d.kind + 1, 0.015, 32);
      wash(c, D.rim);
      ink(c, 2.4);
      blob(c, 0, 0, D.r * 0.84, D.r * 0.84, d.kind + 2, 0.015, 32);
      wash(c, D.face);
      ink(c, 1.4);
      if (D.name === 'plate') {
        c.setLineDash([10, 12]);
        c.beginPath();
        c.arc(0, 0, D.r * 0.92, 0, Math.PI * 2);
        ink(c, 3, '#5a6a88');
        c.stroke();
        c.setLineDash([]);
      }
      // a soft shine
      c.save();
      c.globalAlpha = 0.35;
      c.beginPath();
      c.arc(-D.r * 0.25, -D.r * 0.3, D.r * 0.35, Math.PI * 1.1, Math.PI * 1.6);
      ink(c, 8, '#ffffff');
      c.stroke();
      c.restore();
    }
    c.restore();
    // the grime
    for (const s of d.spots) {
      if (s.dirt <= 0) continue;
      const at = g.spotAt(s);
      const G = GRIME[s.grime];
      c.save();
      c.globalAlpha = 0.25 + 0.75 * s.dirt;
      c.translate(at.x, at.y);
      c.rotate(d.angle + s.seed);
      const k = 0.55 + 0.45 * s.dirt;
      if (!drawSprite(c, 'sprites.grime', s.grime, 0, 0, { w: s.r * 2.2 * k, anchor: 'center' })) {
        if (G.name === 'coffee') {
          c.beginPath();
          c.arc(0, 0, s.r * k, 0, Math.PI * 2);
          ink(c, 9, G.color);
          c.stroke();
        } else if (G.name === 'spaghetti') {
          for (let i = 0; i < 4; i++) {
            c.beginPath();
            c.moveTo(-s.r * k, -10 + i * 7);
            c.bezierCurveTo(-10, -30 + i * 12, 10, 20 - i * 9, s.r * k, -6 + i * 5);
            ink(c, 4, G.color);
            c.stroke();
          }
        } else {
          blob(c, 0, 0, s.r * k, s.r * k * 0.8, s.seed, 0.22, 14);
          wash(c, G.color, 0.9);
          ink(c, 1.4, '#3b2b20');
          if (G.name === 'egg') {
            blob(c, 4, 2, s.r * k * 0.4, s.r * k * 0.36, 3, 0.1);
            wash(c, '#e8a020');
          }
          if (G.name === 'crust') hatch(c, -s.r, -s.r, s.r, s.r, 7, 0.5, 1);
        }
      }
      c.restore();
    }
  }

  function drawSuds(c, t) {
    // foam piling up round the sink's edge as it fills
    const f = clamp(g.foam, 0, 1.2);
    if (f <= 0.02) return;
    c.save();
    c.globalAlpha = 0.85;
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ex = CX + Math.cos(a) * 360;
      const ey = CY + Math.sin(a) * 330;
      const x = clamp(ex, SINK.x0, SINK.x1);
      const y = clamp(ey, SINK.y0, SINK.y1);
      const r = 10 + f * 34 + Math.sin(t * 2 + i) * 3;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = '#fbfaf4';
      c.fill();
      ink(c, 1, 'rgba(90,110,130,0.5)');
      c.stroke();
    }
    c.restore();
    if (g.mop > 0) {
      // spilling over the counter
      c.save();
      c.globalAlpha = Math.min(1, g.mop);
      for (let i = 0; i < 14; i++) {
        blob(c, SINK.x0 + i * 50, SINK.y1 + 60 + Math.sin(i) * 12, 40, 22, i, 0.2);
        c.fillStyle = '#fbfaf4';
        c.fill();
        ink(c, 1.2, 'rgba(90,110,130,0.5)');
        c.stroke();
      }
      c.restore();
    }
  }

  // The foam gauge, beside the sink: how close it is to overflowing.
  function drawGauge(c, t) {
    const x = BOTTLE_X;
    const y0 = 300;
    const y1 = 700;
    poly(c, [[x - 26, y0], [x + 26, y0], [x + 26, y1], [x - 26, y1]], 8, 0.8);
    c.fillStyle = 'rgba(250,244,228,0.9)';
    c.fill();
    ink(c, 2);
    const f = clamp(g.foam, 0, 1);
    const warn = f > 0.62;
    c.fillStyle = warn && Math.sin(t * 10) > 0 ? '#e8a0b0' : '#d8ecf2';
    c.fillRect(x - 24, y1 - (y1 - y0) * f, 48, (y1 - y0) * f);
    c.beginPath();
    c.moveTo(x - 34, y0 + 4);
    c.lineTo(x + 34, y0 + 4);
    ink(c, 3, PAL.brick);
    c.stroke();
    // the bottle of washing-up liquid on top
    poly(c, [[x - 22, y0 - 20], [x + 22, y0 - 20], [x + 18, y0 - 110], [x + 6, y0 - 130], [x - 6, y0 - 130], [x - 18, y0 - 110]], 9, 1);
    wash(c, g.soap > 0 ? '#a8d8a0' : '#7fb87a');
    ink(c, 2);
    label(c, 'Soap', x, y0 - 70, { size: 20, weight: 700 });
  }

  function drawRack(c) {
    // the washed dishes stand in the rack, a little on edge
    const n = g.racked.length;
    for (let i = Math.max(0, n - 9); i < n; i++) {
      const D = DISHES[g.racked[i]];
      const x = SINK.x1 + 110 + (i % 9) * 38;
      const h = Math.min(260, D.r * 0.9);
      c.save();
      c.translate(x, 640);
      c.scale(0.18, 1);
      blob(c, 0, -h / 2, D.r * 0.9, h / 2, i, 0.02);
      wash(c, D.face);
      ink(c, 6);
      c.restore();
    }
  }

  function drawSponge(c, t) {
    const x = g.x;
    const y = g.y;
    c.save();
    c.translate(x, y);
    c.rotate(clamp(g.vx / 4000, -0.2, 0.2));
    poly(c, [[-48, -18], [48, -18], [48, 18], [-48, 18]], 11, 1.2);
    wash(c, '#e8d060');
    ink(c, 2);
    poly(c, [[-48, -18], [48, -18], [48, -6], [-48, -6]], 12, 1);
    wash(c, '#7f9a5a');
    ink(c, 1.6);
    c.restore();
    // the Glove Dove standing on it, scrubbing with its feet
    const jig = g.rubbing * (env.reduceMotion ? 0 : Math.sin(t * 30) * 0.06);
    const frame = Math.floor(t * 12) % 2;
    c.save();
    c.translate(x, y - 10);
    c.rotate(jig + clamp(g.vx / 6000, -0.15, 0.15));
    const flip = g.vx > 50;
    if (!(g.rubbing > 0.3 && drawSprite(c, 'sprites.glovedoveScrub', frame, 0, 0, { h: SIZE * 0.85, flip }))) {
      drawBird(c, 'glovedove', { x: 0, y: 0, size: SIZE, t, flip });
    }
    c.restore();
  }

  g.draw = (c, t) => {
    scene(c, 'glovedove', W, H, standinKitchen);
    drawGauge(c, t);
    drawRack(c);
    if (g.dish) drawDish(c, g.dish);
    // soapy water sheen while the soap lasts
    if (g.soap > 0) {
      c.save();
      c.globalAlpha = 0.18 * Math.min(1, g.soap);
      c.fillStyle = '#e8f4ff';
      c.fillRect(SINK.x0 - 10, SINK.y0, SINK.x1 - SINK.x0 + 20, SINK.y1 - SINK.y0 + 10);
      c.restore();
    }
    drawSponge(c, t);
    for (const b of g.bubbles) {
      c.save();
      c.globalAlpha = clamp(b.life * 1.5, 0, 1) * 0.85;
      c.beginPath();
      c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      c.fillStyle = b.sparkle ? 'rgba(255,250,220,0.6)' : 'rgba(250,252,255,0.55)';
      c.fill();
      ink(c, 1.2, b.sparkle ? '#c9a83a' : 'rgba(80,110,140,0.7)');
      c.stroke();
      c.beginPath();
      c.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.2, 0, Math.PI * 2);
      c.fillStyle = '#ffffff';
      c.fill();
      c.restore();
    }
    drawSuds(c, t);

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
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = '600 36px Fraunces, Georgia, serif';
      c.textAlign = 'center';
      c.strokeText('Rub the spots away · press for soap', W / 2, 860);
      label(c, 'Rub the spots away · press for soap', W / 2, 860, { size: 36, weight: 600 });
      c.restore();
    }
  };

  g.focus = () => clamp(g.x, CX - 120, CX + 120);
  g.span = 800;

  return g;
}

// Jackknife Niffy: Snip Snap.
//
// The Niffy hovers over the park promenade while people stroll along below,
// each with a little something that wants snipping: a long hat feather, a
// buttonhole flower, a loose thread from a coat hem, a price tag left on a
// new hat. Move along the sky and press the action to swoop down and snip
// whatever is right below at the bottom of the dive (with the pointer, the
// swoop heads for where you tap). The Niffy takes a moment to get down, so
// aim where the walker is going, not where they are. Every snip scores one
// (a price tag two), and the Niffy flies it off to its nest. But a child's
// balloon string is not for snipping: that costs two. And the Park Keeper is
// watching, now and then: when he turns round (his head turns first, with a
// "?"), any Niffy caught swooping is whistled at and loses two. The walkers
// get quicker and come in crowds, and the Keeper looks round more often and
// with less warning. Score: snips.

import { drawBird, drawSprite, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.niffyWalkers': [3, 2], // six passers-by walking left, nothing on them to snip
  'sprites.niffyProps': [3, 2], // feather, flower, loose thread, price tag, balloon on its string, nest of snippings
  'sprites.parkKeeper': [3, 1], // back turned, glancing over his shoulder, facing front with his whistle
  'sprites.niffyDive': [2, 1], // swooping with its blade open, and snapping it shut
  'sprites.niffyFly': [3, 1], // hovering with wings up, wings down (a flap), and dazed, tumbling
});

const DURATION = 45;
const HOVER = 230; // the Niffy's cruising height (its blade tip)
const GROUND = 800; // the walkers' feet
const DOWN = 0.32; // seconds from the sky to the snip
const UP = 0.42;
const REACH = 38; // how close the blade must be, across, to snip
const DEPTH = 46; // and up and down
const SIZE = 210;
const KEEPER_X = 1420;
const KEEPER_Y = 640;
const PROMPTS = { feather: 1, flower: 1, thread: 1, tag: 2 };
// Where each thing hangs on a walker, above the feet (and across, facing left).
const SPOT = { feather: [38, 318], flower: [-14, 214], thread: [24, 112], tag: [-40, 278], balloon: [-36, 236] };
const COATS = [PAL.slate, PAL.olive, PAL.mauve, PAL.brick, PAL.mustard, '#5a6a7a', PAL.sage];
const ITEM_COLS = { feather: PAL.magenta, flower: PAL.strawberry, thread: PAL.lemon, tag: '#fbf8ee', balloon: '#d04a3a' };

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    x: W / 2,
    y: HOVER,
    face: -1, // which way the Niffy looks: -1 left, 1 right
    state: 'hover', // hover | down | up | dazed
    st: 0,
    dive: null, // { x0, x1, depth, snipped }
    walkers: [],
    flying: [], // snipped things on their way to the nest
    balloons: [], // let go, floating away
    pops: [],
    nest: 0,
    keeper: { state: 'away', t: 8.5, look: 0 }, // away | turning | watch
    spawnT: 0.4,
    snips: 0,
    caught: 0,
    popped: 0,
    whistle: 0,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  const add = (n) => {
    g.score = Math.max(0, g.score + n);
  };
  function pop(text, x, y, color = INK, size = 40) {
    g.pops.push({ text, x, y, color, size, life: 1.2 });
  }
  g.DOWN = DOWN;
  g.REACH = REACH;
  // Is the Keeper looking (or about to)?
  g.watching = () => g.keeper.state === 'watch';

  function spawn() {
    const p = progress();
    const dir = rng() < 0.5 ? -1 : 1;
    const kid = g.elapsed > 10 && rng() < lerp(0.18, 0.3, p);
    const kinds = ['feather', 'flower', 'thread', 'feather', 'flower', 'thread', 'tag'];
    const items = [];
    if (kid) items.push({ kind: 'balloon' });
    else {
      items.push({ kind: kinds[Math.floor(rng() * kinds.length)] });
      if (p > 0.4 && rng() < 0.3) {
        const k2 = kinds[Math.floor(rng() * kinds.length)];
        if (k2 !== items[0].kind) items.push({ kind: k2 });
      }
    }
    const v = lerp(90, 175, p) * (0.85 + rng() * 0.3);
    g.walkers.push({
      x: dir > 0 ? -120 : W + 120,
      vx: dir * v,
      kid,
      size: kid ? 0.62 : 0.9 + rng() * 0.15,
      coat: COATS[Math.floor(rng() * COATS.length)],
      cell: Math.floor(rng() * (kid ? 1 : 5)) + (kid ? 5 : 0),
      phase: rng() * 6,
      huh: 0,
      items: items.map((it) => ({ ...it, snipped: false })),
    });
  }

  // Where a walker's thing is now.
  g.spot = (w, it) => {
    const [ax, ay] = SPOT[it.kind];
    const f = w.vx < 0 ? 1 : -1; // drawn facing left; mirrored walking right
    return [w.x + ax * f * w.size, GROUND - ay * w.size];
  };
  // Everything that can be snipped (or shouldn't be), with where it is.
  g.targets = () => {
    const out = [];
    for (const w of g.walkers) for (const it of w.items) if (!it.snipped) {
      const [x, y] = g.spot(w, it);
      out.push({ w, it, x, y, vx: w.vx });
    }
    return out;
  };

  function startDive(input) {
    const x0 = g.x;
    let x1 = x0;
    if (input.pointer.active) x1 = clamp(input.pointer.x, x0 - 300, x0 + 300);
    // Dive to the height of the nearest thing below the blade's path.
    let depth = 590;
    let best = 1e9;
    for (const o of g.targets()) {
      const ox = o.x + o.vx * DOWN;
      const d = Math.abs(ox - x1);
      if (d < 110 && d < best) {
        best = d;
        depth = o.y;
      }
    }
    g.dive = { x0, x1, depth, snipped: false };
    g.state = 'down';
    g.st = 0;
    if (x1 !== x0) g.face = x1 < x0 ? -1 : 1;
    sfx('wind');
  }

  function snip() {
    let hit = null;
    let best = 1e9;
    for (const o of g.targets()) {
      const d = Math.abs(o.x - g.x) + Math.abs(o.y - g.y) * 0.5;
      if (Math.abs(o.x - g.x) <= REACH && Math.abs(o.y - g.y) <= DEPTH && d < best) {
        best = d;
        hit = o;
      }
    }
    sfx('shutter');
    if (!hit) {
      pop('Snap!', g.x, g.y + 40, PAL.grey, 30);
      return;
    }
    hit.it.snipped = true;
    hit.w.huh = 1;
    g.dive.snipped = true;
    if (hit.it.kind === 'balloon') {
      g.popped++;
      add(-2);
      g.balloons.push({ x: hit.x, y: hit.y - 70 * hit.w.size, vy: -60, sway: rng() * 6 });
      pop('Oh no, my balloon!  −2', hit.x, hit.y - 160, PAL.brick, 38);
      sfx('wrong');
      env.vibrate?.(100);
      return;
    }
    const pts = PROMPTS[hit.it.kind];
    g.snips++;
    add(pts);
    g.flying.push({ kind: hit.it.kind, x: hit.x, y: hit.y, t: 0, x0: hit.x, y0: hit.y });
    pop(pts > 1 ? `Snip! +${pts}` : 'Snip!', hit.x, hit.y - 60, PAL.magenta, 44);
    sfx('catch', { pitch: pts > 1 ? 7 : 2 });
    env.vibrate?.(25);
  }

  function caught() {
    g.caught++;
    add(-2);
    g.state = 'dazed';
    g.st = 0;
    g.whistle = 1.2;
    pop('Peep! Caught!  −2', g.x, g.y - 70, PAL.brick, 44);
    sfx('honk');
    env.vibrate?.(150);
  }

  function updateKeeper(dt) {
    const k = g.keeper;
    const p = progress();
    k.t -= dt;
    if (k.t > 0) return;
    if (k.state === 'away') {
      k.state = 'turning';
      k.t = lerp(0.9, 0.5, p);
      sfx('tick');
    } else if (k.state === 'turning') {
      k.state = 'watch';
      k.t = lerp(1.4, 2.4, p) * (0.8 + rng() * 0.4);
    } else {
      k.state = 'away';
      k.t = lerp(4.2, 2.2, p) * (0.75 + rng() * 0.5);
    }
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0 && (g.state === 'hover' || g.state === 'dazed')) {
      g.done = true;
      return;
    }
    const p = progress();

    // People strolling by.
    g.spawnT -= dt;
    if (g.spawnT <= 0 && g.time > 1.5) {
      spawn();
      g.spawnT = lerp(1.6, 0.8, p) * (0.7 + rng() * 0.6);
    }
    for (const w of g.walkers) {
      w.x += w.vx * dt;
      w.phase += dt * Math.abs(w.vx) / 22;
      w.huh = Math.max(0, w.huh - dt);
    }
    g.walkers = g.walkers.filter((w) => w.x > -200 && w.x < W + 200);

    updateKeeper(dt);
    g.whistle = Math.max(0, g.whistle - dt);

    // The Niffy.
    g.st += dt;
    if (g.state === 'hover') {
      const was = g.x;
      if (input.pointer.active) g.x = approach(g.x, input.pointer.x, 9, dt);
      else g.x += input.x * 820 * dt;
      g.x = clamp(g.x, 80, W - 80);
      if (Math.abs(g.x - was) > 0.6) g.face = g.x < was ? -1 : 1;
      g.y = approach(g.y, HOVER + Math.sin(g.elapsed * 3) * 8, 6, dt);
      if (input.actionPressed && g.time > 0) startDive(input);
    } else if (g.state === 'down') {
      const k = Math.min(1, g.st / DOWN);
      const e = k * k;
      g.x = lerp(g.dive.x0, g.dive.x1, Math.sin((k * Math.PI) / 2));
      g.y = lerp(HOVER, g.dive.depth, e);
      if (k >= 1) {
        snip();
        g.state = 'up';
        g.st = 0;
      }
    } else if (g.state === 'up') {
      const k = Math.min(1, g.st / UP);
      g.y = lerp(g.dive.depth, HOVER, 1 - (1 - k) * (1 - k));
      if (k >= 1) {
        g.state = 'hover';
        g.dive = null;
      }
    } else if (g.state === 'dazed') {
      g.y = approach(g.y, HOVER - 30, 5, dt);
      if (g.st > 1.2) g.state = 'hover';
    }
    // Spotted swooping while the Keeper is looking.
    if ((g.state === 'down' || g.state === 'up') && g.watching() && g.y > HOVER + 70) caught();

    for (const f of g.flying) {
      f.t += dt / 0.9;
      const k = Math.min(1, f.t);
      f.x = lerp(f.x0, 110, k);
      f.y = lerp(f.y0, 170, k) - Math.sin(k * Math.PI) * 140;
      if (k >= 1) {
        f.dead = true;
        g.nest++;
      }
    }
    g.flying = g.flying.filter((f) => !f.dead);
    for (const b of g.balloons) {
      b.vy -= 20 * dt;
      b.y += b.vy * dt;
      b.sway += dt;
    }
    g.balloons = g.balloons.filter((b) => b.y > -100);
    for (const q of g.pops) {
      q.life -= dt;
      q.y -= 40 * dt;
    }
    g.pops = g.pops.filter((q) => q.life > 0);
  };

  g.hud = () => `Snips ${g.score}`;
  g.summary = () => {
    const lines = [`${g.snips} snip${g.snips === 1 ? '' : 's'} for the nest.`];
    const woes = [];
    if (g.caught) woes.push(`caught ${g.caught} time${g.caught === 1 ? '' : 's'} by the Keeper`);
    if (g.popped) woes.push(`${g.popped} balloon${g.popped === 1 ? '' : 's'} let go`);
    lines.push(woes.length ? `Oops: ${woes.join(', ')}.` : 'Never once seen, and every balloon still on its string!');
    return lines;
  };

  // ---------- drawing ----------

  function standinScene(c) {
    band(c, 0, 0, W, 470, PAL.sky, 0.55, 1);
    // trees along the back of the park
    for (let i = 0; i < 9; i++) {
      const tx = 60 + i * 190 + ((i * 47) % 50);
      c.beginPath();
      c.moveTo(tx, 560);
      c.lineTo(tx + 6, 420);
      ink(c, 10, '#6a5040');
      blob(c, tx, 380, 95, 80, i + 1, 0.12);
      wash(c, i % 2 ? PAL.sage : PAL.olive, 0.7);
      ink(c, 1.6);
    }
    // the pond behind the railings, the gravel, the railings
    band(c, 0, 520, W, 80, '#9fbfc8', 0.6, 4);
    band(c, 0, 590, W, 110, '#d9cfb0', 0.75, 5);
    c.beginPath();
    for (let x = 20; x < W; x += 34) {
      c.moveTo(x, 700);
      c.lineTo(x, 640);
    }
    c.moveTo(0, 650);
    c.lineTo(W, 650);
    c.moveTo(0, 690);
    c.lineTo(W, 690);
    ink(c, 2.2, '#3a3a34');
    // the promenade the people walk along
    band(c, 0, 700, W, H - 700, '#cfc4a8', 0.85, 6);
    c.save();
    c.globalAlpha = 0.25;
    for (let x = 0; x < W; x += 120) {
      c.beginPath();
      c.moveTo(x, 720);
      c.lineTo(x - 60, H);
      ink(c, 1.2);
    }
    c.restore();
    // the Niffy's nest, in the corner of a branch
    c.beginPath();
    c.moveTo(0, 210);
    c.quadraticCurveTo(120, 190, 210, 150);
    ink(c, 12, '#6a5040');
  }

  function drawItem(c, kind, x, y, s, t, hangFrom = null) {
    const cell = { feather: 0, flower: 1, thread: 2, tag: 3, balloon: 4 }[kind];
    if (kind === 'balloon') {
      // the string, from the child's hand up to the balloon
      const bx = x + Math.sin(t * 1.5) * 6;
      const by = y - 120 * s;
      c.beginPath();
      c.moveTo(hangFrom ? hangFrom[0] : x, hangFrom ? hangFrom[1] : y + 40 * s);
      c.quadraticCurveTo(x + 8, y - 40 * s, bx, by + 34 * s);
      ink(c, 1.4);
      if (!drawSprite(c, 'sprites.niffyProps', cell, bx, by, { h: 90 * s, anchor: 'center' })) {
        blob(c, bx, by, 32 * s, 38 * s, 3, 0.03);
        wash(c, ITEM_COLS.balloon);
        ink(c, 2);
        c.beginPath();
        c.arc(bx - 10 * s, by - 14 * s, 6 * s, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,240,230,0.7)';
        c.fill();
      }
      return;
    }
    if (drawSprite(c, 'sprites.niffyProps', cell, x, y, { h: 56 * s, anchor: 'center' })) return;
    if (kind === 'feather') {
      // a long hat feather: a curved vane on a quill
      c.save();
      c.translate(x, y + 20 * s);
      c.rotate(0.35 + Math.sin(t * 2) * 0.06);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(-16 * s, -30 * s, -4 * s, -70 * s);
      c.quadraticCurveTo(14 * s, -34 * s, 0, 0);
      wash(c, ITEM_COLS.feather);
      ink(c, 1.4);
      c.beginPath();
      c.moveTo(0, 6 * s);
      c.quadraticCurveTo(-3 * s, -30 * s, -4 * s, -68 * s);
      ink(c, 1.2);
      c.restore();
    } else if (kind === 'flower') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t * 0.2;
        blob(c, x + Math.cos(a) * 10 * s, y + Math.sin(a) * 10 * s, 9 * s, 7 * s, i, 0.1, 10);
        wash(c, ITEM_COLS.flower);
        ink(c, 1);
      }
      c.beginPath();
      c.arc(x, y, 6 * s, 0, Math.PI * 2);
      c.fillStyle = PAL.lemon;
      c.fill();
      ink(c, 1);
    } else if (kind === 'thread') {
      c.beginPath();
      c.moveTo(x, y - 18 * s);
      for (let i = 1; i <= 6; i++) c.lineTo(x + Math.sin(t * 6 + i) * 5 * s, y - 18 * s + i * 8 * s);
      ink(c, 3.4, '#b8902a');
      c.beginPath();
      c.arc(x + Math.sin(t * 6 + 6) * 5 * s, y + 32 * s, 5 * s, 0, Math.PI * 2);
      ink(c, 2, '#b8902a');
    } else if (kind === 'tag') {
      c.beginPath();
      c.moveTo(x + 10 * s, y - 26 * s);
      c.lineTo(x, y - 10 * s);
      ink(c, 1.2);
      poly(c, [[x - 18 * s, y - 10 * s], [x + 18 * s, y - 10 * s], [x + 18 * s, y + 18 * s], [x - 18 * s, y + 18 * s]], 5, 0.5);
      wash(c, ITEM_COLS.tag);
      ink(c, 1.6);
      c.beginPath();
      c.moveTo(x - 10 * s, y + 4 * s);
      c.lineTo(x + 10 * s, y + 4 * s);
      ink(c, 1.4, PAL.brick);
    }
  }

  function drawWalker(c, w, t) {
    const f = w.vx < 0 ? 1 : -1;
    const s = w.size;
    const step = Math.sin(w.phase);
    const bob = Math.abs(Math.cos(w.phase)) * 4 * s;
    c.save();
    c.translate(w.x, GROUND - bob);
    if (!drawSprite(c, 'sprites.niffyWalkers', w.cell, 0, 0, { h: 340 * s, flip: f < 0 })) {
      c.scale(f * s, s);
      // legs
      for (const k of [-1, 1]) {
        c.beginPath();
        c.moveTo(k * 12, -120);
        c.lineTo(k * 12 + step * k * 22, 0);
        ink(c, 9, '#4a4038');
      }
      // coat
      poly(c, [[-40, -100], [40, -100], [28, -250], [-28, -250]], w.cell + 1, 1.2);
      wash(c, w.coat);
      ink(c, 2.2);
      poly(c, [[-40, -100], [40, -100], [28, -250], [-28, -250]], w.cell + 1, 1.2);
      hatch(c, -42, -252, 42, -98, 10, 0.18, 1);
      // arm
      c.beginPath();
      c.moveTo(-6, -235);
      c.lineTo(-10 - step * 16, -150);
      ink(c, 10, w.coat);
      ink(c, 1.4);
      // head and hat
      blob(c, 0, -282, 26, 30, w.cell + 3, 0.05);
      wash(c, '#f0d8bc');
      ink(c, 2);
      eye(c, -14, -288, 3);
      if (!w.kid) {
        poly(c, [[-44, -300], [44, -300], [40, -308], [-40, -308]], w.cell + 4, 0.6);
        wash(c, '#3a3430');
        ink(c, 1.6);
        poly(c, [[-26, -306], [26, -306], [22, -344], [-22, -344]], w.cell + 5, 0.8);
        wash(c, w.cell % 2 ? '#3a3430' : PAL.mauve);
        ink(c, 1.6);
      } else {
        blob(c, 0, -306, 26, 12, 7, 0.08);
        wash(c, PAL.lemon);
        ink(c, 1.6);
      }
    }
    c.restore();
    // what they carry (drawn in the world, so the blade lines up)
    for (const it of w.items) {
      if (it.snipped) continue;
      const [x, y] = g.spot(w, it);
      if (it.kind === 'balloon') drawItem(c, 'balloon', x, y, s * 1.4, t + w.phase, [w.x - 24 * f * s, GROUND - 160 * s]);
      else drawItem(c, it.kind, x, y, s, t + w.phase);
    }
    if (w.huh > 0) {
      c.save();
      c.globalAlpha = Math.min(1, w.huh * 2);
      label(c, 'Hm?', w.x, GROUND - 400 * s, { size: 30, color: PAL.slate, weight: 700 });
      c.restore();
    }
  }

  function eye(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = INK;
    c.fill();
  }

  function drawKeeper(c, t) {
    const k = g.keeper;
    const x = KEEPER_X;
    const y = KEEPER_Y;
    const cell = k.state === 'away' ? 0 : k.state === 'turning' ? 1 : 2;
    if (!drawSprite(c, 'sprites.parkKeeper', cell, x, y, { h: 340 })) {
      // a stout park keeper in a peaked cap
      poly(c, [[x - 70, y - 20], [x + 70, y - 20], [x + 56, y - 230], [x - 56, y - 230]], 21, 1.2);
      wash(c, '#4f6a4a');
      ink(c, 2.4);
      for (const lx of [-26, 26]) {
        c.beginPath();
        c.moveTo(x + lx, y - 30);
        c.lineTo(x + lx, y);
        ink(c, 14, '#3a3430');
      }
      blob(c, x, y - 266, 40, 42, 22, 0.04);
      wash(c, '#f0d8bc');
      ink(c, 2.2);
      // cap: its peak shows which way he looks
      const peak = k.state === 'away' ? 0 : k.state === 'turning' ? -1 : 0;
      poly(c, [[x - 42, y - 292], [x + 42, y - 292], [x + 36, y - 326], [x - 36, y - 326]], 23, 0.8);
      wash(c, '#2f3f30');
      ink(c, 1.8);
      if (k.state === 'away') {
        // back of his head: hair, no face
        blob(c, x, y - 262, 36, 30, 24, 0.06);
        wash(c, '#7a6a5a', 0.8);
        // he is busy with the ducks on the pond
        label(c, '♪', x + 60, y - 330 + Math.sin(t * 3) * 6, { size: 34, color: PAL.slate, weight: 700 });
      } else {
        poly(c, [[x - 46 + peak * 20, y - 292], [x + (peak < 0 ? -10 : 46), y - 292], [x + (peak < 0 ? -40 : 30), y - 280], [x - 60 + peak * 20, y - 280]], 25, 0.6);
        wash(c, '#1f2a20');
        ink(c, 1.4);
        if (k.state === 'turning') {
          eye(c, x - 26, y - 270, 4);
          label(c, '?', x + 50, y - 350, { size: 54, color: PAL.ochre, weight: 800 });
        } else {
          eye(c, x - 14, y - 272, 5);
          eye(c, x + 14, y - 272, 5);
          c.beginPath();
          c.moveTo(x - 24, y - 288);
          c.lineTo(x - 6, y - 284);
          c.moveTo(x + 24, y - 288);
          c.lineTo(x + 6, y - 284);
          ink(c, 2.4);
          // whistle at the ready
          blob(c, x + 4, y - 244, 9, 6, 26, 0.05);
          wash(c, '#c8c8c0');
          ink(c, 1.4);
        }
      }
    }
    // a big watchful eye over him while he is looking, so no one misses it
    if (k.state !== 'away') {
      c.save();
      c.globalAlpha = k.state === 'watch' ? 0.9 : 0.5 + 0.4 * Math.sin(t * 18);
      blob(c, x, y - 430, 44, 26, 27, 0.04);
      wash(c, '#fbf8ee');
      ink(c, 2.6);
      c.beginPath();
      c.arc(x - 8, y - 430, k.state === 'watch' ? 13 : 9, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
      c.restore();
    }
    if (g.whistle > 0) {
      c.save();
      c.globalAlpha = Math.min(1, g.whistle * 2);
      label(c, 'PEEP!', x - 90, y - 380, { size: 48, color: PAL.brick, weight: 800 });
      c.restore();
    }
  }

  function drawNiffy(c, t) {
    const k = SIZE / 400;
    const f = g.face;
    let rot = 0;
    if (g.state === 'down') rot = 0.95 * Math.min(1, g.st / 0.1);
    else if (g.state === 'up') rot = 0.95 * (1 - Math.min(1, g.st / UP)) - 0.2;
    else if (g.state === 'dazed') rot = Math.sin(g.st * 20) * 0.3;
    else rot = Math.sin(t * 4) * 0.05;
    c.save();
    c.translate(g.x, g.y);
    c.rotate(-rot * -f); // nose down towards the snip
    // swooping: the dive sheet; hovering: a two-frame flap; dazed: tumbling
    const sheet = g.state === 'down' || g.state === 'up' ? 'sprites.niffyDive' : 'sprites.niffyFly';
    const cell = g.state === 'down' ? 0 : g.state === 'up' ? 1 : g.state === 'dazed' ? 2 : Math.floor(t * 8) % 2;
    if (!drawSprite(c, sheet, cell, 170 * k * -f, 230 * k, { h: SIZE * 0.75, flip: f > 0 })) {
      // the blade tip is at (x, y); the bird is drawn from its feet
      drawBird(c, 'niffy', { x: 170 * k * -f, y: 230 * k, size: SIZE, t, flip: f > 0 });
    }
    c.restore();
    // the Keeper's eye, small, over the Niffy too (he may be off a narrow screen)
    if (g.keeper.state !== 'away') {
      c.save();
      c.globalAlpha = g.keeper.state === 'watch' ? 0.85 : 0.45 + 0.35 * Math.sin(t * 18);
      blob(c, g.x + 90 * -g.face, g.y - 70, 24, 14, 28, 0.04);
      wash(c, '#fbf8ee');
      ink(c, 2);
      c.beginPath();
      c.arc(g.x + 90 * -g.face - 4, g.y - 70, 7, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
      c.restore();
    }
    if (g.state === 'dazed') {
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i * Math.PI * 2) / 3;
        label(c, '✦', g.x + Math.cos(a) * 50, g.y - 90 + Math.sin(a) * 14, { size: 24, color: PAL.ochre, weight: 700 });
      }
    }
  }

  g.draw = (c, t) => {
    scene(c, 'niffy', W, H, standinScene);

    // the nest and its snippings
    if (!drawSprite(c, 'sprites.niffyProps', 5, 110, 190, { h: 90 })) {
      blob(c, 110, 172, 70, 26, 31, 0.12);
      wash(c, '#a07a4a');
      ink(c, 2);
      blob(c, 110, 172, 70, 26, 31, 0.12);
      hatch(c, 30, 140, 190, 200, 7, 0.4, -1);
    }
    for (let i = 0; i < Math.min(g.nest, 12); i++) {
      const kinds = ['feather', 'flower', 'thread', 'tag'];
      drawItem(c, kinds[i % 4], 70 + ((i * 29) % 90), 152 - Math.floor(i / 4) * 10, 0.6, 0);
    }

    drawKeeper(c, t);

    // the Niffy's shadow on the promenade, to judge the swoop
    c.save();
    c.globalAlpha = 0.16 + (g.state === 'hover' ? 0 : 0.1);
    c.beginPath();
    c.ellipse(g.state === 'down' ? g.dive.x1 : g.x, GROUND + 18, 44, 10, 0, 0, Math.PI * 2);
    c.fillStyle = INK;
    c.fill();
    c.restore();

    const ws = [...g.walkers].sort((a, b) => a.size - b.size);
    for (const w of ws) drawWalker(c, w, t);

    for (const b of g.balloons) drawItem(c, 'balloon', b.x + Math.sin(b.sway * 2) * 20, b.y + 120, 1, t, [b.x, b.y + 200]);
    for (const fl of g.flying) drawItem(c, fl.kind, fl.x, fl.y, 0.9, t);

    // a dotted line from the blade to where the swoop will reach, while hovering
    if (g.state === 'hover') {
      c.save();
      c.globalAlpha = 0.25;
      c.setLineDash([4, 12]);
      c.beginPath();
      c.moveTo(g.x, g.y + 20);
      c.lineTo(g.x, GROUND - 60);
      ink(c, 2, PAL.slate);
      c.restore();
    }

    drawNiffy(c, t);

    for (const q of g.pops) {
      c.save();
      c.globalAlpha = Math.min(1, q.life * 2);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = `800 ${q.size}px Fraunces, Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeText(q.text, q.x, q.y);
      label(c, q.text, q.x, q.y, { size: q.size, color: q.color, weight: 800 });
      c.restore();
    }

    if (g.elapsed < 4) {
      c.save();
      c.globalAlpha = Math.min(1, 4 - g.elapsed);
      label(c, 'Move along the sky · press to swoop and snip', W / 2, 100, { size: 36, weight: 600 });
      c.restore();
    }
  };

  // On a narrow screen, follow the Niffy (its little eye says when the Keeper looks).
  g.focus = () => g.x;
  g.span = 820;

  return g;
}

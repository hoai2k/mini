// Glove Dove: Slippery Dishes.
//
// The washing-up is done, but every dish is wet and soapy and slippery. They
// pop up out of the suds in the sink on the left, and the Glove Dove, a long
// pink rubber glove, runs along the counter beneath them. Press the action
// as a dish comes down onto its fingers to flick it back up and along,
// keepy-uppy, towards the plate rack on the right; a dish that drops into the
// rack is put away. The timing of the flick decides how well it flies: just
// as the dish lands on the glove is a "Hup!", high and long and aimed at the
// rack (from near the sink it takes two); too early is a feeble hop; not at
// all and the dish just bounces off the rubber, low and short, and the
// second time it slips off. A dish that reaches the counter or the floor smashes (no
// points lost, but the dish is gone); one that drops back into the sink pops
// up again later. More dishes come, faster, and heavy pans join in.
// Score: points (3 for each dish put away, 1 for each "Hup!").

import { drawBird, drawSprite, spriteCell, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.dishes': [3, 2], // plate, bowl, cup, saucepan, frying pan, pie dish: side views, handles to the right
  'sprites.glovedoveToss': [2, 1], // ready to catch (fingers up), flicking a dish up
  'sprites.dishShards': [3, 2], // each dish smashed, in the dishes' order (requested, IC-M11g)
  'sprites.glovedovePoses': [2, 1], // cheering (a dish put away), dismayed (a dish smashed)
});

const DURATION = 45;
// Measured on the delivered scene (1920 x 1080, drawn at 1600 x 900): the
// counter top's front edge is at 554, the sink (suds at 375 to 533) takes
// the left 367, the wire rack stands on its tray from 1221 to 1579 with its
// wires' tops at about 304 to 380.
const COUNTER = 540; // where the Dove's feet stand, near the front of the counter top
const SIZE = 290;
// From the art: the long glove is the Dove's neck, held level behind its head
// (the portrait, subjects/glovedove.png), and bracing to catch it lowers the
// glove to a level tray (sprites.glovedoveToss, cell 0) whose top is 252
// units above the feet, its middle 84 units behind them (measured on the
// sheet: glove top at 0.38 of the cell, feet at 0.979, middle at x 0.7). The
// Dove braces whenever a dish is about to come down on it, so dishes meet the
// glove at the braced height. It always faces left, towards the sink, with
// the glove reaching back towards the rack. The pose sheets are painted at the
// portrait's framing (1024 px = 420 units, feet centred): they are drawn whole
// at the portrait's scale, standing on their measured feet.
const K_SIZE = SIZE / 400;
const HANDS = COUNTER - Math.round(252 * K_SIZE); // where a falling dish meets the glove
const ARM_C = Math.round(84 * K_SIZE); // the middle of the glove, behind the Dove's feet
const CELL = 420 * K_SIZE; // a pose cell, drawn at the portrait's scale
// [sheet, cell, feet down the cell, feet across the cell]
const POSE = {
  brace: ['sprites.glovedoveToss', 0, 0.979, 0.51],
  flick: ['sprites.glovedoveToss', 1, 0.979, 0.495],
  cheer: ['sprites.glovedovePoses', 0, 1.0, 0.46],
  dismay: ['sprites.glovedovePoses', 1, 1.0, 0.51],
};
const SINK_X1 = 360; // the sink, left of here
const SINK_Y = 390; // its suds
const RACK_X0 = 1250; // the plate rack
const RACK_X1 = 1560;
const RACK_Y = 360; // a dish falling through here (the wires' tops) into the rack is put away
const RACK_MID = (RACK_X0 + RACK_X1) / 2;
const HUP_REACH = 520; // the fastest a "Hup!" sends a dish along
const DOVE_MIN = 390;
const DOVE_MAX = 1150;
const SPEED = 1000;
const REACH = 88; // how far from the glove's middle a dish can be flicked
// The space above the counter is low, so everything flies on a smaller
// scale: lower gravity and launches, the same times in the air.
const GRAV = 1140;
const GRIP = 0.18; // a press keeps the fingers ready this long
const PERFECT = 0.09; // pressed no earlier than this before the dish lands: Hup!
const REST = 0.45; // after a press, before the next one
const FUMBLE = 0.9; // after a press that caught nothing

// The dishes: half-width, how high a flick sends it (heavier is lower), and
// their look for the stand-in.
const KINDS = [
  { name: 'plate', half: 70, lift: 1, face: '#f6f3ea', rim: '#7f93a8' },
  { name: 'bowl', half: 55, lift: 1, face: '#f2ead8', rim: '#c9a83a' },
  { name: 'cup', half: 40, lift: 1.05, face: '#e8e2d4', rim: '#b98aa3' },
  { name: 'saucepan', half: 60, lift: 0.88, face: '#b8bcc0', rim: '#7a7f86' },
  { name: 'frying pan', half: 65, lift: 0.85, face: '#5a5a60', rim: '#3a3a40' },
  { name: 'pie dish', half: 62, lift: 0.95, face: '#e8d0a0', rim: '#c9925a' },
];

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    x: 640, // the Dove
    vx: 0,
    grip: 0, // seconds the fingers stay ready
    gripAge: 9, // seconds since the press
    rest: 0,
    flick: 0, // for the look
    cheer: 0,
    dismay: 0,
    dishes: [], // in the air: { kind, x, y, vx, vy, spin, a, flicks }
    racked: [], // kinds put away, for the picture
    shards: [],
    heaps: [], // smashed dishes lying on the counter for a moment
    pops: [],
    spawnT: 0.8,
    queue: 0, // dishes that fell back into the sink, to pop up again
    put: 0,
    hups: 0,
    smashed: 0,
    flicks: 0,
    bounces: 0,
    fumbles: 0,
    caught: false,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  function pop(text, x, y, color = INK, size = 42) {
    g.pops.push({ text, x, y, color, size, life: 1.1 });
  }

  // A dish pops up out of the suds.
  function spawn() {
    const n = g.put + g.smashed;
    const r = rng();
    const kind = n < 2 ? 0 : g.elapsed < 15 ? Math.floor(r * 3) : r < 0.35 + 0.25 * progress() ? 3 + Math.floor(rng() * 3) : Math.floor(rng() * 3);
    g.dishes.push({ kind, x: 170 + rng() * 80, y: SINK_Y, vx: 250 + rng() * 90, vy: -(650 + rng() * 100), spin: (rng() - 0.5) * 6, a: 0, flicks: 0 });
    sfx('plop');
  }

  // When (seconds) and where (x) a falling dish next reaches the fingers, or null.
  g.catchX = () => g.x + ARM_C;
  // A dish is about to come down on the glove: brace for it.
  g.bracing = () =>
    g.dishes.some((d) => {
      if (d.slipped || d.vy < 0) return false;
      const l = g.landing(d);
      return l && l.t < 0.3 && Math.abs(l.x - g.catchX()) < REACH + KINDS[d.kind].half * 0.4;
    });
  g.landing = (d) => {
    const dy = HANDS - d.y;
    const disc = d.vy * d.vy + 2 * GRAV * dy;
    if (disc < 0) return null;
    const t = (-d.vy + Math.sqrt(disc)) / GRAV;
    if (t < 0) return null;
    return { t, x: d.x + d.vx * t };
  };

  function smash(d, x, y) {
    d.dead = true;
    g.smashed++;
    g.dismay = 0.8;
    sfx('topple');
    env.vibrate?.(70);
    pop('Crash!', x, y - 70, PAL.brick, 46);
    const K = KINDS[d.kind];
    g.heaps.push({ x, y, kind: d.kind, life: 1.4 });
    for (let i = 0; i < 9; i++) g.shards.push({ x, y: y - 6, vx: (rng() - 0.5) * 520, vy: -200 - rng() * 380, a: rng() * 6, va: (rng() - 0.5) * 16, life: 1 + rng() * 0.5, color: i % 2 ? K.face : K.rim });
  }

  // Seconds for a dish thrown up at vy (negative) to come down `drop` below.
  const flight = (vy, drop) => (-vy + Math.sqrt(vy * vy + 2 * GRAV * drop)) / GRAV;

  // The dish meets the glove.
  function meet(d) {
    const K = KINDS[d.kind];
    const off = clamp(d.x - g.catchX(), -REACH, REACH);
    if (g.grip > 0) {
      const hup = g.gripAge <= PERFECT;
      d.vy = -(hup ? 750 : 590) * K.lift;
      if (hup) {
        // a good flick heads for the rack: as far as it needs, up to a limit
        const air = flight(d.vy, RACK_Y - HANDS);
        d.vx = clamp((RACK_MID - d.x) / air, 120, HUP_REACH);
      } else d.vx = 170 + off * 1.2;
      d.spin = (rng() - 0.5) * 10;
      d.flicks++;
      d.bounced = false;
      g.flicks++;
      g.grip = 0;
      g.caught = true;
      g.flick = 0.25;
      if (hup) {
        g.hups++;
        g.score++;
        sfx('catch', { pitch: Math.min(12, d.flicks * 3) });
        pop('Hup! +1', d.x, HANDS - 90, PAL.magenta, 40);
      } else {
        sfx('bonk');
        pop('Too soon', d.x, HANDS - 80, PAL.slate, 32);
      }
    } else if (d.bounced) {
      // a second time without a flick: too slippery, it slides off the glove
      d.slipped = true;
      d.vy = 120;
      d.vx = off >= 0 ? 260 : -260;
      sfx('miss');
      pop('Slippery!', d.x, HANDS - 80, PAL.slate, 34);
      return;
    } else {
      // no flick: it bounces off the rubber once, low and short
      d.bounced = true;
      d.vy = -312;
      d.vx = d.vx * 0.3 + off * 1.2;
      g.bounces++;
      sfx('bonk');
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

    // More dishes, and faster, as the pile goes down.
    g.spawnT -= dt;
    if (g.spawnT <= 0 && g.dishes.length < 2 + Math.round(4 * progress())) {
      spawn();
      g.spawnT = lerp(2.9, 1.1, progress()) * (0.85 + rng() * 0.3);
      if (g.queue > 0) g.queue--;
    } else if (g.spawnT <= 0) g.spawnT = 0.3;

    // The Dove runs along the counter.
    const px = g.x;
    if (input.pointer.active) {
      const tx = clamp(input.pointer.x - ARM_C, DOVE_MIN, DOVE_MAX); // the glove goes to the pointer
      const k = 1 - Math.exp(-16 * dt);
      g.x += clamp((tx - g.x) * k, -1600 * dt, 1600 * dt);
    } else {
      g.vx = approach(g.vx, (input.x || 0) * SPEED, 18, dt);
      g.x += g.vx * dt;
    }
    g.x = clamp(g.x, DOVE_MIN, DOVE_MAX);
    if (input.pointer.active) g.vx = (g.x - px) / Math.max(dt, 1e-3);

    // The flick: a press readies the fingers for a moment.
    g.rest = Math.max(0, g.rest - dt);
    g.gripAge += dt;
    // A press that catches nothing leaves the fingers fumbling a while longer.
    if (g.grip > 0 && g.grip - dt <= 0 && !g.caught) {
      g.rest = FUMBLE;
      g.fumbles++;
    }
    if (input.actionPressed && g.rest <= 0) {
      g.grip = GRIP;
      g.gripAge = 0;
      g.rest = REST;
      g.caught = false;
    } else g.grip = Math.max(0, g.grip - dt);
    g.flick = Math.max(0, g.flick - dt);
    g.cheer = Math.max(0, g.cheer - dt);
    g.dismay = Math.max(0, g.dismay - dt);

    for (const d of g.dishes) {
      const py = d.y;
      d.vy += GRAV * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.a += d.spin * dt;
      if (d.x < 30) {
        d.x = 30;
        d.vx = Math.abs(d.vx) * 0.5;
      }
      // onto the glove's fingers
      if (!d.slipped && d.vy > 0 && py < HANDS && d.y >= HANDS && Math.abs(d.x - g.catchX()) < REACH + KINDS[d.kind].half * 0.4 && d.x > SINK_X1) {
        d.y = HANDS;
        meet(d);
        continue;
      }
      // into the rack
      if (d.vy > 0 && py < RACK_Y && d.y >= RACK_Y && d.x > RACK_X0 && d.x < RACK_X1) {
        d.dead = true;
        g.put++;
        g.score += 3;
        g.racked.push(d.kind);
        g.cheer = 0.9;
        sfx('right');
        env.vibrate?.(30);
        pop('Put away! +3', d.x, RACK_Y - 120, PAL.magenta, 46);
        continue;
      }
      // back into the sink: it will pop up again
      if (d.x < SINK_X1 && d.y > SINK_Y + 20 && d.vy > 0) {
        d.dead = true;
        g.queue++;
        g.spawnT = Math.min(g.spawnT, 0.8);
        sfx('splash');
        continue;
      }
      // onto the counter, or off the end onto the floor
      if (d.y > COUNTER - 10 && d.x >= SINK_X1 && d.x <= RACK_X0) smash(d, d.x, COUNTER);
      else if (d.y > H + 40) smash(d, clamp(d.x, 40, W - 40), H - 30);
      else if (d.x > W + 60) smash(d, W - 40, H - 30);
    }
    g.dishes = g.dishes.filter((d) => !d.dead);

    for (const s of g.shards) {
      s.vy += 1600 * dt;
      s.x += s.vx * dt;
      s.y = Math.min(s.y + s.vy * dt, H - 10);
      s.a += s.va * dt;
      s.life -= dt;
    }
    g.shards = g.shards.filter((s) => s.life > 0);
    for (const h of g.heaps) h.life -= dt;
    g.heaps = g.heaps.filter((h) => h.life > 0);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Points ${g.score}`;
  g.summary = () => {
    const lines = [`${g.put} dish${g.put === 1 ? '' : 'es'} put away, ${g.hups} “Hup!” flick${g.hups === 1 ? '' : 's'}.`];
    lines.push(g.smashed ? `${g.smashed} smashed on the way.` : 'Not a single dish broken!');
    return lines;
  };

  // ---------- drawing ----------

  function standinKitchen(c) {
    // the wall, a window, the counter, the sink and the rack, from the side
    band(c, 0, 0, W, COUNTER, '#e4e6d2', 0.55, 1);
    c.save();
    c.globalAlpha = 0.22;
    for (let y = 80; y < COUNTER - 40; y += 70) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y + 2);
      ink(c, 1.2);
      c.stroke();
    }
    c.restore();
    poly(c, [[620, 60], [980, 60], [980, 260], [620, 260]], 2, 1);
    wash(c, '#c9d9e0', 0.8);
    ink(c, 2.4);
    c.beginPath();
    c.moveTo(800, 60);
    c.lineTo(800, 260);
    ink(c, 2);
    c.stroke();
    // the counter and the cupboards under it
    poly(c, [[0, COUNTER], [W, COUNTER + 2], [W, COUNTER + 26], [0, COUNTER + 24]], 3, 1);
    wash(c, '#c9925a');
    ink(c, 2.4);
    poly(c, [[0, COUNTER + 24], [W, COUNTER + 26], [W, H], [0, H]], 4, 1);
    wash(c, '#d9c8a0', 0.7);
    ink(c, 1.6);
    for (let x = 200; x < W; x += 260) {
      c.beginPath();
      c.moveTo(x, COUNTER + 34);
      c.lineTo(x, H);
      ink(c, 1.6);
      c.stroke();
    }
    // the sink: a white basin full of suds
    poly(c, [[30, SINK_Y - 20], [SINK_X1, SINK_Y - 20], [SINK_X1 - 20, COUNTER + 10], [50, COUNTER + 10]], 5, 1.5);
    wash(c, '#ece8de');
    ink(c, 2.6);
    for (let i = 0; i < 9; i++) {
      blob(c, 60 + i * 32, SINK_Y - 18 - (i % 3) * 10, 30, 20, i, 0.2);
      c.fillStyle = '#fbfaf4';
      c.fill();
      ink(c, 1.2, 'rgba(90,110,130,0.6)');
      c.stroke();
    }
    c.beginPath();
    c.moveTo(180, SINK_Y - 30);
    c.lineTo(180, SINK_Y - 150);
    c.quadraticCurveTo(180, SINK_Y - 190, 230, SINK_Y - 180);
    ink(c, 12, '#b8bcc0');
    c.stroke();
    // the plate rack: a wire frame on a tray
    poly(c, [[RACK_X0 - 20, COUNTER - 16], [RACK_X1 + 20, COUNTER - 16], [RACK_X1 + 20, COUNTER], [RACK_X0 - 20, COUNTER]], 6, 1);
    wash(c, '#a9b0b8');
    ink(c, 2);
    for (let i = 0; i <= 10; i++) {
      const x = RACK_X0 + (i * (RACK_X1 - RACK_X0)) / 10;
      c.beginPath();
      c.moveTo(x, COUNTER - 16);
      c.lineTo(x, RACK_Y + 10);
      ink(c, 2.2, '#7a848c');
      c.stroke();
    }
    c.beginPath();
    c.moveTo(RACK_X0, RACK_Y + 10);
    c.lineTo(RACK_X1, RACK_Y + 10);
    ink(c, 3, '#7a848c');
    c.stroke();
  }

  // A dish, from the side, centred on (0, 0).
  function dishShape(c, kind) {
    const K = KINDS[kind];
    const h = K.half;
    if (drawSprite(c, 'sprites.dishes', kind, 0, 0, { w: h * 2 + (kind >= 3 ? h * 0.9 : kind === 2 ? 20 : 0), anchor: 'center' })) return;
    if (K.name === 'plate' || K.name === 'pie dish') {
      blob(c, 0, 0, h, K.name === 'plate' ? 13 : 20, kind + 1, 0.04, 16);
      wash(c, K.face);
      ink(c, 2.2);
      c.beginPath();
      c.ellipse(0, -3, h * 0.7, 5, 0, 0, Math.PI * 2);
      ink(c, 2, K.rim);
      c.stroke();
    } else if (K.name === 'bowl') {
      c.beginPath();
      c.moveTo(-h, -16);
      c.quadraticCurveTo(-h * 0.9, 34, 0, 34);
      c.quadraticCurveTo(h * 0.9, 34, h, -16);
      c.closePath();
      wash(c, K.face);
      ink(c, 2.2);
      c.stroke();
      c.beginPath();
      c.moveTo(-h, -16);
      c.lineTo(h, -16);
      ink(c, 4, K.rim);
      c.stroke();
    } else if (K.name === 'cup') {
      poly(c, [[-h, -30], [h, -30], [h * 0.8, 30], [-h * 0.8, 30]], 3, 1);
      wash(c, K.face);
      ink(c, 2.2);
      c.beginPath();
      c.ellipse(h + 6, 0, 14, 18, 0, 0, Math.PI * 2);
      ink(c, 7, K.rim);
      c.stroke();
    } else {
      // pans: a body and a long handle to the right
      poly(c, [[h - 6, -10], [h + h * 0.9, -14], [h + h * 0.9, -2], [h - 6, 4]], 4, 1);
      wash(c, K.name === 'frying pan' ? '#3a2a20' : '#7a7f86');
      ink(c, 2);
      poly(c, [[-h, -14], [h, -14], [h * 0.92, K.name === 'saucepan' ? 40 : 12], [-h * 0.92, K.name === 'saucepan' ? 40 : 12]], 5, 1);
      wash(c, K.face);
      ink(c, 2.2);
    }
    // a wet shine
    c.save();
    c.globalAlpha = 0.6;
    c.beginPath();
    c.moveTo(-h * 0.5, -8);
    c.lineTo(-h * 0.2, -10);
    ink(c, 3, '#ffffff');
    c.stroke();
    c.restore();
  }

  function drawDove(c, t) {
    const x = g.x;
    // where each falling dish will come down: a ring on the counter under it
    for (const d of g.dishes) {
      const l = g.landing(d);
      if (!l || d.vy < -200 || l.x < SINK_X1 || l.x > RACK_X0) continue;
      const near = clamp(1 - l.t / 1.2, 0, 1);
      c.save();
      c.globalAlpha = 0.2 + 0.5 * near;
      c.beginPath();
      c.ellipse(l.x, COUNTER + 4, 30 + 30 * (1 - near), 8, 0, 0, Math.PI * 2);
      ink(c, 3, Math.abs(l.x - g.catchX()) < REACH ? PAL.magenta : '#5a6a88');
      c.stroke();
      c.restore();
    }
    // the shadow
    c.save();
    c.globalAlpha = 0.18;
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(x, COUNTER + 4, 80, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    const flip = false; // always facing the sink
    const run = Math.abs(g.vx) > 60 && !env.reduceMotion ? Math.abs(Math.sin(t * 16)) * 6 : 0;
    c.save();
    c.translate(x, COUNTER - run);
    c.rotate(clamp(g.vx / 9000, -0.1, 0.1));
    const pose = g.dismay > 0 ? 'dismay' : g.cheer > 0 ? 'cheer' : g.flick > 0 ? 'flick' : g.grip > 0 || g.bracing() ? 'brace' : null;
    let drawn = false;
    if (pose) {
      const [key, i, fy, fx] = POSE[pose];
      drawn = drawSprite(c, key, i, (0.5 - fx) * CELL, (1 - fy) * CELL, { w: CELL, whole: true, flip });
    }
    if (!drawn) {
      // the portrait tips its glove up to flick, braces to catch, hops to
      // cheer, droops in dismay
      if (g.flick > 0) c.rotate(-0.14 * (g.flick / 0.25));
      else if (pose === 'brace') c.scale(1.03, 0.97);
      if (g.cheer > 0 && !env.reduceMotion) c.translate(0, -Math.abs(Math.sin(g.cheer * 12)) * 22);
      if (g.dismay > 0) c.scale(1.06, 0.9);
      drawBird(c, 'glovedove', { x: 0, y: 0, size: SIZE, t, flip });
    }
    c.restore();
  }

  function drawRack(c) {
    const n = g.racked.length;
    const slots = 10;
    for (let i = Math.max(0, n - slots); i < n; i++) {
      const K = KINDS[g.racked[i]];
      const x = RACK_X0 + 14 + (i % slots) * ((RACK_X1 - RACK_X0 - 28) / (slots - 1));
      // a dish stood on its edge in the rack: its side view, turned upright
      if (drawSprite(c, 'sprites.dishes', g.racked[i], x, COUNTER - 16 - K.half, { w: K.half * 2, anchor: 'center', rot: -Math.PI / 2 })) continue;
      const h = K.half * 1.5;
      c.save();
      c.translate(x, COUNTER - 16);
      c.scale(0.22, 1);
      blob(c, 0, -h / 2, K.half, h / 2, i, 0.02);
      wash(c, K.face);
      ink(c, 6);
      c.restore();
    }
  }

  g.draw = (c, t) => {
    scene(c, 'glovedove', W, H, standinKitchen);
    drawRack(c);
    drawDove(c, t);
    for (const d of g.dishes) {
      c.save();
      c.translate(d.x, d.y);
      c.rotate(Math.sin(d.a) * 0.5);
      dishShape(c, d.kind);
      c.restore();
    }
    // a smashed dish: its painted heap, or (until that arrives) flying bits
    const painted = !!spriteCell('sprites.dishShards', 0);
    for (const h of g.heaps) {
      if (!painted) break;
      drawSprite(c, 'sprites.dishShards', h.kind, h.x, h.y + 6, { w: KINDS[h.kind].half * 2.4, alpha: clamp(h.life * 1.5, 0, 1) });
    }
    for (const s of painted ? [] : g.shards) {
      c.save();
      c.globalAlpha = clamp(s.life * 2, 0, 1);
      c.translate(s.x, s.y);
      c.rotate(s.a);
      poly(c, [[-10, -6], [12, -3], [2, 8]], 1, 0.5);
      wash(c, s.color);
      ink(c, 1.4);
      c.restore();
    }
    for (const p of g.pops) {
      const k = Math.min(1, (1.1 - p.life) * 8);
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
    if (g.elapsed < 5) {
      c.save();
      c.globalAlpha = Math.min(1, 5 - g.elapsed);
      const msg = 'Run under each dish · press as it lands to flick it to the rack';
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = '600 34px Fraunces, Georgia, serif';
      c.textAlign = 'center';
      c.strokeText(msg, W / 2, 232);
      label(c, msg, W / 2, 232, { size: 34, weight: 600 });
      c.restore();
    }
  };

  // On a narrow screen: follow the Dove, leaning towards the rack.
  g.focus = () => clamp(g.x + 150, 650, 950);
  g.span = 1100;

  return g;
}

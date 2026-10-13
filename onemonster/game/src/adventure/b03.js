// Board 3: the Bombanat-Munching Grumley, "A Nice Bombanat Lunch"
// (design/adventure.md, section 3). The Blue Ocean of Bubbley Goo in
// cross-section: sky above, the glossy surface at SURF, the goo below down to
// a sandy floor. The Grumley swims in any direction under the goo, heavy and
// floaty; Sprint squirts a jet of goo for a dash; Action lunges a crab claw
// the way the stick points (up, if it is idle), out of the goo when he is near
// the surface. Swimming up fast at the surface leaps him right out, in a
// splash. Plain Bombanats skim the goo to be grabbed for the lunch basket; the
// one in the striped necktie flies ahead and lands on the island at the end,
// where he is grabbed, letter and all. Sections: the shallows (learn the
// lunge), the weed forest (scowling fish, the giant eye), the fishing grounds
// (anchors and nets from boats on the surface), the whirlpools and the big goo
// bubbles, then the island.
//
// Borrowed from chapters/ch03.js: the goo bubbles and wake, the claw lunge
// and the net that comes down in the outro.

import * as art from '../art.js';
import * as kit from './kit.js';
import { BOARDS } from './index.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';

const { W, H, clamp, ease, near } = kit;
const ENTRY = BOARDS.find((b) => b.n === 3);
const SHEET = 'adv.b03.props';
const TERRAIN = 'terrain.goo';
const INK = '#1b2a3a';
// The Grumley's key poses are scaled so that his lurk pose (horns and eyes)
// stands M.height tall; the full-body poses used under the goo are about 2.5
// times that, so this sizeK makes him about 250 px tall.
const SIZE = 0.4;
const STRIP_H = 124, STRIP_LIFT = 34; // the surface strip: height on screen, crests above the line
const HALF = 125; // half his height: his (x, y) is his middle

export const SURF = 380; // the goo's surface (world y)
export const FLOOR = 1000; // the top of the sea floor
export const WORLD = 15000;
const sx = (x) => Math.round(x * 1.25); // the layout was laid out at 12,000 wide

export const TUNE = {
  speed: 300, swimRate: 3.4, floatUp: 16, munchSlow: 0.45,
  jetV: 980, jetT: 0.32, jetCd: 1.3,
  gravity: 2400, leapV: 520, surfY: SURF - 60, bottomY: FLOOR - 112, radius: 82,
  reach: 260, lungeOut: 0.16, lungeHold: 0.1, lungeBack: 0.22, lungeCd: 0.18, clawR: 64,
  dazeT: 0.9, nipV: 320,
  fishV: 165, fishAlert: 0.45, fishDart: 640, fishDartT: 0.5, fishRange: 300,
  eyeRange: 440, eyeOpenT: 0.7, tentacleEvery: 1.7, tentacleWarn: 0.5, tentacleRise: 0.45, tentacleH: 560,
  anchorRange: 430, anchorRattle: 0.85, anchorV: 1050, anchorDown: 1.4, anchorUp: 240,
  netRange: 210, netCreak: 0.45, netV: 780, netReady: SURF + 60, netMax: SURF + 340, netHang: 1.0, netUp: 230, netMash: 6,
  whirlR: 330, whirlPull: 620, whirlDown: 320, spunT: 1.2,
  bubbleEvery: 3.2, bubbleV: 215, bubbleR: 88,
  holderLead: 820, holderV: 520, scareT: 3.5,
};

// ---------- ink helpers (the book's hand-drawn look) ----------

const ROCK = { wash: '#5f6b74', light: 'rgba(200,205,205,0.22)', shade: 'rgba(27,42,58,0.2)' };
const WEED = { light: '#3f9480', dark: '#2d7067' };
const FISH = { wash: '#86a35e', angry: '#9bb45f', belly: 'rgba(225,230,180,0.55)', fin: '#9fb878' };
const BOAT = { teal: '#2f8088', blue: '#3c6b9a', wood: '#a8773f', woodDark: '#7a4f2a', brass: '#d8b56a' };
const IRON = { wash: '#6b7580', dark: '#4e5862' };

const jit = (seed, a) => (kit.hash(seed) - 0.5) * a;

// A hand-drawn line through points [[x, y], ...]: each point and each midpoint
// jittered by up to w px, so nothing is ruler-straight. Begins the path only;
// the caller fills, strokes or clips.
function inkLine(g, pts, { close = false, w = 2.5, seed = 0 } = {}) {
  g.beginPath();
  const P = pts.map(([x, y], i) => [x + jit(seed + i * 3.1, w), y + jit(seed + i * 7.7 + 1, w)]);
  g.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i];
    g.quadraticCurveTo((x0 + x1) / 2 + jit(seed + i * 13, w), (y0 + y1) / 2 + jit(seed + i * 17 + 2, w), x1, y1);
  }
  if (close) g.closePath();
}

// Hatching over a rectangle (clip first): parallel pen lines at an angle, and
// crosshatching when asked.
function hatch(g, x, y, w, h, { step = 9, angle = -0.7, colour = 'rgba(27,42,58,0.35)', width = 1.6, cross = false } = {}) {
  g.save();
  g.strokeStyle = colour; g.lineWidth = width; g.lineCap = 'round';
  g.translate(x + w / 2, y + h / 2);
  g.rotate(angle);
  const R = Math.hypot(w, h) / 2;
  g.beginPath();
  for (let s = -R; s < R; s += step) { g.moveTo(-R, s + jit(s, 3)); g.lineTo(R, s + jit(s + 1, 3)); }
  if (cross) { g.rotate(Math.PI / 2); for (let s = -R; s < R; s += step * 1.5) { g.moveTo(-R, s + jit(s + 2, 3)); g.lineTo(R, s + jit(s + 3, 3)); } }
  g.stroke();
  g.restore();
}

// ---------- the board's layout ----------

const ISLAND = { x: sx(11150), y: 92, w: 395, h: H - 92 }; // the delivered island, 400 tall, its waterline at SURF
const PERCH = { x: ISLAND.x + 100, y: 250 - 66 }; // where the letter Bombanat lands, on the island's left slope (his middle; feet on the rock)
const PILLAR = { x: sx(2150), top: 330 }; // a knobbly rock poking above the goo
const CHECKPOINTS = [300, 2600, 5200, 8000, 10600].map(sx);

function layout(rng) {
  const R = (a, b) => a + rng() * (b - a);
  const fliers = [];
  const skim = (x0, span = 170) => { const x = sx(x0); fliers.push({ kind: 'skim', x, x0: x - span, x1: x + span, baseY: SURF - R(110, 170), amp: R(12, 26), speed: R(120, 170) }); };
  const high = (x0, y, span = 220) => { const x = sx(x0); fliers.push({ kind: 'high', x, x0: x - span, x1: x + span, baseY: y, amp: R(14, 30), speed: R(140, 190) }); };
  // y is the top of what it sits on; a plain Bombanat hangs from its middle, 52 px above its feet.
  const perched = (x, y, dir = 1) => fliers.push({ kind: 'perched', x, y: y - 52, x0: x - 160, x1: x + 160, baseY: SURF - 130, amp: 16, speed: 150, dir });
  // 1. The shallows.
  for (const x of [900, 1250, 1600, 1950, 2350]) skim(x);
  perched(PILLAR.x + 4, PILLAR.top - 2, -1); // on the pillar's peak (perched takes world x)
  skim(2000, 120);
  // 2. The weed forest.
  for (const x of [2900, 3250, 3600, 4000, 4350, 4700, 5000]) skim(x);
  high(3150, 185);
  high(4600, 180);
  // 3. The fishing grounds.
  for (const x of [5420, 5850, 6350, 6850, 7250, 7700]) skim(x, 140);
  perched(sx(6100) - 35, SURF - 136, 1); // on a wheelhouse roof
  perched(sx(7020) - 35, SURF - 136, -1);
  // 4. The whirlpools.
  high(8250, 180);
  high(8950, 188);
  high(9750, 176);
  high(10400, 184);
  for (const x of [8700, 9500, 10200]) skim(x);
  // 5. The island.
  perched(ISLAND.x + 215, ISLAND.y + 6, -1);
  perched(ISLAND.x + 330, 190, 1);
  for (const f of fliers) {
    f.dir = f.dir ?? (rng() < 0.5 ? -1 : 1);
    f.ph = rng() * 6.28;
    f.y = f.y ?? f.baseY;
    f.got = false;
    f.startle = 0;
    f.scatter = 0;
    f.c = art.makeCreature('bombanatPlain', f.x, f.y);
    f.c.sizeK = 0.6;
    f.c.facing = f.dir;
  }

  const fish = [];
  const addFish = (a, b, y, v = TUNE.fishV) => fish.push({ x: sx(a) + rng() * sx(b - a), y, x0: sx(a), x1: sx(b), dir: rng() < 0.5 ? -1 : 1, v, state: 'patrol', T: 0, ph: rng() * 6 });
  addFish(2700, 3400, 700);
  addFish(3000, 3900, 880);
  addFish(3900, 4700, 640);
  addFish(4200, 5100, 820);
  addFish(4600, 5150, 930);
  addFish(8300, 9000, 560);
  addFish(9600, 10500, 600);

  const boats = [
    { x: 5600, kind: 'anchor' }, { x: 6100, kind: 'net' }, { x: 6600, kind: 'anchor' },
    { x: 7020, kind: 'net' }, { x: 7450, kind: 'net' }, { x: 7850, kind: 'anchor' },
  ].map((b) => ({ ...b, x: sx(b.x) }));
  for (const b of boats) {
    b.state = 'ready';
    b.T = 0;
    b.cool = 0;
    b.hx = b.x + (b.kind === 'anchor' ? 150 : 170); // where the anchor or net hangs
    b.y = b.kind === 'anchor' ? SURF + 30 : TUNE.netReady;
  }
  const whirlpools = [8500, 9300, 10100].map(sx).map((x) => ({ x, y: FLOOR - 30, R: TUNE.whirlR, ph: rng() * 6 }));
  const vents = [8200, 8900, 10000, 10400].map(sx).map((x, i) => ({ x, T: 1 + i * 0.8 }));
  const weeds = [2750, 2980, 3300, 3480, 3950, 4150, 4850, 5100, 8450, 9150, 9900, 10300].map(sx).map((x) => ({ x, h: 300 + hashAt(x) * 170, flip: hashAt(x + 1) < 0.5 }));
  const rocks = [1500, 2700, 3380, 4250, 4950, 5900, 6800, 7600, 8800, 9600, 10800].map(sx).map((x) => ({ x, h: 180 + hashAt(x + 2) * 170, flip: hashAt(x + 3) < 0.5 }));
  const tubs = [{ x: sx(1200) }, { x: sx(6400), flip: true }];
  return { fliers, fish, boats, whirlpools, vents, weeds, rocks, tubs };
}

const hashAt = (n) => kit.hash(n * 0.37 + 11);

// kit.makeHints, but drawn low on the screen (over the sea floor): the sky
// above the goo is where the Bombanats, boats and the route strip are.
// (Suggestion for the kit: a y option on makeHints.)
function makeLowHints(list, { show = 4, y = 1010 } = {}) {
  const items = list.map((h) => ({ ...h, t: -1 }));
  let cur = null;
  return {
    update(dt, px) {
      for (const h of items) if (h.t < 0 && px >= h.x) { h.t = 0; cur = h; }
      if (cur) cur.t += dt;
      if (cur && cur.t > (cur.show ?? show)) cur = null;
    },
    say(text, secs = 2.5) { cur = { text, t: 0, show: secs }; },
    draw(g) {
      if (!cur) return;
      const s = cur.show ?? show;
      kit.hint(g, cur.text, { alpha: Math.min(1, cur.t * 4, (s - cur.t) * 2), y, size: 38 });
    },
  };
}

// ---------- the board ----------

export default function create(env) {
  const T = TUNE;
  const gentle = !!env.gentle?.[0];
  const rng = env.rng;
  const reach = T.reach + (gentle ? 70 : 0);
  const clawR = T.clawR + (gentle ? 18 : 0);
  const total = kit.boardTime(env, ENTRY.time);
  const world = layout(rng);
  const { fliers, fish, boats, whirlpools, vents } = world;
  const cam = kit.makeCamera(WORLD, { lead: 300, anchor: 0.38 });
  const parts = kit.makeParticles();
  const cps = kit.makeCheckpoints(CHECKPOINTS);
  const hints = makeLowHints([
    { x: 0, text: 'Swim with the stick: under the goo you can go anywhere' },
    { x: sx(700), text: 'Action: lunge a claw up at a Bombanat skimming the goo!' },
    { x: sx(1500), text: 'Sprint: squirt a jet of goo. Swim up fast to leap out!' },
    { x: sx(2600), text: 'Scowling fish nip. And something is asleep in the rocks...' },
    { x: sx(5200), text: 'Boats! Anchors drop and nets come down. Nets can’t reach the bottom' },
    { x: sx(8000), text: 'Whirlpools pull you down. A big goo bubble carries you up and out!' },
    { x: sx(10600), text: 'The island! Wait for him to land, then grab him' },
  ]);
  let t = 0;
  let outroT = 0;
  let first = true;
  const bubbles = []; // small goo bubbles: { x, y, t, life, s }
  const bigBubbles = []; // carriers: { x, y, r, t, popped }
  const lunch = []; // a grabbed Bombanat on its way to the basket (screen space): { sx, sy, t }
  const rings = []; // splash rings on the surface: { x, t, life, size }
  let basketKick = 0;
  let got = 0;
  let netCount = 0;
  let outroNet = null;

  // The Grumley: (x, y) is the middle of his body.
  const G = {
    x: 300, y: SURF + 240, vx: 0, vy: 0, facing: 1, mode: 'swim', modeT: 0, air: false,
    lunge: null, lungeCd: 0, jetT: 0, jetCd: 0, jetDir: { x: 1, y: 0 }, wasSprint: false,
    munchT: 0, bubble: null, bubbleLeave: 0, bubbleT: 0.4, rippleT: 0, net: null, mash: 0,
    flung: null, c: art.makeCreature('grumley', 300, SURF + 240),
  };
  G.c.sizeK = SIZE;
  // The holder: the Bombanat in the necktie, flying ahead.
  const L = {
    x: G.x + T.holderLead, y: 235, vx: 0, vy: 0, mode: 'fly', scare: 0, perchT: 0, ph: 0, flapT: 0,
    c: art.makeCreature('bombanat', 0, 0),
  };
  L.c.sizeK = 0.85;
  const eye = { x: sx(3700), y: FLOOR - 150, state: 'shut', T: 0, open: 0, next: 0.6, tentacles: [] };

  // ---------- helpers ----------

  const moves = () => !!art.sprite('grumley.moves', 1);
  // The moves sheet's fallbacks are the goo-line poses; until it arrives, the
  // board picks full-body key poses that read under the goo.
  const pose = (name, fallback) => (moves() ? name : fallback);
  const say = (text, x, y, colour) => parts.pop(x, y, text, colour ? { colour } : undefined);
  function setMode(m) { G.mode = m; G.modeT = 0; }

  function addBubble(x, y, s, life) { bubbles.push({ x, y, t: 0, life, s }); }

  function splash(x, n = 10, power = 1) {
    parts.burst(x, SURF, { n, colour: '#5aa0dc', speed: 420 * power, up: 0.75, size: 11, life: 0.7, gravity: 1500 });
    rings.push({ x, t: 0, life: 0.45, size: 95 * power });
  }

  function shake(a) { cam.shake(a, env.reduceMotion); }

  // ---------- the Grumley ----------

  function startLunge(ix, iy) {
    let dx = ix, dy = iy;
    const m = Math.hypot(dx, dy);
    if (m < 0.3) { dx = 0; dy = -1; } else { dx /= m; dy /= m; }
    G.lunge = { dx, dy, R: reach, t: 0, k: 0, hit: false, tipX: G.x, tipY: G.y };
    env.sfx('swoosh');
    art.kick(G.c, -0.5);
    if (dy < -0.4 && G.y - reach < SURF) { splash(G.x, 5, 0.5); env.sfx('splash'); }
    if (Math.abs(dx) > 0.3) G.facing = Math.sign(dx);
  }

  // What the claw closes on along its arm: the letter Bombanat first, then a
  // plain one.
  function clawCheck() {
    const Lg = G.lunge;
    const ax = G.x, ay = G.y - 20;
    const hitAt = (px, py, r) => {
      const dx = Lg.tipX - ax, dy = Lg.tipY - ay;
      const len2 = dx * dx + dy * dy || 1;
      const u = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0.25, 1);
      return near(ax + dx * u, ay + dy * u, px, py, clawR + r);
    };
    if (L.mode !== 'grabbed' && hitAt(L.x, L.y, 52)) return { letter: true };
    for (const f of fliers) if (!f.got && hitAt(f.x, f.y, 44)) return { flier: f };
    return null;
  }

  function stepLunge(dt) {
    const Lg = G.lunge;
    Lg.t += dt;
    const { lungeOut: o, lungeHold: h, lungeBack: b } = T;
    Lg.k = Lg.t < o ? Math.sin((Lg.t / o) * Math.PI / 2) : Lg.t < o + h ? 1 : Math.max(0, 1 - (Lg.t - o - h) / b);
    Lg.tipX = G.x + Lg.dx * Lg.R * Lg.k;
    Lg.tipY = G.y - 20 + Lg.dy * Lg.R * Lg.k;
    if (!Lg.hit && Lg.t < o + h) {
      const hit = clawCheck();
      if (hit) grab(hit);
    }
    if (G.lunge && Lg.t >= o + h + b) {
      G.lunge = null;
      G.lungeCd = T.lungeCd;
      if (!Lg.hit) miss();
    }
  }

  function miss() {
    env.sfx('snap');
    // The letter Bombanat is scared higher by a miss anywhere near him.
    if (L.mode !== 'grabbed' && Math.abs(L.x - G.x) < 620 && (L.mode !== 'fly' || L.y > 90)) {
      L.scare = T.scareT;
      if (L.mode !== 'fly') { L.mode = 'fly'; say('Eek!', L.x, L.y - 90); }
    }
    for (const f of fliers) if (!f.got && Math.abs(f.x - G.x) < 420) f.scatter = 1.2;
  }

  function grab(hit) {
    const Lg = G.lunge;
    Lg.hit = true;
    env.sfx('snap');
    env.vibrate(60);
    if (hit.letter) {
      L.mode = 'grabbed';
      setMode('won');
      self.done = true;
      self.outcome = 'snatched';
      splash(G.x, 16, 1.2);
      shake(10);
      say('SNAP!', G.x, G.y - 220);
      return;
    }
    const f = hit.flier;
    f.got = true;
    got += 1;
    G.munchT = 0.7;
    env.sfx('slurp');
    say('Lunch!', f.x, f.y + 70);
    lunch.push({ sx: f.x - cam.x, sy: f.y, t: 0 });
    for (const o of fliers) if (!o.got && o !== f && Math.abs(o.x - G.x) < 360) o.scatter = 0.9;
  }

  function daze(secs, text, vx, vy) {
    setMode('dazed');
    G.dazeT = secs;
    G.lunge = null;
    G.vx = vx; G.vy = vy;
    env.sfx('bonk');
    env.vibrate(50);
    shake(8);
    art.kick(G.c, 0.6);
    say(text, G.x, G.y - 170);
  }

  function stepGrumley(inp, dt) {
    const ix = clamp(inp.x || 0, -1, 1), iy = clamp(inp.y || 0, -1, 1);
    G.modeT += dt;
    G.lungeCd = Math.max(0, G.lungeCd - dt);
    G.jetCd = Math.max(0, G.jetCd - dt);
    G.jetT = Math.max(0, G.jetT - dt);
    G.munchT = Math.max(0, G.munchT - dt);
    const sprintEdge = !!inp.sprint && !G.wasSprint;
    G.wasSprint = !!inp.sprint;

    if (G.mode === 'netted') {
      // Held in the net, which winches him up slowly; mashing Action wriggles him free.
      const n = G.net;
      n.y = Math.max(SURF + 60, n.y - 60 * dt);
      G.x = n.hx; G.y = n.y;
      G.vx = 0; G.vy = 0;
      if (inp.actionPressed) {
        G.mash += 1;
        env.sfx('tug');
        art.kick(G.c, 0.4);
        if (G.mash >= (gentle ? 4 : T.netMash)) {
          env.sfx('free');
          say('Free!', G.x, G.y - 190);
          n.state = 'rise';
          n.T = 0;
          G.net = null;
          setMode('swim');
          G.vy = 260;
          G.lungeCd = 0.3;
          splash(G.x, 6, 0.6);
        }
      }
      return;
    }
    if (G.mode === 'flung') {
      const f = G.flung;
      f.t += dt;
      const u = Math.min(1, f.t / 0.9);
      G.x = f.x0 + (f.x1 - f.x0) * u;
      G.y = f.y0 + (f.y1 - f.y0) * u - Math.sin(u * Math.PI) * 240;
      G.c.rot = -u * 6.3;
      if (u >= 1) { G.c.rot = 0; daze(0.5, 'Oof!', 0, 0); }
      return;
    }
    if (G.mode === 'dazed' || G.mode === 'spun') {
      G.vx *= Math.exp(-3 * dt); G.vy *= Math.exp(-3 * dt);
      G.x += G.vx * dt; G.y += G.vy * dt;
      if (G.mode === 'spun') G.c.rot += 11 * dt; else G.c.rot = 0;
      G.y = clamp(G.y, T.surfY, T.bottomY);
      if (G.modeT >= (G.mode === 'spun' ? T.spunT : G.dazeT)) {
        if (G.mode === 'spun') spitOut();
        G.c.rot = 0;
        setMode('swim');
      }
      return;
    }
    if (G.mode === 'won') return;

    if (G.bubble) {
      // Riding a big goo bubble up: it carries him; swimming hard sideways gets out.
      const b = G.bubble;
      G.x = b.x + ix * 30; G.y = b.y;
      G.vx = ix * 60; G.vy = -T.bubbleV;
      G.bubbleLeave = Math.abs(ix) > 0.6 ? G.bubbleLeave + dt : 0;
      if (G.bubbleLeave > 0.35 || b.popped) {
        G.bubble = null;
        G.vx = ix * T.speed;
        if (!b.popped) { env.sfx('pop'); b.popped = true; b.t = 0; }
      }
    } else if (G.air) {
      // Out of the goo: a leap, under gravity, a little steering.
      G.vy += T.gravity * dt;
      G.vx = ease(G.vx, ix * 160 + G.vx * 0.6, 2, dt);
      G.x += G.vx * dt; G.y += G.vy * dt;
      if (G.y >= T.surfY && G.vy > 0) {
        G.air = false;
        G.vy *= 0.45;
        env.sfx('splash');
        splash(G.x, 12, 1);
        art.kick(G.c, 0.5);
        shake(4);
      }
    } else {
      // Swimming: heavy and floaty.
      if (sprintEdge && G.jetCd <= 0) {
        const m = Math.hypot(ix, iy);
        G.jetDir = m > 0.3 ? { x: ix / m, y: iy / m } : { x: G.facing, y: 0 };
        G.jetT = T.jetT;
        G.jetCd = T.jetCd;
        env.sfx('bubble');
        env.sfx('swoosh');
        art.kick(G.c, -0.4);
        for (let i = 0; i < 6; i++) addBubble(G.x - G.jetDir.x * 60 + (rng() - 0.5) * 50, G.y + (rng() - 0.5) * 60, 0.8 + rng() * 0.5, 0.6 + rng() * 0.5);
      }
      const slow = G.munchT > 0 ? T.munchSlow : 1; // licking his lips
      let tvx = ix * T.speed * slow, tvy = iy * T.speed * 0.9 * slow;
      if (G.jetT > 0) { tvx = G.jetDir.x * T.jetV; tvy = G.jetDir.y * T.jetV; }
      else if (!ix && !iy) tvy = -T.floatUp;
      const rate = G.jetT > 0 ? 12 : T.swimRate;
      G.vx = ease(G.vx, tvx, rate, dt);
      G.vy = ease(G.vy, tvy, rate, dt);
      stepWhirlpools(dt);
      G.x += G.vx * dt; G.y += G.vy * dt;
      if (G.y < T.surfY) {
        if (G.vy < -T.leapV) {
          G.air = true;
          env.sfx('splash');
          env.vibrate(25);
          splash(G.x, 14, 1.1);
          art.kick(G.c, -0.5);
        } else { G.y = T.surfY; G.vy = Math.max(0, G.vy) * 0.3; }
      }
      if (G.y > T.bottomY) { G.y = T.bottomY; G.vy = Math.min(0, G.vy); }
      // Bubbles and the wake.
      const sp = Math.hypot(G.vx, G.vy);
      G.bubbleT -= dt;
      if (G.bubbleT <= 0) {
        const jet = G.jetT > 0;
        G.bubbleT = jet ? 0.06 : sp > 40 ? 0.45 - 0.25 * Math.min(1, sp / T.speed) : 1.6 + rng();
        addBubble(G.x - G.facing * (50 + rng() * 60) + (rng() - 0.5) * 40, G.y + (rng() - 0.5) * 80, (jet ? 0.9 : 0.55) + rng() * 0.4, 0.8 + rng() * 0.7);
      }
    }
    // The island is solid.
    if (G.y + T.radius > ISLAND.y && G.x + T.radius > ISLAND.x) { G.x = ISLAND.x - T.radius; G.vx = Math.min(0, G.vx); }
    G.x = clamp(G.x, 120, WORLD - 120);
    if (Math.abs(G.vx) > 30 && !G.lunge) G.facing = Math.sign(G.vx);
    // The lunge.
    if (inp.actionPressed && !G.lunge && G.lungeCd <= 0 && G.mode === 'swim') startLunge(ix, iy);
    if (G.lunge) stepLunge(dt);
  }

  function stepWhirlpools(dt) {
    if (G.jetT > 0 && G.jetT > T.jetT * 0.5) return; // the first half of a jet pulls clear
    const k0 = gentle ? 0.6 : 1;
    for (const w of whirlpools) {
      const dx = w.x - G.x, dy = w.y - G.y;
      const d = Math.hypot(dx, dy);
      if (d > w.R) continue;
      const k = (1 - d / w.R) * k0;
      G.vx += (dx / d) * T.whirlPull * k * dt;
      G.vy += ((dy / d) * T.whirlPull * 0.6 + T.whirlDown) * k * dt;
      if (d < 85) {
        setMode('spun');
        G.spunAt = w;
        G.lunge = null;
        env.sfx('whoosh');
        env.vibrate(60);
        shake(8);
        say('Whirled!', G.x, G.y - 170);
      }
    }
  }

  // Spat out of the whirlpool, up and onward.
  function spitOut() {
    const w = G.spunAt;
    G.x = w.x + 300;
    G.y = SURF + 230;
    G.vx = 240;
    G.vy = -520;
    env.sfx('splash');
    for (let i = 0; i < 8; i++) addBubble(G.x + (rng() - 0.5) * 100, G.y + (rng() - 0.5) * 100, 0.7 + rng() * 0.5, 0.6 + rng() * 0.6);
  }

  // ---------- the fliers ----------

  function stepFliers(dt) {
    for (const f of fliers) {
      if (f.got) continue;
      f.scatter = Math.max(0, f.scatter - dt);
      if (f.kind === 'perched') {
        // Sits still until the Grumley comes close near the surface, then takes off.
        const close = Math.abs(G.x - f.x) < 240 && G.y < SURF + 130 && G.mode === 'swim';
        if (close || f.scatter > 0) f.startle += dt; else f.startle = Math.max(0, f.startle - dt);
        if (f.startle > 0.5) { f.kind = 'skim'; f.y = f.baseY + 40; f.scatter = 1; }
        f.c.facing = f.dir;
        art.setAnim(f.c, 'perched');
        art.animate(f.c, dt, 0, 0);
        continue;
      }
      // High ones can see him at the surface and keep away; they do not notice
      // him deep down, so a leap or a goo bubble from the deep gets them.
      const shy = f.kind === 'high' && G.y < SURF + 30 && G.mode === 'swim' && Math.abs(G.x - f.x) < 300;
      if (shy) f.dir = f.x >= G.x ? 1 : -1;
      const speed = f.speed * (f.scatter > 0 || shy ? 1.9 : 1);
      f.x += f.dir * speed * dt;
      const slack = f.kind === 'high' ? 220 : 0;
      if (f.x < f.x0 - slack) { f.x = f.x0 - slack; f.dir = 1; }
      if (f.x > f.x1 + slack) { f.x = f.x1 + slack; f.dir = -1; }
      if (!shy && f.kind === 'high' && (f.x < f.x0 || f.x > f.x1)) f.dir = f.x < f.x0 ? 1 : -1;
      const wantY = f.baseY + Math.sin(t * 1.6 + f.ph) * f.amp - (f.scatter > 0 ? 110 : 0);
      f.y = ease(f.y, wantY, 4, dt);
      f.c.facing = f.dir;
      const up = Math.cos(t * 1.6 + f.ph) < -0.2 || f.scatter > 0;
      art.setAnim(f.c, up ? 'flap' : 'glide');
      art.animate(f.c, dt, f.dir * speed, 0);
    }
  }

  function stepHolder(dt) {
    L.scare = Math.max(0, L.scare - dt);
    L.flapT += dt;
    const c = L.c;
    if (L.mode === 'grabbed') return;
    const landX = PERCH.x;
    if (L.mode === 'fly') {
      const tx = clamp(G.x + T.holderLead + Math.sin(t * 0.7) * 80, L.x - 90, landX);
      const ty = (L.scare > 0 ? 150 : 235) + Math.sin(t * 1.3 + 1) * 25;
      L.vx = ease(L.vx, clamp((tx - L.x) * 3, -T.holderV, T.holderV), 3, dt);
      L.vy = ease(L.vy, clamp((ty - L.y) * 3, -420, 420), 3, dt);
      L.x += L.vx * dt; L.y += L.vy * dt;
      if (L.x >= landX - 40 && L.scare <= 0) { L.mode = 'landing'; L.T = 0; }
      art.setAnim(c, L.vy < -40 || L.scare > 0 ? 'flap' : 'glide');
    } else if (L.mode === 'landing') {
      // Circles down onto the island's near edge.
      L.T += dt;
      const tx = PERCH.x - 40 + Math.cos(L.T * 1.4) * Math.max(0, 160 - L.T * 60);
      const ty = PERCH.y - 90 + Math.min(90, L.T * 33);
      L.vx = ease(L.vx, clamp((tx - L.x) * 3, -420, 420), 4, dt);
      L.vy = ease(L.vy, clamp((ty - L.y) * 3, -300, 300), 4, dt);
      L.x += L.vx * dt; L.y += L.vy * dt;
      if (L.scare > 0) L.mode = 'fly';
      else if (near(L.x, L.y, PERCH.x, PERCH.y, 14) && L.T > 2.4) { L.mode = 'perched'; L.x = PERCH.x; L.y = PERCH.y; L.perchT = 0; env.sfx('munch'); }
      art.setAnim(c, L.vy > 60 ? 'dive' : 'flap');
    } else if (L.mode === 'perched') {
      L.perchT += dt;
      L.vx = 0; L.vy = 0;
      if (L.scare > 0) { L.mode = 'fly'; L.y -= 10; L.vy = -300; }
      art.setAnim(c, L.perchT > 0.6 ? pose('munch', 'perched') : 'perched');
    }
    c.facing = L.mode === 'perched' ? -1 : L.vx < -40 ? -1 : 1;
    art.animate(c, dt, L.vx, L.vy);
  }

  // ---------- hazards ----------

  function stepFish(dt) {
    const alertT = gentle ? 0.7 : T.fishAlert;
    for (const f of fish) {
      f.T -= dt;
      if (f.state === 'patrol' || f.state === 'turn') {
        const v = f.v * (f.state === 'turn' ? 1.3 : 1);
        f.x += f.dir * v * dt;
        if (f.x < f.x0) { f.x = f.x0; f.dir = 1; }
        if (f.x > f.x1) { f.x = f.x1; f.dir = -1; }
        f.yy = f.y + Math.sin(t * 2 + f.ph) * 12;
        if (f.state === 'turn' && f.T <= 0) f.state = 'patrol';
        if (f.state === 'patrol' && G.mode === 'swim' && !G.air && Math.abs(G.x - f.x) < T.fishRange && Math.abs(G.y - f.yy) < 130 && cam.sees(f.x, f.x, 0)) {
          f.state = 'alert';
          f.T = alertT;
          f.dir = G.x >= f.x ? 1 : -1;
          say('!', f.x, f.yy - 60, '#b3402e');
          env.sfx('eye');
        }
      } else if (f.state === 'alert') {
        if (f.T <= 0) {
          f.state = 'dart';
          f.T = T.fishDartT;
          const dx = G.x - f.x, dy = G.y - f.yy;
          const m = Math.hypot(dx, dy) || 1;
          const v = gentle ? 520 : T.fishDart;
          f.vx = (dx / m) * v; f.vy = (dy / m) * v;
          f.dir = dx >= 0 ? 1 : -1;
          env.sfx('swish');
        }
      } else if (f.state === 'dart') {
        f.x += f.vx * dt; f.yy += f.vy * dt;
        f.yy = clamp(f.yy, SURF + 40, FLOOR - 40);
        if (G.mode === 'swim' && near(f.x, f.yy, G.x, G.y, 95)) {
          daze(T.dazeT, 'Nip!', -f.dir * T.nipV, -120);
          f.state = 'turn'; f.T = 2.5; f.dir = -f.dir;
        } else if (f.T <= 0) { f.state = 'turn'; f.T = 2; f.dir = -f.dir; }
        if (f.state === 'turn') { f.y = clamp(f.yy, SURF + 100, FLOOR - 60); f.x = clamp(f.x, f.x0, f.x1); }
      }
      if (f.yy === undefined) f.yy = f.y;
    }
  }

  function stepEye(dt) {
    const E = eye;
    const dx = Math.abs(G.x - E.x);
    if (E.state === 'shut') {
      if (dx < T.eyeRange && G.mode === 'swim') { E.state = 'opening'; E.T = 0; env.sfx('eye'); }
    } else if (E.state === 'opening') {
      E.T += dt;
      E.open = Math.min(1, E.T / T.eyeOpenT);
      if (E.T >= T.eyeOpenT) { E.state = 'open'; E.next = 0.3; }
    } else if (E.state === 'open') {
      E.open = 1;
      E.next -= dt;
      if (dx > T.eyeRange + 500) { E.state = 'closing'; E.T = 0; }
      else if (E.next <= 0 && G.mode === 'swim' && !G.air) {
        E.next = gentle ? T.tentacleEvery * 1.4 : T.tentacleEvery;
        E.tentacles.push({ x: G.x, t: 0, h: 0, hit: false });
        env.sfx('bubble');
        for (let i = 0; i < 5; i++) addBubble(G.x + (rng() - 0.5) * 80, FLOOR - 20 - rng() * 40, 0.6 + rng() * 0.4, 0.5 + rng() * 0.4);
      }
    } else if (E.state === 'closing') {
      E.T += dt;
      E.open = Math.max(0, 1 - E.T / 0.5);
      if (E.T >= 0.5) E.state = 'shut';
    }
    for (const tc of E.tentacles) {
      tc.t += dt;
      const { tentacleWarn: w, tentacleRise: r } = T;
      const hold = 0.35, sink = 0.6;
      tc.h = tc.t < w ? 0 : tc.t < w + r ? T.tentacleH * Math.sin(((tc.t - w) / r) * Math.PI / 2) : tc.t < w + r + hold ? T.tentacleH : T.tentacleH * Math.max(0, 1 - (tc.t - w - r - hold) / sink);
      if (!tc.hit && tc.t >= w && tc.t < w + r + hold && G.mode === 'swim' && !G.air && Math.abs(G.x - tc.x) < 80 && G.y + 60 > FLOOR - tc.h) {
        tc.hit = true;
        // Grabbed and flung back to the last signpost.
        G.lunge = null;
        G.bubble = null;
        setMode('flung');
        G.air = false;
        G.flung = { x0: G.x, y0: G.y, x1: Math.max(cps.last + 100, G.x - 900), y1: SURF + 260, t: 0 };
        env.sfx('snap');
        env.vibrate(80);
        shake(10);
        say('Grabbed!', G.x, G.y - 180);
      }
    }
    for (let i = E.tentacles.length - 1; i >= 0; i--) if (E.tentacles[i].t > 2.2) E.tentacles.splice(i, 1);
  }

  function stepBoats(dt) {
    for (const b of boats) {
      b.T -= dt;
      b.cool = Math.max(0, b.cool - dt);
      const dx = Math.abs(G.x - b.hx);
      const onScreen = cam.sees(b.hx, b.hx, 100);
      if (b.kind === 'anchor') {
        if (b.state === 'ready') {
          if (b.cool <= 0 && dx < T.anchorRange && G.mode === 'swim' && onScreen) { b.state = 'rattle'; b.T = T.anchorRattle; env.sfx('creak'); }
        } else if (b.state === 'rattle') {
          if (b.T <= 0) { b.state = 'fall'; env.sfx('whoosh'); }
        } else if (b.state === 'fall') {
          b.y += T.anchorV * dt;
          if (G.mode === 'swim' && near(b.hx, b.y, G.x, G.y, 100)) daze(T.dazeT, 'Bonk!', (G.x >= b.hx ? 1 : -1) * 260, 200);
          if (b.y >= FLOOR - 30) { b.y = FLOOR - 30; b.state = 'down'; b.T = T.anchorDown; env.sfx('thump'); shake(5); }
        } else if (b.state === 'down') {
          if (b.T <= 0) b.state = 'rise';
        } else if (b.state === 'rise') {
          b.y -= T.anchorUp * dt;
          if (b.y <= SURF + 30) { b.y = SURF + 30; b.state = 'ready'; b.cool = 1.5; }
        }
      } else {
        if (b.state === 'ready') {
          if (b.cool <= 0 && dx < T.netRange && G.mode === 'swim' && G.y > T.netReady && onScreen) { b.state = 'creak'; b.T = T.netCreak; env.sfx('creak'); }
        } else if (b.state === 'creak') {
          if (b.T <= 0) { b.state = 'drop'; env.sfx('swoosh'); }
        } else if (b.state === 'drop') {
          b.y += T.netV * dt;
          if (G.mode === 'swim' && !G.air && near(b.hx, b.y, G.x, G.y, 118)) {
            // Netted!
            b.state = 'holding';
            G.net = b;
            G.mash = 0;
            G.lunge = null;
            G.bubble = null;
            setMode('netted');
            netCount += 1;
            env.sfx('snap');
            env.vibrate(80);
            shake(8);
            say('Netted! Mash Action!', G.x, G.y - 200);
            hints.say('Wriggle free: mash Action!', 2.5);
          } else if (b.y >= T.netMax) { b.y = T.netMax; b.state = 'hang'; b.T = T.netHang; }
        } else if (b.state === 'hang') {
          if (b.T <= 0) b.state = 'rise';
        } else if (b.state === 'rise') {
          b.y -= (b.T > 0 ? T.netUp : T.netUp * 2) * dt;
          if (b.y <= T.netReady) { b.y = T.netReady; b.state = 'ready'; b.cool = 2; }
        }
      }
    }
  }

  function stepBubbles(dt) {
    for (const v of vents) {
      v.T -= dt;
      if (v.T <= 0 && cam.sees(v.x, v.x, 300)) {
        v.T = T.bubbleEvery;
        bigBubbles.push({ x: v.x, y: FLOOR - 40, r: T.bubbleR, t: 0, popped: false, ph: rng() * 6 });
        env.sfx('bubble');
      }
    }
    for (const b of bigBubbles) {
      if (b.popped) { b.t += dt; continue; }
      b.y -= T.bubbleV * dt;
      b.x += Math.sin(t * 2 + b.ph) * 20 * dt;
      if (!G.bubble && G.mode === 'swim' && !G.air && G.lunge === null && near(b.x, b.y, G.x, G.y, 90)) {
        G.bubble = b;
        G.bubbleLeave = 0;
        env.sfx('boing');
        art.kick(G.c, 0.3);
      }
      if (b.y <= SURF - 50) {
        b.popped = true;
        b.t = 0;
        env.sfx('pop');
        if (G.bubble === b) {
          // Carried right out of the goo.
          G.bubble = null;
          G.air = true;
          G.vy = -900;
          G.y = T.surfY - 1;
          env.sfx('splash');
          env.vibrate(25);
          splash(b.x, 14, 1.1);
          art.kick(G.c, -0.5);
        }
      }
    }
    for (let i = bigBubbles.length - 1; i >= 0; i--) if (bigBubbles[i].popped && bigBubbles[i].t > 0.3) bigBubbles.splice(i, 1);
    for (const b of bubbles) b.t += dt;
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].t > bubbles[i].life + 0.18) bubbles.splice(i, 1);
    if (bubbles.length > 90) bubbles.splice(0, bubbles.length - 90);
    for (const r of rings) r.t += dt;
    for (let i = rings.length - 1; i >= 0; i--) if (rings[i].t >= rings[i].life) rings.splice(i, 1);
    for (const l of lunch) l.t += dt;
    for (let i = lunch.length - 1; i >= 0; i--) if (lunch[i].t >= 0.8) { lunch.splice(i, 1); basketKick = 1; env.sfx('thump'); }
    basketKick = Math.max(0, basketKick - dt * 3);
  }

  // ---------- the outro ----------

  function outro(dt) {
    outroT += dt;
    const c = G.c;
    if (self.outcome === 'snatched') {
      // Triumph, then as in the book: SNAP, the Peg's net comes down and hauls him up.
      if (!outroNet && outroT >= 1.1) { outroNet = { y: -380, phase: 'down' }; env.sfx('swoosh'); }
      if (!outroNet || outroNet.phase === 'down') {
        if (outroT < 0.7) art.setAnim(c, 'triumph');
        else {
          if (c.anim !== 'celebrate') { env.sfx('cheer'); art.kick(c, 0.4); }
          art.setAnim(c, 'celebrate');
        }
        G.y = ease(G.y, SURF + 40, 3, dt);
      }
      if (outroNet && outroNet.phase === 'down') {
        outroNet.y += 900 * dt;
        if (outroNet.y >= G.y - 60) {
          outroNet.phase = 'up';
          art.setAnim(c, pose('tangled', 'netted'));
          art.kick(c, 0.6);
          env.sfx('snap');
          env.vibrate(80);
          say('SNAP!', G.x, G.y - 320);
          splash(G.x, 14, 1);
        }
      } else if (outroNet) { c.z += 360 * dt; }
      art.animate(c, dt, 0, 0);
    } else {
      // The Bombanat flies off with the letter; the Grumley splutters.
      if (L.mode !== 'grabbed') { L.x += 420 * dt; L.y = Math.max(40, L.y - 200 * dt); art.setAnim(L.c, 'flap'); art.animate(L.c, dt, 420, 0); }
      art.setAnim(c, pose('dizzy', 'splutter'));
      art.animate(c, dt, 0, 0);
    }
  }

  // ---------- the board ----------

  const self = {
    time: total,
    done: false,
    outcome: null,
    get outroTime() { return self.outcome === 'snatched' ? 3.2 : 1.6; },
    // Internals for the autopilot and the tests.
    G, L, fliers, fish, boats, whirlpools, bigBubbles, eye, cps, cam, world, T, reach,
    get got() { return got; },
    get total() { return fliers.length; },
    get netCount() { return netCount; },
    focus: () => [{ x: G.x - cam.x, y: G.y }],
    hud: () => `Lunch ${got}/${fliers.length}`,
    marks: () => kit.boardMarks({ snatched: self.outcome === 'snatched', got, total: fliers.length, feat: netCount === 0 }),
    update(dt, inS) {
      t += dt;
      parts.update(dt);
      stepBubbles(dt);
      if (self.done) {
        outro(dt);
        cam.follow(G.x, 0, dt);
        return;
      }
      self.time = Math.max(0, self.time - dt);
      stepGrumley(inS || {}, dt);
      if (!self.done) {
        stepFliers(dt);
        stepHolder(dt);
        stepFish(dt);
        stepEye(dt);
        stepBoats(dt);
        // Ambient bubbles.
        if (rng() < dt * 1.5) addBubble(cam.x + rng() * W, SURF + 40 + rng() * (FLOOR - SURF - 80), 0.4 + rng() * 0.4, 0.7 + rng() * 0.6);
        const was = cps.last;
        if (cps.reach(G.x) !== was) env.sfx('checkpoint');
        hints.update(dt, G.x);
      }
      animGrumley(dt);
      cam.follow(G.x, G.vx, dt, first);
      first = false;
      if (self.time <= 0 && !self.done) {
        self.done = true;
        self.outcome = 'kept';
        G.lunge = null;
      }
    },
    draw(g, tt) {
      kit.drawBackdrop(g, cam, { panels: ['adv/b03/backdrop-1', 'adv/b03/backdrop-2', 'adv/b03/backdrop-3'], standin: ENTRY.scene });
      cam.begin(g);
      drawGooBody(g);
      drawFarDecor(g);
      drawFloor(g);
      drawNearDecor(g);
      for (const w of whirlpools) if (cam.sees(w.x - 300, w.x + 300)) drawWhirlpool(g, w);
      drawEye(g);
      for (const b of bigBubbles) if (cam.sees(b.x)) drawBigBubble(g, b);
      for (const f of fish) if (cam.sees(f.x)) drawFish(g, f);
      for (const b of boats) if (cam.sees(b.x - 300, b.x + 300)) drawUnderBoat(g, b);
      drawBubbles(g);
      drawGrumley(g);
      drawIsland(g, false);
      drawGooTint(g);
      drawIsland(g, true);
      drawSigns(g);
      for (const b of boats) if (cam.sees(b.x - 300, b.x + 300)) drawBoat(g, b);
      for (const f of fliers) if (!f.got && cam.sees(f.x)) drawFlier(g, f);
      drawHolder(g);
      if (G.lunge) drawClaw(g);
      drawPrompt(g);
      if (self.done && self.outcome === 'snatched') drawGrumleyRisen(g);
      parts.draw(g);
      drawRings(g);
      cam.end(g);
      if (outroNet) drawOutroNet(g);
      drawBasket(g);
      for (const l of lunch) drawLunchFlight(g, l);
      kit.route(g, { you: G.x / WORLD, letter: L.x / WORLD, signs: cps.fracs(WORLD) });
      if (!self.done) hints.draw(g);
    },
  };

  function animGrumley(dt) {
    const c = G.c;
    if (self.done) return;
    if (G.mode === 'netted') art.setAnim(c, pose('tangled', 'netted'));
    else if (G.mode === 'dazed' || G.mode === 'spun' || G.mode === 'flung') art.setAnim(c, pose('dizzy', 'splutter'));
    else if (G.air) art.setAnim(c, pose('leap', 'fullLunge'));
    else if (G.lunge && G.lunge.dy < -0.5) art.setAnim(c, pose('clawsUp', 'lunge'));
    else if (G.munchT > 0) art.setAnim(c, 'lunch');
    else if (G.jetT > 0) art.setAnim(c, pose('jet', 'rise'));
    else if (G.bubble) art.setAnim(c, pose('swimB', 'triumph'));
    else if (G.vy > 260 && G.vy > Math.abs(G.vx)) art.setAnim(c, pose('diveDown', 'rise'));
    else if (Math.hypot(G.vx, G.vy) > 40) art.setAnim(c, pose(Math.floor(c.dist / 160) % 2 ? 'swimB' : 'swimA', 'rise'));
    else art.setAnim(c, pose('swimA', 'rise'));
    art.animate(c, dt, G.mode === 'won' ? 0 : G.vx, G.vy);
  }

  // ---------- drawing ----------

  const V = () => ({ x0: cam.x - 60, x1: cam.x + W + 60 });

  // The goo below the surface. The backdrop panels paint the deep; until they
  // arrive an ink gradient stands in. The surface strip (terrain.goo 1) is
  // drawn along SURF with its crests above the line, fading into the deep.
  function drawGooBody(g) {
    const { x0, x1 } = V();
    if (!art.image('adv/b03/backdrop-1')) {
      const gr = g.createLinearGradient(0, SURF, 0, H);
      gr.addColorStop(0, '#3f9ec2'); gr.addColorStop(0.45, '#226a97'); gr.addColorStop(1, '#13365a');
      g.fillStyle = gr;
      g.fillRect(x0, SURF, x1 - x0, H - SURF);
      // Shafts of light.
      g.save();
      g.fillStyle = 'rgba(220,245,255,0.07)';
      for (let x = Math.floor(x0 / 640) * 640; x < x1; x += 640) {
        const sway = Math.sin(t * 0.4 + x * 0.01) * 20;
        g.beginPath();
        g.moveTo(x + sway, SURF); g.lineTo(x + 120 + sway, SURF); g.lineTo(x + 330, FLOOR); g.lineTo(x + 100, FLOOR);
        g.closePath(); g.fill();
      }
      g.restore();
    }
    if (art.sprite(TERRAIN, 1)) {
      // Tiled by hand (not kit.drawGround) so each copy overlaps the next by a
      // few px: the strip's ends are feathered and would show as seams.
      const sp = art.sprite(TERRAIN, 1);
      const k = STRIP_H / sp.h;
      const tw = sp.w * k - 8;
      const i0 = Math.floor(x0 / tw);
      for (let i = i0; i * tw < x1; i++) {
        const x = i * tw;
        if (i % 2) art.drawSprite(g, sp, x + tw + 8, SURF - STRIP_LIFT, { scale: k, ax: 0, ay: 0, flip: true });
        else art.drawSprite(g, sp, x, SURF - STRIP_LIFT, { scale: k, ax: 0, ay: 0 });
      }
      // Fade the strip's cut bottom edge into the deep.
      const yb = SURF - STRIP_LIFT + STRIP_H;
      const gr = g.createLinearGradient(0, yb - 50, 0, yb + 30);
      gr.addColorStop(0, 'rgba(38,96,120,0)'); gr.addColorStop(0.6, 'rgba(38,96,120,0.75)'); gr.addColorStop(1, 'rgba(38,96,120,0)');
      g.fillStyle = gr;
      g.fillRect(x0, yb - 50, x1 - x0, 80);
    }
  }

  function drawFloor(g) {
    kit.drawGround(g, cam, { x: 0, y: FLOOR, w: WORLD, h: H - FLOOR + 80 }, {
      sheet: TERRAIN, item: 2, height: 200, lift: 110, fill: '#11283f',
      standin: { top: '#3c6f8c', body: '#23486a', ink: INK, tufts: false },
    });
    if (art.sprite(TERRAIN, 2)) return;
    // Pebbles, shells and weed tufts along the sand.
    const { x0, x1 } = V();
    g.save();
    g.lineWidth = 2.5;
    for (let x = Math.floor(x0 / 64) * 64; x < x1; x += 64) {
      const h1 = kit.hash(x * 0.7), h2 = kit.hash(x * 1.3 + 5);
      const px = x + h1 * 50, py = FLOOR + 6 + h2 * 50;
      if (h2 < 0.55) {
        g.fillStyle = h1 < 0.5 ? '#5d7f93' : '#6f8a97'; g.strokeStyle = INK;
        g.beginPath(); g.ellipse(px, py, 9 + h1 * 12, 6 + h2 * 6, h1 * 1.2, 0, Math.PI * 2); g.fill(); g.stroke();
      } else if (h2 < 0.8) {
        g.strokeStyle = '#2f8a79'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(px, FLOOR + 4); g.quadraticCurveTo(px - 8, FLOOR - 14, px - 3, FLOOR - 30); g.moveTo(px + 6, FLOOR + 4); g.quadraticCurveTo(px + 14, FLOOR - 10, px + 10, FLOOR - 24); g.stroke();
        g.lineWidth = 2.5;
      } else {
        g.strokeStyle = 'rgba(27,42,58,0.4)';
        g.beginPath(); g.moveTo(px - 14, py + 20); g.lineTo(px + 14, py + 20); g.moveTo(px - 8, py + 30); g.lineTo(px + 18, py + 30); g.stroke();
      }
    }
    g.restore();
  }

  function drawFarDecor(g) {
    const painted = !!art.image('adv/b03/backdrop-1');
    if (!painted) {
      for (const r of world.rocks) if (cam.sees(r.x)) drawRock(g, r.x, FLOOR + 6, r.h, r.flip, 0.75);
      for (const w of world.weeds) if (cam.sees(w.x)) drawWeed(g, w.x + 60, FLOOR + 6, w.h * 0.8, !w.flip, 0.7);
    }
    for (const r of world.rocks) if (cam.sees(r.x)) drawRock(g, r.x, FLOOR + 6, r.h, r.flip, 1);
    // The knobbly pillar in the shallows, from the floor to above the goo.
    if (cam.sees(PILLAR.x)) drawRock(g, PILLAR.x, FLOOR + 10, FLOOR - PILLAR.top + 10, false, 1);
    // Far-off shark fins cutting the surface.
    for (const f of [{ x0: sx(3300), v: 60 }, { x0: sx(6600), v: -45 }]) {
      const x = f.x0 + Math.sin(t * 0.25 + f.x0) * 500;
      if (!cam.sees(x)) continue;
      kit.sprite(g, SHEET, 12, x, SURF + 16, { height: 96, flip: f.v < 0 }, () => {
        g.save(); g.fillStyle = '#4a5a66'; g.strokeStyle = INK; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x - 36, SURF + 4); g.quadraticCurveTo(x - 10, SURF - 50, x + 22, SURF - 56); g.quadraticCurveTo(x + 24, SURF - 20, x + 40, SURF + 4); g.closePath(); g.fill(); g.stroke();
        g.restore();
      });
    }
  }

  function drawNearDecor(g) {
    for (const w of world.weeds) if (cam.sees(w.x)) drawWeed(g, w.x, FLOOR + 4, w.h, w.flip, 1);
    for (const tb of world.tubs) if (cam.sees(tb.x)) drawTub(g, tb.x, FLOOR + 2, tb.flip);
  }

  function drawRock(g, x, y, h, flip, alpha) {
    g.save();
    g.globalAlpha = alpha;
    kit.sprite(g, TERRAIN, 3, x, y, { height: h, flip }, () => {
      const w = h * 0.55;
      const seed = x * 0.37;
      // A knobbly silhouette, drawn as lumps round the top.
      const pts = [[x - w / 2, y]];
      const n = 12;
      for (let i = 1; i < n; i++) {
        const a = Math.PI * (1 - i / n);
        const r = 1 + (kit.hash(seed + i * 7) - 0.5) * 0.34;
        pts.push([x + Math.cos(a) * (w / 2) * r * (1 - 0.22 * Math.sin(a)), y - Math.sin(a) * h * r]);
      }
      pts.push([x + w / 2, y]);
      g.fillStyle = ROCK.wash; g.strokeStyle = INK; g.lineWidth = 3.5; g.lineJoin = 'round';
      inkLine(g, pts, { close: true, w: 3, seed });
      g.fill(); g.stroke();
      g.save();
      inkLine(g, pts, { close: true, w: 3, seed });
      g.clip();
      // The lit side and the shadow side, crosshatched.
      g.fillStyle = ROCK.light;
      g.beginPath(); g.moveTo(x - w * 0.45, y - h * 0.2); g.quadraticCurveTo(x - w * 0.35, y - h * 0.8, x - w * 0.05, y - h * 1.05); g.lineTo(x - w * 0.6, y - h * 1.05); g.closePath(); g.fill();
      g.fillStyle = ROCK.shade;
      g.beginPath(); g.moveTo(x + w * 0.05, y - h * 1.05); g.quadraticCurveTo(x + w * 0.42, y - h * 0.55, x + w * 0.15, y + 5); g.lineTo(x + w, y + 5); g.lineTo(x + w, y - h * 1.1); g.closePath(); g.fill();
      hatch(g, x + w * 0.05, y - h, w * 0.5, h, { step: 9, angle: -0.75, colour: 'rgba(27,42,58,0.32)', cross: true });
      hatch(g, x - w * 0.55, y - h * 0.55, w * 1.1, h * 0.55, { step: 12, angle: -0.5, colour: 'rgba(27,42,58,0.18)' });
      // Cracks.
      g.strokeStyle = INK; g.lineWidth = 2.2;
      for (let i = 0; i < 3; i++) {
        const cx = x - w * 0.3 + kit.hash(seed + i * 11) * w * 0.6, cy = y - h * (0.25 + kit.hash(seed + i * 5 + 1) * 0.6);
        inkLine(g, [[cx, cy], [cx + 10, cy + 26], [cx - 6, cy + 48], [cx + 8, cy + 70]], { w: 4, seed: seed + i });
        g.stroke();
        inkLine(g, [[cx + 10, cy + 26], [cx + 26, cy + 34]], { w: 2, seed: seed + i + 9 }); g.stroke();
      }
      // Barnacles and a limpet or two.
      g.fillStyle = '#d6cfb8'; g.lineWidth = 1.6;
      for (let i = 0; i < 9; i++) {
        const bx = x - w * 0.42 + kit.hash(seed + i * 13) * w * 0.84, by = y - kit.hash(seed + i * 17 + 2) * h * 0.92;
        const r = 3.5 + kit.hash(i + seed) * 4;
        g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill(); g.stroke();
        g.beginPath(); g.arc(bx, by, r * 0.45, 0, Math.PI * 2); g.stroke();
      }
      g.restore();
    });
    g.restore();
  }

  function drawWeed(g, x, y, h, flip, alpha) {
    g.save();
    g.globalAlpha = alpha;
    const sway = env.reduceMotion ? 0 : Math.sin(t * 1.1 + x * 0.02) * 16;
    kit.sprite(g, TERRAIN, 5, x + sway * 0.3, y, { height: h, flip }, () => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      const fronds = [[-44, 0.76, -1, 0], [-16, 1, 1, 1], [14, 0.9, -1, 2], [40, 0.72, 1, 3], [0, 0.52, 1, 4]];
      for (const [dx, k, side, i] of fronds) {
        const H0 = h * k;
        const s = sway * k;
        // The frond's spine: a curve that curls over at the tip.
        const spine = (u) => {
          const curl = side * (u * u * u) * 110 * k + Math.sin(u * 3.2 + i) * 16 * k;
          return [x + dx + curl + s * u * u, y - H0 * u + (u > 0.8 ? (u - 0.8) * (u - 0.8) * 900 * k : 0)];
        };
        const width = (u) => 22 * (1 - u * 0.7) + 5;
        const L = [], R = [];
        for (let j = 0; j <= 10; j++) {
          const u = j / 10;
          const [px, py] = spine(u);
          const w = width(u) * (1 + Math.sin(u * 9 + i) * 0.22); // a wavy edge
          L.push([px - w, py]); R.push([px + w, py]);
        }
        g.fillStyle = i % 2 ? WEED.dark : WEED.light;
        g.strokeStyle = INK; g.lineWidth = 3;
        inkLine(g, [...L, ...R.reverse()], { close: true, w: 2, seed: x + i * 5 });
        g.fill(); g.stroke();
        // The ribs and the midrib.
        g.strokeStyle = 'rgba(20,50,50,0.6)'; g.lineWidth = 1.8;
        g.beginPath();
        for (let j = 1; j < 10; j++) {
          const u = j / 10;
          const [px, py] = spine(u);
          const w = width(u);
          g.moveTo(px - w + 3, py + 4); g.lineTo(px + w - 3, py - 3);
        }
        g.stroke();
        g.lineWidth = 2.2;
        g.beginPath();
        for (let j = 0; j <= 10; j++) { const [px, py] = spine(j / 10); if (j) g.lineTo(px, py); else g.moveTo(px, py); }
        g.stroke();
        // A little hatching at the base.
        g.save();
        inkLine(g, [...L, ...R], { close: true, w: 0, seed: 0 });
        g.clip();
        hatch(g, x + dx - 40, y - H0 * 0.3, 80, H0 * 0.3, { step: 7, angle: -0.6, colour: 'rgba(15,40,40,0.35)' });
        g.restore();
      }
    });
    g.restore();
  }

  function drawTub(g, x, y, flip) {
    kit.sprite(g, TERRAIN, 6, x, y, { height: 130, flip }, () => {
      g.save();
      g.translate(x, y);
      if (flip) g.scale(-1, 1);
      g.rotate(-0.3);
      g.lineJoin = 'round'; g.lineCap = 'round';
      // Claw feet.
      g.fillStyle = '#b89a52'; g.strokeStyle = INK; g.lineWidth = 3;
      for (const fx of [-70, 66]) {
        inkLine(g, [[fx - 14, 20], [fx - 20, 34], [fx - 2, 30], [fx + 8, 36], [fx + 18, 24], [fx + 10, 12]], { close: true, w: 2, seed: fx });
        g.fill(); g.stroke();
      }
      // The body.
      const body = [[-112, -62], [-118, -20], [-104, 18], [-60, 26], [0, 30], [62, 26], [104, 16], [116, -22], [110, -64]];
      g.fillStyle = '#e4e0d2'; g.lineWidth = 3.5;
      inkLine(g, body, { close: true, w: 2.5, seed: x });
      g.fill(); g.stroke();
      g.save(); inkLine(g, body, { close: true, w: 2.5, seed: x }); g.clip();
      hatch(g, -120, -30, 240, 70, { step: 8, angle: -0.5, colour: 'rgba(27,42,58,0.28)' });
      hatch(g, 40, -70, 90, 110, { step: 9, angle: 0.4, colour: 'rgba(27,42,58,0.22)', cross: true });
      g.fillStyle = 'rgba(120,150,170,0.35)';
      g.beginPath(); g.ellipse(-30, 0, 60, 30, 0, 0, Math.PI * 2); g.fill(); // a rust-and-weed stain
      g.restore();
      // The rim.
      g.fillStyle = '#c9c3b3';
      inkLine(g, [[-116, -66], [-60, -78], [0, -82], [60, -78], [114, -66], [60, -54], [0, -50], [-60, -54]], { close: true, w: 2, seed: x + 1 });
      g.fill(); g.stroke();
      g.fillStyle = '#6f7f90';
      inkLine(g, [[-96, -66], [-50, -72], [0, -74], [50, -72], [96, -66], [50, -60], [0, -58], [-50, -60]], { close: true, w: 1.5, seed: x + 2 });
      g.fill(); g.stroke();
      // The tap, and a crack.
      g.fillStyle = '#b89a52';
      inkLine(g, [[92, -78], [92, -104], [104, -110], [112, -96], [100, -92], [100, -78]], { close: true, w: 1.5, seed: x + 3 });
      g.fill(); g.stroke();
      g.lineWidth = 2;
      inkLine(g, [[-40, -40], [-30, -10], [-44, 10]], { w: 3, seed: x + 4 }); g.stroke();
      // Weed sprouting from the tub.
      g.strokeStyle = WEED.dark; g.lineWidth = 4;
      for (const wx of [-20, 10, 34]) { inkLine(g, [[wx, -70], [wx - 8, -100], [wx + 4, -130], [wx - 6, -156]], { w: 3, seed: x + wx }); g.stroke(); }
      g.restore();
    });
  }

  // The island: rock above the surface with grass, and its roots below.
  function drawIsland(g, above) {
    if (!cam.sees(ISLAND.x - 100, ISLAND.x + ISLAND.w + 100)) return;
    const I = ISLAND;
    g.save();
    // Below the surface it is drawn under the goo's tint; above, crisp.
    g.beginPath(); g.rect(I.x - 100, above ? -100 : SURF, I.w + 200, above ? SURF + 100 : H - SURF); g.clip();
    kit.sprite(g, TERRAIN, 4, I.x + I.w / 2, SURF + 112, { height: 400 }, () => {
      g.save();
      // Knobbly rocks piled up from the floor, then the island's rock above.
      drawRock(g, I.x + 130, FLOOR + 10, 600, false, 1);
      drawRock(g, I.x + 500, FLOOR + 10, 540, true, 1);
      drawRock(g, I.x + 320, FLOOR + 10, 690, false, 1);
      // The island's rock: a knobbly mound, lit from the left, cracked and hatched.
      const top = [[I.x - 40, SURF + 40]];
      const n = 16;
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const lump = 1 + (kit.hash(I.x + i * 7) - 0.5) * 0.3;
        const dome = Math.sin(u * Math.PI) ** 0.6;
        top.push([I.x - 40 + u * (I.w + 100), SURF + 40 - (SURF + 40 - (I.y - 30)) * dome * lump]);
      }
      top.push([I.x + I.w + 60, SURF + 40], [I.x + I.w + 20, SURF + 120], [I.x + 300, SURF + 150], [I.x, SURF + 120]);
      g.fillStyle = '#6b6457'; g.strokeStyle = INK; g.lineWidth = 5; g.lineJoin = 'round';
      inkLine(g, top, { close: true, w: 3, seed: I.x }); g.fill(); g.stroke();
      g.save(); inkLine(g, top, { close: true, w: 3, seed: I.x }); g.clip();
      g.fillStyle = 'rgba(220,215,200,0.2)';
      g.beginPath(); g.moveTo(I.x - 60, SURF + 40); g.quadraticCurveTo(I.x + 60, I.y, I.x + 260, I.y - 50); g.lineTo(I.x - 60, I.y - 60); g.closePath(); g.fill();
      g.fillStyle = 'rgba(27,42,58,0.18)';
      g.beginPath(); g.moveTo(I.x + 320, I.y - 60); g.quadraticCurveTo(I.x + 520, I.y + 60, I.x + 420, SURF + 160); g.lineTo(I.x + I.w + 80, SURF + 160); g.lineTo(I.x + I.w + 80, I.y - 60); g.closePath(); g.fill();
      hatch(g, I.x + 330, I.y - 40, 360, SURF + 200 - I.y, { step: 10, angle: -0.75, colour: 'rgba(27,42,58,0.32)', cross: true });
      hatch(g, I.x - 40, SURF - 60, I.w + 100, 220, { step: 12, angle: -0.5, colour: 'rgba(27,42,58,0.2)' });
      g.strokeStyle = INK; g.lineWidth = 2.5;
      for (const [cx, cy] of [[I.x + 200, I.y + 50], [I.x + 420, I.y + 30], [I.x + 120, I.y + 120], [I.x + 500, I.y + 130], [I.x + 330, I.y + 90]]) {
        inkLine(g, [[cx, cy], [cx + 14, cy + 30], [cx + 2, cy + 52], [cx + 20, cy + 74]], { w: 4, seed: cx }); g.stroke();
        inkLine(g, [[cx + 14, cy + 30], [cx + 34, cy + 38]], { w: 2, seed: cx + 1 }); g.stroke();
      }
      g.restore();
      // Grass in clumps along the top, with a few flowers.
      for (let i = 0; i < 12; i++) {
        const gx = I.x + 40 + i * 48 + kit.hash(i) * 20;
        const u = (gx - (I.x - 40)) / (I.w + 100);
        const gy = SURF + 40 - (SURF + 40 - (I.y - 30)) * Math.sin(u * Math.PI) ** 0.6 + 6;
        g.lineCap = 'round';
        for (let j = 0; j < 5; j++) {
          const bx = gx - 14 + j * 7, lean = (j - 2) * 9 + (kit.hash(i * 9 + j) - 0.5) * 10;
          g.strokeStyle = INK; g.lineWidth = 4; inkLine(g, [[bx, gy + 2], [bx + lean * 0.4, gy - 16], [bx + lean, gy - 30 - kit.hash(i + j) * 12]], { w: 1.5, seed: i * 5 + j }); g.stroke();
          g.strokeStyle = j % 2 ? '#5f8f3c' : '#7faa4a'; g.lineWidth = 2.2; inkLine(g, [[bx, gy + 2], [bx + lean * 0.4, gy - 16], [bx + lean, gy - 30 - kit.hash(i + j) * 12]], { w: 1.5, seed: i * 5 + j }); g.stroke();
        }
        if (i % 4 === 1) { g.fillStyle = '#e9c84a'; g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.arc(gx + 6, gy - 36, 5, 0, Math.PI * 2); g.fill(); g.stroke(); }
      }
      // Barnacles at the goo line.
      g.fillStyle = '#c9c4b2'; g.strokeStyle = INK; g.lineWidth = 1.5;
      for (let i = 0; i < 16; i++) { const bx = I.x + kit.hash(i * 3) * I.w, by = SURF - 10 + kit.hash(i * 7 + 1) * 50; g.beginPath(); g.arc(bx, by, 4 + kit.hash(i) * 5, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.restore();
    });
    // The picnic basket waits on the island (the book's picnic).
    kit.sprite(g, SHEET, 11, I.x + 150, I.y + 14, { height: 86 }, () => art.drawSprite(g, art.prop('grumley', 4), I.x + 150, I.y + 14, { height: 86 }));
    g.restore();
  }

  function drawSigns(g) {
    for (const x of cps.list.slice(1)) {
      if (!cam.sees(x)) continue;
      const bob = env.reduceMotion ? 0 : Math.sin(t * 1.6 + x) * 5;
      const y = SURF + 8 + bob;
      const n = cps.list.indexOf(x) + 1;
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.strokeStyle = INK; g.lineWidth = 3.5;
      // The buoy: a fat drop shape, red below, cream band, hatched on the shadow side.
      const buoy = [[x - 38, y - 6], [x - 30, y + 22], [x, y + 34], [x + 30, y + 22], [x + 38, y - 6], [x + 20, y - 30], [x, y - 36], [x - 20, y - 30]];
      g.fillStyle = '#c8443a';
      inkLine(g, buoy, { close: true, w: 2, seed: x });
      g.fill(); g.stroke();
      g.save(); inkLine(g, buoy, { close: true, w: 2, seed: x }); g.clip();
      g.fillStyle = '#f3e9d2'; g.fillRect(x - 50, y - 22, 100, 14);
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 50, y - 22); g.lineTo(x + 50, y - 22); g.moveTo(x - 50, y - 8); g.lineTo(x + 50, y - 8); g.stroke();
      hatch(g, x + 6, y - 40, 40, 80, { step: 7, angle: -0.7, colour: 'rgba(27,42,58,0.35)', cross: true });
      g.restore();
      // The pole, with a rope lashing, and the sign.
      g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + 2, y - 128); g.stroke();
      g.strokeStyle = '#8a6a44'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + 2, y - 128); g.stroke();
      g.strokeStyle = '#d8b56a'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - 5, y - 44 - i * 4); g.lineTo(x + 6, y - 46 - i * 4); g.stroke(); }
      const sign = [[x - 12, y - 134], [x + 68, y - 136], [x + 92, y - 108], [x + 70, y - 80], [x - 10, y - 82]];
      g.fillStyle = '#d8b56a'; g.strokeStyle = INK; g.lineWidth = 3.5;
      inkLine(g, sign, { close: true, w: 2, seed: x + 3 });
      g.fill(); g.stroke();
      g.save(); inkLine(g, sign, { close: true, w: 2, seed: x + 3 }); g.clip();
      g.strokeStyle = 'rgba(90,60,30,0.45)'; g.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x - 14, y - 128 + i * 11); g.lineTo(x + 94, y - 130 + i * 11 + (i % 2) * 3); g.stroke(); }
      hatch(g, x + 60, y - 136, 40, 60, { step: 6, angle: -0.6, colour: 'rgba(27,42,58,0.25)' });
      g.restore();
      g.fillStyle = INK; g.beginPath(); g.arc(x, y - 108, 3, 0, Math.PI * 2); g.fill();
      g.font = '800 28px Fraunces, Georgia, serif'; g.textAlign = 'center';
      g.fillText(String(n), x + 38, y - 97);
      g.restore();
    }
  }

  function drawWhirlpool(g, w) {
    const spin = env.reduceMotion ? 0 : t * 2.2;
    kit.sprite(g, SHEET, 9, w.x, w.y + 20, { height: 320 }, () => {
      g.save();
      g.lineCap = 'round';
      // The funnel's wash.
      g.fillStyle = 'rgba(120,200,240,0.3)';
      g.beginPath(); g.moveTo(w.x - 250, w.y - 275); g.quadraticCurveTo(w.x - 60, w.y - 150, w.x - 26, w.y); g.lineTo(w.x + 26, w.y); g.quadraticCurveTo(w.x + 60, w.y - 150, w.x + 250, w.y - 275); g.closePath(); g.fill();
      g.save();
      g.beginPath(); g.moveTo(w.x - 250, w.y - 275); g.quadraticCurveTo(w.x - 60, w.y - 150, w.x - 26, w.y); g.lineTo(w.x + 26, w.y); g.quadraticCurveTo(w.x + 60, w.y - 150, w.x + 250, w.y - 275); g.closePath(); g.clip();
      hatch(g, w.x - 250, w.y - 280, 180, 280, { step: 9, angle: 1.1, colour: 'rgba(15,40,70,0.4)', width: 2 });
      hatch(g, w.x + 60, w.y - 280, 190, 280, { step: 9, angle: -1.1, colour: 'rgba(15,40,70,0.4)', width: 2 });
      hatch(g, w.x - 60, w.y - 160, 120, 160, { step: 7, angle: 0.2, colour: 'rgba(15,40,70,0.45)', width: 2, cross: true });
      g.restore();
      // The rings, each a broken wobbly ellipse, turning.
      for (let i = 0; i < 7; i++) {
        const k = 1 - i / 7;
        const rx = 36 + 215 * k, ry = 11 + 42 * k;
        const y = w.y - 275 * k * 0.92;
        const a0 = spin * (1 + i * 0.18) + i * 1.3;
        g.strokeStyle = i % 2 ? 'rgba(235,248,255,0.95)' : INK;
        g.lineWidth = i % 2 ? 5 : 3.5;
        g.globalAlpha = 0.5 + 0.5 * k;
        const pts = [];
        for (let j = 0; j <= 14; j++) { const a = a0 + (j / 14) * 4.4; pts.push([w.x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
        inkLine(g, pts, { w: 3, seed: w.x + i * 9 + Math.floor(t * 4) * 0 });
        g.stroke();
      }
      // Foam dots at the rim.
      g.globalAlpha = 0.9; g.fillStyle = '#eef8ff'; g.strokeStyle = INK; g.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        const a = spin * 0.7 + i * 0.63;
        const px = w.x + Math.cos(a) * (230 + kit.hash(i) * 30), py = w.y - 268 + Math.sin(a) * 40 + kit.hash(i + 3) * 12;
        g.beginPath(); g.arc(px, py, 3 + kit.hash(i + 7) * 4, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
    });
    // The pull, shown as the ring it reaches.
    g.save();
    g.strokeStyle = 'rgba(225,245,255,0.25)';
    g.setLineDash([12, 16]);
    g.lineWidth = 3;
    g.beginPath(); g.arc(w.x, w.y, w.R, Math.PI, Math.PI * 2); g.stroke();
    g.restore();
  }

  function drawEye(g) {
    const E = eye;
    if (!cam.sees(E.x - 250, E.x + 250)) return;
    drawRock(g, E.x, FLOOR + 6, 330, false, 1);
    const open = E.open;
    const item = open > 0.5 ? 4 : 5;
    kit.sprite(g, SHEET, item, E.x, E.y + 70, { height: 180 }, () => {
      g.save();
      g.translate(E.x, E.y);
      g.lineJoin = 'round'; g.lineCap = 'round';
      const gap = 62 * Math.max(0.06, open);
      // The socket: wrinkles of skin round the eye.
      g.strokeStyle = 'rgba(27,42,58,0.7)'; g.lineWidth = 2.4;
      for (let i = 1; i <= 3; i++) {
        const pts = [];
        for (let j = 0; j <= 16; j++) { const a = (j / 16) * Math.PI * 2; pts.push([Math.cos(a) * (118 + i * 14), Math.sin(a) * (gap + 16 + i * 12)]); }
        inkLine(g, pts, { close: true, w: 3, seed: i * 31 });
        g.stroke();
      }
      // The white, veined.
      const lid = (sign, k) => { const pts = []; for (let j = 0; j <= 14; j++) { const u = j / 14; pts.push([-118 + u * 236, sign * Math.sin(u * Math.PI) * k]); } return pts; };
      g.fillStyle = '#f4efe2'; g.strokeStyle = INK; g.lineWidth = 3.5;
      inkLine(g, [...lid(-1, gap), ...lid(1, gap).reverse()], { close: true, w: 1.5, seed: 4 });
      g.fill(); g.stroke();
      if (open > 0.1) {
        g.save();
        inkLine(g, [...lid(-1, gap), ...lid(1, gap).reverse()], { close: true, w: 1.5, seed: 4 });
        g.clip();
        g.strokeStyle = 'rgba(190,60,50,0.55)'; g.lineWidth = 1.4;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.3;
          inkLine(g, [[Math.cos(a) * 118, Math.sin(a) * 60], [Math.cos(a) * 80, Math.sin(a) * 36], [Math.cos(a) * 52 + 6, Math.sin(a) * 20]], { w: 4, seed: i * 5 });
          g.stroke();
        }
        const px = clamp((G.x - E.x) * 0.15, -40, 40);
        g.fillStyle = '#3a8f8a'; g.strokeStyle = INK; g.lineWidth = 3;
        const iris = []; for (let j = 0; j <= 16; j++) { const a = (j / 16) * Math.PI * 2; iris.push([px + Math.cos(a) * 42, Math.sin(a) * 42]); }
        inkLine(g, iris, { close: true, w: 1.5, seed: 8 }); g.fill(); g.stroke();
        g.save(); inkLine(g, iris, { close: true, w: 1.5, seed: 8 }); g.clip();
        g.strokeStyle = 'rgba(15,50,50,0.5)'; g.lineWidth = 1.5;
        for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; g.beginPath(); g.moveTo(px + Math.cos(a) * 20, Math.sin(a) * 20); g.lineTo(px + Math.cos(a) * 42, Math.sin(a) * 42); g.stroke(); }
        g.restore();
        g.fillStyle = INK; g.beginPath(); g.arc(px, 0, 19, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(px - 9, -11, 6, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      // The lids: heavy, scowling, hatched.
      g.fillStyle = ROCK.wash; g.strokeStyle = INK; g.lineWidth = 3.5;
      const upper = [[-130, 4], ...lid(-1, gap).map(([x, y]) => [x, y - 2]), [130, 4], [100, -40 - 30 * open], [0, -70 - 30 * open], [-100, -40 - 30 * open]];
      inkLine(g, upper, { close: true, w: 2, seed: 12 }); g.fill(); g.stroke();
      g.save(); inkLine(g, upper, { close: true, w: 2, seed: 12 }); g.clip();
      hatch(g, -140, -110, 280, 120, { step: 8, angle: -0.6, colour: 'rgba(27,42,58,0.3)' });
      g.restore();
      const lower = [[-130, -2], ...lid(1, gap).map(([x, y]) => [x, y + 2]), [130, -2], [100, 40 + 20 * open], [0, 62 + 20 * open], [-100, 40 + 20 * open]];
      inkLine(g, lower, { close: true, w: 2, seed: 13 }); g.fill(); g.stroke();
      // Lashes along the lid.
      g.strokeStyle = INK; g.lineWidth = 2.5;
      for (let i = 0; i < 9; i++) { const lx = -100 + i * 25; g.beginPath(); g.moveTo(lx, -gap * Math.sin(((lx + 118) / 236) * Math.PI) - 2); g.lineTo(lx - 4, -gap * Math.sin(((lx + 118) / 236) * Math.PI) - 16 - 10 * open); g.stroke(); }
      // The brow: a heavy scowl.
      g.strokeStyle = INK; g.lineWidth = 7;
      inkLine(g, [[-100, -46 - 30 * open], [-30, -72 - 30 * open], [40, -70 - 30 * open], [104, -50 - 30 * open]], { w: 3, seed: 14 }); g.stroke();
      g.restore();
    });
    for (const tc of E.tentacles) drawTentacle(g, tc);
  }

  function drawTentacle(g, tc) {
    const { tentacleWarn: w } = T;
    if (tc.t < w) {
      // The warning: a dark shape stirring in the sand.
      g.save();
      g.globalAlpha = 0.5 + 0.4 * Math.sin(tc.t * 20);
      g.fillStyle = '#c77a3b'; g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.ellipse(tc.x, FLOOR - 4, 46, 12, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
      return;
    }
    const h = tc.h;
    if (h < 4) return;
    // The delivered tentacle keeps its shape and rises out of the sand (clipped
    // to its height so far); the stand-in is drawn to the height itself.
    g.save();
    g.beginPath(); g.rect(tc.x - 200, FLOOR - h, 400, h + 20); g.clip();
    kit.sprite(g, SHEET, 6, tc.x, FLOOR + 8, { height: Math.max(h, 520), ax: 0.3 }, () => {
      g.save();
      g.lineCap = 'round';
      const curl = Math.min(1, h / T.tentacleH);
      const path = () => {
        g.beginPath();
        g.moveTo(tc.x, FLOOR + 10);
        g.quadraticCurveTo(tc.x - 60 * curl, FLOOR - h * 0.55, tc.x + 10, FLOOR - h);
        g.quadraticCurveTo(tc.x + 70 * curl, FLOOR - h - 30 * curl, tc.x + 60 * curl, FLOOR - h + 50 * curl);
      };
      g.strokeStyle = INK; g.lineWidth = 46; path(); g.stroke();
      g.strokeStyle = '#e4873f'; g.lineWidth = 36; path(); g.stroke();
      // Suckers.
      g.fillStyle = '#f3b6a0'; g.strokeStyle = INK; g.lineWidth = 2;
      for (let i = 1; i < 7; i++) {
        const u = i / 7;
        const x = tc.x - 60 * curl * 2 * u * (1 - u) + 10 * u * u, y = FLOOR - h * u;
        g.beginPath(); g.arc(x - 8, y, 7, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
    });
    g.restore();
  }

  function drawFish(g, f) {
    const y = f.yy ?? f.y;
    const flip = f.dir < 0;
    const wag = env.reduceMotion ? 0 : Math.sin(t * 9 + f.ph) * 0.18;
    kit.sprite(g, SHEET, 3, f.x, y, { height: 96, ay: 0.5, flip }, () => {
      g.save();
      g.translate(f.x, y);
      if (flip) g.scale(-1, 1);
      g.lineJoin = 'round'; g.lineCap = 'round';
      const angry = f.state === 'alert' || f.state === 'dart';
      const seed = f.ph * 10;
      // The tail, ribbed.
      g.save(); g.translate(-54, 0); g.rotate(wag);
      g.fillStyle = FISH.fin; g.strokeStyle = INK; g.lineWidth = 3;
      inkLine(g, [[2, -6], [-26, -32], [-36, -16], [-30, 0], [-36, 16], [-26, 32], [2, 6]], { close: true, w: 2, seed });
      g.fill(); g.stroke();
      g.strokeStyle = 'rgba(27,42,58,0.5)'; g.lineWidth = 1.5;
      for (const yy of [-20, -8, 6, 18]) { g.beginPath(); g.moveTo(-4, yy * 0.3); g.lineTo(-30, yy); g.stroke(); }
      g.restore();
      // Dorsal and belly fins.
      g.fillStyle = FISH.fin; g.strokeStyle = INK; g.lineWidth = 3;
      inkLine(g, [[-22, -24], [-14, -50], [4, -54], [22, -44], [28, -26]], { close: true, w: 2, seed: seed + 1 }); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(27,42,58,0.5)'; g.lineWidth = 1.5;
      for (const xx of [-12, -2, 10, 20]) { g.beginPath(); g.moveTo(xx, -28); g.lineTo(xx - 2, -50); g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 3;
      inkLine(g, [[-10, 26], [-4, 42], [14, 44], [20, 28]], { close: true, w: 2, seed: seed + 2 }); g.fill(); g.stroke();
      // The body: a fat lens with a wobbly ink edge.
      const body = []; for (let j = 0; j <= 18; j++) { const a = (j / 18) * Math.PI * 2; body.push([Math.cos(a) * 60 - 2, Math.sin(a) * 31 * (1 + 0.15 * Math.cos(a))]); }
      g.fillStyle = angry ? FISH.angry : FISH.wash; g.strokeStyle = INK; g.lineWidth = 3.5;
      inkLine(g, body, { close: true, w: 1.8, seed: seed + 3 }); g.fill(); g.stroke();
      g.save(); inkLine(g, body, { close: true, w: 1.8, seed: seed + 3 }); g.clip();
      g.fillStyle = FISH.belly; g.beginPath(); g.ellipse(-6, 16, 46, 14, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(27,42,58,0.45)'; g.lineWidth = 1.4;
      for (let r = 0; r < 4; r++) for (let cx = -44 + (r % 2) * 7; cx < 24; cx += 14) { g.beginPath(); g.arc(cx, -22 + r * 12, 7, 0.3, Math.PI - 0.3); g.stroke(); }
      hatch(g, -62, -34, 50, 40, { step: 6, angle: -0.8, colour: 'rgba(27,42,58,0.3)' });
      // The gill.
      g.strokeStyle = INK; g.lineWidth = 2.2; inkLine(g, [[22, -22], [14, 0], [22, 20]], { w: 2, seed: seed + 4 }); g.stroke();
      g.restore();
      // A pectoral fin.
      g.fillStyle = FISH.fin; g.strokeStyle = INK; g.lineWidth = 2.5;
      inkLine(g, [[4, 6], [-14, 20], [-6, 26], [12, 16]], { close: true, w: 1.5, seed: seed + 5 }); g.fill(); g.stroke();
      // The face: a heavy brow, a slitted eye, a frown full of fangs.
      g.fillStyle = '#f6f0e0'; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(34, -8, 11, 9, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.ellipse(37, -7, 4.5, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(35, -10, 1.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round';
      inkLine(g, [[18, -28], [34, -22], [46, -16]], { w: 1.5, seed: seed + 6 }); g.stroke();
      g.lineWidth = 3;
      inkLine(g, [[30, 14], [42, 8], [54, 8], [62, 12]], { w: 1.5, seed: seed + 7 }); g.stroke();
      g.fillStyle = '#fff'; g.lineWidth = 1.8;
      for (let i = 0; i < 4; i++) { const tx = 34 + i * 8; g.beginPath(); g.moveTo(tx, 10 - i); g.lineTo(tx + 3, 20 - i * 1.5); g.lineTo(tx + 6, 9 - i); g.closePath(); g.fill(); g.stroke(); }
      for (let i = 0; i < 2; i++) { const tx = 40 + i * 12; g.beginPath(); g.moveTo(tx, 11); g.lineTo(tx + 3, 2); g.lineTo(tx + 6, 11); g.closePath(); g.fill(); g.stroke(); }
      g.restore();
    });
  }

  function drawBigBubble(g, b) {
    if (b.popped) {
      art.drawSprite(g, art.prop('bombanat', 4), b.x, b.y + b.r, { height: b.r * 2.2, alpha: 1 - b.t / 0.3 });
      return;
    }
    const wob = env.reduceMotion ? 0 : Math.sin(t * 5 + b.ph) * 0.06;
    kit.sprite(g, SHEET, 10, b.x, b.y + b.r, { height: b.r * 2, sx: 1 + wob, sy: 1 - wob }, () => {
      if (!art.drawSprite(g, art.prop('bombanat', 3), b.x, b.y + b.r, { height: b.r * 2.1, sx: 1 + wob, sy: 1 - wob })) {
        g.save();
        g.fillStyle = 'rgba(170,215,245,0.75)'; g.strokeStyle = INK; g.lineWidth = 4;
        g.beginPath(); g.ellipse(b.x, b.y, b.r * (1 + wob), b.r * (1 - wob), 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.22, b.r * 0.13, -0.6, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    });
  }

  function drawUnderBoat(g, b) {
    // Chains, ropes, the anchor and the net below the surface.
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (b.kind === 'anchor') {
      const rattle = b.state === 'rattle' ? Math.sin(t * 40) * 6 : 0;
      const ax = b.hx + rattle, ay = b.y;
      // The chain: links (the delivered anchor brings its own top links).
      const chainTo = art.sprite(SHEET, 7) ? ay - 110 : ay - 70;
      g.strokeStyle = INK; g.lineWidth = 2.5;
      for (let yy = SURF - 10; yy < chainTo; yy += 16) { g.beginPath(); g.ellipse(ax, yy + 8, 5, 9, 0, 0, Math.PI * 2); g.stroke(); }
      kit.sprite(g, SHEET, 7, ax, ay + 50, { height: 170, ax: 0.6 }, () => {
        g.save();
        g.translate(ax, ay);
        g.strokeStyle = INK; g.lineWidth = 3;
        // Ring, shank, stock and the two flukes, in a rusty iron wash.
        g.beginPath(); g.arc(0, -56, 14, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 2; g.beginPath(); g.arc(0, -56, 9, 0, Math.PI * 2); g.stroke();
        g.fillStyle = IRON.wash; g.lineWidth = 3;
        inkLine(g, [[-6, -42], [6, -42], [8, 44], [-8, 44]], { close: true, w: 1.5, seed: ax }); g.fill(); g.stroke();
        inkLine(g, [[-44, -24], [44, -24], [46, -14], [-46, -14]], { close: true, w: 1.5, seed: ax + 1 }); g.fill(); g.stroke();
        inkLine(g, [[-54, 6], [-46, 26], [-20, 44], [0, 50], [20, 44], [46, 26], [54, 6], [44, 4], [30, 24], [0, 36], [-30, 24], [-44, 4]], { close: true, w: 2, seed: ax + 2 }); g.fill(); g.stroke();
        inkLine(g, [[-54, 6], [-66, -2], [-48, 20]], { close: true, w: 1.5, seed: ax + 3 }); g.fill(); g.stroke();
        inkLine(g, [[54, 6], [66, -2], [48, 20]], { close: true, w: 1.5, seed: ax + 4 }); g.fill(); g.stroke();
        g.save();
        inkLine(g, [[-54, 6], [-46, 26], [-20, 44], [0, 50], [20, 44], [46, 26], [54, 6], [44, 4], [30, 24], [0, 36], [-30, 24], [-44, 4]], { close: true, w: 2, seed: ax + 2 }); g.clip();
        hatch(g, -60, 0, 120, 60, { step: 6, angle: -0.7, colour: 'rgba(27,42,58,0.4)' });
        g.restore();
        g.strokeStyle = 'rgba(27,42,58,0.4)'; g.lineWidth = 1.5;
        for (let yy = -36; yy < 40; yy += 9) { g.beginPath(); g.moveTo(-5, yy); g.lineTo(5, yy + 4); g.stroke(); }
        g.fillStyle = 'rgba(190,110,60,0.35)'; g.beginPath(); g.ellipse(2, 10, 8, 20, 0, 0, Math.PI * 2); g.fill(); // rust
        g.restore();
      });
      if (b.state === 'rattle') warnMark(g, ax, SURF - 150);
    } else {
      const jig = b.state === 'creak' ? Math.sin(t * 35) * 8 : 0;
      const nx = b.hx + jig, ny = b.y;
      // The rope, twisted.
      g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(nx, SURF - 90); g.lineTo(nx, ny - 150); g.stroke();
      g.strokeStyle = '#c9a66b'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(nx, SURF - 90); g.lineTo(nx, ny - 150); g.stroke();
      g.strokeStyle = 'rgba(27,42,58,0.5)'; g.lineWidth = 1.5;
      for (let yy = SURF - 86; yy < ny - 152; yy += 8) { g.beginPath(); g.moveTo(nx - 3, yy); g.lineTo(nx + 3, yy + 4); g.stroke(); }
      kit.sprite(g, SHEET, 8, nx, ny + 150, { height: 310 }, () => {
        if (!art.drawSprite(g, art.prop('grumley', 7), nx, ny + 150, { height: 300 })) {
          g.strokeStyle = INK; g.lineWidth = 3;
          g.beginPath(); g.ellipse(nx, ny, 110, 130, 0, 0, Math.PI * 2); g.stroke();
        }
      });
      if (b.state === 'creak') warnMark(g, nx, SURF - 150);
    }
    g.restore();
  }

  function warnMark(g, x, y) {
    g.save();
    g.font = '800 54px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.lineWidth = 8; g.strokeStyle = 'rgba(248,241,224,0.95)'; g.fillStyle = '#b3402e';
    g.strokeText('!', x, y); g.fillText('!', x, y);
    g.restore();
  }

  function drawBoat(g, b) {
    const bob = env.reduceMotion ? 0 : Math.sin(t * 1.3 + b.x * 0.01) * 5;
    const y = SURF + 14 + bob;
    const seed = b.x * 0.01;
    g.save();
    g.translate(b.x, y);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = INK; g.lineWidth = 4;
    // The hull.
    const hull = [[-240, -78], [-246, -40], [-226, 0], [-196, 30], [-100, 44], [0, 50], [100, 44], [196, 30], [226, 0], [246, -40], [240, -78]];
    g.fillStyle = b.kind === 'net' ? BOAT.teal : BOAT.blue;
    inkLine(g, hull, { close: true, w: 2.5, seed }); g.fill(); g.stroke();
    g.save(); inkLine(g, hull, { close: true, w: 2.5, seed }); g.clip();
    // A lighter strake along the top, planks, and the shaded underside.
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-260, -78, 520, 20);
    g.strokeStyle = 'rgba(27,42,58,0.5)'; g.lineWidth = 2;
    for (let yy = -56; yy < 44; yy += 18) { inkLine(g, [[-260, yy], [-120, yy + 2], [0, yy + 4], [120, yy + 2], [260, yy]], { w: 1.5, seed: seed + yy }); g.stroke(); }
    for (let xx = -200; xx < 240; xx += 80) { g.beginPath(); g.moveTo(xx + (xx % 160 ? 0 : 30), -56); g.lineTo(xx + (xx % 160 ? 0 : 30), 44); g.stroke(); }
    g.fillStyle = 'rgba(27,42,58,0.22)';
    g.beginPath(); g.moveTo(-260, 6); g.lineTo(260, 6); g.lineTo(260, 60); g.lineTo(-260, 60); g.closePath(); g.fill();
    hatch(g, -260, 4, 520, 56, { step: 8, angle: -0.6, colour: 'rgba(27,42,58,0.35)' });
    hatch(g, 120, -80, 140, 140, { step: 9, angle: -0.8, colour: 'rgba(27,42,58,0.22)' });
    g.restore();
    // Portholes, ringed in brass.
    g.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
      g.fillStyle = BOAT.brass; g.beginPath(); g.arc(i * 72, -30, 15, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#d9ecf2'; g.beginPath(); g.arc(i * 72, -30, 9, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 72 - 5, -34); g.lineTo(i * 72 + 1, -28); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3;
    }
    // The gunwale, with a rope rail and old tyres over the side.
    g.fillStyle = BOAT.wood; inkLine(g, [[-244, -90], [0, -96], [244, -90], [244, -76], [0, -82], [-244, -76]], { close: true, w: 2, seed: seed + 1 }); g.fill(); g.stroke();
    g.strokeStyle = '#c9a66b'; g.lineWidth = 3; inkLine(g, [[-230, -106], [-120, -100], [0, -104], [120, -100], [230, -106]], { w: 2, seed: seed + 2 }); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 3;
    for (const sx of [-230, -120, 0, 120, 230]) { g.beginPath(); g.moveTo(sx, -90); g.lineTo(sx, -112); g.stroke(); }
    for (const tx of [-206, 206]) {
      g.fillStyle = IRON.dark; g.beginPath(); g.arc(tx, -14, 15, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = BOAT.blue; g.beginPath(); g.arc(tx, -14, 6, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    // The wheelhouse: planked, with a roof, windows and a chimney with smoke.
    const house = [[-112, -98], [-110, -176], [44, -178], [42, -98]];
    g.fillStyle = BOAT.wood; g.lineWidth = 4; inkLine(g, house, { close: true, w: 2, seed: seed + 3 }); g.fill(); g.stroke();
    g.save(); inkLine(g, house, { close: true, w: 2, seed: seed + 3 }); g.clip();
    g.strokeStyle = 'rgba(70,40,20,0.5)'; g.lineWidth = 1.8;
    for (let xx = -98; xx < 44; xx += 16) { inkLine(g, [[xx, -178], [xx + 1, -138], [xx, -98]], { w: 1.5, seed: seed + xx }); g.stroke(); }
    hatch(g, 10, -180, 40, 90, { step: 7, angle: -0.7, colour: 'rgba(27,42,58,0.3)' });
    g.restore();
    g.fillStyle = BOAT.woodDark; inkLine(g, [[-124, -176], [-120, -194], [56, -194], [54, -176]], { close: true, w: 2, seed: seed + 4 }); g.fill(); g.stroke();
    g.fillStyle = '#d9ecf2'; g.lineWidth = 3;
    for (const wx of [-96, -36]) {
      g.fillRect(wx, -164, 44, 36); g.strokeRect(wx, -164, 44, 36);
      g.beginPath(); g.moveTo(wx + 22, -164); g.lineTo(wx + 22, -128); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(wx + 6, -158); g.lineTo(wx + 16, -140); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3;
    }
    g.fillStyle = IRON.dark; inkLine(g, [[-66, -192], [-66, -236], [-40, -236], [-40, -192]], { close: true, w: 1.5, seed: seed + 5 }); g.fill(); g.stroke();
    g.fillStyle = IRON.dark; g.fillRect(-72, -242, 38, 8); g.strokeRect(-72, -242, 38, 8);
    g.fillStyle = 'rgba(240,236,228,0.6)'; g.strokeStyle = 'rgba(27,42,58,0.4)'; g.lineWidth = 2;
    const puff = env.reduceMotion ? 0 : (t * 0.5) % 1;
    for (let i = 0; i < 3; i++) { const r = 10 + i * 5; const px = -52 + i * 14 + puff * 10, py = -256 - i * 22 - puff * 14; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 3;
    // Crates of fish on deck.
    for (const cx of [70, 118]) {
      g.fillStyle = BOAT.woodDark; inkLine(g, [[cx, -98], [cx, -128], [cx + 44, -128], [cx + 44, -98]], { close: true, w: 1.5, seed: seed + cx }); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(27,42,58,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + 4, -113); g.lineTo(cx + 40, -113); g.moveTo(cx + 22, -128); g.lineTo(cx + 22, -98); g.stroke();
      g.fillStyle = FISH.wash; g.strokeStyle = INK; g.lineWidth = 2;
      for (const fx of [cx + 8, cx + 26]) { g.beginPath(); g.ellipse(fx + 6, -134, 10, 4, 0.3, 0, Math.PI * 2); g.fill(); g.stroke(); }
    }
    if (b.kind === 'net') {
      // The crane over the side: a boom with a pulley block.
      g.strokeStyle = INK; g.lineWidth = 13; g.lineCap = 'round';
      g.beginPath(); g.moveTo(60, -96); g.lineTo(92, -238); g.lineTo(172, -118); g.stroke();
      g.strokeStyle = BOAT.wood; g.lineWidth = 7;
      g.beginPath(); g.moveTo(60, -96); g.lineTo(92, -238); g.lineTo(172, -118); g.stroke();
      g.strokeStyle = 'rgba(70,40,20,0.6)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(64, -100); g.lineTo(94, -232); g.moveTo(96, -230); g.lineTo(168, -122); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.moveTo(92, -238); g.lineTo(60, -160); g.stroke(); // a stay
      g.fillStyle = IRON.dark; g.beginPath(); g.arc(172, -114, 9, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = BOAT.brass; g.beginPath(); g.arc(172, -114, 3, 0, Math.PI * 2); g.fill();
    } else {
      // A davit for the anchor chain.
      g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(130, -96); g.quadraticCurveTo(150, -140, 150, -110); g.stroke();
      g.strokeStyle = IRON.dark; g.lineWidth = 5; g.beginPath(); g.moveTo(130, -96); g.quadraticCurveTo(150, -140, 150, -110); g.stroke();
    }
    g.restore();
  }

  function drawBubbles(g) {
    for (const b of bubbles) {
      if (!cam.sees(b.x, b.x, 60)) continue;
      const yy = b.y - b.t * 40;
      if (b.t > b.life) { art.drawSprite(g, art.prop('bombanat', 4), b.x, yy + 6, { height: 48 * b.s, alpha: 1 - (b.t - b.life) / 0.18 }); continue; }
      const grow = Math.min(1, b.t / b.life);
      const item = grow < 0.4 ? 1 : grow < 0.8 ? 2 : 3;
      const h = (16 + 30 * grow) * b.s;
      if (!art.drawSprite(g, art.prop('bombanat', item), b.x, yy + 4, { height: h })) {
        g.save(); g.fillStyle = 'rgba(170,215,245,0.7)'; g.strokeStyle = 'rgba(27,42,58,0.6)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(b.x, yy - h / 2, h * 0.5, h / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }
    }
  }

  function drawGrumley(g) {
    const c = G.c;
    if (self.done && self.outcome === 'snatched') return; // drawn risen, above the tint
    c.x = G.x;
    c.facing = G.facing;
    c.sizeK = SIZE;
    // Netted: inside the net.
    if (G.mode === 'netted') c.sizeK = SIZE * 0.8;
    c.y = G.y + art.creatureSize(c).h / 2;
    art.drawCreature(g, c, t, { reduceMotion: env.reduceMotion, shadow: false });
    // The V of his wake when he swims near the surface.
    const sp = Math.hypot(G.vx, G.vy);
    if (!G.air && sp > 60 && G.y < SURF + 200 && G.mode === 'swim') {
      const a = Math.min(0.8, sp / 500) * (1 - (G.y - SURF) / 200);
      const back = -G.facing;
      g.save();
      g.strokeStyle = `rgba(240,250,255,${a})`;
      g.lineWidth = 5; g.lineCap = 'round';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(G.x + back * 40, SURF + 2);
        g.quadraticCurveTo(G.x + back * 160, SURF + 2 + s * 10, G.x + back * (240 + sp * 0.25), SURF + 2 + s * 24);
        g.stroke();
      }
      g.restore();
    }
  }

  // After the snatch: out of the goo, holding him up (then netted and hauled up).
  function drawGrumleyRisen(g) {
    const c = G.c;
    c.x = G.x; c.facing = G.facing; c.sizeK = SIZE; c.y = G.y + art.creatureSize(c).h / 2;
    g.save();
    if (c.z < 30) { g.beginPath(); g.rect(cam.x - 50, -200, W + 100, SURF + 110); g.clip(); }
    art.drawCreature(g, c, t, { reduceMotion: env.reduceMotion, shadow: false });
    g.restore();
    if (c.z < 200) art.drawSprite(g, art.prop('grumley', 6), G.x, SURF + 30, { height: 110, alpha: 1 - c.z / 200 });
  }

  function drawClaw(g) {
    const Lg = G.lunge;
    const ax = G.x + Lg.dx * 30, ay = G.y - 20;
    const tx = Lg.tipX, ty = Lg.tipY;
    const ang = Math.atan2(ty - ay, tx - ax);
    g.save();
    g.lineCap = 'round';
    // The spiny arm, with a little sag.
    const mx = (ax + tx) / 2 + Math.cos(ang + Math.PI / 2) * 22, my = (ay + ty) / 2 + Math.sin(ang + Math.PI / 2) * 22;
    for (const [col, w] of [[INK, 30], ['#e4873f', 22]]) {
      g.strokeStyle = col; g.lineWidth = w;
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, tx, ty); g.stroke();
    }
    g.strokeStyle = INK; g.lineWidth = 3;
    for (let i = 1; i < 6; i++) {
      const u = i / 6;
      const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * tx, y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * ty;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang - 1.9) * 16, y + Math.sin(ang - 1.9) * 16); g.stroke();
    }
    // The claw: two halves, open on the way out, shut on the way back or on a catch.
    const open = Lg.hit || Lg.t > T.lungeOut + T.lungeHold ? 0.12 : 0.55;
    g.translate(tx, ty); g.rotate(ang);
    g.fillStyle = '#e4873f'; g.strokeStyle = INK; g.lineWidth = 4;
    for (const s of [-1, 1]) {
      g.save(); g.rotate(s * open);
      g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(30, s * 34, 72, s * 6); g.quadraticCurveTo(40, s * 10, -6, s * 18); g.closePath(); g.fill(); g.stroke();
      // Teeth.
      g.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(20 + i * 14, s * 12); g.lineTo(26 + i * 14, s * 2); g.lineTo(32 + i * 14, s * 12); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = '#e4873f';
      g.restore();
    }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(6, -12, 8, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(8, -12, 3.5, 0, Math.PI * 2); g.fill();
    g.restore();
    // A splash ring where the arm breaks the surface.
    if ((ay - SURF) * (ty - SURF) < 0) {
      const u = (SURF - ay) / (ty - ay);
      const x = ax + (tx - ax) * u;
      art.drawSprite(g, art.prop('grumley', 6), x, SURF + 24, { height: 80 * Lg.k + 20 });
    }
  }

  // The translucent goo over everything below the surface, and the surface's
  // glossy wavy edge.
  function drawGooTint(g) {
    const { x0, x1 } = V();
    g.save();
    const strip = !!art.sprite(TERRAIN, 1);
    g.fillStyle = strip ? 'rgba(40,120,180,0.14)' : 'rgba(40,120,180,0.22)';
    g.fillRect(x0, SURF, x1 - x0, H - SURF);
    if (strip) { g.restore(); return; }
    // The surface.
    const step = 36;
    const wave = (x) => SURF + Math.sin(x * 0.02 + t * 1.5) * 5 + Math.sin(x * 0.051 - t * 0.9) * 3;
    g.fillStyle = 'rgba(120,200,235,0.55)';
    g.beginPath();
    g.moveTo(x0, SURF + 30);
    for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) g.lineTo(x, wave(x));
    g.lineTo(x1 + step, SURF + 30);
    g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath();
    for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) { if (x === Math.floor(x0 / step) * step) g.moveTo(x, wave(x)); else g.lineTo(x, wave(x)); }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
    g.beginPath();
    for (let x = Math.floor(x0 / 160) * 160; x < x1; x += 160) { g.moveTo(x + 20, wave(x + 20) + 12); g.lineTo(x + 70, wave(x + 70) + 12); }
    g.stroke();
    g.restore();
  }

  function drawRings(g) {
    for (const p of rings) {
      const u = p.t / p.life;
      g.save();
      g.globalAlpha = 1 - u;
      g.strokeStyle = '#e8f6ff'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(p.x, SURF + 4, p.size * (0.4 + u), p.size * 0.22 * (0.4 + u), 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  }

  function drawFlier(g, f) {
    const c = f.c;
    // Shadow on the goo.
    g.save(); g.globalAlpha = 0.2 * Math.max(0.2, 1 - (SURF - f.y) / 500); g.fillStyle = '#10304a';
    g.beginPath(); g.ellipse(f.x, SURF + 6, 44, 9, 0, 0, Math.PI * 2); g.fill(); g.restore();
    c.x = f.x; c.y = f.y;
    art.drawCreature(g, c, t, { reduceMotion: env.reduceMotion, shadow: false });
  }

  function drawHolder(g) {
    const c = L.c;
    if (L.mode === 'grabbed') {
      if (outroT >= 0.5) return; // in the Grumley's claw in his celebrate pose
      c.x = G.x + G.facing * 70; c.y = G.y - 150; c.facing = -G.facing;
      art.setAnim(c, 'grabbed');
      art.drawCreature(g, c, t, { reduceMotion: env.reduceMotion, shadow: false });
      return;
    }
    if (!cam.sees(L.x)) return;
    c.x = L.x; c.y = L.y;
    if (L.mode !== 'perched') {
      g.save(); g.globalAlpha = 0.22 * Math.max(0.2, 1 - (SURF - L.y) / 600); g.fillStyle = '#10304a';
      g.beginPath(); g.ellipse(L.x, SURF + 6, 60, 12, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    art.drawCreature(g, c, t, { reduceMotion: env.reduceMotion, shadow: false });
    // The letter he carries, and when he is coming down to land, the target.
    const bob = env.reduceMotion ? 0 : Math.sin(t * 4) * 5;
    letterTag(g, L.x - (L.mode === 'perched' ? -70 : 100), L.y - 50 + bob, { t, r: 38 });
    if (!self.done && (L.mode === 'perched' || (L.mode === 'landing' && L.T > 1.2))) marker(g, L.x, L.y - 110, { t, label: L.mode === 'perched' ? 'Grab him!' : '' });
  }

  // "Grab!" over the Grumley when the letter Bombanat is in reach of a lunge.
  function drawPrompt(g) {
    if (self.done || G.mode !== 'swim' || G.lunge || L.mode === 'grabbed') return;
    const d = Math.hypot(L.x - G.x, L.y - (G.y - 20));
    if (d > reach + clawR * 0.8) return;
    actionPrompt(g, G.x, G.y - 150, 'Grab!', { kind: env.inputKind, t, pulse: 1 });
  }

  function drawOutroNet(g) {
    const n = outroNet;
    const x = G.x - cam.x;
    const top = n.phase === 'down' ? n.y - 280 : G.y - 250 - G.c.z;
    g.save();
    g.strokeStyle = '#3a2a1e'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x, -10); g.lineTo(x, top); g.stroke();
    g.restore();
    if (n.phase === 'down') art.drawSprite(g, art.prop('grumley', 7), x, n.y, { height: 320 });
  }

  // The lunch basket, fixed to the screen's bottom left.
  function drawBasket(g) {
    const sq = basketKick > 0 ? Math.sin(basketKick * Math.PI) * 0.15 : 0;
    const x = 150, y = H - 36;
    const sp = art.prop('grumley', got > 0 ? 5 : 4);
    if (!art.drawSprite(g, sp, x, y, { height: 130, sx: 1 + sq, sy: 1 - sq })) {
      g.save(); g.fillStyle = '#c99a4a'; g.strokeStyle = INK; g.lineWidth = 4;
      g.fillRect(x - 70, y - 90, 140, 90); g.strokeRect(x - 70, y - 90, 140, 90); g.restore();
    }
  }

  function drawLunchFlight(g, l) {
    const u = Math.min(1, l.t / 0.8);
    const x = l.sx + (150 - l.sx) * u;
    const y = l.sy + (H - 110 - l.sy) * u - Math.sin(u * Math.PI) * 220;
    const sp = art.sprite('bombanat.plain', 5);
    g.save();
    if (!art.drawSprite(g, sp, x, y, { height: 100 * (1 - u * 0.4), ay: 0.5, rot: u * 6 })) {
      g.fillStyle = '#9a7fa6'; g.beginPath(); g.arc(x, y, 30 * (1 - u * 0.4), 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  return self;
}

// ---------- the how-to-play page ----------

export const HOWTO = [
  {
    text: 'Swim under the goo and lunge a claw up at the Bombanats skimming it.',
    scene: 'scenes/grumley', crop: [500, 500, 900, 506],
    items: [
      { creature: 'grumley', anim: 'clawsUp', x: 300, y: 430, h: 190 },
      { creature: 'bombanatPlain', anim: 'glide', x: 380, y: 110, h: 90 },
      { path: [[300, 300], [370, 150]], arrow: true },
      { word: 'SNAP!', x: 470, y: 90, size: 40 },
    ],
  },
  {
    text: 'Keep deep under the boats: nets can’t reach the bottom. Netted? Mash Action.',
    scene: 'scenes/grumley', crop: [500, 500, 900, 506],
    items: [
      { sprite: ['props.grumley', 7], x: 330, y: 300, h: 220 },
      { creature: 'grumley', anim: 'swimA', x: 180, y: 470, h: 150 },
      { path: [[90, 420], [280, 440], [520, 430]], arrow: true },
      { ring: [330, 200, 120] },
    ],
  },
  {
    text: 'At the island, wait for the Bombanat to land, then grab him!',
    scene: 'scenes/grumley', crop: [0, 380, 900, 506],
    items: [
      { creature: 'bombanat', anim: 'perched', x: 200, y: 250, h: 110 },
      { creature: 'grumley', anim: 'leap', x: 430, y: 470, h: 210 },
      { path: [[430, 330], [250, 230]], arrow: true },
      { word: 'Grab!', x: 480, y: 120, size: 44 },
    ],
  },
];

// ---------- the autopilot ----------
//
// Plays the board to the snatch: swims right, lunges at skimming and perched
// Bombanats on the way, keeps deep under the net boats and waits out the
// anchors, hugs the surface past the whirlpools, and under the island waits
// for the letter Bombanat to land, then lunges at him.

export function autopilot(board) {
  const { G, L, fliers, boats, eye, T, bigBubbles, world } = board;
  const ai = (board.ai ||= { mashOn: false, waitT: 0, target: null, highWait: 0 });
  const inp = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  const reach = board.reach;
  if (board.done) return inp;
  if (G.mode === 'netted') {
    ai.mashOn = !ai.mashOn;
    inp.action = ai.mashOn;
    inp.actionPressed = ai.mashOn;
    return inp;
  }
  if (G.mode !== 'swim' || G.lunge) return inp;
  const want = (x, y) => { inp.x = clamp(x, -1, 1); inp.y = clamp(y, -1, 1); };
  const seek = (tx, ty, gain = 0.012) => want((tx - G.x) * gain, (ty - G.y) * gain);
  const lungeAt = (px, py) => {
    const dx = px - G.x, dy = py - (G.y - 20);
    const d = Math.hypot(dx, dy);
    if (d > reach + T.clawR * 0.8) return false;
    inp.x = dx / d; inp.y = dy / d;
    inp.action = true; inp.actionPressed = true;
    return true;
  };

  // Hazards first.
  const anchorNear = boats.find((b) => b.kind === 'anchor' && (b.state === 'rattle' || b.state === 'fall') && Math.abs(b.hx - G.x) < 230);
  if (anchorNear && G.bubble === null) {
    // Back off until it is down.
    want(G.x > anchorNear.hx ? 1 : -1, 0.4);
    return inp;
  }
  const tentacle = eye.tentacles.find((tc) => !tc.hit && tc.t < 1.2 && Math.abs(tc.x - G.x) < 160);
  if (tentacle) { want(1, -0.6); inp.sprint = G.jetCd <= 0; return inp; }

  // Under a net boat, keep out of the band the net sweeps: the surface or the bottom.
  const netNear = boats.find((b) => b.kind === 'net' && Math.abs(b.hx - G.x) < 300);
  if (netNear && G.y > T.netReady - 40 && G.y < T.bottomY - 50 && !G.bubble) {
    const toTop = G.y - (T.netReady - 40) < (T.bottomY - 50) - G.y;
    want(G.x < netNear.hx ? 1 : 0.3, toTop ? -1 : 1);
    inp.sprint = G.jetCd <= 0;
    return inp;
  }

  // The island: wait for him to land.
  if (G.x > ISLAND.x - 420) {
    const underX = ISLAND.x - T.radius - 10;
    if (L.mode === 'perched' || (L.mode === 'landing' && L.y > PERCH.y - 120)) {
      if (lungeAt(L.x, L.y)) return inp;
    }
    seek(underX, SURF - 40, 0.02);
    return inp;
  }

  // A high one over the whirlpools: ride a goo bubble up from a vent and lunge at the top.
  const inWhirlNow = G.x > sx(8000) && G.x < sx(10700);
  const highT = inWhirlNow ? fliers.find((f) => !f.got && f.kind === 'high' && f.x > G.x - 200 && f.x < G.x + 700) : null;
  if (highT && ai.highWait < 9) {
    ai.highWait += 1 / 30;
    if (G.air) { lungeAt(highT.x, highT.y); return inp; }
    if (G.bubble) { inp.x = clamp((highT.x - G.x) / 200, -0.5, 0.5); return inp; }
    let vent = null, vd = 1e9;
    for (const v of world.vents) { const d = Math.abs(v.x - highT.x); if (d < vd) { vd = d; vent = v; } }
    const bub = bigBubbles.find((b) => !b.popped && Math.abs(b.x - vent.x) < 80 && b.y > SURF + 150);
    if (bub) seek(bub.x, bub.y, 0.02); else seek(vent.x, SURF + 380, 0.015);
    return inp;
  }
  if (!highT) ai.highWait = 0;

  // A Bombanat worth a lunge: skimming or perched, a little ahead or just behind.
  if (!ai.target || ai.target.got || ai.target.x < G.x - 260) ai.target = null;
  if (!ai.target) {
    let best = null, bestD = 1e9;
    for (const f of fliers) {
      if (f.got || f.kind === 'high') continue;
      const dx = f.x - G.x;
      if (dx < -200 || dx > 560) continue;
      const d = Math.abs(dx) + (f.kind === 'perched' ? 120 : 0);
      if (d < bestD) { bestD = d; best = f; }
    }
    ai.target = best;
    ai.waitT = 0;
  }
  if (ai.target) {
    const f = ai.target;
    ai.waitT += 1 / 30;
    if (ai.waitT > 6) { ai.target = null; }
    // Perched ones: come up from below so as not to startle them.
    const wantY = f.kind === 'perched' ? SURF + 150 : SURF - 50;
    // Lead a skimming one a little.
    const px = f.x + (f.kind === 'perched' ? 0 : f.dir * 40);
    if (lungeAt(px, f.y)) return inp;
    seek(px, wantY, 0.015);
    return inp;
  }

  // Otherwise onward: deep under the fishing boats, high past the whirlpools,
  // at mid depth elsewhere.
  const inFishing = G.x > sx(5100) && G.x < sx(8000);
  const inWhirl = G.x > sx(8000) && G.x < sx(10700);
  const netBoat = boats.find((b) => b.kind === 'net' && Math.abs(b.hx - G.x) < 260);
  const cruiseY = inFishing ? T.bottomY - 20 : inWhirl ? SURF - 50 : SURF + 220;
  seek(G.x + 400, cruiseY, 0.012);
  inp.x = 1;
  if (inFishing && Math.abs(G.y - cruiseY) > 80) inp.x = 0.4;
  inp.sprint = G.jetCd <= 0 && (!!netBoat || inWhirl);
  return inp;
}

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

const { W, H, clamp, ease, near } = kit;
const ENTRY = BOARDS.find((b) => b.n === 3);
const SHEET = 'adv.b03.props';
const TERRAIN = 'terrain.goo';
const INK = '#1b2a3a';

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

// ---------- the board's layout ----------

const ISLAND = { x: sx(11150), y: 296, w: 600, h: H - 296 };
const PERCH = { x: ISLAND.x + 95, y: ISLAND.y - 66 }; // where the letter Bombanat lands (his middle; feet on the rock)
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
  perched(PILLAR.x - 36, PILLAR.top - 6, -1);
  perched(PILLAR.x + 44, PILLAR.top - 2, 1); // (perched takes world x)
  // 2. The weed forest.
  for (const x of [2900, 3250, 3600, 4000, 4350, 4700, 5000]) skim(x);
  high(3150, 200);
  high(4600, 190);
  // 3. The fishing grounds.
  for (const x of [5420, 5850, 6350, 6850, 7250, 7700]) skim(x, 140);
  perched(sx(6100) - 35, SURF - 136, 1); // on a wheelhouse roof
  perched(sx(7020) - 35, SURF - 136, -1);
  // 4. The whirlpools.
  high(8250, 150);
  high(8950, 160);
  high(9750, 140);
  high(10400, 150);
  for (const x of [8700, 9500, 10200]) skim(x);
  // 5. The island.
  perched(ISLAND.x + 330, ISLAND.y - 18, -1);
  perched(ISLAND.x + 470, ISLAND.y - 14, 1);
  for (const f of fliers) {
    f.dir = f.dir ?? (rng() < 0.5 ? -1 : 1);
    f.ph = rng() * 6.28;
    f.y = f.y ?? f.baseY;
    f.got = false;
    f.startle = 0;
    f.scatter = 0;
    f.c = art.makeCreature('bombanat', f.x, f.y);
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
  const hints = kit.makeHints([
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
  G.c.sizeK = 0.9;
  // The holder: the Bombanat in the necktie, flying ahead.
  const L = {
    x: G.x + T.holderLead, y: 150, vx: 0, vy: 0, mode: 'fly', scare: 0, perchT: 0, ph: 0, flapT: 0,
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
    say('Lunch!', f.x, f.y - 70);
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
      const shy = f.kind === 'high' && G.y < SURF + 70 && G.mode === 'swim' && Math.abs(G.x - f.x) < 300;
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
      const ty = (L.scare > 0 ? 70 : 150) + Math.sin(t * 1.3 + 1) * 30;
      L.vx = ease(L.vx, clamp((tx - L.x) * 3, -T.holderV, T.holderV), 3, dt);
      L.vy = ease(L.vy, clamp((ty - L.y) * 3, -420, 420), 3, dt);
      L.x += L.vx * dt; L.y += L.vy * dt;
      if (L.x >= landX - 40 && L.scare <= 0) { L.mode = 'landing'; L.T = 0; }
      art.setAnim(c, L.vy < -40 || L.scare > 0 ? 'flap' : 'glide');
    } else if (L.mode === 'landing') {
      // Circles down onto the island's near edge.
      L.T += dt;
      const tx = PERCH.x + Math.cos(L.T * 1.4) * Math.max(0, 160 - L.T * 60);
      const ty = PERCH.y - 150 + Math.min(150, L.T * 55);
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
      drawGooTint(g);
      drawIsland(g);
      drawSigns(g);
      for (const b of boats) if (cam.sees(b.x - 300, b.x + 300)) drawBoat(g, b);
      for (const f of fliers) if (!f.got && cam.sees(f.x)) drawFlier(g, f);
      drawHolder(g);
      if (G.lunge) drawClaw(g);
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
    else if (G.bubble) art.setAnim(c, pose('cling', 'triumph'));
    else if (G.vy > 120) art.setAnim(c, pose('diveDown', 'rise'));
    else if (Math.hypot(G.vx, G.vy) > 40) art.setAnim(c, pose(Math.floor(c.dist / 160) % 2 ? 'swimB' : 'swimA', 'rise'));
    else art.setAnim(c, pose('swimA', 'rise'));
    art.animate(c, dt, G.mode === 'won' ? 0 : G.vx, G.vy);
  }

  // ---------- drawing ----------

  const V = () => ({ x0: cam.x - 60, x1: cam.x + W + 60 });

  // The goo below the surface: the terrain strip when delivered, else an ink
  // gradient with light shafts.
  function drawGooBody(g) {
    const { x0, x1 } = V();
    const strip = art.sprite(TERRAIN, 1);
    if (strip) {
      kit.drawGround(g, cam, { x: 0, y: SURF, w: WORLD, h: H - SURF }, { sheet: TERRAIN, item: 1, height: 300, fill: '#163f63' });
    } else {
      const gr = g.createLinearGradient(0, SURF, 0, H);
      gr.addColorStop(0, '#3f9ec2'); gr.addColorStop(0.45, '#226a97'); gr.addColorStop(1, '#13365a');
      g.fillStyle = gr;
      g.fillRect(x0, SURF, x1 - x0, H - SURF);
    }
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

  function drawFloor(g) {
    kit.drawGround(g, cam, { x: 0, y: FLOOR, w: WORLD, h: H - FLOOR + 80 }, {
      sheet: TERRAIN, item: 2, height: 160, lift: 10, fill: '#11283f',
      standin: { top: '#3c6f8c', body: '#23486a', ink: INK, tufts: false },
    });
  }

  function drawFarDecor(g) {
    for (const r of world.rocks) if (cam.sees(r.x)) drawRock(g, r.x, FLOOR + 6, r.h, r.flip, 0.75);
    for (const w of world.weeds) if (cam.sees(w.x)) drawWeed(g, w.x + 60, FLOOR + 6, w.h * 0.8, !w.flip, 0.7);
    // The knobbly pillar in the shallows, from the floor to above the goo.
    if (cam.sees(PILLAR.x)) drawRock(g, PILLAR.x, FLOOR + 10, FLOOR - PILLAR.top + 10, false, 1);
    // Far-off shark fins cutting the surface.
    for (const f of [{ x0: sx(3300), v: 60 }, { x0: sx(6600), v: -45 }]) {
      const x = f.x0 + Math.sin(t * 0.25 + f.x0) * 500;
      if (!cam.sees(x)) continue;
      kit.sprite(g, SHEET, 12, x, SURF + 4, { height: 60, flip: f.v < 0 }, () => {
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
      g.fillStyle = '#4b5f72'; g.strokeStyle = INK; g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x - w / 2, y);
      g.quadraticCurveTo(x - w * 0.62, y - h * 0.35, x - w * 0.3, y - h * 0.55);
      g.quadraticCurveTo(x - w * 0.35, y - h * 0.8, x - w * 0.05, y - h);
      g.quadraticCurveTo(x + w * 0.3, y - h * 0.95, x + w * 0.32, y - h * 0.6);
      g.quadraticCurveTo(x + w * 0.6, y - h * 0.45, x + w / 2, y);
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(27,42,58,0.35)'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x - w * 0.2, y - h * 0.3); g.lineTo(x + w * 0.1, y - h * 0.5); g.moveTo(x + w * 0.05, y - h * 0.2); g.lineTo(x + w * 0.25, y - h * 0.35); g.stroke();
    });
    g.restore();
  }

  function drawWeed(g, x, y, h, flip, alpha) {
    g.save();
    g.globalAlpha = alpha;
    const sway = env.reduceMotion ? 0 : Math.sin(t * 1.1 + x * 0.02) * 18;
    kit.sprite(g, TERRAIN, 5, x + sway * 0.3, y, { height: h, flip }, () => {
      g.strokeStyle = INK; g.lineWidth = 3.5; g.lineCap = 'round';
      const fronds = [[-34, 0.8], [-12, 1], [10, 0.92], [32, 0.78], [0, 0.6]];
      for (const [dx, k] of fronds) {
        g.fillStyle = k > 0.85 ? '#2f8a79' : '#2a6f6a';
        const top = y - h * k;
        const s = sway * k;
        g.beginPath();
        g.moveTo(x + dx - 14, y);
        g.quadraticCurveTo(x + dx - 26 + s * 0.5, y - h * k * 0.5, x + dx + s, top);
        g.quadraticCurveTo(x + dx + 26 + s * 0.5, y - h * k * 0.5, x + dx + 14, y);
        g.closePath(); g.fill(); g.stroke();
      }
    });
    g.restore();
  }

  function drawTub(g, x, y, flip) {
    kit.sprite(g, TERRAIN, 6, x, y, { height: 130, flip }, () => {
      g.save();
      g.translate(x, y);
      if (flip) g.scale(-1, 1);
      g.rotate(-0.35);
      g.fillStyle = '#e7e2d6'; g.strokeStyle = INK; g.lineWidth = 4;
      g.beginPath(); g.roundRect ? g.roundRect(-110, -70, 220, 90, [30, 30, 50, 50]) : g.rect(-110, -70, 220, 90); g.fill(); g.stroke();
      g.fillStyle = '#b9c9d2'; g.beginPath(); g.ellipse(0, -70, 100, 16, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#c0a060'; g.beginPath(); g.arc(-60, 18, 10, 0, Math.PI * 2); g.arc(60, 18, 10, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    });
  }

  // The island: rock above the surface with grass, and its roots below.
  function drawIsland(g) {
    if (!cam.sees(ISLAND.x - 100, ISLAND.x + ISLAND.w + 100)) return;
    const I = ISLAND;
    kit.sprite(g, TERRAIN, 4, I.x + I.w / 2, SURF + 20, { height: SURF + 20 - I.y + 160 }, () => {
      g.save();
      g.fillStyle = '#5b5a52'; g.strokeStyle = INK; g.lineWidth = 5;
      g.beginPath();
      g.moveTo(I.x - 40, SURF + 30);
      g.quadraticCurveTo(I.x + 20, I.y + 20, I.x + 110, I.y);
      g.quadraticCurveTo(I.x + 240, I.y - 24, I.x + 330, I.y - 10);
      g.quadraticCurveTo(I.x + 460, I.y - 30, I.x + 520, I.y + 20);
      g.quadraticCurveTo(I.x + 600, I.y + 40, I.x + I.w + 60, SURF + 30);
      g.lineTo(I.x + I.w + 60, FLOOR + 40); g.lineTo(I.x - 40, FLOOR + 40);
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(27,42,58,0.35)'; g.lineWidth = 3;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(I.x + 60 + i * 90, I.y + 30 + (i % 2) * 20); g.lineTo(I.x + 110 + i * 90, I.y + 60 + (i % 3) * 12); g.stroke(); }
      // Grass tufts.
      g.strokeStyle = '#4e7d3a'; g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const x = I.x + 80 + i * 36, y = I.y + 2 - Math.sin(i * 0.5) * 14;
        g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x - 7, y - 22); g.moveTo(x + 6, y + 4); g.lineTo(x + 12, y - 18); g.stroke();
      }
      g.restore();
    });
    // The picnic basket waits on the island (the book's picnic).
    art.drawSprite(g, art.prop('grumley', 4), I.x + 200, I.y - 12, { height: 90 });
  }

  function drawSigns(g) {
    for (const x of cps.list.slice(1)) {
      if (!cam.sees(x)) continue;
      const bob = env.reduceMotion ? 0 : Math.sin(t * 1.6 + x) * 5;
      const y = SURF + 8 + bob;
      g.save();
      g.strokeStyle = INK; g.lineWidth = 4; g.lineCap = 'round';
      g.fillStyle = '#c8443a';
      g.beginPath(); g.ellipse(x, y, 34, 26, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#f8f1e0'; g.beginPath(); g.ellipse(x, y - 8, 30, 10, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.moveTo(x, y - 24); g.lineTo(x, y - 120); g.stroke();
      g.fillStyle = '#d8b56a';
      g.beginPath(); g.moveTo(x - 10, y - 130); g.lineTo(x + 70, y - 130); g.lineTo(x + 90, y - 106); g.lineTo(x + 70, y - 82); g.lineTo(x - 10, y - 82); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = INK; g.font = '800 26px Fraunces, Georgia, serif'; g.textAlign = 'center';
      g.fillText(String(cps.list.indexOf(x) + 1), x + 36, y - 97);
      g.restore();
    }
  }

  function drawWhirlpool(g, w) {
    const spin = env.reduceMotion ? 0 : t * 2.2;
    kit.sprite(g, SHEET, 9, w.x, w.y + 30, { height: 300 }, () => {
      g.save();
      g.strokeStyle = 'rgba(225,245,255,0.75)';
      g.lineWidth = 5;
      g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const k = 1 - i / 6;
        const rx = 40 + 220 * k, ry = 12 + 40 * k;
        const y = w.y - 300 * k * 0.9;
        const a0 = spin * (1 + i * 0.15) + i;
        g.globalAlpha = 0.4 + 0.5 * k;
        g.beginPath(); g.ellipse(w.x, y, rx, ry, 0, a0, a0 + 4.2); g.stroke();
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
    // The rock it lives in.
    drawRock(g, E.x, FLOOR + 6, 330, false, 1);
    const open = E.open;
    const item = open > 0.5 ? 4 : 5;
    kit.sprite(g, SHEET, item, E.x, E.y + 60, { height: 140 }, () => {
      g.save();
      g.translate(E.x, E.y);
      g.strokeStyle = INK; g.lineWidth = 5;
      // The eyeball behind the lids.
      g.fillStyle = '#f4efe2';
      g.beginPath(); g.ellipse(0, 0, 110, 62 * Math.max(0.08, open), 0, 0, Math.PI * 2); g.fill(); g.stroke();
      if (open > 0.1) {
        g.save();
        g.beginPath(); g.ellipse(0, 0, 108, 60 * open, 0, 0, Math.PI * 2); g.clip();
        const px = clamp((G.x - E.x) * 0.15, -40, 40);
        g.fillStyle = '#3a8f8a'; g.beginPath(); g.arc(px, 0, 40, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = INK; g.beginPath(); g.arc(px, 0, 18, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(px - 8, -10, 6, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      // Lids, heavy and scowling.
      g.fillStyle = '#4b5f72';
      g.beginPath(); g.moveTo(-120, 0); g.quadraticCurveTo(0, -70 * open - 8, 120, 0); g.quadraticCurveTo(0, -70, -120, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-120, 0); g.quadraticCurveTo(0, -70 * open - 8, 120, 0); g.stroke();
      g.beginPath(); g.moveTo(-120, 0); g.quadraticCurveTo(0, 70 * open + 8, 120, 0); g.stroke();
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
    kit.sprite(g, SHEET, 6, tc.x, FLOOR + 6, { height: h }, () => {
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
  }

  function drawFish(g, f) {
    const y = f.yy ?? f.y;
    const flip = f.dir < 0;
    const wag = env.reduceMotion ? 0 : Math.sin(t * 9 + f.ph) * 0.18;
    kit.sprite(g, SHEET, 3, f.x, y, { height: 70, ay: 0.5, flip }, () => {
      g.save();
      g.translate(f.x, y);
      if (flip) g.scale(-1, 1);
      g.strokeStyle = INK; g.lineWidth = 3.5;
      g.fillStyle = f.state === 'alert' || f.state === 'dart' ? '#8fc17a' : '#79ad74';
      // Tail.
      g.save(); g.translate(-52, 0); g.rotate(wag);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -26); g.lineTo(-22, 0); g.lineTo(-30, 26); g.closePath(); g.fill(); g.stroke();
      g.restore();
      g.beginPath(); g.ellipse(0, 0, 58, 30, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-10, -28); g.lineTo(4, -48); g.lineTo(22, -26); g.closePath(); g.fill(); g.stroke();
      // Scowl and teeth.
      g.fillStyle = '#fff'; g.beginPath(); g.arc(30, -8, 9, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(33, -7, 4, 0, Math.PI * 2); g.fill();
      g.lineWidth = 4; g.beginPath(); g.moveTo(18, -24); g.lineTo(42, -16); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.moveTo(34, 12); g.quadraticCurveTo(48, 6, 58, 10); g.stroke();
      g.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(38 + i * 7, 10 - i * 1.5); g.lineTo(41 + i * 7, 18 - i * 1.5); g.lineTo(44 + i * 7, 9 - i * 1.5); g.closePath(); g.fill(); g.stroke(); }
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
    g.strokeStyle = '#3a2a1e';
    g.lineWidth = 5;
    if (b.kind === 'anchor') {
      const rattle = b.state === 'rattle' ? Math.sin(t * 40) * 6 : 0;
      const ax = b.hx + rattle, ay = b.y;
      g.setLineDash([10, 8]);
      g.beginPath(); g.moveTo(ax, SURF - 10); g.lineTo(ax, ay - 70); g.stroke();
      g.setLineDash([]);
      kit.sprite(g, SHEET, 7, ax, ay + 40, { height: 150 }, () => {
        g.save();
        g.translate(ax, ay);
        g.strokeStyle = INK; g.fillStyle = '#5a6672'; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.arc(0, -56, 14, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 16; g.strokeStyle = INK; g.beginPath(); g.moveTo(0, -42); g.lineTo(0, 40); g.stroke();
        g.lineWidth = 10; g.strokeStyle = '#5a6672'; g.beginPath(); g.moveTo(0, -42); g.lineTo(0, 40); g.stroke();
        g.lineWidth = 16; g.strokeStyle = INK; g.beginPath(); g.moveTo(-40, -20); g.lineTo(40, -20); g.stroke();
        g.lineWidth = 10; g.strokeStyle = '#5a6672'; g.beginPath(); g.moveTo(-40, -20); g.lineTo(40, -20); g.stroke();
        g.lineWidth = 18; g.strokeStyle = INK; g.beginPath(); g.arc(0, 10, 50, 0.25, Math.PI - 0.25); g.stroke();
        g.lineWidth = 12; g.strokeStyle = '#5a6672'; g.beginPath(); g.arc(0, 10, 50, 0.25, Math.PI - 0.25); g.stroke();
        g.restore();
      });
      if (b.state === 'rattle') warnMark(g, ax, SURF - 150);
    } else {
      const jig = b.state === 'creak' ? Math.sin(t * 35) * 8 : 0;
      const nx = b.hx + jig, ny = b.y;
      g.beginPath(); g.moveTo(nx, SURF - 90); g.lineTo(nx, ny - 150); g.stroke();
      kit.sprite(g, SHEET, 8, nx, ny + 150, { height: 300 }, () => {
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
    g.save();
    g.translate(b.x, y);
    g.strokeStyle = INK; g.lineWidth = 5; g.lineJoin = 'round';
    // Hull.
    g.fillStyle = b.kind === 'net' ? '#2f7f86' : '#3b6a9c';
    g.beginPath(); g.moveTo(-230, -70); g.lineTo(230, -70); g.lineTo(190, 30); g.quadraticCurveTo(0, 50, -190, 30); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#f8f1e0';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 70, -20, 13, 0, Math.PI * 2); g.fill(); g.stroke(); }
    // Wheelhouse.
    g.fillStyle = '#9a6a3c';
    g.fillRect(-110, -150, 150, 80); g.strokeRect(-110, -150, 150, 80);
    g.fillStyle = '#cfe6ee'; g.fillRect(-90, -135, 40, 34); g.strokeRect(-90, -135, 40, 34); g.fillRect(-30, -135, 40, 34); g.strokeRect(-30, -135, 40, 34);
    g.fillStyle = '#6b4a32'; g.fillRect(-60, -190, 24, 40); g.strokeRect(-60, -190, 24, 40);
    if (b.kind === 'net') {
      // The crane over the side.
      g.strokeStyle = INK; g.lineWidth = 12; g.lineCap = 'round';
      g.beginPath(); g.moveTo(60, -70); g.lineTo(90, -230); g.lineTo(170, -110); g.stroke();
      g.strokeStyle = '#8a6a44'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(60, -70); g.lineTo(90, -230); g.lineTo(170, -110); g.stroke();
      g.strokeStyle = '#3a2a1e'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(170, -110); g.lineTo(170, -100); g.stroke();
    } else {
      g.strokeStyle = '#3a2a1e'; g.lineWidth = 8;
      g.beginPath(); g.moveTo(130, -70); g.lineTo(150, -110); g.stroke();
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
    c.y = G.y + 118;
    c.facing = G.facing;
    c.sizeK = 0.9;
    // Netted: inside the net.
    if (G.mode === 'netted') c.sizeK = 0.72;
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
    c.x = G.x; c.y = G.y + 118; c.facing = G.facing; c.sizeK = 0.9;
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
    g.fillStyle = 'rgba(40,120,180,0.22)';
    g.fillRect(x0, SURF, x1 - x0, H - SURF);
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
    const up = c.anim === 'flap';
    // Shadow on the goo.
    g.save(); g.globalAlpha = 0.2 * Math.max(0.2, 1 - (SURF - f.y) / 500); g.fillStyle = '#10304a';
    g.beginPath(); g.ellipse(f.x, SURF + 6, 44, 9, 0, 0, Math.PI * 2); g.fill(); g.restore();
    kit.sprite(g, SHEET, up ? 2 : 1, f.x, f.y, { height: 112, ay: 0.5, flip: f.dir < 0 }, () => {
      c.x = f.x; c.y = f.y;
      g.save();
      g.filter = 'saturate(0.45) brightness(1.08)';
      art.drawCreature(g, c, t, { reduceMotion: env.reduceMotion, shadow: false });
      g.restore();
    });
  }

  function drawHolder(g) {
    const c = L.c;
    if (L.mode === 'grabbed') {
      if (outroT >= 0.5) return; // in the Grumley's claw in his celebrate pose
      c.x = G.x + G.facing * 90; c.y = G.y - 250; c.facing = -G.facing;
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
    // The letter he carries, shown over his head.
    const img = art.image('ui/letter');
    const bob = env.reduceMotion ? 0 : Math.sin(t * 4) * 5;
    const y = L.y - 125 + bob;
    g.save();
    g.fillStyle = 'rgba(248,241,224,0.9)'; g.strokeStyle = '#c8443a'; g.lineWidth = 4;
    g.beginPath(); g.arc(L.x, y, 32, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#c8443a';
    g.beginPath(); g.moveTo(L.x - 9, y + 30); g.lineTo(L.x + 9, y + 30); g.lineTo(L.x, y + 44); g.closePath(); g.fill();
    if (img) g.drawImage(img, L.x - 25, y - 25, 50, 50);
    g.restore();
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
    const sp = art.sprite('bombanat.poses', 7);
    g.save();
    g.filter = 'saturate(0.45) brightness(1.08)';
    if (!art.drawSprite(g, sp, x, y, { height: 100 * (1 - u * 0.4), ay: 0.5, rot: u * 6 })) {
      g.fillStyle = '#9a7fa6'; g.beginPath(); g.arc(x, y, 30 * (1 - u * 0.4), 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  return self;
}

// ---------- the autopilot ----------
//
// Plays the board to the snatch: swims right, lunges at skimming and perched
// Bombanats on the way, keeps deep under the net boats and waits out the
// anchors, hugs the surface past the whirlpools, and under the island waits
// for the letter Bombanat to land, then lunges at him.

export function autopilot(board) {
  const { G, L, fliers, boats, eye, T } = board;
  const ai = (board.ai ||= { mashOn: false, waitT: 0, target: null, pressT: 0 });
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
    inp.sprint = Math.abs(px - G.x) > 420 && G.jetCd <= 0;
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
  inp.sprint = G.jetCd <= 0 && (!!netBoat || inWhirl || G.x < sx(2400));
  return inp;
}

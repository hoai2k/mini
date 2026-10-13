// Chapter 6: the Paper-Munching Yalapappus catches the captain's bottle at the
// edge of Nowhere (design.md, chapter 6 and "Two-player versus"). Side-on. The
// swollen Typhoonigator drifts across the sky and lets go of what it swallowed,
// one thing at a time: fishing boats, fish, blobs of goo, paper scraps, and
// somewhere among them the captain's bottle. Every falling thing throws a
// shadow on the ground where it will land. The Yalapappus trundles (Action:
// hop the rocks), rolls into a ball with Sprint (fast, sluggish, and he can't
// catch rolled up), and must stand under the bottle to catch it on his head:
// KER-PLOP! Then mash Action to munch the Captain's note. A missed bottle lands
// in the sand and the Typhoonigator sucks it back up for another go.
//
// The holder is the Typhoonigator: steer the cloud, Action drops the next thing
// in its belly (the queue shows over the cloud, to the holder only). The bottle
// must go by the time the clock reaches 8 s (it is forced out then). Alone, the
// computer drops junk at the Yalapappus and tosses the bottle away from him.

import * as art from '../art.js';
import { makeFx, roundRect } from '../chasedraw.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';
import { marksFor } from './index.js';

const GY = 960; // the ground line (the Yalapappus's feet)
const X0 = 150, X1 = 1770; // where he can go
const CX0 = 260, CX1 = 1660; // where the cloud can go
const CLOUD_Y = 230; // the Typhoonigator's middle
const MOUTH_DX = 120, MOUTH_Y = 262; // the spout, from the cloud's middle, on the side it faces
const SIZE = 1.16; // the Yalapappus stands 290 px tall
const HEAD = 232; // head height above the feet
const BALL_R = 98; // half the rolled ball's height

// The things in the Typhoonigator's belly: prop number, height on screen, hit
// radius, gravity factor, spin.
const KINDS = {
  bottle: { item: 10, h: 125, r: 100, gk: 1, spin: 2.2 },
  boat: { item: 11, h: 185, r: 125, gk: 1.05, spin: 1.4 },
  fish: { item: 12, h: 135, r: 90, gk: 1, spin: 0 },
  goo: { item: 13, h: 115, r: 90, gk: 1.1, spin: 0 },
  scrap: { item: 5, h: 90, r: 105, gk: 0.42, spin: 0 },
  // Plain bottles (no red-and-white label): catch one and it's a bonk.
  green: { sheet: 'typhoonigator', item: 2, h: 120, r: 85, gk: 1, spin: 2.4 },
  brown: { sheet: 'typhoonigator', item: 3, h: 120, r: 85, gk: 1, spin: 2.0 },
};
const JUNK = [['boat', 0.2], ['fish', 0.26], ['goo', 0.17], ['scrap', 0.22], ['green', 0.08], ['brown', 0.07]];
const ROCKS = [{ x: 640, w: 52, item: 1, h: 78 }, { x: 1310, w: 56, item: 2, h: 92 }];
const INK = '#33241a';
const CREAM = 'rgba(251,246,232,0.94)';

// The how-to-play page (OM-H6a, b, c): looking up at the falling things and
// their shadows; hopping aside from a crashing boat; KER-PLOP and the munch.
const shadowRing = (x, w, red) => ({ draw: (g) => {
  g.save();
  g.globalAlpha = 0.6; g.fillStyle = '#2b1d14';
  g.beginPath(); g.ellipse(x, 436, w, w * 0.28, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1; g.lineWidth = red ? 5 : 3; g.strokeStyle = red ? '#c8443a' : '#fbf6e8';
  if (red) g.setLineDash([12, 9]);
  g.beginPath(); g.ellipse(x, 436, w + 3, (w + 3) * 0.28, 0, 0, Math.PI * 2); g.stroke();
  g.restore();
} });
const dust = (x, y) => ({ draw: (g) => {
  g.save(); g.fillStyle = 'rgba(201,167,106,0.8)';
  for (const [dx, dy, r] of [[-70, -10, 22], [-45, -30, 16], [60, -14, 20], [85, -32, 13], [20, -40, 12]]) {
    g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill();
  }
  g.restore();
} });
export const HOWTO = [
  {
    text: 'Look up! The shadows show where each thing will land.',
    scene: 'scenes/yalapappus', crop: [460, 300, 1000, 750],
    items: [
      shadowRing(300, 34), shadowRing(455, 46), shadowRing(575, 30),
      { creature: 'typhoonigator', anim: 'letgo', x: 440, y: 118, h: 190, flip: true, shadow: false },
      { creature: 'yalapappus', anim: 'eye', x: 150, y: 436, h: 230 },
      { sprite: ['props.yalapappus', 12], x: 300, y: 230, h: 96, ay: 0.5, rot: 0.6 },
      { sprite: ['props.yalapappus', 11], x: 455, y: 300, h: 100, ay: 0.5, rot: 0.35 },
      { sprite: ['props.yalapappus', 13], x: 575, y: 230, h: 64, ay: 0.5 },
    ],
  },
  {
    text: 'Hop or trundle aside: a boat on the head dazes you.',
    scene: 'scenes/yalapappus', crop: [460, 300, 1000, 750],
    items: [
      shadowRing(430, 44),
      dust(200, 436),
      { sprite: ['props.yalapappus', 11], x: 200, y: 446, h: 160, ay: 0.85, rot: 0.3 },
      { word: 'CRASH!', x: 200, y: 230, size: 50 },
      { creature: 'yalapappus', anim: 'hop', x: 430, y: 350, h: 230, shadow: false },
    ],
  },
  {
    text: 'Catch the bottle on your head, then mash Action to munch the note.',
    scene: 'scenes/yalapappus', crop: [460, 300, 1000, 750],
    items: [
      { creature: 'yalapappus', anim: 'munch', x: 300, y: 450, h: 250 },
      { sprite: ['props.yalapappus', 9], x: 300, y: 190, h: 150, ay: 0.5 },
      { sprite: ['props.yalapappus', 8], x: 410, y: 300, h: 80, ay: 0.5, rot: 0.6 },
      { word: 'KER-PLOP!', x: 320, y: 80, size: 54 },
    ],
  },
];

export default function create(env) {
  const { W, H } = env;
  const rng = env.rng;
  const gentleS = env.gentle[0];
  const gentleH = env.gentle[1];
  const total = 45 + (gentleS ? 10 : 0);
  const G = gentleS ? 330 : 420; // gravity on falling things
  const skill = env.skill ?? 0.5;
  art.preload(['props.typhoonigator', 'typhoonigator.poses', 'yalapappus.swaps']);

  // ---------- the Yalapappus ----------
  const y = {
    x: 960, vx: 0, z: 0, vz: 0, facing: 1,
    mode: 'walk', // walk | ball | dizzy | dazed | kerplop | munch
    modeT: 0, dazeT: 0.95, pushT: 0, invuln: 0, sticky: 0, landT: 0, rollDust: 0, stepD: 0, moving: false,
  };
  const yc = art.makeCreature('yalapappus', y.x, GY);
  yc.sizeK = SIZE;
  // ---------- the Typhoonigator ----------
  const cl = { x: 1200, vx: 0, letgo: 0, suck: 0, lastDrop: 0, cool: 0, face: -1 };
  const tc = art.makeCreature('typhoonigator', cl.x, CLOUD_Y);
  tc.sizeK = 0.95;
  tc.facing = -1;
  art.setAnim(tc, 'bloated');

  const fx = makeFx();
  const say0 = fx.say;
  fx.say = (str, x, yy) => say0(str, Math.max(240, Math.min(W - 240, x)), yy);
  const items = []; // falling, lying and sucked-up things
  const puddles = []; // goo on the ground
  const parts = []; // dust, glass, crumbs
  let t = 0;
  let shake = 0;
  let scraps = 0;
  let munchBonus = 0;
  let caughtAt = null; // time left when the bottle was caught
  let bottleHome = true; // the bottle is in the belly (not falling, lying or sucked)
  let forceAt = 8; // time left by which the bottle must go
  // The holder's queue (versus); alone, the computer chooses when.
  const queue = [];
  const junk = () => {
    let r = rng();
    for (const [k, w] of JUNK) { if ((r -= w) < 0) return k; }
    return 'fish';
  };
  while (queue.length < 6) queue.push(junk());
  if (env.versus) queue.splice(2 + Math.floor(rng() * 3), 0, 'bottle');
  // The computer holder's plan.
  const ai = {
    bottleAt: 14 + rng() * 5 + skill * 3 - (gentleS ? 2 : 0), // seconds in
    plan: null, side: 1, tx: cl.x, wait: 0,
    nextJunk: 1.4,
  };
  let munch = { n: 0, need: gentleS ? 6 : 8, t: 0, limit: gentleS ? 4 : 3 };

  const elapsed = () => total - self.time;

  function landT(it) {
    // Time until the thing reaches the ground: y + vy t + G k t^2 / 2 = GY.
    const g = G * it.k.gk;
    const d = GY - it.y;
    return (-it.vy + Math.sqrt(Math.max(0, it.vy * it.vy + 2 * g * d))) / g;
  }
  function landX(it) {
    return Math.max(X0 - 40, Math.min(X1 + 40, it.x + it.vx * landT(it)));
  }

  // The cloud turns to face the Yalapappus and blows the thing out of its
  // spout, with a spray, so it plainly lets go: things come from the mouth.
  function drop(kind, vx) {
    const k = KINDS[kind];
    cl.face = y.x < cl.x ? -1 : 1;
    const mx = cl.x + cl.face * MOUTH_DX;
    const it = {
      kind, k, x: mx + (rng() - 0.5) * 20, y: MOUTH_Y, vx, vy: 40, state: 'fall',
      rot: rng() * 6, spin: (rng() < 0.5 ? -1 : 1) * k.spin, t: 0, hit: false,
      item: kind === 'scrap' ? 5 + Math.floor(rng() * 3) : k.item, phase: rng() * 6,
    };
    // Keep the landing on the ground we can reach.
    const T = landT(it);
    const lx = it.x + it.vx * T;
    if (lx < X0 + 20) it.vx = (X0 + 20 - it.x) / T;
    if (lx > X1 - 20) it.vx = (X1 - 20 - it.x) / T;
    items.push(it);
    cl.letgo = 0.85;
    cl.lastDrop = 0;
    art.kick(tc, -0.35);
    env.sfx('swoosh');
    for (let i = 0; i < 12; i++) {
      const a = (cl.face > 0 ? 0 : Math.PI) + (rng() - 0.5) * 1.1 + 0.35;
      parts.push({ x: mx, y: MOUTH_Y, vx: Math.cos(a) * (200 + rng() * 260), vy: Math.abs(Math.sin(a)) * 200 + rng() * 120, t: 0, life: 0.5 + rng() * 0.3, r: 6 + rng() * 8, col: '#5fa8d3', g: 900 });
    }
    if (kind === 'bottle') { bottleHome = false; env.sfx('tinkle'); }
    return it;
  }

  function dropNext() {
    const kind = queue.shift();
    while (queue.length < 6) queue.push(junk());
    drop(kind, cl.vx * 0.35 + (rng() - 0.5) * 50);
  }

  function puff(x, yy, n = 6, col = '#c9a76a', spd = 160) {
    for (let i = 0; i < n; i++) {
      const a = Math.PI + rng() * Math.PI;
      parts.push({ x: x + (rng() - 0.5) * 40, y: yy, vx: Math.cos(a) * spd * (0.4 + rng()), vy: Math.sin(a) * spd * 0.5 * rng(), t: 0, life: 0.5 + rng() * 0.3, r: 10 + rng() * 14, col, g: -30 });
    }
  }
  function glass(x, yy) {
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI * rng();
      parts.push({ x, y: yy, vx: Math.cos(a) * 420 * rng(), vy: Math.sin(a) * 520 * (0.5 + rng()), t: 0, life: 0.9, r: 5 + rng() * 5, col: rng() < 0.3 ? '#e8f4ee' : '#4f8a52', g: 1400, shard: true, rot: rng() * 6 });
    }
  }

  function hop() {
    y.vz = y.sticky > 0 ? 640 : 830;
    art.kick(yc, -0.45);
    env.sfx('flap');
    puff(y.x, GY, 4);
  }

  function canCatch() { return y.mode === 'walk'; }
  function headY() { return GY - y.z - (y.mode === 'ball' ? BALL_R * 2 - 6 : HEAD); }

  // ---------- update ----------

  function updateYal(dt, inS) {
    const ix = Math.max(-1, Math.min(1, inS.x || 0));
    y.modeT += dt;
    y.invuln = Math.max(0, y.invuln - dt);
    y.sticky = Math.max(0, y.sticky - dt);
    y.landT = Math.max(0, y.landT - dt);
    const stickK = y.sticky > 0 ? 0.5 : 1;
    if (y.mode === 'walk') {
      const target = ix * 480 * stickK;
      const acc = 2600;
      y.vx += Math.max(-acc * dt, Math.min(acc * dt, target - y.vx));
      if (inS.actionPressed && y.z === 0) hop();
      if (inS.sprint && Math.abs(y.vx) > 220 && y.z === 0 && y.sticky <= 0) {
        y.mode = 'ball'; y.modeT = 0;
        env.sfx('swoosh');
        art.kick(yc, 0.4);
      }
    } else if (y.mode === 'ball') {
      // Fast but sluggish: slow to turn and slow to stop.
      const target = ix * 900;
      const acc = ix ? 1150 : 320;
      y.vx += Math.max(-acc * dt, Math.min(acc * dt, target - y.vx));
      y.rollDust -= dt * Math.abs(y.vx) / 300;
      if (y.rollDust <= 0) { y.rollDust = 0.4; puff(y.x - Math.sign(y.vx) * 50, GY, 2, '#c9a76a', 90); }
      if (!inS.sprint || inS.actionPressed) {
        y.mode = 'dizzy'; y.modeT = 0;
        env.sfx('stumble');
        art.kick(yc, -0.4);
      }
    } else if (y.mode === 'dizzy') {
      y.vx *= Math.exp(-5 * dt);
      if (y.modeT > 0.42) { y.mode = 'walk'; y.modeT = 0; }
    } else if (y.mode === 'dazed') {
      y.vx *= Math.exp(-8 * dt);
      if (y.modeT > y.dazeT) { y.mode = 'walk'; y.modeT = 0; }
    }
    // Hop.
    if (y.z > 0 || y.vz > 0) {
      y.vz -= 2600 * dt;
      y.z += y.vz * dt;
      if (y.z <= 0) {
        y.z = 0; y.vz = 0; y.landT = 0.18;
        art.kick(yc, 0.75);
        env.sfx('thump'); env.vibrate(40);
        shake = Math.max(shake, 0.25);
        puff(y.x, GY, 8);
      }
    }
    const ox = y.x;
    let blocked = false;
    y.x += y.vx * dt;
    // Rocks: hop over them; the ball bounces off; walking stops at them.
    for (const r of ROCKS) {
      const half = r.w + (y.mode === 'ball' ? 60 : 38);
      const was = ox - r.x, now = y.x - r.x;
      if (Math.abs(now) < half && y.z < 55) {
        if (Math.abs(was) >= half - 0.5 || Math.sign(was) !== Math.sign(now)) {
          const side = Math.sign(was) || 1;
          y.x = r.x + side * half;
          if (y.mode === 'ball' && Math.abs(y.vx) > 150) {
            y.vx = -y.vx * 0.55;
            env.sfx('thump');
            art.kick(yc, 0.5);
            puff(y.x - side * 40, GY, 5);
            fx.say('Boing!', y.x, GY - 220);
          } else {
            y.vx = 0;
            // Pushing into a rock for a moment hops it, for the little ones.
            if (y.mode === 'walk' && Math.sign(ix) === -side) blocked = true;
          }
        }
      }
    }
    y.pushT = blocked ? y.pushT + dt : 0;
    if (y.pushT > 0.3 && y.z === 0) { y.pushT = 0; hop(); }
    if (y.x < X0) { y.x = X0; y.vx = y.mode === 'ball' ? Math.abs(y.vx) * 0.5 : 0; }
    if (y.x > X1) { y.x = X1; y.vx = y.mode === 'ball' ? -Math.abs(y.vx) * 0.5 : 0; }
    // Goo puddles stick.
    for (const p of puddles) if (y.z < 10 && Math.abs(p.x - y.x) < p.r && y.mode !== 'ball') y.sticky = Math.max(y.sticky, 0.8);
    // Footsteps.
    if (y.mode === 'walk' && y.z === 0) {
      y.stepD += Math.abs(y.vx) * dt;
      if (y.stepD > 120) { y.stepD = 0; env.sfx('step'); if (y.sticky > 0) puff(y.x, GY, 1, '#6fb4d8', 40); }
    }
  }

  function aiCloud(dt) {
    // The computer Typhoonigator.
    const e = elapsed();
    ai.wait += dt;
    if (!ai.plan && bottleHome && (e >= ai.bottleAt || self.time <= forceAt + 1) && cl.lastDrop > 0.6 && (y.mode !== 'dazed' || self.time <= forceAt + 1)) {
      ai.plan = 'bottle';
      ai.wait = 0;
      // Toss it to the side with more room.
      ai.side = y.x < 960 ? 1 : -1;
      if (rng() < 0.25 * skill) ai.side = -ai.side; // now and then a bluff
    }
    if (!ai.plan) {
      ai.nextJunk -= dt;
      if (ai.nextJunk <= 0) { ai.plan = 'junk'; ai.wait = 0; }
    }
    let tx;
    if (ai.plan === 'bottle') {
      const D = 200 + 300 * skill + (gentleS ? -80 : 0);
      tx = y.x + ai.side * D;
      if (tx > CX1 || tx < CX0) { ai.side = -ai.side; tx = y.x + ai.side * D; }
      tx = Math.max(CX0, Math.min(CX1, tx));
      const ready = y.mode !== 'dazed' || self.time <= forceAt + 1; // not onto a dazed head
      if ((ready && ((Math.abs(cl.x - tx) < 60 && ai.wait > 0.5) || ai.wait > 2.6)) || self.time <= forceAt) {
        const away = Math.sign(cl.x - y.x) || ai.side;
        drop('bottle', away * (40 + 150 * skill) * (gentleS ? 0.6 : 1));
        ai.plan = null;
        ai.nextJunk = 0.9;
      }
    } else if (ai.plan === 'junk') {
      // Aim the junk where he will be, give or take.
      const T = 1.75;
      const err = (rng() - 0.5) * 2 * (1 - skill) * 30;
      tx = y.x + y.vx * 0.5 * skill + err;
      if ((Math.abs(cl.x - tx) < 70 && ai.wait > 0.2) || ai.wait > 1.5) {
        const vx = Math.max(-120, Math.min(120, (y.x + y.vx * T * 0.5 * skill - cl.x) / T));
        drop(junk(), vx + (rng() - 0.5) * (1 - skill) * 160);
        ai.plan = null;
        ai.nextJunk = (1.7 - 0.75 * skill) + rng() * 0.6 + (gentleS ? 0.6 : 0);
      }
    } else {
      // Drift lazily, keeping over him more or less.
      tx = ai.tx;
      if (Math.abs(cl.x - ai.tx) < 40) ai.tx = Math.max(CX0, Math.min(CX1, y.x + (rng() - 0.5) * 700));
    }
    const sp = 300 + 120 * skill;
    const want = Math.max(-sp, Math.min(sp, (tx - cl.x) * 3));
    cl.vx += (want - cl.vx) * (1 - Math.exp(-4 * dt));
  }

  function versusCloud(dt, inH) {
    const ix = Math.max(-1, Math.min(1, inH?.x || 0));
    const sp = gentleH ? 430 : 370;
    cl.vx += (ix * sp - cl.vx) * (1 - Math.exp(-5 * dt));
    if (inH?.actionPressed && cl.cool <= 0) {
      dropNext();
      cl.cool = 0.55;
    } else if (cl.lastDrop > 3.5 && queue[0] !== 'bottle') {
      // So full it can't hold on: something slips out.
      dropNext();
      fx.say('Urp!', cl.x, CLOUD_Y - 150);
    }
  }

  function updateItems(dt) {
    const hy = headY();
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      if (it.state === 'fall') {
        const py = it.y;
        it.vy += G * it.k.gk * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.spin * dt;
        // Meeting his head (or his ball).
        const dx = Math.abs(it.x - y.x);
        const inBand = it.y >= hy - 10 && py <= hy + 55 && it.y <= GY - 40;
        if (!it.hit && inBand && dx < it.k.r && y.mode !== 'kerplop' && y.mode !== 'munch') {
          if (it.kind === 'bottle') {
            if (canCatch()) { kerplop(it); items.splice(i, 1); continue; }
            if (y.mode === 'ball') {
              bounceOff(it);
              fx.say('Unroll to catch!', y.x, GY - 260);
            } else if (y.mode === 'dizzy' || y.mode === 'dazed') {
              bounceOff(it);
              fx.say('Too dizzy!', y.x, GY - 260);
            }
          } else if (it.kind === 'scrap') {
            if (y.mode === 'walk' || y.mode === 'dizzy') {
              items.splice(i, 1);
              scraps = Math.min(3, scraps + 1);
              env.sfx('munch');
              art.kick(yc, 0.2);
              fx.say(scraps >= 3 ? 'Yum! Scraps 3' : 'Scrap! Munch!', y.x, GY - 270);
              continue;
            }
          } else if (y.mode === 'ball') {
            bounceOff(it);
            env.sfx('thunk');
          } else if (y.invuln <= 0 && y.mode !== 'dazed') {
            it.hit = true;
            if (it.kind === 'goo') {
              y.sticky = 2.6;
              env.sfx('splash');
              fx.say('Sticky!', y.x, GY - 270);
              art.kick(yc, 0.35);
              it.state = 'gone';
              items.splice(i, 1);
              for (let k = 0; k < 8; k++) parts.push({ x: y.x, y: hy, vx: (rng() - 0.5) * 300, vy: -rng() * 260, t: 0, life: 0.7, r: 8 + rng() * 8, col: '#5fa8d3', g: 900 });
              continue;
            }
            const plain = it.kind === 'green' || it.kind === 'brown';
            y.mode = 'dazed'; y.modeT = 0; y.invuln = 1.5; y.dazeT = plain ? 0.7 : it.kind === 'fish' ? 0.85 : 1.0;
            y.vx = Math.sign(y.x - it.x || 1) * 160;
            env.sfx('bonk'); env.vibrate(90);
            art.kick(yc, 0.6);
            shake = Math.max(shake, 0.35);
            fx.say(plain ? 'Wrong bottle!' : it.kind === 'boat' ? 'BONK! A boat!' : 'SPLAT! A fish!', y.x, GY - 280);
            if (plain) env.sfx('tinkle');
            bounceOff(it, true);
          }
        }
        if (it.y >= GY - 6) land(it);
      } else if (it.state === 'lying') {
        if (it.kind === 'fish') it.flop = Math.abs(Math.sin(it.t * 9)) * 14 * Math.max(0, 1 - it.t / 1.5);
        if (it.kind === 'bottle' && it.t > 0.75) {
          it.state = 'sucked'; it.t = 0; it.sx = it.x; it.sy = it.y;
          cl.suck = 0.9;
          env.sfx('slurp');
          fx.say('Slurp! Sucked back up!', cl.x, CLOUD_Y + 170);
        } else if (it.kind !== 'bottle' && it.t > 1.6) items.splice(i, 1);
      } else if (it.state === 'sucked') {
        const k = Math.min(1, it.t / 0.75);
        const e = k * k;
        it.x = it.sx + (cl.x - it.sx) * e;
        it.y = it.sy + (MOUTH_Y - 40 - it.sy) * e;
        it.rot += dt * 12;
        if (k >= 1) {
          items.splice(i, 1);
          bottleHome = true;
          forceAt = Math.min(self.time - 2.5, Math.max(8, self.time - 10));
          if (env.versus) queue.splice(1 + Math.floor(rng() * 3), 0, 'bottle');
          else { ai.bottleAt = elapsed() + 2 + rng() * 2; ai.plan = null; }
        }
      }
    }
  }

  function bounceOff(it, soft) {
    it.hit = true;
    it.vy = -Math.abs(it.vy) * (soft ? 0.35 : 0.5) - 120;
    it.vx += Math.sign(it.x - y.x || 1) * (soft ? 160 : 260);
    it.spin *= -2;
  }

  function land(it) {
    it.y = GY - 6;
    it.state = 'lying';
    it.t = 0;
    if (it.kind === 'boat') { env.sfx('crunch'); shake = Math.max(shake, 0.4); puff(it.x, GY, 10); env.vibrate(50); }
    else if (it.kind === 'fish') { env.sfx('splash'); puff(it.x, GY, 4); }
    else if (it.kind === 'green' || it.kind === 'brown') { env.sfx('thump'); puff(it.x, GY, 4); it.rot = Math.PI / 2; }
    else if (it.kind === 'goo') {
      env.sfx('splash');
      puddles.push({ x: it.x, r: 70, t: 0 });
      it.state = 'gone';
      items.splice(items.indexOf(it), 1);
    } else if (it.kind === 'scrap') { it.t = 0.6; }
    else if (it.kind === 'bottle') {
      env.sfx('thump');
      puff(it.x, GY, 6);
      fx.say('Missed it!', it.x, GY - 120);
      it.rot = Math.PI * 0.08;
    }
  }

  function kerplop(it) {
    caughtAt = self.time;
    y.mode = 'kerplop'; y.modeT = 0; y.vx = 0;
    env.sfx('bonk'); env.sfx('tinkle'); env.vibrate(140);
    art.kick(yc, 0.8);
    shake = Math.max(shake, 0.5);
    glass(y.x, headY());
    fx.say('KER-PLOP!', y.x, GY - 330);
    self.burst = { x: y.x, y: headY(), t: 0 };
    self.note = { x: y.x, y: headY() - 40, t: 0 };
    self.letter = { x: y.x + 90 * (y.facing || 1), y: headY() - 30, vy: -260, vx: 180 * (y.facing || 1), rot: 0, landed: false };
    void it;
  }

  function updateMunch(dt, inS) {
    y.modeT += dt;
    if (y.mode === 'kerplop') {
      if (y.modeT > 0.4 && y.modeT - dt <= 0.4) env.sfx('tinkle');
      if (y.modeT > 0.9) { y.mode = 'munch'; y.modeT = 0; env.sfx('munch'); }
      return;
    }
    munch.t += dt;
    if (inS.actionPressed) {
      munch.n += 1;
      env.sfx('munch');
      art.kick(yc, 0.28);
      for (let k = 0; k < 4; k++) parts.push({ x: y.x + 40 * (y.facing || 1), y: GY - 150, vx: (rng() - 0.5) * 260, vy: -rng() * 200, t: 0, life: 0.6, r: 6 + rng() * 6, col: '#f4efe2', g: 900, shard: true, rot: rng() * 6 });
    }
    if (munch.n >= munch.need) {
      munchBonus = 1;
      env.sfx('cheer');
      fx.say('Munched! Yum!', y.x, GY - 320);
      finish('snatched');
    } else if (munch.t >= munch.limit) {
      fx.say('Too full to finish!', y.x, GY - 320);
      env.sfx('burp');
      finish('snatched');
    }
  }

  function finish(outcome) {
    self.done = true;
    self.outcome = outcome;
    // Scraps and the munch count a little towards the postmarks (marksFor).
    self.bonus = Math.min(0.8, (scraps + munchBonus) * 0.2);
    if (outcome === 'snatched') self.time = caughtAt ?? self.time;
  }

  function updateLetter(dt) {
    const L = self.letter;
    if (!L || L.landed) return;
    L.vy += 900 * dt;
    L.x += L.vx * dt;
    L.y += L.vy * dt;
    L.rot += dt * 6;
    if (L.y >= GY - 8) { L.y = GY - 8; L.landed = true; L.rot = 0.1; }
  }

  function updateCommon(dt) {
    fx.update(dt);
    shake = Math.max(0, shake - dt * 1.6);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.shard && p.y > GY) { p.y = GY; p.vy = -p.vy * 0.25; p.vx *= 0.5; }
      if (p.t > p.life) parts.splice(i, 1);
    }
    for (let i = puddles.length - 1; i >= 0; i--) { puddles[i].t += dt; if (puddles[i].t > 4.5) puddles.splice(i, 1); }
    if (self.burst) self.burst.t += dt;
    if (self.note) self.note.t += dt;
    updateLetter(dt);
    // The cloud.
    cl.x += cl.vx * dt;
    if (cl.x < CX0) { cl.x = CX0; cl.vx = 0; }
    if (cl.x > CX1) { cl.x = CX1; cl.vx = 0; }
    cl.letgo = Math.max(0, cl.letgo - dt);
    cl.suck = Math.max(0, cl.suck - dt);
    cl.cool = Math.max(0, cl.cool - dt);
    cl.lastDrop += dt;
    tc.x = cl.x; tc.y = CLOUD_Y + Math.sin(t * 1.3) * 10;
    art.animate(tc, dt, 0, 0);
    // It faces him, turning only between drops so the spout doesn't flip about.
    if (cl.letgo <= 0 && cl.suck <= 0 && Math.abs(y.x - cl.x) > 160) cl.face = y.x < cl.x ? -1 : 1;
    tc.facing = cl.face;
    if (!self.done) art.setAnim(tc, cl.suck > 0 ? 'suck' : cl.letgo > 0 ? 'letgo' : 'bloated');
    // The Yalapappus's look.
    yc.x = y.x; yc.y = GY;
    art.animate(yc, dt, y.vx, 0);
    if (self.done) return;
    if (y.mode === 'ball') { art.setAnim(yc, 'ball'); yc.z = y.z + BALL_R; }
    else {
      yc.z = y.z;
      if (y.mode === 'kerplop') art.setAnim(yc, 'bonked');
      else if (y.mode === 'munch') art.setAnim(yc, 'munch');
      else if (y.mode === 'dazed') art.setAnim(yc, 'bonked');
      else if (y.mode === 'dizzy') art.setAnim(yc, 'dizzy');
      else if (y.z > 0) art.setAnim(yc, 'hop');
      else if (y.landT > 0) art.setAnim(yc, 'land');
      else {
        // Trundle or stand, with hysteresis so the two don't flicker at a crawl.
        if (Math.abs(y.vx) > 70) y.moving = true;
        else if (Math.abs(y.vx) < 25) y.moving = false;
        art.setAnim(yc, y.moving ? 'trundle' : 'idle');
      }
    }
  }

  // ---------- drawing ----------

  function drawItem(g, it, tt) {
    const sp = art.prop(it.k.sheet || 'yalapappus', it.item);
    let rot = it.rot;
    let flip = it.vx < 0;
    let yy = it.y;
    let ay = 0.5;
    let alpha = 1;
    if (it.kind === 'fish') rot = Math.sin(tt * 14 + it.phase) * 0.25 + (it.state === 'lying' ? Math.PI / 2 * 0.9 : 0.6);
    if (it.kind === 'scrap') { rot = Math.sin(tt * 3 + it.phase) * 0.5; yy += 0; }
    if (it.kind === 'goo') rot = Math.sin(tt * 6 + it.phase) * 0.08;
    if (it.state === 'lying') {
      ay = 0.85;
      if (it.kind === 'boat') rot = 0.35;
      if (it.kind === 'bottle') rot = 0.1;
      yy -= it.flop || 0;
      if (it.kind !== 'bottle') alpha = Math.max(0, Math.min(1, (1.6 - it.t) / 0.4));
    }
    const x = it.x + (it.kind === 'scrap' && it.state === 'fall' ? Math.sin(tt * 2.4 + it.phase) * 26 : 0);
    if (!art.drawSprite(g, sp, x, yy, { height: it.k.h, ay, rot, flip, alpha })) {
      g.save();
      g.globalAlpha *= alpha;
      g.translate(x, yy); g.rotate(rot);
      g.fillStyle = { bottle: '#3f7d43', boat: '#b9493c', fish: '#d0b04a', goo: '#5fa8d3', scrap: '#f4efe2', green: '#7fb069', brown: '#8a5a3a' }[it.kind];
      g.strokeStyle = '#33241a'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(0, 0, it.k.h * 0.55, it.k.h * 0.32, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    }
  }

  const it0h = (it) => it.k.h * 0.5;

  function drawShadow(g, it, tt) {
    // Where it will land: a ringed shadow that grows darker and sharper as it
    // falls, red-and-white for the bottle, and red when junk is about to hit.
    if (it.hit) return;
    const near = Math.max(0, Math.min(1, (it.y - MOUTH_Y) / (GY - MOUTH_Y)));
    const lx = landX(it);
    const bottle = it.kind === 'bottle';
    const soon = landT(it) < 0.6 && it.kind !== 'scrap' && !bottle;
    const w = it.k.h * (0.42 + 0.3 * near) + 16;
    g.save();
    g.globalAlpha = 0.35 + 0.45 * near;
    g.fillStyle = '#2b1d14';
    g.beginPath(); g.ellipse(lx, GY + 6, w, w * 0.26, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.55 + 0.45 * near;
    g.lineWidth = bottle ? 7 : 4;
    g.strokeStyle = soon ? '#c8443a' : '#fbf6e8';
    g.beginPath(); g.ellipse(lx, GY + 6, w + 4, (w + 4) * 0.26, 0, 0, Math.PI * 2); g.stroke();
    if (bottle) {
      g.strokeStyle = '#c8443a';
      g.setLineDash([16, 12]);
      g.lineDashOffset = -tt * 60;
      g.stroke();
      g.setLineDash([]);
    }
    if (soon) {
      const k = 1 + Math.sin(tt * 16) * 0.12;
      g.globalAlpha = 1;
      g.font = `800 ${Math.round(46 * k)}px Fraunces, Georgia, serif`;
      g.textAlign = 'center';
      g.lineWidth = 8; g.strokeStyle = '#fbf6e8'; g.strokeText('!', lx, GY - 18);
      g.fillStyle = '#c8443a'; g.fillText('!', lx, GY - 18);
    }
    g.restore();
  }

  // The hint band: big words on cream across the frame, so they read over the
  // busy jungle. Each line is centred on the frame, so the shell can refit it
  // to a phone's narrow view.
  function hintBand(g, lines) {
    const y0 = 470, lh = 56;
    g.save();
    g.fillStyle = CREAM;
    g.fillRect(0, y0 - 44, W, lh * lines.length + 30);
    g.fillStyle = INK;
    g.fillRect(0, y0 - 44, W, 5); g.fillRect(0, y0 - 14 + lh * lines.length, W, 5);
    g.font = '800 44px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    lines.forEach((s, i) => g.fillText(s, W / 2, y0 + i * lh));
    g.restore();
  }

  function drawQueue(g) {
    // The holder's view of the belly: what comes out next.
    const n = Math.min(5, queue.length);
    const sz = 58, gap = 66;
    const w = n * gap + 24;
    let x0 = Math.max(16, Math.min(W - w - 16, cl.x - w / 2));
    // Keep clear of the clock at the top middle.
    const c0 = W / 2 - 170, c1 = W / 2 + 170;
    if (x0 < c1 && x0 + w > c0) x0 = cl.x < W / 2 ? c0 - w - 10 : c1 + 10;
    const y0 = 18;
    g.save();
    g.fillStyle = 'rgba(248,241,224,0.88)';
    g.strokeStyle = '#33241a';
    g.lineWidth = 3;
    roundRect(g, x0, y0, w, sz + 26, 18);
    g.fill(); g.stroke();
    for (let i = 0; i < n; i++) {
      const kind = queue[i];
      const cx = x0 + 12 + gap * i + gap / 2;
      const cy = y0 + 13 + sz / 2;
      if (i === 0) {
        g.strokeStyle = '#c8443a'; g.lineWidth = 4;
        g.beginPath(); g.arc(cx, cy, sz * 0.52, 0, Math.PI * 2); g.stroke();
      }
      const sp = art.prop(KINDS[kind].sheet || 'yalapappus', kind === 'scrap' ? 6 : KINDS[kind].item);
      if (!art.drawSprite(g, sp, cx, cy, { height: sz * (kind === 'scrap' ? 0.6 : 0.8), ay: 0.5 })) {
        g.fillStyle = '#33241a';
        g.font = '700 18px Questrial, sans-serif';
        g.textAlign = 'center';
        g.fillText(kind, cx, cy + 6);
      }
    }
    g.restore();
    if (bottleHome && queue.includes('bottle')) {
      const left = self.time - forceAt;
      if (left < 6) {
        g.save();
        g.font = '800 30px Fraunces, Georgia, serif';
        g.textAlign = 'center';
        g.lineWidth = 7; g.strokeStyle = 'rgba(248,241,224,0.95)'; g.fillStyle = '#c8443a';
        const s = `The bottle must go! ${Math.max(0, Math.ceil(left))}`;
        g.strokeText(s, x0 + w / 2, y0 + sz + 62);
        g.fillText(s, x0 + w / 2, y0 + sz + 62);
        g.restore();
      }
    }
  }

  function drawMunchMeter(g) {
    const cx = Math.max(220, Math.min(W - 220, y.x)), cy = GY - 330;
    g.save();
    g.fillStyle = 'rgba(248,241,224,0.92)';
    g.strokeStyle = '#33241a';
    g.lineWidth = 4;
    const w = munch.need * 40 + 30;
    roundRect(g, cx - w / 2, cy - 34, w, 70, 18);
    g.fill(); g.stroke();
    for (let i = 0; i < munch.need; i++) {
      g.fillStyle = i < munch.n ? '#f2c53d' : 'rgba(51,36,26,0.18)';
      g.beginPath(); g.arc(cx - w / 2 + 35 + i * 40, cy - 6, 14, 0, Math.PI * 2); g.fill();
      if (i < munch.n) g.stroke();
    }
    const k = Math.max(0, 1 - munch.t / munch.limit);
    g.fillStyle = '#8e4f8a';
    g.fillRect(cx - w / 2 + 18, cy + 18, (w - 36) * k, 8);
    g.restore();
    actionPrompt(g, cx, cy - 50, 'Mash to munch!', { kind: env.inputKind, t: munch.t, pulse: 1, size: 40 });
  }

  // ---------- the chapter ----------

  const self = {
    focus: () => [{ x: y.x, y: GY }, { x: cl.x, y: CLOUD_Y }], // what the camera frames: the snatcher, then the holder
    time: total,
    done: false,
    outcome: null,
    bonus: 0,
    burst: null, note: null, letter: null,
    // For tests and bots.
    get yal() { return y; },
    get cloud() { return cl; },
    items, queue, landX,
    update(dt, inS, inH) {
      inS = inS || {};
      t += dt;
      if (self.done) {
        updateCommon(dt);
        outro(dt);
        return;
      }
      if (y.mode === 'kerplop' || y.mode === 'munch') {
        updateMunch(dt, inS);
        updateItems(dt);
        updateCommon(dt);
        return;
      }
      self.time = Math.max(0, self.time - dt);
      if (env.versus) versusCloud(dt, inH);
      else aiCloud(dt);
      // The bottle can't stay in the belly for ever.
      if (bottleHome && self.time <= forceAt && cl.lastDrop > 0.25) {
        const qi = queue.indexOf('bottle');
        if (qi >= 0) queue.splice(qi, 1);
        drop('bottle', (rng() - 0.5) * 120);
        fx.say('It had to let go!', cl.x, CLOUD_Y + 170);
        ai.plan = null;
      }
      updateYal(dt, inS);
      updateItems(dt);
      updateCommon(dt);
      if (!self.done && self.time <= 0 && y.mode !== 'kerplop' && y.mode !== 'munch') finish('kept');
    },
    draw(g, tt) {
      g.save();
      if (shake > 0 && !env.reduceMotion) g.translate((rng() - 0.5) * 18 * shake, (rng() - 0.5) * 12 * shake);
      art.drawScene(g, 'scenes/yalapappus', W, H);
      // Goo on the ground.
      for (const p of puddles) {
        g.save();
        g.globalAlpha = Math.min(1, (4.5 - p.t) / 0.6) * 0.85;
        g.fillStyle = '#5fa8d3';
        g.strokeStyle = '#2f6d93'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(p.x, GY + 6, p.r, 16, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.beginPath(); g.ellipse(p.x - p.r * 0.3, GY + 2, p.r * 0.25, 4, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      for (const r of ROCKS) {
        if (!art.drawSprite(g, art.prop('yalapappus', r.item), r.x, GY + 14, { height: r.h })) {
          g.save(); g.fillStyle = '#8d8a84'; g.strokeStyle = '#33241a'; g.lineWidth = 4;
          g.beginPath(); g.ellipse(r.x, GY - r.h * 0.4, r.w, r.h * 0.5, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
        }
      }
      // The letter, out of the broken bottle.
      if (self.letter) {
        const L = self.letter;
        const im = art.image('ui/letter');
        const sp = im ? { img: im, w: im.naturalWidth || im.width, h: im.naturalHeight || im.height } : null;
        if (!art.drawSprite(g, sp, L.x, L.y, { height: 70, rot: L.rot })) {
          g.save(); g.translate(L.x, L.y - 25); g.rotate(L.rot); g.fillStyle = '#f8f1e0'; g.strokeStyle = '#33241a'; g.lineWidth = 3;
          g.fillRect(-40, -25, 80, 50); g.strokeRect(-40, -25, 80, 50); g.restore();
        }
      }
      for (const it of items) if (it.state === 'fall') drawShadow(g, it, tt);
      for (const it of items) if (it.state === 'lying') drawItem(g, it, tt);
      art.drawCreature(g, tc, tt, { reduceMotion: env.reduceMotion, shadow: false });
      // The Yalapappus.
      art.drawCreature(g, yc, tt, { reduceMotion: env.reduceMotion });
      if (y.sticky > 0 && y.mode !== 'ball') {
        g.save();
        g.globalAlpha = Math.min(1, y.sticky / 0.5) * 0.9;
        art.drawSprite(g, art.prop('yalapappus', 13), y.x, GY - y.z - HEAD + 50, { height: 70 + Math.sin(tt * 5) * 4 });
        g.restore();
      }
      // The Captain's note on his fork while he munches.
      if (self.note && !self.done && y.mode === 'munch') {
        const k = Math.max(0.25, 1 - munch.n / munch.need);
        art.drawSprite(g, art.prop('yalapappus', 8), y.x + 70 * (yc.facing || 1), GY - 130, { height: 60 * k + 10, ay: 0.5, rot: Math.sin(tt * 8) * 0.2 });
      } else if (self.note && y.mode === 'kerplop') {
        const n = self.note;
        art.drawSprite(g, art.prop('yalapappus', 8), n.x + Math.sin(n.t * 7) * 30, n.y - 60 + n.t * 120, { height: 60, ay: 0.5, rot: Math.sin(n.t * 5) * 0.4 });
      }
      for (const it of items) if (it.state !== 'lying') drawItem(g, it, tt);
      // The letter is in the bottle: ring it wherever the bottle is, and point
      // at the bottle while it falls so it can't be mistaken for the junk.
      if (!self.done) {
        const b = items.find((i) => i.kind === 'bottle');
        if (b) {
          letterTag(g, b.x + 62, b.y - 50, { t: tt, r: 40 });
          if (b.state === 'fall' && !b.hit) marker(g, b.x, b.y - it0h(b) - 10, { t: tt, label: 'The bottle!' });
        } else if (bottleHome) letterTag(g, cl.x - cl.face * 215, CLOUD_Y + 70, { t: tt, r: 40 });
        else if (self.letter?.landed) letterTag(g, self.letter.x, self.letter.y - 40, { t: tt, r: 50 });
      }
      if (self.burst && self.burst.t < 0.6) {
        const b = self.burst;
        art.drawSprite(g, art.prop('yalapappus', 9), b.x, b.y - 10, { height: 120 + b.t * 160, ay: 0.6, alpha: 1 - b.t / 0.6 });
      }
      for (const p of parts) {
        g.save();
        g.globalAlpha = Math.max(0, 1 - p.t / p.life) * (p.shard ? 1 : 0.6);
        g.fillStyle = p.col;
        if (p.shard) {
          g.translate(p.x, p.y); g.rotate(p.rot + p.t * 10);
          g.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
        } else {
          g.beginPath(); g.arc(p.x, p.y, p.r * (1 + p.t), 0, Math.PI * 2); g.fill();
        }
        g.restore();
      }
      if (y.mode === 'munch' && !self.done) drawMunchMeter(g);
      if (env.versus && !self.done && y.mode !== 'munch' && y.mode !== 'kerplop') {
        drawQueue(g);
        if (cl.cool <= 0 && (t < 8 || cl.lastDrop > 2.2)) actionPrompt(g, cl.x, CLOUD_Y - 175, 'Drop!', { kind: env.inputKind, side: 1, t: tt, pulse: cl.lastDrop > 2.8 ? 1 : 0 });
      }
      fx.draw(g);
      g.restore();
      if (t < 4 && !self.done) hintBand(g, env.versus
        ? ['Yalapappus: catch the bottle on your head!', 'Typhoonigator: hide it among the junk!']
        : ['Catch the bottle on your head!', 'Watch the shadows: dodge the boats and fish.']);
    },
    marks() {
      const snatched = self.outcome === 'snatched';
      const spare = snatched ? (caughtAt ?? self.time) : 0;
      return marksFor({ snatched, spareFrac: spare / total, heldFrac: (total - (snatched ? spare : 0)) / total, bonus: self.bonus });
    },
    hud() {
      if (y.mode === 'munch' || y.mode === 'kerplop') return `Munch ${munch.n}/${munch.need}`;
      return `Scraps ${scraps}/3`;
    },
  };

  function outro(dt) {
    if (self.outcome === 'snatched') {
      if (y.mode !== 'ball') yc.z = 0;
      art.setAnim(yc, 'celebrate');
      art.setAnim(tc, 'bloated');
      cl.vx += (340 - cl.vx) * (1 - Math.exp(-2 * dt)); // drifts off, lighter
    } else {
      yc.z = 0;
      art.setAnim(yc, 'wail');
      art.setAnim(tc, 'celebrate');
      cl.vx *= Math.exp(-3 * dt);
    }
    void dt;
  }

  return self;
}


// A competent player for scripts/chapter-check.mjs: follows the bottle's
// shadow, otherwise keeps out from under the junk, and munches when told.
export function autopilot(ch) {
  const s = ch._ap || (ch._ap = { n: 0 });
  s.n++;
  const y = ch.yal;
  const r = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  if (y.mode === 'munch') { r.action = s.n % 2 === 0; r.actionPressed = r.action; return r; }
  const falling = ch.items.filter((i) => i.state === 'fall' && !i.hit);
  const bottle = falling.find((i) => i.kind === 'bottle');
  let tx;
  if (bottle) tx = ch.landX(bottle);
  else {
    tx = ch.cloud.x + (ch.cloud.x > 960 ? -320 : 320);
    for (const it of falling) {
      if (it.kind === 'scrap') continue;
      const lx = ch.landX(it);
      if (Math.abs(lx - y.x) < 190 && it.y > 380) tx = y.x + (y.x < lx ? -300 : 300);
    }
  }
  const dx = tx - y.x;
  r.x = Math.abs(dx) < 20 ? 0 : Math.max(-1, Math.min(1, dx / 80));
  for (const rx of [640, 1310]) if (Math.abs(rx - y.x) < 120 && Math.sign(rx - y.x) === Math.sign(r.x) && y.z === 0 && s.n % 3 === 0) r.actionPressed = true;
  return r;
}

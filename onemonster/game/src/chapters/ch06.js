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
import { marksFor } from './index.js';

const GY = 960; // the ground line (the Yalapappus's feet)
const X0 = 150, X1 = 1770; // where he can go
const CX0 = 260, CX1 = 1660; // where the cloud can go
const CLOUD_Y = 225; // the Typhoonigator's middle
const MOUTH_Y = 330; // where things fall from
const HEAD = 200; // head height above the feet
const BALL_R = 84; // half the rolled ball's height

// The things in the Typhoonigator's belly: prop number, height on screen, hit
// radius, gravity factor, spin.
const KINDS = {
  bottle: { item: 10, h: 92, r: 82, gk: 1, spin: 2.2 },
  boat: { item: 11, h: 150, r: 110, gk: 1.05, spin: 1.4 },
  fish: { item: 12, h: 110, r: 80, gk: 1, spin: 0 },
  goo: { item: 13, h: 92, r: 80, gk: 1.1, spin: 0 },
  scrap: { item: 5, h: 62, r: 95, gk: 0.42, spin: 0 },
  // Plain bottles (no red-and-white label): catch one and it's a bonk.
  green: { sheet: 'typhoonigator', item: 2, h: 100, r: 78, gk: 1, spin: 2.4 },
  brown: { sheet: 'typhoonigator', item: 3, h: 100, r: 78, gk: 1, spin: 2.0 },
};
const JUNK = [['boat', 0.2], ['fish', 0.26], ['goo', 0.17], ['scrap', 0.22], ['green', 0.08], ['brown', 0.07]];
const ROCKS = [{ x: 640, w: 52, item: 1, h: 78 }, { x: 1310, w: 56, item: 2, h: 92 }];

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
    x: 360, vx: 0, z: 0, vz: 0, facing: 1,
    mode: 'walk', // walk | ball | dizzy | dazed | kerplop | munch
    modeT: 0, dazeT: 0.95, pushT: 0, invuln: 0, sticky: 0, landT: 0, rollDust: 0, stepD: 0,
  };
  const yc = art.makeCreature('yalapappus', y.x, GY);
  yc.sizeK = 1;
  // ---------- the Typhoonigator ----------
  const cl = { x: 1200, vx: 0, letgo: 0, suck: 0, lastDrop: 0, cool: 0 };
  const tc = art.makeCreature('typhoonigator', cl.x, CLOUD_Y);
  tc.sizeK = 0.8;
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

  function drop(kind, vx) {
    const k = KINDS[kind];
    const it = {
      kind, k, x: cl.x + (rng() - 0.5) * 30, y: MOUTH_Y, vx, vy: -70, state: 'fall',
      rot: rng() * 6, spin: (rng() < 0.5 ? -1 : 1) * k.spin, t: 0, hit: false,
      item: kind === 'scrap' ? 5 + Math.floor(rng() * 3) : k.item, phase: rng() * 6,
    };
    // Keep the landing on the ground we can reach.
    const T = landT(it);
    const lx = it.x + it.vx * T;
    if (lx < X0 + 20) it.vx = (X0 + 20 - it.x) / T;
    if (lx > X1 - 20) it.vx = (X1 - 20 - it.x) / T;
    items.push(it);
    cl.letgo = 0.45;
    cl.lastDrop = 0;
    art.kick(tc, -0.35);
    env.sfx('swoosh');
    if (kind === 'bottle') bottleHome = false;
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
    if (!ai.plan && bottleHome && (e >= ai.bottleAt || self.time <= forceAt + 1) && cl.lastDrop > 0.6) {
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
      if ((Math.abs(cl.x - tx) < 60 && ai.wait > 0.5) || ai.wait > 2.6 || self.time <= forceAt) {
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
      if (y.modeT > 0.9) { y.mode = 'munch'; y.modeT = 0; fx.say('Munch the note!', y.x, GY - 300); }
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
    art.animate(tc, dt, cl.vx * 0.5, 0);
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
      else if (Math.abs(y.vx) > 40) art.setAnim(yc, 'trundle');
      else art.setAnim(yc, 'idle');
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

  function drawShadow(g, it) {
    // Where it will land: a shadow that grows darker and sharper as it falls.
    const near = Math.max(0, Math.min(1, (it.y - MOUTH_Y) / (GY - MOUTH_Y)));
    const lx = landX(it);
    const w = it.k.h * (0.3 + 0.35 * near) + 12;
    g.save();
    g.globalAlpha = 0.12 + 0.3 * near;
    g.fillStyle = '#2b1d14';
    g.beginPath(); g.ellipse(lx, GY + 4, w, w * 0.22, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function drawQueue(g) {
    // The holder's view of the belly: what comes out next.
    const n = Math.min(5, queue.length);
    const sz = 58, gap = 66;
    const w = n * gap + 24;
    const x0 = Math.max(16, Math.min(W - w - 16, cl.x - w / 2));
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
    roundRect(g, cx - w / 2, cy - 34, w, 96, 18);
    g.fill(); g.stroke();
    for (let i = 0; i < munch.need; i++) {
      g.fillStyle = i < munch.n ? '#f2c53d' : 'rgba(51,36,26,0.18)';
      g.beginPath(); g.arc(cx - w / 2 + 35 + i * 40, cy - 6, 14, 0, Math.PI * 2); g.fill();
      if (i < munch.n) g.stroke();
    }
    const k = Math.max(0, 1 - munch.t / munch.limit);
    g.fillStyle = '#8e4f8a';
    g.fillRect(cx - w / 2 + 18, cy + 18, (w - 36) * k, 8);
    g.fillStyle = '#33241a';
    g.font = '700 24px Questrial, sans-serif';
    g.textAlign = 'center';
    g.fillText('Mash Action to munch!', cx, cy + 50);
    g.restore();
  }

  // ---------- the chapter ----------

  const self = {
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
      for (const it of items) if (it.state === 'fall') drawShadow(g, it);
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
      if (env.versus && !self.done && y.mode !== 'munch' && y.mode !== 'kerplop') drawQueue(g);
      fx.draw(g);
      g.restore();
      if (t < 3.2 && !self.done) hint(g, env.versus
        ? 'Yalapappus: catch the bottle on your head! · Typhoonigator: hide it among the junk!'
        : 'Catch the bottle on your head! Watch the shadows, dodge the boats and fish.', W);
    },
    marks() {
      const snatched = self.outcome === 'snatched';
      const spare = snatched ? (caughtAt ?? self.time) : 0;
      return marksFor({ snatched, spareFrac: spare / total, heldFrac: (total - (snatched ? spare : 0)) / total, bonus: self.bonus });
    },
    hud() {
      if (y.mode === 'munch' || y.mode === 'kerplop') return `Munch ${munch.n}/${munch.need}`;
      return `Scraps ${scraps}`;
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

function hint(g, text, W) {
  if (!text) return;
  g.save();
  g.font = '700 36px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(248,241,224,0.95)';
  g.fillStyle = '#33241a';
  g.strokeText(text, W / 2, 150);
  g.fillText(text, W / 2, 150);
  g.restore();
}

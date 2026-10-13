// Chapter 5: the Wild-'n-Windy Typhoonigator sucks the captain's bottle up out
// of the sea (design.md, chapter 5, "Two-player versus" and "How each creature
// moves"). The storm cloud rolls over a stormy sea seen from above at a slant;
// its spout hangs from its lips down to the water, lagging behind like a hose.
// Holding Action sucks: a vortex spins up at the spout's foot and pulls in the
// flotsam, which spirals up the spout and fills the cloud. Nearly full, it
// swells and slows; full, it must burp some of it back out. Getting the
// captain's bottle (red-and-white label) up the spout is the snatch; the bonus
// is for how little else it swallowed.
//
// The holder is the bottle: it drifts (Move nudges it) and ducks under a wave
// (Action; ~0.8 s, then a cooldown) where the spout can't reach it. Alone, the
// computer drifts it away from the vortex and ducks, with env.skill timing.
//
// Space: screen units (1920 x 1080). Things on the sea also have "ground"
// distances: the slanted view squashes depth by K and far things shrink by
// persp(y), so a ground distance is hypot(dx, dy / K) / persp.

import * as art from '../art.js';
import { makeFx, roundRect } from '../chasedraw.js';
import { marksFor } from './index.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';

const K = 0.6; // vertical squash of the slanted sea
const SEA = { y0: 500, y1: 1035, x0: 90 };
const seaX1 = (y) => (y < 585 ? 1630 : 1850); // the land at the far right
const persp = (y) => 0.74 + 0.26 * Math.max(0, Math.min(1, (y - 440) / 600));

// Tuning (ground units, seconds, fractions of a full tummy).
export const TUNE = {
  speed: 250, sprint: 410, accel: 1100,
  bloatedAt: 0.72, bloatedSlow: 0.62, burpSlow: 0.35, burpTime: 1.6, burpTo: 0.55,
  radius: 200, sprintRadius: 260, spinUp: 1.8, spinDown: 4,
  water: 0.018, sprintWater: 0.03, // fullness per second of sucking, just sea water
  capture: 55, liftAt: 0.75, liftAfter: 0.45, liftTime: 0.55,
  footK: 16, footC: 6, // the spout's foot on a spring: it lags and swings wide
  bottleSpeed: 140, bottleAccel: 480, duck: 1.0, duckCd: 1.7, duckDash: 1.6, tireCd: 0.4, tireRecover: 0.4, bottlePull: 0.35, suckSlow: 0.7,
  junk: 11,
};

// Flotsam: [prop item, height on screen at the front, weight in the tummy].
// Few and big, so each reads on its own; the captain's bottle is bigger still.
const JUNK = {
  2: [138, 0.13], 3: [138, 0.13], 4: [108, 0.11], 5: [116, 0.11], 6: [126, 0.15], 7: [196, 0.22], 8: [112, 0.1],
};
const BOTTLE_H = 176;
const KINDS = [2, 3, 4, 5, 6, 7, 8, 4, 5, 2];

// Where the spout leaves each pose (the tip of the spray drawn on the sprite,
// or the lips when it has none), as a fraction of the sprite, facing right.
const MOUTH = { suck: [0.78, 0.84], roll: [0.84, 0.86], bloated: [0.6, 0.5], letgo: [0.72, 0.78], celebrate: [0.72, 0.82], eye: [0.6, 0.88], wisp: [0.55, 0.8] };

const gdist = (ax, ay, bx, by) => Math.hypot(ax - bx, (ay - by) / K) / persp((ay + by) / 2);
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function create(env) {
  const { W, H, rng } = env;
  const total = 45 + (env.gentle[0] ? 10 : 0);
  const hg = env.gentle[1];
  const duckTime = TUNE.duck + (hg ? 0.2 : 0);
  const duckCd = TUNE.duckCd - (hg ? 0.5 : 0);
  const fx = makeFx();
  const say = (text, x, y) => fx.say(text, clamp(x, 260, W - 260), Math.max(230, y));
  let t = 0;

  // The point on the sea under the cloud (steered), and the spout's foot (lags).
  const p = { x: 520, y: 640, vx: 0, vy: 0 };
  const foot = { x: p.x, y: p.y, vx: 0, vy: 0 };
  const mid = { x: p.x, y: p.y - 150, vx: 0, vy: 0 }; // the spout's bend
  const cloud = art.makeCreature('typhoonigator', p.x, p.y);
  const bottle = { x: 1250, y: 840, vx: 0, vy: 0, duck: 0, cd: 0, spin: 0, state: 'float', lt: 0, rot: 0 };
  const items = [];
  const splashes = [];
  const rain = Array.from({ length: 130 }, () => ({ x: rng() * (W + 300), y: rng() * H, v: 900 + rng() * 500, l: 30 + rng() * 40 }));
  const brain = { react: -1, skip: 0, wobble: rng() * 10 };

  // The first lot is dealt from a deck, so the sea holds a mix rather than a
  // shoal of one thing; what the waves bring in later is random.
  const deck = [...KINDS].sort(() => rng() - 0.5);
  function spawnJunk(x, y) {
    const kind = deck.length ? deck.pop() : KINDS[Math.floor(rng() * KINDS.length)];
    items.push({ kind, x, y, vx: 0, vy: 0, rot: (rng() - 0.5) * 0.6, spinV: (rng() - 0.5) * 0.8, state: 'float', spin: 0, lt: 0, ph: rng() * 6 });
  }
  // A few bits drift along with the bottle, so it hides among them.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng(), r = 170 + rng() * 90;
    spawnJunk(bottle.x + Math.cos(a) * r, clamp(bottle.y + Math.sin(a) * r * K, SEA.y0 + 10, SEA.y1 - 10));
  }
  for (let i = 4; i < TUNE.junk; i++) {
    let x, y, n = 0;
    do {
      y = lerp(SEA.y0 + 20, SEA.y1 - 10, rng());
      x = lerp(SEA.x0 + 30, seaX1(y) - 30, rng());
      n++;
    } while (n < 30 && (gdist(x, y, bottle.x, bottle.y) < 170 || gdist(x, y, p.x, p.y) < 300 || items.some((o) => gdist(x, y, o.x, o.y) < 150)));
    spawnJunk(x, y);
  }

  let power = 0; // how hard it is sucking, 0..1
  let sucking = false;
  let burpT = 0;
  let warned = false;
  let lastSlurp = 0;
  let animHold = 0;
  let rolling = false;
  let side = -1; // which side of its foot the cloud rides (behind the lips), eased

  const self = {
    focus: () => [p, bottle], // what the camera frames: the snatcher, then the holder
    time: total, done: false, outcome: null,
    full: 0, junk: 0, burps: 0, bonus: 3,
    p, foot, bottle, items, TUNE,
    get power() { return power; },
    get radius() { return radius(); },

    update(dt, inS, inH) {
      t += dt;
      fx.update(dt);
      for (const s of splashes) s.t += dt;
      while (splashes.length && splashes[0].t > 0.9) splashes.shift();
      for (const r of rain) {
        r.y += r.v * dt; r.x -= r.v * 0.35 * dt;
        if (r.y > H) { r.y = -60; r.x = rng() * (W + 300); }
      }
      if (self.done) { outro(dt); return; }
      self.time = Math.max(0, self.time - dt);

      // ---- the cloud ----
      const sprint = !!inS.sprint && burpT <= 0;
      let top = sprint ? TUNE.sprint : TUNE.speed;
      if (self.full > TUNE.bloatedAt) top *= TUNE.bloatedSlow;
      if (burpT > 0) top *= TUNE.burpSlow;
      top *= lerp(1, TUNE.suckSlow, power);
      const ix = clamp(inS.x || 0, -1, 1), iy = clamp(inS.y || 0, -1, 1);
      const il = Math.hypot(ix, iy) > 1 ? Math.hypot(ix, iy) : 1;
      steer(p, (ix / il) * top, (iy / il) * top, TUNE.accel, dt);
      move(p, dt, true);
      // The foot follows on a spring, so it swings wide on turns.
      spring(foot, p.x, p.y, TUNE.footK, TUNE.footC, dt);
      const mx0 = p.x, my0 = p.y - lift(p.y) * 0.5;
      spring(mid, mx0, my0, 22, 7, dt);

      // ---- sucking ----
      sucking = !!inS.action && burpT <= 0 && !self.done;
      power = sucking ? Math.min(1, power + TUNE.spinUp * dt) : Math.max(0, power - TUNE.spinDown * dt);
      if (inS.actionPressed && burpT <= 0) env.sfx('whoosh');
      if (power > 0.5) self.full += (sprint ? TUNE.sprintWater : TUNE.water) * dt;
      self.sprinting = sprint;

      // ---- the bottle ----
      updateBottle(dt, env.versus ? inH : aiBottle(dt));

      // ---- flotsam ----
      const R = radius();
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.state === 'spray') {
          it.lt += dt;
          if (it.lt >= 0.75) {
            it.state = 'float'; it.x = it.tx; it.y = it.ty;
            splashes.push({ x: it.x, y: it.y, t: 0, k: 0.7 });
          }
          continue;
        }
        if (it.state === 'lift') {
          it.lt += dt;
          it.rot += dt * 9;
          if (it.lt >= TUNE.liftTime) {
            items.splice(i, 1);
            swallow(it);
          }
          continue;
        }
        it.rot += it.spinV * dt;
        drift(it, dt, 1);
        if (pull(it, R, dt, 1)) { it.state = 'lift'; it.lt = 0; }
        move(it, dt, false);
        // Off the right edge: back in from the left, like the waves bring it.
        if (it.x > seaX1(it.y) + 40) { it.x = SEA.x0 - 30; it.y = lerp(SEA.y0 + 20, SEA.y1 - 10, rng()); it.vx = it.vy = 0; }
      }
      let floating = 0;
      for (const it of items) if (it.state !== 'lift') floating++;
      if (floating < TUNE.junk - 3 && rng() < dt * 0.8) spawnJunk(SEA.x0 - 30, lerp(SEA.y0 + 20, SEA.y1 - 10, rng()));

      // ---- full up: burp ----
      if (self.full > TUNE.bloatedAt && !warned) { warned = true; say('Getting full!', p.x, cloudY() + 30); lastSlurp = t; env.sfx('creak'); }
      if (self.full >= 1 && burpT <= 0) burp();
      if (burpT > 0) {
        burpT -= dt;
        if (burpT <= 0) warned = self.full > TUNE.bloatedAt;
      }

      // ---- animation ----
      const big = self.full > TUNE.bloatedAt ? 1 + (self.full - TUNE.bloatedAt) * 0.7 : 1;
      cloud.sizeK = cloudK() * big;
      cloud.x = cloudX(); cloud.y = cloudY();
      art.animate(cloud, dt, p.vx, p.vy);
      side += (-cloud.facing - side) * (1 - Math.exp(-2.5 * dt));
      // Pick the pose for what it is doing; a pose holds for a moment, and
      // rolling has hysteresis, so it never flickers between two.
      animHold = Math.max(0, animHold - dt);
      const speed = Math.hypot(p.vx, p.vy);
      rolling = rolling ? speed > 90 : speed > 160;
      const want = burpT > 0 ? 'letgo' : self.full > TUNE.bloatedAt ? 'bloated' : power > 0.2 ? 'suck' : rolling ? 'roll' : 'eye';
      if (want !== cloud.anim && (animHold <= 0 || want === 'letgo' || want === 'suck')) { art.setAnim(cloud, want); animHold = 0.3; }

      self.bonus = clamp(3 - self.junk / 2.5, 0, 3);
      if (bottle.state === 'gone') {
        self.done = true; self.outcome = 'snatched';
        env.sfx('snatch'); env.sfx('cheer'); env.vibrate(160);
        say('Got it!', cloud.x - side * 200 * cloud.sizeK, cloud.y - 60);
        art.kick(cloud, 0.6);
      } else if (self.time <= 0) {
        self.done = true; self.outcome = 'kept';
        env.sfx('aww');
      }
    },

    draw(g, tt) {
      art.drawScene(g, 'scenes/typhoonigator', W, H);
      drawReach(g, tt);
      drawVortex(g, tt);
      for (const s of splashes) drawSplash(g, s);
      // The sea, back to front.
      const things = items.filter((i) => i.state === 'float').map((i) => ({ y: i.y, d: () => drawItem(g, i, tt) }));
      if (bottle.state !== 'lift' && bottle.state !== 'gone') things.push({ y: bottle.y, d: () => drawBottle(g, tt) });
      things.sort((a, b) => a.y - b.y);
      for (const th of things) th.d();
      // The cloud's shadow on the water, the spout, what rides up it, the cloud.
      g.save(); g.globalAlpha = 0.16; g.fillStyle = '#1d2433';
      const pk = persp(p.y);
      g.beginPath(); g.ellipse(p.x, p.y, 150 * cloud.sizeK, 42 * pk, 0, 0, Math.PI * 2); g.fill(); g.restore();
      const M = mouth();
      drawSpout(g, M, tt);
      for (const it of items) if (it.state === 'lift') drawLifted(g, it, M, tt);
      if (bottle.state === 'lift') drawLifted(g, { ...bottle, kind: 1 }, M, tt);
      art.drawCreature(g, cloud, tt, { reduceMotion: env.reduceMotion, shadow: false });
      for (const it of items) if (it.state === 'spray') drawSpray(g, it);
      drawRain(g);
      fx.draw(g);
      drawMeter(g, tt);
      if (!self.done) drawPrompts(g, tt);
      if (t < 4 && !self.done) hint(g, env.versus
        ? 'Cloud: suck up the red-and-white bottle!  Bottle: duck!'
        : 'Suck up the red-and-white bottle. Nothing else!', W, env.versus ? 215 : 150);
    },

    marks() {
      return marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: (total - self.time) / total, bonus: self.bonus });
    },
    hud: () => (self.junk ? `Junk eaten ${self.junk} · fewer is better` : 'Only the red-and-white bottle!'),
  };

  // ---------- movement on the slanted sea ----------

  function steer(o, tx, ty, acc, dt) {
    const dx = tx - o.vx, dy = ty - o.vy, d = Math.hypot(dx, dy);
    const k = Math.min(1, (acc * dt) / (d || 1));
    o.vx += dx * k; o.vy += dy * k;
  }
  // o.vx/o.vy are ground units per second; screen motion shrinks with distance.
  function move(o, dt, hard) {
    const k = persp(o.y);
    o.x += o.vx * k * dt;
    o.y += o.vy * k * K * dt;
    const y = clamp(o.y, SEA.y0, SEA.y1);
    if (y !== o.y) { o.y = y; if (hard) o.vy = 0; else o.vy *= -0.3; }
    const x1 = seaX1(o.y);
    if (o.x < SEA.x0 && (hard || o === bottle)) { o.x = SEA.x0; o.vx = Math.max(0, o.vx); }
    if (o.x > x1 && (hard || o === bottle)) { o.x = x1; o.vx = Math.min(0, o.vx); }
  }
  function spring(o, tx, ty, k, c, dt) {
    o.vx += ((tx - o.x) * k - o.vx * c) * dt;
    o.vy += ((ty - o.y) * k - o.vy * c) * dt;
    o.x += o.vx * dt; o.y += o.vy * dt;
  }
  // The waves' current (ground units per second).
  function current(x, y) {
    return [22 + 20 * Math.sin(t * 0.4 + y * 0.012), 14 * Math.sin(t * 0.5 + x * 0.006)];
  }
  function drift(o, dt, k) {
    const [cx, cy] = current(o.x, o.y);
    steer(o, cx * k, cy * k, 120, dt);
  }
  function radius() { return (self.sprinting ? TUNE.sprintRadius : TUNE.radius) * (0.35 + 0.65 * power); }
  // The reach shown on the water: what a suck started now would pull in.
  function reachR() { return (self.sprinting ? TUNE.sprintRadius : TUNE.radius) * (0.35 + 0.65 * Math.max(power, 0.5)); }

  // The vortex pulls a floating thing in; true once it is ready to go up.
  function pull(o, R, dt, k) {
    if (power < 0.05) { o.spin = 0; return false; }
    const d = gdist(o.x, o.y, foot.x, foot.y);
    if (d > R) { o.spin = Math.max(0, o.spin - dt); return false; }
    const pk = persp(o.y);
    const ux = (foot.x - o.x) / pk, uy = (foot.y - o.y) / (K * pk);
    const ul = Math.hypot(ux, uy) || 1;
    const nx = ux / ul, ny = uy / ul;
    const f = 1 - d / R;
    const rad = power * k * (90 + 260 * f);
    const tan = power * k * (60 + 200 * f);
    o.vx += (nx * rad - ny * tan - o.vx) * Math.min(1, dt * 8);
    o.vy += (ny * rad + nx * tan - o.vy) * Math.min(1, dt * 8);
    if (d < TUNE.capture && power > TUNE.liftAt) o.spin += dt; else o.spin = Math.max(0, o.spin - dt * 0.5);
    return o.spin >= TUNE.liftAfter;
  }

  function swallow(it) {
    self.full += JUNK[it.kind][1];
    self.junk++;
    art.kick(cloud, 0.35);
    env.sfx('bubble');
    if (t - lastSlurp > 0.7) {
      env.sfx('slurp'); lastSlurp = t;
      say(['Gulp!', 'Slurp!', 'Glug!'][self.junk % 3], p.x + (rng() - 0.5) * 80, cloudY() + 30);
    }
  }

  function burp() {
    self.burps++;
    burpT = TUNE.burpTime;
    power = 0;
    env.sfx('burp');
    env.vibrate(120);
    art.kick(cloud, -0.6);
    say('Too full! BURP!', p.x, cloudY() + 30); lastSlurp = t + 0.5;
    const M = mouth();
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const kind = KINDS[Math.floor(rng() * KINDS.length)];
      const a = rng() * Math.PI * 2, r = 120 + rng() * 220;
      const ty = clamp(foot.y + Math.sin(a) * r * K, SEA.y0 + 10, SEA.y1 - 10);
      const tx = clamp(foot.x + Math.cos(a) * r, SEA.x0 + 10, seaX1(ty) - 10);
      items.push({ kind, x: tx, y: ty, tx, ty, sx: M.x, sy: M.y, vx: 0, vy: 0, rot: 0, spinV: (rng() - 0.5) * 2, state: 'spray', lt: 0, spin: 0, ph: rng() * 6 });
    }
    // The burp's wave shoves everything near the foot away.
    for (const o of [...items, bottle]) {
      if (o.state !== 'float') continue;
      const d = gdist(o.x, o.y, foot.x, foot.y);
      if (d < 320) {
        const a = Math.atan2((o.y - foot.y) / K, o.x - foot.x);
        o.vx += Math.cos(a) * 260 * (1 - d / 320);
        o.vy += Math.sin(a) * 260 * (1 - d / 320);
      }
    }
    self.full = Math.min(self.full, TUNE.burpTo);
    splashes.push({ x: foot.x, y: foot.y, t: 0, k: 1.6 });
    env.sfx('splash');
  }

  // ---------- the bottle ----------

  function updateBottle(dt, inp) {
    const b = bottle;
    b.cd = Math.max(0, b.cd - dt);
    if (b.state === 'lift') {
      b.lt += dt;
      b.rot += dt * 9;
      if (b.lt >= TUNE.liftTime) b.state = 'gone';
      return;
    }
    if (b.duck > 0) {
      b.duck -= dt;
      if (b.duck <= 0) { env.sfx('bubble'); splashes.push({ x: b.x, y: b.y, t: 0, k: 0.6 }); }
    }
    // A press just before the cooldown ends is kept, so a well-timed duck
    // never fails by a frame.
    b.want = inp?.actionPressed ? 0.3 : Math.max(0, (b.want || 0) - dt);
    // Duck after duck tires it: each one taken soon after the last means a
    // longer wait before the next (the ring over it shows the wait), so a
    // cloud that keeps at it wins over a bottle that just keeps bobbing under.
    b.tired = Math.max(0, (b.tired || 0) - dt * TUNE.tireRecover);
    if (b.want > 0 && b.duck <= 0 && b.cd <= 0) {
      b.want = 0;
      b.duck = duckTime; b.cd = duckCd + TUNE.tireCd * b.tired; b.cdMax = b.cd; b.spin = 0;
      b.tired += 1;
      env.sfx('splash');
      splashes.push({ x: b.x, y: b.y, t: 0, k: 0.8 });
      if (power > 0.3 && gdist(b.x, b.y, foot.x, foot.y) < radius() * 1.1) say('Ducked!', b.x, b.y - 110);
    }
    // Under the wave it slips along faster: duck, then get out of the ring.
    const top = (TUNE.bottleSpeed + (hg ? 20 : 0)) * (b.duck > 0 ? TUNE.duckDash : 1);
    const ix = clamp(inp?.x || 0, -1, 1), iy = clamp(inp?.y || 0, -1, 1);
    const il = Math.max(1, Math.hypot(ix, iy));
    const [cx, cy] = current(b.x, b.y);
    steer(b, cx * 0.6 + (ix / il) * top, cy * 0.6 + (iy / il) * top, TUNE.bottleAccel, dt);
    if (b.duck <= 0 && pull(b, radius(), dt, TUNE.bottlePull)) {
      b.state = 'lift'; b.lt = 0;
      env.sfx('whoosh');
    }
    move(b, dt, false);
    b.rot = Math.sin(t * 2.1) * 0.25;
  }

  // The computer's bottle: drift away from the spout, keep off the edges, and
  // duck when the vortex is close (with a reaction time and the odd fumble).
  function aiBottle(dt) {
    const sk = env.skill ?? 0.5;
    const b = bottle;
    const d = gdist(b.x, b.y, foot.x, foot.y);
    let ax = 0, ay = 0;
    if (d < 560) {
      const pk = persp(b.y);
      const ux = (b.x - foot.x) / pk, uy = (b.y - foot.y) / (K * pk);
      const ul = Math.hypot(ux, uy) || 1;
      const w = (1 - d / 560) * 2.2;
      ax += (ux / ul) * w; ay += (uy / ul) * w;
    }
    // Keep away from the walls (the corners trap it).
    const x1 = seaX1(b.y);
    ax += Math.max(0, 1 - (b.x - SEA.x0) / 260) * 1.4 - Math.max(0, 1 - (x1 - b.x) / 260) * 1.4;
    ay += Math.max(0, 1 - (b.y - SEA.y0) / 140) * 1.4 - Math.max(0, 1 - (SEA.y1 - b.y) / 140) * 1.4;
    ax += Math.sin(t * 0.7 + brain.wobble) * 0.25;
    ay += Math.cos(t * 0.5 + brain.wobble) * 0.25;
    // And a slight pull to open water, so the chase stays mid-sea, not in a corner.
    ax += ((SEA.x0 + x1) / 2 - b.x) / 1200;
    ay += ((SEA.y0 + SEA.y1) / 2 - b.y) / 700;
    const k = 0.7 + 0.3 * sk;
    const l = Math.hypot(ax, ay);
    const out = { x: l > 1 ? (ax / l) * k : ax * k, y: l > 1 ? (ay / l) * k : ay * k, action: false, actionPressed: false };
    // Ducking.
    brain.skip = Math.max(0, brain.skip - dt);
    const danger = power > 0.25 && d < radius() * (0.7 + 0.35 * sk) + 30;
    if (danger && brain.react < 0 && brain.skip <= 0 && b.cd <= 0 && b.duck <= 0) {
      if (rng() < 0.08 + 0.3 * (1 - sk)) brain.skip = 0.7; // fumbled it
      else brain.react = 0.15 + (1 - sk) * 0.5 + rng() * 0.25;
    }
    if (brain.react >= 0) {
      brain.react -= dt;
      if (brain.react < 0) { out.action = true; out.actionPressed = true; }
    }
    return out;
  }

  // ---------- where things are on screen ----------

  // The cloud rides above and behind its foot, so the spout slants down from
  // its lips to the water and the cloud never hides what it is sucking.
  function lift(y) { return 300 * persp(y); }
  function cloudK() { return 0.95 * lerp(0.86, 1.08, (persp(p.y) - 0.74) / 0.26); }
  function cloudX() { return clamp(p.x + side * 170 * cloud.sizeK, 230, W - 230); }
  function cloudY() { return p.y - lift(p.y); }
  function mouth() {
    const [mx, my] = MOUTH[cloud.anim] || MOUTH.suck;
    const sz = art.creatureSize(cloud);
    return { x: cloud.x + (mx - 0.5) * sz.w * cloud.facing, y: cloud.y + (my - 0.5) * sz.h };
  }
  function spoutEnd(M) {
    const u = 0.75 + 0.25 * power;
    return { x: lerp(M.x, foot.x, u), y: lerp(M.y, foot.y, u) };
  }
  function bez(A, C, B, u) {
    const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
    return { x: a * A.x + b * C.x + c * B.x, y: a * A.y + b * C.y + c * B.y };
  }

  // ---------- drawing ----------

  function drawSpout(g, M, tt) {
    const F = spoutEnd(M);
    const sway = env.reduceMotion ? 0 : Math.sin(tt * 2.3) * 22;
    const C = { x: mid.x + sway, y: lerp(M.y, F.y, 0.5) };
    const n = 22;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(bez(M, C, F, i / n));
    const w0 = 20 * persp(p.y), w1 = (34 + 40 * power) * persp(foot.y);
    const left = [], right = [];
    for (let i = 0; i <= n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x;
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const u = i / n;
      const w = lerp(w0, w1, u * u) * (1 + (env.reduceMotion ? 0 : Math.sin(tt * 9 - u * 12) * 0.08));
      left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w });
      right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
    }
    g.save();
    g.globalAlpha = 0.8 + 0.2 * power;
    const gr = g.createLinearGradient(M.x, M.y, F.x, F.y);
    gr.addColorStop(0, 'rgba(165,180,205,0.95)');
    gr.addColorStop(1, 'rgba(120,150,185,0.9)');
    g.fillStyle = gr;
    g.strokeStyle = 'rgba(35,35,55,0.8)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(left[0].x, left[0].y);
    for (const q of left) g.lineTo(q.x, q.y);
    for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y);
    g.closePath();
    g.fill(); g.stroke();
    // Streaks running up (sucking) or idly down.
    g.lineCap = 'round';
    for (let s = -2; s <= 2; s++) {
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = lerp(pts[i].x, s < 0 ? left[i].x : right[i].x, Math.abs(s) * 0.33);
        const y = lerp(pts[i].y, s < 0 ? left[i].y : right[i].y, Math.abs(s) * 0.33);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.setLineDash([26 + s * 4, 34]);
      g.lineDashOffset = tt * (power > 0.3 ? 420 : -90) + s * 17;
      g.strokeStyle = s === 0 ? 'rgba(235,242,250,0.8)' : 'rgba(210,222,238,0.6)';
      g.lineWidth = s === 0 ? 5 : 3;
      g.stroke();
    }
    g.setLineDash([]);
    // Spray where it meets the water.
    if (power > 0.15) {
      const pk = persp(foot.y);
      for (let i = 0; i < 10; i++) {
        const a = tt * 7 + i * 0.63;
        const r = (40 + ((tt * 90 + i * 23) % 50)) * pk * power;
        g.fillStyle = 'rgba(240,246,252,0.85)';
        g.beginPath(); g.arc(F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * K - 6, 5 * pk, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
  }

  function drawVortex(g, tt) {
    if (power < 0.04) return;
    const R = radius();
    const pk = persp(foot.y);
    const rx = R * pk, ry = R * pk * K;
    g.save();
    g.translate(foot.x, foot.y);
    g.globalAlpha = 0.35 * power;
    g.fillStyle = '#16304a';
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.45 * power;
    g.fillStyle = '#0d1d2e';
    g.beginPath(); g.ellipse(0, 0, rx * 0.25, ry * 0.25, 0, 0, Math.PI * 2); g.fill();
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.17;
      const a0 = tt * (4 + i * 1.5) * (env.reduceMotion ? 0.3 : 1) + i * 1.7;
      g.globalAlpha = (0.85 - i * 0.1) * power;
      g.strokeStyle = i % 2 ? '#cfe0ee' : '#f6fbff';
      g.lineWidth = (9 - i) * pk;
      g.beginPath(); g.ellipse(0, 0, rx * k, ry * k, 0, a0, a0 + 3.4); g.stroke();
      g.strokeStyle = 'rgba(20,40,60,0.6)';
      g.lineWidth = 3 * pk;
      g.beginPath(); g.ellipse(0, 0, rx * k * 0.93, ry * k * 0.93, 0, a0 + 0.4, a0 + 2.6); g.stroke();
    }
    g.restore();
  }

  function itemSprite(it) { return art.prop('typhoonigator', it.kind); }
  function bobY(it, tt) { return env.reduceMotion ? 0 : Math.sin(tt * 2.4 + (it.ph || 0) + it.x * 0.01) * 5; }

  function ring(g, x, y, w) {
    g.save(); g.strokeStyle = 'rgba(240,246,252,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI); g.stroke(); g.restore();
  }

  function drawItem(g, it, tt) {
    const pk = persp(it.y);
    const h = JUNK[it.kind][0] * pk;
    const y = it.y + bobY(it, tt);
    ring(g, it.x, it.y + 4, h * 0.5);
    if (!art.drawSprite(g, itemSprite(it), it.x, y, { height: h, ay: 0.78, rot: it.rot + Math.sin(tt * 1.7 + it.ph) * 0.12 })) {
      g.save(); g.fillStyle = ['#000', '#d94', '#5a8', '#8a5', '#bbc', '#d86', '#c33', '#875', '#58c'][it.kind]; g.strokeStyle = '#33241a'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(it.x, y - h * 0.3, h * 0.4, h * 0.3, it.rot, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
  }

  function drawBottle(g, tt) {
    const b = bottle;
    const pk = persp(b.y);
    const y = b.y + bobY(b, tt);
    if (b.duck > 0) {
      if (!art.drawSprite(g, art.prop('typhoonigator', 9), b.x, y + 6, { height: BOTTLE_H * 1.05 * pk, ay: 0.85 })) {
        g.save(); g.fillStyle = '#7fa6c0'; g.beginPath(); g.ellipse(b.x, y - 10, 40 * pk, 18 * pk, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    } else {
      ring(g, b.x, b.y + 4, 70 * pk);
      if (!art.drawSprite(g, art.prop('typhoonigator', 1), b.x, y, { height: BOTTLE_H * pk, ay: 0.8, rot: b.rot })) {
        g.save(); g.fillStyle = '#e8e2d0'; g.strokeStyle = '#c8443a'; g.lineWidth = 6;
        g.beginPath(); g.ellipse(b.x, y - 30 * pk, 22 * pk, 40 * pk, b.rot, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }
      if (b.cd > 0 && env.versus) {
        // The holder sees when it can duck again.
        g.save(); g.strokeStyle = 'rgba(40,25,20,0.5)'; g.lineWidth = 5;
        g.beginPath(); g.arc(b.x + 60 * pk, y - 150 * pk, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.cd / (b.cdMax || duckCd))); g.stroke(); g.restore();
      }
    }
  }

  function drawLifted(g, it, M, tt) {
    const F = { x: foot.x, y: foot.y };
    const C = { x: mid.x, y: lerp(M.y, F.y, 0.5) };
    const u = it.lt / TUNE.liftTime;
    const q = bez(M, C, F, 1 - u);
    const wob = Math.sin(it.lt * 18) * 22 * (1 - u);
    const h = (it.kind === 1 ? BOTTLE_H : JUNK[it.kind][0]) * persp(foot.y) * (1 - 0.55 * u);
    g.save(); g.globalAlpha = 1 - u * 0.4;
    art.drawSprite(g, art.prop('typhoonigator', it.kind), q.x + wob, q.y, { height: h, ay: 0.5, rot: it.rot });
    g.restore();
  }

  function drawSpray(g, it) {
    const u = it.lt / 0.75;
    const x = lerp(it.sx, it.tx, u);
    const y = lerp(it.sy, it.ty, u) - Math.sin(u * Math.PI) * 180;
    art.drawSprite(g, art.prop('typhoonigator', it.kind), x, y, { height: JUNK[it.kind][0] * persp(it.ty), ay: 0.5, rot: u * 8 * it.spinV });
  }

  function drawSplash(g, s) {
    const u = s.t / 0.9;
    const pk = persp(s.y);
    g.save();
    g.globalAlpha = (1 - u) * 0.8;
    g.strokeStyle = '#f4f8fc';
    g.lineWidth = 5;
    for (let i = 0; i < 2; i++) {
      const r = (30 + u * 120 * s.k) * pk * (1 - i * 0.35);
      g.beginPath(); g.ellipse(s.x, s.y, r, r * K * 0.6, 0, 0, Math.PI * 2); g.stroke();
    }
    g.fillStyle = '#f4f8fc';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const r = (20 + u * 70 * s.k) * pk;
      g.beginPath(); g.arc(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.8 - Math.sin(u * Math.PI) * 30 * s.k, 5 * pk, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  function drawRain(g) {
    g.save();
    g.strokeStyle = 'rgba(225,230,245,0.32)';
    g.lineWidth = 2;
    g.beginPath();
    const n = env.reduceMotion ? 50 : rain.length;
    for (let i = 0; i < n; i++) {
      const r = rain[i];
      g.moveTo(r.x, r.y); g.lineTo(r.x - r.l * 0.35, r.y + r.l);
    }
    g.stroke();
    g.restore();
  }

  // The tummy meter rides above the cloud, where the eye is: how full it is,
  // and the line past which it slows and must burp.
  function drawMeter(g, tt) {
    const sz = art.creatureSize(cloud);
    const w = 260, h = 28;
    const x = clamp(cloud.x - w / 2, 20, W - w - 20), y = Math.max(140, cloud.y - sz.h * 0.5 - 56);
    const f = Math.min(1, self.full);
    g.save();
    const shake = burpT > 0 && !env.reduceMotion ? Math.sin(tt * 50) * 4 : 0;
    g.translate(shake, 0);
    g.font = '800 26px Fraunces, Georgia, serif';
    g.textAlign = 'left';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(251,246,232,0.95)';
    g.fillStyle = '#33241a';
    const label = f >= 1 ? 'BURP!' : f > TUNE.bloatedAt ? 'Tummy: nearly full!' : 'Tummy';
    g.strokeText(label, x, y - 8); g.fillText(label, x, y - 8);
    g.fillStyle = 'rgba(251,246,232,0.92)';
    g.strokeStyle = '#33241a';
    g.lineWidth = 3;
    roundRect(g, x, y, w, h, 12); g.fill(); g.stroke();
    g.fillStyle = f > 0.9 ? '#c8443a' : f > TUNE.bloatedAt ? '#e09a3a' : '#7fa6c0';
    if (f > 0.01) { roundRect(g, x + 3, y + 3, (w - 6) * f, h - 6, 9); g.fill(); }
    g.strokeStyle = 'rgba(51,36,26,0.6)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + w * TUNE.bloatedAt, y + 3); g.lineTo(x + w * TUNE.bloatedAt, y + h - 3); g.stroke();
    g.restore();
  }

  // Where the spout will suck: a dashed ring on the water round its foot, as
  // wide as its reach, brighter while it sucks.
  function drawReach(g, tt) {
    const R = reachR();
    const pk = persp(foot.y);
    g.save();
    g.translate(foot.x, foot.y);
    g.globalAlpha = 0.7 + 0.3 * power;
    g.setLineDash([18 * pk, 12 * pk]);
    g.lineDashOffset = -tt * 60;
    g.strokeStyle = '#33241a';
    g.lineWidth = 9 * pk;
    g.beginPath(); g.ellipse(0, 0, R * pk, R * pk * K, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#fbf6e8';
    g.lineWidth = 4.5 * pk;
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  // Marks and button prompts: the captain's bottle wears the letter tag (and,
  // at the start, a labelled arrow); when it is in reach the cloud is told to
  // suck, and in versus the bottle is told to duck.
  function drawPrompts(g, tt) {
    const b = bottle;
    const pk = persp(b.y);
    if (b.state === 'float') {
      const top = b.y - (b.duck > 0 ? 60 : BOTTLE_H * 0.8) * pk;
      letterTag(g, b.x, top - 50, { t: tt, r: 40 });
      if (t < 4.5) marker(g, b.x, top - 120, { t: tt, label: 'The captain’s bottle!' });
    }
    const d = gdist(b.x, b.y, foot.x, foot.y);
    const inReach = b.state === 'float' && d < reachR() * 0.9;
    if (inReach && b.duck <= 0 && power < 0.5 && burpT <= 0) {
      actionPrompt(g, foot.x, foot.y - 40 * persp(foot.y), 'Suck!', { kind: env.inputKind, t: tt, pulse: 1, side: 0 });
    }
    if (env.versus && t >= 4.5 && b.state === 'float' && b.duck <= 0 && b.cd <= 0 && d < radius() * 1.3 + 60 && power > 0.15) {
      actionPrompt(g, b.x, b.y - BOTTLE_H * 0.95 * pk, 'Duck!', { kind: env.inputKind, t: tt, pulse: 1, side: 1 });
    }
  }

  function outro(dt) {
    if (self.outcome === 'snatched') {
      art.setAnim(cloud, 'celebrate');
      p.x += 380 * dt;
      cloud.x = cloudX(); cloud.y = cloudY() - Math.min(200, (cloud.animT || 0) * 120);
      power = Math.max(0, power - dt * 2);
      art.animate(cloud, dt, 380, 0);
    } else {
      bottle.rot = Math.sin(t * 2.1) * 0.3;
      drift(bottle, dt, 0.6); move(bottle, dt, false);
      art.setAnim(cloud, 'wisp');
      power = Math.max(0, power - dt * 3);
      art.animate(cloud, dt);
    }
    spring(foot, p.x, p.y, 38, 9, dt);
    spring(mid, p.x, p.y - lift(p.y) * 0.5, 22, 7, dt);
  }

  return self;
}

// The opening line, in big type on a cream band. The band is the text's own
// thick stroke, so the shell can refit the line on a narrow screen.
function hint(g, text, W, y = 150) {
  g.save();
  g.font = '800 44px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = '#33241a';
  g.lineWidth = 30;
  g.strokeText(text, W / 2, y);
  g.strokeStyle = 'rgba(251,246,232,0.97)';
  g.lineWidth = 24;
  g.strokeText(text, W / 2, y);
  g.fillStyle = '#33241a';
  g.fillText(text, W / 2, y);
  g.restore();
}

// The how-to-play page: three pictures composed from the art until the
// requested ones (OM-H5a/b/c) arrive, which show the same three moments.
const CROP = [120, 180, 1400, 1050];
function spout(g, x0, y0, x1, y1, w, k = 0) {
  // A wavy water spout from the lips (x0, y0) to the water (x1, y1).
  g.save();
  g.fillStyle = 'rgba(150,170,200,0.9)'; g.strokeStyle = '#33241a'; g.lineWidth = 3;
  g.beginPath();
  const n = 12;
  for (let i = 0; i <= n; i++) { const u = i / n, s = Math.sin(u * 5 + k) * 10 * u; g.lineTo(lerp(x0, x1, u) + s - w * (0.3 + u), lerp(y0, y1, u)); }
  for (let i = n; i >= 0; i--) { const u = i / n, s = Math.sin(u * 5 + k) * 10 * u; g.lineTo(lerp(x0, x1, u) + s + w * (0.3 + u), lerp(y0, y1, u)); }
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(250,252,255,0.8)'; g.lineWidth = 3; g.setLineDash([10, 12]); g.lineDashOffset = -k * 40;
  g.beginPath(); for (let i = 0; i <= n; i++) { const u = i / n; g.lineTo(lerp(x0, x1, u) + Math.sin(u * 5 + k) * 10 * u, lerp(y0, y1, u)); } g.stroke();
  g.restore();
}
function splashRing(g, x, y, r) {
  g.save(); g.strokeStyle = '#fbf6e8'; g.lineWidth = 4; g.setLineDash([12, 10]);
  g.beginPath(); g.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2); g.stroke(); g.restore();
}
export const HOWTO = [
  {
    text: 'Roll across the sky. Your spout hangs down to the waves.',
    scene: 'scenes/typhoonigator', crop: CROP,
    items: [
      { draw: (g, t) => spout(g, 262, 196, 330, 400, 22, t * 2) },
      { draw: (g) => splashRing(g, 330, 404, 90) },
      { creature: 'typhoonigator', anim: 'roll', x: 180, y: 140, h: 230, shadow: false },
      { path: [[300, 60], [400, 50], [500, 70]], arrow: true },
      { sprite: ['props.typhoonigator', 3], x: 500, y: 430, h: 70, rot: 0.2 },
      { sprite: ['props.typhoonigator', 1], x: 120, y: 450, h: 90, rot: -0.3 },
    ],
  },
  {
    text: 'Hold Action to suck. Fish and bottles spiral up the spout!',
    scene: 'scenes/typhoonigator', crop: CROP,
    items: [
      { draw: (g, t) => spout(g, 370, 180, 330, 420, 34, t * 3) },
      { draw: (g) => splashRing(g, 330, 424, 120) },
      { sprite: ['props.typhoonigator', 7], x: 350, y: 400, h: 70, rot: 0.9 },
      { sprite: ['props.typhoonigator', 4], x: 300, y: 330, h: 70, rot: -0.7 },
      { sprite: ['props.typhoonigator', 1], x: 375, y: 290, h: 80, rot: 1.1 },
      { sprite: ['props.typhoonigator', 3], x: 330, y: 230, h: 60, rot: 2.4 },
      { creature: 'typhoonigator', anim: 'suck', x: 300, y: 120, h: 230, shadow: false },
      { word: 'SLURP!', x: 520, y: 160, size: 50 },
    ],
  },
  {
    text: 'Get the red-and-white bottle. Eat nothing else, or you burp!',
    scene: 'scenes/typhoonigator', crop: CROP,
    items: [
      { draw: (g, t) => spout(g, 370, 180, 330, 420, 30, t * 3) },
      { draw: (g) => splashRing(g, 330, 424, 110) },
      { sprite: ['props.typhoonigator', 1], x: 130, y: 440, h: 90, rot: -0.2 },
      { sprite: ['props.typhoonigator', 2], x: 540, y: 420, h: 90, rot: 0.3 },
      { sprite: ['props.typhoonigator', 0], x: 340, y: 330, h: 150, rot: -0.5 },
      { ring: [330, 270, 85] },
      { creature: 'typhoonigator', anim: 'celebrate', x: 300, y: 120, h: 230, shadow: false },
      { word: 'Got it!', x: 530, y: 150, size: 46 },
    ],
  },
];

// A competent player's input for the next frame (scripts/chapter-check.mjs):
// steer the spout's foot onto the bottle; once over it, suck until it goes up,
// the bottle ducks, or the tummy is nearly full; then a short rest.
export function autopilot(ch) {
  const s = ch._ap || (ch._ap = { held: 0, rest: 0, last: ch.time });
  const dt = Math.max(0, s.last - ch.time); s.last = ch.time;
  const { p, foot, bottle } = ch;
  const dx = bottle.x - p.x, dy = (bottle.y - p.y) / K;
  const d = Math.hypot(dx, dy) || 1;
  const m = Math.min(1, d / 90);
  const fd = Math.hypot(foot.x - bottle.x, (foot.y - bottle.y) / K);
  s.rest -= dt;
  const was = s.held > 0;
  let action = false;
  if (bottle.duck <= 0 && s.rest <= 0 && ch.full < 0.85 && (was ? fd < ch.TUNE.radius * 0.85 : fd < 110)) {
    s.held += dt;
    action = s.held < 1.6;
    if (!action) { s.held = 0; s.rest = 0.3; }
  } else { if (was) s.rest = Math.max(s.rest, 0.25); s.held = 0; }
  return { x: (dx / d) * m, y: (dy / d) * m, sprint: d > 450, action, actionPressed: action && !was, actionReleased: was && !action };
}

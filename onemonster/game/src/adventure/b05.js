// Board 5: Suck It All Up. The Wild-'n-Windy Typhoonigator rolls across the
// stormy sky over the Blue Ocean of Bubbley Goo after the captain's bottle
// (design/adventure.md, section 5). Side-on: the goo sea along the bottom, the
// cloud free in the upper sky, its water spout dangling to the sea and lagging
// behind it like a hose. Holding Action sucks: a vortex spins up where the
// spout meets the water, the sea itself drains (the surface drops behind you,
// column by column, and the goo meter fills), and whatever floats there spirals
// up the spout. Everything it swallows makes it bigger and slower, and a bigger
// cloud sucks a wider stretch of sea, so the board is one long trade: fill up
// to drain the ocean, shed some to fit the gaps and catch the bottle. Sprint
// storms along fast and rains some out; a tap of Action blows a gust out.
//
// Sections: open sea; the cliffs and the lighthouse (gaps only a smaller cloud
// fits); the windmills (sails chop puffs off); the sun breaking through
// (sunbeams dry it, rain clouds refill it); the eddy by the edge of Nowhere,
// where the bottle bobs and the crew in the pink raft paddle after it with a
// boat hook. If they hook it first the captain throws it on again, which only
// costs time. Suck the bottle up the spout: the snatch.
//
// Borrowed from src/chapters/ch05.js: the spout on springs, the vortex, the
// pull and lift of flotsam, the bottle that ducks under a wave.

import * as art from '../art.js';
import * as kit from './kit.js';
import { BOARDS } from './index.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';

const { W, H, clamp, lerp, hash } = kit;
const ENTRY = BOARDS.find((b) => b.n === 5);

export const WORLD = 12000;
export const SEA0 = 820; // the sea's surface before any of it is sucked up
export const DROP = 150; // how far the surface falls where the goo is all gone
const COL = 160; // the sea drains in columns this wide
const ZONE = { y0: 215, y1: 640 }; // where the cloud's middle may be
export const EDDY = { x0: WORLD - 1700, x1: WORLD - 420 }; // where the bottle bobs at the end
const SHORE = WORLD - 330; // the edge of Nowhere

export const TUNE = {
  speed: 370, sprint: 590, accel: 1400, suckSlow: 0.8,
  heavy: 0.5, // top speed = speed / (1 + heavy * full)
  cap: 1.6, // fullness it cannot swallow past
  sizeAt: (full) => 0.85 + 0.42 * full,
  radius: 150, radiusK: 125, // vortex radius = radius + radiusK * sizeK
  spinUp: 2.2, spinDown: 4,
  drain: 1.4, // sea drained per second under the vortex's middle at full power
  seaWeight: 0.05, // fullness per column of sea swallowed
  capture: 55, liftAt: 0.7, liftAfter: 0.4, liftTime: 0.6,
  footK: 16, footC: 6, // the spout's foot on a spring: it lags and swings
  rainOut: 0.11, // fullness lost per second storming along (Sprint)
  dry: 0.3, // ...per second in a sunbeam
  chop: 0.15, daze: 0.6, // a windmill sail
  refill: 0.2, // a little rain cloud
  blow: 0.25, blowCd: 2.5, tap: 0.22, blowMin: 0.3,
  bottleCurrent: 185, bottleSpeed: 150, bottleAccel: 500, bottlePull: 0.55, duck: 0.8, duckCd: 2.6,
  raftSpeed: 155, raftFlee: 280, raftPull: 0.6, raftLift: 1.4, hook: 190, hookTime: 1.1, throwDist: 850, flyTime: 1.2,
  feat: 0.9, // goo meter for the third postmark
};

// Flotsam on the sea, as props.typhoonigator items: [height on screen, weight in the cloud].
const JUNK = { 2: [96, 0.08], 3: [96, 0.08], 4: [80, 0.07], 5: [82, 0.07], 6: [92, 0.1], 7: [150, 0.14], 8: [82, 0.06] };
const KINDS = [2, 3, 4, 5, 6, 7, 2, 4, 5, 3];

// Where the spout leaves each pose (the tip of the spray drawn on the sprite,
// or the lips), as a fraction of the sprite, facing right.
const MOUTH = {
  suck: [0.78, 0.84], suckSide: [0.78, 0.84], roll: [0.84, 0.86], rollSide: [0.84, 0.86], thunder: [0.84, 0.86],
  bloated: [0.6, 0.5], swollen: [0.6, 0.5], letgo: [0.72, 0.78], blow: [0.72, 0.78], celebrate: [0.72, 0.82],
  eye: [0.6, 0.88], wisp: [0.55, 0.8], wispSide: [0.55, 0.8],
};

const INK = '#2b1d14';
const GOO = '#4f7f93';
const GOO_DARK = '#2f5366';
const FOAM = '#eef5f6';

export default function create(env) {
  const rng = env.rng;
  const gentle = !!env.gentle?.[0];
  const total = kit.boardTime(env, ENTRY.time);
  const cam = kit.makeCamera(WORLD, { lead: 300, anchor: 0.38, rate: 3.4 });
  const fx = kit.makeParticles();
  const cps = kit.makeCheckpoints([0, 2700, 5400, 8000, EDDY.x0]);
  const hints = kit.makeHints([
    { x: 0, text: 'Hold Action to suck up the sea!', show: 4.5 },
    { x: 1300, text: 'The more you swallow, the bigger and slower you get.', show: 4 },
    { x: 2200, text: 'Sprint storms along fast, raining some out.', show: 4 },
    { x: 2750, text: 'Only a small cloud fits the gaps: Sprint, or tap Action to blow!', show: 5 },
    { x: 5450, text: 'Mind the windmills: the sails chop bits off!', show: 4 },
    { x: 8050, text: 'Sunbeams dry you out. Rain clouds fill you up.', show: 4 },
    { x: EDDY.x0 - 500, text: 'Suck the bottle up before the sailors hook it!', show: 5 },
  ]);
  const duckTime = TUNE.duck - (gentle ? 0.2 : 0);
  const duckCd = TUNE.duckCd + (gentle ? 0.8 : 0);
  const raftSpeed = TUNE.raftSpeed - (gentle ? 25 : 0);
  let t = 0;

  // ---------- the cloud ----------
  const p = { x: 320, y: 420, vx: 0, vy: 0 };
  const foot = { x: p.x, vx: 0 };
  const mid = { x: p.x, y: 600, vx: 0, vy: 0 };
  const cloud = art.makeCreature('typhoonigator', p.x, p.y);
  let full = 0; // 0..TUNE.cap
  let power = 0; // how hard it is sucking
  let sucking = false, sprinting = false;
  let holdT = -1, blowCd = 0, blowT = 0, daze = 0, chopCd = 0, sunT = 0, inBeam = false;
  let saidFull = false, lastSlurp = 0, lastGust = 0, blown = 0;

  // ---------- the sea, in columns ----------
  const ncol = Math.ceil(WORLD / COL) + 1;
  const cols = Array.from({ length: ncol }, (_, i) => ({ x: i * COL, drain: 0, sea: i * COL < SHORE }));
  const drainAt = (x) => {
    const u = clamp(x / COL - 0.5, 0, ncol - 1);
    const i = Math.floor(u);
    const a = cols[i].drain, b = cols[Math.min(ncol - 1, i + 1)].drain;
    return lerp(a, b, u - i);
  };
  const seaY = (x) => SEA0 + drainAt(x) * DROP;
  const wave = (x, tt) => 6 * Math.sin(x * 0.02 + tt * 2) + 4 * Math.sin(x * 0.051 - tt * 1.3);
  let goo = 0; // the goo meter, 0..1
  let nSea = 0;
  for (const c of cols) if (c.sea) nSea++;

  // ---------- the cliffs: gaps between a cloud bank above and a stack below ----------
  const wider = gentle ? 50 : 0;
  const gaps = [
    { x: 3300, w: 230, top: 250, open: 380 + wider, kind: 'stack' },
    { x: 4200, w: 230, top: 250, open: 320 + wider, kind: 'stack' },
    { x: 5000, w: 200, top: 230, open: 290 + wider, kind: 'lighthouse' },
  ];
  const solids = [];
  for (const gp of gaps) {
    gp.bottom = gp.top + gp.open;
    solids.push({ x: gp.x, y: -500, w: gp.w, h: gp.top + 500, kind: 'bank', gap: gp });
    solids.push({ x: gp.x, y: gp.bottom, w: gp.w, h: H + 200 - gp.bottom, kind: gp.kind, gap: gp });
    for (const c of cols) if (c.x + COL / 2 > gp.x && c.x + COL / 2 < gp.x + gp.w) c.sea = false;
  }
  nSea = cols.filter((c) => c.sea).length;
  // The far shore at the end is solid too.
  solids.push({ x: SHORE + 60, y: 300, w: 600, h: 900, kind: 'shore' });

  // ---------- the windmills ----------
  const windmills = [
    { x: 6000, hub: 540, len: 200, ang: 0, spin: 1.0 },
    { x: 6900, hub: 540, len: 200, ang: 1.1, spin: -1.25 },
    { x: 7700, hub: 540, len: 200, ang: 0.4, spin: 1.1 },
  ];
  // Sea rocks: [x, height] (decor).
  const rocks = [[1400, 90], [2500, 120], [3300 + 115, 0], [5800, 70], [6000, 150], [6900, 150], [7700, 150], [9000, 80], [10500, 100]];

  // ---------- the sunbeams and the rain clouds ----------
  const beams = [
    { cx: 8500, sweep: 260, period: 7.5, ph: 0, w: 240 },
    { cx: 9250, sweep: 300, period: 9, ph: 2.1, w: 260 },
    { cx: 9950, sweep: 240, period: 6.5, ph: 4, w: 230 },
  ];
  const beamX = (b, y, tt) => b.cx + Math.sin((tt / b.period) * Math.PI * 2 + b.ph) * b.sweep - 260 * (1 - y / SEA0);
  const rainClouds = [
    { x: 8300, y: 300, vx: -55, alive: true, t: 0 },
    { x: 9000, y: 430, vx: -50, alive: true, t: 0 },
    { x: 9700, y: 350, vx: -60, alive: true, t: 0 },
  ];

  // ---------- flotsam, goo and gulls ----------
  const items = [];
  function spawnJunk(x, kind) {
    items.push({ kind, x, vx: 0, rot: (rng() - 0.5) * 0.4, spinV: (rng() - 0.5) * 0.5, state: 'float', spin: 0, lt: 0, ph: rng() * 6, leap: rng() * 6, blob: kind === 8 });
  }
  const seaStretches = [[400, 2600, 13], [2750, 5300, 7], [5500, 7900, 7], [8050, 10200, 7], [EDDY.x0 + 100, EDDY.x1 - 100, 6]];
  for (const [x0, x1, n] of seaStretches) {
    for (let i = 0; i < n; i++) spawnJunk(lerp(x0, x1, (i + 0.5 + (rng() - 0.5) * 0.8) / n), KINDS[Math.floor(rng() * KINDS.length)]);
  }
  // The goo: blobs on the sea (sucked up the spout) and blobs in the air (roll through them).
  const seaBlobX = [600, 1100, 1700, 2300, 2900, 3700, 4600, 5300, 5700, 6400, 7200, 7900, 8300, 8900, 9500, 10100, 10700, 11200];
  for (const x of seaBlobX) spawnJunk(x + (rng() - 0.5) * 120, 8);
  const airBlobs = kit.makePickups([
    [900, 300], [1500, 580], [2100, 240], [3415, 450], [4315, 460], [5100, 475], [5700, 250], [6000, 310], [6450, 600],
    [6900, 260], [7300, 540], [7700, 280], [8500, 400], [9250, 300], [9950, 450], [8800, 610], [10800, 300], [11300, 520],
  ].map(([x, y]) => ({ x, y })), { radius: 90 });
  const gulls = [];
  for (const [fx0, fy0] of [[3800, 280], [6450, 330], [9600, 260]]) {
    for (let i = 0; i < 4; i++) gulls.push({ x: fx0 + i * 70 + (rng() - 0.5) * 60, y: fy0 + (rng() - 0.5) * 90, hx: fx0 + i * 70, hy: fy0, vx: 0, vy: 0, ph: rng() * 6, state: 'fly', lt: 0 });
  }

  // ---------- the bottle and the raft ----------
  const bottle = { x: 1900, vx: 0, duck: 0, cd: 0, spin: 0, state: 'float', lt: 0, rot: 0, fly: null };
  const raft = { x: -420, vx: 0, state: 'paddle', t: 0, frame: 0, spin: 0, lt: 0, push: 0, facing: 1 };
  const brain = { react: -1, skip: 0, wobble: rng() * 10 };
  let throws = 0;

  let sectionShown = -1;

  const self = {
    time: total, done: false, outcome: null, outroTime: 2.2,
    // For the autopilot and the tests.
    S: {
      p, foot, mid, cloud, bottle, raft, cols, gaps, solids, windmills, beams, rainClouds, items, airBlobs, gulls, TUNE, ZONE, EDDY,
      get full() { return full; }, set full(v) { full = clamp(v, 0, TUNE.cap); },
      get power() { return power; }, get goo() { return goo; }, get blowCd() { return blowCd; }, get daze() { return daze; },
      get radius() { return radius(); }, get ry() { return bodyRy(); }, get throws() { return throws; },
      get sizeK() { return TUNE.sizeAt(full); },
      cam, ap: { tap: 0, rest: 0 },
    },
    focus: () => [{ x: p.x - cam.x, y: p.y }],
    hud: () => `Goo ${Math.round(goo * 100)}% · Blobs ${airBlobs.count + blobsGot}/${airBlobs.total + blobsTotal}`,
    marks: () => kit.boardMarks({ snatched: self.outcome === 'snatched', got: airBlobs.count + blobsGot, total: airBlobs.total + blobsTotal, feat: goo >= TUNE.feat }),

    update(dt, inS) {
      t += dt;
      const inp = inS || {};
      fx.update(dt);
      for (const wm of windmills) wm.ang += wm.spin * dt * (env.reduceMotion ? 0.6 : 1);
      if (self.done) { outro(dt); return; }
      self.time = Math.max(0, self.time - dt);

      updateCloud(dt, inp);
      updateSea(dt);
      updateHazards(dt);
      updateItems(dt);
      updateBottle(dt);
      updateRaft(dt);
      updateGulls(dt);
      airBlobs.update(dt, p.x, p.y, 90 + 70 * TUNE.sizeAt(full));
      const gotNow = airBlobs.count;
      if (gotNow > lastAir) { for (let i = lastAir; i < gotNow; i++) swallowBlob(); lastAir = gotNow; }

      // Signposts and hints.
      const last = cps.last;
      cps.reach(p.x);
      if (cps.last !== last) { env.sfx('checkpoint'); }
      const sec = cps.list.indexOf(cps.last);
      if (sec !== sectionShown) { sectionShown = sec; }
      hints.update(dt, p.x);

      // Camera and animation.
      cam.follow(p.x, p.vx, dt, t < dt * 1.5);
      cloud.x = p.x; cloud.y = p.y;
      cloud.sizeK = TUNE.sizeAt(full);
      art.animate(cloud, dt, p.vx, p.vy);
      if (daze > 0) cloud.rot = Math.sin(t * 18) * 0.12; else cloud.rot = 0;
      if (blowT > 0) art.setAnim(cloud, 'blow');
      else if (full >= 1.2) art.setAnim(cloud, 'swollen');
      else if (power > 0.2) art.setAnim(cloud, 'suckSide');
      else if (sprinting) art.setAnim(cloud, 'thunder');
      else if (Math.hypot(p.vx, p.vy) > 110) art.setAnim(cloud, 'rollSide');
      else if (full < 0.12 && Math.hypot(p.vx, p.vy) < 30) art.setAnim(cloud, 'wispSide');
      else art.setAnim(cloud, 'eye');

      if (bottle.state === 'gone') {
        self.done = true; self.outcome = 'snatched';
        env.sfx('snatch'); env.sfx('cheer'); env.vibrate(160);
        fx.pop(p.x, p.y - 200 * cloud.sizeK, 'Got it!', { size: 60 });
        art.kick(cloud, 0.6);
      } else if (self.time <= 0) {
        self.done = true; self.outcome = 'kept';
        env.sfx('aww');
      }
    },

    draw(g, tt) {
      kit.drawBackdrop(g, cam, { panels: ['adv/b05/backdrop-1', 'adv/b05/backdrop-2', 'adv/b05/backdrop-3'], standin: 'scenes/typhoonigator' });
      kit.haze(g, 'rgba(226,214,230,0.16)');
      cam.begin(g);
      drawBanks(g, tt);
      drawBeams(g, tt);
      drawSea(g, tt);
      drawRocks(g);
      drawStacks(g);
      drawSigns(g);
      drawShore(g);
      for (const wm of windmills) if (cam.sees(wm.x - 300, wm.x + 300)) drawWindmillTower(g, wm);
      for (const it of items) if (it.state === 'float' && cam.sees(it.x)) drawItem(g, it, tt);
      if (raft.state !== 'gone' && raft.state !== 'lift' && cam.sees(raft.x - 200, raft.x + 200)) drawRaft(g, tt);
      if (bottle.state === 'float' || bottle.state === 'held') drawBottle(g, tt);
      if (bottle.state === 'fly') drawFlyingBottle(g, tt);
      drawPrompts(g, tt);
      drawVortex(g, tt);
      const M = mouth();
      drawSpout(g, M, tt);
      for (const it of items) if (it.state === 'lift') drawLifted(g, it, M, it.kind, JUNK[it.kind][0]);
      if (bottle.state === 'lift') drawLifted(g, bottle, M, 1, 110);
      if (raft.state === 'lift') drawLiftedRaft(g, M);
      for (const gl of gulls) if (gl.state === 'lift') drawLiftedGull(g, gl, M);
      drawRain(g, tt);
      art.drawCreature(g, cloud, tt, { reduceMotion: env.reduceMotion, shadow: false });
      for (const it of items) if (it.state === 'spray') drawSpray(g, it);
      for (const wm of windmills) if (cam.sees(wm.x - 300, wm.x + 300)) drawSails(g, wm);
      airBlobs.draw(g, cam, tt, drawAirBlob);
      for (const gl of gulls) if (gl.state === 'fly' && cam.sees(gl.x)) drawGull(g, gl, tt);
      for (const rc of rainClouds) if (rc.alive && cam.sees(rc.x)) drawRainCloud(g, rc, tt);
      fx.draw(g);
      cam.end(g);
      kit.route(g, { you: p.x / WORLD, letter: bottle.state === 'gone' ? null : clamp(bottle.x / WORLD, 0, 1), signs: cps.fracs(WORLD) });
      drawRaftOnRoute(g);
      drawMeters(g, tt);
      hints.draw(g);
    },
  };
  let lastAir = 0;
  const blobsTotal = items.filter((i) => i.blob).length;
  let blobsGot = 0;

  // ---------- the cloud ----------

  function bodyRy() { return 0.4 * cloud.M.height * TUNE.sizeAt(full); }
  function bodyRx() { return 0.5 * cloud.M.height * TUNE.sizeAt(full); }
  function radius() { return (TUNE.radius + TUNE.radiusK * TUNE.sizeAt(full)) * (0.35 + 0.65 * power); }
  function topSpeed(sprint) {
    let top = (sprint ? TUNE.sprint : TUNE.speed) / (1 + TUNE.heavy * full);
    if (power > 0.3) top *= TUNE.suckSlow;
    if (blowT > 0) top *= 0.5;
    return top;
  }

  function updateCloud(dt, inp) {
    blowCd = Math.max(0, blowCd - dt);
    blowT = Math.max(0, blowT - dt);
    chopCd = Math.max(0, chopCd - dt);
    daze = Math.max(0, daze - dt);
    const wasSprint = sprinting;
    sprinting = !!inp.sprint && daze <= 0;
    if (sprinting && !wasSprint && t - lastGust > 0.5) { env.sfx('gust'); lastGust = t; }
    const top = topSpeed(sprinting);
    let ix = clamp(inp.x || 0, -1, 1), iy = clamp(inp.y || 0, -1, 1);
    if (daze > 0) { ix = 0; iy = 0; }
    const il = Math.max(1, Math.hypot(ix, iy));
    const acc = TUNE.accel / (1 + 0.3 * full);
    p.vx = kit.approach(p.vx, (ix / il) * top, acc * dt);
    p.vy = kit.approach(p.vy, (iy / il) * top, acc * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < 160) { p.x = 160; p.vx = Math.max(0, p.vx); }
    if (p.x > SHORE - 40) { p.x = SHORE - 40; p.vx = Math.min(0, p.vx); }
    const ry = bodyRy();
    const y0 = ZONE.y0 + Math.max(0, ry - 120), y1 = ZONE.y1;
    if (p.y < y0) { p.y = y0; p.vy = Math.max(0, p.vy); }
    if (p.y > y1) { p.y = y1; p.vy = Math.min(0, p.vy); }
    collide();
    // The spout's foot follows on a spring, so it swings behind on turns.
    foot.vx += ((p.x - foot.x) * TUNE.footK - foot.vx * TUNE.footC) * dt;
    foot.x += foot.vx * dt;
    const M = mouth();
    const F = footPoint();
    mid.vx += ((lerp(M.x, F.x, 0.5) - (p.x - foot.x) * 0.3 - mid.x) * 22 - mid.vx * 7) * dt;
    mid.vy += ((lerp(M.y, F.y, 0.5) - mid.y) * 22 - mid.vy * 7) * dt;
    mid.x += mid.vx * dt; mid.y += mid.vy * dt;

    // Sucking: hold Action. A tap (press and let go quickly) blows a gust instead.
    if (inp.actionPressed && daze <= 0 && blowT <= 0) { holdT = 0; if (full < TUNE.cap - 0.02) env.sfx('whoosh'); }
    if (holdT >= 0) holdT += dt;
    if (inp.actionReleased) {
      if (holdT >= 0 && holdT < TUNE.tap && blowCd <= 0 && full >= TUNE.blowMin) blow();
      holdT = -1;
    }
    sucking = !!inp.action && daze <= 0 && blowT <= 0;
    const canSuck = full < TUNE.cap - 0.02;
    power = sucking ? Math.min(canSuck ? 1 : 0.3, power + TUNE.spinUp * dt) : Math.max(0, power - TUNE.spinDown * dt);
    if (sucking && !canSuck && !saidFull) {
      saidFull = true;
      hints.say('So full! Sprint to rain some out, or tap Action to blow.', 3.5);
      fx.pop(p.x, p.y - 200 * cloud.sizeK, 'So full!', { size: 52 });
      env.sfx('creak');
    }
    if (full < TUNE.cap - 0.3) saidFull = false;

    // Storming along rains some out.
    if (sprinting && full > 0 && Math.abs(p.vx) > 200) {
      full = Math.max(0, full - TUNE.rainOut * dt);
      if (!env.reduceMotion && Math.random() < dt * 30) fx.burst(p.x + (Math.random() - 0.5) * 240 * cloud.sizeK, p.y + ry * 0.8, { n: 1, colour: '#9fc0d6', speed: 60, up: -0.2, size: 7, life: 0.7, gravity: 900, ink: false });
    }
  }

  // The cloud against the banks, the stacks and the shore: an ellipse pushed out of rectangles.
  function collide() {
    const rx = bodyRx(), ry = bodyRy(), k = rx / ry;
    // A gap it cannot fit is a wall: it cannot squeeze between the bank and the stack.
    for (const gp of gaps) {
      if (2 * ry + 4 <= gp.open) continue;
      const left = p.x < gp.x + gp.w / 2;
      const wall = left ? gp.x - rx * 0.8 : gp.x + gp.w + rx * 0.8;
      if (left ? p.x > wall : p.x < wall) {
        const speed = Math.abs(p.vx);
        p.x = wall;
        p.vx = left ? Math.min(0, -p.vx * 0.3) : Math.max(0, -p.vx * 0.3);
        if (speed > 140) bump({ gap: gp }, speed);
      }
    }
    for (const s of solids) {
      if (s.x > p.x + rx + 10 || s.x + s.w < p.x - rx - 10) continue;
      const cx = clamp(p.x, s.x, s.x + s.w), cy = clamp(p.y, s.y, s.y + s.h);
      let dx = p.x - cx, dy = (p.y - cy) * k;
      let d = Math.hypot(dx, dy);
      if (d >= rx) continue;
      if (d < 1e-3) {
        const l = p.x - s.x, r = s.x + s.w - p.x, u = (p.y - s.y) * k, dn = (s.y + s.h - p.y) * k;
        const m = Math.min(l, r, u, dn);
        if (m === l) { dx = -1; dy = 0; } else if (m === r) { dx = 1; dy = 0; } else if (m === u) { dx = 0; dy = -1; } else { dx = 0; dy = 1; }
      } else { dx /= d; dy /= d; }
      const push = rx - d;
      p.x += dx * push; p.y += (dy * push) / k;
      const vn = p.vx * dx + p.vy * k * dy;
      if (vn < 0) {
        p.vx -= 1.3 * vn * dx;
        p.vy -= (1.3 * vn * dy) / k;
        if (-vn > 140) bump(s, -vn);
      }
    }
  }

  function bump(s, speed) {
    art.kick(cloud, 0.4);
    env.sfx('thump');
    env.vibrate(50);
    cam.shake(Math.min(10, speed / 40), env.reduceMotion);
    const g = s.gap;
    const tooBig = g && 2 * bodyRy() + 16 > g.open;
    fx.pop(p.x, p.y - bodyRy() - 30, tooBig ? 'Too big!' : 'Bump!', { size: 50 });
    if (tooBig) hints.say('Too big for the gap! Sprint to rain some out, or tap Action to blow.', 3);
    fx.burst(p.x, p.y, { n: 6, colour: '#c9bcc4', speed: 200, up: 0.3, size: 14, life: 0.5, gravity: 200 });
  }

  function blow() {
    blown++;
    blowT = 0.7;
    blowCd = TUNE.blowCd;
    power = 0;
    full = Math.max(0, full - TUNE.blow);
    env.sfx('gust');
    env.vibrate(60);
    art.kick(cloud, -0.5);
    p.vx += 240 * cloud.facing;
    const M = mouth();
    fx.burst(M.x, M.y, { n: 12, colour: '#dfeaf2', speed: 420, up: 0.1, size: 12, life: 0.5, gravity: 100, ink: false });
    // A few swallowed things spray out and land on the sea ahead.
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const kind = KINDS[Math.floor(rng() * KINDS.length)];
      const tx = clamp(p.x + cloud.facing * (300 + rng() * 400), 200, SHORE - 60);
      items.push({ kind, x: tx, tx, sx: M.x, sy: M.y, vx: 0, rot: 0, spinV: (rng() - 0.5) * 2, state: 'spray', lt: 0, spin: 0, ph: rng() * 6, leap: 0 });
    }
    // The gust shoves the raft and the bottle along.
    for (const o of [raft, bottle]) {
      const d = (o.x - p.x) * cloud.facing;
      if (d > -100 && d < 700 && (o.state === 'float' || o.state === 'paddle')) o.push = (o.push || 0) + 380 * cloud.facing * (1 - Math.max(0, d) / 700);
    }
    for (const gl of gulls) if (gl.state === 'fly' && Math.abs(gl.x - p.x) < 600) { gl.vx += 500 * cloud.facing; gl.vy -= 200; }
  }

  // ---------- the sea ----------

  function updateSea(dt) {
    if (power < 0.05 || full >= TUNE.cap - 0.02) return;
    const R = radius();
    const i0 = Math.max(0, Math.floor((foot.x - R) / COL)), i1 = Math.min(ncol - 1, Math.ceil((foot.x + R) / COL));
    let sum = 0;
    for (let i = i0; i <= i1; i++) {
      const c = cols[i];
      if (!c.sea || c.drain >= 1) continue;
      const d = Math.abs(c.x + COL / 2 - foot.x);
      if (d > R) continue;
      const before = c.drain;
      c.drain = Math.min(1, c.drain + TUNE.drain * power * (1 - 0.6 * (d / R)) * dt);
      sum += c.drain - before;
    }
    if (sum > 0) {
      full = Math.min(TUNE.cap, full + sum * TUNE.seaWeight);
      goo = Math.min(1, goo + sum / nSea);
    }
  }

  // ---------- hazards: the windmills, the sunbeams, the rain clouds ----------

  function updateHazards(dt) {
    const rx = bodyRx(), ry = bodyRy(), k = rx / ry;
    // Sails chop puffs off.
    if (chopCd <= 0) {
      for (const wm of windmills) {
        if (Math.abs(wm.x - p.x) > wm.len + rx + 40) continue;
        for (let i = 0; i < 4; i++) {
          const a = wm.ang + (i * Math.PI) / 2;
          const ax = wm.x, ay = wm.hub * k, bx = wm.x + Math.cos(a) * wm.len, by = (wm.hub + Math.sin(a) * wm.len) * k;
          const px = p.x, py = p.y * k;
          const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
          const u = clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2, 0, 1);
          const d = Math.hypot(px - (ax + (bx - ax) * u), py - (ay + (by - ay) * u));
          if (d < rx * 0.82 + 12) { chop(wm, a); break; }
        }
        if (chopCd > 0) break;
      }
    }
    // Sunbeams dry it.
    let inside = false;
    for (const b of beams) {
      if (Math.abs(b.cx - p.x) > 900) continue;
      if (Math.abs(p.x - beamX(b, p.y, t)) < b.w / 2 + rx * 0.3) { inside = true; break; }
    }
    if (inside && full > 0) {
      full = Math.max(0, full - TUNE.dry * dt * (gentle ? 0.7 : 1));
      sunT += dt;
      if (!inBeam) { fx.pop(p.x, p.y - ry - 30, 'Drying!', { size: 44, colour: '#8a5a1a' }); env.sfx('steam'); }
      if (!env.reduceMotion && Math.random() < dt * 14) fx.burst(p.x + (Math.random() - 0.5) * rx * 1.6, p.y - ry * 0.6, { n: 1, colour: '#f6f1e4', speed: 90, up: 1, size: 12, life: 0.9, gravity: -160, ink: false });
    }
    inBeam = inside;
    // Rain clouds refill it.
    for (const rc of rainClouds) {
      if (!rc.alive) {
        rc.t -= dt;
        if (rc.t <= 0) { rc.alive = true; rc.x = 10200 + rng() * 100; rc.y = 280 + rng() * 180; }
        continue;
      }
      rc.x += rc.vx * dt;
      if (rc.x < 8000) rc.x = 10250;
      if (Math.abs(rc.x - p.x) < rx * 0.8 + 70 && Math.abs(rc.y - p.y) < ry * 0.8 + 50) {
        rc.alive = false; rc.t = 7;
        full = Math.min(TUNE.cap, full + TUNE.refill);
        env.sfx('drip');
        art.kick(cloud, 0.3);
        fx.pop(rc.x, rc.y - 60, 'Refill!', { size: 44, colour: '#2f5366' });
        fx.burst(rc.x, rc.y, { n: 10, colour: '#9fc0d6', speed: 200, up: 0.4, size: 9, life: 0.6, gravity: 700, ink: false });
      }
    }
  }

  function chop(wm, a) {
    chopCd = 0.9;
    daze = TUNE.daze;
    full = Math.max(0, full - TUNE.chop);
    p.vx = 220 * Math.sign(p.x - wm.x || -1); // knocked away from the hub
    p.vy = -140;
    env.sfx('crack');
    env.vibrate(70);
    cam.shake(7, env.reduceMotion);
    art.kick(cloud, 0.5);
    fx.pop(p.x, p.y - bodyRy() - 30, 'Chop!', { size: 50 });
    const ex = wm.x + Math.cos(a) * wm.len * 0.7, ey = wm.hub + Math.sin(a) * wm.len * 0.7;
    fx.burst(ex, ey, { n: 9, colour: '#b9a9b5', speed: 260, up: 0.5, size: 16, life: 0.8, gravity: 500 });
  }

  // ---------- flotsam ----------

  function updateItems(dt) {
    const R = radius();
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.state === 'spray') {
        it.lt += dt;
        if (it.lt >= 0.75) { it.state = 'float'; it.x = it.tx; splash(it.x, 0.7); }
        continue;
      }
      if (it.state === 'lift') {
        it.lt += dt;
        it.rot += dt * 9;
        if (it.lt >= TUNE.liftTime) { items.splice(i, 1); swallow(it); }
        continue;
      }
      if (!cam.sees(it.x, it.x, 500)) continue;
      it.rot += it.spinV * dt;
      it.leap += dt;
      // Drift on the waves.
      const cur = 12 * Math.sin(t * 0.5 + it.x * 0.01);
      it.vx += (cur - it.vx) * Math.min(1, dt * 2);
      if (pull(it, R, dt, 1)) { it.state = 'lift'; it.lt = 0; }
      it.x += it.vx * dt;
      if (it.x < 60) { it.x = 60; it.vx = Math.abs(it.vx); }
      if (it.x > SHORE - 60) { it.x = SHORE - 60; it.vx = -Math.abs(it.vx); }
    }
  }

  // The vortex pulls a floating thing along the surface; true once it is ready to go up.
  function pull(o, R, dt, k) {
    if (power < 0.05) { o.spin = 0; return false; }
    const d = Math.abs(o.x - foot.x);
    if (d > R) { o.spin = Math.max(0, o.spin - dt); return false; }
    const f = 1 - d / R;
    const want = Math.sign(foot.x - o.x) * power * k * (90 + 260 * f);
    o.vx += (want - o.vx) * Math.min(1, dt * 8);
    if (d < TUNE.capture && power > TUNE.liftAt) o.spin += dt; else o.spin = Math.max(0, o.spin - dt * 0.5);
    return o.spin >= TUNE.liftAfter;
  }

  function swallow(it) {
    full = Math.min(TUNE.cap, full + JUNK[it.kind][1]);
    art.kick(cloud, 0.35);
    if (t - lastSlurp > 0.25) { env.sfx('slurp'); lastSlurp = t; }
    if (it.blob) { blobsGot++; env.sfx('pickup'); fx.pop(p.x + (rng() - 0.5) * 120, p.y - 180 * cloud.sizeK, 'Goo!', { size: 46, colour: '#2f5366' }); }
    else { env.sfx('bubble'); fx.pop(p.x + (rng() - 0.5) * 120, p.y - 180 * cloud.sizeK, ['Gulp!', 'Slurp!', 'Glug!'][(blown + items.length) % 3], { size: 46 }); }
  }
  function swallowBlob() {
    full = Math.min(TUNE.cap, full + 0.05);
    art.kick(cloud, 0.25);
    env.sfx('pickup');
    fx.pop(p.x, p.y - 180 * cloud.sizeK, 'Goo!', { size: 46, colour: '#2f5366' });
  }

  // ---------- the bottle ----------

  function updateBottle(dt) {
    const b = bottle;
    b.cd = Math.max(0, b.cd - dt);
    b.rot = Math.sin(t * 2.1) * 0.2;
    if (b.state === 'lift') {
      b.lt += dt; b.rot += dt * 9;
      if (b.lt >= TUNE.liftTime) b.state = 'gone';
      return;
    }
    if (b.state === 'fly') {
      b.lt += dt;
      const u = b.lt / TUNE.flyTime;
      b.x = lerp(b.fly.x0, b.fly.x1, u);
      if (u >= 1) { b.state = 'float'; b.x = b.fly.x1; b.vx = 0; b.cd = 1; splash(b.x, 1); env.sfx('splash'); }
      return;
    }
    if (b.state === 'held') return;
    if (b.duck > 0) {
      b.duck -= dt;
      if (b.duck <= 0) { env.sfx('bubble'); splash(b.x, 0.6); }
    }
    const inEddy = b.x >= EDDY.x0;
    const ai = aiBottle(dt, inEddy);
    if (ai.duck && b.duck <= 0 && b.cd <= 0) {
      b.duck = duckTime; b.cd = duckCd; b.spin = 0;
      env.sfx('splash');
      splash(b.x, 0.8);
      fx.pop(b.x, seaY(b.x) - 120, 'Ducked!', { size: 40 });
    }
    let want;
    if (!inEddy) want = TUNE.bottleCurrent + ai.x * 40; // carried along by the current
    else want = ai.x * TUNE.bottleSpeed * (b.duck > 0 ? 0.9 : 1);
    b.vx += (want - b.vx) * Math.min(1, dt * (TUNE.bottleAccel / 150));
    if (b.duck <= 0 && pull(b, radius(), dt, TUNE.bottlePull)) {
      b.state = 'lift'; b.lt = 0;
      env.sfx('whoosh');
      return;
    }
    if (b.push) { b.vx += b.push * Math.min(1, dt * 6); b.push *= Math.exp(-6 * dt); if (Math.abs(b.push) < 5) b.push = 0; }
    b.x += b.vx * dt;
    if (b.x > EDDY.x1) { b.x = EDDY.x1; b.vx = Math.min(0, b.vx); }
    if (inEddy && b.x < EDDY.x0) { b.x = EDDY.x0; b.vx = Math.max(0, b.vx); }
  }

  // The bottle drifts away from the spout's foot (in the eddy) and ducks when the vortex is close.
  function aiBottle(dt, inEddy) {
    const sk = env.skill ?? 0.5;
    const b = bottle;
    const d = Math.abs(b.x - foot.x);
    let ax = 0;
    if (d < 520) ax += Math.sign(b.x - foot.x || 1) * (1 - d / 520) * 2;
    if (inEddy) {
      ax += Math.max(0, 1 - (b.x - EDDY.x0) / 240) * 1.5 - Math.max(0, 1 - (EDDY.x1 - b.x) / 240) * 1.5;
      ax += Math.sin(t * 0.7 + brain.wobble) * 0.3;
    }
    const out = { x: clamp(ax, -1, 1) * (0.7 + 0.3 * sk), duck: false };
    brain.skip = Math.max(0, brain.skip - dt);
    const danger = power > 0.25 && d < radius() * (0.7 + 0.35 * sk) + 30;
    if (danger && brain.react < 0 && brain.skip <= 0 && b.cd <= 0 && b.duck <= 0) {
      if (rng() < 0.3 * (1 - sk)) brain.skip = 0.7; // fumbled it
      else brain.react = 0.1 + (1 - sk) * 0.4 + rng() * 0.2;
    }
    if (brain.react >= 0) {
      brain.react -= dt;
      if (brain.react < 0) out.duck = true;
    }
    return out;
  }

  // ---------- the raft ----------

  function updateRaft(dt) {
    const r = raft;
    r.t += dt;
    if (r.state === 'gone') return;
    if (r.state === 'lift') {
      r.lt += dt;
      if (r.lt >= 0.9) {
        r.state = 'gone';
        full = Math.min(TUNE.cap, full + 0.4);
        art.kick(cloud, 0.5);
        env.sfx('slurp'); env.sfx('cheer');
        fx.pop(p.x, p.y - 200 * cloud.sizeK, 'Gulp! The whole crew!', { size: 50 });
        if (bottle.state === 'held') { bottle.state = 'float'; bottle.cd = 0.5; }
      }
      return;
    }
    if (r.state === 'hook' || r.state === 'throw') {
      r.lt += dt;
      if (r.state === 'hook' && r.lt >= TUNE.hookTime) {
        // The captain, with the Typhoonigator looming, throws it on again.
        r.state = 'throw'; r.lt = 0;
        throws++;
        const b = bottle;
        let x1 = b.x + TUNE.throwDist;
        if (x1 > EDDY.x1 - 40) x1 = Math.max(EDDY.x0 + 60, b.x - TUNE.throwDist);
        b.state = 'fly'; b.lt = 0; b.fly = { x0: b.x, x1 };
        env.sfx('swoosh');
        fx.pop(r.x, seaY(r.x) - 300, 'Heave!', { size: 48 });
      } else if (r.state === 'throw' && r.lt >= 1.3) { r.state = 'paddle'; r.lt = 0; }
      return;
    }
    // Paddling after the bottle; fleeing the vortex when it comes close.
    const R = radius();
    const d = Math.abs(r.x - foot.x);
    const target = bottle.state === 'fly' ? bottle.fly.x1 : bottle.x;
    let want = Math.sign(target - r.x - 120 || 1) * raftSpeed;
    if (Math.abs(target - r.x - 120) < 40) want = 0;
    if (power > 0.3 && d < R * 1.4) want = Math.sign(r.x - foot.x || 1) * TUNE.raftFlee;
    r.vx += (want - r.vx) * Math.min(1, dt * 2.2);
    if (r.push) { r.vx += r.push * Math.min(1, dt * 6); r.push *= Math.exp(-6 * dt); if (Math.abs(r.push) < 5) r.push = 0; }
    // Pulled in, heavily: the sailors dig in.
    if (power > 0.05 && d < R) {
      const f = 1 - d / R;
      r.vx += (Math.sign(foot.x - r.x) * power * TUNE.raftPull * (90 + 260 * f) - r.vx) * Math.min(1, dt * 4);
      if (d < 80 && power > TUNE.liftAt) r.spin += dt; else r.spin = Math.max(0, r.spin - dt * 0.5);
      if (r.spin >= TUNE.raftLift) { r.state = 'lift'; r.lt = 0; env.sfx('whoosh'); return; }
    } else r.spin = Math.max(0, r.spin - dt);
    r.x += r.vx * dt;
    r.x = clamp(r.x, -500, EDDY.x1 - 150);
    if (Math.abs(r.vx) > 20) r.facing = Math.sign(r.vx);
    r.frame = Math.floor(r.t * 3) % 2;
    // The boat hook reaches the bottle.
    const b = bottle;
    if (b.state === 'float' && b.duck <= 0 && b.spin < 0.1 && b.x - r.x > -40 && b.x - r.x < TUNE.hook) {
      r.state = 'hook'; r.lt = 0; r.facing = 1;
      b.state = 'held'; b.vx = 0;
      env.sfx('tug');
      fx.pop(r.x + 100, seaY(r.x) - 300, 'Hooked!', { size: 48, colour: '#8a2a2a' });
      hints.say('They hooked it! Catch up: the captain throws it on.', 3);
    }
  }

  // ---------- gulls ----------

  function updateGulls(dt) {
    const M = mouth();
    for (const gl of gulls) {
      if (gl.state === 'gone') continue;
      if (gl.state === 'lift') {
        gl.lt += dt;
        if (gl.lt >= 0.5) { gl.state = 'gone'; full = Math.min(TUNE.cap, full + 0.03); env.sfx('bubble'); fx.pop(M.x, M.y - 40, 'Squawk!', { size: 40 }); }
        continue;
      }
      if (!cam.sees(gl.x, gl.x, 400)) continue;
      const dx = gl.x - p.x, dy = gl.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const rx = bodyRx();
      let ax = (gl.hx - gl.x) * 1.2, ay = (gl.hy - gl.y) * 1.2;
      if (d < rx + 280) { const w = (1 - d / (rx + 280)) * 900; ax += (dx / d) * w; ay += (dy / d) * w - 150; }
      gl.vx += (ax - gl.vx * 1.6) * dt; gl.vy += (ay - gl.vy * 1.6) * dt;
      gl.x += gl.vx * dt; gl.y += gl.vy * dt;
      gl.y = clamp(gl.y, 150, 700);
      if (power > 0.5 && Math.hypot(gl.x - M.x, gl.y - M.y) < 170 + 60 * cloud.sizeK) {
        gl.vx += (M.x - gl.x) * 6 * dt; gl.vy += (M.y - gl.y) * 6 * dt;
        if (Math.hypot(gl.x - M.x, gl.y - M.y) < 60) { gl.state = 'lift'; gl.lt = 0; }
      }
    }
  }

  // ---------- where things are ----------

  function mouth() {
    const [mx, my] = MOUTH[cloud.anim] || MOUTH.suck;
    const sz = art.creatureSize(cloud);
    return { x: cloud.x + (mx - 0.5) * sz.w * cloud.facing, y: cloud.y + (my - 0.5) * sz.h };
  }
  function footPoint() { return { x: foot.x, y: seaY(foot.x) + 2 }; }
  function spoutEnd(M) {
    const F = footPoint();
    const u = 0.78 + 0.22 * power;
    return { x: lerp(M.x, F.x, u), y: lerp(M.y, F.y, u) };
  }
  function bez(A, C, B, u) {
    const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
    return { x: a * A.x + b * C.x + c * B.x, y: a * A.y + b * C.y + c * B.y };
  }
  function splash(x, k) {
    fx.burst(x, seaY(x), { n: Math.round(6 * k) + 3, colour: FOAM, speed: 260 * k, up: 0.9, size: 9, life: 0.6, gravity: 900, ink: false });
  }

  // ---------- drawing ----------

  function drawSea(g, tt) {
    const x0 = cam.x - 40, x1 = cam.x + W + 40;
    const step = 32;
    const crest = (x) => seaY(x) + wave(x, tt);
    g.save();
    // The body of the sea.
    g.fillStyle = GOO;
    g.beginPath();
    g.moveTo(x0, H + 80);
    for (let x = x0; x <= x1 + step; x += step) g.lineTo(x, crest(x));
    g.lineTo(x1 + step, H + 80);
    g.closePath();
    g.fill();
    const sp = art.sprite('terrain.sea', 1);
    if (sp) {
      // The delivered strip, in slices that follow the drained surface.
      const h = 300, k = h / sp.h, tw = sp.w * k, slice = 48;
      g.save();
      g.clip();
      for (let x = Math.floor(x0 / slice) * slice; x < x1 + slice; x += slice) {
        const y = seaY(x + slice / 2) - 18;
        const ox = x - Math.floor(x / tw) * tw;
        g.drawImage(sp.img, ox / k, 0, Math.min(slice / k, sp.w - ox / k), sp.h, x, y, slice + 0.6, h);
      }
      g.restore();
    } else {
      // Rows of curling strokes, the book's way of drawing water.
      g.lineCap = 'round';
      for (let r = 0; r < 5; r++) {
        g.strokeStyle = r === 0 ? 'rgba(238,245,246,0.75)' : `rgba(30,55,70,${0.32 - r * 0.05})`;
        g.lineWidth = r === 0 ? 3.5 : 2.5;
        g.beginPath();
        const sx = 74 + r * 9;
        for (let x = Math.floor(x0 / sx) * sx + r * 23; x < x1 + sx; x += sx) {
          const y = crest(x) + 26 + r * 46 + hash(x * 0.3 + r) * 10;
          const rad = 13 + hash(x + r * 7) * 7;
          g.moveTo(x - rad * 1.6, y + 4);
          g.quadraticCurveTo(x - rad * 0.4, y - rad * 0.9, x + rad * 0.5, y - rad * 0.2);
          g.arc(x + rad * 0.2, y - rad * 0.4, rad * 0.45, -0.4, Math.PI * 1.3, false);
        }
        g.stroke();
      }
    }
    // The crest in ink, with foam.
    g.strokeStyle = INK;
    g.lineWidth = 3.5;
    g.beginPath();
    for (let x = x0; x <= x1 + step; x += step) { if (x === x0) g.moveTo(x, crest(x)); else g.lineTo(x, crest(x)); }
    g.stroke();
    g.strokeStyle = FOAM;
    g.lineWidth = 5;
    g.beginPath();
    for (let x = Math.floor(x0 / 96) * 96; x < x1; x += 96) {
      const y = crest(x + 20) - 3;
      g.moveTo(x, y); g.quadraticCurveTo(x + 18, y - 14, x + 38, y - 2);
    }
    g.stroke();
    g.restore();
  }

  function drawRocks(g) {
    for (const [x, h] of rocks) {
      if (!h || !cam.sees(x - 150, x + 150)) continue;
      const y = seaY(x) + 10;
      kit.sprite(g, 'terrain.sea', 2, x, y, { height: h + 60 }, () => inkRock(g, x, y, h + 60, 120 + h * 0.6));
    }
  }

  function inkRock(g, x, y, h, w) {
    g.save();
    g.fillStyle = '#6f6274';
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(x - w / 2, y + 10);
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const px = x - w / 2 + u * w;
      const py = y - Math.sin(u * Math.PI) ** 0.7 * h + (hash(x + i * 3) - 0.5) * h * 0.25;
      g.lineTo(px, Math.min(y + 10, py));
    }
    g.lineTo(x + w / 2, y + 10);
    g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = 'rgba(43,29,20,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 6; i++) { const px = x - w * 0.35 + i * w * 0.14; g.moveTo(px, y - h * 0.15 - hash(i + x) * h * 0.4); g.lineTo(px + 14, y - h * 0.05); }
    g.stroke();
    g.restore();
  }

  function drawStacks(g) {
    for (const s of solids) {
      if (s.kind === 'bank' || s.kind === 'shore' || !cam.sees(s.x - 150, s.x + s.w + 150)) continue;
      const cx = s.x + s.w / 2, bottom = seaY(cx) + 40;
      if (s.kind === 'lighthouse') {
        const rockH = 150;
        const rockY = bottom - 20;
        kit.sprite(g, 'adv.b05.props', 11, cx, rockY, { height: rockY - s.y }, () => {
          inkRock(g, cx, rockY, rockH, s.w + 140);
          inkLighthouse(g, cx, rockY - rockH + 10, rockY - rockH + 10 - s.y, s.w * 0.7);
        });
      } else {
        kit.sprite(g, 'terrain.sea', 2, cx, bottom, { height: bottom - s.y, ay: 1 }, () => inkStack(g, s, bottom));
      }
    }
  }

  function inkStack(g, s, bottom) {
    const top = s.y;
    g.save();
    g.fillStyle = '#6f6274';
    g.strokeStyle = INK;
    g.lineWidth = 4.5;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(s.x - 30, bottom);
    const n = 8;
    for (let i = 0; i <= n; i++) { const u = i / n; g.lineTo(s.x - 30 + (hash(s.x + i) - 0.3) * 40 + u * 25, lerp(bottom, top + 10, u)); }
    g.lineTo(s.x + 8, top); g.lineTo(s.x + s.w * 0.5, top - 10); g.lineTo(s.x + s.w - 6, top);
    for (let i = n; i >= 0; i--) { const u = i / n; g.lineTo(s.x + s.w + 30 - (hash(s.x + 50 + i) - 0.3) * 40 - u * 25, lerp(bottom, top + 10, u)); }
    g.closePath();
    g.fill(); g.stroke();
    // A grassy top and hatching.
    g.fillStyle = '#7d8a4a';
    g.beginPath(); g.moveTo(s.x + 6, top + 2); g.lineTo(s.x + s.w * 0.5, top - 10); g.lineTo(s.x + s.w - 6, top + 2); g.lineTo(s.x + s.w - 20, top + 22); g.lineTo(s.x + 20, top + 22); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(43,29,20,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    for (let y = top + 60; y < bottom; y += 56) { const o = hash(y) * 40; g.moveTo(s.x + 20 + o, y); g.lineTo(s.x + 60 + o, y + 22); g.moveTo(s.x + s.w - 60 - o, y + 30); g.lineTo(s.x + s.w - 20 - o, y + 50); }
    g.stroke();
    g.restore();
  }

  function inkLighthouse(g, x, base, h, w) {
    g.save();
    g.strokeStyle = INK;
    g.lineWidth = 4;
    // The tower, white with red bands.
    g.fillStyle = '#f3ebe0';
    g.beginPath(); g.moveTo(x - w / 2, base); g.lineTo(x - w * 0.34, base - h + 40); g.lineTo(x + w * 0.34, base - h + 40); g.lineTo(x + w / 2, base); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#c8443a';
    for (let i = 0; i < 3; i++) {
      const y0 = base - h * (0.2 + i * 0.26), y1 = y0 - h * 0.11;
      const k0 = 0.5 - 0.16 * ((base - y0) / h), k1 = 0.5 - 0.16 * ((base - y1) / h);
      g.beginPath(); g.moveTo(x - w * k0, y0); g.lineTo(x - w * k1, y1); g.lineTo(x + w * k1, y1); g.lineTo(x + w * k0, y0); g.closePath(); g.fill();
    }
    // The lamp.
    g.fillStyle = '#f2c53d';
    g.fillRect(x - w * 0.3, base - h + 4, w * 0.6, 36); g.strokeRect(x - w * 0.3, base - h + 4, w * 0.6, 36);
    g.fillStyle = '#6f6274';
    g.beginPath(); g.moveTo(x - w * 0.38, base - h + 4); g.lineTo(x, base - h - 22); g.lineTo(x + w * 0.38, base - h + 4); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  function drawBanks(g, tt) {
    for (const s of solids) {
      if (s.kind !== 'bank' || !cam.sees(s.x - 300, s.x + s.w + 300)) continue;
      const bottom = s.y + s.h;
      g.save();
      g.fillStyle = '#8f7f93';
      g.strokeStyle = INK;
      g.lineWidth = 4;
      // A heavy cloud bank hanging down, puff by puff.
      const x0 = s.x - 160, x1 = s.x + s.w + 160;
      for (let row = 0; row < 3; row++) {
        const r = 58 + row * 14;
        const y = bottom - r - row * 90;
        g.fillStyle = row === 0 ? '#9a8aa0' : row === 1 ? '#8f7f93' : '#857488';
        g.beginPath();
        for (let x = x0 - row * 40; x <= x1 + row * 40; x += r * 1.3) {
          const bob = env.reduceMotion ? 0 : Math.sin(tt * 1.3 + x * 0.02) * 4;
          g.moveTo(x + r, y + bob);
          g.arc(x, y + bob, r, 0, Math.PI * 2);
        }
        g.fill(); g.stroke();
      }
      g.fillStyle = '#857488';
      g.fillRect(x0 - 100, -200, x1 - x0 + 200, bottom - 230);
      g.restore();
    }
  }

  function drawShore(g) {
    if (!cam.sees(SHORE - 100, SHORE + 800)) return;
    const y = SEA0 + 10;
    g.save();
    g.fillStyle = '#8a7a4c';
    g.strokeStyle = INK;
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(SHORE, H + 60);
    g.lineTo(SHORE, y);
    g.lineTo(SHORE + 40, y - 60); g.lineTo(SHORE + 120, y - 90); g.lineTo(SHORE + 220, y - 180); g.lineTo(SHORE + 320, y - 230); g.lineTo(SHORE + 420, y - 260); g.lineTo(SHORE + 700, y - 300);
    g.lineTo(SHORE + 700, H + 60);
    g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#7d8a4a';
    g.beginPath(); g.moveTo(SHORE + 30, y - 60); g.lineTo(SHORE + 120, y - 90); g.lineTo(SHORE + 220, y - 180); g.lineTo(SHORE + 320, y - 230); g.lineTo(SHORE + 700, y - 300); g.lineTo(SHORE + 700, y - 270); g.lineTo(SHORE + 330, y - 200); g.lineTo(SHORE + 230, y - 150); g.lineTo(SHORE + 130, y - 60); g.closePath(); g.fill(); g.stroke();
    // The signpost.
    const sx = SHORE + 330, sy = y - 232;
    g.fillStyle = '#8a6a44';
    g.fillRect(sx - 7, sy - 190, 14, 190); g.strokeRect(sx - 7, sy - 190, 14, 190);
    g.fillStyle = '#e8dcc4';
    g.fillRect(sx - 95, sy - 250, 190, 70); g.strokeRect(sx - 95, sy - 250, 190, 70);
    g.fillStyle = INK;
    g.font = '800 26px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.fillText('EDGE OF', sx, sy - 222);
    g.fillText('NOWHERE', sx, sy - 193);
    g.restore();
  }

  const SIGN_TEXT = ['OPEN SEA', 'THE CLIFFS', 'THE WINDMILLS', 'SUNBREAK', 'THE EDDY'];
  function drawSigns(g) {
    cps.list.forEach((x, i) => {
      if (i === 0 || !cam.sees(x - 120, x + 120)) return;
      const y = seaY(x) + 6;
      g.save();
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.fillStyle = '#c8443a';
      g.beginPath(); g.ellipse(x, y, 42, 16, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#8a6a44';
      g.fillRect(x - 6, y - 150, 12, 150); g.strokeRect(x - 6, y - 150, 12, 150);
      g.fillStyle = '#e8dcc4';
      const w = 200;
      g.beginPath(); g.moveTo(x - w / 2, y - 200); g.lineTo(x + w / 2 - 20, y - 200); g.lineTo(x + w / 2 + 10, y - 178); g.lineTo(x + w / 2 - 20, y - 156); g.lineTo(x - w / 2, y - 156); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = INK;
      g.font = '800 24px Fraunces, Georgia, serif';
      g.textAlign = 'center';
      g.fillText(SIGN_TEXT[i] || '', x - 8, y - 170);
      g.restore();
    });
  }

  function drawWindmillTower(g, wm) {
    const base = seaY(wm.x) + 10;
    kit.sprite(g, 'adv.b05.props', 7, wm.x, base, { height: base - (wm.hub - wm.len) + 20, ay: 1 }, () => {
      inkRock(g, wm.x, base, 150, 260);
      g.save();
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.fillStyle = '#b9a98a';
      const top = wm.hub + 30, bot = base - 120;
      g.beginPath(); g.moveTo(wm.x - 70, bot); g.lineTo(wm.x - 42, top); g.lineTo(wm.x + 42, top); g.lineTo(wm.x + 70, bot); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#8a6a44';
      g.beginPath(); g.moveTo(wm.x - 54, top + 4); g.lineTo(wm.x, top - 50); g.lineTo(wm.x + 54, top + 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#5a4630';
      g.fillRect(wm.x - 16, bot - 70, 32, 70); g.strokeRect(wm.x - 16, bot - 70, 32, 70);
      g.strokeStyle = 'rgba(43,29,20,0.35)'; g.lineWidth = 2;
      g.beginPath();
      for (let y = top + 30; y < bot - 20; y += 34) { g.moveTo(wm.x - 40, y); g.lineTo(wm.x + 40, y); }
      g.stroke();
      g.restore();
    });
  }

  function drawSails(g, wm) {
    if (art.sprite('adv.b05.props', 7)) return; // the delivered windmill has its own sails
    g.save();
    g.translate(wm.x, wm.hub);
    g.strokeStyle = INK;
    g.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      g.save();
      g.rotate(wm.ang + (i * Math.PI) / 2);
      g.fillStyle = '#e8dcc4';
      g.beginPath(); g.rect(20, -6, wm.len - 20, 12); g.fill(); g.stroke();
      g.fillStyle = 'rgba(232,220,196,0.85)';
      g.beginPath(); g.moveTo(40, -6); g.lineTo(wm.len - 10, -6); g.lineTo(wm.len - 10, -46); g.lineTo(40, -34); g.closePath(); g.fill(); g.stroke();
      g.beginPath();
      for (let k = 60; k < wm.len - 10; k += 28) { g.moveTo(k, -6); g.lineTo(k, -40 + (k - 40) * 0.06 * 0.2 - 2); }
      g.stroke();
      g.restore();
    }
    g.fillStyle = '#c8443a';
    g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }

  function drawBeams(g, tt) {
    for (const b of beams) {
      if (!cam.sees(b.cx - 700, b.cx + 700)) continue;
      const xt = beamX(b, 0, tt), xb = beamX(b, SEA0, tt);
      const y1 = seaY(xb) + 20;
      g.save();
      const sp = art.sprite('adv.b05.props', 9);
      if (sp) {
        g.globalAlpha = 0.8;
        art.drawSprite(g, sp, xb, y1, { height: y1 + 60, ay: 1 });
      } else {
        const gr = g.createLinearGradient(0, 0, 0, y1);
        gr.addColorStop(0, 'rgba(255,240,180,0.55)'); gr.addColorStop(1, 'rgba(255,236,170,0.22)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(xt - b.w / 2, -60); g.lineTo(xt + b.w / 2, -60); g.lineTo(xb + b.w / 2, y1); g.lineTo(xb - b.w / 2, y1); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(200,160,60,0.5)';
        g.lineWidth = 3;
        g.setLineDash([30, 22]);
        g.beginPath(); g.moveTo(xt - b.w / 2, -60); g.lineTo(xb - b.w / 2, y1); g.moveTo(xt + b.w / 2, -60); g.lineTo(xb + b.w / 2, y1); g.stroke();
        g.setLineDash([]);
        // A sun peeping through the top.
        g.fillStyle = '#f7d75a';
        g.strokeStyle = INK;
        g.lineWidth = 3.5;
        g.beginPath(); g.arc(xt, 20, 56, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
    }
  }

  function drawRainCloud(g, rc, tt) {
    kit.sprite(g, 'adv.b05.props', 10, rc.x, rc.y, { height: 150, ay: 0.5 }, () => {
      g.save();
      g.strokeStyle = INK;
      g.lineWidth = 3.5;
      g.fillStyle = '#5c5468';
      g.beginPath();
      g.arc(rc.x - 42, rc.y + 4, 34, 0, Math.PI * 2);
      g.arc(rc.x, rc.y - 16, 44, 0, Math.PI * 2);
      g.arc(rc.x + 44, rc.y + 6, 34, 0, Math.PI * 2);
      g.fill(); g.stroke();
      g.fillRect(rc.x - 60, rc.y + 10, 120, 24);
      g.strokeStyle = '#7fa6c0';
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const o = ((tt * 160 + i * 23) % 60);
        const x = rc.x - 50 + i * 20;
        g.moveTo(x, rc.y + 44 + o); g.lineTo(x - 4, rc.y + 60 + o);
      }
      g.stroke();
      g.restore();
    });
  }

  function drawGull(g, gl, tt) {
    kit.sprite(g, 'adv.b05.props', 8, gl.x, gl.y, { height: 44, ay: 0.5 }, () => {
      const f = Math.sin(tt * 9 + gl.ph);
      g.save();
      g.strokeStyle = INK;
      g.lineWidth = 3.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(gl.x - 30, gl.y - f * 12);
      g.quadraticCurveTo(gl.x - 14, gl.y - 12 - f * 6, gl.x, gl.y);
      g.quadraticCurveTo(gl.x + 14, gl.y - 12 - f * 6, gl.x + 30, gl.y - f * 12);
      g.stroke();
      g.fillStyle = '#fbf6e8';
      g.beginPath(); g.ellipse(gl.x, gl.y + 2, 10, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    });
  }

  function drawAirBlob(g, b, x, y, alpha) {
    g.save();
    g.globalAlpha = alpha;
    kit.sprite(g, 'adv.b05.props', 12, x, y, { height: 74, ay: 0.5, rot: Math.sin(b.seed) * 0.4 }, () => {
      if (art.drawSprite(g, art.prop('typhoonigator', 8), x, y, { height: 74, ay: 0.5, rot: Math.sin(b.seed) * 0.4 })) return;
      g.fillStyle = '#4f7f93'; g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, y, 34, 28, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    });
    g.restore();
  }

  function itemSprite(it) { return art.prop('typhoonigator', it.kind); }
  function bobY(it, tt) { return env.reduceMotion ? 0 : Math.sin(tt * 2.4 + (it.ph || 0) + it.x * 0.01) * 5; }

  function ring(g, x, y, w) {
    g.save(); g.strokeStyle = 'rgba(240,246,252,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI); g.stroke(); g.restore();
  }

  function drawItem(g, it, tt) {
    const h = JUNK[it.kind][0];
    const sy = seaY(it.x);
    // Fish leap now and then.
    let leap = 0;
    if ((it.kind === 4 || it.kind === 5) && it.leap % 5 > 4.2) leap = Math.sin(((it.leap % 5) - 4.2) / 0.8 * Math.PI) * 90;
    const y = sy + 14 + bobY(it, tt) - leap;
    ring(g, it.x, sy + 8, h * 0.5);
    const item = it.kind === 4 || it.kind === 5 ? 4 : it.kind === 2 ? 2 : it.kind === 3 ? 3 : it.kind === 8 ? 12 : 0;
    const draw = () => {
      if (!art.drawSprite(g, itemSprite(it), it.x, y, { height: h, ay: 0.78, rot: it.rot + Math.sin(tt * 1.7 + it.ph) * 0.12 + (leap ? -0.6 : 0) })) {
        g.save(); g.fillStyle = ['#000', '#d94', '#5a8', '#8a5', '#bbc', '#d86', '#c33', '#875', '#4f7f93'][it.kind]; g.strokeStyle = INK; g.lineWidth = 3;
        g.beginPath(); g.ellipse(it.x, y - h * 0.3, h * 0.4, h * 0.3, it.rot, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }
    };
    if (item) kit.sprite(g, 'adv.b05.props', item, it.x, y, { height: h, ay: 0.78, rot: it.rot }, draw);
    else draw();
  }

  function drawBottle(g, tt) {
    const b = bottle;
    if (!cam.sees(b.x)) return;
    const sy = seaY(b.x);
    const y = sy + 12 + bobY(b, tt);
    const glint = Math.max(0, Math.sin(tt * 3)) * 0.7 + 0.2;
    if (b.duck <= 0 && b.state === 'float') {
      g.save(); g.globalAlpha = 0.6 * glint; g.strokeStyle = '#f2c53d'; g.lineWidth = 5;
      g.beginPath(); g.ellipse(b.x, sy + 6, 80, 20, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    if (b.duck > 0) {
      if (!art.drawSprite(g, art.prop('typhoonigator', 9), b.x, y + 6, { height: 110, ay: 0.85 })) {
        g.save(); g.fillStyle = '#7fa6c0'; g.beginPath(); g.ellipse(b.x, y - 10, 40, 18, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    } else {
      ring(g, b.x, sy + 8, 54);
      kit.sprite(g, 'adv.b05.props', 1, b.x, y, { height: 110, ay: 0.82, rot: b.rot }, () => {
        if (!art.drawSprite(g, art.prop('typhoonigator', 1), b.x, y, { height: 110, ay: 0.8, rot: b.rot })) {
          g.save(); g.fillStyle = '#e8e2d0'; g.strokeStyle = '#c8443a'; g.lineWidth = 6;
          g.beginPath(); g.ellipse(b.x, y - 30, 22, 40, b.rot, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
        }
      });
    }
    if (b.state === 'held') {
      // The boat hook from the captain's hand to the bottle.
      g.save(); g.strokeStyle = '#8a6a44'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(raft.x + 80, seaY(raft.x) - 190); g.lineTo(b.x - 10, y - 70); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(raft.x + 80, seaY(raft.x) - 190); g.lineTo(b.x - 10, y - 70); g.stroke();
      g.restore();
    }
  }

  // The letter's tag on the bottle, and at the eddy a marker and the button to press.
  function drawPrompts(g, tt) {
    const b = bottle;
    if (b.state === 'gone' || b.state === 'lift' || !cam.sees(b.x)) return;
    const y = b.state === 'fly' ? lerp(seaY(b.fly.x0) - 200, seaY(b.fly.x1), clamp(b.lt / TUNE.flyTime, 0, 1)) - Math.sin(clamp(b.lt / TUNE.flyTime, 0, 1) * Math.PI) * 320 : seaY(b.x) - 40;
    letterTag(g, b.x + 70, y - 60, { t: tt, r: 34 });
    if (b.x >= EDDY.x0 && p.x >= EDDY.x0 - 900 && b.state === 'float') {
      marker(g, b.x, y - 120, { t: tt, label: 'The bottle!' });
      const over = Math.abs(foot.x - b.x) < radius() && b.duck <= 0;
      actionPrompt(g, b.x, y - 210, over ? 'Suck it up!' : 'Hold to suck', { kind: env.inputKind, t: tt, pulse: over ? 1 : 0 });
    }
  }

  function drawFlyingBottle(g) {
    const b = bottle;
    const u = clamp(b.lt / TUNE.flyTime, 0, 1);
    const y = lerp(seaY(b.fly.x0) - 200, seaY(b.fly.x1), u) - Math.sin(u * Math.PI) * 320;
    const sp = art.prop('typhoonigator', 1);
    if (!art.drawSprite(g, sp, b.x, y, { height: 100, ay: 0.5, rot: u * 9 })) {
      g.save(); g.fillStyle = '#e8e2d0'; g.strokeStyle = '#c8443a'; g.lineWidth = 6;
      g.beginPath(); g.ellipse(b.x, y, 22, 40, u * 9, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
  }

  function drawRaft(g, tt) {
    const r = raft;
    const sy = seaY(r.x);
    const y = sy + 30 + (env.reduceMotion ? 0 : Math.sin(tt * 2.2) * 6);
    const captain = r.state === 'hook' || r.state === 'throw';
    const h = 250;
    const item = captain ? 6 : 5;
    kit.sprite(g, 'adv.b05.props', item, r.x, y, { height: h, ay: 0.9, flip: r.facing < 0 }, () => {
      const sp = captain ? art.cast(9) : art.cast(r.frame ? 11 : 10);
      if (art.drawSprite(g, sp, r.x, y, { height: h, ay: 0.9, flip: r.facing < 0 && !captain })) return;
      // Ink: a pink raft with hooded sailors and the S.O.S. flag.
      g.save();
      g.strokeStyle = INK; g.lineWidth = 4;
      g.fillStyle = '#e7a0a8';
      g.beginPath(); g.ellipse(r.x, y - 30, 130, 36, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#5f6d85';
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(r.x + i * 60, y - 95, 28, 50, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.fillStyle = '#8a6a44'; g.fillRect(r.x + 90, y - 230, 6, 170);
      g.fillStyle = '#fbf6e8'; g.fillRect(r.x + 96, y - 230, 80, 44); g.strokeRect(r.x + 96, y - 230, 80, 44);
      g.fillStyle = INK; g.font = '800 22px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.fillText('S.O.S.', r.x + 136, y - 200);
      g.restore();
    });
  }

  function drawVortex(g, tt) {
    if (power < 0.04 || !cam.sees(foot.x - 500, foot.x + 500)) return;
    const R = radius();
    const K = 0.22;
    const fy = seaY(foot.x) + 4;
    g.save();
    g.translate(foot.x, fy);
    g.globalAlpha = 0.35 * power;
    g.fillStyle = '#16304a';
    g.beginPath(); g.ellipse(0, 0, R, R * K, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.45 * power;
    g.fillStyle = '#0d1d2e';
    g.beginPath(); g.ellipse(0, 0, R * 0.25, R * K * 0.25, 0, 0, Math.PI * 2); g.fill();
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.17;
      const a0 = tt * (4 + i * 1.5) * (env.reduceMotion ? 0.3 : 1) + i * 1.7;
      g.globalAlpha = (0.85 - i * 0.1) * power;
      g.strokeStyle = i % 2 ? '#cfe0ee' : '#f6fbff';
      g.lineWidth = 9 - i;
      g.beginPath(); g.ellipse(0, 0, R * k, R * K * k, 0, a0, a0 + 3.4); g.stroke();
      g.strokeStyle = 'rgba(20,40,60,0.6)';
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, 0, R * k * 0.93, R * K * k * 0.93, 0, a0 + 0.4, a0 + 2.6); g.stroke();
    }
    g.restore();
  }

  function drawSpout(g, M, tt) {
    const F = spoutEnd(M);
    const sway = env.reduceMotion ? 0 : Math.sin(tt * 2.3) * 22;
    const C = { x: mid.x + sway, y: mid.y };
    const n = 22;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(bez(M, C, F, i / n));
    const w0 = 18 * cloud.sizeK, w1 = 30 + 36 * power;
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
    g.globalAlpha = 0.6 + 0.35 * power;
    const gr = g.createLinearGradient(M.x, M.y, F.x, F.y);
    gr.addColorStop(0, 'rgba(150,165,190,0.9)');
    gr.addColorStop(1, 'rgba(105,130,160,0.85)');
    g.fillStyle = gr;
    g.strokeStyle = 'rgba(40,40,60,0.55)';
    g.lineWidth = 3;
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
    // Goo going up the spout.
    if (power > 0.3) {
      g.fillStyle = GOO;
      g.strokeStyle = INK;
      g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const u = 1 - ((tt * 0.9 + i / 6) % 1);
        const q = bez(M, C, F, u);
        const r = (7 + (i % 3) * 3) * (0.6 + 0.4 * u);
        g.beginPath(); g.ellipse(q.x + Math.sin(tt * 7 + i) * 10, q.y, r * 1.2, r, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    }
    // Spray where it meets the water.
    if (power > 0.15) {
      for (let i = 0; i < 10; i++) {
        const a = tt * 7 + i * 0.63;
        const r = (40 + ((tt * 90 + i * 23) % 50)) * power;
        g.fillStyle = 'rgba(240,246,252,0.85)';
        g.beginPath(); g.arc(F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.25 - 6, 5, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
  }

  function liftPoint(M, u) {
    const F = footPoint();
    const C = { x: mid.x, y: mid.y };
    return bez(M, C, F, 1 - u);
  }

  function drawLifted(g, it, M, kind, size) {
    const u = it.lt / TUNE.liftTime;
    const q = liftPoint(M, u);
    const wob = Math.sin(it.lt * 18) * 22 * (1 - u);
    const h = size * (1 - 0.55 * u);
    g.save(); g.globalAlpha = 1 - u * 0.4;
    if (!art.drawSprite(g, art.prop('typhoonigator', kind), q.x + wob, q.y, { height: h, ay: 0.5, rot: it.rot })) {
      g.fillStyle = kind === 1 ? '#e8e2d0' : GOO; g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.ellipse(q.x + wob, q.y, h * 0.3, h * 0.45, it.rot, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
  }

  function drawLiftedRaft(g, M) {
    const u = raft.lt / 0.9;
    const q = liftPoint(M, u);
    g.save(); g.globalAlpha = 1 - u * 0.4;
    const sp = art.cast(10);
    if (!art.drawSprite(g, sp, q.x, q.y, { height: 250 * (1 - 0.5 * u), ay: 0.6, rot: u * 6 })) {
      g.fillStyle = '#e7a0a8'; g.strokeStyle = INK; g.lineWidth = 4;
      g.beginPath(); g.ellipse(q.x, q.y, 100 * (1 - 0.5 * u), 40 * (1 - 0.5 * u), u * 6, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
  }

  function drawLiftedGull(g, gl, M) {
    const u = gl.lt / 0.5;
    const a = u * 12;
    const x = lerp(gl.x, M.x, u) + Math.cos(a) * 40 * (1 - u), y = lerp(gl.y, M.y, u) + Math.sin(a) * 20 * (1 - u);
    g.save(); g.globalAlpha = 1 - u * 0.5; g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 20, y - 8); g.quadraticCurveTo(x, y + 4, x + 20, y - 8); g.stroke();
    g.restore();
  }

  function drawSpray(g, it) {
    const u = it.lt / 0.75;
    const x = lerp(it.sx, it.tx, u);
    const y = lerp(it.sy, seaY(it.tx), u) - Math.sin(u * Math.PI) * 180;
    if (!art.drawSprite(g, art.prop('typhoonigator', it.kind), x, y, { height: JUNK[it.kind][0], ay: 0.5, rot: u * 8 * it.spinV })) {
      g.save(); g.fillStyle = GOO; g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, y, 20, 28, u * 8, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
  }

  // Rain everywhere but in the sun (streaks fixed to the world, cheap).
  function drawRain(g, tt) {
    if (p.x > 8000 && p.x < 10300) return;
    g.save();
    g.strokeStyle = 'rgba(225,230,245,0.3)';
    g.lineWidth = 2;
    g.beginPath();
    const n = env.reduceMotion ? 40 : 90;
    const x0 = Math.floor(cam.x / 100) * 100;
    for (let i = 0; i < n; i++) {
      const hx = hash(i * 3.1 + Math.floor(cam.x / 2200));
      const x = x0 - 100 + hx * (W + 300) + ((i * 37) % 50);
      const y = ((tt * (700 + hash(i) * 400) + hash(i * 7) * 1200) % (SEA0 + 100)) - 40;
      const l = 24 + hash(i * 13) * 30;
      g.moveTo(x, y); g.lineTo(x - l * 0.3, y + l);
    }
    g.stroke();
    g.restore();
  }

  function drawRaftOnRoute(g) {
    if (raft.state === 'gone') return;
    const w = 720, x0 = (W - w) / 2, y = 112;
    const rx = x0 + clamp(raft.x / WORLD, 0, 1) * w;
    g.save();
    g.fillStyle = '#e7a0a8';
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(rx, y + 2, 14, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }

  function drawMeters(g, tt) {
    const w = 340, x = (W - w) / 2;
    g.save();
    // The goo meter: how much of the Blue Ocean of Bubbley Goo is inside it.
    let y = 134, h = 26;
    roundRect(g, x, y, w, h, 13); g.fillStyle = 'rgba(248,241,224,0.9)'; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    if (goo > 0.01) { roundRect(g, x + 3, y + 3, (w - 6) * goo, h - 6, 10); g.fillStyle = goo >= TUNE.feat ? '#2f9a6a' : GOO; g.fill(); }
    g.strokeStyle = 'rgba(51,36,26,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + w * TUNE.feat, y + 3); g.lineTo(x + w * TUNE.feat, y + h - 3); g.stroke();
    label(g, `Goo ${Math.round(goo * 100)}%`, x + 12, y + 20);
    // The fullness: how big it is.
    y = 166; h = 20;
    const f = full / TUNE.cap;
    const shake = full >= TUNE.cap - 0.02 && !env.reduceMotion ? Math.sin(tt * 50) * 3 : 0;
    g.translate(shake, 0);
    roundRect(g, x + 40, y, w - 80, h, 10); g.fillStyle = 'rgba(248,241,224,0.9)'; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    if (f > 0.01) { roundRect(g, x + 43, y + 3, (w - 86) * f, h - 6, 7); g.fillStyle = f > 0.95 ? '#c8443a' : f > 0.7 ? '#e09a3a' : '#9a8aa0'; g.fill(); }
    label(g, f > 0.95 ? 'Full!' : 'Full', x + 52, y + 16, 18);
    g.restore();
  }
  function label(g, text, x, y, size = 20) {
    g.font = `800 ${size}px Fraunces, Georgia, serif`;
    g.textAlign = 'left';
    g.lineWidth = 5; g.strokeStyle = 'rgba(248,241,224,0.95)';
    g.strokeText(text, x, y);
    g.fillStyle = INK; g.fillText(text, x, y);
  }

  function outro(dt) {
    if (self.outcome === 'snatched') {
      art.setAnim(cloud, 'celebrate');
      p.x += 300 * dt; p.y -= 90 * dt;
      power = Math.max(0, power - dt * 2);
      art.animate(cloud, dt, 300, -90);
    } else {
      art.setAnim(cloud, 'wispSide');
      power = Math.max(0, power - dt * 3);
      art.animate(cloud, dt);
      bottle.rot = Math.sin(t * 2.1) * 0.3;
    }
    cloud.x = p.x; cloud.y = p.y;
    cam.follow(p.x, p.vx, dt);
    foot.vx += ((p.x - foot.x) * 30 - foot.vx * 8) * dt;
    foot.x += foot.vx * dt;
    const M = mouth(), F = footPoint();
    mid.x += (lerp(M.x, F.x, 0.5) - mid.x) * Math.min(1, dt * 6); mid.y += (lerp(M.y, F.y, 0.5) - mid.y) * Math.min(1, dt * 6);
  }

  return self;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}

// The how-to-play page (chapters/index.js, THE HOW-TO-PLAY PAGE).
export const HOWTO = [
  {
    text: 'Hold Action to suck up the sea: the goo meter fills, and you swell up.',
    scene: 'scenes/typhoonigator', crop: [0, 200, 960, 720],
    items: [
      { creature: 'typhoonigator', anim: 'suck', x: 300, y: 200, h: 180 },
      { draw: (g) => { g.save(); g.strokeStyle = 'rgba(150,170,200,0.9)'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(350, 260); g.quadraticCurveTo(330, 350, 400, 420); g.stroke(); g.restore(); } },
      { sprite: ['props.typhoonigator', 4], x: 470, y: 430, h: 40 },
      { sprite: ['props.typhoonigator', 8], x: 330, y: 436, h: 40 },
      { ring: [400, 420, 90] },
      { word: 'SLURP!', x: 500, y: 150, size: 44 },
    ],
  },
  {
    text: 'Too big for a gap? Sprint rains some out; a tap of Action blows a gust.',
    scene: 'scenes/typhoonigator', crop: [600, 150, 960, 720],
    items: [
      { draw: (g) => { g.save(); g.fillStyle = '#857488'; g.strokeStyle = '#2b1d14'; g.lineWidth = 3; g.fillRect(380, 0, 110, 150); g.strokeRect(380, 0, 110, 150); g.fillStyle = '#6f6274'; g.fillRect(380, 330, 110, 150); g.strokeRect(380, 330, 110, 150); g.restore(); } },
      { creature: 'typhoonigator', anim: 'bloated', x: 180, y: 240, h: 230 },
      { path: [[300, 240], [430, 240], [560, 240]], arrow: true },
      { word: 'WHOOSH', x: 560, y: 160, size: 36 },
    ],
  },
  {
    text: 'At the eddy, hold the spout over the captain’s bottle before the sailors hook it.',
    scene: 'scenes/typhoonigator', crop: [300, 300, 960, 720],
    items: [
      { creature: 'typhoonigator', anim: 'suck', x: 400, y: 160, h: 170 },
      { draw: (g) => { g.save(); g.strokeStyle = 'rgba(150,170,200,0.9)'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(450, 220); g.quadraticCurveTo(470, 320, 440, 400); g.stroke(); g.restore(); } },
      { sprite: ['props.typhoonigator', 1], x: 440, y: 430, h: 60 },
      { cast: 10, x: 200, y: 450, h: 150 },
      { ring: [440, 410, 60] },
      { word: 'GOT IT!', x: 520, y: 120, size: 40 },
    ],
  },
];

// ---------- the autopilot ----------
//
// Sucks the sea as it goes (for the goo meter), steers through the gaps,
// rains itself out with Sprint or a blow when it is too big for the next gap,
// goes over the windmill sails, takes the blobs in the air it passes, and at
// the eddy hovers its spout over the bottle and keeps sucking.
export function autopilot(b) {
  const S = b.S;
  const { p, foot, bottle, raft, gaps, windmills, airBlobs, TUNE, ZONE, EDDY, ap } = S;
  const out = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  if (b.done) return out;
  const ry = S.ry;
  const full = S.full;
  // A tap of Action (a blow) runs over three frames.
  if (ap.tap > 0) {
    ap.tap--;
    if (ap.tap === 2) { out.action = true; out.actionPressed = true; }
    else if (ap.tap === 1) { out.action = true; }
    else { out.action = false; out.actionReleased = true; ap.held = false; }
    out.x = 1;
    return out;
  }
  ap.rest = Math.max(0, ap.rest - 1);
  let ty = 400;
  let suck = true;
  let sprint = false;
  const climax = bottle.x >= EDDY.x0 && p.x >= EDDY.x0 - 900 && bottle.state !== 'gone';
  if (climax) {
    // Put the spout's foot on the bottle: the foot lags behind the cloud.
    const target = bottle.state === 'fly' ? bottle.fly.x1 : bottle.x;
    const lag = p.x - foot.x;
    const dx = target + lag * 0.6 - p.x;
    out.x = clamp(dx / 120, -1, 1);
    ty = 380;
    suck = bottle.state !== 'fly' && bottle.state !== 'held';
    if (bottle.state === 'held' && Math.abs(raft.x - foot.x) < 140) suck = true; // try for the raft
    if (full >= TUNE.cap - 0.05 && ap.rest <= 0 && S.blowCd <= 0) { ap.tap = 3; ap.rest = 60; }
  } else {
    out.x = 1;
    // The next gap ahead: aim for its middle; shed size if it will not fit.
    const gap = gaps.find((g) => g.x + g.w > p.x - 50 && g.x < p.x + 1100);
    if (gap) {
      ty = (gap.top + gap.bottom) / 2;
      const need = 2 * ry + 30;
      if (need > gap.open && gap.x > p.x) {
        sprint = true;
        suck = false;
        if (S.blowCd <= 0 && full >= TUNE.blowMin && ap.rest <= 0) { ap.tap = 3; ap.rest = 40; }
        if (gap.x - p.x < 450) out.x = 0.15; // dawdle until it fits
      }
    } else {
      const wm = windmills.find((w) => w.x > p.x - 250 && w.x < p.x + 700);
      if (wm) ty = ZONE.y0 + 10;
      else {
        const blob = airBlobs.items.find((o) => !o.got && o.x > p.x + 80 && o.x < p.x + 650 && Math.abs(o.y - p.y) < 320);
        ty = blob ? blob.y : 400;
      }
    }
    // Behind on the goo meter: take it slower and drain more.
    if (!sprint && suck && S.goo < (p.x / 12000) * 0.9 && b.time > 60) out.x = 0.45;
    if (full >= TUNE.cap - 0.05) { sprint = true; if (S.blowCd <= 0 && ap.rest <= 0) { ap.tap = 3; ap.rest = 60; } }
    if (b.time < 40) { sprint = true; suck = b.time > 25; }
  }
  // Keep the body in the zone.
  const yMin = ZONE.y0 + Math.max(0, ry - 120) + 10, yMax = ZONE.y1 - 10;
  ty = clamp(ty, yMin, yMax);
  out.y = clamp((ty - p.y) / 70, -1, 1);
  out.sprint = sprint;
  out.action = suck && S.daze <= 0;
  if (out.action && !ap.held) out.actionPressed = true;
  if (!out.action && ap.held) out.actionReleased = true;
  ap.held = out.action;
  return out;
}

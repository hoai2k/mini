// Board 7: the Stamp-Collecting Trollusk, "Just Passing By" (design/adventure.md,
// section 7). Two parts in one scroll across the edge of Nowhere:
//
//   The sneak. The Yalapappus sits munching with the letter on his fork, back
//   turned. Every few seconds his fork stops and an eye bubble pops up (the
//   warning), then he looks round. Tiptoe from fern to rock; FREEZE (let go)
//   in the open, or hold Down behind cover to creep on hidden. Caught moving
//   and he shouts and you scuttle back to the last cover. Action beside him:
//   the snatch.
//
//   The getaway. Run right with the Yalapappus trundling after you, rolling
//   into a ball downhill. Hop rocks, holes and goo puddles (Action), belly-
//   slide under low branches and fallen palms (Down while running), cross the
//   stream on its stepping stones. Every bump spills stamps from the bag: grab
//   them back before he munches them. If he catches up, a tug: mash Action.
//   Win it and he is left dizzy; lose it and you are flung on, dazed, and
//   stamps go flying, but the run continues. The open ground is the way out.
//
// Setbacks are local (the edge of the hole, the near bank) rather than a
// signpost, because the chaser is right behind: the cost is the time lost and
// the stamps spilled. The signposts mark the sections on the route strip.

import * as art from '../art.js';
import * as kit from './kit.js';
import { staminaRing, tugBar, roundRect } from '../chasedraw.js';
import { BOARDS } from './index.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';

const ENTRY = BOARDS.find((b) => b.n === 7);
const { W, H, clamp } = kit;

const INK = '#2b1d14';
const PAPER = '#f8f1e0';
const WORLD_W = 15800;
const FINISH_X = 15250;
const GY = 930; // the base ground line
const YAL_X = 2480; // where the Yalapappus sits munching
const START_X = 220;
const PX_PER_M = 60; // for the "m behind" readout
const GRAVITY = 2600; // the Trollusk's: a hop of 970 clears 250 px at a run, 350 at a scurry

// The ground profile, left to right: flats, slopes (y -> y1), holes and the
// stream (no ground at all).
const PROFILE = [
  { x0: 0, x1: 3700, y: GY },
  { hole: true, x0: 3700, x1: 3900 },
  { x0: 3900, x1: 4720, y: GY },
  { hole: true, x0: 4720, x1: 4920 },
  { x0: 4920, x1: 6400, y: GY },
  { x0: 6400, x1: 7300, y: GY, y1: 840 },
  { x0: 7300, x1: 8100, y: 840 },
  { x0: 8100, x1: 9000, y: 840, y1: GY },
  { x0: 9000, x1: 9250, y: GY },
  { hole: true, x0: 9250, x1: 9450 },
  { x0: 9450, x1: 9750, y: GY },
  { stream: true, x0: 9750, x1: 10450 },
  { x0: 10450, x1: 11900, y: GY },
  { x0: 11900, x1: 12800, y: GY, y1: 840 },
  { x0: 12800, x1: 13500, y: 840 },
  { x0: 13500, x1: 14400, y: 840, y1: GY },
  { x0: 14400, x1: 14600, y: GY },
  { hole: true, x0: 14600, x1: 14800 },
  { x0: 14800, x1: WORLD_W, y: GY },
];
const HOLES = PROFILE.filter((s) => s.hole);
const STREAM = PROFILE.find((s) => s.stream);
const STONES = [9900, 10110, 10320]; // stepping stones across the stream

// The ground line at world x from the profile (null over a hole or the stream).
export function profileY(x) {
  for (const s of PROFILE) {
    if (x < s.x0 || x >= s.x1) continue;
    if (s.hole || s.stream) return null;
    if (s.y1 === undefined) return s.y;
    return s.y + (s.y1 - s.y) * ((x - s.x0) / (s.x1 - s.x0));
  }
  return GY;
}

// Cover for the sneak: ferns (adv.b07.props 3), rocks (4), bushes (11).
const COVER = [
  { x: 560, kind: 'fern', rx: 110 },
  { x: 960, kind: 'rock', rx: 85 },
  { x: 1340, kind: 'bush', rx: 100 },
  { x: 1740, kind: 'fern', rx: 110 },
  { x: 2120, kind: 'rock', rx: 85 },
];
// The getaway's hazards.
const ROCKS = [3380, 4350, 5250, 6050, 11150, 15100];
const BRANCHES = [7480, 13000]; // low branches: slide under
const PALMS = [7900, 11600]; // fallen palm trunks: slide under
const PUDDLES = [4080, 10600, 13330]; // goo puddles: hop or wade slowly
const SIGNS = [2900, 6300, 9100, 10950, 14450]; // crooked signposts (sections)

// Mid-layer decor from the delivered art, behind the play layer: flowerbeds and
// small rocks on the sneak (nothing that looks like cover), ferns, bushes and
// jagged rocks along the getaway, kept clear of the hazards.
const DECOR = [];
{
  const avoid = [...HOLES.map((h) => [h.x0 - 260, h.x1 + 260]), [STREAM.x0 - 260, STREAM.x1 + 260],
    ...BRANCHES.map((x) => [x - 320, x + 320]), ...PALMS.map((x) => [x - 320, x + 320]), ...ROCKS.map((x) => [x - 220, x + 220]),
    ...PUDDLES.map((x) => [x - 220, x + 220]), ...SIGNS.map((x) => [x - 160, x + 160]), ...COVER.map((c) => [c.x - 220, c.x + 220]), [YAL_X - 300, YAL_X + 400]];
  for (let i = 0; i < 70; i++) {
    const x = 300 + i * 205 + kit.hash(i * 3.3) * 160;
    if (x > WORLD_W - 300 || avoid.some(([a, b]) => x > a && x < b)) continue;
    const r = kit.hash(i * 7.1);
    const sneak = x < 2700;
    const kind = sneak ? (r < 0.6 ? 'flowers' : 'pebble') : r < 0.3 ? 'fern' : r < 0.55 ? 'bush' : r < 0.75 ? 'flowers' : 'pebble';
    DECOR.push({ x, kind, k: 0.55 + kit.hash(i * 1.9) * 0.3, flip: kit.hash(i * 4.4) < 0.5 });
  }
}

export default function create(env) {
  art.preload(['props.trollusk', 'props.yalapappus', 'props.grithix', 'yalapappus.swaps', 'yalapappus.poses', 'trollusk.poses', 'trollusk.moves', 'yalapappus.moves', 'adv.b07.props', 'terrain.nowhere', 'ui/letter']);
  const gentle = !!env.gentle?.[0];
  const skill = env.skill ?? 0.5;

  // ---------- the world ----------
  const solids = []; // what the Trollusk stands on and bumps
  const ySolids = []; // what the Yalapappus stands on (no rocks, no branches; a riverbed)
  for (const s of PROFILE) {
    if (s.hole) { ySolids.push({ x: s.x0 - 10, y: 1040, w: s.x1 - s.x0 + 20, h: 400, kind: 'pit' }); continue; }
    if (s.stream) { ySolids.push({ x: s.x0, y: 1000, w: s.x1 - s.x0, h: 400, kind: 'riverbed' }); continue; }
    if (s.y1 === undefined) {
      const g = { x: s.x0, y: s.y, w: s.x1 - s.x0, h: 400, kind: 'ground' };
      solids.push(g); ySolids.push(g);
    } else {
      const n = Math.round((s.x1 - s.x0) / 30);
      const step = (s.x1 - s.x0) / n;
      for (let i = 0; i < n; i++) {
        const x = s.x0 + i * step;
        const ya = s.y + (s.y1 - s.y) * (i / n);
        const yb = s.y + (s.y1 - s.y) * ((i + 1) / n);
        const g = { x, y: Math.round(Math.min(ya, yb)), w: step, h: 400, kind: 'slope', slope: Math.sign(s.y1 - s.y) };
        solids.push(g); ySolids.push(g);
      }
    }
  }
  const rocks = ROCKS.map((x) => ({ x: x - 68, y: profileY(x) - 110, w: 136, h: 110, kind: 'rock', cx: x }));
  const stones = STONES.map((x) => ({ x: x - 65, y: GY, w: 130, h: 90, kind: 'stone', cx: x }));
  const branches = BRANCHES.map((x) => ({ x: x - 150, y: profileY(x) - 172, w: 300, h: 72, kind: 'branch', cx: x }));
  const palms = PALMS.map((x) => ({ x: x - 170, y: profileY(x) - 160, w: 340, h: 60, kind: 'palm', cx: x }));
  const puddles = PUDDLES.map((x) => ({ x: x - 110, x1: x + 110, cx: x, y: profileY(x) }));
  solids.push(...rocks, ...stones, ...branches, ...palms);
  ySolids.push(...stones);
  const lowSolids = [...branches, ...palms];
  const underLow = (x) => lowSolids.some((s) => x > s.x - 50 && x < s.x + s.w + 50);

  // What the autopilot must deal with, in order.
  const hazards = [
    ...HOLES.map((h) => ({ kind: 'hole', x0: h.x0, x1: h.x1 })),
    ...rocks.map((r) => ({ kind: 'rock', x0: r.x, x1: r.x + r.w })),
    ...puddles.map((p) => ({ kind: 'puddle', x0: p.x, x1: p.x1 })),
    ...lowSolids.map((s) => ({ kind: 'low', x0: s.x, x1: s.x + s.w })),
    { kind: 'stream', x0: STREAM.x0, x1: STREAM.x1 },
  ].sort((a, b) => a.x0 - b.x0);

  // ---------- stamps ----------
  const stampList = [];
  const addStamp = (x, y, kind = 1) => stampList.push({ x, y: y ?? (profileY(x) ?? GY) - 46, kind });
  // The sneak: along the way, on the rocks, by his seat.
  for (const x of [400, 700, 820, 1120, 1240, 1520, 1600, 1900, 2000, 2280]) addStamp(x);
  addStamp(960, GY - 170); addStamp(2120, GY - 170); // on the cover rocks
  // The getaway: along the path, over holes, on rock tops, under branches, on stones.
  for (const x of [3100, 3250, 3820, 4250, 4560, 5400, 6250, 6700, 7000, 7480, 7900, 8300, 8700, 9350, 9900, 10320, 10600, 10800, 11600, 12300, 13000, 13330, 14000, 14700, 15000]) addStamp(x);
  for (const x of [3380, 4350, 6050, 11150, 15100]) addStamp(x, profileY(x) - 160); // on the rock tops
  addStamp(3820, GY - 110); addStamp(7700, 840 - 120); // higher: a hop for them
  const pickups = kit.makePickups(stampList, { radius: 72 });
  pickups.items.forEach((p, i) => { p.kind = 1 + (i % 4); p.fly = null; p.eaten = false; });

  // ---------- the Trollusk ----------
  const p = kit.makeBody({ x: START_X, y: GY, w: 80, h: 185 });
  const tc = art.makeCreature('trollusk', p.x, p.y);
  tc.sizeK = 1;
  let stamina = 1, winded = 0, sprinting = false;
  let sliding = false, slideDir = 1;
  let dazed = 0, dazedKind = ''; // 'bump' | 'fall' | 'soaked' | 'flung' | 'shooed'
  let protect = 0; // no new tug for a moment
  let airT = 0, landT = 0, snatchT = 0, slideT = 0;
  let lastGroundX = START_X;

  // ---------- the Yalapappus ----------
  const y = kit.makeBody({ x: YAL_X, y: GY, w: 110, h: 230 });
  const yc = art.makeCreature('yalapappus', y.x, y.y);
  yc.sizeK = 1.02;
  yc.facing = 1;
  let look = 'munch'; // the sneak: munch -> warn -> look -> munch; alarm after a catch
  let lookT = 0, nextLook = 2.4 + env.rng() * 1.2, alarmT = 0, munchT = 0;
  let yState = 'sit'; // the getaway: surprised -> chase (tug, dazed, gloat)
  let yT = 0, rolling = false, rollT = 0, wading = false;
  let tug = null; // { v: 0..1 (1 = he has you), t, lastP, lastY, mash }
  let caught = false; // ever grabbed in the getaway: the feat
  let hopT = 0;

  // ---------- the rest ----------
  const cam = kit.makeCamera(WORLD_W, { lead: 170, anchor: 0.48, rate: 3.4 });
  cam.follow(p.x, 0, 0, true);
  const parts = kit.makeParticles();
  const cps = kit.makeCheckpoints([START_X, ...SIGNS]);
  const hints = kit.makeHints([
    { x: 0, text: 'Tiptoe up behind him. Hold Down behind a fern to hide.', show: 5 },
    { x: 3150, text: 'Hop the rocks and holes: Action', show: 4 },
    { x: 7250, text: 'Low branch! Hold Down while running: slide under', show: 4 },
    { x: 8050, text: 'Downhill he rolls! Sprint!', show: 3 },
    { x: 9480, text: 'Hop the stepping stones', show: 3.5 },
    { x: 14000, text: 'The open ground! Nearly away!', show: 3.5 },
  ]);
  let warnedOnce = false;
  let phase = 'sneak';
  let t = 0, tick = 0;
  let endT = 0;
  const total = kit.boardTime(env, ENTRY.time);

  const munchTime = () => {
    const k = 1.25 - 0.5 * skill + (gentle ? 0.25 : 0);
    if (env.rng() < 0.25 * skill) return (0.9 + env.rng() * 0.5) * k; // a crafty second look
    return (2.0 + env.rng() * 2.4) * k;
  };
  const warnTime = () => (gentle ? 1.0 : 0.7);
  const lookTime = () => (0.9 + env.rng() * 0.6 + skill * 0.3) * (gentle ? 0.85 : 1);

  const coverAt = (x) => COVER.find((c) => Math.abs(x - c.x) < c.rx) || null;
  const speed = () => Math.abs(p.vx);
  const inCover = () => phase === 'sneak' && coverAt(p.x);
  // Hidden: ducked (holding Down, or still) behind cover, on the ground, not scurrying.
  let ducked = false;
  const hidden = () => !!inCover() && ducked && p.onGround && !sprinting;
  const frozen = () => speed() < 40 && p.onGround;

  function spill(n, forward = 1) {
    const got = pickups.items.filter((s) => s.got && !s.eaten);
    if (!got.length) return 0;
    let k = 0;
    for (let i = got.length - 1; i >= 0 && k < n; i--, k++) {
      const s = got[i];
      s.got = false; s.t = 0;
      // Out of reach until it lands (a flying stamp sits off the board).
      s.x = -1e5;
      s.fly = { x: p.x, y: p.y - 120, vx: forward * (-80 + env.rng() * 420) * (env.rng() < 0.35 ? -0.6 : 1), vy: -(260 + env.rng() * 260), t: 0 };
    }
    if (k) { env.sfx('pop'); parts.pop(p.x, p.y - 230, k === 1 ? 'A stamp!' : `${k} stamps!`, { colour: '#b3402e', size: 40 }); }
    return k;
  }

  function daze(kind, secs) {
    dazed = secs; dazedKind = kind;
    sliding = false; p.h = 185;
    sprinting = false;
  }

  function startLook() { look = 'warn'; lookT = 0; env.sfx('eye'); if (!warnedOnce) { warnedOnce = true; hints.say('His ears pricked up: FREEZE!', 2.5); } }

  function shooed() {
    // Caught moving in the open: he shouts, you scuttle back to the last cover.
    look = 'alarm'; alarmT = 1.8; lookT = 0;
    env.sfx('caught'); env.sfx('thump'); env.vibrate(90);
    parts.pop(y.x - 60, y.y - 300, 'OI! I SEE YOU!', { colour: '#b3402e', size: 46, life: 1.3 });
    art.kick(yc, -0.6);
    cam.shake(10, env.reduceMotion);
    const back = [...COVER].reverse().find((c) => c.x + c.rx < p.x - 20);
    p.x = back ? back.x : START_X; p.y = GY; p.vx = 0; p.vy = 0;
    daze('shooed', 0.8);
    spill(1, -1);
    hints.say('Shooed! Freeze when he looks, or hide.', 2.5);
  }

  function snatch() {
    phase = 'getaway';
    look = 'munch';
    yState = 'surprised'; yT = 0;
    y.vx = 0;
    snatchT = 0.5;
    protect = 1.8;
    env.sfx('snatch'); env.sfx('gabble'); env.vibrate(100);
    cam.shake(8, env.reduceMotion);
    parts.pop(p.x + 40, p.y - 290, 'SNATCH!', { colour: '#b3402e', size: 64, life: 1.4 });
    art.kick(tc, -0.6); art.kick(yc, 0.5);
    hints.say('RUN! Action to hop, Down to slide!', 4);
  }

  function beginTug() {
    tug = { v: gentle ? 0.38 : 0.5, t: 0, lastP: -1, lastY: -1, mash: 0 };
    caught = true;
    yState = 'tug'; y.vx = 0; rolling = false;
    p.vx = 0; sliding = false; p.h = 185; sprinting = false;
    env.sfx('snap'); env.vibrate(70);
    cam.shake(8, env.reduceMotion);
    art.kick(tc, 0.5);
    parts.pop((p.x + y.x) / 2, p.y - 300, 'GOT YOU!', { colour: '#8e4f8a', size: 48 });
  }

  function endTug(won) {
    tug = null;
    protect = 2.6;
    if (won) {
      yState = 'dazed'; yT = 0;
      env.sfx('free'); env.vibrate(90);
      parts.pop(p.x, p.y - 260, 'Wriggled free!', { colour: '#33241a', size: 44 });
      art.kick(tc, -0.5);
      p.vx = 420;
    } else {
      yState = 'gloat'; yT = 0;
      env.sfx('thump'); env.sfx('aww'); env.vibrate(120);
      parts.pop(p.x + 60, p.y - 260, 'Flung!', { colour: '#b3402e', size: 48 });
      p.x += 150; p.vx = 160;
      daze('flung', 1.3);
      spill(4, 1);
      cam.shake(12, env.reduceMotion);
    }
  }

  // ---------- the sneak: his looks ----------
  function updateLook(dt) {
    lookT += dt;
    if (look === 'munch') {
      yc.facing = 1;
      // A scurrying Trollusk makes a noise: he looks round sooner.
      if (sprinting && y.x - p.x < 1000) { nextLook -= dt * 1.4; if (env.rng() < dt * 2) parts.pop(y.x, y.y - 290, '?', { size: 44, life: 0.8 }); }
      if (lookT >= nextLook) startLook();
      munchT -= dt;
      if (munchT <= 0) { munchT = 0.6 + env.rng() * 0.5; env.sfx('munch'); }
    } else if (look === 'warn') {
      if (lookT >= warnTime()) { look = 'look'; lookT = 0; yc.facing = -1; nextLook = lookTime(); }
    } else if (look === 'look') {
      yc.facing = -1;
      const moving = !frozen() && !hidden();
      if (moving && lookT > 0.12) shooed();
      else if (lookT >= nextLook) { look = 'munch'; lookT = 0; nextLook = munchTime(); yc.facing = 1; }
    } else if (look === 'alarm') {
      yc.facing = -1;
      alarmT -= dt;
      if (alarmT <= 0) { look = 'munch'; lookT = 0; nextLook = munchTime() + 0.8; yc.facing = 1; }
    }
  }

  // ---------- the getaway: his chase ----------
  function updateChase(dt) {
    yT += dt;
    hopT = Math.max(0, hopT - dt);
    const gap = p.x - y.x;
    let want = 0;
    if (yState === 'surprised') {
      if (yT > 1.1) { yState = 'chase'; yT = 0; env.sfx('bark'); parts.pop(y.x, y.y - 300, 'GRIMM!', { colour: '#8e4f8a', size: 48 }); }
    } else if (yState === 'dazed') {
      if (yT > 2.2) { yState = 'chase'; yT = 0; }
    } else if (yState === 'gloat') {
      if (yT > 1.4) { yState = 'chase'; yT = 0; }
    } else if (yState === 'chase') {
      const base = 365 * (gentle ? 0.88 : 1);
      const band = clamp(1 + (gap - 550) / 1200, 0.8, 1.35);
      const here = profileY(y.x + 20), ahead = profileY(y.x + 80);
      const downhill = here !== null && ahead !== null && ahead > here + 2;
      const uphill = here !== null && ahead !== null && ahead < here - 2;
      wading = y.x > STREAM.x0 - 20 && y.x < STREAM.x1 + 20;
      // Rolling: downhill, or far behind and on the flat to catch up.
      const wantRoll = y.onGround && !wading && (downhill || (gap > 1000 && !uphill));
      if (wantRoll && !rolling) { rolling = true; rollT = 0; env.sfx('whoosh'); }
      if (!wantRoll && rolling && rollT > 0.6) { rolling = false; art.kick(yc, 0.5); env.sfx('thump'); }
      rollT += dt;
      want = base * band * (rolling ? 1.5 : 1) * (uphill ? 0.72 : 1) * (wading ? 0.42 : 1);
      // Past him (he was flung clear, or fell back): turn round; and while he
      // is still picking himself up, wait for him rather than run on.
      if (gap < -60) { want = -base * 0.8; rolling = false; }
      else if (protect > 0 && gap < 140) want = 0;
      if (rolling && Math.random() < dt * 14) parts.burst(y.x - 40, y.y - 10, { n: 2, colour: '#e3cf9a', speed: 160, size: 16, life: 0.5, up: 0.4 });
      // Hop a hole ahead (whichever way he is going), or hop up a lip.
      const dir = want < 0 ? -1 : 1;
      const hole = HOLES.find((h) => { const e = dir > 0 ? h.x0 - (y.x + 55) : (y.x - 55) - h.x1; return e > -10 && e < 70; });
      if (y.onGround && hole && hopT <= 0) { y.vy = -1060; y.vx = dir * Math.max(Math.abs(y.vx), 560); hopT = 0.8; env.sfx('jump'); art.kick(yc, -0.5); }
      if (y.onGround && y.hitWall && hopT <= 0) { y.vy = -720; hopT = 0.6; }
      // He munches any stamp lying in his way.
      for (const s of pickups.items) {
        if (s.got || s.eaten || s.fly || Math.abs(s.x - y.x) > 60 || Math.abs(s.y - (y.y - 60)) > 120) continue;
        s.eaten = true; s.x = -1e5;
        env.sfx('munch');
        parts.pop(y.x, y.y - 280, 'Munch!', { colour: '#8e4f8a', size: 40 });
      }
    }
    y.vx = kit.approach(y.vx, want, (y.onGround ? 1400 : 500) * dt);
    const ev = kit.stepBody(y, ySolids, dt, { gravity: 3000 });
    if (ev.landed > 500) { art.kick(yc, 0.6); env.sfx('land'); if (!env.reduceMotion) cam.shake(5); parts.burst(y.x, y.y, { n: 6, colour: '#e3cf9a', speed: 200, size: 14 }); }
    // Hole safety: if he ever lands in one he clambers out the far side.
    if (y.ground?.kind === 'pit') { const h = HOLES.find((h) => y.x > h.x0 - 60 && y.x < h.x1 + 60); if (h) { y.x = y.vx < 0 ? h.x0 - 70 : h.x1 + 70; y.y = GY; y.vy = 0; } }
    y.x = clamp(y.x, 0, WORLD_W - 100);
    // The catch.
    if (yState === 'chase' && !tug && protect <= 0 && p.onGround && Math.abs(p.x - y.x) < 105 && Math.abs(p.y - y.y) < 150) beginTug();
  }

  function updateTug(dt, inp) {
    tug.t += dt;
    let pull = 0;
    if (inp.actionPressed && tug.t - tug.lastP >= 0.12) { tug.lastP = tug.t; pull -= 0.075 * (0.35 + 0.9 * stamina) * (gentle ? 1.15 : 1); env.sfx('tug'); }
    if ((inp.x || 0) > 0.5) pull -= 0.12 * dt * (0.5 + stamina);
    tug.mash += dt * (3 + 2.5 * skill) * (gentle ? 0.6 : 1);
    if (tug.mash >= 1) { tug.mash -= 1; pull += 0.05; }
    // A stalled tug slides toward whoever is ahead, faster the longer it goes.
    if (tug.t > 2.5) pull += Math.sign(tug.v - 0.5 || 1) * (0.1 + (tug.t - 2.5) * 0.1) * dt;
    tug.v = clamp(tug.v + pull, 0, 1);
    stamina = Math.max(0, stamina - 0.04 * dt);
    if (tug.v <= 0) endTug(true);
    else if (tug.v >= 1) endTug(false);
  }

  // ---------- the Trollusk ----------
  function updatePlayer(dt, inp) {
    const sneak = phase === 'sneak';
    winded = Math.max(0, winded - dt);
    protect = Math.max(0, protect - dt);
    ducked = (inp.y || 0) > 0.5 || (speed() < 40 && !!inCover());
    if (dazed > 0) {
      dazed -= dt;
      sprinting = false;
      p.vx *= Math.exp(-6 * dt);
      kit.stepBody(p, solids, dt, { gravity: GRAVITY });
      return;
    }
    const wantSprint = !!inp.sprint && Math.abs(inp.x || 0) > 0.2 && winded <= 0 && stamina > 0 && !sliding;
    sprinting = wantSprint && p.onGround;
    if (sprinting) {
      stamina -= (sneak ? 0.35 : 0.42) * dt * (gentle ? 0.7 : 1);
      if (stamina <= 0) { stamina = 0; winded = 1.5; sprinting = false; env.sfx('pant'); parts.pop(p.x, p.y - 240, 'Puffed!', { size: 36 }); }
    } else stamina = Math.min(1, stamina + (speed() < 40 ? 0.34 : 0.2) * dt);

    if (sneak) {
      const duckWalk = ducked && !!inCover() && !sprinting;
      const par = { speed: duckWalk ? 150 : 200, sprint: 330, accel: 2400, decel: 3200, airAccel: 1200, jump: 650, coyote: 0.08, buffer: 0.1 };
      if (winded > 0) { par.speed *= 0.6; par.sprint = par.speed; }
      const near = Math.abs(y.x - p.x) < 175 && p.onGround && look !== 'look' && look !== 'alarm';
      if (inp.actionPressed && near) { snatch(); inp = { ...inp, actionPressed: false, action: false }; }
      kit.walkerControl(p, { ...inp, sprint: sprinting }, dt, par);
    } else {
      // Belly-slide: Down while running.
      const under = underLow(p.x);
      if (!sliding && p.onGround && (inp.y || 0) > 0.5 && speed() > 230) {
        sliding = true; slideDir = Math.sign(p.vx) || 1; slideT = 0;
        p.vx = slideDir * Math.max(speed(), 390); p.h = 85;
        env.sfx('swoosh'); parts.burst(p.x, p.y, { n: 6, colour: '#e3cf9a', speed: 180, size: 12 });
      }
      if (sliding) {
        slideT += dt;
        p.vx -= slideDir * 160 * dt;
        if (under && slideDir * p.vx < 230) p.vx = slideDir * 230; // scrabble on out
        const wantUp = (inp.y || 0) <= 0.5 && slideT > 0.25;
        if (!under && (wantUp || slideDir * p.vx < 120)) { sliding = false; p.h = 185; art.kick(tc, 0.3); }
      } else {
        const par = { speed: 325, sprint: 455, accel: 2600, decel: 2800, airAccel: 1400, jump: 970, jumpCut: 0.5, coyote: 0.1, buffer: 0.12 };
        if (winded > 0) { par.speed *= 0.62; par.sprint = par.speed; }
        const pud = p.onGround && puddles.find((q) => p.x > q.x && p.x < q.x1);
        if (pud) { par.speed *= 0.42; par.sprint = par.speed; par.jump = 760; if (Math.random() < dt * 10) parts.burst(p.x, p.y, { n: 1, colour: '#4fb3c0', speed: 120, size: 10, life: 0.5 }); if (Math.random() < dt * 3) env.sfx('drip'); }
        const ev = kit.walkerControl(p, { ...inp, sprint: sprinting }, dt, par);
        if (ev.jumped) { env.sfx('jump'); art.kick(tc, -0.5); parts.burst(p.x, p.y, { n: 5, colour: '#e3cf9a', speed: 160, size: 11 }); }
      }
    }
    const wasAir = !p.onGround;
    const vxBefore = p.vx;
    const ev = kit.stepBody(p, solids, dt, { gravity: GRAVITY });
    // Walking down a slope: stay on it rather than hopping off each step.
    if (p.wasOnGround && !p.onGround && p.vy >= 0 && !p.jumping) {
      const gy = kit.groundAt(solids, p.x, p.y - 2);
      if (gy !== null && gy - p.y < 24) { p.y = gy; p.vy = 0; p.onGround = true; }
    }
    if (p.onGround) { airT = 0; if (profileY(p.x) !== null) lastGroundX = p.x; } else airT += dt;
    if (ev.landed > 400) { landT = 0.12; art.kick(tc, 0.35 + Math.min(0.5, ev.landed / 3000)); env.sfx('land'); parts.burst(p.x, p.y, { n: 6, colour: '#e3cf9a', speed: 180, size: 12 }); }
    else if (wasAir && p.onGround && ev.landed) landT = 0.06;
    landT = Math.max(0, landT - dt);
    if (sprinting && p.onGround && Math.random() < dt * 9) parts.burst(p.x - 30 * Math.sign(p.vx || 1), p.y, { n: 1, colour: '#e3cf9a', speed: 100, size: 9, life: 0.4 });
    // A bump: ran into a rock, a branch or a palm trunk while up.
    if (!sneak && ev.bumped && Math.abs(vxBefore) > 200) {
      const what = solids.find((s) => s.kind !== 'ground' && s.kind !== 'slope' && Math.abs((s.x + s.w / 2) - p.x) < s.w / 2 + 70 && p.y > s.y && p.y - p.h < s.y + s.h);
      bump(what);
    }
    // Hole or stream.
    const seg = PROFILE.find((s) => p.x >= s.x0 && p.x < s.x1);
    if (seg?.hole && p.y > GY + 70) fell(seg);
    if (seg?.stream && p.y > GY + 40) soaked(seg);
    // Never lost below the world: back onto the last ground stood on.
    if (p.y > H + 120) { p.x = lastGroundX; p.y = profileY(p.x) ?? GY; p.vx = 0; p.vy = 0; daze('fall', 0.6); }
    p.x = clamp(p.x, 40, WORLD_W - 60);
  }

  function bump(what) {
    env.sfx('bonk'); env.vibrate(60);
    cam.shake(7, env.reduceMotion);
    p.vx = -200; p.vy = -260; p.onGround = false;
    art.kick(tc, 0.6);
    parts.pop(p.x, p.y - 250, 'Bump!', { colour: '#b3402e', size: 44 });
    daze('bump', 0.5);
    spill(2, 1);
    if (what && (what.kind === 'branch' || what.kind === 'palm')) hints.say('Hold Down while running to slide under!', 2.2);
  }

  function fell(seg) {
    env.sfx('thump'); env.vibrate(80);
    parts.pop(seg.x0, GY - 120, 'Oops!', { colour: '#b3402e', size: 44 });
    // Back out at the edge with room for a run-up.
    p.x = seg.x0 - 150; p.y = profileY(p.x) ?? GY; p.vx = 0; p.vy = 0;
    daze('fall', 0.75);
    spill(2, 1);
  }

  function soaked(seg) {
    env.sfx('splash'); env.vibrate(60);
    parts.burst(p.x, GY + 40, { n: 14, colour: '#8fd0e8', speed: 300, size: 12, life: 0.7 });
    parts.pop(p.x, GY - 120, 'SPLASH!', { colour: '#2a6f9a', size: 44 });
    p.x = seg.x0 - 150; p.y = GY; p.vx = 0; p.vy = 0;
    daze('soaked', 0.9);
    spill(2, 1);
  }

  // ---------- the flying stamps ----------
  function updateStamps(dt) {
    for (const s of pickups.items) {
      if (!s.fly) continue;
      const f = s.fly;
      f.vy += 1100 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.t += dt;
      const gy = profileY(f.x);
      const floor = (gy ?? (STREAM.x0 <= f.x && f.x < STREAM.x1 ? 985 : 1010)) - 44;
      if ((f.vy > 0 && f.y >= floor) || f.t > 3) { s.x = f.x; s.y = floor; s.fly = null; }
    }
    const got = pickups.update(dt, p.x, p.y - 90, dazed > 0 ? 50 : 72);
    if (got) { env.sfx('pickup'); art.kick(tc, -0.15); parts.pop(p.x, p.y - 230, got > 1 ? `+${got}` : '+1', { colour: '#2f6a2a', size: 36, life: 0.7 }); }
  }

  // ---------- animation ----------
  function animPlayer(dt) {
    tc.x = p.x;
    const gy = kit.groundAt(solids, p.x, p.y - 2);
    tc.y = p.onGround || gy === null ? p.y : Math.min(gy, p.y + 400);
    tc.z = tc.y - p.y;
    art.animate(tc, dt, p.vx, 0);
    if (speed() > 20) tc.facing = Math.sign(p.vx);
    if (self.done) { art.setAnim(tc, self.outcome === 'snatched' ? 'celebrate' : 'wail'); return; }
    if (tug) art.setAnim(tc, 'jolt');
    else if (dazed > 0) art.setAnim(tc, dazedKind === 'soaked' ? 'soaked' : dazedKind === 'shooed' ? 'scuttle' : dazedKind === 'bump' ? 'jolt' : 'tumble');
    else if (snatchT > 0) art.setAnim(tc, 'grab');
    else if (sliding) art.setAnim(tc, 'slide');
    else if (!p.onGround && airT > 0.08) art.setAnim(tc, p.vy < 0 ? 'jump' : 'fall');
    else if (landT > 0) art.setAnim(tc, 'landSquash');
    else if (phase === 'sneak') {
      if (inCover() && ducked) art.setAnim(tc, speed() > 40 ? 'crouch' : 'duck');
      else if (speed() < 40) art.setAnim(tc, look === 'look' || look === 'warn' ? 'freeze' : 'idle');
      else if (sprinting) art.setAnim(tc, 'scuttle');
      else art.setAnim(tc, 'sneak');
    } else if (speed() < 40) art.setAnim(tc, 'idle');
    else if (sprinting) art.setAnim(tc, 'scuttle');
    else art.setAnim(tc, 'run');
  }

  function animYal(dt) {
    yc.x = y.x;
    const gy = kit.groundAt(ySolids, y.x, y.y - 2);
    yc.y = y.onGround || gy === null ? y.y : Math.min(gy, y.y + 400);
    yc.z = yc.y - y.y;
    art.animate(yc, dt, phase === 'sneak' ? 0 : y.vx, 0);
    if (phase === 'sneak') yc.facing = look === 'munch' ? 1 : -1; else if (Math.abs(y.vx) > 20) yc.facing = Math.sign(y.vx);
    if (self.done) { art.setAnim(yc, self.outcome === 'snatched' ? 'wail' : 'celebrate'); return; }
    if (phase === 'sneak') {
      art.setAnim(yc, look === 'munch' ? 'munch' : look === 'warn' ? 'idle' : look === 'look' ? 'eye' : 'shout');
      return;
    }
    if (tug) art.setAnim(yc, 'shout');
    else if (yState === 'surprised') art.setAnim(yc, 'bonked');
    else if (yState === 'dazed') art.setAnim(yc, 'dizzy');
    else if (yState === 'gloat') art.setAnim(yc, 'celebrate');
    else if (rolling) { art.setAnim(yc, 'ball'); yc.z += 85; }
    else if (!y.onGround) art.setAnim(yc, y.vy < 0 ? 'hop' : 'land');
    else if (wading) art.setAnim(yc, 'trundle');
    else art.setAnim(yc, 'shout');
  }

  // ---------- the board ----------
  const self = {
    time: total,
    done: false,
    outcome: null,
    outroTime: 2.2,
    get phase() { return phase; },
    get look() { return look; },
    get caught() { return caught; },
    _: {
      player: p, yal: y, pickups, hazards, stones, solids, cover: COVER, coverAt,
      get phase() { return phase; }, get look() { return look; }, get yState() { return yState; }, get tug() { return tug; },
      get dazed() { return dazed; }, get sliding() { return sliding; }, get stamina() { return stamina; }, get tick() { return tick; },
      get caught() { return caught; }, get rolling() { return rolling; },
      timeToLook: () => (look === 'munch' ? nextLook - lookT : 0),
      // For tests: force a state.
      set(fields) {
        if ('look' in fields) { look = fields.look; lookT = 0; }
        if ('nextLook' in fields) nextLook = fields.nextLook;
        if ('phase' in fields) phase = fields.phase;
        if ('yState' in fields) { yState = fields.yState; yT = 0; }
        if ('caught' in fields) caught = fields.caught;
        if ('protect' in fields) protect = fields.protect;
        if ('tugV' in fields && tug) tug.v = fields.tugV;
      },
      beginTug, spill,
    },
    FINISH_X, WORLD_W,
    focus: () => [{ x: p.x - cam.x, y: p.y - 100 }],
    hud() {
      const n = `Stamps ${pickups.count}/${pickups.total}`;
      if (phase !== 'getaway' || self.done) return n;
      const m = Math.max(0, Math.round((p.x - y.x) / PX_PER_M));
      return `${n} · ${m} m clear`;
    },
    marks: () => kit.boardMarks({ snatched: self.outcome === 'snatched', got: pickups.count, total: pickups.total, feat: self.outcome === 'snatched' && !caught }),
    update(dt, inS) {
      t += dt; tick++;
      const inp = inS || {};
      parts.update(dt);
      hints.update(dt, p.x);
      snatchT = Math.max(0, snatchT - dt);
      if (self.done) {
        endT += dt;
        if (self.outcome === 'snatched') { p.vx = 380; p.x += p.vx * dt; p.y = profileY(p.x) ?? GY; y.vx *= Math.exp(-3 * dt); y.x += y.vx * dt; }
        else { p.vx = 0; y.vx = 0; }
        cam.follow(p.x, p.vx, dt);
        animPlayer(dt); animYal(dt);
        return;
      }
      self.time = Math.max(0, self.time - dt);
      if (tug) {
        updateTug(dt, inp);
        kit.stepBody(p, solids, dt, { gravity: GRAVITY });
      } else updatePlayer(dt, inp);
      if (phase === 'sneak') updateLook(dt); else updateChase(dt);
      updateStamps(dt);
      if (cps.reach(p.x) !== cps.prev) { if (cps.prev !== undefined) env.sfx('checkpoint'); cps.prev = cps.last; }
      // Away!
      if (phase === 'getaway' && !tug && p.x >= FINISH_X) {
        self.done = true; self.outcome = 'snatched';
        env.sfx('cheer');
        parts.pop(p.x, p.y - 280, caught ? 'Away!' : 'Clean away!', { colour: '#2f6a2a', size: 56, life: 1.6 });
      } else if (self.time <= 0) {
        self.done = true; self.outcome = 'kept';
        tug = null;
        env.sfx('aww');
      }
      cam.follow(p.x, phase === 'sneak' ? p.vx * 0.5 : Math.max(p.vx, 80), dt);
      animPlayer(dt); animYal(dt);
    },
    draw(g, tt) {
      kit.drawBackdrop(g, cam, { panels: ['adv/b07/backdrop-1', 'adv/b07/backdrop-2', 'adv/b07/backdrop-3'], standin: 'scenes/yalapappus' });
      kit.haze(g, 'rgba(243,233,210,0.12)');
      drawFarDecor(g);
      cam.begin(g);
      drawGroundAll(g);
      drawHoles(g);
      drawStream(g, tt);
      for (const d of DECOR) if (cam.sees(d.x)) drawDecor(g, d);
      for (const r of rocks) if (cam.sees(r.x, r.x + r.w)) drawRock(g, r);
      for (const x of SIGNS) if (cam.sees(x)) drawSignpost(g, x, profileY(x) ?? GY, tt);
      if (cam.sees(FINISH_X)) drawFinishSign(g, FINISH_X + 120, GY, tt);
      for (const q of puddles) if (cam.sees(q.x, q.x1)) drawPuddle(g, q, tt);
      if (cam.sees(YAL_X)) drawScrapPile(g, YAL_X + 120, GY);
      // Stamps.
      pickups.draw(g, cam, tt, (gg, s, x, yy, a) => {
        if (s.eaten) return;
        gg.save(); gg.globalAlpha = a;
        kit.sprite(gg, 'adv.b07.props', s.kind <= 2 ? s.kind : 1, x, yy + 22, { height: 46, rot: Math.sin(tt * 3 + s.seed) * 0.25 }, () => art.drawSprite(gg, art.prop('trollusk', s.kind), x, yy + 22, { height: 46, rot: Math.sin(tt * 3 + s.seed) * 0.25 }));
        gg.restore();
      });
      for (const s of pickups.items) {
        if (!s.fly) continue;
        kit.sprite(g, 'adv.b07.props', s.kind <= 2 ? s.kind : 1, s.fly.x, s.fly.y + 22, { height: 46, rot: s.fly.t * 9 }, () => art.drawSprite(g, art.prop('trollusk', s.kind), s.fly.x, s.fly.y + 22, { height: 46, rot: s.fly.t * 9 }));
      }
      // Creatures, and the cover that hides the Trollusk.
      const yFirst = y.x < p.x;
      if (!yFirst) drawPlayer(g, tt);
      drawYal(g, tt);
      if (yFirst) drawPlayer(g, tt);
      for (const c of COVER) if (cam.sees(c.x)) drawCover(g, c, tt);
      if (!art.sprite('adv.b07.props', 10) && cam.sees(STREAM.x0, STREAM.x1)) drawWaterFront(g, tt);
      for (const b of branches) if (cam.sees(b.x, b.x + b.w)) drawBranch(g, b, tt);
      for (const b of palms) if (cam.sees(b.x, b.x + b.w)) drawFallenPalm(g, b);
      // Who has the letter, and what to press.
      if (!self.done || self.outcome === 'snatched') {
        if (phase === 'getaway') letterTag(g, p.x + tc.facing * 30, p.y - 262 - tc.z, { t: tt, r: 40 });
        else letterTag(g, y.x + yc.facing * 70, y.y - 310, { t: tt });
      }
      if (!self.done && phase === 'sneak') {
        if (t < 6 && !hidden()) marker(g, y.x + 60, y.y - 360, { t: tt, label: 'The letter!' });
        const near = Math.abs(y.x - p.x) < 175 && look !== 'look' && look !== 'alarm' && dazed <= 0;
        if (near) actionPrompt(g, p.x, p.y - 265, 'Snatch!', { kind: env.inputKind, t: tt, pulse: 1 });
      }
      if (tug) actionPrompt(g, p.x, p.y - 265, 'Mash!', { kind: env.inputKind, t: tt, pulse: 1 });
      if (phase === 'sneak' && look === 'warn') eyeBubble(g, y.x - 90, y.y - 280, lookT / warnTime(), tt);
      if (phase === 'sneak' && look === 'look') eyeOpen(g, y.x - 90, y.y - 280, tt);
      if (tug) tugBar(g, { tug }, (p.x + y.x) / 2, Math.min(p.y, y.y) - 360, ['Grimm!', 'Break free!']);
      parts.draw(g);
      cam.end(g);
      drawNearDecor(g);
      // Screen overlays.
      const letterX = phase === 'getaway' ? p.x : y.x;
      const m = Math.max(0, Math.round((p.x - y.x) / PX_PER_M));
      kit.route(g, { you: p.x / WORLD_W, letter: letterX / WORLD_W, signs: cps.fracs(WORLD_W) });
      if (!self.done) routeLabel(g, phase === 'sneak' ? 'Just passing by…' : `${m} m ahead`);
      if (!self.done) hints.draw(g);
    },
  };
  cps.prev = cps.last;

  // ---------- drawing ----------
  function drawPlayer(g, tt) {
    const cov = inCover();
    if (phase === 'getaway' && !self.done) staminaRing(g, { st: stamina, winded }, p.x, p.y, 40, '#f2c53d');
    if (cov && ducked && hidden()) g.globalAlpha = 0.92;
    art.drawCreature(g, tc, tt, { reduceMotion: env.reduceMotion });
    g.globalAlpha = 1;
  }
  function drawYal(g, tt) {
    if (!cam.sees(y.x)) return;
    if (phase === 'getaway' && rolling && !self.done) {
      kit.sprite(g, 'adv.b07.props', 12, y.x - 110, y.y - 30, { height: 120, alpha: 0.8 }, dustCloud);
    }
    art.drawCreature(g, yc, tt, { reduceMotion: env.reduceMotion });
    if (phase === 'sneak' && look === 'alarm' && !self.done) {
      // A shaking fist: the pop says it.
    }
  }

  // terrain.nowhere 1 is 1400 x 125: grass tufts in rows 10-48, the walkable
  // earth edge at row 48, earth to row 121. Items 2 and 3 are the slopes
  // (1399 x 201): the rising one's top edge runs from row 144 at the left to
  // row 25 at the right; the falling one's from row 21 to row 164.
  const STRIP = { edge: 48, bottom: 121, earth0: 64, earth1: 118 };
  const SLOPE = { 2: { l: 144, r: 25 }, 3: { l: 21, r: 164 } };

  // Earth under a piece of ground: rows of the strip's earth tiled down from
  // yTop(x) to the bottom of the screen, darker the deeper.
  function earthFill(g, x0, x1, yTop) {
    const sp = art.sprite('terrain.nowhere', 1);
    const a = Math.max(x0, cam.x - 40), b = Math.min(x1, cam.x + W + 40);
    if (b <= a) return;
    const bottom = H + 60;
    g.save();
    g.beginPath();
    g.moveTo(a, bottom);
    for (let x = a; x <= b; x += 30) g.lineTo(Math.min(x, b), yTop(Math.min(x, b)));
    g.lineTo(b, yTop(b)); g.lineTo(b, bottom); g.closePath();
    g.clip();
    if (sp) {
      const rh = STRIP.earth1 - STRIP.earth0;
      const yStart = Math.min(yTop(a), yTop(b)) - 10;
      for (let x = Math.floor(a / sp.w) * sp.w; x < b; x += sp.w) {
        for (let y = yStart; y < bottom; y += rh) g.drawImage(sp.img, 0, STRIP.earth0, sp.w, rh, x, y, sp.w, rh + 1);
      }
    } else { g.fillStyle = '#b08a42'; g.fillRect(a, 0, b - a, bottom); }
    const gr = g.createLinearGradient(0, GY, 0, bottom);
    gr.addColorStop(0, 'rgba(60,35,15,0.05)'); gr.addColorStop(1, 'rgba(40,22,8,0.45)');
    g.fillStyle = gr;
    g.fillRect(a, 0, b - a, bottom);
    g.restore();
  }

  function drawGroundAll(g) {
    const have = !!art.sprite('terrain.nowhere', 1);
    if (!have) { inkProfile(g, cam); return; }
    for (const seg of PROFILE) {
      if (seg.hole || seg.stream || !cam.sees(seg.x0, seg.x1)) continue;
      const yAt = (x) => (seg.y1 === undefined ? seg.y : seg.y + (seg.y1 - seg.y) * ((x - seg.x0) / (seg.x1 - seg.x0)));
      earthFill(g, seg.x0, seg.x1, (x) => yAt(x) + 40);
      if (seg.y1 === undefined) {
        const sol = { x: seg.x0, y: seg.y, w: seg.x1 - seg.x0, h: 400 };
        kit.drawGround(g, cam, sol, { sheet: 'terrain.nowhere', item: 1, height: 125, lift: STRIP.edge });
      } else {
        const up = seg.y1 < seg.y;
        const item = up ? 2 : 3;
        const sp = art.sprite('terrain.nowhere', item);
        const m = SLOPE[item];
        const sx = (seg.x1 - seg.x0) / sp.w;
        const sy = Math.abs(seg.y1 - seg.y) / Math.abs(m.r - m.l);
        g.save();
        g.translate(seg.x0, seg.y - m.l * sy);
        g.scale(sx, sy);
        g.drawImage(sp.img, 0, 0);
        g.restore();
      }
    }
  }

  // terrain.nowhere 4 (465 x 186) is the left bank of a hole: its right side
  // is the hole wall, its earth edge at row 49. Item 5 (472 x 188) is the
  // right bank, wall on its left, earth edge at row 55.
  function drawHoles(g) {
    for (const h of HOLES) {
      if (!cam.sees(h.x0, h.x1)) continue;
      const w = h.x1 - h.x0;
      g.save();
      g.fillStyle = '#3a2616';
      g.fillRect(h.x0 - 4, GY - 2, w + 8, H + 60 - GY);
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2.5;
      g.beginPath();
      for (let x = h.x0; x < h.x1 + 220; x += 14) { g.moveTo(x, GY + 20); g.lineTo(x - 220, GY + 260); }
      g.stroke();
      const gr = g.createLinearGradient(0, GY + 20, 0, GY + 220);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,5,0,0.85)');
      g.fillStyle = gr;
      g.fillRect(h.x0 - 4, GY + 20, w + 8, H - GY);
      g.restore();
      const ok = kit.sprite(g, 'terrain.nowhere', 4, h.x0 + 6, GY - 49, { scale: 1, ax: 1, ay: 0 }, () => art.drawSprite(g, art.prop('yalapappus', 3), h.x0 + 28, GY + 42, { height: 112 }) || inkHoleEdge(g, h.x0, 1));
      kit.sprite(g, 'terrain.nowhere', 5, h.x1 - 6, GY - 55, { scale: 1, ax: 0, ay: 0 }, () => art.drawSprite(g, art.prop('yalapappus', 4), h.x1 - 28, GY + 42, { height: 112 }) || inkHoleEdge(g, h.x1, -1));
      void ok;
    }
  }

  // adv.b07.props 10 (300 x 253) is a stream with stepping stones seen from
  // the bank, grass along its top edge: stretched across the gap with its top
  // edge at the ground line it fills the cut to the bottom of the screen.
  function drawStream(g, tt) {
    const s = STREAM;
    if (!cam.sees(s.x0, s.x1)) return;
    const sp = art.sprite('adv.b07.props', 10);
    if (sp) {
      const k = (s.x1 - s.x0 + 60) / sp.w;
      art.drawSprite(g, sp, (s.x0 + s.x1) / 2, GY - 24, { scale: k, ax: 0.5, ay: 0 });
    } else inkStream(g, s, tt);
    for (const st of stones) {
      // A ring of ripples round each stone, then the stone.
      g.save();
      g.strokeStyle = 'rgba(248,241,224,0.85)'; g.lineWidth = 3;
      for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(st.cx, GY + 62, 70 + i * 22 + Math.sin(tt * 2 + i) * 3, 14 + i * 6, 0, 0, Math.PI * 2); g.stroke(); }
      g.restore();
      kit.sprite(g, 'adv.b07.props', 4, st.cx, GY + 76, { height: 96 }, () => art.drawSprite(g, art.prop('yalapappus', 1), st.cx, GY + 76, { height: 96 }) || inkRock(g, st.cx, GY + 76, 96));
    }
  }
  function inkStream(g, s, tt) {
    g.save();
    const bands = ['#7fb6d8', '#5a98c6', '#3f7bb0', '#2f5f90'];
    bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(s.x0, GY + 50 + i * 70, s.x1 - s.x0, i === 3 ? H + 60 - GY : 72); });
    g.lineWidth = 3; g.lineCap = 'round';
    for (let row = 0; row < 8; row++) {
      const yy = GY + 86 + row * 36;
      g.strokeStyle = row % 2 ? 'rgba(43,29,20,0.7)' : 'rgba(248,241,224,0.85)';
      g.beginPath();
      for (let x = s.x0 + 12 + (row % 2) * 34 + ((tt * (row % 2 ? 18 : -12)) % 70); x < s.x1 - 50; x += 70) {
        g.moveTo(x, yy); g.quadraticCurveTo(x + 12, yy - 12, x + 26, yy); g.quadraticCurveTo(x + 36, yy + 8, x + 30, yy + 12);
      }
      g.stroke();
    }
    g.restore();
  }

  function drawWaterFront(g, tt) {
    const s = STREAM;
    g.fillStyle = 'rgba(78,147,194,0.55)';
    g.fillRect(s.x0, GY + 50, s.x1 - s.x0, 60);
    g.strokeStyle = 'rgba(248,241,224,0.8)';
    g.lineWidth = 3;
    g.beginPath();
    for (let x = s.x0 + 20; x < s.x1 - 20; x += 90) { const yy = GY + 56 + Math.sin(tt * 3 + x) * 4; g.moveTo(x, yy); g.quadraticCurveTo(x + 20, yy - 7, x + 42, yy); }
    g.stroke();
  }

  function drawRock(g, r) {
    kit.sprite(g, 'adv.b07.props', 4, r.cx, r.y + r.h + 8, { height: 130 }, () => art.drawSprite(g, art.prop('yalapappus', 1), r.cx, r.y + r.h + 8, { height: 130 }) || inkRock(g, r.cx, r.y + r.h + 8, 130));
  }

  function drawCover(g, c, tt) {
    const gy = GY;
    const shake = c.shake > 0 ? Math.sin(tt * 60) * 4 : 0;
    if (c.kind === 'fern') kit.sprite(g, 'adv.b07.props', 3, c.x + shake, gy + 6, { height: 215 }, () => art.drawSprite(g, art.prop('grithix', 4), c.x + shake, gy + 6, { height: 215 }) || inkFern(g, c.x, gy));
    else if (c.kind === 'rock') kit.sprite(g, 'adv.b07.props', 4, c.x, gy + 8, { height: 165 }, () => art.drawSprite(g, art.prop('yalapappus', 1), c.x, gy + 8, { height: 165 }) || inkRock(g, c.x, gy + 8, 165));
    else kit.sprite(g, 'adv.b07.props', 11, c.x + shake, gy + 6, { height: 200 }, () => art.drawSprite(g, art.prop('trollusk', 5), c.x + shake, gy + 6, { height: 200 }) || inkBush(g, c.x, gy));
  }

  function drawPuddle(g, q, tt) {
    kit.sprite(g, 'adv.b07.props', 6, q.cx, q.y + 14, { height: 90 }, () => {
      g.save();
      g.strokeStyle = INK;
      g.lineWidth = 3.5;
      // A rim of darker goo, the pool, and a sheen.
      g.fillStyle = '#2d7f8c';
      g.beginPath(); g.ellipse(q.cx, q.y + 2, 118, 24, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#3fa7b5';
      g.beginPath(); g.ellipse(q.cx - 4, q.y - 4, 100, 16, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(43,29,20,0.55)';
      g.beginPath();
      for (let x = q.cx - 90; x < q.cx + 90; x += 14) { g.moveTo(x, q.y + 10 + Math.abs(x - q.cx) * 0.08); g.lineTo(x + 6, q.y + 18); }
      g.stroke();
      g.fillStyle = 'rgba(248,241,224,0.55)';
      g.beginPath(); g.ellipse(q.cx - 34, q.y - 8, 30, 4, 0, 0, Math.PI * 2); g.fill();
      // Bubbles rising and a slow drip-ring.
      g.strokeStyle = INK; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const bt = (tt * 0.5 + q.cx * 0.001 + i * 0.37) % 1;
        const bx = q.cx - 50 + i * 48, by = q.y - 4 - bt * 12;
        g.fillStyle = '#5fc3cf';
        g.beginPath(); g.arc(bx, by, 4 + bt * 6, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.strokeStyle = 'rgba(43,29,20,0.6)';
      const rt = (tt * 0.6 + q.cx * 0.01) % 1;
      g.beginPath(); g.ellipse(q.cx + 30, q.y - 2, 10 + rt * 30, 3 + rt * 7, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    });
  }

  function drawScrapPile(g, x, gy) {
    kit.sprite(g, 'adv.b07.props', 9, x, gy + 6, { height: 90 }, () => {
      const ok = art.drawSprite(g, art.prop('yalapappus', 6), x - 40, gy + 4, { height: 62 });
      art.drawSprite(g, art.prop('yalapappus', 5), x + 30, gy + 2, { height: 50, rot: 0.3 });
      art.drawSprite(g, art.prop('yalapappus', 7), x + 90, gy + 6, { height: 72, flip: true });
      if (!ok) {
        g.save(); g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 3;
        for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(x - 50 + i * 28, gy - 14 - (i % 2) * 10, 24, 14, i * 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
        g.restore();
      }
    });
  }

  function drawDecor(g, d) {
    const gy = profileY(d.x);
    if (gy === null) return;
    g.save();
    g.globalAlpha = 0.88;
    const o = { flip: d.flip };
    if (d.kind === 'fern') art.drawSprite(g, art.prop('grithix', 4), d.x, gy + 4, { height: 150 * d.k + 60, ...o });
    else if (d.kind === 'bush') art.drawSprite(g, art.prop('trollusk', 5), d.x, gy + 4, { height: 150 * d.k + 50, ...o });
    else if (d.kind === 'flowers') art.drawSprite(g, art.prop('trollusk', 6), d.x, gy + 4, { height: 90 * d.k + 30, ...o });
    else art.drawSprite(g, art.prop('yalapappus', 2), d.x, gy + 6, { height: 70 * d.k + 30, ...o });
    g.restore();
  }

  function drawFarDecor(g) {
    // Palms (terrain.nowhere 8) standing on the ground behind the path, a
    // mid layer between the painted backdrop and the play layer.
    for (let i = 0; i < 16; i++) {
      const wx = 500 + i * 1050 + kit.hash(i) * 400;
      if (!cam.sees(wx, wx, 400)) continue;
      const gy = profileY(wx);
      if (gy === null || Math.abs(wx - YAL_X) < 500 || wx > FINISH_X - 300) continue;
      if (lowSolids.some((s) => wx > s.x - 260 && wx < s.x + s.w + 260) || SIGNS.some((x) => Math.abs(x - wx) < 220)) continue;
      const h = 340 + kit.hash(i * 3.1) * 90;
      g.save(); g.globalAlpha = 0.92;
      kit.sprite(g, 'terrain.nowhere', 8, wx, gy + 10, { height: h, flip: i % 2 === 1 }, () => inkPalm(g, wx, gy + 10, h, i));
      g.restore();
    }
  }

  function drawNearDecor(g) {
    // Goo curtains (terrain.nowhere 7) dripping across the top, nearer than the play layer.
    const k = 1.18;
    for (let i = 0; i < 20; i++) {
      const wx = 900 + i * 920 + kit.hash(i * 7.7) * 400;
      const sx = wx - cam.x * k;
      if (sx < -500 || sx > W + 500) continue;
      const h = 150 + kit.hash(i * 2.3) * 150;
      kit.sprite(g, 'terrain.nowhere', 7, sx, -6, { height: h, ay: 0, flip: i % 3 === 1 }, () => inkGoo(g, sx, h, i));
    }
  }

  return self;
}

// ---------- ink stand-ins ----------

function inkProfile(g, cam) {
  const x0 = cam.x - 60, x1 = cam.x + W + 60;
  const bottom = H + 60;
  const top = '#d4b24e', body = '#b08a42';
  g.save();
  for (const s of PROFILE) {
    if (s.hole || s.stream) continue;
    const a = Math.max(s.x0, x0), b = Math.min(s.x1, x1);
    if (b <= a) continue;
    const yAt = (x) => (s.y1 === undefined ? s.y : s.y + (s.y1 - s.y) * ((x - s.x0) / (s.x1 - s.x0)));
    const edge = (x) => yAt(x) + (kit.hash(Math.floor(x / 24)) - 0.5) * 6;
    // Body.
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(a, bottom);
    for (let x = a; x <= b; x += 24) g.lineTo(Math.min(x, b), edge(x));
    g.lineTo(b, edge(b));
    g.lineTo(b, bottom);
    g.closePath(); g.fill();
    // The painting's own ground (the bottom band of the scene), tiled and
    // clipped to this piece, so the strip is textured like the backdrop.
    const img = art.image('scenes/yalapappus');
    if (img) {
      g.save();
      g.clip();
      g.globalAlpha = 0.62;
      const sy = img.height * 0.79, sh = img.height * 0.21;
      const th = 250, tw = (img.width / sh) * th;
      for (let x = Math.floor(a / tw) * tw; x < b; x += tw) {
        const tx = Math.floor(x / tw);
        const yy = yAt(Math.max(a, Math.min(b, x + tw / 2))) - 8;
        if (tx % 2) { g.save(); g.translate(x + tw, 0); g.scale(-1, 1); g.drawImage(img, 0, sy, img.width, sh, 0, yy, tw, th); g.restore(); }
        else g.drawImage(img, 0, sy, img.width, sh, x, yy, tw, th);
      }
      g.globalAlpha = 1;
      // A darker, cross-hatched band deeper down.
      g.fillStyle = 'rgba(90,60,30,0.28)';
      g.fillRect(a, bottom - 160, b - a, 160);
      g.strokeStyle = 'rgba(43,29,20,0.28)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = Math.floor(a / 26) * 26; x < b + 160; x += 26) { g.moveTo(x, bottom - 150); g.lineTo(x - 150, bottom + 10); }
      g.stroke();
      g.restore();
    }
    // Hatching and pebbles.
    g.strokeStyle = 'rgba(43,29,20,0.2)';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = Math.floor(a / 38) * 38; x < b; x += 38) for (let yy = yAt(x) + 50 + kit.hash(x) * 30; yy < bottom; yy += 70) { g.moveTo(x, yy); g.lineTo(x + 22, yy + 16); }
    g.stroke();
    // Grass band.
    g.fillStyle = top;
    g.beginPath();
    g.moveTo(a, yAt(a) + 30);
    for (let x = a; x <= b; x += 24) g.lineTo(Math.min(x, b), edge(x) - kit.hash(x * 0.7) * 10);
    g.lineTo(b, edge(b));
    g.lineTo(b, yAt(b) + 30);
    g.closePath(); g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(a, edge(a));
    for (let x = a + 24; x <= b + 24; x += 24) g.lineTo(Math.min(x, b), edge(Math.min(x, b)));
    g.stroke();
    // Tufts and pebbles.
    g.lineWidth = 2;
    g.beginPath();
    for (let x = Math.floor(a / 31) * 31; x < b; x += 31) {
      if (kit.hash(x * 1.3) < 0.45) continue;
      const yy = edge(x);
      g.moveTo(x, yy); g.lineTo(x - 4, yy - 13);
      g.moveTo(x + 5, yy); g.lineTo(x + 7, yy - 15);
    }
    g.stroke();
    g.fillStyle = '#c9c2b3';
    for (let x = Math.floor(a / 97) * 97; x < b; x += 97) {
      if (kit.hash(x * 0.37) < 0.5) continue;
      g.beginPath(); g.ellipse(x + 20, yAt(x) + 22 + kit.hash(x) * 30, 9, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    // Sides at the ends of a piece by a hole or the stream.
    g.lineWidth = 3.5;
    g.beginPath();
    // (only where the piece meets a gap: pieces that abut share no side)
    const abuts = (x) => PROFILE.some((o) => o !== s && !o.hole && !o.stream && (Math.abs(o.x1 - x) < 2 || Math.abs(o.x0 - x) < 2));
    if (s.x0 >= x0 && s.x0 > 0 && !abuts(s.x0)) { g.moveTo(s.x0, yAt(s.x0)); g.lineTo(s.x0, bottom); }
    if (s.x1 <= x1 && s.x1 < WORLD_W && !abuts(s.x1)) { g.moveTo(s.x1, yAt(s.x1)); g.lineTo(s.x1, bottom); }
    g.stroke();
  }
  g.restore();
}

function inkSlope(g, seg) {
  g.save();
  g.fillStyle = '#b08a42'; g.strokeStyle = INK; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(seg.x0, seg.y); g.lineTo(seg.x1, seg.y1); g.lineTo(seg.x1, H + 60); g.lineTo(seg.x0, H + 60); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(seg.x0, seg.y); g.lineTo(seg.x1, seg.y1); g.stroke();
  g.restore();
}

function inkHoleEdge(g, x, dir) {
  g.save();
  g.fillStyle = '#b08a42'; g.strokeStyle = INK; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(x, GY); g.quadraticCurveTo(x + dir * 20, GY + 60, x + dir * 10, GY + 130); g.lineTo(x - dir * 30, GY + 130); g.lineTo(x - dir * 30, GY); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function inkRock(g, x, y, h) {
  g.save();
  g.fillStyle = '#c3bdb1'; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - h * 0.55, y);
  g.quadraticCurveTo(x - h * 0.62, y - h * 0.7, x - h * 0.2, y - h * 0.98);
  g.quadraticCurveTo(x + h * 0.3, y - h * 1.08, x + h * 0.55, y - h * 0.5);
  g.quadraticCurveTo(x + h * 0.6, y, x, y);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(43,29,20,0.35)'; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 6; i++) { g.moveTo(x + h * 0.1 + i * 8, y - h * 0.5 + i * 5); g.lineTo(x + h * 0.3 + i * 8, y - h * 0.25 + i * 5); }
  g.stroke();
  g.restore();
}

function inkFern(g, x, y) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 3; g.fillStyle = '#6f8f3a';
  for (let i = -3; i <= 3; i++) {
    const a = i * 0.32;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.sin(a) * 90 - 20, y - 120, x + Math.sin(a) * 120, y - 190 + Math.abs(i) * 18);
    g.quadraticCurveTo(x + Math.sin(a) * 90 + 20, y - 120, x, y);
    g.fill(); g.stroke();
  }
  g.restore();
}

function inkBush(g, x, y) {
  g.save();
  g.fillStyle = '#5f7a45'; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.ellipse(x, y - 80, 110, 85, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}

function dustCloud(g, x, y) {
  g.save();
  g.fillStyle = 'rgba(232,220,196,0.85)'; g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 3;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x - 60 + i * 30, y - 30 - (i % 2) * 24, 26 + (i % 3) * 8, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.restore();
}

function inkPalm(g, x, y, h, i) {
  g.save();
  g.globalAlpha = 0.82;
  g.strokeStyle = INK; g.lineWidth = 3; g.fillStyle = '#b08d58';
  const lean = (kit.hash(i * 5.3) - 0.5) * 140;
  const tx = (k) => x + lean * k * k, ty = (k) => y - h * k; // the trunk's curve
  g.beginPath();
  g.moveTo(x - 16, y);
  for (let k = 0; k <= 1; k += 0.1) g.lineTo(tx(k) - 14 + k * 5, ty(k));
  for (let k = 1; k >= 0; k -= 0.1) g.lineTo(tx(k) + 14 - k * 5, ty(k));
  g.closePath(); g.fill(); g.stroke();
  // Ring marks and a hatched shadow side.
  g.lineWidth = 2;
  g.beginPath();
  for (let k = 0.05; k < 0.97; k += 0.07) { g.moveTo(tx(k) - 12 + k * 4, ty(k)); g.quadraticCurveTo(tx(k), ty(k) + 6, tx(k) + 12 - k * 4, ty(k)); }
  for (let k = 0.02; k < 0.97; k += 0.035) { g.moveTo(tx(k) + 2, ty(k)); g.lineTo(tx(k) + 11 - k * 4, ty(k) - 6); }
  g.stroke();
  // Fronds: ribbed leaves fanning out, lighter and darker.
  const cx = tx(1), cy = ty(1);
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI * 1.05 + (k / 7) * Math.PI * 1.1;
    const len = 150 + kit.hash(i + k) * 50;
    const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.55 + 55;
    const mx = cx + Math.cos(a) * len * 0.55, my = cy + Math.sin(a) * len * 0.35 - 30;
    g.fillStyle = k % 2 ? '#86a24a' : '#637f36';
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(mx - 10, my - 18, ex, ey);
    g.quadraticCurveTo(mx + 14, my + 22, cx, cy + 6);
    g.closePath(); g.fill(); g.stroke();
    // The midrib and leaflets.
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(cx, cy + 2); g.quadraticCurveTo(mx, my + 2, ex, ey);
    for (let j = 0.2; j < 1; j += 0.13) {
      const px = (1 - j) * (1 - j) * cx + 2 * (1 - j) * j * mx + j * j * ex;
      const py = (1 - j) * (1 - j) * (cy + 2) + 2 * (1 - j) * j * (my + 2) + j * j * ey;
      g.moveTo(px, py); g.lineTo(px - 8, py + 16);
    }
    g.stroke();
    g.lineWidth = 3;
  }
  // Coconuts.
  g.fillStyle = '#8a6a44';
  for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx - 12 + k * 12, cy + 14 + (k % 2) * 8, 9, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.restore();
}

function inkGoo(g, x, h, i) {
  g.save();
  g.fillStyle = '#3fa7b5'; g.strokeStyle = INK; g.lineWidth = 3;
  const n = 3 + (i % 3);
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 34;
    const hh = h * (0.5 + kit.hash(i * 11 + k) * 0.6);
    g.beginPath();
    g.moveTo(x + dx - 12, -4); g.lineTo(x + dx + 12, -4);
    g.quadraticCurveTo(x + dx + 10, hh * 0.7, x + dx, hh);
    g.quadraticCurveTo(x + dx - 10, hh * 0.7, x + dx - 12, -4);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(248,241,224,0.45)';
    g.beginPath(); g.ellipse(x + dx - 4, hh * 0.4, 3, hh * 0.25, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3fa7b5';
  }
  g.restore();
}

// adv.b07.props 5 (360 x 212) is the bough alone, sloping down to the right
// with leaves hanging under it: drawn levelled (rotated) so its wood runs
// through the solid, from a bole that stands behind the path.
function drawBranch(g, b, tt) {
  const x = b.cx, bottom = b.y + b.h, top = b.y;
  const sp = art.sprite('adv.b07.props', 5);
  if (sp) {
    // The tree it grows from: a tall palm (terrain.nowhere 8) standing behind
    // the path at the bough's cut end, its crown up near the goo.
    const gy = profileY(b.x - 40) ?? bottom;
    kit.sprite(g, 'terrain.nowhere', 8, b.x - 70, gy + 12, { height: 760, flip: true }, () => inkBole(g, b, tt));
    art.drawSprite(g, sp, x + 10, (top + bottom) / 2 + 26, { height: 240, ax: 0.5, ay: 0.5, rot: -0.2 });
    return;
  }
  kit.sprite(g, 'adv.b07.props', 5, x, bottom, { height: 150 }, () => {
    inkBole(g, b, tt);
    g.save();
    const tx0 = b.x - 100, tw = 76;
    g.lineJoin = 'round';
    // The bough: thick at the bole, knobbly, tapering to a forked tip.
    g.lineWidth = 4.5; g.fillStyle = '#a3804e'; g.strokeStyle = INK;
    g.beginPath();
    g.moveTo(tx0 + tw - 8, top - 56);
    g.quadraticCurveTo(x - 120, top - 50, x - 60, top - 28);
    g.lineTo(x - 30, top - 36); g.lineTo(x, top - 18); g.lineTo(x + 40, top - 24); g.lineTo(x + 70, top - 4);
    g.quadraticCurveTo(b.x + b.w - 20, top + 10, b.x + b.w + 14, top + 16);
    g.quadraticCurveTo(b.x + b.w + 60, top - 6, b.x + b.w + 90, top - 44);
    g.quadraticCurveTo(b.x + b.w + 56, top + 8, b.x + b.w + 40, top + 40);
    g.quadraticCurveTo(b.x + b.w + 10, bottom + 2, b.x + b.w - 40, bottom - 2);
    g.lineTo(x + 50, bottom + 6); g.lineTo(x + 10, bottom - 6); g.lineTo(x - 40, bottom + 4);
    g.quadraticCurveTo(x - 110, bottom + 6, tx0 + tw - 8, bottom + 24);
    g.closePath(); g.fill(); g.stroke();
    // Its shadowed underside and bark lines.
    g.fillStyle = 'rgba(60,35,15,0.35)';
    g.beginPath();
    g.moveTo(tx0 + tw - 8, bottom - 16);
    g.quadraticCurveTo(x - 60, bottom - 22, x + 40, bottom - 20); g.quadraticCurveTo(b.x + b.w - 20, bottom - 18, b.x + b.w + 30, bottom - 30);
    g.lineTo(b.x + b.w + 40, top + 40);
    g.quadraticCurveTo(b.x + b.w + 10, bottom + 2, b.x + b.w - 40, bottom - 2);
    g.lineTo(x + 50, bottom + 6); g.lineTo(x + 10, bottom - 6); g.lineTo(x - 40, bottom + 4);
    g.quadraticCurveTo(x - 110, bottom + 6, tx0 + tw - 8, bottom + 24);
    g.closePath(); g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(43,29,20,0.85)';
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      const yy = top - 34 + k * 20;
      g.moveTo(tx0 + tw, yy + 10);
      for (let xx = tx0 + tw; xx < b.x + b.w + 20; xx += 70) g.quadraticCurveTo(xx + 35, yy + 10 * Math.sin(xx * 0.06 + k) + 8, xx + 70, yy + 14 * (xx - tx0) / b.w + k * 3 + 10);
    }
    g.stroke();
    g.lineWidth = 2.2; g.strokeStyle = 'rgba(43,29,20,0.7)';
    g.beginPath();
    for (let xx = tx0 + tw + 10; xx < b.x + b.w + 20; xx += 18) { g.moveTo(xx, bottom - 24); g.lineTo(xx + 10, bottom - 6); }
    g.stroke();
    g.strokeStyle = INK; g.lineWidth = 3.5;
    for (const [kx, ky] of [[x - 50, top + 20], [b.x + b.w - 70, top + 36]]) { g.fillStyle = '#6a4a2e'; g.beginPath(); g.ellipse(kx, ky, 13, 8, 0.4, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#2b1d14'; g.beginPath(); g.ellipse(kx, ky, 5, 3.5, 0.4, 0, Math.PI * 2); g.fill(); }
    // Twigs with big leaf clusters above and hanging under, and a vine.
    for (let i = 0; i < 7; i++) {
      const lx = b.x + 10 + i * (b.w + 20) / 6;
      const sway = Math.sin(tt * 2 + i) * 3;
      const up = i % 2 === 0;
      const ty = up ? top - 24 + i * 3 : bottom - 8;
      g.strokeStyle = INK; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(lx, ty); g.quadraticCurveTo(lx + 10, ty + (up ? -30 : 30), lx + sway + (up ? 18 : -12), ty + (up ? -60 : 56)); g.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (up ? -Math.PI / 2 : Math.PI / 2) + (k - 2.5) * 0.46;
        const bx = lx + sway + (up ? 10 : -6), by = ty + (up ? -36 : 32);
        inkLeaf(g, bx, by, bx + Math.cos(a) * 64, by + Math.sin(a) * 54, k % 2 ? '#8aa64c' : '#5f7a33');
      }
    }
    g.lineWidth = 3.5; g.strokeStyle = '#3f5a24';
    g.beginPath(); g.moveTo(x - 60, bottom - 4); g.quadraticCurveTo(x + 10, bottom + 110 + Math.sin(tt * 1.5) * 8, x + 100, bottom - 2); g.stroke();
    g.restore();
  });
}

// The gnarled bole the low branch grows from: it stands behind the path at
// the branch's left end and runs off the top of the screen.
function inkBole(g, b, tt) {
  const bottom = b.y + b.h, top = b.y;
  void tt;
  g.save();
    g.lineJoin = 'round';
    // The tree stands behind the path at the left end: a gnarled, bulging
    // bole with bark furrows, knots and a root flare, lit on the left.
    const tx0 = b.x - 100, tw = 76;
    const wob = (k, ph) => 7 * Math.sin(k * 9.1 + ph) + 5 * Math.sin(k * 23 + ph * 2);
    g.strokeStyle = INK; g.lineWidth = 4.5; g.fillStyle = '#9a7a4e';
    g.beginPath();
    g.moveTo(tx0 - 56, bottom + 150);
    g.quadraticCurveTo(tx0 - 10, bottom + 40, tx0 + 2, top + 10);
    for (let k = 0; k <= 1; k += 0.04) g.lineTo(tx0 + wob(k, 0) - k * 6, top + 10 - k * 760);
    g.lineTo(tx0 + tw + 10, top - 750);
    for (let k = 1; k >= 0; k -= 0.04) g.lineTo(tx0 + tw + wob(k, 1) + 6 - k * 6, top + 10 - k * 760);
    g.quadraticCurveTo(tx0 + tw + 14, bottom + 40, tx0 + tw + 60, bottom + 150);
    g.closePath(); g.fill(); g.stroke();
    // The shadow side.
    g.fillStyle = 'rgba(60,35,15,0.35)';
    g.beginPath();
    g.moveTo(tx0 + tw * 0.55, top + 10);
    for (let k = 0; k <= 1; k += 0.04) g.lineTo(tx0 + tw * 0.55 + wob(k, 1) * 0.5 - k * 6, top + 10 - k * 760);
    for (let k = 1; k >= 0; k -= 0.04) g.lineTo(tx0 + tw + wob(k, 1) + 6 - k * 6, top + 10 - k * 760);
    g.quadraticCurveTo(tx0 + tw + 14, bottom + 40, tx0 + tw + 60, bottom + 150);
    g.lineTo(tx0 + tw * 0.55, bottom + 150);
    g.closePath(); g.fill();
    // Furrows down the bark, bold.
    g.lineWidth = 3; g.strokeStyle = 'rgba(43,29,20,0.85)';
    g.beginPath();
    for (let f = 0; f < 6; f++) {
      const fx = tx0 + 8 + f * 12;
      g.moveTo(fx, bottom + 20);
      for (let yy = bottom; yy > top - 760; yy -= 48) g.quadraticCurveTo(fx + 9 * Math.sin(yy * 0.05 + f), yy - 24, fx + 4 * Math.sin(yy * 0.03 + f * 2), yy - 48);
    }
    g.stroke();
    g.lineWidth = 2.2; g.strokeStyle = 'rgba(43,29,20,0.7)';
    g.beginPath();
    for (let yy = top - 740; yy < bottom + 60; yy += 11) { g.moveTo(tx0 + tw - 30, yy); g.lineTo(tx0 + tw - 2, yy + 9); }
    g.stroke();
    g.strokeStyle = INK; g.lineWidth = 3.5;
    for (const [kx, ky, kr] of [[tx0 + 38, top - 300, 14], [tx0 + 24, top - 560, 11]]) {
      g.fillStyle = '#6a4a2e';
      g.beginPath(); g.ellipse(kx, ky, kr, kr * 1.7, 0.2, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#2b1d14';
      g.beginPath(); g.ellipse(kx, ky, kr * 0.4, kr * 0.8, 0.2, 0, Math.PI * 2); g.fill();
    }
  g.restore();
}

// A pointed leaf from (x0, y0) to its tip (x1, y1), with a bold midrib and veins.
function inkLeaf(g, x0, y0, x1, y1, fill) {
  const dx = x1 - x0, dy = y1 - y0;
  const nx = -dy * 0.32, ny = dx * 0.32;
  g.fillStyle = fill;
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo(x0 + dx * 0.5 + nx, y0 + dy * 0.5 + ny, x1, y1);
  g.quadraticCurveTo(x0 + dx * 0.5 - nx, y0 + dy * 0.5 - ny, x0, y0);
  g.closePath(); g.fill(); g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x0, y0); g.lineTo(x1, y1);
  for (let j = 0.25; j < 0.9; j += 0.2) { g.moveTo(x0 + dx * j, y0 + dy * j); g.lineTo(x0 + dx * (j + 0.12) + nx * 0.6, y0 + dy * (j + 0.12) + ny * 0.6); g.moveTo(x0 + dx * j, y0 + dy * j); g.lineTo(x0 + dx * (j + 0.12) - nx * 0.6, y0 + dy * (j + 0.12) - ny * 0.6); }
  g.stroke();
}

// adv.b07.props 8 shows the palm lying flat on the ground, crown and all: it
// can't be slid under, so the propped-up stand-in stays until a raised one
// is delivered.
function drawFallenPalm(g, b) {
  const bottom = b.y + b.h, top = b.y;
  (() => {
    g.save();
    g.lineJoin = 'round';
    g.strokeStyle = INK; g.lineWidth = 4.5; g.fillStyle = '#b08d58';
    // The stump it rests on: a broken bole with a splintered top and bold rings.
    g.beginPath();
    g.moveTo(b.x - 22, bottom - 2); g.lineTo(b.x - 8, bottom - 22); g.lineTo(b.x + 8, bottom - 4); g.lineTo(b.x + 24, bottom - 26); g.lineTo(b.x + 40, bottom - 6); g.lineTo(b.x + 56, bottom - 2);
    g.lineTo(b.x + 66, bottom + 150); g.lineTo(b.x - 36, bottom + 150); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = 'rgba(60,35,15,0.35)';
    g.beginPath(); g.moveTo(b.x + 24, bottom - 26); g.lineTo(b.x + 40, bottom - 6); g.lineTo(b.x + 56, bottom - 2); g.lineTo(b.x + 66, bottom + 150); g.lineTo(b.x + 24, bottom + 150); g.closePath(); g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(43,29,20,0.85)';
    g.beginPath();
    for (let yy = bottom + 8; yy < bottom + 150; yy += 14) { g.moveTo(b.x - 28, yy); g.quadraticCurveTo(b.x + 18, yy + 9, b.x + 62, yy); }
    g.stroke();
    // The trunk lying across: raised ring bands, a splintered butt, shadow under.
    g.strokeStyle = INK; g.lineWidth = 4.5; g.fillStyle = '#b08d58';
    g.beginPath();
    g.moveTo(b.x - 30, top);
    g.lineTo(b.x - 50, top + 12); g.lineTo(b.x - 32, top + 22); g.lineTo(b.x - 56, top + 36); g.lineTo(b.x - 34, top + 46); g.lineTo(b.x - 48, bottom - 4); g.lineTo(b.x - 28, bottom);
    g.quadraticCurveTo(b.cx, bottom + 14, b.x + b.w + 10, bottom - 2);
    g.lineTo(b.x + b.w + 10, top + 8);
    g.quadraticCurveTo(b.cx, top - 12, b.x - 30, top);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(60,35,15,0.4)';
    g.beginPath(); g.moveTo(b.x - 30, bottom - 26); g.quadraticCurveTo(b.cx, bottom - 12, b.x + b.w + 10, bottom - 28); g.lineTo(b.x + b.w + 10, bottom - 2); g.quadraticCurveTo(b.cx, bottom + 14, b.x - 28, bottom); g.closePath(); g.fill();
    g.lineWidth = 3.5; g.strokeStyle = 'rgba(43,29,20,0.9)';
    g.beginPath();
    for (let x = b.x; x < b.x + b.w; x += 26) {
      g.moveTo(x, top - 2); g.quadraticCurveTo(x - 11, top + b.h / 2, x, bottom + 4);
      g.moveTo(x + 12, top - 2); g.quadraticCurveTo(x + 1, top + b.h / 2, x + 12, bottom + 4);
    }
    g.stroke();
    g.strokeStyle = 'rgba(43,29,20,0.6)'; g.lineWidth = 2.2;
    g.beginPath();
    for (let x = b.x + 16; x < b.x + b.w; x += 26) { for (let yy = top + 8; yy < bottom - 8; yy += 9) { g.moveTo(x, yy); g.lineTo(x + 8, yy + 6); } }
    g.stroke();
    // The crown at the right: drooping ribbed fronds, some brown and dry.
    const cx = b.x + b.w + 18, cy = top + 20;
    for (let k = 0; k < 7; k++) {
      const a = -1.5 + k * 0.42;
      const len = 130 + kit.hash(k * 2.7 + b.cx) * 50;
      const ex = cx + Math.cos(a) * len + 24, ey = cy + Math.sin(a) * len * 0.7 + 80;
      const mx = cx + Math.cos(a) * len * 0.6 + 12, my = cy + Math.sin(a) * len * 0.4 + 10;
      g.fillStyle = k === 2 || k === 5 ? '#b89a52' : k % 2 ? '#8aa64c' : '#5f7a33';
      g.strokeStyle = INK; g.lineWidth = 3.5;
      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(mx - 10, my - 18, ex, ey);
      g.quadraticCurveTo(mx + 14, my + 20, cx, cy + 10);
      g.closePath(); g.fill(); g.stroke();
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(cx, cy + 4); g.quadraticCurveTo(mx, my + 1, ex, ey);
      for (let j = 0.2; j < 1; j += 0.1) {
        const px = (1 - j) * (1 - j) * cx + 2 * (1 - j) * j * mx + j * j * ex;
        const py = (1 - j) * (1 - j) * cy + 2 * (1 - j) * j * my + j * j * ey;
        g.moveTo(px, py); g.lineTo(px - 9, py + 20);
      }
      g.stroke();
    }
    g.restore();
  });
}

function drawSignpost(g, x, gy, tt) {
  const sp = art.sprite('adv.b07.props', 7);
  if (sp) {
    const k = 300 / sp.h;
    art.drawSprite(g, sp, x, gy + 4, { scale: k });
    // The book's words on its two blank boards.
    g.save();
    g.translate(x - sp.w * k / 2, gy + 4 - sp.h * k);
    g.scale(k, k);
    g.fillStyle = INK; g.textAlign = 'center';
    g.font = '800 17px Fraunces, Georgia, serif';
    g.save(); g.translate(84, 74); g.rotate(-0.3); g.fillText('TO NOWHERE', 0, 0); g.restore();
    g.font = '800 15px Fraunces, Georgia, serif';
    g.save(); g.translate(150, 136); g.rotate(0.17); g.fillText('and BACKAGAIN', 0, 0); g.restore();
    g.restore();
    return;
  }
  kit.sprite(g, 'adv.b07.props', 7, x, gy + 4, { height: 300 }, () => {
    g.save();
    g.translate(x, gy + 4);
    g.rotate(0.06);
    g.fillStyle = '#8a6a44'; g.strokeStyle = INK; g.lineWidth = 4;
    g.fillRect(-11, -280, 22, 280); g.strokeRect(-11, -280, 22, 280);
    g.fillStyle = '#d9b77a';
    g.font = '800 26px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    // Two boards, pointing each way.
    g.save(); g.translate(0, -240); g.rotate(-0.05);
    g.beginPath(); g.moveTo(-120, -26); g.lineTo(90, -26); g.lineTo(125, 0); g.lineTo(90, 26); g.lineTo(-120, 26); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = INK; g.fillText('TO NOWHERE', -10, 9); g.restore();
    g.fillStyle = '#d9b77a';
    g.save(); g.translate(0, -170); g.rotate(0.08);
    g.beginPath(); g.moveTo(120, -26); g.lineTo(-90, -26); g.lineTo(-125, 0); g.lineTo(-90, 26); g.lineTo(120, 26); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = INK; g.fillText('and BACKAGAIN', 10, 9); g.restore();
    g.restore();
  });
}

function drawFinishSign(g, x, gy, tt) {
  g.save();
  g.translate(x, gy + 4);
  g.textAlign = 'center';
  g.font = '800 40px Fraunces, Georgia, serif';
  const w2 = g.measureText('THE EDGE OF NOWHERE').width;
  g.font = '800 28px Fraunces, Georgia, serif';
  const w1 = g.measureText('YOU ARE NOW LEAVING').width;
  const bw = Math.max(w1, w2) + 70, bh = 150;
  g.fillStyle = '#9a7a4e'; g.strokeStyle = INK; g.lineWidth = 4;
  // Two posts with ring hatching.
  for (const px of [-bw / 2 + 50, bw / 2 - 70]) {
    g.fillRect(px, -330, 22, 330); g.strokeRect(px, -330, 22, 330);
    g.lineWidth = 1.5;
    g.beginPath();
    for (let yy = -310; yy < -10; yy += 18) { g.moveTo(px + 3, yy); g.quadraticCurveTo(px + 11, yy + 5, px + 19, yy); }
    g.stroke();
    g.lineWidth = 4;
  }
  // The board: weathered planks.
  g.fillStyle = '#e6d6a6';
  roundRect(g, -bw / 2, -340, bw, bh, 12); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(43,29,20,0.45)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-bw / 2 + 6, -340 + bh / 2); g.lineTo(bw / 2 - 6, -340 + bh / 2 + 3);
  for (let xx = -bw / 2 + 14; xx < bw / 2 - 10; xx += 46) { g.moveTo(xx, -336); g.lineTo(xx + 5, -338 + bh - 6); }
  g.stroke();
  g.strokeStyle = INK;
  for (const [nx, ny] of [[-bw / 2 + 16, -326], [bw / 2 - 16, -326], [-bw / 2 + 16, -204], [bw / 2 - 16, -204]]) { g.beginPath(); g.arc(nx, ny, 4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = INK;
  g.font = '800 28px Fraunces, Georgia, serif';
  g.fillText('YOU ARE NOW LEAVING', 0, -286);
  g.font = '800 40px Fraunces, Georgia, serif';
  g.fillText('THE EDGE OF NOWHERE', 0, -232);
  g.fillStyle = '#c8443a';
  const bob = Math.sin(tt * 6) * 8;
  g.beginPath(); g.moveTo(bw / 2 + 10 + bob, -170); g.lineTo(bw / 2 + 60 + bob, -145); g.lineTo(bw / 2 + 10 + bob, -120); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

// The line under the route strip, on a cream tag so it reads over the goo.
function routeLabel(g, text) {
  g.save();
  g.font = '700 26px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  const w = g.measureText(text).width + 36;
  g.fillStyle = 'rgba(251,246,232,0.92)';
  g.strokeStyle = INK;
  g.lineWidth = 3;
  roundRect(g, W / 2 - w / 2, 132, w, 40, 14); g.fill(); g.stroke();
  g.fillStyle = INK;
  g.fillText(text, W / 2, 161);
  g.restore();
}

// The warning before he looks: an eye bubble growing over his head.
function eyeBubble(g, x, y, k, t) {
  const sp = art.prop('trollusk', 9);
  const s = 0.6 + 0.4 * Math.min(1, k);
  const wob = Math.sin(t * 18) * 0.06;
  if (!art.drawSprite(g, sp, x, y, { height: 130 * s, rot: wob })) {
    g.save(); g.translate(x, y - 60 * s); g.fillStyle = PAPER; g.strokeStyle = '#33241a'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, 70 * s, 42 * s, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#33241a'; g.beginPath(); g.arc(0, 0, 16 * s, 0, Math.PI * 2); g.fill(); g.restore();
  }
}

// He's looking: a wide-open eye.
function eyeOpen(g, x, y, t) {
  g.save();
  g.translate(x, y - 50);
  const s = 1 + Math.sin(t * 10) * 0.05;
  g.scale(s, s);
  g.fillStyle = PAPER; g.strokeStyle = '#c8443a'; g.lineWidth = 6;
  g.beginPath(); g.ellipse(0, 0, 62, 38, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#33241a';
  g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c8443a';
  g.font = '800 30px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.fillText('LOOKING!', 0, -50);
  g.restore();
}

// ---------- the how-to-play page ----------
export const HOWTO = [
  {
    text: 'Tiptoe up behind him. When his ears prick up, FREEZE, or hide behind a fern.',
    scene: 'scenes/yalapappus', crop: [0, 300, 1040, 780],
    items: [
      { sprite: ['props.grithix', 4], x: 150, y: 430, h: 150 },
      { creature: 'trollusk', anim: 'freeze', x: 300, y: 430, h: 150 },
      { creature: 'yalapappus', anim: 'eye', x: 520, y: 430, h: 170, flip: true },
      { sprite: ['props.trollusk', 9], x: 450, y: 250, h: 80 },
      { ring: [300, 350, 90] },
    ],
  },
  {
    text: 'Beside him, Action: snatch the letter in your snerk!',
    scene: 'scenes/yalapappus', crop: [0, 300, 1040, 780],
    items: [
      { creature: 'yalapappus', anim: 'munch', x: 440, y: 430, h: 170 },
      { creature: 'trollusk', anim: 'grab', x: 270, y: 430, h: 150 },
      { word: 'SNATCH!', x: 330, y: 200, size: 60 },
      { path: [[200, 300], [330, 270]], arrow: true },
    ],
  },
  {
    text: 'Run! Hop rocks and holes, slide under branches, and keep ahead of him.',
    scene: 'scenes/yalapappus', crop: [800, 300, 1040, 780],
    items: [
      { creature: 'yalapappus', anim: 'shout', x: 120, y: 430, h: 170 },
      { creature: 'trollusk', anim: 'run', x: 330, y: 430, h: 150 },
      { sprite: ['props.yalapappus', 1], x: 500, y: 440, h: 90 },
      { path: [[380, 330], [470, 250], [560, 330]], arrow: true },
    ],
  },
];

// ---------- the autopilot ----------
// Plays competently: creeps when he munches, freezes or hides when he looks,
// snatches, then runs with hops and slides timed off the hazards ahead, and
// mashes the tug.
export function autopilot(board) {
  const s = board._;
  const out = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  if (board.done) return out;
  const p = s.player;
  if (s.phase === 'sneak') {
    if (s.dazed > 0 || s.look === 'alarm') return out;
    const looking = s.look === 'look' || s.look === 'warn';
    const cov = s.coverAt(p.x);
    const yx = s.yal.x;
    if (yx - p.x < 165) { if (!looking) out.actionPressed = s.tick % 3 === 0; return out; }
    if (looking) { if (cov && p.x + 40 < cov.x + cov.rx) { out.x = 1; out.y = 1; } else out.y = cov ? 1 : 0; return out; }
    // Wait ducked in cover if a look is due before the next cover.
    const next = s.cover.find((c) => c.x - c.rx > p.x + 10);
    const dist = next ? next.x - p.x : yx - 165 - p.x;
    if (cov && s.timeToLook() < dist / 200 + 0.2 && s.timeToLook() > 0 && dist > 90) { out.y = 1; return out; }
    out.x = 1;
    if (cov) out.y = 1;
    // Far from him with time in hand: scurry (it is noisy near him).
    out.sprint = !cov && yx - p.x > 1000 && s.timeToLook() > 1.2 && s.stamina > 0.3;
    return out;
  }
  if (s.tug) { out.actionPressed = s.tick % 2 === 0; out.action = out.actionPressed; out.x = 1; return out; }
  out.x = 1;
  if (s.dazed > 0) return out;
  const front = p.x + 40;
  const lead = 40 + Math.abs(p.vx) * 0.3;
  const gap = p.x - s.yal.x;
  // The next hazard ahead.
  const next = s.hazards.find((h) => h.x1 > p.x - 20);
  const low = next && next.kind === 'low' && front > next.x0 - 300 && p.x < next.x1 + 30;
  if (low) {
    if (p.x < next.x0 - 120 && p.onGround) out.sprint = s.stamina > 0.15 && !s.sliding;
    if (front > next.x0 - 200 && (Math.abs(p.vx) > 240 || s.sliding)) out.y = 1;
    return out;
  }
  // Keep the bag full when he is far; scurry when he is close or downhill.
  const gy0 = profileY(p.x), gy1 = profileY(p.x + 120);
  const downhill = gy0 !== null && gy1 !== null && gy1 > gy0 + 2;
  out.sprint = !s.sliding && s.stamina > 0.3 && (gap < 420 || downhill || (s.rolling && gap < 900));
  // A run-up for a hole coming.
  if (!s.sliding && s.stamina > 0.1 && s.hazards.some((h) => h.kind === 'hole' && h.x0 - front > 0 && h.x0 - front < 340)) out.sprint = true;
  // Jump at the end of the footing (holes, stones), at rocks and puddles.
  const g = p.ground;
  let jump = false;
  let hold = true; // a full hop, or a short one (let go early) for a near stone
  if (p.onGround && g) {
    const end = g.x + g.w;
    const nextSolid = s.solids.find((q) => q !== g && (q.kind === 'ground' || q.kind === 'slope' || q.kind === 'stone') && q.x >= end - 2 && q.x <= end + 2);
    if (!nextSolid && end - front < 110) {
      // At a gap's edge too slowly to clear it: step back for a run-up.
      if (Math.abs(p.vx) < 300) { out.sprint = false; out.x = s.hazards.some((h) => h.kind === 'rock' && h.x1 > p.x - 200 && h.x1 <= p.x) ? 0 : -1; return out; }
      if (end - front < 22 + Math.abs(p.vx) * 0.04) {
        jump = true;
        // The footing across the gap: a full hop must not overshoot it.
        const far = s.solids.filter((q) => q.x > end && (q.kind === 'ground' || q.kind === 'slope' || q.kind === 'stone')).sort((a, b) => a.x - b.x)[0];
        if (far && far.x + far.w + 30 - (p.x - 40) < Math.abs(p.vx) * 0.75) hold = false;
      }
    }
  }
  if (s.hazards.some((h) => (h.kind === 'rock' || h.kind === 'puddle') && h.x0 - front < lead && h.x0 - front > -10)) jump = true;
  if (jump && p.onGround) { out.actionPressed = true; out.action = true; s.holdHop = hold; }
  else if (!p.onGround && p.vy < 0 && s.holdHop !== false) out.action = true; // hold for the full hop
  // A stamp just above: a little hop for it (only on the flat, not over a hole).
  if (!jump && p.onGround && g && (g.kind === 'ground')) {
    const st = s.pickups.items.find((q) => !q.got && !q.eaten && !q.fly && q.x - p.x > 20 && q.x - p.x < 140 && (p.y - q.y) > 130);
    const clear = !next || next.x0 - front > 420;
    if (st && clear && g.x + g.w - front > 260) { out.actionPressed = true; out.action = true; }
  }
  return out;
}

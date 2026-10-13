// Board 9: FLIP-FLOP. The Bombanat-Collecting Grithix strolls through his
// wood with his net (design/adventure.md, board 9).
//
// Part one, collecting: plain Bombanats flutter through the wood in patterns;
// Action swings the net in three beats (wind-up, sweep, slam: FLIP-FLOP), up
// for an overhead swing, down for a low scoop along the ground. Each netted
// Bombanat goes into a jar on the shelf. Sprint while striding plants the pole
// and vaults him in a long, slow arc over a gap, a log, a root or a monster;
// toadstools bounce him up to the branches. The Bombanat with the letter flits
// ahead, teasing, until the clearing, where it loops low enough to net.
//
// Part two, the post: carry the letter to the official mailbox while the
// Trollusk pops out of the ferns to trip him and the Yalapappus rolls at him
// as a ball: vault over them, or net them too (they sit in the bag). Action at
// the mailbox posts it. The feat: everybody netted before posting, which means
// the letter Bombanat, the Trollusk and the Yalapappus all in the bag.
//
// Every number for the net's reach comes from the drawn poses (HOOP), so the
// hit region is exactly the hoop you see.

import * as kit from './kit.js';
import * as art from '../art.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';

const { W, H, clamp, ease, approach } = kit;

const GY = 880; // the ground line (feet)
const WORLD_W = 11400;
const MAIL_X = 11000;
const CLEAR = { x0: 5800, x1: 7300 }; // the clearing
const LOOP = { x: 6450, ax: 360 }; // the letter Bombanat's figure-eight in it
const TIME = 150;

// Sections and their signposts.
const CHECKPOINTS = [0, 1700, 3700, 5800, 7400, 10300];

// Ground segments; the gaps between are streams.
const GROUND = [[0, 4000], [4240, 4700], [4940, 5300], [5540, 9350], [9590, WORLD_W]];
const LOGS = [2750, 3650, 8550]; // fallen logs (their middles): vault them
const LOG_W = 190, LOG_H = 110;
const ROOTS = [900, 1500, 2150, 3330, 7550, 8050, 10080]; // gnarled roots: step high or vault
const TOADSTOOLS = [2420, 7100, 8900];
const BRANCHES = [[2560, 3080], [9000, 9720]]; // one-way platforms up at GY - 290
const BRANCH_Y = GY - 290;
const FERNS = [7700, 8350, 10250, 10750]; // the Trollusk's hiding places, in order
const DECOR_FERNS = [400, 1950, 3300, 4850, 6400, 7000, 9850, 11250];
// terrain.wood 6 turned out to be a tree's foot (roots, ivy, a face) cut off at
// the top, not a tall trunk: the backdrops carry the trees, so none are placed.
const TRUNKS = [];
const STUMPS = [1200, 7100]; // the stump with a face
const HOLLOWS = [5900, 10900]; // the hollow stump
const ROCKS = [3150, 8000, 10600]; // piles of rocks
const MOUNDS = [650, 4480, 6350]; // mounds of roots
const LOW_LOGS = [1750, 8150]; // the long mossy log lying on the floor
const ROLL_AT = [7800, 8700, 9750]; // where the Yalapappus's rolls are set off

// The Grithix.
const SPEED = 285, ACCEL = 900, DECEL = 1500, HIGH_STEP = 0.5; // high-stepping speed factor
const VAULT = { time: 0.85, dist: 560, height: 215, minSpeed: 180 };
const BOUNCE_V = 1400;
const NET = { windup: 0.22, sweep: 0.2, slam: 0.3, rest: 0.14 };
const TRIP_TIME = 1.1, IMMUNE = 1.2, SOAK_TIME = 0.9;
const POST_TIME = 0.9;
const ROOT_HALF = 60;

// The net's hoop in each drawn pose, as fractions of the sprite (x from its
// left, y from its top) and a radius in fractions of its width, measured on
// the key poses (grithix.poses 5 and 6). Until the moves sheet arrives, netUp
// draws the swing pose leaned back with a little hop, so its hoop is that
// pose's hoop turned the same way: see hoopAt().
const HOOP = {
  swing: { sheet: 'grithix.poses', item: 5, size: [720, 603], fx: 0.86, fy: 0.33, r: 0.1 },
  slam: { sheet: 'grithix.poses', item: 6, size: [596, 530], fx: 0.78, fy: 0.88, r: 0.13 },
  // The moves sheet's overhead swing and low scoop (grithix.moves 1 and 2);
  // until it arrives, the swing pose leaned back with a hop, and the slam.
  netUp: { sheet: 'grithix.moves', item: 1, size: [353, 720], fx: 0.28, fy: 0.16, r: 0.2,
    fallback: { sheet: 'grithix.poses', item: 5, size: [720, 603], fx: 0.86, fy: 0.33, r: 0.1, rot: -0.5, hop: 40 } },
  netLow: { sheet: 'grithix.moves', item: 2, size: [593, 405], fx: 0.89, fy: 0.83, r: 0.11,
    fallback: { sheet: 'grithix.poses', item: 6, size: [596, 530], fx: 0.78, fy: 0.88, r: 0.13 } },
};

// The how-to-play page (src/chapters/index.js, "THE HOW-TO-PLAY PAGE").
export const HOWTO = [
  {
    text: 'Swing the net, FLIP-FLOP: up for overhead, down for a low scoop.',
    scene: 'scenes/grithix', crop: [200, 300, 960, 720],
    items: [
      { creature: 'grithix', anim: 'swing', x: 250, y: 440, h: 300 },
      { sprite: ['props.grithix', 3], x: 520, y: 450, h: 120 },
      { path: [[300, 300], [380, 220], [470, 250]], arrow: true },
      { word: 'FLIP-FLOP!', x: 440, y: 150, size: 54 },
    ],
  },
  {
    text: 'Sprint while striding to pole-vault a log, a stream or a monster.',
    scene: 'scenes/grithix', crop: [600, 300, 960, 720],
    items: [
      { creature: 'grithix', anim: 'vault', x: 300, y: 300, h: 280 },
      { sprite: ['props.grithix', 5], x: 330, y: 450, h: 110 },
      { path: [[120, 440], [220, 250], [330, 200], [450, 250], [540, 440]], arrow: true },
    ],
  },
  {
    text: 'Net the Bombanat with the letter, then post it in the official mailbox.',
    scene: 'scenes/grithix', crop: [900, 300, 960, 720],
    items: [
      { sprite: ['props.grithix', 1], x: 520, y: 450, h: 240 },
      { creature: 'grithix', anim: 'post', x: 300, y: 450, h: 300, flip: false },
      { ring: [520, 290, 60] },
      { word: 'Posted!', x: 520, y: 150, size: 48 },
    ],
  },
];

export default function create(env) {
  const gentle = !!env.gentle?.[0];
  const skill = env.skill ?? 0.5;
  art.preload(['grithix.poses', 'grithix.moves', 'bombanat.poses', 'trollusk.poses', 'yalapappus.poses', 'yalapappus.swaps',
    'props.grithix', 'props.trollusk', 'adv.b09.props', 'terrain.wood', 'scenes/grithix', 'ui/letter']);

  // ---------- the world ----------
  const solids = [];
  for (const [x0, x1] of GROUND) solids.push({ x: x0, y: GY, w: x1 - x0, h: 400, kind: 'ground' });
  for (const x of LOGS) solids.push({ x: x - LOG_W / 2, y: GY - LOG_H, w: LOG_W, h: LOG_H, kind: 'log' });
  for (const x of TOADSTOOLS) solids.push({ x: x - 78, y: GY - 112, w: 156, h: 20, oneWay: true, bouncy: true, kind: 'toadstool' });
  for (const [x0, x1] of BRANCHES) solids.push({ x: x0, y: BRANCH_Y, w: x1 - x0, h: 40, oneWay: true, kind: 'branch' });
  const streams = [];
  for (let i = 1; i < GROUND.length; i++) streams.push({ x0: GROUND[i - 1][1], x1: GROUND[i][0] });

  const cam = kit.makeCamera(WORLD_W, { lead: 300, anchor: 0.34 });
  const cps = kit.makeCheckpoints(CHECKPOINTS);
  const fx = kit.makeParticles();
  const hints = kit.makeHints([
    { x: 150, text: 'Action: swing the net, FLIP-FLOP!' },
    { x: 450, text: 'Up: an overhead swing · Down: a low scoop' },
    { x: 740, text: 'Hold Up to step high over a root' },
    { x: 2200, text: 'Toadstools bounce you up to the branches' },
    { x: 3250, text: 'Sprint while striding: pole-vault the log' },
    { x: 3800, text: 'Vault the streams at a run' },
    { x: 5850, text: 'The clearing! Net the Bombanat with the letter!' },
  ]);

  // ---------- the plain Bombanats ----------
  // h is the height of the flutter's middle above the ground it is over.
  const flock = [];
  const addB = (x, h, pat = 'bob', o = {}) => {
    const c = art.makeCreature('bombanatPlain', x, GY - h);
    c.sizeK = 0.48; c.animT = flock.length * 0.37;
    flock.push({ x, y: GY - h, pat, amp: 28, span: 0, speed: 1, ...o, phase: flock.length * 1.37, got: false, t: 0, cx: 0, cy: 0, c });
  };
  // The opening: low ones to learn the sweep, one overhead, one skimming.
  addB(620, 180); addB(1150, 160, 'patrol', { span: 100, speed: 0.7 }); addB(1340, 200, 'circle', { amp: 36 }); addB(1700, 175);
  // Roots, the toadstool, the branch and the logs.
  addB(1900, 300, 'bob', { amp: 22 }); addB(2050, 50, 'skim', { span: 60 }); addB(2300, 170, 'patrol', { span: 60, speed: 0.9 });
  addB(2700, 480, 'bob'); addB(2870, 470, 'circle', { amp: 30 }); addB(3030, 485); // over the branch at 290
  addB(3150, 170, 'circle', { amp: 30 }); addB(3450, 310, 'bob', { amp: 20 }); addB(3850, 40, 'skim', { span: 90 });
  // The streams: skimming low at the banks, and high over the gaps.
  addB(4350, 310, 'bob', { amp: 20 }); addB(4500, 170, 'circle', { amp: 30 }); addB(4650, 45, 'skim', { span: 60 });
  addB(5180, 180, 'patrol', { span: 50 }); addB(5250, 45, 'skim', { span: 60 }); addB(5700, 290, 'bob'); addB(4560, 300, 'bob');
  // The clearing.
  addB(6200, 170, 'patrol', { span: 240, speed: 0.8 }); addB(6600, 190, 'circle', { amp: 40 }); addB(7100, 470); addB(6950, 160);
  // The post road.
  addB(7560, 300, 'bob'); addB(7850, 170, 'patrol', { span: 100 }); addB(8250, 55, 'skim', { span: 60 }); addB(8500, 180, 'circle', { amp: 34 });
  addB(9150, 470, 'bob'); addB(9400, 480, 'circle', { amp: 30 }); addB(9650, 475); addB(9900, 300, 'bob', { amp: 22 });
  addB(10300, 60, 'skim', { span: 100 }); addB(10550, 180, 'circle', { amp: 36 }); addB(10800, 290, 'bob');
  const TOTAL = flock.length;

  // ---------- the creatures ----------
  const body = kit.makeBody({ x: 260, y: GY, w: 90, h: 280 });
  const gc = art.makeCreature('grithix', body.x, body.y);
  const bomb = { x: 900, y: GY - 430, vx: 0, vy: 0, facing: 1, mode: 'tease', dodgeT: 0, dodgeCool: 0, dipT: 0, loopT: 0, c: art.makeCreature('bombanat', 900, GY - 430) };
  bomb.c.sizeK = 0.8;
  const tro = { x: FERNS[0], y: GY, vx: 0, mode: 'hide', fern: 0, t: 0, netted: false, c: art.makeCreature('trollusk', FERNS[0], GY) };
  tro.c.sizeK = 0.75;
  const yal = { x: 0, y: GY, vx: 0, mode: 'away', t: 0, rolls: 0, netted: false, c: art.makeCreature('yalapappus', 0, GY) };
  yal.c.sizeK = 0.85;

  // ---------- state ----------
  let t = 0;
  let phase = 'collect'; // 'collect' | 'carry'
  let mode = 'free'; // free | windup | sweep | slam | rest | vault | trip | soak | post
  let modeT = 0;
  let swingKind = 'swing'; // swing | netUp | netLow
  let swingCaught = 0;
  let vaultDir = 1;
  let immune = 0;
  let highStep = false;
  let airT = 0;
  let prevSprint = false;
  let prevX;
  let bagShake = 0;
  let outroT = 0;
  let letterFlash = 0;
  const jarsFlying = []; // { sx, sy, t }
  const bag = new Set(); // 'bombanat' | 'trollusk' | 'yalapappus'
  let got = 0;
  let trips = 0, soaks = 0;
  let postedWith = null;

  const shake = (a) => cam.shake(a, env.reduceMotion);

  // Where the hoop is now, in the world (null when the net is not out).
  // The hoop of a swing kind relative to the feet, facing right: { dx, dy, r }
  // and, for the fallback pose, how the body is drawn (rot, hop).
  function hoopFor(kind) {
    let hp = HOOP[kind];
    let sp = art.sprite(hp.sheet, hp.item);
    if (!sp && hp.fallback) { hp = hp.fallback; sp = art.sprite(hp.sheet, hp.item); }
    // Sprite size on screen (the stand-in uses the key pose's sizes).
    const w = (sp?.w ?? hp.size[0]) * poseScale();
    const h = (sp?.h ?? hp.size[1]) * poseScale();
    // The sprite is anchored where art.js anchors it (the middle of its feet).
    const ax = sp ? feetAnchor(sp) : 0.5;
    let dx = (hp.fx - ax) * w, dy = -(1 - hp.fy) * h;
    if (hp.rot) { const c = Math.cos(hp.rot), s = Math.sin(hp.rot); [dx, dy] = [dx * c - dy * s, dx * s + dy * c]; }
    return { dx, dy: dy - (hp.hop || 0), r: hp.r * w, rot: hp.rot || 0, hop: hp.hop || 0 };
  }
  function hoopAt() {
    const pose = mode === 'sweep' ? swingKind : mode === 'slam' && modeT < 0.1 ? 'slam' : null;
    if (!pose) return null;
    const h = hoopFor(pose);
    return { x: body.x + h.dx * gc.facing, y: body.y + h.dy, r: h.r };
  }
  function poseScale() { return (300 / 628) * gc.sizeK; }

  // ---------- catching ----------
  function catchFlock() {
    const hp = hoopAt();
    if (!hp) return;
    for (const b of flock) {
      if (b.got) continue;
      if (kit.near(b.x + b.cx, b.y + b.cy, hp.x, hp.y, hp.r + 30)) {
        b.got = true; b.t = 0; got++; swingCaught++;
        env.sfx('pickup');
        fx.pop(b.x + b.cx, b.y + b.cy - 40, '+1', { colour: '#5a3a6a', size: 40 });
        jarsFlying.push({ sx: b.x + b.cx - cam.x, sy: b.y + b.cy, t: 0 });
      }
    }
    if (phase === 'collect' && bomb.mode !== 'netted' && kit.near(bomb.x, bomb.y, hp.x, hp.y, hp.r + 34)) {
      bomb.mode = 'netted'; bomb.t = 0;
      bag.add('bombanat');
      phase = 'carry';
      env.sfx('flipflop'); env.sfx('tinkle'); env.vibrate(140);
      shake(14);
      fx.pop(bomb.x, bomb.y - 120, 'FLIP-FLOP!', { colour: '#b3402e', size: 72, life: 1.6 });
      fx.burst(bomb.x, bomb.y, { n: 14, colour: '#c9b8d4', speed: 300 });
      letterFlash = 1.2;
      bagShake = 1;
      hints.say('Got the letter! Now carry it to the official mailbox →', 3.5);
      art.kick(gc, 0.3);
    }
    if (!tro.netted && (tro.mode === 'pounce' || tro.mode === 'gloat' || tro.mode === 'run') && kit.near(tro.x, tro.y - 85, hp.x, hp.y, hp.r + 50)) {
      tro.netted = true; tro.mode = 'netted'; bag.add('trollusk');
      bigCatch(tro.x, tro.y - 120, 'Snerk!');
    }
    if (!yal.netted && (yal.mode === 'roll' || yal.mode === 'dizzy') && kit.near(yal.x, yal.y - yal.c.z - 85, hp.x, hp.y, hp.r + 60)) {
      yal.netted = true; yal.mode = 'netted'; bag.add('yalapappus');
      bigCatch(yal.x, yal.y - 120, 'Grimm!');
    }
  }
  function bigCatch(x, y, word) {
    env.sfx('flipflop'); env.sfx('tinkle'); env.vibrate(90);
    shake(10);
    fx.pop(x, y - 40, 'FLIP-FLOP!', { colour: '#b3402e', size: 60, life: 1.4 });
    fx.pop(x, y - 120, word, { colour: '#33241a', size: 40 });
    fx.burst(x, y, { n: 10, colour: '#e8dcc4', speed: 240 });
    bagShake = 1;
  }

  // ---------- setbacks ----------
  function trip(word) {
    if (mode === 'trip' || mode === 'soak' || immune > 0) return;
    mode = 'trip'; modeT = 0; trips++;
    highStep = false;
    body.vx = Math.sign(body.vx || 1) * 120;
    env.sfx('stumble'); env.sfx('thump'); env.vibrate(110);
    shake(9);
    art.kick(gc, 0.6);
    fx.pop(body.x, body.y - 320, word, { colour: '#33241a', size: 44 });
    fx.burst(body.x, body.y, { n: 8, colour: '#c9bca0', speed: 200 });
  }
  function soak() {
    mode = 'soak'; modeT = 0; soaks++;
    env.sfx('splash'); env.vibrate(60);
    fx.burst(body.x, GY + 40, { n: 16, colour: '#dcebf0', speed: 420, up: 0.9, size: 14 });
    fx.pop(body.x, GY - 120, 'Splash!', { colour: '#2f5a6e', size: 48 });
    body.x = cps.last + 80; body.y = GY; body.vx = 0; body.vy = 0; body.onGround = true;
    cam.follow(body.x, 0, 0, true);
    hints.say('Sprint at a run to pole-vault the stream', 3);
  }

  // ---------- the Grithix ----------
  function updatePlayer(dt, inp) {
    const sprintEdge = !!inp.sprint && !prevSprint;
    prevSprint = !!inp.sprint;
    immune = Math.max(0, immune - dt);
    modeT += dt;
    const onGround = body.onGround;

    // Mode timers.
    if (mode === 'windup' && modeT >= NET.windup) { mode = 'sweep'; modeT = 0; swingCaught = 0; env.sfx('swish'); }
    else if (mode === 'sweep' && modeT >= NET.sweep) { mode = 'slam'; modeT = 0; env.sfx('flipflop'); shake(swingCaught ? 9 : 6); art.kick(gc, 0.35); fx.burst(body.x + gc.facing * 100, body.y, { n: 6, colour: '#c9bca0', speed: 160, size: 9 }); }
    else if (mode === 'slam' && modeT >= NET.slam) { mode = 'rest'; modeT = 0; }
    else if (mode === 'rest' && modeT >= NET.rest) { mode = 'free'; modeT = 0; }
    else if (mode === 'trip' && modeT >= TRIP_TIME) { mode = 'free'; modeT = 0; immune = IMMUNE; }
    else if (mode === 'soak' && modeT >= SOAK_TIME) { mode = 'free'; modeT = 0; immune = 0.6; }
    else if (mode === 'post' && modeT >= POST_TIME) {
      self.done = true; self.outcome = 'snatched'; outroT = 0;
      postedWith = new Set(bag);
      env.sfx('thunk'); env.sfx('cheer');
      fx.pop(MAIL_X, GY - 330, 'Posted!', { colour: '#b3402e', size: 64, life: 1.8 });
    }

    const swinging = mode === 'windup' || mode === 'sweep' || mode === 'slam' || mode === 'rest';
    const busy = swinging || mode === 'trip' || mode === 'soak' || mode === 'post';

    // Vault: plant the pole and arc over.
    if (mode === 'vault') {
      const u = clamp(modeT / VAULT.time, 0, 1);
      body.vx = vaultDir * VAULT.dist / VAULT.time;
      body.vy = -VAULT.height * Math.PI / VAULT.time * Math.cos(Math.PI * u);
      const ev = kit.stepBody(body, solids, dt, { gravity: 0 });
      if (ev.bumped) body.vx = 0;
      if (modeT >= VAULT.time || (ev.landed && u > 0.5)) {
        // Landing takes the speed out of him: he strides on from a standstill.
        mode = 'free'; modeT = 0;
        body.vy = Math.max(0, body.vy);
        body.vx = vaultDir * SPEED * 0.5;
        if (ev.landed) { art.kick(gc, 0.5); env.sfx('land'); fx.burst(body.x, body.y, { n: 8, colour: '#c9bca0', speed: 200, size: 10 }); shake(3); }
      }
    } else {
      // Striding.
      highStep = !busy && onGround && (inp.y || 0) < -0.5 && Math.abs(inp.x || 0) > 0.2;
      const want = busy ? 0 : (inp.x || 0) * SPEED * (highStep ? HIGH_STEP : 1);
      const acc = want === 0 || Math.sign(want) !== Math.sign(body.vx) ? DECEL : ACCEL;
      body.vx = approach(body.vx, want, (onGround ? acc : acc * 0.5) * dt);
      if (mode === 'trip') body.vx = approach(body.vx, 0, 400 * dt);

      // Start a vault: sprint while striding on the ground (a run-up).
      if (!busy && sprintEdge && onGround && Math.abs(body.vx) >= VAULT.minSpeed) {
        mode = 'vault'; modeT = 0; vaultDir = Math.sign(body.vx);
        env.sfx('swoosh'); env.sfx('jump');
        art.kick(gc, -0.3);
        fx.burst(body.x, body.y, { n: 6, colour: '#c9bca0', speed: 180, size: 9 });
      } else if (!busy && inp.actionPressed) {
        // Post, or swing.
        if (phase === 'carry' && onGround && Math.abs(body.x - MAIL_X) < 170) {
          mode = 'post'; modeT = 0; body.vx = 0; gc.facing = 1;
          env.sfx('page');
        } else if (onGround || airT < 0.25) {
          mode = 'windup'; modeT = 0;
          swingKind = (inp.y || 0) < -0.5 ? 'netUp' : (inp.y || 0) > 0.5 ? 'netLow' : 'swing';
          art.kick(gc, -0.15);
        }
      }
      const ev = kit.stepBody(body, solids, dt, { gravity: 3000 });
      if (ev.landed) {
        if (body.ground?.bouncy) {
          body.vy = -BOUNCE_V; body.onGround = false; body.ground = null;
          env.sfx('boing'); art.kick(gc, -0.5);
          fx.burst(body.x, body.y, { n: 8, colour: '#e8c9c9', speed: 220, size: 10 });
          body.bounced = 0.3;
        } else {
          art.kick(gc, Math.min(0.7, ev.landed / 2000));
          if (ev.landed > 500) { env.sfx('land'); fx.burst(body.x, body.y, { n: 6, colour: '#c9bca0', speed: 160, size: 9 }); }
          if (ev.landed > 1200) shake(4);
        }
      }
      if (ev.bumped && mode === 'free' && onGround && Math.abs(inp.x || 0) > 0.2 && !body.bumpSaid) { body.bumpSaid = true; hints.say('Sprint while striding to vault the log', 2.5); }
    }
    // Walking into a toadstool's stalk bounces him too (not only landing on it).
    if (mode !== 'vault' && body.onGround && body.y >= GY - 1 && Math.abs(body.vx) > 40) {
      for (const tx of TOADSTOOLS) if (Math.abs(body.x - tx) < 60) {
        body.vy = -BOUNCE_V; body.onGround = false; body.ground = null; body.y -= 2;
        env.sfx('boing'); art.kick(gc, -0.5);
        fx.burst(body.x, body.y, { n: 8, colour: '#e8c9c9', speed: 220, size: 10 });
        body.bounced = 0.3;
        break;
      }
    }
    body.bounced = Math.max(0, (body.bounced || 0) - dt);
    airT = body.onGround ? 0 : airT + dt;
    body.x = clamp(body.x, 60, WORLD_W - 60);

    // Striding over a root's middle trips him; a high step or a vault clears it.
    if (body.onGround && body.y >= GY - 1 && mode !== 'vault' && !highStep && Math.abs(body.vx) > 60 && immune <= 0 && mode !== 'trip' && mode !== 'soak' && prevX !== undefined) {
      for (const rx of ROOTS) if ((prevX - rx) * (body.x - rx) <= 0 && Math.abs(body.x - rx) < ROOT_HALF) { trip('Oof! A root'); hints.say('Hold Up to step high over a root, or vault it', 2.5); break; }
    }
    prevX = body.x;
    // Into a stream.
    if (body.y > GY + 230 && mode !== 'soak') soak();

    catchFlock();
    cps.reach(body.x);
    if (cps.last !== body.lastCp) { if (body.lastCp !== undefined && cps.last > 0) { env.sfx('checkpoint'); fx.pop(cps.last, GY - 260, 'Signpost!', { colour: '#5a6a2e', size: 36 }); } body.lastCp = cps.last; }

    // Animation.
    gc.x = body.x; gc.y = body.y;
    art.animate(gc, dt, mode === 'vault' ? 0 : body.vx, 0);
    if (mode === 'vault') gc.facing = vaultDir;
    gc.rot = 0; gc.z = 0;
    const sp = Math.abs(body.vx);
    switch (mode) {
      case 'windup': art.setAnim(gc, 'windup'); break;
      case 'sweep':
        art.setAnim(gc, swingKind);
        { const h = hoopFor(swingKind); gc.rot = h.rot * gc.facing; gc.z = h.hop; }
        break;
      case 'slam': art.setAnim(gc, 'slam'); break;
      case 'rest': art.setAnim(gc, 'slam'); break;
      case 'trip': case 'soak': art.setAnim(gc, 'trip'); break;
      case 'post': art.setAnim(gc, 'post'); break;
      case 'vault': {
        art.setAnim(gc, 'vault');
        const u = modeT / VAULT.time;
        gc.animT = (u < 0.22 ? 0 : u < 0.78 ? 1 : 2) / 4 + 0.01;
        break;
      }
      default:
        if (!body.onGround) { art.setAnim(gc, body.bounced || body.vy < 0 ? 'vault' : 'stride'); if (gc.anim === 'vault') gc.animT = 1 / 4 + 0.01; }
        else if (phase === 'carry') { art.setAnim(gc, 'carry'); if (sp > 30) gc.z = Math.abs(Math.sin(gc.dist / 90 * Math.PI)) * 10; }
        else if (highStep && sp > 30 && ROOTS.some((rx) => Math.abs(rx - body.x) < 110)) art.setAnim(gc, 'stepHigh');
        else if (highStep && sp > 30) art.setAnim(gc, 'stride');
        else art.setAnim(gc, sp > 30 ? 'stride' : 'idle');
    }
  }

  // ---------- the flock ----------
  function updateFlock(dt) {
    for (const b of flock) {
      b.t += dt;
      if (b.got) continue;
      if (!cam.sees(b.x, b.x, 500)) continue;
      b.c.animT += dt;
      const k = b.t * b.speed + b.phase;
      switch (b.pat) {
        case 'patrol': b.cx = Math.sin(k * 1.1) * b.span; b.cy = Math.sin(k * 3.1) * 14; break;
        case 'skim': b.cx = Math.sin(k * 1.4) * b.span; b.cy = Math.abs(Math.sin(k * 2.6)) * 18; break;
        case 'circle': b.cx = Math.cos(k * 1.6) * b.amp * 1.4; b.cy = Math.sin(k * 1.6) * b.amp; break;
        default: b.cx = Math.sin(k * 0.9) * 18; b.cy = Math.sin(k * 2.4) * b.amp;
      }
      b.facing = Math.cos(k * (b.pat === 'patrol' ? 1.1 : b.pat === 'skim' ? 1.4 : 1.6)) * (b.pat === 'circle' ? -1 : 1) >= 0 ? 1 : -1;
    }
  }

  // ---------- the letter Bombanat ----------
  function updateBomb(dt) {
    const c = bomb.c;
    bomb.dodgeCool = Math.max(0, bomb.dodgeCool - dt);
    if (bomb.mode === 'netted') {
      bomb.t += dt;
      // In the net, then under his arm.
      bomb.x = body.x; bomb.y = body.y - 150;
      art.setAnim(c, 'netted');
      art.animate(c, dt, 0, 0);
      return;
    }
    let tx, ty;
    if (bomb.mode === 'tease') {
      bomb.dipT += dt;
      const dip = bomb.dipT % 4.5 < 1.1 ? 70 : 0;
      tx = clamp(body.x + 640, 900, CLEAR.x0 + 350);
      ty = GY - 430 + dip + Math.sin(t * 2.2) * 26;
      if (body.x > CLEAR.x0 - 300 || bomb.x > CLEAR.x0 + 200) { bomb.mode = 'loop'; bomb.loopT = 0; }
    } else {
      // A figure-eight round the clearing's middle, low enough to net.
      bomb.loopT += dt * (bomb.dodgeT > 0 ? -1.6 : 1) * (gentle ? 0.85 : 1);
      const k = bomb.loopT * (Math.PI * 2 / 7);
      tx = LOOP.x + Math.sin(k) * LOOP.ax;
      ty = GY - 240 + Math.sin(k * 2) * 110;
      // It sees the net wound up close by and darts (its skill).
      if (mode === 'windup' && modeT < 0.03 && bomb.dodgeCool <= 0 && Math.abs(body.x - bomb.x) < 300) {
        bomb.dodgeCool = 2.2;
        if (env.rng() < 0.2 + 0.4 * skill) { bomb.dodgeT = 0.45; env.sfx('dodge'); fx.pop(bomb.x, bomb.y - 150, 'Ha!', { colour: '#5a3a6a', size: 36, life: 0.7 }); }
      }
      bomb.dodgeT = Math.max(0, bomb.dodgeT - dt);
    }
    const rate = bomb.mode === 'tease' ? 2.6 : 6;
    const nx = ease(bomb.x, tx, rate, dt), ny = ease(bomb.y, ty, rate, dt);
    bomb.vx = (nx - bomb.x) / Math.max(dt, 1e-3); bomb.vy = (ny - bomb.y) / Math.max(dt, 1e-3);
    bomb.x = nx; bomb.y = ny;
    if (Math.abs(bomb.vx) > 30) bomb.facing = Math.sign(bomb.vx);
    c.x = bomb.x; c.y = bomb.y;
    art.animate(c, dt, 0, 0);
    c.facing = bomb.facing;
    art.setAnim(c, bomb.dodgeT > 0 ? 'dive' : 'flap');
    c.M.anims.flap.fps = bomb.mode === 'loop' ? 12 : 9;
  }

  // ---------- the Trollusk ----------
  function updateTro(dt) {
    const c = tro.c;
    tro.t += dt;
    if (tro.netted) { tro.x = body.x; tro.y = body.y; return; }
    if (phase !== 'carry') { tro.x = FERNS[0]; return; }
    const fern = FERNS[tro.fern];
    const warnT = gentle ? 1.0 : 0.75;
    const pounceSpeed = gentle ? 480 : 640;
    switch (tro.mode) {
      case 'hide':
        tro.x = fern; tro.vx = 0;
        if (fern !== undefined && body.x > fern - 620 && body.x < fern - 120 && body.vx > -20 && body.y >= GY - 1) { tro.mode = 'warn'; tro.t = 0; env.sfx('rustle'); env.sfx('eye'); }
        break;
      case 'warn':
        tro.x = fern;
        if (tro.t >= warnT) { tro.mode = 'pounce'; tro.t = 0; tro.vx = -pounceSpeed; env.sfx('gabble'); env.sfx('dodge'); fx.pop(fern, GY - 230, 'Snerk!', { colour: '#33241a', size: 36 }); }
        break;
      case 'pounce':
        tro.x += tro.vx * dt;
        if (tro.t >= 0.75 || tro.x < body.x - 260) { tro.mode = 'gloat'; tro.t = 0; tro.vx = 0; }
        break;
      case 'gloat':
        if (tro.t >= 0.5) { tro.mode = 'run'; tro.t = 0; tro.fern++; }
        break;
      case 'run': {
        const next = FERNS[tro.fern];
        const goal = next ?? WORLD_W + 400;
        tro.vx = 720;
        tro.x += tro.vx * dt;
        if (tro.x >= goal) { tro.x = goal; tro.vx = 0; tro.mode = next === undefined ? 'gone' : 'hide'; tro.t = 0; }
        break;
      }
    }
    // The tackle: his feet under the Grithix's.
    if ((tro.mode === 'pounce' || tro.mode === 'gloat') && body.onGround && body.y >= GY - 1 && mode !== 'vault' && immune <= 0 && Math.abs(tro.x - body.x) < 75 && mode !== 'trip') {
      trip('Tripped!');
      tro.mode = 'gloat'; tro.t = 0; tro.vx = 0;
    }
    c.x = tro.x; c.y = tro.y;
    art.animate(c, dt, tro.vx, 0);
    if (tro.mode === 'pounce') c.facing = -1; else if (tro.mode === 'run') c.facing = 1; else c.facing = -1;
    art.setAnim(c, tro.mode === 'pounce' ? 'skid' : tro.mode === 'gloat' ? 'celebrate' : tro.mode === 'run' ? 'run' : tro.mode === 'warn' ? 'eye' : 'idle');
  }

  // ---------- the Yalapappus ----------
  function updateYal(dt) {
    const c = yal.c;
    yal.t += dt;
    if (yal.netted) { yal.x = body.x; yal.y = body.y; return; }
    const rollSpeed = gentle ? 430 : 540;
    switch (yal.mode) {
      case 'away':
        if (phase === 'carry' && yal.rolls < ROLL_AT.length && body.x > ROLL_AT[yal.rolls]) {
          yal.mode = 'warn'; yal.t = 0; yal.x = Math.min(cam.x + W + 150, MAIL_X - 300); yal.rolls++;
          env.sfx('gust');
          fx.pop(Math.min(cam.x + W - 160, MAIL_X - 400), GY - 360, 'GRIMM!', { colour: '#8a6a1a', size: 50, life: 1.1 });
        }
        break;
      case 'warn':
        yal.x = Math.min(cam.x + W + 150, MAIL_X - 300);
        if (!env.reduceMotion && Math.floor(yal.t * 20) % 4 === 0) fx.burst(cam.x + W - 40, GY, { n: 2, colour: '#c9bca0', speed: 120, size: 10, life: 0.5 });
        if (yal.t >= (gentle ? 1.1 : 0.85)) { yal.mode = 'roll'; yal.t = 0; yal.vx = -rollSpeed; env.sfx('whoosh'); }
        break;
      case 'roll':
        yal.x += yal.vx * dt;
        if (yal.x < body.x - 560) { yal.mode = 'dizzy'; yal.t = 0; yal.vx = 0; env.sfx('thump'); }
        break;
      case 'dizzy':
        if (yal.t >= 1.3) { yal.mode = 'away'; yal.t = 0; }
        break;
    }
    // The ball bounces over logs and streams rather than through them.
    let hop = 0;
    if (yal.mode === 'roll') {
      for (const [x0, x1] of [...LOGS.map((x) => [x - LOG_W / 2 - 90, x + LOG_W / 2 + 90]), ...streams.map((s) => [s.x0 - 90, s.x1 + 90])]) {
        if (yal.x > x0 && yal.x < x1) hop = Math.max(hop, Math.sin(((yal.x - x0) / (x1 - x0)) * Math.PI) * 180);
      }
      hop += Math.abs(Math.sin(yal.t * 9)) * 14;
    }
    if (yal.mode === 'roll' && hop < 120 && body.onGround && body.y >= GY - 1 && mode !== 'vault' && immune <= 0 && mode !== 'trip' && Math.abs(yal.x - body.x) < 110) {
      trip('Bowled over!');
    }
    c.x = yal.x; c.y = yal.y; c.z = hop;
    art.animate(c, dt, yal.vx, 0);
    c.facing = -1;
    art.setAnim(c, yal.mode === 'roll' ? 'ball' : yal.mode === 'dizzy' ? 'dizzy' : 'shout');
  }

  // ---------- the board ----------
  const self = {
    time: kit.boardTime(env, TIME),
    done: false,
    outcome: null,
    outroTime: 2.2,
    // For the autopilot and the tests.
    get body() { return body; },
    get mode() { return mode; },
    get phase() { return phase; },
    get flock() { return flock; },
    get bomb() { return bomb; },
    get tro() { return tro; },
    get yal() { return yal; },
    get bag() { return bag; },
    get got() { return got; },
    get facing() { return gc.facing; },
    LOOP,
    get trips() { return trips; },
    get soaks() { return soaks; },
    cam, solids, streams, cps, GY, MAIL_X, CLEAR, ROOTS, LOGS, TOADSTOOLS, BRANCHES, VAULT, HOOP, hoopAt, hoopFor,
    update(dt, inS) {
      t += dt;
      fx.update(dt);
      bagShake = Math.max(0, bagShake - dt * 2);
      letterFlash = Math.max(0, letterFlash - dt);
      for (const j of jarsFlying) j.t += dt;
      for (let i = jarsFlying.length - 1; i >= 0; i--) if (jarsFlying[i].t > 0.7) jarsFlying.splice(i, 1);
      if (self.done) {
        outroT += dt;
        gc.x = body.x; gc.y = body.y;
        art.animate(gc, dt, 0, 0);
        art.setAnim(gc, self.outcome === 'snatched' ? (outroT < 0.5 ? 'post' : 'celebrate') : 'idle');
        for (const o of [tro, yal]) { art.animate(o.c, dt, 0, 0); if (!o.netted) art.setAnim(o.c, self.outcome === 'snatched' ? 'wail' : 'celebrate'); }
        if (bomb.mode !== 'netted') { art.animate(bomb.c, dt, 0, 0); art.setAnim(bomb.c, self.outcome === 'snatched' ? 'stall' : 'celebrate'); }
        cam.follow(body.x, 0, dt);
        return;
      }
      self.time = Math.max(0, self.time - dt);
      updatePlayer(dt, inS || {});
      updateFlock(dt);
      updateBomb(dt);
      updateTro(dt);
      updateYal(dt);
      hints.update(dt, body.x);
      cam.follow(body.x, body.vx, dt);
      if (self.time <= 0 && !self.done) {
        self.done = true; self.outcome = 'kept'; outroT = 0;
        env.sfx('aww');
      }
    },
    draw(g, tt) {
      if (art.image('adv/b09/backdrop-1')) kit.drawBackdrop(g, cam, { panels: ['adv/b09/backdrop-1', 'adv/b09/backdrop-2', 'adv/b09/backdrop-3'] });
      else drawSceneStrip(g);
      kit.haze(g, 'rgba(236,228,206,0.22)');
      cam.begin(g);
      drawWorld(g, tt);
      cam.end(g);
      // Screen overlays.
      kit.route(g, {
        you: body.x / WORLD_W,
        letter: (phase === 'collect' ? bomb.x : body.x) / WORLD_W,
        signs: cps.fracs(WORLD_W),
      });
      hints.draw(g);
      drawShelf(g, tt);
    },
    marks() {
      const feat = self.outcome === 'snatched' && postedWith?.has('bombanat') && postedWith.has('trollusk') && postedWith.has('yalapappus');
      return kit.boardMarks({ snatched: self.outcome === 'snatched', got: flock.filter((f) => f.got).length, total: TOTAL, feat });
    },
    hud() {
      const jars = `Jars ${got}/${TOTAL}`;
      if (self.done || phase === 'collect') return jars;
      return `Post it! · ${jars}`;
    },
    focus() { return [{ x: body.x - cam.x, y: body.y - 150 }]; },
  };

  // ---------- drawing the world ----------
  const INK = '#2b1d14';
  // The stand-in far layer: the clearing painting without its mailbox (the
  // left 1500 px of it), repeated and mirrored every other time, scrolling
  // slowly; a plain wash when even that is missing.
  function drawSceneStrip(g) {
    const img = art.image('scenes/grithix');
    if (!img) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d9c8dc'); gr.addColorStop(0.6, '#e8dcc4'); gr.addColorStop(1, '#a8a070'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return; }
    const sw = 1500 * (img.width / W), tw = 1500;
    const off = cam.x * 0.3;
    const i0 = Math.floor(off / tw);
    for (let i = i0; i <= i0 + 2; i++) {
      const x = i * tw - off;
      if (x > W) break;
      g.save();
      if (i % 2) { g.translate(x + tw, 0); g.scale(-1, 1); g.drawImage(img, 0, 0, sw, img.height, 0, 0, tw + 1, H); }
      else g.drawImage(img, 0, 0, sw, img.height, x, 0, tw + 1, H);
      g.restore();
    }
  }

  // Small ferns, roots and stones along the ground, from the delivered props,
  // placed by hash so they stay put: the mossy floor is never a bare band.
  function drawGroundDecor(g) {
    const x0 = Math.floor((cam.x - 200) / 260) * 260;
    for (let x = x0; x < cam.x + W + 200; x += 260) {
      const h1 = kit.hash(x * 0.37), h2 = kit.hash(x * 0.91);
      const xx = x + h1 * 200;
      if (kit.groundAt(solids, xx, GY - 10) !== GY) continue;
      if (h2 < 0.35) art.drawSprite(g, art.prop('grithix', 4), xx, GY + 8, { height: 70 + h1 * 40, flip: h2 < 0.17 });
      else if (h2 < 0.55) art.drawSprite(g, art.prop('grithix', 5), xx, GY + 6, { height: 50 + h1 * 20, flip: h2 > 0.45, alpha: 0.9 });
      // Stones and tufts in the ground body below the moss.
      inkStones(g, xx + 60, GY + 70 + h2 * 120, h1);
    }
  }

  function drawWorld(g, tt) {
    // Far: tall trunks and stumps with faces, behind everything.
    for (const x of TRUNKS) {
      if (!cam.sees(x - 500, x + 500)) continue;
      // The delivered piece is a tree's foot (roots, ivy, a face), cut off at
      // the top: a plain bark column behind it carries the trunk out of frame.
      if (art.sprite('terrain.wood', 6)) { inkTrunkColumn(g, x, GY - 300, 300); art.drawSprite(g, art.sprite('terrain.wood', 6), x, GY + 14, { height: 440, flip: kit.hash(x) > 0.5 }); }
      else inkTrunk(g, x, GY + 20, { height: 1000 });
    }
    for (const x of MOUNDS) if (cam.sees(x - 300, x + 300)) kit.sprite(g, 'terrain.wood', 5, x, GY + 8, { height: 120 }, () => {});
    for (const x of LOW_LOGS) if (cam.sees(x - 300, x + 300)) kit.sprite(g, 'terrain.wood', 3, x, GY + 8, { height: 96, flip: x > 5000 }, () => {});
    // Streams in the gaps, under the ground's edges.
    for (const s of streams) {
      if (!cam.sees(s.x0 - 300, s.x1 + 300)) continue;
      // The delivered gap: two banks and the stream between; its banks reach
      // under the ground either side (the ground strip is drawn over them).
      const gw = s.x1 - s.x0;
      kit.sprite(g, 'adv.b09.props', 6, (s.x0 + s.x1) / 2, GY, { height: gw * 2.9 * (269 / 309), ay: 0.145 }, () => drawStream(g, s, tt));
    }
    // The ground and the logs.
    for (const s of solids) {
      if (!cam.sees(s.x, s.x + s.w)) continue;
      if (s.kind === 'ground') {
        kit.drawGround(g, cam, s, { sheet: 'terrain.wood', item: 1, height: 320, lift: 134, fill: '#5a4630', standin: { top: '#8a9a4e', body: '#6e5a3c', ink: INK } });
        if (!art.sprite('terrain.wood', 1)) groundTexture(g, s, Math.max(s.x, cam.x - 40), Math.min(s.x + s.w, cam.x + W + 40));
      }
      else if (s.kind === 'log') kit.sprite(g, 'adv.b09.props', 8, s.x + s.w / 2, s.y + s.h + 8, { height: s.h + 28 }, (g2, x, y) => inkLog(g2, x, y - 8, s.w + 24, s.h));
      else if (s.kind === 'branch') kit.sprite(g, 'terrain.wood', 2, s.x - 60, s.y, { scale: (s.w + 90) / 1375, ax: 0, ay: 0.24 }, (g2, x, y) => inkBranch(g2, x + 60, y, s.w));
    }
    if (!art.sprite('terrain.wood', 1)) drawGroundDecor(g);
    for (const x of STUMPS) if (cam.sees(x - 250, x + 250)) kit.sprite(g, 'terrain.wood', 4, x, GY + 6, { height: 140 }, inkStump);
    for (const x of HOLLOWS) if (cam.sees(x)) kit.sprite(g, 'adv.b09.props', 12, x, GY + 6, { height: 150 }, () => {});
    for (const x of ROCKS) if (cam.sees(x)) kit.sprite(g, 'adv.b09.props', 11, x, GY + 6, { height: 110 }, () => {});
    for (const x of ROOTS) if (cam.sees(x)) kit.sprite(g, 'adv.b09.props', 4, x, GY + 10, { height: 110 }, (g2, xx, yy) => art.drawSprite(g2, art.prop('grithix', 5), xx, yy, { height: 110 }) || inkRoot(g2, xx, yy));
    for (const x of TOADSTOOLS) if (cam.sees(x)) kit.sprite(g, 'adv.b09.props', 5, x, GY + 4, { height: 124, sy: body.bounced && Math.abs(body.x - x) < 120 ? 0.85 : 1 }, (g2, xx, yy, o) => inkToadstool(g2, xx, yy, o));
    // Signposts.
    for (const x of cps.list) if (x > 0 && cam.sees(x)) inkSignpost(g, x + 40, GY + 4, cps.list.indexOf(x), tt);
    // The mailbox and the ferns behind the action.
    if (cam.sees(MAIL_X)) kit.sprite(g, 'adv.b09.props', 9, MAIL_X, GY + 8, { height: 260 }, (g2, x, y) => art.drawSprite(g2, art.prop('grithix', 1), x, y, { height: 260 }) || inkMailbox(g2, x, y));
    if (phase === 'carry' && !self.done && cam.sees(MAIL_X)) {
      const ready = Math.abs(body.x - MAIL_X) < 170 && body.onGround;
      if (ready) actionPrompt(g, MAIL_X, GY - 290, 'Mail it!', { kind: env.inputKind || 'keyboard', t: tt, pulse: 1 });
      else marker(g, MAIL_X, GY - 300, { t: tt, label: 'The official mailbox' });
    }
    for (const x of DECOR_FERNS) if (cam.sees(x)) drawFern(g, x, GY + 12, 150, 0);
    // The Trollusk's ferns, and his warning.
    FERNS.forEach((x, i) => {
      if (!cam.sees(x)) return;
      const warn = tro.mode === 'warn' && tro.fern === i && !tro.netted;
      const sh = warn ? Math.sin(tt * 30) * 0.06 : 0;
      drawFern(g, x, GY + 12, 175, sh);
      if (warn) eyeBubble(g, x, GY - 200, tro.t / 0.75, tt);
    });
    // The creatures, back to front.
    if (!tro.netted && (phase === 'carry' || self.done) && (tro.mode === 'pounce' || tro.mode === 'gloat' || tro.mode === 'run' || self.done) && cam.sees(tro.x)) {
      if (self.done && tro.mode !== 'gone') { tro.c.x = Math.min(tro.x, MAIL_X - 160); tro.c.y = GY; }
      art.drawCreature(g, tro.c, tt, { reduceMotion: env.reduceMotion });
    }
    if (!yal.netted && (yal.mode === 'roll' || yal.mode === 'dizzy' || self.done) && cam.sees(yal.x)) {
      if (self.done) { yal.c.x = MAIL_X + 150; yal.c.y = GY; }
      art.drawCreature(g, yal.c, tt, { reduceMotion: env.reduceMotion });
    }
    // The plain Bombanats.
    for (const b of flock) {
      if (!cam.sees(b.x, b.x, 300)) continue;
      if (b.got && b.t >= 0.5) continue;
      const c = b.c;
      c.x = b.x + b.cx; c.y = b.y + b.cy - (b.got ? b.t * 120 : 0);
      c.facing = b.facing || 1;
      c.alpha = b.got ? 1 - b.t * 2 : 1;
      if (b.got) { art.setAnim(c, 'netted'); } else art.setAnim(c, b.pat === 'skim' ? 'glide' : 'flap');
      art.drawCreature(g, c, tt, { reduceMotion: env.reduceMotion, shadow: false });
    }
    // The letter Bombanat (in the net or free), and the player.
    const grithixFirst = bomb.mode === 'netted';
    if (!grithixFirst && cam.sees(bomb.x)) drawBomb(g, tt);
    drawPlayer(g, tt);
    if (grithixFirst && (mode === 'sweep' || mode === 'slam' || mode === 'rest') && bomb.t < 0.9) {
      // Flapping in the hoop for a moment.
      const hp = hoopAt() || { x: body.x + gc.facing * 80, y: body.y - 60 };
      bomb.c.x = hp.x; bomb.c.y = hp.y + 40;
      art.drawCreature(g, bomb.c, tt, { reduceMotion: env.reduceMotion, shadow: false });
    }
    fx.draw(g);
    // Foreground ferns, passing faster for depth.
    g.save();
    g.translate(-cam.x * 0.35, 0);
    for (let x = Math.floor((cam.x * 1.35 - 400) / 1500) * 1500; x < cam.x * 1.35 + W + 500; x += 1500) {
      const wob = kit.hash(x) * 300;
      drawFern(g, x + wob, H + 30, 300, Math.sin(tt * 0.9 + x) * 0.02, 0.92);
    }
    g.restore();
  }

  function drawPlayer(g, tt) {
    // Ground shadow under him when he is in the air.
    if (!body.onGround) {
      const gy = kit.groundAt(solids, body.x, body.y - 4) ?? GY;
      g.save(); g.globalAlpha = 0.16; g.fillStyle = INK;
      g.beginPath(); g.ellipse(body.x, gy, 90 * Math.max(0.5, 1 - (gy - body.y) / 600), 16, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    gc.alpha = immune > 0 && Math.floor(tt * 14) % 2 ? 0.5 : 1;
    art.drawCreature(g, gc, tt, { reduceMotion: env.reduceMotion, shadow: body.onGround });
    // What he carries: the letter over his head in part two; the bag's catch.
    if (phase === 'carry' && !self.done) letterTag(g, body.x + gc.facing * 10, body.y - gc.z - 350, { t: tt, r: letterFlash > 0 ? 46 + letterFlash * 30 : 46 });
  }

  function drawBomb(g, tt) {
    const c = bomb.c;
    // Shadow on the ground below.
    const gy = kit.groundAt(solids, bomb.x, bomb.y) ?? GY + 60;
    g.save(); g.globalAlpha = 0.14; g.fillStyle = INK;
    g.beginPath(); g.ellipse(bomb.x, gy, 50, 10, 0, 0, Math.PI * 2); g.fill(); g.restore();
    c.x = bomb.x; c.y = bomb.y;
    art.drawCreature(g, c, tt, { reduceMotion: env.reduceMotion, shadow: false });
    if (phase === 'collect') {
      letterTag(g, bomb.x, bomb.y - 125, { t: tt, r: 40 });
      if (bomb.mode === 'loop') marker(g, bomb.x, bomb.y - 185, { t: tt, label: 'Net it!', size: 0.8 });
    }
  }

  // The jar shelf along the bottom, middle-left so a phone held upright keeps
  // it in view: the bag's three, and the plain ones counted.
  function drawShelf(g, tt) {
    const x0 = W / 2 - 400, y = H - 22;
    g.save();
    // The plank.
    g.fillStyle = '#8a6a44'; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.roundRect ? g.roundRect(x0, y - 14, 470, 18, 6) : g.rect(x0, y - 14, 470, 18); g.fill(); g.stroke();
    g.fillStyle = '#6b5236'; g.fillRect(x0 + 24, y + 4, 10, 14); g.fillRect(x0 + 436, y + 4, 10, 14);
    // Three jars for the bag.
    const slots = [['bombanat', bomb.c], ['trollusk', tro.c], ['yalapappus', yal.c]];
    slots.forEach(([id, c], i) => {
      const x = x0 + 62 + i * 92, jy = y - 14;
      const inJar = bag.has(id);
      const wob = inJar && bagShake > 0 ? Math.sin(tt * 40) * 3 : 0;
      kit.sprite(g, 'adv.b09.props', 2, x + wob, jy, { height: 96, alpha: inJar ? 1 : 0.5 }, (g2, xx, yy, o) => art.drawSprite(g2, art.prop('grithix', 2), xx, yy, o) || inkJar(g2, xx, yy, 96, o.alpha));
      if (inJar) {
        const s = { ...c, x: x + wob, y: jy - 16 + Math.sin(tt * 7 + i) * 2, z: 0, sizeK: 0.2, facing: Math.sin(tt * 2 + i) > 0 ? 1 : -1, sq: 0, lean: 0, rot: 0, flash: 0, alpha: 1, anim: id === 'bombanat' ? 'netted' : id === 'trollusk' ? 'jolt' : 'bonked', animT: 0 };
        art.drawCreature(g, s, tt, { reduceMotion: true, shadow: false });
        kit.sprite(g, 'adv.b09.props', 2, x + wob, jy, { height: 96, alpha: 0.35 }, () => {});
      }
    });
    // The plain Bombanats: one jar and a count.
    const jx = x0 + 350, jy = y - 14;
    const pulse = jarsFlying.some((j) => j.t > 0.55) ? 1.12 : 1;
    kit.sprite(g, 'adv.b09.props', got ? 3 : 2, jx, jy, { height: 96 * pulse }, (g2, xx, yy, o) => art.drawSprite(g2, art.prop('grithix', got ? 3 : 2), xx, yy, o) || inkJar(g2, xx, yy, 96 * pulse, 1));
    g.font = '800 40px Fraunces, Georgia, serif';
    g.textAlign = 'left';
    g.lineWidth = 8; g.strokeStyle = 'rgba(248,241,224,0.95)'; g.fillStyle = '#33241a';
    const label = `${got}/${TOTAL}`;
    g.strokeText(label, jx + 50, y - 40); g.fillText(label, jx + 50, y - 40);
    // Jars flying to the shelf.
    for (const j of jarsFlying) {
      const u = Math.min(1, j.t / 0.6);
      const e = u * u * (3 - 2 * u);
      const x = j.sx + (jx - j.sx) * e, yy = j.sy + (jy - 40 - j.sy) * e - Math.sin(u * Math.PI) * 160;
      kit.sprite(g, 'adv.b09.props', 3, x, yy, { height: 64, rot: (1 - u) * 0.6 }, (g2, xx, y2, o) => art.drawSprite(g2, art.prop('grithix', 3), xx, y2, o) || inkJar(g2, xx, y2, 64, 1));
    }
    g.restore();
  }

  return self;
}

// Where art.js anchors a walker's pose: the middle of its feet (the bottom
// rows of the drawing), measured from the image's alpha, pulled 85% of the
// way from the middle. The same sums as art.js's anchorX, so the hoop sits
// exactly where it is drawn. (Suggestion: export anchorX from art.js.)
const feetCache = new WeakMap();
function feetAnchor(sp) {
  let m = feetCache.get(sp.img);
  if (m === undefined) {
    m = null;
    try {
      const w = 64, h = Math.max(8, Math.round((64 * sp.h) / sp.w));
      const cv = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
      const cg = cv.getContext('2d', { willReadFrequently: true });
      cg.drawImage(sp.img, 0, 0, w, h);
      const d = cg.getImageData(0, 0, w, h).data;
      let fx = 0, fn = 0, mx = 0, mn = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3];
        if (a < 60) continue;
        mx += x; mn++;
        if (y >= h * 0.72) { fx += x; fn++; }
      }
      if (mn) m = (fn ? (fx / fn + 0.5) / w : (mx / mn + 0.5) / w);
    } catch { m = null; }
    feetCache.set(sp.img, m);
  }
  return m === null ? 0.5 : 0.5 + (m - 0.5) * 0.85;
}

// ---------- stand-ins in ink ----------

const INK = '#2b1d14';

function drawFern(g, x, y, h, lean, alpha = 1) {
  const sp = art.sprite('adv.b09.props', 7) || art.prop('grithix', 4);
  if (sp) { art.drawSprite(g, sp, x, y, { height: h, rot: lean, alpha }); return; }
  g.save();
  g.translate(x, y); g.rotate(lean);
  g.globalAlpha *= alpha;
  g.strokeStyle = INK; g.lineWidth = 3; g.fillStyle = '#6f8a3e';
  for (let i = -3; i <= 3; i++) {
    const a = i * 0.32;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(Math.sin(a) * h * 0.5, -h * 0.55, Math.sin(a) * h * 0.7, -h * (1 - Math.abs(i) * 0.1));
    g.quadraticCurveTo(Math.sin(a) * h * 0.55 + 16, -h * 0.5, 14, 0);
    g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

function inkRoot(g, x, y) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#8a6e52';
  g.beginPath();
  g.moveTo(x - 80, y); g.quadraticCurveTo(x - 40, y - 110, x + 10, y - 80); g.quadraticCurveTo(x + 50, y - 60, x + 80, y);
  g.lineTo(x + 56, y); g.quadraticCurveTo(x + 40, y - 36, x + 6, y - 50); g.quadraticCurveTo(x - 30, y - 70, x - 54, y);
  g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function inkLog(g, x, y, w, h) {
  g.save();
  g.fillStyle = '#8a6e52'; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - h, w, h, h / 2) : g.rect(x - w / 2, y - h, w, h); g.fill(); g.stroke();
  g.fillStyle = '#c9b48a'; g.beginPath(); g.ellipse(x + w / 2 - 4, y - h / 2, 16, h / 2 - 2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(43,29,20,0.4)'; g.lineWidth = 2;
  g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(x - w / 2 + 20, y - h + i * (h / 4)); g.lineTo(x + w / 2 - 30, y - h + i * (h / 4) + 4); } g.stroke();
  g.fillStyle = '#7d8a4a'; g.beginPath(); g.ellipse(x - w / 4, y - h + 2, 40, 10, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

// The mossy floor's texture over the kit's ink ground: tufts and little ferns
// along the edge, an earth band, strata and hatching in the body.
function groundTexture(g, s, x0, x1) {
  if (x1 <= x0) return;
  g.save();
  g.beginPath(); g.rect(s.x, s.y - 30, s.w, 400); g.clip();
  // A darker earth band under the moss, with a wobbly edge.
  g.fillStyle = 'rgba(70,50,30,0.28)';
  g.beginPath(); g.moveTo(x0, s.y + 30);
  for (let x = x0; x <= x1 + 24; x += 24) g.lineTo(x, s.y + 30 + kit.hash(x * 0.3) * 14);
  g.lineTo(x1, s.y + 90); g.lineTo(x0, s.y + 90); g.closePath(); g.fill();
  // Strata lines and hatching.
  g.strokeStyle = 'rgba(43,29,20,0.45)'; g.lineWidth = 1.8;
  g.beginPath();
  for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) {
    for (let k = 0; k < 3; k++) { const yy = s.y + 60 + k * 55 + kit.hash(x + k) * 20; g.moveTo(x, yy); g.quadraticCurveTo(x + 30, yy + 6, x + 56, yy - 2); }
  }
  g.stroke();
  hatch(g, x0, s.y + 36, x1 - x0, 170, { step: 12, alpha: 0.38, slope: 1.2 });
  // Moss tufts and root squiggles along the top edge.
  g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath();
  for (let x = Math.floor(x0 / 23) * 23; x < x1; x += 23) {
    const h = kit.hash(x * 1.7);
    if (h < 0.3) continue;
    const yy = s.y + 2;
    g.moveTo(x, yy); g.lineTo(x - 5, yy - 10 - h * 10); g.moveTo(x + 3, yy); g.lineTo(x + 4, yy - 14 - h * 8); g.moveTo(x + 6, yy); g.lineTo(x + 12, yy - 9 - h * 10);
    if (h > 0.8) { g.moveTo(x + 10, yy + 20); g.quadraticCurveTo(x + 30, yy + 30, x + 50, yy + 22); }
  }
  g.stroke();
  g.restore();
}

// Stones and grass tufts in ink, scattered in the ground body.
function inkStones(g, x, y, seed) {
  g.save();
  g.fillStyle = '#a89c84'; g.strokeStyle = 'rgba(43,29,20,0.8)'; g.lineWidth = 2;
  const n = 1 + Math.floor(seed * 3);
  for (let i = 0; i < n; i++) {
    const sx = x + i * 26 + kit.hash(seed + i) * 20, sy = y + kit.hash(seed * 3 + i) * 30;
    g.beginPath(); g.ellipse(sx, sy, 10 + kit.hash(i + seed) * 8, 6 + kit.hash(i * 2 + seed) * 4, seed, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(sx - 6, sy + 2); g.lineTo(sx + 2, sy + 5); g.stroke();
  }
  g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 1.5;
  g.beginPath();
  for (let i = 0; i < 6; i++) { const hx = x - 40 + i * 22, hy = y + 40 + kit.hash(i + seed * 7) * 20; g.moveTo(hx, hy); g.lineTo(hx + 12, hy + 9); }
  g.stroke();
  g.restore();
}

function inkJar(g, x, y, h, alpha) {
  g.save();
  g.globalAlpha *= alpha;
  g.strokeStyle = INK; g.lineWidth = 3;
  g.fillStyle = 'rgba(220,235,240,0.7)';
  g.beginPath(); g.roundRect ? g.roundRect(x - h * 0.3, y - h * 0.82, h * 0.6, h * 0.82, 12) : g.rect(x - h * 0.3, y - h * 0.82, h * 0.6, h * 0.82); g.fill(); g.stroke();
  g.fillStyle = '#c9a060'; g.fillRect(x - h * 0.22, y - h, h * 0.44, h * 0.2); g.strokeRect(x - h * 0.22, y - h, h * 0.44, h * 0.2);
  g.restore();
}

function inkMailbox(g, x, y) {
  g.save();
  g.fillStyle = '#9a8aa0'; g.strokeStyle = INK; g.lineWidth = 4;
  g.fillRect(x - 60, y - 40, 20, 40); g.fillRect(x + 40, y - 40, 20, 40);
  g.beginPath(); g.moveTo(x - 80, y - 36); g.lineTo(x - 80, y - 190); g.arc(x, y - 190, 80, Math.PI, 0); g.lineTo(x + 80, y - 36); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = INK; g.fillRect(x - 40, y - 200, 80, 12);
  g.restore();
}

function inkSignpost(g, x, y, n, t) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#a88a5a';
  g.fillRect(x - 8, y - 190, 16, 190); g.strokeRect(x - 8, y - 190, 16, 190);
  g.save(); g.translate(x, y - 170); g.rotate(-0.08);
  g.fillStyle = '#d9c28a';
  g.beginPath(); g.moveTo(-70, -26); g.lineTo(50, -26); g.lineTo(74, 0); g.lineTo(50, 26); g.lineTo(-70, 26); g.closePath(); g.fill(); g.stroke();
  g.font = '800 28px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.fillStyle = '#33241a';
  g.fillText(['', 'ROOTS', 'STREAMS', 'CLEARING', 'THE POST', 'MAILBOX'][n] || '→', -8, 10);
  g.restore();
  g.restore();
}


// Hatching in ink: short parallel strokes filling a box, a shadow side.
function hatch(g, x0, y0, w, h, { step = 9, alpha = 0.35, slope = 0.8 } = {}) {
  g.save();
  g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.strokeStyle = `rgba(43,29,20,${alpha})`; g.lineWidth = 1.6;
  g.beginPath();
  for (let x = x0 - h * slope; x < x0 + w; x += step) { g.moveTo(x, y0 + h); g.lineTo(x + h * slope, y0); }
  g.stroke();
  g.restore();
}

// A knot with a face, as the book draws them in its gnarled trees: heavy-lidded
// eyes, a bump of a nose and a long-suffering mouth, all in line.
function knotFace(g, x, y, r, seed = 0) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 2.5;
  g.fillStyle = 'rgba(80,58,36,0.35)';
  g.beginPath(); g.ellipse(x, y, r * 1.1, r * 1.5, 0.15, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(x, y, r * 0.85, r * 1.2, 0.15, 0, Math.PI * 2); g.stroke();
  // Eyes: lids drawn as arcs, a dot under each.
  for (const sx of [-1, 1]) {
    const ex = x + sx * r * 0.38, ey = y - r * 0.35;
    g.beginPath(); g.arc(ex, ey + 2, r * 0.24, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.beginPath(); g.arc(ex, ey + 3, r * 0.22, 0.1, Math.PI - 0.1); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(ex + sx * 2, ey + 5, r * 0.07, 0, Math.PI * 2); g.fill();
  }
  g.beginPath(); g.moveTo(x - r * 0.1, y - r * 0.1); g.quadraticCurveTo(x + r * 0.25, y + r * 0.1, x - r * 0.05, y + r * 0.3); g.stroke();
  g.beginPath(); g.moveTo(x - r * 0.4, y + r * 0.6 + (seed % 2 ? 4 : 0)); g.quadraticCurveTo(x, y + r * 0.5, x + r * 0.4, y + r * 0.62); g.stroke();
  g.restore();
}

// A plain bark column rising out of the frame, behind a delivered tree foot.
function inkTrunkColumn(g, x, y, w) {
  g.save();
  g.fillStyle = '#8f7556'; g.strokeStyle = INK; g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(x - w / 2, y + 40); g.quadraticCurveTo(x - w / 2 + 10, y - 400, x - w / 2 + 24, y - 1000);
  g.lineTo(x + w / 2 - 20, y - 1000); g.quadraticCurveTo(x + w / 2 - 6, y - 400, x + w / 2, y + 40);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(43,29,20,0.55)'; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 7; i++) { const gx = x - w / 2 + 30 + i * (w - 60) / 6; g.moveTo(gx, y - 1000); g.bezierCurveTo(gx - 12, y - 700, gx + 14, y - 300, gx - 4, y + 40); }
  g.stroke();
  hatch(g, x + w * 0.1, y - 1000, w * 0.4, 1040, { step: 9, alpha: 0.28 });
  g.restore();
}

function inkTrunk(g, x, y, { height }) {
  const h = height;
  g.save();
  g.globalAlpha *= 0.92;
  // A wavy, flaring trunk in two washes.
  g.fillStyle = '#9c8062'; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - 110, y);
  g.quadraticCurveTo(x - 70, y - 60, x - 62, y - h * 0.3);
  g.quadraticCurveTo(x - 52, y - h * 0.6, x - 66, y - h);
  g.lineTo(x + 58, y - h);
  g.quadraticCurveTo(x + 48, y - h * 0.55, x + 60, y - h * 0.3);
  g.quadraticCurveTo(x + 76, y - 60, x + 124, y);
  g.closePath(); g.fill(); g.stroke();
  // Shadow side wash and hatching.
  g.save();
  g.beginPath(); g.moveTo(x + 10, y - h); g.lineTo(x + 58, y - h); g.quadraticCurveTo(x + 48, y - h * 0.55, x + 60, y - h * 0.3); g.quadraticCurveTo(x + 76, y - 60, x + 124, y); g.lineTo(x + 20, y); g.closePath(); g.clip();
  g.fillStyle = 'rgba(70,50,30,0.22)'; g.fillRect(x, y - h, 130, h);
  hatch(g, x + 10, y - h, 120, h, { step: 8, alpha: 0.3 });
  g.restore();
  // Long grain lines following the trunk.
  g.strokeStyle = 'rgba(43,29,20,0.7)'; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const gx = x - 50 + i * 15 + kit.hash(i + x) * 8;
    g.moveTo(gx + 4, y - h);
    g.bezierCurveTo(gx - 10, y - h * 0.7, gx + 14, y - h * 0.4, gx - 6 - i * 4, y - 20);
  }
  g.stroke();
  // Knots and a face.
  knotFace(g, x + 6, y - h * 0.56, 26, Math.round(x));
  for (const k of [0.22, 0.82]) {
    const kx = x + (kit.hash(k * 7 + x) - 0.5) * 70, ky = y - h * k;
    g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.ellipse(kx, ky, 9, 16, 0.3, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(kx, ky, 4, 8, 0.3, 0, Math.PI * 2); g.stroke();
  }
  // Roots flaring at the foot, and a mossy collar.
  g.fillStyle = '#7d8a4a'; g.strokeStyle = INK; g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(x - 118, y + 2);
  for (let i = -118; i <= 130; i += 22) g.lineTo(x + i, y - 8 - kit.hash(i * 1.3 + x) * 22);
  g.lineTo(x + 132, y + 2); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function inkStump(g, x, y, { height }) {
  const h = height;
  g.save();
  g.fillStyle = '#9c8062'; g.strokeStyle = INK; g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(x - 60, y); g.quadraticCurveTo(x - 50, y - h * 0.4, x - 46, y - h * 0.78);
  g.lineTo(x + 46, y - h * 0.78); g.quadraticCurveTo(x + 52, y - h * 0.4, x + 66, y);
  g.closePath(); g.fill(); g.stroke();
  hatch(g, x + 10, y - h * 0.78, 58, h * 0.78, { step: 7, alpha: 0.3 });
  g.strokeStyle = 'rgba(43,29,20,0.7)'; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 6; i++) { const gx = x - 36 + i * 14; g.moveTo(gx, y - h * 0.76); g.quadraticCurveTo(gx + 6, y - h * 0.4, gx - 4, y - 4); }
  g.stroke();
  // The cut top with its rings.
  g.fillStyle = '#d9c4a0'; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.ellipse(x, y - h * 0.78, 48, 15, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(43,29,20,0.6)';
  for (const r of [0.75, 0.5, 0.25]) { g.beginPath(); g.ellipse(x + 2, y - h * 0.78, 48 * r, 15 * r, 0, 0, Math.PI * 2); g.stroke(); }
  knotFace(g, x - 4, y - h * 0.42, 15, Math.round(x));
  // Moss at the foot.
  g.fillStyle = '#7d8a4a'; g.strokeStyle = INK; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(x - 70, y + 2);
  for (let i = -70; i <= 76; i += 18) g.lineTo(x + i, y - 6 - kit.hash(i + x) * 14);
  g.lineTo(x + 78, y + 2); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function inkBranch(g, x, y, w) {
  g.save();
  // The branch: a wavy bough, thicker at the root (its left), in a bark wash.
  g.fillStyle = '#9c8062'; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - 40, y - 14);
  for (let i = 0; i <= w; i += 40) g.lineTo(x + i, y - 2 - kit.hash(i + x) * 10);
  g.quadraticCurveTo(x + w + 30, y + 2, x + w + 44, y + 16);
  g.quadraticCurveTo(x + w + 20, y + 30, x + w, y + 30);
  for (let i = w; i >= 0; i -= 40) g.lineTo(x + i, y + 36 + (1 - i / w) * 16 + kit.hash(i * 3 + x) * 8);
  g.lineTo(x - 40, y + 62);
  g.closePath(); g.fill(); g.stroke();
  // Grain along it, hatching underneath.
  g.strokeStyle = 'rgba(43,29,20,0.7)'; g.lineWidth = 2;
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    const yy = y + 8 + k * 9;
    g.moveTo(x - 30, yy + k * 2);
    for (let i = 0; i <= w; i += 60) g.quadraticCurveTo(x + i + 30, yy + 4 + kit.hash(i + k) * 6, x + i + 60, yy + (k > 1 ? 4 : 0));
  }
  g.stroke();
  hatch(g, x - 40, y + 26, w + 60, 40, { step: 8, alpha: 0.3 });
  // Twigs with leaf clusters hanging under it.
  g.strokeStyle = INK; g.lineWidth = 2.5;
  for (let i = 60; i < w; i += 140) {
    const lx = x + i + kit.hash(i) * 50, ly = y + 44 + (1 - i / w) * 12;
    g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo(lx + 10, ly + 24, lx + 4, ly + 42); g.stroke();
    g.fillStyle = '#8a9a4e';
    for (let k = 0; k < 6; k++) {
      const a = -0.6 + k * 0.4, px = lx + 4 + Math.sin(a) * 24, py = ly + 34 + Math.cos(a) * 14;
      g.beginPath(); g.ellipse(px, py, 10, 5, a, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(px - 8, py); g.lineTo(px + 8, py); g.stroke();
    }
  }
  // Moss on top.
  g.fillStyle = '#8a9a4e'; g.strokeStyle = INK; g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(x - 20, y + 4);
  for (let i = -20; i <= w; i += 22) g.lineTo(x + i, y - 3 - kit.hash(i * 0.7 + x) * 12);
  g.lineTo(x + w, y + 8); g.lineTo(x - 20, y + 8); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function inkToadstool(g, x, y, { height, sy = 1 }) {
  const h = height * sy;
  g.save();
  g.strokeStyle = INK; g.lineWidth = 3.5;
  // Stalk: cream with a wavy edge, hatched on one side.
  g.fillStyle = '#efe4c8';
  g.beginPath();
  g.moveTo(x - 26, y); g.quadraticCurveTo(x - 16, y - h * 0.3, x - 18, y - h * 0.56);
  g.lineTo(x + 18, y - h * 0.56); g.quadraticCurveTo(x + 18, y - h * 0.3, x + 28, y);
  g.closePath(); g.fill(); g.stroke();
  hatch(g, x + 2, y - h * 0.56, 28, h * 0.56, { step: 6, alpha: 0.28 });
  // Gills under the cap.
  g.fillStyle = '#e2d2b0';
  g.beginPath(); g.ellipse(x, y - h * 0.52, 84, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(43,29,20,0.6)';
  g.beginPath(); for (let i = -76; i <= 76; i += 9) { g.moveTo(x + i, y - h * 0.52 - 6); g.lineTo(x + i * 0.3, y - h * 0.52 + 12); } g.stroke();
  // Cap: a faded brick red, crosshatched on the shadow side, ink-rimmed spots.
  g.strokeStyle = INK; g.lineWidth = 3.5;
  g.fillStyle = '#c2574a';
  g.beginPath();
  g.moveTo(x - 92, y - h * 0.5);
  g.bezierCurveTo(x - 80, y - h * 1.15, x + 80, y - h * 1.2, x + 92, y - h * 0.5);
  g.quadraticCurveTo(x, y - h * 0.4, x - 92, y - h * 0.5);
  g.closePath(); g.fill(); g.stroke();
  g.save();
  g.beginPath(); g.moveTo(x - 92, y - h * 0.5); g.bezierCurveTo(x - 80, y - h * 1.15, x + 80, y - h * 1.2, x + 92, y - h * 0.5); g.closePath(); g.clip();
  hatch(g, x + 10, y - h * 1.2, 90, h * 0.8, { step: 7, alpha: 0.35 });
  hatch(g, x + 30, y - h * 1.2, 70, h * 0.8, { step: 9, alpha: 0.25, slope: -0.8 });
  g.restore();
  g.fillStyle = '#f3ead6'; g.lineWidth = 2.5;
  for (const [dx, dy, r] of [[-52, -0.7, 11], [-12, -0.92, 13], [34, -0.78, 10], [62, -0.6, 7], [-70, -0.55, 6]]) {
    g.beginPath(); g.ellipse(x + dx, y + dy * h, r, r * 0.75, 0.2, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  g.restore();
}

// A gap in the ground: earth banks in ink and hatching, roots dangling from
// them, and the stream below in rows of curling strokes.
function drawStream(g, s, t) {
  const y0 = GY + 54;
  g.save();
  // The banks' faces, with earth hatching and strata.
  g.fillStyle = '#7a6244';
  g.fillRect(s.x0 - 4, GY - 2, 24, y0 - GY + 10); g.fillRect(s.x1 - 20, GY - 2, 24, y0 - GY + 10);
  // The water.
  g.fillStyle = '#8fb3c2';
  g.fillRect(s.x0, y0, s.x1 - s.x0, H + 60 - y0);
  g.fillStyle = 'rgba(60,90,110,0.25)';
  g.fillRect(s.x0, y0 + 90, s.x1 - s.x0, H + 60 - y0 - 90);
  // Rows of curling strokes, as the book draws water; hatching deeper down.
  g.strokeStyle = 'rgba(43,29,20,0.75)'; g.lineWidth = 2.4;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const yy = y0 + 18 + i * 30;
    for (let x = s.x0 + 10 + (i % 2) * 17; x < s.x1 - 26; x += 34) {
      const ph = Math.sin(t * 2.2 + i + x * 0.05) * 3;
      g.moveTo(x, yy + ph); g.quadraticCurveTo(x + 10, yy - 9 + ph, x + 20, yy + ph); g.quadraticCurveTo(x + 25, yy + 4 + ph, x + 17, yy + 7 + ph);
    }
  }
  g.stroke();
  hatch(g, s.x0, y0 + 100, s.x1 - s.x0, H - y0, { step: 10, alpha: 0.3, slope: 0.3 });
  g.strokeStyle = '#f2f8fa'; g.lineWidth = 2;
  g.beginPath();
  for (let x = s.x0 + 20; x < s.x1 - 30; x += 58) { const yy = y0 + 8 + Math.sin(t * 3 + x) * 3; g.moveTo(x, yy); g.lineTo(x + 22, yy); }
  g.stroke();
  // The banks in ink: a wobbly earth edge, strata, dangling roots.
  g.strokeStyle = INK; g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(s.x0, GY); g.quadraticCurveTo(s.x0 + 14, GY + 20, s.x0 + 6, y0 + 4); g.lineTo(s.x1 - 6, y0 + 4); g.quadraticCurveTo(s.x1 - 14, GY + 20, s.x1, GY);
  g.stroke();
  g.lineWidth = 2; g.strokeStyle = 'rgba(43,29,20,0.7)';
  for (const [bx, dir] of [[s.x0, 1], [s.x1, -1]]) {
    g.beginPath();
    for (let i = 0; i < 4; i++) { const yy = GY + 10 + i * 12; g.moveTo(bx, yy); g.lineTo(bx + dir * (14 + kit.hash(i + bx) * 10), yy + 3); }
    // Roots.
    g.moveTo(bx + dir * 6, GY + 8); g.quadraticCurveTo(bx + dir * 30, GY + 30, bx + dir * 22, y0 + 20);
    g.moveTo(bx + dir * 2, GY + 24); g.quadraticCurveTo(bx + dir * 12, GY + 50, bx + dir * 36, y0 + 36);
    g.stroke();
  }
  // Pebbles along the water line.
  g.fillStyle = '#b8b0a0'; g.strokeStyle = INK; g.lineWidth = 2;
  for (let x = s.x0 + 30; x < s.x1 - 30; x += 70) { g.beginPath(); g.ellipse(x, y0 - 4, 12, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.restore();
}

function eyeBubble(g, x, y, k, t) {
  const sp = art.prop('trollusk', 9);
  const s = 0.7 + 0.3 * Math.min(1, k);
  const wob = Math.sin(t * 18) * 0.06;
  if (!art.drawSprite(g, sp, x, y, { height: 130 * s, rot: wob })) {
    g.save(); g.translate(x, y - 60 * s); g.fillStyle = '#f8f1e0'; g.strokeStyle = INK; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, 70 * s, 42 * s, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(0, 0, 16 * s, 0, Math.PI * 2); g.fill(); g.restore();
  }
}

// ---------- the autopilot ----------
//
// Walks right, netting every Bombanat it can reach on the way (choosing the
// sweep, the overhead swing or the low scoop by its height), high-stepping
// roots, vaulting logs and streams, netting the Trollusk and the Yalapappus
// as they come (vaulting them when a swing would be too late), and posting.

export function autopilot(board) {
  const b = board.body;
  const out = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  if (board.done) return out;
  const mode = board.mode;
  if (mode !== 'free') return out;
  const GYv = board.GY;
  const px = b.x, onGround = b.onGround;
  if (!onGround) { out.x = b.vx >= 0 ? 1 : -1; return out; } // no steering in the air
  const moving = Math.abs(b.vx) >= board.VAULT.minSpeed;
  const stopped = Math.abs(b.vx) < 80;
  const ap = board._ap || (board._ap = { backTo: null });
  // The three swings' hoops, relative to the feet, facing right, as the board
  // measures them on the drawn poses.
  const reach = { swing: board.hoopFor('swing'), netUp: board.hoopFor('netUp'), netLow: board.hoopFor('netLow') };
  const groundOk = (x) => { const gy = kit.groundAt(board.solids, x, b.y - 4); return gy !== null && Math.abs(gy - b.y) < 2; };
  // Which swing nets a thing at (tx, ty)? Returns the kind, where to stand
  // and which way to face (the way he faces now when it can be either).
  function planFor(tx, ty, slack) {
    let best = null;
    for (const kind of ['swing', 'netUp', 'netLow']) {
      const r = reach[kind];
      const dy = ty - (b.y + r.dy);
      if (Math.abs(dy) > r.r + slack - 10) continue;
      for (const f of [1, -1]) {
        const stand = tx - r.dx * f;
        if (!groundOk(stand)) continue;
        const cost = Math.abs(dy) + Math.abs(stand - px) * 0.2 + (f === board.facing ? 0 : 15);
        if (!best || cost < best.cost) best = { kind, stand, cost, face: f };
      }
    }
    return best;
  }
  // Swing now, or turn round first if he faces the wrong way.
  const press = (kind, face = 1) => {
    if (face !== board.facing) { out.x = face * 0.3; return; }
    out.actionPressed = true; out.action = true; out.y = kind === 'netUp' ? -1 : kind === 'netLow' ? 1 : 0; out.x = 0;
  };
  const walkTo = (x, tol = 10) => { const d = x - px; out.x = Math.abs(d) < tol ? 0 : Math.sign(d) * (Math.abs(d) < 60 ? 0.55 : 1); return Math.abs(d) < tol; };

  // ----- part two: the monsters coming at him -----
  if (board.phase === 'carry') {
    const tro = board.tro, yal = board.yal;
    const rolling = !yal.netted && (yal.mode === 'roll' || yal.mode === 'warn');
    const pouncing = !tro.netted && (tro.mode === 'pounce' || tro.mode === 'gloat');
    const warning = !tro.netted && tro.mode === 'warn';
    if (rolling && yal.mode === 'roll') {
      const d = yal.x - px;
      if (d > -40 && d < 700) {
        if (d >= 200 && d <= 320 && stopped && onGround) { press('netLow'); return out; }
        if (d > 320) { out.x = 0; return out; }
        if (d < 200 && moving && onGround) { out.sprint = true; out.x = 1; return out; }
        out.x = 0; return out;
      }
    } else if (rolling) { out.x = 0; return out; }
    if (pouncing) {
      const d = tro.x - px;
      if (tro.mode === 'pounce') {
        if (d >= 180 && d <= 300 && stopped && onGround) { press('netLow'); return out; }
        if (d > 300) { out.x = 0; return out; }
        if (d > -40 && d < 180 && moving && onGround) { out.sprint = true; out.x = 1; return out; }
        out.x = 0; return out;
      }
      if (d > -40 && d < 200 && onGround) { press('netLow'); return out; }
      if (d >= 200 && d < 600) { walkTo(tro.x - 100); return out; }
    }
    if (warning) {
      const fern = tro.x;
      if (px < fern - 120) { walkTo(fern - 400, 16); return out; }
    }
    if (Math.abs(px - board.MAIL_X) < 150 && onGround) { press('swing'); out.y = 0; return out; }
    out.x = px < board.MAIL_X ? 1 : -1;
  }
  {
    // ----- the nearest Bombanat worth netting (going back for one close behind) -----
    let target = null;
    const flockPlan = () => {
      let best = null;
      for (const f of board.flock) {
        if (f.got) continue;
        const tx = f.x + f.cx, ty = f.y + f.cy;
        if (tx < px - 450 || tx > px + 520) continue;
        const plan = planFor(tx, ty, 20);
        if (!plan) continue;
        if (!best || plan.stand < best.plan.stand) best = { x: tx, y: ty, plan };
      }
      return best;
    };
    if (board.phase === 'collect' && board.bomb.mode === 'loop') {
      // Wait at the right end of its figure-eight, facing it, and swing as it
      // comes round (it slows and hovers there); a chance swing when it
      // passes within reach on the way.
      const bm = board.bomb;
      const tx = bm.x + bm.vx * 0.3, ty = bm.y + bm.vy * 0.3;
      const plan = planFor(tx, ty, 40);
      if (plan && Math.abs(plan.stand - px) < 40 && onGround && stopped) { press(plan.kind, plan.face); return out; }
      target = flockPlan();
      if (!target) { walkTo(board.LOOP.x + board.LOOP.ax - reach.swing.dx, 12); return out; }
    }
    if (!target) target = flockPlan();
    if (target) {
      const plan = planFor(target.x, target.y, target.letter ? 36 : 20);
      if (plan) {
        const d = plan.stand - px;
        if (Math.abs(d) < (target.letter ? 44 : 26) && onGround && Math.abs(b.vx) < 200) { press(plan.kind, plan.face); return out; }
        walkTo(plan.stand);
        if (target.letter) return out;
      } else if (target.letter) { walkTo(target.x - 60, 30); return out; }
    }
    if (!target && board.phase === 'collect') out.x = 1;
  }

  // ----- obstacles ahead on the ground -----
  if (onGround && b.y >= GYv - 1) {
    const logFaces = board.LOGS.map((x) => x - 95);
    const ahead = (xs, lo, hi) => xs.some((x) => x - px > lo && x - px < hi);
    const streamAhead = (lo, hi) => board.streams.some((s) => s.x0 - px > lo && s.x0 - px < hi);
    const needVault = ahead(logFaces, 0, 220) || streamAhead(0, 150);
    if (ap.backTo !== null) {
      // Backing up for a run-up.
      if (px > ap.backTo) { out.x = -1; out.y = 0; out.actionPressed = false; out.action = false; out.sprint = false; }
      else ap.backTo = null;
    }
    if (out.x > 0 && ap.backTo === null && needVault) {
      if (moving && (ahead(logFaces, 100, 220) || streamAhead(0, 150))) { out.sprint = true; out.x = 1; out.y = 0; out.actionPressed = false; out.action = false; }
      else if (!moving && (ahead(logFaces, 0, 100) || streamAhead(0, 60))) {
        // Not enough run-up: back off, but not into a log or a stream behind.
        let floor = 0;
        for (const x of board.LOGS) if (x + 95 < px) floor = Math.max(floor, x + 95 + 60);
        for (const st of board.streams) if (st.x1 <= px) floor = Math.max(floor, st.x1 + 40);
        ap.backTo = Math.max(px - 240, floor);
        out.x = -1; out.y = 0;
      }
    }
    // A root ahead the way he is going: step high over it (unless this is the
    // swing itself); once it is behind him, stride out again for a run-up.
    if (!out.actionPressed && !out.sprint && out.x !== 0 && board.ROOTS.some((x) => (x - px) * Math.sign(out.x) > -70 && Math.abs(x - px) < 170)) out.y = -1;
  }
  return out;
}

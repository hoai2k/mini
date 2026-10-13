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

const { W, H, clamp, ease, approach } = kit;

const GY = 880; // the ground line (feet)
const WORLD_W = 11400;
const MAIL_X = 11000;
const CLEAR = { x0: 5800, x1: 7300 }; // the clearing
const TIME = 150;

// Sections and their signposts.
const CHECKPOINTS = [0, 1700, 3700, 5800, 7400, 10300];

// Ground segments; the gaps between are streams.
const GROUND = [[0, 4000], [4300, 4700], [5000, 5300], [5600, 9350], [9690, WORLD_W]];
const LOGS = [2750, 3650, 8550]; // fallen logs (their middles): vault them
const LOG_W = 190, LOG_H = 110;
const ROOTS = [900, 1500, 2150, 3250, 7550, 8050, 10080]; // gnarled roots: step high or vault
const TOADSTOOLS = [2330, 7230, 8900];
const BRANCHES = [[2480, 3000], [9000, 9720]]; // one-way platforms up at GY - 290
const BRANCH_Y = GY - 290;
const FERNS = [7700, 8350, 10250, 10750]; // the Trollusk's hiding places, in order
const DECOR_FERNS = [400, 1950, 3300, 4850, 6400, 7000, 9850, 11250];
const TRUNKS = [250, 1850, 4000, 5500, 7350, 9500, 10800];
const STUMPS = [1200, 5900, 7100];
const ROLL_AT = [7800, 8700, 9750]; // where the Yalapappus's rolls are set off

// The Grithix.
const SPEED = 330, ACCEL = 900, DECEL = 1500, HIGH_STEP = 0.5; // high-stepping speed factor
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
  swing: { fx: 0.86, fy: 0.33, r: 0.1 },
  netUp: { fx: 0.86, fy: 0.33, r: 0.1, rot: -0.5, hop: 40 },
  slam: { fx: 0.78, fy: 0.88, r: 0.13 },
  netLow: { fx: 0.78, fy: 0.88, r: 0.13 },
};

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
    { x: 600, text: 'Up: an overhead swing · Down: a low scoop' },
    { x: 1250, text: 'Hold Up to step high over a root' },
    { x: 2200, text: 'Sprint while striding: pole-vault the log' },
    { x: 2560, text: 'Toadstools bounce you up to the branches' },
    { x: 3750, text: 'Vault the streams at a run' },
    { x: 5850, text: 'The clearing! Net the Bombanat with the letter!' },
  ]);

  // ---------- the plain Bombanats ----------
  // h is the height of the flutter's middle above the ground it is over.
  const flock = [];
  const addB = (x, h, pat = 'bob', o = {}) => flock.push({ x, y: GY - h, pat, amp: 28, span: 0, speed: 1, ...o, phase: flock.length * 1.37, got: false, t: 0, cx: 0, cy: 0 });
  // The opening: low ones to learn the sweep, one overhead, one skimming.
  addB(620, 180); addB(1150, 160, 'patrol', { span: 100, speed: 0.7 }); addB(1340, 200, 'circle', { amp: 36 }); addB(1700, 175);
  // Roots, the toadstool, the branch and the logs.
  addB(1900, 300, 'bob', { amp: 22 }); addB(2050, 50, 'skim', { span: 60 }); addB(2300, 170, 'patrol', { span: 60, speed: 0.9 });
  addB(2620, 480, 'bob'); addB(2790, 470, 'circle', { amp: 30 }); addB(2950, 485); // over the branch at 290
  addB(3150, 170, 'circle', { amp: 30 }); addB(3450, 310, 'bob', { amp: 20 }); addB(3850, 40, 'skim', { span: 90 });
  // The streams: skimming low at the banks, and high over the gaps.
  addB(4350, 310, 'bob', { amp: 20 }); addB(4500, 170, 'circle', { amp: 30 }); addB(4650, 45, 'skim', { span: 60 });
  addB(5180, 180, 'patrol', { span: 50 }); addB(5250, 45, 'skim', { span: 60 }); addB(5700, 290, 'bob'); addB(4560, 300, 'bob');
  // The clearing.
  addB(6200, 170, 'patrol', { span: 240, speed: 0.8 }); addB(6600, 190, 'circle', { amp: 40 }); addB(7230, 470); addB(7000, 160);
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
  const ROLL_AT = [7900, 8750, 10050];

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
  function hoopAt() {
    const pose = mode === 'sweep' ? swingKind : mode === 'slam' && modeT < 0.1 ? 'slam' : null;
    if (!pose) return null;
    const hp = HOOP[pose];
    const sp = art.sprite('grithix.poses', pose === 'netUp' ? 5 : pose === 'netLow' ? 6 : pose === 'swing' ? 5 : 6);
    // Sprite size on screen (the stand-in uses the key pose's sizes).
    const w = (sp?.w ?? (pose === 'swing' || pose === 'netUp' ? 720 : 596)) * poseScale();
    const h = (sp?.h ?? (pose === 'swing' || pose === 'netUp' ? 603 : 530)) * poseScale();
    let dx = (hp.fx - 0.5) * w, dy = -(1 - hp.fy) * h;
    if (hp.rot) { const c = Math.cos(hp.rot), s = Math.sin(hp.rot); [dx, dy] = [dx * c - dy * s, dx * s + dy * c]; }
    return { x: body.x + dx * gc.facing, y: body.y - (hp.hop || 0) + dy, r: hp.r * w };
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
    if (!yal.netted && (yal.mode === 'roll' || yal.mode === 'dizzy') && kit.near(yal.x, yal.y - 85, hp.x, hp.y, hp.r + 60)) {
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
        mode = 'free'; modeT = 0;
        body.vy = Math.max(0, body.vy);
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
    body.bounced = Math.max(0, (body.bounced || 0) - dt);
    airT = body.onGround ? 0 : airT + dt;
    body.x = clamp(body.x, 60, WORLD_W - 60);

    // Roots trip a plain stride; a high step or a vault clears them.
    if (body.onGround && body.y >= GY - 1 && mode !== 'vault' && !highStep && Math.abs(body.vx) > 60 && immune <= 0 && mode !== 'trip' && mode !== 'soak') {
      for (const rx of ROOTS) if (Math.abs(body.x - rx) < ROOT_HALF) { trip('Oof! A root'); hints.say('Hold Up to step high over a root, or vault it', 2.5); break; }
    }
    // Into a stream.
    if (body.y > GY + 90 && mode !== 'soak') soak();

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
        if (swingKind === 'netUp' && !art.sprite('grithix.moves', 1)) { gc.rot = HOOP.netUp.rot * gc.facing; gc.z = HOOP.netUp.hop; }
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
        if (!body.onGround) { art.setAnim(gc, airT < 0.12 && body.bounced ? 'vault' : 'balance'); if (gc.anim === 'vault') gc.animT = 1 / 4 + 0.01; }
        else if (phase === 'carry') { art.setAnim(gc, 'carry'); if (sp > 30) gc.z = Math.abs(Math.sin(gc.dist / 90 * Math.PI)) * 10; }
        else if (highStep && sp > 30) art.setAnim(gc, 'stepHigh');
        else art.setAnim(gc, sp > 30 ? 'stride' : 'idle');
    }
  }

  // ---------- the flock ----------
  function updateFlock(dt) {
    for (const b of flock) {
      b.t += dt;
      if (b.got) continue;
      if (!cam.sees(b.x, b.x, 500)) continue;
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
      bomb.loopT += dt * (bomb.dodgeT > 0 ? 1.7 : 1) * (gentle ? 0.85 : 1);
      const k = bomb.loopT * (Math.PI * 2 / 5.2);
      tx = 6450 + Math.sin(k) * 420;
      ty = GY - 240 + Math.sin(k * 2) * 110;
      // It sees the net wound up close by and darts (its skill).
      if (mode === 'windup' && modeT < 0.03 && bomb.dodgeCool <= 0 && Math.abs(body.x - bomb.x) < 300) {
        bomb.dodgeCool = 2.2;
        if (env.rng() < 0.2 + 0.4 * skill) { bomb.dodgeT = 0.5; env.sfx('dodge'); }
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
        if (fern !== undefined && body.x > fern - 620 && body.x < fern - 120 && body.vx > -20) { tro.mode = 'warn'; tro.t = 0; env.sfx('rustle'); env.sfx('eye'); }
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
          yal.mode = 'warn'; yal.t = 0; yal.x = cam.x + W + 150; yal.rolls++;
          env.sfx('gust');
          fx.pop(cam.x + W - 160, GY - 360, 'GRIMM!', { colour: '#8a6a1a', size: 50, life: 1.1 });
        }
        break;
      case 'warn':
        yal.x = cam.x + W + 150;
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
    if (yal.mode === 'roll' && body.onGround && body.y >= GY - 1 && mode !== 'vault' && immune <= 0 && mode !== 'trip' && Math.abs(yal.x - body.x) < 110) {
      trip('Bowled over!');
    }
    c.x = yal.x; c.y = yal.y;
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
    get trips() { return trips; },
    get soaks() { return soaks; },
    cam, solids, streams, cps, GY, MAIL_X, CLEAR, ROOTS, LOGS, TOADSTOOLS, BRANCHES, VAULT, HOOP, hoopAt,
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
      kit.drawBackdrop(g, cam, { panels: ['adv/b09/backdrop-1', 'adv/b09/backdrop-2', 'adv/b09/backdrop-3'], standin: 'scenes/grithix' });
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
      return kit.boardMarks({ snatched: self.outcome === 'snatched', got, total: TOTAL, feat });
    },
    hud() {
      const jars = `Jars ${got}/${TOTAL}`;
      if (self.done) return jars;
      if (phase === 'collect') return `${jars} · net the Bombanat with the letter`;
      return `${jars} · post it! · bag ${bag.size}/3`;
    },
    focus() { return [{ x: body.x - cam.x, y: body.y - 150 }]; },
  };

  // ---------- drawing the world ----------
  const INK = '#2b1d14';
  function drawWorld(g, tt) {
    // Far: tall trunks and stumps with faces, behind everything.
    for (const x of TRUNKS) if (cam.sees(x - 200, x + 200)) kit.sprite(g, 'terrain.wood', 6, x, GY + 20, { height: 1000 }, inkTrunk);
    // Streams in the gaps, under the ground's edges.
    for (const s of streams) if (cam.sees(s.x0, s.x1)) drawStream(g, s, tt);
    // The ground and the logs.
    for (const s of solids) {
      if (!cam.sees(s.x, s.x + s.w)) continue;
      if (s.kind === 'ground') kit.drawGround(g, cam, s, { sheet: 'terrain.wood', item: 1, height: 240, lift: 18, fill: '#6b5236', standin: { top: '#8a9a4e', body: '#6e5a3c', ink: INK } });
      else if (s.kind === 'log') kit.sprite(g, 'terrain.wood', 3, s.x + s.w / 2, s.y + s.h, { height: s.h + 16 }, (g2, x, y) => inkLog(g2, x, y, s.w + 24, s.h));
      else if (s.kind === 'branch') kit.sprite(g, 'terrain.wood', 2, s.x, s.y, { height: 120, ax: 0, ay: 0.2 }, (g2, x, y) => inkBranch(g2, x, y, s.w));
    }
    for (const x of STUMPS) if (cam.sees(x)) kit.sprite(g, 'terrain.wood', 4, x, GY + 6, { height: 150 }, inkStump);
    for (const x of ROOTS) if (cam.sees(x)) kit.sprite(g, 'adv.b09.props', 4, x, GY + 10, { height: 110 }, (g2, xx, yy) => art.drawSprite(g2, art.prop('grithix', 5), xx, yy, { height: 110 }) || inkRoot(g2, xx, yy));
    for (const x of TOADSTOOLS) if (cam.sees(x)) kit.sprite(g, 'adv.b09.props', 5, x, GY + 4, { height: 124, sy: body.bounced && Math.abs(body.x - x) < 120 ? 0.85 : 1 }, (g2, xx, yy, o) => inkToadstool(g2, xx, yy, o));
    // Signposts.
    for (const x of cps.list) if (x > 0 && cam.sees(x)) inkSignpost(g, x + 40, GY + 4, cps.list.indexOf(x), tt);
    // The mailbox and the ferns behind the action.
    if (cam.sees(MAIL_X)) kit.sprite(g, 'adv.b09.props', 9, MAIL_X, GY + 8, { height: 260 }, (g2, x, y) => art.drawSprite(g2, art.prop('grithix', 1), x, y, { height: 260 }) || inkMailbox(g2, x, y));
    if (phase === 'carry' && !self.done && cam.sees(MAIL_X)) mailboxPrompt(g, tt, Math.abs(body.x - MAIL_X) < 170 && body.onGround);
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
      if (b.got) {
        if (b.t < 0.5) { g.save(); g.globalAlpha = 1 - b.t * 2; drawPlainBombanat(g, b.x + b.cx, b.y + b.cy - b.t * 120, tt, b.facing, 0.6); g.restore(); }
        continue;
      }
      drawPlainBombanat(g, b.x + b.cx, b.y + b.cy, tt + b.phase, b.facing || 1, 1);
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
    if (phase === 'carry' && !self.done) letterMarker(g, body.x + gc.facing * 10, body.y - gc.z - 335, tt, letterFlash > 0 ? 74 + letterFlash * 40 : 62);
    if (bag.size && mode !== 'sweep' && mode !== 'slam') drawBag(g, tt);
  }

  // The catch, bulging in the mesh of the net over his shoulder.
  function drawBag(g, tt) {
    const shakeK = bagShake > 0 ? Math.sin(tt * 40) * 6 * bagShake : Math.sin(tt * 6) * 2;
    const bx = body.x - gc.facing * 62, by = body.y - gc.z - 262 + shakeK * 0.3;
    g.save();
    g.translate(bx, by);
    g.scale(gc.facing, 1);
    const n = bag.size;
    g.fillStyle = 'rgba(70,58,40,0.85)';
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 10 + n * 6, 34 + n * 8, 30 + n * 9, 0.2, 0, Math.PI * 2); g.fill(); g.stroke();
    // Mesh.
    g.strokeStyle = 'rgba(230,220,190,0.35)'; g.lineWidth = 1.5;
    g.beginPath();
    for (let i = -3; i <= 3; i++) { g.moveTo(i * 12, -20); g.lineTo(i * 12 + 8, 50); g.moveTo(-40, i * 12 + 10); g.lineTo(40, i * 12 + 4); }
    g.stroke();
    // Whoever is inside, peeking.
    let i = 0;
    for (const id of bag) {
      const c = id === 'bombanat' ? bomb.c : id === 'trollusk' ? tro.c : yal.c;
      const s = { ...c, x: (i - (n - 1) / 2) * 26 + shakeK, y: 36 + n * 6, z: 0, sizeK: 0.24, facing: i % 2 ? -1 : 1, sq: 0, lean: 0, rot: 0, flash: 0, alpha: 1, anim: id === 'bombanat' ? 'netted' : id === 'trollusk' ? 'jolt' : 'bonked', animT: 0 };
      art.drawCreature(g, s, tt, { reduceMotion: true, shadow: false });
      i++;
    }
    g.restore();
  }

  function drawBomb(g, tt) {
    const c = bomb.c;
    // Shadow on the ground below.
    const gy = kit.groundAt(solids, bomb.x, bomb.y) ?? GY + 60;
    g.save(); g.globalAlpha = 0.14; g.fillStyle = INK;
    g.beginPath(); g.ellipse(bomb.x, gy, 50, 10, 0, 0, Math.PI * 2); g.fill(); g.restore();
    c.x = bomb.x; c.y = bomb.y;
    art.drawCreature(g, c, tt, { reduceMotion: env.reduceMotion, shadow: false });
    if (phase === 'collect') letterMarker(g, bomb.x + bomb.facing * 30, bomb.y - 120, tt, 52);
  }

  // The jar shelf at the bottom left: the bag's three, and the plain ones counted.
  function drawShelf(g, tt) {
    const x0 = 36, y = H - 22;
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

  function mailboxPrompt(g, tt, ready) {
    const bob = Math.sin(tt * 5) * 10;
    g.save();
    g.translate(MAIL_X, GY - 310 + bob);
    g.fillStyle = ready ? '#f2c53d' : '#f8f1e0'; g.strokeStyle = INK; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-28, -36); g.lineTo(28, -36); g.lineTo(28, 0); g.lineTo(50, 0); g.lineTo(0, 46); g.lineTo(-50, 0); g.lineTo(-28, 0); g.closePath();
    g.fill(); g.stroke();
    g.font = '800 30px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 7;
    g.strokeStyle = 'rgba(248,241,224,0.95)'; g.fillStyle = '#33241a';
    const s = ready ? 'Action: mail it!' : 'The official mailbox';
    g.strokeText(s, 0, -58); g.fillText(s, 0, -58);
    g.restore();
  }

  return self;
}

// ---------- stand-ins in ink ----------

const INK = '#2b1d14';

function drawPlainBombanat(g, x, y, t, facing, alpha) {
  const flap = Math.sin(t * 14);
  g.save();
  g.translate(x, y);
  g.scale(facing, 1);
  g.globalAlpha *= alpha;
  g.lineWidth = 3;
  g.strokeStyle = INK;
  // Wings: mauve, clawed tips, flapping.
  g.fillStyle = '#b39ac4';
  for (const s of [-1, 1]) {
    g.save();
    g.scale(1, 1);
    g.beginPath();
    g.moveTo(-6 * s, -4);
    g.quadraticCurveTo(-30 * s, -34 - flap * 22, -62 * s, -18 - flap * 30);
    g.lineTo(-54 * s, -8 - flap * 18);
    g.lineTo(-46 * s, 4 - flap * 8);
    g.lineTo(-36 * s, 10);
    g.quadraticCurveTo(-18 * s, 14, -6 * s, 10);
    g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }
  // Body: dark shaggy, with a pink snout and a sly eye.
  g.fillStyle = '#4a3a3a';
  g.beginPath(); g.ellipse(0, 4, 22, 15, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#e8a0a8';
  g.beginPath(); g.moveTo(14, -2); g.lineTo(42, 4); g.lineTo(16, 12); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(10, -3, 5, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(11, -3, 2.2, 0, Math.PI * 2); g.fill();
  // Tail.
  g.strokeStyle = '#e8a0a8'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-20, 8); g.quadraticCurveTo(-36, 18 + flap * 4, -44, 6); g.stroke();
  g.restore();
}

function drawFern(g, x, y, h, lean, alpha = 1) {
  const sp = art.prop('grithix', 4);
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

function inkTrunk(g, x, y, { height }) {
  g.save();
  g.globalAlpha *= 0.85;
  g.fillStyle = '#8a6e52'; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - 70, y); g.quadraticCurveTo(x - 60, y - height * 0.5, x - 50, y - height);
  g.lineTo(x + 50, y - height); g.quadraticCurveTo(x + 62, y - height * 0.5, x + 90, y);
  g.closePath(); g.fill(); g.stroke();
  // Bark lines and a face in a knot.
  g.lineWidth = 2; g.strokeStyle = 'rgba(43,29,20,0.4)';
  g.beginPath();
  for (let i = 0; i < 7; i++) { g.moveTo(x - 40 + i * 14, y - height * 0.9); g.quadraticCurveTo(x - 30 + i * 14, y - height * 0.5, x - 45 + i * 15, y); }
  g.stroke();
  g.strokeStyle = INK; g.lineWidth = 3; g.fillStyle = '#6e5438';
  g.beginPath(); g.ellipse(x + 10, y - height * 0.55, 30, 42, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - height * 0.58, 7, 0, Math.PI * 2); g.arc(x + 20, y - height * 0.58, 7, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 4, y - height * 0.5); g.quadraticCurveTo(x + 10, y - height * 0.47, x + 24, y - height * 0.51); g.stroke();
  g.restore();
}

function inkStump(g, x, y, { height }) {
  g.save();
  g.fillStyle = '#8a6e52'; g.strokeStyle = INK; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x - 44, y - height * 0.8); g.lineTo(x + 44, y - height * 0.8); g.lineTo(x + 56, y); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c9b48a'; g.beginPath(); g.ellipse(x, y - height * 0.8, 46, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 12, y - height * 0.5, 6, 0, Math.PI * 2); g.arc(x + 12, y - height * 0.5, 6, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 10, y - height * 0.32); g.quadraticCurveTo(x, y - height * 0.25, x + 10, y - height * 0.32); g.stroke();
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

function inkBranch(g, x, y, w) {
  g.save();
  g.fillStyle = '#8a6e52'; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - 20, y - 6); g.lineTo(x + w, y); g.lineTo(x + w + 30, y + 14); g.lineTo(x + w, y + 38); g.lineTo(x - 20, y + 48);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#7d8a4a';
  g.beginPath(); g.moveTo(x, y - 2); for (let i = 0; i <= w; i += 30) g.lineTo(x + i, y - 2 - kit.hash(i) * 14); g.lineTo(x + w, y + 10); g.lineTo(x, y + 10); g.closePath(); g.fill();
  g.restore();
}

function inkToadstool(g, x, y, { height, sy = 1 }) {
  const h = height * sy;
  g.save();
  g.strokeStyle = INK; g.lineWidth = 4;
  g.fillStyle = '#efe4c8';
  g.beginPath(); g.moveTo(x - 24, y); g.lineTo(x - 18, y - h * 0.55); g.lineTo(x + 18, y - h * 0.55); g.lineTo(x + 24, y); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c94a3a';
  g.beginPath(); g.moveTo(x - 90, y - h * 0.5); g.quadraticCurveTo(x, y - h * 1.25, x + 90, y - h * 0.5); g.lineTo(x + 78, y - h * 0.42); g.lineTo(x - 78, y - h * 0.42); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#f8f1e0';
  for (const [dx, dy, r] of [[-50, -0.72, 11], [-10, -0.9, 13], [36, -0.75, 10], [60, -0.6, 7]]) { g.beginPath(); g.arc(x + dx, y + dy * h, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
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

function drawStream(g, s, t) {
  const y0 = GY + 50;
  g.save();
  // Banks.
  g.fillStyle = '#6e5a3c';
  g.fillRect(s.x0 - 2, GY, s.x1 - s.x0 + 4, y0 - GY);
  // Water.
  g.fillStyle = '#7fa6b8';
  g.fillRect(s.x0, y0, s.x1 - s.x0, H + 60 - y0);
  g.strokeStyle = '#dcebf0'; g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const yy = y0 + 20 + i * 36;
    g.moveTo(s.x0 + 10, yy);
    for (let x = s.x0 + 10; x < s.x1 - 10; x += 24) g.lineTo(x + 24, yy + Math.sin(x * 0.08 + t * 3 + i) * 5);
  }
  g.stroke();
  g.strokeStyle = INK; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(s.x0, GY); g.lineTo(s.x0, y0); g.lineTo(s.x1, y0); g.lineTo(s.x1, GY); g.stroke();
  // A few pebbles.
  g.fillStyle = '#b8b0a0';
  for (let x = s.x0 + 30; x < s.x1 - 30; x += 70) { g.beginPath(); g.ellipse(x, y0 - 6, 12, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
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

function letterMarker(g, x, y, t, size = 64) {
  const img = art.image('ui/letter');
  const bob = Math.sin(t * 4) * 6;
  g.save();
  g.translate(x, y + bob);
  g.rotate(Math.sin(t * 2.3) * 0.12);
  if (img) g.drawImage(img, -size / 2, -size / 2, size, size);
  else {
    g.fillStyle = '#f8f1e0'; g.strokeStyle = INK; g.lineWidth = 3;
    g.fillRect(-size / 2, -size * 0.32, size, size * 0.64); g.strokeRect(-size / 2, -size * 0.32, size, size * 0.64);
    g.beginPath(); g.moveTo(-size / 2, -size * 0.32); g.lineTo(0, 0); g.lineTo(size / 2, -size * 0.32); g.stroke();
    g.fillStyle = '#b3402e'; g.fillRect(size * 0.22, -size * 0.26, size * 0.16, size * 0.18);
  }
  g.restore();
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
  if (mode !== 'free' && mode !== 'vault') return out;
  if (mode === 'vault') return out;
  const GYv = board.GY;
  const px = b.x, onGround = b.onGround;
  const moving = Math.abs(b.vx) >= board.VAULT.minSpeed;
  const hp = board.HOOP;
  const k = 300 / 628;
  // The three swings' hoops, relative to the feet, facing right.
  const reach = {
    swing: { dx: (hp.swing.fx - 0.5) * 720 * k, dy: -(1 - hp.swing.fy) * 603 * k, r: hp.swing.r * 720 * k },
    netLow: { dx: (hp.netLow.fx - 0.5) * 596 * k, dy: -(1 - hp.netLow.fy) * 530 * k, r: hp.netLow.r * 596 * k },
  };
  {
    const c = Math.cos(hp.netUp.rot), s = Math.sin(hp.netUp.rot);
    const dx = reach.swing.dx, dy = reach.swing.dy;
    reach.netUp = { dx: dx * c - dy * s, dy: dx * s + dy * c - hp.netUp.hop, r: reach.swing.r };
  }
  // Which swing nets a thing at (tx, ty) from feet at (px, py)? Returns the
  // kind and where to stand.
  function planFor(tx, ty, py, slack) {
    let best = null;
    for (const kind of ['swing', 'netUp', 'netLow']) {
      const r = reach[kind];
      const dy = ty - (py + r.dy);
      if (Math.abs(dy) > r.r + slack - 10) continue;
      const stand = tx - r.dx;
      const cost = Math.abs(dy) + Math.abs(stand - px) * 0.2;
      if (!best || cost < best.cost) best = { kind, stand, cost };
    }
    return best;
  }
  const press = (kind) => { out.actionPressed = true; out.action = true; out.y = kind === 'netUp' ? -1 : kind === 'netLow' ? 1 : 0; };

  // ----- part two: the monsters coming at him -----
  if (board.phase === 'carry') {
    const tro = board.tro, yal = board.yal;
    for (const [m, active, speed] of [[tro, tro.mode === 'pounce' && !tro.netted, tro.vx], [yal, yal.mode === 'roll' && !yal.netted, yal.vx]]) {
      if (!active) continue;
      const d = m.x - px;
      if (d < -40) continue;
      // Where it will be when the sweep comes (the wind-up later).
      const at = m.x + speed * 0.26;
      const plan = onGround && b.y >= GYv - 1 ? planFor(at, GYv - 85, b.y, 50) : null;
      if (plan && Math.abs(plan.stand - px) < 45 && d > 60) { press(plan.kind); return out; }
      if (d < 200 && moving && onGround) { out.sprint = true; out.x = 1; return out; }
      if (d < 320) { out.x = 1; return out; } // keep striding so a vault is ready
    }
    if (Math.abs(px - board.MAIL_X) < 150 && onGround) { press('swing'); out.y = 0; return out; }
    if (px < board.MAIL_X - 150) out.x = 1; else out.x = px > board.MAIL_X ? -1 : 1;
  } else {
    // ----- part one: the nearest Bombanat worth netting -----
    let target = null;
    if (board.bomb.mode === 'loop') {
      const bm = board.bomb;
      target = { x: bm.x + bm.vx * 0.3, y: bm.y + bm.vy * 0.3, letter: true };
    }
    if (!target) {
      let best = null;
      for (const f of board.flock) {
        if (f.got) continue;
        const tx = f.x + f.cx, ty = f.y + f.cy;
        if (tx < px - 60 || tx > px + 520) continue;
        const plan = planFor(tx, ty, b.y, 20);
        if (!plan) continue;
        if (!best || plan.stand < best.plan.stand) best = { x: tx, y: ty, plan };
      }
      if (best) target = best;
    }
    if (target) {
      const plan = planFor(target.x, target.y, b.y, target.letter ? 36 : 20);
      if (plan) {
        const d = plan.stand - px;
        if (Math.abs(d) < (target.letter ? 40 : 24) && onGround) { press(plan.kind); return out; }
        if (target.letter && Math.abs(d) < 120 && Math.abs(target.y - (b.y + reach[plan.kind].dy)) < 40 && onGround) { press(plan.kind); return out; }
        out.x = Math.abs(d) < 8 ? 0 : Math.sign(d) * (Math.abs(d) < 60 ? 0.55 : 1);
        if (target.letter) return out;
      } else if (target.letter) { out.x = Math.sign(target.x - px); return out; }
    }
    if (!target) out.x = 1;
    if (board.bomb.mode === 'loop' && !target) out.x = Math.sign(6450 - px) || 1;
  }

  // ----- obstacles ahead on the ground -----
  if (onGround && out.x > 0) {
    const ahead = (xs, lo, hi) => xs.some((x) => x - px > lo && x - px < hi);
    const inStream = (lo, hi) => board.streams.some((s) => s.x0 - px > lo && s.x0 - px < hi && b.y >= GYv - 1);
    if (b.y >= GYv - 1) {
      if (ahead(board.LOGS.map((x) => x - 95), 120, 210) && moving) { out.sprint = true; out.x = 1; out.actionPressed = false; }
      else if (inStream(60, 150) && moving) { out.sprint = true; out.x = 1; out.actionPressed = false; }
      else if (ahead(board.ROOTS, 20, 170)) { out.y = -1; out.x = 1; if (out.actionPressed) { out.actionPressed = false; out.action = false; } }
      else if (ahead(board.LOGS.map((x) => x - 95), 0, 120) && !moving) out.x = -1; // back up for a run-up
      else if (inStream(0, 60) && !moving) out.x = -1;
    }
  }
  return out;
}

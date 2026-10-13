// Chapter 9: FLIP-FLOP! The Bombanat-Collecting Grithix nets them all, then
// mails the letter (design.md, chapter 9 and "Chases").
//
// Phase 1, the net: a clearing in the wood. The Bombanat with the letter flies
// low about it (the kit's holder: dodges, darts, settles in the ferns to
// hide), while the Trollusk and the Yalapappus scramble about. The Grithix
// strides; Action swings the net in three beats (wind-up, sweep, slam). The
// net's reach is drawn on the grass in front of him, and what the sweep
// catches is exactly what stands in that patch while it sweeps: the Bombanat
// (unless it is mid-dodge; sitting in the ferns it is caught, ferns and all),
// the Trollusk or the Yalapappus (into a jar for a while). A miss ends in a
// slam he has to recover from. Sprint plants the pole and vaults him in a
// long arc, over roots and monsters, at a cost in breath. A Bombanat in the
// net wriggles (the kit's tug); if the Grithix wins, FLIP-FLOP: the letter is
// his.
//
// Phase 2, the post: carry the letter to the official mailbox on the right.
// The Trollusk and the Yalapappus try to trip him: each one crouches first
// (the Trollusk peeks out, the Yalapappus tucks down, a "!" and the line of
// the dive drawn) and then dives at his feet; only a dive trips him, a bump
// does not. A trip drops the letter and he must pick it up again. Step round
// them, vault over them, or net them too. Action at the mailbox posts it.
//
// Bonus: everyone netted. In versus the holder flies the Bombanat, then takes
// the Trollusk (a banner says so).
//
// The kit (chase.js) moves both sides, runs the tug and the Bombanat's hiding
// and dodging; the swing, the vault, the trip and the post are this chapter's
// own modes, which the kit leaves alone (it zeroes the velocity of any mode it
// doesn't know). The kit's lunge is never used: the sweep is the net.

import { makeMover, makeChase, makeTug, stepChase, aiHolder, aiSnatcher, clamp } from '../chase.js';
import * as art from '../art.js';
import { staminaRing, tugBar, drawCover, eventFx, makeFx, roundRect } from '../chasedraw.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';
import { marksFor } from './index.js';

const MAIL = { x: 1700, y: 765 }; // in front of the official mailbox's slot
const SLOT = { x: 1762, y: 590 }; // the slot itself, for the marker
const B = { x0: 230, x1: 1690, y0: 645, y1: 915 };
const VAULT = { time: 0.8, dist: 420, cost: 0.3, height: 170 };
const NET = { ahead: 150, rx: 190, ry: 70 }; // the net's reach: an ellipse on the ground in front of him
const WINDUP = 0.22, SWING = 0.2, SLAM = 0.65, SWING_COOL = 0.9, SWING_COST = 0.22;
const PEEK = 0.45, SLIDE = 0.4, SPRAWL = 0.9;
const JAR_TIME = 6;
const POST_RANGE = 150;

const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default function create(env) {
  const { W, H } = env;
  art.preload(['props.grithix', 'props.trollusk', 'trollusk.poses', 'yalapappus.poses', 'yalapappus.swaps', 'bombanat.poses', 'grithix.poses']);
  const total = 60 + (env.gentle[0] ? 10 : 0);
  const bounds = { ...B };
  const cover = [
    { x: 430, y: 705, sheet: 'grithix', item: 4, h: 170, rx: 105, ry: 40 },
    { x: 1180, y: 880, sheet: 'grithix', item: 4, h: 180, rx: 110, ry: 40 },
    { x: 1460, y: 690, sheet: 'grithix', item: 4, h: 160, rx: 100, ry: 36 },
    { x: 760, y: 870, sheet: 'trollusk', item: 5, h: 190, rx: 100, ry: 40 },
  ].map((k) => ({ shake: 0, ...k }));
  // Gnarled roots: the Grithix must go round or vault; the small ones hop them.
  const obstacles = [
    { x: 980, y: 740, rx: 95, ry: 24, hop: true, root: true },
    { x: 1330, y: 815, rx: 95, ry: 24, hop: true, root: true },
  ];
  const gx = makeMover({
    x: 300, y: 800, speed: 265, sprint: 265, accel: 1900, radius: 50, canHide: false, hopsLogs: false,
    lungeRange: 0, grabRange: 70, regen: 0.09, regenStill: 0.13, windedTime: 2.0,
  });
  const bomb = makeMover({ x: 1250, y: 760, speed: 290, sprint: 490, accel: 1100, windedSpeed: 0.7, drain: 0.34, radius: 40, flies: true, canHide: true, dodgeCooldown: 1.2, dodgeCost: 0.2, regen: 0.2, regenStill: 0.5 });
  const ghost = makeMover({ x: B.x1, y: B.y0, canHide: false, flies: true });
  const chase = makeChase({ snatcher: gx, holder: bomb, bounds, cover, obstacles, rng: env.rng, gentle: env.gentle });
  const gc = art.makeCreature('grithix', gx.x, gx.y);
  const bc = art.makeCreature('bombanat', bomb.x, bomb.y);
  gc.sizeK = 1;
  bc.sizeK = 0.95;
  const fx = makeFx();
  const brain = {};
  let t = 0;
  let shake = 0;
  let phase = 'net';
  let bz = 110; // the Bombanat's height
  let vault = null; // { dx, dy }
  let prevSprint = false;
  let windT = 1.5;
  let immune = 0;
  let postT = 0;
  let letter = null; // dropped on the ground: { x, y, t }
  const netted = new Set();
  let swingHit = false; // this swing already caught something
  let hint = { text: env.versus ? 'Grithix: net the Bombanat!  ·  Bombanat: dodge the net!' : 'Net the Bombanat with the letter!', t: 4 };
  let banner = null; // the versus hand-over: { text, t }
  let youT = 0; // "You!" over the Trollusk after the hand-over
  let fernHint = false, tripHint = false;
  let bombAnimMoving = false;

  // The other two, scrambling about.
  const mk = (id, x, y, speed, size) => ({ id, x, y, vx: 0, vy: 0, facing: 1, speed, mode: 'run', T: 0, cool: 1.5, jarT: 0, goal: null, st: 1, moving: false, c: Object.assign(art.makeCreature(id, x, y), { sizeK: size }) });
  const tro = mk('trollusk', 600, 690, 260, 0.85);
  const yal = mk('yalapappus', 1500, 860, 215, 0.88);
  const others = [tro, yal];

  const human = (o) => env.versus && phase === 'carry' && o === tro;
  const onFeet = () => ['move', 'post', 'windup', 'swing', 'slam', 'stumble'].includes(gx.mode);

  // ---------- the net's reach ----------
  function reach() {
    // Once the swing starts the patch is fixed where he wound up: what is
    // drawn is what the sweep catches, step or no step.
    if (gx.swingAt && (gx.mode === 'swing' || gx.mode === 'slam')) return gx.swingAt;
    const dir = gx.mode === 'windup' ? gx.swingDir || gx.facing : gx.facing;
    return { x: gx.x + dir * NET.ahead, y: gx.y, rx: NET.rx, ry: NET.ry };
  }
  function inReach(o) {
    const r = reach();
    return ((o.x - r.x) / r.rx) ** 2 + ((o.y - r.y) / r.ry) ** 2 < 1;
  }
  const canSwing = () => gx.mode === 'move' && gx.cool <= 0 && gx.winded <= 0 && !chase.tug;

  function jar(o) {
    o.mode = 'jar'; o.jarT = JAR_TIME; o.vx = o.vy = 0;
    if (!netted.has(o.id)) { netted.add(o.id); self.bonus = netted.size; }
    env.sfx('flipflop'); env.sfx('tinkle'); env.vibrate(60);
    fx.say('FLIP-FLOP!', o.x, o.y - 240);
    shake = 0.35;
  }

  // The net comes down on the Bombanat: the tug begins (the kit's grab).
  function netBombanat() {
    bomb.hidden = false;
    chase.tug = makeTug(gx, bomb);
    chase.tug.v = clamp(chase.tug.v + 0.04, 0.4, 0.66); // in the net already: the rope starts a little his way
    gx.st = Math.min(1, gx.st + SWING_COST); // a swing that lands doesn't tire him; only wild ones do
    gx.mode = 'grabbing'; gx.modeT = 0;
    bomb.mode = 'grabbed'; bomb.modeT = 0;
    gx.vx = gx.vy = bomb.vx = bomb.vy = 0;
    chase.events.push({ type: 'grab' });
    env.sfx('snap'); env.sfx('flipflop'); env.vibrate(60);
    shake = 0.3;
    art.kick(bc, 0.5);
    fx.say('In the net!', bomb.x, bomb.y - bz - 200);
  }

  // The sweep: whatever stands in the net's reach is caught.
  function sweep() {
    let hit = false;
    for (const o of others) if (o.mode !== 'jar' && inReach(o)) { jar(o); hit = true; }
    if (phase === 'net' && bomb.mode !== 'dodge' && bomb.mode !== 'grabbed' && inReach(bomb)) { netBombanat(); hit = true; }
    return hit;
  }

  function trip(by) {
    gx.mode = 'trip'; gx.modeT = 0; gx.vx = gx.vy = 0;
    vault = null;
    env.sfx('stumble'); env.sfx('thump'); env.vibrate(110);
    fx.say('Tripped!', gx.x, gx.y - 330);
    fx.say(by === tro ? 'Snerk!' : 'Grimm!', by.x, by.y - 220);
    shake = 0.3;
    art.kick(gc, 0.6);
    // The letter flies out of his hand, away from the mailbox.
    const dir = gx.x > 1300 ? -1 : env.rng() < 0.5 ? -1 : 1;
    letter = { x: clamp(gx.x + dir * (170 + env.rng() * 110), B.x0, B.x1 - 60), y: clamp(gx.y + (env.rng() - 0.5) * 140, B.y0, B.y1), t: 0 };
    postT = 0;
    hint = { text: 'Pick the letter up again!', t: 2.2 };
  }

  // ---------- the Grithix's input: vault and the three-beat net ----------
  function grithixInput(inS) {
    const out = { x: inS.x || 0, y: inS.y || 0, sprint: false, actionPressed: false };
    const sprintEdge = !!inS.sprint && !prevSprint;
    prevSprint = !!inS.sprint;
    if (chase.tug) return { ...out, actionPressed: !!inS.actionPressed };
    if (gx.mode !== 'move') return { x: 0, y: 0 };
    const im = Math.hypot(out.x, out.y);
    if (sprintEdge && im > 0.2 && gx.st >= VAULT.cost && gx.winded <= 0) {
      // Plant the pole and vault.
      gx.mode = 'vault'; gx.modeT = 0;
      gx.st -= VAULT.cost;
      vault = { dx: out.x / im, dy: (out.y / im) * 0.6 };
      gx.facing = Math.sign(out.x) || gx.facing;
      env.sfx('swoosh');
      art.kick(gc, 0.3);
      return { x: 0, y: 0 };
    }
    if (inS.actionPressed) {
      if (phase === 'carry' && !letter && near(gx, MAIL) < POST_RANGE) {
        gx.mode = 'post'; gx.modeT = 0; postT = 0; env.sfx('page');
        gx.facing = 1;
        return { x: 0, y: 0 };
      }
      if (canSwing()) {
        gx.mode = 'windup'; gx.modeT = 0; swingHit = false;
        gx.swingDir = Math.abs(out.x) > 0.2 ? Math.sign(out.x) : gx.facing;
        gx.facing = gx.swingDir;
        // Every swing costs breath: swing at nothing all the time and he is winded.
        gx.st = Math.max(0, gx.st - SWING_COST);
        if (gx.st <= 0 && gx.winded <= 0) { gx.winded = gx.windedTime; env.sfx('pant'); fx.say('Winded!', gx.x, gx.y - 330); }
        art.kick(gc, -0.2);
        env.sfx('swish');
        return { x: 0, y: 0 };
      }
    }
    return out;
  }

  // The three beats of the swing, the vault, the trip and the post.
  function stepGrithix(dt) {
    if (gx.mode === 'windup' && gx.modeT >= WINDUP) { gx.swingAt = reach(); gx.mode = 'swing'; gx.modeT = 0; env.sfx('swoosh'); }
    if (gx.mode === 'swing') {
      // He steps into it, and the net sweeps the patch in front of him.
      gx.x = clamp(gx.x + gx.swingDir * 160 * dt, B.x0, B.x1);
      if (!swingHit && sweep()) swingHit = true;
      if (gx.mode === 'swing' && gx.modeT >= SWING) {
        gx.modeT = 0;
        if (swingHit) { gx.mode = 'move'; gx.cool = 0.4; } else {
          // A miss: the net slams the ground and he has to pick it up.
          gx.mode = 'slam'; gx.cool = SLAM + SWING_COOL;
          env.sfx('thump'); shake = Math.max(shake, 0.2); art.kick(gc, 0.5);
          fx.say('Missed!', gx.x + gx.swingDir * NET.ahead, gx.y - 160);
          // The Bombanat grows wary of a wild swinger and keeps out of reach for a while.
          if (phase === 'net' && !env.versus) brain.wary = 2.4;
        }
      }
    }
    if (gx.mode === 'slam' && gx.modeT >= SLAM) { gx.mode = 'move'; gx.modeT = 0; }
    if (gx.mode === 'vault' && vault) {
      const p = gx.modeT / VAULT.time;
      const sp = VAULT.dist / VAULT.time;
      gx.x = clamp(gx.x + vault.dx * sp * dt, B.x0, B.x1);
      gx.y = clamp(gx.y + vault.dy * sp * dt, B.y0, B.y1);
      gc.z = Math.sin(Math.min(1, p) * Math.PI) * VAULT.height;
      if (p >= 1) {
        gx.mode = 'move'; gx.modeT = 0; vault = null; gc.z = 0;
        gx.landT = 0.25;
        env.sfx('thump');
        shake = Math.max(shake, 0.15);
        art.kick(gc, 0.5);
      }
    }
    if (gx.mode === 'trip' && gx.modeT > 1.25) { gx.mode = 'move'; gx.modeT = 0; immune = 1.1; }
    if (gx.mode === 'post') {
      postT += dt;
      if (postT > 0.8) {
        self.done = true; self.outcome = 'snatched';
        env.sfx('thunk'); env.sfx('cheer');
        fx.say('Posted!', MAIL.x - 60, MAIL.y - 360);
        gx.modeT = 0;
      }
    }
  }

  // ---------- the trippers ----------
  function startTackle(o) {
    // The telegraph: a crouch (the Trollusk peeks out, the Yalapappus tucks
    // down), then the dive, always at the Grithix's feet (where he is now: he
    // can still step out of its line).
    const dx = gx.x - o.x, dy = gx.y - o.y, dd = Math.hypot(dx, dy) || 1;
    o.mode = 'peek'; o.T = 0; o.vx = o.vy = 0; o.cool = PEEK + SLIDE + 1.4;
    o.dive = { x: dx / dd, y: dy / dd };
    o.facing = Math.sign(dx) || o.facing;
    env.sfx(o === tro ? 'rustle' : 'dodge');
    if (!tripHint && !env.versus) { tripHint = true; hint = { text: 'Look out! Step round them, or Sprint to pole-vault.', t: 3 }; }
  }

  function updateOther(o, dt, inH) {
    o.T += dt;
    o.cool = Math.max(0, o.cool - dt);
    if (o.mode === 'jar') {
      o.jarT -= dt;
      if (o.jarT <= 0) {
        // Pops the cork and scrambles back in from the edge.
        o.mode = 'run'; o.cool = 2; o.x = o === tro ? B.x0 + 20 : B.x1 - 260; o.y = 880; o.vx = o.vy = 0;
        env.sfx('free');
        fx.say('Pop!', o.x, o.y - 200);
      }
      return;
    }
    let tx = 0, ty = 0, sprint = false, act = false;
    if (human(o)) {
      tx = inH?.x || 0; ty = inH?.y || 0; sprint = !!inH?.sprint; act = !!inH?.actionPressed;
    } else {
      const d = near(o, gx);
      let goal;
      if (phase === 'net') {
        // Scramble about, keeping away from the net.
        if (!o.goal || o.T > o.until || near(o, o.goal) < 30) {
          o.goal = { x: B.x0 + env.rng() * (B.x1 - B.x0), y: B.y0 + env.rng() * (B.y1 - B.y0) }; o.T = 0; o.until = 1.5 + env.rng() * 2;
        }
        goal = o.goal;
        if (d < 300) goal = { x: o.x + (o.x - gx.x), y: o.y + (o.y - gx.y) };
      } else if (o.cool > 1.2) {
        // Just dived (or tripped him): run off and gloat.
        goal = { x: o.x + (o.x - gx.x), y: o.y + (o.y - gx.y) };
      } else {
        // Guard the way to the mailbox (or the dropped letter), then go for his feet.
        const aim = letter || MAIL;
        const k = letter ? 0.45 : o === tro ? 0.3 : 0.55;
        const ix = aim.x + (gx.x - aim.x) * k, iy = aim.y + (gx.y - aim.y) * k + (o === tro ? -50 : 50);
        goal = d < 260 ? { x: gx.x, y: gx.y } : { x: ix, y: iy };
        if (d < 230 && o.cool <= 0 && gx.mode !== 'vault' && gx.mode !== 'trip' && immune <= 0 && env.rng() < dt * (2 + 3 * env.skill)) act = true;
      }
      const gx2 = goal.x - o.x, gy2 = goal.y - o.y, gd = Math.hypot(gx2, gy2);
      if (gd > 8) { tx = gx2 / gd; ty = gy2 / gd; }
      sprint = phase === 'carry' && o.cool <= 0 && d < 520 && o.st > 0.3;
      // A net wound up over them: hop aside (the computer ones read it as a player would).
      if (gx.mode === 'windup' && o.sawWindup !== true && o.mode === 'run' && inReach(o)) {
        o.sawWindup = true;
        if (env.rng() < 0.2 + 0.5 * env.skill) {
          const dx = o.x - gx.x, dy = o.y - gx.y, dd = Math.hypot(dx, dy) || 1;
          const side = env.rng() < 0.5 ? -1 : 1;
          o.mode = 'hop'; o.T = 0; o.vx = (-dy / dd * side * 0.6 + dx / dd * 0.8) * 650; o.vy = (dx / dd * side * 0.6 + dy / dd * 0.8) * 500;
          env.sfx('dodge');
        }
      }
      if (gx.mode !== 'windup') o.sawWindup = false;
    }
    if (o.mode === 'hop') {
      if (o.T > 0.25) { o.mode = 'run'; o.T = 0; }
    } else if (o.mode === 'peek') {
      o.vx = o.vy = 0;
      if (o.T > PEEK) { o.mode = 'slide'; o.T = 0; o.vx = o.dive.x * 760; o.vy = o.dive.y * 570; env.sfx(o === yal ? 'whoosh' : 'dodge'); }
    } else if (o.mode === 'slide') {
      if (o.T > SLIDE) { o.mode = 'sprawl'; o.T = 0; env.sfx('stumble'); }
    } else if (o.mode === 'sprawl') {
      o.vx *= Math.exp(-10 * dt); o.vy *= Math.exp(-10 * dt);
      if (o.T > SPRAWL) { o.mode = 'run'; o.T = 0; }
    } else {
      if (act && o.cool <= 0 && phase === 'carry') startTackle(o);
      else {
        o.sprinting = sprint && o.st > 0;
        const top = o.sprinting ? o.speed * 1.7 : o.speed;
        const k = 1 - Math.exp(-8 * dt);
        o.vx += (tx * top - o.vx) * k; o.vy += (ty * top * 0.75 - o.vy) * k;
        o.st = o.sprinting ? Math.max(0, o.st - 0.45 * dt) : Math.min(1, o.st + 0.18 * dt);
      }
    }
    o.x = clamp(o.x + o.vx * dt, B.x0, B.x1);
    o.y = clamp(o.y + o.vy * dt, B.y0, B.y1);
    if (Math.abs(o.vx) > 20 && o.mode !== 'peek') o.facing = Math.sign(o.vx);
    // The dive trips the Grithix if it reaches his feet while he's on them.
    if (phase === 'carry' && o.mode === 'slide' && immune <= 0 && onFeet() && near(o, gx) < 95) {
      trip(o);
      o.mode = 'sprawl'; o.T = 0; o.cool = 2.4; o.vx *= 0.3; o.vy *= 0.3;
    }
  }

  // ---------- the chapter ----------
  const self = {
    focus: () => (phase === 'net' ? [gx, bomb] : [gx, letter || MAIL]),
    time: total,
    done: false,
    outcome: null,
    bonus: 0,
    chase,
    others,
    get phase() { return phase; },
    get letter() { return letter; },
    get banner() { return banner; },
    mail: MAIL,
    reach,
    inReach,
    canSwing,
    update(dt, inS, inH) {
      t += dt;
      fx.update(dt);
      hint.t -= dt;
      if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
      youT = Math.max(0, youT - dt);
      shake = Math.max(0, shake - dt);
      if (self.done) {
        if (self.outcome === 'snatched') { art.setAnim(gc, gx.modeT < 0.6 ? 'post' : 'celebrate'); gx.modeT += dt; }
        else { art.setAnim(gc, 'idle'); }
        art.animate(gc, dt);
        for (const o of others) { if (o.mode !== 'jar') { art.setAnim(o.c, self.outcome === 'snatched' ? 'wail' : 'celebrate'); art.animate(o.c, dt); } }
        if (phase === 'net') { art.setAnim(bc, 'celebrate'); art.animate(bc, dt); }
        return;
      }
      self.time = Math.max(0, self.time - dt);
      inS = inS || {};
      immune = Math.max(0, immune - dt);
      gx.landT = Math.max(0, (gx.landT || 0) - dt);

      const gin = grithixInput(inS);
      let bin = { x: 0, y: 0 };
      if (phase === 'net') {
        bin = env.versus ? (inH || {}) : aiHolder(chase, brain, env.skill, dt);
        if (!env.versus) {
          // Tangled in the net it can't wriggle as fast as it would like: some of its pulls slip.
          if (chase.tug && bin.actionPressed && env.rng() > 0.5 + 0.3 * env.skill) bin = { ...bin, actionPressed: false };
          // A canny Bombanat keeps away from the mailbox side of the clearing:
          // caught there, the letter would be posted in a moment.
          if (!chase.tug && bomb.mode === 'move' && !bomb.hidden && bomb.x > 1100) {
            bin = { ...bin, x: (bin.x || 0) - (bomb.x - 1100) / 300 };
            const m = Math.hypot(bin.x, bin.y || 0);
            if (m > 1) { bin.x /= m; bin.y = (bin.y || 0) / m; }
          }
          // It sees the net wound up, as a player would: it backs off, or
          // saves its dodge for the sweep itself.
          if (gx.mode === 'windup' && !brain.sawWindup && near(gx, bomb) < 420 && !bomb.hidden) {
            brain.sawWindup = true;
            const r = env.rng();
            if (r < 0.25 + 0.45 * env.skill) brain.dodgeAt = t + WINDUP + 0.02 + env.rng() * 0.1;
            else if (r < 0.5 + 0.45 * env.skill) brain.backOff = 0.45;
          }
          if (gx.mode !== 'windup' && gx.mode !== 'swing') brain.sawWindup = false;
          brain.backOff = Math.max(0, (brain.backOff || 0) - dt);
          if (brain.backOff > 0 && !chase.tug && !bin.actionPressed) {
            const dx = bomb.x - gx.x, dy = bomb.y - gx.y, d = Math.hypot(dx, dy) || 1;
            bin = { ...bin, x: dx / d, y: dy / d, sprint: bomb.st > 0.6 };
          }
          if (brain.dodgeAt && t >= brain.dodgeAt) { brain.dodgeAt = 0; if (!chase.tug) bin = { ...bin, actionPressed: true }; }
          // Wary after his miss: it flaps along just out of reach (no sprint: it saves its breath).
          brain.wary = Math.max(0, (brain.wary || 0) - dt);
          if (brain.wary > 0 && !chase.tug && !bomb.hidden && bomb.mode === 'move' && near(gx, bomb) < 430 && !bin.actionPressed) {
            const dx = bomb.x - gx.x, dy = bomb.y - gx.y, d = Math.hypot(dx, dy) || 1;
            const cx = (B.x0 + B.x1) / 2 - bomb.x, cy = (B.y0 + B.y1) / 2 - bomb.y;
            bin = { ...bin, x: dx / d + cx / 900, y: dy / d + cy / 400, sprint: false };
          }
        }
      } else {
        // The chase kit carries on with a stand-in holder far away.
        ghost.x = gx.x < 920 ? B.x1 : B.x0; ghost.y = gx.y < 785 ? B.y1 : B.y0;
        ghost.vx = ghost.vy = 0; ghost.mode = 'move';
      }
      const ev = stepChase(chase, gin, bin, dt);
      eventFx(env, ev, fx);
      if (ev.some((e) => e.type === 'free')) { fx.say('Wriggled out!', bomb.x, bomb.y - bz - 200); hint = { text: 'It wriggled out! Net it again!', t: 2 }; }
      if (ev.some((e) => e.type === 'flushed')) hint = { text: 'Out it comes!', t: 1.5 };
      stepGrithix(dt);

      // FLIP-FLOP: the Bombanat is netted, and the letter is the Grithix's.
      if (chase.done && phase === 'net') {
        phase = 'carry';
        chase.done = false; chase.result = null; chase.tug = null;
        chase.h = ghost;
        gx.mode = 'move'; gx.modeT = 0; gx.cool = 0;
        netted.add('bombanat'); self.bonus = netted.size;
        env.sfx('flipflop'); env.vibrate(140);
        fx.say('FLIP-FLOP!', bomb.x, bomb.y - bz - 240);
        shake = 0.45;
        // The commotion knocks the jars over: everybody's out again, after him.
        for (const o of others) if (o.mode === 'jar') { o.mode = 'run'; o.cool = 1.6; o.x = clamp(o.x, B.x0, B.x1); env.sfx('free'); fx.say('Pop!', o.x, o.y - 200); }
        for (const o of others) { o.cool = Math.max(o.cool, 1.5); }
        if (env.versus) {
          tro.cool = 2.5;
          banner = { text: 'Player 2: now you are the Trollusk! Trip him up!', t: 4 };
          youT = 5;
          hint = { text: 'Grithix: post the letter in the mailbox →', t: 4 };
        } else hint = { text: 'Got it! Post it in the official mailbox →', t: 4 };
      }

      for (const o of others) updateOther(o, dt, inH);

      // Pick the letter up again.
      if (letter) {
        letter.t += dt;
        if (gx.mode === 'move' && near(gx, letter) < 90) { letter = null; env.sfx('page'); fx.say('Got it!', gx.x, gx.y - 330); hint = { text: 'Post it in the official mailbox →', t: 2.5 }; }
      }

      // Rustling ferns, and the ferns the Bombanat is hiding in tremble.
      windT -= dt;
      if (windT <= 0) { windT = 1.3 + env.rng() * 2.5; const k = cover[Math.floor(env.rng() * cover.length)]; k.shake = Math.max(k.shake, 0.6); env.sfx('rustle'); }
      for (const k of cover) {
        if (phase === 'net' && bomb.inCover === k && bomb.rustle > 0.2) k.shake = Math.max(k.shake, bomb.rustle);
        if (phase === 'net' && bomb.hidden && bomb.inCover === k && !env.versus) k.shake = Math.max(k.shake, 0.3);
        k.shake = Math.max(0, k.shake - dt * 1.5);
      }
      if (phase === 'net' && bomb.hidden && !fernHint && !env.versus) { fernHint = true; hint = { text: 'It hid in the ferns! Net the ferns!', t: 3 }; }

      // The Bombanat's height: low over the grass, down into the ferns to hide.
      let target = 105;
      if (bomb.hidden) target = 10;
      else if (bomb.mode === 'grabbed') target = 30;
      else if (bomb.mode === 'dodge') target = 150;
      bz += (target - bz) * (1 - Math.exp(-5 * dt));

      if (self.time <= 0 && !self.done) { self.done = true; self.outcome = 'kept'; }

      // Animation.
      gc.x = gx.x; gc.y = gx.y;
      if (gx.mode !== 'vault') gc.z = 0;
      art.animate(gc, dt, gx.mode === 'vault' ? 0 : gx.vx, gx.vy);
      if (gx.mode === 'vault' && vault) gc.facing = Math.sign(vault.dx) || gc.facing;
      if (gx.mode === 'windup' || gx.mode === 'swing' || gx.mode === 'slam') gc.facing = gx.swingDir || gc.facing;
      animGrithix();
      bc.x = bomb.x; bc.y = bomb.y; bc.z = bz;
      art.animate(bc, dt, bomb.vx, bomb.vy);
      animBombanat();
      for (const o of others) {
        o.c.x = o.x; o.c.y = o.y;
        art.animate(o.c, dt, o.vx, o.vy);
        o.c.facing = o.facing;
        const sp = Math.hypot(o.vx, o.vy);
        o.moving = sp > 70 ? true : sp < 25 ? false : o.moving; // hysteresis: no flicker at a walking pace
        const gloat = o.cool > 1.2 && phase === 'carry' && o.mode === 'run';
        if (o.id === 'trollusk') art.setAnim(o.c, o.mode === 'peek' ? 'duck' : o.mode === 'slide' || o.mode === 'hop' ? 'skid' : o.mode === 'sprawl' ? 'scuttle' : gloat ? 'celebrate' : o.moving ? (o.sprinting ? 'run' : 'sneak') : 'idle');
        else art.setAnim(o.c, o.mode === 'peek' ? 'land' : o.mode === 'hop' ? 'hop' : o.mode === 'slide' ? 'ball' : o.mode === 'sprawl' ? 'dizzy' : gloat ? 'shout' : o.moving ? 'trundle' : 'idle');
      }
    },
    draw(g, tt) {
      g.save();
      if (shake > 0 && !env.reduceMotion) g.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 14 * shake);
      art.drawScene(g, 'scenes/grithix', W, H);
      drawReach(g, tt);
      const things = [
        ...cover.map((k) => ({ y: k.y + k.ry * 0.9, draw: () => drawCover(g, k, tt) })),
        ...obstacles.map((o) => ({ y: o.y + o.ry, draw: () => art.drawSprite(g, art.prop('grithix', 5), o.x, o.y + o.ry + 12, { height: 125, flip: o.x > 1100 }) })),
        { y: gx.y, draw: () => drawGrithix(g, tt) },
        ...others.filter((o) => o.mode !== 'jar').map((o) => ({ y: o.y, draw: () => drawOther(g, o, tt) })),
      ];
      if (letter) things.push({ y: letter.y, draw: () => droppedLetter(g, letter, tt) });
      if (phase === 'net') things.push({ y: bomb.y + 2000, draw: () => drawBombanat(g, tt) });
      things.sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      drawMarkers(g, tt);
      if (chase.tug) tugBar(g, chase, (gx.x + bomb.x) / 2, Math.min(gx.y, bomb.y) - 400, ['In the net!', 'Wriggle out!'], { kind: env.inputKind, t: tt, W });
      fx.draw(g);
      g.restore();
      drawJars(g, tt);
      if (!self.done) {
        if (hint.t > 0) hintStrip(g, hint.text, W, 165, Math.min(1, hint.t * 2));
        if (banner) hintStrip(g, banner.text, W, 250, Math.min(1, banner.t * 2), '#f2c53d');
      }
    },
    marks() {
      const elapsed = total - self.time;
      return marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: elapsed / total, bonus: self.bonus });
    },
    hud() {
      if (self.done) return '';
      const jars = `Jars ${netted.size}/3`;
      if (phase === 'net') return `Net the Bombanat! · ${jars}`;
      return `${letter ? 'Pick up the letter!' : 'Post it!'} · ${jars}`;
    },
  };

  // ---------- animation ----------
  function animGrithix() {
    const sp = Math.hypot(gx.vx, gx.vy);
    if (self.done) return;
    switch (gx.mode) {
      case 'windup': art.setAnim(gc, 'windup'); break;
      case 'swing': art.setAnim(gc, 'swing'); break;
      case 'slam': case 'stumble': art.setAnim(gc, 'slam'); break;
      case 'grabbing': art.setAnim(gc, 'slam'); break;
      case 'dazed': case 'trip': art.setAnim(gc, 'trip'); break;
      case 'post': art.setAnim(gc, 'post'); break;
      case 'vault': {
        art.setAnim(gc, 'vault');
        const p = gx.modeT / VAULT.time;
        gc.animT = (p < 0.25 ? 0 : p < 0.8 ? 1 : 2) / 4 + 0.01; // plant, top, land
        break;
      }
      default:
        if (gx.landT > 0) { art.setAnim(gc, 'vault'); gc.animT = 2 / 4 + 0.01; } else {
          gx.moving = sp > 70 ? true : sp < 25 ? false : gx.moving;
          art.setAnim(gc, gx.moving ? 'stride' : 'idle');
        }
    }
  }

  function animBombanat() {
    const sp = Math.hypot(bomb.vx, bomb.vy);
    bombAnimMoving = sp > 180 ? true : sp < 100 ? false : bombAnimMoving;
    if (bomb.mode === 'grabbed') art.setAnim(bc, 'netted');
    else if (bomb.mode === 'dodge') art.setAnim(bc, 'swoop');
    else if (bomb.winded > 0) art.setAnim(bc, 'stall');
    else if (bomb.hidden) art.setAnim(bc, 'perched');
    else if (bomb.sprinting || !bombAnimMoving || chase.flushT > 0) art.setAnim(bc, 'flap');
    else art.setAnim(bc, 'glide');
    bc.M.anims.flap.fps = bomb.sprinting ? 16 : 10;
  }

  // ---------- drawing ----------
  // The net's reach, on the grass in front of him: what a swing will catch.
  function drawReach(g, tt) {
    if (self.done || gx.mode === 'vault' || gx.mode === 'trip' || gx.mode === 'post' || gx.mode === 'dazed' || chase.tug) return;
    const r = reach();
    const live = phase === 'net' && (!bomb.hidden || !env.versus) && inReach(bomb);
    const hot = live || others.some((o) => o.mode !== 'jar' && inReach(o));
    const swinging = gx.mode === 'windup' || gx.mode === 'swing';
    g.save();
    g.translate(r.x, r.y);
    g.fillStyle = swinging ? 'rgba(242,197,61,0.38)' : hot ? 'rgba(242,197,61,0.26)' : 'rgba(251,246,232,0.14)';
    g.strokeStyle = hot || swinging ? '#b5463a' : 'rgba(51,36,26,0.7)';
    g.lineWidth = hot ? 5 : 3.5;
    g.setLineDash(swinging ? [] : [14, 10]);
    g.lineDashOffset = -tt * 40;
    g.beginPath(); g.ellipse(0, 0, r.rx, r.ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }

  function drawGrithix(g, tt) {
    if (gx.mode === 'vault') {
      // His shadow stays on the ground under the arc.
      g.save(); g.globalAlpha = 0.2; g.fillStyle = '#2b1d14';
      g.beginPath(); g.ellipse(gx.x, gx.y, 80, 18, 0, 0, Math.PI * 2); g.fill(); g.restore();
    } else staminaRing(g, gx, gx.x, gx.y, 62, '#d59bb4');
    gc.alpha = immune > 0 ? 0.75 : 1;
    art.drawCreature(g, gc, tt, { reduceMotion: env.reduceMotion, shadow: gx.mode !== 'vault' });
  }

  function drawOther(g, o, tt) {
    if (human(o)) staminaRing(g, o, o.x, o.y, 48, '#f2c53d');
    art.drawCreature(g, o.c, tt, { reduceMotion: env.reduceMotion });
    if (o.mode === 'peek') {
      // The telegraph: a "!" over the crouch, and the line of the dive.
      const h = o.c.M.height * o.c.sizeK;
      g.save();
      g.strokeStyle = '#b5463a'; g.lineWidth = 5; g.setLineDash([10, 10]); g.lineDashOffset = -tt * 60;
      g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + o.dive.x * 300, o.y + o.dive.y * 225); g.stroke();
      g.setLineDash([]);
      const s = 1 + Math.sin(tt * 14) * 0.08;
      g.translate(o.x, o.y - h * 0.75 - 40);
      g.scale(s, s);
      g.fillStyle = '#fbf6e8'; g.strokeStyle = '#33241a'; g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, 34, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#b5463a'; g.font = '800 46px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('!', 0, 2);
      g.restore();
    }
  }

  function drawBombanat(g, tt) {
    if (bomb.hidden) {
      // Settled in the ferns. Alone against the computer, a wingtip shows now and then.
      if (env.versus || (tt % 3.2) > 0.9) return;
      const z0 = bc.z;
      bc.z = (bomb.inCover?.h || 140) * 0.55;
      art.drawCreature(g, bc, tt, { reduceMotion: env.reduceMotion, shadow: false });
      bc.z = z0;
      return;
    }
    g.save(); g.globalAlpha = 0.22; g.fillStyle = '#2b1d14';
    g.beginPath(); g.ellipse(bomb.x, bomb.y, 70, 16, 0, 0, Math.PI * 2); g.fill(); g.restore();
    staminaRing(g, bomb, bomb.x, bomb.y, 50, '#c9b8d4');
    art.drawCreature(g, bc, tt, { reduceMotion: env.reduceMotion, shadow: false });
  }

  // Who has the letter, where to go, and what button to press now.
  function drawMarkers(g, tt) {
    if (self.done) return;
    const kind = env.inputKind;
    if (phase === 'net') {
      if (bomb.hidden) {
        // In the ferns: the letter's ring hangs over them (the computer's hiding place is no secret to a child).
        if (!env.versus && bomb.inCover) { g.save(); g.globalAlpha = 0.8; letterTag(g, bomb.inCover.x, bomb.inCover.y - bomb.inCover.h - 10, { t: tt, r: 44 }); g.restore(); }
      } else {
        const top = bomb.y - bz - 120;
        letterTag(g, bomb.x, top - 40, { t: tt, r: 44 });
        if (t < 6) marker(g, bomb.x, top - 110, { t: tt, label: 'Net it!' });
      }
      if (!chase.tug) {
        if (canSwing() && !bomb.hidden && inReach(bomb) && bomb.mode !== 'dodge') actionPrompt(g, gx.x, gx.y - 340, 'Swing!', { kind, t: tt, pulse: 1 });
        else if (canSwing() && bomb.hidden && !env.versus && inReach(bomb)) actionPrompt(g, gx.x, gx.y - 340, 'Net the ferns!', { kind, t: tt, pulse: 1 });
        if (env.versus && (gx.mode === 'windup' || gx.mode === 'swing') && inReach(bomb) && bomb.mode === 'move' && bomb.cool <= 0) actionPrompt(g, bomb.x, bomb.y - bz - 170, 'Dodge!', { kind, side: 1, t: tt, pulse: 1 });
      }
    } else {
      if (!letter) {
        letterTag(g, gx.x, gx.y - (gc.z || 0) - 345, { t: tt, r: 40 });
        // The mailbox: where to go, and the button when you are there.
        const ready = near(gx, MAIL) < POST_RANGE && gx.mode === 'move';
        if (ready) actionPrompt(g, SLOT.x - 40, SLOT.y - 60, 'Post it!', { kind, t: tt, pulse: 1 });
        else marker(g, SLOT.x, SLOT.y - 70, { t: tt, label: 'Post it here!', colour: '#f2c53d' });
      } else marker(g, letter.x, letter.y - 90, { t: tt, label: 'The letter!' });
      if (env.versus) {
        if (youT > 0 && tro.mode !== 'jar') marker(g, tro.x, tro.y - tro.c.M.height * tro.c.sizeK - 40, { t: tt, label: 'You!', colour: '#f2c53d' });
        if (tro.mode === 'run' && tro.cool <= 0 && near(tro, gx) < 300 && onFeet()) actionPrompt(g, tro.x, tro.y - 250, 'Trip him!', { kind, side: 1, t: tt, pulse: 1 });
      }
      if (canSwing() && others.some((o) => o.mode !== 'jar' && o.mode !== 'sprawl' && inReach(o))) actionPrompt(g, gx.x, gx.y - 340, 'Net it!', { kind, t: tt, pulse: 0.5 });
    }
  }

  // The collecting jars, on the mossy bank at the bottom left.
  function drawJars(g, tt) {
    const slots = [['bombanat', bc], ['trollusk', tro.c], ['yalapappus', yal.c]];
    slots.forEach(([id, c], i) => {
      const x = 120 + i * 125, y = 1062;
      const inJar = id === 'bombanat' ? phase === 'carry' || self.outcome === 'snatched' : others.find((o) => o.id === id).mode === 'jar';
      if (id === 'bombanat' && inJar) {
        art.drawSprite(g, art.prop('grithix', 3), x, y + Math.sin(tt * 9) * 2, { height: 125, rot: Math.sin(tt * 7) * 0.05 });
        return;
      }
      art.drawSprite(g, art.prop('grithix', 2), x, y, { height: 125, alpha: inJar ? 1 : 0.55 });
      if (inJar) {
        // A tiny monster rattling about inside.
        const s = { ...c, x, y: y - 22 + Math.sin(tt * 8 + i) * 3, z: 0, sizeK: 0.27, facing: Math.sin(tt * 3 + i) > 0 ? 1 : -1, sq: 0, lean: 0, flash: 0, alpha: 1, drawnImg: null, fade: null };
        art.drawCreature(g, s, tt, { reduceMotion: true, shadow: false });
        art.drawSprite(g, art.prop('grithix', 2), x, y, { height: 125, alpha: 0.35 });
      }
      if (netted.has(id) && !inJar) {
        g.save(); g.fillStyle = '#f2c53d'; g.strokeStyle = '#33241a'; g.lineWidth = 3;
        g.beginPath(); g.arc(x + 38, y - 104, 13, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }
    });
  }

  return self;
}

// A hint on a cream band across the top: big, and readable over the leaves.
function hintStrip(g, text, W, y, alpha = 1, colour = 'rgba(251,246,232,0.94)') {
  if (!text) return;
  g.save();
  g.globalAlpha = alpha;
  g.font = '800 40px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = Math.min(W - 40, g.measureText(text).width + 70);
  g.fillStyle = colour;
  g.strokeStyle = '#33241a';
  g.lineWidth = 4;
  roundRect(g, W / 2 - w / 2, y - 36, w, 72, 22);
  g.fill(); g.stroke();
  g.fillStyle = '#33241a';
  g.fillText(text, W / 2, y + 2);
  g.restore();
}

function droppedLetter(g, l, t) {
  const hop = l.t < 0.5 ? Math.sin((l.t / 0.5) * Math.PI) * 60 : Math.abs(Math.sin(t * 3)) * 6;
  g.save();
  g.globalAlpha = 0.25; g.fillStyle = '#2b1d14';
  g.beginPath(); g.ellipse(l.x, l.y, 34, 9, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  letterTag(g, l.x, l.y - 30 - hop, { t, r: 40 });
}

// ---------- the how-to-play page (OM-H9a, b, c) ----------
export const HOWTO = [
  {
    text: 'Swing your net at the Bombanat with the letter, FLIP-FLOP!',
    scene: 'scenes/grithix', crop: [420, 330, 1000, 750],
    items: [
      { creature: 'grithix', anim: 'swing', x: 230, y: 430, h: 300 },
      { creature: 'bombanat', anim: 'flap', x: 470, y: 270, h: 170, shadow: false },
      { ring: [470, 270, 110] },
      { word: 'FLIP-FLOP!', x: 440, y: 110, size: 48 },
    ],
  },
  {
    text: 'Carry it past the Trollusk and the Yalapappus: step round them, or pole-vault with Sprint.',
    scene: 'scenes/grithix', crop: [300, 330, 1000, 750],
    items: [
      { creature: 'trollusk', anim: 'duck', x: 470, y: 395, h: 150 },
      { sprite: ['props.grithix', 4], x: 470, y: 460, h: 170 },
      { creature: 'grithix', anim: 'stroll', x: 220, y: 430, h: 300 },
      { path: [[300, 440], [380, 330], [520, 300], [610, 380]] },
      { word: '!', x: 470, y: 250, size: 60 },
    ],
  },
  {
    text: 'At the official mailbox, press Action to post it (net the others for a bonus).',
    scene: 'scenes/grithix', crop: [900, 330, 1000, 750],
    items: [
      { sprite: ['props.grithix', 1], x: 460, y: 445, h: 300 },
      { creature: 'grithix', anim: 'post', x: 250, y: 445, h: 300 },
      { ring: [405, 240, 60] },
      { word: 'Posted!', x: 250, y: 110, size: 48 },
    ],
  },
];

// ---------- a competent player, for the browser check and the tests ----------
const bots = new WeakMap();
export function autopilot(ch, dt = 1 / 20) {
  let b = bots.get(ch);
  if (!b) { b = {}; bots.set(ch, b); }
  const len = Math.hypot;
  const toward = (a, c) => { const dx = c.x - a.x, dy = c.y - a.y, d = len(dx, dy) || 1; return { x: dx / d, y: dy / d, d }; };
  const c = ch.chase, g = c.s;
  const press = () => { const p = !b.pp; b.pp = p; return p; };
  if (c.tug) return aiSnatcher(c, b, 0.6, dt);
  if (ch.phase === 'net') {
    const h = c.h;
    // Where it is: in the open, or the ferns it sat down in.
    const tgt = h.hidden ? (h.inCover || c.lastSeen) : h;
    const tg = toward(g, tgt);
    const out = { x: tg.x, y: tg.y };
    if (ch.inReach(tgt) && ch.canSwing() && h.mode !== 'dodge') { out.actionPressed = press(); return out; }
    // Stand off a little from the open Bombanat so the swing's patch lands on it.
    if (!h.hidden && tg.d < 140) { out.x *= 0.3; out.y *= 0.3; }
    if (!h.hidden && tg.d > 500 && tg.d < 900 && g.st > 0.6 && g.mode === 'move' && !b.ps) { out.sprint = true; b.ps = true; return out; }
    b.ps = false;
    return out;
  }
  const tg = toward(g, ch.letter || ch.mail);
  const out = { x: tg.x, y: tg.y };
  if (!ch.letter && tg.d < 120 && g.mode === 'move') { out.actionPressed = press(); return out; }
  let th = null, td = 1e9;
  for (const o of ch.others) {
    if (o.mode === 'jar' || o.mode === 'sprawl') continue;
    const d = len(o.x - g.x, o.y - g.y);
    if ((o.x - g.x) * tg.x + (o.y - g.y) * tg.y > -40 && d < td) { td = d; th = o; }
  }
  if (th && td < 260) {
    if (th.mode === 'peek' || th.mode === 'slide') {
      if (g.st >= 0.35 && g.mode === 'move' && tg.d > 300) { out.sprint = true; return out; }
      // No breath to vault: step aside, out of the line of the dive.
      const a = toward(th, g); out.x = -a.y; out.y = a.x * 0.6; return out;
    }
    if (ch.inReach(th) && ch.canSwing()) { out.actionPressed = press(); return out; }
  }
  return out;
}

// Chapter 9: FLIP-FLOP! The Bombanat-Collecting Grithix nets them all, then
// mails the letter (design.md, chapter 9 and "Chases").
//
// Phase 1, the net: a clearing in the wood. The Bombanat with the letter flies
// low about it (the kit's holder: dodges, darts, settles in the ferns to
// hide), while the Trollusk and the Yalapappus scramble about. The Grithix
// strides; Action swings the net in three beats (wind-up, sweep, slam): the
// sweep is the kit's lunge with a forward reach, and a miss ends in a slam he
// has to recover from. Sprint plants the pole and vaults him in a long arc,
// over roots and monsters, at a cost in breath. A Bombanat in the net wriggles
// (the kit's tug); if the Grithix wins, FLIP-FLOP: the letter is his.
//
// Phase 2, the post: carry the letter to the official mailbox on the right.
// The Trollusk and the Yalapappus try to trip him (contact, or a sliding
// tackle); a trip drops the letter and he must pick it up again. Vault over
// them, step round them, or net them too. Action at the mailbox posts it.
//
// Netting the Trollusk or the Yalapappus puts them in a jar for a while: the
// bonus is everyone netted. In versus the holder flies the Bombanat, then
// takes the Trollusk.

import { makeMover, makeChase, stepChase, aiHolder, clamp } from '../chase.js';
import * as art from '../art.js';
import { staminaRing, tugBar, drawCover, eventFx, makeFx } from '../chasedraw.js';
import { marksFor } from './index.js';
import { animBombanat } from './ch02.js';
import { hintLine, letterMarker, tugTiebreak, near } from './ch07.js';

const MAIL = { x: 1700, y: 765 }; // in front of the official mailbox's slot
const B = { x0: 150, x1: 1690, y0: 645, y1: 915 };
const VAULT = { time: 0.8, dist: 420, cost: 0.3, height: 170 };
const WINDUP = 0.28;
const JAR_TIME = 6;

export default function create(env) {
  const { W, H } = env;
  art.preload(['props.grithix', 'props.trollusk', 'trollusk.poses', 'yalapappus.poses', 'yalapappus.swaps', 'bombanat.poses', 'grithix.poses']);
  const total = 60 + (env.gentle[0] ? 10 : 0);
  const bounds = { ...B };
  const cover = [
    { x: 430, y: 705, sheet: 'grithix', item: 4, h: 150, rx: 100, ry: 38 },
    { x: 1180, y: 880, sheet: 'grithix', item: 4, h: 160, rx: 105, ry: 38 },
    { x: 1460, y: 690, sheet: 'grithix', item: 4, h: 140, rx: 95, ry: 34 },
    { x: 760, y: 870, sheet: 'trollusk', item: 5, h: 175, rx: 95, ry: 38 },
  ].map((k) => ({ shake: 0, ...k }));
  // Gnarled roots: the Grithix must go round or vault; the small ones hop them.
  const obstacles = [
    { x: 980, y: 740, rx: 95, ry: 24, hop: true, root: true },
    { x: 1330, y: 815, rx: 95, ry: 24, hop: true, root: true },
  ];
  const gx = makeMover({
    x: 300, y: 800, speed: 240, sprint: 240, accel: 1900, radius: 50, canHide: false, hopsLogs: false,
    lungeRange: 260, lungeSpeed: 880, lungeTime: 0.23, lungeCooldown: 1.3, stumbleTime: 0.95, lungeCost: 0.3, grabRange: 70,
    regen: 0.11, regenStill: 0.13, windedTime: 2.0,
  });
  const bomb = makeMover({ x: 1250, y: 760, speed: 305, sprint: 520, accel: 1100, windedSpeed: 0.7, drain: 0.32, radius: 40, flies: true, canHide: true, dodgeCooldown: 1.2, dodgeCost: 0.2, regen: 0.2, regenStill: 0.5 });
  const ghost = makeMover({ x: B.x1, y: B.y0, canHide: false, flies: true });
  const chase = makeChase({ snatcher: gx, holder: bomb, bounds, cover, obstacles, rng: env.rng, gentle: env.gentle });
  const gc = art.makeCreature('grithix', gx.x, gx.y);
  const bc = art.makeCreature('bombanat', bomb.x, bomb.y);
  gc.sizeK = 0.9;
  bc.sizeK = 0.8;
  const fx = makeFx();
  const brain = {};
  let t = 0;
  let shake = 0;
  let phase = 'net';
  let bz = 110; // the Bombanat's height
  let vault = null; // { t, dx, dy }
  let prevSprint = false;
  let windT = 1.5;
  let immune = 0;
  let postT = 0;
  let letter = null; // dropped on the ground: { x, y, t }
  let netted = new Set();
  let hint = { text: env.versus ? 'Grithix: net the Bombanat! · Bombanat: dodge that net!' : 'Net the Bombanat with the letter! Sprint to pole-vault.', t: 3.5 };

  // The other two, scrambling about.
  const mk = (id, x, y, speed, size) => ({ id, x, y, vx: 0, vy: 0, facing: 1, speed, mode: 'run', T: 0, cool: 1.5, jarT: 0, goal: null, st: 1, c: Object.assign(art.makeCreature(id, x, y), { sizeK: size }) });
  const tro = mk('trollusk', 600, 690, 260, 0.72);
  const yal = mk('yalapappus', 1500, 860, 215, 0.78);
  const others = [tro, yal];

  const human = (o) => env.versus && phase === 'carry' && o === tro;

  function jar(o) {
    o.mode = 'jar'; o.jarT = JAR_TIME;
    if (!netted.has(o.id)) { netted.add(o.id); self.bonus = netted.size; }
    env.sfx('flipflop'); env.sfx('tinkle'); env.vibrate(60);
    fx.say('FLIP-FLOP!', o.x, o.y - 220);
    shake = 0.35;
  }

  function trip() {
    gx.mode = 'trip'; gx.modeT = 0; gx.vx = gx.vy = 0;
    vault = null;
    env.sfx('stumble'); env.sfx('thump'); env.vibrate(110);
    fx.say('Tripped!', gx.x, gx.y - 300);
    shake = 0.3;
    art.kick(gc, 0.6);
    // The letter flies out of his hand.
    const dir = env.rng() < 0.5 ? -1 : 1;
    letter = { x: clamp(gx.x + dir * (170 + env.rng() * 110), B.x0, B.x1 - 60), y: clamp(gx.y + (env.rng() - 0.5) * 140, B.y0, B.y1), t: 0 };
    postT = 0;
  }

  // ---------- the Grithix's input: vault and the three-beat net ----------
  function grithixInput(inS, dt) {
    const out = { x: inS.x || 0, y: inS.y || 0, sprint: false, actionPressed: false };
    const sprintEdge = !!inS.sprint && !prevSprint;
    prevSprint = !!inS.sprint;
    if (chase.tug) return { ...out, actionPressed: !!inS.actionPressed };
    if (gx.mode === 'windup') {
      out.x = 0; out.y = 0;
      if (gx.modeT >= WINDUP) { gx.mode = 'move'; gx.modeT = 0; out.actionPressed = true; env.sfx('swish'); }
      return out;
    }
    if (gx.mode !== 'move') return out;
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
      if (phase === 'carry' && !letter && near(gx, MAIL) < 130) {
        gx.mode = 'post'; gx.modeT = 0; postT = 0; env.sfx('page');
        return { x: 0, y: 0 };
      }
      if (gx.cool <= 0 && gx.winded <= 0) { gx.mode = 'windup'; gx.modeT = 0; art.kick(gc, -0.2); return { x: 0, y: 0 }; }
    }
    return out;
  }

  function stepVault(dt) {
    if (gx.mode !== 'vault' || !vault) return;
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

  // The net's head: where a sweep or a slam lands.
  function netHead() {
    const dx = gx.mode === 'lunge' ? gx.lx : gx.facing, dy = gx.mode === 'lunge' ? gx.ly : 0;
    return { x: gx.x + dx * 95, y: gx.y + dy * 40 };
  }

  // ---------- the others ----------
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
        if (d < 280) goal = { x: o.x + (o.x - gx.x), y: o.y + (o.y - gx.y) };
      } else if (o.cool > 0) {
        // Just tripped him (or sprawled): run off and gloat.
        goal = { x: o.x + (o.x - gx.x), y: o.y + (o.y - gx.y) };
      } else {
        // Guard the way to the mailbox (or the dropped letter), then go for his feet.
        const aim = letter || MAIL;
        const k = letter ? 0.45 : o === tro ? 0.3 : 0.55;
        const ix = aim.x + (gx.x - aim.x) * k, iy = aim.y + (gx.y - aim.y) * k + (o === tro ? -50 : 50);
        goal = d < 260 ? { x: gx.x, y: gx.y } : { x: ix, y: iy };
        if (d < 200 && gx.mode !== 'vault' && env.rng() < dt * (2.5 + 4 * env.skill)) act = true;
      }
      const gx2 = goal.x - o.x, gy2 = goal.y - o.y, gd = Math.hypot(gx2, gy2);
      if (gd > 8) { tx = gx2 / gd; ty = gy2 / gd; }
      sprint = phase === 'carry' && o.cool <= 0 && d < 520 && o.st > 0.3;
    }
    // A net wound up nearby: hop aside (the computer ones read it as a player would).
    if (!human(o) && gx.mode === 'windup' && o.sawWindup !== true && o.mode === 'run' && near(o, gx) < 280) {
      o.sawWindup = true;
      if (env.rng() < 0.25 + 0.5 * env.skill) {
        const dx = o.x - gx.x, dy = o.y - gx.y, dd = Math.hypot(dx, dy) || 1;
        const side = env.rng() < 0.5 ? -1 : 1;
        o.mode = 'hop'; o.T = 0; o.vx = (-dy / dd * side * 0.6 + dx / dd * 0.8) * 650; o.vy = (dx / dd * side * 0.6 + dy / dd * 0.8) * 500;
        env.sfx('dodge');
      }
    }
    if (gx.mode !== 'windup') o.sawWindup = false;
    if (o.mode === 'hop') {
      if (o.T > 0.25) { o.mode = 'run'; o.T = 0; }
    } else if (o.mode === 'slide') {
      if (o.T > 0.3) { o.mode = 'sprawl'; o.T = 0; env.sfx('stumble'); }
    } else if (o.mode === 'sprawl') {
      o.vx *= Math.exp(-10 * dt); o.vy *= Math.exp(-10 * dt);
      if (o.T > 0.9) { o.mode = 'run'; o.T = 0; }
    } else {
      if (act && o.cool <= 0 && phase === 'carry') {
        // A sliding tackle (the Yalapappus rolls into a ball).
        const dx = gx.x - o.x, dy = gx.y - o.y, dd = Math.hypot(dx, dy) || 1;
        const sx = Math.hypot(tx, ty) > 0.2 ? tx : dx / dd, sy = Math.hypot(tx, ty) > 0.2 ? ty : dy / dd;
        const sm = Math.hypot(sx, sy) || 1;
        o.mode = 'slide'; o.T = 0; o.vx = (sx / sm) * 720; o.vy = (sy / sm) * 540; o.cool = 1.4;
        env.sfx(o === yal ? 'whoosh' : 'dodge');
      } else {
        o.sprinting = sprint && o.st > 0;
        const top = o.sprinting ? o.speed * 1.7 : o.speed;
        const k = 1 - Math.exp(-8 * dt);
        o.vx += (tx * top - o.vx) * k; o.vy += (ty * top * 0.75 - o.vy) * k;
        o.st = o.sprinting ? Math.max(0, o.st - 0.45 * dt) : Math.min(1, o.st + 0.18 * dt);
      }
    }
    o.x = clamp(o.x + o.vx * dt, B.x0, B.x1);
    o.y = clamp(o.y + o.vy * dt, B.y0, B.y1);
    if (Math.abs(o.vx) > 20) o.facing = Math.sign(o.vx);
    // Trip the Grithix: contact while he's on his feet (not in the air).
    if (phase === 'carry' && o.mode !== 'sprawl' && o.cool < 1.2 && immune <= 0 && near(o, gx) < (o.mode === 'slide' ? 90 : 68)
      && (gx.mode === 'move' || gx.mode === 'post' || gx.mode === 'windup' || gx.mode === 'stumble')) {
      trip();
      o.cool = 2.1; o.mode = 'run'; o.T = 0;
      fx.say(o === tro ? 'Snerk!' : 'Grimm!', o.x, o.y - 200);
    }
  }

  // ---------- the chapter ----------
  const self = {
    focus: () => [gx, bomb], // what the camera frames: the snatcher, then the holder
    time: total,
    done: false,
    outcome: null,
    bonus: 0,
    chase,
    others,
    get phase() { return phase; },
    get letter() { return letter; },
    mail: MAIL,
    update(dt, inS, inH) {
      t += dt;
      fx.update(dt);
      hint.t -= dt;
      shake = Math.max(0, shake - dt);
      if (self.done) {
        if (self.outcome === 'snatched') { art.setAnim(gc, gx.modeT < 0.6 ? 'post' : 'celebrate'); gx.modeT += dt; }
        else { art.setAnim(gc, 'idle'); }
        art.animate(gc, dt);
        for (const o of others) { if (o.mode !== 'jar') { art.setAnim(o.c, self.outcome === 'snatched' ? 'wail' : 'celebrate'); art.animate(o.c, dt); } }
        return;
      }
      self.time = Math.max(0, self.time - dt);
      inS = inS || {};
      immune = Math.max(0, immune - dt);
      gx.landT = Math.max(0, (gx.landT || 0) - dt);

      const gin = grithixInput(inS, dt);
      let bin = { x: 0, y: 0 };
      if (phase === 'net') {
        bin = env.versus ? (inH || {}) : aiHolder(chase, brain, env.skill, dt);
        // A canny Bombanat keeps away from the mailbox side of the clearing:
        // caught there, the letter would be posted in a moment.
        if (!env.versus && !chase.tug && bomb.mode === 'move' && !bomb.hidden && bomb.x > 1100) {
          bin = { ...bin, x: (bin.x || 0) - (bomb.x - 1100) / 300 };
          const m = Math.hypot(bin.x, bin.y || 0);
          if (m > 1) { bin.x /= m; bin.y = (bin.y || 0) / m; }
        }
        // It sees the net wound up, as a player would, and backs off (saving
        // its dodge for the sweep itself).
        if (!env.versus && gx.mode === 'windup' && !brain.sawWindup && near(gx, bomb) < 300) {
          brain.sawWindup = true;
          if (env.rng() < 0.3 + 0.5 * env.skill) brain.backOff = 0.45;
        }
        if (gx.mode !== 'windup') brain.sawWindup = false;
        brain.backOff = Math.max(0, (brain.backOff || 0) - dt);
        if (!env.versus && brain.backOff > 0 && !chase.tug && !bin.actionPressed) {
          const dx = bomb.x - gx.x, dy = bomb.y - gx.y, d = Math.hypot(dx, dy) || 1;
          bin = { ...bin, x: dx / d, y: dy / d, sprint: bomb.st > 0.15 };
        }
      } else {
        // The chase kit carries on with a stand-in holder far away, so the
        // net's sweep and slam work as before.
        ghost.x = gx.x < 920 ? B.x1 : B.x0; ghost.y = gx.y < 785 ? B.y1 : B.y0;
        ghost.vx = ghost.vy = 0; ghost.mode = 'move';
      }
      // A netted Bombanat is slippery: the rope drifts a little its way.
      if (chase.tug && phase === 'net') chase.tug.v = Math.max(0.001, chase.tug.v - 0.09 * dt);
      tugTiebreak(chase, dt);
      const ev = stepChase(chase, gin, bin, dt);
      eventFx(env, ev, fx);
      if (ev.some((e) => e.type === 'grab')) { env.sfx('flipflop'); shake = 0.3; art.kick(bc, 0.5); }
      if (ev.some((e) => e.type === 'stumble')) { shake = Math.max(shake, 0.2); env.sfx('thump'); }
      if (ev.some((e) => e.type === 'free')) fx.say('Wriggled out!', bomb.x, bomb.y - 240);
      stepVault(dt);

      // Trip / post timers (modes the kit leaves alone).
      if (gx.mode === 'trip' && gx.modeT > 1.25) { gx.mode = 'move'; gx.modeT = 0; immune = 1.1; }
      if (gx.mode === 'post') {
        postT += dt;
        if (postT > 0.8) {
          self.done = true; self.outcome = 'snatched';
          env.sfx('thunk'); env.sfx('cheer');
          fx.say('Posted!', MAIL.x - 60, MAIL.y - 330);
          gx.modeT = 0;
        }
      }

      // The sweep and the slam net anything under them.
      if (gx.mode === 'lunge' || (gx.mode === 'stumble' && gx.modeT < 0.15)) {
        const hd = netHead();
        for (const o of others) if (o.mode !== 'jar' && near(o, hd) < 105) jar(o);
      }

      // FLIP-FLOP: the Bombanat is netted, and the letter is the Grithix's.
      if (chase.done && phase === 'net') {
        phase = 'carry';
        chase.done = false; chase.result = null; chase.tug = null;
        chase.h = ghost;
        gx.mode = 'move'; gx.modeT = 0;
        netted.add('bombanat');
        env.sfx('flipflop'); env.vibrate(140);
        fx.say('FLIP-FLOP!', bomb.x, bomb.y - 260);
        shake = 0.45;
        // The commotion knocks the jars over: everybody's out again, after him.
        for (const o of others) if (o.mode === 'jar') { o.mode = 'run'; o.cool = 1.6; o.x = clamp(o.x, B.x0, B.x1); env.sfx('free'); fx.say('Pop!', o.x, o.y - 200); }
        hint = { text: env.versus ? 'Grithix: post it! · Now you are the Trollusk: trip him up!' : 'Got it! Now post it in the official mailbox →', t: 3.2 };
      }

      for (const o of others) updateOther(o, dt, inH);

      // Pick the letter up again.
      if (letter) {
        letter.t += dt;
        if (gx.mode === 'move' && near(gx, letter) < 80) { letter = null; env.sfx('page'); fx.say('Got it!', gx.x, gx.y - 300); }
      }

      // Rustling ferns.
      windT -= dt;
      if (windT <= 0) { windT = 1.3 + env.rng() * 2.5; const k = cover[Math.floor(env.rng() * cover.length)]; k.shake = 0.7; env.sfx('rustle'); }
      for (const k of cover) {
        if (phase === 'net' && bomb.inCover === k && bomb.rustle > 0.2) k.shake = Math.max(k.shake, bomb.rustle);
        k.shake = Math.max(0, k.shake - dt * 1.5);
      }

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
      animGrithix();
      bc.x = bomb.x; bc.y = bomb.y; bc.z = bz;
      art.animate(bc, dt, bomb.vx, bomb.vy);
      animBombanat(bc, bomb, chase);
      if (bomb.mode === 'grabbed') art.setAnim(bc, 'netted');
      for (const o of others) {
        o.c.x = o.x; o.c.y = o.y;
        art.animate(o.c, dt, o.vx, o.vy);
        o.c.facing = o.facing;
        const sp = Math.hypot(o.vx, o.vy);
        if (o.id === 'trollusk') art.setAnim(o.c, o.mode === 'slide' || o.mode === 'hop' ? 'skid' : o.mode === 'sprawl' ? 'scuttle' : o.cool > 1.2 && phase === 'carry' ? 'celebrate' : sp > 300 ? 'run' : sp > 30 ? 'sneak' : 'idle');
        else art.setAnim(o.c, o.mode === 'hop' ? 'hop' : o.mode === 'slide' ? 'ball' : o.mode === 'sprawl' ? 'dizzy' : o.cool > 1.2 && phase === 'carry' ? 'shout' : sp > 30 ? 'trundle' : 'idle');
      }
    },
    draw(g, tt) {
      g.save();
      if (shake > 0 && !env.reduceMotion) g.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 14 * shake);
      art.drawScene(g, 'scenes/grithix', W, H);
      if (phase === 'carry' && !self.done) mailboxGlow(g, tt, near(gx, MAIL) < 130 && !letter);
      const things = [
        ...cover.map((k) => ({ y: k.y + k.ry * 0.9, draw: () => drawCover(g, k, tt) })),
        ...obstacles.map((o) => ({ y: o.y + o.ry, draw: () => art.drawSprite(g, art.prop('grithix', 5), o.x, o.y + o.ry + 12, { height: 115, flip: o.x > 1100 }) })),
        { y: gx.y, draw: () => drawGrithix(g, tt) },
        ...others.filter((o) => o.mode !== 'jar').map((o) => ({ y: o.y, draw: () => {
          if (human(o)) staminaRing(g, o, o.x, o.y, 44, '#f2c53d');
          art.drawCreature(g, o.c, tt, { reduceMotion: env.reduceMotion });
        } })),
      ];
      if (letter) things.push({ y: letter.y, draw: () => droppedLetter(g, letter, tt) });
      if (phase === 'net') things.push({ y: bomb.y + 2000, draw: () => drawBombanat(g, tt) });
      things.sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      // Who has the letter.
      if (phase === 'net' && !bomb.hidden) letterMarker(g, bomb.x, bomb.y - bz - 150, tt, 54);
      if (phase === 'carry' && !letter) letterMarker(g, gx.x, gx.y - (gc.z || 0) - 330, tt, 58);
      if (chase.tug) tugBar(g, chase, (gx.x + bomb.x) / 2, Math.min(gx.y, bomb.y) - 380, ['In the net!', 'Wriggle out!']);
      fx.draw(g);
      g.restore();
      drawJars(g, tt);
      if (hint.t > 0 && !self.done) hintLine(g, hint.text, W, 150, Math.min(1, hint.t * 2));
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

  function animGrithix() {
    const sp = Math.hypot(gx.vx, gx.vy);
    if (self.done) return;
    switch (gx.mode) {
      case 'windup': art.setAnim(gc, 'windup'); break;
      case 'lunge': art.setAnim(gc, 'swing'); break;
      case 'stumble': art.setAnim(gc, 'slam'); break;
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
        if (gx.landT > 0) { art.setAnim(gc, 'vault'); gc.animT = 2 / 4 + 0.01; } else art.setAnim(gc, sp > 30 ? 'stride' : 'idle');
    }
  }

  function drawGrithix(g, tt) {
    if (gx.mode === 'vault') {
      // His shadow stays on the ground under the arc.
      g.save(); g.globalAlpha = 0.2; g.fillStyle = '#2b1d14';
      g.beginPath(); g.ellipse(gx.x, gx.y, 80, 18, 0, 0, Math.PI * 2); g.fill(); g.restore();
    } else staminaRing(g, gx, gx.x, gx.y, 58, '#d59bb4');
    gc.alpha = immune > 0 && Math.floor(tt * 12) % 2 ? 0.5 : 1;
    art.drawCreature(g, gc, tt, { reduceMotion: env.reduceMotion, shadow: gx.mode !== 'vault' });
  }

  function drawBombanat(g, tt) {
    if (bomb.hidden) {
      // Settled in the ferns. Alone against the computer, a wingtip shows now and then.
      if (env.versus || (tt % 3.2) > 0.7) return;
      const z0 = bc.z;
      bc.z = (bomb.inCover?.h || 140) * 0.55;
      art.setAnim(bc, 'perched');
      art.drawCreature(g, bc, tt, { reduceMotion: env.reduceMotion, shadow: false });
      bc.z = z0;
      return;
    }
    g.save(); g.globalAlpha = 0.22; g.fillStyle = '#2b1d14';
    g.beginPath(); g.ellipse(bomb.x, bomb.y, 70, 16, 0, 0, Math.PI * 2); g.fill(); g.restore();
    staminaRing(g, bomb, bomb.x, bomb.y, 50, '#c9b8d4');
    art.drawCreature(g, bc, tt, { reduceMotion: env.reduceMotion, shadow: false });
  }

  // The collecting jars, on the mossy bank at the bottom left.
  function drawJars(g, tt) {
    const slots = [['bombanat', bc], ['trollusk', tro.c], ['yalapappus', yal.c]];
    slots.forEach(([id, c], i) => {
      const x = 120 + i * 120, y = 1060;
      const inJar = id === 'bombanat' ? phase === 'carry' || self.outcome === 'snatched' : others.find((o) => o.id === id).mode === 'jar';
      if (id === 'bombanat' && inJar) {
        art.drawSprite(g, art.prop('grithix', 3), x, y + Math.sin(tt * 9) * 2, { height: 120, rot: Math.sin(tt * 7) * 0.05 });
        return;
      }
      art.drawSprite(g, art.prop('grithix', 2), x, y, { height: 120, alpha: inJar ? 1 : 0.55 });
      if (inJar) {
        // A tiny monster rattling about inside.
        const s = { ...c, x, y: y - 22 + Math.sin(tt * 8 + i) * 3, z: 0, sizeK: 0.26, facing: Math.sin(tt * 3 + i) > 0 ? 1 : -1, sq: 0, lean: 0, flash: 0, alpha: 1 };
        art.drawCreature(g, s, tt, { reduceMotion: true, shadow: false });
        art.drawSprite(g, art.prop('grithix', 2), x, y, { height: 120, alpha: 0.35 });
      }
      if (netted.has(id) && !inJar) {
        g.save(); g.fillStyle = '#f2c53d'; g.strokeStyle = '#33241a'; g.lineWidth = 3;
        g.beginPath(); g.arc(x + 36, y - 100, 13, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }
    });
  }

  return self;
}

function mailboxGlow(g, t, ready) {
  const bob = Math.sin(t * 5) * 12;
  g.save();
  g.translate(1765, 430 + bob);
  g.fillStyle = ready ? '#f2c53d' : '#f8f1e0';
  g.strokeStyle = '#33241a';
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(-32, -40); g.lineTo(32, -40); g.lineTo(32, 0); g.lineTo(56, 0); g.lineTo(0, 52); g.lineTo(-56, 0); g.lineTo(-32, 0); g.closePath();
  g.fill(); g.stroke();
  g.font = '800 30px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.lineWidth = 7;
  g.strokeStyle = 'rgba(248,241,224,0.95)';
  g.fillStyle = '#33241a';
  const s = ready ? 'Action: post it!' : 'Post it here!';
  g.strokeText(s, -40, -60);
  g.fillText(s, -40, -60);
  g.restore();
}

function droppedLetter(g, l, t) {
  const hop = l.t < 0.5 ? Math.sin((l.t / 0.5) * Math.PI) * 60 : Math.abs(Math.sin(t * 3)) * 6;
  g.save();
  g.globalAlpha = 0.25; g.fillStyle = '#2b1d14';
  g.beginPath(); g.ellipse(l.x, l.y, 34, 9, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  letterMarker(g, l.x, l.y - 30 - hop, t, 60);
}

// ---------- a competent player, for the browser check and the tests ----------
import { aiSnatcher } from '../chase.js';
const bots = new WeakMap();
export function autopilot(ch) {
  const dt = 1 / 20;
  let b = bots.get(ch);
  if (!b) { b = {}; bots.set(ch, b); }
  const len = Math.hypot;
  const toward = (a, c) => { const dx = c.x - a.x, dy = c.y - a.y, d = len(dx, dy) || 1; return { x: dx / d, y: dy / d, d }; };
  const c = ch.chase, g = c.s;
  if (ch.phase === 'net') {
    const out = aiSnatcher(c, b, 0.6, dt);
    const d = len(c.h.x - g.x, c.h.y - g.y);
    out.sprint = !c.tug && !c.h.hidden && d > 430 && d < 900 && g.st > 0.6 && !b.ps;
    b.ps = out.sprint;
    return out;
  }
  const tg = toward(g, ch.letter || ch.mail);
  const out = { x: tg.x, y: tg.y };
  if (!ch.letter && tg.d < 110) { out.actionPressed = !b.pp; b.pp = out.actionPressed; return out; }
  let th = null, td = 1e9;
  for (const o of ch.others) {
    if (o.mode === 'jar' || o.cool > 1.2) continue;
    const d = len(o.x - g.x, o.y - g.y);
    if ((o.x - g.x) * tg.x + (o.y - g.y) * tg.y > -40 && d < td) { td = d; th = o; }
  }
  if (th && td < 240) {
    if (g.st >= 0.35 && tg.d > 380 && g.mode === 'move' && b.pv !== true) { out.sprint = true; b.pv = true; return out; }
    if (td < 200 && g.cool <= 0) { const a = toward(g, th); out.x = a.x; out.y = a.y; out.actionPressed = !b.pp; b.pp = out.actionPressed; }
  }
  b.pv = false;
  return out;
}

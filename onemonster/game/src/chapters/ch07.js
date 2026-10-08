// Chapter 7: the Stamp-Collecting Trollusk snatches the letter back from the
// Paper-Munching Yalapappus (design.md, chapter 7 and "Chases"), then gets away.
//
// Phase 1, the sneak: the Yalapappus sits munching by his seat. Every few
// seconds he stops, his head turns (the warning), and he looks round. Anyone he
// sees moving in the open is in trouble: he gets up and trundles after them,
// hopping to grab. Let go of the stick to freeze; stand still in a bush or
// behind a rock and he can't see you at all. Action next to him (while he isn't
// looking) snatches the letter.
//
// Phase 2, the getaway: the same chase kit with the roles turned round. The
// Yalapappus chases (in kit terms he is the snatcher, wanting his letter back)
// and the Trollusk runs for the way out on the right. Sprint makes the
// Yalapappus roll into a ball: fast, but he can't grab while rolled, and he
// unrolls with a wobble. If he grabs the Trollusk and wins the tug, he takes
// the letter back to his seat and it's the sneak again, with less time.
//
// One Chase runs the whole chapter: chase.s is the Yalapappus, chase.h the
// Trollusk. The human snatcher of the chapter steers the kit's holder.

import { makeMover, makeChase, stepChase, aiSnatcher, clamp } from '../chase.js';
import * as art from '../art.js';
import { staminaRing, tugBar, drawCover, eventFx, makeFx, roundRect } from '../chasedraw.js';
import { marksFor } from './index.js';
import { animTrollusk } from './ch02.js';

// ---------- little drawing helpers, shared with chapters 8 and 9 ----------

export function hintLine(g, text, W, y = 150, alpha = 1) {
  if (!text) return;
  g.save();
  g.globalAlpha = alpha;
  g.font = '700 36px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(248,241,224,0.95)';
  g.fillStyle = '#33241a';
  g.strokeText(text, W / 2, y);
  g.fillText(text, W / 2, y);
  g.restore();
}

// The letter, small, bobbing over whoever has it: so everyone can see at a
// glance who holds it.
export function letterMarker(g, x, y, t, size = 64) {
  const img = art.image('ui/letter');
  const bob = Math.sin(t * 4) * 6;
  g.save();
  g.translate(x, y + bob);
  g.rotate(Math.sin(t * 2.3) * 0.12);
  if (img) g.drawImage(img, -size / 2, -size / 2, size, size);
  else {
    g.fillStyle = '#f8f1e0'; g.strokeStyle = '#33241a'; g.lineWidth = 3;
    g.fillRect(-size / 2, -size * 0.32, size, size * 0.64); g.strokeRect(-size / 2, -size * 0.32, size, size * 0.64);
    g.beginPath(); g.moveTo(-size / 2, -size * 0.32); g.lineTo(0, 0); g.lineTo(size / 2, -size * 0.32); g.stroke();
  }
  g.restore();
}

// A word bubble with an eye in it over a lookout: the warning before he looks.
export function eyeBubble(g, x, y, k, t) {
  const sp = art.prop('trollusk', 9);
  const s = 0.6 + 0.4 * Math.min(1, k);
  const wob = Math.sin(t * 18) * 0.06;
  if (!art.drawSprite(g, sp, x, y, { height: 120 * s, rot: wob })) {
    g.save(); g.translate(x, y - 60 * s); g.fillStyle = '#f8f1e0'; g.strokeStyle = '#33241a'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, 70 * s, 42 * s, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#33241a'; g.beginPath(); g.arc(0, 0, 16 * s, 0, Math.PI * 2); g.fill(); g.restore();
  }
}

// An arrow and a sign: "this way out".
export function exitSign(g, x, y, text, t, dir = 1) {
  const p = Math.sin(t * 6) * 10;
  g.save();
  g.translate(x + p * dir, y);
  g.fillStyle = 'rgba(248,241,224,0.92)';
  g.strokeStyle = '#33241a';
  g.lineWidth = 4;
  roundRect(g, -110, -36, 170, 72, 16);
  g.fill(); g.stroke();
  g.fillStyle = '#c8443a';
  g.beginPath();
  g.moveTo(70 * dir, -30); g.lineTo(115 * dir, 0); g.lineTo(70 * dir, 30); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#33241a';
  g.font = '800 30px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.fillText(text, -25, 10);
  g.restore();
}

export const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------- chapter 7 ----------

const SEAT0 = { x: 640, y: 905 };
const START_DX = 1080; // where the Trollusk starts, right of the Yalapappus
const START_Y = 965;
const EXIT_X = 4300; // the way out, at the far end of the getaway

export default function create(env) {
  const { W, H } = env;
  art.preload(['props.trollusk', 'yalapappus.swaps', 'yalapappus.poses', 'trollusk.poses']);
  const total = 45 + (env.gentle[0] ? 10 : 0);
  const Y0 = 820, Y1 = 1040;
  const bounds = { x0: 110, x1: 1830, y0: Y0, y1: Y1 };
  // The sneak happens on the first screen; the getaway runs on along the
  // bumpy ground to the right, past bushes, rocks and holes.
  const cover = [
    { x: 1450, y: 870, sheet: 'trollusk', item: 5, h: 190 },
    { x: 1140, y: 1000, sheet: 'trollusk', item: 5, h: 200 },
    { x: 905, y: 855, sheet: 'yalapappus', item: 1, h: 125, rx: 80, ry: 34 },
    { x: 380, y: 990, sheet: 'trollusk', item: 5, h: 200 },
    { x: 1700, y: 1010, sheet: 'yalapappus', item: 2, h: 135, rx: 85, ry: 34 },
    { x: 2150, y: 880, sheet: 'trollusk', item: 5, h: 200 },
    { x: 2560, y: 1005, sheet: 'trollusk', item: 5, h: 190 },
    { x: 2980, y: 860, sheet: 'yalapappus', item: 1, h: 125, rx: 80, ry: 34 },
    { x: 3400, y: 990, sheet: 'trollusk', item: 5, h: 205 },
    { x: 3820, y: 870, sheet: 'trollusk', item: 5, h: 195 },
  ].map((k) => ({ rx: 95, ry: 40, shake: 0, ...k }));
  // Holes in the bumpy ground: the little Trollusk hops them, the Yalapappus
  // must go round (or bowl along as a ball and get stuck at the edge). Big
  // rocks block both.
  const holes = [{ x: 1290, y: 935 }, { x: 2350, y: 960 }, { x: 2800, y: 900 }, { x: 3600, y: 950 }, { x: 4000, y: 905 }]
    .map((o) => ({ ...o, rx: 85, ry: 26, hop: true, hole: true }));
  const rocks = [{ x: 1950, y: 1000 }, { x: 3200, y: 880 }].map((o) => ({ ...o, rx: 60, ry: 26, hop: false, rock: true }));
  const obstacles = [...holes, ...rocks];
  let seat = { ...SEAT0 };
  // Kit roles: the Yalapappus is the kit's snatcher, the Trollusk its holder.
  const yal = makeMover({
    x: seat.x, y: seat.y, speed: 240, sprint: 560, accel: 1500, radius: 56, canHide: false, hopsLogs: false,
    lungeRange: 330, lungeSpeed: 920, lungeTime: 0.3, lungeCooldown: 1.5, stumbleTime: 1.0, grabRange: 66,
    drain: 0.48, regen: 0.17,
  });
  const tro = makeMover({ x: seat.x + START_DX, y: START_Y, speed: 225, sprint: 450, accel: 2600, radius: 40, drain: 0.42 });
  yal.facing = -1;
  const chase = makeChase({ snatcher: yal, holder: tro, bounds, cover, obstacles, rng: env.rng, gentle: [env.gentle[1], env.gentle[0]] });
  const yc = art.makeCreature('yalapappus', yal.x, yal.y);
  const tc = art.makeCreature('trollusk', tro.x, tro.y);
  yc.sizeK = 0.95;
  tc.sizeK = 0.8;
  const fx = makeFx();
  const brain = {};
  let t = 0;
  let shake = 0;
  let camX = 0;
  let hint = { text: env.versus ? 'Trollusk: creep up and snatch! · Yalapappus: Action to look round!' : 'Creep up while he munches. Let go of the stick to FREEZE when he looks!', t: 3.5 };
  // Phase 1 state of the Yalapappus: 'munch' -> 'warn' -> 'look' -> 'munch';
  // spotted: 'alarm' (after you) -> 'return' (back to his seat).
  let phase = 'sneak';
  let look = 'munch';
  let lookT = 0;
  let nextLook = 0;
  let rest = 0; // versus: he needs a moment between looks
  let alarmT = 0;
  let surprisedT = 0; // phase 2: the moment after the snatch
  let ballT = 0; // phase 2: unrolling after a roll
  let windT = 2;
  nextLook = 2.2 + env.rng() * 1.2;

  function sneakBounds() {
    bounds.x0 = Math.max(110, seat.x - 560);
    bounds.x1 = Math.min(EXIT_X - 200, seat.x + 1200);
  }

  function munchTime() {
    const k = 1.25 - 0.55 * env.skill;
    // A crafty Yalapappus sometimes looks again almost at once.
    if (env.rng() < 0.3 * env.skill) return 0.7 + env.rng() * 0.5;
    return (1.7 + env.rng() * 2.6) * k;
  }
  const warnTime = () => (env.gentle[0] ? 0.95 : 0.65);
  const lookTime = () => 1.1 + env.rng() * 0.7 + env.skill * 0.4;

  function startLook() { look = 'warn'; lookT = 0; env.sfx('eye'); }

  function snatch() {
    phase = 'getaway';
    look = 'munch';
    bounds.x0 = Math.max(110, Math.min(seat.x, tro.x) - 500);
    bounds.x1 = EXIT_X + 80;
    surprisedT = 0.6;
    yal.mode = 'move'; yal.vx = yal.vy = 0;
    env.sfx('snatch'); env.sfx('gabble'); env.vibrate(80);
    fx.say('SNATCH!', tro.x, tro.y - 200);
    art.kick(tc, -0.5);
    art.kick(yc, 0.5);
    hint = { text: 'Run for it! Get away to the right before he catches you!', t: 3 };
  }

  function lostIt() {
    // The Yalapappus won the tug: he has his letter back and goes back to munch.
    chase.done = false; chase.result = null; chase.tug = null;
    phase = 'sneak';
    // He sits down to munch right where he caught you, and you are flung
    // back down the track.
    seat = { x: clamp(yal.x, 640, EXIT_X - 1300), y: clamp(yal.y, 860, 960) };
    sneakBounds();
    look = 'return';
    lookT = 0;
    tro.mode = 'dazed'; tro.modeT = 0; tro.vx = tro.vy = 0;
    tro.x = clamp(Math.max(tro.x, yal.x) + 160, bounds.x0, bounds.x1);
    yal.mode = 'move';
    env.sfx('munch'); env.sfx('aww');
    fx.say('He grabbed it back!', yal.x, yal.y - 260);
    hint = { text: 'He has it back! Creep up again, quick!', t: 2.5 };
  }

  function thrownBack() {
    // Caught sneaking: he tosses the Trollusk away and sits back down.
    chase.done = false; chase.result = null; chase.tug = null;
    tro.x = clamp(seat.x + START_DX, bounds.x0, bounds.x1); tro.y = START_Y; tro.vx = tro.vy = 0;
    tro.mode = 'dazed'; tro.modeT = 0;
    yal.mode = 'move';
    look = 'return';
    env.sfx('thump');
    fx.say('Shoo! Off you go!', yal.x, yal.y - 260);
  }

  // The Yalapappus's input for the kit, phase 1.
  function yalSneakInput(dt, inH) {
    const out = { x: 0, y: 0, sprint: false, actionPressed: false };
    if (look === 'alarm') {
      alarmT -= dt;
      const a = env.versus && inH ? { ...inH, sprint: false } : aiSnatcher(chase, brain, env.skill, dt);
      a.sprint = false; // no rolling about while still half sitting
      if (alarmT <= 0 && !chase.tug && yal.mode === 'move') { look = 'return'; lookT = 0; }
      return a;
    }
    if (look === 'return') {
      const dx = seat.x - yal.x, dy = seat.y - yal.y, d = Math.hypot(dx, dy);
      if (d > 14 && yal.mode === 'move') { out.x = dx / d; out.y = dy / d; } else if (yal.mode === 'move') {
        look = 'munch'; lookT = 0; nextLook = munchTime() + 0.6; rest = 1.0; yal.facing = tro.x > yal.x ? -1 : 1;
      }
      return out;
    }
    return out;
  }

  function updateLook(dt, inH) {
    lookT += dt;
    rest = Math.max(0, rest - dt);
    const d = near(yal, tro);
    if (look === 'munch') {
      // Facing away from where the Trollusk came from, munching.
      yal.facing = tro.x > yal.x ? -1 : 1;
      if (env.versus) {
        if (inH?.actionPressed && rest <= 0 && lookT > 0.8) startLook();
      } else {
        // A scurrying Trollusk makes a noise: he looks round sooner.
        if (tro.sprinting && d < 750) { nextLook -= dt * 1.4; if (env.rng() < dt * 2) fx.say('?', yal.x, yal.y - 250); }
        if (lookT >= nextLook) startLook();
      }
    } else if (look === 'warn') {
      if (lookT >= warnTime()) { look = 'look'; lookT = 0; yal.facing = Math.sign(tro.x - yal.x) || 1; brain.lookFor = lookTime(); }
    } else if (look === 'look') {
      yal.facing = Math.sign(tro.x - yal.x) || 1;
      const moving = Math.hypot(tro.vx, tro.vy) > 40 && tro.mode !== 'grabbed';
      if (moving && !tro.hidden && lookT > 0.12) {
        look = 'alarm'; alarmT = 2.4 + env.skill; lookT = 0;
        env.sfx('caught'); env.sfx('thump'); env.vibrate(90);
        fx.say('OI! I SEE YOU!', yal.x, yal.y - 280);
        art.kick(yc, -0.6);
        shake = 0.4;
      } else if (lookT >= (env.versus ? 1.4 : brain.lookFor)) {
        look = 'munch'; lookT = 0; nextLook = munchTime(); rest = 1.2;
      }
    }
  }

  const self = {
    time: total,
    done: false,
    outcome: null,
    chase,
    get phase() { return phase; },
    get look() { return look; },
    get seat() { return seat; },
    exitX: EXIT_X,
    update(dt, inS, inH) {
      t += dt;
      fx.update(dt);
      shake = Math.max(0, shake - dt);
      hint.t -= dt;
      if (self.done) {
        // Outro: the Trollusk waves the letter and gabbles off; or the
        // Yalapappus munches on, contented.
        if (self.outcome === 'snatched') {
          tro.x += 420 * dt; tc.x = tro.x; tc.facing = 1;
          art.setAnim(tc, 'celebrate'); art.animate(tc, dt);
          art.setAnim(yc, 'wail'); art.animate(yc, dt);
        } else {
          art.setAnim(yc, 'celebrate'); art.animate(yc, dt);
          art.setAnim(tc, 'wail'); art.animate(tc, dt);
        }
        return;
      }
      self.time = Math.max(0, self.time - dt);
      inS = inS || {};
      let tin = { ...inS };
      let yin;

      if (phase === 'sneak') {
        updateLook(dt, inH);
        // The snatch: Action right next to him while he isn't looking.
        const d = near(yal, tro);
        // (Not while he's looking, nor while he's up and after you: then Action dodges.)
        const busy = look === 'munch' || look === 'warn' || look === 'return' || (look === 'alarm' && (yal.mode === 'stumble' || yal.mode === 'dazed'));
        if (inS.actionPressed && busy && !chase.tug && tro.mode === 'move' && d < 150) {
          snatch();
          tin.actionPressed = false;
        }
        yin = phase === 'sneak' ? yalSneakInput(dt, inH) : { x: 0, y: 0 };
      } else {
        // The getaway.
        surprisedT = Math.max(0, surprisedT - dt);
        if (surprisedT > 0) yin = { x: 0, y: 0 };
        else {
          yin = env.versus ? { ...(inH || {}) } : aiSnatcher(chase, brain, env.skill, dt);
          if (!env.versus && !chase.tug && yal.mode === 'move') {
            // He knows where the way out is: cut the Trollusk off when level.
            if (Math.abs(tro.x - yal.x) < 120 && tro.x > yal.x) yin.x = Math.max(yin.x, 0.5);
          }
        }
        // Rolled into a ball: fast, but no grabbing; unrolling takes a wobble.
        if (yal.sprinting) ballT = 0.35;
        else ballT = Math.max(0, ballT - dt);
        if (!chase.tug && (yal.sprinting || ballT > 0)) yin.actionPressed = false;
      }

      const ev = stepChase(chase, yin, tin, dt);
      eventFx(env, ev, fx);
      if (ev.some((e) => e.type === 'grab')) { art.kick(tc, 0.4); shake = 0.25; }
      if (ev.some((e) => e.type === 'free')) { art.kick(tc, -0.5); fx.say('Wriggled free!', tro.x, tro.y - 220); }
      if (ev.some((e) => e.type === 'lunge')) env.sfx('thump');

      if (chase.done) {
        if (phase === 'sneak') thrownBack(); else lostIt();
      }

      // Wind in the bushes, so a shaking bush is only a clue.
      windT -= dt;
      if (windT <= 0) {
        windT = 1.4 + env.rng() * 2.6;
        const k = cover[Math.floor(env.rng() * cover.length)];
        if (k.sheet === 'trollusk') { k.shake = 0.7; env.sfx('rustle'); }
      }
      for (const k of cover) {
        if (tro.inCover === k && tro.rustle > 0.2) k.shake = Math.max(k.shake, tro.rustle);
        k.shake = Math.max(0, k.shake - dt * 1.5);
      }

      // Away!
      if (phase === 'getaway' && !chase.tug && tro.x >= EXIT_X) {
        self.done = true; self.outcome = 'snatched';
        self.bonus = near(yal, tro) > 450 ? 1 : 0;
        fx.say(self.bonus ? 'Clean away!' : 'Away!', tro.x - 120, tro.y - 220);
        env.sfx('cheer');
      } else if (self.time <= 0) {
        self.done = true;
        // Out of time while he has it: he got away with it all the same.
        self.outcome = phase === 'getaway' ? 'snatched' : 'kept';
        self.bonus = 0;
      }

      // Animation.
      yc.x = yal.x; yc.y = yal.y; tc.x = tro.x; tc.y = tro.y;
      art.animate(yc, dt, yal.vx, yal.vy);
      art.animate(tc, dt, tro.vx, tro.vy);
      animYal(yc, yal);
      animTro(tc, tro);
    },
    draw(g, tt) {
      g.save();
      if (shake > 0 && !env.reduceMotion) g.translate((Math.random() - 0.5) * 16 * shake, (Math.random() - 0.5) * 12 * shake);
      art.drawScene(g, 'scenes/yalapappus', W, H);
      // The hole's far edge first, then everything back to front.
      art.drawSprite(g, art.prop('yalapappus', 4), hole.x, hole.y - 6, { height: 70, ay: 1 });
      const things = [
        ...cover.map((k) => ({ y: k.y + k.ry * 0.9, draw: () => drawCover(g, k, tt) })),
        { y: hole.y + hole.ry, draw: () => art.drawSprite(g, art.prop('yalapappus', 3), hole.x, hole.y + hole.ry + 14, { height: 70 }) },
        { y: tro.y, draw: () => drawTro(g, tt) },
        { y: yal.y, draw: () => drawYal(g, tt) },
      ].sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      // Who has the letter.
      if (!self.done || self.outcome === 'snatched') {
        if (phase === 'getaway' || (self.done && self.outcome === 'snatched')) { if (!tro.hidden) letterMarker(g, tro.x, tro.y - 235, tt); } else letterMarker(g, yal.x + (yal.facing > 0 ? 40 : -40), yal.y - 285, tt, 58);
      }
      if (phase === 'sneak' && look === 'warn') eyeBubble(g, yal.x + yal.facing * 80, yal.y - 260, lookT / warnTime(), tt);
      if (phase === 'sneak' && look === 'look') eyeOpen(g, yal.x + yal.facing * 80, yal.y - 260, tt);
      if (phase === 'getaway' && !self.done) exitSign(g, 1700, 760, 'Away!', tt);
      if (chase.tug) tugBar(g, chase, (yal.x + tro.x) / 2, Math.min(yal.y, tro.y) - 340, ['Got you!', 'Break free!']);
      fx.draw(g);
      g.restore();
      if (hint.t > 0 && !self.done) hintLine(g, hint.text, W, 150, Math.min(1, hint.t * 2));
    },
    marks() {
      const elapsed = total - self.time;
      return marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: elapsed / total, bonus: self.bonus || 0 });
    },
    hud() {
      if (self.done) return '';
      if (phase === 'getaway') return 'Get away! →';
      return look === 'look' || look === 'warn' ? 'FREEZE!' : look === 'alarm' ? 'Run and hide!' : 'Creep up and snatch';
    },
  };

  function animYal(c, m) {
    const sp = Math.hypot(m.vx, m.vy);
    c.facing = m.facing;
    if (phase === 'sneak' && (look === 'munch' || look === 'warn' || look === 'look') && m.mode === 'move' && sp < 30) {
      art.setAnim(c, look === 'munch' ? 'munch' : look === 'warn' ? 'idle' : 'eye');
      if (look === 'munch' && Math.floor(t * 1.6) !== Math.floor((t - 1 / 60) * 1.6) && env.rng() < 0.5) env.sfx('munch');
      return;
    }
    if (m.mode === 'grabbing') art.setAnim(c, 'shout');
    else if (m.mode === 'lunge') art.setAnim(c, 'hop');
    else if (m.mode === 'stumble') art.setAnim(c, 'land');
    else if (m.mode === 'dazed') art.setAnim(c, 'dizzy');
    else if (m.sprinting) art.setAnim(c, 'ball');
    else if (ballT > 0) art.setAnim(c, 'dizzy');
    else if (m.winded > 0) art.setAnim(c, 'wail');
    else if (phase === 'getaway' && surprisedT > 0) art.setAnim(c, 'bonked');
    else if (sp > 30) art.setAnim(c, phase === 'getaway' || look === 'alarm' ? 'shout' : 'trundle');
    else art.setAnim(c, 'idle');
  }

  function animTro(c, m) {
    const sp = Math.hypot(m.vx, m.vy);
    if (phase === 'sneak' && m.mode === 'move' && !chase.tug) {
      if (sp < 40) art.setAnim(c, 'freeze');
      else if (m.sprinting) art.setAnim(c, 'run');
      else art.setAnim(c, 'sneak');
      return;
    }
    animTrollusk(c, m);
  }

  function drawYal(g, tt) {
    staminaRing(g, yal, yal.x, yal.y, 60, '#c9b8d4');
    const ball = yc.anim === 'ball';
    if (ball) { yc.z = 85; art.drawCreature(g, yc, tt, { reduceMotion: env.reduceMotion }); yc.z = 0; } else art.drawCreature(g, yc, tt, { reduceMotion: env.reduceMotion });
  }

  function drawTro(g, tt) {
    if (tro.hidden) {
      // Alone against the computer, his hat peeks over the bush now and then.
      if (env.versus || (tt % 3.2) > 0.7) return;
      const y0 = tc.y;
      tc.y = tro.y - (tro.inCover?.h || 150) * 0.55;
      const a = tc.anim;
      art.setAnim(tc, 'duck');
      art.drawCreature(g, tc, tt, { reduceMotion: env.reduceMotion, shadow: false });
      tc.y = y0;
      art.setAnim(tc, a);
      return;
    }
    staminaRing(g, tro, tro.x, tro.y, 46, '#f2c53d');
    art.drawCreature(g, tc, tt, { reduceMotion: env.reduceMotion });
  }

  return self;
}

// He's looking: a wide-open eye.
function eyeOpen(g, x, y, t) {
  g.save();
  g.translate(x, y - 50);
  const s = 1 + Math.sin(t * 10) * 0.05;
  g.scale(s, s);
  g.fillStyle = '#f8f1e0'; g.strokeStyle = '#c8443a'; g.lineWidth = 6;
  g.beginPath(); g.ellipse(0, 0, 62, 38, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#33241a';
  g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c8443a';
  g.font = '800 30px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.fillText('LOOKING!', 0, -50);
  g.restore();
}

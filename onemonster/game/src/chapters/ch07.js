// Chapter 7: the Stamp-Collecting Trollusk snatches the letter back from the
// Paper-Munching Yalapappus (design.md, chapter 7 and "Chases"), then gets away.
//
// Phase 1, the sneak: the Yalapappus sits munching by his seat. Every few
// seconds he stops munching and an eye bubble swells over his head (the
// warning, a good second long), then he turns round and looks. Anyone he
// sees moving in the open is in trouble: he gets up and trundles after them,
// hopping to grab. Let go of the stick to freeze (the Trollusk holds up his
// leafy twig); stand still in a bush and he can't see you at all. Action next
// to him (while he isn't looking) snatches the letter.
//
// Phase 2, the getaway: the same chase kit with the roles turned round. The
// Yalapappus chases (in kit terms he is the snatcher, wanting his letter back)
// and the Trollusk runs for the way out on the right. Walking, the little
// Trollusk is the faster; Sprint makes the Yalapappus roll into a ball: fast,
// but he can't grab while rolled, and he unrolls with a wobble. If he grabs
// the Trollusk and wins the tug, he takes the letter back to his seat and it's
// the sneak again, with less time.
//
// One Chase runs the whole chapter: chase.s is the Yalapappus, chase.h the
// Trollusk. The human snatcher of the chapter steers the kit's holder.

import { makeMover, makeChase, stepChase, aiSnatcher, dodgeChance, clamp } from '../chase.js';
import * as art from '../art.js';
import { staminaRing, tugBar, drawCover, eventFx, makeFx, roundRect } from '../chasedraw.js';
import { actionPrompt, letterTag, marker } from '../prompt.js';
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

// A hint on a cream band, big enough to read over busy art. Centred at x
// (clamped so the whole band stays on the board), no wider than maxW: the
// text shrinks to fit. colour: the ink.
export function hintBand(g, text, x, y, { W = 1920, maxW = 960, alpha = 1, colour = '#33241a', size = 42 } = {}) {
  if (!text) return;
  g.save();
  g.globalAlpha = alpha;
  let fs = size;
  g.font = `800 ${fs}px Fraunces, Georgia, serif`;
  let tw = g.measureText(text).width;
  if (tw > maxW - 70) { fs = Math.max(24, Math.floor(fs * (maxW - 70) / tw)); g.font = `800 ${fs}px Fraunces, Georgia, serif`; tw = g.measureText(text).width; }
  const w = tw + 70, h = fs * 1.7;
  const cx = clamp(x, w / 2 + 10, W - w / 2 - 10);
  g.fillStyle = 'rgba(251,246,232,0.94)';
  g.strokeStyle = '#33241a';
  g.lineWidth = 4;
  roundRect(g, cx - w / 2, y - h / 2, w, h, h / 2);
  g.fill(); g.stroke();
  g.fillStyle = colour;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, cx, y + 2);
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
// k 0..1: how far through the warning (the bubble swells and shakes harder).
export function eyeBubble(g, x, y, k, t) {
  const sp = art.prop('trollusk', 9);
  const kk = Math.min(1, k);
  const s = 0.7 + 0.5 * kk;
  const wob = Math.sin(t * (14 + 10 * kk)) * (0.05 + 0.06 * kk);
  if (!art.drawSprite(g, sp, x, y, { height: 170 * s, rot: wob })) {
    g.save(); g.translate(x, y - 85 * s); g.fillStyle = '#f8f1e0'; g.strokeStyle = '#33241a'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, 90 * s, 55 * s, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#33241a'; g.beginPath(); g.arc(0, 0, 20 * s, 0, Math.PI * 2); g.fill(); g.restore();
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

// A tug between two worn-out monsters mashing equally could last for ever:
// the rope slowly slides toward whoever is ahead, faster the longer it goes.
export function tugTiebreak(chase, dt) {
  const tg = chase.tug;
  if (!tg) return;
  const lead = tg.v - 0.5;
  const k = 0.12 + Math.max(0, tg.t - 2.5) * 0.12;
  tg.v = clamp(tg.v + (Math.sign(lead) || 1) * k * dt, 0.001, 0.999);
}

// ---------- chapter 7 ----------

const SEAT0 = { x: 640, y: 905 };
const START_DX = 1080; // where the Trollusk starts, right of the Yalapappus
const START_Y = 965;
const EXIT_X = 4100; // the way out, at the far end of the getaway
const SNATCH_D = 175; // how close to him Action snatches
const M = 100; // px per metre, for the distances in the HUD

export default function create(env) {
  const { W, H } = env;
  art.preload(['props.trollusk', 'props.yalapappus', 'yalapappus.swaps', 'yalapappus.poses', 'trollusk.poses']);
  const total = 45 + (env.gentle[0] ? 10 : 0);
  const Y0 = 820, Y1 = 1040;
  const bounds = { x0: 110, x1: 1830, y0: Y0, y1: Y1 };
  // The sneak happens on the first screen; the getaway runs on along the
  // bumpy ground to the right, past bushes, rocks and holes.
  const cover = [
    { x: 1450, y: 870, sheet: 'trollusk', item: 5, h: 230 },
    { x: 1140, y: 1000, sheet: 'trollusk', item: 5, h: 240 },
    { x: 905, y: 855, sheet: 'yalapappus', item: 1, h: 150, rx: 85, ry: 36 },
    { x: 380, y: 990, sheet: 'trollusk', item: 5, h: 240 },
    { x: 1700, y: 1010, sheet: 'yalapappus', item: 2, h: 160, rx: 90, ry: 36 },
    { x: 2150, y: 880, sheet: 'trollusk', item: 5, h: 240 },
    { x: 2560, y: 1005, sheet: 'trollusk', item: 5, h: 230 },
    { x: 2980, y: 860, sheet: 'yalapappus', item: 1, h: 150, rx: 85, ry: 36 },
    { x: 3400, y: 990, sheet: 'trollusk', item: 5, h: 245 },
    { x: 3820, y: 870, sheet: 'trollusk', item: 5, h: 235 },
  ].map((k) => ({ rx: 105, ry: 44, shake: 0, ...k }));
  // Holes in the bumpy ground: the little Trollusk hops them, the Yalapappus
  // must go round (or bowl along as a ball and get stuck at the edge). Big
  // rocks block both.
  const holes = [{ x: 1290, y: 935 }, { x: 2350, y: 960 }, { x: 2800, y: 900 }, { x: 3600, y: 950 }, { x: 3950, y: 905 }]
    .map((o) => ({ ...o, rx: 95, ry: 30, hop: true, hole: true }));
  const rocks = [{ x: 1950, y: 1000 }, { x: 3200, y: 880 }].map((o) => ({ ...o, rx: 70, ry: 30, hop: false, rock: true }));
  const obstacles = [...holes, ...rocks];
  let seat = { ...SEAT0 };
  // Kit roles: the Yalapappus is the kit's snatcher, the Trollusk its holder.
  // Walking, the Trollusk is the quicker; the Yalapappus must roll or hop.
  const yal = makeMover({
    x: seat.x, y: seat.y, speed: 215, sprint: 560, accel: 1500, radius: 62, canHide: false, hopsLogs: false,
    lungeRange: 330, lungeSpeed: 920, lungeTime: 0.3, lungeCooldown: 1.6, stumbleTime: 1.0, grabRange: 70,
    drain: 0.48, regen: 0.17,
  });
  const tro = makeMover({ x: seat.x + START_DX, y: START_Y, speed: 255, sprint: 450, accel: 2600, radius: 44, drain: 0.42 });
  yal.facing = -1;
  const chase = makeChase({ snatcher: yal, holder: tro, bounds, cover, obstacles, rng: env.rng, gentle: [env.gentle[1], env.gentle[0]] });
  const yc = art.makeCreature('yalapappus', yal.x, yal.y);
  const tc = art.makeCreature('trollusk', tro.x, tro.y);
  yc.sizeK = 1.2; // 300 px tall
  tc.sizeK = 1.05; // 240 px tall
  const fx = makeFx();
  const brain = {};
  let t = 0;
  let shake = 0;
  let camX = 0;
  let hintX = W / 2; // where the hint band sits: over the Trollusk, smoothed
  let hint = { text: env.versus ? 'Trollusk: creep up and snatch! Yalapappus: look round!' : 'Creep up behind him while he munches.', t: 3.5 };
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
  let frozen = false; // the Trollusk's pose: twig up, or creeping (with hysteresis)
  let poseHold = 0; // seconds the current Trollusk pose has been held
  nextLook = 2.6 + env.rng() * 1.2;

  function sneakBounds() {
    bounds.x0 = Math.max(110, seat.x - 560);
    bounds.x1 = Math.min(EXIT_X - 200, seat.x + 1200);
  }

  function munchTime() {
    const k = 1.25 - 0.55 * env.skill;
    // A crafty Yalapappus sometimes looks again almost at once.
    if (env.rng() < 0.3 * env.skill) return 0.8 + env.rng() * 0.5;
    return (1.8 + env.rng() * 2.6) * k;
  }
  // The warning is long enough to read and act on: he stops munching and the
  // eye bubble swells for a good second before he turns.
  const warnTime = () => (env.gentle[0] ? 1.4 : 1.0);
  const lookTime = () => 1.1 + env.rng() * 0.7 + env.skill * 0.4;

  function startLook() { look = 'warn'; lookT = 0; env.sfx('eye'); }

  function snatch() {
    phase = 'getaway';
    look = 'munch';
    bounds.x0 = Math.max(110, Math.min(seat.x, tro.x) - 500);
    bounds.x1 = EXIT_X + 80;
    surprisedT = 0.7;
    yal.mode = 'move'; yal.vx = yal.vy = 0;
    tro.facing = 1;
    env.sfx('snatch'); env.sfx('gabble'); env.vibrate(80);
    fx.say('SNATCH!', tro.x, tro.y - 280);
    art.kick(tc, -0.5);
    art.kick(yc, 0.5);
    hint = { text: 'RUN! Get away to the right!', t: 3.2, colour: '#c8443a' };
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
    tro.x = clamp(seat.x + 620, bounds.x0, bounds.x1);
    tro.y = clamp(tro.y, Y0, Y1);
    yal.mode = 'move';
    env.sfx('munch'); env.sfx('aww');
    fx.say('He grabbed it back!', yal.x, yal.y - 320);
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
    fx.say('Shoo! Off you go!', yal.x, yal.y - 320);
    hint = { text: 'Thrown out! Creep up again.', t: 2.5 };
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
        look = 'munch'; lookT = 0; nextLook = munchTime() + 0.8; rest = 1.0; yal.facing = tro.x > yal.x ? -1 : 1;
      }
      return out;
    }
    return out;
  }

  const canLookVersus = () => look === 'munch' && rest <= 0 && lookT > 0.8;

  function updateLook(dt, inH) {
    lookT += dt;
    rest = Math.max(0, rest - dt);
    const d = near(yal, tro);
    if (look === 'munch') {
      // Facing away from where the Trollusk came from, munching.
      yal.facing = tro.x > yal.x ? -1 : 1;
      if (env.versus) {
        if (inH?.actionPressed && canLookVersus()) startLook();
      } else {
        // A scurrying Trollusk makes a noise: he looks round sooner.
        if (tro.sprinting && d < 750) { nextLook -= dt * 1.4; if (env.rng() < dt * 2) fx.say('?', yal.x, yal.y - 300); }
        if (lookT >= nextLook) startLook();
      }
    } else if (look === 'warn') {
      if (lookT >= warnTime()) { look = 'look'; lookT = 0; yal.facing = Math.sign(tro.x - yal.x) || 1; brain.lookFor = lookTime(); env.sfx('eye'); }
    } else if (look === 'look') {
      yal.facing = Math.sign(tro.x - yal.x) || 1;
      const moving = Math.hypot(tro.vx, tro.vy) > 40 && tro.mode !== 'grabbed';
      if (moving && !tro.hidden && lookT > 0.12) {
        look = 'alarm'; alarmT = 2.4 + env.skill; lookT = 0;
        env.sfx('caught'); env.sfx('thump'); env.vibrate(90);
        fx.say('OI! I SEE YOU!', yal.x, yal.y - 340);
        art.kick(yc, -0.6);
        shake = 0.4;
        hint = { text: 'He saw you! Run and hide in a bush!', t: 2.5, colour: '#c8443a' };
      } else if (lookT >= (env.versus ? 1.4 : brain.lookFor)) {
        look = 'munch'; lookT = 0; nextLook = munchTime(); rest = 1.2;
        env.sfx('munch');
      }
    }
  }

  // Can Action snatch right now? (Not while he's looking, nor while he's up
  // and after you: then Action dodges.)
  const snatchOpen = () => phase === 'sneak' && !chase.tug && tro.mode === 'move'
    && (look === 'munch' || look === 'warn' || look === 'return' || (look === 'alarm' && yal.mode === 'stumble'))
    && near(yal, tro) < SNATCH_D;
  // Is a hop (lunge) coming at the Trollusk that a dodge would beat?
  const hopComing = () => dodgeChance(chase);

  const self = {
    focus: () => [{ x: tro.x - camX, y: tro.y }, { x: yal.x - camX, y: yal.y }], // what the camera frames (on screen): the snatcher, then the holder
    time: total,
    done: false,
    outcome: null,
    chase,
    get phase() { return phase; },
    get look() { return look; },
    get seat() { return seat; },
    get frozen() { return frozen; },
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
          followCamera(dt);
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
        if (inS.actionPressed && snatchOpen()) {
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

      // Caught sneaking up on him at his own seat, the big Yalapappus has the
      // stronger grip: break free fast or be flung away.
      if (chase.tug && phase === 'sneak') chase.tug.v = Math.min(0.999, chase.tug.v + 0.2 * dt);
      tugTiebreak(chase, dt);
      const ev = stepChase(chase, yin, tin, dt);
      eventFx(env, ev, fx);
      if (ev.some((e) => e.type === 'grab')) { art.kick(tc, 0.4); shake = 0.25; }
      if (ev.some((e) => e.type === 'free')) art.kick(tc, -0.5);
      if (ev.some((e) => e.type === 'lunge')) env.sfx('thump');
      if (ev.some((e) => e.type === 'dodge')) fx.say('Hop!', tro.x, tro.y - 250);

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
        fx.say(self.bonus ? 'Clean away!' : 'Away!', tro.x - 120, tro.y - 260);
        env.sfx('cheer');
      } else if (self.time <= 0) {
        self.done = true;
        // Out of time while he has it: he got away with it all the same.
        self.outcome = phase === 'getaway' ? 'snatched' : 'kept';
        self.bonus = 0;
      }

      // The camera: on the sneak, both of them; on the getaway, ahead of the Trollusk.
      followCamera(dt);
      hintX += (tro.x - camX - hintX) * (1 - Math.exp(-4 * dt));

      // Animation.
      yc.x = yal.x; yc.y = yal.y; tc.x = tro.x; tc.y = tro.y;
      art.animate(yc, dt, yal.vx, yal.vy);
      art.animate(tc, dt, tro.vx, tro.vy);
      animYal(yc, yal, dt);
      animTro(tc, tro, dt);
    },
    draw(g, tt) {
      g.save();
      if (shake > 0 && !env.reduceMotion) g.translate((Math.random() - 0.5) * 16 * shake, (Math.random() - 0.5) * 12 * shake);
      drawScrollingScene(g, camX);
      g.translate(-camX, 0);
      const vis = (x, r = 300) => x > camX - r && x < camX + W + r;
      // The holes' far edges first, then everything back to front.
      for (const o of holes) if (vis(o.x)) art.drawSprite(g, art.prop('yalapappus', 4), o.x, o.y - 6, { height: 90 });
      if (vis(EXIT_X)) exitPost(g, EXIT_X + 40, 860, tt);
      const things = [
        ...cover.filter((k) => vis(k.x)).map((k) => ({ y: k.y + k.ry * 0.9, draw: () => drawCover(g, k, tt) })),
        ...holes.filter((o) => vis(o.x)).map((o) => ({ y: o.y, draw: () => art.drawSprite(g, art.prop('yalapappus', 3), o.x, o.y + o.ry + 20, { height: 90 }) })),
        ...rocks.filter((o) => vis(o.x)).map((o) => ({ y: o.y + o.ry, draw: () => art.drawSprite(g, art.prop('yalapappus', 2), o.x, o.y + o.ry, { height: 140 }) })),
        { y: tro.y, draw: () => drawTro(g, tt) },
        { y: yal.y, draw: () => drawYal(g, tt) },
      ].sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      // Who has the letter: a ringed envelope on the Yalapappus's fork, or in
      // the Trollusk's snerk.
      if (!self.done || self.outcome === 'snatched') {
        if (phase === 'getaway' || (self.done && self.outcome === 'snatched')) { if (!tro.hidden) letterTag(g, tro.x + tro.facing * 70, tro.y - 118, { t: tt }); } else letterTag(g, yal.x + yal.facing * 80, yal.y - 165, { t: tt });
      }
      if (phase === 'sneak' && look === 'warn') eyeBubble(g, yal.x + yal.facing * 60, yal.y - 290, lookT / warnTime(), tt);
      if (phase === 'sneak' && look === 'look') eyeOpen(g, yal.x + yal.facing * 60, yal.y - 300, tt);
      if (chase.tug) tugBar(g, chase, (yal.x + tro.x) / 2, Math.min(yal.y, tro.y) - 380, ['Got you!', 'Break free!']);
      // In-world prompts: what to press, now.
      const pk = { kind: env.inputKind, t: tt, side: 0 };
      if (!self.done && !chase.tug) {
        if (snatchOpen()) actionPrompt(g, tro.x, tro.y - 260, 'Snatch!', { ...pk, pulse: 1 });
        else if (phase === 'sneak' && look === 'munch' && tro.mode === 'move' && near(yal, tro) < 520 && near(yal, tro) >= SNATCH_D) marker(g, yal.x + yal.facing * 80, yal.y - 240, { t: tt, label: 'Closer!' });
        else if (hopComing()) actionPrompt(g, tro.x, tro.y - 260, 'Dodge!', { ...pk, pulse: 1 });
        if (env.versus && phase === 'sneak' && canLookVersus()) actionPrompt(g, yal.x, yal.y - 330, 'Look round!', { ...pk, side: 1, size: 28 });
      }
      fx.draw(g);
      g.restore();
      if (phase === 'getaway' && !self.done && EXIT_X - camX > W - 100) exitSign(g, W - 170, 740, 'Away!', tt);
      // The hint band: what the moment needs, else the timed hint.
      if (!self.done) {
        const txt = stateHint();
        if (txt) hintBand(g, txt.text, hintX, 200, { W, colour: txt.colour });
        else if (hint.t > 0) hintBand(g, hint.text, hintX, 200, { W, alpha: Math.min(1, hint.t * 2), colour: hint.colour });
      }
    },
    marks() {
      const elapsed = total - self.time;
      return marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: elapsed / total, bonus: self.bonus || 0 });
    },
    hud() {
      if (self.done) return '';
      if (phase === 'getaway') {
        const behind = Math.max(0, Math.round((tro.x - yal.x) / M));
        return `Away in ${Math.max(0, Math.ceil((EXIT_X - tro.x) / M))} m → · he is ${behind} m behind`;
      }
      return look === 'look' || look === 'warn' ? 'FREEZE!' : look === 'alarm' ? 'Run and hide!' : 'Creep up and snatch';
    },
  };

  // The hint the state demands (over any timed hint).
  function stateHint() {
    if (chase.tug) return null;
    if (phase === 'sneak' && look === 'warn') return { text: "He's turning round: FREEZE! Let go of the stick!", colour: '#c8443a' };
    if (phase === 'sneak' && look === 'look') return { text: frozen ? 'Keep still... he is looking!' : 'FREEZE! Let go of the stick!', colour: '#c8443a' };
    return null;
  }

  let munchT = 0;
  function followCamera(dt) {
    const target = phase === 'getaway' || self.done ? tro.x - 760 : (tro.x + yal.x) / 2 - W / 2;
    const want = clamp(target, 0, EXIT_X + 260 - W);
    camX += (want - camX) * (1 - Math.exp(-5 * dt));
  }

  function animYal(c, m, dt) {
    const sp = Math.hypot(m.vx, m.vy);
    c.facing = m.facing;
    if (phase === 'sneak' && (look === 'munch' || look === 'warn' || look === 'look') && m.mode === 'move' && sp < 30) {
      // Munching; the warning: he stops, fork up; looking: up on his feet, turned round.
      art.setAnim(c, look === 'munch' ? 'munch' : 'idle');
      if (look === 'munch') { munchT -= dt; if (munchT <= 0) { munchT = 0.6 + Math.random() * 0.5; env.sfx('munch'); } }
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

  function animTro(c, m, dt) {
    const sp = Math.hypot(m.vx, m.vy);
    poseHold += dt;
    if (phase === 'sneak' && m.mode === 'move' && !chase.tug) {
      // Twig up when he stops, creeping when he moves, with hysteresis and a
      // minimum hold so a pose never flickers back and forth.
      if ((frozen && sp > 90) || (!frozen && sp < 25)) {
        if (poseHold >= 0.15) { frozen = !frozen; poseHold = 0; }
      }
      if (frozen) art.setAnim(c, 'freeze');
      else if (m.sprinting) art.setAnim(c, 'run');
      else art.setAnim(c, 'sneak');
      return;
    }
    frozen = false;
    animTrollusk(c, m);
  }

  function drawYal(g, tt) {
    staminaRing(g, yal, yal.x, yal.y, 70, '#c9b8d4');
    const ball = yc.anim === 'ball';
    if (ball) { yc.z = 100; art.drawCreature(g, yc, tt, { reduceMotion: env.reduceMotion }); yc.z = 0; } else art.drawCreature(g, yc, tt, { reduceMotion: env.reduceMotion });
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
    staminaRing(g, tro, tro.x, tro.y, 52, '#f2c53d');
    art.drawCreature(g, tc, tt, { reduceMotion: env.reduceMotion });
  }

  return self;
}

// ---------- the how-to-play page ----------
// Three pictures, composed from the delivered art until OM-H7a/b/c arrive.

const SCENE = 'scenes/yalapappus';
const CROP = [300, 560, 1300, 520]; // the bumpy ground at the edge of Nowhere
const letterOnFork = (x, y) => ({ draw: (g, t) => letterTag(g, x, y, { t, r: 34 }) });

export const HOWTO = [
  {
    text: 'Creep up behind the Yalapappus while he munches.',
    scene: SCENE, crop: CROP,
    items: [
      { creature: 'yalapappus', anim: 'munch', x: 190, y: 420, h: 250, flip: true },
      letterOnFork(130, 300),
      { path: [[560, 410], [430, 400], [330, 405]], arrow: true },
      { creature: 'trollusk', anim: 'sneak', x: 500, y: 430, h: 210, flip: true },
    ],
  },
  {
    text: 'When he turns to look: let go of the stick and FREEZE.',
    scene: SCENE, crop: CROP,
    items: [
      { creature: 'yalapappus', anim: 'idle', x: 190, y: 430, h: 260 },
      { sprite: ['props.trollusk', 9], x: 290, y: 190, h: 120 },
      { creature: 'trollusk', anim: 'freeze', x: 470, y: 430, h: 210, flip: true },
      { word: 'FREEZE!', x: 470, y: 160, size: 48 },
    ],
  },
  {
    text: 'Snatch the letter and run for the way out!',
    scene: SCENE, crop: CROP,
    items: [
      { creature: 'yalapappus', anim: 'shout', x: 150, y: 440, h: 240 },
      { creature: 'trollusk', anim: 'run', x: 440, y: 440, h: 220 },
      { sprite: ['props.trollusk', 1], x: 330, y: 300, h: 44, rot: 0.4 },
      { sprite: ['props.trollusk', 3], x: 370, y: 350, h: 40, rot: -0.5 },
      { sprite: ['props.trollusk', 2], x: 300, y: 380, h: 42, rot: 0.9 },
      { path: [[520, 300], [600, 300]], arrow: true },
      { word: 'RUN!', x: 470, y: 150, size: 54 },
    ],
  },
];

// A competent player's input for the next frame (scripts/chapter-check.mjs):
// creeps up, freezes at the warning, snatches when close, then paces the
// getaway, sprinting to answer his roll and dodging his hops.
export function autopilot(ch) {
  const DT = 1 / 20;
  const b = ch._ap || (ch._ap = { t: 0, last: -1, seen: 0, r: 7 });
  b.t += DT;
  const c = ch.chase, y = c.s, h = c.h;
  const press = () => { const p = b.t - b.last > 0.14; if (p) b.last = b.t; return p; };
  if (ch.done) return { x: 0, y: 0 };
  if (c.tug) return { x: Math.sign(h.x - y.x) || 1, y: 0, actionPressed: press() };
  const dx = y.x - h.x, dy = y.y - h.y, d = Math.hypot(dx, dy) || 1;
  if (ch.phase === 'sneak') {
    if (ch.look === 'warn' || ch.look === 'look') {
      b.seen += DT;
      if (b.seen > 0.2 || ch.look === 'look') return { x: 0, y: 0 };
    } else b.seen = 0;
    if (ch.look === 'alarm') return { x: -dx / d, y: -dy / d, sprint: d < 320 && h.st > 0.3, actionPressed: y.mode === 'lunge' && d < 260 && h.cool <= 0 };
    if (d < SNATCH_D - 30) return { x: 0, y: 0, actionPressed: press() };
    return { x: dx / d, y: dy / d };
  }
  const ex = ch.exitX + 100 - h.x, ey = 930 - h.y, ed = Math.hypot(ex, ey) || 1;
  const out = { x: ex / ed, y: ey / ed, sprint: (y.sprinting || d < 260) && h.st > 0.55 };
  b.r = (b.r * 9301 + 49297) % 233280;
  if (y.mode === 'lunge' && d < 280 && h.cool <= 0 && b.r / 233280 < 0.55) { out.actionPressed = true; out.x = 0; out.y = -dy / d; }
  return out;
}

// He's looking: a wide-open eye.
function eyeOpen(g, x, y, t) {
  g.save();
  g.translate(x, y - 50);
  const s = 1 + Math.sin(t * 10) * 0.05;
  g.scale(s, s);
  g.fillStyle = '#f8f1e0'; g.strokeStyle = '#c8443a'; g.lineWidth = 7;
  g.beginPath(); g.ellipse(0, 0, 80, 48, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#33241a';
  g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c8443a';
  g.font = '800 36px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.lineWidth = 8; g.strokeStyle = 'rgba(248,241,224,0.95)';
  g.strokeText('LOOKING!', 0, -66);
  g.fillText('LOOKING!', 0, -66);
  g.restore();
}

// The bumpy ground runs on: the scene, tiled, every other copy mirrored so the
// edges meet.
function drawScrollingScene(g, camX) {
  const img = art.image('scenes/yalapappus');
  const W = 1920, H = 1080;
  if (!img) { art.drawScene(g, 'scenes/yalapappus', W, H); return; }
  const i0 = Math.floor(camX / W);
  for (let i = i0; i <= i0 + 1; i++) {
    const x = i * W - camX;
    g.save();
    if (i % 2) { g.translate(x + W, 0); g.scale(-1, 1); } else g.translate(x, 0);
    g.drawImage(img, 0, 0, W, H);
    g.restore();
  }
}

// The way out: a signpost with the letter's way pointing on.
function exitPost(g, x, y, t) {
  g.save();
  g.translate(x, y);
  g.fillStyle = '#8a6a44'; g.strokeStyle = '#33241a'; g.lineWidth = 5;
  g.fillRect(-10, -200, 20, 200); g.strokeRect(-10, -200, 20, 200);
  g.translate(0, -170);
  g.rotate(Math.sin(t * 2) * 0.03);
  g.fillStyle = '#d9b77a';
  g.beginPath(); g.moveTo(-90, -34); g.lineTo(80, -34); g.lineTo(120, 0); g.lineTo(80, 34); g.lineTo(-90, 34); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#33241a';
  g.font = '800 30px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.fillText('AWAY', 0, 11);
  g.restore();
}

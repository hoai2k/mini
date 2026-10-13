// Chapter 1: the Stamp-Collecting Trollusk snatches the letter from Sally
// Ann's mailbox (design.md, chapter 1 and "Two-player versus"). A side-on
// country lane: he creeps from cover to cover toward the mailbox at the far
// right while three lookouts look out now and then, each over her own stretch
// of the lane, always with an eye warning first. Moving in the open (or
// sprinting anywhere) while looked at gets him spotted and he scuttles back to
// the last cover. Letting go of the stick in the open freezes him behind his
// twig, which fools a lookout less each time. The mailman putters along the
// back road toward the mailbox: he is the clock. Loose stamps blowing along
// the lane are the bonus.
//
// The holder (versus: the second player; solo: the AI below, with env.skill)
// chooses which lookout looks out, and when. Every lookout rests after a look,
// so no stretch of the lane can be watched all the time.

import * as art from '../art.js';
import { makeFx } from '../chasedraw.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';
import { marksFor } from './index.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

// ---------- the lane (logical 1920 x 1080, matching scenes/trollusk) ----------

export const LANE = { x0: 70, x1: 1860, y0: 805, y1: 1000 };
export const MAILBOX = { x: 1815, y: 780, grabX: 1790, grabY: 820, grabR: 115 };
export const START = { x: 150, y: 860 };
// Cover: round bushes (prop 5) and low flowerbeds (prop 6). Standing in a bush
// hides all but his hat; ducking (hold Action) hides him in either.
export const COVER = [
  { x: 150, y: 860, item: 5, h: 265, rx: 135, ry: 50 },
  { x: 480, y: 955, item: 6, h: 165, rx: 140, ry: 44 },
  { x: 800, y: 845, item: 5, h: 260, rx: 132, ry: 48 },
  { x: 1110, y: 955, item: 6, h: 165, rx: 140, ry: 44 },
  { x: 1420, y: 855, item: 5, h: 265, rx: 132, ry: 48 },
];
// Sally Ann's house: the end wall of it rises behind the hedge and the picket
// fence between the two trees, with her window in it.
export const HOUSE = { x0: 690, x1: 1130, top: 262, bottom: 600 };
// The three lookouts: who, where they are drawn, and the stretch of lane each watches.
// cast sprites: 1 Sally Ann looking / 2 turned away; 3 neighbour peering / 4 dozing; 5 dog staring / 6 asleep.
export const LOOKOUTS = [
  { id: 'neighbour', name: 'Neighbour', x: 330, y: 778, h: 262, look: 3, away: 4, zone: [0, 700], lookTime: 1.9, rest: 4.4 },
  { id: 'sally', name: 'Sally Ann', x: 910, y: 548, h: 232, look: 1, away: 2, zone: [540, 1300], lookTime: 1.9, rest: 3.8 },
  { id: 'dog', name: 'Dog', x: 1640, y: 790, h: 192, hAway: 118, look: 5, away: 6, zone: [1230, 1920], lookTime: 1.5, rest: 3.2 },
];

const SNEAK = 175;
const SPRINT = 400;
const SPOT_PENALTY = 2; // seconds
// The mailman's road runs just behind the picket fence and behind both trees:
// the scene's foreground (scenes/trollusk-front) is drawn over him. He stops at the mailbox.
const MAIL_ROAD = { x0: -160, x1: 1745, y: 615 };

const INK = '#33241a';
const CREAM = 'rgba(251,246,232,0.94)';
const YELLOW = '#f2c53d';
const RED = '#c8443a';

// The ring a lookout watches: one ellipse, used both to draw it and to judge
// whether his feet are inside it, so what you see is what they see.
export function zoneEllipse(L) {
  const [z0, z1] = L.zone;
  return { cx: (z0 + z1) / 2, cy: (LANE.y0 + LANE.y1) / 2 + 8, rx: (z1 - z0) / 2, ry: (LANE.y1 - LANE.y0) / 2 + 60 };
}

export function inZone(L, x, y) {
  const e = zoneEllipse(L);
  const dx = (x - e.cx) / e.rx, dy = (y - e.cy) / e.ry;
  return dx * dx + dy * dy <= 1;
}

export const atMailbox = (x, y) => Math.hypot(x - MAILBOX.grabX, (y - MAILBOX.grabY) * 0.6) < MAILBOX.grabR;

export function inCoverOf(x, y) {
  for (const k of COVER) {
    const dx = (x - k.x) / k.rx, dy = (y - k.y) / (k.ry * 1.6);
    if (dx * dx + dy * dy <= 1) return k;
  }
  return null;
}

export default function create(env) {
  const { W, H } = env;
  const total = 45 + (env.gentle[0] ? 10 : 0);
  const fx = makeFx();
  const tc = art.makeCreature('trollusk', START.x, START.y);
  tc.sizeK = 1.1;
  const tr = {
    x: START.x, y: START.y, vx: 0, vy: 0, facing: 1,
    mode: 'free', // 'free' | 'scuttle' | 'grab'
    cover: COVER[0], lastCover: COVER[0], ducking: false, frozen: false, sprinting: false, moving: false,
    safeT: 0, freezeUses: 0, stepT: 0, noiseT: 0, hideT: 0,
  };
  const look = LOOKOUTS.map((L, i) => ({
    ...L, i, state: 'rest', t: 0, restFor: 0.7 + i * 0.35, judged: false, survived: false, spotted: 0, grace: 0,
  }));
  const noise = [];
  const stamps = [];
  const ai = { nextT: 1.0 + env.rng() * 1.2 };
  const holder = { sel: 1, prevX: 0, deny: 0 };
  let spots = 0; // the third postmark is for a snatch nobody saw
  let alert = 0; // 0..1: noise makes the lookouts sharper
  let stampT = 3 + env.rng() * 2;
  let t = 0;
  let outroT = 0;
  let mailX = MAIL_ROAD.x0;
  let motorT = 1;
  let hurryT = 0;

  const warnTime = () => {
    if (env.versus) return 0.85 * (env.gentle[0] ? 1.25 : 1);
    return lerp(1.05, 0.6, env.skill) * (env.gentle[0] ? 1.3 : 1);
  };

  function press(L) {
    if (L.state !== 'ready') return false;
    L.state = 'warn';
    L.t = warnTime();
    env.sfx('eye');
    return true;
  }

  function spot(L, why) {
    L.spotted = 1.2;
    spots++;
    env.sfx('caught');
    env.sfx('gabble');
    env.vibrate(80);
    fx.say(why || 'Spotted!', tr.x, tr.y - 290);
    self.time = Math.max(0, self.time - SPOT_PENALTY);
    tr.mode = 'scuttle';
    tr.ducking = false; tr.frozen = false;
    art.kick(tc, -0.5);
    tc.flash = 1;
    alert = Math.max(0, alert - 0.3);
  }

  // Is the Trollusk seen by this lookout right now? Judged every frame of a look.
  function judge(L) {
    if (tr.mode !== 'free' || tr.safeT > 0) return;
    if (!inZone(L, tr.x, tr.y)) return;
    if (L.grace > 0) return;
    if (tr.sprinting && tr.moving) return spot(L, 'Heard you!');
    if (tr.cover) {
      if (tr.ducking) return;
      // Standing tall in a bush is safe, unless the noise has them on edge.
      if (!L.judged) {
        L.judged = true;
        const risk = Math.max(0, alert - 0.35) * 0.9 + (tr.moving ? 0.05 : 0);
        if (risk > 0 && env.rng() < risk) spot(L, 'I see a hat!');
      }
      return;
    }
    if (tr.moving) return spot(L, 'Spotted!');
    // Frozen in the open behind his twig: a gamble that gets worse each time.
    if (!L.survived) {
      const p = clamp(0.85 * Math.pow(0.7, tr.freezeUses) - alert * 0.2, 0.05, 0.95);
      tr.freezeUses++;
      if (env.rng() < p) { L.survived = true; fx.say('…a twig?', tr.x, tr.y - 290); }
      else spot(L, 'Not fooled!');
    }
  }

  function stepLookouts(dt) {
    for (const L of look) {
      L.spotted = Math.max(0, L.spotted - dt);
      L.grace = Math.max(0, L.grace - dt);
      if (L.state === 'rest') {
        L.t += dt;
        if (L.t >= L.restFor) { L.state = 'ready'; L.t = 0; }
      } else if (L.state === 'warn') {
        L.t -= dt;
        if (L.t <= 0) {
          L.state = 'look';
          L.lookFor = env.versus ? L.lookTime : L.lookTime * (0.85 + env.rng() * 0.4);
          L.t = L.lookFor;
          L.judged = false; L.survived = false; L.grace = 0.12;
          if (L.id === 'dog') env.sfx('bonk');
        }
      } else if (L.state === 'look') {
        judge(L);
        L.t -= dt;
        if (L.t <= 0) {
          if (L.survived && tr.mode === 'free') fx.say('Phew!', tr.x, tr.y - 290);
          L.state = 'rest'; L.t = 0;
          L.restFor = env.versus ? L.rest * (env.gentle[1] ? 0.85 : 1) : L.rest * (0.8 + env.rng() * 0.5);
        }
      }
    }
  }

  // The computer lookouts: the same presses a player would make.
  function aiStep(dt) {
    ai.nextT -= dt;
    // Where he will be when the warning is over (a keen lookout reads his heading).
    const px = tr.x + tr.vx * warnTime() * env.skill;
    // Busy: a lookout already warns or looks over where he is or will be. One
    // looking at an empty stretch does not stop another from looking at him.
    const busy = look.some((L) => (L.state === 'warn' || L.state === 'look') && (inZone(L, tr.x, tr.y) || inZone(L, px, tr.y)));
    if (alert > 0.3 && !busy) ai.nextT = Math.min(ai.nextT, 0.25);
    // A keen lookout notices him moving in the open and looks sooner.
    if (!busy && !tr.cover && tr.moving && tr.mode === 'free') ai.nextT = Math.min(ai.nextT, lerp(1.4, 0.3, env.skill));
    if (ai.nextT > 0 || busy) return;
    const ready = look.filter((L) => L.state === 'ready');
    if (!ready.length) return;
    const watching = ready.filter((L) => inZone(L, px, tr.y));
    let pick;
    if (watching.length && env.rng() < 0.35 + 0.5 * env.skill) pick = watching[Math.floor(env.rng() * watching.length)];
    else pick = ready[Math.floor(env.rng() * ready.length)];
    press(pick);
    ai.nextT = lerp(3.4, 1.7, env.skill) * (0.65 + env.rng() * 0.7) * (1 - 0.35 * alert) * (env.gentle[0] ? 1.25 : 1);
  }

  function holderStep(inH) {
    const x = inH?.x || 0;
    if (Math.abs(x) > 0.5 && Math.abs(holder.prevX) <= 0.5) {
      holder.sel = (holder.sel + Math.sign(x) + 3) % 3;
      env.sfx('move');
    }
    holder.prevX = x;
    if (inH?.actionPressed) {
      if (!press(look[holder.sel])) { holder.deny = 0.4; env.sfx('back'); }
    }
  }

  function moveTrollusk(dt, inS) {
    tr.safeT = Math.max(0, tr.safeT - dt);
    if (tr.mode === 'scuttle') {
      const k = tr.lastCover;
      const dx = k.x - tr.x, dy = k.y - tr.y;
      const d = Math.hypot(dx, dy);
      const sp = 720;
      if (d < 12) {
        tr.mode = 'free'; tr.vx = tr.vy = 0; tr.safeT = 1.0;
        art.kick(tc, 0.45); env.sfx('rustle');
      } else {
        tr.vx = (dx / d) * sp; tr.vy = (dy / d) * sp;
        tr.x += tr.vx * dt; tr.y += tr.vy * dt;
        if (Math.hypot(k.x - tr.x, k.y - tr.y) > d) { tr.x = k.x; tr.y = k.y; }
      }
      tr.cover = inCoverOf(tr.x, tr.y);
      tr.moving = true; tr.sprinting = false; tr.ducking = false; tr.frozen = false;
      return;
    }
    let ix = inS?.x || 0, iy = inS?.y || 0;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    // Holding Action in cover ducks down out of sight (at the mailbox it grabs, below).
    const wantDuck = !!inS?.action && !!tr.cover && !atMailbox(tr.x, tr.y);
    tr.ducking = wantDuck;
    const active = m > 0.2 && !wantDuck;
    tr.sprinting = active && !!inS?.sprint;
    const sp = tr.sprinting ? SPRINT : SNEAK;
    const tx = active ? ix * sp : 0, ty = active ? iy * sp * 0.7 : 0;
    const a = 1 - Math.exp(-(active ? 14 : 22) * dt);
    tr.vx += (tx - tr.vx) * a; tr.vy += (ty - tr.vy) * a;
    tr.x = clamp(tr.x + tr.vx * dt, LANE.x0, LANE.x1);
    tr.y = clamp(tr.y + tr.vy * dt, LANE.y0, LANE.y1);
    tr.moving = active;
    const was = tr.cover;
    tr.cover = inCoverOf(tr.x, tr.y);
    if (tr.cover) tr.lastCover = tr.cover;
    if (tr.cover && tr.cover !== was) { env.sfx('rustle'); tr.cover.shake = 0.8; }
    if (tr.cover && active) tr.cover.shake = Math.max(tr.cover.shake || 0, 0.35);
    const wasFrozen = tr.frozen;
    tr.frozen = !tr.cover && !active;
    if (tr.frozen && !wasFrozen) { art.kick(tc, 0.35); env.sfx('swish'); }
    if (tr.ducking && !tc.wasDucking) art.kick(tc, 0.4);
    tc.wasDucking = tr.ducking;
    // Footsteps, and noise when he hurries.
    if (active) {
      tr.stepT -= dt;
      if (tr.stepT <= 0) { tr.stepT = tr.sprinting ? 0.16 : 0.42; env.sfx('step'); }
    }
    if (tr.sprinting) {
      tr.noiseT -= dt;
      if (tr.noiseT <= 0) {
        tr.noiseT = 0.24;
        noise.push({ x: tr.x - Math.sign(tr.vx || 1) * 30, y: tr.y - 20, t: 0, s: env.rng() < 0.5 ? -1 : 1 });
        alert = Math.min(1, alert + 0.075);
        if (env.rng() < 0.25) env.sfx('gabble');
      }
    }
  }

  function stepStamps(dt) {
    stampT -= dt;
    if (stampT <= 0 && stamps.length < 2) {
      stampT = 5 + env.rng() * 3;
      const fromLeft = env.rng() < 0.5;
      stamps.push({
        x: fromLeft ? -40 : W + 40, y: lerp(LANE.y0 + 10, LANE.y1 - 10, env.rng()),
        vx: (fromLeft ? 1 : -1) * (70 + env.rng() * 50), item: 1 + Math.floor(env.rng() * 4), t: env.rng() * 6,
      });
    }
    for (let i = stamps.length - 1; i >= 0; i--) {
      const s = stamps[i];
      s.t += dt;
      s.x += s.vx * dt * (0.7 + 0.5 * Math.sin(s.t * 1.7));
      s.y = clamp(s.y + Math.sin(s.t * 2.3) * 22 * dt, LANE.y0, LANE.y1);
      if (tr.mode === 'free' && Math.hypot(s.x - tr.x, (s.y - tr.y) * 1.3) < 90) {
        stamps.splice(i, 1);
        self.bonus = Math.min(4, self.bonus + 1);
        env.sfx('snap'); env.sfx('tinkle');
        art.kick(tc, 0.25);
        fx.say('Stamp!', s.x, s.y - 140);
      } else if (s.x < -80 || s.x > W + 80) stamps.splice(i, 1);
    }
  }

  // A lookout warning or looking over the stretch of lane he is on.
  const threatOn = (x, y) => look.find((L) => (L.state === 'warn' || L.state === 'look') && inZone(L, x, y)) || null;

  const self = {
    focus: () => [tc, ...(env.versus ? LOOKOUTS : [])], // what the camera frames: the snatcher (then the lookouts)
    time: total,
    done: false,
    outcome: null,
    bonus: 0,
    total,
    tr, look, stamps, holder, // for tests and the bot
    get alert() { return alert; },
    get spots() { return spots; },
    get mailX() { return mailX; },
    press: (i) => press(look[i]),
    update(dt, inS, inH) {
      t += dt;
      fx.update(dt);
      for (const n of noise) n.t += dt;
      while (noise.length && noise[0].t > 0.7) noise.shift();
      for (const k of COVER) k.shake = Math.max(0, (k.shake || 0) - dt * 1.5);
      const target = lerp(MAIL_ROAD.x0, MAIL_ROAD.x1, clamp(1 - self.time / total, 0, 1));
      mailX += (target - mailX) * (1 - Math.exp(-3 * dt));
      if (self.done) { outro(dt); return; }
      self.time = Math.max(0, self.time - dt);
      motorT -= dt;
      if (motorT <= 0) { motorT = self.time < 10 ? 1.2 : 2.8; env.sfx('motor'); }
      if (self.time < 10 && self.time + dt >= 10) { hurryT = 2.2; env.sfx('horn'); }
      hurryT = Math.max(0, hurryT - dt);
      alert = Math.max(0, alert - dt * 0.1);
      moveTrollusk(dt, inS);
      if (env.versus) holderStep(inH); else aiStep(dt);
      holder.deny = Math.max(0, holder.deny - dt);
      stepLookouts(dt);
      stepStamps(dt);
      animTrollusk(dt);
      tr.hideT = tr.mode === 'free' && !tr.cover && !tr.frozen && threatOn(tr.x, tr.y)?.state === 'warn' ? tr.hideT + dt : 0;
      // The grab: at the mailbox, Action.
      if (tr.mode === 'free' && inS?.actionPressed && atMailbox(tr.x, tr.y)) {
        self.done = true;
        self.outcome = 'snatched';
        tr.mode = 'grab';
        tr.facing = 1;
        art.setAnim(tc, 'grab');
        art.kick(tc, -0.6);
        env.sfx('snatch'); env.sfx('gabble'); env.vibrate(150);
        fx.say('Got it!', MAILBOX.x - 60, 400);
        return;
      }
      if (self.time <= 0) {
        self.done = true;
        self.outcome = 'kept';
        env.sfx('horn');
        fx.say('Mail!', MAIL_ROAD.x1, 440);
      }
    },
    draw(g, tt) {
      art.drawScene(g, 'scenes/trollusk', W, H);
      drawHouse(g, tt);
      drawRoute(g);
      drawMailman(g, tt);
      const front = art.image('scenes/trollusk-front');
      if (front) g.drawImage(front, 0, 0, W, H);
      drawZones(g, tt);
      // The mailbox: painted in the scene; open with the flag up once robbed.
      if (self.outcome === 'snatched') drawOpenMailbox(g);
      const things = [
        ...COVER.map((k) => ({ y: k.y + k.ry * 0.9, draw: () => drawBush(g, k, tt) })),
        ...look.filter((L) => L.id !== 'sally').map((L) => ({ y: L.y, draw: () => drawLookout(g, L, tt) })),
        ...stamps.map((s) => ({ y: s.y, draw: () => art.drawSprite(g, art.prop('trollusk', s.item), s.x, s.y - 18 - Math.abs(Math.sin(s.t * 4)) * 14, { height: 74, rot: Math.sin(s.t * 3) * 0.5 }) })),
        { y: tr.cover && tr.mode !== 'grab' ? tr.cover.y + tr.cover.ry * 0.9 - 1 : tr.y, draw: () => drawTrollusk(g, tt) },
      ].sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      drawNoise(g);
      drawLookoutUi(g, tt);
      drawPrompts(g, tt);
      fx.draw(g);
      if (t < 4 && !self.done) hint(g, env.versus
        ? 'Trollusk: creep to the mailbox · Lookouts: pick one and look out!'
        : 'Creep to the mailbox. When an eye pops up, hide!', W, t);
    },
    marks() {
      const elapsed = total - self.time;
      const m = marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: elapsed / total, bonus: self.bonus / 4 });
      if (spots > 0) m[0] = Math.min(m[0], 2);
      return m;
    },
    hud: () => `Stamps ${self.bonus}/4`,
  };

  function animTrollusk(dt) {
    tc.x = tr.x; tc.y = tr.y;
    if (tr.mode === 'scuttle') art.setAnim(tc, 'scuttle');
    else if (tr.ducking) art.setAnim(tc, 'duck');
    else if (tr.sprinting) art.setAnim(tc, 'run');
    else if (tr.moving) art.setAnim(tc, 'sneak');
    else if (tr.frozen) art.setAnim(tc, 'freeze');
    else art.setAnim(tc, 'idle');
    art.animate(tc, dt, tr.vx, tr.vy);
  }

  function outro(dt) {
    outroT += dt;
    if (self.outcome === 'snatched') {
      if (outroT > 0.6) art.setAnim(tc, 'celebrate');
      if (outroT > 0.6 && outroT - dt <= 0.6) { env.sfx('gabble'); env.sfx('cheer'); art.kick(tc, 0.4); }
      art.animate(tc, dt);
      tc.facing = outroT > 0.6 ? -1 : 1;
    } else {
      art.setAnim(tc, 'wail');
      art.animate(tc, dt);
    }
    for (const L of look) if (L.state === 'warn' || L.state === 'look') { L.state = 'rest'; L.t = 0; }
  }

  // ---------- drawing ----------

  function drawTrollusk(g, tt) {
    art.drawCreature(g, tc, tt, { reduceMotion: env.reduceMotion });
    if (tr.frozen && tr.mode === 'free') {
      // How much his twig is still worth: leaves left on a little sprig.
      const left = Math.max(0, 4 - tr.freezeUses);
      g.save();
      g.fillStyle = '#5f8a3a'; g.strokeStyle = INK; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        g.globalAlpha = i < left ? 1 : 0.25;
        g.beginPath(); g.ellipse(tr.x - 36 + i * 24, tr.y + 28, 10, 7, 0.5, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
    }
  }

  // What to do right now, said in the world: the letter, the grab, the duck, the hide.
  function drawPrompts(g, tt) {
    const opts = { kind: env.inputKind, t: tt };
    if (self.outcome !== 'snatched') letterTag(g, MAILBOX.x + 55, 522, { t: tt });
    if (self.done) return;
    if (t < 7) marker(g, MAILBOX.x + 20, 420, { t: tt, label: 'The letter!' });
    if (tr.mode !== 'free') return;
    const size = art.creatureSize(tc);
    const top = tr.y - size.h - 24;
    if (atMailbox(tr.x, tr.y)) actionPrompt(g, tr.x, top, 'Grab!', { ...opts, pulse: 1, size: 40 });
    else if (tr.cover && !tr.ducking && threatOn(tr.x, tr.y)) actionPrompt(g, tr.x, top, 'Duck!', { ...opts, pulse: 1 });
    else if (tr.hideT > 0 && tr.hideT < 1.5) bang(g, tr.x, top - 10, 'Hide!', RED, 1, 60);
    if (env.versus) {
      const L = look[holder.sel];
      if (L.state === 'ready') actionPrompt(g, L.x, L.y - L.h - 150, 'Look out!', { ...opts, side: 1, size: 30 });
    }
  }

  function drawBush(g, k, tt) {
    const shake = k.shake > 0 && !env.reduceMotion ? Math.sin(tt * 60) * 5 * k.shake : 0;
    const sp = art.prop('trollusk', k.item);
    if (!art.drawSprite(g, sp, k.x + shake, k.y + k.ry * 0.9, { height: k.h, rot: shake * 0.004 })) {
      g.save(); g.fillStyle = '#5f7a45'; g.strokeStyle = INK; g.lineWidth = 4;
      g.beginPath(); g.ellipse(k.x + shake, k.y - k.h * 0.3, k.rx, k.h * 0.6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    }
  }

  // The painted mailbox's door (its right end) dropped open, the box empty.
  function drawOpenMailbox(g) {
    g.save();
    g.lineWidth = 5;
    g.strokeStyle = '#2b2622';
    g.fillStyle = '#2b2622';
    g.beginPath();
    g.moveTo(1846, 576); g.lineTo(1846, 506);
    g.quadraticCurveTo(1848, 472, 1870, 472);
    g.quadraticCurveTo(1892, 472, 1894, 506);
    g.lineTo(1894, 576); g.closePath(); g.fill();
    // The door hangs down from its hinge.
    g.fillStyle = '#9aa0a6';
    g.beginPath();
    g.moveTo(1846, 578); g.lineTo(1896, 578); g.lineTo(1902, 648);
    g.quadraticCurveTo(1876, 676, 1852, 650); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#6d7277';
    g.fillRect(1866, 640, 14, 10);
    g.restore();
  }

  // Sally Ann's house: the clapboard end wall of it standing behind the hedge
  // and the fence (the scene's foreground hides its foot), her window in it.
  function drawHouse(g, tt) {
    const L = look[1];
    const { x0, x1, top, bottom } = HOUSE;
    const cx = (x0 + x1) / 2;
    g.save();
    g.lineWidth = 5;
    g.strokeStyle = '#4a3526';
    // The gable and its roof.
    g.fillStyle = '#efe0bf';
    g.beginPath(); g.moveTo(x0, top); g.lineTo(cx, top - 150); g.lineTo(x1, top); g.closePath(); g.fill(); g.stroke();
    g.fillRect(x0, top, x1 - x0, bottom - top);
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(74,53,38,0.35)';
    for (let y = top + 26; y < bottom; y += 26) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
    g.lineWidth = 5;
    g.strokeStyle = '#4a3526';
    g.beginPath(); g.moveTo(x0, top); g.lineTo(x0, bottom); g.moveTo(x1, top); g.lineTo(x1, bottom); g.stroke();
    g.fillStyle = '#9b4b3a';
    g.beginPath(); g.moveTo(x0 - 36, top + 14); g.lineTo(cx, top - 158); g.lineTo(x1 + 36, top + 14); g.lineTo(x1 + 36, top - 4); g.lineTo(cx, top - 176); g.lineTo(x0 - 36, top - 4); g.closePath(); g.fill(); g.stroke();
    // A chimney, and a window box of geraniums under her sill.
    g.fillStyle = '#9b4b3a';
    g.fillRect(x1 - 110, top - 120, 44, 90); g.strokeRect(x1 - 110, top - 120, 44, 90);
    g.restore();
    drawLookout(g, L, tt);
    g.save();
    g.lineWidth = 4; g.strokeStyle = '#4a3526'; g.fillStyle = '#b07a52';
    g.fillRect(L.x - 118, L.y - 8, 236, 24); g.strokeRect(L.x - 118, L.y - 8, 236, 24);
    g.fillStyle = '#c8443a';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(L.x - 95 + i * 38, L.y - 16, 11, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.restore();
  }

  // The mailman's road: a dotted track above the fence from where he starts to
  // the mailbox, so how far he has to go reads as the clock.
  function drawRoute(g) {
    g.save();
    g.fillStyle = 'rgba(51,36,26,0.5)';
    for (let x = 40; x < MAIL_ROAD.x1 - 10; x += 44) { g.beginPath(); g.arc(x, 478, 5, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }

  function drawMailman(g, tt) {
    const bounce = Math.floor(tt * 7) % 2;
    const sp = art.cast(7 + bounce);
    const parked = self.done && self.outcome === 'kept';
    const x = mailX, y = MAIL_ROAD.y + (parked ? 0 : bounce * -3);
    // His puffs of exhaust.
    g.save();
    for (let i = 0; i < 3; i++) {
      const k = ((tt * 1.5 + i / 3) % 1);
      g.globalAlpha = 0.35 * (1 - k);
      g.fillStyle = '#d8d2c8';
      g.beginPath(); g.arc(x - 90 - k * 70, y - 24 - k * 24, 12 + k * 16, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    if (!art.drawSprite(g, sp, x, y, { height: 170, flip: true })) {
      g.save(); g.fillStyle = '#b8443a'; g.fillRect(x - 60, y - 70, 120, 70); g.restore();
    }
    if (hurryT > 0 && !self.done) {
      const k = 1 + 0.1 * Math.sin(tt * 16);
      bang(g, x, y - 180, 'Hurry!', RED, Math.min(1, hurryT), 56 * k);
    }
  }

  // The stretch of lane a lookout watches, drawn from their eyes: a cone down to
  // a dashed ring while the eye warns, a lit cone and ring while they look.
  function drawZones(g, tt) {
    for (const L of look) {
      if (L.state !== 'warn' && L.state !== 'look') continue;
      const e = zoneEllipse(L);
      const looking = L.state === 'look';
      const ex = L.x, ey = L.y - L.h * 0.72;
      g.save();
      const gr = g.createLinearGradient(0, ey, 0, e.cy);
      const c = L.spotted > 0 ? '200,68,58' : '255,236,150';
      gr.addColorStop(0, `rgba(${c},${looking ? 0.12 : 0.05})`);
      gr.addColorStop(1, `rgba(${c},${looking ? 0.4 : 0.18})`);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(ex - 18, ey); g.lineTo(ex + 18, ey); g.lineTo(e.cx + e.rx * 0.75, e.cy); g.lineTo(e.cx - e.rx * 0.75, e.cy); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
      if (looking) {
        g.fillStyle = L.spotted > 0 ? 'rgba(200,68,58,0.22)' : 'rgba(255,236,150,0.32)';
        g.fill();
        g.lineWidth = 10; g.strokeStyle = 'rgba(51,36,26,0.55)'; g.stroke();
        g.lineWidth = 6; g.strokeStyle = L.spotted > 0 ? RED : YELLOW; g.stroke();
      } else {
        g.globalAlpha = 0.65 + 0.3 * Math.sin(tt * 14);
        g.fillStyle = 'rgba(242,197,61,0.12)';
        g.fill();
        g.setLineDash([26, 18]);
        g.lineDashOffset = -tt * 60;
        g.lineWidth = 10; g.strokeStyle = 'rgba(51,36,26,0.55)'; g.stroke();
        g.lineWidth = 5; g.strokeStyle = YELLOW; g.stroke();
      }
      g.restore();
    }
  }

  function drawLookout(g, L, tt) {
    const looking = L.state === 'look';
    const sp = art.cast(looking ? L.look : L.away);
    const h = !looking && L.hAway ? L.hAway : L.h;
    // A lean-out when they start looking, settling back after.
    const pop = looking ? Math.max(0, 1 - (L.lookFor - L.t) * 5) : 0;
    if (!art.drawSprite(g, sp, L.x, L.y, { height: h, sx: 1 + pop * 0.08, sy: 1 + pop * 0.12 })) {
      g.save(); g.fillStyle = looking ? '#e6b8a0' : '#a89a90'; g.strokeStyle = INK; g.lineWidth = 4;
      g.beginPath(); g.ellipse(L.x, L.y - h / 2, h * 0.3, h / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
  }

  // Warnings, rests, alertness and (versus) the holder's selection, over each lookout.
  function drawLookoutUi(g, tt) {
    for (const L of look) {
      const top = L.y - L.h - 16;
      if (L.state === 'warn') {
        const k = 1 + 0.12 * Math.sin(tt * 20);
        art.drawSprite(g, art.prop('trollusk', 9), L.x, top + 6, { height: 150 * k }) || ring(g, L.x, top - 60, 50, YELLOW);
      }
      if (L.spotted > 0) bang(g, L.x + 80, top + 20, '!', RED);
      else if (alert > 0.3 && L.state !== 'warn') bang(g, L.x + 80, top + 30, alert > 0.6 ? '!' : '?', YELLOW, 0.6 + alert * 0.4);
      // The rest: a small clock that fills as they recover; a green dot when ready.
      const cx = L.x - 90, cy = top + 30;
      g.save();
      g.lineWidth = 4; g.strokeStyle = INK;
      if (L.state === 'rest') {
        g.fillStyle = 'rgba(248,241,224,0.9)';
        g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#8f8a86';
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (L.t / L.restFor)); g.closePath(); g.fill();
      } else if (L.state === 'ready') {
        g.fillStyle = '#6aa84f';
        g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
      if (env.versus && holder.sel === L.i && !self.done) {
        const bob = Math.sin(tt * 5) * 6;
        g.save();
        g.fillStyle = holder.deny > 0 ? RED : YELLOW;
        g.strokeStyle = INK; g.lineWidth = 5;
        const ay = top - 60 + bob;
        g.beginPath(); g.moveTo(L.x - 26, ay - 30); g.lineTo(L.x + 26, ay - 30); g.lineTo(L.x, ay); g.closePath(); g.fill(); g.stroke();
        g.font = '800 30px Fraunces, Georgia, serif';
        g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = 'rgba(248,241,224,0.95)'; g.fillStyle = INK;
        g.strokeText(L.name, L.x, ay - 42); g.fillText(L.name, L.x, ay - 42);
        g.restore();
      }
    }
  }

  function drawNoise(g) {
    g.save();
    g.strokeStyle = INK;
    g.lineCap = 'round';
    for (const n of noise) {
      const k = n.t / 0.7;
      g.globalAlpha = 1 - k;
      g.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.5 + n.s * 0.15;
        const r0 = 14 + k * 30, r1 = 30 + k * 40;
        g.beginPath();
        g.moveTo(n.x + Math.cos(a) * r0, n.y + Math.sin(a) * r0);
        g.lineTo(n.x + Math.cos(a) * r1, n.y + Math.sin(a) * r1);
        g.stroke();
      }
    }
    g.restore();
  }

  return self;
}

function ring(g, x, y, r, c) {
  g.save(); g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
  return true;
}

function bang(g, x, y, s, c, a = 1, size = 54) {
  g.save();
  g.globalAlpha = a;
  g.font = `900 ${size}px Fraunces, Georgia, serif`;
  g.textAlign = 'center';
  g.lineWidth = 8; g.strokeStyle = INK; g.fillStyle = c;
  g.strokeText(s, x, y); g.fillText(s, x, y);
  g.restore();
}

// The opening hint: big type on a cream band across the top of the lane.
function hint(g, text, W, t) {
  const a = Math.min(1, t * 3, (4 - t) * 2);
  g.save();
  g.globalAlpha = Math.max(0, a);
  g.fillStyle = CREAM;
  g.fillRect(0, 108, W, 84);
  g.fillStyle = INK;
  g.fillRect(0, 108, W, 4); g.fillRect(0, 188, W, 4);
  g.font = '800 44px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, W / 2, 152);
  g.restore();
}

// ---------- the how-to-play page (chapters/index.js, THE HOW-TO-PLAY PAGE) ----------
// Three pictures, matching image requests OM-H1a, b and c.

export const HOWTO = [
  {
    text: 'Creep from bush to bush along the lane.',
    scene: 'scenes/trollusk', crop: [360, 400, 1120, 640],
    items: [
      { sprite: ['props.trollusk', 5], x: 110, y: 420, h: 180 },
      { path: [[150, 440], [230, 452], [330, 440], [420, 452], [530, 440]], arrow: true },
      { creature: 'trollusk', anim: 'sneak', x: 300, y: 428, h: 200 },
      { sprite: ['props.trollusk', 5], x: 560, y: 436, h: 190 },
    ],
  },
  {
    text: 'An eye pops up? Hide, and hold to duck.',
    scene: 'scenes/trollusk', crop: [160, 380, 1120, 640],
    items: [
      { cast: 3, x: 170, y: 340, h: 270 },
      { sprite: ['props.trollusk', 9], x: 225, y: 110, h: 110 },
      { creature: 'trollusk', anim: 'duck', x: 455, y: 436, h: 140 },
      { sprite: ['props.trollusk', 6], x: 455, y: 456, h: 150 },
      { ring: [455, 400, 92] },
    ],
  },
  {
    text: 'At the mailbox, grab the letter before the mailman comes!',
    scene: 'scenes/trollusk', crop: [1100, 300, 820, 540],
    items: [
      { cast: 7, x: 110, y: 230, h: 84, flip: true },
      { path: [[150, 215], [250, 215], [350, 215]], arrow: true },
      { sprite: ['props.trollusk', 8], x: 470, y: 430, h: 240 },
      { creature: 'trollusk', anim: 'grab', x: 330, y: 438, h: 220 },
      { word: 'Grab!', x: 300, y: 160, size: 48 },
    ],
  },
];

// A competent player's input for the next frame (scripts/chapter-check.mjs):
// creeps from cover to cover while no lookout warns over the way, ducks in
// cover while one does, and caught in the open, hurries to the nearest cover
// if it is close or freezes behind the twig.
export function autopilot(ch) {
  const { tr, look } = ch;
  const inp = (x, y, o = {}) => ({ x, y, action: false, actionPressed: false, actionReleased: false, sprint: false, ...o });
  if (atMailbox(tr.x, tr.y)) return inp(0, 0, { actionPressed: true, action: true });
  if (tr.mode !== 'free') return inp(0, 0);
  const next = COVER.find((k) => k.x > tr.x + 40) || { x: MAILBOX.grabX - 30, y: MAILBOX.grabY + 10, rx: 60 };
  const onWay = (L) => inZone(L, tr.x, tr.y) || inZone(L, next.x, tr.y);
  const threats = look.filter((L) => onWay(L) && (L.state === 'warn' || L.state === 'look'));
  const toward = (k, o) => { const dx = k.x - tr.x, dy = k.y - tr.y, d = Math.hypot(dx, dy) || 1; return inp(dx / d, dy / d, o); };
  if (tr.cover) {
    if (threats.length) return inp(0, 0, { action: true }); // duck and wait
    return toward(next);
  }
  if (!threats.length) return toward(next);
  if (threats.some((L) => L.state === 'look')) return inp(0, 0); // freeze: a twig
  // Warned in the open: the nearest cover, if he can make it before the look.
  const warnLeft = Math.min(...threats.map((L) => L.t));
  const near = [...COVER].sort((a, b) => Math.abs(a.x - tr.x) - Math.abs(b.x - tr.x))[0];
  const gap = Math.max(0, Math.abs(near.x - tr.x) - near.rx * 0.7);
  if (gap < warnLeft * 170) return toward(near);
  if (gap < warnLeft * 380) return toward(near, { sprint: true });
  return inp(0, 0);
}

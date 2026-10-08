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
import { marksFor } from './index.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

// ---------- the lane (logical 1920 x 1080, matching scenes/trollusk) ----------

export const LANE = { x0: 70, x1: 1860, y0: 805, y1: 1000 };
export const MAILBOX = { x: 1810, y: 770, grabX: 1790, grabY: 820, grabR: 115 };
export const START = { x: 150, y: 860 };
export const COVER = [
  { x: 150, y: 860, item: 5, h: 205, rx: 115, ry: 46 },
  { x: 480, y: 955, item: 6, h: 125, rx: 120, ry: 40 },
  { x: 800, y: 845, item: 5, h: 200, rx: 112, ry: 44 },
  { x: 1110, y: 955, item: 6, h: 125, rx: 120, ry: 40 },
  { x: 1420, y: 855, item: 5, h: 205, rx: 112, ry: 44 },
];
// The three lookouts: who, where they are drawn, and the stretch of lane each watches.
// cast sprites: 1 Sally Ann looking / 2 turned away; 3 neighbour peering / 4 dozing; 5 dog staring / 6 asleep.
export const LOOKOUTS = [
  { id: 'neighbour', name: 'Neighbour', x: 330, y: 778, h: 235, look: 3, away: 4, zone: [0, 700], lookTime: 1.9, rest: 4.4 },
  { id: 'sally', name: 'Sally Ann', x: 1150, y: 505, h: 215, look: 1, away: 2, zone: [560, 1330], lookTime: 1.9, rest: 3.8 },
  { id: 'dog', name: 'Dog', x: 1640, y: 790, h: 165, hAway: 100, look: 5, away: 6, zone: [1230, 1920], lookTime: 1.5, rest: 3.2 },
];

const SNEAK = 175;
const SPRINT = 400;
const SPOT_PENALTY = 2; // seconds
// The dash (Action with the stick, or Action in the open): a quick burst out of a
// stretch that is about to be looked at. It is loud: it has a cooldown, he skids
// to a stop afterwards, and any lookout ready in the ring he lands in turns to
// look, so it saves him from a warning but not from a look. Land in a bush.
export const DASH = { speed: 1150, time: 0.2, skid: 0.3, cooldown: 1.6, alert: 0.12 };
const MAIL_ROAD = { x0: -140, x1: 1665, y: 512 };

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

const atMailbox = (x, y) => Math.hypot(x - MAILBOX.grabX, (y - MAILBOX.grabY) * 0.6) < MAILBOX.grabR;

function inCoverOf(x, y) {
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
  tc.sizeK = 0.8;
  const tr = {
    x: START.x, y: START.y, vx: 0, vy: 0, facing: 1,
    mode: 'free', // 'free' | 'scuttle' | 'grab'
    cover: COVER[0], lastCover: COVER[0], ducking: false, frozen: false, sprinting: false, moving: false,
    safeT: 0, freezeUses: 0, stepT: 0, noiseT: 0,
    dashT: 0, skidT: 0, dashCd: 0, dashX: 1, dashY: 0,
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
    fx.say(why || 'Spotted!', tr.x, tr.y - 230);
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
    if (tr.dashT > 0 || (tr.sprinting && tr.moving)) return spot(L, 'Heard you!');
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
      if (env.rng() < p) { L.survived = true; fx.say('…a twig?', tr.x, tr.y - 230); }
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
          if (L.survived && tr.mode === 'free') fx.say('Phew!', tr.x, tr.y - 230);
          L.state = 'rest'; L.t = 0;
          L.restFor = env.versus ? L.rest * (env.gentle[1] ? 0.85 : 1) : L.rest * (0.8 + env.rng() * 0.5);
        }
      }
    }
  }

  // The computer lookouts: the same presses a player would make.
  function aiStep(dt) {
    ai.nextT -= dt;
    const busy = look.some((L) => L.state === 'warn' || L.state === 'look');
    if (alert > 0.3 && !busy) ai.nextT = Math.min(ai.nextT, 0.25);
    if (ai.nextT > 0 || busy) return;
    const ready = look.filter((L) => L.state === 'ready');
    if (!ready.length) return;
    // Where he will be when the warning is over (a keen lookout reads his heading).
    const px = tr.x + tr.vx * warnTime() * env.skill;
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
      tr.dashT = 0; tr.skidT = 0;
      return;
    }
    tr.dashCd = Math.max(0, tr.dashCd - dt);
    let ix = inS?.x || 0, iy = inS?.y || 0;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    // Action dashes: with the stick pushed anywhere, or in the open with it still
    // (then straight ahead). In cover with the stick still it ducks; at the mailbox it grabs.
    if (inS?.actionPressed && tr.dashT <= 0 && !atMailbox(tr.x, tr.y) && (m > 0.3 || !tr.cover)) {
      if (tr.dashCd > 0) env.sfx('back');
      else {
        const d = m > 0.3 ? 1 : 0;
        tr.dashX = d ? ix / Math.hypot(ix, iy) : (tc.facing || 1); tr.dashY = d ? iy / Math.hypot(ix, iy) : 0;
        tr.dashT = DASH.time; tr.dashCd = DASH.cooldown;
        alert = Math.min(1, alert + DASH.alert);
        art.kick(tc, -0.45); env.sfx('swoosh'); env.sfx('step');
        noise.push({ x: tr.x - tr.dashX * 40, y: tr.y - 20, t: 0, s: 1 });
      }
    }
    if (tr.dashT > 0 || tr.skidT > 0) {
      if (tr.dashT > 0) {
        tr.dashT -= dt;
        tr.vx = tr.dashX * DASH.speed; tr.vy = tr.dashY * DASH.speed * 0.7;
        if (tr.dashT <= 0) {
          tr.skidT = DASH.skid;
          // The thud of his landing: a lookout whose ring he lands in turns to look, if she can.
          for (const L of look) if (inZone(L, tr.x, tr.y) && press(L)) fx.say('What was that?', L.x, L.y - L.h - 40);
        }
      } else {
        tr.skidT -= dt;
        const a = 1 - Math.exp(-16 * dt);
        tr.vx -= tr.vx * a; tr.vy -= tr.vy * a;
      }
      tr.x = clamp(tr.x + tr.vx * dt, LANE.x0, LANE.x1);
      tr.y = clamp(tr.y + tr.vy * dt, LANE.y0, LANE.y1);
      tr.moving = tr.dashT > 0; tr.sprinting = false; tr.ducking = false;
      const was = tr.cover;
      tr.cover = inCoverOf(tr.x, tr.y);
      if (tr.cover) tr.lastCover = tr.cover;
      if (tr.cover && tr.cover !== was) { env.sfx('rustle'); tr.cover.shake = 0.8; }
      tr.frozen = !tr.cover && tr.dashT <= 0;
      return;
    }
    const wantDuck = !!inS?.action && !!tr.cover;
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
      if (tr.mode === 'free' && Math.hypot(s.x - tr.x, (s.y - tr.y) * 1.3) < 80) {
        stamps.splice(i, 1);
        self.bonus = Math.min(4, self.bonus + 1);
        env.sfx('snap'); env.sfx('tinkle');
        art.kick(tc, 0.25);
        fx.say('Stamp!', s.x, s.y - 120);
      } else if (s.x < -80 || s.x > W + 80) stamps.splice(i, 1);
    }
  }

  const self = {
    time: total,
    done: false,
    outcome: null,
    bonus: 0,
    total,
    tr, look, stamps, holder, // for tests and the bot
    get alert() { return alert; },
    get spots() { return spots; },
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
      alert = Math.max(0, alert - dt * 0.1);
      moveTrollusk(dt, inS);
      if (env.versus) holderStep(inH); else aiStep(dt);
      holder.deny = Math.max(0, holder.deny - dt);
      stepLookouts(dt);
      stepStamps(dt);
      animTrollusk(dt);
      // The grab: at the mailbox, Action.
      if (tr.mode === 'free' && inS?.actionPressed && tr.dashT <= 0 && atMailbox(tr.x, tr.y)) {
        self.done = true;
        self.outcome = 'snatched';
        tr.mode = 'grab';
        tr.facing = 1;
        art.setAnim(tc, 'grab');
        art.kick(tc, -0.6);
        env.sfx('snatch'); env.sfx('gabble'); env.vibrate(150);
        fx.say('Got it!', MAILBOX.x, 380);
        return;
      }
      if (self.time <= 0) {
        self.done = true;
        self.outcome = 'kept';
        env.sfx('horn');
      }
    },
    draw(g, tt) {
      art.drawScene(g, 'scenes/trollusk', W, H);
      drawHouse(g);
      drawMailman(g, tt);
      drawZones(g, tt);
      // The mailbox: painted in the scene; open with the flag up once robbed.
      if (self.outcome === 'snatched') {
        drawOpenMailbox(g);
      }
      const things = [
        ...COVER.map((k) => ({ y: k.y + k.ry * 0.9, draw: () => drawBush(g, k, tt) })),
        ...look.filter((L) => L.id !== 'sally').map((L) => ({ y: L.y, draw: () => drawLookout(g, L, tt) })),
        ...stamps.map((s) => ({ y: s.y, draw: () => art.drawSprite(g, art.prop('trollusk', s.item), s.x, s.y - 18 - Math.abs(Math.sin(s.t * 4)) * 14, { height: 52, rot: Math.sin(s.t * 3) * 0.5 }) })),
        { y: tr.cover && tr.mode !== 'grab' ? tr.cover.y + tr.cover.ry * 0.9 - 1 : tr.y, draw: () => drawTrollusk(g, tt) },
      ].sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      drawNoise(g);
      drawLookoutUi(g, tt);
      fx.draw(g);
      if (t < 3.2 && !self.done) hint(g, env.versus
        ? 'Trollusk: creep from cover to cover · Lookouts: pick one, then look out!'
        : 'Creep from cover to cover. Watch for the eye! A: dash out of the ring.', W);
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
    else if (tr.dashT > 0) art.setAnim(tc, 'run');
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
    if (tr.dashCd > 0 && tr.mode === 'free' && !self.done) {
      // The dash recharging: a little ring at his feet that fills back up.
      g.save();
      g.lineWidth = 6; g.strokeStyle = 'rgba(51,36,26,0.35)';
      g.beginPath(); g.arc(tr.x, tr.y + 34, 16, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#f2c53d';
      g.beginPath(); g.arc(tr.x, tr.y + 34, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - tr.dashCd / DASH.cooldown)); g.stroke();
      g.restore();
    }
    if (tr.frozen && tr.mode === 'free') {
      // How much his twig is still worth: leaves left on a little sprig.
      const left = Math.max(0, 4 - tr.freezeUses);
      g.save();
      g.fillStyle = '#5f8a3a'; g.strokeStyle = '#33241a'; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        g.globalAlpha = i < left ? 1 : 0.25;
        g.beginPath(); g.ellipse(tr.x - 33 + i * 22, tr.y + 26, 9, 6, 0.5, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
    }
  }

  function drawBush(g, k, tt) {
    const shake = k.shake > 0 && !env.reduceMotion ? Math.sin(tt * 60) * 5 * k.shake : 0;
    const sp = art.prop('trollusk', k.item);
    if (!art.drawSprite(g, sp, k.x + shake, k.y + k.ry * 0.9, { height: k.h, rot: shake * 0.004 })) {
      g.save(); g.fillStyle = '#5f7a45'; g.strokeStyle = '#33241a'; g.lineWidth = 4;
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

  // Sally Ann's house: a clapboard wall with her window, up behind the fence.
  function drawHouse(g) {
    const L = look[1];
    const x0 = L.x - 175, x1 = L.x + 175, y0 = 228, y1 = 548;
    g.save();
    g.fillStyle = '#efe0bf';
    g.strokeStyle = '#4a3526';
    g.lineWidth = 5;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(74,53,38,0.35)';
    for (let y = y0 + 26; y < y1; y += 26) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
    g.lineWidth = 5;
    g.strokeStyle = '#4a3526';
    g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // The roof eave.
    g.fillStyle = '#9b4b3a';
    g.beginPath(); g.moveTo(x0 - 40, y0 + 8); g.lineTo(x1 + 40, y0 + 8); g.lineTo(x1 + 10, y0 - 50); g.lineTo(x0 - 10, y0 - 50); g.closePath(); g.fill(); g.stroke();
    // A step and a flower box.
    g.fillStyle = '#b07a52';
    g.fillRect(L.x - 120, L.y - 6, 240, 22); g.strokeRect(L.x - 120, L.y - 6, 240, 22);
    g.restore();
    drawLookout(g, L, 0);
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
      g.beginPath(); g.arc(x - 70 - k * 60, y - 18 - k * 20, 10 + k * 14, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    if (!art.drawSprite(g, sp, x, y, { height: 112, flip: true })) {
      g.save(); g.fillStyle = '#b8443a'; g.fillRect(x - 50, y - 50, 100, 50); g.restore();
    }
  }

  // The stretch of lane a lookout watches: dashed while the eye warns, a beam while looking.
  function drawZones(g, tt) {
    for (const L of look) {
      if (L.state !== 'warn' && L.state !== 'look') continue;
      const [z0, z1] = L.zone;
      const e = zoneEllipse(L);
      g.save();
      if (L.state === 'warn') {
        g.globalAlpha = 0.6 + 0.3 * Math.sin(tt * 18);
        g.beginPath(); g.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgba(242,197,61,0.14)';
        g.fill();
        g.setLineDash([26, 18]);
        g.lineWidth = 10;
        g.strokeStyle = 'rgba(51,36,26,0.55)';
        g.stroke();
        g.lineWidth = 5;
        g.strokeStyle = '#f2c53d';
        g.stroke();
      } else {
        const ex = L.x, ey = L.y - L.h * 0.72;
        // A faint beam from the eye down to the ring; only the ring itself counts.
        const gr = g.createLinearGradient(0, ey, 0, e.cy);
        gr.addColorStop(0, 'rgba(255,236,150,0.08)');
        gr.addColorStop(1, 'rgba(255,236,150,0.22)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(ex - 18, ey); g.lineTo(ex + 18, ey); g.lineTo(e.cx + e.rx * 0.6, e.cy); g.lineTo(e.cx - e.rx * 0.6, e.cy); g.closePath(); g.fill();
        g.beginPath(); g.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
        g.fillStyle = L.spotted > 0 ? 'rgba(200,68,58,0.2)' : 'rgba(255,236,150,0.3)';
        g.fill();
        g.lineWidth = 10;
        g.strokeStyle = 'rgba(51,36,26,0.55)';
        g.stroke();
        g.lineWidth = 6;
        g.strokeStyle = L.spotted > 0 ? '#c8443a' : '#f2c53d';
        g.stroke();
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
      g.save(); g.fillStyle = looking ? '#e6b8a0' : '#a89a90'; g.strokeStyle = '#33241a'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(L.x, L.y - h / 2, h * 0.3, h / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
  }

  // Warnings, rests, alertness and (versus) the holder's selection, over each lookout.
  function drawLookoutUi(g, tt) {
    for (const L of look) {
      const top = L.y - L.h - 16;
      if (L.state === 'warn') {
        const k = 1 + 0.12 * Math.sin(tt * 20);
        art.drawSprite(g, art.prop('trollusk', 9), L.x, top + 6, { height: 120 * k }) || ring(g, L.x, top - 50, 40, '#f2c53d');
      }
      if (L.spotted > 0) bang(g, L.x + 70, top + 20, '!', '#c8443a');
      else if (alert > 0.3 && L.state !== 'warn') bang(g, L.x + 70, top + 30, alert > 0.6 ? '!' : '?', '#f2c53d', 0.6 + alert * 0.4);
      // The rest: a small clock that fills as they recover; a green dot when ready.
      const cx = L.x - 80, cy = top + 30;
      g.save();
      g.lineWidth = 4; g.strokeStyle = '#33241a';
      if (L.state === 'rest') {
        g.fillStyle = 'rgba(248,241,224,0.9)';
        g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#8f8a86';
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (L.t / L.restFor)); g.closePath(); g.fill();
      } else if (L.state === 'ready') {
        g.fillStyle = '#6aa84f';
        g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
      if (env.versus && holder.sel === L.i && !self.done) {
        const bob = Math.sin(tt * 5) * 6;
        g.save();
        g.fillStyle = holder.deny > 0 ? '#c8443a' : '#f2c53d';
        g.strokeStyle = '#33241a'; g.lineWidth = 5;
        const ay = top - 90 + bob;
        g.beginPath(); g.moveTo(L.x - 26, ay - 30); g.lineTo(L.x + 26, ay - 30); g.lineTo(L.x, ay); g.closePath(); g.fill(); g.stroke();
        g.font = '800 30px Fraunces, Georgia, serif';
        g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = 'rgba(248,241,224,0.95)'; g.fillStyle = '#33241a';
        g.strokeText(L.name, L.x, ay - 42); g.fillText(L.name, L.x, ay - 42);
        g.restore();
      }
    }
  }

  function drawNoise(g) {
    g.save();
    g.strokeStyle = '#33241a';
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
  g.save(); g.fillStyle = c; g.strokeStyle = '#33241a'; g.lineWidth = 4;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
  return true;
}

function bang(g, x, y, s, c, a = 1) {
  g.save();
  g.globalAlpha = a;
  g.font = '900 54px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.lineWidth = 8; g.strokeStyle = '#33241a'; g.fillStyle = c;
  g.strokeText(s, x, y); g.fillText(s, x, y);
  g.restore();
}

function hint(g, text, W) {
  g.save();
  g.font = '700 36px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(248,241,224,0.95)';
  g.fillStyle = '#33241a';
  g.strokeText(text, W / 2, 150);
  g.fillText(text, W / 2, 150);
  g.restore();
}

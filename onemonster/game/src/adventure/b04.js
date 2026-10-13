// Board 4: the Furious-Floating Ice-Ferg, SCRUNNCCCHHH!! (design/adventure.md,
// section 4). A side-on sea, the waterline across the middle of the frame. The
// Ice-Ferg is huge and ponderous: the stick pushes it along and it keeps its
// momentum; up rises it high in the water (more ice above, it bumps the pier),
// down sinks it (it slips under the pier and the bridge, and under the surface
// currents). Holding Action huffs up its fury, swelling in freezing mist;
// letting go charges, a surge that smashes crates, barrels, floes, buoys and
// tugboats in splinters and spray. Sea lions hop aboard from the floes and
// lounge on its ledges; a charge into a reef cracks a chunk off it and throws
// one off. Warm currents melt it smaller (faster, but it smashes less).
// The Peg chugs ahead for the harbour at the right end, puffing steam; ram it
// before it gets there.
//
// The minigame (chapters/ch04.js) lent the fury, the charge and the Peg's
// steam bursts.

import * as art from '../art.js';
import * as kit from './kit.js';
import { BOARDS } from './index.js';
import { actionPrompt, letterTag } from '../prompt.js';

const ENTRY = BOARDS.find((b) => b.n === 4);
const { W, H, clamp, ease, approach, hash } = kit;

export const WL = 780; // the waterline
export const WORLD = 15000;
export const HARBOUR_X = 14350; // the Peg is safe once it is this far

export const TUNE = {
  ferg: {
    accel: 160, drag: 0.5, maxSpeed: 175, huffAccelK: 0.45, rideK: 2.2,
    furyTime: 1.4, furyTimeGentle: 1.05, minFury: 0.2,
    chargeMin: 330, chargeAdd: 420, chargeDur: 0.42, chargeDurAdd: 0.36,
    windup: 0.22, recover: 1.0, recoverAdd: 0.6, dazed: 1.6,
    levelRate: 1.6, riseOff: -90, sinkOff: 100, ice: 400, minSize: 0.62,
    melt: 0.065, meltGentle: 0.045, refreeze: 0.02,
  },
  // The captain opens the throttle when the eye opens (scare, fading over
  // scareT seconds), then settles to a chug, and dashes for the harbour mouth.
  peg: { cruise: 80, cruiseGentle: 66, scare: 300, scareT: 14, dash: 1.15, steam: 300, steamDecay: 2.4, steamCd: 3.6, steamCdGentle: 4.6, see: 760 },
  hitSpeed: 240,
  reefLevel: 0.45, // risen at least this much to float over a reef
  sunkLevel: -0.45, // sunk below this: under the surface, under the Peg
};

// ---------- the board's layout (world x) ----------

const SECTIONS = [0, 3400, 6400, 9500, 12400];

// Floating things the Ice-Ferg meets: kind, x, how much fury x size a charge
// needs to smash them. Floes carry sea lions.
const THINGS = [
  // 1. the open sea
  { kind: 'floe', x: 800, lions: 1 }, { kind: 'crate', x: 1200 }, { kind: 'floe', x: 1600, lions: 2 }, { kind: 'barrel', x: 2000 },
  { kind: 'floe', x: 2600, lions: 1 }, { kind: 'crate', x: 2900 }, { kind: 'floe', x: 3200, lions: 2 },
  // 2. the rocks
  { kind: 'floe', x: 3600, lions: 1 }, { kind: 'reef', x: 3900 }, { kind: 'floe', x: 4200, lions: 2 }, { kind: 'crate', x: 4400 },
  { kind: 'reef', x: 4850 }, { kind: 'floe', x: 5100, lions: 2 }, { kind: 'crate', x: 5350 }, { kind: 'reef', x: 5750 },
  { kind: 'floe', x: 6000, lions: 1 }, { kind: 'barrel', x: 6250 },
  // 3. the warm currents
  { kind: 'floe', x: 6550, lions: 1 }, { kind: 'barrel', x: 6950 }, { kind: 'floe', x: 7250, lions: 2 }, { kind: 'buoy', x: 7750 },
  { kind: 'floe', x: 7900, lions: 2 }, { kind: 'crate', x: 8150 }, { kind: 'floe', x: 8600, lions: 1 }, { kind: 'buoy', x: 8800 },
  { kind: 'barrel', x: 9050 }, { kind: 'floe', x: 9250, lions: 2 },
  // 4. the pier and the bridge
  { kind: 'floe', x: 9650, lions: 1 }, { kind: 'pier', x: 9850, w: 900 }, { kind: 'crate', x: 10250 }, { kind: 'floe', x: 11000, lions: 2 },
  { kind: 'barrel', x: 11150 }, { kind: 'bridge', x: 11450, w: 300 }, { kind: 'floe', x: 12000, lions: 1 },
  // 5. the harbour
  { kind: 'floe', x: 12600, lions: 2 }, { kind: 'buoy', x: 12850 }, { kind: 'floe', x: 13250, lions: 1 }, { kind: 'buoy', x: 13700 },
  { kind: 'floe', x: 13950, lions: 2 },
];
// Sea lions swimming in the open water (they hop aboard too).
const SWIMMERS = [2300, 4600, 5500, 7450, 8300, 11600, 13050, 14150];
// Tugboats: where each starts, steaming left for the Ice-Ferg.
const TUGS = [10900, 12100, 13500];
// Surface currents: warm ones flow right and melt the ice; the cold one flows left.
const ZONES = [
  { x0: 6700, x1: 7600, dir: 1, speed: 150, warm: true },
  { x0: 8000, x1: 8450, dir: -1, speed: 120, warm: false },
  { x0: 8700, x1: 9400, dir: 1, speed: 150, warm: true },
];
const NEED = { floe: 0.15, crate: 0.2, barrel: 0.2, buoy: 0.3, tug: 0.5 };
const HALF = { floe: 130, crate: 48, barrel: 42, buoy: 44, tug: 120, reef: 90 };
const OVERHEAD = { pier: 330, bridge: 320 }; // clearance above the waterline

// How far a charge of this fury carries (the stand-in arrow shows it).
export function chargeReach(fury) {
  const F = TUNE.ferg;
  return (F.chargeMin + F.chargeAdd * fury) * (F.chargeDur + F.chargeDurAdd * fury) * (5 / 6);
}

// Where the ice sits in the water for this float level: the sprite's waterline
// offset from WL (negative: risen).
const levelOff = (level) => (level >= 0 ? level * TUNE.ferg.riseOff : -level * TUNE.ferg.sinkOff);

// The sea strip at the bottom of each pose, as a fraction of its height.
const SEA_FRAC = { drift: 0.17, huff: 0.17, charge: 0.3, crash: 0.2, dazed: 0.18, eye: 0.17, celebrate: 0.2 };
const POSE_OF = { side: 'drift', sunk: 'drift', risen: 'drift', chargeSide: 'charge', cracked: 'crash', melted: 'dazed' };

// Where the extra sea lions sit, as fractions of the ice's width and height.
const LEDGES = [[-0.08, -0.96], [-0.3, -0.84], [0.16, -0.8], [0.42, -0.56], [-0.56, -0.46], [0.5, -0.3], [0.1, -0.44], [-0.46, -0.16]];

export default function create(env) {
  const F = TUNE.ferg, P = TUNE.peg;
  const gentle = !!env.gentle?.[0];
  const rng = env.rng;
  const total = kit.boardTime(env, ENTRY.time);
  const cam = kit.makeCamera(WORLD, { lead: 330, anchor: 0.36, rate: 3 });
  const parts = kit.makeParticles();
  const cps = kit.makeCheckpoints(SECTIONS);
  const hints = kit.makeHints([
    { x: 0, text: 'Push the stick to drift. The Ice-Ferg is heavy: plan ahead!', show: 4.5 },
    { x: 650, text: 'Hold Action to huff up fury, let go to CHARGE and smash!', show: 4.5 },
    { x: 1300, text: 'Sea lions hop aboard from the floes: drift close by them' },
    { x: 3400, text: 'The rocks! Rise up (Up) to float over a reef. Never charge into one!', show: 5 },
    { x: 6400, text: 'Warm currents melt you. Ride them with Sprint, or sink (Down) under them', show: 5 },
    { x: 9500, text: 'The pier: sink down (Down) to slip under the deck', show: 4.5 },
    { x: 10800, text: 'Tugboats push you back. Huff up and smash them!', show: 4.5 },
    { x: 12400, text: 'Rise up and RAM the Peg before it reaches the harbour!', show: 5 },
  ]);

  const ferg = {
    x: 420, vx: 0, level: 0, mode: 'drift', modeT: 0, fury: 0, launchFury: 0, aim: 1,
    cdx: 1, chargeT: 0, chargeDur: 0, chargeSp: 0, charges: 0, size: 1, riders: 0, riding: false,
    fullSaid: false, bumpCd: 0, pushed: 0, holdT: 0, inWarm: false, inZone: null, blocked: null,
  };
  const fc = art.makeCreature('iceferg', ferg.x, WL);

  const things = THINGS.map((t, i) => ({ ...t, i, hw: t.w ? t.w / 2 : HALF[t.kind], alive: true, pv: 0, rock: 0, t: 0, seed: i * 2.3 }));
  for (const t of things) if (t.kind === 'pier' || t.kind === 'bridge') { t.x += t.w / 2; }
  const tugs = TUGS.map((x, i) => ({ kind: 'tug', x, hw: HALF.tug, vx: -72, alive: true, pv: 0, rock: 0, spin: 0, vy: 0, y: 0, i, pushing: false, t: 0 }));
  if (gentle) tugs[1].alive = false; // softer: one tug fewer

  // The sea lions: on the floes and swimming.
  const lionList = [];
  for (const t of things) {
    if (t.kind !== 'floe') continue;
    for (let k = 0; k < t.lions; k++) lionList.push({ x: t.x + (k ? 56 : -56) * (t.lions > 1 ? 1 : 0), y: WL - 54, floe: t, k });
  }
  for (const x of SWIMMERS) lionList.push({ x, y: WL - 4, swim: true });
  const lions = kit.makePickups(lionList, { radius: 0 });
  const strays = []; // sea lions thrown off, swimming until picked up again: { x, t }
  const riders = []; // the sea lions aboard: { slot, state, t }

  const cruise = gentle ? P.cruiseGentle : P.cruise;
  const steamCdMax = gentle ? P.steamCdGentle : P.steamCd;
  const peg = { x: 2000, vx: 0, sp: cruise + P.scare, nv: 0, steamCd: 1.5, steamT: 0, rock: 0, bumpCd: 0, sink: 0, rot: 0, astern: 0, seenCharge: 0, dodgeAt: -1 };

  let t = 0;
  let outT = 0;
  let captain = null; // the captain in his raft, after the strike
  let bottle = null;
  let sayT = 0;
  const seagulls = [[600, 300], [2200, 260], [3900, 320], [5600, 280], [7900, 250], [10700, 300]].map(([x, y], i) => ({ x, y, seed: i }));

  // ---------- helpers ----------
  function setMode(m, d = 0) { ferg.mode = m; ferg.modeT = d; }
  const drawnW = () => 526 * ferg.size; // the ice's width on screen
  const hullHW = () => drawnW() * 0.42;
  const iceTop = () => WL + levelOff(ferg.level) - F.ice * ferg.size; // world y of the summit
  const sunk = () => ferg.level <= TUNE.sunkLevel;
  const power = () => ferg.launchFury * ferg.size;

  function shake(a) { cam.shake(a, env.reduceMotion); }
  function pop(text, x = ferg.x, y = iceTop() - 30) { parts.pop(x, y, text); }

  function splash(x, n = 10, speed = 320) {
    parts.burst(x, WL + 6, { n, colour: '#f4fbfb', speed, up: 0.85, size: 11, life: 0.6, gravity: 900 });
  }
  function shards(x, y, n = 16) {
    parts.burst(x, y, { n, colour: '#dfe6f7', speed: 420, up: 0.7, size: 10, life: 0.8, gravity: 1100 });
    parts.burst(x, y, { n: Math.round(n / 2), colour: '#b8c6e4', speed: 300, up: 0.7, size: 7, life: 0.7, gravity: 1000 });
  }
  function splinters(x, kind) {
    const colour = kind === 'floe' ? '#e4ecf8' : kind === 'buoy' ? '#d9583f' : '#9c6f3e';
    parts.burst(x, WL - 30, { n: 14, colour, speed: 420, up: 0.75, size: 10, life: 0.9, gravity: 1100 });
    splash(x, 12, 380);
  }

  function lionAboard(from) {
    ferg.riders++;
    riders.push({ slot: (riders.length * 5) % LEDGES.length, state: 'hop', t: 0, fx: from.x, fy: from.y });
    env.sfx('pickup');
    env.sfx('bark');
    parts.pop(ferg.x + (ferg.riders % 3 - 1) * 90, iceTop() - 10, '+1', { size: 40 });
  }

  function lionOff(reason) {
    if (ferg.riders <= 0) return;
    ferg.riders--;
    riders.pop();
    const dir = ferg.cdx > 0 ? -1 : 1; // slides off the back
    const x = ferg.x + dir * (hullHW() + 200);
    parts.ps.push({ x: ferg.x + dir * hullHW() * 0.5, y: iceTop() + 60, vx: dir * 240, vy: -160, t: 0, life: 0.75, gravity: 1100, lion: true, size: 0, colour: '#b07a3a' });
    strays.push({ x: x + dir * 120, t: -0.8 });
    env.sfx('splash');
    if (reason) pop(reason, ferg.x, iceTop() - 40);
  }

  function endCharge(missed) {
    ferg.vx *= 0.3;
    const fury = ferg.launchFury;
    if (missed) {
      env.sfx('splash');
      splash(ferg.x + ferg.cdx * hullHW(), 8, 260);
    }
    if (ferg.mode === 'charge' || ferg.mode === 'windup') setMode('recover', F.recover + F.recoverAdd * fury);
    ferg.fury = 0;
  }

  function bonk(text, cracks = false) {
    env.sfx(cracks ? 'crack' : 'bonk');
    art.kick(fc, 0.45);
    if (cracks) {
      shards(ferg.x + ferg.cdx * hullHW() * 0.6, iceTop() + 120, 22);
      env.vibrate(120);
      shake(14);
      setMode('dazed', F.dazed);
      ferg.cracked = 1.2;
      ferg.fury = 0;
      ferg.vx = -ferg.cdx * 120;
      if (!gentle || ferg.riders > 2) lionOff();
      pop(text);
    } else {
      shake(6);
      env.vibrate(50);
      pop(text);
      if (ferg.mode === 'charge' || ferg.mode === 'windup') endCharge(false);
      else if (ferg.mode === 'huff') { setMode('drift'); ferg.fury = 0; }
    }
    sayT = t;
  }

  function strike() {
    setMode('crash', 99);
    ferg.vx = 0;
    self.done = true;
    self.outcome = 'snatched';
    self.featDone = ferg.riders >= 8;
    pop('SCRUNNCCCHHH!!', (ferg.x + peg.x) / 2, WL - 420);
    env.sfx('crunch');
    env.sfx('splash');
    env.vibrate(260);
    art.kick(fc, 0.6);
    shake(28);
    shards((ferg.x + peg.x) / 2, WL - 120, 30);
    splash(peg.x, 22, 460);
    parts.burst(peg.x, WL - 60, { n: 14, colour: '#9c6f3e', speed: 380, up: 0.8, size: 9, life: 1, gravity: 1100 });
    peg.nv = ferg.cdx * 260;
    peg.rot = 0;
    for (const r of riders) { r.state = 'cling'; r.t = 0; }
  }

  // ---------- the Ice-Ferg ----------
  function stepFerg(dt, inp) {
    const sx = clamp(inp.x || 0, -1, 1), sy = clamp(inp.y || 0, -1, 1);
    if (Math.abs(sx) > 0.3) ferg.aim = Math.sign(sx);
    ferg.modeT -= dt;
    ferg.bumpCd -= dt;
    ferg.cracked = Math.max(0, (ferg.cracked || 0) - dt);
    // Float level: up rises, down sinks, ponderously.
    const wantLevel = Math.abs(sy) > 0.3 ? -Math.sign(sy) : 0;
    ferg.level = ease(ferg.level, wantLevel, F.levelRate, dt);
    // Surface currents, warm and cold.
    const zone = ZONES.find((z) => ferg.x > z.x0 && ferg.x < z.x1) || null;
    ferg.inZone = zone;
    const atSurface = !sunk();
    ferg.inWarm = !!(zone && zone.warm && atSurface);
    if (ferg.inWarm) {
      const was = ferg.size;
      ferg.size = Math.max(F.minSize, ferg.size - (gentle ? F.meltGentle : F.melt) * dt);
      if (was > 0.8 && ferg.size <= 0.8) { pop('Melting!'); env.sfx('drip'); }
      if (Math.random() < dt * 10) parts.ps.push({ x: ferg.x + (Math.random() - 0.5) * drawnW() * 0.8, y: WL - 60 - Math.random() * 180, vx: 0, vy: 120, t: 0, life: 0.5, gravity: 400, size: 5, colour: '#bfe0ee', ink: false });
    } else ferg.size = Math.min(1, ferg.size + F.refreeze * dt);
    const curX = zone && atSurface ? zone.dir * zone.speed : 0;

    let accel = F.accel * (1 + (1 - ferg.size) * 0.8);
    const maxSpeed = F.maxSpeed * (1 + (1 - ferg.size) * 0.6);

    if (ferg.mode === 'recover' || ferg.mode === 'dazed') {
      if (ferg.modeT <= 0) setMode('drift');
      else accel *= 0.15;
    }
    if (ferg.mode === 'drift' && inp.action) {
      setMode('huff');
      env.sfx('creak');
      art.kick(fc, -0.25);
      ferg.fullSaid = false;
      ferg.holdT = 0;
    }
    if (ferg.mode === 'huff') {
      ferg.fury = Math.min(1, ferg.fury + dt / (gentle ? F.furyTimeGentle : F.furyTime));
      ferg.holdT += dt;
      accel *= F.huffAccelK;
      if (ferg.fury >= 1 && !ferg.fullSaid) {
        ferg.fullSaid = true;
        pop('Full fury!');
        env.sfx('creak'); env.vibrate(40);
        art.kick(fc, 0.3);
      }
      if (Math.random() < dt * 26) {
        const side = Math.random() < 0.5 ? -1 : 1;
        parts.ps.push({ x: ferg.x + side * drawnW() * (0.2 + Math.random() * 0.35), y: iceTop() + 40 + Math.random() * 200, vx: side * (40 + Math.random() * 60), vy: -30 - Math.random() * 40, t: 0, life: 1.1, gravity: -40, mist: true, size: 16 + Math.random() * 22, colour: '#eef6ff', ink: false });
      }
      if (!inp.action) {
        if (ferg.fury < F.minFury) { setMode('drift'); ferg.fury = 0; env.sfx('steam'); }
        else {
          ferg.launchFury = ferg.fury;
          ferg.cdx = ferg.aim;
          ferg.chargeSp = (F.chargeMin + F.chargeAdd * ferg.fury) * (1 + (1 - ferg.size) * 0.5);
          ferg.chargeDur = F.chargeDur + F.chargeDurAdd * ferg.fury;
          ferg.chargeT = 0;
          ferg.charges++;
          setMode('windup', F.windup);
          env.sfx('creak');
          art.kick(fc, 0.4);
          fc.facing = ferg.cdx;
        }
      }
    }
    if (ferg.mode === 'windup') {
      ferg.vx *= Math.exp(-6 * dt);
      ferg.x += (ferg.vx + curX * 0.3) * dt - ferg.cdx * 50 * dt;
      if (ferg.modeT <= 0) {
        setMode('charge', ferg.chargeDur);
        env.sfx('whoosh');
        env.vibrate(50);
        art.kick(fc, -0.5);
        shake(8 * ferg.launchFury);
        splash(ferg.x - ferg.cdx * hullHW(), 10, 300);
      }
    }
    if (ferg.mode === 'charge') {
      ferg.chargeT += dt;
      const p = clamp(ferg.chargeT / ferg.chargeDur, 0, 1);
      ferg.vx = ferg.cdx * ferg.chargeSp * (1 - 0.5 * p * p);
      ferg.x += ferg.vx * dt;
      if (Math.random() < dt * 30) splash(ferg.x + ferg.cdx * hullHW() * 0.9, 2, 220);
      if (p >= 1) endCharge(true);
    } else if (ferg.mode !== 'crash' && ferg.mode !== 'windup') {
      ferg.riding = !!(inp.sprint && zone && atSurface && ferg.mode === 'drift' && (sx === 0 || Math.sign(sx) === zone.dir));
      ferg.vx += sx * accel * dt;
      if (ferg.pushed > 0) ferg.vx -= 420 * dt; // a tugboat shoving it back
      ferg.vx *= Math.exp(-F.drag * dt);
      ferg.vx = clamp(ferg.vx, -maxSpeed, maxSpeed);
      ferg.x += (ferg.vx + curX * (ferg.riding ? F.rideK : 0.45)) * dt;
      if (ferg.riding && Math.random() < dt * 8) splash(ferg.x - zone.dir * hullHW(), 2, 200);
    }
    ferg.pushed = Math.max(0, ferg.pushed - dt);
    // The world's ends and the harbour shallows.
    const hw = hullHW();
    if (ferg.x < hw + 20) { ferg.x = hw + 20; if (ferg.vx < 0) ferg.vx = 0; }
    const shallow = HARBOUR_X - 80;
    if (ferg.x > shallow - hw) {
      ferg.x = shallow - hw;
      if (ferg.vx > 0) ferg.vx *= -0.3;
      if (ferg.mode === 'charge') { endCharge(false); bonk('Too shallow!'); }
    }
    if (ferg.mode !== 'charge' && ferg.mode !== 'crash' && ferg.mode !== 'windup' && Math.abs(ferg.vx) > 30) fc.facing = Math.sign(ferg.vx);
    if (ferg.mode === 'huff') fc.facing = ferg.aim;
  }

  // The reefs and the overhead things: block the ice that is at the wrong
  // float level; a charge into them bonks (a reef cracks it).
  function collideSolids() {
    ferg.blocked = null;
    const hw = hullHW() * 0.75;
    for (const th of things) {
      if (!(th.kind === 'reef' || th.kind === 'pier' || th.kind === 'bridge')) continue;
      const span = th.kind === 'reef' ? th.hw * 0.7 : th.hw;
      if (ferg.x + hw <= th.x - span || ferg.x - hw >= th.x + span) continue;
      let blocks;
      if (th.kind === 'reef') blocks = ferg.level < TUNE.reefLevel;
      else blocks = iceTop() < WL - OVERHEAD[th.kind];
      if (!blocks) continue;
      ferg.blocked = th;
      // Push out the way it came.
      const fromLeft = ferg.x < th.x;
      ferg.x = fromLeft ? th.x - span - hw - 1 : th.x + span + hw + 1;
      const fast = Math.abs(ferg.vx) > 120;
      if (ferg.mode === 'charge' || ferg.mode === 'windup') {
        ferg.cdx = fromLeft ? 1 : -1;
        if (th.kind === 'reef') bonk('CRACK!', true);
        else bonk('Bonk!');
      } else if (fast && ferg.bumpCd <= 0) {
        ferg.bumpCd = 0.8;
        bonk(th.kind === 'reef' ? 'Rise up!' : 'Sink down!');
        if (th.kind === 'reef' && Math.abs(ferg.vx) > 200) ferg.cracked = 0.6;
      }
      if (ferg.bumpCd <= 0 && !fast && t - sayT > 2.5) { sayT = t; hints.say(th.kind === 'reef' ? 'A reef: rise up (Up) to float over it' : 'Sink down (Down) to slip under', 2.5); }
      ferg.vx = fromLeft ? Math.min(ferg.vx, -Math.abs(ferg.vx) * 0.3) : Math.max(ferg.vx, Math.abs(ferg.vx) * 0.3);
    }
  }

  // The floating things: smashed by a charge, pushed by a drift.
  function stepThings(dt) {
    const hw = hullHW();
    const all = things.concat(tugs);
    for (const th of all) {
      th.t += dt;
      if (!th.alive) {
        if (th.kind === 'tug' && th.spin) { th.x += th.pv * dt; th.y += th.vy * dt; th.vy += 900 * dt; th.spin += dt * 9; if (th.y > 240) { th.spin = 0; splash(th.x, 12, 300); } }
        continue;
      }
      if (th.kind === 'reef' || th.kind === 'pier' || th.kind === 'bridge') continue;
      th.rock = Math.max(0, th.rock - dt);
      if (th.kind === 'tug') {
        th.pushing = false;
        if (cam.sees(th.x, th.x, 300) || th.x < ferg.x + 1400) th.x += th.vx * dt;
        if (th.x < 60) { th.alive = false; continue; }
      } else {
        th.x += th.pv * dt; th.pv *= Math.exp(-2.5 * dt);
      }
      const sunkUnder = sunk() && th.kind !== 'buoy';
      if (sunkUnder) continue; // slips under the floating things
      const touching = Math.abs(th.x - ferg.x) < hw + th.hw;
      if (!touching) continue;
      const toward = Math.sign(th.x - ferg.x) || 1;
      if (ferg.mode === 'charge' && Math.abs(ferg.vx) >= TUNE.hitSpeed * 0.6 && Math.sign(ferg.vx) === toward) {
        if (power() >= NEED[th.kind]) {
          th.alive = false;
          th.diedAt = t;
          splinters(th.x, th.kind);
          env.sfx(th.kind === 'floe' ? 'crack' : 'crunch');
          env.vibrate(70);
          shake(th.kind === 'tug' ? 12 : 7);
          pop(th.kind === 'tug' ? 'SMASH!' : th.kind === 'floe' ? 'Crack!' : 'Smash!', th.x, WL - 150);
          if (th.kind === 'tug') { th.spin = 0.01; th.pv = toward * 520; th.vy = -620; th.y = 0; env.sfx('splash'); }
          if (th.kind === 'floe') { // its sea lions hop aboard with the spray
            for (const l of lions.items) if (!l.got && l.floe === th) { l.got = true; l.t = 0; lionAboard(l); }
          }
          for (const r of riders) { r.state = 'up'; r.t = 0; }
        } else {
          th.pv = toward * 240; th.rock = 1;
          bonk('Bump!');
          if (t - sayT > 2) hints.say('Huff up more fury to smash that!', 2.5);
        }
        continue;
      }
      // A drift into it: it is shoved along; the ice slows.
      if (th.kind === 'tug') {
        th.x = ferg.x + toward * (hw + th.hw);
        if (toward > 0) { ferg.pushed = 0.2; th.pushing = true; if (ferg.mode === 'charge') endCharge(false); if (ferg.bumpCd <= 0) { ferg.bumpCd = 2.5; pop('Pushed back!'); env.sfx('tug'); hints.say('Huff up and smash the tugboat!', 2.5); } }
        else th.x = ferg.x - hw - th.hw;
      } else if (th.kind === 'buoy') {
        ferg.x = th.x - toward * (hw + th.hw + 1);
        if (Math.abs(ferg.vx) > 60 && ferg.bumpCd <= 0) { ferg.bumpCd = 0.8; th.rock = 1; pop('Bump!', th.x, WL - 130); env.sfx('bonk'); }
        ferg.vx *= 0.2;
      } else {
        th.x = ferg.x + toward * (hw + th.hw);
        th.pv = ferg.vx;
        if (Math.sign(ferg.vx) === toward) ferg.vx *= Math.exp(-2.5 * dt);
        th.rock = Math.max(th.rock, 0.5);
      }
    }
  }

  // ---------- the sea lions ----------
  function stepLions(dt) {
    const hw = hullHW();
    for (const l of lions.items) {
      if (l.got) { l.t += dt; continue; }
      if (l.floe) {
        if (l.floe.alive) l.x = l.floe.x + (l.floe.lions > 1 ? (l.k ? 56 : -56) : 0);
        else { l.y = WL - 4; l.floe = null; l.swim = true; } // its floe smashed from under it
      }
      if (!sunk() && Math.abs(l.x - ferg.x) < hw + (l.floe ? 170 : 70)) { l.got = true; l.t = 0; lionAboard(l); } // from a floe pushed along at the bow, too
    }
    for (let i = strays.length - 1; i >= 0; i--) {
      const s = strays[i];
      s.t += dt;
      if (s.t > 0 && !sunk() && Math.abs(s.x - ferg.x) < hw + 60) { strays.splice(i, 1); lionAboard(s); }
    }
    for (const r of riders) {
      r.t += dt;
      const m = ferg.mode;
      const want = m === 'huff' || m === 'windup' ? 'up' : m === 'charge' ? 'cling' : m === 'dazed' ? 'cling' : m === 'crash' ? 'cling' : 'doze';
      if (r.state === 'hop' && r.t > 0.5) { r.state = want; r.t = 0; }
      else if (r.state !== 'hop' && r.state !== want && (r.t > 0.6 || want !== 'doze')) { r.state = want; r.t = 0; }
    }
  }

  // ---------- the Peg ----------
  function stepPeg(dt) {
    peg.steamCd -= dt;
    peg.steamT -= dt;
    peg.bumpCd -= dt;
    peg.rock += dt;
    const gap = peg.x - ferg.x;
    const behind = gap > 0;
    // The captain sees a huff or a charge coming up behind: a burst of steam.
    const threat = behind && gap < P.see && ((ferg.mode === 'huff' && ferg.fury > 0.3) || ferg.mode === 'windup' || ferg.mode === 'charge') && !sunk();
    if (threat && peg.steamCd <= 0) {
      const p = ferg.mode === 'huff' ? dt * (0.6 + env.skill * 1.6) * (0.3 + ferg.fury) : 0.4 + 0.5 * env.skill;
      if (ferg.mode !== 'huff' && peg.seenCharge === ferg.charges) { /* already decided on this charge */ } else if (rng() < p) {
        if (ferg.mode !== 'huff') peg.seenCharge = ferg.charges;
        peg.nv += P.steam;
        peg.steamCd = steamCdMax;
        peg.steamT = 0.8;
        env.sfx('steam');
        if (rng() < 0.5) env.sfx('horn');
        for (let i = 0; i < 7; i++) parts.ps.push({ x: peg.x - 34, y: WL - 225, vx: -60 - Math.random() * 80, vy: -70 - Math.random() * 60, t: 0, life: 1.3, gravity: -30, mist: true, size: 18 + Math.random() * 16, colour: '#f3eee8', ink: false });
      }
    }
    // Ahead of the Peg and not sunk: it goes astern, wary, unless it can slip over a sunk berg.
    let target = (cruise + P.scare * Math.exp(-t / P.scareT)) * (peg.x > HARBOUR_X - 1100 ? P.dash : 1);
    if (!behind && !sunk()) {
      const calm = ferg.mode === 'recover' || ferg.mode === 'dazed';
      if (calm) target = cruise * 1.6; // sneak past while it is dazed
      else if (gap > -(hullHW() + 360)) target = 0; // holds off, wary
      else if (gap > -(hullHW() + 900)) target = 25;
    }
    peg.sp = ease(peg.sp, target, 2.5, dt);
    peg.nv *= Math.exp(-P.steamDecay * dt);
    peg.vx = peg.sp + peg.nv;
    peg.x += peg.vx * dt;
    peg.x = clamp(peg.x, 300, HARBOUR_X + 420);
    if (peg.steamT > 0 || Math.random() < dt * 2.5) parts.ps.push({ x: peg.x - 32, y: WL - 228, vx: -40 - Math.random() * 30, vy: -50 - Math.random() * 30, t: 0, life: 1.1, gravity: -20, mist: true, size: 12 + Math.random() * 10, colour: '#f3eee8', ink: false });
    // Ice meets boat.
    const hw = hullHW();
    if (Math.abs(peg.x - ferg.x) < hw + 110 && !sunk()) {
      const toward = Math.sign(peg.x - ferg.x) || 1;
      if (ferg.mode === 'charge' && Math.abs(ferg.vx) >= TUNE.hitSpeed && Math.sign(ferg.vx) === toward) strike();
      else {
        // Nudge it clear, forward if the ice rose up right under it.
        if (Math.abs(peg.x - ferg.x) < hw * 0.6) { peg.nv = Math.max(peg.nv, 220); ferg.level = Math.min(ferg.level, -0.5); }
        else peg.x = ferg.x + toward * (hw + 110);
        if (peg.bumpCd <= 0) {
          peg.bumpCd = 0.8;
          peg.nv += toward * 140;
          ferg.vx *= 0.4;
          env.sfx('thump');
          pop('Bump!', peg.x, WL - 240);
          art.kick(fc, 0.2);
          if (ferg.mode === 'charge') endCharge(false);
          if (t - sayT > 2) { sayT = t; hints.say('A charge sinks it: huff up, then let go!', 2.5); }
        }
      }
    } else if (ferg.mode === 'charge' && sunk() && Math.abs(peg.x - ferg.x) < hw && !ferg.slipSaid) {
      ferg.slipSaid = true;
      pop('Slipped under!', peg.x, WL - 240);
    }
    if (ferg.mode !== 'charge') ferg.slipSaid = false;
  }

  // ---------- the board ----------
  const self = {
    time: total,
    done: false,
    outcome: null,
    outroTime: 2.8,
    featDone: false,
    ferg, peg, things, tugs, lions, strays, riders, fc, cam, TUNE, ZONES, hints,
    focus: () => [{ x: ferg.x - cam.x, y: iceTop() + 160 }],
    update(dt, inS) {
      t += dt;
      parts.update(dt);
      if (self.done) { outro(dt); animFerg(dt); cam.follow(ferg.x, 0, dt); return; }
      self.time = Math.max(0, self.time - dt);
      stepFerg(dt, inS || {});
      collideSolids();
      stepThings(dt);
      stepLions(dt);
      stepPeg(dt);
      const before = cps.last;
      cps.reach(ferg.x);
      if (cps.last !== before) { env.sfx('checkpoint'); }
      hints.update(dt, ferg.x);
      if (!self.done && peg.x >= HARBOUR_X) {
        self.done = true;
        self.outcome = 'kept';
        env.sfx('horn');
        env.sfx('cheer');
        pop('Safe in the harbour!', peg.x, WL - 260);
      } else if (!self.done && self.time <= 0) {
        self.done = true;
        self.outcome = 'kept';
        env.sfx('horn');
      }
      animFerg(dt);
      cam.follow(ferg.x, ferg.vx, dt, t < 0.1);
    },
    draw(g, tt) {
      const panels = ['adv/b04/backdrop-1', 'adv/b04/backdrop-2', 'adv/b04/backdrop-3'];
      if (panels.every((k) => art.image(k))) kit.drawBackdrop(g, cam, { panels });
      else drawSkyAndFarSea(g, tt);
      kit.haze(g, 'rgba(236,228,214,0.12)');
      cam.begin(g);
      drawFar(g, tt);
      drawSeaBody(g, tt);
      drawWaves(g, tt, true);
      for (const th of things) if (th.kind === 'reef' && cam.sees(th.x - 200, th.x + 200)) drawReef(g, th, tt);
      for (const th of things) if (th.alive && th.kind !== 'reef' && th.kind !== 'pier' && th.kind !== 'bridge' && cam.sees(th.x - 200, th.x + 200)) drawThing(g, th, tt);
      drawLionsAtSea(g, tt);
      drawPeg(g, tt);
      for (const tg of tugs) if ((tg.alive || tg.spin) && cam.sees(tg.x - 200, tg.x + 200)) drawTug(g, tg, tt);
      if (captain) drawCaptain(g, tt);
      drawFerg(g, tt);
      drawWash(g, tt);
      drawZones(g, tt);
      drawWaves(g, tt, false);
      for (const th of things) if ((th.kind === 'pier' || th.kind === 'bridge') && cam.sees(th.x - th.hw - 100, th.x + th.hw + 100)) drawOverhead(g, th, tt);
      drawHarbourWall(g, tt);
      parts.draw(g);
      drawLionParts(g);
      if (bottle) kit.sprite(g, 'props.typhoonigator', 1, bottle.x, bottle.y, { height: 70, ay: 0.7, rot: bottle.rot }, (gg, x, y) => { gg.fillStyle = '#5f8a4a'; gg.strokeStyle = '#2b1d14'; gg.lineWidth = 3; gg.beginPath(); gg.ellipse(x, y, 14, 30, bottle.rot, 0, Math.PI * 2); gg.fill(); gg.stroke(); });
      if (!self.done) { drawMeter(g); drawPrompts(g, tt); }
      cam.end(g);
      kit.route(g, { you: ferg.x / WORLD, letter: Math.min(1, peg.x / WORLD), signs: cps.fracs(WORLD) });
      hints.draw(g);
    },
    marks() {
      return kit.boardMarks({ snatched: self.outcome === 'snatched', got: lions.count, total: lions.total, feat: self.featDone });
    },
    hud() { return `Sea lions aboard ${ferg.riders} · found ${lions.count}/${lions.total}`; },
  };

  function animFerg(dt) {
    const m = ferg.mode;
    if (m === 'huff' || m === 'windup') art.setAnim(fc, 'huff');
    else if (m === 'charge') art.setAnim(fc, 'chargeSide');
    else if (m === 'crash') art.setAnim(fc, self.done && outT > 0.9 ? 'celebrate' : 'crash');
    else if (m === 'dazed' && ferg.cracked > 0) art.setAnim(fc, 'cracked');
    else if (m === 'recover' || m === 'dazed') art.setAnim(fc, 'dazed');
    else if (ferg.size < 0.8) art.setAnim(fc, 'melted');
    else if (ferg.level > 0.5) art.setAnim(fc, 'risen');
    else if (ferg.level < -0.5) art.setAnim(fc, 'sunk');
    else art.setAnim(fc, 'side');
    const f = fc.facing;
    art.animate(fc, dt, 0, 0);
    fc.facing = f;
    fc.lean = 0;
    fc.rot = m === 'charge' ? ferg.cdx * 0.05 : m === 'windup' ? -ferg.cdx * 0.04 : 0;
    fc.sizeK = ferg.size * (1 + (m === 'huff' ? 0.06 * ferg.fury : 0));
    fc.x = ferg.x;
  }

  function outro(dt) {
    outT += dt;
    if (self.outcome === 'snatched') {
      peg.sink = Math.min(1, outT / 3);
      peg.rot = Math.min(0.55, outT * 0.35);
      peg.x += peg.nv * dt; peg.nv *= Math.exp(-3 * dt);
      if (Math.random() < dt * 10 && peg.sink < 1) parts.ps.push({ x: peg.x + (Math.random() - 0.5) * 120, y: WL + 10, vx: 0, vy: -40, t: 0, life: 0.7, gravity: 0, size: 5 + Math.random() * 6, colour: '#f4fbfb' });
      if (outT > 0.8 && !captain) {
        const dir = ferg.cdx || 1;
        captain = { x: peg.x + dir * 150, y: WL, vx: dir * 50, t: 0 };
        splash(captain.x, 8, 220);
      }
      if (captain) { captain.t += dt; captain.x += captain.vx * dt; }
      if (outT > 1.5 && !bottle) {
        const dir = ferg.cdx || 1;
        bottle = { x: captain.x + dir * 20, y: WL - 150, vx: dir * 170, vy: -300, rot: 0 };
        env.sfx('tinkle');
        pop('A bottle!', bottle.x, bottle.y - 60);
      }
      if (bottle) {
        bottle.x += bottle.vx * dt; bottle.y += bottle.vy * dt; bottle.vy += 500 * dt; bottle.rot += dt * 4;
        if (bottle.y > WL - 10) { bottle.y = WL - 10; bottle.vy = 0; bottle.vx *= 0.9; bottle.rot = Math.sin(outT * 3) * 0.3; }
      }
      if (outT > 0.9) for (const r of riders) if (r.state !== 'up') { r.state = 'up'; r.t = 0; }
    } else {
      // The Peg chugs into the harbour; the Ice-Ferg sulks.
      peg.sp = ease(peg.sp, 60, 2, dt);
      peg.x += peg.sp * dt;
      peg.rock += dt;
      if (Math.random() < dt * 3) parts.ps.push({ x: peg.x - 32, y: WL - 228, vx: -40, vy: -60, t: 0, life: 1.2, gravity: -20, mist: true, size: 14, colour: '#f3eee8', ink: false });
      setMode('dazed', 99);
      ferg.x += ferg.vx * dt;
      ferg.vx *= Math.exp(-2 * dt);
    }
  }

  // ---------- drawing ----------
  const INK = '#2b3340';
  const SEA = '#507d94', SEA_DEEP = '#3a6176';

  // Until the backdrop panels arrive: the sky and the far sea composed from
  // crops of the delivered sea painting (its open water and its skyline, not
  // its harbour, which is the goal and must not repeat), in slow parallax.
  function drawSkyAndFarSea(g, tt) {
    const img = art.image('scenes/iceferg');
    const gr = g.createLinearGradient(0, 0, 0, WL);
    gr.addColorStop(0, '#d8c3d6'); gr.addColorStop(0.45, '#e9d6cf'); gr.addColorStop(1, '#c9d2cf');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    if (!img) return;
    const kx = img.width / W, ky = img.height / H;
    // The painting's clouds, stretched over the top of the frame.
    g.drawImage(img, 0, 0, 1100 * kx, 40 * ky, 0, 0, W, 170);
    // The skyline: hills and clouds, tiled and mirrored, very slow.
    const skyH = 150, skyW = 1100;
    let off = cam.x * 0.08;
    for (let i = Math.floor(off / skyW); i * skyW - off < W; i++) {
      const x = i * skyW - off;
      g.save();
      if (i % 2) { g.translate(x + skyW, 0); g.scale(-1, 1); g.drawImage(img, 0, 0, skyW * kx, skyH * ky, 0, 150, skyW, skyH); }
      else g.drawImage(img, 0, 0, skyW * kx, skyH * ky, x, 150, skyW, skyH);
      g.restore();
    }
    // The far sea: the painting's open water, from the horizon down to the waterline.
    const seaW = 1150, sy0 = 250, sh = 400;
    off = cam.x * 0.25;
    for (let i = Math.floor(off / seaW); i * seaW - off < W; i++) {
      const x = i * seaW - off;
      g.save();
      if (i % 2) { g.translate(x + seaW, 0); g.scale(-1, 1); g.drawImage(img, 350 * kx, sy0 * ky, seaW * kx, sh * ky, 0, 300, seaW, WL - 300 + 20); }
      else g.drawImage(img, 350 * kx, sy0 * ky, seaW * kx, sh * ky, x, 300, seaW, WL - 300 + 20);
      g.restore();
    }
    // A pale haze band along the horizon, so the far sea sits back.
    const hz = g.createLinearGradient(0, 290, 0, 420);
    hz.addColorStop(0, 'rgba(233,214,207,0.9)'); hz.addColorStop(1, 'rgba(233,214,207,0)');
    g.fillStyle = hz;
    g.fillRect(0, 290, W, 130);
  }

  // Pen hatching inside a box: the book shades everything with it.
  function hatch(gg, x, y, w, h, { step = 9, alpha = 0.35, colour = '43,29,20', slant = 0.6 } = {}) {
    gg.save();
    gg.beginPath(); gg.rect(x, y, w, h); gg.clip();
    gg.strokeStyle = `rgba(${colour},${alpha})`;
    gg.lineWidth = 1.4;
    gg.beginPath();
    for (let xx = x - h * slant; xx < x + w; xx += step) { gg.moveTo(xx, y + h); gg.lineTo(xx + h * slant, y); }
    gg.stroke();
    gg.restore();
  }

  function drawFar(g, tt) {
    g.save();
    // Seagulls, far up.
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (const s of seagulls) {
      const x = s.x + Math.sin(tt * 0.3 + s.seed) * 60, y = s.y + Math.sin(tt * 0.7 + s.seed * 2) * 14;
      if (!cam.sees(x)) continue;
      kit.sprite(g, 'adv.b04.props', 9, x, y, { height: 40 }, (gg, xx, yy) => {
        const f = Math.sin(tt * 6 + s.seed) * 8;
        gg.beginPath(); gg.moveTo(xx - 22, yy + f); gg.quadraticCurveTo(xx - 10, yy - 8, xx, yy); gg.quadraticCurveTo(xx + 10, yy - 8, xx + 22, yy + f); gg.stroke();
      });
    }
    g.restore();
  }

  // The body of the sea from the waterline down, behind everything in the water.
  function drawSeaBody(g, tt) {
    const x0 = cam.x - 40, x1 = cam.x + W + 40;
    g.save();
    g.fillStyle = SEA;
    g.fillRect(x0, WL - 4, x1 - x0, H - WL + 60);
    const img = art.image('scenes/iceferg');
    if (img) {
      // The painting's open water, as the body of the sea under the waterline.
      const kx = img.width / W, ky = img.height / H;
      const tw2 = 1150, th = 300;
      g.globalAlpha = 0.9;
      for (let i = Math.floor(x0 / tw2); i * tw2 < x1; i++) {
        const x = i * tw2;
        g.save();
        if (i % 2) { g.translate(x + tw2, 0); g.scale(-1, 1); g.drawImage(img, 350 * kx, 420 * ky, tw2 * kx, 330 * ky, 0, WL - 4, tw2, th); }
        else g.drawImage(img, 350 * kx, 420 * ky, tw2 * kx, 330 * ky, x, WL - 4, tw2, th);
        g.restore();
      }
      g.globalAlpha = 1;
      const deep = g.createLinearGradient(0, WL + 120, 0, WL + th);
      deep.addColorStop(0, 'rgba(58,97,118,0)'); deep.addColorStop(1, SEA_DEEP);
      g.fillStyle = deep;
      g.fillRect(x0, WL + 120, x1 - x0, th - 120);
      g.fillStyle = SEA_DEEP;
      g.fillRect(x0, WL + th - 1, x1 - x0, H - WL);
    }
    // The ground strip from the sea sheet, tiled, or ink hatching along the swell.
    const tw = 640;
    for (let i = Math.floor(x0 / tw); i * tw < x1; i++) {
      const x = i * tw;
      kit.sprite(g, 'terrain.sea', 1, x, WL - 6, { height: 160, ax: 0, ay: 0, flip: i % 2 === 1 }, (gg, xx, yy) => {
        gg.strokeStyle = 'rgba(43,51,64,0.28)';
        gg.lineWidth = 2;
        gg.beginPath();
        for (let r = 0; r < 10; r++) {
          const y = yy + 26 + r * 46 + hash(i * 7 + r) * 10;
          for (let s = 0; s < tw; s += 80) {
            const ph = Math.sin(tt * 1.3 + (xx + s) * 0.01 + r) * 4;
            gg.moveTo(xx + s + 6, y + ph); gg.quadraticCurveTo(xx + s + 30, y - 8 + ph, xx + s + 62, y + ph);
          }
        }
        gg.stroke();
      });
    }
    g.restore();
  }

  // The book's curling waves along the waterline, behind (back) and in front:
  // a wavy band with hooked crests, ink lines and foam, drifting along.
  function drawWaves(g, tt, back) {
    const x0 = cam.x - 80, x1 = cam.x + W + 80;
    const step = back ? 130 : 170;
    const base = WL + (back ? -3 : 7);
    const amp = back ? 9 : 14;
    const drift = tt * (back ? 40 : 26);
    const yAt = (x) => base - Math.abs(Math.sin((x + drift) / step * Math.PI)) * amp + Math.sin((x - drift * 0.6) * 0.021) * 3;
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // The band of water, a little paler than the sea behind it.
    g.fillStyle = back ? '#6d97aa' : '#5a89a0';
    g.strokeStyle = INK;
    g.lineWidth = back ? 2.5 : 3.5;
    g.beginPath();
    g.moveTo(x0, base + 40);
    for (let x = x0; x <= x1; x += 12) g.lineTo(x, yAt(x));
    g.lineTo(x1, base + 40);
    g.closePath();
    g.fill();
    g.beginPath();
    for (let x = x0; x <= x1; x += 12) { if (x === x0) g.moveTo(x, yAt(x)); else g.lineTo(x, yAt(x)); }
    g.stroke();
    // Hooked crests at each peak, with foam, and hatching down the face.
    const first = Math.floor((x0 + drift) / step) * step - drift;
    for (let x = first; x < x1; x += step) {
      const seed = hash(Math.round((x + drift) / step) * 1.7 + (back ? 1 : 2));
      const px = x + step * 0.5, py = yAt(px);
      const r = (back ? 9 : 13) + seed * 5;
      g.lineWidth = back ? 2.5 : 3.5;
      g.strokeStyle = INK;
      g.beginPath();
      g.arc(px - r * 0.3, py + r * 0.2, r, Math.PI * 1.1, Math.PI * 2.35);
      g.stroke();
      g.fillStyle = '#f4fbfb';
      g.beginPath();
      g.arc(px - r * 0.3, py - r * 0.5, r * 0.55, 0, Math.PI * 2);
      g.arc(px + r * 0.5, py - r * 0.1, r * 0.35, 0, Math.PI * 2);
      g.arc(px - r * 1.1, py + r * 0.1, r * 0.3, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(43,51,64,0.45)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let k = 1; k <= 3; k++) { const hx = px - step * 0.5 + k * step * 0.14; g.moveTo(hx, yAt(hx) + 4); g.lineTo(hx - 8, yAt(hx) + 18 + k * 2); }
      g.stroke();
    }
    g.restore();
  }

  // The translucent water in front of everything that sits in it.
  function drawWash(g, tt) {
    const x0 = cam.x - 40, x1 = cam.x + W + 40;
    g.save();
    g.fillStyle = 'rgba(70,118,142,0.5)';
    g.fillRect(x0, WL + 8, x1 - x0, H - WL + 60);
    const gr = g.createLinearGradient(0, WL + 8, 0, WL + 300);
    gr.addColorStop(0, 'rgba(60,100,125,0)'); gr.addColorStop(1, 'rgba(46,78,100,0.85)');
    g.fillStyle = gr;
    g.fillRect(x0, WL + 8, x1 - x0, 292);
    g.fillStyle = '#2f5268';
    g.fillRect(x0, WL + 300, x1 - x0, H - WL);
    // Shafts of light slanting down through the water.
    g.fillStyle = 'rgba(220,240,245,0.07)';
    for (let x = Math.floor(x0 / 420) * 420; x < x1; x += 420) {
      const sw = 60 + hash(x * 0.01) * 50, lean = 90 + Math.sin(tt * 0.3 + x * 0.003) * 20;
      g.beginPath(); g.moveTo(x, WL + 10); g.lineTo(x + sw, WL + 10); g.lineTo(x + sw + lean * 1.6, H); g.lineTo(x + lean * 1.6 - sw * 0.6, H); g.closePath(); g.fill();
    }
    // Long ink swells in the deep, and a few drifting bubbles of light.
    g.strokeStyle = 'rgba(20,35,50,0.35)';
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.beginPath();
    for (let r = 0; r < 8; r++) {
      const y = WL + 330 + r * 52;
      for (let x = Math.floor(x0 / 140) * 140 + (r % 2) * 70; x < x1; x += 140) {
        const ph = Math.sin(tt * 0.9 + x * 0.007 + r) * 5;
        g.moveTo(x, y + ph); g.quadraticCurveTo(x + 40, y - 10 + ph, x + 96, y + ph);
      }
    }
    g.stroke();
    g.strokeStyle = 'rgba(200,225,235,0.18)';
    g.lineWidth = 2;
    g.beginPath();
    for (let r = 0; r < 6; r++) {
      const y = WL + 360 + r * 60;
      for (let x = Math.floor(x0 / 220) * 220 + r * 37; x < x1; x += 220) { g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 8, x + 70, y); }
    }
    g.stroke();
    g.restore();
  }

  function drawZones(g, tt) {
    for (const z of ZONES) {
      if (!cam.sees(z.x0, z.x1)) continue;
      g.save();
      g.lineCap = 'round';
      // Warm water: a rosy wash and streaks; cold: foam streaks.
      if (z.warm) {
        g.fillStyle = 'rgba(232,150,110,0.22)';
        g.fillRect(z.x0, WL - 6, z.x1 - z.x0, 150);
      }
      const n = Math.floor((z.x1 - z.x0) / 110);
      for (let i = 0; i < n; i++) {
        const ph = ((tt * z.speed * 0.9) / (z.x1 - z.x0) * z.dir + i / n + i * 0.037) % 1;
        const p = ph < 0 ? ph + 1 : ph;
        const x = z.x0 + (z.x1 - z.x0) * p;
        const y = WL + 20 + ((i * 37) % 5) * 16;
        const a = Math.sin(p * Math.PI);
        kit.sprite(g, 'adv.b04.props', 11, x, y, { height: 30, ay: 0.5, alpha: a, flip: z.dir < 0 }, (gg, xx, yy) => {
          gg.globalAlpha = a * (z.warm ? 0.8 : 0.6);
          gg.strokeStyle = z.warm ? '#e07a52' : '#f4fbfb';
          gg.lineWidth = z.warm ? 5 : 4;
          gg.beginPath();
          gg.moveTo(xx - z.dir * 40, yy);
          gg.quadraticCurveTo(xx - z.dir * 15, yy - 8, xx, yy);
          gg.quadraticCurveTo(xx + z.dir * 15, yy + 8, xx + z.dir * 36, yy);
          gg.stroke();
          gg.beginPath(); gg.moveTo(xx + z.dir * 36, yy); gg.lineTo(xx + z.dir * 22, yy - 9); gg.moveTo(xx + z.dir * 36, yy); gg.lineTo(xx + z.dir * 22, yy + 9); gg.stroke();
          gg.globalAlpha = 1;
        });
      }
      // Warm water steams a little.
      if (z.warm) {
        g.strokeStyle = 'rgba(255,240,230,0.5)';
        g.lineWidth = 3;
        g.beginPath();
        for (let x = z.x0 + 40; x < z.x1; x += 160) {
          const w = Math.sin(tt * 2 + x * 0.01) * 8;
          g.moveTo(x, WL - 10); g.quadraticCurveTo(x + w, WL - 40, x - w, WL - 70);
        }
        g.stroke();
      }
      g.restore();
    }
  }

  function drawReef(g, th, tt) {
    const bob = 0;
    kit.sprite(g, 'terrain.sea', 2, th.x, WL + 64 + bob, { height: 200 }, (gg, x, y) => {
      // The delivered jagged brown rock stands in until the sea rock arrives.
      if (art.drawSprite(gg, art.prop('yalapappus', 2), x, y, { height: 200 })) return;
      gg.fillStyle = '#6e6258'; gg.strokeStyle = INK; gg.lineWidth = 4;
      gg.beginPath(); gg.moveTo(x - 90, y); gg.lineTo(x - 60, y - 80); gg.lineTo(x - 20, y - 50); gg.lineTo(x + 10, y - 115); gg.lineTo(x + 45, y - 60); gg.lineTo(x + 90, y); gg.closePath(); gg.fill(); gg.stroke();
    });
    // Foam breaking round it.
    g.save();
    g.fillStyle = '#f4fbfb';
    g.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) {
      const x = th.x - 90 + i * 45 + Math.sin(tt * 3 + i) * 6;
      g.beginPath(); g.ellipse(x, WL + 2, 18, 6, 0, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  function drawThing(g, th, tt) {
    const rock = Math.sin(tt * 9 + th.seed) * 0.2 * th.rock + Math.sin(tt * 1.7 + th.seed) * 0.04;
    const bob = Math.sin(tt * 2.2 + th.seed) * 4;
    const y = WL + bob;
    if (th.kind === 'floe') {
      kit.sprite(g, 'terrain.sea', 5, th.x, y + 34, { height: 104, rot: rock }, (gg, x, yy) => {
        gg.save(); gg.translate(x, yy); gg.rotate(rock); gg.scale(1.15, 1.15);
        gg.fillStyle = '#e8edf8'; gg.strokeStyle = INK; gg.lineWidth = 4;
        gg.beginPath(); gg.moveTo(-130, -30); gg.lineTo(-100, -52); gg.lineTo(-30, -46); gg.lineTo(40, -58); gg.lineTo(120, -40); gg.lineTo(130, -26); gg.lineTo(110, 20); gg.lineTo(-110, 24); gg.closePath(); gg.fill(); gg.stroke();
        gg.fillStyle = '#c9d4ee'; gg.beginPath(); gg.moveTo(-110, 24); gg.lineTo(110, 20); gg.lineTo(100, 40); gg.lineTo(-95, 42); gg.closePath(); gg.fill(); gg.stroke();
        gg.strokeStyle = 'rgba(43,51,64,0.4)'; gg.lineWidth = 2; gg.beginPath(); gg.moveTo(-60, -46); gg.lineTo(-30, -20); gg.moveTo(50, -50); gg.lineTo(30, -24); gg.stroke();
        hatch(gg, -110, 22, 215, 20, { step: 7, alpha: 0.3, colour: '60,70,110' });
        hatch(gg, -40, -50, 170, 40, { step: 12, alpha: 0.12, colour: '60,70,110', slant: 1.5 });
        gg.restore();
      });
    } else if (th.kind === 'crate') {
      kit.sprite(g, 'adv.b04.props', 4, th.x, y + 26, { height: 110, rot: rock }, (gg, x, yy) => {
        gg.save(); gg.translate(x, yy); gg.rotate(rock); gg.scale(1.15, 1.15);
        gg.fillStyle = '#b98a52'; gg.strokeStyle = INK; gg.lineWidth = 4;
        gg.fillRect(-46, -92, 92, 92); gg.strokeRect(-46, -92, 92, 92);
        gg.beginPath(); gg.moveTo(-46, -92); gg.lineTo(46, 0); gg.moveTo(46, -92); gg.lineTo(-46, 0); gg.stroke();
        gg.strokeStyle = 'rgba(43,29,20,0.5)'; gg.lineWidth = 2; gg.beginPath(); gg.moveTo(-46, -62); gg.lineTo(46, -62); gg.moveTo(-46, -31); gg.lineTo(46, -31); gg.stroke();
        hatch(gg, -46, -92, 92, 92, { step: 8, alpha: 0.22 });
        hatch(gg, 10, -92, 36, 92, { step: 6, alpha: 0.25, slant: -0.6 });
        gg.restore();
      });
    } else if (th.kind === 'barrel') {
      kit.sprite(g, 'adv.b04.props', 6, th.x, y + 28, { height: 112, rot: rock }, (gg, x, yy) => {
        gg.save(); gg.translate(x, yy); gg.rotate(rock); gg.scale(1.15, 1.15);
        gg.fillStyle = '#8f5f36'; gg.strokeStyle = INK; gg.lineWidth = 4;
        gg.beginPath(); gg.moveTo(-36, -96); gg.quadraticCurveTo(-50, -48, -36, 0); gg.lineTo(36, 0); gg.quadraticCurveTo(50, -48, 36, -96); gg.closePath(); gg.fill(); gg.stroke();
        gg.strokeStyle = '#4a3a2a'; gg.lineWidth = 6; gg.beginPath(); gg.moveTo(-42, -72); gg.lineTo(42, -72); gg.moveTo(-44, -26); gg.lineTo(44, -26); gg.stroke();
        gg.strokeStyle = 'rgba(43,29,20,0.45)'; gg.lineWidth = 1.5; gg.beginPath(); for (let k = -24; k <= 24; k += 12) { gg.moveTo(k, -96); gg.quadraticCurveTo(k * 1.4, -48, k, 0); } gg.stroke();
        hatch(gg, 12, -96, 32, 96, { step: 6, alpha: 0.3, slant: -0.3 });
        gg.restore();
      });
    } else if (th.kind === 'buoy') {
      kit.sprite(g, 'adv.b04.props', 5, th.x, y + 20, { height: 120, rot: rock }, (gg, x, yy) => {
        // The delivered round buoy stands in until the side-on one arrives.
        if (art.drawSprite(gg, art.prop('typhoonigator', 6), x, yy + 12, { height: 136, rot: rock })) return;
        gg.save(); gg.translate(x, yy); gg.rotate(rock);
        gg.fillStyle = '#d9583f'; gg.strokeStyle = INK; gg.lineWidth = 4;
        gg.beginPath(); gg.arc(0, -40, 44, 0, Math.PI * 2); gg.fill(); gg.stroke();
        gg.fillStyle = '#f8f1e0'; gg.beginPath(); gg.rect(-44, -54, 88, 26); gg.fill(); gg.stroke();
        gg.fillStyle = '#d9583f'; gg.fillRect(-8, -110, 16, 30); gg.strokeRect(-8, -110, 16, 30);
        gg.restore();
      });
    }
  }

  function drawTug(g, tg, tt) {
    const rock = Math.sin(tt * 2 + tg.i) * 0.05 + (tg.pushing ? Math.sin(tt * 14) * 0.03 : 0);
    const y = WL + (tg.spin ? tg.y : Math.sin(tt * 2.4 + tg.i) * 4);
    const rot = tg.spin ? tg.spin : rock;
    kit.sprite(g, 'adv.b04.props', 7, tg.x, y + 34, { height: 175, rot, flip: false }, (gg, x, yy) => {
      gg.save(); gg.translate(x, yy); gg.rotate(rot); gg.scale(1.15, 1.15);
      // The hull: stout, teal, bow to the left (it steams left).
      gg.fillStyle = '#3f7f84'; gg.strokeStyle = INK; gg.lineWidth = 4;
      gg.beginPath(); gg.moveTo(-120, -60); gg.lineTo(110, -60); gg.quadraticCurveTo(128, -30, 100, 0); gg.lineTo(-90, 0); gg.quadraticCurveTo(-130, -20, -120, -60); gg.closePath(); gg.fill(); gg.stroke();
      gg.fillStyle = '#d98a8a'; gg.fillRect(-118, -72, 226, 12); gg.strokeRect(-118, -72, 226, 12);
      // The wheelhouse and funnel.
      gg.fillStyle = '#c9a66b'; gg.fillRect(-40, -130, 80, 58); gg.strokeRect(-40, -130, 80, 58);
      gg.fillStyle = '#4a6f8a'; gg.fillRect(-30, -120, 24, 22); gg.strokeRect(-30, -120, 24, 22); gg.fillRect(6, -120, 24, 22); gg.strokeRect(6, -120, 24, 22);
      gg.fillStyle = '#b3402e'; gg.fillRect(50, -150, 26, 78); gg.strokeRect(50, -150, 26, 78);
      gg.fillStyle = INK; gg.fillRect(48, -152, 30, 8);
      hatch(gg, -120, -60, 240, 60, { step: 8, alpha: 0.28, colour: '20,50,60' });
      hatch(gg, -40, -130, 80, 58, { step: 7, alpha: 0.2 });
      gg.strokeStyle = INK; gg.lineWidth = 2; gg.beginPath(); gg.moveTo(-118, -40); gg.lineTo(112, -40); gg.moveTo(-110, -20); gg.lineTo(106, -20); gg.stroke();
      gg.restore();
    });
    if (tg.alive && Math.random() < 0.4) parts.ps.push({ x: tg.x + 63, y: y - 150, vx: 30, vy: -60, t: 0, life: 0.8, gravity: -20, mist: true, size: 9, colour: '#555', ink: false });
    // Its wash, pushing.
    if (tg.pushing) {
      g.save(); g.fillStyle = '#f4fbfb'; g.globalAlpha = 0.8;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(tg.x + 130 + i * 24, WL + 4 + Math.sin(tt * 8 + i) * 4, 16, 6, 0, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
  }

  function drawPeg(g, tt) {
    if (!cam.sees(peg.x - 260, peg.x + 260)) return;
    const rock = Math.sin(tt * 2.2) * 0.035 + (peg.steamT > 0 ? Math.sin(tt * 12) * 0.02 : 0);
    const rot = peg.rot + rock;
    const y = WL + Math.sin(tt * 2.6) * 3 + peg.sink * 150;
    const alpha = 1 - peg.sink * 0.3;
    kit.sprite(g, 'adv.b04.props', 8, peg.x, y + 46, { height: 290, rot, alpha }, (gg, x, yy) => {
      gg.save(); gg.translate(x, yy); gg.rotate(rot); gg.globalAlpha = alpha; gg.scale(1.15, 1.15);
      gg.strokeStyle = INK; gg.lineWidth = 4;
      // The hull, pale teal with a pink rail, bow to the right.
      gg.fillStyle = '#6fa3a4';
      gg.beginPath(); gg.moveTo(-150, -80); gg.lineTo(130, -80); gg.quadraticCurveTo(175, -60, 150, -10); gg.lineTo(-120, -10); gg.quadraticCurveTo(-170, -30, -150, -80); gg.closePath(); gg.fill(); gg.stroke();
      gg.fillStyle = '#e2a0a6'; gg.fillRect(-150, -94, 282, 14); gg.strokeRect(-150, -94, 282, 14);
      // Portholes and the nameplate.
      gg.fillStyle = '#f8f1e0';
      for (let i = 0; i < 4; i++) { gg.beginPath(); gg.arc(-100 + i * 50, -48, 9, 0, Math.PI * 2); gg.fill(); gg.stroke(); }
      gg.fillStyle = '#f8f1e0'; gg.fillRect(76, -66, 60, 24); gg.strokeRect(76, -66, 60, 24);
      gg.fillStyle = INK; gg.font = '800 18px Fraunces, Georgia, serif'; gg.textAlign = 'center'; gg.fillText('PEG', 106, -48);
      // The wheelhouse, the funnel and the crane with its net.
      gg.fillStyle = '#c9a66b'; gg.fillRect(-30, -170, 110, 76); gg.strokeRect(-30, -170, 110, 76);
      gg.fillStyle = '#4a6f8a'; gg.fillRect(-18, -158, 30, 26); gg.strokeRect(-18, -158, 30, 26); gg.fillRect(26, -158, 30, 26); gg.strokeRect(26, -158, 30, 26);
      gg.fillStyle = '#b3402e'; gg.fillRect(-72, -196, 30, 102); gg.strokeRect(-72, -196, 30, 102);
      gg.fillStyle = INK; gg.fillRect(-75, -200, 36, 9);
      gg.strokeStyle = '#8a6a44'; gg.lineWidth = 7; gg.beginPath(); gg.moveTo(-120, -94); gg.lineTo(-120, -210); gg.lineTo(-190, -150); gg.stroke();
      gg.strokeStyle = INK; gg.lineWidth = 2; gg.beginPath(); gg.moveTo(-190, -150); gg.lineTo(-190, -110); gg.stroke();
      gg.fillStyle = 'rgba(43,51,64,0.6)'; gg.beginPath(); gg.moveTo(-205, -110); gg.lineTo(-175, -110); gg.lineTo(-190, -70); gg.closePath(); gg.fill();
      hatch(gg, -150, -80, 300, 70, { step: 8, alpha: 0.25, colour: '20,50,60' });
      hatch(gg, -30, -170, 110, 76, { step: 7, alpha: 0.2 });
      gg.strokeStyle = INK; gg.lineWidth = 2; gg.beginPath(); gg.moveTo(-150, -30); gg.lineTo(150, -30); gg.moveTo(-140, -66); gg.lineTo(70, -66); gg.stroke();
      gg.restore();
    });
    // The steam-recharge ring: when it is full, the captain can burst ahead.
    if (!self.done) {
      g.save();
      g.lineWidth = 7;
      g.strokeStyle = 'rgba(30,40,60,0.3)';
      g.beginPath(); g.arc(peg.x, WL - 285, 22, 0, Math.PI * 2); g.stroke();
      const f = peg.steamCd <= 0 ? 1 : 1 - peg.steamCd / steamCdMax;
      g.strokeStyle = peg.steamCd <= 0 ? '#f8f1e0' : '#9fb4c0';
      g.beginPath(); g.arc(peg.x, WL - 285, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.stroke();
      g.restore();
    }
    // A wake behind it.
    g.save(); g.fillStyle = '#f4fbfb'; g.globalAlpha = 0.55;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(peg.x - 170 - i * 30, WL + 3 + Math.sin(tt * 6 + i) * 3, 18 - i * 3, 6, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }

  function drawCaptain(g, tt) {
    const y = WL + Math.sin(tt * 2.5) * 4 + 30;
    art.drawSprite(g, art.cast(9), captain.x, y, { height: 170, flip: (ferg.cdx || 1) < 0 }) ||
      (() => { g.save(); g.fillStyle = '#e2a0a6'; g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.ellipse(captain.x, y - 20, 60, 24, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore(); })();
  }

  function drawFerg(g, tt) {
    const size = ferg.size;
    const off = levelOff(ferg.level);
    const pose = POSE_OF[fc.anim] || fc.anim;
    const frac = SEA_FRAC[pose] ?? 0.17;
    const sp = art.sprite('iceferg.poses', fc.M.poses[pose]);
    const iceH = F.ice * fc.sizeK; // sizeK carries the melt and the huff swell
    // The keel under the water, drawn before the wash dims it: the ice's own
    // pose mirrored down into the water, squashed, pale and hatched.
    const hw = hullHW();
    const keelSp = art.sprite('iceferg.poses', fc.M.poses.drift);
    g.save();
    g.beginPath();
    g.rect(ferg.x - hw * 1.2, WL + off + 6, hw * 2.4, 420);
    g.clip();
    if (keelSp) {
      const kk = iceH / (keelSp.h * (1 - SEA_FRAC.drift));
      g.globalAlpha = 0.5;
      art.drawSprite(g, keelSp, ferg.x, WL + off + 6 - SEA_FRAC.drift * keelSp.h * kk * 0.6, { scale: kk, ay: 0, flip: fc.facing < 0, sy: -0.62, sx: 0.92 });
      g.globalAlpha = 1;
    } else {
      g.fillStyle = '#c9d2ee';
      g.strokeStyle = 'rgba(43,51,64,0.5)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(ferg.x - hw * 0.95, WL + off + 10);
      g.lineTo(ferg.x - hw * 0.6, WL + off + 150 + 60 * size);
      g.lineTo(ferg.x + hw * 0.2, WL + off + 210 + 60 * size);
      g.lineTo(ferg.x + hw * 0.9, WL + off + 90);
      g.lineTo(ferg.x + hw * 0.95, WL + off + 10);
      g.closePath();
      g.fill(); g.stroke();
    }
    hatch(g, ferg.x - hw, WL + off + 10, hw * 2, 300, { step: 11, alpha: 0.22, colour: '40,60,110' });
    g.restore();
    if (sp) {
      const k = iceH / (sp.h * (1 - frac));
      const y = WL + off + frac * sp.h * k;
      const shakeA = fc.M.anims[fc.anim]?.shake && !env.reduceMotion ? (Math.random() - 0.5) * 2 * fc.M.anims[fc.anim].shake : 0;
      const sq = env.reduceMotion ? fc.sq * 0.4 : fc.sq;
      const bob = !env.reduceMotion ? Math.sin(tt * 2.1) * 0.012 : 0;
      art.drawSprite(g, sp, ferg.x + shakeA, y, { scale: k, ay: 1, flip: fc.facing < 0, rot: fc.rot, sx: 1 + sq * 0.5, sy: (1 - sq) * (1 + bob) });
    } else {
      fc.y = WL + off + 40;
      art.drawCreature(g, fc, tt, { reduceMotion: env.reduceMotion, shadow: false });
    }
    drawRiders(g, tt, off, iceH);
    // A crack across the face after a reef.
    if (ferg.cracked > 0) {
      g.save(); g.strokeStyle = INK; g.lineWidth = 4; g.globalAlpha = Math.min(1, ferg.cracked * 2);
      const cx = ferg.x + fc.facing * hw * 0.2, cy = iceTop() + iceH * 0.3;
      g.beginPath(); g.moveTo(cx - 30, cy - 60); g.lineTo(cx, cy - 20); g.lineTo(cx - 14, cy + 20); g.lineTo(cx + 16, cy + 70); g.stroke();
      g.restore();
    }
  }

  // The sea lions aboard, on the ledges.
  function drawRiders(g, tt, off, iceH) {
    const w = drawnW();
    const n = Math.min(riders.length, LEDGES.length); // the ledges hold this many; the rest are round the back
    for (let i = 0; i < n; i++) {
      const r = riders[i];
      const [lx, ly] = LEDGES[i];
      let x = ferg.x + lx * w * 0.5 * fc.facing, y = WL + off + ly * iceH;
      let item = r.state === 'doze' ? 1 : 2;
      let scale = 1, rot = 0;
      if (r.state === 'hop') { // an arc from where it was onto its ledge
        const p = clamp(r.t / 0.5, 0, 1);
        x = r.fx + (x - r.fx) * p; y = r.fy + (y - r.fy) * p - Math.sin(p * Math.PI) * 140;
        rot = (x > r.fx ? 1 : -1) * Math.sin(p * Math.PI) * 0.6; item = 2;
      } else if (r.state === 'cling') { scale = 0.9; rot = fc.facing * 0.15; item = 2; }
      else if (r.state === 'up') { y -= Math.abs(Math.sin(tt * 9 + i)) * 6; }
      const bob = r.state === 'doze' ? Math.sin(tt * 1.5 + i) * 2 : 0;
      drawLion(g, item, x, y + bob, 62 * scale * ferg.size, rot, fc.facing, tt + i);
    }
  }

  // A sea lion in the book's ink and wash: olive-yellow with brown shading,
  // hair-by-hair strokes, whiskers and a wet black nose. h is its height.
  function drawLion(g, item, x, y, h, rot, facing, tt) {
    kit.sprite(g, 'adv.b04.props', item, x, y, { height: h, rot, flip: facing < 0 }, (gg, xx, yy) => {
      const k = h / 66;
      gg.save(); gg.translate(xx, yy); gg.rotate(rot); gg.scale((facing < 0 ? -1 : 1) * k, k);
      gg.lineJoin = 'round'; gg.lineCap = 'round';
      const FUR = '#c7a24c', SHADE = 'rgba(120,80,30,0.45)', INKL = '#3a2a18';
      gg.fillStyle = FUR; gg.strokeStyle = INKL; gg.lineWidth = 2.6;
      const furStrokes = (pts) => { gg.strokeStyle = 'rgba(90,60,20,0.5)'; gg.lineWidth = 1.1; gg.beginPath(); for (const [a, b, c, d] of pts) { gg.moveTo(a, b); gg.lineTo(c, d); } gg.stroke(); };
      if (item === 1) { // lounging: a long body, chest raised, head up, tail flipper
        gg.beginPath();
        gg.moveTo(-44, 0); gg.quadraticCurveTo(-50, -14, -34, -18); gg.quadraticCurveTo(-10, -26, 12, -30);
        gg.quadraticCurveTo(22, -50, 36, -50); gg.quadraticCurveTo(50, -50, 52, -40); gg.quadraticCurveTo(54, -32, 44, -28);
        gg.quadraticCurveTo(40, -12, 30, 0); gg.closePath(); gg.fill(); gg.stroke();
        gg.fillStyle = SHADE; gg.beginPath(); gg.moveTo(-40, -2); gg.quadraticCurveTo(-20, -8, 20, -6); gg.quadraticCurveTo(10, 0, 28, 0); gg.lineTo(-42, 0); gg.closePath(); gg.fill();
        gg.fillStyle = FUR; gg.beginPath(); gg.moveTo(-44, 0); gg.lineTo(-58, -10); gg.lineTo(-56, 2); gg.closePath(); gg.fill(); gg.stroke(); // tail flipper
        gg.beginPath(); gg.moveTo(4, -14); gg.quadraticCurveTo(-4, -2, 10, 0); gg.quadraticCurveTo(16, -4, 12, -14); gg.fill(); gg.stroke(); // fore flipper
        furStrokes([[-30, -14, -26, -20], [-18, -18, -14, -24], [-6, -22, -2, -28], [6, -14, 10, -20], [-24, -8, -20, -12], [-10, -10, -6, -14], [22, -26, 26, -32], [30, -44, 32, -48]]);
        drawFace(gg, 44, -42);
      } else if (item === 2) { // sitting up, flippers out, clapping
        gg.beginPath();
        gg.moveTo(-28, 0); gg.quadraticCurveTo(-34, -30, -16, -48); gg.quadraticCurveTo(-8, -58, 2, -60);
        gg.quadraticCurveTo(10, -72, 22, -70); gg.quadraticCurveTo(32, -68, 30, -56); gg.quadraticCurveTo(26, -48, 18, -46);
        gg.quadraticCurveTo(26, -24, 26, 0); gg.closePath(); gg.fill(); gg.stroke();
        gg.fillStyle = SHADE; gg.beginPath(); gg.moveTo(-26, -2); gg.quadraticCurveTo(-10, -20, 2, -40); gg.quadraticCurveTo(-8, -20, 24, -2); gg.closePath(); gg.fill();
        const c = Math.sin(tt * 14) * 5;
        gg.fillStyle = FUR;
        gg.beginPath(); gg.moveTo(-18, -34); gg.quadraticCurveTo(-34 + c, -48, -40 + c, -38); gg.quadraticCurveTo(-30, -30, -14, -26); gg.closePath(); gg.fill(); gg.stroke();
        gg.beginPath(); gg.moveTo(18, -34); gg.quadraticCurveTo(34 - c, -48, 40 - c, -38); gg.quadraticCurveTo(30, -30, 14, -26); gg.closePath(); gg.fill(); gg.stroke();
        gg.beginPath(); gg.moveTo(-28, 0); gg.lineTo(-40, 4); gg.lineTo(-20, 6); gg.closePath(); gg.fill(); gg.stroke();
        furStrokes([[-14, -14, -10, -22], [-8, -30, -4, -38], [8, -14, 12, -22], [4, -34, 8, -42], [-20, -6, -16, -12], [14, -6, 18, -12], [12, -56, 14, -62]]);
        drawFace(gg, 22, -64);
      } else { // sliding off, belly up, flippers flailing
        gg.beginPath(); gg.ellipse(0, -18, 36, 17, 0.45, 0, Math.PI * 2); gg.fill(); gg.stroke();
        gg.fillStyle = SHADE; gg.beginPath(); gg.ellipse(-6, -10, 26, 7, 0.45, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = FUR;
        gg.beginPath(); gg.moveTo(-10, -30); gg.lineTo(-22, -46); gg.lineTo(-4, -38); gg.closePath(); gg.fill(); gg.stroke();
        gg.beginPath(); gg.moveTo(-34, -6); gg.lineTo(-50, 0); gg.lineTo(-40, -14); gg.closePath(); gg.fill(); gg.stroke();
        gg.beginPath(); gg.arc(28, -38, 14, 0, Math.PI * 2); gg.fill(); gg.stroke();
        furStrokes([[-20, -20, -16, -26], [-6, -24, -2, -30], [8, -22, 12, -28], [0, -10, 4, -16]]);
        drawFace(gg, 36, -40);
      }
      gg.restore();
    });
  }

  // The face: a round eye with a glint, a black nose and whiskers.
  function drawFace(gg, nx, ny) {
    gg.fillStyle = '#2b1d14';
    gg.beginPath(); gg.ellipse(nx + 4, ny + 2, 4.5, 3.5, 0, 0, Math.PI * 2); gg.fill(); // nose
    gg.beginPath(); gg.arc(nx - 10, ny - 2, 3.2, 0, Math.PI * 2); gg.fill(); // eye
    gg.fillStyle = '#fff'; gg.beginPath(); gg.arc(nx - 11, ny - 3, 1.1, 0, Math.PI * 2); gg.fill();
    gg.strokeStyle = '#2b1d14'; gg.lineWidth = 1.2;
    gg.beginPath();
    gg.moveTo(nx + 2, ny + 5); gg.lineTo(nx + 16, ny + 1);
    gg.moveTo(nx + 2, ny + 7); gg.lineTo(nx + 17, ny + 7);
    gg.moveTo(nx + 2, ny + 9); gg.lineTo(nx + 15, ny + 13);
    gg.moveTo(nx - 2, ny + 6); gg.lineTo(nx - 14, ny + 4);
    gg.stroke();
  }

  function drawLionsAtSea(g, tt) {
    lions.draw(g, cam, tt, (gg, p, x, y, alpha) => {
      if (p.got) return; // it hops aboard (drawn as a rider)
      if (p.swim) {
        // A head above the water, looking about.
        gg.save(); gg.globalAlpha = alpha;
        drawLion(gg, 2, x, y + 40, 62, Math.sin(tt * 2 + p.seed) * 0.08, x > ferg.x ? -1 : 1, tt + p.seed);
        gg.restore();
      } else {
        gg.save(); gg.globalAlpha = alpha;
        drawLion(gg, p.k ? 2 : 1, x, y + 12, 70, 0, p.k ? -1 : 1, tt + p.seed);
        gg.restore();
      }
    }, { bob: 3 });
    for (const s of strays) {
      if (!cam.sees(s.x)) continue;
      drawLion(g, 2, s.x, WL + 38 + Math.sin(tt * 2.5) * 3, 62, 0, s.x > ferg.x ? -1 : 1, tt);
    }
  }

  function drawLionParts(g) {
    for (const p of parts.ps) if (p.lion) drawLion(g, 3, p.x, p.y, 66, p.vx > 0 ? p.t * 4 : -p.t * 4, p.vx > 0 ? 1 : -1, p.t);
  }

  function drawOverhead(g, th, tt) {
    const x0 = th.x - th.hw, x1 = th.x + th.hw;
    if (th.kind === 'pier') {
      const deckY = WL - OVERHEAD.pier - 76; // the deck's top
      kit.sprite(g, 'terrain.sea', 3, th.x, WL + 40, { height: 500 }, (gg) => {
        gg.save();
        gg.strokeStyle = INK; gg.lineWidth = 4;
        // The stilts, pairs, down into the water.
        gg.fillStyle = '#7a5a3a';
        for (let x = x0 + 40; x < x1; x += 160) {
          gg.fillRect(x - 12, deckY + 40, 24, WL - deckY + 40); gg.strokeRect(x - 12, deckY + 40, 24, WL - deckY + 40);
          gg.beginPath(); gg.moveTo(x - 12, deckY + 60); gg.lineTo(x - 60, deckY + 120); gg.moveTo(x + 12, deckY + 60); gg.lineTo(x + 60, deckY + 120); gg.stroke();
        }
        // The deck planks and the rail.
        for (let x = x0 + 40; x < x1; x += 160) hatch(gg, x - 12, deckY + 40, 24, WL - deckY + 40, { step: 6, alpha: 0.3, slant: 0.2 });
        gg.fillStyle = '#b98a52';
        gg.fillRect(x0 - 30, deckY, x1 - x0 + 60, 70); gg.strokeRect(x0 - 30, deckY, x1 - x0 + 60, 70);
        hatch(gg, x0 - 30, deckY + 36, x1 - x0 + 60, 34, { step: 9, alpha: 0.28 });
        gg.strokeStyle = 'rgba(43,29,20,0.45)'; gg.lineWidth = 2; gg.beginPath();
        for (let x = x0 - 10; x < x1 + 30; x += 36) { gg.moveTo(x, deckY + 4); gg.lineTo(x, deckY + 66); }
        gg.stroke();
        gg.strokeStyle = INK; gg.lineWidth = 4;
        gg.beginPath();
        for (let x = x0 - 20; x <= x1 + 30; x += 110) { gg.moveTo(x, deckY); gg.lineTo(x, deckY - 60); }
        gg.moveTo(x0 - 30, deckY - 60); gg.lineTo(x1 + 30, deckY - 60);
        gg.stroke();
        // A crate or two on the deck.
        gg.fillStyle = '#b98a52'; gg.fillRect(x0 + 200, deckY - 54, 54, 54); gg.strokeRect(x0 + 200, deckY - 54, 54, 54);
        gg.fillStyle = '#8f5f36'; gg.beginPath(); gg.ellipse(x1 - 150, deckY - 26, 20, 28, 0, 0, Math.PI * 2); gg.fill(); gg.stroke();
        gg.restore();
      });
    } else {
      const top = WL - OVERHEAD.bridge; // the arch's underside at the middle
      kit.sprite(g, 'terrain.sea', 6, th.x, WL + 40, { height: 560 }, (gg) => {
        gg.save();
        gg.fillStyle = '#9a9aa6'; gg.strokeStyle = INK; gg.lineWidth = 4;
        gg.beginPath();
        gg.moveTo(x0 - 120, WL + 60);
        gg.lineTo(x0 - 120, top - 110);
        gg.lineTo(x1 + 120, top - 110);
        gg.lineTo(x1 + 120, WL + 60);
        gg.lineTo(x1 + 10, WL + 60);
        gg.lineTo(x1 + 10, top + 90);
        gg.quadraticCurveTo(th.x, top - 70, x0 - 10, top + 90);
        gg.lineTo(x0 - 10, WL + 60);
        gg.closePath();
        gg.fill(); gg.stroke();
        // Stones.
        gg.strokeStyle = 'rgba(43,51,64,0.45)'; gg.lineWidth = 2; gg.beginPath();
        for (let r = 0; r < 4; r++) for (let x = x0 - 110 + (r % 2) * 30; x < x1 + 120; x += 60) { gg.rect(x, top - 100 + r * 26, 56, 24); }
        gg.stroke();
        hatch(gg, x0 - 120, top - 110, x1 - x0 + 240, 60, { step: 10, alpha: 0.22, colour: '40,40,60' });
        hatch(gg, x0 - 10, top - 70, 70, WL - top + 130, { step: 8, alpha: 0.3, colour: '40,40,60' });
        // The parapet.
        gg.fillStyle = '#b3b3bf'; gg.fillRect(x0 - 130, top - 140, x1 - x0 + 260, 32); gg.strokeStyle = INK; gg.lineWidth = 4; gg.strokeRect(x0 - 130, top - 140, x1 - x0 + 260, 32);
        gg.restore();
      });
    }
  }

  function drawHarbourWall(g, tt) {
    const x0 = HARBOUR_X + 60;
    if (!cam.sees(x0 - 100, WORLD)) return;
    kit.sprite(g, 'terrain.sea', 4, x0, WL + 60, { height: 640, ax: 0 }, (gg) => {
      gg.save();
      gg.strokeStyle = INK; gg.lineWidth = 4;
      // The wall, stones, and the lighthouse on its end.
      gg.fillStyle = '#9a9aa6';
      gg.fillRect(x0, WL - 120, WORLD - x0 + 100, 320); gg.strokeRect(x0, WL - 120, WORLD - x0 + 100, 320);
      gg.strokeStyle = 'rgba(43,51,64,0.45)'; gg.lineWidth = 2; gg.beginPath();
      for (let r = 0; r < 3; r++) for (let x = x0 + (r % 2) * 30; x < WORLD + 100; x += 70) gg.rect(x, WL - 110 + r * 34, 66, 30);
      gg.stroke();
      hatch(gg, x0, WL - 20, WORLD - x0 + 100, 220, { step: 10, alpha: 0.25, colour: '40,40,60' });
      gg.strokeStyle = INK; gg.lineWidth = 4;
      gg.fillStyle = '#f8f1e0';
      gg.beginPath(); gg.moveTo(x0 + 60, WL - 120); gg.lineTo(x0 + 80, WL - 400); gg.lineTo(x0 + 160, WL - 400); gg.lineTo(x0 + 180, WL - 120); gg.closePath(); gg.fill(); gg.stroke();
      gg.fillStyle = '#b3402e';
      for (let i = 0; i < 3; i++) { gg.beginPath(); gg.moveTo(x0 + 68 + i * 4, WL - 170 - i * 80); gg.lineTo(x0 + 172 - i * 4, WL - 170 - i * 80); gg.lineTo(x0 + 174 - i * 6, WL - 140 - i * 80); gg.lineTo(x0 + 66 + i * 6, WL - 140 - i * 80); gg.closePath(); gg.fill(); gg.stroke(); }
      gg.fillStyle = '#f2c53d'; gg.fillRect(x0 + 90, WL - 450, 60, 50); gg.strokeRect(x0 + 90, WL - 450, 60, 50);
      gg.fillStyle = '#b3402e'; gg.beginPath(); gg.moveTo(x0 + 80, WL - 450); gg.lineTo(x0 + 120, WL - 500); gg.lineTo(x0 + 160, WL - 450); gg.closePath(); gg.fill(); gg.stroke();
      // Foam at its foot.
      gg.fillStyle = '#f4fbfb'; gg.globalAlpha = 0.8;
      for (let i = 0; i < 5; i++) { gg.beginPath(); gg.ellipse(x0 - 10 + Math.sin(tt * 3 + i) * 6, WL + 6 + i * 14, 24, 7, 0, 0, Math.PI * 2); gg.fill(); }
      gg.restore();
    });
    g.save();
    g.font = '800 30px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.lineWidth = 7;
    g.strokeStyle = INK;
    g.fillStyle = '#f8f1e0';
    g.strokeText('Harbour', x0 + 120, WL - 60);
    g.fillText('Harbour', x0 + 120, WL - 60);
    g.restore();
  }

  // The letter is on the Peg; and when it is in reach, which button to press.
  function drawPrompts(g, tt) {
    if (cam.sees(peg.x - 200, peg.x + 200)) letterTag(g, peg.x - 12, WL - 335, { t: tt });
    const gap = Math.abs(peg.x - ferg.x);
    const inReach = gap < chargeReach(1) + hullHW() + 160 && !sunk() && (ferg.mode === 'drift' || ferg.mode === 'huff');
    if (!inReach) return;
    const spent = peg.steamCd > 0.8;
    const text = ferg.mode === 'drift' ? 'Hold: huff!' : ferg.fury >= 1 ? 'Let go: RAM!' : 'Keep huffing';
    actionPrompt(g, ferg.x, Math.max(iceTop(), 300) - 104, text, { kind: env.inputKind, t: tt, pulse: ferg.mode === 'huff' && ferg.fury >= 1 && spent ? 1 : 0 });
  }

  function drawMeter(g) {
    const m = ferg.mode;
    if (m !== 'huff' && m !== 'windup') return;
    const x = ferg.x, y = Math.max(iceTop(), 300) - 60;
    const w = 240;
    g.save();
    g.fillStyle = 'rgba(248,241,224,0.9)';
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - 14, w, 28, 12) : g.rect(x - w / 2, y - 14, w, 28); g.fill(); g.stroke();
    const f = ferg.fury;
    g.fillStyle = f >= 1 ? '#d9583f' : '#8fb7d9';
    g.beginPath(); g.roundRect ? g.roundRect(x - w / 2 + 4, y - 10, (w - 8) * f, 20, 9) : g.rect(x - w / 2 + 4, y - 10, (w - 8) * f, 20); g.fill();
    g.font = '800 22px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.fillStyle = INK;
    g.fillText(f >= 1 ? 'FULL FURY' : 'FURY', x, y - 22);
    // The reach of the charge, as a dotted line along the water.
    const reach = chargeReach(f);
    g.setLineDash([12, 12]);
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(248,241,224,0.85)';
    g.beginPath(); g.moveTo(x + ferg.aim * hullHW(), WL - 20); g.lineTo(x + ferg.aim * (hullHW() + reach), WL - 20); g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  return self;
}

// The how-to-play page (chapters/index.js, THE HOW-TO-PLAY PAGE).
export const HOWTO = [
  { text: 'Push along, up to rise, down to sink under the pier.', scene: 'scenes/typhoonigator', crop: [300, 200, 1280, 720],
    items: [{ creature: 'iceferg', anim: 'drift', x: 250, y: 400, h: 230 }, { path: [[330, 400], [560, 400]], arrow: true }, { path: [[250, 180], [250, 120]], arrow: true }, { path: [[250, 330], [250, 390]], arrow: true }] },
  { text: 'Hold Action to huff up fury, let go to charge and smash.', scene: 'scenes/typhoonigator', crop: [300, 200, 1280, 720],
    items: [{ creature: 'iceferg', anim: 'charge', x: 220, y: 400, h: 230 }, { sprite: ['props.typhoonigator', 6], x: 500, y: 390, h: 90 }, { path: [[330, 380], [470, 380]], arrow: true }, { word: 'SMASH!', x: 500, y: 250, size: 44 }] },
  { text: 'Pick up sea lions from the floes, then ram the Peg before the harbour.', scene: 'scenes/iceferg', crop: [900, 0, 1020, 574],
    items: [{ creature: 'iceferg', anim: 'drift', x: 200, y: 420, h: 220 }, { sprite: ['props.iceferg', 1], x: 480, y: 400, h: 150 }, { path: [[300, 360], [420, 360]], arrow: true }, { word: 'SCRUNNCCCHHH!!', x: 400, y: 150, size: 40 }] },
];

// ---------- the autopilot ----------
//
// Drifts right, sinks under the pier and the bridge and the cold current,
// rises over the reefs, rides the warm currents, smashes what is in the way
// with enough fury, and rams the Peg once the captain has spent his steam.
export function autopilot(board) {
  const { ferg, peg, things, tugs, ZONES: Z } = board;
  const inp = { x: 1, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  const hw = 526 * ferg.size * 0.42;
  const gap = peg.x - ferg.x;
  const dir = gap < 0 ? -1 : 1; // the way to go: after the Peg
  const between = (o, dist) => (dir > 0 ? o.x + (o.hw || 0) > ferg.x - hw && o.x - (o.hw || 0) < ferg.x + dist : o.x - (o.hw || 0) < ferg.x + hw && o.x + (o.hw || 0) > ferg.x - dist);
  const live = things.filter((o) => o.alive);
  const overheads = live.filter((o) => (o.kind === 'pier' || o.kind === 'bridge') && between(o, 760));
  const reefs = live.filter((o) => o.kind === 'reef' && between(o, 620));
  const zone = Z.find((z) => ferg.x > z.x0 - 150 && ferg.x < z.x1);
  const cold = zone && zone.dir < 0;
  const need = { floe: 0.15, crate: 0.2, barrel: 0.2, buoy: 0.3, tug: 0.5 };
  inp.x = dir;
  if (gap < 0) {
    // It slipped past the Peg. Under the pier or the bridge the boat is out of
    // reach: sit sunk and let it chug by, then turn and ram it.
    const under = Math.abs(gap) < hw + 220 || live.some((o) => (o.kind === 'pier' || o.kind === 'bridge') && (Math.abs(o.x - peg.x) < o.hw + 200 || between(o, Math.abs(gap))));
    if (under) { inp.x = 0; inp.y = 1; inp.action = ferg.mode === 'huff'; return inp; } // keep any fury for when it is past
    inp.y = -1;
  } else if (overheads.length || cold) inp.y = 1; // sink
  else if (reefs.length) inp.y = -1; // rise
  else if (gap < 1400) inp.y = -1; // up, ready to ram
  // Ride a warm current while there is ice to spare.
  if (gap > 0 && zone && zone.warm && zone.dir > 0 && ferg.size > 0.72 && !overheads.length) inp.sprint = true;
  else if (zone && zone.warm && ferg.size <= 0.72) inp.y = 1; // too melted: slip under it
  // What to smash: the nearest floating thing in the way, or a tug, or the Peg.
  let target = null, wantFury = 0;
  if (gap > 0) {
    const smashables = live.filter((o) => (o.kind === 'crate' || o.kind === 'barrel' || o.kind === 'buoy' || o.kind === 'floe') && between(o, 520))
      .concat(tugs.filter((o) => o.alive && between(o, 700)));
    smashables.sort((a, b) => a.x - b.x);
    if (smashables.length) { target = smashables[0]; wantFury = Math.min(1, need[target.kind] / ferg.size + 0.3); }
  }
  const levelOk = (!overheads.length || ferg.level < -0.55) && (!reefs.length || ferg.level > 0.5) && !(zone && zone.warm && ferg.size <= 0.72 && ferg.level > -0.55);
  // The Peg: huff only once it is within a full charge, or the captain just
  // chugs out of reach while the ice huffs.
  const pegNear = Math.abs(gap) < 700 + hw && !overheads.length && !reefs.length;
  if (pegNear) { target = peg; wantFury = 1; }
  if (!target) return inp;
  const dist = Math.abs(target.x - ferg.x);
  const reach = chargeReach(ferg.fury);
  const m = ferg.mode;
  if (m === 'drift') {
    if (levelOk || target !== peg) { inp.action = true; inp.actionPressed = true; }
  } else if (m === 'huff') {
    let release = ferg.fury >= wantFury && dist <= reach * 0.9 + hw && levelOk && ferg.aim === dir;
    if (target === peg) release = ferg.fury >= 1 && dist <= 700 + hw && ferg.level > -0.3 && ferg.aim === dir;
    inp.action = !release;
    inp.actionReleased = release;
    if (ferg.holdT > (target === peg ? 3 : 7)) { inp.action = false; inp.actionReleased = true; } // never hold forever
  }
  return inp;
}

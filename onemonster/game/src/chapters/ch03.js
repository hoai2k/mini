// Chapter 3: the Bombanat-Munching Grumley grabs the Bombanat out of the air
// (design.md, chapter 3 and "How each creature moves"). The Grumley lurks in
// the Blue Ocean of Bubbley Goo with only his horns and spectacled eyes
// showing, gliding about and leaving a wake and bubbles. Action lunges a claw
// up out of the goo: the longer he has waited since the last lunge, the higher
// it reaches. Above, the Bombanat with the letter flies among plain Bombanats
// and drifting decoys (a kite, an umbrella); its wings tire high up, so it has
// to come down to the goo to rest and eat, and that is when it is in reach.
// A miss warns it off. Plain Bombanats grabbed on the way go in the lunch
// basket (the bonus); a decoy costs time.
//
// Why no move always wins: lunging all the time gives short, weak reaches, a
// splutter after every miss and a Bombanat that keeps clear; sitting high and
// never landing is impossible for the Bombanat (its stamina only comes back
// low down); a patient Grumley who keeps still (and so is forgotten) and
// creeps under a dipping Bombanat usually gets it.

import * as art from '../art.js';
import { makeFx } from '../chasedraw.js';
import { marksFor } from './index.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Tuning, in logical px and seconds.
export const TUNE = {
  time: 45,
  // The goo band the Grumley glides in (screen y = depth), and its width.
  gx0: 600, gx1: 1830, gy0: 800, gy1: 960,
  gSpeed: 230, gSprint: 370, gDepthK: 0.45,
  // The lunge: reach (px above the goo, at depth scale 1) grows with the time
  // since the last lunge, from reachMin to reachMax over chargeTime.
  reachMin: 120, reachMax: 470, chargeTime: 4,
  riseT: 0.2, holdT: 0.18, sinkT: 0.35, clawHalf: 105,
  splutterT: 1.1, munchT: 0.9, blehT: 1.4, decoyPenalty: 3,
  // The fliers.
  bx0: 560, bx1: 1860, topY: 120,
  gravity: 560, flapV: 360, glideSink: 150, diveSink: 480, flatSink: 70,
  flapCost: 0.04, flapCd: 0.2, dartV: 900, dartT: 0.3, dartCd: 1.4, dartCost: 0.12,
  regenLanded: 0.6, regenLow: 0.2, regenHigh: 0, windedT: 1.8,
  letterSpeed: 400, plainSpeed: 290, warnT: 3,
};

// Depth scale on the goo: smaller at the back.
const depthK = (y) => 0.78 + 0.22 * clamp((y - TUNE.gy0) / (TUNE.gy1 - TUNE.gy0), 0, 1);

// ---------- the fliers (the Bombanats) ----------

function makeFlier(env, { letter, x, y, lane }) {
  const c = art.makeCreature('bombanat', x, y);
  c.sizeK = letter ? 0.85 : 0.6;
  return {
    letter, x, y, lane, vx: 0, vy: 0, st: 1, winded: 0, flapCd: 0, dartT: 0, dartCd: 0, dartDir: 1,
    landed: false, mode: 'fly', warnT: 0, wasSprint: false, flapT: 0, c, brain: { state: 'cruise', T: 2 + env.rng() * 3, tx: x, ta: 350, knownAge: 99, known: 0 },
    gone: false, respawn: 0,
  };
}

const restY = (b) => b.lane - 30;
const altOf = (b) => restY(b) - b.y;

// One step of a Bombanat's flight from holder controls: x steers, y down dives
// (up glides flatter), action flaps (it tires), sprint darts.
function stepFlier(env, b, inp, dt, gentle) {
  const T = TUNE;
  b.flapCd = Math.max(0, b.flapCd - dt);
  b.dartCd = Math.max(0, b.dartCd - dt);
  b.dartT = Math.max(0, b.dartT - dt);
  b.winded = Math.max(0, b.winded - dt);
  b.warnT = Math.max(0, b.warnT - dt);
  b.flapT += dt;
  const ix = clamp(inp.x || 0, -1, 1), iy = clamp(inp.y || 0, -1, 1);
  const speed = (b.letter ? T.letterSpeed : T.plainSpeed) * (b.winded > 0 ? 0.8 : 1);
  // Dart: a quick burst sideways.
  const sprintEdge = inp.sprint && !b.wasSprint;
  b.wasSprint = !!inp.sprint;
  if (sprintEdge && b.dartCd <= 0 && b.winded <= 0 && b.st > 0.08) {
    b.dartT = T.dartT;
    b.dartCd = T.dartCd;
    b.dartDir = ix ? Math.sign(ix) : (b.vx >= 0 ? 1 : -1);
    b.st -= T.dartCost * (gentle ? 0.7 : 1);
    if (b.letter) env.sfx('swoosh');
  }
  const tvx = b.dartT > 0 ? b.dartDir * T.dartV : ix * speed;
  b.vx += (tvx - b.vx) * (1 - Math.exp(-(b.dartT > 0 ? 14 : 5) * dt));
  // Flap: each press is one wing beat; holding beats slowly by itself.
  const wantFlap = inp.actionPressed || (inp.action && b.flapT > 0.34);
  if (wantFlap && b.flapCd <= 0 && b.winded <= 0) {
    b.vy = Math.min(b.vy, 0) * 0.3 - T.flapV;
    b.flapCd = T.flapCd;
    b.flapT = 0;
    b.st -= T.flapCost * (gentle ? 0.7 : 1);
    b.landed = false;
    if (b.letter) env.sfx('flap');
  }
  b.vy += T.gravity * dt;
  const sink = b.winded > 0 ? T.glideSink * 1.4 : iy > 0.5 ? T.diveSink : iy < -0.5 ? T.flatSink : T.glideSink;
  b.vy = Math.min(b.vy, sink);
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.x < T.bx0) { b.x = T.bx0; b.vx = Math.abs(b.vx) * 0.5; }
  if (b.x > T.bx1) { b.x = T.bx1; b.vx = -Math.abs(b.vx) * 0.5; }
  if (b.y < T.topY) { b.y = T.topY; b.vy = Math.max(0, b.vy); }
  if (b.y >= restY(b)) {
    if (!b.landed && b.letter && b.vy > 200) env.sfx('splash');
    b.y = restY(b); b.vy = 0; b.landed = true;
    b.vx *= Math.exp(-6 * dt);
  } else if (b.vy < 0) b.landed = false;
  // Stamina comes back only low down: on the goo, or skimming it.
  const alt = altOf(b);
  const regen = b.landed ? T.regenLanded : alt < 140 ? T.regenLow : T.regenHigh;
  b.st = Math.min(1, b.st + regen * (gentle ? 1.3 : 1) * dt);
  if (b.st <= 0 && b.winded <= 0) {
    b.st = 0;
    b.winded = T.windedT;
    return 'winded';
  }
  return null;
}

// The computer's Bombanat: cruise, get hungry or tired, dip to the goo to rest
// and eat, and flee when it spots the Grumley close or is warned by a lunge.
function aiFlier(env, b, G, skill, dt) {
  const br = b.brain;
  const rng = env.rng;
  // Spotting the Grumley: easy when he moves (wake, bubbles), hard when still.
  const rate = G.vis < 0.11 ? G.vis * (1 + 3 * skill) : G.vis * (2.5 + 5 * skill);
  if (rng() < rate * dt) { br.known = G.x; br.knownAge = 0; }
  br.knownAge += dt;
  const conf = Math.max(0, 1 - br.knownAge / (3 + 5 * skill));
  const alt = altOf(b);
  if (b.warnT > 0 && br.state !== 'flee') {
    br.state = 'flee';
    br.fleeT = 0;
    br.T = b.warnT;
    br.tx = clamp(b.x + (b.x >= G.x ? 1 : -1) * 520, TUNE.bx0 + 40, TUNE.bx1 - 40);
    if (Math.abs(br.tx - b.x) < 200) br.tx = clamp(b.x - (b.x >= G.x ? 1 : -1) * 520, TUNE.bx0 + 40, TUNE.bx1 - 40);
  }
  br.T -= dt;
  let dart = false;
  const pickSpot = () => {
    let best = null, bestS = -1e9;
    for (let i = 0; i < 7; i++) {
      const x = 640 + rng() * 1160;
      const d = Math.abs(x - br.known);
      const sc = (conf > 0 ? (Math.min(d, 700) - (d < 450 ? 400 : 0)) * conf * (0.4 + skill) : 0) + rng() * 260 - Math.abs(x - b.x) * 0.15;
      if (sc > bestS) { bestS = sc; best = x; }
    }
    return best;
  };
  const toCruise = (T) => { br.state = 'cruise'; br.T = T; br.wander = 0; br.alarm = -1; };
  switch (br.state) {
    case 'cruise': {
      br.wander = (br.wander ?? 0) - dt;
      if (br.wander <= 0) {
        br.wander = 1.5 + rng() * 2;
        br.ta = b.letter ? 460 + rng() * 160 : 220 + rng() * 260; // plain ones dawdle lower
        let tx = TUNE.bx0 + 60 + rng() * (TUNE.bx1 - TUNE.bx0 - 120);
        // Keep away from where the Grumley was seen.
        if (conf > 0.2 && Math.abs(tx - br.known) < 300 && rng() < skill) tx = clamp(br.known + (tx >= br.known ? 1 : -1) * 420, TUNE.bx0 + 40, TUNE.bx1 - 40);
        br.tx = tx;
      }
      if (br.T <= 0 || b.st < 0.3) {
        // Hungry or tired: pick somewhere to land, away from a known Grumley.
        br.state = 'dip';
        br.tx = pickSpot();
        br.T = 9;
        br.alarm = -1;
        br.replan = 1;
      }
      break;
    }
    case 'dip':
      // Seen him near the landing spot? Choose another.
      br.replan -= dt;
      if (br.replan <= 0 && br.knownAge < 1 && Math.abs(br.known - br.tx) < 300 && rng() < 0.3 + 0.7 * skill) { br.tx = pickSpot(); br.replan = 1; }
      br.ta = Math.abs(b.x - br.tx) < 200 ? -60 : Math.max(450, Math.min(alt, 600));
      if (b.landed) { br.state = 'rest'; br.T = 1.4 + rng() * 1.6; env.sfx('munch'); }
      else if (br.T <= 0) toCruise(3);
      break;
    case 'rest':
      br.ta = -60;
      br.tx = b.x;
      if (br.T <= 0 && b.st > 0.75) toCruise(3 + rng() * 3);
      break;
    case 'flee': {
      // Away from where the Grumley is thought to be: high while there is
      // breath to climb, else skimming low, and down to rest once well clear.
      const gx = br.knownAge < 3 ? br.known : G.x;
      // Head for whichever side has more room, crossing over him high if need be.
      const txs = [-1, 1].map((sd) => clamp(gx + sd * 650, TUNE.bx0 + 40, TUNE.bx1 - 40));
      const away = b.x >= gx ? 1 : 0;
      br.tx = Math.abs(txs[away] - gx) > 280 || b.st < 0.4 ? txs[away] : txs[1 - away];
      const dxg = Math.abs(b.x - gx);
      const clear = dxg > 480;
      // How high is safe: he shows how far his claw would reach.
      const safe = clamp((G.reach || TUNE.reachMax) - (G.y - restY(b)) + 80, 200, 620);
      br.ta = dxg < 320 ? safe : b.st < 0.5 ? (clear ? -60 : 170) : Math.min(320, safe);
      if (Math.abs(gx - b.x) < 260 && b.dartCd <= 0) dart = true;
      br.fleeT = (br.fleeT || 0) + dt;
      if (b.landed && clear && br.fleeT > 0.8 && b.warnT <= 0) { br.state = 'rest'; br.T = 1 + rng(); }
      else if (br.T <= 0 && b.warnT <= 0) toCruise(2.5 + rng() * 3);
      break;
    }
  }
  if (br.state !== 'flee') {
    // Spotted close by? React after a moment, unless it misses it on purpose.
    // High up, only a Grumley right below is worth a fuss.
    const range = (b.landed ? 320 : alt > 300 ? 140 : 220) + 240 * skill;
    const near = br.knownAge < 0.8 && Math.abs(br.known - b.x) < range;
    br.ignore = Math.max(0, (br.ignore || 0) - dt);
    if (near && br.alarm < 0 && br.ignore <= 0) {
      // Now and then it simply doesn't notice, for a moment.
      if (rng() < (0.08 + (1 - skill) * 0.25) * (1 - G.vis * 0.6)) br.ignore = 0.5 + rng() * 0.6;
      else br.alarm = 0.4 - 0.3 * skill + rng() * 0.2;
    }
    if (br.alarm >= 0) {
      br.alarm -= dt;
      if (br.alarm <= 0) {
        br.state = 'flee';
        br.fleeT = 0;
        br.T = 1.8 + rng();
        br.tx = clamp(b.x + (b.x >= br.known ? 1 : -1) * 520, TUNE.bx0 + 40, TUNE.bx1 - 40);
        if (Math.abs(br.tx - b.x) < 200) br.tx = clamp(b.x - (b.x >= br.known ? 1 : -1) * 520, TUNE.bx0 + 40, TUNE.bx1 - 40);
        dart = true;
      }
    }
  }
  // Turn the plan into holder controls.
  let x = clamp((br.tx - b.x) / 150, -1, 1);
  if (dart) {
    // Dart away from him, unless that is into the edge.
    const gx = br.knownAge < 3 ? br.known : G.x;
    const away = b.x >= gx ? 1 : -1;
    if ((away > 0 ? TUNE.bx1 - b.x : b.x - TUNE.bx0) > 200) x = away;
    else dart = false;
  }
  // Well below where it wants to be: climb steeply before going anywhere.
  const low = alt < br.ta - 150;
  if (low && !dart && br.state !== 'flee') x *= 0.35;
  const flap = alt < br.ta - 25 && (b.vy > (low ? -150 : 0) || b.landed) && b.flapCd <= 0;
  const y = alt > br.ta + 60 ? 1 : 0;
  return { x, y, action: false, actionPressed: flap, sprint: dart && !b.wasSprint };
}

// ---------- chapter 3 ----------

export default function create(env) {
  const { W, H } = env;
  const T = TUNE;
  const total = T.time + (env.gentle[0] ? 10 : 0);
  const clawHalf = T.clawHalf + (env.gentle[0] ? 30 : 0);
  const reachMin = T.reachMin + (env.gentle[0] ? 60 : 0);
  const fx = makeFx();
  const rng = env.rng;
  let t = 0;

  const G = {
    x: 1250, y: 880, vx: 0, vy: 0, mode: 'lurk', modeT: 0, charge: 1, misses: 0, still: 0, vis: 0.1,
    sprinting: false, facing: -1, lunge: null, held: null, bubbleT: 0.5, rippleT: 0,
    c: art.makeCreature('grumley', 1250, 880),
  };
  G.c.facing = -1;
  const L = makeFlier(env, { letter: true, x: 900, y: 330, lane: 870 });
  const birds = [L];
  const lanes = [800, 840, 930];
  for (let i = 0; i < 3; i++) birds.push(makeFlier(env, { letter: false, x: 700 + i * 420 + rng() * 120, y: 200 + rng() * 300, lane: lanes[i] }));
  for (const b of birds) { b.brain.T = 1.5 + rng() * 4; b.brain.known = G.x; b.brain.knownAge = 0; }
  L.brain.T = 3.5;
  const decoys = [];
  let decoyT = 4 + rng() * 3;
  const bubbles = []; // { x, y, t, life, s }
  const ripples = []; // { x, y, t }
  const drops = []; // flung goo: { x, y, vx, vy, t }
  const flying = []; // a lunch Bombanat on its way to the basket
  let ambientT = 0.5;
  let basketKick = 0;
  let outroT = 0;
  let net = null;
  let bubbleSfxT = 0;

  const reachNow = () => reachMin + (T.reachMax - reachMin) * clamp(G.charge / T.chargeTime, 0, 1);

  function setMode(m) { G.mode = m; G.modeT = 0; }

  function addBubble(x, y, s, life) { bubbles.push({ x, y, t: 0, life, s }); }

  function splash(x, y, n, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * 1.8;
      const v = (300 + rng() * 500) * power;
      drops.push({ x: x + (rng() - 0.5) * 60, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, r: 6 + rng() * 9 });
    }
  }

  // Warn the fliers near a lunge: the letter Bombanat is warned off by any
  // miss; plain ones scatter if it was close.
  function warn(missed) {
    for (const b of birds) {
      if (b.gone || b.mode !== 'fly') continue;
      b.brain.known = G.x;
      b.brain.knownAge = 0;
      if (b.letter ? missed : Math.abs(b.x - G.x) < 400) b.warnT = T.warnT * (b.letter ? 1 : 0.6);
    }
  }

  function startLunge() {
    const R = reachNow();
    G.lunge = { R, tip: G.y, caught: null };
    G.charge = 0;
    setMode('lunge');
    env.sfx('splash');
    env.sfx('swoosh');
    env.vibrate(30);
    art.kick(G.c, -0.6);
    splash(G.x, G.y - 10, 10, 0.7 + (R / T.reachMax) * 0.5);
    ripples.push({ x: G.x, y: G.y, t: 0, big: true });
  }

  // What the claw closes on: the letter Bombanat first, then a plain one,
  // then a decoy.
  function clawCheck() {
    const tip = G.lunge.tip;
    const inCol = (x, y) => Math.abs(x - G.x) < clawHalf * depthK(G.y) && y >= tip - 45 && y <= G.y + 10;
    if (L.mode === 'fly' && inCol(L.x, L.y)) return { kind: 'letter', b: L };
    const pb = birds.find((b) => !b.letter && !b.gone && b.mode === 'fly' && inCol(b.x, b.y));
    if (pb) return { kind: 'plain', b: pb };
    const d = decoys.find((d) => !d.gone && inCol(d.x, d.y));
    if (d) return { kind: 'decoy', d };
    return null;
  }

  function stepGrumley(inS, dt) {
    G.modeT += dt;
    const k = depthK(G.y);
    let tvx = 0, tvy = 0;
    G.sprinting = false;
    G.reach = reachNow();
    if (G.mode === 'lurk') {
      const ix = clamp(inS.x || 0, -1, 1), iy = clamp(inS.y || 0, -1, 1);
      const m = Math.hypot(ix, iy);
      G.sprinting = !!inS.sprint && m > 0.2;
      const sp = G.sprinting ? T.gSprint : T.gSpeed;
      tvx = ix * sp;
      tvy = iy * sp * T.gDepthK;
      if (inS.actionPressed) startLunge();
    }
    G.vx += (tvx - G.vx) * (1 - Math.exp(-6 * dt));
    G.vy += (tvy - G.vy) * (1 - Math.exp(-6 * dt));
    if (G.mode !== 'lurk') { G.vx *= Math.exp(-8 * dt); G.vy *= Math.exp(-8 * dt); }
    G.x = clamp(G.x + G.vx * dt, T.gx0, T.gx1);
    G.y = clamp(G.y + G.vy * dt, T.gy0, T.gy1);
    const sp = Math.hypot(G.vx, G.vy);
    if (Math.abs(G.vx) > 30) G.facing = Math.sign(G.vx);
    G.still = sp < 25 && G.mode === 'lurk' ? G.still + dt : 0;
    // Patience charges the reach: it builds while he keeps still, a little
    // while he creeps, and ebbs away while he glides fast or sprints.
    if (G.mode === 'lurk') G.charge = clamp(G.charge + dt * (G.sprinting && sp > 120 ? -1.5 : sp > 150 ? -0.6 : sp > 25 ? 0.3 : 1), 0, T.chargeTime);
    // How easy he is to spot: still and sunk, hardly; gliding, plainly;
    // sprinting, his bubbles boil up all round him.
    G.vis = G.mode !== 'lurk' ? 1 : G.sprinting && sp > 120 ? 1 : sp > 150 ? 0.3 + 0.4 * Math.min(1, sp / T.gSpeed) : sp > 25 ? 0.09 : G.still > 1 ? 0.04 : 0.08;
    // Bubbles and wake.
    G.bubbleT -= dt;
    if (G.bubbleT <= 0) {
      const big = G.sprinting && sp > 120;
      G.bubbleT = big ? 0.07 : sp > 25 ? 0.4 - 0.2 * Math.min(1, sp / T.gSpeed) : 1.4 + rng() * 1.2;
      const n = big ? 2 : 1;
      for (let i = 0; i < n; i++) addBubble(G.x - G.facing * (40 + rng() * 80) * k + (rng() - 0.5) * 50, G.y + (rng() - 0.5) * 24, (big ? 0.9 : 0.55) + rng() * 0.4, 0.8 + rng() * 0.7);
      bubbleSfxT -= 1;
      if (bubbleSfxT <= 0) { env.sfx('bubble'); bubbleSfxT = big ? 4 : 1; }
    }
    G.rippleT -= dt;
    if (sp > 40 && G.rippleT <= 0) { G.rippleT = 0.12; ripples.push({ x: G.x, y: G.y, t: 0 }); }

    // The lunge: rise, hold at the top, sink back.
    if (G.mode === 'lunge') {
      const Lg = G.lunge;
      const tm = G.modeT;
      if (tm < T.riseT) Lg.tip = G.y - Lg.R * Math.sin((tm / T.riseT) * Math.PI / 2);
      else if (tm < T.riseT + T.holdT) Lg.tip = G.y - Lg.R;
      else Lg.tip = G.y - Lg.R * Math.max(0, 1 - (tm - T.riseT - T.holdT) / T.sinkT);
      if (!Lg.caught && tm < T.riseT + T.holdT) {
        const hit = clawCheck();
        if (hit) grab(hit);
      }
      if (G.mode === 'lunge' && !Lg.caught && tm >= T.riseT + T.holdT && !Lg.missed) {
        Lg.missed = true;
        env.sfx('snap');
      }
      if (G.mode === 'lunge' && tm >= T.riseT + T.holdT + T.sinkT) {
        G.lunge = null;
        if (Lg.missed) {
          G.misses += 1;
          setMode('splutter');
          env.sfx('stumble');
          fx.say('Missed!', G.x, G.y - 200);
          warn(true);
          splash(G.x, G.y - 10, 5, 0.5);
        } else setMode('lurk');
      }
    } else if (G.mode === 'splutter' && G.modeT > T.splutterT + 0.4 * Math.min(3, G.misses - 1)) setMode('lurk');
    else if (G.mode === 'munch' && G.modeT > T.munchT) setMode('lurk');
    else if (G.mode === 'bleh' && G.modeT > T.blehT) setMode('lurk');
  }

  function grab(hit) {
    const Lg = G.lunge;
    env.sfx('snap');
    env.vibrate(70);
    G.misses = 0;
    if (hit.kind === 'letter') {
      Lg.caught = 'letter';
      L.mode = 'grabbed';
      setMode('won');
      splash(G.x, G.y - 10, 16, 1.2);
      self.done = true;
      self.outcome = 'snatched';
      return;
    }
    if (hit.kind === 'plain') {
      const b = hit.b;
      Lg.caught = 'plain';
      b.mode = 'grabbed';
      b.gone = true;
      b.respawn = 4 + rng() * 2;
      self.bonus += 1;
      basketFull = true;
      flying.push({ x0: b.x, y0: b.y, t: 0, b });
      env.sfx('slurp');
      fx.say('Lunch!', b.x, b.y - 60);
      setMode('munch');
      warn(false);
      G.lunge = null;
      return;
    }
    const d = hit.d;
    Lg.caught = 'decoy';
    d.gone = true;
    self.time = Math.max(0, self.time - T.decoyPenalty);
    env.sfx('bonk');
    fx.say(d.item === 1 ? 'Bleh! A kite!' : 'Bleh! An umbrella!', d.x, d.y - 60);
    fx.say(`-${T.decoyPenalty} s`, d.x, d.y + 10);
    setMode('bleh');
    warn(false);
    G.lunge = null;
  }
  let basketFull = false;

  function stepDecoys(dt) {
    decoyT -= dt;
    if (decoyT <= 0 && decoys.filter((d) => !d.gone).length < 2) {
      decoyT = 6 + rng() * 4;
      const fromLeft = rng() < 0.5;
      decoys.push({
        item: rng() < 0.45 ? 1 : 2, x: fromLeft ? 520 : W + 140, base: 250 + rng() * 330, y: 0, vx: (fromLeft ? 1 : -1) * (110 + rng() * 70),
        ph: rng() * 6, t: 0, flipAt: 2 + rng() * 5, lane: 820 + rng() * 120, gone: false,
      });
    }
    for (const d of decoys) {
      d.t += dt;
      d.x += d.vx * dt;
      d.y = d.base + Math.sin(d.t * 1.7 + d.ph) * 90;
      if (d.item === 2 && d.t > d.flipAt) { d.item = 3; env.sfx('swish'); }
      if (d.x < 380 || d.x > W + 200) d.gone = true;
    }
    for (let i = decoys.length - 1; i >= 0; i--) if (decoys[i].gone) decoys.splice(i, 1);
  }

  function animFlier(b) {
    const c = b.c;
    if (b.mode === 'grabbed') art.setAnim(c, 'grabbed');
    else if (b.landed) art.setAnim(c, 'perched');
    else if (b.winded > 0) art.setAnim(c, 'stall');
    else if (b.dartT > 0) art.setAnim(c, 'swoop');
    else if (b.vy > 320) art.setAnim(c, 'dive');
    else if (b.flapT < 0.4) art.setAnim(c, 'flap');
    else art.setAnim(c, 'glide');
  }

  function animGrumley() {
    const c = G.c;
    if (G.mode === 'lunge') art.setAnim(c, G.modeT < 0.06 ? 'rise' : 'lunge');
    else if (G.mode === 'splutter' || G.mode === 'bleh') art.setAnim(c, 'splutter');
    else if (G.mode === 'munch') art.setAnim(c, 'lunch');
    else if (Math.hypot(G.vx, G.vy) > 40) art.setAnim(c, 'glide');
    else art.setAnim(c, 'lurk');
  }

  const self = {
    get outroTime() { return self.outcome === 'snatched' ? 3.0 : 1.4; },
    time: total,
    done: false,
    outcome: null,
    bonus: 0,
    G, L, birds, decoys, bubbles, reachNow,
    update(dt, inS, inH) {
      t += dt;
      fx.update(dt);
      stepParticles(dt);
      if (self.done) { outro(dt); return; }
      self.time = Math.max(0, self.time - dt);
      const elapsed = total - self.time;
      const skill = clamp(env.skill + 0.25 * (elapsed / total), 0, 1);
      stepGrumley(inS || {}, dt);
      if (self.done) return;
      stepDecoys(dt);
      // Ambient goo bubbles, so a bubble is only a clue.
      ambientT -= dt;
      if (ambientT <= 0) {
        ambientT = 0.5 + rng() * 0.9;
        addBubble(T.gx0 + rng() * (T.gx1 - T.gx0), T.gy0 + rng() * (T.gy1 - T.gy0), 0.4 + rng() * 0.4, 0.7 + rng() * 0.6);
      }
      for (const b of birds) {
        if (b.gone) {
          b.respawn -= dt;
          if (b.respawn <= 0) {
            const left = rng() < 0.5;
            Object.assign(b, { gone: false, mode: 'fly', x: left ? T.bx0 : T.bx1, y: 180 + rng() * 200, vx: 0, vy: 0, st: 1, winded: 0, landed: false, warnT: 0 });
            b.brain = { state: 'cruise', T: 3 + rng() * 3, tx: 1200, ta: 350, knownAge: 99, known: 0, wander: 0 };
          }
          continue;
        }
        if (b.mode !== 'fly') continue;
        const hin = b.letter && env.versus && inH ? inH : aiFlier(env, b, G, b.letter ? skill : 0.25, dt);
        const ev = stepFlier(env, b, hin, dt, b.letter && env.gentle[1]);
        if (ev === 'winded' && b.letter) { env.sfx('pant'); fx.say('Tired!', b.x, b.y - 90); }
        art.animate(b.c, dt, b.vx, b.vy);
        animFlier(b);
      }
      art.animate(G.c, dt, G.vx, 0);
      animGrumley();
      if (self.time <= 0) {
        self.done = true;
        self.outcome = 'kept';
      }
    },
    draw(g, tt) {
      art.drawScene(g, 'scenes/grumley', W, H);
      drawBasket(g, tt);
      drawRipples(g);
      const things = [
        ...bubbles.map((b) => ({ y: b.y, draw: () => drawBubble(g, b) })),
        ...decoys.map((d) => ({ y: d.lane, draw: () => drawDecoy(g, d, tt) })),
        ...birds.filter((b) => !b.gone && b.mode === 'fly').map((b) => ({ y: b.lane, draw: () => drawFlier(g, b, tt) })),
        { y: G.y, draw: () => drawGrumley(g, tt) },
      ].sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      if (L.mode === 'grabbed' && !hideLetter()) drawFlier(g, L, tt);
      for (const f of flying) drawLunchFlight(g, f);
      drawDrops(g);
      if (net) drawNet(g);
      fx.draw(g);
      if (t < 3.5 && !self.done) hint(g, env.versus ? 'Grumley: lurk, then lunge when he dips! · Bombanat: watch the bubbles!' : 'Keep still, then lunge when the Bombanat with the letter dips low!', W);
    },
    marks() {
      const elapsed = total - self.time;
      return marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: elapsed / total, bonus: Math.min(4, self.bonus) });
    },
    hud: () => `Lunch ${self.bonus}`,
  };

  // ---------- particles ----------

  function stepParticles(dt) {
    for (const b of bubbles) b.t += dt;
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].t > bubbles[i].life + 0.18) bubbles.splice(i, 1);
    for (const r of ripples) r.t += dt;
    while (ripples.length && ripples[0].t > 1.1) ripples.shift();
    if (ripples.length > 80) ripples.splice(0, ripples.length - 80);
    for (const d of drops) { d.t += dt; d.vy += 1400 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].t > 1.4 || drops[i].y > H + 40) drops.splice(i, 1);
    for (const f of flying) f.t += dt;
    for (let i = flying.length - 1; i >= 0; i--) {
      if (flying[i].t >= 0.9) {
        flying.splice(i, 1);
        basketKick = 1;
        env.sfx('thump');
      }
    }
    basketKick = Math.max(0, basketKick - dt * 3);
  }

  // ---------- the outro ----------

  function outro(dt) {
    outroT += dt;
    if (self.outcome === 'snatched') {
      const c = G.c;
      // Three seconds (outroTime): triumph, a beaming celebration, and then,
      // as in the book, SNAP! the fishing net comes down and hauls him up.
      if (!net && outroT >= 1.0) { net = { y: -380, phase: 'down' }; env.sfx('swoosh'); }
      if (!net || net.phase === 'down') {
        if (outroT < 0.8) art.setAnim(c, 'triumph');
        else {
          if (c.anim !== 'celebrate') { env.sfx('cheer'); art.kick(c, 0.4); }
          art.setAnim(c, 'celebrate');
        }
      }
      if (!net) { /* the net is still to come */ } else if (net.phase === 'down') {
        net.y += 800 * dt;
        if (net.y >= G.y - 180) {
          net.phase = 'up';
          art.setAnim(c, 'netted');
          art.kick(c, 0.6);
          env.sfx('snap');
          env.vibrate(80);
          fx.say('SNAP!', G.x, G.y - 420);
          splash(G.x, G.y - 10, 14, 1);
        }
      } else c.z += 330 * dt;
      art.animate(c, dt, 0, 0);
    } else {
      // The Bombanat loops the loop and flies off with the letter.
      const c = L.c;
      if (outroT < 0.7) art.setAnim(c, 'celebrate');
      else {
        art.setAnim(c, 'flap');
        L.x += 420 * dt;
        L.y -= 260 * dt;
      }
      art.animate(c, dt, outroT < 0.7 ? 0 : 420, 0);
      art.setAnim(G.c, 'splutter');
      art.animate(G.c, dt, 0, 0);
    }
  }
  // The letter Bombanat is in the Grumley's celebrate and netted poses.
  const hideLetter = () => self.outcome === 'snatched' && outroT >= 0.5;

  // ---------- drawing ----------

  function drawBasket(g) {
    const sp = art.prop('grumley', basketFull ? 5 : 4);
    const sq = basketKick > 0 ? Math.sin(basketKick * Math.PI) * 0.15 : 0;
    art.drawSprite(g, sp, 228, 612, { height: 120, sx: 1 + sq, sy: 1 - sq });
  }

  function drawRipples(g) {
    g.save();
    g.lineWidth = 3;
    for (const r of ripples) {
      const a = 1 - r.t / 1.1;
      const k = depthK(r.y);
      const R = (r.big ? 60 : 30) + r.t * (r.big ? 220 : 110);
      g.strokeStyle = `rgba(226,244,255,${(r.big ? 0.7 : 0.45) * a})`;
      g.beginPath();
      g.ellipse(r.x, r.y + 6, R * k, R * 0.22 * k, 0, 0, Math.PI * 2);
      g.stroke();
    }
    // The V of the wake behind him while he glides.
    const sp = Math.hypot(G.vx, G.vy);
    if (sp > 40 && (G.mode === 'lurk')) {
      const a = Math.min(0.8, sp / 400);
      const k = depthK(G.y);
      const back = -Math.sign(G.vx || G.facing);
      g.strokeStyle = `rgba(240,250,255,${a})`;
      g.lineWidth = 5;
      g.lineCap = 'round';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(G.x + back * 60 * k, G.y + 4);
        g.quadraticCurveTo(G.x + back * 160 * k, G.y + 4 + s * 18 * k, G.x + back * (230 + sp * 0.3) * k, G.y + 4 + s * 40 * k);
        g.stroke();
      }
    }
    g.restore();
  }

  function drawBubble(g, b) {
    const k = depthK(b.y);
    if (b.t > b.life) {
      art.drawSprite(g, art.prop('bombanat', 4), b.x, b.y + 6, { height: 52 * b.s * k, alpha: 1 - (b.t - b.life) / 0.18 });
      return;
    }
    const grow = Math.min(1, b.t / b.life);
    const item = grow < 0.4 ? 1 : grow < 0.8 ? 2 : 3;
    const h = (18 + 34 * grow) * b.s * k;
    if (!art.drawSprite(g, art.prop('bombanat', item), b.x, b.y + 4, { height: h })) {
      g.save();
      g.fillStyle = 'rgba(150,200,240,0.8)';
      g.beginPath(); g.ellipse(b.x, b.y - h / 2, h * 0.55, h / 2, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  function drawDecoy(g, d, tt) {
    const k = 0.7;
    // Its shadow on the goo.
    g.save(); g.globalAlpha = 0.14; g.fillStyle = '#10304a';
    g.beginPath(); g.ellipse(d.x, d.lane, 60, 12, 0, 0, Math.PI * 2); g.fill(); g.restore();
    const rot = Math.sin(tt * 2.3 + d.ph) * (d.item === 1 ? 0.25 : 0.15);
    art.drawSprite(g, art.prop('grumley', d.item), d.x, d.y, { height: (d.item === 1 ? 170 : 140) * k / 0.7 * 0.8, ay: 0.4, rot });
  }

  function drawFlier(g, b, tt) {
    const c = b.c;
    c.x = b.x;
    c.y = b.y;
    if (b.mode === 'grabbed' && b === L) {
      // Held up in the Grumley's claw.
      const k = depthK(G.y);
      c.x = G.x + G.facing * 110 * k;
      c.y = G.y - 300 * k;
      c.facing = -G.facing;
    }
    if (b.mode === 'fly') {
      // Shadow on the goo.
      const alt = altOf(b);
      g.save(); g.globalAlpha = 0.22 * Math.max(0.25, 1 - alt / 600); g.fillStyle = '#10304a';
      g.beginPath(); g.ellipse(b.x, b.lane, 70 * c.sizeK, 13 * c.sizeK, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    g.save();
    if (!b.letter) g.filter = 'saturate(0.45) brightness(1.08)';
    art.drawCreature(g, c, tt, { reduceMotion: env.reduceMotion, shadow: false });
    g.restore();
    if (b.letter && b.mode === 'fly') {
      // The letter he carries, shown clearly over his head.
      const img = art.image('ui/letter');
      const bob = env.reduceMotion ? 0 : Math.sin(tt * 4) * 6;
      const y = b.y - 150 + bob;
      g.save();
      g.fillStyle = 'rgba(248,241,224,0.9)';
      g.strokeStyle = '#c8443a';
      g.lineWidth = 4;
      g.beginPath(); g.arc(b.x, y, 36, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#c8443a';
      g.beginPath(); g.moveTo(b.x - 10, y + 34); g.lineTo(b.x + 10, y + 34); g.lineTo(b.x, y + 50); g.closePath(); g.fill();
      if (img) g.drawImage(img, b.x - 28, y - 28, 56, 56);
      g.restore();
      // A ring showing his wing stamina.
      g.save();
      g.lineWidth = 6;
      g.strokeStyle = 'rgba(40,25,20,0.3)';
      g.beginPath(); g.arc(b.x, y, 44, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = b.winded > 0 ? '#8f8a86' : b.st < 0.3 ? '#c8443a' : '#f2c53d';
      g.beginPath(); g.arc(b.x, y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (b.winded > 0 ? 1 : b.st)); g.stroke();
      g.restore();
    }
  }

  function drawGrumley(g, tt) {
    const c = G.c;
    const k = depthK(G.y);
    c.sizeK = 0.62 * k;
    c.x = G.x;
    c.y = G.y + 28 * k;
    c.facing = G.facing;
    const sunk = G.mode === 'lurk' && G.still > 1.2;
    c.alpha += ((sunk ? 0.5 : 1) - c.alpha) * 0.08;
    // Reach marker: how high the claw would go now.
    if (G.mode === 'lurk' && !self.done) {
      const R = reachNow();
      const full = G.charge >= T.chargeTime;
      g.save();
      g.globalAlpha = full ? 0.45 + 0.15 * Math.sin(tt * 6) : 0.28;
      g.strokeStyle = '#f8f1e0';
      g.lineWidth = 4;
      g.setLineDash([10, 14]);
      g.beginPath(); g.moveTo(G.x, G.y - 120 * k); g.lineTo(G.x, G.y - R); g.stroke();
      g.setLineDash([]);
      g.lineWidth = 6;
      g.strokeStyle = full ? '#f2c53d' : '#f8f1e0';
      g.beginPath(); g.moveTo(G.x - 22, G.y - R + 14); g.lineTo(G.x, G.y - R); g.lineTo(G.x + 22, G.y - R + 14); g.stroke();
      g.restore();
    }
    const rising = G.mode === 'lunge' || G.mode === 'won' || (self.done && self.outcome === 'snatched');
    if (G.mode === 'lunge' && G.lunge) {
      // The claw rises out of the goo up to the tip: a lunge pose, risen from
      // below the goo and stretched for a long reach.
      const sp = art.sprite('grumley.poses', c.M.poses[c.anim === 'rise' ? 'rise' : 'lunge']);
      const above = G.y - G.lunge.tip + 30;
      const natural = 586 * (260 / 229) * c.sizeK;
      const sy = Math.max(1, Math.min(1.7, above / natural));
      const drawn = natural * sy;
      const bottom = G.y + 30 + Math.max(0, drawn - above);
      g.save();
      g.beginPath(); g.rect(0, 0, W, G.y + 26); g.clip();
      if (!art.drawSprite(g, sp, G.x, bottom, { height: natural, sy, sx: 1 - (sy - 1) * 0.15, flip: G.facing < 0 })) {
        g.fillStyle = '#c4913a'; g.fillRect(G.x - 40, G.lunge.tip, 80, G.y - G.lunge.tip);
      }
      g.restore();
      art.drawSprite(g, art.prop('grumley', 6), G.x, G.y + 40 * k, { height: 95 * k });
    } else if (rising) {
      // Out of the goo: triumph, celebrate, netted.
      c.sizeK = 0.5 * k;
      g.save();
      if (c.z < 40) { g.beginPath(); g.rect(0, 0, W, G.y + 30); g.clip(); }
      c.y = G.y + 60 * k;
      art.drawCreature(g, c, tt, { reduceMotion: env.reduceMotion, shadow: false });
      g.restore();
      if (c.z < 200) art.drawSprite(g, art.prop('grumley', 6), G.x, G.y + 40 * k, { height: 95 * k, alpha: 1 - c.z / 200 });
    } else {
      art.drawCreature(g, c, tt, { reduceMotion: env.reduceMotion, shadow: false });
    }
  }

  function drawNet(g) {
    const c = G.c;
    const top = net.phase === 'down' ? net.y - 280 : G.y - 290 * depthK(G.y) - c.z;
    g.save();
    g.strokeStyle = '#3a2a1e';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(G.x, -10); g.lineTo(G.x, top); g.stroke();
    g.restore();
    if (net.phase === 'down') art.drawSprite(g, art.prop('grumley', 7), G.x, net.y, { height: 300 });
  }

  function drawDrops(g) {
    g.save();
    for (const d of drops) {
      g.globalAlpha = Math.max(0, 1 - d.t / 1.4);
      g.fillStyle = '#4f8fd0';
      g.strokeStyle = '#1c3c66';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * 1.25, Math.atan2(d.vy, d.vx) + Math.PI / 2, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
  }

  function drawLunchFlight(g, f) {
    // A plain Bombanat sails over to the lunch basket on the shore.
    const u = Math.min(1, f.t / 0.9);
    const x = f.x0 + (228 - f.x0) * u;
    const y = f.y0 + (560 - f.y0) * u - Math.sin(u * Math.PI) * 260;
    const sp = art.sprite('bombanat.poses', 7);
    g.save();
    g.filter = 'saturate(0.45) brightness(1.08)';
    art.drawSprite(g, sp, x, y, { height: 110 * (1 - u * 0.5), ay: 0.5, rot: u * 6 });
    g.restore();
  }

  return self;
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

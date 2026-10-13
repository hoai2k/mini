// Board 8: SNIP! The Letter-Eating Bombanat, out of the sky over the open
// ground at the edge of Nowhere, after the running Trollusk (design/adventure.md,
// board 8). Board 2 is the Bombanat weaving through a wood; this one is the
// opposite: open sky, big vertical space, speed and height.
//
// The toy is flight: Action is a wing beat (momentum, so a run of beats swims
// up through the air), between beats he glides and sinks, Down tucks the wings
// for a dive that gains speed, letting go of Down swoops that speed back into
// height, Sprint is hard wingbeats on a stamina ring, and too slow is a stall.
// Warm air rises off the ground in visible columns and lifts him for free
// (ride one up for a big dive); dark rain clouds soak his wings heavy. The
// Yalapappus stomps along behind the Trollusk throwing his fork, rocks and goo
// up at him (a wind-up pose, then a dotted arc), crows cross the sky, and in
// the bushes at the end a butterfly net pokes up now and then (the Grithix,
// unseen: board 9 is coming).
//
// The Trollusk runs right across the open ground with the letter, no cover,
// so it is all dodging: he dodges a dive he sees coming. He notices a dive
// aimed at him from NOTICE px away and needs react(stamina) seconds to hop
// clear, so a dive that arrives faster than that (come fast, from high up)
// snatches, and a tired Trollusk reacts slowly, a winded one not at all.

import * as art from '../art.js';
import * as kit from './kit.js';
import { staminaRing } from '../chasedraw.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';

const { W, H, clamp, ease, approach } = kit;

const WORLD_W = 11200;
const GROUND = 960;        // the ground line (feet of the runners)
const CEILING = 230;       // the Bombanat's middle can't go higher (under the HUD)
const FLOOR = GROUND - 80; // his middle when he is on the ground
const NOTICE = 400;        // from how far the Trollusk notices a dive aimed at him
const DODGE_AT = 0.2;      // he hops clear this many seconds before impact
const THROW_G = 1300;      // gravity of thrown things

// Sections, by world x: the start, the thermals and the Yalapappus, the rain
// clouds, the crows, the bushes with the net.
const SIGNS = [
  { x: 2400, text: 'TO NOWHERE' },
  { x: 4800, text: 'RAIN AHEAD' },
  { x: 7200, text: 'BACK AGAIN' },
  { x: 9400, text: 'THE EDGE OF NOWHERE' },
];
const THERMALS = [1500, 2900, 3700, 4400, 6350, 8800, 10300];
const CLOUDS = [{ home: 5200, y: 400 }, { home: 6000, y: 360 }, { home: 6750, y: 420 }];
const CROWS = [
  { x: 7300, y: 330 }, { x: 8000, y: 600 }, { x: 8700, y: 420 }, { x: 9400, y: 720 },
];
const CROW_X0 = 6900, CROW_X1 = 9700;
const BUSHES = [9350, 9650, 9950, 10250, 10550, 10850, 11100];
const BOULDERS = [{ x: 1900, item: 1 }, { x: 3300, item: 2 }, { x: 5600, item: 1 }, { x: 7900, item: 2 }, { x: 10050, item: 1 }];
const PALMS = [700, 2200, 3100, 4100, 5000, 5900, 6600, 7500, 8400, 9200, 10700];
const BENT_TREES = [8000, 11050];
const KITE = { x: 4100, y: 380 };

function scrapList() {
  const list = [];
  const add = (x, y) => list.push({ x, y, kind: list.length % 7 === 6 ? 'roll' : 'scrap' });
  for (let i = 0; i < 4; i++) add(600 + i * 350, 790);                      // the opening string
  for (const y of [700, 560, 420, 300]) add(1500, y);                        // up the first thermal
  for (const tx of [2900, 3700, 4400]) for (const y of [560, 400, 290]) add(tx, y);
  add(3300, 800); add(4100, 800);
  for (const c of CLOUDS) add(c.home, 250);                                  // over the clouds
  for (const x of [5600, 6400, 7000]) add(x, 820);                           // under them, between the rain
  for (const y of [560, 400, 290]) add(6350, y);
  for (let i = 0; i < 4; i++) add(7300 + i * 400, 500);                      // among the crows
  for (const y of [560, 400, 290]) add(8800, y);
  for (let i = 0; i < 4; i++) add(9500 + i * 400, 800);                      // among the bushes (risky)
  list.push({ x: 11000, y: 600, kind: 'roll' });                             // the captain's note itself
  return list;
}

export default function create(env) {
  art.preload(['bombanat.poses', 'bombanat.moves', 'trollusk.poses', 'trollusk.moves', 'yalapappus.poses', 'yalapappus.moves',
    'props.yalapappus', 'props.bombanat', 'props.trollusk', 'props.grithix', 'props.grumley', 'adv.b08.props', 'terrain.nowhere',
    'adv/b08/backdrop-1', 'adv/b08/backdrop-2', 'adv/b08/backdrop-3', 'scenes/yalapappus']);
  const gentle = !!env.gentle?.[0];
  const rng = env.rng;
  const cam = kit.makeCamera(WORLD_W, { lead: 0, anchor: 0.42, rate: 3.4 });
  const fx = kit.makeParticles();
  const cps = kit.makeCheckpoints([0, ...SIGNS.map((s) => s.x)]);
  const hints = makeBandHints([
    { x: 0, text: 'Action: flap · Down: dive, let go to swoop up', show: 5 },
    { x: 1150, text: 'Warm air rising: ride it up for height', show: 4 },
    { x: 2500, text: 'The Yalapappus is throwing things! Mind the dotted arcs', show: 4.5 },
    { x: 4850, text: 'Dark clouds: the rain soaks your wings', show: 4 },
    { x: 7050, text: 'Crows! Fly round them', show: 3.5 },
    { x: 9250, text: 'Something in the bushes... dive fast, from high up!', show: 4.5 },
  ]);
  const solids = [{ x: -400, y: GROUND, w: WORLD_W + 800, h: 400 }];

  // The Bombanat: (x, y) is his middle; he hangs from it.
  const b = {
    x: 420, y: 560, vx: 300, vy: 0, facing: 1, st: 1, winded: 0, sprinting: false,
    mode: 'fly', modeT: 0,   // fly | dive | swoop | stall | tumble | netted | ground
    swoopT: 0, slowT: 0, soaked: 0, flapT: 0, diveT: 0, diveFrom: 0, inThermal: false, inRain: false,
    hits: 0, netted: 0, flapCool: 0, lastFlap: 0,
  };
  const bc = art.makeCreature('bombanat', b.x, b.y);
  bc.sizeK = 1.05;

  // The Trollusk: feet at (x, GROUND), hopping with z.
  const h = {
    x: 1000, vx: 255, facing: 1, z: 0, vz: 0, st: 1, winded: 0, sprinting: false,
    seen: 0, dodgeT: 0, dodgeCool: 0, dodgeDir: 1, back: false, jinkT: 0, noticed: false, dodges: 0, pantT: 0,
    speed: 255, sprint: 460, windedSpeed: 150,
  };
  const hc = art.makeCreature('trollusk', h.x, GROUND);
  hc.sizeK = 0.9;

  // The Yalapappus: stomps along behind the Trollusk, throwing things.
  const y = { x: 250, vx: 0, facing: 1, state: 'stomp', T: 0, throwT: 3.5, aim: null, kind: 'fork', stomp: 0 };
  const yc = art.makeCreature('yalapappus', y.x, GROUND);
  yc.sizeK = 0.95;

  const clouds = CLOUDS.map((c, i) => ({ ...c, x: c.home, phase: i * 2.1, rumbled: false }));
  const crows = CROWS.map((c, i) => ({ ...c, vx: -(170 + (i % 3) * 25), bump: 0, seed: i * 1.3 }));
  const bushes = BUSHES.map((x, i) => ({ x, item: i % 2, rustle: 0, net: 0, netT: 0, active: false, holds: false, w: 180 }));
  let netTimer = 2.5;
  const shots = [];     // thrown things in the air
  const stuck = [];     // forks and rocks lying where they landed
  const pickups = kit.makePickups(scrapList(), { radius: 78 });

  let t = 0;
  let outroT = 0;
  let snatchAt = null;

  const self = {
    time: kit.boardTime(env, 90),
    elapsed: 0,
    done: false,
    outcome: null,
    outroTime: 2.2,
    // The board's innards, for the autopilot and the tests.
    b, h, y, bc, hc, yc, cam, clouds, crows, bushes, shots, pickups, THERMALS, GROUND, CEILING, WORLD_W,
    get hits() { return b.hits; },
    focus: () => [{ x: b.x - cam.x, y: b.y }],
    hud: () => `Scraps ${pickups.count}/${pickups.total}`,
    marks: () => kit.boardMarks({ snatched: self.outcome === 'snatched', got: pickups.count, total: pickups.total, need: 0.55, feat: b.hits === 0 }),
    update(dt, inp) {
      t += dt;
      inp = inp || {};
      fx.update(dt);
      if (self.done) { outro(dt); return; }
      self.time = Math.max(0, self.time - dt);
      self.elapsed += dt;
      stepBombanat(dt, inp);
      stepTrollusk(dt);
      stepYalapappus(dt);
      stepHazards(dt);
      const got = pickups.update(dt, b.x, b.y);
      if (got) { env.sfx('pickup'); fx.pop(b.x, b.y - 120, '+' + got, { size: 40 }); }
      hints.update(dt, b.x);
      const cp = cps.last;
      if (cps.reach(b.x) !== cp) env.sfx('checkpoint');
      // The camera frames the flier and the runner together.
      const cx = b.x + clamp(h.x - b.x, -600, 700) * 0.45;
      cam.follow(cx, 0, dt, t < dt * 1.5);
      if (self.time <= 0) { self.done = true; self.outcome = 'kept'; }
    },
    draw(g, tt) { draw(g, tt); },
  };

  // ---------- the Bombanat ----------

  function flap(strength = 1) {
    const k = (b.soaked > 0 ? 0.55 : 1) * strength;
    b.vy = Math.max(-640, Math.min(b.vy, 200) - 430 * k);
    b.flapT = 0.3;
    env.sfx('flap');
    if (b.soaked > 0 && Math.random() < 0.6) fx.burst(b.x, b.y + 40, { n: 3, colour: '#8fb4c8', speed: 160, size: 7, life: 0.4 });
  }

  function stepBombanat(dt, inp) {
    b.modeT += dt;
    b.winded = Math.max(0, b.winded - dt);
    b.soaked = Math.max(0, b.soaked - dt);
    b.flapT = Math.max(0, b.flapT - dt);
    b.swoopT = Math.max(0, b.swoopT - dt);
    const down = (inp.y || 0) > 0.5;
    const up = (inp.y || 0) < -0.5;
    const ix = inp.x || 0;
    // Warm air and rain.
    b.inThermal = b.y > 270 && THERMALS.some((tx) => Math.abs(b.x - tx) < 130);
    b.inRain = clouds.some((c) => Math.abs(b.x - c.x) < 185 && b.y > c.y + 70);
    if (b.inRain && b.mode !== 'ground') {
      if (b.soaked <= 0) { env.sfx('drip'); fx.pop(b.x, b.y - 130, 'Soaked!', { colour: '#4d6b8a', size: 44 }); hints.say('Soaked! Heavy wings: get out of the rain', 2.5); }
      b.soaked = gentle ? 2 : 3;
    }

    if (b.mode === 'netted') {
      // Held in the net: a shake, then let go with a flutter.
      b.vx = b.vy = 0;
      if (b.modeT > (gentle ? 0.9 : 1.2)) { b.mode = 'stall'; b.modeT = 0; b.vy = -200; }
      return finishBombanat(dt, ix);
    }
    if (b.mode === 'tumble') {
      // Knocked: he falls and spins until he catches himself.
      b.vy = Math.min(900, b.vy + 1400 * dt);
      b.vx *= Math.exp(-2.5 * dt);
      if (b.modeT > 0.75) { b.mode = 'fly'; b.modeT = 0; }
    } else if (b.mode === 'stall') {
      // The frantic flutter: falling, beating uselessly, until it passes.
      b.vy = Math.min(650, b.vy + 1200 * dt);
      b.vx *= Math.exp(-3 * dt);
      if (b.modeT > 0.6) { b.mode = 'fly'; b.modeT = 0; b.slowT = 0; }
    } else if (b.mode === 'ground') {
      // Wing-walking on his wrist claws, slow and undignified. A flap takes off.
      b.vx = approach(b.vx, ix * 90, 600 * dt);
      b.vy = 0;
      b.y = FLOOR;
      b.st = Math.min(1, b.st + 0.35 * dt);
      if (inp.actionPressed) { b.mode = 'fly'; b.modeT = 0; b.vy = -560; b.vx += b.facing * 120; b.flapT = 0.3; env.sfx('flap'); }
    } else {
      // In the air: fly, dive, swoop.
      const sinkK = b.soaked > 0 ? 2.6 : 1;
      if (down && b.mode !== 'dive') { b.mode = 'dive'; b.modeT = 0; b.diveFrom = b.y; b.diveT = 0; env.sfx('swoosh'); }
      if (!down && b.mode === 'dive') {
        // Let go: the speed of the dive becomes height.
        const sp = Math.max(0, b.vy);
        b.mode = sp > 500 ? 'swoop' : 'fly'; b.modeT = 0;
        b.vy = -sp * (sp > 500 ? (b.soaked > 0 ? 0.45 : 0.72) : 0.25);
        b.vx += b.facing * sp * (sp > 500 ? 0.28 : 0.1);
        b.swoopT = 0.25; // a moment in which a swoop still snatches
        if (sp > 500) { env.sfx('whoosh'); fx.burst(b.x, b.y + 30, { n: 6, colour: '#e9ddf0', speed: 240, up: 0.2, size: 9, life: 0.4, gravity: 0 }); }
      }
      if (b.mode === 'dive') {
        b.diveT += dt;
        b.vy = Math.min(1500, b.vy + 1900 * dt);
        b.vx = ease(b.vx, ix * 640 + (ix ? 0 : b.vx * 0.9), 3, dt);
        if (ix) b.facing = Math.sign(ix);
      } else {
        if (b.mode === 'swoop' && (b.vy >= -60 || b.modeT > 0.9)) { b.mode = 'fly'; b.modeT = 0; }
        // Sprint: hard wingbeats on the stamina ring.
        const canSprint = !!inp.sprint && b.winded <= 0 && b.st > 0 && b.soaked <= 0;
        b.sprinting = canSprint;
        const cruise = b.sprinting ? 620 : 360;
        const wantX = ix ? ix * cruise : (b.sprinting ? b.facing * cruise : b.vx * 0.985);
        b.vx = ease(b.vx, wantX, b.sprinting ? 2.4 : 1.3, dt);
        if (ix) b.facing = Math.sign(ix);
        // Glide: sink gently; nose up holds height but bleeds speed.
        const sink = b.inThermal ? -350 : up ? -20 : 110 * sinkK;
        b.vy = ease(b.vy, sink, b.mode === 'swoop' ? 0.8 : 2.6, dt);
        if (up) b.vx *= Math.exp(-0.9 * dt);
        if (b.sprinting) b.vy = Math.min(b.vy, 40);
        if (inp.actionPressed) flap(b.mode === 'swoop' ? 0.6 : 1);
        if (b.sprinting) {
          b.st = Math.max(0, b.st - 0.38 * dt * (gentle ? 0.7 : 1));
          if (b.st <= 0) { b.winded = 2; b.sprinting = false; env.sfx('pant'); fx.pop(b.x, b.y - 120, 'Puffed!', { size: 40 }); }
          if (Math.random() < dt * 14) flapPuff();
        }
      }
      // Warm air: free lift, and a rest for the wings.
      if (b.inThermal) {
        b.vy = Math.max(b.vy - 780 * dt, Math.min(b.vy, -480));
        if (Math.random() < dt * 10) fx.burst(b.x + (Math.random() - 0.5) * 160, b.y + 120, { n: 1, colour: '#e0c56a', speed: 60, up: 1, size: 6, life: 0.9, gravity: -160, ink: false });
      }
      // Too slow is a stall.
      const speed = Math.hypot(b.vx, b.vy);
      b.slowT = speed < 115 && !b.inThermal && b.mode === 'fly' && b.flapT <= 0 ? b.slowT + dt : 0;
      if (b.slowT > 0.45) { b.mode = 'stall'; b.modeT = 0; b.slowT = 0; env.sfx('flap'); fx.pop(b.x, b.y - 120, 'Flutter!', { size: 38 }); }
    }
    // Stamina comes back gliding, faster in warm air.
    if (!b.sprinting && b.mode !== 'ground') b.st = Math.min(1, b.st + (b.inThermal ? 0.5 : 0.14) * dt);
    finishBombanat(dt, ix);
  }

  function flapPuff() {
    fx.burst(b.x - b.facing * 60, b.y + 20, { n: 1, colour: 'rgba(240,230,245,0.8)', speed: 120, up: 0.3, size: 8, life: 0.35, gravity: 0, ink: false });
  }

  function finishBombanat(dt, ix) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 120) { b.x = 120; b.vx = Math.max(0, b.vx); }
    if (b.x > WORLD_W - 120) { b.x = WORLD_W - 120; b.vx = Math.min(0, b.vx); }
    if (b.y < CEILING) { b.y = CEILING; b.vy = Math.max(0, b.vy); if (b.mode === 'swoop') { b.mode = 'fly'; b.modeT = 0; } }
    if (b.y >= FLOOR && b.mode !== 'netted') {
      // The ground. A dive that misses thumps into it; a gentle sink lands.
      const hard = b.vy > 650;
      b.y = FLOOR;
      if (hard) {
        b.vy = -b.vy * 0.35; b.mode = 'tumble'; b.modeT = 0.25;
        env.sfx('thump'); env.vibrate(40); cam.shake(8, env.reduceMotion);
        fx.burst(b.x, GROUND, { n: 10, colour: '#d9c08a', speed: 260, up: 0.7, size: 12, life: 0.5 });
        fx.pop(b.x, b.y - 140, 'Oof!', { size: 42 });
        art.kick(bc, 0.5);
      } else if (b.mode !== 'tumble' && b.mode !== 'stall' && b.mode !== 'ground' && b.mode !== 'dive') {
        b.mode = 'ground'; b.modeT = 0; b.vy = 0; env.sfx('land'); art.kick(bc, 0.35);
        fx.burst(b.x, GROUND, { n: 5, colour: '#d9c08a', speed: 160, up: 0.6, size: 9, life: 0.4 });
      } else if (b.mode === 'dive') {
        b.mode = 'ground'; b.modeT = 0; b.vy = 0; env.sfx('land');
      } else if (b.mode !== 'ground') { b.vy = Math.min(b.vy, 0); if (b.modeT > 0.5) { b.mode = 'ground'; b.modeT = 0; } }
    }
    // Animation.
    bc.x = b.x; bc.y = b.y;
    art.animate(bc, dt, b.vx, b.vy);
    if (b.mode === 'ground') bc.facing = ix ? Math.sign(ix) : bc.facing; else bc.facing = b.facing;
    const pitch = Math.atan2(b.vy, Math.max(140, Math.abs(b.vx)));
    let anim = 'glide', rot = clamp(pitch * 0.5, -0.4, 0.55);
    if (b.mode === 'netted') { anim = 'netted'; rot = 0; }
    else if (b.mode === 'tumble') { anim = 'tumble'; rot = Math.sin(b.modeT * 14) * 0.5; }
    else if (b.mode === 'stall') { anim = 'stall'; rot = Math.sin(b.modeT * 20) * 0.2; }
    else if (b.mode === 'ground') { anim = Math.abs(b.vx) > 20 ? 'walk' : (b.modeT > 1.2 ? 'perched' : 'land'); rot = 0; }
    else if (b.mode === 'dive') { anim = 'dive'; rot = clamp(pitch - 0.75, -0.3, 0.85); }
    else if (b.mode === 'swoop') { anim = 'pullUp'; rot = clamp(pitch * 0.6, -0.6, 0.2); }
    else if (b.soaked > 0) { anim = b.flapT > 0 ? 'flap' : 'soaked'; }
    else if (b.winded > 0) { anim = 'stall'; rot = 0.1; }
    else if (b.sprinting) { anim = 'flap'; bc.M.anims.flap.fps = 16; }
    else if (b.flapT > 0) { anim = 'flap'; bc.M.anims.flap.fps = 11; }
    art.setAnim(bc, anim);
    bc.rot = bc.facing * rot;
  }

  // ---------- the Trollusk ----------

  const react = () => (gentle ? 0.5 : 0.33) + 0.45 * (1 - h.st);

  function stepTrollusk(dt) {
    h.dodgeCool = Math.max(0, h.dodgeCool - dt);
    h.winded = Math.max(0, h.winded - dt);
    h.pantT = Math.max(0, h.pantT - dt);
    const bodyY = GROUND - 95 - h.z;
    // A dive aimed at him, that he can see coming.
    let aimed = false, tti = 9;
    if (b.mode === 'dive') {
      tti = (bodyY - b.y) / Math.max(300, b.vy);
      if (tti > 0 && tti < 1.2) {
        const xAt = b.x + b.vx * tti;
        aimed = Math.abs(xAt - (h.x + h.vx * tti)) < 170 && Math.hypot(b.x - h.x, b.y - bodyY) < NOTICE;
      }
    }
    h.seen = aimed ? h.seen + dt : 0;
    h.noticed = aimed && h.seen > react() * 0.5;
    if (aimed && h.seen >= react() && tti <= DODGE_AT && h.dodgeCool <= 0 && h.winded <= 0 && h.dodgeT <= 0 && h.z <= 0) {
      // A hop clear: forward if the dive comes from behind, else back.
      h.dodgeDir = (b.x < h.x ? 1 : -1) * (rng() < 0.85 ? 1 : -1);
      if (h.x < 300) h.dodgeDir = 1;
      if (h.x > WORLD_W - 300) h.dodgeDir = -1;
      h.dodgeT = 0.35; h.dodgeCool = 1.5; h.vz = 300;
      h.st = Math.max(0, h.st - 0.14);
      h.dodges++;
      env.sfx('dodge');
      fx.pop(h.x, GROUND - 260, 'Missed!', { colour: '#b3402e', size: 44 });
      hints.say('He dodged! Dive faster, from higher up (or tire him out)', 2.6);
    }
    // Running: right across the open ground, back and forth at the end.
    const threat = Math.abs(b.x - h.x) < 560 && b.y > 560 && b.mode !== 'ground' && b.mode !== 'netted';
    if (h.x > WORLD_W - 520) h.back = true;
    if (h.x < WORLD_W - 1500) h.back = false;
    const dir = h.back ? -1 : 1;
    h.sprinting = threat && h.winded <= 0 && h.st > 0 && h.dodgeT <= 0;
    let top = h.sprinting ? h.sprint : h.speed;
    if (h.winded > 0) top = h.windedSpeed;
    if (h.dodgeT > 0) { h.dodgeT -= dt; h.vx = h.dodgeDir * 660; }
    else h.vx = approach(h.vx, dir * top, 2600 * dt);
    if (h.sprinting) {
      h.st = Math.max(0, h.st - 0.22 * dt);
      if (h.st <= 0) { h.winded = 2.4; h.sprinting = false; env.sfx('pant'); fx.pop(h.x, GROUND - 250, 'Puffed out!', { size: 40 }); }
    } else h.st = Math.min(1, h.st + (h.winded > 0 ? 0.05 : 0.12) * dt);
    if (h.winded > 0 && h.pantT <= 0) { h.pantT = 0.7; env.sfx('pant'); }
    // Hops over the boulders in his way.
    if (h.z <= 0 && h.vz <= 0) {
      const ahead = BOULDERS.find((r) => { const d = (r.x - h.x) * Math.sign(h.vx || 1); return d > 40 && d < 150; });
      if (ahead && Math.abs(h.vx) > 100) { h.vz = 640; env.sfx('jump'); }
    }
    h.z += h.vz * dt;
    if (h.z > 0 || h.vz > 0) h.vz -= 2600 * dt;
    if (h.z <= 0 && h.vz < 0) { h.z = 0; h.vz = 0; art.kick(hc, 0.3); }
    h.x = clamp(h.x + h.vx * dt, 200, WORLD_W - 200);
    if (Math.abs(h.vx) > 20) h.facing = Math.sign(h.vx);
    // Stamps fly from his bag as he runs (cosmetic).
    if (Math.abs(h.vx) > 300 && Math.random() < dt * 1.2) fx.burst(h.x - h.facing * 50, GROUND - 120, { n: 1, colour: '#e0b64a', speed: 120, up: 0.9, size: 9, life: 0.7, gravity: 500 });
    hc.x = h.x; hc.y = GROUND; hc.z = h.z;
    art.animate(hc, dt, h.vx, 0);
    hc.facing = h.facing;
    art.setAnim(hc, h.dodgeT > 0 ? 'skid' : h.z > 0 ? 'jump' : h.winded > 0 ? (Math.abs(h.vx) > 40 ? 'sneak' : 'wail') : Math.abs(h.vx) > 320 ? 'run' : 'sneak');
    // The snatch: a fast dive (or the swoop right after it) that reaches him.
    const diving = (b.mode === 'dive' && b.vy > 650) || (b.swoopT > 0 && b.mode !== 'dive');
    const reach = Math.hypot(b.x - h.x, b.y - bodyY) < 120;
    if (reach && h.dodgeT <= 0 && !self.done) {
      if (diving) snatch();
      else if (b.mode === 'fly' && b.modeT > 0.3 && Math.abs(b.vy) < 400) {
        // A slow drift into him: he shoves the Bombanat off. No snatch without a dive.
        b.mode = 'tumble'; b.modeT = 0; b.vx = -b.facing * 420; b.vy = -260;
        env.sfx('bonk'); fx.pop(h.x, GROUND - 260, 'Shoo!', { colour: '#b3402e', size: 44 });
        hints.say('Dive on him! (Down, from up high)', 2.4);
      }
    }
  }

  function snatch() {
    self.done = true;
    self.outcome = 'snatched';
    snatchAt = { x: h.x, y: GROUND - 95 };
    b.mode = 'fly'; b.modeT = 0;
    b.vy = -520; b.vx = b.facing * 420;
    env.sfx('snatch'); env.vibrate(120); cam.shake(10, env.reduceMotion);
    fx.pop(h.x, GROUND - 300, 'SNIP!', { colour: '#b3402e', size: 72, life: 1.6 });
    fx.burst(h.x, GROUND - 120, { n: 14, colour: '#e0b64a', speed: 320, up: 0.8, size: 10, life: 0.8, gravity: 600 });
    art.kick(hc, 0.5);
    art.kick(bc, -0.4);
  }

  // ---------- the Yalapappus ----------

  function stepYalapappus(dt) {
    y.T += dt;
    y.throwT -= dt;
    const target = clamp(h.x - 450, 200, WORLD_W - 200);
    if (y.state === 'stomp') {
      const d = target - y.x;
      const want = Math.abs(d) > 30 ? Math.sign(d) * Math.min(330, Math.abs(d) * 2) : 0;
      y.vx = approach(y.vx, want, 1400 * dt);
      // Wind up a throw when the Bombanat is near enough and in the air.
      const dx = b.x - y.x;
      if (y.throwT <= 0 && Math.abs(dx) < 1400 && b.mode !== 'ground' && b.y < GROUND - 200 && cam.sees(y.x, y.x, 100)) {
        y.state = 'windup'; y.T = 0; y.vx = 0;
        y.facing = Math.sign(dx) || 1;
        const kinds = ['fork', 'rock', 'goo'];
        y.kind = kinds[Math.floor(rng() * 3)];
        // Aim where he will be, if he keeps going as he is.
        const T = y.kind === 'fork' ? 0.95 : y.kind === 'rock' ? 1.3 : 1.5;
        const ax = clamp(b.x + b.vx * 0.5, 150, WORLD_W - 150), ay = clamp(b.y + b.vy * 0.25, CEILING, GROUND - 120);
        const hx = y.x + y.facing * 60, hy = GROUND - 210;
        y.aim = { x: ax, y: ay, hx, hy, T, vx: (ax - hx) / T, vy: (ay - hy) / T - 0.5 * THROW_G * T };
        env.sfx('gabble');
      }
    } else if (y.state === 'windup') {
      y.vx = 0;
      if (y.T > (gentle ? 0.95 : 0.75)) {
        const a = y.aim;
        const r = y.kind === 'fork' ? 34 : y.kind === 'rock' ? 36 : 40;
        shots.push({ kind: y.kind, x: a.hx, y: a.hy, vx: a.vx, vy: a.vy, r, t: 0, rot: 0, spin: (rng() - 0.5) * 8, arc: a });
        env.sfx(y.kind === 'goo' ? 'bubble' : 'swish');
        y.state = 'throw'; y.T = 0;
      }
    } else if (y.state === 'throw') {
      if (y.T > 0.35) { y.state = 'stomp'; y.T = 0; y.aim = null; y.throwT = (gentle ? 4.2 : 2.7) + rng() * 1.1; }
    }
    y.x = clamp(y.x + y.vx * dt, 200, WORLD_W - 200);
    if (Math.abs(y.vx) > 15) y.facing = Math.sign(y.vx);
    y.stomp += Math.abs(y.vx) * dt;
    if (y.stomp > 150) { y.stomp = 0; if (cam.sees(y.x)) env.sfx('step'); }
    yc.x = y.x; yc.y = GROUND;
    art.animate(yc, dt, y.vx, 0);
    yc.facing = y.facing;
    art.setAnim(yc, y.state === 'windup' ? 'shout' : y.state === 'throw' ? 'hop' : Math.abs(y.vx) > 25 ? 'chase' : 'idle');
  }

  // ---------- hazards: thrown things, clouds, crows, nets ----------

  function hitBombanat(what, kx, ky, pop) {
    if (b.mode === 'netted' || self.done) return;
    b.hits++;
    b.mode = 'tumble'; b.modeT = 0;
    b.vx = kx; b.vy = ky;
    env.sfx(what === 'goo' ? 'splash' : 'bonk'); env.vibrate(60); cam.shake(what === 'rock' ? 10 : 6, env.reduceMotion);
    fx.pop(b.x, b.y - 130, pop, { colour: '#b3402e', size: 48 });
    art.kick(bc, 0.6);
    bc.flash = 1;
  }

  function stepHazards(dt) {
    // Thrown things: a ballistic arc, a hit, or the ground.
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.t += dt;
      s.vy += THROW_G * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.rot += s.spin * dt;
      const hitR = s.r + (gentle ? 52 : 66);
      if (b.mode !== 'tumble' && Math.hypot(s.x - b.x, s.y - b.y) < hitR) {
        shots.splice(i, 1);
        if (s.kind === 'goo') { b.soaked = Math.max(b.soaked, 2); fx.burst(b.x, b.y, { n: 8, colour: '#5fb3c4', speed: 220, up: 0.5, size: 11, life: 0.5 }); }
        hitBombanat(s.kind, s.vx * 0.35, Math.max(-200, s.vy * 0.3), s.kind === 'goo' ? 'SPLAT!' : s.kind === 'fork' ? 'POKE!' : 'BONK!');
        continue;
      }
      if (s.y > GROUND - 10 || s.x < 50 || s.x > WORLD_W - 50) {
        shots.splice(i, 1);
        if (s.kind === 'goo') fx.burst(s.x, GROUND, { n: 7, colour: '#5fb3c4', speed: 200, up: 0.6, size: 10, life: 0.5 });
        else { stuck.push({ kind: s.kind, x: s.x, t: 0, rot: s.kind === 'fork' ? -0.4 + Math.random() * 0.8 : s.rot }); fx.burst(s.x, GROUND, { n: 5, colour: '#d9c08a', speed: 180, up: 0.7, size: 9, life: 0.4 }); }
        if (cam.sees(s.x)) env.sfx(s.kind === 'goo' ? 'splash' : 'thunk');
      }
    }
    for (let i = stuck.length - 1; i >= 0; i--) { stuck[i].t += dt; if (stuck[i].t > 12) stuck.splice(i, 1); }
    // The clouds drift about their homes.
    for (const c of clouds) {
      c.x = c.home + Math.sin(t * 0.22 + c.phase) * 220;
      if (!c.rumbled && cam.sees(c.x, c.x, 0)) { c.rumbled = true; env.sfx('thunder'); }
    }
    // Crows cross the sky, right to left, round and round their stretch.
    for (const c of crows) {
      c.x += c.vx * dt;
      if (c.x < CROW_X0) c.x += CROW_X1 - CROW_X0;
      c.bump = Math.max(0, c.bump - dt);
      if (c.bump <= 0 && b.mode !== 'tumble' && b.mode !== 'netted' && Math.hypot(c.x - b.x, c.y - b.y) < (gentle ? 70 : 82)) {
        c.bump = 1.2;
        hitBombanat('crow', c.vx * 0.6 + b.vx * 0.2, 260, 'CAW!');
        env.sfx('bark');
      }
    }
    // The net in the bushes: a rustle, then up it comes under the Bombanat.
    netTimer -= dt;
    for (const bu of bushes) {
      bu.rustle = Math.max(0, bu.rustle - dt);
      if (bu.active) {
        bu.netT += dt;
        const rise = 0.22, hold = gentle ? 0.4 : 0.6, drop = 0.35;
        const held = bu.holds ? 1.3 : 0;
        const tot = rise + hold + drop + held;
        bu.net = bu.netT < 0 ? 0 : bu.netT < rise ? bu.netT / rise : bu.netT < rise + hold + held ? 1 : Math.max(0, 1 - (bu.netT - rise - hold - held) / drop);
        const hoop = netHoop(bu);
        if (bu.netT > 0 && !bu.holds && b.mode !== 'netted' && b.mode !== 'tumble' && bu.netT < rise + hold && ((b.x - hoop.x) / hoop.rx) ** 2 + ((b.y - hoop.y) / hoop.ry) ** 2 < 1) {
          bu.holds = true;
          b.mode = 'netted'; b.modeT = 0; b.vx = b.vy = 0;
          b.x = hoop.x; b.y = hoop.y;
          env.sfx('caught'); env.vibrate(50);
          fx.pop(b.x, b.y - 150, 'Netted!', { colour: '#b3402e', size: 48 });
          hints.say('A net! Someone is in those bushes...', 2.6);
        }
        if (bu.holds && b.mode === 'netted') { b.x = hoop.x; b.y = hoop.y; }
        if (bu.netT >= tot) { bu.net = 0; bu.netT = 0; bu.holds = false; bu.active = false; }
      }
    }
    if (netTimer <= 0 && b.x > BUSHES[0] - 500 && b.mode !== 'ground') {
      netTimer = (gentle ? 2.4 : 1.6) + rng() * 0.7;
      // The bush nearest to under him, if he is low enough to be worth a try.
      const near = bushes.filter((bu) => !bu.active && Math.abs(bu.x - b.x - b.vx * 0.5) < 320).sort((p, q) => Math.abs(p.x - b.x) - Math.abs(q.x - b.x))[0];
      if (near && b.y > 380) {
        near.rustle = gentle ? 0.85 : 0.6;
        near.netT = -(gentle ? 0.85 : 0.6);
        near.net = 0;
        near.active = true;
        if (cam.sees(near.x)) env.sfx('rustle');
      }
    }
  }

  // The hoop of a bush's net when it is up: the net rises 480 px out of the bush.
  function netHoop(bu) {
    const top = GROUND - 60 - 470 * Math.max(0, bu.net);
    const delivered = !!art.sprite('adv.b08.props', 9);
    // The delivered net leans left: its hoop sits up and to the left of the pole.
    return { x: bu.x - (delivered ? 64 : 0), y: top + (delivered ? 10 : 70), rx: delivered ? 110 : 105, ry: delivered ? 70 : 78, top };
  }

  // Hints on a cream band, so they read over the busy backdrop (the kit's
  // makeHints with a band behind the text; same contract).
  function makeBandHints(list, { show = 4 } = {}) {
    const items = list.map((hh) => ({ ...hh, t: -1 }));
    let cur = null;
    return {
      update(dt, px) {
        for (const hh of items) if (hh.t < 0 && px >= hh.x) { hh.t = 0; cur = hh; }
        if (cur) cur.t += dt;
        if (cur && cur.t > (cur.show ?? show)) cur = null;
      },
      say(text, secs = 2.5) { cur = { text, t: 0, show: secs }; },
      draw(g) {
        if (!cur) return;
        const sh = cur.show ?? show;
        const a = Math.min(1, cur.t * 4, (sh - cur.t) * 2);
        if (a <= 0) return;
        g.save();
        g.globalAlpha = a;
        g.font = '700 40px Fraunces, Georgia, serif';
        const w = g.measureText(cur.text).width + 70;
        g.fillStyle = 'rgba(251,246,232,0.94)';
        g.strokeStyle = INK; g.lineWidth = 3;
        g.beginPath();
        g.roundRect ? g.roundRect(W / 2 - w / 2, 170, w, 58, 29) : g.rect(W / 2 - w / 2, 170, w, 58);
        g.fill(); g.stroke();
        g.restore();
        kit.hint(g, cur.text, { alpha: a, y: 212 });
      },
    };
  }

  // ---------- the outro ----------

  function outro(dt) {
    outroT += dt;
    if (self.outcome === 'snatched') {
      // Up and away with the letter; the Trollusk wails, the Yalapappus shouts.
      b.vy = ease(b.vy, -260, 2, dt); b.vx = ease(b.vx, b.facing * 460, 2, dt);
      b.x += b.vx * dt; b.y = Math.max(CEILING, b.y + b.vy * dt);
      bc.x = b.x; bc.y = b.y; bc.rot = -0.2 * b.facing;
      art.animate(bc, dt, b.vx, b.vy);
      art.setAnim(bc, 'carry');
      h.vx = ease(h.vx, 0, 6, dt); h.x += h.vx * dt;
      hc.x = h.x; hc.z = 0;
      art.animate(hc, dt, 0, 0);
      art.setAnim(hc, outroT < 0.5 ? 'jolt' : 'wail');
      art.animate(yc, dt, 0, 0);
      art.setAnim(yc, 'shout');
    } else {
      h.vx = ease(h.vx, 0, 6, dt); h.x += h.vx * dt; hc.x = h.x; hc.z = 0;
      art.animate(hc, dt, 0, 0);
      art.setAnim(hc, 'celebrate');
      b.vy = ease(b.vy, 110, 2, dt); b.y = Math.min(FLOOR, b.y + b.vy * dt); b.x += b.vx * dt;
      bc.x = b.x; bc.y = b.y;
      art.animate(bc, dt, b.vx, b.vy);
      art.setAnim(bc, 'glide');
      art.animate(yc, dt, 0, 0);
      art.setAnim(yc, 'celebrate');
    }
    cam.follow(b.x + clamp(h.x - b.x, -600, 700) * 0.45, 0, dt);
  }

  // ---------- drawing ----------

  const INK = '#2b1d14';
  const GROUND_STANDIN = { top: '#c9a650', body: '#b2843f', ink: INK };

  function draw(g, tt) {
    kit.drawBackdrop(g, cam, { panels: ['adv/b08/backdrop-1', 'adv/b08/backdrop-2', 'adv/b08/backdrop-3'], standin: 'scenes/yalapappus' });
    kit.haze(g, 'rgba(236,222,236,0.2)');
    cam.begin(g);
    // Far decor: palms, the bent trees, the kite.
    for (const x of PALMS) if (cam.sees(x)) kit.sprite(g, 'terrain.nowhere', 8, x, GROUND + 6, { height: 420 }, inkPalm);
    for (const x of BENT_TREES) if (cam.sees(x)) kit.sprite(g, 'adv.b08.props', 12, x, GROUND + 4, { height: 360 }, inkBentTree);
    drawKite(g, tt);
    // Warm air, clouds and rain.
    for (const tx of THERMALS) if (cam.sees(tx)) drawThermal(g, tx, tt);
    for (const c of clouds) if (cam.sees(c.x, c.x, 400)) inkRain(g, c, tt, !!art.sprite('adv.b08.props', 4));
    for (const c of clouds) if (cam.sees(c.x, c.x, 400)) kit.sprite(g, 'adv.b08.props', 4, c.x, c.y - 40, { height: 330, ay: 0.5 }, (gg, x, yy) => inkCloud(gg, x, yy + 40, tt));
    // The ground and what stands on it.
    for (const s of solids) kit.drawGround(g, cam, s, { sheet: 'terrain.nowhere', item: 1, height: 150, lift: 62, fill: '#8f6a38', standin: GROUND_STANDIN });
    if (!art.sprite('terrain.nowhere', 1)) inkGroundDecor(g);
    for (const s of SIGNS) if (cam.sees(s.x)) inkSignpost(g, s);
    for (const r of BOULDERS) if (cam.sees(r.x)) kit.sprite(g, 'terrain.nowhere', 6, r.x, GROUND + 8, { height: 120 }, (gg, x, yy, o) => { if (!art.drawSprite(gg, art.prop('yalapappus', r.item), x, yy, o)) inkRock(gg, x, yy); });
    for (const s of stuck) if (cam.sees(s.x)) drawStuck(g, s);
    for (const bu of bushes) if (cam.sees(bu.x)) drawBush(g, bu, tt);
    // The nets behind the bushes' tops? No: a net rises out of the bush, in front.
    // The runners, the Yalapappus behind.
    art.drawCreature(g, yc, tt, { reduceMotion: env.reduceMotion });
    if (y.state === 'windup' && y.aim) drawAimArc(g, y.aim, y.T);
    staminaRing(g, h, h.x, GROUND + 4, 46, '#f2c53d');
    art.drawCreature(g, hc, tt, { reduceMotion: env.reduceMotion });
    if (!(self.done && self.outcome === 'snatched')) letterTag(g, h.x - h.facing * 90, GROUND - 250 - h.z, { t: tt });
    if (h.noticed && !self.done) inkAlert(g, h.x + h.facing * 60, GROUND - 95 - h.z - hc.M.height * 0.9 * hc.sizeK - 30, tt);
    if (!self.done && b.mode === 'fly' && b.y < 430 && Math.abs(b.x - h.x) < 260) marker(g, h.x, GROUND - 290 - h.z, { t: tt, label: 'Dive!' });
    for (const bu of bushes) if (bu.net > 0 && cam.sees(bu.x)) drawNet(g, bu, tt);
    // Things in the air.
    for (const s of shots) if (cam.sees(s.x)) drawShot(g, s);
    pickups.draw(g, cam, tt, drawScrap);
    for (const c of crows) if (cam.sees(c.x)) kit.sprite(g, 'adv.b08.props', 8, c.x, c.y, { height: 115, ay: 0.5, flip: c.vx < 0, sy: 1 + Math.sin((tt + c.seed) * 14) * 0.08 }, (gg, x, yy) => inkCrow(gg, x, yy, tt + c.seed));
    // The Bombanat: his shadow on the ground, his aim when diving, his stamina, him.
    drawBombanat(g, tt);
    fx.draw(g);
    // Foreground ferns pass faster, for depth.
    drawForeground(g);
    cam.end(g);
    kit.route(g, { you: b.x / WORLD_W, letter: self.done && self.outcome === 'snatched' ? b.x / WORLD_W : h.x / WORLD_W, signs: cps.fracs(WORLD_W) });
    hints.draw(g);
  }

  function drawBombanat(g, tt) {
    const hgt = GROUND - b.y;
    if (b.mode !== 'ground') {
      g.save();
      g.globalAlpha = 0.22 * clamp(1 - hgt / 1500, 0.35, 1);
      g.fillStyle = INK;
      g.beginPath(); g.ellipse(b.x, GROUND + 4, Math.max(26, 84 - hgt * 0.06), Math.max(8, 20 - hgt * 0.012), 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    if (b.mode === 'dive' && b.vy > 300) {
      // Where the dive is going: a dotted line to the ground and a ring there.
      const tti = (GROUND - 95 - b.y) / b.vy;
      const xAt = clamp(b.x + b.vx * tti, 60, WORLD_W - 60);
      g.save();
      g.strokeStyle = 'rgba(179,64,46,0.7)'; g.lineWidth = 5; g.setLineDash([10, 14]); g.lineDashOffset = -tt * 240;
      g.beginPath(); g.moveTo(b.x, b.y + 60); g.lineTo(xAt, GROUND - 40); g.stroke();
      g.setLineDash([]);
      g.lineWidth = 4;
      g.beginPath(); g.ellipse(xAt, GROUND + 2, 60, 16, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    staminaRing(g, b, b.x, b.y + 100, 50, '#c9b8d4');
    if (b.soaked > 0) {
      g.save(); g.fillStyle = 'rgba(95,150,190,0.35)';
      for (let i = 0; i < 4; i++) { const yy = b.y + 60 + ((tt * 300 + i * 47) % 90); g.beginPath(); g.ellipse(b.x - 70 + i * 46, yy, 5, 10, 0, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    art.drawCreature(g, bc, tt, { reduceMotion: env.reduceMotion, shadow: false });
    if (b.mode === 'ground' && !self.done) actionPrompt(g, b.x, b.y - 110, 'Flap!', { kind: env.inputKind || 'keyboard', t: tt, pulse: 1 });
    if (self.done && self.outcome === 'snatched') letterTag(g, b.x - b.facing * 60, b.y - 150, { t: tt });
    if (self.done && self.outcome === 'snatched') {
      // The letter in his teeth, for the outro.
      g.save(); g.translate(b.x + b.facing * 110, b.y + 10); g.rotate(bc.rot);
      g.fillStyle = '#fbf6e8'; g.strokeStyle = INK; g.lineWidth = 3;
      g.fillRect(-26, -16, 52, 34); g.strokeRect(-26, -16, 52, 34);
      g.beginPath(); g.moveTo(-26, -16); g.lineTo(0, 4); g.lineTo(26, -16); g.stroke();
      g.fillStyle = '#b3402e'; g.fillRect(12, -12, 9, 10);
      g.restore();
    }
  }

  function drawScrap(g, p, x, yy, alpha, tt) {
    g.save();
    g.globalAlpha = alpha;
    const rot = Math.sin(tt * 2.2 + p.seed) * 0.35;
    const item = p.kind === 'roll' ? 2 : 1;
    kit.sprite(g, 'adv.b08.props', item, x, yy, { height: p.kind === 'roll' ? 54 : 58, ay: 0.5, rot }, (gg, xx, y2, o) => {
      if (!art.drawSprite(gg, art.prop('yalapappus', p.kind === 'roll' ? 8 : 5), xx, y2, o)) inkScrap(gg, xx, y2, rot);
    });
    g.restore();
  }

  function drawShot(g, s) {
    if (s.kind === 'fork') {
      kit.sprite(g, 'adv.b08.props', 5, s.x, s.y, { height: 100, ay: 0.5, rot: Math.atan2(s.vy, s.vx) - Math.PI / 4 }, (gg, x, yy) => inkFork(gg, x, yy, Math.atan2(s.vy, s.vx)));
    } else if (s.kind === 'rock') {
      kit.sprite(g, 'adv.b08.props', 6, s.x, s.y, { height: 76, ay: 0.5, rot: s.rot }, (gg, x, yy, o) => { if (!art.drawSprite(gg, art.prop('yalapappus', 1), x, yy, o)) inkRock(gg, x, yy + 38, 0.6); });
    } else {
      kit.sprite(g, 'adv.b08.props', 7, s.x, s.y, { height: 84, ay: 0.5, rot: s.rot * 0.3 }, (gg, x, yy, o) => { if (!art.drawSprite(gg, art.prop('yalapappus', 13), x, yy, o)) inkGoo(gg, x, yy); });
    }
  }

  function drawStuck(g, s) {
    g.save(); g.globalAlpha = s.t > 10 ? (12 - s.t) / 2 : 1;
    if (s.kind === 'fork') kit.sprite(g, 'adv.b08.props', 5, s.x, GROUND - 6, { height: 100, ay: 0.9, rot: -Math.PI * 0.75 + s.rot }, (gg, x, yy) => inkFork(gg, x, yy - 40, -Math.PI / 2 + s.rot));
    else kit.sprite(g, 'adv.b08.props', 6, s.x, GROUND + 6, { height: 76 }, (gg, x, yy, o) => { if (!art.drawSprite(gg, art.prop('yalapappus', 1), x, yy, o)) inkRock(gg, x, yy, 0.6); });
    g.restore();
  }

  function drawAimArc(g, a, T) {
    // The dotted arc of what is coming, and a ring where it is aimed.
    g.save();
    g.globalAlpha = Math.min(1, T * 4);
    g.strokeStyle = 'rgba(179,64,46,0.85)'; g.lineWidth = 5; g.setLineDash([8, 14]); g.lineDashOffset = -T * 200;
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const tt = (i / 16) * a.T;
      const x = a.hx + a.vx * tt, yy = a.hy + a.vy * tt + 0.5 * THROW_G * tt * tt;
      if (i === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.stroke();
    g.setLineDash([]);
    g.lineWidth = 4;
    g.beginPath(); g.arc(a.x, a.y, 44 + Math.sin(T * 12) * 6, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  function drawBush(g, bu, tt) {
    const shake = bu.rustle > 0 ? Math.sin(tt * 40) * 6 * bu.rustle : 0;
    const x = bu.x + shake;
    if (bu.item === 0) {
      kit.sprite(g, 'adv.b08.props', 11, x, GROUND + 10, { height: 180, sx: 1 + bu.rustle * 0.1 }, (gg, xx, yy, o) => { if (!art.drawSprite(gg, art.prop('trollusk', 5), xx, yy, o)) inkBush(gg, xx, yy); });
    } else {
      // Fern clumps from the Grithix's wood, creeping in at the edge of Nowhere.
      if (!art.drawSprite(g, art.prop('grithix', 4), x, GROUND + 10, { height: 170, sx: 1 + bu.rustle * 0.1 })) inkBush(g, x, GROUND + 10);
    }
  }

  function drawNet(g, bu, tt) {
    const hoop = netHoop(bu);
    const top = hoop.top;
    const sp = art.sprite('adv.b08.props', 9);
    if (!sp) { inkNet(g, bu.x, top, GROUND - 60, bu.holds, tt); return; }
    // The net shoots up out of the bush: the sprite (net, pole and its own
    // bush) slides up from under the ground line, clipped there.
    const hgt = 640;
    const wob = bu.holds ? Math.sin(tt * 30) * 5 : 0;
    g.save();
    g.beginPath(); g.rect(bu.x - 300, 0, 600, GROUND + 12); g.clip();
    art.drawSprite(g, sp, bu.x + wob, GROUND + 12 + (1 - Math.max(0, bu.net)) * 470, { height: hgt });
    g.restore();
  }

  // The warm air: the delivered swirl rising from the ground, a second, fainter
  // copy above it drifting upward, so it reads as one current to the top.
  function drawThermal(g, tx, tt) {
    const sp = art.sprite('adv.b08.props', 3);
    if (!sp) { inkThermal(g, tx, GROUND, tt); return; }
    const rise = (tt * 60) % 120;
    g.save();
    g.beginPath(); g.rect(tx - 260, 250, 520, GROUND - 250); g.clip();
    art.drawSprite(g, sp, tx, GROUND + 10 - rise * 0.4, { height: 500, alpha: 0.85 });
    art.drawSprite(g, sp, tx + 20, GROUND - 330 - rise, { height: 420, alpha: 0.42 });
    g.restore();
  }

  function drawKite(g, tt) {
    if (!cam.sees(KITE.x, KITE.x, 400)) return;
    const kx = KITE.x + Math.sin(tt * 0.9) * 40, ky = KITE.y + Math.cos(tt * 0.7) * 25;
    g.save();
    g.strokeStyle = 'rgba(43,29,20,0.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(KITE.x - 320, GROUND - 20); g.quadraticCurveTo(KITE.x - 160, ky + 260, kx - 10, ky - 10); g.stroke();
    g.restore();
    kit.sprite(g, 'adv.b08.props', 10, kx, ky, { height: 200, ay: 0.5, rot: Math.sin(tt * 0.9) * 0.12 }, (gg, x, yy, o) => { if (!art.drawSprite(gg, art.prop('grumley', 1), x, yy, o)) inkKite(gg, x, yy); });
  }

  function drawForeground(g) {
    // Three ferns fixed to the world but sliding faster than it.
    const k = 0.35;
    for (let i = 0; i < 3; i++) {
      const x = 1200 + i * 3900 + cam.x * k;
      if (!cam.sees(x, x, 300)) continue;
      g.save();
      g.globalAlpha = 0.9;
      if (!art.drawSprite(g, art.prop('grithix', 4), x, H + 70, { height: 300, flip: i % 2 === 1 })) inkBush(g, x, H + 60, 1.4);
      g.restore();
    }
  }

  // ---------- ink stand-ins ----------

  // A cluster of leaves drawn leaf by leaf, as the book draws foliage.
  function leafClump(g, x, yy, r, seed, fill = '#7f9a44') {
    g.save();
    g.fillStyle = fill; g.strokeStyle = INK; g.lineWidth = 2;
    const n = Math.round(r / 1.6);
    for (let i = 0; i < n; i++) {
      const a = kit.hash(seed + i * 1.7) * Math.PI * 2, d = Math.sqrt(kit.hash(seed + i * 3.1)) * r;
      const lx = x + Math.cos(a) * d, ly = yy + Math.sin(a) * d * 0.8;
      g.save(); g.translate(lx, ly); g.rotate(kit.hash(seed + i * 5.3) * Math.PI);
      g.beginPath(); g.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.stroke();
      g.restore();
    }
    // Shadow hatching on the underside.
    g.strokeStyle = 'rgba(43,29,20,0.45)'; g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < n / 2; i++) { const hx = x - r * 0.6 + (i / (n / 2)) * r * 1.2; g.moveTo(hx, yy + r * 0.3); g.lineTo(hx + 8, yy + r * 0.7); }
    g.stroke();
    g.restore();
  }

  // Short hatching strokes over a region, for shadow.
  function hatch(g, x0, y0, w, hgt, seed, alpha = 0.35, step = 14) {
    g.save();
    g.strokeStyle = `rgba(43,29,20,${alpha})`; g.lineWidth = 1.5;
    g.beginPath();
    for (let yy = y0; yy < y0 + hgt; yy += step) {
      for (let x = x0 + kit.hash(seed + yy) * step; x < x0 + w; x += step * 1.6) { g.moveTo(x, yy); g.lineTo(x + 7, yy + 9); }
    }
    g.stroke();
    g.restore();
  }

  function inkScrap(g, x, yy, rot) {
    g.save(); g.translate(x, yy); g.rotate(rot);
    g.fillStyle = '#f4ead2'; g.strokeStyle = INK; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-26, -18); g.lineTo(8, -24); g.lineTo(26, -6); g.lineTo(20, 20); g.lineTo(-10, 24); g.lineTo(-28, 8); g.closePath();
    g.fill(); g.stroke();
    g.lineWidth = 2; g.beginPath(); for (let i = -1; i <= 1; i++) { g.moveTo(-16, i * 9); g.lineTo(14, i * 9 - 2); } g.stroke();
    g.restore();
  }

  function inkThermal(g, x, base, tt) {
    const top = 270;
    g.save();
    const gr = g.createLinearGradient(0, top, 0, base);
    gr.addColorStop(0, 'rgba(250,220,150,0)'); gr.addColorStop(0.5, 'rgba(250,215,140,0.22)'); gr.addColorStop(1, 'rgba(250,200,120,0.3)');
    g.fillStyle = gr;
    g.fillRect(x - 130, top, 260, base - top);
    g.strokeStyle = 'rgba(190,120,40,0.55)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ox = -90 + i * 60;
      g.beginPath();
      for (let yy = base - 10; yy > top + 10; yy -= 14) {
        const ph = tt * 2.6 + i * 1.3 + yy * 0.02;
        const xx = x + ox + Math.sin(ph) * 18;
        if (yy === base - 10) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.stroke();
    }
    // Little leaves spiralling up.
    g.fillStyle = '#9aa34a'; g.strokeStyle = INK; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const p = ((tt * 0.25 + i * 0.2) % 1);
      const yy = base - p * (base - top);
      const xx = x + Math.sin(tt * 2 + i * 2) * 90;
      g.save(); g.translate(xx, yy); g.rotate(tt * 3 + i);
      g.beginPath(); g.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    }
    g.restore();
  }

  function inkCloud(g, x, yy, tt) {
    g.save();
    g.translate(x, yy + Math.sin(tt * 0.8) * 4);
    g.fillStyle = '#9a90a4'; g.strokeStyle = INK; g.lineWidth = 3.5;
    const shape = () => {
      g.beginPath();
      g.arc(-130, 20, 62, 0, Math.PI * 2);
      g.arc(-50, -30, 80, 0, Math.PI * 2);
      g.arc(50, -20, 86, 0, Math.PI * 2);
      g.arc(140, 25, 62, 0, Math.PI * 2);
      g.rect(-150, 20, 290, 50);
    };
    shape(); g.fill();
    // Inside: a lighter lilac top, a slate underside, and rows of curling pen
    // strokes, as the book draws its clouds.
    g.save(); shape(); g.clip();
    g.fillStyle = '#c3b6c8'; g.fillRect(-220, -130, 440, 90);
    g.fillStyle = '#6a6274'; g.fillRect(-220, 30, 440, 60);
    g.strokeStyle = 'rgba(43,29,20,0.55)'; g.lineWidth = 1.8;
    for (let row = 0; row < 7; row++) {
      const cy = -80 + row * 24;
      for (let i = 0; i < 18; i++) {
        const cx = -200 + i * 22 + (row % 2) * 11 + kit.hash(row * 9 + i + x) * 6, r = 9 + kit.hash(i * 3.7 + row) * 5;
        g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.05, Math.PI * 2.15); g.stroke();
      }
    }
    g.strokeStyle = 'rgba(43,29,20,0.45)'; g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < 44; i++) { const hx = -200 + i * 9; g.moveTo(hx, 36 + kit.hash(i) * 8); g.lineTo(hx + 5, 76); }
    g.stroke();
    g.restore();
    // The ink outline follows the puffs, not the rectangle.
    g.beginPath();
    g.arc(-130, 20, 62, Math.PI * 0.5, Math.PI * 1.5);
    g.arc(-50, -30, 80, Math.PI * 1.1, Math.PI * 1.85);
    g.arc(50, -20, 86, Math.PI * 1.2, Math.PI * 1.95);
    g.arc(140, 25, 62, Math.PI * 1.5, Math.PI * 0.5);
    g.closePath(); g.stroke();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(43,29,20,0.6)';
    g.beginPath(); g.arc(-50, -30, 70, Math.PI * 1.15, Math.PI * 1.8); g.stroke();
    g.beginPath(); g.arc(50, -20, 76, Math.PI * 1.25, Math.PI * 1.9); g.stroke();
    g.restore();
    if (false) {
    g.beginPath();
    g.arc(-130, 20, 62, Math.PI * 0.5, Math.PI * 1.5);
    g.arc(-50, -30, 80, Math.PI * 1.1, Math.PI * 1.85);
    g.arc(50, -20, 86, Math.PI * 1.2, Math.PI * 1.95);
    g.arc(140, 25, 62, Math.PI * 1.5, Math.PI * 0.5);
    g.closePath(); g.stroke();
    }
  }

  // The rain under a cloud, down to the ground: the soaking zone. With the
  // delivered cloud (which has its own drops) only a soft wash and a few
  // falling drops; in ink, the full streaks.
  function inkRain(g, c, tt, delivered = false) {
    g.save();
    g.fillStyle = delivered ? 'rgba(70,100,160,0.11)' : 'rgba(70,100,160,0.16)';
    g.fillRect(c.x - 185, c.y + 60, 370, GROUND - c.y - 60);
    g.strokeStyle = delivered ? 'rgba(40,60,110,0.55)' : 'rgba(40,70,140,0.75)'; g.lineWidth = delivered ? 3 : 4; g.lineCap = 'round';
    g.beginPath();
    const n = delivered ? 8 : 14, step = delivered ? 46 : 26;
    for (let i = 0; i < n; i++) {
      const x = c.x - 165 + i * step + Math.sin(i * 3.1) * 6;
      const off = ((tt * 900 + i * 61) % 120);
      for (let yy = c.y + (delivered ? 150 : 70) + off; yy < GROUND - 10; yy += 120) { g.moveTo(x, yy); g.lineTo(x - 3, yy + (delivered ? 22 : 34)); }
    }
    g.stroke();
    g.restore();
  }

  function inkCrow(g, x, yy, tt) {
    const w = Math.sin(tt * 16) * 0.8;
    g.save(); g.translate(x, yy);
    g.fillStyle = '#2f2630'; g.strokeStyle = INK; g.lineWidth = 2.5; g.lineJoin = 'round';
    g.beginPath(); g.ellipse(0, 0, 30, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-28, -2); g.lineTo(-44, -10); g.lineTo(-40, 4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e0b64a'; g.beginPath(); g.moveTo(-40, -2); g.lineTo(-56, 0); g.lineTo(-40, 5); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2f2630';
    g.beginPath(); g.moveTo(-8, -4); g.quadraticCurveTo(10, -40 * w - 10, 44, -46 * w - 4); g.lineTo(36, -20 * w + 2); g.quadraticCurveTo(12, -8, 8, 2); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(-18, -30 * w - 4, -2, -40 * w + 2); g.lineTo(10, -16 * w + 6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#f6efe0'; g.beginPath(); g.arc(-30, -4, 3.5, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function inkFork(g, x, yy, rot) {
    g.save(); g.translate(x, yy); g.rotate(rot);
    g.fillStyle = '#e8b93c'; g.strokeStyle = INK; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath(); g.roundRect ? g.roundRect(-48, -6, 66, 12, 5) : g.rect(-48, -6, 66, 12); g.fill(); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); for (let i = -44; i < 14; i += 7) { g.moveTo(i, 1); g.lineTo(i + 4, 5); } g.stroke(); g.lineWidth = 3;
    g.beginPath(); g.moveTo(18, -16); g.lineTo(48, -16); g.lineTo(48, -10); g.lineTo(26, -10); g.lineTo(26, -4); g.lineTo(48, -4); g.lineTo(48, 4); g.lineTo(26, 4); g.lineTo(26, 10); g.lineTo(48, 10); g.lineTo(48, 16); g.lineTo(18, 16); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  function inkRock(g, x, yy, k = 1) {
    g.save(); g.translate(x, yy); g.scale(k, k);
    g.fillStyle = '#b9b3a8'; g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-60, 0); g.lineTo(-52, -40); g.lineTo(-20, -62); g.lineTo(30, -58); g.lineTo(60, -24); g.lineTo(56, 0); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(-30 + i * 18, -10); g.lineTo(-18 + i * 18, -2); } g.stroke();
    g.restore();
  }

  function inkGoo(g, x, yy) {
    g.save(); g.translate(x, yy);
    g.fillStyle = '#5fb3c4'; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 36, 30, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(26, -24, 10, 14, 0.6, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-12, -10, 9, 6, -0.5, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function inkBush(g, x, yy, k = 1) {
    g.save(); g.translate(x, yy); g.scale(k, k);
    g.fillStyle = '#6f8a3c'; g.strokeStyle = INK; g.lineWidth = 4;
    g.beginPath();
    g.arc(-60, -50, 46, 0, Math.PI * 2); g.arc(0, -90, 58, 0, Math.PI * 2); g.arc(62, -56, 48, 0, Math.PI * 2); g.rect(-80, -60, 160, 60);
    g.fill();
    g.beginPath(); g.arc(-60, -50, 46, Math.PI * 0.6, Math.PI * 1.45); g.arc(0, -90, 58, Math.PI * 1.1, Math.PI * 1.9); g.arc(62, -56, 48, Math.PI * 1.55, Math.PI * 0.4); g.closePath(); g.stroke();
    g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { g.moveTo(-60 + i * 24, -40); g.lineTo(-50 + i * 24, -62); } g.stroke();
    g.restore();
  }

  function inkNet(g, x, top, base, holds, tt) {
    g.save();
    // The pole, yellow, and the hoop with its dark mesh bag.
    g.strokeStyle = INK; g.lineWidth = 4;
    g.fillStyle = '#e8b93c';
    g.fillRect(x - 7, top + 60, 14, base - top - 60); g.strokeRect(x - 7, top + 60, 14, base - top - 60);
    const wob = holds ? Math.sin(tt * 30) * 5 : 0;
    g.fillStyle = 'rgba(60,45,60,0.78)';
    g.beginPath(); g.moveTo(x - 105 + wob, top + 70); g.quadraticCurveTo(x + wob, top + 230, x + 105 + wob, top + 70); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(248,241,224,0.35)'; g.lineWidth = 1.5;
    g.beginPath(); for (let i = -4; i <= 4; i++) { g.moveTo(x + i * 22 + wob, top + 70); g.lineTo(x + i * 14 + wob, top + 70 + 120 - Math.abs(i) * 14); } g.stroke();
    g.strokeStyle = INK; g.lineWidth = 7;
    g.fillStyle = 'rgba(0,0,0,0)';
    g.beginPath(); g.ellipse(x + wob, top + 70, 105, 30, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#e8b93c'; g.lineWidth = 4; g.stroke();
    g.restore();
  }

  function inkPalm(g, x, base) {
    g.save();
    g.strokeStyle = INK; g.lineWidth = 3.5; g.fillStyle = '#b89a6c';
    g.beginPath(); g.moveTo(x - 14, base); g.quadraticCurveTo(x + 10, base - 200, x + 50, base - 380); g.lineTo(x + 66, base - 374); g.quadraticCurveTo(x + 30, base - 200, x + 14, base); g.closePath(); g.fill(); g.stroke();
    // The trunk's rings and its shaded side.
    g.lineWidth = 2; g.strokeStyle = 'rgba(43,29,20,0.6)';
    g.beginPath();
    for (let i = 0; i < 16; i++) { const f = i / 16; const tx = x - 14 + (f * f) * 60 + 2, ty = base - f * 376; g.moveTo(tx, ty); g.quadraticCurveTo(tx + 14, ty - 5, tx + 28 - f * 8, ty - 2); }
    g.stroke();
    g.strokeStyle = 'rgba(43,29,20,0.35)';
    g.beginPath();
    for (let i = 0; i < 30; i++) { const f = i / 30; const tx = x - 2 + (f * f) * 56, ty = base - f * 370; g.moveTo(tx, ty); g.lineTo(tx + 6, ty - 10); }
    g.stroke();
    // Fronds: a midrib with feathered leaflets, drawn stroke by stroke.
    const cx = x + 58, cy = base - 380;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.95;
      const ex = cx + Math.cos(a) * 170, ey = cy + Math.sin(a) * 120 + 60;
      const mx = cx + Math.cos(a) * 110, my = cy + Math.sin(a) * 110 - 30;
      g.fillStyle = i % 2 ? '#96a458' : '#7f8f48';
      g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my, ex, ey); g.quadraticCurveTo(cx + Math.cos(a) * 100, cy + Math.sin(a) * 60 + 10, cx, cy); g.fill();
      g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      g.lineWidth = 1.6;
      g.beginPath();
      for (let k = 1; k <= 9; k++) {
        const f = k / 10;
        const px = (1 - f) * (1 - f) * cx + 2 * (1 - f) * f * mx + f * f * ex, py = (1 - f) * (1 - f) * cy + 2 * (1 - f) * f * my + f * f * ey;
        const nx = -(my - cy), ny = mx - cx, nl = Math.hypot(nx, ny) || 1;
        const len = 26 * (1 - f * 0.5);
        g.moveTo(px, py); g.lineTo(px + (nx / nl) * len + 6, py + (ny / nl) * len + 10);
        g.moveTo(px, py); g.lineTo(px - (nx / nl) * len * 0.6 + 6, py - (ny / nl) * len * 0.6 + 10);
      }
      g.stroke();
    }
    g.restore();
  }

  function inkBentTree(g, x, base) {
    g.save();
    g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#8a6a44';
    g.beginPath(); g.moveTo(x - 22, base); g.quadraticCurveTo(x - 10, base - 180, x + 90, base - 260); g.quadraticCurveTo(x + 160, base - 300, x + 200, base - 330);
    g.lineTo(x + 206, base - 316); g.quadraticCurveTo(x + 150, base - 280, x + 100, base - 240); g.quadraticCurveTo(x + 20, base - 170, x + 22, base); g.closePath(); g.fill(); g.stroke();
    hatch(g, x - 20, base - 240, 60, 240, x, 0.4, 12);
    g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x - 6, base - 20); g.quadraticCurveTo(x + 4, base - 170, x + 96, base - 250); g.stroke();
    for (const [dx, dy, r] of [[150, -300, 48], [205, -340, 44], [110, -262, 38]]) leafClump(g, x + dx, base + dy, r, x + dx);
    g.restore();
  }

  function inkKite(g, x, yy) {
    g.save(); g.translate(x, yy);
    g.fillStyle = '#c8443a'; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -70); g.lineTo(44, 0); g.lineTo(0, 80); g.lineTo(-44, 0); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, -70); g.lineTo(0, 80); g.moveTo(-44, 0); g.lineTo(44, 0); g.stroke();
    g.restore();
  }

  function inkSignpost(g, s) {
    g.save();
    g.fillStyle = '#c4a878'; g.strokeStyle = INK; g.lineWidth = 4;
    g.fillRect(s.x - 8, GROUND - 230, 16, 230); g.strokeRect(s.x - 8, GROUND - 230, 16, 230);
    hatch(g, s.x - 6, GROUND - 228, 12, 226, s.x, 0.45, 10);
    const w = 44 + s.text.length * 15;
    g.beginPath(); g.moveTo(s.x - w / 2, GROUND - 250); g.lineTo(s.x + w / 2 - 24, GROUND - 250); g.lineTo(s.x + w / 2, GROUND - 226); g.lineTo(s.x + w / 2 - 24, GROUND - 202); g.lineTo(s.x - w / 2, GROUND - 202); g.closePath();
    g.fill(); g.stroke();
    // Wood grain.
    g.strokeStyle = 'rgba(43,29,20,0.35)'; g.lineWidth = 1.5;
    g.beginPath(); for (let i = 0; i < 4; i++) { const gy = GROUND - 244 + i * 11; g.moveTo(s.x - w / 2 + 6, gy); g.quadraticCurveTo(s.x, gy + 3, s.x + w / 2 - 30, gy); } g.stroke();
    g.fillStyle = INK; g.font = '700 24px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(s.text, s.x - 10, GROUND - 226);
    g.restore();
  }

  // Pebbles, cracks and tufts over the ink ground, so it is not a bare band.
  function inkGroundDecor(g) {
    const x0 = Math.floor((cam.x - 60) / 48) * 48, x1 = cam.x + W + 60;
    g.save();
    g.lineWidth = 2;
    for (let x = x0; x < x1; x += 48) {
      const h1 = kit.hash(x * 0.37), h2 = kit.hash(x * 0.91), h3 = kit.hash(x * 1.7);
      const yy = GROUND + 14 + h1 * 90;
      if (h2 < 0.4) {
        // A pebble.
        const r = 5 + h3 * 9;
        g.fillStyle = h3 < 0.5 ? '#c9bda6' : '#9d8f7a'; g.strokeStyle = INK;
        g.beginPath(); g.ellipse(x + h2 * 40, yy, r, r * 0.7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(43,29,20,0.5)'; g.beginPath(); g.moveTo(x + h2 * 40 - r * 0.5, yy + r * 0.3); g.lineTo(x + h2 * 40 + r * 0.4, yy + r * 0.5); g.stroke();
      } else if (h2 < 0.6) {
        // A crack in the dry ground.
        g.strokeStyle = 'rgba(43,29,20,0.55)';
        g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 14, yy + 6); g.lineTo(x + 22, yy + 18); g.lineTo(x + 36, yy + 22); g.stroke();
      } else if (h2 < 0.8) {
        // A dry grass tuft.
        g.strokeStyle = '#6f7a2e'; g.lineWidth = 2.5;
        g.beginPath();
        for (let k = -2; k <= 2; k++) { g.moveTo(x + 20, yy); g.lineTo(x + 20 + k * 7, yy - 16 - Math.abs(k) * -3 - h3 * 10); }
        g.stroke();
        g.lineWidth = 2;
      }
    }
    g.restore();
  }

  function inkAlert(g, x, yy, tt) {
    g.save();
    g.translate(x, yy + Math.sin(tt * 12) * 3);
    g.fillStyle = '#fbf6e8'; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 24, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#b3402e'; g.font = '800 34px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('!', 0, 2);
    g.restore();
  }

  return self;
}

// ---------- the how-to-play page ----------

export const HOWTO = [
  {
    text: 'Flap to climb, glide, and dive: let go of Down to swoop back up.',
    scene: 'scenes/yalapappus', crop: [200, 240, 1040, 780],
    items: [
      { creature: 'bombanat', anim: 'flap', x: 150, y: 150, h: 110 },
      { path: [[220, 150], [330, 190], [420, 330], [520, 230], [600, 120]], arrow: true },
      { creature: 'bombanat', anim: 'dive', x: 420, y: 330, h: 110 },
      { word: 'Swoop!', x: 520, y: 80, size: 44 },
    ],
  },
  {
    text: 'Ride the warm air up for height; keep out of the rain and what the Yalapappus throws.',
    scene: 'scenes/yalapappus', crop: [1000, 300, 920, 690],
    items: [
      { draw: (g) => { g.save(); g.fillStyle = 'rgba(250,215,140,0.35)'; g.fillRect(120, 60, 120, 400); g.strokeStyle = 'rgba(190,120,40,0.7)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); for (let y = 460; y > 60; y -= 12) { const x = 150 + i * 30 + Math.sin(y * 0.03 + i) * 12; y === 460 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } g.restore(); } },
      { creature: 'bombanat', anim: 'glide', x: 180, y: 170, h: 100 },
      { path: [[180, 420], [180, 200]], arrow: true },
      { creature: 'yalapappus', anim: 'shout', x: 500, y: 470, h: 190 },
      { path: [[540, 300], [470, 150], [330, 120]], arrow: true },
      { sprite: ['props.yalapappus', 1], x: 470, y: 150, h: 44, ay: 0.5 },
    ],
  },
  {
    text: 'Dive on the running Trollusk, fast and from high up: SNIP!',
    scene: 'scenes/yalapappus', crop: [400, 300, 1040, 780],
    items: [
      { creature: 'bombanat', anim: 'dive', x: 200, y: 90, h: 110 },
      { path: [[240, 140], [380, 300], [470, 400]], arrow: true },
      { creature: 'trollusk', anim: 'run', x: 500, y: 470, h: 170 },
      { ring: [500, 390, 90] },
      { word: 'SNIP!', x: 330, y: 200, size: 56 },
    ],
  },
];

// ---------- the autopilot ----------
// Flies the opening sections collecting scraps and riding the warm air, keeps
// out of the rain, the crows and the Yalapappus's throws, then hunts: climbs to
// the ceiling over the Trollusk and dives on him, fast, from high up.

export function autopilot(board) {
  const { b, h, clouds, crows, shots, pickups } = board;
  const ap = (board._ap ||= { t: 0, flapT: 0, hunting: false, dive: false, lastDive: 0, hunt0: 0 });
  const dt = Math.max(0, Math.min(0.05, board.elapsed - ap.t)) || 1 / 30;
  ap.t = board.elapsed;
  ap.flapT -= dt;
  const out = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  if (board.done) return out;
  const GROUND = board.GROUND, CEIL = board.CEILING;
  const beat = (want) => { if (want && ap.flapT <= 0) { out.actionPressed = true; out.action = true; ap.flapT = 0.18; } };

  if (b.mode === 'netted' || b.mode === 'tumble') return out;
  if (b.mode === 'ground') { beat(true); return out; }

  // When to start hunting: after the sky has been seen, or when he is cornered.
  if (!ap.hunting && ap.t > 56) { ap.hunting = true; ap.hunt0 = ap.t; }

  // Dangers at our height: rain columns, crows, and anything thrown.
  let wantY = null;
  for (const c of clouds) if (Math.abs(c.x - b.x) < 330 && b.x <= c.x + 200) wantY = Math.min(wantY ?? 9e9, c.y - 150);
  for (const c of crows) if (c.x > b.x - 80 && c.x < b.x + 820 && Math.abs(c.y - b.y) < 210) wantY = c.y > b.y ? Math.min(wantY ?? 9e9, c.y - 250) : Math.max(wantY ?? -9e9, c.y + 250);
  // Anything thrown: where it will be against where we will be; and while
  // the Yalapappus winds up, the ring he is aiming at.
  let dodgeShot = 0, shotX = 0;
  for (const s of shots) {
    for (let k = 1; k <= 14; k++) {
      const tt = k * 0.12;
      const sx = s.x + s.vx * tt, sy = s.y + s.vy * tt + 0.5 * 1300 * tt * tt;
      if (Math.hypot(sx - (b.x + b.vx * tt), sy - (b.y + b.vy * tt * 0.5)) < 170) { dodgeShot = sy > b.y - 40 ? -1 : 1; shotX = sx; break; }
    }
    if (dodgeShot) break;
  }
  const yal = board.y;
  if (!dodgeShot && yal.state === 'windup' && yal.aim && Math.hypot(yal.aim.x - b.x, yal.aim.y - b.y) < 260) { dodgeShot = yal.aim.y > b.y - 60 ? -1 : 1; shotX = yal.aim.x; }
  // Up and out of its way, or, at the ceiling, down and away.
  if (dodgeShot < 0 && b.y < CEIL + 220) dodgeShot = 1;
  const evadeX = dodgeShot ? (b.x >= shotX ? 1 : -1) : 0;

  if (!ap.hunting) {
    // Cruise along near the Trollusk, dipping and climbing for scraps and
    // riding the warm air up through the stacks of them.
    // The nearest scrap, preferring those above (a few beats) to those below.
    const cost = (p) => Math.abs(p.x - b.x) + (p.y < b.y ? (b.y - p.y) * 0.5 : (p.y - b.y) * 1.0);
    const cands = pickups.items.filter((p) => !p.got && !p.skip && p.x > b.x - 160 && p.x < Math.min(b.x + 900, h.x + 500));
    let target = cands.sort((p, q) => cost(p) - cost(q))[0];
    if (target && board.THERMALS.some((tx) => Math.abs(tx - target.x) < 130)) {
      // A stack in the warm air: come in under the lowest and ride up through it.
      const col = cands.filter((p) => Math.abs(p.x - target.x) < 60).sort((p, q) => q.y - p.y);
      const far = Math.abs(b.x - target.x) > 220;
      target = far ? col[0] : col.find((p) => p.y <= b.y + 70) || null;
      if (!target && !far) for (const p of col) p.skip = true;
    }
    if (target !== ap.target) { ap.target = target; ap.targetT = 0; } else ap.targetT = (ap.targetT || 0) + dt;
    if (target && ap.targetT > 3.5) { target.skip = true; ap.target = null; }
    let tx = target ? target.x : h.x - 200;
    if (b.x > h.x + 400) tx = h.x; // don't leave him behind
    const ddx = tx - b.x;
    out.x = Math.abs(ddx) > 30 ? Math.max(-1, Math.min(1, ddx / 160)) : 0;
    if (!target && b.x < h.x - 900) out.x = 1;
    let ty = target ? target.y : 520;
    if (wantY !== null) ty = wantY;
    if (dodgeShot) { ty = dodgeShot < 0 ? b.y - 260 : b.y + 300; out.x = evadeX; }
    ty = Math.max(CEIL + 10, Math.min(GROUND - 140, ty));
    if (b.y > ty + 20 && b.vy > -120) beat(true);
    if (b.y < ty - 140 && !b.inThermal && (Math.abs(ddx) < 160 || dodgeShot)) out.y = 1; // dive down to it
    if (b.mode === 'dive' && (b.y + b.vy * 0.1 > ty || b.y > GROUND - 240)) out.y = 0;
    out.sprint = b.st > 0.5 && !target && b.x < h.x - 700;
    return out;
  }

  // Hunting. Climb to the top above and behind him, then dive on his lead.
  const dx = h.x - b.x;
  const high = b.y < 360;
  if (!ap.dive) {
    const lead = h.vx * 0.55;
    const wantX = h.x + lead - 60 * Math.sign(h.vx || 1);
    const ddx = wantX - b.x;
    out.x = Math.abs(ddx) > 30 ? Math.max(-1, Math.min(1, ddx / 140)) : 0;
    let ty = CEIL + 10;
    if (wantY !== null) ty = Math.max(ty, wantY);
    if (dodgeShot) { out.x = evadeX; if (dodgeShot > 0 && b.y < CEIL + 220) { out.y = 1; ty = b.y + 300; } }
    if (b.y > ty + 20 && b.vy > -150) beat(true);
    out.sprint = Math.abs(ddx) > 420 && b.st > 0.3 && !b.inThermal;
    const tired = h.winded > 0 || h.st < 0.35;
    const ready = (high || (tired && b.y < 650)) && Math.abs(ddx) < 110 && h.dodgeT <= 0 && ap.t - ap.lastDive > 1.2;
    if (ready) { ap.dive = true; ap.lastDive = ap.t; }
    return out;
  }
  // The dive: hold Down, steering at where he will be when we arrive.
  out.y = 1;
  const tti = Math.max(0.05, (GROUND - 95 - b.y) / Math.max(400, b.vy));
  const aimX = h.x + h.vx * tti;
  out.x = Math.abs(aimX - b.x) > 20 ? Math.max(-1, Math.min(1, (aimX - b.x) / 90)) : 0;
  if (b.mode !== 'dive' && ap.t - ap.lastDive > 0.3) ap.dive = false;
  if (b.y > GROUND - 150 || (h.dodgeT > 0 && b.y > GROUND - 300)) { out.y = 0; ap.dive = false; }
  return out;
}

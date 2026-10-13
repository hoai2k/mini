// Board 6: the Paper-Munching Yalapappus, KER-PLOP (design/adventure.md, 6).
// Through the edge of Nowhere, under the swollen Typhoonigator letting go.
//
// The Yalapappus trundles (a bouncy waddle), hops with Action (a big hop with
// a huge squash on landing), ground-pounds with down in the air (shakes paper
// out of trees and bushes, stuns grumpy toads) and rolls into a ball with
// Sprint (bowls through bushes, speeds down slopes and off ramps, bounces off
// rocks, can't stop quickly, dizzy after a long roll). Goo curtains stick and
// slow him unless he rolls through; holes send him back to the last signpost.
// Overhead the Typhoonigator floats along and, in the last stretch, lets go
// of boats, fish, goo and a little pink octopus (round shadows warn where
// they will land). In the open space at the end the captain's bottle falls:
// stand under its shadow, KER-PLOP, tinkle-plinkle, and mash Action to munch
// the captain's note before the clock runs out.
//
// The ground is a height profile (flat stretches, slopes, holes) plus blocks
// (rocks, boulders, bushes) with vertical sides, stepped by this file rather
// than the kit's rectangle solids, so rolling downhill speeds him up.

import * as art from '../art.js';
import * as kit from './kit.js';
import { BOARDS } from './index.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';

const { W, H, clamp, lerp } = kit;
const ENTRY = BOARDS.find((b) => b.n === 6);
const GY = 880; // the ground line on flat ground
const GRAV = 3000;
const HEAD = 230; // head height above the feet, standing
const BALL_H = 170; // the rolled ball's height
const PROPS = 'adv.b06.props';
const TERRAIN = 'terrain.nowhere';
const INK = '#2b1d14';
const GROUND_INK = { top: '#d0aa4e', body: '#b9893d', ink: INK };

// What the cloud lets go of: requested prop, delivered stand-in prop, height
// on screen, hit radius, gravity factor, spin.
const FALLING = {
  boat: { item: 5, standin: ['yalapappus', 11], h: 150, r: 100, gk: 1.05, spin: 1.2 },
  fish: { item: 6, standin: ['yalapappus', 12], h: 110, r: 80, gk: 1, spin: 0 },
  goo: { item: 7, standin: ['yalapappus', 13], h: 100, r: 80, gk: 1.1, spin: 0 },
  bottle: { item: 8, standin: ['yalapappus', 10], h: 104, r: 84, gk: 0.55, spin: 2.2 },
  octopus: { item: 9, standin: null, h: 84, r: 90, gk: 0.7, spin: 0 },
};
// Paper: requested prop (or null), delivered stand-in [sheet, item], height.
const PAPER = {
  scrap: { item: 1, standin: ['yalapappus', 5], h: 54 },
  menu: { item: 2, standin: ['bombanat', 7], h: 72 },
  news: { item: 3, standin: ['bombanat', 9], h: 74 },
  bag: { item: 4, standin: ['yalapappus', 7], h: 76 },
  ball: { item: null, standin: ['yalapappus', 6], h: 56 },
  ticket: { item: null, standin: ['bombanat', 6], h: 50 },
  hat: { item: null, standin: ['bombanat', 8], h: 64 },
};
const PAPER_KINDS = Object.keys(PAPER);

export default function create(env) {
  const rng = env.rng;
  const gentle = !!env.gentle?.[0];
  art.preload(['props.yalapappus', 'props.bombanat', 'props.trollusk', 'typhoonigator.poses', 'yalapappus.swaps', 'yalapappus.poses', ENTRY.scene]);

  // ---------- the ground ----------

  const segs = []; // { x0, x1, y0, y1, kind } or { x0, x1, hole: true }
  let cx = 0, cy = GY;
  const flat = (len) => { segs.push({ x0: cx, x1: cx + len, y0: cy, y1: cy, kind: 'flat' }); cx += len; };
  const slope = (len, dh) => { segs.push({ x0: cx, x1: cx + len, y0: cy, y1: cy + dh, kind: dh < 0 ? 'up' : 'down' }); cx += len; cy += dh; };
  const hole = (len) => { segs.push({ x0: cx, x1: cx + len, hole: true }); cx += len; };
  // Section 1, the jungle edge: flat.
  flat(4000);
  // Section 2, the goo curtains: flat with a dip.
  const S2 = cx;
  flat(1300); slope(600, 60); flat(700); slope(600, -60); flat(800);
  // Section 3, holes and slopes.
  const S3 = cx;
  flat(400); hole(240); flat(500); // a first hole, hoppable
  slope(900, -170); flat(300); slope(800, 170); // a hill to roll down
  flat(300); hole(270); flat(300);
  slope(600, 100); flat(200); slope(600, -100); // down into a dip and up the ramp
  const BIG = { x0: cx, x1: cx + 400 };
  hole(400); flat(500); // the big hole: fly it off the ramp
  // Section 4, the falling things: open ground with low bumps.
  const S4 = cx;
  flat(700); slope(600, -70); flat(600); slope(600, 70); flat(1900);
  // The open space.
  const OPEN_X = cx;
  flat(1900);
  const WORLD = cx;

  function segAt(x) {
    for (const s of segs) if (x >= s.x0 && x < s.x1) return s;
    return segs[segs.length - 1];
  }
  function profileY(x) {
    const s = segAt(x);
    if (s.hole) return null;
    return lerp(s.y0, s.y1, (x - s.x0) / (s.x1 - s.x0));
  }
  function slopeAt(x) {
    const s = segAt(x);
    return s.hole ? 0 : (s.y1 - s.y0) / (s.x1 - s.x0);
  }

  // Blocks with vertical sides: rocks and boulders can be stood on; bushes
  // block walking and are bowled through by the ball.
  const blocks = [];
  const addRock = (x, item = 1) => blocks.push({ kind: 'rock', x, w: 96, h: item === 1 ? 84 : 96, item, top: profileY(x) - (item === 1 ? 84 : 96) });
  const addBoulder = (x, w = 300, h = 150) => blocks.push({ kind: 'boulder', x, w, h, top: profileY(x) - h });
  const addBush = (x, paper = 2) => blocks.push({ kind: 'bush', x, w: 170, h: 180, top: profileY(x) - 135, paper, gone: false, shakeT: 0, seed: rng() });
  addRock(1500, 1); addRock(2500, 2);
  addBush(1000, 1); addBush(2100, 1); addBush(2900, 2);
  addRock(S2 + 1880, 1); addBush(S2 + 1250, 1);
  addBush(S2 + 2500, 1);
  addRock(S3 + 1400, 2); addBoulder(S3 + 2190, 300, 150); // on the hill top
  addRock(S4 + 300, 1);
  addBoulder(S4 + 1500, 320, 160); addBush(S4 + 2200, 1);
  addBush(S4 + 2950, 1); addRock(OPEN_X - 350, 2);

  // The walking surface at x (with the blocks that can be stood on), or null over a hole.
  function gy(x) {
    let y = profileY(x);
    if (y === null) return null;
    for (const b of blocks) if (b.kind !== 'bush' && !b.gone && Math.abs(x - b.x) <= b.w / 2) y = Math.min(y, b.top);
    return y;
  }

  // Trees to shake paper out of, goo curtains, toads, signposts.
  const trees = [{ x: 700, paper: 2 }, { x: 1900, paper: 2 }, { x: S2 + 400, paper: 0 }, { x: S2 + 2000, paper: 2 }, { x: S3 - 300, paper: 0 },
    { x: S3 + 2600, paper: 2 }, { x: S4 + 1000, paper: 2 }, { x: OPEN_X - 500, paper: 0 }, { x: WORLD - 500, paper: 0 }]
    .map((t) => ({ ...t, shakeT: 0, seed: rng() }));
  // Each curtain is a goo-dripping branch (terrain 7); its long drips are the sticky zones.
  const curtains = [S2 + 500, S2 + 1500, S2 + 2500, S2 + 3400].map((x) => ({ x, w: 600, zones: [[-200, 300], [300, 340]], top: 320, bottom: 690, dripT: rng() * 2 }));
  const toads = [{ x0: S2 + 850, x1: S2 + 1100 }, { x0: S2 + 1980, x1: S2 + 2130 }, { x0: S3 + 1000, x1: S3 + 1300 }, { x0: S4 + 1800, x1: S4 + 2100 }]
    .map((t, i) => ({ ...t, x: (t.x0 + t.x1) / 2, dir: i % 2 ? -1 : 1, hop: rng() * 2, stun: 0, grump: 0, bowled: false }));
  const cps = kit.makeCheckpoints([0, S2 + 100, S3, S4, OPEN_X]);
  const hints = kit.makeHints([
    { x: 0, text: 'Trundle with the stick. Action: a big hop!' },
    { x: 520, text: 'Down in the air: ground-pound! Shake the paper out of the trees.' },
    { x: 1700, text: 'Hold Sprint to roll into a ball and bowl through the bushes.' },
    { x: S2 + 100, text: 'Goo curtains stick! Roll through them.' },
    { x: S3, text: 'Holes! Hop them, or roll down the slopes and fly.' },
    { x: BIG.x0 - 1900, text: 'A big hole: roll down the dip and off the ramp to clear it!' },
    { x: S4, text: 'The Typhoonigator is letting go! Watch the shadows.' },
    { x: OPEN_X, text: 'The bottle! Get under its shadow and stand still.' },
  ]);
  // Grumpy toads and their patches, for the hint after a shove.

  // ---------- paper ----------

  const paper = []; // { x, y, kind, got, t, locked, vx, vy, lying, seed }
  let pseed = 0;
  function addPaper(x, y, kind, extra = {}) {
    paper.push({ x, y, kind: kind || PAPER_KINDS[pseed % PAPER_KINDS.length], got: false, t: 0, locked: false, vx: 0, vy: 0, lying: true, seed: pseed++ * 1.7, ...extra });
  }
  // On the ground along the way (y is the paper's middle).
  const onGround = (x, kind) => addPaper(x, (gy(x) ?? GY) - 40, kind);
  [300, 1250, 1350, 2300, 2700, 3500].forEach((x, i) => onGround(x, ['scrap', 'menu', 'scrap', 'news', 'bag', 'ticket'][i]));
  [600, 1250, 2400, 3000].forEach((d, i) => onGround(S2 + d, ['ticket', 'scrap', 'ball', 'news'][i]));
  [300, 1100, 1700, 2350, 3700, 5000].forEach((d, i) => onGround(S3 + d, ['bag', 'scrap', 'hat', 'menu', 'news', 'scrap'][i]));
  // On the hill-top boulder and the big boulder (a hop up).
  addPaper(S3 + 2190, profileY(S3 + 2190) - 150 - 40, 'bag');
  addPaper(S4 + 1500, profileY(S4 + 1500) - 160 - 40, 'menu');
  [200, 800, 2600, 3300].forEach((d, i) => onGround(S4 + d, ['ticket', 'scrap', 'ball', 'menu'][i]));
  onGround(OPEN_X + 900, 'news');
  // In the trees and bushes, locked until shaken out.
  for (const t of trees) for (let i = 0; i < t.paper; i++) addPaper(t.x + (i - (t.paper - 1) / 2) * 80, GY - 470 + (i % 2) * 30, null, { locked: true, tree: t });
  for (const b of blocks) if (b.kind === 'bush') for (let i = 0; i < b.paper; i++) addPaper(b.x + (i - (b.paper - 1) / 2) * 50, b.top + 50, null, { locked: true, bush: b });
  const TOTAL = paper.length;
  let got = 0;

  // ---------- the Yalapappus ----------

  const p = kit.makeBody({ x: 200, y: GY, w: 120, h: HEAD });
  p.mode = 'walk'; // walk | ball | dizzy | dazed | fell | kerplop | munch
  p.modeT = 0; p.dazeT = 1; p.sticky = 0; p.pound = false; p.rollT = 0; p.landT = 0; p.stepD = 0; p.dust = 0; p.invuln = 0; p.inGoo = 0;
  p.hat = false; // the little pink octopus
  const yc = art.makeCreature('yalapappus', p.x, p.y);
  yc.sizeK = 1;
  let facing = 1;

  // ---------- the Typhoonigator ----------

  const cloud = { x: 700, y: 350, vx: 0, letgo: 0, suck: 0, next: 2, dropped: 0, octo: 0 };
  const tc = art.makeCreature('typhoonigator', cloud.x, cloud.y);
  tc.sizeK = 0.75;
  art.setAnim(tc, 'bloated');
  const items = []; // falling and lying things
  const puddles = []; // goo on the ground
  const parts = kit.makeParticles();
  const cam = kit.makeCamera(WORLD, { lead: 300 });
  cam.follow(p.x, 0, 0, true);

  let t = 0;
  let bonks = 0;
  let fell = 0;
  let shoves = 0;
  let fade = 0; // falling into a hole: fade out, come back at the signpost
  let thunderT = 6;
  const climax = { on: false, t: 0, bottle: null, caught: false, tries: 0, wait: 1.2 };
  const munch = { n: 0, need: gentle ? 6 : 8, t: 0 };
  let burst = null, note = null, letter = null;

  // ---------- helpers ----------

  const headY = () => p.y - (p.mode === 'ball' ? BALL_H : HEAD);
  const rolling = () => p.mode === 'ball';
  const canCatch = () => p.mode === 'walk' && p.onGround;
  const shakeCam = (a) => cam.shake(a, env.reduceMotion);
  const dust = (x, y, n = 8, colour = '#e0bf6a', speed = 220) => parts.burst(x, y, { n, colour, speed, size: 11, life: 0.5 });

  function landed(speed) {
    p.landT = 0.16;
    if (p.pound) {
      p.pound = false;
      p.landT = 0.3;
      art.kick(yc, 1.1);
      env.sfx('thump'); env.sfx('crack'); env.vibrate(70);
      shakeCam(14);
      dust(p.x, p.y, 16, '#e0bf6a', 360);
      parts.pop(p.x, p.y - HEAD - 50, 'POUND!', { size: 46 });
      // Paper falls from nearby trees and bushes; toads are stunned.
      for (const tr of trees) if (Math.abs(tr.x - p.x) < 440) shakeTree(tr);
      for (const b of blocks) if (b.kind === 'bush' && !b.gone && Math.abs(b.x - p.x) < 440) shakeBush(b);
      for (const td of toads) if (Math.abs(td.x - p.x) < 560 && td.stun <= 0) { td.stun = 4; td.grump = 0; parts.pop(td.x, gy(td.x) - 150, 'Stunned!', { size: 34 }); }
    } else if (speed > 400) {
      art.kick(yc, 0.75);
      env.sfx('land'); env.sfx('thump'); env.vibrate(35);
      shakeCam(5);
      dust(p.x, p.y, 8);
    } else {
      art.kick(yc, 0.35);
      env.sfx('land');
    }
  }

  function shakeTree(tr) {
    tr.shakeT = 0.7;
    let n = 0;
    for (const pp of paper) if (pp.locked && pp.tree === tr) { release(pp, (n - 1) * 140 + (rng() - 0.5) * 80); n++; }
    if (n) { env.sfx('rustle'); parts.burst(tr.x, GY - 480, { n: 6, colour: '#8fa04a', speed: 200, size: 10, life: 0.6, gravity: 500 }); }
  }
  function shakeBush(b) {
    b.shakeT = 0.6;
    let n = 0;
    for (const pp of paper) if (pp.locked && pp.bush === b) { release(pp, (n - (b.paper - 1) / 2) * 180 + (rng() - 0.5) * 60, -520); n++; }
    if (n) env.sfx('rustle');
  }
  function bowlBush(b) {
    b.gone = true;
    env.sfx('crack'); env.sfx('rustle');
    parts.burst(b.x, b.top + 60, { n: 14, colour: '#7f9a46', speed: 300, size: 12, life: 0.7, gravity: 700 });
    for (const pp of paper) if (pp.locked && pp.bush === b) release(pp, Math.sign(p.vx || 1) * (120 + rng() * 200), -480);
  }
  function release(pp, vx, vy = -120) {
    pp.locked = false; pp.lying = false; pp.vx = vx; pp.vy = vy; pp.tree = null; pp.bush = null;
  }

  function fallIn() {
    p.mode = 'fell'; p.modeT = 0; p.vx = 0; p.vy = 0; p.pound = false;
    fell++;
    fade = 0;
    env.sfx('whoosh');
    hints.say('Down the hole! Climb out at the signpost.', 2.4);
  }
  function climbOut() {
    p.x = cps.last + (cps.last ? 80 : 200); p.y = gy(p.x) ?? GY; p.vx = 0; p.vy = 0; p.onGround = true;
    p.mode = 'walk'; p.modeT = 0; p.sticky = 0; p.invuln = 1;
    cam.follow(p.x, 0, 0, true);
    dust(p.x, p.y, 10);
    env.sfx('pop');
  }

  function daze(secs, why) {
    p.mode = 'dazed'; p.modeT = 0; p.dazeT = secs; p.pound = false; p.invuln = 1.6;
    art.kick(yc, 0.6);
    env.sfx('bonk'); env.vibrate(90);
    shakeCam(8);
    if (why) parts.pop(p.x, headY() - 60, why, { size: 44, colour: '#b3402e' });
  }

  // ---------- the cloud ----------

  function dropItem(kind, targetX, vx = 0) {
    const k = FALLING[kind];
    const x = cloud.x + 30;
    const y = cloud.y + 70;
    const g = (gentle ? 760 : 960) * k.gk;
    // Fall time to the ground, aiming at targetX.
    const landY = gy(targetX) ?? GY;
    const T = Math.sqrt(2 * Math.max(60, landY - y) / g);
    const it = { kind, k, x, y, vx: (targetX - x) / T, vy: 0, g, state: 'fall', t: 0, rot: rng() * 6, spin: (rng() < 0.5 ? -1 : 1) * k.spin, hit: false, landX: targetX, landY, T, seed: rng() * 6 };
    void vx;
    items.push(it);
    cloud.letgo = 0.5;
    art.kick(tc, -0.35);
    env.sfx('swoosh');
    return it;
  }

  // Where to aim at the player: a little ahead of him, give or take.
  function aimAt() {
    const lead = p.vx * (0.5 + rng() * 0.4);
    let x = p.x + lead + (rng() - 0.5) * 200;
    x = clamp(x, cloud.x - 700, cloud.x + 700);
    if (gy(x) === null) x = p.x;
    return x;
  }

  function updateCloud(dt) {
    // Floats ahead of him, always in view, over the open space at the end.
    const ahead = p.mode === 'fell' ? 0 : 420 * facing;
    let want = clamp(p.x + ahead, cam.x + 300, cam.x + W - 300);
    if (climax.on) want = clamp(p.x + 200, OPEN_X + 200, WORLD - 300);
    cloud.vx = kit.ease(cloud.vx, clamp((want - cloud.x) * 1.6, -520, 520), 3, dt);
    cloud.x += cloud.vx * dt;
    cloud.x = clamp(cloud.x, cam.x + 220, cam.x + W - 220);
    cloud.letgo = Math.max(0, cloud.letgo - dt);
    cloud.suck = Math.max(0, cloud.suck - dt);
    tc.x = cloud.x; tc.y = cloud.y + Math.sin(t * 1.1) * 12;
    tc.facing = 1;
    art.animate(tc, dt, cloud.vx * 0.3, 0);
    if (!self.done) art.setAnim(tc, cloud.suck > 0 ? 'suck' : cloud.letgo > 0 ? 'letgo' : 'bloated');
    thunderT -= dt;
    if (thunderT <= 0) { thunderT = 7 + rng() * 6; env.sfx('thunder'); }
    // Letting go, from the falling-things section on.
    if (p.mode === 'fell' || p.mode === 'kerplop' || p.mode === 'munch' || self.done) return;
    if (p.x < S4 - 150) return;
    cloud.next -= dt;
    const bottleFalling = climax.bottle && climax.bottle.state === 'fall';
    if (cloud.next <= 0 && !bottleFalling) {
      cloud.dropped++;
      let kind;
      // The first little pink octopus, aimed to land on his head: a hat for the rest of the board (lore!).
      if (!p.hat && cloud.octo < 3 && (cloud.dropped === 3 || cloud.dropped === 7 || cloud.dropped === 12)) {
        cloud.octo++;
        kind = 'octopus';
        dropItem(kind, p.x + p.vx * 0.55);
      } else {
        const r = rng();
        kind = r < 0.4 ? 'fish' : r < 0.75 ? 'boat' : 'goo';
        dropItem(kind, aimAt());
      }
      cloud.next = (climax.on ? 3.4 : gentle ? 2.0 : 1.3) + rng() * 0.7;
    }
  }

  function startClimax() {
    climax.on = true; climax.t = 0; climax.wait = 3.6;
    cps.reach(OPEN_X);
    env.sfx('thunder');
  }

  function updateClimax(dt) {
    if (!climax.on || climax.caught) return;
    climax.t += dt;
    const b = climax.bottle;
    if (!b) {
      climax.wait -= dt;
      if (climax.wait <= 0 && p.mode !== 'fell') {
        climax.tries++;
        // Toss it a little way from him, into the open space.
        const side = p.x > WORLD - 700 ? -1 : p.x < OPEN_X + 400 ? 1 : (rng() < 0.5 ? -1 : 1);
        const d = gentle ? 220 : 300 + climax.tries * 40;
        const tx = clamp(p.x + side * d, OPEN_X + 150, WORLD - 150);
        climax.bottle = dropItem('bottle', tx);
        climax.bottle.bottle = true;
        parts.pop(cloud.x, cloud.y + 150, 'The bottle!', { size: 40 });
      }
    } else if (b.state === 'lying' && b.t > 0.8) {
      b.state = 'sucked'; b.t = 0; b.sx = b.x; b.sy = b.y;
      cloud.suck = 0.9;
      env.sfx('slurp');
      parts.pop(cloud.x, cloud.y + 150, 'Slurp! Another go!', { size: 36 });
    } else if (b.state === 'sucked') {
      const k = Math.min(1, b.t / 0.75);
      const e = k * k;
      b.x = lerp(b.sx, cloud.x, e); b.y = lerp(b.sy, cloud.y + 40, e);
      b.rot += dt * 12;
      if (k >= 1) { items.splice(items.indexOf(b), 1); climax.bottle = null; climax.wait = 1.4; }
    }
  }

  // ---------- falling things ----------

  function updateItems(dt) {
    const hy = headY();
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      if (it.state === 'fall') {
        const py = it.y;
        it.vy += it.g * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.spin * dt;
        const dx = Math.abs(it.x - p.x);
        const inBand = it.y >= hy - 10 && py <= hy + 60 && it.y <= p.y - 40;
        if (!it.hit && inBand && dx < it.k.r && p.mode !== 'fell' && p.mode !== 'kerplop' && p.mode !== 'munch') {
          if (it.kind === 'bottle') {
            if (canCatch()) { kerplop(it); items.splice(i, 1); continue; }
            bounceOff(it);
            parts.pop(p.x, hy - 60, rolling() ? 'Unroll to catch!' : 'Too dizzy!', { size: 40 });
          } else if (it.kind === 'octopus') {
            if (!p.hat && !rolling()) {
              p.hat = true;
              items.splice(i, 1);
              env.sfx('pop'); env.sfx('cheer');
              art.kick(yc, 0.4);
              parts.pop(p.x, hy - 70, 'A hat!', { size: 44, colour: '#c9558a' });
              continue;
            }
            bounceOff(it);
          } else if (rolling()) {
            bounceOff(it);
            env.sfx('thunk');
            dust(it.x, hy, 4, '#e0bf6a', 160);
          } else if (p.invuln <= 0 && p.mode !== 'dazed') {
            it.hit = true;
            bonks++;
            if (it.kind === 'goo') {
              p.sticky = gentle ? 1.6 : 2.4;
              env.sfx('splash');
              daze(0.45, 'SPLAT! Goo!');
              parts.burst(p.x, hy, { n: 8, colour: '#5fa8d3', speed: 260, size: 9, life: 0.6, gravity: 900 });
              items.splice(i, 1);
              continue;
            }
            daze(gentle ? 0.7 : it.kind === 'boat' ? 1.1 : 0.9, it.kind === 'boat' ? 'BONK! A boat!' : 'SPLAT! A fish!');
            p.vx = Math.sign(p.x - it.x || 1) * 160;
            bounceOff(it, true);
          }
        }
        if (it.y >= it.landY - 6) land(it);
      } else if (it.state === 'lying') {
        if (it.kind === 'fish') it.flop = Math.abs(Math.sin(it.t * 9)) * 14 * Math.max(0, 1 - it.t / 1.5);
        if (it.kind === 'octopus') it.wave = Math.sin(it.t * 6) * 0.3;
        if (it.kind !== 'bottle' && it.t > (it.kind === 'octopus' ? 2.6 : 1.6)) items.splice(i, 1);
      }
    }
    for (let i = puddles.length - 1; i >= 0; i--) { puddles[i].t += dt; if (puddles[i].t > 5) puddles.splice(i, 1); }
  }

  function bounceOff(it, soft) {
    it.hit = true;
    it.vy = -Math.abs(it.vy) * (soft ? 0.35 : 0.5) - 120;
    it.vx += Math.sign(it.x - p.x || 1) * (soft ? 160 : 260);
    it.spin = (it.spin || 1.5) * -2;
    it.landY = gy(it.x + it.vx * 0.5) ?? GY + 400;
  }

  function land(it) {
    it.y = it.landY - 6;
    it.state = 'lying';
    it.t = 0;
    if (it.kind === 'boat') { env.sfx('crunch'); if (cam.sees(it.x)) shakeCam(6); dust(it.x, it.landY, 10); }
    else if (it.kind === 'fish') { env.sfx('splash'); dust(it.x, it.landY, 4); }
    else if (it.kind === 'octopus') { env.sfx('splash'); }
    else if (it.kind === 'goo') {
      env.sfx('splash');
      puddles.push({ x: it.x, y: it.landY, r: 70, t: 0 });
      items.splice(items.indexOf(it), 1);
    } else if (it.kind === 'bottle') {
      env.sfx('thump');
      dust(it.x, it.landY, 6);
      parts.pop(it.x, it.landY - 120, 'Missed it!', { size: 40 });
      it.rot = Math.PI * 0.08;
    }
  }

  function kerplop(it) {
    climax.caught = true;
    p.mode = 'kerplop'; p.modeT = 0; p.vx = 0;
    env.sfx('bonk'); env.sfx('tinkle'); env.vibrate(140);
    art.kick(yc, 0.9);
    shakeCam(12);
    const hy = headY();
    for (let i = 0; i < 14; i++) parts.burst(p.x, hy, { n: 1, colour: i % 3 ? '#4f8a52' : '#e8f4ee', speed: 420, size: 7, life: 0.9, gravity: 1400, up: 0.9 });
    parts.pop(p.x, hy - 90, 'KER-PLOP!', { size: 64 });
    burst = { x: p.x, y: hy, t: 0 };
    note = { x: p.x, y: hy - 40, t: 0 };
    letter = { x: p.x + 90 * facing, y: hy - 30, vy: -260, vx: 180 * facing, rot: 0, landed: false };
    items.splice(items.indexOf(it), 1);
    void it;
  }

  function updateMunch(dt, inp) {
    p.modeT += dt;
    if (p.mode === 'kerplop') {
      if (p.modeT > 0.4 && p.modeT - dt <= 0.4) { env.sfx('tinkle'); parts.pop(p.x, headY() - 40, 'tinkle-plinkle', { size: 36 }); }
      if (p.modeT > 1.3) { p.mode = 'munch'; p.modeT = 0; hints.say('Mash Action to munch the note!', 3); }
      return;
    }
    munch.t += dt;
    if (inp.actionPressed) {
      munch.n++;
      env.sfx('munch');
      art.kick(yc, 0.3);
      parts.burst(p.x + 50 * facing, p.y - 150, { n: 4, colour: '#f4efe2', speed: 220, size: 7, life: 0.6, gravity: 900 });
    }
    if (munch.n >= munch.need) {
      env.sfx('cheer');
      parts.pop(p.x, p.y - HEAD - 70, 'Munched! Yum!', { size: 54 });
      finish('snatched');
    }
  }

  function finish(outcome) {
    self.done = true;
    self.outcome = outcome;
  }

  // ---------- the Yalapappus ----------

  function updatePlayer(dt, inp) {
    const ix = clamp(inp.x || 0, -1, 1);
    p.modeT += dt;
    p.sticky = Math.max(0, p.sticky - dt);
    p.landT = Math.max(0, p.landT - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    const stickK = p.sticky > 0 ? 0.5 : 1;
    const ox = p.x;
    const sl = p.onGround ? slopeAt(p.x) : 0; // + is downhill to the right

    if (p.mode === 'walk') {
      const ev = kit.walkerControl(p, inp, dt, {
        speed: 350 * stickK, accel: 2200, decel: 2600, airAccel: 1200, jump: 1250 * (p.sticky > 0 ? 0.85 : 1), jumpCut: 0.55, coyote: 0.1, buffer: 0.12,
      });
      if (ev.jumped) { art.kick(yc, -0.5); env.sfx('jump'); dust(p.x, p.y, 4); }
      // Trundling uphill is slower, downhill a touch faster.
      if (p.onGround) p.vx *= 1 - clamp(-sl * Math.sign(p.vx), 0, 1) * 1.4 * dt;
      // Down in the air: ground-pound.
      if (!p.onGround && inp.y > 0.5 && !p.pound && p.vy > -900) {
        p.pound = true;
        p.vy = Math.max(p.vy, 1500);
        p.vx *= 0.35;
        env.sfx('whoosh');
        art.kick(yc, -0.4);
      }
      // Sprint on the ground: roll up into a ball.
      if (inp.sprint && p.onGround && p.sticky <= 0) {
        p.mode = 'ball'; p.modeT = 0; p.rollT = 0; p.pound = false;
        if (Math.abs(p.vx) < 200) p.vx = (ix || facing) * 240;
        env.sfx('swoosh');
        art.kick(yc, 0.4);
      }
    } else if (p.mode === 'ball') {
      p.rollT += dt;
      const target = ix * 680;
      const same = ix && Math.sign(ix) === Math.sign(p.vx || ix);
      // Pushing on at speed only bleeds off slowly: a roll keeps what the hill gave it.
      const acc = same && Math.abs(p.vx) > Math.abs(target) ? 140 : same ? 950 : ix ? 600 : 180;
      p.vx = kit.approach(p.vx, target, acc * dt);
      // Slopes: gravity along the hill.
      if (p.onGround) p.vx += 2300 * sl * dt;
      if (p.inGoo > 0) p.vx *= Math.exp(-1.6 * dt);
      p.vx = clamp(p.vx, -1350, 1350);
      p.dust -= dt * Math.abs(p.vx) / 320;
      if (p.dust <= 0 && p.onGround) { p.dust = 0.35; dust(p.x - Math.sign(p.vx) * 50, p.y, 2, '#e0bf6a', 100); }
      // Hop while rolling: a little bounce.
      if (inp.actionPressed && p.onGround) { p.vy = -820; p.onGround = false; env.sfx('boing'); }
      if ((!inp.sprint || p.rollT > 3.2) && p.onGround) unroll();
    } else if (p.mode === 'dizzy') {
      p.vx *= Math.exp(-5 * dt);
      if (p.modeT > p.dazeT) { p.mode = 'walk'; p.modeT = 0; }
    } else if (p.mode === 'dazed') {
      p.vx *= Math.exp(-8 * dt);
      if (p.modeT > p.dazeT) { p.mode = 'walk'; p.modeT = 0; }
    }
    if (p.vx > 20) facing = 1; else if (p.vx < -20) facing = -1;

    // Move across, against the blocks.
    p.x += p.vx * dt;
    p.x = clamp(p.x, 70, WORLD - 70);
    for (const b of blocks) {
      if (b.gone) continue;
      const half = b.w / 2 + (p.mode === 'ball' ? 70 : 50);
      if (Math.abs(p.x - b.x) < half && p.y > b.top + 14) {
        if (b.kind === 'bush' && p.mode === 'ball' && Math.abs(p.vx) > 120) { bowlBush(b); continue; }
        const side = Math.sign(ox - b.x) || -Math.sign(p.vx) || 1;
        p.x = b.x + side * half;
        if (p.mode === 'ball' && Math.abs(p.vx) > 200) {
          p.vx = -p.vx * 0.55;
          env.sfx('boing');
          art.kick(yc, 0.5);
          dust(p.x - side * 40, p.y, 5);
          parts.pop(p.x, p.y - 220, 'Boing!', { size: 38 });
        } else {
          p.vx = 0;
          if (b.kind === 'bush' && Math.abs(ix) > 0.3) b.shakeT = Math.max(b.shakeT, 0.2);
        }
      }
    }
    // Up and down against the ground profile.
    const g = gy(p.x);
    if (p.onGround) {
      if (g === null) p.onGround = false;
      else if (g < p.y - 48) { p.x = ox; p.vx = p.mode === 'ball' ? -p.vx * 0.5 : 0; }
      else if (g > p.y + 36) p.onGround = false;
      else p.y = g;
      if (!p.onGround && p.mode === 'ball' && sl < 0 && p.vx > 0) { p.vy = Math.min(p.vy, -Math.abs(p.vx) * 0.85); env.sfx('boing'); parts.pop(p.x, p.y - 220, 'Wheee!', { size: 40 }); } // launched off the ramp
      if (!p.onGround && p.vy === 0) p.vy = 0.01;
    }
    if (!p.onGround) {
      p.vy = Math.min(2400, p.vy + GRAV * dt);
      p.y += p.vy * dt;
      const gn = gy(p.x);
      if (gn !== null && p.vy >= 0 && p.y >= gn) {
        const v = p.vy;
        p.y = gn; p.vy = 0; p.onGround = true;
        landed(v);
      }
    }
    if (p.y > H + 60) { fallIn(); return; }

    // Goo curtains stick.
    p.inGoo = Math.max(0, p.inGoo - dt);
    for (const c of curtains) {
      if (c.zones.some(([dx, w]) => Math.abs(c.x + dx - p.x) < w / 2 + 40) && headY() < c.bottom) {
        if (p.inGoo <= 0) { env.sfx('drip'); parts.burst(p.x, headY() + 20, { n: 5, colour: '#5fa8d3', speed: 160, size: 8, life: 0.5, gravity: 700 }); }
        p.inGoo = 0.15;
        if (p.mode !== 'ball') p.sticky = Math.max(p.sticky, gentle ? 0.8 : 1.3);
      }
    }
    for (const pd of puddles) if (p.onGround && Math.abs(pd.x - p.x) < pd.r && p.mode !== 'ball') p.sticky = Math.max(p.sticky, 0.8);

    // Toads shove him unless stunned; the ball bowls them over.
    for (const td of toads) {
      if (td.stun > 0 || p.mode === 'dazed' || p.mode === 'dizzy' || p.invuln > 0) continue;
      if (Math.abs(td.x - p.x) < 95 && p.y > gy(td.x) - 60) {
        if (p.mode === 'ball') { td.stun = 4; env.sfx('thunk'); parts.pop(td.x, gy(td.x) - 150, 'Bowled!', { size: 34 }); continue; }
        shoves++;
        td.grump = 0.8;
        p.vx = Math.sign(p.x - td.x || -1) * 560;
        p.vy = -420; p.onGround = false;
        p.mode = 'dazed'; p.modeT = 0; p.dazeT = 0.5; p.invuln = 1.2;
        env.sfx('bark'); env.vibrate(50);
        art.kick(yc, 0.5);
        parts.pop(td.x, gy(td.x) - 160, 'GRUMP!', { size: 40, colour: '#4f6b2a' });
        hints.say('Grumpy toads shove! Pound to stun them, or roll over them.', 2.6);
      }
    }

    // Footsteps.
    if (p.mode === 'walk' && p.onGround) {
      p.stepD += Math.abs(p.vx) * dt;
      if (p.stepD > 110) { p.stepD = 0; env.sfx('step'); }
    }
    cps.reach(p.x);
    if (!climax.on && p.x >= OPEN_X) startClimax();
  }

  function unroll() {
    const long = p.rollT > 2.6;
    p.mode = 'dizzy'; p.modeT = 0; p.dazeT = long ? 1.1 : 0.35;
    env.sfx('stumble');
    art.kick(yc, -0.4);
    if (long) parts.pop(p.x, p.y - 220, 'Dizzy!', { size: 40 });
  }

  function updatePaper(dt) {
    for (const pp of paper) {
      if (pp.got) { pp.t += dt; continue; }
      if (pp.locked) continue;
      if (!pp.lying) {
        pp.vy += 1100 * dt;
        pp.vx *= Math.exp(-0.8 * dt);
        pp.x += pp.vx * dt; pp.y += pp.vy * dt;
        const g = gy(pp.x);
        if (g === null) { if (pp.y > H + 100) { pp.got = true; pp.t = 9; got++; } continue; } // lost down a hole: counted as gone
        if (pp.y >= g - 36 && pp.vy > 0) {
          if (pp.vy > 300) { pp.vy = -pp.vy * 0.3; pp.y = g - 36; } else { pp.vy = 0; pp.vx = 0; pp.y = g - 36; pp.lying = true; }
        }
      }
      const r = p.mode === 'ball' ? 100 : 86;
      const cy = p.y - (p.mode === 'ball' ? BALL_H / 2 : HEAD * 0.5);
      if (kit.near(pp.x, pp.y, p.x, cy, r) && p.mode !== 'fell') {
        pp.got = true; pp.t = 0; got++;
        env.sfx('munch');
        art.kick(yc, 0.22);
        parts.pop(pp.x, pp.y - 30, got % 5 === 0 ? 'Yum!' : 'Chomp', { size: got % 5 === 0 ? 42 : 30 });
      }
    }
  }

  function updateWorld(dt) {
    for (const tr of trees) tr.shakeT = Math.max(0, tr.shakeT - dt);
    for (const b of blocks) if (b.kind === 'bush') b.shakeT = Math.max(0, b.shakeT - dt);
    for (const c of curtains) c.dripT += dt;
    for (const td of toads) {
      td.hop += dt;
      if (td.stun > 0) { td.stun -= dt; continue; }
      td.grump = Math.max(0, td.grump - dt);
      const sp = (gentle ? 120 : 170) * (td.grump > 0 ? 0 : 1);
      td.x += td.dir * sp * dt;
      if (td.x > td.x1) { td.x = td.x1; td.dir = -1; }
      if (td.x < td.x0) { td.x = td.x0; td.dir = 1; }
    }
    if (letter && !letter.landed) {
      letter.vy += 900 * dt; letter.x += letter.vx * dt; letter.y += letter.vy * dt; letter.rot += dt * 6;
      const g = gy(letter.x) ?? GY;
      if (letter.y >= g - 8) { letter.y = g - 8; letter.landed = true; letter.rot = 0.1; }
    }
    if (burst) burst.t += dt;
    if (note) note.t += dt;
  }

  function updateLook(dt) {
    yc.x = p.x; yc.y = p.y;
    yc.facing = facing;
    art.animate(yc, dt, p.vx, 0);
    yc.facing = facing;
    if (self.done) return;
    if (p.mode === 'ball') { art.setAnim(yc, 'ball'); yc.z = BALL_H / 2; yc.rot = 0; return; }
    yc.z = 0;
    yc.rot = 0;
    if (p.mode === 'kerplop') art.setAnim(yc, 'bonked');
    else if (p.mode === 'munch') art.setAnim(yc, 'munch');
    else if (p.mode === 'dazed') art.setAnim(yc, p.sticky > 0 ? 'gooStuck' : 'bonked');
    else if (p.mode === 'dizzy') art.setAnim(yc, p.dazeT > 0.5 ? 'dizzy' : 'rollUp');
    else if (p.mode === 'fell') art.setAnim(yc, 'wail');
    else if (p.pound) { art.setAnim(yc, 'pound'); yc.rot = 0; }
    else if (!p.onGround) art.setAnim(yc, p.vy < -200 ? 'hop' : p.vy < 300 ? 'hopTop' : 'hop');
    else if (p.landT > 0) art.setAnim(yc, p.landT > 0.2 ? 'crouch' : 'land');
    else if (climax.on && climax.bottle?.state === 'fall' && Math.abs(p.vx) < 40) art.setAnim(yc, 'lookUp');
    else if (p.sticky > 0 && Math.abs(p.vx) > 40) art.setAnim(yc, 'gooStuck');
    else if (Math.abs(p.vx) > 40) art.setAnim(yc, 'trundle');
    else art.setAnim(yc, 'idle');
  }

  // ---------- drawing ----------

  // The ground: flat stretches through the kit (the terrain strip when it
  // arrives), slopes as ink polygons with the slope pieces on top.
  // The strip's walkable soil edge sits 52/125 down the piece (grass tufts above it).
  const STRIP_H = 240, STRIP_K = STRIP_H / 125, STRIP_LIFT = 52 * STRIP_K;
  const FILL = '#7d5e31'; // the strip's lowest soil, for everything below it
  const stripOpts = { sheet: TERRAIN, item: 1, height: STRIP_H, lift: STRIP_LIFT, fill: FILL };
  const originCam = { x: 0 }; // for the kit's culling inside a transformed space
  function drawGround(g) {
    const delivered = !!art.sprite(TERRAIN, 1);
    if (delivered) {
      // Slopes first: the strip sheared along the hill (overflowing a little into
      // the flats so the tufts join), then the flats over it, then the slope pieces.
      for (const s of segs) {
        if (s.hole || s.kind === 'flat' || !cam.sees(s.x0, s.x1)) continue;
        const k = (s.y1 - s.y0) / (s.x1 - s.x0);
        g.save();
        g.beginPath(); g.rect(s.x0 - 40, 0, s.x1 - s.x0 + 80, H + 100); g.clip();
        g.translate(s.x0, s.y0);
        g.transform(1, k, 0, 1, 0, 0);
        kit.drawGround(g, originCam, { x: -40, y: 0, w: s.x1 - s.x0 + 80, h: H + 300 }, stripOpts);
        g.fillStyle = FILL;
        g.fillRect(-40, -STRIP_LIFT + STRIP_H - 9 * STRIP_K, s.x1 - s.x0 + 80, H + 300);
        g.restore();
      }
      for (const s of segs) {
        if (s.hole || s.kind !== 'flat' || !cam.sees(s.x0, s.x1)) continue;
        kit.drawGround(g, cam, { x: s.x0, y: s.y0, w: s.x1 - s.x0, h: H + 100 - s.y0 }, stripOpts);
        // Cover the strip's own ink bottom edge with the soil fill.
        g.fillStyle = FILL;
        g.fillRect(Math.max(s.x0, cam.x - 40), s.y0 - STRIP_LIFT + STRIP_H - 9 * STRIP_K, Math.min(s.x1, cam.x + W + 40) - Math.max(s.x0, cam.x - 40), H);
      }
      for (const s of segs) if (!s.hole && s.kind !== 'flat' && cam.sees(s.x0, s.x1)) drawSlopePiece(g, s);
    } else {
      drawProfileInk(g);
    }
    // The holes: a pit falling away into the dark, walled by the delivered edge pieces.
    for (const s of segs) {
      if (!s.hole || !cam.sees(s.x0, s.x1)) continue;
      const yl = profileY(s.x0 - 1), yr = profileY(s.x1 + 1);
      g.save();
      const gr = g.createLinearGradient(0, Math.min(yl, yr), 0, H + 100);
      gr.addColorStop(0, FILL); gr.addColorStop(0.35, '#3e2a18'); gr.addColorStop(1, '#120b06');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(s.x0 - 30, yl); g.lineTo(s.x1 + 30, yr); g.lineTo(s.x1 + 30, H + 100); g.lineTo(s.x0 - 30, H + 100); g.closePath(); g.fill();
      // Roots in the walls.
      g.strokeStyle = 'rgba(20,12,6,0.55)'; g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i < 5; i++) { const y = yl + 60 + i * 55; g.moveTo(s.x0 + 8, y); g.quadraticCurveTo(s.x0 + 40, y + 20, s.x0 + 30 + kit.hash(i + s.x0) * 40, y + 60); }
      for (let i = 0; i < 5; i++) { const y = yr + 40 + i * 60; g.moveTo(s.x1 - 8, y); g.quadraticCurveTo(s.x1 - 40, y + 25, s.x1 - 30 - kit.hash(i + s.x1) * 40, y + 65); }
      g.stroke();
      g.restore();
      // The edge pieces: their walkable soil edge (45/186 down) on the ground line, the cut face at the hole.
      kit.sprite(g, TERRAIN, 4, s.x0 + 6, yl, { height: 236, ax: 400 / 465, ay: 45 / 186 }, (gg, x, y) => art.drawSprite(gg, art.prop('yalapappus', 3), x + 22, y + 26, { height: 150, ax: 1, ay: 1 }));
      kit.sprite(g, TERRAIN, 5, s.x1 - 6, yr, { height: 238, ax: 65 / 472, ay: 45 / 188 }, (gg, x, y) => art.drawSprite(gg, art.prop('yalapappus', 4), x - 22, y + 26, { height: 150, ax: 0, ay: 1 }));
    }
  }

  // The whole visible ground profile in ink: one polygon per run between holes.
  function drawProfileInk(g) {
    const { top, body, ink } = GROUND_INK;
    const x0 = cam.x - 40, x1 = cam.x + W + 40;
    const bottom = H + 100;
    const yAt = (x) => profileY(x) + (kit.hash(Math.floor(x / 24)) - 0.5) * 6;
    let run = null;
    const runs = [];
    for (const s of segs) {
      if (s.x1 < x0 || s.x0 > x1) { if (run) { runs.push(run); run = null; } continue; }
      if (s.hole) { if (run) { runs.push(run); run = null; } continue; }
      if (!run) run = { a: Math.max(s.x0, x0), b: s.x1, open: s.x0 < x0 };
      run.b = Math.min(s.x1, x1);
      run.end = s.x1 <= x1;
    }
    if (run) runs.push(run);
    g.save();
    for (const r of runs) {
      const pts = [];
      for (let x = r.a; x < r.b; x += 24) pts.push([x, yAt(x)]);
      pts.push([r.b - 0.5, yAt(r.b - 0.5)]);
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(r.a, bottom);
      for (const [x, y] of pts) g.lineTo(x, y);
      g.lineTo(r.b, bottom);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(43,29,20,0.22)'; g.lineWidth = 2;
      g.beginPath();
      for (let x = Math.floor(r.a / 38) * 38 + 38; x < r.b - 10; x += 38) {
        const y0 = profileY(x);
        for (let y = y0 + 40 + kit.hash(x) * 30; y < bottom; y += 70) { g.moveTo(x, y); g.lineTo(x + 22, y + 16); }
      }
      g.stroke();
      g.fillStyle = top;
      g.beginPath();
      g.moveTo(r.a, pts[0][1] + 26);
      for (const [x, y] of pts) g.lineTo(x, y - kit.hash(x * 0.7) * 8);
      g.lineTo(r.b, pts[pts.length - 1][1] + 26);
      g.closePath(); g.fill();
      g.strokeStyle = ink; g.lineWidth = 3.5;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (r.end) g.lineTo(r.b, bottom);
      if (!r.open) { g.moveTo(r.a, pts[0][1]); g.lineTo(r.a, bottom); }
      g.stroke();
      g.lineWidth = 2;
      g.beginPath();
      for (let x = Math.floor(r.a / 31) * 31 + 31; x < r.b - 8; x += 31) {
        if (kit.hash(x * 1.3) < 0.45) continue;
        const y = profileY(x);
        g.moveTo(x, y); g.lineTo(x - 4, y - 12); g.moveTo(x + 5, y); g.lineTo(x + 7, y - 14);
      }
      g.stroke();
    }
    g.restore();
  }

  // A slope piece (terrain 2 rising, 3 falling) stretched so its drawn soil edge
  // runs from (x0, y0) to (x1, y1): in the pieces, that edge runs from sprite
  // (140, 170) to (1240, 35) on item 2 and from (250, 30) to (1300, 165) on item 3.
  function drawSlope(g, s, delivered = false) {
    const { top, body, ink } = GROUND_INK;
    if (delivered) { drawSlopePiece(g, s); return; }
    g.save();
    g.fillStyle = body;
    g.beginPath(); g.moveTo(s.x0, s.y0 + 4); g.lineTo(s.x1, s.y1 + 4); g.lineTo(s.x1, H + 100); g.lineTo(s.x0, H + 100); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(43,29,20,0.22)'; g.lineWidth = 2;
    g.beginPath();
    for (let x = s.x0 + 20; x < s.x1; x += 38) {
      const y0 = lerp(s.y0, s.y1, (x - s.x0) / (s.x1 - s.x0));
      for (let y = y0 + 50 + kit.hash(x) * 30; y < H + 60; y += 70) { g.moveTo(x, y); g.lineTo(x + 22, y + 16); }
    }
    g.stroke();
    g.fillStyle = top;
    g.beginPath(); g.moveTo(s.x0, s.y0); g.lineTo(s.x1, s.y1); g.lineTo(s.x1, s.y1 + 26); g.lineTo(s.x0, s.y0 + 26); g.closePath(); g.fill();
    g.strokeStyle = ink; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(s.x0, s.y0); g.lineTo(s.x1, s.y1); g.stroke();
    g.restore();
  }

  // The slope pieces are wedges with a level bottom (a ramp lying on flat
  // ground), so only their grassy edge is used: scaled and turned so the drawn
  // soil edge runs from (x0, y0) to (x1, y1), and clipped to a band along it;
  // the sheared strip beneath supplies the soil.
  function drawSlopePiece(g, s) {
    const up = s.kind === 'up';
    const sp = art.sprite(TERRAIN, up ? 2 : 3);
    if (!sp) return;
    const [ax0, ay0, ax1, ay1, soil] = up ? [140, 170, 1240, 35, 26] : [250, 30, 1300, 165, 37];
    const k = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) / Math.hypot(ax1 - ax0, ay1 - ay0);
    const rot = Math.atan2(s.y1 - s.y0, s.x1 - s.x0) - Math.atan2(ay1 - ay0, ax1 - ax0);
    const b = soil * k - 6;
    g.save();
    g.beginPath();
    g.moveTo(s.x0, s.y0 - 130); g.lineTo(s.x1, s.y1 - 130); g.lineTo(s.x1, s.y1 + b); g.lineTo(s.x0, s.y0 + b);
    g.closePath(); g.clip();
    g.translate(s.x0, s.y0);
    g.rotate(rot);
    g.scale(k, k);
    g.drawImage(sp.img, -ax0, -ay0, sp.w, sp.h);
    g.restore();
  }

  function drawPalm(g, x, baseY, tr, tt) {
    const sway = (tr.shakeT > 0 ? Math.sin(tt * 40) * 0.05 * tr.shakeT : 0) + Math.sin(tt * 0.8 + tr.seed * 6) * 0.015;
    const h = 560;
    kit.sprite(g, TERRAIN, 8, x + 30, baseY + 10, { height: h, ay: 1 }, (gg) => {
      gg.save();
      gg.translate(x, baseY);
      gg.rotate(sway);
      gg.strokeStyle = INK; gg.lineWidth = 4;
      gg.fillStyle = '#b48552';
      // The curving trunk.
      gg.beginPath();
      gg.moveTo(-26, 0);
      gg.bezierCurveTo(-30, -h * 0.4, 20, -h * 0.6, 40, -h * 0.9);
      gg.lineTo(70, -h * 0.9);
      gg.bezierCurveTo(50, -h * 0.6, 10, -h * 0.4, 26, 0);
      gg.closePath(); gg.fill(); gg.stroke();
      gg.lineWidth = 2;
      for (let i = 1; i < 9; i++) {
        const k = i / 9;
        const px = lerp(-26, 40, k * k) + 3, py = -h * 0.9 * k;
        gg.beginPath(); gg.moveTo(px - 18, py); gg.quadraticCurveTo(px + 6, py - 10, px + 30, py); gg.stroke();
      }
      // The fronds.
      gg.translate(55, -h * 0.9);
      gg.fillStyle = '#6f9a3c';
      gg.lineWidth = 3.5;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.15 - (i / 6) * Math.PI * 0.95 + Math.PI * 0.25;
        const len = 230 + (i % 2) * 40;
        gg.save();
        gg.rotate(a + Math.sin(tt * 1.2 + i) * 0.03 + sway * 3);
        gg.beginPath();
        gg.moveTo(0, 0);
        gg.quadraticCurveTo(len * 0.5, -40, len, 30);
        gg.quadraticCurveTo(len * 0.55, 10, 0, 22);
        gg.closePath(); gg.fill(); gg.stroke();
        gg.beginPath();
        for (let s = 1; s < 7; s++) { const q = s / 7; gg.moveTo(len * q, lerp(-18, 20, q)); gg.lineTo(len * q + 10, lerp(-18, 20, q) + 26); }
        gg.stroke();
        gg.restore();
      }
      // Coconuts.
      gg.fillStyle = '#8a5a3a';
      for (let i = 0; i < 3; i++) { gg.beginPath(); gg.arc(-10 + i * 18, 16 + (i % 2) * 8, 13, 0, Math.PI * 2); gg.fill(); gg.stroke(); }
      gg.restore();
    });
  }

  function drawBoulder(g, b) {
    kit.sprite(g, TERRAIN, 6, b.x, b.top + b.h + 12, { height: b.h + 20, ay: 1 }, (gg) => {
      const L = b.x - b.w / 2, R = b.x + b.w / 2, T = b.top, B = b.top + b.h + 4;
      gg.save();
      gg.fillStyle = '#a89a86'; gg.strokeStyle = INK; gg.lineWidth = 4;
      gg.beginPath();
      gg.moveTo(L - 14, B);
      gg.lineTo(L - 8, T + b.h * 0.55);
      gg.lineTo(L + 14, T + 18);
      gg.lineTo(L + 60, T + 2);
      gg.lineTo(b.x + 10, T);
      gg.lineTo(R - 50, T + 4);
      gg.lineTo(R - 10, T + 24);
      gg.lineTo(R + 10, T + b.h * 0.5);
      gg.lineTo(R + 12, B);
      gg.closePath(); gg.fill(); gg.stroke();
      // Cracks and hatching on the shaded side.
      gg.strokeStyle = 'rgba(43,29,20,0.5)'; gg.lineWidth = 2.5;
      gg.beginPath();
      gg.moveTo(L + 40, T + 30); gg.lineTo(L + 70, T + 70); gg.lineTo(L + 60, T + 110);
      gg.moveTo(R - 70, T + 20); gg.lineTo(R - 40, T + 60);
      gg.stroke();
      gg.strokeStyle = 'rgba(43,29,20,0.28)'; gg.lineWidth = 2;
      gg.beginPath();
      for (let x = b.x; x < R + 8; x += 16) { gg.moveTo(x, T + 40 + kit.hash(x) * 20); gg.lineTo(x + 10, B - 6); }
      gg.stroke();
      gg.fillStyle = 'rgba(255,255,255,0.28)';
      gg.beginPath(); gg.ellipse(L + b.w * 0.3, T + 22, b.w * 0.18, 8, 0, 0, Math.PI * 2); gg.fill();
      // Moss tufts along the top.
      gg.strokeStyle = '#6f9a3c'; gg.lineWidth = 3;
      gg.beginPath();
      for (let x = L + 30; x < R - 20; x += 34) { gg.moveTo(x, T + 4); gg.lineTo(x - 4, T - 10); gg.moveTo(x + 6, T + 4); gg.lineTo(x + 9, T - 12); }
      gg.stroke();
      gg.restore();
    });
  }

  function drawBush(g, b, tt) {
    if (b.gone) return;
    const wob = b.shakeT > 0 ? Math.sin(tt * 36) * 0.06 * b.shakeT / 0.6 : 0;
    const base = b.top + 135;
    g.save();
    g.translate(b.x, base); g.rotate(wob); g.translate(-b.x, -base);
    const full = b.paper && paper.some((pp) => pp.locked && pp.bush === b);
    kit.sprite(g, full ? PROPS : 'props.trollusk', full ? 11 : 5, b.x, base + 6, { height: b.h, ay: 1 }, (gg, x, y, o) => {
      if (!art.drawSprite(gg, art.prop('trollusk', 5), x, y, o)) {
        gg.save();
        gg.fillStyle = '#6f9a3c'; gg.strokeStyle = INK; gg.lineWidth = 4;
        for (const [dx, dy, r] of [[-45, -60, 52], [40, -66, 56], [0, -110, 50], [-10, -50, 60]]) { gg.beginPath(); gg.arc(x + dx, y + dy, r, 0, Math.PI * 2); gg.fill(); gg.stroke(); }
        gg.restore();
      }
      // Paper caught in the leaves, while it is still there.
      if (b.paper && paper.some((pp) => pp.locked && pp.bush === b)) {
        gg.save();
        gg.fillStyle = '#f4efe2'; gg.strokeStyle = INK; gg.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
          gg.save(); gg.translate(x - 50 + i * 34, y - 60 - (i % 2) * 50); gg.rotate(i * 0.7);
          gg.fillRect(-14, -10, 28, 20); gg.strokeRect(-14, -10, 28, 20);
          gg.restore();
        }
        gg.restore();
      }
    });
    g.restore();
  }

  function drawCurtain(g, c, tt) {
    kit.sprite(g, TERRAIN, 7, c.x, c.top, { height: 400, ay: 0 }, (gg) => {
      gg.save();
      gg.strokeStyle = '#2f6d93'; gg.lineWidth = 3.5;
      gg.fillStyle = '#5fa8d3';
      // A branch it hangs from.
      gg.fillStyle = '#8a6a44';
      gg.beginPath(); gg.roundRect ? gg.roundRect(c.x - 150, -10, 300, 40, 14) : gg.rect(c.x - 150, -10, 300, 40); gg.fill(); gg.stroke();
      gg.fillStyle = '#5fa8d3';
      const n = 7;
      for (let i = 0; i < n; i++) {
        const x = c.x - c.w / 2 + (i + 0.5) * (c.w / n);
        const len = c.bottom - 110 + kit.hash(i + c.x) * 100 + Math.sin(tt * 1.5 + i) * 8;
        gg.beginPath();
        gg.moveTo(x - 11, 20);
        gg.quadraticCurveTo(x - 14, len * 0.6, x - 7, len - 14);
        gg.quadraticCurveTo(x, len + 12, x + 7, len - 14);
        gg.quadraticCurveTo(x + 14, len * 0.6, x + 11, 20);
        gg.closePath(); gg.fill(); gg.stroke();
        gg.fillStyle = 'rgba(255,255,255,0.45)';
        gg.beginPath(); gg.ellipse(x - 4, len * 0.45, 3, len * 0.25, 0, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = '#5fa8d3';
        // A drip now and then.
        const d = (c.dripT * 0.5 + kit.hash(i * 3 + c.x)) % 1;
        if (d > 0.6) { gg.beginPath(); gg.arc(x, len + (d - 0.6) * 500, 7, 0, Math.PI * 2); gg.fill(); gg.stroke(); }
      }
      gg.restore();
    });
  }

  function drawToad(g, td, tt) {
    const y = gy(td.x) ?? GY;
    const hopZ = td.stun > 0 ? 0 : Math.max(0, Math.sin(td.hop * 7)) * 26;
    const flip = td.dir < 0;
    kit.sprite(g, PROPS, 10, td.x, y - hopZ + 4, { height: 130, ay: 1, flip }, (gg) => {
      gg.save();
      gg.translate(td.x, y - hopZ);
      gg.scale(flip ? -1 : 1, 1);
      gg.fillStyle = td.stun > 0 ? '#9db27a' : '#6b8f3a'; gg.strokeStyle = INK; gg.lineWidth = 4;
      gg.beginPath(); gg.ellipse(0, -46, 66, 44, 0, 0, Math.PI * 2); gg.fill(); gg.stroke();
      gg.beginPath(); gg.ellipse(30, -80, 36, 26, 0, 0, Math.PI * 2); gg.fill(); gg.stroke();
      gg.fillStyle = '#f2e9c8';
      gg.beginPath(); gg.ellipse(44, -96, 11, 12, 0, 0, Math.PI * 2); gg.fill(); gg.stroke();
      gg.fillStyle = INK;
      gg.beginPath(); gg.arc(47, -95, 4, 0, Math.PI * 2); gg.fill();
      gg.lineWidth = 3;
      gg.beginPath(); gg.moveTo(32, -108); gg.lineTo(56, -102); gg.stroke(); // the grumpy brow
      gg.beginPath(); gg.moveTo(38, -70); gg.quadraticCurveTo(56, -64, 66, -74); gg.stroke(); // the frown
      gg.fillStyle = td.stun > 0 ? '#9db27a' : '#6b8f3a';
      gg.beginPath(); gg.ellipse(-40, -12, 30, 13, 0, 0, Math.PI * 2); gg.fill(); gg.stroke();
      gg.beginPath(); gg.ellipse(34, -10, 26, 11, 0, 0, Math.PI * 2); gg.fill(); gg.stroke();
      gg.restore();
    });
    if (td.stun > 0) {
      g.save();
      g.fillStyle = '#f2c53d'; g.strokeStyle = INK; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = tt * 5 + i * 2.1;
        star(g, td.x + Math.cos(a) * 40, y - 130 + Math.sin(a) * 10, 9);
      }
      g.restore();
    }
  }

  function star(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
  }

  function drawOctopus(g, x, y, opts = {}) {
    const { height = 84, rot = 0, flip = false, alpha = 1, wave = 0 } = opts;
    kit.sprite(g, PROPS, 9, x, y, { height, ay: 0.5, rot, flip, alpha }, (gg) => {
      gg.save();
      gg.globalAlpha *= alpha;
      gg.translate(x, y); gg.rotate(rot); gg.scale(flip ? -1 : 1, 1);
      const k = height / 84;
      gg.scale(k, k);
      gg.fillStyle = '#ef9fc0'; gg.strokeStyle = INK; gg.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.2 + (i / 5) * Math.PI * 0.6;
        const w = Math.sin(t * 7 + i * 1.3) * 0.25 + wave;
        gg.beginPath();
        gg.moveTo(Math.cos(a) * 14, 6);
        gg.quadraticCurveTo(Math.cos(a + w) * 34, 24 + Math.sin(w) * 6, Math.cos(a + w * 1.5) * 30, 40);
        gg.lineWidth = 7; gg.strokeStyle = '#ef9fc0'; gg.stroke();
        gg.lineWidth = 3; gg.strokeStyle = INK;
      }
      gg.beginPath(); gg.ellipse(0, -8, 28, 26, 0, 0, Math.PI * 2); gg.fill(); gg.stroke();
      gg.fillStyle = '#fff';
      gg.beginPath(); gg.arc(-9, -12, 7, 0, Math.PI * 2); gg.arc(10, -12, 7, 0, Math.PI * 2); gg.fill(); gg.stroke();
      gg.fillStyle = INK;
      gg.beginPath(); gg.arc(-8, -11, 3, 0, Math.PI * 2); gg.arc(11, -11, 3, 0, Math.PI * 2); gg.fill();
      gg.beginPath(); gg.moveTo(-6, 2); gg.quadraticCurveTo(0, 8, 6, 2); gg.stroke();
      gg.restore();
    });
  }

  function drawPaper(g, pp, tt) {
    const K = PAPER[pp.kind];
    const y = pp.y + (pp.got ? -pp.t * 260 : pp.lying ? Math.sin(tt * 2.6 + pp.seed) * 6 : 0);
    const alpha = pp.got ? Math.max(0, 1 - pp.t / 0.5) : 1;
    const rot = pp.lying ? Math.sin(pp.seed) * 0.3 : tt * 4 + pp.seed;
    const fb = (gg, x, yy, o) => {
      if (art.drawSprite(gg, art.prop(K.standin[0], K.standin[1]), x, yy, o)) return;
      gg.save(); gg.globalAlpha *= alpha; gg.translate(x, yy); gg.rotate(rot);
      gg.fillStyle = '#f4efe2'; gg.strokeStyle = INK; gg.lineWidth = 3;
      gg.fillRect(-K.h * 0.4, -K.h * 0.5, K.h * 0.8, K.h); gg.strokeRect(-K.h * 0.4, -K.h * 0.5, K.h * 0.8, K.h);
      gg.restore();
    };
    if (K.item) kit.sprite(g, PROPS, K.item, pp.x, y, { height: K.h, ay: 0.5, rot, alpha }, fb);
    else fb(g, pp.x, y, { height: K.h, ay: 0.5, rot, alpha });
  }

  function drawItem(g, it, tt) {
    const K = it.k;
    let rot = it.rot, yy = it.y, ay = 0.5, alpha = 1;
    const flip = it.vx < 0;
    if (it.kind === 'fish') rot = Math.sin(tt * 14 + it.seed) * 0.25 + (it.state === 'lying' ? Math.PI / 2 * 0.9 : 0.6);
    if (it.kind === 'goo') rot = Math.sin(tt * 6 + it.seed) * 0.08;
    if (it.kind === 'octopus') rot = Math.sin(tt * 5 + it.seed) * 0.2;
    if (it.state === 'lying') {
      ay = 0.85;
      if (it.kind === 'boat') rot = 0.35;
      if (it.kind === 'bottle') rot = 0.1;
      if (it.kind === 'octopus') rot = 0;
      yy -= it.flop || 0;
      if (it.kind !== 'bottle') alpha = clamp(((it.kind === 'octopus' ? 2.6 : 1.6) - it.t) / 0.4, 0, 1);
    }
    if (it.kind === 'octopus') { drawOctopus(g, it.x, yy - (ay - 0.5) * K.h, { rot, flip, alpha, wave: it.wave || 0 }); return; }
    kit.sprite(g, PROPS, K.item, it.x, yy, { height: K.h, ay, rot, flip, alpha }, (gg, x, y, o) => {
      if (art.drawSprite(gg, art.prop(K.standin[0], K.standin[1]), x, y, o)) return;
      gg.save(); gg.globalAlpha *= alpha; gg.translate(x, y); gg.rotate(rot);
      gg.fillStyle = { bottle: '#3f7d43', boat: '#b9493c', fish: '#d0b04a', goo: '#5fa8d3' }[it.kind];
      gg.strokeStyle = INK; gg.lineWidth = 4;
      gg.beginPath(); gg.ellipse(0, 0, K.h * 0.55, K.h * 0.32, 0, 0, Math.PI * 2); gg.fill(); gg.stroke();
      gg.restore();
    });
  }

  function drawShadow(g, it) {
    const near = clamp((it.y - (cloud.y + 70)) / Math.max(100, it.landY - (cloud.y + 70)), 0, 1);
    const w = it.k.h * (0.35 + 0.4 * near) + (it.kind === 'bottle' ? 40 : 10);
    const a = (it.kind === 'bottle' ? 0.25 : 0.14) + 0.3 * near;
    kit.sprite(g, PROPS, 12, it.landX, it.landY + 6, { height: w * 0.5, ay: 0.5, alpha: a }, (gg) => {
      gg.save();
      gg.globalAlpha = a;
      gg.fillStyle = INK;
      gg.beginPath(); gg.ellipse(it.landX, it.landY + 4, w, w * 0.24, 0, 0, Math.PI * 2); gg.fill();
      gg.restore();
    });
    if (it.kind === 'bottle') {
      g.save();
      g.strokeStyle = '#b3402e'; g.lineWidth = 4; g.setLineDash([10, 10]);
      g.beginPath(); g.ellipse(it.landX, it.landY + 4, w + 16, (w + 16) * 0.24, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
      if (Math.abs(it.landX - p.x) > 60) marker(g, it.landX, it.landY - 40, { t, label: 'Stand here!' });
    }
  }

  function drawSignpost(g, x, i) {
    const y = gy(x) ?? GY;
    g.save();
    g.fillStyle = '#b48552'; g.strokeStyle = INK; g.lineWidth = 4;
    g.fillRect(x - 12, y - 250, 24, 250); g.strokeRect(x - 12, y - 250, 24, 250);
    g.fillStyle = '#d9c39a';
    g.beginPath(); g.moveTo(x - 90, y - 250); g.lineTo(x + 70, y - 250); g.lineTo(x + 100, y - 222); g.lineTo(x + 70, y - 194); g.lineTo(x - 90, y - 194); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = '700 26px Fraunces, Georgia, serif'; g.textAlign = 'center';
    g.fillText(i === 4 ? 'NOWHERE' : i === 0 ? 'THE EDGE' : 'TO NOWHERE', x - 5, y - 213);
    g.restore();
  }

  function drawMunchMeter(g) {
    const cx = clamp(p.x - cam.x, 240, W - 240), cy = 300;
    g.save();
    g.fillStyle = 'rgba(248,241,224,0.92)'; g.strokeStyle = INK; g.lineWidth = 4;
    const w = munch.need * 40 + 30;
    g.beginPath(); g.roundRect ? g.roundRect(cx - w / 2, cy - 34, w, 60, 18) : g.rect(cx - w / 2, cy - 34, w, 60); g.fill(); g.stroke();
    for (let i = 0; i < munch.need; i++) {
      g.fillStyle = i < munch.n ? '#f2c53d' : 'rgba(51,36,26,0.18)';
      g.beginPath(); g.arc(cx - w / 2 + 35 + i * 40, cy - 4, 14, 0, Math.PI * 2); g.fill();
      if (i < munch.n) g.stroke();
    }
    g.restore();
    actionPrompt(g, cx, cy - 50, 'Munch! Mash it!', { kind: env.inputKind, t, pulse: 1 });
  }

  function drawHat(g, tt) {
    if (!p.hat) return;
    if (p.mode === 'ball') {
      const a = yc.animT * 9;
      drawOctopus(g, p.x + Math.cos(a - Math.PI / 2) * (BALL_H / 2 + 10), p.y - BALL_H / 2 + Math.sin(a - Math.PI / 2) * (BALL_H / 2 + 10), { rot: a, height: 70 });
      return;
    }
    const sq = yc.sq;
    const top = p.y - (HEAD + 18) * (1 - sq) - (yc.z || 0);
    drawOctopus(g, p.x + 6 * facing, top + 22 + Math.sin(tt * 3) * 2, { height: 92, flip: facing < 0 });
  }

  // ---------- the board ----------

  const self = {
    time: kit.boardTime(env, ENTRY.time),
    done: false,
    outcome: null,
    outroTime: 2.2,
    // For the autopilot and the tests.
    get player() { return p; },
    get cloud() { return cloud; },
    get climax() { return climax; },
    get munch() { return munch; },
    get bonks() { return bonks; },
    get fell() { return fell; },
    get got() { return got; },
    get total() { return TOTAL; },
    get facingDir() { return facing; },
    items, paper, blocks, trees, curtains, toads, segs, cps, gy, slopeAt, dropItem, WORLD, OPEN_X, GY,
    focus: () => [{ x: p.x - cam.x, y: p.y - 120 }],
    update(dt, inS) {
      inS = inS || {};
      t += dt;
      if (self.done) {
        updateWorld(dt); updateItems(dt); parts.update(dt); updateLook(dt);
        outro(dt);
        cam.follow(p.x, 0, dt);
        return;
      }
      self.time = Math.max(0, self.time - dt);
      if (p.mode === 'fell') {
        fade += dt;
        p.modeT += dt;
        if (p.modeT > 1.1) climbOut();
      } else if (p.mode === 'kerplop' || p.mode === 'munch') {
        updateMunch(dt, inS);
      } else {
        updatePlayer(dt, inS);
      }
      updateWorld(dt);
      updateCloud(dt);
      updateClimax(dt);
      updateItems(dt);
      updatePaper(dt);
      parts.update(dt);
      hints.update(dt, p.x);
      updateLook(dt);
      cam.follow(p.x, p.mode === 'fell' ? 0 : p.vx, dt);
      if (self.time <= 0 && !self.done) finish('kept');
    },
    draw(g, tt) {
      kit.drawBackdrop(g, cam, { panels: ['adv/b06/backdrop-1', 'adv/b06/backdrop-2', 'adv/b06/backdrop-3'], standin: ENTRY.scene });
      kit.haze(g, 'rgba(243,233,210,0.16)');
      cam.begin(g);
      // Far: the palms, the signposts, the goo curtains.
      for (const tr of trees) if (cam.sees(tr.x - 320, tr.x + 320)) drawPalm(g, tr.x, (profileY(tr.x) ?? GY) + 8, tr, tt);
      cps.list.forEach((x, i) => { if (cam.sees(x)) drawSignpost(g, x + (i === 0 ? 70 : 0), i); });
      for (const c of curtains) if (cam.sees(c.x - 160, c.x + 160)) drawCurtain(g, c, tt);
      drawGround(g);
      // Goo puddles.
      for (const pd of puddles) {
        if (!cam.sees(pd.x)) continue;
        g.save();
        g.globalAlpha = Math.min(1, (5 - pd.t) / 0.6) * 0.85;
        g.fillStyle = '#5fa8d3'; g.strokeStyle = '#2f6d93'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(pd.x, pd.y + 4, pd.r, 15, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.restore();
      }
      for (const b of blocks) {
        if (!cam.sees(b.x - b.w, b.x + b.w)) continue;
        if (b.kind === 'rock') {
          kit.sprite(g, 'props.yalapappus', b.item, b.x, b.top + b.h + 12, { height: b.h + 18, ay: 1 }, (gg, x, y, o) => {
            gg.save(); gg.fillStyle = '#9b958c'; gg.strokeStyle = INK; gg.lineWidth = 4;
            gg.beginPath(); gg.ellipse(x, y - o.height * 0.45, b.w * 0.6, o.height * 0.48, 0, 0, Math.PI * 2); gg.fill(); gg.stroke(); gg.restore();
          });
        } else if (b.kind === 'boulder') drawBoulder(g, b);
      }
      for (const td of toads) if (cam.sees(td.x)) drawToad(g, td, tt);
      for (const it of items) if (it.state === 'fall' && cam.sees(it.landX)) drawShadow(g, it);
      for (const it of items) if (it.state === 'lying' && cam.sees(it.x)) drawItem(g, it, tt);
      if (letter) {
        const im = art.image('ui/letter');
        const sp = im ? { img: im, w: im.naturalWidth || im.width, h: im.naturalHeight || im.height } : null;
        if (!art.drawSprite(g, sp, letter.x, letter.y, { height: 70, rot: letter.rot })) {
          g.save(); g.translate(letter.x, letter.y - 25); g.rotate(letter.rot); g.fillStyle = '#f8f1e0'; g.strokeStyle = INK; g.lineWidth = 3;
          g.fillRect(-40, -25, 80, 50); g.strokeRect(-40, -25, 80, 50); g.restore();
        }
      }
      for (const pp of paper) if (!pp.locked && !(pp.got && pp.t > 0.5) && cam.sees(pp.x)) drawPaper(g, pp, tt);
      // The Typhoonigator overhead, with the letter.
      art.drawCreature(g, tc, tt, { reduceMotion: env.reduceMotion, shadow: false });
      if (!climax.caught) letterTag(g, cloud.x + 70, tc.y + 125, { t: tt });
      // The Yalapappus.
      if (p.mode !== 'fell') {
        art.drawCreature(g, yc, tt, { reduceMotion: env.reduceMotion });
        drawHat(g, tt);
        if (p.sticky > 0 && p.mode !== 'ball') {
          g.save();
          g.globalAlpha = Math.min(1, p.sticky / 0.5) * 0.9;
          art.drawSprite(g, art.prop('yalapappus', 13), p.x, p.y - HEAD + 60, { height: 70 + Math.sin(tt * 5) * 4 });
          g.restore();
        }
        // The captain's note on his fork while he munches.
        if (note && p.mode === 'munch' && !self.done) {
          const k = Math.max(0.25, 1 - munch.n / munch.need);
          art.drawSprite(g, art.prop('yalapappus', 8), p.x + 70 * facing, p.y - 130, { height: 60 * k + 10, ay: 0.5, rot: Math.sin(tt * 8) * 0.2 });
        } else if (note && p.mode === 'kerplop') {
          art.drawSprite(g, art.prop('yalapappus', 8), note.x + Math.sin(note.t * 7) * 30, note.y - 60 + note.t * 120, { height: 60, ay: 0.5, rot: Math.sin(note.t * 5) * 0.4 });
        }
      }
      // Bushes in front (he trundles behind them).
      for (const b of blocks) if (b.kind === 'bush' && cam.sees(b.x - 150, b.x + 150)) drawBush(g, b, tt);
      for (const it of items) if (it.state !== 'lying' && cam.sees(it.x)) drawItem(g, it, tt);
      if (burst && burst.t < 0.6) art.drawSprite(g, art.prop('yalapappus', 9), burst.x, burst.y - 10, { height: 120 + burst.t * 160, ay: 0.6, alpha: 1 - burst.t / 0.6 });
      parts.draw(g);
      // A nudge at the first tree: pound here.
      const tr0 = trees[0];
      if (!self.done && tr0.paper && paper.some((pp) => pp.locked && pp.tree === tr0) && Math.abs(p.x - tr0.x) < 500 && p.mode === 'walk') actionPrompt(g, tr0.x, (profileY(tr0.x) ?? GY) - 300, 'then Down: pound!', { kind: env.inputKind, t });
      cam.end(g);
      // Falling into a hole: a fade.
      if (p.mode === 'fell') {
        g.save();
        g.globalAlpha = clamp(fade < 0.5 ? fade * 2 : (1.1 - fade) * 2, 0, 1) * 0.6;
        g.fillStyle = '#2b1d14';
        g.fillRect(0, 0, W, H);
        g.restore();
      }
      kit.route(g, { you: p.x / WORLD, letter: cloud.x / WORLD, signs: cps.fracs(WORLD) });
      hints.draw(g);
      if (p.mode === 'munch' && !self.done) drawMunchMeter(g);
    },
    marks() {
      const snatched = self.outcome === 'snatched';
      return kit.boardMarks({ snatched, got, total: TOTAL, feat: snatched && bonks === 0 });
    },
    hud() {
      if (p.mode === 'munch' || p.mode === 'kerplop') return `Munch ${munch.n}/${munch.need}`;
      return `Paper ${got}/${TOTAL}`;
    },
  };

  function outro(dt) {
    if (self.outcome === 'snatched') {
      art.setAnim(yc, 'celebrate');
      art.setAnim(tc, 'bloated');
      cloud.vx = kit.ease(cloud.vx, 360, 2, dt);
      cloud.x += cloud.vx * dt;
      cloud.y -= 60 * dt; // drifts off, lighter
      tc.x = cloud.x; tc.y = cloud.y;
    } else {
      yc.z = 0;
      art.setAnim(yc, 'wail');
      art.setAnim(tc, 'celebrate');
      tc.x = cloud.x; tc.y = cloud.y;
    }
  }

  return self;
}

// ---------- the how-to-play page ----------

export const HOWTO = [
  {
    text: 'Hop with Action; down in the air pounds the ground and shakes paper out of the trees.',
    scene: 'scenes/yalapappus', crop: [0, 200, 1200, 675],
    items: [
      { creature: 'yalapappus', anim: 'hop', x: 220, y: 300, h: 190 },
      { sprite: ['props.yalapappus', 5], x: 430, y: 150, h: 40, rot: 0.4 },
      { sprite: ['props.bombanat', 7], x: 470, y: 230, h: 50, rot: -0.3 },
      { path: [[220, 300], [250, 200], [330, 240], [360, 430]], arrow: true },
      { word: 'POUND!', x: 460, y: 430, size: 44 },
    ],
  },
  {
    text: 'Hold Sprint to roll into a ball: bowl through bushes, speed down slopes, and fly off ramps.',
    scene: 'scenes/yalapappus', crop: [400, 300, 1200, 675],
    items: [
      { sprite: ['yalapappus.swaps', 9], x: 200, y: 420, h: 130, ay: 1 },
      { sprite: ['props.trollusk', 5], x: 420, y: 430, h: 120 },
      { path: [[260, 360], [380, 350], [520, 380]], arrow: true },
      { word: 'Wheee!', x: 320, y: 230, size: 40 },
    ],
  },
  {
    text: 'Watch the shadows: boats and fish bonk! At the end, stand under the bottle and munch the note.',
    scene: 'scenes/yalapappus', crop: [600, 150, 1200, 675],
    items: [
      { creature: 'typhoonigator', anim: 'letgo', x: 180, y: 120, h: 150 },
      { sprite: ['props.yalapappus', 10], x: 420, y: 250, h: 70, ay: 0.5, rot: 1.2 },
      { ring: [420, 400, 60] },
      { creature: 'yalapappus', anim: 'idle', x: 420, y: 430, h: 180 },
      { word: 'KER-PLOP!', x: 320, y: 330, size: 40 },
    ],
  },
];

// ---------- the autopilot ----------

// Plays the board competently: trundles right, hops holes, rocks and bushes
// (or rolls through the bushes), pounds beside trees and bushes with paper in
// them and beside toads, rolls through the goo curtains and down the slopes,
// steps out from under falling things, and in the open space stands under
// the bottle's shadow, then mashes Action to munch.
export function autopilot(board) {
  const p = board.player;
  const ap = board._ap || (board._ap = { n: 0, pound: 0, lastX: p.x, stuckT: 0, waitT: 0 });
  ap.n++;
  const inp = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  if (board.done) return inp;
  if (p.mode === 'munch') { inp.action = ap.n % 5 < 2; inp.actionPressed = ap.n % 5 === 0; return inp; }
  if (p.mode === 'kerplop' || p.mode === 'fell') return inp;
  const gy = board.gy;
  const x = p.x;

  // Pound in progress: press down once in the air.
  if (ap.pound > 0) {
    ap.pound--;
    if (!p.onGround && p.vy > -800) { inp.y = 1; ap.pound = 0; }
    else if (!p.onGround) return inp;
  }

  const falling = board.items.filter((it) => it.state === 'fall' && !it.hit);
  const bottle = falling.find((it) => it.kind === 'bottle');
  const octo = falling.find((it) => it.kind === 'octopus');

  // The climax: get under the bottle and stand still; before it falls, wait in the open.
  if (board.climax.on) {
    if (p.mode === 'ball') { inp.sprint = false; return inp; }
    let tx = bottle ? bottle.landX : octo && !p.hat ? octo.landX : Math.max(x, board.OPEN_X + 500);
    const junk = falling.find((it) => it.kind !== 'bottle' && it.kind !== 'octopus' && Math.abs(it.landX - x) < 160 && it.y < p.y - 100);
    if (junk && !bottle) tx = junk.landX + (junk.landX > x ? -280 : 280);
    const dx = tx - x;
    if (Math.abs(dx) > 18) inp.x = Math.sign(dx);
    const blk = board.blocks.find((b) => !b.gone && Math.sign(b.x - x) === inp.x && Math.abs(b.x - x) - b.w / 2 < 150);
    if (blk && p.onGround) { inp.actionPressed = true; inp.action = true; }
    return inp;
  }

  // Step out from under junk that would land on him; catch the octopus.
  if (octo && !p.hat && p.mode === 'walk') {
    const dx = octo.landX - x;
    if (Math.abs(dx) > 14) inp.x = Math.sign(dx);
    return inp;
  }
  for (const it of falling) {
    if (it.kind === 'octopus') continue;
    const dx = it.landX - x;
    if (Math.abs(dx) < 240 && it.y < p.y - 120 && it.y > it.landY - 700) {
      inp.x = dx >= 0 ? -1 : 1;
      if (p.mode === 'ball') inp.sprint = true;
      return inp;
    }
  }

  inp.x = 1;
  // What lies ahead.
  const nextHole = board.segs.find((s) => s.hole && s.x1 > x);
  const holeAhead = nextHole ? nextHole.x0 - x : Infinity;
  const holeW = nextHole ? nextHole.x1 - nextHole.x0 : 0;
  const block = board.blocks.find((b) => !b.gone && b.x > x - 40 && b.x - b.w / 2 - x < 230);
  const curtain = board.curtains.find((c) => c.x + 320 > x - 60 && c.x - 340 - x < 320);
  const toad = board.toads.find((td) => td.stun <= 0 && td.x > x - 60 && td.x - x < 420);
  const tree = board.trees.find((tr) => Math.abs(tr.x - x) < 120 && board.paper.some((pp) => pp.locked && pp.tree === tr));
  const bush = board.blocks.find((b) => b.kind === 'bush' && !b.gone && b.x > x && b.x - x < 420 && board.paper.some((pp) => pp.locked && pp.bush === b));
  const paperBehind = board.paper.find((pp) => !pp.locked && !pp.got && pp.lying && pp.x < x - 20 && pp.x > x - 420 && Math.abs(pp.y - (gy(pp.x) ?? 0)) < 80 && pp.y > p.y - 120
    && !board.segs.some((s) => s.hole && s.x0 < x && s.x1 > pp.x) && !board.blocks.some((b) => !b.gone && b.x > pp.x && b.x < x));
  const slope = board.slopeAt(x);

  // Stuck against something: hop.
  if (Math.abs(x - ap.lastX) < 0.5 && p.onGround && p.mode === 'walk') ap.stuckT++; else ap.stuckT = 0;
  ap.lastX = x;
  if (ap.stuckT > 12) { inp.actionPressed = true; inp.action = true; ap.stuckT = 0; return inp; }
  // Paper just behind (shaken out of a tree): go back for it, briefly.
  ap.backT = paperBehind ? (ap.backT || 0) + 1 : 0;
  if (paperBehind && p.mode === 'walk' && p.onGround && holeAhead > 50 && ap.backT < 60) {
    inp.x = -1;
    return inp;
  }

  if (p.mode === 'ball') {
    // Keep rolling through goo, bushes and down hills; unroll before a hole too wide
    // to fly, a rock, or when the roll has gone on too long.
    const keep = (curtain && curtain.x + 320 - x > -60) || (bush && bush.x - x > -60) || slope > 0.05 || holeAhead < 650 || (holeAhead < 1300 && holeW >= 380) || !p.onGround;
    inp.sprint = keep && p.rollT < 2.5;
    if (holeAhead < 90 && holeAhead > -20 && p.onGround && holeW < 380) inp.actionPressed = true; // a bounce over the small holes; the big one is flown off its ramp
    return inp;
  }

  if (p.mode !== 'walk') return inp;

  // A tree with paper: pound beside it.
  if (tree && p.onGround && ap.pound === 0 && Math.abs(p.vx) < 500) {
    inp.x = 0; inp.actionPressed = true; inp.action = true; ap.pound = 30;
    return inp;
  }
  // A toad ahead: pound to stun it when close enough.
  if (toad && toad.x - x < 330 && toad.x - x > 60 && p.onGround && ap.pound === 0) {
    inp.actionPressed = true; inp.action = true; ap.pound = 30; inp.x = 0.4;
    return inp;
  }
  // Sticky beside a bush: wait for the goo to dry rather than push into it.
  if (p.sticky > 0 && block && block.kind === 'bush' && block.x > x && block.x - block.w / 2 - x < 200) { inp.x = 0; return inp; }
  // A bush with paper, a goo curtain or a downhill: roll.
  if ((bush && bush.x - x < 380 && bush.x - x > 0) || (curtain && curtain.x - 340 - x < 300 && curtain.x + 320 - x > -60) || slope > 0.1) {
    if (p.onGround && p.sticky <= 0 && holeAhead > 150) { inp.sprint = true; return inp; }
  }
  // The big hole: roll from the hill before it.
  if (holeAhead < 1300 && holeW >= 380 && p.onGround && holeAhead > 150 && p.sticky <= 0) { inp.sprint = true; return inp; }
  // Hop holes, rocks, boulders and bushes with nothing in them.
  if (holeAhead < 110 && holeAhead > -10 && p.onGround) { inp.actionPressed = true; inp.action = true; return inp; }
  if (block && block.x > x && block.x - block.w / 2 - x < (block.kind === 'bush' ? 150 : block.kind === 'boulder' ? 170 : 130) && p.onGround) {
    inp.actionPressed = true; inp.action = true;
    return inp;
  }
  inp.action = !p.onGround && p.vy < 0; // hold for the full hop
  return inp;
}

// Board 2: the Letter-Eating Bombanat, "Out of Nowhere" (design/adventure.md,
// section 2). The Bombanat flies through the wood after the Trollusk, who runs
// along the floor below with the letter in his snerk. Each press of Action is
// a wing beat; between beats he glides and sinks. Down tucks the wings for a
// dive; letting go swoops up, trading the speed for height. Sprint is hard
// wingbeats on a stamina ring; gliding slowly onto a branch perches him and
// refills it. Branches and trunks to weave through (a bump tumbles him),
// cobwebs that hold until he flaps free, knot-faced trees that blow gusts,
// cross red birds that peck. In the wood the Trollusk runs under the canopy,
// where no dive can reach; in each clearing the canopy opens and he dashes
// from cover to cover: dive on him in the open to snap up the letter.
//
// The chase ideas (hiding in cover, a telegraphed bolt, a skid to dodge a
// dive) come from src/chase.js and src/chapters/ch02.js.

import * as art from '../art.js';
import * as kit from './kit.js';
import { BOARDS } from './index.js';
import { actionPrompt, marker, letterTag } from '../prompt.js';

const ENTRY = BOARDS.find((b) => b.n === 2);
const { W, H, clamp, ease, hash } = kit;

export const FLOOR = 980; // the wood floor's top (the walking surface)
const CEIL = 180; // the Bombanat flies no higher (the HUD and route strip sit above)
const LEAF_TOP = 680; // the canopy over the floor in the wood sections
export const WORLD_W = 14600;
const INK = '#2b1d14';
const PAPER = '#f8f1e0';

// The run, left to right. Clearings are where the canopy opens.
export const SECTIONS = [
  { name: 'opening', x0: 0, x1: 1000, open: true },
  { name: 'deep', x0: 1000, x1: 3400 },
  { name: 'c1', x0: 3400, x1: 4700, open: true, clearing: 0 },
  { name: 'webs', x0: 4700, x1: 7100 },
  { name: 'c2', x0: 7100, x1: 8400, open: true, clearing: 1 },
  { name: 'knots', x0: 8400, x1: 10800 },
  { name: 'c3', x0: 10800, x1: 12100, open: true, clearing: 2 },
  { name: 'edge', x0: 12100, x1: 13000 },
  { name: 'c4', x0: 13000, x1: 14400, open: true, clearing: 3, last: true },
];
const SIGNPOSTS = [0, 1000, 4700, 8400, 12100];

// Cover in the clearings: what the Trollusk hides in. kind: bush (props.trollusk
// 5), lowbush (adv.b02.props 11), log (adv.b02.props 10, a hollow log).
const COVERS = [
  [0, [[3550, 'bush'], [4000, 'log'], [4450, 'bush']]],
  [1, [[7250, 'bush'], [7700, 'lowbush'], [8150, 'log']]],
  [2, [[10950, 'bush'], [11500, 'log'], [11950, 'bush']]],
  [3, [[13150, 'bush'], [13650, 'lowbush'], [14150, 'log']]],
];
const COVER_SIZE = { bush: { w: 240, h: 200 }, lowbush: { w: 220, h: 150 }, log: { w: 330, h: 140 } };

// Trunks rise from the floor (top y); boughs hang from the canopy (bottom y);
// branches reach in from a trunk off screen, flat on top to perch on
// (dir 1: its base at the left end). face: a knot face that blows gusts.
const TRUNKS = [[1900, 470], [3200, 460], [6350, 470], [8700, 460, true], [9700, 450, true], [10650, 470], [12500, 460, true]];
const BOUGHS = [[2250, 400], [5800, 390], [9350, 400], [12900, 400]];
const BRANCHES = [[200, 380, 420, 1], [1250, 420, 350, 1], [2900, 410, 380, -1],
  [4950, 430, 380, 1], [9050, 410, 380, -1], [10000, 430, 420, 1], [12300, 420, 300, 1]];
const WEBS = [[5450, 540, 115], [6000, 300, 120], [6700, 500, 115], [6950, 590, 100]];
const VINES = [[5300, 300], [5650, 260], [6150, 330], [6850, 280], [12700, 300]];
const BIRDS = [[8950, 410], [10300, 430]];
// Paper scraps: tickets, menus, paper hats, newspaper.
const SCRAPS = [[500, 600], [700, 900], [850, 700],
  [1400, 330], [1550, 330], [1900, 320], [2250, 560], [2600, 330], [2800, 330], [2700, 600], [3200, 330], [3400, 450],
  [3800, 850], [4300, 880], [4150, 300],
  [5100, 340], [5450, 300], [5800, 560], [6000, 560], [6350, 330], [6700, 300], [6950, 400],
  [7500, 870], [8000, 880], [7900, 300],
  [8700, 330], [8950, 320], [9350, 560], [9700, 320], [10200, 340], [10400, 480], [10650, 320],
  [11200, 870], [11700, 880], [11300, 300],
  [12400, 330], [12900, 560],
  [13400, 850], [13900, 870], [14300, 600], [13800, 300]];
// Floor decor in the open: terrain.wood 3 fallen log, 4 stump with a face,
// 5 mound of roots, and the delivered ferns and roots (props.grithix 4, 5).
const DECOR = [[150, 'fern'], [600, 'log'], [900, 'root'], [3700, 'stump'], [4350, 'fern'], [7450, 'log'], [7950, 'fern'], [8100, 'root'],
  [11100, 'stump'], [11750, 'fern'], [12200, 'mound'], [12900, 'fern'], [13350, 'log'], [13900, 'fern'], [14350, 'root']];
const FERNS_FRONT = [350, 2100, 4400, 6000, 7600, 9200, 11300, 12400, 13800];

// The Bombanat's flight numbers.
const P = {
  cruise: 400, accel: 2.4, drag: 0.5,
  sink: 90, sinkRate: 2.5,
  flapUp: 270, flapMax: -520, flapForward: 50,
  diveG: 1700, diveMax: 1150, diveX: 620, diveXRate: 2,
  swoop: 0.72,
  sprintSpeed: 720, sprintDrain: 0.38, sprintBeat: 0.16,
  regenFly: 0.1, regenPerch: 0.55, windedTime: 2,
  stallSpeed: 110, perchSpeed: 330, hardLanding: 650,
  walk: 140,
};
const PEEK = 0.5;

const sectionAt = (x) => SECTIONS.find((s) => x >= s.x0 && x < s.x1) || SECTIONS[SECTIONS.length - 1];
const underCanopy = (x) => !sectionAt(x).open;

export default function create(env) {
  const gentle = !!env.gentle?.[0];
  const skill = env.skill ?? 0.5;
  const cam = kit.makeCamera(WORLD_W, { lead: 340, anchor: 0.36, rate: 3.4 });
  const fx = kit.makeParticles();
  const hints = kit.makeHints([
    { x: 0, text: 'Action: flap. Glide between beats.', show: 4.5 },
    { x: 520, text: 'Hold Down to dive; let go to swoop up.' },
    { x: 1100, text: 'Weave through the branches: a bump tumbles you.' },
    { x: 1900, text: 'Glide slowly onto a branch to rest.' },
    { x: 3250, text: 'A clearing! Dive on the Trollusk when he runs.' },
    { x: 4750, text: 'Cobwebs hold you: flap to break free.' },
    { x: 8450, text: 'Knot-faced trees blow. Cross birds peck.' },
    { x: 12150, text: 'The edge of the wood: the last clearing.' },
  ]);
  const cps = kit.makeCheckpoints(SIGNPOSTS);

  // ----- the world -----
  const solids = [{ x: -400, y: FLOOR, w: 14850, h: 400, kind: 'floor' }];
  for (const s of SECTIONS) if (!s.open) solids.push({ x: s.x0, y: LEAF_TOP, w: s.x1 - s.x0, h: FLOOR - LEAF_TOP, kind: 'leaves' });
  const trees = TRUNKS.map(([x, top, face]) => {
    const s = { x: x - 70, y: top, w: 140, h: FLOOR - top, kind: 'trunk', face: !!face, state: 'idle', t: 0, cool: 0, cx: x };
    solids.push(s);
    return s;
  });
  for (const [x, bottom] of BOUGHS) solids.push({ x: x - 60, y: 0, w: 120, h: bottom, kind: 'bough' });
  for (const [x, y, w, dir] of BRANCHES) solids.push({ x: dir > 0 ? x : x - w, y, w, h: 50, kind: 'branch', dir });
  const clearings = COVERS.map(([i, list]) => {
    const sec = SECTIONS.find((s) => s.clearing === i);
    return { i, x0: sec.x0, x1: sec.x1, last: !!sec.last, passed: false, covers: list.map(([x, kind]) => ({ x, kind, ...COVER_SIZE[kind], shake: 0 })) };
  });
  const covers = clearings.flatMap((c) => c.covers);
  const webs = WEBS.map(([x, y, r]) => ({ x, y, r, torn: false, shake: 0 }));
  const vines = VINES.map(([x, len]) => ({ x, len, swing: 0, swingV: 0, touched: 0 }));
  const birds = BIRDS.map(([x, y]) => ({ px: x, py: y, x, y: y - 20, state: 'perched', t: 0, cool: 0, facing: -1 }));
  const pickups = kit.makePickups(SCRAPS.map(([x, y], i) => ({ x, y, item: 1 + (i % 4) })), { radius: 95 });
  const stamps = [];

  // ----- the creatures -----
  const bc = art.makeCreature('bombanat', 350, 253);
  bc.sizeK = 1.2;
  const hc = art.makeCreature('trollusk', 1080, FLOOR);
  hc.sizeK = 1.1;
  const PERCH_DROP = 127; // the perched pose's feet below its middle, at sizeK 1.2
  const b = {
    x: 350, y: 380 - PERCH_DROP, vx: 0, vy: 0, facing: 1, mode: 'perched', modeT: 0, perch: solids.find((s) => s.kind === 'branch'),
    st: 1, winded: 0, flapT: 0, beatT: 0, diving: false, swoopT: 0, stalled: false, sprinting: false, blown: 0,
    web: null, webHold: 0, hitT: 0, landT: 0,
  };
  const h = {
    x: 1080, y: FLOOR, vx: 0, dir: 1, mode: 'run', modeT: 0, hidden: true, cover: null, clearing: null, coverI: 0,
    hideT: 1.5, dodged: false, dropT: 0, target: 0, dashes: 0,
  };
  const RUN = gentle ? 270 : 295;
  // Fresh in the first clearings, he dashes faster and dodges more; later he tires.
  const dashSpeed = () => (h.clearing && h.clearing.i <= 1 ? (gentle ? 440 : 500) : (gentle ? 400 : 440));
  const pDodge = () => (gentle ? 0.12 : (h.clearing && h.clearing.i <= 1 ? 0.4 : 0.2) + 0.3 * skill);

  let t = 0;
  let snapClearing = -1;
  const self = {
    time: kit.boardTime(env, ENTRY.time),
    done: false,
    outcome: null,
    outroTime: 2.2,
    S: { b, h, bc, hc, cam, solids, trees, clearings, covers, webs, vines, birds, pickups, stamps, fx, hints, cps, gentle, skill, rng: env.rng },
    get snapClearing() { return snapClearing; },
    update(dt, inS) {
      t += dt;
      fx.update(dt);
      if (self.done) { outro(dt); return; }
      self.time = Math.max(0, self.time - dt);
      updateBird(dt, inS || {});
      updateHolder(dt);
      updateWorld(dt);
      pickupsAndSnap(dt);
      cam.follow(b.x, b.vx, dt, t < dt * 1.5);
      hints.update(dt, b.x);
      const last = cps.last;
      if (cps.reach(b.x) !== last) env.sfx('checkpoint');
      animateBird(dt);
      animateHolder(dt);
      if (self.time <= 0 && !self.done) {
        self.done = true;
        self.outcome = 'kept';
        h.mode = 'celebrate'; h.modeT = 0; h.vx = 0;
        env.sfx('gabble');
      }
    },
    draw(g, tt) { drawAll(g, tt); },
    marks() {
      return kit.boardMarks({ snatched: self.outcome === 'snatched', got: pickups.count, total: pickups.total, feat: snapClearing >= 0 && snapClearing <= 1 });
    },
    hud: () => `Scraps ${pickups.count}/${pickups.total}`,
    focus: () => [{ x: b.x - cam.x, y: b.y }],
  };

  // ---------- the Bombanat ----------

  function bodyRect() {
    const tall = b.diving || b.swoopT > 0;
    const w = tall ? 140 : 150, hh = tall ? 230 : 110;
    return { x: b.x - w / 2, y: b.y + (tall ? 20 : 15) - hh / 2, w, h: hh };
  }
  // Where his jaws are: the snout's tip.
  function jaws() {
    if (b.diving || b.swoopT > 0) return { x: b.x + b.facing * 110, y: b.y + 150 };
    return { x: b.x + b.facing * 150, y: b.y + 45 };
  }

  function flap(strength = 1) {
    const k = (b.winded > 0 ? 0.7 : 1) * strength;
    b.vy = Math.max(P.flapMax, b.vy - P.flapUp * k);
    b.vx += b.facing * P.flapForward * k;
    b.flapT = 0.3;
    b.stalled = false;
    env.sfx('flap');
  }

  function takeOff() {
    b.mode = 'fly'; b.modeT = 0; b.perch = null;
    b.vy = -340; b.vx = b.facing * 240;
    b.flapT = 0.3;
    art.kick(bc, -0.4);
    env.sfx('flap');
  }

  function tumble(kx, ky, why = 'Bump!') {
    if (b.hitT > 0) return;
    b.mode = 'tumble'; b.modeT = 0; b.hitT = 1.3;
    b.diving = false; b.swoopT = 0; b.sprinting = false; b.perch = null;
    b.vx = kx; b.vy = ky;
    art.kick(bc, 0.6);
    fx.pop(b.x, b.y - 120, why);
    fx.burst(b.x, b.y, { n: 7, colour: '#c9b8d4', speed: 200, size: 9, life: 0.5 });
    env.sfx('bonk');
    env.vibrate(70);
    cam.shake(8, env.reduceMotion);
  }

  function land(s) {
    b.mode = 'perched'; b.modeT = 0; b.perch = s;
    b.y = s.y - PERCH_DROP;
    b.vx = 0; b.vy = 0; b.diving = false; b.swoopT = 0; b.sprinting = false; b.stalled = false;
    art.kick(bc, 0.5);
    env.sfx('land');
    fx.burst(b.x, s.y, { n: 5, colour: '#9fb05a', speed: 140, size: 8, life: 0.4 });
  }

  function landFloor() {
    b.mode = 'walk'; b.modeT = 0; b.perch = null;
    b.y = FLOOR - PERCH_DROP;
    b.vy = 0; b.vx *= 0.3; b.diving = false; b.swoopT = 0; b.sprinting = false; b.stalled = false;
    art.kick(bc, 0.5);
    env.sfx('land');
    fx.burst(b.x, FLOOR, { n: 6, colour: '#d9c9a4', speed: 160, size: 9, life: 0.45 });
  }

  function updateBird(dt, inp) {
    const ix = inp.x || 0, iy = inp.y || 0;
    b.modeT += dt;
    b.flapT = Math.max(0, b.flapT - dt);
    b.winded = Math.max(0, b.winded - dt);
    b.hitT = Math.max(0, b.hitT - dt);
    b.swoopT = Math.max(0, b.swoopT - dt);
    b.blown = Math.max(0, b.blown - dt);
    if (Math.abs(ix) > 0.3 && b.mode !== 'tumble' && b.mode !== 'web' && !b.diving && b.swoopT <= 0) b.facing = Math.sign(ix);

    if (b.mode === 'perched') {
      b.st = Math.min(1, b.st + P.regenPerch * dt);
      b.vx = 0; b.vy = 0;
      if (inp.actionPressed) takeOff();
      else if (iy > 0.5 && b.modeT > 0.2) { b.mode = 'fly'; b.modeT = 0; b.perch = null; b.vy = 150; b.vx = b.facing * 120; }
      else if (Math.abs(ix) > 0.3 && b.modeT > 0.2) takeOff();
      return;
    }
    if (b.mode === 'walk') {
      b.st = Math.min(1, b.st + P.regenPerch * dt);
      b.vx = ease(b.vx, ix * P.walk, 8, dt);
      b.x += b.vx * dt;
      b.y = FLOOR - PERCH_DROP;
      if (inp.actionPressed) takeOff();
      b.x = clamp(b.x, 120, WORLD_W - 120);
      return;
    }
    if (b.mode === 'web') {
      b.vx = 0; b.vy = 0;
      if (inp.actionPressed) {
        b.webHold -= 1;
        b.web.shake = 1;
        art.kick(bc, -0.35);
        env.sfx('rustle');
        if (b.webHold <= 0) {
          b.web.torn = true;
          b.mode = 'fly'; b.modeT = 0; b.hitT = 0.6;
          b.vy = -380; b.vx = b.facing * 220; b.flapT = 0.3;
          fx.pop(b.x, b.y - 120, 'Free!');
          fx.burst(b.x, b.y, { n: 10, colour: '#f4f2ff', speed: 220, size: 7, life: 0.5 });
          env.sfx('free');
          b.web = null;
        }
      }
      return;
    }
    if (b.mode === 'tumble') {
      b.vx = ease(b.vx, 0, 2.5, dt);
      b.vy = ease(b.vy, 220, 3, dt);
      if (b.modeT > 0.55) { b.mode = 'fly'; b.modeT = 0; b.stalled = true; }
    } else {
      // Flying.
      const wasDiving = b.diving;
      b.diving = iy > 0.5 && b.blown <= 0;
      if (wasDiving && !b.diving && b.vy > 420) {
        // The swoop: the dive's speed becomes height.
        b.vy = -b.vy * P.swoop;
        b.swoopT = 0.4;
        env.sfx('swoosh');
        fx.burst(b.x, b.y + 60, { n: 5, colour: '#efe6f3', speed: 120, size: 7, life: 0.35, gravity: 0 });
      }
      b.sprinting = !!inp.sprint && b.st > 0 && b.winded <= 0 && !b.diving;
      if (inp.actionPressed && !b.diving) flap();
      if (b.diving) {
        b.vy = Math.min(P.diveMax, b.vy + P.diveG * dt);
        b.vx = ease(b.vx, b.facing * P.diveX, P.diveXRate, dt);
        b.stalled = false;
      } else if (b.sprinting) {
        b.beatT -= dt;
        if (b.beatT <= 0) { b.beatT = P.sprintBeat; env.sfx('flap'); }
        b.vy = ease(b.vy, -30, 6, dt);
        b.vx = ease(b.vx, b.facing * P.sprintSpeed, 3, dt);
        b.st -= P.sprintDrain * (gentle ? 0.7 : 1) * dt;
        b.stalled = false;
        if (b.st <= 0) { b.st = 0; b.winded = P.windedTime; b.sprinting = false; env.sfx('pant'); fx.pop(b.x, b.y - 130, 'Puffed!'); }
      } else {
        b.vy = ease(b.vy, b.stalled ? 260 : P.sink, P.sinkRate, dt);
        if (Math.abs(ix) > 0.3) b.vx = ease(b.vx, ix * P.cruise, P.accel, dt);
        else b.vx = ease(b.vx, 0, P.drag, dt);
        if (b.swoopT > 0) b.vx = ease(b.vx, b.facing * P.cruise * 1.2, 1.5, dt);
        const speed = Math.hypot(b.vx, b.vy);
        if (speed < P.stallSpeed && b.flapT <= 0 && b.swoopT <= 0 && b.modeT > 0.5) b.stalled = true;
        if (speed > 220) b.stalled = false;
      }
      if (!b.sprinting) b.st = Math.min(1, b.st + P.regenFly * dt * (b.winded > 0 ? 0.5 : 1));
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < CEIL) { b.y = CEIL; if (b.vy < 0) { b.vy = 80; env.sfx('rustle'); fx.burst(b.x, CEIL - 60, { n: 4, colour: '#9fb05a', speed: 120, size: 8, life: 0.4 }); } }
    if (b.x < 120) { b.x = 120; b.vx = Math.max(0, b.vx); }
    if (b.x > WORLD_W - 120) { b.x = WORLD_W - 120; b.vx = Math.min(0, b.vx); }
    collide();
  }

  // Resolve the body against the solids: branches perch, leaves and bushes
  // bounce, everything else bumps.
  function collide() {
    for (let pass = 0; pass < 2; pass++) {
      const r = bodyRect();
      const hit = solids.find((s) => kit.overlaps(r, s));
      if (!hit) return;
      const px = Math.min(r.x + r.w - hit.x, hit.x + hit.w - r.x);
      const py = Math.min(r.y + r.h - hit.y, hit.y + hit.h - r.y);
      const fromAbove = r.y + r.h / 2 < hit.y + hit.h / 2;
      if (hit.kind === 'floor') { landOrFlop(); return; }
      if (px < py) {
        // A side hit.
        const side = r.x + r.w / 2 < hit.x + hit.w / 2 ? -1 : 1;
        b.x += side * (px + 1);
        if (hit.kind === 'leaves') { b.vx = -b.vx * 0.3; rustle(hit); }
        else if (b.mode !== 'tumble') tumble(side * 220, Math.min(b.vy, 80));
        else b.vx = 0;
      } else if (fromAbove) {
        b.y -= py + 1;
        if ((hit.kind === 'branch' || hit.kind === 'trunk') && b.vy >= 0 && b.mode !== 'tumble') {
          const speed = Math.hypot(b.vx, b.vy);
          if (speed < P.hardLanding) land(hit);
          else { tumble(b.vx * 0.3, -300, 'Oof!'); }
        } else if (hit.kind === 'leaves' || hit.kind === 'branch') {
          // Leaves give: a bounce back up, no harm done.
          b.vy = -Math.max(280, b.vy * 0.45);
          b.vx *= 0.6;
          b.diving = false;
          rustle(hit);
        } else if (b.mode !== 'tumble') tumble(b.vx * 0.3, -250);
        else b.vy = Math.min(b.vy, 0);
      } else {
        // Hit from below: a bough or the underside of a branch.
        b.y += py + 1;
        if (b.mode !== 'tumble') tumble(b.vx * 0.3, 220);
        else b.vy = Math.max(b.vy, 100);
      }
    }
  }

  function rustle(s) {
    if (b.hitT > 0) return;
    b.hitT = 0.4;
    env.sfx('rustle');
    fx.burst(b.x, b.y + 60, { n: 6, colour: '#8aa352', speed: 180, size: 9, life: 0.5 });
    if (s.kind === 'leaves') fx.pop(b.x, b.y - 120, 'Rustle!');
  }

  function landOrFlop() {
    const fast = b.vy > P.hardLanding;
    const tumbling = b.mode === 'tumble';
    landFloor();
    if (fast || tumbling) { art.kick(bc, 0.9); fx.pop(b.x, b.y - 130, 'Flop!'); env.vibrate(60); cam.shake(6, env.reduceMotion); }
  }

  // ---------- the Trollusk ----------

  function startPeek() { h.mode = 'peek'; h.modeT = 0; h.vx = 0; env.sfx('eye'); }
  // Where his next dash goes (the next cover, or the canopy past the clearing).
  function nextTarget() {
    const c = h.clearing;
    const next = h.coverI + h.dir;
    if (next >= 0 && next < c.covers.length) return c.covers[next].x;
    return c.last ? c.covers[h.coverI - h.dir].x : c.x1 + 80;
  }
  function lowOverPath() {
    if (b.mode !== 'fly' || b.y < 360) return false;
    const a = Math.min(h.x, nextTarget()) - 120, c = Math.max(h.x, nextTarget()) + 120;
    return b.x > a && b.x < c;
  }
  function startDash() {
    h.mode = 'dash'; h.modeT = 0; h.dodged = false; h.dashes++;
    const c = h.clearing;
    const next = h.coverI + h.dir;
    if (next >= 0 && next < c.covers.length) h.target = c.covers[next].x;
    else if (c.last) { h.dir = -h.dir; h.target = c.covers[h.coverI + h.dir].x; }
    else h.target = c.x1 + 80;
    h.cover = null;
    env.sfx('gabble');
  }
  function arriveCover(i) {
    const c = h.clearing;
    h.coverI = i; h.cover = c.covers[i]; h.x = h.cover.x;
    h.mode = 'hide'; h.modeT = 0; h.vx = 0;
    h.hideT = 1.3 + env.rng() * 1.3;
    h.cover.shake = 0.8;
    env.sfx('rustle');
  }

  function updateHolder(dt) {
    h.modeT += dt;
    if (h.mode === 'run') {
      h.vx = h.dir * RUN;
      h.x += h.vx * dt;
      const c = clearings.find((k) => !k.passed && h.x >= k.covers[0].x);
      if (c) { h.clearing = c; h.coverI = 0; h.cover = c.covers[0]; h.x = c.covers[0].x; h.mode = 'wait'; h.modeT = 0; h.vx = 0; c.covers[0].shake = 0.8; }
    } else if (h.mode === 'wait') {
      // He sits tight until the hawk has been over the clearing a moment, not diving.
      const inView = b.x > h.clearing.x0 - 150 && Math.abs(b.x - h.x) < 1100 && !b.diving;
      h.seen = inView ? (h.seen || 0) + dt : Math.max(0, (h.seen || 0) - dt);
      if (h.modeT > 0.8 && h.seen > 1.1) { if (lowOverPath()) { h.mode = 'feint'; h.modeT = 0; env.sfx('eye'); } else startPeek(); }
    } else if (h.mode === 'hide') {
      // He will not run under a hawk hanging low over his path: he peeks and
      // ducks back (a feint) until it goes higher or further off.
      if (h.modeT > h.hideT) { if (lowOverPath()) { h.mode = 'feint'; h.modeT = 0; env.sfx('eye'); } else startPeek(); }
    } else if (h.mode === 'feint') {
      if (h.modeT > PEEK) { h.mode = 'hide'; h.modeT = 0; h.hideT = 0.7 + env.rng() * 0.5; }
    } else if (h.mode === 'peek') {
      if (h.modeT > PEEK) startDash();
    } else if (h.mode === 'skid') {
      h.vx = 0;
      if (h.modeT > 0.35) { h.mode = 'dash'; h.modeT = 0.5; }
    } else if (h.mode === 'dash') {
      // A dive coming at him: now and then he skids flat to the ground, and
      // jaws that do not reach the floor snap over his hat.
      if (!h.dodged && b.diving && Math.abs(b.x - h.x) < 280 && b.y > 430 && b.y < 760) {
        h.dodged = true;
        if (env.rng() < pDodge()) { h.mode = 'skid'; h.modeT = 0; h.vx = 0; env.sfx('dodge'); art.kick(hc, 0.4); return; }
      }
      h.vx = h.dir * dashSpeed();
      h.x += h.vx * dt;
      h.dropT -= dt;
      if (h.dropT <= 0 && stamps.length < 6) {
        h.dropT = 0.55;
        stamps.push({ x: h.x - h.dir * 50, y: FLOOR, item: 1 + Math.floor(env.rng() * 4), t: 0, got: false });
      }
      if ((h.x - h.target) * h.dir >= 0) {
        h.x = h.target;
        const c = h.clearing;
        const next = h.coverI + h.dir;
        if (next >= 0 && next < c.covers.length) arriveCover(next);
        else { c.passed = true; h.clearing = null; h.cover = null; h.mode = 'run'; h.modeT = 0; }
      }
    } else if (h.mode === 'jolt' || h.mode === 'wail' || h.mode === 'celebrate') {
      h.vx = 0;
    }
    h.underCanopy = underCanopy(h.x);
    h.hidden = h.underCanopy || h.mode === 'wait' || h.mode === 'hide' || h.mode === 'peek' || h.mode === 'feint';
    if (h.mode === 'skid' && h.modeT > 0.35) { /* back on the run */ }
  }

  // ---------- webs, vines, gusts, birds, stamps ----------

  function updateWorld(dt) {
    const r = bodyRect();
    const flying = b.mode === 'fly' || b.mode === 'tumble';
    // Cobwebs hold him until he flaps free.
    for (const w of webs) {
      w.shake = Math.max(0, w.shake - dt * 2);
      if (w.torn || b.mode === 'web' || !flying || b.hitT > 0.6) continue;
      if (kit.near(w.x, w.y, b.x, b.y + 10, w.r + 20)) {
        b.mode = 'web'; b.modeT = 0; b.web = w; b.webHold = gentle ? 3 : 4;
        b.diving = false; b.sprinting = false; b.swoopT = 0;
        b.x = w.x; b.y = w.y - 10;
        w.shake = 1;
        fx.pop(b.x, b.y - 130, 'Stuck!');
        env.sfx('rustle');
        env.vibrate(40);
      }
    }
    // Vines sway, and drag at him as he passes through.
    for (const v of vines) {
      v.swingV += (-v.swing * 12 - v.swingV * 1.6) * dt;
      v.swing += v.swingV * dt;
      v.touched = Math.max(0, v.touched - dt);
      if (!flying) continue;
      if (Math.abs(b.x - v.x) < 40 && b.y - 60 < v.len) {
        b.vx *= Math.exp(-2.5 * dt);
        if (v.touched <= 0) { v.touched = 0.8; v.swingV += b.facing * 2.2; env.sfx('rustle'); }
      }
    }
    // Knot-faced trees: a puff first, then a gust up and back.
    for (const tr of trees) {
      if (!tr.face) continue;
      tr.t += dt;
      tr.cool = Math.max(0, tr.cool - dt);
      if (tr.state === 'idle') {
        if (tr.cool <= 0 && b.x > tr.cx - 560 && b.x < tr.cx + 120 && b.mode === 'fly') { tr.state = 'puff'; tr.t = 0; env.sfx('pant'); }
      } else if (tr.state === 'puff') {
        if (tr.t > 0.75) { tr.state = 'blow'; tr.t = 0; env.sfx('gust'); }
      } else if (tr.state === 'blow') {
        const zone = { x: tr.cx - 120, y: CEIL - 40, w: 760, h: tr.y + 200 - CEIL };
        if (flying && kit.overlaps(r, zone)) {
          const k = gentle ? 0.6 : 1;
          b.vx -= 900 * k * dt; b.vy -= 1100 * k * dt;
          b.vy = Math.max(b.vy, -560);
          b.diving = false; b.blown = 0.25;
          b.sprinting = false;
        }
        if (tr.t > 1.1) { tr.state = 'idle'; tr.t = 0; tr.cool = 3.4; }
      }
    }
    // Cross red birds: a shake and a squawk, then they fly at him and peck.
    for (const bd of birds) {
      bd.t += dt;
      bd.cool = Math.max(0, bd.cool - dt);
      const d = Math.hypot(b.x - bd.x, b.y - bd.y);
      if (bd.state === 'perched') {
        if (bd.cool <= 0 && d < (gentle ? 430 : 520) && b.mode === 'fly') { bd.state = 'cross'; bd.t = 0; env.sfx('eye'); }
      } else if (bd.state === 'cross') {
        bd.facing = Math.sign(b.x - bd.x) || -1;
        if (bd.t > 0.55) { bd.state = 'fly'; bd.t = 0; }
      } else if (bd.state === 'fly') {
        const sp = gentle ? 430 : 560;
        const dx = b.x - bd.x, dy = b.y - bd.y, dd = Math.hypot(dx, dy) || 1;
        bd.x += (dx / dd) * sp * dt; bd.y += (dy / dd) * sp * dt;
        bd.facing = Math.sign(dx) || bd.facing;
        if (dd < 110 && flying) {
          tumble(-b.facing * 260, -120, 'Peck!');
          env.vibrate(80);
          bd.state = 'back'; bd.t = 0; bd.cool = 3.5;
        } else if (bd.t > 1.6 || !flying) { bd.state = 'back'; bd.t = 0; bd.cool = 3; }
      } else if (bd.state === 'back') {
        const dx = bd.px - bd.x, dy = bd.py - 20 - bd.y, dd = Math.hypot(dx, dy) || 1;
        const step = 520 * dt;
        bd.facing = Math.sign(dx) || bd.facing;
        if (dd <= step) { bd.x = bd.px; bd.y = bd.py - 20; bd.state = 'perched'; bd.t = 0; bd.facing = -1; }
        else { bd.x += (dx / dd) * step; bd.y += (dy / dd) * step; }
      }
    }
    // Cover: a dive into a bush bounces, and the Trollusk in it sits tight.
    for (const k of covers) {
      k.shake = Math.max(0, k.shake - dt * 1.5);
      if (!flying || b.vy < 300) continue;
      const kr = { x: k.x - k.w / 2 + 20, y: FLOOR - k.h + 20, w: k.w - 40, h: k.h };
      if (kit.overlaps(r, kr)) {
        b.vy = -420; b.vx *= 0.5; b.diving = false;
        k.shake = 1;
        fx.pop(b.x, b.y - 130, 'Bump!');
        fx.burst(b.x, FLOOR - k.h, { n: 8, colour: '#8aa352', speed: 200, size: 10, life: 0.5 });
        env.sfx('rustle');
        if (h.cover === k && h.mode === 'hide') h.hideT += 0.5;
      }
    }
    // Dropped stamps: snapped up, they are worth a little time.
    for (let i = stamps.length - 1; i >= 0; i--) {
      const st = stamps[i];
      st.t += dt;
      if (st.got) { if (st.t > 0.5) stamps.splice(i, 1); continue; }
      if (kit.near(st.x, st.y - 20, b.x, b.y + 60, 100)) {
        st.got = true; st.t = 0;
        self.time += 2;
        fx.pop(st.x, st.y - 90, '+2 s', { colour: '#8e4f8a' });
        env.sfx('pickup');
      } else if (st.t > 9) stamps.splice(i, 1);
    }
  }

  function pickupsAndSnap(dt) {
    const n = pickups.update(dt, b.x, b.y + 20);
    if (n) { env.sfx('pickup'); fx.pop(b.x, b.y - 130, pickups.count % 5 === 0 ? 'Yum!' : '+1', { colour: '#8e4f8a', size: 40 }); art.kick(bc, -0.25); }
    // The snap: his jaws reach the Trollusk while he is out in the open.
    const j = jaws();
    const top = h.mode === 'skid' ? 95 : 215;
    if (!h.hidden && b.mode !== 'perched' && Math.abs(j.x - h.x) < 95 && j.y > h.y - top && j.y < h.y + 20) snatch();
  }

  function snatch() {
    self.done = true;
    self.outcome = 'snatched';
    snapClearing = h.clearing ? h.clearing.i : -1;
    b.mode = 'carry'; b.modeT = 0; b.diving = false; b.sprinting = false; b.swoopT = 0;
    b.vx = 320 * b.facing; b.vy = -520;
    h.mode = 'jolt'; h.modeT = 0; h.vx = 0;
    art.kick(hc, 0.5);
    art.kick(bc, -0.5);
    fx.pop(h.x, h.y - 300, 'SNAP!', { size: 72, colour: '#b3402e' });
    env.sfx('snap');
    env.vibrate(120);
    cam.shake(10, env.reduceMotion);
  }

  function outro(dt) {
    b.modeT += dt;
    h.modeT += dt;
    if (self.outcome === 'snatched') {
      // Off and up with the letter, a loop of the tail; the Trollusk wails.
      b.vy = ease(b.vy, -260, 2, dt);
      b.vx = ease(b.vx, 480, 2, dt);
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.y = Math.max(CEIL - 160, b.y);
      b.facing = 1;
      if (h.modeT > 0.6 && h.mode === 'jolt') { h.mode = 'wail'; env.sfx('gabble'); }
    } else {
      // Time: the Trollusk gabbles away with a smirk on his snerk.
      h.vx = h.dir * RUN * 0.8;
      h.x += h.vx * dt;
      if (b.mode === 'fly') { b.vy = ease(b.vy, P.sink, 1.5, dt); b.vx = ease(b.vx, 0, 0.8, dt); b.x += b.vx * dt; b.y = Math.min(FLOOR - PERCH_DROP, b.y + b.vy * dt); }
    }
    cam.follow(b.x, b.vx, dt);
    animateBird(dt);
    animateHolder(dt);
  }

  // ---------- animation ----------

  function animateBird(dt) {
    bc.x = b.x; bc.y = b.y;
    let name = 'glide';
    let rot = 0;
    if (b.mode === 'perched') name = b.modeT < 0.25 ? 'land' : 'roost';
    else if (b.mode === 'walk') name = Math.abs(b.vx) > 20 ? 'walk' : 'perched';
    else if (b.mode === 'web') name = 'stall';
    else if (b.mode === 'tumble') name = 'tumble';
    else if (b.mode === 'carry') name = b.modeT < 0.4 ? 'snap' : 'carry';
    else if (b.blown > 0) name = 'blownBack';
    else if (b.diving) name = 'dive';
    else if (b.swoopT > 0) { name = 'swoop'; rot = -0.35; }
    else if (b.stalled) name = 'stall';
    else if (b.sprinting || b.flapT > 0) name = 'flap';
    if (name === 'glide' || name === 'flap') rot = clamp(b.vy / 1600, -0.22, 0.26);
    art.setAnim(bc, name);
    bc.M.anims.flap.fps = b.sprinting ? 16 : 12;
    bc.rot = ease(bc.rot, rot * b.facing, 10, dt);
    art.animate(bc, dt, b.mode === 'perched' ? 0 : b.vx, b.vy);
    bc.facing = b.facing;
  }

  function animateHolder(dt) {
    hc.x = h.x; hc.y = h.y;
    const m = h.mode;
    if (m === 'jolt') art.setAnim(hc, 'jolt');
    else if (m === 'wail') art.setAnim(hc, 'wail');
    else if (m === 'celebrate') art.setAnim(hc, 'celebrate');
    else if (m === 'skid') art.setAnim(hc, 'duck');
    else if (m === 'peek' || m === 'feint') art.setAnim(hc, 'eye');
    else if (m === 'hide' || m === 'wait') art.setAnim(hc, 'duck');
    else if (m === 'dash') art.setAnim(hc, 'run');
    else art.setAnim(hc, 'run');
    art.animate(hc, dt, h.vx || h.dir * 30, 0);
    hc.facing = h.dir;
  }

  // ---------- drawing ----------

  function drawAll(g, tt) {
    kit.drawBackdrop(g, cam, { panels: ['adv/b02/backdrop-1', 'adv/b02/backdrop-2', 'adv/b02/backdrop-3'], standin: 'scenes/bombanat' });
    kit.haze(g, 'rgba(243,233,210,0.14)');
    cam.begin(g);
    drawMidLayer(g);
    for (const s of solids) if (s.kind === 'floor' && cam.sees(s.x, s.x + s.w)) {
      kit.drawGround(g, cam, s, { sheet: 'terrain.wood', item: 1, height: 260, lift: 14, fill: '#6e5236', standin: { top: '#8d9a4e', body: '#7b5b3b', ink: INK } });
    }
    drawFloorBits(g);
    drawCliff(g);
    for (const [x, kind] of DECOR) if (cam.sees(x)) drawDecor(g, x, kind, tt);
    for (const x of SIGNPOSTS) if (x > 0 && cam.sees(x)) drawSignpost(g, x);
    for (const s of solids) if (s.kind === 'trunk' && cam.sees(s.x, s.x + s.w)) drawTrunk(g, s, tt);
    for (const s of solids) if (s.kind === 'bough' && cam.sees(s.x, s.x + s.w)) drawBough(g, s);
    for (const s of solids) if (s.kind === 'branch' && cam.sees(s.x, s.x + s.w)) drawBranch(g, s);
    // The Trollusk, behind his cover and behind the canopy.
    if (cam.sees(h.x)) drawHolder(g, tt);
    for (const k of covers) if (cam.sees(k.x)) drawCover(g, k, tt);
    for (const st of stamps) if (cam.sees(st.x)) {
      const y = st.y - 6 + (st.got ? -st.t * 240 : -Math.abs(Math.sin(tt * 3 + st.x)) * 5);
      art.drawSprite(g, art.prop('trollusk', st.item), st.x, y, { height: 46, rot: Math.sin(tt * 2 + st.x) * 0.25, alpha: st.got ? 1 - st.t * 2 : 1 });
    }
    for (const s of solids) if (s.kind === 'leaves' && cam.sees(s.x, s.x + s.w)) drawLeaves(g, s, tt);
    for (const v of vines) if (cam.sees(v.x)) drawVine(g, v, tt);
    for (const w of webs) if (cam.sees(w.x)) drawWeb(g, w, tt);
    pickups.draw(g, cam, tt, (gg, p, x, y, alpha, ttt) => {
      gg.save(); gg.globalAlpha = alpha;
      const rot = Math.sin(ttt * 2.2 + p.seed) * 0.25;
      kit.sprite(gg, 'adv.b02.props', p.item, x, y, { height: 62, rot, ay: 0.5 }, () => {
        if (!art.drawSprite(gg, art.prop('bombanat', 5 + p.item), x, y, { height: 62, rot, ay: 0.5 })) inkScrap(gg, x, y, rot, p.item);
      });
      gg.restore();
    });
    for (const tr of trees) if (tr.face && tr.state === 'blow' && cam.sees(tr.cx, tr.cx + 760)) drawGust(g, tr, tt);
    for (const bd of birds) if (cam.sees(bd.x)) drawBird(g, bd, tt);
    drawBombanat(g, tt);
    fx.draw(g);
    for (const x of FERNS_FRONT) {
      const fxp = cam.x + (x - cam.x) * 1.25;
      if (fxp > cam.x - 300 && fxp < cam.x + W + 300) {
        g.save(); g.globalAlpha = 0.9;
        if (!art.drawSprite(g, art.prop('grithix', 4), fxp, H + 10, { height: 260 })) inkFern(g, fxp, H + 10, 260);
        g.restore();
      }
    }
    cam.end(g);
    kit.route(g, { you: b.x / WORLD_W, letter: h.x / WORLD_W, signs: cps.fracs(WORLD_W) });
    hints.draw(g);
  }

  // A mid layer behind the play layer: delivered bushes and ferns along the
  // floor, scrolling a little slower, so the backdrop joins the ground.
  function drawMidLayer(g) {
    const par = 0.8;
    const i0 = Math.floor((cam.x * par - 300) / 260);
    for (let i = i0; i <= i0 + 9; i++) {
      const wx = i * 260 + hash(i * 1.7) * 120;
      const sx = cam.x + (wx - cam.x * par);
      if (sx < cam.x - 300 || sx > cam.x + W + 300) continue;
      const k = hash(i * 3.1);
      const y = FLOOR + 2;
      g.save();
      g.globalAlpha = 0.85;
      if (k < 0.45) { if (!art.drawSprite(g, art.prop('trollusk', 5), sx, y, { height: 120 + hash(i) * 60, flip: k < 0.2 })) inkBush(g, sx, y, 180, 140); }
      else if (k < 0.75) { if (!art.drawSprite(g, art.prop('grithix', 4), sx, y, { height: 110 + hash(i * 5) * 50, flip: k > 0.6 })) inkFern(g, sx, y, 130); }
      else if (!art.drawSprite(g, art.prop('grithix', 5), sx, y, { height: 70 + hash(i * 9) * 30 })) inkRoot(g, sx, y);
      g.restore();
    }
  }

  // Small things along the floor in ink: tufts, pebbles, toadstools.
  function drawFloorBits(g) {
    const x0 = Math.floor((cam.x - 100) / 90) * 90, x1 = cam.x + W + 100;
    g.save();
    g.lineWidth = 2.5; g.strokeStyle = INK; g.lineCap = 'round';
    for (let x = x0; x < x1; x += 90) {
      const k = hash(x * 0.37);
      const xx = x + hash(x) * 60;
      if (k < 0.4) {
        // A tuft of grass.
        g.strokeStyle = k < 0.2 ? '#5e7a3a' : '#8aa352';
        g.lineWidth = 3;
        g.beginPath();
        for (let i = -2; i <= 2; i++) { g.moveTo(xx + i * 5, FLOOR + 2); g.lineTo(xx + i * 9, FLOOR - 16 - Math.abs(i) * -4 - hash(x + i) * 10); }
        g.stroke();
      } else if (k < 0.6) {
        g.fillStyle = '#b8ad96'; g.strokeStyle = INK; g.lineWidth = 2;
        g.beginPath(); g.ellipse(xx, FLOOR - 4, 12 + hash(x * 2) * 8, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      } else if (k < 0.68) {
        // A toadstool.
        g.fillStyle = '#e8c9a0'; g.strokeStyle = INK; g.lineWidth = 2.5;
        g.fillRect(xx - 4, FLOOR - 22, 8, 22); g.strokeRect(xx - 4, FLOOR - 22, 8, 22);
        g.fillStyle = '#d9a066';
        g.beginPath(); g.ellipse(xx, FLOOR - 22, 16, 8, 0, Math.PI, Math.PI * 2); g.closePath(); g.fill(); g.stroke();
      }
    }
    g.restore();
  }

  function drawCliff(g) {
    const x = 14450;
    if (!cam.sees(x - 200, x + 800)) return;
    g.save();
    g.fillStyle = '#7b5b3b';
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x - 60, FLOOR - 4); g.lineTo(x + 30, FLOOR - 4);
    g.lineTo(x + 50, FLOOR + 40); g.lineTo(x + 20, FLOOR + 90); g.lineTo(x + 70, FLOOR + 160); g.lineTo(x + 30, FLOOR + 230); g.lineTo(x + 60, H + 60);
    g.lineTo(x - 60, H + 60); g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 2;
    g.beginPath();
    for (let y = FLOOR + 20; y < H + 40; y += 34) { g.moveTo(x - 50, y); g.lineTo(x + 10 + hash(y) * 30, y + 14); }
    g.stroke();
    g.fillStyle = '#8d9a4e'; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(x - 10, FLOOR + 2, 50, 10, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }

  function drawDecor(g, x, kind, tt) {
    if (kind === 'fern') { if (!art.drawSprite(g, art.prop('grithix', 4), x, FLOOR + 6, { height: 170 })) inkFern(g, x, FLOOR + 6, 170); return; }
    if (kind === 'root') { if (!art.drawSprite(g, art.prop('grithix', 5), x, FLOOR + 6, { height: 120 })) inkRoot(g, x, FLOOR + 6); return; }
    if (kind === 'log') { kit.sprite(g, 'terrain.wood', 3, x, FLOOR + 4, { height: 120 }, () => inkLog(g, x, FLOOR + 4, 300, 110, false)); return; }
    if (kind === 'stump') { kit.sprite(g, 'terrain.wood', 4, x, FLOOR + 4, { height: 150 }, () => inkStump(g, x, FLOOR + 4, tt)); return; }
    if (kind === 'mound') { kit.sprite(g, 'terrain.wood', 5, x, FLOOR + 4, { height: 130 }, () => inkMound(g, x, FLOOR + 4)); }
  }

  function drawSignpost(g, x) {
    g.save();
    g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#b08a5a';
    g.fillRect(x - 10, FLOOR - 210, 20, 210); g.strokeRect(x - 10, FLOOR - 210, 20, 210);
    g.fillStyle = '#d9b980';
    g.beginPath(); g.moveTo(x - 70, FLOOR - 220); g.lineTo(x + 60, FLOOR - 220); g.lineTo(x + 86, FLOOR - 190); g.lineTo(x + 60, FLOOR - 160); g.lineTo(x - 70, FLOOR - 160); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }

  function drawTrunk(g, s, tt) {
    const x = s.cx;
    kit.sprite(g, 'terrain.wood', 6, x, FLOOR + 4, { height: FLOOR + 4 - s.y, ay: 1 }, () => inkTrunk(g, s));
    if (s.face) {
      const fy = s.y + 150;
      kit.sprite(g, 'adv.b02.props', 12, x, fy, { height: 120, ay: 0.5 }, () => inkKnotFace(g, x, fy, s, tt));
    }
  }

  function inkTrunk(g, s) {
    const x = s.cx, top = s.y;
    g.save();
    g.fillStyle = '#8a6a44'; g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
    const outline = () => {
      g.beginPath();
      g.moveTo(x - 120, FLOOR + 4); g.quadraticCurveTo(x - 80, FLOOR - 30, x - 66, FLOOR - 160);
      for (let y = FLOOR - 160; y > top + 60; y -= 60) g.lineTo(x - 62 + Math.sin(y * 0.05) * 6, y);
      g.quadraticCurveTo(x - 58, top + 10, x - 40, top + 4);
      g.lineTo(x + 40, top + 4); g.quadraticCurveTo(x + 58, top + 10, x + 62, top + 60);
      for (let y = top + 60; y < FLOOR - 160; y += 60) g.lineTo(x + 62 + Math.cos(y * 0.05) * 6, y);
      g.quadraticCurveTo(x + 80, FLOOR - 30, x + 120, FLOOR + 4);
      g.closePath();
    };
    outline(); g.fill();
    // Bark: long wavy ink lines, a darker side, knots.
    g.save(); outline(); g.clip();
    g.fillStyle = 'rgba(43,29,20,0.18)'; g.fillRect(x + 20, top, 60, FLOOR - top);
    g.strokeStyle = 'rgba(43,29,20,0.55)'; g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const bx = x - 52 + i * 13 + hash(i + x) * 6;
      g.moveTo(bx, top + 20 + hash(bx) * 60);
      for (let y = top + 60; y < FLOOR; y += 40) g.lineTo(bx + Math.sin(y * 0.03 + i) * 5 + (y > FLOOR - 160 ? (bx - x) * (y - FLOOR + 160) / 300 : 0), y);
    }
    g.stroke();
    g.lineWidth = 1.5;
    g.beginPath();
    for (let y = top + 40; y < FLOOR; y += 26) { const w = 10 + hash(y + x) * 20; const bx = x - 50 + hash(y * 3 + x) * 90; g.moveTo(bx, y); g.lineTo(bx + w, y + 4); }
    g.stroke();
    for (let i = 0; i < 2; i++) {
      const ky = top + 120 + i * 220 + hash(x + i) * 100;
      if (ky > FLOOR - 120) continue;
      g.fillStyle = '#5c3f28'; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(x + (i ? 30 : -28), ky, 12, 18, 0.2, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
    outline(); g.stroke();
    // Moss at the foot, the cut top with its rings.
    g.fillStyle = '#8d9a4e'; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(x - 50, FLOOR - 30, 36, 22, -0.3, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#c9a97a'; g.lineWidth = 3.5;
    g.beginPath(); g.ellipse(x, top + 4, 50, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(x, top + 4, 30, 8, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(x, top + 4, 12, 3.5, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  function inkKnotFace(g, x, y, s, tt) {
    g.save();
    g.strokeStyle = INK; g.lineWidth = 3.5; g.fillStyle = '#5c3f28';
    // Two knot eyes.
    for (const ex of [-24, 24]) {
      g.beginPath(); g.ellipse(x + ex, y - 30, 16, 20, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#f2e7cf'; g.beginPath(); g.arc(x + ex + 3, y - 34, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5c3f28';
    }
    const puff = s.state === 'puff' ? Math.min(1, s.t / 0.75) : s.state === 'blow' ? 1 - s.t / 1.1 : 0;
    // Cheeks swell as it draws breath.
    if (puff > 0) {
      g.fillStyle = '#9a7555';
      for (const cx of [-40, 40]) { g.beginPath(); g.ellipse(x + cx, y + 18, 18 + puff * 22, 16 + puff * 18, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    }
    // The mouth: an O when blowing, a line otherwise.
    g.fillStyle = '#3a2416';
    if (s.state === 'blow') { g.beginPath(); g.ellipse(x, y + 24, 20, 26, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    else { g.beginPath(); g.ellipse(x, y + 24, 22 + puff * 4, 10 + puff * 14, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    if (s.state === 'puff' && Math.floor(tt * 6) % 2) { g.font = '800 44px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.fillStyle = '#b3402e'; g.lineWidth = 6; g.strokeStyle = PAPER; g.strokeText('!', x, y - 80); g.fillText('!', x, y - 80); }
    g.restore();
  }

  function drawBough(g, s) {
    const x = s.x + s.w / 2, bottom = s.y + s.h;
    g.save();
    g.fillStyle = '#8a6a44'; g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
    const outline = () => {
      g.beginPath();
      g.moveTo(x - 80, -20);
      for (let y = 0; y < bottom - 100; y += 50) g.lineTo(x - 48 - (bottom - 100 - y) * 0.08 + Math.sin(y * 0.04) * 5, y);
      g.quadraticCurveTo(x - 36, bottom - 30, x, bottom - 14);
      g.quadraticCurveTo(x + 36, bottom - 30, x + 48, bottom - 100);
      for (let y = bottom - 100; y > 0; y -= 50) g.lineTo(x + 48 + (bottom - 100 - y) * 0.08 + Math.cos(y * 0.04) * 5, y);
      g.lineTo(x + 80, -20);
      g.closePath();
    };
    outline(); g.fill();
    g.save(); outline(); g.clip();
    g.fillStyle = 'rgba(43,29,20,0.18)'; g.fillRect(x + 14, -20, 60, bottom);
    g.strokeStyle = 'rgba(43,29,20,0.55)'; g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 7; i++) { const bx = x - 40 + i * 13; g.moveTo(bx - 10, -20); for (let y = 0; y < bottom; y += 40) g.lineTo(bx + Math.sin(y * 0.03 + i) * 5, y); }
    g.stroke();
    g.restore();
    outline(); g.stroke();
    // Leaf clusters at the end: the delivered bush, hanging.
    g.restore();
    for (const [dx, dy, h, flip] of [[-40, 40, 130, false], [50, 30, 110, true], [0, 70, 140, false]]) {
      if (!art.drawSprite(g, art.prop('trollusk', 5), x + dx, bottom + dy, { height: h, flip })) leafBlob(g, x + dx, bottom + dy - h / 2, h * 0.45, dx, '#6b8a44', '#9fb05a');
    }
  }

  function drawBranch(g, s) {
    const base = s.dir > 0 ? s.x : s.x + s.w;
    kit.sprite(g, 'terrain.wood', 2, base, s.y, { height: 150, ax: 0, ay: 0.3, flip: s.dir < 0 }, () => inkBranch(g, s));
  }

  function inkBranch(g, s) {
    const dir = s.dir;
    const base = dir > 0 ? s.x : s.x + s.w;
    const tip = dir > 0 ? s.x + s.w : s.x;
    const len = s.w;
    g.save();
    g.fillStyle = '#8a6a44'; g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
    // A knobbly tapering branch from off screen, flat enough on top to stand on.
    const outline = () => {
      g.beginPath();
      g.moveTo(base - dir * 80, s.y - 40);
      g.quadraticCurveTo(base - dir * 20, s.y - 6, base, s.y);
      for (let i = 1; i <= 6; i++) { const x = base + dir * (len * i / 6); g.lineTo(x, s.y + 2 + Math.sin(i * 2.1 + s.x) * 3); }
      g.quadraticCurveTo(tip + dir * 26, s.y + 10, tip + dir * 14, s.y + 30);
      g.quadraticCurveTo(tip - dir * 10, s.y + 46, tip - dir * 60, s.y + 44);
      for (let i = 5; i >= 1; i--) { const x = base + dir * (len * i / 6); g.lineTo(x, s.y + 50 + (6 - i) * 2 + Math.cos(i * 1.7 + s.x) * 4); }
      g.lineTo(base, s.y + 66);
      g.quadraticCurveTo(base - dir * 30, s.y + 90, base - dir * 80, s.y + 130);
      g.closePath();
    };
    outline(); g.fill();
    g.save(); outline(); g.clip();
    // The underside darker; bark lines along the length; a knot or two.
    g.fillStyle = 'rgba(43,29,20,0.2)'; g.fillRect(Math.min(base, tip) - 100, s.y + 30, len + 200, 80);
    g.strokeStyle = 'rgba(43,29,20,0.55)'; g.lineWidth = 2;
    g.beginPath();
    for (let j = 0; j < 4; j++) {
      const y0 = s.y + 12 + j * 11;
      g.moveTo(base - dir * 80, y0 - 10);
      for (let x = Math.min(base, tip) - 60; x <= Math.max(base, tip) + 20; x += 36) g.lineTo(x, y0 + Math.sin(x * 0.05 + j) * 3);
    }
    g.stroke();
    g.fillStyle = '#5c3f28'; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(base + dir * len * 0.45, s.y + 34, 14, 9, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
    outline(); g.stroke();
    // Moss along the top, the standing surface.
    g.fillStyle = '#8d9a4e'; g.strokeStyle = '#5e7a3a'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(base, s.y + 4);
    for (let x = Math.min(base, tip); x <= Math.max(base, tip); x += 18) g.lineTo(x, s.y - 1 - hash(x) * 9);
    g.lineTo(tip, s.y + 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // Leaf clumps: the delivered bush at the tip, partway along, and a big
    // one hiding the base where the branch leaves its trunk.
    if (!art.drawSprite(g, art.prop('trollusk', 5), tip - dir * 10, s.y + 36, { height: 120, flip: dir < 0 })) leafBlob(g, tip - dir * 10, s.y - 10, 46, 0.2, '#6b8a44', '#9fb05a');
    if (!art.drawSprite(g, art.prop('trollusk', 5), base + dir * len * 0.4, s.y + 2, { height: 78, flip: dir > 0 })) leafBlob(g, base + dir * len * 0.4, s.y - 20, 34, 0.7, '#6b8a44', '#8aa352');
    if (!art.drawSprite(g, art.prop('trollusk', 5), base - dir * 30, s.y + 110, { height: 190, flip: dir > 0 })) leafBlob(g, base - dir * 30, s.y + 20, 70, 0.9, '#6b8a44', '#8aa352');
  }

  // A clump of many small leaves, each in ink, in the book's greens. Used
  // for the canopy (drawn once into a cached strip) and as a fallback clump.
  function leafBlob(g, x, y, r, seed, dark, light) {
    g.save();
    g.strokeStyle = INK; g.lineWidth = 1.6;
    const n = Math.max(10, Math.round(r * 0.55));
    for (let i = 0; i < n; i++) {
      const a = hash(seed * 13 + i) * Math.PI * 2;
      const d = Math.sqrt(hash(seed * 7 + i * 3)) * r;
      const lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d * 0.8;
      const rot = hash(seed + i * 11) * Math.PI;
      const k = hash(seed * 3 + i);
      g.fillStyle = k < 0.3 ? dark : k < 0.75 ? light : '#5e7a3a';
      g.beginPath(); g.ellipse(lx, ly, 15 + k * 6, 8 + k * 3, rot, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(lx - Math.cos(rot) * 12, ly - Math.sin(rot) * 12); g.lineTo(lx + Math.cos(rot) * 12, ly + Math.sin(rot) * 12); g.stroke();
    }
    g.restore();
  }

  // The canopy over the floor in a wood section: a thick band of leaves the
  // Trollusk runs behind, with the delivered bushes as undergrowth along the
  // floor. The leaves are drawn once into a strip and blitted after that.
  const canopyCache = new Map();
  function canopyStrip(s) {
    if (canopyCache.has(s)) return canopyCache.get(s);
    let cv = null;
    try {
      const w = s.w + 240, hgt = 200;
      if (typeof document !== 'undefined') { cv = document.createElement('canvas'); cv.width = w; cv.height = hgt; }
      else if (typeof OffscreenCanvas === 'function') cv = new OffscreenCanvas(w, hgt);
      if (cv) {
        const cg = cv.getContext('2d');
        cg.translate(120 - s.x, -(LEAF_TOP - 60));
        paintCanopy(cg, s, s.x - 120, s.x + s.w + 120);
      }
    } catch { cv = null; }
    canopyCache.set(s, cv);
    return cv;
  }
  function paintCanopy(g, s, x0, x1) {
    const i0 = Math.floor((x0 - s.x) / 130);
    for (let i = i0; s.x + i * 130 < x1 + 130; i++) {
      const x = s.x + i * 130 + 65;
      leafBlob(g, x, LEAF_TOP + 40 + hash(i * 5 + s.x) * 40, 96, i * 0.37 + s.x * 0.001, '#5e7a3a', '#6f8a3e');
    }
    const j0 = Math.floor((x0 - s.x) / 100);
    for (let j = j0; s.x + j * 100 < x1 + 100; j++) {
      const x = s.x + j * 100 + 50;
      leafBlob(g, x, LEAF_TOP + hash(j * 3 + s.x) * 30, 70, j * 0.61 + 3, '#6b8a44', '#9fb05a');
    }
    // The ends drape down to the undergrowth where the clearing opens.
    for (const ex of [s.x + 30, s.x + s.w - 30]) {
      if (ex < x0 - 100 || ex > x1 + 100) continue;
      leafBlob(g, ex, LEAF_TOP + 95, 70, ex * 0.01, '#5e7a3a', '#8aa352');
      leafBlob(g, ex + (ex < s.x + 100 ? 20 : -20), LEAF_TOP + 135, 52, ex * 0.02, '#6b8a44', '#9fb05a');
    }
    // The branches that hold it up, peeping through.
    g.save();
    g.strokeStyle = '#5a4030'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath();
    for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { g.moveTo(x, LEAF_TOP - 24 + hash(x) * 20); g.lineTo(x + 70, LEAF_TOP - 24 + hash(x + 70) * 20); }
    g.stroke();
    g.restore();
  }
  function drawLeaves(g, s, tt) {
    const x0 = Math.max(s.x - 120, cam.x - 100), x1 = Math.min(s.x + s.w + 120, cam.x + W + 100);
    if (x1 <= x0) return;
    const sway = env.reduceMotion ? 0 : Math.sin(tt * 0.9) * 3;
    // Undergrowth: the delivered bushes along the floor, varied, he runs behind them.
    const k0 = Math.floor((x0 - s.x) / 210);
    for (let k = k0; s.x + k * 210 < x1; k++) {
      const x = s.x + k * 210 + 100 + hash(k * 2.3 + s.x) * 40;
      if (x < s.x + 60 || x > s.x + s.w - 60) continue;
      const hgt = 200 + hash(k * 7 + s.x) * 70;
      if (!art.drawSprite(g, art.prop('trollusk', 5), x, FLOOR + 8, { height: hgt, flip: hash(k) > 0.5 })) inkBush(g, x, FLOOR + 8, hgt * 1.2, hgt);
    }
    const strip = canopyStrip(s);
    if (strip) {
      const sx = x0 - (s.x - 120);
      g.drawImage(strip, sx, 0, x1 - x0, strip.height, x0 + sway, LEAF_TOP - 60, x1 - x0, strip.height);
    } else paintCanopy(g, s, x0, x1);
  }

  function drawVine(g, v, tt) {
    const a = v.swing + (env.reduceMotion ? 0 : Math.sin(tt * 1.3 + v.x) * 0.04);
    kit.sprite(g, 'adv.b02.props', 8, v.x, 0, { height: v.len, ay: 0, rot: a }, () => {
      g.save();
      g.translate(v.x, 0); g.rotate(a);
      g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -20);
      for (let y = 0; y <= v.len; y += 30) g.lineTo(Math.sin(y * 0.05) * 14, y);
      g.stroke();
      g.strokeStyle = '#6b8a44'; g.lineWidth = 5;
      g.stroke();
      g.fillStyle = '#8aa352';
      for (let y = 40; y < v.len; y += 55) {
        const side = (Math.floor(y / 55) % 2) ? 1 : -1;
        g.beginPath(); g.ellipse(Math.sin(y * 0.05) * 14 + side * 16, y, 20, 10, side * 0.5, 0, Math.PI * 2); g.fill();
        g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
      }
      g.restore();
    });
  }

  function drawWeb(g, w, tt) {
    const shake = w.shake && !env.reduceMotion ? Math.sin(tt * 40) * 4 * w.shake : 0;
    kit.sprite(g, 'adv.b02.props', 7, w.x + shake, w.y, { height: w.r * 2, ay: 0.5, alpha: w.torn ? 0.5 : 1 }, () => {
      g.save();
      g.translate(w.x + shake, w.y);
      g.strokeStyle = 'rgba(250,250,255,0.9)';
      g.lineWidth = 2.5;
      g.shadowColor = 'rgba(43,29,20,0.5)'; g.shadowBlur = 2;
      const spokes = 8;
      g.beginPath();
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2 + 0.2;
        if (w.torn && i % 3 === 0) continue;
        g.moveTo(0, 0); g.lineTo(Math.cos(a) * w.r, Math.sin(a) * w.r);
      }
      if (!w.torn) {
        for (let k = 1; k <= 5; k++) {
          const rr = (k / 5) * w.r;
          for (let i = 0; i <= spokes; i++) {
            const a = (i / spokes) * Math.PI * 2 + 0.2;
            const a0 = ((i - 1) / spokes) * Math.PI * 2 + 0.2;
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            if (i === 0) g.moveTo(px, py);
            else g.quadraticCurveTo(Math.cos((a + a0) / 2) * rr * 0.9, Math.sin((a + a0) / 2) * rr * 0.9, px, py);
          }
        }
      } else {
        // Torn: a few strands hang.
        for (let i = 0; i < 4; i++) { g.moveTo(Math.cos(i * 1.5) * w.r * 0.6, Math.sin(i * 1.5) * w.r * 0.6); g.lineTo(Math.cos(i * 1.5) * w.r * 0.6 + 10, Math.sin(i * 1.5) * w.r * 0.6 + 50); }
      }
      g.stroke();
      // A glint, so it reads from far off.
      if (!w.torn) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(-w.r * 0.3, -w.r * 0.3, 5 + Math.sin(tt * 5 + w.x) * 2, 0, Math.PI * 2); g.fill(); }
      g.restore();
    });
  }

  function drawGust(g, tr, tt) {
    const k = Math.min(1, tr.t / 0.3) * Math.min(1, (1.1 - tr.t) / 0.3);
    kit.sprite(g, 'adv.b02.props', 9, tr.cx + 300, tr.y + 60, { height: 300, ay: 0.5, alpha: k }, () => {
      g.save();
      g.globalAlpha = k * 0.85;
      g.strokeStyle = PAPER; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const ph = (tt * 3 + i * 0.7) % 1;
        const x0 = tr.cx + 60 + ph * 420, y0 = tr.y + 120 - i * 70 - ph * 300;
        g.moveTo(x0, y0);
        g.bezierCurveTo(x0 + 90, y0 - 40, x0 + 140, y0 - 110, x0 + 110, y0 - 150);
        g.bezierCurveTo(x0 + 90, y0 - 180, x0 + 60, y0 - 150, x0 + 80, y0 - 130);
      }
      g.stroke();
      g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
      g.restore();
    });
  }

  function drawBird(g, bd, tt) {
    const flying = bd.state === 'fly' || bd.state === 'back';
    const shake = bd.state === 'cross' && !env.reduceMotion ? Math.sin(tt * 50) * 5 : 0;
    const bob = flying && !env.reduceMotion ? Math.sin(tt * 18) * 6 : 0;
    const x = bd.x + shake, y = bd.y + bob;
    kit.sprite(g, 'adv.b02.props', flying ? 5 : 6, x, y, { height: flying ? 90 : 100, ay: flying ? 0.5 : 1, flip: bd.facing > 0 }, () => inkBird(g, x, y, flying, bd.facing, tt));
    if (bd.state === 'cross') {
      g.save();
      g.font = '800 46px Fraunces, Georgia, serif'; g.textAlign = 'center';
      g.lineWidth = 7; g.strokeStyle = PAPER; g.fillStyle = '#b3402e';
      g.strokeText('!', x, y - 110); g.fillText('!', x, y - 110);
      g.restore();
    }
  }

  function inkBird(g, x, y, flying, facing, tt) {
    g.save();
    g.translate(x, flying ? y : y - 45);
    g.scale(-facing, 1);
    g.strokeStyle = INK; g.lineWidth = 3.5;
    g.fillStyle = '#c8402e';
    // Body, a plump egg; a tail of three feathers.
    g.beginPath(); g.moveTo(-30, 0); g.lineTo(-58, -18); g.lineTo(-50, 4); g.lineTo(-60, 18); g.lineTo(-30, 10); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, 0, 40, 32, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    // Wing.
    const wa = flying ? Math.sin(tt * 18) * 0.9 : 0.25;
    g.save(); g.translate(-6, -8); g.rotate(-wa);
    g.fillStyle = '#a8321f';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-24, -40, -50, -34); g.quadraticCurveTo(-30, -6, 0, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // Head with a cross brow and an open beak.
    g.fillStyle = '#c8402e';
    g.beginPath(); g.arc(30, -26, 22, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(36, -30, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(38, -29, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(26, -44); g.lineTo(46, -36); g.stroke();
    g.fillStyle = '#f2c53d';
    g.beginPath(); g.moveTo(48, -30); g.lineTo(76, -24); g.lineTo(50, -18); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(48, -18); g.lineTo(72, -10); g.lineTo(50, -8); g.closePath(); g.fill(); g.stroke();
    if (!flying) { g.strokeStyle = '#f2c53d'; g.lineWidth = 4; g.beginPath(); g.moveTo(-8, 30); g.lineTo(-10, 45); g.moveTo(10, 30); g.lineTo(12, 45); g.stroke(); }
    g.restore();
  }

  function drawCover(g, k, tt) {
    const shake = k.shake && !env.reduceMotion ? Math.sin(tt * 30) * 6 * k.shake : 0;
    const x = k.x + shake, y = FLOOR + 6;
    if (k.kind === 'bush') { if (!art.drawSprite(g, art.prop('trollusk', 5), x, y, { height: k.h })) inkBush(g, x, y, k.w, k.h); return; }
    if (k.kind === 'lowbush') { kit.sprite(g, 'adv.b02.props', 11, x, y, { height: k.h }, () => { if (!art.drawSprite(g, art.prop('trollusk', 5), x, y, { height: k.h })) inkBush(g, x, y, k.w, k.h); }); return; }
    kit.sprite(g, 'adv.b02.props', 10, x, y, { height: k.h }, () => inkLog(g, x, y, k.w, k.h, true));
  }

  function drawHolder(g, tt) {
    if (h.hidden && h.cover && (h.mode === 'hide' || h.mode === 'wait' || h.mode === 'feint')) {
      // Tucked into cover, drawn behind it; his hat shows over the top.
      const z = hc.y;
      hc.y = h.y + (h.cover.kind === 'log' ? 24 : 12);
      art.drawCreature(g, hc, tt, { reduceMotion: env.reduceMotion, shadow: false });
      hc.y = z;
      return;
    }
    art.drawCreature(g, hc, tt, { reduceMotion: env.reduceMotion });
    if (self.done) return;
    if (!h.hidden) {
      letterTag(g, h.x + h.dir * 70, h.y - 150, { t: tt });
      if (h.mode === 'dash' || h.mode === 'skid') marker(g, h.x, h.y - 270, { t: tt, label: 'Dive!' });
    } else if (h.mode === 'peek' || h.mode === 'feint') marker(g, h.x, h.y - 300, { t: tt, label: 'Ready…', colour: '#f2c53d' });
  }

  function drawBombanat(g, tt) {
    // His shadow on whatever is below, then the stamina ring, then him.
    if (b.mode !== 'carry') {
      const below = kit.groundAt(solids.filter((s) => s.kind !== 'bough'), b.x, b.y) ?? FLOOR;
      const dist = clamp((below - b.y) / 700, 0, 1);
      g.save(); g.globalAlpha = 0.2 * (1 - dist * 0.7); g.fillStyle = INK;
      g.beginPath(); g.ellipse(b.x, below, 110 - dist * 60, 18 - dist * 8, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    if (b.st < 0.999 || b.sprinting || b.winded > 0) staminaRing(g, b.x, b.y + 128);
    art.drawCreature(g, bc, tt, { reduceMotion: env.reduceMotion, shadow: false });
    if (b.mode === 'web') actionPrompt(g, b.x, b.y - 140, `Flap free! ${'•'.repeat(Math.max(1, b.webHold))}`, { kind: env.inputKind, t: tt, pulse: 1 });
    else if (b.mode === 'perched' && b.modeT > 1.2 && !self.done) actionPrompt(g, b.x, b.y - 150, 'Fly', { kind: env.inputKind, t: tt });
  }

  function staminaRing(g, x, y) {
    g.save();
    g.translate(x, y);
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(40,25,20,0.35)';
    g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.stroke();
    if (b.winded > 0) { g.setLineDash([8, 8]); g.strokeStyle = '#8f8a86'; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.stroke(); }
    else { g.strokeStyle = b.st < 0.3 ? '#c8443a' : '#c9b8d4'; g.beginPath(); g.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.st); g.stroke(); }
    g.restore();
  }

  return self;
}

// ---------- ink stand-ins for the undelivered props ----------

function inkScrap(g, x, y, rot, item) {
  g.save();
  g.translate(x, y); g.rotate(rot);
  g.strokeStyle = INK; g.lineWidth = 3;
  if (item === 1) { g.fillStyle = '#e8a09a'; g.fillRect(-34, -20, 68, 40); g.strokeRect(-34, -20, 68, 40); g.strokeRect(-26, -12, 52, 24); }
  else if (item === 2) { g.fillStyle = PAPER; g.beginPath(); g.moveTo(-36, 18); g.lineTo(0, -28); g.lineTo(36, 18); g.closePath(); g.fill(); g.stroke(); g.fillRect(-40, 14, 80, 10); g.strokeRect(-40, 14, 80, 10); }
  else if (item === 3) { g.fillStyle = '#ece6d6'; g.beginPath(); g.moveTo(-32, -26); g.lineTo(30, -30); g.lineTo(34, 26); g.lineTo(-28, 30); g.closePath(); g.fill(); g.stroke(); g.lineWidth = 2; for (let i = -14; i <= 14; i += 7) { g.beginPath(); g.moveTo(-22, i); g.lineTo(22, i); g.stroke(); } }
  else { g.fillStyle = PAPER; g.fillRect(-22, -30, 44, 60); g.strokeRect(-22, -30, 44, 60); g.fillStyle = '#b3402e'; g.fillRect(-14, -22, 28, 8); g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -6); g.lineTo(14, -6); g.moveTo(-14, 4); g.lineTo(14, 4); g.moveTo(-14, 14); g.lineTo(14, 14); g.stroke(); }
  g.restore();
}

function inkBush(g, x, y, w, h) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 3.5; g.fillStyle = '#6b8a44';
  g.beginPath(); g.ellipse(x, y - h * 0.45, w * 0.5, h * 0.45, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#9fb05a';
  g.beginPath(); g.ellipse(x - w * 0.15, y - h * 0.6, w * 0.22, h * 0.18, -0.3, 0, Math.PI * 2); g.fill();
  g.restore();
}

function inkLog(g, x, y, w, h, hollow) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
  g.fillStyle = '#8a6a44';
  const outline = () => {
    g.beginPath();
    g.moveTo(x - w / 2 + h * 0.4, y - h);
    for (let i = 1; i < 6; i++) g.lineTo(x - w / 2 + h * 0.4 + (w - h * 0.5) * i / 6, y - h + Math.sin(i * 1.9 + x) * 4);
    g.lineTo(x + w / 2 - h * 0.1, y - h + 6);
    g.quadraticCurveTo(x + w / 2 + 6, y - h / 2, x + w / 2 - h * 0.1, y - 4);
    for (let i = 5; i >= 1; i--) g.lineTo(x - w / 2 + h * 0.4 + (w - h * 0.5) * i / 6, y - 2 + Math.cos(i * 1.3 + x) * 3);
    g.lineTo(x - w / 2 + h * 0.4, y - 4);
    g.closePath();
  };
  outline(); g.fill();
  g.save(); outline(); g.clip();
  g.fillStyle = 'rgba(43,29,20,0.2)'; g.fillRect(x - w / 2, y - h * 0.4, w, h * 0.4);
  g.strokeStyle = 'rgba(43,29,20,0.55)'; g.lineWidth = 2;
  g.beginPath();
  for (let j = 0; j < 5; j++) { const yy = y - h + 14 + j * (h - 28) / 4; g.moveTo(x - w / 2, yy); for (let xx = x - w / 2; xx <= x + w / 2; xx += 30) g.lineTo(xx, yy + Math.sin(xx * 0.06 + j) * 3); }
  g.stroke();
  g.restore();
  outline(); g.stroke();
  // The open end: a hollow, or cut rings.
  g.fillStyle = hollow ? '#2b1d14' : '#c9a97a'; g.lineWidth = 3.5;
  g.beginPath(); g.ellipse(x - w / 2 + h * 0.4, y - h / 2, h * 0.32, h * 0.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  if (hollow) {
    g.strokeStyle = '#8a6a44'; g.lineWidth = 7;
    g.beginPath(); g.ellipse(x - w / 2 + h * 0.4, y - h / 2, h * 0.32, h * 0.5, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x - w / 2 + h * 0.4, y - h / 2, h * 0.42, h * 0.58, 0, 0, Math.PI * 2); g.stroke();
  } else {
    g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(x - w / 2 + h * 0.4, y - h / 2, h * 0.2, h * 0.3, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(x - w / 2 + h * 0.4, y - h / 2, h * 0.08, h * 0.12, 0, 0, Math.PI * 2); g.stroke();
  }
  // Moss on top.
  g.fillStyle = '#8d9a4e'; g.strokeStyle = '#5e7a3a'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(x + w * 0.12, y - h + 4, w * 0.28, 11, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}

function inkStump(g, x, y, tt) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#7b5b3b';
  g.beginPath(); g.moveTo(x - 80, y); g.lineTo(x - 60, y - 120); g.lineTo(x + 60, y - 120); g.lineTo(x + 80, y); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c9a97a';
  g.beginPath(); g.ellipse(x, y - 120, 60, 18, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(x, y - 120, 36, 10, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(x, y - 120, 16, 5, 0, 0, Math.PI * 2); g.stroke();
  // Bark lines, and a sleepy face in a knot.
  g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 5; i++) { const bx = x - 50 + i * 25; g.moveTo(bx, y - 110); g.lineTo(bx + (bx - x) * 0.25, y - 6); }
  g.stroke();
  g.strokeStyle = INK; g.lineWidth = 3; g.fillStyle = '#5c3f28';
  for (const ex of [-22, 22]) { g.beginPath(); g.ellipse(x + ex, y - 72, 11, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x + ex - 9, y - 74); g.quadraticCurveTo(x + ex, y - 66, x + ex + 9, y - 74); g.stroke(); }
  g.beginPath(); g.ellipse(x, y - 52, 7, 5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(x, y - 34, 14, 7 + Math.sin(tt) * 2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}

function inkMound(g, x, y) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#7b5b3b';
  g.beginPath(); g.moveTo(x - 170, y); g.quadraticCurveTo(x - 60, y - 140, x + 40, y - 120); g.quadraticCurveTo(x + 130, y - 100, x + 170, y); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#5a4030'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - 120, y - 30); g.quadraticCurveTo(x - 40, y - 90, x + 60, y - 60); g.moveTo(x - 60, y - 10); g.quadraticCurveTo(x + 20, y - 50, x + 120, y - 20); g.stroke();
  g.fillStyle = '#8d9a4e'; g.beginPath(); g.ellipse(x - 20, y - 110, 70, 18, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

function inkRoot(g, x, y) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 4; g.fillStyle = '#7b5b3b';
  g.beginPath(); g.moveTo(x - 90, y); g.quadraticCurveTo(x - 40, y - 60, x + 10, y - 50); g.quadraticCurveTo(x + 60, y - 40, x + 90, y); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function inkFern(g, x, y, h) {
  g.save();
  g.strokeStyle = INK; g.lineWidth = 3; g.fillStyle = '#6b8a44';
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.45;
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-h * 0.18, -h * 0.5, 0, -h); g.quadraticCurveTo(h * 0.18, -h * 0.5, 0, 0); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h); g.stroke();
    g.restore();
  }
  g.restore();
}

// The how-to-play page (src/chapters/index.js, "THE HOW-TO-PLAY PAGE").
export const HOWTO = [
  { text: 'Press Action to flap; glide between beats.', scene: 'scenes/bombanat', crop: [0, 0, 1280, 960],
    items: [{ creature: 'bombanat', anim: 'flap', x: 300, y: 240, h: 150 }, { path: [[360, 300], [430, 230], [500, 290], [570, 210], [620, 260]], arrow: true }] },
  { text: 'Hold Down to dive; let go to swoop up.', scene: 'scenes/bombanat', crop: [400, 100, 1280, 960],
    items: [{ creature: 'bombanat', anim: 'dive', x: 250, y: 160, h: 170 }, { path: [[300, 220], [360, 330], [460, 400], [560, 330], [600, 240]], arrow: true }, { sprite: ['props.bombanat', 6], x: 450, y: 440, h: 50 }] },
  { text: 'In a clearing, dive on the Trollusk when he runs.', scene: 'scenes/bombanat', crop: [600, 200, 1280, 960],
    items: [{ sprite: ['props.trollusk', 5], x: 150, y: 440, h: 120 }, { creature: 'trollusk', anim: 'run', x: 330, y: 440, h: 130 }, { creature: 'bombanat', anim: 'dive', x: 240, y: 170, h: 150 }, { path: [[280, 220], [340, 330]], arrow: true }, { word: 'SNAP!', x: 480, y: 200, size: 60 }] },
];

// ---------- the autopilot ----------

// Where the Trollusk's next dash ends (mirrors nextTarget in create).
function nextTargetOf(h) {
  const c = h.clearing;
  if (!c) return h.x;
  const next = h.coverI + h.dir;
  if (next >= 0 && next < c.covers.length) return c.covers[next].x;
  return c.last ? c.covers[h.coverI - h.dir].x : c.x1 + 80;
}
// Flies right through the wood, keeping to the free gap ahead and nosing
// toward scraps; in a clearing it hangs back over the Trollusk's cover and
// dives when he bolts, aiming where he will be.

export function autopilot(board) {
  const { b, h, solids, webs, clearings, pickups, birds, trees, rng } = board.S;
  const ap = board.S.ap || (board.S.ap = { frame: 0, lastFlap: -9, jitter: 0, jitterFor: -1 });
  ap.frame++;
  const out = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  const press = () => { if (ap.frame - ap.lastFlap >= 2) { out.actionPressed = true; out.action = true; ap.lastFlap = ap.frame; } };
  // Hold a world x with a little momentum.
  const holdX = (wantX) => {
    const dx = wantX - b.x;
    if (Math.abs(dx) < 50) return 0;
    const v = clamp(dx / 140, -1, 1);
    return Math.abs(v) < 0.4 ? Math.sign(v) * 0.4 : v;
  };
  if (board.done) return out;
  if (b.mode === 'web') { press(); return out; }
  if (b.mode === 'tumble') { out.x = 1; return out; }
  if (b.mode === 'walk') { out.x = 1; press(); return out; }

  // Hunting: the Trollusk is in a clearing and we are near it.
  const cl = h.clearing;
  const hunting = cl && b.x > cl.x0 + 20 && (h.mode === 'wait' || h.mode === 'hide' || h.mode === 'feint' || h.mode === 'peek' || h.mode === 'dash' || h.mode === 'skid');
  if (b.mode === 'perched') {
    if (b.st < 0.9 && !hunting && b.modeT < 2.5) return out; // a rest
    out.x = 1; press();
    return out;
  }

  if (hunting) {
    const dir = h.dir;
    const hoverY = 300;
    if (h.mode === 'dash' || h.mode === 'skid' || h.mode === 'peek') {
      // Reading his peek as a human would: a little early or late each time.
      if (h.mode === 'peek' && ap.jitterFor !== h.dashes) { ap.jitterFor = h.dashes; ap.jitter = (rng() - 0.5) * 0.5; }
      // Where will he be when the jaws reach the floor? Simulate the dive.
      let sx = b.x, sy = b.y, svx = b.vx, svy = b.diving ? b.vy : 0, tt = 0;
      while (sy + 150 < FLOOR - 130 && tt < 1.5) {
        const dt = 0.05;
        svy = Math.min(1150, svy + 1700 * dt);
        svx += (dir * 620 - svx) * (1 - Math.exp(-2 * dt));
        sx += svx * dt; sy += svy * dt; tt += dt;
      }
      const peekLeft = h.mode === 'peek' ? Math.max(0, PEEK + ap.jitter - h.modeT) : 0;
      const runT = Math.max(0, tt - peekLeft); // as if he keeps running: a skid fools us
      let hx = h.x + dir * (cl.i <= 1 ? 500 : 440) * runT;
      // He stops at his next cover (or the canopy): no use diving past it.
      if ((hx - h.target) * dir > 0) hx = h.target;
      const landX = sx + dir * 110;
      const miss = (hx - landX) * dir; // positive: he will be ahead of the jaws
      out.x = dir;
      if (b.diving) {
        out.y = 1;
        if (b.y > FLOOR - 300) out.y = 0; // too low: swoop out
        return out;
      }
      const stopsShort = Math.abs(hx - h.target) < 30 && h.mode !== 'peek';
      // A human's reaction: on the peek (read with the jitter), or once he is seen running.
      const seenRunning = h.mode === 'peek' || (h.mode === 'dash' && h.modeT >= Math.max(0.05, ap.jitter));
      const inWindow = Math.abs(miss) < 60 && seenRunning && !stopsShort;
      if (inWindow && b.y < 700) { out.y = 1; return out; }
      // Not yet: close on where he will be (he runs under us), at hover height.
      out.x = miss > 0 ? dir : -dir * 0.7;
      if (b.y > hoverY + 20 && b.vy > -150) press();
      return out;
    }
    // He is hiding: hover ahead of his cover so his dash carries him under the
    // dive (a dive drops about 330 px forward from a hover), high enough that
    // he does not sit tight.
    if (b.diving) { out.y = 0; out.x = dir; return out; }
    const L = Math.abs(nextTargetOf(h) - h.x);
    out.x = holdX(h.x + dir * clamp(Math.min(L, 520) - 330 - 50, 40, 200));
    if (b.y > hoverY + 20 && b.vy > -150) press();
    if (b.y < hoverY - 120 && b.vy < 240) out.y = 1;
    return out;
  }

  // Travelling: sweep columns ahead and keep the y-ranges a flier can reach
  // (climbing or sinking about a pixel per pixel of travel); make for the
  // farthest reachable gap, and back out of a pocket that closes ahead.
  const M = 58;
  const freeIn = (x0, x1) => {
    const blocked = [];
    for (const s of solids) {
      if (s.kind === 'floor' || s.x > x1 || s.x + s.w < x0) continue;
      blocked.push([s.y - M, s.y + s.h + M]);
    }
    for (const w of webs) if (!w.torn && w.x + w.r > x0 && w.x - w.r < x1) blocked.push([w.y - w.r - M - 20, w.y + w.r + M + 20]);
    blocked.sort((p, q) => p[0] - q[0]);
    const top = CEIL + 70, bottom = FLOOR - 160;
    const free = [];
    let y0 = top;
    for (const [a, c] of blocked) { if (a > y0) free.push([y0, Math.min(a, bottom)]); y0 = Math.max(y0, c); }
    if (y0 < bottom) free.push([y0, bottom]);
    return free.filter(([a, c]) => c - a >= 36);
  };
  const STEP = 60, SLOPE = 70, COLS = 10;
  let layer = freeIn(b.x - 30, b.x + 30).map((iv) => ({ iv, parent: null }));
  layer.sort((p, q) => Math.abs((p.iv[0] + p.iv[1]) / 2 - b.y) - Math.abs((q.iv[0] + q.iv[1]) / 2 - b.y));
  layer = layer.slice(0, 1);
  const layers = [layer];
  for (let k = 1; k <= COLS && layers[k - 1].length; k++) {
    const x = b.x + STEP * k;
    const prev = layers[k - 1];
    const next = [];
    for (const iv of freeIn(x - 30, x + 30)) {
      const parent = prev.find((p) => iv[1] > p.iv[0] - SLOPE && iv[0] < p.iv[1] + SLOPE);
      if (parent) next.push({ iv, parent });
    }
    layers.push(next);
  }
  const depth = layers.length - 1 - (layers[layers.length - 1].length ? 0 : 1);
  const farLayer = layers[Math.max(0, depth)];
  let pick = null;
  if (farLayer.length) {
    // The gap nearest our height, or one with a scrap in it.
    farLayer.sort((p, q) => Math.abs((p.iv[0] + p.iv[1]) / 2 - b.y) - Math.abs((q.iv[0] + q.iv[1]) / 2 - b.y));
    pick = farLayer[0];
    for (const p of pickups.items) {
      if (p.got || p.x < b.x + 60 || p.x > b.x + STEP * depth + 60) continue;
      const hit = farLayer.find((n) => p.y > n.iv[0] + 10 && p.y < n.iv[1] - 10);
      if (hit) { pick = hit; break; }
    }
  }
  let target = 400;
  const pocket = depth < COLS;
  if (pick) {
    let want = (pick.iv[0] + pick.iv[1]) / 2;
    for (const p of pickups.items) if (!p.got && p.x > b.x - 40 && p.x < b.x + 560 && p.y > pick.iv[0] + 10 && p.y < pick.iv[1] - 10) { want = p.y - 10; break; }
    // Walk back to the second column: the height to make for now.
    let n = pick;
    while (n.parent && n.parent.parent) n = n.parent;
    target = clamp(want, n.iv[0], n.iv[1]);
  } else if (layers[0].length) target = (layers[0][0].iv[0] + layers[0][0].iv[1]) / 2;
  const slow = Math.abs(target - b.y) > 70;
  // Ahead of the Trollusk in the wood: hang about the next clearing's start instead of leaving him behind.
  const nextClearing = clearings.find((c) => !c.passed);
  const wait = nextClearing && b.x > nextClearing.x0 + 100 && h.x < nextClearing.x0;
  // A knot-faced tree ahead: wait out its gust, short of its reach.
  const knot = trees.find((tr) => tr.face && tr.cx > b.x - 300 && tr.cx < b.x + 760 && (tr.state !== 'idle' || tr.cool > 0.2) && b.x < tr.cx - 150);
  if (wait) { out.x = holdX(nextClearing.x0 + 250); if (!pocket) target = 420; }
  else if (knot && knot.state !== 'idle') { out.x = holdX(knot.cx - 520); if (!pocket) target = 330; }
  else if (pocket && depth < 3) { out.x = -0.7; if (layers[0].length) target = (layers[0][0].iv[0] + layers[0][0].iv[1]) / 2; }
  else out.x = slow ? 0.45 : 1;
  const err = b.y - target;
  if (err > 20 && b.vy > -170) press();
  else if (err < -60 && b.vy < 240 && !b.swoopT) out.y = 1;
  // Sprint along the clear stretches.
  const clearAhead = pick && pick.iv[1] - pick.iv[0] > 200 && !solids.some((s) => s.kind !== 'floor' && s.x > b.x && s.x < b.x + 900 && b.y + 90 > s.y - 40 && b.y - 90 < s.y + s.h + 40);
  const birdNear = birds.some((bd) => bd.state !== 'perched' && Math.abs(bd.x - b.x) < 500);
  out.sprint = !wait && !knot && !slow && b.st > 0.45 && clearAhead && !birdNear && b.y < 620 && b.y > 260 && Math.abs(err) < 90;
  return out;
}

// Board 1: the Stamp-Collecting Trollusk, "Faddle Street" (design/adventure.md,
// section 1). A side-on scroll from the wood's edge along the lane to Sally
// Ann's mailbox, before the mailman comes. Walking is a silent tiptoe; Sprint
// scurries, fast but every step rings out a noise that wakes the dog and makes
// a lookout turn; Action hops (hold for higher), and a hop that reaches a fence
// top or a ledge grabs it and pulls him up; Down ducks, and ducked in a bush or
// a flowerbed he is hidden; standing still he freezes in disguise behind his
// twig, which fools a lookout from far off but not close up. The lookouts
// (the neighbour on her porch, Sally Ann at her window) run the warn / look /
// rest cycle of chapter 1, each over her own stretch of lane. Being caught
// shoos him back to the last signpost or bush he hid in, costs time and spills
// two stamps, which flutter down to be picked up again.

import * as kit from './kit.js';
import * as art from '../art.js';
import { BOARDS } from './index.js';
import { actionPrompt, letterTag } from '../prompt.js';

const ENTRY = BOARDS[0];
const { W, H, clamp, lerp } = kit;

export const WORLD = 13700;
export const G = 880; // the lane's surface
const INK = '#2b1d14';
const PROPS = 'adv.b01.props';
const TERRAIN = 'terrain.lane';

// ---------- the Trollusk's numbers ----------
const P = {
  tiptoe: 200, scurry: 430, duckSpeed: 110, accel: 2400, decel: 3000, airAccel: 1400,
  jump: 1130, jumpCut: 0.42, gravity: 3000,
  freezeAfter: 0.35, // s still before he is in disguise
  farFool: 620, // frozen further than this from a lookout fools her
  shooSpeed: 950, shooPenalty: 3, soakPenalty: 2, spill: 2,
  noiseEvery: 0.22, noiseReach: 720, // a scurry ring wakes the dog from this far
  hangDepth: 200, climbTime: 0.3, hangWait: 0.22,
};

// ---------- the world ----------

// Solids: y is the top. kind: lane | bank | wall | porch | bin | fence | lid.
function solid(kind, x, y, w, h, extra = {}) { return { kind, x, y, w, h, ...extra }; }

export const DOG = { x: 6100, rope: 520, speed: 640 };
const KENNEL = { k: 0.91, dogCol: 0.57, base: 188, dogBottom: 300 }; // adv.b01.props 6: the dog asleep in front of its kennel
export const SPRINKLER = { x: 8880, reach: 330, rate: 1.4, height: 190 };
export const LID = { x: 9420, w: 160, h: 34, boost: 1760 };
export const MAILBOX = { x: 12700, grabR: 130 };
const MAIL_ROAD = 850; // how far up the road past the mailbox the mailman starts

export const LOOKOUTS = [
  // cast sprites: 3 neighbour peering / 4 dozing; 1 Sally Ann looking / 2 writing.
  { id: 'neighbour', name: 'The neighbour', x: 3700, y: G - 175, h: 250, look: 3, away: 4, zone: [2700, 4800], warn: 1.0, lookTime: 2.0, rest: 3.6, eyeY: G - 485 },
  { id: 'sally', name: 'Sally Ann', x: 11600, y: 664, h: 300, look: 1, away: 2, zone: [10500, 12450], warn: 0.95, lookTime: 2.0, rest: 3.4, eyeY: 300 },
];

// Cover: bushes (props.trollusk 5) and flowerbeds (6). Ducked inside one he is hidden.
export const COVER = [
  { x: 2900, kind: 'bush' }, { x: 3250, kind: 'bed' }, { x: 3550, kind: 'bush' }, { x: 3900, kind: 'bed' }, { x: 4250, kind: 'bush' }, { x: 4550, kind: 'bed' }, { x: 4850, kind: 'bush' },
  { x: 7150, kind: 'bush' },
  { x: 10400, kind: 'bush' }, { x: 10750, kind: 'bed' }, { x: 11150, kind: 'bush' }, { x: 11450, kind: 'bed' }, { x: 11750, kind: 'bush' }, { x: 12050, kind: 'bed' }, { x: 12350, kind: 'bush' },
];
const COVER_W = { bush: 100, bed: 135 }; // half-widths of the hiding spot
const COVER_H = { bush: 190, bed: 115 };

export const CHECKPOINTS = [220, 2600, 5050, 7350, 10400];

// The raised bank (terrain.lane 2) is a mound with a flat top and a slope down
// one side. It is drawn mirrored, so its cut end is a little cliff on the left
// (hop or grab up) and the slope runs down to the right. In the sprite (705 x
// 194) the base is the bottom edge, the flat top is at row 28 over columns
// 380–690, and the slope's top edge is sampled below; the slope is walked on a
// stair of small solids under it.
const BANK = { w: 705, h: 194, base: 191, top: 28, flat0: 380, flat1: 690,
  slope: [[375, 12], [350, 19], [325, 24], [300, 34], [275, 39], [250, 56], [225, 76], [200, 85], [175, 95], [150, 98], [125, 93], [100, 95], [75, 104], [50, 112]] };
function bank(s, x0, h) {
  const k = h / (BANK.base - BANK.top);
  const sx = x0 - (BANK.w - BANK.flat1) * k; // the mirrored sprite's left edge (its column 690)
  s.push(solid('bank', x0, G - h, (BANK.flat1 - BANK.flat0) * k, h, { grab: true, k, sx }));
  for (const [c, r] of BANK.slope) {
    const top = G + 2 - (BANK.base - r - 8) * k;
    s.push(solid('step', sx + (BANK.flat1 - c) * k, top, 25 * k + 1, G - top + 2, { step: true }));
  }
}
// The picket fence (terrain.lane 3, 924 x 231): the picket points at row 30
// are the walkway, the base at row 212; one tile per stretch.
const FENCE = { w: 924, h: 231, top: 30, base: 212 };
const FENCE_W = (170 / (FENCE.base - FENCE.top)) * FENCE.w; // 863 at a 170 px fence
const WALL = { w: 1149, h: 190, top: 3, base: 182 };

function buildSolids() {
  const s = [solid('lane', -400, G, WORLD + 800, 600)];
  // 1. The wood's edge: three banks to hop, the third too tall to hop (grab it).
  bank(s, 600, 90);
  bank(s, 1100, 130);
  bank(s, 1750, 205);
  // 3. The dog's yard: a dustbin and the fence to get up on, another bin past the rope.
  s.push(solid('bin', 5440, G - 150, 120, 150, { grab: true }));
  s.push(solid('fence', 5700, G - 170, FENCE_W, 170, { oneWay: true, grab: true }));
  s.push(solid('bin', 6750, G - 150, 120, 150, { grab: true }));
  // 4. The fence run: fence tops over the sprinkler, a lid, a low wall.
  s.push(solid('fence', 7500, G - 170, FENCE_W, 170, { oneWay: true, grab: true }));
  s.push(solid('fence', 8450, G - 170, FENCE_W, 170, { oneWay: true, grab: true }));
  s.push(solid('lid', LID.x - LID.w / 2, G - LID.h, LID.w, LID.h, { oneWay: true }));
  const wk = 113 / (WALL.base - WALL.top);
  s.push(solid('wall', 9600, G - 113, WALL.w * wk, 113, { grab: true }));
  return s;
}

// Stamps: about three dozen, on the lane, over the hops, along the fence tops,
// in the flowerbeds (duck to get them), in the dog's reach, up the tree over
// the dustbin lid. `wind` ones flutter.
function buildStamps() {
  const L = [];
  const at = (x, y, o = {}) => L.push({ x, y, ...o });
  // 1. The wood's edge.
  at(480, G - 70); at(700, G - 180, { wind: true }); at(900, G - 150); at(1000, G - 260, { wind: true });
  at(1260, G - 210); at(1680, G - 70); at(1900, G - 290); at(2250, G - 210, { wind: true });
  // 2. The neighbour's garden.
  at(2900, G - 60); at(3250, G - 50); at(3700, G - 260, { wind: true }); at(3900, G - 50); at(4250, G - 60); at(4550, G - 50); at(4850, G - 60);
  // 3. The dog's yard.
  at(5505, G - 240); at(5800, G - 250); at(6100, G - 250); at(6400, G - 250); at(5950, G - 60); at(6250, G - 60, { wind: true }); at(6805, G - 240);
  // 4. The fence run.
  at(7700, G - 250); at(7920, G - 250); at(8140, G - 300, { wind: true }); at(8300, G - 250); at(8700, G - 250); at(9000, G - 250); at(9200, G - 300, { wind: true });
  at(LID.x, G - 330); at(LID.x, G - 440); at(LID.x, G - 550, { wind: true }); at(LID.x + 10, G - 660);
  at(9550, G - 200); at(9800, G - 290);
  // 5. Sally Ann's house.
  at(10400, G - 60); at(10750, G - 50); at(11150, G - 60); at(11600, G - 250, { wind: true }); at(12050, G - 50); at(12350, G - 60); at(12620, G - 240, { wind: true });
  return L;
}

export default function create(env) {
  const total = kit.boardTime(env, ENTRY.time);
  art.preload(['scenes/bombanat']); // the wood's edge in the backdrop at the start
  const gentle = !!env.gentle?.[0];
  const cam = kit.makeCamera(WORLD, { lead: 300, anchor: 0.36 });
  const solids = buildSolids();
  const stamps = kit.makePickups(buildStamps(), { radius: 95 });
  const placed = stamps.total;
  const fx = kit.makeParticles();
  const cps = kit.makeCheckpoints(CHECKPOINTS);
  const hints = kit.makeHints([
    { x: 0, text: 'Tiptoe with the stick. Action: hop (hold it for higher)', show: 5 },
    { x: 1550, text: 'Too tall? Hop at the ledge to grab it, then pull up' },
    { x: 2610, text: 'The neighbour peers out. When the eye shows, duck (down) in a bush!' },
    { x: 5060, text: 'Shh! Scurrying wakes the dog. Hop up on the dustbin and the fence' },
    { x: 7360, text: 'Walk the fence tops. Mind the sprinkler!' },
    { x: 9150, text: 'Land on the dustbin lid: boing!' },
    { x: 10410, text: 'Sally Ann is at her window, and the mailman is coming!' },
    { x: 12400, text: 'At the mailbox, Action: pull the letter out!' },
  ]);

  const tc = art.makeCreature('trollusk', CHECKPOINTS[0], G);
  tc.sizeK = 1.1;
  const b = kit.makeBody({ x: CHECKPOINTS[0], y: G, w: 90, h: 240 });
  const pl = {
    b, mode: 'free', // free | hang | climb | shoo | soaked | grab
    ducking: false, hidden: false, frozen: false, stillT: 0, sprinting: false, moving: false,
    safeT: 0, stepT: 0, noiseT: 0, landT: 0, hangT: 0, hang: null, hangSide: 1, climbFrom: null,
    shooTo: 0, soakT: 0, lastSafe: CHECKPOINTS[0], cover: null, hangCd: 0,
  };
  const look = LOOKOUTS.map((L, i) => ({ ...L, i, state: 'rest', t: 0, restFor: 2 + i, lookFor: L.lookTime, judged: false, survived: false, spotted: 0, grace: 0, said: 0 }));
  const dog = { state: 'asleep', x: DOG.x, vx: 0, awakeT: 0, facing: -1, barkT: 0, zz: 0 };
  const spr = { t: 0, land: SPRINKLER.x, dir: 1 };
  const noise = [];
  const spills = [];
  let got = 0;
  let caught = 0;
  let t = 0;
  let outroT = 0;
  let mailX = MAILBOX.x + 170 + MAIL_ROAD;
  let motorT = 2;
  let jetTone = 0;
  let cpSeen = CHECKPOINTS[0];
  let lidSquash = 0;

  const inCoverAt = (x) => COVER.find((k) => Math.abs(x - k.x) <= COVER_W[k.kind]) || null;
  const onLane = () => b.onGround && b.y >= G - 2;
  const inZone = (L, x) => x >= L.zone[0] && x <= L.zone[1];
  const fracOf = (x) => clamp(x / WORLD, 0, 1);

  // ---------- being caught ----------

  function shoo(why, by) {
    caught++;
    self.time = Math.max(0, self.time - P.shooPenalty);
    env.sfx('caught'); env.sfx('gabble'); env.vibrate(90);
    cam.shake(10, env.reduceMotion);
    fx.pop(b.x, b.y - 300, why, { colour: '#c8443a', size: 54 });
    if (by) by.spotted = 1.2;
    // Two stamps spill from the bag and flutter down to be found again.
    const n = Math.min(P.spill, got);
    for (let i = 0; i < n; i++) {
      got--;
      spills.push({ x: b.x + (i ? 70 : -60), y: b.y - 200, vx: (i ? 1 : -1) * 90, vy: -260, t: 0, seed: env.rng() * 6, item: 1 + ((got + i) % 4) });
    }
    pl.mode = 'shoo';
    pl.shooTo = pl.lastSafe;
    pl.ducking = false; pl.hidden = false; pl.frozen = false; pl.stillT = 0;
    pl.hang = null;
    b.vx = 0; b.vy = 0;
    art.kick(tc, -0.5);
    tc.flash = 1;
  }

  // Judged every frame of a look, as in chapter 1.
  function judge(L) {
    if (pl.mode !== 'free' && pl.mode !== 'hang' && pl.mode !== 'climb') return;
    if (pl.safeT > 0 || L.grace > 0 || !inZone(L, b.x)) return;
    if (pl.hidden) return;
    const still = pl.frozen && pl.mode === 'free';
    if (!still) return shoo('Shoo!', L);
    if (!L.judged) {
      L.judged = true;
      if (Math.abs(b.x - L.x) > P.farFool) { L.survived = true; fx.pop(b.x, b.y - 300, '…a twig?', { size: 40 }); }
      else shoo('Not fooled!', L);
    }
  }

  function startWarn(L) {
    if (L.state !== 'ready' && L.state !== 'rest') return false;
    L.state = 'warn';
    L.t = L.warn * (gentle ? 1.3 : 1);
    env.sfx('eye');
    return true;
  }

  function stepLookouts(dt) {
    for (const L of look) {
      L.spotted = Math.max(0, L.spotted - dt);
      L.grace = Math.max(0, L.grace - dt);
      const nearBy = b.x > L.zone[0] - 900 && b.x < L.zone[1] + 200;
      if (L.state === 'rest') {
        L.t += dt;
        if (L.t >= L.restFor && nearBy) { L.state = 'ready'; L.t = 0; L.readyFor = 0.2 + env.rng() * 0.9; }
      } else if (L.state === 'ready') {
        L.t += dt;
        if (L.t >= L.readyFor) startWarn(L);
      } else if (L.state === 'warn') {
        L.t -= dt;
        if (L.t <= 0) {
          L.state = 'look';
          L.lookFor = L.lookTime * (0.85 + env.rng() * 0.4) * (gentle ? 0.85 : 1);
          L.t = L.lookFor;
          L.judged = false; L.survived = false; L.grace = 0.12;
        }
      } else if (L.state === 'look') {
        judge(L);
        L.t -= dt;
        if (L.t <= 0) {
          if (L.survived && pl.mode === 'free') fx.pop(b.x, b.y - 300, 'Phew!', { size: 40 });
          L.state = 'rest'; L.t = 0;
          L.restFor = L.rest * (0.8 + env.rng() * 0.5) * (gentle ? 1.3 : 1);
        }
      }
    }
  }

  // A noise ring at (x): the dog hears it from P.noiseReach, a resting lookout
  // whose stretch it is in turns to look.
  function makeNoise(x, y) {
    noise.push({ x, y, t: 0, s: env.rng() < 0.5 ? -1 : 1 });
    if (Math.abs(x - DOG.x) < P.noiseReach) wakeDog();
    for (const L of look) {
      if (x < L.zone[0] - 150 || x > L.zone[1] + 150) continue;
      if (L.state === 'ready' || (L.state === 'rest' && L.t > L.restFor * 0.5)) {
        if (startWarn(L)) fx.pop(L.x, L.eyeY - 90, 'What was that?', { size: 34 });
      }
    }
  }

  function wakeDog() {
    if (dog.state === 'asleep') { env.sfx('bark'); fx.pop(DOG.x, G - 230, 'WOOF!', { colour: '#c8443a', size: 50 }); }
    dog.state = 'awake';
    dog.awakeT = gentle ? 2.6 : 4;
  }

  function stepDog(dt) {
    dog.barkT = Math.max(0, dog.barkT - dt);
    if (dog.state === 'asleep') { dog.zz += dt; return; }
    dog.awakeT -= dt;
    if (dog.state === 'awake') {
      const target = clamp(b.x, DOG.x - DOG.rope, DOG.x + DOG.rope);
      const d = target - dog.x;
      dog.vx = clamp(d * 8, -DOG.speed, DOG.speed);
      dog.x += dog.vx * dt;
      if (Math.abs(dog.vx) > 30) dog.facing = Math.sign(dog.vx);
      if (dog.barkT <= 0) { dog.barkT = 0.9; env.sfx('bark'); }
      // Caught: on the lane within the rope's reach.
      if ((pl.mode === 'free' || pl.mode === 'hang') && pl.safeT <= 0 && b.y > G - 40 && Math.abs(dog.x - b.x) < 85 && Math.abs(b.x - DOG.x) <= DOG.rope + 40) {
        shoo('Caught!');
        dog.awakeT = 1.5;
      }
      if (dog.awakeT <= 0) dog.state = 'return';
    } else {
      const d = DOG.x - dog.x;
      dog.vx = clamp(d * 4, -DOG.speed * 0.6, DOG.speed * 0.6);
      dog.x += dog.vx * dt;
      if (Math.abs(dog.vx) > 30) dog.facing = Math.sign(dog.vx);
      if (Math.abs(d) < 8) { dog.x = DOG.x; dog.state = 'asleep'; dog.facing = -1; dog.vx = 0; }
    }
  }

  function stepSprinkler(dt) {
    spr.t += dt;
    const prev = spr.land;
    spr.land = SPRINKLER.x + Math.sin(spr.t * SPRINKLER.rate) * SPRINKLER.reach;
    spr.dir = Math.sign(spr.land - prev) || spr.dir;
    jetTone -= dt;
    if (jetTone <= 0 && cam.sees(SPRINKLER.x)) { jetTone = 0.5; env.sfx('drip'); }
    if (pl.mode === 'free' && pl.safeT <= 0 && b.y > G - 30 && Math.abs(b.x - spr.land) < 70) {
      pl.mode = 'soaked';
      pl.soakT = 0.9;
      self.time = Math.max(0, self.time - P.soakPenalty);
      b.vx = Math.sign(b.x - SPRINKLER.x || -1) * 420;
      b.vy = -500;
      b.onGround = false;
      pl.ducking = false; pl.hidden = false; pl.frozen = false; pl.stillT = 0;
      env.sfx('splash'); env.vibrate(60);
      fx.burst(b.x, b.y - 120, { n: 16, colour: '#9ec6e8', speed: 420, size: 10 });
      fx.pop(b.x, b.y - 300, 'Soaked!', { colour: '#3b6fa0', size: 50 });
      art.kick(tc, 0.5);
    }
  }

  // ---------- moving the Trollusk ----------

  function tryGrab() {
    if (b.vy < -320 || pl.hangCd > 0) return;
    const top = b.y - b.h;
    for (const s of solids) {
      if (!s.grab) continue;
      if (top < s.y - 60 || top > s.y + 80) continue;
      const front = b.x + b.w / 2, back = b.x - b.w / 2;
      if (b.vx >= -20 && front >= s.x - 14 && front <= s.x + 44 && b.x < s.x) { hang(s, 1); return; }
      if (b.vx <= 20 && back <= s.x + s.w + 14 && back >= s.x + s.w - 44 && b.x > s.x + s.w) { hang(s, -1); return; }
    }
  }

  function hang(s, side) {
    pl.mode = 'hang';
    pl.hang = s; pl.hangSide = side; pl.hangT = 0;
    b.x = side > 0 ? s.x - b.w / 2 + 6 : s.x + s.w + b.w / 2 - 6;
    b.y = Math.min(s.y + P.hangDepth, G - 4);
    b.vx = 0; b.vy = 0; b.onGround = false;
    tc.facing = side;
    env.sfx('thunk'); art.kick(tc, 0.3);
  }

  function movePlayer(dt, inp) {
    pl.safeT = Math.max(0, pl.safeT - dt);
    pl.hangCd = Math.max(0, pl.hangCd - dt);
    pl.landT = Math.max(0, pl.landT - dt);
    const ix = clamp(inp?.x || 0, -1, 1), iy = clamp(inp?.y || 0, -1, 1);

    if (pl.mode === 'shoo') {
      const dx = pl.shooTo - b.x, dy = G - b.y;
      const d = Math.hypot(dx, dy);
      const step = P.shooSpeed * dt;
      if (d <= step) {
        b.x = pl.shooTo; b.y = G; b.vx = 0; b.vy = 0; b.onGround = true;
        pl.mode = 'free'; pl.safeT = 1.2;
        art.kick(tc, 0.45); env.sfx('rustle');
      } else { b.x += (dx / d) * step; b.y += (dy / d) * step; b.vx = (dx / d) * P.shooSpeed; }
      pl.moving = true; pl.sprinting = false;
      return;
    }
    if (pl.mode === 'hang') {
      pl.hangT += dt;
      if (iy > 0.5) { pl.mode = 'free'; pl.hangCd = 0.35; pl.hang = null; return; }
      if (pl.hangT >= P.hangWait && (iy < -0.5 || inp?.actionPressed || ix * pl.hangSide > 0.3 || pl.hangT > 0.5)) {
        pl.mode = 'climb'; pl.hangT = 0;
        pl.climbFrom = { x: b.x, y: b.y };
        env.sfx('jump');
      }
      return;
    }
    if (pl.mode === 'climb') {
      pl.hangT += dt;
      const s = pl.hang;
      const k = Math.min(1, pl.hangT / P.climbTime);
      const tx = pl.hangSide > 0 ? s.x + b.w / 2 + 8 : s.x + s.w - b.w / 2 - 8;
      b.x = lerp(pl.climbFrom.x, tx, k);
      b.y = lerp(pl.climbFrom.y, s.y, k * k);
      if (k >= 1) {
        pl.mode = 'free'; b.onGround = true; b.ground = s; b.vy = 0; pl.hang = null;
        art.kick(tc, 0.35); env.sfx('land');
        fx.burst(b.x, b.y, { n: 5, colour: '#d9c9a0', speed: 160, size: 8 });
      }
      return;
    }
    if (pl.mode === 'soaked') {
      pl.soakT -= dt;
      kit.stepBody(b, solids, dt, { gravity: P.gravity });
      b.vx = kit.approach(b.vx, 0, 600 * dt);
      if (pl.soakT <= 0) { pl.mode = 'free'; pl.safeT = 0.8; }
      return;
    }
    if (pl.mode !== 'free') return;

    // Ducking: on the ground with the stick down.
    const wantDuck = iy > 0.5 && b.onGround;
    if (wantDuck !== pl.ducking) {
      pl.ducking = wantDuck;
      b.h = wantDuck ? 130 : 240;
      art.kick(tc, 0.4);
      if (wantDuck && pl.cover) { env.sfx('rustle'); pl.cover.shake = 0.8; }
    }
    const speed = pl.ducking ? P.duckSpeed : inp?.sprint && !pl.ducking ? P.scurry : P.tiptoe;
    const ev = kit.walkerControl(b, { ...inp, x: ix, sprint: false, actionPressed: inp?.actionPressed && !pl.ducking }, dt, {
      speed, accel: P.accel, decel: P.decel, airAccel: P.airAccel, jump: pl.ducking ? 0 : P.jump, jumpCut: P.jumpCut,
    });
    if (ev.jumped) {
      env.sfx('jump'); art.kick(tc, -0.45);
      fx.burst(b.x, b.y, { n: 5, colour: '#d9c9a0', speed: 180, up: 0.4, size: 8 });
      pl.stillT = 0; pl.frozen = false;
    }
    const wasAir = !b.onGround;
    const st = kit.stepBody(b, solids, dt, { gravity: P.gravity });
    b.x = clamp(b.x, 60, MAILBOX.x + 110);
    if (st.landed) {
      if (b.ground?.kind === 'lid') {
        b.vy = -LID.boost; b.onGround = false; lidSquash = 1;
        env.sfx('boing'); env.vibrate(30);
        fx.pop(b.x, b.y - 280, 'BOING!', { size: 46 });
        art.kick(tc, -0.7);
      } else if (st.landed > 220 || !b.ground?.step) {
        const hard = st.landed > 900;
        env.sfx('land'); art.kick(tc, hard ? 0.6 : 0.35);
        pl.landT = hard ? 0.16 : 0.08;
        fx.burst(b.x, b.y, { n: hard ? 9 : 4, colour: '#d9c9a0', speed: 200, size: 8 });
      }
    }
    if (wasAir && !b.onGround) tryGrab();
    pl.moving = Math.abs(b.vx) > 25 || !b.onGround;
    pl.sprinting = !!inp?.sprint && Math.abs(ix) > 0.2 && !pl.ducking;
    // Cover and hiding.
    const was = pl.cover;
    pl.cover = onLane() ? inCoverAt(b.x) : null;
    if (pl.cover && pl.cover !== was) { env.sfx('rustle'); pl.cover.shake = 0.6; }
    if (pl.cover && pl.moving) pl.cover.shake = Math.max(pl.cover.shake || 0, 0.3);
    pl.hidden = !!pl.cover && pl.ducking;
    if (pl.hidden) pl.lastSafe = Math.max(pl.lastSafe, pl.cover.x);
    // Still for a moment: frozen behind the twig.
    if (!pl.moving && b.onGround && !pl.ducking && Math.abs(ix) < 0.2) pl.stillT += dt; else pl.stillT = 0;
    const wasFrozen = pl.frozen;
    pl.frozen = pl.stillT >= P.freezeAfter;
    if (pl.frozen && !wasFrozen) { art.kick(tc, 0.3); env.sfx('swish'); }
    // Footsteps, and the noise of a scurry.
    if (b.onGround && Math.abs(b.vx) > 25) {
      pl.stepT -= dt;
      if (pl.stepT <= 0) { pl.stepT = pl.sprinting ? 0.15 : 0.4; env.sfx('step'); }
    }
    if (pl.sprinting && b.onGround && Math.abs(b.vx) > 200) {
      pl.noiseT -= dt;
      if (pl.noiseT <= 0) {
        pl.noiseT = P.noiseEvery;
        makeNoise(b.x - Math.sign(b.vx || 1) * 30, b.y - 20);
        if (env.rng() < 0.2) env.sfx('gabble');
        fx.burst(b.x - Math.sign(b.vx) * 30, b.y, { n: 2, colour: '#d9c9a0', speed: 120, size: 7 });
      }
    } else pl.noiseT = 0;
  }

  function stepSpills(dt) {
    for (let i = spills.length - 1; i >= 0; i--) {
      const s = spills[i];
      s.t += dt;
      s.vy = Math.min(140, s.vy + 500 * dt);
      s.x += (s.vx + Math.sin(s.t * 5 + s.seed) * 60) * dt;
      s.y += s.vy * dt;
      if (s.y > G - 50) { s.y = G - 50; s.vy = 0; s.vx *= 0.9; }
      if (pl.mode === 'free' && kit.near(s.x, s.y, b.x, b.y - 110, 95)) {
        spills.splice(i, 1);
        got++;
        env.sfx('pickup'); art.kick(tc, 0.2);
        fx.pop(s.x, s.y - 40, '+1', { size: 36 });
      }
    }
  }

  function animPlayer(dt) {
    tc.x = b.x; tc.y = b.y;
    if (pl.mode === 'grab') art.setAnim(tc, 'grab');
    else if (pl.mode === 'shoo') art.setAnim(tc, 'scuttle');
    else if (pl.mode === 'hang') art.setAnim(tc, 'hang');
    else if (pl.mode === 'climb') art.setAnim(tc, 'climb');
    else if (pl.mode === 'soaked') art.setAnim(tc, 'soaked');
    else if (!b.onGround) art.setAnim(tc, b.vy < 0 ? 'jump' : 'fall');
    else if (pl.landT > 0) art.setAnim(tc, 'landSquash');
    else if (pl.ducking) art.setAnim(tc, 'duck');
    else if (pl.sprinting && Math.abs(b.vx) > 200) art.setAnim(tc, 'run');
    else if (Math.abs(b.vx) > 25) art.setAnim(tc, b.ground?.kind === 'fence' ? 'balance' : 'sneak');
    else if (pl.frozen) art.setAnim(tc, 'freeze');
    else art.setAnim(tc, 'idle');
    if (pl.mode === 'shoo') { art.animate(tc, dt, 0, 0); tc.facing = -1; }
    else if (pl.mode === 'hang' || pl.mode === 'climb') { art.animate(tc, dt, 0, 0); tc.facing = pl.hangSide; }
    else art.animate(tc, dt, b.vx, 0);
  }

  function outro(dt) {
    outroT += dt;
    if (self.outcome === 'snatched') {
      if (outroT > 0.7) art.setAnim(tc, 'celebrate');
      if (outroT > 0.7 && outroT - dt <= 0.7) { env.sfx('gabble'); env.sfx('cheer'); art.kick(tc, 0.4); }
      art.animate(tc, dt);
      tc.facing = outroT > 0.7 ? -1 : 1;
    } else {
      art.setAnim(tc, 'wail');
      art.animate(tc, dt);
    }
    for (const L of look) if (L.state === 'warn' || L.state === 'look') { L.state = 'rest'; L.t = 0; }
    if (dog.state !== 'asleep') { dog.state = 'return'; dog.awakeT = 0; stepDog(dt); }
    tc.x = b.x; tc.y = b.y;
  }

  const self = {
    time: total, total, done: false, outcome: null, outroTime: 2.2,
    // For the tests and the autopilot.
    b, pl, look, dog, spr, solids, stamps, cps, cam, noise, spills, tc, MAILBOX, LID,
    get got() { return got; }, get caught() { return caught; }, get placed() { return placed; },
    makeNoise, wakeDog,
    atMailbox: () => onLane() && Math.abs(b.x - (MAILBOX.x - 40)) < MAILBOX.grabR,
    focus: () => [{ x: b.x - cam.x, y: b.y - 120 }],
    hud: () => `Stamps ${got}/${placed}`,
    marks: () => kit.boardMarks({ snatched: self.outcome === 'snatched', got, total: placed, feat: caught === 0 }),
    update(dt, inS) {
      t += dt;
      fx.update(dt);
      for (const n of noise) n.t += dt;
      while (noise.length && noise[0].t > 0.7) noise.shift();
      for (const k of COVER) k.shake = Math.max(0, (k.shake || 0) - dt * 1.5);
      lidSquash = Math.max(0, lidSquash - dt * 4);
      // The mailman putters along the road toward the mailbox as the clock runs.
      const target = MAILBOX.x + 170 + MAIL_ROAD * clamp(self.time / total, 0, 1);
      mailX += (target - mailX) * (1 - Math.exp(-2 * dt));
      cam.follow(b.x, b.vx, dt, t <= dt);
      if (self.done) { outro(dt); stepSpills(dt); return; }
      self.time = Math.max(0, self.time - dt);
      motorT -= dt;
      if (motorT <= 0) { motorT = self.time < 15 ? 1.4 : Math.abs(mailX - b.x) < 1400 ? 2.2 : 4; env.sfx('motor'); }
      // The snatch: at the mailbox, Action.
      if (pl.mode === 'free' && inS?.actionPressed && self.atMailbox()) {
        self.done = true;
        self.outcome = 'snatched';
        pl.mode = 'grab';
        tc.facing = 1;
        b.x = MAILBOX.x - 70; b.vx = 0;
        art.setAnim(tc, 'grab');
        art.kick(tc, -0.6);
        env.sfx('snatch'); env.sfx('gabble'); env.vibrate(150);
        fx.pop(MAILBOX.x, G - 420, 'Got it!', { size: 60 });
        return;
      }
      movePlayer(dt, inS);
      stepLookouts(dt);
      stepDog(dt);
      stepSprinkler(dt);
      stepSpills(dt);
      animPlayer(dt);
      hints.update(dt, b.x);
      if (pl.mode === 'free' || pl.mode === 'hang' || pl.mode === 'climb') {
        const n = stamps.update(dt, b.x, b.y - 110);
        if (n) {
          got += n;
          env.sfx('pickup'); env.sfx('tinkle'); art.kick(tc, 0.2);
          fx.pop(b.x, b.y - 280, got >= placed ? 'Every stamp!' : '+' + n, { size: 38 });
        }
      } else stamps.update(dt, -9999, -9999);
      // Signposts.
      const cp = cps.reach(b.x);
      if (cp !== cpSeen) {
        cpSeen = cp; pl.lastSafe = Math.max(pl.lastSafe, cp);
        env.sfx('checkpoint');
        fx.pop(cp, G - 330, 'Signpost!', { size: 38 });
      }
      if (self.time <= 0) {
        self.done = true;
        self.outcome = 'kept';
        env.sfx('horn');
        if (pl.mode !== 'free') { pl.mode = 'free'; b.y = Math.min(b.y, G); }
      }
    },
    draw(g, tt) {
      drawBackdrop(g);
      kit.haze(g, 'rgba(243,233,210,0.16)');
      cam.begin(g);
      drawRoad(g, tt);
      drawFarDecor(g, tt);
      drawGroundAll(g);
      drawSignposts(g);
      drawDecor(g, tt);
      drawDog(g, tt);
      drawSprinkler(g, tt);
      drawZones(g, tt);
      drawMailbox(g);
      drawStamps(g, tt);
      drawPlayer(g, tt);
      drawCover(g, tt);
      drawNoise(g);
      drawLookoutUi(g, tt);
      fx.draw(g);
      drawForeground(g);
      cam.end(g);
      kit.route(g, { you: fracOf(b.x), letter: fracOf(MAILBOX.x), signs: cps.fracs(WORLD) });
      if (!self.done) hints.draw(g);
    },
  };

  // ---------- drawing ----------

  function ink(g, w = 4) { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; }

  // The backdrop: the board's three panels when they arrive; until then crops
  // of the delivered scene paintings scrolled at a third of the lane's speed:
  // the wood (scenes/bombanat) at the start fading into the lane (the left of
  // scenes/trollusk, without its mailbox and dustbin), mirrored every other tile.
  function drawBackdrop(g) {
    const panels = ['adv/b01/backdrop-1', 'adv/b01/backdrop-2', 'adv/b01/backdrop-3'];
    if (panels.every((k) => art.image(k))) {
      kit.drawBackdrop(g, cam, { panels });
      // backdrop-3 paints a mailbox on a post at (1210, 480–700): a hedge bush on the same layer hides it.
      const step = W - 280, span = step * 2 + W;
      const f = (span - W) / (WORLD - W);
      const px = 2 * step - cam.x * f + 1212;
      if (px > -200 && px < W + 200) {
        const sp = art.sprite(PROPS, 11) || art.prop('trollusk', 5);
        art.drawSprite(g, sp, px, 712, { height: 290 });
      }
      return;
    }
    const lane = art.image('scenes/trollusk');
    const wood = art.image('scenes/bombanat');
    const off = cam.x * 0.3;
    if (!lane && !wood) {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#d9c8dc'); gr.addColorStop(0.6, '#e8dcc4'); gr.addColorStop(1, '#a8a070');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      return;
    }
    const tiles = (c, img, sx0, sw, mirror) => {
      const i0 = Math.floor((off - 200) / sw);
      for (let i = i0; i * sw - off < W + 200; i++) {
        const x = i * sw - off;
        c.save();
        if (mirror && i % 2) { c.translate(x + sw, 0); c.scale(-1, 1); c.drawImage(img, sx0, 0, sw, 1080, 0, 0, sw, H); }
        else c.drawImage(img, sx0, 0, sw, 1080, x, 0, sw, H);
        c.restore();
      }
    };
    // The lane: the stretch between the painting's two big trees (fence,
    // hollyhocks, hedge, hills and sky), mirrored so the joins are seamless.
    if (lane) tiles(g, lane, 330, 730, true);
    // The wood at the start, fading into the lane over a stretch of backdrop.
    const B0 = 900, FADE = 600;
    if (wood && off < B0 + FADE + 100) {
      if (typeof document !== 'undefined') {
        if (!blendCv) { blendCv = document.createElement('canvas'); blendCv.width = W; blendCv.height = H; }
        const c = blendCv.getContext('2d');
        c.clearRect(0, 0, W, H);
        tiles(c, wood, 0, 1500, true);
        c.globalCompositeOperation = 'destination-in';
        const gr = c.createLinearGradient(B0 - off, 0, B0 + FADE - off, 0);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = 'source-over';
        g.drawImage(blendCv, 0, 0);
      } else {
        g.save();
        g.beginPath(); g.rect(0, 0, Math.max(0, B0 - off), H); g.clip();
        tiles(g, wood, 0, 1500, true);
        g.restore();
      }
    }
  }
  let blendCv = null;

  // Between the backdrop and the lane: the road where the mailman putters
  // along, and the grassy verge the kennel and the porch stand on.
  const ROAD = { y1: 786 };
  function drawRoad(g, tt) {
    if (!cam.sees(mailX - 120, mailX + 120)) return;
    const parked = self.done && self.outcome === 'kept';
    const bounce = parked ? 0 : Math.floor(tt * 7) % 2;
    const x = mailX, yy = ROAD.y1 + 2 - bounce * 3;
    g.save();
    for (let i = 0; i < 3; i++) {
      const k = (tt * 1.5 + i / 3) % 1;
      g.globalAlpha = 0.35 * (1 - k);
      g.fillStyle = '#d8d2c8';
      g.beginPath(); g.arc(x + 80 + k * 70, yy - 20 - k * 24, 10 + k * 14, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.save(); g.globalAlpha = 0.2; g.fillStyle = INK;
    g.beginPath(); g.ellipse(x, ROAD.y1 + 4, 70, 9, 0, 0, Math.PI * 2); g.fill(); g.restore();
    if (!art.drawSprite(g, art.cast(7 + bounce), x, yy, { height: 150 })) {
      g.save(); g.fillStyle = '#b8443a'; ink(g); g.beginPath(); g.roundRect(x - 60, yy - 60, 120, 60, 14); g.fill(); g.stroke(); g.restore();
    }
  }

  // Trees, the neighbour's porch, Sally Ann's house, the tree over the lid.
  function drawFarDecor(g, tt) {
    if (cam.sees(LID.x - 350, LID.x + 350)) drawTree(g, LID.x + 40);
    // The neighbour on her porch.
    const N = look[0];
    if (cam.sees(N.x - 300, N.x + 300)) drawPorch(g, N, tt);
    const S = look[1];
    if (cam.sees(S.x - 400, S.x + 400)) drawHouse(g, S, tt);
  }

  // The tree over the dustbin lid: an inked trunk with bark grain, its crown
  // made of the delivered leafy bush at a large size.
  function drawTree(g, x) {
    const top = G - 560;
    g.save();
    ink(g, 4);
    g.fillStyle = '#9c7a52';
    g.beginPath();
    g.moveTo(x - 52, G + 4); g.quadraticCurveTo(x - 30, G - 40, x - 34, G - 200); g.quadraticCurveTo(x - 36, G - 400, x - 26, top);
    g.lineTo(x + 26, top); g.quadraticCurveTo(x + 38, G - 400, x + 36, G - 200); g.quadraticCurveTo(x + 32, G - 40, x + 58, G + 4);
    g.closePath(); g.fill(); g.stroke();
    // A root either side, and a branch.
    g.beginPath(); g.moveTo(x - 52, G - 30); g.quadraticCurveTo(x - 90, G - 10, x - 110, G + 2); g.lineTo(x - 50, G + 2);
    g.moveTo(x + 58, G - 24); g.quadraticCurveTo(x + 92, G - 6, x + 112, G + 2); g.lineTo(x + 52, G + 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x + 30, G - 420); g.quadraticCurveTo(x + 120, G - 450, x + 170, G - 520); g.lineTo(x + 180, G - 500); g.quadraticCurveTo(x + 120, G - 430, x + 34, G - 395); g.closePath(); g.fill(); g.stroke();
    // Bark grain.
    g.strokeStyle = 'rgba(43,29,20,0.45)'; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const bx = x - 24 + i * 8;
      g.beginPath(); g.moveTo(bx + 6, G - 20); g.quadraticCurveTo(bx - 4 + kit.hash(i) * 8, G - 250, bx + 2, G - 480 + kit.hash(i * 3) * 40); g.stroke();
    }
    g.beginPath(); g.ellipse(x + 8, G - 300, 9, 16, 0.2, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(x + 8, G - 300, 4, 8, 0.2, 0, Math.PI * 2); g.stroke();
    g.restore();
    // The crown.
    const crown = [[x - 150, top + 120, 330, false, 11], [x + 150, top + 110, 340, true, 5], [x + 10, top + 150, 300, false, 11], [x - 60, top + 40, 360, true, 5], [x + 90, top + 30, 350, false, 11], [x, top - 20, 380, true, 11]];
    for (const [cx, cy, h, flip, item] of crown) {
      const sp = item === 11 ? art.sprite(PROPS, 11) || art.prop('trollusk', 5) : art.prop('trollusk', 5);
      if (!art.drawSprite(g, sp, cx, cy, { height: h, flip })) {
        g.save(); g.fillStyle = '#7f9a4c'; ink(g, 4);
        g.beginPath(); g.ellipse(cx, cy - h * 0.45, h * 0.6, h * 0.5, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }
    }
  }

  // The neighbour's porch: terrain.lane 5 (a wooden porch step, three stairs) behind the lane.
  function drawPorch(g, N, tt) {
    const x0 = N.x - 200, x1 = N.x + 200, top = N.y;
    const PORCH = { w: 669, h: 215, top: 2, base: 211, platform: 0.72 }; // terrain.lane 5
    const pk = (G + 2 - top) / (PORCH.base - PORCH.top);
    kit.sprite(g, TERRAIN, 5, N.x, G + 2 + (PORCH.h - PORCH.base) * pk, { height: PORCH.h * pk, ax: PORCH.platform, ay: 1 }, (g) => {
      g.save(); ink(g, 4);
      g.fillStyle = '#9b4b3a';
      // The deck: planks with grain, a dark gap under the edge.
      g.fillStyle = '#c9a070';
      g.fillRect(x0, top, x1 - x0, G + 2 - top); g.strokeRect(x0, top, x1 - x0, G + 2 - top);
      for (let y = top + 22; y < G; y += 22) {
        g.strokeStyle = 'rgba(43,29,20,0.6)'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
        woodGrain(g, x0 + 10, y - 20, x1 - x0 - 20, 18, y * 0.37);
      }
      g.fillStyle = 'rgba(43,29,20,0.25)'; g.fillRect(x0, top + 2, x1 - x0, 6);
      // Three stairs on the right end.
      ink(g, 4); g.fillStyle = '#b8905e';
      for (let i = 0; i < 3; i++) {
        const sy = top + (i + 1) * 20, sx = x1 + i * 28;
        g.fillRect(sx, sy, 30, G + 2 - sy); g.strokeRect(sx, sy, 30, G + 2 - sy);
        woodGrain(g, sx + 4, sy + 4, 22, G - sy - 6, i + 3);
      }
      g.restore();
    });
    drawLookout(g, N, tt);
  }

  // Wood grain: a few wavy ink lines and a knot, within a box.
  function woodGrain(g, x, y, w, h, seed = 0) {
    g.save();
    g.strokeStyle = 'rgba(43,29,20,0.38)'; g.lineWidth = 1.6;
    const horizontal = w > h;
    const n = Math.max(2, Math.floor((horizontal ? h : w) / 7));
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      g.beginPath();
      if (horizontal) {
        const yy = y + h * k;
        g.moveTo(x, yy);
        for (let xx = x + 30; xx <= x + w; xx += 30) g.lineTo(xx, yy + (kit.hash(xx * 0.1 + seed + i) - 0.5) * 5);
      } else {
        const xx = x + w * k;
        g.moveTo(xx, y);
        for (let yy = y + 30; yy <= y + h; yy += 30) g.lineTo(xx + (kit.hash(yy * 0.1 + seed + i) - 0.5) * 5, yy);
      }
      g.stroke();
    }
    if (kit.hash(seed * 3.3) > 0.4) {
      const kx = x + w * (0.3 + kit.hash(seed) * 0.4), ky = y + h * (0.3 + kit.hash(seed * 2) * 0.4);
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(kx, ky, horizontal ? 9 : 4, horizontal ? 4 : 9, 0, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }

  function woodPost(g, x, y, w, h, colour = '#c9a070') {
    g.save(); ink(g, 4);
    g.fillStyle = colour; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
    woodGrain(g, x + 3, y + 6, w - 6, h - 12, x * 0.01);
    g.restore();
  }

  // Sally Ann's house (props/sallyann-house, 1024 x 1024, its window an empty
  // opening at columns 421–607, rows 399–655, the bottom fading out): Sally Ann
  // (cast 1 / 2, which come framed) is drawn behind it, so only the opening
  // shows her.
  const HOUSE = { k: 0.85, holeX: 0.502, holeY: 527 };
  function drawHouse(g, S, tt) {
    const img = art.image('props/sallyann-house');
    if (!img) { drawHouseStandin(g, S, tt); return; }
    const k = HOUSE.k, w = 1024 * k, top = S.y - 150 - HOUSE.holeY * k;
    drawLookout(g, S, tt);
    g.drawImage(img, S.x - w * HOUSE.holeX, top, w, w);
  }

  function drawHouseStandin(g, S, tt) {
    const x0 = S.x - 330, x1 = S.x + 330, y0 = 150, y1 = G + 2;
    g.save();
    g.fillStyle = '#efe0bf'; ink(g, 5);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(74,53,38,0.45)'; g.lineWidth = 2;
    for (let y = y0 + 28; y < y1; y += 28) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
    ink(g, 5); g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = '#b07a52'; g.fillRect(S.x - 150, S.y + 6, 300, 30); g.strokeRect(S.x - 150, S.y + 6, 300, 30);
    g.restore();
    drawLookout(g, S, tt);
  }

  function drawLookout(g, L, tt) {
    const looking = L.state === 'look';
    const sp = art.cast(looking ? L.look : L.away);
    const pop = looking ? Math.max(0, 1 - (L.lookFor - L.t) * 5) : 0;
    if (!art.drawSprite(g, sp, L.x, L.y, { height: L.h, sx: 1 + pop * 0.08, sy: 1 + pop * 0.12 })) {
      g.save(); g.fillStyle = looking ? '#e6b8a0' : '#a89a90'; ink(g, 4);
      g.beginPath(); g.ellipse(L.x, L.y - L.h / 2, L.h * 0.3, L.h / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
  }

  function drawGroundAll(g) {
    for (const s of solids) {
      if (!cam.sees(s.x, s.x + s.w)) continue;
      if (s.step) continue;
      if (s.kind === 'lane') drawLane(g, s);
      else if (s.kind === 'bank') drawBank(g, s);
      else if (s.kind === 'wall') drawWall(g, s);
      else if (s.kind === 'bin') drawBin(g, s);
      else if (s.kind === 'fence') drawFence(g, s);
      else if (s.kind === 'lid') drawLid(g, s);
    }
  }

  // The lane (terrain.lane 1): packed dirt under a grassy edge, with wheel
  // ruts, pebbles and hatching until the strip arrives.
  function drawLane(g, s) {
    // The strip (1400 x 175): the grass meets the dirt at row 55, so the tufts stand that far above the surface.
    const strip = art.sprite(TERRAIN, 1);
    if (strip) {
      const k = 290 / 175, lift = 55 * k, tw = strip.w * k, ov = 150 * k, step = tw - ov;
      const x0 = Math.max(s.x, cam.x - 40), x1 = Math.min(s.x + s.w, cam.x + W + 40);
      g.save();
      g.fillStyle = '#a8865a'; g.fillRect(x0, s.y + 290 - lift - 6, x1 - x0, H + 60 - (s.y + 290 - lift - 6));
      g.beginPath(); g.rect(s.x, s.y - lift - 80, s.w, 290 + 160); g.clip();
      const i0 = Math.floor((x0 - s.x) / step) - 1;
      for (let i = i0; s.x + i * step < x1; i++) {
        const x = s.x + i * step;
        if (i % 2) art.drawSprite(g, strip, x + tw, s.y - lift, { scale: k, ax: 0, ay: 0, flip: true });
        else art.drawSprite(g, strip, x, s.y - lift, { scale: k, ax: 0, ay: 0 });
      }
      g.restore();
      return;
    }
    const x0 = Math.max(s.x, cam.x - 40), x1 = Math.min(s.x + s.w, cam.x + W + 40);
    kit.inkGround(g, s, x0, x1, H + 60, { top: '#97a552', body: '#cfb17c', ink: INK });
    g.save();
    // A shadow band under the grassy edge.
    g.fillStyle = 'rgba(90,60,30,0.16)'; g.fillRect(x0, s.y + 22, x1 - x0, 16);
    // Two wheel ruts, wavy, with a lighter ridge between.
    for (const ry of [s.y + 86, s.y + 142]) {
      g.strokeStyle = 'rgba(90,60,30,0.35)'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath();
      for (let x = Math.floor(x0 / 60) * 60; x <= x1 + 60; x += 60) { const y = ry + (kit.hash(x * 0.07 + ry) - 0.5) * 8; x === Math.floor(x0 / 60) * 60 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.45)'; g.lineWidth = 2;
      g.beginPath();
      for (let x = Math.floor(x0 / 60) * 60; x <= x1 + 60; x += 60) { const y = ry + 5 + (kit.hash(x * 0.07 + ry) - 0.5) * 8; x === Math.floor(x0 / 60) * 60 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    // Pebbles and hatching.
    g.lineWidth = 1.8; g.strokeStyle = INK; g.fillStyle = '#b89a6a';
    for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) {
      const h1 = kit.hash(x * 0.9), h2 = kit.hash(x * 1.7);
      if (h1 < 0.35) continue;
      const px = x + h2 * 40, py = s.y + 40 + h1 * 150;
      g.beginPath(); g.ellipse(px, py, 7 + h2 * 6, 4 + h1 * 3, h2, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(px - 4, py + 6); g.lineTo(px + 8, py + 7); g.stroke();
    }
    g.strokeStyle = 'rgba(43,29,20,0.3)'; g.lineWidth = 1.6;
    g.beginPath();
    for (let x = Math.floor(x0 / 26) * 26; x < x1; x += 26) {
      for (let y = s.y + 40 + kit.hash(x) * 26; y < H; y += 44) { g.moveTo(x, y); g.lineTo(x + 14, y + 9); }
    }
    g.stroke();
    g.restore();
  }

  // A raised grassy bank (terrain.lane 2): a rounded mound with a grassy top.
  function drawBank(g, s) {
    const sp = art.sprite(TERRAIN, 2);
    if (sp) {
      // Mirrored: its cut end on the left, the slope down to the right.
      art.drawSprite(g, sp, s.sx + BANK.w * s.k, G + 2 + (BANK.h - BANK.base) * s.k, { scale: s.k, ax: 0, ay: 1, flip: true });
      return;
    }
    kit.sprite(g, TERRAIN, 2, s.x + s.w / 2, s.y + s.h + 2, { height: s.h + 20, ax: 0.5, ay: 1 }, (g) => {
      const r = Math.min(40, s.h * 0.45);
      g.save(); ink(g, 4);
      g.fillStyle = '#a07a4e';
      g.beginPath(); g.moveTo(s.x, s.y + s.h + 2); g.lineTo(s.x, s.y + r); g.quadraticCurveTo(s.x, s.y, s.x + r, s.y);
      g.lineTo(s.x + s.w - r, s.y); g.quadraticCurveTo(s.x + s.w, s.y, s.x + s.w, s.y + r); g.lineTo(s.x + s.w, s.y + s.h + 2); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.42)'; g.lineWidth = 1.8;
      g.beginPath();
      for (let x = s.x + 12; x < s.x + s.w - 8; x += 18) for (let y = s.y + 36 + kit.hash(x) * 16; y < s.y + s.h - 6; y += 26) { g.moveTo(x, y); g.lineTo(x + 11, y + 8); }
      // Denser near the sides.
      for (let y = s.y + 30; y < s.y + s.h; y += 12) { g.moveTo(s.x + 4, y); g.lineTo(s.x + 22, y + 9); g.moveTo(s.x + s.w - 22, y); g.lineTo(s.x + s.w - 4, y + 9); }
      g.stroke();
      g.fillStyle = '#b89a6a'; g.strokeStyle = INK; g.lineWidth = 1.8;
      for (let x = s.x + 30; x < s.x + s.w - 20; x += 54) { const h1 = kit.hash(x * 1.3); if (h1 < 0.4) continue; const py = s.y + 50 + h1 * (s.h - 70); g.beginPath(); g.ellipse(x, py, 6 + h1 * 4, 4, 0.3, 0, Math.PI * 2); g.fill(); g.stroke(); }
      ink(g, 4); g.fillStyle = '#8ea052';
      g.beginPath(); g.moveTo(s.x + 4, s.y + r); g.quadraticCurveTo(s.x + 4, s.y + 2, s.x + r, s.y + 2);
      g.lineTo(s.x + s.w - r, s.y + 2); g.quadraticCurveTo(s.x + s.w - 4, s.y + 2, s.x + s.w - 4, s.y + r);
      g.lineTo(s.x + s.w - 4, s.y + 24); g.lineTo(s.x + 4, s.y + 24); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(s.x, s.y + r); g.quadraticCurveTo(s.x, s.y, s.x + r, s.y); g.lineTo(s.x + s.w - r, s.y); g.quadraticCurveTo(s.x + s.w, s.y, s.x + s.w, s.y + r); g.stroke();
      g.lineWidth = 2.5;
      for (let x = s.x + 16; x < s.x + s.w - 10; x += 26) { g.beginPath(); g.moveTo(x, s.y + 2); g.lineTo(x - 4, s.y - 12); g.moveTo(x + 6, s.y + 2); g.lineTo(x + 9, s.y - 14); g.stroke(); }
      // Grass hanging over the edge.
      g.strokeStyle = '#6f8a3e'; g.lineWidth = 3;
      for (let x = s.x + 8; x < s.x + s.w - 4; x += 14) { g.beginPath(); g.moveTo(x, s.y + 20); g.quadraticCurveTo(x + 3, s.y + 34, x - 2 + kit.hash(x) * 8, s.y + 44 + kit.hash(x * 3) * 10); g.stroke(); }
      g.restore();
    });
  }

  // A low brick garden wall (terrain.lane 4).
  function drawWall(g, s) {
    const wk = s.h / (WALL.base - WALL.top);
    kit.sprite(g, TERRAIN, 4, s.x + s.w / 2, s.y + s.h + (WALL.h - WALL.base) * wk, { height: WALL.h * wk, ax: 0.5, ay: 1 }, (g) => {
      g.save(); ink(g, 4);
      g.fillStyle = '#b86a4e'; g.fillRect(s.x, s.y, s.w, s.h); g.strokeRect(s.x, s.y, s.w, s.h);
      g.strokeStyle = 'rgba(43,29,20,0.4)'; g.lineWidth = 2;
      for (let y = s.y + 22; y < s.y + s.h; y += 22) {
        g.beginPath(); g.moveTo(s.x, y); g.lineTo(s.x + s.w, y); g.stroke();
        const off = ((y - s.y) / 22) % 2 ? 30 : 0;
        for (let x = s.x + off; x < s.x + s.w; x += 60) { g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x, y); g.stroke(); }
      }
      ink(g, 4); g.fillStyle = '#d9c7a8'; g.fillRect(s.x - 8, s.y - 10, s.w + 16, 14); g.strokeRect(s.x - 8, s.y - 10, s.w + 16, 14);
      g.restore();
    });
  }

  // A tin dustbin (adv.b01.props 4).
  function drawBin(g, s) {
    // The bin (263 x 301): the lid's rim at row 31 is where he stands; the base at row 297.
    kit.sprite(g, PROPS, 4, s.x + s.w / 2, s.y + s.h + 4 * (s.h / 266), { height: 301 * (s.h / 266), ax: 0.5, ay: 1 }, (g) => {
      g.save(); ink(g, 4);
      const l = s.x + 4, r = s.x + s.w - 4, top = s.y + 10, bot = s.y + s.h;
      g.fillStyle = '#aab4ba';
      g.beginPath(); g.moveTo(l, top); g.lineTo(r, top); g.lineTo(r - 6, bot); g.lineTo(l + 6, bot); g.closePath(); g.fill(); g.stroke();
      // Ribs, each with a shadow hatch down its right side.
      for (let i = 1; i < 6; i++) {
        const x = l + i * (s.w - 8) / 6;
        g.strokeStyle = 'rgba(43,29,20,0.55)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x, top + 4); g.lineTo(x - i * 0.5, bot - 2); g.stroke();
        g.strokeStyle = 'rgba(43,29,20,0.3)'; g.lineWidth = 1.5;
        g.beginPath(); for (let y = top + 12; y < bot - 6; y += 9) { g.moveTo(x - 9, y); g.lineTo(x - 2, y + 4); } g.stroke();
      }
      // Two bands and a dent.
      ink(g, 3);
      g.beginPath(); g.moveTo(l + 1, top + 30); g.lineTo(r - 1, top + 30); g.moveTo(l + 4, bot - 34); g.lineTo(r - 4, bot - 34); g.stroke();
      g.strokeStyle = 'rgba(248,241,224,0.7)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(l + 14, top + 40); g.lineTo(l + 16, bot - 40); g.stroke();
      // The lid and its handle, the side handles.
      ink(g, 4); g.fillStyle = '#c3ccd1';
      g.beginPath(); g.ellipse(s.x + s.w / 2, top - 4, s.w / 2 + 6, 10, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(s.x + s.w / 2 - 14, top - 10); g.quadraticCurveTo(s.x + s.w / 2, top - 26, s.x + s.w / 2 + 14, top - 10); g.stroke();
      g.beginPath(); g.moveTo(l - 2, top + 40); g.quadraticCurveTo(l - 16, top + 50, l - 2, top + 62); g.moveTo(r + 2, top + 40); g.quadraticCurveTo(r + 16, top + 50, r + 2, top + 62); g.stroke();
      g.restore();
    });
  }

  // A stretch of white picket fence, its top rail the walkway (terrain.lane 3).
  function drawFence(g, s) {
    const sp = art.sprite(TERRAIN, 3);
    if (sp) {
      const k = s.h / (FENCE.base - FENCE.top);
      const n = Math.max(1, Math.round(s.w / (FENCE.w * k)));
      const sx = s.w / (n * FENCE.w * k);
      for (let i = 0; i < n; i++) art.drawSprite(g, sp, s.x + (i * s.w) / n, s.y + s.h + (FENCE.h - FENCE.base) * k, { scale: k, ax: 0, ay: 1, sx });
      return;
    }
    const x0 = Math.max(s.x, cam.x - 60), x1 = Math.min(s.x + s.w, cam.x + W + 60);
    g.save(); ink(g, 3.5);
    g.fillStyle = '#f4efe2';
    for (let x = Math.floor((x0 - s.x) / 44) * 44 + s.x; x < x1; x += 44) {
      g.beginPath(); g.moveTo(x + 4, s.y + s.h); g.lineTo(x + 4, s.y + 24); g.lineTo(x + 16, s.y + 6); g.lineTo(x + 28, s.y + 24); g.lineTo(x + 28, s.y + s.h); g.closePath(); g.fill(); g.stroke();
    }
    g.fillStyle = '#e8e1cf';
    g.fillRect(s.x, s.y + 22, s.w, 14); g.strokeRect(s.x, s.y + 22, s.w, 14);
    g.fillRect(s.x, s.y + s.h - 50, s.w, 14); g.strokeRect(s.x, s.y + s.h - 50, s.w, 14);
    // The posts at either end.
    g.fillStyle = '#ece5d2';
    for (const px of [s.x - 8, s.x + s.w - 14]) { g.fillRect(px, s.y - 6, 22, s.h + 6); g.strokeRect(px, s.y - 6, 22, s.h + 6); g.beginPath(); g.arc(px + 11, s.y - 14, 12, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.restore();
  }

  // The dustbin lid on the lane, a springboard (adv.b01.props 5), with the bin it fell off behind.
  function drawLid(g, s) {
    const sq = lidSquash;
    // The lid (308 x 99): its rim at row 28, the base at row 91.
    kit.sprite(g, PROPS, 5, s.x + s.w / 2, s.y + s.h + 8 * (s.h / 63), { height: 99 * (s.h / 63), ax: 0.5, ay: 1, sy: 1 - sq * 0.4, sx: 1 + sq * 0.15 }, (g) => {
      g.save(); ink(g, 4);
      g.translate(s.x + s.w / 2, s.y + s.h); g.scale(1 + sq * 0.15, 1 - sq * 0.4);
      g.fillStyle = '#b9c2c8';
      g.beginPath(); g.ellipse(0, -s.h / 2, s.w / 2 + 8, s.h / 2 + 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.4)'; g.lineWidth = 1.6;
      g.beginPath(); for (let x = -s.w / 2; x < s.w / 2; x += 9) { g.moveTo(x, s.h * 0.1); g.lineTo(x + 5, s.h * 0.4); } g.stroke();
      ink(g, 3);
      g.beginPath(); g.ellipse(0, -s.h / 2, s.w / 2 - 6, s.h / 2 - 4, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#d2dade';
      g.beginPath(); g.ellipse(0, -s.h / 2 - 6, s.w / 2 - 14, 9, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-14, -s.h / 2 - 10); g.quadraticCurveTo(0, -s.h / 2 - 28, 14, -s.h / 2 - 10); g.stroke();
      g.restore();
    });
  }

  function drawSignposts(g) {
    for (const x of cps.list) {
      if (!cam.sees(x)) continue;
      // The post (216 x 360) stands at column 100; its board's middle is at row 122.
      const drawn = kit.sprite(g, PROPS, 12, x, G + 6, { height: 230, ax: 0.46, ay: 1 }, (g) => {
        g.save(); ink(g, 4);
        woodPost(g, x - 9, G - 214, 18, 216, '#9c7a52');
        g.fillStyle = '#e8d8b0';
        g.beginPath(); g.moveTo(x - 70, G - 212); g.lineTo(x + 56, G - 212); g.lineTo(x + 80, G - 182); g.lineTo(x + 56, G - 152); g.lineTo(x - 70, G - 152); g.closePath(); g.fill(); g.stroke();
        woodGrain(g, x - 64, G - 206, 130, 48, x * 0.003);
        g.fillStyle = INK;
        for (const [nx, ny] of [[x - 60, G - 202], [x - 60, G - 162], [x + 48, G - 202], [x + 48, G - 162]]) { g.beginPath(); g.arc(nx, ny, 2.5, 0, Math.PI * 2); g.fill(); }
        g.font = '800 22px Fraunces, Georgia, serif'; g.textAlign = 'center';
        g.fillText('FADDLE ST', x - 4, G - 174);
        // A tuft at the foot.
        g.strokeStyle = '#6f8a3e'; g.lineWidth = 3;
        for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * 7, G + 2); g.quadraticCurveTo(x + i * 9, G - 10, x + i * 11, G - 18 - Math.abs(i) * 2); g.stroke(); }
        g.restore();
      });
      if (drawn) {
        g.save(); g.fillStyle = INK; g.font = '800 20px Fraunces, Georgia, serif'; g.textAlign = 'center';
        g.fillText('FADDLE ST', x + 8, G + 6 - (360 - 112) * (230 / 360));
        g.restore();
      }
      if (cps.last >= x) {
        g.save(); g.fillStyle = '#f2c53d'; ink(g, 3);
        g.beginPath(); g.arc(x - 44, G - 158, 10, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      }
    }
  }

  // Little things along the lane: a gnome, a wheelbarrow, the kennel.
  function drawDecor(g, tt) {
    // The garden gnome with his fishing rod (adv.b01.props 9).
    if (cam.sees(5150)) kit.sprite(g, PROPS, 9, 5150, G + 4, { height: 160, ax: 0.5, ay: 1 }, (g) => {
      const x = 5150;
      g.save(); ink(g, 3.5);
      // Boots, coat, belt.
      g.fillStyle = '#4a3526'; g.beginPath(); g.ellipse(x - 14, G - 6, 16, 8, 0, 0, Math.PI * 2); g.ellipse(x + 14, G - 6, 16, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#3b6fa0'; g.beginPath(); g.moveTo(x - 30, G - 12); g.quadraticCurveTo(x - 38, G - 70, x - 20, G - 104); g.lineTo(x + 20, G - 104); g.quadraticCurveTo(x + 38, G - 70, x + 30, G - 12); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.4)'; g.lineWidth = 1.5;
      g.beginPath(); for (let y = G - 96; y < G - 16; y += 8) { g.moveTo(x + 10, y); g.lineTo(x + 26, y + 5); } g.stroke();
      ink(g, 3.5); g.fillStyle = '#2b1d14'; g.fillRect(x - 32, G - 56, 64, 10); g.strokeRect(x - 32, G - 56, 64, 10);
      g.fillStyle = '#f2c53d'; g.fillRect(x - 7, G - 58, 14, 14); g.strokeRect(x - 7, G - 58, 14, 14);
      // The beard, face and nose.
      g.fillStyle = '#f4efe2'; g.beginPath(); g.moveTo(x - 22, G - 108); g.quadraticCurveTo(x - 26, G - 70, x, G - 60); g.quadraticCurveTo(x + 26, G - 70, x + 22, G - 108); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.4)'; g.lineWidth = 1.5;
      g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(x + i * 7, G - 100); g.quadraticCurveTo(x + i * 8, G - 84, x + i * 5, G - 70); } g.stroke();
      ink(g, 3.5);
      g.fillStyle = '#f0c8b0'; g.beginPath(); g.arc(x, G - 118, 20, Math.PI, 0); g.lineTo(x + 20, G - 108); g.lineTo(x - 20, G - 108); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#e8a090'; g.beginPath(); g.arc(x + 8, G - 112, 7, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.arc(x - 6, G - 118, 2.5, 0, Math.PI * 2); g.fill();
      // The hat, hatched down one side.
      g.fillStyle = '#c8443a'; g.beginPath(); g.moveTo(x - 26, G - 132); g.lineTo(x + 26, G - 132); g.quadraticCurveTo(x + 10, G - 150, x + 4, G - 186); g.quadraticCurveTo(x - 4, G - 150, x - 26, G - 132); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.45)'; g.lineWidth = 1.5;
      g.beginPath(); for (let y = G - 176; y < G - 134; y += 6) { g.moveTo(x + 2 - (G - 134 - y) * 0.1, y); g.lineTo(x + 14 - (G - 134 - y) * 0.45, y + 2); } g.stroke();
      // The rod, line and float.
      ink(g, 3); g.strokeStyle = '#8a6a44';
      g.beginPath(); g.moveTo(x + 18, G - 70); g.lineTo(x + 92, G - 160); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x + 92, G - 160); g.quadraticCurveTo(x + 100, G - 100, x + 96, G - 30); g.stroke();
      g.fillStyle = '#c8443a'; g.beginPath(); g.ellipse(x + 96, G - 30, 5, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    });
    // The wheelbarrow full of flowerpots (adv.b01.props 10).
    if (cam.sees(7150)) kit.sprite(g, PROPS, 10, 7150, G + 4, { height: 175, ax: 0.5, ay: 1 }, (g) => {
      const x = 7150;
      g.save(); ink(g, 4);
      // The leg and the wheel.
      g.beginPath(); g.moveTo(x + 50, G - 60); g.lineTo(x + 62, G - 2); g.moveTo(x + 76, G - 60); g.lineTo(x + 80, G - 2); g.stroke();
      g.fillStyle = '#4a3526'; g.beginPath(); g.arc(x - 50, G - 30, 30, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(x - 50, G - 30, 16, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.moveTo(x - 50, G - 30); g.lineTo(x - 50 + Math.cos(a) * 16, G - 30 + Math.sin(a) * 16); } g.stroke();
      // The body with plank lines, the handles.
      g.fillStyle = '#5f8a3a';
      g.beginPath(); g.moveTo(x - 70, G - 128); g.lineTo(x + 80, G - 128); g.lineTo(x + 60, G - 58); g.lineTo(x - 40, G - 58); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x - 62, G - 105); g.lineTo(x + 74, G - 105); g.moveTo(x - 55, G - 82); g.lineTo(x + 67, G - 82); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.3)'; g.lineWidth = 1.5;
      g.beginPath(); for (let xx = x - 50; xx < x + 60; xx += 12) { g.moveTo(xx, G - 100); g.lineTo(xx + 6, G - 88); } g.stroke();
      ink(g, 4); g.strokeStyle = '#8a6a44'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x + 80, G - 122); g.lineTo(x + 150, G - 100); g.stroke();
      ink(g, 3); g.beginPath(); g.moveTo(x + 80, G - 122); g.lineTo(x + 150, G - 100); g.stroke();
      // Flowerpots with a red bloom each.
      for (let i = 0; i < 3; i++) {
        const px = x - 48 + i * 48;
        g.fillStyle = '#c0714e'; g.beginPath(); g.moveTo(px - 18, G - 128); g.lineTo(px + 18, G - 128); g.lineTo(px + 14, G - 168); g.lineTo(px - 14, G - 168); g.closePath(); g.fill(); g.stroke();
        g.fillRect(px - 20, G - 172, 40, 8); g.strokeRect(px - 20, G - 172, 40, 8);
        g.strokeStyle = 'rgba(43,29,20,0.4)'; g.lineWidth = 1.5; g.beginPath(); for (let y = G - 164; y < G - 130; y += 6) { g.moveTo(px + 2, y); g.lineTo(px + 12, y + 3); } g.stroke();
        ink(g, 3); g.strokeStyle = '#5f8a3a'; g.beginPath(); g.moveTo(px, G - 172); g.lineTo(px - 4, G - 200); g.stroke();
        ink(g, 3); g.fillStyle = '#c8443a';
        for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.ellipse(px - 4 + Math.cos(a) * 9, G - 204 + Math.sin(a) * 9, 6, 4.5, a, 0, Math.PI * 2); g.fill(); g.stroke(); }
        g.fillStyle = '#f2c53d'; g.beginPath(); g.arc(px - 4, G - 204, 4, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
    });
    // The kennel: in the delivered sprite (adv.b01.props 6) the dog sleeps in
    // front of it, so it is drawn clipped to the kennel while the dog is up.
    if (cam.sees(DOG.x - 200, DOG.x + 200)) drawKennel(g);
  }

  function drawKennel(g) {
    const sp = art.sprite(PROPS, 6);
    const ky = G + 2;
    if (sp) {
      const k = KENNEL.k;
      const top = ky - KENNEL.dogBottom * k;
      const asleep = dog.state === 'asleep';
      g.save();
      if (!asleep) { g.beginPath(); g.rect(DOG.x - 400, top - 20, 800, KENNEL.base * k + 20); g.clip(); }
      art.drawSprite(g, sp, DOG.x, ky, { scale: k, ax: KENNEL.dogCol, ay: 1 });
      g.restore();
      g.save(); ink(g, 4);
      g.setLineDash([16, 14]); g.strokeStyle = dog.state === 'asleep' ? 'rgba(43,29,20,0.45)' : '#c8443a'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(DOG.x - DOG.rope, G + 14); g.lineTo(DOG.x + DOG.rope, G + 14); g.stroke();
      g.setLineDash([]);
      for (const px of [DOG.x - DOG.rope, DOG.x + DOG.rope]) { g.beginPath(); g.moveTo(px, G + 2); g.lineTo(px, G + 26); g.stroke(); }
      g.restore();
      return;
    }
    {
      const kx = DOG.x + 150;
      g.save(); ink(g, 4);
      g.fillStyle = '#b07a52'; g.fillRect(kx - 100, ky - 170, 200, 170); g.strokeRect(kx - 100, ky - 170, 200, 170);
      g.strokeStyle = 'rgba(43,29,20,0.55)'; g.lineWidth = 2;
      for (let y = ky - 150; y < ky; y += 24) { g.beginPath(); g.moveTo(kx - 100, y); g.lineTo(kx + 100, y); g.stroke(); woodGrain(g, kx - 94, y - 22, 188, 20, y * 0.11); }
      ink(g, 4);
      g.fillStyle = '#2b1d14'; g.beginPath(); g.moveTo(kx - 55, ky); g.lineTo(kx - 55, ky - 90); g.arc(kx, ky - 90, 55, Math.PI, 0); g.lineTo(kx + 55, ky); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(248,241,224,0.25)'; g.lineWidth = 1.5;
      g.beginPath(); for (let y = ky - 120; y < ky - 4; y += 8) { g.moveTo(kx - 40, y); g.lineTo(kx - 10, y + 6); } g.stroke();
      ink(g, 4);
      g.fillStyle = '#9b4b3a'; g.beginPath(); g.moveTo(kx - 125, ky - 165); g.lineTo(kx, ky - 250); g.lineTo(kx + 125, ky - 165); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 2;
      for (let i = 1; i < 6; i++) { const y = ky - 165 - i * 14, w = 125 * (1 - i / 6.1); g.beginPath(); g.moveTo(kx - w, y); g.lineTo(kx + w, y); g.stroke(); for (let x = kx - w + ((i % 2) ? 0 : 14); x < kx + w; x += 28) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 14); g.stroke(); } }
      ink(g, 3);
      g.fillStyle = '#e8d8b0'; g.fillRect(kx - 36, ky - 150, 72, 26); g.strokeRect(kx - 36, ky - 150, 72, 26);
      g.fillStyle = INK; g.font = '800 18px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.fillText('REX', kx, ky - 131);
      // The rope's reach, marked on the lane.
      g.setLineDash([16, 14]); g.strokeStyle = dog.state === 'asleep' ? 'rgba(43,29,20,0.45)' : '#c8443a'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(DOG.x - DOG.rope, G + 14); g.lineTo(DOG.x + DOG.rope, G + 14); g.stroke();
      g.setLineDash([]);
      for (const px of [DOG.x - DOG.rope, DOG.x + DOG.rope]) { g.beginPath(); g.moveTo(px, G + 2); g.lineTo(px, G + 26); g.stroke(); }
      g.restore();
    }
  }

  function drawDog(g, tt) {
    if (!cam.sees(dog.x - 200, dog.x + 200)) return;
    const asleep = dog.state === 'asleep';
    const running = dog.state !== 'asleep' && Math.abs(dog.vx) > 60;
    const have = !!art.sprite(PROPS, 6);
    const kx = have ? DOG.x - 40 : DOG.x + 150;
    if (!asleep) {
      // The rope from the kennel to the dog's collar.
      g.save(); ink(g, 4); g.strokeStyle = '#8a6a44';
      g.beginPath(); g.moveTo(kx, G - 100);
      const sag = Math.max(0, 60 - Math.abs(dog.x - kx) * 0.1);
      g.quadraticCurveTo((kx + dog.x) / 2, G - 100 + sag, dog.x - dog.facing * 40, G - 80); g.stroke();
      g.restore();
    }
    const bob = running ? Math.abs(Math.sin(tt * 18)) * 10 : 0;
    // 06 is drawn whole by drawKennel (the dog asleep is part of it); 07 strains on the rope (its stub runs back toward the kennel), 08 runs.
    if (!(asleep && have)) {
      const item = asleep ? 6 : running ? 8 : 7;
      kit.sprite(g, PROPS, item, dog.x, G + 4 - bob, { height: running ? 200 : 235, ax: 0.5, ay: 1, flip: dog.facing < 0 }, (g) => {
        const sp = art.cast(asleep ? 6 : 5);
        if (!art.drawSprite(g, sp, dog.x, G + 2 - bob, { height: asleep ? 110 : 165, flip: dog.facing > 0, rot: running ? Math.sin(tt * 18) * 0.08 : 0 })) {
          g.save(); g.fillStyle = '#c9a070'; ink(g, 4);
          g.beginPath(); g.ellipse(dog.x, G - 60, 70, asleep ? 40 : 60, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
        }
      });
    }
    if (asleep) {
      g.save(); g.font = '800 34px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.fillStyle = INK;
      const k = (dog.zz * 0.6) % 1;
      g.globalAlpha = 1 - k;
      g.fillText('z', dog.x + 40 + k * 20, G - 130 - k * 50);
      g.fillText('Z', dog.x + 70 + k * 30, G - 170 - k * 60);
      g.restore();
    } else if (dog.state === 'awake') {
      g.save(); g.font = '900 54px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 8; g.strokeStyle = INK; g.fillStyle = '#c8443a';
      g.strokeText('!', dog.x, G - 250); g.fillText('!', dog.x, G - 250); g.restore();
    }
  }

  // The garden sprinkler (adv.b01.props 3) and its sweeping jet; the wet spot is where it lands.
  function drawSprinkler(g, tt) {
    if (!cam.sees(SPRINKLER.x - 450, SPRINKLER.x + 450)) return;
    const sx = SPRINKLER.x;
    const head = art.sprite(PROPS, 3);
    // The sprite (337 x 315) carries its own spray above row 95: only the head and stem are drawn, the moving jet is ours.
    const sy = head ? G + 2 - (315 - 115) * (200 / 315) + 30 : G - 30;
    if (head) {
      const k = 200 / 315;
      g.save(); g.beginPath(); g.rect(sx - 200, G + 2 - (315 - 95) * k, 400, 400); g.clip();
      art.drawSprite(g, head, sx, G + 4, { scale: k });
      g.restore();
    }
    if (!head) kit.sprite(g, PROPS, 3, sx, G + 2, { height: 80, ax: 0.5, ay: 1 }, (g) => {
      g.save(); ink(g, 4);
      g.fillStyle = '#6aa84f'; g.beginPath(); g.moveTo(sx - 40, G); g.lineTo(sx + 40, G); g.lineTo(sx + 26, G - 24); g.lineTo(sx - 26, G - 24); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.4)'; g.lineWidth = 1.5;
      g.beginPath(); for (let x = sx - 36; x < sx + 36; x += 8) { g.moveTo(x, G - 4); g.lineTo(x + 4, G - 18); } g.stroke();
      ink(g, 4);
      g.fillStyle = '#a9b2b8'; g.fillRect(sx - 8, G - 60, 16, 40); g.strokeRect(sx - 8, G - 60, 16, 40);
      g.beginPath(); g.arc(sx, G - 64, 12, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(43,29,20,0.5)'; g.lineWidth = 1.5;
      g.beginPath(); for (let y = G - 56; y < G - 22; y += 5) { g.moveTo(sx + 1, y); g.lineTo(sx + 6, y + 2); } g.moveTo(sx + 3, G - 72); g.lineTo(sx + 8, G - 60); g.stroke();
      g.fillStyle = '#4a3526'; g.beginPath(); g.arc(sx, G - 64, 4, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    // The arc of water from the head to where it lands.
    const lx = spr.land;
    const peakY = sy - SPRINKLER.height - Math.abs(lx - sx) * 0.15;
    g.save();
    g.strokeStyle = 'rgba(120,170,220,0.8)'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx, sy - 40); g.quadraticCurveTo((sx + lx) / 2, peakY, lx, G); g.stroke();
    g.strokeStyle = 'rgba(230,245,255,0.9)'; g.lineWidth = 3;
    g.setLineDash([10, 16]); g.lineDashOffset = -tt * 300;
    g.beginPath(); g.moveTo(sx, sy - 40); g.quadraticCurveTo((sx + lx) / 2, peakY, lx, G); g.stroke();
    g.setLineDash([]);
    // Where it is landing: the wet patch.
    g.fillStyle = 'rgba(120,170,220,0.45)';
    g.beginPath(); g.ellipse(lx, G + 6, 72, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(230,245,255,0.9)';
    for (let i = 0; i < 5; i++) { const k = (tt * 2 + i / 5) % 1; g.beginPath(); g.arc(lx + (i - 2) * 24, G - 6 - k * 50, 5 + k * 3, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }

  // Each lookout's stretch of the lane: a dashed band while the eye warns, lit while she looks.
  function drawZones(g, tt) {
    for (const L of look) {
      if (L.state !== 'warn' && L.state !== 'look') continue;
      const [z0, z1] = L.zone;
      if (!cam.sees(z0, z1)) continue;
      const cx = (z0 + z1) / 2, rx = (z1 - z0) / 2, cy = G + 10, ry = 44;
      g.save();
      if (L.state === 'warn') {
        g.globalAlpha = 0.6 + 0.3 * Math.sin(tt * 18);
        g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgba(242,197,61,0.16)'; g.fill();
        g.setLineDash([26, 18]); g.lineWidth = 10; g.strokeStyle = 'rgba(51,36,26,0.55)'; g.stroke();
        g.lineWidth = 5; g.strokeStyle = '#f2c53d'; g.stroke();
      } else {
        const ex = L.x, ey = L.y - L.h * 0.7;
        const gr = g.createLinearGradient(0, ey, 0, cy);
        gr.addColorStop(0, 'rgba(255,236,150,0.08)'); gr.addColorStop(1, 'rgba(255,236,150,0.25)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(ex - 18, ey); g.lineTo(ex + 18, ey); g.lineTo(z1, cy); g.lineTo(z0, cy); g.closePath(); g.fill();
        g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        g.fillStyle = L.spotted > 0 ? 'rgba(200,68,58,0.25)' : 'rgba(255,236,150,0.35)'; g.fill();
        g.lineWidth = 10; g.strokeStyle = 'rgba(51,36,26,0.55)'; g.stroke();
        g.lineWidth = 6; g.strokeStyle = L.spotted > 0 ? '#c8443a' : '#f2c53d'; g.stroke();
      }
      g.restore();
    }
  }

  function drawLookoutUi(g, tt) {
    for (const L of look) {
      if (!cam.sees(L.x - 200, L.x + 200)) continue;
      const top = L.eyeY;
      if (L.state === 'warn') {
        const k = 1 + 0.12 * Math.sin(tt * 20);
        if (!art.drawSprite(g, art.prop('trollusk', 9), L.x, top + 60, { height: 130 * k })) {
          g.save(); g.fillStyle = '#f2c53d'; ink(g, 4); g.beginPath(); g.arc(L.x, top, 44, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
        }
      }
      if (L.spotted > 0) {
        g.save(); g.font = '900 60px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 8; g.strokeStyle = INK; g.fillStyle = '#c8443a';
        g.strokeText('!', L.x + 90, top + 20); g.fillText('!', L.x + 90, top + 20); g.restore();
      }
      // Her rest: a little clock filling up; a green dot when she is about to look.
      const cx = L.x - 95, cy = top + 10;
      g.save(); g.lineWidth = 4; g.strokeStyle = INK;
      if (L.state === 'rest') {
        g.fillStyle = 'rgba(248,241,224,0.9)';
        g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#8f8a86';
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(L.t / L.restFor, 0, 1)); g.closePath(); g.fill();
      } else if (L.state === 'ready') {
        g.fillStyle = '#6aa84f';
        g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.restore();
    }
  }

  function drawMailbox(g) {
    const tNow = t;
    if (!cam.sees(MAILBOX.x - 200, MAILBOX.x + 200)) return;
    const open = self.outcome === 'snatched';
    kit.sprite(g, 'props.trollusk', open ? 8 : 7, MAILBOX.x, G + 2, { height: open ? 290 : 262, ax: 0.5, ay: 1 }, (g) => {
      g.save(); ink(g, 4);
      g.fillStyle = '#8a6a44'; g.fillRect(MAILBOX.x - 12, G - 150, 24, 152); g.strokeRect(MAILBOX.x - 12, G - 150, 24, 152);
      g.fillStyle = '#9aa0a6';
      g.beginPath(); g.moveTo(MAILBOX.x - 70, G - 150); g.lineTo(MAILBOX.x - 70, G - 220); g.arc(MAILBOX.x - 30, G - 220, 40, Math.PI, 0); g.lineTo(MAILBOX.x + 70, G - 150); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#c8443a'; g.fillRect(MAILBOX.x + 50, G - 270, 10, 60); g.strokeRect(MAILBOX.x + 50, G - 270, 10, 60);
      g.restore();
    });
    // The letter, poking out (gone once snatched), and the house number on the post.
    if (!open) {
      g.save(); g.fillStyle = '#fbf6e8'; ink(g, 3);
      g.translate(MAILBOX.x - 60, G - 190); g.rotate(-0.25);
      g.fillRect(-22, -14, 44, 28); g.strokeRect(-22, -14, 44, 28);
      g.fillStyle = '#b3402e'; g.fillRect(8, -10, 9, 9);
      g.restore();
    }
    if (!open) letterTag(g, MAILBOX.x - 60, G - 330, { t: tNow });
    if (!self.done && self.atMailbox() && pl.mode === 'free') actionPrompt(g, MAILBOX.x - 40, G - 400, 'Grab!', { kind: env.inputKind, t: tNow, pulse: 1 });
  }

  // Stamps: the delivered stamps (props.trollusk 1–4) in turn, the wind ones spinning.
  function drawStamp(g, p, x, y, alpha, tt) {
    const item = 1 + (p.seed * 10 % 4 | 0);
    const rot = p.wind ? Math.sin(tt * 4 + p.seed) * 0.6 : Math.sin(tt * 1.5 + p.seed) * 0.12;
    const sp = (p.wind && art.sprite(PROPS, 1 + (item % 2))) || art.prop('trollusk', item);
    if (art.drawSprite(g, sp, x, y, { height: 46, ay: 0.5, rot, alpha, sx: p.wind ? 0.7 + 0.3 * Math.abs(Math.cos(tt * 5 + p.seed)) : 1 })) return;
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(rot);
    g.fillStyle = ['#c8443a', '#5f8a3a', '#3b6fa0', '#f2c53d'][item - 1]; ink(g, 3);
    g.fillRect(-18, -22, 36, 44); g.strokeRect(-18, -22, 36, 44);
    g.restore();
  }

  function drawStamps(g, tt) {
    stamps.draw(g, cam, tt, drawStamp, { bob: 12 });
    for (const s of spills) {
      if (!cam.sees(s.x)) continue;
      drawStamp(g, { seed: s.seed, wind: s.vy !== 0 }, s.x, s.y, 1, tt);
    }
    // Wind-blown stamps leave a little wisp.
    g.save(); g.strokeStyle = 'rgba(43,29,20,0.35)'; g.lineWidth = 2;
    for (const p of stamps.items) {
      if (!p.wind || p.got || !cam.sees(p.x)) continue;
      const k = (tt * 1.3 + p.seed) % 1;
      g.globalAlpha = 1 - k;
      g.beginPath(); g.moveTo(p.x - 30 - k * 40, p.y + 10 + Math.sin(k * 6) * 8); g.quadraticCurveTo(p.x - 60 - k * 40, p.y - 6, p.x - 90 - k * 40, p.y + 12); g.stroke();
    }
    g.restore();
  }

  function drawPlayer(g, tt) {
    art.drawCreature(g, tc, tt, { reduceMotion: env.reduceMotion });
    if (pl.mode === 'free' && !self.done && pl.safeT > 0 && Math.floor(tt * 10) % 2) return;
    if (pl.frozen && pl.mode === 'free' && !pl.cover) {
      // Far enough from the lookout, his twig is a twig: a faint leaf by his feet says so.
      const safe = look.every((L) => !inZone(L, b.x) || Math.abs(b.x - L.x) > P.farFool);
      g.save(); g.fillStyle = safe ? '#5f8a3a' : '#c8443a'; ink(g, 3); g.globalAlpha = 0.9;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(b.x - 22 + i * 22, b.y + 24, 9, 6, 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.restore();
    }
    if (pl.hidden) {
      g.save(); g.font = '800 30px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = 'rgba(248,241,224,0.95)'; g.fillStyle = INK;
      g.strokeText('hidden', b.x, G - 225); g.fillText('hidden', b.x, G - 225); g.restore();
    }
  }

  // Bushes and flowerbeds, in front of him so that ducked he vanishes into them.
  function drawCover(g, tt) {
    for (const k of COVER) {
      if (!cam.sees(k.x - 200, k.x + 200)) continue;
      const shake = k.shake > 0 && !env.reduceMotion ? Math.sin(tt * 60) * 5 * k.shake : 0;
      const h = COVER_H[k.kind];
      const item = k.kind === 'bush' ? 5 : 6;
      const sp = (k.kind === 'bush' && kit.hash(k.x) > 0.5 && art.sprite(PROPS, 11)) || art.prop('trollusk', item);
      if (!art.drawSprite(g, sp, k.x + shake, G + 6, { height: h, rot: shake * 0.004 })) {
        g.save(); g.fillStyle = k.kind === 'bush' ? '#5f7a45' : '#6a8a3a'; ink(g, 4);
        g.beginPath(); g.ellipse(k.x + shake, G - h * 0.45, COVER_W[k.kind], h * 0.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.restore();
      }
    }
  }

  function drawNoise(g) {
    g.save(); g.strokeStyle = INK; g.lineCap = 'round';
    for (const n of noise) {
      if (!cam.sees(n.x)) continue;
      const k = n.t / 0.7;
      g.globalAlpha = 1 - k;
      g.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.5 + n.s * 0.15;
        const r0 = 14 + k * 30, r1 = 30 + k * 40;
        g.beginPath(); g.moveTo(n.x + Math.cos(a) * r0, n.y + Math.sin(a) * r0); g.lineTo(n.x + Math.cos(a) * r1, n.y + Math.sin(a) * r1); g.stroke();
      }
    }
    g.restore();
  }

  // Grass blades passing in front, faster than the lane, for depth.
  function drawForeground(g) {
    const k = 0.35; // extra parallax
    const off = cam.x * k;
    g.save(); g.strokeStyle = '#4f6a2e'; g.lineWidth = 5; g.lineCap = 'round'; g.globalAlpha = 0.85;
    const i0 = Math.floor((cam.x + off - 200) / 460);
    for (let i = i0; i * 460 < cam.x + off + W + 200; i++) {
      const x = i * 460 - off + kit.hash(i) * 200;
      const y = H + 6;
      const sc = 0.7 + kit.hash(i * 7) * 0.6;
      g.beginPath();
      for (let j = 0; j < 6; j++) {
        const bx = x + (j - 2.5) * 14 * sc, h = (50 + kit.hash(i * 11 + j) * 50) * sc, lean = (kit.hash(i * 13 + j) - 0.5) * 50 * sc;
        g.moveTo(bx, y); g.quadraticCurveTo(bx + lean * 0.3, y - h * 0.6, bx + lean, y - h);
      }
      g.stroke();
    }
    g.restore();
  }

  return self;
}

// The how-to-play page (chapters/index.js, "THE HOW-TO-PLAY PAGE"): three steps.
export const HOWTO = [
  {
    text: 'Tiptoe along the lane and hop up the ledges. Scurrying is faster, but noisy.',
    scene: 'scenes/trollusk', crop: [0, 380, 1280, 720],
    items: [
      { creature: 'trollusk', anim: 'sneak', x: 150, y: 420, h: 150 },
      { path: [[200, 400], [300, 300], [400, 330]], arrow: true },
      { sprite: ['props.trollusk', 1], x: 420, y: 300, h: 40 },
      { sprite: ['props.trollusk', 3], x: 520, y: 250, h: 40 },
    ],
  },
  {
    text: 'When the eye shows, duck into a bush, or freeze far off behind your twig.',
    scene: 'scenes/trollusk', crop: [300, 380, 1280, 720],
    items: [
      { cast: 3, x: 500, y: 300, h: 180 },
      { sprite: ['props.trollusk', 9], x: 500, y: 140, h: 80 },
      { sprite: ['props.trollusk', 5], x: 200, y: 440, h: 130 },
      { creature: 'trollusk', anim: 'duck', x: 200, y: 430, h: 110 },
      { ring: [200, 390, 90] },
    ],
  },
  {
    text: 'Reach the mailbox before the mailman and pull the letter out.',
    scene: 'scenes/trollusk', crop: [640, 380, 1280, 720],
    items: [
      { cast: 7, x: 140, y: 250, h: 90, flip: true },
      { creature: 'trollusk', anim: 'grab', x: 360, y: 440, h: 160 },
      { sprite: ['props.trollusk', 7], x: 500, y: 440, h: 180 },
      { word: 'Got it!', x: 480, y: 150, size: 44 },
    ],
  },
];

// ---------- the autopilot ----------
//
// Plays like a careful child: tiptoes right, scurries only in the open wood
// and away from the dog, hops at ledges and at stamps overhead, waits outside
// a lookout's stretch while she is looking, ducks into the nearest cover when
// caught inside it (or freezes if far from her), waits for the sprinkler to
// sweep past, and pulls the letter out at the mailbox.
export function autopilot(board) {
  const { b, pl, look, spr, solids, stamps } = board;
  const a = board._auto || (board._auto = { hold: 0, wasAction: false, waitT: 0 });
  const inp = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };
  const press = (frames = 7) => { a.hold = Math.max(a.hold, frames); };
  const finish = () => {
    if (a.hold > 0) { a.hold--; inp.action = true; }
    inp.actionPressed = inp.action && !a.wasAction;
    inp.actionReleased = !inp.action && a.wasAction;
    a.wasAction = inp.action;
    return inp;
  };
  if (board.done) return finish();
  if (pl.mode === 'shoo' || pl.mode === 'soaked' || pl.mode === 'climb') return finish();
  if (pl.mode === 'hang') { inp.y = -1; inp.x = pl.hangSide; return finish(); }
  const px = b.x;
  if (px >= MAILBOX.x - 110) {
    // Stop at the mailbox, let go of Action, then press it to pull the letter out.
    if (board.atMailbox() && !a.wasAction && a.hold === 0) press(2);
    return finish();
  }

  // Danger: a lookout warning or looking (or about to) over a stretch we are in or about to enter.
  const over = (L) => px + 240 > L.zone[0] && px < L.zone[1] + 40;
  const soon = (L) => L.state === 'ready' || (L.state === 'rest' && L.restFor - L.t < 1.0);
  const threat = look.find((L) => over(L) && (L.state === 'warn' || L.state === 'look'));
  const coming = threat || look.find((L) => over(L) && soon(L));
  if (coming && b.onGround) {
    if (pl.hidden) { inp.y = 1; return finish(); }
    if (px < coming.zone[0]) return finish(); // wait outside her stretch
    const nearCover = COVER.filter((k) => Math.abs(k.x - px) < 420 && k.x >= coming.zone[0] - 50).sort((p, q) => Math.abs(p.x - px) - Math.abs(q.x - px))[0];
    if (nearCover) {
      if (Math.abs(nearCover.x - px) < 30) { inp.y = 1; return finish(); }
      inp.x = Math.sign(nearCover.x - px);
      inp.sprint = !!threat && Math.abs(px - DOG.x) > P.noiseReach + 100;
      return finish();
    }
    if (threat && Math.abs(px - threat.x) > 640) return finish(); // freeze, far off
    inp.x = 1;
    return finish();
  }
  // The sprinkler: on the lane near it, wait until the jet is landing behind us.
  if (b.onGround && b.y >= G - 2 && px > SPRINKLER.x - 430 && px < SPRINKLER.x + 420) {
    const lx = spr.land;
    const ahead = lx - px;
    if ((ahead > -120 && ahead < 260) || (ahead >= 260 && spr.dir < 0 && ahead < 420)) return finish();
  }
  inp.x = 1;
  // A hop: a ledge just ahead, or a stamp overhead, or the end of the fence we walk.
  if (b.onGround) {
    const front = px + b.w / 2;
    for (const s of solids) {
      if (!s.grab && !s.oneWay) continue;
      if (s.kind === 'lid' || s.step) continue;
      const gap = s.x - front;
      if (gap > -30 && gap < 50 + Math.abs(b.vx) * 0.2 && s.y < b.y - 60 && s.y > b.y - 320) press(s.y < b.y - 150 ? 9 : 5);
    }
    if (b.ground && b.ground.kind === 'fence' && b.ground.x + b.ground.w - front < 50) {
      const next = solids.find((s) => s.oneWay && s.x > front && s.x - front < 320 && s.kind !== 'lid');
      if (next) press(9);
    }
    for (const p of stamps.items) {
      if (p.got) continue;
      const dy = b.y - p.y;
      if (p.x - px > 20 && p.x - px < 120 && dy > 150 && dy < 330) press(dy > 230 ? 9 : 5);
    }
  }
  // Scurry only where it is safe: the open wood, the fence run, and never near the dog or a lookout's stretch.
  const dogNear = Math.abs(px - DOG.x) < P.noiseReach + 260;
  const zoneAhead = look.some((L) => px + 700 > L.zone[0] && px < L.zone[1] + 100);
  const sprinklerNear = px > SPRINKLER.x - 600 && px < SPRINKLER.x + 300 && b.y >= G - 2;
  inp.sprint = !dogNear && !zoneAhead && !sprinklerNear && b.onGround && px > 300;
  return finish();
}

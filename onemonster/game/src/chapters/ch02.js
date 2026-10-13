// Chapter 2: the Letter-Eating Bombanat snatches the letter from the
// Stamp-Collecting Trollusk (design.md, chapters 2 and "Chases"). The Trollusk
// runs along the ground with the letter in his snout and ducks into the bushes
// (his hat always pokes out: there is no fooling the player, only the rule
// that a Trollusk in a bush can't be grabbed, he must be flushed). The Bombanat
// flies over the wood, dives to grab him, and hovers over his bush to flush
// him out. Stamps blow out of his bag when he scurries: snapping them up in
// the air is the bonus.
//
// chaseChapter here is the shared frame for a flier-over-ground chase, also
// used by chapter 8: the chase kit, the drawing order, the prompts that say
// what to press and when, the tug bar and the opening hint.

import { makeMover, makeChase, stepChase, aiHolder, aiSnatcher, snatchChance, dodgeChance, flushProgress, tugDrift } from '../chase.js';
import * as art from '../art.js';
import { staminaRing, breathBar, tugBar, drawCover, eventFx, makeFx, hintBand, chasePrompt } from '../chasedraw.js';
import { marker, letterTag } from '../prompt.js';
import { marksFor } from './index.js';

const HINT_TIME = 4; // seconds the opening band stays up

export function chaseChapter(env, opts) {
  const { W, H } = env;
  const total = opts.time + (env.gentle[0] ? 10 : 0);
  const bounds = opts.bounds;
  const cover = (opts.cover || []).map((k) => ({ rx: 150, ry: 50, shake: 0, ...k }));
  const obstacles = opts.obstacles || [];
  const s = makeMover({ ...opts.snatcher });
  const h = makeMover({ ...opts.holder });
  const chase = makeChase({ snatcher: s, holder: h, bounds, cover, obstacles, rng: env.rng, gentle: env.gentle });
  const sc = art.makeCreature(opts.snatcherId, s.x, s.y);
  const hc = art.makeCreature(opts.holderId, h.x, h.y);
  sc.sizeK = opts.snatcherSize ?? 1;
  hc.sizeK = opts.holderSize ?? 1;
  const fx = makeFx();
  const brain = {};
  let z = opts.flyHeight || 0;
  let t = 0;
  const extras = [];

  const self = {
    focus: () => [sc, hc], // what the camera frames: the snatcher, then the holder
    time: total,
    done: false,
    outcome: null,
    bonus: 0, // stamps snapped up
    chase, s, h, sc, hc, fx, extras,
    get z() { return z; },
    update(dt, inS, inH) {
      t += dt;
      fx.update(dt);
      if (self.done) {
        opts.outro?.(self, dt);
        return;
      }
      self.time = Math.max(0, self.time - dt);
      const hin = env.versus ? inH : aiHolder(chase, brain, env.skill, dt);
      const ev = stepChase(chase, opts.mapS ? opts.mapS(inS) : inS, hin, dt);
      tugDrift(chase, dt); // no tug drags on: the side ahead gains ground
      eventFx(env, ev, fx);
      for (const k of cover) {
        if (h.inCover === k && h.rustle > 0.2) k.shake = Math.max(k.shake, h.rustle);
        k.shake = Math.max(0, k.shake - dt * 1.5);
      }
      // The flier's height: cruise, dive, hover low to flush.
      if (opts.flyHeight) {
        let target = opts.flyHeight;
        if (s.mode === 'lunge') target = 20;
        else if (s.mode === 'grabbing') target = 50;
        else if (s.mode === 'stumble') target = 70;
        else if (s.mode === 'dazed') target = 120;
        else if (chase.flushT > 0) target = 130;
        z += (target - z) * (1 - Math.exp(-(s.mode === 'lunge' ? 16 : 4) * dt));
      }
      opts.update?.(self, dt, ev);
      sc.x = s.x; sc.y = s.y; sc.z = z;
      hc.x = h.x; hc.y = h.y;
      art.animate(sc, dt, s.vx, s.vy);
      art.animate(hc, dt, h.vx, h.vy);
      opts.animS(sc, s, chase, dt);
      opts.animH(hc, h, chase, dt);
      for (const e of ev) {
        if (e.type === 'grab') { art.kick(hc, 0.4); art.kick(sc, 0.3); }
        if (e.type === 'free') { art.kick(hc, -0.5); art.kick(sc, 0.5); }
        if (e.type === 'stumble') art.kick(sc, 0.35);
        if (e.type === 'flushed') art.kick(hc, -0.4);
      }
      if (chase.done) {
        self.done = true;
        self.outcome = 'snatched';
      } else if (self.time <= 0) {
        self.done = true;
        self.outcome = 'kept';
      }
    },
    draw(g, tt) {
      art.drawScene(g, opts.scene, W, H);
      opts.drawBack?.(g, self, tt);
      const chance = snatchChance(chase);
      // Everything on the ground, back to front. A hidden Trollusk is drawn
      // just behind his bush, so his hat pokes out of the top of it.
      const things = [
        ...cover.map((k) => ({ y: k.y + k.ry * 0.9, draw: () => drawCover(g, k, tt) })),
        ...obstacles.map((o) => ({ y: o.y + o.ry, draw: () => o.draw?.(g) })),
        ...extras.map((e) => ({ y: e.y, draw: () => e.draw(g, tt) })),
        // Hidden: just behind his bush (hat poking out). Rustling through a
        // bush: in front of it, so he never vanishes behind the leaves.
        { y: h.hidden && h.inCover ? h.inCover.y - h.inCover.ry - 1 : h.inCover ? h.inCover.y + h.inCover.ry * 0.9 + 1 : h.y, draw: () => {
          if (h.hidden && h.inCover && !self.done) {
            const k = h.inCover;
            const y0 = hc.y, x0 = hc.x;
            hc.x = k.x; hc.y = k.y + k.ry * 0.9 - k.h + 92 * hc.sizeK;
            art.drawCreature(g, hc, tt, { reduceMotion: env.reduceMotion, shadow: false });
            hc.x = x0; hc.y = y0;
            return;
          }
          staminaRing(g, h, h.x, h.y, 70, '#f2c53d');
          art.drawCreature(g, hc, tt, { reduceMotion: env.reduceMotion });
        } },
        { y: s.y + (opts.flyHeight ? 2000 : 0), draw: () => {
          if (opts.flyHeight) {
            // The flier's shadow on the ground (where he is, for the chase), then the flier above it.
            g.save(); g.globalAlpha = 0.3; g.fillStyle = '#2b1d14';
            g.beginPath(); g.ellipse(s.x, s.y, 120 - z * 0.15, 30 - z * 0.04, 0, 0, Math.PI * 2); g.fill(); g.restore();
          } else staminaRing(g, s, s.x, s.y, 70, '#c9b8d4');
          art.drawCreature(g, sc, tt, { reduceMotion: env.reduceMotion, shadow: !opts.flyHeight });
          if (opts.flyHeight && !self.done) breathBar(g, s, s.x, s.y - z + 150 * sc.sizeK * 0.5 + 30);
        } },
      ].sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      opts.drawFront?.(g, self, tt);
      if (!self.done) {
        const top = (m, c) => m.y - (m === s ? z : 0) - 170 * c.sizeK;
        // The letter is with the holder: a tag at his snout, or on his bush.
        if (h.hidden && h.inCover) {
          const k = h.inCover;
          const p = flushProgress(chase);
          letterTag(g, k.x + 90, k.y + k.ry * 0.9 - k.h + 20, { t: tt });
          if (p > 0) flushRing(g, k.x, k.y + k.ry * 0.9 - k.h - 60, p, tt);
          else marker(g, k.x, k.y + k.ry * 0.9 - k.h - 70, { t: tt, label: 'Hover here!' });
        } else if (!chase.tug) {
          letterTag(g, h.x + h.facing * 80 * hc.sizeK, h.y - 190 * hc.sizeK, { t: tt, r: 56 });
        }
        // What to press, and when.
        if (chase.tug) {
          tugBar(g, chase, (s.x + h.x) / 2, Math.min(s.y - z, h.y) - 260 * hc.sizeK, opts.tugLabels || ['Snatch!', 'Break free!'], { kind: env.inputKind, t: tt, sides: env.versus ? [0, 1] : [0], W });
        } else {
          if (chance.kind === 'grab') chasePrompt(g, env, s.x, top(s, sc), 'Snatch!', { t: tt, pulse: 1 });
          else if (chance.kind === 'lunge' && !(opts.diveBlocked?.(self))) chasePrompt(g, env, s.x, top(s, sc), chance.open ? 'Dive now!' : 'Dive!', { t: tt, pulse: chance.open ? 1 : 0.3 });
          if (env.versus && dodgeChance(chase)) chasePrompt(g, env, h.x, top(h, hc), 'Dodge!', { t: tt, pulse: 1, side: 1 });
        }
      }
      fx.draw(g);
      if (t < HINT_TIME && !self.done) hintBand(g, opts.hint, W, { y: 215, sub: opts.hintSub });
    },
    marks() {
      const elapsed = total - self.time;
      // Each stamp (up to three) is worth an eighth of the clock.
      return marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: elapsed / total, bonus: Math.min(3, self.bonus) * 0.5 });
    },
    hud: () => opts.hud?.(self) || '',
  };
  return self;
}

// The ring over a bush that fills while the Bombanat hovers over it.
function flushRing(g, x, y, p, t) {
  g.save();
  g.lineWidth = 12;
  g.strokeStyle = 'rgba(251,246,232,0.9)';
  g.beginPath(); g.arc(x, y, 44, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#c8443a';
  g.beginPath(); g.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); g.stroke();
  g.font = '800 30px Fraunces, Georgia, serif';
  g.textAlign = 'center';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(251,246,232,0.9)';
  g.strokeText('Flushing...', x, y - 64);
  g.fillStyle = '#33241a';
  g.fillText('Flushing...', x, y - 64);
  g.restore();
}

// Stamps that blow out of the Trollusk's bag when he scurries: they flutter up
// into the air, where the flying Bombanat snaps them up (by flying his shadow
// over them). Shared with chapter 8.
export function stampDrops(env, self, dt, { every = 2.2, life = 9, onMunch = null } = {}) {
  const { h, s } = self;
  self.dropT = self.dropT ?? 2;
  if (h.sprinting) self.dropT -= dt;
  if (self.dropT <= 0) {
    self.dropT = every;
    const st = { x: h.x - h.facing * 40, y: h.y + 4, z: 0, item: 1 + Math.floor(env.rng() * 4), t: 0, stamp: true };
    st.draw = (g, tt) => {
      g.save(); g.globalAlpha = 0.2; g.fillStyle = '#2b1d14';
      g.beginPath(); g.ellipse(st.x, st.y, 26, 8, 0, 0, Math.PI * 2); g.fill(); g.restore();
      art.drawSprite(g, art.prop('trollusk', st.item), st.x, st.y - st.z - Math.abs(Math.sin(tt * 3 + st.x)) * 10, { height: 80, rot: Math.sin(tt * 2 + st.x) * 0.3 });
    };
    self.extras.push(st);
  }
  for (let i = self.extras.length - 1; i >= 0; i--) {
    const st = self.extras[i];
    if (!st.stamp) continue;
    st.t += dt;
    st.z = Math.min(190, st.z + 260 * dt); // blown up into the air
    if (Math.hypot(st.x - s.x, st.y - s.y) < 110) {
      self.extras.splice(i, 1);
      self.bonus = Math.min(9, self.bonus + 1);
      env.sfx('snap');
      self.fx.say('Stamp!', st.x, st.y - st.z - 60);
      art.kick(self.sc, 0.3);
    } else if (onMunch && onMunch(st)) {
      self.extras.splice(i, 1);
      env.sfx('munch');
      self.fx.say('Munch!', st.x, st.y - st.z - 60);
    } else if (st.t > life) self.extras.splice(i, 1);
  }
}

// ---------- the creatures' animation in a chase ----------
// Action poses change at once; the looping ones hold for a moment and switch
// on a band of speeds (hysteresis), so nothing flickers at a threshold.

function want(c, name, dt, { min = 0.3, force = false } = {}) {
  c.holdT = Math.max(0, (c.holdT || 0) - dt);
  if (c.anim === name) return;
  if (!force && c.holdT > 0) return;
  art.setAnim(c, name);
  c.holdT = min;
}

export function animTrollusk(c, m, chase, dt = 1 / 60) {
  const sp = Math.hypot(m.vx, m.vy);
  if (m.mode === 'grabbed') return want(c, 'jolt', dt, { force: true });
  if (m.hidden) return want(c, 'duck', dt, { force: true });
  if (m.mode === 'dodge') return want(c, 'skid', dt, { force: true, min: 0.4 });
  if (m.mode === 'stumble' || m.mode === 'dazed') return want(c, 'scuttle', dt, { force: true });
  if (m.winded > 0) return want(c, sp > 60 ? 'sneak' : 'wail', dt);
  const fast = c.anim === 'run' ? sp > 260 : sp > 340;
  const moving = c.anim === 'idle' ? sp > 60 : sp > 30;
  want(c, fast ? 'run' : moving ? 'sneak' : 'idle', dt);
}

export function animBombanat(c, m, chase, dt = 1 / 60) {
  const sp = Math.hypot(m.vx, m.vy);
  if (m.mode === 'lunge') return want(c, 'dive', dt, { force: true });
  if (m.mode === 'grabbing') return want(c, 'snap', dt, { force: true });
  if (m.mode === 'stumble') return want(c, 'swoop', dt, { force: true, min: 0.5 });
  if (m.mode === 'dazed' || m.winded > 0) return want(c, 'tumble', dt, { force: true, min: 0.5 });
  if (m.sprinting || chase.flushT > 0) return want(c, 'flap', dt, { min: 0.5 });
  const slow = c.anim === 'flap' ? sp < 200 : sp < 110;
  want(c, slow ? 'flap' : 'glide', dt, { min: 0.5 });
}

// ---------- chapter 2 ----------

export default function create(env) {
  art.preload(['props.trollusk', 'trollusk.poses', 'bombanat.poses']);
  return chaseChapter(env, {
    time: 45,
    scene: 'scenes/bombanat',
    snatcherId: 'bombanat',
    holderId: 'trollusk',
    snatcherSize: 1.35,
    holderSize: 1.15,
    flyHeight: 250,
    bounds: { x0: 140, x1: 1780, y0: 790, y1: 1040 },
    snatcher: { x: 300, y: 850, speed: 320, sprint: 540, accel: 900, flies: true, canHide: false, lungeRange: 440, lungeSpeed: 1100, lungeTime: 0.34, radius: 50 },
    holder: { x: 1250, y: 950, speed: 265, sprint: 465, accel: 2600, radius: 44 },
    cover: [
      { x: 400, y: 1000, sheet: 'trollusk', item: 5, h: 260, rx: 160, ry: 50 },
      { x: 1280, y: 870, sheet: 'trollusk', item: 5, h: 250, rx: 155, ry: 48 },
      { x: 1640, y: 1010, sheet: 'trollusk', item: 5, h: 260, rx: 160, ry: 50 },
      { x: 880, y: 810, sheet: 'trollusk', item: 6, h: 150, rx: 180, ry: 40 },
    ],
    hint: env.versus ? 'Bombanat: dive and snatch the letter!' : 'Dive on the Trollusk and snatch the letter!',
    hintSub: env.versus ? 'Trollusk: dodge, hide in a bush, and break free!' : 'In a bush he is safe: hover over it to flush him out.',
    animS: animBombanat,
    animH: animTrollusk,
    update(self, dt) { stampDrops(env, self, dt); },
    outro(self, dt) {
      // The Bombanat flies off with the letter (or the Trollusk gabbles away).
      if (self.outcome === 'snatched') {
        self.s.x += 560 * dt; self.sc.x = self.s.x; self.sc.z = (self.sc.z || 0) + 300 * dt;
        art.setAnim(self.sc, 'glide');
        art.animate(self.sc, dt, 560, 0);
        art.setAnim(self.hc, 'wail'); art.animate(self.hc, dt);
      } else {
        art.setAnim(self.hc, 'celebrate');
        art.animate(self.hc, dt);
      }
    },
    hud: (self) => `Stamps ${self.bonus}`,
  });
}

// A competent player's input for the next frame (scripts/chapter-check.mjs
// and the tests): the kit's own snatcher, which shadows him, dives when he is
// open, waits over his bush to flush him, and mashes in a tug.
export function autopilot(ch) {
  ch._bot = ch._bot || {};
  return aiSnatcher(ch.chase, ch._bot, 0.7, 1 / 20);
}

// ---------- the how-to-play page (image-requests.md, OM-H2a..c) ----------

const CROP = [300, 420, 1100, 620];
export const HOWTO = [
  {
    text: 'Fly over the wood. The Trollusk runs below with the letter in his snout.',
    scene: 'scenes/bombanat', crop: CROP,
    items: [
      { sprite: ['props.trollusk', 5], x: 560, y: 470, h: 140 },
      { creature: 'trollusk', anim: 'run', x: 380, y: 465, h: 190, flip: true },
      { draw: (g, t) => letterTag(g, 300, 360, { t, r: 40 }) },
      { creature: 'bombanat', anim: 'glide', x: 300, y: 140, h: 170, flip: true, shadow: false },
      { path: [[560, 100], [460, 80], [330, 100]], arrow: true },
    ],
  },
  {
    text: 'In a bush he is safe. Hover over it until he bolts out.',
    scene: 'scenes/bombanat', crop: CROP,
    items: [
      { creature: 'trollusk', anim: 'duck', x: 330, y: 330, h: 170, shadow: false },
      { sprite: ['props.trollusk', 5], x: 330, y: 470, h: 200 },
      { draw: (g, t) => flushRing(g, 330, 200, 0.5 + Math.sin(t * 2) * 0.3, t) },
      { creature: 'bombanat', anim: 'flap', x: 330, y: 90, h: 150, shadow: false },
    ],
  },
  {
    text: 'Dive! Press Action when he is in reach, then mash it to snatch the letter.',
    scene: 'scenes/bombanat', crop: CROP,
    items: [
      { creature: 'trollusk', anim: 'run', x: 430, y: 465, h: 180, flip: true },
      { creature: 'bombanat', anim: 'dive', x: 250, y: 220, h: 200, shadow: false },
      { path: [[150, 90], [230, 160], [340, 330]], arrow: true },
      { word: 'SNAP!', x: 510, y: 250, size: 54 },
    ],
  },
];

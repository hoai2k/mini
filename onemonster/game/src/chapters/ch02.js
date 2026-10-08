// Chapter 2: the Letter-Eating Bombanat snatches the letter from the
// Stamp-Collecting Trollusk (design.md, chapters 2 and "Chases"). The Trollusk
// runs on the ground with the letter, hiding in the bushes; the Bombanat flies
// over the wood, dives to lunge, and hovers over a bush to flush him out.
// Stamps drop from his bag when he scurries: snapping them up is the bonus.

import { makeMover, makeChase, stepChase, aiHolder } from '../chase.js';
import * as art from '../art.js';
import { staminaRing, tugBar, drawCover, eventFx, makeFx } from '../chasedraw.js';
import { marksFor } from './index.js';

export function chaseChapter(env, opts) {
  const { W, H } = env;
  const total = opts.time + (env.gentle[0] ? 10 : 0);
  const bounds = opts.bounds;
  const cover = opts.cover.map((k) => ({ rx: 95, ry: 40, shake: 0, ...k }));
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
  let windT = 1.5;
  const extras = [];

  const self = {
    time: total,
    done: false,
    outcome: null,
    bonus: 0,
    chase, s, h, sc, hc, fx, extras,
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
      eventFx(env, ev, fx);
      // The wind shakes a bush now and then, so a shaking bush is only a clue.
      windT -= dt;
      if (windT <= 0) {
        windT = 1.2 + env.rng() * 2.5;
        const k = cover[Math.floor(env.rng() * cover.length)];
        k.shake = 0.7;
        env.sfx('rustle');
      }
      for (const k of cover) {
        if (h.inCover === k && h.rustle > 0.2) k.shake = Math.max(k.shake, h.rustle);
        k.shake = Math.max(0, k.shake - dt * 1.5);
      }
      // The flier's height: cruise, dive, hover low to flush.
      if (opts.flyHeight) {
        let target = opts.flyHeight;
        if (s.mode === 'lunge') target = 25;
        else if (s.mode === 'grabbing') target = 40;
        else if (s.mode === 'stumble' || s.mode === 'dazed') target = 90;
        else if (chase.flushT > 0) target = 110;
        z += (target - z) * (1 - Math.exp(-(s.mode === 'lunge' ? 14 : 4) * dt));
      }
      opts.update?.(self, dt, ev);
      sc.x = s.x; sc.y = s.y; sc.z = z;
      hc.x = h.x; hc.y = h.y;
      art.animate(sc, dt, s.vx, s.vy);
      art.animate(hc, dt, h.vx, h.vy);
      opts.animS(sc, s, chase);
      opts.animH(hc, h, chase);
      if (ev.some((e) => e.type === 'grab')) art.kick(hc, 0.4);
      if (ev.some((e) => e.type === 'free')) art.kick(hc, -0.5);
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
      // Everything on the ground, back to front.
      const things = [
        ...cover.map((k) => ({ y: k.y + k.ry * 0.9, draw: () => drawCover(g, k, tt) })),
        ...obstacles.map((o) => ({ y: o.y + o.ry, draw: () => o.draw?.(g) })),
        ...extras.map((e) => ({ y: e.y, draw: () => e.draw(g, tt) })),
        { y: h.y, draw: () => {
          if (h.hidden) {
            // Hidden in the bush. Alone against the computer, his hat pops up
            // over it now and then: a fair clue for young players. In versus
            // nobody sees him.
            if (env.versus || (tt % 3.2) > 0.7) return;
            hc.z = 0;
            const z0 = hc.y;
            hc.y = h.y - (h.inCover?.h || 150) * 0.55;
            art.setAnim(hc, 'duck');
            art.drawCreature(g, hc, tt, { reduceMotion: env.reduceMotion, shadow: false });
            hc.y = z0;
            return;
          }
          staminaRing(g, h, h.x, h.y, 50, '#f2c53d');
          art.drawCreature(g, hc, tt, { reduceMotion: env.reduceMotion });
        } },
        { y: s.y + (opts.flyHeight ? 2000 : 0), draw: () => {
          if (opts.flyHeight) {
            // The flier's shadow on the ground, then the flier above it.
            g.save(); g.globalAlpha = 0.22; g.fillStyle = '#2b1d14';
            g.beginPath(); g.ellipse(s.x, s.y, 90 - z * 0.12, 22 - z * 0.03, 0, 0, Math.PI * 2); g.fill(); g.restore();
            staminaRing(g, s, s.x, s.y, 58, '#c9b8d4');
          } else staminaRing(g, s, s.x, s.y, 54, '#c9b8d4');
          art.drawCreature(g, sc, tt, { reduceMotion: env.reduceMotion, shadow: !opts.flyHeight });
        } },
      ].sort((a, b) => a.y - b.y);
      for (const th of things) th.draw();
      opts.drawFront?.(g, self, tt);
      if (chase.tug) tugBar(g, chase, (s.x + h.x) / 2, Math.min(s.y, h.y) - 330, ['Snatch!', 'Break free!']);
      fx.draw(g);
      if (t < 3 && !self.done) hint(g, opts.hint, W);
    },
    marks() {
      const elapsed = total - self.time;
      return marksFor({ snatched: self.outcome === 'snatched', spareFrac: self.time / total, heldFrac: elapsed / total, bonus: self.bonus });
    },
    hud: () => opts.hud?.(self) || '',
  };
  return self;
}

function hint(g, text, W) {
  if (!text) return;
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

// ---------- the creatures' animation in a chase ----------

export function animTrollusk(c, m) {
  const sp = Math.hypot(m.vx, m.vy);
  if (m.mode === 'grabbed') art.setAnim(c, 'jolt');
  else if (m.mode === 'dodge') art.setAnim(c, 'skid');
  else if (m.mode === 'stumble' || m.mode === 'dazed') art.setAnim(c, 'scuttle');
  else if (m.winded > 0) art.setAnim(c, sp > 40 ? 'sneak' : 'wail');
  else if (sp > 320) art.setAnim(c, 'run');
  else if (sp > 40) art.setAnim(c, 'sneak');
  else art.setAnim(c, 'idle');
}

export function animBombanat(c, m, chase) {
  const sp = Math.hypot(m.vx, m.vy);
  if (m.mode === 'lunge') art.setAnim(c, 'dive');
  else if (m.mode === 'grabbing') art.setAnim(c, 'snap');
  else if (m.mode === 'stumble' || m.mode === 'dazed') art.setAnim(c, 'stall');
  else if (m.winded > 0) art.setAnim(c, 'stall');
  else if (m.sprinting || sp < 120 || chase.flushT > 0) art.setAnim(c, 'flap');
  else art.setAnim(c, 'glide');
  const A = c.M.anims.flap;
  A.fps = m.sprinting ? 16 : 10;
}

// ---------- chapter 2 ----------

export default function create(env) {
  const props = [];
  let dropT = 2;
  return chaseChapter(env, {
    time: 45,
    scene: 'scenes/bombanat',
    snatcherId: 'bombanat',
    holderId: 'trollusk',
    snatcherSize: 0.95,
    holderSize: 0.85,
    flyHeight: 240,
    bounds: { x0: 120, x1: 1800, y0: 770, y1: 1030 },
    snatcher: { x: 260, y: 820, speed: 300, sprint: 520, accel: 900, flies: true, canHide: false, lungeRange: 460, lungeSpeed: 1000, radius: 44 },
    holder: { x: 1250, y: 930, speed: 265, sprint: 465, accel: 2600, radius: 40 },
    cover: [
      { x: 420, y: 850, sheet: 'trollusk', item: 5, h: 200 },
      { x: 860, y: 990, sheet: 'trollusk', item: 6, h: 120, rx: 110, ry: 36 },
      { x: 1180, y: 805, sheet: 'trollusk', item: 5, h: 190 },
      { x: 1600, y: 960, sheet: 'trollusk', item: 5, h: 210 },
      { x: 700, y: 795, sheet: 'trollusk', item: 6, h: 110, rx: 100, ry: 32 },
    ],
    obstacles: [
      { x: 1400, y: 870, rx: 55, ry: 26, hop: true, draw: (g) => art.drawSprite(g, art.prop('yalapappus', 1), 1400, 896, { height: 80 }) },
      { x: 560, y: 1000, rx: 60, ry: 26, hop: false, draw: (g) => art.drawSprite(g, art.prop('yalapappus', 2), 560, 1026, { height: 95 }) },
    ],
    hint: env.versus ? 'Bombanat: wear him out, then dive! · Trollusk: hide, dodge, break free!' : 'Wear him out, then dive! Hover over a bush to flush him out.',
    animS: animBombanat,
    animH: animTrollusk,
    update(self, dt) {
      const { h, s } = self;
      // Stamps fall from his bag when he scurries; the Bombanat snaps them up.
      if (h.sprinting) dropT -= dt;
      if (dropT <= 0) {
        dropT = 2.2;
        const st = { x: h.x - h.facing * 40, y: h.y + 4, item: 1 + Math.floor(env.rng() * 4), t: 0 };
        st.draw = (g, tt) => art.drawSprite(g, art.prop('trollusk', st.item), st.x, st.y - 8 - Math.abs(Math.sin(tt * 3 + st.x)) * 6, { height: 56, rot: Math.sin(tt * 2 + st.x) * 0.3 });
        self.extras.push(st);
        props.push(st);
      }
      for (let i = self.extras.length - 1; i >= 0; i--) {
        const st = self.extras[i];
        st.t += dt;
        if (Math.hypot(st.x - s.x, st.y - s.y) < 90) {
          self.extras.splice(i, 1);
          self.bonus = Math.min(4, self.bonus + 1);
          env.sfx('snap');
          self.fx.say('Stamp!', st.x, st.y - 80);
        } else if (st.t > 9) self.extras.splice(i, 1);
      }
    },
    outro(self, dt) {
      // The Bombanat flies off with the letter (or the Trollusk gabbles away).
      if (self.outcome === 'snatched') {
        self.s.x += 520 * dt; self.sc.x = self.s.x; self.sc.z = (self.sc.z || 0) + 260 * dt;
        art.setAnim(self.sc, 'flap');
        art.animate(self.sc, dt, 520, 0);
      } else {
        art.setAnim(self.hc, 'celebrate');
        art.animate(self.hc, dt);
      }
    },
    hud: (self) => `Stamps ${self.bonus}`,
  });
}

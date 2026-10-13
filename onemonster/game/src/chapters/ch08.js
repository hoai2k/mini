// Chapter 8: SNIP! The Letter-Eating Bombanat swoops on the running Trollusk
// again (design.md, chapter 8 and "Chases"): the chase of chapter 2, short and
// fast, out on the open ground at the edge of Nowhere with nowhere to hide,
// only rocks and a hole to run round. And the Yalapappus stomps along after
// the Trollusk on his own: if he catches him he holds him up (the moment for
// a diving Bombanat), and if the Bombanat comes down low near him he winds up
// and swats at it (WHAP! it tumbles). His reach is drawn on the ground.
//
// So the Trollusk wants the Yalapappus near enough to swat the Bombanat off,
// but not near enough to be grabbed; the Bombanat wants to dive while the
// Yalapappus has his paws full, and keep out of his reach otherwise.
//
// Bonus: the stamps that blow out of the Trollusk's bag when he scurries,
// snapped up before the Yalapappus munches them off the ground.

import * as art from '../art.js';
import { aiHolder, aiSnatcher, snatchChance } from '../chase.js';
import { marker, letterTag } from '../prompt.js';
import { chaseChapter, animBombanat, animTrollusk, stampDrops } from './ch02.js';

const REACH = 320; // how far the Yalapappus's swat reaches, on the ground
const WINDUP = 0.4; // seconds of warning before the swat lands
const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default function create(env) {
  art.preload(['yalapappus.poses', 'props.trollusk', 'props.yalapappus', 'trollusk.poses', 'bombanat.poses']);
  // The stomping Yalapappus: a plain AI pursuer, not part of the chase kit.
  const yal = {
    x: 200, y: 1000, vx: 0, vy: 0, facing: 1, speed: 170,
    state: 'stomp', T: 0, cool: 1.5, swatCool: 1.5, holdT: 0, hit: false, startled: 0,
    c: art.makeCreature('yalapappus', 200, 1000),
  };
  yal.c.sizeK = 1.25;
  yal.draw = (g, tt) => {
    if (yal.state === 'swat' && yal.T < 0.3) {
      // The paw's whoosh over his head.
      g.save(); g.strokeStyle = 'rgba(251,246,232,0.95)'; g.lineWidth = 14; g.lineCap = 'round';
      g.beginPath(); g.arc(yal.x + yal.facing * 40, yal.y - 300, 150, -Math.PI * 0.95, -Math.PI * 0.15); g.stroke(); g.restore();
    }
    art.drawCreature(g, yal.c, tt, { reduceMotion: env.reduceMotion });
  };
  let stomp = 0;
  const lowNow = (self) => self.s.mode === 'lunge' || self.s.mode === 'grabbing' || self.z < 150;

  // chaseChapter runs the holder's AI only outside versus; here the chapter
  // runs it itself (below), so the computer Trollusk minds the Yalapappus too.
  const ch = chaseChapter({ ...env, versus: true }, {
    time: 30,
    scene: 'scenes/yalapappus',
    snatcherId: 'bombanat',
    holderId: 'trollusk',
    snatcherSize: 1.35,
    holderSize: 1.15,
    flyHeight: 250,
    bounds: { x0: 140, x1: 1780, y0: 820, y1: 1040 },
    snatcher: { x: 1650, y: 850, speed: 310, sprint: 540, accel: 900, flies: true, canHide: false, lungeRange: 420, lungeSpeed: 1080, lungeTime: 0.34, lungeCooldown: 1.9, stumbleTime: 1.2, grabRange: 60, radius: 48, drain: 0.55, windedTime: 2.3 },
    holder: { x: 900, y: 940, speed: 295, sprint: 505, accel: 2600, radius: 44, regen: 0.2, canHide: false },
    // Open ground: nowhere to hide. Rocks the Trollusk runs round, a hole he hops.
    cover: [],
    obstacles: [
      { x: 560, y: 900, rx: 95, ry: 36, hop: false, draw: (g) => art.drawSprite(g, art.prop('yalapappus', 1), 560, 932, { height: 150 }) },
      { x: 1360, y: 1010, rx: 100, ry: 38, hop: false, draw: (g) => art.drawSprite(g, art.prop('yalapappus', 2), 1360, 1044, { height: 150 }) },
      { x: 1050, y: 990, rx: 90, ry: 26, hop: true, draw: (g) => { art.drawSprite(g, art.prop('yalapappus', 4), 1050, 985, { height: 70 }); art.drawSprite(g, art.prop('yalapappus', 3), 1050, 1030, { height: 70 }); } },
    ],
    hint: env.versus ? 'Bombanat: swoop and snip the letter!' : 'Swoop on the Trollusk and snip the letter!',
    hintSub: env.versus ? 'Trollusk: dodge, and mind the Yalapappus behind you!' : 'Dive when the Yalapappus holds him up. Keep out of his reach!',
    tugLabels: ['Snip!', 'Break free!'],
    animS: animBombanat,
    animH: animTrollusk,
    diveBlocked: (self) => yal.state !== 'hold' && near(yal, self.h) < REACH && yal.swatCool <= 0,
    update(self, dt, ev) {
      const { s, h, chase, fx } = self;
      if (ev.some((e) => e.type === 'grab') && yal.state === 'hold') {
        // The Bombanat took him off the Yalapappus: his paws are empty again.
        yal.state = 'stomp'; yal.cool = 1.5; yal.swatCool = 2;
      }
      yal.T += dt;
      yal.cool = Math.max(0, yal.cool - dt);
      yal.swatCool = Math.max(0, yal.swatCool - dt);
      const d = near(yal, h);
      if (yal.state === 'stomp') {
        // Trundle after the Trollusk.
        const dx = h.x - yal.x, dy = h.y - yal.y, dd = Math.hypot(dx, dy) || 1;
        const sp = yal.cool > 0 ? yal.speed * 0.6 : yal.speed;
        yal.vx += ((dx / dd) * sp - yal.vx) * Math.min(1, dt * 4);
        yal.vy += ((dy / dd) * sp * 0.75 - yal.vy) * Math.min(1, dt * 4);
        if (dd < 20) { yal.vx *= 0.5; yal.vy *= 0.5; }
        // Grab the Trollusk if he comes within reach (not mid-dodge).
        // (Not straight after a tug with the Bombanat: the flapping startles him.)
        if (chase.tug) yal.startled = 1.0;
        yal.startled = Math.max(0, yal.startled - dt);
        if (d < 95 && yal.cool <= 0 && yal.startled <= 0 && h.mode === 'move' && !chase.tug) {
          yal.state = 'hold'; yal.T = 0; yal.holdT = env.gentle[1] ? 1.0 : 1.4;
          h.mode = 'grabbed'; h.modeT = 0; h.vx = h.vy = 0;
          env.sfx('thump'); env.vibrate(70);
          fx.say('Got him!', yal.x, yal.y - 460);
          art.kick(self.hc, 0.4); art.kick(yal.c, 0.3);
        }
        // Wind up to swat at a Bombanat that comes down low within reach.
        if (lowNow(self) && near(yal, s) < REACH && yal.swatCool <= 0) {
          yal.state = 'windup'; yal.T = 0; yal.facing = Math.sign(s.x - yal.x) || yal.facing;
          env.sfx('shout');
          fx.say('Grrr!', yal.x, yal.y - 460);
        }
      } else if (yal.state === 'hold') {
        // He holds the Trollusk up; mashing Action wriggles out sooner.
        yal.vx = yal.vy = 0;
        h.x += (yal.x + yal.facing * 90 - h.x) * Math.min(1, dt * 10);
        h.y += (yal.y + 4 - h.y) * Math.min(1, dt * 10);
        const pressed = env.versus ? self.lastH?.actionPressed : h.st > 0.2 && env.rng() < dt * (3 + 4 * env.skill);
        if (pressed) { yal.holdT -= 0.13; art.kick(self.hc, 0.15); env.sfx('tug'); }
        yal.holdT -= dt;
        if (yal.holdT <= 0 && !chase.tug) {
          yal.state = 'stomp'; yal.cool = 2.6;
          if (h.mode === 'grabbed') { h.mode = 'move'; h.modeT = 0; h.vx = -yal.facing * 300; }
          fx.say('Wriggled out!', h.x, h.y - 300);
          env.sfx('free');
        }
      } else if (yal.state === 'windup') {
        yal.vx = yal.vy = 0;
        if (yal.T > WINDUP) { yal.state = 'swat'; yal.T = 0; yal.hit = false; }
      } else if (yal.state === 'swat') {
        yal.vx = yal.vy = 0;
        if (yal.T > 0.08 && !yal.hit) {
          yal.hit = true;
          if (lowNow(self) && near(yal, s) < REACH + 40) {
            // WHAP! The Bombanat tumbles; a tug in progress comes apart.
            if (chase.tug) { chase.tug = null; h.mode = 'move'; h.modeT = 0; }
            s.mode = 'stumble'; s.modeT = -0.4; s.vx = (Math.sign(s.x - yal.x) || 1) * 520; s.vy = 0;
            env.sfx('bonk'); env.vibrate(50);
            fx.say('WHAP!', s.x, s.y - self.z - 200);
            art.kick(self.sc, 0.6);
          } else env.sfx('swoosh');
        }
        if (yal.T > 0.6) { yal.state = 'stomp'; yal.swatCool = 2.4; }
      }
      yal.x = Math.max(140, Math.min(1780, yal.x + yal.vx * dt));
      yal.y = Math.max(820, Math.min(1040, yal.y + yal.vy * dt));
      // Stomp, stomp.
      stomp += Math.hypot(yal.vx, yal.vy) * dt;
      if (stomp > 160) { stomp = 0; env.sfx('step'); art.kick(yal.c, 0.12); }
      const c = yal.c;
      c.x = yal.x; c.y = yal.y;
      art.animate(c, dt, yal.vx, yal.vy);
      if (Math.abs(yal.vx) > 15) yal.facing = Math.sign(yal.vx);
      c.facing = yal.facing;
      const pose = yal.state === 'hold' ? 'shout' : yal.state === 'windup' ? 'shout' : yal.state === 'swat' ? 'hop' : yal.cool > 0 ? 'wail' : 'trundle';
      yal.poseHold = Math.max(0, (yal.poseHold || 0) - dt);
      if (pose !== c.anim && (yal.state !== 'stomp' || yal.poseHold <= 0)) { art.setAnim(c, pose); yal.poseHold = 0.4; }

      // Stamps blow out of his bag when he scurries; the Bombanat snaps them
      // up in the air, unless the Yalapappus munches them first.
      stampDrops(env, self, dt, { every: 2.0, life: 8, onMunch: (st) => st.z < 120 && near(st, yal) < 90 });
    },
    drawBack(g, self, tt) {
      // The Yalapappus's reach on the ground: a red ring while his paws are
      // ready, so a Bombanat knows where not to come down.
      if (yal.state === 'hold') return;
      const ready = yal.swatCool <= 0 && yal.state !== 'swat';
      g.save();
      g.strokeStyle = ready ? 'rgba(200,68,58,0.85)' : 'rgba(200,68,58,0.3)';
      g.lineWidth = ready ? 7 : 4;
      g.setLineDash([18, 14]); g.lineDashOffset = -tt * 50;
      g.beginPath(); g.ellipse(yal.x, yal.y, REACH, REACH * 0.36, 0, 0, Math.PI * 2); g.stroke();
      if (yal.state === 'windup') {
        g.setLineDash([]);
        g.fillStyle = 'rgba(200,68,58,0.18)';
        g.beginPath(); g.ellipse(yal.x, yal.y, REACH * (0.6 + yal.T), REACH * 0.36 * (0.6 + yal.T), 0, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    },
    drawFront(g, self, tt) {
      const chance = snatchChance(self.chase);
      if (yal.state === 'hold') {
        // The moment: a ring of alarm round the held Trollusk and a marker on him.
        g.save(); g.strokeStyle = '#c8443a'; g.lineWidth = 7; g.setLineDash([16, 12]); g.lineDashOffset = -tt * 60;
        g.beginPath(); g.ellipse(self.h.x, self.h.y, 120, 40, 0, 0, Math.PI * 2); g.stroke(); g.restore();
        if (!self.chase.tug && chance.kind !== 'grab') marker(g, self.h.x, self.h.y - 330, { t: tt, label: 'Dive now!' });
      } else if (yal.state === 'windup') {
        marker(g, yal.x, yal.y - 380, { t: tt, label: 'Swat!' });
      } else if (!self.chase.tug && chance.kind === 'lunge' && near(yal, self.h) < REACH && yal.swatCool <= 0) {
        // In reach of the paws: a dive here gets swatted.
        g.save();
        g.font = '800 30px Fraunces, Georgia, serif'; g.textAlign = 'center';
        g.lineWidth = 8; g.strokeStyle = 'rgba(251,246,232,0.9)';
        const x = self.s.x, y = self.s.y - self.z - 180 * self.sc.sizeK;
        g.strokeText('Too close to his paws!', x, y); g.fillStyle = '#c8443a'; g.fillText('Too close to his paws!', x, y);
        g.restore();
      }
    },
    outro(self, dt) {
      if (self.outcome === 'snatched') {
        // A smug glide off with the letter...
        self.s.x += 500 * dt; self.sc.x = self.s.x; self.sc.z = (self.sc.z || 0) + 240 * dt;
        art.setAnim(self.sc, 'glide');
        art.animate(self.sc, dt, 500, 0);
        art.setAnim(self.hc, 'wail'); art.animate(self.hc, dt);
      } else {
        art.setAnim(self.hc, 'celebrate');
        art.animate(self.hc, dt);
      }
      art.setAnim(yal.c, 'shout'); art.animate(yal.c, dt);
    },
    hud: (self) => `Stamps ${self.bonus}`,
  });
  ch.extras.push(yal);
  ch.yal = yal;
  ch.focus = () => [ch.sc, ch.hc, yal.c];
  // The Trollusk's input in versus, so the hold can count his wriggles.
  const update = ch.update;
  // Some Trollusks think of sheltering by the Yalapappus, some don't (more of
  // them the more skilled).
  const brain = { shelter: env.rng() < 0.4 + 0.5 * env.skill };
  ch.update = (dt, inS, inH) => {
    if (!env.versus) inH = ch.done ? {} : holderAI(dt);
    ch.lastH = inH;
    update(dt, inS, inH);
  };
  // The computer Trollusk: the kit's holder AI, plus giving the Yalapappus a
  // wide berth (but not so wide he can't swat a diving Bombanat).
  function holderAI(dt) {
    const { chase, h } = ch;
    const o = aiHolder(chase, brain, env.skill, dt);
    if (chase.tug || h.mode !== 'move') return o;
    const dx = h.x - yal.x, dy = h.y - yal.y, d = Math.hypot(dx, dy) || 1;
    if (o.actionPressed || yal.state === 'hold') return o;
    const s = chase.s;
    const bd = Math.hypot(h.x - s.x, h.y - s.y);
    const ready = yal.state === 'stomp' && yal.cool <= 0;
    let gx = 0, gy = 0;
    if (yal.state !== 'hold' && d < (ready ? 200 + 60 * env.skill : 150)) {
      // Too close to those paws: step away.
      gx = dx / d; gy = dy / d;
      if (d < 140 && h.st > 0.2) o.sprint = true;
    } else if (ready && d > 340 && bd < 520 && h.st < 0.7 && brain.shelter) {
      // Tired, with the Bombanat about: shelter near the Yalapappus (at a
      // respectful distance), where a dive gets swatted.
      gx = -dx / d; gy = -dy / d;
    } else if (Math.abs(h.x - 960) < 560) return o;
    // Never into a corner between the two of them: near a wall, bend back
    // toward the middle of the ground, dives or no dives.
    const edge = Math.max(0, (Math.abs(h.x - 960) - 500) / 320);
    gx -= Math.sign(h.x - 960) * 2.2 * edge;
    const m = Math.hypot(gx * 1.5 + (o.x || 0), gy * 1.5 + (o.y || 0)) || 1;
    o.x = (gx * 1.5 + (o.x || 0)) / m; o.y = (gy * 1.5 + (o.y || 0)) / m;
    return o;
  }
  return ch;
}

// A competent player's input for the next frame (scripts/chapter-check.mjs
// and the tests): shadow the Trollusk, keep breath in hand, dive when he is
// held or can't dodge, and keep out of the Yalapappus's reach.
export function autopilot(ch, dt = 1 / 20) {
  const b = ch._bot = ch._bot || {};
  const c = ch.chase, h = c.h, s = c.s, y = ch.yal;
  if (c.tug) return aiSnatcher(c, b, 0.7, dt);
  const dx = h.x - s.x, dy = h.y - s.y, d = Math.hypot(dx, dy) || 1;
  const o = { x: dx / d, y: dy / d, sprint: false, actionPressed: false };
  const inReach = near(y, h) < REACH && y.state !== 'hold' && y.swatCool <= 0;
  const open = y.state === 'hold' || h.winded > 0 || h.cool > 0.4;
  if (!inReach && s.cool <= 0 && s.winded <= 0 && d < s.lungeRange && (open || d < 200)) { o.actionPressed = true; return o; }
  if (d < s.grabRange + s.radius && !inReach) { o.actionPressed = true; return o; }
  if (d > 420 && s.st > 0.5) o.sprint = true;
  else if (d < 220 && !open) { o.x *= 0.15; o.y *= 0.15; }
  if (y.state !== 'hold' && near(y, s) < REACH + 60) { const ax = s.x - y.x, ay = s.y - y.y, ad = Math.hypot(ax, ay) || 1; o.x = ax / ad; o.y = (ay / ad) * 0.4; }
  return o;
}

// ---------- the how-to-play page (image-requests.md, OM-H8a..c) ----------

const CROP = [200, 440, 1300, 640];
export const HOWTO = [
  {
    text: 'Fly high over the open ground. The Trollusk runs with the letter, the Yalapappus stomping behind.',
    scene: 'scenes/yalapappus', crop: CROP,
    items: [
      { creature: 'yalapappus', anim: 'trundle', x: 130, y: 470, h: 200 },
      { creature: 'trollusk', anim: 'run', x: 400, y: 460, h: 140 },
      { draw: (g, t) => letterTag(g, 470, 380, { t, r: 36 }) },
      { creature: 'bombanat', anim: 'glide', x: 330, y: 120, h: 140, shadow: false },
      { path: [[150, 90], [260, 70], [400, 100]], arrow: true },
    ],
  },
  {
    text: 'Keep out of his reach! Near the Yalapappus, his big paw swats you down.',
    scene: 'scenes/yalapappus', crop: CROP,
    items: [
      { draw: (g, t) => { g.save(); g.strokeStyle = '#c8443a'; g.lineWidth = 5; g.setLineDash([12, 9]); g.lineDashOffset = -t * 40; g.beginPath(); g.ellipse(230, 460, 220, 70, 0, 0, Math.PI * 2); g.stroke(); g.restore(); } },
      { creature: 'yalapappus', anim: 'hop', x: 230, y: 440, h: 230 },
      { draw: (g) => { g.save(); g.strokeStyle = '#fbf6e8'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.arc(250, 230, 110, -Math.PI * 0.95, -Math.PI * 0.15); g.stroke(); g.restore(); } },
      { creature: 'bombanat', anim: 'stall', x: 480, y: 150, h: 150, flip: true, shadow: false },
      { word: 'WHAP!', x: 470, y: 60, size: 48 },
    ],
  },
  {
    text: 'Dive when he is held up or tired: press Action, then mash it. SNIP!',
    scene: 'scenes/yalapappus', crop: CROP,
    items: [
      { creature: 'trollusk', anim: 'run', x: 400, y: 460, h: 140, flip: true },
      { creature: 'bombanat', anim: 'dive', x: 240, y: 220, h: 190, shadow: false },
      { path: [[130, 90], [220, 160], [330, 330]], arrow: true },
      { word: 'SNIP!', x: 500, y: 240, size: 54 },
    ],
  },
];

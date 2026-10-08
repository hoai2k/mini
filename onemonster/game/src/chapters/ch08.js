// Chapter 8: SNIP! The Letter-Eating Bombanat swoops on the running Trollusk
// again (design.md, chapter 8 and "Chases"): the chase of chapter 2, short and
// fast, out on the open ground at the edge of Nowhere, with only a couple of
// rocks to duck behind. And the Yalapappus stomps along after the Trollusk on
// his own: if he catches him he holds him up (a gift for a diving Bombanat),
// and if the Bombanat swoops low near him he swats at it (it tumbles).
//
// So the Trollusk wants the Yalapappus near enough to swat the Bombanat off,
// but not near enough to be grabbed; the Bombanat wants to dive while the
// Yalapappus has his paws full, and keep clear of them otherwise.
//
// Bonus: the stamps that fall from the Trollusk's bag when he scurries,
// snapped up before the Yalapappus munches them.

import * as art from '../art.js';
import { aiHolder } from '../chase.js';
import { chaseChapter, animBombanat, animTrollusk } from './ch02.js';
import { tugTiebreak, near } from './ch07.js';

export default function create(env) {
  art.preload(['yalapappus.poses', 'yalapappus.swaps', 'props.trollusk', 'props.yalapappus', 'trollusk.poses', 'bombanat.poses']);
  // The stomping Yalapappus: a plain AI pursuer, not part of the chase kit.
  const yal = {
    x: 170, y: 1000, vx: 0, vy: 0, facing: 1, speed: 160,
    state: 'stomp', T: 0, cool: 1.5, swatCool: 0, holdT: 0,
    c: art.makeCreature('yalapappus', 170, 1000),
  };
  yal.c.sizeK = 0.9;
  yal.draw = (g, tt) => {
    if (yal.state === 'swat' && yal.T < 0.25) {
      // A paw-sized whoosh over his head.
      g.save(); g.strokeStyle = 'rgba(248,241,224,0.9)'; g.lineWidth = 10; g.lineCap = 'round';
      g.beginPath(); g.arc(yal.x + yal.facing * 30, yal.y - 230, 110, -Math.PI * 0.9, -Math.PI * 0.2); g.stroke(); g.restore();
    }
    art.drawCreature(g, yal.c, tt, { reduceMotion: env.reduceMotion });
  };
  let dropT = 2;
  let stomp = 0;

  // chaseChapter runs the holder's AI only outside versus; here the chapter
  // runs it itself (below), so the computer Trollusk minds the Yalapappus too.
  const ch = chaseChapter({ ...env, versus: true }, {
    time: 30,
    scene: 'scenes/yalapappus',
    snatcherId: 'bombanat',
    holderId: 'trollusk',
    snatcherSize: 0.95,
    holderSize: 0.82,
    flyHeight: 230,
    bounds: { x0: 130, x1: 1790, y0: 815, y1: 1040 },
    snatcher: { x: 1650, y: 840, speed: 290, sprint: 520, accel: 900, flies: true, canHide: false, lungeRange: 400, lungeSpeed: 980, lungeCooldown: 1.9, stumbleTime: 1.2, grabRange: 56, radius: 42, drain: 0.55, windedTime: 2.3 },
    holder: { x: 900, y: 930, speed: 295, sprint: 505, accel: 2600, radius: 40, regen: 0.2 },
    // Open ground: two rocks to crouch behind, nothing else.
    cover: [
      { x: 560, y: 880, sheet: 'yalapappus', item: 1, h: 130, rx: 82, ry: 34 },
      { x: 1330, y: 990, sheet: 'yalapappus', item: 2, h: 140, rx: 86, ry: 36 },
    ],
    obstacles: [
      { x: 1050, y: 1005, rx: 80, ry: 24, hop: true, draw: (g) => { art.drawSprite(g, art.prop('yalapappus', 4), 1050, 1000, { height: 60 }); art.drawSprite(g, art.prop('yalapappus', 3), 1050, 1044, { height: 60 }); } },
    ],
    hint: env.versus ? 'Bombanat: dive while he’s held! · Trollusk: dodge, and mind the Yalapappus!' : 'Dive on him! But keep clear of the Yalapappus’s paws.',
    animS: animBombanat,
    animH: animTrollusk,
    update(self, dt, ev) {
      const { s, h, chase, fx } = self;
      tugTiebreak(chase, dt);
      if (ev.some((e) => e.type === 'grab') && yal.state === 'hold') {
        // The Bombanat took him off the Yalapappus: his paws are empty again.
        yal.state = 'stomp'; yal.cool = 1.5; yal.swatCool = 2;
      }
      yal.T += dt;
      yal.cool = Math.max(0, yal.cool - dt);
      yal.swatCool = Math.max(0, yal.swatCool - dt);
      const d = near(yal, h);
      if (yal.state === 'stomp') {
        // Trundle after the Trollusk (or where he was last seen).
        const tx = h.hidden ? chase.lastSeen.x : h.x, ty = h.hidden ? chase.lastSeen.y : h.y;
        const dx = tx - yal.x, dy = ty - yal.y, dd = Math.hypot(dx, dy) || 1;
        const sp = yal.cool > 0 ? yal.speed * 0.6 : yal.speed;
        yal.vx += ((dx / dd) * sp - yal.vx) * Math.min(1, dt * 4);
        yal.vy += ((dy / dd) * sp * 0.75 - yal.vy) * Math.min(1, dt * 4);
        if (dd < 20) { yal.vx *= 0.5; yal.vy *= 0.5; }
        // Grab the Trollusk if he comes within reach (not mid-dodge, not hidden).
        // (Not straight after a tug with the Bombanat: the flapping startles him.)
        if (chase.tug) yal.startled = 1.0;
        yal.startled = Math.max(0, (yal.startled || 0) - dt);
        if (d < 85 && yal.cool <= 0 && yal.startled <= 0 && !h.hidden && h.mode === 'move' && !chase.tug) {
          yal.state = 'hold'; yal.T = 0; yal.holdT = env.gentle[1] ? 0.9 : 1.2;
          h.mode = 'grabbed'; h.modeT = 0; h.vx = h.vy = 0;
          env.sfx('thump'); env.vibrate(70);
          fx.say('Got him!', yal.x, yal.y - 280);
          art.kick(self.hc, 0.4);
        }
        // Swat at a Bombanat that comes down low near him.
        const low = s.mode === 'lunge' || s.mode === 'grabbing' || (self.sc.z ?? 300) < 140;
        if (low && near(yal, s) < 300 && yal.swatCool <= 0) { yal.state = 'swat'; yal.T = 0; yal.facing = Math.sign(s.x - yal.x) || yal.facing; }
      } else if (yal.state === 'hold') {
        // He holds the Trollusk up; mashing Action wriggles out sooner.
        yal.vx = yal.vy = 0;
        h.x += (yal.x + yal.facing * 70 - h.x) * Math.min(1, dt * 10);
        h.y += (yal.y + 4 - h.y) * Math.min(1, dt * 10);
        const pressed = env.versus ? self.lastH?.actionPressed : h.st > 0.2 && env.rng() < dt * (3 + 4 * env.skill);
        if (pressed) { yal.holdT -= 0.13; art.kick(self.hc, 0.15); env.sfx('tug'); }
        yal.holdT -= dt;
        if (yal.holdT <= 0 && !chase.tug) {
          yal.state = 'stomp'; yal.cool = 2.6;
          if (h.mode === 'grabbed') { h.mode = 'move'; h.modeT = 0; h.vx = -yal.facing * 300; }
          fx.say('Wriggled out!', h.x, h.y - 220);
          env.sfx('free');
        }
      } else if (yal.state === 'swat') {
        yal.vx = yal.vy = 0;
        if (yal.T > 0.22 && !yal.hit) {
          yal.hit = true;
          const low = s.mode === 'lunge' || s.mode === 'grabbing' || (self.sc.z ?? 300) < 160;
          if (low && near(yal, s) < 350) {
            // WHAP! The Bombanat tumbles; a tug in progress comes apart.
            if (chase.tug) { chase.tug = null; h.mode = 'move'; h.modeT = 0; }
            s.mode = 'stumble'; s.modeT = -0.4; s.vx = (Math.sign(s.x - yal.x) || 1) * 500; s.vy = 0;
            env.sfx('bonk'); env.vibrate(50);
            fx.say('WHAP!', s.x, s.y - 300);
            art.kick(self.sc, 0.6);
          } else env.sfx('swoosh');
        }
        if (yal.T > 0.7) { yal.state = 'stomp'; yal.hit = false; yal.swatCool = 2.2; }
      }
      yal.x = Math.max(130, Math.min(1790, yal.x + yal.vx * dt));
      yal.y = Math.max(815, Math.min(1040, yal.y + yal.vy * dt));
      // Stomp, stomp.
      stomp += Math.hypot(yal.vx, yal.vy) * dt;
      if (stomp > 140) { stomp = 0; env.sfx('step'); }
      const c = yal.c;
      c.x = yal.x; c.y = yal.y;
      art.animate(c, dt, yal.vx, yal.vy);
      if (Math.abs(yal.vx) > 15) yal.facing = Math.sign(yal.vx);
      c.facing = yal.facing;
      art.setAnim(c, yal.state === 'hold' ? 'shout' : yal.state === 'swat' ? 'hop' : yal.cool > 0 ? 'wail' : Math.hypot(yal.vx, yal.vy) > 25 ? 'trundle' : 'idle');

      // Stamps fall from his bag when he scurries; the Bombanat snaps them up,
      // unless the Yalapappus munches them first.
      if (h.sprinting) dropT -= dt;
      if (dropT <= 0) {
        dropT = 2.0;
        const st = { x: h.x - h.facing * 40, y: h.y + 4, item: 1 + Math.floor(env.rng() * 4), t: 0, stamp: true };
        st.draw = (g, tt) => art.drawSprite(g, art.prop('trollusk', st.item), st.x, st.y - 8 - Math.abs(Math.sin(tt * 3 + st.x)) * 6, { height: 56, rot: Math.sin(tt * 2 + st.x) * 0.3 });
        self.extras.push(st);
      }
      for (let i = self.extras.length - 1; i >= 0; i--) {
        const st = self.extras[i];
        if (!st.stamp) continue;
        st.t += dt;
        if (Math.hypot(st.x - s.x, st.y - s.y) < 90) {
          self.extras.splice(i, 1);
          self.bonus = Math.min(4, self.bonus + 1);
          env.sfx('snap');
          fx.say('Stamp!', st.x, st.y - 80);
        } else if (Math.hypot(st.x - yal.x, st.y - yal.y) < 80) {
          self.extras.splice(i, 1);
          env.sfx('munch');
          fx.say('Munch!', st.x, st.y - 80);
        } else if (st.t > 8) self.extras.splice(i, 1);
      }
    },
    drawFront(g, self, tt) {
      // A ring of alarm round the Trollusk while the Yalapappus holds him up.
      if (yal.state === 'hold') {
        g.save(); g.strokeStyle = '#c8443a'; g.lineWidth = 6; g.setLineDash([14, 10]); g.lineDashOffset = -tt * 60;
        g.beginPath(); g.ellipse(self.h.x, self.h.y, 90, 30, 0, 0, Math.PI * 2); g.stroke(); g.restore();
      }
    },
    outro(self, dt) {
      if (self.outcome === 'snatched') {
        // A smug glide off with the letter...
        self.s.x += 480 * dt; self.sc.x = self.s.x; self.sc.z = (self.sc.z || 0) + 200 * dt;
        art.setAnim(self.sc, 'glide');
        art.animate(self.sc, dt, 480, 0);
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
    if (ready && d < 200 + 60 * env.skill) {
      // Too close to those paws: step away.
      gx = dx / d; gy = dy / d;
      if (d < 140 && h.st > 0.2) o.sprint = true;
    } else if (d > 340 && bd < 520 && h.st < 0.7 && brain.shelter) {
      // Tired, with the Bombanat about: shelter near the Yalapappus (at a
      // respectful distance), where a dive gets swatted.
      gx = -dx / d; gy = -dy / d;
    } else return o;
    const m = Math.hypot(gx * 1.5 + (o.x || 0), gy * 1.5 + (o.y || 0)) || 1;
    o.x = (gx * 1.5 + (o.x || 0)) / m; o.y = (gy * 1.5 + (o.y || 0)) / m;
    return o;
  }
  return ch;
}

// Key Crane: Lucky Dip.
//
// An old penny-arcade crane cabinet full of lost-property trinkets. The Key
// Crane hangs on a string from a trolley that runs along the brass rail at
// the top; its claws are the hook. Move the trolley left and right, then
// press the action to let the Crane down: it drops straight to the jumble
// and its claws close at the bottom. If they close on a prize's ring, the
// prize comes up with it; carry it to the chute on the left and it drops in
// (or press the action again to let it go). The string swings: moving the
// trolley sets the Crane swinging, and a swinging Crane misses the ring, so
// stop, let it settle (or time the swing), then drop. Swing too hard while
// carrying and the prize slips off. Rings get smaller as time goes on.
// Score: prizes in the chute; a golden pocket watch counts as three.

import { drawBird, drawSprite, scene, SHEETS, blob, poly, wash, ink, hatch, label, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  // lantern, birdcage, golden pocket watch, handbag, basket, school bell, kettle, alarm clock
  'sprites.keycranePrizes': [4, 2],
  // hanging on its string with its claws open; with them closed on a ring
  'sprites.keycraneHang': [2, 1],
  // startled: legs kicked apart, eye wide (a prize slips, or the claws close on nothing)
  'sprites.keycraneStartle': [1, 1],
});

const DURATION = 45;
const RAIL_Y = 118;
const PIVOT_Y = RAIL_Y + 26; // where the string leaves the trolley
const FLOOR = 812; // the cabinet's floor, where the prizes stand
const X_MIN = 150;
const X_MAX = 1470;
const CHUTE_X0 = 64;
const CHUTE_X1 = 320; // the chute's mouth, at the left
const CHUTE_Y = 520;
const PILE_X0 = 430; // the prizes lie between here and X_MAX
const SLOTS = [470, 600, 730, 860, 990, 1120, 1250, 1380];
const BIRD = 220; // the Crane's drawn size
const HANG = 0.6 * BIRD; // from where the string ties on to its claws
const L_TOP = 230; // string + bird at rest, pivot to claws
const L_MAX = FLOOR - PIVOT_Y - 4;
const GRAV = 1800; // px/s², for the swing
const DAMP = 3.0; // how quickly the swing dies down
const VMAX = 640; // trolley speed (slower with a prize)
const DOWN = 950;
const UP = 1000;
const SLIP = 0.42; // a carried prize slips off past this swing angle (radians)

// The prizes: drawn size and where the ring is.
const KINDS = {
  lantern: { w: 78, h: 112, col: '#c9a24a', i: 0 },
  cage: { w: 96, h: 120, col: '#b8a070', i: 1 },
  watch: { w: 76, h: 76, col: '#e2b83a', i: 2 },
  handbag: { w: 104, h: 76, col: PAL.mauve, i: 3 },
  basket: { w: 112, h: 70, col: PAL.wafer, i: 4 },
  bell: { w: 82, h: 92, col: '#c8a050', i: 5 },
  kettle: { w: 100, h: 84, col: PAL.slate, i: 6 },
  clock: { w: 86, h: 86, col: PAL.strawberry, i: 7 },
};
const PLAIN = ['lantern', 'cage', 'handbag', 'basket', 'bell', 'kettle', 'clock'];

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    x: 820, // the trolley
    v: 0,
    L: L_TOP, // pivot to claws
    th: 0, // the swing angle (0 straight down; + swings the claws right)
    om: 0,
    state: 'top', // 'top' | 'down' | 'grab' | 'up'
    stateT: 0,
    carry: null, // the prize in the claws
    prizes: [], // in the pile: { kind, x, y, vy, ringR, golden, falling }
    flying: [], // let go or slipped: { p, x, y, vx, vy, rot, chute }
    pops: [],
    dust: [],
    respawn: [],
    caught: 0,
    golden: 0,
    misses: 0,
    slips: 0,
    armed: false, // for the pointer: a drop waits for the release of a press made at rest
    claw: 0, // 0 open .. 1 closed
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  const ringNow = () => lerp(32, 17, progress());
  g.foot = () => [g.x + g.L * Math.sin(g.th), PIVOT_Y + g.L * Math.cos(g.th)];
  g.ring = (p) => [p.x, p.y - KINDS[p.kind].h - p.ringR * 0.75];
  g.tolerance = (p) => p.ringR * 0.85 + 4;

  function pop(text, x, y, color = INK, size = 44) {
    g.pops.push({ text, x, y, color, size, life: 1.2 });
  }

  function newPrize(slotX, fromAbove) {
    const golden = g.elapsed > 8 && rng() < 0.14;
    const kind = golden ? 'watch' : PLAIN[Math.floor(rng() * PLAIN.length)];
    const ringR = Math.round((golden ? 0.8 : 1) * ringNow() * (0.9 + rng() * 0.2));
    const x = slotX + (rng() - 0.5) * 30;
    return { kind, x, y: fromAbove ? -60 : FLOOR - rng() * 16, vy: 0, ringR, golden, falling: !!fromAbove, tilt: (rng() - 0.5) * 0.12 };
  }
  // The first jumble: six prizes, generous rings.
  const start = SLOTS.slice();
  for (let i = start.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [start[i], start[j]] = [start[j], start[i]];
  }
  for (const sx of start.slice(0, 6)) g.prizes.push(newPrize(sx, false));

  const freeSlot = () => {
    const free = SLOTS.filter((sx) => !g.prizes.some((p) => Math.abs(p.x - sx) < 70));
    return free.length ? free[Math.floor(rng() * free.length)] : null;
  };

  function score(p) {
    const n = p.golden ? 3 : 1;
    g.score += n;
    g.caught++;
    if (p.golden) g.golden++;
    pop(p.golden ? 'Golden!  +3' : '+1', (CHUTE_X0 + CHUTE_X1) / 2, CHUTE_Y - 90, p.golden ? '#b8862a' : PAL.magenta, p.golden ? 52 : 50);
    sfx(p.golden ? 'bloom' : 'right');
    env.vibrate?.(40);
    g.respawn.push(1.1);
  }

  // Let the carried prize go: it falls with the claws' swing.
  function letGo(slipped) {
    const p = g.carry;
    if (!p) return;
    g.carry = null;
    const [fx, fy] = g.foot();
    // the claws open: it keeps some of their swing
    const vx = (g.v + g.om * g.L * Math.cos(g.th)) * (slipped ? 0.8 : 0.35);
    g.flying.push({ p, x: fx, y: fy + KINDS[p.kind].h * 0.5 + p.ringR, vx, vy: -g.om * g.L * Math.sin(g.th) * 0.5, rot: g.th, spin: g.om * 0.6 });
    if (slipped) {
      g.slips++;
      g.startle = 0.7;
      pop('Slipped!', fx, fy + 40, PAL.brick, 40);
      sfx('bonk');
    }
  }

  function drop() {
    g.state = 'down';
    g.stateT = 0;
    g.claw = 0;
    sfx('tick');
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }
    g.stateT += dt;
    g.startle = Math.max(0, (g.startle || 0) - dt);

    // The trolley: free at the top, held still while the Crane is down.
    const atTop = g.state === 'top';
    let vt = 0;
    if (atTop) {
      const vmax = g.carry ? VMAX * 0.65 : VMAX;
      if (input.pointer.active) vt = clamp((input.pointer.x - g.x) * 6, -vmax, vmax);
      else vt = clamp(input.x, -1, 1) * vmax;
    }
    const v0 = g.v;
    g.v = atTop ? approach(g.v, vt, 6, dt) : approach(g.v, 0, 14, dt);
    g.x += g.v * dt;
    if (g.x < X_MIN || g.x > X_MAX) {
      g.x = clamp(g.x, X_MIN, X_MAX);
      g.v = 0;
    }
    const acc = (g.v - v0) / dt;

    // The action: drop, or let go of a carried prize. A pointer drops on
    // release, so a finger can drag to aim first.
    const pointer = input.kind === 'pointer' || input.pointer.active;
    let go = false;
    if (pointer) {
      if (input.actionPressed) g.armed = atTop;
      if (input.actionReleased && g.armed) {
        go = true;
        g.armed = false;
      }
    } else go = !!input.actionPressed;
    if (go && atTop) {
      if (g.carry) letGo(false);
      else if (g.foot()[0] > CHUTE_X1 + 60) drop();
    }

    // The winch.
    const L0 = g.L;
    if (g.state === 'down') {
      g.L = Math.min(L_MAX, g.L + DOWN * dt);
      const [fx, fy] = g.foot();
      const fy0 = PIVOT_Y + L0 * Math.cos(g.th);
      let stop = fy >= FLOOR - 6;
      // a ring under the claws: caught
      for (const p of g.prizes) {
        if (p.falling) continue;
        const [rx, ry] = g.ring(p);
        if (fy0 < ry && fy >= ry && Math.abs(fx - rx) < g.tolerance(p)) {
          g.carry = p;
          g.prizes = g.prizes.filter((q) => q !== p);
          g.L -= (fy - ry) / Math.max(0.3, Math.cos(g.th));
          stop = true;
          sfx('catch', { pitch: 5 });
          break;
        }
        // the top of a prize: the claws bump it and close on nothing
        const k = KINDS[p.kind];
        const top = p.y - k.h;
        if (fy0 < top && fy >= top && Math.abs(fx - p.x) < k.w / 2) {
          stop = true;
          g.L -= (fy - top) / Math.max(0.3, Math.cos(g.th));
          p.tilt += (fx < p.x ? 1 : -1) * 0.08;
          break;
        }
      }
      if (stop) {
        g.state = 'grab';
        g.stateT = 0;
        if (!g.carry) {
          g.misses++;
          g.startle = 0.5;
          sfx('miss');
          const [fx2, fy2] = g.foot();
          for (let i = 0; i < 6; i++) g.dust.push({ x: fx2 + (rng() - 0.5) * 40, y: fy2, vx: (rng() - 0.5) * 120, vy: -40 - rng() * 60, life: 0.5 });
        }
      }
    } else if (g.state === 'grab') {
      g.claw = Math.min(1, g.stateT / 0.18);
      if (g.stateT > 0.28) {
        g.state = 'up';
        g.stateT = 0;
      }
    } else if (g.state === 'up') {
      g.L = Math.max(L_TOP, g.L - (g.carry ? UP * 0.8 : UP) * dt);
      if (g.L <= L_TOP) {
        g.state = 'top';
        g.stateT = 0;
        if (!g.carry) g.claw = 0;
      }
    }
    const Ld = (g.L - L0) / dt;

    // The swing: a pendulum hung from a moving trolley, on a string that
    // lengthens and shortens.
    const al = (-GRAV * Math.sin(g.th) - acc * Math.cos(g.th) - 2 * Ld * g.om) / g.L - DAMP * g.om;
    g.om += al * dt;
    g.om = clamp(g.om, -6, 6);
    g.th += g.om * dt;
    g.th = clamp(g.th, -1.2, 1.2);

    // Carrying: over the chute it drops in; too wild a swing and it slips.
    if (g.carry) {
      g.claw = 1;
      const [fx] = g.foot();
      if (Math.abs(g.th) > SLIP) letGo(true);
      else if (g.state === 'top' && fx > CHUTE_X0 + 30 && fx < CHUTE_X1 - 40) letGo(false);
    }

    // Prizes in the air: into the chute, or back onto the pile.
    for (const f of g.flying) {
      f.vy += 1700 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.spin * dt;
      f.vx *= 1 - 0.6 * dt;
      if (f.x < 60) {
        // the cabinet's side wall
        f.x = 60;
        f.vx = Math.abs(f.vx) * 0.5;
      }
      if (f.x < CHUTE_X1 - 10 && f.y > CHUTE_Y) {
        f.dead = true;
        score(f.p);
      } else if (f.x >= CHUTE_X1 - 10 && f.x <= CHUTE_X1 + 30 && f.y > CHUTE_Y - 10 && f.y < CHUTE_Y + 40) {
        // hit the chute's rim: bounce out onto the pile side
        f.vx = Math.abs(f.vx) * 0.5 + 120;
        f.vy = -Math.abs(f.vy) * 0.4;
        f.y = CHUTE_Y - 12;
      } else if (f.y >= FLOOR) {
        f.dead = true;
        const p = f.p;
        p.x = clamp(f.x, PILE_X0, X_MAX - 30);
        // settle beside the others
        for (let k = 0; k < 6; k++) {
          const o = g.prizes.find((q) => Math.abs(q.x - p.x) < 90);
          if (!o) break;
          p.x = clamp(p.x + (p.x >= o.x ? 1 : -1) * 70, PILE_X0, X_MAX - 30);
        }
        p.y = FLOOR;
        p.falling = false;
        p.tilt = (rng() - 0.5) * 0.2;
        g.prizes.push(p);
        sfx('plop');
        g.misses++;
      }
    }
    g.flying = g.flying.filter((f) => !f.dead);

    // New prizes tumble in from above.
    for (let i = g.respawn.length - 1; i >= 0; i--) {
      g.respawn[i] -= dt;
      if (g.respawn[i] <= 0) {
        g.respawn.splice(i, 1);
        const sx = freeSlot();
        if (sx !== null) g.prizes.push(newPrize(sx, true));
      }
    }
    for (const p of g.prizes) {
      if (!p.falling) continue;
      p.vy += 1700 * dt;
      p.y += p.vy * dt;
      if (p.y >= FLOOR) {
        p.y = FLOOR;
        p.falling = false;
        sfx('plop');
      }
    }

    for (const d of g.dust) {
      d.vy += 300 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
    }
    g.dust = g.dust.filter((d) => d.life > 0);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Prizes ${g.score}`;
  g.summary = () => {
    const lines = [`${g.caught} prize${g.caught === 1 ? '' : 's'} down the chute${g.golden ? `, ${g.golden} of them golden` : ''}.`];
    if (g.slips) lines.push(`${g.slips} slipped off on the way.`);
    return lines;
  };

  // ---------- drawing ----------

  function drawPrize(c, p, x, y, rot = 0) {
    const k = KINDS[p.kind];
    c.save();
    c.translate(x, y);
    c.rotate(rot + (p.tilt || 0));
    // the ring on top is always drawn here, at its true size (rings shrink
    // as the game goes on); the object is the painted sprite once delivered
    const ringY = -k.h - p.ringR * 0.75;
    c.beginPath();
    c.ellipse(0, ringY, p.ringR, p.ringR * 0.9, 0, 0, Math.PI * 2);
    ink(c, 6, p.golden ? '#c9962a' : '#8a7a5a');
    c.stroke();
    ink(c, 1.4);
    c.stroke();
    if (!drawSprite(c, 'sprites.keycranePrizes', k.i, 0, 0, { h: k.h })) drawObject(c, p.kind, k);
    c.restore();
  }

  function drawObject(c, kind, k) {
    const { w, h, col } = k;
    if (kind === 'lantern') {
      poly(c, [[-w * 0.3, -h], [w * 0.3, -h], [w * 0.4, -h * 0.8], [-w * 0.4, -h * 0.8]], 1);
      wash(c, '#6a5a3a');
      ink(c, 2);
      poly(c, [[-w * 0.38, -h * 0.8], [w * 0.38, -h * 0.8], [w * 0.42, -h * 0.12], [-w * 0.42, -h * 0.12]], 2);
      wash(c, '#f6e2a0');
      ink(c, 2);
      blob(c, 0, -h * 0.45, 10, 18, 3, 0.1);
      wash(c, '#f0a030');
      poly(c, [[-w / 2, -h * 0.12], [w / 2, -h * 0.12], [w / 2, 0], [-w / 2, 0]], 3);
      wash(c, col);
      ink(c, 2);
    } else if (kind === 'cage') {
      c.beginPath();
      c.moveTo(-w / 2, 0);
      c.lineTo(-w / 2, -h * 0.6);
      c.quadraticCurveTo(0, -h * 1.15, w / 2, -h * 0.6);
      c.lineTo(w / 2, 0);
      c.closePath();
      wash(c, '#f4ecd6', 0.5);
      ink(c, 2.2);
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo((i * w) / 5, 0);
        c.quadraticCurveTo((i * w) / 6, -h * 0.85, 0, -h * 0.97);
        ink(c, 1.2);
        c.stroke();
      }
      poly(c, [[-w / 2 - 4, -8], [w / 2 + 4, -8], [w / 2 + 4, 0], [-w / 2 - 4, 0]], 4);
      wash(c, col);
      ink(c, 2);
    } else if (kind === 'watch') {
      blob(c, 0, -h / 2, w / 2, h / 2, 5, 0.02);
      wash(c, col);
      ink(c, 2.4);
      blob(c, 0, -h / 2, w * 0.36, h * 0.36, 6, 0.02);
      wash(c, '#fbf4dc');
      ink(c, 1.4);
      c.beginPath();
      c.moveTo(0, -h / 2);
      c.lineTo(0, -h * 0.75);
      c.moveTo(0, -h / 2);
      c.lineTo(w * 0.18, -h * 0.45);
      ink(c, 2);
      c.stroke();
      c.fillStyle = 'rgba(255,250,200,0.8)';
      c.fillRect(-w * 0.3, -h * 0.85, 8, 4);
    } else if (kind === 'handbag') {
      poly(c, [[-w / 2, 0], [w / 2, 0], [w * 0.4, -h], [-w * 0.4, -h]], 7);
      wash(c, col);
      ink(c, 2.2);
      c.beginPath();
      c.arc(0, -h * 0.7, 6, 0, Math.PI * 2);
      c.fillStyle = '#c9a24a';
      c.fill();
      hatch(c, -w / 2, -h, w / 2, 0, 12, 0.18, 1);
    } else if (kind === 'basket') {
      poly(c, [[-w / 2, -h], [w / 2, -h], [w * 0.38, 0], [-w * 0.38, 0]], 8);
      wash(c, col);
      ink(c, 2.2);
      for (let i = 1; i < 4; i++) {
        c.beginPath();
        c.moveTo(-w / 2 + (i * w) / 30, -h + (i * h) / 4);
        c.lineTo(w / 2 - (i * w) / 30, -h + (i * h) / 4);
        ink(c, 1.2);
        c.stroke();
      }
    } else if (kind === 'bell') {
      c.beginPath();
      c.moveTo(-w / 2, -6);
      c.quadraticCurveTo(-w * 0.4, -h * 0.4, -w * 0.25, -h * 0.8);
      c.quadraticCurveTo(0, -h * 1.05, w * 0.25, -h * 0.8);
      c.quadraticCurveTo(w * 0.4, -h * 0.4, w / 2, -6);
      c.closePath();
      wash(c, col);
      ink(c, 2.2);
      c.beginPath();
      c.arc(0, -4, 9, 0, Math.PI * 2);
      wash(c, '#8a6a3a');
      ink(c, 1.6);
    } else if (kind === 'kettle') {
      blob(c, 0, -h * 0.45, w * 0.42, h * 0.45, 9, 0.03);
      wash(c, col);
      ink(c, 2.2);
      poly(c, [[-w * 0.38, -h * 0.5], [-w * 0.62, -h * 0.85], [-w * 0.55, -h * 0.9], [-w * 0.3, -h * 0.65]], 10);
      wash(c, col);
      ink(c, 2);
      blob(c, 0, -h * 0.92, 10, 6, 11, 0.05);
      wash(c, '#3a3030');
    } else {
      // alarm clock
      blob(c, 0, -h * 0.5, w * 0.45, h * 0.45, 12, 0.02);
      wash(c, col);
      ink(c, 2.4);
      blob(c, 0, -h * 0.5, w * 0.32, h * 0.32, 13, 0.02);
      wash(c, '#fbf4dc');
      ink(c, 1.4);
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(s * w * 0.3, -h * 0.92, 11, 0, Math.PI * 2);
        wash(c, '#c9a24a');
        ink(c, 1.6);
      }
      c.beginPath();
      c.moveTo(0, -h * 0.5);
      c.lineTo(0, -h * 0.7);
      c.moveTo(0, -h * 0.5);
      c.lineTo(-w * 0.15, -h * 0.45);
      ink(c, 2);
      c.stroke();
    }
  }

  // The Crane on its string, hung from the trolley.
  function drawCrane(c, t) {
    const sx = g.x;
    const [fx, fy] = g.foot();
    const ax = sx + (g.L - HANG) * Math.sin(g.th);
    const ay = PIVOT_Y + (g.L - HANG) * Math.cos(g.th);
    // the string
    c.beginPath();
    c.moveTo(sx, PIVOT_Y);
    c.lineTo(ax, ay);
    ink(c, 2.4, '#5a4a3a');
    c.stroke();
    // a faint plumb line from the claws while aiming
    if (g.state === 'top' && !g.carry) {
      c.save();
      c.setLineDash([6, 12]);
      c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(fx, fy + 30);
      c.lineTo(fx, FLOOR);
      ink(c, 2, PAL.magenta);
      c.stroke();
      c.restore();
      c.save();
      c.globalAlpha = 0.25;
      c.fillStyle = INK;
      c.beginPath();
      c.ellipse(fx, FLOOR + 6, 30, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    // the carried prize hangs from the claws
    if (g.carry) {
      const k = KINDS[g.carry.kind];
      const d = k.h + g.carry.ringR * 0.75 + g.carry.ringR * 0.85;
      drawPrize(c, g.carry, fx + d * Math.sin(g.th), fy + d * Math.cos(g.th), -g.th);
    }
    c.save();
    c.translate(ax, ay);
    c.rotate(-g.th);
    const startled = g.startle > 0 && drawSprite(c, 'sprites.keycraneStartle', 0, 0, HANG, { h: BIRD * 0.95 });
    if (!startled && !drawSprite(c, 'sprites.keycraneHang', g.claw > 0.5 ? 1 : 0, 0, HANG, { h: BIRD * 0.95 })) {
      // the stand-in startles with a jolt
      if (g.startle > 0 && !env.reduceMotion) c.rotate(Math.sin(g.startle * 40) * 0.08);
      drawBird(c, 'keycrane', { x: 0, y: HANG, size: BIRD, t, pose: { claw: g.claw } });
      // the claws, opening and closing
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(s * 6, HANG - 4);
        c.quadraticCurveTo(s * (20 - 10 * g.claw), HANG + 8, s * (8 - 6 * g.claw), HANG + 20);
        ink(c, 3);
        c.stroke();
      }
    }
    c.restore();
    // the knot on the string
    c.beginPath();
    c.arc(ax, ay, 4, 0, Math.PI * 2);
    c.fillStyle = INK;
    c.fill();
  }

  function drawTrolley(c) {
    const x = g.x;
    poly(c, [[x - 46, RAIL_Y - 22], [x + 46, RAIL_Y - 22], [x + 40, PIVOT_Y], [x - 40, PIVOT_Y]], 3, 1);
    wash(c, '#b08a3a');
    ink(c, 2.2);
    for (const s of [-1, 1]) {
      c.beginPath();
      c.arc(x + s * 26, RAIL_Y - 22, 11, 0, Math.PI * 2);
      wash(c, '#6a5a3a');
      ink(c, 2);
    }
    // the winch drum turns while the string runs
    c.beginPath();
    c.arc(x, RAIL_Y + 2, 13, 0, Math.PI * 2);
    wash(c, '#e8d6a0');
    ink(c, 1.6);
    c.beginPath();
    const a = g.L * 0.05;
    c.moveTo(x + Math.cos(a) * 12, RAIL_Y + 2 + Math.sin(a) * 12);
    c.lineTo(x - Math.cos(a) * 12, RAIL_Y + 2 - Math.sin(a) * 12);
    ink(c, 1.6);
    c.stroke();
  }

  function drawCabinet(c) {
    // the back of the cabinet: faded wallpaper behind glass
    c.fillStyle = 'rgba(201,168,58,0.18)';
    c.fillRect(40, 60, W - 80, FLOOR - 60);
    c.save();
    c.globalAlpha = 0.14;
    for (let x = 90; x < W - 60; x += 110) {
      for (let y = 140; y < FLOOR - 40; y += 120) {
        blob(c, x + ((y / 120) % 2) * 55, y, 14, 10, x + y, 0.2, 10);
        c.fillStyle = PAL.mauve;
        c.fill();
      }
    }
    c.restore();
    // the brass rail
    c.beginPath();
    c.moveTo(60, RAIL_Y - 30);
    c.lineTo(W - 60, RAIL_Y - 28);
    c.lineWidth = 14;
    c.strokeStyle = '#c9a24a';
    c.stroke();
    c.beginPath();
    c.moveTo(60, RAIL_Y - 38);
    c.lineTo(W - 60, RAIL_Y - 36);
    c.moveTo(60, RAIL_Y - 22);
    c.lineTo(W - 60, RAIL_Y - 20);
    ink(c, 1.6);
    c.stroke();
    // the floor: worn velvet
    poly(c, [[40, FLOOR], [W - 40, FLOOR + 2], [W - 40, H - 40], [40, H - 40]], 5, 1);
    wash(c, '#a8606a', 0.75);
    ink(c, 2);
    hatch(c, 40, FLOOR, W - 40, H - 40, 12, 0.15, 1);
    // the chute: a wooden box with a dark mouth
    poly(c, [[CHUTE_X0 - 20, CHUTE_Y], [CHUTE_X1 + 20, CHUTE_Y], [CHUTE_X1 + 20, H - 40], [CHUTE_X0 - 20, H - 40]], 6, 1);
    wash(c, '#9a6a3a');
    ink(c, 2.4);
    hatch(c, CHUTE_X0 - 20, CHUTE_Y, CHUTE_X1 + 20, H - 40, 16, 0.2, 2);
    c.beginPath();
    c.ellipse((CHUTE_X0 + CHUTE_X1) / 2, CHUTE_Y + 4, (CHUTE_X1 - CHUTE_X0) / 2, 22, 0, 0, Math.PI * 2);
    c.fillStyle = '#2a2018';
    c.fill();
    ink(c, 2.4);
    c.stroke();
    // a painted arrow on the glass, pointing down into the chute
    c.save();
    c.globalAlpha = 0.5;
    const ax = (CHUTE_X0 + CHUTE_X1) / 2;
    poly(c, [[ax - 16, CHUTE_Y - 150], [ax + 16, CHUTE_Y - 150], [ax + 16, CHUTE_Y - 100], [ax + 34, CHUTE_Y - 100], [ax, CHUTE_Y - 62], [ax - 34, CHUTE_Y - 100], [ax - 16, CHUTE_Y - 100]], 7, 1);
    wash(c, PAL.lemon);
    ink(c, 2);
    c.restore();
    // the cabinet's wooden frame
    c.lineWidth = 40;
    c.strokeStyle = '#7a5030';
    c.strokeRect(20, 20, W - 40, H - 40);
    ink(c, 2.4);
    c.strokeRect(40, 40, W - 80, H - 80);
    c.strokeRect(2, 2, W - 4, H - 4);
  }

  g.draw = (c, t) => {
    scene(c, 'keycrane', W, H, drawCabinet);

    // the chute's mouth glows while a prize is on its way
    if (g.carry) {
      c.save();
      c.globalAlpha = 0.3 + 0.2 * Math.sin(t * 8);
      c.beginPath();
      c.ellipse((CHUTE_X0 + CHUTE_X1) / 2, CHUTE_Y + 4, (CHUTE_X1 - CHUTE_X0) / 2 + 8, 28, 0, 0, Math.PI * 2);
      ink(c, 6, PAL.lemon);
      c.stroke();
      c.restore();
    }

    for (const p of g.prizes) drawPrize(c, p, p.x, p.y);
    for (const f of g.flying) drawPrize(c, f.p, f.x, f.y + KINDS[f.p.kind].h * 0.5, f.rot);
    drawTrolley(c);
    drawCrane(c, t);

    for (const d of g.dust) {
      c.save();
      c.globalAlpha = clamp(d.life * 2, 0, 1) * 0.6;
      c.beginPath();
      c.arc(d.x, d.y, 4, 0, Math.PI * 2);
      c.fillStyle = '#c8b090';
      c.fill();
      c.restore();
    }

    for (const p of g.pops) {
      c.save();
      c.globalAlpha = Math.min(1, p.life * 2);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = `800 ${p.size}px Fraunces, Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeText(p.text, p.x, p.y);
      label(c, p.text, p.x, p.y, { size: p.size, color: p.color, weight: 800 });
      c.restore();
    }

    if (g.elapsed < 4) {
      c.save();
      c.globalAlpha = Math.min(1, 4 - g.elapsed);
      label(c, 'Move · stop · let it settle · drop on a ring', W / 2 + 120, 470, { size: 34, weight: 600 });
      c.restore();
    }
  };

  g.focus = () => clamp(g.x, 380, W - 380);
  g.span = 760;

  return g;
}

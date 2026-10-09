// Ten O'clock Tit Trush: Set the Clocks.
//
// The Ten O'clock Tit Trush is a gold pocket watch, and the clocks of the
// town want it to keep their time. One after another a town clock (the
// church, the station, the town hall, the cuckoo clock) calls out the time
// it shows; turn the hands of the big watch face to match and press the
// action to set it. Spin the stick (one turn of the stick is one hour round
// the face), drag the long hand round with the mouse or a finger (grab the
// short hand to turn whole hours), or hold ← / → (or push the stick and hold
// it) to turn the hands; ↑ / ↓ (keys, D-pad, or a flick of the stick) jump a
// whole hour. The hour hand follows the minute hand like a real clock's. Setting
// the wrong time jams the crown for a moment; a clock left waiting too long
// gives up and the next one calls. The times get harder: o'clock, then half
// past, quarter past and to, five-minute times, then any minute; and every
// so often a clock strikes ten, the Tit Trush's own hour, worth double.
// Score: clocks set.

import { drawBird, drawSprite, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.watchFace': [1, 1], // the big gold watch face, no hands
  'sprites.townClocks': [2, 2], // church tower clock, station clock, town hall clock, cuckoo clock: faces without hands
  'sprites.titthrushSing': [1, 1], // the Tit Trush with its beak open, singing
  'sprites.watchCrown': [1, 1], // the watch's winding crown and ring bow, on top of the big face
  'sprites.titthrushFluster': [1, 1], // flustered: a wrong setting, or a clock gave up
});

const DURATION = 50;
const DX = 660; // the big watch face
const DY = 470;
const DR = 250; // the watch face's radius (to the outer edge of its ring of minute ticks)
// The delivered watch face (sprites.watchFace, 1024 px): the face's tick ring
// is a circle of radius 0.36 of the image round (0.5, 0.495); the gold case
// reaches 0.464 of the image round the middle.
const FACE_W = DR / 0.36; // how wide to draw the whole image
const FACE_DY = (0.5 - 0.495) * FACE_W; // the image's middle sits this far below the face's
const CASE_R = 0.464 * FACE_W;
const CASE_TOP = DY + FACE_DY - FACE_W / 2 + 0.028 * FACE_W; // the top of the gold case
const TX = 1180; // the town clock
const TY = 330;
const TR = 130;
const BIRD_X = 180;
const BIRD_SIZE = 340;
// The singing and flustered variants are painted at the portrait's framing
// (1024 px = 420 units, the bird centred): drawn whole at the portrait's
// scale, standing on their feet (measured: 0.98 and 0.979 of the image down).
const BIRD_CELL = (420 * BIRD_SIZE) / 400;
const BIRD_Y = 840;
const JAM = 1; // seconds the crown sticks after a wrong setting
const MIN_PER_RAD = 60 / (Math.PI * 2); // one turn of the stick is an hour
const CLOCKS = [
  { name: 'The church clock', rim: '#a9a090', face: '#f2ead8', roman: true },
  { name: 'The station clock', rim: '#3a3a40', face: '#fbf8ee', roman: false },
  { name: 'The town hall clock', rim: '#c9a83a', face: '#f6efd8', roman: true },
  { name: 'The cuckoo clock', rim: '#8a5a30', face: '#efe2c0', roman: false },
];
const NUM = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

const wrap = (m) => ((m % 720) + 720) % 720;
// The shortest way round from a to b, in minutes (-360..360).
const diff = (a, b) => {
  let d = wrap(b - a);
  if (d > 360) d -= 720;
  return d;
};
const hourOf = (m) => Math.floor(wrap(m) / 60) % 12 || 12;
export const digits = (m) => {
  const w = Math.round(wrap(m)) % 720;
  return `${Math.floor(w / 60) % 12 || 12}:${String(w % 60).padStart(2, '0')}`;
};
// The time as a child would say it.
export function words(m) {
  const w = Math.round(wrap(m)) % 720;
  const h = Math.floor(w / 60) % 12 || 12;
  const mm = w % 60;
  const next = (h % 12) + 1;
  const small = { 5: 'five', 10: 'ten', 20: 'twenty', 25: 'twenty-five' };
  if (mm === 0) return `${NUM[h]} o’clock`;
  if (mm === 30) return `half past ${NUM[h]}`;
  if (mm === 15) return `quarter past ${NUM[h]}`;
  if (mm === 45) return `quarter to ${NUM[next]}`;
  if (mm < 30 && small[mm]) return `${small[mm]} past ${NUM[h]}`;
  if (mm > 30 && small[60 - mm]) return `${small[60 - mm]} to ${NUM[next]}`;
  return digits(w);
}

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    m: 600, // the watch's time, in minutes past twelve (it starts at ten o'clock, of course)
    target: 0,
    clock: 0, // which town clock is calling
    round: 0,
    wait: 0, // how long this clock has waited
    patience: 12,
    tol: 2,
    jam: 0,
    still: 0, // seconds since the hands last turned
    holdT: 0, // how long ← / → has been held
    holdDir: 0,
    prevY: 0,
    dragA: null,
    turning: 0,
    set: 0,
    tens: 0,
    gaveUp: 0,
    wrong: 0,
    sing: 0,
    ring: 0, // the town clock's ring after a set
    shake: 0,
    callT: 0, // the town clock's call, for its bubble's pop
    pops: [],
    notes: [],
    nextT: 0, // the pause after a clock is set
    fluster: 0, // seconds left looking flustered after a clock gave up
    dragHour: false, // the pointer is dragging the short hand
    dragged: 0, // how far the pointer has dragged the hands this press
    downT: 0,
    lastDownT: 0,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  function pop(text, x, y, color = INK, size = 44) {
    g.pops.push({ text, x, y, color, size, life: 1.3 });
  }

  // The next time to set: harder kinds as the rounds go by, a little way
  // round from where the hands are, and now and then ten o'clock.
  function call() {
    const r = g.round;
    g.clock = r % CLOCKS.length;
    let t;
    if (r > 0 && r % 5 === 4 && Math.abs(diff(g.m, 600)) > 40 && Math.abs(diff(g.m, 600)) <= 180) {
      t = 600;
      g.isTen = true;
    } else {
      g.isTen = false;
      const step = r < 3 ? 60 : r < 6 ? 30 : r < 9 ? 15 : r < 15 ? 5 : 1; // any minute only from the sixteenth clock
      const far = lerp(110, 140, Math.min(1, r / 12)); // never more than three hours round
      for (let k = 0; k < 20; k++) {
        const off = (rng() < 0.5 ? -1 : 1) * (40 + rng() * far);
        t = wrap(Math.round((g.m + off) / step) * step);
        if (r < 3 || t % 60 !== 0) break; // after the first rounds, not just o'clock again
      }
      if (step === 30 && t % 60 === 0) t = wrap(t + 30);
    }
    g.target = wrap(t);
    g.tol = g.round >= 15 ? 1 : 2;
    g.wait = 0;
    // patience: a base, and a second more for every hour the hands must travel
    g.patience = lerp(9, 6, progress()) + Math.abs(diff(g.m, g.target)) / 60;
    g.callT = 0.4;
    sfx('ding', { pitch: -5 + g.clock * 2 });
  }

  function turn(minutes) {
    if (!minutes) return;
    g.m = wrap(g.m + minutes);
    g.still = 0;
    g.turning = Math.min(1, g.turning + Math.abs(minutes) / 10);
    // a tick for every minute mark passed
    g.tickAcc = (g.tickAcc || 0) + Math.abs(minutes);
    if (g.tickAcc > 5) {
      g.tickAcc = 0;
      sfx('tick');
    }
  }

  function setIt() {
    const off = Math.abs(diff(g.m, g.target));
    if (off <= g.tol + 0.5) {
      const worth = g.isTen ? 2 : 1;
      g.score += worth;
      g.set++;
      if (g.isTen) g.tens++;
      g.m = g.target;
      g.sing = 1.2;
      g.ring = 1;
      sfx('right');
      env.vibrate?.(30);
      const quick = g.wait < 3;
      pop(g.isTen ? 'Ten o’clock! Tit-trush! +2' : quick ? 'Right on time!' : 'Set!', DX, CASE_TOP - 100, PAL.magenta, 50);
      for (let i = 0; i < 5; i++) g.notes.push({ x: BIRD_X - 10, y: BIRD_Y - 290, vx: -60 + i * 40, vy: -120 - i * 20, life: 1.2 });
      g.round++;
      g.nextT = 0.7;
    } else {
      g.wrong++;
      g.jam = JAM;
      g.shake = 0.4;
      sfx('wrong');
      env.vibrate?.(60);
      pop(off > 60 ? 'Wrong hour!' : 'Not quite!', DX, DY + CASE_R + 30, PAL.brick, 44);
    }
  }

  g.update = (dt, input) => {
    if (g.done) return;
    g.kind = input.kind;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }
    if (!g.called) {
      g.called = true;
      call();
    }
    g.jam = Math.max(0, g.jam - dt);
    g.fluster = Math.max(0, g.fluster - dt);
    g.shake = Math.max(0, g.shake - dt);
    g.sing = Math.max(0, g.sing - dt);
    g.ring = Math.max(0, g.ring - dt * 1.5);
    g.callT = Math.max(0, g.callT - dt);
    g.turning = Math.max(0, g.turning - dt * 3);
    g.still += dt;

    // Between clocks: a moment to enjoy it, then the next one calls.
    if (g.nextT > 0) {
      g.nextT -= dt;
      if (g.nextT <= 0) call();
    } else {
      // Turning the hands.
      // 1. The stick spun round (clockwise is forward).
      turn((input.spin || 0) * MIN_PER_RAD);
      // 2. The minute hand dragged round the face.
      const p = input.pointer;
      if (p && p.active && p.down) {
        const dx = p.x - DX;
        const dy = p.y - DY;
        const a = Math.atan2(dx, -dy);
        if (g.dragA === null) {
          // grabbing near the short hand turns the hours; anywhere else, the minutes
          const ha = (wrap(g.m) / 720) * Math.PI * 2;
          let off = a - ha;
          off = Math.atan2(Math.sin(off), Math.cos(off));
          g.dragHour = Math.abs(off) < 0.45 && Math.hypot(dx, dy) < DR * 0.62;
        }
        if (g.dragA !== null && Math.hypot(dx, dy) > 40) {
          let d = a - g.dragA;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          turn(d * (g.dragHour ? 720 / (Math.PI * 2) : MIN_PER_RAD));
          g.dragged += Math.abs(d) * Math.hypot(dx, dy);
        } else if (g.dragA === null) g.dragged = 0;
        g.dragA = a;
        g.downT += dt;
      } else {
        g.dragA = null;
        g.downT = 0;
      }
      // 3. ← / → (or the stick pushed and held): a minute, then faster.
      if (!(p && p.active)) {
        const x = input.x || 0;
        const dir = Math.abs(x) > 0.85 && Math.abs(input.y || 0) < 0.45 && Math.abs(input.spin || 0) < 0.02 ? Math.sign(x) : 0;
        if (dir && dir === g.holdDir) {
          g.holdT += dt;
          if (g.holdT > 0.22) turn(dir * lerp(20, 200, clamp((g.holdT - 0.22) / 1.2, 0, 1)) * dt);
        } else if (dir) {
          g.holdDir = dir;
          g.holdT = 0;
          turn(dir);
        } else {
          g.holdDir = 0;
          g.holdT = 0;
        }
        // ↑ / ↓ (keys, D-pad, or a quick flick of the stick): a whole hour.
        // A spun stick sweeps through up and down smoothly, so only a jump
        // from the middle counts.
        const y = input.y || 0;
        if (Math.abs(y) > 0.85 && Math.abs(g.prevY) < 0.5 && Math.abs(x) < 0.45 && Math.abs(input.spin || 0) < 0.01) turn(y < 0 ? 60 : -60);
        g.prevY = y;
      }
      // Resting hands settle on the nearest whole minute.
      if (g.still > 0.12) g.m = wrap(approach(g.m, Math.round(g.m), 20, dt));

      // Press the crown to set it. With the mouse or a finger, a drag turns
      // the hands and a tap (a press let go without dragging) sets it.
      const pointing = p && p.active;
      const tapped = pointing && input.actionReleased && g.dragged < 16 && g.lastDownT < 0.5;
      if (pointing) g.lastDownT = g.downT || g.lastDownT;
      if ((!pointing && input.actionPressed) || tapped) {
        if (g.jam > 0) sfx('bonk');
        else setIt();
      }
      // A clock kept waiting too long gives up.
      g.wait += dt;
      if (g.nextT <= 0 && g.wait > g.patience) {
        g.gaveUp++;
        g.fluster = 1;
        sfx('wilt');
        pop('Too slow! The next clock calls', TX - 60, TY + TR + 80, PAL.brick, 34);
        g.round++;
        call();
      }
    }

    for (const n of g.notes) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.life -= dt;
    }
    g.notes = g.notes.filter((n) => n.life > 0);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Clocks ${g.score}`;
  g.summary = () => {
    const lines = [`${g.set} clock${g.set === 1 ? '' : 's'} set${g.tens ? `, ${g.tens} of them at ten o’clock (double)` : ''}.`];
    const woes = [];
    if (g.wrong) woes.push(`${g.wrong} wrong setting${g.wrong === 1 ? '' : 's'}`);
    if (g.gaveUp) woes.push(`${g.gaveUp} clock${g.gaveUp === 1 ? '' : 's'} gave up waiting`);
    lines.push(woes.length ? `Along the way: ${woes.join(', ')}.` : 'Every clock set right first time!');
    return lines;
  };

  // ---------- drawing ----------

  function standinSquare(c) {
    band(c, 0, 0, W, 560, '#e8d8a8', 0.5, 1);
    band(c, 0, 0, W, 200, '#e0b890', 0.3, 2);
    // rooftops and chimneys round the square
    const fronts = ['#d9a4a0', '#c9c09a', '#b8c0a0', '#d0b890', '#c0a8b8'];
    for (let i = 0; i < 8; i++) {
      const x0 = -40 + i * 215;
      const tall = 230 + ((i * 61) % 110);
      poly(c, [[x0, 640], [x0, 640 - tall], [x0 + 100, 560 - tall], [x0 + 200, 640 - tall], [x0 + 200, 640]], i + 5, 1.5);
      wash(c, fronts[i % fronts.length], 0.45);
      ink(c, 1.4);
      poly(c, [[x0 + 140, 600 - tall], [x0 + 165, 600 - tall], [x0 + 165, 560 - tall], [x0 + 140, 560 - tall]], i, 1);
      wash(c, PAL.brick, 0.5);
      ink(c, 1.2);
    }
    // cobbles
    band(c, 0, 640, W, H - 640, '#b8b0a0', 0.6, 9);
    c.save();
    c.globalAlpha = 0.3;
    for (let y = 670; y < H; y += 34) {
      for (let x = ((y / 34) % 2) * 30; x < W; x += 60) {
        blob(c, x, y, 26, 12, x + y, 0.15, 10);
        ink(c, 1.2);
        c.stroke();
      }
    }
    c.restore();
  }

  function hands(c, cx, cy, r, m, color = INK, w = 1) {
    const ma = (wrap(m) / 60) * Math.PI * 2;
    const ha = (wrap(m) / 720) * Math.PI * 2;
    const hand = (a, len, width, col) => {
      c.save();
      c.translate(cx, cy);
      c.rotate(a);
      c.beginPath();
      c.moveTo(-width * 0.6, r * 0.12);
      c.lineTo(-width * 0.5, -len * 0.7);
      c.lineTo(0, -len);
      c.lineTo(width * 0.5, -len * 0.7);
      c.lineTo(width * 0.6, r * 0.12);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      ink(c, 1.4 * w);
      c.stroke();
      c.restore();
    };
    hand(ha, r * 0.52, r * 0.075, color);
    hand(ma, r * 0.8, r * 0.05, color);
    c.beginPath();
    c.arc(cx, cy, r * 0.06, 0, Math.PI * 2);
    c.fillStyle = PAL.ochre;
    c.fill();
    ink(c, 1.6 * w);
    c.stroke();
  }

  function numerals(c, cx, cy, r, roman, size) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      label(c, roman ? ROMAN[i] : String(i || 12), cx + Math.sin(a) * r, cy - Math.cos(a) * r, { size, weight: 700 });
    }
  }
  function ticks(c, cx, cy, r) {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const l = i % 5 === 0 ? 16 : 7;
      c.beginPath();
      c.moveTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
      c.lineTo(cx + Math.sin(a) * (r - l), cy - Math.cos(a) * (r - l));
      ink(c, i % 5 === 0 ? 2.4 : 1.2);
      c.stroke();
    }
  }

  function drawWatch(c, t) {
    const sh = g.shake > 0 && !env.reduceMotion ? Math.sin(g.shake * 60) * 6 : 0;
    const x = DX + sh;
    // the crown on top of the case (it glows brick red while jammed)
    if (!drawSprite(c, 'sprites.watchCrown', 0, x, CASE_TOP + 12, { h: 96 })) {
      poly(c, [[x - 26, CASE_TOP - 62], [x + 26, CASE_TOP - 62], [x + 26, CASE_TOP + 8], [x - 26, CASE_TOP + 8]], 3, 1);
      wash(c, '#d8b040');
      ink(c, 2.2);
      hatch(c, x - 26, CASE_TOP - 62, x + 26, CASE_TOP + 8, 6, 0.4, 0);
    }
    if (g.jam > 0) {
      c.save();
      c.globalAlpha = 0.45 * Math.min(1, g.jam * 2);
      c.fillStyle = PAL.brick;
      c.beginPath();
      c.arc(x, CASE_TOP - 28, 40, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    if (!drawSprite(c, 'sprites.watchFace', 0, x, DY + FACE_DY, { w: FACE_W, anchor: 'center', whole: true })) {
      c.beginPath();
      c.arc(x, DY, DR + 20, 0, Math.PI * 2);
      c.fillStyle = '#d8b040';
      c.fill();
      ink(c, 3);
      c.stroke();
      c.beginPath();
      c.arc(x, DY, DR + 6, 0, Math.PI * 2);
      ink(c, 1.6, '#a88a30');
      c.stroke();
      c.beginPath();
      c.arc(x, DY, DR - 4, 0, Math.PI * 2);
      c.fillStyle = '#fbf6e4';
      c.fill();
      ink(c, 2);
      c.stroke();
      ticks(c, x, DY, DR - 8);
      numerals(c, x, DY, DR - 52, false, 44);
    }
    // a faint ghost of the time to set, to match the hands against
    if (g.nextT <= 0 && g.round < 3) {
      c.save();
      c.globalAlpha = 0.18;
      hands(c, x, DY, DR, g.target, PAL.magenta);
      c.restore();
    }
    hands(c, x, DY, DR, g.m, '#2c2c34', 1.6);
    // the time, written small under the hands
    label(c, digits(g.m), x, DY + DR * 0.42, { size: 34, color: '#7a6a50', weight: 600 });
    if (g.jam > 0) label(c, 'Jammed!', x, DY + DR * 0.62, { size: 30, color: PAL.brick, weight: 800 });
  }

  function drawTownClock(c, t) {
    const C = CLOCKS[g.clock];
    const ring = g.ring > 0 && !env.reduceMotion ? Math.sin(g.ring * 40) * 0.05 * g.ring : 0;
    c.save();
    c.translate(TX, TY);
    c.rotate(ring);
    // (each dial is centred in its cell, half the cell wide, its surround round it)
    if (!drawSprite(c, 'sprites.townClocks', g.clock, 0, 0, { w: TR * 4, anchor: 'center', whole: true })) {
      // its frame: a stone tower, a hanging station clock, a gold town hall
      // clock, a wooden cuckoo house
      if (g.clock === 0) {
        poly(c, [[-TR - 30, -TR - 80], [0, -TR - 160], [TR + 30, -TR - 80], [TR + 30, TR + 200], [-TR - 30, TR + 200]], 1, 1.5);
        wash(c, '#c8bca8');
        ink(c, 2.4);
        hatch(c, -TR - 30, -TR - 150, TR + 30, TR + 200, 18, 0.15, 1);
      } else if (g.clock === 1) {
        c.beginPath();
        c.moveTo(0, -TR - 10);
        c.lineTo(0, -TR - 120);
        ink(c, 10, '#3a3a40');
        c.stroke();
      } else if (g.clock === 3) {
        poly(c, [[-TR - 40, -TR + 10], [0, -TR - 110], [TR + 40, -TR + 10], [TR + 30, TR + 60], [-TR - 30, TR + 60]], 4, 1.5);
        wash(c, '#a8784a');
        ink(c, 2.4);
        blob(c, 0, -TR - 40, 26, 22, 3, 0.1);
        wash(c, '#e8c060');
        ink(c, 1.8);
      }
      c.beginPath();
      c.arc(0, 0, TR + 14, 0, Math.PI * 2);
      c.fillStyle = C.rim;
      c.fill();
      ink(c, 2.4);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, TR, 0, Math.PI * 2);
      c.fillStyle = C.face;
      c.fill();
      ink(c, 1.6);
      c.stroke();
      ticks(c, 0, 0, TR - 4);
      numerals(c, 0, 0, TR - 30, C.roman, C.roman ? 22 : 26);
    }
    if (g.nextT <= 0 || g.ring > 0) hands(c, 0, 0, TR, g.target, INK, 1);
    c.restore();

    // its call, in a speech bubble
    if (g.nextT > 0 && g.ring <= 0) return;
    const bx = TX;
    const by = TY + TR + 120;
    const s = 1 + g.callT * 0.5;
    const text = g.isTen ? 'Ten o’clock!' : words(g.target);
    const cap = text.charAt(0).toUpperCase() + text.slice(1);
    c.save();
    c.translate(bx, by);
    c.scale(s, s);
    blob(c, 0, 0, 230, 70, 8, 0.04, 24);
    wash(c, '#fbf6e4', 0.95);
    ink(c, 2.2);
    poly(c, [[-20, -66], [0, -110], [24, -64]], 2, 0.5);
    wash(c, '#fbf6e4', 0.95);
    label(c, `${C.name} says:`, 0, -30, { size: 24, color: '#7a6a50', weight: 600 });
    label(c, `${cap}`, 0, 12, { size: cap.length > 18 ? 34 : 42, color: g.isTen ? PAL.magenta : INK, weight: 800 });
    if (/[a-z]/.test(text)) label(c, digits(g.target), 0, 46, { size: 20, color: '#7a6a50', weight: 600 });
    c.restore();
    // its patience: a little sand line under the bubble
    if (g.nextT <= 0) {
      const left = 1 - clamp(g.wait / g.patience, 0, 1);
      c.fillStyle = left < 0.3 && Math.sin(t * 12) > 0 ? PAL.brick : PAL.ochre;
      c.fillRect(bx - 160, by + 90, 320 * left, 10);
      c.strokeStyle = INK;
      c.lineWidth = 1.5;
      c.strokeRect(bx - 160, by + 90, 320, 10);
    }
  }

  function drawTrush(c, t) {
    const hop = g.sing > 0 && !env.reduceMotion ? Math.abs(Math.sin(g.sing * 9)) * 26 : 0;
    const sq = g.sing > 0 ? Math.sin(g.sing * 18) * 0.04 : 0;
    c.save();
    c.translate(BIRD_X, BIRD_Y - hop);
    c.scale(1 + sq, 1 - sq);
    const flustered = g.sing <= 0 && (g.jam > 0 || g.fluster > 0);
    let drawn = false;
    if (g.sing > 0) drawn = drawSprite(c, 'sprites.titthrushSing', 0, 0, (1 - 0.98) * BIRD_CELL, { w: BIRD_CELL, whole: true });
    else if (flustered) drawn = drawSprite(c, 'sprites.titthrushFluster', 0, 0, (1 - 0.979) * BIRD_CELL, { w: BIRD_CELL, whole: true });
    if (!drawn) {
      if (flustered && !env.reduceMotion) c.rotate(Math.sin(t * 40) * 0.05); // the stand-in shakes
      // never flipped: a mirrored watch face would read backwards
      drawBird(c, 'titthrush', { x: 0, y: 0, size: BIRD_SIZE, t });
    }
    c.restore();
    for (const n of g.notes) {
      c.save();
      c.globalAlpha = clamp(n.life, 0, 1);
      c.beginPath();
      c.ellipse(n.x, n.y, 11, 8, -0.4, 0, Math.PI * 2);
      c.fillStyle = PAL.magenta;
      c.fill();
      c.beginPath();
      c.moveTo(n.x + 10, n.y - 2);
      c.lineTo(n.x + 10, n.y - 40);
      c.quadraticCurveTo(n.x + 26, n.y - 30, n.x + 22, n.y - 18);
      ink(c, 3, PAL.magenta);
      c.stroke();
      c.restore();
    }
  }

  g.draw = (c, t) => {
    scene(c, 'titthrush', W, H, standinSquare);
    drawTownClock(c, t);
    drawTrush(c, t);
    drawWatch(c, t);

    for (const p of g.pops) {
      const k = Math.min(1, (1.3 - p.life) * 8);
      c.save();
      c.globalAlpha = Math.min(1, p.life * 2);
      c.translate(p.x, p.y);
      c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = `800 ${p.size}px Fraunces, Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeText(p.text, 0, 0);
      label(c, p.text, 0, 0, { size: p.size, color: p.color, weight: 800 });
      c.restore();
    }

    if (g.elapsed < 4.5) {
      c.save();
      c.globalAlpha = Math.min(1, 4.5 - g.elapsed);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = '600 34px Fraunces, Georgia, serif';
      c.textAlign = 'center';
      const msg = g.kind === 'pointer' ? 'Drag the hands to match the town clock · tap to set' : g.kind === 'controller' ? 'Spin the stick · flick ↑ ↓ for hours · A to set' : 'Hold ← → to turn · ↑ ↓ for hours · Space to set';
      c.strokeText(msg, W / 2, 866);
      label(c, msg, W / 2, 866, { size: 34, weight: 600 });
      c.restore();
    }
  };

  // On a narrow screen: the watch face, and the call beside it when there's room.
  g.focus = () => 900;
  g.span = 1060;

  return g;
}

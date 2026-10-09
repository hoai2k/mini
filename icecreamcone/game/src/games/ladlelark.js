// Soupladle Lark: Soup's On.
//
// A big pot of soup swirls on the stove, carrots, peas, dumplings and
// mushrooms going round and round in it, and a queue of hungry creatures
// waits at the hatch. The one at the front says what it wants (two carrots
// and a pea, say). The Lark is a ladle: move it over the pot and press the
// action to dip. Whatever floats inside the ring is scooped into the
// creature's bowl. When the bowl holds just what was asked, it's served:
// three points (four if it was quick: before the patience bar turns
// yellow), or one if a single unwanted bit came along too. A second
// unwanted bit, or the old boot that sometimes bobs up, and the creature
// says "Yuck!" and leaves, costing a point; one kept waiting too long just
// leaves. The soup swirls faster, the orders grow and patience shortens as
// the queue goes on. Score: points.

import { art, drawBird, drawSprite, spriteCell, SHEETS, scene, band, blob, poly, wash, ink, hatch, label, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.larkBits': [5, 1], // carrot slice, pea, dumpling, mushroom, old boot
  'sprites.larkQueue': [4, 2], // hedgehog, rabbit, bear cub, frog waiting; the same four pulling a face
  'sprites.larkPot': [2, 1], // the soup pot, a serving bowl
  'sprites.larkPoses': [3, 1], // hovering, wings beating; dipping bowl first; rising with a full bowl
});

const DURATION = 50;
const CX = 640; // the broth's surface, an ellipse
const CY = 560;
const RX = 400;
const RY = 150;
const CATCH = 0.2; // the ring's radius, in units of the surface
const DIP = 0.42; // seconds a dip takes
const SCOOP_AT = 0.16; // into the dip, when the ladle takes what's in the ring
const BITS = 15;
const KINDS = ['carrot', 'pea', 'dumpling', 'mushroom', 'boot'];
const NAMES = { carrot: ['carrot', 'carrots'], pea: ['pea', 'peas'], dumpling: ['dumpling', 'dumplings'], mushroom: ['mushroom', 'mushrooms'] };
const BOWL = { x: 1250, y: 700 };
const QUEUE_X = [1390, 1510, 1590];
const SIZE = 300;
const BUBBLE_X = 900; // the order, over the pot so a narrow screen shows it
const SAY = [900, 390]; // where the creature's words pop up
const K = SIZE / 400;

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    u: 0, // the ring, on the surface
    v: 0.1,
    dipT: 0,
    scooped: false,
    swirl: 0.45,
    spin: 0, // the soup's turn so far
    bits: [],
    refill: [],
    flyers: [], // bits on their way to the bowl
    splashes: [],
    pops: [],
    cust: null,
    queue: [],
    served: 0,
    perfect: 0,
    quick: 0,
    yucks: 0,
    walked: 0,
    nextWho: 0,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  const kinds = () => (g.elapsed < 7 ? 2 : g.elapsed < 20 ? 3 : 4);
  function pop(text, x, y, color = INK, size = 34) {
    g.pops.push({ text, x, y, color, size, life: 1.3 });
  }
  // Where a bit is (in surface units), now or `ahead` seconds from now.
  g.where = (b, ahead = 0) => {
    const a = b.a + g.swirl * b.w * ahead;
    return [Math.cos(a) * b.r, Math.sin(a) * b.r];
  };
  const toScreen = (u, v) => [CX + u * RX, CY + v * RY];
  g.ring = CATCH;
  g.scoopIn = SCOOP_AT;

  function makeBit(kind, r = Math.sqrt(rng()) * 0.9, a = rng() * Math.PI * 2) {
    return { kind, r: Math.max(0.12, r), a, w: 1.25 - 0.6 * r, ph: rng() * 6, drift: rng() * 6, born: 0 };
  }
  function pickKind() {
    const need = g.cust ? Object.keys(g.cust.order).filter((k) => g.cust.order[k] > (g.cust.got[k] || 0)) : [];
    if (g.elapsed > 12 && !g.bits.some((b) => b.kind === 'boot') && rng() < 0.25) return 'boot';
    if (need.length && rng() < 0.45) return need[Math.floor(rng() * need.length)];
    return KINDS[Math.floor(rng() * kinds())];
  }

  function newCustomer() {
    const k = progress();
    const n = g.elapsed < 10 ? 1 + Math.floor(rng() * 2) : k < 0.55 ? 2 + Math.floor(rng() * 2) : 3 + Math.floor(rng() * 2);
    const nk = Math.min(kinds(), g.elapsed < 10 ? 1 : k < 0.55 ? 2 : 3);
    const pool = KINDS.slice(0, kinds());
    const chosen = [];
    while (chosen.length < nk) {
      const c = pool[Math.floor(rng() * pool.length)];
      if (!chosen.includes(c)) chosen.push(c);
    }
    const order = {};
    for (let i = 0; i < n; i++) {
      const c = chosen[i < chosen.length ? i : Math.floor(rng() * chosen.length)];
      order[c] = (order[c] || 0) + 1;
    }
    const who = g.queue.length ? g.queue.shift() : g.nextWho++ % 4;
    while (g.queue.length < 2) g.queue.push(g.nextWho++ % 4);
    g.cust = { who, order, got: {}, extras: 0, t: 0, patience: lerp(13, 8, k) + n * 1.5, arrive: 0.5, mood: 0, bowl: [] };
    // The cook drops in more of anything the pot is short of.
    for (const kind of Object.keys(order)) {
      const have = g.bits.filter((b) => b.kind === kind).length;
      for (let i = have; i < order[kind] + 1; i++) {
        const b = makeBit(kind);
        b.born = 0;
        g.bits.push(b);
        const [x, y] = toScreen(...g.where(b));
        g.splashes.push({ x, y, life: 0.4 });
      }
    }
  }
  g.needs = () => {
    const c = g.cust;
    if (!c || c.leaving) return {};
    const out = {};
    for (const k of Object.keys(c.order)) if (c.order[k] > (c.got[k] || 0)) out[k] = c.order[k] - (c.got[k] || 0);
    return out;
  };

  function leave(text, color, cost = 0) {
    const c = g.cust;
    if (cost) {
      g.score = Math.max(0, g.score - cost);
      pop(`-${cost}`, SAY[0], SAY[1] - 56, PAL.brick, 44);
    }
    c.leaving = 0.9;
    c.mood = -1;
    pop(text, SAY[0], SAY[1], color, 40);
    sfx('squawk');
    env.vibrate?.(60);
  }

  function serve() {
    const c = g.cust;
    const quick = !c.extras && c.t < c.patience * 0.4;
    const pts = c.extras ? 1 : quick ? 4 : 3;
    g.score += pts;
    g.served++;
    if (!c.extras) g.perfect++;
    if (quick) g.quick++;
    c.leaving = 0.9;
    c.mood = 1;
    pop(c.extras ? 'Thank you' : quick ? 'Quick and delicious!' : 'Delicious!', SAY[0], SAY[1], c.extras ? PAL.ochre : PAL.green, 42);
    pop(`+${pts}`, SAY[0], SAY[1] - 56, PAL.magenta, 44);
    sfx('right');
    env.vibrate?.(30);
  }

  // What the ladle brings up goes into the bowl.
  function scoop() {
    const caught = g.bits.filter((b) => {
      const [u, v] = g.where(b);
      return Math.hypot(u - g.u, v - g.v) < CATCH;
    });
    const [sx, sy] = toScreen(g.u, g.v);
    g.splashes.push({ x: sx, y: sy, life: 0.5 });
    if (!caught.length) {
      sfx('miss');
      return;
    }
    g.bits = g.bits.filter((b) => !caught.includes(b));
    for (const b of caught) {
      g.refill.push({ t: 0.5 + rng() * 0.6 });
      const [u, v] = g.where(b);
      const [x, y] = toScreen(u, v);
      g.flyers.push({ kind: b.kind, x0: x, y0: y, t: 0 });
    }
    sfx('plop');
    const c = g.cust;
    if (!c || c.leaving) return;
    for (const b of caught) {
      c.bowl.push(b.kind);
      if (b.kind === 'boot') {
        g.yucks++;
        leave('A boot? Yuck!', PAL.brick, 1);
        return;
      }
      if ((c.order[b.kind] || 0) > (c.got[b.kind] || 0)) c.got[b.kind] = (c.got[b.kind] || 0) + 1;
      else {
        c.extras++;
        if (c.extras >= 2) {
          g.yucks++;
          leave('Yuck!', PAL.brick, 1);
          return;
        }
        pop(`No ${NAMES[b.kind][1]}!`, SAY[0], SAY[1] + 50, PAL.brick, 30);
      }
    }
    if (Object.keys(c.order).every((k) => (c.got[k] || 0) >= c.order[k])) serve();
    else sfx('catch', { pitch: 4 });
  }

  for (let i = 0; i < BITS; i++) g.bits.push(makeBit(KINDS[i % 2], undefined, undefined));
  newCustomer();

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }
    const k = progress();
    g.swirl = lerp(0.45, 1.0, k);
    g.spin += g.swirl * dt;

    // Move the ladle: follow the pointer, or the stick.
    if (input.pointer.active) {
      g.u = approach(g.u, (input.pointer.x - CX) / RX, 12, dt);
      g.v = approach(g.v, (input.pointer.y - CY) / RY, 12, dt);
    } else {
      g.u += (input.x * 640 * dt) / RX;
      g.v += (input.y * 640 * dt) / RY;
    }
    const d = Math.hypot(g.u, g.v);
    if (d > 0.95) {
      g.u *= 0.95 / d;
      g.v *= 0.95 / d;
    }

    // Dip.
    if (g.dipT > 0) {
      const before = DIP - g.dipT;
      g.dipT = Math.max(0, g.dipT - dt);
      if (before < SCOOP_AT && DIP - g.dipT >= SCOOP_AT) scoop();
    } else if (input.actionPressed) {
      g.dipT = DIP;
      sfx('pour');
    }

    // The soup swirls.
    for (const b of g.bits) {
      b.a += g.swirl * b.w * dt;
      b.born = Math.min(1, b.born + dt * 3);
      b.r = clamp(b.r + Math.sin(g.elapsed * 0.6 + b.drift) * 0.03 * dt, 0.1, 0.9);
    }
    for (const r of g.refill) r.t -= dt;
    for (const r of g.refill.filter((r) => r.t <= 0)) {
      if (g.bits.length >= BITS) continue;
      const b = makeBit(pickKind());
      b.born = 0;
      g.bits.push(b);
      const [u, v] = g.where(b);
      const [x, y] = toScreen(u, v);
      g.splashes.push({ x, y, life: 0.4 });
    }
    g.refill = g.refill.filter((r) => r.t > 0);

    // The customer.
    const c = g.cust;
    c.arrive = Math.max(0, c.arrive - dt);
    if (c.leaving !== undefined) {
      c.leaving -= dt;
      if (c.leaving <= 0) newCustomer();
    } else {
      c.t += dt;
      if (c.t >= c.patience) {
        g.walked++;
        leave('Hmph! Too slow', PAL.brick);
      }
    }

    for (const f of g.flyers) f.t += dt / 0.4;
    g.flyers = g.flyers.filter((f) => f.t < 1);
    for (const s of g.splashes) s.life -= dt;
    g.splashes = g.splashes.filter((s) => s.life > 0);
    for (const p of g.pops) {
      p.life -= dt;
      p.y -= 40 * dt;
    }
    g.pops = g.pops.filter((p) => p.life > 0);
  };

  g.hud = () => `Points ${g.score}`;
  g.summary = () => {
    const lines = [`${g.served} bowl${g.served === 1 ? '' : 's'} served, ${g.perfect} just as asked.`];
    const woes = [];
    if (g.yucks) woes.push(`${g.yucks} “Yuck!”${g.yucks === 1 ? '' : 's'}`);
    if (g.walked) woes.push(`${g.walked} tired of waiting`);
    lines.push(woes.length ? `Along the way: ${woes.join(', ')}.` : 'Every bowl just right!');
    return lines;
  };

  // ---------- drawing ----------

  function bit(c, kind, x, y, s = 1, rot = 0) {
    if (drawSprite(c, 'sprites.larkBits', KINDS.indexOf(kind), x, y, { h: (kind === 'pea' ? 26 : kind === 'boot' ? 52 : 34) * s, anchor: 'center', rot })) return;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(s, s);
    switch (kind) {
      case 'carrot':
        c.beginPath();
        c.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
        c.fillStyle = '#e8843a';
        c.fill();
        ink(c, 1.8);
        c.beginPath();
        c.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
        ink(c, 1.2, '#b85a20');
        break;
      case 'pea':
        c.beginPath();
        c.arc(0, 0, 13, 0, Math.PI * 2);
        c.fillStyle = '#7ab048';
        c.fill();
        ink(c, 1.6);
        c.beginPath();
        c.arc(-3, -3, 3, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,220,0.7)';
        c.fill();
        break;
      case 'dumpling':
        blob(c, 0, 0, 22, 16, 3, 0.1);
        wash(c, '#f6eed6');
        ink(c, 1.8);
        c.beginPath();
        c.moveTo(-10, -12);
        c.quadraticCurveTo(0, -4, 10, -12);
        ink(c, 1.2);
        break;
      case 'mushroom':
        c.beginPath();
        c.ellipse(0, -2, 20, 13, 0, Math.PI, 0);
        c.closePath();
        c.fillStyle = '#9a6a48';
        c.fill();
        ink(c, 1.6);
        poly(c, [[-6, -2], [6, -2], [5, 12], [-5, 12]], 2, 0.3);
        wash(c, '#efe2c8');
        ink(c, 1.4);
        break;
      default: // the old boot
        poly(c, [[-14, -26], [6, -26], [6, 4], [26, 8], [28, 20], [-16, 20]], 4, 0.6);
        wash(c, '#5a4636');
        ink(c, 2);
        c.beginPath();
        c.moveTo(-12, 12);
        c.lineTo(26, 14);
        ink(c, 1.2, '#2a2018');
    }
    c.restore();
  }

  function creature(c, who, x, y, s, mood, t) {
    const bounce = mood > 0 ? Math.abs(Math.sin(t * 14)) * 12 : 0;
    if (drawSprite(c, 'sprites.larkQueue', who + (mood < 0 ? 4 : 0), x, y - bounce, { h: 300 * s })) return;
    const fur = ['#9a7a5a', '#d8ccc0', '#8a6a4a', '#8aa860'][who];
    c.save();
    c.translate(x, y - bounce);
    c.scale(s, s);
    blob(c, 0, -90, 66, 90, who + 1, 0.05);
    wash(c, fur);
    ink(c, 2.2);
    if (who === 0) {
      // a hedgehog's prickles
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * 0.1 - (i / 8) * Math.PI * 0.8;
        c.beginPath();
        c.moveTo(Math.cos(a) * 40, -200 + Math.sin(a) * 40);
        c.lineTo(Math.cos(a) * 78, -200 + Math.sin(a) * 78);
        ink(c, 3, '#5a4030');
      }
    }
    blob(c, 0, -200, 50, 46, who + 4, 0.05);
    wash(c, fur);
    ink(c, 2.2);
    if (who === 1) {
      for (const d of [-1, 1]) {
        blob(c, d * 20, -280, 12, 40, d + 5, 0.06);
        wash(c, fur);
        ink(c, 1.6);
      }
    } else if (who === 2) {
      for (const d of [-1, 1]) {
        c.beginPath();
        c.arc(d * 38, -238, 14, 0, Math.PI * 2);
        c.fillStyle = fur;
        c.fill();
        ink(c, 1.6);
      }
    }
    const ey = who === 3 ? -240 : -208;
    for (const d of [-1, 1]) {
      if (who === 3) {
        c.beginPath();
        c.arc(d * 22, ey, 14, 0, Math.PI * 2);
        c.fillStyle = fur;
        c.fill();
        ink(c, 1.6);
      }
      c.beginPath();
      c.arc(d * (who === 3 ? 22 : 18), ey, 5, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
    }
    c.beginPath();
    if (mood < 0) c.arc(0, -158, 16, Math.PI * 1.15, Math.PI * 1.85);
    else c.arc(0, -186, 13, Math.PI * 0.15, Math.PI * 0.85);
    ink(c, 2.6);
    // a spoon
    c.beginPath();
    c.moveTo(-60, -60);
    c.lineTo(-74, -150);
    ink(c, 4, '#9aa0a8');
    blob(c, -76, -160, 8, 12, 2, 0.05);
    wash(c, '#c0c4c8');
    ink(c, 1.4);
    c.restore();
  }

  function orderBubble(c, t) {
    const cu = g.cust;
    if (!cu || cu.leaving !== undefined) return;
    const keys = Object.keys(cu.order);
    const n = keys.reduce((s, k) => s + cu.order[k], 0);
    const w = Math.max(220, n * 72 + 50);
    const x = BUBBLE_X - w / 2;
    const y = 150;
    blob(c, x + w / 2, y + 50, w / 2, 62, 7, 0.03);
    wash(c, '#fbf6e8', 0.97);
    ink(c, 2.2);
    poly(c, [[x + w - 60, y + 96], [x + w - 20, y + 80], [QUEUE_X[0] - 50, 430]], 3, 0.5);
    wash(c, '#fbf6e8', 0.97);
    ink(c, 1.8);
    let i = 0;
    for (const k of keys) {
      for (let j = 0; j < cu.order[k]; j++) {
        const bx = x + 60 + i * 72;
        const done = j < (cu.got[k] || 0);
        c.save();
        if (done) c.globalAlpha = 0.35;
        bit(c, k, bx, y + 42, 1.5);
        c.restore();
        if (done) label(c, '✓', bx + 14, y + 60, { size: 30, color: PAL.green, weight: 800 });
        i++;
      }
    }
    // patience: a bar under the bubble
    const left = 1 - cu.t / cu.patience;
    poly(c, [[x + 30, y + 92], [x + w - 30, y + 92], [x + w - 30, y + 102], [x + 30, y + 102]], 2, 0.3);
    wash(c, '#e8e0d0');
    c.fillStyle = left < 0.3 ? PAL.brick : left < 0.6 ? PAL.ochre : PAL.green;
    c.fillRect(x + 30, y + 92, (w - 60) * left, 10);
    ink(c, 1.2);
    if (left < 0.3 && Math.sin(t * 10) > 0) label(c, 'Hurry!', x + w / 2, y - 22, { size: 30, color: PAL.brick, weight: 800 });
  }

  function lark(c, t) {
    const [sx, sy] = toScreen(g.u, g.v);
    // how far down the bowl is: hovering, then into the soup and out
    const k = g.dipT > 0 ? (DIP - g.dipT) / DIP : 0;
    const p = g.dipT > 0 ? Math.sin(k * Math.PI) : 0;
    // it hovers well above the ring so the ring's inside stays in view
    const hover = 150 + Math.sin(t * 3) * 6;
    const bottom = sy - hover + p * (hover + 16);
    const pose = g.dipT > 0 ? (k < 0.45 ? 1 : 2) : 0;
    c.save();
    if (!pose) c.globalAlpha = 0.6; // and is see-through while it only hovers
    else if (p > 0.05) {
      // dipping: whatever is below the soup's surface at the ring is hidden
      c.beginPath();
      c.rect(0, 0, W, sy + 4);
      c.clip();
    }
    // the painted poses have the ladle's bowl at the centre of the cell
    if (!drawSprite(c, 'sprites.larkPoses', pose, sx, bottom - 40 * K, { h: SIZE * 1.4, anchor: 'center', whole: true })) {
      // wings: beating while it hovers, swept up as it dips (the portrait has its own)
      const flap = pose ? -0.8 : Math.sin(t * 16) * 0.5;
      for (const d of art('subject.ladlelark') ? [] : [-1, 1]) {
        c.save();
        c.translate(sx + d * 30, bottom - 70 * K);
        c.rotate(d * (0.6 + flap));
        poly(c, [[0, 0], [d * 90, -30], [d * 110, -10], [d * 30, 14]], d + 7, 1);
        wash(c, '#9aa0a8');
        ink(c, 1.6);
        c.restore();
      }
      c.save();
      c.translate(sx, bottom);
      if (pose === 1) c.rotate(0.25); // tipping its bowl into the soup
      // the bowl's bottom, in bird units from the feet: painting (42, -128)
      // (measured on the PNG: 60%, 66.5% of the square, feet at 97.1%), stand-in (20, -90)
      if (art('subject.ladlelark')) drawBird(c, 'ladlelark', { x: -42 * K, y: 128 * K, size: SIZE, t });
      else drawBird(c, 'ladlelark', { x: -20 * K, y: 90 * K, size: SIZE, t });
      c.restore();
      if (pose === 2) {
        // a full bowl, brimming
        c.beginPath();
        c.ellipse(sx, bottom - 80 * K, 70 * K, 12 * K, 0, 0, Math.PI * 2);
        c.fillStyle = '#e2b450';
        c.fill();
        ink(c, 1.4);
      }
    }
    c.restore();
    if (p > 0.05) {
      // a ring of ripples where the bowl went in
      c.beginPath();
      c.ellipse(sx, sy + 4, 60 + p * 30, 14 + p * 8, 0, 0, Math.PI * 2);
      ink(c, 3, 'rgba(255,244,192,0.9)');
    }
  }

  function pot(c, t) {
    const sc = spriteCell('sprites.larkPot', 0);
    if (sc) {
      const w = 2 * (RX + 26);
      const h = (sc.trim.h * w) / sc.trim.w;
      drawSprite(c, 'sprites.larkPot', 0, CX, CY - (RY + 10) + h, { w });
    } else {
      // the stove's flames
      for (let i = 0; i < 7; i++) {
        const fx = CX - 240 + i * 80;
        blob(c, fx, 860 + Math.sin(t * 9 + i) * 4, 18, 30, i, 0.2);
        wash(c, i % 2 ? '#f0a040' : '#e07030', 0.8);
      }
      c.beginPath();
      c.moveTo(CX - RX - 20, CY);
      c.lineTo(CX - RX + 30, CY + 250);
      c.quadraticCurveTo(CX, CY + 320, CX + RX - 30, CY + 250);
      c.lineTo(CX + RX + 20, CY);
      c.closePath();
      c.fillStyle = '#c0703e';
      c.fill();
      ink(c, 2.8);
      c.save();
      c.clip();
      hatch(c, CX - RX - 30, CY, CX + RX + 30, CY + 320, 12, 0.18, 1);
      c.restore();
      for (const d of [-1, 1]) {
        c.beginPath();
        c.ellipse(CX + d * (RX + 30), CY + 70, 34, 18, 0, 0, Math.PI * 2);
        ink(c, 9, '#8a4a2a');
      }
      c.beginPath();
      c.ellipse(CX, CY, RX + 20, RY + 10, 0, 0, Math.PI * 2);
      c.fillStyle = '#a85a30';
      c.fill();
      ink(c, 2.6);
      c.beginPath();
      c.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2);
      c.fillStyle = '#e2b450';
      c.fill();
      ink(c, 2);
    }
    // the swirl's ripples
    c.save();
    c.beginPath();
    c.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2);
    c.clip();
    c.globalAlpha = 0.3;
    for (let i = 1; i <= 4; i++) {
      const r = i * 0.22;
      c.beginPath();
      const a0 = g.spin * (1.25 - 0.6 * r) + i;
      c.ellipse(CX, CY, RX * r, RY * r, 0, a0, a0 + 2.2);
      ink(c, 2, '#a07020');
    }
    c.restore();
  }

  g.draw = (c, t) => {
    scene(c, 'ladlelark', W, H, (c) => {
      // a soup kitchen: tiled wall, a window, a hatch with a counter
      c.save();
      c.globalAlpha = 0.25;
      c.strokeStyle = PAL.slate;
      c.lineWidth = 1.5;
      for (let y = 0; y < 640; y += 60) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(W, y);
        c.stroke();
      }
      for (let x = 0; x < W; x += 60) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, 640);
        c.stroke();
      }
      c.restore();
      band(c, 0, 0, W, 640, '#e8e4d0', 0.35, 1);
      poly(c, [[160, 110], [460, 110], [460, 330], [160, 330]], 2, 1);
      wash(c, PAL.sky, 0.8);
      ink(c, 2.4);
      c.beginPath();
      c.moveTo(310, 110);
      c.lineTo(310, 330);
      c.moveTo(160, 220);
      c.lineTo(460, 220);
      ink(c, 3, '#8a6a4a');
      // the stove
      poly(c, [[CX - 340, 820], [CX + 340, 820], [CX + 340, H], [CX - 340, H]], 3, 1);
      wash(c, '#4a4440');
      ink(c, 2.4);
      // the serving counter on the right
      poly(c, [[1110, 740], [W, 740], [W, H], [1110, H]], 4, 1);
      wash(c, PAL.wafer);
      ink(c, 2.4);
      poly(c, [[1110, 740], [W, 740], [W, H], [1110, H]], 4, 1);
      hatch(c, 1110, 740, W, H, 16, 0.18, 1);
      band(c, 0, 640, 1110, H - 640, '#c8bca0', 0.6, 5);
    });

    // queue: the two behind, then the one at the front
    for (let i = 2; i >= 1; i--) {
      if (g.queue[i - 1] !== undefined) creature(c, g.queue[i - 1], QUEUE_X[i], 740, 0.8 - i * 0.06, 0, t);
    }
    const cu = g.cust;
    if (cu) {
      const slide = cu.leaving !== undefined ? (0.9 - cu.leaving) * 300 : cu.arrive * 240;
      c.save();
      if (cu.leaving !== undefined) c.globalAlpha = clamp(cu.leaving * 1.5, 0, 1);
      creature(c, cu.who, QUEUE_X[0] + slide, 760, 0.9, cu.mood, t);
      c.restore();
    }

    // the bowl on the counter, and what's in it
    if (!drawSprite(c, 'sprites.larkPot', 1, BOWL.x, BOWL.y + 46, { w: 190 })) {
      c.beginPath();
      c.moveTo(BOWL.x - 92, BOWL.y);
      c.quadraticCurveTo(BOWL.x, BOWL.y + 100, BOWL.x + 92, BOWL.y);
      c.closePath();
      c.fillStyle = '#d8b088';
      c.fill();
      ink(c, 2.4);
      c.beginPath();
      c.ellipse(BOWL.x, BOWL.y, 92, 18, 0, 0, Math.PI * 2);
      c.fillStyle = '#e2b450';
      c.fill();
      ink(c, 2);
    }
    if (cu && cu.leaving === undefined) cu.bowl.forEach((k, i) => bit(c, k, BOWL.x - 50 + (i % 5) * 25, BOWL.y - 2 + Math.floor(i / 5) * 8, 0.9, i));

    pot(c, t);

    // the bits, swirling
    c.save();
    c.beginPath();
    c.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2);
    c.clip();
    const sorted = [...g.bits].sort((a, b) => g.where(a)[1] - g.where(b)[1]);
    for (const b of sorted) {
      const [u, v] = g.where(b);
      const [x, y] = toScreen(u, v);
      const s = 1.25 + 0.35 * (v + 1) * 0.5; // nearer is a little bigger
      bit(c, b.kind, x, y + Math.sin(t * 2 + b.ph) * 2 + (1 - b.born) * -40, s * (0.4 + 0.6 * b.born), b.a * 0.5);
    }
    c.restore();

    // the ring the ladle will scoop
    const [rx, ry] = toScreen(g.u, g.v);
    c.save();
    c.setLineDash([10, 8]);
    c.beginPath();
    c.ellipse(rx, ry, RX * CATCH, RY * CATCH, 0, 0, Math.PI * 2);
    ink(c, 3, g.dipT > 0 ? '#ffffff' : 'rgba(59,43,32,0.75)');
    c.restore();
    for (const s of g.splashes) {
      c.save();
      c.globalAlpha = s.life * 1.6;
      c.beginPath();
      c.ellipse(s.x, s.y, 40 + (0.5 - s.life) * 160, 14 + (0.5 - s.life) * 50, 0, 0, Math.PI * 2);
      ink(c, 2.4, '#fff4c0');
      c.restore();
    }

    lark(c, t);

    // bits flying over to the bowl
    for (const f of g.flyers) {
      const x = lerp(f.x0, BOWL.x, f.t);
      const y = lerp(f.y0, BOWL.y - 10, f.t) - Math.sin(f.t * Math.PI) * 160;
      bit(c, f.kind, x, y, 1, f.t * 6);
    }

    orderBubble(c, t);

    for (const p of g.pops) {
      const k = Math.min(1, (1.3 - p.life) * 8);
      const s = 0.6 + 0.4 * k;
      c.save();
      c.globalAlpha = Math.min(1, p.life * 2);
      c.translate(p.x, p.y);
      c.scale(s, s);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.92)';
      c.font = `800 ${p.size}px Fraunces, Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeText(p.text, 0, 0);
      label(c, p.text, 0, 0, { size: p.size, color: p.color, weight: 800 });
      c.restore();
    }

    if (g.elapsed < 4) {
      c.save();
      c.globalAlpha = Math.min(1, 4 - g.elapsed);
      c.lineWidth = 8;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = '700 34px Fraunces, Georgia, serif';
      c.textAlign = 'center';
      c.strokeText('Put the ring round what they asked for · press to dip', CX, 360);
      label(c, 'Put the ring round what they asked for · press to dip', CX, 360, { size: 34, weight: 700 });
      c.restore();
    }
  };

  // On a narrow screen: keep the ladle and the pot in view.
  g.focus = () => 690;
  g.span = 920;

  return g;
}

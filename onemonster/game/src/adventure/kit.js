// The side-scroll kit shared by the Adventure's boards (design/adventure.md):
// the camera, the backdrop panels, platforming bodies against solid ground,
// the ground drawn from the delivered ground pieces or in ink, pickups,
// particles, the route strip and the hint lines.
//
// Coordinates. A board's world is `worldW` wide and 1080 high, with y down.
// The camera's x is the world x at the left edge of the screen. Draw the world
// between cam.begin(g) and cam.end(g); draw anything fixed to the screen (the
// route strip, hints) after. A body's (x, y) is the middle of its feet.

import * as art from '../art.js';

export const W = 1920;
export const H = 1080;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
// Ease v toward target at `rate` per second, frame-rate independent.
export const ease = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));
// Move v toward target by at most step.
export const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

// A small deterministic hash noise in 0..1, for wobbly ink edges that do not
// shimmer from frame to frame.
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ---------- camera ----------

// Follows a point with a lead in the direction of travel. `lookUp` biases the
// view; boards are 1080 high, so the camera moves across only (y is for shake).
export function makeCamera(worldW, { lead = 280, anchor = 0.38, rate = 3.2 } = {}) {
  const cam = {
    x: 0, y: 0, worldW, lead, anchor, rate,
    leadNow: 0, shakeT: 0, shakeA: 0, sx: 0, sy: 0,
    follow(px, vx, dt, snap = false) {
      const want = Math.abs(vx) > 60 ? Math.sign(vx) * cam.lead : cam.leadNow * 0.98;
      cam.leadNow = snap ? want : ease(cam.leadNow, want, 1.6, dt);
      const target = clamp(px - W * cam.anchor + cam.leadNow, 0, Math.max(0, cam.worldW - W));
      cam.x = snap ? target : ease(cam.x, target, cam.rate, dt);
      cam.x = clamp(cam.x, 0, Math.max(0, cam.worldW - W));
      cam.shakeT = Math.max(0, cam.shakeT - dt);
      const a = cam.shakeT > 0 ? cam.shakeA * (cam.shakeT / 0.4) : 0;
      cam.sx = a ? (Math.random() - 0.5) * 2 * a : 0;
      cam.sy = a ? (Math.random() - 0.5) * 2 * a : 0;
    },
    shake(amount = 12, reduceMotion = false) {
      cam.shakeT = 0.4;
      cam.shakeA = reduceMotion ? amount * 0.25 : amount;
    },
    begin(g) {
      g.save();
      g.translate(-Math.round(cam.x) + cam.sx, cam.sy);
    },
    end(g) { g.restore(); },
    // Is the world span [x0, x1] on screen (with a margin)?
    sees(x0, x1 = x0, margin = 200) { return x1 >= cam.x - margin && x0 <= cam.x + W + margin; },
    screenX(x) { return x - cam.x; },
  };
  return cam;
}

// ---------- backdrop ----------

// The board's far layer: its three backdrop panels side by side, each blended
// into the next over `blend` px, scrolled so the first panel's left edge shows
// at the world's start and the last panel's right edge at its end. Until they
// are delivered, the stand-in scene (a minigame painting) is repeated,
// mirrored every other time, at the same slow speed.
export function drawBackdrop(g, cam, { panels = [], standin = null, blend = 280, dim = 0 } = {}) {
  const imgs = panels.map((k) => art.image(k));
  const have = imgs.length && imgs.every(Boolean);
  if (have) {
    const step = W - blend;
    const span = step * (imgs.length - 1) + W;
    const f = cam.worldW > W ? (span - W) / (cam.worldW - W) : 0;
    const off = cam.x * f;
    for (let i = 0; i < imgs.length; i++) {
      const x = i * step - off;
      if (x > W || x + W < 0) continue;
      if (i === 0) { g.drawImage(imgs[i], x, 0, W, H); continue; }
      // Fade this panel in over the blend strip, in slices.
      const n = 14;
      const sw = blend / n;
      for (let s = 0; s < n; s++) {
        g.globalAlpha = (s + 0.5) / n;
        const srcW = (imgs[i].width * sw) / W;
        g.drawImage(imgs[i], (imgs[i].width * s * sw) / W, 0, srcW, imgs[i].height, x + s * sw, 0, sw + 0.6, H);
      }
      g.globalAlpha = 1;
      const srcX = (imgs[i].width * blend) / W;
      g.drawImage(imgs[i], srcX, 0, imgs[i].width - srcX, imgs[i].height, x + blend, 0, W - blend, H);
    }
  } else {
    const img = standin ? art.image(standin) : null;
    if (img) {
      const off = cam.x * 0.3;
      const i0 = Math.floor(off / W);
      for (let i = i0; i <= i0 + 1; i++) {
        const x = i * W - off;
        g.save();
        if (i % 2) { g.translate(x + W, 0); g.scale(-1, 1); g.drawImage(img, 0, 0, W, H); }
        else g.drawImage(img, x, 0, W, H);
        g.restore();
      }
    } else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#d9c8dc'); gr.addColorStop(0.6, '#e8dcc4'); gr.addColorStop(1, '#a8a070');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }
  }
  if (dim) { g.fillStyle = `rgba(40,25,30,${dim})`; g.fillRect(0, 0, W, H); }
}

// A wash over the backdrop so the play layer stands out (call after drawBackdrop).
export function haze(g, colour = 'rgba(243,233,210,0.18)') {
  g.fillStyle = colour;
  g.fillRect(0, 0, W, H);
}

// ---------- solids and bodies ----------
//
// A solid is { x, y, w, h } with y its top, optionally { oneWay: true } (stand
// on it from above, pass through from below and the sides), { vx, vy } (a
// moving platform: set them, and move x, y yourself before stepping bodies)
// and anything the board wants (kind, sprite...). Ground is a solid that runs
// down past the bottom of the world; a hole is a gap between two of them.

export function makeBody({ x = 0, y = 0, w = 100, h = 180, ...rest } = {}) {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, ground: null, wasOnGround: false,
    hitWall: 0, hitHead: false, fellIn: false, ...rest };
}

export const bodyRect = (b) => ({ x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h });
export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const near = (ax, ay, bx, by, r) => (ax - bx) ** 2 + (ay - by) ** 2 <= r * r;

// Move a body by its velocity through the solids, x then y. Returns events:
// { landed: speed of landing or 0, bumped: wall side -1/1 or 0, head: bool }.
// opts: gravity (px/s^2, 0 for swimmers and fliers), maxFall, dropThrough
// (true: fall through one-way solids this step).
export function stepBody(b, solids, dt, { gravity = 3000, maxFall = 2200, dropThrough = false } = {}) {
  const ev = { landed: 0, bumped: 0, head: false };
  b.wasOnGround = b.onGround;
  // Ride a moving platform.
  if (b.onGround && b.ground && (b.ground.vx || b.ground.vy)) {
    b.x += (b.ground.vx || 0) * dt;
    b.y += (b.ground.vy || 0) * dt;
  }
  if (gravity) b.vy = Math.min(maxFall, b.vy + gravity * dt);
  // X
  b.x += b.vx * dt;
  b.hitWall = 0;
  for (const s of solids) {
    if (s.oneWay || s.ghost) continue;
    const r = bodyRect(b);
    if (!overlaps(r, s)) continue;
    // Only push out sideways if the overlap is mostly sideways (not a floor step).
    if (r.y + r.h - s.y <= 14 && b.vy >= 0) { b.y = s.y; continue; } // step up a small lip
    if (b.x < s.x + s.w / 2) { b.x = s.x - b.w / 2 - 0.01; b.hitWall = 1; }
    else { b.x = s.x + s.w + b.w / 2 + 0.01; b.hitWall = -1; }
    ev.bumped = b.hitWall;
    b.vx = 0;
  }
  // Y
  const prevBottom = b.y;
  b.y += b.vy * dt;
  b.onGround = false;
  b.hitHead = false;
  let ground = null;
  for (const s of solids) {
    if (s.ghost) continue;
    const r = bodyRect(b);
    if (!overlaps(r, s)) continue;
    if (s.oneWay) {
      if (dropThrough || b.vy < 0 || prevBottom > s.y + 2) continue;
    }
    if (b.vy >= 0 && prevBottom <= s.y + 16 + Math.max(0, b.vy * dt)) {
      b.y = s.y;
      if (!b.wasOnGround) ev.landed = Math.max(1, b.vy);
      b.vy = 0;
      b.onGround = true;
      ground = s;
    } else if (b.vy < 0 && !s.oneWay) {
      b.y = s.y + s.h + b.h;
      b.vy = 0;
      b.hitHead = true;
      ev.head = true;
    }
  }
  // Still standing on what we stood on (walking off an edge drops us).
  if (!b.onGround && b.wasOnGround && b.vy >= 0 && gravity) {
    for (const s of solids) {
      if (s.ghost || (s.oneWay && dropThrough)) continue;
      if (Math.abs(b.y - s.y) < 2 && b.x + b.w / 2 > s.x && b.x - b.w / 2 < s.x + s.w) { b.onGround = true; ground = s; break; }
    }
  }
  b.ground = ground;
  b.fellIn = b.y - b.h > H + 40;
  return ev;
}

// The top of the solid ground under world x (the highest solid surface at or
// below y0), or null over a hole.
export function groundAt(solids, x, y0 = -Infinity) {
  let best = null;
  for (const s of solids) {
    if (s.ghost || x < s.x || x > s.x + s.w || s.y < y0) continue;
    if (best === null || s.y < best) best = s.y;
  }
  return best;
}

// The usual walker: run with acceleration, sprint, jump with coyote time, a
// jump buffer and variable height (let go early for a short hop). The board
// passes its own numbers. Returns { jumped }.
//   p = { speed, sprint, accel, decel, airAccel, jump, jumpCut = 0.45,
//         coyote = 0.1, buffer = 0.13 }
export function walkerControl(b, inp, dt, p) {
  const ev = { jumped: false };
  const top = inp.sprint ? p.sprint ?? p.speed : p.speed;
  const want = (inp.x || 0) * top;
  const acc = b.onGround ? (want === 0 || Math.sign(want) !== Math.sign(b.vx) ? p.decel ?? p.accel : p.accel) : p.airAccel ?? p.accel * 0.6;
  b.vx = approach(b.vx, want, acc * dt);
  b.coyote = b.onGround ? (p.coyote ?? 0.1) : Math.max(0, (b.coyote || 0) - dt);
  b.buffer = inp.actionPressed ? (p.buffer ?? 0.13) : Math.max(0, (b.buffer || 0) - dt);
  if (b.buffer > 0 && b.coyote > 0 && p.jump) {
    b.vy = -p.jump;
    b.coyote = 0;
    b.buffer = 0;
    b.onGround = false;
    b.jumping = true;
    ev.jumped = true;
  }
  if (b.jumping && !inp.action && b.vy < 0) { b.vy *= p.jumpCut ?? 0.45; b.jumping = false; }
  if (b.vy >= 0) b.jumping = false;
  return ev;
}

// ---------- drawing the ground ----------

// The ground pieces of a place come on one sheet (terrain.<place>, see
// image-requests.md, OM-G). Item 1 is always the long strip whose top edge is
// the walking surface. Draw a solid's top with it, tiled and mirrored every
// other copy so the joins match; below the strip, `fill` covers the rest. If
// the sheet has not arrived, `standin` draws it in ink.
//   opts = { sheet: 'terrain.lane', item: 1, height: 240 (on screen), lift: 0
//            (how far the strip's top sits above the surface: grass tufts),
//            fill: '#5a4630', standin: { top, body, ink } }
export function drawGround(g, cam, s, opts = {}) {
  const x0 = Math.max(s.x, cam.x - 40);
  const x1 = Math.min(s.x + s.w, cam.x + W + 40);
  if (x1 <= x0) return;
  const sp = opts.sheet ? art.sprite(opts.sheet, opts.item ?? 1) : null;
  const bottom = Math.min(s.y + s.h, H + 60);
  if (sp) {
    const h = opts.height ?? 240;
    const k = h / sp.h;
    const tw = sp.w * k;
    const lift = opts.lift ?? 0;
    if (opts.fill && bottom > s.y + h - lift - 4) {
      g.fillStyle = opts.fill;
      g.fillRect(x0, s.y + h - lift - 6, x1 - x0, bottom - (s.y + h - lift - 6));
    }
    g.save();
    g.beginPath(); g.rect(s.x, s.y - lift - 80, s.w, h + 160); g.clip();
    const i0 = Math.floor((x0 - s.x) / tw);
    for (let i = i0; s.x + i * tw < x1; i++) {
      const x = s.x + i * tw;
      if (i % 2) art.drawSprite(g, sp, x + tw, s.y - lift, { scale: k, ax: 0, ay: 0, flip: true });
      else art.drawSprite(g, sp, x, s.y - lift, { scale: k, ax: 0, ay: 0 });
    }
    g.restore();
    return;
  }
  inkGround(g, s, x0, x1, bottom, opts.standin || {});
}

// Ground in ink: a filled body under a wobbly grassy edge, with hatching.
export function inkGround(g, s, x0, x1, bottom, { top = '#7d8a4a', body = '#8a6a44', ink = '#2b1d14', tufts = true } = {}) {
  const step = 24;
  const edge = (x) => s.y + (hash(Math.floor(x / step) + s.x * 0.013) - 0.5) * 6;
  g.save();
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(x0, bottom);
  for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) g.lineTo(clamp(x, x0, x1), edge(x));
  g.lineTo(x1, bottom);
  g.closePath();
  g.fill();
  // Hatching in the body.
  g.strokeStyle = 'rgba(43,29,20,0.22)';
  g.lineWidth = 2;
  g.beginPath();
  for (let x = Math.floor(x0 / 38) * 38; x < x1; x += 38) {
    for (let y = s.y + 40 + hash(x) * 30; y < bottom; y += 70) {
      g.moveTo(x, y); g.lineTo(x + 22, y + 16);
    }
  }
  g.stroke();
  // The grassy top band.
  g.fillStyle = top;
  g.beginPath();
  g.moveTo(x0, s.y + 26);
  for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) g.lineTo(clamp(x, x0, x1), edge(x) - (tufts ? hash(x * 0.7) * 10 : 0));
  g.lineTo(x1, s.y + 26);
  g.closePath();
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = 3.5;
  g.beginPath();
  for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) {
    const xx = clamp(x, x0, x1);
    if (x === Math.floor(x0 / step) * step) g.moveTo(xx, edge(x)); else g.lineTo(xx, edge(x));
  }
  g.stroke();
  if (tufts) {
    g.lineWidth = 2;
    g.beginPath();
    for (let x = Math.floor(x0 / 31) * 31; x < x1; x += 31) {
      if (hash(x * 1.3) < 0.45) continue;
      const y = edge(x);
      g.moveTo(x, y); g.lineTo(x - 4, y - 12);
      g.moveTo(x + 5, y); g.lineTo(x + 7, y - 14);
    }
    g.stroke();
  }
  // The ends of a raised piece get an ink side.
  g.lineWidth = 3.5;
  g.beginPath();
  if (s.x >= x0 - 1) { g.moveTo(s.x, s.y); g.lineTo(s.x, bottom); }
  if (s.x + s.w <= x1 + 1) { g.moveTo(s.x + s.w, s.y); g.lineTo(s.x + s.w, bottom); }
  g.stroke();
  g.restore();
}

// A floating ledge or plank in ink (for one-way platforms until art arrives).
export function inkLedge(g, s, { fill = '#8a6a44', ink = '#2b1d14', top = null } = {}) {
  g.save();
  g.fillStyle = fill;
  g.strokeStyle = ink;
  g.lineWidth = 3.5;
  g.beginPath();
  g.roundRect ? g.roundRect(s.x, s.y, s.w, Math.min(s.h, 46), 10) : g.rect(s.x, s.y, s.w, Math.min(s.h, 46));
  g.fill();
  g.stroke();
  if (top) { g.fillStyle = top; g.fillRect(s.x + 4, s.y + 2, s.w - 8, 10); }
  g.restore();
}

// A sprite from a sheet, or the stand-in drawing when it has not arrived:
//   sprite(g, 'adv.b01.props', 3, x, y, { height: 120 }, () => { ...ink... })
// The stand-in is drawn in the same place and should be about the same size.
export function sprite(g, sheet, item, x, y, opts, standin) {
  if (art.drawSprite(g, art.sprite(sheet, item), x, y, opts)) return true;
  standin?.(g, x, y, opts);
  return false;
}

// ---------- pickups ----------

// Collectibles: [{ x, y, kind? }] in world units. update() collects those
// within reach of (px, py) and returns how many were got this frame (each is
// marked got, with a little fly-up animation drawn by draw()).
export function makePickups(list, { radius = 70 } = {}) {
  const items = list.map((p, i) => ({ ...p, got: false, t: 0, seed: i * 1.7 }));
  return {
    items,
    radius,
    get total() { return items.length; },
    get count() { return items.filter((p) => p.got).length; },
    update(dt, px, py, r = radius) {
      let n = 0;
      for (const p of items) {
        if (p.got) { p.t += dt; continue; }
        if (p.vx || p.vy) { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; }
        if (near(p.x, p.y, px, py, r)) { p.got = true; p.t = 0; n++; }
      }
      return n;
    },
    // draw(g, cam, t, (g, p, x, y, alpha, t) => ...) draws each one, bobbing.
    draw(g, cam, t, fn, { bob = 10 } = {}) {
      for (const p of items) {
        if (!cam.sees(p.x)) continue;
        if (p.got && p.t > 0.5) continue;
        const y = p.y + (p.got ? -p.t * 260 : Math.sin(t * 2.6 + p.seed) * bob);
        fn(g, p, p.x, y, p.got ? 1 - p.t / 0.5 : 1, t);
      }
    },
  };
}

// ---------- particles and pops ----------

export function makeParticles() {
  const ps = [];
  return {
    ps,
    // A puff of dust, a splash, sparkles: n bits from (x, y).
    burst(x, y, { n = 10, colour = '#e8dcc4', speed = 260, up = 0.6, size = 12, life = 0.6, gravity = 600, ink = true } = {}) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * (2 - up * 1.6);
        const v = speed * (0.4 + Math.random() * 0.8);
        ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: size * (0.6 + Math.random() * 0.8), life, t: 0, colour, gravity, ink });
      }
    },
    // A word that pops up and floats away: "+1", "SNAP!", "Bump!".
    pop(x, y, text, { colour = '#33241a', size = 48, life = 1 } = {}) {
      ps.push({ x, y, vx: 0, vy: -90, text, colour, size, life, t: 0, gravity: 0 });
    },
    update(dt) {
      for (const p of ps) {
        p.t += dt;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = ps.length - 1; i >= 0; i--) if (ps[i].t >= ps[i].life) ps.splice(i, 1);
    },
    draw(g) {
      for (const p of ps) {
        const a = 1 - p.t / p.life;
        g.save();
        g.globalAlpha = Math.max(0, a);
        if (p.text) {
          g.font = `800 ${p.size}px Fraunces, Georgia, serif`;
          g.textAlign = 'center';
          g.lineWidth = 8;
          g.strokeStyle = 'rgba(248,241,224,0.95)';
          g.strokeText(p.text, p.x, p.y);
          g.fillStyle = p.colour;
          g.fillText(p.text, p.x, p.y);
        } else {
          g.fillStyle = p.colour;
          g.beginPath();
          g.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
          g.fill();
          if (p.ink) { g.strokeStyle = 'rgba(43,29,20,0.6)'; g.lineWidth = 2; g.stroke(); }
        }
        g.restore();
      }
    },
  };
}

// ---------- screen overlays ----------

// The route strip at the top of the screen: the board's way from left to right,
// the sections' signposts, where you are and where the letter is.
//   route(g, { you: 0..1, letter: 0..1 or null, signs: [0..1], youColour })
export function route(g, { you = 0, letter = null, signs = [], label = '' } = {}) {
  const w = 720, x0 = (W - w) / 2, y = 112;
  g.save();
  g.globalAlpha = 0.9;
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(248,241,224,0.9)';
  g.lineWidth = 16;
  g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke();
  g.strokeStyle = '#33241a';
  g.lineWidth = 4;
  g.setLineDash([14, 10]);
  g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#33241a';
  for (const s of signs) {
    g.fillRect(x0 + s * w - 2, y - 18, 4, 18);
    g.fillRect(x0 + s * w - 2, y - 18, 14, 8);
  }
  if (letter !== null) {
    const lx = x0 + clamp(letter, 0, 1) * w;
    g.fillStyle = '#fbf6e8';
    g.strokeStyle = '#33241a';
    g.lineWidth = 3;
    g.fillRect(lx - 16, y - 12, 32, 22); g.strokeRect(lx - 16, y - 12, 32, 22);
    g.beginPath(); g.moveTo(lx - 16, y - 12); g.lineTo(lx, y + 1); g.lineTo(lx + 16, y - 12); g.stroke();
    g.fillStyle = '#b3402e'; g.fillRect(lx + 7, y - 9, 6, 7);
  }
  const px = x0 + clamp(you, 0, 1) * w;
  g.fillStyle = '#f2c53d';
  g.strokeStyle = '#33241a';
  g.lineWidth = 4;
  g.beginPath(); g.arc(px, y, 13, 0, Math.PI * 2); g.fill(); g.stroke();
  if (label) {
    g.font = '700 26px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(248,241,224,0.95)';
    g.strokeText(label, W / 2, y + 44);
    g.fillStyle = '#33241a';
    g.fillText(label, W / 2, y + 44);
  }
  g.restore();
}

// A line of text across the top middle of the screen (the shell keeps it on
// screen on a phone held upright: keep x = W / 2 and textAlign centre).
export function hint(g, text, { y = 210, alpha = 1, size = 40 } = {}) {
  if (!text || alpha <= 0) return;
  g.save();
  g.globalAlpha = alpha;
  g.font = `700 ${size}px Fraunces, Georgia, serif`;
  g.textAlign = 'center';
  g.lineWidth = 9;
  g.strokeStyle = 'rgba(248,241,224,0.95)';
  g.fillStyle = '#33241a';
  g.strokeText(text, W / 2, y);
  g.fillText(text, W / 2, y);
  g.restore();
}

// Hints that show one at a time as the player reaches them:
//   const hints = makeHints([{ x: 0, text: 'Hop with Action' }, { x: 2400, text: '...' }])
//   hints.update(dt, player.x); hints.draw(g)
export function makeHints(list, { show = 4 } = {}) {
  const items = list.map((h) => ({ ...h, t: -1 }));
  let cur = null;
  return {
    update(dt, px) {
      for (const h of items) if (h.t < 0 && px >= h.x) { h.t = 0; cur = h; }
      if (cur) cur.t += dt;
      if (cur && cur.t > (cur.show ?? show)) cur = null;
    },
    // Show a one-off line now (a reminder after a mistake).
    say(text, secs = 2.5) { cur = { text, t: 0, show: secs }; },
    draw(g) {
      if (!cur) return;
      const s = cur.show ?? show;
      const a = Math.min(1, cur.t * 4, (s - cur.t) * 2);
      hint(g, cur.text, { alpha: a });
    },
  };
}

// Signposts: the places a fall or a catch sends you back to.
//   const cps = makeCheckpoints([0, 2400, 5200]); cps.reach(px); cps.last -> x
export function makeCheckpoints(xs) {
  const list = [...xs].sort((a, b) => a - b);
  return {
    list,
    last: list[0] ?? 0,
    reach(px) { for (const x of list) if (px >= x) this.last = x; return this.last; },
    // Fractions of the world for the route strip.
    fracs(worldW) { return list.slice(1).map((x) => x / worldW); },
  };
}

// A board's clock: seconds left, Gentle mode adding time.
export function boardTime(env, secs) { return secs + (env.gentle?.[0] ? Math.round(secs * 0.3) : 0); }

// Postmarks for a board (design/adventure.md): one for the snatch, one for most
// of the collectibles, one for the board's feat. The holder's mark is unused in
// the Adventure (no versus) but kept for the contract.
export function boardMarks({ snatched, got = 0, total = 1, need = 0.6, feat = false }) {
  if (!snatched) return [0, 0];
  return [1 + (total > 0 && got / total >= need ? 1 : 0) + (feat ? 1 : 0), 0];
}

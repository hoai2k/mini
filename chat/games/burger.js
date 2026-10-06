// Burger Stack: ingredients fall from the sky and you catch them on a bottom
// bun by moving your head left and right (or drag, arrow keys, controller
// stick, or tilting your phone). Caught ingredients stack up and the stack
// sways more the higher it gets; sway too much and the top ingredient topples
// off. Dodge the old boots and fish. Catch the top bun to finish the burger
// and bank its height as points, then start the next one, faster. Three
// ingredients that hit the ground end the game.
//
// Everyone plays their own copy. Scores and stack heights go in setState for
// the little leaderboard; the best score is kept on this device.

const MAX_DROPS = 3;
const FONT = 'ui-rounded, system-ui, sans-serif';
const ASPECT = 192 / 512;     // ingredient art is 512 x 192
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const initial = name => (String(name || '?').trim()[0] || '?').toUpperCase();

const KINDS = ['patty', 'cheese', 'lettuce', 'tomato'];
const ART = {
  top: 'burger-bun-top', bottom: 'burger-bun-bottom', patty: 'burger-patty',
  cheese: 'burger-cheese', lettuce: 'burger-lettuce', tomato: 'burger-tomato',
};
// Vertical space an ingredient takes in the stack, as a fraction of its height.
const THICK = { top: 0.8, bottom: 0.9, patty: 0.5, cheese: 0.3, lettuce: 0.34, tomato: 0.38 };

// --- stand-in art ---------------------------------------------------------

function blob(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, h * 0.06);
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

// Draws one ingredient centred on (x, y) with width w; y is the middle of its slab.
function drawIngredient(ctx, kind, x, y, w) {
  const h = w * ASPECT;
  ctx.save();
  ctx.translate(x - w / 2, y - h / 2);
  if (kind === 'top') {
    ctx.beginPath();
    ctx.moveTo(w * 0.04, h * 0.85);
    ctx.bezierCurveTo(w * 0.02, -h * 0.25, w * 0.98, -h * 0.25, w * 0.96, h * 0.85);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffc266');
    g.addColorStop(1, '#e8892b');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(2, h * 0.05);
    ctx.strokeStyle = '#a85a14';
    ctx.stroke();
    ctx.fillStyle = '#fff4d6';
    for (const [sx, sy, a] of [[0.3, 0.3, 0.5], [0.5, 0.18, 0], [0.7, 0.3, -0.5], [0.4, 0.5, 0.2], [0.62, 0.5, -0.2]]) {
      ctx.beginPath();
      ctx.ellipse(w * sx, h * sy, w * 0.025, w * 0.014, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(w * 0.3, h * 0.28, w * 0.1, h * 0.07, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'bottom') {
    blob(ctx, w * 0.04, h * 0.2, w * 0.92, h * 0.6, h * 0.3, '#f0a040', '#a85a14');
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(w * 0.12, h * 0.3, w * 0.3, h * 0.07);
  } else if (kind === 'patty') {
    blob(ctx, w * 0.02, h * 0.15, w * 0.96, h * 0.7, h * 0.3, '#7a3f1d', '#3d1c0a');
    ctx.strokeStyle = '#4a230d';
    ctx.lineWidth = Math.max(2, h * 0.07);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.18 + i * 0.16), h * 0.3);
      ctx.lineTo(w * (0.1 + i * 0.16), h * 0.7);
      ctx.stroke();
    }
  } else if (kind === 'cheese') {
    ctx.beginPath();
    ctx.moveTo(w * 0.02, h * 0.3);
    ctx.lineTo(w * 0.98, h * 0.3);
    ctx.lineTo(w * 0.98, h * 0.55);
    ctx.lineTo(w * 0.84, h * 0.55);
    ctx.lineTo(w * 0.8, h * 0.85);
    ctx.lineTo(w * 0.7, h * 0.55);
    ctx.lineTo(w * 0.3, h * 0.55);
    ctx.lineTo(w * 0.24, h * 0.75);
    ctx.lineTo(w * 0.18, h * 0.55);
    ctx.lineTo(w * 0.02, h * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#ffd43b';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, h * 0.05);
    ctx.strokeStyle = '#c9961a';
    ctx.stroke();
  } else if (kind === 'lettuce') {
    ctx.beginPath();
    ctx.moveTo(0, h * 0.45);
    for (let i = 0; i <= 12; i++) ctx.lineTo((w * i) / 12, h * (i % 2 ? 0.8 : 0.35));
    ctx.lineTo(w, h * 0.55);
    ctx.lineTo(0, h * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#69db7c';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, h * 0.05);
    ctx.strokeStyle = '#2f9e44';
    ctx.stroke();
  } else if (kind === 'tomato') {
    for (const cx of [0.27, 0.73]) {
      ctx.beginPath();
      ctx.ellipse(w * cx, h * 0.5, w * 0.22, h * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5a4d';
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, h * 0.05);
      ctx.strokeStyle = '#b32d22';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(w * (cx - 0.07), h * 0.38, w * 0.07, h * 0.08, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Kitchen backdrop: warm gradient, checkered tiles, a counter at the bottom.
function drawKitchen(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ff9ec7');
  g.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const t = Math.max(28, w / 10);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let y = 0, r = 0; y < h; y += t, r++) {
    for (let x = (r % 2) * t; x < w; x += t * 2) ctx.fillRect(x, y, t, t);
  }
}

export default {
  id: 'burger',
  name: 'Burger Stack',
  emoji: '🍔',
  blurb: 'Move your head to catch the fixings. Dodge the boots.',
  minPlayers: 1,
  maxPlayers: 8,
  needsFace: true,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    let best = api.store.get('best', 0);
    let w = 0, h = 0, dpr = 1, inset = { top: 0, bottom: 0 };
    let raf = 0, last = performance.now(), clock = 0;

    // Game state.
    let g = null;
    // Input state: absolute pointer target, held keys, pad stick.
    let pointerX = null, pointerDown = false;
    const keys = { left: false, right: false };
    let padX = 0;
    let lastManual = -10;      // clock time of the last drag / key / stick use
    let askedMotion = false;

    function newGame() {
      return {
        x: w / 2, target: w / 2, vx: 0, ax: 0, sway: 0, swayV: 0,
        stack: [],              // placed ingredients: { kind, ox } (ox: offset from the bun centre)
        falling: [],            // { kind, x, wy, vy, junk, spin }
        debris: [],             // toppled or served bits: { kind, x, y, vx, vy, rot, vr, wy? }
        served: [],             // finished burgers sliding away
        drops: 0, score: 0, burgers: 0, items: 0,
        spawnIn: 1.4, topAt: 5 + Math.floor(Math.random() * 3),
        camY: 0, over: false, floaters: [], shake: 0, wobbleWarn: 0,
      };
    }

    api.setState({ score: 0, stack: 0, best });

    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      if (g) g.x = g.target = clamp(g.x, 0, w);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();
    g = newGame();

    // --- geometry --------------------------------------------------------
    const itemW = () => clamp(w * 0.3, 78, 190);
    const itemH = () => itemW() * ASPECT;
    const baseY = () => h - inset.bottom - 10;                        // bottom of the bottom bun
    const slab = kind => itemH() * THICK[kind];                       // vertical step per ingredient
    // Height of the top of the stack above the base line.
    function stackHeight() {
      let hh = slab('bottom');
      for (const s of g.stack) hh += slab(s.kind);
      return hh;
    }
    // Horizontal offset at a height above the base, from the sway.
    const swayAt = height => g.sway * height;
    const screenY = wy => baseY() + g.camY - wy;
    // x of the stack's top item right now.
    function topX() {
      const top = g.stack[g.stack.length - 1];
      return g.x + (top ? top.ox : 0) + swayAt(stackHeight());
    }

    // --- play ------------------------------------------------------------
    const speedNow = () => clamp(1 + g.burgers * 0.14 + g.items * 0.012, 1, 2.6);

    function spawn() {
      const iw = itemW();
      const x = iw * 0.55 + Math.random() * Math.max(1, w - iw * 1.1);
      let kind, junk = null;
      if (g.stack.length >= g.topAt) {
        kind = 'top';
        g.topAt = 99;                                 // one top bun until it is caught
      } else if (Math.random() < clamp(0.14 + g.burgers * 0.03, 0.14, 0.3)) {
        junk = Math.random() < 0.5 ? '🥾' : '🐟';
        kind = 'junk';
      } else {
        kind = KINDS[Math.floor(Math.random() * KINDS.length)];
      }
      const top = baseY() + g.camY - inset.top + itemH();
      g.falling.push({ kind, junk, x, wy: top, vy: 0, spin: (Math.random() - 0.5) * 2 });
      g.spawnIn = clamp(1.25 - g.burgers * 0.07 - g.items * 0.006, 0.6, 1.25) + Math.random() * 0.3;
    }

    function addFloater(text, x, y, color) {
      g.floaters.push({ text, x, y, t: 0, color });
    }

    function finishBurger() {
      const n = g.stack.length;
      const pts = 25 * n;
      g.score += pts;
      g.burgers++;
      addFloater(`Burger! +${pts}`, w / 2, inset.top + 90, '#ffd43b');
      api.sfx('win');
      // The finished burger slides off to the side; a fresh bottom bun stays.
      g.served.push({ stack: g.stack.slice(0, n), x: g.x, sway: g.sway, t: 0, dir: g.x < w / 2 ? 1 : -1 });
      g.stack = [];
      g.sway = 0;
      g.swayV = 0;
      g.topAt = 4 + g.burgers + Math.floor(Math.random() * 3);
      g.topAt = Math.min(g.topAt, 10);
      publish();
    }

    function drop(x, why) {
      g.drops++;
      g.shake = 0.3;
      api.sfx('miss');
      if (why) addFloater(why, clamp(x, 40, w - 40), h - inset.bottom - 60, '#ff6b6b');
      if (g.drops >= MAX_DROPS) endGame();
    }

    function endGame() {
      g.over = true;
      if (g.score > best) {
        best = g.score;
        api.store.set('best', best);
        api.toast('New best burger score!');
      }
      api.sfx('lose');
      publish();
    }

    let lastPub = '';
    function publish() {
      const sig = `${g.score}|${g.stack.length}|${best}|${g.over}`;
      if (sig === lastPub) return;
      lastPub = sig;
      api.setState({ score: g.score, stack: g.stack.length, best, over: g.over });
    }

    function topple() {
      const s = g.stack.pop();
      if (!s) return;
      const hh = stackHeight() + slab(s.kind);
      g.debris.push({
        kind: s.kind, x: g.x + s.ox + swayAt(hh), y: screenY(hh), vx: (g.sway > 0 ? 1 : -1) * (120 + Math.random() * 80),
        vy: -160, rot: 0, vr: (g.sway > 0 ? 1 : -1) * 3,
      });
      g.sway *= 0.5;
      g.swayV *= 0.3;
      g.shake = 0.2;
      api.sfx('bounce');
      addFloater('Wobble!', g.x, screenY(stackHeight()) - 20, '#ff6b6b');
      publish();
    }

    function land(f) {
      const topCenter = topX();
      // Offset from the bun centre so the item rides the stack as it sways.
      const hh = stackHeight();
      const ox = clamp(f.x - g.x - swayAt(hh + slab(f.kind)), -itemW() * 0.5, itemW() * 0.5);
      g.stack.push({ kind: f.kind, ox });
      g.items++;
      g.swayV += (f.x - topCenter) * 0.012 + (Math.random() - 0.5) * 0.4;
      if (f.kind === 'top') {
        g.stack.pop();
        g.stack.push({ kind: 'top', ox });
        finishBurger();
        return;
      }
      g.score += 10;
      addFloater('+10', f.x, screenY(stackHeight()) - 24, '#fff');
      api.sfx('pop');
      publish();
    }

    function update(dt) {
      if (g.over) {
        g.floaters.forEach(f => { f.t += dt; });
        g.floaters = g.floaters.filter(f => f.t < 1.2);
        return;
      }
      // Where the bun wants to be.
      const manual = clock - lastManual < 1.5;
      const face = api.face();
      const cw = api.selfCanvas?.width || 0;
      const tilt = api.tilt?.();
      if (keys.left || keys.right) {
        g.target = clamp(g.target + (keys.right - keys.left) * w * 1.1 * dt, 0, w);
        lastManual = clock;
      } else if (Math.abs(padX) > 0.15) {
        g.target = clamp(g.target + padX * w * 1.1 * dt, 0, w);
        lastManual = clock;
      } else if (pointerDown || (pointerX != null && clock - lastManual < 1.5)) {
        if (pointerX != null) g.target = clamp(pointerX, 0, w);
      } else if (face && cw > 0 && !manual) {
        // The camera is mirrored already: my head on the left is x near 0.
        const u = clamp((face.center.x / cw - 0.5) * 1.7 + 0.5, 0, 1);
        g.target = u * w;
      } else if (tilt && !manual) {
        g.target = clamp(0.5 + tilt.x * 0.55, 0, 1) * w;
      }
      // Smooth follow; the bun's acceleration pushes the stack.
      const prevX = g.x;
      g.x += (g.target - g.x) * Math.min(1, dt * 12);
      const vx = (g.x - prevX) / Math.max(dt, 1e-3);
      g.ax = (vx - g.vx) / Math.max(dt, 1e-3);
      g.vx = vx;
      const n = g.stack.length;
      const hh = stackHeight();
      // Sway: a damped spring pushed by the bun's acceleration. Taller stacks
      // swing further because the offset is sway x height.
      const push = clamp(-g.ax * 0.0016, -40, 40) * (n > 0 ? 1 : 0);
      g.swayV += (push - 38 * g.sway - 2.6 * g.swayV) * dt;
      g.sway += g.swayV * dt;
      // Topple the top item when the top leans past what it can hold.
      const limit = itemW() * 0.5;
      g.wobbleWarn = n > 1 ? clamp(Math.abs(swayAt(hh)) / limit, 0, 1.2) : 0;
      if (n > 1 && Math.abs(swayAt(hh)) > limit) topple();

      // Falling things.
      g.spawnIn -= dt;
      if (g.spawnIn <= 0) spawn();
      const spd = h * 0.38 * speedNow();
      for (let i = g.falling.length - 1; i >= 0; i--) {
        const f = g.falling[i];
        const prevBottom = f.wy - itemH() * 0.5;
        f.vy = spd;
        f.wy -= f.vy * dt;
        const bottom = f.wy - itemH() * 0.5;
        const topH = stackHeight();
        const tx = topX();
        if (prevBottom >= topH - 2 && bottom < topH + itemH() * 0.1 && Math.abs(f.x - tx) < itemW() * 0.58) {
          g.falling.splice(i, 1);
          if (f.kind === 'junk') {
            g.swayV += (f.x < tx ? 1 : -1) * 6;
            if (g.stack.length) topple();
            drop(f.x, f.junk === '🥾' ? 'Boot!' : 'Fish!');
          } else {
            land(f);
          }
          continue;
        }
        if (screenY(f.wy) - itemH() > h) {
          g.falling.splice(i, 1);
          if (f.kind !== 'junk') drop(f.x, 'Dropped!');
        }
      }
      // Debris and served burgers.
      for (const d of g.debris) {
        d.vy += 900 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.rot += d.vr * dt;
      }
      g.debris = g.debris.filter(d => d.y < h + 80);
      for (const s of g.served) s.t += dt;
      g.served = g.served.filter(s => s.t < 1.1);
      g.floaters.forEach(f => { f.t += dt; });
      g.floaters = g.floaters.filter(f => f.t < 1.2);
      g.shake = Math.max(0, g.shake - dt);
      // Camera drops as the stack climbs, so the top stays in view.
      const wantCam = Math.max(0, hh - (baseY() - inset.top) * 0.5);
      g.camY += (wantCam - g.camY) * Math.min(1, dt * 4);
    }

    // --- input -----------------------------------------------------------
    function pointerPos(e) {
      const r = canvas.getBoundingClientRect();
      return e.clientX - r.left;
    }
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture?.(e.pointerId);
      pointerDown = true;
      pointerX = pointerPos(e);
      lastManual = clock;
      if (g.over) return;
      // iPhones only give motion data after a tap.
      if (!askedMotion) { askedMotion = true; api.requestMotion?.(); }
    });
    canvas.addEventListener('pointermove', e => {
      if (pointerDown || e.pointerType === 'mouse') {
        pointerX = pointerPos(e);
        lastManual = clock;
      }
    });
    const release = () => { pointerDown = false; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const down = e.type === 'keydown';
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = down; e.preventDefault(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = down; e.preventDefault(); }
      else if (down && g.over && (e.code === 'Space' || e.code === 'Enter')) { restart(); e.preventDefault(); }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    function restart() {
      g = newGame();
      lastPub = '';
      publish();
      overlay.style.display = 'none';
    }

    // --- drawing ---------------------------------------------------------
    function text(str, x, y, size, color, align = 'center') {
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(80,20,60,0.7)';
      ctx.strokeText(str, x, y);
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }

    function drawItem(kind, x, y, iw, rot = 0) {
      const art = api.img(ART[kind]);
      ctx.save();
      if (rot) {
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.translate(-x, -y);
      }
      if (art) ctx.drawImage(art, x - iw / 2, y - (iw * ASPECT) / 2, iw, iw * ASPECT);
      else drawIngredient(ctx, kind, x, y, iw);
      ctx.restore();
    }

    // The whole stack (bun + ingredients) at a base x, with a sway.
    function drawStack(stack, bx, sway, dim) {
      const iw = itemW();
      let height = 0;
      const bot = slab('bottom');
      // Bottom bun first, then each ingredient on top.
      const items = [{ kind: 'bottom', ox: 0 }, ...stack];
      items.forEach((s, i) => {
        const t = i === 0 ? bot : slab(s.kind);
        const mid = height + t * 0.5 + (i === 0 ? 0 : itemH() * 0.12);
        const x = bx + s.ox + sway * (height + t * 0.5);
        ctx.globalAlpha = dim;
        drawItem(s.kind, x, screenY(mid), iw, sway * 1.5);
        ctx.globalAlpha = 1;
        height += t;
      });
    }

    function drawFaceBubble(m, x, y, r) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = m.color || '#9775fa';
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      const media = api.mediaOf(m.id);
      const sw = media?.videoWidth || media?.width || 0;
      const sh = media?.videoHeight || media?.height || 0;
      let drew = false;
      if (sw > 0 && sh > 0) {
        const s = Math.max((r * 2) / sw, (r * 2) / sh);
        try { ctx.drawImage(media, x - (sw * s) / 2, y - (sh * s) / 2, sw * s, sh * s); drew = true; } catch (e) { /* not ready */ }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r * 1.1}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial(m.name), x, y + r * 0.05);
      }
      ctx.restore();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = m.color || '#fff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * g.shake * 3, (Math.random() - 0.5) * 8 * g.shake * 3);
      drawKitchen(ctx, w, h);
      // Counter.
      ctx.fillStyle = '#b87a4b';
      ctx.fillRect(-10, baseY() + g.camY + 0, w + 20, h);
      ctx.fillStyle = '#d99a63';
      ctx.fillRect(-10, baseY() + g.camY, w + 20, 6);

      for (const s of g.served) drawStack(s.stack, s.x + s.dir * s.t * s.t * w * 0.9, s.sway, clamp(1.1 - s.t, 0, 1));
      drawStack(g.stack, g.x, g.sway, 1);

      // Falling ingredients, junk and debris.
      const iw = itemW();
      for (const f of g.falling) {
        const y = screenY(f.wy);
        if (f.kind === 'junk') {
          ctx.font = `${iw * 0.55}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.save();
          ctx.translate(f.x, y);
          ctx.rotate(Math.sin(clock * 3 + f.spin * 5) * 0.4);
          ctx.fillText(f.junk, 0, 0);
          ctx.restore();
        } else {
          drawItem(f.kind, f.x, y, iw, Math.sin(clock * 2 + f.spin * 4) * 0.15);
        }
      }
      for (const d of g.debris) drawItem(d.kind, d.x, d.y, iw, d.rot);

      // Warn when the stack is about to topple.
      if (g.wobbleWarn > 0.6 && !g.over) {
        ctx.strokeStyle = `rgba(255,70,70,${(g.wobbleWarn - 0.6) * 1.8})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);
      }
      ctx.restore();

      for (const f of g.floaters) {
        ctx.globalAlpha = clamp(1.2 - f.t, 0, 1);
        text(f.text, f.x, f.y - f.t * 40, 22, f.color);
        ctx.globalAlpha = 1;
      }

      // Leaderboard row: everyone's face, score and stack height.
      const list = api.players();
      const cell = Math.min(64, w / Math.max(1, list.length));
      const r = clamp(cell * 0.3, 11, 20);
      const y0 = inset.top + 6 + r;
      const rowW = cell * list.length;
      list.forEach((m, i) => {
        const x = (w - rowW) / 2 + cell * (i + 0.5);
        const s = m.me ? { score: g.score, stack: g.stack.length } : m.state || {};
        drawFaceBubble(m, x, y0, r);
        const sc = Number.isFinite(s.score) ? Math.floor(s.score) : 0;
        const st = Number.isFinite(s.stack) ? Math.floor(s.stack) : 0;
        text(String(sc), x, y0 + r + 13, clamp(cell * 0.24, 10, 14), '#fff');
        if (st > 0) text(`🍔${st}`, x, y0 + r + 28, clamp(cell * 0.2, 9, 12), '#fff');
      });
      const topY = y0 + r + 48;
      text(`Score ${g.score}`, 14, topY, 20, '#fff', 'left');
      text(`Best ${best}`, w - 14, topY, 14, '#ffd43b', 'right');
      // Drops left.
      let lives = '';
      for (let i = 0; i < MAX_DROPS; i++) lives += i < g.drops ? '🖤' : '🍔';
      ctx.font = `${16}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(lives, 14, topY + 24);

      if (g.items === 0 && !g.over) {
        const face = api.face();
        const hint = face ? 'Move your head left and right to catch!' : 'Drag, or use the arrow keys, to catch!';
        text(hint, w / 2, h * 0.5, clamp(w * 0.04, 13, 20), '#fff');
      }
    }

    // Game over card.
    const overlay = document.createElement('div');
    overlay.className = 'g-center';
    overlay.style.cssText = 'display:none;pointer-events:none;';
    const card = document.createElement('div');
    card.style.cssText = 'pointer-events:auto;text-align:center;padding:16px 22px;border-radius:16px;background:rgba(40,10,70,0.9);display:flex;flex-direction:column;align-items:center;gap:6px;';
    const title = document.createElement('div');
    title.className = 'g-big';
    title.textContent = 'Out of burger!';
    const sub = document.createElement('div');
    const again = document.createElement('button');
    again.className = 'btn aqua';
    again.textContent = 'Play again';
    again.style.marginTop = '8px';
    again.addEventListener('click', restart);
    card.append(title, sub, again);
    overlay.append(card);
    api.el.append(overlay);

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      clock += dt;
      update(dt);
      publish();
      render();
      if (g.over && overlay.style.display === 'none') {
        sub.textContent = `Score ${g.score} · Best ${best} · ${g.burgers} burger${g.burgers === 1 ? '' : 's'}`;
        overlay.style.display = 'flex';
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
      },
      onPad(pad) {
        padX = pad.x || (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
        if (g.over && (pad.a || pad.pressed?.[0])) restart();
      },
    };
  },
};

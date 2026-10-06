// Flappy Face: your own face is the bird. Open your mouth (or tap, Space,
// controller A) to flap and fly through the candy pillars. Everyone in the
// session flies the same course: the owner puts a numeric seed in shared
// state and the gaps are derived from it, so each run replays the same
// pillars. Friends show up as translucent ghost birds at the horizontal
// offset that matches how far each of them has flown.

// World units: the play field is always H units tall, whatever the panel size,
// so the course plays identically everywhere. `s` below converts units to px.
const H = 600;
const FLOOR = 540;          // top of the ground
const BIRD_R = 30;
const SPEED = 175;          // units per second
const GRAVITY = 1650;
const FLAP_V = -470;
const PIPE_W = 96;
const GAP = 215;
const SPACING = 290;
const FIRST = 520;          // x of the first pillar
const GAP_MIN = 70 + GAP / 2;
const GAP_MAX = FLOOR - 70 - GAP / 2;
const MAX_STEP = 150;       // biggest change in gap height between pillars
const MOUTH_ON = 0.45;
const MOUTH_OFF = 0.3;
const PUBLISH_MS = 100;

const FONT = 'ui-rounded, system-ui, sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Small seeded PRNG (mulberry32).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The course for a seed: gapAt(i) is the height of pillar i's gap centre.
// Generated lazily in order, so every player gets the same sequence.
function makeCourse(seed) {
  const rnd = mulberry32(seed);
  const gaps = [];
  return {
    seed,
    gapAt(i) {
      while (gaps.length <= i) {
        const c = gaps.length
          ? clamp(gaps[gaps.length - 1] + (rnd() * 2 - 1) * MAX_STEP, GAP_MIN, GAP_MAX)
          : GAP_MIN + rnd() * (GAP_MAX - GAP_MIN);
        gaps.push(c);
      }
      return gaps[i];
    },
  };
}

const pipeX = i => FIRST + i * SPACING;
// Pillars passed once the distance is beyond their right edge.
const scoreAt = d => (d < FIRST + PIPE_W / 2 ? 0 : Math.floor((d - FIRST - PIPE_W / 2) / SPACING) + 1);

function initial(name) {
  return (String(name || '?').trim()[0] || '?').toUpperCase();
}

// --- stand-in art ---------------------------------------------------------

function cloud(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 1.1, y + r * 0.15, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x - r * 1.1, y + r * 0.2, r * 0.7, 0, Math.PI * 2);
  ctx.arc(x + r * 0.2, y - r * 0.5, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
}

// Pink and white diagonal stripes inside a rectangle, with a glossy shine.
function candyRect(ctx, x, y, w, h, s) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#fff6fb';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ff5fa2';
  const band = 22 * s;
  for (let k = -h; k < w + h; k += band * 2) {
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.lineTo(x + k + band, y);
    ctx.lineTo(x + k + band - h * 0.6, y + h);
    ctx.lineTo(x + k - h * 0.6, y + h);
    ctx.fill();
  }
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.18)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.32, 'rgba(255,255,255,0)');
  g.addColorStop(0.8, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = '#b8306b';
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.strokeRect(x, y, w, h);
}

// A pillar standing on y = 0 and growing downwards for len px (mirrored by the
// caller for hanging pillars). wpx is the width of the cap.
function pipeShape(ctx, art, len, wpx, s) {
  const capH = Math.min(len, 38 * s);
  if (art) {
    const capSrc = 150;
    const capDraw = Math.min(len, (wpx * capSrc) / 256);
    ctx.drawImage(art, 0, 0, 256, capSrc, -wpx / 2, 0, wpx, capDraw);
    if (len > capDraw) ctx.drawImage(art, 0, capSrc, 256, 1024 - capSrc, -wpx / 2, capDraw, wpx, len - capDraw);
    return;
  }
  const bodyW = wpx - 18 * s;
  candyRect(ctx, -bodyW / 2, capH * 0.5, bodyW, Math.max(0, len - capH * 0.5), s);
  candyRect(ctx, -wpx / 2, 0, wpx, capH, s);
}

// Fluffy white wings either side of the body. flap is -1..1 (down..up).
function wingsStandIn(ctx, r, flap) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.85, 0);
    ctx.rotate(side * (-0.35 - flap * 0.55));
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(120,120,170,0.55)';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    for (const [ox, oy, rx, ry] of [[0.55, 0.05, 0.7, 0.38], [0.95, -0.12, 0.55, 0.3], [0.8, 0.28, 0.55, 0.28], [1.2, 0.1, 0.4, 0.22]]) {
      ctx.beginPath();
      ctx.ellipse(side * r * ox, r * oy, r * rx, r * ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

export default {
  id: 'flappy',
  name: 'Flappy Face',
  emoji: '🐤',
  blurb: 'Your face is the bird. Open your mouth to flap through candy pillars.',
  minPlayers: 1,
  maxPlayers: 16,
  needsFace: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    // Game over card (DOM, so the button works with pointer and controller focus).
    const card = document.createElement('div');
    card.className = 'g-center';
    card.style.background = 'rgba(20,10,40,0.55)';
    card.hidden = true;
    const cardTitle = document.createElement('div');
    cardTitle.className = 'g-big';
    cardTitle.textContent = 'Game over';
    const cardScore = document.createElement('div');
    cardScore.style.cssText = 'font-weight:900;font-size:1.2rem';
    const cardBtn = document.createElement('button');
    cardBtn.className = 'btn';
    cardBtn.textContent = 'Play again';
    card.append(cardTitle, cardScore, cardBtn);
    api.el.append(card);

    let best = api.store.get('best', 0);
    let mode = 'ready';        // ready | play | dead | over
    let d = 0;                 // distance flown (units)
    let y = H * 0.45;          // bird height (units, 0 = top)
    let vy = 0;
    let score = 0;
    let newBest = false;
    let deadT = 0;
    let flapT = 0;             // wing flap boost, decays
    let wingPhase = 0;
    let mouthWas = false;
    let padWas = false;
    let course = null;
    let published = '';
    let lastPub = 0;
    const ghosts = new Map();  // friend id -> eased { d, y }
    let w = 0, h = 0, dpr = 1, s = 1, birdX = 0;
    let skyCache = null;
    let raf = 0, last = performance.now(), now = 0;

    // --- shared course ---------------------------------------------------
    // The owner picks the seed once; it lives in shared state so a new owner
    // inherits it.
    const seedOf = () => {
      const v = api.shared()?.seed;
      return Number.isFinite(v) ? v >>> 0 : null;
    };
    function ensureSeed() {
      if (api.isOwner() && seedOf() == null) api.setShared({ seed: Math.floor(Math.random() * 2147483647) + 1 });
    }
    function currentCourse() {
      const seed = seedOf();
      if (seed == null) return null;
      if (!course || course.seed !== seed) course = makeCourse(seed);
      return course;
    }
    ensureSeed();

    // --- layout ----------------------------------------------------------
    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      s = h / H;
      birdX = w * 0.28;
      skyCache = null;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // --- publishing my progress (throttled to ~10 Hz) ----------------------
    function publish(force) {
      const t = performance.now();
      if (!force && t - lastPub < PUBLISH_MS) return;
      const st = { d: Math.round(d), y: Math.round((y / H) * 1000) / 1000, alive: mode === 'ready' || mode === 'play', score, best };
      const sig = JSON.stringify(st);
      if (sig === published) return;
      published = sig;
      lastPub = t;
      api.setState(st);
    }
    publish(true);

    // --- run control -----------------------------------------------------
    function reset() {
      mode = 'ready';
      d = 0;
      y = H * 0.45;
      vy = 0;
      score = 0;
      newBest = false;
      card.hidden = true;
      publish(true);
    }

    function flap() {
      if (!currentCourse()) return;
      if (mode === 'ready') mode = 'play';
      if (mode !== 'play') return;
      vy = FLAP_V;
      flapT = 1;
      api.sfx('flap');
    }

    function die() {
      mode = 'dead';
      deadT = 0;
      vy = Math.min(vy, 0) - 120;
      api.sfx('miss');
      if (score > best) {
        best = score;
        newBest = true;
        api.store.set('best', best);
      }
      publish(true);
    }

    function showCard() {
      mode = 'over';
      cardScore.textContent = `Score ${score} · Best ${best}${newBest ? ' · New best!' : ''}`;
      card.hidden = false;
      if (newBest) api.sfx('win');
    }

    // Space / click / A: flap while flying, play again when it is over.
    function action() {
      if (mode === 'over') reset();
      else flap();
    }
    cardBtn.addEventListener('click', reset);

    // --- input -----------------------------------------------------------
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      action();
    });
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !e.repeat) {
        e.preventDefault();
        action();
      }
    }
    window.addEventListener('keydown', onKey);

    // --- simulation ------------------------------------------------------
    function hitsPipe() {
      const c = currentCourse();
      if (!c) return false;
      const r = BIRD_R * 0.8;
      const i0 = Math.max(0, Math.floor((d - r - FIRST - PIPE_W / 2) / SPACING));
      for (let i = i0; i <= i0 + 1; i++) {
        const px = pipeX(i);
        if (Math.abs(d - px) < PIPE_W / 2 + r) {
          const gc = c.gapAt(i);
          if (y - r < gc - GAP / 2 || y + r > gc + GAP / 2) return true;
        }
      }
      return false;
    }

    function update(dt) {
      // Face: opening the mouth is a flap (rising edge with hysteresis).
      const f = api.face();
      const m = f ? f.mouthOpen : 0;
      if (m > MOUTH_ON && !mouthWas) {
        mouthWas = true;
        if (mode !== 'over') flap();
      } else if (m < MOUTH_OFF) mouthWas = false;

      flapT = Math.max(0, flapT - dt * 3);
      wingPhase += dt * (mode === 'ready' ? 5 : 4 + 22 * flapT);

      if (mode === 'ready') {
        y = H * 0.45 + Math.sin(now * 3) * 14;
      } else if (mode === 'play') {
        vy += GRAVITY * dt;
        y += vy * dt;
        d += SPEED * dt;
        if (y < BIRD_R) {
          y = BIRD_R;
          vy = Math.max(vy, 0);
        }
        const sc = scoreAt(d);
        if (sc > score) {
          score = sc;
          api.sfx('pop');
        }
        if (y > FLOOR - BIRD_R) {
          y = FLOOR - BIRD_R;
          die();
        } else if (hitsPipe()) die();
      } else if (mode === 'dead') {
        deadT += dt;
        vy += GRAVITY * dt;
        y = Math.min(FLOOR - BIRD_R, y + vy * dt);
        if (deadT > 0.9) showCard();
      }

      // Ease friends' ghosts toward their latest published position.
      const k = 1 - Math.exp(-dt * 12);
      const seen = new Set();
      for (const p of api.players()) {
        if (p.me) continue;
        const st = p.state || {};
        if (!Number.isFinite(st.d) || !Number.isFinite(st.y)) continue;
        seen.add(p.id);
        let g = ghosts.get(p.id);
        const ty = clamp(st.y, 0, 1) * H;
        if (!g || Math.abs(g.d - st.d) > 2000) g = { d: st.d, y: ty };
        g.d += (st.d - g.d) * k;
        g.y += (ty - g.y) * k;
        ghosts.set(p.id, g);
      }
      for (const id of [...ghosts.keys()]) if (!seen.has(id)) ghosts.delete(id);

      publish(false);
    }

    // --- drawing ---------------------------------------------------------
    function drawSky() {
      const art = api.img('flappy-sky');
      if (art) {
        const sc = h / art.height;
        const tw = art.width * sc;
        let x = -((d * 0.25 * s) % tw);
        for (; x < w; x += tw) ctx.drawImage(art, x, 0, tw + 1, h);
        return;
      }
      if (!skyCache || skyCache.h !== h) {
        const g = ctx.createLinearGradient(0, 0, 0, FLOOR * s);
        g.addColorStop(0, '#5ec2ff');
        g.addColorStop(1, '#d8f3ff');
        skyCache = { h, g };
      }
      ctx.fillStyle = skyCache.g;
      ctx.fillRect(0, 0, w, h);
      // Clouds, slow parallax.
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const cw = 340 * s;
      const co = (d * 0.2 * s) % cw;
      for (let i = -1; i < w / cw + 2; i++) {
        const cx = i * cw - co;
        const n = Math.round(i + (d * 0.2 * s - co) / cw);
        const wob = Math.abs(Math.sin(n * 12.9898));
        cloud(ctx, cx, (60 + wob * 150) * s, (22 + wob * 16) * s);
      }
      // Low hills, faster parallax.
      const base = FLOOR * s;
      const ho = d * 0.5 * s;
      for (const [col, amp, len, off, lift] of [['#8fdc9a', 46, 330, 0, 36], ['#5cc27a', 34, 220, 90, 8]]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, base);
        for (let x = 0; x <= w + 12; x += 12) {
          const hy = Math.sin(((x + ho * (lift > 20 ? 0.6 : 1)) / (len * s)) * Math.PI * 2 + off) * 0.5 + 0.5;
          ctx.lineTo(x, base - (lift + hy * amp) * s);
        }
        ctx.lineTo(w, base);
        ctx.fill();
      }
    }

    function drawGround() {
      const top = FLOOR * s;
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(0, top, w, h - top);
      ctx.fillStyle = '#4fbf5c';
      ctx.fillRect(0, top, w, 14 * s);
      // Scrolling stripes on the grass edge.
      ctx.fillStyle = '#3ea34d';
      const sw = 30 * s;
      for (let x = -((d * s) % (sw * 2)); x < w; x += sw * 2) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + sw, top);
        ctx.lineTo(x + sw - 10 * s, top + 14 * s);
        ctx.lineTo(x - 10 * s, top + 14 * s);
        ctx.fill();
      }
    }

    function drawPillars() {
      const c = currentCourse();
      if (!c) return;
      const art = api.img('flappy-pipe');
      const xmin = d - birdX / s - PIPE_W;
      const xmax = d + (w - birdX) / s + PIPE_W;
      const iMin = Math.max(0, Math.ceil((xmin - FIRST) / SPACING));
      const iMax = Math.floor((xmax - FIRST) / SPACING);
      for (let i = iMin; i <= iMax; i++) {
        const cx = birdX + (pipeX(i) - d) * s;
        const gc = c.gapAt(i);
        const wpx = PIPE_W * s;
        // Bottom pillar.
        const by = (gc + GAP / 2) * s;
        ctx.save();
        ctx.translate(cx, by);
        pipeShape(ctx, art, h - by, wpx, s);
        ctx.restore();
        // Hanging pillar: the same shape flipped.
        const ty = (gc - GAP / 2) * s;
        ctx.save();
        ctx.translate(cx, ty);
        ctx.scale(1, -1);
        pipeShape(ctx, art, ty, wpx, s);
        ctx.restore();
      }
    }

    // My bird: my face cropped into a circle with wings, or an initial.
    function drawBird(px, py, tilt) {
      const r = BIRD_R * s;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tilt);
      // Wings behind the body.
      const flap = Math.sin(wingPhase);
      const wings = api.img('wings');
      if (wings) {
        const k = (r * 2 * 1.1) / 256;
        ctx.save();
        ctx.scale(1, 0.75 + 0.35 * flap);
        ctx.drawImage(wings, (-768 * k) / 2, (-384 * k) / 2, 768 * k, 384 * k);
        ctx.restore();
      } else wingsStandIn(ctx, r, flap);
      // Body.
      const face = api.face();
      const src = api.selfCanvas;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      if (face && src && src.width > 0) {
        const sr = 0.62 * Math.max(face.box.w, face.box.h);
        ctx.drawImage(src, face.center.x - sr, face.center.y - sr, sr * 2, sr * 2, -r, -r, r * 2, r * 2);
        if (mode === 'dead' || mode === 'over') {
          ctx.fillStyle = 'rgba(255,92,108,0.35)';
          ctx.fillRect(-r, -r, r * 2, r * 2);
        }
      } else {
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.25, api.me.color || '#ffd43b');
        g.addColorStop(1, api.me.color || '#ffd43b');
        ctx.fillStyle = g;
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r * 1.2}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial(api.me.name), 0, r * 0.05);
      }
      ctx.restore();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = api.me.color || '#ff5fa2';
      ctx.lineWidth = Math.max(1.5, r * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, r + ctx.lineWidth * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function drawGhost(p, g) {
      const px = birdX + (g.d - d) * s;
      const r = BIRD_R * s;
      if (px < -r * 2 || px > w + r * 2) return;
      const alive = p.state?.alive !== false;
      ctx.save();
      ctx.globalAlpha = alive ? 0.5 : 0.22;
      ctx.translate(px, g.y * s);
      ctx.fillStyle = p.color || '#3fe0d0';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.stroke();
      ctx.globalAlpha = alive ? 0.9 : 0.4;
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${r * 1.1}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial(p.name), 0, r * 0.05);
      ctx.font = `800 ${Math.max(10, r * 0.55)}px ${FONT}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.textBaseline = 'alphabetic';
      ctx.strokeText(p.name, 0, -r - 5);
      ctx.fillText(p.name, 0, -r - 5);
      ctx.restore();
    }

    function text(str, x, yy, size, align, color) {
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, yy);
      ctx.fillStyle = color || '#fff';
      ctx.fillText(str, x, yy);
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSky();
      drawPillars();
      drawGround();

      const players = api.players();
      for (const p of players) {
        const g = ghosts.get(p.id);
        if (g && !p.me) drawGhost(p, g);
      }
      const tilt = mode === 'ready' ? 0 : clamp(vy / 1100, -0.4, 0.9) * 0.7;
      drawBird(birdX, y * s, tilt);

      // HUD: score, best, leaderboard.
      const unit = Math.min(w, h);
      text(String(score), w / 2, Math.max(34, unit * 0.14), clamp(unit * 0.11, 26, 64), 'center');
      text(`Best ${best}`, w - 10, 22, clamp(unit * 0.05, 13, 20), 'right', '#ffd43b');
      if (players.length > 1) {
        const rows = players
          .map(p => ({ name: p.name, color: p.color, score: p.me ? score : (p.state?.score | 0), best: p.me ? best : (p.state?.best | 0) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);
        const fs = clamp(unit * 0.045, 11, 15);
        rows.forEach((r, i) => text(`${r.name.slice(0, 12)}: ${r.score} / ${r.best}`, 10, 22 + i * (fs + 4), fs, 'left', r.color || '#fff'));
      }

      if (mode === 'ready') {
        const fs = clamp(unit * 0.06, 15, 28);
        const ready = currentCourse();
        text(ready ? 'Open your mouth or tap to flap' : 'Getting the course ready…', w / 2, h * 0.3, fs, 'center');
        if (ready && !api.face()) text('(no face found: tap, Space or A works too)', w / 2, h * 0.3 + fs * 1.4, fs * 0.6, 'center', '#ffe8a3');
      }
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      now += dt;
      update(dt);
      render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
      },
      onChange() {
        ensureSeed();
      },
      onPad(pad) {
        const a = !!(pad.a || pad.pressed?.[0]);
        if (a && !padWas) action();
        padWas = a;
      },
    };
  },
};

// Exposed for tests.
export const _course = { makeCourse, scoreAt, pipeX };

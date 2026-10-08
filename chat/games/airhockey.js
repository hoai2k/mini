// Air Hockey: two players, portrait table, first to 7. The table lives in
// canonical coordinates (0..1 wide, 0..1.6 tall); the owner's goal is at the
// bottom (y = 1.6) and the other player's at the top. Each player sees their
// own goal at the bottom, so the non-owner's view is rotated 180 degrees and
// spectators see the owner's view. The owner simulates the puck and publishes
// it in shared state about 20 times a second; each player publishes their own
// paddle in their state. Everyone else extrapolates and eases.

const TW = 1;               // table width
const TH = 1.6;             // table height
const GOAL_W = 0.36;
const GOAL_L = (TW - GOAL_W) / 2;
const GOAL_R = GOAL_L + GOAL_W;
const PR = 0.075;           // paddle radius
const UR = 0.045;           // puck radius
const POST_R = 0.014;       // goal posts
const WALL_E = 0.92;        // wall bounciness
const PADDLE_E = 0.9;
const FRICTION = 0.1;       // per second
const MAX_SPEED = 2.6;      // puck
const PADDLE_MAX = 3.4;     // paddle speed cap (units per second)
const KEY_SPEED = 1.5;
const SERVE_SPEED = 1.2;
const WIN_SCORE = 7;
const SEND_MS = 50;         // ~20 Hz

const FONT = 'ui-rounded, system-ui, sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => typeof v === 'number' && Number.isFinite(v);
const r3 = v => Math.round(v * 1000) / 1000;

// The y range a paddle of the given role may move in (0 = owner, bottom half).
function halfRange(role) {
  return role === 1 ? [PR, TH / 2 - PR] : [TH / 2 + PR, TH - PR];
}

// Shared state as published by the owner, or null if it is missing or broken.
function parseShared(sh) {
  if (!sh || !Array.isArray(sh.puck) || sh.puck.length !== 4 || !sh.puck.every(num)) return null;
  if (!Array.isArray(sh.score) || sh.score.length !== 2 || !sh.score.every(num)) return null;
  if (!Array.isArray(sh.ids) || sh.ids.length !== 2) return null;
  return {
    puck: sh.puck,
    score: [clamp(sh.score[0] | 0, 0, 99), clamp(sh.score[1] | 0, 0, 99)],
    serveAt: num(sh.serveAt) ? sh.serveAt : 0,
    serveTo: sh.serveTo === 1 ? 1 : 0,
    winner: sh.winner === 0 || sh.winner === 1 ? sh.winner : null,
    ids: [String(sh.ids[0]), String(sh.ids[1])],
  };
}

// A paddle from someone's published state, kept inside their half.
function parsePaddle(p, role) {
  if (!Array.isArray(p) || p.length !== 4 || !p.every(num)) return null;
  const [y0, y1] = halfRange(role);
  return { x: clamp(p[0], PR, TW - PR), y: clamp(p[1], y0, y1), vx: clamp(p[2], -6, 6), vy: clamp(p[3], -6, 6) };
}

// --- stand-in art ---------------------------------------------------------

// The table in canonical units (it is symmetric, so it works in either view).
function drawTable(g) {
  const rr = (x, y, w, h, r) => {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  };
  // Neon rim.
  g.save();
  g.shadowColor = '#3fe0d0';
  g.shadowBlur = 0.05;
  g.fillStyle = '#1a1038';
  rr(-0.035, -0.035, TW + 0.07, TH + 0.07, 0.07);
  g.fill();
  g.strokeStyle = '#3fe0d0';
  g.lineWidth = 0.012;
  g.stroke();
  g.restore();
  // Icy surface.
  const sg = g.createLinearGradient(0, 0, 0, TH);
  sg.addColorStop(0, '#d5ecff');
  sg.addColorStop(0.5, '#f4fbff');
  sg.addColorStop(1, '#d5ecff');
  g.fillStyle = sg;
  rr(0, 0, TW, TH, 0.045);
  g.fill();
  // Faint air holes.
  g.fillStyle = 'rgba(70,130,190,0.2)';
  for (let y = 0.03; y < TH; y += 0.04) {
    for (let x = 0.03 + (Math.round(y / 0.04) % 2) * 0.02; x < TW; x += 0.04) {
      g.beginPath();
      g.arc(x, y, 0.005, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Centre line, circle and dot.
  g.strokeStyle = 'rgba(255,77,94,0.85)';
  g.fillStyle = 'rgba(255,77,94,0.85)';
  g.lineWidth = 0.012;
  g.beginPath();
  g.moveTo(0.005, TH / 2);
  g.lineTo(TW - 0.005, TH / 2);
  g.stroke();
  g.beginPath();
  g.arc(TW / 2, TH / 2, 0.17, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(TW / 2, TH / 2, 0.02, 0, Math.PI * 2);
  g.fill();
  // Goal creases.
  g.lineWidth = 0.008;
  g.strokeStyle = 'rgba(255,77,94,0.45)';
  g.beginPath();
  g.arc(TW / 2, 0, 0.26, 0, Math.PI);
  g.stroke();
  g.beginPath();
  g.arc(TW / 2, TH, 0.26, Math.PI, Math.PI * 2);
  g.stroke();
  // Inner shadow along the edge.
  g.save();
  rr(0, 0, TW, TH, 0.045);
  g.clip();
  g.strokeStyle = 'rgba(40,80,140,0.28)';
  g.lineWidth = 0.03;
  rr(0, 0, TW, TH, 0.045);
  g.stroke();
  g.restore();
}

function drawPaddle(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0.008, 0.012, PR, PR * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-PR * 0.35, -PR * 0.4, PR * 0.1, 0, 0, PR);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.3, color);
  g.addColorStop(1, '#00000066');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, PR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g;
  ctx.fill();
  // Raised centre knob.
  const k = ctx.createRadialGradient(-PR * 0.2, -PR * 0.25, PR * 0.03, 0, 0, PR * 0.5);
  k.addColorStop(0, 'rgba(255,255,255,0.9)');
  k.addColorStop(0.5, color);
  k.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = k;
  ctx.beginPath();
  ctx.arc(0, 0, PR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  ctx.arc(0, 0, PR * 0.93, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPuck(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0.005, 0.008, UR, UR, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-UR * 0.35, -UR * 0.4, UR * 0.1, 0, 0, UR);
  g.addColorStop(0, '#6a6a9a');
  g.addColorStop(0.5, '#262642');
  g.addColorStop(1, '#0b0b1c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, UR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3fe0d0';
  ctx.lineWidth = 0.007;
  ctx.beginPath();
  ctx.arc(0, 0, UR * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export default {
  id: 'airhockey',
  name: 'Air Hockey',
  emoji: '🏒',
  blurb: 'Two players, one puck. Drag your paddle; first to 7 wins.',
  minPlayers: 2,
  maxPlayers: 2,
  needsFace: false,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    // Overlays (DOM): waiting for a friend, and the winner card with Rematch.
    const waitCard = document.createElement('div');
    waitCard.className = 'g-center';
    waitCard.style.background = 'rgba(20,10,40,0.6)';
    const waitText = document.createElement('div');
    waitText.className = 'g-big';
    waitText.textContent = 'Waiting for a friend to join…';
    waitCard.append(waitText);
    const winCard = document.createElement('div');
    winCard.className = 'g-center';
    winCard.style.background = 'rgba(20,10,40,0.6)';
    winCard.hidden = true;
    const winText = document.createElement('div');
    winText.className = 'g-big';
    const winScore = document.createElement('div');
    winScore.style.cssText = 'font-weight:900;font-size:1.2rem';
    const rematchBtn = document.createElement('button');
    rematchBtn.className = 'btn';
    rematchBtn.textContent = 'Rematch';
    winCard.append(winText, winScore, rematchBtn);
    api.el.append(waitCard, winCard);

    const wins = { me: api.store.get('wins', 0), lost: api.store.get('losses', 0) };

    // Local simulation / display state.
    const puck = { x: TW / 2, y: TH / 2, vx: 0, vy: 0 };   // owner: real; others: displayed (eased)
    const remote = { p: [TW / 2, TH / 2, 0, 0], at: 0, sig: '' };
    const pads = [
      { x: TW / 2, y: TH * 0.8, vx: 0, vy: 0 },    // role 0 (owner, bottom)
      { x: TW / 2, y: TH * 0.2, vx: 0, vy: 0 },    // role 1 (top)
    ];
    const target = { x: TW / 2, y: TH * 0.8 };     // where I want my paddle
    const keys = new Set();
    let padDir = { x: 0, y: 0 };
    let padWas = false;
    let wasOwner = false;
    let dragging = null;        // { dx, dy }: paddle minus finger, kept for the whole drag
    let touched = false;        // hides the hint once I have moved
    let lastScore = null;
    let lastWinner = null;
    let flash = null;           // { text, until }
    let lastSend = 0, lastShared = 0, sentP = '', sentS = '';
    let lastBounce = 0;
    let w = 0, h = 0, dpr = 1, tw = 1, tx = 0, ty = 0, tableCache = null;
    let raf = 0, last = performance.now(), now = 0;

    // --- roles -----------------------------------------------------------
    function roleOf() {
      const i = api.players().findIndex(p => p.me);
      return i === 0 || i === 1 ? i : -1;
    }
    const flipped = () => roleOf() === 1;
    function playerAt(role) {
      return api.players()[role] || null;
    }
    const two = () => api.players().length >= 2;

    // --- layout ----------------------------------------------------------
    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      tw = Math.min(w * 0.9, (h * 0.94) / TH);
      tx = (w - tw) / 2;
      ty = (h - tw * TH) / 2;
      tableCache = null;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // Client pixels -> canonical table coordinates in my view.
    function toTable(e) {
      const b = canvas.getBoundingClientRect();
      let x = (e.clientX - b.left - tx) / tw;
      let y = (e.clientY - b.top - ty) / tw;
      if (flipped()) {
        x = TW - x;
        y = TH - y;
      }
      return { x, y };
    }

    // --- shared state (owner only) ----------------------------------------
    function startMatch(ids) {
      const to = Math.random() < 0.5 ? 0 : 1;
      puck.x = TW / 2;
      puck.y = TH / 2;
      puck.vx = puck.vy = 0;
      api.setShared({ puck: [TW / 2, TH / 2, 0, 0], score: [0, 0], serveAt: Date.now() + 1500, serveTo: to, winner: null, ids });
    }

    function publishShared(S, force) {
      const t = performance.now();
      if (!force && t - lastShared < SEND_MS) return;
      const out = {
        puck: [r3(puck.x), r3(puck.y), r3(puck.vx), r3(puck.vy)],
        score: S.score, serveAt: S.serveAt, serveTo: S.serveTo, winner: S.winner, ids: S.ids,
      };
      const sig = JSON.stringify(out);
      if (sig === sentS && !force) return;
      sentS = sig;
      lastShared = t;
      api.setShared(out);
    }

    // Keeps shared state matching who is actually seated: start a match when
    // two players are here, mirror it if the owner left and the other player
    // inherited the table, restart if someone new took a seat.
    function reconcile() {
      if (!api.isOwner()) return;
      const ps = api.players();
      if (ps.length < 2) return;
      const ids = [ps[0].id, ps[1].id];
      const S = parseShared(api.shared());
      if (!S) return startMatch(ids);
      if (S.ids[0] === ids[0] && S.ids[1] === ids[1]) return;
      if (S.ids[0] === ids[1] && S.ids[1] === ids[0]) {
        puck.x = TW - S.puck[0];
        puck.y = TH - S.puck[1];
        puck.vx = -S.puck[2];
        puck.vy = -S.puck[3];
        publishShared({ ...S, score: [S.score[1], S.score[0]], serveTo: 1 - S.serveTo, winner: S.winner == null ? null : 1 - S.winner, ids }, true);
      } else startMatch(ids);
    }

    function rematch() {
      if (!api.isOwner()) return api.send('rematch', {});
      const ps = api.players();
      if (ps.length >= 2) startMatch([ps[0].id, ps[1].id]);
    }
    rematchBtn.addEventListener('click', rematch);
    api.on('rematch', (_, from) => {
      if (!api.isOwner()) return;
      const i = api.players().findIndex(p => p.id === from);
      if (i === 0 || i === 1) rematch();
    });

    // --- input -----------------------------------------------------------
    // The paddle keeps its distance from the finger for the whole drag, so
    // you can drag from below it (or anywhere) and still see it.
    function onDown(e) {
      const role = roleOf();
      if (role < 0) return;
      canvas.setPointerCapture?.(e.pointerId);
      const p = toTable(e), pad = pads[role];
      dragging = { dx: pad.x - p.x, dy: pad.y - p.y };
      touched = true;
      onMove(e);
    }
    function onMove(e) {
      if (!dragging) return;
      const p = toTable(e);
      target.x = p.x + dragging.dx;
      target.y = p.y + dragging.dy;
    }
    function onUp() {
      dragging = null;
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const k = KEYMAP[e.code];
      if (k) {
        e.preventDefault();
        if (e.type === 'keydown') {
          keys.add(k);
          touched = true;
        } else keys.delete(k);
      } else if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'Enter') && !winCard.hidden && roleOf() >= 0) {
        e.preventDefault();
        rematch();
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // --- simulation ------------------------------------------------------
    function hitCircle(cx, cy, cr, cvx, cvy, e) {
      const dx = puck.x - cx, dy = puck.y - cy;
      const dist = Math.hypot(dx, dy);
      const min = UR + cr;
      if (dist >= min || dist === 0) return false;
      const nx = dx / dist, ny = dy / dist;
      puck.x = cx + nx * min;
      puck.y = cy + ny * min;
      // Reflect the velocity relative to the (moving) obstacle.
      const vn = (puck.vx - cvx) * nx + (puck.vy - cvy) * ny;
      if (vn < 0) {
        puck.vx -= (1 + e) * vn * nx;
        puck.vy -= (1 + e) * vn * ny;
      }
      return true;
    }

    function capSpeed() {
      const sp = Math.hypot(puck.vx, puck.vy);
      if (sp > MAX_SPEED) {
        puck.vx *= MAX_SPEED / sp;
        puck.vy *= MAX_SPEED / sp;
      }
    }

    // One physics step. Returns 0 or 1 when that role scores.
    function stepPuck(dt) {
      puck.x += puck.vx * dt;
      puck.y += puck.vy * dt;
      const fr = Math.exp(-FRICTION * dt);
      puck.vx *= fr;
      puck.vy *= fr;
      let bounced = false;
      // Side walls.
      if (puck.x < UR) { puck.x = UR; puck.vx = Math.abs(puck.vx) * WALL_E; bounced = true; }
      if (puck.x > TW - UR) { puck.x = TW - UR; puck.vx = -Math.abs(puck.vx) * WALL_E; bounced = true; }
      // End walls, open between the goal posts.
      const inGoal = puck.x > GOAL_L && puck.x < GOAL_R;
      if (!inGoal) {
        if (puck.y < UR) { puck.y = UR; puck.vy = Math.abs(puck.vy) * WALL_E; bounced = true; }
        if (puck.y > TH - UR) { puck.y = TH - UR; puck.vy = -Math.abs(puck.vy) * WALL_E; bounced = true; }
      }
      for (const px of [GOAL_L, GOAL_R]) {
        if (hitCircle(px, 0, POST_R, 0, 0, WALL_E) || hitCircle(px, TH, POST_R, 0, 0, WALL_E)) bounced = true;
      }
      // Paddles.
      let hit = false;
      for (const p of pads) if (hitCircle(p.x, p.y, PR, p.vx, p.vy, PADDLE_E)) hit = true;
      capSpeed();
      const t = performance.now();
      if ((bounced || hit) && t - lastBounce > 80) {
        lastBounce = t;
        api.sfx(hit ? 'click' : 'bounce');
      }
      if (puck.y < -0.005) return 0;
      if (puck.y > TH + 0.005) return 1;
      return null;
    }

    function ownerUpdate(dt) {
      if (!two()) return;
      let S = parseShared(api.shared());
      if (!S) return;
      if (S.winner != null) return;
      if (S.serveAt) {
        puck.x = TW / 2;
        puck.y = TH / 2;
        puck.vx = puck.vy = 0;
        if (Date.now() < S.serveAt) return;
        // Serve toward the player who conceded.
        puck.vx = (Math.random() - 0.5) * 0.5;
        puck.vy = S.serveTo === 0 ? SERVE_SPEED : -SERVE_SPEED;
        S = { ...S, serveAt: 0 };
        publishShared(S, true);
      }
      const n = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let i = 0; i < n; i++) {
        const scorer = stepPuck(dt / n);
        if (scorer != null) {
          const score = S.score.slice();
          score[scorer]++;
          const winner = score[scorer] >= WIN_SCORE ? scorer : null;
          puck.x = TW / 2;
          puck.y = TH / 2;
          puck.vx = puck.vy = 0;
          publishShared({ ...S, score, winner, serveTo: 1 - scorer, serveAt: winner == null ? Date.now() + 1000 : 0 }, true);
          return;
        }
      }
      publishShared(S, false);
    }

    // My paddle: chase the target at a capped speed, inside my half.
    function movePaddle(dt, role) {
      const [y0, y1] = halfRange(role);
      // Keyboard and stick move the target (screen directions, so flip for the rotated view).
      let sx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0) + padDir.x;
      let sy = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0) + padDir.y;
      const sl = Math.hypot(sx, sy);
      if (sl > 1) {
        sx /= sl;
        sy /= sl;
      }
      const f = role === 1 ? -1 : 1;
      target.x += sx * f * KEY_SPEED * dt;
      target.y += sy * f * KEY_SPEED * dt;
      target.x = clamp(target.x, PR, TW - PR);
      target.y = clamp(target.y, y0, y1);
      const p = pads[role];
      const dx = target.x - p.x, dy = target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const step = Math.min(dist, PADDLE_MAX * dt);
      const nx = dist > 1e-6 ? p.x + (dx / dist) * step : p.x;
      const ny = dist > 1e-6 ? p.y + (dy / dist) * step : p.y;
      const m = 1 - Math.exp(-dt * 30);
      p.vx += ((nx - p.x) / dt - p.vx) * m;
      p.vy += ((ny - p.y) / dt - p.vy) * m;
      p.x = nx;
      p.y = ny;
    }

    // Everyone else's paddle: ease toward what they published.
    function easePaddle(dt, role) {
      const pl = playerAt(role);
      const rp = pl && parsePaddle(pl.state?.p, role);
      const p = pads[role];
      if (!rp) return;
      const k = 1 - Math.exp(-dt * 16);
      p.x += (rp.x - p.x) * k;
      p.y += (rp.y - p.y) * k;
      p.vx = rp.vx;
      p.vy = rp.vy;
    }

    // Non-owners: extrapolate the last puck update and ease toward it.
    function followPuck(dt, S) {
      if (!S) return;
      const sig = S.puck.join(',');
      if (sig !== remote.sig) {
        remote.sig = sig;
        remote.p = S.puck;
        remote.at = performance.now();
      }
      const age = Math.min(0.25, (performance.now() - remote.at) / 1000);
      let x = remote.p[0] + remote.p[2] * age;
      const y = remote.p[1] + remote.p[3] * age;
      // Fold x back into the table like a wall bounce.
      const span = TW - 2 * UR;
      let u = (x - UR) % (2 * span);
      if (u < 0) u += 2 * span;
      x = UR + (u > span ? 2 * span - u : u);
      if (Math.hypot(x - puck.x, y - puck.y) > 0.5) {
        puck.x = x;
        puck.y = y;
      } else {
        const k = 1 - Math.exp(-dt * 18);
        puck.x += (x - puck.x) * k;
        puck.y += (y - puck.y) * k;
      }
      puck.vx = remote.p[2];
      puck.vy = remote.p[3];
    }

    // Goals and the winner trigger sounds and messages on every screen.
    function watchScore(S) {
      if (!S) return;
      if (lastScore) {
        const total = S.score[0] + S.score[1];
        if (total > lastScore[0] + lastScore[1]) {
          const scorer = S.score[0] > lastScore[0] ? 0 : 1;
          const pl = playerAt(scorer);
          flash = { text: `${pl ? pl.name : 'Someone'} scores!`, until: now + 1.2 };
          api.sfx('score');
        }
      }
      lastScore = S.score;
      if (S.winner != null && lastWinner == null) {
        const role = roleOf();
        if (role < 0) api.sfx('win');
        else if (role === S.winner) {
          wins.me++;
          api.store.set('wins', wins.me);
          api.sfx('win');
        } else {
          wins.lost++;
          api.store.set('losses', wins.lost);
          api.sfx('lose');
        }
      }
      lastWinner = S.winner;
    }

    function publishPaddle(role) {
      const t = performance.now();
      if (t - lastSend < SEND_MS) return;
      const p = pads[role];
      const out = [r3(p.x), r3(p.y), r3(p.vx), r3(p.vy)];
      const sig = out.join(',');
      if (sig === sentP && t - lastSend < 1000) return;
      sentP = sig;
      lastSend = t;
      api.setState({ p: out });
    }

    function update(dt) {
      const owner = api.isOwner();
      const role = roleOf();
      if (owner && !wasOwner) {
        // Took over: continue from the last shared puck.
        const S = parseShared(api.shared());
        if (S) [puck.x, puck.y, puck.vx, puck.vy] = S.puck;
        reconcile();
      }
      wasOwner = owner;

      if (role >= 0) {
        movePaddle(dt, role);
        publishPaddle(role);
      }
      for (const r of [0, 1]) if (r !== role) easePaddle(dt, r);

      const S = parseShared(api.shared());
      if (owner) ownerUpdate(dt);
      else followPuck(dt, S);
      watchScore(S);

      // Overlays.
      waitCard.hidden = two();
      const won = S && S.winner != null && two();
      winCard.hidden = !won;
      if (won) {
        const pl = playerAt(S.winner);
        winText.textContent = role === S.winner ? 'You win!' : `${pl ? pl.name : 'Someone'} wins!`;
        winScore.textContent = `${S.score[S.winner]} – ${S.score[1 - S.winner]}${role >= 0 ? ` · Your record ${wins.me}–${wins.lost}` : ''}`;
        rematchBtn.hidden = role < 0;
      }
    }

    // --- drawing ---------------------------------------------------------
    function table() {
      const art = api.img('airhockey-table');
      if (tableCache && tableCache.art === art) return tableCache.canvas;
      const c = document.createElement('canvas');
      const sc = tw * dpr;
      c.width = Math.max(1, Math.round(tw * dpr));
      c.height = Math.max(1, Math.round(tw * TH * dpr));
      const g = c.getContext('2d');
      g.scale(sc, sc);
      if (art) g.drawImage(art, 0, 0, TW, TH);
      else drawTable(g);
      tableCache = { canvas: c, art };
      return c;
    }

    function text(str, x, y, size, align, color, alpha) {
      ctx.globalAlpha = alpha ?? 1;
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      // Faint (alpha < 1) text is drawn without an outline, which would show through the fill.
      if (alpha == null || alpha >= 1) {
        ctx.lineWidth = Math.max(3, size * 0.2);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeText(str, x, y);
      }
      ctx.fillStyle = color || '#fff';
      ctx.fillText(str, x, y);
      ctx.globalAlpha = 1;
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const S = parseShared(api.shared());
      const role = roleOf();
      const flip = role === 1;
      const p0 = playerAt(0), p1 = playerAt(1);

      // Table, in canonical coordinates (rotated for the non-owner).
      ctx.save();
      ctx.translate(tx + (flip ? tw : 0), ty + (flip ? tw * TH : 0));
      if (flip) ctx.rotate(Math.PI);
      ctx.scale(tw, tw);
      ctx.drawImage(table(), 0, 0, TW, TH);
      // Goal slots in the owning player's colour: role 0 at the bottom, role 1 at the top.
      for (const [r, y] of [[1, -0.03], [0, TH - 0.005]]) {
        const pl = playerAt(r);
        ctx.fillStyle = '#12082a';
        ctx.fillRect(GOAL_L, y, GOAL_W, 0.035);
        ctx.strokeStyle = pl?.color || '#3fe0d0';
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        ctx.moveTo(GOAL_L, r === 1 ? 0.002 : TH - 0.002);
        ctx.lineTo(GOAL_R, r === 1 ? 0.002 : TH - 0.002);
        ctx.stroke();
      }
      drawPuck(ctx, puck.x, puck.y);
      drawPaddle(ctx, pads[0].x, pads[0].y, p0?.color || '#ff5fa2');
      drawPaddle(ctx, pads[1].x, pads[1].y, p1?.color || '#3fe0d0');
      ctx.restore();

      // HUD (screen space): names and scores, mine at the bottom.
      if (S) {
        const bottom = flip ? 1 : 0, top = 1 - bottom;
        const big = tw * 0.16;
        const mx = tx + tw * 0.07;
        text(String(S.score[top]), mx, ty + tw * TH * 0.5 - big * 0.85, big, 'left', playerAt(top)?.color, 0.5);
        text(String(S.score[bottom]), mx, ty + tw * TH * 0.5 + big * 0.85, big, 'left', playerAt(bottom)?.color, 0.5);
        const fs = clamp(tw * 0.045, 10, 16);
        text(playerAt(top)?.name || '', tx + tw * 0.05, ty + fs * 1.3, fs, 'left', playerAt(top)?.color);
        text(playerAt(bottom)?.name || '', tx + tw * 0.05, ty + tw * TH - fs * 1.3, fs, 'left', playerAt(bottom)?.color);
        const cx = tx + tw / 2, cy = ty + (tw * TH) / 2;
        const wait = S.serveAt - Date.now();
        if (S.winner == null && wait > 0 && two()) {
          text(S.score[0] + S.score[1] === 0 ? 'Get ready!' : 'Serve!', cx, cy - tw * 0.3, clamp(tw * 0.09, 14, 40), 'center', '#ffd43b');
        }
        if (flash && now < flash.until) text(flash.text, cx, cy + tw * 0.3, clamp(tw * 0.08, 13, 34), 'center', '#ffd43b');
        if (role >= 0 && !touched && S.winner == null) {
          text('Drag anywhere to move your paddle', cx, ty + tw * TH - tw * 0.4, clamp(tw * 0.045, 10, 16), 'center', '#fff');
        }
      }
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000) || 0.001;
      last = t;
      now += dt;
      update(dt);
      render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    reconcile();

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
      },
      onChange() {
        reconcile();
      },
      onPad(pad) {
        const dead = v => (Math.abs(v) < 0.15 ? 0 : v);
        padDir = { x: dead(pad.x || 0) * 1.6, y: dead(pad.y || 0) * 1.6 };
        const a = !!(pad.a || pad.pressed?.[0]);
        if (a && !padWas && !winCard.hidden && roleOf() >= 0) rematch();
        padWas = a;
      },
    };
  },
};

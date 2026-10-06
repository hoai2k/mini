// Beach Bump: a beach ball is bumped around the circle of everyone's faces.
// The ball flies in an arc to one player at a time; when it reaches you, bump
// it back up by nodding your head up fast (or tap, Space, controller A) just
// as the shrinking ring closes. A good bump sends it on to a random friend, a
// miss drops it in the sand and costs you a life. Alone you keep it up
// yourself (keepy-uppy).
//
// The owner holds the whole round in shared state: { seq, holder, target,
// launchedAt, flight, rally, lives: {id: n}, res, over }. The target reports
// send('bump', { seq, ok, quality }) and the owner launches the next pass, so
// a new owner can carry on from shared() alone. Timers use Date.now().

const LIVES = 3;
const PRE_MS = 1400;          // pause before a serve leaves
const EARLY_MS = 320;         // a bump counts this long before the ball arrives
const LATE_MS = 220;          // ... and this long after
const GIVE_UP_MS = 1500;      // owner counts a pass as missed if no report arrives
const NOD_SPEED = 1.7;        // nose speed (eye distances per second) that counts as a nod
const FONT = 'ui-rounded, system-ui, sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const initial = name => (String(name || '?').trim()[0] || '?').toUpperCase();

// Flight time shrinks a little as the rally grows.
const flightFor = rally => Math.max(1000, 1900 - rally * 45);

// --- stand-in art ---------------------------------------------------------

// Six-panel beach ball: alternating candy wedges with a white cap on top.
function drawBallStandIn(ctx, x, y, r, rot) {
  const colors = ['#ff5fa2', '#fff7e6', '#3fe0d0', '#fff7e6', '#ffd43b', '#fff7e6'];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 1.2, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Shading and highlight stay unrotated.
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(60,0,80,0.28)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,30,110,0.65)';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

// Sunny beach: sky, sun, sea, sand with a few palm-free shells.
function drawBeach(ctx, w, h, sandY) {
  const sky = ctx.createLinearGradient(0, 0, 0, sandY);
  sky.addColorStop(0, '#59c8ff');
  sky.addColorStop(1, '#bff0ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.82, h * 0.16, 4, w * 0.82, h * 0.16, h * 0.14);
  sun.addColorStop(0, '#fff7b0');
  sun.addColorStop(0.35, '#ffd43b');
  sun.addColorStop(1, 'rgba(255,212,59,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h * 0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [cx, cy, s] of [[0.15, 0.14, 1], [0.5, 0.08, 0.7], [0.68, 0.24, 0.85]]) {
    const x = w * cx, y = h * cy, r = Math.min(w, h) * 0.05 * s;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 1.1, y + r * 0.2, r * 0.75, 0, Math.PI * 2);
    ctx.arc(x - r * 1.1, y + r * 0.25, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }
  const seaY = sandY - h * 0.16;
  const sea = ctx.createLinearGradient(0, seaY, 0, sandY);
  sea.addColorStop(0, '#2fb8e6');
  sea.addColorStop(1, '#3fe0d0');
  ctx.fillStyle = sea;
  ctx.fillRect(0, seaY, w, sandY - seaY);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 12) ctx.lineTo(x, sandY - 4 + Math.sin(x * 0.06) * 3);
  ctx.stroke();
  const sand = ctx.createLinearGradient(0, sandY, 0, h);
  sand.addColorStop(0, '#ffe9a8');
  sand.addColorStop(1, '#f4c97a');
  ctx.fillStyle = sand;
  ctx.fillRect(0, sandY, w, h - sandY);
  ctx.fillStyle = 'rgba(190,120,60,0.18)';
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97) % 100) / 100 * w, y = sandY + (((i * 53) % 100) / 100) * (h - sandY);
    ctx.fillRect(x, y, 3, 2);
  }
}

export default {
  id: 'beachbump',
  name: 'Beach Bump',
  emoji: '🏐',
  blurb: 'Nod to bump the beach ball to a friend. Drop it and you lose a life.',
  minPlayers: 1,
  maxPlayers: 6,
  needsFace: true,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');
    const overlay = document.createElement('div');
    overlay.className = 'g-center';
    overlay.style.cssText = 'position:absolute;inset:0;display:none;pointer-events:none;';
    api.el.append(overlay);

    let best = api.store.get('best', 0);
    let w = 0, h = 0, dpr = 1, inset = { top: 0, bottom: 0 };
    let raf = 0;
    let handledSeq = -1;       // the pass I already answered
    let nodAt = -1e9;          // last nod time, so one nod is one bump
    let prevNose = null;       // { y, t } for nose velocity
    let prevA = false;
    let spin = 0;
    const floaters = [];       // "Perfect!" texts
    let lastResSeq = -1;
    let lastOverAt = 0;

    api.setState({ best });

    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // --- layout ----------------------------------------------------------
    // Faces sit in a row along the bottom (above the app's bar), wrapping to
    // a second row when there are many players on a narrow screen.
    function layout() {
      const list = api.players();
      const n = Math.max(1, list.length);
      const rows = n > 3 && w < 520 ? 2 : 1;
      const perRow = Math.ceil(n / rows);
      const r = clamp(Math.min(w / (perRow * 2.3), (h - inset.top - inset.bottom) / (rows * 3.2 + 3)), 22, 70);
      const slots = {};
      list.forEach((m, i) => {
        const row = Math.floor(i / perRow), col = i % perRow;
        const inRow = row === rows - 1 ? n - perRow * (rows - 1) : perRow;
        const x = (w * (col + 0.5)) / inRow;
        const y = h - inset.bottom - r * 1.5 - (rows - 1 - row) * r * 2.5;
        slots[m.id] = { x, y, r };
      });
      const sandY = Math.min(h - inset.bottom - r * 0.4, (Object.values(slots)[0]?.y ?? h * 0.8) - r * 1.4 * rows);
      return { slots, r, sandY: Math.max(h * 0.45, sandY - r * 0.3) };
    }

    // --- shared state ----------------------------------------------------
    const alive = (sh, id) => (sh.lives?.[id] ?? LIVES) > 0;

    function fresh() {
      return { seq: 0, holder: null, target: null, launchedAt: 0, flight: flightFor(0), rally: 0, lives: {}, res: null, over: false };
    }

    function pickTarget(sh, from) {
      const ids = api.players().map(m => m.id).filter(id => alive(sh, id));
      if (!ids.length) return null;
      const others = ids.filter(id => id !== from);
      const pool = others.length ? others : ids;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Owner: start a new pass from `holder` to someone else.
    function launch(sh, holder, delay) {
      const next = { ...sh, lives: { ...sh.lives } };
      next.seq = sh.seq + 1;
      next.holder = holder;
      next.target = pickTarget(next, holder);
      next.flight = flightFor(next.rally);
      next.launchedAt = Date.now() + delay;
      if (!next.target) next.over = true;
      api.setShared(next);
    }

    function ownerTick() {
      let sh = api.shared();
      if (!sh) {
        ownerAgain();
        return;
      }
      if (sh.over) return;
      // Newcomers start with full lives.
      const missing = api.players().filter(m => sh.lives?.[m.id] == null);
      if (missing.length) {
        sh = { ...sh, lives: { ...sh.lives } };
        for (const m of missing) sh.lives[m.id] = LIVES;
        api.setShared(sh);
      }
      const now = Date.now();
      const present = api.players().some(m => m.id === sh.target);
      if (!present || !alive(sh, sh.target)) {
        // The target left: pass it on without a penalty.
        launch(sh, null, PRE_MS);
      } else if (now > sh.launchedAt + sh.flight + GIVE_UP_MS) {
        resolve(sh, sh.target, false, 0);
      }
    }

    // Owner: apply the target's report for the current pass.
    function resolve(sh, from, ok, quality) {
      if (from !== sh.target) return;
      if (ok) {
        const rally = sh.rally + 1;
        const next = { ...sh, rally, res: { seq: sh.seq, ok: true, q: quality, who: from } };
        launch(next, from, 220);
      } else {
        const lives = { ...sh.lives, [from]: Math.max(0, (sh.lives[from] ?? LIVES) - 1) };
        const next = { ...sh, rally: 0, lives, res: { seq: sh.seq, ok: false, q: 0, who: from, rally: sh.rally } };
        const anyAlive = api.players().some(m => (lives[m.id] ?? LIVES) > 0);
        if (!anyAlive) {
          next.over = true;
          api.setShared(next);
        } else {
          launch(next, null, PRE_MS + 400);
        }
      }
    }

    api.on('bump', (d, from) => {
      const sh = api.shared();
      if (!api.isOwner() || !sh || sh.over || !d || d.seq !== sh.seq) return;
      resolve(sh, from, d.ok === true, clamp(Number(d.quality) || 0, 0, 1));
    });
    api.on('again', () => {
      if (api.isOwner() && api.shared()?.over) ownerAgain();
    });

    // Owner: a fresh game with full lives (messages don't come back to the sender).
    function ownerAgain() {
      const sh = fresh();
      for (const m of api.players()) sh.lives[m.id] = LIVES;
      api.setShared(sh);
      launch(sh, null, PRE_MS + 600);
    }

    // My report for the current pass (once per pass).
    function report(sh, ok, quality) {
      if (handledSeq === sh.seq) return;
      handledSeq = sh.seq;
      if (api.isOwner()) resolve(sh, api.me.id, ok, quality);
      else api.send('bump', { seq: sh.seq, ok, quality });
    }

    // --- input -----------------------------------------------------------
    // Any bump input: counts if the ball is within the window, otherwise it is
    // remembered briefly so an early nod still works.
    function bumpInput() {
      const sh = api.shared();
      if (!sh || sh.over || sh.target !== api.me.id || handledSeq === sh.seq) return;
      const dt = Date.now() - (sh.launchedAt + sh.flight);
      if (dt < -EARLY_MS || dt > LATE_MS) return;
      const q = 1 - Math.abs(dt) / (dt < 0 ? EARLY_MS : LATE_MS);
      report(sh, true, clamp(q, 0.15, 1));
      api.sfx(q > 0.7 ? 'score' : 'pop');
    }

    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      bumpInput();
    });
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        bumpInput();
      }
    }
    window.addEventListener('keydown', onKey);

    // Nodding up: the nose moves up faster than NOD_SPEED eye-distances/second.
    function watchNod(now) {
      const f = api.face();
      if (!f || !f.nose) { prevNose = null; return; }
      const y = f.nose.y, t = now;
      if (prevNose && t > prevNose.t) {
        const v = -((y - prevNose.y) / Math.max(1, f.scale || 60)) / ((t - prevNose.t) / 1000);
        if (v > NOD_SPEED && t - nodAt > 450) {
          nodAt = t;
          bumpInput();
        }
      }
      if (!prevNose || t - prevNose.t > 40) prevNose = { y, t };
    }

    // --- drawing ---------------------------------------------------------
    function drawFace(m, slot, lives, isTarget, ringP) {
      const { x, y, r } = slot;
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
        // Cover-crop the video into the circle.
        const s = Math.max((r * 2) / sw, (r * 2) / sh);
        try {
          ctx.drawImage(media, x - (sw * s) / 2, y - (sh * s) / 2, sw * s, sh * s);
          drew = true;
        } catch (e) { /* not ready yet */ }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial(m.name), x, y + r * 0.05);
      }
      ctx.restore();
      ctx.lineWidth = Math.max(3, r * 0.09);
      ctx.strokeStyle = lives > 0 ? (m.color || '#fff') : 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (lives <= 0) {
        ctx.fillStyle = 'rgba(30,20,50,0.55)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Hearts above the face.
      ctx.font = `${Math.max(11, r * 0.34)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff';
      let hearts = '';
      for (let i = 0; i < LIVES; i++) hearts += i < lives ? '❤️' : '🖤';
      ctx.fillText(hearts, x, y + r + Math.max(13, r * 0.4));
      // The timing ring: big far away, shrinking onto the face.
      if (isTarget && ringP != null) {
        const inWin = ringP <= 1 + LATE_MS / 1900 && ringP >= 1 - EARLY_MS / 1900;
        const ringR = r * (1.12 + 0.9 * clamp((1 - ringP) / 0.6, 0, 1));
        ctx.strokeStyle = inWin ? '#69db7c' : '#ffd43b';
        ctx.lineWidth = Math.max(3, r * 0.1);
        ctx.beginPath();
        ctx.arc(x, y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function text(str, x, y, size, color, align = 'center') {
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(40,10,70,0.7)';
      ctx.strokeText(str, x, y);
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }

    function drawBall(x, y, r, rot) {
      const art = api.img('beach-ball');
      if (art) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.drawImage(art, -r, -r, r * 2, r * 2);
        ctx.restore();
      } else {
        drawBallStandIn(ctx, x, y, r, rot);
      }
    }

    function render(dtSec) {
      const L = layout();
      const sh = api.shared() || fresh();
      const now = Date.now();
      const list = api.players();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBeach(ctx, w, h, L.sandY);
      const ballR = clamp(L.r * 0.55, 16, 44);

      // Where the ball is.
      const tgt = L.slots[sh.target];
      let bx = w / 2, by = inset.top + 40, ringP = null, flying = false, dropped = false;
      if (tgt) {
        const src = sh.holder && L.slots[sh.holder] ? L.slots[sh.holder] : null;
        const sx = src ? src.x : w / 2, sy = src ? src.y - src.r - ballR : inset.top - ballR * 2;
        const ex = tgt.x, ey = tgt.y - tgt.r - ballR * 0.2;
        const p = (now - sh.launchedAt) / sh.flight;
        if (p < 0) {
          bx = sx;
          by = sy + (src ? Math.sin(now / 160) * 4 : 0) + (src ? 0 : ballR * 2.5);
        } else if (p <= 1) {
          flying = true;
          const arc = Math.min(h * 0.42, (h - inset.top - inset.bottom) * 0.5) * (src === tgt || !src ? 1 : 0.8);
          bx = lerp(sx, ex, p);
          by = lerp(sy, ey, p) - 4 * arc * p * (1 - p) * (src && src !== tgt ? 0.7 : 1);
          ringP = p;
        } else {
          // Past the arrival: a hit bounces up; a miss falls to the sand.
          bx = ex;
          // The result lives in the next shared state (seq + 1); until it
          // arrives the ball just waits on the face.
          by = ey;
          ringP = p;
        }
      }
      // Result of the previous pass, shown while the next serve waits.
      const res = sh.res;
      if (res && res.seq === sh.seq - 1 && now < sh.launchedAt) {
        const rs = L.slots[res.who];
        if (rs && !res.ok) {
          dropped = true;
          bx = rs.x;
          const k = clamp(1 - (sh.launchedAt - now) / (PRE_MS + 400), 0, 1);
          by = lerp(rs.y - rs.r, L.sandY + ballR * 0.8, Math.min(1, k * 4));
        }
      }
      if (res && res.seq !== lastResSeq) {
        lastResSeq = res.seq;
        const rs = L.slots[res.who];
        if (rs) {
          floaters.push({
            text: res.ok ? (res.q > 0.7 ? 'Perfect!' : 'Bump!') : 'Dropped!',
            x: rs.x, y: rs.y - rs.r * 1.8, t: 0, color: res.ok ? '#ffd43b' : '#ff6b6b',
          });
          if (res.ok) { if (res.who !== api.me.id) api.sfx('pop'); } else api.sfx('miss');
        }
        if (res.ok && sh.rally > best) {
          best = sh.rally;
          api.store.set('best', best);
          api.setState({ best });
        }
        if (!res.ok && res.rally > best) {
          best = res.rally;
          api.store.set('best', best);
          api.setState({ best });
        }
      }

      // Ball shadow on the sand.
      ctx.fillStyle = 'rgba(120,70,30,0.25)';
      ctx.beginPath();
      const shadowY = L.sandY + (h - L.sandY) * 0.12;
      ctx.ellipse(bx, dropped ? by + ballR * 0.6 : shadowY, ballR * (dropped ? 1 : 0.8), ballR * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Faces.
      list.forEach(m => {
        const slot = L.slots[m.id];
        if (!slot) return;
        const lives = sh.lives?.[m.id] ?? LIVES;
        const isTarget = m.id === sh.target && !sh.over && flying;
        drawFace(m, slot, lives, isTarget, isTarget ? ringP : null);
        if (m.id === sh.target && !sh.over && ringP != null && ringP > 0 && m.me) {
          // Prompt for my turn.
          text('NOD! (or tap)', clamp(slot.x, 80, w - 80), slot.y - slot.r * 1.5 - ballR * 2.2, clamp(L.r * 0.4, 14, 26), '#fff');
        }
        if (!m.me && slot) {
          ctx.font = `800 ${Math.max(10, L.r * 0.26)}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#4a2a6a';
          ctx.fillText(m.name, slot.x, slot.y + slot.r + Math.max(13, L.r * 0.4) + Math.max(11, L.r * 0.3));
        }
      });

      // Ball.
      if (tgt) {
        spin += dtSec * (flying ? 6 : 1);
        drawBall(bx, by, ballR, spin);
      }

      // Floaters.
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.t += dtSec;
        if (f.t > 1.1) { floaters.splice(i, 1); continue; }
        ctx.globalAlpha = clamp(1.1 - f.t, 0, 1);
        text(f.text, f.x, f.y - f.t * 40, 24, f.color);
        ctx.globalAlpha = 1;
      }

      // HUD: rally in the middle top, best on the right.
      const hudY = inset.top + 30;
      text(`Rally ${sh.rally}`, w / 2, hudY, 30, '#fff');
      text(`Best ${best}`, w - 14, hudY, 16, '#ffd43b', 'right');
      const waiting = sh.launchedAt > now && !sh.over;
      if (waiting && sh.rally === 0 && (!sh.res || sh.res.seq < sh.seq - 1)) {
        text(list.length > 1 ? 'Bump the ball to your friends!' : 'Keep it up all by yourself!', w / 2, hudY + 30, clamp(w * 0.04, 13, 20), '#fff');
        text('Nod your head up, tap, or press Space when the ring closes', w / 2, hudY + 54, clamp(w * 0.03, 11, 15), '#fff');
      }
      if (sh.over) {
        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'auto';
        if (lastOverAt === 0) { lastOverAt = now; api.sfx('lose'); }
      } else {
        overlay.style.display = 'none';
        lastOverAt = 0;
      }
    }

    // Game over card with a Play again button.
    const card = document.createElement('div');
    card.style.cssText = 'text-align:center;padding:16px 22px;border-radius:16px;background:rgba(40,10,70,0.88);display:flex;flex-direction:column;align-items:center;gap:6px;';
    const title = document.createElement('div');
    title.className = 'g-big';
    title.textContent = 'Game over';
    const sub = document.createElement('div');
    const again = document.createElement('button');
    again.className = 'btn aqua';
    again.textContent = 'Play again';
    again.style.marginTop = '10px';
    again.addEventListener('click', () => {
      if (api.isOwner()) ownerAgain();
      else api.send('again', {});
    });
    card.append(title, sub, again);
    overlay.append(card);
    let lastSub = '';
    function updateCard() {
      const sh = api.shared();
      const s = sh?.res?.rally != null ? `Last rally ${sh.res.rally} · Best ${best}` : `Best rally ${best}`;
      if (s !== lastSub) { sub.textContent = s; lastSub = s; }
    }

    let last = performance.now();
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (api.isOwner()) ownerTick();
      const sh = api.shared();
      if (sh) {
        watchNod(t);
        // A tap that came a little early still counts once the window opens.
        const dtArr = Date.now() - (sh.launchedAt + sh.flight);
        if (sh.target === api.me.id && !sh.over && handledSeq !== sh.seq && dtArr > LATE_MS) report(sh, false, 0);
      }
      updateCard();
      render(dt);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
      },
      onPad(pad) {
        const a = !!pad.pressed?.[0] || !!pad.a;
        if (a && !prevA) bumpInput();
        prevA = a;
      },
    };
  },
};

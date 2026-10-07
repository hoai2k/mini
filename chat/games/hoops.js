// Hoops: flick the ball up at the hoop, laid out like Messenger's basketball
// game: a big hoop near the top, the ball near the bottom, a long lens so the
// ball only shrinks a little on its way up, and a forgiving aim (any swipe
// roughly towards the hoop and roughly the right length goes in). Every basket adds to your all-time
// total, which is kept on this device, and consecutive baskets build a
// streak. Friends in the session see each of your shots as a see-through
// ghost ball in your colour, and you see theirs. Shots are simulated with the
// same deterministic physics everywhere, so a ghost goes in exactly when the
// real shot did.

const G = 9.8;
const BALL_R = 0.12;
const RIM = { y: 3.05, z: 2.4, r: 0.23 };
// The backboard matches the delivered art: it reaches 0.36 m above the rim,
// 0.08 m below it and 0.35 m to each side.
const BOARD = { z: 2.78, x0: -0.35, x1: 0.35, y0: 2.97, y1: 3.41 };
const START = { y: 1.9, z: 0 };
// A camera far behind the ball with a long lens: the ball and the hoop are
// both big, and the ball is only about a third smaller at the rim.
const EYE = { x: 0, y: 2.3, z: -6 };
const STEP = 1 / 240;
const SHOT_TIME = 3.2;
// Forgiveness: swipes within AIM_SLACK of the ideal direction (sideways per
// unit up) fly dead centre, and any length between POWER_LO and POWER_HI
// reaches the rim.
const AIM_SLACK = 0.14;
const POWER_LO = 0.3, POWER_HI = 2;
const CHARGE_MAX = 2.8; // top of the Space / controller power meter

// --- physics -------------------------------------------------------------

// Initial velocity that carries the ball from (x0, START) to the target point
// with a high arc, so it drops into the rim from above. `aim` is how far the
// swipe was off the ideal direction (sideways per unit up); `power` is the
// swipe length, 1 being a good one.
function solveShot(x0, power, aim) {
  const off = Math.sign(aim) * Math.max(0, Math.abs(aim) - AIM_SLACK);
  const long = power < POWER_LO ? power - POWER_LO : power > POWER_HI ? power - POWER_HI : 0;
  const tz = RIM.z + long * 1.2;
  const tx = off * 1.1;
  const ty = RIM.y + 0.02;
  const apex = RIM.y + 0.6;
  const vy = Math.sqrt(2 * G * (apex - START.y));
  const t = vy / G + Math.sqrt((2 * (apex - ty)) / G);
  return [(tx - x0) / t, vy, (tz - START.z) / t];
}

function newBall(x0, v) {
  return { x: x0, y: START.y, z: START.z, vx: v[0], vy: v[1], vz: v[2], t: 0, scored: false, done: false, spin: 0, hits: 0 };
}

// Advances a ball by one fixed step. Returns 'rim', 'board', 'score' or null.
function stepBall(b) {
  let event = null;
  const py = b.y;
  b.vy -= G * STEP;
  b.x += b.vx * STEP;
  b.y += b.vy * STEP;
  b.z += b.vz * STEP;
  b.t += STEP;
  b.spin += STEP * 8;

  // Backboard.
  if (b.vz > 0 && b.z + BALL_R > BOARD.z && b.z - BALL_R < BOARD.z && b.x > BOARD.x0 && b.x < BOARD.x1 && b.y > BOARD.y0 && b.y < BOARD.y1) {
    b.z = BOARD.z - BALL_R;
    b.vz = -b.vz * 0.55;
    b.vx *= 0.85;
    b.vy *= 0.9;
    event = 'board';
  }

  // Rim: a thin ring; push the ball off the nearest point on it.
  const rx = b.x, rz = b.z - RIM.z;
  const len = Math.hypot(rx, rz) || 1e-6;
  const qx = (rx / len) * RIM.r, qz = RIM.z + (rz / len) * RIM.r;
  const dx = b.x - qx, dy = b.y - RIM.y, dz = b.z - qz;
  const d = Math.hypot(dx, dy, dz);
  const reach = BALL_R + 0.012;
  if (d < reach) {
    const nx = dx / d, ny = dy / d, nz = dz / d;
    b.x = qx + nx * reach;
    b.y = RIM.y + ny * reach;
    b.z = qz + nz * reach;
    const vn = b.vx * nx + b.vy * ny + b.vz * nz;
    if (vn < 0) {
      b.vx -= 1.55 * vn * nx;
      b.vy -= 1.55 * vn * ny;
      b.vz -= 1.55 * vn * nz;
      b.hits++;
      event = 'rim';
    }
  }

  // Through the hoop: crossing the rim plane going down, inside the ring.
  if (!b.scored && py >= RIM.y && b.y < RIM.y && b.vy < 0 && Math.hypot(b.x, b.z - RIM.z) < RIM.r - BALL_R * 0.35) {
    b.scored = true;
    event = 'score';
  }

  if (b.y < BALL_R) {
    b.y = BALL_R;
    b.vy = -b.vy * 0.5;
    b.vx *= 0.8;
    b.vz *= 0.8;
  }
  if (b.t > SHOT_TIME || (b.t > 0.6 && b.y < 1.3 && b.vy < 0)) b.done = true;
  return event;
}

// --- drawing helpers -----------------------------------------------------

function project(cam, x, y, z) {
  const zc = z - EYE.z;
  return { x: cam.cx + ((x - EYE.x) / zc) * cam.f, y: cam.cy - ((y - EYE.y) / zc) * cam.f, s: cam.f / zc };
}

function drawCourtStandIn(ctx, w, h, floorY) {
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, '#2d5fa8');
  wall.addColorStop(1, '#4f86d1');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, floorY);
  // Windows along the top.
  ctx.fillStyle = 'rgba(255,255,240,0.35)';
  const ww = w / 9;
  for (let i = 0; i < 8; i++) ctx.fillRect(ww * 0.5 + i * ww * 1.05, h * 0.05, ww * 0.8, h * 0.09);
  // Padded wall panels.
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += w / 12) {
    ctx.beginPath();
    ctx.moveTo(x, floorY - h * 0.16);
    ctx.lineTo(x, floorY);
    ctx.stroke();
  }
  ctx.fillStyle = '#1f3f73';
  ctx.fillRect(0, floorY - h * 0.16, w, 4);
  // Wooden floor.
  const floor = ctx.createLinearGradient(0, floorY, 0, h);
  floor.addColorStop(0, '#c98a4b');
  floor.addColorStop(1, '#e8b27a');
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = 'rgba(120,70,30,0.25)';
  for (let i = 1; i < 10; i++) {
    const y = floorY + ((h - floorY) * i * i) / 100;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(w / 2, floorY + (h - floorY) * 0.25, w * 0.22, (h - floorY) * 0.12, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBallStandIn(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffb066');
  g.addColorStop(0.7, '#ef7a22');
  g.addColorStop(1, '#b4500f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a1d0a';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-r * 1.25, 0, r * 0.95, -0.75, 0.75);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.75, Math.PI + 0.75);
  ctx.stroke();
  ctx.restore();
}

export default {
  id: 'hoops',
  name: 'Hoops',
  emoji: '🏀',
  blurb: 'Swipe up to shoot. Friends’ shots fly as ghosts. Your total is saved.',
  minPlayers: 1,
  maxPlayers: 16,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    const record = { total: api.store.get('total', 0), best: api.store.get('best', 0) };
    let streak = 0;
    let ball = null;           // my shot in flight
    let x0 = 0;                // where my next shot starts
    let resetAt = 0;           // time the next ball appears
    let swish = 0;             // net animation timer
    const ghosts = [];         // friends' shots in flight
    const floaters = [];       // floating "+1" texts
    let drag = null;
    let charge = null;         // keyboard / controller charging { power, dir }
    let aim = 0;
    let shotsTaken = api.store.get('shots', 0);
    let w = 0, h = 0, dpr = 1, cam = null, bgCache = null, inset = { top: 0, bottom: 0 };
    let raf = 0, last = performance.now(), acc = 0, now = 0;

    api.setState({ streak, best: record.best, total: record.total });

    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // Fit from the top of the backboard down to the ball between the bars
      // (and the score line), with the rim at most 44% of the width. Spare
      // height goes mostly below the hoop, so the ball sits near the bottom.
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      const top = inset.top + 40, avail = Math.max(120, h - top - inset.bottom - 16);
      const up = (BOARD.y1 + 0.04 - EYE.y) / (RIM.z - EYE.z);
      const down = (EYE.y - START.y + BALL_R * 1.2) / (START.z - EYE.z);
      const f = Math.min(avail / (up + down), (0.44 * w * (RIM.z - EYE.z)) / (2 * RIM.r));
      cam = { f, cx: w / 2, cy: top + (avail - (up + down) * f) * 0.3 + up * f };
      bgCache = null;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    function background() {
      const art = api.img('court');
      if (bgCache && bgCache.art === art) return bgCache.canvas;
      const c = document.createElement('canvas');
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const floorY = project(cam, 0, 0, RIM.z + 0.4).y;
      if (art) {
        const s = Math.max(w / art.width, h / art.height);
        g.drawImage(art, (w - art.width * s) / 2, (h - art.height * s) / 2, art.width * s, art.height * s);
      } else {
        drawCourtStandIn(g, w, h, Math.min(h * 0.92, floorY));
      }
      bgCache = { canvas: c, art };
      return c;
    }

    function shoot(power, aimRatio) {
      if (ball || now < resetAt) return;
      const v = solveShot(x0, power, aimRatio);
      ball = newBall(x0, v);
      shotsTaken++;
      api.store.set('shots', shotsTaken);
      api.send('shot', { x0, v });
      api.sfx('whoosh');
    }

    function finishShot() {
      if (ball.scored) {
        streak++;
        record.total++;
        if (streak > record.best) record.best = streak;
        api.store.set('total', record.total);
        api.store.set('best', record.best);
      } else {
        if (streak >= 3) api.toast(`Streak ended at ${streak}`);
        streak = 0;
        api.sfx('miss');
      }
      api.setState({ streak, best: record.best, total: record.total });
      ball = null;
      resetAt = now + 0.35;
      // After five in a row you start shooting from different spots.
      x0 = streak >= 5 ? Math.round((Math.random() * 0.5 - 0.25) * 100) / 100 : 0;
    }

    // --- input -------------------------------------------------------------
    function onDown(e) {
      canvas.setPointerCapture?.(e.pointerId);
      drag = { x: e.offsetX, y: e.offsetY, cx: e.offsetX, cy: e.offsetY, t: performance.now() };
    }
    function onMove(e) {
      if (!drag) return;
      drag.cx = e.offsetX;
      drag.cy = e.offsetY;
    }
    function onUp(e) {
      if (!drag) return;
      const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
      drag = null;
      if (-dy < 25) return;
      // Compare the swipe with the line from the ball to the hoop on screen.
      const from = project(cam, x0, START.y, START.z), to = project(cam, 0, RIM.y, RIM.z);
      const ideal = (to.x - from.x) / (from.y - to.y);
      const power = -dy / (0.5 * (from.y - to.y));
      shoot(Math.max(0.2, Math.min(2.5, power)), dx / -dy - ideal);
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', () => { drag = null; });

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (e.type === 'keydown' && !charge && !e.repeat) charge = { power: 0.3, dir: 1 };
        if (e.type === 'keyup' && charge) {
          shoot(charge.power, aim);
          charge = null;
        }
      } else if (e.type === 'keydown' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        e.preventDefault();
        aim = Math.max(-0.5, Math.min(0.5, aim + (e.code === 'ArrowLeft' ? -0.05 : 0.05)));
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // --- network -----------------------------------------------------------
    api.on('shot', (data, from) => {
      if (!data || !Array.isArray(data.v) || data.v.length !== 3 || !data.v.every(Number.isFinite)) return;
      const p = api.players().find(m => m.id === from);
      if (!p || ghosts.length > 20) return;
      const x = Math.max(-1, Math.min(1, Number(data.x0) || 0));
      ghosts.push({ ball: newBall(x, data.v), name: p.name, color: p.color });
    });

    // --- loop --------------------------------------------------------------
    function update(dt) {
      if (charge) {
        charge.power += charge.dir * dt * 1.6;
        if (charge.power > CHARGE_MAX) { charge.power = CHARGE_MAX; charge.dir = -1; }
        if (charge.power < 0.3) { charge.power = 0.3; charge.dir = 1; }
      }
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        if (ball) {
          const ev = stepBall(ball);
          if (ev === 'score') {
            swish = 0.5;
            api.sfx('score');
            floaters.push({ text: streak + 1 > 1 ? `${streak + 1} in a row!` : 'Swish!', x: 0, y: RIM.y - 0.3, t: 0, color: '#ffd43b' });
          } else if (ev === 'rim' || ev === 'board') {
            api.sfx('bounce');
          }
          if (ball.done) finishShot();
        }
        for (const g of ghosts) {
          if (stepBall(g.ball) === 'score') floaters.push({ text: `+1 ${g.name}`, x: g.ball.x, y: RIM.y - 0.2, t: 0, color: g.color });
        }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].ball.done) ghosts.splice(i, 1);
      for (let i = floaters.length - 1; i >= 0; i--) if ((floaters[i].t += dt) > 1.2) floaters.splice(i, 1);
      swish = Math.max(0, swish - dt);
    }

    function drawHoop(front) {
      const art = api.img('hoop');
      const L = project(cam, -RIM.r, RIM.y, RIM.z);
      const R = project(cam, RIM.r, RIM.y, RIM.z);
      if (art) {
        // Where the rim sits in the delivered art (measured from the image):
        // its widest points run from x 222 to 802 at y 505, and everything
        // from y 500 down (front of the rim and the net) is drawn over the ball.
        const s = (R.x - L.x) / 580;
        const x = L.x - 222 * s, y = L.y - 505 * s;
        if (!front) ctx.drawImage(art, x, y, 1024 * s, 1024 * s);
        else ctx.drawImage(art, 0, 500, 1024, 524, x, y + 500 * s, 1024 * s, 524 * s);
        return;
      }
      const back = project(cam, 0, RIM.y, RIM.z + RIM.r);
      const frontPt = project(cam, 0, RIM.y, RIM.z - RIM.r);
      const cx = (L.x + R.x) / 2, rx = (R.x - L.x) / 2;
      const cy = (back.y + frontPt.y) / 2, ry = Math.max(2, (frontPt.y - back.y) / 2);
      const netDrop = project(cam, 0, RIM.y - 0.45, RIM.z).y - cy;
      const sway = Math.sin(swish * 30) * swish * 6;
      if (!front) {
        // Backboard.
        const a = project(cam, BOARD.x0, BOARD.y1, BOARD.z);
        const b = project(cam, BOARD.x1, BOARD.y0, BOARD.z);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = '#8a93a6';
        ctx.lineWidth = Math.max(2, cam.f * 0.006);
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        const s1 = project(cam, -0.3, RIM.y + 0.45, BOARD.z);
        const s2 = project(cam, 0.3, RIM.y + 0.03, BOARD.z);
        ctx.strokeStyle = '#e8413a';
        ctx.lineWidth = Math.max(2, cam.f * 0.008);
        ctx.strokeRect(s1.x, s1.y, s2.x - s1.x, s2.y - s1.y);
        // Back half of the rim and net.
        ctx.strokeStyle = '#c4501a';
        ctx.lineWidth = Math.max(2, cam.f * 0.009);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      // Net: strings from the rim to a narrower ring below.
      ctx.strokeStyle = front ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1, cam.f * 0.003);
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (front ? i / n : 1 + i / n);
        const top = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
        const bot = { x: cx + Math.cos(a) * rx * 0.55 + sway, y: cy + netDrop + Math.sin(a) * ry * 0.5 };
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(bot.x, bot.y);
        ctx.stroke();
      }
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        ctx.beginPath();
        ctx.ellipse(cx + sway * t, cy + netDrop * t, rx * (1 - 0.45 * t), ry * (1 - 0.5 * t), 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.stroke();
      }
      if (front) {
        ctx.strokeStyle = '#f26b21';
        ctx.lineWidth = Math.max(3, cam.f * 0.011);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
        ctx.stroke();
      }
    }

    function drawBall(b, alpha, tint) {
      const p = project(cam, b.x, b.y, b.z);
      const r = BALL_R * p.s;
      ctx.save();
      ctx.globalAlpha = alpha;
      const art = api.img('basketball');
      if (art) {
        ctx.translate(p.x, p.y);
        ctx.rotate(b.spin);
        ctx.drawImage(art, -r, -r, r * 2, r * 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        drawBallStandIn(ctx, p.x, p.y, r, b.spin);
      }
      if (tint) {
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = tint;
        ctx.lineWidth = Math.max(2, r * 0.18);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.08, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      return { p, r };
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(background(), 0, 0, w, h);
      drawHoop(false);

      // Balls behind the rim's front edge draw before the front of the hoop.
      const all = ghosts.map(g => ({ b: g.ball, alpha: 0.42, tint: g.color, name: g.name }));
      const waiting = !ball && now >= resetAt;
      const mine = ball || (waiting ? newBall(x0, [0, 0, 0]) : null);
      if (mine) all.push({ b: mine, alpha: 1, tint: null, name: null });
      all.sort((a, c) => c.b.z - a.b.z);
      const inside = e => e.b.z > RIM.z - RIM.r - BALL_R && e.b.y < RIM.y + BALL_R * 2 && e.b.vy < 0;
      for (const e of all.filter(inside)) drawBall(e.b, e.alpha, e.tint);
      drawHoop(true);
      for (const e of all.filter(e => !inside(e))) {
        const { p, r } = drawBall(e.b, e.alpha, e.tint);
        if (e.name) {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = e.tint;
          ctx.font = '800 12px ui-rounded, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(e.name, p.x, p.y - r - 6);
          ctx.globalAlpha = 1;
        }
      }

      for (const f of floaters) {
        const p = project(cam, f.x, f.y + f.t * 0.6, RIM.z);
        ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2);
        ctx.fillStyle = f.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 4;
        ctx.font = '900 22px ui-rounded, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(f.text, p.x, p.y);
        ctx.fillText(f.text, p.x, p.y);
        ctx.globalAlpha = 1;
      }

      // Drag line and power meter.
      if (drag) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(drag.x, drag.y);
        ctx.lineTo(drag.cx, drag.cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (charge) {
        const mh = h * 0.4, mx = w - 26, my = h * 0.5 - mh / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(mx, my, 14, mh);
        ctx.fillStyle = 'rgba(105,219,124,0.5)';
        ctx.fillRect(mx, my + mh * (1 - POWER_HI / CHARGE_MAX), 14, mh * ((POWER_HI - POWER_LO) / CHARGE_MAX));
        ctx.fillStyle = '#ffd43b';
        const ph = (charge.power / CHARGE_MAX) * mh;
        ctx.fillRect(mx + 3, my + mh - ph, 8, ph);
        const a = project(cam, x0, START.y, START.z);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 30);
        ctx.lineTo(a.x + aim * 160, a.y - 110);
        ctx.stroke();
      }

      // HUD.
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 4;
      ctx.font = '900 20px ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'left';
      const left = `Streak ${streak}`;
      const hudY = inset.top + 24;
      ctx.strokeText(left, 14, hudY);
      ctx.fillText(left, 14, hudY);
      ctx.textAlign = 'right';
      const right = `Best ${record.best} · Total ${record.total}`;
      ctx.strokeText(right, w - 14, hudY);
      ctx.fillText(right, w - 14, hudY);
      ctx.font = '800 13px ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'left';
      let y = hudY + 22;
      for (const m of api.players()) {
        if (m.me) continue;
        const s = m.state || {};
        const line = `${m.name}: streak ${s.streak ?? 0} · best ${s.best ?? 0}`;
        ctx.fillStyle = m.color || '#fff';
        ctx.strokeText(line, 12, y);
        ctx.fillText(line, 12, y);
        y += 18;
      }
      if (shotsTaken === 0 && !ball) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        const bp = project(cam, x0, START.y, START.z);
        const hintY = bp.y - BALL_R * bp.s - 34;
        ctx.font = '900 20px ui-rounded, system-ui, sans-serif';
        ctx.strokeText('Swipe up to shoot', w / 2, hintY);
        ctx.fillText('Swipe up to shoot', w / 2, hintY);
        ctx.font = '800 13px ui-rounded, system-ui, sans-serif';
        ctx.strokeText('or hold Space / A', w / 2, hintY + 18);
        ctx.fillText('or hold Space / A', w / 2, hintY + 18);
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
        window.removeEventListener('keyup', onKey);
      },
      onPad(pad) {
        aim = Math.max(-0.5, Math.min(0.5, pad.x * 0.5));
        if (pad.pressed[0] && !charge) charge = { power: 0.3, dir: 1 };
        if (!pad.pressed[0] && charge) {
          shoot(charge.power, aim);
          charge = null;
        }
      },
    };
  },
};

// Exposed for tests.
export const _physics = { solveShot, newBall, stepBall, RIM };

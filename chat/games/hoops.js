// Hoops: pick up the ball and toss it at the hoop, laid out like Messenger's
// basketball game: a big hoop near the top, the ball near the bottom and a
// long lens, so the ball only shrinks a little on its way up. The ball follows
// your finger while you hold it and flies from wherever you let go, with the
// speed and direction of your toss and nothing nudging it in. It is
// essentially 2D: every ball reaches the hoop's distance and never goes past
// it; the swipe's speed sets how high it is when it gets there and its
// direction on screen where it is sideways. Every five shots the
// hoop moves somewhere else.
//
// Every basket adds to your all-time total, kept on this device, and baskets
// in a row build a streak. Friends see each of your shots as a see-through
// ghost ball in your colour, and you see theirs: shots carry where they
// started, their velocity and where the thrower's hoop was, and replay with
// the same deterministic physics, shifted so they fly at your hoop.

const G = 9.8;
const BALL_R = 0.12;
const RIM_R = 0.23;
// Where the hoop can be (rim centre, metres). It starts at the first and
// moves to another every SHOTS_PER_SPOT shots.
const SPOTS = [
  { x: 0, y: 3.05, z: 2.4 },
  { x: -0.15, y: 3.05, z: 2.2 },
  { x: 0.15, y: 3.1, z: 2.6 },
  { x: -0.1, y: 3.15, z: 2.8 },
  { x: 0.12, y: 2.95, z: 2.1 },
  { x: 0.15, y: 3.0, z: 2.3 },
  { x: -0.15, y: 3.1, z: 2.5 },
];
const SHOTS_PER_SPOT = 5;
// The ball's resting spot, and the box it can be carried around in.
const REST = { x: 0, y: 1.9, z: 0 };
const HOLD = { x0: -0.6, x1: 0.6, y0: 1.45, y1: 2.7 };
// A camera far behind the ball with a long lens.
const EYE = { x: 0, y: 2.3, z: -6 };
const STEP = 1 / 240;
const SHOT_TIME = 3.2;
// The throw is essentially 2D. Every ball travels towards the hoop at the
// same FORWARD speed (a swipe on a screen can't say how far), so it always
// arrives at the hoop's distance after the same time and can never sail past
// it: the backboard's plane is a wall. What the swipe controls is how high
// the ball is by then (its upward speed) and where it is sideways (its
// direction). Finger speed maps to upward speed on an S-curve in log space,
// centred on U0: around U0 the ball's height changes slowly, so most of the
// range of a finger's speeds is spent near a good throw, and far from it the
// change speeds up, out to throws that drop well short or slam the board.
// Slower than MIN_SPEED isn't a throw: the ball is just put down.
const FORWARD = 2.5;     // m/s towards the hoop
const U0 = 2.4;          // finger speed (m/s at the ball) for the middle of the rim
const CURVE = 0.8;       // how sharply speeds away from U0 spread out
const MIN_SPEED = 0.8;
const CHARGE_MAX = 6;    // top of the Space / controller meter (finger m/s)

// The backboard matches the delivered art: it reaches 0.36 m above the rim,
// 0.08 m below it and 0.35 m to each side, 0.38 m behind the rim's centre.
function boardOf(hoop) {
  return { z: hoop.z + 0.38, x0: hoop.x - 0.35, x1: hoop.x + 0.35, y0: hoop.y - 0.08, y1: hoop.y + 0.36 };
}

// --- physics -------------------------------------------------------------

// The upward speed that puts the ball just above the rim's middle at the
// moment it reaches the hoop's distance.
function idealVy(from, hoop) {
  const t = Math.max(0.05, (hoop.z - from.z) / FORWARD);
  return (hoop.y + 0.02 - from.y + 0.5 * G * t * t) / t;
}

// The ball's starting velocity for a toss: `up` is the finger's upward speed
// (m/s at the ball) and `targetX` where the swipe was heading, sideways, at
// the hoop's distance.
function throwVelocity(from, up, targetX, hoop) {
  const t = Math.max(0.05, (hoop.z - from.z) / FORWARD);
  const x = Math.log(Math.max(1e-3, up) / U0);
  const vy = idealVy(from, hoop) * Math.exp(Math.sign(x) * CURVE * x * x);
  return [(targetX - from.x) / t, vy, FORWARD];
}

function newBall(from, v, hoop) {
  return {
    x: from.x, y: from.y, z: from.z, vx: v[0], vy: v[1], vz: v[2],
    hoop: { x: hoop.x, y: hoop.y, z: hoop.z }, board: boardOf(hoop),
    t: 0, scored: false, done: false, spin: 0, hits: 0,
  };
}

// Advances a ball by one fixed step. Returns 'rim', 'board', 'score' or null.
function stepBall(b) {
  let event = null;
  const py = b.y;
  const H = b.hoop, B = b.board;
  b.vy -= G * STEP;
  b.x += b.vx * STEP;
  b.y += b.vy * STEP;
  b.z += b.vz * STEP;
  b.t += STEP;
  b.spin += STEP * 8;

  // The backboard bounces the ball back; anywhere else on its plane the
  // ball just stops going forward and drops (nothing gets past the hoop).
  if (b.vz > 0 && b.z + BALL_R > B.z) {
    b.z = B.z - BALL_R;
    if (b.x > B.x0 && b.x < B.x1 && b.y > B.y0 && b.y < B.y1) {
      b.vz = -b.vz * 0.55;
      b.vx *= 0.85;
      b.vy *= 0.9;
      event = 'board';
    } else {
      b.vz = 0;
      b.vx *= 0.5;
    }
  }

  // Rim: a thin ring; push the ball off the nearest point on it.
  const rx = b.x - H.x, rz = b.z - H.z;
  const len = Math.hypot(rx, rz) || 1e-6;
  const qx = H.x + (rx / len) * RIM_R, qz = H.z + (rz / len) * RIM_R;
  const dx = b.x - qx, dy = b.y - H.y, dz = b.z - qz;
  const d = Math.hypot(dx, dy, dz);
  const reach = BALL_R + 0.012;
  if (d < reach) {
    const nx = dx / d, ny = dy / d, nz = dz / d;
    b.x = qx + nx * reach;
    b.y = H.y + ny * reach;
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
  if (!b.scored && py >= H.y && b.y < H.y && b.vy < 0 && Math.hypot(b.x - H.x, b.z - H.z) < RIM_R - BALL_R * 0.35) {
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
  // Screen position and scale of a world point.
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
  blurb: 'Pick up the ball and toss it. Friends’ shots fly as ghosts. Your total is saved.',
  minPlayers: 1,
  maxPlayers: 16,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.style.touchAction = 'none';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    const record = { total: api.store.get('total', 0), best: api.store.get('best', 0) };
    let streak = 0;
    let ball = null;           // my shot in flight
    const held = { x: REST.x, y: REST.y, z: REST.z }; // the ball when not flying
    let grab = null;           // finger holding the ball: { id, ox, oy, near, sx, sy, samples }
    let resetAt = 0;           // time the next ball appears
    let swish = 0;             // net animation timer
    const ghosts = [];         // friends' shots in flight
    const floaters = [];       // floating texts
    let charge = null;         // keyboard / controller charging { power, dir }
    let aim = 0;
    let shotsTaken = api.store.get('shots', 0);
    let sessionShots = 0;
    let lastToss = null;       // for tests
    // The hoop: where it is drawn now, and a move in progress.
    let spot = 0;
    const hoop = { ...SPOTS[0] };
    let move = null;           // { from, to, t }
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
      // Fit from the highest backboard top any spot has down to the resting
      // ball between the bars (and the score line), with the rim at most 44%
      // of the width at the nearest spot. Spare height goes mostly below the
      // hoop, so the ball sits near the bottom.
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      const top = inset.top + 40, avail = Math.max(120, h - top - inset.bottom - 16);
      const up = Math.max(...SPOTS.map(s => (boardOf(s).y1 + 0.04 - EYE.y) / (s.z - EYE.z)));
      const down = (EYE.y - REST.y + BALL_R * 1.2) / (REST.z - EYE.z);
      const near = Math.min(...SPOTS.map(s => s.z)) - EYE.z;
      const f = Math.min(avail / (up + down), (0.44 * w * near) / (2 * RIM_R));
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
      const floorY = project(cam, 0, 0, SPOTS[0].z + 0.4).y;
      if (art) {
        const s = Math.max(w / art.width, h / art.height);
        g.drawImage(art, (w - art.width * s) / 2, (h - art.height * s) / 2, art.width * s, art.height * s);
      } else {
        drawCourtStandIn(g, w, h, Math.min(h * 0.92, floorY));
      }
      bgCache = { canvas: c, art };
      return c;
    }

    const ready = () => !ball && !move && now >= resetAt;

    // Throws from `from` with upward speed `up` (m/s at the ball) along a
    // screen direction `ratio` (sideways pixels per pixel up): where that line
    // crosses the rim's height on screen is where the ball heads.
    function shoot(from, up, ratio) {
      if (!ready()) return false;
      const p = project(cam, from.x, from.y, from.z), q = project(cam, hoop.x, hoop.y, hoop.z);
      const sx = p.x + ratio * (p.y - q.y);
      const targetX = EYE.x + ((sx - cam.cx) * (hoop.z - EYE.z)) / cam.f;
      const v = throwVelocity(from, up, targetX, hoop);
      ball = newBall(from, v, hoop);
      shotsTaken++;
      sessionShots++;
      api.store.set('shots', shotsTaken);
      api.send('shot', { p: [from.x, from.y, from.z], v, hoop: [hoop.x, hoop.y, hoop.z] });
      api.sfx('whoosh');
      return true;
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
      Object.assign(held, REST);
      if (sessionShots % SHOTS_PER_SPOT === 0) {
        let next = spot;
        while (next === spot) next = Math.floor(Math.random() * SPOTS.length);
        spot = next;
        move = { from: { ...hoop }, to: SPOTS[next], t: 0 };
      }
    }

    // --- input -------------------------------------------------------------
    // Where a screen point is on the plane the ball is carried in.
    function toWorld(sx, sy) {
      const zc = REST.z - EYE.z;
      return {
        x: Math.max(HOLD.x0, Math.min(HOLD.x1, EYE.x + ((sx - cam.cx) * zc) / cam.f)),
        y: Math.max(HOLD.y0, Math.min(HOLD.y1, EYE.y - ((sy - cam.cy) * zc) / cam.f)),
        z: REST.z,
      };
    }
    function onDown(e) {
      if (grab || ball || move) return;
      canvas.setPointerCapture?.(e.pointerId);
      // Touching the ball holds it where you touched it; touching elsewhere
      // pulls it quickly over to your finger.
      const b = project(cam, held.x, held.y, held.z);
      const near = Math.hypot(e.offsetX - b.x, e.offsetY - b.y) < BALL_R * b.s * 1.6;
      grab = {
        id: e.pointerId,
        ox: b.x - e.offsetX,
        oy: b.y - e.offsetY,
        near,
        sx: e.offsetX, sy: e.offsetY,
        samples: [{ t: performance.now(), x: e.offsetX, y: e.offsetY }],
      };
    }
    function onMove(e) {
      if (!grab || e.pointerId !== grab.id) return;
      grab.sx = e.offsetX;
      grab.sy = e.offsetY;
      const t = performance.now();
      grab.samples.push({ t, x: e.offsetX, y: e.offsetY });
      while (grab.samples.length > 2 && t - grab.samples[0].t > 120) grab.samples.shift();
    }
    // Pixels per second from timed samples, by least squares.
    function fitVelocity(pts) {
      if (pts.length < 2) return { x: 0, y: 0 };
      const t0 = pts[0].t;
      let st = 0, sx = 0, sy = 0, stt = 0, stx = 0, sty = 0;
      for (const q of pts) {
        const t = (q.t - t0) / 1000;
        st += t; sx += q.x; sy += q.y; stt += t * t; stx += t * q.x; sty += t * q.y;
      }
      const n = pts.length, den = n * stt - st * st;
      if (den <= 1e-9) return { x: 0, y: 0 };
      return { x: (n * stx - st * sx) / den, y: (n * sty - st * sy) / den };
    }

    function onUp(e) {
      if (!grab || e.pointerId !== grab.id) return;
      onMove(e);
      const s = grab.samples;
      const { ox, oy } = grab;
      // The ball leaves from exactly where the finger let go of it.
      const from = toWorld(grab.sx + ox, grab.sy + oy);
      grab = null;
      // The toss: the finger's velocity at release, a least-squares fit over
      // its last ~90 ms (steadier than two samples), in m/s at the ball.
      const end = s[s.length - 1].t;
      const pts = s.filter(q => end - q.t <= 90);
      const use = pts.length >= 2 ? pts : s.slice(-2);
      const vel = fitVelocity(use);
      const scale = (REST.z - EYE.z) / cam.f;
      const up = -vel.y * scale;
      Object.assign(held, from);
      lastToss = { from, up, ratio: vel.x / -vel.y, thrown: false };
      if (up < MIN_SPEED || now < resetAt) return; // just put down; it drifts back
      lastToss.thrown = true;
      shoot(from, up, vel.x / -vel.y);
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', () => { grab = null; });

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (e.type === 'keydown' && !charge && !e.repeat) charge = { power: MIN_SPEED, dir: 1 };
        if (e.type === 'keyup' && charge) {
          shoot({ ...held }, charge.power, aim);
          charge = null;
        }
      } else if (e.type === 'keydown' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        e.preventDefault();
        aim = Math.max(-0.5, Math.min(0.5, aim + (e.code === 'ArrowLeft' ? -0.02 : 0.02)));
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // --- network -----------------------------------------------------------
    const vec3 = a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
    api.on('shot', (data, from) => {
      if (!data || !vec3(data.v) || !vec3(data.p) || !vec3(data.hoop)) return;
      const p = api.players().find(m => m.id === from);
      if (!p || ghosts.length > 20) return;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const start = { x: clamp(data.p[0], -1, 1), y: clamp(data.p[1], 0.5, 3), z: clamp(data.p[2], -1, 1) };
      const theirs = { x: clamp(data.hoop[0], -1, 1), y: clamp(data.hoop[1], 2, 4), z: clamp(data.hoop[2], 1, 4) };
      ghosts.push({ ball: newBall(start, data.v, theirs), name: p.name, color: p.color });
    });

    // --- loop --------------------------------------------------------------
    function update(dt) {
      if (charge) {
        charge.power += charge.dir * dt * 3;
        if (charge.power > CHARGE_MAX) { charge.power = CHARGE_MAX; charge.dir = -1; }
        if (charge.power < MIN_SPEED) { charge.power = MIN_SPEED; charge.dir = 1; }
      }
      // The held ball moves with the finger; let go without a toss and it
      // drifts back to its spot.
      if (!ball && grab) {
        if (!grab.near) {
          const k = Math.exp(-dt * 25);
          grab.ox *= k;
          grab.oy *= k;
        }
        Object.assign(held, toWorld(grab.sx + grab.ox, grab.sy + grab.oy));
      } else if (!ball) {
        const k = 1 - Math.exp(-dt * 8);
        held.x += (REST.x - held.x) * k;
        held.y += (REST.y - held.y) * k;
      }
      if (move) {
        move.t = Math.min(1, move.t + dt / 0.7);
        const e = move.t * move.t * (3 - 2 * move.t);
        for (const k of ['x', 'y', 'z']) hoop[k] = move.from[k] + (move.to[k] - move.from[k]) * e;
        if (move.t >= 1) move = null;
      }
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        if (ball) {
          const ev = stepBall(ball);
          if (ev === 'score') {
            swish = 0.5;
            api.sfx('score');
            floaters.push({ text: streak + 1 > 1 ? `${streak + 1} in a row!` : 'Swish!', dx: 0, t: 0, color: '#ffd43b' });
          } else if (ev === 'rim' || ev === 'board') {
            api.sfx('bounce');
          }
          if (ball.done) finishShot();
        }
        for (const g of ghosts) {
          if (stepBall(g.ball) === 'score') floaters.push({ text: `+1 ${g.name}`, dx: g.ball.x - g.ball.hoop.x, t: 0, color: g.color });
        }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].ball.done) ghosts.splice(i, 1);
      for (let i = floaters.length - 1; i >= 0; i--) if ((floaters[i].t += dt) > 1.2) floaters.splice(i, 1);
      swish = Math.max(0, swish - dt);
    }

    function drawHoop(front) {
      const art = api.img('hoop');
      const L = project(cam, hoop.x - RIM_R, hoop.y, hoop.z);
      const R = project(cam, hoop.x + RIM_R, hoop.y, hoop.z);
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
      const back = project(cam, hoop.x, hoop.y, hoop.z + RIM_R);
      const frontPt = project(cam, hoop.x, hoop.y, hoop.z - RIM_R);
      const cx = (L.x + R.x) / 2, rx = (R.x - L.x) / 2;
      const cy = (back.y + frontPt.y) / 2, ry = Math.max(2, (frontPt.y - back.y) / 2);
      const netDrop = project(cam, hoop.x, hoop.y - 0.45, hoop.z).y - cy;
      const sway = Math.sin(swish * 30) * swish * 6;
      if (!front) {
        // Backboard.
        const B = boardOf(hoop);
        const a = project(cam, B.x0, B.y1, B.z);
        const b = project(cam, B.x1, B.y0, B.z);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = '#8a93a6';
        ctx.lineWidth = Math.max(2, cam.f * 0.006);
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        const s1 = project(cam, hoop.x - 0.15, hoop.y + 0.3, B.z);
        const s2 = project(cam, hoop.x + 0.15, hoop.y + 0.03, B.z);
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

    // Draws a ball at a world position (ghosts arrive already shifted to my hoop).
    function drawBall(b, alpha, tint, lift = 1) {
      const p = project(cam, b.x, b.y, b.z);
      const r = BALL_R * p.s * lift;
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

      // Friends' shots fly at my hoop: shift each by the gap between hoops.
      const all = ghosts.map(g => {
        const b = g.ball;
        return { b: { x: b.x + hoop.x - b.hoop.x, y: b.y + hoop.y - b.hoop.y, z: b.z + hoop.z - b.hoop.z, vy: b.vy, spin: b.spin }, alpha: 0.42, tint: g.color, name: g.name };
      });
      const waiting = !ball && now >= resetAt;
      const mine = ball || (waiting ? { ...held, vy: 0, spin: 0 } : null);
      if (mine) all.push({ b: mine, alpha: 1, tint: null, name: null, lift: grab ? 1.06 : 1 });
      all.sort((a, c) => c.b.z - a.b.z);
      // Balls behind the rim's front edge draw before the front of the hoop.
      const inside = e => e.b.z > hoop.z - RIM_R - BALL_R && e.b.y < hoop.y + BALL_R * 2 && e.b.vy < 0;
      for (const e of all.filter(inside)) drawBall(e.b, e.alpha, e.tint);
      drawHoop(true);
      for (const e of all.filter(e => !inside(e))) {
        const { p, r } = drawBall(e.b, e.alpha, e.tint, e.lift);
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
        const p = project(cam, hoop.x + f.dx, hoop.y - 0.3 + f.t * 0.6, hoop.z);
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

      // Power meter for Space / controller A.
      if (charge) {
        const mh = h * 0.4, mx = w - 26, my = h * 0.5 - mh / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(mx, my, 14, mh);
        ctx.fillStyle = '#ffd43b';
        const ph = (charge.power / CHARGE_MAX) * mh;
        ctx.fillRect(mx + 3, my + mh - ph, 8, ph);
        const a = project(cam, held.x, held.y, held.z);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 30);
        ctx.lineTo(a.x + aim * 80, a.y - 110);
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
      if (shotsTaken < 2 && !ball && !grab) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        const bp = project(cam, held.x, held.y, held.z);
        const hintY = bp.y - BALL_R * bp.s - 34;
        ctx.font = '900 20px ui-rounded, system-ui, sans-serif';
        ctx.strokeText('Grab the ball and toss it', w / 2, hintY);
        ctx.fillText('Grab the ball and toss it', w / 2, hintY);
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
      // For tests: where the ball and hoop are, in page pixels of the canvas.
      _view() {
        const b = ball || held, p = project(cam, b.x, b.y, b.z), q = project(cam, hoop.x, hoop.y, hoop.z);
        return { ball: { x: p.x, y: p.y, z: b.z }, hoop: { x: q.x, y: q.y, z: hoop.z }, spot, flying: !!ball, held: !!grab, ready: ready(), lastToss, total: record.total };
      },
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
      },
      onPad(pad) {
        aim = Math.max(-0.5, Math.min(0.5, pad.x * 0.5));
        if (pad.pressed[0] && !charge) charge = { power: MIN_SPEED, dir: 1 };
        if (!pad.pressed[0] && charge) {
          shoot({ ...held }, charge.power, aim);
          charge = null;
        }
      },
    };
  },
};

// Exposed for tests.
export const _physics = { throwVelocity, idealVy, newBall, stepBall, SPOTS, REST, U0, FORWARD };

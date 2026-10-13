// Beach Bump: keep a beach ball up with your head. Everyone's live face is a
// bubble standing on the sand in their own stretch of beach (a zone); move
// your head (face tracking, or the mouse / a finger, arrow keys, a stick)
// under the falling ball and it bounces off. The bounce loses no energy: a
// ball that lands on top of a still head goes straight back up to the height
// it fell from, forever. Meet it off-centre and it is knocked sideways, far
// enough to reach a friend's zone; push your head into it (a nod up) and it
// flies a little higher and faster. The sides of the court bounce too. A ball
// that reaches the sand costs a life to the player whose zone it fell in, and
// the next serve drops above them. Alone you keep it up as long as you can;
// the best run of touches is kept.
//
// Physics (world units, y up, the sand at y = 0, see _physics below): the
// ball flies on an exact parabola from a launch { x, y, vx, vy, t } under
// gravity G, folded between the side walls, so anyone can say where it is at
// any moment. A head is a circle; contact is found by bisection on the
// parabola against the head moving in a straight line over the frame, then
// the velocity is reflected about the contact normal in the head's frame
// (v' = v - 2((v - vHead) · n) n): speed is kept against a still head, a
// moving head adds its push along the normal. The push, the speed and the
// apex are capped so the ball stays on screen and playable.
//
// Authority: each player resolves contacts with their own head only (their
// own head is the one place where position is exact), then broadcasts the
// new launch as send('hit', ball). Everyone else extrapolates the parabola
// between launches. A launch is versioned (g game, s serve, n launch within
// the serve); newer() orders them, and of two launches built on the same one
// the earlier contact wins. The owner keeps the canonical ball in shared
// state with lives and the court (who stands on the sand, in join order),
// rules on drops (the ball reached the sand and no newer launch arrived
// within GRACE_MS), serves, seats newcomers with full lives (the court
// widens and the ball is moved with it) and ends the game. Heads travel as
// send('hd', { u, y }) at ~15 Hz: u is the place across the player's zone.

export const G = 1.6;            // gravity, world units / s²
export const BR = 0.065;         // ball radius
export const HR = 0.11;          // head radius
// The crown of a head is flat this far either side of its top, so a ball
// that lands near enough the middle goes straight back up instead of
// tipping off: a perfectly round head would double any offset each bounce.
export const CROWN = 0.016;
const R = HR + BR;
export const ZW = 0.7;           // width of one player's zone
export const MIN_W = 0.9;        // court width alone
export const HEAD_Y = 0.24;      // head centre at rest
export const HEAD_LO = 0.14, HEAD_HI = 0.42;   // how low / high a head goes
export const APEX_MAX = 1.0;     // the ball never rises above this
export const VIEW_H = 1.12;      // world height every screen shows
export const SAND = 0.17;        // sand strip drawn under the court
export const SPEED_MAX = 2.4;
export const HEAD_V_MAX = 1.2;   // a head's push counts up to this speed
export const SERVE_Y = 0.85;
export const LIVES = 3;
export const MAX_PLAYERS = 6;
const PRE_MS = 1400;             // the serve hangs this long before it drops
const GRACE_MS = 350;            // a late hit message may still save a drop
const FONT = 'ui-rounded, system-ui, sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const initial = name => (String(name || '?').trim()[0] || '?').toUpperCase();

// --- physics (pure; unit-tested) ----------------------------------------

export const courtWidth = n => Math.max(MIN_W, clamp(n, 1, MAX_PLAYERS) * ZW);

// Where a launch is at time t (ms): the parabola, folded between the walls.
export function ballAt(b, t) {
  const dt = Math.max(0, (t - b.t) / 1000);
  const L = b.W - 2 * BR;
  let x = b.x + b.vx * dt, vx = b.vx;
  if (L > 0 && (x < BR || x > b.W - BR)) {
    let m = (((x - BR) % (2 * L)) + 2 * L) % (2 * L);
    if (m > L) { m = 2 * L - m; vx = -vx; }
    x = BR + m;
  }
  return { x, y: b.y + b.vy * dt - 0.5 * G * dt * dt, vx, vy: b.vy - G * dt };
}

// Time (ms) at which the ball centre comes down through height yh, or null.
export function timeAtHeight(b, yh) {
  const disc = b.vy * b.vy + 2 * G * (b.y - yh);
  if (disc < 0) return null;
  return b.t + (Math.max(0, (b.vy + Math.sqrt(disc)) / G)) * 1000;
}
// When the ball reaches the sand (its bottom touches y = 0).
export const floorTime = b => timeAtHeight(b, BR) ?? b.t;

// Elastic bounce off a head moving at hv: reflect the velocity about the
// normal n in the head's frame. Null when they are already separating.
export function bounce(v, hv, n) {
  const hm = Math.hypot(hv.x, hv.y), k = hm > HEAD_V_MAX ? HEAD_V_MAX / hm : 1;
  const rel = (v.x - hv.x * k) * n.x + (v.y - hv.y * k) * n.y;
  if (rel >= 0) return null;
  let vx = v.x - 2 * rel * n.x, vy = v.y - 2 * rel * n.y;
  const sp = Math.hypot(vx, vy);
  if (sp > SPEED_MAX) { vx *= SPEED_MAX / sp; vy *= SPEED_MAX / sp; }
  return { x: vx, y: vy };
}

// Keep the apex on screen: trim the upward speed if it would go too high.
export function capApex(y, v) {
  if (v.y > 0 && y + (v.y * v.y) / (2 * G) > APEX_MAX) v.y = Math.sqrt(Math.max(0, 2 * G * (APEX_MAX - y)));
  return v;
}

// Contact between launch b and a head moving from h0 (at t0) to h1 (at t1),
// both { x, y } in world units, times in ms. Returns the new launch fields
// { x, y, vx, vy, t } at the moment of contact, or null.
export function contact(b, h0, h1, t0, t1) {
  if (!(t1 > t0)) return null;
  const T0 = t0, span = t1 - t0;
  const headAt = t => {
    const k = (t - T0) / span;
    return { x: h0.x + (h1.x - h0.x) * k, y: h0.y + (h1.y - h0.y) * k };
  };
  const hv = { x: (h1.x - h0.x) / (span / 1000), y: (h1.y - h0.y) / (span / 1000) };
  const gap = t => {
    const p = ballAt(b, t), h = headAt(t);
    return Math.hypot(p.x - h.x, p.y - h.y) - R;
  };
  const from = Math.max(t0, b.t);
  if (!(t1 > from)) return null;
  const steps = Math.max(1, Math.ceil((t1 - from) / 20));
  for (let i = 0; i < steps; i++) {
    const a = from + ((t1 - from) * i) / steps, c = from + ((t1 - from) * (i + 1)) / steps;
    let tc;
    if (gap(a) <= 0) tc = a;
    else if (gap(c) <= 0) {
      let lo = a, hi = c;
      for (let k = 0; k < 48; k++) {
        const mid = (lo + hi) / 2;
        if (gap(mid) <= 0) hi = mid; else lo = mid;
      }
      tc = hi;
    } else continue;
    const p = ballAt(b, tc), h = headAt(tc);
    const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy);
    // The normal, with the flat crown: offsets inside it count as none.
    const cx = dy > 0 ? Math.sign(dx) * Math.max(0, Math.abs(dx) - CROWN) : dx;
    const dn = Math.hypot(cx, dy);
    const n = dn > 1e-9 ? { x: cx / dn, y: dy / dn } : { x: 0, y: 1 };
    const v = bounce({ x: p.vx, y: p.vy }, hv, n);
    if (!v) return null;
    let x = p.x, y = p.y;
    if (R - d > 1e-6) { x = h.x + n.x * R; y = h.y + n.y * R; }
    x = clamp(x, BR, b.W - BR);
    capApex(y, v);
    return { x, y, vx: v.x, vy: v.y, t: tc };
  }
  return null;
}

// Zone (court index) that world x falls in.
export const zoneIndex = (x, n, W) => clamp(Math.floor(x / (W / Math.max(1, n))), 0, Math.max(0, n - 1));

// Head centre x for a place u (0..1) across zone i.
export function headX(u, i, n, W) {
  const zw = W / Math.max(1, n);
  return i * zw + HR + clamp(u, 0, 1) * Math.max(0, zw - 2 * HR);
}
export function headU(x, i, n, W) {
  const zw = W / Math.max(1, n), span = Math.max(1e-6, zw - 2 * HR);
  return clamp((x - i * zw - HR) / span, 0, 1);
}

// Launch order: a later game, a later serve, a later launch; of two launches
// with the same number the earlier contact wins.
export function newer(a, b) {
  if (!b) return !!a;
  if (!a) return false;
  if (a.g !== b.g) return a.g > b.g;
  if (a.s !== b.s) return a.s > b.s;
  if (a.n !== b.n) return a.n > b.n;
  if (a.t !== b.t) return a.t < b.t;
  return a.by < b.by;
}

const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const idOk = v => typeof v === 'string' && v.length > 0 && v.length <= 64;
const KINDS = ['serve', 'hit', 'move'];

// A launch from the wire, checked strictly; null if anything is off.
export function readBall(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  if (!int(o.g, 0, 1e9) || !int(o.s, 0, 1e9) || !int(o.n, 0, 1e9) || !int(o.r, 0, 1e7)) return null;
  if (!num(o.W, MIN_W - 1e-9, MAX_PLAYERS * ZW + 1e-9)) return null;
  if (!num(o.x, 0, o.W) || !num(o.y, -0.5, APEX_MAX + 0.05) || !num(o.t, 0, 1e15)) return null;
  if (!num(o.vx, -SPEED_MAX - 1e-6, SPEED_MAX + 1e-6) || !num(o.vy, -SPEED_MAX - 1e-6, SPEED_MAX + 1e-6)) return null;
  if (Math.hypot(o.vx, o.vy) > SPEED_MAX + 1e-6) return null;
  if (o.vy > 0 && o.y + (o.vy * o.vy) / (2 * G) > APEX_MAX + 0.02) return null;
  if (typeof o.by !== 'string' || o.by.length > 64 || !KINDS.includes(o.k)) return null;
  return { g: o.g, s: o.s, n: o.n, r: o.r, W: o.W, x: clamp(o.x, BR, o.W - BR), y: o.y, vx: o.vx, vy: o.vy, t: o.t, by: o.by, k: o.k };
}

// A hit report from `from`: valid only if it builds on the launch before it
// (cur, or for a rival launch with the same number the one before cur, via
// prevOf(n)), starts where that launch really was then, and is recent.
export function checkHit(d, from, cur, prevOf, now) {
  const b = readBall(d);
  if (!b || !cur || b.k !== 'hit' || b.by !== from) return null;
  if (b.g !== cur.g || b.s !== cur.s || Math.abs(b.W - cur.W) > 1e-9) return null;
  let base = null;
  if (b.n === cur.n + 1) base = cur;
  else if (b.n === cur.n && newer(b, cur)) base = prevOf(b.n - 1);
  if (!base || b.t < base.t || Math.abs(b.t - now) > 4000) return null;
  const p = ballAt(base, b.t);
  if (Math.hypot(p.x - b.x, p.y - b.y) > 0.08) return null;
  if (b.r !== base.r + 1) return null;
  return b;
}

// The owner's shared state, checked strictly; null if it isn't one.
export function readShared(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  if (!int(o.g, 0, 1e9) || !Array.isArray(o.court) || o.court.length > MAX_PLAYERS) return null;
  if (!o.court.every(idOk) || new Set(o.court).size !== o.court.length) return null;
  if (!o.lives || typeof o.lives !== 'object' || Array.isArray(o.lives)) return null;
  const lives = {};
  const entries = Object.entries(o.lives);
  if (entries.length > 64) return null;
  for (const [id, n] of entries) {
    if (!idOk(id) || !int(n, 0, LIVES)) return null;
    lives[id] = n;
  }
  const ball = o.ball == null ? null : readBall(o.ball);
  if (o.ball != null && !ball) return null;
  if (ball && ball.g !== o.g) return null;
  let res = null;
  if (o.res != null) {
    const r = o.res;
    if (!r || typeof r !== 'object' || !idOk(r.who) || !int(r.r, 0, 1e7) || !num(r.x, 0, 10) || !num(r.at, 0, 1e15)) return null;
    res = { who: r.who, r: r.r, x: r.x, at: r.at };
  }
  if (o.winner != null && !idOk(o.winner)) return null;
  return { g: o.g, court: [...o.court], lives, ball, res, over: o.over === true, winner: o.winner ?? null };
}

// A head report: where across their zone, and how high.
export function readHead(d) {
  if (!d || typeof d !== 'object' || !num(d.u, 0, 1) || !num(d.y, HEAD_LO, HEAD_HI)) return null;
  return { u: d.u, y: d.y };
}

// The serve: hanging still above the middle of zone i until t.
export function serveBall(g, s, court, i, t) {
  const W = courtWidth(court.length);
  const zw = W / Math.max(1, court.length);
  return { g, s, n: 0, r: 0, W, x: clamp(zw * (i + 0.5), BR, W - BR), y: SERVE_Y, vx: 0, vy: 0, t, by: '', k: 'serve' };
}

// Owner: the court changed width (from one line-up to another); carry the
// ball across, in the same place relative to the court, keeping its
// velocity. A serve still hanging moves over the same player's new zone.
export function moveBall(b, W, now, from = null, to = null) {
  if (now < b.t) {
    let x = (b.x * W) / b.W;
    if (from?.length && to?.length) {
      const who = from[zoneIndex(b.x, from.length, b.W)];
      const i = Math.max(0, to.indexOf(who));
      x = (W / to.length) * (i + 0.5);
    }
    return { ...b, n: b.n + 1, k: 'move', W, x: clamp(x, BR, W - BR) };
  }
  const p = ballAt(b, now);
  return { ...b, n: b.n + 1, k: 'move', W, x: clamp((p.x * W) / b.W, BR, W - BR), y: p.y, vx: p.vx, vy: p.vy, t: now };
}

// Owner: rule on a ball that reached the sand. Returns the next shared state.
export function ruleDrop(sh, b, now) {
  const tf = floorTime(b);
  const x = ballAt(b, tf).x;
  const court = sh.court;
  const who = court[zoneIndex(x, court.length, b.W)];
  const lives = { ...sh.lives };
  if (who) lives[who] = Math.max(0, (lives[who] ?? LIVES) - 1);
  const left = court.filter(id => (lives[id] ?? 0) > 0);
  const res = { who: who || '', r: b.r, x: clamp(x, 0, 10), at: now };
  if (!who) res.who = 'none';
  if (!left.length || (court.length >= 2 && left.length === 1)) {
    return { ...sh, lives, court: left, res, over: true, winner: left.length === 1 ? left[0] : null, ball: { ...b } };
  }
  const i = Math.max(0, left.indexOf(who));
  return { ...sh, lives, court: left, res, over: false, winner: null, ball: serveBall(sh.g, b.s + 1, left, i, now + PRE_MS) };
}

export const _physics = {
  G, BR, HR, R, CROWN, ZW, MIN_W, HEAD_Y, HEAD_LO, HEAD_HI, APEX_MAX, SPEED_MAX, HEAD_V_MAX, SERVE_Y, LIVES,
  courtWidth, ballAt, timeAtHeight, floorTime, bounce, capApex, contact, zoneIndex, headX, headU,
  newer, readBall, checkHit, readShared, readHead, serveBall, moveBall, ruleDrop,
};

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
  blurb: 'Keep the beach ball up with your head, or head it to a friend. Let it drop and you lose a life.',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: true,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.style.touchAction = 'none';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');
    const overlay = document.createElement('div');
    overlay.className = 'g-center';
    overlay.style.cssText = 'position:absolute;inset:0;display:none;pointer-events:none;';
    api.el.append(overlay);

    const clock = () => performance.timeOrigin + performance.now();
    const me = api.me.id;
    let best = api.store.get('best', 0);
    let w = 0, h = 0, dpr = 1, inset = { top: 0, bottom: 0 };
    let raf = 0;

    // The ball: the newest launch I know of, and the ones before it this serve.
    let ball = null;
    const hist = new Map();
    // My head: where it wants to be (u across my zone, y) and where it is.
    const target = { u: 0.5, y: HEAD_Y };
    let head = null;             // { x, y } world, smoothed
    let prevHead = null;         // { x, y, t, key } at the last frame
    let manual = null;           // { at, fu, fy }: mouse/keys/stick took over from the face
    let faceT = null;            // the face's own target, when there is a face
    let pointerDown = false;
    const keys = { left: false, right: false };
    let padX = 0, prevA = false, hopUntil = 0;
    let rookieUntil = 0, plan = null;
    let lastHd = { at: 0, u: -1, y: -1 };
    // Friends' heads: { u, y } as reported and { du, dy } as drawn.
    const remote = new Map();
    // Effects.
    const floaters = [];
    const trail = [];
    let squash = null;           // { at, ang } on the latest touch
    const bumped = new Map();    // id -> time their head last touched the ball
    let offset = { x: 0, y: 0 }; // eases a remote launch in instead of a jump
    let shown = null;            // the ball where it was last drawn (world)
    let spin = 0;
    let lastResAt = null;
    let overSeen = false;
    let L = null;                // the last layout

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

    const shared = () => readShared(api.shared());
    const courtOf = sh => (sh?.court?.length ? sh.court : [me]);

    function layout(court) {
      const n = court.length;
      const W = courtWidth(n);
      const availH = Math.max(80, h - inset.top - inset.bottom - 56);
      const s = Math.min(w / W, availH / (VIEW_H + SAND));
      const ox = (w - W * s) / 2;
      const gy = h - inset.bottom - SAND * s;
      return { court, n, W, s, ox, gy, X: x => ox + x * s, Y: y => gy - y * s };
    }

    // --- the ball --------------------------------------------------------
    function headWorld(id, court) {
      const i = court.indexOf(id);
      if (i < 0) return null;
      const W = courtWidth(court.length);
      if (id === me && head) return head;
      const r = remote.get(id);
      return { x: headX(r ? r.du : 0.5, i, court.length, W), y: r ? r.dy : HEAD_Y };
    }

    // Take a launch if it is newer than mine.
    function accept(b, mine = false) {
      if (!b || !newer(b, ball)) return false;
      const now = clock();
      if (!ball || b.g !== ball.g || b.s !== ball.s) hist.clear();
      hist.set(b.n, b);
      if (hist.size > 8) hist.delete(Math.min(...hist.keys()));
      const before = shown;
      ball = b;
      if (b.k === 'serve') {
        trail.length = 0;
        offset = { x: 0, y: 0 };
        plan = null;
      } else if (!mine && before) {
        const p = ballAt(b, now);
        offset = { x: clamp(before.x - p.x, -0.3, 0.3), y: clamp(before.y - p.y, -0.3, 0.3) };
      }
      if (b.k === 'hit') {
        const hw = headWorld(b.by, courtOf(shared()));
        squash = { at: performance.now(), ang: hw ? Math.atan2(-(b.y - hw.y), b.x - hw.x) : -Math.PI / 2 };
        bumped.set(b.by, performance.now());
        api.sfx('boing');
        floaters.push({ text: String(b.r), x: b.x, y: b.y + 0.12, t: 0, color: b.by === me ? '#ffd43b' : '#fff' });
        if (b.r > best) {
          best = b.r;
          api.store.set('best', best);
          api.setState({ best });
        }
      }
      return true;
    }

    // --- owner -----------------------------------------------------------
    function ownerAgain() {
      const old = shared();
      const g = Math.max(old?.g ?? 0, ball?.g ?? 0) + 1;
      const court = api.players().map(m => m.id).slice(0, MAX_PLAYERS);
      const lives = {};
      for (const id of court) lives[id] = LIVES;
      const b = serveBall(g, 0, court, 0, clock() + PRE_MS + 400);
      api.setShared({ g, court, lives, ball: b, res: null, over: false, winner: null });
      accept(b);
    }

    const sameBall = (a, b) => !!a && !!b && a.g === b.g && a.s === b.s && a.n === b.n && a.t === b.t && a.by === b.by;

    function ownerTick(now) {
      const sh = shared();
      if (!sh) { ownerAgain(); return; }
      if (sh.over) return;
      const people = api.players().map(m => m.id);
      const lives = { ...sh.lives };
      let dirty = false;
      // Newcomers stand on the sand at once, with full lives.
      for (const id of people) if (lives[id] == null) { lives[id] = LIVES; dirty = true; }
      const court = people.filter(id => lives[id] > 0).slice(0, MAX_PLAYERS);
      if (court.join('|') !== sh.court.join('|')) dirty = true;
      let next = { ...sh, lives, court };
      if (!court.length) {
        api.setShared({ ...next, over: true, winner: null });
        return;
      }
      if (!ball || ball.g !== sh.g) {
        accept(serveBall(sh.g, ball && ball.g === sh.g ? ball.s + 1 : (sh.ball?.s ?? 0) + 1, court, 0, now + PRE_MS));
      }
      // The court widened or narrowed: carry the ball across with it.
      const W = courtWidth(court.length);
      if (Math.abs(ball.W - W) > 1e-9) accept(moveBall(ball, W, now, sh.court, court));
      // The ball reached the sand and no saving touch came in time.
      if (now >= ball.t && now > floorTime(ball) + GRACE_MS) {
        next = ruleDrop({ ...next, ball }, ball, now);
        if (!next.over) accept(next.ball);
        api.setShared(next);
        return;
      }
      if (dirty || !sameBall(sh.ball, ball)) api.setShared({ ...next, ball });
    }

    // --- messages --------------------------------------------------------
    const present = id => api.players().some(m => m.id === id);
    api.on('hit', (d, from) => {
      if (!present(from)) return;
      const b = checkHit(d, from, ball, n => hist.get(n), clock());
      if (b) accept(b);
    });
    api.on('hd', (d, from) => {
      if (!present(from)) return;
      const hd = readHead(d);
      if (!hd) return;
      const r = remote.get(from);
      if (r) Object.assign(r, hd);
      else remote.set(from, { ...hd, du: hd.u, dy: hd.y });
    });
    api.on('again', (d, from) => {
      if (present(from) && api.isOwner() && shared()?.over) ownerAgain();
    });

    // --- my head ---------------------------------------------------------
    function markManual() {
      manual = { at: performance.now(), fu: faceT?.u ?? null, fy: faceT?.y ?? null };
    }

    function pointerTo(e) {
      if (!L) return;
      const i = L.court.indexOf(me);
      if (i < 0) return;
      const r = canvas.getBoundingClientRect();
      const wx = (e.clientX - r.left - L.ox) / L.s;
      // A finger would hide the face: the head stands just above it.
      const wy = (L.gy - (e.clientY - r.top)) / L.s + (e.pointerType === 'touch' ? HR + 0.06 : 0);
      target.u = headU(wx, i, L.n, L.W);
      target.y = clamp(wy, HEAD_LO, HEAD_HI);
      markManual();
    }
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      pointerDown = true;
      pointerTo(e);
    });
    canvas.addEventListener('pointermove', e => {
      if (pointerDown || e.pointerType === 'mouse') pointerTo(e);
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
      else if (down && !e.repeat && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) {
        e.preventDefault();
        hop();
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // A quick head-up (keys and controllers): bumps the ball higher.
    function hop() {
      if (shared()?.over) return;
      hopUntil = performance.now() + 160;
    }

    // Rookie bot: stand under where the ball will come down; now and then
    // meet it off-centre to send it to someone else.
    function autopilot(i, n, W, now) {
      if (!ball) return;
      const tl = timeAtHeight(ball, HEAD_Y + R * 0.95);
      if (tl == null || tl < now) { target.u = 0.5; target.y = HEAD_Y; return; }
      const p = ballAt(ball, tl);
      if (zoneIndex(p.x, n, W) !== i) { target.u = 0.5; target.y = HEAD_Y; return; }
      const key = `${ball.g}.${ball.s}.${ball.n}`;
      if (!plan || plan.key !== key) {
        const dir = i === 0 ? 1 : i === n - 1 ? -1 : (Math.random() < 0.5 ? -1 : 1);
        const pass = n > 1 && Math.random() < 0.4;
        // To send it right the head meets the ball's left side; a keep-up
        // leans against the ball's drift to calm it.
        const off = pass ? -dir * (0.05 + Math.random() * 0.02) : clamp(p.vx * 0.03, -0.025, 0.025) + (Math.random() - 0.5) * 0.01;
        plan = { key, off };
      }
      target.u = headU(p.x + plan.off, i, n, W);
      target.y = HEAD_Y;
    }

    function steerHead(dt, now, court, alive) {
      const i = court.indexOf(me);
      if (i < 0 || !alive) { prevHead = null; head = null; return; }
      const n = court.length, W = courtWidth(n);
      const t = performance.now();
      // The face's own idea of where the head is.
      const f = api.face?.();
      const cw = api.selfCanvas?.width || 0, ch = api.selfCanvas?.height || 0;
      faceT = null;
      if (f?.center && cw > 0 && ch > 0) {
        // The camera is mirrored already: my head on the left is x near 0.
        faceT = {
          u: clamp((f.center.x / cw - 0.5) * 1.7 + 0.5, 0, 1),
          y: clamp(HEAD_Y - (f.center.y / ch - 0.45) * 0.8, HEAD_LO, HEAD_HI),
        };
      }
      if (t < rookieUntil) {
        autopilot(i, n, W, now);
      } else {
        const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) || (Math.abs(padX) > 0.15 ? padX : 0);
        if (dir) {
          target.u = clamp(target.u + dir * 1.4 * dt, 0, 1);
          markManual();
        }
        // The face leads unless the mouse, keys or a stick moved since it
        // last did; it takes back over as soon as the head really moves.
        if (faceT && !pointerDown && !dir) {
          const moved = !manual || manual.fu == null || Math.abs(faceT.u - manual.fu) > 0.08 || Math.abs(faceT.y - manual.fy) > 0.05;
          if (moved) {
            manual = null;
            target.u = faceT.u;
            target.y = faceT.y;
          }
        }
      }
      const tx = headX(target.u, i, n, W);
      const ty = clamp(target.y + (t < hopUntil ? 0.1 : 0), HEAD_LO, HEAD_HI);
      const key = `${i}/${n}`;
      if (!head || prevHead?.key !== key) head = { x: tx, y: ty };
      else {
        const k = 1 - Math.exp(-dt * 22);
        head = { x: head.x + (tx - head.x) * k, y: head.y + (ty - head.y) * k };
        if (Math.abs(tx - head.x) < 1e-5) head.x = tx;
        if (Math.abs(ty - head.y) < 1e-5) head.y = ty;
      }
      // My head against the ball: I am the one who knows exactly where it was.
      if (ball && prevHead?.key === key && now > ball.t && !shared()?.over) {
        const c = contact(ball, prevHead, head, prevHead.t, now);
        if (c && c.y > BR) {
          const b = readBall({ ...ball, ...c, n: ball.n + 1, r: ball.r + 1, by: me, k: 'hit' });
          if (b && accept(b, true)) api.send('hit', b);
        }
      }
      prevHead = { x: head.x, y: head.y, t: now, key };
      // Tell the others where my head is, about 15 times a second.
      const u = headU(head.x, i, n, W);
      if (t - lastHd.at > 66 && (Math.abs(u - lastHd.u) > 0.002 || Math.abs(head.y - lastHd.y) > 0.002 || t - lastHd.at > 1000)) {
        lastHd = { at: t, u, y: head.y };
        api.send('hd', { u: Math.round(u * 1e4) / 1e4, y: Math.round(clamp(head.y, HEAD_LO, HEAD_HI) * 1e4) / 1e4 });
      }
    }

    // --- drawing ---------------------------------------------------------
    function drawFace(m, x, y, r, alive, squeeze = 0) {
      ctx.save();
      ctx.translate(x, y + r * squeeze * 0.5);
      ctx.scale(1 + squeeze * 0.5, 1 - squeeze);
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = m.color || '#9775fa';
      ctx.fillRect(-r, -r, r * 2, r * 2);
      const media = api.mediaOf(m.id);
      const sw = media?.videoWidth || media?.width || 0;
      const shh = media?.videoHeight || media?.height || 0;
      let drew = false;
      if (sw > 0 && shh > 0) {
        // Cover-crop the video into the circle.
        const s = Math.max((r * 2) / sw, (r * 2) / shh);
        try {
          ctx.drawImage(media, -(sw * s) / 2, -(shh * s) / 2, sw * s, shh * s);
          drew = true;
        } catch (e) { /* not ready yet */ }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial(m.name), 0, r * 0.05);
      }
      ctx.restore();
      ctx.lineWidth = Math.max(3, r * 0.09);
      ctx.strokeStyle = alive ? (m.color || '#fff') : 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      if (!alive) {
        ctx.fillStyle = 'rgba(30,20,50,0.55)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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

    function hearts(lives) {
      let s = '';
      for (let i = 0; i < LIVES; i++) s += i < lives ? '❤️' : '🖤';
      return s;
    }

    // Where the ball is drawn: the parabola, resting in the sand once it
    // lands, eased in after a friend's touch.
    function ballShown(now, dt) {
      if (!ball) return null;
      const tf = floorTime(ball);
      let p;
      if (now >= ball.t && now > tf) {
        p = ballAt(ball, tf);
        p = { x: p.x, y: BR * 0.55, vx: 0, vy: 0, landed: true };
      } else p = ballAt(ball, now);
      const k = Math.exp(-dt * 14);
      offset = { x: offset.x * k, y: offset.y * k };
      return { ...p, x: p.x + offset.x, y: p.y + offset.y };
    }

    function render(dt, now) {
      const sh = shared();
      const court = courtOf(sh);
      L = layout(court);
      const { X, Y, s, W, n } = L;
      const list = api.players();
      const byId = new Map(list.map(m => [m.id, m]));
      const lives = id => sh?.lives?.[id] ?? LIVES;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBeach(ctx, w, h, L.gy);

      // The court: shade outside it, posts at its walls, zones in the sand.
      if (L.ox > 2) {
        ctx.fillStyle = 'rgba(20,40,90,0.16)';
        ctx.fillRect(0, 0, L.ox, h);
        ctx.fillRect(X(W), 0, w - X(W), h);
      }
      for (const x of [0, W]) {
        const px = clamp(X(x), 3, w - 3);
        ctx.fillStyle = '#b5793f';
        ctx.fillRect(px - 3, Y(VIEW_H - 0.05), 6, L.gy - Y(VIEW_H - 0.05) + SAND * s * 0.5);
        ctx.fillStyle = '#ff5fa2';
        ctx.beginPath();
        ctx.arc(px, Y(VIEW_H - 0.05), 6, 0, Math.PI * 2);
        ctx.fill();
      }
      const zw = W / n;
      court.forEach((id, i) => {
        ctx.fillStyle = byId.get(id)?.color || '#fff';
        ctx.globalAlpha = 0.22;
        ctx.fillRect(X(i * zw) + 2, L.gy + 3, zw * s - 4, SAND * s - 6);
        ctx.globalAlpha = 1;
        if (i > 0) {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.setLineDash([6, 8]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(X(i * zw), Y(0.62));
          ctx.lineTo(X(i * zw), h - inset.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // The ball's shadow, trail and squash.
      const p = ballShown(now, dt);
      shown = p;
      const ballR = BR * s;
      if (p) {
        const lift = clamp(p.y / VIEW_H, 0, 1);
        ctx.fillStyle = `rgba(120,70,30,${0.3 - lift * 0.18})`;
        ctx.beginPath();
        ctx.ellipse(X(p.x), L.gy + SAND * s * 0.2, ballR * (1 - lift * 0.5), ballR * 0.28 * (1 - lift * 0.5), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Heads.
      const tnow = performance.now();
      court.forEach((id, i) => {
        const m = byId.get(id);
        if (!m) return;
        let hw;
        if (id === me) hw = head || { x: headX(target.u, i, n, W), y: HEAD_Y };
        else {
          const r = remote.get(id);
          if (r) {
            const k = 1 - Math.exp(-dt * 16);
            r.du += (r.u - r.du) * k;
            r.dy += (r.y - r.dy) * k;
          }
          hw = { x: headX(r ? r.du : 0.5, i, n, W), y: r ? r.dy : HEAD_Y };
        }
        const bk = (tnow - (bumped.get(id) ?? -1e9)) / 170;
        const squeeze = bk < 1 ? Math.sin(Math.PI * bk) * 0.12 : 0;
        drawFace(m, X(hw.x), Y(hw.y), HR * s, lives(id) > 0, squeeze);
        // Hearts and name in the sand under the zone.
        const cx = X((i + 0.5) * zw);
        const fs = clamp(SAND * s * 0.3, 10, 18);
        ctx.font = `${fs}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#000';
        ctx.fillText(hearts(lives(id)), cx, L.gy + fs + 4);
        ctx.font = `800 ${clamp(fs * 0.85, 10, 15)}px ${FONT}`;
        ctx.fillStyle = '#4a2a6a';
        ctx.fillText(id === me ? 'You' : m.name, cx, L.gy + fs * 2 + 6);
      });
      // People off the sand (out of lives, or waiting a moment to be seated).
      list.filter(m => !court.includes(m.id)).forEach((m, k) => {
        const r = 15, x = 14 + r + k * (r * 2 + 8), y = inset.top + 62;
        drawFace(m, x, y, r, false);
        ctx.font = `800 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(lives(m.id) > 0 ? 'next' : 'out', x, y + r + 11);
      });

      if (p) {
        // A short trail while it flies.
        if (!p.landed && now >= ball.t) trail.push({ x: p.x, y: p.y });
        while (trail.length > 10 || (trail.length && (p.landed || now < ball.t))) trail.shift();
        trail.forEach((q, k) => {
          const a = (k + 1) / (trail.length + 1);
          ctx.fillStyle = `rgba(255,255,255,${0.28 * a})`;
          ctx.beginPath();
          ctx.arc(X(q.x), Y(q.y), ballR * (0.45 + 0.45 * a), 0, Math.PI * 2);
          ctx.fill();
        });
        spin += dt * (p.landed ? 0 : (p.vx || 0) * 9 + 0.6);
        const sk = squash ? (tnow - squash.at) / 180 : 1;
        const amt = sk < 1 ? Math.sin(Math.PI * sk) * 0.3 : 0;
        ctx.save();
        ctx.translate(X(p.x), Y(p.y));
        if (amt) {
          ctx.rotate(squash.ang);
          ctx.scale(1 - amt, 1 + amt * 0.6);
          ctx.rotate(-squash.ang);
        }
        drawBall(0, 0, ballR, spin);
        ctx.restore();
        // While the serve hangs: whose it is.
        if (now < ball.t && !sh?.over) {
          const pulse = 1 + Math.sin(tnow / 140) * 0.08;
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 5]);
          ctx.beginPath();
          ctx.moveTo(X(p.x), Y(p.y) + ballR + 4);
          ctx.lineTo(X(p.x), Y(HEAD_Y + HR) - 4);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(X(p.x), Y(p.y), ballR * 1.35 * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Floaters (world positions).
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.t += dt;
        if (f.t > 1) { floaters.splice(i, 1); continue; }
        ctx.globalAlpha = clamp(1.1 - f.t, 0, 1);
        text(f.text, clamp(X(f.x), 40, w - 40), Y(f.y) - f.t * 36, f.big ? 24 : 18, f.color);
        ctx.globalAlpha = 1;
      }

      // HUD: touches in the middle, best on the right.
      const hudY = inset.top + 30;
      const rally = ball && !sh?.over ? ball.r : (sh?.res?.r ?? 0);
      text(`${n > 1 ? 'Rally' : 'Bounces'} ${rally}`, w / 2, hudY, 28, '#fff');
      text(`Best ${best}`, w - 14, hudY, 16, '#ffd43b', 'right');
      if (ball && now < ball.t && ball.r === 0 && !sh?.over) {
        const fresh = ball.s === 0;
        if (fresh || n === 1) {
          text(n > 1 ? 'Head the ball to your friends!' : 'Keep it up with your head!', w / 2, hudY + 30, clamp(w * 0.04, 13, 20), '#fff');
          text('Move your head under it · lean to send it sideways', w / 2, hudY + 52, clamp(w * 0.03, 11, 15), '#fff');
        }
      }
      if (sh?.over) {
        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'auto';
        if (!overSeen) {
          overSeen = true;
          api.sfx(sh.winner === me ? 'win' : 'lose');
        }
      } else {
        overlay.style.display = 'none';
        overSeen = false;
      }
    }

    // A drop: who let it fall, where.
    function watchRes(sh) {
      const res = sh?.res;
      if (!res || res.at === lastResAt) return;
      const first = lastResAt === null;
      lastResAt = res.at;
      if (first && clock() - res.at > 3000) return;
      floaters.push({ text: res.who === me ? 'You dropped it!' : 'Dropped!', x: res.x, y: 0.3, t: 0, color: '#ff6b6b', big: true });
      api.sfx('miss');
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
    again.addEventListener('click', playAgain);
    card.append(title, sub, again);
    overlay.append(card);
    function playAgain() {
      if (api.isOwner()) ownerAgain();
      else api.send('again', {});
    }
    let lastCard = '';
    function updateCard(sh) {
      if (!sh?.over) return;
      const win = sh.winner ? api.players().find(m => m.id === sh.winner) : null;
      const t = win ? (win.id === me ? 'You win!' : `${win.name} wins!`) : 'Game over';
      const s = `${sh.res ? `Last rally ${sh.res.r} · ` : ''}Best ${best}`;
      const sig = t + s;
      if (sig !== lastCard) { title.textContent = t; sub.textContent = s; lastCard = sig; }
    }

    let last = performance.now();
    function frame(t) {
      const dt = clamp((t - last) / 1000, 0.001, 0.1);
      last = t;
      const now = clock();
      let sh = shared();
      if (sh?.ball) accept(sh.ball);
      const court = courtOf(sh);
      steerHead(dt, now, court, (sh?.lives?.[me] ?? LIVES) > 0 && !sh?.over);
      if (api.isOwner()) ownerTick(now);
      sh = shared();
      if (sh?.ball) accept(sh.ball);
      watchRes(sh);
      updateCard(sh);
      render(dt, now);
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
        padX = Number(pad.x) || 0;
        const a = !!pad.pressed?.[0] || !!pad.a;
        if (a && !prevA) {
          if (shared()?.over) playAgain();
          else hop();
        }
        prevA = a;
      },
      // A test bot's move (js/rookie.js): stand under the ball, sometimes
      // meeting it off-centre to pass it on.
      rookie() {
        rookieUntil = performance.now() + 1500;
      },
      // For tests: what this seat sees, in world units, and how to map them.
      _view(at) {
        const sh = shared();
        const now = typeof at === 'number' ? at : clock();
        const court = courtOf(sh);
        const i = court.indexOf(me);
        const tl = ball ? timeAtHeight(ball, HEAD_Y + R) : null;
        return {
          owner: api.isOwner(),
          now,
          ball: ball ? { ...ball } : null,
          pos: ball ? ballAt(ball, now) : null,
          landing: ball && tl != null ? ballAt(ball, tl).x : null,
          court: [...court],
          zone: i,
          lives: { ...(sh?.lives || {}) },
          res: sh?.res || null,
          over: !!sh?.over,
          winner: sh?.winner ?? null,
          best,
          head: head ? { ...head } : null,
          remote: Object.fromEntries([...remote].map(([id, r]) => [id, { u: r.u, y: r.y }])),
          map: L ? { s: L.s, ox: L.ox, gy: L.gy, W: L.W, n: L.n } : null,
        };
      },
    };
  },
};

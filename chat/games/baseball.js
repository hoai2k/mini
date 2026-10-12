// Baseball: a home run derby seen from just behind home plate. The pitcher
// winds up and throws fastballs, changeups and curveballs to different spots;
// you tap the ball as it reaches the plate. When you swing decides where the
// ball goes (early pulls it to left field, late pushes it to right, too early
// or too late is foul or a miss) and where you tap on the ball decides how it
// comes off the bat (on top of it is a grounder, under it a pop-up, right on
// it a long fly). Over the wall is a home run, with fireworks.
//
// Everyone bats their own rounds of ten pitches at the same time. Your batter
// is a cartoon slugger with your live face as the head. Friends' hits fly
// out of your park as see-through ghost balls in their colour, their home
// runs are announced, and a scoreboard shows everyone's home runs, longest
// hit and pitch count from their player state, so late joiners see it too.
// Records (best round, longest home run, all-time total) stay on this device.
//
// The world is in metres: x to the right as seen from behind the plate
// (first base side), y up, z out towards centre field. Home plate is at the
// origin. Flights use fixed 1/120 s steps with gravity and air drag and no
// randomness, so a friend's ghost replays exactly.

const G = 9.8;
const DRAG = 0.004;            // quadratic air drag, 1/m
const STEP = 1 / 120;
const BALL_R = 0.037;
const FOUL = Math.PI / 4;      // the foul lines, either side of straight out
const FENCE_H = 3;
const MOUND = { x: 0, y: 0.25, z: 18.44 };
const RELEASE = { x: -0.45, y: 1.85, z: 17.2 };
const PITCHES = 10;            // per round
const TIMING = 0.14;           // seconds either side of perfect that still make contact
const REACH_Y = 0.3;           // metres above or below the ball the bat can be and still touch it
const REACH_X = 0.45;          // along the bat
const ZONE = { x0: -0.24, x1: 0.24, y0: 0.5, y1: 1.1 };
const EYE = { x: 0, y: 2.6, z: -5.5 };
const FT = 3.281;
const BALL_SHOW = 3.3;         // how much larger than life the ball is drawn

// The wall: 98 m (322 ft) down the lines, 115 m (377 ft) to centre.
const fenceDist = phi => 98 + 17 * Math.cos(2 * phi);

const TYPES = {
  fast: { name: 'Fastball', T: [0.6, 0.68], mph: [89, 96], bx: -0.08, by: 0.06 },
  change: { name: 'Changeup', T: [0.88, 0.98], mph: [78, 85], bx: -0.2, by: -0.28 },
  curve: { name: 'Curveball', T: [0.8, 0.9], mph: [72, 80], bx: 0.42, by: -0.5 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const RAD = Math.PI / 180;

// --- pitches (pure) ----------------------------------------------------------

function makePitch(rand = Math.random) {
  const r = rand();
  const type = r < 0.45 ? 'fast' : r < 0.75 ? 'change' : 'curve';
  const k = TYPES[type];
  return {
    type,
    T: lerp(k.T[0], k.T[1], rand()),
    mph: Math.round(lerp(k.mph[0], k.mph[1], rand())),
    tx: lerp(ZONE.x0 + 0.04, ZONE.x1 - 0.04, rand()),
    ty: lerp(ZONE.y0 + 0.05, ZONE.y1 - 0.05, rand()),
    bx: k.bx, by: k.by,
  };
}

// Where the pitch is `t` seconds after release. It travels straight to its
// target with a sideways and up-and-down bow (the break), and after crossing
// the plate carries on the way it was going.
function pitchPos(p, t) {
  const s = t / p.T;
  const at = u => {
    const off = 4 * u * (1 - u);
    return {
      x: RELEASE.x + (p.tx - RELEASE.x) * u - p.bx * off,
      y: RELEASE.y + (p.ty - RELEASE.y) * u - p.by * off,
      z: RELEASE.z * (1 - u),
    };
  };
  if (s <= 1) return at(Math.max(0, s));
  const end = at(1);
  const d = s - 1;
  return {
    x: end.x + (p.tx - RELEASE.x + 4 * p.bx) * d,
    y: Math.max(BALL_R, end.y + (p.ty - RELEASE.y + 4 * p.by) * d),
    z: end.z - RELEASE.z * d,
  };
}

// --- contact (pure) -----------------------------------------------------------

// How the bat meets the ball: `dt` seconds late (negative: early), the bat
// `dx` metres right of the ball and `dy` above it. Null is a miss. Otherwise
// the exit speed (m/s), launch angle and spray angle (degrees; negative is
// towards left field, where an early swing pulls it).
function contact(dt, dx, dy) {
  if (!isNum(dt) || !isNum(dx) || !isNum(dy)) return null;
  if (Math.abs(dt) > TIMING || Math.abs(dy) > REACH_Y || Math.abs(dx) > REACH_X) return null;
  const a = dt / TIMING, b = dy / REACH_Y, c = dx / REACH_X;
  const q = clamp(1 - 0.3 * a * a - 0.6 * b * b - 0.3 * c * c, 0, 1);
  return { q, speed: 20 + 28 * q, launch: 28 - 34 * b, spray: 64 * a + 8 * c };
}

function launchVelocity(c) {
  const l = c.launch * RAD, s = c.spray * RAD;
  return [c.speed * Math.cos(l) * Math.sin(s), c.speed * Math.sin(l), c.speed * Math.cos(l) * Math.cos(s)];
}

// --- flight (pure) -------------------------------------------------------------

function newFly(p, v) {
  return {
    x: p.x, y: p.y, z: p.z, vx: v[0], vy: v[1], vz: v[2], t: 0, spin: 0,
    hr: false, wall: false, land: null, done: false,
    // With no wind or spin the ball never changes heading, so a ball hit
    // outside the lines is foul from the start.
    foul: v[2] <= 0 || Math.abs(Math.atan2(v[0], v[2])) > FOUL,
  };
}

// One step of a hit. `open` leaves out the wall and the stands (to measure
// how far a home run would have carried). Returns 'hr', 'wall', 'land',
// 'stands' or null.
function stepFly(b, open = false) {
  let ev = null;
  const s = Math.hypot(b.vx, b.vy, b.vz);
  b.vx -= DRAG * s * b.vx * STEP;
  b.vy -= (G + DRAG * s * b.vy) * STEP;
  b.vz -= DRAG * s * b.vz * STEP;
  const r0 = Math.hypot(b.x, b.z);
  b.x += b.vx * STEP;
  b.y += b.vy * STEP;
  b.z += b.vz * STEP;
  b.t += STEP;
  b.spin += STEP * 18;
  const r = Math.hypot(b.x, b.z), phi = Math.atan2(b.x, b.z);
  if (!open && !b.foul && Math.abs(phi) <= FOUL) {
    const F = fenceDist(phi);
    if (!b.hr && r0 < F && r >= F) {
      if (b.y > FENCE_H) {
        b.hr = true;
        ev = 'hr';
      } else {
        const k = (F - 0.3) / r;
        b.x *= k;
        b.z *= k;
        b.vx *= -0.35;
        b.vz *= -0.35;
        b.wall = true;
        ev = 'wall';
      }
    }
    // The stands rise behind the wall; a home run ends when it comes down in them.
    if (b.hr && b.y < FENCE_H + (r - F) * 0.5) {
      b.done = true;
      return ev || 'stands';
    }
  }
  if (b.y < BALL_R) {
    if (!b.land) {
      b.land = { x: b.x, z: b.z, t: b.t };
      ev = ev || 'land';
      if (open) b.done = true;
    }
    b.y = BALL_R;
    b.vy = Math.abs(b.vy) > 1.2 ? -b.vy * 0.38 : 0;
    b.vx *= 0.7;
    b.vz *= 0.7;
  }
  if (b.y <= BALL_R && b.vy === 0) {
    const k = Math.exp(-1.6 * STEP);
    b.vx *= k;
    b.vz *= k;
    if (Math.hypot(b.vx, b.vz) < 1) b.done = true;
  }
  if (b.t > 8 || (b.foul && b.land && b.t - b.land.t > 0.8)) b.done = true;
  return ev;
}

// What a hit from `p` with velocity `v` turns out to be: { kind, dist }, the
// distance in metres being how far it carried in the air (for a home run, as
// if the stands weren't there).
function outcome(p, v) {
  const b = newFly(p, v);
  for (let i = 0; i < 2000 && !b.done; i++) stepFly(b);
  const c = newFly(p, v);
  for (let i = 0; i < 2000 && !c.done; i++) stepFly(c, true);
  const dist = c.land ? Math.hypot(c.land.x, c.land.z) : 0;
  const launch = Math.atan2(v[1], Math.hypot(v[0], v[2])) / RAD;
  let kind;
  if (b.foul) kind = 'foul';
  else if (b.hr) kind = 'hr';
  else if (b.wall) kind = 'wall';
  else if (launch < 6) kind = 'grounder';
  else if (launch > 50) kind = 'pop';
  else if (dist > 70) kind = 'fly';
  else kind = 'liner';
  return { kind, dist };
}

const LABELS = {
  hr: 'HOME RUN!', foul: 'Foul ball', wall: 'Off the wall!', grounder: 'Ground ball',
  pop: 'Pop-up', fly: 'Fly ball', liner: 'Line drive!', miss: 'Swing and a miss!', take: 'Taken',
};

// --- camera ---------------------------------------------------------------------

// A pinhole camera at EYE turned by `yaw` (right) and `pitch` (down).
function toCam(cam, x, y, z) {
  const dx = x - EYE.x, dy = y - EYE.y, dz = z - EYE.z;
  const x1 = dx * cam.cy_ - dz * cam.sy_;
  const z1 = dx * cam.sy_ + dz * cam.cy_;
  return [x1, dy * cam.cp + z1 * cam.sp, z1 * cam.cp - dy * cam.sp];
}
function project(cam, x, y, z) {
  const [a, b, c] = toCam(cam, x, y, z);
  const zc = Math.max(0.05, c);
  return { x: cam.cx + (a / zc) * cam.f, y: cam.cy - (b / zc) * cam.f, s: cam.f / zc, behind: c < 0.05 };
}
// The world point under screen point (sx, sy) on the plane z = zp.
function unproject(cam, sx, sy, zp) {
  const x2 = (sx - cam.cx) / cam.f, y2 = -(sy - cam.cy) / cam.f, z2 = 1;
  const dy = y2 * cam.cp - z2 * cam.sp;
  const z1 = y2 * cam.sp + z2 * cam.cp;
  const dx = x2 * cam.cy_ + z1 * cam.sy_;
  const dz = -x2 * cam.sy_ + z1 * cam.cy_;
  const t = Math.abs(dz) < 1e-6 ? 0 : (zp - EYE.z) / dz;
  return { x: EYE.x + dx * t, y: EYE.y + dy * t, z: zp };
}
function setAngles(cam, yaw, pitch) {
  cam.yaw = yaw;
  cam.pitch = pitch;
  cam.cy_ = Math.cos(yaw);
  cam.sy_ = Math.sin(yaw);
  cam.cp = Math.cos(pitch);
  cam.sp = Math.sin(pitch);
}

// Fits the camera to the play area: home plate near the bottom, the
// centre-field wall at 40% of the way down, so the sky above has room for
// fly balls.
function fitCamera(w, top, bottom) {
  const avail = Math.max(100, bottom - top);
  const cy = top + avail / 2;
  const yP = top + avail * 0.9, yF = top + avail * 0.4;
  const aP = Math.atan2(EYE.y, -EYE.z), aF = Math.atan2(EYE.y, fenceDist(0) - EYE.z);
  let lo = aF + 0.001, hi = aP - 0.001;
  const want = (yP - cy) / (yF - cy);
  for (let i = 0; i < 60; i++) {
    const p = (lo + hi) / 2;
    const ratio = Math.tan(aP - p) / Math.tan(aF - p);
    // The ratio is negative and rises towards zero as p rises towards aP.
    if (ratio < want) lo = p; else hi = p;
  }
  const pitch = (lo + hi) / 2;
  let f = (yP - cy) / Math.tan(aP - pitch);
  // A wide screen keeps the same view rather than zooming in further.
  f = Math.min(f, w * 2.2);
  const cam = { f, cx: w / 2, cy, base: pitch };
  setAngles(cam, 0, pitch);
  return cam;
}

// Clips a camera-space polygon to the near plane and projects it.
function clipPoly(cam, pts) {
  const near = 0.2, cs = pts.map(p => toCam(cam, p[0], p[1], p[2]));
  const out = [];
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i], b = cs[(i + 1) % cs.length];
    if (a[2] >= near) out.push(a);
    if ((a[2] >= near) !== (b[2] >= near)) {
      const t = (near - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]);
    }
  }
  return out.map(c => [cam.cx + (c[0] / c[2]) * cam.f, cam.cy - (c[1] / c[2]) * cam.f]);
}
function fillPoly(ctx, cam, pts, style) {
  const s = clipPoly(cam, pts);
  if (s.length < 3) return;
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.moveTo(s[0][0], s[0][1]);
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]);
  ctx.closePath();
  ctx.fill();
}
function line3(ctx, cam, a, b) {
  const ca = toCam(cam, ...a), cb = toCam(cam, ...b), near = 0.2;
  if (ca[2] < near && cb[2] < near) return;
  const cut = (p, q) => {
    const t = (near - p[2]) / (q[2] - p[2]);
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, near];
  };
  const p = ca[2] < near ? cut(ca, cb) : ca, q = cb[2] < near ? cut(cb, ca) : cb;
  ctx.beginPath();
  ctx.moveTo(cam.cx + (p[0] / p[2]) * cam.f, cam.cy - (p[1] / p[2]) * cam.f);
  ctx.lineTo(cam.cx + (q[0] / q[2]) * cam.f, cam.cy - (q[1] / q[2]) * cam.f);
  ctx.stroke();
}
const arc = (r0, phi0, phi1, n, fn) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const phi = lerp(phi0, phi1, i / n);
    out.push(fn(phi, r0));
  }
  return out;
};
const ring = (cx, cz, r, n = 20, y = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
});

// The stadium stand-in, drawn from the current camera.
function drawStadium(ctx, cam, w, h, crowd, cheer, t) {
  const horizon = cam.cy - Math.tan(cam.pitch) * cam.f;
  const sky = ctx.createLinearGradient(0, horizon - h * 0.6, 0, horizon);
  sky.addColorStop(0, '#3d8fe0');
  sky.addColorStop(1, '#a9dcff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Clouds far away, sliding with the camera's turn.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [az, el, s] of [[-0.35, 0.16, 1], [0.05, 0.24, 1.3], [0.42, 0.13, 0.9], [0.8, 0.2, 1.1], [-0.8, 0.22, 1.2]]) {
    const x = cam.cx + Math.tan(az - cam.yaw) * cam.f;
    const y = cam.cy - Math.tan(el - cam.pitch) * cam.f;
    const r = cam.f * 0.035 * s;
    if (x < -r * 4 || x > w + r * 4) continue;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 2.2, r * 0.7, 0, 0, Math.PI * 2);
    ctx.ellipse(x - r * 0.8, y - r * 0.4, r * 0.9, r * 0.7, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.6, y - r * 0.55, r * 1.1, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Grass to the horizon, with mowed stripes.
  ctx.fillStyle = '#3fa34d';
  ctx.fillRect(0, horizon, w, h - horizon);
  for (let i = 0; i < 16; i++) {
    const z0 = 6 + i * 8;
    fillPoly(ctx, cam, [[-140, 0, z0], [140, 0, z0], [140, 0, z0 + 4], [-140, 0, z0 + 4]], '#4cb35a');
  }
  const F = phi => fenceDist(clamp(phi, -FOUL, FOUL));
  const P0 = -1.25, P1 = 1.25;
  const pt = (phi, r, y = 0) => [Math.sin(phi) * r, y, Math.cos(phi) * r];
  // Warning track.
  fillPoly(ctx, cam, [...arc(0, P0, P1, 40, phi => pt(phi, F(phi) - 4)), ...arc(0, P1, P0, 40, phi => pt(phi, F(phi)))], '#c98a52');
  // Stands rising behind the wall, full of fans.
  fillPoly(ctx, cam, [...arc(0, P0, P1, 40, phi => pt(phi, F(phi) + 0.5, FENCE_H)), ...arc(0, P1, P0, 40, phi => pt(phi, F(phi) + 46, FENCE_H + 23))], '#2f3b66');
  fillPoly(ctx, cam, [...arc(0, P0, P1, 40, phi => pt(phi, F(phi) + 46, FENCE_H + 23)), ...arc(0, P1, P0, 40, phi => pt(phi, F(phi) + 48, FENCE_H + 27))], '#e8413a');
  for (let i = 0; i < crowd.length; i++) {
    const c = crowd[i];
    const jump = cheer > 0 ? Math.max(0, Math.sin(t * 14 + i * 1.7)) * 0.7 * cheer : 0;
    const p = project(cam, c.x, c.y + jump, c.z);
    if (p.behind || p.x < -4 || p.x > w + 4) continue;
    const r = Math.max(0.8, 0.45 * p.s);
    ctx.fillStyle = c.color;
    ctx.fillRect(p.x - r, p.y - r * 1.6, r * 2, r * 1.6);
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(p.x - r * 0.6, p.y - r * 2.6, r * 1.2, r);
  }
  // The wall with its yellow top and distances.
  fillPoly(ctx, cam, [...arc(0, P0, P1, 40, phi => pt(phi, F(phi), 0)), ...arc(0, P1, P0, 40, phi => pt(phi, F(phi), FENCE_H))], '#1d6b3f');
  ctx.strokeStyle = '#ffd43b';
  ctx.lineWidth = Math.max(1.5, cam.f * 0.003);
  const topLine = arc(0, P0, P1, 40, phi => pt(phi, F(phi), FENCE_H));
  for (let i = 0; i < topLine.length - 1; i++) line3(ctx, cam, topLine[i], topLine[i + 1]);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const phi of [-FOUL, -FOUL / 2, 0, FOUL / 2, FOUL]) {
    const p = project(cam, ...pt(phi, F(phi) - 0.1, FENCE_H * 0.5));
    if (p.behind) continue;
    ctx.font = `900 ${Math.max(7, p.s * 1.6)}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(String(Math.round(F(phi) * FT)), p.x, p.y);
  }
  // Foul lines and poles.
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, cam.f * 0.002);
  for (const s of [-1, 1]) {
    line3(ctx, cam, [0, 0, 0], pt(s * FOUL, F(0) + 2));
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = Math.max(1.5, cam.f * 0.003);
    line3(ctx, cam, pt(s * FOUL, F(s * FOUL)), pt(s * FOUL, F(s * FOUL), 16));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1, cam.f * 0.002);
  }
  // The infield: dirt out to an arc around the mound, the grass diamond inside.
  const dirt = '#c98a52';
  const infield = [[0, 0, -1]];
  for (let i = 0; i <= 30; i++) {
    const a = lerp(-1.25, 1.25, i / 30);
    infield.push([Math.sin(a) * 29, 0, MOUND.z + Math.cos(a) * 29 * 0.92]);
  }
  fillPoly(ctx, cam, infield, dirt);
  const b = 27.43 / Math.SQRT2;
  fillPoly(ctx, cam, [[0, 0, 2.5], [b - 2, 0, b], [0, 0, 2 * b - 2.5], [-b + 2, 0, b]], '#3fa34d');
  fillPoly(ctx, cam, ring(0, 0, 3.9), dirt);
  fillPoly(ctx, cam, ring(MOUND.x, MOUND.z, 2.7), '#d39762');
  fillPoly(ctx, cam, [[-0.3, 0, MOUND.z - 0.1], [0.3, 0, MOUND.z - 0.1], [0.3, 0, MOUND.z + 0.05], [-0.3, 0, MOUND.z + 0.05]], '#fff');
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1, cam.f * 0.002);
  for (const s of [-1, 1]) {
    // Batter's boxes.
    const x0 = s * 0.35, x1 = s * 1.57;
    const box = [[x0, 0, -0.9], [x1, 0, -0.9], [x1, 0, 0.9], [x0, 0, 0.9]];
    for (let i = 0; i < 4; i++) line3(ctx, cam, box[i], box[(i + 1) % 4]);
  }
  for (const [x, z] of [[b, b], [0, 2 * b], [-b, b]]) fillPoly(ctx, cam, [[x - 0.25, 0.05, z - 0.25], [x + 0.25, 0.05, z - 0.25], [x + 0.25, 0.05, z + 0.25], [x - 0.25, 0.05, z + 0.25]], '#fff');
  // Home plate.
  fillPoly(ctx, cam, [[-0.22, 0.01, 0.22], [0.22, 0.01, 0.22], [0.22, 0.01, 0], [0, 0.01, -0.22], [-0.22, 0.01, 0]], '#fff');
}

function drawBallStandIn(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.75, '#f1ede4');
  g.addColorStop(1, '#bdb6a8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  if (r > 4) {
    ctx.strokeStyle = '#d6332c';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.arc(-r * 1.15, 0, r * 0.8, -0.8, 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 1.15, 0, r * 0.8, Math.PI - 0.8, Math.PI + 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

// The pitcher stand-in: facing the batter, his right (throwing) arm on our
// left. `pose` 0 is set, 1 the wind-up (knee up, hands at the chest), 2 the
// throw (arm whipped through), 3 the follow-through.
function drawPitcherStandIn(ctx, x, y, s, pose) {
  const u = v => v * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const legs = '#e9e9f2', red = '#e03131', skin = '#f2c9a0';
  ctx.strokeStyle = legs;
  ctx.lineWidth = u(0.17);
  // Legs.
  const knee = pose === 1;
  ctx.beginPath();
  ctx.moveTo(u(0.12), -u(0.9));
  ctx.lineTo(u(0.14), -u(0.06));
  ctx.moveTo(-u(0.1), -u(0.9));
  if (knee) {
    ctx.lineTo(-u(0.12), -u(1.25));
    ctx.lineTo(-u(0.18), -u(0.85));
  } else if (pose >= 2) {
    ctx.lineTo(-u(0.3), -u(0.45));
    ctx.lineTo(-u(0.42), -u(0.06));
  } else {
    ctx.lineTo(-u(0.14), -u(0.06));
  }
  ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.ellipse(u(0.15), -u(0.04), u(0.12), u(0.06), 0, 0, Math.PI * 2);
  if (!knee) ctx.ellipse(pose >= 2 ? -u(0.43) : -u(0.15), -u(0.04), u(0.12), u(0.06), 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  const lean = pose === 2 ? u(0.06) : 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(-u(0.25) + lean, -u(1.5), u(0.5), u(0.68), u(0.14));
  ctx.fill();
  ctx.fillStyle = red;
  ctx.fillRect(-u(0.25) + lean, -u(0.98), u(0.5), u(0.06));
  // Arms: glove arm (our right) and throwing arm (our left).
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = u(0.13);
  ctx.beginPath();
  const sh = { l: [-u(0.22) + lean, -u(1.38)], r: [u(0.22) + lean, -u(1.38)] };
  const glove = pose === 1 ? [u(0.02), -u(1.2)] : pose === 2 ? [u(0.4), -u(1.05)] : pose === 3 ? [u(0.28), -u(0.95)] : [u(0.08), -u(1.15)];
  const hand = pose === 1 ? [-u(0.02), -u(1.22)] : pose === 2 ? [-u(0.1), -u(1.95)] : pose === 3 ? [u(0.18), -u(0.75)] : [-u(0.05), -u(1.15)];
  ctx.moveTo(...sh.r);
  ctx.lineTo(...glove);
  ctx.moveTo(...sh.l);
  if (pose === 2) ctx.lineTo(-u(0.42), -u(1.75));
  ctx.lineTo(...hand);
  ctx.stroke();
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.arc(glove[0], glove[1], u(0.11), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hand[0], hand[1], u(0.06), 0, Math.PI * 2);
  ctx.fill();
  // Head and cap.
  ctx.beginPath();
  ctx.arc(lean, -u(1.66), u(0.15), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.arc(lean, -u(1.69), u(0.155), Math.PI, 0);
  ctx.fill();
  ctx.fillRect(lean - u(0.2), -u(1.7), u(0.4), u(0.04));
  ctx.restore();
}

export default {
  id: 'baseball',
  name: 'Baseball',
  emoji: '⚾',
  blurb: 'Home run derby: tap the ball as it reaches the plate. Friends’ hits fly as ghosts.',
  minPlayers: 1,
  maxPlayers: 8,
  needsFace: false,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.style.touchAction = 'none';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    // The end-of-round card.
    const card = document.createElement('div');
    card.className = 'g-center';
    card.hidden = true;
    card.style.pointerEvents = 'none';
    const panel = document.createElement('div');
    panel.style.cssText = 'pointer-events:auto;background:rgba(29,21,51,0.9);border:1px solid rgba(255,255,255,0.14);border-radius:18px;padding:16px 18px;max-width:340px;width:100%;display:flex;flex-direction:column;gap:10px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,0.4)';
    const cardTitle = document.createElement('div');
    cardTitle.className = 'g-big';
    const cardLine = document.createElement('div');
    cardLine.style.cssText = 'font-weight:800;opacity:0.9';
    const table = document.createElement('div');
    table.style.cssText = 'display:flex;flex-direction:column;gap:4px;width:100%;font-weight:800;font-size:0.95rem';
    const again = document.createElement('button');
    again.className = 'btn aqua';
    again.textContent = 'Bat again ⚾';
    again.addEventListener('click', () => newRound());
    panel.append(cardTitle, cardLine, table, again);
    card.append(panel);
    api.el.append(card);

    const record = { best: api.store.get('best', 0), longest: api.store.get('longest', 0), total: api.store.get('total', 0) };
    const round = { r: 1, n: 0, hr: 0, long: 0, last: '' };
    let phase = 'ready';       // ready, windup, pitch, result, over
    let phaseAt = 0;           // game time the phase began
    let pitch = null;          // the pitch in the air
    let releaseAt = 0;
    let swing = null;          // { at, aim:{x,y}, hands }
    let swung = false;         // swung at this pitch
    let fly = null;            // my hit in flight
    let trail = [];
    let result = null;         // { kind, dist, at }
    let plan = null;           // a test bot's planned swing
    const ghosts = [];         // friends' hits in flight
    const floaters = [];       // announcements
    const sparks = [];         // fireworks
    const taps = [];           // tap rings
    let cheer = 0;
    let pci = { x: 0, y: 0.8 }; // the keyboard / controller aim on the plate
    let pciShown = false;
    let hover = null;          // mouse position
    let lastHit = null;        // for tests
    let w = 0, h = 0, dpr = 1, cam = null, inset = { top: 0, bottom: 0 };
    let raf = 0, last = performance.now(), now = 0, acc = 0;
    let bgCache = null;

    const crowd = [];
    {
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const colors = ['#ff5fa2', '#3fe0d0', '#ffd43b', '#9775fa', '#69db7c', '#ff8c42', '#ffffff', '#4dabf7', '#e03131'];
      for (let i = 0; i < 520; i++) {
        const phi = lerp(-1.25, 1.25, rnd()), t = rnd();
        const r = fenceDist(clamp(phi, -FOUL, FOUL)) + 2 + t * 43;
        crowd.push({ x: Math.sin(phi) * r, y: FENCE_H + 0.6 + t * 21.5, z: Math.cos(phi) * r, color: colors[Math.floor(rnd() * colors.length)] });
      }
      crowd.sort((a, b) => Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z));
    }

    function publish() {
      api.setState({ r: round.r, n: round.n, hr: round.hr, long: Math.round(round.long * FT), last: round.last, best: record.best });
    }
    publish();

    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      const yaw = cam ? cam.yaw - 0 : 0;
      const off = cam ? cam.pitch - cam.base : 0;
      cam = fitCamera(w, inset.top + 70, h - inset.bottom);
      setAngles(cam, yaw, cam.base + off);
      bgCache = null;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // --- the round -----------------------------------------------------------
    function setPhase(p) {
      phase = p;
      phaseAt = now;
    }

    function newRound() {
      if (phase !== 'over') return;
      round.r++;
      round.n = 0;
      round.hr = 0;
      round.long = 0;
      round.last = '';
      card.hidden = true;
      publish();
      setPhase('ready');
    }

    function endPitch(kind, dist = 0) {
      round.n++;
      const label = kind === 'hr' || kind === 'fly' || kind === 'wall' || kind === 'liner' ? `${LABELS[kind].replace('!', '')} ${Math.round(dist * FT)} ft` : LABELS[kind];
      round.last = label;
      if (kind === 'hr') {
        round.hr++;
        record.total++;
        round.long = Math.max(round.long, dist);
        if (dist > record.longest) record.longest = dist;
        api.store.set('total', record.total);
        api.store.set('longest', record.longest);
      }
      publish();
    }

    function finishRound() {
      setPhase('over');
      const isBest = round.hr > record.best;
      if (isBest) {
        record.best = round.hr;
        api.store.set('best', record.best);
      }
      publish();
      api.sfx(round.hr ? 'win' : 'lose');
      cardTitle.textContent = round.hr === 1 ? '1 home run' : `${round.hr} home runs`;
      cardLine.textContent = (round.hr ? `Longest ${Math.round(round.long * FT)} ft` : 'Keep your eye on the ball!') + (isBest && round.hr ? ' · new best round!' : ` · best round ${record.best}`);
      fillTable();
      card.hidden = false;
    }

    // Everyone's latest round, most home runs first.
    function fillTable() {
      table.replaceChildren();
      const rows = api.players().map(p => ({ p, s: readState(p) })).sort((a, b) => b.s.hr - a.s.hr || b.s.long - a.s.long);
      for (const { p, s } of rows) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;gap:10px';
        const name = document.createElement('span');
        name.style.color = p.color || '#fff';
        name.textContent = p.me ? `${p.name} (you)` : p.name;
        const val = document.createElement('span');
        val.textContent = `${s.hr} HR${s.long ? ` · ${s.long} ft` : ''}${s.n < PITCHES ? ` · batting ${s.n}/${PITCHES}` : ''}`;
        row.append(name, val);
        table.append(row);
      }
    }

    // A player's published state, checked (it comes from the network).
    function readState(p) {
      const s = p.me ? { r: round.r, n: round.n, hr: round.hr, long: Math.round(round.long * FT), last: round.last } : p.state || {};
      return {
        r: isNum(s.r) ? clamp(Math.floor(s.r), 1, 9999) : 1,
        n: isNum(s.n) ? clamp(Math.floor(s.n), 0, PITCHES) : 0,
        hr: isNum(s.hr) ? clamp(Math.floor(s.hr), 0, PITCHES) : 0,
        long: isNum(s.long) ? clamp(Math.round(s.long), 0, 999) : 0,
        last: typeof s.last === 'string' ? s.last.slice(0, 24) : '',
      };
    }

    // Where the ball is now (null when it isn't in the air on a pitch).
    const ballNow = () => (pitch && !fly && (phase === 'pitch' || phase === 'result') && now - releaseAt < pitch.T + 0.6 ? pitchPos(pitch, now - releaseAt) : null);

    // Swings at a point on the plate plane (x, y metres), now. `slop` scales
    // the aim error (keyboard and controller aim is looser).
    function doSwing(aim, slop = 1) {
      if (swing && now - swing.at < 0.45) return false;
      if (phase === 'over' || phase === 'result') return false;
      // The swing starts from wherever the bat is now.
      const from = { ...poseNow() };
      if (from.a > 180) from.a -= 360;
      swing = { at: now, aim: { x: clamp(aim.x, -1, 1), y: clamp(aim.y, 0.1, 2) }, from };
      api.sfx('whoosh');
      if (phase !== 'pitch' || swung) {
        if (phase === 'windup' || phase === 'ready') floaters.push({ text: 'Wait for the pitch!', t: 0, color: '#fff' });
        return false;
      }
      swung = true;
      const t = now - releaseAt;
      const b = pitchPos(pitch, t);
      const c = contact(t - pitch.T, (aim.x - b.x) * slop, (aim.y - b.y) * slop);
      lastHit = { dt: t - pitch.T, dx: aim.x - b.x, dy: aim.y - b.y, contact: c };
      if (!c) return true;   // a miss: the pitch carries on into the catcher's mitt
      const v = launchVelocity(c);
      const p = { x: b.x, y: b.y, z: Math.max(0, b.z) };
      const o = outcome(p, v);
      lastHit.outcome = o;
      fly = newFly(p, v);
      // A moment's hit-stop while the bat comes round to meet it.
      fly.hold = SWING_IN;
      trail = [];
      result = { kind: o.kind, dist: o.dist, at: now, shown: false };
      api.sfx(c.q > 0.8 ? 'bang' : 'pop');
      api.send('hit', { p: [p.x, p.y, p.z], v });
      setPhase('result');
      return true;
    }

    // --- input ---------------------------------------------------------------
    // A tap is a swing at the ball under the finger, measured at the ball's
    // depth so tapping right on the ball is right on it.
    function aimAt(sx, sy) {
      const b = ballNow();
      const z = b ? clamp(b.z, -3.5, RELEASE.z) : 0;
      return unproject(cam, sx, sy, z);
    }
    const local = e => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    function onDown(e) {
      if (!cam) return;
      const p = local(e);
      pciShown = false;
      taps.push({ ...p, t: 0 });
      doSwing(aimAt(p.x, p.y));
    }
    function onMove(e) {
      hover = e.pointerType === 'mouse' ? local(e) : null;
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', () => { hover = null; });

    const keys = new Set();
    const typing = e => /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target?.tagName);
    function onKey(e) {
      if (!api.el.isConnected) return;
      const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (arrows.includes(e.code) && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)) {
        e.preventDefault();
        if (e.type === 'keydown') keys.add(e.code); else keys.delete(e.code);
        pciShown = true;
      } else if ((e.code === 'Space' || e.code === 'Enter') && e.type === 'keydown' && !e.repeat && !typing(e)) {
        e.preventDefault();
        if (phase === 'over') newRound();
        else {
          pciShown = true;
          doSwing(pci, 0.6);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // --- network ---------------------------------------------------------------
    const vec3 = a => Array.isArray(a) && a.length === 3 && a.every(isNum);
    const offHit = api.on('hit', (data, from) => {
      if (!data || !vec3(data.p) || !vec3(data.v) || ghosts.length > 12) return;
      const p = api.players().find(m => m.id === from);
      if (!p || p.me) return;
      const sp = Math.hypot(...data.v);
      if (sp > 60) return;
      const start = { x: clamp(data.p[0], -1, 1), y: clamp(data.p[1], 0, 2), z: clamp(data.p[2], 0, 3) };
      const o = outcome(start, data.v);
      ghosts.push({ ball: newFly(start, data.v), name: String(p.name || '').slice(0, 16), color: p.color || '#fff', o, trail: [] });
    });

    // --- loop ---------------------------------------------------------------------
    function burst(x, y, color, n = 36) {
      if (sparks.length > 400) return;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, v = 60 + Math.random() * 110;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 + Math.random() * 0.5, color });
      }
    }
    function homeRunShow(color) {
      cheer = 3;
      const colors = color ? [color] : ['#ff5fa2', '#ffd43b', '#3fe0d0', '#9775fa'];
      for (let k = 0; k < (color ? 2 : 5); k++) {
        floaters.push({ firework: true, at: k * 0.28, color: colors[k % colors.length], t: 0 });
      }
    }

    function update(dt) {
      // Keyboard / controller aim.
      const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
      const ky = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
      pci.x = clamp(pci.x + kx * dt * 0.8, ZONE.x0 - 0.3, ZONE.x1 + 0.3);
      pci.y = clamp(pci.y + ky * dt * 0.8, ZONE.y0 - 0.3, ZONE.y1 + 0.3);

      const t = now - phaseAt;
      if (phase === 'ready' && t > (round.n === 0 ? 1.4 : 0.7)) {
        pitch = makePitch();
        swung = false;
        fly = null;
        result = null;
        setPhase('windup');
      } else if (phase === 'windup' && t > 1.05) {
        releaseAt = now;
        api.sfx('blow');
        setPhase('pitch');
      } else if (phase === 'pitch') {
        if (plan && now - releaseAt >= plan.at) {
          const b = pitchPos(pitch, now - releaseAt);
          doSwing({ x: b.x + plan.dx, y: b.y + plan.dy });
          plan = null;
        }
        if (phase === 'pitch' && now - releaseAt > pitch.T + TIMING + 0.05) {
          result = { kind: swung ? 'miss' : 'take', dist: 0, at: now, shown: true };
          api.sfx(swung ? 'miss' : 'click');
          endPitch(result.kind);
          setPhase('result');
        }
      } else if (phase === 'result') {
        const doneAt = fly ? (fly.done ? result.flyDone ?? (result.flyDone = now) : null) : result.at;
        if (doneAt != null && now - doneAt > (fly ? 1.1 : 0.9)) {
          fly = null;
          pitch = null;
          if (round.n >= PITCHES) finishRound();
          else setPhase('ready');
        }
      }

      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        if (fly && fly.hold > 0) fly.hold -= STEP;
        else if (fly && !fly.done) {
          const ev = stepFly(fly);
          if (ev === 'hr') {
            homeRunShow(null);
            api.sfx('win');
          } else if (ev === 'wall') api.sfx('bounce');
          if (fly.done || (fly.land && !result.shown) || ev === 'hr') {
            if (!result.shown) {
              result.shown = true;
              endPitch(result.kind, result.dist);
              if (result.kind !== 'hr') api.sfx(result.kind === 'foul' ? 'click' : 'miss');
            }
          }
        }
        for (const g of ghosts) {
          if (g.ball.done) continue;
          if (stepFly(g.ball) === 'hr') {
            homeRunShow(g.color);
            floaters.push({ text: `${g.name}: home run, ${Math.round(g.o.dist * FT)} ft!`, t: 0, color: g.color, small: true });
          }
        }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].ball.done) ghosts.splice(i, 1);
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.t += dt;
        if (f.firework && !f.fired && f.t >= f.at) {
          f.fired = true;
          burst(w * (0.2 + Math.random() * 0.6), inset.top + 80 + Math.random() * h * 0.2, f.color);
          api.sfx('fire');
        }
        if (f.t > (f.firework ? f.at + 0.1 : 1.6)) floaters.splice(i, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vy += 120 * dt;
        s.vx *= 1 - dt * 1.5;
        s.vy *= 1 - dt * 1.5;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if ((s.life -= dt) <= 0) sparks.splice(i, 1);
      }
      for (let i = taps.length - 1; i >= 0; i--) if ((taps[i].t += dt) > 0.35) taps.splice(i, 1);
      cheer = Math.max(0, cheer - dt);

      // The camera follows a hit up and out, then settles back.
      let yaw = 0, pitchT = cam.base;
      const follow = fly && !fly.done ? fly : null;
      if (follow) {
        const hd = Math.hypot(follow.x - EYE.x, follow.z - EYE.z);
        const az = Math.atan2(follow.x - EYE.x, follow.z - EYE.z);
        const el = Math.atan2(follow.y - EYE.y, hd);
        // Turn most of the way towards it once it is out past the mound.
        yaw = clamp(az * 0.85, -0.75, 0.75) * clamp((follow.z - 8) / 30, 0, 1);
        const topRoom = Math.atan((cam.cy - bannerY() - 70) / cam.f);
        pitchT = Math.min(cam.base, topRoom - el);
        pitchT = Math.max(pitchT, cam.base - 0.45);
      }
      const k = 1 - Math.exp(-dt * (follow ? 5 : 4));
      setAngles(cam, cam.yaw + (yaw - cam.yaw) * k, cam.pitch + (pitchT - cam.pitch) * k);
    }

    // --- drawing ---------------------------------------------------------------
    // The average colour of the art's bottom edge (its dirt), worked out once.
    let dirt = null;
    function dirtOf(art) {
      if (dirt?.art === art) return dirt.color;
      let color = '#c98a55';
      try {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 4;
        const g = c.getContext('2d');
        g.drawImage(art, 0, art.height - 24, art.width, 24, 0, 0, 32, 4);
        const d = g.getImageData(0, 0, 32, 4).data;
        let r = 0, gr = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        color = `rgb(${Math.round(r / n)},${Math.round(gr / n)},${Math.round(b / n)})`;
      } catch { /* keep the default */ }
      dirt = { art, color };
      return color;
    }

    function background() {
      const art = api.img('baseball-field');
      const still = Math.abs(cam.yaw) < 1e-3 && Math.abs(cam.pitch - cam.base) < 1e-3 && cheer <= 0;
      if (art) {
        // Delivered art: cover the screen, anchored so its plate sits on ours
        // (the art's plate is assumed at the bottom centre; the camera's turn
        // pans it).
        const s = Math.max(w / art.width, h / art.height) * 1.08;
        const plate = project({ ...cam, ...anglesOf(0, cam.base) }, 0, 0, 0);
        const x = w / 2 - (art.width * s) / 2 - Math.tan(cam.yaw) * cam.f;
        const y = Math.min(0, plate.y + 20 - art.height * s) + Math.tan(cam.base - cam.pitch) * cam.f;
        ctx.fillStyle = '#7cc4f2';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(art, x, y, art.width * s, art.height * s);
        // A tall screen shows ground below the picture: carry on its dirt.
        const bottom = y + art.height * s;
        if (bottom < h) {
          ctx.fillStyle = dirtOf(art);
          ctx.fillRect(0, bottom - 1, w, h - bottom + 1);
        }
        return;
      }
      if (still && bgCache && bgCache.w === w && bgCache.h === h) {
        ctx.drawImage(bgCache.canvas, 0, 0, w, h);
        return;
      }
      if (still) {
        const c = document.createElement('canvas');
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        drawStadium(g, cam, w, h, crowd, 0, now);
        bgCache = { canvas: c, w, h };
        ctx.drawImage(c, 0, 0, w, h);
        return;
      }
      drawStadium(ctx, cam, w, h, crowd, cheer, now);
    }
    // Just under the scoreboard: where results and the distance show.
    const bannerY = () => inset.top + 16 + api.players().length * 26 + 90;
    const anglesOf = (yaw, pitch) => ({ yaw, pitch, cy_: Math.cos(yaw), sy_: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch) });

    function drawPitcher() {
      const p = project(cam, MOUND.x, MOUND.y, MOUND.z);
      if (p.behind) return;
      const sinceRelease = phase === 'pitch' || (phase === 'result' && pitch) ? now - releaseAt : -1;
      let pose = 0;
      if (phase === 'windup') pose = now - phaseAt > 0.25 ? 1 : 0;
      if (phase === 'windup' && now - phaseAt > 0.9) pose = 2;
      if (sinceRelease >= 0) pose = sinceRelease < 0.12 ? 2 : sinceRelease < 0.9 ? 3 : 0;
      const art = api.img(pose >= 2 ? 'baseball-pitcher-throw' : 'baseball-pitcher-windup');
      const scale = p.s * 1.25;
      if (art) {
        const hgt = 2.0 * scale, wid = (hgt * art.width) / art.height;
        ctx.drawImage(art, p.x - wid / 2, p.y - hgt, wid, hgt);
      } else {
        // Shadow.
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, scale * 0.45, scale * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        drawPitcherStandIn(ctx, p.x, p.y, scale, pose);
      }
    }

    // Like every batting game, the ball is drawn far larger than life so it
    // reads on a phone: it grows from a dot in the pitcher's hand to about 7%
    // of a phone's width as it reaches the plate.
    const ballRadius = p => Math.max(2.5, BALL_R * p.s * BALL_SHOW);
    function drawBall(b, alpha, tint, spin = 0) {
      const p = project(cam, b.x, b.y, b.z);
      if (p.behind) return null;
      const r = ballRadius(p);
      // Shadow on the ground.
      const sh = project(cam, b.x, 0, b.z);
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      const art = api.img('baseball-ball');
      if (art) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(spin);
        ctx.drawImage(art, -r, -r, r * 2, r * 2);
        ctx.restore();
      } else drawBallStandIn(ctx, p.x, p.y, r, spin);
      if (tint) {
        ctx.strokeStyle = tint;
        ctx.lineWidth = Math.max(1.5, r * 0.3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.25, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return { p, r };
    }

    // The pitch, with a short streak behind it so the eye can track it in.
    function drawPitch(b) {
      const t = now - releaseAt;
      for (let i = 4; i >= 1; i--) {
        const q = pitchPos(pitch, Math.max(0, t - i * 0.022));
        const p = project(cam, q.x, q.y, q.z);
        if (p.behind) continue;
        ctx.globalAlpha = 0.16 * (1 - i / 5);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, ballRadius(p) * (1 - i * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawBall(b, 1, null, t * 25);
    }

    function drawTrail(points, color, alpha) {
      if (points.length < 2) return;
      ctx.lineCap = 'round';
      for (let i = 1; i < points.length; i++) {
        const a = project(cam, ...points[i - 1]), b = project(cam, ...points[i]);
        if (a.behind || b.behind) continue;
        ctx.globalAlpha = alpha * (i / points.length);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, (i / points.length) * 4);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // --- the batter ----------------------------------------------------------
    // A right-handed slugger in the left-hand box, facing the plate (+x), seen
    // from behind and to his right like the batting view of Wii Sports
    // Baseball. His body turns about a vertical axis through his shoulders;
    // both hands stay on the bat, and the hands never stray further from either
    // shoulder than the arms reach, so the arms bend but never stretch.
    //
    // Angles of the bat round the batter, in degrees: -90 points back at the
    // catcher, 0 across the plate, 90 out at the pitcher, 180 behind him. Tilt
    // is up from level. The swing is a fast arc that sweeps this angle up
    // through the hitting zone and on round over his front shoulder.
    const BODY = { x: -0.86, z: 0 };
    const SHOULDER_Y = 1.42, SHOULDER_HALF = 0.19, ARM = 0.33, BAT_L = 0.86;
    // Hand positions (the bottom hand on the handle) relative to the middle of
    // the shoulders, and the bat's angle and tilt, at each key pose.
    const STANCE = { hand: { x: 0.08, y: 0.06, z: -0.26 }, a: -75, tilt: 62, turn: -8 };
    const LOADED = { hand: { x: 0.02, y: 0.1, z: -0.33 }, a: -100, tilt: 52, turn: -22 };
    const FINISH = { hand: { x: 0.0, y: 0.08, z: 0.34 }, a: 205, tilt: 30, turn: 85 };
    const SWING_IN = 0.05;     // seconds from the loaded stance to the ball (the tap is contact)
    const SWING_OUT = 0.32;    // ...and on round to the follow-through
    const SWING_HOLD = 0.52;   // hold the finish
    const SWING_BACK = 0.95;   // back in the stance

    // The pose at contact: the hands out in front at belt height, the bat
    // pointing across the plate through the point that was tapped.
    function contactPose(aim) {
      const hand = { x: 0.26, y: clamp(aim.y - SHOULDER_Y + 0.12, -0.42, -0.12), z: 0.12 };
      const gx = BODY.x + hand.x, gy = SHOULDER_Y + hand.y, gz = BODY.z + hand.z;
      const dx = Math.max(0.3, aim.x - gx), dy = aim.y - gy, dz = -gz;
      const a = Math.atan2(dz, dx) / RAD;
      const tilt = clamp(Math.atan2(dy, Math.hypot(dx, dz)) / RAD, -40, 25);
      return { hand, a, tilt, turn: 35 };
    }
    const mixPose = (p, q, k) => ({
      hand: { x: lerp(p.hand.x, q.hand.x, k), y: lerp(p.hand.y, q.hand.y, k), z: lerp(p.hand.z, q.hand.z, k) },
      a: lerp(p.a, q.a, k), tilt: lerp(p.tilt, q.tilt, k), turn: lerp(p.turn, q.turn, k),
    });

    // How far into his load the batter is: he coils as the pitch comes in.
    function loadNow() {
      if (phase === 'pitch' && pitch) return ease(clamp(((now - releaseAt) / pitch.T - 0.15) / 0.6, 0, 1));
      if (phase === 'windup') return 0.25 * ease(clamp((now - phaseAt - 0.5) / 0.5, 0, 1));
      return 0;
    }

    // The pose `u` seconds into swing `sw` (null once it is over).
    function swingPose(sw, u) {
      const hit = contactPose(sw.aim);
      if (u < SWING_IN) {
        // Accelerating into the ball.
        const k = Math.max(0, u) / SWING_IN;
        return mixPose(sw.from, hit, k * k);
      }
      if (u < SWING_OUT) {
        const k = (u - SWING_IN) / (SWING_OUT - SWING_IN);
        return mixPose(hit, FINISH, 1 - (1 - k) * (1 - k));
      }
      if (u < SWING_HOLD) return FINISH;
      if (u < SWING_BACK) {
        // Back to the stance: the bat comes up over his head (the angle carries
        // on round past behind him) rather than unwinding through the zone.
        const k = ease((u - SWING_HOLD) / (SWING_BACK - SWING_HOLD));
        return mixPose(FINISH, { ...STANCE, a: STANCE.a + 360 }, k);
      }
      return null;
    }
    // The pose now.
    function poseNow() {
      const ready = mixPose(STANCE, LOADED, loadNow());
      if (!swing) return ready;
      const pose = swingPose(swing, now - swing.at);
      if (!pose) swing = null;
      return pose || ready;
    }

    // Where everything is, in the world: shoulders, hips, hands, elbows and
    // the bat, for a pose.
    function batterRig(pose) {
      const turn = pose.turn * RAD;
      // The front (left) shoulder is towards the pitcher when he faces the plate.
      const side = { x: -Math.sin(turn), z: Math.cos(turn) };
      const mid = { x: BODY.x + 0.03 * Math.sin(turn), y: SHOULDER_Y, z: BODY.z };
      const front = { x: mid.x + side.x * SHOULDER_HALF, y: mid.y, z: mid.z + side.z * SHOULDER_HALF };
      const back = { x: mid.x - side.x * SHOULDER_HALF, y: mid.y, z: mid.z - side.z * SHOULDER_HALF };
      const hipTurn = turn * 0.5;
      const hside = { x: -Math.sin(hipTurn), z: Math.cos(hipTurn) };
      const hipMid = { x: BODY.x - 0.02, y: 0.92, z: BODY.z };
      const hipF = { x: hipMid.x + hside.x * 0.13, y: hipMid.y, z: hipMid.z + hside.z * 0.13 };
      const hipB = { x: hipMid.x - hside.x * 0.13, y: hipMid.y, z: hipMid.z - hside.z * 0.13 };
      // The bat.
      const a = pose.a * RAD, b = pose.tilt * RAD;
      const d = { x: Math.cos(b) * Math.cos(a), y: Math.sin(b), z: Math.cos(b) * Math.sin(a) };
      let grip = { x: mid.x + pose.hand.x, y: mid.y + pose.hand.y, z: mid.z + pose.hand.z };
      const top = () => ({ x: grip.x + d.x * 0.1, y: grip.y + d.y * 0.1, z: grip.z + d.z * 0.1 });
      // Keep each hand within its arm's reach (the left arm holds the bottom
      // of the handle, the right arm the hand above it).
      const reach = 2 * ARM * 0.97;
      for (let i = 0; i < 4; i++) {
        for (const [sh, hand] of [[front, () => grip], [back, top]]) {
          const h = hand();
          const vx = h.x - sh.x, vy = h.y - sh.y, vz = h.z - sh.z, len = Math.hypot(vx, vy, vz);
          if (len > reach) {
            const k = reach / len;
            grip = { x: grip.x - vx * (1 - k), y: grip.y - vy * (1 - k), z: grip.z - vz * (1 - k) };
          }
        }
      }
      const topHand = top();
      const elbow = (sh, h, out) => {
        const vx = h.x - sh.x, vy = h.y - sh.y, vz = h.z - sh.z;
        const len = Math.max(1e-6, Math.hypot(vx, vy, vz));
        const half = Math.min(len / 2, ARM);
        const bend = Math.sqrt(Math.max(0, ARM * ARM - half * half));
        // Elbows bend down and out from the body.
        let px = out.x, py = -1, pz = out.z;
        const dot = (px * vx + py * vy + pz * vz) / (len * len);
        px -= vx * dot; py -= vy * dot; pz -= vz * dot;
        const pl = Math.hypot(px, py, pz) || 1;
        return { x: sh.x + vx / 2 + (px / pl) * bend, y: sh.y + vy / 2 + (py / pl) * bend, z: sh.z + vz / 2 + (pz / pl) * bend };
      };
      return {
        mid, front, back, hipF, hipB, grip, topHand, d,
        elbowF: elbow(front, grip, { x: side.x * 0.6, z: side.z * 0.6 }),
        elbowB: elbow(back, topHand, { x: -side.x * 0.8, z: -side.z * 0.8 }),
        tip: { x: grip.x + d.x * BAT_L, y: grip.y + d.y * BAT_L, z: grip.z + d.z * BAT_L },
        head: { x: mid.x + 0.04 + 0.04 * Math.sin(turn), y: SHOULDER_Y + 0.33, z: mid.z + 0.03 },
      };
    }
    // For tests: the batter's rig at `u` seconds into a swing at `aim`.
    function rigAt(u, aim) {
      return batterRig((u != null && swingPose({ aim, from: LOADED }, u)) || STANCE);
    }

    // A swoosh behind the barrel through the swing, so the arc reads even
    // where the bat points straight out at the pitcher.
    function drawSwoosh() {
      if (!swing) return;
      const u = now - swing.at;
      if (u < SWING_IN * 0.5 || u > SWING_OUT + 0.1) return;
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const uk = Math.min(u, SWING_OUT) - k * 0.016;
        if (uk < 0) break;
        const rig = batterRig(swingPose(swing, uk));
        const at = f => project(cam, rig.grip.x + rig.d.x * BAT_L * f, rig.grip.y + rig.d.y * BAT_L * f, rig.grip.z + rig.d.z * BAT_L * f);
        pts.push([at(1.05), at(0.45)]);
      }
      if (pts.length < 2) return;
      const fade = clamp(1 - (u - SWING_OUT) / 0.1, 0, 1);
      for (let i = 0; i < pts.length - 1; i++) {
        ctx.globalAlpha = 0.42 * fade * (1 - i / pts.length);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(pts[i][0].x, pts[i][0].y);
        ctx.lineTo(pts[i + 1][0].x, pts[i + 1][0].y);
        ctx.lineTo(pts[i + 1][1].x, pts[i + 1][1].y);
        ctx.lineTo(pts[i][1].x, pts[i][1].y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // The slugger: a cartoon body in the player's colour, with their live face
    // as the head.
    function drawBatter() {
      const me = api.me;
      const col = me.color || '#ff5fa2';
      const P = v => project(cam, v.x, v.y, v.z);
      const load = loadNow();
      const rig = batterRig(poseNow());
      const sMid = P(rig.mid), s = sMid.s;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Feet: a stride towards the pitcher as he loads and swings.
      const stride = swing ? 1 : load;
      const lift = swing ? 0 : Math.sin(Math.PI * clamp(load * 1.4 - 0.2, 0, 1)) * 0.12;
      const footB = P({ x: BODY.x - 0.08, y: 0, z: -0.36 });
      const footF = P({ x: BODY.x - 0.02, y: lift, z: 0.3 + 0.12 * stride });
      const kneeB = P({ x: BODY.x - 0.02, y: 0.48, z: -0.25 });
      const kneeF = P({ x: BODY.x + 0.06, y: 0.5 + lift * 0.5, z: 0.2 + 0.08 * stride });
      const hipF = P(rig.hipF), hipB = P(rig.hipB);
      // Shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse((footF.x + footB.x) / 2, (footF.y + footB.y) / 2, s * 0.5, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Legs, outlined so they read against the dirt.
      const limb = (pts, width, color) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = 'rgba(20,16,40,0.85)';
        ctx.lineWidth = width + Math.max(2, s * 0.025);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
      };
      limb([hipB, kneeB, footB], s * 0.17, '#eef0f6');
      limb([hipF, kneeF, footF], s * 0.17, '#eef0f6');
      ctx.fillStyle = '#222';
      for (const f of [footB, footF]) {
        ctx.beginPath();
        ctx.ellipse(f.x + s * 0.05, f.y, s * 0.13, s * 0.065, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The jersey: a trapezoid from the hips to the shoulders, never thinner
      // than a cartoon body even when he turns side-on.
      const shF = P(rig.front), shB = P(rig.back);
      const hipC = { x: (hipF.x + hipB.x) / 2, y: (hipF.y + hipB.y) / 2 };
      const half = Math.max(s * 0.22, Math.abs(shF.x - shB.x) / 2 + s * 0.08);
      const hipHalf = half * 0.8;
      ctx.fillStyle = col;
      ctx.strokeStyle = 'rgba(20,16,40,0.85)';
      ctx.lineWidth = Math.max(2, s * 0.025);
      ctx.beginPath();
      ctx.moveTo(hipC.x - hipHalf, hipC.y + s * 0.05);
      ctx.lineTo(sMid.x - half, sMid.y + s * 0.04);
      ctx.quadraticCurveTo(sMid.x, sMid.y - s * 0.1, sMid.x + half, sMid.y + s * 0.04);
      ctx.lineTo(hipC.x + hipHalf, hipC.y + s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(hipC.x - hipHalf, hipC.y - s * 0.01, hipHalf * 2, s * 0.06);
      ctx.font = `900 ${s * 0.22}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('7', (hipC.x + sMid.x) / 2, (hipC.y + sMid.y) / 2 + s * 0.02);
      // Arms: sleeves in his colour, then forearms, to gloved hands on the bat.
      const sleeve = s * 0.11, fore = s * 0.085;
      const grip = P(rig.grip), topH = P(rig.topHand), tip = P(rig.tip);
      const eF = P(rig.elbowF), eB = P(rig.elbowB);
      const shoulderPt = sh => ({ x: sMid.x + clamp(sh.x - sMid.x, -half * 0.8, half * 0.8), y: sh.y + s * 0.05 });
      const sF = shoulderPt(shF), sB = shoulderPt(shB);
      const arm = (sh, el, hand) => {
        limb([sh, el], sleeve, col);
        limb([el, hand], fore, '#f2c9a0');
      };
      const head = P(rig.head);
      // The bat goes behind his head when it points back past him.
      const batBehind = (rig.grip.z + rig.tip.z) / 2 > rig.head.z + 0.05;
      drawSwoosh();
      arm(sF, eF, grip);
      if (batBehind) drawBat(grip, tip, s);
      drawHead(head, col, me);
      if (!batBehind) drawBat(grip, tip, s);
      arm(sB, eB, topH);
      ctx.fillStyle = '#fbfbfb';
      ctx.strokeStyle = 'rgba(20,16,40,0.85)';
      ctx.lineWidth = Math.max(1.5, s * 0.015);
      for (const hnd of [grip, topH]) {
        ctx.beginPath();
        ctx.arc(hnd.x, hnd.y, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // The live face in a batting helmet.
    function drawHead(head, col, me) {
      const r = head.s * 0.22;
      ctx.save();
      ctx.beginPath();
      ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.clip();
      let drew = false;
      const media = api.mediaOf(me.id);
      const sw = media?.videoWidth || media?.width || 0, shh = media?.videoHeight || media?.height || 0;
      if (sw && shh && (media.readyState === undefined || media.readyState >= 2)) {
        const k = Math.max((r * 2) / sw, (r * 2) / shh) * 1.15;
        try {
          ctx.drawImage(media, head.x - (sw * k) / 2, head.y - (shh * k) / 2 + r * 0.12, sw * k, shh * k);
          drew = true;
        } catch { /* not ready yet */ }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((me.name?.[0] || '?').toUpperCase(), head.x, head.y + r * 0.1);
      }
      ctx.restore();
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
      ctx.stroke();
      // Helmet: a shell over the top with a brim and an ear flap.
      ctx.fillStyle = '#1b2a5c';
      ctx.beginPath();
      ctx.arc(head.x, head.y, r * 1.08, Math.PI * 1.08, Math.PI * 1.92);
      ctx.quadraticCurveTo(head.x, head.y - r * 0.45, head.x - r * 1.05, head.y - r * 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(head.x + r * 0.75, head.y - r * 0.5, r * 0.55, r * 0.13, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(head.x - r * 0.95, head.y - r * 0.05, r * 0.2, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(head.x - r * 0.3, head.y - r * 0.82, r * 0.3, r * 0.08, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBat(a, b, s) {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const art = api.img('baseball-bat');
      // The handle sticks out a little below the hands.
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const start = { x: a.x - Math.cos(ang) * s * 0.08, y: a.y - Math.sin(ang) * s * 0.08 };
      const L = len + s * 0.08;
      if (art) {
        const thick = Math.max(4, s * 0.86 * (art.height / art.width) * 1.0);
        ctx.save();
        ctx.translate(start.x, start.y);
        ctx.rotate(ang);
        ctx.drawImage(art, 0, -thick / 2, Math.max(L, thick), thick);
        ctx.restore();
        return;
      }
      // Stand-in: a tapered wooden bat; it narrows when seen end-on.
      const thin = Math.max(1.5, s * 0.035), fat = Math.max(3, s * 0.07);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const end = { x: start.x + Math.cos(ang) * L, y: start.y + Math.sin(ang) * L };
      const mid = { x: start.x + Math.cos(ang) * L * 0.45, y: start.y + Math.sin(ang) * L * 0.45 };
      const g = ctx.createLinearGradient(start.x + nx * fat, start.y + ny * fat, start.x - nx * fat, start.y - ny * fat);
      g.addColorStop(0, '#f2c27a');
      g.addColorStop(0.5, '#d9963f');
      g.addColorStop(1, '#a8682a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(start.x + nx * thin, start.y + ny * thin);
      ctx.lineTo(mid.x + nx * thin * 1.1, mid.y + ny * thin * 1.1);
      ctx.lineTo(end.x + nx * fat, end.y + ny * fat);
      ctx.arc(end.x, end.y, fat, ang + Math.PI / 2, ang - Math.PI / 2, true);
      ctx.lineTo(mid.x - nx * thin * 1.1, mid.y - ny * thin * 1.1);
      ctx.lineTo(start.x - nx * thin, start.y - ny * thin);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = thin * 2;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(start.x + Math.cos(ang) * L * 0.22, start.y + Math.sin(ang) * L * 0.22);
      ctx.stroke();
      ctx.lineCap = 'round';
    }

    const outlined = (text, x, y, size, color, align = 'center', weight = 900) => {
      ctx.font = `${weight} ${size}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };

    function drawFace(id, x, y, r, color, name) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.clip();
      const media = api.mediaOf(id);
      const sw = media?.videoWidth || media?.width || 0, sh = media?.videoHeight || media?.height || 0;
      let drew = false;
      if (sw && sh && (media.readyState === undefined || media.readyState >= 2)) {
        const k = Math.max((r * 2) / sw, (r * 2) / sh);
        try { ctx.drawImage(media, x - (sw * k) / 2, y - (sh * k) / 2, sw * k, sh * k); drew = true; } catch { /* not ready */ }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((name?.[0] || '?').toUpperCase(), x, y + 1);
      }
      ctx.restore();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // The scoreboard: me first, then friends, each with their face.
    function drawScoreboard() {
      const rows = api.players();
      const x = 10, y = inset.top + 8, rowH = 26;
      const width = Math.min(w - 20, 300);
      const hgt = 8 + rows.length * rowH;
      ctx.fillStyle = 'rgba(20,14,40,0.72)';
      ctx.beginPath();
      ctx.roundRect(x, y, width, hgt, 12);
      ctx.fill();
      ctx.textBaseline = 'middle';
      rows.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0));
      rows.forEach((p, i) => {
        const s = readState(p);
        const cy = y + 4 + rowH * i + rowH / 2;
        drawFace(p.id, x + 16, cy, 10, p.color || '#fff', p.name);
        ctx.font = `900 13px ui-rounded, system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = p.color || '#fff';
        const name = p.me ? 'You' : String(p.name || '').slice(0, 10);
        ctx.fillText(name, x + 32, cy);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        const line = `${s.hr} HR${s.long ? ` · ${s.long} ft` : ''} · ${s.n < PITCHES ? `${s.n}/${PITCHES}` : 'done'}`;
        ctx.fillText(line, x + width - 10, cy);
      });
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      background();

      // Friends' hits, far ones first, with trails and their names.
      for (const g of ghosts) {
        const b = g.ball;
        g.trail.push([b.x, b.y, b.z]);
        if (g.trail.length > 18) g.trail.shift();
        drawTrail(g.trail, g.color, 0.5);
        const d = drawBall(b, 0.55, g.color, b.spin);
        if (d) outlined(g.name, d.p.x, d.p.y - d.r - 8, 12, g.color);
      }
      // My hit: a trail behind it and a distance counter.
      if (fly) {
        trail.push([fly.x, fly.y, fly.z]);
        if (trail.length > 26) trail.shift();
        drawTrail(trail, '#fff', 0.8);
        const d = drawBall(fly, 1, null, fly.spin);
        if (d && d.r < 6 && !fly.done) {
          // Far away it is a speck: ring it so the eye can follow it.
          ctx.strokeStyle = 'rgba(255,212,59,0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(d.p.x, d.p.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      drawPitcher();

      // The pitch: behind the batter until it passes the plate.
      const b = ballNow();
      const showPitch = b && !fly;
      if (showPitch && b.z > 0.2) drawPitch(b);
      // The strike zone, faintly, while a pitch is coming.
      if (phase === 'windup' || phase === 'pitch') {
        const tl = project(cam, ZONE.x0, ZONE.y1, 0), br = project(cam, ZONE.x1, ZONE.y0, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        ctx.setLineDash([]);
      }
      drawBatter();
      if (showPitch && b.z <= 0.2) drawPitch(b);

      // Keyboard / controller aim and mouse cursor.
      if (pciShown && phase !== 'over') {
        const p = project(cam, pci.x, pci.y, 0);
        ctx.strokeStyle = 'rgba(255,212,59,0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.s * 0.1, p.s * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (hover && phase !== 'over') {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hover.x, hover.y, 12, 0, Math.PI * 2);
        ctx.moveTo(hover.x - 18, hover.y);
        ctx.lineTo(hover.x + 18, hover.y);
        ctx.stroke();
      }
      for (const t of taps) {
        ctx.globalAlpha = 1 - t.t / 0.35;
        ctx.strokeStyle = '#ffd43b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 10 + t.t * 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Fireworks.
      ctx.globalCompositeOperation = 'lighter';
      for (const s of sparks) {
        ctx.globalAlpha = clamp(s.life, 0, 1);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      drawScoreboard();
      const midY = bannerY() - 50;

      // The pitch's name and speed as it comes in.
      if (pitch && (phase === 'pitch' || phase === 'result')) {
        const age = now - releaseAt;
        if (age < 2) {
          ctx.globalAlpha = clamp(2 - age, 0, 1);
          outlined(`${TYPES[pitch.type].name} · ${pitch.mph} mph`, w - 12, midY - 14, 14, '#fff', 'right', 800);
          ctx.globalAlpha = 1;
        }
      }
      outlined(`Pitch ${Math.min(PITCHES, round.n + (phase === 'over' ? 0 : 1))} of ${PITCHES}`, 12, midY - 14, 14, '#fff', 'left', 800);

      // The result.
      if (result && result.shown && phase !== 'over') {
        const age = now - (result.flyDone ?? result.at);
        const label = LABELS[result.kind];
        const big = result.kind === 'hr';
        const pop = 1 + Math.max(0, 0.3 - (now - result.at) * 0.6);
        const size = (big ? Math.min(54, w * 0.12) : 30) * (big ? pop : 1);
        const y = midY + 50;
        outlined(label, w / 2, y, size, big ? '#ffd43b' : result.kind === 'miss' ? '#ff8787' : '#fff');
        if (['hr', 'fly', 'wall', 'liner'].includes(result.kind)) {
          outlined(`${Math.round(result.dist * FT)} ft`, w / 2, y + 34, 24, '#fff');
        }
        void age;
      } else if (fly && !fly.done && phase === 'result') {
        const d = Math.hypot(fly.x, fly.z);
        outlined(`${Math.round(d * FT)} ft`, w / 2, midY + 50, 28, '#fff');
      }

      for (const f of floaters) {
        if (f.firework) continue;
        ctx.globalAlpha = clamp(1.6 - f.t, 0, 1);
        outlined(f.text, w / 2, midY + 100 - f.t * 30 + (f.small ? 30 : 0), f.small ? 15 : 20, f.color);
        ctx.globalAlpha = 1;
      }

      if (round.r === 1 && round.n < 2 && ['ready', 'windup', 'pitch'].includes(phase) && !swing) {
        const y = h - inset.bottom - 22;
        outlined('Tap the ball as it reaches the plate', w / 2, y - 18, 17, '#fff');
        outlined('or aim with the arrows / stick, swing with Space / A', w / 2, y, 12, '#fff', 'center', 800);
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

    let padDown = false;
    return {
      // A test bot's move (js/rookie.js): when a pitch is coming, plan a
      // swing near the right moment and near the ball; start the next round
      // when this one is over.
      rookie() {
        if (phase === 'over') { newRound(); return; }
        if ((phase === 'windup' || phase === 'pitch') && !plan && !swung) {
          const T = pitch.T;
          plan = { at: T + (Math.random() - 0.5) * 0.3, dx: (Math.random() - 0.5) * 0.4, dy: (Math.random() - 0.5) * 0.5 };
        }
      },
      // For tests.
      _view() {
        const b = ballNow();
        const bp = b ? project(cam, b.x, b.y, b.z) : null;
        return {
          phase, n: round.n, r: round.r, hr: round.hr, long: round.long,
          sinceRelease: phase === 'pitch' ? now - releaseAt : null,
          T: pitch?.T ?? null,
          ball: bp ? { x: bp.x, y: bp.y, z: b.z } : null,
          result: result ? { kind: result.kind, dist: result.dist } : null,
          lastHit, ghosts: ghosts.length, record: { ...record },
        };
      },
      // For tests: the batter's rig (world points) `u` seconds into a swing
      // at `aim` (u null: the stance), and the pitch's drawn radius on screen.
      _rig: rigAt,
      _ballRadius() {
        const b = ballNow();
        return b ? ballRadius(project(cam, b.x, b.y, b.z)) : null;
      },
      // For tests: where the pitch will be in `ahead` seconds, on screen.
      _ahead(ahead) {
        if (phase !== 'pitch') return null;
        const b = pitchPos(pitch, now - releaseAt + ahead);
        const p = project(cam, b.x, b.y, b.z);
        return { x: p.x, y: p.y, t: now - releaseAt + ahead, T: pitch.T };
      },
      onChange() {
        if (phase === 'over') fillTable();
      },
      onPad(pad) {
        pci.x = clamp(pci.x + pad.x * 0.016 * 0.9, ZONE.x0 - 0.3, ZONE.x1 + 0.3);
        pci.y = clamp(pci.y - pad.y * 0.016 * 0.9, ZONE.y0 - 0.3, ZONE.y1 + 0.3);
        if (Math.abs(pad.x) > 0.2 || Math.abs(pad.y) > 0.2) pciShown = true;
        const down = !!(pad.a || pad.pressed?.[0]);
        if (down && !padDown) {
          if (phase === 'over') newRound();
          else {
            pciShown = true;
            doSwing(pci, 0.6);
          }
        }
        padDown = down;
      },
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        offHit?.();
      },
    };
  },
};

// Exposed for tests.
export const _physics = { makePitch, pitchPos, contact, launchVelocity, newFly, stepFly, outcome, fenceDist, TIMING, REACH_Y, PITCHES, FOUL, FENCE_H };

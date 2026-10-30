// Technique: a volume-conserving 2D soft body for an amoeboid cell (from the
// amoeba prototype). A closed ring of N membrane nodes crawling on a
// substrate, overdamped (low Reynolds number: displacement is proportional to
// force, nothing coasts). Each step:
//   1. cortical tension (curvature flow) and tangential spacing,
//   2. protrusion pressure at each pseudopod's tip window (player or idle),
//   3. obstacles (capsules, circles) and self-contact,
//   4. an area projection that conserves the body (2D stand-in for volume).
// Because the area is fixed, whatever a pseudopod gains is taken back
// elsewhere, weighted to the rear (the uroid), which is how the cell crawls.
//
// Interface (no three.js needed; units are whatever your world uses, tuned for µm):
//   import { Body, P, N } from '../shared/techniques/amoeba-softbody.js';
//   const body = new Body(rand, x0, y0);  // rand(): [0,1) with .range(a,b)
//   body.step(dt, { pods: [{m, dx, dy}, {m, dx, dy}], push, spread },
//                 { capsules: [{ax,ay,bx,by,r}], circles: [{x,y,r}] });
//   body.x / body.y (Float64Array ring, counter-clockwise), body.pods[k].x/.y/.s (tips),
//   body.cx/.cy (centroid), body.ux/.uy (uroid), body.grid (signed distance grid, see
//   amoeba-sdfgrid.js: call body.grid.build(body.x, body.y, N) after stepping),
//   body.cupAround(px, py, reach) / cupContains / seal(cup): food-cup detection and closure,
//   body.collideCircle(cx, cy, r, share, out), body.blast(x, y, radius, amount).
//   body.opts: { area, rearWeight, selfContact, idlePods } switches (all true by default).
import { SdfGrid } from './amoeba-sdfgrid.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function wrapAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function segDist2(px, py, ax, ay, bx, by, out) {
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
  const t = clamp(l2 > 1e-9 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0, 0, 1);
  const cx = ax + ex * t, cy = ay + ey * t;
  if (out) { out.t = t; out.x = cx; out.y = cy; }
  return (px - cx) ** 2 + (py - cy) ** 2;
}
function pointInPolygon(px, py, xs, ys, n) {
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    if ((ys[i] > py) !== (ys[j] > py) && px < ((xs[j] - xs[i]) * (py - ys[i])) / (ys[j] - ys[i]) + xs[i]) inside = !inside;
  }
  return inside;
}
function polygonArea(xs, ys, n) {
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) a += xs[j] * ys[i] - xs[i] * ys[j];
  return a * 0.5;
}

export const N = 160;
export const P = {
  R0: 172, // µm, radius of the disc with the starting area (≈ 9.3e4 µm²)
  vPro: 30, // µm/s (game time) pseudopod advance at full stick
  vBoost: 16, // extra with RT
  sigma: 3.0, // tip window, in nodes
  win: 8,
  capR: 30, // µm, half-width of a pseudopod's advancing cap
  kN: 4, // 1/s, cortical tension (normal part of the Laplacian)
  kT: 26, // 1/s, tangential spacing
  dMin: 9, // µm, self-contact
  vClose: 15, // µm/s, rims closing over prey
  vRetract: 9, // µm/s, a released pseudopod drawn back
  vRear: 22, // µm/s, uroid contraction at full drive
};

export class Pod {
  constructor(id, idle = false) {
    this.id = id; this.idle = idle;
    this.active = false; this.tip = 0;
    this.dx = 1; this.dy = 0;
    this.s = 0; this.target = 0;
    this.ret = 0; this.life = 0;
    this.x = 0; this.y = 0;
  }
}

export class Body {
  constructor(rand, x0 = 0, y0 = 0) {
    this.rand = rand;
    const f = () => new Float64Array(N);
    this.x = f(); this.y = f(); this.nx = f(); this.ny = f();
    this.ddx = f(); this.ddy = f(); this.G = f(); this.w = f(); this.len = f();
    this.noSelf = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      this.x[i] = x0 + P.R0 * Math.cos(a);
      this.y[i] = y0 + P.R0 * Math.sin(a);
    }
    this.A0 = Math.PI * P.R0 * P.R0;
    this.Abase = this.A0;
    this.flat = 1; // thickness scale; spreading flattens the cell, so its footprint grows
    this.pods = [new Pod(0), new Pod(1), new Pod(2, true), new Pod(3, true), new Pod(4, true), new Pod(5, true)];
    this.pods.forEach((p, k) => { if (p.idle) p.life = k - 1.5; }); // stagger the idle pseudopods
    this.cx = x0; this.cy = y0;
    this.fx = 0; this.fy = 1; this.fm = 0; // front direction and its strength
    this.ux = x0; this.uy = y0 - P.R0; // uroid
    this.closing = null; // { i0, i1, mx, my, px, py }
    this.zip = null;
    this.grid = new SdfGrid(128);
    this.spread = 0;
    this.time = 0;
    this.contact = 0; // how much of the membrane pushed against something this step
    this.opts = { area: true, rearWeight: true, selfContact: true, idlePods: true };
  }

  get area() { return polygonArea(this.x, this.y, N); }
  get req() { return Math.sqrt(this.A0 / Math.PI); }

  centroid() {
    let a = 0, cx = 0, cy = 0;
    const x = this.x, y = this.y;
    for (let i = 0, j = N - 1; i < N; j = i++) {
      const c = x[j] * y[i] - x[i] * y[j];
      a += c; cx += (x[j] + x[i]) * c; cy += (y[j] + y[i]) * c;
    }
    a *= 0.5;
    this.cx = cx / (6 * a); this.cy = cy / (6 * a);
  }

  normals() {
    const x = this.x, y = this.y;
    for (let i = 0; i < N; i++) {
      const a = (i + N - 1) % N, b = (i + 1) % N;
      const tx = x[b] - x[a], ty = y[b] - y[a];
      const m = Math.hypot(tx, ty) || 1;
      this.nx[i] = ty / m; this.ny[i] = -tx / m; // outward for a counter-clockwise ring
      this.len[i] = 0.5 * (Math.hypot(x[i] - x[a], y[i] - y[a]) + Math.hypot(x[b] - x[i], y[b] - y[i]));
    }
  }

  /** The membrane node furthest out along (dx, dy), kept away from another pod's tip. */
  pickTip(dx, dy, avoid = -1) {
    let best = 0, bv = -Infinity;
    const others = avoid >= 0 ? [avoid] : this.pods.filter((p) => p.s > 0.1).map((p) => p.tip);
    for (let i = 0; i < N; i++) {
      let v = (this.x[i] - this.cx) * dx + (this.y[i] - this.cy) * dy;
      for (const a of others) {
        const r = Math.min((i - a + N) % N, (a - i + N) % N);
        if (r < N / 9) v -= 400;
      }
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  }

  /**
   * input: { pods: [{m, dx, dy}, {m, dx, dy}], push: 0..1, spread: 0..1 }
   * world: { capsules: [{ax, ay, bx, by, r}], circles: [{x, y, r}] }
   */
  step(dt, input, world) {
    this.time += dt;
    this.centroid();
    this.normals();
    this.spread += ((input.spread || 0) - this.spread) * Math.min(1, dt * 1.2);
    this.flat = 1 - 0.26 * this.spread;
    const x = this.x, y = this.y, nx = this.nx, ny = this.ny;
    const ddx = this.ddx, ddy = this.ddy, G = this.G;
    ddx.fill(0); ddy.fill(0); G.fill(0);

    // -- pseudopod controls ---------------------------------------------------
    const pl = this.pods;
    for (let k = 0; k < 2; k++) {
      const pod = pl[k], st = input.pods[k];
      if (st && st.m > 0.06) {
        if (!pod.active) {
          pod.active = true;
          pod.tip = this.pickTip(st.dx, st.dy, pl[1 - k].active ? pl[1 - k].tip : -1);
          pod.ret = 0;
        }
        pod.dx = st.dx; pod.dy = st.dy;
        pod.target = st.m * (1 - 0.7 * this.spread);
      } else if (pod.active) {
        pod.active = false;
        pod.target = 0;
        pod.ret = 1;
      }
    }
    const playing = pl[0].s + pl[1].s;
    for (let k = 2; k < pl.length; k++) {
      const pod = pl[k];
      pod.life -= dt;
      if (pod.life <= 0) {
        const a = this.rand() * TAU;
        pod.dx = Math.cos(a); pod.dy = Math.sin(a);
        pod.tip = this.pickTip(pod.dx, pod.dy);
        pod.life = this.rand.range(8, 16);
        pod.base = this.rand.range(0.45, 0.9);
        pod.rad = this.rand.range(22, 34);
        pod.active = true;
      }
      // A resting Amoeba proteus is polypodial: a few pseudopods probe at once.
      const fade = Math.min(1, pod.life / 2.5);
      pod.target = (this.opts.idlePods ? 1 : 0) * (pod.base || 0) * fade * (playing > 0.15 ? 0.25 : 1) * (1 - this.spread);
      if (pod.life < 2.5 && pod.ret === 0) pod.ret = 0.4;
    }

    // -- tension and spacing ---------------------------------------------------
    const kN = P.kN * (1 + 2.2 * this.spread), kT = P.kT;
    for (let i = 0; i < N; i++) {
      const a = (i + N - 1) % N, b = (i + 1) % N;
      const mx = 0.5 * (x[a] + x[b]) - x[i], my = 0.5 * (y[a] + y[b]) - y[i];
      const dn = mx * nx[i] + my * ny[i];
      const tx = mx - dn * nx[i], ty = my - dn * ny[i];
      ddx[i] += (kN * dn * nx[i] + kT * tx) * dt;
      ddy[i] += (kN * dn * ny[i] + kT * ty) * dt;
    }

    // -- protrusion -------------------------------------------------------------
    const req = this.req;
    let fx = 0, fy = 0;
    for (const pod of pl) {
      pod.s += (pod.target - pod.s) * Math.min(1, dt * (pod.target > pod.s ? 2.2 : 1.4));
      if (pod.s > 0.01) {
        // Follow the local extreme of the boundary along the aimed direction, so
        // turning the stick bends the pseudopod instead of starting a new one.
        let best = pod.tip, bv = -Infinity;
        for (let r = -4; r <= 4; r++) {
          const j = (pod.tip + r + N) % N;
          const v = x[j] * pod.dx + y[j] * pod.dy - Math.abs(r) * 0.6;
          if (v > bv) { bv = v; best = j; }
        }
        pod.tip = best;
        const reach = (x[best] - this.cx) * pod.dx + (y[best] - this.cy) * pod.dy;
        const lim = clamp(1 - (reach - (req * 1.2 + 140)) / 90, 0, 1);
        const v = (P.vPro + (pod.idle ? 0 : P.vBoost * (input.push || 0))) * pod.s * lim * (pod.idle ? 0.7 : 1);
        // A blunt cap of fixed width: membrane within the cap radius of the tip,
        // facing the aimed direction, advances (flat-topped, so the pseudopod
        // stays a roughly constant-width cylinder, as in A. proteus).
        const R = pod.rad || P.capR;
        const tx = x[pod.tip], ty = y[pod.tip];
        for (let j = 0; j < N; j++) {
          const ex = x[j] - tx, ey = y[j] - ty;
          const d2 = ex * ex + ey * ey;
          if (d2 > 4 * R * R) continue;
          const f = 1 - smooth(R * 0.9, R * 1.9, Math.sqrt(d2));
          const face = smooth(-0.35, 0.35, nx[j] * pod.dx + ny[j] * pod.dy);
          const g = f * face;
          if (g <= 0) continue;
          const dxj = pod.dx + 0.12 * nx[j], dyj = pod.dy + 0.12 * ny[j];
          const m = Math.hypot(dxj, dyj) || 1;
          ddx[j] += (dxj / m) * v * g * dt;
          ddy[j] += (dyj / m) * v * g * dt;
          G[j] += pod.s * g;
        }
        fx += pod.dx * pod.s * (pod.idle ? 0.4 : 1);
        fy += pod.dy * pod.s * (pod.idle ? 0.4 : 1);
      }
      if (pod.ret > 0 && pod.s < 0.3) {
        // A released pseudopod flows slowly back into the body.
        pod.ret = Math.max(0, pod.ret - dt / 7);
        const v = P.vRetract * pod.ret;
        for (let r = -P.win; r <= P.win; r++) {
          const j = (pod.tip + r + N) % N;
          const g = Math.exp(-((r / (P.sigma * 1.3)) ** 2));
          const ex = this.cx - x[j], ey = this.cy - y[j];
          const m = Math.hypot(ex, ey) || 1;
          ddx[j] += (ex / m) * v * g * dt;
          ddy[j] += (ey / m) * v * g * dt;
        }
      }
      pod.x = x[pod.tip]; pod.y = y[pod.tip];
    }
    const fm = Math.hypot(fx, fy);
    if (fm > 0.05) {
      this.fx += (fx / fm - this.fx) * Math.min(1, dt * 1.5);
      this.fy += (fy / fm - this.fy) * Math.min(1, dt * 1.5);
    }
    this.fm = fm;

    // The rear cortex contracts while the cell protrudes, squeezing endoplasm
    // forward (posterior contraction); the area projection sends it to the tips.
    if (fm > 0.05 && this.opts.rearWeight) {
      const ux = fx / fm, uy = fy / fm, k = P.vRear * Math.min(1, fm);
      for (let i = 0; i < N; i++) {
        const rear = Math.max(0, -(nx[i] * ux + ny[i] * uy));
        const v = k * rear * rear * (1 - Math.min(1, G[i]));
        ddx[i] -= nx[i] * v * dt; ddy[i] -= ny[i] * v * dt;
      }
    }

    // -- closing a food cup ----------------------------------------------------
    if (this.closing) {
      const c = this.closing;
      for (const end of [c.i0, c.i1]) {
        for (let r = -6; r <= 6; r++) {
          const j = (end + r + N) % N;
          const g = Math.exp(-(r / 3) * (r / 3));
          const ex = c.mx - x[j], ey = c.my - y[j];
          const m = Math.hypot(ex, ey);
          if (m < 0.5) continue;
          const v = Math.min(P.vClose, m * 2);
          ddx[j] += (ex / m) * v * g * dt;
          ddy[j] += (ey / m) * v * g * dt;
          G[j] += g;
        }
      }
      // The cup lining hugs the prey a little.
      for (const j of c.run) {
        const ex = c.px - x[j], ey = c.py - y[j];
        const m = Math.hypot(ex, ey) || 1;
        ddx[j] += (ex / m) * 3 * dt; ddy[j] += (ey / m) * 3 * dt;
        G[j] += 0.5;
      }
    }
    if (this.zip) {
      const z = this.zip;
      z.t += dt;
      for (let k = 0; k < z.nodes.length; k++) {
        const j = z.nodes[k];
        ddx[j] += (z.tx[k] - x[j]) * Math.min(1, dt * 5);
        ddy[j] += (z.ty[k] - y[j]) * Math.min(1, dt * 5);
        this.noSelf[j] = 1.2;
        G[j] += 1;
      }
    }

    for (let i = 0; i < N; i++) { x[i] += ddx[i]; y[i] += ddy[i]; }

    // -- obstacles and self-contact -------------------------------------------
    this.contact = 0;
    const o = {};
    for (const cap of world.capsules) {
      const r = cap.r + 2;
      for (let i = 0; i < N; i++) {
        const d2 = segDist2(x[i], y[i], cap.ax, cap.ay, cap.bx, cap.by, o);
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1e-3;
          x[i] = o.x + ((x[i] - o.x) / d) * r;
          y[i] = o.y + ((y[i] - o.y) / d) * r;
          this.contact++;
        }
      }
    }
    for (const c of world.circles) {
      const r = c.r + 2;
      for (let i = 0; i < N; i++) {
        const ex = x[i] - c.x, ey = y[i] - c.y;
        const d2 = ex * ex + ey * ey;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1e-3;
          x[i] = c.x + (ex / d) * r; y[i] = c.y + (ey / d) * r;
          this.contact++;
        }
      }
    }
    if (this.opts.selfContact) this.selfContact();

    // -- area (volume) projection ------------------------------------------------
    this.normals();
    let rx = 0, ry = 0;
    if (Math.hypot(this.fx, this.fy) > 0.1) { rx = this.fx; ry = this.fy; }
    const target = this.A0 / this.flat;
    for (let it = 0; it < (this.opts.area ? 2 : 0); it++) {
      const dA = target - polygonArea(x, y, N);
      let sum = 0;
      for (let i = 0; i < N; i++) {
        const g = Math.min(1, G[i]);
        let wi;
        if (dA < 0) {
          const rear = Math.max(0, -(nx[i] * rx + ny[i] * ry));
          wi = !this.opts.rearWeight ? 1 - 0.7 * g : 0.05 + (1 - g) * (0.35 + 1.6 * rear * rear) * (1 - 0.6 * this.spread) + 0.6 * this.spread;
        } else {
          wi = this.opts.rearWeight ? 0.03 + 1.5 * g + 0.8 * this.spread : 1 - 0.7 * g;
        }
        this.w[i] = wi;
        sum += wi * this.len[i];
      }
      const lam = dA / (sum || 1);
      for (let i = 0; i < N; i++) {
        x[i] += nx[i] * this.w[i] * lam;
        y[i] += ny[i] * this.w[i] * lam;
      }
      if (it === 0) this.normals();
    }

    for (let i = 0; i < N; i++) if (this.noSelf[i] > 0) this.noSelf[i] -= dt;
    if (this.zip && this.zip.t > 0.9) this.finishZip();

    // -- uroid: the most rearward point, smoothed ------------------------------
    this.centroid();
    if (this.fm > 0.05 || !this.uroidSet) {
      let best = 0, bv = Infinity;
      for (let i = 0; i < N; i++) {
        const v = (x[i] - this.cx) * this.fx + (y[i] - this.cy) * this.fy;
        if (v < bv) { bv = v; best = i; }
      }
      this.uroidSet = true;
      this.ui = best;
    } else {
      // keep the closest node to the previous uroid
      let best = 0, bv = Infinity;
      for (let i = 0; i < N; i++) {
        const d = (x[i] - this.ux) ** 2 + (y[i] - this.uy) ** 2;
        if (d < bv) { bv = d; best = i; }
      }
      this.ui = best;
    }
    this.ux += (x[this.ui] - this.ux) * Math.min(1, dt * 2);
    this.uy += (y[this.ui] - this.uy) * Math.min(1, dt * 2);
  }

  selfContact() {
    const x = this.x, y = this.y, d0 = P.dMin, d02 = d0 * d0;
    for (let i = 0; i < N; i++) {
      if (this.noSelf[i] > 0) continue;
      for (let j = i + 5; j < N; j++) {
        if (i + N - j < 5) continue;
        if (this.noSelf[j] > 0) continue;
        const ex = x[j] - x[i], ey = y[j] - y[i];
        const d2 = ex * ex + ey * ey;
        if (d2 < d02) {
          const d = Math.sqrt(d2) || 1e-3;
          const push = (d0 - d) * 0.5;
          x[i] -= (ex / d) * push; y[i] -= (ey / d) * push;
          x[j] += (ex / d) * push; y[j] += (ey / d) * push;
        }
      }
    }
  }

  /**
   * How well the membrane wraps a point (a prey cell): the longest run of
   * membrane within reach, and how far it winds around the point.
   */
  cupAround(px, py, reach) {
    const x = this.x, y = this.y, r2 = reach * reach;
    let start = -1;
    for (let i = 0; i < N; i++) {
      if ((x[i] - px) ** 2 + (y[i] - py) ** 2 >= r2) { start = i; break; }
    }
    if (start < 0) return null; // the whole ring is near: not a cup
    let best = null, run = [], wind = 0, prevA = 0;
    const flush = () => {
      if (run.length > 2 && (!best || Math.abs(wind) > Math.abs(best.wind))) best = { run: run.slice(), wind };
      run = []; wind = 0;
    };
    for (let k = 1; k <= N; k++) {
      const i = (start + k) % N;
      const near = (x[i] - px) ** 2 + (y[i] - py) ** 2 < r2;
      if (near) {
        const a = Math.atan2(y[i] - py, x[i] - px);
        if (run.length) wind += wrapAngle(a - prevA);
        prevA = a;
        run.push(i);
      } else if (run.length) flush();
    }
    if (run.length) flush();
    if (!best) return null;
    const i0 = best.run[0], i1 = best.run[best.run.length - 1];
    return {
      wrap: Math.abs(best.wind), run: best.run, i0, i1,
      gap: Math.hypot(x[i1] - x[i0], y[i1] - y[i0]),
      mx: 0.5 * (x[i0] + x[i1]), my: 0.5 * (y[i0] + y[i1]),
    };
  }

  /** Is the point inside the cup (its lining plus the chord across the mouth)? */
  cupContains(cup, px, py) {
    const n = cup.run.length;
    const xs = new Float64Array(n), ys = new Float64Array(n);
    for (let k = 0; k < n; k++) { xs[k] = this.x[cup.run[k]]; ys[k] = this.y[cup.run[k]]; }
    return { inside: pointInPolygon(px, py, xs, ys, n), area: Math.abs(polygonArea(xs, ys, n)) };
  }

  /** The rims have met: zip the lining shut across the mouth; the cup's water joins the cell. */
  seal(cup) {
    const { area } = this.cupContains(cup, 0, 0);
    const inner = cup.run.slice(1, -1);
    const ax = this.x[cup.i0], ay = this.y[cup.i0], bx = this.x[cup.i1], by = this.y[cup.i1];
    const tx = [], ty = [];
    for (let k = 0; k < inner.length; k++) {
      const t = (k + 1) / (inner.length + 1);
      tx.push(ax + (bx - ax) * t); ty.push(ay + (by - ay) * t);
    }
    this.zip = { nodes: inner, tx, ty, t: 0 };
    this.A0 += area;
    this.closing = null;
    return area;
  }

  finishZip() {
    this.zip = null;
    this.resample();
  }

  /** Redistribute the nodes evenly by arc length (after a seal crowds them together). */
  resample() {
    const x = this.x, y = this.y;
    const tips = this.pods.map((p) => [x[p.tip], y[p.tip]]);
    const ux = x[this.ui || 0], uy = y[this.ui || 0];
    const cum = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      cum[i + 1] = cum[i] + Math.hypot(x[j] - x[i], y[j] - y[i]);
    }
    const L = cum[N];
    const ox = Float64Array.from(x), oy = Float64Array.from(y);
    let seg = 0;
    for (let k = 0; k < N; k++) {
      const s = (k / N) * L;
      while (seg < N - 1 && cum[seg + 1] < s) seg++;
      const l = cum[seg + 1] - cum[seg] || 1;
      const t = (s - cum[seg]) / l;
      const j = (seg + 1) % N;
      x[k] = ox[seg] + (ox[j] - ox[seg]) * t;
      y[k] = oy[seg] + (oy[j] - oy[seg]) * t;
    }
    const nearest = (px, py) => {
      let b = 0, bv = Infinity;
      for (let i = 0; i < N; i++) { const d = (x[i] - px) ** 2 + (y[i] - py) ** 2; if (d < bv) { bv = d; b = i; } }
      return b;
    };
    this.pods.forEach((p, k) => { p.tip = nearest(tips[k][0], tips[k][1]); });
    this.ui = nearest(ux, uy);
    this.noSelf.fill(0.6);
  }

  /** Minimum distance from a point to the membrane nodes, and the nearest node. */
  nearest(px, py) {
    let b = 0, bv = Infinity;
    for (let i = 0; i < N; i++) {
      const d = (this.x[i] - px) ** 2 + (this.y[i] - py) ** 2;
      if (d < bv) { bv = d; b = i; }
    }
    return { i: b, d: Math.sqrt(bv) };
  }

  /** Push the membrane out of a circle (a prey cell), sharing the correction; returns the prey's push. */
  collideCircle(cx, cy, r, share, out) {
    const x = this.x, y = this.y;
    let px = 0, py = 0, hits = 0;
    const r2 = r * r;
    for (let i = 0; i < N; i++) {
      const ex = x[i] - cx, ey = y[i] - cy;
      const d2 = ex * ex + ey * ey;
      if (d2 < r2) {
        const d = Math.sqrt(d2) || 1e-3;
        const o = r - d;
        x[i] += (ex / d) * o * (1 - share); y[i] += (ey / d) * o * (1 - share);
        px -= (ex / d) * o * share; py -= (ey / d) * o * share;
        hits++;
      }
    }
    out.x = px; out.y = py; out.hits = hits;
    return out;
  }

  /** A trichocyst blast: membrane near the point is shoved away. */
  blast(cx, cy, radius, amount) {
    for (let i = 0; i < N; i++) {
      const ex = this.x[i] - cx, ey = this.y[i] - cy;
      const d = Math.hypot(ex, ey);
      if (d < radius && d > 1e-3) {
        const f = amount * (1 - d / radius);
        this.x[i] += (ex / d) * f; this.y[i] += (ey / d) * f;
      }
    }
  }
}

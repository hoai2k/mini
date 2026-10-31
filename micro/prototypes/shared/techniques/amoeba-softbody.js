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
//   body.opts: { area, rearWeight, selfContact, idlePods, adhesion, untangle, neck } switches
//   (all true by default), plus speed (1: pseudopod extension rate multiplier) and boost
//   (1: a transient extra multiplier, e.g. a dash, that also drives the rear contraction harder).
//   body.flowK: speed × boost, for anything that streams with the pseudopods.
// Optional, all backward compatible (leave them out for the original behaviour):
//   input.body: {m, dx, dy}: move the bulk of the cell that way (the rear contracts, the
//     front flows on, membrane already far out in front, a pseudopod, is left to be caught up
//     with); body.drive = {x, y, m} for anything that streams with it.
//   input.pods[k].tip: the membrane node a pseudopod starts from when it activates
//     (default pickTip()); body.branchTip(dx, dy, pod) picks one beside another pod.
//   body.podReach(pod): how far a pod's tip stands out beyond the body's radius.
//   The ring never crosses itself: self-contact keeps nodes off non-adjacent segments
//   (spatial hash), necks resist thinning (opts.neck), and step() ends with untangle(),
//   which undoes any move that made two segments cross (call it again after moving
//   nodes yourself); body.crossings() lists crossing segment pairs.
//   body.findCut(capsules) / body.pinchAt(i, j, keepX, keepY): a neck thinner than
//   P.pinchW cut by a capsule splits the ring; the piece holding (keepX, keepY) stays
//   the cell (resampled to N nodes, area target reset), the other is returned.
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

function cross3(ax, ay, bx, by, cx, cy) { return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); }
function segsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = cross3(ax, ay, bx, by, cx, cy), d2 = cross3(ax, ay, bx, by, dx, dy);
  if ((d1 > 0 && d2 > 0) || (d1 < 0 && d2 < 0) || d1 === d2) return false;
  const d3 = cross3(cx, cy, dx, dy, ax, ay), d4 = cross3(cx, cy, dx, dy, bx, by);
  return !((d3 > 0 && d4 > 0) || (d3 < 0 && d4 < 0) || d3 === d4);
}
function segSegDist(ax, ay, bx, by, cx, cy, dx, dy) {
  if (segsCross(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
  return Math.sqrt(Math.min(segDist2(ax, ay, cx, cy, dx, dy), segDist2(bx, by, cx, cy, dx, dy), segDist2(cx, cy, ax, ay, bx, by), segDist2(dx, dy, ax, ay, bx, by)));
}

export const N = 160;
const ringDist = (i, j) => { const d = Math.abs(i - j); return d < N - d ? d : N - d; };
export const P = {
  R0: 172, // µm, radius of the disc with the starting area (≈ 9.3e4 µm²)
  vPro: 44, // µm/s (game time) pseudopod speed parameter at full stick (≈ 30 µm/s net against tension)
  vBoost: 22, // extra with RT
  sigma: 3.0, // tip window, in nodes
  win: 8,
  capR: 30, // µm, half-width of a pseudopod's advancing cap
  kN: 4, // 1/s, cortical tension (normal part of the Laplacian)
  kT: 26, // 1/s, tangential spacing
  dMin: 9, // µm, self-contact
  vClose: 40, // µm/s, rims closing over prey
  vRetract: 9, // µm/s, a released pseudopod drawn back
  vRear: 22, // µm/s, uroid contraction at full drive
  vBody: 24, // µm/s, the body flowing after a held body stick (× speed)
  neckW: 26, // µm, a neck thinner than this pushes back (the cytoplasm resists thinning)
  pinchW: 12, // µm, a neck thinner than this can be cut through
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
    this.ddx = f(); this.ddy = f(); this.G = f(); this.Gp = f(); this.frozen = new Uint8Array(N); this.w = f(); this.len = f();
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
    this.opts = { area: true, rearWeight: true, selfContact: true, idlePods: true, adhesion: true, untangle: true, neck: true, speed: 1, boost: 1 };
    this.flowK = 1;
    this.drive = { x: 1, y: 0, m: 0 };
    // Crossing guard: the last ring known not to cross itself, and a segment hash.
    this.sx = f(); this.sy = f(); this.snapOK = false;
    this.hStart = new Int32Array(1); this.hItems = new Int32Array(N * 8);
    this.hBox = new Int32Array(N * 4);
    this._pairs = [];
    this.untangled = 0; // moves undone so far (for tests)
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
    if (this.opts.untangle) {
      // Remember this ring as the fallback if it is clean (it is, after untangle()).
      this.snapOK = this.crossings().length === 0;
      if (this.snapOK) { this.sx.set(this.x); this.sy.set(this.y); }
    }
    this.centroid();
    this.normals();
    this.spread += ((input.spread || 0) - this.spread) * Math.min(1, dt * 1.2);
    this.flat = 1 - 0.26 * this.spread;
    const x = this.x, y = this.y, nx = this.nx, ny = this.ny;
    const ddx = this.ddx, ddy = this.ddy, G = this.G;
    ddx.fill(0); ddy.fill(0); G.fill(0); this.frozen.fill(0);

    // -- pseudopod controls ---------------------------------------------------
    const pl = this.pods;
    for (let k = 0; k < 2; k++) {
      const pod = pl[k], st = input.pods[k];
      if (st && st.m > 0.06) {
        if (!pod.active) {
          pod.active = true;
          pod.tip = st.tip != null ? st.tip : this.pickTip(st.dx, st.dy, pl[1 - k].active ? pl[1 - k].tip : -1);
          pod.ret = 0;
        }
        pod.dx = st.dx; pod.dy = st.dy;
        // While a food cup is closing, the cell commits: the sticks only nudge.
        pod.target = st.m * (1 - 0.7 * this.spread) * (this.closing ? 0.15 : 1);
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
      // Substrate adhesion holds membrane that is not protruding (normal motion only;
      // membrane still slides along itself into growing pseudopods).
      const hold = this.opts.adhesion ? 0.35 + 0.65 * Math.min(1, this.Gp[i]) : 1;
      ddx[i] += (kN * hold * dn * nx[i] + kT * tx) * dt;
      ddy[i] += (kN * hold * dn * ny[i] + kT * ty) * dt;
    }

    // -- protrusion -------------------------------------------------------------
    const req = this.req;
    const spd = this.opts.speed ?? 1, boost = this.opts.boost ?? 1;
    this.flowK = spd * boost;
    let fx = 0, fy = 0, drive = 0;
    for (const pod of pl) {
      const kRamp = pod.idle ? 1 : spd * boost;
      pod.s += (pod.target - pod.s) * Math.min(1, dt * (pod.target > pod.s ? 2.2 * kRamp : 1.4 * Math.sqrt(spd)));
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
        // A boosted pseudopod may run a little further out before the body must follow.
        const lim = clamp(1 - (reach - (req * 1.0 + 110 + 40 * (boost - 1))) / 80, 0, 1);
        drive += pod.s * (1 - lim) * (pod.idle ? 0.3 : 1);
        const v = (P.vPro + (pod.idle ? 0 : P.vBoost * (input.push || 0))) * pod.s * lim * (pod.idle ? 0.7 : spd * boost);
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
          const face = smooth(-0.75, 0.1, nx[j] * pod.dx + ny[j] * pod.dy);
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
    // -- the body following (input.body) ----------------------------------------
    // The bulk of the cell flows along the body stick: the rear contracts (the
    // uroid), the front flows on, and the centroid travels. Membrane already far
    // out in front (a pseudopod) is not pushed on: the body catches up with it,
    // so a released pseudopod is absorbed and a held one leads.
    const bd = input.body;
    this.drive.m = 0;
    if (bd && bd.m > 0.06) {
      const ux = bd.dx, uy = bd.dy;
      const v = P.vBody * bd.m * spd * boost * (1 - 0.6 * this.spread) * (this.closing ? 0.2 : 1);
      for (let i = 0; i < N; i++) {
        const c = nx[i] * ux + ny[i] * uy;
        const reach = (x[i] - this.cx) * ux + (y[i] - this.cy) * uy;
        const front = Math.max(0, c) ** 0.8 * (1 - smooth(req * 0.9, req * 1.3, reach));
        const rear = Math.max(0, -c) ** 0.8;
        const w = front + rear;
        ddx[i] += ux * v * w * dt; ddy[i] += uy * v * w * dt;
        G[i] += 0.5 * front * bd.m;
      }
      fx += ux * bd.m; fy += uy * bd.m;
      this.drive.x = ux; this.drive.y = uy; this.drive.m = bd.m * boost;
    }

    const fm = Math.hypot(fx, fy);
    if (fm > 0.05) {
      this.fx += (fx / fm - this.fx) * Math.min(1, dt * 1.5);
      this.fy += (fy / fm - this.fy) * Math.min(1, dt * 1.5);
    }
    this.fm = fm;

    // The rear cortex contracts while the cell protrudes, squeezing endoplasm
    // forward (posterior contraction); the area projection sends it to the tips.
    // Only when a pseudopod is at full reach: then the cell body must follow.
    if (fm > 0.05 && this.opts.rearWeight && drive > 0.02) {
      const ux = fx / fm, uy = fy / fm, k = P.vRear * Math.min(1, drive) * Math.sqrt(spd) * boost;
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
        for (let r = -10; r <= 10; r++) {
          const j = (end + r + N) % N;
          const g = Math.exp(-(r / 5) * (r / 5));
          const ex = c.mx - x[j], ey = c.my - y[j];
          const m = Math.hypot(ex, ey);
          if (m < 0.5) continue;
          const v = Math.min(P.vClose, m * 6);
          ddx[j] += (ex / m) * v * g * dt;
          ddy[j] += (ey / m) * v * g * dt;
          G[j] += g;
        }
      }
      // The cup lining holds still (it does not need to touch the prey); only the
      // rims advance across the mouth.
      const n = c.run.length;
      for (let k = 11; k < n - 11; k++) this.frozen[c.run[k]] = 1;
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

    // Substrate adhesion: membrane that is not protruding is held to the slide.
    for (let i = 0; i < N; i++) { if (!this.frozen[i]) { x[i] += ddx[i]; y[i] += ddy[i]; } }
    this.Gp.set(G);

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
    if (this.opts.selfContact) this.selfContact(dt);

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
        if (this.frozen[i]) wi = 0;
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
    this.untangle();
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

  /**
   * A uniform grid over the ring's bounding box listing, per cell, every
   * segment (i, i+1) whose box, grown by `pad`, touches the cell.
   */
  hash(pad) {
    const x = this.x, y = this.y;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < N; i++) {
      if (x[i] < x0) x0 = x[i]; if (x[i] > x1) x1 = x[i];
      if (y[i] < y0) y0 = y[i]; if (y[i] > y1) y1 = y[i];
    }
    x0 -= pad + 1; y0 -= pad + 1; x1 += pad + 1; y1 += pad + 1;
    let cs = Math.max(20, pad * 1.2), W, H;
    for (;;) {
      W = Math.max(1, Math.ceil((x1 - x0) / cs)); H = Math.max(1, Math.ceil((y1 - y0) / cs));
      if (W * H <= 8192) break;
      cs *= 1.5;
    }
    this.hx0 = x0; this.hy0 = y0; this.hcs = cs; this.hW = W; this.hH = H;
    if (this.hStart.length < W * H + 1) this.hStart = new Int32Array(W * H + 1);
    const start = this.hStart, box = this.hBox;
    start.fill(0, 0, W * H + 1);
    let total = 0;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const a = clamp(Math.floor((Math.min(x[i], x[j]) - pad - x0) / cs), 0, W - 1);
      const b = clamp(Math.floor((Math.max(x[i], x[j]) + pad - x0) / cs), 0, W - 1);
      const c = clamp(Math.floor((Math.min(y[i], y[j]) - pad - y0) / cs), 0, H - 1);
      const d = clamp(Math.floor((Math.max(y[i], y[j]) + pad - y0) / cs), 0, H - 1);
      box[i * 4] = a; box[i * 4 + 1] = b; box[i * 4 + 2] = c; box[i * 4 + 3] = d;
      for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) { start[cy * W + cx + 1]++; total++; }
    }
    for (let k = 0; k < W * H; k++) start[k + 1] += start[k];
    if (this.hItems.length < total) this.hItems = new Int32Array(total * 2);
    const fill = this.hFill && this.hFill.length >= W * H ? this.hFill : (this.hFill = new Int32Array(W * H * 2));
    fill.set(start.subarray(0, W * H));
    for (let i = 0; i < N; i++) {
      for (let cy = box[i * 4 + 2]; cy <= box[i * 4 + 3]; cy++) {
        for (let cx = box[i * 4]; cx <= box[i * 4 + 1]; cx++) this.hItems[fill[cy * W + cx]++] = i;
      }
    }
  }

  /** The hash cell holding a point (call hash() first). */
  cellOf(px, py) {
    const cx = clamp(Math.floor((px - this.hx0) / this.hcs), 0, this.hW - 1);
    const cy = clamp(Math.floor((py - this.hy0) / this.hcs), 0, this.hH - 1);
    return cy * this.hW + cx;
  }

  /**
   * Self-contact: every node is kept P.dMin off every segment that is not its
   * neighbour (nodes alone would let a segment slip between two of them).
   * Necks: where two stretches of membrane face each other across cytoplasm
   * closer than P.neckW, they are pushed apart, so the cell resists being
   * pinched thin (opts.neck).
   */
  selfContact(dt = 1 / 60) {
    const x = this.x, y = this.y, nx = this.nx, ny = this.ny, d0 = P.dMin;
    const neck = this.opts.neck, nw = P.neckW, kNeck = Math.min(1, dt * 5) * 0.5;
    this.hash(neck ? nw : d0);
    const start = this.hStart, items = this.hItems;
    for (let i = 0; i < N; i++) {
      if (this.noSelf[i] > 0) continue;
      const cell = this.cellOf(x[i], y[i]);
      for (let q = start[cell]; q < start[cell + 1]; q++) {
        const a = items[q], b = (a + 1) % N;
        const ra = ringDist(i, a), rb = ringDist(i, b);
        if (ra < 3 || rb < 3) continue;
        if (this.noSelf[a] > 0 || this.noSelf[b] > 0) continue;
        const ex = x[b] - x[a], ey = y[b] - y[a], l2 = ex * ex + ey * ey;
        const t = clamp(l2 > 1e-9 ? ((x[i] - x[a]) * ex + (y[i] - y[a]) * ey) / l2 : 0, 0, 1);
        const qx = x[a] + ex * t, qy = y[a] + ey * t;
        let px = x[i] - qx, py = y[i] - qy;
        const d2 = px * px + py * py;
        if (d2 >= nw * nw) continue;
        const d = Math.sqrt(d2);
        let push = 0;
        if (d < d0) push = (d0 - d) * 0.5;
        else if (neck && Math.min(ra, rb) >= 8) {
          // A neck: the segment lies on the inner side of node i, and node i on
          // the inner side of the segment (cytoplasm between them, not water).
          const sn = l2 > 1e-9 ? 1 / Math.sqrt(l2) : 0;
          const snx = ey * sn, sny = -ex * sn; // the segment's outward normal
          if (px * nx[i] + py * ny[i] > 0 && px * snx + py * sny < 0) push = (nw - d) * kNeck * (1 - d / nw);
        }
        if (push <= 0) continue;
        if (d > 1e-6) { px /= d; py /= d; } else { px = -nx[i]; py = -ny[i]; }
        x[i] += px * push; y[i] += py * push;
        x[a] -= px * push * (1 - t); y[a] -= py * push * (1 - t);
        x[b] -= px * push * t; y[b] -= py * push * t;
      }
    }
  }

  /** Pairs [a, b] (a < b) of ring segments (a, a+1) and (b, b+1) that cross. */
  crossings(out = []) {
    out.length = 0;
    const x = this.x, y = this.y;
    this.hash(0);
    const start = this.hStart, items = this.hItems, box = this.hBox, W = this.hW;
    for (let a = 0; a < N; a++) {
      const a2 = (a + 1) % N;
      for (let cy = box[a * 4 + 2]; cy <= box[a * 4 + 3]; cy++) {
        for (let cx = box[a * 4]; cx <= box[a * 4 + 1]; cx++) {
          const cell = cy * W + cx;
          for (let q = start[cell]; q < start[cell + 1]; q++) {
            const b = items[q];
            if (b <= a + 1 || (b + 1) % N === a) continue;
            const b2 = (b + 1) % N;
            if (!segsCross(x[a], y[a], x[a2], y[a2], x[b], y[b], x[b2], y[b2])) continue;
            let dup = false;
            for (const p of out) if (p[0] === a && p[1] === b) { dup = true; break; }
            if (!dup) out.push([a, b]);
          }
        }
      }
    }
    return out;
  }

  /**
   * Keep the ring simple. Any crossing is undone by putting the nodes of both
   * segments back where they were at the start of the step (widening the
   * patch if needed, then the whole ring); with no clean start to go back to
   * (after a resample) the smaller loop the crossing makes is straightened.
   */
  untangle() {
    if (!this.opts.untangle) return 0;
    const x = this.x, y = this.y;
    let fixes = 0;
    for (let it = 0; it < 9; it++) {
      const pairs = this.crossings(this._pairs);
      if (!pairs.length) break;
      fixes += pairs.length;
      if (this.snapOK && it < 6) {
        for (const [a, b] of pairs) {
          for (let k = -it; k <= it + 1; k++) {
            const i = (a + k + N) % N, j = (b + k + N) % N;
            x[i] = this.sx[i]; y[i] = this.sy[i];
            x[j] = this.sx[j]; y[j] = this.sy[j];
          }
        }
      } else if (this.snapOK && it === 6) {
        x.set(this.sx); y.set(this.sy);
      } else {
        for (const [a, b] of pairs) {
          let p = a, len = b - a; // nodes a+1..b lie on the loop between the two segments
          if (len > N - len) { p = b; len = N - len; }
          const q = (p + len + 1) % N;
          for (let k = 1; k <= len; k++) {
            const t = k / (len + 1), i = (p + k) % N;
            x[i] = x[p] + (x[q] - x[p]) * t; y[i] = y[p] + (y[q] - y[p]) * t;
          }
        }
      }
    }
    this.untangled += fixes;
    return fixes;
  }

  /**
   * The thinnest neck (narrower than P.pinchW, cytoplasm on both sides of the
   * gap) that one of the capsules cuts across: [i, j], or null.
   */
  findCut(capsules) {
    if (!capsules || !capsules.length) return null;
    const x = this.x, y = this.y, nx = this.nx, ny = this.ny, w = P.pinchW;
    this.normals();
    this.hash(w);
    const start = this.hStart, items = this.hItems;
    let best = null, bd = w;
    for (let i = 0; i < N; i++) {
      const cell = this.cellOf(x[i], y[i]);
      for (let q = start[cell]; q < start[cell + 1]; q++) {
        const k = items[q];
        if (k <= i || ringDist(i, k) < 8) continue;
        const ex = x[k] - x[i], ey = y[k] - y[i];
        const d = Math.hypot(ex, ey);
        if (d >= bd) continue;
        if (ex * nx[i] + ey * ny[i] >= 0 || -ex * nx[k] - ey * ny[k] >= 0) continue;
        for (const c of capsules) {
          if (segSegDist(x[i], y[i], x[k], y[k], c.ax, c.ay, c.bx, c.by) < c.r + 2) { best = [i, k]; bd = d; break; }
        }
      }
    }
    return best;
  }

  /**
   * Cut the ring across nodes i and j. The piece holding (keepX, keepY) stays
   * the cell (resampled to N nodes; the area target becomes its area); a
   * pseudopod whose tip was on the other piece becomes a stump at the cut.
   * Returns the lost piece: { xs, ys, area }.
   */
  pinchAt(i, j, keepX, keepY) {
    const x = this.x, y = this.y;
    const piece = (from, to) => {
      const xs = [], ys = [], idx = new Set();
      for (let m = from; ; m = (m + 1) % N) { xs.push(x[m]); ys.push(y[m]); idx.add(m); if (m === to) break; }
      return { xs, ys, idx, area: Math.abs(polygonArea(xs, ys, xs.length)) };
    };
    const A = piece(i, j), B = piece(j, i);
    const inA = pointInPolygon(keepX, keepY, A.xs, A.ys, A.xs.length);
    const inB = pointInPolygon(keepX, keepY, B.xs, B.ys, B.xs.length);
    const keep = inA && !inB ? A : inB && !inA ? B : A.area >= B.area ? A : B;
    const lose = keep === A ? B : A;
    const mx = 0.5 * (x[i] + x[j]), my = 0.5 * (y[i] + y[j]);
    const tips = this.pods.map((p) => (keep.idx.has(p.tip) ? [x[p.tip], y[p.tip]] : null));
    this.resampleFrom(keep.xs, keep.ys, keep.xs.length);
    const nearest = (px, py) => this.nearest(px, py).i;
    this.pods.forEach((p, k) => {
      if (tips[k]) { p.tip = nearest(tips[k][0], tips[k][1]); return; }
      // The cut pseudopod: what is left of it is a stump at the cut.
      p.tip = nearest(mx, my);
      p.s = Math.min(p.s, 0.25);
      p.cut = this.time;
      if (p.idle) p.life = Math.min(p.life, 1);
    });
    this.A0 = Math.abs(this.area) * this.flat;
    this.closing = null; this.zip = null;
    this.uroidSet = false;
    this.noSelf.fill(0);
    this.snapOK = false;
    this.centroid();
    return { xs: lose.xs, ys: lose.ys, area: lose.area };
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
    // The rims: the pair of lining nodes that wraps furthest round the point for
    // the smallest gap (usually the two pseudopod tips).
    const lin = best.run, n = lin.length;
    const W = new Float64Array(n);
    let prev = Math.atan2(y[lin[0]] - py, x[lin[0]] - px);
    for (let k = 1; k < n; k++) {
      const a = Math.atan2(y[lin[k]] - py, x[lin[k]] - px);
      W[k] = W[k - 1] + wrapAngle(a - prev);
      prev = a;
    }
    let ba = 0, bb = n - 1, bs = -Infinity;
    const step = n > 90 ? 2 : 1;
    for (let a = 0; a < n; a += step) {
      for (let b = a + 4; b < n; b += step) {
        const gap = Math.hypot(x[lin[b]] - x[lin[a]], y[lin[b]] - y[lin[a]]);
        const sc = Math.abs(W[b] - W[a]) - (0.8 * gap) / reach;
        if (sc > bs) { bs = sc; ba = a; bb = b; }
      }
    }
    const sub = lin.slice(ba, bb + 1);
    const i0 = sub[0], i1 = sub[sub.length - 1];
    return {
      wrap: Math.abs(W[bb] - W[ba]), run: sub, i0, i1,
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
    this.resampleFrom(Float64Array.from(x), Float64Array.from(y), N);
    const nearest = (px, py) => {
      let b = 0, bv = Infinity;
      for (let i = 0; i < N; i++) { const d = (x[i] - px) ** 2 + (y[i] - py) ** 2; if (d < bv) { bv = d; b = i; } }
      return b;
    };
    this.pods.forEach((p, k) => { p.tip = nearest(tips[k][0], tips[k][1]); });
    this.ui = nearest(ux, uy);
    this.noSelf.fill(0.6);
    // The node numbering changed: the crossing guard's fallback no longer applies.
    this.snapOK = false;
    this.untangle();
  }

  /** Set the ring to N nodes evenly spaced along the closed polyline (ox, oy) of n points. */
  resampleFrom(ox, oy, n) {
    const x = this.x, y = this.y;
    const cum = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      cum[i + 1] = cum[i] + Math.hypot(ox[j] - ox[i], oy[j] - oy[i]);
    }
    const L = cum[n];
    let seg = 0;
    for (let k = 0; k < N; k++) {
      const s = (k / N) * L;
      while (seg < n - 1 && cum[seg + 1] < s) seg++;
      const l = cum[seg + 1] - cum[seg] || 1;
      const t = (s - cum[seg]) / l;
      const j = (seg + 1) % n;
      x[k] = ox[seg] + (ox[j] - ox[seg]) * t;
      y[k] = oy[seg] + (oy[j] - oy[seg]) * t;
    }
  }

  /** How far a pod's tip stands out along its direction beyond the body's radius (µm). */
  podReach(pod) {
    return (this.x[pod.tip] - this.cx) * pod.dx + (this.y[pod.tip] - this.cy) * pod.dy - this.req;
  }

  /**
   * A start node for a second pseudopod beside `pod`, towards (dx, dy): on the
   * side the direction points, between minDeg and maxDeg round the centroid
   * from the first pseudopod, so the two can close round something between them.
   */
  branchTip(dx, dy, pod, minDeg = 30, maxDeg = 70) {
    const x = this.x, y = this.y, cx = this.cx, cy = this.cy;
    const a0 = Math.atan2(y[pod.tip] - cy, x[pod.tip] - cx);
    const d = wrapAngle(Math.atan2(dy, dx) - a0);
    const side = d < 0 ? -1 : 1;
    const ab = a0 + side * clamp(Math.abs(d), (minDeg * Math.PI) / 180, (maxDeg * Math.PI) / 180);
    const ux = Math.cos(ab), uy = Math.sin(ab);
    let best = -1, bv = -Infinity;
    for (let i = 0; i < N; i++) {
      if (ringDist(i, pod.tip) < 10) continue;
      const ex = x[i] - cx, ey = y[i] - cy, r = Math.hypot(ex, ey) || 1;
      const c = (ex * ux + ey * uy) / r;
      if (c < Math.cos(0.2)) continue; // within ≈ 11° of the wanted angle
      const v = r * c;
      if (v > bv) { bv = v; best = i; }
    }
    return best >= 0 ? best : this.pickTip(ux, uy, pod.tip);
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

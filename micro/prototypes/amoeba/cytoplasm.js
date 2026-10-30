// What is inside the cell: a few thousand granules and crystals carried by the
// endoplasm, the nucleus, the contractile vacuole and the food vacuoles.
//
// Streaming is a "fountain": endoplasm (sol) in the core of the cell flows
// towards each advancing pseudopod, faster than the tip advances; the
// ectoplasm (gel) near the membrane does not stream, and a clear hyaline cap
// sits at each advancing tip. Granules never enter the outer few µm.
import { TAU, clamp, smoothstep, segDist2 } from './util.js';

// Granule kinds, used by the renderer too.
export const G = { DARK: 0, FINE: 1, CRYSTAL: 2, LIPID: 3, ALGA: 4, MAROON: 5 };

export const CV_PERIOD = 40; // s game time (≈ 6–7 min real, ×10)

export class Cytoplasm {
  constructor(rand, body, count = 2600) {
    this.rand = rand;
    this.n = count;
    this.px = new Float32Array(count);
    this.py = new Float32Array(count);
    this.kind = new Float32Array(count);
    this.size = new Float32Array(count);
    this.seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rand() * TAU, r = Math.sqrt(rand()) * 150;
      this.px[i] = body.cx + Math.cos(a) * r;
      this.py[i] = body.cy + Math.sin(a) * r;
      const u = rand();
      let k = G.DARK, s = rand.range(1.2, 2.4);
      if (u < 0.32) { k = G.FINE; s = rand.range(0.9, 1.6); }
      else if (u < 0.42) { k = G.CRYSTAL; s = rand.range(2.4, 4.6); }
      else if (u < 0.48) { k = G.LIPID; s = rand.range(3, 6); }
      else if (u < 0.53) { k = G.ALGA; s = rand.range(3, 6.5); }
      else if (u < 0.57) { k = G.MAROON; s = rand.range(2.5, 4.5); }
      this.kind[i] = k; this.size[i] = s; this.seed[i] = rand();
    }
    this.nucleus = { x: body.cx - 20, y: body.cy - 30, r: 23, asp: 1, ang: 0, tilt: 0 };
    this.cv = { x: body.cx + 40, y: body.cy - 80, r: 4, t: rand() * CV_PERIOD * 0.6, systole: 0, pulse: 0 };
    this.vacuoles = [];
    this.dens = new Float32Array(40 * 40);
    this.tmp = {};
    this.cvExtra = 0; // water from shrinking food vacuoles speeds the contractile vacuole
  }

  /** Streaming velocity of the endoplasm at a point with distance d from the membrane. */
  flowAt(body, x, y, d, out) {
    let vx = 0, vy = 0;
    const core = smoothstep(3, 24, d);
    const o = this.tmp;
    for (const pod of body.pods) {
      if (pod.s < 0.02) continue;
      const d2 = segDist2(x, y, body.cx, body.cy, pod.x, pod.y, o);
      const w = Math.exp(-d2 / (2 * 48 * 48));
      const ex = pod.x - x, ey = pod.y - y;
      const m = Math.hypot(ex, ey) || 1;
      // Streaming runs about twice as fast as the front advances.
      const v = 52 * pod.s * w * core * smoothstep(0, 30, m);
      vx += (ex / m) * v; vy += (ey / m) * v;
      // Fountain return: near the tip, cytoplasm that reaches the cortex turns
      // to gel and is left behind as the tip moves on (here: drifts back).
      const back = 10 * pod.s * w * (1 - core) * (1 - smoothstep(20, 90, m));
      vx -= (ex / m) * back; vy -= (ey / m) * back;
    }
    if (body.spread > 0.02) {
      const ex = x - body.cx, ey = y - body.cy;
      const m = Math.hypot(ex, ey) || 1;
      vx += (ex / m) * 12 * body.spread * core; vy += (ey / m) * 12 * body.spread * core;
    }
    out.x = vx; out.y = vy;
    return out;
  }

  addVacuole(v) { this.vacuoles.push(v); }

  update(dt, body, time) {
    const grid = body.grid, R = 40;
    const gc = grid.size / R;
    const dens = this.dens;
    dens.fill(0);
    const px = this.px, py = this.py, n = this.n;
    for (let i = 0; i < n; i++) {
      const gx = ((px[i] - grid.ox) / gc) | 0, gy = ((py[i] - grid.oy) / gc) | 0;
      if (gx >= 0 && gy >= 0 && gx < R && gy < R) dens[gy * R + gx] += 1;
    }
    // Mean count over cells inside the cell body, for normalising.
    const area = body.A0 / body.flat;
    const mean = (n / area) * gc * gc;
    const sampleDens = (x, y) => {
      const fx = (x - grid.ox) / gc - 0.5, fy = (y - grid.oy) / gc - 0.5;
      const ix = clamp(Math.floor(fx), 0, R - 2), iy = clamp(Math.floor(fy), 0, R - 2);
      const tx = clamp(fx - ix, 0, 1), ty = clamp(fy - iy, 0, 1);
      const k = iy * R + ix;
      return (dens[k] * (1 - tx) + dens[k + 1] * tx) * (1 - ty) + (dens[k + R] * (1 - tx) + dens[k + R + 1] * tx) * ty;
    };

    const fl = {}, gr = {};
    const orgs = this.obstacleList();
    const tipCaps = body.pods.filter((p) => p.s > 0.12 && !p.idle || p.s > 0.2);
    const r = this.rand;
    for (let i = 0; i < n; i++) {
      let x = px[i], y = py[i];
      let d = grid.sample(x, y);
      if (d < -40) {
        // Lost (a seal or a resample moved the membrane past it): put it back near the centre.
        const a = r() * TAU, rr = r() * 60;
        px[i] = body.cx + Math.cos(a) * rr; py[i] = body.cy + Math.sin(a) * rr;
        continue;
      }
      this.flowAt(body, x, y, d, fl);
      let vx = fl.x, vy = fl.y;
      // Granules spread out from crowded places (crowding, not real pressure physics).
      const h = gc * 0.5;
      const ddx = sampleDens(x + h, y) - sampleDens(x - h, y);
      const ddy = sampleDens(x, y + h) - sampleDens(x, y - h);
      vx -= (ddx / mean) * 22; vy -= (ddy / mean) * 22;
      // Brownian and saltatory jitter.
      if (this.brownian !== false) { vx += (r() - 0.5) * 30; vy += (r() - 0.5) * 30; }
      x += vx * dt; y += vy * dt;
      // Hyaline cap: the advancing tip is clear of granules.
      for (const pod of tipCaps) {
        const ex = x - pod.x, ey = y - pod.y;
        const dd = Math.hypot(ex, ey);
        const cap = 16 + 14 * pod.s;
        if (dd < cap) {
          const bx = body.cx - pod.x, by = body.cy - pod.y;
          const bm = Math.hypot(bx, by) || 1;
          x += (bx / bm) * (cap - dd) * 0.5; y += (by / bm) * (cap - dd) * 0.5;
        }
      }
      // Organelles push granules aside.
      for (const o of orgs) {
        const ex = (x - o.x), ey = (y - o.y);
        const dd = Math.hypot(ex, ey);
        if (dd < o.r && dd > 1e-3) { x = o.x + (ex / dd) * o.r; y = o.y + (ey / dd) * o.r; }
      }
      // The ectoplasm rim: keep granules a few µm inside the membrane.
      d = grid.sample(x, y);
      const margin = 7 + this.size[i];
      if (d < margin) {
        grid.grad(x, y, gr);
        const k = Math.min(margin - d, 30);
        x += gr.x * k; y += gr.y * k;
      }
      px[i] = x; py[i] = y;
    }

    this.updateOrganelles(dt, body, time);
  }

  obstacleList() {
    const list = [];
    const nu = this.nucleus;
    list.push({ x: nu.x, y: nu.y, r: nu.r + 2 });
    if (this.cv.r > 2) list.push({ x: this.cv.x, y: this.cv.y, r: this.cv.r + 1.5 });
    for (const v of this.vacuoles) list.push({ x: v.x, y: v.y, r: Math.max(v.rx, v.ry) * 0.92 + 1.5 });
    return list;
  }

  /** Move an organelle with the streaming, at a fraction of the flow, keeping it inside. */
  carry(o, dt, body, rate, margin, pull) {
    const grid = body.grid, fl = {}, gr = {};
    let d = grid.sample(o.x, o.y);
    this.flowAt(body, o.x, o.y, Math.max(d, 24), fl);
    o.x += fl.x * rate * dt; o.y += fl.y * rate * dt;
    if (pull) { o.x += pull.x * dt; o.y += pull.y * dt; }
    d = grid.sample(o.x, o.y);
    if (d < margin) {
      if (d < -60) { o.x = body.cx; o.y = body.cy; return; }
      grid.grad(o.x, o.y, gr);
      const k = Math.min(margin - d, 20) * Math.min(1, dt * 8);
      o.x += gr.x * k; o.y += gr.y * k;
    }
  }

  updateOrganelles(dt, body, time) {
    const nu = this.nucleus;
    // The discoid nucleus tumbles slowly, so it reads as a disc or a lens.
    nu.tilt += dt * 0.05;
    nu.asp = 0.72 + 0.28 * Math.abs(Math.cos(nu.tilt));
    nu.ang += dt * 0.03;
    this.carry(nu, dt, body, 0.45, nu.r + 12);

    const cv = this.cv;
    if (cv.systole > 0) {
      cv.systole -= dt;
      cv.r = Math.max(0.5, cv.r - dt * 30);
      if (cv.systole <= 0) { cv.t = 0; cv.r = 2; }
    } else {
      cv.t += dt * (1 + this.cvExtra);
      const f = clamp(cv.t / CV_PERIOD, 0, 1);
      cv.r = 2 + 21 * Math.cbrt(f); // volume grows linearly, so the radius as a cube root
      if (f >= 1) { cv.systole = 1.2; cv.pulse = 1; }
    }
    this.cvExtra = Math.max(0, this.cvExtra - dt * 0.05);
    cv.pulse = Math.max(0, cv.pulse - dt);
    // It sits towards the rear, near the uroid.
    const ux = body.ux - cv.x, uy = body.uy - cv.y;
    const um = Math.hypot(ux, uy) || 1;
    const pull = um > 90 ? { x: (ux / um) * 6, y: (uy / um) * 6 } : null;
    this.carry(cv, dt, body, 0.35, cv.r + 10, pull);

    // Food vacuoles: water is withdrawn first, then the prey is digested.
    for (let k = this.vacuoles.length - 1; k >= 0; k--) {
      const v = this.vacuoles[k];
      v.age += dt;
      const fit = v.fit; // radius scale that just holds the prey
      if (v.scale > fit) {
        const ns = Math.max(fit, v.scale - dt * 0.12);
        const before = Math.PI * v.rx0 * v.ry0 * v.scale * v.scale;
        const after = Math.PI * v.rx0 * v.ry0 * ns * ns;
        body.A0 -= before - after; // water leaves the vacuole (to the contractile vacuole)
        this.cvExtra = Math.min(2, this.cvExtra + (before - after) / 3000);
        v.scale = ns;
      } else if (v.digest < 1) {
        v.digest = Math.min(1, v.digest + dt / v.digestTime);
        const s = fit * (1 - 0.55 * v.digest);
        const before = Math.PI * v.rx0 * v.ry0 * v.scale * v.scale;
        v.scale = Math.min(v.scale, s);
        const after = Math.PI * v.rx0 * v.ry0 * v.scale * v.scale;
        body.A0 -= before - after;
        if (v.digest >= 1 && !v.grown) {
          v.grown = true;
          body.A0 += v.nutrition; // the cell grows a little
        }
      }
      v.rx = v.rx0 * v.scale; v.ry = v.ry0 * v.scale;
      v.ang += dt * v.spin;
      let pull = null;
      if (v.egest) {
        const ex = body.ux - v.x, ey = body.uy - v.y;
        const m = Math.hypot(ex, ey) || 1;
        pull = { x: (ex / m) * 26, y: (ey / m) * 26 };
      }
      this.carry(v, dt, body, 0.5, (v.egest ? 2 : 8) + Math.max(v.rx, v.ry), pull);
      if (v.egest) {
        const ex = body.ux - v.x, ey = body.uy - v.y;
        if (Math.hypot(ex, ey) < Math.max(v.rx, v.ry) + 16) {
          this.vacuoles.splice(k, 1);
          body.A0 -= Math.PI * v.rx * v.ry;
          v.done = true;
          if (this.onEgest) this.onEgest(v);
        }
      }
    }
    // Organelles do not overlap.
    const orgs = [nu, cv, ...this.vacuoles];
    const rad = (o) => (o === nu ? o.r : o === cv ? o.r : Math.max(o.rx, o.ry) * 0.9);
    for (let a = 0; a < orgs.length; a++) {
      for (let b = a + 1; b < orgs.length; b++) {
        const A = orgs[a], B = orgs[b];
        const ex = B.x - A.x, ey = B.y - A.y;
        const d = Math.hypot(ex, ey) || 1e-3;
        const min = rad(A) + rad(B) + 3;
        if (d < min) {
          const k = (min - d) * 0.5 * Math.min(1, dt * 6);
          A.x -= (ex / d) * k; A.y -= (ey / d) * k;
          B.x += (ex / d) * k; B.y += (ey / d) * k;
        }
      }
    }
  }
}

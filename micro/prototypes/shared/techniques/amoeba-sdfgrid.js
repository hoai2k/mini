// Technique: a signed distance grid of a closed 2D outline (from the amoeba
// prototype), rebuilt every frame on the CPU: scanline fill of the polygon,
// then an exact Euclidean distance transform (Felzenszwalb & Huttenlocher)
// inside and outside. Positive values are inside, in world units.
//
// Interface: const g = new SdfGrid(128); g.build(xs, ys, n, margin);
//   g.sample(x, y) -> signed distance; g.grad(x, y, out) -> unit inward gradient;
//   g.bytes (Uint8Array res*res, distance*4 clamped 0..255, row 0 = bottom) for a
//   THREE.DataTexture (RedFormat, LinearFilter) spanning (g.ox, g.oy, g.size).
// Uses: keep particles inside a soft body, prey outside it, and build a
// thickness dome (distance from the edge) in a shader.

const INF = 1e20;

function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

export class SdfGrid {
  constructor(res = 128) {
    this.res = res;
    const n = res * res;
    this.inside = new Uint8Array(n);
    this.d = new Float32Array(n);
    this.bytes = new Uint8Array(n);
    this.fa = new Float64Array(n);
    this.fb = new Float64Array(n);
    this.f = new Float64Array(res);
    this.o = new Float64Array(res);
    this.v = new Int32Array(res);
    this.z = new Float64Array(res + 1);
    this.ox = 0; this.oy = 0; this.size = 1; this.cell = 1;
    this.cross = new Float64Array(256);
  }

  edt2d(g) {
    const R = this.res, f = this.f, o = this.o, v = this.v, z = this.z;
    for (let x = 0; x < R; x++) {
      for (let y = 0; y < R; y++) f[y] = g[y * R + x];
      edt1d(f, R, o, v, z);
      for (let y = 0; y < R; y++) g[y * R + x] = o[y];
    }
    for (let y = 0; y < R; y++) {
      const row = y * R;
      for (let x = 0; x < R; x++) f[x] = g[row + x];
      edt1d(f, R, o, v, z);
      for (let x = 0; x < R; x++) g[row + x] = o[x];
    }
  }

  build(xs, ys, n, margin = 70) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      if (xs[i] < x0) x0 = xs[i]; if (xs[i] > x1) x1 = xs[i];
      if (ys[i] < y0) y0 = ys[i]; if (ys[i] > y1) y1 = ys[i];
    }
    const R = this.res;
    const size = Math.max(x1 - x0, y1 - y0) + 2 * margin;
    this.size = size;
    this.cell = size / R;
    this.ox = (x0 + x1) / 2 - size / 2;
    this.oy = (y0 + y1) / 2 - size / 2;
    const ins = this.inside;
    ins.fill(0);
    const cross = this.cross;
    for (let r = 0; r < R; r++) {
      const yc = this.oy + (r + 0.5) * this.cell;
      let m = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const ya = ys[j], yb = ys[i];
        if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) {
          if (m < cross.length) cross[m++] = xs[j] + ((yc - ya) / (yb - ya)) * (xs[i] - xs[j]);
        }
      }
      const c = Array.prototype.slice.call(cross, 0, m).sort((a, b) => a - b);
      for (let k = 0; k + 1 < c.length; k += 2) {
        let ca = Math.ceil((c[k] - this.ox) / this.cell - 0.5);
        let cb = Math.floor((c[k + 1] - this.ox) / this.cell - 0.5);
        if (ca < 0) ca = 0; if (cb > R - 1) cb = R - 1;
        for (let q = ca; q <= cb; q++) ins[r * R + q] = 1;
      }
    }
    const fa = this.fa, fb = this.fb;
    for (let i = 0; i < R * R; i++) {
      fa[i] = ins[i] ? INF : 0; // distance from inside cells to the nearest outside cell
      fb[i] = ins[i] ? 0 : INF; // and from outside cells to the nearest inside cell
    }
    this.edt2d(fa);
    this.edt2d(fb);
    const d = this.d, bytes = this.bytes, cell = this.cell;
    for (let i = 0; i < R * R; i++) {
      const v = ins[i] ? (Math.sqrt(fa[i]) - 0.5) * cell : -(Math.sqrt(fb[i]) - 0.5) * cell;
      d[i] = v;
      const b = v * 4;
      bytes[i] = b <= 0 ? 0 : b >= 255 ? 255 : b;
    }
  }

  /** Signed distance (µm, + inside) at a world point, bilinear; far outside returns a large negative. */
  sample(x, y) {
    const R = this.res;
    const gx = (x - this.ox) / this.cell - 0.5, gy = (y - this.oy) / this.cell - 0.5;
    if (gx < 0 || gy < 0 || gx >= R - 1 || gy >= R - 1) return -999;
    const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy;
    const i = iy * R + ix, d = this.d;
    return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fy) + (d[i + R] * (1 - fx) + d[i + R + 1] * fx) * fy;
  }

  /** Unit gradient (points inward, towards increasing distance) written to out. */
  grad(x, y, out) {
    const h = this.cell;
    const gx = this.sample(x + h, y) - this.sample(x - h, y);
    const gy = this.sample(x, y + h) - this.sample(x, y - h);
    const m = Math.hypot(gx, gy) || 1;
    out.x = gx / m; out.y = gy / m;
    return out;
  }
}

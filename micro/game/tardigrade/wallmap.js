// Footholds from a delivered micrograph texture.
//
// When MP-T01/MP-T02 arrive, the walls the claws hook must be the walls in
// the picture. This reads the image once on load: cell walls in a DIC image
// are where the optical path changes fastest, so the gradient magnitude is
// thresholded into a wall mask, and a two-pass chamfer distance transform
// turns it into a "distance to the nearest wall" map. The lumens between
// walls are labelled as cells (flood fill), so a pierced cell can be emptied
// as a whole. Green (chlorophyll) is sampled from the image to say which
// cells are alive.
//
// The leaf shader samples the same maps: the image supplies colour, the wall
// map supplies optical path, so the DIC relief keeps the microscope's shear
// direction however the leaf turns.
import * as THREE from '../shared/vendor/three.module.min.js';

const N = 512;

export class WallMap {
  /**
   * @param image HTMLImageElement / ImageBitmap of a seamless tile whose
   *   cells run vertically (long axis along the image's y)
   * @param tile tile size in units (the image covers tile × tile)
   * @param kind 'lamina' (cells = lumens, all alive) or 'sphagnum' (alive = the green net)
   */
  constructor(image, tile, kind) {
    this.tile = tile;
    this.kind = kind;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0, N, N);
    const px = g.getImageData(0, 0, N, N).data;
    const lum = new Float32Array(N * N), green = new Float32Array(N * N);
    const mean = [0, 0, 0];
    for (let i = 0; i < N * N; i++) for (let k = 0; k < 3; k++) mean[k] += px[4 * i + k] / 255 / (N * N);
    /** Mean colour of the image: the lamp, not pigment. */
    this.mean = new THREE.Vector3(...mean);
    for (let i = 0; i < N * N; i++) {
      const r = px[4 * i], gg = px[4 * i + 1], b = px[4 * i + 2];
      lum[i] = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
      green[i] = Math.max(0, gg - (r + b) / 2) / 255;
    }
    const at = (x, y) => ((y + N) % N) * N + ((x + N) % N);
    // Smoothed gradient magnitude (Sobel on a lightly blurred luminance).
    const bl = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += lum[at(x + dx, y + dy)];
      bl[at(x, y)] = s / 9;
    }
    const grad = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const gx = bl[at(x + 1, y - 1)] + 2 * bl[at(x + 1, y)] + bl[at(x + 1, y + 1)] - bl[at(x - 1, y - 1)] - 2 * bl[at(x - 1, y)] - bl[at(x - 1, y + 1)];
      const gy = bl[at(x - 1, y + 1)] + 2 * bl[at(x, y + 1)] + bl[at(x + 1, y + 1)] - bl[at(x - 1, y - 1)] - 2 * bl[at(x, y - 1)] - bl[at(x + 1, y - 1)];
      grad[at(x, y)] = Math.hypot(gx, gy);
    }
    // Walls: the strongest ~22% of gradients (Sphagnum: also the green net).
    const sorted = Float32Array.from(grad).sort();
    const thr = sorted[Math.floor(sorted.length * 0.78)];
    const gs = Float32Array.from(green).sort();
    const gthr = gs[Math.floor(gs.length * 0.7)];
    const wall = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) wall[i] = grad[i] > thr || (kind === 'sphagnum' && green[i] > gthr && green[i] > 0.04) ? 1 : 0;
    // Chamfer distance (3-4), wrapping, two passes each way.
    const INF = 1e6, d = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) d[i] = wall[i] ? 0 : INF;
    for (let rep = 0; rep < 2; rep++) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = at(x, y);
        d[i] = Math.min(d[i], d[at(x - 1, y)] + 3, d[at(x, y - 1)] + 3, d[at(x - 1, y - 1)] + 4, d[at(x + 1, y - 1)] + 4);
      }
      for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
        const i = at(x, y);
        d[i] = Math.min(d[i], d[at(x + 1, y)] + 3, d[at(x, y + 1)] + 3, d[at(x + 1, y + 1)] + 4, d[at(x - 1, y + 1)] + 4);
      }
    }
    const unit = tile / N;
    this.dist = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) this.dist[i] = (d[i] / 3) * unit;
    // Cells: flood-fill the lumens (pixels a little away from walls).
    this.label = new Int32Array(N * N).fill(-1);
    let n = 0;
    const stack = [];
    const core = 2.5 * 3;
    for (let s = 0; s < N * N; s++) {
      if (this.label[s] >= 0 || d[s] < core) continue;
      this.label[s] = n; stack.push(s);
      while (stack.length) {
        const i = stack.pop(), x = i % N, y = (i / N) | 0;
        for (const j of [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)]) {
          if (this.label[j] < 0 && d[j] >= core) { this.label[j] = n; stack.push(j); }
        }
      }
      n++;
    }
    // Grow labels into the wall margin so every lumen pixel has its cell.
    for (let rep = 0; rep < 6; rep++) for (let i = 0; i < N * N; i++) {
      if (this.label[i] >= 0 || wall[i]) continue;
      const x = i % N, y = (i / N) | 0;
      for (const j of [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)]) if (this.label[j] >= 0) { this.label[i] = this.label[j]; break; }
    }
    this.cells = n;
    this.green = green;
    this.gthr = gthr;
    // GPU map: r = wall distance (0..1 over 0.1 units), g = eaten mask.
    this.data = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      this.data[4 * i] = Math.min(255, Math.round((this.dist[i] / 0.1) * 255));
      this.data[4 * i + 3] = 255;
    }
    this.tex = new THREE.DataTexture(this.data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping;
    this.tex.magFilter = this.tex.minFilter = THREE.LinearFilter;
    this.tex.needsUpdate = true;
  }

  /** Pixel under leaf point (u along, v across). Matches the shader's mapping. */
  index(u, v) {
    const s = v / this.tile, t = u / this.tile;
    const x = Math.floor((s - Math.floor(s)) * N) % N, y = Math.floor((t - Math.floor(t)) * N) % N;
    return y * N + x;
  }

  sampleDist(u, v) {
    // Bilinear, for smooth Newton steps.
    const fs = (v / this.tile) * N - 0.5, ft = (u / this.tile) * N - 0.5;
    const x0 = Math.floor(fs), y0 = Math.floor(ft), ax = fs - x0, ay = ft - y0;
    const w = (x, y) => this.dist[((y % N) + N) % N * N + (((x % N) + N) % N)];
    return (w(x0, y0) * (1 - ax) + w(x0 + 1, y0) * ax) * (1 - ay) + (w(x0, y0 + 1) * (1 - ax) + w(x0 + 1, y0 + 1) * ax) * ay;
  }

  /** Same shape as patterns.cellAt(). */
  cell(u, v) {
    const dist = this.sampleDist(u, v);
    const i = this.index(u, v);
    return { dist, kind: 'map', row: 0, col: this.label[i], costa: false, junction: dist };
  }

  /** Is the cell under (u, v) alive (chlorophyll)? Lamina: any lumen; Sphagnum: the green net only. */
  living(u, v) {
    const i = this.index(u, v);
    if (this.kind === 'sphagnum') return this.green[i] > this.gthr * 0.8;
    return this.label[i] >= 0;
  }

  isEaten(u, v) { return this.data[4 * this.index(u, v) + 1] > 0; }

  /** Empty the cell under (u, v): the whole lumen, or a patch of the green net. */
  eat(u, v) {
    const i0 = this.index(u, v);
    const lab = this.label[i0];
    if (this.kind === 'lamina' && lab >= 0) {
      for (let i = 0; i < N * N; i++) if (this.label[i] === lab) this.data[4 * i + 1] = 255;
    } else {
      const x0 = i0 % N, y0 = (i0 / N) | 0, R = Math.round((0.08 / this.tile) * N);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        const j = (((y0 + dy) % N + N) % N) * N + (((x0 + dx) % N + N) % N);
        if (this.green[j] > this.gthr * 0.6) this.data[4 * j + 1] = 255;
      }
    }
    this.tex.needsUpdate = true;
  }
}

// The flame emitter's particle pool, with no three.js in it (so Node can test
// it): live particles packed at the front of fixed typed arrays, the dead
// swapped out from the end, so a frame never allocates and the instanced mesh
// draws exactly the first `n` slots. entities/flames.js spawns into it at a
// model's emitter points, steps it from the rig's tick and writes it out as
// one voxel cube per particle (an instance matrix and an HDR colour).
//
// Each particle rises (its upward speed grows with `rise`), wanders sideways
// with a little turbulence, slows with `drag`, swells for a moment, then
// shrinks to nothing while its colour runs down the palette: a hot core
// first, then the flame's own colour, then a dark tail.

// A palette: colour stops from birth to death, each [hex, intensity] (an HDR
// multiplier: above 1 the cube glows through the bloom).
export const PALETTES = {
  // Greek fire: white-green core, bright green, green, dark teal
  greek: [[0xc8ffa0, 1.45], [0x20ff10, 0.95], [0x08b030, 0.75], [0x044038, 0.45]],
  // ordinary fire: pale yellow core, orange, red, a dark ember
  fire: [[0xffe890, 1.45], [0xff9010, 1.0], [0xff3a08, 0.8], [0x601006, 0.45]],
  // a telekhine's cauldron: orange at the mouth turning green as it climbs
  forge: [[0xffe890, 1.45], [0xff9010, 1.0], [0x30ff10, 0.85], [0x044a38, 0.45]],
};
// hex -> linear-ish 0..1 rgb (three treats instance colours as linear; the
// palettes are picked by eye in the game's AgX tone mapping)
const srgb = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function paletteStops(pal) {
  const out = new Float32Array(pal.length * 3);
  pal.forEach(([hex, k], i) => {
    out[i * 3] = srgb(((hex >> 16) & 255) / 255) * k;
    out[i * 3 + 1] = srgb(((hex >> 8) & 255) / 255) * k;
    out[i * 3 + 2] = srgb((hex & 255) / 255) * k;
  });
  return out;
}

export class FlameSim {
  constructor(cap) {
    this.cap = cap; this.n = 0; this.t = 0;
    this.pos = new Float32Array(cap * 3); this.vel = new Float32Array(cap * 3);
    this.age = new Float32Array(cap); this.life = new Float32Array(cap);
    this.size = new Float32Array(cap); this.k = new Float32Array(cap); this.ph = new Float32Array(cap);
  }
  // A new particle (world units; k: the world size of one model unit, which
  // scales its rise and turbulence). False when the pool is full.
  spawn(x, y, z, vx, vy, vz, life, size, k = 1, ph = Math.random() * 6.283) {
    if (this.n >= this.cap || !(life > 0)) return false;
    const i = this.n++, o = i * 3;
    this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
    this.vel[o] = vx; this.vel[o + 1] = vy; this.vel[o + 2] = vz;
    this.age[i] = 0; this.life[i] = life; this.size[i] = size; this.k[i] = k; this.ph[i] = ph;
    return true;
  }
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    const o = i * 3, q = j * 3;
    for (let a = 0; a < 3; a++) { this.pos[o + a] = this.pos[q + a]; this.vel[o + a] = this.vel[q + a]; }
    this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.size[i] = this.size[j]; this.k[i] = this.k[j]; this.ph[i] = this.ph[j];
  }
  // Age and move every live particle by dt; the expired ones are removed.
  // rise: upward acceleration, turb: sideways wander, drag: per second (all
  // per model unit, times each particle's k).
  step(dt, rise = 0, turb = 0, drag = 0) {
    if (!(dt > 0)) return;
    this.t += dt;
    const t = this.t, damp = Math.exp(-drag * dt), P = this.pos, V = this.vel;
    for (let i = 0; i < this.n;) {
      const age = (this.age[i] += dt);
      if (age >= this.life[i]) { this.kill(i); continue; }
      const o = i * 3, k = this.k[i], ph = this.ph[i];
      V[o] = (V[o] + Math.sin(t * 9 + ph) * turb * k * dt) * damp;
      V[o + 1] = (V[o + 1] + rise * k * dt) * damp;
      V[o + 2] = (V[o + 2] + Math.cos(t * 7.7 + ph * 1.7) * turb * k * dt) * damp;
      P[o] += V[o] * dt; P[o + 1] += V[o + 1] * dt; P[o + 2] += V[o + 2] * dt;
      i++;
    }
  }
  // Write the live particles into an instance matrix array (16 floats each,
  // column-major) and an rgb array, colour run down `stops` (paletteStops).
  // Returns the count to draw.
  write(mats, cols, stops, stretch = 1.25) {
    const ns = stops.length / 3 - 1;
    for (let i = 0; i < this.n; i++) {
      const u = this.age[i] / this.life[i];
      const s = this.size[i] * (u < 0.12 ? 0.55 + u * 3.75 : (1 - u) / 0.88);
      const m = i * 16, o = i * 3;
      mats[m] = s; mats[m + 1] = 0; mats[m + 2] = 0; mats[m + 3] = 0;
      mats[m + 4] = 0; mats[m + 5] = s * stretch; mats[m + 6] = 0; mats[m + 7] = 0;
      mats[m + 8] = 0; mats[m + 9] = 0; mats[m + 10] = s; mats[m + 11] = 0;
      mats[m + 12] = this.pos[o]; mats[m + 13] = this.pos[o + 1]; mats[m + 14] = this.pos[o + 2]; mats[m + 15] = 1;
      const f = Math.min(ns, u * ns * 1.0001), a = Math.min(ns - 1, Math.floor(f)), w = f - a, A = a * 3, B = A + 3;
      cols[o] = stops[A] + (stops[B] - stops[A]) * w;
      cols[o + 1] = stops[A + 1] + (stops[B + 1] - stops[A + 1]) * w;
      cols[o + 2] = stops[A + 2] + (stops[B + 2] - stops[A + 2]) * w;
    }
    return this.n;
  }
  clear() { this.n = 0; }
}

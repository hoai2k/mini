// The waveform strip: a live, scrolling view of the microphone while
// listening and recording, and a whole take with a playhead during playback.

import { peaks } from './detect.js';

const SECONDS = 6; // live view width in seconds
const COLS_PER_SEC = 60;

export class Waveform {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.cols = SECONDS * COLS_PER_SEC;
    this.live = new Float32Array(this.cols * 2); // min,max per column
    this.liveState = new Uint8Array(this.cols); // 0 idle, 1 waiting, 2 recording
    this.head = 0; // next column to write
    this.acc = { lo: 0, hi: 0, n: 0 };
    this.mode = 'live';
    this.take = null;
    this.progress = 0;
    this.dirty = true;
    new ResizeObserver(() => { this.dirty = true; }).observe(canvas);
  }

  /** Add microphone samples to the live view. */
  push(data, sampleRate, state) {
    const per = Math.round(sampleRate / COLS_PER_SEC);
    const code = state === 'recording' ? 2 : state === 'waiting' ? 1 : 0;
    const a = this.acc;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v < a.lo) a.lo = v;
      if (v > a.hi) a.hi = v;
      if (++a.n >= per) {
        this.live[this.head * 2] = a.lo;
        this.live[this.head * 2 + 1] = a.hi;
        this.liveState[this.head] = code;
        this.head = (this.head + 1) % this.cols;
        a.lo = a.hi = 0;
        a.n = 0;
      }
    }
    if (this.mode === 'live') this.dirty = true;
  }

  showLive() {
    this.mode = 'live';
    this.take = null;
    this.dirty = true;
  }

  showTake(samples) {
    this.mode = 'take';
    this.take = peaks(samples, 600);
    this.progress = 0;
    this.dirty = true;
  }

  setProgress(p) {
    this.progress = p;
    this.dirty = true;
  }

  draw() {
    if (!this.dirty) return;
    this.dirty = false;
    const c = this.canvas;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(c.clientWidth * dpr));
    const h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = this.g;
    const css = getComputedStyle(c);
    const col = (name) => css.getPropertyValue(name).trim();
    g.clearRect(0, 0, w, h);
    const mid = h / 2;
    const scale = (h / 2) * 0.92;
    g.fillStyle = col('--wave-axis');
    g.fillRect(0, Math.round(mid), w, Math.max(1, dpr));

    if (this.mode === 'take' && this.take) {
      const n = this.take.length / 2;
      const played = this.progress * w;
      for (let x = 0; x < w; x++) {
        const i = Math.min(n - 1, Math.floor((x / w) * n));
        const lo = this.take[2 * i], hi = this.take[2 * i + 1];
        g.fillStyle = x <= played ? col('--wave-play') : col('--wave-take');
        const top = mid - Math.max(hi, 0.004) * scale * 1.6;
        const bot = mid - Math.min(lo, -0.004) * scale * 1.6;
        g.fillRect(x, Math.max(0, top), 1, Math.min(h, bot) - Math.max(0, top));
      }
      g.fillStyle = col('--wave-head');
      g.fillRect(Math.round(played) - dpr, 0, 2 * dpr, h);
      return;
    }

    const colors = [col('--wave-idle'), col('--wave-wait'), col('--wave-rec')];
    const step = w / this.cols;
    for (let k = 0; k < this.cols; k++) {
      const i = (this.head + k) % this.cols;
      const lo = this.live[2 * i], hi = this.live[2 * i + 1];
      // Boost quiet signals so playing is visible even at a distance from the mic.
      const amp = (v) => Math.sign(v) * Math.min(1, Math.sqrt(Math.abs(v)) * 1.2);
      g.fillStyle = colors[this.liveState[i]];
      const top = mid - Math.max(amp(hi), 0.01) * scale;
      const bot = mid - Math.min(amp(lo), -0.01) * scale;
      g.fillRect(k * step, top, Math.max(1, step - dpr * 0.5), bot - top);
    }
  }
}

/** A small static waveform for a row in the takes list. */
export function drawThumb(canvas, samples) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const p = peaks(samples, Math.max(1, Math.floor(w / (2 * dpr))));
  let max = 0.05;
  for (const v of p) max = Math.max(max, Math.abs(v));
  g.fillStyle = getComputedStyle(canvas).getPropertyValue('--wave-take').trim() || '#c9b48f';
  const bw = 2 * dpr;
  for (let i = 0; i < p.length / 2; i++) {
    const a = Math.max(Math.abs(p[2 * i]), Math.abs(p[2 * i + 1])) / max;
    const bh = Math.max(dpr, a * h * 0.9);
    g.fillRect(i * bw, (h - bh) / 2, bw - dpr * 0.6, bh);
  }
}

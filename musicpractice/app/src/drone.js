// The Drone: a sustained tone to play along with. Pitches, the timed
// sequences that move between them, and the sound engine.
//
// Bowed and blown voices (cellos, shruti box, organ, bagpipes) play live in
// Web Audio: oscillators whose harmonics are shaped by each instrument's body
// resonances at the exact pitch, with slow random drift in pitch, bow
// pressure and brightness so the tone lives. Plucked voices (tanpura, sitar)
// are rendered once into a seamless loop of their plucking pattern. All go
// through a warm hall reverb, and fade in and out smoothly.

export const DRONE_MIN = 36; // C2, the cello's open C string
export const DRONE_MAX = 59; // B3: two octaves, every note twice

/** Keep a note in the drone range by octaves. */
export function wrap(midi) {
  let m = Math.round(midi);
  while (m > DRONE_MAX) m -= 12;
  while (m < DRONE_MIN) m += 12;
  return m;
}

export const VOICES = [
  { id: 'cello', label: 'Cello' },
  { id: 'cello-soft', label: 'Cello, soft (sul tasto)' },
  { id: 'cello-section', label: 'Cello section' },
  { id: 'tanpura', label: 'Tanpura', fifth: true },
  { id: 'sitar', label: 'Sitar', fifth: true },
  { id: 'shruti', label: 'Shruti box', fifth: true },
  { id: 'organ', label: 'Organ' },
  { id: 'bagpipes', label: 'Bagpipe drones' },
];

/** What happens when a timed drone's time is up. */
export const SEQUENCES = [
  { id: 'stop', label: 'Stop' },
  { id: 'chrom-up', label: 'Next note up (chromatic)' },
  { id: 'chrom-down', label: 'Next note down (chromatic)' },
  { id: 'major-up', label: 'Up the major scale' },
  { id: 'major-down', label: 'Down the major scale' },
  { id: 'fifths', label: 'Up a fifth (circle of fifths)' },
  { id: 'fourths', label: 'Up a fourth (circle of fourths)' },
];

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/**
 * The note for step `step` of a sequence that began on `start`: step 0 is
 * the start. Scales are the major scale of the starting note. Notes wrap by
 * octaves to stay in the drone range.
 */
export function sequenceNote(seq, start, step) {
  const oct = Math.floor(step / 7);
  const k = step % 7;
  switch (seq) {
    case 'chrom-up': return wrap(start + step);
    case 'chrom-down': return wrap(start - step);
    case 'major-up': return wrap(start + MAJOR[k] + 12 * oct);
    case 'major-down': return wrap(start - 12 * oct + (k === 0 ? 0 : MAJOR[7 - k] - 12));
    case 'fifths': return wrap(start + 7 * step);
    case 'fourths': return wrap(start + 5 * step);
    default: return wrap(start);
  }
}

// ---------------------------------------------------------------- spectra

const bump = (f, centre, width, gain) => gain * Math.exp(-((Math.log2(f / centre)) ** 2) / (2 * width * width));

/** A cello body: the air and wood resonances and the bridge hill, then a rolloff. */
function celloBody(f) {
  const r = 0.35 + bump(f, 100, 0.25, 0.5) + bump(f, 205, 0.22, 1) + bump(f, 290, 0.2, 0.8)
    + bump(f, 440, 0.25, 0.6) + bump(f, 620, 0.25, 0.5) + bump(f, 1100, 0.3, 0.3) + bump(f, 2200, 0.35, 0.35);
  return r / (1 + (f / 3200) ** 2);
}

/** A reed's nasal formants. */
function reedBody(f, peaks) {
  let r = 0.4;
  for (const [c, w, g] of peaks) r += bump(f, c, w, g);
  return r / (1 + (f / 5000) ** 2);
}

const SPECTRA = {
  // Helmholtz motion (1/n) through the body, a weak 9th (bowed a ninth of the way along).
  cello: (n, f) => (1 / n) * celloBody(f) * (n % 9 === 0 ? 0.25 : 1),
  celloBright: (n, f) => (1 / n ** 0.6) * celloBody(f) * (n % 9 === 0 ? 0.25 : 1),
  celloSoft: (n, f) => (1 / n ** 1.55) * celloBody(f),
  shruti: (n, f) => (1 / n ** 0.7) * reedBody(f, [[1200, 0.35, 1], [2600, 0.3, 0.5]]),
  organ: (n) => [1, 0.38, 0.22, 0.14, 0.09, 0.06, 0.045, 0.035, 0.025, 0.02][n - 1] ?? 0,
  bagpipe: (n, f) => (1 / n ** 0.45) * reedBody(f, [[1700, 0.3, 1.4], [3000, 0.25, 0.8]]),
};

function wave(ctx, spectrum, f0, seed = 1) {
  const max = Math.min(64, Math.floor(Math.min(11000, ctx.sampleRate * 0.45) / f0));
  const real = new Float32Array(max + 1);
  const imag = new Float32Array(max + 1);
  let s = seed * 9301 + 49297;
  for (let n = 1; n <= max; n++) {
    s = (s * 9301 + 49297) % 233280;
    const phase = (s / 233280) * Math.PI * 2; // spread phases: a smoother, less peaky wave
    const a = spectrum(n, n * f0);
    real[n] = a * Math.cos(phase);
    imag[n] = a * Math.sin(phase);
  }
  return ctx.createPeriodicWave(real, imag);
}

// ---------------------------------------------------------------- live voices

/** A slow wandering control: two sines of unrelated rates, scaled by `depth`, added to `param`. */
function wander(ctx, param, depth, rate, t, nodes) {
  for (const [r, d] of [[rate, 0.65], [rate * 2.37, 0.35]]) {
    const o = ctx.createOscillator();
    o.frequency.value = r;
    const g = ctx.createGain();
    g.gain.value = depth * d;
    o.connect(g).connect(param);
    o.start(t);
    nodes.push(o);
  }
}

let noiseBuffer = null;
function noise(ctx) {
  if (noiseBuffer?.sampleRate === ctx.sampleRate) return noiseBuffer;
  const n = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  return noiseBuffer;
}

function panner(ctx, pan) {
  if (!pan || typeof ctx.createStereoPanner !== 'function') return ctx.createGain();
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  return p;
}

/**
 * One sustained string, reed or pipe. `layer`: { spectrum, bright, ratio,
 * gain, cents, pan, drift (cents), driftRate, breath, breathRate, air }.
 */
function sustained(ctx, dest, f0, layer, t, nodes, seed) {
  const f = f0 * (layer.ratio ?? 1);
  const out = panner(ctx, layer.pan);
  out.connect(dest);
  // Breathing: the bow or bellows pressure, slowly up and down.
  const amp = ctx.createGain();
  amp.gain.value = 1;
  amp.connect(out);
  if (layer.breath) wander(ctx, amp.gain, layer.breath, layer.breathRate ?? 0.11, t, nodes);
  const level = ctx.createGain();
  level.gain.value = layer.gain ?? 1;
  level.connect(amp);

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(wave(ctx, SPECTRA[layer.spectrum], f, seed));
  osc.frequency.value = f;
  osc.detune.value = layer.cents ?? 0;
  if (layer.drift) wander(ctx, osc.detune, layer.drift, layer.driftRate ?? 0.09, t, nodes);
  osc.connect(level);
  osc.start(t);
  nodes.push(osc);

  // A brighter tone faded in and out slowly: the bow's contact changing.
  if (layer.bright) {
    const b = ctx.createOscillator();
    b.setPeriodicWave(wave(ctx, SPECTRA[layer.bright], f, seed + 7));
    b.frequency.value = f;
    b.detune.value = layer.cents ?? 0;
    if (layer.drift) wander(ctx, b.detune, layer.drift, layer.driftRate ?? 0.09, t, nodes);
    const bg = ctx.createGain();
    bg.gain.value = 0.18;
    wander(ctx, bg.gain, 0.16, 0.05 + seed * 0.013, t, nodes);
    b.connect(bg).connect(level);
    b.start(t);
    nodes.push(b);
  }

  // Bow hair or air: soft filtered noise.
  if (layer.air) {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = layer.air.freq;
    bp.Q.value = layer.air.q ?? 0.8;
    const ng = ctx.createGain();
    ng.gain.value = layer.air.gain;
    src.connect(bp).connect(ng).connect(level);
    src.start(t, (seed * 0.37) % 1.5);
    nodes.push(src);
  }
}

/** Each live voice: its layers, and how loud it is overall. */
const LIVE = {
  cello: { level: 0.5, layers: [
    { spectrum: 'cello', bright: 'celloBright', drift: 1.8, breath: 0.1, air: { freq: 2400, gain: 0.05 } },
  ] },
  'cello-soft': { level: 0.42, layers: [
    { spectrum: 'celloSoft', drift: 1.4, driftRate: 0.07, breath: 0.08, breathRate: 0.08, air: { freq: 1300, q: 0.7, gain: 0.025 } },
  ] },
  'cello-section': { level: 0.34, wet: 0.42, layers: [
    { spectrum: 'cello', bright: 'celloBright', cents: -6, pan: -0.6, drift: 2.5, driftRate: 0.08, breath: 0.12, breathRate: 0.09, air: { freq: 2300, gain: 0.03 } },
    { spectrum: 'cello', bright: 'celloBright', cents: -1.5, pan: -0.2, drift: 2.5, driftRate: 0.11, breath: 0.12, breathRate: 0.13 },
    { spectrum: 'cello', bright: 'celloBright', cents: 2.5, pan: 0.25, drift: 2.5, driftRate: 0.095, breath: 0.12, breathRate: 0.07, air: { freq: 2600, gain: 0.03 } },
    { spectrum: 'cello', bright: 'celloBright', cents: 6.5, pan: 0.6, drift: 2.5, driftRate: 0.125, breath: 0.12, breathRate: 0.105 },
  ] },
  shruti: { level: 0.38, layers: [
    // Sa, its pure fifth and its octave, each reed with a slightly detuned twin.
    { spectrum: 'shruti', breath: 0.22, breathRate: 0.16, air: { freq: 3000, gain: 0.04 }, pan: -0.15 },
    { spectrum: 'shruti', cents: 3, gain: 0.8, pan: 0.15, breath: 0.22, breathRate: 0.16 },
    { spectrum: 'shruti', ratio: 1.5, gain: 0.55, breath: 0.22, breathRate: 0.16, pan: 0.3 },
    { spectrum: 'shruti', ratio: 2, gain: 0.4, cents: -2, breath: 0.22, breathRate: 0.16, pan: -0.3 },
  ] },
  organ: { level: 0.42, wet: 0.45, layers: [
    { spectrum: 'organ', drift: 0.3, air: { freq: 1800, q: 0.6, gain: 0.012 } }, // 8', with a little wind
    { spectrum: 'organ', ratio: 2, gain: 0.32, cents: 0.8, pan: 0.2, drift: 0.3 }, // 4'
    { spectrum: 'organ', ratio: 0.5, gain: 0.45, pan: -0.2, drift: 0.2 }, // 16'
  ] },
  bagpipes: { level: 0.27, layers: [
    // Two tenor drones on the note, a bass drone an octave below.
    { spectrum: 'bagpipe', cents: -1.5, pan: -0.35, drift: 0.8, breath: 0.04 },
    { spectrum: 'bagpipe', cents: 1.5, pan: 0.35, drift: 0.8, breath: 0.04, driftRate: 0.12 },
    { spectrum: 'bagpipe', ratio: 0.5, gain: 0.9, drift: 0.6, breath: 0.04, driftRate: 0.07 },
  ] },
};

// ---------------------------------------------------------------- plucked voices

const RENDER_RATE = 24000;

/**
 * A plucked string with a jawari bridge (tanpura, sitar): its overtones bloom
 * and the bright buzz sweeps down as it rings. Adds `dur` seconds of it,
 * starting at `t0`, into the circular buffer `buf` (so the loop is seamless).
 */
function pluck(buf, sr, f, t0, dur, { gain = 1, sweepFrom = 5000, sweepTo = 700, sweepTau = 1.2, decay = 7, maxHz = 6000, symp = 0 }) {
  const len = buf.length;
  const n0 = Math.round(t0 * sr);
  const total = Math.round(dur * sr);
  const fade = Math.round(0.08 * sr); // damped just before the string is plucked again
  const partials = Math.min(70, Math.floor(maxHz / f));
  const BLOCK = 64;
  for (let k = 1; k <= partials; k++) {
    const w = (2 * Math.PI * f * k) / sr;
    const c2 = 2 * Math.cos(w);
    let y1 = Math.sin(-w);
    let y2 = Math.sin(-2 * w);
    const tau = decay / (1 + 0.045 * k);
    const base = 0.3 / k ** 0.8;
    const lf = Math.log2(f * k);
    for (let b = 0; b < total; b += BLOCK) {
      const t = b / sr;
      const fp = sweepTo + (sweepFrom - sweepTo) * Math.exp(-t / sweepTau);
      const jw = Math.exp(-((lf - Math.log2(fp)) ** 2) / (2 * 0.45 * 0.45));
      let a = gain * Math.exp(-t / tau) * (base + (0.9 * jw) / Math.sqrt(k)) * (1 - Math.exp(-t / 0.003));
      if (total - b < fade) a *= (total - b) / fade;
      const end = Math.min(total, b + BLOCK);
      for (let i = b; i < end; i++) {
        const y = c2 * y1 - y2;
        y2 = y1;
        y1 = y;
        buf[(n0 + i) % len] += a * y;
      }
    }
  }
  // Sympathetic strings: a quiet, long shimmer on the note's octaves and fifth.
  if (symp) {
    for (const [r, g] of [[2, 1], [3, 0.6], [4, 0.7], [6, 0.4]]) {
      const w = (2 * Math.PI * f * r) / sr;
      const c2 = 2 * Math.cos(w);
      let y1 = Math.sin(-w);
      let y2 = Math.sin(-2 * w);
      for (let i = 0; i < total; i++) {
        const t = i / sr;
        let a = symp * g * gain * Math.exp(-t / 2.5) * (1 - Math.exp(-t / 0.4));
        if (total - i < fade) a *= (total - i) / fade;
        const y = c2 * y1 - y2;
        y2 = y1;
        y1 = y;
        buf[(n0 + i) % len] += a * y;
      }
    }
  }
}

const PLUCKED = {
  // Pa (a fifth below), Sa, Sa, then Sa an octave below, evenly, about 5 s round.
  tanpura: { level: 1.35, cycle: 4.8, plucks: [[0.75, 0, 0.9], [1, 1.2, 1], [1, 2.4, 0.95], [0.5, 3.6, 1.1]],
    opts: { sweepFrom: 5000, sweepTo: 650, sweepTau: 1.3, decay: 7, maxHz: 6000 } },
  // The sitar's drone strings struck in a steady pattern, brighter and quicker,
  // with sympathetic strings ringing on.
  sitar: { level: 1.25, cycle: 3, plucks: [[1, 0, 1], [2, 0.75, 0.7], [2, 1.5, 0.6], [1.5, 2.25, 0.65]],
    opts: { sweepFrom: 7000, sweepTo: 1300, sweepTau: 0.6, decay: 3.2, maxHz: 9000, symp: 0.05 } },
};

const rendered = new Map();

/** Render a plucked voice's loop at pitch `f0`, yielding between strings so the page stays responsive. */
async function renderPlucked(id, f0) {
  const key = `${id}:${f0.toFixed(4)}`;
  if (rendered.has(key)) return rendered.get(key);
  const v = PLUCKED[id];
  const sr = RENDER_RATE;
  const buf = new Float32Array(Math.round(v.cycle * sr));
  for (const [ratio, at, g] of v.plucks) {
    pluck(buf, sr, f0 * ratio, at, v.cycle, { ...v.opts, gain: g });
    await new Promise((r) => setTimeout(r, 0));
  }
  let peak = 0;
  for (const x of buf) peak = Math.max(peak, Math.abs(x));
  if (peak > 0) for (let i = 0; i < buf.length; i++) buf[i] *= 0.7 / peak;
  rendered.set(key, buf);
  if (rendered.size > 12) rendered.delete(rendered.keys().next().value);
  return buf;
}

// ---------------------------------------------------------------- recorded voices

/*
 * Recorded voices: a few notes of the real thing (generated with ElevenLabs
 * sound effects; see design/drone-sounds.md), each cut into a seamless loop
 * (a steady stretch whose end is crossfaded into its start, a whole number
 * of periods long). The loop nearest the wanted note, never more than three
 * semitones away, is retuned to it exactly by playback rate. Each file holds
 * `margin` seconds of the loop's own continuation before and after it, so
 * the loop points stay inside seamless material even if a decoder shifts the
 * audio a little. `hz` is each loop's measured pitch.
 */
export const SAMPLED = {
  cello: { level: 1.25, wet: 0.14, loops: [
    { file: 'cello-D2.mp3', hz: 73.496, margin: 0.3, loop: 2.421769 },
    { file: 'cello-E2.mp3', hz: 83.053, margin: 0.3, loop: 3.636327 },
    { file: 'cello-G2.mp3', hz: 99.774, margin: 0.3, loop: 6.003583 },
    { file: 'cello-D3.mp3', hz: 146.51, margin: 0.3, loop: 3.856349 },
    { file: 'cello-A3.mp3', hz: 219.401, margin: 0.3, loop: 1.978095 },
  ] },
};

/** The loop nearest a pitch (in semitones). */
export function nearestLoop(loops, hz) {
  return loops.reduce((best, l) => (Math.abs(Math.log2(hz / l.hz)) < Math.abs(Math.log2(hz / best.hz)) ? l : best));
}

const decodedLoops = new WeakMap(); // context -> Map(file -> Promise<AudioBuffer>)
function loadLoop(ctx, file) {
  if (!decodedLoops.has(ctx)) decodedLoops.set(ctx, new Map());
  const cache = decodedLoops.get(ctx);
  if (!cache.has(file)) {
    const url = new URL(`../assets/audio/drone/${file}`, import.meta.url);
    const p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`${file}: ${r.status}`); return r.arrayBuffer(); })
      .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)));
    p.catch(() => cache.delete(file)); // try again next time
    cache.set(file, p);
  }
  return cache.get(file);
}

/** Load (once) every loop of a recorded voice, so changing notes is instant. */
export function preload(ctx, voice) {
  for (const l of SAMPLED[voice]?.loops || []) loadLoop(ctx, l.file).catch(() => {});
}

// ---------------------------------------------------------------- the engine

/** A hall: decaying stereo noise, darker as it fades. */
function hall(ctx, sec = 2.8) {
  const sr = ctx.sampleRate;
  const n = Math.round(sec * sr);
  const ir = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let s = 777 + ch * 31;
    let lp = 0;
    const pre = Math.round(0.018 * sr);
    for (let i = pre; i < n; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      const t = (i - pre) / sr;
      const k = 0.55 + 0.4 * Math.min(1, t / sec); // the tail loses its highs
      lp = lp * k + ((s / 4294967296) * 2 - 1) * (1 - k);
      d[i] = lp * Math.exp((-6.9 * t) / sec) * 3;
    }
  }
  return ir;
}

const FADE_IN = 0.65; // time constants: about 2 s in, 1.5 s out
const FADE_OUT = 0.45;

export class Drone {
  /** @param {BaseAudioContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.4;
    this.out.connect(comp).connect(ctx.destination);
    this.bus = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.verb = ctx.createConvolver();
    this.verb.buffer = hall(ctx);
    this.bus.connect(this.dry).connect(this.out);
    this.bus.connect(this.verb).connect(this.wet).connect(this.out);
    this.current = null;
    this.volume = 0.8;
    this.out.gain.value = this.volume;
  }

  setVolume(v) {
    this.volume = v;
    this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  get playing() {
    return !!this.current;
  }

  /**
   * Start, or move to a new note or voice: the new sound fades in while the
   * old one fades out. { midi, voice, a4, fifth }.
   */
  async play({ midi, voice, a4 = 440, fifth = false }) {
    const ticket = (this.ticket = (this.ticket || 0) + 1);
    const f0 = a4 * 2 ** ((midi - 69) / 12);
    let id = SAMPLED[voice] || LIVE[voice] || PLUCKED[voice] ? voice : 'cello';
    const addFifth = fifth && !VOICES.find((x) => x.id === id)?.fifth;
    // A recorded voice: the loops nearest the note (and its fifth).
    let recorded = null;
    if (SAMPLED[id]) {
      const want = addFifth ? [f0, f0 * 1.5] : [f0];
      try {
        recorded = await Promise.all(want.map(async (hz) => {
          const l = nearestLoop(SAMPLED[id].loops, hz);
          return { l, rate: hz / l.hz, buffer: await loadLoop(this.ctx, l.file) };
        }));
      } catch {
        recorded = null; // couldn't load: the synthesized voice instead
        if (!LIVE[id]) id = 'cello';
      }
    }
    const loops = PLUCKED[id] ? [await renderPlucked(id, f0)] : null;
    if (ticket !== this.ticket) return; // replaced while loading or rendering
    const t = this.ctx.currentTime + 0.02;
    this.fadeOut(t);
    const v = { gain: this.ctx.createGain(), nodes: [] };
    v.gain.gain.setValueAtTime(0, t);
    v.gain.gain.setTargetAtTime(1, t, FADE_IN);
    v.gain.connect(this.bus);
    const wet = ((recorded && SAMPLED[id]) || LIVE[id] || PLUCKED[id]).wet ?? 0.32;
    this.wet.gain.setTargetAtTime(wet, t, 0.5);
    this.dry.gain.setTargetAtTime(1 - wet * 0.5, t, 0.5);
    if (recorded) {
      recorded.forEach(({ l, rate, buffer }, i) => {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.loopStart = l.margin;
        src.loopEnd = l.margin + l.loop;
        src.playbackRate.value = rate;
        const g = this.ctx.createGain();
        g.gain.value = SAMPLED[id].level * (i ? 0.5 : 1) * (recorded.length > 1 ? 0.85 : 1);
        src.connect(g).connect(v.gain);
        // Start somewhere along the loop, so repeated plays don't always begin alike.
        src.start(t, l.margin + ((midi * 0.37 + i * 1.7) % 1) * l.loop * 0.5);
        v.nodes.push(src);
      });
    } else if (loops) {
      const b = this.ctx.createBuffer(1, loops[0].length, RENDER_RATE);
      b.copyToChannel(loops[0], 0);
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = PLUCKED[id].level;
      src.connect(g).connect(v.gain);
      src.start(t);
      v.nodes.push(src);
    } else {
      const spec = LIVE[id];
      const lvl = this.ctx.createGain();
      lvl.gain.value = spec.level * (addFifth ? 0.8 : 1);
      lvl.connect(v.gain);
      spec.layers.forEach((layer, i) => sustained(this.ctx, lvl, f0, layer, t, v.nodes, i + 1));
      if (addFifth) {
        const g5 = this.ctx.createGain();
        g5.gain.value = 0.5;
        g5.connect(lvl);
        // A pure fifth above (3:2): beatless against the drone.
        spec.layers.forEach((layer, i) => sustained(this.ctx, g5, f0 * 1.5, { ...layer, air: null }, t, v.nodes, i + 11));
      }
    }
    this.current = v;
  }

  /** Fade out and stop. */
  stop() {
    this.ticket = (this.ticket || 0) + 1;
    this.fadeOut(this.ctx.currentTime);
  }

  fadeOut(t) {
    const v = this.current;
    this.current = null;
    if (!v) return;
    const g = v.gain.gain;
    if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(t);
    else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
    g.setTargetAtTime(0, t, FADE_OUT);
    const end = t + FADE_OUT * 8;
    for (const n of v.nodes) { try { n.stop(end); } catch { /* already stopped */ } }
    setTimeout(() => { try { v.gain.disconnect(); } catch { /* gone */ } }, (end - this.ctx.currentTime + 0.5) * 1000);
  }
}

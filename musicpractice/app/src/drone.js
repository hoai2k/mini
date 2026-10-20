// The Drone: a sustained tone to play along with. Pitches, the timed
// sequences that move between them, and the sound engine.
//
// The voices (cello, soft cello, organ) play recordings: steady seamless loops
// on a few notes, retuned by playback rate (see SAMPLED and
// design/drone-sounds.md). If their files can't load, a synthesized version
// plays instead: oscillators whose harmonics are shaped by the instrument's
// body resonances at the exact pitch, with slow random drift so the tone
// lives. The Synth organ is that synthesized organ on purpose: pipes (8', 4'
// and 16') with a touch of wind. All go through a warm hall reverb, and fade
// in and out smoothly.
// More voices (cello section, tanpura, sitar, shruti box, bagpipes) were
// recorded but aren't good enough yet; their loops are archived in
// design/sounds/drone/archive/ (not published), with their settings.

import { TEXT } from './text-config.js';
import { output } from './output.js';

// Four octaves, every note four times: the cello's own two from its open C
// string (C2 to B3), and an octave more each way.
export const DRONE_MIN = 24; // C1
export const DRONE_MAX = 71; // B4

/** Keep a note in the drone range by octaves. */
export function wrap(midi) {
  let m = Math.round(midi);
  while (m > DRONE_MAX) m -= 12;
  while (m < DRONE_MIN) m += 12;
  return m;
}

export const VOICES = ['cello', 'cello-soft', 'organ', 'organ-synth'].map((id) => ({ id, label: TEXT.drone.voices[id] }));

/** What happens when a timed drone's time is up. */
export const SEQUENCES = ['stop', 'chrom-up', 'chrom-down', 'major-up', 'major-down', 'fifths', 'fourths']
  .map((id) => ({ id, label: TEXT.drone.sequences[id] }));

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** Which way each sequence moves, for spelling: up the sharps, down (and round the fourths) the flats. */
export const SEQ_DIRECTION = { 'chrom-up': 1, 'chrom-down': -1, 'major-up': 1, 'major-down': -1, fifths: 1, fourths: -1 };

/**
 * How the drone spells a black-key note: the Accidentals setting ('sharps'
 * or 'flats' always), or on 'auto' by the way the note was reached, sharps
 * going up and flats going down, keeping `current` when there was no way
 * (a note picked from the list, or nothing yet).
 */
export function spelling(accidentals, current, direction = 0) {
  if (accidentals === 'sharps' || accidentals === 'flats') return accidentals;
  if (direction > 0) return 'sharps';
  if (direction < 0) return 'flats';
  return current === 'flats' ? 'flats' : 'sharps';
}

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

const SPECTRA = {
  // Helmholtz motion (1/n) through the body, a weak 9th (bowed a ninth of the way along).
  cello: (n, f) => (1 / n) * celloBody(f) * (n % 9 === 0 ? 0.25 : 1),
  celloBright: (n, f) => (1 / n ** 0.6) * celloBody(f) * (n % 9 === 0 ? 0.25 : 1),
  celloSoft: (n, f) => (1 / n ** 1.55) * celloBody(f),
  organ: (n) => [1, 0.38, 0.22, 0.14, 0.09, 0.06, 0.045, 0.035, 0.025, 0.02][n - 1] ?? 0,
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

/** Each live voice (synthesized): its layers, and how loud it is overall. */
const LIVE = {
  cello: { level: 0.5, layers: [
    { spectrum: 'cello', bright: 'celloBright', drift: 1.8, breath: 0.1, air: { freq: 2400, gain: 0.05 } },
  ] },
  'cello-soft': { level: 0.42, layers: [
    { spectrum: 'celloSoft', drift: 1.4, driftRate: 0.07, breath: 0.08, breathRate: 0.08, air: { freq: 1300, q: 0.7, gain: 0.025 } },
  ] },
  organ: { level: 0.42, wet: 0.45, layers: [
    { spectrum: 'organ', drift: 0.3, air: { freq: 1800, q: 0.6, gain: 0.012 } }, // 8', with a little wind
    { spectrum: 'organ', ratio: 2, gain: 0.32, cents: 0.8, pan: 0.2, drift: 0.3 }, // 4'
    { spectrum: 'organ', ratio: 0.5, gain: 0.45, pan: -0.2, drift: 0.2 }, // 16'
  ] },
};
// The Synth organ voice: the synthesized organ itself, level with the recordings.
LIVE['organ-synth'] = { ...LIVE.organ, level: 0.3 };

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
// The loops' slow swells of level (the bow, the bellows) were divided out
// once more after cutting (design/source/drone/smooth.mjs), so each holds
// steady: its level swings 0.5-2.2% where the cut loops swung 3-11%.
export const SAMPLED = {
  // D1 and G1 are D2 and G2 at half speed (an octave down, twice as long), and
  // A3 to A4 is an octave apart, so the cello stretches up to 6 semitones.
  cello: { level: 1.25, wet: 0.14, maxShift: 6, loops: [
    { file: 'cello-D1.mp3', hz: 37.123, margin: 0.6, loop: 9.88653 },
    { file: 'cello-G1.mp3', hz: 49.885, margin: 0.6, loop: 11.626304 },
    { file: 'cello-D2.mp3', hz: 74.246, margin: 0.3, loop: 4.943265 },
    { file: 'cello-G2.mp3', hz: 99.77, margin: 0.3, loop: 5.813152 },
    { file: 'cello-D3.mp3', hz: 144.6, margin: 0.3, loop: 6.245238 },
    { file: 'cello-A3.mp3', hz: 220.49, margin: 0.3, loop: 11.274376 },
    { file: 'cello-A4.mp3', hz: 440.989, margin: 0.3, loop: 7.360544 },
  ] },
  // G1 is G2 at half speed (an octave down, twice as long). Pipes stay natural
  // stretched a long way: up to 7 semitones between the recordings, and 8.5
  // down from G1, so C1 is reached even with A4 tuned down to 415.
  organ: { level: 1.4, wet: 0.3, maxShift: 8.5, loops: [
    { file: 'organ-G1.mp3', hz: 49.113, margin: 0.6, loop: 13.68381 },
    { file: 'organ-G2.mp3', hz: 98.225, margin: 0.3, loop: 6.841905 },
    { file: 'organ-C3.mp3', hz: 130.861, margin: 0.3, loop: 7.779274 },
    { file: 'organ-D3.mp3', hz: 147.984, margin: 0.3, loop: 10.365805 },
    { file: 'organ-F3.mp3', hz: 175.002, margin: 0.3, loop: 10.771429 },
    { file: 'organ-C4.mp3', hz: 262.5, margin: 0.3, loop: 7.779048 },
    { file: 'organ-A4.mp3', hz: 440.997, margin: 0.3, loop: 10.668934 },
  ] },
};

// The soft cello: the same steady cello, darker (as if bowed over the
// fingerboard, sul tasto), with a little more room.
SAMPLED['cello-soft'] = { ...SAMPLED.cello, level: 1.2, wet: 0.2, lowpass: 900 };


/**
 * The loop for a pitch: the nearest (in semitones), with `target`, the pitch
 * to retune it to. An instrument with a narrower natural range than the drone
 * plays a note it can't reach within `maxShift` semitones an octave up or
 * down instead (the same note name), rather than stretching a recording so
 * far it stops sounding like itself.
 */
export function nearestLoop(loops, hz, maxShift = 4) {
  const shift = (h, l) => Math.abs(12 * Math.log2(h / l.hz));
  const pick = (h) => loops.reduce((best, l) => (shift(h, l) < shift(h, best) ? l : best));
  let best = { ...pick(hz), target: hz };
  if (shift(hz, best) > maxShift) {
    for (const h of [hz * 2, hz / 2]) {
      const l = pick(h);
      if (shift(h, l) < shift(best.target, best)) best = { ...l, target: h };
    }
  }
  return best;
}

const decodedLoops = new WeakMap(); // context -> Map(file -> Promise<AudioBuffer>)
export function loadLoop(ctx, file) {
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

// ---------------------------------------------------------------- for the apps

/*
 * In the iOS and Android apps the drone plays through native code
 * (nativeaudio.js), which only plays loops. A synthesized voice is handed
 * over as loops too: a few notes of it rendered here, each a whole number of
 * periods long with its end crossfaded into its start, retuned like the
 * recordings.
 */
export const SYNTH_ANCHORS = [24, 30, 36, 42, 48, 54, 60, 66, 72, 78]; // C1 to F♯5 (B4's fifth), every 6 semitones
export const SYNTH_MAX_SHIFT = 3;

/** The synthesized voice's settings for native playback: { level, wet }. */
export const synthSpec = (voice) => (LIVE[voice] ? { level: LIVE[voice].level, wet: LIVE[voice].wet ?? 0.32 } : null);

/** One seamless mono loop of a synthesized voice at f0. */
export async function renderSynthLoop(voice, f0, { sampleRate = 44100, seconds = 2.5, skip = 0.3, xfade = 0.5 } = {}) {
  const spec = LIVE[voice];
  const L = Math.round(Math.round(seconds * f0) * (sampleRate / f0)); // whole periods
  const X = Math.round(xfade * sampleRate);
  const S = Math.round(skip * sampleRate); // past the start's transients
  const ctx = new OfflineAudioContext(1, S + L + X, sampleRate);
  const lvl = ctx.createGain();
  lvl.connect(ctx.destination);
  spec.layers.forEach((layer, i) => sustained(ctx, lvl, f0, layer, 0, [], i + 1));
  const a = (await ctx.startRendering()).getChannelData(0);
  const out = new Float32Array(L);
  for (let i = 0; i < L; i++) {
    // The start blends from the loop's continuation, so the end runs into it seamlessly.
    out[i] = i < X ? a[S + i] * (i / X) + a[S + L + i] * (1 - i / X) : a[S + i];
  }
  return out;
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

const FADE_IN = 0.65; // time constants: about 2 s in, 1.5 s out when moving to a new note
const FADE_OUT = 0.45;
const STOP = 0.012; // pausing: gone in about 50 ms, quick enough to feel instant, without a click

/*
 * The volume: the slider (0 to 1) to a gain, on a curve so equal moves of
 * the bow sound like equal steps, reaching DRONE_MAX_GAIN at the top: as
 * loud as the drone can go without clipping (a limiter after the compressor
 * keeps it under full scale). DRONE_DEFAULT is where a new drone starts: as
 * loud as YouTube plays (about -14 LUFS for the cello on C3 with its fifth;
 * the organ a little louder). Volumes saved before are carried over at the
 * same loudness (settings.js).
 */
export const DRONE_MAX_GAIN = 2.8;
export const droneGain = (v) => DRONE_MAX_GAIN * Math.max(0, Math.min(1, v)) ** 2;
/** The slider position that gives `gain` (droneGain's inverse). */
export const droneSlider = (gain) => Math.min(1, Math.sqrt(Math.max(0, gain) / DRONE_MAX_GAIN));
export const DRONE_DEFAULT = 0.7; // gain 1.37 (it was 0.53, gain 0.8: about -19 LUFS)

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
    // Out through the shared limiter (output.js), so the loudest the volume
    // goes never clips, the fifth and a change of note included, nor does the
    // drone with the metronome, a chime or the voice over it.
    this.out.connect(comp).connect(output(ctx));
    this.bus = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.verb = ctx.createConvolver();
    this.verb.buffer = hall(ctx);
    this.bus.connect(this.dry).connect(this.out);
    this.bus.connect(this.verb).connect(this.wet).connect(this.out);
    this.current = null;
    this.volume = DRONE_DEFAULT;
    this.out.gain.value = droneGain(this.volume);
  }

  /** `v`: the slider, 0 to 1 (droneGain). */
  setVolume(v) {
    this.volume = v;
    this.out.gain.setTargetAtTime(droneGain(v), this.ctx.currentTime, 0.05);
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
    let id = SAMPLED[voice] || LIVE[voice] ? voice : 'cello';
    const addFifth = fifth;
    // A recorded voice: the loops nearest the note (and its fifth).
    let recorded = null;
    if (SAMPLED[id]) {
      const want = addFifth ? [f0, f0 * 1.5] : [f0];
      try {
        recorded = await Promise.all(want.map(async (hz) => {
          const l = nearestLoop(SAMPLED[id].loops, hz, SAMPLED[id].maxShift);
          return { l, rate: l.target / l.hz, buffer: await loadLoop(this.ctx, l.file) };
        }));
      } catch {
        recorded = null; // couldn't load: the synthesized voice instead
        if (!LIVE[id]) id = 'cello';
      }
    }
    if (ticket !== this.ticket) return; // replaced while loading
    const t = this.ctx.currentTime + 0.02;
    this.fadeOut(t);
    const v = { gain: this.ctx.createGain(), nodes: [] };
    v.gain.gain.setValueAtTime(0, t);
    v.gain.gain.setTargetAtTime(1, t, FADE_IN);
    v.gain.connect(this.bus);
    const wet = ((recorded && SAMPLED[id]) || LIVE[id]).wet ?? 0.32;
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
        if (SAMPLED[id].lowpass) {
          const lp = this.ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = SAMPLED[id].lowpass;
          lp.Q.value = 0.5;
          src.connect(lp).connect(g);
        } else {
          src.connect(g);
        }
        g.connect(v.gain);
        // Start somewhere along the loop, so repeated plays don't always begin alike.
        src.start(t, l.margin + ((midi * 0.37 + i * 1.7) % 1) * l.loop * 0.5);
        v.nodes.push(src);
      });
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

  /** Stop, at once: the sound and the hall's ring go in about 50 ms. */
  stop() {
    this.ticket = (this.ticket || 0) + 1;
    const t = this.ctx.currentTime;
    this.fadeOut(t, STOP);
    this.wet.gain.cancelScheduledValues(t);
    this.wet.gain.setTargetAtTime(0, t, STOP);
  }

  fadeOut(t, tc = FADE_OUT) {
    const v = this.current;
    this.current = null;
    if (!v) return;
    const g = v.gain.gain;
    if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(t);
    else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
    g.setTargetAtTime(0, t, tc);
    const end = t + tc * 8;
    for (const n of v.nodes) { try { n.stop(end); } catch { /* already stopped */ } }
    setTimeout(() => { try { v.gain.disconnect(); } catch { /* gone */ } }, (end - this.ctx.currentTime + 0.5) * 1000);
  }
}

// The piano: sampled notes (one every minor third, transposed to fill in),
// a little room reverb, a compressor, and a chime for a solved melody.
//
// Each instrument loads its samples once; the AudioContext is created at load
// (decoding works while it is suspended) and resumed on the first gesture.

export const INSTRUMENTS = {
  grand: { label: 'Concert Grand', dir: 'grand', release: 0.16, gain: 1 },
  felt: { label: 'Felt Piano', dir: 'grand', release: 0.24, gain: 1.35, lowpass: 1500, attack: 0.018 },
  bright: { label: 'Bright Piano', dir: 'bright', release: 0.14, gain: 0.95 },
  epiano: { label: 'Electric Piano', dir: 'epiano', release: 0.22, gain: 1.05 },
};
export const SAMPLE_LO = 21; // A0
export const SAMPLE_HI = 108; // C8
const STEP = 3;
// Samples deliberately not recorded (see design/source/fetch_samples.py): a neighbour stands in.
const MISSING = new Set(['grand/108']);
const MAX_VOICES = 28;

/** The sample to play for a midi note and the playback rate that tunes it. */
export function sampleFor(midi) {
  const s = Math.min(SAMPLE_HI, Math.max(SAMPLE_LO, SAMPLE_LO + Math.round((midi - SAMPLE_LO) / STEP) * STEP));
  return { sample: s, rate: 2 ** ((midi - s) / 12) };
}

export function createAudio({ base = 'assets/samples/', context } = {}) {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const ctx = context || new AC({ latencyHint: 'interactive' });
  // iOS: play through the ringer switch like a music app would.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* older Safari */ }

  const out = ctx.createDynamicsCompressor();
  out.threshold.value = -10; out.knee.value = 8; out.ratio.value = 4; out.attack.value = 0.003; out.release.value = 0.2;
  // The gate: shut while the player has muted the game or the page is away.
  const gate = ctx.createGain(); gate.connect(ctx.destination);
  out.connect(gate);
  let muted = false, away = false;
  const applyGate = () => gate.gain.setTargetAtTime(muted || away ? 0 : 1, ctx.currentTime, 0.03);
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(out);
  const dry = ctx.createGain(); dry.connect(master);
  const wet = ctx.createGain(); wet.gain.value = 0.18;
  const verb = ctx.createConvolver(); verb.buffer = impulse(2.2); verb.connect(wet); wet.connect(master);
  const bus = ctx.createBiquadFilter(); bus.type = 'lowpass'; bus.frequency.value = 20000; bus.Q.value = 0.4;
  bus.connect(dry); bus.connect(verb);
  // The melody plays on its own, quieter channel, so the player's keys sit on
  // top of it when they play along.
  const melodyBus = ctx.createGain(); melodyBus.gain.value = 0.55; melodyBus.connect(bus);

  const kits = {}; // dir -> { buffers: Map, ready: Promise }
  let inst = INSTRUMENTS.grand;
  const voices = []; // { midi, src, g, t }

  function impulse(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; // soften the tail
        d[i] = lp * (1 - t) ** 3.2 * (i < 220 ? i / 220 : 1);
      }
    }
    return b;
  }

  function load(dir, onProgress) {
    if (kits[dir]) return kits[dir].ready;
    const buffers = new Map();
    const list = [];
    for (let m = SAMPLE_LO; m <= SAMPLE_HI; m += STEP) if (!MISSING.has(`${dir}/${m}`)) list.push(m);
    let done = 0;
    const ready = Promise.all(list.map(async (m) => {
      try {
        const res = await fetch(`${base}${dir}/${m}.mp3`);
        const data = await res.arrayBuffer();
        const buf = await new Promise((ok, no) => ctx.decodeAudioData(data, ok, no));
        buffers.set(m, buf);
      } catch { /* a missing sample borrows its neighbour's */ }
      done++;
      onProgress?.(done, list.length);
    })).then(() => buffers.size > 0);
    kits[dir] = { buffers, ready };
    return ready;
  }

  function bufferFor(midi) {
    const kit = kits[inst.dir];
    if (!kit) return null;
    let { sample, rate } = sampleFor(midi);
    for (let d = 0; d <= 90; d += STEP) {
      for (const s of [sample - d, sample + d]) {
        const b = kit.buffers.get(s);
        if (b) return { buf: b, rate: rate * 2 ** ((sample - s) / 12) };
      }
    }
    return null;
  }

  // Release a voice at `when`. A release can be brought forward (stopping a
  // melody cuts notes whose release was scheduled for later) but never pushed back.
  function stopVoice(v, when = ctx.currentTime, tau = inst.release) {
    if (v.stopAt !== undefined && v.stopAt <= when) return;
    v.stopAt = when;
    v.stopped = true;
    v.g.gain.cancelScheduledValues(when);
    // A note stopped before it sounds stays silent.
    v.g.gain.setValueAtTime(when < v.t + 0.004 ? 0 : v.level, when);
    v.g.gain.setTargetAtTime(0, when, tau);
    try { v.src.stop(when + tau * 8); } catch { /* already stopped */ }
  }

  /** Strike a note. Returns a handle for release(), or null if not loaded. */
  function noteOn(midi, { when = 0, velocity = 0.85, melody = false } = {}) {
    const found = bufferFor(midi);
    if (!found) return null;
    const t = Math.max(ctx.currentTime, when || ctx.currentTime);
    // Re-striking a ringing string damps it first (the melody and the player each have their own strings).
    for (const v of voices) if (v.midi === midi && v.melody === melody && v.t <= t && !(v.stopAt <= t)) stopVoice(v, t, 0.03);
    const src = ctx.createBufferSource();
    src.buffer = found.buf;
    src.playbackRate.value = found.rate;
    const g = ctx.createGain();
    // Louder strikes are brighter: approximate with a gentle level curve.
    const level = inst.gain * (0.25 + 0.75 * velocity ** 1.6);
    const a = inst.attack || 0.004;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + a);
    src.connect(g); g.connect(melody ? melodyBus : bus);
    src.start(t);
    const v = { midi, src, g, t, level, melody, stopped: false };
    src.onended = () => { const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); g.disconnect(); };
    voices.push(v);
    const ringing = () => voices.filter((x) => !(x.stopAt <= ctx.currentTime));
    while (ringing().length > MAX_VOICES) stopVoice(ringing()[0], ctx.currentTime, 0.05);
    return v;
  }

  function noteOff(v, when = 0) { if (v) stopVoice(v, Math.max(ctx.currentTime, when || ctx.currentTime)); }

  function stopAll() { for (const v of voices) stopVoice(v, ctx.currentTime, 0.06); }

  /** A soft bell arpeggio for a solved melody (independent of the piano). */
  function chime(stars = 3) {
    const t0 = ctx.currentTime + 0.05;
    const freqs = [1318.5, 1661.2, 1975.5, 2637].slice(0, stars + 1);
    freqs.forEach((f, i) => {
      const t = t0 + i * 0.09;
      for (const [mult, amp] of [[1, 0.08], [2.76, 0.025], [5.4, 0.01]]) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / mult);
        o.connect(g); g.connect(dry); g.connect(verb);
        o.start(t); o.stop(t + 1.7);
      }
    });
  }

  /** A short soft thud for a wrong note, under the note itself. */
  function thud() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(dry); o.start(t); o.stop(t + 0.2);
  }

  async function setInstrument(name, onProgress) {
    inst = INSTRUMENTS[name] || INSTRUMENTS.grand;
    bus.frequency.setTargetAtTime(inst.lowpass || 20000, ctx.currentTime, 0.02);
    return load(inst.dir, onProgress);
  }

  function unlock() {
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  }

  return {
    ctx,
    noteOn, noteOff, stopAll, chime, thud, setInstrument, unlock,
    get instrument() { return inst; },
    get running() { return ctx.state === 'running'; },
    setMuted(m) { muted = !!m; applyGate(); },
    setAway(a) { away = !!a; applyGate(); },
    // For checks: what the output gate is aimed at.
    state() { return { muted, away, gate: muted || away ? 0 : 1 }; },
    setMelodyLevel(v) { melodyBus.gain.setTargetAtTime(v, ctx.currentTime, 0.03); },
    setVolume(v) { master.gain.setTargetAtTime(v * 0.95, ctx.currentTime, 0.02); },
    setReverb(v) { wet.gain.setTargetAtTime(v * 0.45, ctx.currentTime, 0.05); dry.gain.setTargetAtTime(1 - v * 0.25, ctx.currentTime, 0.05); },
    now: () => ctx.currentTime,
  };
}

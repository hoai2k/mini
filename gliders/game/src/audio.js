// Sound, all synthesised: wind that rises with speed, a whoosh when close to
// a surface, chimes for tricks and banks, a thud for a crash, menu ticks, and
// a slow generative ambient score.

import { SOUNDS } from './audio-list.js';

const PENTA = [0, 2, 4, 7, 9];
const WIND_LAYERS = ['wind-glide', 'wind-fast', 'wind-dive', 'wind-close', 'flutter'];
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createAudio() {
  let ctx = null;
  let master, music, sfx, windGain, windFilter, whooshGain, whooshFilter;
  let musicTimer = null;
  // Recorded sounds (ElevenLabs), decoded once the context exists.
  const buffers = {};
  let windBus = null, windTone = null;
  const layers = {}; // id -> { src, gain }
  let recordedWind = false;
  const vol = { master: 0.8, music: 0.5, sfx: 0.8 };

  function noiseBuffer(seconds = 2) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      // Brownish noise: smoother than white.
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    return b;
  }

  // Muted while the tab is hidden or the window is not focused.
  let away = typeof document !== 'undefined' && (document.hidden || !document.hasFocus());
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended' && !away) ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    if (away) ctx.suspend().catch(() => {});
    master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    master.connect(comp).connect(ctx.destination);
    music = ctx.createGain();
    sfx = ctx.createGain();
    music.connect(master);
    sfx.connect(master);
    applyVolumes();

    const nb = noiseBuffer(3);
    const wind = ctx.createBufferSource();
    wind.buffer = nb;
    wind.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.Q.value = 0.7;
    windFilter.frequency.value = 400;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    wind.connect(windFilter).connect(windGain).connect(sfx);
    wind.start();

    const whoosh = ctx.createBufferSource();
    whoosh.buffer = nb;
    whoosh.loop = true;
    whoosh.playbackRate.value = 1.7;
    whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = 'highpass';
    whooshFilter.frequency.value = 900;
    whooshGain = ctx.createGain();
    whooshGain.gain.value = 0;
    whoosh.connect(whooshFilter).connect(whooshGain).connect(sfx);
    whoosh.start(0, 1.1);
    loadSounds();
    return true;
  }

  async function loadSounds() {
    await Promise.all(
      Object.entries(SOUNDS).map(async ([id, s]) => {
        const list = await Promise.all(
          s.files.map(async (f) => {
            try {
              const res = await fetch(f.startsWith('assets/') ? f : 'assets/audio/' + f);
              return await ctx.decodeAudioData(await res.arrayBuffer());
            } catch {
              return null;
            }
          }),
        );
        buffers[id] = list.filter(Boolean);
      }),
    );
    if (!WIND_LAYERS.every((id) => buffers[id]?.length)) return;
    // The recorded wind: five loops through one filter that opens with speed.
    windTone = ctx.createBiquadFilter();
    windTone.type = 'lowpass';
    windTone.frequency.value = 2000;
    windTone.Q.value = 0.4;
    windBus = ctx.createGain();
    windBus.gain.value = 0;
    windTone.connect(windBus).connect(sfx);
    for (const id of WIND_LAYERS) {
      const src = ctx.createBufferSource();
      src.buffer = buffers[id][0];
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(id === 'wind-close' || id === 'flutter' ? windBus : windTone);
      src.start(0, Math.random() * src.buffer.duration);
      layers[id] = { src, gain };
    }
    recordedWind = true;
    // The synthesised wind steps aside.
    windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    whooshGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  }

  function sample(id, { gain = 1, rate = 1 } = {}) {
    const list = buffers[id];
    if (!ctx || !list?.length) return false;
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(sfx);
    src.start();
    return true;
  }

  function applyVolumes() {
    if (!ctx) return;
    master.gain.value = vol.master;
    music.gain.value = vol.music * 0.55;
    sfx.gain.value = vol.sfx;
  }

  function tone(freq, { type = 'sine', dur = 0.25, gain = 0.2, attack = 0.005, when = 0, dest = sfx, glide = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // --- Generative score: four slow chords, a pad and a few plucked notes.
  const CHORDS = [
    [57, 64, 67, 72], // Am7-ish
    [53, 60, 64, 69], // Fmaj7
    [48, 55, 64, 67], // C
    [55, 62, 66, 71], // G/B-ish
  ];
  let chordIndex = 0;
  function musicStep() {
    if (!ctx) return;
    const chord = CHORDS[chordIndex++ % CHORDS.length];
    const t = ctx.currentTime;
    for (const n of chord) {
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o2.type = 'triangle';
      o.frequency.value = midi(n);
      o2.frequency.value = midi(n) * 1.004;
      f.type = 'lowpass';
      f.frequency.setValueAtTime(500, t);
      f.frequency.linearRampToValueAtTime(1100, t + 3);
      f.frequency.linearRampToValueAtTime(600, t + 6);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + 1.6);
      g.gain.linearRampToValueAtTime(0.0, t + 6.4);
      o.connect(f);
      o2.connect(f);
      f.connect(g).connect(music);
      o.start(t);
      o2.start(t);
      o.stop(t + 6.6);
      o2.stop(t + 6.6);
    }
    // Plucks on a pentatonic scale over the chord's root.
    const root = chord[0] + 12;
    for (let i = 0; i < 6; i++) {
      if (Math.random() < 0.45) continue;
      const n = root + PENTA[Math.floor(Math.random() * PENTA.length)] + (Math.random() < 0.3 ? 12 : 0);
      tone(midi(n), { type: 'triangle', dur: 1.4, gain: 0.05, when: i * 0.8 + Math.random() * 0.1, dest: music });
    }
  }

  function setAway(v) {
    away = v;
    if (!ctx) return;
    if (away) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => setAway(document.hidden || !document.hasFocus()));
    addEventListener('blur', () => setAway(true));
    addEventListener('focus', () => setAway(document.hidden));
  }

  return {
    unlock: ensure,
    get muted() {
      return away || !ctx || ctx.state !== 'running';
    },
    // For the browser check: which wind is playing and how loud each layer is.
    debug() {
      return {
        recordedWind,
        loaded: Object.fromEntries(Object.entries(buffers).map(([k, v]) => [k, v.length])),
        layers: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, +v.gain.gain.value.toFixed(3)])),
        bus: windBus ? +windBus.gain.value.toFixed(3) : 0,
      };
    },
    setVolumes(v) {
      Object.assign(vol, v);
      applyVolumes();
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicStep();
      musicTimer = setInterval(musicStep, 4800);
    },
    stopMusic() {
      clearInterval(musicTimer);
      musicTimer = null;
    },
    // Called every frame in play: speed 0..150 m/s, closeness 0..1 and flare 0..1
    // (the most of any player). The wind is the heart of the sound: three beds
    // crossfaded by speed, pitched up a little as you go faster, a rush that
    // rises near surfaces and a membrane flutter that rises with speed and flare.
    flight(speed, closeness, active, flare = 0, g = 1, updraft = 0) {
      if (!ctx) return;
      const t = ctx.currentTime;
      if (recordedWind) {
        const on = active ? 1 : 0;
        const set = (id, g, rate, tc = 0.12) => {
          layers[id].gain.gain.setTargetAtTime(g * on, t, tc);
          layers[id].src.playbackRate.setTargetAtTime(rate, t, 0.25);
        };
        // Heavy G loads the wind (the roar and flutter rise, pitch sags a
        // touch); an updraft gusts.
        const load = smooth(1.6, 6, g);
        const gust = smooth(2, 15, updraft);
        const glide = 1 - smooth(30, 70, speed) * 0.8;
        const fast = smooth(22, 55, speed) * (1 - smooth(110, 150, speed) * 0.4) + gust * 0.5;
        const dive = smooth(65, 125, speed) + load * 0.5;
        set('wind-glide', glide * 0.9, 0.88 + speed / 500);
        set('wind-fast', Math.min(1.3, fast), 0.86 + speed / 330 - load * 0.05 + gust * 0.06);
        set('wind-dive', Math.min(1.5, dive * 1.1), 0.88 + speed / 450 - load * 0.06);
        set('wind-close', Math.pow(closeness, 1.3) * (0.35 + smooth(20, 70, speed) * 0.9), 0.9 + closeness * 0.25 + speed / 600, 0.05);
        set('flutter', smooth(35, 110, speed) * 0.35 + flare * 0.45 + load * 0.4 + gust * 0.35, 0.8 + speed / 220 + flare * 0.1 + load * 0.15);
        windBus.gain.setTargetAtTime(on * (0.35 + 0.65 * smooth(10, 110, speed) + load * 0.15), t, 0.15);
        windTone.frequency.setTargetAtTime(700 + 15000 * Math.pow(smooth(15, 125, Math.max(speed, speed * (1 + load * 0.3))), 1.4), t, 0.12);
        return;
      }
      const k = active ? Math.min(1, speed / 110) : 0;
      windGain.gain.setTargetAtTime(0.03 + k * 0.32, t, 0.15);
      windFilter.frequency.setTargetAtTime(250 + k * 1600, t, 0.2);
      whooshGain.gain.setTargetAtTime(active ? closeness * closeness * 0.5 : 0, t, 0.06);
      whooshFilter.frequency.setTargetAtTime(700 + closeness * 2200, t, 0.08);
    },
    silenceFlight() {
      if (!ctx) return;
      windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      whooshGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      if (windBus) windBus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    },
    // Through a portal: a rising shimmer and a whoosh.
    portal() {
      if (!ctx) return;
      [60, 67, 72, 79, 84, 91].forEach((n, i) => tone(midi(n), { type: 'sine', dur: 0.9, gain: 0.09, when: i * 0.05, glide: 1.5 }));
      sample('whoosh', { gain: 1, rate: 0.7 });
    },
    // A pass-by whoosh (threading a gap, clearing a tunnel).
    passBy(speed) {
      sample('whoosh', { gain: 0.8, rate: 0.85 + Math.min(speed, 120) / 300 });
    },
    bonus(mult) {
      const base = 72 + Math.min(mult, 14);
      tone(midi(base), { type: 'triangle', dur: 0.22, gain: 0.16 });
      tone(midi(base + 7), { type: 'sine', dur: 0.3, gain: 0.1, when: 0.06 });
    },
    bank(amountScale) {
      const notes = [72, 76, 79, 84, 88];
      notes.forEach((n, i) => tone(midi(n), { type: 'triangle', dur: 0.5, gain: 0.13 + amountScale * 0.05, when: i * 0.055 }));
      tone(midi(60), { type: 'sine', dur: 0.8, gain: 0.12 });
    },
    crash() {
      if (!ctx) return;
      if (sample('crash', { gain: 1.1, rate: 0.9 + Math.random() * 0.2 })) {
        tone(90, { type: 'sine', dur: 0.4, gain: 0.25, glide: 0.5 });
        return;
      }
      tone(110, { type: 'sine', dur: 0.5, gain: 0.5, glide: 0.4 });
      tone(70, { type: 'triangle', dur: 0.7, gain: 0.3, glide: 0.5 });
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.6);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.6, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      src.connect(f).connect(g).connect(sfx);
      src.start();
    },
    countdown(final) {
      tone(final ? midi(84) : midi(72), { type: 'square', dur: final ? 0.5 : 0.15, gain: 0.08 });
    },
    move() {
      tone(midi(79), { type: 'sine', dur: 0.06, gain: 0.05 });
    },
    confirm() {
      tone(midi(84), { type: 'triangle', dur: 0.12, gain: 0.08 });
      tone(midi(91), { type: 'sine', dur: 0.16, gain: 0.05, when: 0.04 });
    },
    back() {
      tone(midi(72), { type: 'triangle', dur: 0.1, gain: 0.07, glide: 0.8 });
    },
    record() {
      [72, 76, 79, 84, 79, 84, 88, 91].forEach((n, i) => tone(midi(n), { type: 'triangle', dur: 0.35, gain: 0.12, when: i * 0.09 }));
    },
  };
}

// Sound, all synthesised: wind that rises with speed, a whoosh when close to
// a surface, chimes for tricks and banks, a thud for a crash, menu ticks, and
// a slow generative ambient score.

const PENTA = [0, 2, 4, 7, 9];

export function createAudio() {
  let ctx = null;
  let master, music, sfx, windGain, windFilter, whooshGain, whooshFilter;
  let musicTimer = null;
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

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
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

  return {
    unlock: ensure,
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
    // Called every frame in play: speed 0..150, closeness 0..1 (the most of any player).
    flight(speed, closeness, active) {
      if (!ctx) return;
      const t = ctx.currentTime;
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

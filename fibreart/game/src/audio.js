// Sound, made in the browser: a soft held chord for each scene, plucked notes
// for button actions, a breathy rush that follows swirls and tides, and a few
// chimes when a control is found or the picture moves on. Nothing to download.

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
// One root per scene, so each picture has its own key.
const ROOTS = [57, 50, 55, 52, 59, 53, 48, 45, 54, 60];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export function createAudio() {
  let ctx = null;
  let master;
  let music;
  let sfx;
  let rushGain;
  let rushFilter;
  let drone = null;
  const vol = { volume: 0.8, music: 0.6, sfx: 0.8 };

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    music = ctx.createGain();
    music.connect(master);
    sfx = ctx.createGain();
    sfx.connect(master);
    // A rush of filtered noise for the large movements.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    rushFilter = ctx.createBiquadFilter();
    rushFilter.type = 'bandpass';
    rushFilter.Q.value = 0.8;
    rushFilter.frequency.value = 500;
    rushGain = ctx.createGain();
    rushGain.gain.value = 0;
    noise.connect(rushFilter).connect(rushGain).connect(sfx);
    noise.start();
    apply();
    return true;
  }

  function apply() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(vol.volume, t, 0.05);
    music.gain.setTargetAtTime(vol.music * 0.5, t, 0.05);
    sfx.gain.setTargetAtTime(vol.sfx * 0.6, t, 0.05);
  }

  function scene(index) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    if (drone) {
      const old = drone;
      old.gain.gain.setTargetAtTime(0, t, 1.2);
      setTimeout(() => old.oscs.forEach((o) => o.stop()), 5000);
    }
    const root = ROOTS[index % ROOTS.length];
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.16, t, 2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.connect(filter).connect(music);
    const oscs = [];
    [0, 7, 16, 21].forEach((step, i) => {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = hz(root - 12 + step);
        o.detune.value = det + i;
        const g = ctx.createGain();
        g.gain.value = (i === 0 ? 0.5 : 0.22) / 2;
        // Each voice breathes at its own slow rate.
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + i * 0.031 + (det > 0 ? 0.013 : 0);
        const lg = ctx.createGain();
        lg.gain.value = g.gain.value * 0.6;
        lfo.connect(lg).connect(g.gain);
        o.connect(g).connect(gain);
        o.start();
        lfo.start();
        oscs.push(o, lfo);
      }
    });
    drone = { gain, oscs, root };
  }

  function note(step, { length = 0.9, level = 0.3, type = 'triangle', octave = 0, when = 0 } = {}) {
    if (!ensure()) return;
    const root = drone ? drone.root : 57;
    const m = root + 12 * octave + SCALE[((step % SCALE.length) + SCALE.length) % SCALE.length];
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz(m);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + length);
    o.connect(g).connect(sfx);
    o.start(t);
    o.stop(t + length + 0.05);
  }

  return {
    unlock: ensure,
    set(v) {
      Object.assign(vol, v);
      apply();
    },
    scene,
    // A plucked note for a button action; `size` 0 small .. 2 large.
    pluck(seed, size = 0) {
      note(Math.floor(seed) % 8, { level: 0.18 + size * 0.08, octave: size === 2 ? -1 : 0, length: 0.7 + size * 0.5 });
    },
    found(scale) {
      const steps = scale === 'large' ? [0, 4, 7, 9] : scale === 'medium' ? [2, 4, 7] : [4, 7];
      steps.forEach((s, i) => note(s, { when: i * 0.09, level: 0.14, type: 'sine', octave: 1, length: 1.2 }));
    },
    woke() {
      [0, 2, 4, 7, 9].forEach((s, i) => note(s, { when: i * 0.07, level: 0.1, type: 'sine', octave: 1, length: 1.5 }));
    },
    shift() {
      [0, 4, 7, 9, 12].forEach((s, i) => note(s, { when: i * 0.16, level: 0.16, type: 'sine', length: 2.6 }));
    },
    link() {
      note(9, { level: 0.12, type: 'sine', octave: 1, length: 0.5 });
      note(11, { when: 0.06, level: 0.1, type: 'sine', octave: 1, length: 0.6 });
    },
    // Follows the size of the swirls and tides, every frame.
    rush(level) {
      if (!ctx || !rushGain) return;
      const t = ctx.currentTime;
      rushGain.gain.setTargetAtTime(Math.min(0.5, level * 0.35), t, 0.15);
      rushFilter.frequency.setTargetAtTime(300 + level * 900, t, 0.2);
    },
  };
}

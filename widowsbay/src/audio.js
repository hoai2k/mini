// Score and effects with Web Audio. When the band's recording is delivered
// (assets/manifest.json → audio.song) it plays as the score; until then a
// procedural stand-in shanty in D dorian (6/8, fingerpicked guitar, a low
// organ drone and a penny-whistle line) fills in. Sea wash plays under both.

// Transposed +3 so the stand-in plays in F, the key of the band's recording.
const NOTE = (n) => 440 * 2 ** ((n + 3 - 69) / 12);
// D dorian chords as MIDI roots + voicing.
const CHORDS = {
  Dm: [50, 57, 62, 65, 69], C: [48, 55, 60, 64, 67], Am: [45, 52, 57, 60, 64], F: [41, 53, 57, 60, 65], G: [43, 55, 59, 62, 67],
};
const PROG = ['Dm', 'Dm', 'C', 'Dm', 'F', 'C', 'G', 'Dm'];
// Fingerpicking pattern over six eighth notes (indexes into voicing).
const PICK = [0, 2, 3, 1, 4, 2];
// Whistle tune, one note per eighth (null = rest), 8 bars × 6.
const TUNE = [
  74, null, 72, 69, null, 67, 69, null, null, 65, 67, 69,
  72, null, 69, 67, null, 65, 62, null, null, null, null, null,
  65, null, 67, 69, null, 72, 74, null, 72, 69, null, 67,
  67, null, 69, 65, null, 64, 62, null, null, null, null, null,
];

// Mix for recorded effects: frequent ones sit lower. Tonal effects are tuned
// to F (design/source/build_sfx.py), so they keep their pitch.
const MIX = { ui: 0.5, row: 0.55, pearl: 0.7, rockWarn: 0.6, wind: 0.8 };
const TONAL = new Set(['pearl', 'keepsake', 'done', 'arrive', 'ui']);

export function createAudio() {
  let ac = null, master, music, sfx, sea, timer = 0, playing = false;
  let nextTime = 0, step = 0;
  // The delivered song: { url, loopStart, loopEnd, buffer, loading, node }.
  let track = null;
  // Delivered effects (ElevenLabs, see design/source/build_sfx.py):
  // name -> url until decoded, then name -> AudioBuffer.
  let sfxUrls = {};
  const sfxBuf = {};
  let sfxLoading = null;
  const vol = { music: 0.7, sfx: 0.8 };
  const bpm = 104; // dotted-quarter pulse
  const eighth = 60 / bpm / 3;

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.connect(ac.destination);
    music = ac.createGain(); music.connect(master);
    sfx = ac.createGain(); sfx.connect(master);
    apply();
    loadSfx();
    return true;
  }

  function decode(url) {
    return fetch(url)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((data) => new Promise((ok, fail) => ac.decodeAudioData(data, ok, fail)));
  }
  function loadSfx() {
    if (sfxLoading || !ac) return sfxLoading;
    sfxLoading = Promise.all(Object.entries(sfxUrls).map(([name, url]) =>
      decode(url).then((b) => { sfxBuf[name] = b; }).catch(() => { /* keep the synth version */ })));
    return sfxLoading;
  }
  function playBuffer(buf, gain = 1, rate = 1) {
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ac.createGain(); g.gain.value = gain;
    src.connect(g); g.connect(sfx);
    src.start();
  }
  function apply() {
    if (!ac) return;
    music.gain.value = vol.music * 0.55;
    sfx.gain.value = vol.sfx * 0.8;
  }

  function noiseBuffer(sec = 2) {
    const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function startSea() {
    if (sfxBuf.sea) {
      // The recorded wave machine, looping under the score.
      const src = ac.createBufferSource(); src.buffer = sfxBuf.sea; src.loop = true;
      const g = ac.createGain(); g.gain.value = 0.35;
      src.connect(g); g.connect(music); src.start();
      sea = { src, g, recorded: true };
      return;
    }
    const src = ac.createBufferSource(); src.buffer = noiseBuffer(4); src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = ac.createGain(); g.gain.value = 0.12;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.12;
    const lg = ac.createGain(); lg.gain.value = 0.08;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(music);
    src.start(); lfo.start();
    sea = { src, lfo, g };
  }

  function pluck(t, midi, gain = 0.18, dest = music) {
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = NOTE(midi);
    const o2 = ac.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = NOTE(midi) * 1.003;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    const g2 = ac.createGain(); g2.gain.value = 0.25;
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + 1.2); o2.stop(t + 1.2);
  }
  function organ(t, midi, dur) {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.25); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    // gentle drive, like the song's distorted organ
    const sh = ac.createWaveShaper(); const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.2); }
    sh.curve = curve;
    for (const [m, d] of [[midi, 0], [midi + 7, 4], [midi + 12, -3]]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(m); o.detune.value = d;
      o.connect(sh); o.start(t); o.stop(t + dur + 0.05);
    }
    sh.connect(f); f.connect(g); g.connect(music);
  }
  function whistle(t, midi, dur) {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = NOTE(midi + 12);
    const v = ac.createOscillator(); v.frequency.value = 5.5; const vg = ac.createGain(); vg.gain.value = 6;
    v.connect(vg); vg.connect(o.frequency);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.04); g.gain.setValueAtTime(0.06, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(music); o.start(t); v.start(t); o.stop(t + dur + 0.05); v.stop(t + dur + 0.05);
  }

  function schedule() {
    while (nextTime < ac.currentTime + 0.2) {
      const bar = Math.floor(step / 6) % PROG.length;
      const beat = step % 6;
      const chord = CHORDS[PROG[bar]];
      pluck(nextTime, chord[PICK[beat]] + (beat === 0 ? -12 : 0), beat === 0 ? 0.22 : 0.13);
      if (beat === 0) organ(nextTime, chord[0] - 12, eighth * 6);
      const loop = Math.floor(step / 48);
      if (loop % 2 === 1) {
        const n = TUNE[step % 48];
        if (n) whistle(nextTime, n, eighth * (TUNE[(step + 1) % 48] === null ? 2 : 1) * 0.95);
      }
      nextTime += eighth * (beat % 3 === 0 ? 1.04 : 0.98); // a little lilt
      step++;
    }
  }

  async function loadTrack() {
    if (!track || track.buffer || track.loading) return track?.loading;
    track.loading = decode(track.url)
      .then((buf) => { track.buffer = buf; })
      .catch(() => { track = null; }); // missing or undecodable: keep the stand-in
    return track.loading;
  }
  function playTrack() {
    const src = ac.createBufferSource();
    src.buffer = track.buffer;
    src.loop = true;
    if (track.loopEnd) { src.loopStart = track.loopStart || 0; src.loopEnd = track.loopEnd; }
    const g = ac.createGain(); g.gain.value = 0.8;
    src.connect(g); g.connect(music);
    src.start(ac.currentTime + 0.05);
    track.node = src;
    if (sea) sea.g.gain.value = sea.recorded ? 0.12 : 0.05; // let the song carry the scene
  }
  function startProcedural() {
    nextTime = ac.currentTime + 0.1; step = 0;
    timer = setInterval(schedule, 60);
  }
  async function startMusic() {
    if (!ensure() || playing) return;
    playing = true;
    // Give the recorded sea a moment to decode before falling back to noise.
    await Promise.race([loadSfx(), new Promise((r) => setTimeout(r, 1500))]);
    if (!playing) return;
    if (!sea) startSea();
    if (track) {
      await loadTrack();
      if (!playing) return;
      if (track?.buffer) return playTrack();
    }
    startProcedural();
  }
  function stopMusic() {
    playing = false; clearInterval(timer);
    try { track?.node?.stop(); } catch { /* already stopped */ }
    if (track) track.node = null;
  }

  function env(t, g, a, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); }
  function tone(type, f0, f1, d, a = 0.3) {
    const t = ac.currentTime;
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
    const g = ac.createGain(); env(t, g, a, d);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, freq, a = 0.4, type = 'lowpass') {
    const t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuffer(d + 0.1);
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain(); env(t, g, a, d);
    s.connect(f); f.connect(g); g.connect(sfx); s.start(t);
  }

  const SFX = {
    leap: () => { tone('sine', 300, 700, 0.25, 0.18); noise(0.25, 1800, 0.12, 'bandpass'); },
    row: () => { tone('square', 180, 140, 0.06, 0.06); noise(0.08, 900, 0.1, 'bandpass'); },
    pearl: () => { const t = ac.currentTime; pluck(t, 86, 0.12, sfx); pluck(t + 0.06, 93, 0.1, sfx); },
    keepsake: () => { const t = ac.currentTime; [74, 77, 81, 86, 89].forEach((n, i) => pluck(t + i * 0.07, n, 0.14, sfx)); },
    hit: () => { tone('sine', 120, 40, 0.4, 0.5); noise(0.4, 600, 0.5); },
    wreck: () => { tone('sawtooth', 200, 30, 1.6, 0.25); noise(1.6, 400, 0.5); },
    windWarn: () => { // the witch's laugh and a whistling gust
      const t = ac.currentTime;
      for (let i = 0; i < 4; i++) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(900 - i * 90, t + i * 0.14); o.frequency.exponentialRampToValueAtTime(600 - i * 80, t + i * 0.14 + 0.12);
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.14); g.gain.exponentialRampToValueAtTime(0.06, t + i * 0.14 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.14 + 0.12);
        o.connect(g); g.connect(sfx); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.15);
      }
      noise(1.6, 1200, 0.15, 'bandpass');
    },
    wind: () => noise(0.9, 700, 0.2, 'bandpass'),
    boltWarn: () => noise(1.2, 160, 0.35),
    strike: () => { noise(0.5, 3000, 0.5, 'highpass'); tone('square', 80, 30, 0.5, 0.3); },
    rockWarn: () => noise(0.5, 300, 0.12),
    rockUp: () => tone('sine', 90, 50, 0.25, 0.3),
    arrive: () => { const t = ac.currentTime; [62, 66, 69, 74].forEach((n, i) => pluck(t + i * 0.12, n, 0.16, sfx)); },
    done: () => { const t = ac.currentTime; pluck(t, 62, 0.2, sfx); pluck(t + 0.2, 69, 0.2, sfx); pluck(t + 0.4, 74, 0.2, sfx); },
    curtain: () => noise(1.2, 500, 0.12, 'bandpass'),
    ui: () => tone('triangle', 660, 880, 0.06, 0.08),
  };

  return {
    unlock: ensure,
    startMusic, stopMusic,
    // Register the band's recording. Decoding waits for the first user
    // gesture (browsers won't start audio before one).
    setTrack(url, loopStart = 0, loopEnd = 0) {
      track = { url, loopStart, loopEnd, buffer: null, loading: null, node: null };
      if (ac) loadTrack();
    },
    usingTrack: () => !!track?.node,
    sfxLoaded: () => Object.keys(sfxBuf).length,
    play(name) {
      if (!ac) return;
      try {
        // Recorded effects get a little pitch variation so repeats don't grate.
        if (sfxBuf[name]) return playBuffer(sfxBuf[name], MIX[name] ?? 1, TONAL.has(name) ? 1 : 0.94 + Math.random() * 0.12);
        SFX[name]?.();
      } catch { /* audio is optional */ }
    },
    // Register delivered effects ({ name: url }); decoded on the first gesture.
    setSfx(urls) { sfxUrls = { ...urls }; if (ac) loadSfx(); },
    setVolumes(m, s) { vol.music = m; vol.sfx = s; apply(); },
    suspend() { ac?.suspend(); },
    resume() { ac?.resume(); },
  };
}

// Score and effects with Web Audio. The score is the band's recording
// (assets/manifest.json -> audio.song): it starts downloading as soon as the
// page opens, reports progress for the loading bar, and is decoded on the
// first user gesture. There is no stand-in music. Effects are the ElevenLabs
// recordings (design/source/build_sfx.py); the synthesised versions below
// play only if a recording fails to load.

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);

// The recording's beat grid, measured from its onsets: a steady 76.5 BPM
// (the band played to a click) with the first beat 0.33 s in, stable to
// within 0.04 s across the whole song. Acts use it for beat-timed machinery.
export const BEAT = { bpm: 76.5, period: 60 / 76.5, offset: 0.33 };

// Mix for recorded effects: frequent ones sit lower. Tonal effects are tuned
// to F (design/source/build_sfx.py), so they keep their pitch.
const MIX = { ui: 0.5, row: 0.55, pearl: 0.7, rockWarn: 0.6, wind: 0.8 };
const TONAL = new Set(['pearl', 'keepsake', 'done', 'arrive', 'ui', 'landho', 'partyHit']);

export function createAudio() {
  let ac = null, master, music, sfx, sea, playing = false;
  // The song: { url, loopStart, loopEnd, bytes, buffer, state, progress, node }.
  // state: 'loading' -> 'downloaded' -> 'decoding' -> 'ready', or 'failed'.
  let track = null;
  // Delivered effects (ElevenLabs, see design/source/build_sfx.py):
  // name -> url until decoded, then name -> AudioBuffer.
  let sfxUrls = {};
  const sfxBuf = {};
  let sfxLoading = null;
  const vol = { music: 0.7, sfx: 0.8 };

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
    decodeTrack();
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
  // Download with progress; needs no AudioContext, so it starts at page load.
  async function download() {
    try {
      const res = await fetch(track.url);
      if (!res.ok) throw new Error(res.status);
      const total = +res.headers.get('content-length') || 0;
      if (!res.body || !total) { track.bytes = await res.arrayBuffer(); }
      else {
        const reader = res.body.getReader();
        const chunks = []; let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); got += value.length;
          track.progress = Math.min(0.95, (got / total) * 0.95);
        }
        const all = new Uint8Array(got); let o = 0;
        for (const c of chunks) { all.set(c, o); o += c.length; }
        track.bytes = all.buffer;
      }
      track.state = 'downloaded'; track.progress = 0.95;
      if (ac) decodeTrack();
    } catch { track.state = 'failed'; }
  }
  function decodeTrack() {
    if (!track || track.state !== 'downloaded') return;
    track.state = 'decoding';
    new Promise((ok, fail) => ac.decodeAudioData(track.bytes, ok, fail))
      .then((buf) => {
        track.buffer = buf; track.bytes = null; track.state = 'ready'; track.progress = 1;
        if (playing && !track.node) playTrack();
      })
      .catch(() => { track.state = 'failed'; });
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
    track.startedAt = ac.currentTime + 0.05;
    if (sea) sea.g.gain.value = sea.recorded ? 0.12 : 0.05; // let the song carry the scene
  }
  async function startMusic() {
    if (!ensure() || playing) return;
    playing = true;
    // Give the recorded sea a moment to decode before falling back to noise.
    await Promise.race([loadSfx(), new Promise((r) => setTimeout(r, 1500))]);
    if (!playing) return;
    if (!sea) startSea();
    if (track?.state === 'ready') playTrack();
    else decodeTrack(); // plays as soon as it is ready
  }
  function stopMusic() {
    playing = false;
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
    // Register the band's recording and start downloading it now. Decoding
    // waits for the first user gesture (browsers won't start audio before one).
    setTrack(url, loopStart = 0, loopEnd = 0) {
      track = { url, loopStart, loopEnd, bytes: null, buffer: null, state: 'loading', progress: 0, node: null };
      download();
    },
    // { state, progress 0..1 } for the loading bar; 'none' when no song is set.
    trackStatus: () => (track ? { state: track.state, progress: track.progress } : { state: 'none', progress: 1 }),
    usingTrack: () => !!track?.node,
    // Seconds into the recording (following its loop), or null when it isn't playing.
    songTime() {
      if (!track?.node || !ac) return null;
      let t = ac.currentTime - track.startedAt;
      const end = track.loopEnd || track.buffer.duration, start = track.loopStart || 0;
      if (t > end) t = start + ((t - start) % (end - start));
      return Math.max(0, t);
    },
    // The current beat as a running number (its fraction is the phase within
    // the beat). Follows the recording; a steady clock at the same tempo if
    // the song isn't playing.
    beat() {
      const st = this.songTime();
      if (st == null) return performance.now() / 1000 / BEAT.period;
      return (st - BEAT.offset) / BEAT.period;
    },
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

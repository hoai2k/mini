// The shell's own sound: small synthesised instrument noises for the menus
// (a brass tick for focus, an objective click for select, a soft whoosh for
// the zoom) and the menu music: "Clockwork Chamber Music" on the title,
// "Clockwork Lullaby" on world select and the intros (`music(name)`, which
// crossfades and keeps each song's place). A quiet drone stands in for a song
// that can't load. The worlds play
// their own sound inside their frames; the master switch and volume set here
// are sent to them (embed `sound`). Persisted in localStorage.

const KEY = 'micro.game.sound';
// The songs, from ../music/ (the same relative path in the repository and the
// deploy). Gains bring both to about -24 LUFS, under the worlds' -20 LUFS
// ambience (measured: Chamber Music -15.7 LUFS, Lullaby -18.2 LUFS).
const SONGS = {
  chamber: { url: new URL('../music/clockwork-chamber-music.mp3', import.meta.url).href, gain: 0.39 },
  lullaby: { url: new URL('../music/clockwork-lullaby.mp3', import.meta.url).href, gain: 0.51 },
};
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };

export function createSound() {
  const saved = load() || {};
  let on = saved.on !== false;
  let volume = typeof saved.volume === 'number' ? saved.volume : 0.8;
  let ctx = null, master = null, droneGain = null, paused = false;
  let wanted = null; // the song the current screen asks for
  const songs = {}; // name -> { el, gain, failed, stopTimer }
  const away = () => document.hidden || !document.hasFocus();

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ on, volume })); } catch { /* private mode */ } };
  const level = () => (on && !paused ? volume : 0);

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = level();
    master.connect(ctx.destination);
    // A low, slow drone: two detuned sines through a lowpass, very quiet.
    droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    for (const [f, d] of [[73.4, 0], [110, 3], [146.8, -4]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = d;
      const g = ctx.createGain(); g.gain.value = 0.22;
      o.connect(g).connect(lp); o.start();
    }
    lp.connect(droneGain).connect(master);
    return ctx;
  }

  // A song's <audio>, routed through the master gain (so the switch, volume
  // and pause apply, and iOS honours the level). Made on first use.
  function song(name) {
    if (songs[name] || !ctx) return songs[name];
    const el = new Audio();
    el.loop = true; el.preload = 'auto'; el.src = SONGS[name].url;
    const gain = ctx.createGain(); gain.gain.value = 0;
    const s = { el, gain, failed: false, stopTimer: 0 };
    try { ctx.createMediaElementSource(el).connect(gain).connect(master); } catch { s.failed = true; }
    el.addEventListener('error', () => { s.failed = true; applyMusic(); });
    return (songs[name] = s);
  }
  // Bring every song's gain (and playing state) in line with `wanted`.
  function applyMusic() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const live = !away() && on && ctx.state !== 'closed';
    let missing = !!wanted;
    for (const name of Object.keys(SONGS)) {
      const s = name === wanted ? song(name) : songs[name];
      if (!s) continue;
      if (name === wanted && !s.failed) {
        missing = false;
        clearTimeout(s.stopTimer);
        s.gain.gain.setTargetAtTime(SONGS[name].gain, t, 0.5);
        if (live && s.el.paused) s.el.play().catch(() => {});
        if (!live && !s.el.paused) s.el.pause();
      } else {
        s.gain.gain.setTargetAtTime(0, t, 0.4);
        clearTimeout(s.stopTimer);
        if (!s.el.paused) s.stopTimer = setTimeout(() => s.el.pause(), live ? 2500 : 0);
      }
    }
    // The drone only covers for a song that won't play.
    if (droneGain) droneGain.gain.setTargetAtTime(missing ? 0.05 : 0, t, 0.8);
  }

  function refresh() {
    if (!ctx) return;
    master.gain.setTargetAtTime(level(), ctx.currentTime, 0.06);
    if (away() && ctx.state === 'running') ctx.suspend().catch(() => {});
    else if (!away() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    applyMusic();
  }
  document.addEventListener('visibilitychange', refresh);
  addEventListener('blur', () => setTimeout(refresh, 0));
  addEventListener('focus', refresh);

  function env(t, a, peak, d) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    return g;
  }
  function tone(freq, { type = 'sine', a = 0.004, d = 0.12, peak = 0.2, at = 0, bend = 1 } = {}) {
    if (!ctx || !on || ctx.state !== 'running') return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (bend !== 1) o.frequency.exponentialRampToValueAtTime(freq * bend, t + a + d);
    o.connect(env(t, a, peak, d)).connect(master);
    o.start(t); o.stop(t + a + d + 0.05);
  }
  function noise({ d = 0.4, peak = 0.12, f0 = 400, f1 = 2400, q = 0.9, at = 0 } = {}) {
    if (!ctx || !on || ctx.state !== 'running') return;
    const t = ctx.currentTime + at;
    const len = Math.ceil(ctx.sampleRate * (d + 0.1));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + d);
    src.connect(bp).connect(env(t, d * 0.45, peak, d * 0.55)).connect(master);
    src.start(t); src.stop(t + d + 0.1);
  }

  return {
    get on() { return on; },
    get volume() { return volume; },
    /** Create or resume the context: call from a user gesture or a pad press. */
    unlock() { if (!ensure()) return; if (ctx.state === 'suspended' && !away()) ctx.resume().catch(() => {}); refresh(); },
    setOn(v) { on = !!v; save(); if (on) this.unlock(); refresh(); },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); save(); refresh(); },
    /** Paused play: the shell's own sound goes quiet too (the world suspends its own). */
    setPaused(v) { paused = !!v; refresh(); },
    /** The menu music: 'chamber', 'lullaby' or null (silence, as in the worlds). */
    music(name) { wanted = SONGS[name] ? name : null; applyMusic(); },
    get nowPlaying() { return { wanted, playing: Object.keys(songs).filter((n) => !songs[n].el.paused) }; },
    tick() { tone(1850, { type: 'triangle', d: 0.05, peak: 0.06 }); tone(3700, { d: 0.03, peak: 0.02 }); },
    select() { tone(620, { type: 'triangle', d: 0.09, peak: 0.12 }); tone(1240, { d: 0.18, peak: 0.07, at: 0.03 }); noise({ d: 0.06, peak: 0.05, f0: 3000, f1: 2000, q: 2 }); },
    back() { tone(520, { type: 'triangle', d: 0.1, peak: 0.1, bend: 0.7 }); },
    start() { tone(392, { d: 0.5, peak: 0.12 }); tone(587, { d: 0.6, peak: 0.08, at: 0.08 }); tone(784, { d: 0.9, peak: 0.06, at: 0.16 }); },
    /** The objective turret: a click, then air. */
    zoom(dir = 'in', seconds = 2.4) {
      tone(dir === 'in' ? 900 : 700, { type: 'square', d: 0.03, peak: 0.05 });
      noise({ d: seconds, peak: 0.07, f0: dir === 'in' ? 300 : 2600, f1: dir === 'in' ? 2600 : 300, q: 0.7, at: 0.05 });
      tone(dir === 'in' ? 1100 : 800, { type: 'square', d: 0.03, peak: 0.04, at: seconds });
    },
    join() { tone(660, { d: 0.12, peak: 0.1 }); tone(990, { d: 0.25, peak: 0.08, at: 0.09 }); },
  };
}

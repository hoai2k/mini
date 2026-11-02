// The shell's own sound: the recorded menu sounds (the `ui/` group of
// micro/design/source/build_audio.py, in ../prototypes/assets/audio/ui/:
// focus moves, select, back, the intro card in and out, pause and resume, a
// world card changing, the zoom in and back out, Begin), each falling back to
// a small synthesised stand-in (a brass tick for focus, an objective click
// for select, a soft whoosh for the zoom) while its file loads or if it fails
// to; and the menu music: "Clockwork Chamber Music" on the title,
// "Clockwork Lullaby" on world select and the intros (`music(name)`, which
// crossfades and keeps each song's place). A quiet drone stands in for a song
// that can't load. The worlds play
// their own sound inside their frames; the master switch and volume set here
// are sent to them (embed `sound`). Persisted in localStorage.
import { SOUNDS } from '../../prototypes/shared/audio-list.js';

const KEY = 'micro.game.sound';
// The recorded menu sounds: their gains under the music (the files sit about
// -20 to -25 dB mean; zoom-out is the loudest), and the paths in audio-list.js
// are relative to the prototypes folder.
const UI_BASE = new URL('../../prototypes/', import.meta.url);
const UI = { move: 0.3, select: 0.45, back: 0.45, 'intro-in': 0.45, 'intro-out': 0.45, pause: 0.4, resume: 0.4, card: 0.4, 'zoom-in': 0.5, 'zoom-out': 0.35, start: 0.5 };
const MOVE_GAP = 0.07; // s: held d-pad repeats are heard at most this often
// TEMPORARY: the sound set, 'new' (the recorded sounds) or 'old' (the synthesised
// ones, as before 2 November 2026), shared with the worlds (shared/audio.js).
// 'new' (Experimental) or 'old' (Default, the original sounds). Renamed from micro.soundSet when
// the default flipped to the original sounds, so earlier choices don't carry over.
const SET_KEY = 'micro.sfxSet';
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
  let uiBus = null; // the switch and volume only: pause and resume are heard while paused
  const ui = {}; // name -> AudioBuffer[] once loaded ([] if it failed); missing while loading
  let lastMove = -1;
  let soundSet = (() => { try { return localStorage.getItem(SET_KEY) === 'new' ? 'new' : 'old'; } catch { return 'old'; } })();
  const old = () => soundSet === 'old';
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
    uiBus = ctx.createGain();
    uiBus.gain.value = on ? volume : 0;
    uiBus.connect(ctx.destination);
    for (const name of Object.keys(UI)) loadUi(name);
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

  // Preload one recorded sound (every take); a failure leaves the synth in its place.
  function loadUi(name) {
    const files = SOUNDS[`ui/${name}`]?.files || [];
    Promise.all(files.map((f) => fetch(new URL(f, UI_BASE)).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${f}`);
      return r.arrayBuffer();
    }).then((b) => ctx.decodeAudioData(b)).catch((e) => {
      console.warn(`[micro] menu sound ui/${name} unavailable (${e.message}): synthesised instead`);
      return null;
    }))).then((list) => { ui[name] = list.filter(Boolean); });
  }
  /**
   * Play a recorded menu sound; false if it is not loaded (or failed), so the
   * caller synthesises its stand-in. evenPaused: through the switch and volume
   * only (pause and resume), not the paused mute.
   */
  function file(name, { rate = 1, evenPaused = false } = {}) {
    const list = ui[name];
    if (!ctx || old() || !list || !list.length) return false;
    if (!on || ctx.state !== 'running') return true; // silent, as the synth would be
    const src = ctx.createBufferSource();
    src.buffer = list[(Math.random() * list.length) | 0];
    src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = UI[name];
    src.connect(g).connect(evenPaused ? uiBus : master);
    src.start();
    return true;
  }

  function refresh() {
    if (!ctx) return;
    master.gain.setTargetAtTime(level(), ctx.currentTime, 0.06);
    uiBus.gain.setTargetAtTime(on ? volume : 0, ctx.currentTime, 0.06);
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
    /** The sound set: 'new' or 'old' (TEMPORARY; see SET_KEY). */
    get set() { return soundSet; },
    setSet(v) { soundSet = v === 'old' ? 'old' : 'new'; try { localStorage.setItem(SET_KEY, soundSet); } catch { /* private mode */ } },
    /** Create or resume the context: call from a user gesture or a pad press. */
    unlock() { if (!ensure()) return; if (ctx.state === 'suspended' && !away()) ctx.resume().catch(() => {}); refresh(); },
    setOn(v) { on = !!v; save(); if (on) this.unlock(); refresh(); },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); save(); refresh(); },
    /** Paused play: the shell's own sound goes quiet too (the world suspends its own). */
    setPaused(v) { paused = !!v; refresh(); },
    /** The menu music: 'chamber', 'lullaby' or null (silence, as in the worlds). */
    music(name) { wanted = SONGS[name] ? name : null; applyMusic(); },
    get nowPlaying() { return { wanted, playing: Object.keys(songs).filter((n) => !songs[n].el.paused) }; },
    /** Focus moves (ui/move), at most every MOVE_GAP s. */
    tick() {
      if (ctx && !old()) { if (ctx.currentTime - lastMove < MOVE_GAP && lastMove >= 0) return; lastMove = ctx.currentTime; }
      if (file('move', { rate: 0.97 + Math.random() * 0.06 })) return;
      tone(1850, { type: 'triangle', d: 0.05, peak: 0.06 }); tone(3700, { d: 0.03, peak: 0.02 });
    },
    select() { if (file('select')) return; tone(620, { type: 'triangle', d: 0.09, peak: 0.12 }); tone(1240, { d: 0.18, peak: 0.07, at: 0.03 }); noise({ d: 0.06, peak: 0.05, f0: 3000, f1: 2000, q: 2 }); },
    back() { if (file('back')) return; tone(520, { type: 'triangle', d: 0.1, peak: 0.1, bend: 0.7 }); },
    /** Begin (the Old set: select, as it was). */
    begin() { if (old()) this.select(); else this.start(); },
    /** Press Start on the title (and Begin's recorded sound). */
    start() { if (file('start')) return; tone(392, { d: 0.5, peak: 0.12 }); tone(587, { d: 0.6, peak: 0.08, at: 0.08 }); tone(784, { d: 0.9, peak: 0.06, at: 0.16 }); },
    /** The intro card opens (ui/intro-in) and closes back to the tray (ui/intro-out); the synth's select and back stand in. */
    introIn() { if (!file('intro-in')) this.select(); },
    introOut() { if (!file('intro-out')) this.back(); },
    /** Pause and resume: heard over the paused mute (call pause() before setPaused(true)). */
    pause() { if (!old() && !file('pause', { evenPaused: true })) this.back(); },
    resume() { if (!old() && !file('resume', { evenPaused: true })) this.select(); },
    /** The pause menu's Resume item: the Old set's select (the new set's resume() plays on resuming). */
    resumeItem() { if (old()) this.select(); },
    /** The world card in the tray changes (ui/card); the tick stands in. */
    card() { if (!file('card', { rate: 0.97 + Math.random() * 0.06 })) this.tick(); },
    /** The zoom into the next world, or back out (the recording stretched to `seconds`); the synth: the objective turret, a click, then air. */
    zoom(dir = 'in', seconds = 2.4) {
      const name = dir === 'in' ? 'zoom-in' : 'zoom-out', b = ui[name]?.[0];
      if (b && file(name, { rate: Math.max(0.5, Math.min(2, b.duration / Math.max(0.1, seconds))) })) return;
      tone(dir === 'in' ? 900 : 700, { type: 'square', d: 0.03, peak: 0.05 });

      noise({ d: seconds, peak: 0.07, f0: dir === 'in' ? 300 : 2600, f1: dir === 'in' ? 2600 : 300, q: 0.7, at: 0.05 });
      tone(dir === 'in' ? 1100 : 800, { type: 'square', d: 0.03, peak: 0.04, at: seconds });
    },
    join() { tone(660, { d: 0.12, peak: 0.1 }); tone(990, { d: 0.25, peak: 0.08, at: 0.09 }); },
  };
}

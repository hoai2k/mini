// Settings, kept in localStorage so they last between visits. Every value is
// checked on the way in, so a damaged or old save falls back to defaults.

import { GENRE_IDS, cleanTempoDefaults } from './tempos.js';
import { TEXT } from './text-config.js';

const KEY = 'musicpractice.settings.v1';

export const METERS = [
  { id: '4/4', beats: 4, unit: 4 },
  { id: '3/4', beats: 3, unit: 4 },
  { id: '2/4', beats: 2, unit: 4 },
  { id: '5/4', beats: 5, unit: 4 },
  { id: '6/4', beats: 6, unit: 4 },
  { id: '7/4', beats: 7, unit: 4 },
  { id: '3/8', beats: 3, unit: 8 },
  { id: '5/8', beats: 5, unit: 8 },
  { id: '6/8', beats: 6, unit: 8 },
  { id: '7/8', beats: 7, unit: 8 },
  { id: '9/8', beats: 9, unit: 8 },
  { id: '12/8', beats: 12, unit: 8 },
  { id: '1', beats: 1, unit: 4, label: TEXT.metronome.noBarsLong },
];

export const SOUNDS = [
  { id: 'wood', label: TEXT.metronome.sounds.wood },
  { id: 'click', label: TEXT.metronome.sounds.click },
  { id: 'beep', label: TEXT.metronome.sounds.beep },
];

/**
 * Looks for the whole app. A theme also needs its block in styles.css, its
 * stand-ins in standins.js, its images in the image requests, and its id in
 * the early script in index.html. `fonts` is its Google Fonts families.
 * `mode` is the way it was designed, light or dark; each also has the
 * other (its `[data-mode]` block in styles.css), for the appearance setting.
 */
export const THEMES = [
  { id: 'classic', label: TEXT.themes.classic, mode: 'dark', color: '#1d1510', fonts: 'family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@500;600;700;800' },
  { id: 'deco', label: TEXT.themes.deco, mode: 'dark', color: '#0b0c0f', fonts: 'family=Poiret+One&family=Josefin+Sans:wght@400;600;700' },
  { id: 'sixties', label: TEXT.themes.sixties, mode: 'light', color: '#f3e6c8', fonts: 'family=Righteous&family=Nunito:wght@500;700;800' },
  { id: 'baroque', label: TEXT.themes.baroque, mode: 'light', color: '#f4ecd9', fonts: 'family=IM+Fell+English:ital@0;1&family=EB+Garamond:wght@500;600;700' },
  { id: 'scifi', label: TEXT.themes.scifi, mode: 'dark', color: '#060a14', fonts: 'family=Orbitron:wght@500;700&family=Exo+2:wght@400;600;700' },
  { id: 'nouveau', label: TEXT.themes.nouveau, mode: 'light', color: '#eef0e4', fonts: 'family=Italiana&family=Cormorant+Garamond:wght@500;600;700' },
  { id: 'anime', label: TEXT.themes.anime, mode: 'light', color: '#fff4fa', fonts: 'family=M+PLUS+Rounded+1c:wght@500;700;800' },
  { id: 'steampunk', label: TEXT.themes.steampunk, mode: 'dark', color: '#1c130c', fonts: 'family=Cinzel:wght@600;700&family=Special+Elite' },
];

/** Dark Mode: each theme as designed ('default'), light, dark, or following the system (the default). */
export const APPEARANCES = ['default', 'light', 'dark', 'system'];

/** The mode a theme shows in: 'light' or 'dark'. */
export function resolveMode(theme, appearance, systemDark) {
  if (appearance === 'light' || appearance === 'dark') return appearance;
  if (appearance === 'system') return systemDark ? 'dark' : 'light';
  return (THEMES.find((t) => t.id === theme) || THEMES[0]).mode;
}

/** The Visualizer's choice of how many bars to show at a time. */
export const VIZ_BARS = [1, 2, 4, 8];

export const BPM_MIN = 40;
export const BPM_MAX = 500;

export const DEFAULTS = Object.freeze({
  theme: 'classic',
  themeChosen: false,
  appearance: 'system', // APPEARANCES: 'default' is each theme as designed
  appearanceChosen: false,
  bpm: 120,
  meter: '4/4',
  accent: true,
  sound: 'wood',
  volume: 1,
  volumeChosen: false,
  silenceSec: 3,
  sensitivity: 'medium',
  startOn: 'music',
  autoPlay: true,
  recordDuringPlayback: false,
  mic: 'auto', // or a deviceId (Audio check)
  speaker: 'default', // or a deviceId (Audio check, where the browser allows)
  syncMs: 0, // extra pendulum delay for Bluetooth speakers (Metronome settings)
  subdivision: 1, // clicks per beat: 1 quarter notes, 2 eighths, 3 triplets, 4 sixteenths (subOn ? subKind : 1)
  subOn: false, // Add eighth notes (or triplets, sixteenths)
  subKind: 2, // which: 2 eighths, 3 triplets, 4 sixteenths, kept while off
  accentPattern: null,
  tempoGenre: 'classical', // the tempo picker's style
  tempoDefaults: {}, // a named tempo's button, where one was chosen from its list: { 'jazz:ballad': 66 } // custom strong beats for the current time signature: { meter, pos } (cleanPattern)
  metView: 'metronome', // or 'bars' (the Visualizer)
  vizBars: 4, // the Visualizer's rows: bars of music shown at a time
  // On each beat: 'swing' (the pendulum), 'pulse' (the beat dots grow big and
  // glow on each beat, to be seen from across a room) or 'off'. Tapping the
  // metronome turns it off and back to the last of the two (pendulumLast).
  pendulumMode: 'swing',
  pendulumLast: 'swing',
  micTipCollapsed: false, // the iPhone microphone tip folded to its title
  homeOrder: ['metronome', 'tuner', 'drone', 'record'], // the home screen's buttons, hold and drag to reorder
  droneMidi: 48, // C3
  droneVoice: 'cello',
  droneVolume: 0.8,
  droneFifth: true, // add a pure fifth above (on unless switched off)
  droneFifthChosen: false,
  // Timing: Continuous pitch (looping forever, or stopping after droneLength
  // minutes) or Change periodically (droneStep minutes on each pitch, then
  // droneSeq). droneTimed, droneMinutes and droneThen are what the drone
  // plays by, derived from these (droneTiming).
  droneMode: 'continuous', // or 'change'
  droneLoop: true,
  droneLength: 10,
  droneStep: 2,
  droneSeq: 'chrom-up', // a sequence from SEQUENCES in drone.js (not 'stop')
  droneTimed: false,
  droneMinutes: 10,
  droneThen: 'stop',
  tuning: 'chromatic', // tuner: an id from TUNINGS in tuning.js
  a4: 440, // tuner reference pitch, 415-466 Hz
  flats: false, // tuner: spell notes with flats
  transpose: 'C', // tuner: written pitch for a transposing instrument
});

const DRONE_VOICES = ['cello', 'cello-soft', 'organ', 'organ-synth']; // a saved voice since archived falls back to the cello
const DRONE_THEN = ['stop', 'chrom-up', 'chrom-down', 'major-up', 'major-down', 'fifths', 'fourths'];
export const DRONE_SEQS = DRONE_THEN.filter((q) => q !== 'stop');

/** What the drone plays by (timed, minutes, then), from the timing chosen. Sets them on `s`. */
export function droneTiming(s) {
  const change = s.droneMode === 'change';
  s.droneTimed = change || !s.droneLoop;
  s.droneMinutes = change ? s.droneStep : s.droneLength;
  s.droneThen = change ? s.droneSeq : 'stop';
  return s;
}
const TUNING_IDS = ['chromatic', 'guitar', 'guitar-dropd', 'guitar-dadgad', 'bass4', 'bass5', 'ukulele', 'violin', 'viola', 'cello', 'mandolin', 'banjo'];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

/** Clean up a tempo typed or dragged in: whole beats, 40 to 500. */
export function clampBpm(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? clamp(n, BPM_MIN, BPM_MAX) : DEFAULTS.bpm;
}

/** The drone's timing, or from an earlier save's Timed drone switch, minutes and When time's up. */
function droneTimingFrom(s) {
  const minutes = (v, d, max) => clamp(Math.round(num(v, d) * 2) / 2, 0.5, max);
  if (s.droneMode === 'continuous' || s.droneMode === 'change') {
    return {
      droneMode: s.droneMode,
      droneLoop: typeof s.droneLoop === 'boolean' ? s.droneLoop : DEFAULTS.droneLoop,
      droneLength: minutes(s.droneLength, DEFAULTS.droneLength, 60),
      droneStep: minutes(s.droneStep, DEFAULTS.droneStep, 20),
      droneSeq: oneOf(s.droneSeq, DRONE_SEQS, DEFAULTS.droneSeq),
    };
  }
  const timed = s.droneTimed === true;
  const then = oneOf(s.droneThen, DRONE_THEN, 'stop');
  const old = minutes(s.droneMinutes, 3, 30);
  return {
    droneMode: timed && then !== 'stop' ? 'change' : 'continuous',
    droneLoop: !(timed && then === 'stop'),
    droneLength: timed && then === 'stop' ? old : DEFAULTS.droneLength,
    droneStep: timed && then !== 'stop' ? Math.min(old, 20) : DEFAULTS.droneStep,
    droneSeq: then !== 'stop' ? then : DEFAULTS.droneSeq,
  };
}

/** Saves from before the one choice had two switches: a pulse someone turned on wins, as swinging and pulsing are never together now. */
function fromSwitches(s) {
  if (s.metPulseChosen === true && s.metPulse === true) return 'pulse';
  if (s.metMotion === false) return 'off';
  return DEFAULTS.pendulumMode;
}

export function sanitize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = {
    // A theme counts only once someone has picked one: earlier saves stored
    // whatever the default was then. 'straight' is Classic's old name.
    theme: s.themeChosen === true ? oneOf(s.theme === 'straight' ? 'classic' : s.theme, THEMES.map((t) => t.id), DEFAULTS.theme) : DEFAULTS.theme,
    themeChosen: s.themeChosen === true,
    // Saves from before System was the default stored 'default' without anyone choosing it.
    appearance: s.appearanceChosen === true ? oneOf(s.appearance, APPEARANCES, DEFAULTS.appearance) : DEFAULTS.appearance,
    appearanceChosen: s.appearanceChosen === true,
    bpm: clampBpm(num(s.bpm, DEFAULTS.bpm)),
    meter: oneOf(s.meter, METERS.map((m) => m.id), DEFAULTS.meter),
    accent: typeof s.accent === 'boolean' ? s.accent : DEFAULTS.accent,
    sound: oneOf(s.sound, SOUNDS.map((m) => m.id), DEFAULTS.sound),
    // The metronome's volume (the slider tucked beside the picture); full until
    // it is moved there, since earlier saves' volume was a removed control's.
    volume: s.volumeChosen === true ? clamp(num(s.volume, 1), 0, 1) : 1,
    volumeChosen: s.volumeChosen === true,
    silenceSec: clamp(Math.round(num(s.silenceSec, DEFAULTS.silenceSec) * 2) / 2, 1, 10),
    sensitivity: oneOf(s.sensitivity, ['low', 'medium', 'high'], DEFAULTS.sensitivity),
    startOn: oneOf(s.startOn, ['music', 'any'], DEFAULTS.startOn),
    autoPlay: typeof s.autoPlay === 'boolean' ? s.autoPlay : DEFAULTS.autoPlay,
    recordDuringPlayback: typeof s.recordDuringPlayback === 'boolean' ? s.recordDuringPlayback : DEFAULTS.recordDuringPlayback,
    mic: typeof s.mic === 'string' && s.mic.length < 200 ? s.mic : DEFAULTS.mic,
    speaker: typeof s.speaker === 'string' && s.speaker.length < 200 ? s.speaker : DEFAULTS.speaker,
    syncMs: clamp(Math.round(num(s.syncMs, DEFAULTS.syncMs) / 10) * 10, -200, 500),
    micTipCollapsed: s.micTipCollapsed === true,
    // The extra notes: a switch and a kind (saves from the Clicks list carry over).
    subKind: oneOf(s.subKind, [2, 3, 4], oneOf(s.subdivision, [2, 3, 4], DEFAULTS.subKind)),
    subOn: typeof s.subOn === 'boolean' ? s.subOn : [2, 3, 4].includes(s.subdivision),
    tempoGenre: oneOf(s.tempoGenre, GENRE_IDS, DEFAULTS.tempoGenre),
    tempoDefaults: cleanTempoDefaults(s.tempoDefaults),
    accentPattern: cleanPattern(s.accentPattern, oneOf(s.meter, METERS.map((m) => m.id), DEFAULTS.meter)),
    metView: oneOf(s.metView, ['metronome', 'bars'], DEFAULTS.metView),
    vizBars: oneOf(s.vizBars, VIZ_BARS, DEFAULTS.vizBars),
    pendulumMode: oneOf(s.pendulumMode, ['swing', 'pulse', 'off'], fromSwitches(s)),
    pendulumLast: oneOf(s.pendulumLast, ['swing', 'pulse'], s.pendulumMode === 'pulse' ? 'pulse' : DEFAULTS.pendulumLast),
    homeOrder: homeOrder(s.homeOrder),
    droneMidi: clamp(Math.round(num(s.droneMidi, DEFAULTS.droneMidi)), 36, 59),
    droneVoice: oneOf(s.droneVoice, DRONE_VOICES, DEFAULTS.droneVoice),
    droneVolume: clamp(num(s.droneVolume, DEFAULTS.droneVolume), 0, 1),
    // Saves from before the fifth was on by default stored off without anyone choosing it.
    droneFifth: s.droneFifthChosen === true && typeof s.droneFifth === 'boolean' ? s.droneFifth : DEFAULTS.droneFifth,
    droneFifthChosen: s.droneFifthChosen === true,
    ...droneTimingFrom(s),
    tuning: oneOf(s.tuning, TUNING_IDS, DEFAULTS.tuning),
    a4: clamp(Math.round(num(s.a4, DEFAULTS.a4)), 415, 466),
    flats: s.flats === true,
    transpose: oneOf(s.transpose, ['C', 'Bb', 'Eb', 'F'], DEFAULTS.transpose),
  };
  out.subdivision = out.subOn ? out.subKind : 1;
  droneTiming(out);
  return out;
}

/**
 * A saved home order, with unknown tools dropped and missing ones (a tool
 * added since) put back after the one they follow by default.
 */
export function homeOrder(v) {
  const known = DEFAULTS.homeOrder;
  const out = Array.isArray(v) ? [...new Set(v.filter((id) => known.includes(id)))] : [];
  known.forEach((id, i) => {
    if (out.includes(id)) return;
    const prev = known.slice(0, i).reverse().find((p) => out.includes(p));
    out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, id);
  });
  return out;
}

export function load(storage = globalThis.localStorage) {
  try {
    return sanitize(JSON.parse(storage?.getItem(KEY) || 'null'));
  } catch {
    return sanitize(null);
  }
}

export function save(settings, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(sanitize(settings)));
  } catch {
    /* private mode or full: settings just won't persist */
  }
}

export function meterOf(id) {
  return METERS.find((m) => m.id === id) || METERS[0];
}

/**
 * How strongly each beat of a bar is played: 2 the downbeat, 1 a secondary
 * accent (each group of three in 6/8, 9/8, 12/8), 0 the rest.
 */
export function beatStrengths(meterId, accent) {
  const m = meterOf(meterId);
  const out = new Array(m.beats).fill(0);
  if (!accent || m.beats === 1) return out;
  out[0] = 2;
  if (m.unit === 8 && m.beats % 3 === 0 && m.beats > 3) {
    for (let i = 3; i < m.beats; i += 3) out[i] = 1;
  }
  return out;
}

/*
 * Custom strong beats: positions in a bar, counted in twelfths of a beat
 * (beat 2's '&' is 18), so they mean the same whatever the clicks are
 * (quarters, eighths, triplets, sixteenths: 12 is the smallest count that
 * divides into all of them). A position the current clicks don't fall on is
 * kept, just not played.
 */
export const TICKS = 12;

/** A custom pattern for this time signature, or null: { meter, pos: [twelfths] }. */
export function cleanPattern(p, meterId) {
  if (!p || typeof p !== 'object' || p.meter !== meterId || !Array.isArray(p.pos)) return null;
  const max = meterOf(meterId).beats * TICKS;
  const pos = [...new Set(p.pos.filter((v) => Number.isInteger(v) && v >= 0 && v < max))].sort((a, b) => a - b);
  // Only beat 1 is not custom: that is the ordinary strong beat.
  return pos.length && !(pos.length === 1 && pos[0] === 0) ? { meter: meterId, pos } : null;
}

/**
 * Everything the metronome plays in a bar: `strengths`, one per beat (what
 * the pendulum, lamp, dots and Visualizer show: 2 strong, 1 secondary, 0
 * not), and `slots`, the click for every position the clicks fall on (beat
 * by beat, `subdivision` each: 0-2 as strengths, 3 the quieter click between
 * beats), or null where the plain rules give it (no custom pattern).
 */
export function barPlan({ meter, accent, subdivision = 1, accentPattern = null }) {
  const m = meterOf(meter);
  const pattern = accent ? cleanPattern(accentPattern, meter) : null;
  if (!pattern) return { strengths: beatStrengths(meter, accent), slots: null };
  const on = new Set(pattern.pos);
  const strengths = Array.from({ length: m.beats }, (_, b) => (on.has(b * TICKS) ? 2 : 0));
  const slots = [];
  for (let b = 0; b < m.beats; b++) {
    for (let k = 0; k < subdivision; k++) {
      const at = b * TICKS + (k * TICKS) / subdivision;
      slots.push(k === 0 ? strengths[b] : on.has(at) ? 2 : 3);
    }
  }
  return { strengths, slots };
}

// Settings, kept in localStorage so they last between visits. Every value is
// checked on the way in, so a damaged or old save falls back to defaults.

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
  { id: '1', beats: 1, unit: 4, label: 'No bars (every beat the same)' },
];

export const SOUNDS = [
  { id: 'wood', label: 'Woodblock' },
  { id: 'click', label: 'Click' },
  { id: 'beep', label: 'Beep' },
];

/**
 * Looks for the whole app. A theme also needs its block in styles.css, its
 * stand-ins in standins.js, its images in the image requests, and its id in
 * the early script in index.html. `fonts` is its Google Fonts families.
 */
export const THEMES = [
  { id: 'classic', label: 'Classic', color: '#1d1510', fonts: 'family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@500;600;700;800' },
  { id: 'deco', label: 'Art Deco', color: '#0b0c0f', fonts: 'family=Poiret+One&family=Josefin+Sans:wght@400;600;700' },
  { id: 'sixties', label: 'Vintage 60s', color: '#f3e6c8', fonts: 'family=Righteous&family=Nunito:wght@500;700;800' },
  { id: 'baroque', label: '18th Century', color: '#f4ecd9', fonts: 'family=IM+Fell+English:ital@0;1&family=EB+Garamond:wght@500;600;700' },
  { id: 'scifi', label: 'Robot Future', color: '#060a14', fonts: 'family=Orbitron:wght@500;700&family=Exo+2:wght@400;600;700' },
  { id: 'nouveau', label: 'French Nouveau', color: '#eef0e4', fonts: 'family=Italiana&family=Cormorant+Garamond:wght@500;600;700' },
  { id: 'anime', label: 'Candy', color: '#fff4fa', fonts: 'family=M+PLUS+Rounded+1c:wght@500;700;800' },
  { id: 'steampunk', label: 'Steam Punk', color: '#1c130c', fonts: 'family=Cinzel:wght@600;700&family=Special+Elite' },
];

export const BPM_MIN = 40;
export const BPM_MAX = 500;

export const DEFAULTS = Object.freeze({
  theme: 'classic',
  themeChosen: false,
  bpm: 120,
  meter: '4/4',
  accent: true,
  sound: 'wood',
  volume: 0.8,
  silenceSec: 3,
  sensitivity: 'medium',
  startOn: 'music',
  autoPlay: true,
  recordDuringPlayback: false,
  mic: 'auto', // or a deviceId (Audio check)
  speaker: 'default', // or a deviceId (Audio check, where the browser allows)
  syncMs: 0, // extra pendulum delay for Bluetooth speakers (Audio check)
  metMotion: true, // the pendulum swings
  metPulse: true, // a glow pulses on each beat
  micTipCollapsed: false, // the iPhone microphone tip folded to its title
  homeOrder: ['metronome', 'tuner', 'record'], // the home screen's buttons, hold and drag to reorder
  tuning: 'chromatic', // tuner: an id from TUNINGS in tuning.js
  a4: 440, // tuner reference pitch, 415-466 Hz
  flats: false, // tuner: spell notes with flats
  transpose: 'C', // tuner: written pitch for a transposing instrument
});

const TUNING_IDS = ['chromatic', 'guitar', 'guitar-dropd', 'guitar-dadgad', 'bass4', 'bass5', 'ukulele', 'violin', 'viola', 'cello', 'mandolin', 'banjo'];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

/** Clean up a tempo typed or dragged in: whole beats, 40 to 500. */
export function clampBpm(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? clamp(n, BPM_MIN, BPM_MAX) : DEFAULTS.bpm;
}

export function sanitize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    // A theme counts only once someone has picked one: earlier saves stored
    // whatever the default was then. 'straight' is Classic's old name.
    theme: s.themeChosen === true ? oneOf(s.theme === 'straight' ? 'classic' : s.theme, THEMES.map((t) => t.id), DEFAULTS.theme) : DEFAULTS.theme,
    themeChosen: s.themeChosen === true,
    bpm: clampBpm(num(s.bpm, DEFAULTS.bpm)),
    meter: oneOf(s.meter, METERS.map((m) => m.id), DEFAULTS.meter),
    accent: typeof s.accent === 'boolean' ? s.accent : DEFAULTS.accent,
    sound: oneOf(s.sound, SOUNDS.map((m) => m.id), DEFAULTS.sound),
    volume: clamp(num(s.volume, DEFAULTS.volume), 0, 1),
    silenceSec: clamp(Math.round(num(s.silenceSec, DEFAULTS.silenceSec) * 2) / 2, 1, 10),
    sensitivity: oneOf(s.sensitivity, ['low', 'medium', 'high'], DEFAULTS.sensitivity),
    startOn: oneOf(s.startOn, ['music', 'any'], DEFAULTS.startOn),
    autoPlay: typeof s.autoPlay === 'boolean' ? s.autoPlay : DEFAULTS.autoPlay,
    recordDuringPlayback: typeof s.recordDuringPlayback === 'boolean' ? s.recordDuringPlayback : DEFAULTS.recordDuringPlayback,
    mic: typeof s.mic === 'string' && s.mic.length < 200 ? s.mic : DEFAULTS.mic,
    speaker: typeof s.speaker === 'string' && s.speaker.length < 200 ? s.speaker : DEFAULTS.speaker,
    syncMs: clamp(Math.round(num(s.syncMs, DEFAULTS.syncMs) / 10) * 10, -200, 500),
    micTipCollapsed: s.micTipCollapsed === true,
    metMotion: typeof s.metMotion === 'boolean' ? s.metMotion : DEFAULTS.metMotion,
    metPulse: typeof s.metPulse === 'boolean' ? s.metPulse : DEFAULTS.metPulse,
    homeOrder: homeOrder(s.homeOrder),
    tuning: oneOf(s.tuning, TUNING_IDS, DEFAULTS.tuning),
    a4: clamp(Math.round(num(s.a4, DEFAULTS.a4)), 415, 466),
    flats: s.flats === true,
    transpose: oneOf(s.transpose, ['C', 'Bb', 'Eb', 'F'], DEFAULTS.transpose),
  };
}

/** A saved home order, with unknown tools dropped and missing ones added at the end. */
function homeOrder(v) {
  const known = DEFAULTS.homeOrder;
  const kept = Array.isArray(v) ? [...new Set(v.filter((id) => known.includes(id)))] : [];
  return [...kept, ...known.filter((id) => !kept.includes(id))];
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

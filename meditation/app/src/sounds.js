// The chime sounds (pure data). Each is a modal synthesis recipe: a strike
// excites a handful of partials, each a pair of slightly detuned sines (the
// split modes that make a bowl "wah"), decaying exponentially. When a
// recording of the instrument is in app/sounds/ (`file`), it is played instead
// and the recipe stays as the fallback (no network, a file that won't decode).
//
// partials: [ratio to f0, amplitude, decay time constant (s), beat (Hz)]
// level (optional): overall gain, for sounds that stack several strikes.

export const SOUNDS = [
  {
    id: 'bowl-large', name: 'Large singing bowl', image: 'instrument-bowl-large',
    f0: 174, attack: 0.006, noise: { freq: 900, q: 1.2, level: 0.05, decay: 0.03 },
    partials: [[1, 1, 9, 0.8], [2.74, 0.55, 5.5, 1.5], [5.08, 0.3, 3, 2.3], [7.96, 0.14, 1.8, 3], [11.4, 0.06, 1, 3.6]],
    length: 26, file: null,
  },
  {
    id: 'bowl-small', name: 'Small singing bowl', image: 'instrument-bowl-small',
    f0: 361, attack: 0.004, noise: { freq: 2600, q: 1.5, level: 0.05, decay: 0.02 },
    partials: [[1, 1, 7, 1.1], [2.77, 0.5, 4, 2], [5.17, 0.24, 2.2, 2.8], [8, 0.1, 1.2, 3.4]],
    length: 22, file: 'sounds/bowl-small.mp3',
  },
  {
    id: 'rin', name: 'Rin', image: 'instrument-rin',
    f0: 814, attack: 0.003, noise: { freq: 3200, q: 2, level: 0.06, decay: 0.015 },
    partials: [[1, 1, 7.5, 0.22], [2.7, 0.42, 3.6, 1], [5.02, 0.22, 1.9, 1.7], [7.9, 0.07, 1.1, 2.2]],
    length: 20, file: 'sounds/rin.mp3',
  },
  {
    id: 'tingsha', name: 'Tingsha', image: 'instrument-tingsha',
    // Two cymbals struck together: two near-identical sets, hence the strong beating.
    f0: 1620, attack: 0.002, noise: { freq: 6000, q: 0.8, level: 0.12, decay: 0.012 },
    partials: [[1, 1, 5.5, 3.2], [1.014, 0.8, 5, 2.6], [2.31, 0.32, 2.2, 4], [2.35, 0.26, 2, 4.6], [4.08, 0.1, 0.9, 5]],
    length: 15, file: null,
  },
  {
    id: 'koshi', name: 'Koshi chimes', image: 'instrument-koshi',
    // A short gust: `notes` rods struck one after another over `spread` seconds.
    f0: 440, attack: 0.002, noise: { freq: 5000, q: 1, level: 0.03, decay: 0.01 },
    partials: [[1, 1, 3.2, 0.2], [2.756, 0.24, 1.1, 0.5], [5.404, 0.07, 0.45, 0.8]],
    // The eight rods of the recording credited below: a4 d5 f5 g5 a5 d6 f6 a6.
    scale: [440, 587.33, 698.46, 783.99, 880, 1174.66, 1396.91, 1760],
    gust: { notes: 9, spread: 3.6 },
    level: 0.4, // the rods overlap, so each is quieter
    length: 10, file: 'sounds/koshi.mp3',
  },
  {
    id: 'bell', name: 'Temple bell', image: 'instrument-bell',
    f0: 196, attack: 0.008, noise: { freq: 500, q: 0.9, level: 0.07, decay: 0.05 },
    // Hum, prime, tierce, quint, nominal and upper partials of a cast bell.
    partials: [[0.5, 0.7, 16, 0.25], [1, 1, 9, 0.6], [1.19, 0.45, 6, 0.9], [1.5, 0.32, 4.5, 1.2], [2, 0.42, 5, 1.6], [2.51, 0.18, 2.4, 2], [3.02, 0.1, 1.5, 2.4]],
    length: 30, file: null,
  },
];

export const SOUND_IDS = SOUNDS.map((s) => s.id);

export function soundById(id) {
  return SOUNDS.find((s) => s.id === id) || SOUNDS[0];
}

/** The recordings played, for the credits (made by design/source/make_sounds.py). */
export const CREDITS = [
  {
    sound: 'rin', title: 'Japanese rin played as struck idiophone', author: 'MichaelMaggs',
    url: 'https://commons.wikimedia.org/wiki/File:Japanese_rin_played_as_struck_idiophone.ogg',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', changes: 'trimmed to the last strike, level matched, faded',
  },
  {
    sound: 'bowl-small', title: 'Tibetan Singing Bowl hit 4.5inch', author: 'דג בלי מלח (Dag Bli Melah)',
    url: 'https://commons.wikimedia.org/wiki/File:Tibetan_Singing_Bowl_hit_4.5inch.flac',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', changes: 'level matched, faded',
  },
  {
    sound: 'koshi', title: 'Windglockenspiel.Koshi', author: 'Membeth',
    url: 'https://commons.wikimedia.org/wiki/File:Windglockenspiel.Koshi.ogg',
    license: 'CC0 1.0', changes: 'trimmed to one gust, level matched, faded',
  },
];

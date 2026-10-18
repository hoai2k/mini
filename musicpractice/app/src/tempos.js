// Common tempos by genre, for the tempo picker (the marking under the
// number). Each named tempo has the tempo its button plays (`main`) and the
// other common ones for that name (`list`, which includes `main`); choosing
// one from the list makes it that name's button from then on (settings
// `tempoDefaults`). Names are in text-config.js (metronome.tempos.names).
//
// Classical: the Italian markings over the metronome's traditional marks
// (Maelzel's), in the ranges the marking under the number uses.
// Ballroom: the competition tempos (WDSF), bars per minute times beats per
// bar. The rest: the tempos each style is commonly played at.

export const GENRES = {
  classical: [
    { id: 'largo', main: 50, list: [40, 42, 44, 46, 48, 50, 52, 54, 56, 58] },
    { id: 'larghetto', main: 63, list: [60, 63] },
    { id: 'adagio', main: 72, list: [66, 69, 72] },
    { id: 'andante', main: 92, list: [76, 80, 84, 88, 92, 96, 100, 104] },
    { id: 'moderato', main: 112, list: [108, 112, 116] },
    { id: 'allegro', main: 132, list: [120, 126, 132, 138, 144, 152] },
    { id: 'vivace', main: 160, list: [160, 168] },
    { id: 'presto', main: 184, list: [176, 184, 192] },
    { id: 'prestissimo', main: 208, list: [200, 208, 220, 240] },
  ],
  jazz: [
    { id: 'ballad', main: 60, list: [50, 56, 60, 66, 72, 80] },
    { id: 'mediumSlow', main: 100, list: [84, 88, 92, 96, 100, 108, 112] },
    { id: 'mediumSwing', main: 132, list: [116, 120, 126, 132, 138, 144, 152, 160] },
    { id: 'upTempo', main: 200, list: [168, 176, 184, 192, 200, 208, 220, 232, 240] },
    { id: 'burner', main: 280, list: [250, 260, 280, 300, 320] },
  ],
  ballroom: [
    { id: 'waltz', main: 87, list: [84, 87, 90] },
    { id: 'tango', main: 128, list: [124, 128, 132] },
    { id: 'viennese', main: 177, list: [174, 177, 180] },
    { id: 'foxtrot', main: 116, list: [112, 116, 120] },
    { id: 'quickstep', main: 204, list: [200, 204, 208] },
    { id: 'samba', main: 100, list: [100, 102, 104] },
    { id: 'chaCha', main: 124, list: [120, 124, 128] },
    { id: 'rumba', main: 104, list: [100, 104, 108] },
    { id: 'pasoDoble', main: 120, list: [120, 122, 124] },
    { id: 'jive', main: 172, list: [168, 172, 176] },
  ],
  electronic: [
    { id: 'downtempo', main: 90, list: [70, 80, 85, 90, 95, 100] },
    { id: 'hipHop', main: 90, list: [80, 85, 88, 90, 92, 95, 100] },
    { id: 'house', main: 124, list: [118, 120, 122, 124, 126, 128, 130] },
    { id: 'techno', main: 132, list: [125, 128, 130, 132, 135, 138, 140, 145] },
    { id: 'trance', main: 138, list: [130, 134, 136, 138, 140, 145] },
    { id: 'dubstep', main: 140, list: [138, 140, 142] },
    { id: 'trap', main: 140, list: [130, 135, 140, 145, 150] },
    { id: 'drumAndBass', main: 174, list: [160, 165, 170, 172, 174, 176, 180] },
  ],
  marching: [
    { id: 'funeral', main: 60, list: [50, 56, 60, 66] },
    { id: 'slowMarch', main: 65, list: [60, 65, 70, 75] },
    { id: 'quickMarch', main: 120, list: [108, 112, 116, 120, 124] },
    { id: 'doubleTime', main: 180, list: [160, 170, 180] },
  ],
};

export const GENRE_IDS = Object.keys(GENRES);

/** The tempo a name's button plays: the one chosen from its list, or its usual one. */
export function mainTempo(genre, name, defaults = {}) {
  const t = GENRES[genre]?.find((n) => n.id === name);
  if (!t) return null;
  const chosen = defaults[`${genre}:${name}`];
  return t.list.includes(chosen) ? chosen : t.main;
}

/** Only real names and tempos from their own lists are kept. */
export function cleanTempoDefaults(d) {
  const out = {};
  if (!d || typeof d !== 'object') return out;
  for (const [key, bpm] of Object.entries(d)) {
    const [genre, name] = key.split(':');
    const t = GENRES[genre]?.find((n) => n.id === name);
    if (t && t.list.includes(bpm)) out[key] = bpm;
  }
  return out;
}

/** The classical markings by tempo: each from its lower bound (the marking under the number). */
const CLASSICAL_FROM = [[0, 'largo'], [60, 'larghetto'], [66, 'adagio'], [76, 'andante'], [108, 'moderato'], [120, 'allegro'], [156, 'vivace'], [176, 'presto'], [200, 'prestissimo']];

/**
 * The name for `bpm` in a style (genre), for under the number: the Italian
 * marking in Classical; in the others, the name whose common tempos include
 * it (`picked`, the name last chosen in this style, first, as two names can
 * share a tempo), else the one whose range is nearest.
 * @returns {string} a name's id in GENRES[genre]
 */
export function nameFor(genre, bpm, picked = null) {
  if (genre === 'classical' || !GENRES[genre]) {
    let id = CLASSICAL_FROM[0][1];
    for (const [from, name] of CLASSICAL_FROM) if (bpm >= from) id = name;
    return id;
  }
  const names = GENRES[genre];
  const mine = names.find((n) => n.id === picked);
  if (mine?.list.includes(bpm)) return mine.id;
  const exact = names.find((n) => n.list.includes(bpm));
  if (exact) return exact.id;
  const off = (n) => Math.max(0, Math.min(...n.list) - bpm, bpm - Math.max(...n.list));
  return names.reduce((best, n) => (off(n) < off(best) ? n : best)).id;
}

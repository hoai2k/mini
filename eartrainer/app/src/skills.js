// The player's ears: what each melody asks of them, how their first press at
// each note went, and from that a skill profile that leans hard on recent play.
//
// A melody is a row of steps from note to note. Each step exercises skills:
// - an interval (int1 half step … int12 an octave or wider), heard in either direction;
// - up-or-down (contour), whenever the note moves;
// - a note outside the key (chromatic), long melodies (the 9th note on),
//   fast notes, minor keys;
// - the right octave (octave), on every step.
// Only the player's first press at each note counts: it is what they heard.
// A wrong first press is also classified (wrong direction, right note in the
// wrong octave, one interval heard as another) for the "Your ears" page.
import { keyOf } from './music.js';

export const INTERVALS = ['unison', 'half steps', 'whole steps', 'minor 3rds', 'major 3rds', 'perfect 4ths', 'tritones',
  'perfect 5ths', 'minor 6ths', 'major 6ths', 'minor 7ths', 'major 7ths', 'octaves'];
export const SHORT = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];

export const SKILLS = [
  ...INTERVALS.slice(1).map((name, i) => ({ id: `int${i + 1}`, name: name[0].toUpperCase() + name.slice(1), short: SHORT[i + 1], semis: i + 1, group: 'Intervals' })),
  { id: 'contour', name: 'Up or down', short: '↕', group: 'Shape' },
  { id: 'octave', name: 'The right octave', short: '8va', group: 'Shape' },
  { id: 'chromatic', name: 'Notes outside the key', short: '♯♭', group: 'Harmony' },
  { id: 'minor', name: 'Minor keys', short: 'min', group: 'Harmony' },
  { id: 'long', name: 'Long melodies', short: '9+', group: 'Memory and speed' },
  { id: 'fast', name: 'Fast notes', short: 'fast', group: 'Memory and speed' },
];
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const intervalSkill = (iv) => (iv === 0 ? null : `int${Math.min(12, Math.abs(iv))}`);

const FAST_GAP = 0.3; // seconds from note to note at normal speed: faster than this is "fast"
const LONG_FROM = 8; // the 9th note on

// ---------------------------------------------------------------- what a melody asks
const cache = new WeakMap();
/** The steps of a melody: [{ pos, from, to, iv, gap (s at speed 1), skills: [...] }]. */
export function steps(m) {
  const notes = m.parsed || m.notes;
  let got = cache.get(notes);
  if (got) return got;
  const key = keyOf(notes);
  const minor = key.minor;
  const spb = 60 / (m.bpm || 100);
  got = [];
  for (let pos = 1; pos < notes.length; pos++) {
    const from = notes[pos - 1].midi, to = notes[pos].midi, iv = to - from;
    const gap = (notes[pos].at - notes[pos - 1].at) * spb;
    const pc = ((to % 12) + 12) % 12;
    const skills = ['octave'];
    const isk = intervalSkill(iv);
    if (isk) skills.push(isk, 'contour');
    if (!key.scale.has(pc) && pc !== key.raised) skills.push('chromatic');
    if (minor) skills.push('minor');
    if (pos >= LONG_FROM) skills.push('long');
    if (gap < FAST_GAP) skills.push('fast');
    got.push({ pos, from, to, iv, gap, skills });
  }
  cache.set(notes, got);
  return got;
}

/** How many steps of each skill a melody has: { skill: count }. */
export function skillsOf(m) {
  const out = {};
  for (const st of steps(m)) for (const s of st.skills) out[s] = (out[s] || 0) + 1;
  return out;
}
export const has = (m, skill) => (skillsOf(m)[skill] || 0) > 0;

/**
 * Judge a run from the first key pressed at each note (`first[pos]` = midi;
 * position 0, the marked first note, is never judged). Returns
 * { results: { skill: [ok, total] }, confusions: [{ want, got }] }.
 * `speed` scales the gaps (a melody played faster has more fast notes).
 */
export function judge(m, first, { speed = 1 } = {}) {
  const results = {};
  const add = (s, ok) => { const r = results[s] || (results[s] = [0, 0]); r[1]++; if (ok) r[0]++; };
  const confusions = [];
  for (const st of steps(m)) {
    const p = first[st.pos];
    if (p === undefined || p === null) continue;
    const exact = p === st.to;
    for (const s of st.skills) {
      if (s === 'contour') add(s, exact || Math.sign(p - st.from) === Math.sign(st.iv));
      else if (s === 'octave') add(s, exact || (p - st.to) % 12 !== 0);
      else if (s === 'fast') continue;
      else add(s, exact);
    }
    if (st.gap / speed < FAST_GAP) add('fast', exact);
    if (!exact && st.iv !== 0) confusions.push({ want: st.iv, got: p - st.from });
  }
  return { results, confusions };
}

// ---------------------------------------------------------------- the profile
// progress.ears = { skills: { id: { h: [[time, score 0..1, itemId], …newest last], L } },
//                   conf: [[time, want, got], …], turns: [{ skill, failed, fixed, drills }], focus }
const HISTORY = 30;
const HALF_LIFE_H = 8; // yesterday's results count for a fraction of today's
const HALF_LIFE_N = 4; // and each newer result halves the weight of one four back
const PRIOR = [0.85, 0.6]; // a skill with no news is assumed fair, weakly

export function emptyEars(level = 1) {
  return { skills: {}, conf: [], turns: [], start: level, focus: null };
}
function slot(ears, id) {
  return ears.skills[id] || (ears.skills[id] = { h: [], L: ears.start || 1 });
}

/** A skill's recent accuracy and how much recent evidence there is. */
export function accuracy(ears, id, now = Date.now()) {
  const h = ears.skills[id]?.h || [];
  let sw = PRIOR[1], sv = PRIOR[0] * PRIOR[1], ev = 0;
  for (let i = h.length - 1, rank = 0; i >= 0; i--, rank++) {
    const [t, v] = h[i];
    const w = 0.5 ** (rank / HALF_LIFE_N) * 0.5 ** (Math.max(0, now - t) / 3.6e6 / HALF_LIFE_H);
    sw += w; sv += w * v; ev += w;
  }
  return { acc: sv / sw, evidence: ev };
}
/** The skill's challenge level: the melody level at which it is reliable (1..5). */
export const levelOf = (ears, id) => ears.skills[id]?.L ?? ears.start ?? 1;

/** Reliable now: its last three results all clean, from at least two different challenges. */
export function reliable(ears, id) {
  const h = ears.skills[id]?.h || [];
  const last = h.slice(-3);
  return last.length === 3 && last.every(([, v]) => v === 1) && new Set(last.map((x) => x[2])).size >= 2;
}

/** Weak skills, weakest first: [{ id, acc, evidence }]. */
export function weakSkills(ears, now = Date.now(), { below = 0.8, minEvidence = 0.7 } = {}) {
  return SKILLS.map((s) => ({ id: s.id, ...accuracy(ears, s.id, now) }))
    .filter((x) => x.evidence >= minEvidence && x.acc < below)
    .sort((a, b) => a.acc - b.acc);
}

/**
 * Record a judged run. `item` is the melody (or drill); `level` its level;
 * real melodies (not drills) also move each skill's level: a clean result at
 * or above the skill's level raises it a little; a slip lowers it toward the
 * level it slipped at.
 */
export function record(ears, item, { results, confusions }, now = Date.now()) {
  const scores = {};
  for (const [id, [ok, total]] of Object.entries(results)) {
    if (!total) continue;
    const v = ok / total;
    scores[id] = v;
    const sl = slot(ears, id);
    sl.h.push([now, Math.round(v * 100) / 100, item.id]);
    if (sl.h.length > HISTORY) sl.h.splice(0, sl.h.length - HISTORY);
    if (!item.drill) {
      if (v === 1 && item.level >= sl.L - 0.5) sl.L = Math.min(5, sl.L + 0.25);
      else if (v < 1) sl.L = Math.max(1, Math.min(sl.L - 0.25, item.level - 0.5));
    }
  }
  for (const c of confusions) ears.conf.push([now, c.want, c.got]);
  if (ears.conf.length > 80) ears.conf.splice(0, ears.conf.length - 80);
  return scores;
}

/** The player's overall level: the average of their skill levels, weighted by use. */
export function overallLevel(ears) {
  const ids = Object.keys(ears.skills);
  if (!ids.length) return ears.start || 1;
  let s = 0, w = 0;
  for (const id of ids) { const n = Math.min(10, ears.skills[id].h.length); s += ears.skills[id].L * n; w += n; }
  return w ? s / w : ears.start || 1;
}

/** Recent mix-ups, most frequent first: [{ want, got, weight }] (recency-weighted). */
export function topConfusions(ears, now = Date.now(), n = 5) {
  const m = new Map();
  for (const [t, want, got] of ears.conf) {
    const w = 0.5 ** (Math.max(0, now - t) / 3.6e6 / HALF_LIFE_H);
    const k = `${want}|${got}`;
    m.set(k, (m.get(k) || 0) + w);
  }
  return [...m].map(([k, weight]) => { const [want, got] = k.split('|').map(Number); return { want, got, weight }; })
    .sort((a, b) => b.weight - a.weight).slice(0, n);
}

/** Words for a mix-up: "a major 3rd up heard as a minor 3rd". */
export function describeConfusion({ want, got }) {
  const name = (iv) => (iv === 0 ? 'the same note' : `${INTERVALS[Math.min(12, Math.abs(iv))].replace(/s$/, '')} ${iv > 0 ? 'up' : 'down'}`);
  if (Math.sign(want) !== Math.sign(got) && got !== 0) return `${name(want)}, played going the other way`;
  if (got !== want && (got - want) % 12 === 0) return `${name(want)}, played an octave off`;
  return `${name(want)}, played as ${name(got)}`;
}

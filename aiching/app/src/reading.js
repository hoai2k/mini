// Assemble a reading: cast from the question and the day, then decide what to
// say first, in which order the page shows it and what to look up online.

import { seeded, dayKey, pick } from './rng.js';
import { cast, focusOf, trigramsOf, nuclearOf } from './iching.js';
import { classify, TOPICS, KINDS } from './topics.js';
import { SAGES, TOPIC_ARTICLES, TRIGRAM_ARTICLES } from './lore.js';

// Section order for each kind of question. Every reading shows every section;
// the question decides what comes first.
export const SECTION_ORDER = {
  decision: ['counsel', 'lines', 'becoming', 'judgment', 'trigrams', 'sage', 'world', 'almanac'],
  timing:   ['counsel', 'almanac', 'lines', 'becoming', 'judgment', 'world', 'trigrams', 'sage'],
  why:      ['counsel', 'judgment', 'trigrams', 'lines', 'sage', 'becoming', 'world', 'almanac'],
  how:      ['counsel', 'judgment', 'lines', 'becoming', 'sage', 'trigrams', 'world', 'almanac'],
  open:     ['counsel', 'judgment', 'lines', 'becoming', 'trigrams', 'world', 'sage', 'almanac'],
};

/**
 * @param {string} question
 * @param {Array} hexagrams  the 64 entries of data/hexagrams.json, in order
 * @param {Date} date
 */
export function buildReading(question, hexagrams, date = new Date()) {
  const day = dayKey(date);
  const { rng, seed } = seeded(question, day);
  const thrown = cast(rng);
  const about = classify(question);
  const byN = (n) => hexagrams[n - 1];

  const primary = byN(thrown.primary);
  const relating = thrown.relating ? byN(thrown.relating) : null;
  const focus = focusOf(thrown.changing);

  // Counsel: the asker's own topics first, then the kind of question, then
  // (if the question names no topic) the counsel the cast leans to.
  const topicKeys = about.topics.map((t) => t.key).slice(0, 2);
  if (!topicKeys.length) {
    // An unclassified question: let the cast choose a lens, stable per seed.
    topicKeys.push(pick(rng, Object.keys(TOPICS)));
  }
  const counsel = topicKeys.map((key) => ({ key, label: TOPICS[key].label, zh: TOPICS[key].zh, text: primary.counsel[key], from: primary.n }));
  if (about.kind === 'decision' || about.kind === 'timing') {
    counsel.unshift({ key: about.kind, label: KINDS[about.kind].label, zh: about.kind === 'decision' ? '決' : '時', text: primary.counsel[about.kind], from: primary.n });
  }
  if (relating) {
    const k = topicKeys[0];
    counsel.push({ key: k, label: `Where it leads: ${TOPICS[k].label.toLowerCase()}`, zh: '變', text: relating.counsel[k], from: relating.n });
  }

  // The lines to read, most important first.
  const lineSource = focus.from === 'relating' && relating ? relating : primary;
  const stressed = focus.lines.map((i) => ({ index: i, text: lineSource.lines[i], from: lineSource.n }));
  const otherChanging = thrown.changing
    .filter((i) => !(focus.from === 'primary' && focus.lines.includes(i)))
    .map((i) => ({ index: i, text: primary.lines[i], from: primary.n }));

  const lens = about.primary || (about.kind !== 'open' ? about.kind : topicKeys[0]);
  const sageKey = SAGES[lens] ? lens : 'open';
  const sage = pick(rng, SAGES[sageKey]);

  const tri = trigramsOf(primary.n);
  const articlePool = TOPIC_ARTICLES[lens] || TOPIC_ARTICLES.open;
  const articles = [pick(rng, articlePool), TRIGRAM_ARTICLES[tri.upper.key]];
  if (tri.lower.key !== tri.upper.key) articles.push(TRIGRAM_ARTICLES[tri.lower.key]);

  return {
    question: String(question).trim(),
    day,
    seed,
    about,
    lens,
    throws: thrown.throws,
    values: thrown.values,
    changing: thrown.changing,
    primary,
    relating,
    nuclear: byN(nuclearOf(primary.n)),
    trigrams: tri,
    focus: { ...focus, stressed, otherChanging },
    counsel,
    sage: { text: sage[0], source: sage[1] },
    order: SECTION_ORDER[about.kind],
    online: { articles: [...new Set(articles)], lens },
  };
}

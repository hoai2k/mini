import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { hexagramNumber, linesOf, cast, focusOf, symbolOf, nuclearOf, trigramsOf } from '../src/iching.js';
import { seeded, normalise, sfc32, hash128 } from '../src/rng.js';
import { classify } from '../src/topics.js';
import { buildReading } from '../src/reading.js';
import { chooseFromFeed, gather } from '../src/online.js';
import { dayPillar, solarTerm, lunarDate, moonPhase } from '../src/almanac.js';
import { SAGES, TOPIC_ARTICLES } from '../src/lore.js';

const HEX = JSON.parse(readFileSync(new URL('../data/hexagrams.json', import.meta.url)));
const ASSETS = JSON.parse(readFileSync(new URL('../data/asset-list.json', import.meta.url)));

test('the King Wen table covers all 64 hexagrams once', () => {
  const seen = new Set();
  for (let b = 0; b < 64; b++) {
    const lines = [0, 1, 2, 3, 4, 5].map((i) => (b >> i) & 1);
    const n = hexagramNumber(lines);
    seen.add(n);
    assert.deepEqual(linesOf(n), lines);
  }
  assert.equal(seen.size, 64);
});

test('known hexagrams have the right lines', () => {
  assert.deepEqual(linesOf(1), [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(linesOf(2), [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(linesOf(63), [1, 0, 1, 0, 1, 0]); // fire below water
  assert.deepEqual(linesOf(64), [0, 1, 0, 1, 0, 1]);
  assert.deepEqual(linesOf(3), [1, 0, 0, 0, 1, 0]); // thunder below water
  assert.equal(symbolOf(1), '䷀');
  assert.equal(symbolOf(64), '䷿');
  assert.equal(nuclearOf(1), 1);
  assert.equal(nuclearOf(63), 64);
  assert.equal(trigramsOf(31).upper.key, 'dui');
  assert.equal(trigramsOf(31).lower.key, 'gen');
});

test('three-coin casting has the classic odds', () => {
  const rng = sfc32(hash128('odds'));
  const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
  const N = 40000;
  for (let i = 0; i < N / 6; i++) for (const v of cast(rng).values) counts[v]++;
  const total = Object.values(counts).reduce((a, b) => a + b);
  assert.ok(Math.abs(counts[6] / total - 0.125) < 0.01);
  assert.ok(Math.abs(counts[9] / total - 0.125) < 0.01);
  assert.ok(Math.abs(counts[7] / total - 0.375) < 0.015);
});

test('changing lines produce the relating hexagram', () => {
  const rng = sfc32(hash128('relate'));
  for (let i = 0; i < 500; i++) {
    const c = cast(rng);
    const primary = linesOf(c.primary);
    if (!c.changing.length) { assert.equal(c.relating, null); continue; }
    const flipped = primary.map((v, k) => (c.changing.includes(k) ? 1 - v : v));
    assert.equal(c.relating, hexagramNumber(flipped));
  }
});

test('the same question on the same day casts the same; small differences do not matter', () => {
  const a = buildReading('Should I take the new job?', HEX, new Date(2026, 9, 11));
  const b = buildReading('  should i take the NEW job? ', HEX, new Date(2026, 9, 11, 22));
  const c = buildReading('Should I take the new job?', HEX, new Date(2026, 9, 12));
  assert.deepEqual(a.values, b.values);
  assert.equal(a.seed, b.seed);
  assert.notEqual(a.seed, c.seed);
  assert.equal(normalise(' Hello   World?? '), 'hello world??');
});

test('different questions spread over many hexagrams', () => {
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(buildReading(`question number ${i}`, HEX, new Date(2026, 0, 1)).primary.n);
  assert.ok(seen.size > 55, `only ${seen.size}`);
});

test('questions are classified by topic and kind', () => {
  let q = classify('Should I take the new job at the startup?');
  assert.equal(q.kind, 'decision');
  assert.equal(q.primary, 'work');
  q = classify('When will I find the right partner?');
  assert.equal(q.kind, 'timing');
  assert.equal(q.primary, 'love');
  q = classify('Why do I feel stuck in my creative writing?');
  assert.equal(q.kind, 'why');
  assert.equal(q.primary, 'creativity');
  q = classify('How can I make peace with my brother after our argument?');
  assert.equal(q.kind, 'how');
  assert.ok(['family', 'conflict'].includes(q.primary));
  assert.ok(q.topics.some((t) => t.key === 'conflict'));
  assert.equal(classify('Is it wise to invest my savings in a house?').primary, 'money');
  assert.equal(classify('purple').primary, null);
});

test('the reading puts the question first', () => {
  const r = buildReading('When will my health recover from this stress?', HEX, new Date(2026, 9, 11));
  assert.equal(r.about.kind, 'timing');
  assert.equal(r.counsel[0].key, 'timing');
  assert.equal(r.counsel[1].key, 'health');
  assert.equal(r.order[1], 'almanac');
  assert.equal(r.lens, 'health');
  assert.ok(SAGES.health.some(([t]) => t === r.sage.text));
  assert.ok(TOPIC_ARTICLES.health.includes(r.online.articles[0]));
  const d = buildReading('Should I move abroad?', HEX, new Date(2026, 9, 11));
  assert.equal(d.order[1], 'lines');
  for (const rr of [r, d]) for (const c of rr.counsel) assert.ok(c.text && c.text.length > 20, c.key);
});

test('focus follows Zhu Xi', () => {
  assert.deepEqual(focusOf([]).lines, []);
  assert.deepEqual(focusOf([2]).lines, [2]);
  assert.deepEqual(focusOf([1, 4]).lines, [4, 1]);
  assert.equal(focusOf([0, 1, 2]).useRelating, true);
  const f = focusOf([0, 1, 2, 3]);
  assert.equal(f.from, 'relating');
  assert.deepEqual(f.lines, [4, 5]);
});

test('hexagram data is complete', () => {
  assert.equal(HEX.length, 64);
  HEX.forEach((h, i) => {
    assert.equal(h.n, i + 1);
    assert.equal(h.lines.length, 6);
    for (const k of ['love', 'work', 'money', 'health', 'family', 'creativity', 'study', 'travel', 'spirit', 'conflict', 'decision', 'timing']) assert.ok(h.counsel[k]?.length > 20, `${h.n} ${k}`);
    for (const k of ['zh', 'pinyin', 'name', 'essence', 'judgment', 'image', 'scene', 'season']) assert.ok(h[k], `${h.n} ${k}`);
  });
});

test('every picture the app shows has a request', () => {
  for (let n = 1; n <= 64; n++) assert.ok(ASSETS[`hexagram-${String(n).padStart(2, '0')}`]);
  for (const k of ['qian', 'kun', 'zhen', 'kan', 'gen', 'xun', 'li', 'dui']) assert.ok(ASSETS[`trigram-${k}`]);
  for (const k of ['love', 'work', 'money', 'health', 'family', 'creativity', 'study', 'travel', 'spirit', 'conflict', 'decision', 'timing']) assert.ok(ASSETS[`topic-${k}`]);
  for (const k of ['ui-logo', 'ui-icon', 'ui-home-bg', 'ui-paper', 'ui-result-bg', 'ui-clouds', 'ui-coin-yang', 'ui-coin-yin', 'ui-yang', 'ui-yin', 'ui-divider']) assert.ok(ASSETS[k], k);
});

test('every delivered picture has its web copy', () => {
  for (const [id, a] of Object.entries(ASSETS)) {
    assert.ok(a.path.startsWith('web/') && a.source.startsWith('assets/'), id);
    if (a.status !== 'delivered') continue;
    assert.ok(existsSync(new URL(`../${a.path}`, import.meta.url)), `${id}: ${a.path}`);
    assert.ok(existsSync(new URL(`../${a.source}`, import.meta.url)), `${id}: ${a.source}`);
    if (id.startsWith('hexagram-')) assert.ok(existsSync(new URL(`../${a.path.replace('.webp', '-sm.webp')}`, import.meta.url)), `${id} small`);
  }
});

test('the almanac is right on known days', () => {
  assert.equal(dayPillar(new Date(2000, 0, 1)).zh, '戊午');
  assert.equal(dayPillar(new Date(2000, 0, 2)).zh, '己未');
  assert.equal(solarTerm(new Date(2026, 5, 22)).en, 'Summer Solstice');
  assert.equal(solarTerm(new Date(2026, 11, 23)).en, 'Winter Solstice');
  assert.equal(lunarDate(new Date(2026, 1, 17))?.zh, '丙午年 正月初一');
  assert.ok(moonPhase(new Date(Date.UTC(2026, 9, 26, 4))).illumination > 0.95); // full moon 26 Oct 2026
});

const FEED = {
  onthisday: [
    { year: 1901, text: 'A bridge opens over the river.', pages: [{ title: 'Bridge', extract: 'A bridge.' }] },
    { year: 1952, text: 'A new company is founded to build engines; the founder hires workers.', pages: [{ title: 'Engines Inc', extract: 'An engine company', thumbnail: { source: 'x.jpg' } }] },
  ],
  news: [{ story: '<b>Markets</b> fall after the bank report', links: [{ title: 'Bank', extract: '' }] }],
  image: { title: 'File:Mountain.jpg', thumbnail: { source: 'm.jpg' }, description: { text: 'A mountain' }, file_page: 'https://commons.wikimedia.org/wiki/File:Mountain.jpg' },
};

test('the day\'s events are chosen for the question', () => {
  const r = buildReading('Should I quit my job to start a company?', HEX, new Date(2026, 9, 11));
  const pick = chooseFromFeed(FEED, r);
  assert.equal(pick.event.year, 1952);
  assert.equal(pick.event.matched, true);
  assert.equal(pick.picture.title, 'Mountain');
  const m = chooseFromFeed(FEED, buildReading('Should I invest money with my bank?', HEX, new Date(2026, 9, 11)));
  assert.ok(m.news && m.news.text.startsWith('Markets'));
});

test('online sources fail quietly', async () => {
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {} };
  const r = buildReading('Anything?', HEX, new Date(2026, 9, 11));
  const out = await gather(r, async () => { throw new Error('offline'); });
  assert.equal(out.daily, null);
  assert.deepEqual(out.lore, []);
});

test('the AI opening tries Chrome, then the Worker, then gives up quietly', async () => {
  const { aiOpening, oraclePayload, tidy, chromeOpening } = await import('../src/ai.js');
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const r = buildReading('Should I move to Lisbon?', HEX, new Date(2026, 9, 11));
  const p = oraclePayload(r);
  assert.equal(p.hexagram.n, r.primary.n);
  assert.equal(p.kind, 'A choice to make');
  assert.equal(tidy('  "Hello  there." '), 'Hello there.');

  // Chrome model ready: streamed deltas are joined.
  const lm = {
    availability: async () => 'available',
    create: async () => ({ async *promptStreaming() { yield 'You are '; yield 'torn.'; }, destroy() {} }),
  };
  let seen = '';
  const a = await aiOpening(r, { lm, onText: (t) => { seen = t; }, fetchImpl: async () => { throw new Error('should not fetch'); } });
  assert.deepEqual(a, { text: 'You are torn.', source: 'chrome' });
  assert.equal(seen, 'You are torn.');
  // Cached per reading.
  assert.deepEqual(await aiOpening(r, { lm: null, fetchImpl: async () => { throw new Error('no'); } }), a);

  // Model only downloadable: never start a download; use the Worker.
  const r2 = buildReading('When will work get easier?', HEX, new Date(2026, 9, 11));
  let created = false;
  const lm2 = { availability: async () => 'downloadable', create: async () => { created = true; } };
  assert.equal(await chromeOpening(oraclePayload(r2), null, lm2), null);
  const b = await aiOpening(r2, { lm: lm2, fetchImpl: async (url, init) => {
    assert.match(url, /\/oracle$/);
    assert.equal(JSON.parse(init.body).question, 'When will work get easier?');
    return { ok: true, json: async () => ({ opening: 'Work feels heavy.' }) };
  } });
  assert.equal(created, false);
  assert.deepEqual(b, { text: 'Work feels heavy.', source: 'workers-ai' });

  // Nothing works: null, and nothing cached.
  const r3 = buildReading('Anything at all?', HEX, new Date(2026, 9, 11));
  assert.equal(await aiOpening(r3, { lm: null, fetchImpl: async () => ({ ok: false }) }), null);
  assert.equal([...mem.keys()].filter((k) => k.includes(r3.seed)).length, 0);
});

test('voice input picks a mode and joins spoken words onto typed ones', async () => {
  const { voiceMode, joinText } = await import('../src/voice.js');
  assert.equal(voiceMode({ webkitSpeechRecognition: function () {} }), 'speech');
  assert.equal(voiceMode({ MediaRecorder: function () {}, navigator: { mediaDevices: { getUserMedia() {} } } }), 'record');
  assert.equal(voiceMode({ navigator: {} }), null);
  assert.equal(joinText('', 'should I move abroad'), 'Should I move abroad');
  assert.equal(joinText('Love: ', ' when will it come'), 'Love: when will it come');
  assert.equal(joinText('Typed', ''), 'Typed');
  assert.equal(joinText('', 'x'.repeat(700)).length, 600);
});

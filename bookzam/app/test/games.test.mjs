// Board games on Wikidata (games.js) and photos read in games mode, with
// Wikidata mocked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchGames, pickGame, toGameLookup, lookupGame, clearGameSearches } from '../src/games.js';
import { scanLines } from '../src/reader.js';
import { readingDirections } from '../src/ocr/core.js';
import { clearSearches } from '../src/ocr/identify.js';

const ENTITIES = {
  Q1: { id: 'Q1', labels: { en: { value: 'Wingspan' } }, claims: {
    P2339: [{ mainsnak: { datavalue: { value: '266192' } } }],
    P577: [{ mainsnak: { datavalue: { value: { time: '+2019-01-01T00:00:00Z' } } } }],
    P1872: [{ mainsnak: { datavalue: { value: { amount: '+1' } } } }],
    P1873: [{ mainsnak: { datavalue: { value: { amount: '+5' } } } }],
    P287: [{ mainsnak: { datavalue: { value: { id: 'Q9' } } } }],
    P18: [{ mainsnak: { datavalue: { value: 'Wingspan box.jpg' } } }],
  } },
  Q2: { id: 'Q2', labels: { en: { value: 'Ticket to Ride' } }, aliases: { en: [{ value: 'Zug um Zug' }] }, claims: { P2339: [{ mainsnak: { datavalue: { value: '9209' } } }] } },
  Q9: { id: 'Q9', labels: { en: { value: 'Elizabeth Hargrave' } } },
};

function fakeWikidata() {
  const calls = [];
  const fetch = async (url, init) => {
    const p = new URL(url).searchParams;
    calls.push({ action: p.get('action'), q: p.get('srsearch'), ids: p.get('ids'), headers: init?.headers });
    if (p.get('action') === 'query') {
      const q = p.get('srsearch').toLowerCase();
      const hits = Object.values(ENTITIES).filter((e) => e.claims?.P2339 && (q.split(/ or | /).some((t) => e.labels.en.value.toLowerCase().includes(t))));
      return { ok: true, json: async () => ({ query: { search: hits.map((e) => ({ title: e.id })) } }) };
    }
    const entities = Object.fromEntries(p.get('ids').split('|').map((id) => [id, ENTITIES[id]]).filter(([, e]) => e));
    return { ok: true, json: async () => ({ entities }) };
  };
  return { fetch, calls };
}

test('games are searched on Wikidata among items with a BoardGameGeek ID', async () => {
  clearGameSearches();
  const wd = fakeWikidata();
  const games = await searchGames(['wingspan'], { fetch: wd.fetch });
  assert.equal(wd.calls[0].q, 'wingspan haswbstatement:P2339');
  assert.ok(wd.calls[0].headers['Api-User-Agent'].startsWith('Bookzam'));
  assert.deepEqual(games.map((g) => g.label), ['Wingspan']);
  const l = toGameLookup(games[0]);
  assert.equal(l.bgg, '266192');
  assert.equal(l.year, 2019);
  assert.equal(l.minPlayers, 1);
  assert.equal(l.maxPlayers, 5);
  assert.match(l.cover, /Special:FilePath\/Wingspan%20box\.jpg/);
});

test('a game name matches one word exactly, or most of a longer name in order', () => {
  const games = [{ id: 'Q1', label: 'Wingspan', aliases: [], claims: {} }, { id: 'Q2', label: 'Ticket to Ride', aliases: ['Zug um Zug'], claims: {} }];
  assert.equal(pickGame('WINGSPAN', games).game.id, 'Q1');
  assert.equal(pickGame('WINGSPEN', games), null, 'a one-word name must be read exactly');
  assert.equal(pickGame('TICKET TO RIDE Days of Wonder', games).game.id, 'Q2');
  assert.equal(pickGame('Zug um Zug', games).game.id, 'Q2', 'aliases count');
  assert.equal(pickGame('RIDE TICKET', games), null, 'out of order');
});

test('a game typed in by hand is looked up, with its designer named', async () => {
  clearGameSearches();
  const l = await lookupGame({ title: 'Wingspan' }, { fetch: fakeWikidata().fetch });
  assert.deepEqual(l.designers, ['Elizabeth Hargrave']);
});

const line = (text, cx, cy, w, th, angle = 0, score = 0.95) => {
  const box = { cx, cy, w, h: th * 2.5, th, angle };
  return { text, score, box, dir: readingDirections(box)[0] };
};

test('a photo added to Board games is all games, its small print left out', async () => {
  clearGameSearches();
  clearSearches();
  const lines = [
    line('WINGSPAN', 300, 200, 300, 40),
    line('1-5 players ages 14+', 300, 260, 260, 14),
    line('AZUL', 300, 500, 120, 40),
    line('Some Unknown Game Name', 300, 700, 400, 20),
    line('note', 300, 900, 60, 10),
  ];
  const scan = await scanLines(lines, { fetch: fakeWikidata().fetch, mode: 'games' });
  assert.equal(scan.books.length, 0);
  const titles = scan.games.map((g) => g.title);
  assert.deepEqual(titles, ['Wingspan', 'Azul', 'Some Unknown Game Name'], 'a name with "Game" in it is still a name');
  assert.equal(scan.games[0].designer, 'Elizabeth Hargrave');
  assert.equal(scan.games[0].lookup.bgg, '266192');
  assert.equal(scan.games[1].lookup, null, 'a prominent single word is kept as a game to confirm');

  const asBooks = await scanLines(lines, { fetch: async () => ({ ok: true, json: async () => ({ docs: [] }) }), mode: 'books' });
  assert.equal(asBooks.games.length, 0, 'the same photo added to Books is all books');
  assert.ok(!asBooks.books.some((b) => b.title === 'AZUL'), 'lone words are noise on a bookshelf');
});

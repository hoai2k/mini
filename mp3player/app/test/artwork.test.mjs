import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTitle, cleanArtist, cleanAlbum, similarity, pickBest, artworkUrl, queriesFor, findArtwork, RateLimited } from '../src/artwork.js';

test('stem and edit labels come off the title', () => {
  const cases = {
    'Yellow (Instrumental)': 'Yellow',
    'Yellow [Vocals Only]': 'Yellow',
    'Yellow {no drums}': 'Yellow',
    'Yellow - Instrumental': 'Yellow',
    'Yellow – Acapella': 'Yellow',
    'Yellow (Drums & Bass Removed)': 'Yellow',
    'yellow_vocals': 'yellow',
    'yellow.no_drums': 'yellow',
    'Yellow_stem_bass': 'Yellow',
    'Yellow (htdemucs) - other': 'Yellow',
    'Yellow no vocals': 'Yellow',
    'Yellow instrumental': 'Yellow',
    'Yellow (Slowed + Reverb)': 'Yellow',
    'Yellow (feat. Someone) [Karaoke Version]': 'Yellow',
    'Yellow - 120 BPM - A minor': 'Yellow',
    'Yellow ft. Someone': 'Yellow',
  };
  for (const [raw, want] of Object.entries(cases)) assert.equal(cleanTitle(raw), want, raw);
});

test('real titles are left alone', () => {
  for (const t of ['All About That Bass', 'Piano Man', 'No Woman, No Cry', 'Hey Jude', 'Bohemian Rhapsody (Remastered 2011)'.replace(' (Remastered 2011)', ''), 'Live and Let Die', 'Only Time', 'The Other Side', 'Mr. Blue Sky', 'Under Pressure (with David Bowie)'.replace(' (with David Bowie)', '')]) {
    assert.equal(cleanTitle(t), t, t);
  }
  assert.equal(cleanTitle('Bohemian Rhapsody (Remastered 2011)'), 'Bohemian Rhapsody (Remastered 2011)'); // a year isn't an edit word
  assert.equal(cleanTitle('Under Pressure (with David Bowie)'), 'Under Pressure');
  assert.equal(cleanTitle('(Instrumental)'), '(Instrumental)'); // never empties
});

test('artists and albums', () => {
  assert.equal(cleanArtist('Coldplay feat. Rihanna'), 'Coldplay');
  assert.equal(cleanArtist('Simon & Garfunkel'), 'Simon & Garfunkel');
  assert.equal(cleanArtist('Unknown artist'), '');
  assert.equal(cleanArtist('Various Artists'), '');
  assert.equal(cleanAlbum('Parachutes (Stems)'), 'Parachutes');
  assert.equal(cleanAlbum('misc'), '');
});

test('similarity', () => {
  assert.equal(similarity('Yellow', 'yellow'), 1);
  assert.equal(similarity('Fix You', 'Fix You'), 1);
  assert.ok(similarity('The Scientist', 'Scientist') > 0.6);
  assert.equal(similarity('Yellow', ''), 0);
  assert.ok(similarity('Beyoncé', 'beyonce') === 1);
});

const results = [
  { trackName: 'Yellow (Instrumental Piano)', artistName: 'Instrumental Piano Covers', collectionName: 'Yellow - Single', artworkUrl100: 'https://x/a/100x100bb.jpg' },
  { trackName: 'Yellow', artistName: 'Coldplay', collectionName: 'Parachutes', artworkUrl100: 'https://x/b/100x100bb.jpg' },
  { trackName: 'Yellow (Karaoke Version)', artistName: 'Karaoke Hits', collectionName: 'Hits', artworkUrl100: 'https://x/c/100x100bb.jpg' },
];

test('the original beats covers and karaoke', () => {
  assert.equal(pickBest(results, { title: 'Yellow' }, 'song', 0.8).artistName, 'Coldplay');
  assert.equal(pickBest(results, { title: 'Yellow', artist: 'Coldplay' }, 'song', 0.62).collectionName, 'Parachutes');
  assert.equal(pickBest(results, { title: 'Clocks', artist: 'Coldplay' }, 'song', 0.62), null);
});

test('artwork links grow to 600 px', () => {
  assert.equal(artworkUrl('https://is1-ssl.mzstatic.com/image/thumb/Music/v4/x/y.jpg/100x100bb.jpg'), 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/x/y.jpg/600x600bb.jpg');
});

test('queries: album, artist + title, then the artist (title alone only without an artist)', () => {
  const q = queriesFor({ tracks: [{ title: 'Yellow (Vocals)', artist: 'Coldplay', album: 'Parachutes' }] });
  assert.deepEqual(q.map((x) => `${x.kind}:${x.term}`), ['album:Coldplay Parachutes', 'song:Coldplay Yellow', 'artist:Coldplay']);
  const lone = queriesFor({ tracks: [{ fileName: 'yellow_vocals.wav' }] });
  assert.deepEqual(lone.map((x) => `${x.kind}:${x.term}`), ['song:yellow']);
  // The library guessed the title from the file name, underscores and all turned to spaces
  const guessed = queriesFor({ tracks: [{ title: 'bohemian rhapsody vocals', fileName: '03_bohemian_rhapsody_vocals.mp3' }] });
  assert.deepEqual(guessed.map((x) => x.term), ['bohemian rhapsody']);
  // A real tag title that merely ends in a stem word stays as it is
  assert.deepEqual(queriesFor({ tracks: [{ title: 'All About That Bass', artist: 'Meghan Trainor', fileName: 'x_bass.mp3' }] })[0].term, 'Meghan Trainor All About That Bass');
});

const reply = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });

test('findArtwork walks the queries and stops at the first match', async () => {
  const asked = [];
  const fetch = async (url) => {
    const u = new URL(url);
    asked.push(`${u.searchParams.get('entity')}:${u.searchParams.get('term')}`);
    if (u.searchParams.get('entity') === 'album') return reply({ results: [] });
    return reply({ results });
  };
  const found = await findArtwork({ tracks: [{ title: 'Yellow (Instrumental)', artist: 'Coldplay', album: 'Parachutes' }] }, { fetch });
  assert.deepEqual(asked, ['album:Coldplay Parachutes', 'song:Coldplay Yellow']);
  assert.equal(found.url, 'https://x/b/600x600bb.jpg');
  assert.equal(found.from, 'Coldplay – Yellow');
  assert.equal(await findArtwork({ tracks: [{ title: 'Nothing Like It', artist: 'Nobody' }] }, { fetch: async () => reply({ results: [] }) }), null);
  // No song match for a known artist: their own picture, never a stranger's song of that name
  const byArtist = await findArtwork({ tracks: [{ title: 'Demo 4', artist: 'Coldplay' }] }, {
    fetch: async (url) => reply({ results: new URL(url).searchParams.get('attribute') === 'artistTerm'
      ? [{ artistName: 'Coldplay Tribute Band', collectionName: 'Hits', artworkUrl100: 'https://x/t/100x100bb.jpg' }, { artistName: 'Coldplay', collectionName: 'Parachutes', artworkUrl100: 'https://x/p/100x100bb.jpg' }]
      : [{ trackName: 'Demo 4', artistName: 'Someone Else', artworkUrl100: 'https://x/s/100x100bb.jpg' }] }),
  });
  assert.equal(byArtist.kind, 'artist');
  assert.equal(byArtist.url, 'https://x/p/600x600bb.jpg');
  await assert.rejects(findArtwork({ tracks: [{ title: 'Yellow' }] }, { fetch: async () => reply({}, 403) }), RateLimited);
});

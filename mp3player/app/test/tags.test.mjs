import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTags, fromFileName, mp3Duration, parseMp4, sniffImage } from '../src/tags.js';

const enc = new TextEncoder();
const cat = (...parts) => {
  const arrs = parts.map((p) => (typeof p === 'string' ? enc.encode(p) : p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};
const be32 = (n) => [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255];
const le32 = (n) => [n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255];
const safe = (n) => [n >> 21 & 127, n >> 14 & 127, n >> 7 & 127, n & 127];
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function id3v23(frames) {
  const body = cat(...frames.map(([id, data]) => cat(id, be32(data.length), [0, 0], data)));
  return cat('ID3', [3, 0, 0], safe(body.length), body);
}
function id3v24(frames) {
  const body = cat(...frames.map(([id, data]) => cat(id, safe(data.length), [0, 0], data)), new Uint8Array(20));
  return cat('ID3', [4, 0, 0], safe(body.length), body);
}
const text = (s) => cat([3], s); // UTF-8
const utf16 = (s) => { const b = [1, 0xff, 0xfe]; for (const c of s) { const n = c.charCodeAt(0); b.push(n & 255, n >> 8); } return Uint8Array.from(b); };

test('ID3v2.3 text frames, UTF-16 and front cover', () => {
  const tag = id3v23([
    ['TIT2', utf16('Café Song')],
    ['TPE1', cat([0], 'The Band')],
    ['TALB', text('First Album')],
    ['TRCK', cat([0], '3/12')],
    ['TYER', cat([0], '1999')],
    ['APIC', cat([0], 'image/jpeg', [0], [4], 'back', [0], Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 9]))],
    ['APIC', cat([0], 'image/jpeg', [0], [3], 'front', [0], JPEG)],
  ]);
  const t = parseTags(tag);
  assert.equal(t.title, 'Café Song');
  assert.equal(t.artist, 'The Band');
  assert.equal(t.album, 'First Album');
  assert.equal(t.track, 3);
  assert.equal(t.year, 1999);
  assert.equal(t.picture.mime, 'image/jpeg');
  assert.deepEqual([...t.picture.data], [...JPEG]);
});

test('ID3v2.4 synchsafe sizes, padding and TDRC', () => {
  const t = parseTags(id3v24([['TIT2', text('Four')], ['TPE2', text('Various Artists')], ['TDRC', text('2021-04-01')], ['TPOS', text('2/2')]]));
  assert.equal(t.title, 'Four');
  assert.equal(t.albumArtist, 'Various Artists');
  assert.equal(t.year, 2021);
  assert.equal(t.disc, 2);
});

test('ID3v2.2 three-letter frames', () => {
  const frame = (id, data) => cat(id, [0, data.length >> 8, data.length & 255], data);
  const body = cat(frame('TT2', cat([0], 'Old')), frame('TP1', cat([0], 'Someone')), frame('PIC', cat([0], 'JPG', [3], [0], JPEG)));
  const t = parseTags(cat('ID3', [2, 0, 0], safe(body.length), body));
  assert.equal(t.title, 'Old');
  assert.equal(t.artist, 'Someone');
  assert.equal(t.picture.mime, 'image/jpeg');
});

test('ID3v1 at the end fills what v2 lacks', () => {
  const tail = new Uint8Array(128);
  tail.set(enc.encode('TAG'), 0);
  tail.set(enc.encode('Tail Title'), 3);
  tail.set(enc.encode('Tail Artist'), 33);
  tail.set(enc.encode('Tail Album'), 63);
  tail[126] = 7;
  const t = parseTags(id3v23([['TIT2', text('Head Title')]]), tail);
  assert.equal(t.title, 'Head Title');
  assert.equal(t.artist, 'Tail Artist');
  assert.equal(t.album, 'Tail Album');
  assert.equal(t.track, 7);
});

test('FLAC stream info and vorbis comments', () => {
  const comments = ['TITLE=Flac Title', 'ARTIST=Flac Artist', 'ALBUM=Flac Album', 'TRACKNUMBER=05'];
  const vc = cat(le32(3), 'xyz', le32(comments.length), ...comments.map((c) => cat(le32(enc.encode(c).length), c)));
  const info = new Uint8Array(34);
  // 44100 Hz, 441000 samples → 10 s
  const rate = 44100;
  info[10] = rate >> 12; info[11] = (rate >> 4) & 255; info[12] = (rate & 15) << 4;
  info.set(be32(441000), 14);
  const block = (type, body, last) => cat([(last ? 0x80 : 0) | type], [body.length >> 16, (body.length >> 8) & 255, body.length & 255], body);
  const t = parseTags(cat('fLaC', block(0, info), block(4, vc, true)));
  assert.equal(t.title, 'Flac Title');
  assert.equal(t.artist, 'Flac Artist');
  assert.equal(t.track, 5);
  assert.equal(t.duration, 10);
});

test('MP4 ilst atoms and mvhd duration', () => {
  const raw = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0)); // atom names are Latin-1 (©nam)
  const box = (type, ...body) => { const b = cat(...body); return cat(be32(b.length + 8), raw(type), b); };
  const data = (type, payload) => box('data', be32(type), be32(0), payload);
  const mvhd = box('mvhd', [0, 0, 0, 0], be32(0), be32(0), be32(1000), be32(125000), new Uint8Array(80));
  const ilst = box('ilst',
    box('\xa9nam', data(1, enc.encode('M4A Title'))),
    box('\xa9ART', data(1, enc.encode('M4A Artist'))),
    box('trkn', data(0, Uint8Array.from([0, 0, 0, 9, 0, 12, 0, 0]))),
    box('covr', data(13, JPEG)));
  const moov = box('moov', mvhd, box('udta', box('meta', [0, 0, 0, 0], ilst)));
  const t = parseMp4(moov);
  assert.equal(t.title, 'M4A Title');
  assert.equal(t.artist, 'M4A Artist');
  const whole = parseTags(cat(box('ftyp', 'M4A ', be32(0)), moov));
  assert.equal(whole.track, 9);
  assert.equal(whole.duration, 125);
  assert.equal(t.duration, 125);
  assert.equal(t.track, '9');
  assert.ok(t.picture);
});

test('MP3 duration from a Xing header and from the bitrate', () => {
  const frame = new Uint8Array(400);
  frame.set([0xff, 0xfb, 0x90, 0x00]); // MPEG1 layer III, 128 kbps, 44.1 kHz, stereo
  assert.equal(Math.round(mp3Duration(frame, 1_600_000)), 100); // 1.6 MB at 128 kbps
  frame.set(enc.encode('Xing'), 36);
  frame.set(be32(1), 40);
  frame.set(be32(3828), 44); // 3828 frames × 1152 / 44100 ≈ 100 s
  assert.equal(Math.round(mp3Duration(frame, 9)), 100);
});

test('file names and folders', () => {
  assert.deepEqual(fromFileName('03 - Blue Skies.mp3'), { track: 3, title: 'Blue Skies' });
  assert.deepEqual(fromFileName('Nina Simone - Feeling Good.mp3'), { artist: 'Nina Simone', title: 'Feeling Good' });
  assert.deepEqual(fromFileName('1-02 Song.flac', 'Music/Artist X/Album Y/1-02 Song.flac'), { track: 2, disc: 1, title: 'Song', album: 'Album Y', artist: 'Artist X' });
  assert.deepEqual(fromFileName('voice_memo.m4a'), { title: 'voice memo' });
  assert.deepEqual(fromFileName('song.mp3', 'misc/song.mp3'), { title: 'song' }); // one loose folder says nothing
});

test('image sniffing', () => {
  assert.equal(sniffImage(JPEG), 'image/jpeg');
  assert.equal(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), 'image/png');
  assert.equal(sniffImage(Uint8Array.from([1, 2, 3, 4])), '');
});

test('garbage never throws', () => {
  const junk = Uint8Array.from({ length: 5000 }, (_, i) => (i * 7919) & 255);
  assert.doesNotThrow(() => parseTags(junk, junk.subarray(0, 128), 5000));
  assert.doesNotThrow(() => parseTags(cat('ID3', [3, 0, 0], safe(999999), 'TIT2')));
  assert.doesNotThrow(() => parseTags(cat('fLaC', [4, 255, 255, 255])));
});

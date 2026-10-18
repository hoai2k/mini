// Reads song details (title, artist, album, track number, cover art) from
// audio files: ID3v1/v2 (MP3, and AAC/WAV/AIFF that carry it), FLAC, Ogg
// Vorbis/Opus comments, MP4/M4A atoms and WAV LIST INFO. Pure parsing works on
// Uint8Arrays (`parseTags`) so it runs under node --test; `readTags` slices a
// File in the browser. Anything missing comes from the file name
// (`fromFileName`).

const HEAD_BYTES = 1 << 20; // 1 MiB covers almost every tag; ID3 sizes extend it

/** @typedef {{ title?: string, artist?: string, albumArtist?: string, album?: string,
 *   track?: number, disc?: number, year?: number, genre?: string, duration?: number,
 *   picture?: { mime: string, data: Uint8Array } }} Tags */

const latin1 = new TextDecoder('latin1');
const utf8 = new TextDecoder('utf-8');
const utf16le = new TextDecoder('utf-16le');
const utf16be = new TextDecoder('utf-16be');

const ascii = (b, start, len) => latin1.decode(b.subarray(start, start + len));
const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u32le = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const u24 = (b, i) => (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
const synchsafe = (b, i) => ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f);

function clean(s) {
  if (typeof s !== 'string') return undefined;
  // eslint-disable-next-line no-control-regex
  const t = s.replace(/\u0000+$/g, '').replace(/\u0000/g, ' / ').replace(/\s+/g, ' ').trim();
  return t || undefined;
}

/** "3/12" → 3 */
function leadingNumber(s) {
  const m = /^\s*(\d+)/.exec(String(s ?? ''));
  return m ? Number(m[1]) : undefined;
}

function yearOf(s) {
  const m = /(\d{4})/.exec(String(s ?? ''));
  return m ? Number(m[1]) : undefined;
}

/** Undo ID3 unsynchronisation (0xFF 0x00 → 0xFF). */
function unsync(b) {
  const out = new Uint8Array(b.length);
  let j = 0;
  for (let i = 0; i < b.length; i++) {
    out[j++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0x00) i++;
  }
  return out.subarray(0, j);
}

function decodeText(enc, b) {
  if (enc === 0) return latin1.decode(b);
  if (enc === 3) return utf8.decode(b);
  if (enc === 2) return utf16be.decode(b);
  // enc 1: UTF-16 with a BOM; values after a null separator may carry their own BOM
  const parts = [];
  let i = 0;
  while (i + 1 < b.length) {
    let le = true;
    if (b[i] === 0xfe && b[i + 1] === 0xff) { le = false; i += 2; } else if (b[i] === 0xff && b[i + 1] === 0xfe) { i += 2; }
    let end = i;
    while (end + 1 < b.length && !(b[end] === 0 && b[end + 1] === 0)) end += 2;
    parts.push((le ? utf16le : utf16be).decode(b.subarray(i, end)));
    i = end + 2;
  }
  return parts.join('\u0000');
}

/** Index of the terminator for text in encoding `enc` starting at `i`. */
function terminator(b, i, enc) {
  if (enc === 1 || enc === 2) {
    for (let j = i; j + 1 < b.length; j += 2) if (b[j] === 0 && b[j + 1] === 0) return j;
    return b.length;
  }
  const j = b.indexOf(0, i);
  return j < 0 ? b.length : j;
}

const ID3_TEXT = {
  TIT2: 'title', TT2: 'title',
  TPE1: 'artist', TP1: 'artist',
  TPE2: 'albumArtist', TP2: 'albumArtist',
  TALB: 'album', TAL: 'album',
  TRCK: 'track', TRK: 'track',
  TPOS: 'disc', TPA: 'disc',
  TYER: 'year', TYE: 'year', TDRC: 'year', TORY: 'year', TDOR: 'year',
  TCON: 'genre', TCO: 'genre',
};

/** Total size of an ID3v2 tag at the start of `b` (header + body + footer), or 0. */
export function id3Size(b) {
  if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0;
  return 10 + synchsafe(b, 6) + (b[5] & 0x10 ? 10 : 0);
}

function parseId3v2(b, tags) {
  const size = id3Size(b);
  if (!size) return 0;
  const major = b[3];
  const flags = b[5];
  if (major < 2 || major > 4) return size;
  let body = b.subarray(10, Math.min(b.length, 10 + synchsafe(b, 6)));
  if (major < 4 && flags & 0x80) body = unsync(body);
  let i = 0;
  if (major >= 3 && flags & 0x40) i = major === 4 ? synchsafe(body, 0) : u32(body, 0) + 4;
  const idLen = major === 2 ? 3 : 4;
  const headLen = major === 2 ? 6 : 10;
  let picture = null;
  while (i + headLen <= body.length) {
    const id = ascii(body, i, idLen);
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding
    const len = major === 2 ? u24(body, i + 3) : major === 4 ? synchsafe(body, i + 4) : u32(body, i + 4);
    const fflags = major === 2 ? 0 : body[i + 9];
    let data = body.subarray(i + headLen, i + headLen + len);
    i += headLen + len;
    if (len <= 0) continue;
    if (major === 4) {
      if (fflags & 0x0c) continue; // compressed or encrypted
      if (fflags & 0x02) data = unsync(data.subarray(fflags & 0x01 ? 4 : 0));
      else if (fflags & 0x01) data = data.subarray(4);
    } else if (major === 3) {
      if (fflags & 0xc0) continue;
      if (fflags & 0x20) data = data.subarray(1);
    }
    const key = ID3_TEXT[id];
    if (key) {
      const value = clean(decodeText(data[0], data.subarray(1)));
      if (value && tags[key] === undefined) tags[key] = value;
    } else if (id === 'APIC' || id === 'PIC') {
      const enc = data[0];
      let p = 1;
      let mime;
      if (id === 'PIC') {
        const fmt = ascii(data, 1, 3).toLowerCase();
        mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
        p = 4;
      } else {
        const end = data.indexOf(0, 1);
        if (end < 0) continue;
        mime = ascii(data, 1, end - 1).toLowerCase() || 'image/jpeg';
        if (!mime.includes('/')) mime = `image/${mime === 'jpg' ? 'jpeg' : mime}`;
        p = end + 1;
      }
      const type = data[p];
      const descEnd = terminator(data, p + 1, enc);
      const start = descEnd + (enc === 1 || enc === 2 ? 2 : 1);
      if (start >= data.length || mime === '-->') continue;
      if (!picture || (type === 3 && picture.type !== 3)) picture = { type, mime, data: data.slice(start) };
    }
  }
  if (picture && !tags.picture) tags.picture = { mime: sniffImage(picture.data) || picture.mime, data: picture.data };
  return size;
}

function parseId3v1(tail, tags) {
  if (!tail || tail.length < 128) return;
  const b = tail.subarray(tail.length - 128);
  if (ascii(b, 0, 3) !== 'TAG') return;
  const field = (s, l) => clean(latin1.decode(b.subarray(s, s + l)));
  tags.title ??= field(3, 30);
  tags.artist ??= field(33, 30);
  tags.album ??= field(63, 30);
  tags.year ??= field(93, 4);
  if (b[125] === 0 && b[126]) tags.track ??= String(b[126]);
}

const VORBIS = {
  TITLE: 'title', ARTIST: 'artist', ALBUMARTIST: 'albumArtist', 'ALBUM ARTIST': 'albumArtist',
  ALBUM: 'album', TRACKNUMBER: 'track', DISCNUMBER: 'disc', DATE: 'year', YEAR: 'year', GENRE: 'genre',
};

function parseVorbisComment(b, i, tags) {
  const end = b.length;
  if (i + 4 > end) return;
  i += 4 + u32le(b, i); // vendor string
  if (i + 4 > end) return;
  let count = u32le(b, i);
  i += 4;
  while (count-- > 0 && i + 4 <= end) {
    const len = u32le(b, i);
    i += 4;
    if (i + len > end) return;
    const s = utf8.decode(b.subarray(i, i + len));
    i += len;
    const eq = s.indexOf('=');
    if (eq < 0) continue;
    const key = VORBIS[s.slice(0, eq).toUpperCase()];
    const value = clean(s.slice(eq + 1));
    if (key && value && tags[key] === undefined) tags[key] = value;
  }
}

function parseFlacPicture(b, tags) {
  let i = 0;
  const type = u32(b, i); i += 4;
  const mimeLen = u32(b, i); i += 4;
  const mime = ascii(b, i, mimeLen); i += mimeLen;
  const descLen = u32(b, i); i += 4 + descLen + 16;
  const len = u32(b, i); i += 4;
  if (i + len > b.length) return;
  if (!tags.picture || type === 3) tags.picture = { mime: sniffImage(b.subarray(i, i + 4)) || mime, data: b.slice(i, i + len) };
}

function parseFlac(b, start, tags) {
  let i = start + 4;
  for (;;) {
    if (i + 4 > b.length) return;
    const last = b[i] & 0x80;
    const type = b[i] & 0x7f;
    const len = u24(b, i + 1);
    const body = b.subarray(i + 4, i + 4 + len);
    if (type === 0 && body.length >= 18) {
      const rate = (body[10] << 12) | (body[11] << 4) | (body[12] >> 4);
      const samples = (body[13] & 0x0f) * 2 ** 32 + u32(body, 14);
      if (rate && samples) tags.duration = samples / rate;
    } else if (type === 4) {
      parseVorbisComment(body, 0, tags);
    } else if (type === 6 && body.length === len) {
      parseFlacPicture(body, tags);
    }
    i += 4 + len;
    if (last) return;
  }
}

/** Ogg Vorbis/Opus: find the comment header in the first pages and read it as one run. */
function parseOgg(b, tags) {
  // Join page payloads so a comment packet split across pages still reads.
  const parts = [];
  let i = 0;
  let total = 0;
  while (i + 27 <= b.length && ascii(b, i, 4) === 'OggS' && total < HEAD_BYTES) {
    const segs = b[i + 26];
    let len = 0;
    for (let s = 0; s < segs; s++) len += b[i + 27 + s];
    const start = i + 27 + segs;
    parts.push(b.subarray(start, start + len));
    total += len;
    i = start + len;
  }
  const joined = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { joined.set(p, o); o += p.length; }
  const find = (sig) => {
    const s = new TextEncoder().encode(sig);
    outer: for (let j = 0; j + s.length <= joined.length; j++) {
      for (let k = 0; k < s.length; k++) if (joined[j + k] !== s[k]) continue outer;
      return j + s.length;
    }
    return -1;
  };
  let at = find('\x03vorbis');
  if (at < 0) at = find('OpusTags');
  if (at >= 0) parseVorbisComment(joined, at, tags);
}

const MP4_KEYS = {
  '\xa9nam': 'title', '\xa9ART': 'artist', aART: 'albumArtist', '\xa9alb': 'album',
  '\xa9day': 'year', '\xa9gen': 'genre',
};

/** Walk MP4 boxes in b[start, end), calling visit(type, bodyStart, bodyEnd). */
function boxes(b, start, end, visit) {
  let i = start;
  while (i + 8 <= end) {
    let size = u32(b, i);
    const type = ascii(b, i + 4, 4);
    let head = 8;
    if (size === 1) { size = u32(b, i + 8) * 2 ** 32 + u32(b, i + 12); head = 16; }
    if (size === 0) size = end - i;
    if (size < head) return;
    visit(type, i + head, Math.min(end, i + size));
    i += size;
  }
}

/** Parse an MP4 `moov` box body (or a whole file whose moov is inside `b`). */
export function parseMp4(b, tags = {}) {
  const walk = (start, end, path) => boxes(b, start, end, (type, s, e) => {
    if (type === 'moov' || type === 'udta' || type === 'ilst') walk(s, e, path + '/' + type);
    else if (type === 'meta') walk(s + 4, e, path + '/meta');
    else if (type === 'mvhd' && tags.duration === undefined) {
      const v = b[s];
      const scale = v === 1 ? u32(b, s + 20) : u32(b, s + 12);
      const dur = v === 1 ? u32(b, s + 24) * 2 ** 32 + u32(b, s + 28) : u32(b, s + 16);
      if (scale) tags.duration = dur / scale;
    } else if (path.endsWith('/ilst')) {
      boxes(b, s, e, (dtype, ds, de) => {
        if (dtype !== 'data' || de - ds < 8) return;
        const kind = u32(b, ds) & 0xffffff;
        const payload = b.subarray(ds + 8, de);
        if (type === 'trkn' || type === 'disk') {
          if (payload.length >= 4) tags[type === 'trkn' ? 'track' : 'disc'] ??= String((payload[2] << 8) | payload[3]);
        } else if (type === 'covr') {
          if (!tags.picture) tags.picture = { mime: sniffImage(payload) || (kind === 14 ? 'image/png' : 'image/jpeg'), data: payload.slice() };
        } else if (MP4_KEYS[type]) {
          const value = clean(utf8.decode(payload));
          if (value) tags[MP4_KEYS[type]] ??= value;
        }
      });
    }
  });
  walk(0, b.length, '');
  return tags;
}

function parseWav(b, tags) {
  boxesLE(b, 12, b.length, (id, s, e) => {
    if (id === 'LIST' && ascii(b, s, 4) === 'INFO') {
      boxesLE(b, s + 4, e, (k, ks, ke) => {
        const key = { INAM: 'title', IART: 'artist', IPRD: 'album', ICRD: 'year', IPRT: 'track', ITRK: 'track', IGNR: 'genre' }[k];
        const value = key && clean(latin1.decode(b.subarray(ks, ke)));
        if (value) tags[key] ??= value;
      });
    } else if ((id === 'id3 ' || id === 'ID3 ') && !tags.title) {
      parseId3v2(b.subarray(s, e), tags);
    }
  });
}

function boxesLE(b, start, end, visit) {
  let i = start;
  while (i + 8 <= end) {
    const id = ascii(b, i, 4);
    const size = u32le(b, i + 4);
    visit(id, i + 8, Math.min(end, i + 8 + size));
    i += 8 + size + (size & 1);
  }
}

/** Image MIME type from magic bytes, or ''. */
export function sniffImage(b) {
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
  return '';
}

const MP3_RATES = {
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
MP3_RATES['2-3'] = MP3_RATES['2-2'];

/**
 * MP3 duration from the first frame: exact from a Xing/Info or VBRI header,
 * else estimated from the bitrate and the file size. `b` starts at the audio.
 */
export function mp3Duration(b, audioBytes) {
  for (let i = 0; i + 4 < Math.min(b.length, 65536); i++) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) continue;
    const verBits = (b[i + 1] >> 3) & 3; // 0: 2.5, 2: 2, 3: 1
    const layerBits = (b[i + 1] >> 1) & 3; // 1: III, 2: II, 3: I
    const rateIdx = b[i + 2] >> 4;
    const srIdx = (b[i + 2] >> 2) & 3;
    if (verBits === 1 || layerBits === 0 || rateIdx === 0 || rateIdx === 15 || srIdx === 3) continue;
    const v1 = verBits === 3;
    const layer = 4 - layerBits;
    const kbps = MP3_RATES[`${v1 ? 1 : 2}-${layer}`][rateIdx];
    const rate = [44100, 48000, 32000][srIdx] / (v1 ? 1 : verBits === 2 ? 2 : 4);
    const perFrame = layer === 1 ? 384 : layer === 3 && !v1 ? 576 : 1152;
    const mono = (b[i + 3] >> 6) === 3;
    const xing = i + 4 + (v1 ? (mono ? 17 : 32) : (mono ? 9 : 17));
    const tag = ascii(b, xing, 4);
    if ((tag === 'Xing' || tag === 'Info') && b[xing + 7] & 1) {
      const frames = u32(b, xing + 8);
      if (frames) return (frames * perFrame) / rate;
    }
    if (ascii(b, i + 36, 4) === 'VBRI') {
      const frames = u32(b, i + 36 + 14);
      if (frames) return (frames * perFrame) / rate;
    }
    return audioBytes > 0 ? ((audioBytes - i) * 8) / (kbps * 1000) : undefined;
  }
  return undefined;
}

/** Turn raw string fields into the shapes the library uses. */
function finish(tags) {
  const out = { ...tags };
  out.track = leadingNumber(tags.track);
  out.disc = leadingNumber(tags.disc);
  out.year = yearOf(tags.year);
  if (out.genre) out.genre = out.genre.replace(/^\((\d+)\)$/, '').trim() || undefined;
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

/**
 * Parse tags from the head of a file (and optionally its last 128 bytes, for
 * ID3v1). `head` should hold the whole ID3v2 tag when there is one;
 * `fileSize` lets an MP3 without a VBR header estimate its duration.
 * @param {Uint8Array} head @param {Uint8Array} [tail] @param {number} [fileSize] @returns {Tags}
 */
export function parseTags(head, tail, fileSize = 0) {
  const tags = {};
  const id3 = parseId3v2(head, tags);
  const rest = head.subarray(Math.min(id3, head.length));
  const sig = ascii(rest, 0, 4);
  if (sig === 'fLaC') parseFlac(rest, 0, tags);
  else if (sig === 'OggS') parseOgg(rest, tags);
  else if (sig === 'RIFF' && ascii(rest, 8, 4) === 'WAVE') parseWav(rest, tags);
  else if (ascii(rest, 4, 4) === 'ftyp') parseMp4(rest, tags);
  else {
    const tailTag = tail && tail.length >= 128 && ascii(tail, tail.length - 128, 3) === 'TAG' ? 128 : 0;
    const d = mp3Duration(rest, fileSize ? fileSize - id3 - tailTag : 0);
    if (d) tags.duration = d;
  }
  parseId3v1(tail, tags);
  return finish(tags);
}

/**
 * Guess details from a file name and folder path:
 * "Artist/Album/01 - Title.mp3", "Artist - Title.mp3", "03. Title.flac".
 * @param {string} name @param {string} [path] path inside the picked folder, including the name
 */
export function fromFileName(name, path = '') {
  const out = {};
  let base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const num = /^(?:(\d)[-.])?(\d{1,3})(?:\s*[-.)]\s*|\s+)(.+)$/.exec(base);
  if (num) {
    out.track = Number(num[2]);
    if (num[1]) out.disc = Number(num[1]);
    base = num[3];
  }
  const dash = base.split(/\s+[-–—]\s+/);
  if (dash.length >= 2) {
    out.artist = dash[0].trim();
    out.title = dash.slice(1).join(' - ').trim();
  } else {
    out.title = base;
  }
  const dirs = path.split('/').slice(0, -1).filter(Boolean);
  // Only an Artist/Album/song layout says what the folders mean.
  if (dirs.length >= 2) {
    out.album = dirs[dirs.length - 1];
    out.artist ??= dirs[dirs.length - 2];
  }
  return out;
}

async function bytes(blob, start, end) {
  return new Uint8Array(await blob.slice(start, end).arrayBuffer());
}

/** Find an MP4 file's moov box when it is not near the start (non-faststart files). */
async function readMp4Moov(file) {
  let i = 0;
  for (let guard = 0; guard < 64 && i + 8 <= file.size; guard++) {
    const h = await bytes(file, i, i + 16);
    let size = u32(h, 0);
    const type = ascii(h, 4, 4);
    if (size === 1) size = u32(h, 8) * 2 ** 32 + u32(h, 12);
    if (size === 0) size = file.size - i;
    if (size < 8) return null;
    if (type === 'moov') return bytes(file, i, i + Math.min(size, 32 << 20));
    i += size;
  }
  return null;
}

/** Read tags from a File or Blob in the browser. Never throws. */
export async function readTags(file) {
  try {
    let head = await bytes(file, 0, Math.min(file.size, HEAD_BYTES));
    const size = id3Size(head);
    if (size > head.length && size < 64 << 20) head = await bytes(file, 0, Math.min(file.size, size + 65536));
    const tail = file.size > 128 ? await bytes(file, file.size - 128, file.size) : undefined;
    let tags = parseTags(head, tail, file.size);
    if (ascii(head, 4, 4) === 'ftyp' && !tags.title && tags.duration === undefined) {
      const moov = await readMp4Moov(file);
      if (moov) tags = finish(parseMp4(moov, {}));
    }
    return tags;
  } catch {
    return {};
  }
}

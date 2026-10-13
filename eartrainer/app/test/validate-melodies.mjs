// Validate the melody library: node eartrainer/app/test/validate-melodies.mjs [file...]
// Prints each problem and a summary; exits 1 on any problem.
import { parseNotes, range } from '../src/music.js';
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'data', 'melodies');
const files = process.argv.slice(2).length ? process.argv.slice(2).map((f) => resolve(f))
  : readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'index.js').map((f) => join(dir, f));
export const CATS = ['jazz', 'bebop', 'licks', 'traditional', 'classical', 'children', 'holiday', 'popular'];
let problems = 0, total = 0;
const ids = new Map();
for (const f of files) {
  const mod = await import(pathToFileURL(f).href);
  const list = mod.default;
  if (!Array.isArray(list)) { console.log(`${f}: default export is not an array`); problems++; continue; }
  for (const m of list) {
    total++;
    const where = `${f.split('/').pop()} ${m.id}`;
    const bad = (msg) => { console.log(`${where}: ${msg}`); problems++; };
    if (!/^[a-z0-9-]+$/.test(m.id || '')) bad('id must be lowercase-kebab');
    if (ids.has(m.id)) bad(`duplicate id (also in ${ids.get(m.id)})`); else ids.set(m.id, f.split('/').pop());
    if (!m.title) bad('missing title');
    if (!m.by) bad('missing by');
    if (!CATS.includes(m.cat)) bad(`cat must be one of ${CATS.join(', ')}`);
    if (!(m.bpm >= 40 && m.bpm <= 260)) bad('bpm must be 40..260');
    try {
      const notes = parseNotes(m.notes);
      const { lo, hi, span } = range(notes);
      if (notes.length < 3 || notes.length > 16) bad(`${notes.length} notes (want 3..16)`);
      if (span > 16) bad(`range ${span} semitones (max 16)`);
      if (lo < 36 || hi > 96) bad('notes must lie within C2..C7');
    } catch (e) { bad(e.message); }
  }
}
console.log(`${total} melodies in ${files.length} file(s), ${problems} problem(s)`);

// Whole songs (the Full Songs mode): every phrase must be a playable melody.
if (!process.argv.slice(2).length) {
  const sdir = join(here, '..', 'data', 'songs');
  let songs = 0, phrases = 0;
  for (const f of readdirSync(sdir).filter((f) => f.endsWith('.js') && f !== 'index.js')) {
    for (const s of (await import(pathToFileURL(join(sdir, f)).href)).default) {
      songs++;
      const bad = (msg) => { console.log(`songs/${f} ${s.id}: ${msg}`); problems++; };
      if (!/^song-[a-z0-9-]+$/.test(s.id || '')) bad('id must be song-lowercase-kebab');
      if (ids.has(s.id)) bad(`duplicate id (also in ${ids.get(s.id)})`); else ids.set(s.id, `songs/${f}`);
      if (!s.title || !s.by) bad('missing title or by');
      if (!CATS.includes(s.cat)) bad(`cat must be one of ${CATS.join(', ')}`);
      if (!(s.bpm >= 40 && s.bpm <= 260)) bad('bpm must be 40..260');
      if (!Array.isArray(s.phrases) || s.phrases.length < 2) { bad('want at least two phrases'); continue; }
      s.phrases.forEach((p, i) => {
        phrases++;
        try {
          const notes = parseNotes(p);
          const { lo, hi, span } = range(notes);
          if (notes.length < 3 || notes.length > 16) bad(`phrase ${i + 1}: ${notes.length} notes (want 3..16)`);
          if (span > 16) bad(`phrase ${i + 1}: range ${span} semitones (max 16)`);
          if (lo < 36 || hi > 96) bad(`phrase ${i + 1}: notes must lie within C2..C7`);
        } catch (e) { bad(`phrase ${i + 1}: ${e.message}`); }
      });
    }
  }
  console.log(`${songs} whole songs, ${phrases} phrases, ${problems} problem(s) in all`);
}
process.exit(problems ? 1 : 0);

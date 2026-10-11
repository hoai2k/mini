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
export const CATS = ['jazz', 'licks', 'traditional', 'classical', 'children', 'holiday', 'popular'];
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
process.exit(problems ? 1 : 0);

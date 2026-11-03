// Builds audio-triggers.js for the workbench's Audio tab: every place the game
// plays a sound (each audio.play / audio.loop call in micro/game/), what it
// plays in the Default set and in the Experimental set (shared/audio.js: an
// id added on 2 November 2026 plays its `old:` stand-in in Default, or
// nothing; `only:` limits a call to one set), with the description and the
// generation prompt of each sound from micro/design/sound-effects.md.
//
//   node micro/workbench/build_audio_triggers.mjs           # rewrite it
//   node micro/workbench/build_audio_triggers.mjs --check   # fail if stale
//
// Calls whose sound id is not a literal (a variable, a table lookup) can't be
// read this way; they are counted and listed in the file as `dynamic`, and
// their sounds still appear in the sound list below the triggers.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const micro = dirname(here);
const game = join(micro, 'game');
const OUT = join(here, 'audio-triggers.js');

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  if (e.isDirectory()) return ['vendor', 'assets', 'src', 'music', 'icons'].includes(e.name) ? [] : walk(join(d, e.name));
  return e.name.endsWith('.js') && e.name !== 'audio.js' && e.name !== 'audio-list.js' ? [join(d, e.name)] : [];
});

// ---- the ids added on 2 November (they have no Default sound of their own)
const listSrc = readFileSync(join(game, 'shared', 'audio-list.js'), 'utf8');
const added = new Set([...listSrc.slice(listSrc.indexOf('export const ADDED')).matchAll(/"([a-z]+\/[a-z0-9-]+)"/g)].map((m) => m[1]));

// ---- descriptions and prompts from sound-effects.md
const md = readFileSync(join(micro, 'design', 'sound-effects.md'), 'utf8');
const used = {}, events = {}, prompts = {};
let section = '';
for (const line of md.split('\n')) {
  if (line.startsWith('## ')) section = line.slice(3);
  const cells = line.startsWith('| `') ? line.split('|').slice(1, -1).map((c) => c.trim()) : null;
  if (!cells) continue;
  const id = cells[0].replace(/`/g, '');
  if (section === 'Wiring') events[id] = cells[1];
  else if (cells.length >= 5) used[id] = cells[4];
}
for (const m of md.matchAll(/^### ([a-z]+\/[a-z0-9-]+)\n+```text\n([\s\S]*?)\n```/gm)) prompts[m[1]] = m[2];

// ---- a tiny JS reader: balanced call arguments, top-level splits
function callArgs(src, open) { // src[open] === '('; returns the text inside
  let depth = 0, q = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { if (--depth === 0) return src.slice(open + 1, i); }
  }
  return null;
}
function splitTop(s, sep = ',') {
  const out = []; let depth = 0, q = null, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === sep && depth === 0) { out.push(s.slice(start, i).trim()); start = i + 1; }
  }
  const last = s.slice(start).trim();
  if (last) out.push(last);
  return out;
}
const unwrap = (s, a, b) => (s.startsWith(a) && s.endsWith(b) ? s.slice(1, -1) : null);
function props(obj) { // '{ a: 1, old: [...] }' -> { a: '1', old: '[...]' }
  const inner = obj && unwrap(obj.trim(), '{', '}');
  const out = {};
  if (inner == null) return out;
  for (const p of splitTop(inner)) {
    const k = p.match(/^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]*)$/);
    if (k) out[k[1]] = k[2].trim();
    else if (/^[A-Za-z_$][\w$]*$/.test(p)) out[p] = p; // shorthand
  }
  return out;
}
const ID = /^['"]([a-z]+\/[a-z0-9-]+)['"]$/;
const literalIds = (expr) => [...expr.matchAll(/['"]([a-z]+\/[a-z0-9-]+)['"]/g)].map((m) => m[1]);
// A volume or rate: a number, or the expression as written (played at 1).
const num = (v) => (v == null ? null : /^-?\d*\.?\d+$/.test(v) ? Number(v) : v);
function sound(id, p) {
  const s = { id };
  const v = num(p.volume), r = num(p.rate);
  if (v != null) s.volume = v;
  if (r != null) s.rate = r;
  return s;
}
function oldSound(text) {
  if (!text) return null;
  const m = text.match(ID);
  if (m) return { id: m[1] };
  const arr = unwrap(text, '[', ']');
  if (arr != null) {
    const [a, b] = splitTop(arr);
    const id = a && a.match(ID);
    if (id) return sound(id[1], props(b));
  }
  return { dynamic: text };
}

const triggers = new Map(); // key -> trigger
const dynamic = [];
for (const file of walk(game).sort()) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(game, file);
  const world = rel.includes('/') ? rel.split('/')[0] : 'game';
  for (const m of src.matchAll(/\baudio\.(play|loop)\s*\(/g)) {
    const lineNo = src.slice(0, m.index).split('\n').length;
    const lineText = src.split('\n')[lineNo - 1].trim();
    if (lineText.startsWith('//') || lineText.startsWith('*')) continue;
    const args = callArgs(src, m.index + m[0].length - 1);
    if (args == null) continue;
    const [first = '', opts = ''] = splitTop(args);
    const ids = literalIds(first);
    if (!ids.length) { dynamic.push(`${rel}:${lineNo}`); continue; }
    const p = props(opts);
    const only = (p.only || '').replace(/['"]/g, '') || null;
    const old = oldSound(p.old);
    for (const id of ids) {
      const experimental = only === 'old' ? null : sound(id, p);
      const kind = m[1];
      // A loop's `old:` is a bare id that takes the call's own volume and rate.
      const stand = old && kind === 'loop' && old.id ? sound(old.id, p) : old;
      const def = only === 'new' ? null : added.has(id) ? stand : sound(id, p);
      const key = JSON.stringify([world, kind, experimental, def]);
      if (!triggers.has(key)) {
        triggers.set(key, {
          world, kind, experimental, default: def, sites: [],
          event: events[id] || used[id] || (def && def.id && used[def.id]) || '',
        });
      }
      triggers.get(key).sites.push(`${rel}:${lineNo}`);
    }
  }
}

const sounds = {};
for (const m of listSrc.matchAll(/"([a-z]+\/[a-z0-9-]+)": \{\s*"kind": "(\w+)",\s*"files": \[([^\]]*)\],\s*"volume": ([\d.]+)/g)) {
  sounds[m[1]] = {
    kind: m[2], files: [...m[3].matchAll(/"([^"]+)"/g)].map((f) => f[1]), volume: Number(m[4]),
    added: added.has(m[1]), used: used[m[1]] || '', event: events[m[1]] || '', prompt: prompts[m[1]] || '',
  };
}

const ORDER = ['game', 'shared', 'springtail', 'mite', 'tardigrade', 'amoeba', 'paramecium', 'bacterium', 'phage', 'zoom'];
const list = [...triggers.values()].sort((a, b) => (ORDER.indexOf(a.world) - ORDER.indexOf(b.world)) || a.sites[0].localeCompare(b.sites[0], 'en', { numeric: true }));
const text = `// Generated by micro/workbench/build_audio_triggers.mjs from the game's
// audio.play / audio.loop calls, micro/game/shared/audio-list.js and
// micro/design/sound-effects.md. Do not edit by hand: rerun it.
// Paths in \`files\` are relative to micro/game/.
export const TRIGGERS = ${JSON.stringify(list, null, 1)};
export const SOUNDS = ${JSON.stringify(sounds, null, 1)};
export const DYNAMIC = ${JSON.stringify(dynamic)};
`;
if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(OUT, 'utf8'); } catch { /* missing */ }
  if (now !== text) { console.error('micro/workbench/audio-triggers.js is stale: run node micro/workbench/build_audio_triggers.mjs'); process.exit(1); }
  console.log(`audio-triggers.js is up to date (${list.length} triggers, ${Object.keys(sounds).length} sounds, ${dynamic.length} dynamic calls)`);
} else {
  writeFileSync(OUT, text);
  console.log(`wrote micro/workbench/audio-triggers.js: ${list.length} triggers, ${Object.keys(sounds).length} sounds, ${dynamic.length} dynamic calls`);
}

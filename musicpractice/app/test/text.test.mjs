// Every word Music Practice shows lives in src/text-config.js. These checks
// keep it that way: the page names only keys that exist, index.html holds no
// words of its own, and no module spells out a sentence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TEXT, EN } from '../src/text-config.js';

const here = new URL('..', import.meta.url).pathname;
const html = fs.readFileSync(`${here}index.html`, 'utf8');
const body = html.slice(html.indexOf('<body>'))
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');

const lookup = (key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), TEXT);

test('the app reads the English table', () => {
  assert.equal(TEXT, EN);
});

test('every key the page names is a line of text', () => {
  const keys = [...html.matchAll(/data-text(?:-rich|-aria-label|-placeholder|-title)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 100, `only ${keys.length} keys found`);
  const missing = keys.filter((k) => typeof lookup(k) !== 'string');
  assert.deepEqual(missing, []);
});

test('index.html shows no words of its own', () => {
  const words = [...body.matchAll(/>([^<>]*)</g)].map((m) => m[1].trim()).filter((t) => /[A-Za-z]/.test(t) && t !== '&nbsp;');
  assert.deepEqual(words, [], 'move these into text-config.js and name the key with data-text');
  const attrs = [...body.matchAll(/\s(aria-label|placeholder|title|alt)="([^"]*)"/g)].filter((m) => /[A-Za-z]/.test(m[2]));
  assert.deepEqual(attrs.map((m) => m[0].trim()), [], 'use data-text-aria-label (and the like) instead');
});

test('every line is a non-empty string or a function that makes one', () => {
  const bad = [];
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      const p = path ? `${path}.${k}` : k;
      if (typeof v === 'string') { if (!v.trim()) bad.push(`${p}: empty`); }
      else if (typeof v === 'function') {
        const out = v(...Array.from({ length: v.length }, (_, i) => (i === 0 ? 2 : 'x')));
        if (typeof out !== 'string' || !out.trim()) bad.push(`${p}: returns ${typeof out}`);
      } else if (v && typeof v === 'object') walk(v, p);
      else bad.push(`${p}: ${typeof v}`);
    }
  };
  walk(TEXT, '');
  assert.deepEqual(bad, []);
});

test('the label tables come from the text', async () => {
  const { THEMES, SOUNDS } = await import('../src/settings.js');
  const { TUNINGS, TRANSPOSE } = await import('../src/tuning.js');
  const { VOICES, SEQUENCES } = await import('../src/drone.js');
  for (const t of THEMES) assert.equal(t.label, TEXT.themes[t.id]);
  for (const s of SOUNDS) assert.equal(s.label, TEXT.metronome.sounds[s.id]);
  for (const t of TUNINGS) assert.equal(t.label, TEXT.tuner.tunings[t.id]);
  for (const t of TRANSPOSE) assert.equal(t.label, TEXT.tuner.transposes[t.id]);
  for (const v of VOICES) assert.equal(v.label, TEXT.drone.voices[v.id]);
  for (const q of SEQUENCES) assert.equal(q.label, TEXT.drone.sequences[q.id]);
});

// Strings that look like sentences but are never shown as part of the app:
// errors for the developer, and a diagnostic value Audio check reports as is.
const NOT_SHOWN = new Set([
  'Web Audio (the audio element was refused)',
  'MP3 encoder failed to load',
  '${plugin} is not in this app',
  'text-config: no line for "${key}"',
]);

test('no module spells out a sentence', () => {
  const dir = `${here}src`;
  const found = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'text-config.js')) {
    const src = fs.readFileSync(`${dir}/${f}`, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/([^:'"`])\/\/.*$/gm, '$1');
    for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|"((?:[^"\\\n]|\\.)*)"/g)) {
      const v = m[1] ?? m[2] ?? m[3];
      if (NOT_SHOWN.has(v)) continue;
      // Three words in a row is a sentence; identifiers, keys and units are not.
      if (/\b[A-Za-z][a-z]+ [a-z]+ [a-z]+/.test(v.replace(/\$\{[^}]*\}/g, ''))) found.push(`${f}: ${v.slice(0, 80)}`);
    }
  }
  assert.deepEqual(found, [], 'put these in text-config.js');
});

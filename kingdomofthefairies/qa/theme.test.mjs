import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url)));
const original = JSON.stringify(manifest);
for (const [search, legacy] of [['', false], ['?qa', false], ['?widowsbay', true], ['?qa&widowsbay=', true]]) {
  globalThis.location = { search };
  const theme = await import('../src/theme.js?mode=' + encodeURIComponent(search));
  assert.equal(theme.LEGACY, legacy);
  const result = theme.themeManifest(manifest);
  assert.equal(!!result.audio.song, legacy);
  assert.equal(!!result.slots['band-trio'], legacy);
  assert.equal(Object.keys(result.slots).some(id => id.startsWith('band-')), legacy);
  assert.equal(result.slots.logo.file, legacy ? 'logo.webp' : 'fairies-title.webp');
  assert.equal(Object.keys(result.audio.period).length, 5);
  assert.ok(result.slots['sailor-stand']);
  assert.equal(JSON.stringify(manifest), original, 'shared source manifest is untouched');
}
delete globalThis.location;
console.log('Both theme manifests and query semantics pass');

// Give a published copy of Music Practice (publish.sh) addresses that change
// with each file's contents, so a browser never mixes files from two deploys.
// GitHub Pages lets each file be cached for 10 minutes on its own, so after a
// deploy a phone could take the new index.html with an old cached
// text-config.js (and show "common.themeButton" for the new button's text).
//
// - index.html loads src/main.js?v=<hash> and styles.css?v=<hash>
// - an import map sends every module import (./text-config.js and so on) to
//   src/<file>.js?v=<hash>, so modules importing each other get them too.
// The app's own source is untouched; only the published copy is stamped.
// Usage: node musicpractice/stamp.mjs <published directory>

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('usage: node stamp.mjs <published directory>');
const hash = (file) => createHash('sha256').update(readFileSync(join(out, file))).digest('hex').slice(0, 10);

const modules = readdirSync(join(out, 'src')).filter((f) => f.endsWith('.js')).sort();
const imports = Object.fromEntries(modules.map((f) => [`./src/${f}`, `./src/${f}?v=${hash(`src/${f}`)}`]));
const map = `<script type="importmap">${JSON.stringify({ imports })}</script>`;

for (const page of ['index.html', 'privacy.html']) {
  const path = join(out, page);
  let html = readFileSync(path, 'utf8');
  html = html.replace(/href="styles\.css"/g, `href="styles.css?v=${hash('styles.css')}"`);
  if (html.includes('src="src/main.js"')) {
    // The import map has to come before the first module script.
    html = html.replace('<script type="module" src="src/main.js"></script>', `${map}\n  <script type="module" src="${imports['./src/main.js']}"></script>`);
    if (!html.includes('type="importmap"')) throw new Error(`${page}: main.js script not found`);
  }
  writeFileSync(path, html);
}
console.log(`stamped ${modules.length} modules and styles.css in ${out}`);

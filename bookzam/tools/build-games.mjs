// Builds app/data/games.json, the board games Bookzam knows without going
// online: every Wikidata item with a BoardGameGeek ID, or typed as a board,
// card, tabletop, party or dice game, with an English name. Wikidata is CC0.
//
//   node bookzam/tools/build-games.mjs          fetch and write
//   node bookzam/tools/build-games.mjs --check  check the file's shape only
//
// The file is a list of rows (short keys keep it small):
//   [wikidata id, name, aliases[], BGG id | null, year | null, min players | null,
//    max players | null, designers[], picture file | null, Wikipedia articles,
//    barcodes[] (GTIN/EAN/UPC on the box, digits)]
// sorted by Wikipedia articles (a rough "how well known"), most first.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../app/data/games.json', import.meta.url));
const ENDPOINT = 'https://query.wikidata.org/sparql';
const AGENT = 'BookzamDataBuild/1.0 (https://hoai2k.github.io/mini/bookzam/)';
// board game, card game, tabletop game, party game, card game (collectible), dice game
const TYPES = 'wd:Q131436 wd:Q142714 wd:Q1150710 wd:Q2087889 wd:Q1191150 wd:Q1515156';

const GAMES = `
SELECT ?g ?label ?bgg ?links (MIN(?date) AS ?first) (MIN(?min) AS ?minP) (MAX(?max) AS ?maxP) (SAMPLE(?pic) AS ?image) WHERE {
  { ?g wdt:P2339 ?anyBgg . } UNION { VALUES ?type { ${TYPES} } ?g wdt:P31 ?type . }
  ?g rdfs:label ?label . FILTER(LANG(?label) = "en")
  OPTIONAL { ?g wdt:P2339 ?bgg . }
  OPTIONAL { ?g wdt:P577 ?date . }
  OPTIONAL { ?g wdt:P1872 ?min . }
  OPTIONAL { ?g wdt:P1873 ?max . }
  OPTIONAL { ?g wdt:P18 ?pic . }
  ?g wikibase:sitelinks ?links .
} GROUP BY ?g ?label ?bgg ?links`;

const ALIASES = `
SELECT ?g ?alias WHERE {
  { ?g wdt:P2339 ?anyBgg . } UNION { VALUES ?type { ${TYPES} } ?g wdt:P31 ?type . }
  ?g skos:altLabel ?alias . FILTER(LANG(?alias) = "en")
}`;

const DESIGNERS = `
SELECT ?g ?name WHERE {
  { ?g wdt:P2339 ?anyBgg . } UNION { VALUES ?type { ${TYPES} } ?g wdt:P31 ?type . }
  ?g wdt:P287 ?d . ?d rdfs:label ?name . FILTER(LANG(?name) = "en")
}`;

async function sparql(query) {
  const res = await fetch(`${ENDPOINT}?${new URLSearchParams({ query })}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': AGENT },
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results.bindings;
}

const BARCODES = `
SELECT ?g ?gtin WHERE {
  { ?g wdt:P2339 ?anyBgg . } UNION { VALUES ?type { ${TYPES} } ?g wdt:P31 ?type . }
  ?g wdt:P3962 ?gtin .
}`;

const qid = (uri) => uri.split('/').pop();
const v = (b, key) => b[key]?.value;

function check(rows) {
  if (!Array.isArray(rows) || rows.length < 1000) throw new Error(`expected over 1000 games, got ${rows?.length}`);
  const ids = new Set();
  for (const r of rows) {
    if (!Array.isArray(r) || r.length !== 11) throw new Error(`bad row ${JSON.stringify(r)}`);
    const [id, name, aliases, bgg, year, minP, maxP, designers, image, links, barcodes] = r;
    if (!Array.isArray(barcodes) || !barcodes.every((b) => /^\d{8,14}$/.test(b))) throw new Error(`${id}: bad barcodes`);
    if (!/^Q\d+$/.test(id) || ids.has(id)) throw new Error(`bad or repeated id ${id}`);
    ids.add(id);
    if (typeof name !== 'string' || !name) throw new Error(`${id}: no name`);
    if (!Array.isArray(aliases) || !Array.isArray(designers)) throw new Error(`${id}: bad lists`);
    if (bgg !== null && !/^\d+$/.test(bgg)) throw new Error(`${id}: bad BGG id ${bgg}`);
    for (const n of [year, minP, maxP]) if (n !== null && !Number.isInteger(n)) throw new Error(`${id}: bad number`);
    if (image !== null && typeof image !== 'string') throw new Error(`${id}: bad image`);
    if (!Number.isInteger(links)) throw new Error(`${id}: bad links`);
  }
  return rows.length;
}

if (process.argv.includes('--check')) {
  const n = check(JSON.parse(await readFile(OUT, 'utf8')));
  console.log(`games.json: ${n} games, well formed`);
  process.exit(0);
}

const [games, aliases, designers, barcodes] = [await sparql(GAMES), await sparql(ALIASES), await sparql(DESIGNERS), await sparql(BARCODES)];
const byId = new Map();
for (const b of games) {
  const id = qid(v(b, 'g'));
  const year = Number(String(v(b, 'first') || '').slice(0, 4)) || null;
  const int = (key) => { const n = Math.round(Number(v(b, key))); return Number.isFinite(n) && n > 0 && n < 1000 ? n : null; };
  const prev = byId.get(id);
  // One row per game: an item with two BGG ids keeps the lower (the base game's).
  if (prev && prev[3] && v(b, 'bgg') && Number(prev[3]) < Number(v(b, 'bgg'))) continue;
  byId.set(id, [
    id, v(b, 'label'), [], v(b, 'bgg') || prev?.[3] || null, year && year > 0 && year < 2100 ? year : null,
    int('minP'), int('maxP'), [], v(b, 'image') ? decodeURIComponent(v(b, 'image').split('/').pop()) : null, Number(v(b, 'links')) || 0, [],
  ]);
}
for (const b of aliases) {
  const row = byId.get(qid(v(b, 'g')));
  const a = v(b, 'alias');
  if (row && a && a !== row[1] && !row[2].includes(a) && row[2].length < 6) row[2].push(a);
}
for (const b of designers) {
  const row = byId.get(qid(v(b, 'g')));
  if (row && !row[7].includes(v(b, 'name')) && row[7].length < 4) row[7].push(v(b, 'name'));
}
for (const b of barcodes) {
  const row = byId.get(qid(v(b, 'g')));
  const code = String(v(b, 'gtin') || '').replace(/\D/g, '');
  if (row && /^\d{8,14}$/.test(code) && !row[10].includes(code)) row[10].push(code);
}
// Names that are only an id or a number aren't readable on a box.
const rows = [...byId.values()].filter((r) => /\p{L}{2}/u.test(r[1]) && !/^Q\d+$/.test(r[1]));
rows.sort((a, b) => b[9] - a[9] || a[1].localeCompare(b[1]));
check(rows);
await writeFile(OUT, `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`);
console.log(`wrote ${rows.length} games to ${OUT}`);

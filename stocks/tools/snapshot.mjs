#!/usr/bin/env node
// Write the built-in history the Stocks page shows before (or without) the
// live Worker: stocks/app/data/<SYMBOL>.json for each starter symbol, plus
// stocks/app/data/index.json listing them. Same Yahoo code as the Worker.
//
//   node stocks/tools/snapshot.mjs            # the starter list
//   node stocks/tools/snapshot.mjs VOO SCHD   # just these (added to the list)
//
// Needs network access to query1.finance.yahoo.com, so it runs in GitHub
// Actions (.github/workflows/stocks.yml -> Run workflow -> snapshot).
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchHistory } from "../server/src/yahoo.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../app/data");
export const STARTERS = ["QQQI", "XDTE", "VOO", "JNJ", "GOOG"];

await mkdir(out, { recursive: true });
let index = { symbols: STARTERS };
try {
  index = JSON.parse(await readFile(join(out, "index.json"), "utf8"));
} catch {}
const asked = process.argv.slice(2).map((s) => s.toUpperCase());
const symbols = asked.length ? asked : index.symbols;

let failed = 0;
for (const sym of symbols) {
  try {
    const h = await fetchHistory(sym);
    await writeFile(join(out, `${sym}.json`), JSON.stringify(h) + "\n");
    const div = h.dividends.length;
    console.log(`${sym}: ${h.d.length} days ${h.d[0]}..${h.d.at(-1)}, ${div} dividends` +
      (div ? ` (last ${h.dividends.at(-1).join(" ")})` : "") + `, price ${h.quote.price}`);
  } catch (e) {
    failed++;
    console.error(`${sym}: FAILED ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}
for (const s of asked) if (!index.symbols.includes(s)) index.symbols.push(s);
index.updated = new Date().toISOString();
await writeFile(join(out, "index.json"), JSON.stringify(index, null, 2) + "\n");
if (failed === symbols.length) process.exit(1);

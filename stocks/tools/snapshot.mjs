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

// Yahoo often refuses GitHub's runners, so fall back to the live Worker
// (which reaches Yahoo from Cloudflare) when a direct read fails.
const WORKER = process.env.STOCKS_API || "https://mini-stocks.hoai2k.workers.dev";
const note = (level, msg) =>
  console.log(process.env.GITHUB_ACTIONS ? `::${level}::${msg}` : msg);
async function history(sym) {
  try {
    return { h: await fetchHistory(sym), via: "yahoo" };
  } catch (direct) {
    const res = await fetch(`${WORKER}/history?symbol=${encodeURIComponent(sym)}`, {
      headers: { Origin: "https://hoai2k.github.io" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.d) throw new Error(`direct: ${direct.message}; worker: ${body.error || res.status}`);
    return { h: body, via: "worker" };
  }
}

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
    const { h, via } = await history(sym);
    await writeFile(join(out, `${sym}.json`), JSON.stringify(h) + "\n");
    const div = h.dividends.length;
    note("notice", `${sym} via ${via}: ${h.d.length} days ${h.d[0]}..${h.d.at(-1)}, ${div} dividends` +
      (div ? ` (last ${h.dividends.at(-1).join(" ")})` : "") + `, price ${h.quote.price}`);
  } catch (e) {
    failed++;
    note("error", `${sym}: FAILED ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}
for (const s of asked) if (!index.symbols.includes(s)) index.symbols.push(s);
index.updated = new Date().toISOString();
await writeFile(join(out, "index.json"), JSON.stringify(index, null, 2) + "\n");
if (failed === symbols.length) process.exit(1);

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChart, cleanSymbol, fetchHistory, search } from "../src/yahoo.js";
import worker from "../src/index.js";

const day = (iso) => Date.parse(iso + "T13:30:00Z") / 1000;

const chartFixture = {
  meta: {
    symbol: "ABC", longName: "ABC Corp", currency: "USD", fullExchangeName: "NasdaqGS",
    instrumentType: "EQUITY", gmtoffset: -14400, firstTradeDate: day("2020-01-02"),
    regularMarketPrice: 12.5, chartPreviousClose: 9, regularMarketTime: day("2026-10-16"),
    fiftyTwoWeekHigh: 13, fiftyTwoWeekLow: 8,
  },
  timestamp: [day("2026-10-13"), day("2026-10-14"), day("2026-10-15"), day("2026-10-15"), day("2026-10-16")],
  indicators: { quote: [{ close: [10, null, 11, 11.2, 12.5] }] },
  events: {
    dividends: { b: { date: day("2026-10-15"), amount: 0.25 }, a: { date: day("2026-10-13"), amount: 0.2 } },
    splits: { s: { date: day("2026-10-14"), numerator: 2, denominator: 1 } },
  },
};

test("cleanSymbol accepts real tickers and rejects junk", () => {
  assert.equal(cleanSymbol(" voo "), "VOO");
  assert.equal(cleanSymbol("brk-b"), "BRK-B");
  assert.equal(cleanSymbol("^GSPC"), "^GSPC");
  assert.equal(cleanSymbol("../etc"), null);
  assert.equal(cleanSymbol(""), null);
});

test("normalizeChart drops gaps, de-duplicates days and sorts events", () => {
  const h = normalizeChart(chartFixture);
  assert.deepEqual(h.d, ["2026-10-13", "2026-10-15", "2026-10-16"]);
  assert.deepEqual(h.c, [10, 11.2, 12.5]);
  assert.deepEqual(h.dividends, [["2026-10-13", 0.2], ["2026-10-15", 0.25]]);
  assert.deepEqual(h.splits, [["2026-10-14", 2, 1]]);
  assert.equal(h.name, "ABC Corp");
  assert.equal(h.firstTrade, "2020-01-02");
  assert.equal(h.quote.price, 12.5);
});

const fakeFetch = (routes) => async (url) => {
  for (const [frag, body, status = 200] of routes) {
    if (url.includes(frag)) return new Response(JSON.stringify(body), { status });
  }
  return new Response("{}", { status: 500 });
};

test("fetchHistory falls back to the second host and reports 404s", async () => {
  let calls = 0;
  const flaky = async (url) => {
    calls++;
    if (url.startsWith("https://query1")) return new Response("oops", { status: 503 });
    return new Response(JSON.stringify({ chart: { result: [chartFixture] } }));
  };
  const h = await fetchHistory("abc", { fetchImpl: flaky });
  assert.equal(h.symbol, "ABC");
  assert.equal(calls, 2);
  const missing = fakeFetch([["chart", { chart: { error: { description: "No data found" } } }, 404]]);
  await assert.rejects(fetchHistory("ZZZZ", { fetchImpl: missing }), (e) => e.status === 404);
});

test("search keeps tradable kinds only", async () => {
  const f = fakeFetch([["search", { quotes: [
    { symbol: "VOO", longname: "Vanguard S&P 500 ETF", exchDisp: "NYSEArca", quoteType: "ETF", typeDisp: "ETF" },
    { symbol: "VOO250117C", quoteType: "OPTION" },
    { symbol: "V", shortname: "Visa", exchDisp: "NYSE", quoteType: "EQUITY", typeDisp: "Equity" },
  ] }]]);
  const r = await search("v", { fetchImpl: f });
  assert.deepEqual(r.map((x) => x.symbol), ["VOO", "V"]);
});

test("worker validates input and only sends CORS to allowed origins", async () => {
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  const env = { ALLOWED_ORIGINS: "https://hoai2k.github.io" };
  const ctx = { waitUntil() {} };
  let r = await worker.fetch(new Request("https://w/history?symbol=../x"), env, ctx);
  assert.equal(r.status, 400);
  r = await worker.fetch(new Request("https://w/", { headers: { Origin: "https://hoai2k.github.io" } }), env, ctx);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://hoai2k.github.io");
  r = await worker.fetch(new Request("https://w/", { headers: { Origin: "https://evil.example" } }), env, ctx);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), null);
  r = await worker.fetch(new Request("https://w/", { headers: { Origin: "http://localhost:8080" } }), env, ctx);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "http://localhost:8080");
  r = await worker.fetch(new Request("https://w/nope"), env, ctx);
  assert.equal(r.status, 404);
});

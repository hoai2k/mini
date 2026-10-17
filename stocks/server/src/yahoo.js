// Yahoo Finance reads shared by the Worker (src/index.js) and the static
// snapshot script (../tools/snapshot.mjs). Plain fetch, no dependencies, so the
// same code runs in a Cloudflare Worker and in Node 18+.
//
// Prices are Yahoo's `close`: adjusted for splits, NOT for dividends. Dividend
// amounts are split-adjusted the same way, so shares x price x dividends stay
// consistent across a split. The page does the total-return arithmetic itself.

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

/** Upper-case, and allow only the characters tickers use (BRK-B, ^GSPC, VOD.L, EURUSD=X). */
export function cleanSymbol(s) {
  const sym = String(s || "").trim().toUpperCase();
  return /^[A-Z0-9^.\-=]{1,20}$/.test(sym) ? sym : null;
}

async function getJson(path, fetchImpl = fetch) {
  let lastErr;
  for (const host of HOSTS) {
    try {
      const res = await fetchImpl(host + path, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`Yahoo answered ${res.status} with non-JSON`);
      }
      if (!res.ok) {
        const msg = body?.chart?.error?.description || body?.finance?.error?.description || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status === 404 ? 404 : 502;
        // A 404 means the symbol doesn't exist; asking the other host won't help.
        if (res.status === 404) throw err;
        lastErr = err;
        continue;
      }
      return body;
    } catch (e) {
      if (e.status === 404) throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error("Yahoo unreachable");
}

const isoDay = (sec, offset = 0) => new Date((sec + offset) * 1000).toISOString().slice(0, 10);
const round = (x, dp) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** dp) / 10 ** dp);

/** Turn a raw v8 chart result into the compact history the page uses. */
export function normalizeChart(result) {
  const meta = result.meta || {};
  const off = meta.gmtoffset || 0;
  const ts = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const d = [];
  const c = [];
  for (let i = 0; i < ts.length; i++) {
    const v = closes[i];
    if (v == null || !Number.isFinite(v) || v <= 0) continue;
    const day = isoDay(ts[i], off);
    // Yahoo occasionally repeats the live bar; keep the last value per day.
    if (d.length && d[d.length - 1] === day) c[c.length - 1] = round(v, 4);
    else {
      d.push(day);
      c.push(round(v, 4));
    }
  }
  const ev = result.events || {};
  const dividends = Object.values(ev.dividends || {})
    .map((x) => [isoDay(x.date, off), round(x.amount, 6)])
    .filter((x) => x[1] > 0)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const splits = Object.values(ev.splits || {})
    .map((x) => [isoDay(x.date, off), x.numerator, x.denominator])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return {
    symbol: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    currency: meta.currency || "USD",
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    type: meta.instrumentType || "",
    firstTrade: meta.firstTradeDate ? isoDay(meta.firstTradeDate, off) : d[0] || null,
    quote: quoteFromMeta(meta),
    d,
    c,
    dividends,
    splits,
  };
}

export function quoteFromMeta(meta) {
  return {
    price: round(meta.regularMarketPrice, 4),
    previousClose: round(meta.previousClose ?? meta.chartPreviousClose, 4),
    time: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    dayHigh: round(meta.regularMarketDayHigh, 4),
    dayLow: round(meta.regularMarketDayLow, 4),
    volume: meta.regularMarketVolume ?? null,
    high52: round(meta.fiftyTwoWeekHigh, 4),
    low52: round(meta.fiftyTwoWeekLow, 4),
    marketState: meta.marketState || null,
  };
}

/** Daily closes, dividends and splits for the last `years` years (default 10.5). */
export async function fetchHistory(symbol, { years = 10.5, fetchImpl } = {}) {
  const sym = cleanSymbol(symbol);
  if (!sym) throw Object.assign(new Error("Bad symbol"), { status: 400 });
  const now = Math.floor(Date.now() / 1000);
  const from = now - Math.round(years * 365.25 * 86400);
  const path =
    `/v8/finance/chart/${encodeURIComponent(sym)}?period1=${from}&period2=${now + 86400}` +
    `&interval=1d&events=div%2Csplit&includePrePost=false`;
  const body = await getJson(path, fetchImpl);
  const result = body?.chart?.result?.[0];
  if (!result) throw Object.assign(new Error(`No data for ${sym}`), { status: 404 });
  const h = normalizeChart(result);
  if (!h.d.length) throw Object.assign(new Error(`No price history for ${sym}`), { status: 404 });
  h.fetched = new Date().toISOString();
  return h;
}

/** Latest quote (Yahoo's free data is real-time-ish for US stocks, delayed elsewhere). */
export async function fetchQuote(symbol, { fetchImpl } = {}) {
  const sym = cleanSymbol(symbol);
  if (!sym) throw Object.assign(new Error("Bad symbol"), { status: 400 });
  const body = await getJson(`/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=5m`, fetchImpl);
  const meta = body?.chart?.result?.[0]?.meta;
  if (!meta) throw Object.assign(new Error(`No quote for ${sym}`), { status: 404 });
  return { symbol: meta.symbol, ...quoteFromMeta(meta), fetched: new Date().toISOString() };
}

const SEARCH_TYPES = new Set(["EQUITY", "ETF", "MUTUALFUND", "INDEX", "CRYPTOCURRENCY"]);

/** Symbol suggestions for the search box. */
export async function search(q, { fetchImpl } = {}) {
  const query = String(q || "").trim().slice(0, 40);
  if (!query) return [];
  const body = await getJson(
    `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=false`,
    fetchImpl,
  );
  return (body?.quotes || [])
    .filter((x) => x.symbol && SEARCH_TYPES.has(x.quoteType))
    .slice(0, 8)
    .map((x) => ({
      symbol: x.symbol,
      name: x.longname || x.shortname || x.symbol,
      exchange: x.exchDisp || x.exchange || "",
      type: x.typeDisp || x.quoteType || "",
    }));
}

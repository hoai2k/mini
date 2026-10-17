// Where the numbers come from. Two sources:
//   live      the mini-stocks Worker (stocks/server), which reads Yahoo Finance
//   snapshot  data/<SYMBOL>.json, written by stocks/tools/snapshot.mjs
// A snapshot shows instantly; live data replaces it when it arrives. Symbols
// without a snapshot need the Worker.

// ?api=http://localhost:8788 points a local copy at a local Worker (wrangler dev).
const override = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get("api");
export const API = override || "https://mini-stocks.hoai2k.workers.dev";

const memo = new Map();
let snapshotIndex = null;

async function getJson(url, timeout = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error(body?.error || `HTTP ${res.status}`), { status: res.status });
    return body;
  } finally {
    clearTimeout(t);
  }
}

export async function snapshots() {
  if (!snapshotIndex) {
    snapshotIndex = getJson("data/index.json").catch(() => ({ symbols: [] }));
  }
  return snapshotIndex;
}

/**
 * Calls onData(history, source) once or twice: first with the snapshot if
 * there is one, then with live data. Resolves to the source of the last
 * delivery; rejects only if neither source produced anything.
 */
export async function loadHistory(symbol, onData) {
  const cached = memo.get(symbol);
  if (cached) {
    onData(cached.h, cached.source);
    if (cached.source === "live") return "live";
  }
  const idx = await snapshots();
  let delivered = !!cached;
  if (!cached && idx.symbols.includes(symbol)) {
    try {
      const h = await getJson(`data/${encodeURIComponent(symbol)}.json`);
      memo.set(symbol, { h, source: "snapshot" });
      onData(h, "snapshot");
      delivered = true;
    } catch {}
  }
  try {
    const h = await getJson(`${API}/history?symbol=${encodeURIComponent(symbol)}`, 20000);
    memo.set(symbol, { h, source: "live" });
    onData(h, "live");
    return "live";
  } catch (e) {
    if (delivered) return "snapshot";
    throw e;
  }
}

export async function loadQuote(symbol) {
  return getJson(`${API}/quote?symbol=${encodeURIComponent(symbol)}`, 8000);
}

export async function searchSymbols(q) {
  return getJson(`${API}/search?q=${encodeURIComponent(q)}`, 8000);
}

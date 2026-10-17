// mini-stocks: a small read-only proxy in front of Yahoo Finance for the
// Stocks app (stocks/app). Browsers can't call Yahoo directly (no CORS), so
// the page asks this Worker instead. It only ever calls three fixed Yahoo
// endpoints, so it is not an open proxy, and every answer is edge-cached.
//
//   GET /history?symbol=VOO   ~10.5 years of daily closes, dividends, splits (cached 6 h)
//   GET /quote?symbol=VOO     latest price and previous close              (cached 2 min)
//   GET /search?q=vangu       symbol suggestions                           (cached 1 day)
//   GET /                     health check

import { fetchHistory, fetchQuote, search, cleanSymbol } from "./yahoo.js";

const TTL = { history: 6 * 3600, quote: 120, search: 86400 };

function allowedOrigin(req, env) {
  const origin = req.headers.get("Origin");
  if (!origin) return null;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return origin;
  const list = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
  return list.includes(origin) ? origin : null;
}

function json(body, status, req, env, maxAge = 0) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": maxAge ? `public, max-age=${Math.min(maxAge, 300)}, s-maxage=${maxAge}` : "no-store",
    Vary: "Origin",
  };
  const origin = allowedOrigin(req, env);
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      const origin = allowedOrigin(req, env);
      return new Response(null, {
        status: 204,
        headers: origin
          ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400", Vary: "Origin" }
          : {},
      });
    }
    if (req.method !== "GET") return json({ error: "GET only" }, 405, req, env);

    const route = url.pathname.replace(/\/+$/, "") || "/";
    if (route === "/") return json({ ok: true, service: "mini-stocks" }, 200, req, env);

    let kind, key;
    if (route === "/history" || route === "/quote") {
      const sym = cleanSymbol(url.searchParams.get("symbol"));
      if (!sym) return json({ error: "Give a symbol, e.g. ?symbol=VOO" }, 400, req, env);
      kind = route.slice(1);
      key = `${kind}:${sym}`;
    } else if (route === "/search") {
      const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 40);
      if (!q) return json([], 200, req, env);
      kind = "search";
      key = `search:${q}`;
    } else {
      return json({ error: "Not found" }, 404, req, env);
    }

    // Edge cache keyed on the normalised request, independent of Origin.
    const cache = caches.default;
    const cacheKey = new Request(`https://mini-stocks.cache/${encodeURIComponent(key)}`);
    const hit = await cache.match(cacheKey);
    if (hit) return json(await hit.json(), 200, req, env, TTL[kind]);

    try {
      let body;
      if (kind === "history") body = await fetchHistory(key.slice(8));
      else if (kind === "quote") body = await fetchQuote(key.slice(6));
      else body = await search(key.slice(7));
      ctx.waitUntil(
        cache.put(
          cacheKey,
          new Response(JSON.stringify(body), { headers: { "Cache-Control": `s-maxage=${TTL[kind]}` } }),
        ),
      );
      return json(body, 200, req, env, TTL[kind]);
    } catch (e) {
      const status = e.status && e.status < 500 ? e.status : 502;
      return json({ error: e.message || "Upstream error" }, status, req, env);
    }
  },
};

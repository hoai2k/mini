# Stocks

Stock and ETF price history with total return, published at
https://hoai2k.github.io/mini/stocks/.

- **Ranges:** 1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y. Points are daily for up to a year
  shown, weekly up to five years, monthly beyond; the maths always runs on daily
  closes. A symbol younger than the range charts from its first close and says so.
- **Return:** *Price only*, *With dividends* (paid out and kept as cash), or
  *Dividends reinvested* (each dividend buys shares at the close on its
  ex-date, so weekly, monthly and quarterly payers compound in their own
  rhythm). The two total-return views chart what an amount invested at the
  start (default $10,000, editable) would be worth, with the price-only path
  dashed for comparison.
- **Quote and stats:** price and change, previous close, day and 52-week range,
  trailing-twelve-month dividend yield, forward yield (last payment × its
  rhythm), last dividend, payment rhythm, splits, and the full dividend history.
- **Search:** any symbol Yahoo Finance knows; suggestions as you type. Searched
  symbols join the watchlist (kept in the browser). `/` focuses the search box;
  arrow keys move the chart crosshair when the chart has focus.
- **Shareable URLs:** `?s=VOO&r=5Y&m=reinvest&a=25000`.

## Data

Prices are Yahoo Finance daily closes, adjusted for splits and **not** for
dividends; dividend amounts are split-adjusted the same way, so a split never
breaks the arithmetic. Quotes are delayed. Taxes, fees and the gap between
ex-date and pay date are ignored.

Two sources:

| Source | What | Where |
| --- | --- | --- |
| Live | `mini-stocks` Cloudflare Worker: `/history`, `/quote`, `/search`, edge-cached (6 h, 2 min, 1 day) | `server/`, https://mini-stocks.hoai2k.workers.dev |
| Built-in | ~10.5 years of history for QQQI, XDTE, VOO, JNJ and GOOG, shown instantly and used whenever the Worker can't be reached | `app/data/`, written by `tools/snapshot.mjs` |

Browsers can't call Yahoo directly (no CORS), hence the Worker. It only ever
calls three fixed Yahoo endpoints and sends CORS headers only to the mini
sites and localhost. It is a separate Worker from the multiplayer relay
(`mini-rooms`), so changing it never touches online play.

The page fetches today's prices from the Worker every time it loads, showing a
loading bar under the period line (over the built-in copy, where there is one)
until they arrive; nothing refreshes the data on a schedule, so it costs no
GitHub Actions minutes. `.github/workflows/stocks.yml` deploys the Worker when
`server/` changes on the `deploy` branch, and refreshes the built-in history
only on demand (Actions → Stocks data and API → Run workflow → snapshot, with
optional extra symbols to build in); the refreshed copy goes live with the next
deploy. The
snapshot falls back to reading through the Worker, because Yahoo often refuses
GitHub's runners.

## Layout

- `app/` the page: `index.html`, `styles.css`, `src/` (`calc.js` the
  arithmetic, `chart.js` the SVG chart, `data.js` the sources, `main.js` the
  UI), `data/` built-in history, `test/`
- `server/` the Worker (`src/yahoo.js` is shared with the snapshot script)
- `tools/snapshot.mjs` writes `app/data/`
- `publish.sh` copies the page into the Pages build
- `intake/` drop box

## Checks

```sh
node --test stocks/app/test/*.test.mjs          # total-return maths, windows, sampling, yields
(cd stocks/server && npm ci && npm test)        # Yahoo parsing, CORS, routing
```

To try the page locally, serve `stocks/app/` (e.g. `python3 -m http.server`).
It uses the live Worker from localhost; `?api=http://localhost:8787` points it
at `wrangler dev` instead.

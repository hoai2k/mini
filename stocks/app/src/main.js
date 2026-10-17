import { RANGES, MODES, windowFor, simulate, sampleIndices, returns, dividendStats, range52 } from "./calc.js";
import { Chart } from "./chart.js";
import { loadHistory, loadQuote, searchSymbols, snapshots } from "./data.js";
import { money, num, pct, signed, date, years, axis, esc } from "./format.js";

const STARTERS = ["QQQI", "XDTE", "VOO", "JNJ", "GOOG"];
const $ = (id) => document.getElementById(id);

const store = {
  get(k, d) {
    try { const v = localStorage.getItem(`stocks.${k}`); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(`stocks.${k}`, JSON.stringify(v)); } catch {}
  },
};

const params = new URLSearchParams(location.search);
const state = {
  watch: store.get("watch", STARTERS),
  symbol: (params.get("s") || store.get("symbol", "VOO")).toUpperCase(),
  range: RANGES.find((r) => r.id === (params.get("r") || store.get("range", "1Y")).toUpperCase())?.id || "1Y",
  mode: MODES.find((m) => m.id === (params.get("m") || store.get("mode", "reinvest")))?.id || "reinvest",
  amount: Number(params.get("a")) > 0 ? Number(params.get("a")) : store.get("amount", 10000),
  hist: null,
  source: null,
  quote: null,
  live: null, // is the Worker reachable? null = unknown
  showAllDivs: false,
  loadToken: 0,
};
if (!state.watch.includes(state.symbol)) state.watch.push(state.symbol);

const chart = new Chart($("chart"));
const chipQuotes = new Map(); // symbol -> { price, change }

/* ---------- Controls ---------- */

function buildSeg(host, items, current, onPick) {
  host.replaceChildren();
  for (const it of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = it.short || it.label;
    if (it.short && it.short !== it.label) b.title = it.label;
    b.dataset.id = it.id;
    b.setAttribute("aria-pressed", String(it.id === current));
    b.addEventListener("click", () => onPick(it.id));
    host.appendChild(b);
  }
}

function syncControls() {
  buildSeg($("ranges"), RANGES, state.range, (id) => { state.range = id; persist(); render(); });
  buildSeg($("modes"), MODES, state.mode, (id) => { state.mode = id; persist(); render(); });
  $("amountWrap").hidden = state.mode === "price";
}

function persist() {
  store.set("symbol", state.symbol);
  store.set("range", state.range);
  store.set("mode", state.mode);
  store.set("amount", state.amount);
  store.set("watch", state.watch);
  const p = new URLSearchParams({ s: state.symbol, r: state.range, m: state.mode });
  if (state.amount !== 10000) p.set("a", String(state.amount));
  history.replaceState(null, "", `?${p}`);
  syncControls();
}

$("amount").addEventListener("change", () => {
  const v = Number($("amount").value.replace(/[^0-9.]/g, ""));
  if (v > 0) state.amount = Math.min(v, 1e12);
  $("amount").value = state.amount.toLocaleString("en-US");
  persist();
  render();
});
$("amount").value = state.amount.toLocaleString("en-US");

/* ---------- Watchlist ---------- */

function renderWatch() {
  const host = $("watch");
  host.replaceChildren();
  for (const sym of state.watch) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.setAttribute("aria-current", String(sym === state.symbol));
    const q = chipQuotes.get(sym);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip-main";
    b.innerHTML = `<b>${esc(sym)}</b>` +
      (q ? `<span class="${q.change >= 0 ? "up" : "down"}">${pct(q.change, 2)}</span>` : "");
    b.addEventListener("click", () => select(sym));
    chip.appendChild(b);
    if (state.watch.length > 1) {
      const x = document.createElement("button");
      x.type = "button";
      x.className = "chip-x";
      x.setAttribute("aria-label", `Remove ${sym}`);
      x.textContent = "×";
      x.addEventListener("click", () => {
        state.watch = state.watch.filter((s) => s !== sym);
        if (sym === state.symbol) select(state.watch[0]);
        else { persist(); renderWatch(); }
      });
      chip.appendChild(x);
    }
    host.appendChild(chip);
  }
  if (STARTERS.some((s) => !state.watch.includes(s))) {
    const r = document.createElement("button");
    r.type = "button";
    r.className = "chip-reset";
    r.textContent = "Reset list";
    r.addEventListener("click", () => {
      state.watch = [...new Set([...STARTERS, state.symbol])];
      persist();
      renderWatch();
      refreshChipQuotes();
    });
    host.appendChild(r);
  }
}

async function refreshChipQuotes() {
  await Promise.all(
    state.watch.map(async (sym) => {
      try {
        const q = await loadQuote(sym);
        state.live = true;
        if (q.price && q.previousClose) chipQuotes.set(sym, { change: q.price / q.previousClose - 1 });
      } catch {
        if (chipQuotes.has(sym)) return;
        try {
          const idx = await snapshots();
          if (!idx.symbols.includes(sym)) return;
          const h = await (await fetch(`data/${sym}.json`)).json();
          const n = h.c.length;
          chipQuotes.set(sym, { change: h.c[n - 1] / h.c[n - 2] - 1 });
        } catch {}
      }
    }),
  );
  renderWatch();
}

/* ---------- Loading ---------- */

async function select(sym) {
  sym = sym.toUpperCase();
  if (!state.watch.includes(sym)) state.watch.push(sym);
  state.symbol = sym;
  state.hist = null;
  state.quote = null;
  state.showAllDivs = false;
  persist();
  renderWatch();
  $("error").hidden = true;
  $("name").textContent = sym;
  $("sub").textContent = "Loading…";
  $("price").innerHTML = "&nbsp;";
  $("change").innerHTML = "&nbsp;";
  $("asof").innerHTML = "&nbsp;";
  $("period").innerHTML = "&nbsp;";
  chart.set(null);
  $("chart").classList.add("loading");

  const token = ++state.loadToken;
  loadQuote(sym)
    .then((q) => {
      if (token !== state.loadToken) return;
      state.live = true;
      state.quote = q;
      if (q.price && q.previousClose) chipQuotes.set(sym, { change: q.price / q.previousClose - 1 });
      renderWatch();
      if (state.hist) renderQuote();
    })
    .catch(() => {});
  try {
    const src = await loadHistory(sym, (h, source) => {
      if (token !== state.loadToken) return;
      state.hist = h;
      state.source = source;
      $("chart").classList.remove("loading");
      render();
    });
    if (token === state.loadToken && src === "live") state.live = true;
  } catch (e) {
    if (token !== state.loadToken) return;
    $("chart").classList.remove("loading");
    $("sub").textContent = "";
    const err = $("error");
    err.hidden = false;
    err.textContent =
      e.status === 404
        ? `No price history found for ${sym}.`
        : `Couldn't load ${sym}: live data is unreachable right now and there's no built-in copy of it.`;
    if (e.status === 404) {
      state.watch = state.watch.filter((s) => s !== sym || STARTERS.includes(s));
      persist();
      renderWatch();
    }
  }
}

/* ---------- Rendering ---------- */

/** Daily up to about a year shown, weekly up to five, monthly beyond. */
function stepFor(range, shownYears) {
  if (shownYears <= 1.1) return "day";
  if (shownYears <= 5.5) return "week";
  return "month";
}

function currentPrice() {
  const h = state.hist;
  const n = h.c.length;
  const q = state.quote;
  if (q?.price) return { price: q.price, prev: q.previousClose, time: q.time, live: true };
  const hq = h.quote || {};
  // A snapshot: last close against the close before it.
  return { price: h.c[n - 1], prev: h.c[n - 2], time: null, day: h.d[n - 1], live: state.source === "live" && hq.price };
}

function renderQuote() {
  const h = state.hist;
  const cur = h.currency || "USD";
  const { price, prev, time, day } = currentPrice();
  $("price").textContent = money(price, cur, 2);
  const ch = prev ? price - prev : null;
  const el = $("change");
  el.className = `change ${ch >= 0 ? "up" : "down"}`;
  el.textContent = ch == null ? "" : `${signed(ch, cur)} (${pct(ch / prev)})`;
  if (time) {
    const t = new Date(time);
    const fmt = t.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    $("asof").textContent = `${fmt} ET · delayed quote`;
  } else {
    $("asof").textContent = `Close ${date(day)}${state.source === "snapshot" ? " · built-in data" : ""}`;
  }
}

function render() {
  const h = state.hist;
  if (!h) return;
  syncControls();
  const cur = h.currency || "USD";
  $("name").textContent = h.name || state.symbol;
  $("sub").textContent = [h.symbol || state.symbol, h.exchange, h.type === "ETF" ? "ETF" : h.type === "EQUITY" ? "Stock" : h.type]
    .filter(Boolean).join(" · ");
  document.title = `${h.symbol || state.symbol} · Stocks`;
  renderQuote();

  const range = RANGES.find((r) => r.id === state.range);
  const w = windowFor(h, range);
  const mode = state.mode;
  const sim = simulate(h, w.start, w.end, mode, mode === "price" ? 1 : state.amount);
  const shownYears = (Date.parse(h.d[w.end]) - Date.parse(h.d[w.start])) / (365.25 * 864e5);
  const step = stepFor(range, shownYears);
  const idx = sampleIndices(h.d, w.start, w.end, step);
  const perShareDivs = sim.events.reduce((t, e) => t + e.perShare, 0);
  const dates = idx.map((i) => h.d[i]);
  const p0 = h.c[w.start];
  let values, compare = null, baseline;
  if (mode === "price") {
    values = idx.map((i) => h.c[i]);
    baseline = p0;
  } else {
    values = idx.map((i) => sim.value[i - w.start]);
    compare = idx.map((i) => (state.amount * h.c[i]) / p0);
    baseline = state.amount;
  }
  const first = values[0], last = values[values.length - 1];
  const up = last >= first;

  // Map each dividend to the plotted point that covers its ex-date.
  const divMarks = [];
  const bucket = new Map();
  for (const ev of sim.events) {
    let lo = 0, hi = idx.length - 1;
    const day = w.start + ev.i;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (idx[mid] < day) lo = mid + 1; else hi = mid; }
    divMarks.push({ k: lo });
    if (!bucket.has(lo)) bucket.set(lo, []);
    bucket.get(lo).push(ev);
  }

  const yearSpan = shownYears;
  const perShare = mode === "price";
  chart.set({
    dates, values, compare, baseline, up, divMarks, yearSpan,
    label: `${h.symbol} ${MODES.find((m) => m.id === mode).label}, ${range.label}`,
    yTick: (v, step) => axis(v, step, cur),
    tooltip: (k) => {
      const i = idx[k];
      const j = i - w.start;
      const v = values[k];
      const chg = v / first - 1;
      const stepNote = k === 0 || k === idx.length - 1 ? "" : step === "week" ? "Week ending " : step === "month" ? "Month ending " : "";
      let html = `<div class="tip-date">${stepNote}${date(h.d[i])}</div>`;
      html += `<div class="tip-val">${money(v, cur, perShare ? 2 : undefined)} <span class="${chg >= 0 ? "up" : "down"}">${pct(chg)}</span></div>`;
      if (!perShare) {
        html += `<div class="tip-row"><span>Price</span><span>${money(h.c[i], cur, 2)} <i class="${h.c[i] >= p0 ? "up" : "down"}">${pct(h.c[i] / p0 - 1)}</i></span></div>`;
        html += `<div class="tip-row"><span>Shares</span><span>${num(sim.shares[j], 3)}</span></div>`;
        html += `<div class="tip-row"><span>${mode === "reinvest" ? "Dividends reinvested" : "Dividend cash"}</span><span>${money(sim.paid[j], cur)}</span></div>`;
      }
      const evs = bucket.get(k);
      if (evs) {
        const shown = evs.slice(-4);
        html += `<div class="tip-divs">` + shown.map((e) =>
          `<div>◆ ${date(e.date, false)}: ${money(e.perShare, cur, e.perShare < 0.1 ? 4 : 3)}/sh${perShare ? "" : ` → ${money(e.amount, cur)}`}</div>`).join("") +
          (evs.length > shown.length ? `<div>+ ${evs.length - shown.length} more</div>` : "") + `</div>`;
      }
      return html;
    },
  });

  // Period summary.
  const r = returns(first, last, h.d[w.start], h.d[w.end]);
  const priceR = returns(p0, h.c[w.end], h.d[w.start], h.d[w.end]);
  let html = "";
  if (w.clipped) {
    html += `<span class="clip">Since first close ${date(h.d[0])} · ${years(yearSpan)} of history</span>`;
  }
  html += `<span class="${up ? "up" : "down"} big">${pct(r.total)}</span>`;
  if (r.cagr != null) html += `<span>${pct(r.cagr, 1)}/yr</span>`;
  if (mode === "price") {
    html += `<span>${money(p0, cur, 2)} → ${money(h.c[w.end], cur, 2)}</span>`;
    if (sim.received > 0) html += `<span class="muted">dividends paid ${money(perShareDivs, cur, 2)}/sh</span>`;
  } else {
    html += `<span>${money(state.amount, cur)} → <b>${money(last, cur)}</b></span>`;
    html += `<span class="muted">${money(sim.received, cur)} in dividends${mode === "reinvest" ? " reinvested" : " collected"}</span>`;
    html += `<span class="muted">price only ${pct(priceR.total)}</span>`;
  }
  $("period").innerHTML = html;

  $("legend").innerHTML =
    (mode === "price" ? `<span><i class="sw ${up ? "up" : "down"}"></i>Price</span>` :
      `<span><i class="sw ${up ? "up" : "down"}"></i>${MODES.find((m) => m.id === mode).label}</span><span><i class="sw dash"></i>Price only</span>`) +
    `<span><i class="sw base"></i>Start</span>` +
    (sim.events.length ? `<span><i class="sw dot"></i>Dividend ex-dates</span>` : "");

  renderStats();
  renderDividends();
  $("source").textContent =
    `Data: Yahoo Finance via the mini-stocks Worker${state.source === "snapshot" ? " (showing the built-in copy; live data unreachable)" : ""}. ` +
    `${h.d.length.toLocaleString()} daily closes from ${date(h.d[0])} to ${date(h.d[h.d.length - 1])}.`;
}

function stat(label, value, note) {
  return `<div><dt>${label}</dt><dd>${value}${note ? `<small>${note}</small>` : ""}</dd></div>`;
}

function renderStats() {
  const h = state.hist;
  const cur = h.currency || "USD";
  const { price, prev } = currentPrice();
  const q = state.quote;
  const ds = dividendStats(h, price);
  const r52 = range52(h);
  const hi52 = Math.max(r52.high, q?.high52 || 0, price);
  const lo52 = Math.min(r52.low, q?.low52 || Infinity, price);
  const histYears = (Date.parse(h.d[h.d.length - 1]) - Date.parse(h.d[0])) / (365.25 * 864e5);
  let out = "";
  out += stat("Previous close", money(prev, cur, 2));
  if (q?.dayLow && q?.dayHigh) out += stat("Day range", `${money(q.dayLow, cur, 2)} – ${money(q.dayHigh, cur, 2)}`);
  out += stat("52-week range", `${money(lo52, cur, 2)} – ${money(hi52, cur, 2)}`);
  out += stat("Dividend yield (TTM)", ds.ttm > 0 ? pct(ds.ttmYield, 2, false) : "None",
    ds.ttm > 0 ? `${money(ds.ttm, cur, 2)} over ${ds.ttmCount} payment${ds.ttmCount === 1 ? "" : "s"}` : "no dividends in the last year");
  if (ds.forwardYield != null) {
    out += stat("Forward yield", pct(ds.forwardYield, 2, false),
      `last ${money(ds.last.amount, cur, ds.last.amount < 0.1 ? 4 : 3)} × ${ds.frequency.perYear}`);
  }
  if (ds.last) out += stat("Last dividend", money(ds.last.amount, cur, ds.last.amount < 0.1 ? 4 : 3), `ex-date ${date(ds.last.date)}`);
  if (ds.frequency) out += stat("Pays", ds.frequency.label, ds.stale ? "no recent payment" : `${ds.count} payments on record`);
  out += stat("History here", years(histYears), `since ${date(h.d[0])}${h.firstTrade && h.firstTrade < h.d[0] ? ` (trading since ${h.firstTrade.slice(0, 4)})` : ""}`);
  if (h.splits?.length) out += stat("Splits", h.splits.map((s) => `${s[1]}:${s[2]} ${date(s[0])}`).join(", "));
  $("stats").innerHTML = out;
}

function renderDividends() {
  const h = state.hist;
  const cur = h.currency || "USD";
  const divs = h.dividends || [];
  const body = $("divtable").querySelector("tbody");
  const toggle = $("divToggle");
  if (!divs.length) {
    body.innerHTML = "";
    $("divtable").hidden = true;
    toggle.hidden = true;
    $("divNote").textContent = `${h.symbol || state.symbol} paid no dividends in this history.`;
    return;
  }
  $("divtable").hidden = false;
  const limit = state.showAllDivs ? divs.length : 12;
  const rows = [];
  for (let k = divs.length - 1; k >= Math.max(0, divs.length - limit); k--) {
    const [d, amt] = divs[k];
    const prevAmt = k > 0 ? divs[k - 1][1] : null;
    // Close on (or just before) the ex-date, for that payment's own yield.
    const i = h.d.findIndex((x) => x >= d);
    const px = h.c[i < 0 ? h.c.length - 1 : Math.max(0, i - 1)];
    const chg = prevAmt ? amt / prevAmt - 1 : null;
    const dp = amt < 0.1 ? 4 : 3;
    rows.push(`<tr><td>${date(d)}</td><td>${money(amt, cur, dp)}</td>` +
      `<td class="${chg == null ? "" : chg > 0.0005 ? "up" : chg < -0.0005 ? "down" : "muted"}">${chg == null ? "—" : Math.abs(chg) < 0.0005 ? "same" : pct(chg, 1)}</td>` +
      `<td class="muted">${pct(amt / px, 2, false)}</td></tr>`);
  }
  body.innerHTML = rows.join("");
  toggle.hidden = divs.length <= 12;
  toggle.textContent = state.showAllDivs ? "Show recent" : `Show all ${divs.length}`;
  const ds = dividendStats(h, currentPrice().price);
  $("divNote").textContent =
    `${divs.length} payments since ${date(divs[0][0])}` + (ds.frequency ? ` · ${ds.frequency.label.toLowerCase()}` : "") +
    `. "Yield then" is that one payment over the prior close.`;
}
$("divToggle").addEventListener("click", () => {
  state.showAllDivs = !state.showAllDivs;
  renderDividends();
});

/* ---------- Search ---------- */

const input = $("q");
const list = $("suggest");
let suggestions = [];
let active = -1;
let searchSeq = 0;
let searchTimer;

function showSuggestions(items, note) {
  suggestions = items;
  active = items.length ? 0 : -1;
  list.innerHTML =
    items.map((s, i) =>
      `<li role="option" id="opt${i}" aria-selected="${i === active}" data-sym="${esc(s.symbol)}">` +
      `<b>${esc(s.symbol)}</b><span class="nm">${esc(s.name)}</span><span class="ex">${esc([s.exchange, s.type].filter(Boolean).join(" · "))}</span></li>`).join("") +
    (note ? `<li class="note" aria-disabled="true">${esc(note)}</li>` : "");
  list.hidden = !items.length && !note;
  $("search").setAttribute("aria-expanded", String(!list.hidden));
  input.setAttribute("aria-activedescendant", active >= 0 ? `opt${active}` : "");
}

function localMatches(q) {
  const Q = q.toUpperCase();
  return [...new Set([...state.watch, ...STARTERS])]
    .filter((s) => s.includes(Q))
    .map((s) => ({ symbol: s, name: s === state.symbol && state.hist ? state.hist.name : "", exchange: "", type: "" }));
}

input.addEventListener("input", () => {
  const q = input.value.trim();
  clearTimeout(searchTimer);
  if (!q) return showSuggestions([]);
  searchTimer = setTimeout(async () => {
    const seq = ++searchSeq;
    try {
      const items = await searchSymbols(q);
      if (seq !== searchSeq) return;
      state.live = true;
      showSuggestions(items, items.length ? "" : `No matches. Press Enter to try “${q.toUpperCase()}”.`);
    } catch {
      if (seq !== searchSeq) return;
      showSuggestions(localMatches(q), "Live search is unreachable; press Enter to try a symbol directly.");
    }
  }, 220);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!suggestions.length) return;
    e.preventDefault();
    active = (active + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length;
    list.querySelectorAll("li[role=option]").forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
    input.setAttribute("aria-activedescendant", `opt${active}`);
  } else if (e.key === "Enter") {
    e.preventDefault();
    const pick = active >= 0 && suggestions[active] ? suggestions[active].symbol : input.value.trim();
    if (pick) choose(pick);
  } else if (e.key === "Escape") {
    showSuggestions([]);
  }
});

list.addEventListener("pointerdown", (e) => {
  const li = e.target.closest("li[data-sym]");
  if (!li) return;
  e.preventDefault();
  choose(li.dataset.sym);
});
input.addEventListener("blur", () => setTimeout(() => showSuggestions([]), 120));

function choose(sym) {
  input.value = "";
  showSuggestions([]);
  input.blur();
  select(sym);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
  }
});

/* ---------- Start ---------- */

syncControls();
renderWatch();
select(state.symbol);
refreshChipQuotes();

// Pure arithmetic for the Stocks page: chart windows, total return with and
// without reinvesting dividends, resampling, and dividend statistics.
// No DOM here, so it is unit-tested directly (../test/calc.test.mjs).
//
// History shape (from the Worker or a snapshot file):
//   { d: ["2016-10-17", ...], c: [123.45, ...],        daily closes, split-adjusted
//     dividends: [["2024-02-21", 0.5], ...],            ex-date, split-adjusted $/share
//     splits: [["2022-07-18", 20, 1], ...] }

export const RANGES = [
  { id: "1M", label: "1M", months: 1, step: "day" },
  { id: "3M", label: "3M", months: 3, step: "day" },
  { id: "6M", label: "6M", months: 6, step: "day" },
  { id: "1Y", label: "1Y", months: 12, step: "day" },
  { id: "3Y", label: "3Y", months: 36, step: "week" },
  { id: "5Y", label: "5Y", months: 60, step: "week" },
  { id: "10Y", label: "10Y", months: 120, step: "month" },
];
export const MODES = [
  { id: "price", label: "Price only", short: "Price" },
  { id: "dividends", label: "With dividends", short: "+ Dividends" },
  { id: "reinvest", label: "Dividends reinvested", short: "Reinvested" },
];

const DAY = 86400000;
export const toTime = (iso) => Date.parse(iso + "T00:00:00Z");
export const toIso = (t) => new Date(t).toISOString().slice(0, 10);

/** Same calendar day `months` earlier, clamped to the month's end (Mar 31 - 1M = Feb 28). */
export function monthsBefore(iso, months) {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) - months;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return toIso(Date.UTC(ny, nm, Math.min(d, last)));
}

/** Index of the first element >= target in a sorted array of ISO dates. */
export function lowerBound(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The chart window for a range. The window starts on the last trading day on
 * or before the nominal start (so a 1Y chart compares with the close a year
 * ago), unless the history is younger than the range, in which case it starts
 * at the first close and `clipped` says so.
 */
export function windowFor(h, range) {
  const end = h.d.length - 1;
  const wanted = monthsBefore(h.d[end], range.months);
  let start = lowerBound(h.d, wanted);
  if (start < h.d.length && h.d[start] > wanted && start > 0) start--;
  const clipped = h.d[0] > wanted;
  if (clipped) start = 0;
  return { start, end, wanted, clipped };
}

/**
 * Value of `amount` invested at the close of h.d[start], day by day to h.d[end].
 *   price      shares never change; dividends are ignored.
 *   dividends  dividends are paid out and kept as cash (no interest).
 *   reinvest   each dividend buys more shares at the close on its ex-date.
 * A dividend counts when its ex-date is after the purchase day and on or
 * before the day being valued (a buyer at the close on the ex-date doesn't get it).
 * Returns per-day arrays plus totals.
 */
export function simulate(h, start, end, mode, amount = 10000) {
  const n = end - start + 1;
  const value = new Array(n);
  const shares = new Array(n);
  const cashArr = new Array(n);
  const paid = new Array(n); // dividend cash received to date
  let sh = amount / h.c[start];
  let cash = 0;
  let received = 0;
  const divs = h.dividends || [];
  let k = 0;
  while (k < divs.length && divs[k][0] <= h.d[start]) k++;
  const events = [];
  for (let i = start; i <= end; i++) {
    while (k < divs.length && divs[k][0] <= h.d[i]) {
      const [date, perShare] = divs[k];
      const amt = perShare * sh;
      received += amt;
      if (mode === "reinvest") sh += amt / h.c[i];
      else if (mode === "dividends") cash += amt;
      events.push({ i: i - start, date, perShare, amount: amt });
      k++;
    }
    const j = i - start;
    shares[j] = sh;
    cashArr[j] = cash;
    paid[j] = received;
    value[j] = sh * h.c[i] + cash;
  }
  return { value, shares, cash: cashArr, paid, events, received, start, end };
}

/**
 * Which daily indices to plot: every day, or the last trading day of each
 * week / month. The first and last days are always kept.
 */
export function sampleIndices(dates, start, end, step) {
  if (step === "day") {
    const out = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }
  const key =
    step === "month"
      ? (iso) => iso.slice(0, 7)
      : (iso) => {
          // Monday-based week number since the epoch.
          return Math.floor((toTime(iso) / DAY + 3) / 7);
        };
  const out = [start];
  for (let i = start + 1; i < end; i++) {
    if (key(dates[i]) !== key(dates[i + 1])) out.push(i);
  }
  if (end > start) out.push(end);
  return out;
}

/** Simple and annualised return between two values over a calendar span. */
export function returns(first, last, fromIso, toIsoDate) {
  const total = last / first - 1;
  const years = (toTime(toIsoDate) - toTime(fromIso)) / (365.25 * DAY);
  const cagr = years >= 0.98 ? Math.pow(last / first, 1 / years) - 1 : null;
  return { total, years, cagr };
}

const FREQS = [
  { max: 10, perYear: 52, label: "Weekly" },
  { max: 20, perYear: 26, label: "Every two weeks" },
  { max: 45, perYear: 12, label: "Monthly" },
  { max: 120, perYear: 4, label: "Quarterly" },
  { max: 240, perYear: 2, label: "Semi-annual" },
  { max: Infinity, perYear: 1, label: "Annual" },
];

/**
 * Dividend picture as of the last close: trailing-twelve-month total and
 * yield, the payment rhythm (from the median gap between recent ex-dates),
 * the most recent payment and a forward yield (last payment x rhythm).
 */
export function dividendStats(h, price) {
  const divs = h.dividends || [];
  const lastDay = h.d[h.d.length - 1];
  const cutoff = toIso(toTime(lastDay) - 365 * DAY);
  const ttmList = divs.filter((x) => x[0] > cutoff);
  const ttm = ttmList.reduce((s, x) => s + x[1], 0);
  const out = {
    count: divs.length,
    ttm,
    ttmCount: ttmList.length,
    ttmYield: price ? ttm / price : null,
    last: divs.length ? { date: divs[divs.length - 1][0], amount: divs[divs.length - 1][1] } : null,
    frequency: null,
    forwardYield: null,
    stale: false,
  };
  if (divs.length >= 2) {
    const recent = divs.slice(-9);
    const gaps = [];
    for (let i = 1; i < recent.length; i++) gaps.push((toTime(recent[i][0]) - toTime(recent[i - 1][0])) / DAY);
    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    out.frequency = FREQS.find((f) => median <= f.max);
    const sinceLast = (toTime(lastDay) - toTime(out.last.date)) / DAY;
    // No payment for well over two cycles: treat the forward rate as unknown.
    out.stale = sinceLast > Math.max(2.5 * median, 60);
    if (!out.stale && price) out.forwardYield = (out.last.amount * out.frequency.perYear) / price;
  } else if (divs.length === 1) {
    out.frequency = null;
  }
  return out;
}

/** Highest and lowest close in the last year (approximate 52-week range from daily closes). */
export function range52(h) {
  const lastDay = h.d[h.d.length - 1];
  const from = lowerBound(h.d, toIso(toTime(lastDay) - 365 * DAY));
  let hi = -Infinity, lo = Infinity;
  for (let i = from; i < h.c.length; i++) {
    if (h.c[i] > hi) hi = h.c[i];
    if (h.c[i] < lo) lo = h.c[i];
  }
  return { high: hi, low: lo };
}

/** "Nice" axis ticks covering [min, max]. */
export function niceTicks(min, max, count = 5) {
  if (!(max > min)) {
    const pad = Math.abs(min) * 0.01 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { ticks, lo, hi, step };
}

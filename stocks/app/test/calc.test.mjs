import test from "node:test";
import assert from "node:assert/strict";
import {
  RANGES, monthsBefore, windowFor, simulate, sampleIndices, returns, dividendStats, niceTicks, range52,
} from "../src/calc.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const R = Object.fromEntries(RANGES.map((r) => [r.id, r]));

test("monthsBefore clamps to month end", () => {
  assert.equal(monthsBefore("2026-03-31", 1), "2026-02-28");
  assert.equal(monthsBefore("2026-10-16", 12), "2025-10-16");
  assert.equal(monthsBefore("2026-01-15", 120), "2016-01-15");
});

// Four trading days, a $1 dividend going ex on day 3.
const h = {
  d: ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"],
  c: [100, 110, 99, 110],
  dividends: [["2026-01-05", 5], ["2026-01-07", 1]],
};

test("price mode ignores dividends", () => {
  const s = simulate(h, 0, 3, "price", 1000);
  assert.deepEqual(s.value.map((v) => +v.toFixed(6)), [1000, 1100, 990, 1100]);
  close(s.received, 10); // still reported: 10 shares x $1
});

test("dividends mode keeps cash; dividend on the purchase day is not received", () => {
  const s = simulate(h, 0, 3, "dividends", 1000);
  assert.equal(s.events.length, 1);
  close(s.value[2], 990 + 10);
  close(s.value[3], 1100 + 10);
});

test("reinvest mode buys shares at the ex-date close", () => {
  const s = simulate(h, 0, 3, "reinvest", 1000);
  const sh = 10 + 10 / 99;
  close(s.shares[3], sh);
  close(s.value[3], sh * 110);
  assert.ok(s.value[3] > simulate(h, 0, 3, "dividends", 1000).value[3]);
});

test("a dividend on a non-trading day lands on the next close", () => {
  const weekend = { d: ["2026-01-02", "2026-01-05"], c: [50, 50], dividends: [["2026-01-03", 1]] };
  const s = simulate(weekend, 0, 1, "dividends", 50);
  close(s.value[1], 51);
});

test("windowFor starts on the close on/before the nominal start and clips young symbols", () => {
  const days = [];
  for (let t = Date.UTC(2024, 0, 2); t <= Date.UTC(2026, 9, 16); t += 86400000) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) days.push(new Date(t).toISOString().slice(0, 10));
  }
  const young = { d: days, c: days.map(() => 1), dividends: [] };
  const w1 = windowFor(young, R["1Y"]);
  assert.equal(w1.clipped, false);
  assert.ok(young.d[w1.start] <= "2025-10-16");
  assert.ok(young.d[w1.start + 1] > "2025-10-16");
  const w10 = windowFor(young, R["10Y"]);
  assert.equal(w10.clipped, true);
  assert.equal(w10.start, 0);
});

test("sampleIndices keeps week/month ends plus both endpoints", () => {
  const d = ["2026-01-28", "2026-01-30", "2026-02-02", "2026-02-27", "2026-03-02", "2026-03-03"];
  assert.deepEqual(sampleIndices(d, 0, 5, "month"), [0, 1, 3, 5]);
  assert.deepEqual(sampleIndices(d, 0, 5, "week"), [0, 1, 2, 3, 5]);
  assert.deepEqual(sampleIndices(d, 1, 3, "day"), [1, 2, 3]);
});

test("returns annualises only spans of about a year or more", () => {
  const r = returns(100, 121, "2024-01-01", "2026-01-01");
  close(r.total, 0.21);
  assert.ok(Math.abs(r.cagr - 0.1) < 0.002);
  assert.equal(returns(100, 110, "2026-01-01", "2026-06-01").cagr, null);
});

test("dividendStats finds the rhythm and yields", () => {
  const weekly = { d: ["2026-10-16"], c: [40], dividends: [] };
  for (let i = 0; i < 60; i++) {
    const t = Date.UTC(2026, 9, 15) - i * 7 * 86400000;
    weekly.dividends.unshift([new Date(t).toISOString().slice(0, 10), 0.2]);
  }
  const s = dividendStats(weekly, 40);
  assert.equal(s.frequency.label, "Weekly");
  assert.equal(s.ttmCount, 52);
  close(s.forwardYield, (0.2 * 52) / 40);
  close(s.ttmYield, (0.2 * 52) / 40);

  const quarterly = { d: ["2026-10-16"], c: [100], dividends: [["2025-12-01", 1], ["2026-03-01", 1], ["2026-06-01", 1], ["2026-09-01", 1.1]] };
  const q = dividendStats(quarterly, 100);
  assert.equal(q.frequency.label, "Quarterly");
  close(q.forwardYield, 0.044);
  assert.equal(q.stale, false);

  const none = dividendStats({ d: ["2026-10-16"], c: [10], dividends: [] }, 10);
  assert.equal(none.ttm, 0);
  assert.equal(none.frequency, null);
});

test("niceTicks covers the data with round steps", () => {
  const t = niceTicks(93.2, 141.7, 5);
  assert.ok(t.lo <= 93.2 && t.hi >= 141.7);
  assert.equal(t.step, 10);
  const flat = niceTicks(5, 5);
  assert.ok(flat.ticks.length >= 2);
});

test("range52 uses the last year of closes", () => {
  const r = range52({ d: ["2025-01-01", "2026-01-01", "2026-06-01"], c: [500, 10, 20] });
  assert.deepEqual(r, { high: 20, low: 10 });
});

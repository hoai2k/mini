// SVG line/area chart with a crosshair, tooltip, comparison line and
// dividend ticks. Spacing is by trading session, like most finance charts,
// so weekends and holidays leave no gaps.
import { niceTicks } from "./calc.js";

const NS = "http://www.w3.org/2000/svg";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

/** Pick x-axis label positions: week, month or year boundaries, at most ~6. */
function xLabels(dates, span) {
  const n = dates.length;
  let key, fmt;
  if (span <= 1.2) {
    key = (d) => Math.floor(Date.parse(d) / (7 * 864e5) + 3 / 7);
    fmt = (d) => `${MON[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}`;
  } else if (span <= 13) {
    key = (d) => d.slice(0, 7);
    fmt = (d) => (d.slice(5, 7) === "01" ? d.slice(0, 4) : MON[+d.slice(5, 7) - 1]);
  } else {
    key = (d) => d.slice(0, 4);
    fmt = (d) => d.slice(0, 4);
  }
  const marks = [];
  for (let k = 1; k < n; k++) if (key(dates[k]) !== key(dates[k - 1])) marks.push(k);
  const every = Math.max(1, Math.ceil(marks.length / 6));
  // Thin from the right so the most recent boundary is always labelled.
  return marks.filter((_, i) => (marks.length - 1 - i) % every === 0).map((k) => ({ k, text: fmt(dates[k]) }));
}

export class Chart {
  constructor(host) {
    this.host = host;
    this.svg = el("svg", { class: "chart-svg", role: "img" }, host);
    this.tip = document.createElement("div");
    this.tip.className = "chart-tip";
    this.tip.hidden = true;
    host.appendChild(this.tip);
    this.model = null;
    this.hover = null;
    this.svg.addEventListener("pointermove", (e) => this.pointer(e));
    this.svg.addEventListener("pointerdown", (e) => this.pointer(e));
    this.svg.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") this.setHover(null);
    });
    host.tabIndex = 0;
    host.addEventListener("keydown", (e) => this.key(e));
    host.addEventListener("blur", () => this.setHover(null));
    new ResizeObserver(() => this.draw()).observe(host);
  }

  set(model) {
    this.model = model;
    this.hover = null;
    this.draw();
  }

  draw() {
    const m = this.model;
    const svg = this.svg;
    svg.replaceChildren();
    this.tip.hidden = true;
    if (!m || m.values.length < 2) return;
    const W = Math.max(280, this.host.clientWidth);
    const H = Math.max(200, this.host.clientHeight);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("aria-label", m.label || "Price chart");

    const hasDiv = m.divMarks && m.divMarks.length;
    const pad = { l: 6, r: W < 480 ? 50 : 62, t: 14, b: 26 + (hasDiv ? 14 : 0) };
    const n = m.values.length;
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    let lo = Infinity, hi = -Infinity;
    for (const arr of [m.values, m.compare || []]) for (const v of arr) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (m.baseline != null) { lo = Math.min(lo, m.baseline); hi = Math.max(hi, m.baseline); }
    const t = niceTicks(lo, hi, ih < 260 ? 4 : 5);
    // Tight domain like real finance charts, with a little headroom.
    const span = hi - lo || Math.abs(hi) * 0.02 || 1;
    const y0 = lo - span * 0.06, y1 = hi + span * 0.06;
    const X = (k) => pad.l + (k / (n - 1)) * iw;
    const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * ih;
    this.geom = { X, Y, pad, W, H, n, iw };

    // Grid + y labels.
    const grid = el("g", { class: "grid" }, svg);
    for (const v of t.ticks) {
      if (v < y0 || v > y1) continue;
      const y = Y(v);
      el("line", { x1: pad.l, x2: W - pad.r, y1: y, y2: y }, grid);
      const tx = el("text", { x: W - pad.r + 8, y: y + 4, class: "ylab" }, grid);
      tx.textContent = m.yTick(v, t.step);
    }
    // X labels.
    const yearSpan = m.yearSpan ?? 1;
    for (const { k, text } of xLabels(m.dates, yearSpan * 12)) {
      const x = X(k);
      el("line", { x1: x, x2: x, y1: pad.t, y2: pad.t + ih, class: "vgrid" }, grid);
      const tx = el("text", { x, y: H - (hasDiv ? 18 : 6), class: "xlab", "text-anchor": "middle" }, grid);
      tx.textContent = text;
    }

    const tone = m.up ? "up" : "down";
    const gradId = `g${Math.random().toString(36).slice(2, 8)}`;
    const defs = el("defs", {}, svg);
    const g = el("linearGradient", { id: gradId, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el("stop", { offset: "0%", class: `stop-${tone}`, "stop-opacity": 0.28 }, g);
    el("stop", { offset: "100%", class: `stop-${tone}`, "stop-opacity": 0 }, g);

    // Baseline: the starting value (dashed), like "previous close" on 1D charts.
    if (m.baseline != null) {
      const by = Y(m.baseline);
      el("line", { x1: pad.l, x2: W - pad.r, y1: by, y2: by, class: "baseline" }, svg);
    }

    const pts = m.values.map((v, k) => `${X(k).toFixed(1)},${Y(v).toFixed(1)}`);
    el("path", { d: `M${pts.join("L")}L${X(n - 1).toFixed(1)},${pad.t + ih}L${X(0).toFixed(1)},${pad.t + ih}Z`, fill: `url(#${gradId})` }, svg);
    if (m.compare) {
      const cp = m.compare.map((v, k) => `${X(k).toFixed(1)},${Y(v).toFixed(1)}`);
      el("path", { d: `M${cp.join("L")}`, class: "compare" }, svg);
    }
    el("path", { d: `M${pts.join("L")}`, class: `line line-${tone}` }, svg);

    // Dividend ticks along the bottom.
    if (hasDiv) {
      const dy = H - 7;
      const gd = el("g", { class: "divs" }, svg);
      let lastX = -10;
      for (const dm of m.divMarks) {
        const x = X(dm.k);
        if (x - lastX < 2.5) continue; // weekly payers on a 10Y chart: don't smear
        lastX = x;
        el("circle", { cx: x, cy: dy, r: 2.4 }, gd);
      }
    }

    // Crosshair layer.
    this.cross = el("g", { class: "cross", visibility: "hidden" }, svg);
    this.crossLine = el("line", { y1: pad.t, y2: pad.t + ih }, this.cross);
    this.crossDot = el("circle", { r: 4.5, class: `dot-${tone}` }, this.cross);
    if (this.hover != null) this.setHover(this.hover);
  }

  pointer(e) {
    if (!this.geom) return;
    const r = this.svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * this.geom.W;
    const k = Math.round(((x - this.geom.pad.l) / this.geom.iw) * (this.geom.n - 1));
    this.setHover(Math.max(0, Math.min(this.geom.n - 1, k)));
  }

  key(e) {
    if (!this.geom) return;
    const n = this.geom.n;
    const step = e.shiftKey ? Math.max(1, Math.round(n / 20)) : 1;
    let k = this.hover ?? n - 1;
    if (e.key === "ArrowLeft") k -= step;
    else if (e.key === "ArrowRight") k += step;
    else if (e.key === "Home") k = 0;
    else if (e.key === "End") k = n - 1;
    else if (e.key === "Escape") return this.setHover(null);
    else return;
    e.preventDefault();
    this.setHover(Math.max(0, Math.min(n - 1, k)));
  }

  setHover(k) {
    this.hover = k;
    const m = this.model;
    if (k == null || !m || !this.geom) {
      if (this.cross) this.cross.setAttribute("visibility", "hidden");
      this.tip.hidden = true;
      this.onHover?.(null);
      return;
    }
    const { X, Y, W, pad } = this.geom;
    const x = X(k), y = Y(m.values[k]);
    this.cross.setAttribute("visibility", "visible");
    this.crossLine.setAttribute("x1", x);
    this.crossLine.setAttribute("x2", x);
    this.crossDot.setAttribute("cx", x);
    this.crossDot.setAttribute("cy", y);
    this.tip.innerHTML = m.tooltip(k);
    this.tip.hidden = false;
    const tw = this.tip.offsetWidth;
    const left = x + 14 + tw > W - pad.r ? x - 14 - tw : x + 14;
    this.tip.style.left = `${Math.max(2, left)}px`;
    this.tip.style.top = `${pad.t}px`;
    this.onHover?.(k);
  }
}

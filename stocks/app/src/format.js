const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function money(v, currency = "USD", dp) {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const digits = dp ?? (abs >= 1000 ? 0 : abs >= 1 ? 2 : 4);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(v);
  } catch {
    return `${v.toFixed(digits)} ${currency}`;
  }
}

export const num = (v, dp = 2) =>
  v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const pct = (v, dp = 2, sign = true) =>
  v == null || !Number.isFinite(v) ? "—" : `${sign && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(dp)}%`;

export const signed = (v, currency) =>
  v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${money(Math.abs(v), currency, 2)}`;

export function date(iso, withYear = true) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${MON[+m - 1]} ${+d}${withYear ? `, ${y}` : ""}`;
}

export function years(y) {
  if (y < 1) return `${Math.max(1, Math.round(y * 12))} mo`;
  return `${y.toFixed(y < 10 ? 1 : 0)} yrs`;
}

/** Compact axis label for a value, given the tick step. */
export function axis(v, step, currency = "USD") {
  const abs = Math.abs(v);
  const sym = currency === "USD" ? "$" : "";
  if (abs >= 1e6) return `${sym}${(v / 1e6).toFixed(step >= 1e6 ? 0 : 1)}M`;
  if (abs >= 1e4) return `${sym}${(v / 1e3).toFixed(step >= 1e3 ? 0 : 1)}k`;
  const dp = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return `${sym}${v.toFixed(dp)}`;
}

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

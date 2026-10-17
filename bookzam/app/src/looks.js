// What a spine looks like, for recognising it when its title can't be read:
// from too far away, too small, or in a photo that's a bit blurred.
//
// A look is the spine's label area cut out upright and averaged into a grid
// of 8 x 32 cells (across x along), each cell's brightness and two colour
// differences. Comparing two looks normalises brightness (so a dimmer photo
// still matches) but keeps colour (a red spine isn't a blue one), and tries
// the grid both ways round, since a spine can be photographed upside down.
//
// Places to compare are where the text detector saw text, read or not, so a
// match is one of a few dozen spines, not any stripe of colour in the photo.
// Images here are planes made by `planes()` from RGBA pixels.

export const ACROSS = 8, ALONG = 32;
const CELLS = ACROSS * ALONG;

/** Brightness and two colour-difference planes of an RGBA image. */
export function planes(img) {
  const n = img.width * img.height;
  const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  const d = img.data;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    L[i] = (r + g + b) / 3;
    A[i] = r - g;
    B[i] = (r + g) / 2 - b;
  }
  return { width: img.width, height: img.height, L, A, B };
}

/** Box-filtered planes at most `edge` pixels on the long side (for searching). */
export function shrink(pl, edge) {
  const f = Math.max(1, Math.ceil(Math.max(pl.width, pl.height) / edge));
  const width = Math.floor(pl.width / f), height = Math.floor(pl.height / f);
  const out = { width, height, scale: f, L: new Float32Array(width * height), A: new Float32Array(width * height), B: new Float32Array(width * height) };
  for (const k of ['L', 'A', 'B']) {
    const src = pl[k], dst = out[k];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let s = 0;
        for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) s += src[(y * f + yy) * pl.width + x * f + xx];
        dst[y * width + x] = s / (f * f);
      }
    }
  }
  return out;
}

/**
 * The spine area around a group of text lines (as spines.js makes them), in
 * the lines' pixels: {cx, cy, len, thick, ax, ay}, (ax, ay) the reading
 * direction. It's the text with a margin, which is the part of a spine that
 * differs most from its neighbours.
 */
export function spineRect(group) {
  const { ax, ay } = group.lines[0].dir;
  const nx = -ay, ny = ax;
  let a0 = Infinity, a1 = -Infinity, n0 = Infinity, n1 = -Infinity;
  for (const l of group.lines) {
    const c = Math.cos(l.box.angle), s = Math.sin(l.box.angle);
    const hw = l.box.w / 2, hh = l.box.h / 2;
    for (const [u, v] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
      const x = l.box.cx + u * c - v * s, y = l.box.cy + u * s + v * c;
      const pa = x * ax + y * ay, pn = x * nx + y * ny;
      a0 = Math.min(a0, pa); a1 = Math.max(a1, pa); n0 = Math.min(n0, pn); n1 = Math.max(n1, pn);
    }
  }
  const thick = (n1 - n0) * 1.3, len = (a1 - a0) + 0.3 * (n1 - n0);
  const ca = (a0 + a1) / 2, cn = (n0 + n1) / 2;
  return { cx: ca * ax + cn * nx, cy: ca * ay + cn * ny, len, thick, ax, ay };
}

export function scaleRect(r, f) {
  return { ...r, cx: r.cx * f, cy: r.cy * f, len: r.len * f, thick: r.thick * f };
}

function sample(plane, w, h, x, y) {
  if (x < 0) x = 0; else if (x > w - 1) x = w - 1;
  if (y < 0) y = 0; else if (y > h - 1) y = h - 1;
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
  const fx = x - x0, fy = y - y0;
  return (plane[y0 * w + x0] * (1 - fx) + plane[y0 * w + x1] * fx) * (1 - fy) + (plane[y1 * w + x0] * (1 - fx) + plane[y1 * w + x1] * fx) * fy;
}

/**
 * The raw look of a rectangle: cell means of the three planes, cell (i across,
 * j along) at [i * ALONG + j], channels one after another (3 x 256 values).
 */
export function describe(pl, r, SUB = 3) {
  const out = new Float32Array(3 * CELLS);
  const nx = -r.ay, ny = r.ax;
  for (let i = 0; i < ACROSS; i++) {
    for (let j = 0; j < ALONG; j++) {
      let sL = 0, sA = 0, sB = 0;
      for (let si = 0; si < SUB; si++) {
        for (let sj = 0; sj < SUB; sj++) {
          const u = ((j + (sj + 0.5) / SUB) / ALONG - 0.5) * r.len;
          const v = ((i + (si + 0.5) / SUB) / ACROSS - 0.5) * r.thick;
          const x = r.cx + u * r.ax + v * nx, y = r.cy + u * r.ay + v * ny;
          sL += sample(pl.L, pl.width, pl.height, x, y);
          sA += sample(pl.A, pl.width, pl.height, x, y);
          sB += sample(pl.B, pl.width, pl.height, x, y);
        }
      }
      const k = i * ALONG + j, n = SUB * SUB;
      out[k] = sL / n; out[CELLS + k] = sA / n; out[2 * CELLS + k] = sB / n;
    }
  }
  return out;
}

/** A raw look averaged down to `ac` x `al` cells. */
export function coarsen(raw, ac, al) {
  const out = new Float32Array(3 * ac * al);
  const fi = ACROSS / ac, fj = ALONG / al;
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < ac; i++) {
      for (let j = 0; j < al; j++) {
        let s = 0;
        for (let ii = 0; ii < fi; ii++) for (let jj = 0; jj < fj; jj++) s += raw[c * CELLS + (i * fi + ii) * ALONG + j * fj + jj];
        out[c * ac * al + i * al + j] = s / (fi * fj);
      }
    }
  }
  return out;
}

/** Mean and spread of each channel of a raw look. */
function stats(raw) {
  const n = raw.length / 3, out = [];
  for (let c = 0; c < 3; c++) {
    let m = 0, v = 0;
    for (let k = 0; k < n; k++) m += raw[c * n + k];
    m /= n;
    for (let k = 0; k < n; k++) v += (raw[c * n + k] - m) ** 2;
    out.push({ mean: m, spread: Math.sqrt(v / n) });
  }
  return out;
}

/**
 * The pattern of a raw look: each channel with its mean taken away (so the
 * photo's exposure and colour cast don't matter), brightness weighted most,
 * scaled to unit length for cosine similarity.
 */
export function pattern(raw) {
  const n = raw.length / 3, st = stats(raw), out = new Float32Array(raw.length);
  const weight = [1, 0.6, 0.6];
  let norm = 0;
  for (let c = 0; c < 3; c++) for (let k = 0; k < n; k++) {
    const v = (raw[c * n + k] - st[c].mean) * weight[c];
    out[c * n + k] = v;
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (let k = 0; k < out.length; k++) out[k] /= norm;
  return out;
}

/** How much detail a look has: a plain spine can't be told from its neighbours. */
export function detail(raw) {
  return stats(raw)[0].spread;
}

/** Its colour, independent of exposure: the colour differences over brightness. */
function colour(raw) {
  const st = stats(raw), l = st[0].mean + 20;
  return [st[1].mean / l, st[2].mean / l];
}

/** The same look turned half round (the spine photographed upside down). */
export function flip(raw, ac = ACROSS, al = ALONG) {
  const n = ac * al, out = new Float32Array(raw.length);
  for (let c = 0; c < 3; c++) for (let i = 0; i < ac; i++) for (let j = 0; j < al; j++) {
    out[c * n + i * al + j] = raw[c * n + (ac - 1 - i) * al + (al - 1 - j)];
  }
  return out;
}

const dot = (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s; };

/** A raw look made ready to compare many times: its pattern both ways up, colour and detail. */
export function prepare(raw, ac = ACROSS, al = ALONG) {
  return { p: pattern(raw), pf: pattern(flip(raw, ac, al)), c: colour(raw), detail: detail(raw) };
}

/**
 * How alike two prepared looks are, either way up: the patterns' cosine, less
 * a penalty for different colours. About 1 for the same spine; on real shelf
 * photos a different spine stayed below 0.8.
 */
export function compare(a, b) {
  const colourGap = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]);
  return Math.max(dot(a.p, b.p), dot(a.p, b.pf)) - 1.5 * colourGap;
}

/** How alike two raw looks are (see compare). */
export function similarity(a, b, ac = ACROSS, al = ALONG) {
  return compare(prepare(a, ac, al), prepare(b, ac, al));
}

/** A raw look packed into 768 bytes (for saving with an item). */
export function pack(raw) {
  const bytes = new Uint8Array(raw.length);
  for (let k = 0; k < raw.length; k++) {
    const v = k < CELLS ? raw[k] : (raw[k] + 255) / 2; // colour differences run -255..255
    bytes[k] = Math.max(0, Math.min(255, Math.round(v)));
  }
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function unpack(text) {
  const s = atob(text), raw = new Float32Array(s.length);
  for (let k = 0; k < s.length; k++) {
    const b = s.charCodeAt(k);
    raw[k] = k < CELLS ? b : b * 2 - 255;
  }
  return raw;
}

/** A saved look for an item: {v (packed), aspect, vertical}. */
export function lookOf(pl, rect) {
  return { v: pack(describe(pl, rect)), aspect: Math.round((rect.len / rect.thick) * 100) / 100, vertical: Math.abs(rect.ay) > Math.SQRT1_2 };
}

// ---------- matching looks ----------

/** Below this much detail a look is too plain to recognise. */
export const MIN_DETAIL = 14;
/** A match this good, and clearly better than the next place, is that spine. */
export const SURE = 0.8;
const LEAD = 0.04;

/**
 * Which of `candidates` (prepared looks of places in a photo where text was
 * seen, read or not) is the saved look: {index, score, runnerUp}, or null if
 * the look is too plain to tell apart.
 */
export function bestMatch(look, candidates) {
  const target = prepared(look);
  if (target.detail < MIN_DETAIL) return null;
  let index = -1, score = -Infinity, runnerUp = -Infinity;
  candidates.forEach((c, i) => {
    if (!c) return;
    const s = compare(target, c);
    if (s > score) { runnerUp = score; score = s; index = i; } else if (s > runnerUp) runnerUp = s;
  });
  return index < 0 ? null : { index, score: Math.round(score * 1000) / 1000, runnerUp: Math.round(Math.max(runnerUp, 0) * 1000) / 1000 };
}

/** True if a match is good enough to act on. */
export const isSure = (m, sure = SURE) => Boolean(m) && m.score >= sure && m.score - m.runnerUp >= LEAD;

// Saved looks prepared once per page (kept out of the looks themselves, which are saved).
const ready = new WeakMap();
function prepared(look) {
  if (!ready.has(look)) ready.set(look, prepare(unpack(look.v)));
  return ready.get(look);
}

/**
 * Which known item (each with saved `looks`) a place in a photo is: {item,
 * score} if one is sure and clearly ahead of every other item, else null.
 */
export function recognise(candidate, items, sure = 0.85) {
  if (candidate.detail < MIN_DETAIL) return null;
  let best = null, second = -Infinity;
  for (const item of items) {
    let s = -Infinity;
    for (const look of item.looks || []) {
      const ready = prepared(look);
      if (ready.detail >= MIN_DETAIL) s = Math.max(s, compare(ready, candidate));
    }
    if (!best || s > best.score) { if (best) second = Math.max(second, best.score); best = { item, score: s }; } else second = Math.max(second, s);
  }
  return best && best.score >= sure && best.score - second >= LEAD ? best : null;
}

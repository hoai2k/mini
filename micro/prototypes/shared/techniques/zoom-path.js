// zoom-path: the timing of a world-to-world zoom (from the Micro zoom
// transitions prototype, micro/prototypes/zoom/). No three.js.
//
// - Log-scale zoom: the field width is interpolated in log space,
//   w(p) = w0 · (w1 / w0)^e(p), so every second of the zoom magnifies by the
//   same factor (the speed feels constant from 36 mm down to 0.6 µm).
// - A transition timeline: highlight, then (by strategy) a look morph before,
//   during or after the zoom. timelineState(tl, τ) says where everything is at
//   time τ, so a transition can be played, reversed or scrubbed.
// - Honest scale readouts: a 1-2-5 scale bar and an eyepiece-equivalent
//   magnification (180 mm ÷ field width: a 10× eyepiece of field number 18).
//
//   import { zoomField, EASES, STRATEGIES, makeTimeline, timelineState, scaleBar, fmtLen, eyepieceMag } from '../shared/techniques/zoom-path.js';

export const EASES = {
  /** Constant zoom speed: the same magnification per second all the way. */
  log: (p) => p,
  /** Starts and ends gently. */
  smooth: (p) => p * p * (3 - 2 * p),
  /** Fast start, slow arrival (the new world settles in). */
  arrive: (p) => 1 - (1 - p) * (1 - p),
};

/** Field width at zoom progress p (0..1) from w0 to w1, eased in log space. */
export function zoomField(w0, w1, p, ease = EASES.log) {
  const e = ease(Math.min(Math.max(p, 0), 1));
  return w0 * Math.pow(w1 / w0, e);
}

/** Where a field width sits between w0 and w1 in log space (0 at w0, 1 at w1). */
export function zoomDepth(w0, w1, w) {
  return Math.log(w0 / w) / Math.log(w0 / w1);
}

/**
 * Style strategies. pre / post: the look morph happens before / after the
 * zoom (its own segment); during: the morph is tied to zoom progress;
 * cross: as during, but the two finished images cross-fade; cut: the look
 * switches at the hand-off point with no morph.
 */
export const STRATEGIES = {
  first: { name: 'Look first', pre: true },
  during: { name: 'Look during', during: true },
  after: { name: 'Zoom first', post: true },
  cross: { name: 'Crossfade', during: true, cross: true },
  cut: { name: 'Cut at hand-off', cut: true },
};

/**
 * A timeline: { H highlight s, M morph s, Z zoom s, strategy }.
 * Segments: [0, H] highlight · [H, H+Mpre] look morph · zoom · [.., +Mpost] look morph.
 */
export function makeTimeline({ H = 2.2, M = 2.5, Z = 3.5, strategy = 'during', handoff = 0.5 }) {
  const s = STRATEGIES[strategy] || STRATEGIES.during;
  const pre = s.pre ? M : 0, post = s.post ? M : 0;
  return { H, M, Z, pre, post, s, strategy, handoff, zoomStart: H + pre, zoomEnd: H + pre + Z, end: H + pre + Z + post };
}

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

/**
 * State at time τ: { hl (0..1 through the highlight, or 1 after), zoom (0..1),
 * look (0..1 from world N's look to N+1's), cross, segment }.
 */
export function timelineState(tl, tau) {
  const hl = tl.H > 0 ? clamp01(tau / tl.H) : 1;
  const zoom = clamp01((tau - tl.zoomStart) / tl.Z);
  let look;
  if (tl.s.pre) look = smooth((tau - tl.H) / tl.pre);
  else if (tl.s.post) look = smooth((tau - tl.zoomEnd) / tl.post);
  else if (tl.s.cut) look = zoom >= tl.handoff ? 1 : 0;
  else look = smooth(zoom);
  const segment = tau < tl.H ? 'highlight' : tau < tl.zoomStart ? 'look' : tau < tl.zoomEnd ? 'zoom' : tau < tl.end ? 'look' : 'arrived';
  return { hl, zoom, look, cross: !!tl.s.cross, segment };
}

/** τ at which the zoom reaches progress p (0..1). */
export function tauAtZoom(tl, p) { return tl.zoomStart + clamp01(p) * tl.Z; }

/** Eyepiece-equivalent magnification: 180 mm (10× eyepiece, field number 18) ÷ field width. */
export function eyepieceMag(fieldUm) { return 180000 / fieldUm; }

/** A length in µm as text: nm, µm or mm. */
export function fmtLen(um, digits = 3) {
  const f = (v) => { const s = v.toPrecision(digits); return s.includes('e') ? String(Number(s)) : String(Number(s)); };
  if (um >= 1000) return `${f(um / 1000)} mm`;
  if (um >= 1) return `${f(um)} µm`;
  return `${f(um * 1000)} nm`;
}

/** A 1-2-5 scale bar about `frac` of the screen width: { um, px, label }. */
export function scaleBar(fieldUm, screenPx, frac = 0.18) {
  const want = fieldUm * frac;
  const e = Math.floor(Math.log10(want));
  let best = Math.pow(10, e);
  for (const m of [1, 2, 5, 10]) if (m * Math.pow(10, e) <= want) best = m * Math.pow(10, e);
  return { um: best, px: (best / fieldUm) * screenPx, label: fmtLen(best, 2) };
}

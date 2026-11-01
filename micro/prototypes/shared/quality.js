// One quality governor for every world.
//
// It watches the frame time and steps the render scale (resolution) down when
// frames run long and back up when there is headroom, with hysteresis, and
// gives an effects level (0..2) for the world's own knobs (taps, LOD, cilia).
// It also owns the renderer's pixel ratio: min(devicePixelRatio, 1.25) alone,
// 1.0 while the screen is split, and a split factor multiplied into the
// scale (0.7 at 2 views, 0.55 at 3-4), so a split costs about one view.
//
//   import { createQuality } from '../shared/quality.js';
//   const quality = createQuality({ renderer, key: 'mite',
//     onChange: ({ scale, level }) => { mic.setScale(scale); mic.taps = [8, 16, 26][level]; } });
//   quality.addToFeatures(features);           // "Quality governor (auto)" + a manual choice
//   ... each frame:
//   quality.setSplitViews(split.views.length);  // cheap when unchanged
//   quality.update(dtSeconds);                  // real (unclamped) frame time
//
// API
//   createQuality({ renderer, key, onChange, min = 0.5, max = 1, target = 1/60,
//                   scalePixelRatio = false }) -> quality
//     renderer         a THREE.WebGLRenderer (its pixel ratio is set here), or null
//     key              the world's id (remembers the last automatic step, ?q=)
//     onChange({ scale, level, pixelRatio, views, auto, split, step })
//                      split: the split factor alone (1, 0.7, 0.55); step: the governor's
//                      own scale (scale = step x split)
//                      called whenever any of them changes (and once on the first update)
//     min/max          the range of the governor's render scale
//     scalePixelRatio  also multiply `scale` into the renderer's pixel ratio,
//                      for a world with no buffers of its own to scale
//   quality.scale       the render scale to use: governor step x split factor
//   quality.level       effects level, 2 best .. 0 cheapest
//   quality.pixelRatio  the pixel ratio applied to the renderer
//   quality.auto        whether the governor is stepping (false: manual choice)
//   quality.update(dt)  each frame, with the real frame time in seconds
//   quality.addToFeatures(features)
//   quality.setSplitViews(n)
//   quality.stats       { frame (smoothed s), step, steps }
//
// Hysteresis: it steps down after ~1 s averaging over target x 1.12 (≈1/54 s
// at 60 Hz), never more than one step a second. Under vsync a fast machine
// sits exactly at the target, so "headroom" is ~4 s at or under target x 1.06;
// a step up that is followed by a step down within 3 s doubles the wait before
// the next try (up to 32 s), so it doesn't oscillate. After a split or merge
// it holds for 0.8 s (that frame's spike is reallocation, not steady state).
// A lone frame longer than 0.25 s (a hidden tab, loading) is ignored; a run
// of them counts (as 0.25 s each), so a very slow machine still steps down.
//
// Address overrides: ?f=-quality turns the governor off (the manual choice
// then applies, High by default); ?q=high|medium|low (or a step number) fixes
// the quality for measurements.

const SPLIT_FACTOR = [1, 1, 0.7, 0.55, 0.55];
const CHOICES = ['High', 'Medium', 'Low'];

export function createQuality({
  renderer = null, key = 'world', onChange = null,
  min = 0.5, max = 1, target = 1 / 60, scalePixelRatio = false,
} = {}) {
  min = Math.max(0.2, Math.min(min, max));
  // The ladder of steps, best first: scale in ~0.1 steps; the effects level
  // falls by thirds of the ladder.
  const steps = [];
  const n = Math.max(1, Math.round((max - min) / 0.1));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    steps.push({ scale: +(max + (min - max) * t).toFixed(3), level: t < 0.34 ? 2 : t < 0.67 ? 1 : 0 });
  }
  const store = `micro.quality.${key}`;
  let step = 0;
  try { const s = parseInt(localStorage.getItem(store), 10); if (s >= 0 && s < steps.length) step = s; } catch { /* private mode */ }
  let auto = true;
  let manual = 'High';
  try {
    const q = new URL(location.href).searchParams.get('q');
    if (q) {
      const c = CHOICES.find((x) => x.toLowerCase() === q.toLowerCase());
      if (c) { auto = false; manual = c; }
      else if (/^\d+$/.test(q)) { auto = false; manual = null; step = Math.min(steps.length - 1, +q); }
    }
  } catch { /* no location (tests) */ }
  const urlFixed = !auto;

  let views = 1;
  let smooth = target;       // smoothed frame time (s)
  let over = 0, under = 0;   // seconds spent over / under the thresholds
  let sinceStep = 1e9;       // seconds since the last step
  let hold = 0.5;            // seconds to ignore after a start, split or merge
  let upWait = 4;            // seconds of headroom needed for a step up (backs off)
  let lastUpAt = -1e9, clock = 0;
  let dprCheck = 0, lastDt = 0;
  let emitted = false;
  let last = { scale: -1, level: -1, pixelRatio: -1, views: -1, auto: null };

  const manualStep = () => (manual === null ? step : Math.round(CHOICES.indexOf(manual) / 2 * (steps.length - 1)));
  const cur = () => steps[auto ? step : manualStep()];
  const deviceRatio = () => (typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1);
  const ratioCap = () => (views > 1 ? 1 : Math.min(deviceRatio(), 1.25));

  const state = () => {
    const s = cur();
    const scale = +(s.scale * SPLIT_FACTOR[Math.min(4, views)]).toFixed(4);
    const pixelRatio = +(ratioCap() * (scalePixelRatio ? s.scale : 1)).toFixed(4);
    return { scale, level: s.level, pixelRatio, views, auto, split: SPLIT_FACTOR[Math.min(4, views)], step: s.scale };
  };

  function apply(force = false) {
    const s = state();
    if (!force && s.scale === last.scale && s.level === last.level && s.pixelRatio === last.pixelRatio && s.views === last.views && s.auto === last.auto) return;
    if (renderer && s.pixelRatio !== last.pixelRatio && renderer.getPixelRatio() !== s.pixelRatio) renderer.setPixelRatio(s.pixelRatio);
    last = s;
    emitted = true;
    try { onChange?.(s); } catch (e) { console.error('[micro] quality onChange:', e); }
  }

  function move(d) {
    const next = Math.max(0, Math.min(steps.length - 1, step + d));
    if (next === step) return false;
    step = next;
    sinceStep = 0; over = 0; under = 0;
    try { localStorage.setItem(store, String(step)); } catch { /* private mode */ }
    apply();
    return true;
  }

  // Apply the pixel ratio at once, so the first frame renders at the right size.
  if (renderer) { const pr = state().pixelRatio; if (renderer.getPixelRatio() !== pr) renderer.setPixelRatio(pr); last.pixelRatio = pr; }

  const api = {
    get scale() { return state().scale; },
    get level() { return cur().level; },
    get pixelRatio() { return state().pixelRatio; },
    get auto() { return auto; },
    get stats() { return { frame: smooth, step: auto ? step : manualStep(), steps: steps.length }; },

    update(dt) {
      if (!emitted) apply(true);
      dt = +dt || 0;
      clock += dt;
      if ((dprCheck += dt) > 1) { dprCheck = 0; apply(); } // a window moved to another screen
      const lone = dt > 0.25 && lastDt <= 0.25;
      lastDt = dt;
      if (!auto || dt <= 0 || lone) return;
      dt = Math.min(dt, 0.25);
      if (hold > 0) { hold -= dt; smooth = target; over = under = 0; return; }
      smooth += (dt - smooth) * Math.min(1, dt / 0.25);
      sinceStep += dt;
      if (smooth > target * 1.12) { over += dt; under = 0; }
      else if (smooth <= target * 1.06) { under += dt; over = Math.max(0, over - dt); }
      else { over = Math.max(0, over - dt * 0.5); under = 0; }
      if (over > 1 && sinceStep > 1) {
        if (clock - lastUpAt < 3) upWait = Math.min(32, upWait * 2); // the last step up didn't hold
        move(1);
      } else if (under > upWait && sinceStep > 1) {
        if (move(-1)) lastUpAt = clock;
        under = 0;
      }
    },

    setSplitViews(count) {
      const v = Math.max(1, Math.min(4, count | 0 || 1));
      if (v === views) return;
      views = v;
      hold = 0.8;
      apply();
    },

    addToFeatures(features) {
      features.add({
        id: 'quality', group: 'Rendering', label: 'Quality governor (auto)', on: !urlFixed,
        about: 'Watches the frame time and lowers the render resolution (then effects) when frames run long, raising it again when there is headroom. Off: the manual quality below.',
        onChange: (on) => { if (urlFixed) return; auto = !!on; hold = 0.5; apply(); },
      });
      if (!urlFixed || manual !== null) {
        features.add({
          id: 'qualityLevel', group: 'Rendering', label: 'Manual quality', choices: CHOICES, value: manual || 'High',
          about: 'Used while the governor is off: High = full resolution and effects, Low = the cheapest step.',
          onChange: (v) => { if (urlFixed) return; manual = v; apply(); },
        });
      }
    },
  };
  return api;
}

// Theme art: each [data-asset] element shows its theme's delivered image
// (data/asset-list.json) or that theme's stand-in (standins.js). Both carry
// anchors, so the pendulum is pinned to the body by whatever is showing.

import { standin } from './standins.js';

let list = null;

async function assetList() {
  if (!list) {
    try { list = await (await fetch('data/asset-list.json')).json(); } catch { list = []; }
  }
  return list;
}

/**
 * Where the pendulum layer goes over the body layer, in percentages of the
 * body: the pendulum's hub sits on the body's pivot. `scale` is pendulum
 * pixels per body pixel (1 when both are drawn at the same density).
 */
export function pendulumLayout(body, pendulum) {
  const [bw, bh] = body.canvas;
  const [px, py] = body.anchors.pivot;
  const [pw, ph] = pendulum.canvas;
  const [hx, hy] = pendulum.anchors.hub;
  const k = pendulum.scale ?? 1;
  return {
    left: (100 * (px - hx * k)) / bw,
    top: (100 * (py - hy * k)) / bh,
    width: (100 * pw * k) / bw,
    height: (100 * ph * k) / bh,
    originX: (100 * hx) / pw,
    originY: (100 * hy) / ph,
  };
}

/**
 * The image for `id` in `theme`: a delivered file, an interim one standing
 * in until it is (the pendulum's rod and weight, cut from the pendulum), or
 * the stand-in.
 */
export function pick(entries, theme, id) {
  const mine = entries.find((a) => a.id === id && a.theme === theme);
  if (mine && (mine.status === 'delivered' || mine.status === 'revise')) return { ...mine, kind: 'image' };
  if (mine?.interim) return { ...mine, file: mine.interim, kind: 'image' };
  return { ...standin(theme, id), kind: 'standin' };
}

let generation = 0;

/** Show `theme`'s art everywhere; calls onLayout whenever a layer changes. */
export async function applyArt(theme, onLayout) {
  const entries = await assetList();
  const gen = ++generation;
  for (const el of document.querySelectorAll('[data-asset]')) {
    const art = pick(entries, theme, el.dataset.asset);
    const key = `${theme}:${art.kind}:${art.file || ''}`;
    if (el.dataset.shown === key) continue;
    const show = (node, shown = art) => {
      if (gen !== generation) return;
      if (typeof node === 'string') el.innerHTML = node;
      else el.replaceChildren(node);
      el.dataset.shown = key;
      el.art = shown;
      onLayout?.();
    };
    if (art.kind === 'standin') {
      show(art.html);
    } else {
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.onload = () => show(img);
      img.onerror = () => {
        const fallback = { ...standin(theme, el.dataset.asset), kind: 'standin' };
        show(fallback.html, fallback);
      };
      img.src = art.file;
    }
  }
}

/** The pendulum's art: its rod (the layer itself, when it is one image). */
const rodOf = (pendulumEl) => pendulumEl.art || pendulumEl.querySelector('.met-rod')?.art;

/** Pin the pendulum element to the body element using their anchors. */
export function alignPendulum(bodyEl, pendulumEl) {
  const body = bodyEl.art, pendulum = rodOf(pendulumEl);
  if (!body?.anchors?.pivot || !pendulum?.anchors?.hub) return;
  const l = pendulumLayout(body, pendulum);
  Object.assign(pendulumEl.style, {
    left: `${l.left}%`,
    top: `${l.top}%`,
    width: `${l.width}%`,
    height: `${l.height}%`,
    transformOrigin: `${l.originX}% ${l.originY}%`,
  });
  // The container keeps the body's proportions.
  bodyEl.parentElement.style.aspectRatio = `${body.canvas[0]} / ${body.canvas[1]}`;
}

/**
 * Lay the Drone bow's volume track along its hair: the frog and tip anchors
 * of whatever bow is showing, as percentages of the slider (which takes the
 * bow's proportions).
 */
export function alignBow(bowArtEl) {
  const bow = bowArtEl?.art;
  if (!bow?.anchors?.frog || !bow?.anchors?.tip) return;
  const [w, h] = bow.canvas;
  const slider = bowArtEl.parentElement;
  slider.style.aspectRatio = `${w} / ${h}`;
  slider.style.setProperty('--hair-x', `${(100 * bow.anchors.frog[0]) / w}%`);
  slider.style.setProperty('--hair-bottom', `${100 - (100 * bow.anchors.frog[1]) / h}%`);
  slider.style.setProperty('--hair-top', `${(100 * bow.anchors.tip[1]) / h}%`);
}

/** How far the current pendulum swings each way, in degrees. */
export const swingOf = (pendulumEl) => rodOf(pendulumEl)?.swing ?? 24;

/**
 * Put the weight on the rod at `t` (0 the top of its travel, slowest, to 1
 * the bottom), in the rod's canvas: the weight's `center` anchor on the rod
 * at that height, its own size at the rod's scale. Returns the canvas y, or
 * null with no weight to place.
 */
export function placeWeight(pendulumEl, t) {
  const rod = rodOf(pendulumEl);
  const weightEl = pendulumEl.querySelector('.met-weight');
  const weight = weightEl?.art;
  if (!rod?.travel || !weight?.canvas || !weight.anchors?.center) { if (weightEl) weightEl.hidden = true; return null; }
  weightEl.hidden = false;
  const [rw, rh] = rod.canvas;
  const [ww, wh] = weight.canvas;
  const [cx, cy] = weight.anchors.center;
  const axis = rod.anchors?.hub?.[0] ?? rw / 2;
  const y = rod.travel[0] + Math.min(1, Math.max(0, t)) * (rod.travel[1] - rod.travel[0]);
  Object.assign(weightEl.style, {
    left: `${(100 * (axis - cx)) / rw}%`,
    top: `${(100 * (y - cy)) / rh}%`,
    width: `${(100 * ww) / rw}%`,
    height: `${(100 * wh) / rh}%`,
  });
  return y;
}

/** The place on the rod (0 to 1) for a point `clientY` on screen, with the pendulum upright. */
export function weightFromPoint(pendulumEl, clientY) {
  const rodEl = pendulumEl.querySelector('.met-rod');
  const rod = rodOf(pendulumEl);
  if (!rod?.travel || !rodEl) return null;
  const r = rodEl.getBoundingClientRect();
  const y = ((clientY - r.top) / r.height) * rod.canvas[1];
  return (y - rod.travel[0]) / (rod.travel[1] - rod.travel[0]);
}

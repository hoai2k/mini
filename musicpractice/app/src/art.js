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

/** The image for `id` in `theme`: a delivered file, or the stand-in. */
export function pick(entries, theme, id) {
  const delivered = entries.find((a) => a.id === id && a.theme === theme && (a.status === 'delivered' || a.status === 'revise'));
  return delivered ? { ...delivered, kind: 'image' } : { ...standin(theme, id), kind: 'standin' };
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

/** Pin the pendulum element to the body element using their anchors. */
export function alignPendulum(bodyEl, pendulumEl) {
  const body = bodyEl.art, pendulum = pendulumEl.art;
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

/** How far the current pendulum swings each way, in degrees. */
export const swingOf = (pendulumEl) => pendulumEl.art?.swing ?? 24;

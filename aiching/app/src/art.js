// Artwork: the delivered images listed in data/asset-list.json, and the
// stand-ins drawn here until each one arrives.

import { hash128, sfc32 } from './rng.js';
import { TRIGRAMS } from './iching.js';

let assets = {};

export function setAssets(list) {
  assets = list || {};
}

/** URL of a delivered asset, or null while it is still a stand-in. */
export function delivered(id) {
  const a = assets[id];
  return a && a.status === 'delivered' ? a.path : null;
}

export const hexId = (n) => `hexagram-${String(n).padStart(2, '0')}`;
export const trigramId = (key) => `trigram-${key}`;
export const topicId = (key) => `topic-${key}`;

const svgUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

function ridge(rng, y, amp, w, h) {
  let d = `M0 ${h} L0 ${y}`;
  const steps = 14;
  let cy = y;
  for (let i = 1; i <= steps; i++) {
    const x = (w / steps) * i;
    cy = y + (rng() - 0.55) * amp;
    const cx = x - w / steps / 2;
    d += ` Q${cx.toFixed(1)} ${(cy - amp * rng() * 0.8).toFixed(1)} ${x.toFixed(1)} ${cy.toFixed(1)}`;
  }
  return `${d} L${w} ${h} Z`;
}

/** A painted landscape stand-in for a hexagram, from its palette. */
export function hexagramStandin(hex, w = 1600, h = 1000) {
  const rng = sfc32(hash128(`hex${hex.n}`));
  const [base, accent, high] = hex.palette;
  const sky1 = mix(base, '#ffffff', 0.15);
  const sky2 = mix(accent, '#fff4dc', 0.35);
  const sunX = 200 + rng() * (w - 400);
  const sunY = 140 + rng() * 220;
  const layers = [0, 1, 2, 3].map((i) => {
    const y = h * (0.42 + i * 0.13);
    const col = mix(mix(base, '#10141c', 0.15 + i * 0.2), sky2, 0.55 - i * 0.16);
    return `<path d="${ridge(rng, y, 160 - i * 25, w, h)}" fill="${col}" opacity="${0.92 - i * 0.04}"/>`;
  }).join('');
  const mist = [0, 1, 2].map((i) => `<rect x="-50" y="${h * (0.5 + i * 0.13)}" width="${w + 100}" height="40" fill="#fff" opacity="0.18" filter="url(#b)"/>`).join('');
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${hex.n}"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0.18 0"/></filter></defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
<circle cx="${sunX}" cy="${sunY}" r="${70 + rng() * 40}" fill="${high}" opacity="0.85"/>
${layers}${mist}
<text x="${w * 0.84}" y="${h * 0.36}" font-size="${h * 0.3}" text-anchor="middle" fill="#fff" opacity="0.22" font-family="serif">${hex.zh.slice(0, 1)}</text>
<rect width="${w}" height="${h}" filter="url(#p)"/>
</svg>`);
}

const ELEMENT_COLOURS = { metal: ['#c9b37e', '#4b5563'], fire: ['#e2553b', '#5c1a12'], wood: ['#5b9a5f', '#1f3d2b'], water: ['#3f6fa6', '#0f2136'], earth: ['#c49a5a', '#4a3216'] };

export function trigramStandin(key) {
  const t = TRIGRAMS[key];
  const [light, dark] = ELEMENT_COLOURS[t.element];
  const bars = t.lines.map((v, i) => {
    const y = 300 - i * 70;
    return v ? `<rect x="110" y="${y}" width="180" height="34" rx="8" fill="${dark}"/>`
      : `<rect x="110" y="${y}" width="78" height="34" rx="8" fill="${dark}"/><rect x="212" y="${y}" width="78" height="34" rx="8" fill="${dark}"/>`;
  }).join('');
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff8e8"/><stop offset="1" stop-color="${light}"/></radialGradient></defs>
<rect width="400" height="400" fill="url(#g)"/>${bars}</svg>`);
}

export function topicStandin(zh, colour = '#a8322d') {
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f6eedd"/>
<circle cx="200" cy="200" r="150" fill="none" stroke="${colour}" stroke-width="10" opacity="0.8"/>
<text x="200" y="262" font-size="170" text-anchor="middle" fill="${colour}" font-family="serif">${zh}</text></svg>`);
}

export function hexagramImage(hex) {
  return delivered(hexId(hex.n)) || hexagramStandin(hex);
}

export function trigramImage(key) {
  return delivered(trigramId(key)) || trigramStandin(key);
}

export function topicImage(key, zh) {
  return delivered(topicId(key)) || topicStandin(zh);
}

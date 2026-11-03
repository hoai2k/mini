// Delivered artwork from micro/image-requests.md. Only images whose
// status is `delivered` in shared/asset-list.js are fetched; everything else
// resolves to null and the prototype keeps its procedural stand-in. A
// delivered file that fails to load is reported in the console, loudly,
// because a silent fallback hides a missing file.
import * as THREE from './vendor/three.module.min.js';
import { ASSETS } from './asset-list.js';

const base = new URL('../', import.meta.url);

/** URL of a delivered image, or null. */
export function assetUrl(id) {
  const a = ASSETS[id];
  if (!a) throw new Error(`unknown asset id ${id}`);
  return a.status === 'delivered' ? new URL(a.file, base).href : null;
}

/** A THREE.Texture for a delivered image (sRGB, repeat-wrapped), or null. */
export function loadTexture(id, { repeat = true, srgb = true } = {}) {
  const url = assetUrl(id);
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, (t) => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      resolve(t);
    }, undefined, () => {
      console.error(`[micro] delivered asset ${id} failed to load from ${url}; using the stand-in`);
      resolve(null);
    });
  });
}

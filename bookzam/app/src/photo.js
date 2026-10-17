// Opens a chosen photo upright, draws it at a given size, and makes the small
// thumbnail the catalogue keeps.

import { fitSize } from './geometry.js';

/** An ImageBitmap (or image element) for a file, upright whatever its EXIF says. */
export async function decode(file) {
  if ('createImageBitmap' in globalThis) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const sizeOf = (img) => ({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });

/** Draw part of an image (crop in fractions; whole image by default) onto a canvas at most maxEdge on its long side. */
export function render(img, maxEdge, crop = { x0: 0, y0: 0, x1: 1, y1: 1 }) {
  const { w, h } = sizeOf(img);
  const sx = crop.x0 * w, sy = crop.y0 * h, sw = (crop.x1 - crop.x0) * w, sh = (crop.y1 - crop.y0) * h;
  const { width, height } = fitSize(sw, sh, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  return canvas;
}

export function thumbnail(img, edge = 360) {
  return render(img, edge).toDataURL('image/jpeg', 0.72);
}

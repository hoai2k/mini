// Export: the choices offered, the size and name of each file (pure), and the
// browser side that flattens the picture and hands it to the device.

import { drawAnnotations } from './render.js';
import { unitOf } from './geometry.js';

// Browsers can write these from a canvas (WebP not in every Safari; checked
// at run time).
const WRITABLE = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const NAMES = {
  'image/png': 'PNG', 'image/jpeg': 'JPEG', 'image/webp': 'WebP', 'image/heic': 'HEIC', 'image/heif': 'HEIF',
  'image/gif': 'GIF', 'image/avif': 'AVIF', 'image/bmp': 'BMP', 'image/tiff': 'TIFF', 'image/svg+xml': 'SVG',
};

// iOS Safari refuses canvases over 16.7 megapixels.
export const MAX_PIXELS = 16777216;
export const WEB_LONG_EDGE = 1920;
export const JPEG_QUALITY = 0.92;
export const WEB_QUALITY = 0.8;

export function typeName(mime) {
  return NAMES[mime] || (mime ? mime.replace(/^image\//, '').toUpperCase() : 'unknown');
}

// The three choices. canWrite(mime) says whether this browser encodes it.
export function exportOptions(originalType, canWrite) {
  const orig = originalType || '';
  const writable = !!WRITABLE[orig] && canWrite(orig);
  return [
    {
      id: 'original',
      label: `Original format (${typeName(orig)})`,
      mime: writable ? orig : null,
      quality: orig === 'image/png' ? undefined : JPEG_QUALITY,
      disabled: !writable,
      note: writable
        ? 'Full size, the same kind of file you opened.'
        : `This browser can't write ${typeName(orig)} files. Choose JPEG instead.`,
    },
    { id: 'jpeg', label: 'JPEG', mime: 'image/jpeg', quality: JPEG_QUALITY, note: 'Full size, high quality. Opens anywhere.' },
    { id: 'web', label: 'JPEG for web', mime: 'image/jpeg', quality: WEB_QUALITY, maxEdge: WEB_LONG_EDGE, note: `Up to ${WEB_LONG_EDGE} px on the long side, a much smaller file for messages, email and websites.` },
  ];
}

// Pixel size of the exported file.
export function outputSize(w, h, option) {
  let s = 1;
  if (option.maxEdge) s = Math.min(1, option.maxEdge / Math.max(w, h));
  if (w * h * s * s > MAX_PIXELS) {
    s = Math.sqrt(MAX_PIXELS / (w * h));
    return { w: Math.floor(w * s), h: Math.floor(h * s), scale: s };
  }
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), scale: s };
}

export function fileName(original, option) {
  const base = (original || 'image').replace(/\.[^./\\]+$/, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'image';
  const ext = WRITABLE[option.mime] || 'jpg';
  return `${base}-annotated${option.id === 'web' ? '-web' : ''}.${ext}`;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

// Browser side.

const writeCache = new Map();
export function canWrite(mime) {
  if (!writeCache.has(mime)) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    writeCache.set(mime, c.toDataURL(mime).startsWith(`data:${mime}`));
  }
  return writeCache.get(mime);
}

// Flatten the image and its annotations into a Blob.
export function renderFile(image, w, h, items, option) {
  const size = outputSize(w, h, option);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  if (option.mime === 'image/jpeg') {
    // JPEG has no transparency: put see-through pictures on white.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.w, size.h);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(size.scale, 0, 0, size.scale, 0, 0);
  ctx.drawImage(image, 0, 0, w, h);
  drawAnnotations(ctx, items, unitOf(w, h), w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = canvas.height = 0; // free the memory now (iOS keeps it otherwise)
      blob ? resolve({ blob, ...size }) : reject(new Error('The picture could not be encoded.'));
    }, option.mime, option.quality);
  });
}

export function canShareFiles(file) {
  try {
    return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
  } catch {
    return false;
  }
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

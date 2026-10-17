// Barcodes: the ISBN on a book's back says exactly which book it is, and a
// game box's EAN/UPC finds it among the bundled games. Read with the browser's
// own BarcodeDetector where there is one (Chrome on Android), else with ZXing
// in WebAssembly (vendor/zxing/, loaded only when first needed).

import { toLookup } from './lookup.js';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
let native = undefined; // BarcodeDetector, null if none, undefined until checked
let zxing = null;

async function nativeDetector() {
  if (native !== undefined) return native;
  native = null;
  try {
    if ('BarcodeDetector' in globalThis) {
      const supported = await BarcodeDetector.getSupportedFormats();
      const wanted = FORMATS.filter((f) => supported.includes(f));
      if (wanted.includes('ean_13')) native = new BarcodeDetector({ formats: wanted });
    }
  } catch {
    native = null;
  }
  return native;
}

function loadZxing() {
  if (!zxing) {
    zxing = import('../vendor/zxing/reader/index.js').then((mod) => {
      const wasm = new URL('../vendor/zxing/zxing_reader.wasm', import.meta.url).href;
      mod.prepareZXingModule({ overrides: { locateFile: (file, prefix) => (file.endsWith('.wasm') ? wasm : prefix + file) } });
      return mod;
    });
    zxing.catch(() => { zxing = null; });
  }
  return zxing;
}

/**
 * The retail barcodes in an image (ImageData, or a canvas/bitmap/video for the
 * native detector): [{code, box: {x0, y0, x1, y1} in pixels}].
 */
export async function readBarcodes(image) {
  const detector = await nativeDetector();
  if (detector) {
    try {
      const found = await detector.detect(image);
      return found.map((b) => ({ code: b.rawValue, box: { x0: b.boundingBox.x, y0: b.boundingBox.y, x1: b.boundingBox.x + b.boundingBox.width, y1: b.boundingBox.y + b.boundingBox.height } }));
    } catch {
      // Fall through to ZXing (some images the native detector won't take).
    }
  }
  const data = image instanceof ImageData ? image : toImageData(image);
  const mod = await loadZxing();
  const found = await mod.readBarcodes(data, { formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE'], tryHarder: true, maxNumberOfSymbols: 20 });
  return found.filter((r) => r.isValid && r.text).map((r) => {
    const p = r.position;
    const xs = [p.topLeft.x, p.topRight.x, p.bottomLeft.x, p.bottomRight.x];
    const ys = [p.topLeft.y, p.topRight.y, p.bottomLeft.y, p.bottomRight.y];
    return { code: r.text, box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } };
  });
}

function toImageData(source) {
  const w = source.videoWidth || source.naturalWidth || source.width, h = source.videoHeight || source.naturalHeight || source.height;
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** True if a string of digits has a valid EAN/UPC check digit. */
export function validCheckDigit(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop();
  // From the right, weights alternate 3, 1, 3, ...
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** The ISBN-13 a barcode carries (978/979 "Bookland" EAN-13s), or null. */
export function isbnOf(code) {
  const c = String(code).replace(/\D/g, '');
  return c.length === 13 && /^97[89]/.test(c) && validCheckDigit(c) ? c : null;
}

/** All the ways a product code may be written (UPC-A is EAN-13 with a leading 0). */
export function codeForms(code) {
  const c = String(code).replace(/\D/g, '');
  const forms = new Set([c]);
  if (c.length === 12) forms.add(`0${c}`);
  if (c.length === 13 && c.startsWith('0')) forms.add(c.slice(1));
  if (c.length === 14) { forms.add(c.slice(1)); if (c.startsWith('00')) forms.add(c.slice(2)); }
  return [...forms];
}

const FIELDS = 'key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median,publisher,subject,edition_count';

/** The book with this ISBN on Open Library: {title, author, lookup} or null. */
export async function bookByIsbn(isbn, { fetch: fetchFn = fetch } = {}) {
  const res = await fetchFn(`https://openlibrary.org/search.json?${new URLSearchParams({ isbn, fields: FIELDS, limit: '1' })}`);
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const doc = ((await res.json()).docs || [])[0];
  if (!doc?.title) return null;
  const lookup = toLookup(doc);
  lookup.isbn = isbn; // the copy in hand, not just any edition's
  return { title: doc.title, author: lookup.authors[0] || null, lookup };
}

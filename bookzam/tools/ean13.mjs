// EAN-13 barcodes as bar patterns, for drawing test images (browser-check.mjs).

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = L.map((c) => [...c].map((b) => (b === '0' ? '1' : '0')).reverse().join(''));
const R = L.map((c) => [...c].map((b) => (b === '0' ? '1' : '0')).join(''));
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** The 95 modules (1 = bar) of a 13-digit EAN code. */
export function ean13(code) {
  if (!/^\d{13}$/.test(code)) throw new Error(`not 13 digits: ${code}`);
  const d = [...code].map(Number);
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (PARITY[d[0]][i - 1] === 'L' ? L : G)[d[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  return `${bits}101`;
}

/** A grey image (Uint8Array, 0 = black) of the barcode on white, with quiet zones. */
export function barcodeImage(code, { module = 4, height = 160, width = 640, top = 40 } = {}) {
  const bits = ean13(code);
  const img = new Uint8Array(width * (height + top * 2)).fill(255);
  const left = Math.round((width - bits.length * module) / 2);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== '1') continue;
    for (let y = top; y < top + height; y++) for (let x = left + i * module; x < left + (i + 1) * module; x++) img[y * width + x] = 0;
  }
  return { gray: img, width, height: height + top * 2 };
}

/** A Y4M video of a still grey image, for Chromium's fake camera. */
export function y4m(image, frames = 30) {
  const { gray, width, height } = image;
  const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F30:1 Ip A1:1 C420jpeg\n`);
  const chroma = Buffer.alloc((width / 2) * (height / 2) * 2, 128);
  const frame = Buffer.concat([Buffer.from('FRAME\n'), Buffer.from(gray), chroma]);
  return Buffer.concat([header, ...Array(frames).fill(frame)]);
}

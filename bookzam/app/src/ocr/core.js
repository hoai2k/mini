// On-device text reading for Bookzam: the image maths around the PaddleOCR
// models (text detection, then recognition), in plain JavaScript so it runs in
// a browser worker and under Node for tests. No DOM, no ONNX here: the engine
// (engine.js) feeds tensors to the models and calls these.
//
// Images are {data: Uint8ClampedArray RGBA, width, height}.
// A detected text line is a rotated rectangle {cx, cy, w, h, angle, th} in
// photo pixels, w along the angle (radians), h across it, th the letters' height.

export const DET_LIMIT = 1600; // longest side the detector sees
// Paddle's own detector exports want BGR with ImageNet mean/std ('paddle');
// some community exports have that baked in and want plain RGB in [0, 1] ('raw').
const NORMS = {
  paddle: { order: [2, 1, 0], mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] },
  raw: { order: [0, 1, 2], mean: [0, 0, 0], std: [1, 1, 1] },
};
const DET_THRESH = 0.3; // a pixel is text above this probability
const BOX_THRESH = 0.55; // a region is kept if its mean probability is above this
const UNCLIP = 1.6; // how far to grow a region (the detector draws them shrunk)
export const REC_HEIGHT = 48;
const REC_MAX_WIDTH = 1600;

/** Bilinear sample of channel c at (x, y); 0 outside the image. */
function sample(img, x, y, c) {
  const { data, width, height } = img;
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return 0;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0, fy = y - y0;
  const i00 = (y0 * width + x0) * 4 + c, i10 = (y0 * width + x1) * 4 + c;
  const i01 = (y1 * width + x0) * 4 + c, i11 = (y1 * width + x1) * 4 + c;
  return (data[i00] * (1 - fx) + data[i10] * fx) * (1 - fy) + (data[i01] * (1 - fx) + data[i11] * fx) * fy;
}

/** The detector's input: the photo scaled to `limit` on its long side, in multiples of 32, as a CHW float tensor. */
export function detInput(img, limit = DET_LIMIT, norm = 'paddle') {
  const { order, mean, std } = NORMS[norm];
  const scale = limit / Math.max(img.width, img.height); // may enlarge: small spine text reads better bigger
  const w = Math.max(32, Math.round((img.width * scale) / 32) * 32);
  const h = Math.max(32, Math.round((img.height * scale) / 32) * 32);
  const sx = img.width / w, sy = img.height / h;
  const out = new Float32Array(3 * w * h);
  const plane = w * h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = (x + 0.5) * sx - 0.5, py = (y + 0.5) * sy - 0.5;
      const i = y * w + x;
      for (let c = 0; c < 3; c++) out[c * plane + i] = (sample(img, px, py, order[c]) / 255 - mean[c]) / std[c];
    }
  }
  return { tensor: out, width: w, height: h, scaleX: sx, scaleY: sy };
}

/** Convex hull of points [[x, y], ...] (Andrew's monotone chain). */
export function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** The smallest rotated rectangle around points: {cx, cy, w, h, angle}, w ≥ h. */
export function minAreaRect(points) {
  const hull = convexHull(points);
  if (hull.length === 1) return { cx: hull[0][0], cy: hull[0][1], w: 1, h: 1, angle: 0 };
  let best = null;
  for (let i = 0; i < hull.length; i++) {
    const [x0, y0] = hull[i], [x1, y1] = hull[(i + 1) % hull.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (!len) continue;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, y] of hull) {
      const u = x * ux + y * uy, v = -x * uy + y * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const area = (maxU - minU) * (maxV - minV);
    if (!best || area < best.area) best = { area, ux, uy, minU, maxU, minV, maxV };
  }
  const { ux, uy, minU, maxU, minV, maxV } = best;
  const cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
  let w = maxU - minU + 1, h = maxV - minV + 1, angle = Math.atan2(uy, ux);
  if (h > w) { [w, h] = [h, w]; angle += Math.PI / 2; }
  // Keep the angle in (-90°, 90°], so w runs left to right (or downwards when vertical).
  while (angle > Math.PI / 2) angle -= Math.PI;
  while (angle <= -Math.PI / 2) angle += Math.PI;
  return { cx: cu * ux - cv * uy, cy: cu * uy + cv * ux, w, h, angle };
}

/**
 * The text lines in the detector's probability map (a Float32Array of
 * width x height), as rotated rectangles in photo pixels, with a score.
 */
export function boxesFromMap(prob, width, height, scaleX, scaleY) {
  const label = new Int32Array(width * height);
  const boxes = [];
  const stack = [];
  let next = 0;
  for (let start = 0; start < prob.length; start++) {
    if (prob[start] <= DET_THRESH || label[start]) continue;
    next++;
    label[start] = next;
    stack.push(start);
    const points = [];
    let sum = 0;
    while (stack.length) {
      const i = stack.pop();
      const x = i % width, y = (i - x) / width;
      points.push([x, y]);
      sum += prob[i];
      if (x > 0 && !label[i - 1] && prob[i - 1] > DET_THRESH) { label[i - 1] = next; stack.push(i - 1); }
      if (x < width - 1 && !label[i + 1] && prob[i + 1] > DET_THRESH) { label[i + 1] = next; stack.push(i + 1); }
      if (y > 0 && !label[i - width] && prob[i - width] > DET_THRESH) { label[i - width] = next; stack.push(i - width); }
      if (y < height - 1 && !label[i + width] && prob[i + width] > DET_THRESH) { label[i + width] = next; stack.push(i + width); }
    }
    if (points.length < 10) continue;
    const score = sum / points.length;
    if (score < BOX_THRESH) continue;
    const r = minAreaRect(points);
    if (r.h < 3) continue;
    // Grow by the detector's shrink margin: area x ratio / perimeter.
    const d = (r.w * r.h * UNCLIP) / (2 * (r.w + r.h));
    const w = r.w + 2 * d, h = r.h + 2 * d;
    // Back to photo pixels (the detector's x and y scales differ slightly).
    const c = Math.cos(r.angle), s = Math.sin(r.angle);
    const wx = w * c * scaleX, wy = w * s * scaleY, hx = -h * s * scaleX, hy = h * c * scaleY;
    boxes.push({
      cx: (r.cx + 0.5) * scaleX, cy: (r.cy + 0.5) * scaleY,
      w: Math.hypot(wx, wy), h: Math.hypot(hx, hy),
      angle: Math.atan2(wy, wx),
      // The letters' own height, before the margin (h is about 2.5 times it).
      th: Math.hypot(-r.h * s * scaleX, r.h * c * scaleY),
      score,
    });
  }
  return boxes;
}

/** The four corners of a rotated rectangle, clockwise from the start of its long side. */
export function corners(b) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  const ux = (c * b.w) / 2, uy = (s * b.w) / 2, vx = (-s * b.h) / 2, vy = (c * b.h) / 2;
  return [
    [b.cx - ux - vx, b.cy - uy - vy],
    [b.cx + ux - vx, b.cy + uy - vy],
    [b.cx + ux + vx, b.cy + uy + vy],
    [b.cx - ux + vx, b.cy - uy + vy],
  ];
}

/** True if a text line runs closer to up-and-down than across. */
export const isVertical = (b) => Math.abs(Math.sin(b.angle)) > Math.SQRT1_2;

/**
 * The ways to read a text line: horizontal lines left to right; vertical ones
 * (book spines) both top to bottom and bottom to top. Each is a unit reading
 * direction {ax, ay}.
 */
export function readingDirections(b) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  if (!isVertical(b)) return c >= 0 ? [{ ax: c, ay: s }] : [{ ax: -c, ay: -s }];
  const down = s >= 0 ? { ax: c, ay: s } : { ax: -c, ay: -s };
  return [down, { ax: -down.ax, ay: -down.ay }];
}

/**
 * The recogniser's input for one text line read in direction {ax, ay}: the
 * line cut out upright, REC_HEIGHT pixels tall, as a BGR CHW float tensor in
 * [-1, 1].
 */
export function recInput(img, b, dir) {
  const len = b.w, thick = b.h;
  const width = Math.max(16, Math.min(REC_MAX_WIDTH, Math.round((REC_HEIGHT * len) / thick)));
  const height = REC_HEIGHT;
  // Image-space "down" for the text is the reading direction turned 90° clockwise.
  const bx = -dir.ay, by = dir.ax;
  const stepX = len / width, stepY = thick / height;
  const out = new Float32Array(3 * width * height);
  const plane = width * height;
  for (let y = 0; y < height; y++) {
    const oy = (y + 0.5) * stepY - thick / 2;
    for (let x = 0; x < width; x++) {
      const ox = (x + 0.5) * stepX - len / 2;
      const px = b.cx + ox * dir.ax + oy * bx - 0.5;
      const py = b.cy + ox * dir.ay + oy * by - 0.5;
      const i = y * width + x;
      out[i] = sample(img, px, py, 2) / 127.5 - 1;
      out[plane + i] = sample(img, px, py, 1) / 127.5 - 1;
      out[2 * plane + i] = sample(img, px, py, 0) / 127.5 - 1;
    }
  }
  return { tensor: out, width, height };
}

/**
 * Greedy CTC decoding of the recogniser's output ([steps, classes] softmax):
 * class 0 is the blank, then the dictionary, then a space.
 * Returns {text, score}, score being the mean confidence of the kept characters.
 */
export function ctcDecode(probs, steps, classes, dict) {
  let text = '', sum = 0, count = 0, last = 0;
  for (let t = 0; t < steps; t++) {
    let best = 0, bestP = -1;
    const row = t * classes;
    for (let k = 0; k < classes; k++) {
      const p = probs[row + k];
      if (p > bestP) { bestP = p; best = k; }
    }
    if (best !== 0 && best !== last) {
      text += best - 1 < dict.length ? dict[best - 1] : ' ';
      sum += bestP;
      count++;
    }
    last = best;
  }
  return { text: text.trim(), score: count ? sum / count : 0 };
}

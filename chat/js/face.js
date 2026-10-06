// Face tracking with MediaPipe Face Landmarker (and, for background effects,
// the selfie segmenter), loaded from a CDN on first use. Everything effects see
// is in output-canvas pixels, already mirrored like a selfie.
//
// face = {
//   pts,                        // 478 landmarks [{x, y, z}] in canvas pixels
//   eyeL, eyeR,                 // eye centres, image-left and image-right ({x, y})
//   eyeMid, nose, mouth, chin, forehead, center,
//   box: {x, y, w, h},          // bounding box of the landmarks
//   scale,                      // distance between the eyes in pixels
//   roll,                       // head tilt in radians (0 = level)
//   mouthOpen, smile, pucker, browUp, frown, cheekPuff,
//   blinkL, blinkR, wink,       // 0..1 expression scores from blendshapes
//   blend,                      // raw blendshape scores by name
// }

const VERSION = '1.0.1';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

// The face template stickers are drawn on (see design/image-requests.md).
export const TEMPLATE = {
  size: 1024,
  eyeL: { x: 392, y: 520 },
  eyeR: { x: 632, y: 520 },
  eyeMid: { x: 512, y: 520 },
  eyeDist: 240,
  nose: { x: 512, y: 640 },
  mouth: { x: 512, y: 740 },
  chin: { x: 512, y: 880 },
  top: { x: 512, y: 220 },
};

let visionPromise = null;
let landmarkerPromise = null;
let segmenterPromise = null;

function vision() {
  visionPromise ??= import(`${CDN}/vision_bundle.mjs`).then(async mod => ({
    mod,
    fileset: await mod.FilesetResolver.forVisionTasks(`${CDN}/wasm`),
  }));
  return visionPromise;
}

async function createWithFallback(create, options) {
  try {
    return await create({ ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' } });
  } catch (e) {
    console.warn('GPU delegate unavailable, using CPU', e);
    return create({ ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } });
  }
}

export function loadLandmarker() {
  landmarkerPromise ??= vision().then(({ mod, fileset }) =>
    createWithFallback(o => mod.FaceLandmarker.createFromOptions(fileset, o), {
      baseOptions: { modelAssetPath: FACE_MODEL },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    }));
  return landmarkerPromise;
}

export function loadSegmenter() {
  segmenterPromise ??= vision().then(({ mod, fileset }) =>
    createWithFallback(o => mod.ImageSegmenter.createFromOptions(fileset, o), {
      baseOptions: { modelAssetPath: SEG_MODEL },
      runningMode: 'VIDEO',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    }));
  return segmenterPromise;
}

const smoothKeys = ['eyeL', 'eyeR', 'nose', 'mouth', 'chin', 'forehead'];

// Turns a landmarker result into a face in canvas pixels. `prev` smooths the
// key points a little so stickers don't jitter.
export function faceFromResult(result, w, h, prev) {
  const lm = result?.faceLandmarks?.[0];
  if (!lm) return null;
  const pts = lm.map(p => ({ x: (1 - p.x) * w, y: p.y * h, z: p.z * w }));
  const blend = {};
  for (const c of result.faceBlendshapes?.[0]?.categories ?? []) blend[c.categoryName] = c.score;
  return buildFace(pts, blend, prev);
}

const avg = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function buildFace(pts, blend = {}, prev = null) {
  // Iris centres are 468 and 473 when present; otherwise eye corners.
  let e1 = pts[468] ?? avg(pts[33], pts[133]);
  let e2 = pts[473] ?? avg(pts[362], pts[263]);
  if (e1.x > e2.x) [e1, e2] = [e2, e1];
  const raw = {
    eyeL: { x: e1.x, y: e1.y },
    eyeR: { x: e2.x, y: e2.y },
    nose: { x: pts[1].x, y: pts[1].y },
    mouth: avg(pts[13], pts[14]),
    chin: { x: pts[152].x, y: pts[152].y },
    forehead: { x: pts[10].x, y: pts[10].y },
  };
  if (prev) {
    const k = 0.55;
    for (const key of smoothKeys) {
      raw[key] = { x: prev[key].x + (raw[key].x - prev[key].x) * k, y: prev[key].y + (raw[key].y - prev[key].y) * k };
    }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const dx = raw.eyeR.x - raw.eyeL.x;
  const dy = raw.eyeR.y - raw.eyeL.y;
  const b = name => blend[name] ?? 0;
  // Blendshapes are named from the person's point of view; with the mirrored
  // image the person's left eye appears on the image left.
  const blinkL = b('eyeBlinkLeft');
  const blinkR = b('eyeBlinkRight');
  return {
    pts,
    ...raw,
    eyeMid: avg(raw.eyeL, raw.eyeR),
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    scale: Math.hypot(dx, dy),
    roll: Math.atan2(dy, dx),
    mouthOpen: b('jawOpen'),
    smile: (b('mouthSmileLeft') + b('mouthSmileRight')) / 2,
    pucker: Math.max(b('mouthPucker'), b('mouthFunnel')),
    browUp: Math.max(b('browInnerUp'), (b('browOuterUpLeft') + b('browOuterUpRight')) / 2),
    frown: Math.max((b('browDownLeft') + b('browDownRight')) / 2, (b('mouthFrownLeft') + b('mouthFrownRight')) / 2),
    cheekPuff: b('cheekPuff'),
    blinkL,
    blinkR,
    wink: Math.abs(blinkL - blinkR) > 0.45 ? Math.max(blinkL, blinkR) : 0,
    blend,
  };
}

// Maps a point in face-template coordinates (1024 x 1024) to canvas pixels.
export function templatePoint(face, tx, ty) {
  const s = face.scale / TEMPLATE.eyeDist;
  const x = (tx - TEMPLATE.eyeMid.x) * s;
  const y = (ty - TEMPLATE.eyeMid.y) * s;
  const c = Math.cos(face.roll), sn = Math.sin(face.roll);
  return { x: face.eyeMid.x + x * c - y * sn, y: face.eyeMid.y + x * sn + y * c };
}

// Runs `draw(ctx)` with the context transformed so that drawing in template
// coordinates lands on the face. Use it for stand-in drawings too.
export function withTemplate(ctx, face, draw) {
  const s = face.scale / TEMPLATE.eyeDist;
  ctx.save();
  ctx.translate(face.eyeMid.x, face.eyeMid.y);
  ctx.rotate(face.roll);
  ctx.scale(s, s);
  ctx.translate(-TEMPLATE.eyeMid.x, -TEMPLATE.eyeMid.y);
  try { draw(ctx); } finally { ctx.restore(); }
}

// Draws a delivered face-template sticker (1024 x 1024) on the face.
export function drawTemplate(ctx, face, img) {
  withTemplate(ctx, face, c => c.drawImage(img, 0, 0, TEMPLATE.size, TEMPLATE.size));
}

// A face for tests and for the effect preview when no camera face is found:
// a head centred in a w x h canvas with eyes `scale` pixels apart.
export function syntheticFace(w, h, { scale = Math.min(w, h) * 0.22, roll = 0, ...expr } = {}) {
  const cx = w / 2, cy = h * 0.45;
  const P = (tx, ty) => {
    const s = scale / TEMPLATE.eyeDist;
    const x = (tx - 512) * s, y = (ty - 520) * s;
    return { x: cx + x * Math.cos(roll) - y * Math.sin(roll), y: cy + x * Math.sin(roll) + y * Math.cos(roll), z: 0 };
  };
  const pts = Array.from({ length: 478 }, (_, i) => {
    const a = (i / 478) * Math.PI * 2;
    return P(512 + Math.cos(a) * 240, 550 + Math.sin(a) * 330);
  });
  pts[468] = P(392, 520);
  pts[473] = P(632, 520);
  pts[1] = P(512, 640);
  pts[13] = P(512, 735);
  pts[14] = P(512, 745 + (expr.mouthOpen ?? 0) * 60);
  pts[152] = P(512, 880);
  pts[10] = P(512, 260);
  const blend = {
    jawOpen: expr.mouthOpen ?? 0,
    mouthSmileLeft: expr.smile ?? 0,
    mouthSmileRight: expr.smile ?? 0,
    mouthPucker: expr.pucker ?? 0,
    browInnerUp: expr.browUp ?? 0,
    browDownLeft: expr.frown ?? 0,
    browDownRight: expr.frown ?? 0,
    cheekPuff: expr.cheekPuff ?? 0,
    eyeBlinkLeft: expr.blinkL ?? 0,
    eyeBlinkRight: expr.blinkR ?? 0,
  };
  return buildFace(pts, blend);
}

// Runs the PaddleOCR models with ONNX Runtime (passed in, so the browser
// worker and the Node tests each bring their own build) over a photo and
// returns its text lines.

import { detInput, boxesFromMap, readingDirections, recInput, ctcDecode, REC_HEIGHT } from './core.js';

export class OcrEngine {
  /** @param ort onnxruntime-web; models {det, rec} as URLs or bytes; dict the recogniser's characters. */
  static async create(ort, models, dict, options = {}) {
    const opts = { executionProviders: options.providers || ['wasm'], graphOptimizationLevel: 'all' };
    const [det, rec] = await Promise.all([
      ort.InferenceSession.create(models.det, opts),
      ort.InferenceSession.create(models.rec, opts),
    ]);
    return new OcrEngine(ort, det, rec, dict, options.detNorm);
  }

  constructor(ort, det, rec, dict, detNorm = 'paddle') {
    this.ort = ort;
    this.detNorm = detNorm;
    this.det = det;
    this.rec = rec;
    this.dict = dict;
  }

  async detect(img, limit) {
    const input = detInput(img, limit, this.detNorm);
    const feeds = { [this.det.inputNames[0]]: new this.ort.Tensor('float32', input.tensor, [1, 3, input.height, input.width]) };
    const out = (await this.det.run(feeds))[this.det.outputNames[0]];
    return boxesFromMap(out.data, input.width, input.height, input.scaleX, input.scaleY);
  }

  async recognise(img, box, dir) {
    const input = recInput(img, box, dir);
    const feeds = { [this.rec.inputNames[0]]: new this.ort.Tensor('float32', input.tensor, [1, 3, REC_HEIGHT, input.width]) };
    const out = (await this.rec.run(feeds))[this.rec.outputNames[0]];
    const [, steps, classes] = out.dims;
    return ctcDecode(out.data, steps, classes, this.dict);
  }

  /**
   * Every text line in the photo: [{text, score, box: {cx, cy, w, h, angle}, vertical}].
   * Spines are read both ways up and the more confident reading kept.
   * onProgress(done, total) reports the recognition step.
   */
  async read(img, { limit, minScore = 0.5, onProgress } = {}) {
    const boxes = await this.detect(img, limit);
    const lines = [];
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      let best = null;
      for (const dir of readingDirections(box)) {
        const r = await this.recognise(img, box, dir);
        if (!best || r.score * Math.min(1, r.text.length / 3) > best.score * Math.min(1, best.text.length / 3)) best = { ...r, dir };
      }
      onProgress?.(i + 1, boxes.length);
      if (best && best.text && best.score >= minScore) {
        lines.push({ text: best.text, score: Math.round(best.score * 1000) / 1000, box, dir: best.dir });
      }
    }
    return lines;
  }
}

/** The recogniser's dictionary file as a list of characters. */
export function parseDict(text) {
  return text.split(/\r?\n/).filter((line, i, all) => line.length || i < all.length - 1);
}

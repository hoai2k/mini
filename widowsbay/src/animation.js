// Shared sprite-sheet timing. Beat cycles use their musical period rather
// than assuming a stored frame count implies the capture frame rate.
export function validAnimation(meta, image = null) {
  if (!meta || !['loop', 'pingpong', 'once'].includes(meta.loop || 'loop')) return false;
  for (const key of ['frameW', 'frameH', 'frames', 'cols']) {
    if (!Number.isInteger(meta[key]) || meta[key] <= 0) return false;
  }
  if (!Number.isFinite(meta.fps) || meta.fps <= 0) return false;
  if (meta.beats != null && (!Number.isFinite(meta.beats) || meta.beats <= 0 || !Number.isFinite(meta.bpm ?? 76.5) || (meta.bpm ?? 76.5) <= 0)) return false;
  if (meta.duration != null && (!Number.isFinite(meta.duration) || meta.duration <= 0)) return false;
  if (image) {
    const w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
    if (w < meta.cols * meta.frameW || h < Math.ceil(meta.frames / meta.cols) * meta.frameH) return false;
  }
  return true;
}

export function animationDuration(meta) {
  if (meta.beats != null) return meta.beats * 60 / (meta.bpm ?? 76.5);
  if (meta.duration != null) return meta.duration;
  const count = meta.loop === 'pingpong' && meta.frames > 1 ? 2 * meta.frames - 2 : meta.frames;
  return count / meta.fps;
}

export function animationFrame(meta, seconds) {
  if (!validAnimation(meta) || !Number.isFinite(seconds)) return null;
  const time = Math.max(0, seconds), duration = animationDuration(meta);
  let frame;
  if (meta.loop === 'once') frame = Math.min(meta.frames - 1, Math.floor(time / duration * meta.frames));
  else {
    const cycle = meta.loop === 'pingpong' && meta.frames > 1 ? 2 * meta.frames - 2 : meta.frames;
    let fraction = time / duration - Math.floor(time / duration);
    if (fraction > 1 - 1e-10) fraction = 0;
    let step = Math.min(cycle - 1, Math.floor(fraction * cycle + 1e-9));
    if (meta.loop === 'pingpong' && step >= meta.frames) step = cycle - step;
    frame = step;
  }
  return { index: frame, sx: frame % meta.cols * meta.frameW, sy: Math.floor(frame / meta.cols) * meta.frameH, sw: meta.frameW, sh: meta.frameH };
}

// Old-film idle for the people: the delivered still is frame A and its two
// generated variants (<id>-idle-b, <id>-idle-c) are flicked A, B, A, C, one
// frame per `step` seconds (half a beat by default), like a figure in a
// hand-cranked film. `has(id)` says whether a frame is delivered; with
// neither variant the still stands alone.
export const IDLE_STEP = 30 / 76.5;
export function idleFrameId(id, time, has, step = IDLE_STEP) {
  const b = has(id + '-idle-b') ? id + '-idle-b' : null, c = has(id + '-idle-c') ? id + '-idle-c' : null;
  if ((!b && !c) || !Number.isFinite(time) || !(step > 0)) return id;
  const seq = [id, b || c, id, c || b];
  return seq[((Math.floor(time / step) % 4) + 4) % 4];
}

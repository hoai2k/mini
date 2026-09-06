/** Hand-painted cel animation. x/y is the gameplay foot anchor, time and timers in seconds. */
export interface HopperRenderState {
  facing: number;
  vx: number;
  vy: number;
  grounded: boolean;
  kickT?: number;
  launchT?: number;
  landT?: number;
  invuln?: number;
  gravitySign?: number;
  shooting?: boolean;
  reducedMotion?: boolean;
  landingDistance?: number;
}
export type HopperImages =
  | Record<string, CanvasImageSource>
  | CanvasImageSource;
const FRAMES = [
  'run0',
  'run1',
  'run2',
  'run3',
  'crouch',
  'launch',
  'rise',
  'fall',
  'kick0',
  'kick1',
  'kick2',
  'kick3',
];
const cache = new WeakMap<object, { time: number; phase: number }>();
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export function getHopperPose(s: HopperRenderState, time: number) {
  let entry = cache.get(s);
  if (!entry) {
    entry = { time, phase: 0 };
    cache.set(s, entry);
  }
  const dt = clamp(time - entry.time, 0, 0.05);
  entry.time = time;
  const speed = Math.abs(s.vx);
  if (s.grounded && speed > 15) entry.phase += dt * clamp(speed / 34, 7, 16);
  let index = 0,
    squash = 1,
    lean = 0;
  const kick = clamp(s.kickT || 0, 0, 0.5);
  if (kick > 0) {
    const p = 1 - kick / 0.5;
    index = p < 0.15 ? 8 : p < 0.38 ? 9 : p < 0.72 ? 10 : 11;
    lean = Math.sin(p * Math.PI) * -0.055;
  } else if ((s.launchT || 0) > 0) {
    index = 5;
    squash = 1.035;
  } else if (!s.grounded) {
    const localVy = s.vy * (s.gravitySign || 1);
    const distance = s.landingDistance ?? Infinity;
    const closeToLanding =
      Number.isFinite(distance) && distance >= 0 && distance < 80;
    index = localVy > 0 && closeToLanding ? 7 : 6;
    lean = clamp(localVy / 6000, -0.05, 0.055);
  } else if ((s.landT || 0) > 0) {
    index = 4;
    const p = 1 - clamp((s.landT || 0) / 0.18, 0, 1);
    squash = 1 - Math.sin(p * Math.PI) * 0.045;
  } else if (speed > 15) {
    index = Math.floor(entry.phase) % 4;
  }
  const moving = s.grounded && speed > 15 && kick <= 0 && (s.landT || 0) <= 0;
  const bob = s.reducedMotion
    ? 0
    : moving
      ? Math.sin(entry.phase * Math.PI) * 0.006
      : Math.sin(time * 2.6) * 0.0018;
  if (s.reducedMotion) {
    squash = 1;
    lean = 0;
  }
  return { index, name: FRAMES[index], squash, lean, bob, phase: entry.phase };
}
export function drawHopper(
  ctx: CanvasRenderingContext2D,
  images: HopperImages,
  s: HopperRenderState,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
) {
  const source = ((images as Record<string, CanvasImageSource>).hopperAtlas ||
    (images as Record<string, CanvasImageSource>)['hopper-atlas'] ||
    (images as Record<string, CanvasImageSource>)['hopper-atlas.png'] ||
    images) as CanvasImageSource;
  const p = getHopperPose(s, time),
    facing = s.facing < 0 ? -1 : 1,
    gravity = s.gravitySign === -1 ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, gravity);
  ctx.translate(0, -h * 0.34);
  ctx.rotate(p.lean);
  ctx.scale(2 - p.squash, p.squash);
  ctx.translate(0, h * 0.34 + h * p.bob);
  if ((s.invuln || 0) > 0)
    ctx.globalAlpha = Math.sin(time * 45) > 0 ? 0.52 : 0.95;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    source,
    (p.index % 4) * 512,
    Math.floor(p.index / 4) * 512,
    512,
    512,
    -w / 2,
    (-h * 470) / 512,
    w,
    h,
  );
  ctx.restore();
  return p;
}
/** Matches art's red eye, for muzzle particles; use a gameplay beam origin independent of feet. */
export function hopperEye(
  s: HopperRenderState,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
) {
  const p = getHopperPose(s, time);
  const f = s.facing < 0 ? -1 : 1,
    g = s.gravitySign === -1 ? -1 : 1;
  const eyeY = [
    254, 264.5, 256.5, 256.5, 285.68, 245.75, 237.5, 267.5, 254.11, 247.94,
    261.25, 264.52,
  ][p.index];
  const lx = ((w * (415 - 256)) / 512) * (2 - p.squash),
    ly = ((h * (eyeY - 470)) / 512 + h * 0.34 + h * p.bob) * p.squash;
  const rx = lx * Math.cos(p.lean) - ly * Math.sin(p.lean),
    ry = lx * Math.sin(p.lean) + ly * Math.cos(p.lean) - h * 0.34;
  return { x: x + f * rx, y: y + g * ry };
}
export const HOPPER_ANIMATION = {
  frameWidth: 512,
  frameHeight: 512,
  columns: 4,
  rows: 3,
  kickDuration: 0.5,
  launchDuration: 0.2,
  landDuration: 0.18,
  footAnchor: { x: 0.5, y: 470 / 512 },
};

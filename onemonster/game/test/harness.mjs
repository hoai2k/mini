// A headless stand-in for the browser: a canvas context that accepts every
// call, and an env for chapters. Images never load, so the art draws its
// stand-ins; nothing here depends on the delivered art.
export function stubContext() {
  const handler = {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop() {} });
      if (prop === 'measureText') return (s) => ({ width: String(s).length * 10 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => {};
    },
    set(target, prop, v) { target[prop] = v; return true; },
  };
  return new Proxy({ canvas: { width: 1920, height: 1080 }, globalAlpha: 1 }, handler);
}

globalThis.Image = class { set src(v) { queueMicrotask(() => this.onerror?.()); } };

export function makeEnv({ versus = false, gentle = [false, false], skill = 0.5, seed = 1 } = {}) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { W: 1920, H: 1080, rng, sfx() {}, vibrate() {}, reduceMotion: false, versus, gentle, skill };
}

export const idle = { x: 0, y: 0, action: false, actionPressed: false, actionReleased: false, sprint: false };

// Random but sticky input, like a child bashing the controller.
export function masher(rng) {
  let x = 0, y = 0, hold = 0, sprint = false, action = false;
  return () => {
    hold -= 1;
    if (hold <= 0) {
      hold = 5 + Math.floor(rng() * 30);
      x = Math.round(rng() * 2 - 1);
      y = Math.round(rng() * 2 - 1);
      sprint = rng() < 0.3;
    }
    const was = action;
    action = rng() < 0.25 ? !action : action;
    return { x, y, sprint, action, actionPressed: action && !was, actionReleased: !action && was };
  };
}

// Nested photographic plates share one logarithmic zoom. A child already fills
// the view before it becomes the root, so dropping its parent cannot make a cut.
import { TITLE_ZOOM, titleZoomLayout } from './title-zoom.js';

export function createTitleBg(canvas, { images = [], reduced = false } = {}) {
  const g = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, running = false, t = 0, last = 0, raf = 0;
  let plates = [];
  const prepared = new WeakMap();

  function prepare(img) {
    if (prepared.has(img)) return prepared.get(img);
    const size = Math.min(1536, img.naturalWidth || img.width, img.naturalHeight || img.height);
    const plate = document.createElement('canvas');
    plate.width = plate.height = size;
    const ctx = plate.getContext('2d');
    const k = size / Math.min(img.width, img.height);
    ctx.drawImage(img, (size - img.width * k) / 2, (size - img.height * k) / 2, img.width * k, img.height * k);
    // Runtime compositing leaves the delivered source images intact.
    ctx.globalCompositeOperation = 'destination-in';
    const mask = ctx.createRadialGradient(size / 2, size / 2, size * TITLE_ZOOM.core / 2, size / 2, size / 2, size / 2);
    mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mask; ctx.fillRect(0, 0, size, size);
    prepared.set(img, plate);
    return plate;
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth || innerWidth; h = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    if (running) draw();
  }
  addEventListener('resize', resize);

  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = '#0a120d'; g.fillRect(0, 0, w, h);
    if (!plates.length) return;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const layout = titleZoomLayout(t, plates.length, w, h);
    for (const layer of layout.layers) {
      const r = layer.radius;
      g.drawImage(plates[layer.index], layer.x - r, layer.y - r, r * 2, r * 2);
    }
    // A fixed scrim is identical at both ends of the loop.
    const wash = g.createRadialGradient(w / 2, h * TITLE_ZOOM.focusY, Math.min(w, h) * 0.08, w / 2, h * TITLE_ZOOM.focusY, Math.hypot(w, h) * 0.65);
    wash.addColorStop(0, 'rgba(8,14,10,.12)'); wash.addColorStop(1, 'rgba(8,14,10,.58)');
    g.fillStyle = wash; g.fillRect(0, 0, w, h);
  }

  function frame(now) {
    if (!running || reduced) return;
    if (plates.length) { t += Math.min(0.05, (now - last) / 1000 || 0); draw(); }
    last = now;
    raf = requestAnimationFrame(frame);
  }

  plates = images.map(prepare);
  resize();
  return {
    start() {
      if (running) return;
      running = true; canvas.hidden = false; last = performance.now(); resize();
      if (!reduced) raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); canvas.hidden = true; },
    setImages(imgs) {
      const firstLoad = !plates.length;
      plates = imgs.map(prepare);
      if (firstLoad) t = 0;
      last = performance.now();
      if (running) draw();
    },
    seek(sec) { t = sec; draw(); },
    state() { return { ...titleZoomLayout(t, plates.length, w, h), time: t, running, reduced }; },
  };
}

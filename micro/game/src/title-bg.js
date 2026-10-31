// The title's moving background until the MP-G02 key art is delivered: a slow,
// endless zoom through the seven worlds, each a round field of view nested in
// the centre of the last, like stepping through a microscope's objectives.
// With the key art delivered, the art drifts slowly instead.

export function createTitleBg(canvas, { images, keyArt = null, reduced = false }) {
  const g = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, running = false, t = 0, last = 0, raf = 0;
  const STEP = Math.log(3.4); // each world's field is 3.4× smaller than the last
  const SPEED = reduced ? 0.012 : 0.07; // log units per second

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  addEventListener('resize', resize);

  function cover(img, cx, cy, r, rot) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    if (img) {
      const s = (2 * r) / Math.min(img.width, img.height);
      g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
    }
    g.restore();
  }

  function ring(cx, cy, r, alpha) {
    // A brass objective rim around each nested field.
    g.save();
    g.globalAlpha = alpha;
    g.lineWidth = Math.max(1, r * 0.05);
    const grd = g.createLinearGradient(cx, cy - r, cx, cy + r);
    grd.addColorStop(0, '#f2d48d'); grd.addColorStop(0.45, '#9c7631'); grd.addColorStop(1, '#e0bb6a');
    g.strokeStyle = grd;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = Math.max(0.5, r * 0.012);
    g.strokeStyle = 'rgba(20,14,4,.8)';
    g.beginPath(); g.arc(cx, cy, r * 1.03, 0, Math.PI * 2); g.stroke();
    // engraved ticks
    g.strokeStyle = 'rgba(242,212,141,.55)';
    g.lineWidth = Math.max(0.5, r * 0.006);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r0 = r * 1.05, r1 = r * (i % 5 ? 1.08 : 1.12);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
    }
    g.restore();
  }

  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0a120d';
    g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.46;
    if (keyArt) {
      const s = 1.08 + 0.04 * Math.sin(t * 0.05);
      const k = Math.max(w / keyArt.width, h / keyArt.height) * s;
      g.drawImage(keyArt, cx - keyArt.width * k / 2, h / 2 - keyArt.height * k / 2, keyArt.width * k, keyArt.height * k);
      return;
    }
    if (!images.length) return; // final art is still loading; never draw empty objective rings
    const base = Math.hypot(w, h) * 0.62;
    const f = (t * SPEED) / STEP;
    const i0 = Math.floor(f), frac = f - i0;
    const n = images.length;
    for (let m = 0; m < 7; m++) {
      const r = base * Math.exp((frac - m) * STEP) * (m === 0 ? 1.0 : 1);
      if (r < 3) break;
      const idx = (((i0 + m) % n) + n) % n;
      const rot = (i0 + m) * 0.9 + t * 0.01 * (m % 2 ? 1 : -1);
      g.save();
      if (m > 0) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip(); }
      cover(images[idx], cx, cy, Math.max(r, m === 0 ? base : r), rot);
      // The inner field brightens like the light coming through a stop.
      const vg = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = vg;
      g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      g.restore();
      if (m > 0) ring(cx, cy, r, Math.min(1, r / 40));
    }
    // A soft defocus vignette and an ink wash so the type reads.
    const wash = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.1, cx, cy, Math.hypot(w, h) * 0.6);
    wash.addColorStop(0, 'rgba(8,14,10,.25)'); wash.addColorStop(1, 'rgba(8,14,10,.82)');
    g.fillStyle = wash;
    g.fillRect(0, 0, w, h);
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    t += dt;
    draw();
    raf = requestAnimationFrame(frame);
  }

  resize();
  return {
    start() { if (running) return; running = true; canvas.hidden = false; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); canvas.hidden = true; },
    setKeyArt(img) { keyArt = img; if (running) draw(); },
    setImages(imgs) { images = imgs; if (running) draw(); },
    /** For tests and screenshots: jump the zoom to a time. */
    seek(sec) { t = sec; draw(); },
  };
}

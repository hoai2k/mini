// Stop Motion: the picture is held for a fraction of a second, like old
// film, with grain, sprocket holes and a sepia tint.

const STEPS = [0.18, 0.35];

function makeGrain() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const d = c.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 40;
  }
  c.putImageData(d, 0, 0);
  return cv;
}

export default {
  id: 'strobe',
  name: 'Stop Motion',
  emoji: '🎞️',
  hint: 'Life at 6 frames a second',
  needs: {},

  start(s) {
    s.held = document.createElement('canvas');
    s.grain = makeGrain();
    s.step = 0;
    s.timer = 99;
  },

  draw(ctx, f) {
    const s = f.state;
    const held = s.held || (s.held = document.createElement('canvas'));
    s.grain ||= makeGrain();
    if (f.input.pressed) s.step = 1 - (s.step || 0);
    s.timer = (s.timer ?? 99) + f.dt;
    if (held.width !== f.w || held.height !== f.h) {
      held.width = f.w;
      held.height = f.h;
      s.timer = 99;
    }
    if (s.timer >= STEPS[s.step || 0]) {
      s.timer = 0;
      const c = held.getContext('2d');
      c.drawImage(f.camera(), 0, 0);
    }
    ctx.drawImage(held, 0, 0);
    // Slight sepia.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(214,170,110,0.55)';
    ctx.fillRect(0, 0, f.w, f.h);
    ctx.restore();
    // Film grain, jumping around each frame.
    ctx.save();
    ctx.globalAlpha = 0.8;
    const ox = -Math.floor(Math.random() * 128), oy = -Math.floor(Math.random() * 128);
    for (let x = ox; x < f.w; x += 128) {
      for (let y = oy; y < f.h; y += 128) ctx.drawImage(s.grain, x, y);
    }
    ctx.restore();
    // Sprocket border: dark strips with rounded holes.
    const strip = Math.max(14, f.w * 0.035);
    ctx.fillStyle = 'rgba(20,12,6,0.45)';
    ctx.fillRect(0, 0, strip, f.h);
    ctx.fillRect(f.w - strip, 0, strip, f.h);
    ctx.fillStyle = 'rgba(255,240,210,0.4)';
    const hole = strip * 0.5, gap = strip * 1.5;
    const shift = (performance.now() / 40) % gap;
    for (let y = -gap + shift; y < f.h; y += gap) {
      for (const x of [strip * 0.25, f.w - strip * 0.75]) {
        ctx.beginPath();
        ctx.roundRect(x, y, hole, hole * 1.2, 3);
        ctx.fill();
      }
    }
  },
};

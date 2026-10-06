// Comic Book: a toon look with ink outlines and halftone dots. Open your
// mouth and a POW! bursts out beside your head.

const WORDS = ['POW!', 'WOW!', 'ZAP!', 'BAM!'];
const COOLDOWN = 1.2; // seconds between bursts
const LIFE = 1.0;     // seconds a burst stays

// A jagged star path centred on 0,0 with `n` points.
function starPath(c, rOut, rIn, n, wob) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 ? rIn : rOut) * (1 + Math.sin(i * 12.9 + wob) * 0.08);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.closePath();
}

function drawBurst(ctx, b, x, y, size, age) {
  const k = age / LIFE;
  // Scale in with overshoot, fade out at the end.
  const t = Math.min(1, k / 0.2) - 1;
  const grow = 1 + 3.5 * t * t * t + 2.5 * t * t;
  const alpha = k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(b.rot);
  ctx.scale(grow, grow);
  starPath(ctx, size, size * 0.62, 11, b.seed);
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.05;
  ctx.fillStyle = '#ffe135';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = '#e8262d';
  ctx.stroke();
  // Inner glossy ring.
  starPath(ctx, size * 0.8, size * 0.5, 11, b.seed);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();
  ctx.font = `900 ${Math.round(size * 0.52)}px Impact, "Arial Black", ui-rounded, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.rotate(-0.08);
  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = '#fff';
  ctx.strokeText(b.word, 0, size * 0.03);
  ctx.fillStyle = '#111';
  ctx.fillText(b.word, 0, size * 0.03);
  ctx.restore();
}

export default {
  id: 'comic',
  name: 'Comic Book',
  emoji: '💥',
  hint: 'Open your mouth for a POW!',
  needs: { face: true },
  shader: `
float lum(vec2 uv) { return dot(cam(uv).rgb, vec3(0.299, 0.587, 0.114)); }

vec4 effect(vec2 uv) {
  vec3 col = cam(uv).rgb;
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  // Four luminance bands, hue kept by rescaling the colour.
  float band = floor(l * 4.0 - 0.0001) / 3.0;
  band = clamp(band, 0.0, 1.0);
  float lv = 0.18 + 0.82 * band;
  vec3 toon = col / max(l, 0.04) * lv;
  toon = mix(vec3(lv), toon, 0.85);
  toon = clamp(toon, 0.0, 1.0);
  // Halftone dots in the darker bands.
  vec2 px = toPx(uv);
  vec2 g = mod(px, 7.0) - 3.5;
  float dotR = (1.0 - l) * 3.6;
  float dots = 1.0 - smoothstep(dotR - 0.6, dotR + 0.6, length(g));
  if (l < 0.5) toon *= 1.0 - 0.45 * dots * step(l, 0.5);
  // Sobel edges on luminance with 1.5 px offsets.
  vec2 o = 1.5 / u_res;
  float tl = lum(uv + vec2(-o.x, -o.y)), t = lum(uv + vec2(0.0, -o.y)), tr = lum(uv + vec2(o.x, -o.y));
  float ml = lum(uv + vec2(-o.x, 0.0)), mr = lum(uv + vec2(o.x, 0.0));
  float bl = lum(uv + vec2(-o.x, o.y)), b = lum(uv + vec2(0.0, o.y)), br = lum(uv + vec2(o.x, o.y));
  float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = smoothstep(0.25, 0.5, length(vec2(gx, gy)));
  return vec4(mix(toon, vec3(0.05, 0.04, 0.08), edge), 1.0);
}`,

  start(s) {
    s.bursts = [];
    s.cool = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    s.cool -= f.dt;
    const face = f.face;
    const trigger = (face && face.mouthOpen > 0.5) || f.input.pressed;
    if (trigger && s.cool <= 0) {
      s.cool = COOLDOWN;
      const side = face && face.center.x > f.w * 0.55 ? -1 : 1;
      s.bursts.push({
        word: WORDS[Math.floor(Math.random() * WORDS.length)],
        age: 0,
        side: Math.random() < 0.2 ? -side : side,
        rot: (Math.random() - 0.5) * 0.4,
        seed: Math.random() * 10,
      });
      f.sfx('bang');
    }
    s.bursts = s.bursts.filter(b => {
      b.age += f.dt;
      if (b.age >= LIFE) return false;
      const size = face ? face.scale * 1.15 : f.w * 0.2;
      const cx = face ? face.center.x : f.w / 2;
      const cy = face ? face.center.y : f.h / 2;
      const reach = face ? face.box.w * 0.5 + size * 0.75 : f.w * 0.3;
      let x = cx + b.side * reach;
      x = Math.max(size, Math.min(f.w - size, x));
      const y = Math.max(size * 0.9, cy - (face ? face.box.h * 0.2 : 0));
      drawBurst(ctx, b, x, y, size, b.age);
      return true;
    });
  },
};

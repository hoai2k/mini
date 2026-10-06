// VHS: an old tape with tracking glitches, scanlines, a PLAY label and a running clock.

const pad = n => String(Math.floor(n)).padStart(2, '0');

export default {
  id: 'vhs',
  name: 'VHS',
  emoji: '📼',
  hint: 'Be kind, rewind',
  needs: {},
  shader: `
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec4 effect(vec2 uv) {
  float line = floor(uv.y * u_res.y / 2.0);
  // Per-line wobble, plus a tracking band that rolls up the picture.
  float shift = (hash(vec2(line, floor(u_time * 20.0))) - 0.5) * 0.0025;
  float band = fract(u_time * 0.18);
  float inBand = 1.0 - smoothstep(0.0, 0.07, abs(uv.y - band));
  float inBand2 = 1.0 - smoothstep(0.0, 0.03, abs(uv.y - fract(band * 1.7 + 0.4)));
  float jit = inBand * (0.03 * sin(uv.y * 90.0 + u_time * 40.0) + 0.02) + inBand2 * 0.012;
  vec2 q = vec2(uv.x + shift + jit, uv.y);
  // Chromatic aberration.
  float ca = 0.004 + 0.012 * inBand;
  vec3 c = vec3(cam(q + vec2(ca, 0.0)).r, cam(q).g, cam(q - vec2(ca, 0.0)).b);
  // Washed colour, lifted blacks, slight blur from smearing sideways.
  c = (c + cam(q + vec2(0.004, 0.0)).rgb * 0.5) / 1.5;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.7);
  c = c * 0.88 + 0.07;
  c *= vec3(0.98, 1.0, 1.04);
  // Scanlines.
  c *= 0.9 + 0.1 * sin(uv.y * u_res.y * 3.14159);
  // Noise, heavier in the tracking band.
  float n = hash(vec2(floor(uv.x * u_res.x / 2.0), line + floor(u_time * 30.0) * 17.0));
  c += (n - 0.5) * (0.1 + 0.35 * inBand);
  // Bright noise streak at the bottom edge.
  float bot = smoothstep(0.95, 1.0, uv.y);
  c = mix(c, vec3(n), bot * 0.6);
  return vec4(clamp(c, 0.0, 1.0), 1.0);
}`,

  draw(ctx, f) {
    const { w, h, t } = f;
    const size = Math.round(Math.min(w, h) * 0.075);
    ctx.save();
    ctx.font = `bold ${size}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(160, 200, 255, 0.9)';
    ctx.shadowBlur = size * 0.35;
    const m = size * 0.7;
    ctx.textAlign = 'left';
    ctx.fillText('PLAY ▶', m, m);
    // Running timestamp, with a blinking colon-free dot-matrix feel.
    const secs = t % 86400;
    const stamp = `${pad(secs / 3600)}:${pad((secs / 60) % 60)}:${pad(secs % 60)}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font = `bold ${Math.round(size * 0.8)}px "Courier New", Courier, monospace`;
    ctx.fillText(stamp, w - m, h - m);
    ctx.restore();
  },
};

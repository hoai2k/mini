// Kaleidoscope: an 8-fold mirror around the face (or the middle) that slowly turns.

export default {
  id: 'kaleidoscope',
  name: 'Kaleidoscope',
  emoji: '🔮',
  hint: 'Trippy!',
  needs: { face: true },
  shader: `
vec2 mirrorRepeat(vec2 x) { return 1.0 - abs(1.0 - mod(x, 2.0)); }

vec4 effect(vec2 uv) {
  vec2 c = u_hasFace > 0.5 ? u_center : u_res * 0.5;
  vec2 d = toPx(uv) - c;
  float r = length(d);
  float a = atan(d.y, d.x);
  float seg = 6.2831853 / 8.0;
  a = mod(a + u_time * 0.15, seg);
  a = abs(a - seg * 0.5);                  // mirror inside each wedge
  float sa = a + u_time * 0.3;             // the sampled slice turns
  vec2 src = c + r * vec2(cos(sa), sin(sa));
  return cam(mirrorRepeat(toUv(src)));
}`,
};

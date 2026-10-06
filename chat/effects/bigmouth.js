// Big Mouth: the mouth balloons, and keeps growing the wider you open.

export default {
  id: 'bigmouth',
  name: 'Big Mouth',
  emoji: '👄',
  hint: 'Open wide!',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  float o = clamp(u_mouthOpen, 0.0, 1.0);
  p = bulge(p, u_mouth, (1.3 + 0.8 * o) * u_scale, 0.85 + 0.1 * o);
  p = bulge(p, u_mouth, (0.8 + 0.5 * o) * u_scale, 0.6);
  return cam(toUv(p));
}`,
};

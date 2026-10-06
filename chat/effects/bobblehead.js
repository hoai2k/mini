// Bobblehead: the whole head is magnified and wobbles on a spring.

export default {
  id: 'bobblehead',
  name: 'Bobblehead',
  emoji: '🎎',
  hint: 'Nod your head',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  float r = 0.95 * max(u_faceSize.x, u_faceSize.y);
  // A decaying-looking spring: two sines of different speed.
  float bob = sin(u_time * 5.0) * 0.7 + sin(u_time * 8.3 + 1.0) * 0.3;
  float sway = sin(u_time * 3.1) * 0.6 + sin(u_time * 6.7) * 0.4;
  vec2 c = u_center + vec2(sway * 0.06 * r, bob * 0.09 * r);
  p = bulge(p, c, r, 0.45);
  return cam(toUv(p));
}`,
};

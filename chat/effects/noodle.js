// Noodle Face: a funhouse mirror stretches the face tall and thin.

export default {
  id: 'noodle',
  name: 'Noodle Face',
  emoji: '🫠',
  hint: 'Funhouse mirror',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  vec2 d = p - u_center;
  vec2 rad = vec2(u_faceSize.x * 0.95, u_faceSize.y * 1.15);
  float e = length(d / rad);
  float k = 1.0 - smoothstep(0.0, 1.0, e);
  float amt = 0.3 + 0.1 * sin(u_time * 1.3);
  // Sampling closer to the centre vertically makes the face taller.
  p.y = u_center.y + d.y * (1.0 - amt * k);
  p.x = u_center.x + d.x * (1.0 + 0.12 * k);
  return cam(toUv(p));
}`,
};

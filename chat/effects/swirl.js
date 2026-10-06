// Swirl: the face is twirled one way, then the other.

export default {
  id: 'swirl',
  name: 'Swirl',
  emoji: '🌀',
  hint: 'Get dizzy',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  vec2 d = p - u_center;
  float r = 1.3 * u_faceSize.y;
  float dist = length(d);
  if (dist < r) {
    float k = 1.0 - dist / r;
    float a = 2.4 * sin(u_time * 1.5708) * k * k;
    float c = cos(a), s = sin(a);
    d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
    p = u_center + d;
  }
  return cam(toUv(p));
}`,
};

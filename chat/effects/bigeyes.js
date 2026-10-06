// Big Eyes: both eyes swell like an anime character's.

export default {
  id: 'bigeyes',
  name: 'Big Eyes',
  emoji: '👀',
  hint: 'Anime eyes',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  float r = 0.6 * u_scale;
  p = bulge(p, u_eyeL, r, 0.5);
  p = bulge(p, u_eyeR, r, 0.5);
  return cam(toUv(p));
}`,
};

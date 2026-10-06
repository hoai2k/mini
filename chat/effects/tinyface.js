// Tiny Face: the eyes, nose and mouth shrink into the middle of a big head.

export default {
  id: 'tinyface',
  name: 'Tiny Face',
  emoji: '🤏',
  hint: 'Tiny features, big head',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  // Centre of the features, a little below the eyes, so the whole inner face collapses.
  vec2 c = mix(u_nose, (u_eyeL + u_eyeR) * 0.5, 0.3);
  p = bulge(p, c, 1.35 * u_scale, -1.7);
  p = bulge(p, c, 1.0 * u_scale, -1.5);
  return cam(toUv(p));
}`,
};

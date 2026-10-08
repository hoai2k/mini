// Fatter: stretches you sideways around the middle of your face, from head
// to toe, so you look wider. Works without a face too (the middle of the
// picture).

export default {
  id: 'fatter',
  name: 'Fatter',
  emoji: '🍩',
  hint: 'Bulk up',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  vec2 px = toPx(uv);
  float cx = u_hasFace > 0.5 ? u_center.x : u_res.x * 0.5;
  float w = u_hasFace > 0.5 ? u_scale * 3.0 : u_res.x * 0.3;
  float d = px.x - cx;
  // Drawn from nearer the middle near the middle: a smooth stretch.
  px.x = cx + d * (1.0 - 0.32 * exp(-(d * d) / (w * w)));
  return cam(toUv(px));
}`,
};

// Huge Features: the eyes and mouth are cut out and pasted back enormous,
// so they stick out past the sides of your head.

export default {
  id: 'hugefeatures',
  name: 'Huge Features',
  emoji: '🤪',
  hint: 'Blink, grin, open wide!',
  needs: { face: true },
  shader: `
// Pastes the patch around src, w x h (half sizes, in the face's own frame),
// scaled up s times and centred on dst, with a soft shadowed edge.
vec3 paste(vec3 c, vec2 px, vec2 dst, vec2 src, float w, float h, float s, vec2 ex, vec2 dn) {
  vec2 d = px - dst;
  float r = length(vec2(dot(d, ex) / (w * s), dot(d, dn) / (h * s)));
  c *= 1.0 - 0.3 * (1.0 - smoothstep(0.97, 1.06, r));
  float k = 1.0 - smoothstep(0.93, 1.0, r);
  vec3 f = cam(toUv(src + d / s)).rgb;
  return mix(c, f, k);
}

vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);
  vec2 mid = (u_eyeL + u_eyeR) * 0.5;
  vec2 dn = u_mouth - mid;
  dn = normalize(dn - ex * dot(dn, ex));
  float S = u_scale;
  float o = clamp(u_mouthOpen, 0.0, 1.0);
  vec3 c = cam(uv).rgb;
  c = paste(c, px, u_mouth + dn * 0.3 * S, u_mouth, 0.5 * S, (0.2 + 0.24 * o) * S, 2.7, ex, dn);
  c = paste(c, px, mid - ex * 0.92 * S - dn * 0.12 * S, u_eyeL, 0.34 * S, 0.21 * S, 2.6, ex, dn);
  c = paste(c, px, mid + ex * 0.92 * S - dn * 0.12 * S, u_eyeR, 0.34 * S, 0.21 * S, 2.6, ex, dn);
  return vec4(c, 1.0);
}`,
};

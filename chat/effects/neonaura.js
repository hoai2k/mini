// Neon Aura: a dark room, you as a silhouette with a glowing neon outline.

export default {
  id: 'neonaura',
  name: 'Neon Aura',
  emoji: '💜',
  hint: 'Glow in the dark',
  needs: { segmentation: true },

  shader: `
vec4 effect(vec2 uv) {
  vec3 c = cam(uv).rgb;
  float m = smoothstep(0.35, 0.65, personMask(uv));
  // Distance-like glow: how much of the mask lies within rings around here.
  float acc = 0.0;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5235988;
    vec2 d = vec2(cos(a), sin(a));
    acc += personMask(uv + d * 5.0 / u_res);
    acc += personMask(uv + d * 12.0 / u_res);
    acc += personMask(uv + d * 22.0 / u_res);
  }
  acc /= 36.0;
  float edge = clamp(1.0 - abs(acc - 0.5) * 2.0, 0.0, 1.0);
  float line = pow(edge, 3.0);
  float halo = (1.0 - m) * smoothstep(0.0, 0.5, acc) * 0.8 + line * 0.5;
  // Colour travels pink to cyan around the outline over time.
  float k = 0.5 + 0.5 * sin(u_time * 1.6 + uv.y * 5.0 + uv.x * 3.0);
  vec3 neon = mix(vec3(1.0, 0.15, 0.7), vec3(0.1, 0.9, 1.0), k);
  vec3 dark = vec3(0.02, 0.01, 0.05);
  vec3 sil = dark + c * 0.07;
  vec3 col = mix(dark, sil, m);
  col += neon * (halo * 0.9 + line * 1.2);
  return vec4(col, 1.0);
}`,
};

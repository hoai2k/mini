// Blur: the room goes soft and dreamy behind a sharp you.

export default {
  id: 'blurbg',
  name: 'Blur',
  emoji: '🌫️',
  hint: 'Your room goes soft and dreamy',
  needs: { segmentation: true },

  shader: `
vec3 blurCam(vec2 uv) {
  vec3 sum = cam(uv).rgb * 2.0;
  float tot = 2.0;
  // Two rings of 8 taps at different radii approximate a wide soft blur.
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 d = vec2(cos(a), sin(a));
    sum += cam(uv + d * 22.0 / u_res).rgb;
    sum += cam(uv + d * 48.0 / u_res).rgb;
    tot += 2.0;
  }
  return sum / tot;
}
vec4 effect(vec2 uv) {
  float m = smoothstep(0.35, 0.65, personMask(uv));
  vec3 back = blurCam(uv) * 0.82 + vec3(0.03, 0.02, 0.05);
  return vec4(mix(back, cam(uv).rgb, m), 1.0);
}`,
};

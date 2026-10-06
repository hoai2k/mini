// Film Noir: contrasty black and white with grain, flicker, scratches and dust.

export default {
  id: 'noir',
  name: 'Film Noir',
  emoji: '🕵️',
  hint: 'It was a dark and stormy night',
  needs: {},
  shader: `
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec4 effect(vec2 uv) {
  float tick = floor(u_time * 14.0);             // film runs at a jittery rate
  vec2 j = vec2(hash(vec2(tick, 1.0)) - 0.5, hash(vec2(tick, 2.0)) - 0.5) * 0.004;
  vec3 c = cam(uv + j).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  l = smoothstep(0.08, 0.92, l);                 // hard contrast
  l = pow(l, 1.15);
  // Flickering projector brightness.
  float flick = 0.9 + 0.1 * hash(vec2(tick, 3.0)) + 0.04 * sin(u_time * 31.0);
  l *= flick;
  // Grain.
  l += (hash(floor(toPx(uv)) + tick * 7.0) - 0.5) * 0.18;
  // Vignette.
  vec2 q = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  l *= 1.0 - smoothstep(0.35, 0.95, length(q));
  // Occasional vertical scratches.
  float sx = hash(vec2(tick, 4.0));
  float on = step(0.55, hash(vec2(tick, 5.0)));
  float sc = 1.0 - smoothstep(0.0, 0.0014, abs(uv.x - sx));
  l = mix(l, 0.95, sc * on * 0.7 * step(0.2, hash(vec2(floor(uv.y * 40.0), tick))));
  // Dust specks.
  vec2 g = floor(toPx(uv) / 6.0);
  float dust = step(0.9985, hash(g + tick * 13.0));
  vec2 f = fract(toPx(uv) / 6.0) - 0.5;
  l = mix(l, 0.05, dust * (1.0 - smoothstep(0.2, 0.5, length(f))));
  return vec4(vec3(clamp(l, 0.0, 1.0)), 1.0);
}`,
};

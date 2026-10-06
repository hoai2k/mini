// Heat Vision: a thermal camera that thinks your face is the hottest thing.

export default {
  id: 'thermal',
  name: 'Heat Vision',
  emoji: '🌡️',
  hint: 'Heat vision',
  needs: { face: true },
  shader: `
float lum(vec2 uv) { return dot(cam(uv).rgb, vec3(0.299, 0.587, 0.114)); }

vec3 ramp(float t) {
  const vec3 c0 = vec3(0.0, 0.0, 0.0);
  const vec3 c1 = vec3(0.05, 0.02, 0.45);
  const vec3 c2 = vec3(0.45, 0.05, 0.6);
  const vec3 c3 = vec3(0.9, 0.1, 0.15);
  const vec3 c4 = vec3(1.0, 0.55, 0.05);
  const vec3 c5 = vec3(1.0, 0.95, 0.2);
  const vec3 c6 = vec3(1.0, 1.0, 1.0);
  t = clamp(t, 0.0, 1.0) * 6.0;
  if (t < 1.0) return mix(c0, c1, t);
  if (t < 2.0) return mix(c1, c2, t - 1.0);
  if (t < 3.0) return mix(c2, c3, t - 2.0);
  if (t < 4.0) return mix(c3, c4, t - 3.0);
  if (t < 5.0) return mix(c4, c5, t - 4.0);
  return mix(c5, c6, t - 5.0);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec4 effect(vec2 uv) {
  vec2 o = 1.5 / u_res;
  float l = lum(uv) * 0.4 + (lum(uv + vec2(o.x, 0.0)) + lum(uv - vec2(o.x, 0.0)) + lum(uv + vec2(0.0, o.y)) + lum(uv - vec2(0.0, o.y))) * 0.15;
  float heat = l * 0.6;
  if (u_hasFace > 0.5) {
    vec2 d = (toPx(uv) - u_center) / (u_faceSize * 0.62);
    heat += 0.3 * (1.0 - smoothstep(0.3, 1.1, length(d)));
  }
  heat += (hash(floor(toPx(uv) / 3.0) + floor(u_time * 12.0)) - 0.5) * 0.04;
  return vec4(ramp(heat), 1.0);
}`,
};

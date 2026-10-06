// Fisheye: your face pressed up against a wide lens, with a round dark vignette.

export default {
  id: 'fisheye',
  name: 'Fisheye',
  emoji: '🐟',
  hint: 'Get close to the lens',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  vec2 p = toPx(uv);
  vec2 c = u_hasFace > 0.5 ? u_nose : u_res * 0.5;
  // Radius that reaches the farthest corner, so the whole frame is inside the lens.
  float R = max(max(length(c), length(c - vec2(u_res.x, 0.0))),
                max(length(c - vec2(0.0, u_res.y)), length(c - u_res)));
  vec2 d = p - c;
  float l = length(d) / R;
  // Barrel: centre magnified hard, edge unchanged.
  float f = 0.38 + 0.62 * l * l;
  vec2 src = c + d * f;
  vec3 col = cam(toUv(src)).rgb;
  float v = 1.0 - smoothstep(0.45, 0.85, l);
  col *= mix(0.0, 1.0, v);
  return vec4(col, 1.0);
}`,
};

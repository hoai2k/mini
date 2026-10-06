// Pop Art: a 2x2 Warhol grid of posterized, halftoned duotone copies.

export default {
  id: 'popart',
  name: 'Pop Art',
  emoji: '🖼️',
  hint: 'Fifteen minutes of fame',
  needs: {},
  shader: `
vec4 effect(vec2 uv) {
  vec2 g = uv * 2.0;
  vec2 id = floor(g);
  vec2 cuv = fract(g);
  vec3 c = cam(cuv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  // Halftone dots: darker areas get bigger dots.
  vec2 px = cuv * u_res * 0.5;
  float cs = 0.7071;
  vec2 r = vec2(cs * px.x - cs * px.y, cs * px.x + cs * px.y) / 7.0;
  vec2 f = fract(r) - 0.5;
  float dotr = length(f);
  float ink = step(dotr, (1.0 - l) * 0.55);
  l = l - ink * 0.28;
  // Posterize to 3 levels.
  float lv = floor(clamp(l, 0.0, 0.999) * 3.0);
  // Four bold palettes: dark, mid, light.
  float i = id.x + id.y * 2.0;
  vec3 d, m, b;
  if (i < 0.5)      { d = vec3(0.08, 0.05, 0.25); m = vec3(0.95, 0.2, 0.45); b = vec3(1.0, 0.92, 0.3); }
  else if (i < 1.5) { d = vec3(0.05, 0.2, 0.3);   m = vec3(0.1, 0.7, 0.8);   b = vec3(1.0, 0.55, 0.85); }
  else if (i < 2.5) { d = vec3(0.3, 0.05, 0.1);   m = vec3(1.0, 0.45, 0.1);  b = vec3(0.45, 0.95, 0.85); }
  else              { d = vec3(0.1, 0.05, 0.3);   m = vec3(0.6, 0.3, 0.95);  b = vec3(0.7, 1.0, 0.2); }
  vec3 col = lv < 0.5 ? d : (lv < 1.5 ? m : b);
  // Thin gutters between the four panels.
  vec2 e = min(cuv, 1.0 - cuv) * u_res * 0.5;
  col *= smoothstep(0.0, 3.0, min(e.x, e.y));
  return vec4(col, 1.0);
}`,
};

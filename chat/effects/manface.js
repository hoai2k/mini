// Man: a squarer, wider jaw, a stronger nose, heavier brows, a shadow of
// stubble on the chin, jaw and upper lip, and a little more contrast.

export default {
  id: 'manface',
  name: 'Man',
  emoji: '🧔',
  hint: 'Square jaw and stubble',
  needs: { face: true },
  shader: `
float hash(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);
  vec2 ey = vec2(-ex.y, ex.x);
  vec2 p = px;
  // Wider jaw: below the mouth, the sides are drawn from nearer the middle.
  vec2 dm = px - u_mouth;
  float along = dot(dm, ex), down = dot(dm, ey);
  float jaw = smoothstep(-0.4 * u_scale, 0.4 * u_scale, down) * (1.0 - smoothstep(0.9 * u_scale, 1.6 * u_scale, down));
  float side = smoothstep(0.15 * u_scale, 0.8 * u_scale, abs(along)) * (1.0 - smoothstep(1.2 * u_scale, 1.9 * u_scale, abs(along)));
  p -= ex * sign(along) * (0.17 * u_scale) * jaw * side;
  p = bulge(p, u_nose, 0.5 * u_scale, 0.18);
  p = bulge(p, u_eyeL, 0.4 * u_scale, -0.2);
  p = bulge(p, u_eyeR, 0.4 * u_scale, -0.2);
  vec3 c = cam(toUv(p)).rgb;
  // Where the face is.
  vec2 d = px - u_center;
  float cs = cos(-u_roll), sn = sin(-u_roll);
  d = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
  float e = length(d / vec2(u_faceSize.x * 0.56, u_faceSize.y * 0.6));
  float face = 1.0 - smoothstep(0.85, 1.05, e);
  // Stubble: grainy shadow from just under the nose down, but not on the lips.
  float below = smoothstep(0.1, 0.35, dot(px - u_nose, ey) / u_scale);
  vec2 lq = vec2(dot(px - u_mouth, ex), dot(px - u_mouth, ey)) / u_scale;
  float lips = 1.0 - smoothstep(0.8, 1.1, length(lq / vec2(0.3, 0.12)));
  float area = below * face * (1.0 - lips);
  float grain = step(0.45, hash(floor(px / max(1.5, u_scale * 0.02))));
  c *= 1.0 - area * (0.12 + 0.24 * grain);
  // Heavier brows.
  for (int i = 0; i < 2; i++) {
    vec2 eye = i == 0 ? u_eyeL : u_eyeR;
    vec2 q = vec2(dot(px - eye, ex), dot(px - eye, ey)) / u_scale - vec2(0.0, -0.36);
    float brow = 1.0 - smoothstep(0.8, 1.1, length(q / vec2(0.32, 0.075)));
    c *= 1.0 - brow * 0.35;
  }
  c = (c - 0.5) * 1.08 + 0.5;
  c *= vec3(1.03, 0.99, 0.95);
  return vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
};

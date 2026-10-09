// Man: mostly proportions and shading. A broader, squarer jaw and a slightly
// longer chin, a stronger nose, slightly narrower eyes under a lower, heavier
// brow, deeper shadows under the cheekbones and along the jaw, and only a
// light shadow of stubble.

import { FACE_SHADE } from './lib/faceshade.js';

export default {
  id: 'manface',
  name: 'Man',
  emoji: '🧔',
  hint: 'Squarer jaw, heavier brow',
  needs: { face: true },
  shader: `${FACE_SHADE}
float hash(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = fEX(), ey = fEY();
  vec2 q0 = fLocal(px);
  vec2 p = px;
  // Broader, squarer jaw: the lower sides are drawn from nearer the middle.
  float jaw = smoothstep(0.75, 1.2, q0.y) * (1.0 - smoothstep(1.6, 2.2, q0.y));
  float side = smoothstep(0.25, 0.85, abs(q0.x)) * (1.0 - smoothstep(1.2, 1.8, abs(q0.x)));
  p -= ex * sign(q0.x) * (0.1 * u_scale) * jaw * side;
  // A slightly longer chin.
  p -= ey * (0.06 * u_scale) * fSoft(q0, vec2(0.0, 1.55), vec2(0.6, 0.45));
  // A lower brow: the band above the eyes is drawn from a little higher.
  p -= ey * (0.035 * u_scale) * (fSoft(q0, vec2(-0.5, -0.38), vec2(0.45, 0.2)) + fSoft(q0, vec2(0.5, -0.38), vec2(0.45, 0.2)));
  p = bulge(p, u_nose, 0.5 * u_scale, 0.12);
  p = bulge(p, u_eyeL, 0.38 * u_scale, -0.12);
  p = bulge(p, u_eyeR, 0.38 * u_scale, -0.12);
  vec3 c = cam(toUv(p)).rgb;
  vec2 q = fLocal(px);
  float face = 1.0 - smoothstep(0.8, 0.98, fEdge(px));
  // Contour: hollows under the cheekbones, shadow along the jaw and under
  // the brow ridge, a little light on the brow and nose bridge.
  c = fShade(c, q, vec2(-0.78, 0.95), vec2(0.28, 0.45), 0.14 * face);
  c = fShade(c, q, vec2(0.78, 0.95), vec2(0.28, 0.45), 0.14 * face);
  c = fShade(c, q, vec2(-0.85, 1.5), vec2(0.3, 0.35), 0.12 * face);
  c = fShade(c, q, vec2(0.85, 1.5), vec2(0.3, 0.35), 0.12 * face);
  c = fShade(c, q, vec2(-0.5, -0.24), vec2(0.36, 0.08), 0.12);
  c = fShade(c, q, vec2(0.5, -0.24), vec2(0.36, 0.08), 0.12);
  c = fShade(c, q, vec2(0.0, -0.55), vec2(0.5, 0.18), -0.1);
  // Slightly fuller brows.
  c = fShade(c, q, vec2(-0.5, -0.38), vec2(0.33, 0.08), 0.18);
  c = fShade(c, q, vec2(0.5, -0.38), vec2(0.33, 0.08), 0.18);
  // A light shadow of stubble from under the nose down, not on the lips.
  float below = smoothstep(0.55, 0.8, q.y);
  float lips = fSoft(q, fLocal(u_mouth), vec2(0.32, 0.14));
  float grain = step(0.5, hash(floor(px / max(1.5, u_scale * 0.018))));
  c *= 1.0 - below * face * (1.0 - lips) * (0.03 + 0.06 * grain);
  // A touch more contrast and warmth.
  c = mix(c, (c - 0.5) * 1.06 + 0.5, face);
  c *= mix(vec3(1.0), vec3(1.02, 0.99, 0.96), face);
  return vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
};

// Woman: mostly proportions and shading. A narrower, softer jaw and chin, a
// smaller nose, slightly larger eyes under lifted, finer brows, fuller lips,
// smooth skin with light on the cheekbones, no beard, and only a touch of
// colour on the lips, cheeks and lash line.

import { FACE_SHADE } from './lib/faceshade.js';

export default {
  id: 'womanface',
  name: 'Woman',
  emoji: '👩',
  hint: 'Softer jaw, finer features',
  // The person cut-out lets the beard below the chin be taken away too.
  needs: { face: true, segmentation: true },
  shader: `${FACE_SHADE}
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = fEX(), ey = fEY();
  vec2 q0 = fLocal(px);
  vec2 p = px;
  // Narrower, softer jaw: the lower sides are drawn from further out.
  float jaw = smoothstep(0.75, 1.2, q0.y) * (1.0 - smoothstep(1.6, 2.2, q0.y));
  float side = smoothstep(0.25, 0.85, abs(q0.x)) * (1.0 - smoothstep(1.2, 1.8, abs(q0.x)));
  p += ex * sign(q0.x) * (0.09 * u_scale) * jaw * side;
  // A slightly shorter, rounder chin.
  p += ey * (0.05 * u_scale) * fSoft(q0, vec2(0.0, 1.55), vec2(0.6, 0.45));
  // Brows lifted a touch.
  p += ey * (0.045 * u_scale) * (fSoft(q0, vec2(-0.5, -0.38), vec2(0.45, 0.2)) + fSoft(q0, vec2(0.5, -0.38), vec2(0.45, 0.2)));
  p = bulge(p, u_eyeL, 0.5 * u_scale, 0.16);
  p = bulge(p, u_eyeR, 0.5 * u_scale, 0.16);
  p = bulge(p, u_nose, 0.45 * u_scale, -0.3);
  p = bulge(p, u_mouth, 0.35 * u_scale, 0.14);
  vec3 c = cam(toUv(p)).rgb;
  c = fSmooth(c, p, px, 0.5);
  c = fNoBeard(c, p, px, 1.0);
  vec2 q = fLocal(px);
  float face = 1.0 - smoothstep(0.8, 0.98, fEdge(px));
  // Finer brows: their outer edges pulled towards the skin.
  vec3 skin = fSkin();
  float browEdge = max(fSoft(q, vec2(-0.55, -0.43), vec2(0.4, 0.06)), fSoft(q, vec2(0.55, -0.43), vec2(0.4, 0.06)));
  c = mix(c, skin, browEdge * 0.35);
  // Light on the cheekbones, less shadow along the jaw.
  c = fShade(c, q, vec2(-0.62, 0.62), vec2(0.35, 0.22), -0.12 * face);
  c = fShade(c, q, vec2(0.62, 0.62), vec2(0.35, 0.22), -0.12 * face);
  c = fShade(c, q, vec2(-0.85, 1.45), vec2(0.35, 0.4), -0.1 * face);
  c = fShade(c, q, vec2(0.85, 1.45), vec2(0.35, 0.4), -0.1 * face);
  // A touch of colour: cheeks, lips, and a soft lash line.
  float cheeks = max(fSoft(q, vec2(-0.7, 0.8), vec2(0.45, 0.32)), fSoft(q, vec2(0.7, 0.8), vec2(0.45, 0.32)));
  c = mix(c, c * vec3(1.06, 0.93, 0.95) + vec3(0.04, 0.0, 0.01), cheeks * 0.3 * face);
  float lips = fSoft(q, fLocal(u_mouth), vec2(0.3, 0.12));
  c = mix(c, c * vec3(1.12, 0.78, 0.82) + vec3(0.03, 0.0, 0.01), lips * 0.35);
  for (int i = 0; i < 2; i++) {
    vec2 eye = i == 0 ? u_eyeL : u_eyeR;
    float dir = i == 0 ? -1.0 : 1.0;
    vec2 e = vec2(dot(px - eye, ex) * dir, dot(px - eye, ey)) / u_scale;
    float lid = -0.06 + 0.7 * e.x * e.x;
    float line = (1.0 - smoothstep(0.008, 0.022, abs(e.y - lid))) * step(-0.18, e.x) * step(e.x, 0.22);
    c = mix(c, c * 0.35, line * 0.5);
  }
  return vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
};

// Baby: you as a baby. A rounder, bigger head with the features gathered
// lower and closer together, larger eyes, a tiny nose and mouth, a short
// little chin, fat cheeks, faint brows, smooth pink skin and no beard.
// (Baby Face is the cartoon version.)

import { FACE_SHADE } from './lib/faceshade.js';

export default {
  id: 'baby',
  name: 'Baby',
  emoji: '👶',
  hint: 'You, as a baby',
  // The person cut-out lets the beard below the chin be taken away too.
  needs: { face: true, segmentation: true },
  shader: `${FACE_SHADE}
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = fEX(), ey = fEY();
  vec2 p = px;
  // A shorter lower face: the chin is drawn from further down.
  vec2 jc = fPx(vec2(0.0, 1.35));
  p += ey * (0.3 * u_scale) * (1.0 - smoothstep(0.0, 1.4 * u_scale, length(px - jc)));
  // A rounder, wider lower face.
  vec2 q0 = fLocal(px);
  float jaw = smoothstep(0.6, 1.1, q0.y) * (1.0 - smoothstep(1.4, 2.0, q0.y));
  float side = smoothstep(0.2, 0.8, abs(q0.x)) * (1.0 - smoothstep(1.2, 1.8, abs(q0.x)));
  p -= ex * sign(q0.x) * (0.12 * u_scale) * jaw * side;
  // A bigger head, then the features: larger eyes, tiny nose and mouth, fat cheeks.
  p = bulge(p, u_center, 2.4 * u_scale, 0.22);
  p = bulge(p, u_eyeL, 0.6 * u_scale, 0.38);
  p = bulge(p, u_eyeR, 0.6 * u_scale, 0.38);
  p = bulge(p, u_nose, 0.55 * u_scale, -0.6);
  p = bulge(p, u_mouth, 0.6 * u_scale, -0.45);
  p = bulge(p, fPx(vec2(-0.7, 0.95)), 0.75 * u_scale, 0.35);
  p = bulge(p, fPx(vec2(0.7, 0.95)), 0.75 * u_scale, 0.35);
  vec3 c = cam(toUv(p)).rgb;
  c = fSmooth(c, p, px, 0.75);
  c = fNoBeard(c, p, px, 1.0);
  vec2 q = fLocal(px);
  // Faint brows: pulled towards the skin.
  vec3 skin = fSkin();
  float brows = max(fSoft(q, vec2(-0.5, -0.36), vec2(0.36, 0.12)), fSoft(q, vec2(0.5, -0.36), vec2(0.36, 0.12)));
  c = mix(c, skin, brows * 0.55);
  // Soft pink cheeks and a little extra light.
  float face = 1.0 - smoothstep(0.78, 0.98, fEdge(px));
  float cheeks = max(fSoft(q, vec2(-0.72, 0.85), vec2(0.5, 0.4)), fSoft(q, vec2(0.72, 0.85), vec2(0.5, 0.4)));
  c = mix(c, c * vec3(1.08, 0.92, 0.94) + vec3(0.06, 0.0, 0.01), cheeks * 0.35 * face);
  c = mix(c, c * 1.05 + 0.03, face * 0.6);
  return vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
};

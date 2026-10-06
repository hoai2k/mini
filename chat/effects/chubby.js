// Chubby Cheeks: two big puffy cheeks that swell more when you puff or open up.

export default {
  id: 'chubby',
  name: 'Chubby Cheeks',
  emoji: '🐹',
  hint: 'Puff your cheeks',
  needs: { face: true },
  shader: `
uniform float u_puff;
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);   // along the eye line
  vec2 ey = vec2(-ex.y, ex.x);            // towards the chin
  vec2 mid = (u_eyeL + u_eyeR) * 0.5;
  float amt = 0.88 + 0.08 * u_puff;
  float r = (0.95 + 0.3 * u_puff) * u_scale;
  vec2 cl = mid - ex * (0.72 * u_scale) + ey * (0.9 * u_scale);
  vec2 cr = mid + ex * (0.72 * u_scale) + ey * (0.9 * u_scale);
  p = bulge(p, cl, r, amt);
  p = bulge(p, cr, r, amt);
  return cam(toUv(p));
}`,
  uniforms(f) {
    const face = f.face;
    if (!face) return { u_puff: 0 };
    return { u_puff: Math.min(1, Math.max(face.cheekPuff || 0, face.mouthOpen || 0)) };
  },
};

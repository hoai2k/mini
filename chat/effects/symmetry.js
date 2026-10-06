// Mirror Face: one half of the face is copied onto the other; smile to swap sides.

export default {
  id: 'symmetry',
  name: 'Mirror Face',
  emoji: '🪞',
  hint: 'Smile to swap sides',
  needs: { face: true },
  start(s) { s.side = 1; },
  shader: `
uniform float u_side;
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 p = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);
  vec2 ey = vec2(-ex.y, ex.x);
  vec2 mid = (u_eyeL + u_eyeR) * 0.5;
  vec2 d = p - mid;
  float x = dot(d, ex);
  float y = dot(d, ey);
  // Reflect the half that isn't kept across the centre line.
  if (x * u_side < 0.0) x = -x;
  p = mid + ex * x + ey * y;
  return cam(toUv(p));
}`,
  uniforms(f) {
    const s = f.state;
    const sm = f.face ? f.face.smile : 0;
    // A smile flips the side, with a little hysteresis so it doesn't flicker.
    s.side = sm > 0.55 ? -1 : sm < 0.35 ? 1 : (s.side || 1);
    return { u_side: s.side };
  },
};

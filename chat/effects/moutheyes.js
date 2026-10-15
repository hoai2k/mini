// Mouth Eyes: your own mouth is copied over both eyes, so the face talks
// with three mouths at once.

export default {
  id: 'moutheyes',
  name: 'Mouth Eyes',
  emoji: '👄',
  hint: 'Talk, smile, open wide!',
  needs: { face: true },
  shader: `
vec3 mouthOver(vec3 c, vec2 px, vec2 eye, vec2 ex, vec2 ey, float o) {
  vec2 d = px - eye;
  // The mouth patch, held level with the face and a touch smaller than the real one.
  float lx = dot(d, ex), ly = dot(d, ey);
  float w = 0.46 * u_scale;
  float h = (0.22 + 0.2 * o) * u_scale;
  float r = length(vec2(lx / w, ly / h));
  float k = 1.0 - smoothstep(0.7, 1.0, r);
  vec3 m = cam(toUv(u_mouth + d * 1.12)).rgb;
  return mix(c, m, k);
}

vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);
  vec2 ey = vec2(-ex.y, ex.x);
  float o = clamp(u_mouthOpen, 0.0, 1.0);
  vec3 c = cam(uv).rgb;
  c = mouthOver(c, px, u_eyeL, ex, ey, o);
  c = mouthOver(c, px, u_eyeR, ex, ey, o);
  return vec4(c, 1.0);
}`,
};

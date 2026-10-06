// Cyclops: both eyes shrink away and one huge eye opens in the middle of the forehead.

export default {
  id: 'cyclops',
  name: 'Cyclops',
  emoji: '👁️',
  hint: 'One eye to see them all',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);
  vec2 ey = vec2(-ex.y, ex.x);
  vec2 mid = (u_eyeL + u_eyeR) * 0.5;
  // Pinch both real eyes away.
  vec2 p = px;
  p = bulge(p, u_eyeL, 0.7 * u_scale, -3.0);
  p = bulge(p, u_eyeR, 0.7 * u_scale, -3.0);
  vec3 c = cam(toUv(p)).rgb;
  // The big eye: the left eye (untouched image) drawn 2.4x larger between the eyes.
  vec2 ce = mid - ey * (0.1 * u_scale);
  float R = 0.95 * u_scale;
  vec2 d = px - ce;
  float l = length(d);
  vec2 src = u_eyeL + d / 2.4;
  vec3 eye = cam(toUv(src)).rgb;
  float k = 1.0 - smoothstep(R * 0.8, R, l);
  // Dark rim for a bit of depth.
  float rim = smoothstep(R * 0.55, R * 0.97, l);
  eye *= 1.0 - 0.45 * rim;
  c = mix(c, eye, k);
  return vec4(c, 1.0);
}`,
};

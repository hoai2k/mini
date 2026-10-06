// Baby Face: huge eyes, a button nose and mouth, a round little chin and rosy cheeks.

export default {
  id: 'babyface',
  name: 'Baby Face',
  emoji: '👶',
  hint: 'Goo goo ga ga',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);
  vec2 ey = vec2(-ex.y, ex.x);
  vec2 mid = (u_eyeL + u_eyeR) * 0.5;
  vec2 p = px;
  // Lower face pulled up: sample from further down inside a soft blob around the chin.
  vec2 jc = u_mouth + ey * (0.55 * u_scale);
  vec2 jd = p - jc;
  float jk = 1.0 - smoothstep(0.0, 1.5 * u_scale, length(jd));
  p += ey * (0.38 * u_scale) * jk;
  p = bulge(p, u_eyeL, 0.8 * u_scale, 0.75);
  p = bulge(p, u_eyeR, 0.8 * u_scale, 0.75);
  p = bulge(p, u_nose, 0.6 * u_scale, -1.1);
  p = bulge(p, u_mouth, 0.7 * u_scale, -1.0);
  vec3 c = cam(toUv(p)).rgb;
  // Skin softening: blur over the face ellipse.
  vec2 d = px - u_center;
  float cs = cos(-u_roll), sn = sin(-u_roll);
  d = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
  float e = length(d / vec2(u_faceSize.x * 0.5, u_faceSize.y * 0.56));
  float skin = 1.0 - smoothstep(0.7, 1.05, e);
  float o = 0.12 * u_scale;
  vec3 b = c;
  b += cam(toUv(p + vec2(o, 0.0))).rgb;
  b += cam(toUv(p - vec2(o, 0.0))).rgb;
  b += cam(toUv(p + vec2(0.0, o))).rgb;
  b += cam(toUv(p - vec2(0.0, o))).rgb;
  b *= 0.2;
  c = mix(c, mix(b, c, 0.25) * 1.06 + 0.03, skin * 0.8);
  // Rosy cheeks.
  vec2 cl = mid - ex * (0.62 * u_scale) + ey * (1.15 * u_scale);
  vec2 cr = mid + ex * (0.62 * u_scale) + ey * (1.15 * u_scale);
  float bl = max(1.0 - smoothstep(0.0, 0.5 * u_scale, length(px - cl)),
                 1.0 - smoothstep(0.0, 0.5 * u_scale, length(px - cr)));
  c = mix(c, vec3(1.0, 0.35, 0.45), bl * 0.5);
  return vec4(c, 1.0);
}`,
};

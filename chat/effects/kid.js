// Kid: a younger you. Bigger eyes, a smaller nose and mouth, a shorter
// chin, a slightly bigger head, smooth skin and a bit of colour in the
// cheeks: gentler than Baby Face.

export default {
  id: 'kid',
  name: 'Kid',
  emoji: '🧒',
  hint: 'Back to being a kid',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);
  vec2 ey = vec2(-ex.y, ex.x);
  vec2 mid = (u_eyeL + u_eyeR) * 0.5;
  vec2 p = px;
  // A shorter lower face: the chin is drawn from further down.
  vec2 jc = u_mouth + ey * (0.45 * u_scale);
  float jk = 1.0 - smoothstep(0.0, 1.3 * u_scale, length(p - jc));
  p += ey * (0.22 * u_scale) * jk;
  p = bulge(p, u_center, 2.2 * u_scale, 0.18);
  p = bulge(p, u_eyeL, 0.7 * u_scale, 0.42);
  p = bulge(p, u_eyeR, 0.7 * u_scale, 0.42);
  p = bulge(p, u_nose, 0.55 * u_scale, -0.55);
  p = bulge(p, u_mouth, 0.6 * u_scale, -0.35);
  vec3 c = cam(toUv(p)).rgb;
  // Smooth skin over the face.
  vec2 d = px - u_center;
  float cs = cos(-u_roll), sn = sin(-u_roll);
  d = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
  float e = length(d / vec2(u_faceSize.x * 0.5, u_faceSize.y * 0.56));
  float skin = 1.0 - smoothstep(0.7, 1.05, e);
  float o = 0.045 * u_scale;
  vec3 b = c + cam(toUv(p + vec2(o, 0.0))).rgb + cam(toUv(p - vec2(o, 0.0))).rgb
             + cam(toUv(p + vec2(0.0, o))).rgb + cam(toUv(p - vec2(0.0, o))).rgb;
  b *= 0.2;
  c = mix(c, mix(b, c, 0.3) * 1.04 + 0.02, skin * 0.6);
  // A little colour in the cheeks.
  vec2 cl = mid - ex * (0.7 * u_scale) + ey * (0.85 * u_scale);
  vec2 cr = mid + ex * (0.7 * u_scale) + ey * (0.85 * u_scale);
  float bl = max(1.0 - smoothstep(0.0, 0.45 * u_scale, length(px - cl)),
                 1.0 - smoothstep(0.0, 0.45 * u_scale, length(px - cr)));
  c = mix(c, vec3(1.0, 0.45, 0.5), bl * 0.25 * skin);
  return vec4(c, 1.0);
}`,
};

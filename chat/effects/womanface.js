// Woman: a slimmer jaw, bigger eyes with eyeliner, raised brows, a smaller
// nose, smooth skin, rosy cheeks and coloured lips.

export default {
  id: 'womanface',
  name: 'Woman',
  emoji: '👩',
  hint: 'Lashes, lips and a slim jaw',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  if (u_hasFace < 0.5) return cam(uv);
  vec2 px = toPx(uv);
  vec2 ex = normalize(u_eyeR - u_eyeL);
  vec2 ey = vec2(-ex.y, ex.x);
  vec2 mid = (u_eyeL + u_eyeR) * 0.5;
  vec2 p = px;
  // Slimmer jaw: below the mouth, the sides are drawn from further out.
  vec2 dm = px - u_mouth;
  float along = dot(dm, ex), down = dot(dm, ey);
  float jaw = smoothstep(-0.4 * u_scale, 0.4 * u_scale, down) * (1.0 - smoothstep(0.9 * u_scale, 1.6 * u_scale, down));
  float side = smoothstep(0.15 * u_scale, 0.8 * u_scale, abs(along)) * (1.0 - smoothstep(1.2 * u_scale, 1.9 * u_scale, abs(along)));
  p += ex * sign(along) * (0.13 * u_scale) * jaw * side;
  // Brows lifted a touch.
  for (int i = 0; i < 2; i++) {
    vec2 eye = i == 0 ? u_eyeL : u_eyeR;
    vec2 bc = eye - ey * (0.38 * u_scale);
    float wb = 1.0 - smoothstep(0.0, 0.45 * u_scale, length(px - bc));
    p += ey * (0.06 * u_scale) * wb;
  }
  p = bulge(p, u_eyeL, 0.6 * u_scale, 0.3);
  p = bulge(p, u_eyeR, 0.6 * u_scale, 0.3);
  p = bulge(p, u_nose, 0.5 * u_scale, -0.4);
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
  c = mix(c, mix(b, c, 0.3) * 1.03 + 0.02, skin * 0.6);
  // Rosy cheeks.
  vec2 cl = mid - ex * (0.72 * u_scale) + ey * (0.8 * u_scale);
  vec2 cr = mid + ex * (0.72 * u_scale) + ey * (0.8 * u_scale);
  float bl = max(1.0 - smoothstep(0.0, 0.45 * u_scale, length(px - cl)),
                 1.0 - smoothstep(0.0, 0.45 * u_scale, length(px - cr)));
  c = mix(c, vec3(1.0, 0.4, 0.5), bl * 0.3 * skin);
  // Coloured lips.
  vec2 lq = vec2(dot(px - u_mouth, ex), dot(px - u_mouth, ey)) / u_scale;
  float lips = 1.0 - smoothstep(0.75, 1.0, length(lq / vec2(0.3, 0.13)));
  c = mix(c, c * vec3(1.25, 0.5, 0.6) + vec3(0.08, 0.0, 0.02), lips * 0.65);
  // Eyeliner along each upper lid, flicking up at the outer corner.
  for (int i = 0; i < 2; i++) {
    vec2 eye = i == 0 ? u_eyeL : u_eyeR;
    float dir = i == 0 ? -1.0 : 1.0;
    vec2 q = vec2(dot(px - eye, ex) * dir, dot(px - eye, ey)) / u_scale;
    float lid = -0.065 + 0.7 * q.x * q.x - max(0.0, q.x - 0.16) * 0.9;
    float liner = (1.0 - smoothstep(0.012, 0.03, abs(q.y - lid))) * step(-0.2, q.x) * step(q.x, 0.27);
    c = mix(c, vec3(0.05, 0.03, 0.04), liner * 0.85);
  }
  return vec4(c, 1.0);
}`,
};

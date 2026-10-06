// 8-Bit: chunky pixels in the PICO-8 palette, with faint scanlines.

export default {
  id: 'pixel',
  name: '8-Bit',
  emoji: '👾',
  hint: 'Retro mode',
  needs: {},
  shader: `
const vec3 P0 = vec3(0.0, 0.0, 0.0);
const vec3 P1 = vec3(0.114, 0.169, 0.325);
const vec3 P2 = vec3(0.494, 0.145, 0.325);
const vec3 P3 = vec3(0.0, 0.529, 0.318);
const vec3 P4 = vec3(0.671, 0.322, 0.212);
const vec3 P5 = vec3(0.373, 0.341, 0.310);
const vec3 P6 = vec3(0.761, 0.765, 0.780);
const vec3 P7 = vec3(1.0, 0.945, 0.910);
const vec3 P8 = vec3(1.0, 0.0, 0.302);
const vec3 P9 = vec3(1.0, 0.639, 0.0);
const vec3 P10 = vec3(1.0, 0.925, 0.153);
const vec3 P11 = vec3(0.0, 0.894, 0.212);
const vec3 P12 = vec3(0.161, 0.678, 1.0);
const vec3 P13 = vec3(0.514, 0.463, 0.612);
const vec3 P14 = vec3(1.0, 0.467, 0.659);
const vec3 P15 = vec3(1.0, 0.8, 0.667);

void tryColor(vec3 c, vec3 col, inout vec3 best, inout float bestD) {
  vec3 d = col - c;
  float dd = dot(d, d);
  if (dd < bestD) { bestD = dd; best = col; }
}

vec4 effect(vec2 uv) {
  float block = u_res.x / 96.0;
  vec2 px = toPx(uv);
  vec2 cell = floor(px / block);
  vec3 c = cam(toUv((cell + 0.5) * block)).rgb;
  vec3 best = P0;
  float bd = 10.0;
  tryColor(c, P0, best, bd);  tryColor(c, P1, best, bd);
  tryColor(c, P2, best, bd);  tryColor(c, P3, best, bd);
  tryColor(c, P4, best, bd);  tryColor(c, P5, best, bd);
  tryColor(c, P6, best, bd);  tryColor(c, P7, best, bd);
  tryColor(c, P8, best, bd);  tryColor(c, P9, best, bd);
  tryColor(c, P10, best, bd); tryColor(c, P11, best, bd);
  tryColor(c, P12, best, bd); tryColor(c, P13, best, bd);
  tryColor(c, P14, best, bd); tryColor(c, P15, best, bd);
  float line = 0.93 + 0.07 * sin(px.y * 3.14159 * 2.0 / max(block * 0.5, 1.0));
  return vec4(best * line, 1.0);
}`,
};

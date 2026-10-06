// Disco: your room becomes a dark dance floor with spotlights and a glitter ball.

export default {
  id: 'disco',
  name: 'Disco',
  emoji: '🪩',
  hint: 'Dance!',
  needs: { segmentation: true },

  shader: `
vec3 hue(float h) {
  return clamp(abs(fract(h + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
}
vec4 effect(vec2 uv) {
  vec3 c = cam(uv).rgb;
  float m = smoothstep(0.35, 0.65, personMask(uv));
  float asp = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  vec2 ball = vec2(0.5 * asp, 0.04);
  // Dark floor: a dim copy of the room with a checker glow.
  vec3 back = c * 0.1 + vec3(0.03, 0.0, 0.07);
  vec2 ck = floor(vec2(uv.x * 10.0 * asp, (uv.y - 0.55) * 14.0));
  float chk = mod(ck.x + ck.y, 2.0) * step(0.55, uv.y);
  back += hue(u_time * 0.1 + uv.x) * chk * 0.08;
  vec3 beams = vec3(0.0);
  vec3 lit = vec3(0.0);
  // Six spotlight beams swinging from the glitter ball.
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float ang = 1.5708 + sin(u_time * (0.8 + fi * 0.17) + fi * 1.9) * (0.75 + 0.05 * fi);
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 d = p - ball;
    float along = dot(d, dir);
    float across = abs(d.x * dir.y - d.y * dir.x);
    float w = 0.02 + along * 0.11;
    float b = smoothstep(w, 0.0, across) * step(0.0, along) * (0.75 - 0.35 * along);
    vec3 col = hue(fi / 6.0 + u_time * 0.07);
    beams += col * b;
    lit += col * b;
  }
  back += beams * 0.9;
  // Glitter ball with sparkles.
  float db = length(p - ball);
  float disc = smoothstep(0.075, 0.07, db);
  vec2 g = floor((p - ball) * 60.0);
  float tw = fract(sin(dot(g, vec2(12.9898, 78.233)) + floor(u_time * 6.0 + dot(g, vec2(0.3, 0.7)))) * 43758.5);
  vec3 ballCol = vec3(0.55) + hue(tw + u_time * 0.2) * step(0.7, tw) * 1.2;
  back = mix(back, ballCol, disc);
  back += hue(u_time * 0.3) * smoothstep(0.2, 0.0, db) * 0.25;
  // Coloured lights sweep over the person too.
  vec3 person = c * (0.75 + lit * 0.5) + lit * 0.25 + hue(u_time * 0.25 + uv.x * 0.6) * 0.08;
  return vec4(mix(back, person, m), 1.0);
}`,
};

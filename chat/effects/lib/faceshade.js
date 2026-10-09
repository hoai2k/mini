// Shared GLSL for the reshaping effects (Baby, Man, Woman): face geometry,
// the skin's own colour, smoothing, beard removal and soft shading. Paste
// FACE_SHADE before an effect's own effect() function.

export const FACE_SHADE = `
vec2 fEX() { return normalize(u_eyeR - u_eyeL); }      // along the eye line
vec2 fEY() { vec2 e = fEX(); return vec2(-e.y, e.x); } // towards the chin
vec2 fMid() { return (u_eyeL + u_eyeR) * 0.5; }
// Face-relative coordinates in units of u_scale: x along the eyes, y down,
// with (0, 0) between the eyes.
vec2 fLocal(vec2 px) { vec2 d = px - fMid(); return vec2(dot(d, fEX()), dot(d, fEY())) / u_scale; }
vec2 fPx(vec2 q) { return fMid() + (fEX() * q.x + fEY() * q.y) * u_scale; }
// 0 in the middle of the face, 1 at its edge.
float fEdge(vec2 px) {
  vec2 d = px - u_center;
  float cs = cos(-u_roll), sn = sin(-u_roll);
  d = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
  return length(d / vec2(u_faceSize.x * 0.5, u_faceSize.y * 0.58));
}
float fSoft(vec2 q, vec2 c, vec2 r) { return 1.0 - smoothstep(0.6, 1.0, length((q - c) / r)); }
// The skin's colour, from the cheekbones just under the eyes (above where a
// beard grows, rarely made up).
vec3 fSkin() {
  vec3 a = cam(toUv(fPx(vec2(-0.55, 0.3)))).rgb + cam(toUv(fPx(vec2(0.55, 0.3)))).rgb;
  a += cam(toUv(fPx(vec2(-0.68, 0.42)))).rgb + cam(toUv(fPx(vec2(0.68, 0.42)))).rgb;
  return a * 0.25;
}
vec3 fBlur(vec2 p, float o) {
  vec3 b = cam(toUv(p)).rgb * 2.0;
  b += cam(toUv(p + vec2(o, 0.0))).rgb + cam(toUv(p - vec2(o, 0.0))).rgb;
  b += cam(toUv(p + vec2(0.0, o))).rgb + cam(toUv(p - vec2(0.0, o))).rgb;
  b += cam(toUv(p + vec2(o, o) * 0.7)).rgb + cam(toUv(p - vec2(o, o) * 0.7)).rgb;
  return b * 0.125;
}
float fLum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// Smooths skin over the face, keeping its overall shading.
vec3 fSmooth(vec3 c, vec2 p, vec2 px, float amount) {
  float skin = 1.0 - smoothstep(0.62, 0.92, fEdge(px));
  vec3 b = fBlur(p, 0.05 * u_scale);
  return mix(c, mix(b, c, 0.2), skin * amount);
}
// Takes a beard or stubble away: below the nose and around the jaw (not on
// the lips), anything darker than the skin is pulled back to the skin's
// colour, shaded a little darker towards the chin.
// p is where in the camera image this pixel was taken from (after any
// reshaping), so the beard is found where it really is.
vec3 fNoBeard(vec3 c, vec2 p, vec2 px, float amount) {
  vec2 q = fLocal(p);
  // From under the nose down to the chin, inside the face's outline (a beard
  // on the neck is left: past the chin we can't tell it from the room).
  float lower = smoothstep(0.52, 0.66, q.y) * (1.0 - smoothstep(0.84, 0.95, fEdge(p)));
  // With the person cut out (needs.segmentation), a beard hanging below the
  // chin is caught too: dark pixels that are part of the person in a tapering
  // patch just under the jaw.
  if (u_hasMask > 0.5) {
    float under = smoothstep(1.25, 1.4, q.y) * (1.0 - smoothstep(1.85, 2.05, q.y));
    float width = 0.95 - max(0.0, q.y - 1.4) * 0.7;
    under *= 1.0 - smoothstep(width - 0.15, width, abs(q.x));
    lower = max(lower, under * smoothstep(0.5, 0.8, personMask(toUv(p))));
  }
  // Just the lips, opening with the mouth.
  vec2 m = fLocal(u_mouth);
  float lips = fSoft(q, m, vec2(0.3, 0.075 + 0.28 * u_mouthOpen));
  float area = lower * (1.0 - lips) * amount;
  if (area <= 0.0) return c;
  vec3 skin = fSkin();
  // The shading comes from the forehead-to-cheek light, not the beard.
  float shade = mix(1.0, 0.9, smoothstep(0.9, 1.5, q.y));
  float dark = clamp((fLum(skin) - fLum(c)) * 5.0 + 0.45, 0.0, 1.0);
  vec3 b = fBlur(p, 0.06 * u_scale);
  vec3 clean = mix(skin * shade, b, 0.04);
  return mix(c, clean, area * dark);
}
// Darkens (amount > 0) or lightens (amount < 0) softly inside an ellipse.
vec3 fShade(vec3 c, vec2 q, vec2 centre, vec2 r, float amount) {
  float k = fSoft(q, centre, r);
  return amount > 0.0 ? c * (1.0 - k * amount) : mix(c, c + (1.0 - c) * 0.6, k * -amount);
}
`;

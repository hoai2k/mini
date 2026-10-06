// Colour Pop: the room goes black and white, only you stay in colour.

export default {
  id: 'colorpop',
  name: 'Colour Pop',
  emoji: '🎨',
  hint: 'Only you stay in colour',
  needs: { segmentation: true },

  shader: `
vec4 effect(vec2 uv) {
  vec3 c = cam(uv).rgb;
  float m = smoothstep(0.35, 0.65, personMask(uv));
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 grey = vec3((g - 0.5) * 1.15 + 0.48);
  // Boost saturation and contrast on the person.
  vec3 pop = mix(vec3(g), c, 1.55);
  pop = (pop - 0.5) * 1.08 + 0.52;
  return vec4(mix(grey, clamp(pop, 0.0, 1.0), m), 1.0);
}`,
};

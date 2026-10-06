// Shared builder for the 360 worlds: the room behind you is replaced by an
// equirectangular panorama that you look around with the phone's motion
// sensor (or your head turn on a laptop). See ../README.md (view, pano).

export const PW = 2048, PH = 1024;

// Seeded random so a stand-in panorama is the same every time.
export function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Runs draw(rand) three times (shifted by -w, 0, w) so anything crossing the
// left or right edge continues on the other side. rand restarts from the same
// seed each time so all three copies match.
export function wrap(ctx, w, draw, seed = 1) {
  for (const dx of [-w, 0, w]) {
    ctx.save();
    ctx.translate(dx, 0);
    draw(rng(seed));
    ctx.restore();
  }
}

// A vertical gradient from stops [[position, colour], ...].
export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [p, c] of stops) g.addColorStop(p, c);
  return g;
}

export function makeWorld({ id, name, emoji, asset, hint, paint, tint = [1, 0.8, 0.6] }) {
  const stand = (s) => {
    if (!s.pano) {
      const cv = document.createElement('canvas');
      cv.width = PW;
      cv.height = PH;
      paint(cv.getContext('2d'), PW, PH);
      cv.dirty = true;
      s.pano = cv;
    }
    return s.pano;
  };
  return {
    id,
    name,
    emoji,
    hint: hint || 'Tilt your phone or turn your head to look around',
    needs: { segmentation: true, orientation: true, face: true },

    start(s) {
      stand(s);
    },

    background(f) {
      return f.img(asset) || stand(f.state);
    },

    uniforms() {
      return { u_tint: tint };
    },

    shader: `
uniform vec3 u_tint;
vec4 effect(vec2 uv) {
  vec4 c = cam(uv);
  float m = smoothstep(0.35, 0.65, personMask(uv));
  vec3 back = pano(uv, 1.2).rgb;
  // Subtle rim light in the world's mood near the mask edge.
  vec2 o = 3.0 / u_res;
  float inner = personMask(uv + vec2(o.x, 0.0)) * personMask(uv - vec2(o.x, 0.0)) * personMask(uv + vec2(0.0, o.y)) * personMask(uv - vec2(0.0, o.y));
  float edge = m * (1.0 - smoothstep(0.2, 0.9, inner));
  vec3 person = c.rgb * mix(vec3(1.0), 0.85 + 0.3 * u_tint, 0.35) + u_tint * edge * 0.5;
  return vec4(mix(back, person, m), 1.0);
}`,
  };
}

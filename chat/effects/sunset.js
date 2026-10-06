// Sunset: a sunset behind you, and you become a silhouette with a warm rim.

const W = 1920, H = 1080;

function makeSunset() {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  const hz = H * 0.62;
  const g = c.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#3a1f6e');
  g.addColorStop(0.35, '#c2407e');
  g.addColorStop(0.7, '#ff8a4a');
  g.addColorStop(1, '#ffd36e');
  c.fillStyle = g;
  c.fillRect(0, 0, W, hz);
  const sg = c.createRadialGradient(W * 0.5, hz, 20, W * 0.5, hz, 520);
  sg.addColorStop(0, 'rgba(255,240,170,0.9)');
  sg.addColorStop(1, 'rgba(255,170,80,0)');
  c.fillStyle = sg;
  c.fillRect(0, 0, W, hz);
  // Streaky clouds.
  c.fillStyle = 'rgba(255,120,120,0.35)';
  for (const [x, y, w] of [[200, 160, 520], [1100, 220, 640], [1500, 100, 380], [500, 330, 460]]) {
    c.beginPath();
    c.ellipse(x, y, w / 2, 16, 0, 0, 7);
    c.fill();
  }
  // Sun disc on the horizon.
  c.fillStyle = '#fff3b0';
  c.beginPath();
  c.arc(W * 0.5, hz, 130, Math.PI, 0);
  c.fill();
  // Sea with a golden glitter path.
  const sea = c.createLinearGradient(0, hz, 0, H);
  sea.addColorStop(0, '#ff9a5a');
  sea.addColorStop(0.3, '#b04a7a');
  sea.addColorStop(1, '#2a1a4a');
  c.fillStyle = sea;
  c.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 70; i++) {
    const y = hz + 8 + i * 6.2, wd = 40 + i * 5;
    c.fillStyle = `rgba(255,235,160,${0.8 - i / 100})`;
    c.fillRect(W * 0.5 - wd / 2 + Math.sin(i * 1.7) * 18, y, wd, 2.5);
  }
  // Palm silhouettes at both sides.
  c.fillStyle = '#1a0a22';
  c.strokeStyle = '#1a0a22';
  c.lineCap = 'round';
  for (const [x, lean, hg] of [[150, 60, 640], [330, -40, 480], [1770, -70, 620], [1600, 40, 420]]) {
    const tx = x + lean, ty = H - hg;
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(x, H);
    c.quadraticCurveTo(x + lean * 0.1, H - hg * 0.6, tx, ty);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.55, len = hg * 0.4;
      c.beginPath();
      c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len - 30, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.6 + len * 0.45);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.4 + 14, tx, ty);
      c.fill();
    }
  }
  cv.dirty = true;
  return cv;
}

export default {
  id: 'sunset',
  name: 'Sunset',
  emoji: '🌅',
  hint: 'Become a silhouette',
  needs: { segmentation: true },

  start(s) {
    s.back = makeSunset();
  },

  background(f) {
    return f.img('sunset') || f.state.back || (f.state.back = makeSunset());
  },

  shader: `
vec4 effect(vec2 uv) {
  float m = smoothstep(0.35, 0.65, personMask(uv));
  vec3 back = bg(uv).rgb;
  vec2 o = 4.0 / u_res;
  float inner = personMask(uv + vec2(o.x, 0.0)) * personMask(uv - vec2(o.x, 0.0)) * personMask(uv + vec2(0.0, o.y)) * personMask(uv - vec2(0.0, o.y));
  float edge = m * (1.0 - smoothstep(0.2, 0.9, inner));
  // Near-black silhouette, warm rim, and a faint glow from the sun side.
  vec3 sil = vec3(0.05, 0.02, 0.07) + cam(uv).rgb * 0.05;
  sil += vec3(1.0, 0.55, 0.25) * edge * 0.85;
  return vec4(mix(back, sil, m), 1.0);
}`,
};

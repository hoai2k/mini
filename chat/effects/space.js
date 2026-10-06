// Outer Space: the room behind you is swapped for a cartoon galaxy.

const W = 1280, H = 720;

// Seeded random so the stars are the same each time.
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function star(c, x, y, r, alpha) {
  c.globalAlpha = alpha;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  if (r > 1.8) {
    c.fillRect(x - r * 2.4, y - 0.6, r * 4.8, 1.2);
    c.fillRect(x - 0.6, y - r * 2.4, 1.2, r * 4.8);
  }
  c.globalAlpha = 1;
}

function makeBackdrop() {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  const rand = rng(7);
  const g = c.createRadialGradient(W / 2, H * 0.55, 60, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, '#2a1458');
  g.addColorStop(0.6, '#1c0d44');
  g.addColorStop(1, '#0c0524');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // Soft nebula clouds.
  for (const [x, y, r, col] of [[900, 150, 320, 'rgba(255,90,200,0.16)'], [250, 560, 360, 'rgba(70,120,255,0.16)'], [1050, 600, 280, 'rgba(120,60,255,0.18)']]) {
    const n = c.createRadialGradient(x, y, 0, x, y, r);
    n.addColorStop(0, col);
    n.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = n;
    c.fillRect(0, 0, W, H);
  }
  // Stars of varied size and brightness.
  const cols = ['#ffffff', '#ffe9a8', '#bfe3ff', '#ffc4ef'];
  for (let i = 0; i < 380; i++) {
    c.fillStyle = cols[Math.floor(rand() * cols.length)];
    const big = rand() < 0.06;
    star(c, rand() * W, rand() * H, big ? 2 + rand() * 1.8 : 0.5 + rand() * 1.3, 0.35 + rand() * 0.65);
  }

  // Ringed pink planet, upper left.
  const px = 190, py = 170, pr = 92;
  c.save();
  c.translate(px, py);
  c.rotate(-0.32);
  const ring = (front) => {
    c.save();
    c.beginPath();
    if (front) c.rect(-300, 0, 600, 300); else c.rect(-300, -300, 600, 300);
    c.clip();
    c.beginPath();
    c.ellipse(0, 0, pr * 1.8, pr * 0.5, 0, 0, Math.PI * 2);
    c.lineWidth = 22;
    c.strokeStyle = '#ffd36e';
    c.stroke();
    c.beginPath();
    c.ellipse(0, 0, pr * 1.8, pr * 0.5, 0, 0, Math.PI * 2);
    c.lineWidth = 8;
    c.strokeStyle = '#ff9a5c';
    c.stroke();
    c.restore();
  };
  ring(false);
  const pg = c.createRadialGradient(-pr * 0.35, -pr * 0.4, 8, 0, 0, pr);
  pg.addColorStop(0, '#ffc2e6');
  pg.addColorStop(0.55, '#ff6fba');
  pg.addColorStop(1, '#c23a95');
  c.beginPath();
  c.arc(0, 0, pr, 0, Math.PI * 2);
  c.fillStyle = pg;
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = '#8f2470';
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.beginPath();
  c.ellipse(-pr * 0.38, -pr * 0.45, pr * 0.28, pr * 0.14, -0.7, 0, Math.PI * 2);
  c.fill();
  ring(true);
  c.restore();

  // Smiling moon, right.
  const mx = 1130, my = 330, mr = 62;
  c.beginPath();
  c.arc(mx, my, mr, 0, Math.PI * 2);
  const mg = c.createRadialGradient(mx - 20, my - 22, 6, mx, my, mr);
  mg.addColorStop(0, '#fffbe0');
  mg.addColorStop(1, '#f1d98a');
  c.fillStyle = mg;
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = '#bd9e4a';
  c.stroke();
  c.fillStyle = '#e6c673';
  for (const [dx, dy, r] of [[-30, 18, 11], [30, -28, 9], [34, 22, 7]]) {
    c.beginPath();
    c.arc(mx + dx, my + dy, r, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#5a4415';
  c.beginPath();
  c.arc(mx - 18, my - 8, 5, 0, Math.PI * 2);
  c.arc(mx + 14, my - 8, 5, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.strokeStyle = '#5a4415';
  c.beginPath();
  c.arc(mx - 2, my + 6, 20, 0.25, Math.PI - 0.25);
  c.stroke();
  c.fillStyle = 'rgba(255,140,140,0.5)';
  c.beginPath();
  c.ellipse(mx - 34, my + 10, 8, 5, 0, 0, Math.PI * 2);
  c.ellipse(mx + 30, my + 10, 8, 5, 0, 0, Math.PI * 2);
  c.fill();

  // A tiny rocket far away, lower left.
  c.save();
  c.translate(330, 590);
  c.rotate(0.7);
  c.fillStyle = '#ffb347';
  c.beginPath();
  c.moveTo(-6, 22);
  c.quadraticCurveTo(0, 52, 6, 22);
  c.fill();
  c.fillStyle = '#ff5a5a';
  c.beginPath();
  c.moveTo(-12, 16);
  c.lineTo(-24, 30);
  c.lineTo(-8, 22);
  c.moveTo(12, 16);
  c.lineTo(24, 30);
  c.lineTo(8, 22);
  c.fill();
  c.beginPath();
  c.moveTo(0, -34);
  c.quadraticCurveTo(16, -10, 11, 24);
  c.lineTo(-11, 24);
  c.quadraticCurveTo(-16, -10, 0, -34);
  c.fillStyle = '#f4f7ff';
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = '#7d86b8';
  c.stroke();
  c.beginPath();
  c.arc(0, -6, 6, 0, Math.PI * 2);
  c.fillStyle = '#6fd0ff';
  c.fill();
  c.stroke();
  c.restore();
  cv.dirty = true;
  return cv;
}

export default {
  id: 'space',
  name: 'Outer Space',
  emoji: '🚀',
  hint: 'The room behind you becomes outer space',
  needs: { segmentation: true },

  start(s) {
    s.backdrop = makeBackdrop();
  },

  background(f) {
    return f.img('space') || f.state.backdrop || (f.state.backdrop = makeBackdrop());
  },

  shader: `
vec4 effect(vec2 uv) {
  vec4 c = cam(uv);
  float m = smoothstep(0.35, 0.65, personMask(uv));
  vec3 back = bg(uv).rgb;
  // A faint cool rim light on the person near the mask edge.
  vec2 o = 3.0 / u_res;
  float inner = personMask(uv + vec2(o.x, 0.0)) * personMask(uv - vec2(o.x, 0.0)) * personMask(uv + vec2(0.0, o.y)) * personMask(uv - vec2(0.0, o.y));
  float edge = m * (1.0 - smoothstep(0.2, 0.9, inner));
  vec3 person = c.rgb + vec3(0.25, 0.5, 1.0) * edge * 0.55;
  return vec4(mix(back, person, m), 1.0);
}`,
};

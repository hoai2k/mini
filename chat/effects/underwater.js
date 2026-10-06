// Under the Sea: blue-green water with drifting light ripples, fish swimming
// past and bubbles when you blow from your mouth.

const FISH = [
  { name: 'fish-1', size: 0.26, speed: 0.07, depth: 0.28, bob: 0.02, dir: 1 },
  { name: 'fish-2', size: 0.2, speed: 0.11, depth: 0.7, bob: 0.015, dir: -1 },
  { name: 'fish-3', size: 0.15, speed: 0.045, depth: 0.5, bob: 0.025, dir: 1 },
  { name: 'fish-1', size: 0.12, speed: 0.13, depth: 0.85, bob: 0.01, dir: -1 },
];

const OUTLINE = (c, col) => {
  c.lineWidth = 7;
  c.lineJoin = 'round';
  c.strokeStyle = col;
  c.stroke();
};

// Stand-in fish in a 384 x 256 box, facing right.
function standIn(kind) {
  const cv = document.createElement('canvas');
  cv.width = 384;
  cv.height = 256;
  const c = cv.getContext('2d');
  const eye = (x, y, r) => {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
    c.beginPath();
    c.arc(x + r * 0.2, y, r * 0.55, 0, Math.PI * 2);
    c.fillStyle = '#1b1b2e';
    c.fill();
    c.beginPath();
    c.arc(x + r * 0.35, y - r * 0.2, r * 0.18, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
  };
  const gloss = (x, y, rx, ry, rot = -0.2) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.fill();
  };
  if (kind === 0) {
    // Clownfish: orange body, white bands.
    c.beginPath();
    c.moveTo(80, 128);
    c.quadraticCurveTo(20, 60, 36, 40);
    c.quadraticCurveTo(70, 40, 96, 100);
    c.moveTo(80, 128);
    c.quadraticCurveTo(20, 196, 36, 216);
    c.quadraticCurveTo(70, 216, 96, 156);
    c.closePath();
    c.fillStyle = '#ff8a1f';
    c.fill();
    OUTLINE(c, '#c4520a');
    c.beginPath();
    c.ellipse(205, 128, 130, 88, 0, 0, Math.PI * 2);
    c.fillStyle = '#ff8a1f';
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = '#fff';
    for (const x of [150, 250]) {
      c.fillRect(x, 0, 28, 256);
      c.fillStyle = '#ffe9d6';
    }
    c.strokeStyle = '#2a1a1a';
    c.lineWidth = 5;
    c.strokeRect(150, 0, 28, 256);
    c.strokeRect(250, 0, 28, 256);
    c.restore();
    c.beginPath();
    c.ellipse(205, 128, 130, 88, 0, 0, Math.PI * 2);
    OUTLINE(c, '#c4520a');
    c.beginPath();
    c.moveTo(150, 46);
    c.quadraticCurveTo(205, 0, 270, 50);
    c.closePath();
    c.fillStyle = '#ff9d3f';
    c.fill();
    OUTLINE(c, '#c4520a');
    eye(285, 112, 16);
    c.beginPath();
    c.arc(318, 150, 18, 0.2, Math.PI - 0.2);
    c.lineWidth = 5;
    c.strokeStyle = '#8a3507';
    c.stroke();
    gloss(210, 80, 60, 14);
  } else if (kind === 1) {
    // Blue tang with a yellow tail.
    c.beginPath();
    c.moveTo(80, 128);
    c.lineTo(14, 52);
    c.quadraticCurveTo(40, 128, 14, 204);
    c.closePath();
    c.fillStyle = '#ffd92e';
    c.fill();
    OUTLINE(c, '#c09a00');
    c.beginPath();
    c.ellipse(210, 128, 125, 95, 0, 0, Math.PI * 2);
    c.fillStyle = '#2f8cff';
    c.fill();
    OUTLINE(c, '#1550b8');
    c.save();
    c.clip();
    c.beginPath();
    c.moveTo(120, 90);
    c.quadraticCurveTo(220, 40, 290, 130);
    c.quadraticCurveTo(210, 90, 160, 150);
    c.closePath();
    c.fillStyle = '#16257a';
    c.fill();
    c.restore();
    c.beginPath();
    c.moveTo(150, 46);
    c.quadraticCurveTo(210, 4, 290, 54);
    c.closePath();
    c.fillStyle = '#ffd92e';
    c.fill();
    OUTLINE(c, '#c09a00');
    eye(290, 112, 15);
    c.beginPath();
    c.arc(322, 150, 14, 0.2, Math.PI - 0.2);
    c.lineWidth = 5;
    c.strokeStyle = '#102a80';
    c.stroke();
    gloss(210, 70, 62, 13);
  } else {
    // Spotted yellow pufferfish.
    c.fillStyle = '#ffcf33';
    c.beginPath();
    c.moveTo(70, 128);
    c.lineTo(14, 80);
    c.lineTo(34, 128);
    c.lineTo(14, 176);
    c.closePath();
    c.fill();
    OUTLINE(c, '#b87d00');
    c.beginPath();
    c.arc(205, 128, 108, 0, Math.PI * 2);
    c.fillStyle = '#ffd84a';
    c.fill();
    OUTLINE(c, '#b87d00');
    c.save();
    c.clip();
    c.fillStyle = '#fff2b0';
    c.beginPath();
    c.ellipse(205, 200, 100, 60, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e8a21a';
    for (const [x, y, r] of [[150, 80, 10], [200, 60, 8], [240, 90, 11], [170, 130, 8], [215, 140, 9], [130, 160, 7], [260, 170, 7]]) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // Little spikes.
    c.strokeStyle = '#b87d00';
    c.lineWidth = 6;
    c.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + i * 0.4;
      c.beginPath();
      c.moveTo(205 + Math.cos(a) * 106, 128 + Math.sin(a) * 106);
      c.lineTo(205 + Math.cos(a) * 124, 128 + Math.sin(a) * 124);
      c.stroke();
    }
    eye(270, 108, 20);
    c.beginPath();
    c.ellipse(312, 150, 12, 9, 0, 0, Math.PI * 2);
    c.fillStyle = '#ff7d6a';
    c.fill();
    OUTLINE(c, '#b04030');
    gloss(180, 70, 55, 16);
  }
  return cv;
}

export default {
  id: 'underwater',
  name: 'Under the Sea',
  emoji: '🐠',
  hint: 'Open your mouth to blow bubbles',
  needs: { face: true },
  shader: `
vec4 effect(vec2 uv) {
  float t = u_time;
  // Gentle wavy distortion.
  vec2 w = vec2(sin(uv.y * 14.0 + t * 1.6) * 0.004 + sin(uv.y * 31.0 - t * 2.3) * 0.0015,
                cos(uv.x * 11.0 + t * 1.3) * 0.004);
  vec3 c = cam(uv + w).rgb;
  // Blue-green tint, deeper towards the bottom.
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 water = mix(c * vec3(0.55, 0.9, 1.0), vec3(0.05, 0.45, 0.6) * (0.4 + l), 0.35);
  water *= mix(1.0, 0.65, uv.y);
  // Caustics: crossing sine ripples, brightest near the surface.
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 7.0;
  float a = sin(p.x * 1.3 + sin(p.y * 1.7 + t * 0.9) * 1.5 + t * 0.8);
  float b = sin(p.y * 1.9 + sin(p.x * 1.1 - t * 0.7) * 1.7 - t * 0.6);
  float cc = sin((p.x + p.y) * 1.2 + sin(p.x * 0.8 - p.y * 1.3 + t) * 1.4);
  float caustic = pow(max(0.0, 1.0 - abs(a + b + cc) * 0.55), 3.0);
  water += vec3(0.5, 0.95, 0.9) * caustic * 0.35 * (1.1 - uv.y);
  return vec4(water, 1.0);
}`,

  start(s, info) {
    s.fish = [0, 1, 2].map(standIn);
    s.swim = FISH.map((f, i) => ({ ...f, x: ((i * 0.37) % 1) * 1.4 - 0.2, phase: i * 1.9 }));
    s.bubbles = [];
    s.puff = 0;
  },

  draw(ctx, f) {
    const s = f.state;
    // Fish.
    for (const k of s.swim) {
      k.x += k.dir * k.speed * f.dt;
      const wFish = f.w * k.size;
      const hFish = wFish * (256 / 384);
      if (k.dir > 0 && k.x * f.w > f.w + wFish) k.x = -wFish / f.w;
      if (k.dir < 0 && k.x * f.w < -wFish) k.x = 1 + wFish / f.w;
      const y = k.depth * f.h + Math.sin(f.t * 1.4 + k.phase) * k.bob * f.h;
      const tilt = Math.cos(f.t * 1.4 + k.phase) * 0.08 * k.dir;
      const art = f.img(k.name);
      ctx.save();
      ctx.translate(k.x * f.w, y);
      ctx.rotate(tilt);
      ctx.scale(k.dir, 1);
      const src = art || s.fish[Number(k.name.slice(-1)) - 1];
      ctx.drawImage(src, -wFish / 2, -hFish / 2, wFish, hFish);
      ctx.restore();
    }

    // Bubbles from the mouth.
    const face = f.face;
    if (face) {
      const open = face.mouthOpen > 0.4;
      s.puff -= f.dt;
      if (s.puff <= 0) {
        s.puff = open ? 0.06 : 0.6;
        const n = open ? 2 : 1;
        for (let i = 0; i < n; i++) {
          s.bubbles.push({
            x: face.mouth.x + (Math.random() - 0.5) * face.scale * 0.3,
            y: face.mouth.y,
            r: face.scale * (0.05 + Math.random() * (open ? 0.18 : 0.1)),
            vx: (Math.random() - 0.5) * face.scale * 0.4,
            ph: Math.random() * 6,
          });
        }
      }
    }
    s.bubbles = s.bubbles.filter(b => {
      b.y -= f.h * 0.22 * f.dt * (0.7 + b.r / 20);
      b.x += (b.vx + Math.sin(f.t * 3 + b.ph) * 14) * f.dt;
      if (b.y + b.r < -5) return false;
      const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.5, 'rgba(190,240,255,0.12)');
      g.addColorStop(1, 'rgba(160,230,255,0.35)');
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.stroke();
      return true;
    });
  },
};

// Storm Cloud: a grumpy little rain cloud floats above your head and rains on
// you. Frown (or press Space) and it zaps a lightning bolt past your face with
// a white flash; smile and the rain stops and the cloud cheers up.

const MAX_DROPS = 220;
const ZAP_GAP = 1.2;   // seconds between strikes
const ZAP_TIME = 0.25; // how long the bolt shows
const FLASH = 0.18;    // how long the screen flash lasts

function bake(draw, w, h, sw, sh) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.scale(w / sw, h / sh);
  draw(c);
  return cv;
}

// Fluffy flat-bottomed cloud body in a 768 x 384 box.
function cloudBody(c, top, bottom) {
  const puffs = [[170, 235, 105], [300, 160, 135], [450, 140, 130], [590, 215, 110], [660, 260, 70], [95, 270, 62]];
  const shape = () => {
    c.beginPath();
    c.roundRect(70, 215, 640, 112, 56);
    for (const [x, y, r] of puffs) {
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, Math.PI * 2);
    }
  };
  c.lineJoin = 'round';
  shape();
  c.lineWidth = 30;
  c.strokeStyle = '#262b42';
  c.stroke();
  const g = c.createLinearGradient(0, 20, 0, 330);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  shape();
  c.fillStyle = g;
  c.fill();
  // Soft highlight on the upper puffs.
  c.beginPath();
  c.ellipse(285, 90, 62, 22, -0.5, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.fill();
}

function eye(c, x, y, mood) {
  c.save();
  c.translate(x, y);
  if (mood === 'happy') {
    c.beginPath();
    c.arc(0, 8, 24, Math.PI * 1.1, Math.PI * 1.9);
    c.lineWidth = 12;
    c.lineCap = 'round';
    c.strokeStyle = '#181c2c';
    c.stroke();
  } else {
    c.beginPath();
    c.ellipse(0, 0, 25, 30, 0, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = '#181c2c';
    c.stroke();
    c.beginPath();
    c.arc(0, 6, 11, 0, Math.PI * 2);
    c.fillStyle = '#181c2c';
    c.fill();
  }
  c.restore();
}

function drawCloud(c, mood) {
  const happy = mood === 'happy';
  if (happy) cloudBody(c, '#a8b4d6', '#7a86ac');
  else cloudBody(c, '#6f7898', '#454c6c');
  eye(c, 305, 215, mood);
  eye(c, 475, 215, mood);
  c.lineCap = 'round';
  c.strokeStyle = '#181c2c';
  c.fillStyle = '#181c2c';
  if (happy) {
    // Smile and blush.
    c.beginPath();
    c.arc(390, 238, 46, Math.PI * 0.1, Math.PI * 0.9);
    c.lineWidth = 12;
    c.stroke();
    c.fillStyle = 'rgba(255,130,160,0.55)';
    for (const x of [250, 530]) {
      c.beginPath();
      c.ellipse(x, 262, 28, 17, 0, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    // Angry brows and a frown.
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(262, 160); c.lineTo(340, 190);
    c.moveTo(518, 160); c.lineTo(440, 190);
    c.stroke();
    c.beginPath();
    c.arc(390, 318, 46, Math.PI * 1.15, Math.PI * 1.85);
    c.lineWidth = 12;
    c.stroke();
  }
}

// Zig-zag bolt in a 256 x 512 box, tip at the bottom centre.
function drawBolt(c) {
  const pts = [[96, 6], [196, 6], [152, 190], [214, 190], [128, 506], [140, 276], [66, 276]];
  const path = k => {
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const px = 140 + (x - 140) * k, py = 256 + (y - 256) * k;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    });
    c.closePath();
  };
  c.lineJoin = 'round';
  path(1);
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#fff176');
  g.addColorStop(1, '#ffb800');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 14;
  c.strokeStyle = '#c47a00';
  c.stroke();
  path(0.55);
  c.fillStyle = '#fff';
  c.fill();
}

export default {
  id: 'storm',
  name: 'Storm Cloud',
  emoji: '⛈️',
  hint: 'Frown for lightning, smile to stop the rain',
  needs: { face: true },

  start(s) {
    s.pos = null;
    s.vel = { x: 0, y: 0 };
    s.vis = 0;
    s.rain = 1;
    s.cheer = 0;
    s.drops = [];
    s.acc = 0;
    s.zapAt = -10;
    s.zap = null;
    s.grumpy = bake(c => drawCloud(c, 'grumpy'), 384, 192, 768, 384);
    s.happy = bake(c => drawCloud(c, 'happy'), 384, 192, 768, 384);
    s.bolt = bake(drawBolt, 128, 256, 256, 512);
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    s.grumpy ??= bake(c => drawCloud(c, 'grumpy'), 384, 192, 768, 384);
    s.happy ??= bake(c => drawCloud(c, 'happy'), 384, 192, 768, 384);
    s.bolt ??= bake(drawBolt, 128, 256, 256, 512);
    s.drops ??= [];
    s.vel ??= { x: 0, y: 0 };
    s.vis ??= 0;
    s.rain ??= 1;
    s.cheer ??= 0;
    s.acc ??= 0;
    s.zapAt ??= -10;

    const k = 1 - Math.exp(-f.dt * 5);
    if (face) {
      s.scale = face.scale;
      const cw = face.scale * 3.2, ch = cw / 2;
      const target = {
        x: face.forehead.x,
        // Keep most of the cloud in frame even for a face near the top.
        y: Math.max(face.forehead.y - face.scale * 1.3, ch * 0.52),
      };
      if (!s.pos) s.pos = { x: target.x, y: target.y };
      // Soft spring so the cloud trails the head.
      const dt = Math.min(f.dt, 0.033);
      s.vel.x += ((target.x - s.pos.x) * 70 - s.vel.x * 12) * dt;
      s.vel.y += ((target.y - s.pos.y) * 70 - s.vel.y * 12) * dt;
      s.pos.x += s.vel.x * dt;
      s.pos.y += s.vel.y * dt;
      s.chinY = face.chin.y;
      s.faceX = face.nose.x;
    }
    s.vis += ((face ? 1 : 0) - s.vis) * k;
    const cheerUp = face && face.smile > 0.5;
    s.rain += ((cheerUp ? 0 : 1) - s.rain) * k;
    s.cheer += ((cheerUp ? 1 : 0) - s.cheer) * k;

    const scale = s.scale ?? f.w * 0.16;
    const cw = scale * 3.2, ch = cw / 2;
    const cx = s.pos ? s.pos.x : 0;
    const cy = s.pos ? s.pos.y + Math.sin(f.t * 2) * scale * 0.04 : 0;

    // Rain falls from under the cloud and runs on after the cloud is gone.
    if (s.pos && s.vis > 0.3 && s.rain > 0.1) {
      s.acc += f.dt * 110 * s.rain;
      while (s.acc >= 1) {
        s.acc -= 1;
        if (s.drops.length >= MAX_DROPS) break;
        s.drops.push({
          x: cx + (Math.random() - 0.5) * cw * 0.72,
          y: cy + ch * 0.3,
          vy: scale * (6 + Math.random() * 3),
          a: 0.5 + Math.random() * 0.4,
        });
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, scale * 0.028);
    const slant = -scale * 1.1;
    s.drops = s.drops.filter(d => {
      d.y += d.vy * f.dt;
      d.x += slant * f.dt;
      ctx.strokeStyle = `rgba(160,210,255,${d.a})`;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - slant * 0.045, d.y - d.vy * 0.045);
      ctx.stroke();
      return d.y < f.h + 20;
    });
    ctx.restore();

    // Lightning from the cloud down past the face.
    if (face && (face.frown > 0.4 || f.input.pressed) && f.t - s.zapAt > ZAP_GAP) {
      s.zapAt = f.t;
      s.zap = { age: 0, x: face.nose.x, flip: Math.random() < 0.5 };
      f.sfx('zap');
    }
    let flash = 0;
    if (s.zap) {
      s.zap.age += f.dt;
      if (s.zap.age > ZAP_TIME) s.zap = null;
      else {
        const top = cy + ch * 0.25;
        const bottom = (s.chinY ?? f.h * 0.7) + scale * 0.6;
        const H = Math.max(scale, bottom - top);
        const W = Math.max(scale * 0.9, H * 0.45);
        const flick = s.zap.age < 0.08 || Math.sin(s.zap.age * 90) > -0.3 ? 1 : 0.35;
        ctx.save();
        ctx.globalAlpha = flick * Math.min(1, (ZAP_TIME - s.zap.age) * 12);
        ctx.shadowColor = '#fff6a0';
        ctx.shadowBlur = scale * 0.5;
        ctx.translate(s.zap.x, top);
        if (s.zap.flip) ctx.scale(-1, 1);
        ctx.drawImage(f.img('lightning') ?? s.bolt, -W / 2, 0, W, H);
        ctx.restore();
        flash = Math.max(0, 1 - s.zap.age / FLASH) * 0.75;
      }
    }

    if (s.pos && s.vis > 0.02) {
      ctx.save();
      ctx.globalAlpha = s.vis;
      ctx.translate(cx, cy);
      // Sways a touch and squashes slightly while it rumbles.
      ctx.rotate(Math.sin(f.t * 1.6) * 0.03 + s.vel.x * 0.0004);
      const art = f.img('storm-cloud');
      if (art) {
        if (s.cheer > 0.05) ctx.filter = `brightness(${1 + 0.35 * s.cheer})`;
        ctx.drawImage(art, -cw / 2, -ch / 2, cw, ch);
      } else {
        ctx.drawImage(s.grumpy, -cw / 2, -ch / 2, cw, ch);
        if (s.cheer > 0.02) {
          ctx.globalAlpha = s.vis * s.cheer;
          ctx.drawImage(s.happy, -cw / 2, -ch / 2, cw, ch);
        }
      }
      ctx.restore();
    }

    if (flash > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${flash})`;
      ctx.fillRect(0, 0, f.w, f.h);
    }
  },
};

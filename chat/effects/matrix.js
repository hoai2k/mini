// Code Rain: falling green glyphs behind you, and you tinted green.

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ';
const CELL = 18;

function makeRain(w, h) {
  const rain = document.createElement('canvas');
  rain.width = w;
  rain.height = h;
  const cols = Math.ceil(w / CELL);
  const drops = [];
  for (let i = 0; i < cols; i++) drops.push({ y: Math.random() * -h / CELL, speed: 8 + Math.random() * 14, acc: 0 });
  const person = document.createElement('canvas');
  person.width = w;
  person.height = h;
  return { rain, drops, person, w, h };
}

export default {
  id: 'matrix',
  name: 'Code Rain',
  emoji: '🟩',
  hint: 'Enter the code',
  needs: { segmentation: true },

  start(s) {
    s.m = null;
  },

  draw(ctx, f) {
    const s = f.state;
    if (!s.m || s.m.w !== f.w || s.m.h !== f.h) s.m = makeRain(f.w, f.h);
    const { rain, drops, person } = s.m;
    const r = rain.getContext('2d');
    // Fade the old trails, then add a new glyph at each falling head.
    r.fillStyle = `rgba(0,10,0,${Math.min(0.5, 6 * f.dt)})`;
    r.fillRect(0, 0, f.w, f.h);
    r.font = `bold ${CELL - 2}px monospace`;
    r.textAlign = 'center';
    drops.forEach((d, i) => {
      d.y += d.speed * f.dt;
      const row = Math.floor(d.y);
      if (row !== d.row) {
        d.row = row;
        const x = i * CELL + CELL / 2, y = row * CELL;
        r.fillStyle = '#031203';
        r.fillRect(x - CELL / 2, y - CELL + 2, CELL, CELL);
        r.fillStyle = Math.random() < 0.1 ? '#e8ffe8' : '#2cff5a';
        r.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], x, y);
      }
      if (d.y * CELL > f.h + 200 && Math.random() < 0.05) {
        d.y = -Math.random() * 10;
        d.speed = 8 + Math.random() * 14;
      }
    });
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, f.w, f.h);
    ctx.drawImage(rain, 0, 0);
    const p = f.person();
    if (!p) return;
    const pc = person.getContext('2d');
    pc.globalCompositeOperation = 'source-over';
    pc.clearRect(0, 0, f.w, f.h);
    pc.drawImage(p, 0, 0, f.w, f.h);
    // Green tint only where the person is.
    pc.globalCompositeOperation = 'multiply';
    pc.fillStyle = '#8affa0';
    pc.fillRect(0, 0, f.w, f.h);
    pc.globalCompositeOperation = 'destination-in';
    pc.drawImage(p, 0, 0, f.w, f.h);
    ctx.drawImage(person, 0, 0);
  },
};

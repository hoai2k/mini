// The Radio Bird: Tune In.
//
// Three little listeners sit on the sofa, and one of them calls for a
// station: the fiddle tunes, the trumpet, the drum band, the bells, the
// cuckoo clock or the weather. Turn the Radio Bird's dial through the static
// (tilt the stick or hold the arrows to sweep, spin the stick for fine
// tuning, or drag the needle along the dial) and watch the signal meter:
// it stirs as a station comes near, and the station's picture shows in the
// speaker once it is tuned in. Find the one they asked for and hold the
// needle on it while its song plays; drift off and the song fades and starts
// to slip back. Each station found is pencilled on the dial, but the stations
// drift about more and more as time goes on, and get narrower too. Holding
// the action turns the dial slowly, for a steady hand. Score: songs.

import { drawBird, drawSprite, scene, band, blob, poly, wash, ink, hatch, label, SHEETS, PAL, INK } from '../draw.js';
import { clamp, lerp, approach } from './index.js';

Object.assign(SHEETS, {
  'sprites.stations': [3, 2], // fiddle, trumpet, drum, bells, cuckoo clock, rain cloud
  'sprites.listeners': [3, 2], // three little birds: waiting (top row), delighted (bottom row)
  'sprites.dialPanel': [1, 1], // the long tuning-dial window
});

const DURATION = 50;
const STATIONS = [
  { name: 'fiddle', color: '#b0703a', tune: [0, 4, 7, 4, 9, 7, 4, 2] },
  { name: 'trumpet', color: PAL.mustard, tune: [0, 0, 7, 7, 9, 9, 7, 5] },
  { name: 'drum', color: PAL.brick, tune: [0, 0, 0, 12, 0, 0, 12, 0] },
  { name: 'bells', color: PAL.lemon, tune: [12, 7, 9, 4, 12, 9, 7, 4] },
  { name: 'cuckoo', color: PAL.green, tune: [7, 4, 7, 4, 7, 4, 0, 0] },
  { name: 'weather', color: PAL.slate, tune: [0, 2, 3, 2, 0, -2, 0, 3] },
];
// The dial window, and where the needle's frequency 0..1 sits in it.
const DIAL = { x0: 560, x1: 1500, y0: 112, y1: 262 };
const fx = (f) => lerp(DIAL.x0 + 30, DIAL.x1 - 30, f);
const xf = (x) => (x - DIAL.x0 - 30) / (DIAL.x1 - DIAL.x0 - 60);
const SONG = 3.2; // seconds of clear signal for a song
const SWEEP = 0.5; // dial widths per second at full tilt
const RADIO = { x: 300, y: 800, size: 520 };
const METER = { x: 700, y: 430 };
const SOFA = { x: 1180, y: 760 };
const BUBBLE = { x: 1180, y: 430 };

export default function create(env) {
  const { W, H, rng, sfx } = env;
  const g = {
    time: DURATION,
    score: 0,
    done: false,
    elapsed: 0,
    n: 0.5, // the needle
    stations: [],
    want: 0, // the station asked for
    song: 0, // how far through its song, 0..1
    noteT: 0,
    noteI: 0,
    marks: {}, // station index -> where it was found
    wrongT: 0,
    wrongSaid: -1,
    cheer: 0,
    asked: 0,
    staticT: 0,
    knob: 0,
    pops: [],
    notes: [], // floating music notes
    found: 0,
  };

  const progress = () => Math.min(1, g.elapsed / DURATION);
  const width = () => lerp(0.045, 0.027, progress());

  // Spread the six stations across the dial, apart from each other.
  const order = STATIONS.map((_, i) => i).sort(() => rng() - 0.5);
  const slots = order.map((_, i) => (i + 0.5) / STATIONS.length);
  order.forEach((si, k) => {
    g.stations[si] = { base: clamp(slots[k] + (rng() - 0.5) * 0.08, 0.04, 0.96), phase: rng() * Math.PI * 2, rate: 0.5 + rng() * 0.6 };
  });
  g.freq = (i) => {
    const s = g.stations[i];
    const amp = lerp(0.004, 0.024, progress());
    return clamp(s.base + amp * Math.sin(g.elapsed * s.rate * lerp(0.5, 1, progress()) + s.phase), 0.02, 0.98);
  };
  // How clearly station i comes in at the needle: 1 dead on, 0 off it.
  g.clarity = (i, n = g.n) => clamp(1 - Math.abs(n - g.freq(i)) / width(), 0, 1);
  // The strongest station near the needle, and the meter's reading (which
  // stirs a little before a station is reached).
  g.best = () => {
    let bi = -1;
    let bq = 0;
    g.stations.forEach((_, i) => {
      const q = g.clarity(i);
      if (q > bq) {
        bq = q;
        bi = i;
      }
    });
    return { i: bi, q: bq };
  };
  g.signal = () => {
    let s = 0;
    g.stations.forEach((_, i) => {
      const d = Math.abs(g.n - g.freq(i)) / width();
      s = Math.max(s, d < 1 ? 0.35 + 0.65 * (1 - d) : clamp(0.35 * (1 - (d - 1) / 3), 0, 0.35));
    });
    return s;
  };
  // The station tuned in well enough to hear, or -1.
  g.tuned = () => {
    const b = g.best();
    return b.q > 0.45 ? b.i : -1;
  };

  function pop(text, x, y, color = INK, size = 42) {
    g.pops.push({ text, x, y, color, size, life: 1.3 });
  }

  function ask() {
    let k = g.want;
    while (k === g.want) k = Math.floor(rng() * STATIONS.length);
    if (g.asked === 0) {
      // The first request: a station not too far from where the needle starts.
      const near = g.stations.map((s, i) => [Math.abs(s.base - g.n), i]).sort((a, b) => a[0] - b[0]);
      k = near[1][1];
    }
    g.want = k;
    g.asked++;
    g.song = 0;
    g.wrongSaid = -1;
  }
  ask();

  g.update = (dt, input) => {
    if (g.done) return;
    g.elapsed += dt;
    g.time = Math.max(0, DURATION - g.elapsed);
    if (g.time <= 0) {
      g.done = true;
      return;
    }

    // Turning the dial.
    const slow = input.action ? 0.25 : 1;
    const before = g.n;
    const p = input.pointer;
    if (p && p.active && p.down && p.y > DIAL.y0 - 60 && p.y < DIAL.y1 + 260) {
      g.n = approach(g.n, clamp(xf(p.x), 0, 1), 14 * slow, dt);
    } else {
      const x = input.x || 0;
      g.n += x * Math.abs(x) * SWEEP * slow * dt;
      g.n += (input.spin || 0) * 0.018;
    }
    g.n = clamp(g.n, 0, 1);
    g.knob += (g.n - before) * 40;

    // What comes through.
    const tuned = g.tuned();
    const q = tuned >= 0 ? g.clarity(tuned) : 0;
    if (tuned === g.want) {
      g.song = Math.min(1, g.song + (dt / SONG) * clamp((q - 0.3) / 0.5, 0.3, 1));
      g.wrongT = 0;
      g.noteT -= dt;
      if (g.noteT <= 0) {
        const st = STATIONS[g.want];
        g.noteT = 0.38;
        sfx('note', { freq: 392 * Math.pow(2, st.tune[g.noteI % st.tune.length] / 12), dur: 0.3 });
        g.noteI++;
        g.notes.push({ x: RADIO.x + 40 + rng() * 60, y: RADIO.y - 330, vx: 60 + rng() * 60, vy: -50 - rng() * 30, life: 1.6, color: st.color });
      }
      if (!g.marks[g.want]) {
        g.marks[g.want] = g.n;
        g.found++;
      }
      if (g.song >= 1) {
        g.score++;
        g.cheer = 1.4;
        pop('Hooray!', BUBBLE.x, BUBBLE.y - 110, PAL.magenta, 52);
        sfx('right');
        env.vibrate?.(30);
        ask();
      }
    } else {
      g.song = Math.max(0, g.song - dt * 0.35);
      if (tuned >= 0) {
        if (!g.marks[tuned]) g.marks[tuned] = g.n;
        g.wrongT += dt;
        if (g.wrongT > 0.8 && g.wrongSaid !== tuned) {
          g.wrongSaid = tuned;
          pop('Not that one!', BUBBLE.x, BUBBLE.y - 110, PAL.brick, 38);
          sfx('wrong');
        }
      } else {
        g.wrongT = 0;
        // static while the dial turns between stations
        g.staticT -= Math.abs(g.n - before) * 40 + dt * 0.5;
        if (g.staticT <= 0) {
          sfx('pour');
          g.staticT = 1;
        }
      }
    }
    g.cheer = Math.max(0, g.cheer - dt);

    for (const n of g.notes) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.life -= dt;
    }
    g.notes = g.notes.filter((n) => n.life > 0);
    for (const o of g.pops) {
      o.life -= dt;
      o.y -= 36 * dt;
    }
    g.pops = g.pops.filter((o) => o.life > 0);
  };

  g.hud = () => `Songs ${g.score}`;
  g.summary = () => [
    `${g.score} song${g.score === 1 ? '' : 's'} played for the listeners.`,
    `${Object.keys(g.marks).length} of ${STATIONS.length} stations found on the dial.`,
  ];

  // ---------- drawing ----------

  function drawRoom(c) {
    band(c, 0, 0, W, 600, '#e6d3b0', 0.7, 4);
    // wallpaper stripes
    c.save();
    c.globalAlpha = 0.12;
    for (let x = 0; x < W; x += 60) {
      c.fillStyle = PAL.mauve;
      c.fillRect(x, 0, 22, 600);
    }
    c.restore();
    // a lamp's warm glow
    const grd = c.createRadialGradient(1480, 380, 10, 1480, 380, 420);
    grd.addColorStop(0, 'rgba(255,220,140,0.45)');
    grd.addColorStop(1, 'rgba(255,220,140,0)');
    c.fillStyle = grd;
    c.fillRect(1000, 0, 600, 800);
    // the floor and rug
    band(c, 0, 600, W, 300, '#a9865a', 0.7, 5);
    blob(c, 700, 790, 560, 70, 3, 0.03);
    wash(c, PAL.dusty, 0.55);
    ink(c, 1.4);
  }

  function drawStationIcon(c, i, x, y, s = 1, alpha = 1) {
    c.save();
    c.globalAlpha *= alpha;
    if (drawSprite(c, 'sprites.stations', i, x, y, { h: 90 * s, anchor: 'center' })) {
      c.restore();
      return;
    }
    c.translate(x, y);
    c.scale(s, s);
    const st = STATIONS[i];
    if (st.name === 'fiddle') {
      blob(c, 0, 14, 22, 26, 1, 0.04);
      wash(c, st.color);
      ink(c, 2);
      blob(c, 0, -18, 17, 18, 2, 0.04);
      wash(c, st.color);
      ink(c, 2);
      c.beginPath();
      c.moveTo(0, -36);
      c.lineTo(0, -56);
      ink(c, 5, INK);
      c.beginPath();
      c.moveTo(-34, 30);
      c.lineTo(34, -40);
      ink(c, 2);
    } else if (st.name === 'trumpet') {
      poly(c, [[-36, -6], [12, -6], [36, -24], [36, 24], [12, 6], [-36, 6]], 3, 0.6);
      wash(c, st.color);
      ink(c, 2);
      for (const k of [-16, -6, 4]) {
        c.beginPath();
        c.moveTo(k, -6);
        c.lineTo(k, -18);
        ink(c, 3);
      }
    } else if (st.name === 'drum') {
      c.beginPath();
      c.ellipse(0, -16, 32, 10, 0, 0, Math.PI * 2);
      c.fillStyle = '#f4ecd8';
      c.fill();
      ink(c, 2);
      poly(c, [[-32, -16], [32, -16], [32, 22], [-32, 22]], 4, 0.6);
      wash(c, st.color);
      ink(c, 2);
      c.beginPath();
      c.moveTo(-32, -10);
      for (let k = 0; k < 6; k++) c.lineTo(-32 + (k + 0.5) * 64 / 6, k % 2 ? -8 : 18);
      ink(c, 1.4);
    } else if (st.name === 'bells') {
      for (const dx of [-18, 18]) {
        poly(c, [[dx - 8, -28], [dx + 8, -28], [dx + 20, 18], [dx - 20, 18]], dx, 1);
        wash(c, st.color);
        ink(c, 2);
        c.beginPath();
        c.arc(dx, 22, 5, 0, Math.PI * 2);
        c.fillStyle = INK;
        c.fill();
      }
    } else if (st.name === 'cuckoo') {
      poly(c, [[-26, 30], [26, 30], [26, -10], [0, -38], [-26, -10]], 5, 0.8);
      wash(c, '#b0703a');
      ink(c, 2);
      c.beginPath();
      c.arc(0, 4, 13, 0, Math.PI * 2);
      c.fillStyle = '#f4ecd8';
      c.fill();
      ink(c, 1.6);
      blob(c, -4, -22, 9, 7, 1, 0.05);
      wash(c, st.color);
      ink(c, 1.4);
    } else {
      blob(c, 0, -10, 34, 20, 6, 0.08);
      wash(c, '#c8ccd2');
      ink(c, 2);
      c.fillStyle = st.color;
      for (const dx of [-16, 0, 16]) {
        c.beginPath();
        c.moveTo(dx, 16);
        c.quadraticCurveTo(dx + 5, 26, dx, 30);
        c.quadraticCurveTo(dx - 5, 26, dx, 16);
        c.fill();
      }
    }
    c.restore();
  }

  function drawDial(c, t) {
    const { x0, x1, y0, y1 } = DIAL;
    if (!drawSprite(c, 'sprites.dialPanel', 0, (x0 + x1) / 2, (y0 + y1) / 2, { w: x1 - x0 + 40, anchor: 'center' })) {
      poly(c, [[x0 - 20, y0 - 20], [x1 + 20, y0 - 20], [x1 + 20, y1 + 20], [x0 - 20, y1 + 20]], 1, 1);
      wash(c, '#c9a24a');
      ink(c, 2.4);
      poly(c, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 2, 0.8);
      wash(c, '#f3e6c4');
      ink(c, 2);
      c.beginPath();
      for (let i = 0; i <= 40; i++) {
        const x = fx(i / 40);
        c.moveTo(x, y1 - 14);
        c.lineTo(x, y1 - (i % 5 ? 30 : 48));
      }
      ink(c, 1.6);
    }
    // the pencil marks of stations found
    for (const [k, f] of Object.entries(g.marks)) {
      const x = fx(f);
      c.save();
      c.globalAlpha = 0.75;
      drawStationIcon(c, +k, x, y0 + 40, 0.5);
      c.beginPath();
      c.moveTo(x, y0 + 64);
      c.lineTo(x, y0 + 78);
      ink(c, 1.4, '#6a6a6a');
      c.restore();
    }
    // the needle
    const nx = fx(g.n);
    c.beginPath();
    c.moveTo(nx, y0 + 6);
    c.lineTo(nx, y1 - 6);
    ink(c, 5, '#c0302a');
    // the knob, at the right end
    c.save();
    c.translate(x1 + 60, (y0 + y1) / 2);
    c.beginPath();
    c.arc(0, 0, 44, 0, Math.PI * 2);
    c.fillStyle = '#7a5a3a';
    c.fill();
    ink(c, 2.4);
    c.rotate(g.knob);
    for (let i = 0; i < 12; i++) {
      c.rotate(Math.PI / 6);
      c.beginPath();
      c.moveTo(30, 0);
      c.lineTo(42, 0);
      ink(c, 2, '#e6d3b0');
    }
    c.beginPath();
    c.arc(0, -24, 6, 0, Math.PI * 2);
    c.fillStyle = '#e6d3b0';
    c.fill();
    c.restore();
  }

  function drawMeter(c, t) {
    const { x, y } = METER;
    const s = g.signal();
    // a round magic-eye meter: green wedge closes as the signal strengthens
    c.beginPath();
    c.arc(x, y, 70, 0, Math.PI * 2);
    c.fillStyle = '#2a2a24';
    c.fill();
    ink(c, 3, '#c9a24a');
    const open = (1 - s) * Math.PI * 0.9 + 0.08;
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, 60, -Math.PI / 2 + open / 2, -Math.PI / 2 - open / 2 + Math.PI * 2);
    c.closePath();
    c.fillStyle = s > 0.7 ? '#9cf080' : '#5fb060';
    c.globalAlpha = 0.6 + 0.4 * s;
    c.fill();
    c.globalAlpha = 1;
    c.beginPath();
    c.arc(x, y, 16, 0, Math.PI * 2);
    c.fillStyle = '#2a2a24';
    c.fill();
    label(c, 'signal', x, y + 98, { size: 24, weight: 600, color: '#5a4a3a' });
    // the speaker: static, or the station's picture
    const sx = x + 210;
    c.beginPath();
    c.arc(sx, y, 70, 0, Math.PI * 2);
    c.fillStyle = '#d9c49a';
    c.fill();
    ink(c, 2.4);
    c.save();
    c.beginPath();
    c.arc(sx, y, 66, 0, Math.PI * 2);
    c.clip();
    hatch(c, sx - 70, y - 70, sx + 70, y + 70, 9, 0.3, 1);
    const tuned = g.tuned();
    if (tuned < 0) {
      // static snow
      c.fillStyle = 'rgba(60,50,40,0.5)';
      for (let i = 0; i < 40; i++) {
        const a = Math.sin(i * 12.9 + t * 37) * 0.5 + 0.5;
        const b = Math.sin(i * 78.2 + t * 53) * 0.5 + 0.5;
        c.fillRect(sx - 60 + a * 120, y - 60 + b * 120, 3, 3);
      }
    }
    c.restore();
    if (tuned >= 0) drawStationIcon(c, tuned, sx, y, 1.1, g.clarity(tuned));
    label(c, 'playing', sx, y + 98, { size: 24, weight: 600, color: '#5a4a3a' });
  }

  function listener(c, i, x, y, t) {
    const happy = g.cheer > 0 || (g.tuned() === g.want && g.song > 0.1);
    const sway = happy ? Math.sin(t * 5 + i) * 0.12 : 0;
    c.save();
    c.translate(x, y);
    c.rotate(sway);
    if (!drawSprite(c, 'sprites.listeners', i + (happy ? 3 : 0), 0, 0, { h: 130 })) {
      const cols = [PAL.lemon, PAL.sage, PAL.strawberry];
      blob(c, 0, -50, 44, 48, i + 2, 0.05);
      wash(c, cols[i]);
      ink(c, 2);
      if (happy) {
        c.beginPath();
        c.arc(-16, -66, 8, Math.PI * 1.1, Math.PI * 1.9);
        ink(c, 2.2);
      } else {
        c.beginPath();
        c.arc(-16, -66, 9, 0, Math.PI * 2);
        c.fillStyle = '#fff';
        c.fill();
        ink(c, 1.6);
        c.beginPath();
        c.arc(-19, -66, 3, 0, Math.PI * 2);
        c.fillStyle = INK;
        c.fill();
      }
      poly(c, [[-38, -56], [-66, -48], [-38, -44]], i, 0.5);
      wash(c, PAL.ochre);
      ink(c, 1.6);
    }
    c.restore();
  }

  g.draw = (c, t) => {
    const painted = scene(c, 'radiobird', W, H, drawRoom);

    // The sofa (painted in the scene once it arrives) and the listeners.
    if (!painted) {
      poly(c, [[SOFA.x - 300, SOFA.y - 170], [SOFA.x + 300, SOFA.y - 170], [SOFA.x + 300, SOFA.y], [SOFA.x - 300, SOFA.y]], 7, 2);
      wash(c, PAL.sage, 0.85);
      ink(c, 2.4);
      poly(c, [[SOFA.x - 330, SOFA.y - 80], [SOFA.x + 330, SOFA.y - 80], [SOFA.x + 330, SOFA.y + 20], [SOFA.x - 330, SOFA.y + 20]], 8, 2);
      wash(c, PAL.olive, 0.85);
      ink(c, 2.4);
    }
    [-170, 0, 170].forEach((dx, i) => listener(c, i, SOFA.x + dx, SOFA.y - 78, t));

    // The request bubble, with the song's progress round it.
    const bx = BUBBLE.x;
    const by = BUBBLE.y;
    blob(c, bx, by, 92, 80, 9, 0.04);
    c.fillStyle = 'rgba(250,246,234,0.97)';
    c.fill();
    ink(c, 2.4);
    poly(c, [[bx - 20, by + 74], [bx + 20, by + 74], [bx + 4, by + 160]], 3, 0.8);
    c.fillStyle = 'rgba(250,246,234,0.97)';
    c.fill();
    ink(c, 2);
    drawStationIcon(c, g.want, bx, by, 1.1);
    if (g.song > 0) {
      c.beginPath();
      c.arc(bx, by, 100, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.song);
      ink(c, 10, STATIONS[g.want].color);
    }

    drawDial(c, t);
    drawMeter(c, t);

    // The Radio Bird itself, swaying with the music.
    const playing = g.tuned() === g.want;
    const bob = playing && !env.reduceMotion ? Math.sin(t * 8) * 0.03 : 0;
    c.save();
    c.translate(RADIO.x, RADIO.y);
    c.rotate(bob);
    drawBird(c, 'radiobird', { x: 0, y: 0, size: RADIO.size, t });
    c.restore();

    for (const n of g.notes) {
      c.save();
      c.globalAlpha = clamp(n.life, 0, 1);
      label(c, '♪', n.x, n.y, { size: 40, color: n.color, weight: 800, font: 'Georgia, serif' });
      c.restore();
    }

    for (const o of g.pops) {
      c.save();
      c.globalAlpha = Math.min(1, o.life * 2);
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(250,244,228,0.9)';
      c.font = `800 ${o.size}px Fraunces, Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeText(o.text, o.x, o.y);
      label(c, o.text, o.x, o.y, { size: o.size, color: o.color, weight: 800 });
      c.restore();
    }

    if (g.elapsed < 4.5) {
      c.save();
      c.globalAlpha = Math.min(1, 4.5 - g.elapsed);
      label(c, 'Turn the dial to find their station · hold it there', fx(0.5), DIAL.y1 + 50, { size: 32, weight: 600 });
      c.restore();
    }
  };

  g.focus = () => fx(g.n);
  g.span = 760;

  return g;
}

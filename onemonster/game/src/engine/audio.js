// Synthesised sound, all in the browser: an oom-pah tune for the journey, a
// gentler one for the menus and story pages, and a sound for every creature
// and event. Nothing plays until the first user gesture unlocks the context.

let ctx = null;
let master, musicBus, sfxBus;
let levels = { volume: 0.8, music: 0.5, sfx: 0.8 };
let musicTimer = null;
let currentTune = null;

export function setLevels(s) {
  levels = { volume: s.volume / 100, music: s.music / 100, sfx: s.sfx / 100 };
  if (!ctx) return;
  master.gain.value = levels.volume;
  musicBus.gain.value = levels.music * 0.5;
  sfxBus.gain.value = levels.sfx;
}

export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { return; }
  master = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);
  master.connect(ctx.destination);
  setLevels({ volume: levels.volume * 100, music: levels.music * 100, sfx: levels.sfx * 100 });
  if (currentTune) playMusic(currentTune, true);
}

export function suspend(on) {
  if (!ctx) return;
  if (on) ctx.suspend(); else ctx.resume();
}

function tone(bus, { f = 440, f2 = null, type = 'square', t = 0, d = 0.15, v = 0.2, a = 0.005, q = null, curve = 'exp' }) {
  const now = ctx.currentTime + t;
  const o = ctx.createOscillator();
  const gn = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (f2) {
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + d);
    else o.frequency.linearRampToValueAtTime(f2, now + d);
  }
  gn.gain.setValueAtTime(0.0001, now);
  gn.gain.exponentialRampToValueAtTime(v, now + a);
  gn.gain.exponentialRampToValueAtTime(0.0001, now + d);
  let node = o;
  if (q) {
    const fl = ctx.createBiquadFilter();
    fl.type = q.type || 'lowpass';
    fl.frequency.value = q.f;
    fl.Q.value = q.q || 1;
    o.connect(fl);
    node = fl;
  }
  node.connect(gn);
  gn.connect(bus);
  o.start(now);
  o.stop(now + d + 0.05);
}

function noise(bus, { t = 0, d = 0.2, v = 0.2, f = 1200, f2 = null, type = 'bandpass', q = 1 }) {
  const now = ctx.currentTime + t;
  const len = Math.max(1, Math.floor(ctx.sampleRate * d));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.frequency.setValueAtTime(f, now);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, now + d);
  fl.Q.value = q;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(v, now);
  gn.gain.exponentialRampToValueAtTime(0.0001, now + d);
  src.connect(fl);
  fl.connect(gn);
  gn.connect(bus);
  src.start(now);
}

const R = () => 0.9 + Math.random() * 0.2;

// Every sound effect by name. opts.pitch scales the pitch a little.
const SFX = {
  move: () => tone(sfxBus, { f: 660, d: 0.05, v: 0.06, type: 'triangle' }),
  select: () => { tone(sfxBus, { f: 520, d: 0.08, v: 0.1, type: 'triangle' }); tone(sfxBus, { f: 780, t: 0.06, d: 0.1, v: 0.1, type: 'triangle' }); },
  back: () => tone(sfxBus, { f: 400, f2: 260, d: 0.12, v: 0.08, type: 'triangle' }),
  page: () => noise(sfxBus, { d: 0.25, v: 0.12, f: 2600, f2: 900, q: 0.7 }),
  count: () => tone(sfxBus, { f: 520, d: 0.12, v: 0.12, type: 'square', q: { f: 1800 } }),
  go: () => { tone(sfxBus, { f: 780, d: 0.25, v: 0.14, type: 'square', q: { f: 2400 } }); tone(sfxBus, { f: 1040, t: 0.05, d: 0.25, v: 0.1, type: 'square', q: { f: 2400 } }); },
  thunk: () => { noise(sfxBus, { d: 0.12, v: 0.5, f: 300, type: 'lowpass' }); tone(sfxBus, { f: 120, f2: 60, d: 0.15, v: 0.3, type: 'sine' }); },
  snatch: () => { noise(sfxBus, { d: 0.18, v: 0.3, f: 3000, f2: 600, q: 1.5 }); tone(sfxBus, { f: 300, f2: 900, d: 0.18, v: 0.15, type: 'sawtooth', q: { f: 2000 } }); },
  cheer: () => [0, 4, 7, 12].forEach((s, i) => tone(sfxBus, { f: 392 * 2 ** (s / 12), t: i * 0.08, d: 0.3, v: 0.12, type: 'triangle' })),
  aww: () => [0, -3, -7].forEach((s, i) => tone(sfxBus, { f: 330 * 2 ** (s / 12), t: i * 0.14, d: 0.32, v: 0.1, type: 'triangle' })),
  // Creatures
  gabble: () => { for (let i = 0; i < 4; i++) tone(sfxBus, { f: (260 + Math.random() * 180), f2: 200, t: i * 0.06, d: 0.07, v: 0.08, type: 'sawtooth', q: { f: 1400, q: 4 } }); },
  step: () => noise(sfxBus, { d: 0.05, v: 0.05 * R(), f: 500, type: 'lowpass' }),
  thump: () => { tone(sfxBus, { f: 110, f2: 50, d: 0.18, v: 0.3, type: 'sine' }); noise(sfxBus, { d: 0.1, v: 0.12, f: 400, type: 'lowpass' }); },
  flap: () => noise(sfxBus, { d: 0.12, v: 0.1 * R(), f: 900, f2: 300, q: 0.8 }),
  swoosh: () => noise(sfxBus, { d: 0.35, v: 0.16, f: 400, f2: 2400, q: 0.9 }),
  snap: () => { noise(sfxBus, { d: 0.05, v: 0.3, f: 3500, q: 2 }); tone(sfxBus, { f: 900, f2: 300, d: 0.06, v: 0.15, type: 'square' }); },
  slurp: () => tone(sfxBus, { f: 200, f2: 700, d: 0.35, v: 0.14, type: 'sine', curve: 'lin' }),
  bubble: () => tone(sfxBus, { f: 300 * R(), f2: 900, d: 0.08, v: 0.1, type: 'sine' }),
  splash: () => noise(sfxBus, { d: 0.45, v: 0.25, f: 1800, f2: 400, q: 0.6 }),
  creak: () => tone(sfxBus, { f: 90, f2: 70, d: 0.5, v: 0.16, type: 'sawtooth', q: { f: 500, q: 8 } }),
  crunch: () => { noise(sfxBus, { d: 0.6, v: 0.5, f: 1200, f2: 200, q: 0.5 }); tone(sfxBus, { f: 80, f2: 40, d: 0.5, v: 0.4, type: 'sine' }); },
  whoosh: () => noise(sfxBus, { d: 0.6, v: 0.18, f: 300, f2: 1500, q: 0.7 }),
  burp: () => tone(sfxBus, { f: 110, f2: 70, d: 0.5, v: 0.3, type: 'sawtooth', q: { f: 420, q: 6 } }),
  munch: () => { for (let i = 0; i < 2; i++) noise(sfxBus, { t: i * 0.09, d: 0.07, v: 0.25, f: 1800, q: 2 }); },
  bonk: () => { tone(sfxBus, { f: 700, f2: 350, d: 0.2, v: 0.25, type: 'triangle' }); noise(sfxBus, { d: 0.1, v: 0.2, f: 2500 }); },
  tinkle: () => [0, 5, 9, 14].forEach((s, i) => tone(sfxBus, { f: 1800 * 2 ** (s / 12), t: i * 0.05, d: 0.15, v: 0.05, type: 'sine' })),
  swish: () => noise(sfxBus, { d: 0.25, v: 0.2, f: 1600, f2: 600, q: 1.2 }),
  flipflop: () => { noise(sfxBus, { d: 0.12, v: 0.3, f: 900, q: 1 }); noise(sfxBus, { t: 0.13, d: 0.12, v: 0.3, f: 600, q: 1 }); },
  rustle: () => noise(sfxBus, { d: 0.3, v: 0.08, f: 3000, f2: 1500, q: 0.6 }),
  pant: () => { noise(sfxBus, { d: 0.12, v: 0.06, f: 1200, q: 1 }); noise(sfxBus, { t: 0.2, d: 0.12, v: 0.05, f: 1000, q: 1 }); },
  tug: () => tone(sfxBus, { f: 180 * R(), f2: 240, d: 0.08, v: 0.1, type: 'square', q: { f: 900 } }),
  free: () => { tone(sfxBus, { f: 300, f2: 900, d: 0.2, v: 0.15, type: 'triangle' }); noise(sfxBus, { d: 0.2, v: 0.15, f: 2000 }); },
  dodge: () => noise(sfxBus, { d: 0.15, v: 0.12, f: 2200, f2: 4000, q: 1 }),
  stumble: () => { tone(sfxBus, { f: 300, f2: 120, d: 0.25, v: 0.15, type: 'triangle' }); noise(sfxBus, { t: 0.15, d: 0.15, v: 0.12, f: 500, type: 'lowpass' }); },
  steam: () => noise(sfxBus, { d: 0.6, v: 0.15, f: 4000, f2: 2000, q: 0.5 }),
  horn: () => tone(sfxBus, { f: 233, d: 0.6, v: 0.15, type: 'sawtooth', q: { f: 700 } }),
  motor: () => { for (let i = 0; i < 5; i++) tone(sfxBus, { f: 70, t: i * 0.07, d: 0.06, v: 0.1, type: 'sawtooth', q: { f: 400 } }); },
  eye: () => tone(sfxBus, { f: 1200, f2: 1600, d: 0.12, v: 0.06, type: 'sine' }),
  caught: () => [0, -1].forEach((s, i) => tone(sfxBus, { f: 500 * 2 ** (s / 12), t: i * 0.12, d: 0.14, v: 0.12, type: 'square', q: { f: 1500 } })),
};

export function sfx(name) {
  if (!ctx || ctx.state !== 'running') return;
  const f = SFX[name];
  if (f) try { f(); } catch { /* ignore */ }
}

// Music: short looping phrases, scheduled a bar at a time.
const TUNES = {
  // Oom-pah for the chapters: bass on the beat, chord off the beat, a melody over it.
  play: { bpm: 132, bass: [48, 55, 48, 55, 53, 60, 53, 60, 50, 57, 55, 59, 48, 55, 48, 52],
    mel: [72, 0, 74, 76, 77, 76, 74, 72, 74, 0, 71, 67, 72, 0, 0, 0, 76, 0, 77, 79, 81, 79, 77, 76, 74, 76, 77, 74, 72, 0, 0, 0] },
  menu: { bpm: 96, bass: [48, 52, 55, 52, 53, 57, 60, 57, 50, 53, 57, 53, 55, 59, 62, 59],
    mel: [67, 0, 69, 0, 72, 0, 69, 67, 65, 0, 67, 0, 64, 0, 0, 0, 67, 0, 69, 72, 74, 72, 69, 67, 65, 64, 62, 64, 60, 0, 0, 0] },
  tense: { bpm: 150, bass: [45, 45, 52, 45, 44, 44, 52, 44, 43, 43, 50, 43, 44, 44, 52, 47],
    mel: [69, 0, 72, 0, 71, 0, 69, 0, 68, 0, 71, 0, 69, 0, 0, 0, 69, 72, 76, 72, 74, 71, 68, 71, 69, 0, 64, 0, 69, 0, 0, 0] },
};
const mf = (n) => 440 * 2 ** ((n - 69) / 12);

export function playMusic(name, force = false) {
  if (currentTune === name && !force) return;
  currentTune = name;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  if (!ctx || !name || !TUNES[name]) return;
  const tune = TUNES[name];
  const step = 60 / tune.bpm / 2; // eighth notes
  let i = 0;
  let next = ctx.currentTime + 0.1;
  const schedule = () => {
    if (!ctx || currentTune !== name) return;
    while (next < ctx.currentTime + 0.4) {
      const t = next - ctx.currentTime;
      const beat = i % 2 === 0;
      const b = tune.bass[Math.floor(i / 2) % tune.bass.length];
      if (beat) tone(musicBus, { f: mf(b - 12), t, d: step * 0.9, v: 0.22, type: 'triangle' });
      else [b + 4, b + 7].forEach((n) => tone(musicBus, { f: mf(n), t, d: step * 0.5, v: 0.05, type: 'square', q: { f: 1500 } }));
      const m = tune.mel[i % tune.mel.length];
      if (m) tone(musicBus, { f: mf(m), t, d: step * 1.6, v: 0.07, type: 'square', q: { f: 2600 } });
      i++;
      next += step;
    }
  };
  schedule();
  musicTimer = setInterval(schedule, 100);
}

export function stopMusic() { playMusic(null); }

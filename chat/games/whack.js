// Mob Whack: a blocky whack-a-mole. Mobs rise out of a 3x3 field of holes
// for a moment; tap them (or press 1-9, arrows + Enter, controller A) to
// whack them with the hammer before they sink again.
//   Zombies: common, 10 points.
//   Creepers: they swell, hiss and flash white, then EXPLODE: you lose a
//     heart and 10 points. Whacked first they are worth 20 (30 while flashing).
//   Villagers: don't hit them! 20 points off and your combo breaks. Hmm.
//   Endermen: rare. They teleport from hole to hole a few times (and can't be
//     hit while they hop); catch them where they settle for 50.
// Hits in a row build a combo that multiplies points (x2 from 4, x3 from 8,
// x4 from 12). A round lasts 60 seconds and gets faster as it goes; three
// hearts, and three explosions put you out of the round.
//
// Everyone plays at the same time on their own field. The owner publishes
// only { round, seed, startAt } in shared state; every field derives the
// same spawn sequence from the seed (makeSchedule), so the round is fair and
// any member can take over as owner. Each player publishes their own
// { round, score, hearts, play, out } so friends' scores show live and the
// winner can be named. Players who arrive mid-round watch until the next one.
// The personal best lives in api.store.
//
// Artwork (whack-field, -zombie, -creeper, -creeper-flash, -villager,
// -enderman, -explosion, -teleport, -hammer) is used once delivered; until
// then everything is drawn here as blocky stand-ins. The field is laid out in
// the field picture's own pixels (1600 x 1200), with the holes at fixed spots
// on a 3x3 grid across its middle, so the art and the game line up.

const IMG_W = 1600, IMG_H = 1200;
const HOLE_X = [480, 800, 1120];
const HOLE_Y = [440, 650, 860];
const HOLE_RX = 122, HOLE_RY = 50;
const HOLES = 9;
// The part of the field that must stay on screen: the holes and risen mobs.
const REGION = { x0: 300, x1: 1300, y0: 190, y1: 950 };
const MOB = 262;               // mob picture size, field pixels

const DURATION = 60000;        // ms a round lasts
const READY = 3000;            // ms countdown before it starts
const GRACE = 1500;            // ms after time is up before the results settle
const AGAIN_AFTER = 3500;      // ms the results stay before Play again is offered
const LATE = 1500;             // joining later than this into a round: watch it
const MAX_PLAYERS = 8;
const HEARTS = 3;
const RISE = 140;              // ms a mob takes to rise or sink
const GAP = 260;               // ms a hole stays empty between mobs
const HOP_GAP = 160;           // ms between an enderman's stops
const FLASH = 0.45;            // share of a creeper's fuse before it flashes
const POINTS = { zombie: 10, creeper: 20, creeperLate: 30, enderman: 50, villager: -20, boom: -10 };

const FONT = 'ui-rounded, system-ui, sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const holeXY = h => ({ x: HOLE_X[h % 3], y: HOLE_Y[Math.floor(h / 3)] });

// --- pure logic (exported for tests) --------------------------------------

// Small seeded PRNG (mulberry32).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The round's spawns for a seed: [{ id, kind, stops: [{ hole, t, dur }] }],
// in order of their first stop. Times are ms from the start of the round. A
// mob is up at its hole from t to t + dur (creepers explode at t + dur);
// endermen have several stops and can only be caught at the last one. No two
// mobs ever share a hole at the same time, and everything ends before time.
function makeSchedule(seed) {
  const rnd = mulberry32(seed);
  const free = new Array(HOLES).fill(0);
  const enderAt = [11000 + rnd() * 9000];
  if (rnd() < 0.75) enderAt.push(33000 + rnd() * 13000);
  const events = [];
  const END = DURATION - 150;
  let t = 700, id = 0, lastHole = -1;
  const pick = (at, not) => {
    const ok = [];
    for (let h = 0; h < HOLES; h++) if (free[h] <= at && h !== not) ok.push(h);
    return ok.length ? ok[Math.floor(rnd() * ok.length)] : -1;
  };
  while (t < DURATION - 900) {
    const p = t / DURATION;
    const r = rnd();
    let kind;
    if (enderAt.length && t >= enderAt[0]) kind = 'enderman';
    else {
      const pc = t > 4000 ? 0.11 + 0.09 * p : 0;
      kind = r < pc ? 'creeper' : r < pc + 0.16 ? 'villager' : 'zombie';
    }
    let hole = pick(t, lastHole);
    if (hole < 0) hole = pick(t, -1);
    if (hole < 0) { t += 120; continue; }
    const jit = 0.85 + rnd() * 0.3;
    let stops;
    if (kind === 'enderman') {
      const hops = 2 + Math.floor(rnd() * 2);
      stops = [{ hole, t, dur: Math.round(lerp(560, 420, p)) }];
      for (let j = 0; j < hops; j++) {
        const prev = stops[stops.length - 1];
        const at = prev.t + prev.dur + HOP_GAP;
        const next = pick(at, prev.hole);
        if (next < 0) break;
        stops.push({ hole: next, t: at, dur: Math.round(j === hops - 1 ? lerp(1150, 850, p) : lerp(560, 420, p)) });
      }
      const last = stops[stops.length - 1];
      if (stops.length < 3 || last.t + last.dur > END) {
        // No room to hop about: try again a little later.
        t += 200;
        continue;
      }
      enderAt.shift();
    } else {
      const dur = kind === 'zombie' ? lerp(1300, 720, p) * jit
        : kind === 'villager' ? lerp(1500, 1050, p) * jit
        : lerp(2400, 1650, p) * (0.9 + rnd() * 0.2);
      if (t + dur > END) break;
      stops = [{ hole, t, dur: Math.round(dur) }];
    }
    for (const s of stops) free[s.hole] = Math.max(free[s.hole], s.t + s.dur + RISE + (kind === 'creeper' ? 500 : GAP));
    events.push({ id: id++, kind, stops: stops.map(s => ({ ...s, t: Math.round(s.t) })) });
    lastHole = stops[stops.length - 1].hole;
    const gapMs = lerp(1000, 430, Math.pow(p, 0.9)) * (0.7 + rnd() * 0.6);
    t += p > 0.35 && rnd() < 0.22 ? 90 : gapMs;
  }
  return events;
}

// Points multiplier for a combo of `n` hits in a row (this hit included).
const comboMult = n => clamp(1 + Math.floor(n / 4), 1, 4);

// Points for whacking a mob of `kind` (late: a creeper already flashing),
// with `combo` hits in a row including this one.
function pointsFor(kind, combo, late = false) {
  if (kind === 'villager') return POINTS.villager;
  const base = kind === 'creeper' ? (late ? POINTS.creeperLate : POINTS.creeper) : POINTS[kind] ?? 0;
  return base * comboMult(combo);
}

// Where the 1600 x 1200 field picture goes on a w x h canvas whose top `top`
// pixels hold the scores. It covers the canvas when it can, but never so
// large that the holes and risen mobs (REGION) leave the space below the
// scores; then it fits that region and the rest is filled around it.
function fieldLayout(w, h, top) {
  const boxH = Math.max(1, h - top);
  const rw = REGION.x1 - REGION.x0, rh = REGION.y1 - REGION.y0;
  const k = Math.max(1e-3, Math.min(Math.max(w / IMG_W, h / IMG_H), w / rw, boxH / rh));
  let ox = w / 2 - ((REGION.x0 + REGION.x1) / 2) * k;
  let oy = top + boxH / 2 - ((REGION.y0 + REGION.y1) / 2) * k;
  if (IMG_W * k >= w) ox = clamp(ox, w - IMG_W * k, 0);
  if (IMG_H * k >= h) oy = clamp(oy, h - IMG_H * k, 0);
  else if (IMG_H * k <= boxH) oy = top + (boxH - IMG_H * k) / 2;
  return { k, ox, oy };
}

function validShared(s) {
  return !!s && typeof s === 'object' && Number.isInteger(s.round) && s.round > 0 && s.round < 1e6
    && Number.isInteger(s.seed) && s.seed >= 0 && s.seed < 4294967296
    && Number.isFinite(s.startAt) && Math.abs(s.startAt - Date.now()) < 864e5;
}

// A friend's published state for `round`, cleaned up, or null.
function readState(st, round) {
  if (!st || typeof st !== 'object' || st.round !== round) return null;
  return {
    score: Number.isFinite(st.score) ? clamp(Math.round(st.score), 0, 99999) : 0,
    hearts: Number.isFinite(st.hearts) ? clamp(Math.round(st.hearts), 0, HEARTS) : 0,
    play: st.play === true,
    out: st.out === true,
  };
}

// --- stand-in art ------------------------------------------------------------

function hash(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, f) {
  const [r, g, b] = rgb(hex);
  return `rgb(${clamp(Math.round(r * f), 0, 255)},${clamp(Math.round(g * f), 0, 255)},${clamp(Math.round(b * f), 0, 255)})`;
}
function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// A pixel painter: cells of `cell` px; each cell takes one of the colours,
// a little lighter or darker, picked by a hash so it's the same every time.
function painter(g, cell, seed) {
  return (x, y, w, h, colors, jitter = 0.1) => {
    const list = Array.isArray(colors) ? colors : [colors];
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        const c = list[Math.floor(hash(i, j, seed) * list.length)];
        if (c.startsWith('#')) g.fillStyle = shade(c, 1 + (hash(i, j, seed + 7) - 0.5) * 2 * jitter);
        else g.fillStyle = c;
        g.fillRect(i * cell, j * cell, cell, cell);
      }
    }
  };
}

// A dark outline round a transparent sprite, so mobs read on the grass.
function outlined(src, px = 4) {
  const ink = canvasOf(src.width, src.height);
  const ig = ink.getContext('2d');
  ig.drawImage(src, 0, 0);
  ig.globalCompositeOperation = 'source-in';
  ig.fillStyle = 'rgba(16,12,24,0.9)';
  ig.fillRect(0, 0, ink.width, ink.height);
  const out = canvasOf(src.width, src.height);
  const g = out.getContext('2d');
  for (const [dx, dy] of [[-px, 0], [px, 0], [0, -px], [0, px]]) g.drawImage(ink, dx, dy);
  g.drawImage(src, 0, 0);
  return out;
}

function standInMob(kind) {
  const c = canvasOf(256, 256);
  const g = c.getContext('2d');
  const box = painter(g, 8, kind.length * 31);
  if (kind === 'zombie') {
    const G = ['#4f8a3c', '#5f9e48', '#457a33', '#568f40'];
    const C = ['#2a9fa3', '#2492a0', '#33aeb0'];
    box(10, 14, 12, 14, C, 0.08);
    box(10, 28, 12, 4, ['#3c3f9e', '#35388f'], 0.08);
    box(10, 2, 12, 12, G, 0.12);
    box(10, 2, 12, 2, ['#3c6b2c', '#355f27'], 0.1);
    box(12, 7, 2, 2, '#121812', 0);
    box(18, 7, 2, 2, '#121812', 0);
    box(13, 7, 1, 1, '#2d6b66', 0);
    box(18, 7, 1, 1, '#2d6b66', 0);
    box(15, 9, 2, 1, '#3a6a2c', 0);
    box(13, 11, 6, 1, '#2f5424', 0);
    // Arms reaching out at you: the sleeve end and the green hand.
    for (const x of [4, 22]) {
      box(x, 14, 6, 6, ['#1e7f84', '#21868a'], 0.06);
      box(x + 1, 15, 4, 4, G, 0.1);
      box(x, 20, 6, 1, 'rgba(0,0,0,0.25)', 0);
    }
  } else if (kind === 'creeper' || kind === 'creeper-flash') {
    const G = ['#4fae3e', '#6ccf54', '#3d8f30', '#8fe07a', '#5abd47', '#2f7a26'];
    box(10, 13, 12, 19, G, 0.1);
    box(10, 13, 1, 19, 'rgba(0,0,0,0.18)', 0);
    box(21, 13, 1, 19, 'rgba(0,0,0,0.18)', 0);
    box(10, 1, 12, 12, G, 0.1);
    box(10, 12, 12, 1, 'rgba(0,0,0,0.22)', 0);
    const F = '#0e1a0e';
    box(11, 4, 3, 3, F, 0);
    box(18, 4, 3, 3, F, 0);
    box(15, 7, 2, 2, F, 0);
    box(14, 9, 4, 2, F, 0);
    box(14, 11, 1, 1, F, 0);
    box(17, 11, 1, 1, F, 0);
    if (kind === 'creeper-flash') {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,0.78)';
      g.fillRect(0, 0, 256, 256);
      g.globalCompositeOperation = 'source-over';
    }
  } else if (kind === 'villager') {
    const S = ['#bd8b72', '#b58268', '#c4937a'];
    box(8, 15, 16, 17, ['#6b4a2f', '#634429', '#73503a'], 0.08);
    box(12, 15, 8, 1, '#7d593b', 0.05);
    box(8, 20, 16, 5, ['#58391f', '#5e3f24'], 0.06);
    box(13, 21, 6, 3, S, 0.06);
    box(8, 25, 16, 1, 'rgba(0,0,0,0.25)', 0);
    box(10, 1, 12, 14, S, 0.07);
    box(10, 1, 12, 1, '#a87660', 0.05);
    // Worried: the unibrow lifts in the middle.
    box(11, 6, 4, 1, '#4a2c1d', 0);
    box(17, 6, 4, 1, '#4a2c1d', 0);
    box(15, 5, 2, 1, '#4a2c1d', 0);
    box(12, 7, 1, 1, '#f4f4f4', 0);
    box(13, 7, 1, 1, '#2f8a3a', 0);
    box(18, 7, 1, 1, '#2f8a3a', 0);
    box(19, 7, 1, 1, '#f4f4f4', 0);
    box(15, 8, 2, 7, ['#a3705a', '#9c6852'], 0.05);
    box(16, 8, 1, 7, 'rgba(0,0,0,0.12)', 0);
    box(13, 13, 1, 1, '#7a4b3a', 0);
    box(18, 13, 1, 1, '#7a4b3a', 0);
  } else if (kind === 'enderman') {
    const B = ['#161616', '#1c1c1c', '#121212', '#222222'];
    box(13, 15, 6, 17, B, 0.15);
    box(10, 15, 12, 2, B, 0.15);
    box(10, 17, 2, 15, B, 0.15);
    box(20, 17, 2, 15, B, 0.15);
    box(10, 3, 12, 12, B, 0.15);
    box(10, 8, 5, 3, 'rgba(204,92,245,0.22)', 0);
    box(17, 8, 5, 3, 'rgba(204,92,245,0.22)', 0);
    box(11, 9, 3, 1, '#cc5cf5', 0);
    box(18, 9, 3, 1, '#cc5cf5', 0);
    box(12, 9, 1, 1, '#f2c6ff', 0);
    box(19, 9, 1, 1, '#f2c6ff', 0);
  }
  return outlined(c, 5);
}

// A pixel hammer on a 16 x 16 grid: iron head top left, wooden handle to the
// bottom right.
function standInHammer() {
  const c = canvasOf(256, 256);
  const g = c.getContext('2d');
  const cell = 16;
  const head = (x, y) => Math.abs(x - y) <= 4 && x + y >= 4 && x + y <= 10;
  const handle = (x, y) => x + y >= 11 && Math.abs(x - y) <= 1 && x <= 15 && y <= 15 && x + y <= 28;
  const solid = (x, y) => head(x, y) || handle(x, y);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let col = null;
      if (head(x, y)) {
        const d = x + y;
        col = d <= 5 ? '#e6e6ea' : d <= 7 ? '#b9b9c2' : d <= 9 ? '#8e8e99' : '#64646e';
        if (Math.abs(x - y) === 4) col = shade(col.startsWith('#') ? col : '#8e8e99', 0.8);
      } else if (handle(x, y)) {
        col = x - y === 1 ? '#5a3a1c' : x - y === -1 ? '#a9773e' : '#86592c';
      } else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        col = '#1b1420';
      }
      if (col) {
        g.fillStyle = col;
        g.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
  return c;
}

// The meadow, 1600 x 1200 field pixels drawn at half size: grass blocks,
// flowers, trees round the edge, and the nine holes at the grid spots.
function standInField() {
  const S = 0.5;
  const c = canvasOf(IMG_W * S, IMG_H * S);
  const g = c.getContext('2d');
  g.scale(S, S);
  // Big soft grass pixels first (4 per block), then the finer detail cells.
  painter(g, 25, 8)(0, 0, 64, 48, ['#62a23e', '#66a641', '#5d9b3a', '#6aab43'], 0.035);
  const cell = 12.5;
  const box = painter(g, cell, 5);
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(hash(i, 4, 5) * 128), y = Math.floor(hash(i, 5, 5) * 96);
    box(x, y, 1, 1, hash(i, 6, 5) < 0.5 ? '#57923a' : '#74b64c', 0.03);
  }
  // Block seams: every 8 cells a slightly darker line.
  g.fillStyle = 'rgba(20,50,10,0.13)';
  for (let x = 0; x <= IMG_W; x += 100) g.fillRect(x, 0, 3, IMG_H);
  for (let y = 0; y <= IMG_H; y += 100) g.fillRect(0, y, IMG_W, 3);
  // Flowers and tufts.
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash(i, 1, 9) * 128), y = Math.floor(hash(i, 2, 9) * 96);
    const near = HOLE_Y.some(hy => Math.abs(y * cell - hy) < 90) && HOLE_X.some(hx => Math.abs(x * cell - hx) < 190);
    if (near) continue;
    const kind = hash(i, 3, 9);
    if (kind < 0.3) { box(x, y, 1, 1, '#e8343b', 0); box(x, y + 1, 1, 1, '#2f6b22', 0); }
    else if (kind < 0.55) { box(x, y, 1, 1, '#ffd43b', 0); box(x, y + 1, 1, 1, '#2f6b22', 0); }
    else if (kind < 0.65) { box(x, y, 1, 1, '#9fd4ff', 0); box(x, y + 1, 1, 1, '#2f6b22', 0); }
    else { box(x, y, 1, 2, '#3f7f2a', 0); box(x + 1, y + 1, 1, 1, '#3f7f2a', 0); }
  }
  // Oak trees peeking in at the edges.
  const tree = (cx, cy, r) => {
    box(cx - 1, cy, 3, r + 2, ['#6b4a2b', '#5a3d22'], 0.1);
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (Math.abs(i) + Math.abs(j) * 0.8 > r * 1.25) continue;
        box(cx + i, cy - r + j, 1, 1, ['#2f7a24', '#3a8c2c', '#25661c', '#44993a'], 0.1);
      }
    }
  };
  tree(6, 12, 6); tree(121, 10, 7); tree(3, 70, 6); tree(124, 78, 6); tree(64, 0, 5);
  // Holes: a ring of dirt, the far inside wall lit, the rest dark.
  for (let h = 0; h < HOLES; h++) {
    const { x: hx, y: hy } = holeXY(h);
    for (let j = -10; j <= 10; j++) {
      for (let i = -14; i <= 14; i++) {
        const px = hx + (i + 0.5) * cell, py = hy + (j + 0.5) * cell;
        const e = ((px - hx) / HOLE_RX) ** 2 + ((py - hy) / HOLE_RY) ** 2;
        const rim = ((px - hx) / (HOLE_RX + 30)) ** 2 + ((py - hy) / (HOLE_RY + 20)) ** 2;
        let col = null;
        if (e <= 1) col = py < hy - HOLE_RY * 0.25 ? '#4a3220' : py < hy + HOLE_RY * 0.2 ? '#22160d' : '#120b07';
        else if (rim <= 1) col = py > hy ? '#7a5434' : '#8b6240';
        if (col) {
          g.fillStyle = shade(col, 1 + (hash(i + h * 40, j, 3) - 0.5) * 0.2);
          g.fillRect(hx + i * cell, hy + j * cell, cell + 0.5, cell + 0.5);
        }
      }
    }
  }
  // Dusk light: warm from the top right, cooler at the bottom left.
  const dusk = g.createLinearGradient(IMG_W, 0, 0, IMG_H);
  dusk.addColorStop(0, 'rgba(255,170,90,0.22)');
  dusk.addColorStop(0.5, 'rgba(255,140,120,0.05)');
  dusk.addColorStop(1, 'rgba(70,50,140,0.25)');
  g.fillStyle = dusk;
  g.fillRect(0, 0, IMG_W, IMG_H);
  return c;
}

// Pixel heart for the hearts display.
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

export default {
  id: 'whack',
  name: 'Mob Whack',
  emoji: '⛏️',
  blurb: 'Whack zombies and creepers before they blow. Leave the villagers alone!',
  minPlayers: 1,
  maxPlayers: 16,
  needsFace: false,

  create(api) {
    const CSS = `
.mw-over { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 16px; text-align: center; background: rgba(20,12,40,0.72); }
.mw-over[hidden] { display: none; }
.mw-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 18px 16px; max-width: min(92%, 420px); width: 100%; background: #3b2a1e; border: 4px solid #1b1420; box-shadow: inset 0 0 0 4px #6b4a2f, 0 8px 0 rgba(0,0,0,0.35); border-radius: 6px; }
.mw-title { font-size: clamp(1.4rem, 6vw, 2.1rem); font-weight: 900; color: #fff; text-shadow: 3px 3px 0 #1b1420; }
.mw-sub { font-weight: 800; color: #ffe8a3; text-shadow: 2px 2px 0 #1b1420; }
.mw-rows { width: 100%; display: flex; flex-direction: column; gap: 4px; }
.mw-row { display: flex; align-items: center; gap: 8px; padding: 4px 10px; background: rgba(0,0,0,0.3); font-weight: 800; border-radius: 3px; }
.mw-row.me { outline: 3px solid var(--sun); }
.mw-row i { width: 14px; height: 14px; flex: none; box-shadow: inset -3px -3px 0 rgba(0,0,0,0.3); }
.mw-row span { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mw-row b { color: var(--sun); font-variant-numeric: tabular-nums; }
.mw-over .btn[hidden] { display: none; }
`;
    const style = document.createElement('style');
    style.textContent = CSS;
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.setAttribute('aria-label', 'Mob Whack field: tap a mob, or press 1 to 9');
    const over = document.createElement('div');
    over.className = 'mw-over';
    over.hidden = true;
    const card = document.createElement('div');
    card.className = 'mw-card';
    const overTitle = document.createElement('div');
    overTitle.className = 'mw-title';
    const overSub = document.createElement('div');
    overSub.className = 'mw-sub';
    const rowsEl = document.createElement('div');
    rowsEl.className = 'mw-rows';
    const again = document.createElement('button');
    again.className = 'btn aqua';
    again.textContent = 'Play again';
    card.append(overTitle, overSub, rowsEl, again);
    over.append(card);
    api.el.append(style, canvas, over);
    const ctx = canvas.getContext('2d');

    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let best = Number(api.store.get('best', 0)) || 0;
    let w = 1, h = 1, dpr = 1, hudH = 60, L = { k: 1, ox: 0, oy: 0 };
    let bg = null, bgSig = '';
    let raf = 0, destroyed = false, lastOwnerTick = 0;
    const sprites = {};
    const spriteOf = name => api.img(`whack-${name}`) || (sprites[name] ||= name === 'hammer' ? standInHammer() : standInMob(name));
    let fieldStandIn = null;

    // My round.
    let key = '', round = 0, startAt = 0, sched = [];
    let rt = new Map();            // event id -> { how, at, stop, hiss }
    let score = 0, hearts = HEARTS, combo = 0, bestCombo = 0, hits = 0;
    let playing = false;           // I'm in this round (not watching)
    let out = false;               // out of hearts
    let lastCount = 99, announced = '';
    let published = '';
    let overSig = '';
    // Effects, in field pixels.
    let parts = [], texts = [], booms = [];
    let shake = 0, flashT = 0;
    // Hammer: where it is (screen px), the swing start time, and the cursor.
    const ham = { x: -1, y: -1, swing: -1e9, hole: 4 };
    let cursorOn = false;
    let padPrev = { a: false }, padRepeat = 0, padDir = '';

    // --- shared round ------------------------------------------------------
    const sharedNow = () => {
      const s = api.shared();
      return validShared(s) ? s : null;
    };
    const seated = () => api.players().slice(0, MAX_PLAYERS);
    const isSeated = id => seated().some(p => p.id === id);

    function newRound(r) {
      api.setShared({ round: r, seed: Math.floor(Math.random() * 4294967296), startAt: Date.now() + READY });
    }
    function ownerTick() {
      if (api.isOwner() && !sharedNow()) newRound(1);
    }
    api.on('again', (d, from) => {
      const s = sharedNow();
      if (!api.isOwner() || !s || !d || d.round !== s.round || !isSeated(from)) return;
      if (Date.now() >= s.startAt + DURATION + GRACE + AGAIN_AFTER - 400) newRound(s.round + 1);
    });
    function playAgain() {
      const s = sharedNow();
      if (!s || Date.now() < s.startAt + DURATION + GRACE + AGAIN_AFTER - 400 || !isSeated(api.me.id)) return;
      if (api.isOwner()) newRound(s.round + 1);
      else api.send('again', { round: s.round });
      api.sfx('click');
    }
    again.addEventListener('click', playAgain);

    function syncRound() {
      const s = sharedNow();
      if (!s) return null;
      const k = `${s.round}:${s.seed}:${s.startAt}`;
      if (k !== key) {
        key = k;
        round = s.round;
        startAt = s.startAt;
        sched = makeSchedule(s.seed);
        rt = new Map(sched.map(e => [e.id, { how: null, at: 0, stop: 0, hiss: false }]));
        score = 0; hearts = HEARTS; combo = 0; bestCombo = 0; hits = 0; out = false;
        parts = []; texts = []; booms = [];
        lastCount = 99;
        playing = isSeated(api.me.id) && Date.now() < startAt + LATE;
        overSig = '';
        publish();
      }
      return s;
    }

    function publish() {
      const st = { round, score, hearts, play: playing, out };
      const sig = JSON.stringify(st);
      if (sig === published) return;
      published = sig;
      api.setState(st);
    }

    const roundT = () => Date.now() - startAt;
    const active = () => playing && !out && roundT() >= 0 && roundT() < DURATION;

    // --- layout ------------------------------------------------------------
    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const multi = api.players().length > 1;
      hudH = clamp(h * 0.09, 40, 58) + (multi ? clamp(h * 0.045, 20, 26) : 0);
      L = fieldLayout(w, h, hudH);
      bg = null;
      if (ham.x < 0) {
        const p = toScreen(HOLE_X[1], HOLE_Y[1]);
        ham.x = p.x; ham.y = p.y;
      }
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    const toScreen = (x, y) => ({ x: L.ox + x * L.k, y: L.oy + y * L.k });
    const toField = (x, y) => ({ x: (x - L.ox) / L.k, y: (y - L.oy) / L.k });

    // The background (fill round the field, then the field) drawn once per size.
    function buildBg() {
      const art = api.img('whack-field');
      const sig = `${w}x${h}@${dpr}:${hudH}:${art ? 1 : 0}`;
      if (bg && sig === bgSig) return;
      bgSig = sig;
      bg ||= canvasOf(1, 1);
      bg.width = canvas.width;
      bg.height = canvas.height;
      const g = bg.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { k, ox, oy } = L;
      const fw = IMG_W * k, fh = IMG_H * k, block = 100 * k;
      // Dusk sky above.
      const sky = g.createLinearGradient(0, 0, 0, Math.max(1, oy));
      sky.addColorStop(0, '#2d2363');
      sky.addColorStop(0.6, '#8a4f8f');
      sky.addColorStop(1, '#ff9f6b');
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      // Blocky clouds.
      g.fillStyle = 'rgba(255,230,240,0.55)';
      for (let i = 0; i < 6; i++) {
        const cy = hash(i, 1, 4) * Math.max(10, oy - 30) + 6;
        const cx = hash(i, 2, 4) * w;
        const cw = block * (1.2 + hash(i, 3, 4) * 1.5), ch = block * 0.35;
        g.fillRect(cx, cy, cw, ch);
        g.fillRect(cx + cw * 0.2, cy - ch * 0.6, cw * 0.5, ch * 0.7);
      }
      // Grass blocks either side, dirt and stone below: the field is an island.
      const tile = (x, y, top) => {
        g.fillStyle = top;
        g.fillRect(x, y, block + 0.5, block + 0.5);
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.fillRect(x, y, block, Math.max(1, block * 0.04));
        g.fillRect(x, y, Math.max(1, block * 0.04), block);
      };
      const x0 = ox - Math.ceil(ox / block) * block;
      if (ox > 0 || ox + fw < w) {
        for (let y = oy; y < oy + fh; y += block) {
          for (let x = x0; x < w; x += block) {
            if (x >= ox - 1 && x < ox + fw - 1) continue;
            tile(x, y, hash(Math.round(x / block), Math.round(y / block), 2) < 0.5 ? '#5d9b3a' : '#66a641');
          }
        }
      }
      if (oy + fh < h) {
        let row = 0;
        for (let y = oy + fh; y < h; y += block, row++) {
          for (let x = x0; x < w; x += block) {
            const n = hash(Math.round(x / block), row, 6);
            const col = row === 0 ? '#86603b' : row < 3 ? (n < 0.5 ? '#7a5434' : '#6e4b2e') : n < 0.08 ? '#3c3c46' : n < 0.12 ? '#c9a24a' : n < 0.6 ? '#7d7d86' : '#6f6f78';
            tile(x, y, col);
            if (row === 0) {
              g.fillStyle = '#5d9b3a';
              g.fillRect(x, y, block + 0.5, block * 0.22);
              g.fillRect(x + block * 0.15, y + block * 0.22, block * 0.15, block * 0.14);
              g.fillRect(x + block * 0.6, y + block * 0.22, block * 0.12, block * 0.2);
            }
          }
        }
        const sh = g.createLinearGradient(0, oy + fh, 0, h);
        sh.addColorStop(0, 'rgba(0,0,0,0.05)');
        sh.addColorStop(1, 'rgba(0,0,0,0.45)');
        g.fillStyle = sh;
        g.fillRect(0, oy + fh, w, h - oy - fh);
      }
      // The field itself.
      const src = art || (fieldStandIn ||= standInField());
      g.imageSmoothingEnabled = !!art;
      g.drawImage(src, ox, oy, fw, fh);
      g.imageSmoothingEnabled = true;
      // A shade behind the scores, where they sit over the field.
      const top = g.createLinearGradient(0, 0, 0, hudH * 1.15);
      top.addColorStop(0, 'rgba(20,12,40,0.6)');
      top.addColorStop(1, 'rgba(20,12,40,0)');
      g.fillStyle = top;
      g.fillRect(0, 0, w, hudH * 1.15);
    }

    // --- whacking ----------------------------------------------------------
    // The mob up at `hole` at time t (ms into the round), if any: { ev, j }.
    function mobAt(hole, t) {
      for (const ev of sched) {
        if (ev.stops[0].t > t) break;
        const r = rt.get(ev.id);
        if (r.how) continue;
        for (let j = 0; j < ev.stops.length; j++) {
          const s = ev.stops[j];
          if (s.hole === hole && t >= s.t + 30 && t <= s.t + s.dur) return { ev, j, s };
        }
      }
      return null;
    }

    // Which hole a point on the field (field pixels) means: a mob that is up
    // and under the point (the front one first), else the nearest hole.
    function holeAtPoint(fx, fy, t) {
      let pickHole = -1, pickY = -1;
      for (let hole = 0; hole < HOLES; hole++) {
        const { x, y } = holeXY(hole);
        if (Math.abs(fx - x) > 160 || fy < y - MOB * 0.82 || fy > y + HOLE_RY * 1.4) continue;
        if (mobAt(hole, t) && y > pickY) { pickHole = hole; pickY = y; }
      }
      if (pickHole >= 0) return pickHole;
      let bestD = Infinity;
      for (let hole = 0; hole < HOLES; hole++) {
        const { x, y } = holeXY(hole);
        const d = Math.hypot(fx - x, (fy - (y - 60)) * 1.3);
        if (d < bestD) { bestD = d; pickHole = hole; }
      }
      return bestD < 260 ? pickHole : -1;
    }

    function burst(x, y, colors, n, speed = 900, size = 22) {
      if (parts.length > 260) parts.splice(0, parts.length - 200);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.65);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.5, s: size * (0.6 + Math.random() * 0.8), c: colors[i % colors.length], life: 0, max: 0.5 + Math.random() * 0.4, g: 2200 });
      }
    }
    function say(x, y, str, color, size = 64) {
      texts.push({ x, y, str, c: color, life: 0, max: 1.0, size });
      if (texts.length > 12) texts.shift();
    }

    function addScore(d) {
      score = Math.max(0, score + d);
    }

    // Whack `hole` (0-8). Called by every input and by the test bot.
    function whack(hole) {
      if (!Number.isInteger(hole) || hole < 0 || hole >= HOLES) return;
      const p = holeXY(hole);
      ham.hole = hole;
      ham.swing = performance.now();
      if (!active()) return;
      const t = roundT();
      const at = mobAt(hole, t);
      const top = p.y - MOB * 0.45;
      if (!at) {
        combo = 0;
        api.sfx('click');
        burst(p.x, p.y - 10, ['#7a5434', '#8b6240', '#5d9b3a'], 6, 500, 16);
        return;
      }
      const { ev, j, s } = at;
      const r = rt.get(ev.id);
      if (ev.kind === 'enderman' && j < ev.stops.length - 1) {
        api.sfx('whoosh');
        say(p.x, top, 'Too quick!', '#e3a6ff', 52);
        return;
      }
      r.how = 'hit';
      r.at = t;
      r.stop = j;
      if (ev.kind === 'villager') {
        combo = 0;
        addScore(POINTS.villager);
        api.sfx('honk');
        say(p.x + 10, top + 90, `${POINTS.villager}`, '#ff8a8a', 60);
        burst(p.x, top, ['#6b4a2f', '#bd8b72'], 6, 400, 18);
      } else {
        combo++;
        hits++;
        bestCombo = Math.max(bestCombo, combo);
        const late = ev.kind === 'creeper' && t - s.t > s.dur * FLASH;
        const pts = pointsFor(ev.kind, combo, late);
        addScore(pts);
        const mult = comboMult(combo);
        if (ev.kind === 'zombie') {
          api.sfx('bounce'); api.sfx('pop');
          burst(p.x, top, ['#5f9e48', '#2a9fa3', '#ffffff', '#457a33'], 12);
          say(p.x, top, `+${pts}${mult > 1 ? ` x${mult}` : ''}`, '#ffffff');
        } else if (ev.kind === 'creeper') {
          api.sfx('pop'); api.sfx('score');
          burst(p.x, top, ['#6ccf54', '#4fae3e', '#ffffff', '#8fe07a'], 16);
          say(p.x, top, `+${pts}${late ? ' Phew!' : ''}${mult > 1 ? ` x${mult}` : ''}`, '#9dff7a');
        } else {
          api.sfx('zap'); api.sfx('score');
          burst(p.x, top, ['#cc5cf5', '#f2c6ff', '#161616', '#8a2be2'], 20, 1100);
          say(p.x, top, `+${pts} ENDER!${mult > 1 ? ` x${mult}` : ''}`, '#e3a6ff', 70);
        }
        if (combo >= 4 && combo % 4 === 0) say(p.x, top - 80, `${combo} COMBO!`, '#ffd43b', 54);
      }
      publish();
    }

    // --- the clock: escapes, explosions, hops -----------------------------
    function step(t) {
      for (const ev of sched) {
        if (ev.stops[0].t > t) break;
        const r = rt.get(ev.id);
        if (r.how) continue;
        const last = ev.stops[ev.stops.length - 1];
        if (ev.kind === 'enderman') {
          let j = 0;
          while (j < ev.stops.length - 1 && t >= ev.stops[j + 1].t) j++;
          if (j > r.stop) { r.stop = j; api.sfx('whoosh'); }
        }
        if (ev.kind === 'creeper' && !r.hiss && t > last.t + last.dur * FLASH) {
          r.hiss = true;
          api.sfx('blow');
        }
        if (t < last.t + last.dur) continue;
        r.at = last.t + last.dur;
        r.stop = ev.stops.length - 1;
        if (ev.kind === 'creeper') {
          r.how = 'boom';
          explode(last.hole);
        } else {
          r.how = 'gone';
          if (ev.kind === 'zombie' && active()) combo = 0;
        }
      }
    }

    function explode(hole) {
      const p = holeXY(hole);
      booms.push({ x: p.x, y: p.y - 110, t: performance.now() });
      api.sfx('bang');
      burst(p.x, p.y - 110, ['#ffffff', '#ffe066', '#ff9f43', '#9a9a9a', '#5a5a5a'], 26, 1300, 30);
      shake = reduced ? 4 : 16;
      flashT = reduced ? 0 : 1;
      if (!active()) return;
      hearts = Math.max(0, hearts - 1);
      combo = 0;
      addScore(POINTS.boom);
      say(p.x, p.y - 250, `${POINTS.boom}  −♥`, '#ff6b6b', 64);
      if (hearts === 0) {
        out = true;
        api.sfx('lose');
      }
      publish();
    }

    // --- input -------------------------------------------------------------
    function pointerHole(e) {
      const r = canvas.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      ham.x = sx; ham.y = sy;
      const f = toField(sx, sy);
      return holeAtPoint(f.x, f.y, roundT());
    }
    function onDown(e) {
      e.preventDefault();
      cursorOn = false;
      const hole = pointerHole(e);
      ham.swing = performance.now();
      if (hole >= 0) {
        const keep = { x: ham.x, y: ham.y };
        whack(hole);
        ham.x = keep.x; ham.y = keep.y;
      } else if (active()) {
        combo = 0;
        api.sfx('click');
      }
      ham.free = true;
    }
    function onMove(e) {
      if (e.pointerType === 'touch' && !e.buttons) return;
      const r = canvas.getBoundingClientRect();
      ham.x = e.clientX - r.left;
      ham.y = e.clientY - r.top;
      ham.free = true;
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);

    function moveCursor(dx, dy) {
      const c = clamp((ham.hole % 3) + dx, 0, 2), r = clamp(Math.floor(ham.hole / 3) + dy, 0, 2);
      ham.hole = r * 3 + c;
      cursorOn = true;
      ham.free = false;
    }
    function keyWhack(hole) {
      cursorOn = true;
      ham.free = false;
      whack(hole);
    }
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || e.target?.isContentEditable;
    function onKey(e) {
      if (typing(e) || !api.el.isConnected || e.repeat) return;
      if (!over.hidden) {
        if (e.key === 'Enter' || e.key === ' ') { if (!again.hidden && document.activeElement !== again) { e.preventDefault(); playAgain(); } }
        return;
      }
      let hole = -1;
      if (/^Numpad[1-9]$/.test(e.code)) {
        const n = Number(e.code.slice(6)) - 1;    // numpad: 7 8 9 on top
        hole = (2 - Math.floor(n / 3)) * 3 + (n % 3);
      } else if (/^[1-9]$/.test(e.key)) hole = Number(e.key) - 1;   // phone keypad: 1 2 3 on top
      if (hole >= 0) { e.preventDefault(); keyWhack(hole); return; }
      const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (dirs[e.key]) { e.preventDefault(); moveCursor(...dirs[e.key]); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); keyWhack(ham.hole); }
    }
    window.addEventListener('keydown', onKey);

    // --- drawing -------------------------------------------------------------
    const easeOutBack = u => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2; };

    function drawSprite(img, x, bottom, sx, sy, alpha = 1) {
      const wpx = MOB * sx, hpx = MOB * sy;
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.drawImage(img, x - wpx / 2, bottom - hpx, wpx, hpx);
      if (alpha < 1) ctx.globalAlpha = 1;
    }

    // Purple squares swirling round a spot (where an enderman leaves or lands).
    function sparkle(x, y, age, seed) {
      const art = api.img('whack-teleport');
      const u = clamp(age / 420, 0, 1);
      if (art) {
        ctx.globalAlpha = 1 - u;
        const s = 220 + u * 120;
        ctx.drawImage(art, x - s / 2, y - s / 2, s, s);
        ctx.globalAlpha = 1;
        return;
      }
      for (let i = 0; i < 14; i++) {
        const a = hash(i, seed, 11) * Math.PI * 2 + u * 3;
        const d = 30 + hash(i, seed, 12) * 90 + u * 60;
        const s = (10 + hash(i, seed, 13) * 14) * (1 - u * 0.7);
        ctx.fillStyle = ['#cc5cf5', '#f2c6ff', '#8a2be2', '#e079fa'][i % 4];
        ctx.globalAlpha = 1 - u;
        ctx.fillRect(x + Math.cos(a) * d - s / 2, y + Math.sin(a) * d * 0.7 - u * 50 - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    function drawMobs(t, now) {
      // Rows from the back, so front mobs overlap the ones behind.
      const shows = [];
      for (const ev of sched) {
        const first = ev.stops[0], last = ev.stops[ev.stops.length - 1];
        if (first.t > t + 10) break;
        if (t > last.t + last.dur + 1000) continue;
        const r = rt.get(ev.id);
        for (let j = 0; j < ev.stops.length; j++) {
          const s = ev.stops[j];
          if (t < s.t) continue;
          const end = s.t + s.dur;
          const isLast = j === ev.stops.length - 1;
          let u, mode = 'up';
          if (r.how === 'hit') {
            if (j !== r.stop) continue;
            const span = ev.kind === 'villager' ? 800 : 280;
            if (t > r.at + span) continue;
            mode = 'hit';
            u = (t - r.at) / span;
          } else if (t <= end) {
            u = clamp((t - s.t) / (ev.kind === 'enderman' && j > 0 ? RISE * 0.5 : RISE), 0, 1);
          } else if (isLast && ev.kind !== 'creeper' && ev.kind !== 'enderman' && t <= end + RISE) {
            mode = 'sink';
            u = 1 - (t - end) / RISE;
          } else if (isLast && ev.kind === 'enderman' && t <= end + RISE) {
            mode = 'sink';
            u = 1 - (t - end) / RISE;
          } else continue;
          shows.push({ ev, s, j, u, mode, isLast });
        }
      }
      shows.sort((a, b) => a.s.hole - b.s.hole);
      for (const sh of shows) drawMob(sh, t, now);
      // Teleport sparkles at every hop, leaving and landing.
      for (const ev of sched) {
        if (ev.kind !== 'enderman') continue;
        if (ev.stops[0].t > t + 10) break;
        const r = rt.get(ev.id);
        for (let j = 0; j < ev.stops.length - 1; j++) {
          if (r.how === 'hit' && r.stop <= j) break;
          const leave = ev.stops[j].t + ev.stops[j].dur;
          const age = t - leave;
          if (age < 0 || age > 420 + HOP_GAP) continue;
          const a = holeXY(ev.stops[j].hole), b = holeXY(ev.stops[j + 1].hole);
          if (age <= 420) sparkle(a.x, a.y - 110, age, ev.id * 7 + j);
          if (age >= HOP_GAP * 0.5) sparkle(b.x, b.y - 110, age - HOP_GAP * 0.5, ev.id * 7 + j + 3);
        }
      }
    }

    function drawMob({ ev, s, j, u, mode, isLast }, t, now) {
      const { x, y } = holeXY(s.hole);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 220, y - 420, 440, 420);
      ctx.ellipse(x, y, HOLE_RX, HOLE_RY, 0, 0, Math.PI * 2);
      ctx.clip();
      const bottom = y + HOLE_RY + 4;
      let rise = mode === 'up' ? easeOutBack(u) : mode === 'sink' ? u : 1;
      let sx = 1, sy = 1, alpha = 1, name = ev.kind, dx = 0;
      if (ev.kind === 'creeper' && mode === 'up') {
        const f = (t - s.t) / s.dur;
        if (f > FLASH) {
          const g = (f - FLASH) / (1 - FLASH);
          const rate = 4 + g * 14;
          const on = Math.sin((t - s.t) / 1000 * rate * Math.PI * 2) > 0;
          if (on) name = 'creeper-flash';
          const swell = 1 + g * 0.16 + (on ? 0.03 : 0);
          sx = swell; sy = swell;
          dx = reduced ? 0 : (hash(Math.floor(t / 40), ev.id, 5) - 0.5) * 8 * g;
        }
      }
      if (ev.kind === 'enderman' && mode === 'up' && !isLast) {
        alpha = 0.72 + 0.2 * Math.sin(t / 45);
        dx = reduced ? 0 : Math.sin(t / 23 + ev.id) * 5;
      }
      if (mode === 'hit') {
        if (ev.kind === 'villager') {
          rise = 1 - clamp((u - 0.45) / 0.55, 0, 1);
          sy = 1 - 0.08 * Math.sin(Math.min(1, u * 3) * Math.PI);
        } else {
          sy = 1 - 0.42 * Math.min(1, u * 2.5);
          sx = 1 + 0.18 * Math.min(1, u * 2.5);
          rise = 1 - clamp((u - 0.35) / 0.65, 0, 1);
        }
      }
      const yOff = (1 - rise) * MOB * 0.92;
      drawSprite(spriteOf(name), x + dx, bottom + yOff, sx, sy, alpha);
      ctx.restore();
      // Dizzy stars over a whacked mob; a sad thought over a whacked villager.
      if (mode === 'hit' && ev.kind !== 'villager') {
        for (let i = 0; i < 3; i++) {
          const a = now / 160 + (i * Math.PI * 2) / 3;
          ctx.fillStyle = '#ffe066';
          ctx.fillRect(x + Math.cos(a) * 70 - 9, y - 150 + Math.sin(a) * 18 + yOff * 0.6 - 9, 18, 18);
        }
      }
      if (mode === 'hit' && ev.kind === 'villager' && u < 0.85) {
        const bx = x + 70, by = y - 270;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeStyle = '#1b1420';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.rect(bx - 85, by - 40, 170, 70);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(bx - 50, by + 30, 22, 22);
        ctx.strokeRect(bx - 50, by + 30, 22, 22);
        ctx.font = `900 46px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#5a3a1c';
        ctx.fillText('Hmm…', bx, by - 4);
      }
    }

    function drawBooms(now) {
      const art = api.img('whack-explosion');
      booms = booms.filter(b => now - b.t < 700);
      for (const b of booms) {
        const u = (now - b.t) / 700;
        if (art) {
          const s = 260 + u * 300;
          ctx.globalAlpha = 1 - Math.max(0, u - 0.4) / 0.6;
          ctx.drawImage(art, b.x - s / 2, b.y - s / 2, s, s);
          ctx.globalAlpha = 1;
          continue;
        }
        const cols = ['#ffffff', '#fff3b0', '#ffd43b', '#ff9f43', '#e8590c'];
        for (let i = 0; i < 18; i++) {
          const a = hash(i, Math.floor(b.t), 3) * Math.PI * 2;
          const d = (40 + hash(i, 4, Math.floor(b.t)) * 180) * Math.min(1, u * 2.2);
          const s = (60 + hash(i, 5, 9) * 70) * (1 - u * 0.8);
          ctx.globalAlpha = 1 - u * 0.9;
          ctx.fillStyle = u > 0.45 && i % 3 === 0 ? '#7a7a80' : cols[Math.min(cols.length - 1, Math.floor(u * 3 + (i % 3)))];
          ctx.fillRect(b.x + Math.cos(a) * d - s / 2, b.y + Math.sin(a) * d - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      }
    }

    function drawParts(dt) {
      for (const p of parts) {
        p.life += dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      parts = parts.filter(p => p.life < p.max);
      for (const p of parts) {
        ctx.globalAlpha = clamp(1 - p.life / p.max, 0, 1);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;
      for (const tx of texts) tx.life += dt;
      texts = texts.filter(tx => tx.life < tx.max);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const tx of texts) {
        const u = tx.life / tx.max;
        const pop = u < 0.15 ? 0.6 + (u / 0.15) * 0.5 : 1.1 - Math.min(0.1, (u - 0.15));
        ctx.globalAlpha = clamp(1.6 - u * 1.6, 0, 1);
        ctx.font = `900 ${tx.size * pop}px ${FONT}`;
        const yy = tx.y - u * 90;
        ctx.fillStyle = '#1b1420';
        ctx.fillText(tx.str, tx.x + 5, yy + 5);
        ctx.fillStyle = tx.c;
        ctx.fillText(tx.str, tx.x, yy);
      }
      ctx.globalAlpha = 1;
    }

    function drawCursor() {
      if (!cursorOn) return;
      const { x, y } = holeXY(ham.hole);
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 10;
      ctx.setLineDash([26, 14]);
      ctx.strokeRect(x - 150, y - MOB * 0.8, 300, MOB * 0.8 + HOLE_RY + 24);
      ctx.setLineDash([]);
    }

    // The hammer, in screen pixels: its head over the point, swinging down
    // from raised and back.
    function drawHammer(now) {
      let px = ham.x, py = ham.y;
      if (!ham.free) {
        const p = toScreen(HOLE_X[ham.hole % 3], HOLE_Y[Math.floor(ham.hole / 3)] - 110);
        px = p.x; py = p.y;
      }
      const size = clamp(270 * L.k, 52, 170);
      const age = now - ham.swing;
      const rest = 0.55, strike = -0.15;
      let a = rest;
      if (age < 70) a = lerp(rest, strike, age / 70);
      else if (age < 230) a = lerp(strike, rest, (age - 70) / 160);
      const img = spriteOf('hammer');
      const H = 0.28, P = 0.86;
      ctx.save();
      ctx.translate(px - H * size, py - H * size);
      ctx.translate(P * size, P * size);
      ctx.rotate(a);
      ctx.translate(-P * size, -P * size);
      ctx.imageSmoothingEnabled = !!api.img('whack-hammer');
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();
      if (age < 160) {
        // A little impact star.
        const u = age / 160;
        ctx.save();
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = '#fff';
        const r = size * (0.15 + u * 0.25);
        for (let i = 0; i < 4; i++) {
          const ang = (i * Math.PI) / 2 + Math.PI / 4;
          ctx.fillRect(px + Math.cos(ang) * r - 4, py + Math.sin(ang) * r - 4, 8, 8);
        }
        ctx.restore();
      }
    }

    // --- hud -----------------------------------------------------------------
    function txt(str, x, y, size, color = '#fff', align = 'left', weight = 900) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const o = Math.max(1.5, size * 0.09);
      ctx.fillStyle = '#1b1420';
      ctx.fillText(str, x + o, y + o);
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }
    function heart(x, y, s, full) {
      for (let j = 0; j < HEART.length; j++) {
        for (let i = 0; i < 7; i++) {
          if (HEART[j][i] !== 'X') continue;
          ctx.fillStyle = full ? (i === 1 && j === 1 ? '#ffb3b3' : j >= 3 ? '#b8222a' : '#e8343b') : '#3a2030';
          ctx.fillRect(x + i * s, y + j * s, s + 0.5, s + 0.5);
        }
      }
    }

    function others(s) {
      return seated().filter(p => !p.me).map(p => ({ p, st: readState(p.state, s.round) })).filter(o => o.st && o.st.play);
    }

    function drawHud(s, t) {
      const unit = Math.min(w, h);
      const row1 = clamp(h * 0.09, 40, 58);
      const fs = clamp(unit * 0.075, 20, 34);
      const cy = row1 / 2 + 2;
      // Score.
      txt(String(score), 12, cy, fs, '#fff');
      ctx.font = `900 ${fs}px ${FONT}`;
      const sw = ctx.measureText(String(score)).width;
      const room = w / 2 - clamp(w * 0.3, 80, 220) / 2 - 26 - sw;
      ctx.font = `900 ${fs * 0.5}px ${FONT}`;
      const long = `x${comboMult(combo)} · ${combo} in a row`;
      if (combo >= 2) txt(ctx.measureText(long).width <= room ? long : `x${comboMult(combo)} · ${combo}`, 18 + sw, cy + 1, fs * 0.5, '#ffd43b');
      else txt(best && ctx.measureText(`Best ${best}`).width <= room ? `Best ${best}` : 'points', 18 + sw, cy + 1, fs * 0.5, '#ffe8a3', 'left', 800);
      // Hearts.
      const hs = clamp(unit * 0.008, 2.6, 4);
      for (let i = 0; i < HEARTS; i++) heart(w - 12 - (HEARTS - i) * (7 * hs + 5), cy - 3 * hs, hs, i < hearts);
      // Time: a segmented green bar, like an experience bar, with the seconds.
      const left = clamp(DURATION - Math.max(0, t), 0, DURATION);
      const bw = clamp(w * 0.3, 80, 220), bh = clamp(unit * 0.022, 8, 12);
      const bx = w / 2 - bw / 2 + (w < 420 ? 6 : 0), by = cy + fs * 0.32;
      ctx.fillStyle = '#1b1420';
      ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.fillStyle = '#2c3a1e';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = left < 10000 ? '#ff6b3d' : '#80ff20';
      ctx.fillRect(bx, by, bw * (left / DURATION), bh);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(bx, by, bw * (left / DURATION), bh * 0.3);
      ctx.fillStyle = '#1b1420';
      for (let i = 1; i < 10; i++) ctx.fillRect(bx + (bw * i) / 10 - 1, by, 2, bh);
      txt(String(Math.ceil(left / 1000)), w / 2 + (w < 420 ? 6 : 0), by - fs * 0.42, fs * 0.62, left < 10000 ? '#ffb38a' : '#a8ff60', 'center');
      // Friends' live scores.
      const list = others(s);
      if (seated().length > 1) {
        const chips = [{ name: 'You', color: api.me.color, score, out, me: true },
          ...list.map(o => ({ name: o.p.name, color: o.p.color, score: o.st.score, out: o.st.out }))]
          .sort((a, b) => b.score - a.score).slice(0, 6);
        const cf = clamp(unit * 0.034, 11, 14);
        let x = 10;
        const y2 = row1 + clamp(h * 0.045, 20, 26) / 2 - 2;
        ctx.font = `800 ${cf}px ${FONT}`;
        for (const c of chips) {
          const label = `${String(c.name).slice(0, 10)} ${c.score}${c.out ? ' ✖' : ''}`;
          const cw = ctx.measureText(label).width + cf * 1.9;
          if (x + cw > w - 6) break;
          ctx.fillStyle = c.me ? 'rgba(255,212,59,0.3)' : 'rgba(0,0,0,0.4)';
          ctx.fillRect(x, y2 - cf * 0.8, cw, cf * 1.6);
          ctx.fillStyle = typeof c.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.color) ? c.color : '#fff';
          ctx.fillRect(x + cf * 0.35, y2 - cf * 0.35, cf * 0.7, cf * 0.7);
          txt(label, x + cf * 1.3, y2, cf, '#fff', 'left', 800);
          x += cw + 6;
        }
      }
    }

    function banner(str, sub, y) {
      const fs = clamp(Math.min(w, h) * 0.075, 20, 36);
      ctx.font = `900 ${fs}px ${FONT}`;
      const bw = Math.min(w - 20, Math.max(ctx.measureText(str).width, sub ? ctx.measureText(sub).width * 0.55 : 0) + 40);
      const bh = fs * (sub ? 2.5 : 1.6);
      ctx.fillStyle = 'rgba(27,20,32,0.82)';
      ctx.fillRect(w / 2 - bw / 2, y - bh / 2, bw, bh);
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(w / 2 - bw / 2, y - bh / 2, bw, 4);
      txt(str, w / 2, y - (sub ? fs * 0.38 : 0), fs, '#fff', 'center');
      if (sub) txt(sub, w / 2, y + fs * 0.62, fs * 0.5, '#ffe8a3', 'center', 800);
    }

    function drawCenter(t) {
      const midY = clamp(L.oy + HOLE_Y[1] * L.k - 40, hudH + 40, h - 60);
      if (t < 0) {
        const n = Math.ceil(-t / 1000);
        const u = 1 - (-t / 1000 - (n - 1));
        const fs = clamp(Math.min(w, h) * 0.25, 60, 140) * (1.3 - 0.3 * Math.min(1, u * 3));
        txt(String(n), w / 2, midY, fs, '#ffd43b', 'center');
        if (!playing) banner('Watching', 'You join the next round', h - 50);
        else txt('Whack the mobs! Leave villagers alone.', w / 2, midY + fs * 0.75, clamp(w * 0.04, 12, 18), '#fff', 'center', 800);
        return;
      }
      if (t < 700 && playing) {
        txt('WHACK!', w / 2, midY, clamp(Math.min(w, h) * 0.17, 44, 100), '#80ff20', 'center');
      }
      if (t < DURATION) {
        if (!playing) banner('Watching', 'You join the next round', h - 50);
        else if (out) banner('Out of hearts!', `${score} points · waiting for the round to end`, h - 56);
      } else if (over.hidden) banner("Time's up!", null, midY);
    }

    // --- results -----------------------------------------------------------
    function results(s) {
      const rows = [];
      if (playing) rows.push({ name: 'You', color: api.me.color, score, me: true });
      for (const o of others(s)) rows.push({ name: o.p.name, color: o.p.color, score: o.st.score, me: false });
      rows.sort((a, b) => b.score - a.score);
      return rows;
    }

    function updateOver(s, t) {
      const show = t >= DURATION + 400;
      over.hidden = !show;
      if (!show) return;
      const rows = results(s);
      const settled = t >= DURATION + GRACE;
      const canAgain = t >= DURATION + GRACE + AGAIN_AFTER && isSeated(api.me.id);
      const top = rows.length ? rows[0].score : 0;
      const winners = rows.filter(r => r.score === top);
      let title, sub;
      if (!rows.length) { title = 'Round over'; sub = ''; }
      else if (rows.length === 1 && rows[0].me) {
        title = `${score} points!`;
        sub = score > 0 && score >= best ? 'New best!' : `Best ${best}`;
      } else if (winners.length > 1) {
        title = `Tie: ${winners.map(r => r.name).join(' & ')}`;
        sub = `${top} points`;
      } else {
        title = winners[0].me ? 'You win! 🎉' : `${winners[0].name} wins!`;
        sub = `${top} points${playing ? ` · your best ${best}` : ''}`;
      }
      if (!settled) sub = 'Adding up the scores…';
      const sig = JSON.stringify([title, sub, rows, canAgain]);
      if (sig === overSig) return;
      overSig = sig;
      overTitle.textContent = title;
      overSub.textContent = sub;
      rowsEl.replaceChildren(...rows.map((r, i) => {
        const el = document.createElement('div');
        el.className = 'mw-row' + (r.me ? ' me' : '');
        const sq = document.createElement('i');
        sq.style.background = typeof r.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(r.color) ? r.color : '#fff';
        const nm = document.createElement('span');
        nm.textContent = `${i + 1}. ${r.name}`;
        const pts = document.createElement('b');
        pts.textContent = String(r.score);
        el.append(sq, nm, pts);
        return el;
      }));
      rowsEl.hidden = rows.length <= 1;
      again.hidden = !canAgain;
      over.dataset.winner = winners.length === 1 ? (winners[0].me ? api.me.id : String(winners[0].name)) : '';
    }

    // Records and the end-of-round sound, once results have settled.
    function announce(s, t) {
      if (t < DURATION + GRACE || announced === key) return;
      announced = key;
      if (!playing) return;
      const rows = results(s);
      const newBest = score > best;
      if (newBest) { best = score; api.store.set('best', best); }
      if (rows.length > 1) api.sfx(rows[0].me || rows[0].score === score ? 'win' : 'lose');
      else api.sfx(newBest ? 'win' : 'score');
    }

    // --- frame ---------------------------------------------------------------
    let lastFrame = performance.now();
    function frame(now) {
      if (destroyed) return;
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      if (now - lastOwnerTick > 1000) { lastOwnerTick = now; ownerTick(); }
      const s = syncRound();
      buildBg();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bg, 0, 0);
      if (!s) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        txt('Getting the field ready…', w / 2, h / 2, 18, '#fff', 'center');
        raf = requestAnimationFrame(frame);
        return;
      }
      const t = roundT();
      if (t >= 0) step(Math.min(t, DURATION));
      // Countdown and last-seconds ticks.
      const count = t < 0 ? Math.ceil(-t / 1000) : t > DURATION - 5000 && t < DURATION ? Math.ceil((DURATION - t) / 1000) + 10 : 0;
      if (count !== lastCount) {
        if (count > 0 && lastCount !== 99) api.sfx('tick');
        else if (count === 0 && lastCount > 0 && lastCount < 10 && playing) api.sfx('pop');
        lastCount = count;
      }
      // The world, in field pixels, shaken after an explosion.
      shake = Math.max(0, shake - dt * 40);
      const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0;
      ctx.setTransform(dpr * L.k, 0, 0, dpr * L.k, dpr * (L.ox + sx), dpr * (L.oy + sy));
      ctx.imageSmoothingEnabled = false;
      const tc = Math.min(t, DURATION + 1200);
      drawMobs(tc, now);
      ctx.imageSmoothingEnabled = true;
      drawCursor();
      drawBooms(now);
      drawParts(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (flashT > 0) {
        ctx.fillStyle = `rgba(255,255,240,${(flashT * 0.4).toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
        flashT = Math.max(0, flashT - dt * 6);
      }
      drawHud(s, t);
      drawCenter(t);
      if (over.hidden) drawHammer(now);
      updateOver(s, t);
      announce(s, t);
      raf = requestAnimationFrame(frame);
    }

    resize();
    ownerTick();
    raf = requestAnimationFrame(frame);

    // A test bot's move (js/rookie.js): now and then whack a mob that's up,
    // usually the right kind, sometimes a villager or an empty hole.
    function rookie() {
      if (!active() || Math.random() < 0.3) return;
      const t = roundT();
      const up = [];
      for (let hole = 0; hole < HOLES; hole++) {
        const m = mobAt(hole, t);
        if (m && t - m.s.t > 250) up.push({ hole, kind: m.ev.kind });
      }
      const good = up.filter(m => m.kind !== 'villager');
      const pick = list => list[Math.floor(Math.random() * list.length)];
      const r = Math.random();
      let hole;
      if (good.length && r < 0.8) hole = pick(good).hole;
      else if (up.length && r < 0.9) hole = pick(up).hole;
      else hole = Math.floor(Math.random() * HOLES);
      cursorOn = false;
      ham.free = false;
      whack(hole);
    }

    return {
      rookie,
      // For tests: the round, my score and what's up on my field.
      _view() {
        const t = roundT();
        const up = [];
        for (let hole = 0; hole < HOLES; hole++) {
          const m = mobAt(hole, t);
          if (m) up.push({ hole, kind: m.ev.kind, id: m.ev.id, stop: m.j, stops: m.ev.stops.length, since: t - m.s.t, left: m.s.t + m.s.dur - t, screen: toScreen(HOLE_X[hole % 3], HOLE_Y[Math.floor(hole / 3)] - 110) });
        }
        return {
          round, startAt, t, score, hearts, combo, hits, playing, out,
          sched: sched.map(e => `${e.kind[0]}${e.stops.map(s => `${s.hole}@${s.t}`).join('>')}`).join(','),
          outcomes: [...rt.entries()].filter(([, r]) => r.how).map(([id, r]) => ({ id, how: r.how, kind: sched[id]?.kind })),
          up,
          over: !over.hidden,
          winner: over.dataset.winner || '',
          canAgain: !over.hidden && !again.hidden,
        };
      },
      _whack: whack,
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
      },
      onChange() {
        ownerTick();
        const multi = api.players().length > 1;
        const want = clamp(h * 0.09, 40, 58) + (multi ? clamp(h * 0.045, 20, 26) : 0);
        if (want !== hudH) resize();
      },
      onPad(pad) {
        const a = !!(pad.a || pad.xBtn || pad.pressed?.[0]);
        if (!over.hidden) {
          if (a && !padPrev.a && !again.hidden) playAgain();
          padPrev = { a };
          return;
        }
        const dx = pad.left || pad.x < -0.5 ? -1 : pad.right || pad.x > 0.5 ? 1 : 0;
        const dy = pad.up || pad.y < -0.5 ? -1 : pad.down || pad.y > 0.5 ? 1 : 0;
        const dir = `${dx},${dy}`;
        const t = performance.now();
        if ((dx || dy) && (dir !== padDir || t > padRepeat)) {
          moveCursor(dx, dy);
          padRepeat = t + (dir !== padDir ? 280 : 160);
        }
        padDir = dir;
        if (a && !padPrev.a) keyWhack(ham.hole);
        padPrev = { a };
      },
    };
  },
};

// Exposed for tests.
export const _logic = { makeSchedule, mulberry32, comboMult, pointsFor, fieldLayout, validShared, readState, HOLE_X, HOLE_Y, REGION, IMG_W, IMG_H, DURATION, RISE, POINTS };

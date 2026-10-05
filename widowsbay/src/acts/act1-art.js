// Act I drawing: the voyage (kit.voyage) and the ending scenes. Every piece
// of new art has a procedural stand-in until its file is delivered (ids are
// in design/image-requests.md, Part C2).
import { LANTERNS, ENDING, SPOTS } from './act1.js';
import { clamp, easeOut, easeInOut, beatPhase } from './shared.js';

// The deck set as delivered (drawn 1280x500 with its foot at the deck line,
// y 660 when fully up): the deck floor runs y 395-480 behind the carved rail,
// and its two hatches open at x 320-500 and 785-960, around y 450. Figures
// stand on the floor (feet above the rail) or on the barrels (act1.js SPOTS).
const HATCHES = [{ x: 410, y: 450 }, { x: 872, y: 450 }];
const LIP = 472;                 // the hatches' front edge: a figure below it is in the hole
const BAND = { x: 640, y: 474, s: 210 };
const REVELLERS = [
  { id: 'reveller-yellow', col: '#e3c13b' },
  { id: 'reveller-shaggy', col: '#6f9a4a' },
  { id: 'reveller-jester', col: '#8a3f7a' },
  { id: 'reveller-lady', col: '#e7a6bd' },
];
// Revellers spring out of the hatches to their spots as the deck rises,
// hold the moment, and when the witch strikes hop toward the nearest hatch
// and drop in.
const ARRIVE = { from: 0.55, stagger: 0.12, dur: 0.5 };
const FLEE = { from: 0.9, stagger: 0.14, hop: 0.3, hopLen: 120, dive: 0.35 };
const LANTERN_COLS = ['#f3c6dc', '#d9b34a', '#5f8c88'];

export function draw(k, st, t) {
  const b = st.board, ph = st.phase, pt = st.phaseT;
  if (ph === 'voyage' || ph === 'landho') return k.voyage(b);
  if (ph === 'party' || ph === 'turn') {
    // The wave rows sink through the floor and the deck set rises, at once
    // when the bell has rung; it drops away after the revellers are below.
    const deck = ph === 'party' ? easeInOut(pt / 0.8) : 1 - easeInOut((pt - 2.9) / 1.3);
    k.voyage(b, { rowsDrop: deck * 360, hideShip: true });
    if (ph === 'turn') whiteout(k, pt);
    deckScene(k, st, deck, t);
    if (ph === 'turn') spirits(k, pt, t);
    return;
  }
  if (ph === 'wreck') return wreck(k, st, pt, t);
  if (ph === 'sink' || ph === 'iris') return sinking(k, st, ph === 'sink' ? pt : ENDING.sink + pt, t);
}

export function drawOver(k, st) {
  if (st.phase === 'iris') k.iris(640, 400, 760 * (1 - easeInOut(st.phaseT / ENDING.iris)));
  if (st.status === 'won') k.iris(640, 400, 0);
}

export function onEvent(k, e, st) {
  if (st.phase === 'voyage' || st.phase === 'landho') return k.voyageEvent(e, st.board);
  if (e.type === 'partyHit') {
    const x = lanternX(e.n - 1);
    for (const c of LANTERN_COLS) k.burst(x, 170, c, 6);
    k.text('♪', x, 140);
  }
  if (e.type === 'revelry') { k.text('Revelry!', 640, 260, true); for (const c of LANTERN_COLS) k.burst(640, 300, c, 20); }
  if (e.type === 'strike') { k.flash(1); k.shake(0.5); }
  if (e.type === 'shipBreak') { k.shake(0.8); k.burst(560, 470, '#6b4024', 30); }
  if (e.type === 'splash') { k.burst(520, 520, '#eef3ea', 26); k.burst(620, 520, '#eef3ea', 26); }
}

// ---------------------------------------------------------------- party
const lanternX = (i) => 300 + i * (680 / (LANTERNS - 1));

function deckScene(k, st, deck, t) {
  const c = k.c, base = 660 + (1 - deck) * 520, off = base - 660; // deck floor line, and how far it has sunk
  const beat = st.beat ?? t / 0.784;
  const bob = Math.abs(Math.sin(Math.PI * beatPhase(beat)));
  if (deck > 0.5) lanterns(k, st.party.lit, t, deck);
  if (!k.asset('deck-set', 640, base + 10, 1280, 500)) deckStandin(k, base);
  // Everyone on the deck, back to front.
  const items = [{ y: BAND.y, f: () => {
    if (!k.asset('band-trio', BAND.x, BAND.y + off, BAND.s, BAND.s)) {
      for (const [dx, col] of [[-50, '#2b2b2b'], [0, '#e9e1d0'], [50, '#5a4a3a']]) figure(k, BAND.x + dx, BAND.y + off, col, bob * 0.5, 0.9);
    }
  } }];
  REVELLERS.forEach((r, i) => {
    const p = revellerAt(st, i, bob);
    if (!p) return;
    items.push({ y: p.y, f: () => {
      // Clipped at the hatches' front edge, so a figure below it is down the hole.
      c.save(); c.beginPath(); c.rect(0, 0, 1280, LIP + off); c.clip();
      if (!k.asset(r.id, p.x, p.y + off, 110 * p.s, 210 * p.s)) figure(k, p.x, p.y + off, r.col, 0, p.s);
      c.restore();
    } });
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
}

// Where reveller i is (feet x, y, scale), or null while below deck.
function revellerAt(st, i, bob) {
  const spot = SPOTS[st.party.spots?.[i] ?? i + 2];
  const h = HATCHES[spot.x < 640 ? 0 : 1];
  const pt = st.phaseT;
  if (st.phase === 'party') {
    // Out of the hatch in one bound, up and over to the spot.
    const k = clamp((pt - ARRIVE.from - i * ARRIVE.stagger) / ARRIVE.dur, 0, 1);
    if (k <= 0) return null;
    if (k >= 1) return { x: spot.x, y: spot.y - bob * 3 * spot.s, s: spot.s };
    const e = easeOut(k), peak = Math.min(spot.y, h.y) - 120;
    const x = h.x + (spot.x - h.x) * e;
    const y = (1 - e) ** 2 * (h.y + 150) + 2 * (1 - e) * e * peak + e * e * spot.y;
    return { x, y, s: 0.72 + (spot.s - 0.72) * e };
  }
  // The turn: hop, hop toward the hatch, then drop in.
  const dist = Math.hypot(h.x - spot.x, h.y - spot.y), hops = Math.max(1, Math.ceil(dist / FLEE.hopLen));
  let tt = pt - FLEE.from - i * FLEE.stagger;
  if (tt <= 0) return { x: spot.x, y: spot.y, s: spot.s };
  const hopT = hops * FLEE.hop;
  if (tt < hopT) {
    const n = Math.floor(tt / FLEE.hop), f = (tt % FLEE.hop) / FLEE.hop;
    const a = n / hops, b2 = (n + 1) / hops, at = (u) => ({ x: spot.x + (h.x - spot.x) * u, y: spot.y + (h.y - spot.y) * u, s: spot.s + (0.74 - spot.s) * u });
    const p0 = at(a), p1 = at(b2), u = easeInOut(f);
    return { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u - Math.sin(Math.PI * f) * 34, s: p0.s + (p1.s - p0.s) * u };
  }
  tt -= hopT;
  if (tt < FLEE.dive) {
    // a little spring up, then straight down past the lip
    const f = tt / FLEE.dive;
    return { x: h.x, y: h.y - Math.sin(Math.PI * Math.min(1, f * 2)) * 30 * (f < 0.5 ? 1 : 0) + Math.max(0, f - 0.3) / 0.7 * 230, s: 0.74 };
  }
  return null;
}

function lanterns(k, lit, t, deck) {
  const c = k.c, y0 = 120 + (1 - deck) * 200;
  c.strokeStyle = k.col('#3a2112'); c.lineWidth = 2;
  c.beginPath(); c.moveTo(250, y0 - 20);
  for (let i = 0; i < LANTERNS; i++) c.lineTo(lanternX(i), y0 + Math.sin((i / (LANTERNS - 1)) * Math.PI) * 40);
  c.lineTo(1030, y0 - 20); c.stroke();
  for (let i = 0; i < LANTERNS; i++) {
    const x = lanternX(i), y = y0 + Math.sin((i / (LANTERNS - 1)) * Math.PI) * 40 + 18;
    const on = i < lit;
    if (on) {
      const g = c.createRadialGradient(x, y, 2, x, y, 40);
      g.addColorStop(0, k.P.mode === 'lum' ? 'rgba(255,245,215,0.7)' : 'rgba(255,210,120,0.7)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x - 40, y - 40, 80, 80);
    }
    c.fillStyle = k.col(on ? LANTERN_COLS[i % 3] : '#4b3a45');
    c.beginPath(); c.ellipse(x, y, 13, 16, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = k.col('#3a2112'); c.fillRect(x - 6, y - 19, 12, 4); c.fillRect(x - 6, y + 15, 12, 4);
  }
}

function deckStandin(k, base) {
  const c = k.c;
  // mast and rigging
  c.fillStyle = k.col('#3a2112'); c.fillRect(632, base - 560, 16, 500);
  c.strokeStyle = k.col('#3a2112'); c.lineWidth = 2;
  for (const dx of [-300, -150, 150, 300]) { c.beginPath(); c.moveTo(640, base - 540); c.lineTo(640 + dx, base - 64); c.stroke(); }
  // deck boards
  c.fillStyle = k.col('#8a5a32'); c.fillRect(0, base - 64, 1280, 80);
  c.fillStyle = k.col('#1a1012');
  for (const h of HATCHES) c.fillRect(h.x - 70, base - 660 + h.y - 20, 140, 36);
  // barrels
  for (const x of [560, 720]) { c.fillStyle = k.col('#7a4a26'); c.beginPath(); c.ellipse(x, base - 96, 30, 36, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = k.col('#3a2112'); c.fillRect(x - 30, base - 106, 60, 5); c.fillRect(x - 30, base - 88, 60, 5); }
  // carved rail with heraldic shields
  c.fillStyle = k.col('#b9a27c'); c.fillRect(0, base - 30, 1280, 50);
  c.fillStyle = k.col('#8c7448'); c.fillRect(0, base - 34, 1280, 6);
  for (let x = 120; x < 1280; x += 160) {
    c.fillStyle = k.col(['#8e1730', '#d9b34a', '#5f8c88'][(x / 160) % 3 | 0]);
    c.beginPath(); c.moveTo(x - 18, base - 20); c.lineTo(x + 18, base - 20); c.lineTo(x + 18, base - 2); c.quadraticCurveTo(x, base + 16, x - 18, base - 2); c.closePath(); c.fill();
  }
}

// A stand-in cut-out person: hat, head, coat in `col`, dancing with the beat.
function figure(k, x0, y0, col, bob = 0, s = 1) {
  const c = k.c;
  c.save(); c.translate(x0, y0); c.scale(s, s);
  const x = 0, y = 0;
  c.fillStyle = k.col(col);
  c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x - 16, y - 90); c.lineTo(x + 16, y - 90); c.lineTo(x + 22, y); c.fill();
  c.save(); c.translate(x, y - 80); c.rotate((bob - 0.5) * 0.8);
  c.fillRect(-36, -4, 72, 9); c.restore();
  c.fillStyle = k.col('#efd7c4'); k.circle(x, y - 104, 13);
  c.fillStyle = k.col('#2a1a22'); c.fillRect(x - 15, y - 122, 30, 7);
  c.restore();
}

// ---------------------------------------------------------------- the turn
function whiteout(k, pt) {
  // The sky bleaches white, as in the video around 1:00.
  k.wash('#f4f1ea', 0.75 * easeInOut(pt / 1.3) * (1 - easeInOut((pt - 3.0) / 1.4)));
}

function spirits(k, pt, t) {
  const c = k.c;
  for (let i = 0; i < 4; i++) {
    const rise = easeOut((pt - 0.3 - i * 0.2) / 1.6);
    if (rise <= 0) continue;
    const x = 260 + i * 250 + Math.sin(t * 0.9 + i) * 20, y = 760 - rise * 360;
    c.save(); c.globalAlpha = 0.55 * (1 - easeInOut((pt - 3.2) / 1.2));
    if (!k.asset('sea-spirit', x, y, 150, 300)) {
      c.fillStyle = k.col('#ffffff');
      c.beginPath(); c.moveTo(x - 40, y); c.quadraticCurveTo(x - 50, y - 160, x, y - 230); c.quadraticCurveTo(x + 50, y - 160, x + 40, y);
      c.quadraticCurveTo(x, y - 30, x - 40, y); c.fill();
      c.beginPath(); c.moveTo(x - 30, y - 170); c.lineTo(x - 70, y - 250); c.lineTo(x - 22, y - 190); c.fill();
      c.beginPath(); c.moveTo(x + 30, y - 170); c.lineTo(x + 70, y - 250); c.lineTo(x + 22, y - 190); c.fill();
    }
    c.restore();
  }
}

// ---------------------------------------------------------------- the wreck
function wreck(k, st, pt, t) {
  const c = k.c, b = st.board;
  // The waterspout stands behind the ship, which is lifted and broken in front of it.
  k.voyage(b, { hideShip: true, beforeWave: (r) => { if (r === 1) { waterspout(k, pt, t); shipWreck(k, st, pt, t); } } });
}

function waterspout(k, pt, t) {
  const c = k.c;
  const rise = easeOut(pt / 0.9) * (1 - easeInOut((pt - 3.2) / 1.0));
  if (rise > 0 && !k.asset('waterspout', 560, 560, 300 * rise, 550 * rise)) {
    // A twisting column of water, narrow at the sea and flaring into cloud.
    const H = 520 * rise, pts = 24, edge = (side, i) => {
      const f = i / pts, y = 560 - f * H;
      const w = (18 + f * f * 120) * rise, sway = Math.sin(t * 4 + f * 6) * 22 * rise * f;
      return [560 + sway + side * w, y];
    };
    c.fillStyle = k.col('#5f8c88'); c.globalAlpha = 0.8;
    c.beginPath();
    for (let i = 0; i <= pts; i++) c.lineTo(...edge(-1, i));
    for (let i = pts; i >= 0; i--) c.lineTo(...edge(1, i));
    c.fill();
    c.strokeStyle = k.col('#eef3ea'); c.lineWidth = 3;
    for (let j = 0; j < 6; j++) {
      c.beginPath();
      for (let i = 0; i <= pts; i++) { const [lx, y] = edge(-1, i), [rx] = edge(1, i); const f = (Math.sin(t * 5 + i * 0.5 + j) + 1) / 2; c.lineTo(lx + (rx - lx) * f, y); }
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}

function shipWreck(k, st, pt, t) {
  const c = k.c, x = st.board.ship.x, y0 = 512;
  const lift = easeInOut((pt - 0.5) / 1.1) * 110 * (1 - easeInOut((pt - 2.0) / 1.2));
  const brk = easeInOut((pt - 2.0) / 1.2);  // halves part and tip
  const sink = easeInOut((pt - 2.5) / 1.8) * 200;
  for (const side of [-1, 1]) {
    c.save();
    c.translate(x + side * brk * 50, y0 - lift + sink);
    c.rotate(side * brk * 0.6 + Math.sin(t * 2.4) * 0.04);
    const half = side < 0 ? 'ship-wreck-bow' : 'ship-wreck-stern';
    // The delivered halves once requested art arrives; until then each half of
    // the ship's own art (380x400, drawn 190x200 with its waterline at +20).
    if (!(brk > 0.05 && k.asset(half, side * 75, 20, 150, 200))) {
      if (!k.assetCrop('ship', side < 0 ? 0 : 190, 0, 190, 400, side < 0 ? -95 : 0, -180, 95, 200)) {
        c.fillStyle = k.col('#6b4024'); c.fillRect(side < 0 ? -80 : 0, -30, 80, 46);
        c.fillStyle = k.col('#f1e3c8'); c.fillRect(side < 0 ? -46 : 0, -140, 46, 96);
      }
    }
    c.restore();
  }
}

// ---------------------------------------------------------------- the deep
function sinking(k, st, pt, t) {
  const c = k.c;
  const g = c.createLinearGradient(0, 60, 0, 720);
  g.addColorStop(0, k.col('#2f5552')); g.addColorStop(1, k.col('#0d1c22'));
  c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
  // light rays from the surface
  c.save(); c.globalAlpha = 0.18; c.fillStyle = k.col('#eef3ea');
  for (let i = 0; i < 5; i++) { const x = 250 + i * 200 + Math.sin(t * 0.4 + i) * 30; c.beginPath(); c.moveTo(x, 60); c.lineTo(x + 60, 60); c.lineTo(x + 160, 720); c.lineTo(x + 40, 720); c.fill(); }
  c.restore();
  // kelp swaying up from the floor
  c.strokeStyle = k.col('#3f6a3a'); c.lineWidth = 8; c.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x = 170 + i * 160; c.beginPath(); c.moveTo(x, 720);
    for (let y = 700; y > 420 + (i % 3) * 60; y -= 30) c.lineTo(x + Math.sin(t * 1.3 + y * 0.02 + i) * 22, y);
    c.stroke();
  }
  // the guitar tumbling down, as in the video at 1:05
  const gy = -120 + easeOut(pt / (ENDING.sink + ENDING.iris)) * 520, gx = 640 + Math.sin(t * 0.8) * 30;
  c.save(); c.translate(gx, gy); c.rotate(0.6 + Math.sin(t * 0.7) * 0.25);
  if (!k.asset('guitar-sinking', 0, 130, 110, 260)) guitarStandin(k);
  c.restore();
  // bubbles
  c.fillStyle = k.col('#eef3ea');
  for (let i = 0; i < 18; i++) {
    const by = 720 - ((t * 60 + i * 97) % 700), bx = gx - 60 + ((i * 53) % 120) + Math.sin(t * 2 + i) * 8;
    c.globalAlpha = 0.5; k.circle(bx, by, 3 + (i % 4));
  }
  c.globalAlpha = 1;
}

function guitarStandin(k) {
  const c = k.c;
  c.fillStyle = k.col('#5a3a1e'); c.fillRect(-7, -140, 14, 110);
  c.fillStyle = k.col('#3a2112'); c.fillRect(-11, -158, 22, 20);
  c.fillStyle = k.col('#e8d3a0'); k.circle(0, -10, 38); k.circle(0, 50, 46);
  c.fillStyle = k.col('#2a1a12'); k.circle(0, 4, 13);
  c.strokeStyle = k.col('#cfcfcf'); c.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 3, -150); c.lineTo(i * 3, 80); c.stroke(); }
}

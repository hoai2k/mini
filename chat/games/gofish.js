// Go Fish with creatures from the ancient oceans: thirteen of them, four
// cards each. On your turn pick a creature you hold and ask someone for it.
// If they have any they hand them all over and you go again; if not they say
// "Go Fish!" and you press Go Fish: your angler casts into the pond, where
// fish shadows swim (as many as the cards left, from four down), and reels up
// a card. Catching what you asked for earns another go. Four of a kind make a
// book; most books wins. Players gather in a lobby first and anyone deals;
// alone, you play Robo-Fisher.
//
// The owner holds the whole game in shared state (hands, pond, books, phase)
// and runs the clocks; everyone else sends 'ask', 'answer', 'fish' and draws
// from shared(). Hands are in shared state, so the client only shows your own.

const RANKS = [
  { id: 'anomalocaris', name: 'Anomalocaris', period: 'Cambrian', color: '#e2433a', fact: 'The top hunter of the Cambrian seas, with two spiky grabbing arms.' },
  { id: 'opabinia', name: 'Opabinia', period: 'Cambrian', color: '#3b7be0', fact: 'Five eyes, and a long nozzle with a claw on the end.' },
  { id: 'hallucigenia', name: 'Hallucigenia', period: 'Cambrian', color: '#f28c28', fact: 'Walked on soft stilt legs, with spikes along its back.' },
  { id: 'pikaia', name: 'Pikaia', period: 'Cambrian', color: '#3fbf95', fact: 'A tiny swimmer, an early cousin of every animal with a backbone.' },
  { id: 'burgessomedusa', name: 'Burgessomedusa', period: 'Cambrian', color: '#e46fb5', fact: 'One of the oldest swimming jellyfish ever found.' },
  { id: 'trilobite', name: 'Trilobite', period: 'Cambrian–Permian', color: '#b9803f', fact: 'Armoured bugs of the sea floor that could roll up into a ball.' },
  { id: 'nautilus', name: 'Nautilus', period: 'Living fossil', color: '#d9653b', fact: 'Floats up and down with gas in its shell. Still alive today!' },
  { id: 'dunkleosteus', name: 'Dunkleosteus', period: 'Devonian', color: '#5f7391', fact: 'An armoured giant fish with bony blades instead of teeth.' },
  { id: 'tiktaalik', name: 'Tiktaalik', period: 'Devonian', color: '#86b52f', fact: 'A fish with a neck and sturdy fins, on its way to land.' },
  { id: 'helicoprion', name: 'Helicoprion', period: 'Permian', color: '#1a9d94', fact: 'Its teeth grew in a spiral, like a buzz saw.' },
  { id: 'ichthyosaur', name: 'Ichthyosaur', period: 'Triassic', color: '#e8b625', fact: 'A dolphin-shaped reptile with enormous eyes.' },
  { id: 'plesiosaur', name: 'Plesiosaur', period: 'Jurassic', color: '#8a63d2', fact: 'A very long neck and four flippers to fly through the water.' },
  { id: 'mosasaur', name: 'Mosasaur', period: 'Cretaceous', color: '#2f7d4f', fact: 'A giant sea lizard, one of the biggest hunters of its time.' },
];
const N = RANKS.length;
const MAX_PLAYERS = 5;
const BOT = 'bot';
const BOT_NAME = 'Robo-Fisher';
const BOT_COLOR = '#8fa3b8';
const CATCH_MS = 2900;     // the cast, the bite and the reel
const BOT_MS = 1500;       // Robo-Fisher's thinking time
const ANSWER_MS = 25000;   // then the owner answers for a quiet player (truthfully)
const FISH_MS = 25000;     // then the owner fishes for them
const ASK_MS = 90000;      // then the owner asks for them
const SHADOWS = 4;         // fish shadows in the pond while plenty are left

const CSS = `
.gf { position: absolute; inset: 0; display: flex; flex-direction: column; color: #fff; }
.gf-top { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; padding: 6px 8px 4px; }
.gf-chip { display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 999px; background: rgba(0,0,0,0.3); border: 2px solid transparent; font: inherit; color: inherit; font-weight: 800; max-width: 48%; }
.gf-chip .dot { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 0.8rem; color: #fff; background: var(--pc, #888); }
.gf-chip .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gf-chip .ct { flex: none; font-size: 0.8rem; opacity: 0.9; }
.gf-chip.turn { border-color: var(--sun); box-shadow: 0 0 12px rgba(255,212,59,0.45); }
.gf-chip.pick { cursor: pointer; border-color: rgba(255,255,255,0.5); }
.gf-chip.pick.sel { border-color: var(--aqua); box-shadow: 0 0 12px rgba(63,224,208,0.6); }
.gf-chip:disabled { opacity: 0.55; }
.gf-books { display: inline-flex; gap: 2px; }
.gf-books i { width: 8px; height: 11px; border-radius: 2px; background: var(--bc); box-shadow: 0 0 0 1px rgba(255,255,255,0.6); }
.gf-pond { position: relative; flex: 1; min-height: 120px; margin: 0 8px; border-radius: 18px; overflow: hidden; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.12); }
.gf-pond canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.gf-bubble { position: absolute; max-width: 70%; padding: 7px 12px; border-radius: 16px; background: #fff; color: #23163f; font-weight: 800; font-size: 0.95rem; line-height: 1.25; box-shadow: 0 4px 12px rgba(0,0,0,0.35); pointer-events: none; animation: gf-pop 0.3s cubic-bezier(.3,1.5,.5,1); }
.gf-bubble b { display: block; font-size: 0.72rem; color: #6b5a8e; }
.gf-bubble.ask { left: 4%; bottom: 34%; border-bottom-left-radius: 4px; }
.gf-bubble.reply { right: 5%; top: 6%; border-top-right-radius: 4px; background: #fff7c2; }
.gf-bubble.reply.big { font-size: 1.35rem; }
.gf-bubble[hidden] { display: none; }
@keyframes gf-pop { from { transform: scale(0.6); opacity: 0; } to { transform: none; opacity: 1; } }
.gf-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 10px; padding: 6px 10px 4px; text-align: center; }
.gf-status { flex: 1 1 100%; font-weight: 900; font-size: 1.02rem; min-height: 1.3em; }
.gf-bar .btn { padding: 9px 16px; }
.gf-bar .btn.fish { font-size: 1.25rem; padding: 12px 26px; animation: gf-throb 1.2s ease-in-out infinite; }
@keyframes gf-throb { 50% { transform: scale(1.06); } }
.gf-hand { display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-start; gap: 8px; padding: 6px 8px 10px; overflow-y: auto; max-height: 40%; }
.gf-hand .muted { padding: 10px; }
.gf-card { --w: 70px; position: relative; flex: none; width: var(--w); height: calc(var(--w) * 1.375); padding: 0; border: 0; border-radius: 10px; font: inherit; color: #fff; cursor: pointer;
  background: linear-gradient(170deg, color-mix(in srgb, var(--c) 55%, white), var(--c) 55%, color-mix(in srgb, var(--c) 70%, black));
  box-shadow: 0 0 0 2px #fff inset, 0 3px 0 rgba(0,0,0,0.35); transition: transform 0.15s; }
.gf-card.n2 { box-shadow: 0 0 0 2px #fff inset, 4px -4px 0 -1px #fff, 4px -4px 0 1px var(--c), 0 3px 0 rgba(0,0,0,0.35); }
.gf-card.n3 { box-shadow: 0 0 0 2px #fff inset, 4px -4px 0 -1px #fff, 4px -4px 0 1px var(--c), 8px -8px 0 -1px #fff, 8px -8px 0 1px var(--c), 0 3px 0 rgba(0,0,0,0.35); }
.gf-card .pd { position: absolute; top: 4px; left: 3px; right: 3px; text-align: center; white-space: nowrap; font-size: calc(var(--w) * 0.12 * var(--fit, 1)); font-weight: 800; opacity: 0.9; }
.gf-card img { position: absolute; left: 6%; right: 6%; top: 16%; width: 88%; height: 58%; object-fit: contain; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3)); }
.gf-card .nm { position: absolute; left: 2px; right: 2px; bottom: 5px; text-align: center; font-size: calc(var(--w) * 0.145 * var(--fit, 1)); font-weight: 900; text-shadow: 0 1px 2px rgba(0,0,0,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gf-card .x { position: absolute; top: -7px; right: -7px; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 11px; background: var(--sun); color: #2b1f4a; font-size: 0.8rem; font-weight: 900; display: grid; place-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
.gf-card.sel { transform: translateY(-8px); box-shadow: 0 0 0 3px var(--aqua), 0 0 16px rgba(63,224,208,0.7), 0 3px 0 rgba(0,0,0,0.35); }
.gf-card.want { animation: gf-want 0.9s ease-in-out infinite; }
@keyframes gf-want { 50% { transform: translateY(-6px); box-shadow: 0 0 0 3px var(--sun), 0 0 18px rgba(255,212,59,0.8); } }
.gf-card.new { animation: gf-in 0.5s cubic-bezier(.3,1.4,.5,1); }
@keyframes gf-in { from { transform: translateY(-30px) scale(0.6); opacity: 0; } }
.gf-card[aria-disabled="true"] { cursor: default; }
.gf-over { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: rgba(12,20,40,0.88); text-align: center; padding: 16px; animation: gf-fade 0.4s both; }
.gf-over[hidden] { display: none; }
@keyframes gf-fade { from { opacity: 0; } }
.gf-fact { max-width: 30em; font-size: 0.9rem; opacity: 0.85; }
`;

// --- rules (pure, also used by the tests) ---------------------------------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newDeck() {
  const d = [];
  for (let r = 0; r < N; r++) d.push(r, r, r, r);
  return shuffle(d);
}

export const dealSize = players => (players <= 3 ? 7 : 5);

// Takes every complete set of four out of a hand: { hand, books }.
export function takeBooks(hand) {
  const counts = new Array(N).fill(0);
  for (const r of hand) counts[r]++;
  const books = [];
  counts.forEach((c, r) => { if (c >= 4) books.push(r); });
  return { hand: hand.filter(r => !books.includes(r)), books };
}

const sortHand = h => [...h].sort((a, b) => a - b);

function validShared(s) {
  const cards = a => Array.isArray(a) && a.every(r => Number.isInteger(r) && r >= 0 && r < N);
  return s && Number.isFinite(s.game) && Array.isArray(s.order) && s.order.every(id => typeof id === 'string')
    && s.hands && typeof s.hands === 'object' && s.order.every(id => cards(s.hands[id] || []))
    && cards(s.pond) && s.books && typeof s.books === 'object' && typeof s.turn === 'string'
    && ['lobby', 'ask', 'answer', 'fish', 'catch', 'over'].includes(s.phase) && Array.isArray(s.evs);
}

// --- stand-in creature drawings (until the card art arrives) --------------
// Each draws into a 100 x 100 box; the canvas is scaled by the caller.
function eye(c, x, y, r) {
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = '#1b1430'; c.beginPath(); c.arc(x + r * 0.2, y, r * 0.55, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x + r * 0.35, y - r * 0.25, r * 0.2, 0, 7); c.fill();
}
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
function blob(c, fill, line, draw) {
  c.beginPath(); draw(); c.fillStyle = fill; c.fill();
  c.lineWidth = 2.2; c.strokeStyle = line; c.stroke();
}

const DRAW = {
  anomalocaris(c, col) {
    const dk = shade(col, -0.35), lt = shade(col, 0.35);
    // tail fan
    for (const [a, l] of [[-0.5, 16], [0, 18], [0.5, 16]]) {
      blob(c, lt, dk, () => { c.save(); c.translate(18, 52); c.rotate(Math.PI + a); c.ellipse(l / 2, 0, l / 2, 4, 0, 0, 7); c.restore(); });
    }
    // side flaps, back to front
    for (let i = 0; i < 7; i++) {
      const x = 26 + i * 8;
      blob(c, i % 2 ? col : lt, dk, () => c.ellipse(x, 38, 6, 11, -0.3, 0, 7));
      blob(c, i % 2 ? col : lt, dk, () => c.ellipse(x, 66, 6, 11, 0.3, 0, 7));
    }
    blob(c, col, dk, () => c.ellipse(52, 52, 33, 12, 0, 0, 7));
    for (let i = 0; i < 6; i++) { c.strokeStyle = dk; c.lineWidth = 1.2; c.beginPath(); c.moveTo(30 + i * 8, 42); c.lineTo(30 + i * 8, 62); c.stroke(); }
    // stalked eyes
    c.strokeStyle = dk; c.lineWidth = 2.5;
    for (const [ex, ey] of [[80, 30], [72, 28]]) { c.beginPath(); c.moveTo(ex - 4, 44); c.lineTo(ex, ey + 4); c.stroke(); eye(c, ex, ey, 5); }
    // grabbing arms with spikes
    for (const dy of [-3, 5]) {
      c.strokeStyle = dk; c.lineWidth = 4.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(84, 52 + dy); c.quadraticCurveTo(100, 50 + dy, 95, 70 + dy); c.stroke();
      c.strokeStyle = col; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(84, 52 + dy); c.quadraticCurveTo(100, 50 + dy, 95, 70 + dy); c.stroke();
      c.strokeStyle = dk; c.lineWidth = 1.4;
      for (let k = 1; k < 5; k++) { const t = k / 5, x = 84 + 32 * t * (1 - t) + 11 * t * t, y = 52 + dy + 18 * t * t; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 3); c.stroke(); }
    }
  },
  opabinia(c, col) {
    const dk = shade(col, -0.35), lt = shade(col, 0.4);
    for (const [a, l] of [[-0.45, 14], [0, 16], [0.45, 14]]) blob(c, lt, dk, () => { c.save(); c.translate(16, 56); c.rotate(Math.PI + a); c.ellipse(l / 2, 0, l / 2, 4, 0, 0, 7); c.restore(); });
    for (let i = 0; i < 6; i++) {
      blob(c, i % 2 ? col : lt, dk, () => c.ellipse(24 + i * 8, 46, 5, 9, -0.3, 0, 7));
      blob(c, i % 2 ? col : lt, dk, () => c.ellipse(24 + i * 8, 68, 5, 9, 0.3, 0, 7));
    }
    blob(c, col, dk, () => c.ellipse(44, 57, 26, 10, 0, 0, 7));
    // five stalked eyes
    c.strokeStyle = dk; c.lineWidth = 2;
    [[56, 34], [62, 30], [68, 29], [74, 31], [79, 36]].forEach(([x, y]) => { c.beginPath(); c.moveTo(66, 50); c.lineTo(x, y + 3); c.stroke(); });
    [[56, 34], [62, 30], [68, 29], [74, 31], [79, 36]].forEach(([x, y]) => eye(c, x, y, 3.6));
    blob(c, col, dk, () => c.ellipse(68, 54, 8, 7, 0, 0, 7));
    // the nozzle and its claw
    c.lineCap = 'round'; c.strokeStyle = dk; c.lineWidth = 5;
    c.beginPath(); c.moveTo(74, 56); c.bezierCurveTo(88, 58, 86, 76, 94, 80); c.stroke();
    c.strokeStyle = lt; c.lineWidth = 3; c.stroke();
    c.strokeStyle = dk; c.lineWidth = 2;
    c.beginPath(); c.moveTo(94, 80); c.lineTo(99, 77); c.moveTo(94, 80); c.lineTo(98, 85); c.stroke();
  },
  hallucigenia(c, col) {
    const dk = shade(col, -0.35), lt = shade(col, 0.35);
    c.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x = 22 + i * 9;
      c.strokeStyle = dk; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x, 58); c.quadraticCurveTo(x - 3, 70, x + 1, 82); c.stroke();
      c.strokeStyle = lt; c.lineWidth = 1.8; c.stroke();
      blob(c, '#fff4d8', dk, () => { c.moveTo(x - 3, 50); c.lineTo(x + 1, 28 + (i % 2) * 4); c.lineTo(x + 4, 50); c.closePath(); });
    }
    c.strokeStyle = dk; c.lineWidth = 13; c.beginPath(); c.moveTo(16, 56); c.quadraticCurveTo(50, 50, 84, 55); c.stroke();
    c.strokeStyle = col; c.lineWidth = 10; c.stroke();
    blob(c, col, dk, () => c.arc(88, 54, 7, 0, 7));
    eye(c, 90, 52, 2.6);
  },
  pikaia(c, col) {
    const dk = shade(col, -0.35), lt = shade(col, 0.45);
    blob(c, col, dk, () => { c.moveTo(14, 58); c.bezierCurveTo(30, 34, 70, 36, 86, 50); c.bezierCurveTo(70, 66, 30, 72, 14, 58); });
    blob(c, lt, dk, () => { c.moveTo(14, 58); c.bezierCurveTo(8, 48, 6, 64, 10, 70); c.closePath(); });
    c.strokeStyle = dk; c.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) { const x = 26 + i * 6.5; c.beginPath(); c.moveTo(x, 46); c.lineTo(x + 4, 54); c.lineTo(x, 62); c.stroke(); }
    c.lineWidth = 2; c.beginPath(); c.moveTo(86, 50); c.quadraticCurveTo(93, 44, 96, 40); c.moveTo(86, 50); c.quadraticCurveTo(94, 50, 97, 46); c.stroke();
    eye(c, 78, 49, 3.4);
  },
  burgessomedusa(c, col) {
    const dk = shade(col, -0.3), lt = shade(col, 0.5);
    c.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = 24 + i * 2.4;
      c.strokeStyle = i % 2 ? col : lt; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(x, 54);
      c.bezierCurveTo(x - 4, 64, x + 4, 76, x - 2 + Math.sin(i) * 3, 88 - (i % 3) * 4); c.stroke();
    }
    c.globalAlpha = 0.88;
    blob(c, col, dk, () => { c.moveTo(20, 56); c.bezierCurveTo(20, 12, 80, 12, 80, 56); c.quadraticCurveTo(50, 62, 20, 56); });
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(38, 30, 7, 11, -0.5, 0, 7); c.fill();
    c.fillStyle = lt; c.beginPath(); c.ellipse(50, 44, 14, 6, 0, 0, 7); c.fill();
  },
  trilobite(c, col) {
    const dk = shade(col, -0.4), lt = shade(col, 0.35);
    blob(c, col, dk, () => c.ellipse(50, 56, 26, 36, 0, 0, 7));
    blob(c, lt, dk, () => { c.moveTo(22, 34); c.quadraticCurveTo(50, 2, 78, 34); c.quadraticCurveTo(50, 40, 22, 34); });
    c.strokeStyle = dk; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(24, 34); c.lineTo(16, 56); c.moveTo(76, 34); c.lineTo(84, 56); c.stroke();
    c.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) { const y = 40 + i * 5.4, w = 25 * Math.sqrt(1 - ((y - 56) / 36) ** 2); c.beginPath(); c.moveTo(50 - w, y); c.quadraticCurveTo(50, y + 3, 50 + w, y); c.stroke(); }
    blob(c, shade(col, 0.15), dk, () => c.ellipse(50, 58, 7, 30, 0, 0, 7));
    blob(c, lt, dk, () => c.ellipse(50, 24, 8, 9, 0, 0, 7));
    for (const x of [37, 63]) { blob(c, '#3a2a18', '#2a1d10', () => c.ellipse(x, 28, 4, 5.5, x < 50 ? 0.4 : -0.4, 0, 7)); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 1, 26.5, 1.3, 0, 7); c.fill(); }
  },
  nautilus(c, col) {
    const dk = shade(col, -0.45);
    // tentacles
    c.strokeStyle = '#f2b38f'; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(30, 54 + i * 1.5); c.quadraticCurveTo(18, 56 + i * 3, 8 + (i % 3) * 3, 52 + i * 4); c.stroke(); }
    blob(c, '#fbead2', dk, () => c.arc(56, 50, 32, 0, 7));
    // tiger stripes swirling in
    c.save(); c.beginPath(); c.arc(56, 50, 31, 0, 7); c.clip();
    c.strokeStyle = col; c.lineWidth = 5.5;
    for (let i = 0; i < 7; i++) { const a = -0.4 + i * 0.55; c.beginPath(); c.moveTo(56 + Math.cos(a) * 34, 50 + Math.sin(a) * 34); c.quadraticCurveTo(56 + Math.cos(a + 0.6) * 18, 50 + Math.sin(a + 0.6) * 18, 58, 52); c.stroke(); }
    c.restore();
    c.strokeStyle = dk; c.lineWidth = 2; c.beginPath();
    for (let t = 0; t < 12; t += 0.2) { const r = 30 * Math.exp(-t * 0.22), x = 58 + Math.cos(t) * r, y = 52 + Math.sin(t) * r; t === 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
    blob(c, '#c97a5a', dk, () => { c.moveTo(26, 40); c.quadraticCurveTo(34, 34, 40, 44); c.lineTo(38, 64); c.quadraticCurveTo(28, 62, 26, 54); c.closePath(); });
    eye(c, 34, 50, 4.5);
  },
  dunkleosteus(c, col) {
    const dk = shade(col, -0.4), lt = shade(col, 0.4);
    blob(c, lt, dk, () => { c.moveTo(8, 34); c.lineTo(22, 52); c.lineTo(8, 70); c.lineTo(16, 52); c.closePath(); });
    blob(c, lt, dk, () => { c.moveTo(18, 52); c.quadraticCurveTo(40, 34, 64, 38); c.lineTo(64, 70); c.quadraticCurveTo(40, 70, 18, 52); });
    // armoured head, jaws open
    blob(c, col, dk, () => { c.moveTo(52, 34); c.quadraticCurveTo(84, 26, 96, 46); c.lineTo(66, 52); c.lineTo(52, 56); c.closePath(); });
    blob(c, col, dk, () => { c.moveTo(54, 60); c.lineTo(68, 56); c.lineTo(94, 70); c.quadraticCurveTo(76, 80, 54, 72); c.closePath(); });
    blob(c, '#7a1f2b', dk, () => { c.moveTo(66, 52); c.lineTo(96, 46); c.lineTo(94, 70); c.lineTo(68, 56); c.closePath(); });
    c.fillStyle = '#fff';
    for (const [x, y, d] of [[92, 47, 1], [86, 48, 1], [90, 68, -1], [84, 65, -1]]) { c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x, y + d * 6); c.lineTo(x + 3, y); c.fill(); }
    c.strokeStyle = dk; c.lineWidth = 1.4; c.beginPath(); c.moveTo(60, 36); c.lineTo(62, 54); c.moveTo(70, 33); c.lineTo(72, 50); c.stroke();
    eye(c, 78, 38, 4.2);
  },
  tiktaalik(c, col) {
    const dk = shade(col, -0.45), lt = shade(col, 0.35);
    blob(c, lt, dk, () => { c.moveTo(8, 50); c.quadraticCurveTo(14, 44, 22, 50); c.quadraticCurveTo(14, 58, 8, 56); c.closePath(); });
    blob(c, col, dk, () => { c.moveTo(18, 52); c.quadraticCurveTo(40, 36, 66, 42); c.quadraticCurveTo(94, 40, 96, 52); c.quadraticCurveTo(80, 60, 66, 60); c.quadraticCurveTo(40, 66, 18, 52); });
    c.fillStyle = dk; for (const [x, y] of [[34, 48], [44, 46], [52, 52], [40, 55], [58, 46]]) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
    // sturdy front fins pushing up
    blob(c, lt, dk, () => { c.moveTo(60, 58); c.quadraticCurveTo(58, 72, 52, 78); c.lineTo(64, 78); c.quadraticCurveTo(66, 68, 68, 58); c.closePath(); });
    blob(c, lt, dk, () => { c.moveTo(38, 58); c.quadraticCurveTo(36, 68, 30, 74); c.lineTo(40, 74); c.quadraticCurveTo(44, 66, 44, 59); c.closePath(); });
    c.strokeStyle = dk; c.lineWidth = 1.6; c.beginPath(); c.moveTo(82, 54); c.quadraticCurveTo(90, 55, 95, 52); c.stroke();
    eye(c, 80, 43, 3.6);
  },
  helicoprion(c, col) {
    const dk = shade(col, -0.45), lt = shade(col, 0.45);
    blob(c, lt, dk, () => { c.moveTo(6, 30); c.lineTo(22, 50); c.lineTo(8, 70); c.lineTo(16, 50); c.closePath(); });
    blob(c, col, dk, () => { c.moveTo(18, 50); c.quadraticCurveTo(50, 26, 90, 44); c.quadraticCurveTo(70, 56, 60, 58); c.quadraticCurveTo(40, 64, 18, 50); });
    blob(c, col, dk, () => { c.moveTo(46, 36); c.lineTo(54, 20); c.lineTo(60, 36); c.closePath(); });
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(52, 52, 22, 4, 0.05, 0, 7); c.fill();
    // the tooth whorl in the lower jaw
    const cx = 74, cy = 62;
    blob(c, '#f4ead8', dk, () => c.arc(cx, cy, 11, 0, 7));
    c.fillStyle = '#fff'; c.strokeStyle = dk; c.lineWidth = 1;
    for (let t = 0.6; t < 13; t += 0.55) {
      const r = 11 * Math.exp(-t * 0.12), x = cx + Math.cos(t) * r, y = cy + Math.sin(t) * r;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(t - 0.6) * 3.2, y + Math.sin(t - 0.6) * 3.2); c.lineTo(x + Math.cos(t + 0.3) * 1.5, y + Math.sin(t + 0.3) * 1.5); c.closePath(); c.fill(); c.stroke();
    }
    eye(c, 80, 42, 3.4);
  },
  ichthyosaur(c, col) {
    const dk = shade(col, -0.45), lt = shade(col, 0.45);
    blob(c, col, dk, () => { c.moveTo(8, 26); c.quadraticCurveTo(16, 44, 22, 50); c.quadraticCurveTo(16, 58, 6, 76); c.quadraticCurveTo(22, 64, 28, 52); c.closePath(); });
    blob(c, col, dk, () => { c.moveTo(24, 52); c.quadraticCurveTo(46, 30, 72, 42); c.lineTo(98, 50); c.lineTo(72, 54); c.quadraticCurveTo(48, 70, 24, 52); });
    blob(c, col, dk, () => { c.moveTo(44, 38); c.lineTo(50, 24); c.lineTo(58, 37); c.closePath(); });
    blob(c, lt, dk, () => { c.moveTo(46, 58); c.lineTo(40, 70); c.lineTo(54, 60); c.closePath(); });
    c.fillStyle = lt; c.beginPath(); c.ellipse(52, 56, 18, 4, -0.1, 0, 7); c.fill();
    c.strokeStyle = dk; c.lineWidth = 1.2; c.beginPath(); c.moveTo(76, 50); c.lineTo(96, 50); c.stroke();
    blob(c, '#fff4cf', dk, () => c.arc(68, 45, 7.5, 0, 7));
    eye(c, 68, 45, 5.5);
  },
  plesiosaur(c, col) {
    const dk = shade(col, -0.45), lt = shade(col, 0.45);
    for (const [x, y, a] of [[30, 66, 0.5], [56, 68, 0.3], [34, 48, -0.6], [58, 50, -0.4]]) blob(c, lt, dk, () => c.ellipse(x, y, 12, 4.5, a, 0, 7));
    blob(c, col, dk, () => { c.moveTo(6, 60); c.quadraticCurveTo(20, 56, 26, 52); c.quadraticCurveTo(44, 44, 64, 54); c.quadraticCurveTo(70, 62, 60, 68); c.quadraticCurveTo(40, 72, 6, 60); });
    c.lineCap = 'round'; c.strokeStyle = dk; c.lineWidth = 9;
    c.beginPath(); c.moveTo(62, 54); c.bezierCurveTo(78, 46, 74, 22, 86, 18); c.stroke();
    c.strokeStyle = col; c.lineWidth = 6.5; c.stroke();
    blob(c, col, dk, () => c.ellipse(90, 18, 7, 4.5, 0.2, 0, 7));
    c.strokeStyle = dk; c.lineWidth = 1.2; c.beginPath(); c.moveTo(90, 21); c.quadraticCurveTo(94, 22, 97, 19); c.stroke();
    eye(c, 89, 16, 2.2);
  },
  mosasaur(c, col) {
    const dk = shade(col, -0.45), lt = shade(col, 0.45);
    blob(c, col, dk, () => { c.moveTo(4, 44); c.quadraticCurveTo(14, 54, 22, 52); c.quadraticCurveTo(12, 64, 10, 80); c.quadraticCurveTo(22, 62, 30, 56); c.closePath(); });
    blob(c, col, dk, () => { c.moveTo(26, 54); c.quadraticCurveTo(50, 38, 72, 42); c.lineTo(98, 46); c.lineTo(96, 52); c.lineTo(72, 58); c.quadraticCurveTo(50, 66, 26, 54); });
    blob(c, lt, dk, () => c.ellipse(46, 64, 9, 3.5, 0.5, 0, 7));
    blob(c, lt, dk, () => c.ellipse(64, 62, 9, 3.5, 0.5, 0, 7));
    c.fillStyle = lt; c.beginPath(); c.ellipse(52, 56, 18, 3.5, -0.1, 0, 7); c.fill();
    c.fillStyle = '#fff';
    for (let x = 76; x < 96; x += 4) { c.beginPath(); c.moveTo(x, 49); c.lineTo(x + 1.5, 53); c.lineTo(x + 3, 49); c.fill(); }
    c.strokeStyle = dk; c.lineWidth = 1.3; c.beginPath(); c.moveTo(74, 49); c.lineTo(97, 49); c.stroke();
    eye(c, 76, 44, 3.2);
  },
};

const standIns = new Map();
function standIn(rank) {
  if (!standIns.has(rank)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    c.scale(2.56, 2.56);
    c.lineJoin = 'round';
    DRAW[RANKS[rank].id](c, RANKS[rank].color);
    standIns.set(rank, cv);
  }
  return standIns.get(rank);
}

export default {
  id: 'gofish',
  name: 'Go Fish',
  emoji: '🎣',
  blurb: 'Collect sets of ancient sea creatures. Got any Trilobites?',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: false,

  create(api) {
    const artOf = rank => api.img(`gofish-${RANKS[rank].id}`);
    const artSrc = rank => artOf(rank)?.src || standIn(rank).toDataURL();
    const artSrcCache = new Map();
    const srcFor = rank => {
      const key = `${rank}:${artOf(rank) ? 1 : 0}`;
      if (!artSrcCache.has(key)) artSrcCache.set(key, artSrc(rank));
      return artSrcCache.get(key);
    };

    // --- dom ---------------------------------------------------------------
    const root = document.createElement('div');
    root.className = 'gf';
    const style = document.createElement('style');
    style.textContent = CSS;
    const top = document.createElement('div');
    top.className = 'gf-top';
    const pond = document.createElement('div');
    pond.className = 'gf-pond';
    const canvas = document.createElement('canvas');
    const askBubble = document.createElement('div');
    askBubble.className = 'gf-bubble ask';
    askBubble.hidden = true;
    const replyBubble = document.createElement('div');
    replyBubble.className = 'gf-bubble reply';
    replyBubble.hidden = true;
    pond.append(canvas, askBubble, replyBubble);
    const bar = document.createElement('div');
    bar.className = 'gf-bar';
    const statusEl = document.createElement('div');
    statusEl.className = 'gf-status';
    statusEl.setAttribute('aria-live', 'polite');
    const actions = document.createElement('div');
    actions.style.display = 'contents';
    bar.append(statusEl, actions);
    const hand = document.createElement('div');
    hand.className = 'gf-hand';
    const over = document.createElement('div');
    over.className = 'gf-over';
    over.hidden = true;
    root.append(style, top, pond, bar, hand, over);
    api.el.append(root);
    root.gofishState = () => sharedNow();   // read by test/gofish-play.mjs
    const ctx = canvas.getContext('2d');

    // --- local state ---------------------------------------------------------
    let picked = -1;          // creature I'm about to ask for
    let target = '';          // who I'm about to ask
    let seenSeq = -1;         // last event handled
    let anim = null;          // the cast being drawn: { by, rank, start, bx, by_, mine }
    let fresh = new Set();    // creatures just added to my hand (animate in)
    let destroyed = false, raf = 0, tick = 0, lastSig = '';
    const wins = { n: api.store.get('wins', 0) };

    const sharedNow = () => { const s = api.shared(); return validShared(s) ? s : null; };
    const humans = () => api.players().slice(0, MAX_PLAYERS);
    const playerOf = id => (id === BOT ? { id: BOT, name: BOT_NAME, color: BOT_COLOR } : api.players().find(p => p.id === id));
    const nameOf = (id, s) => (id === api.me.id ? 'You' : playerOf(id)?.name ?? s?.names?.[id] ?? 'Someone');
    const colorOf = id => playerOf(id)?.color ?? '#999';
    const cardWord = (rank, n = 2) => `${RANKS[rank].name} card${n === 1 ? '' : 's'}`;
    const totalBooks = s => Object.values(s.books).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0);

    // --- owner: rules ------------------------------------------------------------
    const lobby = game => ({ game, phase: 'lobby', order: [], names: {}, hands: {}, pond: [], books: {}, turn: '', ask: null, catch: null, at: Date.now(), seq: 0, evs: [] });

    function freshShared(game) {
      const ids = humans().map(p => p.id);
      const order = ids.length === 1 ? [ids[0], BOT] : ids;
      const deck = newDeck();
      const hands = {}, books = {}, names = {};
      const n = dealSize(order.length);
      for (const id of order) {
        const t = takeBooks(deck.splice(0, n));
        hands[id] = sortHand(t.hand);
        books[id] = t.books;
        names[id] = id === BOT ? BOT_NAME : (api.players().find(p => p.id === id)?.name ?? 'Player').slice(0, 24);
      }
      return { game, order, names, hands, pond: deck, books, turn: order[0], phase: 'ask', ask: null, catch: null, at: Date.now(), seq: 0, evs: [] };
    }

    // Publishes s with events appended (the last few are kept for latecomers).
    function publish(s, ...evs) {
      for (const ev of evs) {
        if (!ev) continue;
        s.seq = (s.seq || 0) + 1;
        s.evs = [...s.evs, { ...ev, seq: s.seq }].slice(-5);
      }
      api.setShared(s);
    }

    const nextOf = (s, id) => s.order[(s.order.indexOf(id) + 1) % s.order.length];
    const opponentsWithCards = (s, id) => s.order.filter(o => o !== id && (s.hands[o] || []).length > 0);

    // Ends the game when every book is made.
    function checkOver(s) {
      if (totalBooks(s) >= N) { s.phase = 'over'; s.ask = null; s.catch = null; return true; }
      return false;
    }

    // Gives the turn to `id` (or the next player who can still play).
    function startTurn(s, id) {
      s.ask = null; s.catch = null; s.at = Date.now(); s.phase = 'ask';
      for (let i = 0; i < s.order.length; i++) {
        if ((s.hands[id] || []).length > 0 || s.pond.length > 0) { s.turn = id; return; }
        id = nextOf(s, id);
      }
      s.phase = 'over';
    }

    function bookUp(s, id, evs) {
      const t = takeBooks(s.hands[id] || []);
      if (t.books.length) {
        s.hands[id] = t.hand;
        s.books[id] = [...(s.books[id] || []), ...t.books];
        for (const r of t.books) evs.push({ kind: 'book', by: id, rank: r });
      }
    }

    function applyAsk(by, rank, to, game) {
      const s = sharedNow();
      if (!s || s.game !== game || s.phase !== 'ask' || s.turn !== by) return;
      if (!Number.isInteger(rank) || !(s.hands[by] || []).includes(rank)) return;
      if (!s.order.includes(to) || to === by || !(s.hands[to] || []).length) return;
      publish({ ...s, phase: 'answer', ask: { from: by, to, rank }, at: Date.now() }, { kind: 'ask', by, to, rank });
    }

    function applyAnswer(by, game) {
      const s0 = sharedNow();
      if (!s0 || s0.game !== game || s0.phase !== 'answer' || !s0.ask || s0.ask.to !== by) return;
      const s = structuredClone(s0);
      const { from, to, rank } = s.ask;
      const n = s.hands[to].filter(r => r === rank).length;
      if (n > 0) {
        // They have some: every one goes over, and the asker goes again.
        s.hands[to] = s.hands[to].filter(r => r !== rank);
        s.hands[from] = sortHand([...s.hands[from], ...new Array(n).fill(rank)]);
        const evs = [{ kind: 'gave', by: to, to: from, rank, n }];
        bookUp(s, from, evs);
        if (!checkOver(s)) startTurn(s, from);
        publish(s, ...evs);
      } else {
        publish({ ...s, phase: 'fish', at: Date.now() }, { kind: 'gofish', by: to, to: from, rank });
      }
    }

    function applyFish(by, game) {
      const s0 = sharedNow();
      if (!s0 || s0.game !== game || s0.phase !== 'fish' || s0.turn !== by) return;
      const s = structuredClone(s0);
      if (!s.pond.length) {
        const ev = { kind: 'dry', by };
        startTurn(s, nextOf(s, by));
        publish(s, ev);
        return;
      }
      const rank = s.pond.pop();
      s.hands[by] = sortHand([...(s.hands[by] || []), rank]);
      const lucky = !!s.ask && s.ask.rank === rank;
      s.phase = 'catch';
      s.catch = { by, rank, lucky };
      s.at = Date.now();
      publish(s, { kind: 'catch', by, rank, lucky, left: s.pond.length });
    }

    // After the reel: books, then a lucky catch keeps the turn.
    function finishCatch() {
      const s = structuredClone(sharedNow());
      const { by, lucky } = s.catch;
      const evs = [];
      bookUp(s, by, evs);
      if (!checkOver(s)) startTurn(s, lucky ? by : nextOf(s, by));
      publish(s, ...evs);
    }

    // Robo-Fisher asks for something it holds, preferring what it holds most.
    function botAsk(s) {
      const h = s.hands[BOT];
      const opp = opponentsWithCards(s, BOT);
      if (!h.length || !opp.length) return false;
      const counts = new Array(N).fill(0);
      h.forEach(r => counts[r]++);
      const best = Math.max(...counts);
      const choices = [...new Set(h)].filter(r => counts[r] === best || Math.random() < 0.35);
      applyAsk(BOT, choices[Math.floor(Math.random() * choices.length)], opp[Math.floor(Math.random() * opp.length)], s.game);
      return true;
    }

    // Keeps the game moving: deals, empty hands, Robo-Fisher, quiet players,
    // people who leave.
    function ownerTick() {
      if (!api.isOwner()) return;
      const s = sharedNow();
      if (!s) { api.setShared(lobby(1)); return; }
      if (s.phase === 'over' || s.phase === 'lobby') return;
      const here = new Set([...api.players().map(p => p.id), BOT]);
      const gone = s.order.filter(id => !here.has(id));
      if (gone.length) {
        // Their cards go back into the pond; their books stay on the table.
        const t = structuredClone(s);
        for (const id of gone) { t.pond = shuffle([...t.pond, ...(t.hands[id] || [])]); t.hands[id] = []; }
        t.order = t.order.filter(id => here.has(id));
        if (t.order.filter(id => id !== BOT).length === 0 || t.order.length < 2) { t.phase = 'over'; publish(t, { kind: 'left' }); return; }
        if (!t.order.includes(t.turn) || (t.ask && (!t.order.includes(t.ask.to)))) startTurn(t, t.order.includes(t.turn) ? t.turn : t.order[0]);
        publish(t, { kind: 'left' });
        return;
      }
      const now = Date.now(), age = now - (s.at || now);
      if (s.phase === 'ask') {
        if (!(s.hands[s.turn] || []).length) {
          // Out of cards: take one from the pond (or pass).
          const t = structuredClone(s);
          if (t.pond.length) { t.hands[t.turn] = [t.pond.pop()]; t.at = now; publish(t, { kind: 'draw', by: t.turn }); }
          else { startTurn(t, nextOf(t, t.turn)); publish(t); }
          return;
        }
        if (!opponentsWithCards(s, s.turn).length) {
          // Nobody to ask: straight to the pond.
          publish({ ...s, phase: 'fish', ask: null, at: now }, { kind: 'nobody', by: s.turn });
          return;
        }
        if (s.turn === BOT ? age > BOT_MS : age > ASK_MS) {
          if (s.turn === BOT) botAsk(s);
          else {
            const h = s.hands[s.turn], opp = opponentsWithCards(s, s.turn);
            applyAsk(s.turn, h[Math.floor(Math.random() * h.length)], opp[0], s.game);
          }
        }
      } else if (s.phase === 'answer') {
        if (age > (s.ask.to === BOT ? BOT_MS : ANSWER_MS)) applyAnswer(s.ask.to, s.game);
      } else if (s.phase === 'fish') {
        if (age > (s.turn === BOT ? BOT_MS * 0.8 : FISH_MS)) applyFish(s.turn, s.game);
      } else if (s.phase === 'catch') {
        if (age > CATCH_MS + 250) finishCatch();
      }
    }

    api.on('ask', (d, from) => { if (api.isOwner() && d) applyAsk(from, d.rank, d.to, d.game); });
    api.on('answer', (d, from) => { if (api.isOwner() && d) applyAnswer(from, d.game); });
    api.on('fish', (d, from) => { if (api.isOwner() && d) applyFish(from, d.game); });
    api.on('deal', (d, from) => {
      const s = sharedNow();
      if (api.isOwner() && s && d && d.game === s.game && (s.phase === 'over' || s.phase === 'lobby') && humans().some(p => p.id === from)) api.setShared(freshShared(s.game + 1));
    });

    // --- my actions --------------------------------------------------------------
    // The owner applies its own moves; everyone else sends them to the owner.
    function act(type, data, apply) {
      const s = sharedNow();
      if (!s) return;
      if (api.isOwner()) apply(s.game);
      else api.send(type, { game: s.game, ...data });
    }
    const ask = () => {
      if (picked < 0 || !target) return;
      const rank = picked, to = target;
      picked = -1;
      api.sfx('click');
      act('ask', { rank, to }, game => applyAsk(api.me.id, rank, to, game));
    };
    const answer = () => { api.sfx('click'); act('answer', {}, game => applyAnswer(api.me.id, game)); };
    const goFish = () => act('fish', {}, game => applyFish(api.me.id, game));
    // Deals a new game for everyone here (from the lobby or after a game).
    const deal = () => { const s = sharedNow(); if (!s) return; api.sfx('click'); if (api.isOwner()) api.setShared(freshShared(s.game + 1)); else api.send('deal', { game: s.game }); };

    // --- events: sounds, bubbles, the cast ----------------------------------------
    function handleEvents(s) {
      const evs = s.evs.filter(e => e.seq > seenSeq);
      const late = seenSeq < 0;          // just joined: don't replay old news
      seenSeq = Math.max(seenSeq, s.seq || 0);
      if (late) return;
      for (const e of evs) {
        if (e.kind === 'ask') api.sfx('pop');
        else if (e.kind === 'gofish') api.sfx('honk');
        else if (e.kind === 'gave') {
          api.sfx('score');
          if (e.to === api.me.id) fresh.add(e.rank);
          api.toast(`${nameOf(e.by, s)} gave ${e.to === api.me.id ? 'you' : nameOf(e.to, s)} ${e.n} ${cardWord(e.rank, e.n)}`);
        } else if (e.kind === 'catch') {
          const W = canvas.clientWidth || 300, H = canvas.clientHeight || 200;
          const k = (e.seq * 0.6180339) % 1;
          anim = { by: e.by, rank: e.rank, lucky: e.lucky, start: performance.now(), bx: W * (0.5 + 0.25 * k), by_: H * (0.28 + 0.22 * ((k * 7) % 1)), mine: e.by === api.me.id };
          api.sfx('whoosh');
          if (e.by === api.me.id) setTimeout(() => { if (!destroyed) { fresh.add(e.rank); render(); } }, CATCH_MS - 300);
        } else if (e.kind === 'book') {
          api.sfx('win');
          api.toast(`${nameOf(e.by, s)} made a book of ${RANKS[e.rank].name}! ${RANKS[e.rank].fact}`);
        } else if (e.kind === 'draw' && e.by === api.me.id) { api.toast('Out of cards: you take one from the pond'); }
        else if (e.kind === 'dry') api.toast('The pond is empty!');
        else if (e.kind === 'left') api.toast('A player left: their cards went back in the pond');
      }
    }

    // --- dom drawing ------------------------------------------------------------
    function cardEl(rank, n = 1) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `gf-card${n === 2 ? ' n2' : n >= 3 ? ' n3' : ''}`;
      b.style.setProperty('--c', RANKS[rank].color);
      const pd = document.createElement('span');
      pd.className = 'pd';
      pd.textContent = RANKS[rank].period;
      pd.style.setProperty('--fit', Math.min(1, 10 / RANKS[rank].period.length).toFixed(2));
      const im = document.createElement('img');
      im.src = srcFor(rank);
      im.alt = '';
      im.draggable = false;
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = RANKS[rank].name;
      nm.style.setProperty('--fit', Math.min(1, 10 / RANKS[rank].name.length).toFixed(2));
      b.append(pd, im, nm);
      if (n > 1) { const x = document.createElement('span'); x.className = 'x'; x.textContent = `×${n}`; b.append(x); }
      b.setAttribute('aria-label', `${RANKS[rank].name}${n > 1 ? `, ${n} cards` : ''}`);
      return b;
    }

    function chipEl(id, s) {
      const p = playerOf(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gf-chip';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.setProperty('--pc', p?.color || '#888');
      dot.textContent = id === BOT ? '🤖' : (nameOf(id, s)[0] || '?').toUpperCase();
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = id === api.me.id ? 'You' : nameOf(id, s);
      const ct = document.createElement('span');
      ct.className = 'ct';
      ct.textContent = `🂠${(s.hands[id] || []).length}`;
      const bk = document.createElement('span');
      bk.className = 'gf-books';
      for (const r of s.books[id] || []) { const i = document.createElement('i'); i.style.setProperty('--bc', RANKS[r].color); i.title = RANKS[r].name; bk.append(i); }
      b.append(dot, nm, ct, bk);
      return b;
    }

    function button(text, cls, fn) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `btn ${cls}`;
      b.textContent = text;
      b.addEventListener('click', fn);
      return b;
    }

    function bubble(el, who, text, s, big) {
      el.hidden = false;
      el.classList.toggle('big', !!big);
      const nm = document.createElement('b');
      nm.textContent = nameOf(who, s);
      el.replaceChildren(nm, document.createTextNode(text));
    }

    function render() {
      const s = sharedNow();
      if (!s) { statusEl.textContent = 'Shuffling…'; return; }
      handleEvents(s);
      const me = api.me.id;
      const seated = s.order.includes(me);
      const myTurn = s.turn === me;
      const myHand = s.hands[me] || [];
      if (picked >= 0 && !myHand.includes(picked)) picked = -1;
      const askable = opponentsWithCards(s, me);
      if (!askable.includes(target)) target = askable.length === 1 ? askable[0] : '';
      const choosing = seated && myTurn && s.phase === 'ask';

      // Players along the top (everyone but me), tappable when choosing whom to ask.
      top.replaceChildren();
      for (const id of s.order) {
        if (id === me) continue;
        const c = chipEl(id, s);
        c.classList.toggle('turn', s.turn === id && s.phase !== 'over');
        if (choosing && askable.length > 1) {
          c.classList.add('pick');
          c.classList.toggle('sel', target === id);
          c.disabled = !askable.includes(id);
          c.addEventListener('click', () => { target = id; api.sfx('click'); render(); });
        } else c.tabIndex = -1;
        top.append(c);
      }

      // Speech bubbles over the pond.
      askBubble.hidden = replyBubble.hidden = true;
      if (s.ask && (s.phase === 'answer' || s.phase === 'fish')) {
        bubble(askBubble, s.ask.from, `${s.ask.to === me ? '' : `${nameOf(s.ask.to, s)}, `}got any ${cardWord(s.ask.rank)}?`, s);
        if (s.phase === 'fish') bubble(replyBubble, s.ask.to, 'Go Fish! 🎣', s, true);
      } else if (s.phase === 'ask') {
        const last = s.evs[s.evs.length - 1];
        if (last && last.kind === 'gave' && Date.now() - s.at < 3500) bubble(replyBubble, last.by, `Here you go: ${last.n} ${cardWord(last.rank, last.n)}`, s);
      }

      // The status line and what I can do.
      actions.replaceChildren();
      let status = '';
      if (s.phase === 'lobby') {
        const here = humans();
        status = here.length > 1 ? `Ready to play: ${here.map(p => (p.me ? 'you' : p.name)).join(', ')}` : 'Wait for friends to join, or play Robo-Fisher';
        if (here.some(p => p.me)) actions.append(button(here.length > 1 ? 'Deal the cards' : 'Play Robo-Fisher 🤖', 'aqua', deal));
      } else if (s.phase === 'over') status = '';
      else if (!seated) status = `${nameOf(s.turn, s)} ${s.phase === 'catch' ? 'is fishing' : 'is playing'}. You'll be dealt in next game.`;
      else if (s.phase === 'ask') {
        if (myTurn) {
          if (picked < 0) status = 'Your turn: tap a creature in your hand to ask for it';
          else if (!target) status = `Who do you want to ask for ${cardWord(picked)}? Tap a player`;
          else {
            status = `Ask ${nameOf(target, s)} for ${cardWord(picked)}?`;
            actions.append(button(`Ask ${nameOf(target, s)}`, 'aqua', ask));
          }
        } else status = `${nameOf(s.turn, s)} is choosing what to ask for…`;
      } else if (s.phase === 'answer') {
        const { from, to, rank } = s.ask;
        if (to === me) {
          const n = myHand.filter(r => r === rank).length;
          status = `${nameOf(from, s)} asks: got any ${cardWord(rank)}?`;
          actions.append(n > 0 ? button(`Give ${n} ${cardWord(rank, n)}`, 'aqua', answer) : button('Go Fish! 🎣', 'fish', answer));
        } else status = `${nameOf(from, s)} asks ${to === me ? 'you' : nameOf(to, s)} for ${cardWord(rank)}…`;
      } else if (s.phase === 'fish') {
        if (myTurn) {
          status = s.ask ? `${nameOf(s.ask.to, s)} says Go Fish!` : 'Nobody else has cards: go fish!';
          actions.append(s.pond.length ? button('🎣 Go Fish', 'fish', goFish) : button('The pond is empty: pass', 'ghost', goFish));
        } else status = `${nameOf(s.turn, s)} has to go fish…`;
      } else if (s.phase === 'catch') {
        const { by, rank, lucky } = s.catch;
        const done = !anim || performance.now() - anim.start > CATCH_MS * 0.75;
        if (!done) status = `${nameOf(by, s)} ${by === me ? 'cast' : 'casts'} into the pond…`;
        else if (by === me) status = lucky ? `You caught a ${RANKS[rank].name}, just what you asked for! Go again` : `You caught a ${RANKS[rank].name}`;
        else status = lucky ? `${nameOf(by, s)} caught what they asked for and goes again!` : `${nameOf(by, s)} caught a card`;
      }
      statusEl.textContent = status;

      // My hand, grouped by creature.
      hand.replaceChildren();
      if (s.phase === 'lobby') {
        const m = document.createElement('div');
        m.className = 'muted';
        m.textContent = `Ask for ancient sea creatures and collect sets of four. Up to ${MAX_PLAYERS} players.`;
        hand.append(m);
      } else if (!seated) {
        const m = document.createElement('div');
        m.className = 'muted';
        m.textContent = 'Watching this game';
        hand.append(m);
      } else if (!myHand.length && s.phase !== 'over') {
        const m = document.createElement('div');
        m.className = 'muted';
        m.textContent = 'No cards left in your hand';
        hand.append(m);
      }
      const counts = new Array(N).fill(0);
      myHand.forEach(r => counts[r]++);
      const groups = counts.map((n, r) => [r, n]).filter(([, n]) => n > 0);
      const w = handCardWidth(groups.length);
      const hiddenNew = anim && anim.mine && performance.now() - anim.start < CATCH_MS - 300 ? anim.rank : -1;
      for (const [r, n0] of groups) {
        const n = r === hiddenNew ? n0 - 1 : n0;
        if (n <= 0) continue;
        const c = cardEl(r, n);
        c.style.setProperty('--w', `${w}px`);
        c.classList.toggle('sel', choosing && picked === r);
        c.classList.toggle('want', s.phase === 'answer' && s.ask?.to === me && s.ask.rank === r);
        if (fresh.has(r)) c.classList.add('new');
        c.setAttribute('aria-disabled', choosing ? 'false' : 'true');
        c.addEventListener('click', () => {
          if (!choosing) return;
          picked = picked === r ? -1 : r;
          api.sfx('click');
          render();
        });
        hand.append(c);
      }
      fresh.clear();
      if (seated && (s.books[me] || []).length) {
        const b = document.createElement('div');
        b.className = 'gf-chip';
        b.style.maxWidth = 'none';
        const t = document.createElement('span');
        t.textContent = `Your books: ${(s.books[me] || []).length}`;
        const bk = document.createElement('span');
        bk.className = 'gf-books';
        for (const r of s.books[me]) { const i = document.createElement('i'); i.style.setProperty('--bc', RANKS[r].color); i.title = RANKS[r].name; bk.append(i); }
        b.append(t, bk);
        actions.append(b);
      }

      // Game over.
      over.hidden = s.phase !== 'over';
      if (s.phase === 'over') {
        over.replaceChildren();
        const scores = s.order.map(id => [id, (s.books[id] || []).length]);
        const topScore = Math.max(0, ...scores.map(([, n]) => n));
        const winners = scores.filter(([, n]) => n === topScore).map(([id]) => id);
        const big = document.createElement('div');
        big.className = 'g-big';
        big.textContent = totalBooks(s) < N && s.order.length < 2 ? 'Everyone else left'
          : winners.length > 1 ? `Tie: ${winners.map(id => nameOf(id, s)).join(' & ')}`
          : winners[0] === me ? 'You win! 🎉' : `${nameOf(winners[0], s)} wins!`;
        const list = document.createElement('div');
        list.className = 'muted';
        list.textContent = scores.sort((a, b) => b[1] - a[1]).map(([id, n]) => `${nameOf(id, s)}: ${n} book${n === 1 ? '' : 's'}`).join(' · ');
        const fact = document.createElement('div');
        fact.className = 'gf-fact';
        const r = RANKS[(s.game * 5) % N];
        fact.textContent = `${r.name} (${r.period}): ${r.fact}`;
        over.append(big, list, fact);
        if (humans().some(p => p.me)) over.append(button('Play again', 'aqua', deal));
        if (lastOver !== s.game) {
          lastOver = s.game;
          if (seated && seenSeq >= 0 && s.evs.length) {
            if (winners.includes(me)) { api.sfx('win'); wins.n++; api.store.set('wins', wins.n); } else api.sfx('lose');
          }
        }
      }
    }
    let lastOver = -1;

    function handCardWidth(groups) {
      const W = hand.clientWidth || root.clientWidth || 360;
      const H = root.clientHeight || 600;
      const maxW = Math.min(92, H * 0.13);
      for (let w = maxW; w >= 44; w -= 2) {
        const per = Math.floor((W - 16 + 8) / (w + 10));
        const rows = Math.ceil(groups / Math.max(1, per));
        if (rows <= 2) return w;
      }
      return 44;
    }

    // --- the pond -----------------------------------------------------------------
    const fish = Array.from({ length: SHADOWS }, (_, i) => ({ cx: 0.3 + 0.13 * i, cy: 0.35 + 0.1 * ((i * 3) % 4), rx: 0.16 + 0.04 * (i % 3), ry: 0.12 + 0.03 * ((i + 1) % 3), sp: 0.35 + 0.12 * i, ph: i * 1.7, size: 0.85 + 0.12 * ((i * 5) % 3) }));

    function fishPos(f, t, W, H) {
      const a = t * f.sp + f.ph;
      return { x: W * (f.cx + f.rx * Math.cos(a)), y: H * (f.cy + f.ry * Math.sin(a * 2) * 0.6), a };
    }

    function drawShadow(x, y, heading, s, alpha, t) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(heading);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#03191b';
      ctx.filter = 'blur(1.5px)';
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      const wag = Math.sin(t * 8) * s * 0.18;
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, 0);
      ctx.lineTo(-s * 1.45, -s * 0.4 + wag);
      ctx.lineTo(-s * 1.35, wag * 0.3);
      ctx.lineTo(-s * 1.45, s * 0.4 + wag);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draws the pond and returns where the angler stands: on the painted
    // jetty (middle of the bottom edge) once the pond art is in, else on the
    // drawn one at the bottom left.
    function drawWater(W, H, t) {
      const bg = api.img('gofish-pond');
      if (bg) {
        const sw = bg.naturalWidth || bg.width, sh = bg.naturalHeight || bg.height;
        const k = Math.max(W / sw, H / sh);
        const ox = (W - sw * k) / 2, oy = (H - sh * k) / 2;
        ctx.drawImage(bg, ox, oy, sw * k, sh * k);
        return { x: ox + sw * k * 0.5, y: Math.min(H * 0.86, oy + sh * k * 0.86) };
      }
      const g = ctx.createRadialGradient(W * 0.55, H * 0.45, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
      g.addColorStop(0, '#1d7f86');
      g.addColorStop(0.6, '#20a39a');
      g.addColorStop(1, '#5fc59b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // light ripples
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const y = H * (0.1 + i * 0.13) + Math.sin(t * 0.8 + i) * 4;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * 1.3 + i) * 3);
        ctx.stroke();
      }
      // lily pads and the jetty
      for (const [x, y, r] of [[0.9, 0.18, 0.06], [0.82, 0.3, 0.04], [0.08, 0.2, 0.05]]) {
        ctx.fillStyle = '#3d9a4a';
        ctx.beginPath();
        ctx.moveTo(W * x, H * y);
        ctx.arc(W * x, H * y, Math.min(W, H) * r, 0.4, Math.PI * 2 - 0.2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#8a5a33';
      ctx.fillRect(W * 0.08, H * 0.8, W * 0.26, H * 0.2);
      ctx.strokeStyle = '#6b4225';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(W * 0.08, H * (0.8 + i * 0.05)); ctx.lineTo(W * 0.34, H * (0.8 + i * 0.05)); ctx.stroke(); }
      return { x: W * 0.2, y: H * 0.78 };
    }

    function drawCardAt(x, y, w, rank, faceUp, flip) {
      const h = w * 1.375;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(Math.max(0.05, Math.abs(flip)), 1);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.14);
      if (faceUp) {
        ctx.fillStyle = RANKS[rank].color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        const art = artOf(rank) || standIn(rank);
        ctx.drawImage(art, -w * 0.44, -h * 0.34, w * 0.88, w * 0.88);
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${Math.max(8, w * 0.14)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(RANKS[rank].name, 0, h * 0.42, w * 0.94);
      } else {
        const back = api.img('gofish-back');
        if (back) { ctx.clip(); ctx.drawImage(back, -w / 2, -h / 2, w, h); }
        else {
          const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
          g.addColorStop(0, '#2bc4c0');
          g.addColorStop(1, '#126b8f');
          ctx.fillStyle = g;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
          ctx.font = `${w * 0.5}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎣', 0, 0);
        }
      }
      ctx.restore();
    }

    // The angler on the jetty: their face (live video) on a little body.
    function drawAngler(id, ax, ay, r, rodAngle) {
      const col = colorOf(id);
      ctx.save();
      // body
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(ax - r * 0.8, ay, r * 1.6, r * 1.9, r * 0.6);
      ctx.fill();
      // rod from the hands
      const hx = ax + r * 0.6, hy = ay + r * 0.7;
      const tip = { x: hx + Math.cos(rodAngle) * r * 3.4, y: hy + Math.sin(rodAngle) * r * 3.4 };
      ctx.strokeStyle = '#5a3a1e';
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.fillStyle = '#ffd7b0';
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      // head
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, ay - r * 0.2, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.clip();
      let drew = false;
      if (id !== BOT) {
        const media = api.mediaOf(id);
        const sw = media?.videoWidth || media?.width || 0, sh = media?.videoHeight || media?.height || 0;
        if (sw && sh && (media.readyState === undefined || media.readyState >= 2)) {
          const k = Math.max((r * 2) / sw, (r * 2) / sh);
          try { ctx.drawImage(media, ax - (sw * k) / 2, ay - r * 0.2 - (sh * k) / 2, sw * k, sh * k); drew = true; } catch { /* not ready */ }
        }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(id === BOT ? '🤖' : (playerOf(id)?.name?.[0] || '?').toUpperCase(), ax, ay - r * 0.15);
      }
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ax, ay - r * 0.2, r, 0, Math.PI * 2);
      ctx.stroke();
      // a sun hat
      ctx.fillStyle = '#f6d365';
      ctx.beginPath();
      ctx.ellipse(ax, ay - r * 1.05, r * 1.15, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ax, ay - r * 1.2, r * 0.6, r * 0.32, 0, Math.PI, 0);
      ctx.fill();
      ctx.restore();
      return tip;
    }

    const ease = t => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));

    function frame() {
      raf = requestAnimationFrame(frame);
      const s = sharedNow();
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = performance.now() / 1000;
      const stand = drawWater(W, H, t);
      const painted = !!api.img('gofish-pond');
      if (!s) return;

      const now = performance.now();
      const ct = anim ? (now - anim.start) / 1000 : 99;   // seconds into the cast
      if (anim && ct > CATCH_MS / 1000) anim = null;
      // Shadows: one per card left, never more than SHADOWS. The one being
      // caught swims to the bobber and is pulled out at the bite.
      const left = s.phase === 'lobby' ? 52 : s.pond.length + (anim && ct < 1.35 ? 1 : 0);
      const shown = Math.min(SHADOWS, left);
      const unit = Math.min(W, H) * 0.075;
      for (let i = 0; i < shown; i++) {
        const f = fish[i];
        let { x, y, a } = fishPos(f, t, W, H);
        const dx = -Math.sin(a) * f.rx, dy = Math.cos(a * 2) * f.ry * 1.2;
        let heading = Math.atan2(dy * H, dx * W);
        let alpha = painted ? 0.5 : 0.32;
        if (anim && i === shown - 1 && ct < 1.35) {
          const k = ease((ct - 0.5) / 0.75);
          const tx = anim.bx - Math.cos(heading) * unit * 0.6, ty = anim.by_;
          heading = k > 0 ? Math.atan2(ty - y, tx - x) : heading;
          x += (tx - x) * k;
          y += (ty - y) * k;
          alpha += 0.15 * k;
        }
        drawShadow(x, y, heading, f.size * unit, alpha, t + i);
      }

      // The angler: whoever's turn it is (or who is fishing right now).
      const who = anim ? anim.by : s.phase === 'over' ? null : s.turn;
      if (!who) return;
      const r = Math.min(W, H) * 0.085;
      const ax = stand.x, ay = stand.y - r * 0.9;
      let rod = -1.0 + Math.sin(t * 1.3) * 0.04;
      if (anim) {
        if (ct < 0.25) rod = -1.0 - 1.1 * ease(ct / 0.25);          // swing back
        else if (ct < 0.45) rod = -2.1 + 1.6 * ease((ct - 0.25) / 0.2); // and forward
        else if (ct < 1.6) rod = -0.5;
        else if (ct < 2.3) rod = -0.5 - 0.9 * ease((ct - 1.6) / 0.4);  // reel up
        else rod = -1.2;
      }
      const tip = drawAngler(who, ax, ay, r, rod);
      if (!anim) return;

      // The line, the bobber and the catch.
      const fly = ease((ct - 0.3) / 0.35);
      const bob = { x: tip.x + (anim.bx - tip.x) * fly, y: tip.y + (anim.by_ - tip.y) * fly - Math.sin(fly * Math.PI) * H * 0.15 };
      const bite = ct > 1.35 && ct < 1.6;
      if (ct < 1.6) {
        if (bite) bob.y += 5;
        else if (fly >= 1) bob.y += Math.sin(t * 5) * 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.quadraticCurveTo((tip.x + bob.x) / 2, Math.max(tip.y, bob.y) + 20, bob.x, bob.y);
        ctx.stroke();
        if (fly >= 1) {
          // ripples where it landed, and a splash at the bite
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          for (let k = 0; k < 2; k++) {
            const rr = ((t * 30 + k * 12) % 26) + 4;
            ctx.beginPath();
            ctx.ellipse(anim.bx, anim.by_ + 3, rr * (bite ? 1.6 : 1), rr * 0.4 * (bite ? 1.6 : 1), 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.fillStyle = '#ff3b3b';
        ctx.beginPath();
        ctx.arc(bob.x, bob.y, 5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(bob.x, bob.y, 5, 0, Math.PI);
        ctx.fill();
        if (bite && !anim.splashed) { anim.splashed = true; api.sfx('pop'); }
      } else {
        // Reeling in: the card leaps out of the water and lands by the angler,
        // turning face up for whoever caught it.
        const k = ease((ct - 1.6) / 0.7);
        const cx = anim.bx + (ax + r * 2.6 - anim.bx) * k;
        const cy = anim.by_ + (ay - r * 2.2 - anim.by_) * k - Math.sin(k * Math.PI) * H * 0.18;
        const w = r * (0.9 + 0.9 * k);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(cx, cy - w * 0.7);
        ctx.stroke();
        const flip = anim.mine ? Math.cos(Math.min(1, Math.max(0, (ct - 2.0) / 0.4)) * Math.PI) : 1;
        ctx.globalAlpha = 1 - ease((ct - 2.55) / 0.3);   // then it goes into the hand
        drawCardAt(cx, cy, w, anim.rank, anim.mine && flip < 0, flip);
        ctx.globalAlpha = 1;
        if (anim.mine && ct > 2.4) {
          ctx.fillStyle = '#fff';
          ctx.font = `900 ${Math.max(12, r * 0.45)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(anim.lucky ? 'Just what you asked for!' : `A ${RANKS[anim.rank].name}!`, W * 0.6, H * 0.12);
        }
      }
    }

    // --- loop ---------------------------------------------------------------------
    tick = setInterval(() => {
      if (destroyed) return;
      ownerTick();
      // Redraw when art arrives or a catch finishes animating.
      const sig = RANKS.map((_, r) => (artOf(r) ? 1 : 0)).join('') + (anim ? Math.floor((performance.now() - anim.start) / 700) : '-');
      if (sig !== lastSig) { lastSig = sig; render(); }
    }, 200);
    const ro = new ResizeObserver(() => render());
    ro.observe(root);
    ownerTick();
    render();
    frame();

    return {
      destroy() {
        destroyed = true;
        clearInterval(tick);
        cancelAnimationFrame(raf);
        ro.disconnect();
      },
      onChange() {
        ownerTick();
        render();
      },
    };
  },
};

// Act III drawing: the Sea King's court. Every piece of art has a procedural
// stand-in until its file is delivered (ids and sizes are in
// design/image-requests.md, Part C4; drawn here at half the listed pixels).
import {
  ROWY, ROWSCALE, LANTERN, PEDESTAL, THRONE_X, WITCH_X, TUNE, OUTRO,
  beamOn, rowY, rowScale, whaleX, fishX,
} from './act3.js';
import { clamp, lerp, easeOut, easeInOut, beatPhase } from './shared.js';

const FLOOR_TOP = 404;
const GOWN = { green: '#9cc7a4', pink: '#f3c6dc', blue: '#a9c4e0' };
const NAVY = '#26304a';

export function draw(k, st, t) {
  const c = k.c, ph = st.phase;
  const bob = Math.abs(Math.sin(Math.PI * beatPhase(st.beat)));
  hall(k, st, t);
  dais(k, st, t, bob);
  floor(k);
  telegraph(k, st, t);

  // Everything on the grooves, back to front. The sailor sorts just behind a
  // courtier on the same groove, so freezing "behind" one reads as cover.
  const items = [];
  for (const q of st.pearlsOnFloor) if (!q.got) items.push({ y: ROWY[q.row] - 1, f: () => floorPearl(k, q, t) });
  for (const cr of st.courtiers) items.push({ y: ROWY[cr.row], f: () => courtier(k, cr, bob, st) });
  if (ph !== 'lunge' && ph !== 'iris') items.push({ y: rowY(st.p) - 0.5, f: () => player(k, st, t) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  for (const s of st.sentries) sentry(k, s, st, t);
  beam(k, st, t);
  omens(k, st, t);
  passers(k, st, t);
  if (ph === 'turn' || ph === 'lunge' || ph === 'iris') outro(k, st, t);
  if (ph === 'caught') k.wash('#4a0a18', 0.25 * clamp(st.phaseT / 0.8, 0, 1));
  c.globalAlpha = 1;
}

export function drawOver(k, st) {
  if (st.phase === 'iris') k.iris(640, 400, 780 * (1 - easeInOut(st.phaseT / OUTRO.iris)));
  if (st.status === 'won') k.iris(640, 400, 0);
}

export function onEvent(k, e, st) {
  if (e.type === 'pearl') { k.burst(e.x, e.y - 20, '#eef3ea', 8); k.text('+10', e.x, e.y - 60); }
  if (e.type === 'spotted') { k.flash(0.55); k.shake(0.3); k.text('Spotted!', e.x, e.y - 200, true); k.burst(e.x, e.y - 80, '#e0127a', 14); }
  if (e.type === 'guardBump') { k.shake(0.3); k.burst(e.x, e.y - 60, '#d9b34a', 12); }
  if (e.type === 'sentryBite') { k.shake(0.4); k.burst(e.x, e.y - 30, '#c8321e', 16); }
  if (e.type === 'unseen') { k.text('Unseen +25', e.x, e.y - 190); }
  if (e.type === 'whalePass') { k.shake(0.25); }
  if (e.type === 'pearlTaken') { k.burst(PEDESTAL.x, 260, '#eef3ea', 22); k.burst(PEDESTAL.x, 260, '#f3c6dc', 14); k.text('Her pearl', PEDESTAL.x - 60, 200, true); }
  if (e.type === 'whaleTurn') k.shake(0.4);
  if (e.type === 'swallow') { k.shake(0.9); k.flash(0.4); }
}

// ---------------------------------------------------------------- the hall
function hall(k, st, t) {
  const c = k.c;
  if (!k.asset('court-backcloth', 640, 720, 1280, 720)) {
    const g = c.createLinearGradient(0, 60, 0, FLOOR_TOP);
    g.addColorStop(0, k.col('#1f3d40')); g.addColorStop(0.6, k.col('#3f6f6a')); g.addColorStop(1, k.col('#7aa39a'));
    c.fillStyle = g; c.fillRect(0, 0, 1280, FLOOR_TOP + 4);
    // water light falling through the shell windows
    c.save(); c.globalAlpha = 0.12; c.fillStyle = k.col('#eef3ea');
    for (let i = 0; i < 4; i++) {
      const x = 260 + i * 250 + Math.sin(t * 0.35 + i * 1.7) * 18;
      c.beginPath(); c.moveTo(x, 60); c.lineTo(x + 50, 60); c.lineTo(x + 130, FLOOR_TOP); c.lineTo(x + 20, FLOOR_TOP); c.fill();
    }
    c.restore();
    // three gilded arches with shell windows
    for (const [x, w] of [[330, 250], [640, 290], [950, 250]]) {
      const top = 120;
      c.fillStyle = k.col('#16302f');
      c.beginPath(); c.moveTo(x - w / 2 + 18, FLOOR_TOP); c.lineTo(x - w / 2 + 18, top + w / 2); c.arc(x, top + w / 2, w / 2 - 18, Math.PI, 0); c.lineTo(x + w / 2 - 18, FLOOR_TOP); c.fill();
      c.strokeStyle = k.col('#d9b34a'); c.lineWidth = 10;
      c.beginPath(); c.moveTo(x - w / 2 + 12, FLOOR_TOP); c.lineTo(x - w / 2 + 12, top + w / 2); c.arc(x, top + w / 2, w / 2 - 12, Math.PI, 0); c.lineTo(x + w / 2 - 12, FLOOR_TOP); c.stroke();
      // shell window
      c.fillStyle = k.col('#8fb8ae');
      c.beginPath(); c.moveTo(x - 44, top + 96); c.arc(x, top + 96, 44, Math.PI, 0); c.closePath(); c.fill();
      c.strokeStyle = k.col('#d9b34a'); c.lineWidth = 2.5;
      for (let r = 0; r <= 6; r++) { const a = Math.PI + (r / 6) * Math.PI; c.beginPath(); c.moveTo(x, top + 96); c.lineTo(x + Math.cos(a) * 44, top + 96 + Math.sin(a) * 44); c.stroke(); }
      // pearl beads round the arch
      c.fillStyle = k.col('#f1e3c8');
      for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; k.circle(x + Math.cos(a) * (w / 2 - 12), top + w / 2 + Math.sin(a) * (w / 2 - 12), 3.5); }
    }
    // coral-red columns between the arches
    for (const x of [178, 485, 795, 1102]) column(k, x, 70, FLOOR_TOP, 34);
    // drifting bubbles (driven by t only)
    c.fillStyle = k.col('#eef3ea'); c.globalAlpha = 0.35;
    for (let i = 0; i < 10; i++) { const y = FLOOR_TOP - ((t * 24 + i * 61) % 330); k.circle(220 + ((i * 113) % 860) + Math.sin(t + i) * 6, y, 2 + (i % 3)); }
    c.globalAlpha = 1;
  }
  // column wings, framing the hall
  if (!k.asset('court-wing-left', 160, 720, 320, 720)) column(k, 150, 40, 660, 46, true);
  if (!k.asset('court-wing-right', 1120, 720, 320, 720)) column(k, 1130, 40, 660, 46, true);
}

function column(k, x, top, bottom, w, lamp = false) {
  const c = k.c;
  c.fillStyle = k.col('#c8321e'); c.fillRect(x - w / 2, top, w, bottom - top);
  c.fillStyle = k.col('#8e1f14'); c.fillRect(x + w / 2 - 8, top, 8, bottom - top);
  c.fillStyle = k.col('#d9b34a');
  c.fillRect(x - w / 2 - 8, top, w + 16, 14); c.fillRect(x - w / 2 - 8, bottom - 14, w + 16, 14);
  // gold ribbon spiral
  c.strokeStyle = k.col('#d9b34a'); c.lineWidth = 3;
  for (let y = top + 30; y < bottom - 30; y += 46) { c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y + 22); c.stroke(); }
  if (lamp) {
    c.fillStyle = k.col('#3a2112'); c.fillRect(x - 1, top + 14, 2, 120);
    c.fillStyle = k.col('#d9b34a'); c.beginPath(); c.ellipse(x, top + 146, 12, 16, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = k.col('#f3c6dc'); k.circle(x, top + 146, 6);
  }
}

// ---------------------------------------------------------------- the dais
function dais(k, st, t, bob) {
  const c = k.c;
  // raised steps
  c.fillStyle = k.col('#6d4a6a'); c.fillRect(THRONE_X - 230, FLOOR_TOP - 34, 460, 34);
  c.fillStyle = k.col('#d9b34a'); c.fillRect(THRONE_X - 230, FLOOR_TOP - 36, 460, 5); c.fillRect(THRONE_X - 260, FLOOR_TOP - 6, 520, 6);
  const by = FLOOR_TOP - 32;
  // The king's eyes follow his beam.
  const look = clamp((st.gaze.aim - THRONE_X) / 600, -1, 1);
  if (!k.asset('sea-king-throne', THRONE_X, by, 300, 310)) kingStandin(k, THRONE_X, by, look, bob);
  // the witch at his side
  const wy = by + 2;
  if (!k.asset('witch-stand', WITCH_X, wy, 130, 210)) witchStandin(k, WITCH_X, wy, t);
  // the gaze lantern on its gilded pole
  const lit = st.masked ? 0.3 : 1;
  if (!k.asset('gaze-lantern', LANTERN.x, 412, 140, 210)) lanternStandin(k, st, t, lit);
  // the pearl pedestal
  pedestal(k, st, t);
}

function kingStandin(k, x, y, look, bob) {
  const c = k.c;
  // scallop-shell throne
  c.fillStyle = k.col('#d9b34a');
  c.beginPath(); c.moveTo(x - 120, y); c.lineTo(x - 140, y - 170); c.arc(x, y - 170, 140, Math.PI, 0); c.lineTo(x + 120, y); c.closePath(); c.fill();
  c.strokeStyle = k.col('#9a7a2a'); c.lineWidth = 4;
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; c.beginPath(); c.moveTo(x, y - 120); c.lineTo(x + Math.cos(a) * 136, y - 170 + Math.sin(a) * 136); c.stroke(); }
  // white coral flanks
  c.strokeStyle = k.col('#f1e3c8'); c.lineWidth = 9; c.lineCap = 'round';
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(x + s * 140, y); c.lineTo(x + s * 150, y - 120); c.moveTo(x + s * 146, y - 70); c.lineTo(x + s * 172, y - 110); c.moveTo(x + s * 150, y - 120); c.lineTo(x + s * 136, y - 160); c.stroke();
  }
  // robes: white, with a pale blue mantle
  c.fillStyle = k.col('#f4f1ea');
  c.beginPath(); c.moveTo(x - 70, y); c.lineTo(x - 46, y - 160); c.lineTo(x + 46, y - 160); c.lineTo(x + 70, y); c.fill();
  c.fillStyle = k.col('#9fbfe0');
  c.beginPath(); c.moveTo(x - 74, y); c.lineTo(x - 50, y - 158); c.lineTo(x - 26, y - 158); c.lineTo(x - 30, y); c.fill();
  c.beginPath(); c.moveTo(x + 74, y); c.lineTo(x + 50, y - 158); c.lineTo(x + 26, y - 158); c.lineTo(x + 30, y); c.fill();
  c.fillStyle = k.col('#d9b34a'); c.fillRect(x - 46, y - 96, 92, 6);
  // head, long white beard, crown
  c.fillStyle = k.col('#efd7c4'); k.circle(x, y - 182, 22);
  c.fillStyle = k.col('#ffffff');
  c.beginPath(); c.moveTo(x - 22, y - 180); c.quadraticCurveTo(x, y - 60, x + 22, y - 180); c.fill();
  c.fillStyle = k.col('#2a1a22'); k.circle(x - 8 + look * 4, y - 188, 2.5); k.circle(x + 8 + look * 4, y - 188, 2.5);
  c.fillStyle = k.col('#d9b34a');
  c.beginPath(); c.moveTo(x - 22, y - 200); c.lineTo(x - 24, y - 226); c.lineTo(x - 11, y - 212); c.lineTo(x, y - 232); c.lineTo(x + 11, y - 212); c.lineTo(x + 24, y - 226); c.lineTo(x + 22, y - 200); c.fill();
  // trident, swaying with the beat
  c.save(); c.translate(x + 66, y - 60); c.rotate(0.05 - bob * 0.04);
  c.fillStyle = k.col('#d9b34a'); c.fillRect(-3, -200, 6, 230);
  c.fillRect(-20, -200, 40, 5);
  for (const dx of [-20, 0, 17]) { c.beginPath(); c.moveTo(dx, -198); c.lineTo(dx + 1.5, -232); c.lineTo(dx + 3, -198); c.fill(); }
  c.restore();
  // his hand on it
  c.fillStyle = k.col('#efd7c4'); k.circle(x + 62, y - 110, 7);
}

function witchStandin(k, x, y, t) {
  const c = k.c, sway = Math.sin(t * 1.1) * 3;
  c.fillStyle = k.col('#e7a6bd');
  c.beginPath(); c.moveTo(x - 38, y); c.quadraticCurveTo(x - 30 + sway, y - 100, x - 14, y - 160); c.lineTo(x + 14, y - 160); c.quadraticCurveTo(x + 30 + sway, y - 100, x + 40, y); c.fill();
  c.fillStyle = k.col('#e0127a'); c.fillRect(x - 15, y - 120, 30, 5);
  // long black hair, crown, face turned toward the king (left)
  c.fillStyle = k.col('#1a1012');
  c.beginPath(); c.moveTo(x - 6, y - 196); c.quadraticCurveTo(x + 26, y - 170, x + 18, y - 110); c.lineTo(x + 2, y - 150); c.fill();
  c.fillStyle = k.col('#efd7c4'); k.circle(x - 2, y - 178, 13);
  c.fillStyle = k.col('#d9b34a');
  c.beginPath(); c.moveTo(x - 12, y - 190); c.lineTo(x - 10, y - 204); c.lineTo(x - 3, y - 196); c.lineTo(x + 4, y - 206); c.lineTo(x + 8, y - 190); c.fill();
  // star wand lowered; arm out
  c.strokeStyle = k.col('#d9b34a'); c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(x + 24, y - 100); c.lineTo(x + 44, y - 60); c.stroke();
  c.fillStyle = k.col('#d9b34a'); k.star(x + 46, y - 56, 8);
}

function lanternStandin(k, st, t, lit) {
  const c = k.c, x = LANTERN.x, y = LANTERN.y;
  c.fillStyle = k.col('#d9b34a'); c.fillRect(x - 4, y + 22, 8, 412 - y - 22);
  c.fillRect(x - 18, 404, 36, 8);
  // glow
  const warn = st.gaze.phase === 'warn' ? 0.5 + 0.5 * Math.sin(t * 14) : 0;
  c.save(); c.globalAlpha = (0.35 + warn * 0.4) * lit;
  const g = c.createRadialGradient(x, y, 4, x, y, 60);
  g.addColorStop(0, k.col(st.gaze.lock > 0 ? '#e0127a' : '#fff2c0')); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x - 60, y - 60, 120, 120);
  c.restore();
  // an eye-shaped lantern with a pink iris that looks along the beam
  c.fillStyle = k.col('#d9b34a');
  c.beginPath(); c.ellipse(x, y, 34, 22, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = k.col('#f4f1ea');
  c.beginPath(); c.ellipse(x, y, 27, 15, 0, 0, Math.PI * 2); c.fill();
  const look = clamp((st.gaze.aim - x) / 700, -1, 1) * 12;
  c.fillStyle = k.col(st.masked ? '#8f8a86' : '#e0127a'); k.circle(x + look, y + 2, 9);
  c.fillStyle = k.col('#2a1424'); k.circle(x + look, y + 2, 4);
  // lid
  c.fillStyle = k.col('#9a7a2a'); c.fillRect(x - 10, y - 32, 20, 10);
}

function pedestal(k, st, t) {
  const c = k.c, x = PEDESTAL.x, by = ROWY[0] - 10;
  if (!k.asset('pearl-pedestal', x, by, 130, 170)) {
    c.fillStyle = k.col('#f1e3c8');
    c.beginPath(); c.moveTo(x - 30, by); c.lineTo(x - 16, by - 110); c.lineTo(x + 16, by - 110); c.lineTo(x + 30, by); c.fill();
    c.strokeStyle = k.col('#cbb89a'); c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 20, by - 50); c.lineTo(x - 40, by - 80); c.moveTo(x + 18, by - 70); c.lineTo(x + 38, by - 96); c.stroke();
    // open scallop
    c.fillStyle = k.col('#f3c6dc');
    c.beginPath(); c.moveTo(x - 44, by - 112); c.arc(x, by - 112, 44, Math.PI, 0); c.closePath(); c.fill();
    c.strokeStyle = k.col('#c99aae'); c.lineWidth = 2;
    for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * Math.PI; c.beginPath(); c.moveTo(x, by - 112); c.lineTo(x + Math.cos(a) * 44, by - 112 + Math.sin(a) * 44); c.stroke(); }
    c.fillStyle = k.col('#e9cfd8'); c.fillRect(x - 46, by - 116, 92, 7);
  }
  if (!st.taken) {
    const py = by - 128 + Math.sin(t * 2) * 2;
    c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
    c.fillStyle = k.col('#fff6e0'); k.circle(x, py, 26); c.restore();
    pearlAt(k, x, py, 15);
  } else if (st.phase === 'take') {
    // the pearl lifts from the shell into his hand
    const p = st.p, f = easeOut(st.phaseT / 0.8);
    const sx = lerp(x, p.x, f), sy = lerp(by - 128, rowY(p) - 150 * rowScale(p), f) - Math.sin(f * Math.PI) * 50;
    pearlAt(k, sx, sy, 15);
  }
}

function pearlAt(k, x, y, r) {
  if (k.asset('pearl', x, y + r, r * 2, r * 2)) return;
  const c = k.c;
  c.fillStyle = k.col('#f4efe6'); k.circle(x, y, r);
  c.fillStyle = k.col('#ffffff'); k.circle(x - r * 0.35, y - r * 0.35, r * 0.3);
}

// ---------------------------------------------------------------- the floor
function floor(k) {
  const c = k.c;
  if (!k.asset('court-floor', 640, 650, 1280, 250)) {
    c.fillStyle = k.col('#e9c9c9'); c.fillRect(0, FLOOR_TOP, 1280, 650 - FLOOR_TOP);
    // marble slabs in perspective
    c.strokeStyle = k.col('#c79aa5'); c.lineWidth = 1.5;
    for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(640 + i * 90, FLOOR_TOP); c.lineTo(640 + i * 170, 650); c.stroke(); }
    c.fillStyle = k.col('#f1e3c8'); c.globalAlpha = 0.5;
    for (let i = 0; i < 9; i++) { const x = 150 + i * 120, y = 455 + (i % 3) * 70; c.beginPath(); c.ellipse(x, y, 30, 6, 0.2, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    // the three brass-edged processional grooves
    for (let r = 0; r < 3; r++) {
      const y = ROWY[r], s = ROWSCALE[r];
      c.fillStyle = k.col('#2a1424'); c.fillRect(0, y - 3 * s, 1280, 8 * s);
      c.fillStyle = k.col('#d9b34a'); c.fillRect(0, y - 6 * s, 1280, 3 * s); c.fillRect(0, y + 5 * s, 1280, 3 * s);
    }
  }
  // the floor's front edge, where the sentries crouch
  c.fillStyle = k.col('#6d4a6a'); c.fillRect(0, 640, 1280, 10);
}

function floorPearl(k, q, t) {
  const s = ROWSCALE[q.row], y = ROWY[q.row] - 14 * s + Math.sin(t * 3 + q.x) * 2;
  pearlAt(k, q.x, y, 9 * s);
}

// ---------------------------------------------------------------- figures
// A brass slider tab where each cut-out rides in its groove.
function tab(k, x, y, s) { k.c.fillStyle = k.col('#9a7a2a'); k.c.fillRect(x - 8 * s, y - 4 * s, 16 * s, 8 * s); }

function courtier(k, cr, bob, st) {
  const c = k.c, s = ROWSCALE[cr.row], x = cr.x, y = ROWY[cr.row];
  // the one who dives after you into the whale leaves the groove
  if (st.phase === 'lunge' || st.phase === 'iris') {
    if (cr === diver(st)) return;
  }
  tab(k, x, y, s);
  const rock = Math.sin(Math.PI * clamp(beatPhase(st.beat) / 0.42, 0, 1)) * 0.05 * cr.dir;
  c.save(); c.translate(x, y); c.rotate(rock); c.scale(s, s);
  if (cr.kind === 'guard') { if (!k.asset('seahorse-guard', 0, 0, 120, 230)) guardStandin(k); }
  else if (!k.asset('attendant-' + cr.kind, 0, 0, 110, 210)) attendantStandin(k, cr.kind);
  c.restore();
}

function attendantStandin(k, kind) {
  const c = k.c, col = GOWN[kind];
  c.fillStyle = k.col(col);
  c.beginPath(); c.moveTo(-40, 0); c.quadraticCurveTo(-34, -80, -14, -128); c.lineTo(14, -128); c.quadraticCurveTo(34, -80, 40, 0); c.closePath(); c.fill();
  c.fillStyle = k.col('#f4f1ea'); c.globalAlpha = 0.5; c.fillRect(-36, -14, 72, 6); c.fillRect(-28, -54, 56, 4); c.globalAlpha = 1;
  c.fillStyle = k.col(col); c.fillRect(-12, -150, 24, 26);
  c.fillStyle = k.col('#efd7c4'); k.circle(0, -162, 12);
  c.fillStyle = k.col('#5a3a2a'); c.beginPath(); c.arc(0, -164, 12, Math.PI, 0); c.fill();
  // headdress
  if (kind === 'green') {
    c.fillStyle = k.col('#f1e3c8'); c.beginPath(); c.moveTo(-20, -172); c.arc(0, -172, 20, Math.PI, 0); c.closePath(); c.fill();
    c.strokeStyle = k.col('#c79aa5'); c.lineWidth = 1.5; for (let i = 1; i < 5; i++) { const a = Math.PI + (i / 5) * Math.PI; c.beginPath(); c.moveTo(0, -172); c.lineTo(Math.cos(a) * 20, -172 + Math.sin(a) * 20); c.stroke(); }
    // coral fan
    c.fillStyle = k.col('#c8321e'); c.beginPath(); c.moveTo(22, -110); c.arc(22, -110, 22, -2.4, -0.6); c.closePath(); c.fill();
  } else if (kind === 'pink') {
    c.fillStyle = k.col('#f4efe6'); for (let i = -2; i <= 2; i++) k.circle(i * 7, -178 - (2 - Math.abs(i)) * 3, 4);
    // long-stemmed sea flower
    c.strokeStyle = k.col('#3f6a3a'); c.lineWidth = 2.5; c.beginPath(); c.moveTo(18, -100); c.lineTo(26, -196); c.stroke();
    c.fillStyle = k.col('#e0127a'); k.circle(26, -200, 8);
  } else {
    c.fillStyle = k.col('#e9a46a'); k.star(0, -182, 13);
    // gilded conch
    c.fillStyle = k.col('#d9b34a'); c.beginPath(); c.moveTo(14, -108); c.lineTo(42, -122); c.lineTo(36, -96); c.closePath(); c.fill();
  }
  // arms
  c.fillStyle = k.col('#efd7c4'); k.circle(-16, -104, 5); k.circle(18, -106, 5);
}

function guardStandin(k) {
  const c = k.c;
  c.fillStyle = k.col('#2a1a22'); c.fillRect(-16, -60, 12, 60); c.fillRect(4, -60, 12, 60);
  c.fillStyle = k.col('#c8321e'); c.fillRect(-26, -150, 52, 96);
  c.fillStyle = k.col('#d9b34a'); c.fillRect(-26, -106, 52, 6); k.circle(0, -128, 7);
  c.fillStyle = k.col('#efd7c4'); k.circle(0, -164, 13);
  // gold seahorse helmet: crested dome with a curled snout and tail
  c.fillStyle = k.col('#d9b34a');
  c.beginPath(); c.arc(0, -168, 16, Math.PI, 0); c.fill();
  c.beginPath(); c.moveTo(-4, -184); c.quadraticCurveTo(4, -214, 24, -206); c.quadraticCurveTo(14, -198, 10, -184); c.fill();
  c.strokeStyle = k.col('#d9b34a'); c.lineWidth = 4;
  c.beginPath(); c.arc(-18, -160, 7, -1.6, 2.6); c.stroke();
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-8 + i * 5, -184); c.lineTo(-12 + i * 5, -194); c.stroke(); }
  // trident held upright
  c.fillStyle = k.col('#d9b34a'); c.fillRect(32, -222, 5, 222);
  c.fillRect(22, -222, 25, 4);
  for (const dx of [22, 32, 43]) c.fillRect(dx, -238, 4, 16);
  c.fillStyle = k.col('#efd7c4'); k.circle(34, -120, 6);
}

function player(k, st, t) {
  const c = k.c, p = st.p, s = rowScale(p), y = rowY(p);
  const flicker = p.grace > 0 && st.phase === 'play' && Math.floor(t * 12) % 2 === 0;
  const hiddenNow = p.hidden && p.frozen;
  // hidden cue: a soft lavender veil behind him, and two glints
  if (hiddenNow) {
    c.save(); c.globalAlpha = 0.35 + 0.1 * Math.sin(t * 5);
    c.fillStyle = k.col('#cfc0dc'); c.beginPath(); c.ellipse(p.x, y - 70 * s, 46 * s, 86 * s, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = k.col('#f4f1ea'); k.star(p.x - 34 * s, y - 150 * s, 5); k.star(p.x + 32 * s, y - 120 * s, 4);
  }
  tab(k, p.x, y, s);
  c.save();
  if (flicker) c.globalAlpha = 0.45;
  else if (hiddenNow) c.globalAlpha = 0.8;
  c.translate(p.x, y);
  if (st.phase === 'caught') c.rotate(-0.25 * clamp(st.phaseT / 0.5, 0, 1));
  c.scale(s * (p.frozen ? 1 : p.face), s);
  if (p.frozen) { if (!k.asset('sailor-crouch', 0, 0, 120, 150)) sailorBow(k); }
  else {
    const stride = Math.floor(p.walk * 5) % 2;
    const walking = p.moving && st.phase === 'play';
    const id = walking ? (stride ? 'sailor-walk-b' : 'sailor-walk-a') : 'sailor-stand';
    if (!k.asset(id, 0, 0, 110, 180)) sailorStandin(k, walking ? (stride ? 1 : -1) : 0, st.taken);
  }
  c.restore();
  // spotted: an exclamation over him while the beam holds
  if (st.gaze.lock > 0 && st.phase === 'play') {
    c.fillStyle = k.col('#e0127a'); c.font = '700 40px "Josefin Sans", sans-serif'; c.textAlign = 'center';
    c.fillText('!', p.x, y - 190 * s);
  }
}

function sailorStandin(k, stride, holdingPearl) {
  const c = k.c;
  // legs (grey trousers, black boots) scissoring with the stride
  c.fillStyle = k.col('#7d7a78');
  c.save(); c.translate(-6, -62); c.rotate(stride * 0.32); c.fillRect(-6, 0, 12, 56); c.fillStyle = k.col('#141014'); c.fillRect(-7, 50, 18, 10); c.restore();
  c.fillStyle = k.col('#8a8784');
  c.save(); c.translate(6, -62); c.rotate(-stride * 0.32); c.fillRect(-6, 0, 12, 56); c.fillStyle = k.col('#141014'); c.fillRect(-7, 50, 18, 10); c.restore();
  // navy pea coat
  c.fillStyle = k.col(NAVY);
  c.beginPath(); c.moveTo(-24, -54); c.lineTo(-20, -132); c.lineTo(20, -132); c.lineTo(26, -54); c.closePath(); c.fill();
  c.fillStyle = k.col('#d9b34a'); k.circle(12, -110, 2.5); k.circle(12, -92, 2.5); k.circle(12, -74, 2.5);
  // arm swinging
  c.fillStyle = k.col('#1e2740');
  c.save(); c.translate(0, -126); c.rotate(-stride * 0.4 + (holdingPearl ? -2.4 : 0)); c.fillRect(-6, 0, 12, 52); c.restore();
  // kit bag when standing
  if (stride === 0 && !holdingPearl) { c.fillStyle = k.col('#cbb89a'); c.beginPath(); c.ellipse(-20, -128, 16, 22, -0.4, 0, Math.PI * 2); c.fill(); }
  // red neckerchief, head, grey beard, flat cap
  c.fillStyle = k.col('#c8321e'); c.fillRect(-12, -138, 26, 8);
  c.fillStyle = k.col('#e7c9a8'); k.circle(2, -150, 14);
  c.fillStyle = k.col('#b9b4ac'); c.beginPath(); c.moveTo(-6, -148); c.quadraticCurveTo(6, -122, 17, -146); c.fill();
  c.fillStyle = k.col('#141014'); k.circle(9, -154, 2);
  c.fillStyle = k.col(NAVY); c.fillRect(-14, -170, 28, 9); c.fillRect(4, -163, 16, 4);
}

function sailorBow(k) {
  // front-on, frozen in a stiff courtly bow, hand on his cap
  const c = k.c;
  c.fillStyle = k.col('#7d7a78'); c.fillRect(-16, -56, 12, 50); c.fillRect(4, -56, 12, 50);
  c.fillStyle = k.col('#141014'); c.fillRect(-18, -8, 16, 8); c.fillRect(2, -8, 16, 8);
  c.fillStyle = k.col(NAVY);
  c.beginPath(); c.moveTo(-26, -50); c.lineTo(-22, -112); c.lineTo(22, -112); c.lineTo(26, -50); c.closePath(); c.fill();
  // arm across the chest, the other up to the cap
  c.fillStyle = k.col('#1e2740'); c.fillRect(-22, -100, 40, 10);
  c.save(); c.translate(18, -110); c.rotate(-2.6); c.fillRect(-5, 0, 10, 34); c.restore();
  // bowed head
  c.fillStyle = k.col('#c8321e'); c.fillRect(-12, -116, 24, 7);
  c.fillStyle = k.col('#e7c9a8'); k.circle(0, -122, 13);
  c.fillStyle = k.col('#b9b4ac'); c.beginPath(); c.moveTo(-11, -120); c.quadraticCurveTo(0, -100, 11, -120); c.fill();
  c.fillStyle = k.col(NAVY); c.fillRect(-15, -138, 30, 9);
}

// ---------------------------------------------------------------- sentries
function sentry(k, s, st, t) {
  const c = k.c, x = s.x, y = 652, asleep = st.carry.rose;
  if (k.asset(s.open ? 'sentry-creature-open' : 'sentry-creature-closed', x, y, 190, 130)) {
    if (asleep) sleepZ(k, x + 40, y - 110, t);
    return;
  }
  // a crouching coral-red beast facing right, with a finned crest
  c.fillStyle = k.col('#c8321e');
  c.beginPath(); c.ellipse(x - 10, y - 38, 62, 36, 0, Math.PI, 0); c.fill();
  c.fillRect(-72 + x, y - 40, 124, 40);
  // curled tail
  c.strokeStyle = k.col('#c8321e'); c.lineWidth = 12; c.lineCap = 'round';
  c.beginPath(); c.arc(x - 78, y - 34, 18, -0.4, 3.6); c.stroke();
  // crest
  c.fillStyle = k.col(s.open ? '#e0127a' : '#e9a46a');
  for (let i = 0; i < 5; i++) { const cx = x - 50 + i * 20, h = s.open ? 30 : 18; c.beginPath(); c.moveTo(cx - 9, y - 66); c.lineTo(cx, y - 66 - h); c.lineTo(cx + 9, y - 66); c.fill(); }
  // scales
  c.fillStyle = k.col('#8e1f14');
  for (let i = 0; i < 6; i++) k.circle(x - 50 + i * 18, y - 22 - (i % 2) * 10, 4);
  // head and jaws
  const open = s.open ? 0.75 : 0;
  c.fillStyle = k.col('#c8321e');
  c.fillRect(x + 40, y - 24, 52, 22);                         // lower jaw
  c.save(); c.translate(x + 40, y - 26); c.rotate(-open);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(58, 0); c.lineTo(52, -22); c.lineTo(0, -34); c.closePath(); c.fill();
  c.fillStyle = k.col('#f4f1ea'); for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(10 + i * 10, 0); c.lineTo(15 + i * 10, 8); c.lineTo(20 + i * 10, 0); c.fill(); }
  c.fillStyle = k.col(asleep ? '#2a1424' : '#e3c13b');
  if (asleep) c.fillRect(14, -24, 12, 3); else k.circle(20, -22, 6);
  if (!asleep) { c.fillStyle = k.col('#2a1424'); k.circle(22, -22, 2.5); }
  c.restore();
  if (s.open) {
    c.fillStyle = k.col('#4a0a18'); c.beginPath(); c.moveTo(x + 40, y - 26); c.lineTo(x + 92, y - 26); c.lineTo(x + 40 + Math.cos(-open) * 58, y - 26 + Math.sin(-open) * 58); c.fill();
    c.fillStyle = k.col('#f4f1ea'); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x + 50 + i * 10, y - 24); c.lineTo(x + 55 + i * 10, y - 32); c.lineTo(x + 60 + i * 10, y - 24); c.fill(); }
  }
  if (asleep) sleepZ(k, x + 60, y - 80, t);
}

function sleepZ(k, x, y, t) {
  const c = k.c;
  c.fillStyle = k.col('#eef3ea'); c.font = '700 18px "Josefin Sans", sans-serif'; c.textAlign = 'center';
  for (let i = 0; i < 2; i++) {
    const f = (t * 0.5 + i * 0.5) % 1;
    c.globalAlpha = 1 - f; c.fillText('z', x + f * 14, y - f * 30);
  }
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------- the gaze
function beam(k, st, t) {
  const c = k.c, g = st.gaze;
  if (st.phase !== 'play' && st.phase !== 'caught') return;
  const blind = st.masked;
  const spot = g.lock > 0 || st.phase === 'caught';
  c.save();
  c.globalAlpha = blind ? 0.05 : spot ? 0.3 : 0.2;
  c.fillStyle = k.col(spot ? '#e0127a' : '#fff2c0');
  beamPath(c, g.aim); c.fill();
  // pools of light on each groove
  c.globalAlpha = blind ? 0.06 : spot ? 0.45 : 0.32;
  for (let r = 0; r < 3; r++) {
    const b = beamOn(g.aim, r);
    c.beginPath(); c.ellipse(b.cx, ROWY[r], b.hw, 9 * ROWSCALE[r], 0, 0, Math.PI * 2); c.fill();
  }
  // the beam's edge, so its reach reads clearly
  c.globalAlpha = blind ? 0.08 : 0.55; c.strokeStyle = k.col(spot ? '#e0127a' : '#fff2c0'); c.lineWidth = 2;
  c.setLineDash([8, 8]);
  beamPath(c, g.aim); c.stroke();
  c.setLineDash([]);
  c.restore();
}

// The beam's outline: from the lantern's eye down to a long pool across the
// grooves (the same x band on each, as the rules have it).
function beamPath(c, aim) {
  const b0 = beamOn(aim, 0), b2 = beamOn(aim, 2), y0 = ROWY[0] - 12, y2 = ROWY[2] + 30;
  c.beginPath();
  c.moveTo(LANTERN.x - 14, LANTERN.y + 8); c.lineTo(LANTERN.x + 14, LANTERN.y + 8);
  if (aim >= LANTERN.x) { c.lineTo(b0.cx + b0.hw, y0); c.lineTo(b2.cx + b2.hw + 4, y2); c.lineTo(b2.cx - b2.hw - 4, y2); c.lineTo(b0.cx - b0.hw, y0); }
  else { c.lineTo(b0.cx + b0.hw, y0); c.lineTo(b2.cx + b2.hw + 4, y2); c.lineTo(b2.cx - b2.hw - 4, y2); c.lineTo(b0.cx - b0.hw, y0); }
  c.closePath();
}

// The sweep is telegraphed: while the lantern winds up, a ghost of the beam
// stands where it is going and a dotted arrow runs along the floor's front
// edge; the arrow stays up while it sweeps.
function telegraph(k, st, t) {
  const c = k.c, g = st.gaze;
  if (st.phase !== 'play' || (g.phase !== 'warn' && g.phase !== 'sweep')) return;
  const warn = g.phase === 'warn', a = warn ? clamp(g.t / 0.25, 0, 1) : 0.5;
  const cl = (x) => clamp(x, 170, 1110);
  const from = cl(beamOn(g.aim, 2).cx), to = cl(beamOn(g.to, 2).cx);
  const y = 624, dir = Math.sign(to - from) || 1;
  c.save(); c.globalAlpha = a;
  if (warn) {
    // the ghost beam at the target
    c.globalAlpha = a * 0.09; c.fillStyle = k.col('#fff2c0');
    beamPath(c, g.to); c.fill();
    c.globalAlpha = a * 0.6; c.strokeStyle = k.col('#fff2c0'); c.lineWidth = 1.5; c.setLineDash([4, 10]);
    beamPath(c, g.to); c.stroke();
    c.globalAlpha = a;
  }
  c.strokeStyle = k.col('#fff2c0'); c.lineWidth = 3; c.setLineDash([10, 10]);
  c.lineDashOffset = -t * 40 * dir;
  c.beginPath(); c.moveTo(from, y); c.lineTo(to, y); c.stroke(); c.setLineDash([]);
  c.fillStyle = k.col('#fff2c0');
  c.beginPath(); c.moveTo(to + dir * 14, y); c.lineTo(to - dir * 6, y - 10); c.lineTo(to - dir * 6, y + 10); c.fill();
  c.restore();
}

function omens(k, st, t) {
  for (const o of st.omens) {
    const y = o.y + Math.sin(t * 6) * 3;
    k.c.save(); k.c.globalAlpha = 0.85;
    k.c.fillStyle = k.col('#2a1424'); k.circle(o.x, y, 17);
    k.c.strokeStyle = k.col('#d9b34a'); k.c.lineWidth = 2; k.c.beginPath(); k.c.arc(o.x, y, 17, 0, Math.PI * 2); k.c.stroke();
    k.keepsake('leaf', o.x, y, 0.55);
    k.c.restore();
  }
}

// ---------------------------------------------------------------- whale and fish
function passers(k, st, t) {
  const c = k.c, w = st.whale, f = st.fish;
  // the whale's coming: bubbles at the right wing
  if (w.t < 0 && w.next < 2.2 && st.phase === 'play') {
    c.fillStyle = k.col('#eef3ea');
    for (let i = 0; i < 9; i++) { const yy = 420 - ((t * 120 + i * 47) % 340); c.globalAlpha = 0.6 * (1 - w.next / 2.2); k.circle(1090 + ((i * 29) % 50), yy, 3 + (i % 3) * 2); }
    c.globalAlpha = 1;
  }
  if (f.t >= 0) {
    const x = fishX(f.t), y = 250 + Math.sin(f.t * 3) * 10;
    k.wire(x, 60, y - 60);
    if (!k.asset('fish-large', x, y + 100, 350, 200)) fishStandin(k, x, y, t);
  }
  if (w.t >= 0) {
    const x = whaleX(w.t), y = 284 + Math.sin(w.t * 1.6) * 8;
    k.wire(x - 250, 60, y - 150); k.wire(x + 250, 60, y - 130);
    c.save(); c.globalAlpha = 0.94;
    if (!k.asset('whale-side', x, y + 183, 1000, 366)) whaleStandin(k, x, y, w.t);
    c.restore();
    // the sailor stays legible through the whale: a pale outline
    const p = st.p, s = rowScale(p), py = rowY(p);
    if (Math.abs(p.x - x) < 520 && py - 170 * s < y + 180) {
      c.save(); c.globalAlpha = 0.7; c.strokeStyle = k.col('#f1e3c8'); c.lineWidth = 2; c.setLineDash([5, 5]);
      c.beginPath(); c.ellipse(p.x, py - 80 * s, 30 * s, 90 * s, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); c.restore();
    }
  }
}

function whaleStandin(k, x, y, wt) {
  const c = k.c;
  // body: a long slate flat, head to the left
  c.fillStyle = k.col('#2c3438');
  c.beginPath();
  c.moveTo(x - 500, y + 10);
  c.quadraticCurveTo(x - 500, y - 150, x - 260, y - 165);
  c.quadraticCurveTo(x + 150, y - 175, x + 380, y - 60);
  c.lineTo(x + 470, y - 140); c.lineTo(x + 500, y - 110); c.lineTo(x + 440, y - 20); c.lineTo(x + 500, y + 80); c.lineTo(x + 460, y + 90); c.lineTo(x + 380, y + 20);
  c.quadraticCurveTo(x + 100, y + 175, x - 300, y + 160);
  c.quadraticCurveTo(x - 490, y + 140, x - 500, y + 10);
  c.fill();
  // pale ridged throat
  c.fillStyle = k.col('#bfb6a8');
  c.beginPath(); c.moveTo(x - 480, y + 60); c.quadraticCurveTo(x - 200, y + 190, x + 120, y + 120); c.quadraticCurveTo(x - 200, y + 140, x - 480, y + 60); c.fill();
  c.strokeStyle = k.col('#7f786e'); c.lineWidth = 2;
  for (let i = 0; i < 8; i++) { const xx = x - 420 + i * 60; c.beginPath(); c.moveTo(xx, y + 88 + i * 4); c.lineTo(xx + 50, y + 128 - i * 1); c.stroke(); }
  // mouth line, small knowing eye, flipper, barnacles
  c.strokeStyle = k.col('#141014'); c.lineWidth = 4;
  c.beginPath(); c.moveTo(x - 496, y + 20); c.quadraticCurveTo(x - 380, y + 60, x - 260, y + 40); c.stroke();
  c.fillStyle = k.col('#f1e3c8'); k.circle(x - 300, y - 30, 9);
  c.fillStyle = k.col('#141014'); k.circle(x - 302, y - 30, 4);
  c.fillStyle = k.col('#1d2427');
  c.beginPath(); c.moveTo(x - 160, y + 80); c.quadraticCurveTo(x - 120, y + 170, x - 40, y + 190); c.quadraticCurveTo(x - 90, y + 120, x - 90, y + 70); c.fill();
  c.fillStyle = k.col('#8a857c');
  for (let i = 0; i < 7; i++) k.circle(x - 200 + i * 70, y - 120 + (i % 3) * 18, 5 + (i % 2) * 3);
  // a spout as it glides
  c.fillStyle = k.col('#eef3ea'); c.globalAlpha *= 0.5;
  const h = 30 + Math.sin(wt * 4) * 10;
  c.beginPath(); c.moveTo(x - 220, y - 165); c.quadraticCurveTo(x - 250, y - 165 - h, x - 280, y - 170 - h * 1.4); c.quadraticCurveTo(x - 220, y - 175 - h, x - 220, y - 165); c.fill();
}

function fishStandin(k, x, y, t) {
  const c = k.c;
  c.fillStyle = k.col('#d9b34a');
  c.beginPath(); c.ellipse(x, y, 130, 70, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = k.col('#c8321e');
  c.beginPath(); c.moveTo(x + 110, y); c.lineTo(x + 175, y - 70 + Math.sin(t * 8) * 8); c.lineTo(x + 175, y + 70 + Math.sin(t * 8) * 8); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x - 50, y - 60); c.quadraticCurveTo(x, y - 120, x + 60, y - 60); c.fill();
  c.beginPath(); c.moveTo(x - 30, y + 60); c.quadraticCurveTo(x + 10, y + 105, x + 50, y + 60); c.fill();
  c.strokeStyle = k.col('#c8321e'); c.lineWidth = 2;
  for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x - 30 + i * 30, y, 26, -1, 1); c.stroke(); }
  c.fillStyle = k.col('#f4f1ea'); k.circle(x - 80, y - 14, 18);
  c.fillStyle = k.col('#141014'); k.circle(x - 86, y - 14, 8);
  c.strokeStyle = k.col('#141014'); c.lineWidth = 3; c.beginPath(); c.arc(x - 118, y + 12, 10, 0.2, 1.8); c.stroke();
}

// ---------------------------------------------------------------- the swallow
function diver(st) { return st.courtiers.find((c) => c.kind !== 'guard' && c.row === 2) || st.courtiers[0]; }

function outro(k, st, t) {
  const c = k.c, ph = st.phase;
  let grow, open;
  if (ph === 'turn') { const f = easeOut(st.phaseT / OUTRO.turn); grow = 0.35 + 0.65 * f; open = easeInOut((st.phaseT - 0.6) / 1.2); }
  else if (ph === 'lunge') { const f = easeInOut(st.phaseT / OUTRO.lunge); grow = 1 + 2.2 * f; open = 1; }
  else { grow = 3.2; open = 1; }
  const cx = 640, by = 720 + (1 - Math.min(1, grow)) * 260;
  const W = 800 * grow, H = 600 * grow;
  c.save(); c.globalAlpha = 1;
  if (!k.asset('whale-mouth', cx, by, W, H)) whaleMouthStandin(k, cx, by, W, H, open);
  c.restore();
  // the sailor and one courtier are pulled into the throat
  if (ph === 'lunge') {
    const f = easeInOut(st.phaseT / OUTRO.lunge), p = st.p;
    const mx = cx, my = by - H * 0.45;
    const sx = lerp(p.x, mx, f), sy = lerp(rowY(p), my, f) - Math.sin(f * Math.PI) * 120, s = rowScale(p) * (1 - f * 0.8);
    c.save(); c.translate(sx, sy); c.rotate(f * 3); c.scale(s, s); if (!k.asset('sailor-crouch', 0, 0, 120, 150)) sailorBow(k); c.restore();
    const d = diver(st), g = clamp((st.phaseT - 0.15) / 0.7, 0, 1);
    const dx = lerp(d.x, mx + 40, g), dy = lerp(ROWY[d.row], my, g) - Math.sin(g * Math.PI) * 220, ds = ROWSCALE[d.row] * (1 - g * 0.8);
    c.save(); c.translate(dx, dy); c.rotate(-g * 2.6); c.scale(ds, ds); if (!k.asset('attendant-' + d.kind, 0, 0, 110, 210)) attendantStandin(k, d.kind); c.restore();
  }
}

function whaleMouthStandin(k, cx, by, W, H, open) {
  const c = k.c, cy = by - H * 0.48;
  c.fillStyle = k.col('#2c3438');
  c.beginPath(); c.ellipse(cx, cy, W * 0.5, H * 0.5, 0, 0, Math.PI * 2); c.fill();
  // eyes on the flanks
  c.fillStyle = k.col('#f1e3c8'); k.circle(cx - W * 0.4, cy - H * 0.22, 10 * W / 800); k.circle(cx + W * 0.4, cy - H * 0.22, 10 * W / 800);
  c.fillStyle = k.col('#141014'); k.circle(cx - W * 0.4, cy - H * 0.22, 4 * W / 800); k.circle(cx + W * 0.4, cy - H * 0.22, 4 * W / 800);
  // pink mouth with baleen and a dark throat
  const mw = W * 0.38, mh = H * (0.08 + 0.32 * open);
  c.fillStyle = k.col('#e7a6bd'); c.beginPath(); c.ellipse(cx, cy + H * 0.05, mw, mh, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = k.col('#1a0a10'); c.beginPath(); c.ellipse(cx, cy + H * 0.08, mw * 0.55, mh * 0.6, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = k.col('#f1e3c8'); c.lineWidth = Math.max(1.5, 2 * W / 800);
  for (let i = -8; i <= 8; i++) { const x = cx + (i / 8) * mw * 0.9; c.beginPath(); c.moveTo(x, cy + H * 0.05 - mh * 0.95 * Math.sqrt(1 - (i / 8.6) ** 2)); c.lineTo(x, cy + H * 0.05 - mh * 0.55 * Math.sqrt(1 - (i / 8.6) ** 2)); c.stroke(); }
}

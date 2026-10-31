import { walkFrame } from '../walking.js';
// Drawing for the film edition's Act V and Act VI (act5film.js). The climbs,
// the burning interior's floors, connectors and hazards, and the carry reuse
// Act V's drawing (act5-art.js); the sea gap, the tower wall, the tower's
// stone interior, the clifftop and the tableaux are new. Every requested
// piece of art has a stand-in. Draw only from state and t.
import { SWIM, TOWER_TOP, TOWER_WINDOW, FILM_T, BARREL, DUEL, DIVE, WEDDING, APOTH } from './act5film.js';
import { HOUSE, QUAY, T } from './act5.js';
import {
  onEvent as act5Event, cliffScene, holds, climbGuide, climber, rocksWorld, rockWarnings,
  connector, flames, hazards, player, rubble, beloved,
} from './act5-art.js';
import { tableau, card, cardAlpha } from './tableau.js';
import { clamp, lerp, easeOut, easeInOut } from './shared.js';
import { richText } from '../art.js';   // headless-safe: art.js touches no DOM at load
import { drawPose, drawPerson } from '../pose.js';

// ================================================================= Act V
export function drawTower(k, st, t) {
  const ph = st.phase;
  if (ph === 'cliff') return cliffScene(k, st, t);
  if (ph === 'dive') return diveScene(k, st, t);
  if (ph === 'swim') return swimScene(k, st, t);
  if (ph === 'tower') return towerScene(k, st, t);
  const pt = ph === 'window' ? st.phaseT : FILM_T.window + st.phaseT;
  // Her window at the top of the wall (she has been at it all the climb), the
  // prince beside her.
  towerScene(k, st, t);
  card(k, 'Her Window', 'Azurine is held inside', cardAlpha(pt, FILM_T.window + 9));
}

export function drawOverTower(k, st) {
  if (st.defeatT != null) k.wash('#2a1424', 0.55 * clamp(st.defeatT / FILM_T.defeat, 0, 1));
  if (st.phase === 'iris') k.iris(TOWER_WINDOW.x, 640 + st.camY - TOWER_TOP - 50, 760 * (1 - easeInOut(st.phaseT / FILM_T.iris)));
  if (st.status === 'won') k.iris(TOWER_WINDOW.x, 640 + st.camY - TOWER_TOP - 50, 0);
}

export function onEventTower(k, e, st) {
  if (e.type === 'diveLeap') { k.text('Dive!', st.w.x, DIVE.y - 200); return; }
  if (e.type === 'diveSplash') { k.shake(0.3); k.burst(e.x, 600, '#eef3ea', 30, 'drop'); return; }
  if (st.phase === 'swim' || e.type === 'towerFoot') {
    const px = 420, py = swimY(st);
    if (e.type === 'dive') k.burst(px, py - 10, '#eef3ea', 12, 'drop');
    if (e.type === 'surface') k.burst(px, py - 10, '#eef3ea', 6, 'drop');
    if (e.type === 'witchMiss') { k.burst(swoopScreenX(st), 470, '#eef3ea', 18, 'drop'); k.text('Missed!', swoopScreenX(st), 380); }
    if (e.type === 'hit') { k.shake(0.4); k.burst(px, py - 30, '#c8321e', 14, 'streak'); }
    if (e.type === 'auroraLight') { k.flash(0.6); k.burst(220, 140, '#fff2b0', 40, 'sparkle'); k.text("Aurora's light!", 640, 230, true); }
    return;
  }
  act5Event(k, e, st);
}

// ---------------------------------------------------------------- the sea gap
// the waterline he swims along: in the painted swell of the coast-gap cloth
const SURFACE = 548;
const swimY = (st) => SURFACE + (st.sw?.dive > 0 ? 70 * Math.sin(Math.PI * clamp(1 - st.sw.dive / SWIM.dive, 0, 1)) + 20 : 0);
const swoopScreenX = (st) => (st.sw?.swoop ? 420 + (st.sw.swoop.x - st.sw.x) : -999);

function swimScene(k, st, t) {
  const c = k.c, sw = st.sw, f = sw.x / SWIM.len;
  // the delivered cloth (the cliff at the left, the sea gap, the tower on its
  // rock at the right), panned from the cliff toward the tower as he swims
  const painted = k.img('coast-gap');
  let cliffX = 260 - f * 520;
  const cloth = () => k.asset('coast-gap', 832 - f * 384, 800, 1664, 936);
  if (painted) {
    cloth();
    cliffX = 300 - f * 384;
  } else {
  const g = c.createLinearGradient(0, 0, 0, SURFACE);
  g.addColorStop(0, k.col('#1c1630')); g.addColorStop(1, k.col('#3d3a5c'));
  c.fillStyle = g; c.fillRect(0, 0, 1280, SURFACE + 10);
  k.moon(980, 120, 38);
  const rock = [[-400, 470], [-400, 96], [-60, 104], [10, 132], [40, 120], [70, 168], [96, 210], [88, 260], [120, 300], [130, 360], [158, 420], [170, 470]];
  c.fillStyle = k.col('#241c2a'); c.beginPath(); for (const [dx, y] of rock) c.lineTo(cliffX + dx, y); c.closePath(); c.fill();
  c.strokeStyle = k.col('#8c7f9a'); c.lineWidth = 2; c.globalAlpha = 0.6;  // moonlight on its edge
  c.beginPath(); for (const [dx, y] of rock.slice(2, -1)) c.lineTo(cliffX + dx, y); c.stroke(); c.globalAlpha = 1;
  c.fillStyle = k.col('#3f5a34'); c.fillRect(cliffX - 400, 92, 440, 8);  // the grass at its top
  towerSilhouette(k, 1180 - f * 380, SURFACE, 0.55 + 0.75 * f, t);
  }
  // the sea: the cloth's own painted sea (without it, plain water and swell)
  if (!painted) {
    c.fillStyle = k.col('#1d3b44'); c.fillRect(0, SURFACE, 1280, 720 - SURFACE);
    for (let r = 0; r < 3; r++) k.waves(r, sw.x * (0.6 + r * 0.25) + t * 30);
  }
  // the witch's shadow on the water, then her swoop
  if (sw.swoop) {
    const x = swoopScreenX(st), k2 = clamp(sw.swoop.t / sw.swoop.lead, 0, 1);
    c.save(); c.globalAlpha = 0.25 + 0.45 * k2; c.fillStyle = k.col('#0b0710');
    c.beginPath(); c.ellipse(x, SURFACE + 12, 40 + 50 * k2, 10 + 6 * k2, 0, 0, Math.PI * 2); c.fill(); c.restore();
    const wy = lerp(-80, SURFACE - 40, easeOut(k2)), wx = x + (1 - k2) * 260;
    c.save(); c.translate(wx, wy); c.rotate(-0.5 * (1 - k2));
    if (!k.asset('witch-swoop', 0, 60, 200, 120) && !k.asset('witch-hooded', 0, 60, 70, 120)) { c.fillStyle = k.col('#1f3a3c'); k.circle(0, 20, 28); }
    c.restore();
  }
  // Aurora's light from the cliff drives her off
  if (sw.aurora != null) {
    const a = clamp(1 - sw.aurora / SWIM.aurora, 0, 1);
    if (a > 0) {
      c.save(); c.globalAlpha = 0.5 * a; c.strokeStyle = k.col('#fff2b0'); c.lineWidth = 8;
      c.beginPath(); c.moveTo(cliffX + 60, 150); c.lineTo(900 + sw.aurora * 300, 60); c.stroke();
      c.restore();
      if (!k.asset('aurora-stand', cliffX + 70, 190, 70, 112)) { c.fillStyle = k.col('#f4ead2'); k.circle(cliffX + 70, 150, 16); }
    }
  }
  // the prince, swimming at the surface or diving under it: every stroke on
  // the one scale (his standing figure 150 px; the audit evens the strokes)
  const y = swimY(st);
  c.save();
  if (st.inv > 0 && Math.floor(st.inv * 10) % 2) c.globalAlpha = 0.45;
  const ab = Math.floor(sw.stroke * 4) % 2 ? 'a' : 'b';
  const id = (sw.dive > 0 ? 'prince-swim-under-' : 'prince-swim-') + ab;
  if (!drawPose(k, id, 420, y + 40, 150) && !k.asset('sailor-swim-' + ab, 420, y + 40, 150, 100)) { c.fillStyle = k.col('#2b3550'); c.fillRect(380, y - 12, 80, 22); }
  c.restore();
  // the sea over him below its rippling waterline: the painted water laid
  // back over his lower half at the surface, and over all of him when he
  // dives (no box: the cloth itself, clipped to the water)
  const under = sw.dive > 0 ? Math.sin(Math.PI * clamp(1 - sw.dive / SWIM.dive, 0, 1)) : 0;
  c.save();
  c.beginPath(); c.moveTo(250, 720);
  for (let x = 250; x <= 600; x += 10) c.lineTo(x, SURFACE - 2 + Math.sin(x * 0.05 + t * 3) * 4);   // at his chest
  c.lineTo(600, 720); c.closePath(); c.clip();
  c.globalAlpha = 0.5 + 0.1 * under;   // under, he shows as a dim shape through it
  if (!(painted && cloth())) { c.fillStyle = k.col('#1d3b44'); c.fillRect(250, SURFACE, 350, 720 - SURFACE); }
  c.restore();
  // how far to the tower
  c.save(); c.globalAlpha = 0.85; c.fillStyle = k.col('#2a1424'); c.beginPath(); c.roundRect(440, 96, 400, 14, 7); c.fill();
  c.fillStyle = k.col('#d9b34a'); c.beginPath(); c.roundRect(442, 98, 396 * f, 10, 5); c.fill(); c.restore();
  if (st.phaseT < 6) {
    c.save(); c.globalAlpha = clamp(1 - (st.phaseT - 4.5) / 1.5, 0, 1); c.textAlign = 'center';
    c.font = '700 18px "Josefin Sans", sans-serif'; c.fillStyle = k.col('#f1e3c8');
    richText(c, 'Swim right for the tower · [A] dives under her swoop', 640, 150, { px: 18, mode: k.inputMode || 'key', col: k.col });
    c.restore();
  }
}

function towerSilhouette(k, x, base, s, t) {
  const c = k.c, w = 120 * s, h = 300 * s;
  c.fillStyle = k.col('#16121c');
  c.fillRect(x - w * 0.8, base - 40 * s, w * 1.6, 40 * s);         // its rock
  c.fillRect(x - w / 2, base - h, w, h);
  for (let i = -2; i <= 2; i++) c.fillRect(x + i * w / 5 - w / 12, base - h - 16 * s, w / 6, 16 * s);
  c.fillStyle = k.col('#e9c46a'); c.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3);
  c.fillRect(x - 8 * s, base - h * 0.82, 16 * s, 24 * s);          // her window
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------- the tower wall
const WALL = { x0: 400, x1: 880 };
// Azurine looking out of her window, in the painted arch above its sill, all
// through the climb, with a warm light behind her, so he can see from below
// which window he is climbing to.
function azurineAtWindow(k, t) {
  const c = k.c, x = TOWER_WINDOW.x, y = -TOWER_TOP - 44;
  const g = c.createRadialGradient(x, y, 6, x, y, 70);
  g.addColorStop(0, `rgba(255,214,140,${0.55 + 0.15 * Math.sin(t * 2.2)})`); g.addColorStop(1, 'rgba(255,214,140,0)');
  c.fillStyle = g; c.fillRect(x - 70, y - 70, 140, 140);
  if (!k.asset('azurine-window', x, -TOWER_TOP - 4, 64, 80)) { c.fillStyle = k.col('#c9d8ee'); k.circle(x, -TOWER_TOP - 50, 14); }
}

function towerScene(k, st, t) {
  const c = k.c, cam = st.camY;
  const g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, k.col('#1c1630')); g.addColorStop(1, k.col('#34405a'));
  c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
  k.moon(1080, 140 + cam * 0.04, 40);
  c.save(); c.translate(0, 640 + cam);
  const lo = Math.max(-120, cam - 120), hi = cam + 720;
  if (lo < 60) {  // the sea breaking at its foot
    c.fillStyle = k.col('#1d3b44'); c.fillRect(0, 0, 1280, 220);
    c.strokeStyle = k.col('#eef3ea'); c.lineWidth = 3;
    for (let i = 0; i < 3; i++) { c.beginPath(); for (let x = 0; x <= 1280; x += 30) c.lineTo(x, 20 + i * 26 + Math.sin(x * 0.04 + t * 2 + i) * 5); c.stroke(); }
  }
  // the wall: the delivered tall cloth, or painted stone courses
  if (!k.asset('tower-wall-tall', 640, 30, 760, 760 * 3600 / 1400)) {
    c.fillStyle = k.col('#6d6872'); c.fillRect(WALL.x0, -TOWER_TOP - 40, WALL.x1 - WALL.x0, TOWER_TOP + 80);
    c.fillStyle = k.col('#57525c');
    for (let wy = Math.max(0, Math.floor(lo / 44) * 44); wy < Math.min(TOWER_TOP + 40, hi); wy += 44) {
      const off = (wy / 44) % 2 ? 0 : 40;
      for (let x = WALL.x0 - off; x < WALL.x1; x += 80) { c.fillRect(Math.max(WALL.x0, x), -wy - 2, 3, 44); }
      c.fillRect(WALL.x0, -wy, WALL.x1 - WALL.x0, 3);
    }
    // ivy trailing down the stones
    for (let i = 0; i < 9; i++) {
      const x = WALL.x0 + 30 + ((i * 131) % (WALL.x1 - WALL.x0 - 60)), wy0 = (i * 211) % (TOWER_TOP - 200) + 160;
      c.strokeStyle = k.col('#3f5a34'); c.lineWidth = 2.5; c.beginPath();
      for (let d = 0; d < 180; d += 12) c.lineTo(x + Math.sin((wy0 + d) * 0.07) * 7, -wy0 + d);
      c.stroke();
      c.fillStyle = k.col(i % 2 ? '#5f7d4a' : '#6f9a4a');
      for (let d = 6; d < 180; d += 18) { const lx2 = x + Math.sin((wy0 + d) * 0.07) * 7; k.circle(lx2 + 6, -wy0 + d, 5); k.circle(lx2 - 6, -wy0 + d + 8, 4); }
    }
    // battlements and her window at the top
    c.fillStyle = k.col('#6d6872');
    for (let x = WALL.x0; x < WALL.x1; x += 64) c.fillRect(x, -TOWER_TOP - 80, 40, 42);
  }
  if (k.img('tower-wall-tall')) { /* the cloth paints her window */ }
  else if (!k.asset('tower-window', 640, -TOWER_TOP + 10, 100, 130)) {
    c.fillStyle = k.col('#e9c46a'); c.globalAlpha = 0.7 + 0.25 * Math.sin(t * 3);
    c.beginPath(); c.moveTo(600, -TOWER_TOP + 6); c.lineTo(600, -TOWER_TOP - 70); c.arc(640, -TOWER_TOP - 70, 40, Math.PI, 0); c.lineTo(680, -TOWER_TOP + 6); c.closePath(); c.fill();
    c.globalAlpha = 1; c.fillStyle = k.col('#2a2430');
    for (const x of [616, 640, 664]) c.fillRect(x - 2, -TOWER_TOP - 100, 4, 106);
  }
  azurineAtWindow(k, t);
  holds(k, st, t);
  c.restore();
  c.save(); c.translate(0, 640 + cam);
  rocksWorld(k, st, t);
  climbGuide(k, st, t);
  climber(k, st, t);
  c.restore();
  rockWarnings(k, st, t);
}

// ================================================================= Act VI
export function drawBurning(k, st, t) {
  const ph = st.phase;
  if (ph === 'house') return towerInterior(k, st, t);
  if (ph === 'quay') return clifftop(k, st, t);
  if (ph === 'barrel') return barrelScene(k, st, t);
  if (ph === 'wedding') return wedding(k, st, t);
  apotheosis(k, st, t);
}

export function drawOverBurning(k, st) {
  if (st.defeatT != null) k.wash('#2a1424', 0.55 * clamp(st.defeatT / FILM_T.defeat, 0, 1));
  if (st.phase === 'iris') k.iris(640, 300, 760 * (1 - easeInOut(st.phaseT / FILM_T.iris)));
  if (st.status === 'won') k.iris(640, 300, 0);
}

export function onEventBurning(k, e, st) {
  if (e.type === 'witchStruck') { k.flash(0.3); k.shake(0.25); k.burst(e.x - 20, BARREL.y - 110, '#fff2b0', 22, 'sparkle'); if (e.hp > 0) k.text(e.hp === 1 ? 'Once more!' : 'A hit!', e.x, BARREL.y - 220); return; }
  if (e.type === 'witchWinds') { k.burst(e.x, BARREL.y - 150, '#b06ad0', 8, 'sparkle'); return; }
  if (e.type === 'witchBolt') { k.burst(e.x - 40, BARREL.y - 20, '#e9a46a', 10, 'streak'); return; }
  if (e.type === 'witchBlast') { k.shake(0.4); k.flash(0.25); k.burst(e.x + 20, BARREL.y - 80, '#b06ad0', 18, 'streak'); return; }
  if (e.type === 'witchBeaten') { k.flash(0.4); k.text('Beaten!', e.x, BARREL.y - 230, true); return; }
  if (e.type === 'auroraCasts') { k.burst(268, BARREL.y - 190, '#fff2b0', 24, 'sparkle'); return; }
  if (e.type === 'barrelDrop') { k.shake(0.5); k.burst(e.x, BARREL.y - 10, '#d8c8a8', 26, 'smoke'); k.burst(e.x, BARREL.y - 60, '#fff2b0', 16, 'sparkle'); return; }
  if (e.type === 'swordSwing') return;
  if (e.type === 'barrelFall') { k.flash(0.5); k.shake(0.6); k.burst(1000, 610, '#eef3ea', 40, 'drop'); k.text('Into the whirlpool!', 640, 240, true); return; }
  if (e.type === 'petal') { k.burst(e.x, e.y, '#f3c6dc', 8, 'sparkle'); return; }
  if (e.type === 'ascend') { k.flash(0.6); k.burst(640, 480, '#fff2b0', 50, 'sparkle'); return; }
  if (e.type === 'witchReturns') { k.flash(0.4); return; }
  if (e.type === 'shutterSmash') { k.burst(HOUSE.shutterX, HOUSE.shutterY, '#fff2b0', 22, 'sparkle'); k.text("Aurora's lamp!", HOUSE.shutterX, HOUSE.shutterY - 90, true); return; }
  if (e.type === 'stoneThrow') { k.text("Aurora's lamp!", st.p.x, st.p.y - 130); return; }
  act5Event(k, e, st);
}

// The tower cut open like a dollhouse, on the house's floors: the delivered
// tower-interior cloth, or the fire tableau darkened behind stone floors.
// The cloth's floors are 500 px apart at y 636, 1136 and 1636 of its 1800, so
// at 0.348 scale (one storey) they land on HOUSE.floors and its walls on
// wallL/wallR.
const TOWER_ART = [640, 683, 487, 627];
function towerInterior(k, st, t) {
  const c = k.c, H = HOUSE;
  // the night outside the cut-away tower: the sea gap behind, darkened, and
  // the fire's glow rising from its foot, so no bare stage shows either side
  if (k.img('tower-interior')) {
    if (k.asset('coast-gap', 640, 720, 1280, 720)) k.wash('#120610', 0.55);
    else { c.fillStyle = k.col('#140a14'); c.fillRect(0, 0, 1280, 720); }
    const g = c.createLinearGradient(0, 720, 0, 200);
    g.addColorStop(0, `rgba(255,120,50,${0.42 + 0.08 * Math.sin(t * 5)})`); g.addColorStop(1, 'rgba(255,90,40,0)');
    c.fillStyle = g; c.fillRect(0, 200, 1280, 520);
  }
  const painted = k.asset('tower-interior', ...TOWER_ART);
  if (!painted) {
    tableau(k, 'tower-fire', 6, 12, { zoom: 0.04, focus: [640, 360] });
    c.save(); c.globalAlpha = 0.62; c.fillStyle = k.col('#160c10'); c.fillRect(0, 0, 1280, 720); c.restore();
    // the tower's walls and vaults
    c.fillStyle = k.col('#5e5864'); c.fillRect(H.x0 - 24, 96, 24, 548); c.fillRect(H.x1, 96, 24, 548);
    c.fillStyle = k.col('#3a3440');
    c.beginPath(); c.moveTo(H.x0 - 24, 100); c.quadraticCurveTo(640, 20, H.x1 + 24, 100); c.lineTo(H.x1 + 24, 112); c.quadraticCurveTo(640, 36, H.x0 - 24, 112); c.closePath(); c.fill();
    for (let f = 0; f < 3; f++) {
      const y1 = H.floors[f], y0 = y1 - H.storey;
      c.fillStyle = k.col(f === 2 ? '#3d3044' : '#352c36'); c.fillRect(H.x0, Math.max(112, y0), H.x1 - H.x0, y1 - Math.max(112, y0));
      c.fillStyle = k.col('#000000'); c.globalAlpha = 0.18;
      for (let x = H.x0 + 30; x < H.x1; x += 90) { c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y0 + 40); c.arc(x + 30, y0 + 40, 30, Math.PI, 0); c.lineTo(x + 60, y1); c.fill(); }
      c.globalAlpha = 1;
    }
    // her canopied bed at the top
    c.fillStyle = k.col('#6f2a48'); c.fillRect(760, H.floors[2] - 70, 110, 10); c.fillRect(760, H.floors[2] - 70, 8, 70); c.fillRect(862, H.floors[2] - 70, 8, 70);
    c.fillStyle = k.col('#c79ab7'); c.fillRect(770, H.floors[2] - 22, 92, 18);
  }
  if (!st.p.carry && st.carry.stone) { /* the barred shutter (opened by Aurora's lamp) */ }
  for (const cn of st.conns) connector(k, st, cn, t);
  if (st.broke) rubble(k, st, t);
  H.floors.forEach((fy, f) => {
    if (!painted) for (const [a, b] of st.spans[f]) {
      c.fillStyle = k.col('#6d6872'); c.fillRect(a, fy, b - a, 14);
      c.fillStyle = k.col('#8c8792'); c.fillRect(a, fy, b - a, 3);
    }
    // the burnt gaps, cut through the painted floors too
    if (f > 0) for (let gi = 0; gi < st.spans[f].length - 1; gi++) {
      const gx0 = st.spans[f][gi][1], gx1 = st.spans[f][gi + 1][0];
      if (painted) { c.fillStyle = k.col('#140a0c'); c.fillRect(gx0, fy - 2, gx1 - gx0, 18); }
      c.fillStyle = k.col('#e9a46a'); c.globalAlpha = 0.5 + 0.25 * Math.sin(t * 7 + f);
      c.beginPath(); c.ellipse((gx0 + gx1) / 2, fy + 8, (gx1 - gx0) / 2 + 6, 12, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    }
  });
  // the demons who set it alight, dancing with their torches at the foot
  for (const [x, id, ph0] of [[318, 'demon-red', 0], [962, 'demon-teal', 1.7]]) {
    const hop = Math.abs(Math.sin(t * 4 + ph0)) * 8;
    if (!k.asset(id, x, H.floors[0] - hop, 70, 115)) { c.fillStyle = k.col(id === 'demon-red' ? '#c8321e' : '#5f8c88'); c.fillRect(x - 10, H.floors[0] - 80 - hop, 20, 80); }
  }
  hazards(k, st, t);
  player(k, st, t);
  flames(k, st, t, 1);
  // Azurine in front of the smoke, so she can always be seen
  if (!st.p.carry) beloved(k, H.beloved, H.floors[2], 0.6, -1, Math.sin(t * 5) > 0.3 ? 'reach' : 'down');
  // where he is going: to her at the top, then out of the door with her
  const [gx, gy, label] = st.p.carry ? [H.door + 10, H.floors[0], 'Out of the door'] : [H.beloved, H.floors[2], 'To her'];
  const bob = Math.sin(t * 4) * 6, ty = gy - (st.p.carry ? 170 : 150) + bob;
  c.save(); c.globalAlpha = 0.85; c.fillStyle = k.col('#fff2b0');
  c.beginPath(); c.moveTo(gx - 14, ty); c.lineTo(gx + 14, ty); c.lineTo(gx, ty + 18); c.closePath(); c.fill();
  c.font = '700 15px "Josefin Sans", sans-serif'; c.textAlign = 'center';
  c.fillStyle = k.col('#2a1424'); c.fillText(label, gx + 1, ty - 7); c.fillStyle = k.col('#fff2b0'); c.fillText(label, gx, ty - 8);
  c.restore();
  if (st.phaseT < 7 && !st.p.carry) hint(k, 'Climb the stairs and ladders to Azurine · [A] leaps the burnt gaps');
}

// Out across the clifftop with her, the tower falling behind.
function clifftop(k, st, t) {
  const c = k.c;
  // The delivered cliff-top cloth at 1.45x, its stone ledge (y 420, x 120-730
  // of its 1280 x 720) on the path: QUAY.y, from x 174 to 1058.
  if (k.asset('cliff-whirlpool', 928, QUAY.y + 435, 1856, 1044)) {
    const glow = c.createRadialGradient(0, QUAY.y - 160, 20, 0, QUAY.y - 160, 420);
    glow.addColorStop(0, 'rgba(255,150,70,0.55)'); glow.addColorStop(1, 'rgba(255,120,60,0)');
    c.save(); c.globalAlpha = 0.7 + 0.3 * Math.sin(t * 6); c.fillStyle = glow; c.fillRect(0, 0, 640, 720); c.restore();
    hazards(k, st, t);
    player(k, st, t);
    return;
  }
  const g = c.createLinearGradient(0, 0, 0, QUAY.y);
  g.addColorStop(0, k.col('#1c1222')); g.addColorStop(1, k.col('#5a2a2a'));
  c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
  k.moon(1040, 120, 34);
  // the sea below the cliff at the right
  c.fillStyle = k.col('#1d3b44'); c.fillRect(0, QUAY.y + 40, 1280, 200);
  // the burning tower behind at the left, leaning as it falls
  const fall = clamp(st.quayT / 6, 0, 1);
  c.save(); c.translate(250, QUAY.y); c.rotate(-0.25 * easeInOut(fall));
  towerSilhouette(k, 0, 0, 1.1, t);
  c.fillStyle = k.col('#e9a46a');
  for (let i = 0; i < 6; i++) { c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 9 + i); c.beginPath(); c.moveTo(-50 + i * 20, -300); c.lineTo(-40 + i * 20, -360 - 20 * Math.abs(Math.sin(t * 7 + i))); c.lineTo(-30 + i * 20, -300); c.fill(); }
  c.globalAlpha = 1;
  c.restore();
  // the clifftop path
  c.fillStyle = k.col('#3d3430'); c.fillRect(0, QUAY.y, 1280, 50);
  c.fillStyle = k.col('#5f8c4a'); c.fillRect(0, QUAY.y - 4, 1280, 8);
  hazards(k, st, t);
  player(k, st, t);
}

// ---------------------------------------------------------------- on foot
// The prince on foot (walker state `w`), facing his way, `h` tall.
function princeOnFoot(k, w, h = 170) {
  const c = k.c, moving = Math.abs(w.vx) > 20, step = walkFrame('prince', w.walk, 36);
  const id = w.knockT > 0 ? 'prince-fall' : !w.on ? (w.vy < -95 ? 'prince-leap' : w.vy > 95 ? 'prince-fall' : 'prince-apex')
    : w.landT > 0 ? 'prince-land' : moving ? step : 'prince-stand';
  const big = ['prince-fall', 'prince-apex', 'prince-land'].includes(id);
  c.save(); c.translate(w.x, w.y); c.scale(w.face, 1);
  if (!k.asset(id, 0, 0, big ? h : h * 0.61, big ? h * 1.22 : h)) { c.fillStyle = k.col('#6f9fc8'); c.fillRect(-14, -h * 0.8, 28, h * 0.8); }
  c.restore();
}
// Azurine walking at his side: her stride frames once delivered (F11),
// else a still on its slide, bobbing as she goes.
function azurineOnFoot(k, a, y, h = 168) {
  const c = k.c, moving = Math.abs(a.vx || 0) > 20;
  const stride = moving && ['walk-a', 'pass-a', 'walk-b', 'pass-b'].every(pose => k.img('azurine-' + pose));
  const bob = stride ? 0 : Math.abs(Math.sin(a.walk / 24)) * 4;
  const id = stride ? walkFrame('azurine', a.walk, 36) : 'azurine-stand';
  c.save(); c.translate(a.x, y - bob); c.scale(-a.face, 1); if (!stride) c.rotate(Math.sin(a.walk / 24) * 0.03);
  if (!k.asset(id, 0, 0, h * 0.53, h)) { c.fillStyle = k.col('#c9d8ee'); c.fillRect(-16, -h * 0.8, 32, h * 0.8); }
  c.restore();
}
// A short instruction on a plum label near the top of the stage.
// A short instruction on a plum label, drawn over the stage frame (so the
// valance never clips it) low on the stage unless placed.
function hint(k, text, y = 630) {
  const draw = () => {
    const c = k.c;
    c.save(); c.textAlign = 'center'; c.font = '700 18px "Josefin Sans", sans-serif';
    const w = c.measureText(text.replace(/\[(\w+)\]/g, 'XX')).width + 60;
    c.globalAlpha = 0.88; c.fillStyle = k.col('#2a1424'); c.beginPath(); c.roundRect(640 - w / 2, y - 24, w, 36, 18); c.fill();
    c.globalAlpha = 1; c.fillStyle = k.col('#f3c6dc');
    richText(c, text, 640, y, { px: 18, mode: k.inputMode || 'key', col: k.col });
    c.restore();
  };
  if (k.over) k.over(draw); else draw();
}

// Act V: the clifftop over the sea gap; he walks to the edge and dives.
function diveScene(k, st, t) {
  const c = k.c, w = st.w, d = st.dv;
  if (!k.asset('coast-gap', 640, 720, 1280, 720)) { c.fillStyle = k.col('#1c1630'); c.fillRect(0, 0, 1280, 720); c.fillStyle = k.col('#4a3a40'); c.fillRect(0, DIVE.y, DIVE.edge, 400); }
  if (!w) return;
  if (d && !d.splash && k.img('prince-dive')) {
    // head first (F20), centred on his flight and tipping steeper as he falls
    const ph = 124 * (k.img('prince-dive').naturalHeight || 360) / 360;
    drawPose(k, 'prince-dive', w.x, w.y - 55 + ph / 2, 124, { rot: clamp(d.rot * 0.18, 0, 0.6), pivot: ph / 2 });
  } else if (d && !d.splash) {
    c.save(); c.translate(w.x, w.y); c.rotate(d.rot * 0.5);
    if (!k.asset('prince-leap', 0, 0, 110, 152)) { c.fillStyle = k.col('#6f9fc8'); c.fillRect(-14, -100, 28, 100); }
    c.restore();
  } else if (!d) princeOnFoot(k, w, 124);
  if (d?.splash) { c.save(); c.globalAlpha = Math.max(0, 1 - d.t / FILM_T.splash); c.fillStyle = k.col('#eef3ea'); c.beginPath(); c.ellipse(w.x, 600, 40 + d.t * 80, 10, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  // the edge to dive from: a glowing mark on the path
  if (!d) {
    const a = 0.45 + 0.3 * Math.sin(t * 5);
    c.save(); c.globalAlpha = a; c.fillStyle = k.col('#fff2b0');
    c.beginPath(); c.ellipse(DIVE.edge - 30, DIVE.y + 2, 46, 9, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(DIVE.edge - 42, DIVE.y - 150); c.lineTo(DIVE.edge - 18, DIVE.y - 150); c.lineTo(DIVE.edge - 30, DIVE.y - 130); c.closePath(); c.fill();
    c.restore();
  }
  if (!d && st.phaseT < 7) hint(k, 'Walk to the cliff edge · [A] dives for the tower');
}

// The fight before it: the witch at the right of the ledge, her fire running
// along the ground at him, the prince lunging at her with the sword. Each
// of them on their person scale (the prince's standing figure 140 px).
function duel(k, st, t) {
  const c = k.c, d = st.duel, w = st.w, H = 140;
  // her fire, rolling along the ground
  for (const bo of d.bolts) {
    // a low running flame, its tongues streaming back the way it came
    c.save(); c.translate(bo.x, BARREL.y + 2);
    for (const [col, w, h] of [['#c8321e', 30, 46], ['#e9693a', 22, 34], ['#ffcf7a', 12, 20]]) {
      const fl = Math.sin(t * 24 + w) * 4;
      c.fillStyle = k.col(col); c.beginPath(); c.moveTo(-w, 0);
      c.quadraticCurveTo(-w * 0.2, -h * 0.5, w * 1.4 + fl, -h - fl);   // the tip streams back (to the right)
      c.quadraticCurveTo(w * 0.7, -h * 0.35, w, 0); c.closePath(); c.fill();
    }
    c.restore();
  }
  // the witch: standing, winding up in a violet glow, reeling from a blow,
  // or shrinking into smoke as she hides in her barrel
  const warn = d.state === 'warn' ? d.t / DUEL.warn : 0;
  const reel = d.state === 'reel' ? 1 - d.t / DUEL.reel : 0;
  const T2 = DUEL.trap, trap = d.state === 'trap', tt = trap ? d.t : 0;
  if (warn > 0) { c.save(); c.globalAlpha = 0.25 + 0.35 * warn + 0.1 * Math.sin(t * 20); c.fillStyle = k.col('#b06ad0'); k.circle(d.x, BARREL.y - 110, 70 + 20 * warn); c.restore(); }
  const id = d.state === 'reel' && k.img('witch-recoil') ? 'witch-recoil' : d.state === 'warn' && k.img('witch-cast') ? 'witch-cast' : 'witch-hooded';
  // until Aurora's barrel lands over her (beaten, she cowers)
  if (!trap || tt < T2.land) {
    c.save(); c.translate(d.x, BARREL.y);
    c.rotate(0.25 * reel * (id === 'witch-hooded' ? 1 : 0) + (trap ? 0.12 * Math.sin(t * 30) : 0));
    if (reel > 0.6) { c.save(); c.globalAlpha = 0.6; c.fillStyle = '#ffffff'; k.circle(0, -90, 50); c.restore(); }
    if (!drawPerson(k, trap && k.img('witch-recoil') ? 'witch-recoil' : id, 0, 0, H, { t })) { c.fillStyle = k.col('#2f5a50'); c.fillRect(-26, -H, 52, H); }
    c.restore();
  }
  if (trap) {
    const bx = Math.min(d.x, BARREL.edge - 70);
    // Aurora's spell: a ribbon of gold from her hand to the air over the witch
    if (tt < T2.land + 0.2) {
      const g = clamp(tt / T2.drop, 0, 1), hx = 268, hy = BARREL.y - 190, tx = bx, ty = BARREL.y - 330;
      c.save();
      for (let i = 0; i <= 24 * g; i++) {
        const f = i / 24, x = hx + (tx - hx) * f, y = hy + (ty - hy) * f - Math.sin(f * Math.PI) * 60 + Math.sin(t * 14 + f * 16) * 6;
        c.globalAlpha = (0.5 + 0.5 * Math.sin(t * 20 + i)) * (1 - clamp((tt - T2.land) / 0.2, 0, 1)); c.fillStyle = k.col(i % 3 ? '#fff2b0' : '#ffffff'); k.circle(x, y, 4);
      }
      c.restore();
    }
    // the barrel: forms over her, upside down, drops onto her and shuts her in
    if (tt >= T2.drop) {
      const f = clamp((tt - T2.drop) / (T2.land - T2.drop), 0, 1);
      if (tt < T2.land) {
        const y = BARREL.y - 330 + 330 * f * f;
        c.save(); c.globalAlpha = Math.min(1, (tt - T2.drop) / 0.12); c.translate(bx, y);
        if (k.img('barrel-upturned')) k.asset('barrel-upturned', 0, 0, 108, 130);
        else emptyBarrel(k);
        c.restore();
      } else {
        // landed: it rocks with her inside, then she pokes her head out
        const r = tt - T2.land, rock = Math.sin(r * 22) * 0.08 * Math.max(0, 1 - r / 0.7);
        c.save(); c.translate(bx, BARREL.y); c.rotate(rock);
        if (r > 0.45) k.asset('witch-barrel', 0, 0, 108, 130);
        else if (!k.asset('barrel-upturned', 0, 0, 108, 130)) emptyBarrel(k);
        c.restore();
      }
    }
  }
  // the prince: lunging as he swings the sword, else on foot
  if (w.strikeT > 0) {
    const f = w.strikeT / DUEL.swing;
    if (!(k.img('prince-strike') && drawPerson(k, 'prince-strike', w.x + 10 * f, w.y, H))) {
      c.save(); c.translate(w.x + 14 * f, w.y); c.rotate(0.15 * f); princeOnFoot(k, { ...w, x: 0, y: 0, vx: 0 }, H); c.restore();
      // the enchanted sword's blow
      c.save(); c.globalAlpha = f; c.strokeStyle = k.col('#fff2b0'); c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.arc(w.x + 30, w.y - 80, 70, -1.1, 0.5); c.stroke(); c.restore();
    }
  } else princeOnFoot(k, w, H);
  // her strength left, as three marks over her
  if (!trap) for (let i = 0; i < DUEL.hp; i++) { c.fillStyle = k.col(i < d.hp ? '#b06ad0' : '#3a2a40'); k.circle(d.x - 24 + i * 24, BARREL.y - H - 40, 7); }
  // on touch the buttons are named Leap and Strike, so they need no line
  if (st.phaseT < 7 && !trap && k.inputMode !== 'touch') hint(k, '[A] leaps her fire · [X] strikes with the sword');
}

// Until barrel-upturned (F26) is delivered: the barrel body of witch-barrel
// (its art rows 92-240, below her), turned upside down, its foot on (0, 0).
function emptyBarrel(k) {
  const c = k.c, s = 108 / 200, h = 148 * s;
  c.save(); c.scale(1, -1);
  k.assetCrop('witch-barrel', 0, 92, 200, 148, -54, 0, 108, h);
  c.restore();
}

// Act VI: the witch's barrel on the cliff over the whirlpool.
function barrelScene(k, st, t) {
  const c = k.c, b = st.barrel, w = st.w;
  if (!k.asset('cliff-whirlpool', 640, 720, 1280, 720)) { c.fillStyle = k.col('#1c1630'); c.fillRect(0, 0, 1280, 720); c.fillStyle = k.col('#7a6a5a'); c.fillRect(BARREL.x0, BARREL.y, BARREL.edge - BARREL.x0, 300); }
  // the cloth paints its own whirlpool (centre ~ x 1000, y 610); the cut-out only without it
  if (!k.img('cliff-whirlpool')) { c.save(); c.translate(1040, 640); c.scale(1 + 0.03 * Math.sin(t * 2), 1); k.asset('whirlpool', 0, 60, 420, 136); c.restore(); }
  if (!k.asset('aurora-point', 250, BARREL.y + 6, 150, 212)) { c.fillStyle = k.col('#f4ead2'); k.circle(250, BARREL.y - 120, 16); }
  if (st.duel && w) return duel(k, st, t);
  if (!b || !w) return;
  const fallK = b.fallT == null ? 0 : clamp(b.fallT / FILM_T.barrelFall, 0, 1);
  // the barrel she cowers in, then over the edge
  let x = b.x, y = BARREL.y, rot = b.rot * 0.15;
  if (fallK > 0) { const f = easeInOut(fallK); x = lerp(b.x, 1000, f); y = BARREL.y + f * f * 200; rot = f * 6; }
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = 1 - clamp((fallK - 0.8) / 0.2, 0, 1);
  if (!k.asset('witch-barrel', 0, 0, 108, 130)) { c.fillStyle = k.col('#7a5a3a'); c.fillRect(-40, -110, 80, 110); }
  c.restore();
  // the prince: shoulder to it when pushing, else on foot
  if (st.pushing && w.on && w.knockT <= 0 && k.img('prince-push')) {
    c.save(); c.translate(w.x + 10, w.y); k.asset('prince-push', 0, 0, 140, 172); c.restore();
  } else princeOnFoot(k, w, 140);
  if (fallK > 0) { c.save(); c.globalAlpha = 0.5 * Math.sin(Math.PI * fallK); c.fillStyle = k.col('#eef3ea'); c.fillRect(0, 0, 1280, 720); c.restore(); }
  if (fallK === 0) {   // the cliff edge it must go over
    c.save(); c.globalAlpha = 0.4 + 0.25 * Math.sin(t * 5); c.fillStyle = k.col('#fff2b0');
    c.beginPath(); c.moveTo(BARREL.edge - 14, BARREL.y - 170); c.lineTo(BARREL.edge + 14, BARREL.y - 170); c.lineTo(BARREL.edge, BARREL.y - 148); c.closePath(); c.fill();
    c.fillRect(BARREL.edge - 2, BARREL.y - 140, 4, 140); c.restore();
  }
  if (fallK === 0) hint(k, 'She hides in her barrel: walk into it and push it over the edge');
}

// The wedding street: the court lines the way; he walks Azurine to the gate.
const CROWD = [
  ['crew-squire', 250], ['crew-helmsman', 340], ['crew-manatarms', 430], ['crew-bosun', 520],
  ['fairy-ring', 610], ['fairy-crown', 690], ['fairy-gold', 770], ['king-stand', 990], ['queen-stand', 1080],
];
const GUESTS_Y = 622;
function wedding(k, st, t) {
  const c = k.c, w = st.w;
  if (!k.asset('wedding-street', 640, 720, 1280, 720)) { c.fillStyle = k.col('#cfd8e6'); c.fillRect(0, 0, 1280, 720); }
  if (!w) return;
  const crew = Math.min(4, st.sleepersShown || 0);
  CROWD.forEach(([id, x], i) => {
    if (i < 4 && i >= crew) return;   // only the crew he woke
    // on the street's paving (the balustrade's foot is at y 600, behind it),
    // still on the ground except for a cheering hop as he passes
    const near = Math.abs(w.x - x) < 120, hop = near ? Math.abs(Math.sin(t * 8 + i)) * 10 : 0;
    c.save(); c.translate(x, GUESTS_Y - hop); if (x > WEDDING.gate) c.scale(-1, 1);
    k.idle(id, t + i, 0, 0, 82, 150);
    c.restore();
  });
  // the gate glows
  c.save(); c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3); c.fillStyle = k.col('#fff2b0'); c.beginPath(); c.ellipse(WEDDING.gate, 560, 70, 110, 0, 0, Math.PI * 2); c.fill(); c.restore();
  azurineOnFoot(k, st.az, WEDDING.y, 160);
  princeOnFoot(k, w, 160);
  for (const p of st.petals) if (!p.got && p.y > -20) { c.fillStyle = k.col('#f3c6dc'); c.save(); c.translate(p.x, p.y); c.rotate(p.y * 0.05); c.beginPath(); c.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  if (st.phaseT < 6) hint(k, 'Walk Azurine to the castle gate · catch the petals');
  else if (st.petalsGot) { c.save(); c.textAlign = 'left'; c.font = '700 16px "Josefin Sans", sans-serif'; c.fillStyle = k.col('#f3c6dc'); c.fillText(`Petals ${st.petalsGot}`, 160, 110); c.restore(); }
}

// The apotheosis: walk together into the light beneath Aurora, and rise.
function apotheosis(k, st, t) {
  const c = k.c, w = st.w, rise = st.riseT == null ? 0 : easeInOut(clamp(st.riseT / FILM_T.rise, 0, 1));
  if (!k.asset('apotheosis', 640, 720, 1280, 720)) { c.fillStyle = k.col('#f4e6c8'); c.fillRect(0, 0, 1280, 720); }
  // the pillar of light at the centre
  const g = c.createLinearGradient(APOTH.mark - 90, 0, APOTH.mark + 90, 0);
  g.addColorStop(0, 'rgba(255,246,208,0)'); g.addColorStop(0.5, `rgba(255,246,208,${0.35 + 0.15 * Math.sin(t * 3) + rise * 0.4})`); g.addColorStop(1, 'rgba(255,246,208,0)');
  c.fillStyle = g; c.fillRect(APOTH.mark - 90, 0, 180, APOTH.y + 10);
  for (const [id, x, y, h] of [['fairy-ring', 300, 560, 180], ['fairy-crown', 420, 520, 170], ['fairy-gold', 860, 520, 170], ['water-fairy-stand', 980, 560, 180]]) {
    c.save(); c.translate(x, y); k.idle(id, t + x, 0, 0, h * 0.55, h); c.restore();
  }
  c.save(); c.translate(APOTH.mark, 330 - 30 * rise); k.idle('aurora-stand', t, 0, 0, 110, 180); c.restore();
  if (!w) return;
  c.save(); c.translate(0, -rise * 140);
  azurineOnFoot(k, st.az, APOTH.y, 166);
  princeOnFoot(k, w, 166);
  c.restore();
  if (st.riseT == null && st.phaseT < 7) hint(k, 'Walk with Azurine into the light beneath Aurora');
  if (rise > 0) card(k, 'The Kingdom of the Fairies', 'The end', clamp(st.riseT - 1, 0, 1));
}

export { T, easeOut };

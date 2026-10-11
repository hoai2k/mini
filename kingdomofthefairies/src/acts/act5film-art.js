// Drawing for the film edition's Act V and Act VI (act5film.js). The climbs,
// the burning interior's floors, connectors and hazards, and the carry reuse
// Act V's drawing (act5-art.js); the sea gap, the tower wall, the tower's
// stone interior, the clifftop and the tableaux are new. Every requested
// piece of art has a stand-in. Draw only from state and t.
import { SWIM, TOWER_TOP, FILM_T, BARREL } from './act5film.js';
import { HOUSE, QUAY, T } from './act5.js';
import {
  onEvent as act5Event, cliffScene, holds, climbGuide, climber, rocksWorld, rockWarnings,
  connector, flames, hazards, player, rubble, beloved,
} from './act5-art.js';
import { tableau, card, cardAlpha } from './tableau.js';
import { clamp, lerp, easeOut, easeInOut, beatPhase } from './shared.js';
import { richText } from '../art.js';   // headless-safe: art.js touches no DOM at load

// ================================================================= Act V
export function drawTower(k, st, t) {
  const ph = st.phase;
  if (ph === 'cliff') return cliffScene(k, st, t);
  if (ph === 'dive') {
    tableau(k, 'cliff-gap', st.phaseT, FILM_T.dive, { focus: [520, 300] });
    return card(k, 'The Sea Gap', 'He dives for the witch’s tower', cardAlpha(st.phaseT, FILM_T.dive));
  }
  if (ph === 'swim') return swimScene(k, st, t);
  if (ph === 'tower') return towerScene(k, st, t);
  const pt = ph === 'window' ? st.phaseT : FILM_T.window + st.phaseT;
  tableau(k, 'tower-climb', pt, FILM_T.window + FILM_T.iris, { focus: [1000, 220], fadeOut: 0.01 });
  card(k, 'Her Window', 'Azurine is held inside', cardAlpha(pt, FILM_T.window + 9));
}

export function drawOverTower(k, st) {
  if (st.defeatT != null) k.wash('#2a1424', 0.55 * clamp(st.defeatT / FILM_T.defeat, 0, 1));
  if (st.phase === 'iris') k.iris(1000, 220, 760 * (1 - easeInOut(st.phaseT / FILM_T.iris)));
  if (st.status === 'won') k.iris(1000, 220, 0);
}

export function onEventTower(k, e, st) {
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
const SURFACE = 470;
const swimY = (st) => SURFACE + (st.sw?.dive > 0 ? 70 * Math.sin(Math.PI * clamp(1 - st.sw.dive / SWIM.dive, 0, 1)) + 20 : 0);
const swoopScreenX = (st) => (st.sw?.swoop ? 420 + (st.sw.swoop.x - st.sw.x) : -999);

function swimScene(k, st, t) {
  const c = k.c, sw = st.sw, f = sw.x / SWIM.len;
  // night sky, moon, the cliff behind at the left and the tower ahead at the right
  const g = c.createLinearGradient(0, 0, 0, SURFACE);
  g.addColorStop(0, k.col('#1c1630')); g.addColorStop(1, k.col('#3d3a5c'));
  c.fillStyle = g; c.fillRect(0, 0, 1280, SURFACE + 10);
  k.moon(980, 120, 38);
  const cliffX = 260 - f * 520;
  const rock = [[-400, 470], [-400, 96], [-60, 104], [10, 132], [40, 120], [70, 168], [96, 210], [88, 260], [120, 300], [130, 360], [158, 420], [170, 470]];
  c.fillStyle = k.col('#241c2a'); c.beginPath(); for (const [dx, y] of rock) c.lineTo(cliffX + dx, y); c.closePath(); c.fill();
  c.strokeStyle = k.col('#8c7f9a'); c.lineWidth = 2; c.globalAlpha = 0.6;  // moonlight on its edge
  c.beginPath(); for (const [dx, y] of rock.slice(2, -1)) c.lineTo(cliffX + dx, y); c.stroke(); c.globalAlpha = 1;
  c.fillStyle = k.col('#3f5a34'); c.fillRect(cliffX - 400, 92, 440, 8);  // the grass at its top
  towerSilhouette(k, 1180 - f * 380, SURFACE, 0.55 + 0.75 * f, t);
  // the sea: rolling wave rows
  c.fillStyle = k.col('#1d3b44'); c.fillRect(0, SURFACE, 1280, 720 - SURFACE);
  for (let r = 0; r < 3; r++) k.waves(r, sw.x * (0.6 + r * 0.25) + t * 30);
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
  // the prince, swimming at the surface or diving under it
  const y = swimY(st);
  c.save();
  if (st.inv > 0 && Math.floor(st.inv * 10) % 2) c.globalAlpha = 0.45;
  if (sw.dive > 0) c.globalAlpha *= 0.65;
  const stroke = Math.floor(sw.stroke * 4) % 2 ? 'sailor-swim-a' : 'sailor-swim-b';
  if (!k.asset(stroke, 420, y + 40, 150, 100)) { c.fillStyle = k.col('#2b3550'); c.fillRect(380, y - 12, 80, 22); }
  c.restore();
  // a water line over him while he is under
  if (sw.dive > 0) { c.save(); c.globalAlpha = 0.5; c.fillStyle = k.col('#1d3b44'); c.fillRect(330, SURFACE + 8, 190, y - SURFACE + 30); c.restore(); }
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
  if (!k.asset('tower-window', 640, -TOWER_TOP + 10, 100, 130)) {
    c.fillStyle = k.col('#e9c46a'); c.globalAlpha = 0.7 + 0.25 * Math.sin(t * 3);
    c.beginPath(); c.moveTo(600, -TOWER_TOP + 6); c.lineTo(600, -TOWER_TOP - 70); c.arc(640, -TOWER_TOP - 70, 40, Math.PI, 0); c.lineTo(680, -TOWER_TOP + 6); c.closePath(); c.fill();
    c.globalAlpha = 1; c.fillStyle = k.col('#2a2430');
    for (const x of [616, 640, 664]) c.fillRect(x - 2, -TOWER_TOP - 100, 4, 106);
  }
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
  if (ph === 'wedding') {
    tableau(k, 'wedding', st.phaseT, FILM_T.wedding, { focus: [640, 380] });
    const n = st.sleepersShown;
    return card(k, 'The Wedding', n ? `${n} of the crew you woke march in the procession` : 'Home to the court', cardAlpha(st.phaseT, FILM_T.wedding));
  }
  const pt = ph === 'apotheosis' ? st.phaseT : FILM_T.apotheosis + st.phaseT;
  tableau(k, 'apotheosis', pt, FILM_T.apotheosis + FILM_T.iris, { focus: [640, 300], zoom: 0.1, fadeOut: 0.01 });
  card(k, 'The Kingdom of the Fairies', 'The end', cardAlpha(pt, FILM_T.apotheosis + 9, 1.2));
}

export function drawOverBurning(k, st) {
  if (st.defeatT != null) k.wash('#2a1424', 0.55 * clamp(st.defeatT / FILM_T.defeat, 0, 1));
  if (st.phase === 'iris') k.iris(640, 300, 760 * (1 - easeInOut(st.phaseT / FILM_T.iris)));
  if (st.status === 'won') k.iris(640, 300, 0);
}

export function onEventBurning(k, e, st) {
  if (e.type === 'barrelPush') { k.burst(760, 420, '#b98a5e', 12, 'chip'); k.text(`${e.n} / ${BARREL.pushes}`, 760, 330); return; }
  if (e.type === 'barrelFall') { k.flash(0.5); k.shake(0.6); k.burst(1000, 600, '#eef3ea', 40, 'drop'); k.text('Into the whirlpool!', 640, 240, true); return; }
  if (e.type === 'offBeat') { k.text('on the beat…', 640, 470); return; }
  if (e.type === 'witchReturns') { k.flash(0.4); return; }
  if (e.type === 'shutterSmash') { k.burst(HOUSE.shutterX, HOUSE.shutterY, '#fff2b0', 22, 'sparkle'); k.text("Aurora's lamp!", HOUSE.shutterX, HOUSE.shutterY - 90, true); return; }
  if (e.type === 'stoneThrow') { k.text("Aurora's lamp!", st.p.x, st.p.y - 130); return; }
  act5Event(k, e, st);
}

// The tower cut open like a dollhouse, on the house's floors: the delivered
// tower-interior cloth, or the fire tableau darkened behind stone floors.
const TOWER_ART = [640, 654, 518, 666];  // as Act V's house art
function towerInterior(k, st, t) {
  const c = k.c, H = HOUSE;
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
  if (!painted) {
    H.floors.forEach((fy, f) => {
      for (const [a, b] of st.spans[f]) {
        c.fillStyle = k.col('#6d6872'); c.fillRect(a, fy, b - a, 14);
        c.fillStyle = k.col('#8c8792'); c.fillRect(a, fy, b - a, 3);
      }
      if (f > 0) for (let gi = 0; gi < st.spans[f].length - 1; gi++) {
        const gx0 = st.spans[f][gi][1], gx1 = st.spans[f][gi + 1][0];
        c.fillStyle = k.col('#e9a46a'); c.globalAlpha = 0.5 + 0.25 * Math.sin(t * 7 + f);
        c.beginPath(); c.ellipse((gx0 + gx1) / 2, fy + 8, (gx1 - gx0) / 2 + 6, 12, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      }
    });
  }
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
}

// Out across the clifftop with her, the tower falling behind.
function clifftop(k, st, t) {
  const c = k.c;
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

// The witch's last attack: the tableau, and the barrel rolled on the beat.
function barrelScene(k, st, t) {
  const c = k.c, b = st.barrel;
  const fallK = b.fallT == null ? 0 : clamp(b.fallT / FILM_T.barrelFall, 0, 1);
  tableau(k, 'barrel', st.phaseT, 30, { focus: [760, 420], zoom: 0.05 + 0.08 * fallK, fadeOut: 0.01 });
  if (b.fallT != null) {
    c.save(); c.globalAlpha = 0.5 * Math.sin(Math.PI * fallK); c.fillStyle = k.col('#eef3ea'); c.fillRect(0, 0, 1280, 720); c.restore();
    return card(k, 'Into the Whirlpool', 'The witch is gone', clamp(fallK * 3, 0, 1));
  }
  // pushes so far, and a ring that closes on each beat
  for (let i = 0; i < BARREL.pushes; i++) {
    c.save(); c.globalAlpha = 0.9; c.fillStyle = k.col('#2a1424'); k.circle(600 + i * 80, 470, 22);
    c.fillStyle = k.col(i < b.pushes ? '#d9b34a' : '#5e5446'); k.circle(600 + i * 80, 470, 15); c.restore();
  }
  const p = beatPhase(st.beat), r = 22 + 24 * (1 - p);
  c.save(); c.globalAlpha = 0.25 + 0.6 * (1 - p); c.strokeStyle = k.col('#f1d27a'); c.lineWidth = 4;
  c.beginPath(); c.arc(600 + Math.min(b.pushes, BARREL.pushes - 1) * 80, 470, r, 0, Math.PI * 2); c.stroke(); c.restore();
  card(k, "The Witch's Last Attack", ' ', 1);
  c.save(); c.textAlign = 'center'; c.fillStyle = k.col('#f3c6dc'); c.font = '700 14px "Josefin Sans", sans-serif';
  richText(c, 'PRESS [A] ON THE BEAT TO ROLL HER BARREL OVER THE CLIFF', 640, 636, { px: 14, mode: k.inputMode || 'key', col: k.col });
  c.restore();
}

export { T, easeOut };

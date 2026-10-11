// Prologue drawing: the delivered sets (betrothal-court, rampart-strip,
// armoury) and the cast's cut-outs, staged as a toy theatre. Draw only from
// state and t.
import { FLOOR, FAIRIES, AZURINE_X, RAMPART, ARMS, T, GIFTS, sceneOf } from './prologue.js';
import { card } from './tableau.js';
import { clamp, easeOut, easeInOut } from './shared.js';
import { richText } from '../art.js';   // headless-safe: art.js touches no DOM at load

const FIG = { w: 132, h: 252 };          // a standing figure (220 x 420 art)
const PRINCE = { w: 137, h: 225 };        // the prince (220 x 360 art)
const camX = (st) => (sceneOf(st.phase) === 1 ? clamp(st.p.x - 420, 0, RAMPART.w - 1280) : 0);
const CAPTIONS = {
  court: ['The Betrothal', 'Receive the fairies’ gifts for Princess Azurine'],
  curse: ['The Uninvited', 'The witch curses the betrothal'],
  rampart: ['The Abduction', 'Her demons carry Azurine off · run after the chariot'],
  escape: ['The Abduction', 'The chariot is gone into the night'],
  bind: ['The Armoury', 'The witch binds the prince'],
  free: ['The Arming', 'Aurora breaks the spell'],
  armoury: ['The Arming', 'Take up your helmet, shield and the enchanted sword'],
  knighted: ['The Arming', 'Out of the door at the right: to the sea'],
};

export function draw(k, st, t) {
  const sc = sceneOf(st.phase);
  if (sc === 0) courtScene(k, st, t);
  else if (sc === 1) rampartScene(k, st, t);
  else armouryScene(k, st, t);
  if (st.near) prompt(k, st, st.near);
  const cap = CAPTIONS[st.phase];
  if (cap) card(k, cap[0], cap[1], Math.min(1, clamp((st.phaseT - 0.3) / 0.5, 0, 1), st.phase === 'court' || st.phase === 'rampart' || st.phase === 'armoury' ? clamp((4.5 - st.phaseT) / 0.6, 0, 1) : 1));
  skipHint(k, st);
  if (st.fade > 0) k.wash('#000000', st.fade);
}

export function drawOver(k, st) {
  if (st.phase === 'iris') k.iris(1180, 460, 820 * (1 - easeInOut(st.phaseT / T.iris)));
  if (st.status === 'won') k.iris(1180, 460, 0);
}

export function onEvent(k, e, st) {
  const cx = st ? camX(st) : 0;
  if (e.type === 'gift') { k.burst(e.x, FLOOR - 180, '#fff2b0', 22, 'sparkle'); k.text(e.gift === 'gold' ? 'Gold!' : `The ${e.gift}!`, e.x, FLOOR - 270); }
  if (e.type === 'betrothed') { k.flash(0.4); k.burst(AZURINE_X - 40, FLOOR - 170, '#f3c6dc', 30, 'sparkle'); }
  if (e.type === 'scene' && e.phase === 'curse') { k.flash(0.6); k.shake(0.4); k.burst(220, FLOOR - 150, '#5f3a6a', 30, 'smoke'); }
  if (e.type === 'fireLand') k.burst(e.x - cx, RAMPART.y - 10, '#e9a46a', 14, 'streak');
  if (e.type === 'scorched') { k.flash(0.2); k.burst(e.x - cx, RAMPART.y - 60, '#c8321e', 10, 'streak'); }
  if (e.type === 'scene' && e.phase === 'free') { k.flash(0.5); k.burst(st?.p.x ?? 420, FLOOR - 120, '#fff2b0', 34, 'sparkle'); }
  if (e.type === 'arm') { k.burst(e.x, FLOOR - 90, '#fff2b0', 20, 'sparkle'); }
  if (e.type === 'knighted') { k.flash(0.6); k.burst(st?.p.x ?? 900, FLOOR - 120, '#fff2b0', 40, 'sparkle'); }
}

// ---------------------------------------------------------------- the court
function courtScene(k, st, t) {
  const c = k.c;
  if (!k.asset('betrothal-court', 640, 720, 1280, 720)) { c.fillStyle = k.col('#3a2240'); c.fillRect(0, 0, 1280, 720); }
  // the king and queen before their thrones on the dais
  figure(k, 'king-stand', 560, 412, t, 0.82, 1);
  figure(k, 'queen-stand', 722, 412, t + 1, 0.82, -1);
  // the fairies in a line, each holding her gift until she gives it
  for (const f of FAIRIES) {
    const given = st.gifts.includes(f.gift);
    figure(k, f.id, f.x, FLOOR + 6, t + f.x, 1, f.id === 'aurora-stand' ? -1 : 1);
    if (!given) gift(k, f.gift, f.x - 34, FLOOR - 120, 0.8 + 0.1 * Math.sin(t * 3 + f.x));
  }
  figure(k, 'azurine-stand', AZURINE_X, FLOOR + 4, t + 3, 1, 1);
  // the gifts laid at her feet; the witch's curse withers the flower
  const wither = st.phase === 'curse' ? clamp((st.phaseT - 1.6) / 1.2, 0, 1) : 0;
  st.gifts.forEach((g, i) => {
    c.save(); if (g === 'flower' && wither) { c.globalAlpha = 1 - 0.6 * wither; }
    gift(k, g, AZURINE_X - 120 + i * 42, FLOOR + 4, 0.55);
    c.restore();
  });
  if (st.phase === 'curse') curse(k, st, t);
  prince(k, st, t);
}

function curse(k, st, t) {
  const c = k.c, a = clamp(st.phaseT / 0.6, 0, 1);
  k.wash('#2a1030', 0.35 * a);
  c.save(); c.globalAlpha = a;
  figure(k, 'witch-hooded', 210, FLOOR + 6, t, 1, -1);
  c.restore();
  // her curse, a ribbon of violet smoke to the princess
  if (st.phaseT > 0.8 && st.phaseT < T.curse - 0.4) {
    c.save(); c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 12); c.strokeStyle = k.col('#b06ad0'); c.lineWidth = 6;
    c.beginPath(); c.moveTo(250, FLOOR - 170);
    for (let i = 1; i <= 20; i++) { const f = i / 20; c.lineTo(250 + (AZURINE_X - 290) * f, FLOOR - 170 - Math.sin(f * Math.PI) * 120 + Math.sin(t * 9 + f * 12) * 10); }
    c.stroke(); c.restore();
  }
}

// ---------------------------------------------------------------- the rampart
function rampartScene(k, st, t) {
  const c = k.c, cx = camX(st), ch = st.chariot;
  if (!k.asset('rampart-strip', RAMPART.w / 2 - cx, 720, RAMPART.w, 720)) {
    c.fillStyle = k.col('#1c1630'); c.fillRect(0, 0, 1280, 720);
    c.fillStyle = k.col('#8a7a6a'); c.fillRect(0, RAMPART.y, 1280, 120);
  }
  // fire falling from the chariot, then burning on the parapet
  for (const f of st.fires) {
    const x = f.x - cx;
    if (!f.lit) { c.fillStyle = k.col('#ffcf7a'); k.circle(x, f.y, 9); c.fillStyle = k.col('#e9693a'); k.circle(x, f.y - 8, 6); continue; }
    const a = 1 - clamp((f.burn - (RAMPART.burn - 0.4)) / 0.4, 0, 1);
    flame(k, x, RAMPART.y + 4, 0.75 * a, t + f.x);
  }
  // the chariot of fire, with her demons and Azurine asleep
  const up = st.phase === 'escape' ? easeOut(Math.min(1, ch.up / 2)) : 0;
  chariot(k, ch.x - cx + up * 300, ch.y - up * 420, t);
  prince(k, st, t, cx);
}

function chariot(k, x, y, t) {
  const c = k.c;
  c.save(); c.translate(x, y);
  c.rotate(Math.sin(t * 1.3) * 0.04);
  figure(k, 'demon-teal', -60, 10, t, 0.55, 1);
  if (!k.asset('azurine-asleep', 10, 0, 140, 62)) { c.fillStyle = k.col('#c9d8ee'); c.fillRect(-40, -24, 100, 24); }
  if (!k.asset('chariot', 0, 80, 300, 160)) {
    c.fillStyle = k.col('#7a2a1a'); c.beginPath(); c.ellipse(0, 40, 140, 40, 0, 0, Math.PI * 2); c.fill();
    flame(k, -100, 40, 0.8, t);
  }
  figure(k, 'demon-red', 80, 10, t + 1, 0.55, 1);
  c.restore();
}

// ---------------------------------------------------------------- the armoury
function armouryScene(k, st, t) {
  const c = k.c;
  if (!k.asset('armoury', 640, 720, 1280, 720)) { c.fillStyle = k.col('#30283a'); c.fillRect(0, 0, 1280, 720); }
  // the arms on their stands
  for (const a of ARMS) {
    if (st.arms.includes(a.id)) continue;
    c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3 + a.x); c.fillStyle = k.col('#fff2b0'); k.circle(a.x, FLOOR - 70, 50); c.restore();
    arm(k, a.id, a.x, FLOOR - 24, t);
  }
  const ph = st.phase;
  if (ph === 'bind') {
    const a = clamp(st.phaseT / 0.5, 0, 1);
    c.save(); c.globalAlpha = a; figure(k, 'witch-cloud', 820, FLOOR + 30, t, 0.9, 1); c.restore();
  }
  if (ph === 'free' || ph === 'armoury' || ph === 'knighted' || ph === 'iris') {
    const a = ph === 'free' ? clamp(st.phaseT / 0.6, 0, 1) : 1;
    c.save(); c.globalAlpha = a; figure(k, ph === 'free' ? 'aurora-point' : 'aurora-stand', 200, FLOOR + 6, t, 1, -1); c.restore();
  }
  prince(k, st, t);
  // the witch's cords about him until Aurora breaks them
  if (ph === 'bind' || (ph === 'free' && st.phaseT < 0.9)) cords(k, st, t, ph === 'free' ? 1 - st.phaseT / 0.9 : clamp((st.phaseT - 0.4) / 0.4, 0, 1));
}

function cords(k, st, t, a) {
  if (a <= 0 || k.img('prince-bound')) return;
  const c = k.c, p = st.p;
  c.save(); c.globalAlpha = a; c.strokeStyle = k.col('#5fd0c0'); c.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const y = p.y - 70 - i * 30 + Math.sin(t * 6 + i) * 3;
    c.beginPath(); c.ellipse(p.x, y, 40, 10, 0.1 * Math.sin(t * 3 + i), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- the cast
// A standing cut-out with the film idle, feet at (x, by); `face` -1 mirrors.
function figure(k, id, x, by, t, s = 1, face = 1) {
  const c = k.c;
  c.save(); c.translate(x, by); c.scale(face, 1);
  if (!k.idle(id, t, 0, 0, FIG.w * s, FIG.h * s)) { c.fillStyle = k.col('#b88aa8'); c.fillRect(-18 * s, -FIG.h * s * 0.8, 36 * s, FIG.h * s * 0.8); }
  c.restore();
}

// The prince: in court dress until he takes up his arms, then in armour.
function prince(k, st, t, cx = 0) {
  const c = k.c, p = st.p, armed = st.arms.length === ARMS.length && sceneOf(st.phase) === 2;
  const moving = Math.abs(p.vx) > 20, step = Math.floor(p.walk / 34) % 2;
  if (p.knockT > 0 && Math.floor(t * 16) % 2) c.globalAlpha = 0.5;
  c.save(); c.translate(p.x - cx, p.y); c.scale(p.face, 1);
  let id;
  if (st.phase === 'bind' && k.img('prince-bound')) id = 'prince-bound';
  else if (armed) id = !p.on ? 'prince-leap' : moving ? (step ? 'prince-walk-a' : 'prince-walk-b') : 'prince-stand';
  else id = moving && k.img('prince-court-walk-a') ? (step ? 'prince-court-walk-a' : 'prince-court-walk-b') : 'prince-court';
  // without walk frames, the court-dress still rocks as a puppet on its slide
  const bob = moving && id === 'prince-court' ? Math.abs(Math.sin(p.walk / 22)) * 6 : 0;
  const tip = moving && id === 'prince-court' ? Math.sin(p.walk / 22) * 0.05 : !p.on ? -0.12 : 0;
  c.rotate(tip);
  if (!k.asset(id, 0, -bob, PRINCE.w, PRINCE.h)) { c.fillStyle = k.col('#6a2a5a'); c.fillRect(-20, -200, 40, 200); }
  c.restore();
  c.globalAlpha = 1;
}

function gift(k, g, x, by, s) {
  const c = k.c;
  if (k.asset('gift-' + g, x, by, 96 * s, 96 * s)) return;
  c.fillStyle = k.col('#d9b34a'); k.circle(x, by - 30 * s, 20 * s);
}

function arm(k, id, x, by, t) {
  const c = k.c;
  if (id === 'sword') { c.save(); c.translate(x, by); c.rotate(-0.15); k.asset('keepsake-sword', 0, 0, 90, 90) || (c.fillStyle = k.col('#d8dde6'), c.fillRect(-4, -90, 8, 90)); c.restore(); return; }
  if (k.asset('armour-' + id, x, by, 84, 84)) return;
  if (id === 'helmet') { c.fillStyle = k.col('#c8ccd4'); c.beginPath(); c.arc(x, by - 26, 26, Math.PI, 0); c.fill(); c.fillRect(x - 26, by - 26, 52, 20); c.fillStyle = k.col('#e0127a'); c.beginPath(); c.ellipse(x - 8, by - 62, 10, 22, -0.5, 0, Math.PI * 2); c.fill(); }
  else { c.fillStyle = k.col('#6f9fc8'); k.circle(x, by - 40, 36); c.fillStyle = k.col('#d9b34a'); k.circle(x, by - 40, 12); }
}

function flame(k, x, by, s, t) {
  const c = k.c;
  if (s <= 0) return;
  for (const [col, w, h] of [['#c8321e', 30, 70], ['#e9693a', 22, 52], ['#ffcf7a', 12, 32]]) {
    c.fillStyle = k.col(col); c.beginPath();
    c.moveTo(x - w * s, by); c.quadraticCurveTo(x - w * s * 0.6, by - h * s * 0.6, x + Math.sin(t * 9) * 4 * s, by - h * s * (0.9 + 0.1 * Math.sin(t * 13)));
    c.quadraticCurveTo(x + w * s * 0.6, by - h * s * 0.6, x + w * s, by); c.fill();
  }
}

// "[A] Receive the ring" over what he stands beside.
function prompt(k, st, near) {
  const c = k.c, x = near.at - camX(st), y = FLOOR - 290;
  c.save(); c.font = '700 15px "Josefin Sans", sans-serif'; c.textAlign = 'center';
  const w = c.measureText(near.label).width + 60;
  c.globalAlpha = 0.88; c.fillStyle = k.col('#2a1424'); c.beginPath(); c.roundRect(x - w / 2, y - 20, w, 30, 15); c.fill();
  c.globalAlpha = 1; c.fillStyle = k.col('#f3c6dc');
  richText(c, '[A] ' + near.label.toUpperCase(), x, y + 1, { px: 15, mode: k.inputMode || 'key', col: k.col });
  c.restore();
}

function skipHint(k, st) {
  const c = k.c;
  c.save(); c.globalAlpha = 0.7; c.textAlign = 'right'; c.fillStyle = k.col('#f3c6dc');
  c.font = '700 13px "Josefin Sans", sans-serif';
  richText(c, '[B] SKIP SCENE', 1150, 92, { px: 13, mode: k.inputMode || 'key', col: k.col });
  c.restore();
}

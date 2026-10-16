import { walkPose } from '../walking.js';
// Prologue drawing: the delivered sets (betrothal-court, rampart-strip,
// armoury) and the cast's cut-outs, staged as a toy theatre. Draw only from
// state and t.
import { FLOOR, ARM_FLOOR, FAIRIES, AZURINE_X, RAMPART, rampartFloor, ARMS, T, GIFTS, sceneOf } from './prologue.js';
import { card } from './tableau.js';
import { clamp, easeOut, easeInOut } from './shared.js';
import { richText } from '../art.js';   // headless-safe: art.js touches no DOM at load
import { drawPose } from '../pose.js';

const FIG = { w: 132, h: 252 };          // a standing figure (220 x 420 art)
// Where each fairy holds her gift in her 220 x 420 art (measured from the
// delivered fairy-*-empty art): centre x, bottom y, width, art px.
const GIFT_IN_HAND = {
  'fairy-ring': [27, 58, 30], 'fairy-ring-tinted': [28, 50, 30],
  'fairy-crown': [50, 116, 82], 'fairy-crown-tinted': [42, 130, 78],
  'fairy-gold': [34, 105, 58], 'fairy-gold-tinted': [27, 118, 56],
};
const PRINCE = { w: 137, h: 225 };
// A present held up to the audience as he takes it: it rises from where it
// was to the middle of the stage, grows, holds, then settles where it goes.
const SHOW = { rise: 0.45, hold: 1.25, settle: 1.75, x: 640, y: 330, size: 250 };
const shown = [];                         // { st, kind: 'gift'|'arm', id, x, by, size, t0, slot }
const giftAt = {};                        // where each held gift was last drawn, stage px
const LABELS = { gold: 'Gold!', flower: 'The flower!', ring: 'The ring!', crown: 'The crown!', helmet: 'The helmet!', shield: 'The shield!', sword: 'The enchanted sword!' };        // the prince (220 x 360 art)
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
  if (e.type === 'gift') {
    // a fairy whose art holds the gift vanishes as she gives it (see court)
    const f = FAIRIES.find((q) => q.gift === e.gift);
    if (f && f.gift !== 'flower' && k.img(f.id) && !k.img(f.id + '-empty')) { k.flash(0.25); k.burst(e.x, FLOOR - 130, '#f4ead2', 28, 'smoke'); }
  }
  if (e.type === 'gift' && st) {
    // sparkle from the gift itself, where it was in her hands
    const f = FAIRIES.find((q) => q.gift === e.gift);
    const at = giftAt[e.gift] ?? { x: f ? f.x + f.hand : e.x, by: FLOOR - 120, size: 77 };
    k.burst(at.x, at.by - at.size / 2, '#fff2b0', 22, 'sparkle');
    show(st, 'gift', e.gift, at, e.t ?? st.t, (e.n ?? st.gifts.length) - 1);
  }
  if (e.type === 'betrothed') { k.flash(0.4); k.burst(AZURINE_X - 40, FLOOR - 170, '#f3c6dc', 30, 'sparkle'); }
  if (e.type === 'scene' && e.phase === 'curse') { k.flash(0.6); k.shake(0.4); k.burst(220, FLOOR - 150, '#5f3a6a', 30, 'smoke'); }
  if (e.type === 'fireLand') k.burst(e.x - cx, rampartFloor(e.x) - 10, '#e9a46a', 14, 'streak');
  if (e.type === 'scorched') { k.flash(0.2); k.burst(e.x - cx, rampartFloor(e.x) - 60, '#c8321e', 10, 'streak'); }
  if (e.type === 'scene' && e.phase === 'free') { k.flash(0.5); k.burst(st?.p.x ?? 420, ARM_FLOOR - 120, '#fff2b0', 34, 'sparkle'); }
  if (e.type === 'arm' && st) {
    const size = e.arm === 'sword' ? 90 : 84;
    k.burst(e.x, ARM_FLOOR + 2 - size / 2, '#fff2b0', 20, 'sparkle');
    show(st, 'arm', e.arm, { x: e.x, by: ARM_FLOOR + 2, size }, e.t ?? st.t, -1);
  }
  if (e.type === 'knighted') { k.flash(0.6); k.burst(st?.p.x ?? 900, ARM_FLOOR - 120, '#fff2b0', 40, 'sparkle'); }
}

// ---------------------------------------------------------------- the court
function courtScene(k, st, t) {
  const c = k.c;
  if (!k.asset('betrothal-court', 640, 720, 1280, 720)) { c.fillStyle = k.col('#3a2240'); c.fillRect(0, 0, 1280, 720); }
  // the king and queen before their thrones on the dais
  figure(k, 'king-stand', 560, 412, t, 0.82, 1);
  figure(k, 'queen-stand', 722, 412, t + 1, 0.82, -1);
  // the fairies in a line, each holding her gift until she gives it; the
  // gifts are drawn after the prince, so he reaches behind what he takes
  const held = [];
  for (const f of FAIRIES) {
    const given = st.gifts.includes(f.gift);
    if (f.gift === 'flower' || !k.img(f.id)) {
      // Aurora (her flower is drawn in her hand), or a fairy not yet delivered
      figure(k, f.id, f.x, FLOOR + 6, t + f.x, 1, f.id === 'aurora-stand' ? -1 : 1);
      if (!given) held.push(() => {
        const s = 0.8 + 0.1 * Math.sin(t * 3 + f.x);
        giftAt[f.gift] = { x: f.x + f.hand, by: FLOOR - 120, size: 96 * s };
        gift(k, f.gift, f.x + f.hand, FLOOR - 120, s);
      });
    } else if (k.img(f.id + '-empty')) {
      // empty-handed art (F15): the game puts her gift in her hands until she
      // gives it, in the same sway as her figure
      figure(k, f.id + '-empty', f.x, FLOOR + 6, t + f.x, 1, 1);
      if (!given) held.push(() => figure(k, f.id + '-empty', f.x, FLOOR + 6, t + f.x, 1, 1, (c, s, im) => {
        const [hx, hb, hw] = GIFT_IN_HAND[f.id + (/-tinted\./.test(im.src) ? '-tinted' : '')];
        const gx = (hx - (im.naturalWidth || im.width) / 2) * s, gb = (hb - (im.naturalHeight || im.height)) * s;
        const m = c.getTransform?.();
        if (m) giftAt[f.gift] = { x: m.a * gx + m.c * gb + m.e, by: m.b * gx + m.d * gb + m.f, size: hw * s * Math.abs(m.a) };
        gift(k, f.gift, gx, gb, (hw * s) / 96);
      }, true));
    } else if (!given) figure(k, f.id, f.x, FLOOR + 6, t + f.x, 1, 1);
    // Until then her art holds the gift itself, so once she has given it she
    // vanishes in a burst of sparkle, a stop trick, rather than keep it.
  }
  figure(k, 'azurine-stand', AZURINE_X, FLOOR + 4, t + 3, 1, 1);
  // the gifts laid at her feet; the witch's curse withers the flower
  const wither = st.phase === 'curse' ? clamp((st.phaseT - 1.6) / 1.2, 0, 1) : 0;
  st.gifts.forEach((g, i) => {
    if (showing(st, g)) return;
    c.save(); if (g === 'flower' && wither) { c.globalAlpha = 1 - 0.6 * wither; }
    gift(k, g, AZURINE_X - 120 + i * 42, FLOOR + 4, 0.55);
    c.restore();
  });
  if (st.phase === 'curse') curse(k, st, t);
  prince(k, st, t);
  for (const draw of held) draw();
  drawShown(k, st, t);
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
    flame(k, x, rampartFloor(f.x) + 4, 0.75, t + f.x);   // it burns on
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
  const ph = st.phase;
  if (ph === 'bind') {
    const a = clamp(st.phaseT / 0.5, 0, 1);
    c.save(); c.globalAlpha = a; figure(k, 'witch-cloud', 820, ARM_FLOOR + 30, t, 0.9, 1); c.restore();
  }
  if (ph === 'free' || ph === 'armoury' || ph === 'knighted' || ph === 'iris') {
    const a = ph === 'free' ? clamp(st.phaseT / 0.6, 0, 1) : 1;
    c.save(); c.globalAlpha = a; figure(k, ph === 'free' ? 'aurora-point' : 'aurora-stand', 200, ARM_FLOOR + 4, t, 1, -1); c.restore();
  }
  prince(k, st, t);
  // the arms on the flagstones, in front of him as he comes to take them
  for (const a of ARMS) {
    if (st.arms.includes(a.id)) continue;
    c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3 + a.x); c.fillStyle = k.col('#fff2b0'); k.circle(a.x, ARM_FLOOR - 40, 46); c.restore();
    arm(k, a.id, a.x, ARM_FLOOR + 2, t);
  }
  drawShown(k, st, t);
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
// `over` draws what she holds (see kit.idle); `onlyOver` draws just that.
function figure(k, id, x, by, t, s = 1, face = 1, over = null, onlyOver = false) {
  const c = k.c;
  c.save(); c.translate(x, by); c.scale(face, 1);
  if (!k.idle(id, t, 0, 0, FIG.w * s, FIG.h * s, undefined, over, onlyOver) && !onlyOver) { c.fillStyle = k.col('#b88aa8'); c.fillRect(-18 * s, -FIG.h * s * 0.8, 36 * s, FIG.h * s * 0.8); }
  c.restore();
}

// The prince: in court dress until he takes up his arms, then in armour.
function prince(k, st, t, cx = 0) {
  const c = k.c, p = st.p, armed = st.arms.length === ARMS.length && sceneOf(st.phase) === 2;
  const moving = Math.abs(p.vx) > 20, step = walkPose(p.walk, 34);
  if ((p.knockT > 0 || st.grace > 0) && Math.floor(t * 16) % 2) c.globalAlpha = 0.5;
  // his poses (F20): in court dress he leaps the fires, is knocked back by
  // them, and reaches out as he takes a gift; armed, he kneels to be knighted
  const justTook = shown.some((o) => o.st === st && o.kind === 'gift' && st.t - o.t0 >= 0 && st.t - o.t0 < 0.55);
  const pose = armed ? (st.phase === 'knighted' && st.phaseT < 1.4 && !moving ? 'prince-kneel' : null)
    : st.defeatT != null || p.knockT > 0 ? 'prince-court-fall' : !p.on ? 'prince-court-leap' : justTook && !moving ? 'prince-court-reach' : null;
  if (pose && st.phase !== 'bind' && drawPose(k, pose, p.x - cx, p.y, PRINCE.h, { face: p.face })) { c.globalAlpha = 1; return; }
  c.save(); c.translate(p.x - cx, p.y); c.scale(p.face, 1);
  let id;
  if (st.phase === 'bind' && k.img('prince-bound')) id = 'prince-bound';
  else if (armed) id = !p.on ? 'prince-leap' : moving ? 'prince-' + step : 'prince-stand';
  else id = moving && k.img('prince-court-walk-a') ? 'prince-court-' + step : 'prince-court';
  // without walk frames, the court-dress still rocks as a puppet on its slide
  const bob = moving && id === 'prince-court' ? Math.abs(Math.sin(p.walk / 22)) * 6 : 0;
  const tip = moving && id === 'prince-court' ? Math.sin(p.walk / 22) * 0.05 : !p.on ? -0.12 : 0;
  c.rotate(tip);
  if (!k.asset(id, 0, -bob, PRINCE.w, PRINCE.h)) { c.fillStyle = k.col('#6a2a5a'); c.fillRect(-20, -200, 40, 200); }
  c.restore();
  c.globalAlpha = 1;
}

function show(st, kind, id, at, t0, slot) {
  for (let i = shown.length - 1; i >= 0; i--) if (shown[i].st !== st || shown[i].id === id) shown.splice(i, 1);
  shown.push({ st, kind, id, x: at.x, by: at.by, size: at.size, t0, slot });
}
const showing = (st, id) => shown.some((s) => s.st === st && s.id === id && st.t - s.t0 >= 0 && st.t - s.t0 < SHOW.settle);

// Each present being shown: up to the middle, big, with its name beneath,
// then down to Azurine's feet (a gift) or onto the prince (his arms).
function drawShown(k, st, t) {
  const c = k.c;
  for (const s of shown) {
    const age = st.t - s.t0;
    if (s.st !== st || age < 0 || age >= SHOW.settle) continue;
    const end = s.kind === 'gift'
      ? { x: AZURINE_X - 120 + s.slot * 42, by: FLOOR + 4, size: 96 * 0.55 }
      : { x: st.p.x, by: st.p.y - 70, size: 40 };
    const mid = { x: SHOW.x, by: SHOW.y + SHOW.size / 2, size: SHOW.size };
    let a = 1, from = s, to = mid, u;
    if (age < SHOW.rise) u = easeOut(age / SHOW.rise);
    else if (age < SHOW.hold) u = 1;
    else { from = mid; to = end; u = easeInOut((age - SHOW.hold) / (SHOW.settle - SHOW.hold)); if (s.kind === 'arm') a = 1 - u * u; }
    const x = from.x + (to.x - from.x) * u, by = from.by + (to.by - from.by) * u, size = from.size + (to.size - from.size) * u;
    const big = age < SHOW.hold ? u : 1 - u;   // how far up and grown it is
    c.save();
    // a soft glow behind it, and a dimming of the stage while it is held up
    if (big > 0) {
      c.globalAlpha = 0.3 * big; c.fillStyle = '#000'; c.fillRect(0, 0, 1280, 720);
      const g = c.createRadialGradient(x, by - size / 2, size * 0.1, x, by - size / 2, size * 0.75);
      g.addColorStop(0, 'rgba(255,242,176,0.75)'); g.addColorStop(1, 'rgba(255,242,176,0)');
      c.globalAlpha = big * (0.85 + 0.15 * Math.sin(t * 6)); c.fillStyle = g; c.fillRect(x - size, by - size * 1.5, size * 2, size * 2);
    }
    c.globalAlpha = a;
    if (s.kind === 'gift') gift(k, s.id, x, by, size / 96);
    else armShown(k, s.id, x, by, size, t);
    if (big > 0.6 && LABELS[s.id]) {
      c.globalAlpha = clamp((big - 0.6) / 0.4, 0, 1);
      c.textAlign = 'center'; c.font = '700 34px "Josefin Sans", sans-serif';
      c.lineWidth = 6; c.strokeStyle = 'rgba(30,14,30,0.85)'; c.strokeText(LABELS[s.id], x, by + 44);
      c.fillStyle = k.col('#fff2b0'); c.fillText(LABELS[s.id], x, by + 44);
    }
    c.restore();
  }
}

// An arm drawn at any size (arm() draws them at their size on the floor).
function armShown(k, id, x, by, size, t) {
  const c = k.c, s = size / (id === 'sword' ? 90 : 84);
  c.save(); c.translate(x, by); c.scale(s, s); arm(k, id, 0, 0, t); c.restore();
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
  // on touch the button itself is named for it, so the label alone
  richText(c, (k.inputMode === 'touch' ? '' : '[A] ') + near.label.toUpperCase(), x, y + 1, { px: 15, mode: k.inputMode || 'key', col: k.col });
  c.restore();
}

function skipHint(k, st) {
  const c = k.c;
  if (k.inputMode === 'touch') return;   // the Skip button says it
  c.save(); c.globalAlpha = 0.7; c.textAlign = 'right'; c.fillStyle = k.col('#f3c6dc');
  c.font = '700 13px "Josefin Sans", sans-serif';
  richText(c, '[B] SKIP SCENE', 1150, 92, { px: 13, mode: k.inputMode || 'key', col: k.col });
  c.restore();
}

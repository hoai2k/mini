// Prologue drawing: painted tableaux (tableau.js) with the gifts and the sword
// lit by the player's beats. Draw only from state and t.
import { SHOT, GIFTS } from './prologue.js';
import { tableau, card, cardAlpha } from './tableau.js';
import { clamp, easeOut, beatPhase } from './shared.js';
import { richText } from '../art.js';   // headless-safe: art.js touches no DOM at load

// Where each gift is in the betrothal tableau (stage px): the ring on its
// cushion, the lily, Aurora's star, the casket of gold.
const GIFT_AT = { ring: [890, 470], flower: [1060, 455], crown: [300, 250], gold: [1220, 420] };
const SWORD_AT = [1080, 190];

const SHOTS = {
  court: ['betrothal', ['The Betrothal', 'Prince Bel-Azor and Princess Azurine'], [640, 420]],
  gifts: ['betrothal', ['The Fairies’ Gifts', 'Press [A] on the beat as each fairy steps forward'], [900, 430]],
  curse: ['curse', ['The Uninvited', 'The witch curses the betrothal'], [820, 360]],
  abduction: ['abduction', ['The Abduction', 'Her demons carry Azurine off in a chariot of fire'], [520, 220]],
  arming: ['arming', ['The Arming', 'Aurora frees the prince. Press [A] on the beat to raise the sword'], [880, 300]],
};

export function draw(k, st, t) {
  const ph = st.phase === 'iris' ? 'arming' : st.phase, pt = st.phase === 'iris' ? SHOT.armMax + st.phaseT : st.phaseT;
  const [id, [title, sub], focus] = SHOTS[ph];
  const dur = ph === 'court' ? SHOT.court : ph === 'gifts' ? SHOT.giftsMax + 4 : ph === 'curse' ? SHOT.curse : ph === 'abduction' ? SHOT.abduction : SHOT.armMax + 4;
  // the betrothal is one continuous shot across the court and the gifts
  const bt = ph === 'gifts' ? SHOT.court + pt : pt;
  tableau(k, id, ph === 'gifts' ? bt : pt, ph === 'gifts' ? SHOT.court + dur : dur, { focus, zoom: 0.06, fadeIn: ph === 'gifts' ? 0.01 : 0.5, fadeOut: 0.01 });
  if (ph === 'gifts') gifts(k, st, t);
  if (ph === 'arming' && st.armed) swordGlow(k, st, t);
  const a = ph === 'gifts' || ph === 'arming' ? clamp((pt - 0.3) / 0.5, 0, 1) : cardAlpha(pt, dur === SHOT.court ? SHOT.court + 99 : dur);
  caption(k, title, sub, a);
}

export function drawOver(k, st) {
  if (st.phase === 'iris') k.iris(880, 300, 760 * (1 - easeOut(st.phaseT / SHOT.iris)));
  if (st.status === 'won') k.iris(880, 300, 0);
}

export function onEvent(k, e) {
  if (e.type === 'gift') { const [x, y] = GIFT_AT[e.gift]; k.burst(x, y, '#fff2b0', 24, 'sparkle'); k.burst(x, y, '#f3c6dc', 10, 'sparkle'); }
  if (e.type === 'swordRaised') { k.flash(0.6); k.burst(SWORD_AT[0], SWORD_AT[1], '#fff2b0', 40, 'sparkle'); }
  if (e.type === 'offBeat') k.text('on the beat…', 640, 470);
}

// The four gifts: each glows in the tableau as it is presented, and lands in
// a row of icons; a ring pulses on the beat while one is waiting.
function gifts(k, st, t) {
  const c = k.c;
  GIFTS.forEach((g, i) => {
    const [x, y] = GIFT_AT[g], given = i < st.gifts, next = i === st.gifts;
    if (given || next) {
      c.save(); c.globalAlpha = given ? 0.35 : 0.18 + 0.18 * (1 - beatPhase(st.beat));
      c.fillStyle = k.col('#fff2b0'); k.circle(x, y, given ? 46 : 38); c.restore();
    }
    const ix = 520 + i * 80, iy = 512;
    c.save(); c.globalAlpha = 0.85; c.fillStyle = k.col('#2a1424'); k.circle(ix, iy - 26, 30); c.restore();
    c.save(); c.globalAlpha = given ? 1 : 0.3;
    if (!k.asset('gift-' + g, ix, iy - 6, 44, 44)) { c.fillStyle = k.col('#d9b34a'); k.circle(ix, iy - 26, 12); }
    c.restore();
  });
  if (st.gifts < GIFTS.length) {
    const p = beatPhase(st.beat), r = 30 + 26 * (1 - p);
    c.save(); c.globalAlpha = 0.25 + 0.6 * (1 - p); c.strokeStyle = k.col('#f1d27a'); c.lineWidth = 4;
    c.beginPath(); c.arc(520 + st.gifts * 80, 486, r, 0, Math.PI * 2); c.stroke(); c.restore();
  }
}

function swordGlow(k, st, t) {
  const c = k.c, a = clamp(st.armT / 0.4, 0, 1);
  c.save(); c.globalAlpha = 0.4 * a * (0.8 + 0.2 * Math.sin(t * 6));
  const g = c.createRadialGradient(SWORD_AT[0], SWORD_AT[1], 10, SWORD_AT[0], SWORD_AT[1], 220);
  g.addColorStop(0, '#fff6d0'); g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g; c.fillRect(SWORD_AT[0] - 220, SWORD_AT[1] - 220, 440, 440);
  c.restore();
}

// The intertitle caption at the foot of the stage, with button glyphs.
function caption(k, title, sub, a) {
  if (a <= 0) return;
  if (!sub.includes('[')) return card(k, title, sub, a);
  card(k, title, ' ', a);
  const c = k.c;
  c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.fillStyle = k.col('#f3c6dc');
  c.font = '700 14px "Josefin Sans", sans-serif';
  richText(c, sub.toUpperCase().replace('[A]', '[A]'), 640, 548 + 88, { px: 14, mode: k.inputMode || 'key', col: k.col });
  c.restore();
}

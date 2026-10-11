// Prologue drawing: painted tableaux (tableau.js) with the gifts and the sword
// lit by the player's beats. Draw only from state and t.
import { SHOT, GIFTS } from './prologue.js';
import { tableau, card, cardAlpha } from './tableau.js';
import { clamp, easeOut } from './shared.js';
import { richText } from '../art.js';   // headless-safe: art.js touches no DOM at load

// Where each gift is in the betrothal tableau (stage px): the ring on its
// cushion, the lily, Aurora's star, the casket of gold.
const GIFT_AT = { ring: [890, 470], flower: [1060, 455], crown: [300, 250], gold: [1220, 420] };
const SWORD_AT = [1080, 190];

const SHOTS = {
  court: ['betrothal', ['The Betrothal', 'Prince Bel-Azor and Princess Azurine receive the fairies’ gifts'], [760, 430]],
  curse: ['curse', ['The Uninvited', 'The witch curses the betrothal'], [820, 360]],
  abduction: ['abduction', ['The Abduction', 'Her demons carry Azurine off in a chariot of fire'], [520, 220]],
  arming: ['arming', ['The Arming', 'Aurora frees the prince and arms him with an enchanted sword'], [880, 300]],
};

export function draw(k, st, t) {
  const iris = st.phase === 'iris', ph = iris ? 'arming' : st.phase, pt = iris ? SHOT.arming + st.phaseT : st.phaseT;
  const [id, [title, sub], focus] = SHOTS[ph];
  const dur = SHOT[ph] + (iris ? SHOT.iris : 0);
  tableau(k, id, pt, ph === 'arming' ? SHOT.arming + SHOT.iris : dur, { focus, zoom: 0.06, fadeIn: 0.5, fadeOut: 0.01 });
  if (ph === 'court') gifts(k, st, t);
  if (ph === 'arming' && st.armed) swordGlow(k, st, t);
  card(k, title, sub, cardAlpha(pt, ph === 'arming' ? 99 : dur, 0.4));
  skipHint(k, st, pt);
}

export function drawOver(k, st) {
  if (st.phase === 'iris') k.iris(880, 300, 760 * (1 - easeOut(st.phaseT / SHOT.iris)));
  if (st.status === 'won') k.iris(880, 300, 0);
}

export function onEvent(k, e) {
  if (e.type === 'gift') { const [x, y] = GIFT_AT[e.gift]; k.burst(x, y, '#fff2b0', 24, 'sparkle'); k.burst(x, y, '#f3c6dc', 10, 'sparkle'); }
  if (e.type === 'swordRaised') { k.flash(0.6); k.burst(SWORD_AT[0], SWORD_AT[1], '#fff2b0', 40, 'sparkle'); }
}

// The four gifts: each glows in the tableau as it is presented, and lands in
// a row of icons; a ring pulses on the beat while one is waiting.
function gifts(k, st, t) {
  const c = k.c;
  GIFTS.forEach((g, i) => {
    const [x, y] = GIFT_AT[g], given = i < st.gifts;
    if (given) { c.save(); c.globalAlpha = 0.3 + 0.08 * Math.sin(t * 3 + i); c.fillStyle = k.col('#fff2b0'); k.circle(x, y, 44); c.restore(); }
  });
}

function swordGlow(k, st, t) {
  const c = k.c, a = clamp(st.armT / 0.4, 0, 1);
  c.save(); c.globalAlpha = 0.4 * a * (0.8 + 0.2 * Math.sin(t * 6));
  const g = c.createRadialGradient(SWORD_AT[0], SWORD_AT[1], 10, SWORD_AT[0], SWORD_AT[1], 220);
  g.addColorStop(0, '#fff6d0'); g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g; c.fillRect(SWORD_AT[0] - 220, SWORD_AT[1] - 220, 440, 440);
  c.restore();
}

// "[A] skip" in a corner, once the first tableau has settled.
function skipHint(k, st, pt) {
  const a = Math.min(1, (st.phase === 'court' ? pt - 1 : 1) / 0.5);
  if (a <= 0) return;
  const c = k.c;
  c.save(); c.globalAlpha = 0.75 * a; c.textAlign = 'right'; c.fillStyle = k.col('#f3c6dc');
  c.font = '700 13px "Josefin Sans", sans-serif';
  richText(c, '[A] SKIP', 1150, 92, { px: 13, mode: k.inputMode || 'key', col: k.col });
  c.restore();
}

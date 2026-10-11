// Prologue — The Betrothal (film edition only; design/film-adaptation.md).
// The intro to Act I: tableaux 1-11 of the film as painted tableaux, played
// through on their own (the betrothal court, where the four fairies present
// their gifts; the uninvited witch's curse; the abduction in her chariot of
// fire; Aurora arming the prince) and flowing straight into Act I's crossing
// (`intro: true`, src/main.js). A skips to the next tableau, so pressing it
// repeatedly reaches the game at once. Headless: drawing is in prologue-art.js.
import { clamp } from './shared.js';
import * as art from './prologue-art.js';

export const BEAT_S = 60 / 76.5;
// Shot lengths, seconds; the gifts arrive at GIFT_AT into the betrothal, the
// sword is raised `armAt` into the arming.
export const SHOT = { court: 9.5, curse: 5.2, abduction: 5.6, arming: 6.4, armAt: 2.2, iris: 1.4 };
export const GIFT_AT = [2.6, 3.9, 5.2, 6.5];
export const GIFTS = ['ring', 'flower', 'crown', 'gold'];
const ORDER = ['court', 'curse', 'abduction', 'arming', 'iris'];
export const SCENES = [{ name: 'The Betrothal' }, { name: 'The Curse' }, { name: 'The Abduction' }, { name: 'The Arming' }];
const SCENE_PHASE = ['court', 'curse', 'abduction', 'arming'];

export default {
  id: 0, key: 'prologue', kicker: 'Prologue', title: 'The Betrothal', size: 120, page: 6, intro: true,
  sub: 'The betrothal, the curse and the arming of the prince.\n[A] skips ahead.',
  action: 'A: skip',
  scenes: SCENES,
  mood: (st) => (st.phase === 'curse' || st.phase === 'abduction' ? 'storm' : st.phase === 'arming' || st.phase === 'iris' ? 'tender' : 'revel'),
  touchVerb: () => 'Skip',
  touchHint: 'tap to skip',
  touchScheme: () => ({ mode: 'swipe', hint: 'Tap to skip' }),

  create({ from = null } = {}) {
    const st = {
      status: 'play', statusT: 0, events: [], result: null, checkpoint: null,
      phase: 'court', phaseT: 0, t: 0, beat: 0, gifts: 0, armed: false, armT: null, score: 0,
    };
    const k = clamp(from?.scene | 0, 0, SCENES.length - 1);
    if (k > 0) { st.phase = SCENE_PHASE[k]; st.gifts = GIFTS.length; st.checkpoint = { ...from, scene: k }; }
    return st;
  },

  step(st, dt, input = {}) {
    st.statusT += dt;
    st.t += dt;
    st.beat = input.beat ?? st.t / BEAT_S;
    if (st.status !== 'play') return;
    st.phaseT += dt;
    const ph = st.phase;
    // A skips the rest of this tableau (the iris closes at once).
    if (input.a && st.phaseT > 0.15) return next(st);
    if (ph === 'court') {
      while (st.gifts < GIFTS.length && st.phaseT >= GIFT_AT[st.gifts]) {
        st.gifts++; st.events.push({ type: 'gift', n: st.gifts, gift: GIFTS[st.gifts - 1] });
      }
      if (st.phaseT >= SHOT.court) next(st);
    } else if (ph === 'arming') {
      if (st.armT != null) st.armT += dt;
      if (!st.armed && st.phaseT >= SHOT.armAt) { st.armed = true; st.armT = 0; st.events.push({ type: 'swordRaised' }); }
      if (st.phaseT >= SHOT.arming) next(st);
    } else if (ph !== 'iris' && st.phaseT >= SHOT[ph]) next(st);
    else if (ph === 'iris' && st.phaseT >= SHOT.iris) finish(st);
  },

  hud: () => null,

  announce(e) {
    if (e.type === 'shot') return { court: 'The betrothal of Prince Bel-Azor and Princess Azurine. The fairies bring their gifts.', curse: 'The witch, uninvited, curses the betrothal.', abduction: 'That night her demons carry Azurine away in a chariot of fire.', arming: 'The witch binds the prince; Aurora frees him and arms him with an enchanted sword.' }[e.phase] || null;
    if (e.type === 'gift') return `The ${e.gift === 'gold' ? 'gold' : e.gift}.`;
    if (e.type === 'swordRaised') return 'The enchanted sword is his.';
    return null;
  },

  draw: art.draw, drawOver: art.drawOver, onEvent: art.onEvent,
};

function next(st) {
  if (st.phase === 'iris') return finish(st);
  const i = ORDER.indexOf(st.phase) + 1;
  st.phase = ORDER[i]; st.phaseT = 0;
  if (st.phase !== 'court') st.gifts = GIFTS.length;
  st.events.push({ type: 'shot', phase: st.phase });
  const k = SCENE_PHASE.indexOf(st.phase);
  if (k > 0) st.checkpoint = { scene: k };
}

function finish(st) {
  st.status = 'won'; st.statusT = 0;
  st.result = { keepsakes: {}, score: 0, pearls: 0 };
}

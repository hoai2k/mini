// Prologue — The Betrothal (film edition only; design/film-adaptation.md).
// Tableaux 1-11 of the film as painted tableaux: the betrothal court, where
// the four fairies present their gifts on the beat; the uninvited witch's
// curse; the abduction in her chariot of fire; and Aurora arming the prince,
// who raises his sword on the beat. Nothing can be lost. Headless: drawing is
// in prologue-art.js.
import { beatHit, BEAT_WINDOW, clamp } from './shared.js';
import * as art from './prologue-art.js';

export const BEAT_S = 60 / 76.5;
// Shot lengths, seconds. The gifts and the arming wait for the player's beats
// (up to `giftsMax` / `armMax`, then carry on without them).
export const SHOT = { court: 4.2, giftsMax: 16, giftLand: 0.8, curse: 5.2, abduction: 5.6, armMax: 9, armHeld: 2.4, iris: 1.4 };
export const GIFTS = ['ring', 'flower', 'crown', 'gold'];
const ORDER = ['court', 'gifts', 'curse', 'abduction', 'arming', 'iris'];
export const SCENES = [{ name: 'The Betrothal' }, { name: 'The Curse' }, { name: 'The Abduction' }, { name: 'The Arming' }];
const SCENE_PHASE = ['court', 'curse', 'abduction', 'arming'];

export default {
  id: 0, key: 'prologue', kicker: 'Prologue', title: 'The Betrothal', size: 120, page: 6,
  sub: 'The fairies bring their gifts to the betrothal.\nPress [A] on the beat as each one steps forward.',
  action: 'A: on the beat',
  scenes: SCENES,
  mood: (st) => (st.phase === 'curse' || st.phase === 'abduction' ? 'storm' : st.phase === 'arming' || st.phase === 'iris' ? 'tender' : 'revel'),
  touchVerb: (st) => (st.phase === 'gifts' || st.phase === 'arming' ? 'On the beat' : ''),
  touchHint: 'tap on the beat',
  touchScheme: () => ({ mode: 'swipe', hint: 'Tap on the beat' }),

  create({ from = null } = {}) {
    const st = {
      status: 'play', statusT: 0, events: [], result: null, checkpoint: null,
      phase: 'court', phaseT: 0, t: 0, beat: 0,
      gifts: 0, giftBeats: [], giftT: null, onBeat: 0, armed: false, armT: null, score: 0,
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
    if (ph === 'court' && st.phaseT >= SHOT.court) next(st);
    else if (ph === 'gifts') {
      if (st.giftT != null) st.giftT += dt;
      // A press on the beat: the next fairy presents her gift.
      if (input.a && st.gifts < GIFTS.length && (st.giftT == null || st.giftT > 0.3)) {
        const b = beatHit(st.beat, BEAT_WINDOW);
        if (b != null && !st.giftBeats.includes(b)) {
          st.giftBeats.push(b); st.gifts++; st.onBeat++; st.score += 100; st.giftT = 0;
          st.events.push({ type: 'gift', n: st.gifts, gift: GIFTS[st.gifts - 1] });
        } else st.events.push({ type: 'offBeat' });
      }
      // Without the player, the fairies step forward on their own at last.
      if (st.phaseT >= SHOT.giftsMax && st.gifts < GIFTS.length) {
        st.gifts++; st.giftT = 0; st.events.push({ type: 'gift', n: st.gifts, gift: GIFTS[st.gifts - 1] });
      }
      if (st.gifts >= GIFTS.length && st.giftT >= SHOT.giftLand) next(st);
    } else if (ph === 'curse' && st.phaseT >= SHOT.curse) next(st);
    else if (ph === 'abduction' && st.phaseT >= SHOT.abduction) next(st);
    else if (ph === 'arming') {
      if (st.armT != null) st.armT += dt;
      if (!st.armed && st.phaseT > 1.2 && input.a) {
        const onBeat = beatHit(st.beat, BEAT_WINDOW) != null;
        if (onBeat) { st.armed = true; st.armT = 0; st.score += 200; st.events.push({ type: 'swordRaised' }); }
        else st.events.push({ type: 'offBeat' });
      }
      if (!st.armed && st.phaseT >= SHOT.armMax) { st.armed = true; st.armT = 0; st.events.push({ type: 'swordRaised' }); }
      if (st.armed && st.armT >= SHOT.armHeld) next(st);
    } else if (ph === 'iris' && st.phaseT >= SHOT.iris) {
      st.status = 'won'; st.statusT = 0;
      st.result = { keepsakes: {}, score: st.score, pearls: 0 };
    }
  },

  hud: () => null,

  announce(e) {
    if (e.type === 'shot') return { court: 'The betrothal of Prince Bel-Azor and Princess Azurine.', gifts: 'The fairies step forward with their gifts. Press A on the beat.', curse: 'The witch, uninvited, curses the betrothal.', abduction: 'That night her demons carry Azurine away in a chariot of fire.', arming: 'The witch binds the prince; Aurora frees him and arms him. Press A on the beat to raise the sword.' }[e.phase] || null;
    if (e.type === 'gift') return `The ${e.gift === 'gold' ? 'gold' : e.gift}.`;
    if (e.type === 'swordRaised') return 'The enchanted sword is his.';
    return null;
  },

  draw: art.draw, drawOver: art.drawOver, onEvent: art.onEvent,
};

function next(st) {
  const i = ORDER.indexOf(st.phase) + 1;
  st.phase = ORDER[i]; st.phaseT = 0;
  st.events.push({ type: 'shot', phase: st.phase });
  const k = SCENE_PHASE.indexOf(st.phase);
  if (k > 0) st.checkpoint = { scene: k };
}

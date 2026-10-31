// Predator pacing and being eaten, shared by every prototype so threats feel
// the same at every magnification:
//
//  - A calm opening: no predator hunts for the first `grace` seconds, so the
//    player can move around and explore first.
//  - Hunger comes and goes: a predator is hungry for a while, then rests (longer
//    after a meal, shorter after a miss). Only a hungry predator hunts; a resting
//    one wanders, browses or ignores the player.
//  - Being caught is always shown: the predator's strike, the player held, the
//    player being eaten, then a clear "Eaten" card and a restart. Input stops only
//    during that sequence, never silently.
//
//   const hunger = createHunger({ grace: 45 });
//   ... each frame: hunger.update(dt); if (hunger.hungry) predator.hunt(); else predator.wander();
//   after the predator eats: hunger.fed(); after it gives up: hunger.missed();
//
//   const capture = createCapture({ hud, onRestart: resetLevel });
//   when a catch lands:  capture.start({ by: 'Milnesium', how: 'swallowed whole' });
//   each frame:           const c = capture.update(dt, pad);
//     c.active  -> skip player input; c.phase is 'strike' | 'hold' | 'eat' | 'eaten';
//     c.t       -> 0..1 progress within the phase, drive the predator's bite and the
//                  player's being-eaten animation from it (shrink, squash, pull into
//                  the mouth, fade); keep the camera framing both.

const rand = (a, b) => a + Math.random() * (b - a);

export function createHunger({ grace = 45, hungry = [18, 32], restFed = [45, 75], restMissed = [15, 30] } = {}) {
  let state = 'grace';
  let left = grace;
  const api = {
    get state() { return state; },
    get hungry() { return state === 'hungry'; },
    /** Seconds until the state changes. */
    get left() { return left; },
    update(dt) {
      left -= dt;
      if (left > 0) return;
      if (state === 'hungry') { state = 'resting'; left = rand(...restMissed); } else { state = 'hungry'; left = rand(...hungry); }
    },
    /** The predator ate (the player or other prey): rest for a long while. */
    fed() { state = 'resting'; left = rand(...restFed); },
    /** The predator gave up or was driven off: rest for a short while. */
    missed() { state = 'resting'; left = rand(...restMissed); },
    /** Restart the level: a fresh calm opening. */
    reset(g = grace) { state = 'grace'; left = g; },
  };
  return api;
}

const PHASES = [['strike', 0.45], ['hold', 1.0], ['eat', 1.8], ['eaten', Infinity]];

export function createCapture({ onRestart, restartButton = 0 } = {}) {
  let i = -1, t = 0, info = null;
  const card = document.createElement('div');
  card.style.cssText = 'position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);z-index:30;display:none;'
    + 'background:rgba(10,12,16,.82);color:#eef1f4;padding:18px 22px;border-radius:12px;text-align:center;'
    + 'font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;max-width:min(420px,calc(100vw - 32px))';
  document.body.appendChild(card);
  const api = {
    get active() { return i >= 0; },
    get phase() { return i >= 0 ? PHASES[i][0] : null; },
    /** Start the sequence. `by`: the predator's name; `how`: a short description. */
    start(opts = {}) {
      if (i >= 0) return;
      info = opts; i = 0; t = 0;
    },
    /** Advance; returns { active, phase, t }. Restart on A (or `restartButton`) once eaten. */
    update(dt, pad) {
      if (i < 0) return { active: false, phase: null, t: 0 };
      const [name, dur] = PHASES[i];
      t += dt;
      if (name !== 'eaten' && t >= dur) { i++; t = 0; }
      if (PHASES[i][0] === 'eaten') {
        if (card.style.display === 'none') {
          card.innerHTML = `<div style="font-size:18px;font-weight:650;margin-bottom:4px">Eaten</div>`
            + `<div style="color:#c5ccd4">${info?.by ? `${info.by}${info.how ? ` ${info.how}` : ''}.` : ''}</div>`
            + `<div style="margin-top:10px;color:#9fd0ff">Press A to try again</div>`;
          card.style.display = 'block';
        }
        if (t > 0.6 && pad && pad.pressed(restartButton)) api.reset(true);
      }
      return { active: i >= 0, phase: i >= 0 ? PHASES[i][0] : null, t: i >= 0 ? Math.min(1, t / PHASES[i][1]) : 0 };
    },
    /** End the sequence (and restart the level when `restart`). */
    reset(restart = false) {
      i = -1; t = 0; card.style.display = 'none';
      if (restart) onRestart?.();
    },
  };
  return api;
}

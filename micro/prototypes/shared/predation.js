// Predator pacing and being eaten, shared by every prototype so threats feel
// the same at every magnification:
//
//  - A calm opening: no predator hunts for the first `grace` seconds, so the
//    player can move around and explore first.
//  - Hunger comes and goes: a predator is hungry for a while, then rests (longer
//    after a meal, shorter after a miss). Only a hungry predator hunts; a resting
//    one wanders, browses or ignores the player.
//  - Being caught is always shown: the predator's strike, the player held, the
//    camera pulling back to watch the predator swallow the player whole and
//    following it for a couple of seconds, then a fade and a respawn. Input
//    stops only during that sequence, never silently.
//  - Predators fight readably (createFight): a clear wind-up posture before each
//    strike; facing them, blocking (B) and biting back (X) wear their interest
//    down until they retreat.
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

const CARD_PHASES = [['strike', 0.45], ['hold', 1.0], ['eat', 1.8], ['eaten', Infinity]];
// Default: no card. The camera pulls back to watch the predator swallow you
// whole, follows it for a couple of seconds, fades out, you respawn, fade in.
const FOLLOW_PHASES = [['strike', 0.45], ['hold', 1.0], ['eat', 2.2], ['follow', 2.2], ['fadeOut', 0.6], ['fadeIn', 0.6]];

/**
 * The catch sequence.
 *   phases (default, `card: false`): strike -> hold -> eat -> follow -> fadeOut -> fadeIn -> done.
 *     During `eat` and `follow` the world's camera pulls back and follows the
 *     predator (it swallows the player whole, then carries on). At the end of
 *     `fadeOut` the screen is black and `onRespawn` (or `onRestart`) is called;
 *     `fadeIn` reveals the respawned player.
 *   `card: true` keeps the older Eaten card with "Press A to try again".
 *   update(dt, pad) -> { active, phase, t, fade } where fade is the black
 *   overlay's opacity (drawn by this module) and t is 0..1 within the phase.
 */
export function createCapture({ onRestart, onRespawn, restartButton = 0, card: useCard = false, fade: useFade = true } = {}) {
  const PHASES = useCard ? CARD_PHASES : FOLLOW_PHASES;
  let i = -1, t = 0, info = null;
  const card = document.createElement('div');
  card.style.cssText = 'position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);z-index:30;display:none;'
    + 'background:rgba(10,12,16,.82);color:#eef1f4;padding:18px 22px;border-radius:12px;text-align:center;'
    + 'font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;max-width:min(420px,calc(100vw - 32px))';
  document.body.appendChild(card);
  const veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:29;transition:none';
  document.body.appendChild(veil);
  const caption = document.createElement('div');
  caption.style.cssText = 'position:fixed;left:50%;bottom:7vh;transform:translateX(-50%);z-index:31;opacity:0;pointer-events:none;'
    + 'color:#f1ead8;font:600 15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.9);transition:opacity .4s';
  document.body.appendChild(caption);
  const respawn = () => { (onRespawn || onRestart)?.(info); };
  const finish = () => { i = -1; t = 0; veil.style.opacity = '0'; caption.style.opacity = '0'; };
  const api = {
    get active() { return i >= 0; },
    /** The Eaten card element (card mode). */
    get card() { return card; },
    /** The full-screen fade element; pass { fade: false } (e.g. in multiplayer,
     *  where only one view should fade) and draw your own per-view fade from
     *  the returned `fade` value instead. */
    get veil() { return veil; },
    /** Turn the full-screen fade on or off at run time (players joining or leaving). */
    setFade(on) { useFade = !!on; if (!on) veil.style.opacity = '0'; },
    get phase() { return i >= 0 ? PHASES[i][0] : null; },
    /** Start the sequence. `by`: the predator's name; `how`: a short description. */
    start(opts = {}) {
      if (i >= 0) return;
      info = opts; i = 0; t = 0;
      if (!useCard && opts.by) { caption.textContent = `${opts.by}${opts.how ? ` ${opts.how}` : ''}`; caption.style.opacity = '1'; }
    },
    /** Advance; returns { active, phase, t, fade }. */
    update(dt, pad) {
      if (i < 0) return { active: false, phase: null, t: 0, fade: 0 };
      t += dt;
      let [name, dur] = PHASES[i];
      if (name !== 'eaten' && t >= dur) {
        if (name === 'fadeOut') respawn();
        if (name === 'fadeIn') { finish(); return { active: false, phase: null, t: 0, fade: 0 }; }
        i++; t = 0; [name, dur] = PHASES[i];
      }
      const k = Math.min(1, t / dur);
      let fade = 0;
      if (name === 'fadeOut') fade = k;
      else if (name === 'fadeIn') fade = 1 - k;
      if (name === 'fadeOut' && k > 0.5) caption.style.opacity = '0';
      veil.style.opacity = String(useFade ? fade : 0);
      if (name === 'eaten') {
        if (card.style.display === 'none') {
          card.innerHTML = `<div style="font-size:18px;font-weight:650;margin-bottom:4px">Eaten</div>`
            + `<div style="color:#c5ccd4">${info?.by ? `${info.by}${info.how ? ` ${info.how}` : ''}.` : ''}</div>`
            + `<div style="margin-top:10px;color:#9fd0ff">Press A to try again</div>`;
          card.style.display = 'block';
        }
        if (t > 0.6 && pad && pad.pressed(restartButton)) api.reset(true);
      }
      return { active: i >= 0, phase: i >= 0 ? name : null, t: k, fade };
    },
    /** End the sequence now (and restart/respawn when `restart`). */
    reset(restart = false) {
      card.style.display = 'none';
      finish();
      if (restart) respawn();
    },
  };
  return api;
}

/**
 * A predator's fight: makes attacks readable and lets the player drive it off.
 *
 *   States: 'stalk' (hungry, closing in) -> 'windup' (a clear attack posture:
 *   rear up, jaws or legs open, a pause; `windup` s) -> 'strike' (the lunge;
 *   `strike` s; the world tests the hit at its end) -> 'recover' (`recoverT` s)
 *   -> 'stalk' ... and 'repelled' (staggered back after a blocked strike or a
 *   bite) and 'retreat' (lost interest: it turns and leaves for `retreatT` s,
 *   then the world calls hunger.missed()).
 *
 *   Interest starts at 1. The player wears it down by facing the predator
 *   (slowly), blocking a strike with the shared defend button (B), and biting
 *   back (X) when close and facing it. At 0 it retreats. It recovers slowly
 *   while the player turns away or flees.
 *
 *   const fight = createFight();
 *   each frame: const f = fight.update(dt, { near, inReach, facing, blocking });
 *     near: within stalking range; inReach: within strike reach;
 *     facing: the player faces it (dot > ~0.5); blocking: defend held.
 *     f.state, f.t (0..1 in the state), f.interest, f.hit (true on the frame a
 *     strike lands unblocked -> start the capture), f.blocked (a strike met a
 *     block -> stagger it, rumble), f.retreated (just gave up).
 *   fight.bitten() when the player's bite lands on it; fight.reset().
 */
export function createFight({ windup = 0.8, strike = 0.35, recoverT = 0.9, repelT = 1.1, retreatT = 6,
  facingRate = 0.06, blockHit = 0.3, biteHit = 0.34, regain = 0.04 } = {}) {
  let state = 'stalk', t = 0, interest = 1, dur = 0;
  const go = (s, d) => { state = s; t = 0; dur = d; };
  return {
    get state() { return state; },
    get interest() { return interest; },
    /** True in the states where the predator is visibly attacking. */
    get attacking() { return state === 'windup' || state === 'strike'; },
    update(dt, { near = false, inReach = false, facing = false, blocking = false } = {}) {
      t += dt;
      const out = { state, t: dur ? Math.min(1, t / dur) : 0, interest, hit: false, blocked: false, retreated: false };
      if (state === 'retreat') { if (t >= dur) { interest = 1; go('stalk', 0); } return { ...out, state }; }
      if (near && facing) interest -= facingRate * dt;
      else if (!near) interest = Math.min(1, interest + regain * dt);
      if (state === 'stalk' && inReach) go('windup', windup);
      else if (state === 'windup' && t >= dur) go('strike', strike);
      else if (state === 'strike' && t >= dur) {
        if (blocking && facing) { interest -= blockHit; out.blocked = true; go('repelled', repelT); }
        else if (inReach) { out.hit = true; go('recover', recoverT); }
        else go('recover', recoverT);
      } else if ((state === 'recover' || state === 'repelled') && t >= dur) go('stalk', 0);
      if (interest <= 0) { interest = 0; out.retreated = true; go('retreat', retreatT); }
      return { ...out, state, t: dur ? Math.min(1, t / dur) : 0, interest };
    },
    /** The player's bite landed: stagger it and wear its interest down. */
    bitten() {
      interest -= biteHit;
      if (state !== 'retreat') go('repelled', repelT * 0.8);
      if (interest <= 0) { interest = 0; go('retreat', retreatT); return true; }
      return false;
    },
    reset() { interest = 1; go('stalk', 0); },
  };
}

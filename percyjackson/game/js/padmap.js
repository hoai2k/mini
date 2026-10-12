// The Xbox controller layout, after Minecraft Dungeons II's defaults:
//   Left stick move · click: flash the trail to the goal
//   Right stick: flick to dodge that way (or aim, in Settings) · click: True Sight
//   A jump, and interact while a prompt shows · X melee (in the air: jump slam)
//   Y · B · RB abilities 1 · 2 · 3 · Y + B together: godly power
//   LB dodge forward · LT Ambrosia · RT ranged
//   D-pad ↑ inventory · ↓ switch hero · ← → magic items 1 · 2
//   View map (in camp: the chapter map) · Menu pause
// Pure (no browser APIs), so the checks in test/ can drive it with a fake pad.

// Standard Gamepad API button indices
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
// buttons that map straight to an action (Y and B go through the chord below)
export const PADMAP = {
  [BTN.A]: 'jump', [BTN.X]: 'attack', [BTN.RB]: 't3', [BTN.LB]: 'dodge', [BTN.LT]: 'heal', [BTN.RT]: 'ranged',
  [BTN.VIEW]: 'map', [BTN.MENU]: 'pause', [BTN.LS]: 'trail', [BTN.RS]: 'sight',
  [BTN.UP]: 'inv', [BTN.DOWN]: 'swap', [BTN.LEFT]: 'art1', [BTN.RIGHT]: 'art2',
};
export const CHORD = 0.12;     // seconds Y / B wait for the other before firing alone
export const FLICK = 0.7;      // right stick past this: a dodge that way
export const REARM = 0.3;      // ... and back under this before the next one
const DEAD = 0.2;

const isDown = (b) => !!b && (b.pressed || b.value > 0.5);
export function deadzone(x, y) { const l = Math.hypot(x, y); if (l < DEAD) return { x: 0, y: 0 }; const s = Math.min(1, (l - DEAD) / 0.75) / l; return { x: x * s, y: y * s }; }

// One controller's frame. `pad` is a Gamepad (or { buttons, axes }), `st` this
// controller's memory between frames ({} to start), `now` seconds.
// o.interact: a prompt is up for this controller (A interacts instead of
// jumping) · o.stick: 'dodge' (default) or 'aim'.
// Returns { held, move, aimStick, dodgeDir }; dodgeDir is a screen direction
// (x right, y up) on the frame a flick rolls, else null.
export function padFrame(pad, st, now, o = {}) {
  const held = {};
  pad.buttons.forEach((b, i) => { const a = PADMAP[i]; if (a && isDown(b)) held[a] = true; });
  chord(st, held, isDown(pad.buttons[BTN.Y]), isDown(pad.buttons[BTN.B]), now);
  if (o.interact && held.jump) { held.interact = true; held.jump = false; }
  const ax = pad.axes ?? [];
  const move = deadzone(ax[0] || 0, -(ax[1] || 0));
  const rx = ax[2] || 0, ry = -(ax[3] || 0), rl = Math.hypot(rx, ry);
  let aimStick = null, dodgeDir = null;
  if (o.stick === 'aim') { const a = deadzone(rx, ry); if (a.x || a.y) aimStick = a; }
  else {
    if (st.armed === undefined) st.armed = true;
    if (rl < REARM) st.armed = true;
    else if (rl > FLICK && st.armed) { st.armed = false; dodgeDir = { x: rx / rl, y: ry / rl }; held.dodge = true; }
  }
  return { held, move, aimStick, dodgeDir };
}

// Y / B: one pressed alone becomes its ability after a short wait; both
// together within the wait become the godly power.
export function chord(st, held, y, b, now) {
  const c = st.chord ??= { t: 0, mode: null };
  if (!y && !b) { c.mode = null; c.t = 0; return; }
  if (!c.mode) { c.mode = 'wait'; c.t = now; }
  if (c.mode === 'wait') {
    if (y && b) c.mode = 'power';
    else if (now - c.t >= CHORD) c.mode = y ? 't1' : 't2';
  }
  if (c.mode === 'power') held.domain = true;
  else if (c.mode === 't1') held.t1 = y;
  else if (c.mode === 't2') held.t2 = b;
}

// What each action is on the controller (HUD glyphs, hints, prompts).
export const PAD_LABEL = {
  attack: 'X', jump: 'A', interact: 'A', ranged: 'RT', dodge: 'LB', t1: 'Y', t2: 'B', t3: 'RB', domain: 'Y+B', heal: 'LT',
  sight: 'RS', trail: 'LS', inv: '↑', swap: '↓', art1: '←', art2: '→', map: 'View', pause: 'Menu',
};

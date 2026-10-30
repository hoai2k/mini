// The Xbox controller layout, after Minecraft Dungeons II's defaults:
//   Left stick move · click: flash the trail to the goal
//   Right stick: flick to dodge that way (or aim, in Settings) · click: True Sight
//   A jump, and interact while a prompt shows · X melee (in the air: jump slam)
//   Y · LB · RB abilities 1 · 2 · 3 · Y + LB together: godly power
//   B dodge forward · LT Ambrosia · RT ranged
// (B and LB swapped at the owner's request: B rolls, LB is ability 2)
//   D-pad ↑ your own menu on the inventory · ↓ switch hero · ← → magic items 1 · 2
//   View your own menu on the map · Menu pause (and resume)
// In your own menu (ui/playerMenu.js) LB / RB change its tabs, B backs out,
// View closes it; Menu pauses the game for everyone.
// The keyboard and mouse layout (keyFrame below) follows Minecraft Dungeons
// II's keyboard defaults too, keeping WASD to move.
// Pure (no browser APIs), so the checks in test/ can drive it with a fake pad.

// Standard Gamepad API button indices
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
// buttons that map straight to an action (Y and LB go through the chord below)
export const PADMAP = {
  [BTN.A]: 'jump', [BTN.X]: 'attack', [BTN.RB]: 't3', [BTN.B]: 'dodge', [BTN.LT]: 'heal', [BTN.RT]: 'ranged',
  [BTN.VIEW]: 'map', [BTN.MENU]: 'pause', [BTN.LS]: 'trail', [BTN.RS]: 'sight',
  [BTN.UP]: 'inv', [BTN.DOWN]: 'swap', [BTN.LEFT]: 'art1', [BTN.RIGHT]: 'art2',
};
export const CHORD = 0.12;     // seconds Y / LB wait for the other before firing alone
export const FLICK = 0.7;      // right stick past this: a dodge that way
export const REARM = 0.3;      // ... and back under this before the next one
import { t } from './text_config.js';

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
  chord(st, held, isDown(pad.buttons[BTN.Y]), isDown(pad.buttons[BTN.LB]), now);
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

// Y / LB: one pressed alone becomes its ability after a short wait; both
// together within the wait become the godly power. (`b` is LB, ability 2.)
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
  attack: 'X', jump: 'A', interact: 'A', ranged: 'RT', dodge: 'B', t1: 'Y', t2: 'LB', t3: 'RB', domain: 'Y+LB', heal: 'LT',
  sight: 'RS', trail: 'LS', inv: '↑', swap: '↓', art1: '←', art2: '→', map: t('controls.view'), pause: t('controls.menu'), slam: t('controls.xAir'), root: '—', quest: t('controls.view'), skills: '—',
};

// ---------------------------------------------------------------- keyboard and mouse
// After Minecraft Dungeons II's keyboard defaults (WASD still moves):
//   left click melee (interact while a prompt shows) · right click ranged ·
//   middle click show the way · Mouse 4 / R dodge toward the cursor · Mouse 5
//   dodge forward · Space jump · Q jump slam · hold Shift: stand still and
//   attack in place · 1 2 3 abilities · 4 (or 1 + 2 together) godly power ·
//   E Ambrosia · I / Tab your own menu on the inventory · M on the map · K on
//   the skill tree · J waystones and side quests (in camp; in a chapter the
//   map) · F switch hero · V True Sight · Z X magic items · Esc / P pause ·
//   [ ] turn the camera (when camera rotation is on). In your own menu Q / E
//   (Tab, Shift+Tab) change its tabs and Esc backs out.
export const KEYMAP = {
  Space: 'jump', KeyQ: 'slam', KeyR: 'dodge', Digit1: 't1', Digit2: 't2', Digit3: 't3', Digit4: 'domain', KeyE: 'heal',
  KeyI: 'inv', Tab: 'inv', KeyM: 'map', KeyK: 'skills', KeyJ: 'quest', KeyF: 'swap', KeyV: 'sight', KeyZ: 'art1', KeyX: 'art2',
  ShiftLeft: 'root', ShiftRight: 'root', Escape: 'pause', KeyP: 'pause', BracketLeft: 'rotL', BracketRight: 'rotR',
};
// mouse buttons (MouseEvent.button): 0 left, 1 middle, 2 right, 3 back (Mouse 4), 4 forward (Mouse 5)
export const MOUSEMAP = { 0: 'attack', 1: 'trail', 2: 'ranged', 3: 'dodge', 4: 'dodge' };

// One keyboard-and-mouse frame. keys: a Set of KeyboardEvent.code; mouse: the
// set of mouse buttons down; st: memory between frames. o.interact: a prompt
// is up (left click interacts). Returns { held, move, dodgeToAim }:
// dodgeToAim is true when the dodge held is the one toward the cursor (R or
// Mouse 4; Mouse 5 rolls the way you move or face).
export function keyFrame(keys, mouse, st, now, o = {}) {
  const held = {};
  for (const code of keys) { const a = KEYMAP[code]; if (a && a !== 't1' && a !== 't2') held[a] = true; }
  for (const b of mouse) { const a = MOUSEMAP[b]; if (a) held[a] = true; }
  chord(st, held, keys.has('Digit1'), keys.has('Digit2'), now);   // 1 + 2 together: the godly power, like Y + B
  if (o.interact && held.attack) { held.interact = true; held.attack = false; }
  let mx = 0, my = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) my -= 1;
  const ml = Math.hypot(mx, my) || 1;
  const dodgeToAim = keys.has('KeyR') || mouse.has(3);
  return { held, move: { x: mx / ml, y: my / ml }, dodgeToAim };
}

// What each action is on the keyboard and mouse (HUD, hints, prompts).
export const KEY_LABEL = {
  attack: 'LMB', interact: t('controls.click'), ranged: 'RMB', trail: 'MMB', jump: t('controls.space'), slam: 'Q', dodge: 'R', root: t('controls.shift'),
  t1: '1', t2: '2', t3: '3', domain: '4', heal: 'E', inv: 'I', map: 'M', skills: 'K', quest: 'J', swap: 'F', sight: 'V', art1: 'Z', art2: 'X', pause: t('controls.esc'),
};

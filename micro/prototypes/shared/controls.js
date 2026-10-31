// The shared control scheme (see ../CONTROLS.md), so every creature is played
// the same way at every magnification. Prototypes read actions through this
// module rather than raw buttons, and build their HUD list with hudControls()
// so the list is always in the same order with the same buttons.
//
//   LS move · RS camera · A dash/jump · X attack/eat · B defend · Y special
//   LT/RT analog (focus, zoom, or the creature's own) · LB/RB secondary
//   D-pad left/right optical look · D-pad up/down objective or zoom
//   Menu features · View hide the controls
//
// The amoeba uses its own lead-and-follow stick scheme (see CONTROLS.md).
//
//   const ctl = createControls(pad);
//   ... each frame after pad.poll():
//   const m = ctl.move();                 // {x, y, m}
//   if (ctl.dash.pressed()) dash.trigger();
//   if (ctl.attack.pressed()) bite();
//   mountHud({ title, sub, controls: hudControls({
//     move: 'Walk', camera: 'Orbit', dash: 'Scramble', attack: 'Bite',
//     defend: 'Hold: close up', special: 'Tun', analog: 'Zoom out / in',
//     secondary: 'Walk slowly / hurry', look: 'SEM mode', zoom: 'Objective',
//     extra: [['LS click', 'Refocus']] }) });
import { BTN } from './pad.js';

// Camera pitch convention for every prototype: RS up looks up (the camera
// swings down towards the horizon), RS down looks down, like most third-person
// games. "Invert Y" flips it; the choice is shared by all prototypes.
const INVERT_KEY = 'micro.invertY';
let invertY = false;
try { invertY = localStorage.getItem(INVERT_KEY) === '1'; } catch { /* private mode */ }

/** Add the shared Invert Y switch to a prototype's feature panel. */
export function addInvertY(features) {
  features.add({ id: 'invertY', group: 'Controls', label: 'Invert camera Y',
    about: 'Off: right stick up looks up (the camera swings down). On: right stick up looks down. Shared by every prototype.',
    on: invertY, onChange: (v) => { invertY = !!v; try { localStorage.setItem(INVERT_KEY, invertY ? '1' : '0'); } catch { /* private mode */ } } });
}

function button(pad, b) {
  return {
    pressed: () => pad.pressed(b),
    down: () => pad.down(b),
    released: () => pad.released(b),
    value: () => pad.value(b),
  };
}

export function createControls(pad) {
  return {
    move: () => pad.ls(),
    camera: () => pad.rs(),
    /**
     * The camera stick by intent: yaw -1..1 (right = orbit right) and pitch
     * -1..1 where +1 means look up (camera lower), honouring Invert Y.
     * Orbit cameras should use this rather than camera().
     */
    look: () => { const r = pad.rs(); const up = -r.y; return { yaw: r.x, pitch: invertY ? -up : up, m: r.m }; },
    dash: button(pad, BTN.A),
    attack: button(pad, BTN.X),
    defend: button(pad, BTN.B),
    special: button(pad, BTN.Y),
    /** RT minus LT, -1..1 (focus, zoom, or the creature's own analog). */
    analog: () => pad.rt() - pad.lt(),
    lt: () => pad.lt(),
    rt: () => pad.rt(),
    /** RB minus LB as a held axis, -1, 0 or 1. */
    secondary: () => (pad.down(BTN.RB) ? 1 : 0) - (pad.down(BTN.LB) ? 1 : 0),
    lb: button(pad, BTN.LB),
    rb: button(pad, BTN.RB),
    /** -1 / +1 on a fresh d-pad left / right press: cycle the optical look. */
    lookStep: () => (pad.pressed(BTN.RIGHT) ? 1 : 0) - (pad.pressed(BTN.LEFT) ? 1 : 0),
    /** -1 / +1 on a fresh d-pad down / up press: objective or zoom step. */
    zoomStep: () => (pad.pressed(BTN.UP) ? 1 : 0) - (pad.pressed(BTN.DOWN) ? 1 : 0),
    stickClick: { left: button(pad, BTN.LS), right: button(pad, BTN.RS) },
  };
}

/**
 * A dash with a recharge: trigger() when ready starts it; update(dt) each
 * frame; `active` is true for `duration` seconds; `charge` 0..1 for the HUD.
 */
export function createDash({ duration = 0.25, cooldown = 1.2 } = {}) {
  let t = 0, cool = 0;
  return {
    get ready() { return cool <= 0; },
    get active() { return t > 0; },
    /** 1 at the start of the dash, falling to 0 at its end. */
    get phase() { return t / duration; },
    get charge() { return 1 - Math.max(0, cool) / cooldown; },
    trigger() {
      if (cool > 0) return false;
      t = duration; cool = cooldown;
      return true;
    },
    update(dt) { t = Math.max(0, t - dt); cool = Math.max(0, cool - dt); },
    /** Short text for the HUD stats line, e.g. "dash ■■■■□". */
    text() { const n = Math.round(this.charge * 5); return 'dash ' + '■'.repeat(n) + '□'.repeat(5 - n); },
  };
}

/**
 * The HUD controls list in the shared order. Pass a label for each action the
 * prototype uses; omit the ones it doesn't. `extra` rows go at the end.
 */
export function hudControls({ move, camera, dash, attack, defend, special, analog, secondary, look, zoom, extra = [] }) {
  const rows = [];
  if (move) rows.push(['LS', move]);
  if (camera) rows.push(['RS', camera]);
  if (dash) rows.push(['A', dash]);
  if (attack) rows.push(['X', attack]);
  if (defend) rows.push(['B', defend]);
  if (special) rows.push(['Y', special]);
  if (analog) rows.push(['LT/RT', analog]);
  if (secondary) rows.push(['LB/RB', secondary]);
  if (look) rows.push(['D-pad ←→', look]);
  if (zoom) rows.push(['D-pad ↑↓', zoom]);
  rows.push(...extra);
  rows.push(['Menu', 'Features: what this does, switches'], ['View', 'Hide this panel']);
  return rows;
}

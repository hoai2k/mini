// Xbox-style controllers: fresh presses (a button held when a screen appears
// does not count), left-stick and D-pad directions with repeat, and
// connect/disconnect events. Standard mapping indices.
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.5;
const REPEAT_FIRST = 0.38, REPEAT_NEXT = 0.11;

export function createGamepads({ onButton, onButtonUp, onDirection, onStick, onConnect, onDisconnect }) {
  const prev = new Map(); // index -> pressed[]
  const dirState = { dir: null, t: 0, next: 0 };
  let owner = null; // the pad that last pressed something

  addEventListener('gamepadconnected', (e) => onConnect?.(e.gamepad));
  addEventListener('gamepaddisconnected', (e) => { prev.delete(e.gamepad.index); if (owner === e.gamepad.index) { owner = null; onDisconnect?.(e.gamepad); } });

  function poll(now) {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    let dir = null;
    for (const p of pads) {
      const was = prev.get(p.index);
      const is = p.buttons.map((b) => b.pressed || b.value > 0.5);
      if (!was) { prev.set(p.index, is); continue; } // first sight: held buttons don't count
      is.forEach((on, i) => {
        if (on && !was[i]) { owner = p.index; onButton?.(i, p); }
        if (!on && was[i]) onButtonUp?.(i, p);
      });
      prev.set(p.index, is);
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > DEAD || Math.abs(ay) > DEAD) { dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up'); onStick?.(); }
      if (is[BTN.UP]) dir = 'up'; if (is[BTN.DOWN]) dir = 'down'; if (is[BTN.LEFT]) dir = 'left'; if (is[BTN.RIGHT]) dir = 'right';
    }
    const t = now / 1000;
    if (dir !== dirState.dir) {
      dirState.dir = dir;
      if (dir) { onDirection?.(dir); dirState.next = t + REPEAT_FIRST; }
    } else if (dir && t >= dirState.next) {
      onDirection?.(dir, true); dirState.next = t + REPEAT_NEXT;
    }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);
  return {
    vibrate(ms = 40, strength = 0.4) {
      const p = owner != null && navigator.getGamepads?.()[owner];
      p?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength }).catch?.(() => {});
    },
  };
}

// Xbox-style controller support for the whole app. The D-pad and left stick
// move focus between visible buttons (spatial navigation), A presses, and B
// backs out. Callers handle the other buttons through `onButton`. While a game
// that wants the controller is open, `routeToGame(pad)` gets the pad state
// every frame instead of focus navigation.
//
// Standard mapping: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 View,
// 9 Menu, 12-15 D-pad up/down/left/right.

const DEAD = 0.45;
const REPEAT_FIRST = 380;
const REPEAT_NEXT = 140;

export function createGamepad({ onButton, onStick, layer, routeToGame, onActive }) {
  const prev = new Map(); // pad index -> pressed array
  let held = { dir: null, since: 0, last: 0 };

  function focusables() {
    const root = layer();
    return [...root.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null && el.getClientRects().length);
  }

  function move(dir) {
    const items = focusables();
    if (!items.length) return;
    const cur = document.activeElement;
    if (!items.includes(cur)) {
      items[0].focus();
      return;
    }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay;
      const along = { left: -dx, right: dx, up: -dy, down: dy }[dir];
      if (along <= 4) continue;
      const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      const score = along + across * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    best?.focus();
    best?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  function poll(now) {
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad || pad.mapping !== 'standard') continue;
      const before = prev.get(pad.index) ?? [];
      const pressed = pad.buttons.map(b => b.pressed || b.value > 0.5);
      const edge = i => pressed[i] && !before[i];
      prev.set(pad.index, pressed);
      if (pressed.some(Boolean) || Math.hypot(pad.axes[0], pad.axes[1]) > DEAD) onActive?.();

      const state = {
        x: Math.abs(pad.axes[0]) > 0.15 ? pad.axes[0] : 0,
        y: Math.abs(pad.axes[1]) > 0.15 ? pad.axes[1] : 0,
        rx: pad.axes[2] ?? 0,
        ry: pad.axes[3] ?? 0,
        pressed,
        edge,
        a: edge(0), b: edge(1), xBtn: edge(2), yBtn: edge(3),
        up: pressed[12], down: pressed[13], left: pressed[14], right: pressed[15],
        rt: pad.buttons[7]?.value ?? 0,
        lt: pad.buttons[6]?.value ?? 0,
      };
      onStick?.(state);
      if (routeToGame?.(state)) continue;

      for (let i = 0; i < pressed.length; i++) if (edge(i)) onButton(i, state);

      let dir = null;
      if (pressed[12] || pad.axes[1] < -DEAD) dir = 'up';
      else if (pressed[13] || pad.axes[1] > DEAD) dir = 'down';
      else if (pressed[14] || pad.axes[0] < -DEAD) dir = 'left';
      else if (pressed[15] || pad.axes[0] > DEAD) dir = 'right';
      if (dir !== held.dir) {
        held = { dir, since: now, last: now };
        if (dir) move(dir);
      } else if (dir && now - held.since > REPEAT_FIRST && now - held.last > REPEAT_NEXT) {
        held.last = now;
        move(dir);
      }
    }
    requestAnimationFrame(poll);
  }

  window.addEventListener('gamepadconnected', () => onActive?.());
  requestAnimationFrame(poll);
  return { move };
}

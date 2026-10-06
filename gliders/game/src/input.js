// Input: up to four Xbox controllers plus two keyboard sets, polled each frame.
//
// Devices are named 'pad0'..'pad3' (by gamepad index), 'kb1' (WASD side) and
// 'kb2' (arrow keys side). Menus listen to every device; in play each player
// owns one device.

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const DEAD = 0.16;
const dz = (v) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * ((Math.abs(v) - DEAD) / (1 - DEAD)));
// A gentle curve keeps small corrections fine and full deflection fast.
const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 1.45);

const KB = {
  kb1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], yawL: ['KeyQ'], yawR: ['KeyE'], tuck: ['Space'], flare: ['ShiftLeft', 'KeyC'], join: ['Space'], ready: ['Space'], leave: ['Escape'], alt: ['KeyF'] },
  kb2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], yawL: ['Comma'], yawR: ['Period'], tuck: ['ShiftRight', 'Slash'], flare: ['ControlRight', 'Quote'], join: ['Enter', 'NumpadEnter'], ready: ['Enter', 'NumpadEnter'], leave: ['Backspace'], alt: ['Backslash'] },
};

export function createInput() {
  const keys = new Set();
  const pressedKeys = new Set(); // went down since the last frame
  const pads = new Map(); // index -> { buttons: [], prev: [], axes: [], held: Set }
  const listeners = { connect: [], disconnect: [], key: [] };
  let lastDevice = 'kb1';
  let lastKind = 'keyboard';

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    pressedKeys.add(e.code);
    lastKind = 'keyboard';
    for (const fn of listeners.key) fn(e);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('pointerdown', () => (lastKind = 'pointer'));
  addEventListener('gamepadconnected', (e) => listeners.connect.forEach((fn) => fn(e.gamepad.index)));
  addEventListener('gamepaddisconnected', (e) => {
    pads.delete(e.gamepad.index);
    listeners.disconnect.forEach((fn) => fn(e.gamepad.index));
  });

  // Menu repeat state per direction source.
  const navRepeat = new Map();

  const api = {
    on(type, fn) {
      listeners[type].push(fn);
    },
    get lastKind() {
      return lastKind;
    },
    get lastDevice() {
      return lastDevice;
    },
    padIndexes() {
      return [...pads.keys()];
    },
    padConnected(i) {
      return pads.has(i);
    },
    // Poll once per frame, before reading anything.
    poll() {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      const seen = new Set();
      for (const gp of list) {
        if (!gp || !gp.connected) continue;
        seen.add(gp.index);
        let p = pads.get(gp.index);
        if (!p) {
          // A newly seen pad: anything already held must be released first.
          p = { buttons: [], prev: [], axes: [], held: new Set(), id: gp.id, gp };
          gp.buttons.forEach((b, i) => b.pressed && p.held.add(i));
          pads.set(gp.index, p);
        }
        p.gp = gp;
        p.prev = p.buttons;
        p.buttons = gp.buttons.map((b) => (b.pressed ? Math.max(b.value, 0.5) : b.value));
        p.axes = gp.axes.slice();
        for (const i of [...p.held]) if (!gp.buttons[i]?.pressed) p.held.delete(i);
        if (p.buttons.some((v, i) => v > 0.5 && !(p.prev[i] > 0.5)) || p.axes.some((a) => Math.abs(a) > 0.5)) {
          lastKind = 'controller';
          lastDevice = 'pad' + gp.index;
        }
      }
      for (const i of [...pads.keys()]) if (!seen.has(i)) pads.delete(i);
    },
    // Call at the end of the frame.
    endFrame() {
      pressedKeys.clear();
    },
    // Treat everything currently held as stale until released (screen changes).
    lockHeld() {
      for (const p of pads.values()) p.buttons.forEach((v, i) => v > 0.5 && p.held.add(i));
      pressedKeys.clear();
    },
    // A fresh press of button b on pad i this frame.
    padPressed(i, b) {
      const p = pads.get(i);
      if (!p || p.held.has(b)) return false;
      return p.buttons[b] > 0.5 && !(p.prev[b] > 0.5);
    },
    padDown(i, b) {
      const p = pads.get(i);
      return !!p && !p.held.has(b) && p.buttons[b] > 0.5;
    },
    padAny(i) {
      const p = pads.get(i);
      if (!p) return false;
      return p.buttons.some((v, b) => v > 0.5 && !(p.prev[b] > 0.5) && !p.held.has(b));
    },
    padStick(i) {
      const p = pads.get(i);
      if (!p) return [0, 0];
      return [dz(p.axes[0] || 0), dz(p.axes[1] || 0)];
    },
    keyPressed(code) {
      return pressedKeys.has(code);
    },
    keyDown(code) {
      return keys.has(code);
    },
    anyKeyPressed(codes) {
      return codes.some((c) => pressedKeys.has(c));
    },
    anyKeyDown(codes) {
      return codes.some((c) => keys.has(c));
    },
    kb: KB,
    // Device-level "action pressed" for lobby handling.
    devicePressed(dev, action) {
      if (dev.startsWith('pad')) {
        const i = +dev.slice(3);
        const map = { join: [BTN.A, BTN.MENU], ready: [BTN.A, BTN.MENU], leave: [BTN.B], alt: [BTN.Y], next: [BTN.RIGHT], prev: [BTN.LEFT], up: [BTN.UP], down: [BTN.DOWN] };
        return (map[action] || []).some((b) => api.padPressed(i, b));
      }
      const set = KB[dev];
      const keyMap = { next: set.right, prev: set.left, up: set.up, down: set.down };
      return api.anyKeyPressed(keyMap[action] || set[action] || []);
    },
    // Flight controls for one device. invert flips pitch.
    flight(dev, invert) {
      const out = { pitch: 0, roll: 0, yaw: 0, tuck: 0, flare: 0 };
      if (dev.startsWith('pad')) {
        const p = pads.get(+dev.slice(3));
        if (!p) return out;
        const ax = p.axes;
        const b = p.buttons;
        out.roll = curve(dz(ax[0] || 0));
        // Stick back (positive) pulls the nose up, like a plane.
        out.pitch = curve(dz(ax[1] || 0)) * (invert ? -1 : 1);
        out.yaw = (b[BTN.RB] > 0.5 ? 1 : 0) - (b[BTN.LB] > 0.5 ? 1 : 0) + dz(ax[2] || 0) * 0.8;
        out.tuck = Math.max(b[BTN.RT] || 0, b[BTN.A] > 0.5 ? 1 : 0);
        out.flare = Math.max(b[BTN.LT] || 0, b[BTN.X] > 0.5 ? 1 : 0);
        // D-pad works as a digital stick too.
        if (b[BTN.LEFT] > 0.5) out.roll = -1;
        if (b[BTN.RIGHT] > 0.5) out.roll = 1;
        if (b[BTN.UP] > 0.5) out.pitch = invert ? 1 : -1;
        if (b[BTN.DOWN] > 0.5) out.pitch = invert ? -1 : 1;
        return out;
      }
      const set = KB[dev];
      if (!set) return out;
      const d = (c) => (api.anyKeyDown(c) ? 1 : 0);
      // W / Up pushes the nose down, S / Down pulls it up.
      out.pitch = (d(set.down) - d(set.up)) * (invert ? -1 : 1);
      out.roll = d(set.right) - d(set.left);
      out.yaw = d(set.yawR) - d(set.yawL);
      out.tuck = d(set.tuck);
      out.flare = d(set.flare);
      return out;
    },
    pauseRequested(dev) {
      if (dev.startsWith('pad')) {
        const i = +dev.slice(3);
        return api.padPressed(i, BTN.MENU) || api.padPressed(i, BTN.VIEW);
      }
      return false;
    },
    // Menu navigation from every device: returns a list of actions this frame
    // ('up','down','left','right','confirm','back','start','tabL','tabR').
    menu(now, withPads = true) {
      const acts = [];
      const keyActs = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
        Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm', Escape: 'back', Backspace: 'back',
      };
      for (const code of pressedKeys) if (keyActs[code]) acts.push(keyActs[code]);
      if (!withPads) return acts;
      for (const [i, p] of pads) {
        if (api.padPressed(i, BTN.A)) acts.push('confirm');
        if (api.padPressed(i, BTN.B)) acts.push('back');
        if (api.padPressed(i, BTN.MENU)) acts.push('start');
        if (api.padPressed(i, BTN.LB)) acts.push('tabL');
        if (api.padPressed(i, BTN.RB)) acts.push('tabR');
        // Directions with repeat: D-pad and left stick.
        const [sx, sy] = [p.axes[0] || 0, p.axes[1] || 0];
        const dirs = {
          up: p.buttons[BTN.UP] > 0.5 || sy < -0.55,
          down: p.buttons[BTN.DOWN] > 0.5 || sy > 0.55,
          left: p.buttons[BTN.LEFT] > 0.5 || sx < -0.55,
          right: p.buttons[BTN.RIGHT] > 0.5 || sx > 0.55,
        };
        for (const [dir, on] of Object.entries(dirs)) {
          const k = i + dir;
          const st = navRepeat.get(k);
          if (!on) {
            navRepeat.delete(k);
            continue;
          }
          if (!st) {
            navRepeat.set(k, { next: now + 0.38 });
            acts.push(dir);
          } else if (now >= st.next) {
            st.next = now + 0.13;
            acts.push(dir);
          }
        }
      }
      return acts;
    },
    // Left stick moved on any pad this frame (title utility navigation).
    stickMoved() {
      for (const p of pads.values()) if (Math.abs(p.axes[0] || 0) > 0.6 || Math.abs(p.axes[1] || 0) > 0.6) return true;
      return false;
    },
    // A fresh press of any button on any pad (title "any button starts").
    anyPadPressed() {
      for (const i of pads.keys()) if (api.padAny(i)) return true;
      return false;
    },
    rumble(dev, strong, weak, ms) {
      if (!dev || !dev.startsWith('pad')) return;
      const p = pads.get(+dev.slice(3));
      const act = p?.gp?.vibrationActuator;
      if (act?.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
    },
  };
  return api;
}

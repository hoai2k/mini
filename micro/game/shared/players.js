// Local multiplayer roster: up to four players on one screen, each with their
// own controller, player 1 also on the keyboard.
//
// Joining
//   - Player 1 always exists. It plays on the keyboard (WASD etc., see pad.js)
//     and takes the first controller that presses a button or moves a stick
//     (a controller already in use when the roster is made counts).
//   - Players 2-4 join by pressing any button on another controller nobody
//     has yet, at any time: in a menu or during play. onJoin(player) fires;
//     the game toasts "Player 2 joined" (in the Micro Zoom shell, forward it
//     with embed.join(p.slot, p.color, p.name)).
//   - A controller that goes away: player 1 falls back to the keyboard; any
//     other player is marked `waiting` for `graceMs` (the same controller
//     coming back resumes them), then removed (onLeave(player)).
//
// Use
//   const players = createPlayers({ max: 4, onJoin: (p) => hud.toast(`${p.name} joined`), onLeave });
//   const p1 = players.pad(0);           // pad.js API; use it where a world used createPad()
//   ... each frame:
//   players.poll();                       // polls the roster AND every player's pad:
//                                         // do not also call pad.poll() on these pads
//   for (const p of players.list) { const ctl = players.controls(p.slot); ... }
//
// Passing the roster into a world in an iframe: the shell sends
// players.toJSON(); the world calls players.fromJSON(roster) and keeps
// polling, so a controller that joins during play joins inside the world,
// which reports it through onJoin.
//
// Each player: { slot 0..3, padIndex (gamepad index or null), keyboard,
// color (CSS hex), name ('P1'...), waiting }.
import { createPad, BTN } from './pad.js';
import { createControls } from './controls.js';

/**
 * Player colours: muted, distinct in hue and readable on the dark microscope
 * looks and the light (ivory, brightfield) ones alike. Brass, verdigris
 * teal, madder rose, slate blue.
 */
export const PLAYER_COLORS = ['#d2a24c', '#4fa89a', '#c8697a', '#7f8fd0'];

const pressedAny = (g) => g.buttons.some((b) => b.pressed || b.value > 0.5);
const stickMoved = (g) => g.axes.some((a) => Math.abs(a) > 0.5);

/**
 * @param {{ max?: number, onJoin?: (p) => void, onLeave?: (p) => void, onChange?: (list) => void,
 *   keyboard?: boolean, graceMs?: number }} [opts]
 */
export function createPlayers({ max = 4, onJoin, onLeave, onChange, keyboard = true, graceMs = 8000 } = {}) {
  let clock = 0, lastPoll = null;
  max = Math.max(1, Math.min(4, max));
  const slots = new Array(max).fill(null);
  const pads = new Array(max).fill(null);
  const ctls = new Array(max).fill(null);
  const prevDown = new Map(); // gamepad index -> any button down last poll
  let hasController = false;
  let first = true;

  const make = (slot, padIndex) => ({ slot, padIndex, keyboard: slot === 0 && keyboard, color: PLAYER_COLORS[slot], name: `P${slot + 1}`, waiting: false, since: 0 });
  slots[0] = make(0, null);

  function padFor(slot) {
    if (!pads[slot]) pads[slot] = createPad({ index: slots[slot] ? slots[slot].padIndex : null, keyboard: slot === 0 && keyboard });
    return pads[slot];
  }
  const changed = () => onChange && onChange(api.list);
  const assigned = (index) => slots.some((p) => p && p.padIndex === index);

  function readGamepads() {
    try { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter((g) => g && g.connected); } catch { return []; }
  }

  const api = {
    max,
    /** The joined players (waiting ones included), in slot order. */
    get list() { return slots.filter(Boolean); },
    /** Number of joined players. */
    get count() { return slots.filter(Boolean).length; },
    /** Players who are playing now (not waiting for their controller). */
    get active() { return slots.filter((p) => p && !p.waiting); },
    /** True while any controller is connected: show controller instructions. */
    get hasController() { return hasController; },
    /** The player in a slot, or null. */
    get(slot) { return slots[slot] || null; },
    /** A pad.js pad for the slot (live: follows the player's controller). */
    pad(slot) { return padFor(slot); },
    /** shared/controls.js createControls() on that slot's pad. */
    controls(slot) { return ctls[slot] || (ctls[slot] = createControls(padFor(slot))); },

    /** Once per frame: joins, leaves, then every player's pad. */
    poll() {
      // A play clock that stops while poll() isn't called (paused worlds), so
      // a long pause doesn't use up a disconnected player's grace time.
      const t = performance.now();
      clock += lastPoll == null ? 0 : Math.min(t - lastPoll, 250);
      lastPoll = t;
      const now = clock;
      const gps = readGamepads();
      hasController = gps.length > 0;
      const present = new Set(gps.map((g) => g.index));

      for (const g of gps) {
        const down = pressedAny(g);
        const fresh = down && (first || !prevDown.get(g.index));
        prevDown.set(g.index, down);
        if (assigned(g.index)) {
          const p = slots.find((q) => q && q.padIndex === g.index);
          if (p.waiting) { p.waiting = false; changed(); }
          continue;
        }
        const p1 = slots[0];
        // Player 1 takes the first controller used (a stick counts for P1).
        if (p1.padIndex == null && (down || stickMoved(g))) {
          p1.padIndex = g.index;
          padFor(0).index = g.index;
          changed();
          continue;
        }
        if (!fresh) continue;
        const free = slots.findIndex((s) => !s);
        if (free < 0) continue;
        const p = (slots[free] = make(free, g.index));
        p.since = now;
        padFor(free).index = g.index;
        padFor(free).poll(); // the joining press is not also a game press
        if (onJoin) onJoin(p);
        changed();
      }
      for (const idx of [...prevDown.keys()]) if (!present.has(idx)) prevDown.delete(idx);

      // Controllers that went away.
      for (const p of slots) {
        if (!p || p.padIndex == null || present.has(p.padIndex)) continue;
        if (p.slot === 0) { p.padIndex = null; padFor(0).index = null; changed(); continue; }
        if (!p.waiting) { p.waiting = true; p.lostAt = now; changed(); }
        else if (now - p.lostAt > graceMs) api.remove(p.slot);
      }
      first = false;
      for (let s = 0; s < max; s++) if (slots[s] && pads[s]) pads[s].poll();
    },

    /** Drop a player (not player 1). */
    remove(slot) {
      const p = slots[slot];
      if (!p || slot === 0) return;
      slots[slot] = null;
      if (pads[slot]) pads[slot].index = null;
      if (onLeave) onLeave(p);
      changed();
    },

    /** Plain data for postMessage: [{ slot, padIndex, color, name }]. */
    toJSON() { return api.list.map(({ slot, padIndex, keyboard: kb, color, name, waiting }) => ({ slot, padIndex, keyboard: kb, color, name, waiting })); },
    /** Restore a roster (from toJSON) without firing onJoin. */
    fromJSON(roster) {
      if (!Array.isArray(roster)) return;
      for (let s = 1; s < max; s++) slots[s] = null;
      for (const r of roster) {
        if (!r || !(r.slot >= 0 && r.slot < max)) continue;
        const p = make(r.slot, r.padIndex ?? null);
        if (r.name) p.name = r.name;
        p.waiting = !!r.waiting;
        slots[r.slot] = p;
        padFor(r.slot).index = p.padIndex;
      }
      if (!slots[0]) slots[0] = make(0, null);
      // Buttons held while the roster arrived must not re-join anyone.
      for (const g of readGamepads()) prevDown.set(g.index, pressedAny(g));
      first = false;
      changed();
    },
    BTN,
  };
  return api;
}

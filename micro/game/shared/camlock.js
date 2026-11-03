// The camera's turn (yaw) locked to the world's forward, with a sideways peek,
// and the shell's "Free camera (single player)" setting.
//
// The owner (2026-11-03): lock the yaw so every 3D world has an implied
// forward (its obstacle layout can rely on it), keep pitch and zoom (they ease
// into a split-screen merge), and let RS left/right peek sideways instead of
// turning. "Free camera (single player)" (the shell's settings, default off;
// localStorage micro.freeCamera; ?freecam=1 on a standalone page) gives the
// old free turn back while exactly one player is playing; when a second
// player joins, or the setting goes off, the yaw eases back to the forward
// over `ease` seconds (smoothstep, no snap) and locks there.
//
// Use (a world with a yaw):
//   const cam = createCamLock({ forward: rig.yaw });
//   each frame:
//     rig.yaw = cam.yaw(rig.yaw, dt, nActive, turnRadians, held);   // turn: what RS would turn by when free
//     for (const p of active) cam.peek(p.slot, cam.free(nActive) ? 0 : rsX, dt);
//     ... after split.update():
//     cam.applyPeek(split, (v, k) => worldOffsetFor(k));   // adds each view's eased peek to its offset
import { embed } from './embed.js';

const KEY = 'micro.freeCamera';
const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** The setting as stored (the shell writes it; a standalone page may say ?freecam=1). */
export function freeCameraSetting() {
  try { if (new URLSearchParams(location.search).get('freecam') === '1') return true; } catch { /* no location */ }
  if (embed.settings && 'freeCamera' in embed.settings) return !!embed.settings.freeCamera;
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

/**
 * @param {{ forward: number, ease?: number, peekIn?: number, peekOut?: number, peekFrac?: number }} o
 *   forward: the locked yaw (radians, the world's own convention); ease: seconds back to it;
 *   peekIn / peekOut: the peek's time constants (s); peekFrac: the full peek, a fraction of the view's width.
 */
export function createCamLock({ forward, ease = 0.6, peekIn = 0.2, peekOut = 0.3, peekFrac = 0.3 } = {}) {
  let setting = freeCameraSetting();
  const urlOn = (() => { try { return new URLSearchParams(location.search).get('freecam') === '1'; } catch { return false; } })();
  embed.on('settings', (s) => { if (s && 'freeCamera' in s && !urlOn) setting = !!s.freeCamera; });
  const peeks = new Map();
  let back = null; // { from, t } while easing back to the forward
  const api = {
    forward,
    peekFrac,
    get setting() { return setting; },
    set setting(v) { setting = !!v; },
    /** Free now: the setting is on and exactly one player is playing. */
    free(nActive) { return setting && nActive === 1; },
    /** True once the yaw rests on the forward (locked, not easing back). */
    get locked() { return !back; },
    /**
     * The yaw this frame. Free: yaw + turn. Locked: the forward, eased back to it from wherever it
     * was (over `ease` s); `held` (a cinematic or the shell's pose owns the camera) leaves it as it is.
     */
    yaw(yaw, dt, nActive, turn = 0, held = false) {
      if (api.free(nActive)) { back = null; return yaw + turn; }
      if (held) { back = null; return yaw; }
      const d = wrap(yaw - forward);
      if (!back) { if (Math.abs(d) < 1e-4) return forward; back = { from: d, t: 0 }; }
      back.t += dt;
      const u = smooth(back.t / Math.max(1e-3, ease));
      if (u >= 1) { back = null; return forward; }
      // (eased from the offset it had when the ease began; the shortest way round)
      return forward + back.from * (1 - u);
    },
    /** Player `slot`'s peek this frame, eased toward x (-1 left .. 1 right; RS left/right while locked). */
    peek(slot, x, dt) {
      const p = peeks.get(slot) || 0, k = 1 - Math.exp(-dt / (Math.abs(x) > Math.abs(p) ? peekIn : peekOut));
      let n = p + (Math.max(-1, Math.min(1, x || 0)) - p) * k;
      if (Math.abs(n) < 1e-4 && !x) n = 0;
      peeks.set(slot, n);
      return n;
    },
    peekOf(slot) { return peeks.get(slot) || 0; },
    /** Forget players who left. */
    keep(slots) { for (const s of [...peeks.keys()]) if (!slots.includes(s)) peeks.delete(s); },
    /**
     * Add each view's peek to its offset, after split.update(): a view's peek is its players' (blended
     * through a split and a merge by split.viewBlend), the shared view's the strongest of anyone's.
     * offsetFor(view, p) -> the offset to add for peek p (a Vector3 in world units, or { x, y } for a
     * 2D view), e.g. the camera's right times p x peekFrac x the view's width at its target.
     * Returns the views' peeks.
     */
    applyPeek(split, offsetFor) {
      const L = split.layout, ps = L.players || [];
      const slotAt = (j) => (ps[j] && ps[j].slot != null ? ps[j].slot : j);
      let shared = 0;
      for (let j = 0; j < ps.length; j++) { const p = api.peekOf(slotAt(j)); if (Math.abs(p) > Math.abs(shared)) shared = p; }
      const out = [];
      for (const v of L.views) {
        const p = split.viewBlend(v, (j) => api.peekOf(slotAt(j)), shared);
        out.push(p);
        if (Math.abs(p) < 1e-5 || !v.offset) continue;
        const o = offsetFor(v, p);
        if (!o) continue;
        if (v.offset.isVector3) v.offset.add(o); else { v.offset.x += o.x; v.offset.y += o.y; }
      }
      return out;
    },
  };
  return api;
}

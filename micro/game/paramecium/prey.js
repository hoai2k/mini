// Prey round each player (pure: no three.js): bacterial clumps that drift,
// glittering gold in darkfield, and Chilomonas, a flagellate that darts away
// with its ejectisomes when you come close, so it has to be chased. Kept at
// about PER_PLAYER round every player, born out of view, let go far away.
import { DEPTH } from './route.js';
import { LENGTH } from './swim.js';

export const PREY = { perPlayer: 6, born: [420, 720], far: 1300, reach: 52, dz: 48 };

export function createPrey() {
  return { list: [], eaten: 0 };
}
/** A clump of food loose at (x, y, z) now, drifting off at (vx, vy) (spilled, knocked loose). */
export function spill(R, x, y, z, vx = 0, vy = 0) {
  const p = { kind: 'clump', x, y, z: Math.max(DEPTH.min + 20, Math.min(DEPTH.max - 20, z)), a: Math.random() * 6.283, v: 0, cd: 0, ph: Math.random() * 6.283, gone: false, dying: 0, r: 6 + Math.random() * 3, vx, vy, spilled: true };
  R.list.push(p);
  return p;
}
function spawn(R, x, y, kind) {
  const a = Math.random() * 6.283, d = PREY.born[0] + Math.random() * (PREY.born[1] - PREY.born[0]);
  const p = { kind: kind || (Math.random() < 0.55 ? 'clump' : 'chilomonas'), x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: DEPTH.min + 30 + Math.random() * (DEPTH.max - DEPTH.min - 60), a: Math.random() * 6.283, v: 0, cd: 0, ph: Math.random() * 6.283, gone: false, dying: 0 };
  p.r = p.kind === 'clump' ? 7 + Math.random() * 4 : 13;
  R.list.push(p);
  return p;
}
/**
 * Step the prey. per(P): how many to keep round player P (default PREY.perPlayer; main.js adds more toward
 * the biofilm, where food is thicker). A clump with a velocity (vx, vy: knocked loose from a Vorticella,
 * spilled from a crumbled clump or a cracked frustule, pushed by a jab's wave) drifts on it, slowing.
 */
export function stepPrey(R, players, dt, t, per = null) {
  const live = players.filter((P) => P.live);
  // let the far ones go; keep enough round everyone
  R.list = R.list.filter((p) => !p.gone && (p.dying <= 0 || p.dying < 0.6) && live.some((P) => Math.hypot(P.S.x - p.x, P.S.y - p.y) < PREY.far));
  for (const P of live) {
    const n = R.list.filter((p) => Math.hypot(P.S.x - p.x, P.S.y - p.y) < PREY.born[1] + 100).length;
    const want = per ? per(P) : PREY.perPlayer;
    for (let k = n; k < want; k++) spawn(R, P.S.x, P.S.y);
  }
  for (const p of R.list) {
    if (p.dying > 0) { p.dying += dt; continue; }
    if (p.vx || p.vy) { p.x += p.vx * dt; p.y += p.vy * dt; const k = Math.exp(-dt * 2.4); p.vx *= k; p.vy *= k; if (Math.hypot(p.vx, p.vy) < 1) p.vx = p.vy = 0; }
    if (p.kind === 'clump') {
      p.x += Math.sin(t * 0.3 + p.ph) * 6 * dt; p.y += Math.cos(t * 0.27 + p.ph) * 6 * dt;
    } else {
      // Chilomonas: wobbles along; jumps away from a cell that comes close
      p.cd = Math.max(0, p.cd - dt);
      let flee = null;
      for (const P of live) { const d = Math.hypot(P.S.x - p.x, P.S.y - p.y); if (d < 115 && Math.abs(P.S.z - p.z) < 80) flee = P; }
      if (flee && p.cd <= 0) { p.a = Math.atan2(p.y - flee.S.y, p.x - flee.S.x) + (Math.random() - 0.5) * 0.9; p.v = 520; p.cd = 1.6; }
      p.a += Math.sin(t * 2 + p.ph) * dt * 1.2;
      p.v += (45 - p.v) * Math.min(1, dt * 3);
      p.x += Math.cos(p.a) * p.v * dt; p.y += Math.sin(p.a) * p.v * dt;
      p.z += Math.sin(t * 0.8 + p.ph) * 12 * dt;
      p.z = Math.max(DEPTH.min + 20, Math.min(DEPTH.max - 20, p.z));
    }
  }
}
/** X: the prey at the oral end of S, eaten (the nearest), or null. */
export function gulpPrey(R, S) {
  const fx = S.x + Math.cos(S.a) * LENGTH * 0.45, fy = S.y + Math.sin(S.a) * LENGTH * 0.45;
  let best = null, bd = PREY.reach;
  for (const p of R.list) {
    if (p.dying > 0 || Math.abs(p.z - S.z) > PREY.dz) continue;
    const d = Math.hypot(p.x - fx, p.y - fy) - p.r * 0.5;
    if (d < bd) { bd = d; best = p; }
  }
  if (best) { best.dying = 0.001; best.by = S; R.eaten++; }
  return best;
}

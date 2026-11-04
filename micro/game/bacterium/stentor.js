// The boss of the sediment: Stentor coeruleus, the giant blue trumpet ciliate (1–2 mm long), anchored by
// its foot (holdfast) beside the host cell (the portal) and leaning over it, so it covers the way on.
// At 1000× it is enormous: its oral disc and the band of membranelles round it loom over the field, its
// body tapers back to the foot, and you are a speck in its feeding vortex.
//
// The real animal: the membranelles beat a vortex into the oral pouch that sweeps in bacteria, algae and
// small ciliates; touched, it contracts in a few milliseconds and re-extends over seconds; it bends and
// turns its disc on its stalk, and can let go and move its holdfast. (Tartar 1961; Wan et al. 2020.)
//
// The game (the owner, 2026-11-04: "he should be partially covering the portal and have an area where he is
// sucking creatures in ... which he will move and try to get you with, and if you stay still, he'll suck in
// your group little by little, and then when you attack him you should see a pinch where you are drilling
// and then he should have a bit of knockback ... so you have to push or tempt him away from the portal. He
// shouldn't randomly immediately shrink or move, he should move continuously and deliberately"):
//   suction   a feeding cone from its oral funnel (cone(): half-angle STENTOR.cone, reach pullR), always on
//             while it is awake: it draws debris, free cells and your members in along spiralling flow,
//             each member in it taken a little at a time, more the deeper in (guards.js)
//   hunting   it turns its disc toward your swarm and stretches or shortens its body, rate-limited
//             (STENTOR.turn, .stretch); when you are out of reach its holdfast creeps after you
//   recoil    damage (drilling, X, the toxin) knocks it: it flinches away from the drill side, contracts a
//             little (eased in over ~0.4 s, never a snap) and its holdfast is pushed back; sustained
//             pushing drags it off the portal (covers())
//   beaten    it contracts slowly and stays shut
// Departure (labelled in the README): the reach, strengths and rates are game values; a real Stentor
// rarely moves its holdfast while you watch.

export const STENTOR = {
  discR: 74,     // the oral disc's radius: its rim and membranelles
  pullR: 125,    // the feeding cone reaches this far from the mouth
  cone: 0.95,    // its half-angle (rad)
  wakeR: 230,    // a swarm this near its mouth wakes it
  L0: 120, Lmin: 80, Lmax: 165, // its body (foot to mouth), µm
  turn: 0.32,    // rad/s it turns its disc toward you
  stretch: 16,   // µm/s it stretches or shortens
  creep: 2.0,    // µm/s its holdfast creeps after you when you are out of its reach
  footR: 2.6, bodyK: 0.56, // the body's width: footR at the foot, bodyK × discR at the disc (as drawn)
};

const DISC = { rho: 0, out: 0 };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export function createStentor() {
  const st = {
    kind: 'stentor', label: 'Stentor', ...STENTOR,
    placed: false, awake: false, beaten: false, state: 'dormant',
    foot: { x: 1e6, y: 0 }, mouth: { x: 1e6, y: 0 }, ang: 0, L: STENTOR.L0, host: { x: 1e6, y: 0 },
    beat: 0, glow: 0, contract: 0, recoil: 0, flowK: 0.3, phase: 0, catchR: STENTOR.discR * 0.85,
    /** The axis (unit, foot to mouth). */
    get ux() { return Math.cos(st.ang); },
    get uy() { return Math.sin(st.ang); },
    /** The body's length now (shortened while contracted). */
    get len() { return st.L * (1 - 0.35 * st.contract); },
    /** The disc's radius now (smaller while contracted). */
    get R() { return st.discR * (1 - 0.3 * st.contract); },
    /**
     * Stand it guarding the host at (hx, hy), met coming along bearing a: its holdfast just beyond the host,
     * its body leaning back over it, its disc toward whoever comes.
     */
    place(hx, hy, a) {
      const ux = Math.cos(a), uy = Math.sin(a);
      st.host = { x: hx, y: hy };
      st.foot = { x: hx + ux * 28 - uy * 8, y: hy + uy * 28 + ux * 8 };
      st.ang = a + Math.PI; st.L = STENTOR.L0; st.contract = 0; st.recoil = 0;
      st.placed = true; st.awake = false; st.beaten = false; st.state = 'dormant';
      st.sync();
    },
    sync() { const l = st.len; st.mouth = { x: st.foot.x + Math.cos(st.ang) * l, y: st.foot.y + Math.sin(st.ang) * l }; },
    /** Step it: `target` the swarm it hunts ({ x, y } or null). Everything moves at a limited rate. */
    update(dt, target) {
      if (!st.placed) return;
      if (st.beaten) {
        st.state = 'beaten';
        st.contract += (1 - st.contract) * Math.min(1, dt * 0.9);
        st.flowK += (0 - st.flowK) * Math.min(1, dt * 2);
      } else if (st.awake && target) {
        st.state = st.recoil > 0.15 ? 'recoil' : 'hunt';
        const dx = target.x - st.foot.x, dy = target.y - st.foot.y, d = Math.hypot(dx, dy) || 1;
        // turn the disc toward the swarm (slower while recoiling), stretch or shorten toward it
        const diff = wrap(Math.atan2(dy, dx) - st.ang), turn = STENTOR.turn * (st.recoil > 0.15 ? 0.4 : 1) * dt;
        st.ang += Math.max(-turn, Math.min(turn, diff));
        const wantL = Math.max(STENTOR.Lmin, Math.min(STENTOR.Lmax, d - st.discR * 0.3));
        st.L += Math.max(-STENTOR.stretch * dt, Math.min(STENTOR.stretch * dt, wantL - st.L));
        // out of its reach: the holdfast creeps after you
        if (d > STENTOR.Lmax + STENTOR.pullR * 0.7) { st.foot.x += (dx / d) * STENTOR.creep * dt; st.foot.y += (dy / d) * STENTOR.creep * dt; }
        st.flowK += (1 - st.flowK) * Math.min(1, dt * 1.5);
      } else {
        st.state = 'dormant';
        st.flowK += (0.3 - st.flowK) * Math.min(1, dt * 1.5);
      }
      // the recoil fades; the contraction follows it, eased in (~0.4 s) and out slowly: never a snap
      st.recoil = Math.max(0, st.recoil - dt * 0.7);
      if (!st.beaten) {
        const want = Math.min(0.35, st.recoil * 0.5);
        st.contract += (want - st.contract) * Math.min(1, dt * (want > st.contract ? 2.5 : 0.8));
      }
      st.beat += ((st.awake && !st.beaten ? 1 + 0.6 * st.flowK : 0.3) - st.beat) * Math.min(1, dt * 3);
      st.phase += dt * 5 * st.beat;
      st.glow += ((st.awake && !st.beaten ? 0.4 * st.flowK : 0) - st.glow) * Math.min(1, dt * 3);
      st.sync();
    },
    /**
     * A knock from (fx, fy) of `amount` (health share-ish: drilling a little every frame, a burst more): it
     * flinches away from that side, contracts a little, and its holdfast is pushed back from it.
     */
    knock(fx, fy, amount) {
      if (!st.placed || st.beaten || !(amount > 0)) return;
      st.recoil = Math.min(1.5, st.recoil + amount);
      const vx = fx - st.foot.x, vy = fy - st.foot.y;
      const side = Math.sign(st.ux * vy - st.uy * vx) || 1; // which side of its axis the blow came from
      st.ang -= side * Math.min(0.06, amount * 0.08);
      const ax = st.mouth.x - fx, ay = st.mouth.y - fy, al = Math.hypot(ax, ay) || 1;
      const push = Math.min(3, amount * 6);
      st.foot.x += (ax / al) * push; st.foot.y += (ay / al) * push;
      st.sync();
    },
    /**
     * Where (x, y) is against the oral disc as drawn (an ellipse round the mouth, 0.42 R along the body, R
     * across): rho < 1 inside the rim, and `out`, how far outside the rim, µm.
     */
    disc(x, y, o = DISC) {
      const R = st.R, ex = 0.42 * R, c = Math.cos(st.ang), s = Math.sin(st.ang);
      const dx = x - st.mouth.x, dy = y - st.mouth.y;
      const lu = dx * c + dy * s, lv = -dx * s + dy * c;
      o.rho = Math.hypot(lu / ex, lv / R);
      o.out = o.rho > 1e-6 ? Math.hypot(dx, dy) * (1 - 1 / o.rho) : -R;
      return o;
    },
    /** How deep (x, y) is in its feeding cone: 0 outside, toward 1 at the mouth. */
    cone(x, y) {
      if (!st.placed || st.beaten) return 0;
      const dx = x - st.mouth.x, dy = y - st.mouth.y, d = Math.hypot(dx, dy);
      if (d > STENTOR.pullR) return 0;
      if (d < 3) return 1;
      const cos = (dx * Math.cos(st.ang) + dy * Math.sin(st.ang)) / d, c0 = Math.cos(STENTOR.cone);
      const w = Math.max(0, Math.min(1, (cos - c0) / (1 - c0) * 1.6));
      return w * (1 - d / STENTOR.pullR);
    },
    /** The body (foot to disc) at (x, y): distance outside its surface (µm, negative inside), u along it, and its outward normal. */
    body(x, y, o = { d: 0, u: 0, nx: 0, ny: 0 }) {
      const c = Math.cos(st.ang), s = Math.sin(st.ang), L = st.len;
      const dx = x - st.foot.x, dy = y - st.foot.y, u = Math.max(0, Math.min(L, dx * c + dy * s)), v = -dx * s + dy * c;
      const w = STENTOR.footR + (STENTOR.bodyK * st.R - STENTOR.footR) * Math.pow(u / L, 2.3);
      const qx = x - (st.foot.x + c * u), qy = y - (st.foot.y + s * u), ql = Math.hypot(qx, qy) || 1;
      o.d = ql - w; o.u = u; o.nx = qx / ql; o.ny = qy / ql; o.v = v;
      return o;
    },
    /** Does its body (or disc) cover (hx, hy), the host? */
    covers(hx, hy) {
      if (!st.placed || st.beaten) return false;
      return st.body(hx, hy).d < 12 || st.disc(hx, hy).rho < 1.1;
    },
    /** The feeding flow at (x, y) in µm/s, into `out`: inward and swirling inside its cone. */
    flow(x, y, out) {
      out.x = 0; out.y = 0;
      const k = st.cone(x, y);
      if (k <= 0 || st.flowK <= 0.01) return out;
      const dx = st.mouth.x - x, dy = st.mouth.y - y, d = Math.hypot(dx, dy) || 1;
      const u = (18 + 60 * k * k) * st.flowK * (1 - st.contract);
      out.x = (dx / d) * u + (-dy / d) * u * 0.5;
      out.y = (dy / d) * u + (dx / d) * u * 0.5;
      return out;
    },
  };
  return st;
}

// The boss of the sediment: Stentor coeruleus, the giant blue trumpet ciliate
// (1–2 mm long), anchored by its foot to the biofilm beside the host cell (the
// forward landmark). At 1000× it is enormous: its oral disc and the band of
// membranelles round it loom in from the right edge of the field, its body
// tapers down to the foot on the biofilm, and you are a speck in its vortex.
//
// The real animal: the membranelles beat a vortex into the oral pouch that
// sweeps in bacteria, algae and small ciliates (a filter-feeder that eats
// rotifers); touched, it contracts in a few milliseconds (myonemes) and
// re-extends over seconds. Blue from stentorin granules in stripes.
// (Tartar 1961; Wan et al. 2020; atlas S31.)
//
// The game (main.js runs it with shared/predation.js createFight, as a boss):
//   dormant  until a player comes near after the calm opening; a gentle feeding current
//   stalk    the steady vortex (≈25 µm/s near the disc: swim against it)
//   windup   the tell: the membranelles speed up and the vortex brightens
//   strike   the pull: a strong draw into the mouth (faster than you sprint)
//   recover  the vortex slackens: sprint across now
//   repelled contracted (you bumped its foot, or tumbled free at the pull)
//   retreat  sated / worn out: it contracts and stays shut for a while (you pass)
// Departure (labelled in the README): the vortex's reach and speed are game
// values, and its pulses are a rhythm for play (a real Stentor feeds steadily).
import { WORLD } from './world.js';

export const STENTOR = {
  mouth: { x: 292, y: 40 }, // off the right edge of the field: the oral pouch
  discR: 112, // the oral disc's radius: its rim (and the membranelles) reaches into the field
  pullR: 175, // the vortex reaches this far from the mouth
  catchR: 96, // drawn this close to the mouth, you are swept in
  foot: { x: 204, y: WORLD.slabY + 6 }, // the holdfast on the biofilm
  wakeR: 230,
};

export function createStentor() {
  const st = {
    kind: 'stentor', label: 'Stentor', ...STENTOR,
    awake: false, state: 'dormant', beat: 0, glow: 0, contract: 0, flowK: 0.4, phase: 0,
    /** Show the state: `fs` the fight state, `k` 0..1 within it. */
    update(dt, fs, k) {
      const s = !st.awake ? 'dormant' : fs;
      st.state = s;
      // the vortex strength (× the steady feeding current), the membranelle beat and the brightening
      const want = s === 'dormant' ? 0.4 : s === 'windup' ? 1 + 1.2 * k : s === 'strike' ? 5.2 : s === 'recover' ? 0.25 : s === 'repelled' || s === 'retreat' ? 0 : 1;
      st.flowK += (want - st.flowK) * Math.min(1, dt * (s === 'strike' ? 12 : 4));
      const beatW = s === 'windup' ? 1.6 + 2 * k : s === 'strike' ? 3.6 : s === 'repelled' || s === 'retreat' ? 0.15 : s === 'recover' ? 0.6 : 1;
      st.beat += (beatW - st.beat) * Math.min(1, dt * 5);
      st.phase += dt * 5 * st.beat;
      const glowW = s === 'windup' ? k : s === 'strike' ? 1 : 0;
      st.glow += (glowW - st.glow) * Math.min(1, dt * 6);
      // contracted (a flash) and re-extending over seconds
      const cW = s === 'repelled' || s === 'retreat' ? 1 : 0;
      st.contract += (cW - st.contract) * Math.min(1, dt * (cW > st.contract ? 25 : 0.8));
    },
    /** The vortex's flow at (x, y) in µm/s, into `out`. */
    flow(x, y, out) {
      out.x = 0; out.y = 0;
      const dx = st.mouth.x - x, dy = st.mouth.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > st.pullR || st.flowK <= 0.01) return out;
      const k = (1 - (d - st.catchR * 0.6) / (st.pullR - st.catchR * 0.6));
      const u = 26 * Math.max(0, Math.min(1.4, k)) * st.flowK * (1 - st.contract);
      // inward and swirling (the vortex turns counter-clockwise)
      out.x = (dx / d) * u + (-dy / d) * u * 0.55;
      out.y = (dy / d) * u + (dx / d) * u * 0.55;
      return out;
    },
  };
  return st;
}

/** Hopper's three gaits and the feet that carry them.
 *
 * A grasshopper the size of a horse should move like one when it is crossing
 * open country and like an insect when it is picking its way up something.
 * So there are three: a **gallop** (four-beat, with a moment where nothing
 * touches the ground), a **walk** (the insect's alternating tripod) and a
 * **climb** (the same tripod, slower, splayed, hugging whatever it is on).
 * Which one is running is decided by the ground under him and how fast he is
 * going, and they cross-fade, so there is no moment where he changes gait.
 *
 * Feet are placed in the world, not on the body: a planted foot stays exactly
 * where it was put while the body travels over it, and a swinging foot arcs
 * to where the body will be. The renderer solves two-bone IK to reach them,
 * which is what lets him hold a slope, a stair or a ledge without the legs
 * being authored for it. The body's own angle is read back from the ground
 * under the six feet rather than authored either.
 *
 * Pure arithmetic over a small ground interface: no three.js, so the gaits
 * run in the node tests at the same rate as the game.
 */

export type GaitName = 'gallop' | 'walk' | 'climb' | 'air';

/** What the gait needs of the world: the surface under a point. */
export interface GaitGround {
  heightAt(x: number, z: number): number;
  groundAt(x: number, z: number, y: number, radius?: number): { y: number };
}

/** Hopper as the gait sees him. */
export interface GaitBody {
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
  climbing: boolean;
  /** Outward normal of the wall being climbed (horizontal, unit). */
  climbNx: number;
  climbNz: number;
  /** Seconds since the feet left the ground, and the height above it. */
  airTime: number;
  height: number;
  diving: boolean;
  gliding: boolean;
  hovering: boolean;
}

export const GAIT = {
  /** Speed the gallop comes in at and the speed it has fully taken over. */
  gallopFrom: 26,
  gallopFull: 44,
  /** Ground pitch (radians) that ends the gallop and begins the climb. */
  steepFrom: 0.3,
  steepFull: 0.62,
  climbFrom: 0.8,
  climbFull: 1.1,
  /** Metres of ground a stride covers, per gait. */
  gallopStride: 46,
  walkStride: 19,
  climbStride: 13,
  /** Strides a second, held between these. */
  cadence: { gallop: [0.85, 2.1], walk: [0.5, 2.2], climb: [0.4, 1.5] },
  /** Share of the stride a foot spends on the ground. Under a half means
   * there is a moment in every stride with nothing touching: a gallop. */
  duty: { gallop: 0.34, walk: 0.62, climb: 0.72 },
  /** How high a foot is picked up, and how far it reaches to the side. */
  lift: { gallop: 6.5, walk: 3.4, climb: 4.2 },
  /** The gallop gathers the legs in under the body, where a horse's are; the
   * walk keeps the insect's wide stance and the climb splays wider still. */
  spread: { gallop: 0.45, walk: 1, climb: 1.16 },
  reach: { gallop: 1, walk: 1, climb: 1.04 },
  /** How far the body sits below its standing height. A gallop runs low,
   * with the knees kept bent under him rather than propped straight. */
  crouch: { gallop: 2.8, walk: 0.6, climb: 1.4 },
  /** The body's own movement: the bound of a gallop, the smaller roll of a
   * walk, and how hard the picture rocks fore and aft with it. */
  bound: 2.2,
  boundPitch: 0.14,
  walkBob: 0.34,
  walkRoll: 0.035,
  /** The body rides this far above the mean of the ground under its feet. */
  bodyFollow: 0.75,
  /** Ground angles the body will take, and how fast it takes them. */
  maxPitch: 0.62,
  maxRoll: 0.42,
  angleRate: 7,
  /** How far a foot may be from its home before the leg gives up and steps. */
  stepAt: 7,
};

export interface LegPlan {
  /** Bone base name in the rig: `front.L` → front_upper.L, front_lower.L. */
  id: string;
  side: 1 | -1;
  rear: boolean;
  /** Rest foot position in body space, metres (+X left, +Y up, +Z forward). */
  home: [number, number, number];
  /** Stride phase each foot lifts at, per gait. The walk and the climb are
   * the insect's two tripods; the gallop is four-beat, hind pair first. */
  lift: { gallop: number; walk: number; climb: number };
}

export const LEGS: LegPlan[] = [
  { id: 'front.L', side: 1, rear: false, home: [7.86, 0.45, 8.34], lift: { gallop: 0.44, walk: 0, climb: 0 } },
  { id: 'front.R', side: -1, rear: false, home: [-7.86, 0.45, 8.34], lift: { gallop: 0.5, walk: 0.5, climb: 0.5 } },
  { id: 'middle.L', side: 1, rear: false, home: [9.42, 0.36, 2.04], lift: { gallop: 0.34, walk: 0.5, climb: 0.58 } },
  { id: 'middle.R', side: -1, rear: false, home: [-9.42, 0.36, 2.04], lift: { gallop: 0.4, walk: 0, climb: 0.08 } },
  { id: 'rear.L', side: 1, rear: true, home: [9.6, 0.3, -9.75], lift: { gallop: 0, walk: 0, climb: 0.16 } },
  { id: 'rear.R', side: -1, rear: true, home: [-9.6, 0.3, -9.75], lift: { gallop: 0.05, walk: 0.5, climb: 0.66 } },
];

/** A foot's working state: where it stands, or the arc it is flying. */
interface FootState {
  /** Where it is now, in world metres. */
  at: [number, number, number];
  /** Where it left from and where it is going, while it swings. */
  from: [number, number, number];
  to: [number, number, number];
  planted: boolean;
  /** 0..1 through the swing. */
  swing: number;
}

export interface GaitPose {
  /** World foot positions, in the order of `LEGS`. */
  feet: [number, number, number][];
  /** Which feet are on the ground, and which planted this frame (for dust). */
  planted: boolean[];
  touched: number[];
  /** Body offsets: metres above the controller's own height, and the angles
   * the ground and the gait ask the body to take. */
  lift: number;
  pitch: number;
  roll: number;
  /** Gait weights, and where the stride is. */
  blend: Record<GaitName, number>;
  phase: number;
  cadence: number;
  /** Ground pitch under him, for the camera and the tests. */
  slope: number;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ramp = (v: number, a: number, b: number) => clamp((v - a) / (b - a || 1), 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, k);

/** Two-bone IK. Given a hip, a foot target, the two bone lengths and the way
 * the knee should point, returns where the knee goes. The chain is kept just
 * short of straight so the solve never snaps through itself. */
export function solveTwoBone(hip: readonly number[], target: readonly number[], l1: number, l2: number, pole: readonly number[]): [number, number, number] {
  let ax = target[0] - hip[0],
    ay = target[1] - hip[1],
    az = target[2] - hip[2];
  let d = Math.hypot(ax, ay, az);
  const min = Math.abs(l1 - l2) + 0.02,
    max = l1 + l2 - 0.02;
  if (d < 1e-5) {
    ax = 0;
    ay = -1;
    az = 0;
    d = 1;
  } else {
    ax /= d;
    ay /= d;
    az /= d;
  }
  d = clamp(d, min, max);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  // The pole, made perpendicular to the hip-to-foot line.
  let px = pole[0],
    py = pole[1],
    pz = pole[2];
  const dot = px * ax + py * ay + pz * az;
  px -= ax * dot;
  py -= ay * dot;
  pz -= az * dot;
  let pl = Math.hypot(px, py, pz);
  if (pl < 1e-4) {
    // Degenerate pole: pick any perpendicular.
    px = -ay;
    py = ax;
    pz = 0;
    pl = Math.hypot(px, py, pz) || 1;
  }
  px /= pl;
  py /= pl;
  pz /= pl;
  return [hip[0] + ax * a + px * h, hip[1] + ay * a + py * h, hip[2] + az * a + pz * h];
}

/** The gait's own state across frames: the stride clock and the six feet. */
export class Gait {
  phase = 0;
  cadence = 1;
  blend: Record<GaitName, number> = { gallop: 0, walk: 1, climb: 0, air: 0 };
  pitch = 0;
  roll = 0;
  lift = 0;
  slope = 0;
  private feet: FootState[] = LEGS.map(() => ({ at: [0, 0, 0], from: [0, 0, 0], to: [0, 0, 0], planted: true, swing: 0 }));
  private started = false;

  /** Body space to world. Standing, that is a yaw; on a wall, the body lies
   * against it: his back points out along the normal and his head points up
   * the wall, so the same six homes serve all three gaits. */
  private place(b: GaitBody, home: readonly number[], out: [number, number, number]) {
    if (b.climbing) {
      const nx = b.climbNx,
        nz = b.climbNz;
      // up the wall = world up; out of the wall = the normal; across = their cross.
      const tx = -nz,
        tz = nx;
      out[0] = b.x + tx * home[0] + nx * home[1];
      out[1] = b.y + 7 + home[2];
      out[2] = b.z + tz * home[0] + nz * home[1];
      return out;
    }
    const c = Math.cos(b.yaw),
      s = Math.sin(b.yaw);
    out[0] = b.x + home[0] * c + home[2] * s;
    out[1] = b.y + home[1];
    out[2] = b.z - home[0] * s + home[2] * c;
    return out;
  }

  /** Ground height under a world point, a little above the body's own. */
  private surface(g: GaitGround, b: GaitBody, x: number, z: number): number {
    return g.groundAt(x, z, b.y + 9, 1.5).y;
  }

  update(b: GaitBody, g: GaitGround, dt: number): GaitPose {
    const speed = Math.hypot(b.vx, b.vz);
    // What the ground is doing under him: its pitch along the way he faces,
    // measured from the height field a stride's width either side.
    const fx = Math.sin(b.yaw),
      fz = Math.cos(b.yaw);
    const ahead = this.surface(g, b, b.x + fx * 9, b.z + fz * 9),
      behind = this.surface(g, b, b.x - fx * 9, b.z - fz * 9),
      left = this.surface(g, b, b.x + fz * 9, b.z - fx * 9),
      right = this.surface(g, b, b.x - fz * 9, b.z + fx * 9);
    const slope = Math.atan2(ahead - behind, 18);
    const bank = Math.atan2(left - right, 18);
    this.slope = slope;

    // Gait weights. Steep ground or a wall is a climb; open ground at speed
    // is a gallop; everything in between is the walk.
    const steep = Math.abs(slope);
    const climb = b.climbing ? 1 : ramp(steep, GAIT.climbFrom, GAIT.climbFull);
    const air = b.grounded || b.climbing ? 0 : 1;
    // A gallop is a way of going forward: crossing the ground sideways or
    // backing off is the walk, however fast it is done.
    const along = speed > 1 ? (b.vx * fx + b.vz * fz) / speed : 1;
    const gallop = (1 - climb) * ramp(speed, GAIT.gallopFrom, GAIT.gallopFull) * (1 - ramp(steep, GAIT.steepFrom, GAIT.steepFull)) * ramp(along, 0.25, 0.6);
    const walk = Math.max(0, 1 - climb - gallop);
    this.blend = { gallop: gallop * (1 - air), walk: walk * (1 - air), climb: climb * (1 - air), air };

    // The stride clock. Each gait sets its own pace from how fast the ground
    // is going by; blended, so a change of gait never jumps the feet.
    const paces = {
      gallop: clamp(speed / GAIT.gallopStride, GAIT.cadence.gallop[0], GAIT.cadence.gallop[1]),
      walk: clamp(speed / GAIT.walkStride, GAIT.cadence.walk[0], GAIT.cadence.walk[1]),
      climb: clamp((Math.abs(b.vy) + speed) / GAIT.climbStride, GAIT.cadence.climb[0], GAIT.cadence.climb[1]),
    };
    const sum = gallop + walk + climb || 1;
    this.cadence = (paces.gallop * gallop + paces.walk * walk + paces.climb * climb) / sum;
    const moving = speed > 1.5 || (b.climbing && Math.abs(b.vy) + speed > 1.5);
    if (!air && moving) this.phase = (this.phase + this.cadence * dt) % 1;
    const duty = (GAIT.duty.gallop * gallop + GAIT.duty.walk * walk + GAIT.duty.climb * climb) / sum;
    const spread = (GAIT.spread.gallop * gallop + GAIT.spread.walk * walk + GAIT.spread.climb * climb) / sum;
    const reach = (GAIT.reach.gallop * gallop + GAIT.reach.walk * walk + GAIT.reach.climb * climb) / sum;
    const liftBy = (GAIT.lift.gallop * gallop + GAIT.lift.walk * walk + GAIT.lift.climb * climb) / sum;
    const crouch = (GAIT.crouch.gallop * gallop + GAIT.crouch.walk * walk + GAIT.crouch.climb * climb) / sum;
    const stride = Math.min(speed / Math.max(0.2, this.cadence), 52);

    const touched: number[] = [];
    const anchor: [number, number, number] = [0, 0, 0];
    const home: [number, number, number] = [0, 0, 0];
    let contactSum = 0,
      contacts = 0;
    for (const [i, leg] of LEGS.entries()) {
      const f = this.feet[i];
      home[0] = leg.home[0] * spread;
      home[1] = leg.home[1];
      home[2] = leg.home[2] * reach;
      this.place(b, home, anchor);
      if (air) {
        // In the air the legs are posed, not planted: see `airFoot`.
        const pose = airFoot(leg, b);
        this.place(b, pose, anchor);
        f.at[0] = ease(f.at[0], anchor[0], dt * 9);
        f.at[1] = ease(f.at[1], anchor[1], dt * 9);
        f.at[2] = ease(f.at[2], anchor[2], dt * 9);
        f.planted = false;
        f.swing = 0;
        continue;
      }
      const ground0 = b.climbing ? anchor[1] : this.surface(g, b, anchor[0], anchor[2]);
      if (!b.climbing) anchor[1] = ground0;
      if (!this.started) {
        f.at = [anchor[0], anchor[1], anchor[2]];
        f.to = [...f.at];
        f.from = [...f.at];
        f.planted = true;
      }
      // Where this foot is in its own stride: 0 at lift-off, 1 at the next.
      const off = (leg.lift.gallop * gallop + leg.lift.walk * walk + leg.lift.climb * climb) / sum;
      const local = (this.phase - off + 2) % 1;
      const swinging = moving && local < 1 - duty;
      if (swinging) {
        const t = local / Math.max(0.02, 1 - duty);
        if (!f.swing) {
          // Lifting off: aim at where the body will be at mid-stance.
          f.from = [f.at[0], f.at[1], f.at[2]];
          const lead = stride * 0.5 + speed * 0.05;
          const tx = anchor[0] + (speed > 0.5 ? (b.vx / speed) * lead : 0),
            tz = anchor[2] + (speed > 0.5 ? (b.vz / speed) * lead : 0);
          const ty = b.climbing ? anchor[1] + (b.vy > 0 ? lead : -lead) * 0.35 : this.surface(g, b, tx, tz);
          f.to = [tx, ty, tz];
        }
        f.swing = Math.max(0.001, t);
        const arc = Math.sin(Math.PI * t) * liftBy;
        f.at[0] = lerp(f.from[0], f.to[0], t);
        f.at[1] = lerp(f.from[1], f.to[1], t) + (b.climbing ? 0 : arc);
        f.at[2] = lerp(f.from[2], f.to[2], t);
        if (b.climbing) {
          // On a wall the foot lifts away from it rather than upward.
          f.at[0] += b.climbNx * arc * 0.5;
          f.at[2] += b.climbNz * arc * 0.5;
        }
        f.planted = false;
      } else {
        if (f.swing) {
          // Touchdown: the foot takes the surface it landed on and stays.
          f.swing = 0;
          f.at = [f.to[0], f.to[1], f.to[2]];
          if (!b.climbing) f.at[1] = this.surface(g, b, f.at[0], f.at[2]);
          touched.push(i);
        }
        f.planted = true;
        // A planted foot that the body has walked away from steps up early.
        const slip = Math.hypot(f.at[0] - anchor[0], f.at[2] - anchor[2]);
        if (slip > GAIT.stepAt + stride * 0.5) {
          f.at[0] = anchor[0];
          f.at[1] = anchor[1];
          f.at[2] = anchor[2];
        }
      }
      if (f.planted) {
        contactSum += f.at[1];
        contacts++;
      }
    }
    this.started = true;

    // The body reads its angle off the ground under the feet, not the other
    // way about, so a slope, a stair or a ledge tilts him without being
    // authored. A wall turns that into lying flat against it.
    const wantPitch = b.climbing ? 0 : clamp(-slope * (1 - this.blend.air * 0.7), -GAIT.maxPitch, GAIT.maxPitch);
    const wantRoll = b.climbing ? 0 : clamp(bank * 0.8, -GAIT.maxRoll, GAIT.maxRoll);
    this.pitch = ease(this.pitch, wantPitch, dt * GAIT.angleRate);
    this.roll = ease(this.roll, wantRoll, dt * GAIT.angleRate);

    // The body rides above the mean of what its feet are standing on, and
    // bounds with the gallop: one long beat a stride, the nose rising as the
    // hind legs drive and dropping as the front pair take the landing.
    const mean = contacts ? contactSum / contacts : b.y;
    let wantLift = air || b.climbing ? 0 : (mean - b.y) * GAIT.bodyFollow - crouch;
    let bodyPitch = this.pitch;
    if (!air && !b.climbing && moving) {
      const turn = Math.PI * 2 * this.phase;
      wantLift += Math.sin(turn + 0.9) * GAIT.bound * this.blend.gallop + Math.sin(turn * 2) * GAIT.walkBob * this.blend.walk;
      bodyPitch += Math.sin(turn - 0.4) * GAIT.boundPitch * this.blend.gallop;
      this.roll += Math.sin(turn * 2 + 1.2) * GAIT.walkRoll * this.blend.walk;
    }
    this.lift = ease(this.lift, wantLift, dt * 12);

    return {
      feet: this.feet.map((f) => [f.at[0], f.at[1], f.at[2]] as [number, number, number]),
      planted: this.feet.map((f) => f.planted),
      touched,
      lift: this.lift,
      pitch: bodyPitch,
      roll: this.roll,
      blend: this.blend,
      phase: this.phase,
      cadence: this.cadence,
      slope,
    };
  }
}

/** The air pose, in body space. A leap is a push, and the legs say so: the
 * hind pair snap out behind and below, where they finished the shove, and
 * stay there through the arc; the front and middle pairs tuck up and forward.
 * Coming down, everything reaches for the ground again. */
export function airFoot(leg: LegPlan, b: GaitBody): [number, number, number] {
  const reaching = b.vy < -18 && b.height < 26 && !b.gliding;
  const land = reaching ? clamp(1 - b.height / 26, 0, 1) : 0;
  const push = clamp(b.airTime / 0.18, 0, 1);
  if (leg.rear) {
    // Swept back and down behind him, the femur open, not folded under.
    const out: [number, number, number] = [leg.home[0] * 0.95, lerp(leg.home[1], -7.5, push), lerp(leg.home[2], -22, push)];
    if (b.diving) {
      out[1] = -10;
      out[2] = -16;
    }
    if (land) {
      out[1] = lerp(out[1], -3.5, land);
      out[2] = lerp(out[2], -12, land);
    }
    return out;
  }
  // Front and middle: drawn up under the chin for the arc, out for the floor.
  const tuck: [number, number, number] = [leg.home[0] * 0.78, lerp(leg.home[1], 4.6, push), lerp(leg.home[2], leg.home[2] + 2.6, push)];
  if (b.gliding || b.hovering) {
    tuck[1] = lerp(leg.home[1], 2.2, push);
    tuck[2] = leg.home[2] + 1.2;
  }
  if (land) {
    tuck[1] = lerp(tuck[1], -1.5, land);
    tuck[2] = lerp(tuck[2], leg.home[2] + 1.5, land);
  }
  return tuck;
}

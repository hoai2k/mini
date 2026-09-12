/** The gait, put onto the delivered skeleton.
 *
 * `gait.ts` decides where the six feet are in the world; this reaches them.
 * Each leg is a two-bone chain (upper, lower, foot) in the rig, so a foot is
 * placed by solving for the knee and aiming both bones at it. Nothing is
 * authored per surface: the feet are already on whatever they landed on, so
 * a stair, a boulder or the lip of a roof comes out of the same solve.
 *
 * It runs after the animation mixer, never before: the mixer writes the whole
 * skeleton every frame, so anything posed ahead of it is thrown away. That is
 * also why the wings are beaten here rather than in the clip.
 */
import { Euler, Object3D, Quaternion, Vector3 } from 'three';
import { LEGS, solveTwoBone, type GaitPose } from './gait';
import type { HopperState } from './controller';

interface LegBones {
  upper: Object3D;
  lower: Object3D;
  foot: Object3D | null;
  /** The bone's own axis, in its local frame, and the rest lengths. */
  axisUpper: Vector3;
  axisLower: Vector3;
  l1: number;
  l2: number;
  side: number;
}

const qParent = new Quaternion();
const qLower = new Quaternion();
const qInv = new Quaternion();
const vTmp = new Vector3();
const vHip = new Vector3();
const vPole = new Vector3();
const euler = new Euler(0, 0, 0, 'YXZ');

/** Point a bone's own axis along a world direction, without disturbing the
 * chain above it. */
function aim(bone: Object3D, axis: Vector3, parentWorld: Quaternion, dir: Vector3, weight: number) {
  vTmp.copy(dir).normalize().applyQuaternion(qInv.copy(parentWorld).invert());
  if (weight >= 1) bone.quaternion.setFromUnitVectors(axis, vTmp);
  else bone.quaternion.slerp(qLower.setFromUnitVectors(axis, vTmp), weight);
}

export class HopperRig {
  private legs: (LegBones | null)[] = [];
  private wings: Object3D[] = [];
  private root: Object3D | null = null;
  private ready = false;

  bind(root: Object3D) {
    this.root = root;
    root.updateMatrixWorld(true);
    this.legs = LEGS.map((leg) => {
      const [group, side] = leg.id.split('.');
      const upper = root.getObjectByName(`${group}_upper.${side}`);
      const lower = root.getObjectByName(`${group}_lower.${side}`);
      if (!upper || !lower) return null;
      const foot = root.getObjectByName(`${group}_foot.${side}`) || null;
      const axisUpper = lower.position.clone().normalize();
      const axisLower = (foot ? foot.position.clone() : new Vector3(0, -1, 0)).normalize();
      const scale = root.getWorldScale(new Vector3()).x || 1;
      return {
        upper,
        lower,
        foot,
        axisUpper,
        axisLower,
        l1: lower.position.length() * scale,
        l2: (foot ? foot.position.length() : lower.position.length() * 0.9) * scale,
        side: leg.side,
      };
    });
    this.wings = ['wing.L', 'wing.R'].map((n) => root.getObjectByName(n)).filter((o): o is Object3D => !!o);
    this.ready = this.legs.some(Boolean);
    return this.ready;
  }

  get bound() {
    return this.ready;
  }

  /** Place the body. The gait's own pitch and roll ride on top of the
   * facing; on a wall he lies against it, head up, back to the camera. */
  placeBody(h: HopperState, pose: GaitPose, lean: number) {
    const root = this.root;
    if (!root) return;
    root.position.set(h.x, h.y + pose.lift, h.z);
    if (h.climbing) {
      euler.set(-Math.PI / 2, Math.atan2(-h.climbNx, -h.climbNz), 0);
    } else {
      euler.set(pose.pitch + lean, h.yaw, pose.roll);
    }
    root.quaternion.setFromEuler(euler);
    root.updateMatrixWorld(true);
  }

  /** Reach the feet. `weight` fades the whole solve out so an authored clip
   * (a kick, a hit) can own the body for as long as it is playing. */
  apply(h: HopperState, pose: GaitPose, weight: number) {
    if (!this.ready || weight <= 0.001) return;
    const root = this.root!;
    for (const [i, bones] of this.legs.entries()) {
      if (!bones) continue;
      const target = pose.feet[i];
      bones.upper.parent?.getWorldQuaternion(qParent);
      bones.upper.getWorldPosition(vHip);
      // The knee rides above the leg line and outside it, as an insect's
      // does; on a wall "above" is out of the wall, so the knees stand off it.
      if (h.climbing) vPole.set(h.climbNx, 0.35, h.climbNz);
      else vPole.set(Math.sin(h.yaw + Math.PI / 2) * bones.side * 0.7, 1, Math.cos(h.yaw + Math.PI / 2) * bones.side * 0.7);
      const knee = solveTwoBone([vHip.x, vHip.y, vHip.z], target, bones.l1, bones.l2, [vPole.x, vPole.y, vPole.z]);
      aim(bones.upper, bones.axisUpper, qParent, vTmp.set(knee[0] - vHip.x, knee[1] - vHip.y, knee[2] - vHip.z), weight);
      qLower.copy(qParent).multiply(bones.upper.quaternion);
      aim(bones.lower, bones.axisLower, qLower, vTmp.set(target[0] - knee[0], target[1] - knee[1], target[2] - knee[2]), weight);
    }
    root.updateMatrixWorld(true);
  }

  /** The wings. Spread is how far they are opened, beat is a continuous
   * angle: a hover is a steady drumming, not a flutter that restarts. */
  poseWings(spread: number, beat: number, tilt: number) {
    for (const [i, w] of this.wings.entries()) {
      const side = i === 0 ? 1 : -1;
      w.rotation.set(-tilt - Math.max(0, beat) * 0.15, side * spread * 0.35, side * (spread * 1.1 + beat));
    }
  }
}

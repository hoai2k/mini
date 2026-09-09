/** Three.js attachment utilities. Call after both AnimationMixers update. */
import { Matrix4, Quaternion, Vector3 } from 'three';
export function socket(root, name) {
  let node = root.getObjectByName(name);
  if (!node) root.traverse(candidate => { if (candidate.userData?.name === name) node = candidate; });
  if (!node) throw new Error(`Missing attachment socket: ${name}`);
  return node;
}
/** Capture in the rider's rest pose, before playing Mount_Seat or other clips.
 * Uses the GLB scene as riderRoot, not its skeleton or SkinnedMesh.
 * Seat scale is deliberately excluded: a 30 m robot must not enlarge the boy.
 * Mount_Seat's authored root movement is preserved by this canonical binding.
 */
export function createRiderBinding(riderRoot, hopperRoot) {
  const seat = socket(hopperRoot, 'Hopper.Seat');
  const mount = socket(riderRoot, 'Rider.Mount');
  riderRoot.updateWorldMatrix(true, true);
  const relative = new Matrix4().copy(riderRoot.matrixWorld).invert().multiply(mount.matrixWorld);
  const mountPosition = new Vector3(), mountRotation = new Quaternion(), ignored = new Vector3();
  relative.decompose(mountPosition, mountRotation, ignored);
  const authoredScale = new Vector3();
  riderRoot.matrixWorld.decompose(new Vector3(), new Quaternion(), authoredScale);
  const position = new Vector3(), rotation = new Quaternion(), world = new Matrix4();
  return {
    update() {
      seat.updateWorldMatrix(true, false);
      seat.matrixWorld.decompose(position, rotation, ignored);
      rotation.multiply(mountRotation.clone().invert());
      position.sub(mountPosition.clone().multiply(authoredScale).applyQuaternion(rotation));
      world.compose(position, rotation, authoredScale);
      if (riderRoot.parent) {
        riderRoot.parent.updateWorldMatrix(true, false);
        world.premultiply(new Matrix4().copy(riderRoot.parent.matrixWorld).invert());
      }
      world.decompose(riderRoot.position, riderRoot.quaternion, riderRoot.scale);
      riderRoot.updateWorldMatrix(false, true);
    }
  };
}
/** Both GLBs face +Z; each attachment bone's local +Z points forward. */
export function socketRay(root, name) {
  const node = socket(root, name);
  node.updateWorldMatrix(true, false);
  return { origin: node.getWorldPosition(new Vector3()),
    direction: new Vector3(0, 0, 1).transformDirection(node.matrixWorld) };
}
/** Use metadata loop flags. One-shots clamp; transition with a short crossfade. */
export function playClip(THREE, mixer, clips, name, previous, loop = false, fade = .12) {
  const clip = clips.find(c => c.name === name);
  if (!clip) throw new Error(`Missing animation: ${name}`);
  const next = mixer.clipAction(clip).reset();
  next.clampWhenFinished = true;
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1).play();
  if (previous && previous !== next) next.crossFadeFrom(previous, fade, false);
  return next;
}

import * as THREE from '../shared/vendor/three.module.min.js';

// The head is local +Y; the baseplate and attachment fibres lead along -Y.
export const attachmentForward = (q) => new THREE.Vector3(0, -1, 0).applyQuaternion(q);

// Select by aim and reach, never by compatibility: wrong proteins must be tryable.
export function aimedProtein(origin, forward, proteins, positionOf) {
  let best = null, score = Infinity;
  for (const protein of proteins) {
    if (protein.host.burst || protein.host.locked) continue;
    const offset = positionOf(protein).sub(origin), distance = offset.length();
    const along = offset.dot(forward);
    const across = Math.sqrt(Math.max(0, distance * distance - along * along));
    if (along < -2 || along > 29 || across > 13 || distance > 31) continue;
    const candidate = across * 2 + distance;
    if (candidate < score) { best = protein; score = candidate; }
  }
  return best;
}

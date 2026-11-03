// Camera-relative swimming, shared by input and tests. Angles use the
// Paramecium convention: forward = (cos(yaw), sin(pitch), -sin(yaw)).
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const followYaw = (yaw, heading, dt, hold = 0) => hold > 0 ? yaw : yaw + wrapAngle(heading - yaw) * (1 - Math.exp(-dt * 2));

export function swimIntent(stick, cameraYaw, cameraPitch = 0) {
  const magnitude = Math.min(1, Math.hypot(stick.x, stick.y));
  if (magnitude < 0.01) return { thrust: 0, yaw: cameraYaw, pitch: 0 };
  const forward = -stick.y;
  const horizontal = forward * Math.cos(cameraPitch);
  return {
    thrust: magnitude,
    yaw: cameraYaw + Math.atan2(-stick.x, horizontal),
    pitch: Math.atan2(forward * Math.sin(cameraPitch), Math.hypot(horizontal, stick.x)),
  };
}

// A resting chase camera looks slightly down. That framing must not cause a
// dive. Deliberate RS pitch outside a small dead band steers the swim instead.
export function swimLookPitch(pitch, rest = -0.25) {
  const delta = pitch - rest, excess = Math.max(0, Math.abs(delta) - 0.12);
  return Math.max(-1.1, Math.min(1.1, Math.sign(delta) * excess));
}

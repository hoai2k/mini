// Where I'm "looking" for the 360 worlds: the phone's orientation sensor when
// there is one (tilt and turn the phone to look around), otherwise my head
// (turn and nod your head in front of a laptop). view() returns
// { yaw, pitch, source } in radians, relative to where I faced when the
// effect started; yaw grows to the right, pitch upwards.

const DEG = Math.PI / 180;

export function createMotion() {
  let sensor = null;     // latest { alpha, beta, gamma }
  let origin = null;     // sensor reading when the view was reset
  let status = 'unknown'; // unknown | needs-permission | on | off
  let yaw = 0, pitch = 0;

  const needsPermission = typeof DeviceOrientationEvent !== 'undefined'
    && typeof DeviceOrientationEvent.requestPermission === 'function';

  function onOrient(e) {
    if (e.alpha == null && e.beta == null) return;
    sensor = { alpha: e.alpha ?? 0, beta: e.beta ?? 0, gamma: e.gamma ?? 0 };
    status = 'on';
  }

  function listen() {
    addEventListener('deviceorientation', onOrient);
  }

  if (needsPermission) status = 'needs-permission';
  else listen();

  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

  return {
    get status() { return sensor ? 'on' : status; },
    // iPhones ask for permission, which must come from a tap.
    async request() {
      if (!needsPermission || status === 'on') return status;
      try {
        const answer = await DeviceOrientationEvent.requestPermission();
        if (answer === 'granted') {
          listen();
          status = 'on';
        } else {
          status = 'off';
        }
      } catch {
        status = 'needs-permission';
      }
      return status;
    },
    // Raw phone tilt for games: x is left/right, y forward/back, both about
    // -1..1 for a 45-degree tilt from holding the phone upright; null when
    // there is no sensor.
    tilt() {
      if (!sensor) return null;
      const angle = (screen.orientation?.angle ?? globalThis.orientation ?? 0) | 0;
      let x = sensor.gamma / 45, y = (sensor.beta - 60) / 45;
      if (angle === 90) [x, y] = [sensor.beta / 45, -(sensor.gamma + 60) / 45];
      else if (angle === -90 || angle === 270) [x, y] = [-sensor.beta / 45, (sensor.gamma - 60) / 45];
      const c = v => Math.max(-1.5, Math.min(1.5, v));
      return { x: c(x), y: c(y) };
    },
    reset() {
      origin = null;
      yaw = 0;
      pitch = 0;
    },
    view(face, dt) {
      let ty = yaw, tp = pitch, source = 'none';
      if (sensor) {
        origin ??= { ...sensor };
        // Screen rotation changes which sensor axis is "up".
        const angle = (screen.orientation?.angle ?? globalThis.orientation ?? 0) | 0;
        const turn = wrap((sensor.alpha - origin.alpha) * DEG);
        let tilt = (sensor.beta - origin.beta) * DEG;
        if (angle === 90) tilt = -(sensor.gamma - origin.gamma) * DEG;
        else if (angle === -90 || angle === 270) tilt = (sensor.gamma - origin.gamma) * DEG;
        ty = turn;
        tp = Math.max(-1.3, Math.min(1.3, tilt));
        source = 'sensor';
      } else if (face) {
        // Head turn: how far the nose sits from the middle of the eyes.
        const sx = (face.nose.x - face.eyeMid.x) / face.scale;
        const sy = (face.nose.y - face.eyeMid.y) / face.scale - 0.5;
        ty = Math.max(-1, Math.min(1, sx * 2.2)) * 1.4;
        tp = Math.max(-1, Math.min(1, -sy * 2.5)) * 0.6;
        source = 'head';
      }
      // Ease toward the target so the world doesn't jitter.
      const k = source === 'sensor' ? 1 : Math.min(1, dt * 6);
      yaw += wrap(ty - yaw) * k;
      pitch += (tp - pitch) * k;
      return { yaw, pitch, source };
    },
  };
}

// The continuous transition between two worlds (embed.js "Continuous
// transitions" has the protocol): the old world is frozen on its portal and
// reports how it frames the next world's creature (`frozen {pose}`); the new
// world, preloaded and held at its start, reports how its opening view frames
// that creature (`opening {pose}`). This eases one pose into the other and
// sends it to both worlds every frame as `camera {pose}`: the old world
// pushes in on the creature while the new one, stacked above it, fades in
// under exactly the same framing, so the creature keeps its place on screen,
// its size and its rate of growth through the crossfade. No plates, no black
// frames: the only pictures are the two live worlds.
//
//   playContinuous({ oldFrame, newFrame, from, to, send, speed }) -> Promise
//     from, to   poses { f, x, y, pitch, rel }
//     send(frame, type, data)   bus.js send
//     speed()    time multiplier (tests slow it down); default 1
//     onFrame(info)  { u, alpha, pose } each frame (tests, readouts)
//     seek()     tests: a fixed progress 0..1 to hold at (null: run on the clock)

export const MOVE_S = 3.4;           // the camera move, seconds
export const FADE = [0.4, 0.68];     // the crossfade, as fractions of the move

const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
// slow out of the freeze, slow into the opening view
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The pose at eased progress e: size on a log scale (each moment magnifies by
 * the same factor); the view's angle (pitch, rel) at eased progress `o`
 * (default e). The move turns to the new world's angle before the crossfade,
 * so the new world fades in already seen from its own opening side (its line
 * of sight to the creature is the clear one).
 */
export function lerpPose(a, b, e, o = e) {
  const f = Math.exp(Math.log(a.f) + (Math.log(b.f) - Math.log(a.f)) * e);
  return { f, x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, pitch: a.pitch + (b.pitch - a.pitch) * o, rel: a.rel + wrap(b.rel - a.rel) * o };
}

/** A pose is usable when every number is finite and the size is positive. */
export const validPose = (p) => !!p && ['f', 'x', 'y', 'pitch', 'rel'].every((k) => Number.isFinite(p[k])) && p.f > 0;

export function playContinuous({ oldFrame, newFrame, from, to, send, speed = () => 1, onFrame = () => {}, duration = MOVE_S, seek = () => null }) {
  // (no clamping: the first pose must be exactly the freeze frame's, even
  // with the creature off screen; it then slides in as the camera turns)
  const a = { ...from };
  for (const f of [oldFrame, newFrame]) f.style.transition = 'none';
  oldFrame.style.zIndex = '1';
  newFrame.style.zIndex = '2';
  newFrame.style.opacity = '0';
  newFrame.style.visibility = 'visible';
  // a golden halo on the creature, carried across the crossfade: the super-gene
  // gold of the portal, on the speck in the old world, on the creature in the new
  const halo = document.createElement('canvas');
  halo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;mix-blend-mode:screen';
  newFrame.parentNode.appendChild(halo);
  const g = halo.getContext('2d');
  function drawHalo(pose, u) {
    const W = halo.clientWidth || innerWidth, H = halo.clientHeight || innerHeight;
    if (halo.width !== W || halo.height !== H) { halo.width = W; halo.height = H; }
    g.clearRect(0, 0, W, H);
    const k = smooth(u / 0.25) * (1 - smooth((u - FADE[1]) / (0.95 - FADE[1])));
    if (k <= 0.01) return;
    const x = (pose.x * 0.5 + 0.5) * W, y = (0.5 - pose.y * 0.5) * H;
    const r = Math.max(42, pose.f * W * 1.2);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,240,205,${(0.75 * k).toFixed(3)})`);
    gr.addColorStop(0.3, `rgba(240,180,74,${(0.45 * k).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(240,180,74,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return new Promise((resolve) => {
    let t = 0, last = performance.now();
    const tick = (now) => {
      t += ((now - last) / 1000) * speed();
      last = now;
      const fixed = seek();
      if (fixed != null) t = Math.max(0, Math.min(1, fixed)) * duration;
      const u = Math.min(1, t / duration);
      const e = ease(u);
      const pose = lerpPose(a, to, e, ease(Math.min(1, u / FADE[0])));
      drawHalo(pose, u);
      const alpha = smooth((u - FADE[0]) / (FADE[1] - FADE[0]));
      if (alpha < 1) send(oldFrame, 'camera', { pose });
      send(newFrame, 'camera', { pose });
      newFrame.style.opacity = alpha.toFixed(3);
      oldFrame.style.opacity = alpha >= 1 ? '0' : '1';
      onFrame({ u, alpha, pose });
      if (u < 1) requestAnimationFrame(tick);
      else { halo.remove(); resolve(); }
    };
    requestAnimationFrame(tick);
  });
}

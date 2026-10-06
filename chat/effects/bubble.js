// Bubble Blow: pucker your lips and a see-through bubble grows from your
// mouth. Relax and it floats off; the app then flies it across the screen to
// a friend's face, where it pops. Hold it too long and it pops on you.

import { drawBubble, makePop, drawPop } from '../js/bubble-art.js';

const GROW_PER_S = 0.55; // bubble radius growth, in eye-distances per second
const MIN_SEND = 0.3;    // smallest bubble that gets sent, in eye-distances
const MAX_R = 2.1;       // the bubble bursts after reaching this for a moment

export default {
  id: 'bubble',
  name: 'Bubble Blow',
  emoji: '🫧',
  hint: 'Pucker your lips to blow a bubble, relax to send it',
  needs: { face: true },

  start(s) {
    s.phase = 'idle';
    s.r = 0;
    s.relax = 0;
    s.full = 0;
    s.free = [];
    s.pops = [];
    s.hue = 300;
  },

  draw(ctx, f) {
    const s = f.state;
    const face = f.face;
    const scale = face ? face.scale : f.w * 0.16;
    const blowing = (face && face.pucker > 0.45) || f.input.held;
    // The bubble grows in front of the lips and sags a little as it gets big.
    const anchor = face ? face.mouth : { x: f.w / 2, y: f.h * 0.62 };
    const cx = anchor.x;
    const cy = anchor.y + s.r * 0.18;

    if (s.phase === 'idle' && blowing) {
      s.phase = 'grow';
      s.r = scale * 0.08;
      s.relax = 0;
      s.full = 0;
      s.hue = Math.floor(Math.random() * 360);
      f.sfx('blow');
    }

    if (s.phase === 'grow') {
      if (blowing) {
        s.relax = 0;
        s.r = Math.min(scale * MAX_R, s.r + scale * GROW_PER_S * f.dt);
        if (s.r >= scale * MAX_R * 0.999) s.full += f.dt;
        if (s.full > 0.8) {
          // Too big: it bursts on my own face.
          s.pops.push(makePop(cx, cy, s.r, s.hue));
          f.sfx('pop');
          s.phase = 'idle';
          s.r = 0;
        }
      } else {
        s.relax += f.dt;
        if (s.relax > 0.18) {
          if (s.r >= scale * MIN_SEND) {
            // With friends here the app flies the bubble over to one of them;
            // alone, it just floats away.
            if (f.peers === 0) {
              s.free.push({ x: cx, y: cy, r: s.r, hue: s.hue, vx: (Math.random() - 0.3) * f.w * 0.12, vy: -f.h * 0.35, t: 0 });
            }
            f.emit('bubble', { x: cx / f.w, y: cy / f.h, r: s.r / f.w, hue: s.hue });
            f.sfx('whoosh');
          } else {
            s.pops.push(makePop(cx, cy, s.r, s.hue));
          }
          s.phase = 'idle';
          s.r = 0;
        }
      }
      if (s.phase === 'grow') drawBubble(ctx, cx, cy, s.r, f.t, s.hue);
    }

    // Released bubbles drift up and out of my video.
    s.free = s.free.filter(b => {
      b.t += f.dt;
      b.vy -= f.h * 0.2 * f.dt;
      b.x += (b.vx + Math.sin(b.t * 3) * f.w * 0.05) * f.dt;
      b.y += b.vy * f.dt;
      drawBubble(ctx, b.x, b.y, b.r, f.t, b.hue);
      return b.y + b.r > -10;
    });
    s.pops = s.pops.filter(p => drawPop(ctx, p, f.dt));
  },
};

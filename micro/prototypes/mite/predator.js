// The predatory mite's behaviour: a parasitid (Mesostigmata) hunting the box
// mite in the moss. The body and walking are createMite with the PRED anatomy
// (mite.js); this is only the decision making.
//
// Biology behind the rules (labelled as such in the README):
// - Gamasid predators are fast, long-legged and hunt mostly by touch: leg I is
//   held up as a feeler, and they react to contact and to vibration close by.
// - Attacking an oribatid they go for the legs and soft parts first; a closed
//   (ptychoid) phthiracarid is a smooth, hard capsule and adults are nearly
//   immune (feeding trials with Pergamasus: Peschel et al. 2006; the capsule's
//   strength: Schmelzle & Blüthgen 2019). So: close up (B) and it gives up
//   after a few tries.
// - A nip back from the box mite making it recoil is a game rule.
import * as THREE from '../shared/vendor/three.module.min.js';

const TOUCH = 560;        // µm: senses the prey by touch / near contact
const VIBRATION = 950;    // µm: senses a scrambling prey
const LOSE = 1500;
const SPEED = 360;        // µm/s hunting (the player walks 210, scrambles 525)
const STRIKE = 250;       // µm from its chelicerae to the prey's body centre
const STRIKE_EVERY = 1.2;

export function createPredatorAI(pred, half) {
  const ai = {
    state: 'wander', t: 0, cool: 0, recoil: 0, tries: 0, bored: 0, ang: 0.6, dist: 9999,
    reset(x, z) { pred.place(x, z, 2.6); ai.state = 'wander'; ai.cool = 2; ai.tries = 0; ai.bored = 4; },
    /**
     * prey: { mite, closed (bool), speed }. nip: the prey bit at it this frame.
     * Returns { input for pred.update, events: ['hunt', 'legHit', 'blocked', 'givesUp', 'recoil', 'lost'] }.
     */
    step(dt, prey, nip) {
      const ev = [];
      ai.t += dt;
      ai.cool = Math.max(0, ai.cool - dt);
      ai.bored = Math.max(0, ai.bored - dt);
      const me = pred.center, them = prey.mite.center;
      const d = me.distanceTo(them);
      ai.dist = d;
      const mouth = pred.mouth(_m);
      const mouthD = mouth.distanceTo(them);
      if (nip && ai.state !== 'recoil') { ai.state = 'recoil'; ai.recoil = 1.5; ai.cool = 2; ev.push('recoil'); }
      const dir = _d.set(0, 0, 0);
      let mag = 0, maxSpeed = SPEED, accel = 0.18;
      switch (ai.state) {
        case 'wander': {
          ai.ang += (Math.sin(ai.t * 0.41) + Math.sin(ai.t * 0.97 + 2)) * 0.7 * dt;
          if (Math.hypot(me.x, me.z) > half * 0.8) ai.ang = Math.atan2(-me.z, -me.x);
          dir.set(Math.cos(ai.ang), 0, Math.sin(ai.ang));
          mag = 0.5; maxSpeed = SPEED * 0.6;
          const sensed = d < TOUCH || (d < VIBRATION && prey.speed > 260);
          if (sensed && ai.bored <= 0) { ai.state = 'hunt'; ev.push('hunt'); }
          break;
        }
        case 'hunt': {
          dir.subVectors(them, me);
          dir.y = 0; dir.normalize();
          mag = 1;
          if (d > LOSE) { ai.state = 'wander'; ev.push('lost'); break; }
          if (mouthD < STRIKE + 60) mag = 0.25; // close: feel about with leg I
          if (mouthD < STRIKE && ai.cool <= 0) {
            ai.cool = STRIKE_EVERY;
            pred.bite();
            if (prey.closed) {
              ai.tries++;
              ev.push('blocked');
              if (ai.tries >= 3) { ai.state = 'wander'; ai.bored = 14; ai.tries = 0; ai.ang += Math.PI; ev.push('givesUp'); }
            } else { ai.tries = 0; ev.push('legHit'); }
          }
          break;
        }
        case 'recoil': {
          ai.recoil -= dt;
          dir.subVectors(me, them); dir.y = 0; dir.normalize();
          mag = 1; accel = 0.05;
          if (ai.recoil <= 0) ai.state = d < TOUCH ? 'hunt' : 'wander';
          break;
        }
      }
      return { input: { dir: dir.clone(), mag, maxSpeed, hold: false, accel }, events: ev };
    },
  };
  return ai;
}
const _m = new THREE.Vector3(), _d = new THREE.Vector3();

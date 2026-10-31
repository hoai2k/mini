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
//   strength: Schmelzle & Blüthgen 2019). So: close up (Y) and it gives up
//   after a few tries.
// - A nip back from the box mite making it recoil is a game rule.
import * as THREE from '../shared/vendor/three.module.min.js';

const TOUCH = 480;        // µm (centre to centre): senses the prey by touch / near contact
const VIBRATION = 950;    // µm: senses a scrambling prey
const LOSE = 1500;
const SPEED = 600;        // µm/s hunting (the 0.35 mm player walks ~420, hurries ~590, scrambles ~750; game speeds)
const SCRAMBLE = 600;     // µm/s: prey moving faster than this is felt from VIBRATION away
const STRIKE = 200;       // µm from its chelicerae to the prey's body centre
const STRIKE_EVERY = 1.2;

const WINDUP = 0.8;        // s: the attack posture before each strike
const LUNGE = 0.3;         // s: the strike itself

/**
 * States, readable on screen:
 *   wander   calm: an easy walk, pausing to groom (leg I drawn through the
 *            chelicerae); ignores the prey
 *   hunt     low and fast, turned on the prey
 *   windup   it rears, leg I and the palps spread up, the chelicerae open: 0.8 s
 *   strike   the lunge; at its end a hit grabs a leg ('legHit'), a closed
 *            capsule turns it ('blocked')
 *   recover  a short pause after a strike
 *   recoil   staggered by a nip or a blocked strike
 *   retreat  out of interest (shared/predation.js createFight, in main.js):
 *            it runs off for a while ('gaveUp' at the end)
 */
export function createPredatorAI(pred, half) {
  const ai = {
    state: 'wander', t: 0, cool: 0, recoil: 0, tries: 0, bored: 0, ang: 0.6, dist: 9999, t2: 0, rear: 0, groom: 0, groomT: 5,
    reset(x, z) { pred.place(x, z, 2.6); ai.state = 'wander'; ai.cool = 2; ai.tries = 0; ai.bored = 4; ai.rear = 0; ai.t2 = 0; },
    get attacking() { return ai.state === 'windup' || ai.state === 'strike'; },
    /** A nip, or a blocked strike: stagger back. */
    repel() { ai.state = 'recoil'; ai.recoil = 1.3; ai.cool = 1.5; ai.t2 = 0; },
    /** Out of interest: run off. */
    retreat() { ai.state = 'retreat'; ai.t2 = 0; ai.rear = 0; },
    /**
     * prey: { mite, closed (bool), speed, hungry }.
     * Returns { input for pred.update, events: ['hunt', 'windup', 'strike', 'legHit', 'blocked', 'miss', 'lost', 'sated', 'gaveUp'] }.
     */
    step(dt, prey) {
      const ev = [];
      ai.t += dt; ai.t2 += dt;
      ai.cool = Math.max(0, ai.cool - dt);
      ai.bored = Math.max(0, ai.bored - dt);
      const me = pred.center, them = prey.mite.center;
      const d = me.distanceTo(them);
      ai.dist = d;
      const mouth = pred.mouth(_m);
      const mouthD = mouth.distanceTo(them);
      const dir = _d.set(0, 0, 0);
      let mag = 0, maxSpeed = SPEED, accel = 0.18, rear = 0;
      const toward = () => { dir.subVectors(them, me); dir.y = 0; dir.normalize(); };
      switch (ai.state) {
        case 'wander': {
          ai.ang += (Math.sin(ai.t * 0.41) + Math.sin(ai.t * 0.97 + 2)) * 0.7 * dt;
          if (prey.hungry !== false && d < 3000) {
            const want = Math.atan2(them.z - me.z, them.x - me.x);
            ai.ang += Math.atan2(Math.sin(want - ai.ang), Math.cos(want - ai.ang)) * Math.min(1, dt * 0.5);
          }
          if (Math.hypot(me.x, me.z) > half * 0.8) ai.ang = Math.atan2(-me.z, -me.x);
          dir.set(Math.cos(ai.ang), 0, Math.sin(ai.ang));
          // calm: an easy pace, stopping now and then to groom
          ai.groomT -= dt;
          if (ai.groomT <= 0) { ai.groom = 1.8; ai.groomT = 7 + Math.random() * 6; }
          if (ai.groom > 0) { ai.groom -= dt; mag = 0.02; } else { mag = 0.45; maxSpeed = SPEED * 0.45; }
          const sensed = d < TOUCH || (d < VIBRATION && prey.speed > SCRAMBLE); // a scramble, not a walk
          if (sensed && ai.bored <= 0 && prey.hungry !== false) { ai.state = 'hunt'; ai.groom = 0; ev.push('hunt'); }
          break;
        }
        case 'hunt': {
          toward(); mag = 1;
          if (d > LOSE) { ai.state = 'wander'; ev.push('lost'); break; }
          if (prey.hungry === false) { ai.state = 'wander'; ai.bored = 4; ai.ang += Math.PI; ev.push('sated'); break; }
          if (mouthD < STRIKE + 130) mag = 0.25;
          if (mouthD < STRIKE + 110 && ai.cool <= 0) { ai.state = 'windup'; ai.t2 = 0; ev.push('windup'); }
          break;
        }
        case 'windup': {
          toward(); mag = 0.03; accel = 0.3;
          rear = Math.min(1, ai.t2 / (WINDUP * 0.5));
          if (ai.t2 > WINDUP) { ai.state = 'strike'; ai.t2 = 0; ev.push('strike'); }
          break;
        }
        case 'strike': {
          toward(); mag = 1; maxSpeed = 1100; accel = 0.04;
          rear = Math.max(0, 1 - ai.t2 / (LUNGE * 0.5));
          if (ai.t2 > LUNGE) {
            ai.cool = STRIKE_EVERY; ai.t2 = 0;
            pred.bite();
            if (mouthD < STRIKE + 90 || (prey.closed && mouthD < STRIKE + 220)) {
              if (prey.closed) { ev.push('blocked'); ai.repel(); }
              else { ev.push('legHit'); ai.state = 'recover'; }
            } else { ev.push('miss'); ai.state = 'recover'; }
          }
          break;
        }
        case 'recover': {
          toward(); mag = 0.1;
          if (ai.t2 > 0.7) { ai.state = 'hunt'; ai.t2 = 0; }
          break;
        }
        case 'recoil': {
          ai.recoil -= dt;
          dir.subVectors(me, them); dir.y = 0; dir.normalize();
          mag = 1; accel = 0.05; rear = Math.max(0, 0.5 - ai.t2);
          if (ai.recoil <= 0) ai.state = prey.hungry !== false && d < TOUCH * 1.6 ? 'hunt' : 'wander';
          break;
        }
        case 'retreat': {
          dir.subVectors(me, them); dir.y = 0; dir.normalize();
          if (Math.hypot(me.x, me.z) > half * 0.8) dir.set(-me.x, 0, -me.z).normalize().lerp(dir, 0.3).normalize();
          mag = 1; maxSpeed = SPEED * 1.1;
          if (ai.t2 > 6) { ai.state = 'wander'; ai.bored = 14; ai.ang = Math.atan2(dir.z, dir.x); ev.push('gaveUp'); }
          break;
        }
      }
      ai.rear += (rear - ai.rear) * Math.min(1, dt * 12);
      return { input: { dir: dir.clone(), mag, maxSpeed, hold: false, accel }, events: ev };
    },
  };
  return ai;
}
const _m = new THREE.Vector3(), _d = new THREE.Vector3();

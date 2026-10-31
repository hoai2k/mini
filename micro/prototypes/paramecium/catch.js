// Being caught, shown: the predator's side of the catch sequence that main.js
// runs with shared/predation.js (strike → hold → eat → the "Eaten" card).
//
//  - Didinium: the proboscis touches and its toxicysts fire (strike); it
//    reels you in while you thrash (hold); then its mouth opens enormously
//    and you are drawn in whole while its body balloons round you (eat).
//    Didinium really does swallow a Paramecium larger than itself (S28, S56):
//    the cytostome gapes to the prey's width and the cell stretches round it.
//  - Amoeba proteus: the two arms of the food cup close over you (strike,
//    hold), then a food vacuole forms round you, is drawn into the cell and
//    its contents darken as digestion begins (eat).
//
// Every visible part uses the microscope's optic materials, so it shows in
// each technique and defocuses like everything else.
import * as THREE from '../shared/vendor/three.module.min.js';
import { volumeMaterial } from './optics.js';
import { LENGTH, WIDTH } from './cell.js';

const X = new THREE.Vector3(1, 0, 0);
const HL = LENGTH / 2;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const sstep = (a, b, x) => ease((x - a) / (b - a));

export function createCatchFx(scene, world, amoeba) {
  // --- Didinium's gape: a lip ring and the stretched oral cone, hidden until it eats ---
  const lipGeo = new THREE.TorusGeometry(1, 0.13, 10, 48);
  lipGeo.rotateY(Math.PI / 2); // the ring faces forward (+x)
  const coneGeo = new THREE.CylinderGeometry(1, 0.5, 1, 40, 1, false);
  coneGeo.rotateZ(-Math.PI / 2); // the wide end forward (+x)
  coneGeo.translate(-0.5, 0, 0); // the wide end at x = 0
  for (const d of world.didinia) {
    const lip = new THREE.Mesh(lipGeo, volumeMaterial({ dn: 0.045, scatter: 1.4, absorb: [0.003, 0.004, 0.007], centred: true }));
    const cone = new THREE.Mesh(coneGeo, volumeMaterial({ dn: 0.014, scatter: 0.9, absorb: [0.0012, 0.0016, 0.0026], centred: true, rimPow: 1.6 }));
    lip.visible = cone.visible = false;
    lip.frustumCulled = cone.frustumCulled = false;
    d.group.add(lip, cone);
    d.gapeFx = { lip, cone };
    d.gape = 0;
  }
  // how far it balloons to hold you (it is ≈130 µm long; P. caudatum is 230)
  const swellX = Math.max(1.3, (LENGTH * 0.62) / 95), swellR = Math.max(1.3, (WIDTH * 0.85) / 60);
  const gapeR = Math.max(52, WIDTH * 0.55 + 22);

  /** Open the mouth (0..1) and swell the body (0..1). */
  function didiniumGape(d, gape, swell) {
    d.gape = gape;
    const { lip, cone } = d.gapeFx;
    lip.visible = cone.visible = gape > 0.01;
    const R = 9 + (gapeR - 9) * gape;
    const x0 = 48 + 22 * gape;
    lip.position.set(x0, 0, 0); lip.scale.setScalar(R);
    cone.position.set(x0, 0, 0); cone.scale.set(14 + 34 * gape, R, R);
    const sx = 1 + (swellX - 1) * swell, sr = 1 + (swellR - 1) * swell;
    d.group.scale.set(sx, sr, sr);
  }

  // --- the amoeba's food vacuole round you ---
  const vac = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), volumeMaterial({ dn: -0.006, scatter: 1.2, absorb: [0.0003, 0.0003, 0.0004], centred: true, rimPow: 1.3 }));
  vac.visible = false; vac.frustumCulled = false;
  scene.add(vac);
  const DARK = new THREE.Vector3(0.0075, 0.0068, 0.0046); // digestion: the contents go brown-grey

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const qIn = new THREE.Quaternion();
  const out = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1) };

  return {
    didiniumGape,
    /**
     * The eat phase, e = 0..1. `from` and `fromQ` are where the cell was when
     * the hold ended. Returns the cell's transform for this frame.
     */
    eatDidinium(d, e, from, fromQ) {
      const gape = sstep(0, 0.32, e);
      const draw = sstep(0.22, 0.95, e);
      didiniumGape(d, gape, draw);
      // line up behind the open mouth, front first, then slide in
      qIn.setFromUnitVectors(X, tmp2.copy(d.dir).negate());
      const sx = 1 + (swellX - 1) * draw;
      const mouth = tmp.copy(d.pos).addScaledVector(d.dir, (48 + 22 * gape) * sx);
      const start = mouth.clone().addScaledVector(d.dir, HL * 0.95);
      const end = tmp2.copy(d.pos).addScaledVector(d.dir, -6 * sx);
      const line = sstep(0, 0.25, e);
      out.pos.copy(from).lerp(start, line).lerp(end, draw);
      out.quat.copy(fromQ).slerp(qIn, line);
      // squeezed as it goes in: the Didinium stretches round it
      out.scale.set(1 - 0.42 * draw, 1 - 0.2 * draw, 1 - 0.2 * draw);
      return out;
    },
    /** The amoeba's eat phase: the vacuole forms round you and is drawn into the cell. */
    eatAmoeba(e, from, fromQ) {
      const form = sstep(0, 0.35, e), pull = sstep(0.2, 0.9, e), dark = sstep(0.45, 1, e);
      const inside = tmp.set(amoeba.pos.x, amoeba.H * 0.9, amoeba.pos.z);
      tmp2.subVectors(from, inside).setY(0);
      const d = tmp2.length() || 1;
      tmp2.multiplyScalar(Math.min(d, amoeba.R * 0.35) / d).add(inside);
      out.pos.copy(from).lerp(tmp2, pull);
      out.quat.copy(fromQ);
      const k = 1 - 0.18 * dark;
      out.scale.set(k, k, k);
      vac.visible = true;
      vac.position.copy(out.pos);
      // a loose bubble that closes and tightens round you
      const R = (HL * 1.35 - HL * 0.3 * form) * (1 - 0.1 * dark);
      vac.scale.set(R, Math.min(R, amoeba.H * 0.9 + 8), R * (WIDTH / LENGTH + 0.45));
      vac.quaternion.copy(fromQ);
      const u = vac.material.uniforms;
      u.uAbsorb.value.set(0.0003, 0.0003, 0.0004).lerp(DARK, dark);
      u.uDn.value = -0.006 * form + 0.012 * dark;
      return out;
    },
    reset() {
      for (const d of world.didinia) { didiniumGape(d, 0, 0); }
      vac.visible = false;
    },
  };
}

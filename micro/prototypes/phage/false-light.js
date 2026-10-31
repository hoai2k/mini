// Branch prototype: a real-time material/lighting study, sharing the existing
// phage simulation and geometry. The old looks remain selectable.
import * as THREE from '../shared/vendor/three.module.min.js';
import { goodsellShared, toonMaterial } from '../shared/techniques/phage-goodsell.js';

function role(object, kind) {
  object.traverse((o) => {
    for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
      if (mat?.uniforms?.uSurfaceKind) mat.uniforms.uSurfaceKind.value = kind;
    }
  });
}

function membrane() {
  const group = new THREE.Group(); group.name = 'false-light-membrane';
  const count = 64 * 7 * 4;
  const mat = toonMaterial({ color: '#8ccbd1' });
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 2), mat, count);
  const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.32, 8, 5), mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);
  let i = 0;
  // Two membranes, each with an outer and inner row of phospholipid heads.
  for (const level of [65, 94]) for (const side of [-1, 1]) for (let x = 0; x < 64; x++) for (let z = 0; z < 7; z++) {
    const px = (x - 31.5) * 6.5, pz = (z - 3) * 5.1 - 8;
    const wave = Math.sin(px * 0.018) * 2.5 + Math.cos(pz * 0.11 + px * 0.025) * 1.0;
    const y = level + wave + side * 5;
    m.compose(new THREE.Vector3(px, y, pz), q, scale); heads.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(px, level + wave, pz), q, scale); tails.setMatrixAt(i++, m);
  }
  group.add(heads, tails);
  return group;
}

export function createFalseLight({ scene, world, inside, progeny }) {
  for (const o of scene.children) role(o, 3);
  const hostGeometry = new Map();
  for (const h of world.hosts) {
    role(h.group, 0);
    const detailed = new THREE.CapsuleGeometry(h.r, h.half * 2, 24, 96);
    detailed.rotateZ(Math.PI / 2);
    const p = detailed.attributes.position, n = detailed.attributes.normal;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const ridge=Math.sin(x*.57+y*.43+Math.sin(z*.26))*Math.sin(z*.62-x*.31);
      const grain=Math.sin(x*1.4+z*.9)*Math.cos(y*1.15-z*.7);
      const displacement=ridge*.70+grain*.15;
      p.setXYZ(i,x+n.getX(i)*displacement,y+n.getY(i)*displacement,z+n.getZ(i)*displacement);
    }
    detailed.computeVertexNormals();
    hostGeometry.set(h,{original:h.body.geometry,detailed});
  }
  for (const p of world.proteins) role(p.model, p.compatible ? 5 : 6);
  role(world.amoeba.mesh, 6);
  role(progeny, 1);
  role(inside.scene, 3);
  const objects = inside.renderObjects;
  role(objects.dnaBeads, 2); role(objects.tipGlow, 2);
  role(objects.tube, 1); role(objects.plate, 1);
  for (const enzyme of inside.enzymes) role(enzyme.g, 4);

  const bilayer = membrane(); inside.scene.add(bilayer);
  const wires = new WeakMap();
  const distant = new THREE.Group(); distant.name = 'distant-host-scenery';
  for (const [x,y,z,angle] of [[-145,10,-185,-0.6],[100,55,-240,0.65]]) {
    const host = new THREE.Mesh(new THREE.CapsuleGeometry(38,105,12,32), toonMaterial({ color: '#458da4', wobble: 0.8 }));
    host.rotation.z = angle; host.position.set(x,y,z); distant.add(host);
    const bumps = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.3,1), toonMaterial({ color: '#68abbc' }),180);
    const mx = new THREE.Matrix4(), qt = new THREE.Quaternion(), scale = new THREE.Vector3(1,1,1);
    for(let i=0;i<180;i++) {
      const phi=i*2.39996, u=((i*0.618034)%1-.5)*100;
      mx.compose(new THREE.Vector3(Math.cos(phi)*39,u,Math.sin(phi)*39),qt,scale);bumps.setMatrixAt(i,mx);
    }
    host.add(bumps);
  }
  scene.add(distant);
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), toonMaterial({ color: '#a2d4df' }), 650);
  dust.material.uniforms.uSurfaceKind.value = 3;
  dust.material.uniforms.uEmissive.value = 0.15;
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion();
  // Stable positions: no new random lighting flicker while the camera moves.
  for (let i = 0; i < dust.count; i++) {
    const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    matrix.compose(new THREE.Vector3(-300 + hash(i) * 800, -260 + hash(i + 650) * 540, -150 + hash(i + 1300) * 180), q,
      new THREE.Vector3().setScalar(0.12 + hash(i + 1950) * 0.45));
    dust.setMatrixAt(i, matrix);
  }
  scene.add(dust);
  return {
    setEnabled(on, members) {
      goodsellShared.uFalseLight.value = on ? 1 : 0;
      bilayer.visible = dust.visible = distant.visible = on;
      objects.section.visible = !on;
      for(const [host,geometry] of hostGeometry) host.body.geometry = on ? geometry.detailed : geometry.original;
      for (const member of members) {
        const t4 = member.t4;
        role(t4.group, 1); role(t4.fibreMesh, 1); role(t4.dna, 3);
        if (!wires.has(t4)) {
          const wire = new THREE.LineSegments(new THREE.EdgesGeometry(t4.head.geometry, 10),
            new THREE.LineBasicMaterial({ color: new THREE.Color(2.0, 1.05, 0.28), transparent: true, opacity: 0.8 }));
          wire.name = 'capsid-facets'; t4.head.add(wire); const caps = new THREE.InstancedMesh(t4.caps.geometry, t4.caps.material, t4.caps.count);
          const matrix = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), scale = new THREE.Vector3();
          for(let i=0;i<caps.count;i++) { t4.caps.getMatrixAt(i,matrix); matrix.decompose(pos,q,scale); scale.multiplyScalar(0.35);matrix.compose(pos,q,scale);caps.setMatrixAt(i,matrix); }
          t4.head.add(caps); wires.set(t4, { wire, caps });
        }
        const { wire, caps } = wires.get(t4);
        wire.visible = caps.visible = on;
        t4.caps.visible = !on;
        const translucent = t4.state.capsid === 'translucent';
        t4.materials.headMat.uniforms.uOpacity.value = translucent ? (on ? 0.30 : 0.32) : 1;
        t4.materials.capsMat.uniforms.uOpacity.value = translucent ? (on ? 0.6 : 0.32) : 1;
        wire.material.clippingPlanes = t4.materials.headMat.clippingPlanes;
        if (members.length > 1) {
          role(t4.sheath, 4); // retain the existing player's sheath colour
          wire.material.color.set(member.color).multiplyScalar(2);
        } else wire.material.color.setRGB(2.0, 1.05, 0.28);
      }
      // The enzyme population is recreated at each injection.
      for (const enzyme of inside.enzymes) role(enzyme.g, 4);
    },
  };
}

// The opening's cutscenes (story/opening.js says when each plays):
//   bus     the school bus drives up Central Park West to the American
//           Museum of Natural History, and the class gets out
//   summer  after the museum: summer at Montauk, Grover at the door in the
//           storm, the drive to Long Island, the lightning
//   wake    after the Minotaur: Percy wakes on the porch of the Big House;
//           Annabeth and Chiron; Camp Half-Blood
// Each builds its set in the engine (world/cutsceneSets.js, or camp itself)
// and returns its shots for story/cutscene.js. The pictures shown inside the
// shots are story cards under assets/cards/ (requested in
// design/image-requests.md; a missing one is simply left out).
import * as THREE from 'three/webgpu';
import { BIOMES } from '../world/biomes.js';
import { buildAvenueSet, buildMontaukSet } from '../world/cutsceneSets.js';
import { schoolBus, camaro, taxi, car, spin } from '../world/vehicles.js';
import { buildHeroModel, buildNpc } from '../entities/models.js';
import { buildMortal } from '../entities/mortals.js';
import { move, follow } from './cutscene.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (k) => k * k * (3 - 2 * k);

// A figure in a cutscene: a rig that can stand, turn and walk to a point.
// While it walks it follows the ground of the set (game.world): a step up is
// a little hop onto the next block, a step down a short drop, so nobody
// glides up the museum steps; a figure that stands still keeps its height
// (Percy lying on the chair).
const GRAV = 30;
function actor(game, rig, pos, yaw = 0) {
  rig.root.position.copy(pos); rig.root.rotation.order = 'YXZ'; rig.root.rotation.y = yaw;   // (turn, then lie back)
  game.scene.add(rig.root);
  const a = { rig, pos: pos.clone(), yaw, to: null, speed: 3.2, vel: new THREE.Vector3(), lie: 0, vy: 0, air: false };
  a.walk = (to, speed = 3.2) => { a.to = to.clone(); a.speed = speed; };
  a.face = (yaw) => { a.yaw = yaw; };
  // the standing height under (x, z): the top of the highest solid block at most a step above y
  const groundAt = (x, z, y) => { const w = game.world; const gy = w?.groundBelow?.(x, z, y + 1.2); return Number.isFinite(gy) ? gy : y; };
  const d = new THREE.Vector3();
  a.update = (dt) => {
    let sp = 0;
    if (a.to) {
      d.subVectors(a.to, a.pos); d.y = 0;
      const L = d.length();
      if (L < 0.08) { a.to = null; a.vel.set(0, 0, 0); }
      else {
        d.normalize();
        // the ground just ahead: a step up starts a hop before the feet reach the riser
        const ahead = groundAt(a.pos.x + d.x * 0.4, a.pos.z + d.z * 0.4, a.pos.y);
        if (!a.air && ahead > a.pos.y + 0.05) { a.air = true; a.vy = Math.sqrt(2 * GRAV * (ahead - a.pos.y + 0.18)); }
        const step = Math.min(L, a.speed * dt);
        a.vel.copy(d).setLength(a.speed); a.pos.addScaledVector(d, step); a.yaw = Math.atan2(d.x, d.z); sp = Math.min(1, a.speed / 4);
      }
    }
    if (a.to || a.air) {
      const g = groundAt(a.pos.x, a.pos.z, a.pos.y);
      if (!a.air && g < a.pos.y - 0.05) { a.air = true; a.vy = 0; }   // off the edge of a step: drop
      if (a.air) {
        a.vy -= GRAV * dt; a.pos.y += a.vy * dt;
        const land = Math.max(g, groundAt(a.pos.x, a.pos.z, a.pos.y + Math.max(0, -a.vy * dt)));
        if (a.vy <= 0 && a.pos.y <= land) { a.pos.y = land; a.air = false; a.vy = 0; }
      } else a.pos.y = g;
    }
    rig.root.position.copy(a.pos);
    rig.root.rotation.y += Math.atan2(Math.sin(a.yaw - rig.root.rotation.y), Math.cos(a.yaw - rig.root.rotation.y)) * Math.min(1, dt * 10);
    rig.root.rotation.x = -a.lie * Math.PI / 2;
    rig.root.position.y = a.pos.y + a.lie * 0.62;
    rig.animate({ dt, speed: sp, vel: a.vel });
  };
  a.dispose = () => game.scene.remove(rig.root);
  return a;
}
// the heroes of the party (the player's own first), as cutscene figures
function partyHeroes(game) {
  const out = [], seen = new Set();
  const order = [...game.players.filter((p) => !p.ai && !p.remote), ...game.players.filter((p) => p.ai || p.remote)];
  for (const p of order) if (!seen.has(p.hero)) { seen.add(p.hero); out.push(p.hero); }
  if (!out.length) out.push('percy');
  return out.slice(0, 4);
}
function hidePlayers(game) { for (const p of game.players) p.object.visible = false; }
function setLevel(game, L, biome) {
  game.clearLevel();
  game.loadWorld(L, biome);
  game.minimap.level = null; game.hud.mini.classList.add('hidden');
  game.audio.overrideMusic = null; game.audio.setMusic(biome.music);
  game.placePlayers(L.spawn);
  hidePlayers(game);
}

// The bus cutscene's last shot of the bus (at the museum steps) and when its lettering starts to settle:
// English (settled after GREEK.sign's 1.1 s) about two seconds before the cut.
export const BUS_LAST = 7, BUS_READ = BUS_LAST - 2 - 1.1;

export const CUTSCENES = {
  // ------------------------------------------------------------------ the bus to the museum
  bus: {
    id: 'bus', music: 'cutscene-journey', title: 'The field trip',
    build(game) {
      const L = buildAvenueSet();
      setLevel(game, L, BIOMES.manhattan);
      const bus = schoolBus(); bus.rotation.y = -Math.PI / 2; bus.position.copy(L.busFrom); game.scene.add(bus);
      // the bus's lettering is all Greek letters through every shot of the bus, and settles into English
      // only near the end of the last one (BUS_READ), with about two seconds to read it before the cut
      for (const s of bus.userData.signs) { s.reset(); game.signs?.add(s); }
      const readBus = () => { for (const s of bus.userData.signs) s.read(); };
      // traffic: taxis in the other lanes
      const traffic = [taxi(), car(0x2a5a6a), taxi(), car(0x7a2a2a), taxi()].map((t, i) => { t.rotation.y = i % 2 ? Math.PI / 2 : -Math.PI / 2; t.position.set(i % 2 ? 37.5 : 34, L.FY, 20 + i * 40); game.scene.add(t); return { t, v: i % 2 ? -9 : 7.5 }; });
      const parked = [taxi(), car(0x3a3a6a)].map((t, i) => { t.rotation.y = -Math.PI / 2; t.position.set(30.2, L.FY, L.MC + 14 + i * 9); game.scene.add(t); return t; });   // (parked past the bus stop: never in the bus's way)
      const heroes = partyHeroes(game);
      const actors = [];
      const door = () => V(bus.position.x - 1.9, L.FY, bus.position.z + 2.3);
      const dodds = actor(game, buildMortal('teacher'), L.dodds, -Math.PI / 2); actors.push(dodds);
      const kids = [], hs = [];
      for (let i = 0; i < 6; i++) { const a = actor(game, buildMortal('student'), V(30, -50, 0)); a.rig.root.visible = false; kids.push(a); actors.push(a); }
      for (const id of heroes) { const a = actor(game, buildHeroModel(id), V(30, -50, 0)); a.rig.root.visible = false; hs.push(a); actors.push(a); }
      let busZ = L.busFrom.z, busV = 0;
      const drive = (toZ, dt, max = 11) => {   // ease the bus along the avenue to toZ
        const d = toZ - busZ; const want = Math.sign(d) * Math.min(max, Math.abs(d) * 1.2);
        busV += (want - busV) * Math.min(1, dt * 1.6);
        const step = busV * dt; busZ += step; bus.position.z = busZ; spin(bus, step);
        bus.position.y = L.FY + Math.sin(game.time * 18) * 0.015 * Math.min(1, Math.abs(busV) / 4);
      };
      // everyone gets out, one after another (on the cutscene's clock), and heads for the steps
      const order = [kids[0], kids[1], hs[0], kids[2], ...hs.slice(1), kids[3], kids[4], kids[5]].filter(Boolean);
      const unload = (t) => order.forEach((a, i) => {
        const t0 = 0.3 + i * 0.45;
        if (t >= t0 && !a.out) {
          a.out = true; a.pos.copy(door()); a.rig.root.visible = true;
          a.lane = ((i % 3) - 1) * 1.4;
          a.walk(V(25.2, L.FY, a.pos.z - 1 + a.lane * 0.5), 3.4);
        }
        if (a.out && !a.up && t >= t0 + 0.8) { a.up = true; a.walk(i < 4 ? V(14.6 - (i % 2), L.top, L.MC + 5 + a.lane * 0.6) : V(21.5 - (i % 3) * 0.8, L.FY, L.MC + 3.5 + a.lane), 2.6); }   // (up on the terrace clear of the close-up of Mrs. Dodds; y follows the steps)
      });
      const shots = [
        { dur: 5.8, fadeIn: 'black',
          cam: move({ pos: [66, 30, -6], look: [34, 4, 30] }, { pos: [54, 16, 26], look: [32, 5, 52] }, { fov: 40, fov2: 36 }),
          lines: [{ at: 0.3, text: 'Yancy Academy’s field trip: twenty-eight kids, one yellow school bus, and New York in the morning.' }],
          card: { src: 'assets/cards/scene-field-trip.jpg', at: 0.6, dur: 4.8 },
          act: (k, dt) => drive(L.busFrom.z + 80, dt) },
        { dur: 6,
          cam: follow(bus, [15, 5, -10], [-2, 1.6, 2], { offset2: [13, 4.2, 7], fov: 42 }),
          lines: [{ at: 0.2, text: 'Grover sits next to you, chewing on an apple core. Nancy Bobofit throws bits of sandwich at his head.' }],
          card: { src: 'assets/cards/scene-bus-ride.jpg', at: 0.4, dur: 5.2, side: 'left' },   // (left: clear of the lettering on the bus)
          act: (k, dt) => drive(L.MC - 40, dt) },
        { dur: 5.4,
          cam: move({ pos: [52, 8, L.MC + 42], look: [16, 9, L.MC + 2] }, { pos: [50, 14, L.MC + 30], look: [14, 12, L.MC] }, { fov: 46 }),
          lines: [{ at: 0.4, text: 'The American Museum of Natural History. Mr. Brunner promised Greek and Roman treasures.' }],
          act: (k, dt) => drive(L.busStop.z, dt, 9) },
        { dur: BUS_LAST,
          cam: move({ pos: [17.5, L.top + 3.2, L.MC - 6], look: [27, L.FY + 1.2, L.MC + 5] }, { pos: [16.5, L.top + 3.8, L.MC - 9], look: [22, L.FY + 1.6, L.MC + 4] }, { fov: 42 }),
          lines: [{ at: 0.8, text: 'Everybody off. Up the steps, past the columns, toward the old marble and bronze.' }],
          card: { src: 'assets/cards/scene-museum-steps.jpg', at: 2.2, dur: 4 },
          act: (k, dt, t) => { drive(L.busStop.z, dt, 4); unload(t); if (t >= BUS_READ) readBus(); } },
        { dur: 6, fadeOut: 'black',
          cam: move({ pos: [21, L.top + 2.2, L.MC + 2], look: [L.dodds.x, L.top + 1.6, L.dodds.z] }, { pos: [18.6, L.top + 1.9, L.MC + 0.6], look: [L.dodds.x, L.top + 1.7, L.dodds.z] }, { fov: 34, fov2: 28 }),
          enter: () => dodds.face(Math.atan2(20 - L.dodds.x, L.MC + 2 - L.dodds.z)),
          lines: [{ at: 0.2, text: 'And Mrs. Dodds, your pre-algebra teacher, is watching you, as if you have done something terrible.' }] },   // (the one time her stare is told)
      ];
      return {
        shots, actors,   // (actors: the figures, for the checks)
        update: (t, dt) => {
          for (const a of actors) a.update(dt);
          for (const tr of traffic) { tr.t.position.z += tr.v * dt; spin(tr.t, Math.abs(tr.v) * dt); if (tr.t.position.z > 205) tr.t.position.z = -5; if (tr.t.position.z < -5) tr.t.position.z = 205; }
        },
        dispose: () => { for (const a of actors) a.dispose(); for (const o of [bus, ...traffic.map((x) => x.t), ...parked]) game.scene.remove(o); },
      };
    },
  },
  // ------------------------------------------------------------------ summer, the storm, the drive
  summer: {
    id: 'summer', music: 'cutscene-storm', title: 'Summer, and a storm',
    build(game) {
      const L = buildMontaukSet();
      setLevel(game, L, BIOMES.storm_hill);
      const actors = [];
      const grover = actor(game, buildHeroModel('grover'), V(46, L.FY, 56), -Math.PI / 2); grover.rig.root.visible = false; actors.push(grover);
      // Percy in the doorway, Mom just behind him: both seen through the door from outside (they stood inside, behind the wall)
      const percy = actor(game, buildHeroModel('percy'), V(L.door.x + 0.7, L.FY, L.door.z), -Math.PI / 2); actors.push(percy);
      const mom = actor(game, buildMortal('tourist'), V(L.door.x + 1.8, L.FY, L.door.z - 0.3), -Math.PI / 2); actors.push(mom);
      const cm = camaro(); cm.position.set(46, L.FY, 60.5); cm.rotation.y = 0; game.scene.add(cm);
      // the drive: along the road, then up toward the hill
      const pts = L.road; const segs = []; let total = 0;
      for (let i = 0; i < pts.length - 1; i++) { const len = pts[i].distanceTo(pts[i + 1]); segs.push({ a: pts[i], b: pts[i + 1], len, s0: total }); total += len; }
      let s = 0;
      const place = (dist) => {
        const sg = segs.find((x) => dist <= x.s0 + x.len) ?? segs[segs.length - 1];
        const f = Math.min(1, (dist - sg.s0) / sg.len);
        cm.position.lerpVectors(sg.a, sg.b, f); cm.position.y = L.FY;
        const yaw = Math.atan2(sg.b.x - sg.a.x, sg.b.z - sg.a.z) - Math.PI / 2;
        cm.rotation.y += Math.atan2(Math.sin(yaw - cm.rotation.y), Math.cos(yaw - cm.rotation.y)) * 0.15;
      };
      const flash = (big = false) => {
        const f = game.rig.camera.position.clone().add(V(-10, 14, -12));
        game.fx?.flash?.(0xd8e8ff, big ? 0.9 : 0.4, big ? 0.5 : 0.2);
        game.lights?.flash?.(f, new THREE.Color(0xc8d8ff), big ? 60 : 30, 80, 0.3);
        game.bolts?.spawn?.(f, { count: big ? 5 : 3, length: 12, life: 0.3 });
        setTimeout(() => { if (!game.audio?.sample?.('thunder', { gain: big ? 0.9 : 0.6 })) game.audio?.impact?.(big ? 1.4 : 0.8); }, big ? 60 : 400);
      };
      let flashT = 1.2;
      const shots = [
        { dur: 5.4, fadeIn: 'black',
          cam: move({ pos: [10, 12, 82], look: [38, 4, 55] }, { pos: [16, 9, 72], look: [38, 4, 56] }, { fov: 42 }),
          lines: [{ at: 0.3, text: 'Summer. Mom takes you to the cabin at Montauk, on the beach where she met your father.' }] },
        { dur: 6.8,
          enter: () => { grover.rig.root.visible = true; grover.pos.set(L.door.x - 7, L.FY, L.door.z + 2); grover.walk(V(L.door.x - 1.6, L.FY, L.door.z), 4.6); flash(); },
          cam: move({ pos: [L.door.x - 6.5, L.FY + 3.2, L.door.z + 3.5], look: [L.door.x + 0.2, L.FY + 1.3, L.door.z] }, { pos: [L.door.x - 5.5, L.FY + 2.8, L.door.z + 3], look: [L.door.x + 0.3, L.FY + 1.4, L.door.z] }, { fov: 40 }), noFrame: true,   // (through the door, a metre clear of Grover: framed by hand)
          lines: [{ at: 0.6, text: 'In the middle of the night, in a storm, someone bangs on the door. Grover. He has no trousers on. He has hooves.' }],
          card: { src: 'assets/cards/scene-montauk.jpg', at: 1.2, dur: 5 } },
        { dur: 5.8,
          enter: () => { grover.rig.root.visible = false; percy.rig.root.visible = false; mom.rig.root.visible = false; s = 0; },
          cam: follow(cm, [-11, 6.5, 9], [4, 0.8, -3], { offset2: [-9, 5.5, -9], fov: 44 }),
          lines: [{ at: 0.2, text: '“Something is following us!” Mom drives the old Camaro into the storm, as fast as it will go.' }],
          act: (k, dt) => { const v = 9; s = Math.min(total, s + v * dt); place(s); spin(cm, v * dt); } },   // (9 m/s: the road lasts both shots)
        { dur: 5.6, fadeOut: 'white',
          cam: move({ pos: [68, 9, 44], look: [82, 5, 26] }, { pos: [72, 8, 36], look: [80, 7, 14] }, { fov: 42, fov2: 36 }),
          card: { src: 'assets/cards/scene-storm-drive.jpg', at: 0.4, dur: 3 },
          lines: [{ at: 0.2, text: 'Toward a hill on Long Island, and a great pine tree at the top. Then the lightning hits.' }],
          act: (k, dt, t) => { const v = Math.max(0, 9 * (1 - t / 5)); s = Math.min(total - 2, s + v * dt); place(s); spin(cm, v * dt); if (t > 4.3 && !cm.userData.hit) { cm.userData.hit = true; flash(true); } } },
      ];
      return {
        shots, actors,   // (actors: the figures, for the checks)
        update: (t, dt) => { for (const a of actors) a.update(dt); flashT -= dt; if (flashT < 0) { flashT = 3 + Math.random() * 4; flash(); } },
        dispose: () => { for (const a of actors) a.dispose(); game.scene.remove(cm); },
      };
    },
  },
  // ------------------------------------------------------------------ waking at the Big House
  wake: {
    id: 'wake', music: 'cutscene-camp', title: 'Camp Half-Blood',
    build(game) {
      game.loadHub();
      game.mode = 'cutscene';
      hidePlayers(game);
      const L = game.level;
      // the hub's own Chiron steps aside for the cutscene's
      const hidden = game.hubProps.filter((o) => o.position.distanceTo(L.chiron) < 3);   // (Chiron and Mr. D)
      for (const o of hidden) o.visible = false;
      const porchY = L.chiron.y, pz = L.chiron.z;
      const actors = [];
      // on the lawn below the porch steps (the porch itself is too narrow for a camera)
      const gy = porchY - 1;
      const me = actor(game, buildHeroModel('percy'), V(58.2, gy + 0.35, 92.2), Math.PI / 2); me.lie = 1; actors.push(me);
      const ann = actor(game, buildHeroModel('annabeth'), V(59.3, gy, 93.1), -1.05); actors.push(ann);
      const chi = actor(game, buildNpc('chiron'), V(64.5, gy, 90.6), -Math.PI / 2); actors.push(chi);
      const chair = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1), new THREE.MeshStandardNodeMaterial({ color: 0x6a4a2a, roughness: 0.8 }));
      chair.position.set(57.2, gy + 0.2, 92.2); chair.castShadow = true; game.scene.add(chair);
      const shots = [
        { dur: 7, fadeIn: 'white',
          cam: move({ pos: [84, 34, 132], look: [54, 9, 90] }, { pos: [66, 20, 110], look: [52, 9, 88] }, { fov: 42 }),
          lines: [{ at: 0.4, text: 'You wake up on a porch, in the sun. Somebody is spooning something into your mouth. It tastes like your mom’s cookies.' }] },
        { dur: 6.3,
          cam: move({ pos: [55.2, gy + 2.8, 98.2], look: [58, gy + 0.7, 92.4] }, { pos: [55.8, gy + 2.4, 97.2], look: [58.1, gy + 0.8, 92.4] }, { fov: 40 }),
          lines: [{ at: 0.3, text: '“You drool when you sleep,” says a girl with curly blond hair and storm-grey eyes. Her name is Annabeth.' }],
          card: { src: 'assets/cards/scene-big-house.jpg', at: 0.5, dur: 5 } },
        { dur: 6.6,
          enter: () => { chi.walk(V(60.6, gy, 92.6), 2.4); },
          act: (k) => { me.lie = Math.max(0, 1 - Math.max(0, k - 0.12) * 6); if (me.lie === 0 && !me.stood) { me.stood = true; me.pos.set(57.9, gy, 93.1); me.yaw = Math.atan2(60.6 - 57.9, 92.6 - 93.1); } },   // (gets up beside the chair, facing Chiron: no jump across the lawn)
          cam: move({ pos: [55.2, gy + 3.3, 97.8], look: [59, gy + 1.7, 92.4] }, { pos: [55.7, gy + 3.1, 97], look: [59.2, gy + 1.8, 92.4] }, { fov: 44 }),   // (Chiron's head in frame; the cabin wall at x 60 kept to the edge)
          lines: [{ at: 0.3, text: 'And Mr. Brunner, your Latin teacher, trots over on four white legs. He is half horse. “Call me Chiron,” he says.' }] },
        { dur: 5.6, fadeOut: 'black',
          cam: move({ pos: [54, porchY + 3, pz + 6], look: [54, 8, pz + 30] }, { pos: [54, 34, pz - 6], look: [54, 6, pz + 36] }, { fov: 40, fov2: 48 }),
          lines: [{ at: 0.3, text: 'Welcome to Camp Half-Blood: the one place in the world where kids like you are safe.' }] },
      ];
      return {
        shots, actors,   // (actors: the figures, for the checks)
        update: (t, dt) => { for (const a of actors) a.update(dt); },
        dispose: () => { for (const a of actors) a.dispose(); game.scene.remove(chair); for (const o of hidden) o.visible = true; },
      };
    },
  },
};

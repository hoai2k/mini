// The Road West, alive (world/roadtrip.js builds it): the roadblocks that
// open when their chapter is done, the rides (the train over the river and
// across the plains, the zoo truck through the Rockies tunnel), the taxi you
// drive across the Nevada desert, and the Greyhound between camp and the
// road's east end (CampBusStop runs the camp's end of it).
//
// While a vehicle carries the heroes, each one's `vehicle` is set and
// Player.update hands over to vehicle.carry (entities/player.js): the hero
// rides along hidden, and the camera follows as usual.
//
// What a save has done here lives in save.data.rt:
//   opened  { roadblockId: true }   roadblocks seen opening
//   rides   { rideId: 'from' | 'to' } which end each vehicle waits at
//   taxi    { x, z, yaw }           where the taxi was parked
//   way     waystoneId              the last waystone passed (Continue starts there)
import * as THREE from 'three/webgpu';
import { toast } from '../ui/ui.js';
import { t } from '../text_config.js';
import { B } from '../world/blocks.js';
import { greyhound, train, zooTruck, taxi, spin } from '../world/vehicles.js';
import { rtRegionAt, ROAD_Z, RAIL_Z } from '../world/rtLayout.js';
import { openQuestStart } from '../story/questMarkers.js';
import { chapter as chapterDef } from '../story/chapters.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (c, o = {}) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: o.r ?? 0.6, metalness: o.m ?? 0, emissive: o.e ?? 0, emissiveIntensity: o.ei ?? 0, transparent: !!o.op, opacity: o.op ?? 1 });
const boxIn = (g, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const placeName = (x) => t(`regions.${rtRegionAt(x, ROAD_Z)?.id}.name`);

export class RoadTrip {
  constructor(game, L) {
    this.game = game; this.L = L; this.props = []; this.blocks = []; this.rides = []; this.ride = null; this.car = null; this.hintT = 0; this.told = new Set();
  }
  get data() {
    const d = this.game.save.data;
    d.rt ??= {};
    for (const k of ['opened', 'rides']) d.rt[k] ??= {};
    return d.rt;
  }
  addProp(o) { this.game.scene.add(o); this.props.push(o); return o; }
  // ---------------------------------------------------------------- setup
  setup({ arrive = null } = {}) {
    const g = this.game, L = this.L;
    for (const rb of L.roadblocks) this.makeBlock(rb);
    for (const r of L.rides) this.makeRide(r);
    this.makeTaxi(L.drive);
    // the Greyhound at the bus stop: back to camp
    const bus = greyhound(); bus.position.copy(L.busStop).add(V(2, 0, -2.6)); bus.rotation.y = Math.PI;
    this.addProp(bus); this.bus = bus;
    g.interactables.push({ id: 'rt-bus', pos: L.busStop, radius: 3.2, label: t('rt.bus.boardHome'), action: () => this.busHome(), enabled: () => !this.ride && !this.car?.driver && !g.online?.isGuest });
    if (arrive === 'bus') this.busArrives();
  }
  dispose() {
    const g = this.game;
    for (const p of g.players) if (p.vehicle) this.unboard(p);
    for (const o of this.props) { g.scene.remove(o); g.releaseLater?.(o); }
    this.props = [];
    g.rig.extraDist = 0;
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game;
    if (g.mode !== 'hub' || g.state !== 'playing' || g.cutscene) return;
    for (const rb of this.blocks) this.updateBlock(rb, dt);
    if (this.ride) this.updateRide(dt);
    if (this.car) this.updateCar(dt);
    // remember the last waystone passed, and say why the way is shut at a gate
    this.hintT -= dt;
    if (this.hintT <= 0) {
      this.hintT = 0.5;
      const lead = g.players.find((p) => !p.ai && !p.remote && !p.dead);
      if (!lead) return;
      const w = g.ow?.reg.waystones.find((q) => g.ow.data.ways[q.id] && q.pos.distanceTo(lead.pos) < 9);
      if (w) this.data.way = w.id;
      if (!lead.vehicle) for (const gx of this.L.gates) {
        if (Math.abs(lead.pos.x - (gx + 0.5)) > 2.6) continue;
        const r = rtRegionAt(gx, ROAD_Z), key = 'gate' + gx;
        if (this.told.has(key)) continue;
        this.told.add(key); setTimeout(() => this.told.delete(key), 12000);
        toast(t(r?.drive ? 'rt.gate.drive' : r?.ride === 'truck' ? 'rt.gate.truck' : 'rt.gate.train'));
      }
    }
  }

  // ---------------------------------------------------------------- roadblocks
  // A roadblock: a look of its own across the road and an invisible wall,
  // until its chapter is done; then (the first time you are near) it opens.
  isOpen(rb) { const d = this.game.save.data; return !!d.completed?.[rb.chapter] || !!d.unlockAll; }
  makeBlock(rb) {
    const g = this.game, b = { ...rb, t: -1 };
    this.blocks.push(b);
    if (rb.kind === 'bridge') this.bridgeDeck(b, this.data.opened[rb.id] && this.isOpen(rb));
    if (this.data.opened[rb.id] && this.isOpen(rb)) return;
    for (const [x, y, z] of rb.wall) if (!g.world.get(x, y, z)) g.world.set(x, y, z, B.barrier);
    b.obj = this.addProp(blockModel(rb.kind, b));
    b.obj.position.copy(rb.pos);
    if (b.lit) g.lights.attach(b.obj, b.lit, 3, 12, { offsetY: 2 });
    g.interactables.push({ id: 'rb-' + rb.id, pos: rb.pos.clone().add(V(4.5, 0, 0)), radius: 4, label: t(`rt.block.${rb.kind}`), action: () => openQuestStart(g, rb.chapter), enabled: () => b.t < 0 && !this.isOpen(rb) && !!chapterDef(rb.chapter) });
  }
  updateBlock(b, dt) {
    const g = this.game;
    if (b.t < 0) {
      if (!b.obj || !this.isOpen(b) || this.data.opened[b.id]) { b.obj?.userData.idle?.(dt); return; }
      if (!g.players.some((p) => !p.remote && p.pos.distanceTo(b.pos) < 40)) { b.obj.userData.idle?.(dt); return; }
      b.t = 0;   // here we go: it opens
      this.data.opened[b.id] = true; g.save.write?.();
      g.rig.shake?.(0.4);
      g.audio?.stinger?.('prophecy-line');
    }
    b.t += dt;
    const u = Math.min(1, b.t / 3);
    b.obj.userData.open?.(u, dt);
    if (Math.floor(b.t * 6) !== Math.floor((b.t - dt) * 6)) g.fx.summonCircle?.(b.pos.clone().add(V((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 8)), 0xc8b8a0);
    if (u >= 1 && !b.done) {
      b.done = true;
      for (const [x, y, z] of b.wall) if (g.world.get(x, y, z) === B.barrier) g.world.set(x, y, z, 0);
      if (b.kind === 'bridge') { this.bridgeDeck(b, true); b.obj.visible = false; }
      toast(t('rt.block.opens'), 'big');
      g.audio?.levelUp?.();
    }
  }
  // the lift bridge's deck in the voxels, once it's down (a closed one is only the model)
  bridgeDeck(b, down) {
    if (!down) return;
    const W = this.game.world, [x0, x1] = b.gap, y = Math.round(b.pos.y) - 1;
    for (let x = x0; x <= x1; x++) for (let dz = -4; dz <= 4; dz++) {
      const z = ROAD_Z + dz;
      W.set(x, y, z, Math.abs(dz) === 4 ? B.guardrail : B.asphalt); W.set(x, y - 1, z, B.concrete);
      if (Math.abs(dz) === 4) for (let k = 1; k < 4; k++) W.set(x, y + k, z, B.barrier);
    }
  }

  // ---------------------------------------------------------------- rides
  // A vehicle between two stops. It waits at one end; board it at either.
  makeRide(r) {
    const g = this.game;
    const obj = this.addProp(r.kind === 'train' ? train() : zooTruck());
    const ride = { ...r, obj, at: this.data.rides[r.id] ?? 'from' };
    const dock = (end) => { const x = end === 'from' ? r.from : r.to; return r.kind === 'train' ? V(x + 0.5, r.y, RAIL_Z - 4.5) : V(x + 0.5, r.y, r.z + 4); };
    ride.dock = dock;
    this.park(ride, ride.at);
    this.rides.push(ride);
    for (const end of ['from', 'to']) {
      const other = end === 'from' ? r.to : r.from;
      g.interactables.push({
        id: `ride-${r.id}-${end}`, pos: dock(end), radius: 3.6,
        label: t(r.kind === 'train' ? 'rt.ride.trainTo' : 'rt.ride.truckTo', { name: placeName(other) }),
        action: () => this.board(ride, end), enabled: () => !this.ride && !this.car?.driver,
      });
    }
  }
  // where a vehicle stands at an end: its middle by the dock, facing the way it will go
  park(ride, end) {
    const x = end === 'from' ? ride.from : ride.to, other = end === 'from' ? ride.to : ride.from;
    ride.obj.position.set(x + 0.5, ride.y + (ride.kind === 'train' ? 0.1 : 0), ride.z + 0.5);
    ride.obj.rotation.y = other < x ? Math.PI : 0;
    ride.at = end;
  }
  board(ride, end) {
    const g = this.game;
    if (this.ride) return;
    const near = g.enemies.some((e) => !e.dead && !e.isDummy && e.aggro && g.players.some((p) => !p.remote && p.pos.distanceTo(e.pos) < 14));
    if (near) { toast(t('ow.notWithMonsters')); return; }
    const x0 = end === 'from' ? ride.from : ride.to, x1 = end === 'from' ? ride.to : ride.from;
    const R = { ride, x0, x1, t: 0, phase: ride.at === end ? 'board' : 'arrive', speed: 0 };
    // the vehicle is at the other end: it pulls in first, from out along the line
    if (R.phase === 'arrive') { this.park(ride, end); R.arriveFrom = x0 + Math.sign(x1 - x0) * 46; ride.obj.position.x = R.arriveFrom + 0.5; toast(t('rt.ride.calling')); }
    this.ride = R;
    for (const p of g.players.filter((q) => !q.remote)) this.boardHero(p, R);
    g.rig.extraDist = 7;
  }
  boardHero(p, R) {
    const g = this.game;
    g.fx.summonCircle?.(p.pos.clone(), 0xffd84a);
    p.object.visible = false; p.iframes = 999;
    const seat = V(0, 0, 0);
    p.vehicle = {
      carry: (q) => {
        const o = R.ride.obj;
        seat.copy(o.position).setY(o.position.y + 0.2);
        q.pos.copy(seat); q.vel.set(R.speed * Math.sign(R.x1 - R.x0), 0, 0);
        q.object.visible = false;
      },
    };
  }
  unboard(p, at = null) {
    p.vehicle = null; p.object.visible = true; p.iframes = 1.5; p.vel?.set(0, 0, 0); p.knock?.set(0, 0, 0);
    if (at) { const y = this.game.world.groundBelow(at.x, at.z, at.y + 3); if (isFinite(y)) at.y = y; p.spawn(at); }
  }
  updateRide(dt) {
    const g = this.game, R = this.ride, r = R.ride, o = r.obj, dir = Math.sign(R.x1 - R.x0);
    const fast = g.players.some((p) => !p.ai && !p.remote && g.input.get(p.device).held.interact) ? 3 : 1;
    R.t += dt;
    if (R.phase === 'arrive') {   // pulling in to the platform
      const u = ease(Math.min(1, R.t / 3));
      o.position.x = R.arriveFrom + (R.x0 - R.arriveFrom) * u + 0.5;
      spin(o, dt * 12 * (1 - u));
      if (R.t >= 3) { R.phase = 'board'; R.t = 0; }
      return;
    }
    if (R.phase === 'board') {   // a moment at the platform, then off
      if (R.t > 0.8) { R.phase = 'go'; R.t = 0; toast(t('rt.ride.riding', { name: placeName(R.x1) })); g.audio?.energy?.('blink'); }
      return;
    }
    const left = Math.abs(R.x1 + 0.5 - o.position.x);
    const vmax = r.kind === 'train' ? 18 : 15;
    const want = left < 26 ? Math.max(2.5, vmax * left / 26) : vmax;
    R.speed += Math.max(-20 * dt, Math.min(6 * dt * fast, want * fast - R.speed));
    const step = Math.min(left, R.speed * dt);
    o.position.x += dir * step;
    spin(o, step);
    if (r.kind === 'truck') o.position.y = r.y + Math.sin(R.t * 9) * 0.03;
    if (left - step <= 0.05) {
      // arrived: everyone out on the platform (or the roadside)
      o.position.x = R.x1 + 0.5;
      this.park(r, R.x1 === r.from ? 'from' : 'to');
      this.data.rides[r.id] = r.at; g.save.write?.();
      const at = r.dock(r.at);
      g.players.filter((p) => p.vehicle).forEach((p, i) => { this.unboard(p, at.clone().add(V((i % 2) * 1.4 - 0.7, 0, Math.floor(i / 2) * 1.2 - 0.6))); g.fx.summonCircle?.(p.pos.clone(), 0xffd84a); });
      g.rig.extraDist = 0;
      toast(t('rt.ride.arrived', { name: placeName(R.x1) }), 'title');
      this.ride = null;
    }
  }

  // ---------------------------------------------------------------- the taxi
  // Parked at the Lotus taxi rank (or wherever you left it). Get in and drive:
  // the stick (or WASD) points where to go, the taxi turns and speeds that way.
  // Out in the desert there's no getting out; past either end there is.
  makeTaxi(D) {
    const g = this.game, saved = this.data.taxi;
    const obj = this.addProp(taxi());
    const x = saved?.x ?? D.from + 0.5, z = saved?.z ?? D.z + 0.5, yaw = saved?.yaw ?? Math.PI;
    obj.position.set(x, this.groundAt(x, z, D.y + 2), z); obj.rotation.y = yaw;
    this.car = { obj, D, yaw, v: 0, driver: null, bumpT: 0, weeds: [] };
    g.interactables.push({ id: 'rt-taxi', pos: obj.position, radius: 3.2, label: t('rt.drive.get'), action: (p) => this.getIn(p), enabled: () => !this.car.driver && !this.ride });
    // tumbleweeds that roll across the road (bump the taxi)
    for (let i = 0; i < 7; i++) {
      const w = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), mat(0xa8844a, { r: 0.9 }));
      w.castShadow = true; this.addProp(w);
      this.car.weeds.push({ m: w, x: D.to + 12 + Math.random() * (D.from - D.to - 24), z: ROAD_Z + (Math.random() - 0.5) * 30, vz: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2) });
    }
  }
  groundAt(x, z, from) {
    const W = this.game.world;
    for (let y = Math.floor(from); y > 0; y--) { const id = W.get(Math.floor(x), y - 1, Math.floor(z)); if (id && id !== B.barrier && W.solidAt(x, y - 0.5, z)) return y; }
    return from;
  }
  // can the taxi be at (x, z) at height y? (the gates' walls let it through)
  carFree(x, z, y) {
    const W = this.game.world, gates = this.L.gates;
    if (x < this.car.D.to - 10 || x > this.car.D.from + 10) return false;
    for (const [dx, dz] of [[0, 0], [1.4, 0.6], [1.4, -0.6], [-1.4, 0.6], [-1.4, -0.6]]) {
      const c = Math.cos(this.car.yaw), s = Math.sin(this.car.yaw);
      const px = x + dx * c + dz * s, pz = z - dx * s + dz * c;
      for (let k = 0; k < 2; k++) {
        const id = W.get(Math.floor(px), Math.floor(y + 0.4 + k), Math.floor(pz));
        if (!id) continue;
        if (id === B.barrier && gates.some((gx) => Math.floor(px) === gx)) continue;
        if (W.solidAt(px, y + 0.4 + k, pz)) return false;
      }
    }
    return true;
  }
  getIn(p) {
    const g = this.game, car = this.car;
    if (car.driver || !p || p.ai) return;
    car.driver = p;
    for (const q of g.players.filter((h) => !h.remote)) {
      g.fx.summonCircle?.(q.pos.clone(), 0xffd84a);
      q.object.visible = false; q.iframes = 999;
      q.vehicle = { carry: (h) => this.carry(h) };
    }
    g.rig.extraDist = 6;
    toast(t('rt.drive.hint'));
  }
  carry(h) {
    const car = this.car;
    h.pos.copy(car.obj.position).setY(car.obj.position.y + 0.3);
    h.vel.set(Math.cos(car.yaw) * car.v, 0, -Math.sin(car.yaw) * car.v);
    h.object.visible = false;
  }
  getOut() {
    const g = this.game, car = this.car, o = car.obj;
    const r = rtRegionAt(o.position.x, o.position.z);
    if (r?.drive) { toast(t('rt.drive.noExit')); return; }
    const side = V(-Math.sin(car.yaw), 0, -Math.cos(car.yaw)).multiplyScalar(2.6);
    g.players.filter((p) => p.vehicle).forEach((p, i) => this.unboard(p, o.position.clone().add(side).add(V(Math.cos(car.yaw) * (i - 1) * 1.3, 1, -Math.sin(car.yaw) * (i - 1) * 1.3))));
    car.driver = null; car.v = 0;
    this.data.taxi = { x: o.position.x, z: o.position.z, yaw: car.yaw }; g.save.write?.();
    g.rig.extraDist = 0;
  }
  updateCar(dt) {
    const g = this.game, car = this.car, o = car.obj;
    // the tumbleweeds roll on regardless
    for (const w of car.weeds) {
      w.z += w.vz * dt; if (Math.abs(w.z - ROAD_Z) > 16) w.vz = -w.vz;
      const y = this.groundAt(w.x, w.z, 14);
      w.m.position.set(w.x, y + 0.7 + Math.abs(Math.sin(g.time * 5 + w.x)) * 0.4, w.z); w.m.rotation.x += w.vz * dt;
      if (car.driver && Math.hypot(w.x - o.position.x, w.z - o.position.z) < 1.8 && car.bumpT <= 0) { car.v *= 0.35; car.bumpT = 0.6; g.rig.shake?.(0.3); w.vz = -w.vz; w.z += Math.sign(w.vz) * 2; g.audio?.hit?.(); }
    }
    car.bumpT -= dt;
    const p = car.driver; if (!p) return;
    if (p.dead || !g.players.includes(p)) { this.getOut(); return; }
    const inp = g.input.get(p.device);
    if (inp.pressed.interact) { this.getOut(); return; }
    const mv = g.rig.screenToWorldDir(inp.move.x, inp.move.y, new THREE.Vector3());
    const thr = Math.min(1, Math.hypot(inp.move.x, inp.move.y));
    if (thr > 0.15) {
      const want = Math.atan2(-mv.z, mv.x);
      let d = want - car.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 2.4) {
        car.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 2.4 * Math.min(1, 0.35 + Math.abs(car.v) / 8));
        const target = 16 * thr * Math.max(0.3, Math.cos(d));
        car.v += Math.max(-14 * dt, Math.min(7 * dt, target - car.v));
      } else car.v += Math.max(-14 * dt, Math.min(5 * dt, -5 * thr - car.v));   // pointing behind: back up
    } else car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 9 * dt);
    const nx = o.position.x + Math.cos(car.yaw) * car.v * dt, nz = o.position.z - Math.sin(car.yaw) * car.v * dt;
    const ny = this.groundAt(nx, nz, o.position.y + 1.6);
    if (ny - o.position.y < 1.05 && this.carFree(nx, nz, ny)) { o.position.set(nx, o.position.y + (ny - o.position.y) * Math.min(1, dt * 12), nz); spin(o, car.v * dt); }
    else if (Math.abs(car.v) > 0.5) { if (car.bumpT <= 0) { g.rig.shake?.(0.25); car.bumpT = 0.5; } car.v = -car.v * 0.25; }
    o.rotation.y = car.yaw;
  }

  // ---------------------------------------------------------------- the Greyhound
  // Pulling in at the bus stop, the heroes on board, then out they get.
  busArrives() {
    const g = this.game, bus = this.bus, stop = bus.position.clone();
    const mine = g.players.filter((p) => !p.remote);
    for (const p of mine) { p.object.visible = false; p.iframes = 999; p.vehicle = { carry: (q) => { q.pos.copy(bus.position).setY(stop.y); q.vel.set(0, 0, 0); q.object.visible = false; } }; }
    let k = 0;
    bus.position.x = stop.x + 44;
    g.addUpdater((dt) => {
      k += dt;
      const u = ease(Math.min(1, k / 3.2));
      const x = stop.x + 44 * (1 - u); spin(bus, bus.position.x - x); bus.position.x = x;
      if (k < 3.6) return true;
      mine.forEach((p, i) => { if (p.vehicle) this.unboard(p, this.L.busStop.clone().add(V(-1 - i * 1.3, 0, 1.2))); g.fx.summonCircle?.(p.pos.clone(), 0xffd84a); });
      toast(t('rt.bus.arrive'), 'title');
      return false;
    });
  }
  busHome() {
    const g = this.game;
    const near = g.enemies.some((e) => !e.dead && !e.isDummy && e.aggro && g.players.some((p) => !p.remote && p.pos.distanceTo(e.pos) < 14));
    if (near) { toast(t('ow.notWithMonsters')); return; }
    toast(t('rt.bus.leavingHome'));
    busDeparts(g, this.bus, +1, () => g.goArea('camp', { arrive: 'bus' }));
  }
}

// The Greyhound pulls out with the heroes on board, then the next area loads.
// dir: which way along x it drives off.
function busDeparts(g, bus, dir, then) {
  const mine = g.players.filter((p) => !p.remote);
  for (const p of mine) { g.fx.summonCircle?.(p.pos.clone(), 0xffd84a); p.object.visible = false; p.iframes = 999; p.vehicle = { carry: (q) => { q.pos.copy(bus.position).setY(q.pos.y); q.vel.set(0, 0, 0); q.object.visible = false; } }; }
  const x0 = bus.position.x; let k = 0, done = false;
  g.rig.extraDist = 5;
  g.addUpdater((dt) => {
    k += dt;
    const x = x0 + dir * 30 * ease(Math.min(1, k / 3)) * Math.min(1, k / 3); spin(bus, Math.abs(x - bus.position.x)); bus.position.x = x;
    if (k > 1.6 && !done) { done = true; g.fx.flash?.(0x000000, 1, 1.4); }
    if (k < 2.6) return true;
    for (const p of mine) p.vehicle = null;
    g.rig.extraDist = 0;
    then();
    return false;
  });
}

// In camp: the Greyhound waits at the bus stop past Half-Blood Hill (where the
// Road West starts), and brings you back there.
export class CampBusStop {
  constructor(game, L) { this.game = game; this.L = L; this.props = []; }
  setup({ arrive = null } = {}) {
    const g = this.game, stop = this.L.busStop; if (!stop) return;
    const bus = greyhound(); bus.position.copy(clearSpot(g.world, stop, 13, 4) ?? stop.clone().add(V(1, 0, 3.4)));
    g.scene.add(bus); this.props.push(bus); this.bus = bus;
    g.interactables.push({ id: 'camp-bus', pos: stop.clone().add(V(1.5, 0, 1)), radius: 3.2, label: t('rt.bus.board'), action: () => this.go(), enabled: () => !g.online?.isGuest });
    if (arrive === 'bus') {
      const mine = g.players.filter((p) => !p.remote);
      mine.forEach((p, i) => { p.spawn(stop.clone().add(V(-1 + i * 1.3, 0, -0.5))); g.fx.summonCircle?.(p.pos.clone(), 0xffd84a); });
      g.rig.snap(stop);
      toast(t('game.camp.name'), 'title');
    }
  }
  go() {
    const g = this.game;
    const near = g.enemies.some((e) => !e.dead && !e.isDummy && e.aggro && g.players.some((p) => !p.remote && p.pos.distanceTo(e.pos) < 14));
    if (near) { toast(t('ow.notWithMonsters')); return; }
    toast(t('rt.bus.leaving'));
    busDeparts(g, this.bus, 1, () => g.goArea('road', { arrive: 'bus' }));
  }
  dispose() { for (const o of this.props) { this.game.scene.remove(o); this.game.releaseLater?.(o); } this.props = []; }
}

// Open, level ground near `near` for a w × d footprint along x (nothing in it three blocks up).
function clearSpot(world, near, w, d) {
  const y0 = Math.round(near.y);
  const ok = (cx, cz) => {
    for (let x = Math.floor(cx - w / 2); x <= Math.floor(cx + w / 2); x++) for (let z = Math.floor(cz - d / 2); z <= Math.floor(cz + d / 2); z++) {
      const y = world.groundBelow(x + 0.5, z + 0.5, y0 + 2);
      if (!isFinite(y) || Math.abs(y - y0) > 0.6) return false;
      for (let k = 0; k < 4; k++) if (world.get(x, y0 + k, z)) return false;
    }
    return true;
  };
  for (let r = 3; r <= 20; r++) for (let a = 0; a < 16; a++) {
    const cx = near.x + Math.cos(a / 16 * Math.PI * 2) * r, cz = near.z + Math.sin(a / 16 * Math.PI * 2) * r;
    if (ok(cx, cz)) return V(cx, y0, cz);
  }
  return null;
}

// ------------------------------------------------------------------ roadblock looks
// Each a group standing on the road at the roadblock (its origin), with
// userData.open(u, dt) (u: 0 → 1 over three seconds) and an idle animation.
function blockModel(kind, b) {
  const g = new THREE.Group();
  const flames = [];
  const fire = (x, y, z, s = 1) => { const f = boxIn(g, 0.6 * s, 1.1 * s, 0.6 * s, x, y, z, mat(0xff8a2a, { e: 0xff6a10, ei: 3 })); f.castShadow = false; flames.push(f); return f; };
  if (kind === 'wreck') {
    // the Greyhound across the road on its side, burning, two cars piled into it
    const bus = greyhound(); bus.rotation.y = Math.PI / 2; bus.rotation.z = 0.25; bus.position.y = 0.3; g.add(bus);
    for (const [x, z, s] of [[0.5, -3, 1.4], [-0.3, 0.5, 1.8], [0.4, 3.5, 1.2], [1.6, -1, 1]]) fire(x, 3 + Math.random(), z, s);
    const c1 = new THREE.Group(); boxIn(c1, 3.8, 1, 1.8, 0, 0.6, 0, mat(0x5a1a1a)); c1.position.set(3, 0, -4); c1.rotation.y = 0.7; g.add(c1);
    b.lit = 0xff7a2a;
    g.userData.open = (u) => { for (const f of flames) f.scale.setScalar(Math.max(0.01, 1 - u * 1.5)); bus.position.z = 10 * ease(u); bus.rotation.z = 0.25 + 1.1 * ease(u); bus.position.y = 0.3 - 1.2 * ease(u); c1.position.z = -4 - 8 * ease(u); };
  } else if (kind === 'statues') {
    // Medusa's garden: stone people shoulder to shoulder across the road
    const stone = mat(0x9a968e, { r: 0.9 });
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Group(), z = -4.5 + i * 1.12, h = 1.6 + (i % 3) * 0.15;
      boxIn(s, 0.5, h * 0.55, 0.7, 0, h * 0.28 + 0.4, 0, stone); boxIn(s, 0.36, 0.36, 0.36, 0, h * 0.6 + 0.6, 0, stone);
      boxIn(s, 0.22, h * 0.45, 0.22, 0, h * 0.4, 0.42 * (i % 2 ? 1 : -1), stone).rotation.x = (i % 2 ? -1 : 1) * 0.9;   // arms up in fright
      boxIn(s, 0.6, 0.4, 0.8, 0, 0.2, 0, stone);
      s.position.set((i % 2) * 0.6, 0, z); s.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.4; g.add(s);
    }
    g.userData.open = (u) => { for (const s of g.children) { s.position.y = -2.4 * ease(u); s.rotation.z = Math.sin(u * 40) * 0.05 * (1 - u); } };
  } else if (kind === 'bridge') {
    // the lift bridge's deck, raised on its hinge at the west end
    const deck = new THREE.Group(); deck.position.set(-4.5, -0.5, 0); g.add(deck);
    boxIn(deck, 9, 0.6, 9, 4.5, 0, 0, mat(0x3a3a40, { r: 0.8 })); boxIn(deck, 9, 0.7, 0.3, 4.5, 0.6, 4.3, mat(0xc8ccd2, { m: 0.6 })); boxIn(deck, 9, 0.7, 0.3, 4.5, 0.6, -4.3, mat(0xc8ccd2, { m: 0.6 }));
    for (let i = 0; i < 4; i++) boxIn(deck, 1, 0.62, 0.25, 1 + i * 2.2, 0.02, 0, mat(0xf2d040, { e: 0x806010, ei: 0.4 }));
    deck.rotation.z = 1.15;
    g.userData.open = (u) => { deck.rotation.z = 1.15 * (1 - ease(u)); };
  } else if (kind === 'rocks') {
    // a rockslide: boulders heaped across the pass
    const rock = mat(0x7a746a, { r: 0.95 });
    for (let i = 0; i < 11; i++) { const r = 0.8 + Math.random() * 1.2; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), rock); m.castShadow = true; m.position.set((Math.random() - 0.5) * 3, r * 0.7 + (i > 7 ? 1.4 : 0), -5 + i * 0.95); m.userData.side = m.position.z < 0 ? -1 : 1; g.add(m); }
    g.userData.open = (u, dt) => { for (const m of g.children) { m.position.z += m.userData.side * dt * 5 * (1 - u); m.rotation.x += m.userData.side * dt * 3 * (1 - u); m.position.y = Math.max(-2, m.position.y - dt * (u > 0.6 ? 2 : 0)); } };
  } else if (kind === 'gate') {
    // the Lotus gates: gold bars with neon lotus flowers, hinged at the road's edges
    const gold = mat(0xd6aa4a, { m: 0.8, r: 0.3 }), neon = mat(0x4affa0, { e: 0x4affa0, ei: 2.2 });
    const leaf = (side) => { const p = new THREE.Group(); p.position.set(0, 0, side * 5.2); for (let i = 0; i < 6; i++) boxIn(p, 0.16, 4.2, 0.16, 0, 2.1, -side * (0.4 + i * 0.8), gold); boxIn(p, 0.2, 0.2, 5, 0, 4.1, -side * 2.5, gold); boxIn(p, 0.2, 0.2, 5, 0, 1.0, -side * 2.5, gold); boxIn(p, 0.25, 1.2, 1.2, 0, 2.6, -side * 2.6, neon).rotation.x = 0.785; g.add(p); return p; };
    const a = leaf(-1), c = leaf(1); b.lit = 0x4affa0;
    g.userData.open = (u) => { a.rotation.y = -1.5 * ease(u); c.rotation.y = 1.5 * ease(u); };
  } else if (kind === 'beds') {
    // Procrustes's stock: waterbeds piled across the road
    const cols = [0x4a7ad8, 0xd85a9a, 0x5ac8d8, 0xe8e0f0];
    for (let i = 0; i < 10; i++) { const m = boxIn(g, 2.2, 0.6, 2.6, (Math.random() - 0.5) * 2, 0.3 + Math.floor(i / 4) * 0.62, -4 + (i % 4) * 2.6, mat(cols[i % 4], { r: 0.25, m: 0.1 })); m.rotation.y = (Math.random() - 0.5) * 0.4; }
    g.userData.open = (u) => { g.children.forEach((m, i) => { m.scale.y = Math.max(0.08, 1 - ease(u) * 1.1); m.position.z += Math.sign(m.position.z || (i % 2) - 0.5) * 0.04; m.position.y = Math.max(0.05, m.position.y - 0.02); }); };
  } else if (kind === 'shadow') {
    // a wall of the Underworld's shadow, rippling
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 11), mat(0x0a0612, { e: 0x3a1a6a, ei: 0.8, op: 0.92 })); m.position.y = 3.5; g.add(m);
    b.lit = 0x7a4aff;
    g.userData.idle = (dt) => { m.scale.x = 1 + Math.sin(performance.now() / 300) * 0.25; void dt; };
    g.userData.open = (u) => { m.material.opacity = 0.92 * (1 - ease(u)); m.position.y = 3.5 + 6 * ease(u); };
  }
  if (flames.length) { const idle = g.userData.idle; g.userData.idle = (dt) => { idle?.(dt); const tt = performance.now() / 120; flames.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(tt + i * 2) * 0.3; }); }; }
  return g;
}

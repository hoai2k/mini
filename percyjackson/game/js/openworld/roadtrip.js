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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
    if (b.lit) b.light = g.lights.attach(b.obj, b.lit, 3, 12, { offsetY: 2 });
    g.interactables.push({ id: 'rb-' + rb.id, pos: rb.pos.clone().add(V(4.5, 0, 0)), radius: 4, label: t(`rt.block.${rb.kind}`), action: () => openQuestStart(g, rb.chapter), enabled: () => b.t < 0 && !this.isOpen(rb) && !!chapterDef(rb.chapter) });
  }
  updateBlock(b, dt) {
    const g = this.game;
    if (b.t < 0) {
      if (!b.obj) return;
      // (drawn and animated only when someone is near enough to see it)
      let d = Infinity; for (const p of g.players) if (!p.remote) d = Math.min(d, p.pos.distanceTo(b.pos));
      b.obj.visible = d < 110;
      if (!this.isOpen(b) || this.data.opened[b.id] || d >= 40) { if (d < 80) b.obj.userData.idle?.(dt); return; }
      b.t = 0;   // here we go: it opens
      this.data.opened[b.id] = true; g.save.write?.();
      g.rig.shake?.(0.4);
      g.audio?.stinger?.('prophecy-line');
    }
    b.t += dt;
    const u = Math.min(1, b.t / (b.obj.userData.dur ?? 3));
    b.obj.userData.open?.(u, dt);
    if (b.light) { b.light.intensity = 3 * (b.obj.userData.litK ?? 1); if (u >= 1 && !(b.obj.userData.litK > 0)) { g.lights.remove(b.light); b.light = null; } }
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
// Each a group standing on the road at the roadblock (its origin: the middle
// of the road on the roadblock's line; +x is east, towards the heroes coming
// from New York, +z south), after the vox-rt-roadblocks sheet. userData:
//   open(u, dt)  u: 0 → 1 over `dur` seconds (then held at 1)
//   idle(dt)     while it waits, when someone is near
//   dur          how long it takes to open (seconds)
//   litK         how bright its light still is (0 – 1)
// Static parts are merged into one mesh per material (Boxes); the bits that
// fly (smoke, dust, rubble, petals, the shadow) are instanced cubes (swarm).
const MATS = new Map();
const M = (c, o = {}) => { const k = c + ':' + JSON.stringify(o); let m = MATS.get(k); if (!m) MATS.set(k, (m = mat(c, o))); return m; };
const _o = new THREE.Object3D(), _c = new THREE.Color(), _a = new THREE.Vector3(), _Z = new THREE.Vector3(0, 0, 1), _Y = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const rnd = (a, b) => a + Math.random() * (b - a);
const seg = (u, a, b) => ease((u - a) / (b - a));
const lin = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
class Boxes {
  constructor() { this.by = new Map(); }
  box(w, h, d, x, y, z, m, ry = 0, rx = 0, rz = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    _o.position.set(x, y, z); _o.rotation.set(rx, ry, rz); _o.scale.set(1, 1, 1); _o.updateMatrix(); geo.applyMatrix4(_o.matrix);
    if (!this.by.has(m)) this.by.set(m, []);
    this.by.get(m).push(geo);
    return this;
  }
  bake(into = new THREE.Group(), shadow = true) {
    for (const [m, geos] of this.by) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), m); for (const q of geos) q.dispose();
      mesh.castShadow = shadow; mesh.receiveShadow = true; into.add(mesh);
    }
    this.by.clear();
    return into;
  }
}
// n instanced cubes; each particle's x y z, size s (times sx sy sz), turn rx ry rz, and room for its motion
function swarm(n, m, colors = null) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, n);
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
  im.userData.P = Array.from({ length: n }, (_, i) => ({ i, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0, sx: 1, sy: 1, sz: 1, rx: 0, ry: 0, rz: 0, t: 0, k: 0, a: 0, b: 0, c: 0, d: 0, rest: false }));
  if (colors) for (let i = 0; i < n; i++) im.setColorAt(i, _c.setHex(colors[i % colors.length]));
  return im;
}
function flush(im) {
  const P = im.userData.P;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], s = Math.max(1e-4, p.s);
    _o.position.set(p.x, p.y, p.z); _o.rotation.set(p.rx, p.ry, p.rz); _o.scale.set(s * p.sx, s * p.sy, s * p.sz); _o.updateMatrix();
    im.setMatrixAt(i, _o.matrix);
  }
  im.instanceMatrix.needsUpdate = true;
}
// a chain or tow cable: a thin box stretched between two points (in its parent's space)
function cable(g, m, w = 0.1) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, w, 1), m); c.castShadow = true; g.add(c); return c; }
function stretch(c, ax, ay, az, bx, by, bz) {
  _a.set(bx - ax, by - ay, bz - az); const L = _a.length() || 1;
  c.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); c.scale.set(1, 1, L);
  c.quaternion.setFromUnitVectors(_Z, _a.multiplyScalar(1 / L));
}

// The Greyhound, burnt out: scorched silver, the blue stripe, black windows lit by the fire inside (12 long, front at +x).
function burntBus() {
  const P = new Boxes();
  const silver = M(0xa8acb0, { r: 0.55, m: 0.3 }), soot = M(0x262422, { r: 0.95 }), char = M(0x4a4440, { r: 0.9 }), blue = M(0x2a4a90, { r: 0.5 });
  const glass = M(0x111315, { r: 0.2 }), ember = M(0xff7a2a, { e: 0xff5a10, ei: 2.4 }), tyre = M(0x141416, { r: 0.9 }), rust = M(0x7a4a2a, { r: 0.9 });
  P.box(12, 2.6, 2.6, 0, 2.0, 0, silver).box(12.04, 0.45, 2.64, 0, 1.25, 0, blue).box(11.2, 0.9, 2.64, -0.3, 2.6, 0, glass);
  for (let i = 0; i < 9; i++) P.box(0.2, 0.92, 2.66, -5.6 + i * 1.4, 2.6, 0, i % 3 === 1 ? char : silver);
  for (const [i, s] of [[1, 1], [2, -1], [3, 1], [5, -1], [6, 1], [4, -1]]) P.box(0.9, 0.55, 0.05, -4.9 + i * 1.4, 2.5, s * 1.33, ember);
  for (const [x, y, w, h, s] of [[-3.2, 1.8, 2.6, 1.0, 1], [1.4, 1.6, 1.8, 0.8, -1], [3.8, 2.0, 2.0, 1.2, 1], [-1.0, 1.9, 1.2, 0.6, -1], [-4.6, 1.6, 1.4, 0.9, -1]]) P.box(w, h, 0.05, x, y, s * 1.33, soot);
  P.box(0.1, 1.4, 2.3, 6.02, 2.35, 0, glass).box(0.1, 0.4, 2.0, 6.04, 1.3, 0, char);
  // the roof, burnt through in places
  P.box(4.2, 0.2, 2.5, -3.6, 3.4, 0, char).box(2.8, 0.2, 2.5, 3.9, 3.4, 0, silver).box(2.4, 0.2, 1.0, 0.6, 3.4, 0.7, soot).box(1.6, 0.22, 1.2, -0.4, 3.42, -0.6, rust);
  P.box(0.3, 0.45, 2.7, 6.1, 0.7, 0, soot).box(0.3, 0.45, 2.7, -6.1, 0.7, 0, soot);
  for (const x of [4.3, -3.4, -4.6]) for (const z of [-1.2, 1.2]) P.box(1.1, 1.1, 0.42, x, 0.55, z, tyre);
  return P.bake();
}
// A tow truck: an orange cab, the light bar, the boom raised at the back (front at +x; userData.tip: the boom's end).
function towTruck() {
  const P = new Boxes();
  const o = M(0xe8742a, { r: 0.45, m: 0.15 }), dk = M(0x2a2a2e, { r: 0.7 }), w = M(0xeeeae0, { r: 0.5 }), glass = M(0x1e2a36, { r: 0.1, m: 0.3 });
  const chrome = M(0xd0d4d8, { m: 0.8, r: 0.25 }), amber = M(0xffb020, { e: 0xffa010, ei: 2.5 }), head = M(0xfff2c0, { e: 0xfff2c0, ei: 2.5 }), tyre = M(0x141416, { r: 0.9 }), boom = M(0xf2a020, { r: 0.5 });
  P.box(2.4, 1.9, 2.4, 2.3, 1.75, 0, o).box(1.4, 1.1, 2.3, 4.1, 1.35, 0, o).box(0.06, 0.8, 2.0, 3.52, 2.3, 0, glass).box(1.3, 0.7, 2.44, 2.4, 2.3, 0, glass);
  P.box(1.6, 0.25, 2.44, 2.3, 1.3, 0, w).box(0.2, 0.45, 2.5, 4.85, 0.95, 0, chrome).box(0.06, 0.7, 1.2, 4.82, 1.4, 0, chrome);
  for (const z of [-0.85, 0.85]) P.box(0.06, 0.25, 0.4, 4.84, 1.5, z, head);
  P.box(0.4, 0.22, 2.0, 2.3, 2.82, 0, amber);
  for (const z of [-1.05, 1.05]) P.box(0.18, 1.7, 0.18, 0.95, 2.6, z, chrome);
  P.box(4.8, 0.5, 2.3, -1.3, 1.05, 0, dk);
  for (const z of [-1.1, 1.1]) P.box(4.6, 0.55, 0.12, -1.4, 1.55, z, o);
  P.box(0.9, 1.1, 0.9, -0.9, 1.9, 0, dk).box(4.0, 0.45, 0.45, -2.3, 3.0, 0, boom, 0, 0, -0.6);
  for (let i = 0; i < 4; i++) P.box(0.3, 0.47, 0.47, -1.0 - i * 0.9, 2.1 + i * 0.62, 0, dk, 0, 0, -0.6);
  P.box(0.3, 0.3, 1.8, -3.8, 0.9, 0, dk).box(0.25, 0.35, 0.25, -3.95, 3.9, 0, dk);
  for (const [x, z] of [[3.6, 1.15], [3.6, -1.15], [-1.9, 1.15], [-1.9, -1.15], [-3.0, 1.15], [-3.0, -1.15]]) P.box(1.0, 1.0, 0.4, x, 0.5, z, tyre);
  const g = P.bake(); g.userData.tip = V(-3.95, 3.8, 0);
  return g;
}

function blockModel(kind, b) {
  const g = new THREE.Group(), U = g.userData;
  const flames = [];
  const flameA = M(0xff7a1a, { e: 0xff5a10, ei: 2.8 }), flameB = M(0xffd040, { e: 0xffc030, ei: 3.2 });
  const fire = (x, y, z, s = 1, parent = g) => {
    for (const [m, k, dy] of [[flameA, 1, 0], [flameB, 0.55, -0.1]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.7 * s * k, 1.2 * s * k, 0.7 * s * k), m); f.position.set(x, y + dy * s, z); f.rotation.y = Math.random() * 3;
      f.userData.s = 1; parent.add(f); flames.push(f);
    }
  };
  U.dur = 3;
  if (kind === 'wreck') {
    // the Greyhound slewed across the road, burnt out and still burning, its luggage strewn; then a tow truck drags it off
    U.dur = 7;
    const bus = burntBus(), A0 = Math.PI - 1.1; bus.rotation.y = A0; bus.position.set(0.6, 0, 0.3); g.add(bus);
    const head = (a) => [Math.cos(a), -Math.sin(a)];
    const [hx, hz] = head(A0), F0 = [0.6 + hx * 6, 0.3 + hz * 6];
    for (const k of [-4.2, -1.6, 1.2, 3.8]) fire(0.6 + hx * k, 3.6 + Math.random() * 0.3, 0.3 + hz * k, 0.9 + Math.random() * 0.4);
    for (const [x, z, s] of [[-1.6, -3.4, 1.1], [2.8, 3.8, 1.3], [3.4, -0.6, 0.8], [-2.8, 2.6, 0.7], [1.6, 5.0, 0.6]]) fire(x, 0.5 * s, z, s);
    // what's strewn round it: suitcases, a tyre, metal, scorch marks, embers, cones and barrels
    const P = new Boxes(), soot = M(0x1c1a18, { r: 1 }), ember = M(0xff6a1a, { e: 0xff4a10, ei: 2 }), metal = M(0x9a9ea2, { m: 0.6, r: 0.4 }), tyre = M(0x141416, { r: 0.9 });
    const orange = M(0xf28c28, { r: 0.6 }), white = M(0xf2efe6, { r: 0.6 });
    for (const [x, z, w, d] of [[0.6, 0.3, 7, 11], [2.6, -3, 3, 3], [-2, 3, 3.4, 2.6], [3.4, 3.2, 2.4, 2.2]]) P.box(w, 0.04, d, x, 0.02, z, soot, Math.random());
    for (const [x, z, c, r] of [[2.6, -3.2, 0x2aa8a0, 0.3], [3.6, -2.0, 0x2a5ab8, 1.1], [1.6, 2.4, 0xc83a3a, 0.6], [4.4, 1.4, 0x2a5ab8, 2.2], [-2.6, 1.6, 0x2aa8a0, 1.6], [3.0, 0.4, 0x8a5a2a, 0.2], [-3.4, -2.2, 0xc83a3a, 2.6], [4.0, -4.2, 0x3a3a46, 0.9]]) {
      const m = M(c, { r: 0.6 }); P.box(0.8, 0.45, 0.55, x, 0.23, z, m, r).box(0.3, 0.1, 0.08, x, 0.5, z, M(0x1a1a1e), r);
    }
    for (const [x, z] of [[4.6, -0.8], [-3.0, -3.8]]) P.box(1.0, 0.36, 1.0, x, 0.18, z, tyre, 0.4);
    for (const [x, z, r] of [[2.0, -4.6, 0.3], [-1.0, 4.4, 1.2], [4.8, 3.0, 2.0], [1.0, -1.0, 0.8], [-3.8, 0.2, 2.4]]) P.box(0.9, 0.08, 0.5, x, 0.1, z, metal, r, 0.3);
    for (let i = 0; i < 14; i++) P.box(0.18, 0.12, 0.18, rnd(-4, 5), 0.06, rnd(-5, 5), ember);
    for (const [x, z] of [[5.2, -4.6], [5.4, 4.6], [-4.4, 4.8]]) for (let k = 0; k < 4; k++) P.box(0.72 - k * 0.02, 0.22, 0.72 - k * 0.02, x, 0.11 + k * 0.24, z, k % 2 ? white : orange);   // barrels
    P.bake(g);
    // the smoke: black cubes rising from the fires
    const smoke = swarm(54, mat(0xffffff, { r: 1, op: 0.82 }), [0x1e1c1a, 0x2e2a26, 0x3a3632, 0x141210]); g.add(smoke);
    const srcs = [[0.6 + hx * -3, 0.3 + hz * -3], [0.6, 0.3], [0.6 + hx * 3, 0.3 + hz * 3], [-1.6, -3.4], [2.8, 3.8]];
    for (const p of smoke.userData.P) { p.t = Math.random(); p.k = rnd(0.18, 0.3); p.a = srcs[p.i % srcs.length][0]; p.b = srcs[p.i % srcs.length][1]; p.c = rnd(-1, 1); p.d = rnd(-1, 1); }
    let emit = 1;
    const puff = (dt) => {
      for (const p of smoke.userData.P) {
        p.t += dt * p.k;
        if (p.t >= 1) { if (emit <= 0) { p.s = 0; continue; } p.t -= 1; const s = srcs[(Math.random() * srcs.length) | 0]; p.a = s[0]; p.b = s[1]; p.c = rnd(-1, 1); p.d = rnd(-1, 1); }
        const t = p.t; p.x = p.a + p.c * 0.8 - t * 2.5; p.z = p.b + p.d * 0.8 + t * 1.2; p.y = 3.4 + t * 9; p.s = (0.7 + t * 2.4) * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5 + (t > 0.6 ? (t - 0.6) * 3.9 : 0)) * (p.i < 40 || emit > 0 ? 1 : 0); p.rx = t * 2 + p.c; p.ry = p.d;
      }
      flush(smoke);
    };
    // the tow truck waits out of sight to the west, and its cable
    const tow = towTruck(); tow.rotation.y = Math.PI; tow.visible = false; g.add(tow);
    const line = cable(g, M(0x1a1a1e, { r: 0.6 }), 0.09); line.visible = false;
    b.lit = 0xff7a2a;
    U.idle = puff;
    U.open = (u, dt) => {
      if (U.fin) return;
      const fl = 1 - seg(u, 0, 0.42);
      for (const f of flames) f.userData.s = fl;
      U.litK = fl; emit = u < 0.5 ? 1 : 0;
      puff(dt);
      let tx, F, a;
      if (u < 0.3) { tx = -46 + 39.8 * seg(u, 0, 0.3); F = F0; a = A0; }
      else if (u < 0.5) { const k = seg(u, 0.3, 0.5); tx = -6.2 - 3 * k; a = A0 + (Math.PI - A0) * k; F = [F0[0] + (tx + 3.8 - F0[0]) * k, F0[1] + (-1.6 - F0[1]) * k]; }
      else { const k = lin(u, 0.5, 1); tx = -9.2 - 64 * k * k; a = Math.PI; F = [tx + 3.8, -1.6]; }
      tow.visible = u < 1; tow.position.set(tx, 0, -1.6);
      const [ax, az] = head(a); bus.rotation.y = a; bus.position.set(F[0] - ax * 6, 0, F[1] - az * 6);
      line.visible = u > 0.28 && u < 1;
      if (line.visible) stretch(line, tx + 3.95, 3.8, -1.6, F[0], 1.4, F[1]);
      if (u >= 1) { bus.visible = false; smoke.visible = false; U.fin = true; }
    };
  } else if (kind === 'statues') {
    // Medusa's handiwork set up as a wall: a sea god with his trident, a hoplite behind his shield,
    // a winged horse rearing, a bust; moss on the stone. They crumble into rubble in a cloud of dust.
    U.dur = 4.5;
    const stone = M(0xb4b0a8, { r: 0.9 }), dark = M(0x928e86, { r: 0.95 }), moss = M(0x5a7a34, { r: 1 }), plinth = M(0x8a867e, { r: 0.95 });
    const statues = [];
    const statue = (z, fn) => { const P = new Boxes(); fn(P); const s = P.bake(); s.position.set(0, 0, z); g.add(s); statues.push(s); return s; };
    const shield = (P, x, y, z, r) => { P.box(0.2, r * 2, r * 1.2, x, y, z, stone).box(0.2, r * 1.2, r * 2, x, y, z, stone).box(0.22, r * 1.7, r * 1.7, x, y, z, stone).box(0.3, r * 0.4, r * 0.4, x + 0.08, y, z, dark).box(0.24, r * 1.5, 0.12, x + 0.02, y, z, dark).box(0.24, 0.12, r * 1.5, x + 0.02, y, z, dark); };
    statue(-3.3, (P) => {   // the sea god, crowned, his trident raised
      P.box(2.2, 0.3, 2.2, 0, 0.15, 0, plinth).box(1.9, 0.9, 1.9, 0, 0.75, 0, dark).box(2.0, 0.15, 2.0, 0, 1.25, 0, stone);
      P.box(1.0, 1.8, 1.4, 0, 2.2, 0, stone).box(1.1, 1.5, 1.6, 0, 3.8, 0, stone).box(1.0, 0.4, 2.0, 0, 4.5, 0, stone);
      P.box(0.8, 0.85, 0.8, 0, 5.1, 0, stone).box(0.3, 0.8, 0.62, 0.42, 4.75, 0, dark).box(0.85, 0.2, 0.85, 0, 5.6, 0, dark);
      for (const [dx, dz] of [[0.35, 0], [0, 0.35], [0, -0.35], [-0.35, 0], [0.25, 0.25], [0.25, -0.25]]) P.box(0.12, 0.36, 0.12, dx, 5.86, dz, dark);
      P.box(0.38, 1.2, 0.38, 0.15, 4.9, -1.05, stone).box(0.14, 6.2, 0.14, 0.3, 3.9, -1.25, dark).box(0.14, 0.14, 1.1, 0.3, 6.9, -1.25, dark);
      for (const dz of [-0.5, 0, 0.5]) P.box(0.13, 0.7, 0.13, 0.3, 7.3, -1.25 + dz, dark);
      P.box(0.38, 1.2, 0.38, 0.2, 3.4, 1.0, stone); shield(P, 0.75, 2.8, 1.15, 0.75);
      P.box(0.5, 0.3, 0.7, 0.9, 1.4, -0.6, moss).box(0.4, 0.2, 0.4, -0.2, 4.72, 0.8, moss);
    });
    statue(-0.4, (P) => {   // a hoplite: crested helmet, round shield, spear
      P.box(1.7, 0.8, 1.7, 0, 0.4, 0, dark).box(1.8, 0.12, 1.8, 0, 0.86, 0, stone);
      P.box(0.4, 1.2, 0.4, 0, 1.5, -0.3, stone).box(0.4, 1.2, 0.4, 0, 1.5, 0.3, stone).box(0.7, 0.5, 1.1, 0, 2.25, 0, stone).box(0.75, 1.1, 1.2, 0, 3.0, 0, stone);
      P.box(0.62, 0.62, 0.62, 0, 3.9, 0, stone).box(0.7, 0.3, 0.7, 0, 4.15, 0, dark).box(0.9, 0.35, 0.16, -0.1, 4.45, 0, dark).box(0.1, 0.36, 0.5, 0.33, 3.85, 0, dark);
      shield(P, 0.6, 2.9, -0.35, 0.8);
      P.box(0.3, 1.0, 0.3, 0.1, 3.2, 0.75, stone).box(0.12, 4.4, 0.12, 0.25, 3.0, 0.9, dark).box(0.18, 0.4, 0.18, 0.25, 5.3, 0.9, dark);
      P.box(0.4, 0.25, 0.6, -0.5, 0.95, 0.5, moss);
    });
    statue(2.4, (P) => {   // the winged horse, rearing
      P.box(2.4, 0.8, 1.7, 0, 0.4, 0, dark).box(2.5, 0.12, 1.8, 0, 0.86, 0, stone);
      for (const dz of [-0.3, 0.3]) P.box(0.32, 1.4, 0.32, -0.7, 1.6, dz, stone, 0, 0, 0.15);
      P.box(2.0, 0.95, 0.9, 0, 2.6, 0, stone, 0, 0, 0.55).box(0.9, 1.1, 0.8, 0.75, 3.2, 0, stone, 0, 0, 0.3);
      P.box(0.55, 1.3, 0.55, 1.05, 4.0, 0, stone, 0, 0, -0.35).box(1.0, 0.5, 0.48, 1.55, 4.55, 0, stone, 0, 0, -0.3).box(0.15, 0.3, 0.12, 1.25, 4.95, -0.15, dark).box(0.15, 0.3, 0.12, 1.25, 4.95, 0.15, dark);
      P.box(0.2, 1.2, 0.3, 0.75, 4.0, 0, dark, 0, 0, -0.35);   // the mane
      for (const dz of [-0.25, 0.25]) P.box(0.26, 1.0, 0.26, 1.25, 3.1, dz, stone, 0, 0, 1.0 + dz);
      P.box(0.25, 0.9, 0.25, -1.1, 2.2, 0, dark, 0, 0, -0.5);
      for (const s of [-1, 1]) {   // the wings, swept up and back
        P.box(1.8, 0.8, 0.12, -0.1, 3.6, s * 0.55, stone, 0, s * 0.35, 0.6).box(1.5, 0.6, 0.12, -0.6, 4.3, s * 0.75, stone, 0, s * 0.45, 0.8).box(1.0, 0.45, 0.12, -1.0, 4.9, s * 0.92, stone, 0, s * 0.5, 1.0);
        P.box(1.6, 0.18, 0.14, -0.3, 3.3, s * 0.52, dark, 0, s * 0.35, 0.6);
      }
      P.box(0.5, 0.25, 0.5, 0.8, 0.95, -0.5, moss);
    });
    statue(4.7, (P) => {   // a bearded bust on a pillar
      P.box(1.0, 1.9, 1.0, 0, 0.95, 0, dark).box(1.2, 0.2, 1.2, 0, 1.95, 0, stone).box(0.7, 0.6, 1.2, 0, 2.35, 0, stone).box(0.62, 0.7, 0.62, 0, 2.95, 0, stone).box(0.25, 0.5, 0.5, 0.32, 2.75, 0, dark);
      P.box(0.6, 0.4, 0.4, -0.2, 0.3, 0.5, moss);
    });
    // rubble and moss already round their feet
    const R = new Boxes();
    for (let i = 0; i < 26; i++) { const s = rnd(0.25, 0.6); R.box(s, s * 0.7, s, rnd(-2.5, 2.8), s * 0.3, rnd(-5.2, 5.2), i % 3 ? stone : dark, rnd(0, 3), rnd(-0.3, 0.3)); }
    for (let i = 0; i < 10; i++) R.box(rnd(0.3, 0.6), 0.25, rnd(0.3, 0.6), rnd(-1.5, 1.8), 0.12, rnd(-5, 5), moss, rnd(0, 3));
    R.bake(g);
    const chunks = swarm(130, M(0xffffff, { r: 0.92 }), [0xb8b4ac, 0x9a968e, 0xc8c4bc, 0x8a867e, 0xaaa69e]); chunks.visible = false; g.add(chunks);
    const dustM = mat(0xffffff, { r: 1, op: 0.45 }), dust = swarm(44, dustM, [0x9a948a, 0x8a847a, 0xaaa49a]); dust.visible = false; g.add(dust);
    const SPAN = [[-3.3, 7], [-0.4, 5], [2.4, 5], [4.7, 3.2]];
    let broke = false;
    U.open = (u, dt) => {
      if (U.fin) return;
      if (!broke) {
        for (const s of statues) { s.rotation.x = Math.sin(u * 90 + s.position.z) * 0.04; s.rotation.z = Math.cos(u * 70 + s.position.z) * 0.03; }
        if (u < 0.14) return;
        broke = true; for (const s of statues) s.visible = false;
        chunks.visible = dust.visible = true;
        for (const p of chunks.userData.P) {
          const [z, h] = SPAN[p.i % 4];
          p.x = rnd(-0.8, 0.9); p.y = rnd(0.4, h); p.z = z + rnd(-0.9, 0.9); p.s = rnd(0.25, 0.7); p.sx = rnd(0.7, 1.3); p.sy = rnd(0.6, 1.1); p.sz = rnd(0.7, 1.3);
          p.vx = rnd(-1.2, 2.6); p.vy = rnd(-0.5, 2.5); p.vz = Math.sign(z) * rnd(0.3, 2.4) + rnd(-0.6, 0.6); p.a = rnd(-4, 4); p.b = rnd(-4, 4);
        }
        for (const p of dust.userData.P) { const [z, h] = SPAN[p.i % 4]; p.x = rnd(-1, 1.5); p.y = rnd(0.5, h * 0.8); p.z = z + rnd(-1, 1); p.s = rnd(0.3, 0.7); p.vx = rnd(-0.3, 1.2); p.vy = rnd(0.2, 0.9); p.vz = rnd(-0.8, 0.8); p.rx = rnd(0, 3); p.ry = rnd(0, 3); }
      }
      let moving = false;
      for (const p of chunks.userData.P) {
        if (p.rest) continue;
        moving = true;
        p.vy -= 16 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rx += p.a * dt; p.rz += p.b * dt;
        const floor = p.s * p.sy * 0.4;
        if (p.y < floor) { p.y = floor; p.vy *= -0.3; p.vx *= 0.55; p.vz *= 0.55; p.a *= 0.5; p.b *= 0.5; if (Math.abs(p.vy) < 0.6 && Math.hypot(p.vx, p.vz) < 0.3) { p.rest = true; p.rx = Math.round(p.rx / 1.571) * 1.571; p.rz = 0; } }
      }
      if (moving) flush(chunks);
      const fade = 1 - lin(u, 0.55, 1);
      dustM.opacity = 0.45 * fade;
      for (const p of dust.userData.P) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.s += dt * 0.45; p.vx *= 1 - dt * 0.5; p.vz *= 1 - dt * 0.5; }
      flush(dust);
      if (u >= 1) { dust.visible = false; if (!moving) U.fin = true; }
    };
  } else if (kind === 'bridge') {
    // the lift bridge: both leaves up on their hinges (red girders, a dark deck), chained to the gatehouses; both come down
    U.dur = 4.5;
    const deck = M(0x3a3a40, { r: 0.8 }), plank = M(0x4a3424, { r: 0.9 }), red = M(0xc0302a, { r: 0.5, m: 0.2 }), redD = M(0x8a2020, { r: 0.6, m: 0.2 }), yellow = M(0xf2d040, { e: 0x806010, ei: 0.3 }), iron = M(0x2a2a2e, { r: 0.5, m: 0.5 });
    const leaves = [], A = 1.22;
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(s * 4.5, 0, 0); g.add(pivot);
      const P = new Boxes(), d = -s;   // the leaf reaches from its hinge towards the middle
      P.box(4.5, 0.6, 8.0, d * 2.25, -0.3, 0, deck).box(4.5, 0.3, 8.6, d * 2.25, -0.75, 0, plank);
      for (const k of [0, 1]) P.box(1.2, 0.04, 0.25, d * (0.9 + 2.2 * k), 0.02, 0, yellow);
      for (const z of [-4.1, 4.1]) {
        P.box(4.5, 1.0, 0.32, d * 2.25, 0.5, z, red).box(4.5, 0.22, 0.44, d * 2.25, 1.05, z, redD);
        for (let k = 0; k < 4; k++) P.box(0.16, 1.0, 0.4, d * (0.3 + k * 1.3), 0.5, z, redD);
      }
      for (let k = 0; k < 4; k++) P.box(0.3, 0.25, 8.6, d * (0.5 + k * 1.2), -1.0, 0, red);
      P.box(0.3, 0.9, 8.6, d * 4.35, -0.35, 0, redD);
      for (let k = 0; k < 6; k++) P.box(0.34, 0.2, 0.7, d * 4.36, -0.35, -3.6 + k * 1.44, k % 2 ? yellow : iron);
      P.bake(pivot); pivot.rotation.z = d * A; leaves.push([pivot, d]);
    }
    const chains = [];
    for (const s of [-1, 1]) for (const z of [-4.1, 4.1]) chains.push([cable(g, iron, 0.12), s, z]);
    const lay = (a) => {
      for (const [p, d] of leaves) p.rotation.z = d * a;
      for (const [c, s, z] of chains) { const tx = s * 4.5 - s * 4.2 * Math.cos(a), ty = 4.2 * Math.sin(a) + 1.0; stretch(c, s * 6, 7.3, z * 1.3, tx, ty, z); }
    };
    lay(A);
    U.open = (u) => { const k = ease(u); lay(A * (1 - k) + Math.sin(k * Math.PI) * 0.02); };
  } else if (kind === 'rocks') {
    // a mudslide off the north cliff: brown mud heaped across the road, boulders and broken timbers in it; it all slides away
    U.dur = 5;
    const mudA = M(0x7a4a26, { r: 0.75 }), mudB = M(0x5e3618, { r: 0.55 }), dirt = M(0x8e6236, { r: 0.95 }), wood = M(0x6a4424, { r: 0.85 });
    const slabs = [];
    for (let j = 0; j < 4; j++) {
      const P = new Boxes(), z0 = -6 + j * 3;
      for (let z = z0; z < z0 + 3 && z <= 5; z++) for (let x = -4; x <= 4; x++) {
        const h = Math.max(0.3, 5.6 * (1 - Math.abs(x + 0.3) / 4.8) * (0.35 + 0.65 * (6 - z) / 12) + rnd(-0.4, 0.4));
        P.box(1.02, h, 1.02, x, h / 2, z + 0.4, (x + z) % 3 ? mudA : (x + z) % 2 ? mudB : dirt);
      }
      for (let k = 0; k < 2; k++) P.box(rnd(2.4, 3.6), 0.25, 0.3, rnd(-1.5, 1.5), rnd(1.6, 3.4) * (1 - j * 0.15), z0 + rnd(0.5, 2.5), wood, rnd(-0.8, 0.8), rnd(-0.4, 0.4), rnd(-0.5, 0.5));
      const s = P.bake(); s.userData.z0 = z0; g.add(s); slabs.push(s);
    }
    const stains = new Boxes(); for (let z = -5; z <= 5; z++) stains.box(rnd(5, 8), 0.05, 1.02, rnd(-1, 1), 0.03, z + 0.4, z % 2 ? mudB : mudA);
    stains.bake(g);
    const boulders = [];
    for (let i = 0; i < 13; i++) {
      const s = rnd(0.8, 1.7), m = new THREE.Mesh(new THREE.BoxGeometry(s, s * rnd(0.7, 1.0), s * rnd(0.8, 1.1)), M([0x8a8278, 0x7a6a58, 0x9a9288, 0x6e6458][i % 4], { r: 0.95 }));
      const z = rnd(-5.5, 4.5), x = rnd(-2.5, 2.5), top = Math.max(0.6, 4.6 * (1 - Math.abs(x) / 3.8) * (0.3 + 0.7 * (6 - z) / 12));
      m.position.set(x, top * rnd(0.6, 1.0), z); m.rotation.set(rnd(0, 1), rnd(0, 3), rnd(0, 1)); m.castShadow = true; m.userData.y0 = m.position.y; m.userData.z0 = z; m.userData.s = s;
      g.add(m); boulders.push(m);
    }
    const splash = swarm(40, M(0xffffff, { r: 0.8 }), [0x6a3e1e, 0x7a4a26, 0x5e3618]); splash.visible = false; g.add(splash);
    U.open = (u, dt) => {
      if (U.fin) return;
      slabs.forEach((s, j) => { const k = seg(u, 0.05 + (3 - j) * 0.07, 0.8 + (3 - j) * 0.05); s.position.z = 2.5 * k; s.position.y = -4.8 * k * k; s.scale.y = 1 - 0.6 * k; });
      for (const m of boulders) { const k = seg(u, 0.02, 0.75); m.position.z = m.userData.z0 + 5 * k; m.position.y = m.userData.y0 * (1 - k) - 2.4 * k * k; m.rotation.x += dt * 4 * (1 - k); }
      if (u > 0.05 && !splash.visible) { splash.visible = true; for (const p of splash.userData.P) { p.x = rnd(-3, 3); p.y = rnd(0.5, 3); p.z = rnd(-5, 4); p.vx = rnd(-1, 1); p.vy = rnd(2, 5); p.vz = rnd(1, 4); p.s = rnd(0.2, 0.45); } }
      if (splash.visible) { for (const p of splash.userData.P) { p.vy -= 14 * dt; p.x += p.vx * dt; p.y = Math.max(-1, p.y + p.vy * dt); p.z += p.vz * dt; p.s = Math.max(0, p.s - dt * 0.12); } flush(splash); }
      if (u >= 1) { for (const s of slabs) s.visible = false; for (const m of boulders) m.visible = false; splash.visible = false; U.fin = true; }
    };
  } else if (kind === 'gate') {
    // the Lotus's gate: green vines looped between the stone pillars, big pink lotus flowers glowing in them; it withers and falls apart
    U.dur = 4.5;
    const vineM = mat(0x2f7a2a, { r: 0.7 }), leafM = mat(0x4aa83a, { r: 0.7 }), coreM = M(0xffd84a, { e: 0xffb020, ei: 2 });
    const petalM = mat(0xffffff, { r: 0.4, e: 0xff2a98, ei: 2 });
    const vineG = [0, 1, 2, 3].map(() => new Boxes());
    const quarter = (z) => (z < -2.6 ? 0 : z < 0 ? 1 : z < 2.6 ? 2 : 3);
    const vine = (z, y, i) => { const B2 = vineG[quarter(z)]; B2.box(0.55, 0.55, 0.55, (i % 2 ? 0.12 : -0.12), y, z, vineM, i * 0.3); if (i % 4 === 0) B2.box(0.55, 0.1, 0.38, 0.3, y + 0.15, z + 0.1, leafM, i, 0.4, 0.3); };
    let n = 0;
    for (const [base, amp, f, ph] of [[1.0, 0.8, 1.1, 0], [3.0, 1.2, 0.9, 2], [5.1, 0.5, 1.3, 1]]) for (let z = -5.3; z <= 5.3; z += 0.28) vine(z, base + amp * Math.sin(z * f + ph), n++);
    const LOOPS = [[-2.6, 3.0, 1.4], [2.5, 2.6, 1.6], [0, 4.4, 1.1]];
    for (const [cz, cy, r] of LOOPS) for (let a = 0; a < Math.PI * 2; a += 0.28 / r) vine(cz + Math.cos(a) * r, cy + Math.sin(a) * r, n++);
    for (const z of [-4.9, 4.9]) for (let y = 0.2; y < 5.6; y += 0.3) vine(z + Math.sin(y * 2) * 0.25, y, n++);   // up the pillars
    const vines = vineG.map((B2) => { const v = B2.bake(); g.add(v); return v; });
    // the flowers: petals in a cup round each heart, facing the road east
    const FLOWERS = [[0.45, 3.0, -2.6, 1.5], [0.45, 2.6, 2.5, 1.6], [0.45, 4.6, 0, 1.2], [0.4, 1.2, -4.3, 0.6], [0.4, 1.3, 4.1, 0.6], [0.35, 5.2, -3.6, 0.45], [0.35, 5.0, 3.6, 0.5], [0.35, 0.9, 0.2, 0.55], [0.35, 3.6, 1.0, 0.4], [0.35, 1.8, -1.2, 0.4]];
    const per = (s) => (s > 0.8 ? [9, 5] : [6, 0]);
    const nPet = FLOWERS.reduce((t, f) => t + per(f[3])[0] + per(f[3])[1], 0);
    const petals = swarm(nPet, petalM, [0xff4ab0, 0xff8ad0, 0xff2a98]); g.add(petals);
    const cores = new Boxes();
    let pi = 0;
    for (const [fx, fy, fz, s] of FLOWERS) {
      cores.box(0.35 * s, 0.5 * s, 0.5 * s, fx + 0.1, fy, fz, coreM);
      const [no, ni] = per(s);
      for (const [cnt, tilt, len, off] of [[no, 0.95, 1.0, 0], [ni, 0.45, 0.8, 0.3]]) for (let k = 0; k < cnt; k++) {
        const phi = (k + off) / cnt * Math.PI * 2, ry = Math.cos(phi), rz = Math.sin(phi);
        _a.set(Math.cos(tilt), Math.sin(tilt) * ry, Math.sin(tilt) * rz);
        _q.setFromUnitVectors(_Y, _a); _e.setFromQuaternion(_q);
        const p = petals.userData.P[pi++];
        p.x = fx + _a.x * len * s * 0.5; p.y = fy + _a.y * len * s * 0.55; p.z = fz + _a.z * len * s * 0.55;
        p.rx = _e.x; p.ry = _e.y; p.rz = _e.z; p.s = s; p.sx = 0.16; p.sy = len; p.sz = 0.5;
        p.a = rnd(0, 0.55); p.vx = rnd(0.2, 1.4); p.vz = rnd(-0.6, 0.6); p.b = rnd(-3, 3);
      }
    }
    flush(petals);
    const coreMesh = cores.bake(); g.add(coreMesh);
    const sparks = swarm(34, M(0xffffff, { e: 0xff7ae0, ei: 2.5 }), [0xff9ae8, 0xd08aff, 0xffd0f0]); g.add(sparks);
    for (const p of sparks.userData.P) { p.a = rnd(-1, 1.5); p.b = rnd(-5, 5); p.c = rnd(0.3, 6); p.k = rnd(0.3, 0.8); p.t = rnd(0, 6); p.s = rnd(0.08, 0.16); }
    const twinkle = (dt, rise = 0) => { for (const p of sparks.userData.P) { p.t += dt * p.k; p.x = p.a + Math.sin(p.t * 1.3) * 0.3; p.y = p.c + Math.sin(p.t) * 0.4 + rise * (1 + p.k); p.z = p.b + Math.cos(p.t * 0.7) * 0.3; p.rx = p.ry = p.t; } flush(sparks); };
    const green = new THREE.Color(0x2f7a2a), brown = new THREE.Color(0x6a5030), leafG = new THREE.Color(0x4aa83a), leafB = new THREE.Color(0x9a7a40);
    b.lit = 0xff5ac8;
    let tt = 0;
    U.idle = (dt) => { tt += dt; petalM.emissiveIntensity = 2 + Math.sin(tt * 2) * 0.45; twinkle(dt); };
    U.open = (u, dt) => {
      if (U.fin) return;
      const w = ease(u);
      petalM.emissiveIntensity = 2 * (1 - w) + 0.1; U.litK = 1 - w;
      vineM.color.copy(green).lerp(brown, seg(u, 0, 0.5)); leafM.color.copy(leafG).lerp(leafB, seg(u, 0, 0.5));
      coreMesh.visible = u < 0.4;
      for (const p of petals.userData.P) {
        if (p.rest || u < 0.08 + p.a) continue;
        p.vy -= 9 * dt; p.vx *= 1 - dt * 1.5; p.x += p.vx * dt; p.y += Math.max(-3, p.vy) * dt; p.z += p.vz * dt; p.rz += p.b * dt; p.rx += p.b * 0.5 * dt;
        if (p.y < 0.06) { p.y = 0.06; p.rest = true; p.rx = Math.PI / 2; p.ry = rnd(0, 3); p.rz = 0; }
      }
      flush(petals);
      vines.forEach((v, i) => { const k = seg(u, 0.4 + i * 0.06, 0.95); v.position.y = -6.5 * k * k; v.rotation.x = (i < 2 ? -1 : 1) * 0.35 * k; v.position.x = 0.8 * k; });
      sparks.visible = u < 0.9; twinkle(dt, w * 2);
      if (u >= 1) { for (const v of vines) v.visible = false; U.fin = true; }
    };
  } else if (kind === 'beds') {
    // Crusty's stock heaped across the road: teal, blue and sky-blue waterbeds on pallets, ladders against them, red pillows;
    // they deflate and the water spills out
    U.dur = 4.5;
    const wood = M(0x8a5a30, { r: 0.85 }), woodD = M(0x5a3a20, { r: 0.85 }), red = M(0xc83a3a, { r: 0.6 });
    const pal = new Boxes(); pal.box(3.2, 0.12, 10.4, 0, 0.06, 0, woodD); for (let k = 0; k < 8; k++) pal.box(3.2, 0.1, 0.9, 0, 0.17, -4.6 + k * 1.32, wood); pal.bake(g);
    const COL = [[0x2ab8a8, 0x7ae0d4], [0x2a62d0, 0x7aa8f0], [0x5ab0e8, 0xaad8f8]];
    const beds = [];
    const layout = [[0, [-3.75, -1.25, 1.25, 3.75]], [1, [-2.5, 0, 2.5]], [2, [-1.25, 1.25]]];
    let n = 0;
    for (const [tier, zs] of layout) for (const z of zs) {
      const [c, hi] = COL[(n + tier) % 3], P = new Boxes(), sh = M(c, { r: 0.12, m: 0.1 }), lite = M(hi, { r: 0.1, m: 0.1 }), seam = M(new THREE.Color(c).multiplyScalar(0.7).getHex(), { r: 0.3 });
      P.box(2.9, 0.8, 2.4, 0, 0, 0, sh).box(2.2, 0.06, 1.5, -0.1, 0.42, -0.1, lite).box(0.06, 0.5, 1.6, 1.46, 0.05, -0.1, lite);
      for (const dz of [-0.6, 0, 0.6]) P.box(2.92, 0.82, 0.05, 0, 0, dz, seam);
      if (n % 3 === 1) P.box(0.7, 0.28, 1.1, 0.7, 0.54, 0.3, red, 0.3);
      const m = P.bake(); m.position.set(rnd(-0.15, 0.15) + (tier === 2 ? 0.2 : 0), 0.62 + tier * 0.84, z); m.rotation.y = rnd(-0.06, 0.06);
      m.userData = { y0: m.position.y, z0: z, tier, d: tier * 0.1 + Math.random() * 0.15, x1: rnd(-0.5, 1.6) + (2 - tier) * 0.3, ph: Math.random() * 6 };
      g.add(m); beds.push(m); n++;
    }
    const ladders = [];
    for (const [z, lean] of [[-2.0, 0.38], [2.6, 0.3]]) {
      const P = new Boxes();
      for (const dz of [-0.35, 0.35]) P.box(0.12, 3.4, 0.12, 0, 1.7, dz, wood);
      for (let k = 0; k < 7; k++) P.box(0.1, 0.08, 0.7, 0, 0.3 + k * 0.45, 0, woodD);
      const l = P.bake(); l.position.set(2.5, 0, z); l.rotation.z = lean; g.add(l); ladders.push(l);
    }
    const pillows = new Boxes(); for (const [x, z, r] of [[2.2, -4.6, 0.4], [2.8, 4.4, 1.1]]) pillows.box(0.7, 0.3, 1.1, x, 0.15, z, red, r); pillows.bake(g);
    const puddleM = mat(0x4aa8e8, { r: 0.05, m: 0.2, op: 0.7 }), puddle = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), puddleM); puddle.position.set(0.8, 0.03, 0); puddle.visible = false; g.add(puddle);
    const drops = swarm(56, M(0xffffff, { r: 0.05, op: 0.8 }), [0x6ac0f0, 0x9ad8f8, 0x4aa0e0]); drops.visible = false; g.add(drops);
    let tt = 0;
    U.idle = (dt) => { tt += dt; for (const m of beds) m.scale.y = 1 + Math.sin(tt * 2.2 + m.userData.ph) * 0.03; };
    U.open = (u, dt) => {
      if (U.fin) return;
      for (const m of beds) {
        const D = m.userData, k = seg(u, D.d, D.d + 0.55);
        m.scale.y = Math.max(0.16, 1 - 0.86 * k + Math.sin(u * 30 + D.ph) * 0.06 * (1 - k) * (k > 0 ? 1 : 0));
        m.position.y = D.y0 * (1 - k) + (0.12 + D.tier * 0.13) * k;
        m.position.z = D.z0 * (1 + 0.35 * k); m.position.x = D.x1 * k;
      }
      ladders.forEach((l, i) => { const k = seg(u, 0.1, 0.45); l.rotation.z = (i ? 0.3 : 0.38) + (Math.PI / 2 - 0.38) * k; l.position.x = 2.5 + k * 0.3; l.position.y = 0.06 * k; });
      const sp = seg(u, 0.12, 0.7);
      puddle.visible = u > 0.1; puddle.scale.set(1 + 8 * sp, 1, 1 + 10.5 * sp); puddleM.opacity = 0.7 * (1 - lin(u, 0.75, 1));
      if (u > 0.1 && !drops.visible) { drops.visible = true; for (const p of drops.userData.P) { const m = beds[p.i % beds.length]; p.x = m.position.x + 1; p.y = m.position.y + 0.4; p.z = m.position.z + rnd(-1, 1); p.vx = rnd(1, 4); p.vy = rnd(1, 4.5); p.vz = rnd(-2, 2); p.s = rnd(0.12, 0.26); p.t = rnd(0, 0.4); } }
      if (drops.visible) { for (const p of drops.userData.P) { if (p.t > 0) { p.t -= dt; continue; } p.vy -= 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.05) { p.y = 0.05; p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; p.s = Math.max(0, p.s - dt * 0.3); } } flush(drops); }
      if (u >= 1) { puddle.visible = drops.visible = false; U.fin = true; }
    };
  } else if (kind === 'shadow') {
    // a wall of the Underworld's shadow between the fire pillars: black and purple swirls, never still; it parts like curtains
    U.dur = 4.5;
    const dark = swarm(330, mat(0xffffff, { r: 0.9, e: 0x12061e, ei: 0.8, op: 0.94 }), [0x0a0610, 0x140a20, 0x1e0e30, 0x060408, 0x2a1448]);
    const glow = swarm(120, M(0xffffff, { e: 0x8a4aff, ei: 2.6 }), [0xb07aff, 0x8a4aff, 0xd0a0ff]);
    g.add(dark); g.add(glow);
    const VOR = [[-3.5, 4.4, 1.7, 1], [-0.9, 2.3, 1.6, -1], [1.5, 4.9, 1.4, 1], [3.7, 2.2, 1.7, -1], [0.4, 0.9, 0.9, 1], [-3.8, 1.2, 1.1, -1]];
    for (const [im, arms] of [[dark, false], [glow, true]]) for (const p of im.userData.P) {
      const v = VOR[p.i % VOR.length]; p.a = p.i % VOR.length;
      if (!arms && p.i % 5 === 4) { p.a = -1; p.b = rnd(-5, 5); p.c = rnd(0, 8); p.k = rnd(0.3, 0.9); p.s = rnd(0.5, 1.1); }   // the murk round the swirls, drifting up
      else { p.c = arms ? Math.sqrt(Math.random()) * v[2] : Math.random() * v[2] * 1.15; p.t = arms ? p.c * 2.6 + (p.i % 2) * Math.PI : rnd(0, 6.3); p.k = v[3] * rnd(0.7, 1.3) * (1.6 - p.c / v[2] * 0.6); p.s = arms ? rnd(0.16, 0.3) : rnd(0.35, 0.8); }
      p.x = rnd(-0.9, 0.9); p.d = Math.random(); p.rx = rnd(0, 3); p.ry = rnd(0, 3);
    }
    let part = 0;
    const swirl = (dt) => {
      for (const im of [dark, glow]) {
        for (const p of im.userData.P) {
          let z, y;
          if (p.a < 0) { p.c += dt * p.k; if (p.c > 8.5) p.c -= 8.5; z = p.b; y = p.c; p.base = p.base ?? p.s; p.s = p.base * Math.min(1, (8.5 - p.c) * 0.6); }
          else { const v = VOR[p.a]; p.t += dt * p.k; z = v[0] + Math.cos(p.t) * p.c; y = v[1] + Math.sin(p.t) * p.c; }
          const sgn = z < 0 ? -1 : 1, off = part * (2.5 + 4.5 * p.d);
          p.z = z + sgn * off; p.y = y + part * part * p.d * 3; p.ry += dt * 0.5;
          if (part > 0) { p.base = p.base ?? p.s; p.s = p.base * Math.max(0, 1 - part * (0.7 + p.d * 0.6)) * (Math.abs(p.z) > 6.5 ? 0 : 1); }
        }
        flush(im);
      }
    };
    swirl(0);
    b.lit = 0x8a4aff;
    U.idle = swirl;
    U.open = (u, dt) => { if (U.fin) return; part = ease(u); U.litK = 1 - part; swirl(dt); if (u >= 1) { dark.visible = glow.visible = false; U.fin = true; } };
  }
  if (flames.length) {
    const idle = U.idle; let tt = 0;
    const flick = (dt) => { tt += dt; flames.forEach((f, i) => { const s = f.userData.s; f.visible = s > 0.02; f.scale.set(s, s * (0.8 + Math.sin(tt * 9 + i * 2) * 0.3), s); }); };
    U.idle = (dt) => { idle?.(dt); flick(dt); };
    const open = U.open; U.open = (u, dt) => { open?.(u, dt); flick(dt); };
  }
  return g;
}

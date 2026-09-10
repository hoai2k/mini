/** The 3D world: terrain height, structure colliders, volumes and triggers.
 * Colliders come from the same stand-in meshes the player sees (every solid
 * part becomes an oriented box in the structure's frame), so a landing and
 * its picture can never disagree, and swapping a stand-in for a delivered
 * model only changes the picture if the model keeps the same solid parts.
 */
import { Box3, Group, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import {
  createStandIn,
  makeHeightField,
  regionById,
} from '../../../3d/standins/src/index.js';
import type { District, Placement } from './district';
import { buildRoute, type Route } from './route';
import { sceneryFor } from './scenery';

export interface Collider {
  /** Structure instance that owns this box. */
  owner: string;
  /** Centre and yaw of the structure frame in world space. */
  cx: number;
  cz: number;
  yaw: number;
  /** Box in the structure frame: centre offsets and half extents. */
  ox: number;
  oz: number;
  hx: number;
  hz: number;
  /** World-space vertical extent. */
  y0: number;
  y1: number;
  /** A spring pad plate launches whatever lands on it. */
  spring?: boolean;
  /** Local vertical extent, kept so a moving owner can re-place the box. */
  ly0?: number;
  ly1?: number;
  instance?: Instance;
}
/** A lockdown dome: while active it keeps Hopper inside the arena. */
export interface Field {
  id: string;
  x: number;
  y: number;
  z: number;
  r: number;
  active: boolean;
  cleared: boolean;
  group: string;
  object?: Object3D;
  /** Seconds of bright flare left after Hopper pushed against the barrier. */
  flare?: number;
}
export interface Volume {
  kind: 'thermal' | 'wind';
  x: number;
  y0: number;
  y1: number;
  z: number;
  r: number;
  /** Wind direction (unit, XZ) and strength in m/s. */
  dx?: number;
  dz?: number;
  push?: number;
  lift?: number;
}
export interface Trigger {
  id: string;
  kind: 'checkpoint' | 'signal' | 'capsule';
  x: number;
  y: number;
  z: number;
  r: number;
  taken?: boolean;
  object?: Object3D;
  /** A caged signal: locked until Hopper's attacks break the cage open. */
  locked?: boolean;
  cage?: Object3D;
  lockY?: number;
  /** Remaining cage integrity; bars fall away as it drops. */
  cageHp?: number;
  cageMaxHp?: number;
  cageBars?: Object3D[];
  cageCrown?: Object3D;
  /** Seconds left of the white flash on a hit. */
  cageFlash?: number;
}
export interface Instance {
  id: string;
  standIn: string;
  object: Group;
  placement: Placement;
  /** Shuttle state for a moving structure. */
  moving?: { from: [number, number, number]; to: [number, number, number]; speed: number; dwell: number; t: number; dir: 1 | -1; wait: number; dx: number; dy: number; dz: number };
}

const CELL = 60;
const cellKey = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

/** Collision shapes of one placed stand-in, in its own frame. */
function collidersOf(object: Group, id: string): Collider[] {
  object.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(object.matrixWorld).invert();
  const out: Collider[] = [];
  const corner = new Vector3();
  object.traverse((o) => {
    if (!(o as Mesh).isMesh || o.userData.ink) return;
    const mesh = o as Mesh;
    const material = mesh.material as { transparent?: boolean; opacity?: number };
    // Translucent volumes (thermal columns, wind lanes, fields) are not solid.
    if (material.transparent && (material.opacity ?? 1) < 0.9) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    const local = new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    const box = new Box3();
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z);
      box.expandByPoint(corner.applyMatrix4(local));
    }
    const size = new Vector3();
    box.getSize(size);
    // Thin decorations (stripes, seams, halos, pad chevrons) are not worth a collider.
    if (size.x < 0.6 || size.z < 0.6 || size.y < 0.3) return;
    // A signal cage's bars and crown are a barrier to shots, not to Hopper: the
    // pedestal is the only solid part, so an opened cage can be walked into.
    if (id.startsWith('prop.signalCage') && (mesh.name.startsWith('Bar') || mesh.name === 'Crown')) return;
    if (/^(Chevron|Halo|Corona|Arrow|Streak|Frond|Rib\d)/.test(mesh.name)) return;
    const centre = new Vector3();
    box.getCenter(centre);
    out.push({
      owner: id,
      cx: object.position.x,
      cz: object.position.z,
      yaw: object.rotation.y,
      ox: centre.x,
      oz: centre.z,
      hx: size.x / 2,
      hz: size.z / 2,
      y0: object.position.y + box.min.y,
      y1: object.position.y + box.max.y,
      spring: mesh.name === 'Plate' && object.name === 'prop.springPad',
    });
  });
  return out;
}

export class World {
  readonly district: District;
  readonly heightAt: (x: number, z: number) => number;
  readonly instances: Instance[] = [];
  readonly colliders: Collider[] = [];
  readonly volumes: Volume[] = [];
  readonly triggers: Trigger[] = [];
  readonly fields: Field[] = [];
  /** The trail from the start to the exit; the camera faces along it. */
  readonly route: Route;
  /** Generated scenery: span continuations and the middle-distance structures. */
  readonly scenery: Placement[] = [];
  private grid = new Map<string, Collider[]>();
  readonly region;
  constructor(district: District) {
    this.district = district;
    this.region = regionById(district.region);
    this.route = buildRoute(district);
    this.heightAt = makeHeightField({ size: district.size, ...district.terrain });
    for (const p of district.placements) this.place(p);
    // The world either side of the trail: spans that land somewhere, and
    // structures standing well back from the path.
    this.scenery = sceneryFor(district, this.route, this.heightAt);
    for (const p of this.scenery) this.place(p);
    for (const c of district.cages || []) this.placeCage(c);
    for (const g of district.gates || []) this.placeGate(g);
    if (district.boss) {
      const b = district.boss;
      this.fields.push({ id: 'boss', x: b.x, y: this.heightAt(b.x, b.z) + b.y, z: b.z, r: b.r, active: false, cleared: false, group: 'boss' });
    }
  }
  /** A caged signal: the cage and its prize, locked until the bars are broken. */
  private placeCage(c: { id: string; x: number; z: number; y?: number; mode?: 'r' | 'a' }) {
    const cage = this.place({ id: 'prop.signalCage', x: c.x, z: c.z, y: c.y, mode: c.mode });
    const beacon = this.place({ id: 'prop.signalBeacon', x: c.x, z: c.z, y: (c.y || 0) + (c.mode === 'a' ? 1.5 : 1.5), mode: c.mode });
    const t = this.triggers.find((tr) => tr.object === beacon.object);
    if (t) {
      t.id = `cage:${c.id}`;
      t.locked = true;
      t.cage = cage.object;
      t.lockY = cage.object.position.y + 9.2;
      // The bars are the damage read: one falls away for each step of integrity
      // lost, so the cage is visibly coming apart before it opens.
      t.cageBars = [];
      cage.object.traverse((o) => {
        if (o.name.startsWith('Bar')) t.cageBars!.push(o);
        else if (o.name === 'Crown') {
          t.cageCrown = o;
          // Stand-in materials are cached and shared by colour, so this cage
          // needs its own copy before its lock can fade with its own damage.
          const mesh = o as { material?: { clone?: () => unknown } };
          if (mesh.material?.clone) mesh.material = mesh.material.clone() as typeof mesh.material;
        }
      });
      t.cageMaxHp = t.cageBars.length || 10;
      t.cageHp = t.cageMaxHp;
    }
  }
  /** A gate knot's dome, with two emitters on the ground beside it. */
  private placeGate(g: { id: string; x: number; z: number; r: number; group: string; y?: number }) {
    const y = this.heightAt(g.x, g.z) + (g.y ?? 0);
    for (const s of [-1, 1]) this.place({ id: 'prop.lockdownEmitter', x: g.x + s * Math.min(60, g.r * 0.6), z: g.z, mode: 'r' });
    this.fields.push({ id: g.id, x: g.x, y, z: g.z, r: g.r, active: false, cleared: false, group: g.group });
  }
  /** Advance moving structures; returns nothing, callers read instance.moving.dx/dy/dz. */
  update(dt: number) {
    for (const inst of this.instances) {
      const m = inst.moving;
      if (!m) continue;
      m.dx = m.dy = m.dz = 0;
      if (m.wait > 0) {
        m.wait -= dt;
        continue;
      }
      const len = Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1], m.to[2] - m.from[2]) || 1;
      m.t += (m.dir * m.speed * dt) / len;
      if (m.t >= 1 || m.t <= 0) {
        m.t = Math.max(0, Math.min(1, m.t));
        m.dir = m.dir === 1 ? -1 : 1;
        m.wait = m.dwell;
      }
      const nx = m.from[0] + (m.to[0] - m.from[0]) * m.t,
        ny = m.from[1] + (m.to[1] - m.from[1]) * m.t,
        nz = m.from[2] + (m.to[2] - m.from[2]) * m.t;
      m.dx = nx - inst.object.position.x;
      m.dy = ny - inst.object.position.y;
      m.dz = nz - inst.object.position.z;
      inst.object.position.set(nx, ny, nz);
      for (const c of this.colliders) {
        if (c.instance !== inst) continue;
        c.cx = nx;
        c.cz = nz;
        c.y0 = ny + (c.ly0 ?? 0);
        c.y1 = ny + (c.ly1 ?? 0);
      }
    }
  }
  /** Ground height under a structure so placements can sit on the terrain. */
  private baseY(p: Placement): number {
    if (p.mode === 'a') return p.y || 0;
    return this.heightAt(p.x, p.z) + (p.y || 0) - (p.id.startsWith('structure.') && !p.y ? 1.5 : 0);
  }
  place(p: Placement): Instance {
    const object = createStandIn(p.id, p.opts || {}) as Group;
    object.position.set(p.x, this.baseY(p), p.z);
    object.rotation.y = p.yaw || 0;
    object.updateWorldMatrix(true, true);
    const id = `${p.id}#${this.instances.length}`;
    const instance: Instance = { id, standIn: p.id, object, placement: p };
    if (p.moving) {
      const from: [number, number, number] = [object.position.x, object.position.y, object.position.z];
      const toY = p.moving.to.y !== undefined ? (p.mode === 'a' ? p.moving.to.y : this.heightAt(p.moving.to.x, p.moving.to.z) + p.moving.to.y) : from[1];
      instance.moving = { from, to: [p.moving.to.x, toY, p.moving.to.z], speed: p.moving.speed, dwell: p.moving.dwell ?? 1.5, t: 0, dir: 1, wait: 0, dx: 0, dy: 0, dz: 0 };
    }
    this.instances.push(instance);
    // Volumes and triggers are read from the stand-in's sockets and metadata.
    const meta = object.userData.standIn || {};
    if (p.id === 'prop.thermalVent' || meta.volume === 'updraft') {
      const base = object.getObjectByName('LiftBase'),
        top = object.getObjectByName('LiftTop');
      const y0 = object.position.y + (base?.position.y ?? 0),
        y1 = object.position.y + (top?.position.y ?? meta.size?.[1] ?? 160);
      this.volumes.push({ kind: 'thermal', x: object.position.x, z: object.position.z, y0, y1, r: (meta.size?.[0] ?? 20) * 0.45, lift: 25 });
    } else if (p.id === 'prop.windLane') {
      const a = new Vector3(),
        b = new Vector3();
      object.getObjectByName('FlowStart')!.getWorldPosition(a);
      object.getObjectByName('FlowEnd')!.getWorldPosition(b);
      const d = b.clone().sub(a),
        len = d.length();
      d.normalize();
      this.volumes.push({ kind: 'wind', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, y0: a.y - 20, y1: a.y + 20, r: len / 2, dx: d.x, dz: d.z, push: 15 });
    } else if (p.id === 'prop.checkpointTotem') {
      this.triggers.push({ id, kind: 'checkpoint', x: object.position.x, y: object.position.y, z: object.position.z, r: 14, object });
    } else if (p.id === 'prop.signalBeacon') {
      this.triggers.push({ id, kind: 'signal', x: object.position.x, y: object.position.y + 1.8, z: object.position.z, r: 7, object });
    } else if (p.id === 'prop.recoveryCapsule') {
      this.triggers.push({ id, kind: 'capsule', x: object.position.x, y: object.position.y + 2, z: object.position.z, r: 6, object });
    }
    // Signals, capsules and volumes have no solid parts to land on.
    if (!['prop.signalBeacon', 'prop.recoveryCapsule', 'prop.checkpointTotem', 'prop.thermalVent', 'prop.windLane', 'structure.blue.dustCurrent', 'structure.violet.gravitySeam', 'prop.lockdownDome'].includes(p.id)) {
      for (const c of collidersOf(object, id)) {
        c.instance = instance;
        c.ly0 = c.y0 - object.position.y;
        c.ly1 = c.y1 - object.position.y;
        this.addCollider(c, instance.moving ? instance.moving.to : null);
      }
    }
    return instance;
  }
  private addCollider(c: Collider, travelTo: [number, number, number] | null) {
    this.colliders.push(c);
    // Register in every cell the box's world extent touches (yaw-conservative),
    // and every cell along a moving structure's travel.
    const reach = Math.hypot(c.hx, c.hz) + Math.hypot(c.ox, c.oz);
    const minX = Math.min(c.cx, travelTo ? travelTo[0] : c.cx),
      maxX = Math.max(c.cx, travelTo ? travelTo[0] : c.cx),
      minZ = Math.min(c.cz, travelTo ? travelTo[2] : c.cz),
      maxZ = Math.max(c.cz, travelTo ? travelTo[2] : c.cz);
    for (let x = minX - reach; x <= maxX + reach + CELL; x += CELL)
      for (let z = minZ - reach; z <= maxZ + reach + CELL; z += CELL) {
        const k = cellKey(x, z);
        const list = this.grid.get(k) || [];
        list.push(c);
        this.grid.set(k, list);
      }
  }
  /** Colliders whose cells cover a point, with a margin in metres. */
  near(x: number, z: number, margin = 6): Collider[] {
    const seen = new Set<Collider>();
    for (let dx = -margin; dx <= margin; dx += Math.max(1, margin))
      for (let dz = -margin; dz <= margin; dz += Math.max(1, margin))
        for (const c of this.grid.get(cellKey(x + dx, z + dz)) || []) seen.add(c);
    return [...seen];
  }
  /** Position expressed in a collider's frame: offsets from its box centre. */
  static local(c: Collider, x: number, z: number): [number, number] {
    const dx = x - c.cx,
      dz = z - c.cz,
      cos = Math.cos(-c.yaw),
      sin = Math.sin(-c.yaw);
    return [dx * cos - dz * sin - c.ox, dx * sin + dz * cos - c.oz];
  }
  /** Highest solid top at or below `y` under a point (feet), else terrain. */
  groundAt(x: number, z: number, y: number, radius = 2.5): { y: number; collider: Collider | null } {
    let best = this.heightAt(x, z),
      hit: Collider | null = null;
    for (const c of this.near(x, z, radius + 2)) {
      if (c.y1 > y + 0.01 || c.y1 < best) continue;
      const [lx, lz] = World.local(c, x, z);
      if (Math.abs(lx) <= c.hx + radius && Math.abs(lz) <= c.hz + radius) {
        best = c.y1;
        hit = c;
      }
    }
    return { y: best, collider: hit };
  }
  /** Volumes containing a point. */
  volumesAt(x: number, y: number, z: number): Volume[] {
    const out: Volume[] = [];
    for (const v of this.volumes) {
      if (y < v.y0 || y > v.y1) continue;
      if (v.kind === 'thermal') {
        if (Math.hypot(x - v.x, z - v.z) <= v.r) out.push(v);
      } else {
        // Wind lanes are boxes along their flow direction.
        const dx = x - v.x,
          dz = z - v.z,
          along = dx * v.dx! + dz * v.dz!,
          across = -dx * v.dz! + dz * v.dx!;
        if (Math.abs(along) <= v.r && Math.abs(across) <= 20) out.push(v);
      }
    }
    return out;
  }
}

/** The 3D world: terrain height, structure colliders, volumes and triggers.
 * Colliders come from the same stand-in meshes the player sees (every solid
 * part becomes an oriented box in the structure's frame), so a landing and
 * its picture can never disagree, and swapping a stand-in for a delivered
 * model only changes the picture if the model keeps the same solid parts --
 * UNLESS the stand-in has a delivered model with its own baked collision in
 * `collision.json` (structures/*.glb so far), in which case that replaces
 * the stand-in's own primitive-mesh boxes so the collider matches what is
 * actually drawn instead of the stand-in's (often differently-sized) boxes.
 * See collision-audit.mjs / collision.json's header for how it is made.
 */
import { Box3, Group, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import {
  createStandIn,
  makeHeightField,
  regionById,
} from '../../../3d/standins/src/index.js';
import type { District, Placement } from './district';
import { deliveredFile } from './models3d';
import { buildRoute, type Route } from './route';
import { sceneryFor } from './scenery';
import bakedCollision from '../../../3d/models/collision.json';

/** A baked collision box in a delivered model's own local frame -- see
 * `collision.json`'s header (bake-collision.mjs) for how these are made. */
interface BakedBox {
  ox: number;
  oz: number;
  hx: number;
  hz: number;
  y0: number;
  y1: number;
  /** From the ring scan for a near-vertical face (a cylinder, a curved
   * facade), not the footprint scan: a shell for `resolveWalls` to meet,
   * not a designed top -- `perchNear` and signal placement skip these. */
  wall?: boolean;
}
const collisionByFile = bakedCollision as Record<string, BakedBox[]>;

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
  /** From a delivered model's baked `collision.json` rather than the
   * stand-in's own primitive meshes -- many small boxes (one per voxel
   * column) rather than one per part, so exhaustive per-collider sweeps
   * (qa/tests/collision3d.mjs's district sweep) skip these and
   * qa/tests/delivered-collision.mjs checks them instead. */
  baked?: boolean;
  /** A baked ring-scan wall shell, not a designed top -- see BakedBox.wall. */
  wall?: boolean;
  /** Local vertical extent, kept so a moving owner can re-place the box. */
  ly0?: number;
  ly1?: number;
  instance?: Instance;
}
/** A stronghold's field: entering it wakes the host; when the host is down
 * the region is freed. It never holds Hopper in. */
export interface Field {
  id: string;
  x: number;
  y: number;
  z: number;
  r: number;
  active: boolean;
  cleared: boolean;
  group: string;
  /** The stronghold's name for banners. */
  name: string;
  object?: Object3D;
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
/** A stepping stone: a temporary box collider the scene draws as a slab. */
export interface Stone {
  id: number;
  x: number;
  y: number;
  z: number;
  life: number;
  collider: Collider;
}
/** A volume in which gravity pulls up, for `life` seconds (Infinity: authored). */
export interface Flip {
  x: number;
  y0: number;
  y1: number;
  z: number;
  r: number;
  life: number;
}
export interface Instance {
  id: string;
  standIn: string;
  object: Group;
  placement: Placement;
  /** Shuttle state for a moving structure. */
  moving?: { from: [number, number, number]; to: [number, number, number]; speed: number; dwell: number; t: number; dir: 1 | -1; wait: number; dx: number; dy: number; dz: number; boost: number; fling: boolean; vy: number };
  /** A conveyor: whatever stands on it is carried along this, in world space. */
  flow?: { dx: number; dz: number; speed: number };
  /** A staged bridge: each third (etc.) of the deck as its own group of
   * colliders, cracking and then dropping in turn once Hopper has crossed. */
  stages?: { colliders: Collider[]; left: number; state: 'standing' | 'cracking' | 'fallen'; crackAt: number }[];
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

/** Collision shapes for a placed stand-in whose delivered model has baked
 * collision: the same shape `collidersOf` returns (owner id, structure-frame
 * box, world-space y0/y1), but from `collision.json` instead of the
 * stand-in's own primitive meshes -- so where a delivered GLB's drawn
 * surfaces differ from the stand-in's boxes, this is the one that matches
 * what is actually on screen. */
function bakedCollidersOf(boxes: BakedBox[], object: Group, id: string): Collider[] {
  return boxes.map((b) => ({
    owner: id,
    cx: object.position.x,
    cz: object.position.z,
    yaw: object.rotation.y,
    ox: b.ox,
    oz: b.oz,
    hx: b.hx,
    hz: b.hz,
    y0: object.position.y + b.y0,
    y1: object.position.y + b.y1,
    baked: true,
    wall: b.wall,
  }));
}

export class World {
  readonly district: District;
  readonly heightAt: (x: number, z: number) => number;
  readonly instances: Instance[] = [];
  readonly colliders: Collider[] = [];
  /** One candidate top per stand-in `landing()` (a designed, clean flat
   * platform, independent of how finely a delivered model's baked collision
   * happens to be diced) -- `perchNear` scans these too, so a fragmented
   * voxel top still offers a host somewhere obvious to perch. */
  private readonly perchCandidates: Collider[] = [];
  /** Gravity seams with their flip volumes, so the pass below can hang each
   * under the lintel that is really there. */
  private readonly seams: { object: Group; flip: Flip }[] = [];
  readonly volumes: Volume[] = [];
  readonly triggers: Trigger[] = [];
  readonly fields: Field[] = [];
  /** The trail from the start to the exit; the camera faces along it. */
  readonly route: Route;
  /** Generated scenery: span continuations and the middle-distance structures. */
  readonly scenery: Placement[] = [];
  private grid = new Map<string, Collider[]>();
  /** Temporary standing surfaces: cooled slag, a caster's stepping stones. */
  stones: Stone[] = [];
  /** Temporary volumes of inverted gravity: a cantor's flip, the Regent's. */
  flips: Flip[] = [];
  /** A soft floor (sea, slag, dust): below `level` Hopper is lifted, never killed. */
  readonly soft: { kind: 'sea' | 'slag' | 'dust'; level: number; lift: number; shore?: boolean } | null;
  /** Hopper's last position, so a staged bridge knows which stage he is over. */
  private hopperAt: { x: number; y: number; z: number } | null = null;
  readonly region;
  constructor(district: District) {
    this.district = district;
    this.region = regionById(district.region);
    this.route = buildRoute(district);
    this.soft = district.terrain.soft ? { ...district.terrain.soft } : null;
    this.heightAt = makeHeightField({ size: district.size, ...district.terrain });
    for (const p of district.placements) this.place(p);
    // A signal authored inside a structure or under the ground is lifted
    // onto the nearest top above it, so every signal can be reached. One
    // authored to rest on a delivered structure's own (parametric) assumed
    // perch -- often dead centre of the structure's footprint, e.g. a
    // rooftop or a chimney's cap -- can now be over open air if the real
    // (baked) model is hollow or shaped differently there (a chimney's real
    // flue, unlike the stand-in's solid-capped guess, has no floor at its
    // own centre): snap it sideways as well as vertically, onto whatever
    // real collider top nearest its own authored height actually passes
    // closest by, then still run the usual lift-clear-of-solid pass.
    // A gravity seam is authored a couple of metres under its arch's lintel,
    // and its flip volume reaches up to that underside. A delivered arch is
    // its own height (the stand-in's height parameter only sized the
    // picture that it replaced), so hang the seam and its volume under the
    // underside that is really there -- otherwise a lintel top can end up
    // inside the flip, and whoever stands on it is turned upside down.
    for (const { object, flip } of this.seams) {
      const authored = object.position.y;
      const under = this.ceilingAt(object.position.x, object.position.z, this.heightAt(object.position.x, object.position.z) + 12, 1).y;
      if (!Number.isFinite(under) || Math.abs(under - 2 - authored) < 1 || Math.abs(under - authored) > 40) continue;
      object.position.y = under - 2;
      flip.y1 = under - 0.5;
    }
    for (const t of this.triggers) {
      if (!t.object || (t.kind !== 'signal' && t.kind !== 'checkpoint' && t.kind !== 'capsule')) continue;
      const x = t.object.position.x,
        z = t.object.position.z,
        y = t.object.position.y;
      // A totem or capsule authored on the ground where a delivered
      // structure's body now stands (the eclipse dais is 4.5 m tall where
      // its stand-in's edge was) is lifted onto the top the same way.
      // Only a signal authored to rest on a designed landing that is not
      // really there any more is moved sideways; one authored in open air
      // (over a vent, on a glide line) stays exactly where it was put and
      // gets the plain lift-out-of-solid below.
      const designed = t.kind !== 'signal' ? undefined : this.perchCandidates.find((c) => {
        if (Math.abs(c.y1 - y) > 3) return false;
        const [lx, lz] = World.local(c, x, z);
        return Math.abs(lx) <= c.hx && Math.abs(lz) <= c.hz;
      });
      const lost = designed !== undefined && Math.abs(this.groundAt(x, z, designed.y1 + 0.5, 0).y - designed.y1) > 1;
      if (!lost) {
        const lifted = this.liftOut(x, z, y);
        if (lifted === y) continue;
        t.y += lifted - y;
        t.object.position.y = lifted;
        continue;
      }
      const onto = this.nearestTop(x, z, y, 20, 30);
      let start = onto && Math.hypot(onto.x - x, onto.z - z) + Math.abs(onto.y - y) > 1 ? onto : { x, y, z };
      // Whatever surface was chosen, it must not be against a nearby wall
      // shell's own footprint -- a narrow structure's ring-scan bands wrap
      // close around it, so even a real, validated top nearby can still
      // spawn Hopper's body inside one of them (a shove on arrival, not a
      // place he can stand). Clear of those first...
      const clear = this.clearOfFootprint(start.x, start.z, 2.5); // Hopper's own body radius
      if (clear.x !== start.x || clear.z !== start.z) {
        // ...then re-settle at the real surface there -- the top this
        // point was chosen for may no longer be under it once moved.
        const resettled = this.groundAt(clear.x, clear.z, start.y + 40, 3);
        start = { x: clear.x, y: Number.isFinite(resettled.y) ? resettled.y : this.heightAt(clear.x, clear.z) + 0.3, z: clear.z };
      }
      // liftOut only makes sense for the "nothing at all nearby" fallback
      // below: nearestTop already returned a real, validated top, and
      // liftOut does not know to ignore the wall shell around it -- a
      // ring-scan band stacked above the chosen point would read as "still
      // inside solid" and shove the signal on up the wall.
      let lifted = start.y;
      if (!onto) {
        // No designed top nearby at all, big enough to actually stand on --
        // a hollow chimney's real flue has no floor anywhere along its
        // height, only fragments too small to trust (its thin wall shell,
        // or a footprint-scan sliver that never merged into anything
        // bigger), so this rests on the terrain itself: guaranteed stable,
        // rather than a coin-sized ledge partway up that might not even
        // catch a falling Hopper before the wall around it pushes him off.
        const ground = this.heightAt(start.x, start.z) + 0.3;
        if (Math.abs(ground - y) > 1 || start.x !== x || start.z !== z) start = { x: start.x, y: ground, z: start.z };
        lifted = this.liftOut(start.x, start.z, start.y);
      }
      if (Math.abs(lifted - y) < 0.05 && start.x === x && start.z === z) continue;
      t.x = start.x;
      t.z = start.z;
      t.y += lifted - y;
      t.object.position.x = start.x;
      t.object.position.z = start.z;
      t.object.position.y = lifted;
    }
    // Wherever each ended up, Hopper has to fit: a delivered structure can
    // hang a shelf or a beam over a spot its stand-in left open (the eclipse
    // dais's shelves sit right over a totem authored at its rim), and a
    // pickup under an overhang lower than his own height would only shove
    // him away on arrival. Slide such a one sideways to the nearest open
    // spot on the same surface.
    for (const t of this.triggers) {
      if (!t.object || (t.kind !== 'signal' && t.kind !== 'checkpoint' && t.kind !== 'capsule')) continue;
      const open = this.withHeadroom(t.object.position.x, t.object.position.z, t.object.position.y);
      if (!open) continue;
      t.x = open.x;
      t.z = open.z;
      t.y += open.y - t.object.position.y;
      t.object.position.set(open.x, open.y, open.z);
    }
    // The world either side of the trail: spans that land somewhere, and
    // structures standing well back from the path.
    this.scenery = sceneryFor(district, this.route, this.heightAt);
    for (const p of this.scenery) this.place(p);
    for (const c of district.cages || []) this.placeCage(c);
    for (const st of district.strongholds || []) this.placeStronghold(st, st.id);
    if (district.boss) {
      const b = district.boss;
      const names = { nightRook: 'The Night Rook', smelterLeviathan: 'The Smelter Leviathan', eclipseRegent: 'The Eclipse Regent' };
      this.fields.push({ id: 'boss', x: b.x, y: this.heightAt(b.x, b.z) + b.y, z: b.z, r: b.r, active: false, cleared: false, group: 'boss', name: names[b.kind] });
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
  /** A stronghold's field. */
  private placeStronghold(st: { id: string; name: string; x: number; z: number; r: number; y?: number }, group: string) {
    const y = this.heightAt(st.x, st.z) + (st.y ?? 0);
    this.fields.push({ id: st.id, x: st.x, y, z: st.z, r: st.r, active: false, cleared: false, group, name: st.name });
  }
  /** A perch for a stronghold's host member: a structure top within
   * `radius` of a point that stands at least `minRise` above the terrain, so
   * the shadow is in plain view on something tall before the fight. Tall
   * tops are preferred over near ones; the point is pulled onto the top
   * (inset from its edge); a wanted height prefers tops near it. Spring pads
   * and moving structures are skipped. */
  perchNear(x: number, z: number, wantY?: number, radius = 110, minRise = 10): { x: number; y: number; z: number } | null {
    let best: { x: number; y: number; z: number } | null = null,
      bestScore = Infinity;
    for (const c of [...this.colliders, ...this.perchCandidates]) {
      // A wall shell (a curved facade's ring scan) is fair game here, unlike
      // for nearestTop's signal placement: a stronghold host only needs a
      // point to wait at, not to survive a falling Hopper's resolveWalls
      // contact, and several red/violet structures (coral spires, arches)
      // have nothing else this size nearby.
      if (c.spring || c.instance?.moving || c.hx < 2.5 || c.hz < 2.5) continue;
      if (Math.hypot(c.cx - x, c.cz - z) > radius + Math.hypot(c.hx, c.hz)) continue;
      const [lx, lz] = World.local(c, x, z);
      const ux = Math.max(-(c.hx - 2), Math.min(c.hx - 2, lx)) + c.ox,
        uz = Math.max(-(c.hz - 2), Math.min(c.hz - 2, lz)) + c.oz,
        cos = Math.cos(c.yaw),
        sin = Math.sin(c.yaw),
        px = c.cx + ux * cos - uz * sin,
        pz = c.cz + ux * sin + uz * cos;
      const dist = Math.hypot(px - x, pz - z);
      if (dist > radius) continue;
      // What is actually there, per real collision -- not just this box's
      // own claimed top: a landing candidate is the stand-in's own idea of
      // where its top sits, which need not exactly match a delivered
      // model's baked collision at that point. Whoever places something at
      // the returned point must find it standing on real ground, so that
      // (not c.y1) is the height used from here on; a claim too far from
      // what is really there is not a usable perch at all.
      const groundY = this.groundAt(px, pz, 1e6, 0).y;
      if (Math.abs(groundY - c.y1) > 3) continue;
      const rise = groundY - this.heightAt(px, pz);
      if (rise < minRise) continue;
      const score = dist * 0.5 + (wantY !== undefined ? Math.abs(groundY - wantY) * 0.5 : 0) - Math.min(90, rise) * 0.6;
      if (score < bestScore) {
        bestScore = score;
        best = { x: px, y: groundY, z: pz };
      }
    }
    return best;
  }
  /** The real collider top nearest (x, y, z), among those within `radius`
   * horizontally and `yMargin` of y vertically -- the same "closest point on
   * a box" clamp `perchNear` uses, but without its size/rise floor, since
   * this is about snapping one authored point onto whatever is really
   * there, not finding a platform to stand and fight on. */
  /** Push (x, z) clear of any nearby collider's own footprint (at any
   * height), radially away from that collider's centre -- used to keep a
   * repositioned signal from spawning against the base of the very
   * structure it could not find a top on (a hollow chimney's wall, at
   * ground level, is still a wall Hopper's own body cannot stand inside). */
  private clearOfFootprint(x: number, z: number, margin: number): { x: number; z: number } {
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const c of this.near(x, z, margin + 5)) {
        // Only a wall shell: a real top's own footprint is exactly where a
        // point resting on it is supposed to be.
        if (c.instance?.moving || !c.wall) continue;
        const [lx, lz] = World.local(c, x, z);
        if (Math.abs(lx) > c.hx + margin || Math.abs(lz) > c.hz + margin) continue;
        // Push straight out from the BOX's own centre (its ox/oz offset
        // turned into world space, not the instance's cx/cz) -- an
        // off-centre box (any ring-scan point that is not dead over its
        // structure's own placement origin) would otherwise push relative
        // to the wrong point and could leap toward the structure's centre
        // instead of just clearing this one box. Dead centre on the box
        // itself (rare: only a box authored with ox=oz=0) has no
        // well-defined outward direction, so default to +x.
        const cos = Math.cos(c.yaw),
          sin = Math.sin(c.yaw),
          wx = c.cx + c.ox * cos - c.oz * sin,
          wz = c.cz + c.ox * sin + c.oz * cos,
          dx = x - wx,
          dz = z - wz,
          dist = Math.hypot(dx, dz),
          dirX = dist > 0.01 ? dx / dist : 1,
          dirZ = dist > 0.01 ? dz / dist : 0,
          reach = Math.hypot(c.hx, c.hz) + margin + 0.5;
        x = wx + dirX * reach;
        z = wz + dirZ * reach;
        moved = true;
      }
      if (!moved) break;
    }
    return { x, z };
  }
  /** The nearest point to (x, z) on the same surface with Hopper's height of
   * clear air above it, searched on rings out to 15 m; nothing when the
   * spot already has that headroom or no ring offers it. */
  private withHeadroom(x: number, z: number, y: number): { x: number; y: number; z: number } | null {
    const need = 15,
      fits = (px: number, pz: number, py: number) => this.ceilingAt(px, pz, py + 0.5, 2.5).y - py >= need;
    if (fits(x, z, y)) return null;
    for (const r of [5, 10, 15])
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2,
          px = x + Math.cos(a) * r,
          pz = z + Math.sin(a) * r,
          py = this.groundAt(px, pz, y + 3, 0).y;
        if (Math.abs(py - y) <= 3 && fits(px, pz, py)) return { x: px, y: py + (y - this.groundAt(x, z, y + 3, 0).y), z: pz };
      }
    return null;
  }
  private nearestTop(x: number, z: number, y: number, radius: number, yMargin: number, allowWall = false): { x: number; y: number; z: number } | null {
    let best: { x: number; y: number; z: number } | null = null,
      bestScore = Infinity;
    for (const c of this.colliders) {
      // Big enough to actually stand on (a signal's own footprint, not a
      // sliver at the tip of some baked decoration or a footprint-scan box
      // that only just cleared the merge threshold) -- unless nothing
      // better exists nearby at all, in which case a wall shell (a hollow
      // chimney's flue has no real top anywhere) is still closer to the
      // authored spot than dropping all the way to the ground below.
      if (c.instance?.moving || (c.wall && !allowWall)) continue;
      if (!allowWall && (c.hx < 3 || c.hz < 3)) continue;
      if (Math.abs(c.y1 - y) > yMargin) continue;
      if (Math.hypot(c.cx - x, c.cz - z) > radius + Math.hypot(c.hx, c.hz)) continue;
      const [lx, lz] = World.local(c, x, z);
      const ux = Math.max(-c.hx, Math.min(c.hx, lx)) + c.ox,
        uz = Math.max(-c.hz, Math.min(c.hz, lz)) + c.oz,
        cos = Math.cos(c.yaw),
        sin = Math.sin(c.yaw),
        px = c.cx + ux * cos - uz * sin,
        pz = c.cz + ux * sin + uz * cos;
      const dist = Math.hypot(px - x, pz - z);
      if (dist > radius) continue;
      // Prefer a genuinely wide top over a thin ring-scan wall fragment
      // (baked at a coarser cell for a near-vertical face, so still often
      // just the wallStep/2 minimum) -- a real platform close by beats a
      // technically-closer sliver of somebody's cylindrical hull.
      const score = dist + Math.abs(c.y1 - y) * 3 - Math.min(c.hx, c.hz) * 2;
      if (score < bestScore) {
        bestScore = score;
        best = { x: px, y: c.y1, z: pz };
      }
    }
    return best;
  }
  /** Cool a slab of slag into a stone Hopper and the shadows can stand on. */
  dropStone(x: number, y: number, z: number, life: number): Stone {
    const collider: Collider = { owner: 'stone', cx: x, cz: z, yaw: 0, ox: 0, oz: 0, hx: 4, hz: 4, y0: y - 0.5, y1: y + 1.5 };
    const stone: Stone = { id: this.stones.length + 1, x, y, z, life, collider };
    this.stones.push(stone);
    this.addCollider(collider, null);
    return stone;
  }
  /** Flip gravity in a cylinder for a while (a cantor's song, the Regent's). */
  flip(x: number, z: number, r: number, y0: number, y1: number, life: number): Flip {
    const f: Flip = { x, z, r, y0, y1, life };
    this.flips.push(f);
    return f;
  }
  /** Is gravity inverted at this point? */
  flipAt(x: number, y: number, z: number): boolean {
    for (const f of this.flips) if (y >= f.y0 && y <= f.y1 && Math.hypot(x - f.x, z - f.z) <= f.r) return true;
    return false;
  }
  private dropCollider(c: Collider) {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
    for (const list of this.grid.values()) {
      const i = list.indexOf(c);
      if (i >= 0) list.splice(i, 1);
    }
  }
  /** Advance moving structures; returns nothing, callers read instance.moving.dx/dy/dz. */
  update(dt: number) {
    for (const st of this.stones) {
      st.life -= dt;
      if (st.life <= 0) this.dropCollider(st.collider);
    }
    this.stones = this.stones.filter((st) => st.life > 0);
    for (const f of this.flips) f.life -= dt;
    this.flips = this.flips.filter((f) => f.life > 0);
    for (const inst of this.instances) {
      const m = inst.moving;
      if (!m) continue;
      if (m.boost > 0) m.boost -= dt;
      m.dx = m.dy = m.dz = 0;
      if (m.wait > 0) {
        m.wait -= dt;
        m.vy = 0;
        continue;
      }
      const len = Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1], m.to[2] - m.from[2]) || 1;
      // A manta's tether hauls the platform at three times its pace.
      m.t += (m.dir * m.speed * (m.boost > 0 ? 3 : 1) * dt) / len;
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
      // A press ram's rise speed this step, so the engine can tell a hard
      // upward shove from a gentle one and launch whatever stands on it.
      m.vy = m.dy / dt;
      inst.object.position.set(nx, ny, nz);
      for (const c of this.colliders) {
        if (c.instance !== inst) continue;
        c.cx = nx;
        c.cz = nz;
        c.y0 = ny + (c.ly0 ?? 0);
        c.y1 = ny + (c.ly1 ?? 0);
      }
    }
    // Staged bridge: the stage Hopper stands on, and everything behind him,
    // cracks and then falls away a signalled moment later.
    if (this.hopperAt) {
      const at = this.hopperAt;
      for (const inst of this.instances) {
        if (!inst.stages) continue;
        let over = -1;
        for (let i = 0; i < inst.stages.length && over < 0; i++) {
          for (const c of inst.stages[i].colliders) {
            const [lx, lz] = World.local(c, at.x, at.z);
            if (Math.abs(lx) <= c.hx + 3 && Math.abs(lz) <= c.hz + 3 && at.y >= c.y1 - 1 && at.y <= c.y1 + 3) {
              over = i;
              break;
            }
          }
        }
        for (let i = 0; i < over; i++) {
          const st = inst.stages[i];
          if (st.state === 'standing') {
            st.state = 'cracking';
            st.crackAt = inst.placement.staged!.after;
            st.left = st.crackAt;
          }
        }
      }
    }
    for (const inst of this.instances) {
      if (!inst.stages) continue;
      for (const st of inst.stages) {
        if (st.state !== 'cracking') continue;
        st.crackAt -= dt;
        if (st.crackAt <= 0) {
          st.state = 'fallen';
          for (const c of st.colliders) this.dropCollider(c);
        }
      }
    }
  }
  /** Hopper's position, read each step before update() so a staged bridge
   * knows which stage he is over. */
  trackHopper(x: number, y: number, z: number) {
    this.hopperAt = { x, y, z };
  }
  /** Restore every stage of every staged instance (a respawn). */
  resetStages() {
    for (const inst of this.instances) {
      if (!inst.stages) continue;
      for (const st of inst.stages) {
        if (st.state === 'fallen') for (const c of st.colliders) this.addCollider(c, null);
        st.state = 'standing';
        st.left = 0;
        st.crackAt = 0;
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
      instance.moving = { from, to: [p.moving.to.x, toY, p.moving.to.z], speed: p.moving.speed, dwell: p.moving.dwell ?? 1.5, t: 0, dir: 1, wait: 0, dx: 0, dy: 0, dz: 0, boost: 0, fling: !!p.moving.fling, vy: 0 };
    }
    if (p.flow) {
      // Rotate the conveyor's local flow direction into world space, the
      // same local-to-world turn perchNear uses to place a point on a top.
      const cos = Math.cos(p.yaw || 0),
        sin = Math.sin(p.yaw || 0);
      instance.flow = { dx: p.flow.dx * cos - p.flow.dz * sin, dz: p.flow.dx * sin + p.flow.dz * cos, speed: p.flow.speed };
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
    } else if (meta.gate === 'gravity') {
      // A gravity seam: a standing flip volume from a hop's height up to the
      // underside of the lintel it hangs under, as wide as the seam is long;
      // the lintel's top is ordinary ground.
      const length = meta.size?.[0] ?? 80;
      this.seams.push({ object, flip: this.flip(object.position.x, object.position.z, length / 2, object.position.y - 56, object.position.y + 1.5, Infinity) });
    } else if (p.id === 'prop.checkpointTotem') {
      this.triggers.push({ id, kind: 'checkpoint', x: object.position.x, y: object.position.y, z: object.position.z, r: 14, object });
    } else if (p.id === 'prop.signalBeacon') {
      this.triggers.push({ id, kind: 'signal', x: object.position.x, y: object.position.y + 1.8, z: object.position.z, r: 7, object });
    } else if (p.id === 'prop.recoveryCapsule') {
      this.triggers.push({ id, kind: 'capsule', x: object.position.x, y: object.position.y + 2, z: object.position.z, r: 6, object });
    }
    // Signals, capsules and volumes have no solid parts to land on.
    if (!['prop.signalBeacon', 'prop.recoveryCapsule', 'prop.checkpointTotem', 'prop.thermalVent', 'prop.windLane', 'structure.blue.dustCurrent', 'structure.violet.gravitySeam', 'prop.lockdownDome'].includes(p.id)) {
      const file = deliveredFile(p.id);
      const baked = file ? collisionByFile[file] : undefined;
      const built = baked?.length ? bakedCollidersOf(baked, object, id) : collidersOf(object, id);
      for (const c of built) {
        c.instance = instance;
        c.ly0 = c.y0 - object.position.y;
        c.ly1 = c.y1 - object.position.y;
        this.addCollider(c, instance.moving ? instance.moving.to : null);
      }
      // A staged bridge: group its colliders into thirds (etc.) along the
      // structure's longer horizontal axis, so each third can crack and fall
      // on its own once Hopper has crossed it.
      if (p.staged) {
        const n = p.staged.stages,
          alongX = (meta.size?.[0] ?? 1) >= (meta.size?.[2] ?? 1),
          span = Math.max(1, alongX ? (meta.size?.[0] ?? 1) : (meta.size?.[2] ?? 1));
        const groups: Collider[][] = Array.from({ length: n }, () => []);
        for (const c of built) {
          const pos = alongX ? c.ox : c.oz;
          const i = Math.min(n - 1, Math.max(0, Math.floor((pos / span + 0.5) * n)));
          groups[i].push(c);
        }
        instance.stages = groups.map((colliders) => ({ colliders, left: 0, state: 'standing' as const, crackAt: 0 }));
      }
    }
    const landings = object.userData.landings as { y: number; halfX: number; halfZ: number; x: number; z: number }[] | undefined;
    if (landings) {
      for (const l of landings) {
        this.perchCandidates.push({
          owner: id,
          cx: object.position.x,
          cz: object.position.z,
          yaw: object.rotation.y,
          ox: l.x,
          oz: l.z,
          hx: l.halfX,
          hz: l.halfZ,
          y0: object.position.y + l.y - 1,
          y1: object.position.y + l.y,
          instance,
        });
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
  /** The lowest height at or above `y` that is neither deep inside a solid
   * (more than a few metres under its top, beyond a signal's reach from
   * whatever stands on it) nor under the ground at a point. */
  liftOut(x: number, z: number, y: number): number {
    let out = Math.max(y, this.heightAt(x, z) + 0.3);
    for (let pass = 0; pass < 8; pass++) {
      let inside: Collider | null = null;
      for (const c of this.near(x, z, 3)) {
        if (out < c.y0 - 0.01 || c.y1 - out < 4) continue;
        const [lx, lz] = World.local(c, x, z);
        if (Math.abs(lx) <= c.hx && Math.abs(lz) <= c.hz && (!inside || c.y1 > inside.y1)) inside = c;
      }
      if (!inside) break;
      out = inside.y1 + 0.3;
    }
    return out;
  }
  /** Lowest solid underside at or above `y` (the head) over a point, else
   * nothing: inverted gravity lands on these. */
  ceilingAt(x: number, z: number, y: number, radius = 2.5): { y: number; collider: Collider | null } {
    let best = Infinity,
      hit: Collider | null = null;
    for (const c of this.near(x, z, radius + 2)) {
      if (c.y0 < y - 0.01 || c.y0 > best) continue;
      const [lx, lz] = World.local(c, x, z);
      if (Math.abs(lx) <= c.hx + radius && Math.abs(lz) <= c.hz + radius) {
        best = c.y0;
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

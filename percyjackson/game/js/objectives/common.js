// Shared helpers for chapter objectives (see mission.js).
//
// Online, the host owns the chapter: it decides who carries the banner, how
// many days have passed, and when an objective is done, and sends that state
// to guests in its `world` snapshot (Mission.netState → `m.x`). A guest who
// interacts with something sends an `act` topic of kind `obj`; the host's
// Mission.onNetAct applies it. Each hero is named by `<browser uid>:<index>`,
// the same on every browser.
import * as THREE from 'three/webgpu';
import { mulberry32 } from '../util.js';

export const heroKey = (g, p) => (p.remote ? `${p.remote.uid}:${p.remote.idx}` : `${g.online?.uid ?? 'local'}:${p.index}`);
export const heroByKey = (g, key) => (key ? g.players.find((p) => heroKey(g, p) === key) ?? null : null);
export const isGuest = (m) => !!(m.def.remote || m.remote);
export function sendAct(g, d) { g.online?.room?.publishTopic('act', { v: 1, k: 'obj', u: g.online.uid, ...d }); }

// The same random numbers on every browser for a chapter (props are placed
// by both host and guests from the level seed).
export const seeded = (m, salt) => mulberry32(((m.def.seed ?? 1) ^ (salt * 0x9e3779b1)) >>> 0);

export const inRoom = (pos, room, pad = 0) => pos.x >= room.x0 - pad && pos.x <= room.x1 + 1 + pad && pos.z >= room.z0 - pad && pos.z <= room.z1 + 1 + pad;

// A standing spot on the ground near `want` (falls back to `want`). The
// search starts just above the feet, so a tree canopy, a roof or a prop over
// the spot never takes it.
export function ground(g, want, up = 1) {
  const p = want.clone();
  const gy = g.world.groundBelow(p.x, p.z, p.y + up);
  if (isFinite(gy)) p.y = gy;
  return p;
}

// Open floor at (x, z) near height `y`: no more than `rise` above it (a step
// or raised ground, never a canopy), not in a pit, with room to stand. -> y or null
export function openGround(world, x, y, z, rise = 1.5) {
  const gy = world.groundBelow(x, z, y + 1);
  if (!isFinite(gy) || gy > y + rise || gy < y - 2) return null;
  if (world.solidAt(x, gy + 0.5, z) || world.solidAt(x, gy + 1.5, z)) return null;
  return gy;
}

// A spot in a room from its spawn list (open floor), chosen by `r`; with
// `avoid`, the one farthest from it. Spots on a canopy or a prop, or more
// than a step above the room's floor, are passed over.
export function roomSpot(g, room, r, avoid = null) {
  const list = room.spawns?.length ? room.spawns : [[room.center.x, room.y, room.center.z]];
  const first = Math.floor(r() * list.length);
  const order = avoid ? list.slice().sort((a, b) => Math.hypot(b[0] - avoid.x, b[2] - avoid.z) - Math.hypot(a[0] - avoid.x, a[2] - avoid.z))
    : list.slice(first).concat(list.slice(0, first));
  const w = g.world;
  for (const top of [room.y + 1.5, Infinity]) {
    for (const sp of order) {
      const gy = openGround(w, sp[0], sp[1], sp[2]);
      if (gy != null && gy <= top) return new THREE.Vector3(sp[0], gy, sp[2]);
    }
  }
  return ground(g, new THREE.Vector3(order[0][0], order[0][1], order[0][2]));
}

// `pos` settled on open ground, or `fallback` where that's blocked.
export function settle(g, pos, fallback) {
  const gy = openGround(g.world, pos.x, pos.y, pos.z);
  return gy != null ? pos.clone().setY(gy) : fallback.clone();
}

// Where a door of `room` that leads to `other` is, in world space.
export function doorBetween(room, other) {
  const d = room.doors?.find((q) => q.link.a === other || q.link.b === other);
  if (!d) return null;
  const y = room.y;
  if (d.side === 'e') return new THREE.Vector3(room.x1 + 1.5, y, d.at + 0.5);
  if (d.side === 'w') return new THREE.Vector3(room.x0 - 0.5, y, d.at + 0.5);
  if (d.side === 's') return new THREE.Vector3(d.at + 0.5, y, room.z1 + 1.5);
  return new THREE.Vector3(d.at + 0.5, y, room.z0 - 0.5);
}

// The main path's rooms from the start to the boss arena.
export function mainPath(L) {
  const out = [];
  for (let r = L.bossRoom; r; r = r.parent) out.unshift(r);
  return out;
}

// Monsters arriving in a ring around a point (host only).
export function ambush(m, at, kinds, { radius = 7, color = 0xff3a2a } = {}) {
  const g = m.game;
  if (isGuest(m)) return [];
  const cap = g.gr.preset.enemyCap, out = [];
  kinds.forEach((kind, i) => {
    if (g.enemies.filter((e) => !e.dead && !e.isDummy).length >= cap) return;
    const a = (i / kinds.length) * Math.PI * 2 + Math.random();
    const p = at.clone().add(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    const gy = g.world.groundBelow(p.x, p.z, at.y + 4); if (!isFinite(gy) || Math.abs(gy - at.y) > 5) return;
    p.y = gy;
    const e = g.spawnEnemy(kind, p, { level: m.def.difficulty });
    if (e) { out.push(e); g.fx.summonCircle(p, color); }
  });
  if (out.length) g.audio?.energy('summon');
  return out;
}

export const mat = (color, o = {}) => new THREE.MeshStandardNodeMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, emissive: o.e ? color : 0, emissiveIntensity: o.e ?? 0, transparent: !!o.op, opacity: o.op ?? 1 });
export function box(parent, w, h, d, x, y, z, material) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  b.position.set(x, y, z); b.castShadow = true; parent.add(b); return b;
}

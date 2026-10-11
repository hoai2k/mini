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

// A standing spot on the ground near `want` (falls back to `want`).
export function ground(g, want, up = 3) {
  const p = want.clone();
  const gy = g.world.groundBelow(p.x, p.z, p.y + up);
  if (isFinite(gy)) p.y = gy;
  return p;
}

// A spot in a room from its spawn list (open floor), chosen by `r`.
export function roomSpot(g, room, r, avoid = null) {
  const list = room.spawns?.length ? room.spawns : [[room.center.x, room.y, room.center.z]];
  let best = list[Math.floor(r() * list.length)];
  if (avoid) best = list.slice().sort((a, b) => Math.hypot(b[0] - avoid.x, b[2] - avoid.z) - Math.hypot(a[0] - avoid.x, a[2] - avoid.z))[0];
  return ground(g, new THREE.Vector3(best[0], best[1], best[2]));
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

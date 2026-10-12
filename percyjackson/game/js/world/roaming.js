// Roaming monsters: small packs of low-level monsters that turn up as you walk
// around, out of sight and never right on top of the heroes (the Minecraft
// Dungeons feel). Two places use it:
//   city  the prologue's Manhattan: sewer rats out of alleys, the subway
//         stairs and storm drains (rat holes from world/manhattan.js)
//   camp  Camp Half-Blood after the opening: the woods and the Road West
//         (world/roamZones.js); never inside the protected core, and a
//         monster that wanders into it turns back.
// Capped, despawned when every hero is far away, paused during minigames,
// cutscenes and menus. Online only the host spawns (guests see them through
// the world snapshot like any monster). Monsters drop their usual small
// drachmas and XP (main.js onEnemyKilled).
import * as THREE from 'three/webgpu';
import { standY } from '../ui/tracker.js';
import { CAMP_CORE, CAMP_ROAM, ROAM_RULES, inAny, inRect, rectCenter, pickKind, packFor, spawnAllowed } from './roamZones.js';

const tmp = new THREE.Vector3();

export class Roaming {
  constructor(game) { this.game = game; this.kind = null; this.t = 0; this.list = []; }
  clear() { this.kind = null; this.list = []; this.holes = null; }
  configureCity(holes) { this.kind = 'city'; this.holes = holes; this.list = []; this.t = 3.5; this.first = true; }
  configureCamp() { this.kind = 'camp'; this.list = []; this.t = 6; }
  get cap() { return this.kind === 'city' ? ROAM_RULES.capCity : ROAM_RULES.capCamp; }
  live() { this.list = this.list.filter((e) => !e.dead && this.game.enemies.includes(e)); return this.list; }
  heroes() { return this.game.players.filter((p) => !p.dead && !p.downed && (!p.ai || !this.game.players.some((q) => !q.ai))); }
  active() {
    const g = this.game;
    if (!this.kind || g.state !== 'playing' || g.cutscene || g.minigame || g.online?.isGuest) return false;
    if (this.kind === 'city' ? g.mode !== 'prologue' : g.mode !== 'hub') return false;
    if (g.paused && !g.online?.live) return false;
    return true;
  }
  update(dt) {
    if (!this.active()) return;
    const g = this.game;
    this.keepOut(dt);
    this.t -= dt;
    if (this.t > 0) return;
    const [a, b] = this.kind === 'city' ? ROAM_RULES.everyCity : ROAM_RULES.everyCamp;
    this.t = a + Math.random() * (b - a);
    if (this.live().length >= this.cap) return;
    if (this.kind === 'city') this.spawnCity(); else this.spawnCamp();
    void g;
  }
  // ---- the prologue: rats from the nearest hole ahead that nobody stands next to
  spawnCity(force = false) {
    const g = this.game, hs = this.heroes(); if (!hs.length || !this.holes?.length) return 0;
    const goal = g.level?.goal;
    const lead = hs.find((p) => !p.ai && !p.remote) ?? hs[0];
    const near = (v) => Math.min(...hs.map((p) => Math.hypot(p.pos.x - v.x, p.pos.z - v.z)));
    const cands = this.holes.filter((h) => { const d = near(h.at); return d >= (force ? 9 : 12) && d <= 34; });
    if (!cands.length) return 0;
    // prefer holes between the leader and the bus
    const score = (h) => Math.hypot(h.at.x - lead.pos.x, h.at.z - lead.pos.z) + (goal ? Math.hypot(h.at.x - goal.x, h.at.z - goal.z) * 0.6 : 0) + Math.random() * 6;
    cands.sort((x, y) => score(x) - score(y));
    const hole = cands[0];
    const n = (this.first ? 3 : 2) + Math.floor(Math.random() * 2);
    this.first = false;
    let made = 0;
    for (let i = 0; i < n; i++) {
      const p = hole.at.clone().add(tmp.set((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6));
      p.y = hole.at.y;
      const e = g.spawnEnemy('rat', p, { level: 1 });
      if (!e) continue;
      e.roamer = true; e.aggro = true; e.spawnT = 0.45;
      e.home = hole.out.clone();
      this.list.push(e); made++;
    }
    if (made && !this.toldRats) {
      this.toldRats = true;
      const pad = g.input?.lastDevice?.startsWith?.('pad');
      setTimeout(() => g.state === 'playing' && g.mode === 'prologue' && g.toast(`Rats! Big ones, with red eyes. ${pad ? 'X' : 'Left click'} to swing.`), 600);
    }
    return made;
  }
  // ---- camp: a spot in a roam area 15–30 m from a hero who is out exploring
  spawnCamp() {
    const g = this.game, hs = this.heroes(); if (!hs.length) return 0;
    const pts = hs.map((p) => [p.pos.x, p.pos.z]);
    // only when someone is outside the core (or close to its edge)
    const out = hs.filter((p) => !inAny(CAMP_CORE, p.pos.x, p.pos.z) || CAMP_ROAM.some((a) => inRect(grow(a.area, 10), p.pos.x, p.pos.z)));
    if (!out.length) return 0;
    const chapters = Object.keys(g.save?.data.completed ?? {}).length;
    for (let tries = 0; tries < 16; tries++) {
      const h = out[Math.floor(Math.random() * out.length)];
      const ang = Math.random() * Math.PI * 2, r = ROAM_RULES.minDist + 1 + Math.random() * (ROAM_RULES.maxDist - ROAM_RULES.minDist - 3);
      const x = Math.floor(h.pos.x + Math.cos(ang) * r) + 0.5, z = Math.floor(h.pos.z + Math.sin(ang) * r) + 0.5;
      if (!spawnAllowed(x, z, pts)) continue;
      const y = standY(g.world, Math.floor(x), Math.floor(z));
      if (y == null || g.world.liquidAt(x, y + 0.2, z) || g.world.liquidAt(x, y - 0.5, z)) continue;
      if (this.onScreen(tmp.set(x, y + 0.5, z))) continue;
      const area = CAMP_ROAM.find((a) => inRect(a.area, x, z));
      const kind = pickKind(area.kinds, Math.random());
      const { count, level } = packFor(chapters, kind, Math.random());
      let made = 0;
      for (let i = 0; i < count; i++) {
        const px = x + (Math.random() - 0.5) * 3, pz = z + (Math.random() - 0.5) * 3;
        const py = standY(g.world, Math.floor(px), Math.floor(pz));
        if (py == null || Math.abs(py - y) > 1.5) continue;
        const e = g.spawnEnemy(kind, new THREE.Vector3(px, py, pz), { level });
        if (!e) continue;
        e.roamer = true; e.spawnT = 0.5;
        this.list.push(e); made++;
      }
      return made;
    }
    return 0;
  }
  onScreen(v) {
    const p = v.clone().project(this.game.rig.camera);
    return p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
  }
  // gone when far from everyone; in camp, nothing crosses into the core
  keepOut(dt) {
    const g = this.game, hs = g.players.filter((p) => !p.dead);
    for (const e of this.live()) {
      const far = Math.min(...hs.map((p) => p.pos.distanceTo(e.pos)));
      e.farT = far > ROAM_RULES.despawn ? (e.farT ?? 0) + dt : 0;
      if (e.farT > 3) { this.remove(e); continue; }
      if (this.kind !== 'camp') continue;
      const core = CAMP_CORE.find((r) => inRect(r, e.pos.x, e.pos.z));
      if (core) {
        const [cx, cz] = rectCenter(core);
        e.status.fear = Math.max(e.status.fear, 0.6); e.fearFrom = new THREE.Vector3(cx, e.pos.y, cz);
        e.aggro = false; e.target = null;
        e.coreT = (e.coreT ?? 0) + dt;
        if (e.coreT > 5) { g.fx?.poof?.(e.pos); this.remove(e); }
      } else e.coreT = 0;
    }
  }
  remove(e) {
    const g = this.game;
    e.dead = true; e.deathT = 99;
    g.scene.remove(e.object);
    const i = g.enemies.indexOf(e); if (i >= 0) g.enemies.splice(i, 1);
    this.list = this.list.filter((x) => x !== e);
  }
}
const grow = (r, m) => ({ x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m });

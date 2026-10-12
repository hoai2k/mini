// Roaming monsters: small packs of low-level monsters that turn up as you walk
// around, out of sight and never right on top of the heroes (the Minecraft
// Dungeons feel). Two places use it:
//   city  the prologue's Manhattan (a training board): sewer rats that hang
//         around the trash from the start (nests from world/manhattan.js,
//         entities/ratRules.js); now and then one dashes at the lead hero,
//         and single rats come out of the drains and alleys further on
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
import { RAT, pickDasher, beatAt } from '../entities/ratRules.js';
import { lineOfSight } from '../entities/enemy.js';

const rand = ([a, b]) => a + Math.random() * (b - a);

const tmp = new THREE.Vector3();

export class Roaming {
  constructor(game) { this.game = game; this.kind = null; this.t = 0; this.list = []; }
  clear() { this.kind = null; this.list = []; this.holes = null; this.nests = null; this.nested = []; }
  // L: the prologue's level (world/manhattan.js): rats (holes), nests, beats
  configureCity(L) {
    this.kind = 'city'; this.holes = L.rats ?? []; this.nests = L.nests ?? []; this.beats = L.beats ?? [];
    this.list = []; this.nested = []; this.placed = false;
    this.t = rand(RAT.holeEvery); this.dashT = 4 + Math.random() * 3;
  }
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
    if (this.kind === 'city') { if (!this.placed) this.placeNests(); this.director(dt); }
    this.t -= dt;
    if (this.t > 0) return;
    this.t = rand(this.kind === 'city' ? RAT.holeEvery : ROAM_RULES.everyCamp);
    if (this.kind === 'city') { this.spawnCity(); return; }
    if (this.live().length >= this.cap) return;
    this.spawnCamp();
    void g;
  }
  // ---- the prologue (entities/ratRules.js)
  lead() { const hs = this.heroes(); return hs.find((p) => !p.ai && !p.remote) ?? hs[0] ?? null; }
  aggroRats() { return this.game.enemies.filter((e) => e.kind === 'rat' && !e.dead && (e.aggro || e.loiter?.alertT != null)).length; }
  // the rats that hang around the trash from the start
  placeNests() {
    const g = this.game;
    this.placed = true;
    for (const n of this.nests ?? []) for (let i = 0; i < n.n; i++) {
      const a = (i / n.n) * Math.PI * 2 + Math.random(), r = n.n > 1 ? 0.5 + Math.random() * 0.5 : 0;
      const p = n.at.clone().add(tmp.set(Math.cos(a) * r, 0.05, Math.sin(a) * r));
      const e = g.spawnEnemy('rat', p, { level: 1 });
      if (!e?.loiter) continue;
      e.spawnT = 0; e.facing = Math.random() * Math.PI * 2;
      Object.assign(e.loiter, { home: n.at.clone(), r: n.r ?? RAT.wander, notice: n.notice ?? RAT.notice, alert: n.alert ?? RAT.alert, perch: !!n.perch, face: n.face?.clone() ?? null, actT: Math.random() * 2 });
      e.nest = n; e.beat = n.beat;
      this.nested.push(e);
    }
  }
  // now and then: a loitering rat a fair way off dashes at the lead hero
  director(dt) {
    this.dashT -= dt;
    if (this.dashT > 0) return;
    this.dashT = rand(RAT.dashEvery);
    const lead = this.lead(); if (!lead) return;
    if (beatAt(this.beats, lead.pos.x, lead.pos.z) === 'walk') return;
    const rats = this.nested.filter((e) => !e.dead && this.game.enemies.includes(e));
    const cands = rats.map((e) => ({ e, dist: e.pos.distanceTo(lead.pos), los: lineOfSight(this.game.world, e.pos, 0.6, lead.pos, 1.2), aggro: e.aggro, perch: e.loiter.perch, alerting: e.loiter.alertT != null }));
    const others = this.game.enemies.filter((e) => e.kind === 'rat' && !e.dead && !this.nested.includes(e) && (e.aggro || e.loiter?.alertT != null)).map(() => ({ aggro: true }));
    const i = pickDasher([...cands, ...others]);
    if (i >= 0 && cands[i]) cands[i].e.dash(lead);
  }
  // further on: a single rat out of a drain or an alley, at a distance, that runs at you
  spawnCity(force = false) {
    const g = this.game, hs = this.heroes(); if (!hs.length || !this.holes?.length) return 0;
    const lead = this.lead();
    const beat = beatAt(this.beats, lead.pos.x, lead.pos.z);
    if (!force && beat === 'walk') return 0;
    if (!force && (this.live().length >= RAT.holeCap || this.aggroRats() >= RAT.maxAggro)) return 0;
    const near = (v) => Math.min(...hs.map((p) => Math.hypot(p.pos.x - v.x, p.pos.z - v.z)));
    const [lo, hi] = RAT.holeRange;
    const goal = g.level?.goal;
    const cands = this.holes.filter((h) => { const d = near(h.at); return d >= lo && d <= hi && (!h.beat || h.beat === beat || force); });
    if (!cands.length) return 0;
    // prefer holes on the way to the bus
    const score = (h) => (goal ? Math.hypot(h.at.x - goal.x, h.at.z - goal.z) : 0) + Math.random() * 8;
    cands.sort((x, y) => score(x) - score(y));
    const hole = cands[0];
    const p = hole.at.clone(); p.y = hole.at.y;
    const e = g.spawnEnemy('rat', p, { level: 1 });
    if (!e) return 0;
    e.roamer = true; e.spawnT = 0.45;
    if (e.loiter) { e.loiter.home = hole.out.clone(); e.dash(lead); e.loiter.alertT = 0.9; }   // up out of the drain, a squeak, then it runs
    else e.aggro = true;
    this.list.push(e);
    return 1;
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

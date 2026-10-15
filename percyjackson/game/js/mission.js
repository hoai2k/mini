// Chapter runtime: as the party comes near a room its monsters are there
// already, in groups milling about in the open with scouts posted toward the
// way in (world/encounters.js placed them; entities/packRules.js says how
// they notice and come, a few first, then more and more). Where the Mist is
// thick some walk about disguised as mortals. A trap room slams its doors
// behind the party and sends waves in from marked points until they are
// beaten. It tracks the objective, opens the boss gate, stages the boss intro
// (in the thickest Mist the boss waits disguised until a hero sees through
// it) and spawns the exit and reward chest when the boss falls.
//
// Objectives (chapter `objective`):
//   exorcise  defeat N monsters.
//   rescue    free N captives: in golden cages, or turned to stone
//             (`captive: 'statue'`); hold X / E, and monsters come.
//   seal      close N cursed altars, Hephaestus's traps (`seal: 'trap'`) or
//             rifts (`seal: 'rift'`): a long hold while waves attack.
//   flag      capture the flag (objectives/flag.js).
//   escape    get out before time runs out; no boss (objectives/escape.js).
//   boss      a short approach, then straight into the boss (objectives/boss.js).
//   museum    chapter 1: a calm walk to Mrs. Dodds, the Mist lifts, everyone
//             in disguise comes for you, and she flies off three times
//             (objectives/museum.js; rules in story/museumRules.js).
// Online the host runs all of it; guests send `act` topics for what they do
// (see objectives/common.js) and get the state in the host's snapshot.
import * as THREE from 'three/webgpu';
import { mistForm } from './entities/mistPeople.js';
import { Boss } from './entities/bosses.js';
import { buildHeroModel } from './entities/models.js';
import { B } from './world/blocks.js';
import { toast } from './ui/ui.js';
import { ENEMY_TABLES } from './world/levelgen.js';
import { OBJECTIVES } from './objectives/index.js';
import { makeStatue, makeTrap, makeRift } from './objectives/props.js';
import { isGuest, sendAct } from './objectives/common.js';
import { chapter as chapterDef, chapterPlayable } from './story/chapters.js';
import { chapterMissionDef, resolveBoss, resolveBiome } from './story/missionDef.js';
import { bundlesFrom } from './resources.js';
import { Pack, packLoiter } from './entities/packRules.js';
import { mulberry32 } from './util.js';

const PRIME = 12;        // a room's monsters are there once a hero is this close to it (metres)
const TRAP_IN = 3;       // a trap springs once a hero is this far inside the room
const TRAP_GIVE_UP = 150; // seconds: a trap nobody can finish opens anyway

const OBJ_TEXT = {
  exorcise: (o) => ['Defeat the Monsters', `${o.done} / ${o.need} monsters defeated`],
  rescue: (o) => ['Free the Captives', `${o.done} / ${o.need} freed`],
  seal: (o) => ['Destroy the Cursed Objects', `${o.done} / ${o.need} destroyed`],
};
// what an objective item is called, by style
const ITEM_TEXT = {
  statue: { verb: 'freed', label: 'Break the stone spell', done: 'Freed from the stone!', hold: 2 },
  cage: { verb: 'freed', label: 'Free them', done: 'Freed!', hold: 1.2 },
  altar: { verb: 'destroyed', label: 'Destroy cursed object', done: 'Destroyed!', hold: 2.5 },
  trap: { verb: 'shut', label: 'Shut the trap (hold)', done: 'The trap snaps shut!', hold: 3.5 },
  rift: { verb: 'closed', label: 'Close the rift (hold)', done: 'The rift closes!', hold: 3.5 },
};

export class Mission {
  constructor(game, def, level) {
    this.game = game; this.def = def; this.L = level;
    this.obj = level.objective;
    this.ch = def.chapter ? chapterDef(def.chapter) : null;
    this.itemStyle = this.obj.type === 'rescue' ? (this.ch?.captive ?? 'cage') : (this.ch?.seal ?? 'altar');
    level.enemyKinds ??= (ENEMY_TABLES[def.biome] ?? []).map(([k]) => k);
    // story chapters ask for fewer kills on the easy settings
    if (def.chapter && this.obj.type === 'exorcise') this.obj.need = Math.min(this.obj.need, 10 + 6 * (def.difficulty ?? 1));
    this.bossSpawned = false; this.boss = null; this.complete = false;
    this.props = [];
    this.stats = { kills: 0, damage: 0, time: 0, coins: 0, secrets: 0, deaths: 0, loot: [] };
  }
  // The mission definition for a chapter (biome and boss fall back to
  // built ones while a chapter's own are still being made).
  static defForChapter(ch, difficulty = 1) { return chapterMissionDef(ch, difficulty); }
  // Can this chapter be started (ready, or pending with `?pending`)?
  static playable(ch) { return chapterPlayable(ch); }
  // Any mission definition (a retry, the host's setup online): a biome or
  // boss that isn't built falls back to one that is.
  static resolveDef(def) {
    if (def.biome) def.biome = resolveBiome(def.biome);
    if (def.boss) def.boss = resolveBoss(def.boss);
    return def;
  }
  setup() {
    const g = this.game, L = this.L;
    const H = OBJECTIVES[this.obj.type];
    this.handler = H ? new H(this) : null;
    // objective props (on dry ground: a spot at the bottom of a pool can't be reached)
    for (const it of this.obj.items) this.dryItemSpot(it);
    for (const it of this.obj.items) {
      const st = this.itemStyle;
      if (st === 'cage') this.makeCage(it);
      else if (st === 'statue') this.makeStatueItem(it);
      else if (st === 'trap' || st === 'rift') this.makeSealItem(it, st);
      else this.makeAltar(it);
    }
    for (const c of L.chests) this.makeChest(c);
    this.handler?.setup?.();
    this.updateText();
    g.minimap.reveal(L.rooms[0]);
  }
  // Moves an objective item that landed in water, in a wall or off the
  // room's floor to the nearest dry floor in its room (the same on every
  // browser: it only depends on the level).
  dryItemSpot(it) {
    const w = this.game.world, room = it.room, y0 = room?.y ?? it.pos.y;
    const ok = (x, z) => {
      const gy = w.groundBelow(x, z, y0 + 2.5);
      if (!isFinite(gy) || Math.abs(gy - y0) > 1.5 || w.liquidAt(x, gy + 0.5, z) || w.liquidAt(x, gy - 0.5, z)) return null;
      for (let k = 0; k < 3; k++) if (w.solidAt(x, gy + 0.5 + k, z)) return null;
      return gy;
    };
    if (ok(it.pos.x, it.pos.z) != null && Math.abs(it.pos.y - y0) <= 1.5) return;
    const cx = Math.floor(it.pos.x), cz = Math.floor(it.pos.z);
    for (let r = 1; r <= 14; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = cx + dx + 0.5, z = cz + dz + 0.5;
      if (room && (x < room.x0 + 1 || x > room.x1 || z < room.z0 + 1 || z > room.z1)) continue;
      const gy = ok(x, z); if (gy == null) continue;
      it.pos.set(x, gy, z); return;
    }
  }
  get exitOpen() { return !!this.handler?.exitOpen; }
  updateText() {
    let [t, d] = (OBJ_TEXT[this.obj.type] ?? OBJ_TEXT.exorcise)(this.obj);
    const it = ITEM_TEXT[this.itemStyle];
    if (this.obj.items.length && it) d = `${this.obj.done} / ${this.obj.need} ${it.verb}`;
    if (this.def.objText) t = this.def.objText;
    const own = this.handler?.text?.();
    if (own) { this.game.hud.setObjective(own[0], own[1]); return; }
    if (this.handler?.approach && this.objDone && !this.bossSpawned) { this.game.hud.setObjective(t, 'The way ahead is open: face the boss'); return; }
    const bossText = this.disguisedBoss && this.disguisedBoss.disguised ? 'Something is wrong here. See through the Mist (right stick click / V)' : this.boss && this.boss.dead ? 'Reach the way out' : 'The way ahead is open';
    this.game.hud.setObjective(this.objDone ? (this.boss?.dead ? 'Victory' : 'Face the Monster') : t, this.objDone ? bossText : d);
  }
  // ---------------------------------------------------------------- props
  addProp(obj) { this.game.scene.add(obj); this.props.push(obj); return obj; }
  makeCage(it) {
    const g = this.game;
    const grp = new THREE.Group(); grp.position.copy(it.pos);
    const student = buildHeroModel(['percy', 'annabeth', 'grover'][this.obj.items.indexOf(it) % 3]);
    student.root.scale.setScalar(0.95); grp.add(student.root);
    student.armR.rotation.x = -2.6; student.armL.rotation.x = -2.4;
    const bars = new THREE.MeshStandardNodeMaterial({ color: 0xffe0a0, emissive: 0xffc860, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), bars); bar.position.set(Math.cos(a) * 0.9, 1.3, Math.sin(a) * 0.9); grp.add(bar); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.15, 8), bars); top.position.y = 2.65; grp.add(top);
    this.addProp(grp);
    it.object = grp; it.rig = student;
    g.lights.attach(grp, 0xffc860, 3, 6, { offsetY: 2 });
    g.interactables.push({ id: 'obj' + this.obj.items.indexOf(it), pos: it.pos, radius: 2.4, label: 'Free them', hold: 1.2, action: () => this.completeItem(it), enabled: () => !it.done });
  }
  // A captive turned to stone (Aunty Em's garden): monsters come when you
  // start breaking the spell.
  makeStatueItem(it) {
    const g = this.game, T = ITEM_TEXT.statue;
    const { grp, rig } = makeStatue();
    grp.position.copy(it.pos); grp.rotation.y = this.obj.items.indexOf(it) * 2.1;
    this.addProp(grp);
    it.object = grp; it.rig = rig;
    it.light = g.lights.attach(grp, 0xd8d0b8, 2, 5, { offsetY: 2 });
    it.inter = { id: 'obj' + this.obj.items.indexOf(it), pos: it.pos, radius: 2.4, label: T.label, hold: T.hold, onHoldStart: () => this.guardWave(it, 1), action: () => this.completeItem(it), enabled: () => !it.done };
    g.interactables.push(it.inter);
  }
  // Hephaestus's trap or a rift: a long hold, with a second wave halfway.
  makeSealItem(it, style) {
    const g = this.game, T = ITEM_TEXT[style];
    const grp = style === 'trap' ? makeTrap() : makeRift();
    grp.position.copy(it.pos);
    this.addProp(grp);
    it.object = grp; it.spin = grp.userData.spin; it.close = grp.userData.close;
    it.light = g.lights.attach(grp, style === 'trap' ? 0xff4a2a : 0x9a4aff, 4, 8, { offsetY: 1.2 });
    it.inter = { id: 'obj' + this.obj.items.indexOf(it), pos: it.pos, radius: 2.6, label: T.label, hold: T.hold, onHoldStart: () => this.guardWave(it, 1), action: () => this.completeItem(it), enabled: () => !it.done };
    g.interactables.push(it.inter);
  }
  // Monsters come to guard an objective (the host spawns; a guest asks it to).
  guardWave(it, stage = 1) {
    const k = 'waved' + stage;
    if (it[k] || it.done) return; it[k] = true;
    if (isGuest(this)) { sendAct(this.game, { a: 'wave', i: this.obj.items.indexOf(it), s: stage }); return; }
    it.waved = false; this.altarWave(it);
  }
  makeAltar(it) {
    const g = this.game;
    const grp = new THREE.Group(); grp.position.copy(it.pos);
    const stone = new THREE.MeshStandardNodeMaterial({ color: 0x5a5560, roughness: 0.8 });
    const glow = new THREE.MeshStandardNodeMaterial({ color: 0x8a1a2a, emissive: 0xff2a4a, emissiveIntensity: 2.5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4), stone); base.position.y = 0.45; base.castShadow = true;
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), glow); finger.position.y = 1.3; finger.rotation.z = 0.3;
    grp.add(base, finger);
    this.addProp(grp);
    it.object = grp; it.finger = finger;
    it.light = g.lights.attach(finger, 0xff2a4a, 4, 7, { offsetY: 0 });
    g.interactables.push({ id: 'obj' + this.obj.items.indexOf(it), pos: it.pos, radius: 2.4, label: 'Destroy cursed object', hold: 2.5, onHoldStart: () => this.guardWave(it, 1), action: () => this.completeItem(it), enabled: () => !it.done });
  }
  altarWave(it) {
    if (it.waved) return; it.waved = true;
    const g = this.game;
    toast(this.itemStyle === 'statue' ? 'Aunty Em’s servants come running!' : this.itemStyle === 'rift' ? 'The dead pour out of the rift!' : this.itemStyle === 'trap' ? 'The spiders swarm out to defend it!' : 'Monsters come to guard it!');
    const kinds = this.L.enemyKinds?.length ? this.L.enemyKinds : ['pup'];
    // they come from across the room (defending a spot in the open), not out of the floor at your feet
    const n = 4 + ((this.def.difficulty ?? 1) >= 3 ? 1 : 0), a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2;
      const p = [10, 8, 6, 4, 2.5].map((d) => this.standAt(it.pos.x + Math.cos(a) * d, it.pos.y, it.pos.z + Math.sin(a) * d)).find((q) => q && it.room && q.x >= it.room.x0 && q.x <= it.room.x1 + 1 && q.z >= it.room.z0 && q.z <= it.room.z1 + 1) ?? it.pos.clone();
      const e = g.spawnEnemy(kinds[i % kinds.length], p, { level: this.def.difficulty }); g.fx.summonCircle(p, 0xff2a4a);
      if (e) e.aggro = true;
    }
  }
  makeChest(c) {
    const g = this.game;
    const grp = new THREE.Group(); grp.position.copy(c.pos);
    const wood = new THREE.MeshStandardNodeMaterial({ color: c.rarity === 'rare' ? 0x2a4a8a : 0x7a5230, roughness: 0.7 });
    const trim = new THREE.MeshStandardNodeMaterial({ color: 0xd8b040, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), wood); body.position.y = 0.35; body.castShadow = true;
    const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.4);
    const lidM = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 0.85), wood); lidM.position.set(0, 0.15, 0.4); lidM.castShadow = true; lid.add(lidM);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.1), trim); lock.position.set(0, 0.6, 0.42);
    grp.add(body, lid, lock); grp.rotation.y = Math.random() * Math.PI * 2;
    this.addProp(grp);
    c.object = grp; c.lid = lid;
    g.interactables.push({ id: 'chest' + this.L.chests.indexOf(c), pos: c.pos, radius: 2, label: 'Open chest', action: (p) => this.openChest(c, p), enabled: () => !c.opened });
  }
  openChest(c, p) {
    if (c.opened) return; c.opened = true;
    const g = this.game;
    g.audio?.loot(c.rarity);
    let t = 0; g.addUpdater((dt) => { t += dt; c.lid.rotation.x = -Math.min(1.9, t * 6); return t < 0.4; });
    g.particles.burst(c.pos.clone().setY(c.pos.y + 0.8), { count: 24, color: c.rarity === 'rare' ? 0x4ad0ff : 0xffd23a, speed: 4, up: 2, life: 0.8, size: 0.14, shape: 1 });
    g.pickups.drop('coin', c.pos, 6 + Math.floor(Math.random() * 6) + (c.rarity === 'rare' ? 10 : 0), 1);
    if (Math.random() < 0.5) g.pickups.drop('heal', c.pos, 1);
    const nb = bundlesFrom(c.rarity === 'rare' ? 'rareChest' : 'chest'); if (nb) g.pickups.drop('arrows', c.pos, nb);
    g.onChestOpened?.(c, p);
    if (c.room.type === 'secret') { this.stats.secrets++; toast('Secret found!'); }
  }
  completeItem(it) {
    if (it.done) return;
    const g = this.game;
    it.done = true; this.obj.done++;
    g.audio?.energy('heal'); g.audio?.levelUp();
    const T = ITEM_TEXT[this.itemStyle];
    if (this.itemStyle === 'statue') {
      g.fx.heal(it.pos, 0xffd23a);
      it.object.userData.unstone?.();
      g.lights.remove(it.light);
      let t = 0; g.addUpdater((dt) => { t += dt; if (t > 0.8) { it.object.position.y += dt * 3; it.object.scale.setScalar(Math.max(0.01, 1.8 - t)); } return t < 1.8; });
      toast(T.done);
    } else if (this.itemStyle === 'trap' || this.itemStyle === 'rift') {
      g.fx.heal(it.pos, this.itemStyle === 'trap' ? 0xffb84a : 0x9a4aff);
      g.lights.remove(it.light);
      g.shake?.(0.15);
      let t = 0; g.addUpdater((dt) => { t += dt; it.close?.(Math.min(1, t * 3)); return t < 0.4; });
      toast(T.done);
    } else if (this.obj.type === 'rescue') {
      g.fx.heal(it.pos, 0xffd23a);
      let t = 0; g.addUpdater((dt) => { t += dt; it.object.position.y += dt * 3; it.object.scale.setScalar(Math.max(0.01, 1 - t)); return t < 1; });
      toast('Freed!');
    } else {
      g.fx.heal(it.pos, 0xff5a7a);
      it.finger.material = new THREE.MeshStandardNodeMaterial({ color: 0xe8dcb0 });
      g.lights.remove(it.light);
      toast('Destroyed!');
    }
    this.checkObjective();
  }
  onKill(e) {
    this.stats.kills++;
    if (this.obj.type === 'exorcise' && !e.isBoss) { this.obj.done = Math.min(this.obj.need, this.obj.done + 1); this.checkObjective(); }
  }
  checkObjective() {
    this.updateText();
    if (this.objDone || this.obj.done < this.obj.need) return;
    this.objDone = true; this.game.objectiveDone = true;
    const g = this.game;
    if (this.handler?.keepGates) { this.updateText(); return; }
    toast('The way ahead opens', 'big');
    g.audio?.gong();
    for (const gate of this.L.gates) this.openGate(gate);
    this.updateText();
  }
  // Opens a gate a block at a time; `gate.opened` once the last is gone.
  openGate(gate) {
    const g = this.game;
    if (gate.open) return;
    gate.open = true; gate.opened = false;
    this.clearGateTimers(gate);
    g.audio?.sample?.('gate');
    let i = 0;
    for (const [x, y, z] of gate.blocks) {
      gate.timers.push(setTimeout(() => { if (!gate.open) return; g.world.set(x, y, z, 0); g.particles.burst(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), { count: 6, color: 0x5ad8ff, speed: 3, life: 0.6, size: 0.2 }); }, (i++) * 25));
    }
    gate.timers.push(setTimeout(() => { if (gate.open) gate.opened = true; gate.timers = []; }, i * 25 + 10));
  }
  clearGateTimers(gate) { for (const t of gate.timers ?? []) clearTimeout(t); gate.timers = []; }
  sealGates() {
    const g = this.game;
    for (const gate of this.L.gates) { this.clearGateTimers(gate); gate.open = false; gate.opened = false; for (const [x, y, z] of gate.blocks) g.world.set(x, y, z, B.blue_energy); }
  }
  // Heroes on this screen left outside the boss arena when it seals are
  // brought in (they'd be shut out of the fight otherwise).
  pullIntoArena(room) { this.pullInto(room, 'The arena seals: your friends are pulled inside', this.boss?.pos); }
  pullInto(room, msg, away = null) {
    const g = this.game, inside = (p) => p.pos.x >= room.x0 && p.pos.x <= room.x1 + 1 && p.pos.z >= room.z0 && p.pos.z <= room.z1 + 1;
    const list = room.spawns?.length ? room.spawns : [[room.center.x, room.y, room.center.z]];
    const boss = away ?? room.center;
    const far = list.slice().sort((a, b) => Math.hypot(b[0] - boss.x, b[2] - boss.z) - Math.hypot(a[0] - boss.x, a[2] - boss.z));
    let n = 0;
    for (const p of g.players) {
      if (p.remote || p.dead || p.removed || inside(p)) continue;
      const sp = far[n % far.length], k = Math.floor(n / far.length);
      const at = this.standAt(sp[0] + k * 0.8, sp[1], sp[2]) ?? new THREE.Vector3(sp[0], sp[1], sp[2]);
      p.spawn(at); g.fx?.summonCircle?.(at, 0x5ad8ff); n++;
    }
    if (n) toast(msg);
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, L = this.L;
    this.stats.time += dt;
    for (const room of L.rooms) {
      const near = (p, m) => !p.dead && p.pos.x >= room.x0 - m && p.pos.x <= room.x1 + 1 + m && p.pos.z >= room.z0 - m && p.pos.z <= room.z1 + 1 + m;
      if (!room.primed && (room.packs?.length || room.loose?.length) && g.players.some((p) => near(p, PRIME))) this.spawnPacks(room);
      const inside = g.players.some((p) => near(p, 1));
      if (inside && !room.activated) this.activate(room);
      const T = room.trap;
      if (T && room.activated && !T.sprung && !T.done && g.players.some((p) => !p.dead && !p.downed && p.pos.x >= room.x0 + TRAP_IN && p.pos.x <= room.x1 + 1 - TRAP_IN && p.pos.z >= room.z0 + TRAP_IN && p.pos.z <= room.z1 + 1 - TRAP_IN)) this.springTrap(room);
      if (room.activated && room.waveIdx < room.waves.length && (!T || (T.sprung && !T.done))) {
        const alive = room.enemies.filter((e) => !e.dead).length;
        if (alive <= 1 && room.waveT <= 0) { this.spawnWave(room); }
        room.waveT -= dt;
      }
      if (T && T.sprung && !T.done) {
        T.t = (T.t ?? 0) + dt;
        if (room.waveIdx >= room.waves.length && !room.enemies.some((e) => !e.dead)) this.openTrap(room);
        else if (T.t > TRAP_GIVE_UP) this.openTrap(room, true);
      }
      if (room.reserve?.length) this.spawnReserve(room);
      if (room.type === 'boss' && inside && this.objDone && !this.bossSpawned && this.def.boss && this.handler?.autoBoss !== false && L.gates.every((gt) => gt.opened)) {
        const all = g.players.filter((p) => !p.dead).every((p) => p.pos.x >= room.x0 && p.pos.x <= room.x1 && p.pos.z >= room.z0 && p.pos.z <= room.z1);
        if (all || this.bossWaitT > 4) this.startBoss(room);
        this.bossWaitT = (this.bossWaitT ?? 0) + dt;
      }
    }
    // spin altars, bob cages
    for (const it of this.obj.items) {
      if (it.done) continue;
      if (it.finger) it.finger.rotation.y += dt * 2;
      if (it.spin) it.spin.rotation.y += dt * (this.itemStyle === 'rift' ? 1.5 : 3);
      // a long hold brings a second wave halfway through
      if (it.inter && it.inter.hold >= 3 && (it.inter.progress ?? 0) > 0.5) this.guardWave(it, 2);
    }
    if (isGuest(this) && this.bossSpawned && !this.pulled && this.handler?.autoBoss !== false && L.gates.length && L.gates.every((gt) => !gt.open)) { this.pulled = true; this.pullIntoArena(L.bossRoom); }
    if (this.failed || this.complete) return;
    this.handler?.update?.(dt);
    if (this.disguisedBoss && !this.disguisedBoss.disguised && !this.revealedBoss) this.revealDisguisedBoss();
  }
  activate(room) {
    const g = this.game;
    room.activated = true; room.enemies = []; room.waveIdx = 0; room.waveT = 0;
    g.minimap.reveal(room);
    this.spawnMortals(room);
    if (room.type === 'secret') toast('A hidden chamber…');
    if (room.waves.length && !room.trap) this.spawnWave(room);
  }
  // ---------------------------------------------------------------- groups
  // The room's monsters, where the level put them (the same on every browser:
  // world/encounters.js placed them from the seed; online the host spawns
  // them). Groups mill about until they notice the party; scouts stand toward
  // the way in. More players, bigger groups (each member says how many humans
  // it takes). Over the monster cap the rest wait in reserve.
  spawnPacks(room) {
    const g = this.game, L = this.L;
    room.primed = true; room.enemies ??= []; room.reserve ??= [];
    const humans = Math.max(1, g.players.filter((p) => !p.ai).length);
    const rnd = mulberry32((L.seed ?? 1) ^ Math.imul(L.rooms.indexOf(room) + 1, 0x9e3779b1));
    const mist = this.def.mist ?? 0, kinds = this.def.disguise ?? [];
    // chapter 1 (objectives/museum.js): everyone is in disguise, and only this share of a group are monsters at all
    const share = kinds.length ? this.handler?.mistShare : null, keep = mulberry32((L.seed ?? 1) ^ Math.imul(L.rooms.indexOf(room) + 7, 0x85ebca6b));
    let skip = room.killedBefore ?? 0;   // (Continue: those already killed stay dead)
    const packs = (room.packs ?? []).map((p) => new Pack(new THREE.Vector3(...p.at)));
    room.packObjs = packs;
    const list = [];
    for (const m of room.loose ?? []) {
      // a scout belongs to the nearest group
      let pack = null, bd = Infinity;
      if (m.role === 'scout') for (const p of packs) { const d = Math.hypot(p.center.x - m.at[0], p.center.z - m.at[2]); if (d < bd) { bd = d; pack = p; } }
      list.push({ m, pack });
    }
    (room.packs ?? []).forEach((p, i) => { for (const m of p.members) list.push({ m, pack: packs[i] }); });
    for (const { m, pack } of list) {
      const r = rnd();
      if (m.humans > humans) continue;
      if (share != null && keep() >= share) continue;
      if (skip > 0) { skip--; continue; }
      const disguise = share != null ? kinds[Math.floor(rnd() * kinds.length)] : m.role !== 'scout' && !m.big && kinds.length && r < mist * 0.4 ? kinds[Math.floor(rnd() * kinds.length)] : null;
      room.reserve.push({ m, pack, disguise });
    }
    this.spawnReserve(room, true);
  }
  // Bring in waiting members while there is room under the cap (idle at their
  // spot if their group hasn't been roused, else coming at the party).
  spawnReserve(room, first = false) {
    const g = this.game, cap = g.gr.preset.enemyCap;
    let live = this.activeCount();
    if (!first && live > cap - 2) return;
    while (room.reserve.length && live < cap) {
      const { m, pack, disguise } = room.reserve.shift();
      const at = new THREE.Vector3(...m.at);
      const pos = this.standAt(at.x, at.y, at.z) ?? at;
      const kind = disguise ? mistForm(this.def.mistForms, Math.random()) : m.kind;
      const e = g.spawnEnemy(kind, pos, { elite: m.elite, level: this.def.difficulty, disguise });
      if (!e) break;
      live++;
      room.enemies.push(e);
      e.spawnT = 0; e.facing = Math.random() * Math.PI * 2;
      if (e.disguised || e.def.ai === 'statue') continue;
      packLoiter(e, { pack, role: m.role, area: { x0: room.x0 - 3, z0: room.z0 - 3, x1: room.x1 + 4, z1: room.z1 + 4 } });
      if (!first && pack?.alarmed) {
        // a latecomer to a fight already on: up out of the ground, straight in
        e.spawnT = 0.5; e.loiter.joinT = 0.3 + Math.random() * 0.8;
        g.fx.summonCircle(pos, e.elite ? 0xff9aff : 0xffc84a);
      }
    }
  }
  // Monsters that count against the cap: those in a fight or near a hero (a
  // group milling about in a room nobody is in yet costs next to nothing).
  activeCount() {
    const g = this.game, hs = g.players.filter((p) => !p.dead);
    return g.enemies.filter((e) => !e.dead && !e.isDummy && !e.def?.mortal && (e.aggro || e.isBoss || hs.some((p) => Math.abs(p.pos.x - e.pos.x) < 22 && Math.abs(p.pos.z - e.pos.z) < 22))).length;
  }
  // ---------------------------------------------------------------- traps
  // The doors slam shut behind the party, waves come in from the marked
  // points, and the room opens when they are beaten (host; guests see the
  // doors from the host's snapshot).
  springTrap(room) {
    const g = this.game, T = room.trap;
    if (T.sprung) return;
    T.sprung = true; T.t = 0;
    this.setTrapGates(room, true);
    this.pullInto(room, 'The doors slam shut: your friends are pulled inside');
    toast('It’s a trap!', 'big');
    g.audio?.sample?.('gate'); g.audio?.gong?.();
    g.shake?.(0.35);
    for (const p of T.points) g.fx.summonCircle(new THREE.Vector3(p[0], p[1], p[2]), 0xff3a2a);
    room.waveIdx = 0; room.waveT = 1.6;   // a moment to see where they will come from
    this.game.onTrap?.(room);
  }
  openTrap(room, gaveUp = false) {
    const g = this.game, T = room.trap;
    if (T.done) return;
    T.done = true;
    if (gaveUp) for (const e of room.enemies) if (!e.dead) { e.dead = true; e.deathT = 99; g.fx?.poof?.(e.pos); g.scene.remove(e.object); }
    room.waveIdx = room.waves.length;
    this.setTrapGates(room, false);
    toast('The trap is beaten: the doors open', 'big');
    g.audio?.energy?.('heal');
  }
  setTrapGates(room, shut) {
    const g = this.game;
    for (const i of room.trap?.gates ?? []) {
      const gate = this.L.trapGates[i]; if (!gate) continue;
      if (gate.open === !shut) continue;
      gate.open = !shut;
      for (const [x, y, z] of gate.blocks) {
        if (shut && g.world.get(x, y, z)) continue;   // (never over a wall that is there)
        g.world.set(x, y, z, shut ? B.metal_grate : 0);
      }
      gate.set = shut ? gate.blocks.filter(([x, y, z]) => g.world.get(x, y, z) === B.metal_grate) : [];
      g.particles?.burst?.(gate.pos.clone().setY(gate.pos.y + 1.5), { count: 30, color: shut ? 0xff5a3a : 0xd8cfbd, speed: 4, life: 0.7, size: 0.2 });
    }
  }
  // Real mortals milling around a room in the Mist (they never fight and can't
  // be hurt; a hero who swings at one gets told off). They aren't the room's
  // enemies: they don't count for clearing it.
  spawnMortals(room) {
    const g = this.game, mist = this.def.mist ?? 0, kinds = this.def.disguise ?? [];
    if (room.mortals || !kinds.length || mist <= 0 || room.type === 'boss' || isGuest(this)) return;
    room.mortals = [];
    const n = Math.floor(mist * 2 + Math.random() * 1.5);
    const spots = room.spawns.length ? room.spawns : [[room.center.x, room.center.y, room.center.z]];
    for (let i = 0; i < n; i++) {
      const sp = spots[Math.floor(Math.random() * spots.length)];
      const pos = this.standAt(sp[0] + (Math.random() - 0.5) * 3, sp[1], sp[2] + (Math.random() - 0.5) * 3) ?? this.standAt(sp[0], sp[1], sp[2]);
      if (!pos) continue;
      const e = g.spawnEnemy('mortal', pos, { disguise: kinds[Math.floor(Math.random() * kinds.length)] });
      if (e) room.mortals.push(e);
    }
  }
  spawnWave(room) {
    const g = this.game;
    const wave = room.waves[room.waveIdx++];
    room.waveT = 2.5;
    const spots = room.trap?.points?.length ? room.trap.points : room.spawns.length ? room.spawns : [[room.center.x, room.center.y, room.center.z]];
    const cap = g.gr.preset.enemyCap;
    // Over the enemy cap, the rest of the wave waits for the next one (so a
    // room's kill total can always be met).
    const later = [];
    wave.forEach((s, i) => {
      if (!room.trap && this.activeCount() >= cap) { later.push(s); return; }   // (a trap's waves always come: they are the fight you are shut in with)
      const sp = spots[(i * 7 + room.waveIdx * 3) % spots.length];
      // search from just above the spawn's floor, so nothing lands on a roof
      const pos = this.standAt(sp[0] + (Math.random() - 0.5) * 1.5, sp[1], sp[2] + (Math.random() - 0.5) * 1.5) ?? this.standAt(sp[0], sp[1], sp[2]) ?? new THREE.Vector3(sp[0], sp[1], sp[2]);
      // in the Mist some monsters are walking about disguised as mortals; under
      // True Sight they are creatures nothing like people (entities/mistPeople.js)
      const mist = this.def.mist ?? 0, kinds = this.def.disguise ?? [];
      const disguise = !s.elite && kinds.length && Math.random() < mist * 0.55 ? kinds[Math.floor(Math.random() * kinds.length)] : null;
      const kind = disguise ? mistForm(this.def.mistForms, Math.random()) : s.kind;
      const e = g.spawnEnemy(kind, pos, { elite: s.elite, level: this.def.difficulty, disguise: room.trap ? null : disguise });
      if (e) { room.enemies.push(e); if (room.trap) e.aggro = true; if (!e.disguised) g.fx.summonCircle(pos, room.trap ? 0xff3a2a : e.elite ? 0xff9aff : 0xffc84a); } else later.push(s);
    });
    if (later.length === wave.length) { room.waveIdx--; room.waves[room.waveIdx] = later; room.waveT = 1; return; }   // (nobody came: try again in a moment)
    if (later.length) {
      if (room.waveIdx < room.waves.length) room.waves[room.waveIdx] = [...later, ...room.waves[room.waveIdx]];
      else room.waves.push(later);
      room.waveT = Math.max(room.waveT, 4);
    }
    g.audio?.energy('summon');
  }
  // Open floor at (x, z) found from just above `floorY` (a spawn's floor),
  // or null if that's a pit, inside a wall, on top of a prop or more than a
  // step above it, or more than two blocks below.
  standAt(x, floorY, z) {
    const w = this.game.world;
    const gy = w.groundBelow(x, z, floorY + 1.5);
    if (!isFinite(gy) || gy > floorY + 1.2 || gy < floorY - 2 || w.solidAt(x, gy + 0.5, z) || w.solidAt(x, gy + 1.5, z)) return null;
    return new THREE.Vector3(x, gy, z);
  }
  // Where the party comes back after a wipe in the boss fight: just inside
  // the arena's door, so they retry the fight (the gates stay sealed and the
  // boss keeps its health). Null when no arena fight is on. Online every
  // browser places its own heroes here from the host's boss state.
  retrySpot() {
    const L = this.L, room = L.bossRoom;
    // shut in a trap: back on your feet inside it, to finish the fight
    const trap = L.rooms.find((q) => q.trap?.sprung && !q.trap.done);
    if (trap) for (const sp of [[trap.center.x, trap.y, trap.center.z], ...(trap.spawns ?? [])]) { const at = this.standAt(sp[0], sp[1], sp[2]); if (at) return at; }
    if (this.handler?.retrySpot) return this.handler.retrySpot();   // (chapter 1: where Mrs. Dodds last fought)
    if (!room || !this.bossSpawned || this.complete || this.boss?.dead || this.handler?.autoBoss === false) return null;
    if (this.bossRoom && this.bossRoom !== room) return null;
    for (const gate of L.gates) {
      const gp = gate.pos;
      const offX = Math.min(Math.abs(gp.x - room.x0), Math.abs(gp.x - room.x1 - 1)), offZ = Math.min(Math.abs(gp.z - room.z0), Math.abs(gp.z - room.z1 - 1));
      const alongX = offX < offZ, s = Math.sign(alongX ? room.center.x - gp.x : room.center.z - gp.z) || 1;
      for (let k = 2.5; k <= 8; k += 0.5) {
        const at = this.standAt(alongX ? gp.x + s * k : gp.x, room.y, alongX ? gp.z : gp.z + s * k);
        if (at && !this.game.world.liquidAt(at.x, at.y + 0.5, at.z)) return at;
      }
    }
    // no door found: the arena spot farthest from the boss
    const boss = this.boss?.pos ?? room.center;
    const list = (room.spawns?.length ? room.spawns : [[room.center.x, room.y, room.center.z]]).slice().sort((a, b) => Math.hypot(b[0] - boss.x, b[2] - boss.z) - Math.hypot(a[0] - boss.x, a[2] - boss.z));
    for (const sp of list) { const at = this.standAt(sp[0], sp[1], sp[2]); if (at) return at; }
    return null;
  }
  startBoss(room, at = null) {
    const g = this.game;
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    // some arenas have their own lighting (Luke's duel on the camp hill at night)
    const biome = this.L.biome;
    if (biome?.bossEnv && room === this.L.bossRoom) g.env?.set({ ...biome, ...biome.bossEnv }, false);
    // seal the arena behind the players (an arena boss: bring stragglers in)
    this.sealGates();
    if (!at && room === this.L.bossRoom) this.pullIntoArena(room);
    const sp = room.spawns?.[0] ?? [room.center.x, room.y, room.center.z];
    const pos = at ? at.clone() : new THREE.Vector3(sp[0], sp[1], sp[2]);
    // In the thickest Mist the boss waits in disguise until someone sees it.
    const disguise = (this.def.mist ?? 0) >= 0.9 && this.def.disguise?.[0];
    if (disguise && !this.revealedBoss) {
      const stand = g.spawnEnemy(this.L.enemyKinds?.[0] ?? 'pup', pos, { disguise, level: this.def.difficulty });
      if (stand?.disguised) {
        stand.bossStandIn = true; this.disguisedBoss = stand; this.bossRoom = room;
        g.rig.cinematic({ center: pos.clone().setY(pos.y + 1.5), dur: 2.4, dist: 10, pitch: 28 * Math.PI / 180, orbit: 0.08 });
        toast('“Ah, there you are, honey.”', 'big');
        this.updateText();
        return;
      }
      if (stand) { stand.dead = true; g.scene.remove(stand.object); }
    }
    this.spawnBoss(room, pos);
  }
  // Called by the Mist when True Sight reaches the disguised boss.
  revealDisguisedBoss() {
    const g = this.game, st = this.disguisedBoss;
    if (!st || this.revealedBoss) return;
    this.revealedBoss = true;
    const pos = st.pos.clone();
    st.dead = true; st.hp = 0; g.scene.remove(st.object);
    g.enemies = g.enemies.filter((e) => e !== st);
    g.particles?.burst?.(pos.clone().setY(pos.y + 1), { count: 50, color: 0xffd84a, speed: 4, up: 3, life: 1.2, size: 0.2, sizeEnd: 0.02 });
    g.fx.flash(0xffd84a, 0.4, 0.3);
    this.disguisedBoss = null;
    this.spawnBoss(this.bossRoom, pos);
  }
  // holdTitle: the title banner waits (the museum shows it after Mrs. Dodds has spoken)
  spawnBoss(room, pos, { holdTitle = false } = {}) {
    const g = this.game;
    this.bossRoom = room;
    const boss = new Boss(g, resolveBoss(this.def.boss) ?? 'minotaur', pos, this.def.difficulty);
    g.scene.add(boss.object); g.enemies.push(boss);
    this.boss = boss;
    g.rig.cinematic({ center: pos.clone().setY(pos.y + 2), dur: 3, dist: 14, pitch: 32 * Math.PI / 180, orbit: 0.12 });
    g.targetDof = 0.25; setTimeout(() => { g.targetDof = 0; }, 2800);
    if (!holdTitle) toast(boss.B.title, 'title boss');
    g.audio?.boss(); g.audio?.setMusic('boss');
    g.hud.setBoss(boss);
    g.shake(0.4);
    this.updateText();
  }
  onBossKilled(boss) {
    const g = this.game;
    g.pickups.drop('coin', boss.pos, 40, 1);
    g.pickups.drop('heal', boss.pos, 3);
    g.pickups.drop('arrows', boss.pos, bundlesFrom('boss'));
    // a moment of the story as the boss falls (chapter 3: Percy is claimed)
    const down = this.ch?.bossDown;
    if (down) setTimeout(() => { if (g.mission !== this) return; if (down.stinger) g.audio?.stinger?.(down.stinger); if (down.text) toast(down.text, 'big'); }, 1200);
    setTimeout(() => {
      // exit torii + reward chest
      const exit = boss.home.clone();
      g.exitPortal = { pos: exit };
      this.makeExit(exit, 'Return to camp', () => g.completeMission());
      const chest = { pos: exit.clone().add(new THREE.Vector3(3, 0, 0)), room: this.L.bossRoom, rarity: 'rare', opened: false, boss: true };
      chest.pos.y = g.world.groundBelow(chest.pos.x, chest.pos.z, chest.pos.y + 3); if (!isFinite(chest.pos.y)) chest.pos.y = exit.y;
      this.L.chests.push(chest); this.makeChest(chest);
      for (const gate of this.L.gates) this.openGate(gate);
      this.updateText();
      g.audio?.setMusic(this.L.biome.music);
    }, 1900);
    this.updateText();
  }
  // The way out: a glowing gate. `enabled` can hold it shut.
  makeExit(pos, label, action, enabled) {
    const g = this.game;
    const grp = new THREE.Group(); grp.position.copy(pos);
    const red = new THREE.MeshStandardNodeMaterial({ color: 0xc82a1f, emissive: 0xff3a1a, emissiveIntensity: 0.6 });
    const glow = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0x7affd8).multiplyScalar(2), transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    for (const x of [-1.6, 1.6]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), red); pl.position.set(x, 2, 0); grp.add(pl); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 0.5), red); beam.position.y = 4.1; grp.add(beam);
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.7), glow); portal.position.y = 1.9; grp.add(portal);
    this.addProp(grp);
    g.lights.attach(grp, 0x7affd8, 6, 10, { offsetY: 2 });
    g.interactables.push({ id: 'exit', pos, radius: 2.8, label, action, enabled });
    return grp;
  }
  // The chapter is lost (the escape's clock ran out). The host shows the
  // results with Retry; guests wait for the host.
  fail(reason) {
    if (this.failed || this.complete) return;
    this.failed = true;
    const g = this.game;
    toast(reason ?? 'The quest has failed', 'big');
    g.audio?.setMusic?.(null);
    if (isGuest(this)) { setTimeout(() => g.mission === this && toast('Waiting for the host to try again…'), 2500); return; }
    setTimeout(() => { if (g.mission === this && !this.complete) g.showResults(false); }, 1800);
  }
  // ---------------------------------------------------------------- online
  // The objective's state for guests (host snapshot) and applying it.
  netState() { return this.handler?.netState?.(); }
  applyNet(s) { if (s && typeof s === 'object') this.handler?.applyNet?.(s); }
  // A guest's `act` of kind `obj` (host).
  onNetAct(d) {
    if (d.a === 'wave') { const it = this.obj.items[d.i | 0]; if (it) this.guardWave(it, d.s === 2 ? 2 : 1); return; }
    this.handler?.onNetAct?.(d);
  }
  dispose() { for (const gate of this.L.gates) this.clearGateTimers(gate); this.handler?.dispose?.(); for (const p of this.props) this.game.scene.remove(p); }
}

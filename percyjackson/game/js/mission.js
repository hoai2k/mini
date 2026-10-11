// Chapter runtime: activates rooms as players arrive (monsters rise out of
// the ground in waves; where the Mist is thick some walk about disguised as
// mortals), tracks the objective, opens the boss gate, stages the boss intro
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
// Online the host runs all of it; guests send `act` topics for what they do
// (see objectives/common.js) and get the state in the host's snapshot.
import * as THREE from 'three/webgpu';
import { Boss } from './entities/bosses.js';
import { buildHeroModel } from './entities/models.js';
import { B } from './world/blocks.js';
import { toast } from './ui/ui.js';
import { ENEMY_TABLES } from './world/levelgen.js';
import { OBJECTIVES } from './objectives/index.js';
import { makeStatue, makeTrap, makeRift } from './objectives/props.js';
import { isGuest, sendAct } from './objectives/common.js';
import { chapter as chapterDef } from './story/chapters.js';
import { chapterMissionDef, resolveBoss } from './story/missionDef.js';

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
  setup() {
    const g = this.game, L = this.L;
    const H = OBJECTIVES[this.obj.type];
    this.handler = H ? new H(this) : null;
    // objective props
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
  get exitOpen() { return !!this.handler?.exitOpen; }
  updateText() {
    let [t, d] = (OBJ_TEXT[this.obj.type] ?? OBJ_TEXT.exorcise)(this.obj);
    const it = ITEM_TEXT[this.itemStyle];
    if (this.obj.items.length && it) d = `${this.obj.done} / ${this.obj.need} ${it.verb}`;
    if (this.def.objText) t = this.def.objText;
    const own = !this.objDone && this.handler?.text?.();
    if (own) { this.game.hud.setObjective(own[0], own[1]); return; }
    if (this.handler?.approach && this.objDone && !this.bossSpawned) { this.game.hud.setObjective(t, 'The way ahead is open: face the boss'); return; }
    const bossText = this.disguisedBoss && this.disguisedBoss.disguised ? 'Something is wrong here. See through the Mist (LT / V)' : this.boss && this.boss.dead ? 'Reach the way out' : 'The way ahead is open';
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
    for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2; const p = it.pos.clone().add(new THREE.Vector3(Math.cos(a) * 5, 0, Math.sin(a) * 5)); const gy = g.world.groundBelow(p.x, p.z, p.y + 3); if (!isFinite(gy)) continue; p.y = gy; g.spawnEnemy(kinds[i % kinds.length], p, { level: this.def.difficulty }); g.fx.summonCircle(p, 0xff2a4a); }
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
  openGate(gate) {
    const g = this.game;
    if (gate.open) return;
    gate.open = true;
    let i = 0;
    for (const [x, y, z] of gate.blocks) {
      setTimeout(() => { g.world.set(x, y, z, 0); g.particles.burst(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), { count: 6, color: 0x5ad8ff, speed: 3, life: 0.6, size: 0.2 }); }, (i++) * 25);
    }
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, L = this.L;
    this.stats.time += dt;
    for (const room of L.rooms) {
      const inside = g.players.some((p) => !p.dead && p.pos.x >= room.x0 - 1 && p.pos.x <= room.x1 + 2 && p.pos.z >= room.z0 - 1 && p.pos.z <= room.z1 + 2);
      if (inside && !room.activated) this.activate(room);
      if (room.activated && room.waveIdx < room.waves.length) {
        const alive = room.enemies.filter((e) => !e.dead).length;
        if (alive <= 1 && room.waveT <= 0) { this.spawnWave(room); }
        room.waveT -= dt;
      }
      if (room.type === 'boss' && inside && this.objDone && !this.bossSpawned && this.def.boss && this.handler?.autoBoss !== false) {
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
    if (this.failed || this.complete) return;
    this.handler?.update?.(dt);
    if (this.disguisedBoss && !this.disguisedBoss.disguised && !this.revealedBoss) this.revealDisguisedBoss();
  }
  activate(room) {
    const g = this.game;
    room.activated = true; room.enemies = []; room.waveIdx = 0; room.waveT = 0;
    g.minimap.reveal(room);
    if (room.type === 'secret') toast('A hidden chamber…');
    if (room.waves.length) this.spawnWave(room);
  }
  spawnWave(room) {
    const g = this.game;
    const wave = room.waves[room.waveIdx++];
    room.waveT = 2.5;
    const spots = room.spawns.length ? room.spawns : [[room.center.x, room.center.y, room.center.z]];
    const cap = g.gr.preset.enemyCap;
    wave.forEach((s, i) => {
      if (g.enemies.filter((e) => !e.dead).length >= cap) return;
      const sp = spots[(i * 7 + room.waveIdx * 3) % spots.length];
      const pos = new THREE.Vector3(sp[0] + (Math.random() - 0.5) * 1.5, sp[1], sp[2] + (Math.random() - 0.5) * 1.5);
      const gy = g.world.groundBelow(pos.x, pos.z, pos.y + 3); if (!isFinite(gy)) return; pos.y = gy;
      // in the Mist some monsters are walking about disguised as mortals
      const mist = this.def.mist ?? 0, kinds = this.def.disguise ?? [];
      const disguise = !s.elite && kinds.length && Math.random() < mist * 0.55 ? kinds[Math.floor(Math.random() * kinds.length)] : null;
      const e = g.spawnEnemy(s.kind, pos, { elite: s.elite, level: this.def.difficulty, disguise });
      if (e) { room.enemies.push(e); if (!e.disguised) g.fx.summonCircle(pos, e.elite ? 0xff9aff : 0xffc84a); }
    });
    g.audio?.energy('summon');
  }
  startBoss(room, at = null) {
    const g = this.game;
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    // seal the arena behind the players
    for (const gate of this.L.gates) { gate.open = false; for (const [x, y, z] of gate.blocks) g.world.set(x, y, z, B.blue_energy); }
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
  spawnBoss(room, pos) {
    const g = this.game;
    this.bossRoom = room;
    const boss = new Boss(g, resolveBoss(this.def.boss) ?? 'minotaur', pos, this.def.difficulty);
    g.scene.add(boss.object); g.enemies.push(boss);
    this.boss = boss;
    g.rig.cinematic({ center: pos.clone().setY(pos.y + 2), dur: 3, dist: 14, pitch: 32 * Math.PI / 180, orbit: 0.12 });
    g.targetDof = 0.25; setTimeout(() => { g.targetDof = 0; }, 2800);
    toast(boss.B.title, 'domain');
    g.audio?.boss(); g.audio?.setMusic('boss');
    g.hud.setBoss(boss);
    g.shake(0.4);
    this.updateText();
  }
  onBossKilled(boss) {
    const g = this.game;
    g.pickups.drop('coin', boss.pos, 40, 1);
    g.pickups.drop('heal', boss.pos, 3);
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
  dispose() { this.handler?.dispose?.(); for (const p of this.props) this.game.scene.remove(p); }
}

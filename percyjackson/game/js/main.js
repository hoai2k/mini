// Half-Blood Quests — entry point, game states and the main loop.
import * as THREE from 'three/webgpu';
import { GameRenderer, QUALITY_LABEL, Grade } from './gfx/renderer.js';
import { buildBlockAtlas, buildSpriteAtlas } from './gfx/textures.js';
import { createBlockMaterial, createRoofMaterial, createWaterMaterial, createGlowLiquidMaterial, createDecoMaterial, U } from './gfx/materials.js';
import { LightManager } from './gfx/lights.js';
import { Particles } from './gfx/particles.js';
import { Effects } from './gfx/effects.js';
import { Debris, Bolts } from './gfx/debris.js';
import { Markers } from './gfx/markers.js';
import { CameraRig } from './camera.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Combat } from './combat.js';
import { Projectiles } from './projectiles.js';
import { Hazards } from './hazards.js';
import { UI, h, toast } from './ui/ui.js';
import { HUD } from './ui/hud.js';
import { openSettings } from './ui/settingsScreen.js';
import { TouchControls } from './ui/touch.js';
import { settings, saveSettings } from './settings.js';
import { Environment, BIOMES } from './world/biomes.js';
import { makePropMaterials } from './world/deco.js';
import { BLOCKS } from './world/blocks.js';
import { buildCamp } from './world/camp.js';
import { generateLevel } from './world/levelgen.js';
import { Mission } from './mission.js';
import { Pickups } from './pickups.js';
import { Minimap } from './ui/minimap.js';
import { BOSS_IDS, warmupGroup } from './entities/bosses.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { TrainingDummy } from './entities/dummy.js';
import { FLASH_MATERIAL } from './entities/character.js';
import { HERO_IDS } from './heroes/index.js';
import './heroes/percy.js';
import './heroes/annabeth.js';
import './heroes/grover.js';
import './heroes/tyson.js';
import './heroes/clarisse.js';
import { Profiles } from './profiles.js';
import { Slots, slotPrefix } from './slots.js';
import { Resume } from './resume.js';
import { rollChest, rollItem, powerFor, itemInfo, RARITY } from './loot.js';
import * as Screens from './ui/screens.js';
import { openTitle, openInventory, openForge, openSkills, openShop, openMapTable } from './ui/screens.js';
import { Mist } from './mist.js';
import { Party } from './party.js';
import { Archery } from './minigames/archery.js';
import { Online } from './net/online.js';
import { LootDrops } from './lootdrops.js';
import { openOnline } from './net/lobby.js';
import { mulberry32 } from './util.js';
import { ClimbingWall } from './minigames/climbingWall.js';
import { HEROES } from './heroes/index.js';
import { chapter as chapterDef, CHAPTERS } from './story/chapters.js';
import { placeQuestMarkers } from './story/questMarkers.js';
import { buildHeroModel, buildNpc } from './entities/models.js';
import { openPhotoMode } from './photo.js';
import { DomainSystem } from './domain.js';
import { Trench } from './gfx/materials.js';
import { isMobile } from './util.js';

const loadFill = document.getElementById('load-fill');
const loadText = document.getElementById('load-text');
const progress = (p, t) => { loadFill.style.width = (p * 100).toFixed(0) + '%'; if (t) loadText.textContent = t; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

class Game {
  constructor() {
    this.settings = settings;
    this.players = []; this.enemies = []; this.allies = [];
    this.time = 0; this.hitstop = 0; this.slowmo = 0; this.slowmoScale = 1;
    this.paused = false; this.state = 'loading';
    this.wipeLeft = 0;
    this.interactables = [];
    this.flashMaterial = FLASH_MATERIAL;
    this.toast = toast;
    // net: save slots (slots.js), each with per-player profiles (profiles.js) and a resume point (resume.js);
    // game.save is this tab's main profile in the active slot
    this.slots = new Slots();
    this.profiles = new Profiles(undefined, { prefix: slotPrefix(this.slots.active), slot: this.slots.active });
    this.save = this.profiles.main;
    this.resume = new Resume(this);
  }
  async boot() {
    progress(0.05, 'Detecting GPU…');
    this.gr = new GameRenderer();
    this.startedWebGL = settings.forceWebGL;
    await this.gr.init(document.getElementById('app'), { forceWebGL: settings.forceWebGL, quality: settings.quality });
    this.gr.dynRes = settings.dynRes; this.gr.motionBlur = settings.motionBlur;
    progress(0.2, `${this.gr.info.name} · ${this.gr.backend} · ${QUALITY_LABEL[this.gr.quality]}`);
    await nextFrame();
    this.scene = new THREE.Scene();
    this.rig = new CameraRig(window.innerWidth / window.innerHeight);
    this.rig.shakeScale = settings.shake; this.rig.zoomTarget = settings.cameraZoom;
    this.input = new Input(this.gr.renderer.domElement);
    this.ui = new UI(this);
    this.audio = new Audio();
    const startAudio = () => { this.audio.start(); if (this.audio.pendingAmb) { this.audio.setAmbience(this.audio.pendingAmb); this.audio.pendingAmb = null; } if (this.audio.pendingMusic) { this.audio.setMusic(this.audio.pendingMusic); this.audio.pendingMusic = null; } };
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, startAudio, { passive: true });
    window.addEventListener('gamepadconnected', startAudio);
    progress(0.3, 'Painting textures…');
    await nextFrame();
    const atlas = buildBlockAtlas();
    const sprites = buildSpriteAtlas();
    this.atlas = atlas;
    this.materials = {
      block: createBlockMaterial(atlas),
      water: createWaterMaterial(),
      glow: { cursed: createGlowLiquidMaterial(atlas, 0xc070ff, 2.4), lava: createGlowLiquidMaterial(atlas, 0xff8a3a, 2.8) },
      deco: createDecoMaterial(sprites),
      props: makePropMaterials(),
      makeRoof: () => createRoofMaterial(atlas),
    };
    this.lights = new LightManager(this.scene);
    this.lights.configure(this.gr.preset);
    this.env = new Environment(this.scene, this.lights);
    this.particles = new Particles(this.scene, this.gr.preset.particles);
    this.particles.budget = this.gr.quality === 'low' ? 0.5 : this.gr.quality === 'medium' ? 0.75 : 1;
    this.fx = new Effects(this);
    this.debris = new Debris(this);
    this.bolts = new Bolts(this.scene);
    this.markers = new Markers(this.scene);
    this.combat = new Combat(this);
    this.projectiles = new Projectiles(this);
    this.hazards = new Hazards(this);
    this.hud = new HUD(this);
    this.pickups = new Pickups(this);
    this.minimap = new Minimap(this);
    this.coins = 0;
    this.domainSys = new DomainSystem(this);
    this.mist = new Mist(this);
    this.partyMgr = new Party(this);
    this.online = new Online(this);
    this.loot = new LootDrops(this);
    this.party = null;          // single player: the heroes of the party (one human, the rest AI)
    this.battleSenseT = 0;      // Battle Sense: monsters move in slow motion while > 0
    this.updaters = [];
    this.targetDof = 0;
    try { this.save = await this.profiles.claimMain(); } catch (e) { /* net: no locks: keep the main profile */ }
    progress(0.45, 'Building Camp Half-Blood…');
    await nextFrame();
    this.loadHub();
    progress(0.75, 'Compiling shaders…');
    await nextFrame();
    this.gr.setScene(this.scene, this.rig.camera);
    try { await this.gr.renderer.compileAsync(this.scene, this.rig.camera); } catch (e) { console.warn(e); }
    progress(1, 'Ready');
    window.addEventListener('resize', () => this.gr.resize());
    const persist = () => this.profiles.flush();
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { persist(); if (this.state === 'playing' && !this.paused && !this.ui.stack.length) this.pause(); } });
    window.addEventListener('keydown', (e) => { if (e.code === 'F3') { settings.showFps = !settings.showFps; saveSettings(); this.setReadout(settings.showFps); } });
    if (isMobile) { document.body.classList.add('is-touch'); this.touch = new TouchControls(this); this.touch.show(true); }
    this.setReadout(settings.showFps);
    document.getElementById('loading').classList.add('fade');
    setTimeout(() => document.getElementById('loading').remove(), 600);
    this.last = performance.now();
    this.gr.renderer.setAnimationLoop(() => this.frame());
    this.toTitle();
  }
  // ---------------------------------------------------------------- front-end flow
  toTitle() {
    this.resume?.flush();   // net: quitting mid-chapter keeps the place to continue from
    if (this.online?.live) this.online.leave({ quiet: true });   // net: quitting to the title leaves the room
    this.state = 'title';
    this.wipeLeft = 0;
    this.hud.show(false); this.touch?.show(false);
    for (const p of this.players) this.removePlayer(p);
    this.players = [];
    if (this.mode !== 'hub') this.loadHub();
    this.rig.cinematic({ center: new THREE.Vector3(56, 8, 40), dur: 1e9, dist: 42, pitch: 34 * Math.PI / 180, orbit: 0.05 });
    this.audio.setMusic('title');
    openTitle(this);
  }
  enterSelectView(slots) {
    this.state = 'select';
    this.exitSelectView(true);
    const st = this.level.stage;
    this.selectRigs = slots.map((s, i) => {
      const rig = buildHeroModel(HERO_IDS[s.char]);
      rig.root.position.set(st.x + (i - (slots.length - 1) / 2) * 2.4, st.y, st.z);
      this.scene.add(rig.root);
      this.fx.summonCircle(rig.root.position, 0x9a7aff);
      return rig;
    });
    this.rig.cinematic({ center: new THREE.Vector3(st.x, st.y + 1.4, st.z), dur: 1e9, dist: 6 + slots.length * 1.3, pitch: 12 * Math.PI / 180, orbit: 0 });
    this.rig.yawSteps = 0;
  }
  exitSelectView(keepCam) {
    for (const r of this.selectRigs ?? []) this.scene.remove(r.root);
    this.selectRigs = [];
    if (!keepCam) this.rig.cine = null;
  }
  // net: list: [{ device, hero, profile }] (profile: a profile id; the first
  // player defaults to this device's main profile, the others to "Player N")
  // { fill: false } leaves out the AI companions (tests, minigames)
  beginSession(list, { companions = [], fill = true } = {}) {
    for (const p of this.players) this.removePlayer(p);
    this.players = [];
    this.partyMgr.clear(); this.party = null;
    this.profiles.devices.clear();
    list.forEach((l, i) => {
      const prof = (l.profile && this.profiles.profile(l.profile)) || this.profiles.slotDefault(i);
      this.profiles.assign(l.device, prof.id);
      if (i > 0) this.profiles.rememberSlot(i, prof.id);
      prof.data.lastHero = l.hero;
      this.addPlayer(l.device, l.hero);
    });
    // fewer than three humans: the other heroes come along as AI companions (party.js)
    this.partyMgr.chosen = companions.filter((id) => HEROES[id] && !HEROES[id].soon && !list.some((l) => l.hero === id));
    this.partyMgr.noFill = !fill;
    this.partyMgr.fill();
    this.save.data.lastHero = list[0]?.hero ?? this.save.data.lastHero;
    this.rig.cine = null;
    this.state = 'playing';
    this.hud.show(true); this.touch?.show(true);
    this.hud.rebuildCards?.();
    this.loadHub();
    toast('Camp Half-Blood', 'big');
  }
  startMinigame(m) {
    if (this.minigame) return;
    this.ui.closeAll();
    this.audio?.setOverride?.('minigame');
    m.start();
  }
  heroUnlocked(id) {
    const u = HEROES[id]?.unlock;
    return u === 'start' || this.save.data.unlockAll || (this.save.data.unlockedHeroes ?? []).includes(id);
  }
  // Swap a human's hero for another (at a cabin). A companion playing that
  // hero trades places.
  changeHero(p, id) {
    if (!p || p.hero === id) return;
    const mate = this.players.find((q) => q.hero === id);
    if (mate && mate.ai) { this.partyMgr.swap(p, mate); return; }
    const i = this.players.indexOf(p), np = new Player(this, p.index, p.device, id);
    np.spawn(p.pos); np.facing = p.facing;
    this.removePlayer(p); this.scene.add(np.object);
    this.players[i] = np;
    if (this.party) this.party[this.party.indexOf(p)] = np;
    this.fx.summonCircle(np.pos, 0xffd84a);
    toast(`You are ${HEROES[id].full}`, 'big');
    this.hud.rebuildCards?.();
  }
  heroName(p) { return HEROES[p.hero]?.name ?? 'A hero'; }
  // net: play another save slot (from the title / hero select / settings)
  async useSlot(id) {
    if (!this.slots.setActive(id)) return;
    this.resume.flush?.();
    this.profiles.dispose();
    this.profiles = new Profiles(undefined, { prefix: slotPrefix(id), slot: id });
    this.save = this.profiles.main;
    try { this.save = await this.profiles.claimMain(); } catch (e) { /* no locks */ }
  }
  // net: the profile of whoever plays a hero (companions: whoever played them last, else the main profile)
  saveFor(p) {
    if (!p || p.remote || !this.profiles) return this.save;
    if (p.ai) return p.gearOwner ? this.profiles.forDevice(p.gearOwner) : this.save;
    return this.profiles.forDevice(p.device);
  }
  profileName(p) { return this.saveFor(p)?.name ?? 'Player'; }
  // net: the profiles of this screen's human players (each is credited for what the party does)
  localSaves() {
    const out = new Set(this.players.filter((p) => !p.ai && !p.remote).map((p) => this.saveFor(p)));
    if (!out.size) out.add(this.save);
    return [...out];
  }
  // The hero a human controlled went down: hand control to a living companion.
  onHeroDown(p) {
    if (p.ai || !this.party) return;
    if (this.partyMgr.switchFrom(p)) toast(`${this.heroName(p)} is down — revive them!`);
  }
  battleSense(dur) { if (!settings.slowmo) return; this.battleSenseT = Math.max(this.battleSenseT, dur); }
  openPhotoMode() { return openPhotoMode(this); }
  removePlayer(p) { this.scene.remove(p.object); p.kit.dispose?.(); this.lights.remove(p.heroLight); this.partyMgr?.companions.delete(p); }
  applyQuality(q) {
    this.gr.setQualityPreset(q === 'auto' ? this.gr.info.tier : q, false);
    this.lights.configure(this.gr.preset);
    U.bakeStrength.value = this.gr.preset.bake;
    this.particles.budget = this.gr.quality === 'low' ? 0.5 : this.gr.quality === 'medium' ? 0.75 : 1;
    if (this.shafts) this.shafts.group.visible = !!this.gr.preset.shafts;
    this.gr.buildPipeline();
    this.setReadout(settings.showFps);
  }
  // ---------------------------------------------------------------- level lifecycle
  clearLevel() {
    this.wipeLeft = 0;
    this.domainSys?.end();
    if (this.world) { this.scene.remove(this.world.group); this.world.group.traverse((o) => o.geometry?.dispose()); }
    if (this.shafts) this.scene.remove(this.shafts.group);
    for (const e of this.enemies) this.scene.remove(e.object);
    for (const a of this.allies) { a.dispose?.(); this.scene.remove(a.object); }
    this.enemies = []; this.allies = [];
    this.projectiles.clear(); this.hazards.clear(); this.pickups.clear(); this.loot?.clear();
    for (const m of this.markers.items) this.markers.cancel(m);
    this.updaters = []; this.interactables = [];
    this.mission?.dispose(); this.mission = null;
    this.exitPortal = null; this.objectiveDone = false;
    this.lights.dynamic = this.lights.dynamic.filter((d) => this.players.some((p) => p.heroLight === d));
    Trench.glow.value = 0; this.trenchFade = 0;
    this.hud.setBoss(null); this.hud.setObjective(null);
    for (const o of this.hubProps ?? []) this.scene.remove(o); this.hubProps = [];
    this.hitstop = 0; this.slowmo = 0; this.frozen = false;
  }
  loadWorld(level, biome) {
    this.level = level; this.world = level.world; this.biome = biome;
    this.world.init(this.materials);
    this.scene.add(this.world.group);
    level.deco.build(this.world, this.materials, this.gr.preset.decoDensity);
    this.shafts = level.shafts; this.scene.add(level.shafts.group);
    this.shafts.group.visible = !!this.gr.preset.shafts;
    this.lights.setStatic(this.world.staticLights);
    this.env.set(biome);
    this.env.buildProbe(this.gr.renderer, biome);
    U.bakeStrength.value = this.gr.preset.bake;
    U.wind.value = biome.wind;
    this.audio.setAmbience(biome.ambience);
    this.mist?.setup(this.mode === 'loading-chapter' ? (this.pendingMist ?? 0) : 0, this.world);
  }
  placePlayers(at) {
    this.wipeLeft = 0;
    this.players.forEach((p, i) => {
      p.spawn(at.clone().add(new THREE.Vector3((i % 2) * 1.4 - 0.7 * (i > 0), 0, Math.floor(i / 2) * 1.4)));
      p.hp = p.maxHp; p.dead = false; p.downed = false; p.deadT = 0; p.downT = 0; p.reviveProgress = 0;
      p.action = null; p.healCharges = p.healMax; p.iframes = 2; p.knock?.set(0, 0, 0);
      p.hurtT = 0; p.rig.swap(null);
      p.rig.hips.rotation.x = 0;
    });
    this.rig.snap(at);
  }
  loadHub() {
    this.online?.loading?.();   // net: guests wait while the host builds camp
    this.clearLevel();
    const L = buildCamp();
    this.loadWorld(L, BIOMES.camp);
    if (this.state === 'playing') this.audio.overrideMusic = null; this.audio.setMusic('hub');
    this.placePlayers(L.spawn);
    const dummy = new TrainingDummy(this, L.dummy);
    this.scene.add(dummy.object); this.enemies.push(dummy);
    const who = (p) => p ?? this.players[0];
    this.interactables.push({ id: 'summon', pos: L.dummy.clone().add(new THREE.Vector3(1.6, 0, 0)), radius: 2.2, label: 'Training: call up monsters', action: () => this.spawnWave(), enabled: () => !this.online.isGuest });
    this.interactables.push({ id: 'map', pos: L.mapTable, radius: 2.6, label: 'Chapter map', action: () => openMapTable(this) });
    this.interactables.push({ id: 'shop', pos: L.shop, radius: 2.8, label: 'Camp store', action: (p) => openShop(this, who(p)) });
    this.interactables.push({ id: 'stash', pos: L.stash, radius: 2.4, label: L.forge ? 'The Forge: temper and enchant gear' : 'Forge and inventory', action: (p) => openForge(this, who(p)) });
    this.interactables.push({ id: 'skills', pos: L.skills, radius: 2.6, label: 'Train with Chiron', action: (p) => openSkills(this, who(p)) });
    if (L.archery) this.interactables.push({ id: 'archery', pos: L.archery, radius: 2.4, label: 'Archery range', action: (p) => this.startMinigame(new Archery(this, who(p), L.archery, L.archeryFacing ?? 0)), enabled: () => !this.minigame });
    if (L.climbingWall) this.interactables.push({ id: 'climb', pos: L.climbingWall, radius: 2.6, label: 'Climbing wall', action: (p) => this.startMinigame(new ClimbingWall(this, who(p))), enabled: () => !this.minigame && !this.online.live });   // net: the climbing wall pauses the game, so not online
    if (L.oracle && Screens.openProphecy) this.interactables.push({ id: 'oracle', pos: L.oracle, radius: 2.4, label: 'The Oracle', action: () => Screens.openProphecy(this, 'book1') });
    if (L.cabins) for (const [hid, pos] of Object.entries(L.cabins)) {
      if (!HEROES[hid] || HEROES[hid].soon) continue;
      this.interactables.push({ id: 'cabin-' + hid, pos, radius: 2.2, label: `${HEROES[hid].parent}'s cabin: play as ${HEROES[hid].name}`, action: (p) => this.changeHero(who(p), hid), enabled: () => this.heroUnlocked(hid) && !this.players.some((q) => q.hero === hid && !q.ai) });
    }
    // Chiron on the porch and Mr. D at his pinochle table
    this.hubProps = [];
    for (const [id, pos, yaw] of [['chiron', L.chiron, Math.PI], ['mr_d', L.chiron && L.chiron.clone().add(new THREE.Vector3(-2.2, 0, 0.4)), Math.PI * 0.9]]) {
      if (!pos) continue;
      const npc = buildNpc(id); npc.root.position.copy(pos); npc.root.rotation.y = yaw; this.scene.add(npc.root); this.hubProps.push(npc.root);
    }
    this.questMarkers = placeQuestMarkers(this, L);
    if (!this.save.data.seenGearHint) {   // the inventory and jump are easy to miss
      this.save.data.seenGearHint = true; this.save.write();
      setTimeout(() => toast(this.input.lastDevice?.startsWith('pad') ? 'View: inventory · A: jump' : 'I: inventory · Space: jump'), 4000);
    }
    this.wave = 0;
    this.minimap.level = null;
    this.hud.mini.classList.add('hidden');
    this.hud.setObjective('Camp Half-Blood', 'Big House porch: the chapter map · Camp store · Forge: gear · Chiron: training');
    this.mode = 'hub'; this.chapter = null;
    this.online?.sceneChanged();
    this.interactables.push({ id: 'iris', pos: (L.iris ?? L.mapTable.clone().add(new THREE.Vector3(3, 0, 0))), radius: 2.4, label: this.online?.active ? 'Iris message: online play' : 'Iris message: play online', action: () => openOnline(this) });
  }
  // Play a chapter of a book: story cards, then its level.
  startChapter(id, difficulty = 1) {
    if (this.online.isGuest) { toast('The host chooses the chapter'); return; }
    const ch = chapterDef(id);
    if (!ch || !Mission.playable(ch)) { toast('That chapter is still being written'); return; }
    this.ui.closeAll();
    const go = () => { this.online.story?.(null); this.startMission(Mission.defForChapter(ch, difficulty)); };
    this.online.story?.(ch);   // net: guests see the story cards too
    if (Screens.openStoryCards && ch.intro?.length) Screens.openStoryCards(this, { title: ch.title, sub: `Chapter ${ch.num} · ${ch.place}`, image: ch.card, lines: ch.intro }, go);
    else go();
  }
  // Compile every monster's (and this chapter's boss's) materials while the
  // level loads, so the first appearance of a new kind doesn't hitch mid-fight.
  warmupShaders(boss) {
    let grp;
    try { grp = warmupGroup(undefined, boss ? [boss] : []); } catch (e) { console.warn('warm-up skipped', e); return; }
    this.scene.add(grp);
    const done = () => this.scene.remove(grp);   // geometries and materials are shared with live monsters: keep them
    const c = this.gr.renderer?.compileAsync?.(this.scene, this.rig.camera);
    if (c?.then) c.catch(() => { /* fine: compiled on first use instead */ }).finally(done); else done();
  }
  startMission(def) {
    this.online.loading?.();   // net: guests wait while the host builds the level
    Mission.resolveDef(def);   // a biome or boss not built yet falls back to one that is
    this.ui.closeAll(); this.paused = false;
    this.clearLevel();
    this.chapter = def.chapter ? chapterDef(def.chapter) : null;
    // build the level from its seed alone, so online guests get the same one
    const rnd = Math.random; Math.random = mulberry32((def.seed ?? 1) ^ 0x5bd1e995);
    let L;
    try { L = generateLevel(def); } finally { Math.random = rnd; }
    this.mode = 'loading-chapter';
    this.pendingMist = def.mist ?? this.chapter?.mist ?? 0;
    this.loadWorld(L, L.biome);
    this.warmupShaders(def.boss);
    this.audio.overrideMusic = null; this.audio.setMusic(L.biome.music);
    this.placePlayers(L.spawn);
    this.minimap.build(L);
    this.hud.mini.classList.remove('hidden');
    this.mission = new Mission(this, def, L);
    this.mission.setup();
    this.mode = 'mission';
    this.online.sceneChanged();
    toast(this.chapter ? this.chapter.title : `${L.biome.name} · ${L.biome.sub}`, 'big');
    if (this.mist.available) setTimeout(() => this.state === 'playing' && this.mode === 'mission' && toast(this.mist.thickness >= 0.9 ? 'The Mist is thick here. Press LT (V) to see through it.' : 'Press LT (V) to see through the Mist.'), 2600);
  }
  completeMission() {
    const m = this.mission; if (!m || m.complete) return;
    m.complete = true;
    const cid = m.def.chapter ?? m.def.id ?? 'custom';
    const ch = this.chapter;
    // net: completing a chapter credits every player on this screen (online, each screen its own)
    const levelled = [];
    for (const sv of this.localSaves()) {
      const d = sv.data;
      d.completed[cid] = Math.max(d.completed[cid] ?? 0, m.def.difficulty);
      if (ch) {
        if (ch.prophecyLine != null) { const pr = (d.prophecy ??= {}); const lines = (pr[ch.book] ??= []); if (!lines.includes(ch.prophecyLine)) { lines.push(ch.prophecyLine); this.newProphecy = ch.book; } }
        for (const [hid, info] of Object.entries(HEROES)) if ((info.unlock === ch.id || (ch.book === 'book1' && info.unlock === 'ch' + ch.num)) && !(d.unlockedHeroes ??= []).includes(hid)) { d.unlockedHeroes.push(hid); if (sv === this.save) setTimeout(() => toast(`${info.full} joins your quest!`, 'big'), 1200); }
      }
      d.stats.missions++; d.stats.kills += m.stats.kills;
      if (sv.addXp(80 * m.def.difficulty)) levelled.push(sv);
      sv.write();
    }
    this.online.completed();
    this.resume.clear();   // net: nothing left to continue in this chapter
    this.audio.levelUp();
    this.showResults(true);
    for (const sv of levelled) this.levelUp(sv);
  }
  showResults(victory) {
    this.audio?.stinger?.(victory ? 'victory' : 'defeat');
    const m = this.mission; const st = m?.stats ?? {};
    this.paused = true;
    this.ui.open('results', (el) => {
      const mins = Math.floor((st.time ?? 0) / 60), secs = Math.floor((st.time ?? 0) % 60);
      el.appendChild(h('div', { class: 'panel', style: 'min-width:min(460px,94vw);text-align:center' },
        h('h2', { style: `font-size:34px;color:${victory ? '#ffd23a' : '#ff5a6a'}` }, victory ? (this.chapter ? 'CHAPTER COMPLETE' : 'QUEST COMPLETE') : 'DEFEATED'),
        this.chapter && victory && this.chapter.outro ? h('p', { class: 'outro' }, this.chapter.outro) : null,
        h('div', { class: 'stat-line' }, 'Monsters defeated', h('b', {}, String(st.kills ?? 0))),
        h('div', { class: 'stat-line' }, 'Time', h('b', {}, `${mins}:${String(secs).padStart(2, '0')}`)),
        h('div', { class: 'stat-line' }, 'Drachmas collected', h('b', {}, String(st.coins ?? 0))),
        h('div', { class: 'stat-line' }, 'Secrets found', h('b', {}, String(st.secrets ?? 0))),
        h('div', { class: 'loot-list', id: 'results-loot' }),
        h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' },
          !victory ? h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { const d = m.def; this.ui.close('results'); this.startMission(d); } }, 'Retry') : null,
          h('button', { class: 'btn' + (victory ? ' primary' : ''), 'data-autofocus': victory, onclick: () => { this.ui.close('results'); this.paused = false; this.returnToHub(); if (this.newProphecy && Screens.openProphecy) { const b = this.newProphecy; this.newProphecy = null; setTimeout(() => { Screens.openProphecy(this, b); this.audio?.stinger?.('prophecy-line'); }, 600); } } }, 'Return to Camp Half-Blood'))));
      const lootEl = el.querySelector('#results-loot');
      for (const it of st.loot ?? []) { const b = itemInfo(it); lootEl.appendChild(h('div', { class: `item ${b.rarity}`, title: b.name }, b.icon, h('span', { class: 'pw' }, String(it.power)))); }
      if (!(st.loot ?? []).length) lootEl.appendChild(h('div', { class: 'hint' }, 'No loot this time.'));
    }, { dim: true });
  }
  returnToHub() {
    // net: online, a guest goes where the host goes
    if (this.online?.isGuest && this.mode !== 'hub') { this.ui.closeAll(); this.paused = false; toast('Waiting for the host to return to camp'); return; }
    this.loadHub(); toast('Camp Half-Blood', 'big');
  }
  openMap() {
    if (!this.minimap.level) return;
    this.paused = true;
    this.ui.open('map', (el) => {
      const cv = h('canvas', { class: 'mapview', width: 640, height: 640 });
      el.appendChild(h('div', { class: 'panel', style: 'text-align:center' }, h('h2', {}, 'Map'), cv, h('div', { class: 'hint' }, '■ objective  ■ chest  ● monster  ■ boss arena  ● exit'), h('button', { class: 'btn', 'data-autofocus': true, onclick: () => { this.ui.close('map'); this.paused = false; } }, 'Close')));
      this.minimap.draw(cv, { full: true });
    }, { dim: true, onBack: () => { this.ui.close('map'); this.paused = false; } });
  }
  addCoins(n, p = null) { this.saveFor(p).data.coins += n; if (this.mission) this.mission.stats.coins += n; }   // net: to whoever picked them up
  addPlayer(device, hero) {
    const i = this.players.length;
    const p = new Player(this, i, device, hero);
    const base = this.players[0]?.pos ?? this.level.spawn;
    p.spawn(base.clone().add(new THREE.Vector3(i ? (i - 1.5) * 1.2 : 0, 0, i ? 1.2 : 0)));
    this.scene.add(p.object);
    this.players.push(p);
    this.hud?.rebuildCards();
    return p;
  }
  spawnEnemy(kind, pos, opts = {}) {
    const cap = this.gr.preset.enemyCap;
    if (this.enemies.filter((e) => !e.dead && !e.isDummy).length >= cap && opts.summoned) return null;
    const e = new Enemy(this, kind, pos, opts);
    this.scene.add(e.object);
    this.enemies.push(e);
    return e;
  }
  spawnWave() {
    this.wave++;
    const kinds = [['pup', 'pup', 'spider', 'spider'], ['pup', 'pup', 'harpy', 'automaton', 'spider'], ['dracaena', 'pup', 'pup', 'harpy', 'fury'], ['empousa', 'dracaena', 'fury', 'automaton', 'harpy', 'hellhound', 'pup']][(this.wave - 1) % 4];
    const c = this.level.dummy;
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * Math.PI * 2 + Math.random();
      const pos = new THREE.Vector3(c.x + Math.cos(a) * 7, c.y, c.z + 4 + Math.sin(a) * 5);
      const gy = this.world.groundBelow(pos.x, pos.z, pos.y + 3); if (!isFinite(gy)) return;
      pos.y = gy;
      const elite = this.wave >= 3 && i === 0 ? ['swift', 'armored', 'vampiric', 'explosive', 'shadow'][this.wave % 5] : null;
      this.spawnEnemy(k, pos, { elite });
      this.fx.summonCircle(pos, 0xb05aff);
    });
    this.audio.energy('summon');
    toast(`Wave ${this.wave}`);
  }
  // per-frame callbacks for technique effects; return false to finish
  addUpdater(fn) { this.updaters.push(fn); }
  startDomain(p, def) { return this.domainSys.start(p, def); }
  hostileTargets() { return this.allies.length ? [...this.players, ...this.allies] : this.players; }
  surfaceAt(pos) { const id = this.world.get(Math.floor(pos.x), Math.floor(pos.y - 0.1), Math.floor(pos.z)); return id ? BLOCKS[id].step : 'stone'; }
  nearestEnemy(pos, range) {
    let best = null, bd = range * range;
    for (const e of this.enemies) { if (e.dead || e.untargetable) continue; const d = e.pos.distanceToSquared(pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  // ---------------------------------------------------------------- feel
  hitStop(s) { if (settings.hitstop) this.hitstop = Math.max(this.hitstop, Math.min(0.2, s)); }
  shake(a) { this.rig.addTrauma(a * settings.shake); }
  slowMo(dur, scale = 0.3) { if (!settings.slowmo) return; this.slowmo = Math.max(this.slowmo, dur); this.slowmoScale = scale; }
  onEnemyKilled(e) {
    this.mission?.onKill(e);
    const k = e.lastAttacker;
    if (k?.isPlayer && k.procs) {
      if (k.procs.leech) k.heal(k.maxHp * 0.02 * k.procs.leech, true);
      if (k.procs.rampage) k.rampageT = 5;
      if (k.procs.explode) { this.combat.aoe(e.pos, 2.6, e.maxHp * 0.2 * k.procs.explode, k, { knock: 6, blocks: false }); this.fx.explosion(e.pos, 0xff8a3a, 2.4); }
    }
    if (!e.isDummy) {
      for (const sv of this.localSaves()) if (sv.addXp(e.def.xp ?? 3)) this.levelUp(sv);   // net: every player's profile
      const [a, b] = e.def.coins ?? [1, 2];
      this.pickups.drop('coin', e.pos, a + Math.floor(Math.random() * (b - a + 1)));
      if (Math.random() < 0.08) this.pickups.drop('heal', e.pos, 1);
      if (Math.random() < 0.12) this.pickups.drop('ce', e.pos, 1);
      this.maybeDropFromMonster(e);
    }
  }
  onBossKilled(b) { this.mission?.onBossKilled(b); for (const sv of this.localSaves()) if (sv.addXp(150)) this.levelUp(sv); }
  levelUp(sv = this.save) {
    const d = sv.data;
    const many = this.localSaves().length > 1;
    toast(`${many ? sv.name + ': ' : ''}LEVEL ${d.level}! +1 enchantment point, +1 skill point`, 'big');
    this.audio.levelUp();
    for (const p of this.players) if (!p.remote && (this.saveFor(p) === sv || p.ai)) { this.fx.heal(p.pos, 0xffd23a); p.hp = p.maxHp; }
    sv.write();
  }
  // Chests and bosses drop a separate item (or two) for every human player.
  onChestOpened(c) {
    this.audio?.sample?.('chest');
    const diff = this.mission?.def.difficulty ?? 1;
    const humans = this.players.filter((q) => !q.ai && !q.remote);
    humans.forEach((q, n) => {
      const items = rollChest(diff, c.boss ? 'boss' : c.rarity, { level: this.saveFor(q).data.level, hero: q.hero });
      items.forEach((it, i) => setTimeout(() => this.loot.drop(it, c.pos, q), 300 + (n * items.length + i) * 260));
    });
    const col = new THREE.Color(c.boss ? 0xff9a2a : c.rarity === 'rare' ? 0x4ad0ff : 0xd8cfbd);
    this.particles.burst(c.pos.clone().setY(c.pos.y + 1), { count: 30, color: col, speed: 3, up: 4, life: 1.2, size: 0.18, gravity: -2, shape: 1 });
    this.lights.flash(c.pos.clone().setY(c.pos.y + 2), col, 8, 8, 1.2);
  }
  // Elites and champions sometimes drop an item for the hero who beat them.
  maybeDropFromMonster(e) {
    const tier = e.def?.tier;
    const chance = e.elite ? 0.18 : tier === 'champion' ? 0.5 : tier === 'elite' ? 0.06 : 0;
    if (!chance || Math.random() > chance || !this.mission) return;
    const k = e.lastAttacker;
    const q = k?.isPlayer && !k.ai && !k.remote ? k : this.players.find((x) => !x.ai && !x.remote);
    if (!q) return;
    this.loot.drop(rollItem(powerFor(this.mission.def.difficulty, this.saveFor(q).data.level), { hero: q.hero }), e.pos, q);
  }
  onPlayerDied(p) {
    if (this.wipeLeft > 0 || !this.players.length || !this.players.every((q) => q.dead || q.downed)) return;
    for (const q of this.players) if (q.downed) { q.downed = false; q.dead = true; q.deadT = 0; }
    this.wipeLeft = 2.5;
    toast('Party defeated — respawning', 'big');
  }
  updateWipe(dt) {
    if (this.wipeLeft <= 0 || (this.paused && !this.online.keepsRunning) || this.state !== 'playing') return;   // net: (online the game runs on)
    this.wipeLeft -= dt;
    if (this.wipeLeft <= 0) { this.placePlayers(this.level.spawn); toast('Revived', 'big'); }
  }

  // Storm biomes: lightning flashes and thunder now and then.
  updateStorm(dt) {
    if (!this.biome?.storm || this.state !== 'playing') return;
    this.stormT = (this.stormT ?? 3) - dt;
    if (this.stormT > 0) return;
    this.stormT = 4 + Math.random() * 7;
    const f = this.rig.focus ?? this.players[0]?.pos;
    if (!f) return;
    const at = new THREE.Vector3(f.x + (Math.random() - 0.5) * 30, f.y + 14, f.z + (Math.random() - 0.5) * 30);
    this.fx.flash(0xd8e8ff, 0.35, 0.18);
    this.lights.flash(at, new THREE.Color(0xc8d8ff), 30, 60, 0.3);
    this.bolts.spawn(at, { count: 3, length: 9, life: 0.25 });
    setTimeout(() => { if (!this.audio?.sample?.('thunder', { gain: 0.5 + Math.random() * 0.4, rate: 0.9 + Math.random() * 0.2 })) this.audio?.impact?.(0.6 + Math.random() * 0.4); }, 300 + Math.random() * 900);
  }
  setReadout(on) { this.readoutOn = on; document.getElementById('readout').classList.toggle('hidden', !on); }
  pause(player = this.players[0]) {
    if (this.paused) return;
    this.paused = true;
    Screens.openPauseMenu(this, player);
  }
  resume() { this.ui.close('pause'); this.paused = false; this.last = performance.now(); }

  // Drop-in co-op: an unassigned controller pressing Start/A joins.
  checkJoin() {
    if (isMobile || this.players.filter((p) => !p.ai).length >= 4) return;
    for (const pad of this.input.pads()) {
      const id = 'pad' + pad.index;
      if (this.players.some((p) => p.device === id)) continue;
      if (pad.buttons[9]?.pressed || pad.buttons[0]?.pressed) {
        // a lone keyboard P1 who has been idle hands control to the controller instead
        const p0 = this.players[0];
        if (this.players.filter((q) => !q.ai).length === 1 && p0.device === 'kbm' && performance.now() - (this.input.kbmActivity ?? 0) > 8000) {
          p0.device = id; toast('Controller connected to Player 1'); continue;
        }
        // a companion is waiting: the new player takes it over
        if (!this.profiles.devices.has(id)) this.profiles.assign(id, this.profiles.slotDefault(this.players.filter((q) => !q.ai && !q.remote).length).id);   // net: their profile
        const taken = this.party && this.partyMgr.takeOver(id);
        if (taken) { this.fx.summonCircle(taken.pos, 0x6ad8ff); toast(`Player ${this.players.filter((q) => !q.ai).length} joined as ${this.heroName(taken)}`); this.audio.ui('buy'); if (!this.players.some((q) => q.ai)) this.party = null; continue; }
        // the keyboard player keeps P1; if P1 is idle on keyboard and this is the only pad, still add
        const used = new Set(this.players.map((p) => p.hero));
        const pick = HERO_IDS.find((s) => !used.has(s)) ?? 'percy';
        const p = this.addPlayer(id, pick);
        this.fx.summonCircle(p.pos, 0x6ad8ff);
        toast(`Player ${p.index + 1} joined`);
        this.partyMgr.fill();   // net: two humans keep one companion, three or more none
        this.audio.ui('buy');
      }
    }
  }
  updateInteract(dt) {
    const nearDevices = new Set();     // controllers with a prompt up: X interacts instead of attacking
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      let near = null;
      for (const p of this.players) if (!p.ai && !p.dead && !p.downed && p.pos.distanceTo(it.pos) < it.radius) near = p;
      if (!near) { it.progress = 0; it.touchHold = false; continue; }
      nearDevices.add(near.device);
      const key = near.device === 'kbm' ? 'E' : near.device === 'touch' ? '👆' : 'X';
      const inp = this.input.get(near.device);
      if (it.hold) {
        const holding = inp.held.interact || it.touchHold;
        if (holding && !it.progress) it.onHoldStart?.();
        it.progress = holding ? (it.progress ?? 0) + dt / it.hold : Math.max(0, (it.progress ?? 0) - dt);
        const bar = '▮'.repeat(Math.round((it.progress ?? 0) * 8)).padEnd(8, '▯');
        this.hud.prompt(it.id, it.pos.clone().setY(it.pos.y + 2.4), `${key}  ${it.label}  ${it.progress > 0 ? bar : '(hold)'}`, () => { it.touchHold = true; });
        if (it.progress >= 1) { it.progress = 0; it.touchHold = false; it.action(near); }
      } else {
        this.hud.prompt(it.id, it.pos.clone().setY(it.pos.y + 2.2), `${key}  ${it.label}`, () => it.action(near));
        if (inp.pressed.interact) it.action(near);
      }
    }
    this.input.nearInteract = nearDevices;
  }

  frame() {
    const now = performance.now();
    const realDt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.input.poll();
    this.online.frameStart?.(realDt);
    this.resume?.update(realDt);   // net: checkpoints for Continue (written from a timer, never here)   // net: online menus don't stop the game; this screen's heroes stand still
    const gr = this.gr;
    gr.trackFps(realDt, now / 1000);
    const playing = this.state === 'playing';
    const pausePlayer = playing && this.players.find((p) => this.input.get(p.device).pressed.pause);
    const invP = playing && !this.ui.stack.length && this.players.find((p) => this.input.get(p.device).pressed.inv);
    if (invP) openInventory(this, invP);
    const anyMap = playing && this.players.some((p) => this.input.get(p.device).pressed.map);
    if (this.ui.stack.length) { this.ui.update(); if (anyMap && this.ui.isOpen('map')) { this.ui.close('map'); this.paused = false; } }
    else if (pausePlayer && !this.minigame?.el) this.pause(pausePlayer);
    else if (anyMap) this.openMap();
    if (playing && !this.ui.stack.length && !this.paused) {
      const handled = new Set();     // a switch hands the device to another hero: act once per device
      for (const p of [...this.players]) {
        if (p.ai || handled.has(p.device)) continue;
        handled.add(p.device);
        const ip = this.input.get(p.device);
        if (ip.pressed.sight) this.mist.toggle(p);
        if (ip.pressed.swap) this.partyMgr.switchFrom(p);
      }
    }
    let dt = realDt;
    const halt = this.paused && !this.online.keepsRunning;   // net: online, pausing never freezes the others
    if (halt) dt = 0;
    else if (this.hitstop > 0) { this.hitstop -= realDt; dt = 0; }
    else if (this.slowmo > 0) { this.slowmo -= realDt; dt *= this.slowmoScale; }
    this.updateWipe(realDt);
    this.time += dt;
    U.time.value = this.time;
    // Battle Sense: monsters (and their attacks) run slow, heroes don't
    if (this.battleSenseT > 0 && !halt) this.battleSenseT -= realDt;
    const edt = this.battleSenseT > 0 ? dt * 0.3 : dt;
    if (!halt) {
      if (playing) this.checkJoin();
      if (playing) this.partyMgr.update(dt);
      this.mist.update(dt);
      this.updateStorm(dt);
      const z = this.input.takeZoom(); if (z) this.rig.zoom(z * 1.6);
      const p0 = this.players[0];
      if (settings.cameraRotate && p0) { const ip = this.input.get(p0.device); if (ip.pressed.rotL) this.rig.rotate(-1); if (ip.pressed.rotR) this.rig.rotate(1); }
      for (const p of this.players) p.update(dt);
      for (let i = this.allies.length - 1; i >= 0; i--) if (!this.allies[i].update(dt)) this.allies.splice(i, 1);
      for (const r of this.selectRigs ?? []) { r.root.rotation.y += realDt * 0.8; r.animate({ dt: realDt, speed: 0, vel: new THREE.Vector3() }); }
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (!e.update(edt)) { this.scene.remove(e.object); this.enemies.splice(i, 1); }
      }
      for (let i = this.updaters.length - 1; i >= 0; i--) if (this.updaters[i](dt, realDt) === false) this.updaters.splice(i, 1);
      this.projectiles.update(edt);
      this.hazards.update(edt);
      this.updateInteract(dt);
      this.pickups.update(dt);
      this.loot.update(dt);
      this.mission?.update(dt);
      this.online.update(realDt);
    }
    this.domainSys.update(dt, this.paused ? 0 : realDt);
    if (this.trenchFade > 0) { this.trenchFade -= dt; Trench.glow.value = Math.min(1.4, this.trenchFade / 6); }
    Grade.dofAmount.value += (this.targetDof - Grade.dofAmount.value) * Math.min(1, realDt * 4);
    this.markers.update(edt);
    this.debris.update(dt);
    this.bolts.update(realDt);
    // camera + world
    // the camera follows the heroes people play; AI companions are kept up by
    // the party, they don't pull or zoom the view (falls back to everyone)
    const humans = this.players.filter((p) => !p.remote && !p.ai && !p.dead);
    const local = humans.length ? humans : this.players.filter((p) => !p.remote);
    this.rig.update(dt, local.length ? local : [this.idleFocus ?? (this.idleFocus = { pos: new THREE.Vector3(19, 6, 24), vel: new THREE.Vector3(), aimDir: new THREE.Vector3(), dead: false })], realDt);
    U.camPos.value.copy(this.rig.camera.position);
    for (let i = 0; i < 4; i++) {
      const pl = this.players[i];
      if (pl && !pl.dead) U.players.array[i].set(pl.pos.x, pl.pos.y, pl.pos.z, 1); else U.players.array[i].set(0, -999, 0, 0);
    }
    this.lights.update(dt, this.rig.focus);
    this.world.updateRoofs(this.players, realDt);
    this.world.flush(2);
    this.env.update(realDt);
    if (!this.paused) this.fx.ambient(dt, this.biome.particles, this.rig.focus);
    this.fx.update(dt, realDt);
    this.particles.upload();
    this.hud.update(realDt);
    if (this.minimap.level && (this.frameN = (this.frameN ?? 0) + 1) % 3 === 0) this.minimap.draw(this.hud.mini);
    gr.render();
    if (this.readoutOn) this.updateReadout();
  }
  updateReadout() {
    this.readoutT = (this.readoutT ?? 0) + 1;
    if (this.readoutT % 15) return;
    const gr = this.gr;
    const info = gr.renderer.info;
    const dummy = this.enemies.find((e) => e.isDummy);
    document.getElementById('readout').textContent =
      `${QUALITY_LABEL[gr.quality]} · ${gr.backend}\n${gr.fps.toFixed(0)} FPS · ${(gr.pixelRatio).toFixed(2)}x res` +
      `\n${info.render.drawCalls ?? info.render.calls ?? 0} draws · ${this.lights.pool.length} lights` + (dummy && dummy.dps > 0 ? `\nDummy DPS ${dummy.dps.toFixed(0)}` : '');
  }
}

const game = new Game();
window.__game = game;
game.boot().catch((e) => {
  console.error(e);
  loadText.textContent = 'Failed to start: ' + (e.message || e) + ' — your browser needs WebGPU or WebGL2.';
});

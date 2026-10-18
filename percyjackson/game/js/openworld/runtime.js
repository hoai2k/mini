// The open world, alive (world/openworld.js builds it): which region you are
// in (its name comes up, the sky and sound blend to its look), waystones you
// find and travel between, monster camps that wake when you come near and
// leave a chest when cleared, champions with names, shrine trials, treasure
// chests, and the people and side quests (openworld/quests.js).
//
// What a save has found and done lives in save.data.ow:
//   ways    { waystoneId: true }          found waystones
//   chests  { chestId: true }             opened chests
//   camps   { campId: time }              when each camp was last cleared
//   champs  { championId: time }          when each champion last fell
//   shrines { shrineId: time }            when each trial was last won
//   seen    { regionId: true }            regions visited (the map shows them)
//   quests  { questId: { step, n, done } } side quests (openworld/quests.js)
// Camps, champions and shrines come back after a while (RESPAWN, real
// seconds), so there
// is always something to fight; chests stay opened.
import * as THREE from 'three/webgpu';
import { OW_LAYOUT, owDifficulty } from '../world/owLayout.js';
import { BIOMES } from '../world/biomes.js';
import { toast } from '../ui/ui.js';
import { t } from '../text_config.js';
import { Quests } from './quests.js';
import { openWorldMap } from '../ui/worldMap.js';
import { bundlesFrom } from '../resources.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const RESPAWN = { camp: 8 * 60, champion: 15 * 60, shrine: 6 * 60 };   // seconds of play
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const now = () => Date.now() / 1000;

export class OpenWorld {
  constructor(game, L) {
    this.game = game; this.L = L; this.reg = L.ow; this.lay = L.layout ?? OW_LAYOUT;
    this.region = null; this.props = []; this.campState = new Map(); this.champState = new Map();
    this.trial = null; this.checkT = 0;
    this.quests = new Quests(game, this);
  }
  get data() {
    const d = this.game.save.data;
    d.ow ??= {};
    for (const k of ['ways', 'chests', 'camps', 'champs', 'shrines', 'seen', 'quests']) d.ow[k] ??= {};
    return d.ow;
  }
  // ---------------------------------------------------------------- setup
  setup() {
    const g = this.game, d = this.data;
    d.ways.camp = true;
    for (const w of this.reg.waystones) {
      g.interactables.push({ id: 'way-' + w.id, pos: w.pos, radius: 2.6, label: t('ow.waystoneUse'), action: () => openWorldMap(g, { at: w }) });
    }
    for (const c of this.reg.chests) this.makeChest(c);
    for (const s of this.reg.shrines) {
      this.makeShrine(s);
      g.interactables.push({ id: 'shrine-' + s.id, pos: s.pos, radius: 2.8, label: t('ow.shrine.start'), action: () => this.startTrial(s), enabled: () => !this.trial && !this.shrineResting(s) && !g.online?.isGuest });
    }
    this.quests.setup();
  }
  dispose() {
    const g = this.game;
    for (const o of this.props) { g.scene.remove(o); g.releaseLater?.(o); }
    this.props = [];
    this.quests.dispose();
  }
  addProp(o) { this.game.scene.add(o); this.props.push(o); return o; }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game;
    if (g.mode !== 'hub' || g.state !== 'playing' || g.cutscene) return;
    const lead = g.players.find((p) => !p.ai && !p.remote && !p.dead) ?? g.players[0];
    if (!lead) return;
    this.checkT -= dt;
    if (this.checkT <= 0) {
      this.checkT = 0.25;
      this.updateRegion(lead);
      this.discover();
      if (!g.online?.isGuest) { this.wakeCamps(); this.wakeChampions(); }
    }
    if (this.trial) this.updateTrial(dt);
    this.quests.update(dt);
  }
  // Entering a region: its name (and monster levels) come up; the sky blends to its look.
  updateRegion(p) {
    const g = this.game, r = this.lay.regionAt(p.pos.x, p.pos.z);
    if (!r || r === this.region) return;
    const first = !this.region;
    this.region = r;
    const b = BIOMES[r.biome] ?? BIOMES.camp;
    g.env.set(b, first);
    g.audio?.setAmbience?.(b.ambience);
    U_wind(g, b.wind);
    if (!first || !this.data.seen[r.id]) {
      toast(t(`regions.${r.id}.name`) + (r.safe ? '' : ' · ' + t('regions.levels', { a: r.level[0], b: r.level[1] })), 'title');
    }
    if (!this.data.seen[r.id]) { this.data.seen[r.id] = true; g.save.write?.(); }
  }
  // Waystones are found by walking up to them.
  discover() {
    const g = this.game, d = this.data;
    for (const w of this.reg.waystones) {
      if (d.ways[w.id]) continue;
      if (!g.players.some((p) => !p.ai && !p.remote && p.pos.distanceTo(w.pos) < 7)) continue;
      d.ways[w.id] = true; g.save.write?.();
      toast(t('ow.waystoneFound', { name: w.name }), 'big');
      g.audio?.levelUp?.();
      g.fx.heal(w.stone, 0xffd84a);
      g.lights.flash(w.stone, 0xffd890, 8, 10, 1);
    }
  }
  // ---------------------------------------------------------------- travel
  // Move this browser's heroes (and the AI companions) to a waystone.
  travel(w) {
    const g = this.game;
    const near = g.enemies.some((e) => !e.dead && !e.isDummy && e.aggro && g.players.some((p) => !p.remote && p.pos.distanceTo(e.pos) < 18));
    if (near) { toast(t('ow.notWithMonsters')); return false; }
    toast(t('ow.teleporting', { name: w.name }));
    g.fx.flash(0xfff0c0, 0.8, 0.5);
    g.audio?.energy?.('blink');
    g.world.prime(w.pos);
    const mine = g.players.filter((p) => !p.remote);
    mine.forEach((p, i) => {
      const at = w.pos.clone().add(V((i % 2) * 1.4 - 0.7 * (i > 0), 0, Math.floor(i / 2) * 1.4 + 0.6));
      const y = g.world.groundBelow(at.x, at.z, at.y + 3); if (isFinite(y)) at.y = y;
      p.spawn(at); p.knock?.set(0, 0, 0); p.iframes = 1.5;
      g.fx.summonCircle(at, 0xffd84a);
    });
    g.rig.snap(w.pos);
    this.region = null; this.checkT = 0;
    return true;
  }
  // ---------------------------------------------------------------- chests
  makeChest(c) {
    // after the kit sheet (vox-ow-props): plain wood with iron corners, blue with
    // silver, purple with gold; a domed lid on a hinge at the back (c.lid), drachmas
    // heaped inside, and a spill of coins (and gems) in front once it is open
    const g = this.game, opened = !!this.data.chests[c.id];
    const look = CHEST_LOOK[c.rarity] ?? CHEST_LOOK.common;
    const grp = new THREE.Group(); grp.position.copy(c.pos);
    const body = kitModel([
      [look.wood, [[1.0, 0.62, 0.72, 0, 0.31, 0]]],
      [look.seam, [[1.02, 0.05, 0.74, 0, 0.21, 0], [1.02, 0.05, 0.74, 0, 0.42, 0]]],
      [look.metal, [[0.13, 0.7, 0.13, -0.5, 0.35, -0.34], [0.13, 0.7, 0.13, 0.5, 0.35, -0.34], [0.13, 0.7, 0.13, -0.5, 0.35, 0.34], [0.13, 0.7, 0.13, 0.5, 0.35, 0.34],
        [1.1, 0.08, 0.84, 0, 0.66, 0], [1.1, 0.07, 0.84, 0, 0.035, 0], [0.1, 0.62, 0.04, -0.27, 0.31, 0.37], [0.1, 0.62, 0.04, 0.27, 0.31, 0.37], [0.24, 0.26, 0.06, 0, 0.5, 0.38]]],
      [look.dark, [[0.06, 0.1, 0.02, 0, 0.47, 0.415]]],
      [CHEST_MAT.gold, [[0.9, 0.06, 0.62, 0, 0.64, 0], [0.16, 0.05, 0.16, -0.2, 0.68, 0.1], [0.16, 0.05, 0.16, 0.15, 0.685, -0.12], [0.16, 0.05, 0.16, 0.3, 0.68, 0.14]]],
      ...(look.gem ? [[look.gem, [[0.12, 0.12, 0.12, -0.05, 0.7, -0.05], [0.1, 0.1, 0.1, 0.32, 0.69, -0.18]]]] : []),
    ]);
    const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.42);
    lid.add(kitModel([
      [look.wood, [[1.1, 0.2, 0.84, 0, 0.1, 0.42], [0.96, 0.12, 0.64, 0, 0.26, 0.42]]],
      [look.metal, [[0.13, 0.36, 0.88, -0.5, 0.15, 0.42], [0.13, 0.36, 0.88, 0.5, 0.15, 0.42], [0.1, 0.36, 0.88, -0.27, 0.16, 0.42], [0.1, 0.36, 0.88, 0.27, 0.16, 0.42],
        [1.12, 0.05, 0.05, 0, 0.025, 0.85], [0.16, 0.18, 0.05, 0, 0.0, 0.86]]],
    ]));
    // the spill in front: shown while the lid stands open (openChest and resume only turn the lid)
    const coins = [], gems = [];
    for (let i = 0; i < look.spill; i++) { const a = i * 2.39996, r = 0.25 + (i % 5) * 0.12; coins.push([0.15, 0.04 + (i % 3) * 0.04, 0.15, Math.cos(a) * r * 1.4, 0.03 + (i % 3) * 0.02, 0.62 + Math.abs(Math.sin(a)) * r]); }
    if (look.gem) for (let i = 0; i < 3; i++) gems.push([0.12, 0.12, 0.12, -0.45 + i * 0.42, 0.06, 0.75 + (i % 2) * 0.2]);
    const spill = kitModel([[CHEST_MAT.gold, coins], ...(gems.length ? [[look.gem, gems]] : [])], false);
    lid.rotation._onChange(() => { lid.quaternion.setFromEuler(lid.rotation, false); spill.visible = lid.rotation.x < -0.8; });
    grp.add(body, lid, spill); grp.rotation.y = c.rot ?? ((c.x * 7 + c.z * 13) % 6);
    lid.rotation.x = opened ? -1.9 : 0;
    this.addProp(grp);
    c.object = grp; c.lid = lid; c.opened = opened; c.difficulty = owDifficulty(this.lay.levelAt(this.lay.REGION[c.region], c.pos.x, c.pos.z, 0.6));
    g.interactables.push({ id: 'owchest-' + c.id, pos: c.pos, radius: 2, label: t('ow.chest.open'), action: (p) => this.openChest(c, p), enabled: () => !c.opened });
  }
  openChest(c, p) {
    if (c.opened) return; c.opened = true;
    const g = this.game;
    if (c.id) { this.data.chests[c.id] = true; g.save.write?.(); }
    g.audio?.loot?.(c.rarity === 'common' ? 'common' : 'rare');
    let k = 0; g.addUpdater((dt) => { k += dt; c.lid.rotation.x = -Math.min(1.9, k * 6); return k < 0.4; });
    g.pickups.drop('coin', c.pos, 8 + Math.floor(Math.random() * 8) + (c.rarity === 'common' ? 0 : c.rarity === 'rare' ? 14 : 30), 1);
    if (Math.random() < 0.6) g.pickups.drop('heal', c.pos, 1);
    const nb = bundlesFrom(c.rarity === 'common' ? 'chest' : 'rareChest'); if (nb) g.pickups.drop('arrows', c.pos, nb);
    g.onChestOpened?.({ ...c, rarity: c.rarity === 'epic' ? 'rare' : c.rarity, boss: c.rarity === 'epic' }, p);
    toast(t('ow.chest.found'));
    this.quests.onEvent({ type: 'chest', id: c.id });
  }
  // a chest that appears where a camp was cleared (not saved: it comes back with the camp)
  dropChest(pos, rarity, region) {
    const c = { id: null, x: Math.floor(pos.x), z: Math.floor(pos.z), pos: pos.clone(), rarity, region };
    this.makeChest(c);
    this.game.fx.summonCircle(c.pos, 0xffd84a);
    return c;
  }
  // ---------------------------------------------------------------- monster camps
  wakeCamps() {
    const g = this.game, d = this.data;
    for (const c of this.reg.camps) {
      const st = this.campState.get(c.id);
      const near = g.players.some((p) => !p.dead && p.pos.distanceTo(c.pos) < c.radius + 20);
      if (!st) {
        if (!near) continue;
        if (d.camps[c.id] && now() - d.camps[c.id] < RESPAWN.camp) continue;
        this.spawnCamp(c);
      } else if (st.live && !st.cleared) {
        st.list = st.list.filter((e) => g.enemies.includes(e));
        if (st.list.every((e) => e.dead)) {
          st.cleared = true; d.camps[c.id] = now(); g.save.write?.();
          toast(t('ow.camp.cleared'), 'big');
          this.dropChest(c.pos.clone(), c.chest ?? 'common', c.region);
          this.quests.onEvent({ type: 'camp', id: c.id });
        } else if (!near && st.list.every((e) => !e.aggro)) {   // walked away: the camp packs up and comes back later
          for (const e of st.list) this.removeEnemy(e);
          this.campState.delete(c.id);
        }
      }
    }
  }
  spawnCamp(c) {
    const g = this.game, r = this.lay.REGION[c.region];
    const kinds = c.kinds?.length ? c.kinds : (r.kinds ?? [['pup', 1]]).map((k) => k[0]);
    const list = [];
    for (let i = 0; i < (c.count ?? 5); i++) {
      const a = (i / (c.count ?? 5)) * Math.PI * 2 + Math.random() * 0.6, rr = 2 + Math.random() * (c.radius * 0.5);
      const x = c.pos.x + Math.cos(a) * rr, z = c.pos.z + Math.sin(a) * rr;
      const y = g.world.groundBelow(x, z, c.pos.y + 4); if (!isFinite(y) || Math.abs(y - c.pos.y) > 3) continue;
      const level = c.level ?? this.lay.levelAt(r, x, z, Math.random());
      const elite = i === 0 && level >= 5 ? ['swift', 'armored', 'vampiric', 'shadow'][Math.floor(Math.random() * 4)] : null;
      const e = g.spawnEnemy(kinds[i % kinds.length], V(x, y, z), { level, elite });
      if (!e) continue;
      e.owCamp = c.id; e.spawnT = 0.4;
      list.push(e);
    }
    this.campState.set(c.id, { live: true, cleared: false, list });
    if (list.length) toast(t('ow.camp.ambush'));
  }
  removeEnemy(e) {
    const g = this.game;
    e.dead = true; e.deathT = 99; g.scene.remove(e.object);
    const i = g.enemies.indexOf(e); if (i >= 0) g.enemies.splice(i, 1);
  }
  // ---------------------------------------------------------------- champions
  wakeChampions() {
    const g = this.game, d = this.data;
    for (const c of this.reg.champions) {
      const st = this.champState.get(c.id);
      const near = g.players.some((p) => !p.dead && p.pos.distanceTo(c.pos) < 34);
      if (!st) {
        if (!near || (d.champs[c.id] && now() - d.champs[c.id] < RESPAWN.champion)) continue;
        const r = this.lay.REGION[c.region], level = (c.level ?? r.level[1]) + 1;
        const e = g.spawnEnemy(c.kind, c.pos.clone(), { level, elite: c.elite ?? 'armored' });
        if (!e) continue;
        e.champion = true; e.owChampion = c.id; e.maxHp *= 3; e.hp = e.maxHp; e.displayName = c.name;
        e.object.scale.multiplyScalar(1.25);
        this.champState.set(c.id, { e });
        toast(t('ow.champion.appears', { name: c.name }), 'big');
        g.hud?.setBoss?.(e);
      } else if (st.e.dead && !st.done) {
        st.done = true; d.champs[c.id] = now(); g.save.write?.();
        toast(t('ow.champion.defeated', { name: c.name }), 'big');
        g.hud?.setBoss?.(null);
        this.dropChest(st.e.pos.clone(), 'epic', c.region);
        this.quests.onEvent({ type: 'champion', id: c.id });
      } else if (!st.e.dead && !near && !st.e.aggro) {
        this.removeEnemy(st.e); this.champState.delete(c.id); g.hud?.setBoss?.(null);
      } else if (st.done && !near) this.champState.delete(c.id);
    }
  }
  // ---------------------------------------------------------------- shrines
  makeShrine(s) {
    // after the kit sheet (vox-ow-props): a little temple facing south (s.rot turns it):
    // two steps, columns, a gabled roof, the god's colour and emblem on the back wall
    // and in the pediment, an altar with a gold flame (s.flame) and a brazier either side
    const god = SHRINE_LOOK[s.god] ?? SHRINE_LOOK[Object.keys(SHRINE_LOOK).find((k) => s.id?.includes(k))] ?? SHRINE_LOOK[SHRINE_OF[s.region]] ?? SHRINE_LOOK.none;
    const grp = new THREE.Group(); grp.position.copy(s.pos); grp.rotation.y = s.rot ?? 0;
    const M = SHRINE_MAT, panel = kitMat(god.panel, 0.8), roof = kitMat(god.roof, 0.7), mark = kitMat(god.mark, 0.35, 0.3, god.mark, 0.55);
    const stone = [[2.8, 0.22, 2.3, 0, 0.11, 0], [2.4, 0.22, 1.9, 0, 0.33, -0.08]];
    const wall = [[2.0, 1.9, 0.32, 0, 1.39, -0.72]];
    const white = [], roofs = [], panels = [[1.36, 1.5, 0.04, 0, 1.36, -0.545]];
    for (const x of [-0.98, 0.98]) for (const z of [0.5, -0.72]) {
      white.push([0.34, 1.92, 0.34, x, 1.4, z], [0.46, 0.12, 0.46, x, 2.42, z], [0.46, 0.1, 0.46, x, 0.49, z]);
    }
    white.push([2.6, 0.24, 1.75, 0, 2.6, -0.1]);                                   // the architrave
    for (let i = 0; i < 4; i++) roofs.push([2.8 - i * 0.66, 0.2, 1.95, 0, 2.82 + i * 0.2, -0.1]);
    for (let i = 0; i < 3; i++) panels.push([2.1 - i * 0.66, 0.2, 0.04, 0, 2.82 + i * 0.2, 0.88]);   // the pediment's face
    const altar = [[0.66, 0.5, 0.5, 0, 0.69, 0.2], [0.8, 0.1, 0.62, 0, 0.99, 0.2]];
    const bowls = [], posts = [];
    for (const x of [-1.32, 1.32]) { posts.push([0.24, 0.62, 0.24, x, 0.75, 0.95]); bowls.push([0.42, 0.14, 0.42, x, 1.12, 0.95]); }
    const marks = emblemBoxes(god.emblem, 0.17, 0, 1.36, -0.51).concat(emblemBoxes(god.emblem, 0.075, 0, 3.0, 0.91));
    const plants = god.plant ? [[0.08, 0.7, 0.08, -1.22, 0.79, -0.3], [0.08, 0.55, 0.08, -1.3, 0.72, -0.15], [0.08, 0.7, 0.08, 1.22, 0.79, -0.3], [0.08, 0.55, 0.08, 1.3, 0.72, -0.15]] : [];
    grp.add(kitModel([[M.stone, stone], [M.brick, wall], [M.marble, white.concat(altar)], [roof, roofs], [panel, panels], [mark, marks], [M.bronze, posts.concat(bowls)], ...(plants.length ? [[kitMat(god.plant, 0.6, 0, god.plant, 0.25), plants]] : [])]));
    const flame = new THREE.Mesh(KIT_BOX, M.gold); flame.scale.set(0.3, 0.34, 0.3); flame.position.set(0, 1.22, 0.2);
    const tip = new THREE.Mesh(KIT_BOX, M.gold); tip.scale.set(0.16, 0.22, 0.16); tip.position.set(0.03, 1.46, 0.22);
    grp.add(flame, tip, kitModel([[M.fire, [[0.24, 0.26, 0.24, -1.32, 1.3, 0.95], [0.24, 0.26, 0.24, 1.32, 1.3, 0.95], [0.12, 0.2, 0.12, -1.3, 1.48, 0.95], [0.12, 0.2, 0.12, 1.34, 1.48, 0.95]]]], false));
    this.addProp(grp);
    s.flame = flame;
  }
  shrineResting(s) { const d = this.data; return d.shrines[s.id] && now(this.game) - d.shrines[s.id] < RESPAWN.shrine; }
  startTrial(s) {
    const g = this.game;
    if (this.trial || this.shrineResting(s)) { toast(t('ow.shrine.rest')); return; }
    const r = this.lay.REGION[s.region], kinds = (r.kinds ?? [['pup', 1]]).map((k) => k[0]);
    const waves = s.waves ?? [[kinds[0], kinds[0], kinds[1] ?? kinds[0]], [kinds[1] ?? kinds[0], kinds[2] ?? kinds[0], kinds[0], kinds[1] ?? kinds[0]], [kinds[2] ?? kinds[0], kinds[3] ?? kinds[1] ?? kinds[0], kinds[0], kinds[1] ?? kinds[0], kinds[2] ?? kinds[0]]];
    this.trial = { s, waves, wave: -1, list: [], t: 1.2 };
    toast(t('ow.shrine.begin', { name: s.name }), 'big');
    g.fx.summonCircle(s.pos, 0xffd84a);
  }
  updateTrial(dt) {
    const g = this.game, T = this.trial, s = T.s;
    // everyone ran off or fell: the trial is lost
    if (!g.players.some((p) => !p.dead && p.pos.distanceTo(s.pos) < 32)) { toast(t('ow.shrine.failed')); for (const e of T.list) if (!e.dead) this.removeEnemy(e); this.trial = null; return; }
    T.list = T.list.filter((e) => g.enemies.includes(e));
    if (T.list.some((e) => !e.dead)) return;
    T.t -= dt; if (T.t > 0) return;
    T.wave++;
    if (T.wave >= T.waves.length) {
      this.data.shrines[s.id] = now(); g.save.write?.();
      toast(t('ow.shrine.won'), 'big');
      g.audio?.levelUp?.();
      this.dropChest(s.pos.clone().add(V(0, 0, 2.2)), T.waves.length >= 4 ? 'epic' : 'rare', s.region);
      for (const sv of g.localSaves()) if (sv.addXp(40 * (this.lay.REGION[s.region].level[1]))) g.levelUp(sv);
      this.quests.onEvent({ type: 'shrine', id: s.id });
      this.trial = null; return;
    }
    toast(t('ow.shrine.wave', { n: T.wave + 1, total: T.waves.length }));
    const r = this.lay.REGION[s.region];
    T.waves[T.wave].forEach((kind, i) => {
      const a = (i / T.waves[T.wave].length) * Math.PI * 2 + Math.random();
      const x = s.pos.x + Math.cos(a) * 7, z = s.pos.z + Math.sin(a) * 7;
      const y = g.world.groundBelow(x, z, s.pos.y + 4); if (!isFinite(y)) return;
      const e = g.spawnEnemy(kind, V(x, y, z), { level: r.level[1], elite: T.wave === T.waves.length - 1 && i === 0 ? 'armored' : null });
      if (!e) return; e.aggro = true; e.spawnT = 0.5; T.list.push(e);
      g.fx.summonCircle(e.pos, 0xffb030);
    });
    T.t = 1.5;
  }
  // ---------------------------------------------------------------- events
  onKill(e) { this.quests.onEvent({ type: 'kill', kind: e.kind, region: this.lay.regionAt(e.pos.x, e.pos.z)?.id, champion: e.owChampion ?? null }); }
}
function U_wind(g, w) { try { g.setWind?.(w); } catch { /* optional */ } }

// ---------------------------------------------------------------- the kit's models (chests, shrines)
// Box-built props after vox-ow-props, one merged mesh per material.
const KIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const KIT_MATS = new Map();
function kitMat(color, rough = 0.7, metal = 0, emissive = 0, glow = 0) {
  const key = `${color}/${rough}/${metal}/${emissive}/${glow}`;
  let m = KIT_MATS.get(key);
  if (!m) { m = new THREE.MeshStandardNodeMaterial({ color, roughness: rough, metalness: metal }); if (glow) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = glow; } KIT_MATS.set(key, m); }
  return m;
}
// parts: [[material, [[w, h, d, x, y, z], ...]], ...] → a group of merged meshes
function kitModel(parts, shadow = true) {
  const grp = new THREE.Group();
  for (const [mat, boxes] of parts) {
    if (!boxes.length) continue;
    const geos = boxes.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z));
    const geo = mergeGeometries(geos, false); for (const q of geos) q.dispose();
    const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true;
    grp.add(m);
  }
  return grp;
}
// a pixel emblem (rows of '#') as boxes of size px, centred on (x, y) in the plane z
function emblemBoxes(rows, px, x, y, z) {
  if (!rows) return [];
  const out = [], h = rows.length, w = rows[0].length;
  rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] === '#') out.push([px, px, px * 0.6, x + (i - (w - 1) / 2) * px, y + ((h - 1) / 2 - j) * px, z]); });
  return out;
}
const CHEST_MAT = { gold: kitMat(0xf2c23a, 0.3, 0.85, 0x8a5a10, 0.35) };
const CHEST_LOOK = {
  common: { wood: kitMat(0x8a5a32, 0.8), seam: kitMat(0x5a381c, 0.85), metal: kitMat(0x70747c, 0.4, 0.7), dark: kitMat(0x1c1a18), spill: 7 },
  rare: { wood: kitMat(0x2c52b0, 0.6), seam: kitMat(0x1c3478, 0.7), metal: kitMat(0xd2d8e2, 0.25, 0.9), dark: kitMat(0x1c1a18), gem: kitMat(0x5ab8ff, 0.2, 0.2, 0x2a7aff, 0.8), spill: 10 },
  epic: { wood: kitMat(0x6e2ea8, 0.6), seam: kitMat(0x4a1a78, 0.7), metal: kitMat(0xf0c040, 0.25, 0.9, 0x6a4a10, 0.2), dark: kitMat(0x1c1a18), gem: kitMat(0xc860ff, 0.2, 0.2, 0x9a2aff, 0.9), spill: 13 },
};
const SHRINE_MAT = {
  stone: kitMat(0xb4aea4, 0.9), brick: kitMat(0xcfc8ba, 0.85), marble: kitMat(0xeee8dc, 0.45), bronze: kitMat(0x9a6a32, 0.4, 0.7),
  gold: kitMat(0xffd060, 0.3, 0.8, 0xffa020, 1.2), fire: kitMat(0xff9a30, 0.6, 0, 0xff7a10, 1.4),
};
// which god each region's shrine belongs to (a shrine may name its own: s.god, or a god in its id)
const SHRINE_OF = { fields: 'demeter', woods: 'artemis', shore: 'poseidon', canyon: 'apollo', labyrinth: 'athena', othrys: 'zeus', asphodel: 'hades' };
const SHRINE_LOOK = {
  demeter: { panel: 0x6e7c3a, roof: 0x5a6878, mark: 0xf2c440, plant: 0xe0b440,
    emblem: ['#.#.#', '#.#.#', '.###.', '#.#.#', '.###.', '..#..', '..#..', '.#.#.'] },
  artemis: { panel: 0x26304e, roof: 0x3a4460, mark: 0xe8f0fa,
    emblem: ['..###', '.##..', '##...', '##...', '##...', '.##..', '..###'] },
  poseidon: { panel: 0x1d6466, roof: 0x24807a, mark: 0x5ae8dc, plant: 0xff7a5a,
    emblem: ['#.#.#', '#.#.#', '#.#.#', '#####', '..#..', '..#..', '..#..', '..#..'] },
  apollo: { panel: 0xc8963a, roof: 0x8a6a3a, mark: 0xffe060, plant: 0xffc020,
    emblem: ['#..#..#', '.#####.', '.#####.', '#######', '.#####.', '.#####.', '#..#..#'] },
  athena: { panel: 0x66708a, roof: 0x48526a, mark: 0xf4f0e6,
    emblem: ['#...#', '#####', '#.#.#', '#####', '.###.', '.###.', '#.#.#'] },
  zeus: { panel: 0xa08c58, roof: 0x34426e, mark: 0xffd84a,
    emblem: ['...##', '..##.', '.##..', '####.', '..##.', '.##..', '.#...', '#....'] },
  hades: { panel: 0x3a2024, roof: 0x2a2226, mark: 0xe8402a, plant: 0x5a1a1a,
    emblem: ['..#..', '.###.', '#####', '#####', '#.#.#', '#.#.#', '#...#'] },
  none: { panel: 0xb8b0a0, roof: 0x6a6460, mark: 0xffd060, emblem: null },
};

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
import { REGIONS, REGION, regionAt, levelAt, owDifficulty } from '../world/owLayout.js';
import { BIOMES } from '../world/biomes.js';
import { toast } from '../ui/ui.js';
import { t } from '../text_config.js';
import { Quests } from './quests.js';
import { openWorldMap } from '../ui/worldMap.js';
import { bundlesFrom } from '../resources.js';

export const RESPAWN = { camp: 8 * 60, champion: 15 * 60, shrine: 6 * 60 };   // seconds of play
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const now = () => Date.now() / 1000;

export class OpenWorld {
  constructor(game, L) {
    this.game = game; this.L = L; this.reg = L.ow;
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
    const g = this.game, r = regionAt(p.pos.x, p.pos.z);
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
    const g = this.game, opened = !!this.data.chests[c.id];
    const grp = new THREE.Group(); grp.position.copy(c.pos);
    const col = c.rarity === 'epic' ? 0x6a2a8a : c.rarity === 'rare' ? 0x2a4a8a : 0x7a5230;
    const wood = new THREE.MeshStandardNodeMaterial({ color: col, roughness: 0.7 });
    const trim = new THREE.MeshStandardNodeMaterial({ color: 0xd8b040, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), wood); body.position.y = 0.35; body.castShadow = true;
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.1, 0.84), trim); band.position.y = 0.55;
    const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.4);
    const lidM = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 0.85), wood); lidM.position.set(0, 0.15, 0.4); lidM.castShadow = true; lid.add(lidM);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.1), trim); lock.position.set(0, 0.6, 0.42);
    grp.add(body, band, lid, lock); grp.rotation.y = c.rot ?? ((c.x * 7 + c.z * 13) % 6);
    if (opened) lid.rotation.x = -1.9;
    this.addProp(grp);
    c.object = grp; c.lid = lid; c.opened = opened; c.difficulty = owDifficulty(levelAt(REGION[c.region], c.pos.x, c.pos.z, 0.6));
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
    const g = this.game, r = REGION[c.region];
    const kinds = c.kinds?.length ? c.kinds : (r.kinds ?? [['pup', 1]]).map((k) => k[0]);
    const list = [];
    for (let i = 0; i < (c.count ?? 5); i++) {
      const a = (i / (c.count ?? 5)) * Math.PI * 2 + Math.random() * 0.6, rr = 2 + Math.random() * (c.radius * 0.5);
      const x = c.pos.x + Math.cos(a) * rr, z = c.pos.z + Math.sin(a) * rr;
      const y = g.world.groundBelow(x, z, c.pos.y + 4); if (!isFinite(y) || Math.abs(y - c.pos.y) > 3) continue;
      const level = c.level ?? levelAt(r, x, z, Math.random());
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
        const r = REGION[c.region], level = (c.level ?? r.level[1]) + 1;
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
    const g = this.game, grp = new THREE.Group(); grp.position.copy(s.pos);
    const stone = new THREE.MeshStandardNodeMaterial({ color: 0xe8e2d4, roughness: 0.6 });
    const gold = new THREE.MeshStandardNodeMaterial({ color: 0xffd060, roughness: 0.3, metalness: 0.8, emissive: 0x8a5a10, emissiveIntensity: 0.6 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), stone); base.position.y = 0.25;
    const altar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), stone); altar.position.y = 0.9;
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), gold); flame.position.y = 1.6;
    for (const m of [base, altar]) { m.castShadow = true; m.receiveShadow = true; }
    grp.add(base, altar, flame);
    this.addProp(grp);
    s.flame = flame;
  }
  shrineResting(s) { const d = this.data; return d.shrines[s.id] && now(this.game) - d.shrines[s.id] < RESPAWN.shrine; }
  startTrial(s) {
    const g = this.game;
    if (this.trial || this.shrineResting(s)) { toast(t('ow.shrine.rest')); return; }
    const r = REGION[s.region], kinds = (r.kinds ?? [['pup', 1]]).map((k) => k[0]);
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
      for (const sv of g.localSaves()) if (sv.addXp(40 * (REGION[s.region].level[1]))) g.levelUp(sv);
      this.quests.onEvent({ type: 'shrine', id: s.id });
      this.trial = null; return;
    }
    toast(t('ow.shrine.wave', { n: T.wave + 1, total: T.waves.length }));
    const r = REGION[s.region];
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
  onKill(e) { this.quests.onEvent({ type: 'kill', kind: e.kind, region: regionAt(e.pos.x, e.pos.z)?.id, champion: e.owChampion ?? null }); }
}
function U_wind(g, w) { try { g.setWind?.(w); } catch { /* optional */ } }

// The resume point: where the party is, so Continue on the title carries on
// where you left off. One per save slot (slots.js). It holds the chapter (its
// definition with the level seed, so the same level is rebuilt), the
// objective's progress, cleared rooms, opened chests and gates, the boss, the
// last checkpoint and the party (heroes, who played them, health).
//
// It is written at checkpoints (entering a room, a room cleared, an objective
// step, a chest or gate opened) and when the page hides or closes, always
// from a timer, never in the middle of a frame. Back in camp there is nothing
// to resume (camp is where the game starts anyway). Online, only the host (or
// a player alone) keeps one; guests just rejoin.
//
// The opening of a new game (story/opening.js) keeps one too: { kind:
// 'opening', step, cp } in the Manhattan prologue (where the party is) and
// in a cutscene (which starts again from its beginning); chapters 1 and 2 of
// the opening are chapter resume points whose def carries `opening`.
import * as THREE from 'three/webgpu';
import { RESUME_KEY } from './slots.js';
import { HEROES } from './heroes/index.js';
import { t } from './text_config.js';

const WRITE_DELAY = 800;
const bits = (list, f) => list.map((x) => (f(x) ? 1 : 0)).join('');
const roomCleared = (r) => r.activated && (r.waveIdx ?? 0) >= (r.waves?.length ?? 0) && !(r.enemies ?? []).some((e) => !e.dead) && !(r.reserve?.length) && (!r.trap || r.trap.done);

export class Resume {
  constructor(game) {
    this.game = game; this.timer = null; this.sig = ''; this.t = 0; this.cp = null; this.play = 0;
    if (typeof window !== 'undefined') {
      const now = () => this.flush();
      window.addEventListener('pagehide', now);
      document.addEventListener('visibilitychange', () => { if (document.hidden) now(); });
    }
  }
  get key() { return (this.game.slots?.prefix() ?? '') + RESUME_KEY; }
  load() {
    try {
      const r = JSON.parse(localStorage.getItem(this.key) || 'null');
      if (r && r.v === 1 && r.kind === 'opening' && typeof r.step === 'string') return r;
      return r && r.v === 1 && r.def && typeof r.def.seed === 'number' ? r : null;
    } catch (e) { return null; }
  }
  clear() { clearTimeout(this.timer); this.timer = null; this.pending = null; try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } }
  // what to keep (null: nothing to resume)
  capture() {
    const g = this.game, m = g.mission;
    // the opening: the prologue (with where the party is) or the cutscene being shown
    if (g.state === 'playing' && !g.online?.isGuest && (g.mode === 'prologue' || (g.mode === 'cutscene' && g.cutscene && !g.cutscene.remote))) {
      const lead = g.players.find((p) => !p.ai && !p.remote) ?? g.players[0];
      const step = g.mode === 'prologue' ? 'prologue' : g.opening?.running ?? g.opening?.step;
      if (!step || step === 'done') return null;
      return { v: 1, t: Date.now(), kind: 'opening', step, title: null, cp: g.mode === 'prologue' && lead ? [lead.safePos?.x ?? lead.pos.x, lead.safePos?.y ?? lead.pos.y, lead.safePos?.z ?? lead.pos.z] : null,
        party: g.players.filter((p) => !p.remote).map((p) => ({ hero: p.hero, human: !p.ai, hp: 1 })) };
    }
    if (g.state !== 'playing' || g.mode !== 'mission' || !m || m.complete || m.failed || g.online?.isGuest || m.remote) return null;
    const def = { ...m.def }; delete def.remote;
    const lead = g.players.find((p) => !p.ai && !p.remote) ?? g.players[0];
    const cp = this.cp ?? (lead ? [lead.safePos.x, lead.safePos.y, lead.safePos.z] : null);
    return {
      v: 1, t: Date.now(), def, chapter: def.chapter ?? null, title: g.chapter?.title ?? null, cp,
      party: g.players.filter((p) => !p.remote).map((p) => ({ hero: p.hero, human: !p.ai, hp: Math.max(0.25, Math.min(1, p.hp / Math.max(1, p.maxHp))) })),
      m: {
        it: bits(m.obj.items, (x) => x.done), ch: bits(m.L.chests, (c) => c.opened), gt: bits(m.L.gates, (gt) => gt.open),
        rc: bits(m.L.rooms, roomCleared), od: m.objDone ? 1 : 0, bs: m.bossSpawned ? 1 : 0,
        // monsters already killed in rooms not yet cleared (the "people" they were stay gone)
        rk: m.L.rooms.map((r) => (r.activated && !roomCleared(r) ? (r.killedBefore ?? 0) + (r.enemies ?? []).filter((e) => e.dead).length : 0)),
        bd: m.boss?.dead ? 1 : 0, bp: m.boss ? [m.boss.home?.x ?? m.boss.pos.x, m.boss.home?.y ?? m.boss.pos.y, m.boss.home?.z ?? m.boss.pos.z] : null,
        x: (() => { try { return m.netState?.() ?? null; } catch (e) { return null; } })(), time: Math.round(m.stats.time ?? 0),
      },
    };
  }
  // every frame (cheap): look for a checkpoint twice a second
  update(dt) {
    const g = this.game;
    if (g.state === 'playing') this.play += dt;
    this.t -= dt; if (this.t > 0) return; this.t = 0.5;
    if (g.state !== 'playing') return;
    if (g.mode === 'hub') { if (this.had) { this.had = false; this.cp = null; this.sig = ''; this.clear(); } if (this.play > 20) this.touchSlot(); return; }
    if (g.mode === 'prologue' || g.mode === 'cutscene') {
      if (g.online?.isGuest) return;
      // a checkpoint every few metres in the prologue; once per cutscene
      const lead = g.players.find((p) => !p.ai && !p.remote && !p.dead);
      const sig = g.mode + ':' + (g.mode === 'prologue' && lead ? Math.round(lead.pos.x / 6) + ',' + Math.round(lead.pos.z / 6) : g.cutscene?.id ?? '');
      if (sig !== this.sig) { this.sig = sig; this.schedule(); }
      return;
    }
    const m = g.mission;
    if (!m || m.remote || g.online?.isGuest) return;
    if (m.complete) { if (this.had) { this.had = false; this.clear(); } return; }
    const lead = g.players.find((p) => !p.ai && !p.remote && !p.dead && !p.downed);
    const roomIdx = lead ? m.L.rooms.findIndex((r) => lead.pos.x >= r.x0 && lead.pos.x <= r.x1 + 1 && lead.pos.z >= r.z0 && lead.pos.z <= r.z1 + 1) : -1;
    const sig = [bits(m.obj.items, (x) => x.done), bits(m.L.chests, (c) => c.opened), bits(m.L.gates, (gt) => gt.open), bits(m.L.rooms, roomCleared), m.objDone ? 1 : 0, m.boss?.dead ? 1 : 0, roomIdx].join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    // a checkpoint is a calm spot: no monster close by
    if (lead && lead.grounded && !g.enemies.some((e) => !e.dead && !e.isDummy && !e.disguised && e.pos.distanceTo(lead.pos) < 12)) this.cp = [lead.safePos.x, lead.safePos.y, lead.safePos.z];
    this.schedule();
  }
  schedule() {
    this.had = true;
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, WRITE_DELAY);
  }
  flush() {
    clearTimeout(this.timer); this.timer = null;
    const r = this.capture();
    if (r) { try { localStorage.setItem(this.key, JSON.stringify(r)); this.had = true; } catch (e) { /* full */ } }
    this.touchSlot();
  }
  touchSlot() {
    const g = this.game, sl = g.slots; if (!sl) return;
    const heroes = g.players.filter((p) => !p.remote).map((p) => p.hero);
    sl.touch(sl.active, { playTime: this.play, chapters: Object.keys(g.save?.data.completed ?? {}).length, heroes: heroes.length ? heroes : null });
    this.play = 0;
  }
  // Continue: the same level from its seed, with its progress put back, and
  // the party at the last checkpoint.
  apply(r) {
    const g = this.game;
    if (r.kind === 'opening') {
      // the prologue from the last checkpoint, or the cutscene from its start
      this.sig = ''; this.had = true;
      g.opening.run(r.step, { cp: r.step === 'prologue' && Array.isArray(r.cp) ? r.cp : null });
      g.toast?.(t('resume.story'), 'big');
      return true;
    }
    g.startMission({ ...r.def });
    const m = g.mission; if (!m) return false;
    const on = (str, i) => typeof str === 'string' && str[i] === '1';
    const s = r.m ?? {};
    m.L.rooms.forEach((room, i) => { if (on(s.rc, i)) { room.activated = true; room.primed = true; room.enemies = []; room.waveIdx = room.waves?.length ?? 0; room.waveT = 0; if (room.trap) room.trap.sprung = room.trap.done = true; g.minimap.reveal(room); } });
    // in a room left half done, the monsters already killed don't come back
    m.L.rooms.forEach((room, i) => {
      let n = Math.max(0, Math.min(99, Math.floor(Array.isArray(s.rk) ? s.rk[i] ?? 0 : 0)));
      if (!n || on(s.rc, i) || !room.waves) return;
      room.killedBefore = n;   // (a room's groups leave that many out: mission.js spawnPacks)
      if (room.packs?.length || room.loose?.length) return;
      room.waves = room.waves.map((w) => { const k = Math.min(n, w.length); n -= k; return w.slice(k); }).filter((w) => w.length);
    });
    m.obj.items.forEach((it, i) => { if (on(s.it, i) && !it.done) m.completeItem(it); });
    const chests = () => m.L.chests.forEach((c, i) => { if (on(s.ch, i) && !c.opened) { c.opened = true; if (c.lid) c.lid.rotation.x = -1.9; } });
    chests();
    m.L.gates.forEach((gt, i) => { if (on(s.gt, i)) m.openGate(gt); });
    if (s.x) { try { m.applyNet?.(s.x); } catch (e) { /* the objective starts over */ } }
    if (s.od && !m.objDone) { m.obj.done = Math.max(m.obj.done, m.obj.need); m.checkObjective(); }
    if (s.bd && Array.isArray(s.bp)) {
      // the boss already fell: the way out (and its chest) come back, without a second reward
      const at = new THREE.Vector3(...s.bp);
      m.bossSpawned = true; m.objDone = true;
      const drop = g.pickups.drop; g.pickups.drop = () => {};
      try { m.onBossKilled({ pos: at, home: at }); } finally { g.pickups.drop = drop; }
      setTimeout(() => chests(), 2100);
    }
    m.stats.time = s.time ?? 0;
    if (Array.isArray(r.cp)) {
      const cp = new THREE.Vector3(...r.cp);
      g.placePlayers(cp);
      this.cp = r.cp;
    }
    const party = r.party ?? [];
    for (const p of g.players) { const saved = party.find((x) => x.hero === p.hero); if (saved) p.hp = Math.max(1, p.maxHp * saved.hp); }
    this.sig = ''; this.had = true;
    g.toast?.(t('resume.checkpoint'), 'big');
    return true;
  }
  // the heroes to begin a Continue with: the first human hero, the rest as companions
  partyOf(r) {
    const list = (r.party ?? []).filter((x) => HEROES[x.hero] && !HEROES[x.hero].soon);
    const human = list.find((x) => x.human) ?? list[0];
    return { hero: human?.hero ?? 'percy', companions: list.filter((x) => x !== human).map((x) => x.hero) };
  }
}

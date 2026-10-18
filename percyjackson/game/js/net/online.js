// Online co-op through the shared mini-rooms relay (MULTIPLAYER.md), on top
// of session.js (identity, reconnects, host migration, shared clock).
//
// Who owns what (see the README's Online section for the table):
//   presence, every browser   its heroes `hs` (each keyed by its player's
//                             profile id, or ai:<hero> for a companion), the
//                             shared time `T`, and `rs`: heroes it is
//                             re-syncing after a reconnect or a hidden tab
//   presence, host            `sc` the scene (camp, story cards, or a chapter
//                             with its level seed) and `w` the world: monsters,
//                             the boss, objective, chests, gates and rooms
//   topic ev    anyone        effects, telegraphs, projectiles and hazards
//                             of what that browser simulates (netfx.js)
//   topic hit   guest→host    a guest's hero hit monsters (the host applies it)
//   topic hurt  host→owner    a monster hit that browser's hero
//   topic act   guest→host    freed a captive, opened a chest, revealed a
//                             disguise, objective actions, took the way out
//   topic done  host→all      the chapter is complete
//   topic swap / swapok / swapno   a guest asks the host to swap into the AI
//                             companion; the host grants one swap at a time
//   topic full  host→one      the room already has four heroes
//
// The host runs the monsters, the chapter and the AI companions. Every
// browser runs its own humans' heroes, so controls never wait for the network.
// Everything else is drawn from snapshots, interpolated ~100 ms behind
// (interp.js). Each browser keeps its own players' profiles and rolls its own
// loot; the host never writes anyone else's save.
import * as THREE from 'three/webgpu';
import { Player, PLAYER_COLORS } from '../entities/player.js';
import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/bosses.js';
import { holdHero } from '../entities/holds.js';
import { HEROES, HERO_IDS } from '../heroes/index.js';
import { B } from '../world/blocks.js';
import { toast } from '../ui/ui.js';
import { t } from '../text_config.js';
import { companionsWanted, storyAssign } from '../partyRules.js';
import { Session, loadClient } from './session.js';
import { PROTO, HZ, PEOPLE, num, int, str, r2, r3, readHero, cleanName, newCode, roomIdFor, KEY_RE } from './proto.js';
import { Lag, Track, pose, angleDiff, wrapAngle } from './interp.js';
import { NetFx } from './netfx.js';
import { NameTags } from './nametags.js';

export { loadClient };
const TOPICS = ['ev', 'hit', 'hurt', 'act', 'done', 'swap', 'swapok', 'swapno', 'full', 'load'];
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const nowS = () => performance.now() / 1000;
const STALE = 3;          // s without updates before the host plays someone's hero for them
const HOST_SILENT = 12;   // s without host updates before guests move on to a new host (building a level can take seconds)

export class Online {
  constructor(game) {
    this.game = game;
    this.session = null;
    this.remote = new Map();      // hero key -> { key, uid, p, track, ai, held, name, last, entry }
    this.puppets = new Map();     // guests: monster net id -> Enemy / Boss puppet
    this.lags = new Map();        // sender uid -> Lag
    this.setupNonce = 1; this.applied = null; this.netSeq = 0;
    this.sendT = 0; this.partyT = 0;
    this.resync = new Set();
    this.knownKeys = new Set();   // host: hero keys already seen in this room      // guest: my hero keys waiting for the host to hand them back
    this.hits = [];               // guest: hits to send with the next batch
    this.fx = new NetFx(this);
    this.tags = new NameTags(game);
    this.overlayT = 0;
    this.stats = { hurtSent: 0, hitsSent: 0, hitsApplied: 0, snaps: 0, promoted: 0, demoted: 0, takeovers: 0, releases: 0 };
    document.addEventListener('visibilitychange', () => this.onVisibility());
  }
  // ---- state
  get live() { return !!this.session && this.session.status !== 'closed'; }
  get active() { return this.live; }
  get ready() { return !!this.session?.ready; }
  get isHost() { return this.live && this.session.isHost; }
  get isGuest() { return this.live && !this.session.isHost; }
  get uid() { return this.session?.me.uid ?? this.game.save?.id ?? 'local'; }
  get name() { return this.session?.me.name ?? this.game.save?.name ?? t('profiles.demigod'); }
  get code() { return /^hbq-([A-Z0-9]{5})/.exec(this.session?.base ?? '')?.[1] ?? null; }
  // (objectives/common.js sends its `act` topics through this)
  get room() { return this.ready ? { publishTopic: (t, d) => this.session.send(t, d) } : null; }
  get peers() { const m = new Map(); for (const p of this.session?.byUid.values() ?? []) m.set(p.uid, { name: p.name }); return m; }
  lag(uid) { let l = this.lags.get(uid); if (!l) this.lags.set(uid, l = new Lag()); return l; }
  hostLag() { return this.lag(this.session?.hostUid ?? 'host'); }
  sharedS() { return (this.session?.sharedNow() ?? performance.now()) / 1000; }

  // ---- keys
  keyOf(p) {
    if (!p) return null;
    if (p.remote) return p.remote.key;
    if (p.ai) return p.netKey ?? 'ai:' + p.hero;
    return this.game.profiles?.idFor(p.device) ?? this.uid;
  }
  heroByKey(k) { if (!k) return null; const R = this.remote.get(k); if (R) return R.p; return this.game.players.find((p) => !p.remote && this.keyOf(p) === k) ?? null; }
  netIdOf(e) { if (e.netId == null) e.netId = ++this.netSeq; return e.netId; }
  entityById(id) { return this.puppets.get(id) ?? this.game.enemies.find((e) => e.netId === id) ?? null; }
  localHumans() { return this.game.players.filter((p) => !p.ai && !p.remote); }

  // ---------------------------------------------------------------- starting and leaving
  async start(mode, code = null) {
    if (this.live) return;
    const g = this.game;
    const MR = await loadClient();
    const s = this.session = new Session(MR, { uid: g.save.id, name: g.save.name, topics: TOPICS });
    s.on('status', (st, info) => this.onStatus(st, info));
    s.on('fatal', (r) => this.onFatal(r));
    s.on('peers', (changed) => this.onPeers(changed));
    s.on('left', (peer) => this.onLeft(peer));
    s.on('missing', (peer) => this.onMissing(peer));
    s.on('arrived', (peer) => toast(t('online.joined', { name: peer.name })));
    s.on('topic', (t, d, peer) => this.onTopic(t, d, peer));
    s.on('migrating', (info) => this.onMigrating(info));
    s.on('migrated', (info) => this.onMigrated(info));
    s.on('reconnected', () => { this.startResync(); toast(t('online.reconnected')); });
    this.fx.install();
    this.unload = () => s.leave();
    window.addEventListener('pagehide', this.unload);
    if (mode === 'host') {
      this.setupNonce++;
      const c = code ?? newCode();
      s.host(roomIdFor(c), t('online.roomTitle', { name: g.save.name }));
      this.rememberRoom(roomIdFor(c), t('online.roomTitle', { name: g.save.name }));
    } else {
      // a guest's companions are the host's to run
      this.dropLocalAI();
      s.join(code);
      this.rememberRoom(code, '');
      this.startResync();
    }
    g.hud?.rebuildCards?.();
  }
  rememberRoom(id, title) { try { localStorage.setItem('hbq-last-room-' + this.uid, JSON.stringify({ id, title, t: Date.now() })); } catch (e) { /* ignore */ } }
  lastRoom() { try { const r = JSON.parse(localStorage.getItem('hbq-last-room-' + this.game.save.id) || 'null'); return r && Date.now() - r.t < 3 * 3600e3 ? r : null; } catch (e) { return null; } }
  dropLocalAI() {
    const g = this.game;
    for (const p of [...g.players]) if (p.ai && !p.remote) this.removeHero(p);
    g.partyMgr.clear(); g.party = null;
  }
  removeHero(p) { const g = this.game; g.removePlayer(p); const i = g.players.indexOf(p); if (i >= 0) g.players.splice(i, 1); }
  // Leave on purpose. The scene carries on here, offline (a guest takes over
  // its copy of the world, as a new host would).
  leave({ quiet = false } = {}) {
    if (!this.session) return;
    const s = this.session, wasGuest = !s.isHost;
    window.removeEventListener('pagehide', this.unload);
    s.leave();
    this.session = null;
    this.afterOffline(wasGuest);
    if (!quiet) toast(t('online.offline'), 'big');
  }
  afterOffline(wasGuest) {
    const g = this.game;
    if (wasGuest) this.promoteWorld();
    for (const R of [...this.remote.values()]) this.dropRemote(R);
    for (const p of g.players) { if (p.ai && !p.remote) { p.heldFor = null; } }
    this.fx.clear(); this.resync.clear();
    g.partyMgr.fill();
    g.hud?.rebuildCards?.();
  }
  onFatal(reason) {
    const wasGuest = !this.session?.isHost;
    window.removeEventListener('pagehide', this.unload);
    this.session = null;
    const why = t(`online.fatal.${reason}`) !== `online.fatal.${reason}` ? t(`online.fatal.${reason}`) : t('online.fatal.other', { reason });
    toast(t('online.fatalToast', { why }), 'big');
    this.afterOffline(wasGuest);
  }
  onStatus(st, info) {
    if (st === 'reconnecting') toast(t('online.connectionLost'));
    if (st === 'migrating') toast(info?.wasHost ? t('online.reconnecting') : info?.next ? t('online.hostLeftNext', { name: info.next }) : t('online.hostLeftFinding'));
    if (this.game.ui.isOpen('online')) this.game.ui.refresh('online');
  }
  onVisibility() {
    if (!this.live) return;
    clearTimeout(this.hideT);
    // a hidden tab stops drawing frames: a host hands the room on after 2 s
    if (document.hidden && this.isHost) this.hideT = setTimeout(() => { if (document.hidden && this.isHost && this.session.byUid.size) this.session.handoff(); }, 2000);
  }

  // ---------------------------------------------------------------- every frame
  // Before the heroes move: while a menu is open online the game doesn't stop,
  // so this browser's heroes stand still (and are protected for a while).
  frameStart(dt) {
    const g = this.game;
    const t = performance.now();
    if (this.live && this.lastFrame && t - this.lastFrame > 1000) {
      // this screen stalled (building a level, a slow device): don't blame the others for the silence
      if (this.isGuest) { this.session.hostSeenAt = t; if (t - this.lastFrame > 1500) this.startResync(); }
      else for (const peer of this.session.byUid.values()) peer.fresh = t;
    }
    this.lastFrame = t;
    if (!this.live || g.state !== 'playing') { this.overlayT = 0; return; }
    const overlay = g.ui.stack.some((s) => !s.opts?.passive && s.id !== 'online') || (g.paused && !g.minigame);
    if (!overlay) { this.overlayT = 0; return; }
    this.overlayT += dt;
    for (const p of this.localHumans()) { g.input.setVirtual(p.device); if (this.overlayT < 8) p.iframes = Math.max(p.iframes, 0.15); }
  }
  // the simulation keeps running online, even with the pause menu open
  get keepsRunning() { return this.live; }
  update(dt) {
    const g = this.game;
    this.tags.update();
    if (!this.session) return;
    const s = this.session;
    s.tick(dt);
    this.drivePuppets(dt);
    this.fx.update(dt);
    if (!s.ready) return;
    if (this.isGuest) {
      if (this.hits.length) { s.send('hit', { h: this.hits.splice(0, 24) }); this.stats.hitsSent++; }
      if (s.hostUid && performance.now() - Math.max(s.hostSeenAt, this.hostLoading ?? 0) > HOST_SILENT * 1000 && s.status === 'open') { toast(t('online.hostSilent')); s.abandonHost(); }
    }
    this.partyT -= dt;
    if (this.partyT <= 0) { this.partyT = 0.4; if (this.isHost) { this.hostChecks(); this.enforceParty(); } else this.guestParty(); }
    this.sendT -= dt;
    if (this.sendT <= 0) { this.sendT = 1 / HZ; this.publish(); }
    void g;
  }
  publish() {
    const g = this.game, s = this.session;
    const hs = [];
    for (const p of g.players) {
      if (p.remote || p.removed) continue;
      this.fx.wrapUpdate(p);
      hs.push(this.heroEntry(p));
    }
    const mine = { T: Math.round(s.sharedNow()), hs, rs: [...this.resync] };
    if (s.isHost) { mine.sc = this.setup(); mine.w = this.worldSnapshot(); }
    s.mine = mine;
    s.publish(true);
  }
  heroEntry(p) {
    const a = p.action;
    const e = { k: this.keyOf(p), i: p.index, h: p.hero, n: p.ai ? '' : this.game.profileName?.(p) ?? this.name, x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), f: r2(p.facing), vx: r2(p.vel.x), vy: r2(p.vel.y), vz: r2(p.vel.z), hp: Math.round(p.hp), mh: Math.round(p.maxHp), d: p.dead ? 2 : p.downed ? 1 : 0, t: r2(a?.t ?? 0), c: Math.round(p.ce ?? 0) };
    if (p.ai) e.ai = 1;
    if (p.heldFor) { e.held = 1; e.ho = p.heldFor; }
    if (a?.type) e.a = a.type;
    const st = a?.style ?? a?.step?.style; if (st) e.s = st;
    if (p.dodgeT > 0) e.r = 1;
    return e;
  }

  // ---------------------------------------------------------------- the scene (host)
  setup() {
    const g = this.game;
    if (g.mode === 'mission' && g.mission) {
      const d = g.mission.def;
      return { n: this.setupNonce, mode: 'mission', def: { biome: d.biome, objective: d.objective, boss: d.boss, difficulty: d.difficulty, level: d.level ?? d.difficulty, seed: d.seed, chapter: d.chapter ?? null, mist: d.mist ?? 0, disguise: d.disguise ?? [], objText: d.objText ?? null, id: d.id ?? null } };
    }
    // the opening: the Manhattan prologue, or a cutscene (guests play the same one)
    if (g.mode === 'prologue') return { n: this.setupNonce, mode: 'prologue' };
    // (between a cutscene and the chapter after it, the story cards: guests keep the cutscene's last picture)
    if (g.mode === 'cutscene') return { n: this.setupNonce, mode: 'cut', id: g.cutscene && !g.cutscene.done ? g.cutscene.id : 'end' };
    const sc = { n: this.setupNonce, mode: 'hub', area: g.area === 'road' ? 'road' : 'camp' };
    if (this.storyCh && g.ui.isOpen('story')) sc.st = this.storyCh;
    return sc;
  }
  // The host is about to build a level (seconds without frames): tell the
  // guests at once, by topic, so they wait for it rather than move on.
  loading() { if (this.isHost && this.ready) this.session.send('load', {}); }
  sceneChanged() { if (this.isHost || !this.live) { this.setupNonce++; this.sendT = 0; } }
  story(ch) { this.storyCh = ch?.id ?? null; this.sendT = 0; }
  worldSnapshot() {
    const g = this.game, m = g.mission;
    const roomOf = new Map();
    m?.L.rooms.forEach((r, i) => r.enemies?.forEach((e) => roomOf.set(e, i)));
    const e = [];
    for (const en of g.enemies) {
      if (en.isDummy || en.puppet) continue;
      if (en.dead && (en.deathT ?? 0) > 0.6) continue;
      if (e.length >= 90) break;
      this.netIdOf(en);
      this.fx.wrapUpdate(en);
      const boss = !!en.isBoss, an = boss ? en.anim : en.action;
      const flags = (en.dead ? 1 : 0) | (en.disguised ? 2 : 0) | (en.bossStandIn ? 4 : 0) | (boss && en.stunT > 0 ? 8 : 0) | (en.untargetable ? 16 : 0) | (boss && en.intro > 0 ? 32 : 0) | (en.bones ? 64 : 0);
      e.push([en.netId, boss ? 'B:' + en.id : en.kind, r2(en.pos.x), r2(en.pos.y), r2(en.pos.z), r2(en.facing ?? 0), Math.round(en.hp), Math.round(en.maxHp), flags,
        (boss ? an?.type : en.state) ?? '', en.elite ?? 0, en.disguise ?? 0, r2(en.vel?.x ?? 0), r2(en.vel?.z ?? 0), roomOf.get(en) ?? -1, (an?.style ?? an?.anim ?? an?.kind) ?? 0, r2(boss ? an?.t ?? 0 : en.stateT ?? 0)]);
    }
    for (const a of g.allies) this.fx.wrapUpdate(a);
    const out = { e, s: g.mist.active ? 1 : 0 };
    if (m) {
      const bits = (list, f) => list.map((x) => (f(x) ? 1 : 0)).join('');
      out.m = { od: m.objDone ? 1 : 0, it: bits(m.obj.items, (x) => x.done), ch: bits(m.L.chests, (c) => c.opened), gt: bits(m.L.gates, (gt) => gt.open), rm: m.L.rooms.map((r) => (r.activated ? r.waveIdx ?? 0 : -1)), tg: bits(m.L.trapGates ?? [], (gt) => !gt.open), bs: m.bossSpawned ? 1 : 0, x: m.netState?.() ?? null, f: m.failed ? 1 : 0 };
    }
    return out;
  }

  // ---------------------------------------------------------------- receiving presence
  onPeers(changed) {
    const s = this.session;
    for (const peer of changed) {
      const d = peer.p;
      if (!d || typeof d !== 'object') continue;
      const T = num(d.T, -1e12, 1e15, NaN);
      if (Number.isFinite(T)) this.lag(peer.uid).observe(T / 1000, s.sharedNow() / 1000);
      peer.rs = new Set(Array.isArray(d.rs) ? d.rs.filter((k) => typeof k === 'string').slice(0, 8) : []);
      peer.fresh = performance.now();
      this.syncHeroes(peer, Array.isArray(d.hs) ? d.hs.slice(0, 8) : [], Number.isFinite(T) ? T / 1000 : this.sharedS());
      if (peer.host && !s.isHost) {
        // my heroes the host isn't holding need no catching up
        if (this.resync.size) { const held = new Set((d.hs ?? []).filter((h) => h && h.held === 1).map((h) => h.k)); for (const k of [...this.resync]) if (!held.has(k)) this.resync.delete(k); }
        if (d.sc) this.applySetup(d.sc);
        if (d.w) this.applyWorld(d.w, Number.isFinite(T) ? T / 1000 : this.sharedS());
      }
    }
    if (s.isHost) this.checkCapacity();
  }
  syncHeroes(peer, list, T) {
    const g = this.game, mine = new Set(g.players.filter((p) => !p.remote).map((p) => this.keyOf(p)));
    const seen = new Set();
    for (const raw of list) {
      const e = readHero(raw); if (!e) continue;
      seen.add(e.k);
      if (mine.has(e.k)) {
        if (e.ai && raw.held === 1) this.claim(e);   // the host is holding one of my heroes
        else if (!e.ai) {
          // a person's hero with the key of one of my AI heroes: unless I'm holding it for them, the person wins
          const ai = g.players.find((p) => p.ai && !p.remote && this.keyOf(p) === e.k);
          // (their own hero, played by the AI since they left: they get it back where it is)
          if (ai && !ai.heldFor && this.isHost) { this.knownKeys.add(e.k); this.giveHero(peer.uid, e.k, e.i, ai); }
          else if (ai && !ai.heldFor) ai.netKey = 'ai:' + ai.hero;
        }
        continue;
      }
      let R = this.remote.get(e.k);
      if (R && R.p.hero !== e.h) { this.dropRemote(R, true); R = null; }
      if (!R) {
        if (!g.level) continue;
        R = this.addRemote(e, peer.uid);
        R.settled = e.ai || this.knownKeys.has(e.k);   // (someone new to the room may take over a companion)
        this.knownKeys.add(e.k);
      }
      R.uid = peer.uid; R.ai = e.ai; R.held = raw.held === 1; R.name = e.ai ? '' : e.n; R.entry = e; R.last = performance.now();
      R.p.remote.ai = e.ai; R.p.remote.held = R.held; R.p.remote.name = R.name; R.p.remote.uid = peer.uid; R.p.remote.idx = e.i;
      R.p.ai = e.ai; R.p.remote.missing = false;
      R.track.push({ t: T, x: e.x, y: e.y, z: e.z, f: e.f, vx: e.vx, vy: e.vy, vz: e.vz });
      const p = R.p;
      if (e.hp < p.hp - 0.5 && !e.d) R.flashT = 0.12;
      p.hp = e.hp; p.maxHp = e.mh; p.ce = e.c;
      p.downed = e.d === 1; p.dead = e.d === 2;
      p.iframes = e.r ? 0.12 : 0;
    }
    for (const R of [...this.remote.values()]) {
      if (R.uid !== peer.uid || seen.has(R.key)) continue;
      // a player who stopped playing on a screen that's still here: the AI plays their hero on
      if (this.isHost && !R.ai && g.state === 'playing') { this.realizeAI(R).netKey = R.key; toast(t('online.playerLeftAi', { name: R.name || t('online.aPlayer'), hero: HEROES[R.p.hero]?.name ?? R.p.hero })); }
      else this.dropRemote(R);
    }
  }
  // Host: someone who arrives mid-chapter takes over a companion's hero (its
  // health and place in the party), their own old hero first.
  offerTakeovers() {
    const g = this.game;
    for (const R of this.remote.values()) {
      if (R.ai || R.settled) continue;
      R.settled = true;
      if (g.mode !== 'mission') continue;
      const free = g.players.filter((p) => p.ai && !p.remote && !p.heldFor && !p.dead);
      const C = free.find((p) => p.netKey === R.key) ?? free[0];
      if (C) this.giveHero(R.uid, R.key, R.entry?.i ?? 0, C);
    }
  }
  // hand the companion C to the player `key` on screen `uid`: they carry on as that hero, from where it is
  giveHero(uid, key, idx, C) {
    const st = { x: r2(C.pos.x), y: r2(C.pos.y), z: r2(C.pos.z), f: r2(C.facing), hp: Math.round(C.hp), mh: Math.round(C.maxHp), ce: Math.round(C.ce) };
    this.session.send('swapok', { to: uid, k: key, i: idx, h: C.hero, take: 1, ...st });
    this.removeHero(C);
    this.game.fx?.summonCircle?.(V3(st.x, st.y, st.z), 0x6ad8ff);
    this.setParty();
  }
  // Guest: one of this screen's players stopped (their controller went): the host's AI plays the hero on.
  dropLocalHuman(p) { this.removeHero(p); this.setParty(); this.game.hud?.rebuildCards?.(); }
  addRemote(e, uid) {
    const g = this.game;
    const p = new Player(g, 4 + ((this.pupIdx = (this.pupIdx ?? 0) + 1) % 60), 'net:' + e.k, HEROES[e.h] ? e.h : 'percy');
    p.color = PLAYER_COLORS[e.i % 4];
    p.spawn(V3(e.x, e.y, e.z)); p.facing = e.f;
    g.scene.add(p.object); g.players.push(p);
    const R = { key: e.k, uid, p, track: new Track(), ai: e.ai, name: e.n, last: performance.now(), flashT: 0 };
    this.puppetHero(p, R);
    this.remote.set(e.k, R);
    g.hud?.rebuildCards?.();
    return R;
  }
  // A hero shown from someone else's updates: no input, no physics.
  // On the host a monster hitting it sends `hurt` to its owner instead.
  puppetHero(p, R) {
    const self = this;
    p.remote = { uid: R.uid, idx: R.entry?.i ?? 0, key: R.key, name: R.name, ai: R.ai };
    p.update = function (dt) { self.drivePuppetHero(R, dt); };
    p.takeDamage = function (amount, src, o = {}) {
      if (!self.isHost || this.dead || this.downed || this.iframes > 0) return 0;
      self.session.send('hurt', { to: R.uid, k: R.key, a: Math.round(amount * 10) / 10, kx: r2(o.knock?.x ?? 0), kz: r2(o.knock?.z ?? 0), p: o.pure ? 1 : 0, dot: o.dot ? 1 : 0, nk: o.noKnock ? 1 : 0 });
      self.stats.hurtSent++;
      if (!o.dot) this.game.fx.hitSpark?.(this.pos.clone().setY(this.pos.y + 1));
      return amount;
    };
    p.heal = function () {}; p.gainCE = function () {}; p.refreshLoadout = function () {};
  }
  // Chapter 1: Mrs. Dodds's shriek paralyzes a hero someone else plays (host → its screen).
  stunRemote(p, dur) {
    if (!this.isHost) return;
    const R = [...this.remote.values()].find((q) => q.p === p);
    if (R && !R.ai) this.session.send('hurt', { to: R.uid, k: R.key, a: 0, st: Math.round(dur * 10) / 10 });
  }
  dropRemote(R, quiet = false) {
    this.remote.delete(R.key);
    if (!quiet) this.game.fx?.poof?.(R.p.pos);
    this.removeHero(R.p);
    this.game.hud?.rebuildCards?.();
  }
  drivePuppets(dt) {
    const now = this.sharedS();
    const eased = new Set();
    for (const R of this.remote.values()) if (!eased.has(R.uid)) { eased.add(R.uid); this.lag(R.uid).ease(dt); }
    if (this.session && !this.session.isHost) { const L = this.hostLag(); if (!eased.has(this.session.hostUid)) L.ease(dt); this.hostRT = now - L.delay; }
  }
  drivePuppetHero(R, dt) {
    const p = R.p, L = this.lag(R.uid);
    const s = R.track.sample(this.sharedS() - L.delay);
    if (s) {
      if (pose(p.pos, s, dt)) this.stats.snaps++;
      p.vel.set(s.vx, s.vy, s.vz);
      p.facing = wrapAngle(p.facing + angleDiff(p.facing, s.f) * (1 - Math.exp(-18 * dt)));
    }
    const e = R.entry;
    const a = e?.a ? { type: e.a, style: e.s ?? undefined, t: e.t, step: { strike: 0.5, windup: 0.25, style: e.s }, windup: 0.25, strike: 0.5 } : null;
    p.object.position.copy(p.pos); p.object.rotation.y = p.facing;
    R.flashT -= dt; p.rig.swap(R.flashT > 0 ? this.game.flashMaterial : null);
    const speed = Math.min(1, Math.hypot(p.vel.x, p.vel.z) / p.speed);
    p.rig.animate({ dt, air: Math.abs(p.vel.y) > 1.5, speed: e?.r ? 0 : speed, vel: p.vel, action: p.dead ? { type: 'death', t: 1 } : p.downed ? { type: 'down', t: 1 } : a });
  }
  // The host has been holding my hero (I was away): carry on from where it is.
  claim(e) {
    if (!this.resync.has(e.k)) return;
    const p = this.game.players.find((q) => !q.remote && !q.ai && this.keyOf(q) === e.k);
    if (p) { p.spawn(V3(e.x, e.y, e.z)); p.facing = e.f; p.hp = Math.min(p.maxHp, Math.max(1, e.hp)); p.downed = e.d === 1; p.dead = e.d === 2; }
    this.resync.delete(e.k);
  }
  // After a reconnect or a hidden tab: don't show my heroes until the host's
  // next update says whether it has been playing them for me.
  startResync() {
    if (!this.live) return;
    for (const p of this.localHumans()) this.resync.add(this.keyOf(p));
    clearTimeout(this.resyncT);
    this.resyncT = setTimeout(() => this.resync.clear(), 2500);   // the host isn't holding them
  }

  // ---------------------------------------------------------------- guests: the scene
  applySetup(sc) {
    const g = this.game;
    if (!sc || typeof sc !== 'object' || typeof sc.n !== 'number') return;
    const id = sc.n + ':' + sc.mode + ':' + (sc.def?.seed ?? sc.id ?? '');
    if (sc.mode === 'hub' && sc.st && sc.st !== this.storySeen && g.mode === 'hub') { this.storySeen = sc.st; this.showStory(sc.st); }
    if (id === this.applied) return;
    if (sc.mode === 'mission' && sc.def && typeof sc.def.seed === 'number') {
      if (g.minigame?.abort) g.minigame.abort();
      this.applied = id;
      this.clearPuppets();
      const def = { biome: str(sc.def.biome, 24), objective: str(sc.def.objective, 24), boss: sc.def.boss ? str(sc.def.boss, 32) : null, difficulty: int(sc.def.difficulty, 1, 9, 1), level: int(sc.def.level ?? sc.def.difficulty, 1, 20, 1), seed: sc.def.seed, chapter: sc.def.chapter ? str(sc.def.chapter, 24) : null, mist: num(sc.def.mist, 0, 1), disguise: Array.isArray(sc.def.disguise) ? sc.def.disguise.map((x) => str(x, 24)).slice(0, 8) : [], objText: sc.def.objText ? str(sc.def.objText, 80) : null, remote: true };
      if (sc.def.id) def.id = str(sc.def.id, 32);
      g.ui.closeAll(); g.paused = false;
      g.endCutscene?.();
      g.startMission(def);
      this.puppetizeMission();
      this.joinNear();
    } else if (sc.mode === 'prologue') {
      // the opening's Manhattan street: built from the same seed here
      this.applied = id;
      this.clearPuppets();
      if (g.mode !== 'prologue') { g.opening?.startPrologue({ remote: true }); this.joinNear(); }
    } else if (sc.mode === 'cut' && typeof sc.id === 'string') {
      this.applied = id;
      this.clearPuppets();
      if (g.cutscene?.id !== sc.id || !g.cutscene?.remote) g.opening?.playCutscene(str(sc.id, 16), { remote: true });
    } else if (sc.mode === 'hub') {
      this.applied = id;
      this.clearPuppets();
      const area = sc.area === 'road' ? 'road' : 'camp';   // (the open world round camp, or the Road West)
      if (g.mode !== 'hub' || (g.area ?? 'camp') !== area) { g.ui.closeAll(); g.paused = false; g.endCutscene?.(); g.loadHub({ area }); toast(area === 'road' ? t('rt.area') : t('game.camp.name'), 'title'); this.joinNear(); }
    }
  }
  showStory(chId) {
    const g = this.game;
    import('../story/chapters.js').then(({ chapter }) => {
      const ch = chapter(chId);
      if (!ch?.intro?.length || g.mode !== 'hub' || !g.ui.stack) return;
      import('../ui/screens.js').then((S) => S.openStoryCards?.(g, { title: ch.title, sub: t('game.chapterSub', { num: ch.num, place: ch.place }), image: ch.card, lines: ch.intro }, () => {}));
    }).catch(() => {});
  }
  // a guest arriving in a scene already under way starts next to the party
  joinNear() {
    const g = this.game;
    const host = [...this.remote.values()].find((R) => !R.ai && R.uid === this.session?.hostUid) ?? [...this.remote.values()][0];
    const s = host?.track.newest();   // (where they really are: loading the level put every hero at the start)
    if (!s) return;
    const at = V3(s.x, s.y, s.z);
    host.p.pos.copy(at);
    this.localHumans().forEach((p, i) => p.spawn(at.clone().add(V3((i % 2 ? 1 : -1) * 1.4, 0.2, 1.2 + i * 0.4))));
    g.rig.snap?.(at);
  }
  puppetizeMission() {
    const g = this.game, m = g.mission, self = this;
    if (!m || m.remote) return;
    m.remote = true;
    m.spawnWave = function (room) { room.waveT = 1e9; };
    m.spawnPacks = function (room) { room.primed = true; };
    m.spawnReserve = function (room) { room.reserve = []; };
    m.springTrap = function (room) { room.trap.sprung = true; };   // (the doors come from the host's snapshot)
    m.openTrap = function (room) { room.trap.done = true; };
    m.altarWave = function () {};
    m.startBoss = function (room) { this.bossSpawned = true; this.bossRoom = room; };
    m.revealDisguisedBoss = function () {};
    m.completeItem = function (it) {
      if (!it.done && !self.applying) self.session?.send('act', { k: 'item', i: this.obj.items.indexOf(it) });
      return Object.getPrototypeOf(this).completeItem.call(this, it);
    };
    m.openChest = function (c, p) {
      if (!c.opened && !self.applying) self.session?.send('act', { k: 'chest', i: this.L.chests.indexOf(c) });
      return Object.getPrototypeOf(this).openChest.call(this, c, p);
    };
  }
  unpuppetizeMission() {
    const m = this.game.mission;
    if (!m || !m.remote) return;
    for (const k of ['spawnWave', 'spawnPacks', 'spawnReserve', 'springTrap', 'openTrap', 'altarWave', 'startBoss', 'revealDisguisedBoss', 'completeItem', 'openChest']) delete m[k];
    m.remote = false; m.def.remote = false;
    for (const r of m.L.rooms) { r.enemies = r.enemies ?? []; r.waveT = Math.min(r.waveT ?? 0, 2.5); }
  }
  applyWorld(w, T) {
    const g = this.game, m = g.mission;
    if (!Array.isArray(w.e)) return;
    this.applying = true;
    try {
      const seen = new Set();
      for (const row of w.e.slice(0, 90)) {
        if (!Array.isArray(row)) continue;
        const [id, kind, x, y, z, f, hp, mh, flags, state, elite, disguise, vx, vz, room, style, at] = row;
        if (typeof id !== 'number' || typeof kind !== 'string' || ![x, y, z].every(Number.isFinite)) continue;
        seen.add(id);
        let e = this.puppets.get(id);
        if (!e) {
          if (flags & 1) continue;
          e = this.spawnPuppet(id, kind, V3(x, y, z), { elite: typeof elite === 'string' ? elite : null, disguise: flags & 2 && typeof disguise === 'string' ? disguise : null });
          if (!e) continue;
        }
        e.track.push({ t: T, x, y, z, f: num(f, -100, 100), vx: num(vx, -60, 60), vy: 0, vz: num(vz, -60, 60) });
        e.net = { state: str(state, 16), style: str(style || '', 16) || null, at: num(at, 0, 100), flags, room: int(room, -1, 99, -1) };
        e.maxHp = Math.max(1, num(mh, 1, 1e7, e.maxHp));
        const pend = this.pendingDamage(e);
        e.hostHp = num(hp, -1e7, 1e7, e.maxHp);
        e.hp = Math.max(e.hostHp > 0 ? 1 : 0, e.hostHp - pend);
        if (e.disguised && !(flags & 2)) e.reveal?.();
        else if (!e.disguised && flags & 2 && typeof disguise === 'string' && !e.isBoss) { e.disguise ??= disguise; e.redisguise?.(); }   // (chapter 1: the Mist covers them again)
        e.untargetable = !!(flags & 16);
        e.bossStandIn = !!(flags & 4);
        if (flags & 1 && !e.dead) this.killPuppet(e);
      }
      for (const [id, e] of this.puppets) if (!seen.has(id)) { if (!e.dead) this.killPuppet(e, true); this.puppets.delete(id); }
      if (m && w.m && m.remote) this.applyMission(m, w.m);
      // True Sight follows the host when it turns on or off
      const sight = w.s === 1;
      if (sight !== this.hostSight) { this.hostSight = sight; const me = this.localHumans()[0]; if (g.mist.available && me && sight !== g.mist.active) g.mist.toggle(me); }
    } finally { this.applying = false; }
  }
  applyMission(m, s) {
    const g = this.game, str01 = (v) => (typeof v === 'string' ? v : '');
    [...str01(s.it)].forEach((d, i) => { const it = m.obj.items[i]; if (d === '1' && it && !it.done) m.completeItem(it); });
    [...str01(s.ch)].forEach((d, i) => { const c = m.L.chests[i]; if (d === '1' && c && !c.opened) m.openChest(c, this.localHumans()[0] ?? g.players[0]); });
    [...str01(s.gt)].forEach((d, i) => {
      const gate = m.L.gates[i]; if (!gate) return;
      const open = d === '1';
      if (open && !gate.open) m.openGate(gate);
      else if (!open && gate.open) { gate.open = false; for (const [x, y, z] of gate.blocks) g.world.set(x, y, z, B.blue_energy); }
    });
    // trap doors: shut and open with the host's
    [...str01(s.tg)].forEach((d, i) => {
      const gate = m.L.trapGates?.[i]; if (!gate) return;
      const shut = d === '1';
      if (shut === !gate.open) return;
      const room = gate.room;
      if (room?.trap) { m.setTrapGates(room, shut); if (shut && !room.trap.toasted) { room.trap.toasted = true; toast(t('online.trap'), 'big'); } }
    });
    if (Array.isArray(s.rm)) s.rm.forEach((v, i) => {
      const r = m.L.rooms[i]; if (!r || typeof v !== 'number') return;
      if (v >= 0 && !r.activated) { r.activated = true; r.enemies = []; g.minimap.reveal(r); }
      if (v >= 0) r.waveIdx = v;
    });
    if (s.bs && !m.bossSpawned) m.bossSpawned = true;
    if (s.x) m.applyNet?.(s.x);
    if (s.od && !m.objDone) { m.obj.done = Math.max(m.obj.done, m.obj.need); m.checkObjective(); }
    if (s.f && !m.failed) m.fail?.();
  }
  pendingDamage(e) {
    const t = performance.now(), keep = (this.session?.rtt ?? 150) + this.hostLag().delay * 1000 + 250;
    e.pend = (e.pend ?? []).filter((h) => t - h.t < keep);
    return e.pend.reduce((s, h) => s + h.a, 0);
  }
  spawnPuppet(id, kind, pos, { elite, disguise }) {
    const g = this.game;
    let e;
    try {
      if (kind.startsWith('B:')) {
        e = new Boss(g, kind.slice(2), pos, g.mission?.def.level ?? g.mission?.def.difficulty ?? 1);
        if (g.mission) { g.mission.boss = e; g.mission.bossSpawned = true; g.hud.setBoss(e); g.mission.updateText(); }
      } else e = new Enemy(g, kind, pos, { elite: elite || null, level: g.mission?.def.level ?? g.mission?.def.difficulty ?? 1, disguise: disguise || null });
    } catch (err) { console.warn('puppet', kind, err); return null; }
    e.netId = id;
    this.makePuppet(e);
    e.track.seed({ t: this.sharedS() - 1, x: pos.x, y: pos.y, z: pos.z, f: e.facing ?? 0, vx: 0, vy: 0, vz: 0 });
    g.scene.add(e.object); g.enemies.push(e);
    this.netSeq = Math.max(this.netSeq, id);
    return e;
  }
  // Turn a monster into a puppet of the host's (in place: the same object).
  makePuppet(e) {
    const g = this.game, self = this;
    this.fx.unwrapUpdate(e);
    e.puppet = true; e.track = e.track ?? new Track(); e.pend = [];
    e.target = null; e.marker = null;   // (a puppet never holds an attack token: those count monsters by target)
    e.update = function (dt) { return self.drivePuppetEnemy(this, dt); };
    e.takeDamage = function (amount, src, o = {}) {
      if (this.dead || this.untargetable || this.disguised || (this.isBoss && this.net?.flags & 32)) return 0;
      const dealt = Math.max(0, amount * (this.mark > 0 ? 1.5 : 1) * (1 - (this.armor ?? 0)));
      self.hits.push([this.netId, Math.round(amount * 10) / 10, r2(o.knock?.x ?? 0), r2(o.knock?.z ?? 0), r2(o.stagger ?? 0), (o.unblockable ? 1 : 0) | (this.mark > 0 ? 2 : 0), src?.isPlayer ? self.keyOf(src) : 0]);
      this.pend.push({ a: dealt, t: performance.now() });
      this.hp = Math.max(1, this.hp - dealt);
      this.flashT = 0.1; this.localStagger = (o.stagger ?? 0.2) > 0.15 ? 0.25 : 0;
      return dealt;
    };
    e.reveal = function () {
      if (!self.applying && this.disguised) self.session?.send('act', { k: 'reveal', id: this.netId });
      return Object.getPrototypeOf(this).reveal?.call(this);
    };
    e.explode = function () { g.fx.explosion(this.pos, this.def?.blast ?? 0xff8a2a, this.def?.ai === 'blob' ? 3 : 2.6); };
    this.puppets.set(e.netId, e);
  }
  drivePuppetEnemy(e, dt) {
    const g = this.game;
    if (e.dead) return Object.getPrototypeOf(e).update.call(e, dt);
    const s = e.track.sample(this.hostRT ?? (this.sharedS() - 0.12));
    if (s) {
      pose(e.pos, s, dt, 10);
      e.vel.set(s.vx, 0, s.vz);
      e.facing = wrapAngle(e.facing + angleDiff(e.facing, s.f) * (1 - Math.exp(-16 * dt)));
    }
    const n = e.net ?? {};
    e.flashT = (e.flashT ?? 0) - dt; e.localStagger = Math.max(0, (e.localStagger ?? 0) - dt);
    if (e.isBoss) { this.bossVisual(e, dt, n); return true; }
    e.spawnT = Math.max(0, (e.spawnT ?? 0) - dt);
    const state = e.localStagger > 0 ? 'stagger' : n.state || 'idle';
    // (windup and recover always come with an action; anything else has none)
    const act = state === 'windup' || state === 'recover' ? { style: n.style || 'swingR', anim: n.style === 'raise' || n.style === 'cast' ? n.style : null, windup: 0.5, recover: 0.4 } : null;
    if (state !== e.state) e.stateT = 0;
    e.state = state; e.action = act; e.target = null;
    e.stateT += dt; e.stagger = 0.3;
    e.rig.swap(e.flashT > 0 ? g.flashMaterial : null);
    try { e.animate(dt); } catch (err) { e.object.position.copy(e.pos); }
    return true;
  }
  bossVisual(e, dt, n) {
    const g = this.game;
    e.hover = (e.hover ?? e.hoverY ?? 0) + ((e.hoverY ?? 0) - (e.hover ?? 0)) * (1 - Math.exp(-3 * dt));
    const bob = e.B.hover ? Math.sin(performance.now() * 0.003) * 0.2 : 0;
    e.intro = n.flags & 32 ? 1 : 0;
    e.object.position.set(e.pos.x, e.pos.y + e.hover + bob, e.pos.z);
    e.rig.root.rotation.y = e.facing;
    e.rig.swap(e.flashT > 0 ? g.flashMaterial : null);
    e.stunT = n.flags & 8 ? 1 : 0;
    const act = e.stunT ? { type: 'stagger', t: 0 } : n.state ? { type: n.state, style: n.style ?? undefined, t: n.at ?? 0.5, windup: 0.3, strike: 0.5 } : e.intro ? { type: 'raise', t: 0 } : null;
    const sp = Math.hypot(e.vel.x, e.vel.z) / Math.max(1, e.B.speed ?? 3);
    if (e.rig.hunch) e.rig.torso.rotation.x -= e.rig.hunch;
    e.rig.animate({ dt, speed: Math.min(1, sp), vel: e.vel, action: act });
    if (e.rig.hunch) e.rig.torso.rotation.x += e.rig.hunch;
    try { e.rig.tick?.(dt, e); e.B.ambient?.(e, dt); } catch (err) { /* visual only */ }
  }
  killPuppet(e, quiet = false) {
    if (e.dead) return;
    e.hp = 0;
    if (quiet) { e.dead = true; e.deathT = 99; this.game.scene.remove(e.object); return; }
    // the monster's own death (dust, drachmas and XP for this browser's players)
    e.regrew = true;
    delete e.takeDamage;
    try { e.die?.({}); } catch (err) { console.warn('puppet death', err); }
    e.dead = true; e.deathT = e.deathT ?? 0;
  }
  clearPuppets() {
    const g = this.game;
    for (const e of this.puppets.values()) { g.scene.remove(e.object); const i = g.enemies.indexOf(e); if (i >= 0) g.enemies.splice(i, 1); }
    this.puppets.clear();
  }

  // ---------------------------------------------------------------- host migration
  // A guest becomes the host (or plays on alone): its copy of the world turns
  // into the real thing, from where everything is now (newest update plus a
  // little extrapolation), so nothing rewinds for anyone.
  promoteWorld() {
    const g = this.game, m = g.mission;
    if (!this.puppets.size && !m?.remote) return;
    this.stats.promoted++;
    this.unpuppetizeMission();
    const now = this.sharedS();
    for (const e of this.puppets.values()) {
      const s = e.track?.newest();
      delete e.update; delete e.takeDamage; delete e.reveal; delete e.explode;
      e.puppet = false;
      if (e.dead) continue;
      if (s) { const gap = Math.max(0, Math.min(0.3, now - s.t)); e.pos.set(s.x + s.vx * gap, s.y, s.z + s.vz * gap); e.visY = e.pos.y; }
      if (Number.isFinite(e.hostHp)) e.hp = Math.max(1, e.hostHp);
      if (e.isBoss) {
        e.intro = 0; e.co = null; e.coWait = 0.6; e.anim = null; e.moving = true; e.stunT = 0;
        const f = e.hp / e.maxHp; e.phase = f < 0.33 ? 2 : f < 0.66 ? 1 : 0;
        if (m) { m.boss = e; m.bossSpawned = true; }
      } else {
        e.state = 'idle'; e.stateT = 0; e.action = null; e.aggro = true; e.spawnT = 0; e.cd = 0.4 + Math.random() * 0.8; e.target = null;
      }
      if (m && e.net?.room >= 0) { const r = m.L.rooms[e.net.room]; if (r) (r.enemies ??= []).push(e); }
    }
    for (const e of g.enemies) if (e.netId != null) this.netSeq = Math.max(this.netSeq, e.netId);
    this.netSeq += 10;
    this.puppets.clear();
    const n = /^(\d+):/.exec(this.applied ?? '');
    if (n) this.setupNonce = +n[1];
    // the AI heroes the old host ran are ours now
    const oldHost = this.migratingFrom;
    for (const R of [...this.remote.values()]) if (R.ai && (!oldHost || R.uid === oldHost || !this.live)) this.realizeAI(R);
  }
  // The old host, back as a guest: its monsters become puppets of the new host's.
  demoteWorld(newHost) {
    const g = this.game, m = g.mission;
    this.stats.demoted++;
    const t = this.sharedS() - 0.12;
    for (const e of g.enemies) {
      if (e.isDummy || e.puppet || e.dead) continue;
      this.netIdOf(e);
      this.makePuppet(e);
      e.track.seed({ t, x: e.pos.x, y: e.pos.y, z: e.pos.z, f: e.facing ?? 0, vx: e.vel?.x ?? 0, vy: 0, vz: e.vel?.z ?? 0 });
      e.hostHp = e.hp;
    }
    if (m) this.puppetizeMission();
    this.applied = `${this.setupNonce}:${g.mode === 'mission' ? 'mission' : 'hub'}:${m?.def.seed ?? ''}`;
    // my AI companions are the new host's to run: they carry on as puppets
    for (const p of [...g.players]) if (p.ai && !p.remote) this.puppetizeAI(p, newHost);
  }
  realizeAI(R) {
    const g = this.game, p = R.p;
    this.remote.delete(R.key);
    for (const k of ['update', 'takeDamage', 'heal', 'gainCE', 'refreshLoadout']) delete p[k];
    p.remote = null; p.removed = false;
    p.netKey = R.key; p.heldFor = R.held ? R.entry?.ho ?? null : null;
    g.partyMgr.add(p);
    p.iframes = 0.5; p.downT = p.downed ? 20 : 0;
    return p;
  }
  puppetizeAI(p, uid) {
    const g = this.game;
    g.partyMgr.companions.delete(p);
    const key = this.keyOf(p);
    const R = { key, uid, p, track: new Track(), ai: true, name: '', last: performance.now(), flashT: 0, entry: this.heroEntry(p), settled: true };
    R.track.seed({ t: this.sharedS() - 0.12, x: p.pos.x, y: p.pos.y, z: p.pos.z, f: p.facing, vx: 0, vy: 0, vz: 0 });
    this.puppetHero(p, R);
    this.remote.set(key, R);
  }
  onMigrating({ wasHost, nextUid }) {
    this.migratingFrom = wasHost ? this.uid : this.session.hostUid;
    // the successor starts running the world at once (it connects within a moment)
    if (!wasHost && nextUid === this.uid) { this.promoteWorld(); this.promotedEarly = true; toast(t('online.nowHost'), 'big'); }
  }
  onMigrated({ asHost, wasHost }) {
    if (asHost && !this.promotedEarly) { this.promoteWorld(); toast(t('online.nowHost'), 'big'); }
    if (!asHost && this.promotedEarly) this.demoteWorld(this.session.hostUid);
    else if (!asHost && wasHost) { this.demoteWorld(this.session.hostUid); this.startResync(); }
    this.promotedEarly = false;
    if (asHost) this.sendT = 0;   // (the same scene number: guests don't rebuild)
  }

  // ---------------------------------------------------------------- host: people coming and going
  onMissing(peer) {
    if (!this.isHost) { for (const R of this.remote.values()) if (R.uid === peer.uid) R.p.remote.missing = true; return; }
    for (const R of [...this.remote.values()]) if (R.uid === peer.uid && !R.ai) this.takeOverHero(R);
  }
  onLeft(peer) {
    const g = this.game;
    toast(t('online.left', { name: peer.name }));
    if (this.isHost) {
      for (const R of [...this.remote.values()]) if (R.uid === peer.uid && !R.ai) this.takeOverHero(R);
      // their heroes stay as companions if the party wants them; enforceParty decides
      for (const p of g.players) if (p.heldFor === peer.uid) { p.heldFor = null; p.netKey = 'ai:' + p.hero; }
      this.enforceParty();
    } else for (const R of [...this.remote.values()]) if (R.uid === peer.uid) this.dropRemote(R);
  }
  // play a missing (or frozen) player's hero as an AI companion for now
  takeOverHero(R) {
    this.stats.takeovers++;
    const p = this.realizeAI(R);
    p.heldFor = R.uid;
    this.game.hud?.rebuildCards?.();
    return p;
  }
  hostChecks() {
    const g = this.game, s = this.session, t = performance.now();
    for (const peer of s.byUid.values()) {
      if (s.missing.has(peer.uid)) continue;
      const stale = t - (peer.fresh ?? peer.t) > STALE * 1000;
      // a tab that stopped updating: hold its heroes
      if (stale) for (const R of [...this.remote.values()]) if (R.uid === peer.uid && !R.ai) this.takeOverHero(R);
    }
    // hand held heroes back to their owners once they're updating again
    for (const p of [...g.players]) {
      if (!p.heldFor || p.remote) continue;
      const peer = s.byUid.get(p.heldFor);
      if (!peer || s.missing.has(peer.uid) || t - (peer.fresh ?? 0) > 1000) continue;
      const key = p.netKey;
      if (peer.rs?.has(key)) continue;   // they're still catching up
      const theirs = Array.isArray(peer.p?.hs) && peer.p.hs.some((h) => h && h.k === key && h.ai !== 1);
      if (!theirs) continue;
      this.stats.releases++;
      g.partyMgr.companions.delete(p);
      const R = { key, uid: peer.uid, p, track: new Track(), ai: false, name: peer.name, last: t, flashT: 0, entry: this.heroEntry(p), settled: true };
      R.track.seed({ t: this.sharedS() - this.lag(peer.uid).delay, x: p.pos.x, y: p.pos.y, z: p.pos.z, f: p.facing, vx: 0, vy: 0, vz: 0 });
      p.ai = false; p.heldFor = null; p.netKey = null;
      this.puppetHero(p, R);
      this.remote.set(key, R);
      g.hud?.rebuildCards?.();
    }
  }
  humanCount() {
    let n = this.localHumans().length;
    for (const R of this.remote.values()) if (!R.ai) n++;
    for (const p of this.game.players) if (p.heldFor && !p.remote) n++;
    return n;
  }
  // the party rule (party.js, partyRules.js) over everyone in the room; in the
  // host's opening there are no companions and everyone plays their story hero
  enforceParty() {
    const g = this.game;
    const humans = this.humanCount();
    const opening = !!g.partyMgr.opening;
    const unlocked = HERO_IDS.filter((h) => !HEROES[h].soon && (g.heroUnlocked?.(h) ?? true));
    const want = companionsWanted(humans, { opening, available: unlocked.length });
    if (opening) this.storyHeroes();
    else this.offerTakeovers();
    const ais = g.players.filter((p) => p.ai && !p.remote && !p.heldFor);
    const humanHeroes = new Set(g.players.filter((p) => !p.ai || p.heldFor).map((p) => p.hero));
    if (ais.length > want) {
      const dup = (p) => (humanHeroes.has(p.hero) ? 2 : 0) + (ais.some((q) => q !== p && q.hero === p.hero) ? 1 : 0);
      const order = [...ais].sort((a, b) => dup(b) - dup(a));
      for (const p of order.slice(0, ais.length - want)) { g.fx?.poof?.(p.pos); this.removeHero(p); }
    } else if (ais.length < want) {
      const lead = this.localHumans()[0];
      const used = new Set(g.players.map((p) => p.hero));
      const id = [...(g.partyMgr.chosen ?? []), ...HERO_IDS].find((h) => !used.has(h) && unlocked.includes(h));
      if (id && lead) {
        const p = new Player(g, this.freeIndex(), 'ai', id);
        p.spawn(lead.pos.clone().add(V3(1.2, 0.2, 1.2))); g.scene.add(p.object); g.players.push(p);
        g.partyMgr.add(p); p.netKey = 'ai:' + id;
        g.fx?.summonCircle?.(p.pos, 0xffd84a);
      }
    }
    this.setParty();
  }
  // Host, in the opening: the room's people play the story's heroes in the
  // order they came (this screen's players first, then each guest's by join
  // order): Percy, Grover, Annabeth, Clarisse. A guest playing another hero
  // is told to change (a swapok to the story hero, where theirs stands).
  storyHeroes() {
    const g = this.game, s = this.session, now = performance.now();
    const order = s?.order ?? [];
    const rank = (uid) => { const i = order.indexOf(uid); return i < 0 ? 99 : i; };
    const people = [
      ...this.localHumans().map((p) => ({ p, local: true, r: -1, i: p.index })),
      ...[...this.remote.values()].filter((R) => !R.ai).map((R) => ({ p: R.p, R, r: rank(R.uid), i: R.entry?.i ?? 0 })),
      ...g.players.filter((p) => p.heldFor && !p.remote).map((p) => ({ p, held: true, r: rank(p.heldFor), i: p.index })),
    ].sort((a, b) => a.r - b.r || a.i - b.i);
    const want = storyAssign(people.map((x) => x.p.hero));
    this.storySent ??= new Map();
    people.forEach((x, k) => {
      const h = want[k];
      if (x.p.hero === h || x.held) return;
      if (x.local) { g.changeHero(x.p, h, { quiet: true }); return; }
      const sent = this.storySent.get(x.R.key);
      if (sent && sent.h === h && now - sent.t < 3000) return;
      this.storySent.set(x.R.key, { h, t: now });
      const p = x.p;
      this.session.send('swapok', { to: x.R.uid, k: x.R.key, i: x.i, h, x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), f: r2(p.facing ?? 0), hp: Math.round(p.hp), mh: Math.round(p.maxHp), ce: Math.round(p.ce ?? 0) });
    });
  }
  freeIndex() { const used = new Set(this.game.players.filter((p) => !p.remote).map((p) => p.index)); for (let i = 0; i < 4; i++) if (!used.has(i)) return i; return 3; }
  guestParty() { this.setParty(); }
  setParty() {
    const g = this.game;
    const ais = g.players.filter((p) => p.ai);
    const next = ais.length ? [...this.localHumans(), ...ais] : null;
    const sig = (next ?? []).map((p) => p.hero + (p.ai ? 'a' : 'h')).join(',');
    if (sig !== this.partySig) { this.partySig = sig; g.party = next; g.hud?.rebuildCards?.(); }
    else g.party = next;
  }
  checkCapacity() {
    const s = this.session;
    if (this.humanCount() <= PEOPLE) return;
    const newest = [...s.order].reverse().find((u) => u !== s.me.uid);
    if (newest && newest !== this.fullSent) { this.fullSent = newest; s.send('full', { to: newest }); }
  }

  // ---------------------------------------------------------------- swapping into the companion
  requestSwap(human, dir = 1, wantKey = null) {
    const g = this.game, mgr = g.partyMgr;
    const list = mgr.takeable();
    if (!list.length) return false;
    const target = (wantKey && list.find((q) => this.keyOf(q) === wantKey)) || list[(dir > 0 ? 0 : list.length - 1)];
    if (this.isHost) return target.remote ? false : mgr.swap(human, target);
    if (mgr.locked || this.swapWait > performance.now()) return false;
    this.swapWait = performance.now() + 1500;
    this.session.send('swap', { k: this.keyOf(human), i: human.index, to: this.keyOf(target) });
    return true;
  }
  onSwap(d, peer) {
    const g = this.game, mgr = g.partyMgr;
    const no = (why) => this.session.send('swapno', { to: peer.uid, why });
    if (typeof d.k !== 'string' || typeof d.to !== 'string') return;
    const C = g.players.find((p) => p.ai && !p.remote && !p.heldFor && this.keyOf(p) === d.to);
    const R = this.remote.get(d.k);
    if (!C || C.dead || C.downed) return no('taken');
    if (!R || R.ai || mgr.locked) return no('busy');
    mgr.lock();
    // the requester's old hero becomes the companion, where it is now
    const X = new Player(g, C.index, 'ai', R.p.hero);
    X.spawn(R.p.pos.clone()); X.facing = R.p.facing; X.hp = Math.max(1, X.maxHp * (R.p.hp / Math.max(1, R.p.maxHp)));
    g.scene.add(X.object); g.players.push(X); mgr.add(X); X.netKey = 'ai:' + X.hero;
    const st = { x: r2(C.pos.x), y: r2(C.pos.y), z: r2(C.pos.z), f: r2(C.facing), hp: Math.round(C.hp), mh: Math.round(C.maxHp), ce: Math.round(C.ce) };
    this.removeHero(C);
    this.dropRemote(R, true);
    this.session.send('swapok', { to: peer.uid, k: d.k, i: int(d.i, 0, 7), h: C.hero, ...st });
    g.fx?.summonCircle?.(X.pos, 0xffd84a); g.fx?.summonCircle?.(V3(st.x, st.y, st.z), 0xffd84a);
    this.setParty();
  }
  onSwapOk(d) {
    const g = this.game;
    const p = this.localHumans().find((q) => q.index === d.i && this.keyOf(q) === d.k);
    this.swapWait = 0;
    if (!p || !HEROES[d.h]) return;
    if (d.take) toast(t('online.takeOver', { hero: HEROES[d.h].name }), 'big');
    const np = new Player(g, p.index, p.device, d.h);
    np.spawn(V3(num(d.x, -1e5, 1e5), num(d.y, -1e4, 1e4), num(d.z, -1e5, 1e5))); np.facing = num(d.f, -10, 10);
    np.hp = Math.min(np.maxHp, Math.max(1, num(d.hp, 1, 1e5, np.maxHp))); np.ce = num(d.ce, 0, 1e4, 30);
    p.gearOwner = p.device;
    this.removeHero(p); g.scene.add(np.object); g.players.push(np);
    g.partyMgr.lock();
    g.fx?.summonCircle?.(np.pos, 0xffd84a);
    toast(HEROES[d.h].full ?? HEROES[d.h].name);
    g.audio?.ui?.('buy');
    this.setParty(); g.hud?.rebuildCards?.();
  }

  // ---------------------------------------------------------------- topics
  onTopic(topic, d, peer) {
    const g = this.game;
    if (topic === 'ev') { if (peer) this.fx.receive(d, peer.uid); return; }
    if (topic === 'hit' && this.isHost) { this.onHits(d, peer); return; }
    if (topic === 'hurt') { this.onHurt(d); return; }
    if (topic === 'act' && this.isHost) { this.onAct(d, peer); return; }
    if (topic === 'load' && this.isGuest) { this.hostLoading = performance.now() + 45000; return; }
    if (topic === 'done' && this.isGuest) { if (g.mission && !g.mission.complete) g.completeMission(); return; }
    if (topic === 'swap' && this.isHost && peer) { this.onSwap(d, peer); return; }
    if (topic === 'swapok' && d.to === this.uid) { this.onSwapOk(d); return; }
    if (topic === 'swapno' && d.to === this.uid) { this.swapWait = 0; toast(t('online.gotThereFirst')); return; }
    if (topic === 'full' && d.to === this.uid) { this.leave({ quiet: true }); toast(t('online.campFull'), 'big'); }
  }
  onHits(d, peer) {
    const g = this.game;
    if (!Array.isArray(d.h)) return;
    for (const h of d.h.slice(0, 24)) {
      if (!Array.isArray(h)) continue;
      const [id, a, kx, kz, st, fl, key] = h;
      const e = g.enemies.find((q) => q.netId === id);
      if (!e || e.dead) continue;
      const src = typeof key === 'string' && KEY_RE.test(key) ? this.heroByKey(key) : null;
      if (fl & 2) e.mark = Math.max(e.mark ?? 0, 0.5);
      const dealt = e.takeDamage(num(a, 0, 5000), src, { knock: V3(num(kx, -40, 40), 0, num(kz, -40, 40)), stagger: num(st, 0, 3), unblockable: !!(fl & 1), remote: true });
      if (dealt > 0 && src) { e.lastAttacker = src; e.lastHitT = g.time; }
      this.stats.hitsApplied++;
    }
    void peer;
  }
  onHurt(d) {
    if (d.to !== this.uid) return;
    const p = this.game.players.find((q) => !q.remote && !q.ai && this.keyOf(q) === d.k);
    if (!p) return;
    if (d.st > 0) { holdHero(this.game, p, { kind: 'stun', dur: num(d.st, 0, 4) }); if (!(d.a > 0)) return; }
    p.takeDamage(num(d.a, 0, 500), null, { knock: d.nk ? null : V3(num(d.kx, -40, 40), 0, num(d.kz, -40, 40)), pure: !!d.p, dot: !!d.dot, noKnock: !!d.nk });
  }
  onAct(d, peer) {
    const g = this.game, m = g.mission;
    if (d.k === 'reveal') { const e = g.enemies.find((q) => q.netId === d.id); if (e?.disguised) e.reveal?.(); return; }
    // the opening: a guest reached the school bus; a guest asks to skip the cutscene (all guests must)
    if (d.k === 'bus' && g.mode === 'prologue') { g.opening?.prologueDone(); return; }
    if (d.k === 'skip' && g.cutscene && !g.cutscene.remote && d.id === g.cutscene.id) { g.cutscene.vote(peer?.uid ?? '?', Math.max(1, this.session?.byUid.size ?? 1)); toast(t('online.wantsToSkip', { name: peer?.name ?? t('online.someone') })); return; }
    if (!m) return;
    if (d.k === 'item') { const it = m.obj.items[d.i]; if (it && !it.done) m.completeItem(it); }
    if (d.k === 'chest') { const c = m.L.chests[d.i]; if (c && !c.opened) m.openChest(c, this.localHumans()[0] ?? g.players[0]); }
    if (d.k === 'obj' && typeof d.u === 'string') m.onNetAct?.(d);
    if (d.k === 'exit' && (m.boss?.dead || m.exitOpen)) g.completeMission();
  }
  // a guest held skip during a cutscene
  cutsceneSkip(id) { if (this.ready && this.isGuest) this.session.send('act', { k: 'skip', id }); }
  // called by the game when this browser finishes a chapter
  completed() {
    if (!this.ready) return;
    if (this.isHost) this.session.send('done', {});
    else this.session.send('act', { k: 'exit' });
  }
}

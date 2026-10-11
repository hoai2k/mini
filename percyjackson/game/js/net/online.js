// Online co-op through the shared mini-rooms relay (see MULTIPLAYER.md).
//
// Ownership (who decides what):
//   presence, every browser   its own heroes: hero id, position, facing,
//                             velocity, animation, health, downed/dead.
//   presence, host only       `setup` (camp or which chapter, with the level
//                             seed: guests build the identical level) and
//                             `world` (monsters, the objective, chests, the
//                             boss), about 12 times a second.
//   topic `hit`   guest→host  a guest's hero hit a monster: the host applies it.
//   topic `hurt`  host→guest  a monster hit a guest's hero: that guest applies it.
//   topic `act`   guest→host  a guest freed a captive, destroyed an object,
//                             opened a chest or took the way out.
//   topic `done`  host→all    the chapter is complete.
//
// The host runs everything (monster AI, the chapter, loot drops). Guests run
// their own heroes for instant controls, and show the host's monsters as
// puppets that follow the host's snapshots. Remote heroes on every browser
// are puppets that follow their owner's presence. Each browser keeps its own
// save: loot, drachmas, XP and chapter progress are earned locally.
import * as THREE from 'three/webgpu';
import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/bosses.js';
import { toast } from '../ui/ui.js';

const V = 1;                      // protocol version
const GAME = 'halfbloodquests';
const SEND_HZ = 12;
const tmp = new THREE.Vector3();
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const r2 = (v) => Math.round(v * 100) / 100;

// Load the shared client once (published next to the game; in the repository
// it lives in multiplayer/client/).
let clientLoad = null;
export function loadClient() {
  if (window.MiniRooms) return Promise.resolve(window.MiniRooms);
  clientLoad ??= new Promise((resolve, reject) => {
    const tryLoad = (srcs) => {
      if (!srcs.length) { reject(new Error('Could not load the multiplayer client')); return; }
      const s = document.createElement('script');
      s.src = srcs[0];
      s.onload = () => (window.MiniRooms ? resolve(window.MiniRooms) : tryLoad(srcs.slice(1)));
      s.onerror = () => { s.remove(); tryLoad(srcs.slice(1)); };
      document.head.appendChild(s);
    };
    tryLoad(['./mini-rooms.js', '../../multiplayer/client/mini-rooms.js']);
  });
  return clientLoad;
}

const uidNow = () => 'u' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export class Online {
  constructor(game) {
    this.game = game;
    this.uid = uidNow();
    this.room = null; this.net = null;
    this.peers = new Map();       // uid -> { name, heroes: Map(idx -> Player), last }
    this.puppets = new Map();     // guests: netId -> enemy puppet
    this.sendT = 0; this.setupNonce = 0; this.appliedNonce = -1;
    this.netSeq = 0;
  }
  get active() { return !!this.room; }
  get isHost() { return !!this.room?.isHost; }
  get isGuest() { return !!this.room && !this.room.isHost; }

  async connect() { const MR = await loadClient(); this.net ??= MR.connect(GAME); return this.net; }
  async host(name) {
    const net = await this.connect();
    this.name = name;
    this.room = net.host(net.newRoomId(), { title: `${name}'s camp`, name, capacity: 4 });
    this.wire();
    this.setupNonce++;
    toast('Your camp is open online. Friends can join from their Iris fountain.', 'big');
  }
  async join(roomId, name) {
    const net = await this.connect();
    this.name = name;
    this.room = net.join(roomId, { name });
    this.wire();
    toast('Joining…');
  }
  wire() {
    const room = this.room;
    room.subscribePresence(({ peers }) => this.onPresence(peers));
    room.subscribeTopic('hit', (d) => this.onHit(d));
    room.subscribeTopic('hurt', (d) => this.onHurt(d));
    room.subscribeTopic('act', (d) => this.onAct(d));
    room.subscribeTopic('done', (d) => this.onDone(d));
    room.onClose((reason) => this.onClose(reason));
    this.unload = () => this.room?.leave();
    window.addEventListener('beforeunload', this.unload);
    // AI companions don't come online: one hero per person
    const g = this.game;
    for (const p of [...g.players]) if (p.ai) { g.removePlayer(p); g.players.splice(g.players.indexOf(p), 1); }
    g.party = null; g.partyMgr.clear(); g.hud.rebuildCards?.();
  }
  leave(reason = 'left') {
    if (!this.room) return;
    const room = this.room; this.room = null;
    try { room.leave(); } catch (e) { /* already closed */ }
    window.removeEventListener('beforeunload', this.unload);
    this.dropAllPeers();
    this.clearPuppets();
    if (reason !== 'left') toast(reason === 'host_left' ? 'The host closed their camp.' : `Disconnected (${reason}).`, 'big');
  }
  onClose(reason) {
    if (!this.room) return;
    const wasGuest = this.isGuest;
    this.leave(reason);
    if (wasGuest) this.game.returnToHub();
  }

  // ---------------------------------------------------------------- sending
  update(dt) {
    if (!this.room?.ready) return;
    const g = this.game;
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 1 / SEND_HZ;
    const heroes = g.players.filter((p) => !p.remote && !p.ai).map((p) => {
      const a = p.action;
      return { i: p.index, h: p.hero, x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), f: r2(p.facing), vx: r2(p.vel.x), vz: r2(p.vel.z), hp: Math.round(p.hp), mh: Math.round(p.maxHp), a: a?.type ?? null, s: a?.style ?? a?.step?.style ?? null, t: r2(a?.t ?? 0), d: p.downed ? 1 : p.dead ? 2 : 0 };
    });
    const msg = { v: V, uid: this.uid, name: this.name, heroes };
    if (this.isHost) { msg.setup = this.setup(); msg.world = this.worldSnapshot(); }
    this.room.publishPresence(msg);
  }
  setup() {
    const g = this.game;
    if (g.mode === 'mission' && g.mission) {
      const d = g.mission.def;
      return { n: this.setupNonce, mode: 'mission', def: { biome: d.biome, objective: d.objective, boss: d.boss, difficulty: d.difficulty, seed: d.seed, chapter: d.chapter ?? null, mist: d.mist ?? 0, disguise: d.disguise ?? [], objText: d.objText ?? null } };
    }
    return { n: this.setupNonce, mode: 'hub' };
  }
  worldSnapshot() {
    const g = this.game, m = g.mission;
    const enemies = [];
    for (const e of g.enemies) {
      if (e.isDummy) continue;
      e.netId ??= ++this.netSeq;
      enemies.push([e.netId, e.isBoss ? 'B:' + e.id : e.kind, r2(e.pos.x), r2(e.pos.y), r2(e.pos.z), r2(e.facing ?? 0), Math.round((e.hp / e.maxHp) * 1000) / 1000, (e.dead ? 1 : 0) | (e.disguised ? 2 : 0) | (e.elite ? 4 : 0), e.state ?? e.anim ?? '', e.elite ?? null, e.disguise ?? e.disguiseKind ?? null]);
    }
    const out = { enemies, sight: g.mist.active ? 1 : 0 };
    if (m) out.m = { od: m.objDone ? 1 : 0, items: m.obj.items.map((it) => (it.done ? 1 : 0)), chests: m.L.chests.map((c) => (c.opened ? 1 : 0)), boss: m.boss ? (m.boss.dead ? 2 : 1) : 0, x: m.netState?.() };
    return out;
  }
  // Remember a change of scene so guests follow.
  sceneChanged() { if (this.isHost) { this.setupNonce++; this.sendT = 0; } }

  // ---------------------------------------------------------------- receiving
  onPresence(peers) {
    const g = this.game;
    const seen = new Set();
    let hostSeen = false;
    for (const data of Object.values(peers)) {
      if (!data || data.v !== V || typeof data.uid !== 'string') continue;
      seen.add(data.uid);
      const peer = this.peers.get(data.uid) ?? this.addPeer(data.uid, data.name);
      peer.last = performance.now();
      this.syncPeerHeroes(peer, Array.isArray(data.heroes) ? data.heroes.slice(0, 4) : []);
      if (data.setup && this.isGuest) { hostSeen = true; this.applySetup(data.setup); if (data.world) this.applyWorld(data.world); }
    }
    for (const [uid, peer] of this.peers) if (!seen.has(uid) && performance.now() - peer.last > 3000) this.dropPeer(uid);
    void hostSeen; void g;
  }
  addPeer(uid, name) {
    const peer = { uid, name: String(name ?? 'Demigod').slice(0, 24), heroes: new Map(), last: performance.now() };
    this.peers.set(uid, peer);
    toast(`${peer.name} joined`);
    this.sendT = 0;
    return peer;
  }
  dropPeer(uid) {
    const g = this.game, peer = this.peers.get(uid);
    if (!peer) return;
    for (const p of peer.heroes.values()) { g.removePlayer(p); g.players.splice(g.players.indexOf(p), 1); }
    this.peers.delete(uid);
    toast(`${peer.name} left`);
    g.hud.rebuildCards?.();
  }
  dropAllPeers() { for (const uid of [...this.peers.keys()]) this.dropPeer(uid); }
  syncPeerHeroes(peer, list) {
    const g = this.game;
    const keep = new Set();
    for (const h of list) {
      const i = num(h.i, 0) | 0; keep.add(i);
      let p = peer.heroes.get(i);
      if (p && p.hero !== h.h) { g.removePlayer(p); g.players.splice(g.players.indexOf(p), 1); p = null; }
      if (!p) {
        if (!g.level) continue;
        p = g.addPlayer(`net:${peer.uid}:${i}`, typeof h.h === 'string' ? h.h : 'percy');
        p.remote = { uid: peer.uid, idx: i, name: peer.name };
        p.spawn(new THREE.Vector3(num(h.x), num(h.y), num(h.z)));
        this.hookRemoteHero(p);
        peer.heroes.set(i, p);
      }
      const R = p.remote;
      R.target = (R.target ?? new THREE.Vector3()).set(num(h.x, p.pos.x), num(h.y, p.pos.y), num(h.z, p.pos.z));
      R.facing = num(h.f, p.facing); R.vx = num(h.vx); R.vz = num(h.vz);
      p.hp = num(h.hp, p.hp); p.maxHp = Math.max(1, num(h.mh, p.maxHp));
      p.downed = h.d === 1; p.dead = h.d === 2;
      R.act = typeof h.a === 'string' ? h.a : null; R.style = typeof h.s === 'string' ? h.s : null; R.actT = num(h.t);
    }
    for (const [i, p] of peer.heroes) if (!keep.has(i)) { g.removePlayer(p); g.players.splice(g.players.indexOf(p), 1); peer.heroes.delete(i); }
  }
  // A remote hero is a puppet: no input, no physics; it follows presence.
  // On the host, monsters hitting it send `hurt` to its owner instead.
  hookRemoteHero(p) {
    const self = this;
    p.update = function (dt) { self.drivePuppetHero(this, dt); };
    p.takeDamage = function (amount, src, o = {}) {
      if (!self.isHost || this.dead || this.downed) return 0;
      self.room?.publishTopic('hurt', { v: V, to: this.remote.uid, i: this.remote.idx, a: Math.round(amount * 10) / 10, kx: r2(o.knock?.x ?? 0), kz: r2(o.knock?.z ?? 0), p: o.pure ? 1 : 0 });
      this.game.fx.hitSpark?.(this.pos.clone().setY(this.pos.y + 1));
      return amount;
    };
    p.heal = function () {};
    p.gainCE = function () {};
  }
  drivePuppetHero(p, dt) {
    const R = p.remote; if (!R?.target) return;
    if (p.pos.distanceTo(R.target) > 8) p.pos.copy(R.target);
    else { p.pos.x += R.vx * dt; p.pos.z += R.vz * dt; p.pos.lerp(R.target, 1 - Math.exp(-11 * dt)); }
    p.vel.set(R.vx, 0, R.vz);
    p.facing = R.facing;
    const a = R.act ? { type: R.act, style: R.style ?? undefined, t: R.actT, step: { strike: 0.5, windup: 0.25 }, windup: 0.25, strike: 0.5 } : null;
    p.object.position.copy(p.pos); p.object.rotation.y = p.facing;
    const speed = Math.min(1, Math.hypot(R.vx, R.vz) / p.speed);
    p.rig.animate({ dt, speed: R.act === 'dodge' ? 0 : speed, vel: p.vel, action: p.dead ? { type: 'death', t: 1 } : p.downed ? { type: 'down', t: 1 } : a });
  }

  // guests: build what the host is showing
  applySetup(s) {
    const g = this.game;
    if (typeof s.n !== 'number' || s.n === this.appliedNonce) return;
    if (s.mode === 'mission' && s.def && typeof s.def.seed === 'number') {
      if (g.minigame?.abort) g.minigame.abort();
      this.appliedNonce = s.n;
      this.clearPuppets();
      g.startMission({ ...s.def, remote: true });
      this.puppetizeMission();
    } else if (s.mode === 'hub') {
      this.appliedNonce = s.n;
      this.clearPuppets();
      if (g.mode !== 'hub') { g.ui.closeAll(); g.paused = false; g.returnToHub(); }
    }
  }
  // On a guest the chapter runs without spawning: monsters come from the host.
  puppetizeMission() {
    const g = this.game, m = g.mission;
    if (!m) return;
    m.remote = true;
    m.spawnWave = function () { this.waveIdx = this.waves?.length ?? 0; };
    m.altarWave = function () {};
    m.startBoss = function (room) { this.bossSpawned = true; this.bossRoom = room; };
    const self = this;
    const completeItem = m.completeItem.bind(m), openChest = m.openChest.bind(m);
    m.completeItem = (it) => { if (!it.done) self.room?.publishTopic('act', { v: V, k: 'item', i: m.obj.items.indexOf(it) }); completeItem(it); };
    m.openChest = (c, p) => { if (!c.opened) self.room?.publishTopic('act', { v: V, k: 'chest', i: m.L.chests.indexOf(c) }); openChest(c, p); };
    for (const room of m.L.rooms) room.waves = [];
  }
  applyWorld(w) {
    const g = this.game, m = g.mission;
    if (!Array.isArray(w.enemies)) return;
    const seen = new Set();
    for (const row of w.enemies.slice(0, 80)) {
      const [id, kind, x, y, z, f, hpf, flags, state, elite, disguise] = row;
      if (typeof id !== 'number' || typeof kind !== 'string') continue;
      seen.add(id);
      let e = this.puppets.get(id);
      if (!e) {
        if (flags & 1) continue;
        e = this.spawnPuppet(id, kind, new THREE.Vector3(num(x), num(y), num(z)), { elite, disguise: flags & 2 ? disguise : null });
        if (!e) continue;
      }
      e.net = { x: num(x, e.pos.x), y: num(y, e.pos.y), z: num(z, e.pos.z), f: num(f, e.facing), state: String(state ?? '') };
      e.hp = Math.max(0, num(hpf, 1)) * e.maxHp;
      if (e.disguised && !(flags & 2)) e.reveal?.();
      if (flags & 1 && !e.dead) this.killPuppet(e);
    }
    for (const [id, e] of this.puppets) if (!seen.has(id)) { if (!e.dead) this.killPuppet(e, true); this.puppets.delete(id); }
    // the chapter's shared state
    if (m && w.m) {
      w.m.items?.forEach((d, i) => { const it = m.obj.items[i]; if (d && it && !it.done) m.completeItem(it); });
      w.m.chests?.forEach((d, i) => { const c = m.L.chests[i]; if (d && c && !c.opened) m.openChest(c, g.players[0]); });
      if (w.m.x) m.applyNet?.(w.m.x);
      if (w.m.od && !m.objDone) { m.obj.done = m.obj.need; m.checkObjective(); }
    }
    if (w.sight && !g.mist.active && g.mist.available) g.mist.toggle(g.players[0]);
  }
  spawnPuppet(id, kind, pos, { elite, disguise }) {
    const g = this.game;
    let e;
    try {
      if (kind.startsWith('B:')) {
        e = new Boss(g, kind.slice(2), pos, g.mission?.def.difficulty ?? 1);
        e.intro = 0;
        if (g.mission) { g.mission.boss = e; g.hud.setBoss(e); g.mission.updateText(); }
      } else e = new Enemy(g, kind, pos, { elite: elite || null, level: g.mission?.def.difficulty ?? 1, disguise: disguise || null });
    } catch (err) { console.warn('puppet', kind, err); return null; }
    e.netId = id; e.puppet = true;
    const self = this;
    const realTake = e.takeDamage.bind(e);
    e.takeDamage = function (amount, src, o = {}) {
      if (this.dead || this.untargetable || this.disguised) return 0;
      self.room?.publishTopic('hit', { v: V, id, a: Math.round(amount * 10) / 10, kx: r2(o.knock?.x ?? 0), kz: r2(o.knock?.z ?? 0), st: r2(o.stagger ?? 0), m: this.mark > 0 ? 1 : 0 });
      this.flashT = 0.1;
      g.fx.damageNumber?.(this.pos, amount, { crit: o.crit, color: o.color });
      return amount;
    };
    e.realTakeDamage = realTake;
    e.update = function (dt) { self.drivePuppetEnemy(this, dt); return !(this.dead && (this.deathT ?? 0) > 2.5); };
    g.scene.add(e.object); g.enemies.push(e);
    this.puppets.set(id, e);
    return e;
  }
  drivePuppetEnemy(e, dt) {
    const n = e.net; if (!n) return;
    if (e.dead) { e.deathT = (e.deathT ?? 0) + dt; e.rig.setDissolve?.(Math.min(1, e.deathT / 1.5)); e.rig.animate?.({ dt, speed: 0, vel: e.vel, action: { type: 'death', t: Math.min(1, e.deathT) } }); return; }
    const target = tmp.set(n.x, n.y, n.z);
    if (e.pos.distanceTo(target) > 10) e.pos.copy(target);
    const before = e.pos.clone();
    e.pos.lerp(target, 1 - Math.exp(-10 * dt));
    e.vel.subVectors(e.pos, before).divideScalar(Math.max(dt, 1e-3));
    e.facing = n.f;
    e.object.position.copy(e.pos); e.object.rotation.y = e.facing;
    const st = n.state;
    const action = /windup|attack|strike/.test(st) ? { type: 'attack', style: 'swingR', t: 0.5, windup: 0.3, strike: 0.5, step: {} } : st === 'stagger' ? { type: 'stagger', t: 0.5 } : null;
    const speed = Math.min(1, Math.hypot(e.vel.x, e.vel.z) / Math.max(1, e.speed ?? 3));
    e.rig.animate?.({ dt, speed, vel: e.vel, action });
    e.rig.tick?.(dt, e);
    if (e.flashT > 0) { e.flashT -= dt; e.rig.swap?.(e.flashT > 0 ? this.game.flashMaterial : null); }
  }
  killPuppet(e, quiet = false) {
    if (e.dead) return;
    e.hp = 0;
    if (quiet) { e.dead = true; this.game.scene.remove(e.object); return; }
    // let the monster's own death run (dust, drachmas and XP for this player)
    e.takeDamage = e.realTakeDamage ?? e.takeDamage;
    try { if (e.die) e.die({}); } catch (err) { console.warn('puppet death', err); }
    e.dead = true; e.deathT = 0;
  }
  clearPuppets() {
    const g = this.game;
    for (const e of this.puppets.values()) { g.scene.remove(e.object); const i = g.enemies.indexOf(e); if (i >= 0) g.enemies.splice(i, 1); }
    this.puppets.clear();
  }

  // host: a guest's hit
  onHit(d) {
    if (!this.isHost || d?.v !== V) return;
    const g = this.game;
    const e = g.enemies.find((q) => q.netId === d.id);
    if (!e || e.dead) return;
    const a = Math.min(5000, Math.max(0, num(d.a)));
    const knock = new THREE.Vector3(num(d.kx), 0, num(d.kz));
    if (d.m) e.mark = Math.max(e.mark ?? 0, 0.5);
    e.takeDamage(a, null, { knock, stagger: num(d.st), remote: true });
  }
  // guest: a monster hit one of my heroes
  onHurt(d) {
    if (d?.v !== V || d.to !== this.uid) return;
    const p = this.game.players.find((q) => !q.remote && !q.ai && q.index === d.i) ?? this.game.players.find((q) => !q.remote && !q.ai);
    if (!p) return;
    p.takeDamage(Math.min(500, Math.max(0, num(d.a))), null, { knock: new THREE.Vector3(num(d.kx), 0, num(d.kz)), pure: !!d.p });
  }
  onAct(d) {
    if (!this.isHost || d?.v !== V) return;
    const m = this.game.mission; if (!m) return;
    if (d.k === 'item') { const it = m.obj.items[d.i]; if (it && !it.done) m.completeItem(it); }
    if (d.k === 'chest') { const c = m.L.chests[d.i]; if (c && !c.opened) m.openChest(c, this.game.players[0]); }
    if (d.k === 'obj' && typeof d.u === 'string') m.onNetAct?.(d);
    if (d.k === 'exit' && (m.boss?.dead || m.exitOpen)) this.game.completeMission();
  }
  onDone(d) {
    if (!this.isGuest || d?.v !== V) return;
    const g = this.game;
    if (g.mission && !g.mission.complete) g.completeMission();
  }
  // called by the game when this browser finishes a chapter
  completed() {
    if (this.isHost) this.room?.publishTopic('done', { v: V });
    else this.room?.publishTopic('act', { v: V, k: 'exit' });
  }
}

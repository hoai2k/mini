// Chapter 1, the museum: a calm walk through the galleries to Mrs. Dodds;
// the moment a hero sees her the Mist lifts, she becomes the Fury and tells
// you how to see through it (the button of your device); then every monster
// in disguise in the museum comes for you, a few at a time, and she fights
// you in her room, shrieking and flying off three times to rooms you must
// find her in. The rules are in story/museumRules.js (pure, tested); this
// runs them.
//
// Online the host runs it all: the reveal, who hunts, her flights. Guests get
// { ph, f, fl, d, k } in the host's snapshot and play the speech, the hints
// and the arrow to her on their own screens, in their own device's words;
// a guest's True Sight toggles the host's (one shared view, which decides who
// looks like a person and who like a monster).
import * as THREE from 'three/webgpu';
import { toast } from '../ui/ui.js';
import { t } from '../text_config.js';
import { isGuest, sendAct, heroKey, heroByKey, inRoom } from './common.js';
import { lineOfSight } from '../entities/enemy.js';
import { distanceField } from '../ui/tracker.js';
import {
  PHASES, sees, finds, BEAT, BEAT_LINES, FLIGHT_AT, nextFloor, flightPlan, flowDir,
  monsterShare, DODDS_DMG, HUNT_EVERY, HUNT_FIRST, huntLimit, huntGroup, doddsLine, mistHurtHint, GONE,
} from '../story/museumRules.js';

const DEG = Math.PI / 180;
const DRAIN = 0.35, REFILL = 1.4;     // True Sight lasts ~12 s and refills in ~7 s once the fight is on
const NAME = t('objectives.museum.name'), FLED = t('objectives.museum.fled');

export class MuseumObjective {
  constructor(m) {
    this.m = m; this.g = m.game;
    this.phase = 'calm'; this.flights = 0; this.fled = false; this.landed = false;
    this.autoBoss = false;      // (mission.js: she is started here, not by the arena)
    this.quietMist = true;      // (main.js: she explains True Sight; no hint at the door)
    this.ownLook = true;        // (mist.js: who looks like what is decided here)
    this.mistShare = monsterShare(m.def.difficulty ?? 1);
    this.huntT = HUNT_FIRST; this.losT = 0; this.fieldT = 0; this.field = null;
    this.hpSeen = new Map(); this.hinted = false;
    this.route = (e, want) => this.routeFoe(e, want);
  }
  get L() { return this.m.L; }
  setup() {
    const m = this.m, g = this.g, L = this.L;
    // a field trip until she shows herself: no traps slamming shut
    for (const r of L.rooms) if (r.trap) { r.trap = null; r.waves = []; }
    // no kill count: the way to her gallery is open from the start
    m.obj.need = 0; m.obj.done = 0;
    m.objDone = true; g.objectiveDone = true;
    for (const gate of L.gates) m.openGate(gate);
    this.room = L.bossRoom; this.fightRoom = this.room;
    const sp = this.room.spawns?.[0] ?? [this.room.center.x, this.room.y, this.room.center.z];
    this.home = m.standAt(sp[0], sp[1], sp[2]) ?? new THREE.Vector3(sp[0], sp[1], sp[2]);
    this.plan = flightPlan(L.rooms, L.rooms.indexOf(this.room));
    this.spots = this.plan.map((i) => this.spotIn(L.rooms[i]));
    if (!isGuest(m)) {
      this.standIn = g.spawnEnemy('mortal', this.home, { disguise: m.def.disguise?.[0] ?? 'teacher' });
      if (this.standIn) { this.standIn.doddsStandIn = true; this.standIn.facing = Math.PI; }
    }
    this.goal();
  }
  // Open floor in a room to fight her in: the spawn spot nearest its middle.
  spotIn(room) {
    const m = this.m, c = room.center;
    const list = (room.spawns?.length ? room.spawns : [[c.x, room.y, c.z]]).slice().sort((a, b) => Math.hypot(a[0] - c.x, a[2] - c.z) - Math.hypot(b[0] - c.x, b[2] - c.z));
    for (const sp of list) { const at = m.standAt(sp[0], sp[1], sp[2]); if (at && !this.g.world.liquidAt?.(at.x, at.y + 0.5, at.z)) return at; }
    return new THREE.Vector3(c.x, room.y, c.z);
  }
  dev() {
    const g = this.g, p = g.players.find((q) => !q.remote && !q.ai);
    return g.input?.lastDevice ?? p?.device ?? 'kbm';
  }
  heroes() { return this.g.players.filter((p) => !p.dead && !p.downed); }
  // ---------------------------------------------------------------- where to go
  goal() {
    const g = this.g, b = this.m.boss;
    if (this.phase === 'calm') g.tracker?.setGoal({ title: this.m.def.objText ?? t('objectives.museum.title'), desc: t('objectives.museum.waiting'), pos: this.home, radius: 2, mission: true });
    else if (this.fled && this.dest && !(b?.dead)) g.tracker?.setGoal({ title: t('objectives.museum.find'), desc: GONE, pos: this.dest, radius: 2.5, mission: true });
    else g.tracker?.setGoal(null);
    this.m.updateText();
  }
  text() {
    const b = this.m.boss;
    if (this.phase === 'calm') return [this.m.def.objText ?? t('objectives.museum.title'), t('objectives.museum.waiting')];
    if (b?.dead || this.killed) return null;
    if (this.phase === 'reveal') return [t('objectives.museum.name'), t('objectives.museum.mistLifts')];
    if (this.fled) return [t('objectives.museum.find'), GONE];
    return [t('objectives.museum.defeat'), t('objectives.museum.defeatDesc')];
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const m = this.m, g = this.g;
    if (this.resumeFrom) { const s = this.resumeFrom; this.resumeFrom = null; this.resume(s); }
    if (!this.gatesOpen && this.L.gates.every((gt) => gt.opened)) { this.gatesOpen = true; if (this.phase === 'calm') this.goal(); }   // (the way, once the gallery's gate has gone)
    this.nameTag();
    this.speech(dt);
    this.hurtHint();
    if (isGuest(m)) return;
    this.foes();
    if (this.phase === 'calm') this.watchForHer(dt);
    else if (this.phase === 'reveal') { this.beatT += dt; if (this.beatT >= BEAT) this.startHunt(); }
    else this.fight(dt);
  }
  // The heroes coming into her gallery, or seeing her from close by (or
  // seeing through her with True Sight).
  watchForHer(dt) {
    const g = this.g;
    // (a guest who just took over as host finds her among the people it was shown)
    if (!this.standIn) this.standIn = g.enemies.find((e) => !e.dead && e.def?.mortal && e.pos.distanceTo(this.home) < 6) ?? g.spawnEnemy('mortal', this.home, { disguise: this.m.def.disguise?.[0] ?? 'teacher' });
    const st = this.standIn;
    if (!st || st.dead) return;
    if (g.mist.active && g.mist.inside(st.pos)) { this.startReveal(g.mist.source); return; }
    this.losT -= dt; if (this.losT > 0) return;
    this.losT = 0.2;
    for (const p of this.heroes()) {
      const dist = p.pos.distanceTo(st.pos);
      const room = inRoom(p.pos, this.room, -1);
      if (sees({ dist, inRoom: room, los: !room && dist <= 14 && lineOfSight(g.world, p.pos, 1.5, st.pos, 1.5) })) { this.startReveal(p); return; }
    }
  }
  // ---------------------------------------------------------------- the reveal
  startReveal(by) {
    const m = this.m, g = this.g;
    if (this.phase !== 'calm') return;
    const st = this.standIn, pos = (st && !st.dead ? st.pos : this.home).clone();
    if (st) { st.dead = true; st.hp = 0; g.scene.remove(st.object); g.enemies = g.enemies.filter((e) => e !== st); this.standIn = null; }
    g.particles?.burst?.(pos.clone().setY(pos.y + 1), { count: 60, color: 0xffd84a, speed: 4, up: 3, life: 1.2, size: 0.2, sizeEnd: 0.02 });
    g.fx.flash(0xffd84a, 0.4, 0.3);
    // the Mist lifts on its own
    const lead = by && !by.dead ? by : this.heroes()[0];
    g.mist.meter = 1; g.mist.drainMul = 0;   // (it stays lifted while she talks)
    if (!g.mist.active && lead) g.mist.toggle(lead);
    m.bossSpawned = true;
    m.spawnBoss(this.room, pos, { holdTitle: true });   // (her title would cover what she says)
    const b = m.boss;
    b.standBy = true; b.untargetable = true;
    b.skipPatterns = new Set(['summon_pups']); b.dmg *= DODDS_DMG;   // (her pets are the museum crowd)
    b.hpFloor = nextFloor(0) * b.maxHp; b.onFloor = () => this.flee();
    if (lead) b.facing = Math.atan2(lead.pos.x - pos.x, lead.pos.z - pos.z);
    g.rig.cinematic({ center: pos.clone().setY(pos.y + 2), dur: BEAT - 0.6, dist: 12, pitch: 30 * DEG, orbit: 0.05 });
    this.phase = 'reveal';
    this.beginBeat();
    this.goal();
  }
  beginBeat() { this.beatT = 0; this.linesSaid = 0; }
  // Her lines over her head, each when its time comes, in this screen's device words.
  speech(dt) {
    const g = this.g, b = this.m.boss;
    if (this.phase !== 'reveal' || this.beatT == null) return;
    if (isGuest(this.m)) this.beatT += dt;
    for (const p of g.players) if (!p.remote) p.iframes = Math.max(p.iframes ?? 0, 0.3);   // (nothing fights while she talks)
    while (this.linesSaid < BEAT_LINES.length && this.beatT >= BEAT_LINES[this.linesSaid][0]) {
      const [, secs] = BEAT_LINES[this.linesSaid++];
      this.say(doddsLine('reveal' + this.linesSaid, this.dev()), secs);
    }
  }
  say(line, secs = 3) {
    const g = this.g, b = this.m.boss;
    if (b && !b.dead) g.hud?.say?.(b, line, secs, { boss: true });
    else toast(`“${line}”`, 'big');
  }
  // After the reveal: everyone in disguise is after the heroes.
  startHunt() {
    const m = this.m, g = this.g, b = m.boss;
    this.phase = 'hostile';
    if (b && !b.dead) { b.standBy = false; b.untargetable = false; b.coWait = 0.6; }
    for (const r of this.L.rooms) if (!r.primed && (r.packs?.length || r.loose?.length)) m.spawnPacks(r);
    for (const e of g.enemies) if (e.foe) e.foe.wake = true;
    this.huntT = HUNT_FIRST;
    this.easeMist();
    g.mist.meter = Math.max(g.mist.meter, 0.85);
    if (b && !b.dead) toast(b.B.title, 'title boss');
    setTimeout(() => toast(t('objectives.museum.crowdTurns'), 'big'), 2600);
    this.goal();
  }
  easeMist() { this.g.mist.drainMul = DRAIN; this.g.mist.refillMul = REFILL; }
  // ---------------------------------------------------------------- the people in the Mist (host)
  // Who looks like what follows True Sight (story/museumRules.js foeState):
  // seen through, a monster; under the Mist, a person again.
  foes() {
    const g = this.g, mist = g.mist;
    const list = this.foeList = [];
    for (const e of g.enemies) {
      if (e.dead || e.isBoss || e.isDummy || e.def?.mortal || !e.disguise) continue;
      if (!e.foe) e.foe = { hunt: false, provoked: false, wake: this.phase === 'hostile', route: this.route };
      list.push(e);
      const seen = mist.active && mist.inside(e.pos);
      if (seen && e.disguised) e.reveal();
      else if (!seen && !e.disguised && !e.bones) e.redisguise();
    }
  }
  // A hunter far from the heroes follows the way through the rooms.
  routeFoe(e, want) {
    const t = e.target; if (!t || !this.field) return;
    if (Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z) < 8) return;
    const f = flowDir(this.field, e.pos.x, e.pos.z);
    if (f) want.set(f[0], 0, f[1]);
  }
  fight(dt) {
    const m = this.m, g = this.g, b = m.boss;
    if (!b) return;
    if (b.dead) { if (!this.killed) this.endHunt(); return; }
    if (!b.onFloor) {
      // (a guest who just took over as host: her flights carry on from where they were)
      b.onFloor = () => this.flee(); b.skipPatterns ??= new Set(['summon_pups']);
      const f = nextFloor(this.flights); b.hpFloor = f != null && b.hp > f * b.maxHp ? f * b.maxHp : null;
      if (this.fled) { b.standBy = true; b.untargetable = true; this.landed = true; this.destRoom ??= this.roomAt(b.pos); }
    }
    // the way through the museum to the party, for hunters far away
    this.fieldT -= dt;
    const foes = this.foeList ?? [];
    const lead = this.heroes().find((p) => !p.ai && !p.remote) ?? this.heroes()[0];
    if (this.fieldT <= 0 && lead && foes.some((e) => e.foe.hunt)) {
      this.fieldT = 1.5;
      try { this.field = distanceField(g.world, lead.pos.x, lead.pos.z, 1.5); } catch (err) { this.field = null; }
    }
    // a few more of them every so often, the nearest first
    this.huntT -= dt;
    if (this.huntT <= 0) {
      this.huntT = HUNT_EVERY;
      const hunting = foes.filter((e) => e.foe.hunt).length;
      const humans = Math.max(1, g.players.filter((p) => !p.ai).length);
      const room = huntLimit(m.def.difficulty ?? 1, humans) - hunting;
      if (room > 0) {
        const hs = this.heroes(), d = (e) => Math.min(...hs.map((p) => p.pos.distanceTo(e.pos)));
        const idle = foes.filter((e) => !e.foe.hunt).sort((a, b2) => d(a) - d(b2));
        for (const e of idle.slice(0, Math.min(room, huntGroup(Math.random())))) { e.foe.hunt = true; e.aggro = true; }
      }
    }
    // after a flight: waiting to be found
    if (this.fled && this.landed) {
      this.losT -= dt;
      if (this.losT <= 0) {
        this.losT = 0.2;
        for (const p of this.heroes()) {
          const dist = p.pos.distanceTo(b.pos), room = inRoom(p.pos, this.destRoom, -1);
          if (finds({ dist, inRoom: room, los: dist <= 10 && lineOfSight(g.world, p.pos, 1.5, b.pos, 1.5) })) { this.found(); break; }
        }
      }
    }
  }
  // ---------------------------------------------------------------- the flights (host)
  flee() {
    const m = this.m, b = m.boss;
    if (!b || b.dead || this.flights >= FLIGHT_AT.length) return;
    const n = this.flights++;
    const room = this.L.rooms[this.plan[n]] ?? this.room;
    this.destRoom = room; this.dest = this.spots[n] ?? this.spotIn(room); this.landed = false;
    b.untargetable = true; b.standBy = false;   // (from this hit on: no more damage, and no phase roar cutting in)
    b.co = b.dodds_flee(this.dest, { lift: () => this.lifted(n), land: () => { this.landed = true; this.losT = 0.5; } });
    b.coWait = 0;
  }
  lifted(n) {
    this.fled = true;
    this.onFled(n);
  }
  onFled(n) {
    toast(GONE, 'big');
    this.say(doddsLine('flee' + (n + 1), this.dev()), 2.6);
    this.goal();
  }
  found() {
    const m = this.m, b = m.boss;
    this.fled = false; this.landed = false;
    this.fightRoom = this.destRoom; m.bossRoom = this.destRoom;
    b.standBy = false; b.untargetable = false; b.co = null; b.coWait = 1.0; b.moving = true;
    const f = nextFloor(this.flights);
    b.hpFloor = f != null ? f * b.maxHp : null; b.onFloor = () => this.flee();
    this.g.audio?.voiceSample?.('screech', 0.95);
    this.onFound();
  }
  onFound() {
    toast(t('objectives.museum.thereSheIs'), 'big');
    this.say(doddsLine('found' + Math.max(1, Math.min(3, this.flights)), this.dev()), 2.4);
    this.goal();
  }
  // She is down: what's left of her pets crumbles back into the Mist.
  endHunt() {
    const g = this.g;
    this.killed = true;
    for (const r of this.L.rooms) { r.reserve = []; r.primed = true; }
    let n = 0;
    for (const e of g.enemies) {
      if (!e.foe || e.dead) continue;
      e.dead = true; e.deathT = 99; e.hp = 0; g.fx?.poof?.(e.pos); g.scene.remove(e.object); n++;
    }
    if (n) setTimeout(() => this.g.mission === this.m && toast(t('objectives.museum.petsCrumble')), 2600);
    g.mist.drainMul = 1; g.mist.refillMul = 1;
    this.goal();
  }
  // ---------------------------------------------------------------- every screen
  // The bar over the screen reads "Mrs. Dodds", or "Mrs. Dodds — fled".
  nameTag() {
    const b = this.m.boss;
    if (!b || b.dead) return;
    const want = this.fled ? FLED : NAME;
    if (b.displayName !== want) { b.displayName = want; this.g.hud?.setBoss?.(b); }
  }
  // Hurt with the Mist up by someone right next to you who looks like a
  // person: once, how to see them (this screen's device words).
  hurtHint() {
    const g = this.g;
    if (this.hinted) return;
    for (const p of g.players) {
      if (p.remote || p.ai) continue;
      const prev = this.hpSeen.get(p); this.hpSeen.set(p, p.hp);
      if (prev == null || p.hp >= prev - 0.5 || g.mist.active || p.dead) continue;
      if (!g.enemies.some((e) => !e.dead && e.disguised && !e.def?.mortal && !e.doddsStandIn && e.pos.distanceTo(p.pos) < 3.4)) continue;
      this.hinted = true;
      for (const el of document.querySelectorAll('#toast-layer .toast.hint')) el.remove();
      toast(mistHurtHint(p.device === 'test' ? this.dev() : p.device), 'hint');
      return;
    }
  }
  // A guest's True Sight is the host's too (one shared view online).
  sightChanged(on, hero) {
    const g = this.g;
    if (!isGuest(this.m) || g.online?.applying || !hero) return;
    sendAct(g, { a: 'sight', on: on ? 1 : 0, h: heroKey(g, hero) });
  }
  // Where the party comes back after falling: where she last fought, away from her.
  retrySpot() {
    const m = this.m, b = m.boss;
    if (this.phase !== 'hostile' || !b || b.dead) return null;
    const room = this.fightRoom ?? this.room;
    const list = (room.spawns?.length ? room.spawns : [[room.center.x, room.y, room.center.z]]).slice().sort((a, c) => Math.hypot(c[0] - b.pos.x, c[2] - b.pos.z) - Math.hypot(a[0] - b.pos.x, a[2] - b.pos.z));
    for (const sp of list) { const at = m.standAt(sp[0], sp[1], sp[2]); if (at) return at; }
    return null;
  }
  // ---------------------------------------------------------------- online and Continue
  netState() {
    return { ph: PHASES.indexOf(this.phase), f: this.flights, fl: this.fled ? 1 : 0, d: this.fled && this.dest ? [this.dest.x, this.dest.y, this.dest.z].map((v) => Math.round(v * 10) / 10) : 0, k: this.m.boss?.dead || this.killed ? 1 : 0 };
  }
  applyNet(s) {
    if (!isGuest(this.m)) { this.resumeFrom = s; return; }   // (the host: a Continue)
    const ph = PHASES[s.ph | 0] ?? 'calm';
    if (ph !== this.phase) {
      const was = this.phase;
      this.phase = ph;
      if (ph === 'reveal') { this.beginBeat(); this.g.mist.drainMul = 0; }
      if (ph === 'hostile') { this.beatT = null; this.easeMist(); }
      if (was === 'calm' || ph === 'hostile') this.goal();
    }
    this.flights = Math.max(0, Math.min(3, s.f | 0));
    if (s.fl && !this.fled && Array.isArray(s.d)) { this.fled = true; this.dest = new THREE.Vector3(+s.d[0] || 0, +s.d[1] || 0, +s.d[2] || 0); this.destRoom = this.roomAt(this.dest); this.onFled(this.flights - 1); }
    else if (!s.fl && this.fled) { this.fled = false; this.onFound(); }
    if (s.k && !this.killed) { this.killed = true; this.g.mist.drainMul = 1; this.g.mist.refillMul = 1; this.goal(); }
  }
  onNetAct(d) {
    const g = this.g;
    if (d.a !== 'sight' || !!d.on === g.mist.active) return;
    if (d.on) { const p = heroByKey(g, d.h) ?? this.heroes()[0]; if (p) g.mist.toggle(p); }
    else g.mist.close();
  }
  // Continue after the reveal: straight back into the fight where it was
  // (her health at the last flight's mark; waiting to be found if she had flown).
  resume(s) {
    const m = this.m, g = this.g;
    const ph = PHASES[s.ph | 0] ?? 'calm';
    if (ph === 'calm') return;
    const st = this.standIn;
    if (st) { st.dead = true; g.scene.remove(st.object); g.enemies = g.enemies.filter((e) => e !== st); this.standIn = null; }
    this.phase = 'hostile';
    if (s.k) { this.killed = true; this.goal(); return; }
    const f = Math.max(0, Math.min(FLIGHT_AT.length, s.f | 0));
    this.flights = f;
    const room = f ? this.L.rooms[this.plan[f - 1]] ?? this.room : this.room, pos = f ? this.spots[f - 1] ?? this.spotIn(room) : this.home;
    m.bossSpawned = true;
    m.spawnBoss(room, pos);
    const b = m.boss;
    b.skipPatterns = new Set(['summon_pups']); b.dmg *= DODDS_DMG;
    if (f) b.hp = b.maxHp * FLIGHT_AT[f - 1];
    b.onFloor = () => this.flee();
    if (f) { this.fled = true; this.landed = true; this.dest = pos; this.destRoom = room; b.standBy = true; b.untargetable = true; }
    else b.hpFloor = nextFloor(0) * b.maxHp;
    for (const r of this.L.rooms) if (!r.primed && (r.packs?.length || r.loose?.length)) m.spawnPacks(r);
    this.easeMist();
    this.goal();
  }
  roomAt(pos) { return this.L.rooms.find((r) => inRoom(pos, r)) ?? this.room; }
  dispose() { this.g.tracker?.setGoal(null); }
}

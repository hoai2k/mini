// The party. Heroes are played by humans or by AI companions, and the party
// is always three heroes (four with four humans): the AI plays whoever is
// missing.
//   1 human    leads two companions (chosen on the hero select)
//   2 humans   one companion, the third hero: either human can swap into it
//   3–4        no companions, and switching does nothing
// Joining and leaving never costs anything: a player who joins takes over a
// companion's hero (with its health and place), and a player who leaves (or
// whose controller disconnects) hands their hero to the AI.
// The same rule counts every human in an online room (the host runs the
// companions). Companions drive their hero through a virtual input device, so
// they use exactly the same kits, combos, jumps and dodges as a player.
// Switching (D-pad ↓ / Tab) hands the human's device to the next companion and
// the AI takes over the old hero. Swaps are one at a time: after a swap nobody
// can swap for SWAP_LOCK seconds, so two humans pressing together never fight
// over one hero (the first press wins, the second is refused).
import * as THREE from 'three/webgpu';
import { HEROES, HERO_IDS } from './heroes/index.js';

const tmp = new THREE.Vector3();
export const SWAP_LOCK = 0.5;   // seconds

// How many AI companions a party of `humans` people has.
export function companionsWanted(humans) { return Math.max(0, 3 - humans); }
const PAD_GONE = 2;   // seconds a controller can be unplugged before the AI plays on for its player

export class Companion {
  constructor(game, player) {
    this.game = game; this.p = player;
    this.dev = 'ai' + player.index;
    this.think = 0; this.held = {};
    this.abilityT = 2 + Math.random() * 2;
    this.rangedT = 1;
    this.dodgeT = 0; this.jumpT = 0;
    this.stuckT = 0; this.lastPos = new THREE.Vector3();
  }
  leader() {
    const g = this.game;
    return g.players.find((q) => !q.ai && !q.dead && !q.downed) ?? g.players.find((q) => !q.ai) ?? null;
  }
  update(dt) {
    const g = this.game, p = this.p;
    if (p.dead) { g.input.setVirtual(this.dev); return; }
    const lead = this.leader();
    const held = {};
    let move = null;
    this.think -= dt; this.abilityT -= dt; this.rangedT -= dt; this.dodgeT -= dt; this.jumpT -= dt;
    const downed = g.players.find((q) => q !== p && q.downed && q.pos.distanceTo(p.pos) < 22);
    const anchor = lead ? lead.pos : p.pos;
    let target = null, td = 1e9;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable || e.disguised || e.isDummy) continue;
      // the prologue is the player's training: companions leave loitering rats alone and help once one attacks
      const training = g.mode === 'prologue';
      if (training && e.loiter && !e.aggro) continue;
      const d = e.pos.distanceTo(p.pos), da = e.pos.distanceTo(anchor);
      if (da > (training ? 8 : 13)) continue;
      if (d < td) { td = d; target = e; }
    }
    if (lead && p.pos.distanceTo(lead.pos) > 26) this.regroup(lead);
    if (downed) move = this.steer(downed.pos, 0.8);
    else if (target) {
      const reach = p.kit.combo?.[0]?.range ?? 2.4;
      if (td > reach * 0.85) move = this.steer(target.pos, reach * 0.7);
      // held attack repeats: hold it to chain the combo
      else { move = new THREE.Vector3(); held.attack = Math.random() < 0.9; }
      if (td > 4 && td < 11 && this.rangedT <= 0) { held.ranged = true; this.rangedT = 1.5 + Math.random() * 1.5; }
      if (this.abilityT <= 0 && td < 8) {
        const slots = ['t1', 't2', 't3'].filter((k) => p.kit.slots[k] && p.kit.slots[k].cdLeft <= 0 && p.ce >= (p.kit.slots[k].ce ?? 0));
        if (slots.length) held[slots[Math.floor(Math.random() * slots.length)]] = true;
        this.abilityT = 3 + Math.random() * 3;
      }
      if (p.ce >= p.maxCe && !g.domain && (target.isBoss || g.enemies.filter((e) => !e.dead && e.pos.distanceTo(p.pos) < 7).length >= 4)) held.domain = true;
      if (this.dodgeT <= 0 && this.inDanger()) {
        // dodge away from the target, or to a side, wherever there's floor to land on
        const away = tmp.subVectors(p.pos, target.pos).setY(0).normalize().clone();
        const dir = [away, new THREE.Vector3(-away.z, 0, away.x), new THREE.Vector3(away.z, 0, -away.x)].find((d) => this.floorAhead(d, 0.9) && this.floorAhead(d, 2.6));
        if (dir) { held.dodge = true; this.dodgeT = 1.2; move = dir; }
      }
    } else if (lead) {
      // follow in a loose formation behind the leader
      const slot = Math.max(0, (g.party ?? g.players).indexOf(p));
      const back = new THREE.Vector3(Math.sin(lead.facing), 0, Math.cos(lead.facing)).multiplyScalar(-2.2);
      const side = new THREE.Vector3(Math.cos(lead.facing), 0, -Math.sin(lead.facing)).multiplyScalar(slot % 2 ? 1.6 : -1.6);
      let spot = lead.pos.clone().add(back).add(side);
      if (!this.groundAt(spot.x, spot.z, lead.pos.y)) spot = lead.pos;   // (the spot is over a drop: just follow)
      if (p.pos.distanceTo(spot) > (spot === lead.pos ? 2 : 1.2)) move = this.steer(spot, 0.6, p.pos.distanceTo(lead.pos) > 7 ? 1 : 0.7);
    }
    // step aside from a human walking into us (doorways, corridors)
    for (const q of g.players) {
      if (q === p || q.ai || q.dead) continue;
      const dx = p.pos.x - q.pos.x, dz = p.pos.z - q.pos.z, d = Math.hypot(dx, dz);
      if (d > 1.3 || d < 1e-3) continue;
      const qs = Math.hypot(q.vel.x, q.vel.z);
      if (qs < 1 || (q.vel.x * dx + q.vel.z * dz) <= 0) continue;   // only if they're coming our way
      const away = new THREE.Vector3(-q.vel.z, 0, q.vel.x).normalize();
      if (away.x * dx + away.z * dz < 0) away.negate();
      move = (move ?? new THREE.Vector3()).add(away.multiplyScalar(0.9));
      if (move.lengthSq() > 1) move.normalize();
    }
    if (p.hp < p.maxHp * 0.35 && p.healCharges > 0 && p.healCd <= 0) held.heal = true;
    // jump: up to the leader's ledge, or across a gap in the way
    if (move && move.lengthSq() > 0.1 && p.grounded && this.jumpT <= 0 && this.wantsJump(move, lead, target)) { held.jump = true; this.jumpT = 0.6; }
    // unstuck: if trying to move but not moving, jump first, then hop sideways with a dodge
    if (move && move.lengthSq() > 0.1) {
      if (p.pos.distanceTo(this.lastPos) < dt * 0.6) this.stuckT += dt; else this.stuckT = 0;
      if (this.stuckT > 0.35 && this.jumpT <= 0 && p.grounded && this.floorAhead(move, 1.6, target ?? lead)) { held.jump = true; this.jumpT = 0.8; }
      if (this.stuckT > 0.9) {
        const side = [new THREE.Vector3(-move.z, 0, move.x), new THREE.Vector3(move.z, 0, -move.x)].find((d) => this.floorAhead(d, 0.9) && this.floorAhead(d, 2.6));
        if (side) { held.dodge = true; move = side; }
        this.stuckT = 0;
      }
    }
    // ledge guard: don't walk off an edge the jump logic doesn't mean to cross;
    // slide along it instead (like the monsters do)
    if (move && move.lengthSq() > 0.01 && p.grounded && !held.jump && !held.dodge && this.groundAt(p.pos.x, p.pos.z, p.pos.y) && !this.floorAhead(move, 0.9, target ?? lead)) {
      const len = move.length(), a = Math.atan2(move.x, move.z);
      let slide = null;
      for (const off of [0.6, -0.6, 1.2, -1.2, 1.57, -1.57]) {
        const d = new THREE.Vector3(Math.sin(a + off), 0, Math.cos(a + off));
        if (this.floorAhead(d, 0.9, target ?? lead)) { slide = d.multiplyScalar(len * Math.max(0.3, Math.cos(off))); break; }
      }
      move = slide ?? new THREE.Vector3();
    }
    this.lastPos.copy(p.pos);
    g.input.setVirtual(this.dev, { worldMove: move, held });
  }
  wantsJump(move, lead, target) {
    const g = this.game, p = this.p, w = g.world;
    if (!w?.groundBelow) return false;
    const goal = target ?? lead;
    // the leader (or target) is on a ledge one or two blocks up, close by
    if (goal) {
      const up = goal.pos.y - p.pos.y, d = Math.hypot(goal.pos.x - p.pos.x, goal.pos.z - p.pos.z);
      if (up > 0.7 && up < 2.4 && d < 4.5) return true;
    }
    // a gap ahead (no floor within two blocks down) with floor beyond it
    const dir = tmp.copy(move).setY(0).normalize();
    const near = w.groundBelow(p.pos.x + dir.x * 1.1, p.pos.z + dir.z * 1.1, p.pos.y + 0.5);
    if (isFinite(near) && near > p.pos.y - 2) return false;
    for (const k of [2.2, 3.2]) {
      const far = w.groundBelow(p.pos.x + dir.x * k, p.pos.z + dir.z * k, p.pos.y + 1.8);
      if (isFinite(far) && Math.abs(far - p.pos.y) < 1.8) return true;
    }
    return false;
  }
  // Is there floor within 2.5 blocks below (x, z), from about height y?
  groundAt(x, z, y) {
    const w = this.game.world;
    if (!w?.groundBelow) return true;
    const gy = w.groundBelow(x, z, y + 0.5);
    if (!isFinite(gy) || gy <= y - 2.5) return false;
    const liq = w.liquidAt?.(x, gy + 0.5, z);
    return liq !== 'lava' && liq !== 'cursed';
  }
  // Floor `k` blocks ahead in direction `dir`: within 2.5 below, or a deliberate
  // drop toward `goal` (a leader or target lower down, landing near its level).
  floorAhead(dir, k, goal = null) {
    const p = this.p, l = Math.hypot(dir.x, dir.z);
    if (l < 1e-4) return true;
    const x = p.pos.x + dir.x / l * k, z = p.pos.z + dir.z / l * k;
    if (this.groundAt(x, z, p.pos.y)) return true;
    if (goal && goal.pos.y < p.pos.y - 1) { const gy = this.game.world.groundBelow(x, z, p.pos.y + 0.5); return isFinite(gy) && gy > goal.pos.y - 1.5; }
    return false;
  }
  steer(to, stopAt = 0.6, speed = 1) {
    const d = tmp.subVectors(to, this.p.pos).setY(0);
    const len = d.length();
    if (len < stopAt) return new THREE.Vector3();
    return d.multiplyScalar(speed / len).clone();
  }
  inDanger() {
    const g = this.game, p = this.p;
    for (const m of g.markers.items ?? []) {
      if (!m.active || m.t > m.dur) continue;
      const mp = m.mesh.position, r = Math.max(m.mesh.scale.x, m.mesh.scale.y);
      if (Math.hypot(mp.x - p.pos.x, mp.z - p.pos.z) < r + 0.6) return true;
    }
    return false;
  }
  regroup(lead) {
    const g = this.game, p = this.p;
    const at = lead.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2));
    g.fx?.poof?.(p.pos);
    p.spawn(at);
    g.fx?.summonCircle?.(at, 0xffd84a);
  }
}

export class Party {
  constructor(game) { this.game = game; this.companions = new Map(); this.lockUntil = 0; this.chosen = null; }
  clear() { this.companions.clear(); }
  add(player) {
    player.ai = true;
    player.device = 'ai' + player.index;
    const c = new Companion(this.game, player);
    this.companions.set(player, c);
    return c;
  }
  update(dt) {
    for (const c of this.companions.values()) c.update(dt);
    this.watchPads(dt);
  }
  // A controller that disconnects: its hero plays on as a companion (or, on an
  // online guest's screen, goes back to the host, whose AI plays it).
  watchPads(dt) {
    const g = this.game;
    for (const p of [...g.players]) {
      if (p.ai || p.remote || !p.device?.startsWith('pad')) { if (p) p.padGoneT = 0; continue; }
      const pad = g.input.padById?.(+p.device.slice(3));
      if (pad && pad.connected) { p.padGoneT = 0; continue; }
      p.padGoneT = (p.padGoneT ?? 0) + dt;
      if (p.padGoneT < PAD_GONE || g.players.filter((q) => !q.ai && !q.remote).length < 2) continue;
      p.padGoneT = 0;
      g.toast?.(`${g.profileName?.(p) ?? 'A player'} left: the AI plays ${HEROES[p.hero]?.name ?? p.hero} for now`);
      if (g.online?.isGuest) { g.online.dropLocalHuman(p); continue; }
      p.gearOwner = p.device;
      this.add(p);
      if (g.online?.live) { p.netKey = 'ai:' + p.hero; this.setParty(); } else this.fill();   // (four heroes go back to three)
    }
  }
  get locked() { return performance.now() < this.lockUntil; }
  lock() { this.lockUntil = performance.now() + SWAP_LOCK * 1000; }
  // AI heroes a human could swap into (online, the room's companions)
  takeable() { return (this.game.party ?? []).filter((q) => q.ai && !q.dead && !q.downed && !q.heldFor && !(q.remote && q.remote.held)); }
  // Hand `human`'s device to the next living companion. -> true if it swapped (or asked the host to)
  switchFrom(human, dir = 1) {
    const g = this.game;
    if (!human || human.ai || human.remote) return false;
    if (g.online?.live) return g.online.requestSwap(human, dir);
    const party = g.party;
    if (!party || party.length < 2 || this.locked) return false;
    const i = party.indexOf(human);
    for (let k = 1; k < party.length; k++) {
      const next = party[(i + dir * k + party.length) % party.length];
      if (!next.ai || next.dead || next.downed || next.remote) continue;
      this.swap(human, next);
      return true;
    }
    return false;
  }
  // human takes over companion `next`; the human's old hero becomes the companion
  swap(human, next) {
    const g = this.game;
    if (next.remote) return g.online?.requestSwap(human, 1, next.remote.key) ?? false;
    if (this.locked || !next.ai || human.ai) return false;
    this.lock();
    const dev = human.device;
    this.companions.delete(next);
    next.ai = false; next.device = dev; next.netKey = null; next.heldFor = null;
    human.gearOwner = dev;            // the companion keeps the gear of whoever last played it
    this.add(human);
    for (const q of [next, human]) q.refreshLoadout?.();
    g.fx?.summonCircle?.(next.pos, 0xffd84a);
    g.toast?.(HEROES[next.hero]?.full ?? next.hero);
    g.audio?.ui?.('buy');
    g.hud?.rebuildCards?.();
    return true;
  }
  // A controller joins: it takes over the first AI companion, if any.
  takeOver(device) {
    const g = this.game;
    const free = g.players.filter((q) => q.ai && !q.remote && !q.heldFor);
    const next = free.find((q) => q.gearOwner === device) ?? free[0];   // (their own hero, if they had one)
    if (!next) return null;
    this.companions.delete(next);
    next.ai = false; next.device = device; next.netKey = null;
    next.refreshLoadout?.();
    g.hud?.rebuildCards?.();
    return next;
  }
  // Offline: bring the party to the rule above (companions added near the
  // first human, extra ones removed), and set game.party.
  fill() {
    const g = this.game;
    if (g.online?.live) return;
    if (this.noFill) { this.setParty(); return; }
    const humans = g.players.filter((q) => !q.ai && !q.remote);
    // a companion playing a hero a person now plays goes first
    for (const q of g.players.filter((x) => x.ai && !x.remote && humans.some((h) => h.hero === x.hero))) { g.removePlayer(q); g.players.splice(g.players.indexOf(q), 1); }
    const ais = g.players.filter((q) => q.ai && !q.remote);
    const want = companionsWanted(humans.length);
    for (const q of ais.slice(want)) { g.removePlayer(q); g.players.splice(g.players.indexOf(q), 1); }
    for (let n = ais.length; n < want && humans.length; n++) {
      const used = new Set(g.players.map((q) => q.hero));
      const id = [...(this.chosen ?? []), ...HERO_IDS].find((h) => !used.has(h) && HEROES[h] && !HEROES[h].soon && (g.heroUnlocked?.(h) ?? true));
      if (!id) break;
      const p = g.addPlayer('ai' + g.players.length, id);
      this.add(p);
      g.fx?.summonCircle?.(p.pos, 0xffd84a);
    }
    this.setParty();
  }
  setParty() {
    const g = this.game;
    g.party = g.players.some((q) => q.ai) ? [...g.players] : null;
    g.hud?.rebuildCards?.();
  }
}

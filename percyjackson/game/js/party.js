// The party. One human playing alone leads up to three heroes: the one they
// control and AI companions. Companions drive their hero through a virtual
// input device, so they use exactly the same kits, combos and dodges as a
// player. Switching (D-pad down / Tab) hands the human's device to the next
// hero and the AI takes over the old one. With several humans there are no
// companions; a controller that joins takes over a companion if there is one.
import * as THREE from 'three/webgpu';
import { HEROES } from './heroes/index.js';

const tmp = new THREE.Vector3();

export class Companion {
  constructor(game, player) {
    this.game = game; this.p = player;
    this.dev = 'ai' + player.index;
    this.think = 0; this.held = {};
    this.abilityT = 2 + Math.random() * 2;
    this.rangedT = 1;
    this.dodgeT = 0;
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
    this.think -= dt; this.abilityT -= dt; this.rangedT -= dt; this.dodgeT -= dt;
    // a downed teammate nearby comes first
    const downed = g.players.find((q) => q !== p && q.downed && q.pos.distanceTo(p.pos) < 22);
    // threats near the leader (companions guard the leader, they don't wander off)
    const anchor = lead ? lead.pos : p.pos;
    let target = null, td = 1e9;
    for (const e of g.enemies) {
      if (e.dead || e.untargetable || e.disguised || e.isDummy) continue;
      const d = e.pos.distanceTo(p.pos), da = e.pos.distanceTo(anchor);
      if (da > 13) continue;
      if (d < td) { td = d; target = e; }
    }
    if (lead && p.pos.distanceTo(lead.pos) > 26) this.regroup(lead);
    if (downed && !downed.ai) move = this.steer(downed.pos, 0.8);
    else if (downed) move = this.steer(downed.pos, 0.8);
    else if (target) {
      const reach = p.kit.combo?.[0]?.range ?? 2.4;
      if (td > reach * 0.85) move = this.steer(target.pos, reach * 0.7);
      else { move = new THREE.Vector3(); held.attack = Math.random() < 0.85; }
      // ranged now and then at medium range
      if (td > 4 && td < 11 && this.rangedT <= 0) { held.ranged = true; this.rangedT = 1.5 + Math.random() * 1.5; }
      // abilities on a gentle timer while fighting
      if (this.abilityT <= 0 && td < 8) {
        const slots = ['t1', 't2', 't3'].filter((k) => p.kit.slots[k] && p.kit.slots[k].cdLeft <= 0 && p.ce >= (p.kit.slots[k].ce ?? 0));
        if (slots.length) held[slots[Math.floor(Math.random() * slots.length)]] = true;
        this.abilityT = 3 + Math.random() * 3;
      }
      // godly power when it is full and a crowd (or a boss) is close
      if (p.ce >= p.maxCe && !g.domain && (target.isBoss || g.enemies.filter((e) => !e.dead && e.pos.distanceTo(p.pos) < 7).length >= 4)) held.domain = true;
      // dodge out of telegraphed danger
      if (this.dodgeT <= 0 && this.inDanger()) { held.dodge = true; this.dodgeT = 1.2; move = tmp.subVectors(p.pos, target.pos).setY(0).normalize().clone(); }
    } else if (lead) {
      // follow in a loose formation behind the leader
      const slot = g.party.indexOf(p);
      const back = new THREE.Vector3(Math.sin(lead.facing), 0, Math.cos(lead.facing)).multiplyScalar(-2.2);
      const side = new THREE.Vector3(Math.cos(lead.facing), 0, -Math.sin(lead.facing)).multiplyScalar(slot % 2 ? 1.6 : -1.6);
      const spot = lead.pos.clone().add(back).add(side);
      if (p.pos.distanceTo(spot) > 1.2) move = this.steer(spot, 0.6, p.pos.distanceTo(lead.pos) > 7 ? 1 : 0.7);
    }
    // heal when low
    if (p.hp < p.maxHp * 0.35 && p.healCharges > 0 && p.healCd <= 0) held.heal = true;
    // unstick: if trying to move but not moving, hop sideways with a dodge
    if (move && move.lengthSq() > 0.1) {
      if (p.pos.distanceTo(this.lastPos) < dt * 0.6) this.stuckT += dt; else this.stuckT = 0;
      if (this.stuckT > 0.8) { held.dodge = true; move = new THREE.Vector3(-move.z, 0, move.x); this.stuckT = 0; }
    }
    this.lastPos.copy(p.pos);
    g.input.setVirtual(this.dev, { worldMove: move, held });
  }
  steer(to, stopAt = 0.6, speed = 1) {
    const d = tmp.subVectors(to, this.p.pos).setY(0);
    const len = d.length();
    if (len < stopAt) return new THREE.Vector3();
    return d.multiplyScalar(speed / len).clone();
  }
  inDanger() {
    const g = this.game, p = this.p;
    // telegraph markers are pooled meshes: scale.x is the radius (circles)
    // or half the width (rectangles); treat both as a circle around the centre
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
  constructor(game) { this.game = game; this.companions = new Map(); }
  clear() { this.companions.clear(); }
  add(player) {
    player.ai = true;
    player.device = 'ai' + player.index;
    const c = new Companion(this.game, player);
    this.companions.set(player, c);
    return c;
  }
  update(dt) { for (const c of this.companions.values()) c.update(dt); }
  // Hand `human`'s device to the next living hero in the party.
  switchFrom(human, dir = 1) {
    const g = this.game;
    const party = g.party;
    if (!party || party.length < 2 || human.ai) return false;
    const i = party.indexOf(human);
    for (let k = 1; k < party.length; k++) {
      const next = party[(i + dir * k + party.length) % party.length];
      if (!next.ai || next.dead || next.downed) continue;
      this.swap(human, next);
      return true;
    }
    return false;
  }
  swap(human, next) {
    const g = this.game;
    const dev = human.device;
    const c = this.companions.get(next);
    this.companions.delete(next);
    next.ai = false; next.device = dev;
    this.add(human);
    void c;
    g.fx?.summonCircle?.(next.pos, 0xffd84a);
    g.toast?.(HEROES[next.hero]?.full ?? next.hero);
    g.audio?.ui?.('buy');
    g.hud?.rebuildCards?.();
  }
  // A controller joins: it takes over the first AI companion, if any.
  takeOver(device) {
    const g = this.game;
    const next = (g.party ?? []).find((q) => q.ai);
    if (!next) return null;
    this.companions.delete(next);
    next.ai = false; next.device = device;
    g.hud?.rebuildCards?.();
    return next;
  }
}

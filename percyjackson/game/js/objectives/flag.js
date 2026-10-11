// Capture the flag (chapter 3). The red team's banner (Ares's cabin) stands
// in the deepest part of the woods, just before the boss clearing. Take it
// (hold X / E) and carry it back to the blue side: the start room, across
// the creek. The carrier is slowed and can't use their ranged move; if they
// go down, the banner drops where they fell and anyone can pick it up.
// Clarisse's cabin-mates (dracaenae and hellhound pups stand in for them)
// come after the banner. Bringing it home wins the game, and then a
// hellhound comes out of the dark at the creek: the chapter's boss.
import * as THREE from 'three/webgpu';
import { toast } from '../ui/ui.js';
import { makeDisc } from '../heroes/kit.js';
import { heroKey, heroByKey, isGuest, sendAct, seeded, inRoom, roomSpot, ground, ambush, mat, box } from './common.js';

export class FlagObjective {
  constructor(m) {
    this.m = m; this.g = m.game;
    this.autoBoss = false;     // the boss comes at the creek, not in its arena
    this.keepGates = true;     // the arena stays shut
    this.carrier = null; this.carrierKey = null; this.captured = false; this.taken = false;
    this.t = 0; this.textT = 0; this.chaseT = 0;
  }
  setup() {
    const m = this.m, g = this.g, L = m.L;
    m.obj.need = 1; m.obj.done = 0;
    this.home = L.rooms[0];
    this.flagRoom = L.bossRoom.parent ?? L.rooms[1] ?? L.rooms[0];
    this.stand = roomSpot(g, this.flagRoom, seeded(m, 3), this.home.center);
    this.bannerPos = this.stand.clone();
    // the red banner: a pole, a cloth with a boar's head
    const grp = new THREE.Group();
    box(grp, 0.14, 3.2, 0.14, 0, 1.6, 0, mat(0x6a4a2a));
    const cloth = new THREE.Group(); cloth.position.set(0.07, 2.6, 0); grp.add(cloth);
    box(cloth, 1.3, 0.85, 0.06, 0.65, 0, 0, mat(0xc82a1f, { e: 0.35 }));
    box(cloth, 0.42, 0.34, 0.08, 0.65, 0.04, 0, mat(0x3a2a20));
    box(cloth, 0.12, 0.08, 0.1, 0.85, -0.06, 0, mat(0xf0e8d0));
    box(grp, 0.3, 0.3, 0.3, 0, 3.25, 0, mat(0xd8b040, { m: 0.8, r: 0.3 }));
    grp.position.copy(this.bannerPos);
    this.banner = m.addProp(grp); this.cloth = cloth;
    this.light = g.lights.attach(grp, 0xff4a2a, 3, 7, { offsetY: 2.5 });
    // the blue side: a ring by the creek in the start room
    const disc = makeDisc(0x3ab8ff, { rings: 5, speed: 0.6, intensity: 1.2 });
    const r = Math.max(3, Math.min(this.home.x1 - this.home.x0, this.home.z1 - this.home.z0) / 2 - 1);
    disc.scale.setScalar(r); disc.position.copy(ground(g, this.home.center)).setY(this.home.y + 0.06);
    disc.userData.alpha.value = 0.55;
    m.addProp(disc);
    g.interactables.push({ id: 'flag', pos: this.bannerPos, radius: 2.4, label: 'Take the red banner', hold: 0.6,
      action: (p) => this.take(p), enabled: () => !this.carrier && !this.captured });
  }
  take(p) {
    if (isGuest(this.m)) { sendAct(this.g, { a: 'take', h: p.index }); return; }
    this.setCarrier(p);
  }
  setCarrier(p) {
    if (this.carrier || this.captured || !p) return;
    const g = this.g, first = !this.taken;
    this.carrier = p; this.carrierKey = heroKey(g, p); this.taken = true;
    g.audio?.ui?.('buy');
    toast(`${g.heroName?.(p) ?? 'A hero'} has the banner! Carry it back across the creek`, 'big');
    if (!isGuest(this.m)) {
      if (first) { toast('Clarisse’s cabin is coming for their banner!'); ambush(this.m, this.bannerPos, this.defenders(3)); }
      this.chaseT = 12;
    }
    this.m.updateText();
  }
  // Ares campers: dracaenae with spears and hellhound pups at their heels
  defenders(n) { const d = this.m.def.difficulty ?? 1; return Array.from({ length: n + d }, (_, i) => (i % 3 === 0 ? 'dracaena' : 'pup')); }
  drop() {
    const c = this.carrier; if (!c) return;
    this.bannerPos.copy(ground(this.g, c.pos));
    this.carrier = null; this.carrierKey = null;
    toast('The banner is down! Pick it up');
    this.m.updateText();
  }
  capture() {
    if (this.captured) return;
    const m = this.m, g = this.g;
    this.captured = true; this.carrier = null; this.carrierKey = null;
    this.bannerPos.copy(ground(g, this.home.center.clone().add(new THREE.Vector3(1.5, 0, 0))));
    this.banner.position.copy(this.bannerPos); this.banner.rotation.set(0, 0, 0);
    m.obj.done = 1;
    toast('Blue team wins! You carried the banner across the creek', 'big');
    g.fx.heal(this.bannerPos, 0x3ab8ff);
    m.checkObjective();
    if (!isGuest(m)) {
      // then something comes out of the dark at the creek
      const at = this.bossSpot();
      setTimeout(() => { if (g.mission === m && !m.bossSpawned) { toast('A howl in the woods…'); m.startBoss(this.home, at); } }, 1800);
    }
  }
  bossSpot() {
    const h = this.home, p = this.g.players.find((q) => !q.dead)?.pos ?? h.center;
    // the far side of the clearing from the heroes
    const dir = new THREE.Vector3(h.center.x - p.x, 0, h.center.z - p.z);
    if (dir.lengthSq() < 1) dir.set(0, 0, -1);
    dir.normalize().multiplyScalar(Math.min(5, (h.x1 - h.x0) / 2 - 2));
    return ground(this.g, h.center.clone().add(dir));
  }
  update(dt) {
    const m = this.m, g = this.g, host = !isGuest(m);
    this.t += dt;
    if (!host && this.carrierKey && !this.carrier) this.carrier = heroByKey(g, this.carrierKey);
    const c = this.carrier;
    if (c) {
      if (!g.players.includes(c) || c.dead || c.downed) { if (host) this.drop(); }
      else {
        this.bannerPos.copy(c.pos);
        const back = new THREE.Vector3(-Math.sin(c.facing) * 0.45, 0, -Math.cos(c.facing) * 0.45);
        this.banner.position.copy(c.pos).add(back).setY(c.pos.y + 0.6);
        this.banner.rotation.set(0.15, c.facing, 0);
        // the banner is heavy: slower, and no ranged attacks
        if (!c.remote) {
          c.slowT = Math.max(c.slowT ?? 0, 0.15);
          const rs = c.kit?.slots?.ranged; if (rs) rs.cdLeft = Math.max(rs.cdLeft ?? 0, 0.15);
        }
        if (host) {
          if (inRoom(c.pos, this.home)) this.capture();
          else if ((this.chaseT -= dt) <= 0) {
            this.chaseT = Math.max(8, 16 - 2 * (m.def.difficulty ?? 1));
            ambush(m, c.pos, this.defenders(1), { radius: 9 });
          }
        }
      }
    } else if (!this.captured) {
      this.banner.position.copy(this.bannerPos);
      this.banner.rotation.set(0, this.t * 0.3, 0);
    }
    this.cloth.rotation.y = Math.sin(this.t * 3) * 0.25;
    if ((this.textT -= dt) <= 0) { this.textT = 0.3; m.updateText(); }
  }
  text() {
    if (this.captured) return null;
    const t = this.m.def.objText ?? 'Capture the Flag';
    if (this.carrier) return [t, this.carrier.remote ? 'Cover the banner carrier back across the creek' : 'Carry the banner back across the creek to the blue side'];
    if (this.taken) return [t, 'The banner is down! Pick it up'];
    return [t, 'Find Clarisse’s red banner deep in the woods'];
  }
  netState() {
    const b = this.bannerPos;
    return { c: this.carrierKey, p: [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.z * 10) / 10], cap: this.captured ? 1 : 0, tk: this.taken ? 1 : 0 };
  }
  applyNet(s) {
    if (s.cap && !this.captured) { this.capture(); return; }
    if (this.captured) return;
    this.taken = !!s.tk;
    const key = typeof s.c === 'string' ? s.c : null;
    if (key !== this.carrierKey) {
      this.carrierKey = key; this.carrier = heroByKey(this.g, key);
      if (key) toast(`${this.g.heroName?.(this.carrier ?? {}) ?? 'A hero'} has the banner!`);
    }
    if (!key && Array.isArray(s.p)) this.bannerPos.set(+s.p[0] || 0, +s.p[1] || 0, +s.p[2] || 0);
  }
  onNetAct(d) {
    if (d.a !== 'take') return;
    const p = heroByKey(this.g, `${d.u}:${d.h | 0}`);
    if (p && p.pos.distanceTo(this.bannerPos) < 5) this.setCarrier(p);
  }
  dispose() { this.g.lights.remove?.(this.light); }
}

// Escape (chapter 8, the Lotus Hotel and Casino). There is no boss: the
// place is the trap. Time runs strangely here: a counter of the days that
// have passed rises while you play, and if it reaches the limit the Lotus
// has you. The way out is the door at the far end, but the Mist hides it:
// it only shows (and opens) once True Sight reaches it, and while True
// Sight is on a trail of gold shows the way. Lotus flowers lie about, and
// the bellhops (disguised monsters) keep offering them: eating one heals a
// little but slows you and costs days.
import * as THREE from 'three/webgpu';
import { toast, h } from '../ui/ui.js';
import { isGuest, sendAct, seeded, ground, mainPath, doorBetween, roomSpot } from './common.js';
import { makeLotus } from './props.js';

const LIMIT = 7;                          // days
const BUDGET = [300, 260, 230, 200];      // seconds of play before the limit, by difficulty
const LOTUS_DAYS = 0.6, OFFER_DAYS = 0.3;

export class EscapeObjective {
  constructor(m) {
    this.m = m; this.g = m.game;
    this.autoBoss = false; this.keepGates = true;
    this.days = 0; this.found = false; this.failed = false; this.lotus = [];
    this.limit = LIMIT;
    this.rate = LIMIT / BUDGET[Math.min(3, Math.max(0, (m.def.difficulty ?? 1) - 1))];
    this.t = 0; this.textT = 0;
  }
  get exitOpen() { return this.found && !this.failed; }
  setup() {
    const m = this.m, g = this.g, L = m.L;
    m.obj.need = 1; m.obj.done = 0;
    this.exitPos = ground(g, L.bossRoom.center.clone());
    this.gateSpots = L.gates.map((gt) => { const v = new THREE.Vector3(); for (const [x, y, z] of gt.blocks) v.add(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5)); return v.divideScalar(Math.max(1, gt.blocks.length)); });
    // the way out, hidden until True Sight finds it
    this.exit = m.makeExit(this.exitPos, 'Leave the Lotus Casino', () => { if (this.exitOpen) g.completeMission(); }, () => this.exitOpen);
    this.exit.visible = false;
    // lotus flowers on the floor of the casino rooms
    const r = seeded(m, 8);
    for (const room of L.rooms) {
      if (room.type !== 'combat' && room.type !== 'side') continue;
      for (let i = 0; i < 2; i++) {
        const pos = roomSpot(g, room, r);
        pos.x += (r() - 0.5) * 2; pos.z += (r() - 0.5) * 2; pos.copy(ground(g, pos));
        const obj = m.addProp(makeLotus()); obj.position.copy(pos);
        this.lotus.push({ pos, obj, taken: false });
      }
    }
    // the gold trail along the main path, seen only in True Sight
    this.trail = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22), gold = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xffd84a).multiplyScalar(2.4) });
    const path = mainPath(L), pts = [];
    path.forEach((room, i) => {
      pts.push(room.center.clone());
      const next = path[i + 1];
      if (next) { const a = doorBetween(room, next), b = doorBetween(next, room); if (a) pts.push(a); if (b) pts.push(b); }
    });
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.floor(a.distanceTo(b) / 2.2));
      for (let k = 0; k < n; k++) {
        const p = a.clone().lerp(b, k / n);
        const gy = g.world.groundBelow(p.x, p.z, Math.max(a.y, b.y) + 3);
        if (!isFinite(gy)) continue;
        const dot = new THREE.Mesh(geo, gold); dot.position.set(p.x, gy + 0.35, p.z); dot.userData.k = this.trail.children.length;
        this.trail.add(dot);
      }
    }
    this.trail.visible = false;
    m.addProp(this.trail);
    // the days counter
    this.el = h('div', { class: 'lotus-days', style: 'position:absolute;top:118px;left:50%;transform:translateX(-50%);padding:4px 14px;border-radius:14px;background:rgba(20,10,30,.72);border:1px solid #c9963a;color:#ffd8f0;font:600 15px/1.3 system-ui,sans-serif;pointer-events:none;z-index:5;text-shadow:0 1px 2px #000' });
    (g.hud.root ?? document.body).appendChild(this.el);
  }
  update(dt) {
    const m = this.m, g = this.g, host = !isGuest(m);
    if (m.complete) return;
    this.t += dt;
    if (!this.failed) this.days += this.rate * dt;
    // the trail glows while someone sees through the Mist
    this.trail.visible = !!g.mist.active && !this.failed;
    if (this.trail.visible) for (const d of this.trail.children) d.position.y += Math.sin(this.t * 4 + d.userData.k * 0.5) * 0.004;
    // True Sight finds the hidden door
    if (!this.found && g.mist.active && (g.mist.inside(this.exitPos) || this.gateSpots.some((s) => g.mist.inside(s)))) {
      if (host) this.reveal(); else { this.reveal(); sendAct(g, { a: 'found' }); }
    }
    // flowers, and bellhops offering them
    for (const p of g.players) {
      if (p.remote || p.dead || p.downed) continue;
      this.lotus.forEach((l, i) => { if (!l.taken && Math.hypot(p.pos.x - l.pos.x, p.pos.z - l.pos.z) < 1.1 && Math.abs(p.pos.y - l.pos.y) < 2) this.eat(p, i); });
      for (const e of g.enemies) if (e.disguised && !e.offeredLotus && !e.dead && e.pos.distanceTo(p.pos) < 1.8) { e.offeredLotus = true; this.eat(p, -1); }
    }
    for (const l of this.lotus) if (!l.taken) l.obj.rotation.y += dt;
    if (host && !this.failed && this.days >= this.limit) this.fail();
    this.el.textContent = `☾ ${this.daysText()} in the Lotus Casino · the Lotus has you at ${this.limit}`;
    this.el.style.color = this.days > this.limit * 0.75 ? '#ff8a9a' : '#ffd8f0';
    if ((this.textT -= dt) <= 0) { this.textT = 0.5; m.updateText(); }
  }
  daysText() {
    const d = Math.min(this.days, this.limit), whole = Math.floor(d), hrs = Math.floor((d - whole) * 24);
    return `${whole} day${whole === 1 ? '' : 's'}, ${hrs} hour${hrs === 1 ? '' : 's'}`;
  }
  // A hero eats a lotus flower (i ≥ 0) or takes one from a bellhop (i = -1).
  eat(p, i) {
    const g = this.g, m = this.m;
    if (i >= 0) { const l = this.lotus[i]; if (l.taken) return; this.takeLotus(i); }
    p.slowT = Math.max(p.slowT ?? 0, i >= 0 ? 4 : 2);
    if (i >= 0) p.heal?.(p.maxHp * 0.15, true);
    toast(i >= 0 ? 'You eat a lotus flower. Mmm… what were you doing?' : '“Lotus flower, sir?” You lose an afternoon.');
    g.fx.heal(p.pos, 0xffb8e8);
    if (isGuest(m)) sendAct(g, { a: 'lotus', i });
    else this.days += i >= 0 ? LOTUS_DAYS : OFFER_DAYS;
  }
  takeLotus(i) {
    const l = this.lotus[i]; if (!l || l.taken) return;
    l.taken = true; l.obj.visible = false;
  }
  reveal() {
    if (this.found) return;
    const m = this.m, g = this.g;
    this.found = true; m.obj.done = 1;
    this.exit.visible = true;
    toast('There! The way out the Mist was hiding. Run!', 'big');
    g.audio?.gong?.();
    m.checkObjective();
    for (const gate of m.L.gates) if (!gate.open) m.openGate(gate);
    g.exitPortal = { pos: this.exitPos };
  }
  fail() {
    if (this.failed) return;
    this.failed = true;
    this.trail.visible = false;
    this.m.fail('The Lotus has you. Years go by…');
  }
  text() {
    const t = this.m.def.objText ?? 'Escape';
    if (this.failed) return ['The Lotus has you', 'Too many days have passed'];
    if (this.found) return [t, 'The way out is open: get everyone through the door'];
    return [t, 'Find the hidden way out. True Sight (LT / V) shows the trail'];
  }
  netState() { return { d: Math.round(this.days * 100) / 100, f: this.found ? 1 : 0, l: this.lotus.map((l) => (l.taken ? 1 : 0)), x: this.failed ? 1 : 0 }; }
  applyNet(s) {
    if (typeof s.d === 'number' && Math.abs(s.d - this.days) > 0.2) this.days = s.d;
    if (s.f && !this.found) this.reveal();
    if (Array.isArray(s.l)) s.l.forEach((v, i) => { if (v) this.takeLotus(i); });
    if (s.x && !this.failed) this.fail();
  }
  onNetAct(d) {
    if (d.a === 'found') this.reveal();
    if (d.a === 'lotus') {
      const i = d.i | 0;
      if (i >= 0) { if (!this.lotus[i] || this.lotus[i].taken) return; this.takeLotus(i); this.days += LOTUS_DAYS; } else this.days += OFFER_DAYS;
    }
  }
  dispose() { this.el?.remove(); }
}

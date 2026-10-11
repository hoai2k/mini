// The Mist and True Sight. The Mist hides the gods' world from mortals: in a
// chapter with Mist, the level looks ordinary and some monsters walk around
// disguised as mortals. A hero can see through it (LT / V): a ring spreads
// out from them and repaints the world (see sightLook in gfx/materials.js),
// disguised monsters inside the ring show their true form, and walls made of
// Mist (B.mist_wall) dissolve to reveal hidden places. True Sight drains a
// meter, faster where the Mist is thick; it refills while the Mist is back.
import * as THREE from 'three/webgpu';
import { U } from './gfx/materials.js';
import { B } from './world/blocks.js';

const FULL_RADIUS = 34;      // the ring grows to cover the screen
const GROW = 70;             // ring speed, units per second

export class Mist {
  constructor(game) {
    this.game = game;
    this.thickness = 0;      // 0 = no Mist (True Sight not needed) .. 1 = very thick
    this.meter = 1;          // 0..1
    this.active = false;
    this.radius = 0;
    this.center = new THREE.Vector3();
    this.source = null;      // the hero who is seeing
    this.scanT = 0;
    this.walls = [];         // remaining Mist-wall blocks in the level
    this.revealedWalls = 0;
  }
  // Called when a level loads.
  setup(thickness, world) {
    this.thickness = thickness;
    this.meter = 1; this.active = false; this.radius = 0; this.source = null;
    U.sightRadius.value = 0;
    this.walls = [];
    this.revealedWalls = 0;
    if (thickness > 0 && world && B.mist_wall !== undefined) this.walls = findBlocks(world, B.mist_wall);
  }
  get available() { return this.thickness > 0; }
  // Drain per second while seeing, refill per second while not.
  get drain() { return 0.07 + 0.16 * this.thickness; }
  get refill() { return 0.16 - 0.06 * this.thickness; }
  toggle(player) {
    if (!this.available) return;
    if (this.active) { this.close(); return; }
    if (this.meter < 0.15) { this.game.toast?.('The Mist is too thick — wait a moment'); this.game.audio?.ui?.('deny'); return; }
    this.active = true; this.source = player;
    this.center.copy(player.pos);
    this.game.audio?.energy?.('summon');
    this.game.fx?.screenWave?.(player.pos.clone().setY(player.pos.y + 1), 0.8, 0.5);
    this.scan();
  }
  close(reason) {
    if (!this.active) return;
    this.active = false;
    if (reason) this.game.toast?.(reason);
  }
  update(dt) {
    const g = this.game;
    if (!this.available) { if (this.radius > 0) { this.radius = 0; U.sightRadius.value = 0; } return; }
    if (this.active) {
      this.meter -= this.drain * dt;
      if (this.meter <= 0) { this.meter = 0; this.close('The Mist closes in again'); }
      const src = this.source && !this.source.dead ? this.source : g.players.find((p) => !p.dead);
      if (src) this.center.lerp(src.pos, Math.min(1, dt * 4));
      this.radius = Math.min(FULL_RADIUS, this.radius + GROW * dt);
      this.scanT -= dt;
      if (this.scanT <= 0) { this.scanT = 0.2; this.scan(); }
    } else {
      this.meter = Math.min(1, this.meter + this.refill * dt);
      this.radius = Math.max(0, this.radius - GROW * 1.4 * dt);
    }
    U.sightCenter.value.copy(this.center);
    U.sightRadius.value = this.radius;
  }
  inside(pos) { return this.radius > 0.5 && Math.hypot(pos.x - this.center.x, pos.z - this.center.z) < this.radius - 0.5; }
  // Reveal what the ring has reached.
  scan() {
    const g = this.game;
    for (const e of g.enemies) if (e.disguised && this.inside(e.pos)) e.reveal?.();
    if (g.mission?.revealDisguisedBoss && g.mission.disguisedBoss && this.inside(g.mission.disguisedBoss.pos)) g.mission.revealDisguisedBoss();
    if (!this.walls.length) return;
    const keep = [];
    let opened = 0;
    for (const w of this.walls) {
      if (!this.inside({ x: w[0] + 0.5, z: w[2] + 0.5 })) { keep.push(w); continue; }
      if (g.world.get(w[0], w[1], w[2]) !== B.mist_wall) continue;
      const [x, y, z] = w;
      setTimeout(() => {
        g.world.set(x, y, z, 0);
        g.particles?.burst?.(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), { count: 5, color: 0xffd84a, speed: 1.6, up: 1.2, life: 0.9, size: 0.18, sizeEnd: 0.02 });
      }, (opened++ % 40) * 30);
    }
    if (opened) {
      this.revealedWalls++;
      g.toast?.('The Mist parts — a hidden way!');
      g.audio?.energy?.('heal');
      if (g.mission) g.mission.stats.secrets = (g.mission.stats.secrets ?? 0) + 1;
    }
    this.walls = keep;
  }
}

function findBlocks(world, id) {
  const out = [], { sx, sy, sz, data } = world;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== id) continue;
    const x = i % sx, z = Math.floor(i / sx) % sz, y = Math.floor(i / (sx * sz));
    out.push([x, y, z]);
  }
  void sy;
  return out;
}

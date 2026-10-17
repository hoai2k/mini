// Straight to the boss (chapters 11 and 12). The heroes start in the room
// just before the arena: one fight on the approach (its strays, or a group if
// the level put one there), then the gate opens and the boss waits inside.
// The gate stays shut while the approach's monsters are up (so they don't
// pile into the boss fight behind you); it opens anyway after a while.
import { roomSpot, seeded, isGuest } from './common.js';
import { toast } from '../ui/ui.js';
import { t } from '../text_config.js';

const GIVE_UP = 75;   // seconds: the gate opens even if a monster is out of reach

export class BossObjective {
  constructor(m) { this.m = m; this.g = m.game; this.approach = true; }
  setup() {
    const m = this.m, g = this.g, L = m.L;
    const room = L.bossRoom.parent ?? L.rooms[0];
    // only the approach room keeps its monsters
    for (const r of L.rooms) if (r !== room) { r.waves = []; r.packs = []; r.loose = []; r.trap = null; }
    room.waves = room.waves.slice(0, 1);
    L.spawn = roomSpot(g, room, seeded(m, 11), L.bossRoom.center);
    g.placePlayers(L.spawn);
    g.minimap.reveal(room);
    m.obj.need = 0; m.obj.done = 0;
    m.objDone = true; g.objectiveDone = true;
    this.room = room; this.t = 0;
  }
  get open() { return this.m.L.gates.every((gt) => gt.open); }
  update(dt) {
    const m = this.m, room = this.room;
    if (this.open || isGuest(m)) return;
    this.t += dt;
    const left = (room.enemies ?? []).filter((e) => !e.dead && !e.disguised).length + (room.reserve?.length ?? 0) + Math.max(0, (room.waves?.length ?? 0) - (room.waveIdx ?? 0));
    if ((room.primed || !(room.packs?.length || room.loose?.length)) && left <= 1 || this.t > GIVE_UP) {
      for (const gate of m.L.gates) m.openGate(gate);
      toast(t('objectives.boss.arenaOpens'), 'big'); this.g.audio?.gong?.();
      m.updateText();
    }
  }
  text() { return this.open ? null : [this.m.def.objText ?? t('objectives.boss.title'), t('objectives.boss.clearWay')]; }
}

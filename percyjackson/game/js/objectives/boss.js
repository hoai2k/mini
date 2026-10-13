// Straight to the boss (chapters 11 and 12). The heroes start in the room
// just before the arena: one fight on the approach (its strays, or a group if
// the level put one there), then the gate is open and the boss waits inside.
import { roomSpot, seeded } from './common.js';

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
    for (const gate of L.gates) m.openGate(gate);
  }
}

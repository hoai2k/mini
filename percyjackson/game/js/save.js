// Profile persistence in localStorage: coins, hero levels/XP, skill
// ranks, enchantment points, inventory, loadouts and mission progress.
import { rollItem, normalizeItem } from './loot.js';

const KEY = 'half-blood-quests-save-v1';

function fresh() {
  return {
    version: 1,
    coins: 0,
    level: 1, xp: 0, enchantPoints: 1,
    heroes: {},             // id -> { skills: {id: rank}, skillPoints, gear: [weaponUid, armorUid, art1Uid, art2Uid] }
    inventory: ['training_sword', 'camp_shirt', 'nectar_flask'].map((id) => { const it = rollItem(8, { id, blessed: false }); delete it.isNew; return it; }),
    completed: {},             // missionId -> best threat cleared
    unlocked: {},
    lastHero: 'percy',
    stats: { kills: 0, missions: 0, deaths: 0, domains: 0 },
    shop: null,
  };
}

export class Save {
  constructor() { this.data = this.load(); }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (d && d.version === 1) { d.inventory = (d.inventory ?? []).map(normalizeItem).filter(Boolean); return { ...fresh(), ...d }; } }
    } catch (e) { /* ignore */ }
    return fresh();
  }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full / private mode */ } }
  reset() { this.data = fresh(); this.write(); }
  hero(id) {
    const s = this.data.heroes;
    if (!s[id]) {
      const inv = this.data.inventory;
      const w = inv.find((i) => i.id === 'training_sword') ?? inv[0], a = inv.find((i) => i.id === 'camp_shirt'), t = inv.find((i) => i.id === 'nectar_flask');
      s[id] = { skills: {}, skillPoints: this.data.level, gear: [w?.uid ?? null, a?.uid ?? null, t?.uid ?? null, null] };
    }
    return s[id];
  }
  item(uid) { return this.data.inventory.find((i) => i.uid === uid) ?? null; }
  gearFor(id) { return this.hero(id).gear.map((u) => (u ? this.item(u) : null)); }
  // XP curve: 100, 180, 260…
  xpFor(level) { return 60 + level * 60; }
  addXp(n) {
    const d = this.data; let ups = 0;
    d.xp += n;
    while (d.xp >= this.xpFor(d.level)) { d.xp -= this.xpFor(d.level); d.level++; d.enchantPoints++; ups++; for (const k in d.heroes) d.heroes[k].skillPoints++; }
    return ups;
  }
}

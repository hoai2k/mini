// One player's progress (a profile): drachmas, level and XP, enchantment
// points, every hero's skills and gear, the inventory, chapters completed
// (with the best difficulty), unlocked heroes, prophecy lines and records.
// Profiles are kept and merged by profiles.js; this file is the data shape
// and the per-profile helpers the game calls (game.save is the device's main
// profile, game.saveFor(player) the profile of whoever controls a hero).
//
// Pure module (no DOM, no Three.js), so the node tests can load it.
import { rollItem, normalizeItem } from './loot.js';
import { migrateHero, defaultLoadout, pointsFor, TREE_VERSION } from './heroes/skillRules.js';
import { t } from './text_config.js';
import { xpFor } from './progression.js';

export const LEGACY_KEY = 'half-blood-quests-save-v1';   // the single save of version 1
export const VERSION = 2;

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
export function newId(rnd = Math.random) { let s = ''; for (let i = 0; i < 10; i++) s += ID_CHARS[Math.floor(rnd() * 36)]; return s; }
export const ID_RE = /^[a-z0-9]{6,16}$/;
export function cleanName(s, def = t('profiles.playerBase')) {
  const n = String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return n || def;
}

function starterItems() {
  return ['training_sword', 'camp_shirt', 'nectar_flask'].map((id) => { const it = rollItem(8, { id, blessed: false }); delete it.isNew; return it; });
}

export function freshData(name = t('profiles.player1'), id = newId()) {
  return {
    version: VERSION,
    id, name: cleanName(name),
    rev: 0, updated: 0,          // rev counts writes; updated is ms since 1970 of the last change
    coins: 0,
    level: 1, xp: 0, enchantPoints: 1,
    heroes: {},                  // id -> { skills: {id: rank}, skillPoints, equip: [t1, t2, t3 power ids], tree, gear: [weaponUid, armorUid, art1Uid, art2Uid] }
    inventory: starterItems(),
    completed: {},               // chapterId -> best difficulty cleared
    unlockedHeroes: [],
    prophecy: {},                // bookId -> [line indices fulfilled]
    lastHero: 'percy',
    stats: { kills: 0, missions: 0, deaths: 0, domains: 0 },
    minigames: {},
    shop: null,
    // loot (design/loot-design.md): drops since the last Legendary (the Fates'
    // Thread pity rule), each boss's signature won at which difficulty, and
    // the NEW items not yet seen in the inventory (the HUD badge)
    sinceLegendary: 0,
    signatures: {},
    newCount: 0,
  };
}

// Fill in anything missing (older saves, imports) and clean the inventory.
export function normalizeData(d, fallbackName = t('profiles.player1')) {
  const base = freshData(fallbackName, ID_RE.test(d?.id) ? d.id : newId());
  if (!d || typeof d !== 'object') return base;
  const out = { ...base, ...d };
  out.version = VERSION;
  out.id = base.id;
  out.name = cleanName(d.name, base.name);
  out.inventory = Array.isArray(d.inventory) ? d.inventory.map(normalizeItem).filter((it) => it && typeof it.uid === 'string') : base.inventory;
  out.heroes = d.heroes && typeof d.heroes === 'object' ? d.heroes : {};
  for (const [k, h] of Object.entries(out.heroes)) {
    if (!h || typeof h !== 'object') { delete out.heroes[k]; continue; }
    h.gear = Array.isArray(h.gear) ? [0, 1, 2, 3].map((i) => (typeof h.gear[i] === 'string' ? h.gear[i] : null)) : [null, null, null, null];
  }
  out.completed = d.completed && typeof d.completed === 'object' ? d.completed : {};
  out.unlockedHeroes = Array.isArray(d.unlockedHeroes) ? d.unlockedHeroes.filter((x) => typeof x === 'string') : [];
  out.prophecy = d.prophecy && typeof d.prophecy === 'object' ? d.prophecy : {};
  out.stats = { ...base.stats, ...(d.stats && typeof d.stats === 'object' ? d.stats : {}) };
  out.minigames = d.minigames && typeof d.minigames === 'object' ? d.minigames : {};
  for (const k of ['coins', 'level', 'xp', 'enchantPoints', 'rev', 'updated']) out[k] = Number.isFinite(d[k]) ? d[k] : base[k];
  // loot fields (saves from before the loot rework have none: they start at zero,
  // and a boss beaten before still drops its signature on the next win)
  out.sinceLegendary = Number.isFinite(d.sinceLegendary) ? Math.max(0, Math.floor(d.sinceLegendary)) : 0;
  out.signatures = {};
  if (d.signatures && typeof d.signatures === 'object') for (const [k, v] of Object.entries(d.signatures)) if (Number.isFinite(v) && v > 0) out.signatures[k] = Math.min(4, Math.floor(v));
  out.newCount = out.inventory.filter((it) => it.isNew).length;
  out.level = Math.max(1, Math.floor(out.level));
  // skill trees: old ids moved, the rules applied, points = level - spent (heroes/skillRules.js)
  for (const [k, h] of Object.entries(out.heroes)) migrateHero(k, h, out.level);
  return out;
}

export class Save {
  // owner: the Profiles manager (debounced, safe writes), or null (tests).
  constructor(data, owner = null) { this.data = data; this.owner = owner; }
  get id() { return this.data.id; }
  get name() { return this.data.name; }
  // Ask for a write: the manager writes it shortly after (debounced) and on
  // page hide; without a manager it's a no-op.
  write() { this.data.updated = Date.now(); this.owner?.scheduleWrite(this); }
  writeNow() { this.data.updated = Date.now(); this.owner?.writeNow(this); }
  reset() {
    const keep = { id: this.data.id, name: this.data.name, rev: this.data.rev };
    const d = freshData(keep.name, keep.id); d.rev = keep.rev;
    for (const k of Object.keys(this.data)) delete this.data[k];
    Object.assign(this.data, d);
    this.owner?.writeNow(this, { replace: true });
  }
  hero(id) {
    const s = this.data.heroes;
    if (!s[id]) {
      const inv = this.data.inventory;
      const w = inv.find((i) => i.id === 'training_sword') ?? inv[0], a = inv.find((i) => i.id === 'camp_shirt'), t = inv.find((i) => i.id === 'nectar_flask');
      s[id] = { skills: {}, skillPoints: pointsFor(this.data.level), equip: defaultLoadout(id), tree: TREE_VERSION, gear: [w?.uid ?? null, a?.uid ?? null, t?.uid ?? null, null] };
    }
    return s[id];
  }
  item(uid) { return this.data.inventory.find((i) => i.uid === uid) ?? null; }
  gearFor(id) { return this.hero(id).gear.map((u) => (u ? this.item(u) : null)); }
  // XP to the next level (progression.js: 100 at level 1, about 2,000 at
  // level 15, 4,000 at level 30). A save from the older, flatter curve keeps
  // its level and XP; only the next levels cost more.
  xpFor(level) { return xpFor(level); }
  addXp(n) {
    const d = this.data; let ups = 0;
    d.xp += n;
    while (d.xp >= this.xpFor(d.level)) { d.xp -= this.xpFor(d.level); d.level++; d.enchantPoints++; ups++; for (const k in d.heroes) d.heroes[k].skillPoints++; }
    return ups;
  }
}

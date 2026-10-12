// One player's progress (a profile): drachmas, level and XP, enchantment
// points, every hero's skills and gear, the inventory, chapters completed
// (with the best difficulty), unlocked heroes, prophecy lines and records.
// Profiles are kept and merged by profiles.js; this file is the data shape
// and the per-profile helpers the game calls (game.save is the device's main
// profile, game.saveFor(player) the profile of whoever controls a hero).
//
// Pure module (no DOM, no Three.js), so the node tests can load it.
import { rollItem, normalizeItem } from './loot.js';

export const LEGACY_KEY = 'half-blood-quests-save-v1';   // the single save of version 1
export const VERSION = 2;

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
export function newId(rnd = Math.random) { let s = ''; for (let i = 0; i < 10; i++) s += ID_CHARS[Math.floor(rnd() * 36)]; return s; }
export const ID_RE = /^[a-z0-9]{6,16}$/;
export function cleanName(s, def = 'Player') {
  const n = String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return n || def;
}

function starterItems() {
  return ['training_sword', 'camp_shirt', 'nectar_flask'].map((id) => { const it = rollItem(8, { id, blessed: false }); delete it.isNew; return it; });
}

export function freshData(name = 'Player 1', id = newId()) {
  return {
    version: VERSION,
    id, name: cleanName(name),
    rev: 0, updated: 0,          // rev counts writes; updated is ms since 1970 of the last change
    coins: 0,
    level: 1, xp: 0, enchantPoints: 1,
    heroes: {},                  // id -> { skills: {id: rank}, skillPoints, gear: [weaponUid, armorUid, art1Uid, art2Uid] }
    inventory: starterItems(),
    completed: {},               // chapterId -> best difficulty cleared
    unlockedHeroes: [],
    prophecy: {},                // bookId -> [line indices fulfilled]
    lastHero: 'percy',
    stats: { kills: 0, missions: 0, deaths: 0, domains: 0 },
    minigames: {},
    shop: null,
  };
}

// Fill in anything missing (older saves, imports) and clean the inventory.
export function normalizeData(d, fallbackName = 'Player 1') {
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
    h.skills = h.skills && typeof h.skills === 'object' ? h.skills : {};
    h.gear = Array.isArray(h.gear) ? [0, 1, 2, 3].map((i) => (typeof h.gear[i] === 'string' ? h.gear[i] : null)) : [null, null, null, null];
    h.skillPoints = Number.isFinite(h.skillPoints) ? h.skillPoints : 0;
  }
  out.completed = d.completed && typeof d.completed === 'object' ? d.completed : {};
  out.unlockedHeroes = Array.isArray(d.unlockedHeroes) ? d.unlockedHeroes.filter((x) => typeof x === 'string') : [];
  out.prophecy = d.prophecy && typeof d.prophecy === 'object' ? d.prophecy : {};
  out.stats = { ...base.stats, ...(d.stats && typeof d.stats === 'object' ? d.stats : {}) };
  out.minigames = d.minigames && typeof d.minigames === 'object' ? d.minigames : {};
  for (const k of ['coins', 'level', 'xp', 'enchantPoints', 'rev', 'updated']) out[k] = Number.isFinite(d[k]) ? d[k] : base[k];
  out.level = Math.max(1, Math.floor(out.level));
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
      s[id] = { skills: {}, skillPoints: this.data.level, gear: [w?.uid ?? null, a?.uid ?? null, t?.uid ?? null, null] };
    }
    return s[id];
  }
  item(uid) { return this.data.inventory.find((i) => i.uid === uid) ?? null; }
  gearFor(id) { return this.hero(id).gear.map((u) => (u ? this.item(u) : null)); }
  // XP curve: 120, 180, 240…
  xpFor(level) { return 60 + level * 60; }
  addXp(n) {
    const d = this.data; let ups = 0;
    d.xp += n;
    while (d.xp >= this.xpFor(d.level)) { d.xp -= this.xpFor(d.level); d.level++; d.enchantPoints++; ups++; for (const k in d.heroes) d.heroes[k].skillPoints++; }
    return ups;
  }
}

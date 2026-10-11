// Player profiles: each human has one, keyed by a persistent id (a random
// 10-character code made on this device), with a name ("Player 1", or what
// they typed). The device's main profile is the keyboard / first player's;
// everyone else picks or makes one when they join on the hero select.
//
// Storage (localStorage):
//   hbq-profiles-v2          index: { version, main, ids: [...], slots: { slot: id }, migratedV1 }
//   hbq-profile-<id>         one profile (save.js data shape, with rev and updated)
//   hbq-profile-<id>.bak     the copy before the last write (kept in case a write is cut short)
//   half-blood-quests-save-v1  the old single save: merged into the main profile on first
//                              load (and left in place, untouched, as a backup)
//
// Writes are debounced (0.4 s) and flushed when the page hides or closes.
// A write first re-reads what is stored: if another tab (or an import) wrote
// a newer revision meanwhile, the two are merged rather than overwritten.
//
// Merging (mergeProfiles): the same person playing on two devices, brought
// together with an export code. Nothing is counted twice:
//   chapters      union, best difficulty        unlocked heroes  union
//   prophecy      union of lines per book       level / xp       the higher (level, then xp)
//   drachmas      the higher                    stats, records   the higher of each
//   inventory     union by item uid (the same uid in both keeps the more invested copy;
//                 two different items that happen to share a uid both stay)
//   skills        the higher rank of each skill per hero
//   skill points  recomputed: level − ranks spent (one point per level per hero)
//   enchantment points  recomputed: level − points invested in the merged inventory
//   gear          the newer profile's choice, where those items still exist
//
// Pure apart from the optional storage and lock objects, so node can test it.
import { Save, freshData, normalizeData, newId, cleanName, LEGACY_KEY, ID_RE } from './save.js';
import { spentPoints } from './loot.js';

export const INDEX_KEY = 'hbq-profiles-v2';
export const PROFILE_KEY = (id) => `hbq-profile-${id}`;
const WRITE_DELAY = 400;

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const invested = (it) => { try { return spentPoints(it) * 10 + (it.power ?? 0); } catch (e) { return it?.power ?? 0; } };

// ---------------------------------------------------------------- merge
export function mergeProfiles(aIn, bIn) {
  const a = normalizeData(aIn), b = normalizeData(bIn, a.name);
  b.id = a.id;
  const newer = num(b.updated) > num(a.updated) ? b : a, older = newer === a ? b : a;
  const out = normalizeData({ ...older, ...newer, id: a.id });
  // level and xp: whichever is further along
  const ahead = a.level > b.level || (a.level === b.level && a.xp >= b.xp) ? a : b;
  out.level = ahead.level; out.xp = ahead.xp;
  out.coins = Math.max(num(a.coins), num(b.coins));
  // chapters: union, best difficulty
  out.completed = {};
  for (const src of [a.completed, b.completed]) for (const [k, v] of Object.entries(src)) out.completed[k] = Math.max(out.completed[k] ?? 0, num(v, 1));
  out.unlockedHeroes = [...new Set([...a.unlockedHeroes, ...b.unlockedHeroes])];
  if (isObj(a.unlocked) || isObj(b.unlocked)) out.unlocked = { ...(isObj(a.unlocked) ? a.unlocked : {}), ...(isObj(b.unlocked) ? b.unlocked : {}) };
  out.prophecy = {};
  for (const src of [a.prophecy, b.prophecy]) for (const [book, lines] of Object.entries(src)) if (Array.isArray(lines)) out.prophecy[book] = [...new Set([...(out.prophecy[book] ?? []), ...lines])].sort((x, y) => x - y);
  out.stats = {};
  for (const k of new Set([...Object.keys(a.stats), ...Object.keys(b.stats)])) out.stats[k] = Math.max(num(a.stats[k]), num(b.stats[k]));
  out.minigames = {};
  for (const k of new Set([...Object.keys(a.minigames), ...Object.keys(b.minigames)])) {
    const x = a.minigames[k], y = b.minigames[k];
    out.minigames[k] = typeof x === 'number' || typeof y === 'number' ? Math.max(num(x), num(y)) : (y ?? x);
  }
  for (const k of ['seenGearHint', 'unlockAll', 'prophecySeen']) if (a[k] || b[k]) out[k] = a[k] || b[k];
  // inventory: union by uid
  const inv = new Map();
  for (const it of older.inventory) inv.set(it.uid, it);
  for (const it of newer.inventory) {
    const have = inv.get(it.uid);
    if (!have) { inv.set(it.uid, it); continue; }
    if (have.id !== it.id) { let u = it.uid + 'm', n = 1; while (inv.has(u)) u = it.uid + 'm' + (++n); inv.set(u, { ...it, uid: u }); continue; }
    if (invested(it) >= invested(have)) inv.set(it.uid, it);
  }
  out.inventory = [...inv.values()].map((it) => JSON.parse(JSON.stringify(it)));
  // heroes: skills at the best rank, gear from the newer profile (if the items exist)
  out.heroes = {};
  const has = new Set(out.inventory.map((it) => it.uid));
  for (const id of new Set([...Object.keys(a.heroes), ...Object.keys(b.heroes)])) {
    const hn = newer.heroes[id], ho = older.heroes[id];
    const skills = {};
    for (const src of [ho?.skills, hn?.skills]) if (src) for (const [k, r] of Object.entries(src)) skills[k] = Math.max(skills[k] ?? 0, num(r));
    const pick = (i) => { for (const h of [hn, ho]) { const u = h?.gear?.[i]; if (u && has.has(u)) return u; } return null; };
    const spent = Object.values(skills).reduce((s, r) => s + r, 0);
    out.heroes[id] = { skills, skillPoints: Math.max(0, out.level - spent), gear: [0, 1, 2, 3].map(pick) };
  }
  const spentAll = out.inventory.reduce((s, it) => { try { return s + spentPoints(it); } catch (e) { return s; } }, 0);
  out.enchantPoints = Math.max(0, out.level - spentAll);
  out.rev = Math.max(num(a.rev), num(b.rev)) + 1;
  out.updated = Math.max(num(a.updated), num(b.updated));
  out.name = newer.name;
  return out;
}

// ---------------------------------------------------------------- export codes
const b64e = (s) => { const bytes = new TextEncoder().encode(s); let bin = ''; for (const c of bytes) bin += String.fromCharCode(c); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64d = (s) => { const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); };
export function encodeProfile(data) { return 'HBQ2.' + b64e(JSON.stringify(data)); }
export function decodeProfile(code) {
  const m = /^\s*HBQ2\.([A-Za-z0-9_-]+)\s*$/.exec(String(code ?? ''));
  if (!m) return null;
  try { const d = JSON.parse(b64d(m[1])); return isObj(d) && ID_RE.test(d.id) ? normalizeData(d) : null; } catch (e) { return null; }
}

// ---------------------------------------------------------------- the manager
function defaultStorage() {
  try { const s = globalThis.localStorage; s.getItem(INDEX_KEY); return s; } catch (e) { return null; }
}

export class Profiles {
  constructor(storage = defaultStorage()) {
    this.store = storage;
    this.saves = new Map();        // id -> Save (loaded)
    this.devices = new Map();      // input device -> profile id (this session)
    this.dirty = new Set(); this.timer = null;
    this.index = this.readIndex();
    this.mainId = this.loadMain();
    if (typeof window !== 'undefined' && window.addEventListener) {
      const flush = () => this.flush();
      window.addEventListener('pagehide', flush);
      window.addEventListener('beforeunload', flush);
      document.addEventListener?.('visibilitychange', () => { if (document.hidden) flush(); });
    }
  }
  // ---- storage helpers
  get(key) { try { return this.store?.getItem(key) ?? null; } catch (e) { return null; } }
  set(key, val) {
    if (!this.store) return false;
    try { this.store.setItem(key, val); return true; } catch (e) {
      // storage full: drop the backups and try once more
      try { for (const id of this.index.ids) this.store.removeItem(PROFILE_KEY(id) + '.bak'); this.store.setItem(key, val); return true; } catch (e2) { return false; }
    }
  }
  readJSON(key) { const raw = this.get(key); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } }
  readIndex() {
    const d = this.readJSON(INDEX_KEY);
    const ix = { version: 2, main: null, ids: [], slots: {}, migratedV1: false };
    if (isObj(d)) {
      if (ID_RE.test(d.main)) ix.main = d.main;
      if (Array.isArray(d.ids)) ix.ids = d.ids.filter((x) => ID_RE.test(x));
      if (isObj(d.slots)) for (const [k, v] of Object.entries(d.slots)) if (ID_RE.test(v)) ix.slots[k] = v;
      ix.migratedV1 = !!d.migratedV1;
    }
    return ix;
  }
  writeIndex() { this.set(INDEX_KEY, JSON.stringify(this.index)); }
  readProfile(id) {
    const d = this.readJSON(PROFILE_KEY(id)) ?? this.readJSON(PROFILE_KEY(id) + '.bak');
    return isObj(d) ? normalizeData({ ...d, id }) : null;
  }
  // The main profile, creating it (and migrating the version 1 save into it) on first load.
  loadMain() {
    const ix = this.index;
    let main = ix.main && this.readProfile(ix.main);
    if (!main) { main = freshData('Player 1'); ix.main = main.id; }
    if (!ix.ids.includes(main.id)) ix.ids.unshift(main.id);
    const s = this.adopt(main);
    if (!ix.migratedV1) {
      const legacy = this.readJSON(LEGACY_KEY);
      if (isObj(legacy) && legacy.version === 1) {
        // (the old save counts as the newer one: its choices, such as the last hero, win)
        const merged = mergeProfiles(s.data, { ...legacy, id: s.data.id, name: s.data.name, updated: Math.max(1, (s.data.updated ?? 0) + 1) });
        this.replace(s, merged);
      }
      ix.migratedV1 = true;
      this.writeNow(s);
    }
    this.writeIndex();
    return s.data.id;
  }
  adopt(data) {
    const s = new Save(data, this);
    s.loadedRev = data.rev ?? 0;
    this.saves.set(data.id, s);
    return s;
  }
  replace(save, data) { for (const k of Object.keys(save.data)) delete save.data[k]; Object.assign(save.data, data); }

  // ---- profiles
  get main() { return this.saves.get(this.mainId); }
  ids() { return [...this.index.ids]; }
  profile(id) {
    if (this.saves.has(id)) return this.saves.get(id);
    const d = this.readProfile(id);
    return d ? this.adopt(d) : null;
  }
  // [{ id, name, level, chapters }] for menus
  list() {
    return this.index.ids.map((id) => {
      const s = this.saves.get(id); const d = s?.data ?? this.readProfile(id);
      return d ? { id, name: d.name, level: d.level, chapters: Object.keys(d.completed ?? {}).length, main: id === this.mainId } : null;
    }).filter(Boolean);
  }
  create(name) {
    const d = freshData(name ?? this.freeName());
    const s = this.adopt(d);
    this.index.ids.push(d.id); this.writeIndex(); this.writeNow(s);
    return s;
  }
  freeName(n = 2) { const names = new Set(this.list().map((p) => p.name)); while (names.has(`Player ${n}`)) n++; return `Player ${n}`; }
  // The profile named "Player <n>" (made if missing): the default for player slot n-1.
  byName(name) { const hit = this.list().find((p) => p.name === name); return hit ? this.profile(hit.id) : this.create(name); }
  rename(id, name) { const s = this.profile(id); if (!s) return; s.data.name = cleanName(name, s.data.name); s.write(); }
  remove(id) {
    if (id === this.mainId) return false;
    this.index.ids = this.index.ids.filter((x) => x !== id);
    for (const [k, v] of Object.entries(this.index.slots)) if (v === id) delete this.index.slots[k];
    this.saves.delete(id); this.writeIndex();
    try { this.store?.removeItem(PROFILE_KEY(id)); } catch (e) { /* ignore */ }
    return true;
  }
  // The profile this tab plays as main: another tab already holding the main
  // profile (Web Locks) gets a different one, so two tabs never write one profile.
  async claimMain() {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : null;
    if (!locks?.request) return this.main;
    const tryLock = (id) => new Promise((resolve) => {
      locks.request('hbq-profile-' + id, { ifAvailable: true }, (lock) => { if (!lock) { resolve(false); return undefined; } resolve(true); return new Promise(() => {}); }).catch(() => resolve(false));
    });
    for (const id of [this.mainId, ...this.index.ids.filter((x) => x !== this.mainId)]) {
      if (await tryLock(id)) { this.mainId = id; this.profile(id); return this.main; }
    }
    const s = this.create(this.freeName()); await tryLock(s.id); this.mainId = s.id;
    return s;
  }

  // ---- who plays with which profile (input device -> profile)
  assign(device, id) { if (this.profile(id)) this.devices.set(device, id); }
  forDevice(device) { const id = this.devices.get(device); return (id && this.saves.get(id)) || this.main; }
  idFor(device) { return this.forDevice(device).id; }
  // remember the last profile per player slot (the hero select starts there)
  rememberSlot(slot, id) { if (this.index.slots[slot] !== id) { this.index.slots[slot] = id; this.writeIndex(); } }
  slotDefault(slot) {
    if (slot === 0) return this.main;
    const id = this.index.slots[slot];
    return (id && id !== this.mainId && this.profile(id)) || this.byName(`Player ${slot + 1}`);
  }

  // ---- import / export
  exportCode(id) { const s = this.profile(id); return s ? encodeProfile(s.data) : ''; }
  // An export code from another device: the same profile id merges into the one
  // here; a new id is added as a profile. -> { save, merged } or null
  importCode(code) {
    const d = decodeProfile(code);
    if (!d) return null;
    const have = this.profile(d.id);
    if (have) { this.replace(have, mergeProfiles(have.data, d)); this.writeNow(have); return { save: have, merged: true }; }
    const s = this.adopt(d);
    this.index.ids.push(d.id); this.writeIndex(); this.writeNow(s);
    return { save: s, merged: false };
  }

  // ---- writing
  scheduleWrite(save) {
    this.dirty.add(save);
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, WRITE_DELAY);
  }
  flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    for (const s of [...this.dirty]) this.writeNow(s);
  }
  writeNow(save, { replace = false } = {}) {
    this.dirty.delete(save);
    if (!this.store) return false;
    const key = PROFILE_KEY(save.data.id);
    const raw = this.get(key);
    let stored = null;
    if (raw) { try { stored = JSON.parse(raw); } catch (e) { stored = null; } }
    // someone else wrote a newer revision: merge instead of overwriting it
    if (!replace && isObj(stored) && num(stored.rev) > num(save.loadedRev)) this.replace(save, mergeProfiles(save.data, { ...stored, id: save.data.id }));
    save.data.rev = Math.max(num(save.data.rev), num(stored?.rev)) + 1;
    const text = JSON.stringify(save.data);
    if (raw && stored) this.set(key + '.bak', raw);
    const ok = this.set(key, text);
    if (ok) save.loadedRev = save.data.rev;
    if (!this.index.ids.includes(save.data.id)) { this.index.ids.push(save.data.id); this.writeIndex(); }
    return ok;
  }
}

// Save slots ("save paths"). Each slot is a whole game's progress: its own
// player profiles (profiles.js: levels, drachmas, gear, chapters, prophecy)
// and its own resume point (resume.js). Starting a new game makes a new slot
// and never overwrites another; Continue on the title plays the active slot,
// and Settings → Saves lists every slot (make active, rename, delete).
//
// Storage (localStorage):
//   hbq-slots-v1            { version, active, list: [{ id, name, created, played, playTime, chapters, heroes }] }
//   slot "s1"               the keys profiles.js always used (no prefix), so the old saves and the
//                           version 1 single save become "Save 1" without moving anything
//   slot "s<n>"             the same keys under the prefix "hbq-s<n>-"
// A new slot keeps every player's identity (profile id and name, so online
// rejoining and export codes still know them) with fresh progress.
//
// Pure apart from the storage object, so node can test it.
import { INDEX_KEY, PROFILE_KEY } from './profiles.js';
import { freshData, ID_RE } from './save.js';

export const SLOTS_KEY = 'hbq-slots-v1';
export const RESUME_KEY = 'hbq-resume-v1';
export const slotPrefix = (id) => (id === 's1' ? '' : `hbq-${id}-`);
const SLOT_RE = /^s[0-9]{1,4}$/;
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

function defaultStorage() { try { const s = globalThis.localStorage; s.getItem(SLOTS_KEY); return s; } catch (e) { return null; } }

export class Slots {
  constructor(storage = defaultStorage(), now = () => Date.now()) {
    this.store = storage; this.now = now;
    this.index = this.read();
    if (!this.index) {
      // first run with slots: everything saved so far is Save 1
      const t = this.now();
      this.index = { version: 1, active: 's1', list: [{ id: 's1', name: 'Save 1', created: t, played: t, playTime: 0, chapters: 0, heroes: [] }] };
      this.write();
    }
  }
  read() {
    try {
      const d = JSON.parse(this.store?.getItem(SLOTS_KEY) || 'null');
      if (!isObj(d) || !Array.isArray(d.list)) return null;
      const list = d.list.filter((x) => isObj(x) && SLOT_RE.test(x.id)).map((x) => ({ id: x.id, name: String(x.name ?? 'Save').slice(0, 24), created: +x.created || 0, played: +x.played || 0, playTime: +x.playTime || 0, chapters: +x.chapters || 0, heroes: Array.isArray(x.heroes) ? x.heroes.filter((h) => typeof h === 'string').slice(0, 4) : [] }));
      if (!list.length) return null;
      return { version: 1, active: list.some((x) => x.id === d.active) ? d.active : list[0].id, list };
    } catch (e) { return null; }
  }
  write() { try { this.store?.setItem(SLOTS_KEY, JSON.stringify(this.index)); } catch (e) { /* full / private mode */ } }
  get active() { return this.index.active; }
  list() { return this.index.list.map((x) => ({ ...x, active: x.id === this.index.active })); }
  meta(id) { return this.index.list.find((x) => x.id === id) ?? null; }
  prefix(id = this.active) { return slotPrefix(id); }
  setActive(id) { if (this.meta(id)) { this.index.active = id; this.write(); return true; } return false; }
  rename(id, name) { const m = this.meta(id); if (!m) return; m.name = String(name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || m.name; this.write(); }
  // a slot's summary after play: when, how long, chapters, the party
  touch(id, { playTime = 0, chapters = null, heroes = null } = {}) {
    const m = this.meta(id); if (!m) return;
    m.played = this.now(); m.playTime += Math.max(0, playTime);
    if (chapters != null) m.chapters = chapters;
    if (heroes) m.heroes = heroes.slice(0, 4);
    this.write();
  }
  // A new game: a new slot (made active), never touching the others. people:
  // [{ id, name }] keeps each player's identity; the first is the main profile.
  create({ name = null, people = [] } = {}) {
    let n = 1; while (this.meta('s' + n)) n++;
    const id = 's' + n, prefix = slotPrefix(id), t = this.now();
    let k = 1; const names = new Set(this.index.list.map((x) => x.name)); while (names.has(`Save ${k}`)) k++;
    const ids = [];
    for (const p of people.length ? people : [{ name: 'Player 1' }]) {
      const d = freshData(p.name ?? 'Player 1', ID_RE.test(p.id ?? '') ? p.id : undefined);
      d.updated = t;
      ids.push(d.id);
      try { this.store?.setItem(prefix + PROFILE_KEY(d.id), JSON.stringify(d)); } catch (e) { /* full */ }
    }
    try { this.store?.setItem(prefix + INDEX_KEY, JSON.stringify({ version: 2, main: ids[0], ids, slots: {}, migratedV1: true })); } catch (e) { /* full */ }
    this.index.list.push({ id, name: name ?? `Save ${k}`, created: t, played: t, playTime: 0, chapters: 0, heroes: [] });
    this.index.active = id;
    this.write();
    return id;
  }
  // Delete a slot and everything in it (the game asks first). The last slot
  // can't be deleted, only replaced by a new game.
  remove(id) {
    if (!this.meta(id) || this.index.list.length < 2) return false;
    const prefix = slotPrefix(id), st = this.store;
    if (st) {
      const keys = [];
      if (prefix) { for (let i = 0; i < st.length; i++) { const k = st.key(i); if (k && k.startsWith(prefix)) keys.push(k); } }
      else {
        // slot 1 has no prefix: its index names its profiles
        try { const ix = JSON.parse(st.getItem(INDEX_KEY) || 'null'); for (const pid of ix?.ids ?? []) keys.push(PROFILE_KEY(pid), PROFILE_KEY(pid) + '.bak'); } catch (e) { /* ignore */ }
        keys.push(INDEX_KEY, RESUME_KEY);
      }
      for (const k of keys) { try { st.removeItem(k); } catch (e) { /* ignore */ } }
    }
    this.index.list = this.index.list.filter((x) => x.id !== id);
    if (this.index.active === id) this.index.active = this.index.list[0].id;
    this.write();
    return true;
  }
}

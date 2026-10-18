// Playlists: the listener's own lists of songs, plus automatic collections
// that gather songs by a label in their title ("(no bass)" → No Bass). No
// browser dependencies, so it runs under node --test.
//
// A playlist is { id, name, ids: string[], createdAt, auto?: ruleKey }.
// Automatic ones follow the rules below while the switch is on:
//   - a collection's playlist exists only once a song in the library matches;
//   - matching songs are added (new ones at the end), unless the listener
//     took that song out of the playlist (remembered in `excluded`);
//   - if the listener deletes the playlist it isn't made again (`dismissed`)
//     until the switch is turned off and on;
//   - it goes away by itself once no song in the library matches.
// With the switch off nothing is added; the playlists already made stay as
// ordinary playlists the listener can keep, edit or delete.

export const AUTO_RULES = [
  { key: 'no-bass', name: 'No Bass', match: /\(\s*no[\s-]*bass\s*\)/i },
  { key: 'no-piano', name: 'No Piano', match: /\(\s*no[\s-]*piano\s*\)/i },
];

/** Does the song belong to a collection? Looks at the title, else the file name. */
export function matchesRule(track, rule) {
  return rule.match.test(track.title || '') || (!track.title && rule.match.test(track.fileName || ''));
}

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** "Road Trip", or "Road Trip 2" when that name is taken. */
export function uniqueName(name, playlists, exceptId) {
  const base = String(name ?? '').trim() || 'New playlist';
  const taken = new Set(playlists.filter((p) => p.id !== exceptId).map((p) => p.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`.toLowerCase())) return `${base} ${n}`;
}

/**
 * Bring the automatic collections up to date.
 * @param {object[]} playlists current playlists (not changed)
 * @param {object[]} tracks the library, in the order new songs should join
 * @param {{ excluded?: Record<string, string[]>, dismissed?: Record<string, boolean> }} state
 * @param {boolean} enabled the switch
 * @returns {{ playlists: object[], changed: boolean, added: Record<string, number> }}
 */
export function syncAuto(playlists, tracks, state = {}, enabled = true, { makeId = newId, now = Date.now() } = {}) {
  const have = new Set(tracks.map((t) => t.id));
  let changed = false;
  const added = {};
  let out = playlists.map((p) => {
    const ids = p.ids.filter((id) => have.has(id));
    if (ids.length !== p.ids.length) changed = true;
    return ids.length !== p.ids.length ? { ...p, ids } : p;
  });
  if (!enabled) return { playlists: out, changed, added };
  // An empty automatic playlist goes once no song in the library matches it.
  const before = out.length;
  out = out.filter((p) => {
    const rule = p.auto && AUTO_RULES.find((r) => r.key === p.auto);
    return !(rule && p.ids.length === 0 && !tracks.some((t) => matchesRule(t, rule)));
  });
  if (out.length !== before) changed = true;
  for (const rule of AUTO_RULES) {
    if (state.dismissed?.[rule.key]) continue;
    const excluded = new Set(state.excluded?.[rule.key] ?? []);
    const matching = tracks.filter((t) => matchesRule(t, rule) && !excluded.has(t.id));
    let p = out.find((x) => x.auto === rule.key);
    const missing = matching.filter((t) => !p?.ids.includes(t.id));
    if (!missing.length) continue;
    if (!p) {
      p = { id: makeId(), name: uniqueName(rule.name, out), ids: [], createdAt: now, auto: rule.key };
      out = [...out, p];
    }
    const next = { ...p, ids: [...p.ids, ...missing.map((t) => t.id)] };
    out = out.map((x) => (x === p ? next : x));
    added[rule.key] = missing.length;
    changed = true;
  }
  return { playlists: out, changed, added };
}

/** Take songs out of every playlist; returns what was removed, for undo. */
export function removeFromAll(playlists, ids) {
  const gone = new Set(ids);
  const removed = [];
  const out = playlists.map((p) => {
    if (!p.ids.some((id) => gone.has(id))) return p;
    p.ids.forEach((id, index) => { if (gone.has(id)) removed.push({ pid: p.id, id, index }); });
    return { ...p, ids: p.ids.filter((id) => !gone.has(id)) };
  });
  return { playlists: out, removed };
}

/** Put back what removeFromAll took out, at the same places. */
export function restoreToAll(playlists, removed) {
  const byList = new Map();
  for (const r of removed) {
    if (!byList.has(r.pid)) byList.set(r.pid, []);
    byList.get(r.pid).push(r);
  }
  return playlists.map((p) => {
    const rs = byList.get(p.id);
    if (!rs) return p;
    const ids = p.ids.slice();
    for (const r of rs.sort((a, b) => a.index - b.index)) if (!ids.includes(r.id)) ids.splice(Math.min(r.index, ids.length), 0, r.id);
    return { ...p, ids };
  });
}

/** Up to four different cover keys for a playlist's picture. */
export function mosaicKeys(p, trackMap) {
  const keys = [];
  for (const id of p.ids) {
    const k = trackMap.get(id)?.artKey;
    if (k && !keys.includes(k)) keys.push(k);
    if (keys.length === 4) break;
  }
  return keys;
}

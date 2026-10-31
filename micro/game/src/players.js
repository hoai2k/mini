// The shell's view of the local players (up to four). The roster itself is
// shared/players.js (createPlayers: P1 is the keyboard plus the first
// controller; any button on an unassigned controller joins the next player),
// which the worlds use too. If that module is not on disk yet, a small stub
// with the same surface stands in, so the shell runs either way.
//
//   const roster = await loadRoster();
//   roster.poll();                 // once a frame on the title, menu, intro and pause
//   roster.onJoin((p) => toast);   // p: { index, color, name }
//   roster.list                    // [{ index, color, name, pad }]
//   roster.toJSON()                // passed to the world in the `players` message

export const COLORS = ['#d8a440', '#4f9fd8', '#d0584e', '#6fbf6a'];

function stubRoster(max = 4) {
  let players = [{ index: 0, color: COLORS[0], name: 'Player 1', pad: null }];
  const joinFns = [];
  const prevHeld = new Map();
  return {
    stub: true,
    get list() { return players.slice(); },
    get hasController() { return players.some((p) => p.pad !== null); },
    poll() {
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter((g) => g && g.connected) : [];
      for (const g of pads) {
        const held = g.buttons.some((b) => b.pressed || b.value > 0.5);
        const was = prevHeld.get(g.index);
        prevHeld.set(g.index, held);
        if (was === undefined || !held || was) continue;
        if (players.some((p) => p.pad === g.index)) continue;
        if (players[0].pad === null) { players[0].pad = g.index; continue; }
        if (players.length >= max) continue;
        const p = { index: players.length, color: COLORS[players.length], name: `Player ${players.length + 1}`, pad: g.index };
        players.push(p);
        joinFns.forEach((f) => f(p));
      }
      // A controller that went away frees its slot (P1 keeps the keyboard).
      const live = new Set(pads.map((g) => g.index));
      players = players.filter((p) => p.index === 0 || live.has(p.pad));
      if (players[0].pad !== null && !live.has(players[0].pad)) players[0].pad = null;
      players.forEach((p, i) => { p.index = i; p.color = COLORS[i]; p.name = `Player ${i + 1}`; });
    },
    onJoin(fn) { joinFns.push(fn); },
    toJSON() { return players.map(({ index, color, name, pad }) => ({ index, color, name, pad })); },
    fromJSON(list) { if (Array.isArray(list) && list.length) players = list.map((p, i) => ({ index: i, color: p.color || COLORS[i], name: p.name || `Player ${i + 1}`, pad: p.pad ?? null })); },
  };
}

// Wrap the shared roster so the shell sees one surface whatever its exact shape.
function adapt(r) {
  const arr = () => {
    const v = r.list ?? r.players ?? (typeof r.all === 'function' ? r.all() : []);
    return (Array.isArray(v) ? v : []).map((p, i) => ({ index: p.index ?? i, color: p.color || COLORS[i], name: p.name || `Player ${i + 1}`, pad: p.pad ?? p.padIndex ?? null }));
  };
  const joinFns = [];
  let known = arr().length;
  return {
    stub: false,
    get list() { return arr(); },
    get hasController() { return typeof r.hasController === 'function' ? r.hasController() : !!r.hasController; },
    poll() {
      r.poll?.();
      const now = arr();
      for (let i = known; i < now.length; i++) joinFns.forEach((f) => f(now[i]));
      known = now.length;
    },
    onJoin(fn) { joinFns.push(fn); },
    toJSON() { return r.toJSON ? r.toJSON() : arr(); },
    fromJSON(j) { r.fromJSON?.(j); known = arr().length; },
  };
}

export async function loadRoster(protoBase) {
  try {
    const mod = await import(new URL('shared/players.js', protoBase).href);
    if (typeof mod.createPlayers === 'function') return adapt(mod.createPlayers({ max: 4 }));
  } catch { /* not built yet: the stub stands in */ }
  return stubRoster();
}

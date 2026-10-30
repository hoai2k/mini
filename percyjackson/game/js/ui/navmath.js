// The pure rules behind menu navigation (no DOM, so test/menus.test.mjs can
// drive them): where a d-pad / arrow press moves the focus, with wraparound,
// how tabs cycle, and when a player's own menu pauses the game.

// A rect: { left, top, width, height } (a DOMRect will do), plus `grid`: the
// id of the [data-navgrid] container it sits in, or null.
const centre = (r) => [r.left + r.width / 2, r.top + r.height / 2];
// Overlap on the axis across the move: for up/down, the two share some
// columns of pixels; for left/right, some rows.
function aligned(a, b, vertical) {
  const ov = vertical
    ? Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
    : Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return ov > 1;
}

// The index in `items` to move to from `cur` (one of items) for a press of
// (dx, dy) (one of them ±1), or -1 for nowhere.
//   0. In a grid ([data-navgrid]), left / right stay in the row: the next
//      item along it, or round to its other end (a grid's row never hands the
//      focus to what is beside the grid; the inventory's item details are
//      reached from the equipped slots or the kinds row instead).
//   1. Something ahead and in line (the same column for up/down, the same row
//      for left/right): the nearest of those. (Up from a grid's top row this
//      way reaches what is above it, the inventory's kinds row.)
//   2. In a grid ([data-navgrid]), nothing in line ahead:
//      a. up or down, grid items ahead but not in line (a ragged last row,
//         shorter than the column you are in): the nearest of them, so Down
//         still reaches that row (it lands on its nearest item, usually the
//         last) rather than skipping it; left or right never leave the row
//         this way (a grid fills row by row, so rows are never ragged
//         sideways);
//      b. else wrap inside the grid, to the far end of the same column (up /
//         down) or row (left / right).
//   3. Anything ahead at all: the nearest by distance (the old rule: along the
//      move plus 2.5 × off to the side).
//   4. Nothing ahead: wrap, to the far side of the menu, in line if anything
//      is (so Down on the last item of a list is its first item).
export function pickTarget(cur, items, dx, dy) {
  const vertical = dy !== 0;
  const [cx, cy] = centre(cur);
  const ahead = [];
  items.forEach((e, i) => {
    if (e === cur) return;
    const [ex, ey] = centre(e);
    const along = (ex - cx) * dx + (ey - cy) * dy;
    if (along <= 4) return;
    const perp = Math.abs((ex - cx) * dy) + Math.abs((ey - cy) * dx);
    ahead.push({ i, along, perp, inLine: aligned(cur, e, vertical) });
  });
  const nearest = (list) => { let b = null; for (const c of list) if (!b || c.along + c.perp * 2.5 < b.along + b.perp * 2.5) b = c; return b ? b.i : -1; };
  // in a grid, left and right stay in the row: the next item, or round to its other end
  if (cur.grid != null && !vertical) {
    const row = ahead.filter((a) => a.inLine && items[a.i].grid === cur.grid);
    if (row.length) return nearest(row);
    const w = wrapTo(cur, items, dx, dy, (e) => e.grid === cur.grid, true);
    if (w >= 0) return w;
  }
  const inLine = ahead.filter((a) => a.inLine);
  if (inLine.length) return nearest(inLine);
  if (cur.grid != null) {
    const g = vertical ? ahead.filter((a) => items[a.i].grid === cur.grid) : [];   // (grids fill row by row: only the last row is short)
    if (g.length) return nearest(g);
    const w = wrapTo(cur, items, dx, dy, (e) => e.grid === cur.grid, true);
    if (w >= 0) return w;
  }
  if (ahead.length) return nearest(ahead);
  return wrapTo(cur, items, dx, dy, () => true, false);
}

// The far side, opposite the press: the item furthest back along the move,
// among those in line with cur if any are (onlyInLine: those or nothing).
function wrapTo(cur, items, dx, dy, keep, onlyInLine) {
  const vertical = dy !== 0;
  const [cx, cy] = centre(cur);
  const pool = [];
  items.forEach((e, i) => { if (e !== cur && keep(e)) pool.push({ i, e }); });
  let list = pool.filter((p) => aligned(cur, p.e, vertical));
  if (!list.length) { if (onlyInLine) return -1; list = pool; }
  let best = -1, bestS = -Infinity;
  for (const { i, e } of list) {
    const [ex, ey] = centre(e);
    const back = -((ex - cx) * dx + (ey - cy) * dy);   // how far back along the move
    const perp = Math.abs((ex - cx) * dy) + Math.abs((ey - cy) * dx);
    const s = back - perp * 0.01;   // (furthest back; level with cur breaks a tie)
    if (s > bestS) { bestS = s; best = i; }
  }
  return best;
}

// The next tab, round and round: dir +1 (RB, E, Tab) or -1 (LB, Q, Shift+Tab).
export function cycleTab(tabs, cur, dir) {
  if (!tabs.length) return cur;
  const i = tabs.indexOf(cur);
  if (i < 0) return tabs[0];
  return tabs[(i + (dir < 0 ? -1 : 1) + tabs.length) % tabs.length];
}

// Does a player's own menu (inventory, skill tree, map, prophecy) pause the
// game? Only when that player is the only human playing: alone (AI
// companions don't count) and not online. With other people playing, on
// this screen or online, the game runs on and that player's hero stands
// still, as an open inventory does in Minecraft Dungeons' co-op.
//   humans: human players in the game (this screen's and online ones)
export function menuPauses({ humans = 1, online = false } = {}) {
  return !online && humans <= 1;
}

// Where player i of n (this screen's humans, in player order) has their own
// menu, as fractions of the screen: alone the whole screen (the menu sits in
// the middle), two side by side (P1 left, P2 right), three or four a quarter
// each (P1 P2 on top, P3 P4 below). On a screen taller than it is wide
// (portrait), two players have the top and bottom halves instead.
export function regionFor(i, n, { portrait = false } = {}) {
  if (n <= 1) return { x: 0, y: 0, w: 1, h: 1 };
  if (n === 2) return portrait ? { x: 0, y: (i % 2) * 0.5, w: 1, h: 0.5 } : { x: (i % 2) * 0.5, y: 0, w: 0.5, h: 1 };
  return { x: (i % 2) * 0.5, y: (Math.floor(i / 2) % 2) * 0.5, w: 0.5, h: 0.5 };
}

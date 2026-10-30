// Checks for menu navigation (js/ui/navmath.js): wraparound in lists, grids
// and ragged grids, tab cycling, when a player's own menu pauses the game,
// and where each player's menu sits on screen. Plus the wiring the browser
// check (perf/menus.cjs) drives for real: the bindings, the pause menu's
// contents and the Debug tab.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickTarget, cycleTab, menuPauses, regionFor } from '../js/ui/navmath.js';
import { keyFrame, KEYMAP } from '../js/padmap.js';
import { t } from '../js/text_config.js';

const read = (f) => readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const rect = (left, top, width = 100, height = 40, grid = null) => ({ left, top, width, height, grid });
// press (dx, dy) from item `from`: the index it lands on
const go = (items, from, dx, dy) => pickTarget(items[from], items, dx, dy);

test('a vertical list: down and up move one item, and wrap round at the ends', () => {
  const list = [0, 1, 2, 3, 4].map((i) => rect(100, i * 50));
  assert.equal(go(list, 0, 0, 1), 1);
  assert.equal(go(list, 3, 0, -1), 2);
  assert.equal(go(list, 4, 0, 1), 0, 'down on the bottom item: the top item');
  assert.equal(go(list, 0, 0, -1), 4, 'up on the top item: the bottom item');
});

test('a list of buttons of different widths (the pause menu) still wraps', () => {
  const list = [rect(80, 0, 200), rect(120, 50, 120), rect(60, 100, 240), rect(100, 150, 160)];
  assert.equal(go(list, 3, 0, 1), 0);
  assert.equal(go(list, 0, 0, -1), 3);
});

test('a row of tabs wraps left and right', () => {
  const row = [0, 1, 2, 3, 4].map((i) => rect(i * 110, 0, 100, 30));
  assert.equal(go(row, 4, 1, 0), 0);
  assert.equal(go(row, 0, -1, 0), 4);
  assert.equal(go(row, 2, 1, 0), 3);
});

// a 4-column grid of 10 items: rows of 4, 4 and 2 (ragged), marked as one grid
function grid(n = 10, cols = 4, x0 = 0, y0 = 100) {
  return Array.from({ length: n }, (_, i) => rect(x0 + (i % cols) * 70, y0 + Math.floor(i / cols) * 70, 64, 64, 0));
}

test('a grid wraps vertically within its column and horizontally within its row', () => {
  const g = grid(12);   // 3 full rows of 4
  assert.equal(go(g, 9, 0, 1), 1, 'down on the bottom of column 1: its top');
  assert.equal(go(g, 2, 0, -1), 10, 'up on the top of column 2: its bottom');
  assert.equal(go(g, 7, 1, 0), 4, 'right at the end of row 1: its start');
  assert.equal(go(g, 4, -1, 0), 7, 'left at the start of row 1: its end');
  assert.equal(go(g, 5, 0, 1), 9, 'inside the grid it moves as before');
});

test('a ragged grid: down into the short last row lands on its nearest item, then wraps within that column', () => {
  const g = grid(10);   // rows: 0-3, 4-7, 8-9
  assert.equal(go(g, 6, 0, 1), 9, 'down from column 2 (nothing below it): the last row\'s nearest item');
  assert.equal(go(g, 7, 0, 1), 9, 'down from column 3: the same');
  assert.equal(go(g, 9, 0, 1), 1, 'down again: round to the top of column 1');
  assert.equal(go(g, 3, 0, -1), 7, 'up on the top of column 3 (short): the last item in that column');
  assert.equal(go(g, 9, 1, 0), 8, 'right at the end of the short row: its start');
  assert.equal(go(g, 8, -1, 0), 9, 'left at its start: its end');
});

test('a grid with things around it: you can leave it where something is in line, and wrap where nothing is', () => {
  const g = grid(8);   // 2 rows of 4, at x 0..274, y 100..234
  const tabs = [rect(0, 40, 100, 30), rect(150, 40, 100, 30)];   // above the grid
  const detail = rect(320, 100, 200, 60);                        // to its right, level with row 0
  const items = [...g, ...tabs, detail];
  assert.equal(go(items, 0, 0, -1), 8, 'up from the top row: the tab above');
  assert.equal(go(items, 3, 1, 0), 0, 'right at the end of row 0: round to its start (the panel beside it is not in the row)');
  assert.equal(go(items, 0, -1, 0), 3, 'left at the start of a row: round to its end');
  assert.equal(go(items, 8, 1, 0), 9, 'the tabs above are not a grid: right moves along them');
  const panelRow = [rect(0, 300, 100, 30), rect(320, 290, 200, 60)];   // a button level with the panel: right reaches it
  assert.equal(go([...items, ...panelRow], 11, 1, 0), 12, 'outside the grid, right reaches the panel in line');
  assert.equal(go(items, 5, 0, 1), 1, 'down from the bottom row (nothing below): round within the column');
});

test('nothing in line ahead: the nearest thing that way (not a wrap)', () => {
  const items = [rect(0, 0, 100, 40), rect(300, 100, 100, 40)];
  assert.equal(go(items, 0, 0, 1), 1);
  assert.equal(go(items, 1, 0, 1), 0, 'and from the bottom, round to the top');
});

test('a lone item goes nowhere', () => {
  const items = [rect(0, 0)];
  assert.equal(go(items, 0, 0, 1), -1);
});

test('tabs cycle round and round both ways', () => {
  const tabs = ['inventory', 'skills', 'map', 'prophecy'];
  assert.equal(cycleTab(tabs, 'inventory', 1), 'skills');
  assert.equal(cycleTab(tabs, 'prophecy', 1), 'inventory', 'RB on the last tab: the first');
  assert.equal(cycleTab(tabs, 'inventory', -1), 'prophecy', 'LB on the first tab: the last');
  assert.equal(cycleTab(tabs, 'map', -1), 'skills');
  let cur = 'inventory';
  for (let i = 0; i < tabs.length; i++) cur = cycleTab(tabs, cur, 1);
  assert.equal(cur, 'inventory', 'four presses of RB come back to the start');
  assert.equal(cycleTab(tabs, 'nope', 1), 'inventory', 'an unknown tab starts at the first');
  assert.equal(cycleTab([], 'x', 1), 'x');
});

test('a player\'s own menu pauses only when that player is the only human', () => {
  assert.equal(menuPauses({ humans: 1 }), true, 'alone (companions don\'t count): paused');
  assert.equal(menuPauses({ humans: 2 }), false, 'two on one screen: the game goes on');
  assert.equal(menuPauses({ humans: 4 }), false);
  assert.equal(menuPauses({ humans: 1, online: true }), false, 'online: never pauses anyone');
  assert.equal(menuPauses({ humans: 3, online: true }), false);
});

test('each player\'s menu has its own region of the screen', () => {
  assert.deepEqual(regionFor(0, 1), { x: 0, y: 0, w: 1, h: 1 });
  assert.deepEqual(regionFor(0, 2), { x: 0, y: 0, w: 0.5, h: 1 });
  assert.deepEqual(regionFor(1, 2), { x: 0.5, y: 0, w: 0.5, h: 1 });
  assert.deepEqual(regionFor(1, 2, { portrait: true }), { x: 0, y: 0.5, w: 1, h: 0.5 }, 'portrait: top and bottom');
  const four = [0, 1, 2, 3].map((i) => regionFor(i, 4));
  assert.deepEqual(four.map((r) => [r.x, r.y]), [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]);
  // no two regions overlap
  for (const [n, portrait] of [[2, false], [2, true], [3, false], [4, false], [4, true]]) {
    const rs = Array.from({ length: n }, (_, i) => regionFor(i, n, { portrait }));
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const A = rs[a], B = rs[b];
      const overlap = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) > 0 && Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) > 0;
      assert.ok(!overlap, `players ${a + 1} and ${b + 1} of ${n}`);
    }
  }
});

test('the bindings: I / Tab, M, K open your own menu; Esc and P pause', () => {
  const one = (k) => Object.keys(keyFrame(new Set([k]), new Set(), {}, 0).held).filter(Boolean);
  assert.deepEqual(one('KeyI'), ['inv']); assert.deepEqual(one('Tab'), ['inv']);
  assert.deepEqual(one('KeyM'), ['map']); assert.deepEqual(one('KeyK'), ['skills']);
  assert.deepEqual(one('Escape'), ['pause']); assert.deepEqual(one('KeyP'), ['pause']);
  assert.equal(KEYMAP.KeyQ, 'slam', 'Q is still the jump slam in play (in a menu it is the previous tab)');
  const I = read('input.js');
  for (const k of ["tabL: edge('KeyQ')", "tabR: edge('KeyE')", "edge('Tab') && shift", 'tabL: !!B[4]?.pressed', 'tabR: !!B[5]?.pressed', 'view: !!B[8]?.pressed', 'start: !!B[9]?.pressed', 'back: !!B[1]?.pressed']) assert.ok(I.includes(k), k);
  // menu presses are worked out every frame, so the Esc that pauses never also resumes
  assert.match(I, /this\.menuFrame\(\);\n  \}/);
});

test('the shared pause menu holds only what is everyone\'s; Debug: scenes and Photo mode are in Settings → Debug', () => {
  const S = read('ui/screens.js'), P = S.slice(S.indexOf('export function openPauseMenu'));
  for (const gone of ['openInventory(', 'openSkills(', 'openProphecy(', 'openMap(', 'openPhotoMode', 'openDebugMenu']) assert.ok(!P.includes(gone), gone);
  for (const kept of ['screens.pause.resume', 'screens.pause.settings', 'screens.pause.quitButton', 'onBack: resume']) assert.ok(P.includes(kept), kept);
  assert.match(P, /if \(m\.start\) \{[^}]*resume\(\)/, 'Menu again resumes');
  const set = read('ui/settingsScreen.js');
  assert.match(set, /\['debug', t\('settings\.tabs\.debug'\)\]/);
  const dbg = set.slice(set.indexOf("tab === 'debug'"));
  assert.ok(dbg.indexOf('openDebugMenu(game)') > 0 && dbg.indexOf('openDebugMenu(game)') < dbg.indexOf('} else {'), 'Scenes in the Debug tab');
  assert.ok(dbg.indexOf('openPhotoMode') > 0 && dbg.indexOf('openPhotoMode') < dbg.indexOf('} else {'), 'Photo mode in the Debug tab');
  assert.ok(!read('ui/title.js').includes('openDebugMenu'), 'not on the title any more');
  for (const k of ['settings.tabs.debug', 'settings.debugTab.hint', 'settings.debugTab.photo', 'playerMenu.tabs.inventory', 'playerMenu.tabs.skills', 'playerMenu.tabs.map', 'playerMenu.tabs.prophecy', 'playerMenu.hint.pad', 'playerMenu.hint.kbm', 'screens.pause.yourMenu.pad']) assert.notEqual(t(k), k, k);
});

test('photo mode leaves the menus under it, and B / Esc goes back to them', () => {
  const P = read('photo.js'), M = read('main.js');
  assert.ok(!P.includes('ui.closeAll'), 'the menus stay');
  assert.match(P, /game\.paused = wasPaused/);
  assert.match(M, /if \(photo\) \{ if \(this\.input\.menu\(\)\.back\) this\.photo\.close\(\); this\.input\.swallowMenu\(\); \}/);
});

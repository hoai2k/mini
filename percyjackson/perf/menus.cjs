// The menus in the real game (headless), driven with real key presses and
// fake controllers:
//   • Esc pauses, Esc resumes, and backs out of Settings one level; Menu
//     (Start) pauses and resumes too.
//   • Wraparound: the pause menu, Settings, the inventory grid (column and row).
//   • Settings → Debug holds Debug: scenes and Photo mode, and both work
//     (Photo mode goes back to the Debug tab with Esc).
//   • Each player's own menu: I opens it, E / RB cycle its tabs; alone it
//     pauses; in local co-op P2 opens theirs while P1 keeps moving and the
//     game runs on, both open at once in their own halves, each driven only by
//     its own device, and the B that closes one never makes that hero dodge.
//   • The tab bar of every tabbed menu (Settings, the player's menu, the
//     inventory's kinds, the forge, the world map and the chapter map) stays
//     put while every tab is shown, at a desktop size, a small window and a
//     phone (both ways up), and the focus scrolls into view inside a
//     scrolling tab.
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/menus.cjs [--shots dir]
// As a module (check.cjs): run({ browser?, base, shots? }) resolves to
// { ok, lines, summary, rows }.
const { launch, seed, ensureServer } = require('./lib.cjs');
const path = require('path');
const fs = require('fs');

// fake controllers (window.__pads[i] = { b: Set of buttons held, axes }), before the game runs
const FAKE_PADS = () => {
  window.__pads = [];
  navigator.getGamepads = () => window.__pads.map((p, i) => p && ({ index: i, connected: true, id: 'fake pad ' + i, mapping: 'standard', timestamp: performance.now(),
    buttons: Array.from({ length: 17 }, (_, k) => ({ pressed: p.b.has(k), value: p.b.has(k) ? 1 : 0, touched: p.b.has(k) })), axes: p.axes ?? [0, 0, 0, 0] }));
};
const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

async function run({ browser = null, base, shots = null }) {
  const rows = [], lines = [];
  const check = (name, ok, info = '') => { rows.push({ name, ok: !!ok, info }); lines.push(`${ok ? 'ok  ' : 'FAIL'}  ${name}${info ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`); };
  const { browser: b, context, page } = await launch({ flags: 'webgl', width: 1280, height: 720, browser });
  const errors = [];
  try {
    await context.addInitScript(FAKE_PADS);
    await seed(context, { settings: { dynRes: false } });
    page.on('pageerror', (e) => errors.push(String(e.stack || e).slice(0, 400)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
    await page.goto(base, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 240000, polling: 100 });
    if (shots) fs.mkdirSync(shots, { recursive: true });
    const shot = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png'), timeout: 15000 }).catch((e) => lines.push(`(no screenshot ${name}: ${String(e.message).split('\n')[0]})`)); };
    const ev = (f, a) => page.evaluate(f, a);
    const frames = async (n = 2) => { const f0 = await ev(() => window.__game.framesDrawn ?? 0); await page.waitForFunction((k) => (window.__game.framesDrawn ?? 0) >= k, f0 + n, { polling: 16, timeout: 60000 }); };
    // a press: down for one frame (headless frames are slow: longer would be the menus' auto-repeat)
    const tap = async (key) => { await page.keyboard.down(key); await frames(1); await page.keyboard.up(key); await frames(2); };
    const padDown = (i, btn) => ev(([i, x]) => window.__pads[i].b.add(x), [i, btn]);
    const padUp = (i, btn) => ev(([i, x]) => window.__pads[i].b.delete(x), [i, btn]);
    const press = async (i, btn) => { await padDown(i, btn); await frames(1); await padUp(i, btn); await frames(2); };
    const S = () => ev(() => {
      const g = window.__game, f = g.ui.focusEl;
      return { paused: g.paused, stack: g.ui.stack.map((s) => s.id), focus: f?.dataset?.k ?? f?.textContent?.trim().slice(0, 30) ?? null,
        menus: [...g.playerMenus.menus.values()].map((m) => ({ p: m.player.index, tab: m.tab, focus: m.nav.focusEl?.dataset?.k ?? m.nav.focusEl?.textContent?.trim().slice(0, 30) ?? null })) };
    });
    // where a tab bar is on screen (selector inside the top shared screen, or a player's menu)
    const barRect = (sel, who = null) => ev(([sel, who]) => {
      const g = window.__game;
      const root = who == null ? g.ui.top()?.el : [...g.playerMenus.menus.values()].find((m) => m.player.index === who)?.el;
      const r = root?.querySelector(sel)?.getBoundingClientRect();
      return r ? [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 10) / 10) : null;
    }, [sel, who]);
    // cycle through every tab (n presses of `next`), the tab bar's box at each; [boxes, tabs seen]
    const cycle = async (n, next, sel, who = null, tabOf) => {
      const boxes = [], seen = [];
      for (let i = 0; i <= n; i++) { boxes.push(await barRect(sel, who)); seen.push(await ev(tabOf, who)); if (i < n) await next(); }
      return { boxes, seen };
    };
    const steady = (boxes) => boxes.length > 1 && boxes.every((x) => x && JSON.stringify(x) === JSON.stringify(boxes[0]));
    const settingsTab = () => window.__game.ui.screen('settings')?.querySelector('[data-tabbar] .on')?.dataset.k;
    const pmTab = (who) => [...window.__game.playerMenus.menus.values()].find((m) => m.player.index === who)?.tab;
    const filterTab = (who) => {
      const g = window.__game, m = who == null ? null : [...g.playerMenus.menus.values()].find((x) => x.player.index === who);
      const el = m ? m.el : g.ui.top()?.el;
      return el?.querySelector('.inv-filters [aria-selected=true]')?.dataset.k;
    };
    const wmTab = () => window.__game.ui.top()?.el.querySelector('[data-tabbar] [aria-selected=true]')?.dataset.k;
    const cmTab = () => window.__game.ui.top()?.el.querySelector('.book-tabs .tab.on .bn')?.textContent;

    // ---- a chapter, alone, on the keyboard; ten items in the stash
    const start = (list) => ev(async (list) => {
      const g = window.__game; const js = location.origin + '/percyjackson/game/js/';
      const { Mission } = await import(js + 'mission.js'); const { chapter, CHAPTERS } = await import(js + 'story/chapters.js');
      const L = await import(js + 'loot.js');
      const d = g.save.data; d.opening = 'done'; d.seenGearHint = true; for (const c of CHAPTERS) d.completed[c.id] = 1; d.level = 12;
      if (d.inventory.length < 10) for (let i = 0; i < 10; i++) d.inventory.push(L.normalizeItem ? L.normalizeItem(L.rollItem(40, { kind: ['weapon', 'armor', 'artifact'][i % 3] })) : L.rollItem(40, {}));
      g.save.write();
      g.ui.closeAll(); g.beginSession(list, { companions: [], fill: false });
      g.startMission(Mission.defForChapter(chapter('lt2'), 2));
      const w = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 120 && !(g.mission && g.state === 'playing'); i++) { g.ui.closeAll?.(); await w(250); }
      await w(1200); g.ui.closeAll?.(); g.paused = false;
      return { state: g.state, players: g.players.map((p) => [p.device, p.ai]) };
    }, list);
    const st0 = await start([{ device: 'kbm', hero: 'percy' }]);
    check('a chapter starts', st0.state === 'playing', st0);

    // ---- 1. Esc pauses and resumes
    let s;
    await tap('Escape'); s = await S();
    check('Esc pauses', s.paused && s.stack.join() === 'pause', s);
    await shot('01-pause');
    await tap('Escape'); s = await S();
    check('Esc again resumes', !s.paused && !s.stack.length, s);
    await page.keyboard.down('Escape'); for (let i = 0; i < 6; i++) await frames(1); await page.keyboard.up('Escape'); await frames(2); s = await S();
    check('holding Esc pauses once (it does not flicker open and shut)', s.paused && s.stack.join() === 'pause', s);

    // ---- 2. wraparound in the pause menu
    await tap('ArrowUp'); s = await S();
    check('pause menu: up on the top item is the bottom item', /Quit/.test(s.focus), s.focus);
    await tap('ArrowDown'); s = await S();
    check('pause menu: down on the bottom item is the top item', /Resume/.test(s.focus), s.focus);

    // ---- 3. Settings: Esc backs out one level; wraparound; the Debug tab
    await tap('ArrowDown'); await tap('ArrowDown'); s = await S();
    await tap('Enter'); s = await S();
    check('Settings opens from the pause menu', s.stack.join() === 'pause,settings', s);
    const first = s.focus;
    await tap('ArrowUp'); s = await S();
    const bottom = s.focus;
    check('Settings: up on the top item is the bottom item (Done)', /Done/.test(bottom), { from: first, to: bottom });
    await tap('ArrowDown'); s = await S();
    check('Settings: down on the bottom item is the top of its column (a tab)', /^tab-/.test(s.focus), { to: s.focus, first });
    await tap('Escape'); s = await S();
    check('Esc in Settings backs out to the pause menu', s.stack.join() === 'pause' && s.paused, s);
    await tap('Escape'); s = await S();
    check('Esc on the pause menu resumes', !s.paused && !s.stack.length, s);

    // Settings every tab: the tab bar stays put; then the Debug tab
    await tap('Escape'); await tap('ArrowDown'); await tap('ArrowDown'); await tap('Enter');
    let c = await cycle(5, () => tap('KeyE'), '[data-tabbar]', null, settingsTab);
    check('Settings: E goes through every tab and round, the tab bar never moves', steady(c.boxes) && c.seen[5] === c.seen[0] && new Set(c.seen).size === 5, c);
    await ev(() => { const b = window.__game.ui.screen('settings').querySelector('[data-k=tab-debug]'); b.click(); });
    await frames(2);
    await shot('02-settings-debug-off');
    const dbg = await ev(() => { const el = window.__game.ui.screen('settings'); return { photo: !!el.querySelector('[data-k=photo]'), scenes: !!el.querySelector('[data-k=scenes]'), check: !!el.querySelector('.set-body input[type=checkbox]') }; });
    check('Settings → Debug has the debug switch and Photo mode (Scenes once debug is on)', dbg.photo && dbg.check && !dbg.scenes, dbg);
    // the switch, by the keyboard: focus it, Enter
    await ev(() => { const g = window.__game, i = g.ui.screen('settings').querySelector('.set-body input[type=checkbox]'); g.ui.setFocus(i); });
    await tap('Enter'); await frames(2);
    const scenes = await ev(() => !!window.__game.ui.screen('settings').querySelector('[data-k=scenes]'));
    check('turning debug on shows Debug: scenes in the Debug tab', scenes);
    await shot('03-settings-debug');
    await ev(() => { const g = window.__game; g.ui.setFocus(g.ui.screen('settings').querySelector('[data-k=scenes]')); });
    await tap('Enter'); s = await S();
    check('Debug: scenes opens the scenes menu', s.stack.at(-1) === 'debug', s);
    await shot('04-debug-scenes');
    await tap('Escape'); s = await S();
    check('Esc backs out of the scenes menu to Settings', s.stack.at(-1) === 'settings', s);
    await ev(() => { const g = window.__game; g.ui.setFocus(g.ui.screen('settings').querySelector('[data-k=photo]')); });
    await tap('Enter');
    await page.waitForFunction(() => window.__game.photo && document.getElementById('photo-mode'), null, { timeout: 20000 }).catch(() => {});
    const ph = await ev(() => ({ photo: !!window.__game.photo, overlay: !!document.getElementById('photo-mode'), stack: window.__game.ui.stack.map((x) => x.id) }));
    check('Photo mode opens from the Debug tab (over the menus)', ph.photo && ph.overlay, ph);
    await new Promise((r) => setTimeout(r, 1500));
    // (no screenshot here: the path tracer keeps the headless GPU too busy to take one)
    await tap('Escape'); s = await S();
    const ph2 = await ev(() => ({ photo: !!window.__game.photo, overlay: !!document.getElementById('photo-mode'), tab: window.__game.ui.screen('settings')?.querySelector('[data-tabbar] .on')?.dataset.k }));
    check('Esc closes Photo mode, back on Settings → Debug, still paused', !ph2.photo && !ph2.overlay && ph2.tab === 'tab-debug' && s.stack.join() === 'pause,settings' && s.paused, { ...ph2, ...s });
    await ev(() => { window.__game.settings.debug = false; });
    await tap('Escape'); await tap('Escape'); s = await S();
    check('back in play', !s.paused && !s.stack.length, s);

    // ---- 4. the player's own menu, alone: it pauses; E cycles; the tab bar stays put
    await tap('KeyI'); s = await S();
    check('I opens your own menu on the inventory, and alone it pauses', s.menus.length === 1 && s.menus[0].tab === 'inventory' && s.paused, s);
    await shot('06-solo-inventory');
    c = await cycle(4, () => tap('KeyE'), '.pmenu-tabs', 0, pmTab);
    check('E goes through Inventory, Skill tree, Map, Prophecy and round; the tab bar never moves', steady(c.boxes) && c.seen.join() === 'inventory,skills,map,prophecy,inventory', c);
    c = await cycle(1, () => tap('KeyQ'), '.pmenu-tabs', 0, pmTab);
    check('Q goes back (round to Prophecy)', c.seen.join() === 'inventory,prophecy', c.seen);
    await tap('KeyI'); s = await S();
    check('I jumps to the inventory tab', s.menus[0]?.tab === 'inventory', s);
    // the inventory's kinds (Z / C): its tab row stays put
    c = await cycle(5, () => tap('KeyC'), '.inv-filters', 0, filterTab);
    check('inventory: C goes through every kind and round; the kinds row never moves', steady(c.boxes) && c.seen[0] === c.seen[5] && new Set(c.seen).size === 5, c);
    // wraparound in the stash grid: its rows and columns from where the items are
    const grid = await ev(() => {
      const m = [...window.__game.playerMenus.menus.values()][0];
      const items = [...m.el.querySelectorAll('.inv-grid .item')];
      m.nav.setFocus(items[0]);
      const c = items.map((e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      const same = (a, b) => Math.abs(a - b) < 12;
      const row0 = items.filter((_, i) => same(c[i][1], c[0][1])), col0 = items.filter((_, i) => same(c[i][0], c[0][0]));
      return { n: items.length, rowEnd: row0.at(-1).dataset.k, colBottom: col0.at(-1).dataset.k, rows: col0.length, first: items[0].dataset.k };
    });
    const fk = async () => (await S()).menus[0].focus;
    await tap('ArrowLeft');
    check('inventory grid: left at the start of a row wraps to its end', (await fk()) === grid.rowEnd, { got: await fk(), ...grid });
    await tap('ArrowRight');
    check('inventory grid: right at the end of a row wraps to its start', (await fk()) === grid.first);
    for (let i = 0; i < grid.rows - 1; i++) await tap('ArrowDown');
    check('inventory grid: down the column reaches its bottom item', (await fk()) === grid.colBottom, { got: await fk(), want: grid.colBottom });
    await tap('ArrowDown');
    check('inventory grid: down on the bottom of the column wraps to its top', (await fk()) === grid.first, await fk());
    await tap('ArrowUp');
    check('inventory grid: up from the top row goes to the kinds row above it (in line), so the stash never traps the focus', /^tab-/.test(await fk()), await fk());
    await tap('ArrowDown');
    check('... and down from the kinds row is back in the stash', /^it-/.test(await fk()), await fk());
    await shot('07-solo-grid-wrap');
    await tap('Escape'); s = await S();
    check('Esc closes your menu and play goes on', !s.menus.length && !s.paused, s);
    // Esc in a menu is the menu's: it never also pauses
    check('the Esc that closed it did not pause', !s.stack.length, s);

    // ---- 5. two players on one screen: the keyboard (P1) and a controller (P2)
    await ev(() => { window.__pads[0] = { b: new Set(), axes: [0, 0, 0, 0] }; });
    await start([{ device: 'kbm', hero: 'percy' }, { device: 'pad0', hero: 'annabeth' }]);
    await ev(() => { const g = window.__game; window.__dodges = { 0: 0, 1: 0 }; g.players.forEach((p, i) => { const f = p.startDodge.bind(p); p.startDodge = (...a) => { window.__dodges[i]++; return f(...a); }; }); });
    const pos = () => ev(() => window.__game.players.map((p) => [Math.round(p.pos.x * 100) / 100, Math.round(p.pos.z * 100) / 100]));
    await press(0, BTN.UP); s = await S();
    check('P2 (controller): D-pad ↑ opens their own menu; the game is not paused', s.menus.length === 1 && s.menus[0].p === 1 && !s.paused, s);
    const p0 = await pos();
    await page.keyboard.down('KeyD'); await padDown(0, BTN.RIGHT);
    for (let i = 0; i < 12; i++) await frames(1);
    await page.keyboard.up('KeyD'); await padUp(0, BTN.RIGHT); await frames(2);
    const p1 = await pos();
    const moved = Math.hypot(p1[0][0] - p0[0][0], p1[0][1] - p0[0][1]), still = Math.hypot(p1[1][0] - p0[1][0], p1[1][1] - p0[1][1]);
    const prot = await ev(() => window.__game.players[1].iframes);
    check('P1 keeps moving while P2 is in their menu; P2\'s hero stands still and is protected', moved > 0.3 && still < 0.05 && prot > 0, { moved, still, iframes: prot });
    await shot('08-coop-p2-menu-p1-moves');
    c = await cycle(4, () => press(0, BTN.RB), '.pmenu-tabs', 1, pmTab);
    check('P2: RB goes through their tabs and round; their tab bar never moves', steady(c.boxes) && c.seen.join() === 'inventory,skills,map,prophecy,inventory', c);
    await press(0, BTN.LB); s = await S();
    check('P2: LB goes back (round to Prophecy)', s.menus[0].tab === 'prophecy', s);
    await press(0, BTN.RB);
    await tap('KeyI'); s = await S();
    check('P1 opens theirs too: both open at once, the game still runs', s.menus.length === 2 && !s.paused, s);
    const halves = await ev(() => [...window.__game.playerMenus.menus.values()].sort((a, b) => a.player.index - b.player.index).map((m) => { const r = m.el.querySelector('.pmenu-panel').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }));
    check('each menu in its own half (P1 left, P2 right), not overlapping', halves.length === 2 && halves[0][1] <= halves[1][0] && halves[0][0] < 640 && halves[1][1] > 640, halves);
    // each device drives only its own menu
    const before = await S();
    await tap('ArrowDown'); let after = await S();
    const p1f = after.menus.find((m) => m.p === 0).focus, p2f = after.menus.find((m) => m.p === 1).focus;
    check('the keyboard moves only P1\'s focus', p1f !== before.menus.find((m) => m.p === 0).focus && p2f === before.menus.find((m) => m.p === 1).focus, { before: before.menus, after: after.menus });
    await press(0, BTN.DOWN); const after2 = await S();
    check('P2\'s controller moves only P2\'s focus', after2.menus.find((m) => m.p === 1).focus !== p2f && after2.menus.find((m) => m.p === 0).focus === p1f, { after: after2.menus });
    await tap('KeyE'); s = await S();
    check('E changes only P1\'s tab', s.menus.find((m) => m.p === 0).tab === 'skills' && s.menus.find((m) => m.p === 1).tab === 'inventory', s.menus);

    await shot('09-coop-both-open');
    // P2's inventory kinds with LT / RT in a half-width menu
    c = await cycle(5, () => press(0, BTN.RT), '.inv-filters', 1, filterTab);
    check('P2: RT goes through the inventory\'s kinds; the kinds row never moves (half width)', steady(c.boxes) && c.seen[0] === c.seen[5], c);
    // Menu (P2) opens the shared pause menu over both; Menu again resumes, both menus still open
    await press(0, BTN.MENU); s = await S();
    const pausedOver = s.paused && s.stack.join() === 'pause' && s.menus.length === 2;
    await shot('10-coop-pause-over-menus');
    await press(0, BTN.MENU); s = await S();
    check('Menu pauses over the players\' menus, and resumes (still co-op: running)', pausedOver && !s.paused && !s.stack.length && s.menus.length === 2, s);
    // B closes P2's menu; the B does not make P2 dodge; P1's stays open
    const d0 = await ev(() => window.__dodges[1]);
    await padDown(0, BTN.B); for (let i = 0; i < 6; i++) await frames(1); await padUp(0, BTN.B); await frames(3);
    s = await S(); const d1 = await ev(() => window.__dodges[1]);
    check('P2: B closes their menu (P1\'s stays open), and that B never dodges', s.menus.length === 1 && s.menus[0].p === 0 && d1 === d0, { s, dodges: d1 - d0 });
    await tap('Escape'); s = await S();
    check('P1: Esc closes theirs; nothing paused', !s.menus.length && !s.paused && !s.stack.length, s);

    // ---- 6. other tabbed menus, and small screens
    // the forge (the inventory on its own): LB / RB or Q / E change the kinds; the row stays put
    await ev(async () => { const g = window.__game, S = await import(location.origin + '/percyjackson/game/js/ui/screens.js'); S.openForge(g, g.players[0]); });
    c = await cycle(5, () => tap('KeyE'), '.inv-filters', null, filterTab);
    check('the forge: E goes through the kinds; the kinds row never moves', steady(c.boxes) && c.seen[0] === c.seen[5], c);
    await tap('Escape');
    // the chapter map (books as tabs)
    await ev(async () => { const g = window.__game, S = await import(location.origin + '/percyjackson/game/js/ui/screens.js'); S.openChapterMap(g); });
    const books = await ev(() => window.__game.ui.top()?.el.querySelectorAll('.book-tabs .tab').length ?? 0);
    c = await cycle(books, () => tap('KeyE'), '.book-tabs', null, cmTab);
    check('the chapter map: E goes through every book and round; the tab bar never moves', books > 1 && steady(c.boxes) && new Set(c.seen).size === books && c.seen[0] === c.seen[books], c);
    await tap('Escape');

    // small sizes: settings and the player's menu
    for (const [w, h, name] of [[800, 500, 'small window'], [390, 844, 'phone'], [844, 390, 'phone, landscape']]) {
      await page.setViewportSize({ width: w, height: h }); await frames(3);
      await tap('Escape'); await tap('ArrowDown'); await tap('ArrowDown'); await tap('Enter');
      c = await cycle(5, () => tap('KeyE'), '[data-tabbar]', null, settingsTab);
      check(`Settings at ${w}×${h} (${name}): the tab bar never moves`, steady(c.boxes) && new Set(c.seen).size === 5, c);
      // the Gameplay tab scrolls: walk down it, each focused control inside the visible part of the scroll area
      await ev(() => { window.__game.ui.screen('settings').querySelector('[data-k=tab-game]').click(); });
      await frames(2);
      let inView = true, steps = 0;
      for (let i = 0; i < 12; i++) {
        await tap('ArrowDown'); steps++;
        const v = await ev(() => { const g = window.__game, f = g.ui.focusEl, body = g.ui.screen('settings').querySelector('.set-body'); if (!f || !body.contains(f)) return true; const a = f.getBoundingClientRect(), r = body.getBoundingClientRect(); return a.top >= r.top - 2 && a.bottom <= r.bottom + 2; });
        if (!v) inView = false;
      }
      check(`Settings at ${w}×${h}: the focus scrolls into view inside the tab`, inView, { steps });
      if (w === 390) await shot('11-phone-settings');
      await tap('Escape'); await tap('Escape');
      await tap('KeyI');
      c = await cycle(4, () => tap('KeyE'), '.pmenu-tabs', 0, pmTab);
      check(`your menu at ${w}×${h}: the tab bar never moves`, steady(c.boxes) && c.seen.join() === 'inventory,skills,map,prophecy,inventory', c);
      // (two players here: side by side, or on a portrait screen top and bottom) the menu and all its tabs inside the screen
      const fit = await ev(([w, h]) => {
        const m = [...window.__game.playerMenus.menus.values()][0], p = m.el.querySelector('.pmenu-panel').getBoundingClientRect();
        const tabs = [...m.el.querySelectorAll('.pmenu-tabs .tab')].map((t) => t.getBoundingClientRect()), bar = m.el.querySelector('.pmenu-tabs').getBoundingClientRect();
        return { panel: [Math.round(p.left), Math.round(p.top), Math.round(p.right), Math.round(p.bottom)], inside: p.left >= 0 && p.top >= 0 && p.right <= w + 1 && p.bottom <= h + 1, tabsShown: tabs.every((t) => t.left >= bar.left - 1 && t.right <= bar.right + 1) };
      }, [w, h]);
      check(`your menu at ${w}×${h}: inside the screen, every tab showing`, fit.inside && fit.tabsShown && (w > h || fit.panel[3] <= h / 2 + 1), fit);
      // the stash scrolls inside a small menu: walk down a column, the focus stays in view
      const okScroll = await ev(() => {
        const m = [...window.__game.playerMenus.menus.values()][0], items = [...m.el.querySelectorAll('.inv-grid .item')];
        m.nav.setFocus(items.at(-1));
        const a = items.at(-1).getBoundingClientRect(), body = m.el.querySelector('.pmenu-body').getBoundingClientRect();
        return a.top >= body.top - 2 && a.bottom <= body.bottom + 2;
      });
      check(`your menu at ${w}×${h}: a focused item low in the stash is scrolled into view`, okScroll);
      if (w === 390) await shot('12-phone-player-menu');
      await tap('Escape');
    }
    await page.setViewportSize({ width: 1280, height: 720 }); await frames(2);

    // ---- 7. camp's world map (Waystones, Quests): its tab bar stays put
    const hub = await ev(async () => {
      const g = window.__game, w = (ms) => new Promise((r) => setTimeout(r, ms));
      g.ui.closeAll(); g.playerMenus.closeAll(); g.paused = false;
      g.returnToHub();
      for (let i = 0; i < 160 && !(g.mode === 'hub' && g.state === 'playing' && g.ow); i++) { g.ui.closeAll?.(); await w(250); }
      await w(800); g.ui.closeAll?.(); g.paused = false;
      return { mode: g.mode, ow: !!g.ow };
    });
    if (hub.ow) {
      await ev(async () => { const g = window.__game, M = await import(location.origin + '/percyjackson/game/js/ui/worldMap.js'); M.openWorldMap(g); });
      c = await cycle(2, () => tap('KeyE'), '[data-tabbar]', null, wmTab);
      check('the world map: E goes through Waystones and Quests and round; the tab bar never moves', steady(c.boxes) && c.seen[0] !== c.seen[1] && c.seen[0] === c.seen[2], c);
      await tap('Escape');
      await tap('KeyM'); s = await S();
      check('in camp, M opens your menu on the map (the world)', s.menus[0]?.tab === 'map' && !!(await ev(() => document.querySelector('.pmenu .worldmap-canvas'))), s);
      await shot('13-camp-map-tab');
      await tap('KeyM'); s = await S();
      check('M again closes it', !s.menus.length, s);
    } else check('camp has its open world for the world map', false, hub);
    check('no page errors', !errors.length, errors.slice(0, 5));
  } catch (e) {
    check('the run finished', false, String(e.stack || e).slice(0, 600));
  } finally { await b.close(); }
  const failed = rows.filter((r) => !r.ok);
  if (errors.length) { lines.push('page errors:'); for (const e of errors.slice(0, 10)) lines.push(' - ' + e); }
  return { ok: !failed.length, lines, rows, summary: { checks: rows.length, failed: failed.length, pageErrors: errors.length }, text: `${rows.length} checks, ${failed.length} failed, ${errors.length} page errors` };
}

module.exports = { run };
if (require.main === module) {
  (async () => {
    const i = process.argv.indexOf('--shots'), shots = i > 0 ? process.argv[i + 1] : null;
    const srv = await ensureServer();
    let res; try { res = await run({ base: srv.base, shots }); } finally { await srv.close(); }
    for (const l of res.lines) console.log(l);
    console.log(res.text);
    process.exit(res.ok ? 0 : 1);
  })().catch((e) => { console.error(e); process.exit(1); });
}

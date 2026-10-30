// Each player's own menu: Inventory, Skill tree, Map and Prophecy, as tabs.
//
//   Opening  D-pad ↑ (I or Tab) on the inventory, View (M) on the map, K on
//            the skill tree; the 🎒 button on a touch screen.
//   Inside   LB / RB (Q / E, Tab / Shift+Tab) go to the next or previous tab,
//            round and round; B / Esc backs out one level (a dialog, the
//            skill picker) and from a tab closes the menu; View (or the key
//            that opened it) closes it too; I, M, K jump to their tab. Menu
//            opens the shared pause menu over it.
//   Input    each menu reads only its player's device (input.js menuFor), and
//            that player's hero gets nothing while it is open (input.js hold),
//            so two players can have their menus open at once, each with its
//            own focus and cursor (its own FocusNav, ui.js).
//   Layout   one human on this screen: the menu fills the middle of the
//            screen. Two: each has their half (P1 left, P2 right; on a
//            portrait screen top and bottom). Three or four: a quarter each. The panel keeps one height, so its tab bar
//            never moves as the tabs change (a long tab scrolls inside).
//   Pausing  only when its player is the only human playing (navmath.js
//            menuPauses). With other people playing, here or online, the game
//            goes on, as with an open inventory in Minecraft Dungeons' co-op:
//            the hero stands still, and for its first PROTECT seconds can't be
//            hurt (as online menus already did, net/online.js), so opening the
//            menu is safe but it can't be hidden in for good. Online the menu
//            is this browser's alone: it never pauses anyone.
//
// The shared pause menu (Menu / Esc) keeps what belongs to everyone: resume,
// instructions, settings, return to camp and quit.
import { FocusNav, h } from './ui.js';
import { cycleTab, menuPauses, regionFor } from './navmath.js';
import { openInventory } from './inventory.js';
import { openSkills } from './skills.js';
import { openProphecy } from './prophecy.js';
import { openWorldMap, worldMapCanvas } from './worldMap.js';
import { openChapterMap } from './chapterMap.js';
import { HEROES } from '../heroes/index.js';
import { t } from '../text_config.js';

export const PLAYER_TABS = ['inventory', 'skills', 'map', 'prophecy'];
export const PROTECT = 8;   // seconds a hero can't be hurt while its menu is open and the game goes on


const kindOf = (dev) => (dev.startsWith('pad') ? 'pad' : dev === 'touch' ? 'touch' : 'kbm');

// The Map tab: the level's map in a chapter, the world in camp and on the
// road (with the waystone map, which travels and so is shared, a press away).
function openMapTab(game, player, { ui, onExit }) {
  ui.open('map', (el) => {
    const ow = !!(game.ow && game.level?.ow);
    let cv = ow ? worldMapCanvas(game, 640) : null;   // (it redraws itself: cv.redraw)
    if (!cv && game.minimap?.level) {
      cv = h('canvas', { class: 'mapview', width: 640, height: 640, role: 'img', 'aria-label': t('playerMenu.map.title') });
      cv.redraw = () => game.minimap.draw(cv, { full: true });
      cv.redraw();
    }
    const table = game.mode === 'hub' && !ow && !game.online?.isGuest;
    el.appendChild(h('div', { class: 'panel pm-map' },
      h('h2', {}, t('playerMenu.map.title')),
      cv ? h('div', { class: 'pm-map-view' }, cv) : h('p', { class: 'hint' }, t('playerMenu.map.none')),
      cv ? h('div', { class: 'hint' }, ow ? t('ow.map.legend') : t('playerMenu.map.legendLevel')) : null,
      h('div', { class: 'row', style: 'justify-content:center' },
        ow ? h('button', { class: 'btn', 'data-autofocus': true, onclick: () => { onExit(); openWorldMap(game); } }, t('playerMenu.map.world')) : null,
        table ? h('button', { class: 'btn', 'data-autofocus': true, onclick: () => { onExit(); openChapterMap(game); } }, t('ow.map.chapters')) : null,
        h('button', { class: 'btn', onclick: onExit }, t('playerMenu.close'))),
      ow ? h('div', { class: 'hint' }, t('playerMenu.map.worldHint')) : null));
  }, { onBack: onExit });
}

class PlayerMenu {
  constructor(mgr, player, slot) {
    this.mgr = mgr; this.game = mgr.game; this.player = player; this.slot = slot;
    this.tab = null; this.t = 0; this.mapT = 0;
    this.device = String(player.device ?? 'kbm');
    const n = (player.index ?? 0) + 1, hero = HEROES[player.hero]?.name ?? player.hero;
    const k = kindOf(this.device);
    this.tabsEl = h('div', { class: 'tabs pmenu-tabs', role: 'tablist' });
    this.status = h('div', { class: 'pmenu-status' });
    this.body = h('div', { class: 'pmenu-body' });
    this.el = h('section', { class: 'pmenu', role: 'dialog', 'aria-label': t('playerMenu.aria', { n }), 'data-player': String(n), style: `--pc:${HEROES[player.hero]?.color ?? '#c9963a'}` },
      h('div', { class: 'pmenu-panel' },
        h('div', { class: 'pmenu-head', 'data-nonav': '' },
          h('div', { class: 'pmenu-who' }, t('playerMenu.title', { n, hero })),
          k !== 'touch' ? h('span', { class: 'pmenu-key' }, t(`playerMenu.tabL.${k}`)) : null,
          this.tabsEl,
          k !== 'touch' ? h('span', { class: 'pmenu-key' }, t(`playerMenu.tabR.${k}`)) : null,
          h('button', { class: 'pmenu-x', 'aria-label': t('playerMenu.close'), title: t('playerMenu.close'), onclick: () => mgr.close(player) }, '✕')),
        this.body,
        h('div', { class: 'pmenu-foot' }, h('span', { class: 'hint' }, t(`playerMenu.hint.${k}`)), this.status)));
    mgr.layer.append(this.el);
    this.nav = new FocusNav(this.game, this.body, { idPrefix: `p${slot}-scr-` });
  }
  renderTabs() {
    this.tabsEl.replaceChildren(...PLAYER_TABS.map((id) => h('button', { class: 'tab' + (id === this.tab ? ' on' : ''), role: 'tab', 'aria-selected': String(id === this.tab), 'data-k': 'ptab-' + id, onclick: () => this.show(id) }, t(`playerMenu.tabs.${id}`))));
  }
  setStatus(pausing) { if (this.pausingShown === pausing) return; this.pausingShown = pausing; this.status.textContent = pausing ? t('playerMenu.paused') : t('playerMenu.running'); }
  show(tab) {
    if (tab === this.tab) return;
    const g = this.game, p = this.player;
    this.tab = tab;
    this.nav.closeAll();
    this.renderTabs();
    const o = { ui: this.nav, embedded: true, onExit: () => this.mgr.close(p) };
    if (tab === 'inventory') openInventory(g, p, { ...o, previewSlot: this.slot + 1 });
    else if (tab === 'skills') openSkills(g, p, o);
    else if (tab === 'map') openMapTab(g, p, o);
    else openProphecy(g, g.chapter?.book ?? g.mission?.chapter?.book ?? 'book1', o.onExit, o);
  }
  // One frame: this player's presses only.
  update(dt) {
    const g = this.game, input = g.input;
    const m = { ...input.menuFor(this.device) };
    const held = input.heldDirs((d) => d === this.device);
    if (m.start) { g.pause(this.player); return; }   // Menu: the shared pause menu, over this one
    const jump = m.inv ? 'inventory' : m.map ? 'map' : m.skills ? 'skills' : null;
    if (jump) { if (jump === this.tab) this.mgr.close(this.player); else { g.audio?.ui('move'); this.show(jump); } return; }
    if (m.view) { this.mgr.close(this.player); return; }
    if (m.tabL || m.tabR) { g.audio?.ui('move'); this.show(cycleTab(PLAYER_TABS, this.tab, m.tabR ? 1 : -1)); return; }
    // the map keeps up with the heroes
    if (this.tab === 'map' && (this.mapT -= dt) <= 0) { this.mapT = 0.5; this.nav.screen('map')?.querySelector('canvas')?.redraw?.(); }
    this.nav.step(m, held);
  }
  destroy() { this.nav.closeAll(); this.el.remove(); }
}

// Every player's menu on this screen (game.playerMenus).
export class PlayerMenus {
  constructor(game) {
    this.game = game;
    this.menus = new Map();    // player -> PlayerMenu
    this.pausing = false;      // this screen's only human has one open: the game waits
    this.layer = document.getElementById('player-menus');
    if (!this.layer) { this.layer = h('div', { id: 'player-menus' }); document.body.appendChild(this.layer); }
    window.addEventListener('resize', () => this.layout());
  }
  get open() { return this.menus.size > 0; }
  isOpen(p) { return this.menus.has(p); }
  menuOf(p) { return this.menus.get(p) ?? null; }
  // Open player p's menu on `tab` (or go to that tab, if it is open).
  openFor(p, tab = 'inventory') {
    if (!p || p.ai || p.remote) return null;
    let m = this.menus.get(p);
    if (!m) {
      const used = new Set([...this.menus.values()].map((x) => x.slot));
      let slot = 0; while (used.has(slot)) slot++;
      m = new PlayerMenu(this, p, slot);
      this.menus.set(p, m);
      this.game.input.hold(m.device, true);
      this.game.audio?.ui?.('open');
    }
    this.game.input.swallowMenu(m.device);   // (the press that opened it doesn't act in it)
    this.layout(); this.applyPause();
    m.show(tab);
    return m;
  }
  close(p) {
    const m = this.menus.get(p); if (!m) return;
    this.menus.delete(p);
    m.destroy();
    this.game.input.hold(m.device, false);   // (its hero waits until every button is let go)
    this.game.audio?.ui?.('back');
    this.layout(); this.applyPause();
  }
  closeAll() { for (const p of [...this.menus.keys()]) this.close(p); }
  // Pause the game while this screen's only human has their menu open (navmath.js menuPauses).
  applyPause() {
    const g = this.game;
    const want = this.menus.size > 0 && menuPauses({ humans: g.players.filter((q) => !q.ai).length, online: !!g.online?.live });
    if (want && !this.pausing) { this.pausing = true; g.paused = true; }
    else if (!want && this.pausing) { this.pausing = false; if (!g.ui.isOpen('pause')) { g.paused = false; g.last = performance.now(); } }
    this.layer.classList.toggle('dim', this.pausing);
    for (const m of this.menus.values()) m.setStatus(this.pausing);
  }
  // Every frame (main.js), after input.poll.
  update(dt) {
    const g = this.game;
    for (const [p, m] of [...this.menus]) {
      // its player left, the device moved to another hero, or the game is no longer on
      if (!g.players.includes(p) || String(p.device) !== m.device || g.state !== 'playing') { this.close(p); continue; }
      m.t += dt;
      if (!this.pausing && m.t < PROTECT) p.iframes = Math.max(p.iframes ?? 0, 0.15);
      // a shared screen (the pause menu, a camp station) has every device while it is up
      if (!g.ui.active) m.update(dt);
    }
    if (this.menus.size) this.applyPause();   // (a player joined or left: the rule may change)
  }
  // Each menu in its player's region of the screen.
  layout() {
    const locals = this.game.players.filter((q) => !q.ai && !q.remote).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const n = Math.max(1, locals.length), portrait = window.innerHeight > window.innerWidth;
    for (const m of this.menus.values()) {
      const i = Math.max(0, locals.indexOf(m.player)), r = regionFor(i, n, { portrait });
      m.el.classList.toggle('solo', n === 1);
      m.el.classList.toggle('quarter', n > 2);
      Object.assign(m.el.style, { left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
    }
  }
}

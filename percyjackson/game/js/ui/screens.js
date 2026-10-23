// Menu screens: re-exports of the title, hero select, chapter map, prophecy,
// story cards, instructions, settings, inventory and skill tree, plus the camp
// store and the pause menu.
import { h, toast, confirmDialog } from './ui.js';
import { openSettings } from './settingsScreen.js';
import { openDebugMenu } from './debugMenu.js';
import { settings } from '../settings.js';
import { openInstructions } from './instructions.js';
import { openChapterMap } from './chapterMap.js';
import { openProphecy } from './prophecy.js';
import { openStoryCards } from './storyCards.js';
import { openTitle } from './title.js';
import { openSelect } from './partySelect.js';
import { t as tx } from '../text_config.js';
import { ENCHANTS, itemInfo, itemRarity, itemTier, itemPrice, rollItem, powerFor, KIND_LABEL } from '../loot.js';
import { iconNode } from './icons.js';
import { expectedArea } from '../progression.js';

export { openTitle, openSelect, openChapterMap, openProphecy, openStoryCards, openInstructions, openSettings };

// ------------------------------------------------------------------ inventory
// The inventory and the forge live in inventory.js.
// (imported too: the pause menu opens the inventory)
import { openInventory, openForge } from './inventory.js';
export { openInventory, openForge };

// ------------------------------------------------------------------ skill tree
// The skill tree (equip, spend, reset) lives in skills.js.
import { openSkills } from './skills.js';
export { openSkills };

// ------------------------------------------------------------------ shop
export function openShop(game, player) {
  const ui = game.ui, save = game.saveFor?.(player) ?? game.save, d = save.data;   // net: this player's profile
  if (d.shop?.items?.some((it) => itemTier(it) === 'unique')) d.shop = null;   // (stock from before the loot rework: the shop never sells Legendaries now)
  if (!d.shop || !d.shop.items?.length) d.shop = { items: [0, 1, 2, 3, 4, 5].map((i) => rollItem(powerFor(expectedArea(d.level), d.level, Math.random, 'shop'), { kind: ['weapon', 'armor', 'artifact', 'artifact', 'weapon', null][i], hero: player.hero, source: 'shop', level: d.level })) };   // (the shop table: never a Legendary)
  game.paused = true;
  const close = () => { ui.close('shop'); game.paused = false; };
  ui.open('shop', (el) => {
    const rows = d.shop.items.map((it, i) => {
      const b = itemInfo(it), R = itemRarity(it), price = itemPrice(it);
      return h('button', { class: 'mission', style: 'width:100%;text-align:left;color:inherit', onclick: () => {
        if (d.coins < price) { toast(tx('screens.shop.notEnough')); game.audio?.ui('back'); return; }
        d.coins -= price; it.isNew = true; it.got = Date.now(); d.inventory.push(it); d.shop.items.splice(i, 1); save.write(); game.audio?.ui('buy'); toast(tx('screens.shop.bought', { name: b.name })); ui.refresh('shop');
      } }, h('div', { class: `mi item ${itemTier(it)}`, style: `--rc:${R.color}` }, iconNode(b)), h('div', {}, h('div', { class: 'mt', style: `color:${R.color}` }, b.name), h('div', { class: 'md' }, tx('screens.shop.itemLine', { rarity: R.label, kind: KIND_LABEL[b.kind], power: it.power, desc: b.desc, enchants: it.ench.map((e) => e.options.map((o) => ENCHANTS[o].name).join(' / ')).join('; ') }))), h('div', { class: 'diff' }, tx('screens.shop.price', { n: price })));
    });
    el.appendChild(h('div', { class: 'panel', style: 'width:min(620px,96vw)' }, h('h2', {}, tx('screens.shop.title')),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, tx('screens.shop.yourDrachmas', { n: d.coins })), ...rows,
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' },
        h('button', { class: 'btn small', onclick: () => { if (d.coins < 25) { toast(tx('screens.shop.needRestock')); return; } d.coins -= 25; d.shop = null; save.write(); close(); openShop(game, player); } }, tx('screens.shop.restock')),
        h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, tx('common.close')))));
  }, { dim: true, onBack: close });
}

// ------------------------------------------------------------------ chapter map
// The old mission map table is now the chapter map.
export function openMapTable(game) { return openChapterMap(game); }

// ------------------------------------------------------------------ pause menu
// Opens the pause menu; the caller has already set game.paused = true.
export function openPauseMenu(game, player = game.players?.[0]) {
  const ui = game.ui;
  // (chapters 1 and 2 in the opening have no camp to go back to yet)
  const inChapter = (game.mode === 'mission' || game.mode === 'chapter' || !!game.chapter) && !game.openingChapter;
  const resume = () => game.unpause();
  const bookId = game.chapter?.book ?? game.mission?.chapter?.book ?? 'book1';
  ui.open('pause', (el) => {
    el.appendChild(h('div', { class: 'panel menu-col pause-menu', role: 'dialog', 'aria-label': tx('screens.pause.title'), style: 'min-width:min(320px,92vw);text-align:center' },
      h('h2', {}, tx('screens.pause.title')),
      h('button', { class: 'btn primary', 'data-autofocus': true, onclick: resume }, tx('screens.pause.resume')),
      h('button', { class: 'btn', onclick: () => openInstructions(game) }, tx('screens.pause.instructions')),
      h('button', { class: 'btn', onclick: () => openSettings(game) }, tx('screens.pause.settings')),
      settings.debug ? h('button', { class: 'btn', onclick: () => openDebugMenu(game) }, tx('screens.pause.debug')) : null,
      h('button', { class: 'btn', onclick: () => openProphecy(game, bookId) }, tx('screens.pause.prophecy')),
      h('button', { class: 'btn', onclick: () => { ui.close('pause'); openInventory(game, player); } }, tx('screens.pause.inventory')),
      game.minimap?.level ? h('button', { class: 'btn', onclick: () => { ui.close('pause'); game.paused = false; game.openMap(); } }, tx('screens.pause.map')) : null,
      h('button', { class: 'btn', onclick: () => { ui.close('pause'); openSkills(game, player); } }, tx('screens.pause.skillTree')),
      game.openPhotoMode ? h('button', { class: 'btn', onclick: () => { ui.close('pause'); game.openPhotoMode(); } }, tx('screens.pause.photoMode')) : null,
      inChapter ? h('button', { class: 'btn danger', onclick: () => confirmDialog(game, {
        title: tx('screens.pause.returnTitle'), text: tx('screens.pause.returnText'), yes: tx('screens.pause.returnYes'), no: tx('screens.pause.keepPlaying'), danger: true,
        onYes: () => { ui.closeAll(); game.paused = false; game.last = performance.now(); game.returnToHub(); },
      }) }, tx('screens.pause.returnButton')) : null,
      h('button', { class: 'btn danger', onclick: () => confirmDialog(game, {
        title: tx('screens.pause.quitTitle'), text: tx('screens.pause.quitText'), yes: tx('screens.pause.quitYes'), no: tx('screens.pause.keepPlaying'), danger: true,
        onYes: () => { ui.closeAll(); game.paused = false; game.save.write(); game.toTitle(); },
      }) }, tx('screens.pause.quitButton'))));
  }, { dim: true, onBack: resume });
}

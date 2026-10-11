// Menu screens: re-exports of the title, hero select, chapter map, prophecy,
// story cards, instructions and settings, plus inventory with enchanting, skill
// tree, camp store and the pause menu.
import { h, toast, confirmDialog } from './ui.js';
import { openSettings } from './settingsScreen.js';
import { openInstructions } from './instructions.js';
import { openChapterMap } from './chapterMap.js';
import { openProphecy } from './prophecy.js';
import { openStoryCards } from './storyCards.js';
import { openTitle } from './title.js';
import { openSelect } from './partySelect.js';
import { HEROES, SKILL_TREES } from '../heroes/index.js';
import { ENCHANTS, itemInfo, itemRarity, itemPrice, rollItem, powerFor, KIND_LABEL } from '../loot.js';

export { openTitle, openSelect, openChapterMap, openProphecy, openStoryCards, openInstructions, openSettings };

// ------------------------------------------------------------------ inventory
// The inventory and the forge live in inventory.js.
export { openInventory, openForge } from './inventory.js';

// ------------------------------------------------------------------ skill tree
export function openSkills(game, player) {
  const ui = game.ui, save = game.save;
  const sid = player.hero, tree = SKILL_TREES[sid] ?? [];
  game.paused = true;
  const close = () => { ui.close('skills'); game.paused = false; };
  ui.open('skills', (el) => {
    const S = save.hero(sid);
    const cards = tree.map((sk) => {
      const r = S.skills[sk.id] ?? 0;
      const locked = sk.req && !(S.skills[sk.req] > 0);
      return h('button', { class: 'skill' + (locked ? ' locked' : ''), style: 'text-align:left', onclick: () => {
        if (locked || r >= sk.max || S.skillPoints <= 0) { game.audio?.ui('back'); return; }
        S.skills[sk.id] = r + 1; S.skillPoints--; save.write(); player.refreshLoadout(); game.audio?.levelUp(); ui.refresh('skills');
      } }, h('div', { class: 'sn' }, sk.name), h('div', { class: 'sd' }, sk.desc + (locked ? ` (requires ${tree.find((t) => t.id === sk.req)?.name})` : '')), h('div', { class: 'pips' }, '◆'.repeat(r) + '◇'.repeat(sk.max - r)));
    });
    el.appendChild(h('div', { class: 'panel', style: 'width:min(820px,97vw)' },
      h('h2', {}, `Skill Tree · ${HEROES[sid].name}`),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, `Skill points: ${S.skillPoints} · earn one per level (all heroes)`),
      h('div', { class: 'tree' }, ...cards),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' }, h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
}

// ------------------------------------------------------------------ shop
export function openShop(game, player) {
  const ui = game.ui, save = game.save, d = save.data;
  if (!d.shop || !d.shop.items?.length) d.shop = { items: [0, 1, 2, 3, 4, 5].map((i) => rollItem(powerFor(1 + Math.min(2, Math.floor(d.level / 6)), d.level), { kind: ['weapon', 'armor', 'artifact', 'artifact', 'weapon', null][i], hero: player.hero })) };
  game.paused = true;
  const close = () => { ui.close('shop'); game.paused = false; };
  ui.open('shop', (el) => {
    const rows = d.shop.items.map((it, i) => {
      const b = itemInfo(it), R = itemRarity(it), price = itemPrice(it);
      return h('button', { class: 'mission', style: 'width:100%;text-align:left;color:inherit', onclick: () => {
        if (d.coins < price) { toast('Not enough drachmas'); game.audio?.ui('back'); return; }
        d.coins -= price; d.inventory.push(it); d.shop.items.splice(i, 1); save.write(); game.audio?.ui('buy'); toast(`Bought ${b.name}`); ui.refresh('shop');
      } }, h('div', { class: `mi item ${b.rarity}` }, b.icon), h('div', {}, h('div', { class: 'mt', style: `color:${R.color}` }, b.name), h('div', { class: 'md' }, `${R.label} ${KIND_LABEL[b.kind]} · Power ${it.power} · ${b.desc} Enchantments: ${it.ench.map((e) => e.options.map((o) => ENCHANTS[o].name).join(' / ')).join('; ')}`)), h('div', { class: 'diff' }, `◆ ${price}`));
    });
    el.appendChild(h('div', { class: 'panel', style: 'width:min(620px,96vw)' }, h('h2', {}, 'Camp Store'),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, `Your drachmas: ◆ ${d.coins}`), ...rows,
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' },
        h('button', { class: 'btn small', onclick: () => { if (d.coins < 25) { toast('Need ◆25'); return; } d.coins -= 25; d.shop = null; save.write(); close(); openShop(game, player); } }, 'Restock (◆25)'),
        h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
}

// ------------------------------------------------------------------ chapter map
// The old mission map table is now the chapter map.
export function openMapTable(game) { return openChapterMap(game); }

// ------------------------------------------------------------------ pause menu
// Opens the pause menu; the caller has already set game.paused = true.
export function openPauseMenu(game, player = game.players?.[0]) {
  const ui = game.ui;
  const inChapter = game.mode === 'mission' || game.mode === 'chapter' || !!game.chapter;
  const resume = () => game.resume();
  const bookId = game.chapter?.book ?? game.mission?.chapter?.book ?? 'book1';
  ui.open('pause', (el) => {
    el.appendChild(h('div', { class: 'panel menu-col pause-menu', role: 'dialog', 'aria-label': 'Paused', style: 'min-width:min(320px,92vw);text-align:center' },
      h('h2', {}, 'Paused'),
      h('button', { class: 'btn primary', 'data-autofocus': true, onclick: resume }, 'Resume'),
      h('button', { class: 'btn', onclick: () => openInstructions(game) }, 'Instructions'),
      h('button', { class: 'btn', onclick: () => openSettings(game) }, 'Settings'),
      h('button', { class: 'btn', onclick: () => openProphecy(game, bookId) }, 'Prophecy'),
      h('button', { class: 'btn', onclick: () => { ui.close('pause'); openInventory(game, player); } }, 'Inventory'),
      game.minimap?.level ? h('button', { class: 'btn', onclick: () => { ui.close('pause'); game.paused = false; game.openMap(); } }, 'Map') : null,
      h('button', { class: 'btn', onclick: () => { ui.close('pause'); openSkills(game, player); } }, 'Skill tree'),
      game.openPhotoMode ? h('button', { class: 'btn', onclick: () => { ui.close('pause'); game.openPhotoMode(); } }, 'Photo mode') : null,
      inChapter ? h('button', { class: 'btn danger', onclick: () => confirmDialog(game, {
        title: 'Return to camp?', text: 'You will leave this chapter and lose its progress.', yes: 'Return to camp', no: 'Keep playing', danger: true,
        onYes: () => { ui.closeAll(); game.paused = false; game.last = performance.now(); game.returnToHub(); },
      }) }, 'Return to camp') : null,
      h('button', { class: 'btn danger', onclick: () => confirmDialog(game, {
        title: 'Quit to title?', text: 'Your progress is saved, but the current chapter will be lost.', yes: 'Quit to title', no: 'Keep playing', danger: true,
        onYes: () => { ui.closeAll(); game.paused = false; game.save.write(); game.toTitle(); },
      }) }, 'Quit to title')));
  }, { dim: true, onBack: resume });
}

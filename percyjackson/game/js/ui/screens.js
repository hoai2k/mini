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
import { RARITY, ENCHANTS, itemInfo, salvageValue, itemPrice, rollItem } from '../loot.js';

export { openTitle, openSelect, openChapterMap, openProphecy, openStoryCards, openInstructions, openSettings };

// ------------------------------------------------------------------ inventory
const SLOT_NAMES = ['Weapon', 'Armour', 'Magic item 1', 'Magic item 2'];
const SLOT_KIND = ['weapon', 'armor', 'artifact', 'artifact'];
export function openInventory(game, player) {
  const ui = game.ui, save = game.save;
  const sid = player.hero;
  let sel = null;
  game.paused = true;
  const close = () => { ui.close('inventory'); game.paused = false; };
  ui.open('inventory', (el) => {
    const d = save.data, S = save.hero(sid);
    const gear = S.gear;
    const itemEl = (it, extra = '') => {
      const b = itemInfo(it);
      const eq = gear.includes(it.uid);
      const el2 = h('button', { class: `item ${b.rarity}${eq ? ' equipped' : ''} ${extra}`, onclick: () => { sel = it.uid; ui.refresh('inventory'); } }, b.icon, h('span', { class: 'pw' }, String(it.power)));
      el2.addEventListener('navfocus', () => { if (sel !== it.uid) { sel = it.uid; renderDetail(); } });
      return el2;
    };
    const eqRow = h('div', { class: 'slots-eq' }, ...gear.map((uid, i) => {
      const it = uid ? save.item(uid) : null;
      return it ? itemEl(it) : h('div', { class: 'item', title: SLOT_NAMES[i], style: 'opacity:.45;font-size:12px' }, SLOT_NAMES[i]);
    }));
    const grid = h('div', { class: 'inv-grid' }, ...d.inventory.map((it) => itemEl(it)));
    const detail = h('div', { class: 'detail' });
    const renderDetail = () => {
      detail.innerHTML = '';
      const it = sel ? save.item(sel) : null;
      if (!it) { detail.append(h('div', { class: 'hint' }, 'Select an item. Enchantment points: ' + d.enchantPoints)); return; }
      const b = itemInfo(it), R = RARITY[b.rarity];
      const eqIdx = gear.indexOf(it.uid);
      detail.append(
        h('div', { class: 'iname', style: `color:${R.color}` }, `${b.icon} ${b.name}`),
        h('div', { class: 'rar', style: `color:${R.color}` }, `${R.label} ${b.kind} · Power ${it.power}`),
        h('div', { class: 'desc' }, b.desc + (b.cd ? ` (cooldown ${b.cd}s)` : '')),
        ...it.ench.map((e) => {
          const E = ENCHANTS[e.id];
          const cost = e.level + 1;
          return h('div', { class: 'ench' }, h('span', {}, `${E.name} `, h('span', { class: 'lv' }, '★'.repeat(e.level) + '☆'.repeat(3 - e.level))),
            h('span', { style: 'font-size:12px;color:#aaa;flex:1;padding:0 6px' }, E.desc(Math.max(1, e.level))),
            e.level < 3 ? h('button', { class: 'btn small', disabled: d.enchantPoints < cost, onclick: () => { d.enchantPoints -= cost; e.level++; save.write(); player.refreshLoadout(); game.audio?.ui('buy'); ui.refresh('inventory'); } }, `+${cost}pt`) : null);
        }),
        h('div', { class: 'row', style: 'margin-top:10px' },
          eqIdx >= 0 ? h('button', { class: 'btn small', onclick: () => { gear[eqIdx] = null; save.write(); player.refreshLoadout(); ui.refresh('inventory'); } }, 'Unequip')
            : h('button', { class: 'btn small primary', onclick: () => {
              let slot = SLOT_KIND.indexOf(b.kind);
              if (b.kind === 'artifact' && gear[2] && !gear[3]) slot = 3;
              gear[slot] = it.uid; save.write(); player.refreshLoadout(); game.audio?.ui('buy'); ui.refresh('inventory');
            } }, 'Equip'),
          eqIdx < 0 ? h('button', { class: 'btn small danger', onclick: () => {
            const refund = it.ench.reduce((a, e) => a + (e.level * (e.level + 1)) / 2, 0);
            d.coins += salvageValue(it); d.enchantPoints += refund; d.inventory = d.inventory.filter((x) => x !== it); sel = null; save.write(); game.audio?.coin(); ui.refresh('inventory');
          } }, `Salvage (+◆${salvageValue(it)})`) : null));
    };
    renderDetail();
    const st = player.stats;
    const stats = h('div', { style: 'margin-top:8px' },
      h('div', { class: 'stat-line' }, 'Health', h('b', {}, String(Math.round(player.maxHp)))),
      h('div', { class: 'stat-line' }, 'Melee damage', h('b', {}, `×${st.meleeMult.toFixed(2)}`)),
      h('div', { class: 'stat-line' }, 'Ability damage', h('b', {}, `×${st.techMult.toFixed(2)}`)),
      h('div', { class: 'stat-line' }, 'Damage reduction', h('b', {}, `${Math.round(st.armor * 100)}%`)),
      h('div', { class: 'stat-line' }, 'Crit / Cooldown', h('b', {}, `${Math.round(st.crit * 100)}% / -${Math.round(st.cdr * 100)}%`)));
    el.appendChild(h('div', { class: 'panel', style: 'width:min(940px,97vw)' },
      h('h2', {}, `Inventory · ${HEROES[sid].name}`),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, `Level ${d.level} · ◆ ${d.coins} drachmas · Enchantment points: ${d.enchantPoints}`),
      h('div', { class: 'inv' }, h('div', {}, h('h3', {}, 'Equipped'), eqRow, h('h3', {}, 'Stash'), grid, stats), detail),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' }, h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Close'))));
  }, { dim: true, onBack: close });
}

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
  if (!d.shop || !d.shop.items?.length) d.shop = { items: [0, 1, 2, 3, 4].map((i) => rollItem(Math.max(1, d.level / 2), { kind: ['weapon', 'armor', 'artifact', 'artifact', null][i] })) };
  game.paused = true;
  const close = () => { ui.close('shop'); game.paused = false; };
  ui.open('shop', (el) => {
    const rows = d.shop.items.map((it, i) => {
      const b = itemInfo(it), R = RARITY[b.rarity], price = itemPrice(it);
      return h('button', { class: 'mission', style: 'width:100%;text-align:left;color:inherit', onclick: () => {
        if (d.coins < price) { toast('Not enough drachmas'); game.audio?.ui('back'); return; }
        d.coins -= price; d.inventory.push(it); d.shop.items.splice(i, 1); save.write(); game.audio?.ui('buy'); toast(`Bought ${b.name}`); ui.refresh('shop');
      } }, h('div', { class: `mi item ${b.rarity}` }, b.icon), h('div', {}, h('div', { class: 'mt', style: `color:${R.color}` }, b.name), h('div', { class: 'md' }, `${R.label} ${b.kind} · Power ${it.power} · ${it.ench.map((e) => ENCHANTS[e.id].name).join(', ')}`)), h('div', { class: 'diff' }, `◆ ${price}`));
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

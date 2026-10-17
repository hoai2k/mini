// Inventory and the forge, Minecraft Dungeons style.
//   • Choose whose gear to edit: your hero, or (playing alone) a companion.
//   • Four slots: weapon, armour, two magic items. Filter the stash by kind;
//     new items carry a badge, a hero's favourites a star.
//   • The detail panel compares the item with what is equipped (▲ / ▼).
//   • Enchantment rows: pick ONE choice per row with enchantment points, then
//     raise it to II and III. Powerful choices cost one more point per level.
//   • Salvage refunds every point spent and pays drachmas.
//   • At the forge (camp) you can also temper an item (+1 power) and re-roll
//     the choices of a row you haven't invested in, for drachmas.
// Everything is a button, so the D-pad / stick moves focus and A chooses.
import { h, toast, confirmDialog } from './ui.js';
import { HEROES } from '../heroes/index.js';
import { RARITY, BLESSED, ENCHANTS, KIND_LABEL, itemInfo, itemRarity, salvageValue, enchCost, spentPoints, gearStats, temperCost, rerollCost, rerollRow, powerFor } from '../loot.js';
import { flaskCooldown, quiverMax } from '../resources.js';
import { t as tx, tn } from '../text_config.js';

const SLOT_NAMES = [tx('inventory.slots.weapon'), tx('inventory.slots.armor'), tx('inventory.slots.artifact1'), tx('inventory.slots.artifact2')];
const SLOT_ICON = ['🗡️', '🛡️', '✨', '✨'];
const SLOT_KIND = ['weapon', 'armor', 'artifact', 'artifact'];
const FILTERS = [['all', tx('inventory.filters.all')], ['weapon', tx('inventory.filters.weapon')], ['armor', tx('inventory.filters.armor')], ['artifact', tx('inventory.filters.artifact')]];
const roman = ['', 'I', 'II', 'III'];

// Heroes this player may outfit: their own, plus AI companions when alone.
function editable(game, player) {
  const own = [player];
  if (game.party && !player.ai) for (const q of game.party) if (q !== player && q.ai) own.push(q);
  return own;
}

export function openInventory(game, player, { forge = false } = {}) {
  const ui = game.ui, save = game.saveFor?.(player) ?? game.save;   // net: this player's profile
  let who = player, sel = null, filter = 'all';
  game.paused = true;
  const close = () => {
    for (const it of save.data.inventory) delete it.isNew;
    save.write();
    ui.close('inventory'); game.paused = false; game.last = performance.now();
  };
  const refresh = () => ui.refresh('inventory');
  const apply = () => { for (const q of game.players) if (q.hero === who.hero) q.refreshLoadout(); };

  ui.open('inventory', (el) => {
    const d = save.data, S = save.hero(who.hero), gear = S.gear;
    const items = d.inventory.filter((it) => filter === 'all' || itemInfo(it).kind === filter)
      .sort((a, b) => (gear.includes(b.uid) - gear.includes(a.uid)) || b.power - a.power);
    const tile = (it, opts = {}) => {
      const b = itemInfo(it), eq = gear.includes(it.uid);
      const t = h('button', { class: `item ${b.rarity}${it.blessed ? ' blessed' : ''}${eq ? ' equipped' : ''}${sel === it.uid ? ' selected' : ''}`, 'aria-label': tx(eq ? 'inventory.itemLabelEquipped' : 'inventory.itemLabel', { name: b.name, power: it.power }), onclick: () => { sel = it.uid; refresh(); } },
        b.icon, h('span', { class: 'pw' }, String(it.power)),
        it.isNew ? h('span', { class: 'badge-new' }, tx('inventory.new')) : null,
        b.hero === who.hero ? h('span', { class: 'badge-fav', title: tx('inventory.favouriteTitle', { hero: HEROES[who.hero].name }) }, '★') : null);
      t.addEventListener('focus', () => { if (sel !== it.uid && !opts.noFocusSelect) { sel = it.uid; renderDetail(); } });
      return t;
    };
    // whose gear
    const heroes = editable(game, player);
    const heroRow = heroes.length > 1 ? h('div', { class: 'row inv-heroes' }, ...heroes.map((q) => h('button', { class: 'btn small' + (q === who ? ' primary' : ''), onclick: () => { who = q; sel = null; refresh(); } }, q.ai ? tx('inventory.companion', { hero: HEROES[q.hero].name }) : HEROES[q.hero].name))) : null;
    const eqRow = h('div', { class: 'slots-eq' }, ...gear.map((uid, i) => {
      const it = uid ? save.item(uid) : null;
      return it ? tile(it) : h('div', { class: 'item empty', title: SLOT_NAMES[i] }, h('span', { class: 'slot-ico' }, SLOT_ICON[i]), h('span', { class: 'slot-name' }, SLOT_NAMES[i]));
    }));
    const filters = h('div', { class: 'row inv-filters' }, ...FILTERS.map(([k, label]) => h('button', { class: 'btn small' + (filter === k ? ' primary' : ''), onclick: () => { filter = k; refresh(); } }, label)));
    const grid = h('div', { class: 'inv-grid' }, ...(items.length ? items.map((it) => tile(it)) : [h('div', { class: 'hint' }, tx('inventory.empty'))]));
    const detail = h('div', { class: 'detail' });

    const statLines = (s) => [
      [tx('inventory.stats.health'), Math.round(s.maxHp), false], [tx('inventory.stats.melee'), s.meleeMult, true], [tx('inventory.stats.ability'), s.techMult, true], [tx('inventory.stats.attackSpeed'), s.attackSpeed, true],
      [tx('inventory.stats.armor'), s.armor, 'pct'], [tx('inventory.stats.speed'), s.speed, true], [tx('inventory.stats.crit'), s.crit, 'pct'], [tx('inventory.stats.cooldowns'), -s.cdr, 'pct'], [tx('inventory.stats.dodge'), s.evade, 'pct'],
      [tx('inventory.stats.flask'), -flaskCooldown(s), 'secs'], [tx('inventory.stats.quiver'), quiverMax(s), false],
    ];
    const fmt = (v, kind) => (kind === 'pct' ? tx('inventory.percent', { n: Math.round(v * 100) }) : kind === 'secs' ? tx('inventory.seconds', { n: Math.abs(v).toFixed(0) }) : kind ? tx('inventory.times', { n: v.toFixed(2) }) : String(v));

    const renderDetail = () => {
      detail.textContent = '';
      const it = sel ? save.item(sel) : null;
      if (!it) {
        const s = gearStats(gear.map((u) => (u ? save.item(u) : null)), who.hero).s;
        detail.append(h('div', { class: 'iname' }, `${HEROES[who.hero].full}`), h('div', { class: 'hint' }, tx('inventory.choose')),
          ...statLines(s).map(([l, v, k]) => h('div', { class: 'stat-line' }, l, h('b', {}, fmt(v, k)))));
        return;
      }
      const b = itemInfo(it), R = itemRarity(it);
      const eqIdx = gear.indexOf(it.uid);
      // comparison with what is in that slot now
      const cur = gear.map((u) => (u ? save.item(u) : null));
      const slot = eqIdx >= 0 ? eqIdx : b.kind === 'artifact' ? (cur[2] ? (cur[3] ? 2 : 3) : 2) : SLOT_KIND.indexOf(b.kind);
      const alt = [...cur]; alt[slot] = it;
      const before = gearStats(cur, who.hero).s, after = gearStats(alt, who.hero).s;
      const cmp = eqIdx >= 0 ? [] : statLines(before).map(([l, v, k], i) => {
        const v2 = statLines(after)[i][1]; const dv = v2 - v;
        if (Math.abs(dv) < 0.005) return null;
        return h('div', { class: 'cmp ' + (dv > 0 ? 'up' : 'down') }, tx('inventory.change', { label: l, arrow: dv > 0 ? '▲' : '▼', value: fmt(Math.abs(dv), k) }));
      }).filter(Boolean);
      detail.append(...[
        h('div', { class: 'iname', style: `color:${R.color}` }, `${b.icon} ${it.blessed ? tx('loot.blessedName', { name: b.name }) : b.name}`),
        h('div', { class: 'rar', style: `color:${R.color}` }, tx('inventory.rarityLine', { rarity: R.label, kind: KIND_LABEL[b.kind], power: it.power })),
        b.hero && HEROES[b.hero] ? h('div', { class: 'fav' }, tx('inventory.favourite', { hero: HEROES[b.hero].name })) : null,
        h('div', { class: 'desc' }, b.cd ? tx('inventory.descCooldown', { desc: b.desc, n: b.cd }) : b.desc),
        cmp.length ? h('div', { class: 'cmp-box' }, h('div', { class: 'hint' }, tx('inventory.comparedWith', { slot: SLOT_NAMES[slot].toLowerCase() })), ...cmp) : null,
        h('h3', {}, tn('inventory.enchantHeading', d.enchantPoints)),
        ...it.ench.map((e, row) => {
          if (e.fixed) return h('div', { class: 'ench fixed' }, h('span', {}, `${ENCHANTS[e.pick].name} `, h('span', { class: 'lv' }, roman[e.level])), h('span', { class: 'ed' }, ENCHANTS[e.pick].desc(e.level)), h('span', { class: 'hint' }, tx('inventory.builtIn')));
          if (!e.pick) {
            return h('div', { class: 'ench-row' }, h('div', { class: 'hint' }, tx('inventory.chooseOne')), ...e.options.map((id) => {
              const E = ENCHANTS[id], cost = enchCost(id, 1);
              return h('button', { class: 'ench-opt' + (E.powerful ? ' powerful' : ''), disabled: d.enchantPoints < cost ? true : undefined, onclick: () => { if (d.enchantPoints < cost) return; d.enchantPoints -= cost; e.pick = id; e.level = 1; save.write(); apply(); game.audio?.ui('buy'); refresh(); } },
                h('b', {}, E.name + (E.powerful ? ' ✦' : '')), h('span', {}, E.desc(1)), h('i', {}, tx('inventory.pointCost', { n: cost })));
            }), forge ? h('button', { class: 'btn small', onclick: () => {
              const c = rerollCost(it); if (d.coins < c) { toast(tx('forge.noDrachmas')); return; }
              d.coins -= c; rerollRow(it, row); save.write(); game.audio?.ui('buy'); refresh();
            } }, tx('forge.reroll', { cost: rerollCost(it) })) : null);
          }
          const E = ENCHANTS[e.pick], next = e.level + 1, cost = enchCost(e.pick, next);
          return h('div', { class: 'ench' }, h('span', {}, `${E.name} `, h('span', { class: 'lv' }, roman[e.level])), h('span', { class: 'ed' }, E.desc(e.level)),
            e.level < 3 ? h('button', { class: 'btn small', disabled: d.enchantPoints < cost ? true : undefined, onclick: () => { if (d.enchantPoints < cost) return; d.enchantPoints -= cost; e.level = next; save.write(); apply(); game.audio?.ui('buy'); refresh(); } }, tx('inventory.levelCost', { level: roman[next], cost })) : h('span', { class: 'hint' }, tx('inventory.max')));
        }),
        it.blessed ? h('div', { class: 'ench blessed' }, h('span', {}, `${tx('inventory.blessedMark')} ${ENCHANTS[it.blessed.id].name} `, h('span', { class: 'lv' }, 'III')), h('span', { class: 'ed' }, ENCHANTS[it.blessed.id].desc(3)), h('span', { class: 'hint' }, tx('inventory.godsBlessing'))) : null,
        h('div', { class: 'row', style: 'margin-top:10px;flex-wrap:wrap' },
          eqIdx >= 0
            ? h('button', { class: 'btn small', onclick: () => { gear[eqIdx] = null; save.write(); apply(); refresh(); } }, tx('inventory.unequip'))
            : h('button', { class: 'btn small primary', 'data-autofocus': true, onclick: () => { gear[slot] = it.uid; delete it.isNew; save.write(); apply(); game.audio?.ui('buy'); toast(tx('inventory.equips', { hero: HEROES[who.hero].name, name: b.name })); refresh(); } }, tx('inventory.equip', { slot: SLOT_NAMES[slot] })),
          b.kind === 'artifact' && eqIdx < 0 && cur[2] && cur[3] ? h('button', { class: 'btn small', onclick: () => { gear[slot === 2 ? 3 : 2] = it.uid; save.write(); apply(); refresh(); } }, tx('inventory.equip', { slot: SLOT_NAMES[slot === 2 ? 3 : 2] })) : null,
          forge ? h('button', { class: 'btn small', onclick: () => {
            const cap = powerFor(4, d.level, () => 1) + 4;
            if (it.power >= cap) { toast(tx('forge.temperCap')); return; }
            const c = temperCost(it); if (d.coins < c) { toast(tx('forge.noDrachmas')); return; }
            d.coins -= c; it.power++; save.write(); apply(); game.audio?.impact?.(0.6); refresh();
          } }, tx('forge.temper', { cost: temperCost(it) })) : null,
          eqIdx < 0 ? h('button', { class: 'btn small danger', onclick: () => {
            const doIt = () => { d.coins += salvageValue(it); d.enchantPoints += spentPoints(it); d.inventory = d.inventory.filter((x) => x !== it); for (const hs of Object.values(d.heroes)) hs.gear = hs.gear.map((u) => (u === it.uid ? null : u)); sel = null; save.write(); game.audio?.coin(); toast(spentPoints(it) ? tx('inventory.salvagedPoints', { coins: salvageValue(it), points: spentPoints(it) }) : tx('inventory.salvaged', { coins: salvageValue(it) })); refresh(); };
            if (b.rarity !== 'common' || it.blessed || spentPoints(it)) confirmDialog(game, { title: tx('inventory.salvageTitle'), text: spentPoints(it) ? tx('inventory.salvageTextPoints', { name: b.name, coins: salvageValue(it), points: spentPoints(it) }) : tx('inventory.salvageText', { name: b.name, coins: salvageValue(it) }), yes: tx('inventory.salvageYes'), no: tx('inventory.salvageNo'), danger: true, onYes: doIt });
            else doIt();
          } }, tx('inventory.salvage', { coins: salvageValue(it) })) : null)].filter(Boolean));
    };
    renderDetail();
    el.appendChild(h('div', { class: 'panel inv-panel', style: 'width:min(1000px,97vw)' },
      h('h2', {}, forge ? tx('forge.title') : tx('inventory.title')),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, tn(forge ? 'forge.summary' : 'inventory.summary', d.enchantPoints, { level: d.level, coins: d.coins })),
      heroRow,
      h('div', { class: 'inv' }, h('div', {}, h('h3', {}, tx('inventory.equipped', { hero: HEROES[who.hero].name })), eqRow, filters, grid), detail),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' }, h('button', { class: 'btn', onclick: close }, tx('inventory.close')))));
  }, { dim: true, onBack: close });
}

// The forge in camp: the inventory with tempering and re-rolling.
export function openForge(game, player) { openInventory(game, player, { forge: true }); }
export { RARITY, BLESSED };
